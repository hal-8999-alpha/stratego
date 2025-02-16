import { enhancedAI } from './enhancedAI';

class HybridAI {
    constructor(geminiApiKey) {
        this.enhancedAI = enhancedAI;
        this.pythonEndpoint = 'http://localhost:5000/analyze'; // We'll create this Flask endpoint
        this.apiKey = geminiApiKey;
    }

    async calculateMove(board, gameState) {
        const MAX_RETRIES = 3;
        let retryCount = 0;

        while (retryCount < MAX_RETRIES) {
            try {
                // Get move from Gemini
                const analysis = await this.getGeminiAnalysis(
                    board,
                    this.enhancedAI.getAllPossibleMoves(board),
                    this.enhancedAI.memory.knownPieces,
                    this.enhancedAI.memory.battleHistory,
                    Array.from(this.enhancedAI.memory.confirmedBombs).map(pos => {
                        const [row, col] = pos.split('-').map(Number);
                        return { row, col };
                    }),
                    this.enhancedAI.turnCount
                );

                if (analysis && analysis.move) {
                    // Verify the move is valid
                    const possibleMoves = this.enhancedAI.getAllPossibleMoves(board);
                    const geminiMove = possibleMoves.find(move => 
                        move.from.row === analysis.move.from.row &&
                        move.from.col === analysis.move.from.col &&
                        move.to.row === analysis.move.to.row &&
                        move.to.col === analysis.move.to.col
                    );

                    if (geminiMove) {
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

    async getGeminiAnalysis(board, legalMoves, knownPieces, battleHistory, confirmedBombs, turnCount) {
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
                    turnCount
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

    combineAnalysis(moves, geminiAnalysis) {
        // Start with enhanced AI's move evaluation
        const scoredMoves = moves.map(move => ({
            ...move,
            score: this.enhancedAI.evaluateMove(move, this.enhancedAI.board, {})
        }));

        if (geminiAnalysis) {
            // Parse Gemini's recommended move
            const recommendedMove = this.parseRecommendedMove(geminiAnalysis.recommended_move);
            
            // Adjust scores based on Gemini's analysis
            scoredMoves.forEach(move => {
                // Boost score if this move matches Gemini's recommendation
                if (this.movesMatch(move, recommendedMove)) {
                    move.score += 500;
                }

                // Adjust score based on flag prediction
                if (geminiAnalysis.flag_prediction) {
                    const predictedFlag = this.parseFlagPrediction(geminiAnalysis.flag_prediction);
                    if (predictedFlag) {
                        // Boost moves that approach predicted flag location
                        const distanceToFlag = this.calculateDistance(
                            move.to,
                            predictedFlag
                        );
                        move.score += (10 - distanceToFlag) * 30;
                    }
                }

                // Apply strategic considerations from analysis
                this.applyStrategicConsiderations(move, geminiAnalysis.analysis);
            });
        }

        // Sort by score
        return scoredMoves.sort((a, b) => b.score - a.score);
    }

    parseRecommendedMove(recommendation) {
        if (!recommendation) return null;
        
        // Example format: "Move piece from (3,4) to (5,6)"
        const match = recommendation.match(/from \((\d+),(\d+)\) to \((\d+),(\d+)\)/);
        if (match) {
            const [_, fromRow, fromCol, toRow, toCol] = match;
            return {
                from: { row: parseInt(fromRow), col: parseInt(fromCol) },
                to: { row: parseInt(toRow), col: parseInt(toCol) }
            };
        }
        return null;
    }

    parseFlagPrediction(prediction) {
        if (!prediction) return null;

        // Example format: "Flag might be at (8,9)"
        const match = prediction.match(/at \((\d+),(\d+)\)/);
        if (match) {
            const [_, row, col] = match;
            return { row: parseInt(row), col: parseInt(col) };
        }
        return null;
    }

    applyStrategicConsiderations(move, analysis) {
        if (!analysis) return;

        // Look for key strategic patterns in the analysis
        analysis.forEach(line => {
            // Boost moves that align with strategic considerations
            if (line.includes('protect') && this.isProtectiveMove(move)) {
                move.score += 200;
            }
            if (line.includes('scout') && move.piece.type === '9') {
                move.score += 150;
            }
            if (line.includes('attack') && this.isAttackingMove(move)) {
                move.score += 100;
            }
            // Add penalties for moves that contradict strategic advice
            if (line.includes('avoid') && this.matchesWarning(move, line)) {
                move.score -= 300;
            }
        });
    }

    calculateDistance(pos1, pos2) {
        return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
    }

    movesMatch(move1, move2) {
        if (!move2) return false;
        return move1.from.row === move2.from.row &&
               move1.from.col === move2.from.col &&
               move1.to.row === move2.to.row &&
               move1.to.col === move2.to.col;
    }

    isProtectiveMove(move) {
        // Check if this move helps protect other pieces
        const nearbyAllies = this.enhancedAI.getNearbyPieces(move.to, this.enhancedAI.board, 'ai');
        return nearbyAllies.some(ally => this.enhancedAI.getPieceValue(ally.type) >= 8);
    }

    isAttackingMove(move) {
        // Check if this move attacks an enemy piece
        const targetPiece = this.enhancedAI.board[move.to.row][move.to.col];
        return targetPiece && targetPiece.player === 'player';
    }

    matchesWarning(move, warning) {
        // Parse warning and check if move contradicts it
        // This is a simple implementation - you might want to make it more sophisticated
        if (warning.includes('bomb') && !this.enhancedAI.memory.confirmedBombs.has(`${move.to.row}-${move.to.col}`)) {
            return true;
        }
        return false;
    }
}

export const hybridAI = new HybridAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function calculateAIMove(board, gameState) {
    return await hybridAI.calculateMove(board, gameState);
} 