<template>
  <div
    class="game-piece"
    :class="{
      'selected': isSelected,
      'player-piece': piece.player === 'player',
      'ai-piece': piece.player === 'ai'
    }"
  >
    <span class="piece-value" v-if="shouldShowValue">{{ piece.type }}</span>
    <span class="piece-value" v-else>?</span>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'

export default {
  name: 'GamePiece',
  props: {
    piece: {
      type: Object,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    revealAi: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const store = useStore()
    const isDebugMode = computed(() => store.state.isDebugMode)
    
    const shouldShowValue = computed(() => 
      props.piece.player === 'player' || 
      props.revealAi || 
      isDebugMode.value
    )

    return {
      shouldShowValue
    }
  }
}
</script>

<style lang="scss" scoped>
.game-piece {
  width: calc(var(--piece-size) - 10px);
  height: calc(var(--piece-size) - 10px);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 1.2rem;
  transition: all 0.2s ease;

  &.player-piece {
    background-color: #e74c3c;
    color: white;
  }

  &.ai-piece {
    background-color: #3498db;
    color: white;
  }

  &.selected {
    transform: scale(1.1);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  }
}

.piece-value {
  font-family: monospace;
  font-size: 1.2rem;
}
</style> 