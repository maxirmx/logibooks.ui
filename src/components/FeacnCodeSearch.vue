<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import FeacnCodesTree from '@/components/FeacnCodesTree.vue'
import ActionButton from '@/components/ActionButton.vue'
import { formatFeacnNameFromItem } from '@/helpers/feacn.info.helpers.js'

defineOptions({ name: 'FeacnCodeSearch' })

const emit = defineEmits(['select', 'refocus'])

const store = useFeacnCodesStore()
const searchKey = ref('')
const searchResults = ref([])
const unavailableResultIds = ref(new Set())
const dropdownVisible = ref(false)
const searching = ref(false)
const searchError = ref(null)
const resultNodeRequests = new Map()
let resultsGeneration = 0

const treeRef = ref(null)
const searchInputRef = ref(null)

async function performSearch() {
  const key = searchKey.value.trim()
  resultsGeneration += 1
  unavailableResultIds.value = new Set()
  resultNodeRequests.clear()
  if (!key) {
    dropdownVisible.value = false
    searchResults.value = []
    return
  }

  searching.value = true
  searchError.value = null
  try {
    const items = await store.lookup(key)
    
    // Process items in parallel using Promise.all
    const formatted = await Promise.all((items || []).map(async item => {
      // Call formatFeacnName for test compatibility
      // await formatFeacnName(item.code)
      
      return {
        ...item,
        name: formatFeacnNameFromItem(item)
      }
    }))
    
    searchResults.value = formatted
  } catch (err) {
    searchError.value = err
    searchResults.value = []
  } finally {
    dropdownVisible.value = true
    searching.value = false
  }
}

function getResultNode(id) {
  if (!resultNodeRequests.has(id)) {
    resultNodeRequests.set(id, store.getById(id))
  }
  return resultNodeRequests.get(id)
}

async function checkResultNode(item) {
  if (!item?.id || unavailableResultIds.value.has(item.id)) return
  const generation = resultsGeneration
  try {
    const node = await getResultNode(item.id)
    if (generation === resultsGeneration && !node) {
      unavailableResultIds.value.add(item.id)
    }
  } catch (err) {
    if (generation === resultsGeneration) searchError.value = err
  }
}

async function selectSearchResult(item) {
  if (!item?.id || unavailableResultIds.value.has(item.id)) {
    return
  }

  const generation = resultsGeneration
  try {
    const node = await getResultNode(item.id)
    if (generation !== resultsGeneration) return
    if (!node) {
      unavailableResultIds.value.add(item.id)
      return
    }
    dropdownVisible.value = false

    const path = []
    let current = node
    while (current) {
      path.unshift(current.id)
      if (current.parentId) {
        current = await store.getById(current.parentId)
      } else {
        current = null
      }
    }
    await openPath(path)

    await nextTick()
    const targetEl = treeRef.value?.$el.querySelector(`[data-node-id="${item.id}"]`)
    if (targetEl && targetEl.scrollIntoView) {
      targetEl.scrollIntoView({ block: 'center' })
    }
  } catch (err) {
    searchError.value = err
    searchResults.value = []
    dropdownVisible.value = true
  }
}

async function openPath(pathIds = []) {
  if (!treeRef.value) {
    return
  }
  await treeRef.value.loadChildren()
  await nextTick()
  let nodes = treeRef.value.rootNodes
  if (!nodes || !Array.isArray(nodes)) {
    return
  }
  for (const id of pathIds) {
    const currentNode = nodes.find(n => n.id === id)
    if (!currentNode) {
      return
    }
    currentNode.expanded = true
    if (!currentNode.loaded) {
      await treeRef.value.loadChildren(currentNode)
      await nextTick()
    }
    nodes = currentNode.children
  }
}

function handleSelect(code) {
  emit('select', code)
}

function closeDropdown() {
  dropdownVisible.value = false
}

onBeforeUnmount(() => {
  emit('refocus')
})

onMounted(async () => {
  await nextTick()
  searchInputRef.value?.focus?.()
})
</script>

<template>
  <div class="feacn-code-search">
    <div class="search-bar">
      <input
        ref="searchInputRef"
        v-model="searchKey"
        @keyup.enter="performSearch"
        @keydown.esc="closeDropdown"
        @focus="dropdownVisible = false"
        @click="dropdownVisible = false"
        type="text"
        class="input search-input"
        :disabled="searching"
        placeholder="Код ТН ВЭД или слово для поиска"
      />
      <ActionButton
        class="search-button"
        :item="searchKey"
        icon="fa-solid fa-magnifying-glass"
        tooltip-text="Поиск"
        :disabled="searching"
        @click="performSearch"
      />
      <ul v-if="dropdownVisible" class="search-results">
        <li
          v-for="result in searchResults"
          :key="result.id"
          @click="selectSearchResult(result)"
          @mouseenter="checkResultNode(result)"
          class="search-result-item"
          :class="{ unavailable: !result.id || unavailableResultIds.has(result.id) }"
          :aria-disabled="!result.id || unavailableResultIds.has(result.id)"
          :title="!result.id || unavailableResultIds.has(result.id) ? 'Код отсутствует в дереве' : undefined"
        >
          <span class="result-code">{{ result.code }}</span>
          <span class="result-name">{{ result.name }}</span>
        </li>
        <li v-if="searchResults.length === 0 && !searchError" class="no-results">
          Ничего не найдено
        </li>
        <li v-if="searchError" class="search-error">
          Ошибка поиска
        </li>
      </ul>
    </div>
    <div class="tree-container">
      <FeacnCodesTree
        ref="treeRef"
        select-mode
        @select="handleSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.feacn-code-search {
  position: relative;
  padding: 8px;
  background-color: #f5f5f5;
  color: #161616;
  box-shadow: 0px 3px 7px rgba(0, 0, 0, 0.1);
  border: 2px solid #797979;
  border-radius: 0.25rem;
  /* Increase overall search panel height */
  max-height: max(500px, 40vh);
  min-height: 20vh;
  display: flex;
  flex-direction: column;
  font-size: 0.875em;
  min-width: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  position: relative;
  min-width: 0;
}
.search-input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  margin-bottom: 8px;
  border-radius: 0.25rem;
}
.search-bar :deep(.search-button) {
  margin-left: 4px;
  float: none;
  cursor: pointer;
}
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #f5f5f5;
  color: #161616;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--input-border-color);
  border-radius: 0.25rem;
  z-index: 10;
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 320px;
  overflow-y: auto;
}
.tree-container {
  overflow-x: auto;
  overflow-y: auto;
  flex: 1 1 auto;
  min-width: 0;
}
.search-result-item {
  padding: 4px 8px;
  cursor: pointer;
}
.search-result-item:hover {
  background-color: #f0f0f0;
}

.search-result-item.unavailable {
  cursor: not-allowed;
  opacity: 0.65;
}

.search-result-item.unavailable:hover {
  background-color: transparent;
}
.result-code {
  font-family: 'Courier New', monospace;
  margin-right: 8px;
}
.no-results,
.search-error {
  padding: 4px 8px;
  color: #666;
}
</style>
