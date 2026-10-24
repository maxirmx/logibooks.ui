<script setup>
import { computed, inject } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { MANUAL_SCAN_KEY } from '@/helpers/manual.scan.helpers.js'

const props = defineProps({ items: { type: Array, required: true }, selection: { type: Object, default: null }, bulk: Boolean, iconSize: { type: String, default: '1x' } })
const scan = inject(MANUAL_SCAN_KEY, null)
const targets = computed(() => props.selection?.selectedItems.value.some(item => scan.target.value.getId(item) === scan.target.value.getId(props.items[0]))
  ? props.selection.selectedItems.value : props.items)
const isBulk = computed(() => props.bulk || targets.value.length > 1)
const jobs = computed(() => scan?.compatibleJobs() ?? [])
const reason = computed(() => scan?.disabledReason(jobs.value[0] ?? scan.jobs.value[0]) || '')
const disabled = computed(() => !scan || scan.disabled.value || scan.locked.value || scan.jobsLoading.value ||
  !jobs.value.length || !targets.value.length)
const tooltip = computed(() => reason.value ||
  (isBulk.value ? 'Отметить выбранные как отсканированные' : 'Отметить как отсканированную'))
const options = computed(() => jobs.value.map(job => ({
  key: job.id,
  label: scan.jobLabel(job),
  action: () => scan.run(targets.value, job.id, isBulk.value)
})))
</script>

<template>
  <span v-if="scan?.canScan.value" @click.stop>
    <ActionButton2L v-if="jobs.length > 1" :item="items" icon="fa-solid fa-qrcode"
      menu-location="bottom start"
      :icon-size="iconSize" :tooltip-text="tooltip" :aria-label="tooltip" :disabled="disabled"
      :options="options" :data-testid="`manual-${scan.target.value.kind}-scan-menu`" />
    <ActionButton v-else :item="items" icon="fa-solid fa-qrcode" :icon-size="iconSize"
      :tooltip-text="tooltip" :aria-label="tooltip" :disabled="disabled" :data-testid="`manual-${scan.target.value.kind}-scan`"
      @click="scan.run(targets, jobs[0].id, isBulk)" />
  </span>
</template>
