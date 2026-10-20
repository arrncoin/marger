// games/siapa/game.js
// Master Game Engine for SIAPA Interactive Survival Livechat Game
const EventEmitter = require("events");
const Player = require("./player");
const storage = require("./storage");
const { REWARDS, getRoundSurvivalPoints } = require("./scoring");
const { calculateRoundSchedule, resolveRound, fairShuffle, FINAL_CHALLENGE } = require("./rounds");
const EVENTS = require("./events");
const logger = require("../../core/utils/logger");
const overlayState = require("../../core/utils/overlayState");
const pointManager = require("../../core/points/pointManager");

class SiapaGameEngine extends EventEmitter {
    constructor() {
        super();
        this.status = "idle"; // "idle" | "lobby" | "preparing" | "running" | "eliminating" | "cooldown" | "winner"
        this.players = new Map(); // username.toLowerCase() -> Player
        this.alivePlayers = []; // Array of active Player
        this.eliminatedPlayers = []; // Array of eliminated Player

        this.roundSchedule = [];
        this.currentRoundIndex = 0;
        this.currentRoundConfig = null;

        this.lobbyCountdown = 60;
        this.initialLobbyCountdown = 60;
        this.roundCountdown = 0;
        this.roundTotalCountdown = 0;
        this.cooldownCountdown = 0;
        this.cooldownTotal = 30;
        this.preparingCountdown = 0;
        this.preparingTotal = 30;

        this.timer = null;
        this.roundStateTimer = null;
        this.gameSessionId = null;
        this.winnerFinalized = false;

        this.lastEliminated = []; // Max 15 untuk visual
        this.recentJoined = []; // Max 15 untuk visual
        this.winner = null;
        this.runnerUp = null;
        this.finalPlayers = [];

        this.gameStartedAt = 0;
        this.initiator = "Streamer";
        this.speakHandler = null;
    }

    /**
     * Daftarkan handler TTS (Kak Jule)
     */
    setSpeakHandler(handler) {
        this.speakHandler = handler;
    }

    /**
     * Eksekusi pemutaran suara Kak Jule secara aman
     */
    speak(text, priority = false) {
        if (typeof this.speakHandler === "function" && text) {
            try {
                this.speakHandler(text, priority);
            } catch (err) {
                logger.warn(`⚠️ [SIAPA TTS] Gagal memutar TTS: ${err.message}`);
            }
        }
    }

    isActive() {
        return this.status !== "idle" && Boolean(this.status);
    }

    isLobby() {
        return this.status === "lobby";
    }

    /**
     * Membersihkan semua timer aktif (interval & timeout)
     */
    clearTimers() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.roundStateTimer) {
            clearTimeout(this.roundStateTimer);
            this.roundStateTimer = null;
        }
    }

    /**
     * Reset variabel internal ke kondisi bersih
     */
    resetInternal() {
        this.players.clear();
        this.alivePlayers = [];
        this.eliminatedPlayers = [];
        this.roundSchedule = [];
        this.currentRoundIndex = 0;
        this.currentRoundConfig = null;
        this.lobbyCountdown = 60;
        this.initialLobbyCountdown = 60;
        this.roundCountdown = 0;
        this.roundTotalCountdown = 0;
        this.cooldownCountdown = 0;
        this.cooldownTotal = 30;
        this.preparingCountdown = 0;
        this.preparingTotal = 30;
        this.lastEliminated = [];
        this.recentJoined = [];
        this.winner = null;
        this.runnerUp = null;
        this.finalPlayers = [];
        this.gameStartedAt = 0;
        this.winnerFinalized = false;
        this.gameSessionId = null;
    }

    /**
     * Memulai game / lobby baru
     * @param {string} initiator
     * @param {number} [customLobbySeconds=60]
     */
    startLobby(initiator = "Streamer", customLobbySeconds = 60) {
        if (this.isActive()) {
            return {
                success: false,
                message: "⚠️ Game SIAPA sedang berlangsung! Tunggu sampai game selesai."
            };
        }

        this.clearTimers();
        this.resetInternal();

        this.gameSessionId = `siapa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const currentSession = this.gameSessionId;

        this.status = "lobby";
        this.initiator = initiator || "Streamer";
        this.gameStartedAt = Date.now();
        this.lobbyCountdown = Math.max(10, Math.min(300, Number(customLobbySeconds) || 60));
        this.initialLobbyCountdown = this.lobbyCountdown;

        logger.info(`⚡ [SIAPA] GAME STARTED — Lobby dibuka oleh ${this.initiator}. Pendaftaran ${this.lobbyCountdown} detik.`);
        this.speak("Game survival Siapa Yang Akan Bertahan telah dibuka! Ketik tanda seru join di chat sekarang untuk masuk arena!", true);

        this.emit(EVENTS.GAME_STARTED, { initiator: this.initiator, countdown: this.lobbyCountdown });
        this.emit(EVENTS.LOBBY_START, { countdown: this.lobbyCountdown });
        this.syncOverlay();

        this.timer = setInterval(() => {
            if (this.gameSessionId !== currentSession || !this.isLobby()) {
                this.clearTimers();
                return;
            }

            this.lobbyCountdown--;
            this.emit(EVENTS.LOBBY_COUNTDOWN, { countdown: this.lobbyCountdown, playersCount: this.players.size });
            this.syncOverlay();

            if (this.lobbyCountdown <= 0) {
                this.closeLobbyAndStart();
            }
        }, 1000);

        return {
            success: true,
            message: `⚡ Arena SIAPA dibuka! Ketik !join untuk mendaftar (waktu: ${this.lobbyCountdown}s)`
        };
    }

    /**
     * Menambahkan pemain ke dalam arena
     * @param {string} rawUsername
     * @param {Object} [meta={}]
     */
    join(rawUsername, meta = {}) {
        if (this.status !== "lobby") {
            return {
                success: false,
                reason: "lobby_closed",
                message: "Pendaftaran SIAPA sudah ditutup atau game sedang berjalan."
            };
        }

        const cleanName = String(rawUsername || "").replace(/^@+/, "").trim();
        if (!cleanName) {
            return {
                success: false,
                reason: "invalid_username",
                message: "Username tidak valid!"
            };
        }

        const lowerName = cleanName.toLowerCase();
        if (this.players.has(lowerName)) {
            return {
                success: false,
                reason: "already_joined",
                message: "Kamu sudah terdaftar di arena ini!"
            };
        }

        if (this.players.size >= 1000) {
            return {
                success: false,
                reason: "arena_full",
                message: "Kapasitas arena penuh (maksimal 1000 pemain)!"
            };
        }

        const player = new Player(cleanName);
        player.addPoints(REWARDS.JOIN); // +10 poin registrasi
        this.players.set(lowerName, player);

        // Queue visual recent joined (Max 15)
        this.recentJoined.push(cleanName);
        if (this.recentJoined.length > 15) {
            this.recentJoined.shift();
        }

        logger.info(`[SIAPA] PLAYER JOINED: @${cleanName} (Total: ${this.players.size}/1000)`);
        this.emit(EVENTS.PLAYER_JOINED, {
            username: cleanName,
            totalPlayers: this.players.size,
            player: player.toJSON()
        });
        this.syncOverlay();

        return {
            success: true,
            username: cleanName,
            totalPlayers: this.players.size,
            points: player.points
        };
    }

    /**
     * Menerima input interaktif dari pemain di livechat
     * @param {string} rawUsername
     * @param {string} action
     */
    handlePlayerInput(rawUsername, action) {
        if (this.status !== "running" || !this.currentRoundConfig) return false;
        if (!rawUsername || action === undefined || action === null) return false;

        const cleanName = String(rawUsername).replace(/^@+/, "").trim();
        if (!cleanName) return false;

        const lowerName = cleanName.toLowerCase();
        const player = this.players.get(lowerName);
        if (!player || !player.alive || player.eliminated) return false;

        const challenge = this.currentRoundConfig.challenge;
        if (!challenge) return false;

        const rawActionStr = String(action).trim().toLowerCase();
        let validatedAction = null;

        if (challenge.id === "CHOOSE") {
            if (rawActionStr === "kiri" || rawActionStr === "!kiri") {
                validatedAction = "kiri";
            } else if (rawActionStr === "kanan" || rawActionStr === "!kanan") {
                validatedAction = "kanan";
            } else {
                return false;
            }
        } else if (challenge.id === "NUMBER") {
            const numMatch = rawActionStr.match(/[1-5]/);
            if (numMatch) {
                validatedAction = numMatch[0];
            } else {
                return false;
            }
        } else if (challenge.id === "METEOR") {
            const secMatch = rawActionStr.match(/[1-3]/);
            if (secMatch) {
                validatedAction = secMatch[0];
            } else {
                return false;
            }
        } else {
            // Tantangan lainnya (DUEL, FREEZE, SURVIVAL, FINAL_DUEL)
            validatedAction = rawActionStr.substring(0, 30);
        }

        player.setAction(validatedAction);
        return true;
    }

    /**
     * Menutup pendaftaran dan memulai alur permainan
     */
    closeLobbyAndStart() {
        this.clearTimers();
        if (this.status !== "lobby") return;

        const currentSession = this.gameSessionId;
        const totalJoined = this.players.size;

        this.emit(EVENTS.LOBBY_CLOSED, { totalPlayers: totalJoined });

        if (totalJoined < 2) {
            logger.warn(`⚠️ [SIAPA] Pemain kurang dari 2 (terdaftar: ${totalJoined}). Game dibatalkan.`);
            this.speak("Pemain yang bergabung kurang dari dua orang. Arena Siapa Yang Akan Bertahan dibatalkan. Yuk coba lagi nanti!", true);
            this.reset();
            return;
        }

        this.alivePlayers = Array.from(this.players.values());
        this.roundSchedule = calculateRoundSchedule(totalJoined);
        this.currentRoundIndex = 0;

        logger.info(`[SIAPA] LOBBY CLOSED — Total: ${totalJoined} pemain. Jadwal ronde: ${this.roundSchedule.length} ronde.`);
        this.speak(`Pendaftaran ditutup! Sebanyak ${totalJoined} pemain telah memasuki arena! Ronde satu dimulai sekarang!`, true);
        this.syncOverlay();

        this.roundStateTimer = setTimeout(() => {
            if (this.gameSessionId !== currentSession || !this.isActive()) return;
            this.startPreparing();
        }, 2000);
    }

    /**
     * Fase persiapan sebelum ronde dimulai (Preparing: 30 detik)
     */
    startPreparing() {
        this.clearTimers();
        const currentSession = this.gameSessionId;

        if (!this.isActive() || this.gameSessionId !== currentSession) return;

        // Jika hanya tersisa 1 pemain, langsung tentukan pemenang
        if (this.alivePlayers.length <= 1) {
            this.finalizeWinner();
            return;
        }

        // Tentukan konfigurasi ronde aktif
        if (this.alivePlayers.length === 2) {
            this.currentRoundConfig = {
                roundNumber: Math.max(1, this.currentRoundIndex + 1),
                targetSurvivors: 1,
                challenge: FINAL_CHALLENGE
            };
        } else if (this.currentRoundIndex < this.roundSchedule.length) {
            this.currentRoundConfig = this.roundSchedule[this.currentRoundIndex];
        } else {
            // Jadwal ronde selesai tapi masih > 2 pemain: Sudden Death
            this.currentRoundConfig = {
                roundNumber: this.currentRoundIndex + 1,
                targetSurvivors: Math.max(1, Math.floor(this.alivePlayers.length / 2)),
                challenge: {
                    id: "SURVIVAL",
                    title: "SUDDEN DEATH SURVIVAL",
                    badge: "SUDDEN DEATH",
                    desc: "Eliminasi mendadak penentuan duel juara!",
                    prompt: "BERTAHANLAH! SUDDEN DEATH ARENA!",
                    duration: 30,
                    type: "survival"
                }
            };
        }

        this.status = "preparing";
        const roundNum = this.currentRoundConfig.roundNumber;
        const totalRounds = Math.max(roundNum, this.roundSchedule.length || 1);
        const challenge = this.currentRoundConfig.challenge;
        const aliveCount = this.alivePlayers.length;

        this.preparingTotal = 30;
        this.preparingCountdown = this.preparingTotal;

        logger.info(`[SIAPA] PREPARING — Ronde ${roundNum}/${totalRounds}: ${challenge.title} | ${aliveCount} pemain bersiap`);

        if (aliveCount === 2) {
            this.speak(`Perhatian! Final duel akan segera dimainkan antara ${this.alivePlayers[0].username} melawan ${this.alivePlayers[1].username}! Bersiaplah!`, true);
        } else if (roundNum === 1) {
            this.speak(`Ronde satu akan segera dimulai! ${challenge.title}. ${challenge.desc}. Bersiaplah selama tiga puluh detik!`, true);
        } else {
            this.speak(`Ronde ${roundNum} akan segera dimulai! ${challenge.title}. ${challenge.desc}. Bersiaplah selama tiga puluh detik!`, true);
        }

        this.emit(EVENTS.PREPARING_STARTED, {
            round: roundNum,
            totalRounds,
            alive: aliveCount,
            challenge,
            countdown: this.preparingCountdown,
            totalCountdown: this.preparingTotal
        });
        this.syncOverlay();

        this.timer = setInterval(() => {
            if (this.gameSessionId !== currentSession || this.status !== "preparing") {
                this.clearTimers();
                return;
            }

            this.preparingCountdown--;
            this.emit(EVENTS.PREPARING_TICK, { countdown: this.preparingCountdown, round: roundNum });
            this.syncOverlay();

            if (this.preparingCountdown <= 0) {
                this.clearTimers();
                this.startNextRound();
            }
        }, 1000);
    }

    /**
     * Memulai ronde tantangan aktif (Running)
     */
    startNextRound() {
        this.clearTimers();
        const currentSession = this.gameSessionId;

        if (!this.isActive() || this.gameSessionId !== currentSession) return;

        if (this.alivePlayers.length <= 1) {
            this.finalizeWinner();
            return;
        }

        if (!this.currentRoundConfig) {
            this.startPreparing();
            return;
        }

        this.status = "running";
        const roundNum = this.currentRoundConfig.roundNumber;
        const totalRounds = Math.max(roundNum, this.roundSchedule.length || 1);
        const challenge = this.currentRoundConfig.challenge;
        const aliveCount = this.alivePlayers.length;

        // Reset aksi pemain di awal ronde baru
        for (const p of this.alivePlayers) {
            p.resetAction();
        }

        if (aliveCount <= 2) {
            this.finalPlayers = this.alivePlayers.map(p => p.toJSON());
            this.emit(EVENTS.FINAL_DUEL, { finalPlayers: this.finalPlayers });
        } else if (aliveCount <= 10) {
            this.emit(EVENTS.FINAL_STARTED, { aliveCount });
        }

        this.roundCountdown = challenge.duration || 30;
        this.roundTotalCountdown = this.roundCountdown;

        logger.info(`[SIAPA] ROUND STARTED — Ronde ${roundNum}/${totalRounds}: ${challenge.title} | ${aliveCount} pemain bertahan`);

        if (aliveCount === 2) {
            this.speak(`Final duel dua pemain terhebat! ${this.alivePlayers[0].username} melawan ${this.alivePlayers[1].username}! Siapa yang akan bertahan?`, true);
        } else if (roundNum === 1) {
            this.speak(`Ronde satu! Tantangan: ${challenge.title}. ${challenge.desc}`);
        } else {
            this.speak(`Ronde ${roundNum}! ${challenge.title}! ${challenge.desc}`);
        }

        this.emit(EVENTS.ROUND_STARTED, {
            round: roundNum,
            totalRounds,
            alive: aliveCount,
            totalPlayers: this.players.size,
            challenge,
            countdown: this.roundCountdown,
            totalCountdown: this.roundTotalCountdown
        });
        this.syncOverlay();

        this.timer = setInterval(() => {
            if (this.gameSessionId !== currentSession || this.status !== "running") {
                this.clearTimers();
                return;
            }

            this.roundCountdown--;
            this.emit(EVENTS.CHALLENGE_TICK, { countdown: this.roundCountdown });
            this.syncOverlay();

            if (this.roundCountdown <= 0) {
                this.clearTimers();
                this.executeElimination();
            }
        }, 1000);
    }

    /**
     * Memproses eliminasi ronde (Eliminating)
     */
    executeElimination() {
        this.clearTimers();
        const currentSession = this.gameSessionId;

        if (!this.isActive() || this.gameSessionId !== currentSession) return;

        this.status = "eliminating";

        const { survivors, eliminated, meta } = resolveRound(
            this.currentRoundConfig,
            this.alivePlayers,
            this.players.size
        );

        this.alivePlayers = survivors;
        for (const e of eliminated) {
            this.eliminatedPlayers.push(e);
        }

        this.lastEliminated = eliminated.slice(0, 15).map(e => ({
            username: e.username,
            rank: e.rank,
            round: e.round
        }));

        // Berikan survival points ke para survivor
        const roundPoints = getRoundSurvivalPoints(this.currentRoundConfig.roundNumber);
        for (const s of survivors) {
            s.survivedRounds++;
            s.addPoints(roundPoints);
        }

        logger.info(`[SIAPA] ROUND COMPLETED — Ronde ${this.currentRoundConfig.roundNumber}. Gugur: ${eliminated.length} | Selamat: ${survivors.length}. ${meta.detail}`);

        if (eliminated.length > 0) {
            this.emit(EVENTS.PLAYER_ELIMINATED, {
                eliminated: this.lastEliminated,
                round: this.currentRoundConfig.roundNumber
            });
        }

        this.emit(EVENTS.ROUND_COMPLETED, {
            round: this.currentRoundConfig.roundNumber,
            totalRounds: Math.max(this.currentRoundConfig.roundNumber, this.roundSchedule.length || 1),
            alive: survivors.length,
            eliminatedCount: eliminated.length,
            lastEliminated: this.lastEliminated,
            meta,
            survivorReward: roundPoints
        });
        this.syncOverlay();

        if (survivors.length > 1) {
            this.speak(`${eliminated.length} pemain tereliminasi! Tersisa ${survivors.length} pemain yang masih bertahan!`);
        }

        this.currentRoundIndex++;

        // Jeda visual eliminasi 3.5 detik sebelum cooldown atau pengumuman juara
        this.roundStateTimer = setTimeout(() => {
            if (this.gameSessionId !== currentSession || !this.isActive()) return;

            if (this.alivePlayers.length <= 1) {
                this.finalizeWinner();
            } else {
                this.startCooldown();
            }
        }, 3500);
    }

    /**
     * Fase jeda antar ronde (Cooldown: 30 detik)
     */
    startCooldown() {
        this.clearTimers();
        const currentSession = this.gameSessionId;

        if (!this.isActive() || this.gameSessionId !== currentSession) return;

        if (this.alivePlayers.length <= 1) {
            this.finalizeWinner();
            return;
        }

        const nextRoundNumber = this.currentRoundIndex + 1;
        this.status = "cooldown";
        this.cooldownTotal = 30;
        this.cooldownCountdown = this.cooldownTotal;

        logger.info(`[SIAPA] COOLDOWN — Ronde ${nextRoundNumber} akan dimulai dalam ${this.cooldownTotal} detik.`);
        this.speak("Ronde berikutnya dimulai dalam tiga puluh detik. Bersiap di chat!");

        this.emit(EVENTS.ROUND_COOLDOWN, {
            nextRound: nextRoundNumber,
            countdown: this.cooldownCountdown,
            totalCountdown: this.cooldownTotal
        });
        this.syncOverlay();

        this.timer = setInterval(() => {
            if (this.gameSessionId !== currentSession || this.status !== "cooldown") {
                this.clearTimers();
                return;
            }

            this.cooldownCountdown--;
            this.emit(EVENTS.ROUND_COOLDOWN_TICK, { countdown: this.cooldownCountdown, nextRound: nextRoundNumber });
            this.syncOverlay();

            if (this.cooldownCountdown <= 0) {
                this.clearTimers();
                this.startPreparing();
            }
        }, 1000);
    }

    /**
     * Menetapkan pemenang akhir dan memberikan seluruh reward kemenangan
     */
    finalizeWinner() {
        this.clearTimers();

        if (this.winnerFinalized) return;
        this.winnerFinalized = true;

        this.status = "winner";

        let winnerPlayer = null;
        let runnerUpPlayer = null;

        if (this.alivePlayers.length === 1) {
            winnerPlayer = this.alivePlayers[0];
            runnerUpPlayer = this.eliminatedPlayers.find(p => p.rank === 2) || null;
        } else if (this.alivePlayers.length === 2) {
            // Selesaikan 2 pemain yang masih hidup secara adil
            const shuffled = fairShuffle(this.alivePlayers);
            winnerPlayer = shuffled[0];
            runnerUpPlayer = shuffled[1];
            runnerUpPlayer.eliminate(2, this.currentRoundIndex + 1);
            this.alivePlayers = [winnerPlayer];
            this.eliminatedPlayers.push(runnerUpPlayer);
        } else if (this.alivePlayers.length > 2) {
            const ranked = fairShuffle(this.alivePlayers);
            winnerPlayer = ranked[0];
            runnerUpPlayer = ranked[1];
            for (let i = 1; i < ranked.length; i++) {
                ranked[i].eliminate(i + 1, this.currentRoundIndex + 1);
                this.eliminatedPlayers.push(ranked[i]);
            }
            this.alivePlayers = [winnerPlayer];
        } else {
            // Edge case: alivePlayers kosong
            winnerPlayer = this.eliminatedPlayers.find(p => p.rank === 1) || this.eliminatedPlayers[this.eliminatedPlayers.length - 1] || null;
            runnerUpPlayer = this.eliminatedPlayers.find(p => p.rank === 2) || null;
        }

        // Terapkan reward bonus akhir secara tepat satu kali
        if (winnerPlayer && !winnerPlayer.bonusAwarded) {
            winnerPlayer.rank = 1;
            winnerPlayer.survivedRounds = Math.max(1, this.currentRoundIndex);
            winnerPlayer.addPoints(REWARDS.WINNER);
            winnerPlayer.bonusAwarded = true;
        }

        if (runnerUpPlayer && !runnerUpPlayer.bonusAwarded) {
            runnerUpPlayer.rank = 2;
            runnerUpPlayer.addPoints(REWARDS.RUNNER_UP);
            runnerUpPlayer.bonusAwarded = true;
        }

        const top3Player = this.eliminatedPlayers.find(p => p.rank === 3);
        if (top3Player && !top3Player.bonusAwarded) {
            top3Player.addPoints(REWARDS.TOP_3);
            top3Player.bonusAwarded = true;
        }

        this.winner = winnerPlayer ? winnerPlayer.toJSON() : null;
        this.runnerUp = runnerUpPlayer ? runnerUpPlayer.toJSON() : null;

        // Simpan hasil ke persistent storage database
        try {
            storage.recordGameResult({
                players: Array.from(this.players.values()).map(p => p.toJSON()),
                totalRounds: Math.max(1, this.currentRoundIndex),
                winner: this.winner,
                runnerUp: this.runnerUp
            });
        } catch (err) {
            logger.error(`❌ [SIAPA STORAGE ERROR] Gagal simpan hasil game ke database: ${err.message}`);
        }

        // Distribusikan total poin ke sistem pointManager transaksi dengan eventId unik
        const currentSession = this.gameSessionId || `siapa_${Date.now()}`;
        for (const p of this.players.values()) {
            if (p.points > 0) {
                try {
                    const desc = p.rank === 1
                        ? `Juara 1 SIAPA (+${p.points} poin)`
                        : (p.rank === 2
                            ? `Runner Up SIAPA (+${p.points} poin)`
                            : (p.rank === 3
                                ? `Top 3 SIAPA (+${p.points} poin)`
                                : `Partisipasi SIAPA (${p.survivedRounds || 0} ronde lolos, +${p.points} poin)`));
                    const eventId = `siapa_${currentSession}_${p.username}`;
                    pointManager.addPoints(p.username, p.points, "siapa", desc, eventId);
                } catch (err) {
                    logger.warn(`⚠️ [SIAPA POINT ERROR] Gagal tambah poin user ${p.username}: ${err.message}`);
                }
            }
        }

        const winnerStats = winnerPlayer ? storage.getPlayerStats(winnerPlayer.username) : null;
        const winnerName = winnerPlayer ? winnerPlayer.username : "Tidak Ada";

        logger.info(`[SIAPA] WINNER — 🏆 @${winnerName} berhasil bertahan dan menjadi Juara SIAPA!`);
        this.speak(`Luar biasa! Selamat kepada ${winnerName} yang berhasil menjadi satu-satunya yang bertahan di arena Siapa! Kamu memenangkan seribu poin!`, true);

        this.emit(EVENTS.WINNER, {
            winner: this.winner,
            runnerUp: this.runnerUp,
            stats: winnerStats
        });
        this.syncOverlay();

        // Jeda selebrasi sebelum kembali ke idle
        this.roundStateTimer = setTimeout(() => {
            this.endGame();
        }, 10000);
    }

    /**
     * Menyelesaikan game dan kembali ke mode idle
     */
    endGame() {
        this.clearTimers();
        logger.info(`[SIAPA] GAME ENDED — Arena kembali ke mode standby.`);
        this.emit(EVENTS.GAME_ENDED, { winner: this.winner });
        this.resetInternal();
        this.status = "idle";
        this.syncOverlay();
    }

    /**
     * Menghentikan game yang sedang berlangsung secara aman
     * @param {string} [stoppedBy="Streamer"]
     */
    stop(stoppedBy = "Streamer") {
        if (!this.isActive()) {
            return { success: false, message: "ℹ️ Tidak ada game SIAPA yang sedang berjalan." };
        }

        this.clearTimers();
        const currentSession = this.gameSessionId;
        const wasInLobby = this.isLobby();

        logger.warn(`[SIAPA] GAME STOPPED — Dihentikan oleh ${stoppedBy}.`);
        this.speak("Permainan Siapa Yang Akan Bertahan telah dihentikan.", true);

        // Jika dihentikan saat ronde sudah berjalan (bukan saat pendaftaran lobby)
        if (!wasInLobby && !this.winnerFinalized) {
            this.winnerFinalized = true;
            try {
                storage.recordGameResult({
                    players: Array.from(this.players.values()).map(p => p.toJSON()),
                    totalRounds: Math.max(1, this.currentRoundIndex),
                    winner: null,
                    runnerUp: null
                });

                for (const p of this.players.values()) {
                    if (p.points > 0) {
                        try {
                            const eventId = `siapa_${currentSession || Date.now()}_${p.username}`;
                            pointManager.addPoints(p.username, p.points, "siapa", `Partisipasi SIAPA (+${p.points} poin)`, eventId);
                        } catch (_) {}
                    }
                }
            } catch (err) {
                logger.error(`❌ [SIAPA ERROR] Gagal simpan partial game stop: ${err.message}`);
            }
        }

        this.emit(EVENTS.GAME_STOPPED, { stoppedBy });
        this.resetInternal();
        this.status = "idle";
        this.syncOverlay();

        return { success: true, message: "⏹️ Game SIAPA berhasil dihentikan." };
    }

    /**
     * Reset paksa game ke status idle/standby
     */
    reset() {
        this.clearTimers();
        this.resetInternal();
        this.status = "idle";
        this.emit(EVENTS.GAME_ENDED, { reset: true });
        this.syncOverlay();
        return { success: true, message: "🔄 Game SIAPA berhasil di-reset ke status standby." };
    }

    /**
     * Mengambil payload state publik untuk konsumsi overlay dan API
     */
    getPublicState() {
        const totalPlayers = this.players.size;
        const aliveCount = this.alivePlayers.length;
        const eliminatedCount = this.eliminatedPlayers.length;
        const totalRounds = Math.max(1, this.roundSchedule.length || 1);
        const currentRound = this.currentRoundConfig ? this.currentRoundConfig.roundNumber : 0;

        let winnerStats = null;
        if (this.winner) {
            winnerStats = storage.getPlayerStats(this.winner.username);
        }

        let countdown = 0;
        let totalCountdown = 30;

        if (this.status === "lobby") {
            countdown = this.lobbyCountdown;
            totalCountdown = this.initialLobbyCountdown || 60;
        } else if (this.status === "preparing") {
            countdown = this.preparingCountdown;
            totalCountdown = this.preparingTotal || 30;
        } else if (this.status === "cooldown") {
            countdown = this.cooldownCountdown;
            totalCountdown = this.cooldownTotal || 30;
        } else if (this.status === "running") {
            countdown = this.roundCountdown;
            totalCountdown = this.roundTotalCountdown || (this.currentRoundConfig?.challenge?.duration || 30);
        }

        return {
            game: "siapa",
            status: this.status,
            round: currentRound,
            totalRounds,
            players: totalPlayers,
            alive: aliveCount,
            eliminated: eliminatedCount,
            countdown,
            totalCountdown,
            nextRound: (this.status === "cooldown" || this.status === "preparing") ? (this.currentRoundIndex + 1) : null,
            currentChallenge: this.currentRoundConfig ? this.currentRoundConfig.challenge : null,
            lastEliminated: this.lastEliminated,
            recentJoined: this.recentJoined,
            finalPlayers: this.finalPlayers,
            winner: this.winner ? {
                ...this.winner,
                stats: winnerStats
            } : null,
            runnerUp: this.runnerUp,
            leaderboard: storage.getLeaderboard(5),
            updatedAt: Date.now()
        };
    }

    /**
     * Sinkronisasi state game ke OBS Overlay
     */
    syncOverlay() {
        try {
            if (this.isActive()) {
                overlayState.set({
                    mode: "siapa",
                    ...this.getPublicState()
                });
            } else {
                overlayState.set({
                    mode: "dashboard"
                });
            }
        } catch (err) {
            logger.warn(`⚠️ [SIAPA OVERLAY] Gagal sinkronisasi overlay: ${err.message}`);
        }
    }
}

module.exports = new SiapaGameEngine();