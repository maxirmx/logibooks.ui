<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAlertStore } from '@/stores/alert.store.js'

const props = defineProps({
  fallback: { type: Boolean, default: false }
})

const alertStore = useAlertStore()
const notification = computed(() => alertStore.alert ?? null)
const activePageHosts = computed(() => alertStore.activePageHosts ?? 0)
const runningAction = ref(false)

const isVisible = computed(
  () => notification.value !== null && (!props.fallback || activePageHosts.value === 0)
)

function alertClass(severity) {
  return (
    {
      success: 'alert-success',
      info: 'alert-info',
      warning: 'alert-warning',
      error: 'alert-danger'
    }[severity] || 'alert-info'
  )
}

async function runAction(notification) {
  const handler = notification.action?.handler
  if (typeof handler !== 'function' || runningAction.value) return

  runningAction.value = true
  alertStore.dismiss(notification.id)
  try {
    await handler()
  } catch (error) {
    alertStore.error(error, { fallback: 'Не удалось повторить операцию' })
  } finally {
    runningAction.value = false
  }
}

onMounted(() => {
  if (!props.fallback) alertStore.registerPageHost?.()
})

onUnmounted(() => {
  if (!props.fallback) alertStore.unregisterPageHost?.()
})
</script>

<template>
  <section
    v-if="isVisible"
    class="page-alert-region"
    :class="{ 'page-alert-region--fallback': fallback }"
    aria-label="Сообщения приложения"
    data-testid="page-alert-region"
  >
    <div
      v-if="notification"
      class="alert alert-dismissable page-alert-region__message"
      :class="alertClass(notification.severity)"
      :role="notification.severity === 'error' ? 'alert' : 'status'"
      :aria-live="notification.severity === 'error' ? 'assertive' : 'polite'"
      @mouseenter="alertStore.pause(notification.id)"
      @mouseleave="alertStore.resume(notification.id)"
    >
      <div class="page-alert-region__content">
        <strong v-if="notification.title">{{ notification.title }}: </strong>
        <span>{{ notification.message }}</span>
      </div>
      <div class="page-alert-region__actions">
        <button
          v-if="notification.action"
          type="button"
          class="btn btn-link page-alert-region__action"
          :disabled="runningAction"
          @click="runAction(notification)"
        >
          {{ notification.action.label || 'Повторить' }}
        </button>
        <button
          type="button"
          class="btn btn-link close page-alert-region__close"
          aria-label="Закрыть сообщение"
          @click="alertStore.dismiss(notification.id)"
        >
          ×
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-alert-region {
  position: sticky;
  top: 0.5rem;
  z-index: 30;
  width: 100%;
  max-height: 40vh;
  overflow-y: auto;
  margin: 0 0 1rem;
}

.page-alert-region--fallback {
  position: fixed;
  top: 1rem;
  left: 50%;
  width: min(960px, calc(100vw - 2rem));
  transform: translateX(-50%);
  z-index: 2500;
}

.page-alert-region__message {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.page-alert-region__content {
  min-width: 0;
  overflow-wrap: anywhere;
}

.page-alert-region__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.page-alert-region__action,
.page-alert-region__close {
  padding: 0 0.35rem;
}

@media (max-width: 600px) {
  .page-alert-region {
    top: 0.25rem;
  }

  .page-alert-region__message {
    gap: 0.5rem;
  }
}
</style>
