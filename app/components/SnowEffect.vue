<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    count?: number
  }>(),
  {
    count: 20
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
      left: Math.round((i * (100 / props.count) + (Math.random() * 4 - 2))),
      size: Math.round(Math.random() * 3 + 3),
      duration: Math.round((Math.random() * 5 + 7) * 10) / 10,
      delay: Math.round((Math.random() * 6) * 10) / 10,
      opacity: Math.round((Math.random() * 0.35 + 0.35) * 100) / 100
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
      class="snow-flake"
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
