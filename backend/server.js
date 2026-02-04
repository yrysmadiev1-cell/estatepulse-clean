const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/blogdb";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@mail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const ADMIN_NAME = process.env.ADMIN_NAME || "admin";
const CITY_OPTIONS = ["Алматы", "Астана", "Шымкент"];
const isValidCity = (value) => CITY_OPTIONS.includes(value);

app.use(cors());
app.use(express.json());

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await ensureAdminUser();
  })
  .catch((err) => console.error("Mongo error:", err));

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
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) return;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: "admin",
  });
  console.log("Admin user created (", ADMIN_EMAIL, ")");
};

// ====== Auth helpers =======
const createToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Требуется авторизация" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Неверный или просроченный токен" });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Неверный или просроченный токен" });
  }
};
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Недостаточно прав" });
  }
  return next();
};

// ====== Auth API =======
app.post(
  "/api/register",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { name, email, password, role = "reader" } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: "Имя, email и пароль обязательны" });
    }
    if (password.trim().length < 8) {
      return res.status(400).json({ message: "Пароль должен содержать минимум 8 символов" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Пользователь с таким email уже существует" });
    }

    const allowedRoles = ["admin", "reader"];
    const requestedRole = allowedRoles.includes(role) ? role : "reader";
    const nextRole = req.user?.role === "admin" ? requestedRole : "reader";

    const passwordHash = await bcrypt.hash(password, 10);
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
    if (!email?.trim() || !password?.trim()) {
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
  "/posts",
  asyncHandler(async (req, res) => {
    const filter = {};
    const { city } = req.query;
    if (city) {
      if (!isValidCity(city)) {
        return res.status(400).json({ message: "Неизвестный город" });
      }
      filter.city = city;
    }

    const posts = await Post.find(filter).sort({ createdAt: -1 });
    res.json(posts);
  })
);

app.get(
  "/posts/:id",
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Материал не найден" });
    }
    res.json(post);
  })
);

app.post(
  "/posts",
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
  "/posts/:id",
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
  "/posts/:id",
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

// ====== Error handling =======
app.use((err, req, res, next) => {
  console.error("Unhandled error", err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Серверная ошибка" });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
