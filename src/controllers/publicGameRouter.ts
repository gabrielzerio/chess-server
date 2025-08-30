import { Router } from 'express';
import { activeGames, activePlayers, health, playerRegister, publicRoutersetInstance, players } from './publicGameController';
import { GameService } from '../services/gameService';
 
export function publicGameRouter(gameService: GameService): Router{
    const router = Router();
    publicRoutersetInstance(gameService);
    router.post('/playerRegister', playerRegister); //recebe query strings
    router.get('/health', health);
    router.get('/activeGames', activeGames);
    router.get('/activePlayers/:codeRoom', activePlayers);
    router.get('/playersRegistered', players);
    return router;
}