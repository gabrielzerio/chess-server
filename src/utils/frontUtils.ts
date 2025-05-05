import { Piece } from '../models/pieces/Piece';
import { Board, PieceType, PieceColor, Position } from '../models/types';

class FunctionsFront {
    removeHighlight(): void {
        const squares = document.querySelectorAll("#board div");
        squares.forEach((square) => {
            square.classList.remove("highlight", "capture-highlight");
        });
    }

    showEndGame(player1Name: string, player2Name: string, currentTurn: string): void {
        const modal = document.getElementById("modal2") as HTMLDialogElement;
        const winner = currentTurn === "white" ? player1Name : player2Name;
        const winnerMessage = document.getElementById("winnerMessage");
        if (modal && winnerMessage) {
            winnerMessage.textContent = `Parabéns, ${winner}! Você venceu!`;
            modal.showModal();
            const btn = document.getElementById("restartGame");
            btn?.addEventListener("click", () => {
                location.reload();
            });
        }
    }

    showPlayersName(player1Name: string, player2Name: string): void {
        const modal = document.getElementById("modal1") as HTMLDialogElement;
        const divModal = document.getElementById("divModal");
        if (!modal || !divModal) return;

        const btn = document.createElement("button");
        btn.id = 'startGame';
        btn.textContent = "Começar Jogo";
        
        const divDefault = `
        <h2>Digite os nomes dos jogadores</h2>
        <input type="text" id="player1" placeholder="Jogador das peças brancas">
        <input type="text" id="player2" placeholder="Jogador das peças pretas">
        `;
      
        divModal.insertAdjacentHTML("afterbegin", divDefault);
        divModal.insertAdjacentElement("beforeend", btn);

        const preventEscClose = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
            }
        };
        document.addEventListener("keydown", preventEscClose);

        modal.showModal();

        btn.addEventListener("click", () => {
            const player1Input = document.getElementById("player1") as HTMLInputElement;
            const player2Input = document.getElementById("player2") as HTMLInputElement;
            if (player1Input && player2Input) {
                player1Name = player1Input.value;
                player2Name = player2Input.value;
                modal.close();
            }
        });
    }

    showTutorial(): Promise<string> {
        const modal = document.getElementById("modal1") as HTMLDialogElement;
        const divModal = document.getElementById("divModal");
        if (!modal || !divModal) return Promise.reject("Modal elements not found");

        const createButton = (id: string, piece: string, text: string): HTMLButtonElement => {
            const btn = document.createElement("button");
            btn.id = id;
            btn.dataset.piece = piece;
            btn.innerText = text;
            return btn;
        };

        const buttons = [
            createButton('btn-pawn', 'pawn', 'Peão'),
            createButton('btn-rook', 'rook', 'Torre'),
            createButton('btn-queen', 'queen', 'Dama'),
            createButton('btn-bishop', 'bishop', 'Bispo'),
            createButton('btn-knight', 'knight', 'Cavalo')
        ];

        buttons.forEach(btn => divModal.appendChild(btn));

        const preventEscClose = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
            }
        };
        document.addEventListener("keydown", preventEscClose);
        modal.showModal();
     
        return new Promise((resolve) => {
            const modalButtons = divModal.querySelectorAll("button");
            
            const handleClick = (event: Event) => {
                const target = event.target as HTMLButtonElement;
                const selectedPiece = target.dataset.piece;
                modalButtons.forEach(btn => btn.removeEventListener("click", handleClick));
                modal.close();
                
                modal.style.left = '';
                modal.style.top = '';
                
                if (selectedPiece) {
                    resolve(selectedPiece);
                }
            };

            modalButtons.forEach(btn => {
                btn.addEventListener("click", handleClick);
            });
        });
    }

    canCaptureEnemyPiece(board: Board, piece: Piece, to: Position): boolean {
        const targetPiece = board[to.row][to.col];
        return targetPiece !== null && targetPiece.color !== piece.color;
    }

    showPromotionDialog(
        color: PieceColor,
        position: Position,
        pieceToSymbol: (piece: Piece) => string
      ): Promise<PieceType > {
        const modal = document.getElementById("promotion-modal") as HTMLDialogElement;
        if (!modal) return Promise.reject("Modal not found");
      
        const square = document.getElementById(`${position.row}-${position.col}`);
        if (!square) return Promise.reject("Square not found");
      
        const squareRect = square.getBoundingClientRect();
      
        modal.style.left = `${squareRect.left}px`;
        modal.style.top = color === 'white'
          ? `${squareRect.top - 60}px`
          : `${squareRect.bottom}px`;
      
        modal.showModal();
      
        return new Promise((resolve) => {
          const buttons = modal.querySelectorAll<HTMLButtonElement>(".piece-btn");
      
          const handleClick = (event: Event) => {
            const target = event.target as HTMLButtonElement;
            const selectedPiece = target.dataset.piece as PieceType;
            buttons.forEach(btn => btn.removeEventListener("click", handleClick));
            modal.close();
      
            modal.style.left = '';
            modal.style.top = '';
      
            if (selectedPiece) {
              resolve( selectedPiece );
            }
          };
      
          buttons.forEach(btn => {
            btn.addEventListener("click", handleClick);
            const piece = { type: (btn.dataset.piece || ''), color, position: { row: position.row, col: position.col } } as Piece;
            btn.textContent = pieceToSymbol(piece);
          });
        });
      }
}

export default FunctionsFront;