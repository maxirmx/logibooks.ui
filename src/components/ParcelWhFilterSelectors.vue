<script setup>
import { computed } from 'vue'

const props = defineProps({
  statusOptions: { type: Array, required: true },
  checkStatusProjectionOptions: { type: Array, required: true },
  zoneOptions: { type: Array, required: true },
  numberLabel: { type: String, default: 'Номер отправления' },
  runningAction: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  isInitializing: { type: Boolean, default: false },
  parcelsWhStatus: { type: [String, Number], default: null },
  parcelsWhCheckStatusProjection: { type: [String, Number], default: null },
  parcelsWhZone: { type: [String, Number], default: null },
  localParcelNumberSearch: { type: String, default: '' },
  localBoxNumberSearch: { type: String, default: '' },
  localStickerSearch: { type: String, default: '' },
  localProductNameSearch: { type: String, default: '' },
})

const emit = defineEmits([
  'update:parcelsWhStatus',
  'update:parcelsWhCheckStatusProjection',
  'update:parcelsWhZone',
  'update:localParcelNumberSearch',
  'update:localBoxNumberSearch',
  'update:localStickerSearch',
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

const parcelsWhStatusModel = computed({
  get: () => props.parcelsWhStatus,
  set: (value) => emit('update:parcelsWhStatus', value),
})

const parcelsWhCheckStatusProjectionModel = computed({
  get: () => props.parcelsWhCheckStatusProjection,
  set: (value) => emit('update:parcelsWhCheckStatusProjection', value),
})

const parcelsWhZoneModel = computed({
  get: () => props.parcelsWhZone,
  set: (value) => emit('update:parcelsWhZone', value),
})

const localParcelNumberSearchModel = computed({
  get: () => props.localParcelNumberSearch,
  set: (value) => emit('update:localParcelNumberSearch', value),
})

const localBoxNumberSearchModel = computed({
  get: () => props.localBoxNumberSearch,
  set: (value) => emit('update:localBoxNumberSearch', value),
})

const localStickerSearchModel = computed({
  get: () => props.localStickerSearch,
  set: (value) => emit('update:localStickerSearch', value),
})

const localProductNameSearchModel = computed({
  get: () => props.localProductNameSearch,
  set: (value) => emit('update:localProductNameSearch', value),
})
</script>

<template>
  <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
    <v-select
      v-model="parcelsWhCheckStatusProjectionModel"
      :items="checkStatusProjectionOptions"
      item-title="title"
      item-value="value"
      label="Проверка"
      density="compact"
      style="min-width: 180px"
      :disabled="disabledState.selectsDisabled"
    />
    <v-select
      v-model="parcelsWhZoneModel"
      :items="zoneOptions"
      item-title="title"
      item-value="value"
      label="Зона"
      density="compact"
      style="min-width: 190px"
      :disabled="disabledState.selectsDisabled"
    />
    <v-select
      v-model="parcelsWhStatusModel"
      :items="statusOptions"
      item-title="title"
      item-value="value"
      label="Статус"
      density="compact"
      style="min-width: 250px"
      :disabled="disabledState.selectsDisabled"
    />
    <v-text-field
      v-model="localParcelNumberSearchModel"
      :label="numberLabel"
      density="compact"
      style="min-width: 210px;"
      :disabled="disabledState.textFieldsDisabled"
    />
    <v-text-field
      v-model="localBoxNumberSearchModel"
      label="Номер коробки"
      density="compact"
      style="min-width: 190px;"
      :disabled="disabledState.textFieldsDisabled"
    />
    <v-text-field
      v-model="localStickerSearchModel"
      label="Любой из стикеров"
      density="compact"
      style="min-width: 210px;"
      :disabled="disabledState.textFieldsDisabled"
    />
    <v-text-field
      v-model="localProductNameSearchModel"
      label="Описание"
      density="compact"
      style="min-width: 220px;"
      :disabled="disabledState.textFieldsDisabled"
    />
  </div>
</template>
