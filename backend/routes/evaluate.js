const router = require("express").Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const Evaluation = require("../models/Evaluation");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";

// optional auth: если токен есть — считаем пользователя, если нет — просто сохраняем как guest
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return next();

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Неверный или просроченный токен" });
  }
}

router.post("/", optionalAuth, async (req, res) => {
  try {
    const input = req.body;

    const city = typeof input.city === "string" ? input.city.trim() : "";
    const district = typeof input.district === "string" ? input.district.trim() : "";
    if (!city || !district) {
      return res.status(400).json({ message: "Укажите город и район" });
    }

    // 1) вызов ML-сервиса (input теперь должен приходить с фронта вместе с city и district)
    const mlResp = await axios.post("http://127.0.0.1:8000/predict", {
      ...input,
      city,
      district,
    });
    const predicted_price = Number(mlResp.data.predicted_price);

    const area = Number(input.area || 1);
    const price_per_m2 = predicted_price / area;

    // 2) сохраняем в MongoDB
    const doc = await Evaluation.create({
      user: req.user
        ? { id: req.user.id, name: req.user.name, email: req.user.email }
        : null,
      input: {
        city,
        district,
        area: Number(input.area),
        rooms: Number(input.rooms),
        floor: Number(input.floor),
        total_floors: Number(input.total_floors || 0), // Добавил fallback на 0
        ceiling_height: Number(input.ceiling_height || 0), // Добавил fallback на 0
        house_age: Number(input.house_age),
        house_type: String(input.house_type),
        condition: String(input.condition),
      },
      predicted_price,
      price_per_m2,
    });

    // 3) ответ
    return res.json({
      evaluation_id: doc._id.toString(),
      predicted_price,
      price_per_m2,
    });
  } catch (err) {
    console.error("ML service error:", err?.response?.data || err.message);
    return res.status(500).json({ message: "ML service error" });
  }
});

module.exports = router;