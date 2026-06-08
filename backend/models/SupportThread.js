const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    senderRole: { type: String, enum: ["user", "admin"], required: true },
    sender: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const supportThreadSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true, maxlength: 180 },
    user: {
      id: { type: String, required: true, index: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, default: "reader" },
    },
    status: { type: String, enum: ["open", "closed"], default: "open", index: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, default: "" },
    lastSenderRole: { type: String, enum: ["user", "admin"], default: "user" },
    messages: { type: [supportMessageSchema], default: [] },
  },
  { timestamps: true, collection: "support_threads" }
);

module.exports = mongoose.model("SupportThread", supportThreadSchema);