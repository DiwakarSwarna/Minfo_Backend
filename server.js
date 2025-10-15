import dotenv from "dotenv";
dotenv.config();
import authRoutes from "./routes/auth.js";
// import mangoRoutes from "./routes/mango.js";
import mangoTypeRoutes from "./routes/mangoType.js";
import farmerRoutes from "./routes/farmer.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/mangoType", mangoTypeRoutes);
app.use("/api/farmer", farmerRoutes);
const PORT = process.env.PORT || 5000;
// DB + Server
mongoose
  .connect("mongodb://127.0.0.1:27017/mangoApp")
  .then(() => {
    app.listen(PORT, "0.0.0.0", () =>
      // console.log("Server running on http://localhost:5000", PORT)
      console.log(`✅ Server running on http://0.0.0.0:${PORT}`)
    );
  })
  .catch((err) => console.error(err));
