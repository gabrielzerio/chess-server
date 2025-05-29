import express, {Request, Response} from 'express';
import cors from 'cors';
import http from 'http';
import {Server} from 'socket.io';
import gameRoutes from './router/gameRoutes';
import { GameManager } from './gameManager';
import * as gameController from './router/gameController'
import { randomUUID } from 'crypto';

// Extend Socket type to include username property
declare module 'socket.io' {
  interface Socket {
    playerID: string;
    gameID:string;
  }
}

const app: express.Application = express();

app.use(express.json());
app.use(cors());
app.use((req, res, next):any => { //independente da rota precisa de um userName
  const playerName = req.body?.playerName;
  
  if(!playerName){
    return res.status(400).json({"error":"Player name is required"});
  }
  next();
})
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
  cors: { origin: '*' }
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

 io.on('connection', (socket) => {
    gameManager.handleSocketConnection(socket); // Delega o socket para o GameManager
});

server.listen(3001, () => console.log('API e WebSocket rodando na porta 3001'));
