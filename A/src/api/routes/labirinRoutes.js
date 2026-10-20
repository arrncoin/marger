// src/api/routes/labirinRoutes.js
const express = require("express");
const controller = require("../controllers/labirinController");

const router = express.Router();

router.get("/api/labirin/state", controller.getState);
router.get("/api/labirin/leaderboard", controller.getLeaderboard);
router.get("/api/labirin/stats/:username", controller.getStats);
router.post("/api/labirin/action", controller.handleAction);

module.exports = router;
