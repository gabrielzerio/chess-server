// ALTERADO: A classe foi totalmente reformulada para PGN.

export class GameHistory {
    // NOVO: Armazena tags PGN como [Event "Nome do Evento"]
    private tags: Map<string, string>;

    // NOVO: Armazena a lista de lances em notação SAN (ex: "e4", "Nf3")
    private moves: string[];

    constructor() {
        this.tags = new Map<string, string>();
        this.moves = [];

        // Adiciona tags padrão que podem ser preenchidas depois
        this.tags.set("Event", "Casual Game");
        this.tags.set("Site", "Your Chess App");
        this.tags.set("Date", new Date().toISOString().split('T')[0].replace(/-/g, '.'));
        this.tags.set("Round", "1");
        this.tags.set("White", "Player 1");
        this.tags.set("Black", "Player 2");
        this.tags.set("Result", "*"); // * significa "em andamento"
    }

    /**
     * NOVO: Adiciona um lance à lista de histórico.
     * @param sanMove O lance em Standard Algebraic Notation (ex: "Nxf7#")
     */
    addMove(sanMove: string) {
        this.moves.push(sanMove);
    }

    /**
     * NOVO: Define ou atualiza o valor de uma tag PGN.
     * @param tagName O nome da tag (ex: "White", "Result")
     * @param value O valor da tag (ex: "Magnus Carlsen", "1-0")
     */
    setTag(tagName: string, value: string) {
        this.tags.set(tagName, value);
    }

    /**
     * NOVO: Gera a string PGN completa da partida até o momento.
     * @returns A partida formatada em PGN.
     */
    generatePGN(): string {
        let pgn = '';
        // Escreve as tags
        for (const [key, value] of this.tags.entries()) {
            pgn += `[${key} "${value}"]\n`;
        }
        pgn += '\n';

        // Escreve os lances
        let moveText = '';
        for (let i = 0; i < this.moves.length; i++) {
            // Adiciona o número do lance antes do movimento das brancas
            if (i % 2 === 0) {
                moveText += `${(i / 2) + 1}. `;
            }
            moveText += `${this.moves[i]} `;
        }
        
        pgn += moveText.trim() + ' ' + this.tags.get("Result");

        return pgn;
    }
}
