<script setup>
import { computed } from 'vue'
import { getTnVedCellClass } from '@/helpers/parcels.list.helpers.js'
import { useFeacnTooltips, loadFeacnTooltipOnHover } from '@/helpers/feacn.info.helpers.js'

const componentProps = defineProps({
  item: { type: Object, required: true },
  feacnCodes: { type: Array, default: () => [] }
})

const emit = defineEmits(['click'])

const feacnTooltips = useFeacnTooltips()

const cellClass = computed(() => {
  const tnvedClass = getTnVedCellClass(componentProps.item.tnVed, componentProps.feacnCodes)
  return tnvedClass ? `truncated-cell ${tnvedClass}` : 'truncated-cell feacn-code-tooltip'
})

function handleMouseEnter() {
  if (componentProps.item.tnVed) {
    loadFeacnTooltipOnHover(componentProps.item.tnVed)
  }
}
</script>

<template>
  <v-tooltip content-class="feacn-tooltip" location="top">
    <template #activator="{ props: tooltipProps }">
      <span
        v-bind="tooltipProps"
        :class="cellClass"
        @click="emit('click', componentProps.item)"
        @mouseenter="handleMouseEnter"
      >
        {{ componentProps.item.tnVed || '' }}
      </span>
    </template>
    <template #default>
      <div class="d-flex align-center">
        <font-awesome-icon icon="fa-solid fa-pen" class="mr-3" />
        {{ feacnTooltips[componentProps.item.tnVed]?.name || 'Наведите для загрузки...' }}
      </div>
    </template>
  </v-tooltip>
</template>
