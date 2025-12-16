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
  name: { type: String, default: 'article' },
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
    <label :for="name" :class="fullWidth ? 'label-1' : 'label'">
      {{ ozonRegisterColumnTitles[name] }}:
    </label>
    <div class="article-input-wrapper">
      <div class="article-field">
        <Field
          :name="name"
          :id="name"
          type="text"
          :class="[
            'form-control',
            fullWidth ? 'input-1' : 'input',
            { 'is-invalid': errors && errors[name] }
          ]"
          :disabled="disabled"
        />
      </div>
      <div v-if="showNotificationButton" class="notification-action">
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
  </div>
</template>

<style scoped>
.article-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.article-field {
  flex: 1;
  min-width: 0;
}

.article-field :deep(.form-control) {
  width: 100%;
}

.notification-action {
  display: flex;
  margin-left: auto;
  flex-shrink: 0;
  background: #ffffff;
  border: 1px solid #74777c;
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
