// managers/PlayerManager.ts
import { Player } from "../class/Player";

export class PlayerManager {
    private players: Player[] = [];

    public addPlayer(name: string): Player {
        const existing = this.players.find(p => p.getPlayerName() === name);
        if (existing) return existing;

        const player = new Player(name);
        this.players.push(player);
        return player;
    }

    public createPlayer(){
        
    }

    public getPlayerById(playerId: string): Player {
        const player = this.players.find(p => p.getPlayerId() === playerId);
        if (!player) throw new Error('Nenhum jogador com esse ID foi encontrado');
        return player;
    }

    public getAllPlayers(): Player[] {
        return [...this.players];
    }

    public removePlayer(playerId: string): boolean {
        const index = this.players.findIndex(p => p.getPlayerId() === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);
            return true;
        }
        return false;
    }
}
