<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application.

import { inject } from 'vue'
import PaginationFooter from '@/components/PaginationFooter.vue'

defineProps({
  itemsPerPageOptions: { type: Array, required: true },
  itemsPerPageLabel: { type: String, default: undefined },
  disabled: { type: Boolean, default: false }
})

// Vuetify's bottom slot omits the total. Its native footer reads this context,
// which also keeps page-size changes and page resets in the table's existing model.
const { page, itemsPerPage, pageCount, itemsLength, setPage, setItemsPerPage } =
  inject(Symbol.for('vuetify:data-table-pagination'))
</script>

<template>
  <div class="v-data-table-footer">
    <PaginationFooter
      :page="page"
      :items-per-page="itemsPerPage"
      :max-page="pageCount"
      :total-count="itemsLength"
      :items-per-page-options="itemsPerPageOptions"
      :items-per-page-label="itemsPerPageLabel"
      :disabled="disabled"
      @update:page="setPage"
      @update:items-per-page="setItemsPerPage"
    />
  </div>
</template>
