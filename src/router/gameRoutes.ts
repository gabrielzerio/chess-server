import { Router } from 'express';
import { createGame, deleteGame } from './gameController';

const router = Router();

router.post('/createGame', createGame);
router.delete('/games/:gameId', deleteGame);

export default router;