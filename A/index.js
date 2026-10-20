// index.js — Kak Jule V3.1 (MODULAR LIVE STREAM BOT & OVERLAY)
if (process.versions && process.versions.electron && process.env.KAK_JULE_LAUNCH_MODE !== "desktop") {
    require("./electron/main.js");
} else {
    const { startServer } = require("./src/app/bootstrap");
    const instance = startServer();
    module.exports = instance;
}
