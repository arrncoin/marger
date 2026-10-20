// src/api/controllers/labirinController.js
// Handles /api/labirin/* endpoints
const labirinGame = require("../../features/game/labirin/LabirinGame");
const labirinStorage = require("../../features/game/labirin/storage");

module.exports = {
    getState(req, res) {
        try {
            res.set({
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "Access-Control-Allow-Origin": "*"
            });
            const state = typeof labirinGame.getPublicState === "function"
                ? labirinGame.getPublicState()
                : { status: "idle", totalPlayers: 0 };
            return res.json(state);
        } catch (err) {
            return res.status(500).json({ success: false, message: "Gagal mengambil state game labirin." });
        }
    },

    getLeaderboard(req, res) {
        try {
            const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
            const leaderboard = typeof labirinStorage.getLeaderboard === "function"
                ? labirinStorage.getLeaderboard(limit)
                : [];

            return res.json({
                success: true,
                leaderboard
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Gagal mengambil leaderboard labirin." });
        }
    },

    getStats(req, res) {
        try {
            const username = req.params.username ? req.params.username.trim() : "";
            if (!username) {
                return res.status(400).json({ success: false, message: "Username wajib diisi" });
            }

            const stats = typeof labirinStorage.getPlayerStats === "function"
                ? labirinStorage.getPlayerStats(username)
                : null;

            return res.json({
                success: true,
                stats
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Gagal mengambil statistik pemain labirin." });
        }
    },

    handleAction(req, res) {
        try {
            const { action, username, size, direction } = req.body || {};

            if (!action) {
                return res.status(400).json({ success: false, message: "Aksi tidak boleh kosong" });
            }

            if (action === "start") {
                const mazeSize = Number(size) || 21;
                const result = labirinGame.start(username || "Dashboard", mazeSize);
                return res.json(result);
            }

            if (action === "stop") {
                const result = labirinGame.stop(username || "Dashboard");
                return res.json(result);
            }

            if (action === "reset") {
                const result = labirinGame.reset();
                return res.json(result);
            }

            if (action === "join") {
                if (!username) {
                    return res.status(400).json({ success: false, message: "Username wajib diisi untuk join" });
                }
                const result = labirinGame.join(username);
                return res.json(result);
            }

            if (action === "move") {
                if (!username || !direction) {
                    return res.status(400).json({ success: false, message: "Username dan direction wajib diisi" });
                }
                const result = labirinGame.movePlayer(username, direction);
                return res.json(result);
            }

            return res.status(400).json({ success: false, message: "Aksi tidak dikenal" });
        } catch (err) {
            return res.status(500).json({ success: false, message: "Terjadi kesalahan server saat memproses aksi labirin." });
        }
    }
};
