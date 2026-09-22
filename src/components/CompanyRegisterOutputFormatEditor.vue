<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, onMounted, reactive, ref, watch } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import {
  COMPANY_REGISTER_OUTPUT_TYPES,
  OFFERED_COMPANY_REGISTER_OUTPUT_TYPES
} from '@/helpers/company.constants.js'
import { getRegisterTypeDisplayName } from '@/helpers/register.display.helpers.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'

const props = defineProps({
  companyId: { type: Number, required: true },
  initialRegisterType: { type: Number, default: COMPANY_REGISTER_OUTPUT_TYPES[0] },
  standalone: { type: Boolean, default: false }
})
const companiesStore = useCompaniesStore()
const alertStore = useAlertStore()
const confirm = useAppConfirm()
const selectedType = ref(props.initialRegisterType)
const inputChoice = ref('')
const generatedChoice = ref('')
const activeAddMode = ref(null)
const loading = ref(false)
const saving = ref(false)
const namesLoaded = ref(false)
const states = reactive(Object.fromEntries(COMPANY_REGISTER_OUTPUT_TYPES.map((registerType) => [
  registerType, { loaded: false, configured: false, dirty: false, entries: [], catalog: null }
])))
const current = computed(() => states[selectedType.value])
const canSave = computed(() => Boolean(current.value?.loaded &&
  current.value.entries.some((entry) => entry.kind !== 'empty')))
const sortedInputColumns = computed(() => [...(current.value?.catalog?.inputColumns || [])]
  .sort((left, right) => Number(left.columnId) - Number(right.columnId)))
const remainingInputColumns = computed(() => sortedInputColumns.value.filter((column) =>
  !current.value.entries.some((entry) => entry.kind === 'input' && entry.columnId === column.columnId)))
const headers = [
  { title: '', key: 'actions', sortable: false, width: '15rem' },
  { title: 'Порядковый номер', key: 'position', sortable: true, width: '15rem' },
  { title: 'Название столбца', key: 'title', sortable: true },
  { title: 'Тип', key: 'type', sortable: true, width: '15rem' }
]
const rows = computed(() => [
  ...current.value.entries.map((entry, index) => ({
    id: index,
    index,
    position: index + 1,
    title: entryLabel(entry),
    type: entryTypeLabel(entry)
  })),
  { id: 'add', isAdd: true, position: '', title: '', type: '' }
])

function tableRowProps({ item }) {
  return { class: item.isAdd ? 'register-output-editor__add-row' : 'register-output-editor__entry-row' }
}

watch(() => props.initialRegisterType, (registerType) => {
  selectedType.value = registerType
  inputChoice.value = ''
  generatedChoice.value = ''
  activeAddMode.value = null
  if (props.standalone && !states[registerType]?.loaded) void loadAll()
})

function copyEntries(entries = []) {
  return entries.map(({ kind, columnId, generatedKey }) => ({
    kind,
    ...(columnId != null ? { columnId } : {}),
    ...(generatedKey != null ? { generatedKey } : {})
  }))
}

async function loadAll() {
  loading.value = true
  try {
    const types = props.standalone
      ? COMPANY_REGISTER_OUTPUT_TYPES.filter((registerType) => registerType === selectedType.value)
      : OFFERED_COMPANY_REGISTER_OUTPUT_TYPES
    const [, results] = await Promise.all([
      namesLoaded.value ? Promise.resolve() : companiesStore.getAll(),
      Promise.all(types.map(async (registerType) => {
        const [catalog, format] = await Promise.all([
          companiesStore.getRegisterOutputColumns(registerType),
          companiesStore.getRegisterOutputFormat(props.companyId, registerType)
        ])
        return { registerType, catalog, format }
      }))
    ])
    namesLoaded.value = true
    for (const { registerType, catalog, format } of results) {
      const state = states[registerType]
      state.catalog = catalog
      state.entries = copyEntries(format?.entries)
      state.configured = Boolean(format)
      state.loaded = true
      state.dirty = false
    }
    return true
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Не удалось загрузить форматы выгрузки',
      action: { label: 'Повторить', handler: loadAll }
    })
    return false
  } finally {
    loading.value = false
  }
}

onMounted(() => { void loadAll() })

function switchType(event) {
  selectedType.value = Number(event.target.value)
  inputChoice.value = ''
  generatedChoice.value = ''
  activeAddMode.value = null
}

function toggleAddMode(mode) {
  activeAddMode.value = activeAddMode.value === mode ? null : mode
  inputChoice.value = ''
  generatedChoice.value = ''
}

function addEntry(entry) {
  current.value.entries.push(entry)
  current.value.dirty = true
  activeAddMode.value = null
}

function addInput() {
  const columnId = Number(inputChoice.value)
  if (!columnId) {
    alertStore.error('Выберите исходный столбец')
    return
  }
  if (current.value.entries.some((entry) => entry.kind === 'input' && entry.columnId === columnId)) {
    alertStore.error('Этот столбец уже добавлен')
    return
  }
  addEntry({ kind: 'input', columnId })
  inputChoice.value = ''
}

function addGenerated() {
  const generatedKey = generatedChoice.value
  if (!generatedKey) {
    alertStore.error('Выберите вычисляемый столбец')
    return
  }
  if (current.value.entries.some((entry) => entry.kind === 'generated' && entry.generatedKey === generatedKey)) {
    alertStore.error('Этот столбец уже добавлен')
    return
  }
  addEntry({ kind: 'generated', generatedKey })
  generatedChoice.value = ''
}

function addAllInputs() {
  if (saving.value || remainingInputColumns.value.length === 0) return
  current.value.entries = [
    ...sortedInputColumns.value.map(({ columnId }) => ({ kind: 'input', columnId })),
    ...current.value.entries.filter((entry) => entry.kind !== 'input')
  ]
  current.value.dirty = true
  activeAddMode.value = null
  inputChoice.value = ''
  generatedChoice.value = ''
}

function addFlexible() {
  activeAddMode.value = null
  if (current.value.entries.some((entry) => entry.kind === 'flexibleBlock')) {
    alertStore.error('Блок дополнительных столбцов уже добавлен')
    return
  }
  addEntry({ kind: 'flexibleBlock' })
}

function move(index, direction) {
  const target = index + direction
  if (target < 0 || target >= current.value.entries.length) return
  const entries = current.value.entries
  ;[entries[index], entries[target]] = [entries[target], entries[index]]
  current.value.dirty = true
}

function remove(index) {
  current.value.entries.splice(index, 1)
  current.value.dirty = true
}

function entryLabel(entry) {
  if (entry.kind === 'input') {
    return current.value.catalog?.inputColumns?.find((column) => column.columnId === entry.columnId)?.name
      || `Столбец ${entry.columnId}`
  }
  if (entry.kind === 'generated') {
    return current.value.catalog?.generatedColumns?.find((column) => column.generatedKey === entry.generatedKey)?.name
      || entry.generatedKey
  }
  if (entry.kind === 'flexibleBlock') return 'Блок дополнительных столбцов из файла'
  return ''
}

function entryTypeLabel(entry) {
  if (entry.kind === 'generated') return 'вычисляемый'
  if (entry.kind === 'empty') return 'пустой'
  return 'исходный'
}

async function save(registerType = selectedType.value) {
  if (saving.value || loading.value) return false
  const state = states[registerType]
  if (!state.entries.some((entry) => entry.kind !== 'empty')) {
    alertStore.error('Добавьте исходный, вычисляемый столбец или гибкий блок')
    return false
  }
  const format = { schemaVersion: 1, registerType, entries: copyEntries(state.entries) }
  saving.value = true
  try {
    await companiesStore.saveRegisterOutputFormat(props.companyId, registerType, format)
    state.configured = true
    state.dirty = false
    alertStore.success('Формат выгрузки сохранён')
    return true
  } catch (error) {
    const details = error?.data?.details
    if (Array.isArray(details) && details.length > 0) {
      alertStore.error(details.map((detail) => `Столбец ${detail.entryIndex + 1}: ${detail.message}`).join('; '))
      return false
    }
    alertStore.error(error, {
      fallback: 'Не удалось сохранить формат выгрузки',
      action: { label: 'Повторить', handler: () => save(registerType) }
    })
    return false
  } finally {
    saving.value = false
  }
}

async function removeConfirmed(registerType) {
  if (saving.value) return false
  saving.value = true
  try {
    await companiesStore.deleteRegisterOutputFormat(props.companyId, registerType)
    const state = states[registerType]
    state.entries = []
    state.configured = false
    state.dirty = false
    alertStore.success('Формат выгрузки удалён')
    return true
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Не удалось удалить формат выгрузки',
      action: { label: 'Повторить', handler: () => removeConfirmed(registerType) }
    })
    return false
  } finally {
    saving.value = false
  }
}

async function removeSaved() {
  if (!current.value.configured || saving.value) return false
  const registerType = selectedType.value
  const confirmed = await confirm({
    title: 'Удалить формат выгрузки?',
    content: 'Для этого типа реестра останется обычный формат.',
    confirmationText: 'Удалить',
    cancellationText: 'Отменить'
  })
  if (!confirmed) return false
  return removeConfirmed(registerType)
}

defineExpose({ save, saving, loading, canSave })
</script>

<template>
  <section class="register-output-editor" :class="{ 'register-output-editor--standalone': standalone }" aria-label="Форматы выгрузки реестров">
    <h2 v-if="!standalone">Форматы выгрузки реестров</h2>

    <div v-if="!standalone" class="form-group">
      <label class="label" for="register-output-type">Тип реестра:</label>
      <select id="register-output-type" class="form-control input" :value="selectedType" @change="switchType">
        <option v-for="registerType in OFFERED_COMPANY_REGISTER_OUTPUT_TYPES" :key="registerType" :value="registerType">
          {{ getRegisterTypeDisplayName(companiesStore.companies, registerType) }}{{ states[registerType].configured ? ' — настроен' : '' }}{{ states[registerType].dirty ? ' *' : '' }}
        </option>
      </select>
    </div>

    <p v-if="loading" role="status">Загрузка форматов…</p>
    <template v-else-if="current.loaded">
      <v-card class="table-card">
        <v-data-table
          :headers="headers"
          :items="rows"
          item-value="id"
          :row-props="tableRowProps"
          :items-per-page="-1"
          hide-default-footer
          density="compact"
          class="elevation-1 interlaced-table register-output-editor__table"
          aria-label="Порядок столбцов"
        >
          <template v-slot:[`item.actions`]="{ item }">
            <div v-if="!item.isAdd" class="actions-container">
              <ActionButton
                :item="item.index"
                icon="fa-solid fa-arrow-up"
                icon-size="1x"
                :tooltip-text="`Поднять столбец ${item.position}`"
                :aria-label="`Поднять столбец ${item.position}`"
                :disabled="item.index === 0 || saving"
                @click="move(item.index, -1)"
              />
              <ActionButton
                :item="item.index"
                icon="fa-solid fa-arrow-down"
                icon-size="1x"
                :tooltip-text="`Опустить столбец ${item.position}`"
                :aria-label="`Опустить столбец ${item.position}`"
                :disabled="item.index === current.entries.length - 1 || saving"
                @click="move(item.index, 1)"
              />
              <ActionButton
                :item="item.index"
                icon="fa-solid fa-trash-can"
                icon-size="1x"
                :tooltip-text="`Убрать столбец ${item.position}`"
                :aria-label="`Убрать столбец ${item.position}`"
                :disabled="saving"
                @click="remove(item.index)"
              />
            </div>
            <div v-else class="actions-container">
              <ActionButton
                :item="null"
                icon="fa-solid fa-plus"
                icon-size="1x"
                tooltip-text="Добавить исходный столбец"
                aria-label="Добавить исходный столбец"
                :aria-pressed="activeAddMode === 'input'"
                :variant="activeAddMode === 'input' ? 'blue' : 'default'"
                :disabled="saving"
                @click="toggleAddMode('input')"
              />
              <ActionButton
                :item="null"
                icon="fa-solid fa-calculator"
                icon-size="1x"
                tooltip-text="Добавить вычисляемый столбец"
                aria-label="Добавить вычисляемый столбец"
                :aria-pressed="activeAddMode === 'generated'"
                :variant="activeAddMode === 'generated' ? 'blue' : 'default'"
                :disabled="saving"
                @click="toggleAddMode('generated')"
              />
              <ActionButton
                :item="null"
                icon="fa-solid fa-layer-group"
                icon-size="1x"
                tooltip-text="Добавить гибкий блок"
                aria-label="Добавить гибкий блок"
                :disabled="saving"
                @click="addFlexible"
              />
              <ActionButton
                :item="null"
                icon="fa-solid fa-file-circle-plus"
                icon-size="1x"
                tooltip-text="Добавить пустой столбец"
                aria-label="Добавить пустой столбец"
                :disabled="saving"
                @click="addEntry({ kind: 'empty' })"
              />
              <ActionButton
                v-if="!current.configured"
                :item="null"
                icon="fa-solid fa-list-check"
                icon-size="1x"
                tooltip-text="Добавить все исходные столбцы"
                aria-label="Добавить все исходные столбцы"
                :disabled="saving || remainingInputColumns.length === 0"
                @click="addAllInputs"
              />
            </div>
          </template>
          <template v-slot:[`item.title`]="{ item }">
            <template v-if="!item.isAdd">{{ item.title }}</template>
            <template v-else>
              <select
                v-if="activeAddMode === 'input'"
                v-model="inputChoice"
                class="form-control input"
                aria-label="Исходный столбец"
                :disabled="saving"
                @change="addInput"
              >
                <option value="">Исходный столбец…</option>
                <option v-for="column in sortedInputColumns" :key="column.columnId" :value="String(column.columnId)">{{ column.name }}</option>
              </select>
              <select
                v-if="activeAddMode === 'generated'"
                v-model="generatedChoice"
                class="form-control input"
                aria-label="Вычисляемый столбец"
                :disabled="saving"
                @change="addGenerated"
              >
                <option value="">Вычисляемый столбец…</option>
                <option v-for="column in current.catalog?.generatedColumns || []" :key="column.generatedKey" :value="column.generatedKey">{{ column.name }}{{ column.importOnly ? ' (только IM40)' : '' }}</option>
              </select>
            </template>
          </template>
        </v-data-table>
      </v-card>
      <div v-if="!standalone" class="register-output-editor__actions">
        <button type="button" class="button primary" :disabled="saving || !canSave" @click="save()">Сохранить формат</button>
        <button v-if="current.configured" type="button" class="button secondary" :disabled="saving" @click="removeSaved">Удалить формат</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.register-output-editor { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border-color, #ccc); }
.register-output-editor--standalone { margin-top: 0; border-top: 0; }
.register-output-editor__actions { display: flex; align-items: center; gap: 0.5rem; }
:deep(.register-output-editor__add-row .input) { display: block; width: 100%; min-width: 12rem; height: 2rem; margin: 0; padding: 0.2rem; }
</style>
