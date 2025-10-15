import mongoose from "mongoose";

const emailVerificationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true }, // email added
    otp: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("EmailVerification", emailVerificationSchema);
