// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, onUnmounted } from 'vue'

export function useParcelImageOverlay(parcelsStore, alertStore) {
  const imageOverlayOpen = ref(false)
  const imageUrl = ref('')
  const imageLoading = ref(false)
  let activeObjectUrl = null

  function clearImageUrl() {
    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl)
      activeObjectUrl = null
    }
    imageUrl.value = ''
  }

  function closeImageOverlay() {
    imageOverlayOpen.value = false
    clearImageUrl()
  }

  async function openImageOverlay(parcelId) {
    if (!parcelId || imageLoading.value) return
    imageLoading.value = true
    imageOverlayOpen.value = true
    try {
      const blob = await parcelsStore.getImageBlob(parcelId)
      clearImageUrl()
      activeObjectUrl = URL.createObjectURL(blob)
      imageUrl.value = activeObjectUrl
    } catch (error) {
      imageOverlayOpen.value = false
      alertStore.error(error?.message || String(error))
    } finally {
      imageLoading.value = false
    }
  }

  onUnmounted(() => {
    clearImageUrl()
  })

  return {
    imageOverlayOpen,
    imageUrl,
    imageLoading,
    openImageOverlay,
    closeImageOverlay
  }
}
