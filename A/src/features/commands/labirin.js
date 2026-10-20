// src/features/commands/labirin.js
// Command Handler for LABIRIN Interactive Maze Race Game
const labirinGame = require("../game/labirin/LabirinGame");
const storage = require("../game/labirin/storage");
const logger = require("../../core/logger/logger");

module.exports = async function handleLabirin(cmd, args, speak, stopAndClear, isAllowed, sender, ctx = {}) {
    if (!cmd || typeof cmd !== "string") return false;

    const trimmed = cmd.trim();
    const cleanLower = trimmed.toLowerCase();
    const parts = cleanLower.split(/\s+/);
    const verb = parts[0];

    // Hubungkan TTS speak handler
    labirinGame.setSpeakHandler(speak);

    // =========================================================================
    // 1. COMMAND UTAMA: !labirin (Start, Stop, Reset, Status, Top)
    // =========================================================================
    if (verb === "!labirin") {
        const sub = parts[1];

        // 1.1 Leaderboard: !labirin top / !labirin rank
        if (sub === "top" || sub === "leaderboard" || sub === "rank") {
            const topList = storage.getLeaderboard(5);
            if (!topList || topList.length === 0) {
                speak("Belum ada data klasemen untuk game Labirin. Ayo mulai tantangan dengan ketik tanda seru labirin!", true);
                return true;
            }

            let text = "🏆 LABIRIN LEADERBOARD:\n";
            topList.forEach((p, idx) => {
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
                text += `${medal} ${p.username} - ${p.wins} Menang | Best: ${p.bestTime}\n`;
            });
            logger.info(text);
            speak(`Klasemen teratas Labirin: Posisi satu dipegang oleh ${topList[0].username} dengan ${topList[0].wins} kemenangan!`, true);
            return true;
        }

        // 1.2 Status: !labirin status
        if (sub === "status") {
            const state = labirinGame.getPublicState();
            if (!labirinGame.isActive()) {
                speak("Game Labirin saat ini tidak aktif. Ketik tanda seru labirin untuk membuka arena balapan baru.", true);
                return true;
            }

            const statusMsg = `LABIRIN STATUS:
Status   : ${state.status.toUpperCase()}
Grid     : ${state.size.width}x${state.size.height}
Peserta  : ${state.totalPlayers} Pemain
Finisher : ${state.finishersCount} Selesai
Waktu    : ${state.elapsedSeconds}s`;

            logger.info(statusMsg);
            speak(`Status Labirin: ${state.status}, ${state.totalPlayers} pemain, ${state.finishersCount} berhasil keluar.`);
            return true;
        }

        // 1.3 Stop: !labirin stop (Admin / Owner Only)
        if (sub === "stop" || sub === "selesai" || sub === "batal") {
            if (!isAllowed) {
                speak("Perintah menghentikan game Labirin hanya bisa dijalankan oleh streamer atau admin.", true);
                return true;
            }
            const res = labirinGame.stop(sender);
            speak(res.message, true);
            return true;
        }

        // 1.4 Reset: !labirin reset (Admin / Owner Only)
        if (sub === "reset") {
            if (!isAllowed) {
                speak("Perintah reset game Labirin hanya bisa dijalankan oleh streamer atau admin.", true);
                return true;
            }
            const res = labirinGame.reset();
            speak(res.message, true);
            return true;
        }

        // 1.5 Start: !labirin [size] (Admin / Owner Only)
        if (!isAllowed) {
            speak("Game Labirin hanya bisa dimulai oleh streamer atau moderator.", true);
            return true;
        }

        if (labirinGame.isActive()) {
            speak("⚠️ Game Labirin sedang berlangsung! Tunggu sampai selesai atau ketik tanda seru labirin stop.", true);
            return true;
        }

        const customSize = Number(sub) || 21;
        const result = labirinGame.start(sender, customSize);
        if (!result.success) {
            speak(result.message, true);
        }
        return true;
    }

    // =========================================================================
    // 2. COMMAND JOIN: !join, !gabung, !masuk
    // =========================================================================
    if (verb === "!join" || verb === "!gabung" || verb === "!masuk") {
        if (!labirinGame.isActive()) {
            return false;
        }

        // Jika labirin sedang aktif membuka pendaftaran
        if (labirinGame.isLobby() || labirinGame.status === "countdown") {
            const joinResult = labirinGame.join(sender);
            if (joinResult.success) {
                logger.info(`✅ [LABIRIN] @${sender} bergabung ke labirin! Total: ${joinResult.totalPlayers}`);
            }
            return true;
        }

        // Jika balapan sudah berjalan
        if (labirinGame.isPlaying()) {
            logger.warn(`[LABIRIN] @${sender} mencoba join tetapi balapan sudah dimulai.`);
            return true;
        }
    }

    // =========================================================================
    // 3. COMMAND KONTROL GERAKAN: !atas, !bawah, !kiri, !kanan
    // =========================================================================
    if (labirinGame.isPlaying()) {
        if (verb === "!atas" || verb === "!up" || verb === "!w") {
            labirinGame.movePlayer(sender, "atas");
            return true;
        }
        if (verb === "!bawah" || verb === "!down" || verb === "!s") {
            labirinGame.movePlayer(sender, "bawah");
            return true;
        }
        if (verb === "!kiri" || verb === "!left" || verb === "!a") {
            labirinGame.movePlayer(sender, "kiri");
            return true;
        }
        if (verb === "!kanan" || verb === "!right" || verb === "!d") {
            labirinGame.movePlayer(sender, "kanan");
            return true;
        }
    }

    return false;
};
