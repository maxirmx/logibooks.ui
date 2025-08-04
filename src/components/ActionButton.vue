<template>
  <v-tooltip :text="tooltipText">
    <template v-slot:activator="{ props }">
      <button 
        type="button" 
        @click="$emit('click', item)" 
        class="anti-btn" 
        v-bind="props"
        :disabled="disabled"
      >
        <font-awesome-icon :size="iconSize" :icon="icon" class="anti-btn" />
      </button>
    </template>
  </v-tooltip>
</template>

<script setup>
defineProps({
  item: { type: Object, required: true },
  icon: { type: String, required: true },
  tooltipText: { type: String, required: true },
  iconSize: { type: String, default: '1x' },
  disabled: { type: Boolean, default: false }
})

defineEmits(['click'])
</script>
