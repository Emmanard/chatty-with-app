// lib/emailService.js
import nodemailer from 'nodemailer';
import dotenv from "dotenv";

dotenv.config();

// Fix: Change createTransporter to createTransport
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify email configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    console.log('Email server ready');
  }
});

export const sendOTPEmail = async (email, fullName, otp) => {
  const mailOptions = {
    from: {
      name: "Chatty App", // Updated app name
      address: process.env.EMAIL_USER,
    },
    to: email,
    subject: "Verify Your Email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Hi ${fullName},</p>
        <p>Your OTP verification code is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
        </div>
        <p>Please enter this OTP to verify your email address.</p>
        <p><strong>This code expires in 10 minutes</strong></p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
};

export default transporter;