const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cron = require("node-cron");
const path = require("path");
const { spawn } = require("child_process");
const Evaluation = require("./models/Evaluation");
const newsRoutes = require("./routes/news");
const newsIndexRoutes = require("./routes/newsIndex");
const newsTrendRoutes = require("./routes/newsTrend");
const newsHeatmapRoutes = require("./routes/newsHeatmap");
const newsCollectRoutes = require("./routes/newsCollect");
const mapRoutes = require("./routes/map");
const aiAssistantRoutes = require("./routes/aiAssistant");
const supportRoutes = require("./routes/support");
const { runCollectKapitalJob } = require("./jobs/collectKapitalJob");
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

const TOXICITY_ENABLED = process.env.TOXICITY_ENABLED !== "false";
const TOXICITY_PYTHON = process.env.TOXICITY_PYTHON || "python";
const TOXICITY_MODEL_PATH =
  process.env.TOXICITY_MODEL_PATH || path.join(__dirname, "..", "ml", "notebooks", "toxicity_model_tuned.cbm");
const TOXICITY_SCRIPT_PATH =
  process.env.TOXICITY_SCRIPT_PATH || path.join(__dirname, "..", "ml", "predict_toxicity.py");
const TOXICITY_THRESHOLD = Number(process.env.TOXICITY_THRESHOLD || "0.5");
const IS_TEST_ENV = process.env.NODE_ENV === "test";

app.use(cors({origin: ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],}));
app.use(express.json());
app.use("/api/evaluate", require("./routes/evaluate"));
app.use("/api/news", newsRoutes);
app.use("/api/news", newsIndexRoutes);
app.use("/api/news", newsTrendRoutes);
app.use("/api/news", newsHeatmapRoutes);
app.use("/api/news/collect", newsCollectRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/ai", aiAssistantRoutes);
app.use("/api/support", supportRoutes);


if (!IS_TEST_ENV) {
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      console.log("MongoDB connected");
      await ensureAdminUser();
    })
    .catch((err) => console.error("Mongo error:", err));
}

const ENABLE_CRON = process.env.ENABLE_CRON !== "false";

// Каждый час в 00 минут (например 15:00, 16:00, 17:00...)
if (ENABLE_CRON) {
  if (!IS_TEST_ENV) {
    cron.schedule("0 * * * *", async () => {
      try {
        // Avoid running before initial DB connection.
        if (mongoose.connection.readyState !== 1) {
          console.log("[cron] skipped: mongo not connected");
          return;
        }

        console.log("[cron] collectKapitalJob started");
        const stats = await runCollectKapitalJob({ perSection: 15, delayMs: 300, maxNew: 20 });
        console.log("[cron] collectKapitalJob finished:", stats);
      } catch (e) {
        console.error("[cron] collectKapitalJob error:", e?.message || e);
      }
    });
    console.log("[cron] enabled: running every hour at minute 0");
  }
} else if (!IS_TEST_ENV) {
  console.log("[cron] disabled (ENABLE_CRON=false)");
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampThreshold(value, fallback = 0.5) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function runToxicityCheck(text) {
  if (!TOXICITY_ENABLED) {
    return Promise.resolve({ toxic: false, score: 0, threshold: clampThreshold(TOXICITY_THRESHOLD) });
  }

  const payload = JSON.stringify({
    text,
    modelPath: TOXICITY_MODEL_PATH,
    threshold: clampThreshold(TOXICITY_THRESHOLD),
  });

  return new Promise((resolve, reject) => {
    const processRef = spawn(TOXICITY_PYTHON, [TOXICITY_SCRIPT_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    processRef.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    processRef.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    processRef.on("error", (err) => {
      reject(err);
    });

    processRef.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Toxicity process exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout || "{}") || {};
        resolve({
          toxic: Boolean(parsed.toxic),
          score: Number(parsed.score) || 0,
          threshold: Number(parsed.threshold) || clampThreshold(TOXICITY_THRESHOLD),
        });
      } catch (err) {
        reject(err);
      }
    });

    processRef.stdin.write(payload);
    processRef.stdin.end();
  });
}

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

const commentSchema = new mongoose.Schema(
  {
    author: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
    },
    text: { type: String, required: true, trim: true, maxlength: 1200 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: String, default: () => new Date().toISOString().split("T")[0] },
    category: { type: String, default: "Аналитика" },
    city: { type: String, enum: CITY_OPTIONS, default: CITY_OPTIONS[0], index: true },

    // --- Auto-news metadata (EstatePulse AI) ---
    isAuto: { type: Boolean, default: false, index: true },
    sourceUrl: { type: String, index: true }, // original article URL
    sourceName: { type: String }, // e.g. "Kapital.kz"
    tags: [{ type: String, index: true }],

    impactScore: { type: Number, min: 0, max: 100, index: true },
    impactDirection: { type: String, enum: ["up", "down", "neutral"] },
    impactHorizon: { type: String, enum: ["short", "medium", "long"] },

    newsArticleId: { type: mongoose.Schema.Types.ObjectId, ref: "NewsArticle", index: true },
    author: {
      id: { type: String },
      name: String,
      email: String,
    },
    comments: { type: [commentSchema], default: [] },
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
    const { city, category, isAuto, tag, sort, q: titleQuery, days, sourceName } = req.query;

    const filter = {};
    if (city) {
      if (!isValidCity(city)) {
        return res.status(400).json({ message: "Неизвестный город" });
      }
      filter.city = city;
    }
    if (category) {
      filter.category = category;
    }
    if (isAuto === "true") filter.isAuto = true;
    if (isAuto === "false") filter.isAuto = false;
    if (tag) filter.tags = tag;
    if (sourceName) filter.sourceName = String(sourceName);

    if (titleQuery && String(titleQuery).trim()) {
      const safe = escapeRegExp(String(titleQuery).trim());
      filter.title = { $regex: safe, $options: "i" };
    }

    if (typeof days !== "undefined" && String(days).trim()) {
      const n = Math.max(1, Math.min(365, Number(days)));
      if (Number.isFinite(n)) {
        const since = new Date();
        since.setDate(since.getDate() - n);
        filter.createdAt = { $gte: since };
      }
    }

    let mongoQuery = Post.find(filter).select("-comments");
    if (sort === "impact") {
      mongoQuery = mongoQuery.sort({ impactScore: -1, createdAt: -1 });
    } else {
      mongoQuery = mongoQuery.sort({ createdAt: -1 });
    }

    const posts = await mongoQuery.exec();
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

app.get(
  "/posts/:id/comments",
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id).select("comments");
    if (!post) {
      return res.status(404).json({ message: "Материал не найден" });
    }
    res.json(post.comments || []);
  })
);

app.post(
  "/posts/:id/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Материал не найден" });
    }

    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ message: "Введите текст комментария" });
    }

    try {
      const toxicity = await runToxicityCheck(text);
      if (toxicity.toxic) {
        return res.status(422).json({
          message: "Комментарий распознан как токсичный и отклонен",
          toxicity,
        });
      }
    } catch (err) {
      console.error("Toxicity check failed:", err?.message || err);
      return res.status(503).json({ message: "Сервис проверки комментариев временно недоступен" });
    }

    const comment = {
      author: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
      text,
    };

    post.comments.push(comment);
    await post.save();

    const created = post.comments[post.comments.length - 1];
    res.status(201).json(created);
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



// ====== Error handling =======
app.use((err, req, res, next) => {
  console.error("Unhandled error", err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Серверная ошибка" });
});

if (!IS_TEST_ENV) {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;





