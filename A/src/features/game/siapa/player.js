// src/features/game/siapa/player.js
// Lightweight, High-Performance Player Model for SIAPA Survival Game

let globalPlayerSequence = 0;

class Player {
    /**
     * @param {string} username
     * @param {string|null} [id=null]
     */
    constructor(username, id = null) {
        const clean = String(username || "").replace(/^@+/, "").trim();
        this.username = clean;
        this.displayName = clean;

        // Sequence ID unik tahan burst join
        globalPlayerSequence = (globalPlayerSequence + 1) % 9999;
        const randStr = Math.random().toString(36).substring(2, 8);
        this.id = id || `p_${Date.now().toString(36)}_${globalPlayerSequence}_${randStr}`;

        this.points = 0;
        this.alive = true;
        this.eliminated = false;
        this.rank = 0;
        this.round = 0; // Ronde saat tereliminasi
        this.survivedRounds = 0; // Total ronde yang berhasil dilewati hidup-hidup
        this.joinTime = Date.now();
        this.bonusAwarded = false; // Guard agar bonus juara/runner-up/top3 tidak dobel

        // Data aksi per ronde (misal: "kiri", "kanan", "1".."5")
        this.currentAction = null;
        this.actionTime = 0;
    }

    /**
     * Set aksi pemain pada tantangan ronde
     * @param {string|null} action
     */
    setAction(action) {
        if (action === null || action === undefined) {
            this.currentAction = null;
            this.actionTime = 0;
            return;
        }

        this.currentAction = String(action).trim().toLowerCase();
        this.actionTime = Date.now();
    }

    /**
     * Reset aksi pemain saat ronde baru dimulai
     */
    resetAction() {
        this.currentAction = null;
        this.actionTime = 0;
    }

    /**
     * Tandai pemain gugur
     * @param {number} rank
     * @param {number} round
     */
    eliminate(rank, round) {
        this.alive = false;
        this.eliminated = true;
        this.rank = Math.max(1, Number(rank) || 0);
        this.round = Math.max(1, Number(round) || 0);
    }

    /**
     * Tambah poin sementara dalam game
     * @param {number} pts
     */
    addPoints(pts) {
        const parsedPts = Number(pts);
        if (!isNaN(parsedPts) && parsedPts > 0) {
            this.points += parsedPts;
        }
    }

    /**
     * Representasi serialisasi JSON / State broadcast
     */
    toJSON() {
        return {
            username: this.username,
            displayName: this.displayName,
            id: this.id,
            points: this.points,
            alive: this.alive,
            eliminated: this.eliminated,
            rank: this.rank,
            round: this.round,
            survivedRounds: this.survivedRounds,
            joinTime: this.joinTime,
            currentAction: this.currentAction
        };
    }
}

module.exports = Player;
