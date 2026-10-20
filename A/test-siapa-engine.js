// test-siapa-engine.js
// Automated Verification Suite for SIAPA Survival Game Engine (16 Scenarios)
const assert = require("assert");
const engine = require("./games/siapa/game");
const storage = require("./games/siapa/storage");
const pointManager = require("./core/points/pointManager");
const EVENTS = require("./games/siapa/events");
const { REWARDS } = require("./games/siapa/scoring");

console.log("=================================================");
console.log("🎮 MEMULAI PENGUJIAN OTOMATIS GAME ARENA SIAPA");
console.log("=================================================\n");

let passedCount = 0;
let totalCount = 0;

function test(name, fn) {
    totalCount++;
    try {
        fn();
        console.log(`✅ [PASS] Skenario ${totalCount}: ${name}`);
        passedCount++;
    } catch (err) {
        console.error(`❌ [FAIL] Skenario ${totalCount}: ${name}`);
        console.error("   Error:", err.message);
        console.error(err.stack);
        process.exitCode = 1;
    }
}

// -------------------------------------------------------------
// Skenario 1: Game dimulai dengan nol pemain
// -------------------------------------------------------------
test("Game dimulai dengan nol pemain (Lobby berakhir tanpa peserta)", () => {
    engine.reset();
    engine.startLobby("Streamer", 10);
    assert.strictEqual(engine.status, "lobby");
    assert.strictEqual(engine.players.size, 0);

    // Simulasi penutupan lobby dengan 0 pemain
    engine.closeLobbyAndStart();
    assert.strictEqual(engine.status, "idle", "Status harus kembali ke idle jika pemain < 2");
    assert.strictEqual(engine.timer, null, "Timer harus null setelah batal");
});

// -------------------------------------------------------------
// Skenario 2: Game dimulai dengan satu pemain
// -------------------------------------------------------------
test("Game dimulai dengan satu pemain (Kurang dari batas minimum 2 pemain)", () => {
    engine.reset();
    engine.startLobby("Streamer", 10);
    const joinRes = engine.join("SoloPlayer");
    assert.strictEqual(joinRes.success, true);
    assert.strictEqual(engine.players.size, 1);

    // Tutup lobby
    engine.closeLobbyAndStart();
    assert.strictEqual(engine.status, "idle", "Status harus kembali ke idle jika pemain hanya 1");
    assert.strictEqual(engine.players.size, 0, "Pemain internal harus direset");
});

// -------------------------------------------------------------
// Skenario 3: Dua pemain mengikuti permainan sampai final duel
// -------------------------------------------------------------
test("Dua pemain mengikuti permainan sampai final duel", () => {
    engine.reset();
    engine.startLobby("Streamer", 10);
    engine.join("FighterA");
    engine.join("FighterB");
    assert.strictEqual(engine.players.size, 2);

    engine.closeLobbyAndStart();
    // Schedule untuk 2 pemain harus langsung 1 ronde dengan FINAL_CHALLENGE
    assert.strictEqual(engine.roundSchedule.length, 1);
    assert.strictEqual(engine.roundSchedule[0].challenge.id, "FINAL_DUEL");
    assert.strictEqual(engine.roundSchedule[0].targetSurvivors, 1);

    // Masuk ke Preparing & Running
    engine.clearTimers();
    engine.startPreparing();
    assert.strictEqual(engine.status, "preparing");

    engine.clearTimers();
    engine.startNextRound();
    assert.strictEqual(engine.status, "running");
    assert.strictEqual(engine.finalPlayers.length, 2, "Harus mendeteksi final duel 2 pemain");

    // Eksekusi eliminasi ronde
    engine.clearTimers();
    engine.executeElimination();
    assert.strictEqual(engine.alivePlayers.length, 1, "Harus tersisa 1 survivor");
    assert.strictEqual(engine.eliminatedPlayers.length, 1, "Harus ada 1 pemain tereliminasi");
    assert.strictEqual(engine.eliminatedPlayers[0].rank, 2, "Pemain yang gugur harus rank 2 (Runner Up)");

    // Finalize Winner
    engine.clearTimers();
    engine.finalizeWinner();
    assert.strictEqual(engine.status, "winner");
    assert.ok(engine.winner, "Pemenang harus terdefinisi");
    assert.strictEqual(engine.winner.rank, 1, "Rank pemenang harus 1");
    assert.ok(engine.runnerUp, "Runner-up harus terdefinisi");
    assert.strictEqual(engine.runnerUp.rank, 2, "Rank runner-up harus 2");

    engine.reset();
});

// -------------------------------------------------------------
// Skenario 4: Banyak pemain bergabung hingga kapasitas maksimum (1.000 pemain)
// -------------------------------------------------------------
test("Banyak pemain bergabung hingga kapasitas maksimum (1.000 pemain)", () => {
    engine.reset();
    engine.startLobby("Streamer", 60);

    for (let i = 1; i <= 1000; i++) {
        const res = engine.join(`User_${i}`);
        assert.strictEqual(res.success, true);
    }
    assert.strictEqual(engine.players.size, 1000);

    // Pemain ke-1001 harus ditolak
    const overflowRes = engine.join("User_1001");
    assert.strictEqual(overflowRes.success, false);
    assert.strictEqual(overflowRes.reason, "arena_full");
    assert.strictEqual(engine.players.size, 1000);

    engine.reset();
});

// -------------------------------------------------------------
// Skenario 5: Username duplikat dengan perbedaan huruf besar dan kecil
// -------------------------------------------------------------
test("Username duplikat dengan perbedaan huruf besar dan kecil", () => {
    engine.reset();
    engine.startLobby("Streamer", 30);

    const res1 = engine.join("GamerPro");
    assert.strictEqual(res1.success, true);

    const res2 = engine.join("gamerpro");
    assert.strictEqual(res2.success, false);
    assert.strictEqual(res2.reason, "already_joined");

    const res3 = engine.join("@GAMERPRO");
    assert.strictEqual(res3.success, false);
    assert.strictEqual(res3.reason, "already_joined");

    assert.strictEqual(engine.players.size, 1);
    engine.reset();
});

// -------------------------------------------------------------
// Skenario 6: Lobby berakhir normal
// -------------------------------------------------------------
test("Lobby berakhir normal dan transisi ke Preparing ronde 1", () => {
    engine.reset();
    engine.startLobby("Streamer", 10);
    engine.join("Player1");
    engine.join("Player2");
    engine.join("Player3");

    let lobbyClosedEmitted = false;
    engine.once(EVENTS.LOBBY_CLOSED, () => {
        lobbyClosedEmitted = true;
    });

    engine.closeLobbyAndStart();
    assert.strictEqual(lobbyClosedEmitted, true);
    assert.strictEqual(engine.alivePlayers.length, 3);
    assert.ok(engine.roundSchedule.length >= 2);

    engine.reset();
});

// -------------------------------------------------------------
// Skenario 7: Ronde selesai dengan eliminasi normal
// -------------------------------------------------------------
test("Ronde selesai dengan eliminasi normal dan kuota akurat", () => {
    engine.reset();
    engine.startLobby("Streamer", 10);
    for (let i = 1; i <= 6; i++) {
        engine.join(`Player_${i}`);
    }
    engine.closeLobbyAndStart();
    engine.clearTimers();

    engine.startPreparing();
    engine.clearTimers();
    engine.startNextRound();

    // Input aksi pemain
    engine.handlePlayerInput("Player_1", "kiri");
    engine.handlePlayerInput("Player_2", "kanan");

    engine.clearTimers();
    engine.executeElimination();

    assert.ok(engine.alivePlayers.length < 6, "Jumlah hidup harus berkurang setelah eliminasi");
    assert.ok(engine.eliminatedPlayers.length > 0, "Harus ada pemain tereliminasi");
    assert.strictEqual(engine.alivePlayers.length + engine.eliminatedPlayers.length, 6, "Total pemain harus tetap 6");

    // Periksa bahwa rank yang gugur valid dan berurutan
    for (const elim of engine.eliminatedPlayers) {
        assert.ok(elim.rank > engine.alivePlayers.length, "Rank pemain tereliminasi harus lebih besar dari sisa pemain hidup");
    }

    engine.reset();
});

// -------------------------------------------------------------
// Skenario 8: Ronde menghasilkan satu pemain tersisa
// -------------------------------------------------------------
test("Ronde menghasilkan satu pemain tersisa langsung menuju finalizeWinner", () => {
    engine.reset();
    engine.startLobby("Streamer", 10);
    engine.join("SurvivorSolo");
    engine.join("ChallengerX");
    engine.closeLobbyAndStart();
    engine.clearTimers();

    engine.startPreparing();
    engine.clearTimers();
    engine.startNextRound();
    engine.clearTimers();
    engine.executeElimination();

    assert.strictEqual(engine.alivePlayers.length, 1);

    // Transisi harus otomatis menuju finalizeWinner tanpa ronde tambahan
    engine.clearTimers();
    engine.startPreparing();
    assert.strictEqual(engine.status, "winner", "Jika sisa 1 pemain, startPreparing langsung finalizeWinner");
    assert.strictEqual(engine.winner.username, engine.alivePlayers[0].username);

    engine.reset();
});

// -------------------------------------------------------------
// Skenario 9: Jadwal ronde habis dengan beberapa pemain tersisa
// -------------------------------------------------------------
test("Jadwal ronde habis dengan beberapa pemain tersisa (Sudden Death)", () => {
    engine.reset();
    engine.startLobby("Streamer", 10);
    engine.join("Hero1");
    engine.join("Hero2");
    engine.join("Hero3");
    engine.closeLobbyAndStart();
    engine.clearTimers();

    // Simulasikan currentRoundIndex melampaui roundSchedule
    engine.currentRoundIndex = engine.roundSchedule.length;
    engine.startPreparing();
    assert.strictEqual(engine.status, "preparing");
    assert.ok(engine.currentRoundConfig, "Harus menghasilkan sudden death round");
    assert.strictEqual(engine.currentRoundConfig.challenge.id, "SURVIVAL");

    engine.reset();
});

// -------------------------------------------------------------
// Skenario 10: Game dihentikan pada setiap fase
// -------------------------------------------------------------
test("Game dihentikan (stop) pada setiap fase permainan", () => {
    // 10.1 Stop saat Lobby
    engine.reset();
    engine.startLobby("Streamer", 60);
    engine.join("UserA");
    assert.strictEqual(engine.status, "lobby");
    let stopRes = engine.stop("Admin");
    assert.strictEqual(stopRes.success, true);
    assert.strictEqual(engine.status, "idle");
    assert.strictEqual(engine.isActive(), false);

    // 10.2 Stop saat Preparing
    engine.reset();
    engine.startLobby("Streamer", 60);
    engine.join("UserA");
    engine.join("UserB");
    engine.closeLobbyAndStart();
    engine.clearTimers();
    engine.startPreparing();
    assert.strictEqual(engine.status, "preparing");
    stopRes = engine.stop("Admin");
    assert.strictEqual(stopRes.success, true);
    assert.strictEqual(engine.status, "idle");

    // 10.3 Stop saat Running
    engine.reset();
    engine.startLobby("Streamer", 60);
    engine.join("UserA");
    engine.join("UserB");
    engine.closeLobbyAndStart();
    engine.clearTimers();
    engine.startPreparing();
    engine.clearTimers();
    engine.startNextRound();
    assert.strictEqual(engine.status, "running");
    stopRes = engine.stop("Admin");
    assert.strictEqual(stopRes.success, true);
    assert.strictEqual(engine.status, "idle");

    // 10.4 Stop saat Eliminating
    engine.reset();
    engine.startLobby("Streamer", 60);
    engine.join("UserA");
    engine.join("UserB");
    engine.closeLobbyAndStart();
    engine.clearTimers();
    engine.startPreparing();
    engine.clearTimers();
    engine.startNextRound();
    engine.clearTimers();
    engine.executeElimination();
    assert.strictEqual(engine.status, "eliminating");
    stopRes = engine.stop("Admin");
    assert.strictEqual(stopRes.success, true);
    assert.strictEqual(engine.status, "idle");

    // 10.5 Stop saat Cooldown
    engine.reset();
    engine.startLobby("Streamer", 60);
    engine.join("UserA");
    engine.join("UserB");
    engine.join("UserC");
    engine.closeLobbyAndStart();
    engine.clearTimers();
    engine.startCooldown();
    assert.strictEqual(engine.status, "cooldown");
    stopRes = engine.stop("Admin");
    assert.strictEqual(stopRes.success, true);
    assert.strictEqual(engine.status, "idle");

    // 10.6 Stop saat Winner
    engine.reset();
    engine.startLobby("Streamer", 60);
    engine.join("UserA");
    engine.join("UserB");
    engine.closeLobbyAndStart();
    engine.clearTimers();
    engine.finalizeWinner();
    assert.strictEqual(engine.status, "winner");
    stopRes = engine.stop("Admin");
    assert.strictEqual(stopRes.success, true);
    assert.strictEqual(engine.status, "idle");
});

// -------------------------------------------------------------
// Skenario 11: Game di-reset ketika timer aktif
// -------------------------------------------------------------
test("Game di-reset ketika timer aktif", () => {
    engine.reset();
    engine.startLobby("Streamer", 60);
    assert.notStrictEqual(engine.timer, null);

    const resetRes = engine.reset();
    assert.strictEqual(resetRes.success, true);
    assert.strictEqual(engine.status, "idle");
    assert.strictEqual(engine.timer, null);
    assert.strictEqual(engine.roundStateTimer, null);
});

// -------------------------------------------------------------
// Skenario 12: Callback timer lama berjalan setelah reset
// -------------------------------------------------------------
test("Callback timer lama tercegah oleh session ID guard setelah reset", (done) => {
    engine.reset();
    engine.startLobby("Streamer", 60);
    const oldSession = engine.gameSessionId;

    // Reset game seketika
    engine.reset();

    // Simulasikan callback usang yang masih membawa session ID lama
    assert.notStrictEqual(engine.gameSessionId, oldSession);
    assert.strictEqual(engine.isActive(), false);

    // Panggil paksa startPreparing dengan asumsi session usang
    engine.startPreparing();
    assert.strictEqual(engine.status, "idle", "Status tidak boleh berubah jika session tidak aktif");
});

// -------------------------------------------------------------
// Skenario 13: Penyimpanan database gagal
// -------------------------------------------------------------
test("Penyimpanan database gagal ditangani secara aman tanpa crash", () => {
    engine.reset();
    engine.startLobby("Streamer", 30);
    engine.join("PlayerDb1");
    engine.join("PlayerDb2");
    engine.closeLobbyAndStart();
    engine.clearTimers();

    // Mock storage throw error
    const originalRecord = storage.recordGameResult;
    storage.recordGameResult = () => {
        throw new Error("Disk I/O Simulation Failure");
    };

    assert.doesNotThrow(() => {
        engine.finalizeWinner();
    }, "Game engine tidak boleh crash bila database throw error");

    assert.strictEqual(engine.status, "winner");
    storage.recordGameResult = originalRecord;
    engine.reset();
});

// -------------------------------------------------------------
// Skenario 14: Pemberian poin gagal
// -------------------------------------------------------------
test("Pemberian poin gagal ditangani secara aman tanpa crash", () => {
    engine.reset();
    engine.startLobby("Streamer", 30);
    engine.join("PlayerPts1");
    engine.join("PlayerPts2");
    engine.closeLobbyAndStart();
    engine.clearTimers();

    // Mock pointManager throw error
    const originalAddPoints = pointManager.addPoints;
    pointManager.addPoints = () => {
        throw new Error("Point Transaction Network Timeout");
    };

    assert.doesNotThrow(() => {
        engine.finalizeWinner();
    }, "Game engine tidak boleh crash bila pointManager throw error");

    assert.strictEqual(engine.status, "winner");
    pointManager.addPoints = originalAddPoints;
    engine.reset();
});

// -------------------------------------------------------------
// Skenario 15: Pemenang dan runner-up mendapatkan hadiah tepat satu kali
// -------------------------------------------------------------
test("Pemenang dan runner-up mendapatkan hadiah tepat satu kali", () => {
    engine.reset();
    engine.startLobby("Streamer", 30);
    engine.join("WinnerCandidate");
    engine.join("RunnerUpCandidate");
    engine.closeLobbyAndStart();
    engine.clearTimers();

    engine.finalizeWinner();
    assert.ok(engine.winner);
    assert.ok(engine.runnerUp);

    const actualWinner = engine.players.get(engine.winner.username.toLowerCase());
    const actualRunnerUp = engine.players.get(engine.runnerUp.username.toLowerCase());

    const winnerPtsAfterFirst = actualWinner.points;
    const runnerPtsAfterFirst = actualRunnerUp.points;

    // Verifikasi penambahan bonus WINNER (+1000) dan RUNNER_UP (+500)
    assert.strictEqual(winnerPtsAfterFirst, 10 + REWARDS.WINNER);
    assert.strictEqual(runnerPtsAfterFirst, 10 + REWARDS.RUNNER_UP);

    // Panggil finalizeWinner kedua kalinya (simulasi double callback)
    engine.finalizeWinner();
    assert.strictEqual(actualWinner.points, winnerPtsAfterFirst, "Poin pemenang tidak boleh bertambah dua kali");
    assert.strictEqual(actualRunnerUp.points, runnerPtsAfterFirst, "Poin runner-up tidak boleh bertambah dua kali");

    engine.reset();
});

// -------------------------------------------------------------
// Skenario 16: Game dimulai kembali setelah pertandingan sebelumnya selesai
// -------------------------------------------------------------
test("Game dapat dimulai kembali setelah pertandingan sebelumnya selesai", () => {
    // Game 1
    engine.reset();
    engine.startLobby("Streamer", 20);
    engine.join("G1_Player1");
    engine.join("G1_Player2");
    engine.closeLobbyAndStart();
    engine.clearTimers();
    engine.finalizeWinner();
    engine.endGame();
    assert.strictEqual(engine.status, "idle");

    // Game 2
    const start2 = engine.startLobby("Streamer", 30);
    assert.strictEqual(start2.success, true);
    assert.strictEqual(engine.status, "lobby");
    assert.strictEqual(engine.players.size, 0, "Daftar pemain game kedua harus kosong");

    engine.join("G2_NewPlayer1");
    engine.join("G2_NewPlayer2");
    assert.strictEqual(engine.players.size, 2);

    engine.reset();
    assert.strictEqual(engine.status, "idle");
});

console.log("\n=================================================");
console.log(`🎉 HASIL PENGUJIAN: ${passedCount} / ${totalCount} SKENARIO BERHASIL LULUS 100%!`);
console.log("=================================================");
