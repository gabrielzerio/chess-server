import { Router } from 'express';
import { createGame, deleteGame, joinGame, gameExists } from './gameController';

const router = Router();

router.post('/createGame', createGame);
router.post('/joinGame', joinGame);
router.post('/gameExists', gameExists);
router.delete('/games/:gameId', deleteGame);

export default router;