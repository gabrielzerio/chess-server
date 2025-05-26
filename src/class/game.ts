// class/game.ts

import { Board, PieceColor, Position, EnPassantTarget, Player, PieceType } from '../models/types';
import { MoveContext, Piece } from './piece'; // Certifique-se de que Piece e MoveContext estão corretos
import { PieceFactory } from '../models/PieceFactory';
import { Pawn } from '../models/pieces/Pawn';
import { King } from '../models/pieces/King';

// Interface para o retorno do applyMove, para ser mais claro
export interface ApplyMoveResult {
    success: boolean;
    message?: string;
    board?: Board; // Board serializado
    turn?: PieceColor;
    status?: string;
    winner?: PieceColor;
    isCheck?: boolean; // Adicionado para indicar xeque
}

export class Game {
    private players: Player[];
    private board: Board;
    private turn: PieceColor;
    private status: string; // Ex: 'waiting', 'playing', 'finished', 'paused'
    private enPassantTarget: EnPassantTarget | null;

    constructor(board: Board) {
        this.players = [];
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
    getPlayers(): Player[] {
        return this.players;
    }
    getStatus(): string {
        return this.status;
    }
    setStatus(status: string): void {
        this.status = status;
    }

    // --- Métodos de Gerenciamento de Jogadores ---

    addPlayer(player: Player): boolean {
        if (this.players.length >= 2) return false;
        // Evita adicionar o mesmo jogador (pelo nome) duas vezes
        // if (this.players.some(p => p.name === player.name)) return false;

        this.players.push(player);
        if (this.players.length === 2 && this.status === 'waiting') {
            this.status = 'playing'; // Inicia o jogo se há 2 jogadores e estava esperando
        }
        return true;
    }

    // NOVO: Retorna o jogador pelo socketId ou undefined
    public getPlayerByID(playerID: string): Player | undefined {
        return this.players.find(p => p.playerID === playerID);
    }

    // Refatorado: Retorna o jogador pelo nome ou undefined, sem lançar erro
    // public getPlayerByName(playerName: string): Player | undefined {
    //     return this.players.find(p => p.name === playerName);
    // }

    // Aprimorado: Gerencia a desconexão do jogador
    public removePlayerByPlayerID(playerID: string): Player | null {
        const player = this.getPlayerByID(playerID);
        if (player) {
            // Apenas define o socketId para null (permite reconexão ou slot vazio)
            player.playerID = null;
            console.log(`Player ${player.name} (${playerID}) disconnected. SocketId set to null.`);

            // Lógica adicional para o estado do jogo ao desconectar
            const activePlayers = this.players.filter(p => p.playerID !== null);
            if (this.status === 'playing' && activePlayers.length < 2) {
                this.status = 'paused'; // Ou 'abandoned'
                console.log(`Game status changed to ${this.status} due to player disconnection.`);
            }
            return player;
        }
        return null;
    }

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
    public async applyMove(socketId: string, from: Position, to: Position, promotionType?: PieceType): Promise<ApplyMoveResult> {
        const player = this.getPlayerByID(socketId);
        if (!player || player.color !== this.turn) {
            return { success: false, message: 'Not your turn or player not found.' };
        }

        const piece = this.getSelectedPiece(from);
        if (!piece || piece.color !== this.turn) {
            return { success: false, message: 'No piece selected or not your piece.' };
        }

        // Antes de tentar o movimento, verifique se o movimento é legal (não deixa o próprio rei em xeque)
        // Isso requer uma simulação do movimento e verificar o xeque
        const originalBoard = JSON.parse(JSON.stringify(this.board)); // Cópia profunda
        const originalEnPassantTarget = this.enPassantTarget;
        const originalTurn = this.turn;

        const moved = await this.canMove(piece, to, from, promotionType);

        if (!moved) {
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
            finalStatus = 'finished';
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