<template>
  <div class="pagination-footer">
    <div class="pagination-footer__section pagination-footer__items">
      <span class="pagination-footer__label">{{ itemsPerPageLabel }}</span>
      <v-select
        v-model="itemsPerPageModel"
        :items="itemsPerPageOptions"
        item-title="title"
        item-value="value"
        density="compact"
        variant="plain"
        hide-details
        class="pagination-footer__items-select"
        :aria-label="itemsPerPageLabel"
        :disabled="controlsDisabled"
      />
    </div>

    <div class="pagination-footer__section pagination-footer__info" v-if="showRange">
      <div>{{ rangeStart }}-{{ rangeEnd }} из {{ safeTotalCount }}</div>
    </div>

    <div class="pagination-footer__section pagination-footer__nav">
      <v-btn
        variant="text"
        icon="$first"
        aria-label="Первая страница"
        size="small"
        :disabled="isFirstDisabled"
        @click="setPage(1)"
      />

      <v-btn
        variant="text"
        icon="$prev"
        aria-label="Предыдущая страница"
        size="small"
        :disabled="isPrevDisabled"
        @click="setPage(page - 1)"
      />

      <v-btn
        variant="text"
        icon="$next"
        aria-label="Следующая страница"
        size="small"
        :disabled="isNextDisabled"
        @click="setPage(page + 1)"
      />

      <v-btn
        variant="text"
        icon="$last"
        aria-label="Последняя страница"
        size="small"
        :disabled="isLastDisabled"
        @click="setPage(effectiveMaxPage)"
      />

      <div class="pagination-footer__page-control">
        <span class="pagination-footer__label">Страница</span>
        <v-select
          v-model="pageSelectModel"
          :items="pageSelectItems"
          item-title="title"
          item-value="value"
          density="compact"
          variant="plain"
          hide-details
          class="pagination-footer__page-select"
          aria-label="Страница"
          :disabled="controlsDisabled"
        />
      </div>

      <v-btn
        variant="text"
        :icon="mdiChevronTripleUp"
        aria-label="В начало страницы"
        size="small"
        @click="scrollToTop"
        class="pagination-footer__scroll-button"
        :disabled="controlsDisabled"
      />
    </div>
  </div>
</template>

<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { mdiChevronTripleUp } from '@mdi/js'
import { buildPageOptions } from '@/helpers/pagination.helpers.js'

const props = defineProps({
  page: { type: Number, required: true },
  maxPage: { type: Number, default: 1 },
  itemsPerPage: { type: Number, required: true },
  totalCount: { type: Number, default: 0 },
  itemsPerPageOptions: { type: Array, default: () => [] },
  itemsPerPageLabel: { type: String, default: 'Записей на странице:' },
  pageOptions: { type: Array, default: null },

  showRange: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:itemsPerPage', 'update:page'])

const safeTotalCount = computed(() => props.totalCount ?? 0)
const effectiveMaxPage = computed(() => Math.max(1, props.maxPage || 1))

const controlsDisabled = computed(() => props.disabled || props.loading)

const itemsPerPageModel = computed({
  get: () => props.itemsPerPage,
  set: (value) => {
    const numeric = Number(value)
    emit('update:itemsPerPage', Number.isNaN(numeric) ? props.itemsPerPage : numeric)
  }
})

const rangeStart = computed(() => {
  if (!safeTotalCount.value) return 0
  if (props.itemsPerPage === -1) return 1
  return Math.min((props.page - 1) * props.itemsPerPage + 1, safeTotalCount.value)
})

const rangeEnd = computed(() => {
  if (!safeTotalCount.value) return 0
  if (props.itemsPerPage === -1) return safeTotalCount.value
  return Math.min(props.page * props.itemsPerPage, safeTotalCount.value)
})

const pageSelectItems = computed(() => {
  if (props.pageOptions && props.pageOptions.length) {
    return props.pageOptions
  }

  return buildPageOptions(effectiveMaxPage.value, props.page)
})

const pageSelectModel = computed({
  get: () => props.page,
  set: (value) => {
    const numeric = clampPage(Number(value))
    emit('update:page', numeric)
  }
})



function clampPage(raw) {
  const candidate = Number.isNaN(raw) ? props.page : raw
  return Math.min(effectiveMaxPage.value, Math.max(1, candidate))
}

function setPage(target) {
  const numeric = clampPage(target)
  if (numeric !== props.page) {
    emit('update:page', numeric)
  }
}



const isFirstDisabled = computed(() => controlsDisabled.value || props.page <= 1)
const isPrevDisabled = computed(() => controlsDisabled.value || props.page <= 1)
const isNextDisabled = computed(() => controlsDisabled.value || props.page >= effectiveMaxPage.value)
const isLastDisabled = computed(() => controlsDisabled.value || props.page >= effectiveMaxPage.value)

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}
</script>

<style scoped>
.pagination-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  align-items: center;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.pagination-footer__section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  min-width: 0;
}

.pagination-footer__items {
  min-width: min(100%, 12.5rem);
}

.pagination-footer__label {
  font-size: 0.875rem;
  display: flex;
  align-items: center;
}

.pagination-footer__items-select {
  width: 5.5rem;
  flex: 0 0 auto;
}

.pagination-footer__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  max-width: 100%;
  min-width: 0;
}

.pagination-footer__page-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  min-width: 0;
}

.pagination-footer__page-select {
  width: 60px;
}

.pagination-footer__scroll-button {
  margin-left: 0.5rem;
}

.pagination-footer :deep(.v-field) {
  margin: 0;
  align-items: center;
}

.pagination-footer :deep(.v-field__input) {
  min-height: 2rem;
  padding-top: 0.125rem;
  padding-bottom: 0.125rem;
}
</style>


