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
defineOptions({ name: 'FeacnCodesTreeNode' })

const props = defineProps({
  node: { type: Object, required: true }
})

const emit = defineEmits(['toggle'])

function handleToggle() {
  // Don't allow toggling when loading
  if (props.node.loading) {
    return
  }
  emit('toggle', props.node)
}
</script>

<template>
  <li class="tree-node">
    <div class="node-layout">
      <!-- Code display - always at left border -->
      <div class="node-code">
        {{ node.codeEx }}
      </div>
      
      <!-- Content area with proper indentation -->
      <div class="node-content">
        <span 
          v-if="node.loaded && node.children.length === 0" 
          class="toggle-placeholder"
        />
        <span 
          v-else-if="node.loading"
          class="toggle-loading"
        >
          <font-awesome-icon icon="fa-solid fa-spinner" spin />
        </span>
        <span 
          v-else
          class="toggle-icon"
          @click="handleToggle"
        >
          <font-awesome-icon 
            :icon="node.expanded ? 'fa-solid fa-minus' : 'fa-solid fa-plus'" 
          />
        </span>
        
        <span 
          class="node-label" 
          :class="{ 'loading': node.loading }"
          @click="handleToggle"
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
        @toggle="$emit('toggle', $event)"
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
  width: 130px; /* Adjust this width based on your codeEx length */
  padding-right: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #666;
  text-align: right;
  background-color: #f8f9fa;
  border-right: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.node-content {
  margin-left: 140px; /* Should be node-code width + gap */
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

.toggle-placeholder, .toggle-loading {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 1.2em;
  font-size: 0.875rem;
  color: #999;
}

.node-label {
  cursor: pointer;
  margin-left: 0.5rem;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s ease;
}

.node-label:hover {
  background-color: #f5f5f5;
}

.node-label.loading {
  opacity: 0.6;
  cursor: wait;
}

.child-nodes {
  list-style-type: none;
  padding-left: 1.5rem;
  margin: 0;
  border-left: 1px solid #e0e0e0;
  margin-left: 0.6rem;
}
</style>
