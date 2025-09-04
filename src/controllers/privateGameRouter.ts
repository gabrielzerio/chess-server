import { Router } from 'express';
import { GameController } from './privateGameController';
import { GameService } from '../services/gameService';
import { PlayerService } from '../services/playerService';


export function privateGameRouter(gameService: GameService, playerService: PlayerService): Router {
    const router = Router();
    const privateGameRouter = new GameController(gameService, playerService);
    router.post('/games/createGame', privateGameRouter.createGame);
    router.post('/games/join', privateGameRouter.joinGame); // Rota mais RESTful
    router.post('/gameExists/:gameId', privateGameRouter.gameExists);
    // router.delete('/games/:gameId',  privateGameRouter.deleteGame);
    return router;
}