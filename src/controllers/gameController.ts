import { Server as SocketIOServer, Socket } from 'socket.io';
import { Game } from '../class/game'; // Sua classe Game
import { Position, PieceType, GameAndPlayerID } from '../models/types'; // Seus tipos
import { createInitialBoard } from '../utils/boardSetup'; // Sua função de criação de tabuleiro
import { Player } from '../class/Player';
import { GamePlayer } from '../class/GamePlayer';


// Definindo o tipo para a coleção de jogos
interface ActiveGames {
    [gameId: string]: Game;
}
interface PossibleMovesResponse {
    normalMoves: Position[];
    captureMoves: Position[];
}

export class GameController {
    private io: SocketIOServer;
    private games: ActiveGames = {}; // Armazena instâncias de Game por gameId
    private players: Player[] = [];
    // Map para armazenar timers de reconexão
    private reconnectionTimers: Map<string, { timer: NodeJS.Timeout, disconnectedPlayerID: string }> = new Map();

    constructor(io: SocketIOServer) {
        this.io = io;
    }

    public getPlayerById(player: string):Player {
        const playerFound = this.players.find(p => player === p.getPlayerId());
        if (playerFound) return playerFound;
        else
            throw Error('Nenhum player existe com esse Id')
    }

    public getAllplayers(): Player[] {
        return this.players;
    }

    public getAllGames(): ActiveGames {
        return this.games;
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

    public createPlayer(playerName: string): Player {
        const player = new Player(playerName);
        this.players.push(player);
        return player;
    }

    public createNewGame(playerId: string): string {
        let gameId: string;
        do {
            gameId = this.generateRoomCode();
        } while (this.games[gameId]); // Garante que o ID seja único

        const game = new Game(createInitialBoard());

        // A lógica de adicionar jogador e armazenar o jogo agora é mais direta.
        // Se addPlayer lançar um erro, ele será propagado para o controller.

        // Checagem de segurança para garantir que o playerId foi criado.
        // if (!player || !player.playerId) {
        //     throw new Error("Falha ao criar o jogador ou o ID do jogador está nulo.");
        // }

        this.games[gameId] = game;
        console.log(`Game created: ${gameId}`);
        return gameId;
    }

    public addPlayerInGame(player: Player, gameId: string): GamePlayer {
        const game = this.getGame(gameId);
        if (!game) {
            // Lança um erro se o jogo não for encontrado.
            throw new Error("Game not found.");
        }
        // A chamada para addPlayer pode lançar GameFullError, que será capturado pelo controller HTTP.
        const gamePlayer = game.addPlayer(player);
        return gamePlayer;
    }

    public getGame(gameId: string): Game | null {
        if (!this.games[gameId]) {
            return null
        }
        return this.games[gameId];
    }

    public deleteGame(gameId: string): boolean {
        if (this.games[gameId]) {
            // Notificar jogadores que o jogo foi deletado (se houver)
            this.io.to(gameId).emit('gameDeleted', { gameId, message: 'Game has been deleted.' });
            // Remover sockets da sala e do map
            this.io.sockets.in(gameId).socketsLeave(gameId);
            delete this.games[gameId];
            console.log(`Game deleted: ${gameId}`);
            return true;
        }
        return false;
    }

    // metodo é chamado uma vez quando um novo socket se conecta
    public handleSocketConnection(socket: Socket): void {
        // console.log(socket.handshake);
        try {
            console.log(`Socket connected: ${socket.playerId}`);
            socket.on('joinGame', () => this.handlePlayerJoin(socket));
            socket.on('requestPossibleMoves', (data: { from: Position }, callback: (res: PossibleMovesResponse) => void) => this.handleRequestPossibleMoves(socket, data.from, callback));
            socket.on('makeMove', (data: { from: Position; to: Position; promotionType?: PieceType }) => this.handleMakeMove(socket, data.from, data.to, data.promotionType));
            socket.on('disconnect', () => this.handlePlayerDisconnect(socket));
        } catch (error) {
            console.error(error);
        }


    }
    // private requestGameInfos(socket:Socket, callback:(res:GameAndplayerId) => void):void {
    //      socket.gameID = this.createNewGame();
    //     socket.playerId = randomUUID();
    //     callback({gameID:socket.gameID, playerId:socket.playerId});
    // }

    // private handlePlayerJoin(socket: Socket, gameId: string, playerName: string): void {
    private handlePlayerJoin(socket: Socket): void {
        const playerId = socket.playerId;
        const gameId = socket.gameID;
        const game = this.getGame(socket.gameID);
        if (!playerId) {
            socket.emit('joinError', { message: "playerId don't exists null or undefined" })
            return;
        }

        if (!game) {
            socket.emit('joinError', { message: 'Game not found' });
            return;
        }

        let player = game.getPlayerByID(socket.playerId);

        if (!player) {
            console.log(player)
            socket.emit('joinError', { message: 'Player not found for this game.' });
            return;
        }

        if (!player.isOnline) {
            console.log(`Player ${player.getPlayerName()} (${playerId}) is reconnecting to game ${gameId}.`);
            game.setPlayerOnlineStatus(playerId, true); // Marca como online

            const timerInfo = this.reconnectionTimers.get(gameId);
            if (timerInfo && timerInfo.disconnectedPlayerID === playerId) {
                clearTimeout(timerInfo.timer);
                this.reconnectionTimers.delete(gameId);
                console.log(`Reconnection timer cleared for player ${playerId} in game ${gameId}.`);
            }

            if (game.getActivePlayersCount() === 2 && game.getStatus() !== 'playing') {
                game.setStatus('playing');
            }

            socket.join(gameId);
            socket.emit('boardUpdate', {
                board: game.serializeBoard(),
                color: player.color,
                turn: game.getTurn(),
                status: game.getStatus()
            });
            this.io.to(gameId).emit('playerReconnected', { playerId, playerName: player.getPlayerName(), status: game.getStatus() });
            this.io.to(socket.id).emit('joinedGame', {
                board: game.serializeBoard(), color: player.color, turn: game.getTurn(), status: game.getStatus()
            });
        } else {
            // Lógica de join normal (jogador já estava online ou é o primeiro join do socket)
            socket.join(gameId);
            socket.emit('joinedGame', {
                board: game.serializeBoard(),
                color: player.color,
                turn: game.getTurn(),
                status: game.getStatus()
            });
            socket.to(gameId).emit('roomJoinMessage', { playerName: player.getPlayerName() })
            if (game.getActivePlayersCount() === 2) {
                game.setStatus('playing')

                // Lógica para iniciar o jogo se ambos os jogadores estiverem online e o jogo estiver esperando
                if (game.getStatus() === 'waiting' && game.getActivePlayersCount() === 2) {
                    game.setStatus('playing');
                    this.io.to(gameId).emit('gameUpdate', {
                        board: game.serializeBoard(),
                        turn: game.getTurn(),
                        status: game.getStatus(), // Agora 'playing'
                        message: 'Game started! Both players are connected.'
                    });
                } else if (game.getStatus() === 'waiting') {
                    // Ainda esperando o segundo jogador
                    this.io.to(gameId).emit('gameUpdate', { status: game.getStatus(), players: game.getPlayers().map(p => ({ playerName: p.getPlayerName(), isOnline: p.isOnline })), message: 'Waiting for opponent to connect.' });
                }
            }
        }
        console.log(`Player ${player?.getPlayerName()} (${socket.playerId}) joined game ${socket.gameID}`);
    }

    private handleRequestPossibleMoves(socket: Socket, from: Position, callback: (res: PossibleMovesResponse) => void): void {

        const gameId = socket.gameID;
        if (!gameId) {
            socket.emit('error', { message: 'Not in a game to request moves.' });
            return;
        }
        const game = this.getGame(gameId);
        if (!game) {
            socket.emit('error', { message: 'Associated game not found.' });
            return;
        }

        const player = game.getPlayerByID(socket.playerId);
        if (!player || player.color !== game.getTurn()) {
            socket.emit('possibleMovesResponse', { normalMoves: [], captureMoves: [], message: 'Not your turn or not valid player.' });
            return;
        }
        const piece = game.getSelectedPiece(from);
        if (!piece || piece.color !== game.getTurn()) {
            socket.emit('possibleMovesResponse', { normalMoves: [], captureMoves: [], message: 'No piece or not your piece.' });
            return;
        }
        const { normalMoves, captureMoves } = game.possibleMoves(piece);
        callback({ normalMoves, captureMoves }); //aqui vou colocar todos os dados que quero devolver para a 'requisição
        // socket.emit('possibleMovesResponse', { normalMoves, captureMoves }); 
        console.log(`Possible moves requested by ${socket.playerId} for game ${socket.gameID}`);
    }

    private async handleMakeMove(socket: Socket, from: Position, to: Position, promotionType?: PieceType): Promise<void> {
        const game = this.getGame(socket.gameID);
        if (!game) {
            return
        }
        if (!game) {
            socket.emit('moveError', { message: 'Associated game not found.' });
            return;
        }
        if (game.getStatus() !== "playing") {
            socket.emit('moveError', { message: 'O jogador inimigo ainda não entrou' });
            return;
        }
        const piece = game.getSelectedPiece(from);
        if (!piece) return;
        
        const player = game.getPlayerByID(socket.playerId);
        if(!player){
            socket.emit('moveError', { message: 'Jogador não encontrado' });
            return
        }

        const moveResult = await game.applyMove(player?.player, from, to, promotionType);
        // console.log(moveResult.message);
        if (moveResult.success) {
            this.io.to(socket.gameID).emit('boardUpdate', { board: moveResult.board, turn: moveResult.turn, status: moveResult.status });
            if (moveResult.winner) {
                this.io.to(socket.gameID).emit('gameOver', { winner: game.getTurn() === 'white' ? 'black' : 'white', status: moveResult.status, playerWinner: player?.getPlayerName() });
                // Considera remover o jogo se ele acabou
                // this.deleteGame(gameId); // Descomentar se quiser remover automaticamente
            } else if (moveResult.status === 'checkmate') {
                // Caso específico de xeque-mate sem winner direto no retorno, trate aqui
                this.io.to(socket.gameID).emit('gameOver', { winner: game.getTurn() === 'white' ? 'black' : 'white', message: "Cheque mate", status: moveResult.status, playerWinner: player?.getPlayerName() });
                // this.deleteGame(gameId);
            }
        } else {
            socket.emit('moveError', { message: 'Invalid move.' });
        }
    }

    private async handlePlayerDisconnect(socket: Socket): Promise<void> {
        const gameId = socket.gameID;
        const playerId = socket.playerId;
        const game = this.getGame(gameId);
        if (!game) {
            return
        }
        if (!gameId) {
            console.log(`Socket ${socket.id} (PlayerID: ${playerId}) disconnected, not in an active game.`);
            return;
        }
        const playerWinner = game.getPlayerByID(playerId);

        let disconnectedPlayerName = "Unknown";

        if (game) {
            const player = game.setPlayerOnlineStatus(playerId, false); // Marca o jogador como offline
            if (player) {
                disconnectedPlayerName = player.getPlayerName();
                // this.io.to(gameId).emit('playersUpdate', {
                //     playerId,
                //     playerName: player.playerName,
                //     message: `${player.playerName} has disconnected.`
                // });

                if (game.getStatus() === 'playing' && game.getActivePlayersCount() < 2) {
                    game.setStatus('paused_reconnect');
                    const RECONNECTION_TIMEOUT_MS = 3000; // 1 minuto

                    this.io.to(gameId).emit('gamePausedForReconnect', {
                        disconnectedPlayerName: playerWinner?.getPlayerName(),
                        gameStatus: game.getStatus(),
                        timeLeft: RECONNECTION_TIMEOUT_MS // envia em segundos
                    });

                    const timer = setTimeout(() => {
                        const currentGame = this.getGame(gameId);
                        const timerInfo = this.reconnectionTimers.get(gameId);

                        if (currentGame && timerInfo && timerInfo.disconnectedPlayerID === playerId && currentGame.getStatus() === 'paused_reconnect') {
                            const stillDisconnectedPlayer = currentGame.getPlayerByID(playerId);
                            const playerWinner = currentGame.getPlayers().find(p => p.getPlayerId() !== playerId);

                            if (stillDisconnectedPlayer && !stillDisconnectedPlayer.isOnline) {
                                if (playerWinner) {
                                    currentGame.setStatus('ended');
                                    this.io.to(gameId).emit('gameOver', {
                                        status: 'abandoned',
                                        playerWinner: playerWinner.getPlayerName(),
                                        message: `${stillDisconnectedPlayer.getPlayerName()} não se reconectou a tempo`
                                    });
                                } else {
                                    currentGame.setStatus('abandoned');
                                    this.io.to(gameId).emit('gameAbandoned', { message: 'Game abandoned due to unresolved disconnection.' });
                                }
                                this.deleteGame(gameId);
                            }
                        }
                        this.reconnectionTimers.delete(gameId);
                    }, RECONNECTION_TIMEOUT_MS);

                    this.reconnectionTimers.set(gameId, { timer, disconnectedPlayerID: playerId });
                    console.log(`Reconnection timer started for player ${playerId} in game ${gameId}.`);
                }
                if (game.getActivePlayersCount() < 1) {
                    this.deleteGame(gameId)
                }
            }
        }
        console.log(`Player ${disconnectedPlayerName} (${playerId}, socket ${socket.id}) disconnected from game ${gameId}.`);
    }
}