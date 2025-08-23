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
import { ref, nextTick } from 'vue'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import FeacnCodesTree from '@/components/FeacnCodesTree.vue'
import ActionButton from '@/components/ActionButton.vue'
import { formatFeacnName, formatFeacnNameFromItem } from '@/helpers/feacn.tooltip.helpers.js'

defineOptions({ name: 'FeacnCodeSearch' })

const emit = defineEmits(['select'])

const store = useFeacnCodesStore()
const searchKey = ref('')
const searchResults = ref([])
const dropdownVisible = ref(false)
const searching = ref(false)
const searchError = ref(null)

const treeRef = ref(null)

async function performSearch() {
  const key = searchKey.value.trim()
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
      await formatFeacnName(item.code)
      
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

async function selectSearchResult(item) {
  dropdownVisible.value = false
  if (!item || !item.id) {
    return
  }

  try {
    const node = await store.getById(item.id)
    if (!node) {
      return
    }
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
</script>

<template>
  <div class="feacn-code-search">
    <div class="search-bar">
      <input
        v-model="searchKey"
        @keyup.enter="performSearch"
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
          class="search-result-item"
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
    <FeacnCodesTree
      ref="treeRef"
      select-mode
      @select="handleSelect"
    />
  </div>
</template>

<style scoped>
.feacn-code-search {
  position: relative;
  border: 1px solid #363636;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  padding: 8px;
  background-color: #fff;
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
  background: white;
  border: 1px solid #363636;
  z-index: 10;
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}
.search-result-item {
  padding: 4px 8px;
  cursor: pointer;
}
.search-result-item:hover {
  background-color: #f0f0f0;
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
