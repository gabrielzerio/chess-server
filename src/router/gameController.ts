import { Request, Response } from 'express';
import { GameManager } from '../gameManager'; 
import GameService from './services/gameService';


let gameManagerInstance: GameManager;
const gameService = new GameService();

export const setGameManager = (manager: GameManager) => {
    gameManagerInstance = manager;
};

export const createGame = async (req: Request, res: Response): Promise<any> => {
    const reqPlayerName = req.body.playerName;

    try {
        if (!gameManagerInstance) {
            throw new Error('GameManager not initialized.');
        }
        if (!reqPlayerName) {
            throw new Error('Player name is required.');
        }

        const playerCred = gameManagerInstance.createNewGame(reqPlayerName);
        
        const whiteP = await gameService.createPlayer(reqPlayerName, 0);
        await gameService.addPlayerWhiteToGame(playerCred.gameID, whiteP.id);
        return res.json({ gameID: playerCred?.gameID, playerID: playerCred?.playerID });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const joinGame = async (req: Request, res: Response): Promise<any> => {
    const reqPlayerName = req.body.playerName;
    const gameID = req.params.gameID; // Pega da URL
    if (!gameManagerInstance) {
        throw new Error('GameManager not initialized.');
    }
    if (!reqPlayerName) {
        throw new Error('Player name is required.');
    }
    try {


        // const player:Player = {playerName:reqPlayerName};
        const game = gameManagerInstance.getGame(gameID);
        if (game) {
            const playerCred = game.addPlayer(reqPlayerName);
            const blackP = await gameService.createPlayer(reqPlayerName, 0);
            const gameId = await gameService.selectTableGameId(gameID);
            if (!gameId) {
                throw new Error("O jogo não foi encontrado no banco de dados.");
            }
            await gameService.addPlayerBlackToGame(gameId, blackP.id);
            return res.json({ gameID: gameID, playerID: playerCred.playerID });
        }
        else {
            throw new Error("O jogo não existe");
        }

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const gameExists = (req: Request, res: Response): any => {
    const gameID = req.body.gameID;
    const playerID = req.body.playerID;

    try {
        if (!gameManagerInstance) {
            throw new Error('GameManager not initialized.');
        }
        if (!playerID) {
            throw new Error('Player ID is required.');
        }
        if (!gameID) {
            throw new Error('Game ID is required.');
        }
        const vrfGameID = gameManagerInstance.getGame(gameID);
        if (vrfGameID && vrfGameID.getPlayerByID(playerID)) {
            res.status(200).json({ status: "ok" });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}


// joinGame, validGame e getMoves seriam REMOVIDOS daqui e migrados para o Socket.IO no GameManager.

export const deleteGame = (req: Request, res: Response): any => {
    try {
        if (!gameManagerInstance) {
            throw new Error('GameManager not initialized.');
        }
        const { gameId } = req.params;
        const deleted = gameManagerInstance.deleteGame(gameId);
        if (!deleted) {
            return res.status(404).json({ error: 'Game not found' });
        }
        res.json({ success: true, message: `Game ${gameId} deleted.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Opcional: Se você quiser um endpoint REST para listar jogos, por exemplo
// export const listGames = (req: Request, res: Response) => { ... }