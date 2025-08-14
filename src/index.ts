import express from 'express';
import cors, { CorsOptions } from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { privateGameRouter } from './routes/privateGameRouter';
import { GameController } from './controllers/gameController';
import { publicGameRouter } from './routes/publicGameRouter';

import 'dotenv/config';

// Extend Socket type to include username property
declare module 'socket.io' {
  interface Socket {
    playerId: string;
    gameID: string;
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
app.use((req, res, next): any => { //middleware de joinGame precisa obrigatoriamente de gameID e nome(mid acima)
  if (req.method === 'POST' && req.path.startsWith('/games')) {
    const gameId = req.query?.gameId;
    const playerId = req.body?.playerId;
    console.log(req.query.gameId);
    if (!gameId) {
      return res.status(400).json({ "error": "Game Id is required to join in game" });
    }
    if (!playerId) {
      return res.status(400).json({ "error": "Player Id is required to join in game" });
    }
  }
  next();
})

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

const gameController = new GameController(io);

app.use(privateGameRouter(gameController));
app.use(publicGameRouter(gameController));

io.use((socket, next) => {
  const { playerId, gameID } = socket.handshake.auth;
  socket.playerId = playerId;
  socket.gameID = gameID;
  if (!socket.playerId || !socket.gameID) {
    return;
  }
  next();
})

io.on('connection', (socket) => {
  gameController.handleSocketConnection(socket); // Delega o socket para o GameManager
});

server.listen(3001, () => console.log('API e WebSocket rodando na porta 3001'));
