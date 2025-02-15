<template>
  <div class="stratego-game">
    <div class="game-container">
      <div class="game-header">
        <div class="battle-area">
          <BattleDisplay v-if="gamePhase === 'battle'" />
        </div>
        <div class="game-info">
          <h1>Stratego</h1>
          <div class="status-bar">
            <div class="status" v-if="gamePhase === 'playing' || gamePhase === 'battle'">
              {{ gameStatus }}
            </div>
            <div class="button-group">
              <button
                v-if="gamePhase === 'playing' || gamePhase === 'battle'"
                class="reset-game-btn"
                @click="resetGame"
              >
                Reset Game
              </button>
              <button
                class="debug-btn"
                @click="toggleDebug"
                :class="{ 'active': isDebugMode }"
              >
                {{ isDebugMode ? 'Debug: ON' : 'Debug: OFF' }}
              </button>
            </div>
          </div>
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
import BattleDisplay from './components/BattleDisplay.vue'
import CapturedPieces from './components/CapturedPieces.vue'

export default {
  name: 'App',
  components: {
    GameBoard,
    SetupPanel,
    BattleDisplay,
    CapturedPieces
  },
  setup() {
    const store = useStore()
    const gamePhase = computed(() => store.state.gamePhase)
    const currentPlayer = computed(() => store.state.currentPlayer)
    const winner = computed(() => store.state.winner)
    const isDebugMode = computed(() => store.state.isDebugMode)

    const gameStatus = computed(() => {
      if (gamePhase.value === 'playing' || gamePhase.value === 'battle') {
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

    const toggleDebug = () => {
      store.commit('toggleDebugMode')
    }

    return {
      gamePhase,
      gameStatus,
      winner,
      isDebugMode,
      resetGame,
      toggleDebug
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
    gap: 1rem;
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 1200px;
    max-width: 95vw;

    .game-header {
      display: grid;
      grid-template-columns: 400px 1fr;
      gap: 2rem;
      align-items: start;
      height: 120px;
      margin-bottom: 1rem;

      .battle-area {
        height: 100%;
        display: flex;
        align-items: center;
      }

      .game-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.75rem;
        padding-right: 1rem;
        height: 100%;

        h1 {
          color: var(--primary-color);
          font-size: 2.5rem;
          margin: 0;
          font-weight: bold;
          line-height: 1;
        }

        .status-bar {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.75rem;
          width: 100%;

          .status {
            font-size: 1.1rem;
            color: var(--secondary-color);
            font-weight: 600;
            background: #f5f5f5;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            white-space: nowrap;
          }

          .button-group {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
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
            min-width: 100px;

            &:hover {
              filter: brightness(90%);
            }
          }

          .debug-btn {
            padding: 0.5rem 1rem;
            background-color: #666;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 0.9rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            margin: 0;
            min-width: 100px;

            &:hover {
              filter: brightness(90%);
            }

            &.active {
              background-color: var(--accent-color);
            }
          }
        }
      }
    }

    .game-layout {
      display: grid;
      grid-template-columns: 600px 1fr;
      gap: 2rem;
      align-items: start;

      .game-board {
        width: 600px;
        height: 600px;
      }

      .side-panel {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
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