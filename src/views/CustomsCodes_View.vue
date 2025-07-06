<script setup>
import { onMounted } from 'vue'
import { useAltaStore } from '@/stores/alta.store.js'
import CustomsCodesList from '@/components/CustomsCodes_List.vue'

const store = useAltaStore()

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

    <CustomsCodesList
      title="Запреты"
      :items="store.items"
      :loading="store.loading"
      :error="store.error"
    />

    <CustomsCodesList
      title="Исключения"
      :items="store.exceptions"
      :loading="store.loading"
      :error="store.error"
    />
  </div>
</template>
