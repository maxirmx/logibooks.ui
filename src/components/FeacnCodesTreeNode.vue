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
import { formatFeacnNodeLabel } from '@/helpers/feacncodes.tree.helpers.js'

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
  <li>
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
      {{ formatFeacnNodeLabel(node) }}
    </span>
    
    <ul v-if="node.expanded && node.children.length > 0">
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
.toggle-icon {
  cursor: pointer;
  width: 1em;
  display: inline-block;
}

.toggle-placeholder, .toggle-loading {
  display: inline-block;
  width: 1em;
}

.node-label {
  cursor: pointer;
  margin-left: 0.25rem;
}

.node-label.loading {
  opacity: 0.6;
  cursor: wait;
}
</style>
