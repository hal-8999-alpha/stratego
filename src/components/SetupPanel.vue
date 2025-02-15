<template>
  <div class="setup-panel">
    <h2>Setup Your Pieces</h2>
    <div class="pieces-container">
      <div
        v-for="(count, type) in availablePieces"
        :key="type"
        class="piece-option"
        :class="{ 'disabled': count === 0 }"
        @click="selectPiece(type)"
      >
        <GamePiece
          :piece="{ type, player: 'player' }"
          :is-selected="selectedPiece?.type === type"
        />
        <span class="piece-count">{{ count }}</span>
      </div>
    </div>
    <div class="button-container">
      <button
        class="reset-btn"
        @click="resetBoard"
      >
        Reset Board
      </button>
      <button
        class="auto-place-btn"
        @click="autoPlace"
        :disabled="!hasRemainingPieces"
      >
        Auto Place
      </button>
      <button
        class="start-game-btn"
        :disabled="!isSetupComplete"
        @click="startGame"
      >
        Start Game
      </button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import GamePiece from './GamePiece.vue'

export default {
  name: 'SetupPanel',
  components: {
    GamePiece
  },
  setup() {
    const store = useStore()
    const availablePieces = computed(() => store.state.availablePieces)
    const selectedPiece = computed(() => store.state.selectedPiece)
    const isSetupComplete = computed(() => store.getters.isSetupComplete)
    const hasRemainingPieces = computed(() => 
      Object.values(availablePieces.value).some(count => count > 0)
    )

    const selectPiece = (type) => {
      if (availablePieces.value[type] > 0) {
        store.commit('selectPiece', { type })
      }
    }

    const startGame = () => {
      store.commit('setGamePhase', 'playing')
      store.dispatch('initializeGame')
    }

    const resetBoard = () => {
      store.commit('resetGame')
    }

    const autoPlace = () => {
      store.dispatch('autoPlacePieces')
    }

    return {
      availablePieces,
      selectedPiece,
      isSetupComplete,
      hasRemainingPieces,
      selectPiece,
      startGame,
      resetBoard,
      autoPlace
    }
  }
}
</script>

<style lang="scss" scoped>
.setup-panel {
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  h2 {
    margin-bottom: 1rem;
    text-align: center;
    color: var(--primary-color);
  }

  .pieces-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .piece-option {
    position: relative;
    cursor: pointer;

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .piece-count {
      position: absolute;
      top: -8px;
      right: -8px;
      background-color: var(--primary-color);
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 0.8rem;
      font-weight: bold;
    }
  }

  .button-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .start-game-btn,
  .reset-btn,
  .auto-place-btn {
    padding: 0.8rem;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover:not(:disabled) {
      filter: brightness(90%);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .start-game-btn {
    background-color: var(--secondary-color);
  }

  .reset-btn {
    background-color: var(--accent-color);
  }

  .auto-place-btn {
    background-color: var(--primary-color);
  }
}
</style> 