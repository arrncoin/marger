// src/features/game/labirin/storage.js
// Persistent Storage & Statistics for LABIRIN Maze Game
const fs = require("fs");
const path = require("path");
const dbFacade = require("../../../data/database");
const { getWritablePath } = require("../../../core/utils/paths");

const DATA_DIR = getWritablePath("data");
const BACKUP_JSON_PATH = path.join(DATA_DIR, "labirin_stats.json");

class LabirinStorage {
    constructor() {
        this.db = dbFacade ? dbFacade.db : null;
        this.memoryStore = new Map(); // username.toLowerCase() -> stats
        this.init();
    }

    init() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            this.loadBackup();
        } catch (err) {
            console.error("⚠️ [LABIRIN STORAGE] Init warning:", err.message);
        }
    }

    loadBackup() {
        try {
            if (fs.existsSync(BACKUP_JSON_PATH)) {
                const raw = fs.readFileSync(BACKUP_JSON_PATH, "utf8");
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        if (item && item.username) {
                            this.memoryStore.set(item.username.toLowerCase(), item);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("⚠️ [LABIRIN STORAGE] loadBackup error:", err.message);
        }
    }

    saveBackup() {
        try {
            const all = Array.from(this.memoryStore.values());
            fs.writeFileSync(BACKUP_JSON_PATH, JSON.stringify(all, null, 2), "utf8");
        } catch (err) {
            console.error("⚠️ [LABIRIN STORAGE] saveBackup error:", err.message);
        }
    }

    /**
     * Catat hasil pertandingan untuk seluruh peserta
     * @param {Object} summary
     */
    recordGameResult(summary) {
        if (!summary || !Array.isArray(summary.players)) return;
        const now = new Date().toISOString();

        for (const p of summary.players) {
            const cleanName = String(p.username || "").replace(/^@+/, "").trim();
            if (!cleanName) continue;
            const lowerName = cleanName.toLowerCase();

            const isWin = p.finishRank === 1 ? 1 : 0;
            const finishTime = p.finishTime !== null ? Number(p.finishTime) : 999999;
            const moves = Number(p.moveCount) || 0;

            // 1. Simpan ke SQLite jika tersedia
            if (this.db) {
                try {
                    const checkStmt = this.db.prepare("SELECT id, best_time, total_moves FROM labirin_players WHERE LOWER(username) = ?");
                    const existing = checkStmt.get(lowerName);

                    if (existing) {
                        const newBest = finishTime < 999999 ? Math.min(existing.best_time, finishTime) : existing.best_time;
                        const updateStmt = this.db.prepare(`
                            UPDATE labirin_players
                            SET games_played = games_played + 1,
                                wins = wins + ?,
                                best_time = ?,
                                total_moves = total_moves + ?,
                                last_played = ?,
                                updated_at = ?
                            WHERE LOWER(username) = ?
                        `);
                        updateStmt.run(isWin, newBest, moves, now, now, lowerName);
                    } else {
                        const insertStmt = this.db.prepare(`
                            INSERT INTO labirin_players (username, display_name, games_played, wins, best_time, total_moves, last_played, created_at, updated_at)
                            VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
                        `);
                        insertStmt.run(cleanName, cleanName, isWin, finishTime, moves, now, now, now);
                    }
                } catch (err) {
                    console.error("⚠️ [LABIRIN STORAGE] recordGameResult SQLite error:", err.message);
                }
            }

            // 2. Simpan ke memory fallback & file backup JSON
            const mem = this.memoryStore.get(lowerName) || {
                username: cleanName,
                displayName: cleanName,
                gamesPlayed: 0,
                wins: 0,
                bestTime: 999999,
                totalMoves: 0,
                lastPlayed: now,
                createdAt: now
            };

            mem.gamesPlayed += 1;
            mem.wins += isWin;
            if (finishTime < 999999) {
                mem.bestTime = Math.min(mem.bestTime, finishTime);
            }
            mem.totalMoves += moves;
            mem.lastPlayed = now;
            mem.updatedAt = now;

            this.memoryStore.set(lowerName, mem);
        }

        // Catat ringkasan ke riwayat
        if (this.db && summary.winner) {
            try {
                const histStmt = this.db.prepare(`
                    INSERT INTO labirin_history (total_players, winner_username, winner_time, winner_moves, created_at)
                    VALUES (?, ?, ?, ?, ?)
                `);
                histStmt.run(
                    summary.players.length,
                    summary.winner.username,
                    summary.winner.finishTime,
                    summary.winner.moveCount,
                    now
                );
            } catch (err) {
                console.error("⚠️ [LABIRIN STORAGE] record history error:", err.message);
            }
        }

        this.saveBackup();
    }

    /**
     * Ambil Leaderboard teratas khusus game LABIRIN
     * @param {number} [limit=10]
     */
    getLeaderboard(limit = 10) {
        const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));

        if (this.db) {
            try {
                const stmt = this.db.prepare(`
                    SELECT username, display_name, games_played, wins, best_time, total_moves, last_played
                    FROM labirin_players
                    WHERE games_played > 0
                    ORDER BY wins DESC, best_time ASC, total_moves ASC
                    LIMIT ?
                `);
                const rows = stmt.all(safeLimit);
                return rows.map((r, i) => ({
                    rank: i + 1,
                    username: r.username,
                    displayName: r.display_name || r.username,
                    gamesPlayed: r.games_played,
                    wins: r.wins,
                    bestTime: r.best_time >= 999999 ? "-" : `${r.best_time}s`,
                    bestTimeRaw: r.best_time,
                    totalMoves: r.total_moves,
                    lastPlayed: r.last_played
                }));
            } catch (err) {
                console.error("⚠️ [LABIRIN STORAGE] getLeaderboard error:", err.message);
            }
        }

        // Fallback memory
        const list = Array.from(this.memoryStore.values());
        list.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return (a.bestTime || 999999) - (b.bestTime || 999999);
        });

        return list.slice(0, safeLimit).map((r, i) => ({
            rank: i + 1,
            username: r.username,
            displayName: r.displayName || r.username,
            gamesPlayed: r.gamesPlayed || 0,
            wins: r.wins || 0,
            bestTime: (r.bestTime && r.bestTime < 999999) ? `${r.bestTime}s` : "-",
            bestTimeRaw: r.bestTime,
            totalMoves: r.totalMoves || 0,
            lastPlayed: r.lastPlayed
        }));
    }

    getPlayerStats(rawUsername) {
        if (!rawUsername) return null;
        const lowerName = String(rawUsername).replace(/^@+/, "").trim().toLowerCase();

        if (this.db) {
            try {
                const stmt = this.db.prepare("SELECT * FROM labirin_players WHERE LOWER(username) = ?");
                const row = stmt.get(lowerName);
                if (row) {
                    return {
                        username: row.username,
                        displayName: row.display_name || row.username,
                        gamesPlayed: row.games_played,
                        wins: row.wins,
                        bestTime: row.best_time >= 999999 ? "-" : `${row.best_time}s`,
                        totalMoves: row.total_moves,
                        lastPlayed: row.last_played
                    };
                }
            } catch (_) {}
        }

        const mem = this.memoryStore.get(lowerName);
        if (mem) {
            return {
                username: mem.username,
                displayName: mem.displayName || mem.username,
                gamesPlayed: mem.gamesPlayed,
                wins: mem.wins,
                bestTime: (mem.bestTime && mem.bestTime < 999999) ? `${mem.bestTime}s` : "-",
                totalMoves: mem.totalMoves,
                lastPlayed: mem.lastPlayed
            };
        }

        return null;
    }
}

module.exports = new LabirinStorage();
