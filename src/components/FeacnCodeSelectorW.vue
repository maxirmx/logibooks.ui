<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref, watch } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import FeacnCodeSearchByKeyword from '@/components/FeacnCodeSearchByKeyword.vue'
import { getFeacnCodesForKeywords,  getFeacnCodeItemClass,  getKeywordFeacnPairs, getMatchingFeacnCodeItemClass } from '@/helpers/parcels.list.helpers.js'
import { useFeacnTooltips, loadFeacnTooltipOnHover } from '@/helpers/feacn.info.helpers.js'
import { useKeyWordsStore } from '@/stores/key.words.store.js'

const props = defineProps({
  item: { type: Object, required: true },
  onSelect: { type: Function, required: true },
  // Parent's main search panel state; when true, this keyword panel should close
  externalSearchOpen: { type: Boolean, default: false },
  // Parent-provided keyword panel state (external toggle)
  externalKeywordOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['overlay-state-changed'])

const keyWordsStore = useKeyWordsStore()

const isKeywordLookupOpen = ref(false)

// Keep internal state in sync with external prop
watch(() => props.externalKeywordOpen, (val) => {
  if (typeof val === 'boolean') {
    isKeywordLookupOpen.value = val
  }
})

// Emit overlay-state-changed when internal keyword open state changes
watch(isKeywordLookupOpen, (val) => {
  emit('overlay-state-changed', val)
})

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
  isKeywordLookupOpen.value = !isKeywordLookupOpen.value
  emit('overlay-state-changed', isKeywordLookupOpen.value)
}

function handleKeywordLookupSelect(code) {
  handleCodeSelect(code)
  isKeywordLookupOpen.value = false
  emit('overlay-state-changed', false)
}

// Close this overlay when the external main search panel opens
watch(() => props.externalSearchOpen, (val) => {
  if (val) {
    isKeywordLookupOpen.value = false
  }
})

function handleMouseEnter(code) {
  loadFeacnTooltipOnHover(code)
}
</script>

<template>
  <div class="form-group keyword-selector-wrapper">
    <div class="keyword-label-row">
      <label class="label keyword-label" @click="openKeywordLookup">Подбор ТН ВЭД</label>
      <ActionButton
        :item="item"
        :icon="isKeywordLookupOpen ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
        :tooltip-text="isKeywordLookupOpen ? 'Скрыть подбор' : 'Открыть подбор'"
        class="keyword-toggle"
        :disabled="false"
        @click="openKeywordLookup"
        :iconSize="'1x'"
      />
    </div>
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
    <div class="keyword-search-overlay">
      <FeacnCodeSearchByKeyword
        v-model="isKeywordLookupOpen"
        v-show="isKeywordLookupOpen"
        @select="handleKeywordLookupSelect"
      />
    </div>
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

/* Keyword selector wrapper positioning */
.keyword-selector-wrapper {
  position: relative;
  z-index: 1;
}

/* Keyword search overlay positioning */
.keyword-search-overlay {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  z-index: 100;
  width: 420px;
  max-width: 600px;
  min-width: 420px;
}

.keyword-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.keyword-label { cursor: pointer; }
.keyword-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 0.9rem;
}
.keyword-toggle:focus { outline: 2px solid rgba(0,0,0,0.1); }

/* Ensure parent containers allow overflow for the overlay */
.form-group {
  overflow: visible !important;
}
</style>
