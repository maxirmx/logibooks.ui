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
      <ActionButton
        v-if="showNotificationButton"
        :item="item"
        icon="fa-solid fa-h"
        variant="magenta"
        :icon-size="'2x'"
        :tooltip-text="tooltipText"
        :disabled="disabled"
        data-test="approve-notification"
        @click="emitApproveWithNotification"
      />
    </div>
  </div>
</template>

<style scoped>
.article-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.article-input-wrapper :deep(.form-control) {
  flex: 1;
}
</style>
