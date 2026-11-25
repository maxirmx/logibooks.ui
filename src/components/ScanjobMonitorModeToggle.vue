<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application.

import { computed, getCurrentScope, ref } from 'vue'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import { reportError } from '@/helpers/error.helpers.js'
import { scanjobMonitorLocation, scanjobMonitorMode } from '@/helpers/scanjob.monitor.helpers.js'
import router from '@/router'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'

const props = defineProps({
  scanjobId: { type: Number, required: true },
  mode: { type: String, required: true },
  disabled: Boolean
})

const authStore = useAuthStore()
const alertStore = useAlertStore()
const scope = getCurrentScope()
const switching = ref(false)
const toLookup = computed(() => props.mode === scanjobMonitorMode.Boxes)
const label = computed(() => toLookup.value ? 'Монитор поиска' : 'Монитор сканирования')

async function switchMode() {
  if (props.disabled || switching.value) return

  const userId = authStore.user?.id
  const mode = toLookup.value ? scanjobMonitorMode.Lookup : scanjobMonitorMode.Boxes
  const target = scanjobMonitorLocation(props.scanjobId, mode)
  let switched = false
  switching.value = true
  try {
    const failure = await router.replace(target)
    if (isNavigationFailure(failure, NavigationFailureType.cancelled | NavigationFailureType.duplicated)) {
      // Another route change won, or the requested view is already open.
      return
    }
    if (failure) throw failure

    const current = router.currentRoute.value
    if (current.name !== target.name || Number(current.params.id) !== target.params.id || authStore.user?.id !== userId) return
    switched = true
    authStore.setScanjobMonitorMode(mode)
  } catch (error) {
    const message = switched ? 'Не удалось сохранить режим монитора' : 'Не удалось переключить режим монитора'
    reportError(error, { context: message })
    if (scope.active || switched) alertStore.error(message)
  } finally {
    switching.value = false
  }
}
</script>

<template>
  <ActionButton
    :item="scanjobId"
    :icon="toLookup ? 'fa-solid fa-filter' : 'fa-solid fa-sort'"
    icon-size="2x"
    :tooltip-text="label"
    :aria-label="label"
    :disabled="disabled || switching"
    data-testid="scanjob-monitor-mode-toggle"
    @click="switchMode"
  />
</template>
