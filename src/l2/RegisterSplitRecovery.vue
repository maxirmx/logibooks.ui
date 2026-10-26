<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onUnmounted, ref } from 'vue'
import { useRegisterSplit } from '@/composables/useRegisterSplit.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import RegisterSplitDialogs from '@/l2/RegisterSplitDialogs.vue'

const props = defineProps({ registerId: { type: Number, required: true } })
const mounted = ref(true)
const split = useRegisterSplit({ store: useRegistersStore(), authStore: useAuthStore(), alertStore: useAlertStore(),
  register: () => null, registerId: () => props.registerId, busy: () => true, runningAction: ref(false), mounted,
  // The source failed to load. Receipt recovery must not depend on loading it again.
  refreshRegister: async () => undefined })
const { state } = split
onUnmounted(() => { mounted.value = false; split.stop() })
</script>

<template>
  <RegisterSplitDialogs :state="state" @cancel="split.cancel" @retry="split.retry" @acknowledge="split.acknowledgeUnknown" @close="state.summaryVisible = false" />
</template>