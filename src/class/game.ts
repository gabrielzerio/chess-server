import { Board, PieceColor, Position, EnPassantTarget, Player, PieceType } from '../models/types';
import { MoveContext, Piece } from './piece';
import { PieceFactory } from '../models/PieceFactory';
import { Socket } from 'socket.io';
import { Pawn } from '../models/pieces/Pawn';
import { King } from '../models/pieces/King';

export class Game {
  players: Player[];
  board: Board;
  turn: PieceColor;
  status: string;
  enPassantTarget: EnPassantTarget | null;

  constructor(board: Board) {
    this.players = [];
    this.board = board;
    this.turn = 'white';
    this.status = 'waiting';
    this.enPassantTarget = null;
  }

  existsGame(){
    return this;
  }

  addPlayer(player: Player): boolean {
    if (this.players.length >= 2) return false;
    this.players.push(player);
    if (this.players.length === 2) this.status = 'playing';
    return true;
  }

  deserializeBoard(): Board {
    return this.board.map((row, rowIdx) =>
      row.map((piece, colIdx) =>
        piece
          ? PieceFactory.createPiece(piece.type, piece.color, { row: rowIdx, col: colIdx })
          : null
      )
    );
  }

  serializeBoard(){
    const serializedBoard = this.board.map(row =>
        row.map(piece =>
          piece
            ? { type: piece.type, color: piece.color, position: piece.position }
            : null
        )
      );
      return serializedBoard;
  }

  getSelectedPiece(from: Position): Piece | null {
    const piece = this.board[from.row][from.col];
    return piece;
  }

  checkPlayerName(playerName:string):Player{
    const player = this.players.find(p => p.name === playerName);
    if(!player){
        throw new Error(`No player ${playerName} found`);
    }
    return player;
  }

  possibleMoves(piece:Piece):{normalMoves: Position[], captureMoves:Position[]}{
     // Chama o método getPossibleMoves (deve existir em cada peça)
      let possibleMoves:Position[] = [];	
      const context:MoveContext = {enPassantTarget: this.enPassantTarget};
      
      if (typeof piece.showPossibleMoves === 'function') {
        // Espera que showPossibleMoves retorne Position[]
        possibleMoves = piece.showPossibleMoves(this.board, context);
      }
      const normalMoves: Position[] = [];
      const captureMoves: Position[] = [];
    
    for (const move of possibleMoves) {
      const targetPiece = this.getSelectedPiece(move);
      if (targetPiece && targetPiece.color !== piece.color) {
        captureMoves.push(move);
      } else if (!targetPiece) {
        normalMoves.push(move);
      }
    }
    return {normalMoves,captureMoves};
  }
  
  checkPlayerRound(playerName:string, socket:Socket):Player{
    const player = this.players.find(p => p.name === playerName && p.socketId === socket.id)
    if(!player){
        throw new Error(`No player ${playerName} found`);
    }
    return player;
  }

  async pawnPromotionMovement(piece:Piece, to:Position, from:Position, promotionType:PieceType):Promise<boolean>{
        const context:MoveContext = {enPassantTarget: this.enPassantTarget };	
        if (piece instanceof Pawn && (to.row === 0 || to.row === 7) && promotionType) {
          
          if (typeof piece.move === 'function' && await piece.move(from, to, this.board, context )) {
            const newPiece = PieceFactory.createPiece(promotionType, piece.color, to);
            this.board[to.row][to.col] = newPiece;
            this.board[from.row][from.col] = null;
            await piece.move(from, to, this.board, context);
            return true;
          }
        }
        return false;
  }

 async normalMovement(piece: Piece, from:Position,to:Position,):Promise<boolean>{
    const context:MoveContext = {enPassantTarget: this.enPassantTarget };
    const moved = await piece.move(from, to, this.board, context);
    if(moved){
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;
        piece.position = { ...to };
    }
    return moved
  }

  async canMove(piece:Piece, to:Position, from:Position, promotionType:PieceType):Promise<boolean>{
    let moved = false;
    // Tenta promoção primeiro
    moved = await this.pawnPromotionMovement(piece, to, from, promotionType);
    // Só tenta movimento normal se não foi promoção
    if (!moved) {
        moved = await this.normalMovement(piece, from, to);
    }
    if(moved){
        this.setEnpassantPosition(piece,from,to);
    }
    return moved;
}
        
    changeTurn():PieceColor{
        return this.turn = this.turn === 'white' ? 'black' : 'white';
     }   
    
    setEnpassantPosition(piece:Piece, from:Position, to:Position){
        if (piece instanceof Pawn) {
            this.enPassantTarget = piece.getEnPassantTarget(from, to);
        }
    }

    verifyCheckMate ():boolean{
        const pieces = this.getAllFlatPieces();
        const king = pieces.find(p => p.type === 'king' && p.color === this.turn) as King;
        if (king && King.isCheckmate(king, pieces, this.board)) {
          // Xeque-mate!
          this.status = 'checkmate';
          return true;
        }
        return false;
    }

    getAllFlatPieces(): Piece[] {
        return this.board.flat().filter((p): p is Piece => p !== null);
      }

    removeSocketId(socketId:string){
      
        this.players.forEach((p:Player)=>{
          if(p.socketId === socketId) p.socketId = null;
          // console.log("removeu")
        })
  }
  }
