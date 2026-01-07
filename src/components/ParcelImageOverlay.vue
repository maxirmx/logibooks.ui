<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const overlayRef = ref(null)
const closeButtonRef = ref(null)
const previousActiveElement = ref(null)

// Selector for all focusable elements within the overlay
const FOCUSABLE_SELECTORS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable], audio[controls], video[controls], details'

// Track focusable elements within the overlay
const focusableElements = ref([])

function getFocusableElements() {
  if (!overlayRef.value) return []
  return Array.from(overlayRef.value.querySelectorAll(FOCUSABLE_SELECTORS))
}

function trapFocus(event) {
  if (event.key !== 'Tab') return
  
  const elements = getFocusableElements()
  if (elements.length === 0) return

  const firstElement = elements[0]
  const lastElement = elements[elements.length - 1]

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    }
  } else {
    if (document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }
}

function handleBackgroundClick(event) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    previousActiveElement.value = document.activeElement
    await nextTick()
    focusableElements.value = getFocusableElements()
    if (closeButtonRef.value) {
      closeButtonRef.value.focus()
    }
    document.addEventListener('keydown', trapFocus)
  } else {
    document.removeEventListener('keydown', trapFocus)
    previousActiveElement.value?.focus?.()
    previousActiveElement.value = null
  }
}, { immediate: true })

// Cleanup on unmount in case component is destroyed while overlay is open
onBeforeUnmount(() => {
  document.removeEventListener('keydown', trapFocus)
})

</script>

<template>
  <div 
    v-if="open" 
    ref="overlayRef"
    class="image-overlay" 
    data-test="parcel-image-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="image-overlay-title"
    @click="handleBackgroundClick"
  >
    <div class="image-overlay-content" @click.stop>
      <span id="image-overlay-title" class="sr-only">Parcel image</span>
      <button 
        ref="closeButtonRef"
        class="image-overlay-close" 
        type="button" 
        @click="emit('close')" 
        aria-label="Close image overlay"
      >
        ×
      </button>
      <div v-if="loading" class="image-overlay-loading" data-test="parcel-image-loading">
        Загрузка...
      </div>
      <img v-else-if="imageUrl" :src="imageUrl" alt="Parcel image" class="image-overlay-image" />
    </div>
  </div>
</template>

<style scoped>
.image-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: pointer;
}

.image-overlay-content {
  position: relative;
  background: #fff;
  padding: 1rem;
  border-radius: 0.5rem;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.image-overlay-close {
  position: absolute;
  top: 0.25rem;
  right: 0.5rem;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
}

.image-overlay-image {
  max-width: 86vw;
  max-height: 86vh;
  object-fit: contain;
}

.image-overlay-loading {
  font-size: 1rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
