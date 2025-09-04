<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

defineOptions({ name: 'FeacnCodesTreeNode' })

const props = defineProps({
  node: { type: Object, required: true },
  disabled: {
    type: Boolean,
    default: false
  },
  selectMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle', 'select'])

function handleClick() {
  // Don't allow interactions when disabled or loading
  if (props.disabled || props.node.loading) {
    return
  }

  if (isLeafNode(props.node)) {
    if (props.selectMode) {
      emit('select', props.node)
    }
    return
  }

  emit('toggle', props.node)
}

function isLeafNode(node) {
  // Check if node has code length exactly 10 and last character is a digit
  return node.code && 
         node.code.length === 10 && 
         /\d$/.test(node.code)
}
</script>

<template>
  <li class="tree-node" :data-node-id="node.id">
    <div class="node-layout">
      <!-- Code display - clickable for non-leaf nodes or selectable leaf nodes -->
      <div
        class="node-code"
        :class="{
          'clickable': (selectMode || !isLeafNode(node)) && !disabled,
          'disabled': disabled
        }"
        @click="!disabled ? handleClick() : null"
      >
        {{ node.codeEx }}
      </div>
      
      <!-- Content area with proper indentation -->
      <div class="node-content">
        <!-- Show circle icon for leaf nodes (code length 10 and ends with digit) -->
        <span 
          v-if="isLeafNode(node)"
          class="leaf-icon"
        >
          <font-awesome-icon icon="fa-solid fa-check" />
        </span>
        <!-- Show placeholder when node is loaded and confirmed to have no children -->
        <span 
          v-else-if="node.loaded && node.children.length === 0" 
          class="toggle-placeholder"
        />
        <!-- Show loading spinner when loading -->
        <span 
          v-else-if="node.loading"
          class="toggle-loading"
        >
          <font-awesome-icon icon="fa-solid fa-spinner" spin />
        </span>
        <!-- Show plus/minus icon for expandable nodes -->
        <span
          v-else
          class="toggle-icon"
          :class="{ 'disabled': disabled }"
          @click="!disabled ? handleClick() : null"
        >
          <font-awesome-icon
            :icon="node.expanded ? 'fa-solid fa-minus' : 'fa-solid fa-plus'"
          />
        </span>
        
        <span
          class="node-label"
          :class="{
            'loading': node.loading,
            'clickable': (selectMode || !isLeafNode(node)) && !disabled,
            'disabled': disabled
          }"
          @click="!disabled ? handleClick() : null"
        >
          {{ node.name }}
        </span>
      </div>
    </div>

    <ul v-if="node.expanded && node.children.length > 0" class="child-nodes">
      <FeacnCodesTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :disabled="disabled"
        :select-mode="selectMode"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
      />
    </ul>
  </li>
</template>

<style scoped>
.tree-node {
  margin: 0;
  list-style: none;
}

.node-layout {
  display: flex;
  align-items: center;
  min-height: 1.5rem;
}

.node-code {
  position: absolute;
  left: 0;
  width: 160px; /* Adjust this width based on your codeEx length */
  padding-left: 8px;
  padding-right: 8px;
  font-family: 'Courier New', monospace;
  text-align: left;
  background-color: #f0f0f0;
  color: #161616;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--input-border-color);
  border-radius: 0.25rem;
  flex-shrink: 0;
  cursor: default; /* Default cursor for leaf nodes */
}

.node-code.clickable {
  cursor: pointer; /* Pointer cursor for interactive nodes */
}

.node-code.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.node-content {
  margin-left: 50px; 
  display: flex;
  align-items: center;
  padding: 0;
  flex: 1;
}

.toggle-icon {
  cursor: pointer;
  width: 1.2em;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  color: #666;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.toggle-icon:hover {
  color: #333;
}

.toggle-icon.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.toggle-placeholder, .toggle-loading {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 1.2em;
  font-size: 0.875rem;
  color: #999;
}

.leaf-icon {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 1.2em;
  font-size: 0.875rem;
  color: #666;
}

.node-label {
  cursor: default; /* Default cursor for non-interactive nodes */
  margin-left: 0.5rem;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s ease;
}

.node-label.clickable {
  cursor: pointer; /* Pointer cursor for interactive nodes */
}

.node-label.clickable:hover {
  background-color: #f5f5f5;
}

.node-label.loading {
  opacity: 0.6;
  cursor: wait;
}

.node-label.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.child-nodes {
  list-style-type: none;
  padding-left: 1.5rem;
  margin: 0;
  border-left: 2px solid #d0d0d0;
  margin-left: calc(50px + 0.5em); 
}
</style>
