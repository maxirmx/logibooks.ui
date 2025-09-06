<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, watch, computed, onUnmounted } from 'vue'
import { Field, useFormValues } from 'vee-validate'
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
  setFieldValue: { type: Function, required: true },
  // Next parcel promises from parent
  nextParcelPromises: { 
    type: Object, 
    default: () => ({ theNext: null, next: null }) 
  },
  // Running action flag from parent
  runningAction: { type: [Boolean, Object], default: false }
})

const emit = defineEmits(['update:item', 'overlay-state-changed', 'set-running-action'])

const keyWordsStore = useKeyWordsStore()
const parcelsStore = useParcelsStore()

// Get current form values
const formValues = useFormValues()

const searchActive = ref(false)
const tnVedClassValue = ref('')

// Computed properties for disabled states to ensure reactivity
const isSearchButtonDisabled = computed(() => {
  return props.isSubmitting || props.runningAction
})

const isLookupButtonDisabled = computed(() => {
  return props.isSubmitting || props.runningAction || searchActive.value 
})

// Computed property that reacts to current form values
const tnVedClass = computed(() => {
  return tnVedClassValue.value
})

// Watch for changes and update class asynchronously
watch([() => formValues.value.tnVed, () => props.item?.tnVed, () => props.item?.keyWordIds], async () => {
  try {
    const currentTnVed = formValues.value.tnVed || props.item?.tnVed
    const feacnCodes = getFeacnCodesForKeywords(props.item?.keyWordIds, keyWordsStore)
    tnVedClassValue.value = await getTnVedCellClass(currentTnVed, feacnCodes)
  } catch {
    tnVedClassValue.value = ''
  }
}, { immediate: true })

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
  if (props.runningAction) return
  emit('set-running-action', true)
  try {
    // Wait for next parcel promises if they exist
    if (props.nextParcelPromises.theNext && props.nextParcelPromises.next) {
      await Promise.all([props.nextParcelPromises.theNext, props.nextParcelPromises.next])
    }
    
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
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при подборе кодов ТН ВЭД'
  } finally {
    emit('set-running-action', false)
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
          <label for="tnVed" class="label" :title="getFieldTooltip('tnVed', props.columnTitles, props.columnTooltips)" @dblclick="toggleSearch">{{ props.columnTitles.tnVed }}:</label>
          <Field name="tnVed" id="tnVed" class="form-control input"
                 :readonly="searchActive"
                 :class="{
                   'is-invalid': props.errors && props.errors.tnVed,
                   [tnVedClass]: true
                 }"
                 @dblclick="toggleSearch"
          />
          <div class="action-buttons">
            <ActionButton
              :item="props.item"
              :icon="searchActive ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
              :tooltip-text="searchActive ? 'Скрыть дерево кодов' : 'Выбрать код'"
              class="button-o-c"
              :disabled="isSearchButtonDisabled"
              @click="toggleSearch"
              :iconSize="'1x'"
            />
            <ActionButton
              :item="props.item"
              icon="fa-solid fa-magnifying-glass"
              tooltip-text="Сохранить и подобрать код"
              :disabled="isLookupButtonDisabled"
              @click="lookupFeacnCodes"
              :iconSize="'1x'"
            />
          </div>
          <FeacnCodeSearch
            v-if="searchActive"
            class="feacn-overlay"
            @select="handleCodeSelect"
          />
        </div>
      <FeacnCodeSelectorW
        :item="props.item"
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
  width: 90vw;
  max-width: 1600px;
  min-width: 600px;
}


/* Ensure all parent containers allow overflow */
.form-section,
.form-row,
.form-group {
  overflow: visible !important;
}
</style>
