<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, useAttrs } from 'vue'
import { actionButtonProps, buildActionButtonClasses } from './actionButtonShared'

const props = defineProps(actionButtonProps)
const emit = defineEmits(['click'])
const attrs = useAttrs()

const buttonClasses = computed(() => buildActionButtonClasses(props, attrs))
const forwardedAttrs = computed(() => {
  const rest = { ...attrs }
  // remove 'class' from forwarded attrs to avoid duplicating class binding
  delete rest.class
  return rest
})
</script>
<template>
  <v-tooltip open-delay="300" :disabled="props.disabled">
    <template #activator="{ props: activatorProps }">
      <button
        type="button"
        @click="emit('click', props.item)"
        :class="buttonClasses"
        v-bind="{ ...activatorProps, ...forwardedAttrs }"
        :disabled="props.disabled"
      >
        <font-awesome-icon :size="props.iconSize" :icon="props.icon"  class="button-o-c"/>
      </button>
    </template>
    <template #default>
      <div style="white-space: pre-line">{{ props.tooltipText }}</div>
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

.anti-btn-magenta {
  color: #a918c2 !important;
}

.anti-btn-magenta:hover {
  color: #d94bdc !important;
  transform: scale(1.2);
  transition: all 0.2s ease-in-out;
}

.anti-btn-magenta .button-o-c {
  color: #a918c2 !important;
}

.anti-btn-magenta:hover .button-o-c {
  color: #d94bdc !important;
}

</style>
