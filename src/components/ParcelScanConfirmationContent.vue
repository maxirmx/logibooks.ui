<script setup>
defineProps({ count: { type: Number, required: true }, jobs: { type: Array, required: true }, choice: { type: Object, required: true } })
defineEmits(['select-job'])
</script>

<template>
  <p>Отметить выбранные посылки как отсканированные? Количество: {{ count }}.</p>
  <v-select :model-value="choice.jobId" @update:model-value="$emit('select-job', $event)" :items="jobs" item-title="label" item-value="id"
    label="Задание сканирования" density="compact" variant="outlined" hide-details />
</template>
