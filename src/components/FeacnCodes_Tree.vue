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
import { ref, onMounted, defineComponent, h, resolveComponent } from 'vue'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { mapFeacnCodesToNodes, formatFeacnNodeLabel } from '@/helpers/feacncodes.tree.helpers.js'

defineOptions({ name: 'FeacnCodes_Tree' })

const store = useFeacnCodesStore()
const rootNodes = ref([])

async function loadChildren(target = null) {
  const parentId = target ? target.id : null
  const children = await store.getChildren(parentId)
  const mapped = mapFeacnCodesToNodes(children)
  if (target) {
    target.children = mapped
    target.loaded = true
  } else {
    rootNodes.value = mapped
  }
}

async function toggleNode(node) {
  node.expanded = !node.expanded
  if (node.expanded && !node.loaded) {
    await loadChildren(node)
  }
}

const TreeNode = defineComponent({
  name: 'FeacnCodesTreeNode',
  props: {
    node: { type: Object, required: true }
  },
  setup(props) {
    return () =>
      h('li', [
        (props.node.loaded && props.node.children.length === 0)
          ? h('span', { class: 'toggle-placeholder' })
          : h(
              'span',
              {
                class: 'toggle-icon',
                onClick: () => toggleNode(props.node)
              },
              [
                h(resolveComponent('font-awesome-icon'), {
                  icon: props.node.expanded ? 'fa-solid fa-minus' : 'fa-solid fa-plus'
                })
              ]
            ),
        h(
          'span',
          {
            class: 'node-label',
            onClick: () => toggleNode(props.node)
          },
          formatFeacnNodeLabel(props.node)
        ),
        props.node.expanded && props.node.children.length > 0
          ? h('ul', props.node.children.map(child => h(TreeNode, { node: child, key: child.id })))
          : null
      ])
  }
})

onMounted(() => {
  loadChildren()
})
</script>

<template>
  <ul class="feacn-tree">
    <TreeNode v-for="node in rootNodes" :key="node.id" :node="node" />
  </ul>
</template>

<style scoped>
.feacn-tree {
  list-style-type: none;
  padding-left: 0;
}
.toggle-icon {
  cursor: pointer;
  width: 1em;
  display: inline-block;
}
.toggle-placeholder {
  display: inline-block;
  width: 1em;
}
.node-label {
  cursor: pointer;
  margin-left: 0.25rem;
}
</style>

