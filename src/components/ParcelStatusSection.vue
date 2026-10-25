<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { Field } from 'vee-validate'
import { computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSkullCrossbones, faCircle } from '@fortawesome/free-solid-svg-icons'
import { isDangerousGoodsVisible } from '@/helpers/parcel.dangerous.goods.helpers.js'
import ActionButton from '@/components/ActionButton.vue'
import { CheckStatusCode } from '@/helpers/check.status.code.js'

const props = defineProps({
  theOtherCountryCode: { type: [Number, String], default: null },
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
  },
  clearCheckStatusDisabled: {
    type: Boolean,
    default: false
  },
  approvalDisabled: {
    type: Boolean,
    default: false
  },
  noHistoricData: {
    type: Boolean,
    default: false
  },
  restrictionValidationDisabled: {
    type: Boolean,
    default: false
  }
})

const showDangerousGoods = computed(() => isDangerousGoodsVisible(props.theOtherCountryCode))
const statusTitle = computed(() =>
  props.parcelStatuses.find(status => Number(status.id) === Number(props.values.statusId))?.title ?? ''
)

const restrictionValidationTooltip = computed(() =>
  props.restrictionValidationDisabled
    ? 'Сначала укажите страну отправления или назначения реестра'
    : null
)

const hasDuplicate2CheckStatus = computed(() => props.item?.checkStatus === CheckStatusCode.Duplicate2.value)

const checkStatusInfoClass = computed(() => [
  'form-group',
  hasDuplicate2CheckStatus.value
    ? 'stopwords-info-duplicate2'
    : props.hasCheckStatusIssues
      ? 'stopwords-info'
      : 'stopwords-info-approved'
])

const checkStatusInfoTextClass = computed(() => (
  hasDuplicate2CheckStatus.value
    ? 'stopwords-text-duplicate2'
    : props.hasCheckStatusIssues
      ? 'stopwords-text'
      : 'stopwords-text-approved'
))

defineEmits([
  'validate-sw',
  'validate-sw-ex',
  'validate-fc',
  'approve',
  'approve-excise',
  'clear-check-status',
  'check-for-duplicate'
])
</script>

<template>
  <div class="form-section parcel-status-section">
    <div class="form-row">
      <div class="status-controls-container">
        <div class="status-controls">
          <div class="form-group status-selection-group">
            <label for="statusId" class="label">Статус:</label>
            <Field
              as="select"
              name="statusId"
              id="statusId"
              class="form-control input"
              :disabled="disabled"
              :title="statusTitle"
            >
              <option v-for="status in parcelStatuses" :key="status.id" :value="status.id">{{ status.title }}</option>
            </Field>
          </div>
          <div v-if="showDangerousGoods" class="form-group dangerous-goods-group">
            <v-tooltip text="Опасный груз" location="top">
              <template #activator="{ props: tooltipProps }">
                <div
                  class="dangerous-goods-control"
                  v-bind="disabled ? tooltipProps : {}"
                  :tabindex="disabled ? 0 : undefined"
                  :aria-label="disabled ? 'Опасный груз' : undefined"
                  :aria-disabled="disabled ? 'true' : undefined"
                >
                  <Field name="dangerousGoods" keep-value v-slot="{ value, handleChange, handleBlur }">
                    <v-switch
                      v-bind="disabled ? {} : tooltipProps"
                      id="dangerousGoods"
                      name="dangerousGoods"
                      class="dangerous-goods-switch"
                      aria-label="Опасный груз"
                      role="switch"
                      :model-value="value === true"
                      :disabled="disabled"
                      density="compact"
                      color="primary"
                      hide-details
                      @update:model-value="handleChange"
                      @blur="handleBlur"
                    >
                      <template #thumb>
                        <FontAwesomeIcon
                          :icon="value === true ? faSkullCrossbones : faCircle"
                          :class="{ 'dangerous-goods-safe-icon': value !== true }"
                          aria-hidden="true"
                        />
                      </template>
                    </v-switch>
                  </Field>
                </div>
              </template>
            </v-tooltip>
          </div>
        </div>
      </div>
      <div class="form-group check-status-actions">
        <div class="readonly-field status-cell" :class="getCheckStatusClass(item?.checkStatus)" name="checkStatus" id="checkStatus">
          <font-awesome-icon
            class="bookmark-icon"
            icon="fa-solid fa-bookmark"
            v-if="CheckStatusCode.isInheritedSw(item?.checkStatus)"
          />
          {{ new CheckStatusCode(item?.checkStatus).toString() }}
        </div>
        <div class="header-actions-bar check-status-toolbar">
          <div class="header-actions header-actions-group">
            <ActionButton
              :item="item"
              icon="fa-solid fa-spell-check"
              :tooltip-text="restrictionValidationTooltip || 'Сохранить и проверить по стоп-словам'"
              :disabled="disabled || restrictionValidationDisabled"
              @click="$emit('validate-sw', values)"
              :iconSize="'2x'"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-book-journal-whills"
              :tooltip-text="restrictionValidationTooltip || 'Сохранить и проверить по стоп-словам с учётом исторических данных'"
              :disabled="disabled || noHistoricData || restrictionValidationDisabled"
              @click="$emit('validate-sw-ex', values)"
              :iconSize="'2x'"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-anchor-circle-check"
              :tooltip-text="restrictionValidationTooltip || 'Сохранить и проверить по кодам ТН ВЭД'"
              :disabled="disabled || restrictionValidationDisabled"
              @click="$emit('validate-fc', values)"
              :iconSize="'2x'"
            />
          </div>
          <div class="header-actions header-actions-group">
            <ActionButton
              :item="item"
              icon="fa-solid fa-broom"
              tooltip-text="Очистить статус"
              :disabled="clearCheckStatusDisabled"
              @click="$emit('clear-check-status', values)"
              :iconSize="'2x'"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-clone"
              tooltip-text="Проверить на дубликат"
              :disabled="disabled"
              @click="$emit('check-for-duplicate', values)"
              :iconSize="'2x'"
            />
          </div>
          <div class="header-actions header-actions-group">
            <ActionButton
              :item="item"
              icon="fa-solid fa-check-circle"
              tooltip-text="Сохранить и согласовать"
              :disabled="disabled || approvalDisabled"
              @click="$emit('approve', values)"
              variant="green"
              :iconSize="'2x'"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-check-circle"
              tooltip-text="Сохранить и согласовать с акцизом"
              :disabled="disabled || approvalDisabled"
              @click="$emit('approve-excise', values)"
              variant="orange"
              :iconSize="'2x'"
            />
          </div>
        </div>
      </div>
      <div class="form-group">
        <span class="label">Последний просмотр:</span>
        <div class="readonly-field" id="lastView" name="lastView">
          {{ item?.dTime ? new Date(item.dTime).toLocaleString() : '' }}
        </div>
      </div>
      <div
        v-if="checkStatusInfo"
        :class="checkStatusInfoClass"
      >
        <div :class="checkStatusInfoTextClass">
          {{ checkStatusInfo }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.parcel-status-section .form-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.status-selection-group,
.dangerous-goods-group {
  overflow: visible;
}

.status-controls-container {
  align-self: center;
  min-width: 0;
}

.status-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.status-selection-group {
  flex: 1 1 0;
}

.dangerous-goods-group {
  flex: 0 0 auto;
}

.status-selection-group .input {
  flex: 1 1 0;
  width: auto;
  min-width: 0;
  text-overflow: ellipsis;
}

.dangerous-goods-control {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  min-width: 0;
}

.dangerous-goods-safe-icon {
  color: #2e7d32;
}

.parcel-status-section .check-status-actions {
  flex-wrap: wrap;
  overflow: visible;
}

.check-status-actions .status-cell {
  flex: 1 1 12rem;
  min-width: 0;
  max-width: 100%;
  height: auto;
  white-space: normal;
  overflow-wrap: anywhere;
}

.check-status-toolbar {
  flex: 0 1 auto;
  width: max-content;
  margin-inline-start: auto;
}

.parcel-status-section .stopwords-info,
.parcel-status-section .stopwords-info-approved,
.parcel-status-section .stopwords-info-duplicate2 {
  overflow: visible;
  overflow-wrap: anywhere;
}

.parcel-status-section .stopwords-text,
.parcel-status-section .stopwords-text-approved,
.parcel-status-section .stopwords-text-duplicate2 {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

@media (max-width: 768px) {
  .parcel-status-section .form-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .parcel-status-section .stopwords-info,
  .parcel-status-section .stopwords-info-approved,
  .parcel-status-section .stopwords-info-duplicate2 {
    grid-column: 1;
  }
}

</style>
