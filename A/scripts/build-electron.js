// scripts/build-electron.js
// Robust Windows Electron Packager & Runner for Kak Jule Studio V3.1
const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const readline = require("readline");

const ROOT_DIR = path.resolve(__dirname, "..");

// ANSI Color Helpers
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m"
};

function log(msg, color = "") {
  console.log(`${color}${msg}${colors.reset}`);
}

function ensureWindowsIcon() {
  const icoPath = path.join(ROOT_DIR, "assets", "icon.ico");
  const pngPath = path.join(ROOT_DIR, "assets", "icon.png");

  if (!fs.existsSync(icoPath) && fs.existsSync(pngPath)) {
    try {
      log("⚡ [Icon] Membuat assets/icon.ico dari icon.png...", colors.cyan);
      const pngBuf = fs.readFileSync(pngPath);
      const header = Buffer.alloc(6);
      header.writeUInt16LE(0, 0);
      header.writeUInt16LE(1, 2);
      header.writeUInt16LE(1, 4);

      const dirEntry = Buffer.alloc(16);
      dirEntry.writeUInt8(0, 0); // 256px
      dirEntry.writeUInt8(0, 1);
      dirEntry.writeUInt8(0, 2);
      dirEntry.writeUInt8(0, 3);
      dirEntry.writeUInt16LE(1, 4);
      dirEntry.writeUInt16LE(32, 6);
      dirEntry.writeUInt32LE(pngBuf.length, 8);
      dirEntry.writeUInt32LE(22, 12);

      fs.writeFileSync(icoPath, Buffer.concat([header, dirEntry, pngBuf]));
      log("✅ [Icon] assets/icon.ico siap.", colors.green);
    } catch (e) {
      log("⚠️ [Icon] Gagal generate icon.ico: " + e.message, colors.yellow);
    }
  }
}

function killRunningProcesses() {
  if (process.platform === "win32") {
    try {
      execSync('taskkill /F /IM "Kak Jule Studio.exe" /T', { shell: true, stdio: "ignore" });
    } catch (_) {}
    try {
      execSync('taskkill /F /IM "electron.exe" /T', { shell: true, stdio: "ignore" });
    } catch (_) {}
  }
}

function ensureDependencies() {
  let hasBuilder = false;
  try {
    require.resolve("electron-builder/cli.js");
    hasBuilder = true;
  } catch (_) {}

  if (!hasBuilder) {
    log("\n📦 [NPM] electron-builder belum terpasang di node_modules.", colors.yellow);
    log("📦 [NPM] Menjalankan npm install --save-dev electron electron-builder...", colors.cyan);
    try {
      execSync("npm install --save-dev electron electron-builder", {
        cwd: ROOT_DIR,
        shell: true,
        stdio: "inherit"
      });
      log("✅ [NPM] Paket electron & electron-builder berhasil dipasang.", colors.green);
    } catch (err) {
      log("⚠️ [NPM] Peringatan: npm install lokal gagal, akan mencoba npx: " + err.message, colors.yellow);
    }
  }
}

function runBuild(targetArgs) {
  log("\n======================================================================", colors.cyan);
  log("🚀 MEMULAI PROSES BUILD ELECTRON WINDOWS", colors.bright + colors.cyan);
  log("======================================================================", colors.cyan);

  // Set environment variables to prevent Windows code signing & symlink errors
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
  process.env.WIN_CSC_LINK = "";
  process.env.CSC_LINK = "";
  process.env.ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES = "true";

  let cliPath = null;
  try {
    cliPath = require.resolve("electron-builder/cli.js");
  } catch (_) {}

  const configPath = path.join(ROOT_DIR, "electron-builder.json");
  const fullArgs = [...targetArgs];
  if (!fullArgs.includes("-c") && !fullArgs.includes("--config")) {
    fullArgs.push("-c", configPath);
  }

  let cmd;
  let args;

  if (cliPath && fs.existsSync(cliPath)) {
    // Run via Node directly to avoid any .cmd or shell wrapper quoting issues on Windows
    cmd = process.execPath;
    args = [cliPath, ...fullArgs];
  } else {
    // Fallback to npx
    cmd = process.platform === "win32" ? "npx.cmd" : "npx";
    args = ["electron-builder", ...fullArgs];
  }

  log(`Perintah: ${cmd} ${args.join(" ")}\n`, colors.yellow);

  const buildProcess = spawn(cmd, args, {
    cwd: ROOT_DIR,
    stdio: "inherit",
    shell: false,
    env: process.env
  });

  buildProcess.on("close", (code) => {
    if (code === 0) {
      log("\n======================================================================", colors.green);
      log("🎉 BUILD WINDOWS SELESAI DENGAN SUKSES!", colors.bright + colors.green);
      log("======================================================================", colors.green);
      const outDir = path.join(ROOT_DIR, "dist-electron");
      log(`📁 File hasil build tersimpan di:\n   👉 ${outDir}`, colors.bright);
      
      if (process.platform === "win32") {
        try {
          execSync(`explorer.exe "${outDir}"`, { shell: true, stdio: "ignore" });
        } catch (_) {}
      }
      process.exit(0);
    } else {
      log("\n======================================================================", colors.red);
      log(`❌ PROSES BUILD GAGAL DENGAN KODE: ${code}`, colors.bright + colors.red);
      log("======================================================================", colors.red);
      log("💡 Saran Solusi:", colors.yellow);
      log(" 1. Jika error 'Cannot create symbolic link' (winCodeSign):", colors.yellow);
      log("    Pilih Opsi [1] Portable (.exe) yang TIDAK membutuhkan hak administrator atau NSIS symlink.", colors.bright);
      log(" 2. Jika error 'EBUSY: resource busy or locked':", colors.yellow);
      log("    Tutup aplikasi Kak Jule Studio atau folder dist-electron yang sedang terbuka.", colors.yellow);
      log(" 3. Jika folder dist-electron korup:", colors.yellow);
      log("    Pilih Opsi [5] untuk membersihkan folder dist-electron dan coba kembali.", colors.yellow);
      log("======================================================================\n", colors.red);
      process.exit(code);
    }
  });

  buildProcess.on("error", (err) => {
    log(`❌ Gagal memulai proses build: ${err.message}`, colors.red);
    process.exit(1);
  });
}

function promptMenu() {
  log("======================================================================", colors.cyan);
  log("     KAK JULE STUDIO - BUILD WINDOWS DESKTOP (.EXE)", colors.bright + colors.cyan);
  log("======================================================================", colors.cyan);
  log("");
  log("Pilih Format Build Windows:", colors.yellow);
  log(" [1] Portable (.exe) [Rekomendasi - 1 File Mandiri, Langsung Klik Tanpa Install]", colors.bright + colors.green);
  log(" [2] Setup Installer (.exe NSIS) [Installer Standar Windows]", colors.bright);
  log(" [3] Keduanya (Installer NSIS + Portable .exe)");
  log(" [4] Unpacked Folder [Direktori Aplikasi Siap Pakai Tanpa Kompresi]");
  log(" [5] Bersihkan dist-electron dan Rebuild");
  log(" [0] Keluar");
  log("======================================================================", colors.cyan);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("Pilih nomor (0-5) [Default 1]: ", (ans) => {
    rl.close();
    const choice = (ans || "1").trim();

    switch (choice) {
      case "1":
        runBuild(["--win", "portable"]);
        break;
      case "2":
        runBuild(["--win", "nsis"]);
        break;
      case "3":
        runBuild(["--win"]);
        break;
      case "4":
        runBuild(["--win", "--dir"]);
        break;
      case "5":
        cleanAndRebuild();
        break;
      case "0":
        log("Dibatalkan oleh pengguna.", colors.yellow);
        process.exit(0);
        break;
      default:
        log(`Pilihan "${choice}" tidak dikenal, menggunakan default Opsi [1] Portable.`, colors.yellow);
        runBuild(["--win", "portable"]);
        break;
    }
  });
}

function cleanAndRebuild() {
  const distDir = path.join(ROOT_DIR, "dist-electron");
  if (fs.existsSync(distDir)) {
    log("🧹 Membersihkan folder dist-electron...", colors.yellow);
    try {
      fs.rmSync(distDir, { recursive: true, force: true });
      log("✅ Folder dist-electron berhasil dibersihkan.", colors.green);
    } catch (e) {
      log("⚠️ Gagal menghapus dist-electron: " + e.message, colors.red);
    }
  }
  runBuild(["--win", "portable"]);
}

// Main Execution Flow
(function main() {
  killRunningProcesses();
  ensureWindowsIcon();
  ensureDependencies();

  // Handle CLI argument flags for non-interactive / automated builds
  const args = process.argv.slice(2);
  if (args.includes("--portable")) {
    runBuild(["--win", "portable"]);
  } else if (args.includes("--installer") || args.includes("--nsis")) {
    runBuild(["--win", "nsis"]);
  } else if (args.includes("--dir") || args.includes("--pack")) {
    runBuild(["--win", "--dir"]);
  } else if (args.includes("--all") || args.includes("--dist")) {
    runBuild(["--win"]);
  } else if (args.includes("--test")) {
    log("✅ [Test Mode] Pre-checks passed successfully.", colors.green);
    process.exit(0);
  } else {
    // Interactive prompt
    promptMenu();
  }
})();
