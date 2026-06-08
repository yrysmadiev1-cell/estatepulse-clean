const express = require("express");
const jwt = require("jsonwebtoken");
const SupportThread = require("../models/SupportThread");

require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Требуется авторизация" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Неверный или просроченный токен" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Недостаточно прав" });
  }
  return next();
}

function normalizeText(value, maxLength) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.slice(0, maxLength);
}

function buildSender(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function buildMessage(user, text) {
  return {
    senderRole: user.role === "admin" ? "admin" : "user",
    sender: buildSender(user),
    text,
    createdAt: new Date(),
  };
}

function canAccessThread(thread, user) {
  if (user.role === "admin") return true;
  return String(thread?.user?.id || "") === String(user.id || "");
}

function shapeThread(thread) {
  const plain = thread?.toObject ? thread.toObject() : thread;
  return plain || null;
}

router.use(requireAuth);

router.get("/threads", async (req, res, next) => {
  try {
    const query = req.user.role === "admin" ? {} : { "user.id": req.user.id };
    const threads = await SupportThread.find(query).sort({ lastMessageAt: -1, createdAt: -1 }).lean();
    res.json(threads);
  } catch (err) {
    next(err);
  }
});

router.post("/threads", async (req, res, next) => {
  try {
    const subject = normalizeText(req.body?.subject, 180);
    const text = normalizeText(req.body?.text ?? req.body?.message, 2000);

    if (!subject || !text) {
      return res.status(400).json({ message: "Укажите тему и сообщение" });
    }

    const message = buildMessage(req.user, text);
    const thread = await SupportThread.create({
      subject,
      user: buildSender(req.user),
      status: "open",
      lastMessageAt: message.createdAt,
      lastMessagePreview: text.slice(0, 180),
      lastSenderRole: message.senderRole,
      messages: [message],
    });

    res.status(201).json(shapeThread(thread));
  } catch (err) {
    next(err);
  }
});

router.get("/threads/:id", async (req, res, next) => {
  try {
    const thread = await SupportThread.findById(req.params.id).lean();
    if (!thread) {
      return res.status(404).json({ message: "Диалог не найден" });
    }

    if (!canAccessThread(thread, req.user)) {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    res.json(thread);
  } catch (err) {
    next(err);
  }
});

router.post("/threads/:id/messages", async (req, res, next) => {
  try {
    const thread = await SupportThread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: "Диалог не найден" });
    }

    if (!canAccessThread(thread, req.user)) {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    const text = normalizeText(req.body?.text ?? req.body?.message, 2000);
    if (!text) {
      return res.status(400).json({ message: "Введите сообщение" });
    }

    const message = buildMessage(req.user, text);
    thread.messages.push(message);
    thread.lastMessageAt = message.createdAt;
    thread.lastMessagePreview = text.slice(0, 180);
    thread.lastSenderRole = message.senderRole;
    thread.status = "open";

    await thread.save();
    res.json(thread);
  } catch (err) {
    next(err);
  }
});

router.patch("/threads/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const thread = await SupportThread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ message: "Диалог не найден" });
    }

    const nextStatus = req.body?.status === "closed" ? "closed" : "open";
    thread.status = nextStatus;
    await thread.save();

    res.json(thread);
  } catch (err) {
    next(err);
  }
});

module.exports = router;