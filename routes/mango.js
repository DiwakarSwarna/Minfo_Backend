// import express from "express";
// import jwt from "jsonwebtoken";
// import Mango from "../models/MangoType.js";

// const router = express.Router();

// // Middleware to verify mandi
// const authMiddleware = (roles = []) => {
//   return (req, res, next) => {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) return res.status(401).json({ message: "No token" });

//     const token = authHeader.split(" ")[1];
//     jwt.verify(token, "secretkey", (err, decoded) => {
//       if (err) return res.status(403).json({ message: "Invalid token" });

//       if (roles.length && !roles.includes(decoded.role)) {
//         return res.status(403).json({ message: "Access denied" });
//       }

//       req.user = decoded;
//       next();
//     });
//   };
// };

// // Mandi → Add mango type
// router.post("/add", authMiddleware(["mandi"]), async (req, res) => {
//   try {
//     const { typeName, image, currentPrice, stock } = req.body;

//     const mango = new MangoType({
//       typeName,
//       image,
//       currentPrice,
//       stock,
//       createdBy: req.user.id,
//     });

//     await mango.save();
//     res.status(201).json({ message: "Mango added", mango });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Farmer → Get all mango prices
// router.get("/all", authMiddleware(["farmer", "mandi"]), async (req, res) => {
//   try {
//     const mangos = await Mango.find().populate("createdBy", "username role");
//     res.json(mangos);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// export default router;
