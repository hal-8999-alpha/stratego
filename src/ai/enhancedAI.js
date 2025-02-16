// Initial AI setup configuration
const INITIAL_AI_SETUP = [
  // Row 0 (top row)
  { type: '9', row: 0, col: 0 },
  { type: '6', row: 0, col: 1 },
  { type: '5', row: 0, col: 2 },
  { type: '4', row: 0, col: 3 },
  { type: '3', row: 0, col: 4 },
  { type: '2', row: 0, col: 5 },
  { type: '7', row: 0, col: 6 },
  { type: '8', row: 0, col: 7 },
  { type: '9', row: 0, col: 8 },
  { type: 'B', row: 0, col: 9 },
  
  // Row 1
  { type: '1', row: 1, col: 0 },
  { type: 'B', row: 1, col: 1 },
  { type: '7', row: 1, col: 2 },
  { type: '6', row: 1, col: 3 },
  { type: '5', row: 1, col: 4 },
  { type: '4', row: 1, col: 5 },
  { type: 'B', row: 1, col: 6 },
  { type: '8', row: 1, col: 7 },
  { type: '9', row: 1, col: 8 },
  { type: 'S', row: 1, col: 9 },
  
  // Row 2
  { type: 'B', row: 2, col: 0 },
  { type: '8', row: 2, col: 1 },
  { type: '7', row: 2, col: 2 },
  { type: '6', row: 2, col: 3 },
  { type: '5', row: 2, col: 4 },
  { type: '4', row: 2, col: 5 },
  { type: '3', row: 2, col: 6 },
  { type: 'B', row: 2, col: 7 },
  { type: '9', row: 2, col: 8 },
  { type: 'B', row: 2, col: 9 },
  
  // Row 3
  { type: 'F', row: 3, col: 0 },
  { type: '8', row: 3, col: 1 },
  { type: '7', row: 3, col: 2 },
  { type: '6', row: 3, col: 3 },
  { type: 'B', row: 3, col: 4 },
  { type: '5', row: 3, col: 5 },
  { type: '9', row: 3, col: 6 },
  { type: '8', row: 3, col: 7 },
  { type: '9', row: 3, col: 8 },
  { type: 'B', row: 3, col: 9 }
];

// Export the initial AI setup function
export function getInitialAISetup() {
  return INITIAL_AI_SETUP.map(piece => ({
    ...piece,
    player: 'ai'
  }));
}

// Memory system to track piece information and confidence levels
class AIMemory {
  constructor() {
    this.knownPieces = {}; // Format: "row-col": { type, confidence, lastSeen }
    this.suspectedFlag = null; // Location where we suspect the flag is
    this.confirmedBombs = new Set(); // Locations of confirmed bombs
    this.revealedPieces = new Set(); // Pieces that have been involved in battle
    this.battleHistory = []; // Track battle outcomes for learning
    this.inferredStrengths = new Map(); // Infer piece strengths from battle outcomes
  }

  // Update memory of a piece with decay based on turns passed
  updatePieceMemory(row, col, type, confidence) {
    const key = `${row}-${col}`;
    this.knownPieces[key] = {
      type,
      confidence: Math.min(confidence, 1.0),
      lastSeen: Date.now()
    };
  }

  // Get piece info with confidence decay over time
  getPieceMemory(row, col) {
    const key = `${row}-${col}`;
    const piece = this.knownPieces[key];
    if (!piece) return null;

    // Decay confidence based on time passed (10% decay per 5 turns)
    const turnsPassed = (Date.now() - piece.lastSeen) / 1000 / 5;
    const decayedConfidence = piece.confidence * Math.pow(0.9, turnsPassed);
    return {
      ...piece,
      confidence: decayedConfidence
    };
  }

  // Record the result of a battle with enhanced learning
  recordBattle(attackerPos, defenderPos, attackerType, defenderType, winner) {
    console.log(`[Enhanced AI] Recording battle:`, {
      attacker: attackerType,
      defender: defenderType,
      winner,
      previousKnownPieces: Object.keys(this.knownPieces).length
    });

    this.revealedPieces.add(`${attackerPos.row}-${attackerPos.col}`);
    this.revealedPieces.add(`${defenderPos.row}-${defenderPos.col}`);
    
    // Record battle outcome for learning with player information
    this.battleHistory.push({
      attacker: {
        type: attackerType,
        player: winner === 'attacker' ? 'ai' : 'player'
      },
      defender: {
        type: defenderType,
        player: winner === 'defender' ? 'ai' : 'player'
      },
      winner: winner === 'attacker' ? 'ai' : 'player',
      timestamp: Date.now()
    });

    // Update inferred strengths based on battle outcome
    this.updateInferredStrengths(attackerType, defenderType, winner);
    
    // If we found a bomb, record it
    if (defenderType === 'B') {
      this.confirmedBombs.add(`${defenderPos.row}-${defenderPos.col}`);
      console.log(`[Enhanced AI] Recorded new bomb at ${defenderPos.row}-${defenderPos.col}`);
    }

    // Update our memory with 100% confidence for revealed pieces
    this.updatePieceMemory(attackerPos.row, attackerPos.col, attackerType, 1.0);
    this.updatePieceMemory(defenderPos.row, defenderPos.col, defenderType, 1.0);

    // Try to infer flag location based on defensive formations
    this.updateFlagSuspicion(defenderPos, defenderType);

    console.log(`[Enhanced AI] Updated memory:`, {
      newKnownPieces: Object.keys(this.knownPieces).length,
      totalRevealedPieces: this.revealedPieces.size,
      totalConfirmedBombs: this.confirmedBombs.size,
      inferredStrengths: Array.from(this.inferredStrengths.entries())
    });
  }

  // Update inferred strengths based on battle outcomes
  updateInferredStrengths(attackerType, defenderType, winner) {
    if (winner) {
      const winnerType = winner === 'attacker' ? attackerType : defenderType;
      const loserType = winner === 'attacker' ? defenderType : attackerType;
      
      // Don't infer for special pieces
      if (winnerType !== 'B' && winnerType !== 'F' && winnerType !== 'S' &&
          loserType !== 'B' && loserType !== 'F' && loserType !== 'S') {
        
        // Update our understanding of piece strengths
        const currentWinnerStrength = this.inferredStrengths.get(winnerType) || parseInt(winnerType);
        const currentLoserStrength = this.inferredStrengths.get(loserType) || parseInt(loserType);
        
        // If the outcome was unexpected, update our inferred strengths
        if (currentWinnerStrength < currentLoserStrength) {
          this.inferredStrengths.set(winnerType, Math.max(currentWinnerStrength, currentLoserStrength));
          // Also update our understanding of the loser's strength
          this.inferredStrengths.set(loserType, Math.min(currentLoserStrength, currentWinnerStrength));
        }

        // Record exact strength if revealed
        if (winnerType === attackerType) {
          this.inferredStrengths.set(defenderType, parseInt(defenderType));
        } else {
          this.inferredStrengths.set(attackerType, parseInt(attackerType));
        }
      }
    }
  }

  // Try to infer flag location based on defensive formations
  updateFlagSuspicion(defenderPos, defenderType) {
    if (defenderType === 'B') {
      // Check if this bomb is part of a defensive formation
      const nearbyBombs = Array.from(this.confirmedBombs)
        .map(pos => pos.split('-').map(Number))
        .filter(([row, col]) => 
          Math.abs(row - defenderPos.row) <= 1 && 
          Math.abs(col - defenderPos.col) <= 1
        );

      // If we find multiple bombs in formation, suspect flag nearby
      if (nearbyBombs.length >= 2) {
        // Look for the most protected position near these bombs
        const potentialFlagPos = this.findMostProtectedPosition(defenderPos, nearbyBombs);
        if (potentialFlagPos) {
          this.suspectedFlag = potentialFlagPos;
          console.log(`[Enhanced AI] Suspected flag location updated to:`, potentialFlagPos);
        }
      }
    }
  }

  // Find the most protected position near a defensive formation
  findMostProtectedPosition(centerPos, nearbyBombs) {
    const positions = [];
    for (let row = Math.max(0, centerPos.row - 1); row <= Math.min(9, centerPos.row + 1); row++) {
      for (let col = Math.max(0, centerPos.col - 1); col <= Math.min(9, centerPos.col + 1); col++) {
        if (!this.confirmedBombs.has(`${row}-${col}`)) {
          const protection = nearbyBombs.filter(([bombRow, bombCol]) => 
            Math.abs(bombRow - row) <= 1 && Math.abs(bombCol - col) <= 1
          ).length;
          positions.push({ row, col, protection });
        }
      }
    }
    
    // Return the position with the most protection
    return positions.length > 0 ? 
      positions.reduce((max, pos) => pos.protection > max.protection ? pos : max).protection >= 2 ?
      { row: positions[0].row, col: positions[0].col } : null : null;
  }

  // Get effective piece strength considering battle history
  getEffectiveStrength(type) {
    if (type === 'B') return 10;
    if (type === 'F') return 0;
    if (type === 'S') return 1;
    
    // If we have exact knowledge of this piece type, use it
    const knownStrength = parseInt(type);
    if (!isNaN(knownStrength)) {
      return knownStrength;
    }
    
    // Use inferred strength if available
    return this.inferredStrengths.get(type) || 0;
  }
}

// Strategic goals and their priority
const STRATEGIC_GOALS = {
  FIND_FLAG: 1,
  CLEAR_PATH: 2,
  PROTECT_PIECES: 3,
  ELIMINATE_THREATS: 4,
  SCOUT_TERRITORY: 5
};

// Enhanced AI class that uses memory and strategic planning
class EnhancedAI {
  constructor() {
    this.memory = new AIMemory();
    this.currentGoal = null;
    this.goalProgress = {};
    this.turnCount = 0;
  }

  // Main function to calculate the next move
  calculateMove(board, gameState) {
    this.turnCount++;
    console.log(`[Enhanced AI] Turn ${this.turnCount}`);
    console.log(`[Enhanced AI] Current Goal: ${Object.keys(STRATEGIC_GOALS).find(key => STRATEGIC_GOALS[key] === this.currentGoal)}`);
    
    this.updateGoals(board, gameState);
    const move = this.executeStrategy(board, gameState);
    
    if (move) {
      console.log(`[Enhanced AI] Making move:`, {
        piece: move.piece.type,
        from: move.from,
        to: move.to,
        knownPieces: Object.keys(this.memory.knownPieces).length,
        confirmedBombs: this.memory.confirmedBombs.size
      });
    }
    
    return move;
  }

  // Update strategic goals based on game state
  updateGoals(board, gameState) {
    // Early game: Focus on scouting and gathering information
    if (this.turnCount < 10) {
      this.currentGoal = STRATEGIC_GOALS.SCOUT_TERRITORY;
      return;
    }

    // If we suspect where the flag is, prioritize capturing it
    if (this.memory.suspectedFlag) {
      this.currentGoal = STRATEGIC_GOALS.FIND_FLAG;
      return;
    }

    // If we have high-value pieces threatened, protect them
    if (this.hasThreatenedPieces(board)) {
      this.currentGoal = STRATEGIC_GOALS.PROTECT_PIECES;
      return;
    }

    // Default to eliminating threats
    this.currentGoal = STRATEGIC_GOALS.ELIMINATE_THREATS;
  }

  // Execute the current strategy based on goals
  executeStrategy(board, gameState) {
    const possibleMoves = this.getAllPossibleMoves(board);
    
    // Score moves based on current goal and memory
    const scoredMoves = possibleMoves.map(move => ({
      ...move,
      score: this.evaluateMove(move, board, gameState)
    }));

    // Sort moves by score and add some randomization for unpredictability
    scoredMoves.sort((a, b) => b.score - a.score);
    
    // Select from top moves with some randomization
    const topMoves = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
    return topMoves[Math.floor(Math.random() * topMoves.length)];
  }

  // Evaluate a move based on current goal and memory
  evaluateMove(move, board, gameState) {
    let score = 0;
    const targetPos = move.to;
    const targetPiece = board[targetPos.row][targetPos.col];

    // Base score from piece strengths
    score += this.evaluateBasicMove(move, targetPiece);

    // Strategic scoring based on current goal
    switch (this.currentGoal) {
      case STRATEGIC_GOALS.FIND_FLAG:
        score += this.evaluateFlagHunting(move, targetPos);
        break;
      case STRATEGIC_GOALS.PROTECT_PIECES:
        score += this.evaluateProtection(move, board);
        break;
      case STRATEGIC_GOALS.SCOUT_TERRITORY:
        score += this.evaluateScouting(move, board);
        break;
      case STRATEGIC_GOALS.ELIMINATE_THREATS:
        score += this.evaluateThreatElimination(move, board);
        break;
    }

    // Memory-based adjustments
    score += this.evaluateFromMemory(move, targetPos);

    return score;
  }

  // Evaluate basic move mechanics
  evaluateBasicMove(move, targetPiece) {
    let score = 0;
    
    // Prefer moves that advance pieces (weighted by piece value)
    const advanceScore = (move.to.row - move.from.row) * this.getPieceValue(move.piece.type);
    score += advanceScore;

    // If attacking, evaluate combat potential
    if (targetPiece && targetPiece.player === 'player') {
      const memory = this.memory.getPieceMemory(move.to.row, move.to.col);
      if (memory) {
        // We have some memory of this piece
        const attackerStrength = this.getPieceValue(move.piece.type);
        const defenderStrength = this.getPieceValue(memory.type);
        score += (attackerStrength - defenderStrength) * memory.confidence * 100;
      } else {
        // No memory - small bonus for attacking unknown pieces
        score += 20;
      }
    }

    return score;
  }

  // Evaluate moves for flag hunting
  evaluateFlagHunting(move, targetPos) {
    let score = 0;
    
    // Distance to suspected flag location
    if (this.memory.suspectedFlag) {
      const distance = this.calculateDistance(targetPos, this.memory.suspectedFlag);
      score += (10 - distance) * 50;
    }

    // Bonus for moves toward back row where flag likely is
    score += (9 - move.to.row) * 30;

    return score;
  }

  // Evaluate moves for protecting pieces
  evaluateProtection(move, board) {
    let score = 0;
    const piece = move.piece;

    // Bonus for moving away from danger
    if (this.isThreatenedPiece(piece, move.from, board)) {
      score += 200;
    }

    // Bonus for moving to protect high-value pieces
    const nearbyAllies = this.getNearbyPieces(move.to, board, 'ai');
    for (const ally of nearbyAllies) {
      if (this.getPieceValue(ally.type) >= 8) { // High value piece
        score += 150;
      }
    }

    return score;
  }

  // Evaluate moves for scouting
  evaluateScouting(move, board) {
    let score = 0;

    // Bonus for moves that reveal new information
    const unexploredArea = this.getUnexploredAdjacentSquares(move.to, board);
    score += unexploredArea * 50;

    // Bonus for scout pieces doing scouting
    if (move.piece.type === '9') {
      score += 100;
    }

    return score;
  }

  // Evaluate moves for eliminating threats
  evaluateThreatElimination(move, board) {
    let score = 0;
    const targetPos = move.to;
    const targetPiece = board[targetPos.row][targetPos.col];

    // First check for known bombs
    if (this.memory.confirmedBombs.has(`${targetPos.row}-${targetPos.col}`)) {
      // Only miners (8) can safely approach bombs
      if (move.piece.type !== '8') {
        return -2000; // Immediate strong rejection of the move
      } else {
        score += 500; // Bonus for miners clearing bombs
      }
    }

    if (targetPiece && targetPiece.player === 'player') {
      const memory = this.memory.getPieceMemory(targetPos.row, targetPos.col);
      
      if (memory) {
        const effectiveTargetStrength = this.memory.getEffectiveStrength(memory.type);
        const attackerStrength = this.memory.getEffectiveStrength(move.piece.type);
        
        // If we know exactly what the piece is
        if (!isNaN(parseInt(memory.type))) {
          // Strongly discourage attacking with weaker pieces
          if (attackerStrength <= effectiveTargetStrength) {
            score -= 1000;
            return score; // Early return to prevent this move
          }
          
          // Bonus for favorable matchups based on exact knowledge
          if (attackerStrength > effectiveTargetStrength) {
            score += 200 * (attackerStrength - effectiveTargetStrength);
          }
        } else {
          // For pieces we're not completely sure about
          if (effectiveTargetStrength > attackerStrength) {
            score -= 500;
          } else if (attackerStrength > effectiveTargetStrength) {
            score += 100 * (attackerStrength - effectiveTargetStrength);
          }
        }
        
        // Additional bonus for using appropriate piece strength
        if (attackerStrength >= effectiveTargetStrength && 
            attackerStrength - effectiveTargetStrength <= 2) {
          score += 150;
        }
      } else {
        // For unknown pieces, prefer using mid-strength pieces
        const attackerStrength = this.memory.getEffectiveStrength(move.piece.type);
        if (attackerStrength >= 4 && attackerStrength <= 6) {
          score += 50; // Reduced bonus for exploring unknown pieces
        }
        
        // Discourage using high-value pieces against unknown pieces
        if (attackerStrength >= 7) {
          score -= 200;
        }
      }

      // Additional penalty for attacking with a weaker or equal piece than one that just lost
      const recentBattles = this.memory.battleHistory.slice(-5);
      for (const battle of recentBattles) {
        if (battle.defender.type === targetPiece.type && 
            this.memory.getEffectiveStrength(move.piece.type) <= this.memory.getEffectiveStrength(battle.attacker.type)) {
          score -= 800;
          break;
        }
      }

      // Check if any recent battles at this position resulted in finding a bomb
      const recentBattlesAtPosition = recentBattles.filter(battle => {
        const battlePos = this.memory.battleHistory.find(b => 
          b.timestamp === battle.timestamp
        );
        return battlePos && battlePos.defender.type === 'B';
      });

      if (recentBattlesAtPosition.length > 0 && move.piece.type !== '8') {
        score -= 1500; // Strong penalty for non-miners approaching positions where bombs were found
      }
    }

    return score;
  }

  // Evaluate based on memory
  evaluateFromMemory(move, targetPos) {
    let score = 0;
    const memory = this.memory.getPieceMemory(targetPos.row, targetPos.col);

    // Strict bomb avoidance for non-miners
    if (this.memory.confirmedBombs.has(`${targetPos.row}-${targetPos.col}`)) {
      if (move.piece.type !== '8') {
        return -2000; // Immediate rejection for non-miners
      } else {
        score += 500; // Bonus for miners approaching bombs
      }
    }

    // Check adjacent squares for bombs and add penalties for non-miners
    if (move.piece.type !== '8') {
      const adjacentPositions = [
        { row: targetPos.row - 1, col: targetPos.col },
        { row: targetPos.row + 1, col: targetPos.col },
        { row: targetPos.row, col: targetPos.col - 1 },
        { row: targetPos.row, col: targetPos.col + 1 }
      ];

      for (const pos of adjacentPositions) {
        if (this.memory.confirmedBombs.has(`${pos.row}-${pos.col}`)) {
          score -= 300; // Penalty for non-miners moving next to bombs
        }
      }
    }

    // Use memory confidence to adjust score
    if (memory) {
      score *= memory.confidence;
    }

    return score;
  }

  // Helper function to get piece value
  getPieceValue(type) {
    if (type === 'B') return 10;
    if (type === 'F') return 0;
    if (type === 'S') return type === '1' ? 15 : 1; // Spy is valuable against Marshal
    return parseInt(type) || 0;
  }

  // Helper function to calculate Manhattan distance
  calculateDistance(pos1, pos2) {
    return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
  }

  // Get all possible moves for AI pieces
  getAllPossibleMoves(board) {
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
    // Bombs and Flags cannot move
    if (piece.type === 'B' || piece.type === 'F') {
      return [];
    }

    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up, down, left, right
    const maxSteps = piece.type === '9' ? 9 : 1; // Scout can move multiple spaces

    directions.forEach(([dx, dy]) => {
      for (let steps = 1; steps <= maxSteps; steps++) {
        const newRow = row + dx * steps;
        const newCol = col + dy * steps;

        // Check bounds
        if (newRow < 0 || newRow >= 10 || newCol < 0 || newCol >= 10) break;

        // Check water squares
        if ((newRow === 4 || newRow === 5) && (newCol === 2 || newCol === 3 || newCol === 6 || newCol === 7)) break;

        const targetPiece = board[newRow][newCol];
        
        // Check for known bombs - only miners can move onto bomb squares
        const isBomb = this.memory.confirmedBombs.has(`${newRow}-${newCol}`);
        if (isBomb && piece.type !== '8') break;

        // Can't move through pieces (except for initial scout move)
        if (steps > 1 && targetPiece) break;

        // Can't move to square with friendly piece
        if (targetPiece && targetPiece.player === piece.player) break;

        moves.push({ row: newRow, col: newCol });

        // Stop if we hit any piece
        if (targetPiece) break;
      }
    });

    return moves;
  }

  // Helper to check if a piece is threatened
  isThreatenedPiece(piece, position, board) {
    const nearbyEnemies = this.getNearbyPieces(position, board, 'player');
    return nearbyEnemies.some(enemy => {
      const memory = this.memory.getPieceMemory(enemy.row, enemy.col);
      if (memory) {
        return this.getPieceValue(memory.type) > this.getPieceValue(piece.type);
      }
      return false;
    });
  }

  // Get nearby pieces
  getNearbyPieces(position, board, player) {
    const nearby = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dx, dy] of directions) {
      const newRow = position.row + dx;
      const newCol = position.col + dy;
      
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
        const piece = board[newRow][newCol];
        if (piece && piece.player === player) {
          nearby.push({ ...piece, row: newRow, col: newCol });
        }
      }
    }
    
    return nearby;
  }

  // Count unexplored adjacent squares
  getUnexploredAdjacentSquares(position, board) {
    let count = 0;
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dx, dy] of directions) {
      const newRow = position.row + dx;
      const newCol = position.col + dy;
      
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 10) {
        const key = `${newRow}-${newCol}`;
        if (!this.memory.knownPieces[key] && !this.memory.revealedPieces.has(key)) {
          count++;
        }
      }
    }
    
    return count;
  }

  // Check if any high-value AI pieces are threatened
  hasThreatenedPieces(board) {
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const piece = board[row][col];
        if (piece && piece.player === 'ai' && this.getPieceValue(piece.type) >= 8) {
          if (this.isThreatenedPiece(piece, { row, col }, board)) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

// Export the enhanced AI
export const enhancedAI = new EnhancedAI();

export function calculateAIMove(board, gameState) {
  return enhancedAI.calculateMove(board, gameState);
} 