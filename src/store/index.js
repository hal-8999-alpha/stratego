import { createStore } from 'vuex'
import { getInitialAISetup, calculateAIMove } from '../ai/strategoAI'

const BOARD_SIZE = 10
const INITIAL_PIECES = {
  'F': 1,  // Flag
  'S': 1,  // Spy
  '1': 1,  // Marshal
  '2': 1,  // General
  '3': 2,  // Colonel
  '4': 3,  // Major
  '5': 4,  // Captain
  '6': 4,  // Lieutenant
  '7': 4,  // Sergeant
  '8': 5,  // Miner
  '9': 8,  // Scout
  'B': 6   // Bomb
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generatePlayerSetup() {
  // Create array of all pieces
  const pieces = [];
  Object.entries(INITIAL_PIECES).forEach(([type, count]) => {
    for (let i = 0; i < count; i++) {
      pieces.push(type);
    }
  });

  // Shuffle pieces
  shuffleArray(pieces);

  // Create setup array
  const setup = [];
  let pieceIndex = 0;
  for (let row = 6; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      setup.push({
        type: pieces[pieceIndex],
        row,
        col,
        player: 'player'
      });
      pieceIndex++;
    }
  }
  return setup;
}

export default createStore({
  state: {
    board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
    selectedPiece: null,
    gamePhase: 'setup', // setup, playing, battle, gameOver
    availablePieces: { ...INITIAL_PIECES },
    playerPieces: {},
    aiPieces: {},
    currentBattle: null,
    winner: null,
    currentPlayer: 'player', // player, ai
    capturedPieces: {
      player: [], // pieces captured by player
      ai: []     // pieces captured by AI
    },
    captureId: 0, // unique id for captured pieces
    isDebugMode: false // new debug state
  },
  
  mutations: {
    placePiece(state, { piece, row, col }) {
      const validPiece = piece.player === 'player' && state.availablePieces[piece.type] > 0;
      if (validPiece) {
        state.availablePieces[piece.type]--;
        state.playerPieces[`${row}-${col}`] = piece;
        state.board[row][col] = piece;
        console.log('Placed piece:', piece, 'at:', row, col);
        console.log('Board state:', state.board[row][col]);
      } else if (piece.player === 'ai') {
        state.aiPieces[`${row}-${col}`] = piece;
        state.board[row][col] = piece;
      }
    },
    
    selectPiece(state, piece) {
      console.log('Store selecting piece:', piece);
      // Ensure all piece data is properly copied
      state.selectedPiece = piece ? { ...piece } : null;
      console.log('Selected piece in store:', state.selectedPiece);
    },
    
    startBattle(state, { attacker, defender, attackerPosition, defenderPosition }) {
      state.currentBattle = { attacker, defender, attackerPosition, defenderPosition }
      state.gamePhase = 'battle'
    },
    
    endBattle(state, { winner, loser, position, isAttackerWinner }) {
      const attackerPosition = state.currentBattle.attackerPosition;
      const defenderPosition = state.currentBattle.defenderPosition;
      const attacker = state.currentBattle.attacker;
      const defender = state.currentBattle.defender;

      // Handle draw (both pieces are removed)
      if (winner === null && loser === null) {
        // Remove both pieces from the board
        state.board[attackerPosition.row][attackerPosition.col] = null;
        state.board[defenderPosition.row][defenderPosition.col] = null;
        
        // Remove from piece collections
        if (attacker.player === 'player') {
          delete state.playerPieces[`${attackerPosition.row}-${attackerPosition.col}`];
        } else {
          delete state.aiPieces[`${attackerPosition.row}-${attackerPosition.col}`];
        }
        
        if (defender.player === 'player') {
          delete state.playerPieces[`${defenderPosition.row}-${defenderPosition.col}`];
        } else {
          delete state.aiPieces[`${defenderPosition.row}-${defenderPosition.col}`];
        }
        
        // Add both pieces to captured pieces
        state.capturedPieces.player.push({ 
          type: defender.type,
          player: defender.player,
          id: state.captureId++
        });
        state.capturedPieces.ai.push({ 
          type: attacker.type,
          player: attacker.player,
          id: state.captureId++
        });
      } else {
        // Normal battle resolution (one winner, one loser)
        // Remove the losing piece from its position
        const loserPosition = isAttackerWinner 
          ? defenderPosition 
          : attackerPosition;
        
        // Clear the board position of the loser
        state.board[loserPosition.row][loserPosition.col] = null;
        
        // Remove loser from player/ai pieces collections and add to captured pieces
        const loserKey = `${loserPosition.row}-${loserPosition.col}`;
        if (loser.player === 'player') {
          delete state.playerPieces[loserKey];
          state.capturedPieces.ai.push({ 
            type: loser.type,
            player: loser.player,
            id: state.captureId++
          });
        } else {
          delete state.aiPieces[loserKey];
          state.capturedPieces.player.push({ 
            type: loser.type,
            player: loser.player,
            id: state.captureId++
          });
        }

        // Handle winner position
        const winnerPosition = isAttackerWinner
          ? attackerPosition
          : defenderPosition;

        // If attacker won, move them to defender's position
        // If defender won, they stay in place, just remove attacker
        if (isAttackerWinner) {
          // Clear attacker's original position
          state.board[winnerPosition.row][winnerPosition.col] = null;
          if (winner.player === 'player') {
            delete state.playerPieces[`${winnerPosition.row}-${winnerPosition.col}`];
          } else {
            delete state.aiPieces[`${winnerPosition.row}-${winnerPosition.col}`];
          }
          
          // Update winner with new position
          const updatedWinner = {
            ...winner,
            row: position.row,
            col: position.col
          };
          
          // Place winner in new position
          state.board[position.row][position.col] = updatedWinner;
          if (winner.player === 'player') {
            state.playerPieces[`${position.row}-${position.col}`] = updatedWinner;
          } else {
            state.aiPieces[`${position.row}-${position.col}`] = updatedWinner;
          }
        } else {
          // Defender won, just update their position properties
          const updatedWinner = {
            ...winner,
            row: position.row,
            col: position.col
          };
          
          // Update the piece in place
          state.board[position.row][position.col] = updatedWinner;
          if (winner.player === 'player') {
            state.playerPieces[`${position.row}-${position.col}`] = updatedWinner;
          } else {
            state.aiPieces[`${position.row}-${position.col}`] = updatedWinner;
          }
        }
      }

      state.currentBattle = null;
      state.gamePhase = 'playing';
      
      // Check if game is over (flag captured)
      if (loser?.type === 'F') {
        state.gamePhase = 'gameOver';
        state.winner = winner.player;
      }
      
      // Switch turns
      state.currentPlayer = state.currentPlayer === 'player' ? 'ai' : 'player';
    },
    
    setGamePhase(state, phase) {
      state.gamePhase = phase
    },
    
    movePiece(state, { from, to }) {
      const piece = state.board[from.row][from.col]
      
      // Update the piece's position
      const updatedPiece = {
        ...piece,
        row: to.row,
        col: to.col
      }
      
      // Clear old position
      state.board[from.row][from.col] = null
      
      // Set new position
      state.board[to.row][to.col] = updatedPiece
      
      // Update piece collections
      if (piece.player === 'player') {
        delete state.playerPieces[`${from.row}-${from.col}`]
        state.playerPieces[`${to.row}-${to.col}`] = updatedPiece
      } else {
        delete state.aiPieces[`${from.row}-${from.col}`]
        state.aiPieces[`${to.row}-${to.col}`] = updatedPiece
      }
      
      // Switch turns
      state.currentPlayer = state.currentPlayer === 'player' ? 'ai' : 'player'
    },
    
    setWinner(state, winner) {
      state.winner = winner
      state.gamePhase = 'gameOver'
    },

    resetGame(state) {
      state.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
      state.selectedPiece = null;
      state.gamePhase = 'setup';
      state.availablePieces = { ...INITIAL_PIECES };
      state.playerPieces = {};
      state.aiPieces = {};
      state.currentBattle = null;
      state.winner = null;
      state.currentPlayer = 'player';
      state.capturedPieces = { player: [], ai: [] };
      state.captureId = 0;
    },
    
    toggleDebugMode(state) {
      state.isDebugMode = !state.isDebugMode;
      console.log('Debug mode:', state.isDebugMode ? 'ON' : 'OFF');
    }
  },
  
  actions: {
    initializeGame({ commit, state }) {
      // Place AI pieces
      const aiSetup = getInitialAISetup()
      aiSetup.forEach(piece => {
        commit('placePiece', { piece, row: piece.row, col: piece.col })
      })
      
      commit('setGamePhase', 'playing')
      state.currentPlayer = 'player'
    },
    
    makeMove({ commit, state }, { from, to }) {
      // Only allow moves during the correct player's turn
      if (state.gamePhase !== 'playing' || 
          state.board[from.row][from.col]?.player !== state.currentPlayer) {
        return;
      }

      const movingPiece = JSON.parse(JSON.stringify(state.board[from.row][from.col]));
      const targetPiece = state.board[to.row][to.col] ? 
        JSON.parse(JSON.stringify(state.board[to.row][to.col])) : null;
      
      console.log('Moving piece:', movingPiece, 'from:', from, 'to:', to);
      console.log('Target piece:', targetPiece);
      
      if (targetPiece && targetPiece.player !== movingPiece.player) {
        console.log('Starting battle between:', movingPiece.type, 'and', targetPiece.type);
        commit('startBattle', {
          attacker: movingPiece,
          defender: targetPiece,
          attackerPosition: from,
          defenderPosition: to
        });
      } else if (!targetPiece) {
        commit('movePiece', { from, to });
      }
    },
    
    async makeAIMove({ dispatch, state }) {
      if (state.currentPlayer === 'ai' && state.gamePhase === 'playing') {
        const move = calculateAIMove(state.board)
        if (move) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Add delay for better UX
          dispatch('makeMove', {
            from: move.from,
            to: move.to
          })
        } else {
          commit('setWinner', 'player') // AI has no valid moves
        }
      }
    },

    autoPlacePieces({ commit, state }) {
      // Reset the board first
      commit('resetGame');
      
      // Generate and place pieces
      const setup = generatePlayerSetup();
      setup.forEach(piece => {
        commit('placePiece', { piece, row: piece.row, col: piece.col });
      });
    }
  },
  
  getters: {
    isSetupComplete: (state) => {
      return Object.values(state.availablePieces).every(count => count === 0)
    },
    
    getValidMoves: (state) => (piece) => {
      if (!piece || !piece.type || piece.row === undefined || piece.col === undefined) {
        console.log('Invalid piece:', piece);
        return [];
      }
      
      // Bombs and Flags cannot move
      if (piece.type === 'B' || piece.type === 'F') {
        console.log('Piece is bomb or flag - cannot move');
        return [];
      }

      const moves = [];
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up, down, left, right
      const maxSteps = piece.type === '9' ? 9 : 1; // Scout can move multiple spaces

      directions.forEach(([dx, dy]) => {
        let blocked = false;
        for (let steps = 1; steps <= maxSteps && !blocked; steps++) {
          const newRow = piece.row + dx * steps;
          const newCol = piece.col + dy * steps;

          // Check bounds
          if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
            blocked = true;
            continue;
          }

          // Check water squares
          if ((newRow === 4 || newRow === 5) && (newCol === 2 || newCol === 3 || newCol === 6 || newCol === 7)) {
            blocked = true;
            continue;
          }

          const targetPiece = state.board[newRow][newCol];
          
          // Can't move through pieces (even for scout)
          if (targetPiece) {
            // If it's an enemy piece, we can attack it but can't move further
            if (targetPiece.player !== piece.player) {
              moves.push({ row: newRow, col: newCol });
            }
            blocked = true;
            continue;
          }

          // Empty square - can move here
          moves.push({ row: newRow, col: newCol });
        }
      });

      console.log(`Found ${moves.length} valid moves for piece at ${piece.row},${piece.col}`);
      return moves;
    }
  }
}) 