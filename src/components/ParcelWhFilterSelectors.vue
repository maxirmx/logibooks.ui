<script setup>
import { computed } from 'vue'
import ParcelBoxScopeChip from '@/components/ParcelBoxScopeChip.vue'
import ResponsiveFilterBar from '@/components/ResponsiveFilterBar.vue'

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
  boxScopeId: { type: Number, default: null },
  boxScopeCode: { type: String, default: null }
})

const emit = defineEmits([
  'update:parcelsWhStatus',
  'update:parcelsWhCheckStatusProjection',
  'update:parcelsWhZone',
  'update:localParcelNumberSearch',
  'update:localBoxNumberSearch',
  'update:localStickerSearch',
  'update:localProductNameSearch',
  'clear-box-scope'
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
  <ResponsiveFilterBar
    class="parcel-wh-filter-selectors"
    aria-label="Фильтры складских посылок"
  >
    <v-select
      v-model="parcelsWhCheckStatusProjectionModel"
      :items="checkStatusProjectionOptions"
      item-title="title"
      item-value="value"
      label="Проверка"
      density="compact"
      class="responsive-filter-bar__item--compact"
      :disabled="disabledState.selectsDisabled"
    />
    <v-select
      v-model="parcelsWhZoneModel"
      :items="zoneOptions"
      item-title="title"
      item-value="value"
      label="Зона"
      density="compact"
      class="responsive-filter-bar__item--compact"
      :disabled="disabledState.selectsDisabled"
    />
    <v-select
      v-model="parcelsWhStatusModel"
      :items="statusOptions"
      item-title="title"
      item-value="value"
      label="Статус"
      density="compact"
      class="responsive-filter-bar__item--regular"
      :disabled="disabledState.selectsDisabled"
    />
    <v-text-field
      v-model="localParcelNumberSearchModel"
      :label="numberLabel"
      density="compact"
      class="responsive-filter-bar__item--regular responsive-filter-bar__item--grow"
      :disabled="disabledState.textFieldsDisabled"
    />
    <ParcelBoxScopeChip
      v-if="boxScopeId"
      :box-id="boxScopeId"
      :box-code="boxScopeCode"
      :disabled="disabledState.textFieldsDisabled"
      class="parcel-wh-filter-selectors__box responsive-filter-bar__item--compact"
      @clear="$emit('clear-box-scope')"
    />
    <v-text-field
      v-else
      v-model="localBoxNumberSearchModel"
      label="Номер коробки"
      density="compact"
      class="responsive-filter-bar__item--compact"
      :disabled="disabledState.textFieldsDisabled"
    />
    <v-text-field
      v-model="localStickerSearchModel"
      label="Любой из стикеров"
      density="compact"
      class="responsive-filter-bar__item--regular responsive-filter-bar__item--grow"
      :disabled="disabledState.textFieldsDisabled"
    />
    <v-text-field
      v-model="localProductNameSearchModel"
      label="Товар"
      density="compact"
      class="responsive-filter-bar__item--regular responsive-filter-bar__item--grow"
      :disabled="disabledState.textFieldsDisabled"
    />
  </ResponsiveFilterBar>
</template>

<style scoped>
.parcel-wh-filter-selectors__box {
  align-self: center;
}
</style>
