const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

function getPostModel() {
  try {
    return mongoose.model("Post");
  } catch {
    return null;
  }
}

// GET /api/news/index?city=Алматы&days=7
router.get("/index", async (req, res, next) => {
  try {
    const Post = getPostModel();
    if (!Post) return res.status(500).json({ error: "Post model not found" });

    const city = req.query.city || "Алматы";
    const days = Math.max(1, Math.min(90, Number(req.query.days || 7)));

    const since = new Date();
    since.setDate(since.getDate() - days);

    const pipeline = [
      {
        $match: {
          isAuto: true,
          city,
          createdAt: { $gte: since },
          impactScore: { $type: "number" },
          impactDirection: { $in: ["up", "down", "neutral"] },
        },
      },
      {
        $addFields: {
          dirValue: {
            $switch: {
              branches: [
                { case: { $eq: ["$impactDirection", "up"] }, then: 1 },
                { case: { $eq: ["$impactDirection", "down"] }, then: -1 },
              ],
              default: 0,
            },
          },
        },
      },
      {
        $addFields: {
          contribution: { $multiply: ["$dirValue", "$impactScore"] },
        },
      },
      {
        $group: {
          _id: null,
          rawIndex: { $sum: "$contribution" },
          count: { $sum: 1 },
          avgImpactScore: { $avg: "$impactScore" },
          positiveCount: {
            $sum: { $cond: [{ $eq: ["$impactDirection", "up"] }, 1, 0] },
          },
          negativeCount: {
            $sum: { $cond: [{ $eq: ["$impactDirection", "down"] }, 1, 0] },
          },
          neutralCount: {
            $sum: { $cond: [{ $eq: ["$impactDirection", "neutral"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          rawIndex: 1,
          count: 1,
          avgImpactScore: { $round: ["$avgImpactScore", 1] },
          positiveCount: 1,
          negativeCount: 1,
          neutralCount: 1,
          normalizedIndex: {
            $cond: [
              { $gt: ["$count", 0] },
              { $round: [{ $divide: ["$rawIndex", "$count"] }, 1] },
              0,
            ],
          },
        },
      },
    ];

    const rows = await Post.aggregate(pipeline);
    const result = rows[0] || {
      rawIndex: 0,
      normalizedIndex: 0,
      count: 0,
      avgImpactScore: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
    };

    res.json({
      ok: true,
      city,
      days,
      since,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
