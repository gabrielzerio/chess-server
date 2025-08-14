import { Router, Request, Response } from 'express';
import { GameController } from '../controllers/gameController';

let gameMgr: GameController;
export function publicRoutersetInstance(gmr: GameController) {
  gameMgr = gmr;
}

export const publicRouter = Router();

export function health(req: Request, res: Response) {
  res.status(200).json({
    status: 'ok',
    message: 'API is running and healthy!'
  });
}

export function activeGames(req: Request, res: Response) {
  const games = gameMgr.getAllGames()
  res.status(200).json(games);
}


export function playerRegister(req: Request, res: Response): void { // se o client enviar Id então verifica-se se está no array, se sim, devolve, se não cria um usuario
  const playerName = req.query.playerName?.toString();
  const playerId = req.query.playerId?.toString();
  let verifyPlayer;
  if (!playerId && !playerName) {
    res.status(400).json('Cliente não informou nome nem Id');
    return;
  }
  try {
    if (playerId) {
      verifyPlayer = gameMgr.getPlayerById(playerId);
      verifyPlayer !== null ? res.status(200).json(verifyPlayer) : "";
    }
    else if (playerName) {
      const player = gameMgr.createPlayer(playerName);
      res.status(200).json(player);
    }
  } catch (error: any) {
    res.status(400).json(error.message);
  }
}

export function players(req: Request, res: Response) {
  const players = gameMgr.getAllplayers();
  res.status(200).json(players);
}

export function activePlayers(req: Request, res: Response) {
  const codeRoom = req.params.codeRoom; // Pega da URL
  const players = gameMgr.getGame(codeRoom)?.getPlayers();
  res.status(200).json(players);
}


