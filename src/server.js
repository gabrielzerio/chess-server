"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var app = (0, express_1.default)();
app.use(express_1.default.json());
var games = {}; // Simples armazenamento em memória
app.post('/games', function (req, res) {
    var gameId = Math.random().toString(36).substr(2, 9);
    games[gameId] = { players: [], state: { /* ...estado inicial... */} };
    res.json({ gameId: gameId });
});
app.post('/games/:gameId/join', function (req, res) {
    var gameId = req.params.gameId;
    var playerName = req.body.playerName;
    if (!games[gameId])
        return res.status(404).json({ error: 'Game not found' });
    games[gameId].players.push(playerName);
    res.json({ success: true });
});
// ...outras rotas...
app.listen(3001, function () { return console.log('API rodando na porta 3001'); });
