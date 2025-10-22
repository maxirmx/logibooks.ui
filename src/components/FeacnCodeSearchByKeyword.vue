<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { keywordMatchesSearch } from '@/helpers/keywords.filter.js'

defineOptions({ name: 'FeacnCodeSearchByKeyword' })

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'select'])

const keyWordsStore = useKeyWordsStore()
const searchTerm = ref('')
const highlightedIndex = ref(0)
const searchInput = ref(null)

const isOpen = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const keywordRows = computed(() => {
  // support stores that expose a ref or a plain array
  const raw = keyWordsStore.keyWords
  const list = Array.isArray(raw) ? raw : (raw?.value ?? [])
  const rows = []
  list.forEach(keyword => {
    const codes = Array.isArray(keyword.feacnCodes) ? keyword.feacnCodes : []
    if (!codes.length) {
      rows.push({ id: `${keyword.id}-`, feacnCode: '', word: keyword.word ?? '' })
      return
    }
    codes.forEach(code => {
      rows.push({ id: `${keyword.id}-${code}`, feacnCode: code, word: keyword.word ?? '' })
    })
  })
  return rows
})

const filteredRows = computed(() => {
  const q = searchTerm.value
  if (!q) return keywordRows.value
  return keywordRows.value.filter(r => keywordMatchesSearch(q, { word: r.word, feacnCodes: [r.feacnCode] }))
})

function closePanel() { isOpen.value = false }
function selectRow(row) { emit('select', row.feacnCode); closePanel() }
function onRowMouseEnter(i) { highlightedIndex.value = i }

function ensureHighlightedIndex() {
  if (!filteredRows.value.length) { highlightedIndex.value = -1; return }
  if (highlightedIndex.value < 0) highlightedIndex.value = 0
  if (highlightedIndex.value >= filteredRows.value.length) highlightedIndex.value = filteredRows.value.length - 1
}

function handleKeydown(e) {
  if (!isOpen.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault(); if (!filteredRows.value.length) return
    highlightedIndex.value = (highlightedIndex.value + 1) % filteredRows.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault(); if (!filteredRows.value.length) return
    highlightedIndex.value = (highlightedIndex.value - 1 + filteredRows.value.length) % filteredRows.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault(); if (highlightedIndex.value >= 0 && filteredRows.value[highlightedIndex.value]) selectRow(filteredRows.value[highlightedIndex.value])
  } else if (e.key === 'Escape') {
    e.preventDefault(); closePanel()
  }
}



function handleRowKeydown(e, row) { if (e.key === 'Enter') { e.preventDefault(); selectRow(row) } }

watch(filteredRows, ensureHighlightedIndex)
watch(isOpen, async v => {
  if (v) {
    searchTerm.value = ''
    highlightedIndex.value = 0
    await nextTick()
    const inputEl = searchInput.value?.$el?.querySelector('input') || searchInput.value
    inputEl?.focus?.()
  }
})

onMounted(async () => { await keyWordsStore.ensureLoaded() })
</script>

<template>
  <div
    v-if="isOpen"
    class="feacn-code-search"
    data-testid="feacn-keyword-selector"
  >
    <div class="search-bar" data-testid="feacn-keyword-selector-input-wrapper">
      <input
        ref="searchInput"
        v-model="searchTerm"
        @keydown="handleKeydown"
        class="input search-input"
        type="text"
        placeholder="Код ТН ВЭД или ключевое слово"
        data-testid="feacn-keyword-selector-input"
      />
    </div>
    <div class="keyword-results" data-testid="feacn-keyword-selector-list">
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
          @click="() => selectRow(row)"
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
  </div>
</template>

<style scoped>
/* Base panel styling borrowed from FeacnCodeSearch for parity */
.feacn-code-search {
  position: relative;
  padding: 8px;
  background-color: #f5f5f5;
  color: #161616;
  box-shadow: 0px 3px 7px rgba(0, 0, 0, 0.1);
  border: 2px solid #797979;
  border-radius: 0.25rem;
  max-height: max(500px, 40vh);
  min-height: 20vh;
  display: flex;
  flex-direction: column;
  font-size: 0.875em;
  z-index: 20; /* ensure appears above surrounding content */
}

.search-bar {
  display: flex;
  align-items: center;
  position: relative;
}

.search-input {
  flex: 1;
  padding: 4px 8px;
  margin-bottom: 8px;
  border-radius: 0.25rem;
  border: 1px solid #b5b5b5;
  background: #fff;
}

.keyword-results {
  flex: 1 1 auto;
  overflow-y: auto;
  border: 1px solid var(--input-border-color);
  border-radius: 0.25rem;
  background-color: #f5f5f5;
  color: #161616;
  list-style: none;
  padding: 0;
  margin: 0;
}

.feacn-keyword-selector__item {
  padding: 0;
  cursor: pointer;
}

.feacn-keyword-selector__item:hover,
.feacn-keyword-selector__item:focus,
.feacn-keyword-selector__item--active {
  background-color: #f0f0f0;
  outline: none;
}

.feacn-keyword-selector__code { 
  font-family: 'Courier New', monospace;
  margin-right: 8px;
}

.feacn-keyword-selector__empty {
  padding: 4px 8px;
  text-align: center;
  color: #666;
  font-size: 0.875rem;
}
</style>