<script setup>
import { ref, watch } from 'vue'
import { useRegistersStore } from '@/stores/registers.store.js'
import { storeToRefs } from 'pinia'

const registersStore = useRegistersStore()
const { items, loading, error, hasNextPage } = storeToRefs(registersStore)

const page = ref(1)
const itemsPerPage = ref(10)

watch([page, itemsPerPage], () => {
  registersStore.getAll(page.value, itemsPerPage.value)
}, { immediate: true })

function openOrders(item) {
  console.log('Open orders for register', item.id)
}

const headers = [
  { title: 'ID', key: 'id', align: 'start' },
  { title: 'Файл', key: 'fileName', align: 'start' },
  { title: 'Дата', key: 'date', align: 'start' },
  { title: '', key: 'actions', sortable: false, align: 'center', width: '5%' }
]
</script>

<template>
  <div class="settings table-2">
    <h1 class="orange">Реестры</h1>
    <hr class="hr" />
    <v-data-table-server
      v-model:page="page"
      v-model:items-per-page="itemsPerPage"
      :items-length="hasNextPage ? page * itemsPerPage + 1 : (page - 1) * itemsPerPage + items.length"
      :headers="headers"
      :items="items"
      :loading="loading"
      class="elevation-1"
    >
      <template #item.actions="{ item }">
        <button @click="openOrders(item)" class="anti-btn">
          <font-awesome-icon size="1x" icon="fa-solid fa-list" class="anti-btn" />
        </button>
      </template>
    </v-data-table-server>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке списка реестров: {{ error }}</div>
    </div>
  </div>
</template>
