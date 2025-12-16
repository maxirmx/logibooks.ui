<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { Field } from 'vee-validate'
import ActionButton from '@/components/ActionButton.vue'
import { ozonRegisterColumnTitles } from '@/helpers/ozon.register.mapping.js'
import { buildNotificationTooltip } from '@/helpers/notification.helpers.js'

const props = defineProps({
  item: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  nme: { type: String, default: 'article' },
  fullWidth: { type: Boolean, default: false }
})

const emit = defineEmits(['approve-notification'])

const showNotificationButton = computed(
  () => props.item?.notificationId !== null && props.item?.notificationId !== undefined
)

const tooltipText = computed(() => buildNotificationTooltip(props.item))

function emitApproveWithNotification() {
  emit('approve-notification')
}
</script>

<template>
  <div :class="fullWidth ? 'form-group-1' : 'form-group'">
    <label :for="nme" :class="fullWidth ? 'label-1' : 'label'">
      {{ ozonRegisterColumnTitles[nme] }}:
    </label>
    <Field
      :name="nme"
      :id="nme"
      type="text"
      :class="[
        'form-control',
        fullWidth ? 'input-1' : 'input',
        { 'is-invalid': errors && errors[nme] }
      ]"
      :disabled="disabled"
    />
    <div v-if="showNotificationButton" class="action-buttons">
      <ActionButton
        :item="item"
        icon="fa-solid fa-h"
        variant="magenta"
        :iconSize="'1x'"
        :tooltip-text="tooltipText"
        :disabled="disabled"
        data-test="approve-notification"
        @click="emitApproveWithNotification"
      />
    </div>
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  gap: 0.25rem;
  background: #ffffff;
  border: 1px solid #74777c;
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
