import express, {Request, Response} from 'express';
import cors from 'cors';
import http from 'http';
import {Server} from 'socket.io';
import gameRoutes from './router/gameRoutes';
import { GameManager } from './gameManager';
import * as gameController from './router/gameController'

const app: express.Application = express();

app.use(express.json());
app.use(cors());
app.use(gameRoutes);



const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const gameManager = new GameManager(io);
gameController.setGameManager(gameManager);

 io.on('connection', (socket) => {
    gameManager.handleSocketConnection(socket); // Delega o socket para o GameManager
});

server.listen(3001, () => console.log('API e WebSocket rodando na porta 3001'));
