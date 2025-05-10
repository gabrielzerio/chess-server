import { describe, it, expect, beforeEach } from 'vitest';
import { PieceFactory } from '../models/PieceFactory';
import { Board, Position } from '../models/types';

describe('Testes de Movimento das Peças', () => {
  let board: Board;

  beforeEach(() => {
    board = Array(8).fill(null).map(() => Array(8).fill(null));
    // Adiciona o rei branco sempre no tabuleiro
    const rei = PieceFactory.createPiece('king', 'white', { row: 7, col: 4 });
    board[7][4] = rei;
  });

  describe('Peão', () => {
    it('deve permitir movimento simples para frente', () => {
      const peao = PieceFactory.createPiece('pawn', 'white', { row: 6, col: 0 });
      board[6][0] = peao;
      const valido = peao.isValidMove({ row: 6, col: 0 }, { row: 5, col: 0 }, board);
      expect(valido).toBe(true);
    });

    it('deve permitir movimento duplo inicial', () => {
      const peao = PieceFactory.createPiece('pawn', 'white', { row: 6, col: 0 });
      board[6][0] = peao;
      const valido = peao.isValidMove({ row: 6, col: 0 }, { row: 4, col: 0 }, board);
      expect(valido).toBe(true);
    });

    it('não deve permitir avançar com peça na frente', () => {
      const peao = PieceFactory.createPiece('pawn', 'white', { row: 6, col: 0 });
      const bloqueio = PieceFactory.createPiece('rook', 'white', { row: 5, col: 0 });
      board[6][0] = peao;
      board[5][0] = bloqueio;
      const valido = peao.isValidMove({ row: 6, col: 0 }, { row: 5, col: 0 }, board);
      expect(valido).toBe(false);
    });

    it('não deve capturar peça inimiga em linha reta', () => {
      const peao = PieceFactory.createPiece('pawn', 'white', { row: 6, col: 0 });
      const inimigo = PieceFactory.createPiece('pawn', 'black', { row: 5, col: 0 });
      board[6][0] = peao;
      board[5][0] = inimigo;
      const valido = peao.isValidMove({ row: 6, col: 0 }, { row: 5, col: 0 }, board);
      expect(valido).toBe(false);
    });

    it('deve capturar peça inimiga na diagonal', () => {
      const peao = PieceFactory.createPiece('pawn', 'white', { row: 6, col: 0 });
      const inimigo = PieceFactory.createPiece('pawn', 'black', { row: 5, col: 1 });
      board[6][0] = peao;
      board[5][1] = inimigo;
      const valido = peao.isValidMove({ row: 6, col: 0 }, { row: 5, col: 1 }, board);
      expect(valido).toBe(true);
    });

    it('não deve capturar peça da mesma cor', () => {
      const peao = PieceFactory.createPiece('pawn', 'white', { row: 6, col: 0 });
      const amigo = PieceFactory.createPiece('rook', 'white', { row: 5, col: 1 });
      board[6][0] = peao;
      board[5][1] = amigo;
      const valido = peao.isValidMove({ row: 6, col: 0 }, { row: 5, col: 1 }, board);
      expect(valido).toBe(false);
    });

    it('deve permitir en passant', () => {
      const alvoEnPassant = { row: 5, col: 1 };
      const peaoBranco = PieceFactory.createPiece('pawn', 'white', { row: 6, col: 1 });
      const peaoPreto = PieceFactory.createPiece('pawn', 'black', { row: 4, col: 0 });
      board[6][1] = peaoBranco;
      board[4][0] = peaoPreto;
      const context = { enPassantTarget: alvoEnPassant };
      const valido = peaoBranco.isValidMove({ row: 6, col: 1 }, { row: 4, col: 1 }, board, context);
      expect(valido).toBe(true);
    });
  });

  describe('Torre', () => {
    it('não deve pular peças', () => {
      const torre = PieceFactory.createPiece('rook', 'white', { row: 7, col: 0 });
      const bloqueio = PieceFactory.createPiece('pawn', 'white', { row: 6, col: 0 });
      board[7][0] = torre;
      board[6][0] = bloqueio;
      const valido = torre.isValidMove({ row: 7, col: 0 }, { row: 4, col: 0 }, board);
      expect(valido).toBe(false);
    });

    it('deve andar em linha reta', () => {
      const torre = PieceFactory.createPiece('rook', 'white', { row: 7, col: 0 });
      board[7][0] = torre;
      const valido = torre.isValidMove({ row: 7, col: 0 }, { row: 4, col: 0 }, board);
      expect(valido).toBe(true);
    });
  });

  describe('Cavalo', () => {
    it('deve pular peças', () => {
      const cavalo = PieceFactory.createPiece('knight', 'white', { row: 7, col: 1 });
      const bloqueio = PieceFactory.createPiece('pawn', 'white', { row: 6, col: 1 });
      board[7][1] = cavalo;
      board[6][1] = bloqueio;
      const valido = cavalo.isValidMove({ row: 7, col: 1 }, { row: 5, col: 2 }, board);
      expect(valido).toBe(true);
    });

    it('não deve capturar peça da mesma cor', () => {
      const cavalo = PieceFactory.createPiece('knight', 'white', { row: 7, col: 1 });
      const amigo = PieceFactory.createPiece('pawn', 'white', { row: 5, col: 2 });
      board[7][1] = cavalo;
      board[5][2] = amigo;
      const valido = cavalo.isValidMove({ row: 7, col: 1 }, { row: 5, col: 2 }, board);
      expect(valido).toBe(false);
    });
  });

  describe('Bispo', () => {
    it('deve andar na diagonal', () => {
      const bispo = PieceFactory.createPiece('bishop', 'white', { row: 7, col: 2 });
      board[7][2] = bispo;
      const valido = bispo.isValidMove({ row: 7, col: 2 }, { row: 5, col: 4 }, board);
      expect(valido).toBe(true);
    });
  });

  describe('Rainha', () => {
    it('deve andar na diagonal', () => {
      const rainha = PieceFactory.createPiece('queen', 'white', { row: 7, col: 3 });
      board[7][3] = rainha;
      const valido = rainha.isValidMove({ row: 7, col: 3 }, { row: 5, col: 5 }, board);
      expect(valido).toBe(true);
    });
  });

  describe('Rei', () => {
    it('deve andar uma casa', () => {
      const rei = PieceFactory.createPiece('king', 'white', { row: 7, col: 4 });
      board[7][4] = rei;
      const valido = rei.isValidMove({ row: 7, col: 4 }, { row: 6, col: 4 }, board);
      expect(valido).toBe(true);
    });

    it('deve permitir roque', () => {
      const rei = PieceFactory.createPiece('king', 'white', { row: 7, col: 4 });
      const torre = PieceFactory.createPiece('rook', 'white', { row: 7, col: 7 });
      board[7][4] = rei;
      board[7][7] = torre;
      const valido = rei.isValidMove({ row: 7, col: 4 }, { row: 7, col: 6 }, board);
      expect(valido).toBe(true);
    });
  });
});
