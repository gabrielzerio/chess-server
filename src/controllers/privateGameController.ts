import { Request, Response } from 'express';
import { GameService } from '../services/gameService';

// Supondo que você tenha erros customizados
import { GameFullError, PlayerAlreadyExistsError } from '../models/types';
import { PlayerService } from '../services/playerService';

export class GameController {
    private gameService: GameService;
    private playerService: PlayerService;

    constructor(gameService: GameService, playerService: PlayerService) {
        if (!gameService) {
            throw new Error('gameService not initialized.');
        }
        this.gameService = gameService;
        this.playerService = playerService;
    }

    createGame = async (req: Request, res: Response) => {
        const reqPlayerId = req.body?.playerId;

        try {
            const success = this.playerService.getPlayer(reqPlayerId);
            if (!success) {
                res.status(401).json("Player doesn't exist");
            }
            else {
                const gameId = this.gameService.createNewGame(reqPlayerId);
                res.json({ gameId: gameId });
            }
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    };

    joinGame = async (req: Request, res: Response): Promise<void> => {
        const reqPlayerId = req.body?.playerId;
        const gameId = req.query?.gameId?.toString();
        if (!reqPlayerId || !gameId) {
            return;
        }
        try {
            const gamePlayer = this.gameService.addPlayerInGame(reqPlayerId, gameId);
            if (!gamePlayer) throw new Error('Could not add player to game.');
            res.status(200).json({
                gameId: gameId,
                playerId: gamePlayer.getPlayerId?.() ?? gamePlayer.getPlayerId?.()
            });
        } catch (error: any) {
            if (error instanceof GameFullError) {
                res.status(409).json({ error: error.message });
            }
            if (error instanceof PlayerAlreadyExistsError) {
                res.status(400).json({ error: error.message });
            }
            console.error(`Error joining game: ${error.message}`);
            res.status(500).json({ error: 'An unexpected error occurred.' });
        }
    };

    gameExists = (req: Request, res: Response) => {
        const gameId = req.params.gameId;
        const playerId = req.body.playerId;
        try {
            if (!playerId) {
                throw new Error('Player ID is required.');
            }
            if (!gameId) {
                throw new Error('Game ID is required.');
            }
            res.status(404).json({ error: 'Player not found in game.' });
            // }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

}
