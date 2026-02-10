<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { Field } from 'vee-validate'
import ActionButton from '@/components/ActionButton.vue'
import { CheckStatusCode } from '@/helpers/check.status.code.js'

defineProps({
  item: {
    type: Object,
    required: true
  },
  values: {
    type: Object,
    required: true
  },
  parcelStatuses: {
    type: Array,
    required: true
  },
  getCheckStatusClass: {
    type: Function,
    required: true
  },
  checkStatusInfo: {
    type: String,
    default: ''
  },
  hasCheckStatusIssues: {
    type: Boolean,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['validate-sw', 'validate-sw-ex', 'validate-fc', 'approve', 'approve-excise'])
</script>

<template>
  <div class="form-section">
    <div class="form-row">
      <div class="form-group">
        <label for="statusId" class="label">Статус:</label>
        <Field
          as="select"
          name="statusId"
          id="statusId"
          class="form-control input"
        >
          <option v-for="status in parcelStatuses" :key="status.id" :value="status.id">{{ status.title }}</option>
        </Field>
      </div>
      <div class="form-group">
        <div class="readonly-field status-cell" :class="getCheckStatusClass(item?.checkStatus)" name="checkStatus" id="checkStatus">
          <font-awesome-icon
            class="bookmark-icon"
            icon="fa-solid fa-bookmark"
            v-if="CheckStatusCode.isInheritedSw(item?.checkStatus)"
          />
          {{ new CheckStatusCode(item?.checkStatus).toString() }}
        </div>
        <div class="action-buttons">
          <ActionButton
            :item="item"
            icon="fa-solid fa-spell-check"
            tooltip-text="Сохранить и проверить стоп слова"
            :disabled="disabled"
            @click="$emit('validate-sw', values)"
            :iconSize="'2x'"
          />
          <ActionButton
            :item="item"
            icon="fa-solid fa-book-journal-whills"
            tooltip-text="Сохранить и проверить стоп слова с учётом исторических данных"
            :disabled="disabled"
            @click="$emit('validate-sw-ex', values)"
            :iconSize="'2x'"
          />
          <ActionButton
            :item="item"
            icon="fa-solid fa-anchor-circle-check"
            tooltip-text="Сохранить и проверить коды ТН ВЭД"
            :disabled="disabled"
            @click="$emit('validate-fc', values)"
            :iconSize="'2x'"
          />
        </div>
        <div class="action-buttons">
          <ActionButton
            :item="item"
            icon="fa-solid fa-check-circle"
            tooltip-text="Сохранить и согласовать"
            :disabled="disabled"
            @click="$emit('approve', values)"
            variant="green"
            :iconSize="'2x'"
          />
          <ActionButton
            :item="item"
            icon="fa-solid fa-check-circle"
            tooltip-text="Сохранить и согласовать с акцизом"
            :disabled="disabled"
            @click="$emit('approve-excise', values)"
            variant="orange"
            :iconSize="'2x'"
          />
        </div>
      </div>
      <div class="form-group">
        <label for="lastView" class="label">Последний просмотр:</label>
        <div class="readonly-field" id="lastView" name="lastView">
          {{ item?.dTime ? new Date(item.dTime).toLocaleString() : '' }}
        </div>
      </div>
      <div
        v-if="checkStatusInfo"
        :class="['form-group', hasCheckStatusIssues ? 'stopwords-info' : 'stopwords-info-approved']"
      >
        <div :class="hasCheckStatusIssues ? 'stopwords-text' : 'stopwords-text-approved'">
          {{ checkStatusInfo }}
        </div>
      </div>
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
