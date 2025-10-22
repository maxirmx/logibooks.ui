<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import FeacnKeywordLookup from '@/components/FeacnKeywordLookup.vue'
import { getFeacnCodesForKeywords,  getFeacnCodeItemClass,  getKeywordFeacnPairs, getMatchingFeacnCodeItemClass } from '@/helpers/parcels.list.helpers.js'
import { useFeacnTooltips, loadFeacnTooltipOnHover } from '@/helpers/feacn.info.helpers.js'
import { useKeyWordsStore } from '@/stores/key.words.store.js'

const props = defineProps({
  item: { type: Object, required: true },
  onSelect: { type: Function, required: true }
})

const keyWordsStore = useKeyWordsStore()

const isKeywordLookupOpen = ref(false)

// Use the shared tooltip cache
const feacnTooltips = useFeacnTooltips()

// Keyword/FEACN pairs
const keywordsWithFeacn = computed(() => getKeywordFeacnPairs(props.item?.keyWordIds, keyWordsStore))

// Unified list: optional matchingFC first, then keyword pairs
const combinedCodes = computed(() => {
  const out = []
  if (props.item.matchingFC && props.item.matchingFC !== '') {
    out.push({
      id: 'matchingFC',
      feacnCode: props.item.matchingFC,
      word: props.item.matchingFCComment || 'Комментарий отсутствует',
      isMatching: true
    })
  }
  keywordsWithFeacn.value.forEach(k => out.push({ ...k, isMatching: false }))
  return out
})

function handleCodeSelect(feacnCode) {
  if (typeof props.onSelect === 'function') {
    props.onSelect(feacnCode)
  }
}

function openKeywordLookup() {
  isKeywordLookupOpen.value = true
}

function handleKeywordLookupSelect(code) {
  handleCodeSelect(code)
  isKeywordLookupOpen.value = false
}

function handleMouseEnter(code) {
  loadFeacnTooltipOnHover(code)
}
</script>

<template>
  <div class="form-group">
    <label class="label" @dblclick="openKeywordLookup">Подбор ТН ВЭД:</label>
    <div v-if="combinedCodes.length > 0" class="form-control feacn-lookup-column">
      <div
        v-for="entry in combinedCodes"
        :key="entry.id"
        class="keyword-item"
      >
        <v-tooltip content-class="feacn-tooltip" location="top">
          <template #activator="{ props: tooltipProps }">
            <div
              v-bind="tooltipProps"
              :class="[
                entry.isMatching
                  ? getMatchingFeacnCodeItemClass(entry.feacnCode, item.tnVed, getFeacnCodesForKeywords(item.keyWordIds, keyWordsStore))
                  : getFeacnCodeItemClass(entry.feacnCode, item.tnVed, getFeacnCodesForKeywords(item.keyWordIds, keyWordsStore)),
                'feacn-edit-dialog-item',
                'keyword-code'
              ]"
              @click="() => handleCodeSelect(entry.feacnCode)"
              @mouseenter="() => handleMouseEnter(entry.feacnCode)"
            >
              <template v-if="entry.isMatching">
                {{ entry.feacnCode }} - {{ entry.word }}
              </template>
              <template v-else>
                {{ entry.feacnCode }} - "{{ entry.word }}"
              </template>
            </div>
          </template>
          <template #default>
            <div class="d-flex align-center">
              <font-awesome-icon icon="fa-solid fa-eye" class="mr-3" />
              {{ feacnTooltips[entry.feacnCode]?.name || 'Наведите для загрузки...' }}
            </div>
          </template>
        </v-tooltip>
        <div class="action-buttons">
          <ActionButton
            :item="entry"
            :icon="entry.feacnCode === item.tnVed ? 'fa-solid fa-check-double' : 'fa-solid fa-check'"
            :tooltip-text="entry.feacnCode === item.tnVed ? 'Выбрано' : 'Выбрать этот код ТН ВЭД'"
            :disabled="entry.feacnCode === item.tnVed"
            @click="() => handleCodeSelect(entry.feacnCode)"
          />
        </div>
      </div>
    </div>
    <div v-else class="form-control">-</div>
    <FeacnKeywordLookup
      v-model="isKeywordLookupOpen"
      @select="handleKeywordLookupSelect"
    />
  </div>
</template>

<style scoped>
/* Keyword items in FEACN lookup */
.keyword-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.keyword-code {
  flex: 1;
  cursor: pointer;
}

.keyword-code:hover {
  opacity: 0.8;
}
</style>
