import express from "express";
import { 
  checkAuth, 
  login, 
  logout, 
  signup, 
  updateProfile,
  verifyOTP,
  resendOTP 
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// Add these new OTP routes
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

export default router;