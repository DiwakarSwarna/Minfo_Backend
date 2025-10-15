import mongoose from "mongoose";
import Mandi from "./Users/Mandi.js";
import Farmer from "./Users/Farmer.js";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["mandi", "farmer"], required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    mandi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mandi",
      default: null,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      default: null,
    },
  },
  { timestamps: true }
);

// 🟢 Pre delete middleware for cascading delete
userSchema.pre("findOneAndDelete", async function (next) {
  try {
    const user = await this.model.findOne(this.getFilter());
    if (!user) return next();

    // Delete associated Mandi
    if (user.mandi) {
      await Mandi.findOneAndDelete({ _id: user.mandi });
      console.log("🧹 Deleted associated Mandi and MangoTypes");
    }

    // Delete associated Farmer (if needed)
    if (user.farmer) {
      await Farmer.findByIdAndDelete(user.farmer);
      console.log("🧹 Deleted associated Farmer");
    }

    next();
  } catch (err) {
    console.error("Error in cascading delete for User:", err);
    next(err);
  }
});

userSchema.index({ location: "2dsphere" });

export default mongoose.model("User", userSchema);
