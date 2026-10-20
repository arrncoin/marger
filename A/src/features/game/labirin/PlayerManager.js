// src/features/game/labirin/PlayerManager.js
// Manages multiplayer entities, grid collision detection, movement cooldowns & finishes
const config = require("./config");

class PlayerManager {
    constructor() {
        this.players = new Map(); // username.toLowerCase() -> Player
        this.finishers = [];      // Array of finished players in order
        this.colorIndex = 0;
        this.avatarIndex = 0;
    }

    /**
     * Daftarkan pemain baru ke garis start
     * @param {string} rawUsername
     * @param {{ x: number, y: number }} startPos
     */
    addPlayer(rawUsername, startPos) {
        const cleanName = String(rawUsername || "").replace(/^@+/, "").trim();
        if (!cleanName) {
            return { success: false, reason: "invalid_username" };
        }

        const lowerName = cleanName.toLowerCase();
        if (this.players.has(lowerName)) {
            return { success: false, reason: "already_joined", player: this.players.get(lowerName) };
        }

        const color = config.PLAYER_COLORS[this.colorIndex % config.PLAYER_COLORS.length];
        const icon = config.PLAYER_AVATARS[this.avatarIndex % config.PLAYER_AVATARS.length];
        this.colorIndex++;
        this.avatarIndex++;

        const player = {
            userId: `p_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
            username: cleanName,
            displayName: cleanName,
            x: startPos.x,
            y: startPos.y,
            color,
            icon,
            joinedAt: Date.now(),
            moveCount: 0,
            finishTime: null,
            finishRank: null,
            status: "playing", // "playing" | "finished" | "eliminated"
            lastMoveAt: 0
        };

        this.players.set(lowerName, player);

        return {
            success: true,
            player
        };
    }

    /**
     * Proses pergerakan pemain di grid labirin
     * @param {string} rawUsername
     * @param {"atas"|"bawah"|"kiri"|"kanan"} rawDirection
     * @param {number[][]} grid
     * @param {{ x: number, y: number }} exitPos
     * @param {number} gameStartedAt
     */
    movePlayer(rawUsername, rawDirection, grid, exitPos, gameStartedAt) {
        if (!rawUsername || !rawDirection || !grid) return { success: false, reason: "invalid_params" };

        const lowerName = String(rawUsername).replace(/^@+/, "").trim().toLowerCase();
        const player = this.players.get(lowerName);

        if (!player) {
            return { success: false, reason: "not_joined" };
        }

        if (player.status !== "playing") {
            return { success: false, reason: "already_finished", player };
        }

        const now = Date.now();
        // Anti-spam movement cooldown (140ms)
        if (now - player.lastMoveAt < config.MOVE_COOLDOWN_MS) {
            return { success: false, reason: "cooldown", player };
        }

        // Petakan arah movement
        let dx = 0;
        let dy = 0;
        const dir = String(rawDirection).trim().toLowerCase().replace(/^!/, "");

        if (dir === "atas" || dir === "up" || dir === "w") {
            dy = -1;
        } else if (dir === "bawah" || dir === "down" || dir === "s") {
            dy = 1;
        } else if (dir === "kiri" || dir === "left" || dir === "a") {
            dx = -1;
        } else if (dir === "kanan" || dir === "right" || dir === "d") {
            dx = 1;
        } else {
            return { success: false, reason: "invalid_direction" };
        }

        const nx = player.x + dx;
        const ny = player.y + dy;
        const height = grid.length;
        const width = grid[0].length;

        // Cek tabrakan dinding atau batas grid
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || grid[ny][nx] === 1) {
            player.lastMoveAt = now; // Tetap pasang cooldown kecil agar tidak spam dinding
            return {
                success: false,
                reason: "wall_hit",
                direction: dir,
                player
            };
        }

        // Gerakan valid: Update posisi & statistik
        player.x = nx;
        player.y = ny;
        player.moveCount++;
        player.lastMoveAt = now;

        // Cek jika mencapai EXIT
        if (nx === exitPos.x && ny === exitPos.y) {
            player.status = "finished";
            const elapsed = Math.max(0.1, (now - gameStartedAt) / 1000);
            player.finishTime = Number(elapsed.toFixed(2));
            this.finishers.push(player);
            player.finishRank = this.finishers.length;

            return {
                success: true,
                moved: true,
                finished: true,
                rank: player.finishRank,
                finishTime: player.finishTime,
                moveCount: player.moveCount,
                player
            };
        }

        return {
            success: true,
            moved: true,
            finished: false,
            direction: dir,
            player
        };
    }

    getPlayer(rawUsername) {
        if (!rawUsername) return null;
        return this.players.get(String(rawUsername).replace(/^@+/, "").trim().toLowerCase()) || null;
    }

    getAllPlayers() {
        return Array.from(this.players.values());
    }

    getFinishers() {
        return [...this.finishers];
    }

    getLeaderboard() {
        return this.finishers.map((p, idx) => ({
            rank: idx + 1,
            username: p.username,
            time: p.finishTime,
            moves: p.moveCount,
            color: p.color,
            icon: p.icon
        }));
    }

    get count() {
        return this.players.size;
    }

    getCount() {
        return this.players.size;
    }

    clear() {
        this.players.clear();
        this.finishers = [];
        this.colorIndex = 0;
        this.avatarIndex = 0;
    }
}

module.exports = PlayerManager;
