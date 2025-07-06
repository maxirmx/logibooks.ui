<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null }
})

const authStore = useAuthStore()

// Use different state based on the table type
const statePrefix = computed(() => props.title === 'Запреты' ? 'customs_items' : 'customs_exceptions')

const per_page = computed({
  get: () => authStore[`${statePrefix.value}_per_page`],
  set: (val) => { authStore[`${statePrefix.value}_per_page`] = val }
})

const search = computed({
  get: () => authStore[`${statePrefix.value}_search`],
  set: (val) => { authStore[`${statePrefix.value}_search`] = val }
})

const sort_by = computed({
  get: () => authStore[`${statePrefix.value}_sort_by`],
  set: (val) => { authStore[`${statePrefix.value}_sort_by`] = val }
})

const page = computed({
  get: () => authStore[`${statePrefix.value}_page`],
  set: (val) => { authStore[`${statePrefix.value}_page`] = val }
})

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const headers = [
  { title: 'Код', key: 'code', align: 'start' },
  { title: 'Наименование', key: 'name', align: 'start' },
  { title: 'Номер', key: 'number', align: 'start' },
  { title: 'Комментарий', key: 'comment', align: 'start' }
]

function filterCustomsCodes(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const i = item.raw
  if (i === null) {
    return false
  }
  const q = query.toLocaleUpperCase()

  if (
    i.code?.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.name?.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.number?.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.comment?.toLocaleUpperCase().indexOf(q) !== -1
  ) {
    return true
  }
  return false
}

const emptyMessage = computed(() => {
  return props.title === 'Запреты' ? 'Список запретов пуст' : 'Список исключений пуст'
})

const searchLabel = computed(() => {
  return props.title === 'Запреты' ? 'Поиск по запретам ТН ВЭД' : 'Поиск по исключениям ТН ВЭД'
})

const errorMessage = computed(() => {
  if (!props.error) return null
  return props.title === 'Запреты' 
    ? `Ошибка при загрузке списка запретов: ${props.error}`
    : `Ошибка при загрузке списка исключений: ${props.error}`
})
</script>

<template>
  <div>
    <h2 class="secondary-heading" :style="title === 'Запреты' ? '' : 'margin-top: 20px;'">{{ title }}</h2>
    
    <v-card>
      <v-data-table
        v-if="items?.length"
        v-model:items-per-page="per_page"
        items-per-page-text="Записей на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="page"
        :headers="headers"
        :items="items"
        :search="search"
        v-model:sort-by="sort_by"
        :custom-filter="filterCustomsCodes"
        item-value="code"
        density="compact"
        class="elevation-1 interlaced-table"
      />
      
      <div v-if="!items?.length && !loading" class="text-center m-5">
        {{ emptyMessage }}
      </div>
      
      <div v-if="items?.length">
        <v-text-field
          v-model="search"
          :append-inner-icon="mdiMagnify"
          :label="searchLabel"
          variant="solo"
          hide-details
        />
      </div>
    </v-card>
    
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">{{ errorMessage }}</div>
    </div>
    
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>
