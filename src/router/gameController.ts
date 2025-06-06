// gameController.ts

import { Request, Response } from 'express';
import { GameManager } from '../gameManager'; // Importe seu GameManager
import { randomUUID } from 'crypto';
import { Player } from '../models/types';

// Assumindo que você terá uma instância global ou injetada do GameManager
// Para simplicidade, vamos exportar uma função que aceita o gameManager
// Ou, se você inicializar o GameManager em seu main server.ts, pode passá-lo para suas rotas
let gameManagerInstance: GameManager;

export const setGameManager = (manager: GameManager) => {
    gameManagerInstance = manager;
};

export const createGame = (req: Request, res: Response): any => {
    const reqPlayerName = req.body.playerName;

    try {
        if (!gameManagerInstance) {
            throw new Error('GameManager not initialized.');
        }
        if (!reqPlayerName) {
            throw new Error('Player name is required.');
        }

        // const playerID = randomUUID();
        // const player:Player = {playerName:reqPlayerName, playerID:playerID};
        const playerCred = gameManagerInstance.createNewGame(reqPlayerName);

        return res.json({ gameID: playerCred?.gameID, playerID: playerCred?.playerID });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const joinGame = (req: Request, res: Response): any => {
    const reqPlayerName = req.body.playerName;
    const gameID = req.body.gameID;

    try {
        if (!gameManagerInstance) {
            throw new Error('GameManager not initialized.');
        }
        if (!reqPlayerName) {
            throw new Error('Player name is required.');
        }
       
        // const player:Player = {playerName:reqPlayerName};
        const game = gameManagerInstance.getGame(gameID);
        if(game){
            const playerCred = game.addPlayer(reqPlayerName);
            return res.json({ gameID: gameID, playerID: playerCred.playerID });
        }
        else{
            throw new Error("O jogo não existe");
        }

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const gameExists = (req: Request, res: Response): any => {
    const gameID = req.body.gameID;
    const playerID = req.body.playerID;

    try{
      if (!gameManagerInstance) {
            throw new Error('GameManager not initialized.');
        }
        if(!playerID){
           throw new Error('Player ID is required.'); 
        }  
        if(!gameID){
           throw new Error('Game ID is required.');  
        }   
        const vrfGameID = gameManagerInstance.getGame(gameID);
        if(vrfGameID && vrfGameID.getPlayerByID(playerID)){
            res.status(200).json({status: "ok"});
        }
    }catch(error:any){
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