<template>
  <div class="stratego-game">
    <div class="game-container">
      <div class="game-info">
        <h1>Stratego</h1>
        <div class="status-bar">
          <div class="status" v-if="gamePhase !== 'setup'">
            {{ gameStatus }}
          </div>
          <button
            v-if="gamePhase === 'playing'"
            class="reset-game-btn"
            @click="resetGame"
          >
            Reset Game
          </button>
        </div>
      </div>
      <div class="game-layout">
        <GameBoard class="game-board" />
        <div class="side-panel">
          <SetupPanel v-if="gamePhase === 'setup'" />
          <CapturedPieces v-if="gamePhase !== 'setup'" />
        </div>
      </div>
    </div>
    <BattleModal v-if="gamePhase === 'battle'" />
    <div class="game-over" v-if="gamePhase === 'gameOver'">
      <div class="game-over-content">
        <h2>Game Over!</h2>
        <p>{{ winner === 'player' ? 'You Won!' : 'AI Won!' }}</p>
        <button @click="resetGame">Play Again</button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, watch } from 'vue'
import { useStore } from 'vuex'
import GameBoard from './components/GameBoard.vue'
import SetupPanel from './components/SetupPanel.vue'
import BattleModal from './components/BattleModal.vue'
import CapturedPieces from './components/CapturedPieces.vue'

export default {
  name: 'App',
  components: {
    GameBoard,
    SetupPanel,
    BattleModal,
    CapturedPieces
  },
  setup() {
    const store = useStore()
    const gamePhase = computed(() => store.state.gamePhase)
    const currentPlayer = computed(() => store.state.currentPlayer)
    const winner = computed(() => store.state.winner)

    const gameStatus = computed(() => {
      if (gamePhase.value === 'playing') {
        return `Current Turn: ${currentPlayer.value === 'player' ? 'Your' : 'AI\'s'} Move`
      }
      return ''
    })

    // Watch for AI turns
    watch(currentPlayer, (newPlayer) => {
      if (newPlayer === 'ai') {
        store.dispatch('makeAIMove')
      }
    })

    const resetGame = () => {
      store.commit('resetGame')
    }

    return {
      gamePhase,
      gameStatus,
      winner,
      resetGame
    }
  }
}
</script>

<style lang="scss">
.stratego-game {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background-color);
  padding: 2rem;

  .game-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

    .game-info {
      text-align: center;

      h1 {
        color: var(--primary-color);
        margin-bottom: 1rem;
      }

      .status-bar {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;

        .status {
          font-size: 1.2rem;
          color: var(--secondary-color);
          font-weight: bold;
        }

        .reset-game-btn {
          padding: 0.5rem 1rem;
          background-color: var(--accent-color);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            filter: brightness(90%);
            transform: scale(1.05);
          }
        }
      }
    }

    .game-layout {
      display: grid;
      grid-template-columns: auto 300px;
      gap: 2rem;

      .side-panel {
        display: flex;
        flex-direction: column;
      }
    }
  }

  .game-over {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;

    .game-over-content {
      background-color: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;

      h2 {
        color: var(--primary-color);
        margin-bottom: 1rem;
      }

      p {
        font-size: 1.5rem;
        color: var(--accent-color);
        margin-bottom: 2rem;
      }

      button {
        padding: 0.8rem 2rem;
        background-color: var(--secondary-color);
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.2s ease;

        &:hover {
          filter: brightness(90%);
        }
      }
    }
  }
}
</style> 