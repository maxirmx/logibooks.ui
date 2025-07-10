<script setup>
import { storeToRefs } from 'pinia'
import { useCountryCodesStore } from '@/stores/countrycodes.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { onMounted } from 'vue'

const countryCodesStore = useCountryCodesStore()
const { countries, loading, error } = storeToRefs(countryCodesStore)

onMounted(() => {
  countryCodesStore.getAll()
})

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const authStore = useAuthStore()
const {
  countries_per_page,
  countries_search,
  countries_sort_by,
  countries_page,
  isAdmin
} = storeToRefs(authStore)

function filterCodes(value, query, item) {
  if (!query) return true
  const q = query.toString().toUpperCase()
  const i = item.raw
  return (
    i.isoNumeric.toString().includes(q) ||
    i.isoAlpha2.toUpperCase().includes(q) ||
    i.nameEnOfficial.toUpperCase().includes(q) ||
    i.nameRuOfficial.toUpperCase().includes(q)
  )
}

async function updateCodes() {
  try {
    await countryCodesStore.update()
    await countryCodesStore.getAll()
    alertStore.success('Информация о странах обновлена')
  } catch (err) {
    alertStore.error(err)
  }
}

const headers = [
  { title: 'Код', key: 'isoNumeric', align: 'start', width: '80px' },
  { title: 'Обозначение', key: 'isoAlpha2', align: 'start', width: '80px' },
  { title: 'Русское название', key: 'nameRuOfficial', align: 'start' },
  { title: 'Английское название', key: 'nameEnOfficial', align: 'start' },
]
</script>

<template>
  <div class="settings table-2">
    <h1 class="primary-heading">Cтраны</h1>
    <hr class="hr" />

    <div class="link-crt" v-if="isAdmin">
      <a @click="updateCodes" class="link">
        <font-awesome-icon size="1x" icon="fa-solid fa-download" class="link" />
        &nbsp;&nbsp;&nbsp;Обновить информацию о странах
      </a>
    </div>

    <v-card>
      <v-data-table
        v-if="countries?.length"
        v-model:items-per-page="countries_per_page"
        items-per-page-text="Стран на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="countries_page"
        :headers="headers"
        :items="countries"
        :search="authStore.countries_search"
        v-model:sort-by="countries_sort_by"
        :custom-filter="filterCodes"
        density="compact"
        class="elevation-1 interlaced-table"
      />
      <div v-if="!countries?.length && !loading" class="text-center m-5">
        Список стран пуст
      </div>

      <div v-if="countries?.length || countries_search">
        <v-text-field
          v-model="authStore.countries_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по любой информации о стране"
          variant="solo"
          hide-details
        />
      </div>
    </v-card>
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке информации: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>
