<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  statusOptions: { type: Array, required: true },
  checkStatusOptionsSw: { type: Array, required: true },
  checkStatusOptionsFc: { type: Array, required: true },
  passportCheckStatusOptions: { type: Array, default: () => [] },
  showPassportCheckStatus: { type: Boolean, default: false },
  runningAction: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  isInitializing: { type: Boolean, default: false },
  parcelsStatus: { type: [String, Number], default: null },
  parcelsCheckStatusSw: { type: [String, Number], default: null },
  parcelsCheckStatusFc: { type: [String, Number], default: null },
  parcelsPassportCheckStatus: { type: [String, Number], default: null },
  parcelsHideLegacyRestrictions: { type: Boolean, default: false },
  localTnvedSearch: { type: String, default: '' },
  localParcelNumberSearch: { type: String, default: '' },
  localProductNameSearch: { type: String, default: '' },
})

const emit = defineEmits([
  'update:parcelsStatus',
  'update:parcelsCheckStatusSw',
  'update:parcelsCheckStatusFc',
  'update:parcelsPassportCheckStatus',
  'update:parcelsHideLegacyRestrictions',
  'update:localTnvedSearch',
  'update:localParcelNumberSearch',
  'update:localProductNameSearch',
])

const disabledState = computed(() => {
  const isActionRunning = Boolean(props.runningAction)
  const isLoading = Boolean(props.loading)
  const isInit = Boolean(props.isInitializing)

  return {
    selectsDisabled: isActionRunning || isLoading || isInit,
    textFieldsDisabled: isActionRunning || isInit,
  }
})

const parcelsStatusModel = computed({
  get: () => props.parcelsStatus,
  set: (value) => emit('update:parcelsStatus', value),
})

const parcelsCheckStatusSwModel = computed({
  get: () => props.parcelsCheckStatusSw,
  set: (value) => emit('update:parcelsCheckStatusSw', value),
})

const parcelsCheckStatusFcModel = computed({
  get: () => props.parcelsCheckStatusFc,
  set: (value) => emit('update:parcelsCheckStatusFc', value),
})

const parcelsPassportCheckStatusModel = computed({
  get: () => props.parcelsPassportCheckStatus,
  set: (value) => emit('update:parcelsPassportCheckStatus', value),
})

function clearHiddenPassportCheckStatus() {
  if (
    !props.showPassportCheckStatus &&
    !props.isInitializing &&
    props.parcelsPassportCheckStatus !== null &&
    props.parcelsPassportCheckStatus !== undefined
  ) {
    emit('update:parcelsPassportCheckStatus', null)
  }
}

watch(
  () => [props.showPassportCheckStatus, props.isInitializing, props.parcelsPassportCheckStatus],
  clearHiddenPassportCheckStatus,
  { immediate: true }
)

const parcelsHideLegacyRestrictionsOptions = [
  { title: 'Показать', value: false },
  { title: 'Скрыть', value: true },
]

function normalizeLegacyRestrictionsValue(value) {
  if (value && typeof value === 'object' && 'value' in value) {
    return normalizeLegacyRestrictionsValue(value.value)
  }

  return value === true || value === 'true'
}

const parcelsHideLegacyRestrictionsModel = computed({
  get: () => normalizeLegacyRestrictionsValue(props.parcelsHideLegacyRestrictions),
  set: (value) => emit('update:parcelsHideLegacyRestrictions', normalizeLegacyRestrictionsValue(value)),
})

const localTnvedSearchModel = computed({
  get: () => props.localTnvedSearch,
  set: (value) => emit('update:localTnvedSearch', value),
})

const localParcelNumberSearchModel = computed({
  get: () => props.localParcelNumberSearch,
  set: (value) => emit('update:localParcelNumberSearch', value),
})

const localProductNameSearchModel = computed({
  get: () => props.localProductNameSearch,
  set: (value) => emit('update:localProductNameSearch', value),
})
</script>

<template>
  <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
    <v-select
      v-model="parcelsStatusModel"
      :items="statusOptions"
      item-title="title"
      item-value="value"
      label="Статус"
      density="compact"
      style="min-width: 250px"
      :disabled="disabledState.selectsDisabled"
    />
    <v-select
      v-model="parcelsCheckStatusSwModel"
      :items="checkStatusOptionsSw"
      item-title="title"
      item-value="value"
      label="Статус проверки по стоп-словам"
      density="compact"
      style="min-width: 250px"
      :disabled="disabledState.selectsDisabled"
    />

    <v-select
      v-model="parcelsCheckStatusFcModel"
      :items="checkStatusOptionsFc"
      item-title="title"
      item-value="value"
      label="Статус проверки по ТН ВЭД"
      density="compact"
      style="min-width: 250px"
      :disabled="disabledState.selectsDisabled"
    />
    <v-select
      v-if="showPassportCheckStatus"
      v-model="parcelsPassportCheckStatusModel"
      :items="passportCheckStatusOptions"
      item-title="title"
      item-value="value"
      label="Статус проверки паспорта"
      density="compact"
      style="min-width: 250px"
      :disabled="disabledState.selectsDisabled"
    />
    <v-select
      v-model="parcelsHideLegacyRestrictionsModel"
      :items="parcelsHideLegacyRestrictionsOptions"
      item-title="title"
      item-value="value"
      label="Применённые запреты"
      density="compact"
      style="min-width: 200px"
      :disabled="disabledState.selectsDisabled"
    />
    <v-text-field
      v-model="localTnvedSearchModel"
      label="ТН ВЭД"
      density="compact"
      style="min-width: 200px;"
      :disabled="disabledState.textFieldsDisabled"
    />
    <v-text-field
      v-model="localParcelNumberSearchModel"
      label="Номер посылки"
      density="compact"
      style="min-width: 200px;"
      :disabled="disabledState.textFieldsDisabled"
    />
    <v-text-field
      v-model="localProductNameSearchModel"
      label="Товар"
      density="compact"
      style="min-width: 220px;"
      :disabled="disabledState.textFieldsDisabled"
    />
  </div>
</template>
