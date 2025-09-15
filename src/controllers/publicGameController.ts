import { Request, Response } from 'express';
import { GameService } from '../services/gameService';
import { PlayerService } from '../services/playerService';



export class PublicGameController {
  private gameSvc: GameService;
  private playerService: PlayerService

  constructor(gameSvc: GameService, playerService: PlayerService) {
    this.gameSvc = gameSvc;
    this.playerService = playerService;
  }

  health = async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      message: 'API is running and healthy!'
    });
  }

  activeGames = async (req: Request, res: Response) => {
    const games = this.gameSvc.getAllGames()
    res.status(200).json(games);
  }

  getPlayer = async (req: Request, res: Response): Promise<void> => {
    const playerId = req.query.playerId?.toString();
    if (playerId) {
      const player = this.playerService.getPlayer(playerId);
      player !== null ? res.status(200).json(player) : res.status(401).json('nenhum player com esse id');
    }
  }

  playerRegister = async (req: Request, res: Response): Promise<void> => {
    const playerName = req.query.playerName?.toString();
    // const playerId = req.query.playerId?.toString();
    if (!playerName) {
      res.status(400).json('Cliente não informou nome nem Id');
      return;
    }

    try {
      if (playerName) {
        const player = this.playerService.createPlayer(playerName);
        res.status(200).json(player);
        return;
      }
    } catch (error: any) {
      res.status(400).json(error.message);
    }
  }

}

