import { Server, Socket } from "socket.io"
import { PieceType, Position } from "../models/types";
import { games } from "../gameManager";
import { Piece } from "../class/piece";

export function handleMove(io:Server, socket:Socket){
    async function movement({ gameId, from, to, promotionType, playerName }:{gameId:string, from:Position, to:Position, promotionType:PieceType, playerName:string}){
          const game = games[gameId].existsGame();
    if (!game || !game.getBoard()) return;
    // Verifica se é a vez do jogador
    let player;
    try{
    player = game.checkPlayerRound(playerName, socket);
    }catch(error){
      console.error(error);
    }
    if (!player) {
      socket.emit('moveError', { message: 'Player not in game.' });
      return;
    }
    if (player.color !== game.getTurn()) {
      socket.emit('moveError', { message: 'Not your turn.' });
      return;
    }
    if(game.getPlayers().length < 2){ // não deixa jogar enquanto jogador inimigo não entrar
      socket.emit('moveError', {message: "wait other player"})
      return;
    }
    // Reconstrua o board com instâncias reais
    if (!game.getBoard()[0][0]?.move) {
      // console.log(game.board)
      // game.board = game.deserializeBoard();
    }
    const piece:Piece|null = game.getSelectedPiece(from); 
    if (!piece) {
      socket.emit('moveError', { message: 'No piece at source.' });
      return;
    }
    if (piece.color !== player.color) {
      socket.emit('moveError', { message: 'You can only move your own pieces.' });
      return;
    }

    let moved = await game.canMove(piece, to, from, promotionType);    
   
    if (moved) {
      // Alterna o turno
      
      const serializedBoard = game.serializeBoard();
      
      io.to(gameId).emit('boardUpdate', { board: serializedBoard, turn: game.changeTurn() });
      

      if(game.verifyCheckMate()){
        io.to(gameId).emit('gameOver', { winner: player.color });
      }
    } else {
      socket.emit('moveError', { message: 'Invalid move.' });
    }
     
    }
    
    socket.on('move', movement)
}