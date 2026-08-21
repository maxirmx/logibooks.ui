<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  countries: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) }
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

function scopeFieldName(index, field) {
  return `scopes[${index}].${field}`
}

function getScopeFieldError(index, field) {
  const bracketPath = scopeFieldName(index, field)
  const dotPath = `scopes.${index}.${field}`
  const indexedError = props.errors?.[bracketPath] || props.errors?.[dotPath]
  if (indexedError) return indexedError
  if (!props.errors?.scopes) return null

  const scope = props.modelValue[index]
  if (field === 'countryIsoNumeric' && scope?.countryIsoNumeric == null) {
    return 'Выберите страну'
  }
  if (
    field === 'customsProcedureCode' &&
    ![10, 40].includes(Number(scope?.customsProcedureCode))
  ) {
    return 'Выберите процедуру'
  }
  return null
}

const firstScopeFieldErrorName = computed(() => {
  for (let index = 0; index < props.modelValue.length; index += 1) {
    for (const field of ['countryIsoNumeric', 'customsProcedureCode']) {
      if (getScopeFieldError(index, field)) return scopeFieldName(index, field)
    }
  }
  return null
})

const generalScopeError = computed(() => {
  if (!props.errors?.scopes || firstScopeFieldErrorName.value) return null
  if (props.modelValue.some((_, index) => isDuplicate(index))) return null
  return props.errors.scopes
})

function isScopeFocusTarget(index, field) {
  if (firstScopeFieldErrorName.value) {
    return firstScopeFieldErrorName.value === scopeFieldName(index, field)
  }
  return Boolean(props.errors?.scopes) && index === 0 && field === 'countryIsoNumeric'
}

defineExpose({ addScope, removeScope, updateScope, isDuplicate, getScopeFieldError })
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
        <div
          class="scope-field scope-country"
          :data-field="isScopeFocusTarget(index, 'countryIsoNumeric') ? 'scopes' : undefined"
        >
          <v-autocomplete
            :id="scopeFieldName(index, 'countryIsoNumeric')"
            :name="scopeFieldName(index, 'countryIsoNumeric')"
            :data-field="scopeFieldName(index, 'countryIsoNumeric')"
            :model-value="scope.countryIsoNumeric"
            :items="countryItems"
            label="Страна"
            variant="solo"
            hide-details
            :error="Boolean(getScopeFieldError(index, 'countryIsoNumeric'))"
            :aria-invalid="Boolean(getScopeFieldError(index, 'countryIsoNumeric'))"
            :disabled="disabled"
            class="scope-control"
            @update:model-value="updateScope(index, 'countryIsoNumeric', $event)"
          />
          <div
            v-if="getScopeFieldError(index, 'countryIsoNumeric')"
            class="invalid-feedback scope-field-error"
            :data-field-error="scopeFieldName(index, 'countryIsoNumeric')"
          >
            {{ getScopeFieldError(index, 'countryIsoNumeric') }}
          </div>
        </div>
        <div
          class="scope-field scope-procedure"
          :data-field="isScopeFocusTarget(index, 'customsProcedureCode') ? 'scopes' : undefined"
        >
          <v-select
            :id="scopeFieldName(index, 'customsProcedureCode')"
            :name="scopeFieldName(index, 'customsProcedureCode')"
            :data-field="scopeFieldName(index, 'customsProcedureCode')"
            :model-value="scope.customsProcedureCode"
            :items="procedureItems"
            label="Процедура"
            variant="solo"
            hide-details
            :error="Boolean(getScopeFieldError(index, 'customsProcedureCode'))"
            :aria-invalid="Boolean(getScopeFieldError(index, 'customsProcedureCode'))"
            :disabled="disabled"
            class="scope-control"
            @update:model-value="updateScope(index, 'customsProcedureCode', $event)"
          />
          <div
            v-if="getScopeFieldError(index, 'customsProcedureCode')"
            class="invalid-feedback scope-field-error"
            :data-field-error="scopeFieldName(index, 'customsProcedureCode')"
          >
            {{ getScopeFieldError(index, 'customsProcedureCode') }}
          </div>
        </div>
        <div class="scope-field scope-explanation">
          <v-text-field
            :model-value="scope.explanation"
            label="Причина ограничения"
            variant="solo"
            hide-details
            :disabled="disabled"
            class="scope-control"
            @update:model-value="updateScope(index, 'explanation', $event)"
          />
        </div>
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
    <div v-if="generalScopeError" class="invalid-feedback scope-error">
      {{ generalScopeError }}
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

.scope-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.scope-control {
  width: 100%;
}

.scope-empty {
  color: #5f6368;
  font-size: 0.9rem;
}

.scope-error,
.scope-field-error {
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
