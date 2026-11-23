<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, getCurrentScope, ref, unref } from 'vue'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import { reportError } from '@/helpers/error.helpers.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { buildParcelListLocation } from '@/helpers/parcel.navigation.helpers.js'
import router from '@/router'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'

const props = defineProps({
  mode: { type: String, required: true },
  registerId: { type: Number, default: null },
  iconSize: { type: String, default: '2x' },
  disabled: { type: Boolean, default: false }
})

const authStore = useAuthStore()
const alertStore = useAlertStore()
const scope = getCurrentScope()
const switching = ref(false)
const targetIsWarehouse = computed(() => props.mode === OP_MODE_PAPERWORK)
const tooltip = computed(() => targetIsWarehouse.value ? 'Склад' : 'Оформление')
const targetAllowed = computed(() => unref(
  targetIsWarehouse.value ? authStore.hasWhRole : authStore.hasLogistRole
))
const actionDisabled = computed(() => props.disabled || switching.value || !targetAllowed.value)

async function switchView() {
  if (actionDisabled.value) return false

  const mode = targetIsWarehouse.value ? OP_MODE_WAREHOUSE : OP_MODE_PAPERWORK
  switching.value = true
  try {
    let location = { path: '/registers', query: { mode } }
    if (props.registerId != null) {
      const { selectedParcelId, boxId, boxCode, returnUrl } = router.currentRoute.value.query
      location = buildParcelListLocation({
        registerId: props.registerId,
        parcelId: selectedParcelId,
        mode,
        boxId,
        boxCode,
        returnUrl
      })
    }

    const failure = await router.push(location)
    if (isNavigationFailure(failure, NavigationFailureType.cancelled | NavigationFailureType.duplicated)) {
      // A newer navigation has taken over or the destination is already open.
      return false
    }
    if (failure) throw failure
    return true
  } catch (error) {
    const message = 'Не удалось переключить режим просмотра'
    reportError(error, { context: message })
    if (scope.active) alertStore.error(message)
    return false
  } finally {
    switching.value = false
  }
}
</script>

<template>
  <ActionButton
    :item="registerId"
    icon="fa-solid fa-right-left"
    :tooltip-text="tooltip"
    :aria-label="tooltip"
    :icon-size="iconSize"
    :disabled="actionDisabled"
    @click="switchView"
  />
</template>
