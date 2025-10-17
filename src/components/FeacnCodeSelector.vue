<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, inject, ref } from 'vue'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { 
  getFeacnCodesForKeywords,
  getFeacnCodeItemClass,
  updateParcelTnVed,
  getMatchType,
  getMatchingFeacnCodeItemClass
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

const feacnCodes = computed(() => getFeacnCodesForKeywords(props.item.keyWordIds, keyWordsStore))

// Unified list: optional matchingFC first, then regular codes
const combinedCodes = computed(() => {
  const codes = feacnCodes.value || []
  const out = []
  if (props.item.matchingFC && props.item.matchingFC !== '') {
    out.push({ code: props.item.matchingFC, comment: props.item.matchingFCComment || 'Комментарий отсутствует', isMatching: true })
  }
  codes.forEach(c => out.push({ code: c, isMatching: false }))
  return out
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
  <div v-if="combinedCodes.length > 0" class="feacn-lookup-column">
    <v-tooltip
      v-for="entry in combinedCodes"
      :key="entry.isMatching ? 'matchingFC' : entry.code"
      location="top"
      content-class="feacn-tooltip"
      :max-width="tooltipMaxWidth"
    >
      <template #activator="{ props }">
        <div
          v-bind="props"
          :class="entry.isMatching
            ? getMatchingFeacnCodeItemClass(entry.code, item.tnVed, feacnCodes)
            : getFeacnCodeItemClass(entry.code, item.tnVed, feacnCodes)"
          @click="selectCode(entry.code)"
          @mouseenter="loadTooltip(entry.code)"
        >
          <span class="d-inline-flex align-center">
            <font-awesome-icon
              v-if="getMatchType(entry.code, item.tnVed) === 'exact'"
              icon="fa-solid fa-check-double"
              class="mr-1"
            />
            <font-awesome-icon
              v-else-if="getMatchType(entry.code, item.tnVed) === 'weak'"
              icon="fa-solid fa-ellipsis-vertical"
              class="mr-1"
            />
            {{ entry.code }}
          </span>
        </div>
      </template>
      <div v-if="entry.code === item.tnVed">
        <div>
          <font-awesome-icon icon="fa-solid fa-check-double" class="mr-3" /> Выбрано
        </div>
        <div>
          {{ getTooltipText(entry.code) }}
        </div>
      </div>
      <div v-else>
        <div>
          <font-awesome-icon icon="fa-solid fa-check" class="mr-3" /> Выбрать
        </div>
        <div>
          {{ getTooltipText(entry.code) }}
        </div>
      </div>
    </v-tooltip>
  </div>
  <span v-else>-</span>
</template>
