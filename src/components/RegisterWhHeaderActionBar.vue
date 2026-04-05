<script setup>
import { computed } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { useRegistersStore } from '@/stores/registers.store.js'

const props = defineProps({
  register: { type: Object, required: true },
  zones: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  iconSize: { type: String, default: '2x' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const registersStore = useRegistersStore()

function normalizeZoneName(name) {
  if (!name || !name.trim()) {
    return 'Без зоны (не найдены)'
  }
  return name
}

async function downloadRegisterForZone(forZone, zoneLabel) {
  if (props.disabled) return

  const registerId = props.register?.id
  if (!registerId) return

  await registersStore.download(
    registerId,
    props.register?.fileName,
    forZone,
    zoneLabel
  )
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
    <div class="header-actions header-actions-group">
        <ActionButton2L
          :item="register"
          icon="fa-solid fa-file-export"
          tooltip-text="Экспортировать реестр"
          :icon-size="iconSize"
          :disabled="disabled || loading || !register?.id"
          :options="exportOptions"
        />
    </div>
    <div class="header-actions header-actions-group">
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
