import { Position } from '../models/types';

export function isStraightLine(from: Position, to: Position): boolean {
  return from.row === to.row || from.col === to.col;
}

export function isDiagonal(from: Position, to: Position): boolean {
  return Math.abs(from.row - to.row) === Math.abs(from.col - to.col);
}