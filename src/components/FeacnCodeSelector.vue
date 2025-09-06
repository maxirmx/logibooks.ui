<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, inject, ref } from 'vue'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { 
  getFeacnCodesForKeywords,
  getFeacnCodeItemClass,
  updateParcelTnVed
} from '@/helpers/parcels.list.helpers.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { getFeacnTooltip } from '@/helpers/feacn.info.helpers.js'

const props = defineProps({
  item: { type: Object, required: true }
})

const keyWordsStore = useKeyWordsStore()
const parcelsStore = useParcelsStore()

// Get the loadOrders function from parent component
const loadOrders = inject('loadOrders')

// Local tooltip cache for this component
const tooltipCache = ref({})

const feacnCodes = computed(() => {
  return getFeacnCodesForKeywords(props.item.keyWordIds, keyWordsStore)
})

const tooltipMaxWidth = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.innerWidth * 0.5}px`
  }
  return '400px' // fallback
})

async function selectCode(code) {
  if (code !== props.item.tnVed) {
    await updateParcelTnVed(props.item, code, parcelsStore, loadOrders)
  }
}

async function loadTooltip(code) {
  if (!tooltipCache.value[code]) {
    try {
      const tooltip = await getFeacnTooltip(code)
      tooltipCache.value[code] = tooltip
    } catch {
      tooltipCache.value[code] = 'Загрузка...'
    }
  }
}

function getTooltipText(code) {
  return tooltipCache.value[code] || 'Загрузка...'
}
</script>

<template>
  <div v-if="feacnCodes.length > 0" class="feacn-lookup-column">
    <v-tooltip 
      v-for="code in feacnCodes" 
      :key="code" 
      location="top"
      content-class="feacn-tooltip"
      :max-width="tooltipMaxWidth"
    >
      <template #activator="{ props }">
        <div 
          v-bind="props"
          :class="getFeacnCodeItemClass(code, item.tnVed, feacnCodes)"
          @click="selectCode(code)"
          @mouseenter="loadTooltip(code)"
        >
          <span class="d-inline-flex align-center">
            <font-awesome-icon v-if="code === item.tnVed" icon="fa-solid fa-check-double" class="mr-1" />
            {{ code }}
          </span>
        </div>
      </template>
      <div v-if="code === item.tnVed">
        <div>
          <font-awesome-icon icon="fa-solid fa-check-double" class="mr-3" /> Выбрано
        </div>
        <div>
          {{ getTooltipText(code) }}
        </div>
      </div>
      <div v-else>
        <div>
          <font-awesome-icon icon="fa-solid fa-check" class="mr-3" /> Выбрать
        </div>
        <div>
          {{ getTooltipText(code) }}
        </div>
      </div>
    </v-tooltip>
  </div>
  <span v-else>-</span>
</template>
