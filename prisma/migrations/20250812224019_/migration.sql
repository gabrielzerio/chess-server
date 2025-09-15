/*
  Warnings:

  - Made the column `roomCode` on table `Game` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Game` MODIFY `roomCode` VARCHAR(191) NOT NULL;
