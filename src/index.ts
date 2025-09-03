import express from 'express';
import cors, { CorsOptions } from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { privateGameRouter } from './controllers/privateGameRouter';
import { GameManager } from './manager/GameManager';
import { GameService } from './services/gameService';
import { GameRepository } from './repositories/GameRepository';
import { PlayerRepository } from './repositories/PlayerRepository';
import { publicGameRouter } from './controllers/publicGameRouter';
import { GameSocketHandler } from './sockets/GameSocketHandler';

import 'dotenv/config';
import { NotationManager } from './manager/NotationManager';

// Extend Socket type to include username property
declare module 'socket.io' {
  interface Socket {
    playerId: string;
    gameId: string;
  }
}

const app: express.Application = express();

const allowedOrigins = [
  'https://chess-front-eight.vercel.app',
  'https://chess-front-git-develop-gabrielzerios-projects.vercel.app'
];

if (process.env.NODE_ENV === "hml") {
  allowedOrigins.push('http://localhost:5173');
  allowedOrigins.push('http://127.0.0.1:5173');
  allowedOrigins.push('https://localhost:5173');
  allowedOrigins.push('https://127.0.0.1:5173');
  // allowedOrigins.push('http://192.168.0.171:5173');
  allowedOrigins.push('http://192.168.0.171:5173');
}
if (process.env.NODE_ENV === "prd") {
  console.log('PRD!');
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (Postman, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(express.json());
app.use(cors(corsOptions));
// app.use((req, res, next):any => { //independente da rota precisa de um userName
//   const playerName = req.body?.playerName;
//   if(!playerName){
//     return res.status(400).json({"error":"Player name is required"});
//   }
//   next();
// })
// Instancia repositórios e manager
const gameRepository = new GameRepository();
const playerRepository = new PlayerRepository();
const notationManager = new NotationManager();
const gameManager = new GameManager(gameRepository, playerRepository, notationManager);
const gameService = new GameService(gameManager, gameRepository, playerRepository, notationManager);
// const 
app.use((req, res, next): any => { //middleware de joinGame precisa obrigatoriamente de gameId e nome(mid acima)
  if (req.method === 'POST' && req.path.match('/games/createGame')) {
    const playerId = req.body?.playerId;
    if (!playerId) {
      return res.status(400).json({ "error": "Player Id is required to create or join in game" });
    }

  }
  next();
})

app.use((req, res, next): any => {
  const gameId = req.query?.gameId;
  const playerId = req.body?.playerId;
  if (req.method === 'POST' && req.path.match('/games/join')) {
    if (!gameId) {
      return res.status(400).json({ "error": "Game Id is required to join in game" });
    }
    const game = gameService.gameExists(gameId.toString());
    const gamePlayer = gameService.playerExists(playerId);
    if (!game || !gamePlayer) {
      return res.status(401).json({ "error": "valid playerId and gameId are necessary to join a game" });
    }
  }
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});


app.use(privateGameRouter(gameService));
app.use(publicGameRouter(gameService));

io.use((socket, next) => { //esse middleware valida somente na conexão
  const { playerId, gameId } = socket.handshake.auth;
  socket.playerId = playerId;
  socket.gameId = gameId;
  const game = gameService.gameExists(gameId);
  const gamePlayer = gameService.getGamePlayerById(gameId, playerId);
  if (!game || !gamePlayer) {
    return next(new Error("Unauthorized"));
  }
  next();
});

io.of('/').use((socket, next) => {
  const gameId = socket.gameId;
  const gamePlayerId = socket.playerId;

  const game = gameService.gameExists(gameId);
  const gamePlayer = gameService.getGamePlayerById(gameId, gamePlayerId);

  if (!game || !gamePlayer) {
    return next(new Error("Unauthorized"));
  }
  next();
});

// Integração do GameSocketHandler
const gameSocketHandler = new GameSocketHandler(io, gameService);

io.on('connection', (socket) => {
  gameSocketHandler.registerHandlers(socket);
});

server.listen(3001, () => console.log('API e WebSocket rodando na porta 3001'));
