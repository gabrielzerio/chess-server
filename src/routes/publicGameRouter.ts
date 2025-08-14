import { Router } from 'express';
import { activeGames, activePlayers, health, playerRegister, publicRoutersetInstance, players } from './publicRoutes';
import { GameController } from '../controllers/gameController';
 
export function publicGameRouter(gameController: GameController): Router{
    const router = Router();
    publicRoutersetInstance(gameController);
    router.post('/playerRegister', playerRegister); //recebe query strings
    router.get('/health', health);
    router.get('/activeGames', activeGames);
    router.get('/activePlayers/:codeRoom', activePlayers);
    router.get('/playersRegistered', players);
    return router;
}