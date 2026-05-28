<script setup>
import ScanjobParcelsMonitorTable from '@/dialogs/Scanjob_Parcels_Monitor_Table.vue'
import { scanjobWbr2ParcelHeaders } from '@/helpers/scanjob.monitor.helpers.js'

defineOptions({ name: 'Scanjob_Wbr2_Parcels_Monitor_Table' })

defineProps({
  parcels: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  defectActionLoading: { type: Boolean, default: false },
  selectedParcelId: { type: [Number, String], default: null }
})

defineEmits(['edit-parcel', 'set-defect', 'clear-defect'])
</script>

<template>
  <ScanjobParcelsMonitorTable
    :headers="scanjobWbr2ParcelHeaders"
    :parcels="parcels"
    :loading="loading"
    :defect-action-loading="defectActionLoading"
    :selected-parcel-id="selectedParcelId"
    @edit-parcel="$emit('edit-parcel', $event)"
    @set-defect="$emit('set-defect', $event)"
    @clear-defect="$emit('clear-defect', $event)"
  />
</template>
