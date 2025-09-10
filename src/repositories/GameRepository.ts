// src/repositories/GameRepository.ts
import { Game } from "../class/game";
import { GamePlayer } from "../class/GamePlayer";
import { PrismaClient, Game as PrismaGame } from "@prisma/client";

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

export class GameRepository {
  private games: { [key: string]: Game } = {};

  // Adiciona um novo jogo ao repositório
  public add(gameId: string, game: Game): void {
    this.games[gameId] = game;
  }

  // Remove um jogo do repositório
  public remove(gameId: string): void {
    //salva no banco antes de remover

    console.log(`jogo ${gameId} foi removido!`);
    delete this.games[gameId];
  }

  public exists(gameId: string): boolean {
    // A forma mais eficiente de verificar se uma chave existe em um objeto
    // O operador 'in' retorna true/false e não lança erros.
    return gameId in this.games;
  }
  /**
   * 
   * @param gameId
   * @returns retorna objeto Game
   * @throws {Error} lança erro se nenhum jogo com o ID for encontrado
   */
  public get(gameId: string): Game {
    const game = this.games[gameId];
    if (game) {
      return game;
    }
    throw new Error("Nenhum jogo com esse ID foi encontrado");
  }

  // Busca todos os jogos
  public getAll(): Game[] {
    return Object.values(this.games);
  }

  /**
   * 
   * @param gameId 
   * @param playerId 
   * @returns retorna o objeto GamePlayer 
   * @throws {Error} retorna erro se nenhum gamePlayer for encontrado com o playerId
   */
  public getGamePlayer(gameId: string, playerId: string): GamePlayer {
    const gamePlayer = this.get(gameId).getGamePlayerById(playerId);
    if (gamePlayer) {
      return gamePlayer;
    }
    throw new Error("Nenhum jogador no jogo especificado foi encontrado");
  }

  public gamePlayerExists(gameId: string, playerId: string): boolean {
    return this.get(gameId).getGamePlayerById(playerId) == null ? false : true;
  }

  //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
  //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
  //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
  async findOrCreatePlayer(name: string, elo = 1200) {
    let player = await prisma.player.findFirst({
      where: { name },
    });

    if (!player) {
      player = await prisma.player.create({
        data: { name, elo },
      });
    }

    return player;
  }

  async saveGameToDB(
    whitePlayerName: string,
    blackPlayerName: string,
    winnerName: string,
    pgn: string
  ) {
    // cria ou pega jogadores existentes
    const whitePlayer = await this.findOrCreatePlayer(whitePlayerName);
    const blackPlayer = await this.findOrCreatePlayer(blackPlayerName);
    const winnerPlayer = await this.findOrCreatePlayer(winnerName);
    // salva o jogo
    const game = await prisma.game.create({
      data: {
        playerWhiteId: whitePlayer.id,
        playerBlackId: blackPlayer.id,
        winnerId: winnerPlayer.id,
        pgn,
        endedAt: new Date(),
      },
    });

    console.log("Jogo salvo no banco:", game);
    return game;
  }

}
// decorateAllMethods(GameRepository, afterMethod(async () => prisma.$disconnect()));

// Aplica o decorator em todos os métodos da classe Main

// export default GameService;
