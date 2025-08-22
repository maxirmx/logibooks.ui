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
import { ref, onMounted } from 'vue'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { mapFeacnCodesToNodes } from '@/helpers/feacncodes.tree.helpers.js'
import FeacnCodesTreeNode from '@/components/FeacnCodesTreeNode.vue'

defineOptions({ name: 'FeacnCodesTree' })

const { disabled = false, selectMode = false } = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  selectMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

const store = useFeacnCodesStore()
const rootNodes = ref([])
const isLoading = ref(false)

async function loadChildren(target = null) {
  // Don't load if disabled or already loading
  if (disabled || (target && target.loading)) {
    return
  }
  
  // Set loading state
  if (target) {
    target.loading = true
  } else {
    isLoading.value = true
  }
  
  try {
    const parentId = target ? target.id : null
    const children = await store.getChildren(parentId)
    const mapped = mapFeacnCodesToNodes(children)
    
    if (target) {
      target.children = mapped
      target.loaded = true
    } else {
      rootNodes.value = mapped
    }
  } catch (error) {
    console.error('Failed to load children:', error)
    // Optionally show error state
  } finally {
    // Clear loading state
    if (target) {
      target.loading = false
    } else {
      isLoading.value = false
    }
  }
}

async function toggleNode(node) {
  // Prevent toggling while disabled or loading
  if (disabled || node.loading) {
    return
  }
  
  node.expanded = !node.expanded
  if (node.expanded && !node.loaded) {
    await loadChildren(node)
  }
}

function handleSelect(node) {
  emit('select', node.code)
}

onMounted(() => {
  if (!disabled) {
    loadChildren()
  }
})

// Expose loadChildren method to parent component
defineExpose({
  loadChildren
})
</script>

<template>
  <div v-if="isLoading && !disabled" class="loading-indicator">
    <font-awesome-icon icon="fa-solid fa-spinner" spin />
    Загрузка дерева...
  </div>
  <div v-else class="tree-container">
    <ul class="feacn-tree">
      <FeacnCodesTreeNode
        v-for="node in rootNodes"
        :key="node.id"
        :node="node"
        :disabled="disabled"
        :select-mode="selectMode"
        @toggle="toggleNode"
        @select="handleSelect"
      />
    </ul>
  </div>
</template>

<style scoped>
.tree-container {
  position: relative;
  padding-left: 130px; /* Match the code column width exactly */
}

.feacn-tree {
  list-style-type: none;
  padding-left: 0;
  margin: 0;
}

.loading-indicator {
  padding: 1rem;
  text-align: center;
  color: #666;
}
</style>

