import { Server } from "socket.io";
import { Socket } from "socket.io";
import { games } from "../gameStore";

export function handleJoin (io:Server, socket:Socket) {
    // socket.on('join', ({ gameId, playerName }) => {
    //     if (!games[gameId]) {
    //       socket.emit('joinError', { message: 'Game not found' });
    //       return;
    //     }
       
    //     // Atualiza socketId do jogador, se ele já tiver entrado nessa partida anteriormente, mas não saiu do jogo (refresh por exemplo)
    //     const player = games[gameId].checkPlayerName(playerName);
    //     if (player) player.socketId = socket.id;
    //     socket.join(gameId);
    //     // Envia board atual e cor do jogador
    //     socket.emit('joined', {
    //       board: games[gameId].serializeBoard(), color: player ? player.color : null, turn: games[gameId].turn
    //     });
    //     io.to(gameId).emit('playersUpdate', { players: games[gameId].players });
    //     socket.data.gameId = gameId;
    //   });
    // OUUU
    const joinGame = ({gameId,playerName}:{ gameId:string; playerName:string}) => {
        if (!games[gameId]) {
            socket.emit('joinError', { message: 'Game not found' });
            return;
        }
       
        // Atualiza socketId do jogador, se ele já tiver entrado nessa partida anteriormente, mas não saiu do jogo (refresh por exemplo)
        const player = games[gameId].checkPlayerName(playerName);
        if (player) player.socketId = socket.id;
        
        socket.join(gameId);
        // Envia board atual e cor do jogador
        socket.emit('joined', {
            board: games[gameId].serializeBoard(), color: player ? player.color : null, turn: games[gameId].getTurn()
        });
        io.to(gameId).emit('playersUpdate', { players: games[gameId].getPlayers() });
        socket.data.gameId = gameId; //utiliza a propriedade data do socket io para salvar um dado (gameId) pode ser acesso posteriormente da mesma forma
        
    }
    socket.on('join', joinGame); //ESSA FORMA FUNCIONARIA MELHOR, SE AO ENTRAR EU RECEBESSE join:newGame porém novo jogo é com express(restAPI)
                                 //(mais de uma opção de entrada) front deve estar de acordo
    // socket.on('join:new', funcao);
    // socket.on('join:existent', funcao)
}
