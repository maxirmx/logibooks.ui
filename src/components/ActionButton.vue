<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

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
        :class="['anti-btn', { 
          'disabled-btn': disabled, 
          'anti-btn-orange': variant === 'orange', 
          'anti-btn-green': variant === 'green', 
          'anti-btn-red': variant === 'red', 
          'anti-btn-blue': variant === 'blue' 
          }, 
          $attrs.class]"
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
  margin-left: 1px;
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

.anti-btn-red {
  color: #d3223f !important;
}

.anti-btn-red:hover {
  color: #e34b5f !important;
  transform: scale(1.2);
  transition: all 0.2s ease-in-out;
}

.anti-btn-red .button-o-c {
  color: #d3223f !important;
}

.anti-btn-red:hover .button-o-c {
  color: #e34b5f !important;
}

.anti-btn-blue {
  color: #1976d2 !important;
}

.anti-btn-blue:hover {
  color: #2196f3 !important;
  transform: scale(1.2);
  transition: all 0.2s ease-in-out;
}

.anti-btn-blue .button-o-c {
  color: #1976d2 !important;
}

.anti-btn-blue:hover .button-o-c {
  color: #2196f3 !important;
}
</style>
