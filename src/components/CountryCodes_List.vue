<script setup>
import { storeToRefs } from 'pinia'
import { useCountryCodesStore } from '@/stores/countrycodes.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { onMounted } from 'vue'

const countryCodesStore = useCountryCodesStore()
const { items, loading, error } = storeToRefs(countryCodesStore)

onMounted(() => {
  countryCodesStore.getAll()
})

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const authStore = useAuthStore()
const {
  codes_per_page,
  codes_search,
  codes_sort_by,
  codes_page,
  isAdmin
} = storeToRefs(authStore)

function filterCodes(value, query, item) {
  if (!query) return true
  const q = query.toString().toUpperCase()
  const i = item.raw
  return (
    i.IsoNumeric.toString().includes(q) ||
    i.IsoAlpha2.toUpperCase().includes(q) ||
    i.NameEnOfficial.toUpperCase().includes(q) ||
    i.NameRuOfficial.toUpperCase().includes(q)
  )
}

async function updateCodes() {
  try {
    await countryCodesStore.update()
    await countryCodesStore.getAll()
    alertStore.success('Коды стран обновлены')
  } catch (err) {
    alertStore.error(err)
  }
}

const headers = [
  { title: 'ISO Num', key: 'IsoNumeric', align: 'start', width: '80px' },
  { title: 'ISO 2', key: 'IsoAlpha2', align: 'start', width: '80px' },
  { title: 'English', key: 'NameEnOfficial', align: 'start' },
  { title: 'Русский', key: 'NameRuOfficial', align: 'start' }
]
</script>

<template>
  <div class="settings table-2">
    <h1 class="primary-heading">Коды стран</h1>
    <hr class="hr" />

    <div class="link-crt" v-if="isAdmin">
      <button @click="updateCodes" class="link">
        <font-awesome-icon size="1x" icon="fa-solid fa-download" class="link" />
        &nbsp;&nbsp;&nbsp;Обновить коды стран
      </button>
    </div>

    <v-card>
      <v-data-table
        v-if="items?.length"
        v-model:items-per-page="codes_per_page"
        items-per-page-text="Кодов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="codes_page"
        :headers="headers"
        :items="items"
        :search="codes_search"
        v-model:sort-by="codes_sort_by"
        :custom-filter="filterCodes"
        density="compact"
        class="elevation-1 interlaced-table"
      />
      <div v-if="!items?.length && !loading" class="text-center m-5">
        Список кодов стран пуст
      </div>
      <div v-if="items?.length || codes_search">
        <v-text-field
          v-model="codes_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по таблице"
          variant="solo"
          hide-details
        />
      </div>
    </v-card>
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке кодов стран: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>
