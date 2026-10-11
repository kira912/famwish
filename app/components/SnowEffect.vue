<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    count?: number
  }>(),
  {
    count: 24
  }
)

interface Flake {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  opacity: number
}

const flakes = computed<Flake[]>(() => {
  const list: Flake[] = []
  for (let i = 0; i < props.count; i++) {
    list.push({
      id: i,
      left: Math.round(Math.random() * 100),
      size: Math.round(Math.random() * 4 + 3), // 3px to 7px
      duration: Math.round(Math.random() * 6 + 6), // 6s to 12s
      delay: Math.round(Math.random() * 8 * 10) / 10, // 0s to 8s
      opacity: Math.round((Math.random() * 0.5 + 0.35) * 100) / 100 // 0.35 to 0.85
    })
  }
  return list
})
</script>

<template>
  <div class="snow-container" aria-hidden="true">
    <div
      v-for="flake in flakes"
      :key="flake.id"
      class="snow-flake shadow-sm"
      :style="{
        left: `${flake.left}%`,
        width: `${flake.size}px`,
        height: `${flake.size}px`,
        animationDuration: `${flake.duration}s`,
        animationDelay: `${flake.delay}s`,
        opacity: flake.opacity
      }"
    />
  </div>
</template>
