<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref, watch } from 'vue'
import { getTnVedCellClass } from '@/helpers/parcels.list.helpers.js'
import { useFeacnTooltips, loadFeacnTooltipOnHover } from '@/helpers/feacn.info.helpers.js'

const componentProps = defineProps({
  item: { type: Object, required: true },
  feacnCodes: { type: Array, default: () => [] }
})

const emit = defineEmits(['click'])

const feacnTooltips = useFeacnTooltips()
const tnvedClass = ref('feacn-code-tooltip')

const cellClass = computed(() => {
  return tnvedClass.value ? `truncated-cell ${tnvedClass.value}` : 'truncated-cell feacn-code-tooltip'
})

// Watch for changes and update class asynchronously
watch([() => componentProps.item.tnVed, () => componentProps.feacnCodes], async () => {
  try {
    tnvedClass.value = await getTnVedCellClass(componentProps.item.tnVed, componentProps.feacnCodes)
  } catch (error) {
    console.error('Error getting TN VED cell class:', error)
    tnvedClass.value = 'feacn-code-tooltip'
  }
}, { immediate: true })

function handleMouseEnter() {
  if (componentProps.item.tnVed) {
    loadFeacnTooltipOnHover(componentProps.item.tnVed)
  }
}
</script>

<template>
  <v-tooltip content-class="feacn-tooltip" location="top">
    <template #activator="{ props: tooltipProps }">
      <span
        v-bind="tooltipProps"
        :class="cellClass"
        @click="emit('click', componentProps.item)"
        @mouseenter="handleMouseEnter"
      >
        {{ componentProps.item.tnVed || '' }}
      </span>
    </template>
    <template #default>
      <div class="d-flex align-center">
        <font-awesome-icon icon="fa-solid fa-pen" class="mr-3" />
        {{ feacnTooltips[componentProps.item.tnVed]?.name || 'Наведите для загрузки...' }}
      </div>
    </template>
  </v-tooltip>
</template>
