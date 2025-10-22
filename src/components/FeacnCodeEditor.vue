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
import { useFeacnTooltips, loadFeacnTooltipOnHover } from '@/helpers/feacn.info.helpers.js'
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
const feacnTooltips = useFeacnTooltips()

// Computed properties for disabled states to ensure reactivity
const isSearchButtonDisabled = computed(() => {
  return props.isSubmitting || props.runningAction
})


// Computed property that reacts to current form values
const tnVedClass = computed(() => {
  return tnVedClassValue.value
})

// Watch for changes and update class asynchronously
watch([() => formValues.value.tnVed, () => props.item?.tnVed, () => props.item?.keyWordIds, () => props.item?.matchingFC], async () => {
  try {
    const currentTnVed = formValues.value.tnVed || props.item?.tnVed
    const feacnCodes = getFeacnCodesForKeywords(props.item?.keyWordIds, keyWordsStore)
    tnVedClassValue.value = await getTnVedCellClass(currentTnVed, feacnCodes, props.item?.matchingFC)
  } catch {
    tnVedClassValue.value = ''
  }
}, { immediate: true })

function toggleSearch() {
  // open/close main search; if opening main search, ensure keyword panel is closed by emitting overlay state
  const next = !searchActive.value
  searchActive.value = next
  if (next) {
    // notify parent/consumers that main search opened
    emit('overlay-state-changed', { mainOpen: true })
  } else {
    emit('overlay-state-changed', { mainOpen: false })
  }
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
// lookup handled from header actions now; keep this file focused on selection/search UI

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

function handleTnVedMouseEnter() {
  const code = formValues.value.tnVed || props.item?.tnVed
  if (code) {
    loadFeacnTooltipOnHover(code)
  }
}

</script>

<template>
  <!-- Feacn Code Section -->
  <div class="form-section">
    <div class="form-row">
        <div class="form-group feacn-search-wrapper">
          <label for="tnVed" class="label" 
                 :title="getFieldTooltip('tnVed', props.columnTitles, props.columnTooltips)" 
                 @dblclick="toggleSearch">{{ props.columnTitles.tnVed }}:
          </label>
          <v-tooltip content-class="feacn-tooltip" location="top" data-testid="tnved-editor-decode-tooltip">
            <template #activator="{ props: tooltipProps }">
              <Field name="tnVed" id="tnVed" class="form-control input"
                     v-bind="tooltipProps"
                     :readonly="searchActive"
                     :class="{
                       'is-invalid': props.errors && props.errors.tnVed,
                       [tnVedClass]: true
                     }"
                     @dblclick="toggleSearch"
                     @mouseenter="handleTnVedMouseEnter"
              />
            </template>
            <template #default>
              <div class="d-flex align-center">
                <font-awesome-icon icon="fa-solid fa-eye" class="mr-3" />
                {{ feacnTooltips[formValues.tnVed || props.item?.tnVed]?.name || 'Наведите для загрузки...' }}
              </div>
            </template>
          </v-tooltip>
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
          </div>
          <FeacnCodeSearch
            v-if="searchActive"
            class="feacn-overlay"
            @select="handleCodeSelect"
            @overlay-state-changed="(val) => { searchActive = val }"
          />
        </div>
        <FeacnCodeSelectorW
          :item="props.item"
          :onSelect="selectFeacnCode"
          :externalSearchOpen="searchActive"
          @overlay-state-changed="(val) => { if (val) { searchActive = false } }"
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
