const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const { rateLimit } = require("express-rate-limit");
const { loadConfig } = require("./config");
const { createAuth } = require("./auth");
const { createEvaluationRouter } = require("./routes/evaluate");
const bcrypt = require("bcryptjs");
const Evaluation = require("./models/Evaluation");
const config = loadConfig();
const app = express();
const { createToken, optionalAuth, requireAuth, requireAdmin } = createAuth(config.jwtSecret);
const mlClient = axios.create({ baseURL: config.mlUrl, timeout: 15000 });
const CITY_OPTIONS = ["Алматы", "Астана", "Шымкент"];
const isValidCity = (value) => CITY_OPTIONS.includes(value);

app.disable("x-powered-by");
app.use(cors({ origin: config.origins, methods: ["GET", "POST", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "32kb" }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: "Слишком много попыток входа. Попробуйте позже." } });
app.use(["/api/login", "/api/register"], authLimiter);
app.use("/api/evaluate", rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: "Слишком много запросов оценки" } }), createEvaluationRouter({ optionalAuth, mlClient, Evaluation }));
app.get("/health", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable" });
});

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ====== Модели =======
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "reader"], default: "reader" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "users" }
);

userSchema.methods.toSafeObject = function toSafeObject() {
  return { id: this._id.toString(), name: this.name, email: this.email, role: this.role };
};

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: String, default: () => new Date().toISOString().split("T")[0] },
    category: { type: String, default: "Аналитика" },
    city: { type: String, enum: CITY_OPTIONS, default: CITY_OPTIONS[0], index: true },
    author: {
      id: { type: String },
      name: String,
      email: String,
    },
  },
  { timestamps: true, collection: "posts" }
);



const User = mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);





const ensureAdminUser = async () => {
  if (!config.adminEmail) return;
  const existing = await User.findOne({ email: config.adminEmail });
  if (existing) return;

  const passwordHash = await bcrypt.hash(config.adminPassword, 12);
  await User.create({
    name: config.adminName,
    email: config.adminEmail,
    passwordHash,
    role: "admin",
  });
  console.log("Configured admin user created");
};

// ====== Auth API =======
app.post(
  "/api/register",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { name, email, password, role = "reader" } = req.body || {};
    if (typeof name !== "string" || !name.trim() || name.length > 100 || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 || typeof password !== "string" || !password.trim()) {
      return res.status(400).json({ message: "Имя, email и пароль обязательны" });
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ message: "Пароль: минимум 8 символов, максимум 72 байта" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Пользователь с таким email уже существует" });
    }

    const allowedRoles = ["admin", "reader"];
    const requestedRole = allowedRoles.includes(role) ? role : "reader";
    const nextRole = req.user?.role === "admin" ? requestedRole : "reader";

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash, role: nextRole });
    const safeUser = user.toSafeObject();
    const token = createToken(safeUser);

    res.status(201).json({ message: "Пользователь успешно зарегистрирован", user: safeUser, token });
  })
);

app.post(
  "/api/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password.trim() || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ message: "Email и пароль обязательны" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Неправильный логин или пароль" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Неправильный логин или пароль" });
    }

    const safeUser = user.toSafeObject();
    const token = createToken(safeUser);
    res.json({ message: "Успешный вход", user: safeUser, token });
  })
);

// ====== Posts API =======
app.get(
  "/api/posts",
  asyncHandler(async (req, res) => {
    const filter = {};
    const { city } = req.query;
    if (city) {
      if (!isValidCity(city)) {
        return res.status(400).json({ message: "Неизвестный город" });
      }
      filter.city = city;
    }

    const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(posts);
  })
);

app.get(
  "/api/posts/:id",
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Материал не найден" });
    }
    res.json(post);
  })
);

app.post(
  "/api/posts",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const incomingCity = req.body?.city;
    if (!isValidCity(incomingCity || "")) {
      return res.status(400).json({ message: "Укажите город: Алматы, Астана или Шымкент" });
    }

    const payload = {
      title: req.body?.title,
      description: req.body?.description,
      content: req.body?.content,
      date: req.body?.date,
      category: req.body?.category || "Аналитика",
      city: incomingCity,
      author: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
    };

    if (!payload.title || !payload.description || !payload.content) {
      return res.status(400).json({ message: "Заголовок, описание и содержание обязательны" });
    }

    const post = await Post.create(payload);
    res.status(201).json(post);
  })
);

app.patch(
  "/api/posts/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Материал не найден" });
    }

    if (post.author?.id && post.author.id !== req.user.id) {
      return res.status(403).json({ message: "Недостаточно прав для редактирования" });
    }

    post.title = req.body.title ?? post.title;
    post.description = req.body.description ?? post.description;
    post.content = req.body.content ?? post.content;
    if (typeof req.body.city !== "undefined") {
      if (!isValidCity(req.body.city)) {
        return res.status(400).json({ message: "Укажите корректный город" });
      }
      post.city = req.body.city;
    }
    post.category = req.body.category ?? post.category;
    post.date = req.body.date ?? post.date;

    await post.save();
    res.json(post);
  })
);

app.delete(
  "/api/posts/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Материал не найден" });
    }

    if (post.author?.id && post.author.id !== req.user.id) {
      return res.status(403).json({ message: "Недостаточно прав для удаления" });
    }

    await post.deleteOne();
    res.json({ success: true });
  })
);

// ====== Evaluations History API =======

// Список оценок текущего пользователя
app.get(
  "/api/evaluations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await Evaluation.find({ "user.id": req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(items);
  })
);

// Одна оценка по ID (только владелец)
app.get(
  "/api/evaluations/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await Evaluation.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Оценка не найдена" });

    if (item.user?.id !== req.user.id) {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    res.json(item);
  })
);



// Return validation failures without leaking database/stack details.
app.use((err, req, res, next) => {
  if (err.name === "CastError" || err.name === "ValidationError" || err.type === "entity.parse.failed") return res.status(400).json({ message: "Некорректные данные запроса" });
  if (err.code === 11000) return res.status(409).json({ message: "Запись уже существует" });
  if (err.status === 413) return res.status(413).json({ message: "Запрос слишком большой" });
  console.error("Request failed:", err.name || "Error");
  return res.status(500).json({ message: "Серверная ошибка" });
});

async function start() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  await User.init();
  await ensureAdminUser();
  const server = app.listen(config.port, () => console.log(`EstatePulse API listening on port ${config.port}`));
  const shutdown = () => server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  return server;
}
if (require.main === module) start().catch(err => {
  console.error("Startup failed:", err.name, "Check database and environment configuration.");
  process.exit(1);
});
module.exports = { app, start, User, Post, Evaluation };
