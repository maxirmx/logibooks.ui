<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref, watch } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'
import FeacnCodeSearchByKeyword from '@/components/FeacnCodeSearchByKeyword.vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  selectedIds: { type: Array, required: true },
})

const emit = defineEmits(['update:show', 'confirm'])

const targetTnVed = ref('')
const searchActive = ref(false)
const keywordSearchActive = ref(false)

const idList = computed(() => props.selectedIds.join(', '))
const normalizedTargetTnVed = computed(() => targetTnVed.value.trim())
const isTnVedValid = computed(() => /^\d{10}$/.test(normalizedTargetTnVed.value))

function close() {
  emit('update:show', false)
}

function onDialogUpdate(value) {
  if (!value) {
    close()
  }
}

function resetState() {
  targetTnVed.value = ''
  searchActive.value = false
  keywordSearchActive.value = false
}

function confirm() {
  if (!isTnVedValid.value) return
  emit('confirm', props.selectedIds, normalizedTargetTnVed.value)
  close()
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
  <v-dialog :model-value="show" width="30%" min-width="250px" @update:model-value="onDialogUpdate">
    <v-card>
      <v-card-title>
        ТН ВЭД для выбранных посылок
      </v-card-title>
      <v-card-text>
        <div class="selected-ids-list">{{ idList }}</div>

        <label for="target-tnved" class="label mt-4 d-block">Целевой ТН ВЭД:</label>
        <div class="target-input-row">
          <input
            id="target-tnved"
            v-model="targetTnVed"
            type="text"
            class="input target-tnved-input"
            maxlength="10"
            placeholder="10 цифр"
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
            :icon="keywordSearchActive ? 'fa-solid fa-arrow-up' : 'fa-solid fa-keyboard'"
            :tooltip-text="keywordSearchActive ? 'Скрыть подбор по ключевым словам' : 'Выбрать код (ключевые слова)'"
            class="button-o-c"
            @click="toggleKeywordSearch"
            :iconSize="'1x'"
          />
        </div>
        <div v-if="targetTnVed && !isTnVedValid" class="validation-error" data-testid="target-tnved-error">
          Введите корректный код ТН ВЭД: ровно 10 цифр.
        </div>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="close">Отменить</v-btn>
        <v-btn color="orange-darken-3" variant="text" :disabled="!isTnVedValid" @click="confirm">Назначить</v-btn>
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
.selected-ids-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85em;
  word-break: break-all;
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
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2200;
  width: min(1400px, 92vw);
  max-height: 88vh;
}
</style>
