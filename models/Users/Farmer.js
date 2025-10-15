import mongoose from "mongoose";

const farmerSchema = new mongoose.Schema(
  {
    cultivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    farmerMangoTypes: [
      {
        typeName: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Farmer", farmerSchema);
