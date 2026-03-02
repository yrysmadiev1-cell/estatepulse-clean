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

// GET /api/news/trend?city=Алматы&days=30
router.get("/trend", async (req, res, next) => {
  try {
    const Post = getPostModel();
    if (!Post) return res.status(500).json({ error: "Post model not found" });

    const city = req.query.city || "Алматы";
    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));

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
      { $addFields: { contribution: { $multiply: ["$dirValue", "$impactScore"] } } },
      {
        $addFields: {
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "Asia/Almaty",
            },
          },
        },
      },
      {
        $group: {
          _id: "$day",
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
          date: "$_id",
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
      { $sort: { date: 1 } },
    ];

    const series = await Post.aggregate(pipeline);

    res.json({
      ok: true,
      city,
      days,
      since,
      series,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
