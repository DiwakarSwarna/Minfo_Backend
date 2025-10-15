import mongoose from "mongoose";

const mangoTypeSchema = new mongoose.Schema(
  {
    typeName: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    buying_capacity: { type: Number, required: true },

    // Each mango type belongs to a mandi
    mandi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mandi",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("MangoType", mangoTypeSchema);
