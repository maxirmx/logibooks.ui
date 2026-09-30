<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { listPrototypeParcelFilters } from '@/helpers/parcel.filters.prototype.js'
import { useRouter } from 'vue-router'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'

const filters = listPrototypeParcelFilters()
const router = useRouter()
const alertStore = useAlertStore()

async function openFilter(path) {
  try {
    await router.push(path)
  } catch (error) {
    alertStore.error(error, { fallback: 'Не удалось открыть пользовательский фильтр' })
  }
}
</script>

<template>
  <section class="user-parcel-filters" aria-labelledby="user-parcel-filters-heading" data-testid="user-parcel-filters">
    <div class="user-parcel-filters__header">
      <h2 id="user-parcel-filters-heading" class="label">Пользовательские фильтры:</h2>
      <div class="header-actions-bar">
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            icon-size="1x"
            tooltip-text="Создать пользовательский фильтр"
            data-testid="parcel-filter-create"
            @click="openFilter('/parcel-filters/create')"
          />
        </div>
      </div>
    </div>
    <div class="user-parcel-filters__table-shell table-card app-table-card">
      <div class="app-table-scroll">
        <table class="app-table interlaced-table">
          <thead>
            <tr>
              <th scope="col">Действия</th>
              <th scope="col">Название</th>
              <th scope="col">Исключений</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="filter in filters" :key="filter.id">
              <td>
                <div class="app-table-actions">
                  <ActionButton
                    :item="filter"
                    icon="fa-solid fa-pen"
                    tooltip-text="Настроить фильтр"
                    :data-testid="`parcel-filter-edit-${filter.id}`"
                    @click="openFilter(`/parcel-filters/edit/${filter.id}`)"
                  />
                  <ActionButton
                    :item="filter"
                    icon="fa-solid fa-trash-can"
                    tooltip-text="Удаление будет доступно после подключения API"
                    :data-testid="`parcel-filter-delete-${filter.id}`"
                    disabled
                  />
                </div>
              </td>
              <td>{{ filter.name }}</td>
              <td>
                {{ filter.excludedParcelStatusIds.length + Object.values(filter.excludedCheckStatuses).flat().length }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.user-parcel-filters {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #d7dbe1;
}

.user-parcel-filters__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.user-parcel-filters__header .header-actions-bar {
  margin-left: auto;
}

.user-parcel-filters__header > .label {
  width: auto;
  min-width: 0;
  white-space: normal;
  overflow: visible;
}

.user-parcel-filters__table-shell {
  width: 100%;
  min-width: 0;
}
</style>
