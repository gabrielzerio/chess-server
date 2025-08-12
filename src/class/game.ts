// class/game.ts

import { Board, PieceColor, Position, EnPassantTarget, PieceType, GameStatus, PlayerAlreadyExistsError, GameFullError } from '../models/types';
import { MoveContext, Piece } from './piece'; // Certifique-se de que Piece e MoveContext estão corretos
import { PieceFactory } from '../models/PieceFactory';
import { Pawn } from '../models/pieces/Pawn';
import { King } from '../models/pieces/King';
import { randomUUID } from 'crypto';
import { Player } from './Player';
import { GamePlayer } from './GamePlayer';

// Interface para o retorno do applyMove, para ser mais claro
export interface ApplyMoveResult {
    success: boolean;
    message?: string;
    board?: Board; // Board serializado
    turn?: PieceColor;
    status?: GameStatus;
    winner?: PieceColor;
    isCheck?: boolean; // Adicionado para indicar xeque
}

export class Game {
    private gamePlayers: GamePlayer[];
    private board: Board;
    private turn: PieceColor;
    private status: GameStatus; // Ex: 'waiting', 'playing', 'finished', 'paused'
    private enPassantTarget: EnPassantTarget | null;

    constructor(board: Board) {
        this.gamePlayers = [];
        this.board = board;
        this.turn = 'white'; // Branco sempre começa
        this.status = 'waiting'; // Estado inicial
        this.enPassantTarget = null;
    }

    // --- Getters (mantidos) ---
    getBoard(): Board {
        return this.board;
    }
    getTurn(): PieceColor {
        return this.turn;
    }
    getPlayers(): GamePlayer[] {
        return this.gamePlayers;
    }
    getStatus(): GameStatus {
        return this.status;
    }
    setStatus(status: GameStatus): void {
        this.status = status;
    }

    // --- Métodos de Gerenciamento de Jogadores ---
    createPlayer(playerName: String): string{
      const genID = randomUUID();  
      
      return genID;
    }

    addPlayer(player: Player): GamePlayer {
        if (this.getActivePlayersCount() >= 2) {
            throw new GameFullError(); // Lança exceção
        }
        // if (this.gamePlayers.some(p => p.getPlayerName() === player.getPlayerName()) && player.getPlayerName()?) {
        //     throw new PlayerAlreadyExistsError(); // Lança exceção
        // }
        // const rescuePlayer = this.getPlayerByName(player.getPlayerName());
        // if (rescuePlayer && !rescuePlayer.getIsOnline) {
        //     return rescuePlayer;
        // }
        
        const color: PieceColor = this.getPlayers().length === 0 ? 'white' : 'black';
        const gamePlayer = new GamePlayer(player, color);
        // const player: Player = { playerID: genID, playerName: playerName };
        gamePlayer.color = color;
        gamePlayer.isOnline = true; // Jogador está online ao ser adicionado
        this.gamePlayers.push(gamePlayer);
        return gamePlayer; // Retorna true se adicionado com sucesso 
    }

    // NOVO: Retorna o jogador pelo socketId ou undefined
    public getPlayerByID(playerID: string): Player | null{
        try {
            const player = this.players.find(p => p.playerID === playerID);
            if (player) {
                return player;
            }
        } catch (error) {
            console.error(error);
        }
        return null;
    }

    // Refatorado: Retorna o jogador pelo nome ou undefined, sem lançar erro
    public getPlayerByName(playerName: string): Player | void {
        return this.gamePlayers.find(p => p.getPlayerName() === playerName);
    }

    // NOVO: Marca um jogador como desconectado
    public setPlayerOnlineStatus(playerID: string, isOnline: boolean): Player | null {
        const player = this.getPlayerByID(playerID);
        if (player) {
            player.isOnline = isOnline;
            if (!isOnline) {
                player.disconnectedAt = Date.now();
                console.log(`Player ${player.playerName} (${playerID}) marked as offline.`);
            } else {
                delete player.disconnectedAt; // Remove o timestamp ao reconectar
                console.log(`Player ${player.playerName} (${playerID}) marked as online.`);
            }
            return player;
        }
        return null;
    }

    // NOVO: Conta jogadores ativos (online e com playerID)
    public getActivePlayersCount(): number {
        return this.players.filter(p => p.playerID && p.isOnline).length;
    }

    // Aprimorado: Gerencia a desconexão do jogador (usado internamente ou se precisar da lógica antiga)
    // public removePlayerByPlayerID(playerID: string): Player | null {
    //     const player = this.getPlayerByID(playerID);
    //     if (player) {
    //         player.playerID = null; // Isso era para liberar o slot, mas para reconexão, melhor manter o ID e usar 'isOnline'
    //         player.isOnline = false;
    //         console.log(`Player ${player.playerName} (${playerID}) slot potentially freed. Marked as offline.`);
    //     }
    //     return player;
    // }

    // --- Métodos de Tabuleiro e Peças (mantidos e aprimorados se necessário) ---

    deserializeBoard(): Board {
        return this.board.map((row, rowIdx) =>
            row.map((piece, colIdx) =>
                piece
                    ? PieceFactory.createPiece(piece.type, piece.color, { row: rowIdx, col: colIdx })
                    : null
            )
        );
    }

    serializeBoard(): any[] { // Retorna um tipo mais genérico para o JSON
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
        // Validação de limites
        if (from.row < 0 || from.row >= 8 || from.col < 0 || from.col >= 8) {
            return null;
        }
        const piece = this.board[from.row][from.col];
        return piece;
    }

    possibleMoves(piece: Piece): { normalMoves: Position[], captureMoves: Position[] } {
        let possibleMoves: Position[] = [];
        const context: MoveContext = { enPassantTarget: this.enPassantTarget };

        // Deserializa a peça para ter os métodos corretos, se necessário
        const currentPiece = PieceFactory.createPiece(piece.type, piece.color, piece.position);

        if (typeof currentPiece.showPossibleMoves === 'function') {
            possibleMoves = currentPiece.showPossibleMoves(this.board, context);
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
        return { normalMoves, captureMoves };
    }

    // REMOVIDO: checkPlayerRound (a lógica foi para isPlayerTurn na Game ou no GameManager)

    async pawnPromotionMovement(piece: Piece, to: Position, from: Position, promotionType?: PieceType): Promise<boolean> {
        // Garante que promotionType é fornecido para promoção
        if (!promotionType) return false;

        const context: MoveContext = { enPassantTarget: this.enPassantTarget };

        if (piece instanceof Pawn && (to.row === 0 || to.row === 7)) {
            // Cria uma nova instância da peça para garantir que os métodos estejam lá
            const pawnInstance = PieceFactory.createPiece('pawn', piece.color, from) as Pawn;
            if (typeof pawnInstance.move === 'function' && await pawnInstance.move(from, to, this.board, context)) {
                const newPiece = PieceFactory.createPiece(promotionType, piece.color, to);
                this.board[to.row][to.col] = newPiece;
                this.board[from.row][from.col] = null;
                // Não precisa chamar piece.move novamente aqui
                return true;
            }
        }
        return false;
    }

    async normalMovement(piece: Piece, from: Position, to: Position): Promise<boolean> {
        const context: MoveContext = { enPassantTarget: this.enPassantTarget };
        // Cria uma nova instância da peça para garantir que os métodos estejam lá
        const currentPiece = PieceFactory.createPiece(piece.type, piece.color, from);

        const moved = await currentPiece.move(from, to, this.board, context);
        if (moved) {
            this.board[to.row][to.col] = currentPiece; // Coloca a instância real, não a serializada
            this.board[from.row][from.col] = null;
            currentPiece.position = { ...to }; // Atualiza a posição da peça
        }
        return moved;
    }

    async canMove(piece: Piece, to: Position, from: Position, promotionType?: PieceType): Promise<boolean> {
        let moved = false;
        // Tenta promoção primeiro
        moved = await this.pawnPromotionMovement(piece, to, from, promotionType);
        // Só tenta movimento normal se não foi promoção
        if (!moved) {
            moved = await this.normalMovement(piece, from, to);
        }
        if (moved) {
            this.setEnpassantPosition(piece, from, to);
        }
        return moved;
    }

    changeTurn(): PieceColor {
        return this.turn = this.turn === 'white' ? 'black' : 'white';
    }

    setEnpassantPosition(piece: Piece, from: Position, to: Position): void {
        if (piece instanceof Pawn) {
            this.enPassantTarget = piece.getEnPassantTarget(from, to);
        } else {
            this.enPassantTarget = null;
        }
    }

    // NOVO: Verifica se o rei do turno atual está em xeque
    isKingInCheck(color: PieceColor): boolean {
        const pieces = this.getAllFlatPieces();
        const king = pieces.find(p => p.type === 'king' && p.color === color);
        if (!king) return false; // Deve sempre haver um rei
        return king.isInCheck(this.board);
    }

    verifyCheckMate(): boolean {
        // Primeiro, verifique se o rei do turno atual está em xeque
        if (!this.isKingInCheck(this.turn)) {
            return false; // Não é xeque, então não pode ser xeque-mate
        }

        const pieces = this.getAllFlatPieces();
        const king = pieces.find(p => p.type === 'king' && p.color === this.turn) as King;
        if (!king) return false; // Caso improvável, mas para segurança

        if (King.isCheckmate(king, pieces, this.board)) {
            this.status = 'checkmate';
            return true;
        }
        return false;
    }

    getAllFlatPieces(): Piece[] {
        return this.board.flat().filter((p): p is Piece => p !== null);
    }

    // NOVO: Método principal para aplicar um movimento, retorna um resultado estruturado
    public async applyMove(player:Player, socketId: string, from: Position, to: Position, promotionType?: PieceType): Promise<ApplyMoveResult> {
        if (!player || player.color !== this.turn) {
            return { success: false, message: 'Not your turn or player not found.' };
        }

        const piece = this.getSelectedPiece(from);
        if (!piece || piece.color !== this.turn) {
            return { success: false, message: 'No piece selected or not your piece.' };
        }

        // Antes de tentar o movimento, verifique se o movimento é legal (não deixa o próprio rei em xeque)
        // Isso requer uma simulação do movimento e verificar o xeque
        // const originalBoard = JSON.parse(JSON.stringify(this.board)); // Cópia profunda
        const originalBoard = this.board // Cópia profunda

        const originalEnPassantTarget = this.enPassantTarget;
        const originalTurn = this.turn;

        const moved = await this.canMove(piece, to, from, promotionType);

        if (!moved) {
            console.log('tem como dar bo??')
            // Restaura o tabuleiro se o movimento falhou (se o canMove alterou algo temporariamente)
            this.board = originalBoard;
            this.enPassantTarget = originalEnPassantTarget;
            this.turn = originalTurn;
            return { success: false, message: 'Invalid move.' };
        }

        // Após o movimento bem-sucedido, verifique se o próprio rei está em xeque
        if (this.isKingInCheck(player.color)) {
            // Se o movimento deixou o próprio rei em xeque, ele é ilegal
            this.board = originalBoard; // Reverte o tabuleiro
            this.enPassantTarget = originalEnPassantTarget; // Reverte enPassant
            this.turn = originalTurn; // Reverte o turno
            return { success: false, message: 'Move leaves your King in check.' };
        }

        // O movimento é válido e não deixou o próprio rei em xeque
        this.changeTurn(); // Muda o turno para o próximo jogador

        const isCheckmate = this.verifyCheckMate();
        let winner: PieceColor | undefined;
        let finalStatus = this.getStatus();
        let isCheck = false;

        if (isCheckmate) {
            winner = this.turn === 'white' ? 'black' : 'white'; // O vencedor é o oposto do turno atual
            finalStatus = 'ended';
            this.setStatus(finalStatus);
        } else {
            // Verifica se o próximo jogador (turno atual) está em xeque
            isCheck = this.isKingInCheck(this.turn);
            // TODO: Implementar lógica de empate (stalemate, 50-move rule, three-fold repetition)
        }


        return {
            success: true,
            board: this.serializeBoard(), // Envia o board serializado
            turn: this.getTurn(),
            status: finalStatus,
            winner: winner,
            isCheck: isCheck // Indica se o rei do próximo turno está em xeque
        };
    }
}