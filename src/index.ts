import express, {Request, Response} from 'express';
import cors from 'cors';
import http from 'http';
import {Server, Socket } from 'socket.io';
import gameRoutes from './router/gameRoutes';
import { handleJoin } from './socketHandlers/joinHandler';
import { handleMove } from './socketHandlers/moveHandler';
import { handleDisconnect } from './socketHandlers/disconnetHandler';


const app: express.Application = express();

app.use(express.json());
app.use(cors());
app.use(gameRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

  const onConnection = (socket: Socket) =>{
    handleJoin(io, socket);
    handleMove(io, socket);
    handleDisconnect(io, socket);
  }
  io.on('connection', onConnection);

server.listen(3001, () => console.log('API e WebSocket rodando na porta 3001'));
