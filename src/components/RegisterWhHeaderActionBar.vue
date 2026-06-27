<script setup>
import { computed, ref, unref } from 'vue'
import { useConfirm } from 'vuetify-use-dialog'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import {
  chooseOutputWeightCorrection,
  WEIGHT_CORRECTION_CHOICE
} from '@/helpers/weight.correction.helpers.js'

const props = defineProps({
  register: { type: Object, required: true },
  zones: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  iconSize: { type: String, default: '2x' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['bulk-change-parcel-status', 'close'])

const registersStore = useRegistersStore()
const authStore = useAuthStore()
const confirm = useConfirm()
const canExport = computed(() => Boolean(unref(authStore.isWhManagerPlus)))
const canBulkChangeParcelStatus = computed(() => Boolean(unref(authStore.isSrLogistPlus)))
const exportPending = ref(false)
const exportDisabled = computed(() =>
  props.disabled ||
  props.loading ||
  exportPending.value ||
  !props.register?.id
)
const actionDisabled = computed(() =>
  props.disabled ||
  props.loading ||
  !props.register?.id
)

function normalizeZoneName(name) {
  if (!name || !name.trim()) {
    return 'Без зоны (не найдены)'
  }
  return name
}

async function downloadRegisterForZone(forZone, zoneLabel) {
  if (exportDisabled.value) return

  const registerId = props.register?.id
  if (!registerId) return

  exportPending.value = true

  try {
    let applyWeightCorrection = false
    const choice = await chooseOutputWeightCorrection(confirm, props.register)
    applyWeightCorrection = choice === WEIGHT_CORRECTION_CHOICE.Apply

    if (applyWeightCorrection) {
      await registersStore.download(
        registerId,
        props.register?.fileName,
        forZone,
        zoneLabel,
        true
      )
      return
    }

    await registersStore.download(
      registerId,
      props.register?.fileName,
      forZone,
      zoneLabel
    )
  } finally {
    exportPending.value = false
  }
}

const exportOptions = computed(() => {
  const zoneOptions = props.zones.map((zone) => {
    const label = normalizeZoneName(zone?.name)

    return {
      label,
      value: zone?.value,
      action: () => downloadRegisterForZone(zone?.value, label)
    }
  })

  return [
    {
      label: 'Все посылки',
      value: 0,
      action: () => downloadRegisterForZone(0, undefined)
    },
    ...zoneOptions
  ]
})
</script>

<template>
  <div class="header-actions-bar">
    <div v-if="loading" class="header-actions header-actions-group">
        <span class="spinner-border spinner-border-m"></span>
    </div>
    <div v-if="canExport" class="header-actions header-actions-group">
        <ActionButton2L
          :item="register"
          icon="fa-solid fa-file-export"
          tooltip-text="Экспортировать реестр"
          :icon-size="iconSize"
          :disabled="exportDisabled"
          :options="exportOptions"
        />
    </div>
    <div class="header-actions header-actions-group">
        <ActionButton
          v-if="canBulkChangeParcelStatus"
          :item="register"
          icon="fa-solid fa-pen-to-square"
          tooltip-text="Выбрать посылки и изменить статус"
          :icon-size="iconSize"
          :disabled="actionDisabled"
          @click="emit('bulk-change-parcel-status')"
        />
        <ActionButton
          :item="register"
          icon="fa-solid fa-xmark"
          tooltip-text="Закрыть"
          aria-label="Закрыть"
          :icon-size="iconSize"
          :disabled="disabled"
          @click="emit('close')"
        />
    </div>
  </div>
</template>
