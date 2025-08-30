import { Router } from 'express';
import { GameRoute } from './privateGameController';
import { GameService } from '../services/gameService';


export function privateGameRouter(gameService: GameService): Router{
    const router = Router();
    const privateGameRouter = new GameRoute(gameService);
    router.post('/createGame', privateGameRouter.createGame);
    router.post('/games/join', privateGameRouter.joinGame); // Rota mais RESTful
    router.post('/gameExists/:gameId',  privateGameRouter.gameExists);
    router.delete('/games/:gameId',  privateGameRouter.deleteGame);
    return router;
}