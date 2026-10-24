<script setup>
import ManualScanConfirmationContent from './ManualScanConfirmationContent.vue'
defineProps({ count: { type: Number, required: true }, jobs: { type: Array, required: true }, choice: { type: Object, required: true } })
defineEmits(['select-job'])
</script>
<template>
  <ManualScanConfirmationContent kind="parcel" :count="count" :jobs="jobs" :choice="choice" @select-job="$emit('select-job', $event)" />
</template>
