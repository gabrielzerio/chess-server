import { Request, Response } from 'express';
import { GameService } from '../services/gameService';

// Supondo que você tenha erros customizados
import { GameFullError, PlayerAlreadyExistsError } from '../models/types';

export class GameRoute {
    private gameServiceInstance: GameService;
    constructor(gameServiceInstance: GameService) {
        if (!gameServiceInstance) {
            throw new Error('gameService not initialized.');
        }
        this.gameServiceInstance = gameServiceInstance;
    }

    createGame = async (req: Request, res: Response) => {
        const reqPlayerId = req.body?.playerId;
        try {
            // if (!reqPlayerId) {
            //     throw new Error('Player id is required.');
            // }
            // const player = this.gameServiceInstance.getPlayerById(reqPlayerId);
            // if (!player) throw new Error('Player not found.');
            const gameId = this.gameServiceInstance.createNewGame(reqPlayerId);
            res.json({ gameID: gameId });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    joinGame = async (req: Request, res: Response): Promise<void> => {
        const reqPlayerId = req.body?.playerId;
        const gameId = req.query?.gameId?.toString();
        if (!reqPlayerId) {
            throw new Error('Player id is required.');
        }
        if (!gameId) {
            throw new Error('Game id is required');
        }
        try {
            const player = this.gameServiceInstance.getPlayerById(reqPlayerId);
            if (!player) throw new Error('Player not found.');
            const gamePlayer = this.gameServiceInstance.addPlayerInGame(player, gameId);
            if (!gamePlayer) throw new Error('Could not add player to game.');
            res.status(200).json({
                playerName: gamePlayer.getPlayerName?.() ?? player.getPlayerName?.(),
                playerId: gamePlayer.getPlayerId?.() ?? player.getPlayerId?.(),
                color: gamePlayer.color ?? null
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
        const gameID = req.params.gameID;
        const playerId = req.body.playerId;
        try {
            if (!playerId) {
                throw new Error('Player ID is required.');
            }
            if (!gameID) {
                throw new Error('Game ID is required.');
            }
            const vrfGameID = this.gameServiceInstance.getGame(gameID);
            if (vrfGameID && vrfGameID.players?.find?.((p: any) => p.getPlayerId?.() === playerId)) {
                res.status(200).json({ status: "ok" });
            } else {
                res.status(404).json({ error: 'Player not found in game.' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    deleteGame = (req: Request, res: Response): any => {
        try {
            const { gameId } = req.params;
            const deleted = this.gameServiceInstance.deleteGame(gameId);
            if (!deleted) {
                return res.status(404).json({ error: 'Game not found' });
            }
            res.json({ success: true, message: `Game ${gameId} deleted.` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}
