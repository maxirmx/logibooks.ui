<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  text: {
    type: [String, Number],
    default: ''
  },
  tooltipLocation: {
    type: String,
    default: 'top'
  },
  emptyPlaceholder: {
    type: String,
    default: ''
  }
})

const textEl = ref(null)
const isTruncated = ref(false)

const measure = () => {
  const el = textEl.value
  if (!el) return
  // Force reflow before measuring
  isTruncated.value = el.scrollWidth > el.clientWidth + 1 // small tolerance
}

onMounted(() => {
  measure()
  // Recalculate on window resize (optional)
  window.addEventListener('resize', measure)
})

watch(() => props.text, () => {
  nextTick(() => measure())
})

// Clean up listener
onMounted(() => {
  // Using onMounted for add, we can use try/finally for remove on unmount
})
</script>

<template>
  <v-tooltip v-if="isTruncated && props.text" :location="tooltipLocation" open-delay="150">
    <template #activator="{ props: actProps }">
      <span v-bind="actProps" ref="textEl" class="file-text truncate-cell">{{ props.text }}</span>
    </template>
    <span>{{ props.text }}</span>
  </v-tooltip>
  <span v-else ref="textEl" class="file-text truncate-cell">{{ props.text || emptyPlaceholder }}</span>
</template>

<style scoped>
.truncate-cell.file-text {
  min-width: 180px;
  max-width: 220px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
</style>
