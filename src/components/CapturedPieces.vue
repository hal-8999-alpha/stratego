<template>
  <div class="captured-pieces">
    <h3>Captured Pieces</h3>
    <div class="captured-sections">
      <div class="player-captured">
        <h4>Your Captures</h4>
        <div class="pieces-grid">
          <GamePiece
            v-for="piece in playerCaptures"
            :key="`${piece.type}-${piece.id}`"
            :piece="piece"
            :reveal-ai="true"
          />
        </div>
      </div>
      <div class="ai-captured">
        <h4>AI's Captures</h4>
        <div class="pieces-grid">
          <GamePiece
            v-for="piece in aiCaptures"
            :key="`${piece.type}-${piece.id}`"
            :piece="piece"
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
  name: 'CapturedPieces',
  components: {
    GamePiece
  },
  setup() {
    const store = useStore()
    const playerCaptures = computed(() => store.state.capturedPieces.player)
    const aiCaptures = computed(() => store.state.capturedPieces.ai)

    return {
      playerCaptures,
      aiCaptures
    }
  }
}
</script>

<style lang="scss" scoped>
.captured-pieces {
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 1rem;

  h3 {
    margin-bottom: 1rem;
    text-align: center;
    color: var(--primary-color);
  }

  .captured-sections {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .player-captured,
  .ai-captured {
    h4 {
      margin-bottom: 0.5rem;
      color: var(--secondary-color);
    }
  }

  .pieces-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 0.5rem;
    padding: 0.5rem;
    background-color: var(--background-color);
    border-radius: 4px;
    min-height: 50px;
  }
}
</style> 