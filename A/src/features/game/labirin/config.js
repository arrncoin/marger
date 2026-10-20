// src/features/game/labirin/config.js
// Centralized configuration for LABIRIN Maze Race Game

module.exports = {
    DEFAULT_SIZE: 21, // 21x21 grid
    MIN_SIZE: 15,
    MAX_SIZE: 29,

    LOBBY_DURATION_SECONDS: 20, // Waktu pendaftaran sebelum balapan dimulai
    COUNTDOWN_SECONDS: 3,       // 3... 2... 1... GO!
    GAME_TIMEOUT_SECONDS: 300,  // Batas maksimal waktu perlombaan (5 menit)

    MOVE_COOLDOWN_MS: 140,      // Anti-spam 140ms per gerakan (responsif namun aman)

    POINTS: {
        JOIN: 10,
        FINISH: 100,
        TOP_3: 300,
        RUNNER_UP: 500,
        WINNER: 1000
    },

    PLAYER_COLORS: [
        "#06b6d4", // Cyan
        "#ec4899", // Pink
        "#10b981", // Emerald
        "#f59e0b", // Amber
        "#8b5cf6", // Purple
        "#3b82f6", // Blue
        "#ef4444", // Red
        "#14b8a6", // Teal
        "#f97316", // Orange
        "#84cc16", // Lime
        "#e11d48", // Rose
        "#a855f7"  // Violet
    ],

    PLAYER_AVATARS: [
        "🏃", "🦊", "🐱", "🤖", "🚀", "⚡", "🐯", "🐼", 
        "🦁", "🐸", "👾", "🏎️", "🐺", "🥷", "🦄", "🎯"
    ]
};
