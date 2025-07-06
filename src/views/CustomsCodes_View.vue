<script setup>
import { onMounted } from 'vue'
import { useAltaStore } from '@/stores/alta.store.js'

const store = useAltaStore()

const itemHeaders = [
  { title: 'Код', key: 'code', align: 'start' },
  { title: 'Наименование', key: 'name', align: 'start' },
  { title: 'Номер', key: 'number', align: 'start' },
  { title: 'Комментарий', key: 'comment', align: 'start' }
]

const exceptionHeaders = [...itemHeaders]

onMounted(() => {
  store.getItems()
  store.getExceptions()
})

function parseAlta() {
  store.parse()
}
</script>

<template>
  <div class="settings table-2">
    <h1 class="primary-heading">Коды ТН ВЭД</h1>
    <hr class="hr" />

    <div class="link-crt">
      <a @click="parseAlta" class="link" tabindex="0">
        <font-awesome-icon size="1x" icon="fa-solid fa-download" class="link" />&nbsp;&nbsp;&nbsp;Запустить парсер
      </a>
    </div>

    <h2 class="secondary-heading">Запреты</h2>
    <v-card>
      <v-data-table-server
        :items="store.items"
        :headers="itemHeaders"
        :loading="store.loading"
        density="compact"
        class="elevation-1 single-line-table"
      />
    </v-card>

    <h2 class="secondary-heading" style="margin-top: 20px;">Исключения</h2>
    <v-card>
      <v-data-table-server
        :items="store.exceptions"
        :headers="exceptionHeaders"
        :loading="store.loading"
        density="compact"
        class="elevation-1 single-line-table"
      />
    </v-card>
  </div>
</template>
