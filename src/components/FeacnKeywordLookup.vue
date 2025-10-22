<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { keywordMatchesSearch } from '@/helpers/keywords.filter.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const keyWordsStore = useKeyWordsStore()
const searchTerm = ref('')
const highlightedIndex = ref(0)
const searchInput = ref(null)

const isOpen = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})

const keywordRows = computed(() => {
  const list = keyWordsStore.keyWords?.value ?? []
  const rows = []

  list.forEach(keyword => {
    const codes = Array.isArray(keyword.feacnCodes) ? keyword.feacnCodes : []
    if (!codes.length) {
      rows.push({
        id: `${keyword.id}-`,
        feacnCode: '',
        word: keyword.word ?? ''
      })
      return
    }

    codes.forEach(code => {
      rows.push({
        id: `${keyword.id}-${code}`,
        feacnCode: code,
        word: keyword.word ?? ''
      })
    })
  })

  return rows
})

const filteredRows = computed(() => {
  const query = searchTerm.value
  if (!query) {
    return keywordRows.value
  }

  return keywordRows.value.filter(row =>
    keywordMatchesSearch(query, { word: row.word, feacnCodes: [row.feacnCode] })
  )
})

function closeSelector() {
  isOpen.value = false
}

function selectRow(row) {
  emit('select', row.feacnCode)
  closeSelector()
}

function onRowMouseEnter(index) {
  highlightedIndex.value = index
}

function ensureHighlightedIndex() {
  if (!filteredRows.value.length) {
    highlightedIndex.value = -1
    return
  }

  if (highlightedIndex.value < 0) {
    highlightedIndex.value = 0
    return
  }

  if (highlightedIndex.value >= filteredRows.value.length) {
    highlightedIndex.value = filteredRows.value.length - 1
  }
}

function handleKeydown(event) {
  if (!isOpen.value) {
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!filteredRows.value.length) return
    highlightedIndex.value =
      (highlightedIndex.value + 1) % filteredRows.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!filteredRows.value.length) return
    highlightedIndex.value =
      (highlightedIndex.value - 1 + filteredRows.value.length) % filteredRows.value.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (highlightedIndex.value >= 0 && filteredRows.value[highlightedIndex.value]) {
      selectRow(filteredRows.value[highlightedIndex.value])
    }
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeSelector()
  }
}

function handleRowKeydown(event, row) {
  if (event.key === 'Enter') {
    event.preventDefault()
    selectRow(row)
  }
}

watch(filteredRows, () => {
  ensureHighlightedIndex()
})

watch(isOpen, async value => {
  if (value) {
    searchTerm.value = ''
    highlightedIndex.value = 0
    await nextTick()
    const inputEl = searchInput.value?.$el?.querySelector('input') || searchInput.value
    inputEl?.focus?.()
  }
})

onMounted(async () => {
  await keyWordsStore.ensureLoaded()
})
</script>

<template>
  <v-dialog v-model="isOpen" width="640" max-width="90vw" persistent>
    <v-card class="feacn-keyword-selector" data-testid="feacn-keyword-selector">
      <v-card-title>Подбор кода ТН ВЭД по ключевым словам</v-card-title>
      <v-card-text>
        <v-text-field
          ref="searchInput"
          v-model="searchTerm"
          label="Поиск ключевого слова или кода ТН ВЭД"
          variant="solo"
          hide-details
          data-testid="feacn-keyword-selector-input"
          @keydown="handleKeydown"
        />
        <div class="feacn-keyword-selector__list" data-testid="feacn-keyword-selector-list">
          <div class="feacn-keyword-selector__header">
            <span>Код ТН ВЭД</span>
            <span>Ключевое слово</span>
          </div>
          <template v-if="filteredRows.length">
            <div
              v-for="(row, index) in filteredRows"
              :key="row.id"
              class="feacn-keyword-selector__item"
              :class="{ 'feacn-keyword-selector__item--active': index === highlightedIndex }"
              tabindex="0"
              data-testid="feacn-keyword-selector-item"
              @mouseenter="onRowMouseEnter(index)"
              @focus="onRowMouseEnter(index)"
              @dblclick="() => selectRow(row)"
              @keydown="event => handleRowKeydown(event, row)"
            >
              <span class="feacn-keyword-selector__code">{{ row.feacnCode }}</span>
              <span class="feacn-keyword-selector__word">{{ row.word }}</span>
            </div>
          </template>
          <div v-else class="feacn-keyword-selector__empty" data-testid="feacn-keyword-selector-empty">
            Нет подходящих записей
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" color="primary" @click="closeSelector">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.feacn-keyword-selector__list {
  margin-top: 12px;
  border: 1px solid var(--v-theme-outline-variant, #d7dae0);
  border-radius: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.feacn-keyword-selector__header {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 12px;
  padding: 12px;
  font-weight: 600;
  font-size: 0.875rem;
  border-bottom: 1px solid var(--v-theme-outline-variant, #d7dae0);
  background-color: var(--v-theme-surface-variant, rgba(0, 0, 0, 0.04));
}

.feacn-keyword-selector__item {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 0.875rem;
}

.feacn-keyword-selector__item:nth-child(odd) {
  background-color: var(--v-theme-surface-container-low, rgba(0, 0, 0, 0.02));
}

.feacn-keyword-selector__item:hover,
.feacn-keyword-selector__item:focus,
.feacn-keyword-selector__item--active {
  background-color: var(--v-theme-primary, rgba(33, 150, 243, 0.15));
  outline: none;
}

.feacn-keyword-selector__code {
  font-family: 'Roboto Mono', monospace;
}

.feacn-keyword-selector__empty {
  padding: 16px;
  text-align: center;
  color: var(--v-theme-on-surface-variant, #6b6f76);
  font-size: 0.875rem;
}
</style>
