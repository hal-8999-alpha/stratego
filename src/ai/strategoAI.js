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
  { type: 'B', row: 3, col: 9 },
]

export function getInitialAISetup() {
  return INITIAL_AI_SETUP.map(piece => ({
    ...piece,
    player: 'ai'
  }))
}

export function calculateAIMove(board) {
  const aiPieces = []
  const possibleMoves = []

  // Find all AI pieces and their possible moves
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const piece = board[row][col]
      if (piece && piece.player === 'ai') {
        // Skip bombs and flags
        if (piece.type === 'B' || piece.type === 'F') continue;
        
        aiPieces.push({ ...piece, row, col })
        
        // Calculate possible moves for this piece
        const moves = getValidMovesForPiece(piece, row, col, board)
        moves.forEach(move => {
          possibleMoves.push({
            from: { row, col },
            to: move,
            piece
          })
        })
      }
    }
  }

  // If no moves are possible, return null
  if (possibleMoves.length === 0) return null

  // Simple strategy: randomly choose a move, but prefer:
  // 1. Attacking weaker pieces
  // 2. Moving pieces forward
  // 3. Protecting the flag
  const scoredMoves = possibleMoves.map(move => ({
    ...move,
    score: calculateMoveScore(move, board)
  }))

  // Sort moves by score and pick one of the top 3 randomly
  scoredMoves.sort((a, b) => b.score - a.score)
  const topMoves = scoredMoves.slice(0, Math.min(3, scoredMoves.length))
  return topMoves[Math.floor(Math.random() * topMoves.length)]
}

function getValidMovesForPiece(piece, row, col, board) {
  // Bombs and Flags cannot move
  if (piece.type === 'B' || piece.type === 'F') {
    return [];
  }

  const moves = []
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]] // up, down, left, right
  const maxSteps = piece.type === '9' ? 9 : 1 // Scout can move multiple spaces

  directions.forEach(([dx, dy]) => {
    for (let steps = 1; steps <= maxSteps; steps++) {
      const newRow = row + dx * steps
      const newCol = col + dy * steps

      // Check bounds
      if (newRow < 0 || newRow >= 10 || newCol < 0 || newCol >= 10) break

      // Check water squares
      if ((newRow === 4 || newRow === 5) && (newCol === 2 || newCol === 3 || newCol === 6 || newCol === 7)) break

      const targetPiece = board[newRow][newCol]
      
      // Can't move through pieces (except for initial scout move)
      if (steps > 1 && targetPiece) break

      // Can't move to square with friendly piece
      if (targetPiece && targetPiece.player === piece.player) break

      moves.push({ row: newRow, col: newCol })

      // Stop if we hit any piece
      if (targetPiece) break
    }
  })

  return moves
}

function calculateMoveScore(move, board) {
  let score = 0
  const targetPiece = board[move.to.row][move.to.col]

  // Bonus for attacking weaker pieces
  if (targetPiece && targetPiece.player === 'player') {
    const attackerStrength = getPieceStrength(move.piece.type)
    const defenderStrength = getPieceStrength(targetPiece.type)
    
    if (attackerStrength > defenderStrength) {
      score += 100 + (attackerStrength - defenderStrength) * 10
    }
  }

  // Bonus for moving forward (towards player's side)
  score += move.to.row - move.from.row

  // Penalty for moving bombs or flag
  if (move.piece.type === 'B' || move.piece.type === 'F') {
    score -= 50
  }

  return score
}

function getPieceStrength(type) {
  if (type === 'B') return 10
  if (type === 'F') return 0
  if (type === 'S') return 1
  return parseInt(type) || 0
}

function isWaterSquare(row, col) {
  return (row === 4 || row === 5) && (col === 2 || col === 3 || col === 6 || col === 7)
} 