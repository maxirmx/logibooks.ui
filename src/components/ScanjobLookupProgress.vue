<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { lookupPresetLabel, lookupTargetModes } from '@/helpers/scoped.lookup.helpers.js'

const props = defineProps({
  snapshot: { type: Object, required: true },
  canCreateSearch: { type: Boolean, default: false },
  completed: { type: Boolean, default: false }
})
const verification = computed(() => Number(props.snapshot.lookupTargetMode) === lookupTargetModes.RedZoneAtStart)
const searchRoute = computed(() => ({
  path: '/scanjob/create',
  query: {
    registerId: props.snapshot.registerId,
    warehouseId: props.snapshot.warehouseId,
    dealNumber: props.snapshot.dealNumber,
    sourceScanJobId: props.snapshot.scanJobId
  }
}))
</script>

<template>
  <section v-if="snapshot.lookupProgress" aria-label="Результаты задания" class="mb-3">
    <strong>{{ lookupPresetLabel(snapshot.lookupTargetMode) }}</strong>
    <div v-if="verification">
      Ожидается: {{ snapshot.lookupProgress.expectedCount }} · Подтверждено: {{ snapshot.lookupProgress.confirmedCount }}
      · Не найдено: {{ snapshot.lookupProgress.missingCount }}
    </div>
    <div v-else>
      Найдено: {{ snapshot.lookupProgress.confirmedCount }} · Осталось найти: {{ snapshot.lookupProgress.missingCount }}
    </div>
    <details v-if="snapshot.lookupProgress.missingCount">
      <summary>Ненайденные посылки</summary>
      <ul>
        <li v-for="parcel in snapshot.lookupProgress.missingParcels" :key="parcel.parcelId">{{ parcel.parcelNumber }}</li>
      </ul>
    </details>
    <div v-else-if="completed && verification">Ненайденных посылок нет</div>
    <details v-if="snapshot.lookupProgress.confirmedCount">
      <summary>{{ verification ? 'Подтверждённые посылки' : 'Найденные посылки' }}</summary>
      <ul>
        <li v-for="parcel in snapshot.lookupProgress.confirmedParcels" :key="parcel.parcelId">{{ parcel.parcelNumber }}</li>
      </ul>
    </details>
    <v-btn
      v-if="verification && completed && canCreateSearch && snapshot.lookupProgress.missingCount > 0"
      :to="searchRoute"
      variant="text"
    >Создать поиск ненайденных</v-btn>
  </section>
</template>
