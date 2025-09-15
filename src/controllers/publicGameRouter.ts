import { Router } from 'express';
import { PublicGameController } from './publicGameController';
import { GameService } from '../services/gameService';
import { PlayerService } from '../services/playerService';

export function publicGameRouter(gameService: GameService, playerService: PlayerService): Router {
    const router = Router();
    const publicGameController = new PublicGameController(gameService, playerService);
    router.post('/playerRegister', publicGameController.playerRegister); //recebe query strings
    router.get('/getPlayer', publicGameController.getPlayer);
    router.get('/health', publicGameController.health);
    router.get('/activeGames', publicGameController.activeGames);
    return router;
}