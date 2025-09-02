import { Router } from 'express';
import { PublicGameController } from './publicGameController';
import { GameService } from '../services/gameService';

export function publicGameRouter(gameService: GameService): Router {
    const router = Router();
    const publicGameController = new PublicGameController(gameService);
    router.post('/playerRegister', publicGameController.playerRegister); //recebe query strings
    router.get('/getPlayer', publicGameController.getPlayer);
    router.get('/health', publicGameController.health);
    router.get('/activeGames', publicGameController.activeGames);
    router.get('/activePlayers/:codeRoom', publicGameController.activePlayers);
    router.get('/playersRegistered', publicGameController.players);
    return router;
}