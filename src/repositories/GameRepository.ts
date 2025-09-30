// src/repositories/GameRepository.ts
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Game } from "../class/game";
import { GamePlayer } from "../class/GamePlayer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  /**
   * Encontra um jogador pelo seu ID do jogo (gamePlayerId) ou o cria se não existir.
   * @param gamePlayerId O ID único do jogador vindo do seu jogo.
   * @param data Os dados do jogador, como nome e elo inicial, caso precise ser criado.
   * @returns O jogador encontrado ou recém-criado.
   */
  public async findOrCreatePlayer(
    gamePlayerId: string,
    data: { name: string; elo?: number }
  ) {
    const defaultElo = 1200;

    const player = await prisma.player.upsert({
      // 1. Cláusula de busca: onde o Prisma vai procurar
      where: {
        gamePlayerId: gamePlayerId, // Busca pelo campo único que definimos
      },
      // 2. O que fazer se encontrar o jogador (pode ser usado para atualizar dados)
      update: {
        // Se você quiser, por exemplo, atualizar o nome do jogador sempre que essa função for chamada:
        // name: data.name,
        // Se não quiser atualizar nada, basta deixar um objeto vazio.
      },
      // 3. O que fazer se NÃO encontrar: os dados para criar o novo jogador
      create: {
        gamePlayerId: gamePlayerId,
        name: data.name,
        elo: data.elo ?? defaultElo, // Usa o elo fornecido ou o padrão (1200)
      },
    });

    return player;
  }

  async saveGameToDB(
    whitePlayerId: string,
    whitePlayerName: string,
    blackPlayerId: string,
    blackPlayerName: string,
    winnerId: string,
    winnerName: string,
    pgn: string
  ) {
    try {
      const whitePlayer = await this.findOrCreatePlayer(whitePlayerId, { name: whitePlayerName });
      const blackPlayer = await this.findOrCreatePlayer(blackPlayerId, { name: blackPlayerName });
      const winnerPlayer = await this.findOrCreatePlayer(winnerId, { name: winnerName });

      const game = await prisma.game.create({
        data: {
          playerWhiteId: whitePlayer.id,
          playerBlackId: blackPlayer.id,
          winnerId: winnerPlayer.id,
          pgn,
          endedAt: new Date(),
        },
      });

      console.log("✅ Jogo salvo no banco:", game);
      return game;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error(`⚠️ Erro Prisma ao salvar jogo (code ${error.code}):`, error.meta);
      } else {
        console.error("❌ Erro inesperado ao salvar jogo:", error);
      }
      // não relança, apenas loga — aplicação continua rodando
      return null;
    }
  }
}
// decorateAllMethods(GameRepository, afterMethod(async () => prisma.$disconnect()));

// Aplica o decorator em todos os métodos da classe Main

// export default GameService;
