<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelSelectionRestore } from '@/composables/useParcelSelectionRestore.js'
import ActionButton from '@/components/ActionButton.vue'
import { ensureHttps } from '@/helpers/url.helpers.js'

const props = defineProps({
  item: { type: Object, required: true },
  label: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  mutationDisabled: { type: Boolean, default: false }
})

const emit = defineEmits(['select-image', 'view-image', 'delete-image'])

const normalizedLink = computed(() => ensureHttps(props.item?.productLink) ?? '')
const hasLink = computed(() => Boolean(normalizedLink.value))
const viewDisabled = computed(() => props.disabled || !props.item?.hasImage)
const deleteDisabled = computed(() => props.disabled || props.mutationDisabled || !props.item?.hasImage)
// Keep the original public computed value for consumers and tests that inspect it.
const buttonsDisabled = viewDisabled
defineExpose({ buttonsDisabled })

const extensionPresent = ref(false)
function onMessage(e) {
  if (e && e.source === window && e.data && e.data.type === 'LOGIBOOKS_EXTENSION_ACTIVE') {
    extensionPresent.value = Boolean(e.data.active)
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  window.postMessage({ type: 'LOGIBOOKS_EXTENSION_QUERY' }, window.location.origin)
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
})

const selectDisabled = computed(() => props.disabled || props.mutationDisabled || !extensionPresent.value)

const selectTooltip = 'Выбрать изображение для тех. документации'
const viewTooltip = 'Посмотреть изображение для тех. документации'
const deleteTooltip = 'Удалить изображение для тех. документации'

function handleSelectClick() {
  const parcelsStore = useParcelsStore()
  const { user } = useAuthStore()
  const token = user?.token ?? null

  if (token === null) {
    const alertStore = useAlertStore()
    alertStore.error('Необходимо войти в систему')
    return
  }

  useAuthStore().persistListState()

  // Save selectedParcelId to separate snapshot for restoration after extension completes.
  // Note: saveSelectedParcelIdSnapshot() handles its own storage errors internally.
  const authStore = useAuthStore()
  const { saveSelectedParcelIdSnapshot } = useParcelSelectionRestore()
  const parcelId = authStore.selectedParcelId?.value ?? authStore.selectedParcelId
  saveSelectedParcelIdSnapshot(parcelId)

  emit('select-image')
  window.postMessage({
    type: 'LOGIBOOKS_EXTENSION_ACTIVATE',
    target: parcelsStore.getImageProcessingUrl(props.item.id),
    url: normalizedLink.value,
    token
  }, window.location.origin)
}

function handleViewClick() {
  if (viewDisabled.value) return
  emit('view-image')
}

function handleDeleteClick() {
  if (deleteDisabled.value) return
  emit('delete-image')
}
</script>

<template>
  <div class="form-group product-link-with-actions">
    <label class="label">
      {{ label }}:
    </label>
    <div class="link-and-panel">
      <div class="link-content">
        <a
          v-if="hasLink"
          :href="normalizedLink"
          target="_blank"
          rel="noopener noreferrer"
          class="product-link-inline"
          data-test="product-link-anchor"
        >
          {{ normalizedLink }}
        </a>
        <span v-else class="no-link" data-test="product-link-empty">Ссылка отсутствует</span>
      </div>
      <div class="action-panel" data-test="product-link-actions">
        <ActionButton
          :item="item"
          icon="fa-solid fa-file-image"
          iconSize="1x"
          :tooltip-text="selectTooltip"
          :disabled="selectDisabled"
          data-test="product-link-select"
          @click="handleSelectClick"
        />
        <ActionButton
          :item="item"
          icon="fa-solid fa-eye"
          iconSize="1x"
          :tooltip-text="viewTooltip"
          :disabled="viewDisabled"
          data-test="product-link-view"
          @click="handleViewClick"
        />
        <ActionButton
          :item="item"
          icon="fa-solid fa-trash-can"
          iconSize="1x"
          :tooltip-text="deleteTooltip"
          :disabled="deleteDisabled"
          data-test="product-link-delete"
          @click="handleDeleteClick"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-link-with-actions {
  width: 100%;
}

.link-and-panel {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  min-width: 0;
}

.link-content {
  flex: 1;
  min-width: 0;
}

.product-link-inline,
.no-link {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-panel {
  display: flex;
  gap: 0.25rem;
  background: #ffffff;
  border: 1px solid #74777c;
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
