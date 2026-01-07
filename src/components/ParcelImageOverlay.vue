<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

defineProps({
  open: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])
</script>

<template>
  <div v-if="open" class="image-overlay" data-test="parcel-image-overlay">
    <div class="image-overlay-content">
      <button class="image-overlay-close" type="button" @click="emit('close')" aria-label="Close image overlay">
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
  padding: 1rem;
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
</style>
