<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import ScanjobParcelsMonitorTable from '@/dialogs/Scanjob_Parcels_Monitor_Table.vue'
import { scanjobOzonParcelHeaders } from '@/helpers/scanjob.monitor.helpers.js'

defineOptions({ name: 'Scanjob_Ozon_Parcels_Monitor_Table' })

defineProps({
  parcels: { type: Array, default: () => [] },
  register: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  defectActionLoading: { type: Boolean, default: false },
  readOnly: { type: Boolean, default: false },
  selectedParcelId: { type: [Number, String], default: null }
})

defineEmits(['edit-parcel', 'set-defect', 'clear-defect', 'clear-ext-id'])
</script>

<template>
  <ScanjobParcelsMonitorTable
    :headers="scanjobOzonParcelHeaders"
    :parcels="parcels"
    :register="register"
    :loading="loading"
    :defect-action-loading="defectActionLoading"
    :read-only="readOnly"
    :selected-parcel-id="selectedParcelId"
    @edit-parcel="$emit('edit-parcel', $event)"
    @set-defect="$emit('set-defect', $event)"
    @clear-defect="$emit('clear-defect', $event)"
    @clear-ext-id="$emit('clear-ext-id', $event)"
  />
</template>
