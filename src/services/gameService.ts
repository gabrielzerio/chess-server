; import { Position } from '../models/types';
import { GameManager } from '../manager/GameManager';
import { GameRepository } from '../repositories/GameRepository';
import { PlayerRepository } from '../repositories/PlayerRepository';
import { Game } from '../class/game';
import { createInitialBoard } from '../utils/boardSetup';
import { Player } from '../class/Player';
import { GamePlayer } from '../class/GamePlayer';
import { GamePlayerRepository } from '../repositories/GamePlayerRepository';

export class GameService {
    private gameManager: GameManager;
    private gameRepository: GameRepository;
    private playerRepository: PlayerRepository;

    constructor(gameManager: GameManager, gameRepository: GameRepository, playerRepository: PlayerRepository) {
        this.gameManager = gameManager;
        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
    }

    public getPlayerById(playerId: string): any {
        return this.gameManager.getPlayerById(playerId);
    }

    public getGamePlayerById(playerId:string): GamePlayer{
        return this.gameManager.getPlayerById(playerId);
    }

    public createPlayer(playerName: string): string {
        const player = new Player(playerName);
        this.playerRepository.add(player);
        return player.getPlayerId();
    }

    public createNewGame(playerId: string): string {
        let gameId: string;
        do {
            gameId = this.generateRoomCode();
        } while (this.gameRepository.get(gameId)); // Garante que o ID seja único

        const game = new Game(createInitialBoard());

        this.gameRepository.add(gameId, game);
        console.log(`Game created: ${gameId}`);
        return gameId;
    }

    public addPlayerInGame(player: any, gameId: string): any {
        return this.gameManager.addPlayerToGame(gameId, player);
    }

    public getGame(gameId: string): any {
        return this.gameManager.getGame(gameId);
    }

    public getAllGames() {
        return this.gameRepository.getAll();
    }

    public getAllPlayers() {
        return this.playerRepository.getAll()
    }

    public deleteGame(gameId: string): boolean {
        return this.gameManager.deleteGame(gameId);
    }



    private generateRoomCode(): string {
        // Cria um array com os códigos ASCII para 'a' até 'z' (97-122) e '0' até '9' (48-57)
        const charCodes = [
            ...Array.from({ length: 26 }, (_, i) => 97 + i), // a-z
            ...Array.from({ length: 10 }, (_, i) => 48 + i)  // 0-9
        ];

        const roomCode = Array.from({ length: 5 }, () =>
            String.fromCharCode(charCodes[Math.floor(Math.random() * charCodes.length)])
        ).join('');

        return roomCode;
    }
}
