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
  item: { required: true },
  icon: { type: String, required: true },
  tooltipText: { type: String, required: true },
  iconSize: { type: String, default: '1x' },
  disabled: { type: Boolean, default: false },
  variant: { type: String, default: 'default' }
})

defineEmits(['click'])
</script>
<template>
  <v-tooltip :text="tooltipText" :disabled="disabled">
    <template v-slot:activator="{ props }">
      <button 
        type="button" 
        @click="$emit('click', item)" 
        :class="['anti-btn', { 'disabled-btn': disabled, 'anti-btn-orange': variant === 'orange', 'anti-btn-green': variant === 'green' }, $attrs.class]"
        v-bind="props"
        :disabled="disabled"
      >
        <font-awesome-icon :size="iconSize" :icon="icon"  class="button-o-c"/>
      </button>
    </template>
  </v-tooltip>
</template>

<style scoped>

anti-btn {
  float: right;
  margin-left: 0.5rem;
  text-decoration: none;
  color: rgb(75, 75, 75);
  transition: 0.4s;
}

.anti-btn:hover {
  color: #1976d2;
  transform: scale(1.2);
  transition: all 0.2s ease-in-out;
}


.anti-btn:focus {
  border: none;
  outline: none;
}

.anti-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.anti-btn-orange {
  color: #ff6b35 !important;
}

.anti-btn-orange:hover {
  color: #ff8c42 !important;
  transform: scale(1.2);
  transition: all 0.2s ease-in-out;
}

.anti-btn-orange .button-o-c {
  color: #ff6b35 !important;
}

.anti-btn-orange:hover .button-o-c {
  color: #ff8c42 !important;
}

.anti-btn-green {
  color: #4caf50 !important;
}

.anti-btn-green:hover {
  color: #66bb6a !important;
  transform: scale(1.2);
  transition: all 0.2s ease-in-out;
}

.anti-btn-green .button-o-c {
  color: #4caf50 !important;
}

.anti-btn-green:hover .button-o-c {
  color: #66bb6a !important;
}


</style>
