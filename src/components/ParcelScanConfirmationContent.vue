<script setup>
import { parcelScanSelectionMessage } from '@/helpers/parcel.scan.helpers.js'

defineProps({ count: { type: Number, required: true }, jobs: { type: Array, required: true }, choice: { type: Object, required: true } })
defineEmits(['select-job'])
</script>

<template>
  <p>{{ parcelScanSelectionMessage(count) }}</p>
  <div class="form-group-0">
    <label id="parcel-scan-job-label" :for="jobs.length > 1 ? 'parcel-scan-job' : undefined" class="label-0">Задание на сканирование:</label>
    <v-select v-if="jobs.length > 1" id="parcel-scan-job" aria-labelledby="parcel-scan-job-label"
      :model-value="choice.jobId" @update:model-value="$emit('select-job', $event)" :items="jobs" item-title="label" item-value="id"
      density="compact" variant="outlined" hide-details />
    <div v-else id="parcel-scan-job" aria-labelledby="parcel-scan-job-label">{{ jobs[0]?.label }}</div>
  </div>
</template>
