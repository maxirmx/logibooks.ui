<script setup>
import ScanjobParcelsMonitorTable from '@/dialogs/Scanjob_Parcels_Monitor_Table.vue'
import { scanjobOzonParcelHeaders } from '@/helpers/scanjob.monitor.helpers.js'

defineOptions({ name: 'Scanjob_Ozon_Parcels_Monitor_Table' })

defineProps({
  parcels: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

defineEmits(['edit-parcel'])
</script>

<template>
  <ScanjobParcelsMonitorTable
    :headers="scanjobOzonParcelHeaders"
    :parcels="parcels"
    :loading="loading"
    @edit-parcel="$emit('edit-parcel', $event)"
  />
</template>
