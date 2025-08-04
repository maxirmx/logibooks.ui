<template>
  <v-tooltip>
    <template #activator="{ props }">
      <span
        :class="cellClass"
        v-bind="props"
        @click="$emit('click', item)"
      >
        <slot :item="item" :value="displayValue">
          {{ displayValue }}
        </slot>
      </span>
    </template>
    <template #default>
      <div class="d-flex align-center">
        <font-awesome-icon :icon="tooltipIcon" class="mr-3" />
        <span>{{ tooltipText || displayValue }}</span>
      </div>
    </template>
  </v-tooltip>
</template>

<script setup>
defineProps({
  item: { type: Object, required: true },
  displayValue: { type: [String, Number], required: true, default: '' },
  cellClass: { type: String, default: 'clickable-cell' },
  tooltipText: { type: String, default: '' },
  tooltipIcon: { type: String, default: 'fa-solid fa-pen' }
})

defineEmits(['click'])
</script>
