<script setup>
import { scanSelectionMessage } from '@/helpers/manual.scan.messages.js'

defineProps({ kind: { type: String, default: 'parcel' }, count: { type: Number, required: true }, jobs: { type: Array, required: true }, choice: { type: Object, required: true } })
defineEmits(['select-job'])
</script>

<template>
  <p>{{ scanSelectionMessage(count, kind) }}</p>
  <div class="form-group-0">
    <label :id="`${kind}-scan-job-label`" :for="jobs.length > 1 ? `${kind}-scan-job` : undefined" class="label-0">Задание на сканирование:</label>
    <v-select v-if="jobs.length > 1" :id="`${kind}-scan-job`" :aria-labelledby="`${kind}-scan-job-label`"
      :model-value="choice.jobId" @update:model-value="$emit('select-job', $event)" :items="jobs" item-title="label" item-value="id"
      density="compact" variant="outlined" hide-details />
    <div v-else :id="`${kind}-scan-job`" :aria-labelledby="`${kind}-scan-job-label`">{{ jobs[0]?.label }}</div>
  </div>
</template>
