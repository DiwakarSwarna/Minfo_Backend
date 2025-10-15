// routes/farmer.js
import express from "express";
import User from "../models/User.js";
import Farmer from "../models/Users/Farmer.js";

const router = express.Router();

// ✅ Farmer Dashboard API with dynamic radius
router.get("/dashboard/:farmerId", async (req, res) => {
  try {
    // console.log(
    //   "Farmer dashboard called with params:",
    //   req.params,
    //   "and query:",
    //   req.query
    // );

    const { farmerId } = req.params;
    const { radius } = req.query;
    // console.log("Using radius (km):", radius, farmerId);
    const searchRadius = radius ? parseInt(radius) * 1000 : 50000; // Default 50 km
    // console.log("Search radius (meters):", searchRadius);
    // 🔹 1. Find the farmer and their mango types
    const farmer = await Farmer.findById(farmerId).populate("farmerMangoTypes");
    if (!farmer) {
      return res
        .status(404)
        .json({ success: false, message: "Farmer not found" });
    }

    const filters = farmer.farmerMangoTypes;
    // console.log("Farmer's mango types:", filters);
    // 🔹 2. Get farmer's user info (for location)
    const farmerUser = await User.findById(farmer.cultivatedBy);
    if (!farmerUser || !farmerUser.location) {
      return res
        .status(404)
        .json({ success: false, message: "Farmer location not found" });
    }

    const [longitude, latitude] = farmerUser.location.coordinates;

    // 🔹 3. Find nearby mandis using User collection (role = mandi)
    const nearestMandis = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: searchRadius,
          spherical: true,
          query: { role: "mandi" },
        },
      },
      {
        $lookup: {
          from: "mandis", // collection name for Mandi model
          localField: "mandi",
          foreignField: "_id",
          as: "mandiDetails",
        },
      },
      { $unwind: "$mandiDetails" },
      {
        $lookup: {
          from: "mangotypes", // collection name for MangoType model
          localField: "mandiDetails.mangoTypes",
          foreignField: "_id",
          as: "mangoTypes",
        },
      },
    ]);

    // console.log("Found nearest mandis:", nearestMandis);

    // 🔹 4. Build the response data
    const types = [];
    nearestMandis.forEach((mandiUser) => {
      mandiUser.mangoTypes.forEach((mt) => {
        console.log("mandi user", mandiUser.mandiDetails);
        console.log(mt);
        console.log("Checking mango type:", mt.typeName);
        // if (filters.some((f) => f._id.toString() === mt._id.toString())) {
        if (
          filters.some(
            (f) => f.typeName.toLowerCase() === mt.typeName.toLowerCase()
          )
        ) {
          // console.log(f);
          // console.log(mt);
          types.push({
            mandiName: mandiUser.mandiDetails.mandiname,
            distance: (mandiUser.distance / 1000).toFixed(2), // km
            mangoType: mt.typeName,
            price: mt.price,
            capacity: mt.buying_capacity,
          });
        }
        console.log("Current types list:", types);
      });
    });

    // 🔹 5. Send response
    res.json({
      success: true,
      filters,
      types,
    });
  } catch (err) {
    console.error("Farmer dashboard error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
