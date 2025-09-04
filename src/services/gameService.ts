import { GameManager } from '../manager/GameManager';
import { GameRepository } from '../repositories/GameRepository';
import { PlayerRepository } from '../repositories/PlayerRepository';
import { createInitialBoard } from '../utils/boardSetup';
import { Player } from '../class/Player';
import { GamePlayer } from '../class/GamePlayer';
import { ApplyMoveResult, DisconnectResult, GameAndPlayerID, GameStatus, IGame, PieceColor, PieceType, Position } from '../models/types';
import { NotationManager } from '../manager/NotationManager';
import { Game } from '../class/game';
import { PlayerService } from './playerService';

export class GameService {
    private gameManager: GameManager;
    private gameRepository: GameRepository;
    // private playerRepository: PlayerRepository;
    // private games: Map<string, IGame> = new Map();
    private notationManager: NotationManager;
    private playerService: PlayerService;

    constructor(gameManager: GameManager, gameRepository: GameRepository, notationManager: NotationManager, playerService: PlayerService) {
        this.gameManager = gameManager;
        this.gameRepository = gameRepository;
        // this.playerRepository = playerRepository;
        this.notationManager = notationManager;
        this.playerService = playerService;
    }

    private getGame(gameId: string): Game {
        return this.gameRepository.get(gameId);
    }

    public getGamePlayerById(gameId: string, playerId: string): GamePlayer | null {
        const game = this.getGame(gameId);
        const gamePlayer = game.getGamePlayerById(playerId);
        if (gamePlayer) {
            return gamePlayer
        }
        return null;
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

    public addPlayerInGame(playerId: string, gameId: string): GamePlayer | null {
        const player = this.playerService.getPlayer(playerId);
        const game = this.getGame(gameId);

        if (player) {
            return this.gameManager.addPlayerToGame(game, player);
        }
        return null;
    }

    public getGameExists(gameId: string): boolean {
        return !!this.getGame(gameId); // O duplo '!' converte o objeto (ou null) para um booleano
    }

    public getAllGames() {
        return this.gameRepository.getAll();
    }

    // public getAllPlayers() {
    //     return this.playerRepository.getAll()
    // }

    // Stub para dados de entrada no jogo
    getJoinGameData(gameId: string, playerId: string) {
        // Implemente a lógica real ou delegue ao GameManager
        // return { error: 'Método não implementado', board: null, color: null, turn: null, status: 'waiting', playerName: '', players: [] };
        const game = this.getGame(gameId);

        const board = this.gameManager.getBoard(game);
        const color = game.getGamePlayerById(playerId).color;
        const turn = this.gameManager.getGameTurn(game);
        const status = this.gameManager.getGameStatus(game);
        const playerName = game.getGamePlayerById(playerId).getPlayerName();
        const players = this.gameManager.getPlayersInGame(game);
        return { board, color, turn, status, playerName, players };
    }

    // Stub para atualizar status do jogo
    setGameStatus(gameId: string, status: GameStatus) {
        const game = this.getGame(gameId);
        this.gameManager.setGameStatus(game, status);
        return true;
    }

    // Stub para dados de atualização do tabuleiro
    getBoardUpdateData(gameId: string) {
        const game = this.getGame(gameId);
        const board = game.serializeBoard();
        const turn = game.getTurn();
        const status = game.getStatus();

        return { board: board, turn: turn, status: status };
    }

    // Stub para dados de fim de jogo
    getGameOverData(gameId: string, playerId: string, message?: string) {
        // Implemente a lógica real ou delegue ao GameManager
        return { winner: null, status: 'ended', playerWinner: null, message };
    }

    private disconnectCallback(game: Game, disconnectedPlayerId: string): DisconnectResult {
        const disconnectedPlayer = game.getGamePlayerById(disconnectedPlayerId);

        // Encontra o jogador que *não* é o que desconectou
        // const winner = game.getPlayers().find(p => p.getPlayerId() !== disconnectedPlayerId);

        game.setStatus('ended'); // Atualiza o estado do jogo

        return {
            status: 'abandoned',
            // Usa o nome do vencedor encontrado, com um fallback.
            playerWinner: 'o outro jogador',
            message: `${disconnectedPlayer?.getPlayerName() || 'O jogador'} não se reconectou a tempo`
        };
    }

    // Delegação correta para reconexão com timer
    public async handlePlayerDisconnect(gameAndPlayerId: GameAndPlayerID, timeoutMs: number = 60000): Promise<DisconnectResult | null> {
        const game = this.getGame(gameAndPlayerId.gameId);
        if (!game) {
            return null;
        }

        const { playerId } = gameAndPlayerId;

        // Aguarda a resolução da Promise do GameManager
        const finalResult = await this.gameManager.handlePlayerDisconnect(
            game,
            playerId,
            // Passa o callback como referência, usando 'bind(this)' para manter o contexto
            this.disconnectCallback.bind(this),
            timeoutMs
        );

        // Se não houver mais jogadores, a sala pode ser limpa aqui
        const activePlayers = game.countPlayersInGame();
        if (activePlayers < 1) {
            console.log('tem que fazer a operacao de deletar jogo')
            // this.deleteGame(gameAndPlayerId.gameId);
        }

        return finalResult; // Retorna o resultado (que pode ser o objeto ou null)
    }

    public deleteGame(gameAndPlayerId: GameAndPlayerID): void {
        const { gameId, playerId } = gameAndPlayerId;
        const game = this.getGame(gameId);
        const player = this.gameManager.getGamePlayersAtGame(game);
        const whitePlayer = player.find(p => p.color == 'white');
        const blackPlayer = player.find(p => p.color == 'black');
        const playerWinner = this.gameManager.getWinner(game)?.getPlayerName();
        const pgn = this.notationManager.getPGN(gameId);
        if (whitePlayer !== undefined && blackPlayer !== undefined && pgn !== null && playerWinner !== undefined) {
            const infos: IGame = { playerWhite: whitePlayer.getPlayerName(), playerBlack: blackPlayer.getPlayerName(), pgn: pgn, winner: playerWinner, roomCode: gameId };
            // this.saveGame(gameAndPlayerId.gameId, infos)
        }
        this.gameRepository.remove(gameId);
    }

    public getGameTurn(gameId: string) {
        const game = this.getGame(gameId);
        return game.getTurn();
    }

    public getGameStatus(gameId: string): GameStatus {
        const game = this.getGame(gameId);
        return game.getStatus();
    }

    public getPossibleMoves(from: Position, gameAndPlayerId: GameAndPlayerID): { normalMoves: Position[], captureMoves: Position[] } | null {
        const game = this.getGame(gameAndPlayerId.gameId);
        return this.gameManager.getPossibleMoves(game, from);
    }

    public async makeMove(gameId: string, playerId: string, from: Position, to: Position, promotionType?: PieceType): Promise<ApplyMoveResult | null> {
        const game = this.getGame(gameId);
        const player = this.getGamePlayerById(gameId, playerId);
        if (player) {
            const moveResult = await this.gameManager.makeMove(game, player, from, to, promotionType);
            if (moveResult.san) {
                this.notationManager.addMove(gameId, moveResult.san);
            } else {
                console.log('nenhuma notacao enviada')
            }
            return moveResult;
        }
        return null;
    }

    public startTimer(gameId: string) {
        const game = this.getGame(gameId);
        const turn = this.gameManager.getGameTurn(game);
        this.gameManager.startPlayerTimer(gameId, turn);
    }

    public setTimer(gameId: string) {
        const game = this.getGame(gameId);
        const player = this.gameManager.getGameTurn(game);
        this.gameManager.switchTurn(gameId, game.getTurn())
    }

    getTimersByGame(gameId: string) {
        return this.gameManager.getTimer(gameId);
    }

    public startGameTimers(gameId: string, initialTimeMs: number = 300000) { // 5 minutos padrão
        const game = this.getGame(gameId);
        this.gameManager.startGameTimers(gameId, game.getTurn(), initialTimeMs);
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
