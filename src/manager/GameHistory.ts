// GameHistory.ts
export class GameHistory {
    private moves: string[];
    private result: string; // "*", "1-0", "0-1" ou "1/2-1/2"

    constructor() {
        this.moves = [];
        this.result = "*"; // padrão: partida em andamento
    }

    /**
     * Adiciona um lance à lista de histórico.
     * @param sanMove O lance em Standard Algebraic Notation (ex: "Nxf7#")
     */
    addMove(sanMove: string) {
        this.moves.push(sanMove);
    }

    /**
     * Define o resultado da partida.
     * Exemplos: "1-0" (brancas venceram), "0-1" (pretas venceram), "1/2-1/2" (empate)
     */
    setResult(result: string) {
        this.result = result;
    }

    /**
     * Gera a string PGN com apenas os lances e o resultado.
     * Exemplo: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0"
     */
    generatePGN(): string {
        let moveText = '';
        for (let i = 0; i < this.moves.length; i++) {
            if (i % 2 === 0) {
                moveText += `${(i / 2) + 1}. `;
            }
            moveText += `${this.moves[i]} `;
        }

        return moveText.trim() + ' ' + this.result;
    }
}
