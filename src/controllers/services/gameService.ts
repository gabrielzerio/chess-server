import { PrismaClient, Game } from "@prisma/client";
import { error } from "console";

const prisma = new PrismaClient();

// Decorator para rodar uma função após o método
function afterMethod(afterFn: () => Promise<void>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } finally {
        await afterFn();
      }
    };
    return descriptor;
  };
}

// Função para aplicar o decorator em todos os métodos da classe
function decorateAllMethods(targetClass: any, decorator: any) {
  const propertyNames = Object.getOwnPropertyNames(targetClass.prototype);
  for (const name of propertyNames) {
    if (
      name !== "constructor" &&
      typeof targetClass.prototype[name] === "function"
    ) {
      const descriptor = Object.getOwnPropertyDescriptor(targetClass.prototype, name);
      if (descriptor) {
        decorator(targetClass.prototype, name, descriptor);
        Object.defineProperty(targetClass.prototype, name, descriptor);
      }
    }
  }
}

class GameService {
  async createPlayer(name: string, elo: number) {
    const player = await prisma.player.create({
      data: { name, elo },
    });
    console.log('Novo jogador criado:', player);
    return player;
  }

  async addPlayerWhiteToGame(roomCode: string, playerWhiteId: number): Promise<Game> {
    const game = await prisma.game.create({
      data: {
        playerWhite: { connect: { id: playerWhiteId } },
        roomCode: roomCode
      },
    });
    console.log('Novo jogo criado:', game);
    return game;
  }

  async addPlayerBlackToGame(gameId: number, playerBlackId: number) {
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        playerBlack: { connect: { id: playerBlackId } },
      },
    });
    console.log('Segundo jogador adicionado:', updatedGame);
    return updatedGame;
  }

  async selectTableGameId(roomCode: string): Promise<number> {
    const tableGame = await prisma.game.findFirst({
      where: {roomCode: roomCode}  
    });
    console.log("id do jogo", tableGame?.id);
    if(tableGame != null)
    return tableGame.id;
    else{
      throw new Error("game id da tabela é nulo");
    }
  }

  async finishGame(gameId: number, winnerId: number) {
    const endedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        winner: { connect: { id: winnerId } },
        endedAt: new Date(),
      },
    });
    console.log('Jogo finalizado:', endedGame);
    return endedGame;
  }
}

// Aplica o decorator em todos os métodos da classe Main
decorateAllMethods(GameService, afterMethod(async () => prisma.$disconnect()));

export default GameService;