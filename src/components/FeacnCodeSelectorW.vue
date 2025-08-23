// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

<script setup>
import { computed } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import {
  getFeacnCodesForKeywords,
  getFeacnCodeItemClass,
  getKeywordFeacnPairs,
} from '@/helpers/parcels.list.helpers.js'
import { useFeacnTooltips, loadFeacnTooltipOnHover } from '@/helpers/feacn.tooltip.helpers.js'
import { useKeyWordsStore } from '@/stores/key.words.store.js'

const props = defineProps({
  item: { type: Object, required: true },
  onSelect: { type: Function, required: true }
})

const keyWordsStore = useKeyWordsStore()

// Use the shared tooltip cache
const feacnTooltips = useFeacnTooltips()

// Computed property for keyword/FEACN pairs
const keywordsWithFeacn = computed(() =>
  getKeywordFeacnPairs(props.item?.keyWordIds, keyWordsStore)
)

function handleCodeSelect(feacnCode) {
  if (typeof props.onSelect === 'function') {
    props.onSelect(feacnCode)
  }
}

function handleMouseEnter(code) {
  loadFeacnTooltipOnHover(code)
}
</script>

<template>
  <div class="form-group">
    <label class="label">Подбор ТН ВЭД:</label>
    <div v-if="keywordsWithFeacn.length > 0" class="form-control feacn-lookup-column">
      <div 
        v-for="keyword in keywordsWithFeacn" 
        :key="keyword.id"
        class="keyword-item"
      >
        <v-tooltip content-class="feacn-tooltip" location="top">
          <template #activator="{ props: tooltipProps }">
            <div 
              v-bind="tooltipProps"
              :class="[
                getFeacnCodeItemClass(keyword.feacnCode, item.tnVed, getFeacnCodesForKeywords(item.keyWordIds, keyWordsStore)),
                'feacn-edit-dialog-item'
              ]"
              class="keyword-code"
              @click="() => handleCodeSelect(keyword.feacnCode)"
              @mouseenter="() => handleMouseEnter(keyword.feacnCode)"
            >
              {{ keyword.feacnCode }} - "{{ keyword.word }}"
            </div>
          </template>
          <template #default>
            <div class="d-flex align-center">
              <font-awesome-icon icon="fa-solid fa-info-circle" class="mr-3" />
              {{ feacnTooltips[keyword.feacnCode] || 'Наведите для загрузки...' }}
            </div>
          </template>
        </v-tooltip>
        <div class="action-buttons">
          <ActionButton
            :item="keyword"
            :icon="keyword.feacnCode === item.tnVed ? 'fa-solid fa-check-double' : 'fa-solid fa-check'"
            :tooltip-text="keyword.feacnCode === item.tnVed ? 'Выбрано' : 'Выбрать этот код ТН ВЭД'"
            :disabled="keyword.feacnCode === item.tnVed"
            @click="() => handleCodeSelect(keyword.feacnCode)"
          />
        </div>
      </div>
    </div>
    <div v-else class="form-control">-</div>
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
