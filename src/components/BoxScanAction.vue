<script setup>
import ManualScanAction from './ManualScanAction.vue'
defineProps({ boxes: { type: Array, required: true }, selection: { type: Object, default: null }, bulk: Boolean, iconSize: { type: String, default: '1x' } })
</script>
<template>
  <ManualScanAction :items="boxes" :selection="selection" :bulk="bulk" :icon-size="iconSize" />
</template>
