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

const RUSSIA_ISO_NUMERIC = 643

const procedureItems = [
  { title: 'Экспорт', value: 10 },
  { title: 'Импорт', value: 40 }
]

const headers = [
  { title: '', key: 'actions', sortable: false, width: '64px', align: 'center' },
  { title: 'Страна', key: 'countryIsoNumeric', sortable: false, width: '30%' },
  { title: 'Процедура', key: 'customsProcedureCode', sortable: false, width: '20%' },
  { title: 'Причина ограничения', key: 'explanation', sortable: false }
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

const tableItems = computed(() =>
  props.modelValue.map((scope, index) => ({ ...scope, __index: index }))
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
    { countryIsoNumeric: RUSSIA_ISO_NUMERIC, customsProcedureCode: 10, explanation: '' }
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
      candidateIndex < index &&
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

function getRowProps({ item }) {
  return {
    class: ['scope-row-wrapper', { 'scope-row-wrapper--duplicate': isDuplicate(item.__index) }],
    'data-testid': `restriction-scope-${item.__index}`
  }
}

defineExpose({
  addScope,
  removeScope,
  updateScope,
  isDuplicate,
  getScopeFieldError,
  getRowProps
})
</script>

<template>
  <div class="restriction-scope-editor" data-testid="restriction-scope-editor">
    <div class="scope-editor-heading">
      <span class="label">Правила применения:</span>
      <div class="header-actions-bar">
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="null"
            icon="fa-solid fa-plus"
            tooltip-text="Добавить правило"
            class="scope-add-button"
            :disabled="disabled"
            data-testid="add-restriction-scope"
            @click="addScope"
          />
        </div>
      </div>
    </div>

    <div class="scope-table-shell">
      <v-data-table
        :headers="headers"
        :items="tableItems"
        item-value="__index"
        :items-per-page="-1"
        :row-props="getRowProps"
        class="restriction-scope-table elevation-1 interlaced-table"
        density="compact"
        hide-default-footer
        no-data-text="Ограничение неактивно"
        aria-label="Правила применения"
      >
        <template #[`item.countryIsoNumeric`]="{ item }">
          <div
            class="scope-field scope-country"
            :data-field="
              isScopeFocusTarget(item.__index, 'countryIsoNumeric') ? 'scopes' : undefined
            "
          >
            <v-autocomplete
              :id="scopeFieldName(item.__index, 'countryIsoNumeric')"
              :name="scopeFieldName(item.__index, 'countryIsoNumeric')"
              :data-field="scopeFieldName(item.__index, 'countryIsoNumeric')"
              :model-value="item.countryIsoNumeric"
              :items="countryItems"
              aria-label="Страна"
              variant="outlined"
              density="compact"
              hide-details
              :error="Boolean(getScopeFieldError(item.__index, 'countryIsoNumeric'))"
              :aria-invalid="Boolean(getScopeFieldError(item.__index, 'countryIsoNumeric'))"
              :disabled="disabled"
              class="scope-control"
              @update:model-value="updateScope(item.__index, 'countryIsoNumeric', $event)"
            />
            <div
              v-if="getScopeFieldError(item.__index, 'countryIsoNumeric')"
              class="invalid-feedback scope-field-error"
              :data-field-error="scopeFieldName(item.__index, 'countryIsoNumeric')"
            >
              {{ getScopeFieldError(item.__index, 'countryIsoNumeric') }}
            </div>
            <div v-if="isDuplicate(item.__index)" class="invalid-feedback scope-error">
              Такая страна и процедура уже добавлены
            </div>
          </div>
        </template>

        <template #[`item.customsProcedureCode`]="{ item }">
          <div
            class="scope-field scope-procedure"
            :data-field="
              isScopeFocusTarget(item.__index, 'customsProcedureCode') ? 'scopes' : undefined
            "
          >
            <v-select
              :id="scopeFieldName(item.__index, 'customsProcedureCode')"
              :name="scopeFieldName(item.__index, 'customsProcedureCode')"
              :data-field="scopeFieldName(item.__index, 'customsProcedureCode')"
              :model-value="item.customsProcedureCode"
              :items="procedureItems"
              aria-label="Процедура"
              variant="outlined"
              density="compact"
              hide-details
              :error="Boolean(getScopeFieldError(item.__index, 'customsProcedureCode'))"
              :aria-invalid="Boolean(getScopeFieldError(item.__index, 'customsProcedureCode'))"
              :disabled="disabled"
              class="scope-control"
              @update:model-value="updateScope(item.__index, 'customsProcedureCode', $event)"
            />
            <div
              v-if="getScopeFieldError(item.__index, 'customsProcedureCode')"
              class="invalid-feedback scope-field-error"
              :data-field-error="scopeFieldName(item.__index, 'customsProcedureCode')"
            >
              {{ getScopeFieldError(item.__index, 'customsProcedureCode') }}
            </div>
          </div>
        </template>

        <template #[`item.explanation`]="{ item }">
          <v-text-field
            :model-value="item.explanation"
            aria-label="Причина ограничения"
            variant="outlined"
            density="compact"
            hide-details
            :disabled="disabled"
            class="scope-explanation"
            @update:model-value="updateScope(item.__index, 'explanation', $event)"
          />
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="actions-container scope-row-actions">
            <ActionButton
              :item="item.__index"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить правило"
              :disabled="disabled"
              @click="removeScope"
            />
          </div>
        </template>

        <template #no-data>
          <div class="scope-empty">
            Ограничение неактивно. Добавьте хотя бы одну страну и процедуру, чтобы применять его.
          </div>
        </template>
      </v-data-table>
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
  flex: 1 1 100%;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
}

.scope-editor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.scope-editor-heading .header-actions-bar {
  margin-left: auto;
}

.scope-table-shell {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
}

.scope-add-button {
  flex-shrink: 0;
}

.restriction-scope-table {
  min-width: 720px;
  overflow: hidden;
}

.restriction-scope-table :deep(td) {
  padding: 0.35rem 0.4rem !important;
  vertical-align: top;
}

.restriction-scope-table :deep(th:first-child),
.restriction-scope-table :deep(td:first-child) {
  padding-left: 0.25rem !important;
  padding-right: 0.25rem !important;
}

.scope-country,
.scope-procedure,
.scope-explanation,
.scope-control {
  width: 100%;
  min-width: 0;
}

.scope-field {
  display: flex;
  flex-direction: column;
}

.scope-row-actions {
  justify-content: center;
  min-height: 40px;
}

.scope-empty {
  color: #5f6368;
  font-size: 0.9rem;
  padding: 1.5rem;
  text-align: center;
}

.scope-error,
.scope-field-error {
  display: block;
  margin-top: 0.25rem;
  white-space: normal;
}
</style>
