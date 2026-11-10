<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, inject, ref } from 'vue'
import {
  getFeacnCodeItemClass,
  getMatchType,
  getMatchingFeacnCodeItemClass
} from '@/helpers/parcels.list.helpers.js'
import { getFeacnTooltip } from '@/helpers/feacn.info.helpers.js'
import { useAlertStore } from '@/stores/alert.store.js'

const props = defineProps({
  item: { type: Object, required: true }
})

const alertStore = useAlertStore()

const selectTnVed = inject('selectTnVed')

// Local tooltip cache for this component
const tooltipCache = ref({})

const suggestions = computed(() => props.item.feacnLookupSuggestions ?? [])
const keywordCodes = computed(() => suggestions.value.filter((entry) => entry.fromKeywords).map((entry) => entry.code))

const tooltipMaxWidth = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.innerWidth * 0.5}px`
  }
  return '400px' // fallback
})

function selectCode(event, code) {
  if (event.shiftKey || event.ctrlKey || event.metaKey) {
    return
  }
  if (code !== props.item.tnVed) {
    return selectTnVed(props.item, code)
  }
}

async function loadTooltip(code) {
  if (!tooltipCache.value[code]) {
    try {
      const tooltip = await getFeacnTooltip(code)
      tooltipCache.value[code] = tooltip
    } catch (error) {
      tooltipCache.value[code] = 'Ошибка загрузки'
      alertStore.error(error, { fallback: 'Не удалось загрузить информацию о коде ТН ВЭД' })
    }
  }
}

function getTooltipText(code) {
  return tooltipCache.value[code] || 'Загрузка...'
}
</script>

<template>
  <div v-if="suggestions.length > 0" class="feacn-lookup-column">
    <v-tooltip
      v-for="entry in suggestions"
      :key="entry.code"
      location="top"
      content-class="feacn-tooltip"
      :max-width="tooltipMaxWidth"
    >
      <template #activator="{ props }">
        <div
          v-bind="props"
          :class="
            entry.fromHistory
              ? getMatchingFeacnCodeItemClass(entry.code, item.tnVed, keywordCodes)
              : getFeacnCodeItemClass(entry.code, item.tnVed, keywordCodes)
          "
          @click="selectCode($event, entry.code)"
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
        <div><font-awesome-icon icon="fa-solid fa-check-double" class="mr-3" /> Выбрано</div>
        <div>
          {{ getTooltipText(entry.code) }}
        </div>
      </div>
      <div v-else>
        <div><font-awesome-icon icon="fa-solid fa-check" class="mr-3" /> Выбрать</div>
        <div>
          {{ getTooltipText(entry.code) }}
        </div>
      </div>
    </v-tooltip>
  </div>
  <span v-else>-</span>
</template>
