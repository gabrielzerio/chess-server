import { Router, Request, Response } from 'express';
import { GameManager } from '../gameManager';

let gameMgr: GameManager;
export function publicRoutersetInstance(gmr: GameManager){
    gameMgr = gmr;
}

  export const publicRouter = Router();

  publicRouter.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'ok', 
      message: 'API is running and healthy!' 
    });
  });

  publicRouter.get('/registerTest', (req: Request, res: Response) => {
    res.status(200).json({
      
    })
    
  });
  

  publicRouter.get('/activeGames', (req: Request, res: Response) => {
    const games = gameMgr.getAllGames()
    
    res.status(200).json(games);
  });


