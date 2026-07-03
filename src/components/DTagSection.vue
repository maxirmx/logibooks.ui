<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

defineProps({
  item: { type: Object, default: null }
})

function formatCharge(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const numericValue = typeof value === 'string' ? Number(value.trim().replace(',', '.')) : Number(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : '-'
}
</script>

<template>
  <div class="form-section">
    <div class="form-row">
      <div class="form-group">
        <span class="label">ДТЭГ/ПТДЭГ:</span>
        <div class="form-control input readonly-field dtag-ellipsis" id="dtag" name="dtag" :title="item?.dTag || '-'">
          {{ item?.dTag ? item.dTag : '-' }}
        </div>
      </div>
      <div class="form-group" v-if="item?.dTagComment != null">
        <div class="form-control input readonly-field dtag-ellipsis" id="dtagComment" name="dtagComment" :title="item?.dTagComment || ''">
          {{ item?.dTagComment ? item.dTagComment : '' }}
        </div>
      </div>
      <div class="form-group" v-if="item?.previousDTagComment != null">
        <div class="form-control input readonly-field dtag-ellipsis" id="previousDTagComment" name="previousDTagComment" :title="item?.previousDTagComment || ''">
          {{ item?.previousDTagComment ? item.previousDTagComment : '' }}
        </div>
      </div>
    </div>
    <div
      v-if="item?.customsFee != null || item?.customsDuty != null"
      class="form-row customs-charges-row"
    >
      <div class="form-group customs-charge-group">
        <span class="label">Сбор:</span>
        <div class="form-control input readonly-field customs-charge-field" id="customsFee" name="customsFee">
          {{ formatCharge(item?.customsFee) }}
        </div>
      </div>
      <div class="form-group customs-charge-group">
        <span class="label">Пошлина:</span>
        <div class="form-control input readonly-field customs-charge-field" id="customsDuty" name="customsDuty">
          {{ formatCharge(item?.customsDuty) }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dtag-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customs-charges-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.customs-charge-group {
  min-width: 0;
}

.customs-charge-field {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .customs-charges-row {
    grid-template-columns: 1fr;
  }
}
</style>
