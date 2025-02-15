<template>
  <div class="battle-modal">
    <div class="battle-content">
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
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import GamePiece from './GamePiece.vue'
import gsap from 'gsap'

export default {
  name: 'BattleModal',
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
                  position: currentBattle.value.defenderPosition, // Defender position is always the target position
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
.battle-modal {
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

  .battle-content {
    background-color: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .battle-pieces {
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 2rem;

    .piece {
      transform-origin: center;
      
      &.winner {
        position: relative;
        
        &::after {
          content: '👑';
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1.5rem;
        }
      }
    }

    .vs {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--accent-color);
    }
  }

  .battle-result {
    text-align: center;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-color);
    animation: fadeIn 0.5s ease-out;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 