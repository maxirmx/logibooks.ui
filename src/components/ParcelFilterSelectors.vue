<script setup>
import { computed } from 'vue'

const props = defineProps({
  statusOptions: { type: Array, required: true },
  checkStatusOptionsSw: { type: Array, required: true },
  checkStatusOptionsFc: { type: Array, required: true },
  runningAction: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  isInitializing: { type: Boolean, default: false },
  parcelsStatus: { type: [String, Number, null], default: null },
  parcelsCheckStatusSw: { type: [String, Number, null], default: null },
  parcelsCheckStatusFc: { type: [String, Number, null], default: null },
  localTnvedSearch: { type: String, default: '' },
  localParcelNumberSearch: { type: String, default: '' },
})

const emit = defineEmits([
  'update:parcelsStatus',
  'update:parcelsCheckStatusSw',
  'update:parcelsCheckStatusFc',
  'update:localTnvedSearch',
  'update:localParcelNumberSearch',
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

const localTnvedSearchModel = computed({
  get: () => props.localTnvedSearch,
  set: (value) => emit('update:localTnvedSearch', value),
})

const localParcelNumberSearchModel = computed({
  get: () => props.localParcelNumberSearch,
  set: (value) => emit('update:localParcelNumberSearch', value),
})
</script>

<template>
  <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
    <v-select
      v-model="parcelsStatusModel"
      :items="statusOptions"
      label="Статус"
      density="compact"
      style="min-width: 250px"
      :disabled="disabledState.selectsDisabled"
    />
    <v-select
      v-model="parcelsCheckStatusSwModel"
      :items="checkStatusOptionsSw"
      label="Статус проверки по стоп-словам"
      density="compact"
      style="min-width: 250px"
      :disabled="disabledState.selectsDisabled"
    />

    <v-select
      v-model="parcelsCheckStatusFcModel"
      :items="checkStatusOptionsFc"
      label="Статус проверки по ТН ВЭД"
      density="compact"
      style="min-width: 250px"
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
  </div>
</template>
