<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

defineProps({
  item: { type: Object, default: null }
})
</script>

<template>
  <div class="form-section">
    <div class="form-row">
      <div class="form-group">
        <label for="dtag" class="label">ДТЭГ/ПТДЭГ:</label>
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
  </div>
</template>

<style scoped>
.dtag-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
