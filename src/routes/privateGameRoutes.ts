import { Request, Response } from 'express';
import { GameController } from '../controllers/gameController';
import GameService from './services/gameService';

// Supondo que você tenha erros customizados
import { GameFullError, PlayerAlreadyExistsError } from '../models/types';
export class GameRoute {
    private gameControllerInstance: GameController;
    // private gameService = new GameService();
    constructor(gameControllerInstance: GameController) {
        if (!gameControllerInstance) {
            throw new Error('gameController not initialized.');
        }
        this.gameControllerInstance = gameControllerInstance;
    }

    createGame = async (req: Request, res: Response) => {
        const reqPlayerId = req.body?.playerId;

        try {
            if (!reqPlayerId) {
                throw new Error('Player id is required.');
            }
            this.gameControllerInstance.getPlayerById(reqPlayerId);
            const gameId = this.gameControllerInstance.createNewGame(reqPlayerId);

            // const whiteP = await gameService.createPlayer(reqPlayerName, 0);
            // await gameService.addPlayerWhiteToGame(playerCred.gameID, whiteP.id);
            res.json({ gameID: gameId });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    joinGame = async (req: Request, res: Response): Promise<void> => {
        const reqPlayerId = req.body?.playerId;
        const gameId = req.query?.gameId?.toString(); // Pega da URL

        if (!reqPlayerId) {
            throw new Error('Player id is required.');
        }
        if (!gameId) {
            throw new Error('Game id is required');
        }
        try {
            const player = this.gameControllerInstance.getPlayerById(reqPlayerId);
            const gamePlayer = this.gameControllerInstance.addPlayerInGame(player, gameId);

            res.status(200).json( {playerName: gamePlayer.getPlayerName(), playerId: gamePlayer.getPlayerId(), color:gamePlayer.color} );

        } catch (error: any) {
            
            // Agora, tratamos os erros de forma específica
            if (error instanceof GameFullError) {
                // 409 Conflict é um bom status para "recurso já existe/está cheio"
                res.status(409).json({ error: error.message });
            }
            if (error instanceof PlayerAlreadyExistsError) {
                // 400 Bad Request para um jogador que já está no jogo
                res.status(400).json({ error: error.message });
            }
            // Para qualquer outro erro, usamos 500 (Erro Interno do Servidor)
            console.error(`Error joining game: ${error.message}`); // É bom logar o erro no servidor

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
            const vrfGameID = this.gameControllerInstance.getGame(gameID);
            if (vrfGameID && vrfGameID.getPlayerByID(playerId)) {
                res.status(200).json({ status: "ok" });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    deleteGame = (req: Request, res: Response): any => {
        try {
            const { gameId } = req.params;
            const deleted = this.gameControllerInstance.deleteGame(gameId);
            if (!deleted) {
                return res.status(404).json({ error: 'Game not found' });
            }
            res.json({ success: true, message: `Game ${gameId} deleted.` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}
