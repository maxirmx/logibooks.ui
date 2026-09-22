<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, onMounted, reactive, ref } from 'vue'
import router from '@/router'
import ActionButton from '@/components/ActionButton.vue'
import { OFFERED_COMPANY_REGISTER_OUTPUT_TYPES } from '@/helpers/company.constants.js'
import { getRegisterTypeDisplayName } from '@/helpers/register.display.helpers.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'

const props = defineProps({ companyId: { type: Number, required: true } })
const companiesStore = useCompaniesStore()
const alertStore = useAlertStore()
const confirm = useAppConfirm()
const formats = reactive({})
const loading = ref(false)
const loaded = ref(false)
const deletingType = ref(null)
const headers = [
  { title: '', key: 'actions', sortable: false, width: '120px' },
  { title: 'Тип реестра', key: 'registerName', sortable: false },
  { title: 'Статус', key: 'status', sortable: false }
]
const rows = computed(() => OFFERED_COMPANY_REGISTER_OUTPUT_TYPES.map((registerType) => ({
  registerType,
  registerName: getRegisterTypeDisplayName(companiesStore.companies, registerType),
  status: formats[registerType] ? 'Настроен' : 'Не настроен'
})))

async function load() {
  loading.value = true
  try {
    const [results] = await Promise.all([
      Promise.all(OFFERED_COMPANY_REGISTER_OUTPUT_TYPES.map(async (registerType) => ({
        registerType,
        format: await companiesStore.getRegisterOutputFormat(props.companyId, registerType)
      }))),
      companiesStore.getAll()
    ])
    for (const { registerType, format } of results) formats[registerType] = format
    loaded.value = true
    return true
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Не удалось загрузить форматы выгрузки',
      action: { label: 'Повторить', handler: load }
    })
    return false
  } finally {
    loading.value = false
  }
}

async function edit(registerType) {
  try {
    await router.push(`/company/edit/${props.companyId}/register-output/${registerType}`)
    return true
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Не удалось открыть формат выгрузки',
      action: { label: 'Повторить', handler: () => edit(registerType) }
    })
    return false
  }
}

async function removeConfirmed(registerType) {
  if (deletingType.value != null) return false
  deletingType.value = registerType
  try {
    await companiesStore.deleteRegisterOutputFormat(props.companyId, registerType)
    formats[registerType] = null
    alertStore.success('Формат выгрузки удалён')
    return true
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Не удалось удалить формат выгрузки',
      action: { label: 'Повторить', handler: () => removeConfirmed(registerType) }
    })
    return false
  } finally {
    deletingType.value = null
  }
}

async function remove(registerType) {
  if (deletingType.value != null || !formats[registerType]) return false
  try {
    const confirmed = await confirm({
      title: 'Удалить формат выгрузки?',
      content: 'Для этого типа реестра останется обычный формат.',
      confirmationText: 'Удалить',
      cancellationText: 'Отменить'
    })
    if (!confirmed) return false
    return removeConfirmed(registerType)
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Не удалось подтвердить удаление формата',
      action: { label: 'Повторить', handler: () => remove(registerType) }
    })
    return false
  }
}

onMounted(() => { void load() })
</script>

<template>
  <section class="form-group register-output-summary" aria-labelledby="register-output-summary-label">
    <span id="register-output-summary-label" class="label">Форматы выгрузки реестров:</span>
    <div class="register-output-summary__content">
      <p v-if="loading" role="status">Загрузка форматов…</p>
      <v-card v-if="loaded" class="table-card">
        <v-data-table
          :headers="headers"
          :items="rows"
          item-value="registerType"
          :items-per-page="-1"
          hide-default-footer
          density="compact"
          class="elevation-1 interlaced-table register-output-summary__table"
        >
          <template v-slot:[`item.actions`]="{ item }">
            <div class="actions-container">
              <ActionButton
                :item="item.registerType"
                icon="fa-solid fa-pen"
                icon-size="1x"
                :tooltip-text="formats[item.registerType] ? 'Изменить формат' : 'Настроить формат'"
                :disabled="loading || deletingType != null"
                :data-testid="`register-output-edit-${item.registerType}`"
                @click="edit(item.registerType)"
              />
              <ActionButton
                v-if="formats[item.registerType]"
                :item="item.registerType"
                icon="fa-solid fa-trash-can"
                icon-size="1x"
                tooltip-text="Удалить формат"
                :disabled="loading || deletingType != null"
                :data-testid="`register-output-delete-${item.registerType}`"
                @click="remove(item.registerType)"
              />
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>
  </section>
</template>

<style scoped>
.register-output-summary { align-items: flex-start; margin-top: 2rem; overflow: visible; }
.register-output-summary__content { flex: 1 1 0; min-width: 0; }
@media (max-width: 700px) {
  .register-output-summary { flex-direction: column; }
  .register-output-summary > .label { width: 100%; }
  .register-output-summary__content { width: 100%; }
}
</style>
