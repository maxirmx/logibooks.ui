<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

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

// Expose methods and state to parent component
defineExpose({
  loadChildren,
  rootNodes
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
  padding-left: 130px;
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

