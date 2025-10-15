// routes/mangoType.js
import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js"; // make sure path is correct
import MangoType from "../models/MangoType.js";
import Mandi from "../models/Users/Mandi.js";

const router = express.Router();
const upload = multer({ dest: "temp/" }); // temporary storage

// ✅ Add new mango type with Cloudinary
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { type, price, capacity, mandiId } = req.body;

    // Upload image to Cloudinary
    let imageUrl = "";
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: `mandi_uploads/${mandiId}/mango_types`,
          use_filename: true,
          unique_filename: false,
        });
        imageUrl = result.secure_url;
      } catch (err) {
        console.error("Cloudinary upload error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Image upload failed" });
      }
    }

    // Save MangoType in DB
    const newType = new MangoType({
      typeName: type,
      price: Number(price),
      buying_capacity: Number(capacity),
      image: imageUrl,
      mandi: mandiId,
    });

    await newType.save();

    // Update Mandi document
    await Mandi.findByIdAndUpdate(mandiId, {
      $push: { mangoTypes: newType._id },
    });

    res.status(201).json({ success: true, mangoType: newType });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get all mango types for a mandi
router.get("/get/:mandiId", async (req, res) => {
  try {
    const { mandiId } = req.params;

    const mandi = await Mandi.findById(mandiId).populate("mangoTypes");
    if (!mandi) {
      return res
        .status(404)
        .json({ success: false, message: "Mandi not found" });
    }

    res.json({ success: true, mangoTypes: mandi.mangoTypes });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch mango types" });
  }
});

// 🟢 Update Mango Type (with optional image)
router.put("/update/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { typeName, price, buying_capacity, mandiId } = req.body;

    // 🔹 Prepare update data
    const updateData = { typeName, price, buying_capacity };

    // 🔹 If new image file provided → upload to Cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: `mandi_uploads/${mandiId}/mango_types`,
      });
      updateData.image = result.secure_url;
    }

    // 🔹 Update in DB
    const updatedMango = await MangoType.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedMango) {
      return res
        .status(404)
        .json({ success: false, message: "Mango type not found" });
    }

    res.status(200).json({
      success: true,
      message: "Mango type updated successfully",
      mango: updatedMango,
    });
  } catch (error) {
    console.error("Error updating mango:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating mango type",
    });
  }
});

// 🔴 Delete mango type
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMango = await MangoType.findByIdAndDelete(id);
    if (!deletedMango) {
      return res
        .status(404)
        .json({ success: false, message: "Mango not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Mango deleted successfully" });
  } catch (error) {
    console.error("Error deleting mango:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
