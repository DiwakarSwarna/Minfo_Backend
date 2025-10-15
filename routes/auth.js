import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Mandi from "../models/Users/Mandi.js";
import Farmer from "../models/Users/Farmer.js";
import authMiddleware from "../middleware/auth.js";
import MangoType from "../models/MangoType.js";
import generateToken from "../utils/generateToken.js";
const router = express.Router();

import EmailVerification from "../models/Users/EmailVerification.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

// generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// export const sendOtp = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // ✅ Check if email already registered
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Email already registered" });
//     }

//     const otp = generateOtp();

//     // expiry = 5 mins from now
//     const otpExpiresAt = Date.now() + 10 * 60 * 1000;

//     // save/update otp in db
//     await EmailVerification.findOneAndUpdate(
//       { email },
//       { email, otp, otpExpiresAt, isVerified: false },
//       { upsert: true, new: true }
//     );
//     console.log("1");

//     // setup mail transport
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.SMTP_EMAIL,
//         pass: process.env.SMTP_APP_PASSWORD,
//       },
//     });

//     console.log("SMTP Email:", process.env.SMTP_EMAIL);
//     console.log("SMTP Password length:", process.env.SMTP_APP_PASSWORD?.length);

//     // send mail
//     await transporter.sendMail({
//       from: process.env.SMTP_EMAIL,
//       to: email,
//       subject: "OTP for Email Verification on Mango App",
//       text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
//     });

//     res.json({ success: true, message: "OTP sent to email" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, error: "Failed to send OTP" });
//   }
// };
// router.post("/send-otp", sendOtp);
import nodemailer from "nodemailer";

export const sendOtp = async (req, res) => {
  try {
    const { email, type } = req.body; // 'register' or 'forgotPassword'
    const existingUser = await User.findOne({ email });

    if (type === "register" && existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    if (type === "forgotPassword" && !existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email" });
    }

    const otp = generateOtp();
    const otpExpiresAt = Date.now() + 10 * 60 * 1000;

    await EmailVerification.findOneAndUpdate(
      { email },
      { email, otp, otpExpiresAt, isVerified: false, purpose: type },
      { upsert: true, new: true }
    );

    // Gmail transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // TLS
      auth: {
        user: process.env.SMTP_EMAIL,        // your Gmail address
        pass: process.env.SMTP_APP_PASSWORD, // Gmail App Password
      },
      tls: {
        rejectUnauthorized: false, // important for cloud environments
      },
      connectionTimeout: 10000, // optional: 10s timeout
    });

    const subject =
      type === "forgotPassword"
        ? "OTP for Password Reset - Mango App"
        : "OTP for Email Verification - Mango App";

    await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: email,
      subject,
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });

    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({ success: false, error: "Failed to send OTP" });
  }
};


// Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(email);

    const record = await EmailVerification.findOne({ email });

    if (!record) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found" });
    }

    if (record.isVerified) {
      return res.json({ success: true, message: "Already verified" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (Date.now() > record.otpExpiresAt) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    record.isVerified = true;
    await record.save();

    res.json({ success: true, message: "OTP verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

router.post("/verify-otp", verifyOtp);

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      role,
      mandiName,
      ownerName,
      latitude,
      longitude,
      farmerName,
      farmerMangoTypes,
    } = req.body;

    // Check OTP verification
    const emailDoc = await EmailVerification.findOne({ email });
    if (!emailDoc || !emailDoc.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email not verified" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create base User
    let user = new User({
      username: ownerName || farmerName,
      email,
      password: hashedPassword,
      role,
      location: { type: "Point", coordinates: [longitude, latitude] },
    });
    await user.save();

    let mandiDoc = null;
    let farmerDoc = null;

    if (role === "mandi") {
      mandiDoc = new Mandi({
        mandiname: mandiName,
        createdBy: user._id,
      });
      await mandiDoc.save();

      user.mandi = mandiDoc._id; // 🔗 link back
      await user.save();
    }

    if (role === "farmer") {
      farmerDoc = new Farmer({
        cultivatedBy: user._id,
        farmerMangoTypes: farmerMangoTypes || [],
      });
      await farmerDoc.save();

      user.farmer = farmerDoc._id; // 🔗 link back
      await user.save();
    }

    // remove password before sending
    const userObj = user.toObject();
    delete userObj.password;

    // JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        ...userObj,
        mandiname: mandiDoc ? mandiDoc.mandiname : null,
        mangoTypes: mandiDoc ? [] : undefined,
        farmerMangoTypes: farmerDoc ? farmerDoc.farmerMangoTypes : [],
        mandiId: mandiDoc ? mandiDoc._id : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .populate("mandi")
      .populate("farmer");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userObj = user.toObject();
    delete userObj.password;

    let mandiDoc = null;
    if (user.role === "mandi" && user.mandi) {
      mandiDoc = await Mandi.findById(user.mandi).populate("mangoTypes");
    }

    let farmerDoc = null;
    if (user.role === "farmer" && user.farmer) {
      farmerDoc = await Farmer.findById(user.farmer);
    }

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        ...userObj,
        mandiname: mandiDoc ? mandiDoc.mandiname : null,
        mangoTypes: mandiDoc ? mandiDoc.mangoTypes : undefined,
        farmerMangoTypes: farmerDoc ? farmerDoc.farmerMangoTypes : [],
        mandiId: mandiDoc ? mandiDoc._id : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Update Mandi profile
router.put("/update/:id", async (req, res) => {
  try {
    const { mandiname, username, location } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username, location },
      { new: true }
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    // Optional: if Mandi is separate, update it too
    if (updatedUser.mandi) {
      await Mandi.findByIdAndUpdate(updatedUser.mandi, { mandiname });
    }

    res.json({ message: "Profile updated successfully", updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/// ✅ Get MandiDetails by User ID

router.get("/mandi/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user and populate farmer data
    const user = await User.findById(userId).populate("mandi");

    console.log(user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.mandi) {
      return res.status(404).json({
        success: false,
        message: "Mandi details not found",
      });
    }

    // Return consistent structure
    res.json({
      success: true,
      mandi: user.mandi, // The populated mandi object
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ✅ Get Farmer by User ID
router.get("/farmer/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user and populate farmer data
    const user = await User.findById(userId).populate("farmer");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer profile not found",
      });
    }

    // Return consistent structure
    res.json({
      success: true,
      farmer: user.farmer, // The populated farmer object
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ✅ Update Farmer profile
router.put("/update/farmer/:id", async (req, res) => {
  try {
    const { username, farmerMangoTypes, location } = req.body;

    // console.log("Received mango types:", farmerMangoTypes);
    // Ensure farmerMangoTypes are objects
    const formattedTypes = farmerMangoTypes.map((type) => {
      if (typeof type === "object" && type.typeName) return type;
      return { typeName: type };
    });

    // Update User (username and location)
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username, location },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update Farmer (mango types)
    if (updatedUser.farmer) {
      await Farmer.findByIdAndUpdate(
        updatedUser.farmer,
        { farmerMangoTypes: formattedTypes },
        { new: true }
      );
    }

    // Get fully populated user
    const populatedUser = await User.findById(updatedUser._id)
      .populate("farmer")
      .lean();

    // // ✅ Properly log mango types
    // console.log("Updated user:", JSON.stringify(populatedUser, null, 2));
    // console.log("Mango types:", populatedUser.farmer?.farmerMangoTypes);

    res.json({
      success: true,
      message: "Profile updated successfully",
      populatedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});
//Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
router.post("/reset-password", resetPassword);
//Change Password
export const changePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    // 1️⃣ Find user by email
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // 2️⃣ Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Old password is incorrect" });

    // 3️⃣ Hash new password and save
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Error in resetPassword:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
router.post("/change-password", changePassword);

router.delete("/user/delete/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const deletedUser = await User.findOneAndDelete({ _id: userId });
    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User and all associated data deleted successfully ✅",
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// // Register User
// router.post("/register", async (req, res) => {
//   try {
//     const {
//       email,
//       password,
//       role,
//       username,
//       mandiName,
//       ownerName,
//       latitude,
//       longitude,
//     } = req.body;

//     // Check OTP verification
//     const emailDoc = await EmailVerification.findOne({ email });
//     if (!emailDoc || !emailDoc.isVerified) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Email not verified" });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create user
//     const user = new User({
//       username: ownerName || username, // take ownerName for mandi or username for farmer
//       email,
//       password: hashedPassword,
//       role,
//       location: { lat: latitude, long: longitude },
//     });

//     await user.save();

//     // If user is mandi → create Mandi doc
//     if (role === "mandi") {
//       const mandi = new Mandi({
//         mandiname: mandiName,
//         mangoTypes: [],
//         createdBy: user._id,
//       });

//       await mandi.save();
//     }

//     // Don’t send password back
//     const userObj = user.toObject();
//     delete userObj.password;

//     // ✅ Generate JWT token
//     const token = generateToken(user._id);

//     // 🔑 Fetch mandi data if role = "mandi"
//     let mandiDoc = null;
//     if (user.role === "mandi") {
//       mandiDoc = await Mandi.findOne({ createdBy: user._id });
//     }
//     res.status(201).json({
//       success: true,
//       message: "User registered successfully",
//       token,
//       user: {
//         ...userObj,
//         mandiname: mandiDoc ? mandiDoc.mandiname : null,
//         mangoTypes: mandiDoc ? mandiDoc.mangoTypes : [],
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Registration failed" });
//   }
//   //   res
//   //     .status(201)
//   //     .json({ success: true, message: "User registered successfully", user });
//   // } catch (err) {
//   //   console.error(err);
//   //   res.status(500).json({ success: false, message: "Registration failed" });
//   // }
// });

// // Login User
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Find user
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid credentials" });
//     }

//     // Generate JWT
//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" } // token valid for 7 days
//     );

//     // remove password before sending
//     const userObj = user.toObject();
//     delete userObj.password;

//     // 🔑 Fetch mandi data if role = "mandi"
//     let mandiDoc = null;
//     if (user.role === "mandi") {
//       mandiDoc = await Mandi.findOne({ createdBy: user._id });
//     }
//     console.log(mandiDoc);
//     res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         ...userObj,
//         mandiname: mandiDoc ? mandiDoc.mandiname : null, // include mandiname if available
//         mangoTypes: mandiDoc ? mandiDoc.mangoTypes : [],
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// export default router;

// // Signup
// router.post("/signup", async (req, res) => {
//   try {
//     const { username, password, role, email } = req.body;
//     console.log(req.body);
//     if (!["mandi", "farmer"].includes(role)) {
//       return res.status(400).json({ message: "Invalid role" });
//     }

//     const existing = await User.findOne({ username });
//     if (existing)
//       return res.status(400).json({ message: "User already exists" });

//     const hashed = await bcrypt.hash(password, 10);
//     const user = new User({ username, password: hashed, role, email });
//     await user.save();

//     res.status(201).json({ message: "User created successfully" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Login
// router.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     const user = await User.findOne({ username });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const valid = await bcrypt.compare(password, user.password);
//     if (!valid) return res.status(401).json({ message: "Invalid credentials" });

//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       "secretkey", // replace with process.env.JWT_SECRET
//       { expiresIn: "1d" }
//     );

//     res.json({ token, role: user.role });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

export default router;
