// src/features/game/labirin/index.js
// Modular entry point for LABIRIN Maze Race Game

const game = require("./LabirinGame");
const storage = require("./storage");
const MazeGenerator = require("./MazeGenerator");
const PlayerManager = require("./PlayerManager");
const config = require("./config");
const EVENTS = require("./events");

module.exports = {
    game,
    storage,
    MazeGenerator,
    PlayerManager,
    config,
    EVENTS
};
