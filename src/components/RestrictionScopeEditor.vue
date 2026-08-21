<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  countries: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const procedureItems = [
  { title: 'Экспорт', value: 10 },
  { title: 'Импорт', value: 40 }
]

const countryItems = computed(() =>
  props.countries.map((country) => ({
    title:
      country.nameRuShort ||
      country.nameRuOfficial ||
      country.isoAlpha2 ||
      String(country.isoNumeric),
    value: country.isoNumeric
  }))
)

function updateScope(index, field, value) {
  const next = props.modelValue.map((scope, scopeIndex) =>
    scopeIndex === index ? { ...scope, [field]: value } : { ...scope }
  )
  emit('update:modelValue', next)
}

function addScope() {
  emit('update:modelValue', [
    ...props.modelValue.map((scope) => ({ ...scope })),
    { countryIsoNumeric: null, customsProcedureCode: 10, explanation: '' }
  ])
}

function removeScope(index) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, scopeIndex) => scopeIndex !== index).map((scope) => ({ ...scope }))
  )
}

function isDuplicate(index) {
  const scope = props.modelValue[index]
  if (scope?.countryIsoNumeric == null || scope?.customsProcedureCode == null) return false
  return props.modelValue.some(
    (candidate, candidateIndex) =>
      candidateIndex !== index &&
      Number(candidate.countryIsoNumeric) === Number(scope.countryIsoNumeric) &&
      Number(candidate.customsProcedureCode) === Number(scope.customsProcedureCode)
  )
}

defineExpose({ addScope, removeScope, updateScope, isDuplicate })
</script>

<template>
  <div class="restriction-scope-editor" data-testid="restriction-scope-editor">
    <div class="scope-editor-heading">
      <span class="label">Страны и таможенные процедуры:</span>
      <button
        type="button"
        class="button secondary scope-add-button"
        :disabled="disabled"
        data-testid="add-restriction-scope"
        @click="addScope"
      >
        <font-awesome-icon icon="fa-solid fa-plus" class="mr-1" />
        Добавить область
      </button>
    </div>

    <div v-if="modelValue.length === 0" class="scope-empty">
      Ограничение неактивно. Добавьте хотя бы одну страну и процедуру, чтобы применять его.
    </div>

    <div
      v-for="(scope, index) in modelValue"
      :key="index"
      class="scope-row-wrapper"
      :data-testid="`restriction-scope-${index}`"
    >
      <div class="scope-row">
        <v-autocomplete
          :model-value="scope.countryIsoNumeric"
          :items="countryItems"
          label="Страна"
          variant="solo"
          hide-details
          :disabled="disabled"
          class="scope-country"
          @update:model-value="updateScope(index, 'countryIsoNumeric', $event)"
        />
        <v-select
          :model-value="scope.customsProcedureCode"
          :items="procedureItems"
          label="Процедура"
          variant="solo"
          hide-details
          :disabled="disabled"
          class="scope-procedure"
          @update:model-value="updateScope(index, 'customsProcedureCode', $event)"
        />
        <v-text-field
          :model-value="scope.explanation"
          label="Причина ограничения"
          variant="solo"
          hide-details
          :disabled="disabled"
          class="scope-explanation"
          @update:model-value="updateScope(index, 'explanation', $event)"
        />
        <ActionButton
          :item="index"
          icon="fa-solid fa-trash-can"
          tooltip-text="Удалить область"
          :disabled="disabled"
          @click="removeScope"
        />
      </div>
      <div v-if="isDuplicate(index)" class="invalid-feedback scope-error">
        Такая страна и процедура уже добавлены
      </div>
    </div>
  </div>
</template>

<style scoped>
.restriction-scope-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.scope-editor-heading,
.scope-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.scope-editor-heading {
  justify-content: space-between;
}

.scope-add-button {
  margin: 0;
}

.scope-country {
  flex: 1.2 1 220px;
}

.scope-procedure {
  flex: 0 1 170px;
}

.scope-explanation {
  flex: 2 1 320px;
}

.scope-empty {
  color: #5f6368;
  font-size: 0.9rem;
}

.scope-error {
  display: block;
  margin-top: 0.25rem;
}

@media (max-width: 850px) {
  .scope-row,
  .scope-editor-heading {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
