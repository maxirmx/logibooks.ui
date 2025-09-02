<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

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

.anti-btn {
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
