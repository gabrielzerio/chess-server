// gameStore.ts (ou renomeie para gameManager.ts para maior clareza)

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Game } from './class/game'; // Sua classe Game
import { Player, Position, PieceType } from './models/types'; // Seus tipos
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
    // Map para rapidamente encontrar o gameId de um socket
    private socketToGameMap: Map<string, string> = new Map();

    constructor(io: SocketIOServer) {
        this.io = io;
    }

    // --- Métodos de Gerenciamento de Jogos (chamados principalmente pelo Express, ou internamente) ---

    public createNewGame(player:Player): string {
        const gameId = Math.random().toString(36).substr(2, 4);
        const game = new Game(createInitialBoard());
        try {
            game.addPlayer(player);
        } catch (error) {
            throw error;
        }
        
        this.games[gameId] = game;
        
        console.log(`Game created: ${gameId}`);
        return gameId;
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
            this.socketToGameMap.forEach((gId, playerID) => {
                if (gId === gameId) {
                    this.socketToGameMap.delete(playerID);
                }
            });

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
        const game = this.getGame(socket.gameID);
        
        if(!playerID){
            socket.emit('joinError', {message:"playerID don't exists null or undefined"})
            return;
        }
        
        if (!game) {
            socket.emit('joinError', { message: 'Game not found' });
            return;
        }
        

        // Tenta encontrar o jogador existente (para reconexão) ou adiciona um novo
        let player = game.getPlayerByID(socket.playerID);
        // if (!player) {
        //  if (game.getPlayers().length >= 2) {
        //     socket.emit('joinError', { message: 'Game is full' });
        //     return;
        // } 
        //     // Se o jogador não existe pelo nome, cria um novo
        //     const color: 'white' | 'black' = game.getPlayers().length === 0 ? 'white' : 'black';
        //     // player = { name: playerName, playerID:socket.playerID, color: color };
        //     const playerName = this.games[socket.gameID].getPlayerByID(socket.playerID);

        // } else {
        //     // Se o jogador já existe, atualiza o socketId (caso de reconexão)
        //     // player.socketId = socket.id;
        //     console.log('Jogador já existe')
        // }
        // player = { name:player?.name , playerID:socket.playerID, color: color };
        // game.addPlayer(player); // Adiciona o novo player à instância do Game
        
        socket.join(socket.gameID);
        // this.socketToGameMap.set(socket.playerID, gameId); // Mapeia socketId para gameId
        // socket.data.gameId = gameId; // Opcional, mas útil para acesso rápido
        // Envia estado inicial para o jogador que acabou de entrar
        socket.emit('joinedGame', {
            // gameId: gameId,
            board: game.serializeBoard(),
            color: player?.color,
            turn: game.getTurn(),
            status: game.getStatus()
        });
        // Notifica todos na sala sobre a atualização dos jogadores
        this.io.to(socket.gameID).emit('playersUpdate', { players: game.getPlayers() });

        if (game.getPlayers().length === 2 && game.getStatus() === 'waiting') {
            game.setStatus('playing'); // Inicia o jogo se 2 jogadores
            this.io.to(socket.gameID).emit('gameStarted', { status: 'playing' });
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
        game.setStatus('playing')
        if (game.getStatus() !== 'playing') {
             socket.emit('moveError', { message: 'Game is not in playing state.' });
             return;
        }

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

    private handlePlayerDisconnect(socket: Socket): void {
        const gameId = socket.gameID;
        if (!gameId) {
            console.log(`Socket ${socket.id} disconnected, not in an active game.`);
            return;
        }

        const game = this.getGame(gameId);
        if (game) {
            // const disconnectedPlayer = game.removePlayerByplayerID(socket.id); // Marca o player como desconectado
            // this.socketToGameMap.delete(socket.id); // Remove do mapa de sockets
            this.io.to(gameId).emit('playersUpdate', { players: game.getPlayers() }); // Notifica a sala
            
            // Lógica para lidar com o jogo quando um jogador desconecta
            // Se o jogo estava 'playing' e agora só tem 1 jogador ativo, o status pode mudar para 'paused' ou 'abandoned'
            if (game.getStatus() === 'playing' && game.getPlayers().filter(p => p.playerID !== null).length < 2) {
                game.setStatus('waiting'); // ou 'abandoned'
                // this.io.to(gameId).emit('gamePaused', { message: `Player ${disconnectedPlayer?.name || 'unknown'} disconnected. Game paused.` });
                // Aqui você pode decidir se o jogo deve ser encerrado, se o outro jogador ganha, etc.
                // Ex: Se o outro jogador ganha automaticamente:
                // const winnerColor = disconnectedPlayer?.color === 'white' ? 'black' : 'white';
                // this.io.to(gameId).emit('gameOver', { winner: winnerColor, status: 'abandoned' });
                // this.deleteGame(gameId);
            }
        }
        console.log(`Socket ${socket.id} disconnected from game ${gameId}`);
    }
}