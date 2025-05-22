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
    userID: string;
    gameID:string;
  }
}

const app: express.Application = express();

app.use(express.json());
app.use(cors());
app.use(gameRoutes);



const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const gameManager = new GameManager(io);

io.use((socket, next) => {
  const {userID, gameID} = socket.handshake.auth;
  if(gameID){
    const game = gameManager.getGame(gameID);
    if(game){
      const player = game.getPlayerByUserID(userID);
      if(player){
        console.log('temgameID')
        socket.gameID = gameID;
        socket.userID = userID;
        return next();
      }
      }
    }
  // socket.gameID = gameManager.createNewGame();
  // socket.userID = randomUUID();
  next(); 
})


gameController.setGameManager(gameManager);

 io.on('connection', (socket) => {
    gameManager.handleSocketConnection(socket); // Delega o socket para o GameManager
});

server.listen(3001, () => console.log('API e WebSocket rodando na porta 3001'));
