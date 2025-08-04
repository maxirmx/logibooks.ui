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
defineProps({
  item: { type: Object, required: true },
  displayValue: { type: [String, Number], required: true, default: '' },
  cellClass: { type: String, default: 'clickable-cell' },
  tooltipText: { type: String, default: '' },
  tooltipIcon: { type: String, default: 'fa-solid fa-pen' }
})

defineEmits(['click'])
</script>

<template>
  <v-tooltip>
    <template #activator="{ props }">
      <span
        :class="cellClass"
        v-bind="props"
        @click="$emit('click', item)"
      >
        <slot :item="item" :value="displayValue">
          {{ displayValue }}
        </slot>
      </span>
    </template>
    <template #default>
      <div class="d-flex align-center">
        <font-awesome-icon :icon="tooltipIcon" class="mr-3" />
        <span>{{ tooltipText || displayValue }}</span>
      </div>
    </template>
  </v-tooltip>
</template>
