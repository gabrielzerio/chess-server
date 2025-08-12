import { Router } from 'express';
import { createGame, deleteGame, joinGame, gameExists } from './gameController';

const router = Router();

router.post('/createGame', createGame);
router.post('/games/:gameID', joinGame); // Rota mais RESTful
router.post('/gameExists', gameExists);
router.delete('/games/:gameId', deleteGame);

export default router;