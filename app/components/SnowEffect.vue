<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    count?: number
    fullPage?: boolean
  }>(),
  {
    count: 20,
    fullPage: false
  }
)

interface Flake {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  opacity: number
  isGold?: boolean
}

const flakes = computed<Flake[]>(() => {
  const list: Flake[] = []
  for (let i = 0; i < props.count; i++) {
    const isGold = i % 8 === 0 // occasional magical gold snowflake
    list.push({
      id: i,
      left: Math.round((i * (100 / props.count) + (Math.random() * 4 - 2))),
      size: isGold ? Math.round(Math.random() * 2 + 2) : Math.round(Math.random() * 3 + 3),
      duration: Math.round((Math.random() * 6 + 7) * 10) / 10,
      delay: Math.round((Math.random() * 6) * 10) / 10,
      opacity: Math.round((Math.random() * 0.35 + 0.4) * 100) / 100,
      isGold
    })
  }
  return list
})
</script>

<template>
  <div :class="fullPage ? 'snow-container-fixed' : 'snow-container'" aria-hidden="true">
    <div
      v-for="flake in flakes"
      :key="flake.id"
      :class="flake.isGold ? 'snow-flake-gold' : 'snow-flake'"
      :style="{
        left: `${flake.left}%`,
        width: `${flake.size}px`,
        height: `${flake.size}px`,
        animationDuration: `${flake.duration}s`,
        animationDelay: `${flake.delay}s`,
        '--flake-opacity': flake.opacity,
        opacity: flake.opacity
      }"
    />
  </div>
</template>
