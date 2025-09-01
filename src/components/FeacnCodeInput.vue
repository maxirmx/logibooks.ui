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
import { ref, watch, onUnmounted } from 'vue'
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  inputId: { type: String, default: '' },
  placeholder: { type: String, default: 'Введите код ТН ВЭД' }
})

const emit = defineEmits(['update:modelValue'])

const internalValue = ref(props.modelValue)
const searchActive = ref(false)

watch(() => props.modelValue, val => {
  internalValue.value = val
})

watch(internalValue, val => emit('update:modelValue', val))

function onInput(event) {
  const value = event.target.value.replace(/\D/g, '').slice(0, 10)
  internalValue.value = value
}

function toggleSearch() {
  searchActive.value = !searchActive.value
}

function handleSelect(code) {
  internalValue.value = code
  searchActive.value = false
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    searchActive.value = false
  }
}

watch(searchActive, val => {
  if (val) {
    document.addEventListener('keydown', handleEscape)
  } else {
    document.removeEventListener('keydown', handleEscape)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div class="feacn-search-wrapper">
    <input
      :id="inputId"
      class="form-control input"
      :disabled="disabled || searchActive"
      :value="internalValue"
      :placeholder="placeholder"
      @input="onInput"
    />
    <ActionButton
      data-test="feacn-code-search-btn"
      :icon="searchActive ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
      :item="null"
      @click="toggleSearch"
      class="ml-2"
      :disabled="disabled"
    />
    <FeacnCodeSearch
      v-if="searchActive"
      class="feacn-overlay"
      @select="handleSelect"
    />
  </div>
</template>

<style scoped>
.feacn-search-wrapper {
  position: relative;
}

.feacn-overlay {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  z-index: 100;
}
</style>
