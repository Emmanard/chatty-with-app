import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import OTPVerification from "../models/OTPverification.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { sendOTPEmail } from "../lib/emailService.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if there's already a pending verification for this email
    const existingOTP = await OTPVerification.findOne({ email });
    if (existingOTP) {
      return res.status(400).json({ 
        message: "OTP already sent to this email. Please verify or wait for expiry.",
        pendingVerification: true 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store user data in OTP verification record (temporary storage)
    const otpVerification = new OTPVerification({
      email,
      fullName,
      password: hashedPassword,
      otp,
      expiresAt: Date.now() + 600000, // 10 minutes
    });

    await otpVerification.save();
    await sendOTPEmail(email, fullName, otp);

    res.status(201).json({
      success: true,
      message: "OTP sent to your email. Please verify to complete registration.",
      email: email,
      pendingVerification: true
    });

  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  
  try {
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Find the OTP record with user data
    const otpRecord = await OTPVerification.findOne({ email })
      .sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(404).json({ message: "No OTP found. Please request a new one." });
    }

    // Check if OTP expired
    if (otpRecord.expiresAt < Date.now()) {
      await OTPVerification.deleteMany({ email });
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    // Verify OTP
    if (otp !== otpRecord.otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check if user already exists (just in case)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await OTPVerification.deleteMany({ email });
      return res.status(400).json({ message: "User already exists" });
    }

    // Now create the user in the database
    const newUser = new User({
      fullName: otpRecord.fullName,
      email: otpRecord.email,
      password: otpRecord.password,
      isVerified: true,
      isActive: true
    });

    await newUser.save();
    
    // Clean up OTP records
    await OTPVerification.deleteMany({ email });

    // Generate JWT token
    generateToken(newUser._id, res);

    res.status(200).json({
      success: true,
      message: "Email verified successfully and account created",
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        isVerified: true,
      }
    });

  } catch (error) {
    console.log("Error in verifyOTP controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resendOTP = async (req, res) => {
  const { email } = req.body;
  
  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already registered and verified" });
    }

    // Find existing OTP record
    const existingOTP = await OTPVerification.findOne({ email });
    if (!existingOTP) {
      return res.status(404).json({ message: "No pending verification found. Please signup first." });
    }

    // Generate new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update the existing OTP record
    await OTPVerification.findOneAndUpdate(
      { email },
      { 
        otp,
        expiresAt: Date.now() + 600000, // 10 minutes
        createdAt: new Date() // Update timestamp
      }
    );

    await sendOTPEmail(email, existingOTP.fullName, otp);

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully"
    });

  } catch (error) {
    console.log("Error in resendOTP controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: "Please verify your email first",
        needsVerification: true,
        email: user.email
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update user active status
    await User.findByIdAndUpdate(user._id, { isActive: true });

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      isVerified: user.isVerified,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};