<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of the Logibooks ui application 

import { computed } from 'vue'
import { Field } from 'vee-validate'
import ActionButton from '@/components/ActionButton.vue'
import { ozonRegisterColumnTitles } from '@/helpers/ozon.register.mapping.js'

const props = defineProps({
  name: { type: String, required: true },
  errors: { type: Object, default: () => ({}) },
  item: { type: Object, required: true },
  notification: { type: Object, default: null },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['approve-notification'])

// Get label text
const labelText = computed(() => {
  return ozonRegisterColumnTitles[props.name] || props.name
})

// Show button only if item has notificationId
const showButton = computed(() => {
  return props.item && props.item.notificationId != null
})

// Build tooltip text with notification details
const tooltipText = computed(() => {
  if (!props.notification) {
    return 'Согласовать с нотификацией'
  }
  
  const parts = []
  
  if (props.notification.number) {
    parts.push('Номер: ' + props.notification.number)
  }
  
  if (props.notification.registrationDate) {
    const regDate = formatDate(props.notification.registrationDate)
    if (regDate) parts.push('Дата регистрации: ' + regDate)
  }
  
  if (props.notification.publicationDate) {
    const pubDate = formatDate(props.notification.publicationDate)
    if (pubDate) parts.push('Дата публикации: ' + pubDate)
  }
  
  if (props.notification.terminationDate) {
    const termDate = formatDate(props.notification.terminationDate)
    if (termDate) parts.push('Срок действия: ' + termDate)
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Согласовать с нотификацией'
})

// Build input class
const inputClass = computed(() => {
  const classes = ['form-control', 'input', 'article-input']
  if (props.errors && props.errors[props.name]) {
    classes.push('is-invalid')
  }
  return classes
})

function formatDate(value) {
  if (!value) return ''
  
  if (value instanceof Date) {
    return value.toLocaleDateString('ru-RU')
  }
  
  if (typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('ru-RU')
    }
    return value
  }
  
  if (typeof value === 'object' && value.year && value.month && value.day) {
    const date = new Date(value.year, value.month - 1, value.day)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('ru-RU')
    }
  }
  
  return ''
}

function handleButtonClick() {
  emit('approve-notification')
}
</script>

<template>
  <div class="form-group article-with-h">
    <label :for="name" class="label">
      {{ labelText }}:
    </label>
    <div class="article-with-h-container">
      <Field 
        :name="name" 
        :id="name" 
        type="text"
        :class="inputClass"
      />
      <ActionButton
        v-if="showButton"
        :item="item"
        icon="fa-solid fa-h"
        :tooltip-text="tooltipText"
        variant="magenta"
        :iconSize="'2x'"
        :disabled="disabled"
        @click="handleButtonClick"
        class="article-h-button"
      />
    </div>
  </div>
</template>

<style scoped>
.article-with-h {
  display: flex;
  flex-direction: column;
}

.article-with-h-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.article-input {
  flex: 1;
}

.article-h-button {
  flex-shrink: 0;
}
</style>
