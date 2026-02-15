// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useHotKeyActionSchemesStore } from '@/stores/hotkey.action.schemes.store.js'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  downloadDisabled: { type: Boolean, default: false },
  iconSize: { type: String, default: '2x' }
})

const emit = defineEmits([
  'next-parcel',
  'next-issue',
  'back',
  'save',
  'cancel',
  'lookup',
  'download'
])

const authStore = useAuthStore()
const hotKeyActionSchemesStore = useHotKeyActionSchemesStore()
const hotkeyActions = ref([])
const isListenerAttached = ref(false)

// Load hotkey actions on mount
onMounted(async () => {
  // Attach listener before async operations to ensure cleanup always works
  window.addEventListener('keydown', handleKeydown)
  isListenerAttached.value = true
  
  try {
    // Ensure ops are loaded
    await hotKeyActionSchemesStore.ensureOpsLoaded()
    
    // Get the user's hotkey action scheme ID
    const schemeId = authStore.user?.schemeId
    
    if (schemeId) {
      // Load the scheme
      const scheme = await hotKeyActionSchemesStore.getById(schemeId)
      
      if (scheme?.actions) {
        // Build hotkey actions list with event names from ops
        hotkeyActions.value = scheme.actions.map(action => {
          const event = hotKeyActionSchemesStore.getOpsEvent(
            hotKeyActionSchemesStore.ops.actions,
            action.action
          )
          return {
            ...action,
            event
          }
        }).filter(action => action.event && action.keyCode)
      }
    }
  } catch (error) {
    console.error('Failed to load hotkey action scheme:', error.message || error)
  }
})

onBeforeUnmount(() => {
  if (isListenerAttached.value) {
    window.removeEventListener('keydown', handleKeydown)
    isListenerAttached.value = false
  }
})

function emitEvent(event) {
  if (props.disabled) return
  emit(event)
}

function emitDownload() {
  if (props.disabled || props.downloadDisabled) return
  emit('download')
}

function handleKeydown(e) {
  if (props.disabled) return
  
  // Check if the pressed key matches any configured hotkey action
  for (const action of hotkeyActions.value) {
    const keyMatches = e.code === action.keyCode
    const shiftMatches = e.shiftKey === action.shift
    // On Mac, Cmd (metaKey) can be used instead of Ctrl
    const ctrlMatches = e.ctrlKey === action.ctrl || (e.metaKey === action.ctrl)
    const altMatches = e.altKey === action.alt
    
    if (keyMatches && shiftMatches && ctrlMatches && altMatches) {
      e.preventDefault()
      // Check downloadDisabled for download events
      if (action.event === 'download') {
        emitDownload()
      } else {
        emit(action.event)
      }
      break
    }
  }
}
</script>

<template>
  <div style="display:flex; align-items:center;">
    <div class="header-actions header-actions-group">
      <ActionButton
        :item="{}"
        icon="fa-solid fa-arrow-right"
        :iconSize="iconSize"
        tooltip-text="Следующая посылка"
        :disabled="disabled"
        @click="emitEvent('next-parcel')"
      />
      <ActionButton
        :item="{}"
        icon="fa-solid fa-play"
        :iconSize="iconSize"
        tooltip-text="Следующая проблема"
        :disabled="disabled"
        @click="emitEvent('next-issue')"
      />
      <ActionButton
        :item="{}"
        icon="fa-solid fa-arrow-left"
        :iconSize="iconSize"
        tooltip-text="Назад"
        :disabled="disabled"
        @click="emitEvent('back')"
      />
    </div>
    <div class="header-actions header-actions-group">
      <ActionButton
        :item="{}"
        icon="fa-solid fa-magnifying-glass"
        :iconSize="iconSize"
        tooltip-text="Сохранить и подобрать код ТН ВЭД"
        :disabled="disabled"
        @click="emitEvent('lookup')"
      />
    </div>
    <div class="header-actions header-actions-group">
      <ActionButton
        :item="{}"
        icon="fa-solid fa-upload"
        :iconSize="iconSize"
        tooltip-text="Сохранить и выгрузить XML накладную"
        :disabled="disabled || downloadDisabled"
        @click="emitDownload"
      />
    </div>
    <div class="header-actions header-actions-group">
      <ActionButton
        :item="{}"
        icon="fa-solid fa-check-double"
        :iconSize="iconSize"
        tooltip-text="Сохранить"
        :disabled="disabled"
        @click="emitEvent('save')"
      />
      <ActionButton
        :item="{}"
        icon="fa-solid fa-xmark"
        :iconSize="iconSize"
        tooltip-text="Отменить"
        :disabled="disabled"
        @click="emitEvent('cancel')"
      />
    </div>
  </div>
</template>
