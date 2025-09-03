import { Board, EnPassantTarget, FENOptions } from "../models/types";
import { boardToFEN } from "../utils/boardToFEN";
import { GameHistory } from "./GameHistory";

// ALTERADO: Adaptado para gerenciar o novo GameHistory focado em PGN.
export class NotationManager {
    private histories: Map<string, GameHistory> = new Map();

    /**
     * NOVO: Cria um registro de histórico para um novo jogo.
     */
    createGame(gameId: string) {
        if (this.histories.has(gameId)) {
            throw new Error(`Game ${gameId} já existe`);
        }
        this.histories.set(gameId, new GameHistory());
    }

    /**
     * NOVO: Adiciona um lance ao histórico de um jogo.
     */
    addMove(gameId: string, sanMove: string) {
        const history = this.histories.get(gameId);
        if (!history) throw new Error(`Game ${gameId} não encontrado`);
        history.addMove(sanMove);
    }

    /**
     * NOVO: Define os metadados (tags) do jogo, como nomes dos jogadores e resultado.
     */
    setGameTag(gameId: string, tagName: string, value: string) {
        const history = this.histories.get(gameId);
        if (!history) throw new Error(`Game ${gameId} não encontrado`);
        history.setTag(tagName, value);
    }

    /**
     * NOVO: Recupera o PGN completo do jogo.
     */
    getPGN(gameId: string): string | null {
        const history = this.histories.get(gameId);
        if (!history) return null;
        return history.generatePGN();
    }

    public getFen(board: Board, enPassantTarget: EnPassantTarget, fenInfos: FENOptions): string {
        // --- Calcula FEN atualizado ---
        // const game = this.getGame(gameId);
        // const castlingRights = game.getCastlingRights();
        // const turn = game.getTurn();
        // const enPassantTarget = game.getEnPassantTarget();
        // const { halfMove, fullMove } = game.getFullAndHalfMove();
        // const board = game.deserializeBoard();
        const { turn, castling, halfMove, fullMove } = fenInfos;
        const fen = boardToFEN(board, {
            turn: turn,
            castling: castling,
            enPassant: enPassantTarget
                ? `${String.fromCharCode(97 + enPassantTarget.col)}${8 - enPassantTarget.row}`
                : '-',
            halfMove: halfMove,
            fullMove: fullMove
        });
        return fen
    }

    /** Deleta o histórico quando o jogo termina */
    delete(gameId: string) {
        this.histories.delete(gameId);
    }
}
