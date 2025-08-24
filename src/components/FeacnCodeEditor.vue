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
import { Field } from 'vee-validate'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { getFieldTooltip } from '@/helpers/parcel.tooltip.helpers.js'
import { getFeacnCodesForKeywords, getTnVedCellClass } from '@/helpers/parcels.list.helpers.js'
import ActionButton from '@/components/ActionButton.vue'
import FeacnCodeSelectorW from '@/components/FeacnCodeSelectorW.vue'
import FeacnCodeSearch from '@/components/FeacnCodeSearch.vue'

const props = defineProps({
  // The parcel item
  item: { type: Object, required: true },
  // Form values from the parent form
  values: { type: Object, required: true },
  // Form errors from the parent form
  errors: { type: Object, default: () => ({}) },
  // Whether the form is submitting
  isSubmitting: { type: Boolean, default: false },
  // Column titles and tooltips mapping
  columnTitles: { type: Object, required: true },
  columnTooltips: { type: Object, required: true },
  // Function to set field value in parent form
  setFieldValue: { type: Function, required: true }
})

const emit = defineEmits(['update:item', 'overlay-state-changed'])

const keyWordsStore = useKeyWordsStore()
const parcelsStore = useParcelsStore()

const searchActive = ref(false)

function toggleSearch() {
  searchActive.value = !searchActive.value
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    searchActive.value = false
  }
}

// Improved watch with defensive cleanup
watch(searchActive, (val, oldVal) => {
  // Remove listener first if it was previously attached
  if (oldVal) {
    document.removeEventListener('keydown', handleEscape)
  }
  // Add listener if needed
  if (val) {
    document.addEventListener('keydown', handleEscape)
  }
  
  // Emit overlay state to parent
  emit('overlay-state-changed', val)
})

// Always try to remove on unmount
onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})

// Lookup FEACN codes for this parcel
async function lookupFeacnCodes() {
  try {
    // First update the parcel with current form values
    await parcelsStore.update(props.item.id, props.values)
    
    // Then lookup FEACN codes and get the keyWordIds response
    const result = await parcelsStore.lookupFeacnCode(props.item.id)
    
    // Update only the keyWordIds to trigger a re-render of keywordsWithFeacn computed property
    if (result && result.keyWordIds) {
      const updatedItem = { ...props.item, keyWordIds: result.keyWordIds }
      emit('update:item', updatedItem)
    }
  } catch (error) {
    console.error('Failed to lookup FEACN codes:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при подборе кодов ТН ВЭД'
  }
}

// Select a FEACN code and update TN VED
async function selectFeacnCode(feacnCode) {
  try {
    // Update the form field immediately
    props.setFieldValue('tnVed', feacnCode)
    
    // Update the item's tnVed to trigger reactivity in computed properties
    const updatedItem = { ...props.item, tnVed: feacnCode }
    emit('update:item', updatedItem)
  } catch (error) {
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при обновлении ТН ВЭД'
  }
}

async function handleCodeSelect(code) {
  await selectFeacnCode(code)
  searchActive.value = false
}
</script>

<template>
  <!-- Feacn Code Section -->
  <div class="form-section">
    <div class="form-row">
        <div class="form-group feacn-search-wrapper">
        <label for="tnVed" class="label" :title="getFieldTooltip('tnVed', columnTitles, columnTooltips)">{{ columnTitles.tnVed }}:</label>
          <Field name="tnVed" id="tnVed" class="form-control input"
                 :disabled="searchActive"
                 :class="{
                   'is-invalid': errors && errors.tnVed,
                   [getTnVedCellClass(values.tnVed || item?.tnVed, getFeacnCodesForKeywords(item?.keyWordIds, keyWordsStore))]: true
                 }" />
          <div class="action-buttons">
            <ActionButton
              :item="item"
              :icon="searchActive ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
              tooltip-text="Выбрать код"
              class="button-o-c"
              :disabled="isSubmitting"
              @click="toggleSearch"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-magnifying-glass"
              tooltip-text="Сохранить и подобрать код"
              :disabled="isSubmitting || searchActive"
              @click="lookupFeacnCodes"
            />
          </div>
          <FeacnCodeSearch
            v-if="searchActive"
            class="feacn-overlay"
            @select="handleCodeSelect"
          />
        </div>
      <FeacnCodeSelectorW
        :item="item"
        :onSelect="selectFeacnCode"
      />
    </div>
  </div>
</template>

<style scoped>
.feacn-search-wrapper {
  position: relative;
  /* Add this to ensure the container can contain the overlay */
  z-index: 1;
}

.feacn-overlay {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  z-index: 100;
  width: 60vw;
  max-width: 800px;
  min-width: 400px;
}


/* Ensure all parent containers allow overflow */
.form-section,
.form-row,
.form-group {
  overflow: visible !important;
}
</style>
