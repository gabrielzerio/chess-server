import { GameManager } from '../manager/GameManager';
import { GameRepository } from '../repositories/GameRepository';
import { PlayerRepository } from '../repositories/PlayerRepository';
import { createInitialBoard } from '../utils/boardSetup';
import { Player } from '../class/Player';
import { GamePlayer } from '../class/GamePlayer';
import { ApplyMoveResult, GameAndPlayerID, GameStatus, IGame, PieceColor, PieceType, Position } from '../models/types';
import { NotationManager } from '../manager/NotationManager';

export class GameService {
    private gameManager: GameManager;
    private gameRepository: GameRepository;
    private playerRepository: PlayerRepository;
    private games: Map<string, IGame> = new Map();
    private notationManager: NotationManager;

    constructor(gameManager: GameManager, gameRepository: GameRepository, playerRepository: PlayerRepository, notationManager: NotationManager) {
        this.gameManager = gameManager;
        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
        this.notationManager = notationManager;
    }



    public playerExists(playerId: string): boolean {
        const player = this.gameManager.getPlayerById(playerId);
        if (player) {
            return true;
        }
        return false;
    }

    public getGamePlayerById(gameId: string, playerId: string): GamePlayer | null {
        const gamePlayer = this.gameManager.getGamePlayerById(playerId, gameId);
        if (gamePlayer) {
            return gamePlayer
        }
        return null;
    }


    public createPlayer(playerName: string): Player {
        const player = new Player(playerName);
        this.playerRepository.add(player);
        return player;
    }

    public createNewGame(playerId: string): string {
        let gameId: string;
        do {
            gameId = this.generateRoomCode();
        } while (this.gameRepository.get(gameId)); // Garante que o ID seja único

        const initialBoard = createInitialBoard();
        const game = this.gameManager.createGame(gameId, initialBoard); //delega ao manager criar uma instancia de game, ele retorna para o service salvar no repo
        this.notationManager.createGame(gameId);
        this.gameRepository.add(gameId, game);
        console.log(`Game created: ${gameId}`);

        return gameId;
    }

    public getPlayer(playerId: string): Player | null {
        const player = this.playerRepository.getById(playerId);
        if (player) {
            return player;
        }
        return null;
    }

    public addPlayerInGame(playerId: string, gameId: string): GamePlayer | null {
        const player = this.getPlayer(playerId)
        if (player) {
            return this.gameManager.addPlayerToGame(gameId, player);
        }
        return null;
    }

    // private getGame(gameId: string): Game | null {
    //     const game = this.gameManager.getGame(gameId);
    //     if (game) {
    //         return game;
    //     } else {
    //         return null;
    //     }
    // }
    public gameExists(gameId: string): boolean {
        return this.gameManager.gameExists(gameId);
    }

    public getAllGames() {
        return this.gameRepository.getAll();
    }

    public getAllPlayers() {
        return this.playerRepository.getAll()
    }
    public getGamePlayersAtGame(gameId: string): GamePlayer[] {
        return this.gameManager.getGamePlayersAtGame(gameId);
    }

    // Stub para dados de entrada no jogo
    getJoinGameData(gameId: string, playerId: string) {
        // Implemente a lógica real ou delegue ao GameManager
        // return { error: 'Método não implementado', board: null, color: null, turn: null, status: 'waiting', playerName: '', players: [] };
        const board = this.gameManager.getBoard(gameId);
        const color = this.gameManager.getGamePlayerById(playerId, gameId)?.color;
        const turn = this.gameManager.getGameTurn(gameId);
        const status = this.gameManager.getGameStatus(gameId);
        const playerName = this.gameManager.getGamePlayerById(playerId, gameId)?.getPlayerName();
        const players = this.gameManager.getPlayers(gameId);
        return { board, color, turn, status, playerName, players };
    }

    // Stub para atualizar status do jogo
    setGameStatus(gameId: string, status: GameStatus) {
        this.gameManager.setGameStatus(gameId, status);
        return true;
    }

    // Stub para dados de atualização do tabuleiro
    getBoardUpdateData(gameId: string) {
        const board = this.gameManager.getBoard(gameId);
        const turn = this.gameManager.getGameTurn(gameId);
        const status = this.gameManager.getGameStatus(gameId);

        return { board: board, turn: turn, status: status };
    }

    // Stub para dados de fim de jogo
    getGameOverData(gameId: string, playerId: string, message?: string) {
        // Implemente a lógica real ou delegue ao GameManager
        return { winner: null, status: 'ended', playerWinner: null, message };
    }

    // Delegação correta para reconexão com timer
    handlePlayerDisconnect(gameAndPlayerId: GameAndPlayerID, onTimeout: (gameId: string, playerId: string) => void, timeoutMs: number = 60000) {
        const { gameId, playerId } = gameAndPlayerId;
        this.gameManager.handlePlayerDisconnect(gameAndPlayerId, onTimeout, timeoutMs);
        const activePlayers = this.gameManager.getActivePlayersCount(gameId);

        if (activePlayers < 1) {
            this.deleteGame(gameAndPlayerId);
        }
    }

    public deleteGame(gameAndPlayerId: GameAndPlayerID): boolean {
        const { gameId, playerId } = gameAndPlayerId;

        const player = this.gameManager.getPlayers(gameId);
        const whitePlayer = player.find(p => p.color == 'white');
        const blackPlayer = player.find(p => p.color == 'black');
        const playerWinner = this.gameManager.getWinner(gameId)?.getPlayerName();
        const pgn = this.notationManager.getPGN(gameId);
        if (whitePlayer !== undefined && blackPlayer !== undefined && pgn !== null && playerWinner !== undefined) {
            const infos: IGame = { playerWhite: whitePlayer.getPlayerName(), playerBlack: blackPlayer.getPlayerName(), pgn: pgn, winner: playerWinner, roomCode: gameId };
            this.saveGame(gameAndPlayerId.gameId, infos)
        }
        return this.gameManager.deleteGame(gameId);
    }

    private saveGame(gameId: string, game: IGame) {
        this.games.set(gameId, game);
        console.log(this.games.get(gameId));
    }

    public getGameTurn(gameId: string) {
        return this.gameManager.getGameTurn(gameId);
    }

    public getGameStatus(gameId: string): GameStatus {
        return this.gameManager.getGameStatus(gameId);
    }

    public getPossibleMoves(from: Position, gameAndPlayerId: GameAndPlayerID): { normalMoves: Position[], captureMoves: Position[] } | null {
        return this.gameManager.getPossibleMoves(from, gameAndPlayerId);
    }

    public async makeMove(gameId: string, playerId: string, from: Position, to: Position, promotionType?: PieceType): Promise<ApplyMoveResult> {
        return await this.gameManager.makeMove(gameId, playerId, from, to, promotionType);
    }

    public startTimer(gameId: string) {
        const turn = this.gameManager.getGameTurn(gameId);
        this.gameManager.startPlayerTimer(gameId, turn);
    }
    public setTimer(gameId: string) {
        const player = this.gameManager.getGameTurn(gameId);
        this.gameManager.switchTurn(gameId, player)
    }

    getTimersByGame(gameId: string) {
        return this.gameManager.getTimer(gameId);
    }

    public startGameTimers(gameId: string, initialTimeMs: number = 300000) { // 5 minutos padrão
        this.gameManager.startGameTimers(gameId, initialTimeMs);
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
