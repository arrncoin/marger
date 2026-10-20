// src/features/game/labirin/MazeGenerator.js
// High-performance, Guaranteed-Solvable Randomized Grid Maze Generator
const crypto = require("crypto");

class MazeGenerator {
    /**
     * Generate dynamic maze grid with guaranteed path from START to EXIT
     * @param {number} [requestedSize=21] - Must be odd (e.g. 15, 21, 25)
     */
    static generate(requestedSize = 21) {
        let size = Number(requestedSize) || 21;
        // Pastikan ukuran ganjil antara 15 dan 29
        if (size % 2 === 0) size += 1;
        size = Math.max(15, Math.min(29, size));

        const width = size;
        const height = size;

        // Inisialisasi grid penuh dinding (1 = wall, 0 = path)
        const grid = Array.from({ length: height }, () => Array(width).fill(1));

        // Start di (1, 1), Exit di (width - 2, height - 2)
        const start = { x: 1, y: 1 };
        const exit = { x: width - 2, y: height - 2 };

        // Iterative Randomized DFS Backtracker (bebas stack overflow)
        const stack = [{ x: start.x, y: start.y }];
        grid[start.y][start.x] = 0;

        const directions = [
            { dx: 0, dy: -2 }, // Atas
            { dx: 0, dy: 2 },  // Bawah
            { dx: -2, dy: 0 }, // Kiri
            { dx: 2, dy: 0 }   // Kanan
        ];

        while (stack.length > 0) {
            const current = stack[stack.length - 1];

            // Acak urutan arah secara adil
            const shuffledDirs = [...directions];
            for (let i = shuffledDirs.length - 1; i > 0; i--) {
                const j = crypto.randomInt(0, i + 1);
                [shuffledDirs[i], shuffledDirs[j]] = [shuffledDirs[j], shuffledDirs[i]];
            }

            let foundNext = false;

            for (const dir of shuffledDirs) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;

                // Pastikan berada di dalam batas interior maze
                if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && grid[ny][nx] === 1) {
                    // Bobok dinding perantara
                    grid[current.y + dir.dy / 2][current.x + dir.dx / 2] = 0;
                    // Buka sel tujuan
                    grid[ny][nx] = 0;
                    stack.push({ x: nx, y: ny });
                    foundNext = true;
                    break;
                }
            }

            if (!foundNext) {
                stack.pop();
            }
        }

        // Buka exit dan jalur sekitarnya
        grid[exit.y][exit.x] = 0;
        grid[start.y][start.x] = 0;

        // Buat beberapa loop jalur tambahan (braiding 6%) agar balapan multiplayer lebih seru
        for (let y = 2; y < height - 2; y += 2) {
            for (let x = 2; x < width - 2; x += 2) {
                if (grid[y][x] === 1 && crypto.randomInt(0, 100) < 8) {
                    // Cek jika membuka sel ini menghubungkan dua koridor
                    const horizontalOpen = grid[y][x - 1] === 0 && grid[y][x + 1] === 0;
                    const verticalOpen = grid[y - 1][x] === 0 && grid[y + 1][x] === 0;
                    if (horizontalOpen || verticalOpen) {
                        grid[y][x] = 0;
                    }
                }
            }
        }

        // Validasi jalur terselesaikan dengan BFS Solver
        const shortestPath = MazeGenerator._solveBFS(grid, start, exit, width, height);

        if (!shortestPath || shortestPath.length === 0) {
            // Fallback emergency: bobok jalur langsung jika isolasi langka terjadi
            MazeGenerator._carveEmergencyPath(grid, start, exit);
        }

        const pathLength = shortestPath ? shortestPath.length : Math.abs(exit.x - start.x) + Math.abs(exit.y - start.y);

        return {
            width,
            height,
            grid,
            start,
            exit,
            shortestPathLength: pathLength
        };
    }

    /**
     * Breadth-First Search untuk memverifikasi jalur & panjang langkah minimum
     */
    static _solveBFS(grid, start, exit, width, height) {
        const queue = [[start]];
        const visited = Array.from({ length: height }, () => Array(width).fill(false));
        visited[start.y][start.x] = true;

        const dirs = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        while (queue.length > 0) {
            const path = queue.shift();
            const curr = path[path.length - 1];

            if (curr.x === exit.x && curr.y === exit.y) {
                return path;
            }

            for (const d of dirs) {
                const nx = curr.x + d.dx;
                const ny = curr.y + d.dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx] === 0 && !visited[ny][nx]) {
                    visited[ny][nx] = true;
                    queue.push([...path, { x: nx, y: ny }]);
                }
            }
        }

        return null;
    }

    /**
     * Fallback emergency jaminan 100% koridor tembus
     */
    static _carveEmergencyPath(grid, start, exit) {
        let cx = start.x;
        let cy = start.y;
        while (cx !== exit.x) {
            grid[cy][cx] = 0;
            cx += cx < exit.x ? 1 : -1;
        }
        while (cy !== exit.y) {
            grid[cy][cx] = 0;
            cy += cy < exit.y ? 1 : -1;
        }
        grid[exit.y][exit.x] = 0;
    }
}

module.exports = MazeGenerator;
