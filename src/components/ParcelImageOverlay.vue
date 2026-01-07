<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])
const closeButtonRef = ref(null)
let previouslyFocusedElement = null

// Store the previously focused element and move focus to close button when overlay opens
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    previouslyFocusedElement = document.activeElement
    await nextTick()
    if (closeButtonRef.value) {
      closeButtonRef.value.focus()
    }
  }
})

// Return focus to previously focused element when overlay closes
function handleClose() {
  emit('close')
  if (
    previouslyFocusedElement &&
    previouslyFocusedElement.isConnected &&
    typeof previouslyFocusedElement.focus === 'function'
  ) {
    previouslyFocusedElement.focus()
  }
  previouslyFocusedElement = null
}

// Close overlay when clicking on the background
function handleBackgroundClick(event) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

// Handle keyboard navigation within the modal (focus trap)
function handleKeyDown(event) {
  if (event.key === 'Tab') {
    // For simplicity, since we only have one focusable element (close button),
    // we prevent tab from doing anything to keep focus trapped
    event.preventDefault()
  }
}
</script>

<template>
  <div 
    v-if="open" 
    class="image-overlay" 
    role="dialog"
    aria-modal="true"
    aria-labelledby="image-overlay-title"
    data-test="parcel-image-overlay"
    @click="handleBackgroundClick"
    @keydown="handleKeyDown"
  >
    <div class="image-overlay-content">
      <h2 id="image-overlay-title" class="visually-hidden">Parcel Image</h2>
      <button 
        ref="closeButtonRef"
        class="image-overlay-close" 
        type="button" 
        @click="handleClose" 
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
}

.image-overlay-content {
  position: relative;
  background: #fff;
  padding: 0rem;
  border-radius: 0.5rem;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
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

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
