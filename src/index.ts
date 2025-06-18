import express from 'express';
import cors, { CorsOptions } from 'cors';
import http from 'http';
import {Server} from 'socket.io';
import gameRoutes from './router/privateGameRoutes';

import { GameManager } from './gameManager';
import * as gameController from './router/gameController'

import 'dotenv/config';
import  {publicRouter, publicRoutersetInstance}  from './router/publicRoutes';

// Extend Socket type to include username property
declare module 'socket.io' {
  interface Socket {
    playerID: string;
    gameID:string;
  }
}

const app: express.Application = express();

app.use(publicRouter);

const allowedOrigins = [
  'https://chess-front-eight.vercel.app',
  'https://chess-front-git-develop-gabrielzerios-projects.vercel.app'
];

if(process.env.NODE_ENV === "development"){
  allowedOrigins.push('http://localhost:5173');
  allowedOrigins.push('http://127.0.0.1:5173');
  allowedOrigins.push('https://localhost:5173'); 
  allowedOrigins.push('https://127.0.0.1:5173');
  // allowedOrigins.push('http://192.168.0.171:5173');
  allowedOrigins.push('http://192.168.0.171:5173');
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
  credentials:true
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
app.use((req, res, next):any =>{ //middleware de joinGame precisa obrigatoriamente de gameID e nome(mid acima)
  if(req.method === 'POST' && req.path === '/joinGame'){
    const gameID = req.body?.gameID;

    if(!gameID){
      return res.status(400).json({"error":"Game ID is required to join in game"});
    }
  }
  next();
})
app.use(gameRoutes);


const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

const gameManager = new GameManager(io);

io.use((socket, next) => {
  const {playerID, gameID} = socket.handshake.auth;
  socket.playerID = playerID;
  socket.gameID = gameID;
  if(!socket.playerID || !socket.gameID)
    return;
    next();
})


gameController.setGameManager(gameManager);
publicRoutersetInstance(gameManager)
 io.on('connection', (socket) => {
    gameManager.handleSocketConnection(socket); // Delega o socket para o GameManager
});

server.listen(3001, () => console.log('API e WebSocket rodando na porta 3001'));
