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
import { computed, inject, ref } from 'vue'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { 
  getFeacnCodesForKeywords,
  getFeacnCodeItemClass,
  updateParcelTnVed
} from '@/helpers/parcels.list.helpers.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { getFeacnTooltip } from '@/helpers/feacn.tooltip.helpers.js'

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
    } catch (error) {
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
