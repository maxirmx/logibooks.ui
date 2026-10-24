<script setup>
import ManualScanAction from './ManualScanAction.vue'
defineProps({ parcels: { type: Array, required: true }, selection: { type: Object, default: null }, bulk: Boolean, iconSize: { type: String, default: '1x' } })
</script>
<template>
  <ManualScanAction :items="parcels" :selection="selection" :bulk="bulk" :icon-size="iconSize" />
</template>
