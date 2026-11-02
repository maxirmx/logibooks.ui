<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { formatCustomsCharge } from '@/helpers/parcels.list.helpers.js'
import {
  getCustomsChargeValue,
  isGroupedCustomsCharge,
  GROUP_CUSTOMS_CHARGE_TOOLTIP
} from '@/helpers/customs.charges.helpers.js'

const props = defineProps({
  item: { type: Object, default: null },
  field: { type: String, required: true },
  formatter: { type: Function, default: formatCustomsCharge }
})
const value = computed(() => getCustomsChargeValue(props.item, props.field))
</script>

<template>
  <span class="customs-charge-display">
    <span class="customs-charge-value">{{ formatter(value) }}</span>
    <v-tooltip
      v-if="isGroupedCustomsCharge(item, field)"
      :text="GROUP_CUSTOMS_CHARGE_TOOLTIP"
      location="top"
      open-delay="150"
    >
      <template #activator="{ props: tooltipProps }">
        <span
          v-bind="tooltipProps"
          class="customs-charge-group-marker"
          role="img"
          tabindex="0"
          :aria-label="GROUP_CUSTOMS_CHARGE_TOOLTIP"
        >
          <font-awesome-icon icon="fa-solid fa-comment-dots" />
        </span>
      </template>
    </v-tooltip>
  </span>
</template>

<style scoped>
.customs-charge-display {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
}
</style>
