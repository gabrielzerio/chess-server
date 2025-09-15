import { Player } from "../class/Player";
import { PlayerRepository } from "../repositories/PlayerRepository";

export class PlayerService {
    playerRepository: PlayerRepository;
    constructor(playerRepository: PlayerRepository) {
        this.playerRepository = playerRepository;
    }

    getAllPlayers(): Player[] {
        return this.playerRepository.getAll();
    }

    createPlayer(playerName: string): Player {
        const player = new Player(playerName);
        this.playerRepository.add(player);
        return player;
    }

    getPlayer(playerId: string): Player | null {
        const player = this.playerRepository.getById(playerId);
        return player
    }



}