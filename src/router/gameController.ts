import { Request, Response } from 'express';
import { games } from '../gameStore';
import { createInitialBoard } from '../utils/boardSetup';
import { Game } from '../class/game';
import { Player } from '../models/types';

export const createGame = (req: Request, res: Response) => {
    const gameId = Math.random().toString(36).substr(2, 4);
  games[gameId] = new Game(createInitialBoard());
  console.log(`Game created: ${gameId}`);
  res.json({ gameId });
};

export const joinGame = (req: Request<{ gameId: string }, any, { playerName: string }>, res: Response): any=> {
  const  gameId  = req.params.gameId;
  const  playerName  = req.body.playerName;
  if (!games[gameId]) return res.status(404).json({ error: 'Game not found' });
  if (games[gameId].getPlayers().length >= 2) return res.status(400).json({ error: 'Game full' });
  // Atribui cor automaticamente
  const color = games[gameId].getPlayers().length === 0 ? 'white' : 'black';
  // games[gameId].players.push({ name: playerName, color, socketId: null }); //utilizar metodo do game.ts
  const player:Player = {name:playerName, color:color, socketId:null};
  games[gameId].addPlayer(player) 
  if (games[gameId].getPlayers().length === 2) games[gameId].setStatus('playing');
  return res.json({ success: true, color });
};

export const validGame = (req: Request, res: Response):any => {
  const { gameId } = req.body;
   const { playerName } = req.body;
   if (!games[gameId]) return res.status(404).json({ error: 'Game not found' });
   if (!games[gameId].checkPlayerName(playerName)) {
     return res.status(403).json({ error: 'Player not in game' });
   }
   res.json( {valid:true} );
};

export const getMoves = async (req: Request, res: Response):Promise<any> => {
  const { gameId } = req.params;
    const { from, playerName } = req.body; // { row, col }, playerName opcional
    const game = games[gameId];
    if (!game || !game.getBoard()) return res.status(404).json({ error: 'Game not found' });
  
    // Reconstrua o board se necessário
    if (!game.getBoard()[0][0]?.move) {
      game.deserializeBoard();
    }
    const piece = game.getSelectedPiece(from); 
    if (!piece) return res.json({ moves: [] });
  
    // Só permite mostrar movimentos da peça do jogador da vez
    if (piece.color !== game.getTurn()) {
      return res.json({ moves: [] });
    }
    // Se playerName for enviado, valida se é o jogador correto
    if (playerName) {
      const player = game.checkPlayerName(playerName);
      if (!player || player.color !== game.getTurn()) {
        return res.json({ moves: [] });
      }
    }
  
    const { normalMoves, captureMoves } = game.possibleMoves(piece);
    res.json({ normalMoves, captureMoves });
};

export const deleteGame = (req: Request, res: Response): any => {
  const { gameId } = req.params;
  if (!games[gameId]) return res.status(404).json({ error: 'Game not found' });
  delete games[gameId];
  console.log(`Game deleted: ${gameId}`);
};