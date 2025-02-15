<template>
  <div class="battle-display">
    <div class="battle-pieces">
      <div class="piece attacker" :class="{ 'winner': battleResult === 'attacker' }">
        <GamePiece :piece="currentBattle.attacker" :reveal-ai="true" />
      </div>
      <div class="vs">VS</div>
      <div class="piece defender" :class="{ 'winner': battleResult === 'defender' }">
        <GamePiece :piece="currentBattle.defender" :reveal-ai="true" />
      </div>
    </div>
    <div class="battle-result" v-if="battleResult">
      {{ battleResult === 'attacker' ? 'Attacker Wins!' : battleResult === 'defender' ? 'Defender Wins!' : 'Draw!' }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import GamePiece from './GamePiece.vue'
import gsap from 'gsap'

export default {
  name: 'BattleDisplay',
  components: {
    GamePiece
  },
  setup() {
    const store = useStore()
    const currentBattle = computed(() => store.state.currentBattle)
    const battleResult = ref(null)

    const determineBattleResult = () => {
      const { attacker, defender } = currentBattle.value;
      console.log('Determining battle result between:', attacker.type, 'and', defender.type);
      
      // Special cases
      if (defender.type === 'F') {
        console.log('Defender is flag - attacker wins');
        return 'attacker';
      }
      
      // Spy rules
      if (attacker.type === 'S') {
        // Spy vs Spy - both lose
        if (defender.type === 'S') {
          console.log('Spy vs Spy - both lose');
          return 'draw';
        }
        // Spy cannot win against a bomb
        if (defender.type === 'B') {
          console.log('Spy attacking bomb - spy loses');
          return 'defender';
        }
        // Spy wins against everything else when attacking
        console.log('Spy attacking - spy wins');
        return 'attacker';
      }
      if (defender.type === 'S') {
        console.log('Spy is defending - always loses');
        return 'attacker';
      }
      
      // Bomb rules
      if (defender.type === 'B') {
        console.log('Defender is bomb - checking if attacker is miner');
        return attacker.type === '8' ? 'attacker' : 'defender';
      }

      // Normal battle - lower number is stronger (1 is highest rank)
      const attackerRank = parseInt(attacker.type) || 0;
      const defenderRank = parseInt(defender.type) || 0;
      console.log('Normal battle:', attackerRank, 'vs', defenderRank);
      
      // Equal ranks result in both pieces being removed
      if (attackerRank === defenderRank) {
        console.log('Equal ranks - both pieces will be removed');
        return 'draw';
      }
      
      return attackerRank < defenderRank ? 'attacker' : 'defender';
    }

    onMounted(() => {
      // Animate the battle
      gsap.from('.piece', {
        scale: 0,
        opacity: 0,
        duration: 0.5,
        stagger: 0.2,
        ease: 'back.out(1.7)',
        onComplete: () => {
          gsap.to('.vs', {
            scale: 1.2,
            duration: 0.3,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
              battleResult.value = determineBattleResult()
              gsap.to('.winner', {
                scale: 1.2,
                duration: 0.5,
                ease: 'power2.out',
                delay: 0.5
              })
              
              // End battle after animation
              setTimeout(() => {
                const isAttackerWinner = battleResult.value === 'attacker';
                const isDraw = battleResult.value === 'draw';
                
                store.commit('endBattle', {
                  winner: isDraw ? null : (isAttackerWinner ? currentBattle.value.attacker : currentBattle.value.defender),
                  loser: isDraw ? null : (isAttackerWinner ? currentBattle.value.defender : currentBattle.value.attacker),
                  position: currentBattle.value.defenderPosition,
                  isAttackerWinner
                })
              }, 2000)
            }
          })
        }
      })
    })

    return {
      currentBattle,
      battleResult
    }
  }
}
</script>

<style lang="scss" scoped>
.battle-display {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 380px;
  height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 2px solid var(--accent-color);
  position: relative;

  .battle-pieces {
    display: grid;
    grid-template-columns: 120px 80px 120px;
    align-items: center;
    justify-content: center;
    gap: 0;
    height: 100%;

    .piece {
      transform-origin: center;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 70px;
      position: relative;
      
      &.winner {
        :deep(.game-piece) {
          position: relative;

          &::before {
            content: '👑';
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 1.2rem;
            z-index: 2;
            filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
          }
        }
      }

      &.attacker {
        justify-content: flex-end;
        padding-right: 0.75rem;
      }

      &.defender {
        justify-content: flex-start;
        padding-left: 0.75rem;
      }

      :deep(.game-piece) {
        transform: scale(0.9);
        position: relative;
      }
    }

    .vs {
      font-size: 1.2rem;
      font-weight: bold;
      color: var(--accent-color);
      background: #f5f5f5;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
  }

  .battle-result {
    position: absolute;
    bottom: -32px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    font-size: 1.1rem;
    font-weight: bold;
    color: var(--primary-color);
    animation: fadeIn 0.5s ease-out;
    padding: 0.25rem 1.5rem;
    background: white;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    z-index: 1;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
</style> 