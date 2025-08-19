// services/GameService.ts
import { EventEmitter } from 'events';
import { GameRepository } from '../repositories/GameRepository';
import { Game } from '../class/Game';
import { Player } from '../class/Player';
import { Position, PieceType, PieceColor } from '../models/types';
import { createInitialBoard } from '../utils/boardSetup';
import { PlayerManager } from '../manager/playerManager';

interface MoveResult {
    success: boolean;
    board: any;
    turn: string;
    status: string;
    winner?: boolean;
}

export class GameService {
    constructor(
        private playerManager: PlayerManager,
        private gameRepo: GameRepository
    ) { }

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

    public registerPlayer(name: string): Player {
        return this.playerManager.addPlayer(name);
    }

    public createGame(playerId: string): string {
        const player = this.playerManager.getPlayerById(playerId);
        const gameId = this.generateRoomCode(); // mesmo método que você já tinha
        const game = new Game();
        game.addPlayer(player, "white");
        this.gameRepo.save(gameId, game);
        return gameId;
    }

    public joinGame(playerId: string, gameId: string) {
        const player = this.playerManager.getPlayerById(playerId);
        const game = this.gameRepo.get(gameId);
        if (!game) throw new Error("Partida não encontrada");
        return game.addPlayer(player);
    }

    addPlayer(gameId: string, player: Player) {
        const game = this.gameRepo.get(gameId);
        if (!game) throw new Error('Game not found');
        const gp = game.addPlayer(player);
        this.emit('playerAdded', { gameId, player: gp });
        return gp;
    }

    makeMove(gameId: string, playerId: string, from: Position, to: Position, promotionType?: PieceType) {
        // lógica exata de validação e transformação...
        const game = this.gameRepo.get(gameId);
        if (!game) throw new Error('Game not found');
        const result: MoveResult = game.applyMove(/*...*/);
        this.gameRepo.save(gameId, game);
        this.emit('moveMade', { gameId, result });
    }

    // Reconnection, deleteGame, etc., todos checando no repo
    // ...
}
