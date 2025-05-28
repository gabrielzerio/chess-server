import { Router } from 'express';
import { createGame, deleteGame, joinGame } from './gameController';

const router = Router();

router.post('/createGame', createGame);
router.post('/joinGame', joinGame);
router.delete('/games/:gameId', deleteGame);

export default router;