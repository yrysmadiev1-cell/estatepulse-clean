const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema(
  {
    user: {
      id: { type: String, index: true },
      name: String,
      email: String,
    },

    input: {
      city: { type: String, required: true },       // <-- ДОБАВЛЕНО
      district: { type: String, required: true },   // <-- ДОБАВЛЕНО
      area: { type: Number, required: true },
      rooms: { type: Number, required: true },
      floor: { type: Number, required: true },
      total_floors: { type: Number, required: true },
      ceiling_height: { type: Number, required: true },
      house_age: { type: Number, required: true },
      house_type: { type: String, required: true },
      condition: { type: String, required: true },
    },

    predicted_price: { type: Number, required: true },
    price_per_m2: { type: Number, required: true },
    news_snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    forecast: { type: mongoose.Schema.Types.Mixed, default: null },

    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "evaluations" }
);

// чтобы не было ошибки при hot-reload/перезапусках
module.exports =
  mongoose.models.Evaluation || mongoose.model("Evaluation", evaluationSchema);