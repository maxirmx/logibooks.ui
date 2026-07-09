<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, useSlots } from 'vue'
import {
  getPassportCheckStatusPresentation,
  resolvePassportCheckStatus
} from '@/helpers/passport.check.status.helpers.js'

const props = defineProps({
  value: { type: [String, Number], default: null },
  statuses: { type: Array, default: () => [] },
  status: { type: Object, default: null }
})

const slots = useSlots()

const statusItem = computed(() => props.status ?? resolvePassportCheckStatus(props.statuses, props.value))
const statusName = computed(() => statusItem.value?.name || '')
const presentation = computed(() => getPassportCheckStatusPresentation(statusItem.value))
const hasDefaultSlot = computed(() => Boolean(slots.default))
const dotClasses = computed(() => [
  'passport-check-status__dot',
  presentation.value.colorClass,
  presentation.value.borderClass
])
</script>

<template>
  <span class="passport-check-status">
    <v-tooltip
      :text="statusName"
      location="top"
      :disabled="!statusName"
    >
      <template #activator="{ props: tooltipProps }">
        <span
          v-bind="tooltipProps"
          :class="dotClasses"
          :aria-label="statusName || undefined"
          data-testid="passport-check-status-dot"
        />
      </template>
    </v-tooltip>
    <span v-if="hasDefaultSlot" class="passport-check-status__value">
      <slot />
    </span>
  </span>
</template>
