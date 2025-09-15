import { GameManager } from '../manager/GameManager';
import { GameRepository } from '../repositories/GameRepository';
import { createInitialBoard } from '../utils/boardSetup';
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
        const game = this.gameRepository.get(gameId);
        return game;
    }


    public getGamePlayerById(gameId: string, playerId: string): GamePlayer | null {
        // const game = this.getGame(gameId);
        try {
            const gamePlayer = this.gameRepository.getGamePlayer(gameId, playerId);
            return gamePlayer
        } catch (Error) {
            console.log(Error);
            return null;
        }
    }

    public createNewGame(playerId: string): string {
        let gameId: string;
        do {
            gameId = this.generateRoomCode();
        } while (this.gameRepository.exists(gameId)); // Garante que o ID seja único

        const initialBoard = createInitialBoard();
        const game = this.gameManager.createGame(gameId, initialBoard); //delega ao manager criar uma instancia de game, ele retorna para o service salvar no repo
        this.notationManager.createGame(gameId); //cria um novo notationManager
        this.gameRepository.add(gameId, game);
        console.log(`Game created: ${gameId}`);

        return gameId;
    }

    public addPlayerInGame(playerId: string, gameId: string): GamePlayer {
        // 1. Validação inicial: O jogo existe? (Falha Rápida)
        //    getGame já lança um erro se o jogo não for encontrado, o que é perfeito.
        const game = this.getGame(gameId);

        // 2. O jogador já está no jogo? (Caso de Reconexão)
        const gamePlayerExists = this.gameRepository.gamePlayerExists(gameId, playerId);
        if (gamePlayerExists) {
            // A lógica de reconexão é basicamente marcar o jogador como online.
            console.log('jaexiste?')
            return this.reconnectPlayerInGame(playerId, gameId);
        }

        // // 3. O jogador não está no jogo. Vamos adicioná-lo.
        // //    Primeiro, verificamos se há espaço. (Exemplo de lógica)
        // if (this.gameManager.isGameFull(game)) {
        //     throw new GameFullError('O jogo já está cheio.');
        // }

        // // 4. Valida se o player existe no sistema (opcional, mas bom)
        const player = this.playerService.getPlayer(playerId);
        if (!player) {
            throw new Error('Jogador não encontrado no sistema.');
        }

        // 5. Lógica principal: Adicionar o novo jogador ao jogo.
        //    Esta era a parte que estava faltando.
        const newGamePlayer = this.gameManager.addPlayerToGame(game, player);
        if (newGamePlayer) {
            // this.notationManager.setGameTag(gameId, tag, newGamePlayer?.getPlayerName());
        }
        if (!newGamePlayer) {
            // Se por algum motivo não foi possível adicionar, lançamos um erro genérico.
            throw new Error('Falha ao adicionar o jogador ao jogo.');
        }

        return newGamePlayer;
    }

    private reconnectPlayerInGame(playerId: string, gameId: string): GamePlayer {
        const game = this.getGame(gameId);
        // Delega a lógica de mudança de status para o gameManager
        const gamePlayer = this.gameManager.setPlayerOnlineStatus(game, playerId, true);

        // A verificação '!= null' era redundante. Se gamePlayer puder ser null,
        // é melhor lançar um erro, pois uma reconexão não deveria falhar.
        if (!gamePlayer) {
            throw new Error(`Falha ao reconectar o jogador ${playerId} no jogo ${gameId}.`);
        }
        return gamePlayer;
    }

    public getGameExists(gameId: string): boolean {
        return this.gameRepository.exists(gameId);
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
    getGameOverData(gameId: string, message?: string) {
        const game = this.getGame(gameId);
        const winner = game.getWinner()?.getPlayerName();
        const status = game.getStatus();
        return { winner: winner, status: status, message };
    }

    private disconnectCallback(gameId: string, disconnectedPlayerId: string): DisconnectResult | null {

        try {
            if (!this.getGameExists(gameId)) {
                return null;
            }
            const game = this.getGame(gameId);

            const disconnectedPlayer = game.getGamePlayerById(disconnectedPlayerId);

            // Encontra o jogador que *não* é o que desconectou
            const winner = game.getAllGamePlayers().find(p => p.getPlayerId() !== disconnectedPlayerId);

            this.setWinner(gameId, winner, 'abandoned');
            // game.setStatus('ended'); // Atualiza o estado do jogo

            return {
                status: 'abandoned',
                // Usa o nome do vencedor encontrado, com um fallback.
                playerWinner: winner?.getPlayerName() || 'outro jogador',
                message: `${disconnectedPlayer?.getPlayerName() || 'O jogador'} não se reconectou a tempo`
            };
        } catch (error) {
            console.log(error);
            return null
        }
    }

    // Delegação correta para reconexão com timer
    public async handlePlayerDisconnect(gameAndPlayerId: GameAndPlayerID, timeoutMs:number): Promise<DisconnectResult | null> {
        const game = this.getGame(gameAndPlayerId.gameId);
        const gameId = gameAndPlayerId.gameId;
        if (!game) {
            return null;
        }

        const { playerId } = gameAndPlayerId;

        // Aguarda a resolução da Promise do GameManager
        const finalResult = await this.gameManager.handlePlayerDisconnect(
            game,
            playerId,
            // Passa o callback como referência, usando 'bind(this)' para manter o contexto
            () => this.disconnectCallback(gameId, playerId),
            timeoutMs
        );

        // Se não houver mais jogadores, a sala pode ser limpa aqui
        const activePlayers = game.getAllGamePlayers();
        const online = activePlayers.filter(p => p.isOnline);
        // this.gameManager.setWinner(game, online);
        // await this.saveGame(gameAndPlayerId.gameId);
        if (online.length < 1) {
            // const pgn = this.notationManager.getPGN(gameAndPlayerId.gameId);
            // console.log(pgn);

            // console.log('tem que fazer a operacao de deletar jogo')
            this.gameRepository.remove(gameAndPlayerId.gameId);
        }

        return finalResult; // Retorna o resultado (que pode ser o objeto ou null)
    }

    private async saveGame(gameId: string) {
        const game = this.getGame(gameId);
        const players = this.gameManager.getGamePlayersAtGame(game);
        const whitePlayer = players.find(p => p.color == 'white');
        const blackPlayer = players.find(p => p.color == 'black');
        const playerWinner = this.gameManager.getWinner(game);
        const pgn = this.notationManager.getPGN(gameId);
        if (whitePlayer !== undefined && blackPlayer !== undefined && pgn !== null && playerWinner !== undefined) {
            // const infos: IGame = { playerWhite: whitePlayer.getPlayerName(), playerBlack: blackPlayer.getPlayerName(), pgn: pgn, winner: playerWinner, roomCode: gameId };
            await this.gameRepository.saveGameToDB(
                whitePlayer.getPlayerId(),
                whitePlayer.getPlayerName(),
                blackPlayer.getPlayerId(),
                blackPlayer.getPlayerName(),
                playerWinner.getPlayerId(),
                playerWinner.getPlayerName(),
                pgn
            );
        }
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
            if (moveResult.winner) {
                this.setWinner(gameId, moveResult.winner, moveResult.status); // só usa para setar result no notationmanager
                // const result = moveResult.winner.color === 'white' ? '1-0' : '0-1';
                // this.notationManager.setResult(gameId, result)
            }
            return moveResult;
        }
        return null;
    }



    async setWinner(gameId: string, gamePlayer?: GamePlayer, gameStatus?: GameStatus) {
        if (gamePlayer) {
            const result = gamePlayer.color === 'white' ? '1-0' : '0-1';
            this.notationManager.setResult(gameId, result);
            const game = this.getGame(gameId);
            game.setWinner(gamePlayer);

            if (gameStatus) {
                game.setStatus(gameStatus);
            }

            if (gameStatus === 'ended' || gameStatus === 'checkmate' || gameStatus === 'abandoned') {
                await this.saveGame(gameId);
                this.gameRepository.remove(gameId);
            }
        }
    }


    public setTimer(gameId: string, gamePlayerId: string) {
        const game = this.getGame(gameId);

        // pega todos os jogadores
        const players = this.gameManager.getGamePlayersAtGame(game);

        // descobre o próximo (quem NÃO é o atual)
        const nextPlayer = players.find(p => p.getPlayerId() !== gamePlayerId);

        if (nextPlayer) {
            this.gameManager.switchTurn(gameId, nextPlayer.getPlayerId());
        }
    }



    timerCallback(gameId: string, playerId: string) {
        if(!this.getGameExists(gameId)){
            return null;
        }
        const game = this.getGame(gameId);
        const opponent = this.gameManager.getGamePlayersAtGame(game).find(p => p.getPlayerId() !== playerId);

        if (opponent) {
            this.setWinner(gameId, opponent, 'ended');
        }
    }

    public startGameTimers(gameId: string, initialTimeMs: number = 300000): Promise<{ gameId: string, playerId: string }> | undefined {
        try {
            const game = this.getGame(gameId);
            const players = this.gameManager.getGamePlayersAtGame(game);
            const playerIds = players.map((p) => {
                return p.getPlayerId();
            });
            return new Promise((resolve) => {
                this.gameManager.startGameTimers(
                    gameId,
                    playerIds,
                    initialTimeMs,
                    (gameId, playerId) => {
                        this.timerCallback(gameId, playerId);
                        resolve({ gameId, playerId });
                    }
                );

            });
        } catch (error) {
            console.log(error);

        }
    }

    getTimersByGame(gameId: string): { white: number; black: number } | undefined {
        const game = this.getGame(gameId);
        const timers = this.gameManager.getTimer(gameId);

        if (!timers || !game) return undefined;

        const result: { white: number; black: number } = { white: 0, black: 0 };

        for (const player of game.getAllGamePlayers()) {
            const time = timers.get(player.getPlayerId()) ?? 0;
            result[player.color] = time;
        }
        return result;
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
