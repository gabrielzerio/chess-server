// gameController.ts

import { Request, Response } from 'express';
import { GameManager } from '../gameManager'; // Importe seu GameManager

// Assumindo que você terá uma instância global ou injetada do GameManager
// Para simplicidade, vamos exportar uma função que aceita o gameManager
// Ou, se você inicializar o GameManager em seu main server.ts, pode passá-lo para suas rotas
let gameManagerInstance: GameManager;

export const setGameManager = (manager: GameManager) => {
    gameManagerInstance = manager;
};

export const createGame = (req: Request, res: Response) => {
    try {
        if (!gameManagerInstance) {
            throw new Error('GameManager not initialized.');
        }
        const gameId = gameManagerInstance.createNewGame();
        res.json({ gameId });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

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