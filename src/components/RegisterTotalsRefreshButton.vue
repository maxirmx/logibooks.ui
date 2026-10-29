<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref, watch } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import { useRegisterTotalsRefresh } from '@/composables/useRegisterTotalsRefresh.js'

const props = defineProps({
  register: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  iconSize: { type: String, default: '2x' }
})

const { refreshingTotals, refreshTotals } = useRegisterTotalsRefresh(() => props.register?.id)
const unavailable = computed(() => props.disabled || refreshingTotals.value || !props.register?.id)
const recoveryNeeded = ref(false)
watch(() => props.register?.id, () => { recoveryNeeded.value = false })

async function refresh() {
  if (unavailable.value || !(props.register?.derivedTotalsPending === true || recoveryNeeded.value)) return false
  const registerId = props.register.id
  recoveryNeeded.value = true
  const succeeded = await refreshTotals()
  if (props.register?.id === registerId) recoveryNeeded.value = !succeeded
  return succeeded
}
</script>

<template>
  <ActionButton
    v-if="register?.derivedTotalsPending === true || recoveryNeeded"
    :item="register"
    icon="fa-solid fa-arrows-rotate"
    :icon-size="iconSize"
    tooltip-text="Обновить итоги"
    aria-label="Обновить итоги"
    :disabled="unavailable"
    @click="refresh"
  />
</template>
