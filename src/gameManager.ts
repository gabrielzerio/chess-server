// gameStore.ts (ou renomeie para gameManager.ts para maior clareza)

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Game } from './class/game'; // Sua classe Game
import { Player, Position, PieceType, GameStatus, GameAndPlayerID } from './models/types'; // Seus tipos
import { createInitialBoard } from './utils/boardSetup'; // Sua função de criação de tabuleiro

// Definindo o tipo para a coleção de jogos
interface ActiveGames {
    [gameId: string]: Game;
}
interface PossibleMovesResponse {
    normalMoves: Position[];
    captureMoves: Position[];
}

export class GameManager {
    private io: SocketIOServer;
    private games: ActiveGames = {}; // Armazena instâncias de Game por gameId
    // Map para armazenar timers de reconexão
    private reconnectionTimers: Map<string, { timer: NodeJS.Timeout, disconnectedPlayerID: string }> = new Map();

    constructor(io: SocketIOServer) {
        this.io = io;
    }

    // --- Métodos de Gerenciamento de Jogos (chamados principalmente pelo Express, ou internamente) ---

    public createNewGame(playerName:string): GameAndPlayerID | undefined {
        if(!playerName)
            return;
        const gameId = Math.random().toString(36).substr(2, 4);
        const game = new Game(createInitialBoard());
        let player;
        try {
            player = game.addPlayer(playerName);
        } catch (error) {
            throw error;
        }
        
        this.games[gameId] = game;
        
        console.log(`Game created: ${gameId}`);
        if(player.playerID)
            return {gameID:gameId, playerID:player.playerID};
        else
            return;
    }

    public getGame(gameId: string): Game{
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
        console.log(`Socket connected: ${socket.playerID}`);
        // socket.on('requestGameAndplayerID', (callback:(res:GameAndplayerID) => void) => this.requestGameInfos(socket, callback));
        // O 'this' deve se referir à instância do GameManager
        // socket.on('joinGame', (data: { gameId: string; playerName: string }) => this.handlePlayerJoin(socket, data.gameId, data.playerName));
        // socket.emit('session', {gameID:socket.gameID, playerID:socket.playerID});
        socket.on('joinGame', () => this.handlePlayerJoin(socket));
        socket.on('requestPossibleMoves', (data: { from: Position}, callback:(res:PossibleMovesResponse) => void) => this.handleRequestPossibleMoves(socket, data.from, callback));
        // socket.on('requestPossibleMoves', (data: { from: Position }) => this.handleRequestPossibleMoves(socket, data.from));
        socket.on('makeMove', (data: { from: Position; to: Position; promotionType?: PieceType }) => this.handleMakeMove(socket, data.from, data.to, data.promotionType));
        socket.on('disconnect', () => this.handlePlayerDisconnect(socket));

    }
    // private requestGameInfos(socket:Socket, callback:(res:GameAndplayerID) => void):void {
    //      socket.gameID = this.createNewGame();
    //     socket.playerID = randomUUID();
    //     callback({gameID:socket.gameID, playerID:socket.playerID});
    // }

    // private handlePlayerJoin(socket: Socket, gameId: string, playerName: string): void {
    private handlePlayerJoin(socket: Socket): void {
        const playerID = socket.playerID;
        const gameId = socket.gameID;
        const game = this.getGame(socket.gameID);
        
        if(!playerID){
            socket.emit('joinError', {message:"playerID don't exists null or undefined"})
            return;
        }
        
        if (!game) {
            socket.emit('joinError', { message: 'Game not found' });
            return;
        }
        
        let player = game.getPlayerByID(socket.playerID);

        if (!player) {
            socket.emit('joinError', { message: 'Player not found for this game.' });
            return;
        }
        
        // Lógica de reconexão
        if (!player.isOnline) {
            console.log(`Player ${player.playerName} (${playerID}) is reconnecting to game ${gameId}.`);
            game.setPlayerOnlineStatus(playerID, true); // Marca como online

            const timerInfo = this.reconnectionTimers.get(gameId);
            if (timerInfo && timerInfo.disconnectedPlayerID === playerID) {
                clearTimeout(timerInfo.timer);
                this.reconnectionTimers.delete(gameId);
                console.log(`Reconnection timer cleared for player ${playerID} in game ${gameId}.`);
            }
            
            if (game.getActivePlayersCount() === 2 && game.getStatus() === 'paused_reconnect') {
                game.setStatus('playing');
            }
            
            socket.join(gameId);
            socket.emit('boardUpdate', {
                board: game.serializeBoard(),
                color: player.color,
                turn: game.getTurn(),
                status: game.getStatus()
            });
            this.io.to(gameId).emit('playerReconnected', { playerID, playerName: player.playerName, status: game.getStatus() });
        } else {
            // Lógica de join normal (jogador já estava online ou é o primeiro join do socket)
            socket.join(gameId);
            socket.emit('joinedGame', {
                board: game.serializeBoard(),
                color: player.color,
                turn: game.getTurn(),
                status: game.getStatus()
            });
            game.setStatus('playing');
        }
        console.log(`Player ${player?.playerName} (${socket.playerID}) joined game ${socket.gameID}`);
    }

    private handleRequestPossibleMoves(socket: Socket, from: Position, callback: (res:PossibleMovesResponse) => void): void {
        // private handleRequestPossibleMoves(socket: Socket, from: Position): void {
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

        const player = game.getPlayerByID(socket.playerID);
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
        callback({normalMoves, captureMoves}); //aqui vou colocar todos os dados que quero devolver para a 'requisição
        // socket.emit('possibleMovesResponse', { normalMoves, captureMoves }); 
        console.log(`Possible moves requested by ${socket.playerID} for game ${socket.gameID}`);
    }

    private async handleMakeMove(socket: Socket, from: Position, to: Position, promotionType?: PieceType): Promise<void> {
        // const gameId = this.socketToGameMap.get(socket.id);
        const gameId = this.games[socket.gameID].getPlayerByID(socket.playerID);

        if (!gameId) {
            socket.emit('moveError', { message: 'Not in a game to make a move.' });
            return;
        }
        const game = this.getGame(socket.gameID);
        if (!game) {
            socket.emit('moveError', { message: 'Associated game not found.' });
            return;
        }
        if (game.getStatus() !== 'playing') {
            socket.emit('moveError', { message: 'Game is not in playing state.' });
            return;
        }
        game.setStatus('playing')

        const piece = game.getSelectedPiece(from);
        if(!piece) return;
        
        const moveResult = await game.applyMove(socket.playerID, from, to, promotionType);
        // console.log(moveResult.message);
        if (moveResult.success) {
            this.io.to(socket.gameID).emit('boardUpdate', { board: moveResult.board, turn: moveResult.turn, status: moveResult.status });
            if (moveResult.winner) {
                this.io.to(socket.gameID).emit('gameOver', { winner: moveResult.winner, status: moveResult.status });
                // Considera remover o jogo se ele acabou
                // this.deleteGame(gameId); // Descomentar se quiser remover automaticamente
            } else if (moveResult.status === 'checkmate') {
                // Caso específico de xeque-mate sem winner direto no retorno, trate aqui
                 this.io.to(socket.gameID).emit('gameOver', { winner: game.getTurn() === 'white' ? 'black' : 'white', status: moveResult.status });
                 // this.deleteGame(gameId);
            }
        } else {
            socket.emit('moveError', { message: 'Invalid move.' });
        }
    }

    private async handlePlayerDisconnect(socket: Socket): Promise<void> {
        const gameId = socket.gameID;
        const playerID = socket.playerID;

        if (!gameId) {
            console.log(`Socket ${socket.id} (PlayerID: ${playerID}) disconnected, not in an active game.`);
            return;
        }

        const game = this.getGame(gameId);
        let disconnectedPlayerName = "Unknown";

        if (game) {
            const player = game.setPlayerOnlineStatus(playerID, false); // Marca o jogador como offline
            if (player) {
                disconnectedPlayerName = player.playerName;
                this.io.to(gameId).emit('playersUpdate', { 
                    playerID, 
                    playerName: player.playerName,
                    message: `${player.playerName} has disconnected.`
                });
                    console.log(game.getStatus())

                if (game.getStatus() === 'playing' && game.getActivePlayersCount() < 2) {
                    game.setStatus('paused_reconnect');
                    const RECONNECTION_TIMEOUT_MS = 30000; // 2 minutos

                    this.io.to(gameId).emit('gamePausedForReconnect', {
                        disconnectedPlayerID: playerID,
                        gameStatus: game.getStatus(),
                        timeLeft: RECONNECTION_TIMEOUT_MS // envia em segundos
                    });

                    const timer = setTimeout(() => {
                        const currentGame = this.getGame(gameId);
                        const timerInfo = this.reconnectionTimers.get(gameId);

                        if (currentGame && timerInfo && timerInfo.disconnectedPlayerID === playerID && currentGame.getStatus() === 'paused_reconnect') {
                            const stillDisconnectedPlayer = currentGame.getPlayerByID(playerID);
                            if (stillDisconnectedPlayer && !stillDisconnectedPlayer.isOnline) {
                                const winner = currentGame.getPlayers().find(p => p.isOnline && p.playerID !== playerID);
                                if (winner) {
                                    currentGame.setStatus('ended');
                                    this.io.to(gameId).emit('gameOver', { winner: winner.color, status: 'abandoned', message: `${stillDisconnectedPlayer.playerName} failed to reconnect. ${winner.playerName} wins!` });
                                } else {
                                    currentGame.setStatus('abandoned');
                                    this.io.to(gameId).emit('gameAbandoned', { message: 'Game abandoned due to unresolved disconnection.' });
                                }
                                this.deleteGame(gameId); // Opcional: deletar o jogo após abandono
                            }
                        }
                        this.reconnectionTimers.delete(gameId);
                    }, RECONNECTION_TIMEOUT_MS);

                    this.reconnectionTimers.set(gameId, { timer, disconnectedPlayerID: playerID });
                    console.log(`Reconnection timer started for player ${playerID} in game ${gameId}.`);
                }
            }
        }
        console.log(`Player ${disconnectedPlayerName} (${playerID}, socket ${socket.id}) disconnected from game ${gameId}.`);
    }
}