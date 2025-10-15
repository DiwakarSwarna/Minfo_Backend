import mongoose from "mongoose";
import cloudinary from "../../config/cloudinary.js";
import MangoType from "../MangoType.js";

const mandiSchema = new mongoose.Schema(
  {
    mandiname: { type: String, required: true },
    mangoTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: "MangoType" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

mandiSchema.pre("findOneAndDelete", async function (next) {
  try {
    const mandi = await this.model
      .findOne(this.getFilter())
      .populate("mangoTypes");
    if (!mandi) return next();

    for (const mango of mandi.mangoTypes) {
      try {
        if (mango.image) {
          const publicId = mango.image.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(publicId);
          console.log(`🧹 Deleted Cloudinary image: ${mango.image}`);
        }
        await MangoType.findByIdAndDelete(mango._id);
        console.log(`🧹 Deleted MangoType: ${mango.typeName}`);
      } catch (err) {
        console.error(
          `⚠️ Failed to delete MangoType or image for ${mango.typeName}:`,
          err
        );
      }
    }

    next();
  } catch (err) {
    console.error("Error in cascading delete:", err);
    next(err); // optionally, you can skip error to allow user deletion anyway
  }
});

export default mongoose.model("Mandi", mandiSchema);
