import { Board, PieceColor, Position, PieceType, GameStatus, EnPassantTarget, ApplyMoveResult } from '../models/types';
import { GamePlayer } from './GamePlayer';
import { Piece, MoveContext } from './piece';
import { PieceFactory } from '../models/PieceFactory';
import { Pawn } from '../models/pieces/Pawn';
import { King } from '../models/pieces/King';

export class Game {
    private gamePlayers: { [playerId: string]: GamePlayer } = {};
    addGamePlayer(gamePlayer: GamePlayer) {
        if (this.countPlayersInGame() >= 2) {
            throw Error("O numero maximo de jogadores para esse jogo foi atingido");
        }
        this.gamePlayers[gamePlayer.getPlayerId()] = gamePlayer;
    }

    getGamePlayerById(playerId: string): GamePlayer {
        return this.gamePlayers[playerId];
    }

    getAllGamePlayers(): GamePlayer[] {
        return Object.values(this.gamePlayers);
    }

    countPlayersInGame(): number {
        return Object.values(this.gamePlayers).length;
    }
    setStatus(status: GameStatus) {
        this.status = status;
    }
    getStatus(): GameStatus {
        return this.status;
    }

    getTurn(): PieceColor {
        return this.turn;
    }

    getEnPassantTarget(): EnPassantTarget | null {
        return this.enPassantTarget;
    }

    getFullAndHalfMove() {
        const moves = { halfMove: this.halfmoveClock, fullMove: this.fullmoveNumber }
        return moves;
    }

    private board: Board;
    private turn: PieceColor;
    private status: GameStatus;
    private enPassantTarget: EnPassantTarget | null;
    private halfmoveClock: number = 0; // reset quando captura ou movimento de peão
    private fullmoveNumber: number = 1; // começa no 1
    private winner: GamePlayer | undefined = undefined;

    constructor(board: Board) {
        this.board = board;
        this.turn = "white";
        this.status = "waiting";
        this.enPassantTarget = null;
        // gamePlayers removido
    }

    // ... Métodos de manipulação de jogadores removidos. Agora responsabilidade do GameManager/PlayerRepository ...

    // ... resto da lógica de tabuleiro e movimentos (igual a que você já tem)


    // --- Métodos de Tabuleiro e Peças (mantidos e aprimorados se necessário) ---

    setWinner(player: GamePlayer) {
        this.winner = player;
    }
    getWinner(): GamePlayer | undefined {
        if (this.winner) {
            return this.winner;
        }
        return undefined;
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

    private wasCapture(
        piece: Piece,
        from: Position,
        to: Position,
        preMoveBoard: Board = this.board
    ): { captured: boolean; captureAt?: Position } {
        const target = preMoveBoard[to.row][to.col];

        // 1) Captura normal
        if (target && target.color !== piece.color) {
            return { captured: true, captureAt: { row: to.row, col: to.col } };
        }

        // 2) En passant
        const isDiagonal = from.col !== to.col;
        const destEmpty = !target;
        const ep =
            piece.type === "pawn" &&
            isDiagonal &&
            destEmpty &&
            this.enPassantTarget &&
            this.enPassantTarget.row === to.row &&
            this.enPassantTarget.col === to.col;

        if (ep) {
            const capturedRow = piece.color === "white" ? to.row + 1 : to.row - 1;
            return { captured: true, captureAt: { row: capturedRow, col: to.col } };
        }

        return { captured: false };
    }
    private updateClocksAndEP(piece: Piece, from: Position, to: Position, captureInfo: { captured: boolean }) {
        // Atualiza halfmoveClock
        if (piece.type === "pawn" || captureInfo.captured) {
            this.halfmoveClock = 0;
        } else {
            this.halfmoveClock++;
        }

        // Atualiza fullmoveNumber
        if (this.turn === "black") {
            this.fullmoveNumber++;
        }

        // Atualiza en passant
        if (piece.type === "pawn" && Math.abs(to.row - from.row) === 2) {
            const epRow = (from.row + to.row) / 2;
            this.enPassantTarget = { row: epRow, col: from.col };
        } else {
            this.enPassantTarget = null;
        }
    }
    // getInfosToFen(){

    // }

    public getCastlingRights(): string {
        const rights: string[] = [];

        const pieces = this.getAllFlatPieces();

        const whiteKing = pieces.find(p => p.type === "king" && p.color === "white");
        const blackKing = pieces.find(p => p.type === "king" && p.color === "black");

        const whiteRooks = pieces.filter(p => p.type === "rook" && p.color === "white");
        const blackRooks = pieces.filter(p => p.type === "rook" && p.color === "black");

        // White
        if (whiteKing && !whiteKing.hasMoved) {
            if (whiteRooks.find(r => r.position.col === 0 && !r.hasMoved)) rights.push("Q");
            if (whiteRooks.find(r => r.position.col === 7 && !r.hasMoved)) rights.push("K");
        }

        // Black
        if (blackKing && !blackKing.hasMoved) {
            if (blackRooks.find(r => r.position.col === 0 && !r.hasMoved)) rights.push("q");
            if (blackRooks.find(r => r.position.col === 7 && !r.hasMoved)) rights.push("k");
        }

        return rights.length ? rights.join('') : "-";
    }

    public generateSAN(
        piece: Piece,
        to: Position,
        captureInfo: { captured: boolean },
        promotionType?: PieceType,
        isCheck?: boolean,
        isCheckmate?: boolean
    ): string {
        // Caso especial: Roque
        if (piece.type === 'king' && Math.abs(piece.position.col - to.col) === 2) {
            return to.col === 6 ? 'O-O' : 'O-O-O';
        }

        let san = '';

        // 1. Nome da peça (exceto peão)
        if (piece.type !== 'pawn') {
            san += piece.getFenChar().toUpperCase();
        }

        // 2. Info de captura
        if (captureInfo.captured) {
            // Para peões, a coluna de origem é necessária na captura
            if (piece.type === 'pawn') {
                san += String.fromCharCode(97 + piece.position.col);
            }
            san += 'x';
        }

        // 3. Posição de destino
        san += `${String.fromCharCode(97 + to.col)}${8 - to.row}`;

        // 4. Promoção
        if (promotionType) {
            const promotionPiece = PieceFactory.createPiece(promotionType, piece.color, to);
            san += `=${promotionPiece.getFenChar().toUpperCase()}`;
        }

        // 5. Xeque ou Xeque-mate
        if (isCheckmate) {
            san += '#';
        } else if (isCheck) {
            san += '+';
        }

        return san;
    }


    public async applyMove(
        gamePlayer: GamePlayer,
        from: Position,
        to: Position,
        promotionType?: PieceType
    ): Promise<ApplyMoveResult> { // ALTERADO: O tipo de retorno agora inclui a notação SAN
        if (gamePlayer?.color !== this.turn) {
            return { success: false, message: 'Not your turn or player not found.' };
        }

        const piece = this.getSelectedPiece(from);
        if (!piece || piece.color !== this.turn) {
            return { success: false, message: 'No piece selected or not your piece.' };
        }

        const originalBoard = this.board.map(row => row.slice());
        const originalEnPassantTarget = this.enPassantTarget;
        const originalTurn = this.turn;

        // Precisamos saber se foi captura ANTES de mover a peça
        const captureInfo = this.wasCapture(piece, from, to, this.board);

        const moved = await this.canMove(piece, to, from, promotionType);

        if (!moved) {
            return { success: false, message: 'Invalid move.' };
        }

        if (this.isKingInCheck(gamePlayer.color)) {
            this.board = originalBoard;
            this.enPassantTarget = originalEnPassantTarget;
            this.turn = originalTurn;
            return { success: false, message: 'Move leaves your King in check.' };
        }

        this.changeTurn();
        const isCheckmate = this.verifyCheckMate();
        // let winner: PieceColor | undefined;
        let finalStatus = this.status;
        let isCheck = false;

        if (isCheckmate) {
            // winner = this.turn === 'white' ? 'black' : 'white';
            finalStatus = 'ended';
            this.winner = gamePlayer;
            this.status = finalStatus;
        } else {
            isCheck = this.isKingInCheck(this.turn);
        }

        this.updateClocksAndEP(piece, from, to, captureInfo);

        // NOVO: Gerar a notação SAN para o lance recém-feito
        const san = this.generateSAN(piece, to, captureInfo, promotionType, isCheck, isCheckmate);

        return {
            success: true,
            board: this.serializeBoard(),
            turn: this.turn,
            status: finalStatus,
            winner: this.winner,
            isCheck,
            san: san, // NOVO: Retorna a notação do lance
        };
    }
}