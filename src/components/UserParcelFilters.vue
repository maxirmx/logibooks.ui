<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelFiltersStore } from '@/stores/parcel.filters.store.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { reportError } from '@/helpers/error.helpers.js'
import ActionButton from '@/components/ActionButton.vue'

const router = useRouter()
const alertStore = useAlertStore()
const filterStore = useParcelFiltersStore()
const confirm = useAppConfirm()
const filters = computed(() => filterStore.filters)
const headers = [
  { title: '', key: 'actions', sortable: false, width: '120px' },
  { title: 'Название', key: 'name', sortable: true },
  { title: 'Исключено статусов', key: 'exclusions', sortable: false }
]
const deletingId = ref(null)
const loaded = ref(false)
let active = true
onUnmounted(() => { active = false })

async function load() {
  loaded.value = false
  try {
    await filterStore.getAll()
    if (active) loaded.value = true
    return true
  } catch (error) {
    if (!active) {
      reportError(error, { context: 'parcel filter list load after disposal' })
      return false
    }
    alertStore.error(error, {
      fallback: 'Не удалось загрузить пользовательские фильтры',
      action: { label: 'Повторить', handler: load }
    })
    return false
  }
}

onMounted(() => { void load() })

async function openFilter(path) {
  try {
    await router.push(path)
  } catch (error) {
    alertStore.error(error, { fallback: 'Не удалось открыть пользовательский фильтр' })
  }
}

async function removeConfirmed(id) {
  if (!active || deletingId.value !== null) return false
  deletingId.value = id
  try {
    await filterStore.remove(id)
    if (active) alertStore.success('Пользовательский фильтр удалён')
    return true
  } catch (error) {
    if (!active) {
      reportError(error, { context: 'parcel filter deletion after disposal' })
      return false
    }
    alertStore.error(error, {
      fallback: 'Не удалось удалить пользовательский фильтр',
      action: { label: 'Повторить', handler: () => removeConfirmed(id) }
    })
    return false
  } finally {
    deletingId.value = null
  }
}

async function removeFilter(filter) {
  if (!active || deletingId.value !== null) return false
  try {
    const confirmed = await confirm({
      title: 'Удалить пользовательский фильтр?',
      content: filter.name,
      confirmationText: 'Удалить',
      cancellationText: 'Отменить'
    })
    if (!active || !confirmed) return false
    return removeConfirmed(filter.id)
  } catch (error) {
    if (!active) {
      reportError(error, { context: 'parcel filter confirmation after disposal' })
      return false
    }
    alertStore.error(error, { fallback: 'Не удалось подтвердить удаление фильтра' })
    return false
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
    <div class="user-parcel-filters__table-shell table-card">
      <v-data-table
        :headers="headers"
        :items="loaded ? filters : []"
        item-value="id"
        :items-per-page="-1"
        hide-default-footer
        density="compact"
        class="elevation-1 interlaced-table"
        no-data-text="Нет пользовательских фильтров"
        aria-label="Пользовательские фильтры"
      >
        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Настроить фильтр"
              :data-testid="`parcel-filter-edit-${item.id}`"
              @click="openFilter(`/parcel-filters/edit/${item.id}`)"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить фильтр"
              :data-testid="`parcel-filter-delete-${item.id}`"
              :disabled="deletingId !== null"
              @click="removeFilter(item)"
            />
          </div>
        </template>
        <template #[`item.exclusions`]="{ item }">
          {{ item.excludedParcelStatusIds.length + Object.values(item.excludedCheckStatuses).flat().length + item.excludedPassportCheckStatuses.length }}
        </template>
      </v-data-table>
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
