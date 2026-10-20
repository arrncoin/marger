// overlay/labirin/app.js
// Client-side controller and Canvas renderer for LABIRIN Live Overlay (1080x1920)

(function () {
    "use strict";

    console.log("🎮 LABIRIN Overlay Initializing...");

    // DOM Elements
    const mazeCanvas = document.getElementById("maze-canvas");
    const fxCanvas = document.getElementById("fx-canvas");
    const mazeCtx = mazeCanvas ? mazeCanvas.getContext("2d") : null;
    const fxCtx = fxCanvas ? fxCanvas.getContext("2d") : null;

    const statusBadge = document.getElementById("status-badge");
    const statPlayers = document.getElementById("stat-players");
    const statTimer = document.getElementById("stat-timer");
    const statFinished = document.getElementById("stat-finished");

    const lobbyBanner = document.getElementById("lobby-banner");
    const lobbyTimerVal = document.getElementById("lobby-timer-val");
    const countdownBanner = document.getElementById("countdown-banner");
    const countdownNumberVal = document.getElementById("countdown-number-val");
    const idleScreen = document.getElementById("idle-screen");

    const leaderboardList = document.getElementById("leaderboard-list");
    const lbCountLabel = document.getElementById("lb-count-label");

    const winnerModal = document.getElementById("winner-modal");
    const winnerName = document.getElementById("winner-name");
    const winnerTime = document.getElementById("winner-time");
    const winnerMoves = document.getElementById("winner-moves");
    const winnerPoints = document.getElementById("winner-points");
    const winnerGlow = document.getElementById("winner-glow");

    let currentState = null;
    let pollInterval = null;
    let confettiParticles = [];
    let animationFrameId = null;

    // Distinct Avatar Colors for Players
    const AVATAR_PALETTE = [
        "#00f2fe", "#4facfe", "#ff007f", "#00ff88", "#ffaa00",
        "#9d4edd", "#ff3366", "#38ef7d", "#f12711", "#f5af19",
        "#7000ff", "#00d2ff", "#ff758c", "#a8ff78", "#78ffd6"
    ];

    function getPlayerColor(username) {
        if (!username) return "#00f2fe";
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % AVATAR_PALETTE.length;
        return AVATAR_PALETTE[index];
    }

    // =========================================================================
    // 1. DATA POLLING & FETCHING
    // =========================================================================
    async function fetchState() {
        try {
            const res = await fetch("/api/labirin/state?t=" + Date.now());
            if (!res.ok) return;
            const data = await res.json();
            currentState = data;
            render(data);
        } catch (err) {
            console.warn("⚠️ [LABIRIN] Poll error:", err.message);
        }
    }

    function startPolling() {
        if (pollInterval) clearInterval(pollInterval);
        fetchState();
        pollInterval = setInterval(fetchState, 300); // 300ms responsive polling
    }

    // =========================================================================
    // 2. MAIN RENDER FUNCTION
    // =========================================================================
    function render(state) {
        if (!state) return;

        const { status, totalPlayers, finishersCount, elapsedSeconds, countdown, winner, leaderboard } = state;

        // 2.1 Update Top Stats
        if (statPlayers) statPlayers.textContent = totalPlayers || 0;
        if (statFinished) statFinished.textContent = finishersCount || 0;
        if (statTimer) {
            statTimer.textContent = `${Number(elapsedSeconds || 0).toFixed(1)}s`;
        }

        // 2.2 Status Badge
        if (statusBadge) {
            statusBadge.className = `status-badge badge-${status || "idle"}`;
            statusBadge.textContent = (status || "IDLE").toUpperCase();
        }

        // 2.3 Banner Overlays
        if (status === "idle") {
            if (idleScreen) idleScreen.classList.remove("hidden");
            if (lobbyBanner) lobbyBanner.classList.add("hidden");
            if (countdownBanner) countdownBanner.classList.add("hidden");
            if (winnerModal) winnerModal.classList.add("hidden");
            if (winnerGlow) winnerGlow.classList.add("hidden");
        } else if (status === "lobby") {
            if (idleScreen) idleScreen.classList.add("hidden");
            if (lobbyBanner) lobbyBanner.classList.remove("hidden");
            if (countdownBanner) countdownBanner.classList.add("hidden");
            if (lobbyTimerVal) lobbyTimerVal.textContent = countdown || 0;
            if (winnerModal) winnerModal.classList.add("hidden");
        } else if (status === "countdown") {
            if (idleScreen) idleScreen.classList.add("hidden");
            if (lobbyBanner) lobbyBanner.classList.add("hidden");
            if (countdownBanner) countdownBanner.classList.remove("hidden");
            if (countdownNumberVal) countdownNumberVal.textContent = countdown || 0;
            if (winnerModal) winnerModal.classList.add("hidden");
        } else if (status === "playing") {
            if (idleScreen) idleScreen.classList.add("hidden");
            if (lobbyBanner) lobbyBanner.classList.add("hidden");
            if (countdownBanner) countdownBanner.classList.add("hidden");
            if (winnerModal) winnerModal.classList.add("hidden");
        } else if (status === "finished") {
            if (idleScreen) idleScreen.classList.add("hidden");
            if (lobbyBanner) lobbyBanner.classList.add("hidden");
            if (countdownBanner) countdownBanner.classList.add("hidden");
        }

        // 2.4 Render Winner Modal
        if (winner && (status === "playing" || status === "finished")) {
            if (winnerModal) winnerModal.classList.remove("hidden");
            if (winnerGlow) winnerGlow.classList.remove("hidden");
            if (winnerName) winnerName.textContent = winner.username;
            if (winnerTime) winnerTime.textContent = `${winner.time}s`;
            if (winnerMoves) winnerMoves.textContent = `${winner.moves} langkah`;
            if (winnerPoints) winnerPoints.textContent = `+${winner.points || 50} POIN`;
            triggerConfetti();
        }

        // 2.5 Render Leaderboard
        renderLeaderboard(leaderboard, finishersCount);

        // 2.6 Render Maze & Players Canvas
        renderMaze(state);
    }

    // =========================================================================
    // 3. LEADERBOARD RENDER
    // =========================================================================
    function renderLeaderboard(list, finishersCount) {
        if (!leaderboardList) return;

        if (lbCountLabel) {
            lbCountLabel.textContent = `${finishersCount || 0} Selesai`;
        }

        if (!list || list.length === 0) {
            leaderboardList.innerHTML = `<div class="empty-lb">Belum ada pemain yang berhasil mencapai jalan keluar (EXIT).</div>`;
            return;
        }

        let html = "";
        list.slice(0, 5).forEach((p, idx) => {
            const medal = idx === 0 
                ? '<react-icon name="FaTrophy" color="#ffd166"></react-icon>' 
                : idx === 1 
                ? '<react-icon name="FaMedal" color="#cbd5e1"></react-icon>' 
                : idx === 2 
                ? '<react-icon name="FaMedal" color="#cd7f32"></react-icon>' 
                : `${idx + 1}.`;
            const isFirst = idx === 0 ? "first" : "";
            html += `
                <div class="lb-item ${isFirst}">
                    <div class="lb-left">
                        <span class="lb-rank">${medal}</span>
                        <span class="lb-username">${escapeHtml(p.username)}</span>
                    </div>
                    <div class="lb-right">
                        <span>${p.moveCount} steps</span>
                        <span class="lb-time">${p.finishTime}s</span>
                    </div>
                </div>
            `;
        });

        leaderboardList.innerHTML = html;
        if (window.ReactIcons && window.ReactIcons.renderAll) {
            window.ReactIcons.renderAll(leaderboardList);
        }
    }

    function escapeHtml(str) {
        return String(str || "").replace(/[&<>"']/g, (m) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[m]));
    }

    // =========================================================================
    // 4. MAZE CANVAS RENDERING
    // =========================================================================
    function renderMaze(state) {
        if (!mazeCtx || !mazeCanvas) return;
        const { maze, players, status } = state;

        const cw = mazeCanvas.width;
        const ch = mazeCanvas.height;

        mazeCtx.clearRect(0, 0, cw, ch);

        if (!maze || !maze.grid) {
            // Gambar latar grid kosong
            mazeCtx.fillStyle = "#090d16";
            mazeCtx.fillRect(0, 0, cw, ch);
            return;
        }

        const grid = maze.grid;
        const cols = grid[0].length;
        const rows = grid.length;
        const cellSize = Math.min(cw / cols, ch / rows);
        const offsetX = (cw - cols * cellSize) / 2;
        const offsetY = (ch - rows * cellSize) / 2;

        // 4.1 Gambar Sel Path & Wall
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = grid[r][c];
                const x = offsetX + c * cellSize;
                const y = offsetY + r * cellSize;

                if (cell === 1) {
                    // WALL
                    mazeCtx.fillStyle = "#1e293b";
                    mazeCtx.fillRect(x, y, cellSize, cellSize);
                    mazeCtx.strokeStyle = "rgba(51, 65, 85, 0.4)";
                    mazeCtx.lineWidth = 1;
                    mazeCtx.strokeRect(x, y, cellSize, cellSize);
                } else {
                    // PATH
                    mazeCtx.fillStyle = "#0c1322";
                    mazeCtx.fillRect(x, y, cellSize, cellSize);
                }
            }
        }

        // 4.2 Gambar Sel START
        if (maze.start) {
            const sx = offsetX + maze.start.x * cellSize;
            const sy = offsetY + maze.start.y * cellSize;

            mazeCtx.fillStyle = "rgba(0, 242, 254, 0.25)";
            mazeCtx.fillRect(sx, sy, cellSize, cellSize);

            mazeCtx.strokeStyle = "#00f2fe";
            mazeCtx.lineWidth = 2;
            mazeCtx.strokeRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4);

            // Label START jika cell cukup besar
            if (cellSize >= 20) {
                mazeCtx.font = `bold ${Math.max(10, Math.floor(cellSize * 0.35))}px 'JetBrains Mono'`;
                mazeCtx.fillStyle = "#00f2fe";
                mazeCtx.textAlign = "center";
                mazeCtx.textBaseline = "middle";
                mazeCtx.fillText("IN", sx + cellSize / 2, sy + cellSize / 2);
            }
        }

        // 4.3 Gambar Sel EXIT
        if (maze.exit) {
            const ex = offsetX + maze.exit.x * cellSize;
            const ey = offsetY + maze.exit.y * cellSize;

            // Efek Pulse Glow untuk EXIT
            const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
            mazeCtx.fillStyle = `rgba(255, 209, 102, ${0.3 + pulse * 0.3})`;
            mazeCtx.fillRect(ex, ey, cellSize, cellSize);

            mazeCtx.strokeStyle = "#ffd166";
            mazeCtx.lineWidth = 3;
            mazeCtx.strokeRect(ex + 1, ey + 1, cellSize - 2, cellSize - 2);

            // Icon / Text EXIT
            mazeCtx.font = `bold ${Math.max(11, Math.floor(cellSize * 0.45))}px 'Rajdhani'`;
            mazeCtx.fillStyle = "#ffd166";
            mazeCtx.textAlign = "center";
            mazeCtx.textBaseline = "middle";
            mazeCtx.fillText("EXIT", ex + cellSize / 2, ey + cellSize / 2);
        }

        // 4.4 Gambar Players
        if (players && players.length > 0) {
            const radius = Math.max(3, cellSize * 0.38);

            players.forEach((p) => {
                const px = offsetX + p.x * cellSize + cellSize / 2;
                const py = offsetY + p.y * cellSize + cellSize / 2;
                const color = getPlayerColor(p.username);

                // Body Avatar
                mazeCtx.beginPath();
                mazeCtx.arc(px, py, radius, 0, Math.PI * 2);
                mazeCtx.fillStyle = color;
                mazeCtx.shadowColor = color;
                mazeCtx.shadowBlur = 10;
                mazeCtx.fill();
                mazeCtx.shadowBlur = 0; // reset

                // Border
                mazeCtx.strokeStyle = "#ffffff";
                mazeCtx.lineWidth = 1.5;
                mazeCtx.stroke();

                // Username Label di atas karakter
                if (cellSize >= 16) {
                    mazeCtx.font = `bold ${Math.max(9, Math.floor(cellSize * 0.3))}px 'Plus Jakarta Sans'`;
                    mazeCtx.fillStyle = "#ffffff";
                    mazeCtx.textAlign = "center";
                    mazeCtx.textBaseline = "bottom";
                    const shortName = p.username.length > 8 ? p.username.substring(0, 7) + "…" : p.username;
                    mazeCtx.fillText(shortName, px, py - radius - 2);
                }
            });
        }
    }

    // =========================================================================
    // 5. CONFETTI PARTICLES FX
    // =========================================================================
    function triggerConfetti() {
        if (confettiParticles.length > 0) return; // sudah jalan

        for (let i = 0; i < 150; i++) {
            confettiParticles.push({
                x: Math.random() * 1080,
                y: -20 - Math.random() * 200,
                vx: (Math.random() - 0.5) * 6,
                vy: 4 + Math.random() * 8,
                size: 8 + Math.random() * 12,
                color: AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10
            });
        }
    }

    function animateFX() {
        if (fxCtx && fxCanvas) {
            fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

            if (confettiParticles.length > 0) {
                confettiParticles.forEach((p, index) => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.rotation += p.rotSpeed;

                    fxCtx.save();
                    fxCtx.translate(p.x, p.y);
                    fxCtx.rotate((p.rotation * Math.PI) / 180);
                    fxCtx.fillStyle = p.color;
                    fxCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    fxCtx.restore();

                    // Hapus jika sudah melewati bawah layar
                    if (p.y > 1940) {
                        confettiParticles.splice(index, 1);
                    }
                });
            }
        }

        animationFrameId = requestAnimationFrame(animateFX);
    }

    // =========================================================================
    // 6. INITIALIZATION & EXPORT
    // =========================================================================
    startPolling();
    animateFX();

    // Global Export for Overlay Router
    window.LabirinOverlay = {
        init() {
            console.log("LabirinOverlay mounted.");
            startPolling();
        },
        destroy() {
            if (pollInterval) clearInterval(pollInterval);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            confettiParticles = [];
        }
    };
})();
