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
import { computed, inject } from 'vue'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { 
  getFeacnCodesForKeywords,
  getFeacnCodeItemClass,
  updateParcelTnVed
} from '@/helpers/parcels.list.helpers.js'
import { useParcelsStore } from '@/stores/parcels.store.js'

const props = defineProps({
  item: { type: Object, required: true }
})

const keyWordsStore = useKeyWordsStore()
const parcelsStore = useParcelsStore()

// Get the loadOrders function from parent component
const loadOrders = inject('loadOrders')

const feacnCodes = computed(() => {
  return getFeacnCodesForKeywords(props.item.keyWordIds, keyWordsStore)
})

async function selectCode(code) {
  if (code !== props.item.tnVed) {
    await updateParcelTnVed(props.item, code, parcelsStore, loadOrders)
  }
}
</script>

<template>
  <div v-if="feacnCodes.length > 0" class="feacn-lookup-column">
    <v-tooltip 
      v-for="code in feacnCodes" 
      :key="code" 
      location="top"
    >
      <template #activator="{ props }">
        <div 
          v-bind="props"
          :class="getFeacnCodeItemClass(code, item.tnVed, feacnCodes)"
          @click="selectCode(code)"
        >
          <span class="d-inline-flex align-center">
            <font-awesome-icon v-if="code === item.tnVed" icon="fa-solid fa-check-double" class="mr-1" />
            {{ code }}
          </span>
        </div>
      </template>
      <span v-if="code === item.tnVed">
        <font-awesome-icon icon="fa-solid fa-check-double" class="mr-3" /> Выбрано
      </span>
      <span v-else>
        <font-awesome-icon icon="fa-solid fa-check" class="mr-3" /> Выбрать
      </span>
    </v-tooltip>
  </div>
  <span v-else>-</span>
</template>
