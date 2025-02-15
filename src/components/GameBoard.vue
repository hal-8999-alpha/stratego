<template>
  <div class="game-board">
    <div class="board-grid">
      <div
        v-for="(row, rowIndex) in board"
        :key="rowIndex"
        class="board-row"
      >
        <div
          v-for="(cell, colIndex) in row"
          :key="colIndex"
          class="board-cell"
          :class="{
            'water-cell': isWaterCell(rowIndex, colIndex),
            'highlight': isValidMove(rowIndex, colIndex),
            'battling': isBattlingPiece(rowIndex, colIndex)
          }"
          @click="handleCellClick(rowIndex, colIndex)"
        >
          <GamePiece
            v-if="cell"
            :piece="cell"
            :is-selected="isSelected(rowIndex, colIndex)"
            @click="selectPiece(rowIndex, colIndex)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import GamePiece from './GamePiece.vue'

export default {
  name: 'GameBoard',
  components: {
    GamePiece
  },
  setup() {
    const store = useStore()
    const board = computed(() => store.state.board)
    const selectedPiece = computed(() => store.state.selectedPiece)
    const gamePhase = computed(() => store.state.gamePhase)
    const currentBattle = computed(() => store.state.currentBattle)

    const isWaterCell = (row, col) => {
      return (row === 4 || row === 5) && (col === 2 || col === 3 || col === 6 || col === 7)
    }

    const isValidMove = (row, col) => {
      if (gamePhase.value === 'setup') return false;
      
      // Early return if no piece is selected
      if (!selectedPiece.value) return false;
      
      // Early return if water cell
      if (isWaterCell(row, col)) return false;
      
      // Check if the selected piece has valid coordinates
      const piece = selectedPiece.value;
      if (typeof piece.row !== 'number' || typeof piece.col !== 'number') {
        console.log('Selected piece missing coordinates:', piece);
        return false;
      }
      
      const validMoves = store.getters.getValidMoves(piece);
      return validMoves.some(move => move.row === row && move.col === col);
    }

    const isSelected = (row, col) => {
      return selectedPiece.value?.row === row && selectedPiece.value?.col === col
    }

    const selectPiece = (row, col) => {
      if (gamePhase.value !== 'playing') return
      if (store.state.currentPlayer !== 'player') return // Only allow selection during player's turn
      
      const piece = board.value[row][col]
      if (!piece || piece.player !== 'player') return
      
      // Don't allow selection of bombs and flags
      if (piece.type === 'B' || piece.type === 'F') {
        console.log('Cannot select immovable piece:', piece.type);
        return;
      }
      
      console.log('Selecting piece:', piece.type, 'at:', row, col);
      store.commit('selectPiece', {
        type: piece.type,
        player: piece.player,
        row: row,
        col: col
      });
    }

    const handleCellClick = (row, col) => {
      if (gamePhase.value === 'setup') {
        if (row < 6) return // Only allow placement in last 4 rows
        if (board.value[row][col]) return // Don't allow placement on occupied squares
        if (store.state.selectedPiece) {
          store.commit('placePiece', {
            piece: {
              type: store.state.selectedPiece.type,
              player: 'player',
              row,
              col
            },
            row,
            col
          })
        }
      } else if (gamePhase.value === 'playing') {
        // Only handle moves during player's turn
        if (store.state.currentPlayer !== 'player') return

        const clickedPiece = board.value[row][col]
        
        // If clicking on own piece, select it (unless it's a bomb or flag)
        if (clickedPiece && clickedPiece.player === 'player') {
          selectPiece(row, col)
          return
        }
        
        // If a piece is selected and the move is valid, make the move
        if (selectedPiece.value && isValidMove(row, col)) {
          store.dispatch('makeMove', {
            from: { 
              row: selectedPiece.value.row, 
              col: selectedPiece.value.col 
            },
            to: { row, col }
          })
          // Clear selection after move
          store.commit('selectPiece', null)
        }
      }
    }

    const isBattlingPiece = (row, col) => {
      if (!currentBattle.value || gamePhase.value !== 'battle') return false;
      
      const { attackerPosition, defenderPosition } = currentBattle.value;
      return (
        (row === attackerPosition.row && col === attackerPosition.col) ||
        (row === defenderPosition.row && col === defenderPosition.col)
      );
    }

    return {
      board,
      isWaterCell,
      isValidMove,
      isSelected,
      selectPiece,
      handleCellClick,
      isBattlingPiece
    }
  }
}
</script>

<style lang="scss" scoped>
.game-board {
  padding: 1rem;

  .board-grid {
    display: grid;
    grid-template-rows: repeat(10, var(--piece-size));
    gap: 1px;
    background-color: #666;
    border: 2px solid #333;
  }

  .board-row {
    display: grid;
    grid-template-columns: repeat(10, var(--piece-size));
    gap: 1px;
  }

  .board-cell {
    background-color: var(--board-color);
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;

    &:hover {
      background-color: darken(#deb887, 5%);
    }

    &.water-cell {
      background-color: var(--water-color);
      cursor: not-allowed;

      &:hover {
        background-color: var(--water-color);
      }
    }

    &.highlight {
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        border: 2px solid var(--secondary-color);
        opacity: 0.5;
        pointer-events: none;
      }
    }

    &.battling {
      animation: pulseBattle 1.5s infinite;
      
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        border: 3px solid var(--accent-color);
        opacity: 0.7;
        pointer-events: none;
      }
    }
  }
}

@keyframes pulseBattle {
  0% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0);
  }
}
</style> 