// src/features/game/labirin/LabirinGame.js
// Master Game Engine for LABIRIN Multiplayer Livestream Maze Race
const EventEmitter = require("events");
const MazeGenerator = require("./MazeGenerator");
const PlayerManager = require("./PlayerManager");
const storage = require("./storage");
const config = require("./config");
const EVENTS = require("./events");
const logger = require("../../../core/logger/logger");
const overlayState = require("../../../core/state/overlayState");
const pointManager = require("../../points/pointManager");

class LabirinGameEngine extends EventEmitter {
    constructor() {
        super();
        this.status = "idle"; // "idle" | "lobby" | "countdown" | "playing" | "finished"
        this.maze = null;
        this.playerManager = new PlayerManager();

        this.lobbyCountdown = config.LOBBY_DURATION_SECONDS;
        this.countdownValue = config.COUNTDOWN_SECONDS;
        this.gameStartedAt = 0;
        this.elapsedSeconds = 0;
        this.winner = null;

        this.timer = null;
        this.stateTimeout = null;
        this.gameSessionId = null;
        this.winnerDeclared = false;
        this.rewardsAwarded = new Set(); // username -> boolean (mencegah dobel reward)

        this.speakHandler = null;
    }

    setSpeakHandler(handler) {
        this.speakHandler = handler;
    }

    speak(text, priority = false) {
        if (typeof this.speakHandler === "function" && text) {
            try {
                this.speakHandler(text, priority);
            } catch (err) {
                logger.warn(`⚠️ [LABIRIN TTS] Error: ${err.message}`);
            }
        }
    }

    isActive() {
        return this.status !== "idle" && Boolean(this.status);
    }

    isLobby() {
        return this.status === "lobby";
    }

    isPlaying() {
        return this.status === "playing";
    }

    clearTimers() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.stateTimeout) {
            clearTimeout(this.stateTimeout);
            this.stateTimeout = null;
        }
    }

    resetInternal() {
        this.clearTimers();
        this.playerManager.clear();
        this.maze = null;
        this.lobbyCountdown = config.LOBBY_DURATION_SECONDS;
        this.countdownValue = config.COUNTDOWN_SECONDS;
        this.gameStartedAt = 0;
        this.elapsedSeconds = 0;
        this.winner = null;
        this.winnerDeclared = false;
        this.rewardsAwarded.clear();
        this.gameSessionId = null;
    }

    /**
     * Memulai game labirin baru
     * @param {string} [initiator="Streamer"]
     * @param {number} [customSize=21]
     */
    start(initiator = "Streamer", customSize = config.DEFAULT_SIZE) {
        if (this.isActive()) {
            return {
                success: false,
                message: "⚠️ Game LABIRIN sedang berlangsung! Tunggu sampai game selesai atau ketik !labirin stop."
            };
        }

        this.resetInternal();

        this.gameSessionId = `labirin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const currentSession = this.gameSessionId;

        // Buat maze baru yang 100% solvable
        this.maze = MazeGenerator.generate(customSize);
        this.status = "lobby";
        this.lobbyCountdown = config.LOBBY_DURATION_SECONDS;

        logger.info(`🌀 [LABIRIN] Game baru dibuka oleh ${initiator}! Ukuran grid: ${this.maze.width}x${this.maze.height}. Waktu daftar: ${this.lobbyCountdown}s.`);
        this.speak("Game Labirin telah dibuka! Ketik tanda seru join di chat sekarang untuk masuk ke dalam labirin!", true);

        this.emit(EVENTS.GAME_STARTED, {
            size: this.maze.width,
            countdown: this.lobbyCountdown
        });
        this.syncOverlay();

        // Timer hitung mundur lobby pendaftaran
        this.timer = setInterval(() => {
            if (this.gameSessionId !== currentSession || !this.isLobby()) {
                this.clearTimers();
                return;
            }

            this.lobbyCountdown--;
            this.emit(EVENTS.LOBBY_TICK, { countdown: this.lobbyCountdown, players: this.playerManager.getAllPlayers().length });
            this.syncOverlay();

            if (this.lobbyCountdown <= 0) {
                this.clearTimers();
                this.startCountdown();
            }
        }, 1000);

        return {
            success: true,
            message: `🌀 Arena Labirin (${this.maze.width}x${this.maze.height}) dibuka! Ketik !join untuk ikut serta (Pendaftaran: ${this.lobbyCountdown}s)`
        };
    }

    /**
     * Pendaftaran peserta ke dalam labirin
     * @param {string} rawUsername
     */
    join(rawUsername) {
        if (!this.isActive()) {
            return { success: false, reason: "game_not_active", message: "Game labirin belum dibuka." };
        }

        if (this.status !== "lobby" && this.status !== "countdown") {
            return { success: false, reason: "registration_closed", message: "Pendaftaran labirin sudah ditutup! Balapan sedang berlangsung." };
        }

        const result = this.playerManager.addPlayer(rawUsername, this.maze.start);
        if (!result.success) {
            return result;
        }

        // Berikan poin registrasi
        try {
            const currentSession = this.gameSessionId || "labirin";
            pointManager.addPoints(result.player.username, config.POINTS.JOIN, "labirin", "Partisipasi Labirin", `labirin_join_${currentSession}_${result.player.username}`);
        } catch (_) {}

        logger.info(`[LABIRIN] PLAYER JOINED: @${result.player.username} (${this.playerManager.getAllPlayers().length} pemain)`);
        this.emit(EVENTS.PLAYER_JOINED, { player: result.player, total: this.playerManager.getAllPlayers().length });
        this.syncOverlay();

        return {
            success: true,
            player: result.player,
            totalPlayers: this.playerManager.getAllPlayers().length
        };
    }

    /**
     * Fase hitung mundur 3... 2... 1... GO!
     */
    startCountdown() {
        this.clearTimers();
        const currentSession = this.gameSessionId;
        const total = this.playerManager.getAllPlayers().length;

        if (total === 0) {
            logger.warn("⚠️ [LABIRIN] Tidak ada pemain yang bergabung. Game dibatalkan.");
            this.speak("Belum ada peserta yang bergabung ke arena labirin. Game dibatalkan.", true);
            this.reset();
            return;
        }

        this.status = "countdown";
        this.countdownValue = config.COUNTDOWN_SECONDS;
        this.emit(EVENTS.COUNTDOWN_START, { countdown: this.countdownValue });
        this.speak("Bersiap! Tiga... Dua... Satu... Mulai! Lari cari jalan keluar!", true);
        this.syncOverlay();

        this.timer = setInterval(() => {
            if (this.gameSessionId !== currentSession || this.status !== "countdown") {
                this.clearTimers();
                return;
            }

            this.countdownValue--;
            this.emit(EVENTS.COUNTDOWN_TICK, { countdown: this.countdownValue });
            this.syncOverlay();

            if (this.countdownValue <= 0) {
                this.clearTimers();
                this.startRace();
            }
        }, 1000);
    }

    /**
     * Balapan dimulai (Status: playing)
     */
    startRace() {
        this.clearTimers();
        const currentSession = this.gameSessionId;

        this.status = "playing";
        this.gameStartedAt = Date.now();
        this.elapsedSeconds = 0;

        logger.info(`🏁 [LABIRIN] RACE STARTED! ${this.playerManager.getAllPlayers().length} pemain mulai berlari.`);
        this.emit(EVENTS.RACE_START, {
            totalPlayers: this.playerManager.getAllPlayers().length
        });
        this.syncOverlay();

        // Timer detik balapan & batas waktu 5 menit
        this.timer = setInterval(() => {
            if (this.gameSessionId !== currentSession || !this.isPlaying()) {
                this.clearTimers();
                return;
            }

            this.elapsedSeconds = Math.floor((Date.now() - this.gameStartedAt) / 1000);
            this.emit(EVENTS.RACE_TICK, { elapsed: this.elapsedSeconds });
            this.syncOverlay();

            // Cek jika batas waktu habis (5 menit)
            if (this.elapsedSeconds >= config.GAME_TIMEOUT_SECONDS) {
                logger.info("⏱️ [LABIRIN] Waktu balapan habis (5 menit).");
                this.speak("Waktu balapan labirin telah habis!", true);
                this.finishGame();
            }
        }, 1000);
    }

    /**
     * Memproses kontrol gerakan dari chat penonton
     * @param {string} rawUsername
     * @param {"atas"|"bawah"|"kiri"|"kanan"} direction
     */
    movePlayer(rawUsername, direction) {
        if (!this.isPlaying()) {
            return { success: false, reason: "race_not_active" };
        }

        const moveResult = this.playerManager.movePlayer(
            rawUsername,
            direction,
            this.maze.grid,
            this.maze.exit,
            this.gameStartedAt
        );

        if (!moveResult.success) {
            return moveResult;
        }

        // Pancarkan event posisi baru
        this.emit(EVENTS.PLAYER_MOVED, {
            username: moveResult.player.username,
            x: moveResult.player.x,
            y: moveResult.player.y,
            direction: moveResult.direction,
            moveCount: moveResult.player.moveCount
        });

        // Cek jika player berhasil FINISH
        if (moveResult.finished) {
            this.handlePlayerFinish(moveResult.player);
        }

        this.syncOverlay();
        return moveResult;
    }

    /**
     * Menangani pemain yang mencapai portal EXIT
     * @param {Object} player
     */
    handlePlayerFinish(player) {
        const rank = player.finishRank;
        logger.info(`🏁 [LABIRIN] FINISH! #${rank} @${player.username} — ⏱️ ${player.finishTime}s | 👣 ${player.moveCount} langkah`);

        this.emit(EVENTS.PLAYER_FINISHED, {
            rank,
            player,
            time: player.finishTime,
            moves: player.moveCount
        });

        const currentSession = this.gameSessionId || "labirin";
        const userKey = player.username.toLowerCase();

        // Jika player adalah FINISHER PERTAMA -> PEMENANG JUARA 1
        if (rank === 1 && !this.winnerDeclared) {
            this.winnerDeclared = true;
            this.winner = {
                username: player.username,
                displayName: player.displayName,
                color: player.color,
                icon: player.icon,
                finishTime: player.finishTime,
                moveCount: player.moveCount
            };

            logger.info(`🏆 [LABIRIN WINNER] Juara 1: @${player.username} dalam ${player.finishTime} detik!`);
            this.speak(`Luar biasa! Selamat kepada ${player.username} yang berhasil keluar dari labirin sebagai Juara Satu dalam waktu ${player.finishTime} detik dan ${player.moveCount} langkah!`, true);

            this.emit(EVENTS.WINNER_DECLARED, {
                winner: this.winner
            });

            // Berikan bonus juara 1 (+1000)
            if (!this.rewardsAwarded.has(`${userKey}_win`)) {
                this.rewardsAwarded.add(`${userKey}_win`);
                try {
                    pointManager.addPoints(player.username, config.POINTS.WINNER, "labirin", `Juara 1 Labirin (${player.finishTime}s)`, `labirin_win_${currentSession}_${player.username}`);
                } catch (_) {}
            }
        } else if (rank === 2) {
            this.speak(`Runner up diraih oleh ${player.username}!`);
            if (!this.rewardsAwarded.has(`${userKey}_p2`)) {
                this.rewardsAwarded.add(`${userKey}_p2`);
                try {
                    pointManager.addPoints(player.username, config.POINTS.RUNNER_UP, "labirin", `Runner Up Labirin (${player.finishTime}s)`, `labirin_r2_${currentSession}_${player.username}`);
                } catch (_) {}
            }
        } else if (rank === 3) {
            this.speak(`Podium tiga ditempati oleh ${player.username}!`);
            if (!this.rewardsAwarded.has(`${userKey}_p3`)) {
                this.rewardsAwarded.add(`${userKey}_p3`);
                try {
                    pointManager.addPoints(player.username, config.POINTS.TOP_3, "labirin", `Top 3 Labirin (${player.finishTime}s)`, `labirin_r3_${currentSession}_${player.username}`);
                } catch (_) {}
            }
        } else {
            // Finisher biasa (+100)
            if (!this.rewardsAwarded.has(`${userKey}_fin`)) {
                this.rewardsAwarded.add(`${userKey}_fin`);
                try {
                    pointManager.addPoints(player.username, config.POINTS.FINISH, "labirin", `Finish Labirin #${rank}`, `labirin_fin_${currentSession}_${player.username}`);
                } catch (_) {}
            }
        }

        // Cek jika seluruh pemain yang bermain sudah finish
        const allPlayers = this.playerManager.getAllPlayers();
        const finishedCount = this.playerManager.getFinishers().length;
        if (finishedCount >= allPlayers.length) {
            logger.info("🎉 [LABIRIN] Seluruh peserta telah menyelesaikan labirin!");
            this.finishGame();
        }
    }

    /**
     * Menyelesaikan game dan menyimpan statistik permanen
     */
    finishGame() {
        this.clearTimers();
        this.status = "finished";

        const allPlayers = this.playerManager.getAllPlayers();
        const finishers = this.playerManager.getFinishers();

        try {
            storage.recordGameResult({
                players: allPlayers,
                winner: this.winner,
                finishersCount: finishers.length,
                totalPlayers: allPlayers.length
            });
            logger.info("💾 [LABIRIN] Statistik pertandingan berhasil disimpan ke database SQLite.");
        } catch (err) {
            logger.error(`❌ [LABIRIN ERROR] Gagal simpan statistik: ${err.message}`);
        }

        this.emit(EVENTS.GAME_ENDED, {
            winner: this.winner,
            leaderboard: this.playerManager.getLeaderboard()
        });
        this.syncOverlay();

        // Kembali ke mode idle setelah 12 detik selebrasi
        this.stateTimeout = setTimeout(() => {
            this.reset();
        }, 12000);
    }

    /**
     * Berhenti paksa oleh streamer / admin
     * @param {string} [stoppedBy="Streamer"]
     */
    stop(stoppedBy = "Streamer") {
        if (!this.isActive()) {
            return { success: false, message: "ℹ️ Tidak ada game Labirin yang sedang berjalan." };
        }

        this.clearTimers();
        const wasPlaying = this.isPlaying();

        if (wasPlaying) {
            try {
                storage.recordGameResult({
                    players: this.playerManager.getAllPlayers(),
                    winner: this.winner,
                    finishersCount: this.playerManager.getFinishers().length,
                    totalPlayers: this.playerManager.getAllPlayers().length
                });
            } catch (_) {}
        }

        logger.warn(`[LABIRIN] GAME STOPPED — Dihentikan oleh ${stoppedBy}.`);
        this.speak("Game Labirin telah dihentikan.", true);

        this.emit(EVENTS.GAME_STOPPED, { stoppedBy });
        this.resetInternal();
        this.status = "idle";
        this.syncOverlay();

        return { success: true, message: "⏹️ Game Labirin berhasil dihentikan." };
    }

    /**
     * Reset game ke mode standby
     */
    reset() {
        this.clearTimers();
        this.resetInternal();
        this.status = "idle";
        this.emit(EVENTS.GAME_ENDED, { reset: true });
        this.syncOverlay();
        return { success: true, message: "🔄 Game Labirin berhasil di-reset ke standby." };
    }

    /**
     * Payload representasi state publik untuk konsumsi overlay dan API
     */
    getPublicState() {
        const allPlayers = this.playerManager.getAllPlayers();
        const finishers = this.playerManager.getFinishers();

        let realElapsed = this.elapsedSeconds;
        if (this.isPlaying() && this.gameStartedAt > 0) {
            realElapsed = Number(((Date.now() - this.gameStartedAt) / 1000).toFixed(1));
        }

        return {
            game: "labirin",
            status: this.status, // "idle" | "lobby" | "countdown" | "playing" | "finished"
            size: this.maze ? { width: this.maze.width, height: this.maze.height } : { width: 21, height: 21 },
            maze: this.maze ? {
                grid: this.maze.grid,
                start: this.maze.start,
                exit: this.maze.exit,
                shortestPathLength: this.maze.shortestPathLength
            } : null,
            players: allPlayers,
            totalPlayers: allPlayers.length,
            finishersCount: finishers.length,
            winner: this.winner,
            countdown: this.status === "lobby" ? this.lobbyCountdown : (this.status === "countdown" ? this.countdownValue : 0),
            elapsedSeconds: realElapsed,
            leaderboard: this.playerManager.getLeaderboard(),
            allTimeLeaderboard: storage.getLeaderboard(5),
            updatedAt: Date.now()
        };
    }

    syncOverlay() {
        try {
            if (this.isActive()) {
                overlayState.set({
                    mode: "labirin",
                    ...this.getPublicState()
                });
            } else {
                overlayState.set({
                    mode: "dashboard"
                });
            }
        } catch (err) {
            logger.warn(`⚠️ [LABIRIN OVERLAY] Gagal sinkronisasi overlay: ${err.message}`);
        }
    }
}

module.exports = new LabirinGameEngine();
