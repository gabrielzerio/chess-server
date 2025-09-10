// NotationManager.ts
import { Board, EnPassantTarget, FENOptions } from "../models/types";
import { boardToFEN } from "../utils/boardToFEN";
import { GameHistory } from "./GameHistory";

export class NotationManager {
    private histories: Map<string, GameHistory> = new Map();

    createGame(gameId: string) {
        if (this.histories.has(gameId)) {
            throw new Error(`Game ${gameId} já existe`);
        }
        this.histories.set(gameId, new GameHistory());
    }

    addMove(gameId: string, sanMove: string) {
        const history = this.histories.get(gameId);
        if (!history) throw new Error(`Game ${gameId} não encontrado`);
        history.addMove(sanMove);
    }

    setResult(gameId: string, result: string) {
        const history = this.histories.get(gameId);
        if (!history) throw new Error(`Game ${gameId} não encontrado`);
        history.setResult(result);
    }

    getPGN(gameId: string): string | null {
        const history = this.histories.get(gameId);
        if (!history) return null;
        return history.generatePGN();
    }

    public getFen(board: Board, enPassantTarget: EnPassantTarget, fenInfos: FENOptions): string {
        const { turn, castling, halfMove, fullMove } = fenInfos;
        return boardToFEN(board, {
            turn,
            castling,
            enPassant: enPassantTarget
                ? `${String.fromCharCode(97 + enPassantTarget.col)}${8 - enPassantTarget.row}`
                : '-',
            halfMove,
            fullMove
        });
    }

    delete(gameId: string) {
        this.histories.delete(gameId);
    }
}
