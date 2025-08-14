import { Router } from 'express';
import { GameRoute } from './privateGameRoutes';
import { GameController } from '../controllers/gameController';


export function privateGameRouter(gameController: GameController): Router{
    const router = Router();

    const privateGameRouter = new GameRoute(gameController);
    
    router.post('/createGame', privateGameRouter.createGame);
    router.post('/games/join', privateGameRouter.joinGame); // Rota mais RESTful
    router.post('/gameExists/:gameId',  privateGameRouter.gameExists);
    router.delete('/games/:gameId',  privateGameRouter.deleteGame);
    return router;
}