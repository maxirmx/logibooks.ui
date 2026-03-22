<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref, watch, onUnmounted } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'
import FeacnCodeSearchByKeyword from '@/components/FeacnCodeSearchByKeyword.vue'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'

const props = defineProps({
  show: { type: Boolean, required: true },
  selectedIds: { type: Array, required: true },
})

const emit = defineEmits(['update:show', 'confirm'])

const feacnCodesStore = useFeacnCodesStore()

const targetTnVed = ref('')
const searchActive = ref(false)
const keywordSearchActive = ref(false)

const normalizedTargetTnVed = computed(() => targetTnVed.value.trim())
const hasCorrectFormat = computed(() => /^\d{10}$/.test(normalizedTargetTnVed.value))

// FEACN code existence check state
const tnvedExists = ref(null)    // null = not checked, true/false = result
const tnvedChecking = ref(false)
const tnvedLookupError = ref('')
let lookupTimeout = null

const isTnVedValid = computed(() => hasCorrectFormat.value && tnvedExists.value === true)

const validationMessage = computed(() => {
  const code = normalizedTargetTnVed.value
  if (!code) return ''
  if (!hasCorrectFormat.value) return 'Введите 10 цифр для кода ТН ВЭД'
  if (tnvedChecking.value) return 'Проверка кода ТН ВЭД...'
  if (tnvedLookupError.value) return tnvedLookupError.value
  if (tnvedExists.value === false) return 'Несуществующий код ТН ВЭД'
  return ''
})

async function lookupTnVed(code) {
  tnvedChecking.value = true
  tnvedExists.value = null
  tnvedLookupError.value = ''
  try {
    const result = await feacnCodesStore.getByCode(code)
    // Ignore result if user has already changed the code
    if (code !== normalizedTargetTnVed.value) {
      return
    }
    tnvedExists.value = !!result
  } catch {
    // Ignore error if it relates to an outdated code
    if (code !== normalizedTargetTnVed.value) {
      return
    }
    tnvedExists.value = false
    tnvedLookupError.value = 'Несуществующий код ТН ВЭД'
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

  if (hasCorrectFormat.value) {
    tnvedChecking.value = true
    lookupTimeout = setTimeout(() => lookupTnVed(code), 500)
  }
})

onUnmounted(() => {
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
    <v-card class="assign-tnved-card">
      <v-card-title class="primary-heading">
        Код ТН ВЭД для выбранных посылок
      </v-card-title>
      <v-card-text>
        <div class="target-input-row">
          <input
            id="target-tnved"
            v-model="targetTnVed"
            type="text"
            class="input target-tnved-input"
            maxlength="10"
            placeholder="Код ТН ВЭД (10 цифр)"
            data-testid="target-tnved-input"
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
        <div v-if="validationMessage" class="validation-error" data-testid="target-tnved-error">
          <v-progress-circular v-if="tnvedChecking" indeterminate :size="14" :width="2" class="mr-1" />
          {{ validationMessage }}
        </div>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="close">Отменить</v-btn>
        <v-btn color="orange-darken-3" variant="text" :disabled="!isTnVedValid" @click="confirm">Установить</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <teleport to="body">
    <div v-if="show && searchActive" class="main-window-overlay" data-testid="assign-tnved-feacn-search-overlay">
      <FeacnCodeSearch @select="handleSearchSelect" />
    </div>
  </teleport>

  <teleport to="body">
    <div v-if="show && keywordSearchActive" class="main-window-overlay" data-testid="assign-tnved-feacn-keyword-overlay">
      <FeacnCodeSearchByKeyword v-model="keywordSearchActive" @select="handleKeywordSearchSelect" />
    </div>
  </teleport>
</template>

<style scoped>
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
  font-size: 0.85em;
}

.main-window-overlay {
  position: fixed;
  top: 50%;
  left: 2vw;
  transform: translateY(-50%);
  z-index: 2200;
  width: min(1400px, 60vw);
  max-height: 88vh;
}
</style>

<style>
/* Unscoped: Vuetify hoists dialog content outside the component root */
.v-overlay:has(.assign-tnved-dialog-position) .v-overlay__content {
  position: absolute !important;
  top: 10vh !important;
  left: 2vw !important;
  width: 30% !important;
  min-width: 250px !important;
}
</style>
