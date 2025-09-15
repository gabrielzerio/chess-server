import { randomUUID } from "crypto";

export class Player {
    private playerName: string;
    // private color?: PieceColor;
    private playerId: string;
    // private elo: number;
    // private isOnline: boolean;
    // private disconnectedAt?: number;

    constructor(playerName: string) {
        this.playerName = playerName;
        this.playerId = randomUUID();
        // this.isOnline = false;
    }

    // getColor(): PieceColor {
    //     return this.color;
    // }

    getPlayerName(): string {
        return this.playerName;
    }

    // getIsOnline(): boolean {
    //     return this.isOnline;
    // }

    getPlayerId():string{
        return this.playerId;
    }
}