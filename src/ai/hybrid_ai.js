import { enhancedAI } from './enhancedAI';

class HybridAI {
    constructor(geminiApiKey) {
        this.pythonEndpoint = 'http://localhost:5000/analyze';
        this.apiKey = geminiApiKey;
        this.moveHistory = [];
        this.battleHistory = [];
        this.knownPieces = {};
        this.confirmedBombs = new Set();
        this.turnCount = 0;
    }

    async calculateMove(board, gameState) {
        const MAX_RETRIES = 3;
        let retryCount = 0;

        while (retryCount < MAX_RETRIES) {
            try {
                // Get move from Gemini
                const analysis = await this.getGeminiAnalysis(
                    board,
                    this.getLegalMoves(board),
                    this.knownPieces,
                    this.battleHistory,
                    Array.from(this.confirmedBombs).map(pos => {
                        const [row, col] = pos.split('-').map(Number);
                        return { row, col };
                    }),
                    this.turnCount,
                    this.moveHistory
                );

                if (analysis && analysis.move) {
                    // Verify the move is valid
                    const possibleMoves = this.getLegalMoves(board);
                    const geminiMove = possibleMoves.find(move => 
                        move.from.row === analysis.move.from.row &&
                        move.from.col === analysis.move.from.col &&
                        move.to.row === analysis.move.to.row &&
                        move.to.col === analysis.move.to.col
                    );

                    if (geminiMove) {
                        // Record AI move
                        this.moveHistory.push({
                            player: 'ai',
                            from: geminiMove.from,
                            to: geminiMove.to
                        });
                        this.turnCount++;
                        return geminiMove;
                    }
                }

                // If we get here, either no analysis or invalid move
                console.log(`Retry ${retryCount + 1}/${MAX_RETRIES}: Invalid or no move received from Gemini`);
                retryCount++;
                
                // Add a small delay before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('Error in Gemini API call:', error);
                retryCount++;
                
                // Add a small delay before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        throw new Error('Failed to get valid move from Gemini after maximum retries');
    }

    // Record a battle outcome
    recordBattle(attackerPos, defenderPos, attackerPiece, defenderPiece, winner) {
        // Record the battle
        this.battleHistory.push({
            attacker: {
                type: attackerPiece.type,
                player: attackerPiece.player
            },
            defender: {
                type: defenderPiece.type,
                player: defenderPiece.player
            },
            winner: winner === 'attacker' ? attackerPiece.player : defenderPiece.player
        });

        // Record known pieces
        const attackerKey = `${attackerPos.row}-${attackerPos.col}`;
        const defenderKey = `${defenderPos.row}-${defenderPos.col}`;
        
        if (winner === null) {
            // Draw - both pieces are removed
            delete this.knownPieces[attackerKey];
            delete this.knownPieces[defenderKey];
        } else if (winner === 'attacker') {
            // Attacker won - they move to defender's position
            this.knownPieces[defenderKey] = attackerPiece;
            delete this.knownPieces[attackerKey];
        } else {
            // Defender won - they stay in place and attacker is removed
            this.knownPieces[defenderKey] = defenderPiece;
            delete this.knownPieces[attackerKey];
        }

        // Record bombs
        if (defenderPiece.type === 'B') {
            this.confirmedBombs.add(defenderKey);
        }
    }

    // Record player moves
    recordPlayerMove(from, to) {
        this.moveHistory.push({
            player: 'player',
            from,
            to
        });
        
        // Update known pieces location if we know the piece that moved
        const fromKey = `${from.row}-${from.col}`;
        const toKey = `${to.row}-${to.col}`;
        
        // Check if this was a multi-space move (only Scout/9 can do this)
        const distance = Math.abs(to.row - from.row) + Math.abs(to.col - from.col);
        if (distance > 1) {
            // If a piece moves multiple spaces, it must be a Scout (9)
            this.knownPieces[toKey] = { type: '9', player: 'player' };
        } else if (this.knownPieces[fromKey]) {
            // Move the piece to its new location
            this.knownPieces[toKey] = this.knownPieces[fromKey];
            // Remove it from the old location
            delete this.knownPieces[fromKey];
        }
        
        this.turnCount++;
    }

    // Get legal moves for the AI
    getLegalMoves(board) {
        const moves = [];
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const piece = board[row][col];
                if (piece && piece.player === 'ai' && piece.type !== 'B' && piece.type !== 'F') {
                    const validMoves = this.getValidMovesForPiece(piece, row, col, board);
                    validMoves.forEach(to => {
                        moves.push({
                            from: { row, col },
                            to,
                            piece
                        });
                    });
                }
            }
        }
        return moves;
    }

    // Get valid moves for a piece
    getValidMovesForPiece(piece, row, col, board) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const maxSteps = piece.type === '9' ? 9 : 1;

        directions.forEach(([dx, dy]) => {
            for (let steps = 1; steps <= maxSteps; steps++) {
                const newRow = row + dx * steps;
                const newCol = col + dy * steps;

                if (newRow < 0 || newRow >= 10 || newCol < 0 || newCol >= 10) break;
                if ((newRow === 4 || newRow === 5) && (newCol === 2 || newCol === 3 || newCol === 6 || newCol === 7)) break;

                const targetPiece = board[newRow][newCol];
                if (steps > 1 && targetPiece) break;
                if (targetPiece && targetPiece.player === piece.player) break;

                moves.push({ row: newRow, col: newCol });
                if (targetPiece) break;
            }
        });

        return moves;
    }

    async getGeminiAnalysis(board, legalMoves, knownPieces, battleHistory, confirmedBombs, turnCount, moveHistory) {
        try {
            const response = await fetch(this.pythonEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    board,
                    legalMoves,
                    knownPieces,
                    battleHistory,
                    confirmedBombs,
                    turnCount,
                    moveHistory
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get Gemini analysis');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting Gemini analysis:', error);
            return null;
        }
    }
}

export const hybridAI = new HybridAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function calculateAIMove(board, gameState) {
    return await hybridAI.calculateMove(board, gameState);
} 