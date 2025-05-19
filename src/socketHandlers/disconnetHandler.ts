import { Server, Socket } from "socket.io";
import { games } from "../gameStore";

export function handleDisconnect(io:Server, socket:Socket){
    async function disconnect(){ // é necessario aguardar a remoção do socket do jogador para evitar erros
        
    // Remove socketId dos jogadores desconectados
    // Object.values(games).forEach((game: any) => {
    //   game.players.forEach((p: any) => {
    //     if (p.socketId === socket.id) p.socketId = null;
    //   });
    // });
    try{
      await games[socket.data.gameId].removeSocketId(socket.id); 
  
      console.log("jogador desconectado", socket.id)
    }catch(error){
      console.log("o game pode já ter sido excluido anteriormente!");
    }
    }



    socket.on('disconnect', disconnect);
}