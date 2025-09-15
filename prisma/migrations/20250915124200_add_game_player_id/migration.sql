/*
  Warnings:

  - You are about to drop the column `roomCode` on the `Game` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[gamePlayerId]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pgn` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gamePlayerId` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Game` DROP COLUMN `roomCode`,
    ADD COLUMN `pgn` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Player` ADD COLUMN `gamePlayerId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Player_gamePlayerId_key` ON `Player`(`gamePlayerId`);
