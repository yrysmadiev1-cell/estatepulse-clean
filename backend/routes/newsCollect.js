const express = require("express");
const { runCollectKapitalJob } = require("../jobs/collectKapitalJob");

const router = express.Router();

// POST /api/news/collect/kapital
router.post("/kapital", async (req, res, next) => {
  try {
    const stats = await runCollectKapitalJob({
      perSection: req.body?.perSection,
      delayMs: req.body?.delayMs,
      maxNew: req.body?.maxNew,
    });
    return res.json(stats);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
