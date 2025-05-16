import { Router } from 'express';
import { createGame, joinGame, validGame, getMoves, deleteGame } from './gameController';

const router = Router();

router.post('/createGame', createGame);
router.post('/games/:gameId/join', joinGame);
router.post('/games/validgame', validGame);
router.post('/games/:gameId/moves', getMoves);
router.delete('/games/:gameId', deleteGame);

export default router;