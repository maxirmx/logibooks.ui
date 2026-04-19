<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref, watch, onUnmounted, nextTick } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'
import FeacnCodeSearchByKeyword from '@/components/FeacnCodeSearchByKeyword.vue'
import { getFeacnInfo } from '@/helpers/feacn.info.helpers.js'

const props = defineProps({
  show: { type: Boolean, required: true },
  selectedIds: { type: Array, required: true },
})

const emit = defineEmits(['update:show', 'confirm'])

const inputRef = ref(null)

function handleKeydown(event) {
  if (!props.show) return
  
  if (event.key === 'Enter' && isTnVedValid.value) {
    event.preventDefault()
    confirm()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

const targetTnVed = ref('')
const searchActive = ref(false)
const keywordSearchActive = ref(false)

const normalizedTargetTnVed = computed(() => targetTnVed.value.trim())
const hasCorrectFormat = computed(() => /^\d{10}$/.test(normalizedTargetTnVed.value))

// FEACN code existence check state
const tnvedExists = ref(null)    // null = not checked, true/false = result
const tnvedChecking = ref(false)
const tnvedLookupError = ref('')
const tnvedName = ref('')
let lookupTimeout = null
const notFoundMessage = 'Несуществующий код ТН ВЭД'

const isTnVedValid = computed(() => hasCorrectFormat.value && tnvedExists.value === true)

const validationMessage = computed(() => {
  const code = normalizedTargetTnVed.value
  if (!code) return ''
  if (!hasCorrectFormat.value) return 'Введите 10 цифр для кода ТН ВЭД'
  if (tnvedChecking.value) return 'Проверка кода ТН ВЭД...'
  if (tnvedLookupError.value) return tnvedLookupError.value
  if (tnvedExists.value === false) return notFoundMessage
  return ''
})

async function lookupTnVed(code) {
  tnvedChecking.value = true
  tnvedExists.value = null
  tnvedLookupError.value = ''
  tnvedName.value = ''
  try {
    const { name: fetchedName, found } = await getFeacnInfo(code)
    // Ignore result if user has already changed the code
    if (code !== normalizedTargetTnVed.value) {
      return
    }
    tnvedExists.value = found === true
    tnvedName.value = found === true ? fetchedName : ''
  } catch {
    // Ignore error if it relates to an outdated code
    if (code !== normalizedTargetTnVed.value) {
      return
    }
    tnvedExists.value = false
    tnvedLookupError.value = notFoundMessage
  } finally {
    // Only clear the checking flag for the currently active code
    if (code === normalizedTargetTnVed.value) {
      tnvedChecking.value = false
    }
  }
}

watch(normalizedTargetTnVed, (code) => {
  if (lookupTimeout) {
    clearTimeout(lookupTimeout)
    lookupTimeout = null
  }
  tnvedExists.value = null
  tnvedLookupError.value = ''
  tnvedChecking.value = false
  tnvedName.value = ''

  if (hasCorrectFormat.value) {
    tnvedChecking.value = true
    lookupTimeout = setTimeout(() => lookupTnVed(code), 500)
  }
})

// Add/remove keydown event listener when dialog opens/closes
watch(() => props.show, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleKeydown)
    // Focus input field when dialog opens
    nextTick(() => {
      inputRef.value?.focus()
    })
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (lookupTimeout) clearTimeout(lookupTimeout)
})

function close() {
  emit('update:show', false)
}

function onDialogUpdate(value) {
  if (!value && !searchActive.value && !keywordSearchActive.value) {
    close()
  }
}

function resetState() {
  targetTnVed.value = ''
  searchActive.value = false
  keywordSearchActive.value = false
  tnvedExists.value = null
  tnvedChecking.value = false
  tnvedLookupError.value = ''
  tnvedName.value = ''
  if (lookupTimeout) {
    clearTimeout(lookupTimeout)
    lookupTimeout = null
  }
}

function confirm() {
  if (!isTnVedValid.value) return
  emit('confirm', props.selectedIds, normalizedTargetTnVed.value)
}

function toggleSearch() {
  const next = !searchActive.value
  searchActive.value = next
  if (next) keywordSearchActive.value = false
}

function toggleKeywordSearch() {
  const next = !keywordSearchActive.value
  keywordSearchActive.value = next
  if (next) searchActive.value = false
}

function handleSearchSelect(code) {
  targetTnVed.value = String(code ?? '').trim()
  searchActive.value = false
}

function handleKeywordSearchSelect(code) {
  targetTnVed.value = String(code ?? '').trim()
  keywordSearchActive.value = false
}

function handleRefocus() {
  nextTick(() => {
    inputRef.value?.focus()
  })
}

watch(() => props.show, (visible) => {
  if (!visible) {
    resetState()
  }
})
</script>

<template>
  <v-dialog
    :model-value="show"
    :scrim="!searchActive && !keywordSearchActive"
    content-class="assign-tnved-dialog-position"
    @update:model-value="onDialogUpdate"
  >
    <div class="assign-tnved-layout">
      <v-card class="assign-tnved-card">
        <v-card-title class="primary-heading">
          Код ТН ВЭД для выбранных посылок
        </v-card-title>
        <v-card-text>
          <div class="target-input-row">
            <input
              ref="inputRef"
              id="target-tnved"
              v-model="targetTnVed"
              type="text"
              class="input target-tnved-input"
              maxlength="10"
              placeholder="Код ТН ВЭД (10 цифр)"
              data-testid="target-tnved-input"
              autofocus
            >
            <ActionButton
              :item="selectedIds"
              :icon="searchActive ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
              :tooltip-text="searchActive ? 'Скрыть дерево кодов' : 'Выбрать код (дерево ТН ВЭД)'"
              class="button-o-c"
              @click="toggleSearch"
              :iconSize="'1x'"
            />
            <ActionButton
              :item="selectedIds"
              :icon="keywordSearchActive ? 'fa-solid fa-arrow-up-z-a' : 'fa-solid fa-arrow-down-a-z'"
              :tooltip-text="keywordSearchActive ? 'Скрыть подбор по ключевым словам' : 'Выбрать код (ключевые слова)'"
              class="button-o-c"
              @click="toggleKeywordSearch"
              :iconSize="'1x'"
            />
          </div>
          <div v-if="validationMessage || tnvedName" :class="tnvedName ? 'validation-success' : 'validation-error'" data-testid="target-tnved-message">
            <v-progress-circular v-if="tnvedChecking" indeterminate :size="14" :width="2" class="mr-1" />
            {{ tnvedName || validationMessage }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="close">Отменить</v-btn>
          <v-btn color="orange-darken-3" variant="flat" :disabled="!isTnVedValid" @click="confirm">Применить</v-btn>
        </v-card-actions>
      </v-card>

      <div v-if="show && searchActive" class="main-window-overlay" data-testid="assign-tnved-feacn-search-overlay">
        <FeacnCodeSearch @select="handleSearchSelect" @refocus="handleRefocus" />
      </div>

      <div v-if="show && keywordSearchActive" class="main-window-overlay" data-testid="assign-tnved-feacn-keyword-overlay">
        <FeacnCodeSearchByKeyword v-model="keywordSearchActive" @select="handleKeywordSearchSelect" @refocus="handleRefocus" />
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.assign-tnved-layout {
  position: relative;
  overflow: visible;
  width: 100%;
}

.assign-tnved-card {
  border: 2px solid #797979;
  box-shadow: 0px 3px 7px rgba(0, 0, 0, 0.1);
  border-radius: 0.25rem;
}

.target-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.target-tnved-input {
  flex: 1;
}

.validation-error {
  margin-top: 8px;
  color: #b00020;
  font-size: 1em;
}

.validation-success {
  margin-top: 8px;
  color: #1b5e20;
  font-size: 1em;
 }

.main-window-overlay {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 2200;
  width: min(1400px, 60vw);
  max-width: calc(98vw - 2vw);
  max-height: calc(90vh - 10vh - 140px);
  overflow: auto;
}
</style>

<style>
.assign-tnved-dialog-position {
  position: absolute !important;
  top: 10vh !important;
  left: 2vw !important;
  width: 30% !important;
  min-width: 250px !important;
  overflow: visible !important;
}
</style>
