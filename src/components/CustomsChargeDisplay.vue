<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { formatCustomsCharge, getCustomsChargeValue } from '@/helpers/customs.charges.helpers'

const props = defineProps({
  item: { type: Object, default: null },
  field: { type: String, default: 'customsFee' },
  formatter: { type: Function, default: formatCustomsCharge }
})
const value = computed(() => getCustomsChargeValue(props.item, props.field))
const showMarker = computed(() => props.item?.customsChargeGroup != null && Number(value.value) > 0)
</script>

<template>
  <span class="customs-charge-display">
    {{ formatter(value) }}
    <v-tooltip v-if="showMarker" text="Общая сумма таможенных платежей для всех товаров в посылке" open-delay="300" location="top">
      <template #activator="{ props: tooltipProps }">
        <span v-bind="tooltipProps" role="img" tabindex="0" aria-label="Общая сумма таможенных платежей для всех товаров в посылке">
          <font-awesome-icon icon="fa-solid fa-comment-dots" size="1x" class="button-o-c" aria-hidden="true" />
        </span>
      </template>
    </v-tooltip>
  </span>
</template>
