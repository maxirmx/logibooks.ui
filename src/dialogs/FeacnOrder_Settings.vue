<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, ref } from 'vue'
import router from '@/router'
import ActionButton from '@/components/ActionButton.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import RestrictionScopeEditor from '@/components/RestrictionScopeEditor.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'

const props = defineProps({
  orderId: {
    type: Number,
    required: true
  }
})

const alertStore = useAlertStore()
const countriesStore = useCountriesStore()
const feacnStore = useFeacnOrdersStore()
const order = ref(null)
const scopes = ref([])
const loading = ref(false)
const saving = ref(false)

const scopeErrors = computed(() => {
  const errors = {}
  scopes.value.forEach((scope, index) => {
    if (scope.countryIsoNumeric == null) {
      errors[`scopes[${index}].countryIsoNumeric`] = 'Выберите страну'
    }
    if (![10, 40].includes(Number(scope.customsProcedureCode))) {
      errors[`scopes[${index}].customsProcedureCode`] = 'Выберите процедуру'
    }
  })
  return errors
})

const hasDuplicateScopes = computed(() => {
  const keys = scopes.value.map(
    (scope) => `${Number(scope.countryIsoNumeric)}:${Number(scope.customsProcedureCode)}`
  )
  return new Set(keys).size !== keys.length
})

const validationError = computed(
  () => Object.keys(scopeErrors.value).length > 0 || hasDuplicateScopes.value
)

async function initialize() {
  loading.value = true
  order.value = null
  try {
    const [loadedOrder] = await Promise.all([
      feacnStore.getById(props.orderId),
      countriesStore.ensureLoaded()
    ])
    order.value = loadedOrder
    scopes.value = (loadedOrder.scopes || []).map((scope) => ({
      countryIsoNumeric: scope.countryIsoNumeric,
      customsProcedureCode: scope.customsProcedureCode
    }))
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Не удалось загрузить правила применения нормативного документа',
      action: { label: 'Повторить', handler: initialize }
    })
  } finally {
    loading.value = false
  }
}

async function save() {
  if (loading.value || saving.value || !order.value || validationError.value) return
  saving.value = true
  try {
    const payload = scopes.value.map((scope) => ({
      countryIsoNumeric: Number(scope.countryIsoNumeric),
      customsProcedureCode: Number(scope.customsProcedureCode)
    }))
    await feacnStore.updateScopes(props.orderId, payload)
    await router.push('/feacn/orders')
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Не удалось сохранить правила применения нормативного документа'
    })
  } finally {
    saving.value = false
  }
}

function cancel() {
  if (!loading.value && !saving.value) router.push('/feacn/orders')
}

onMounted(initialize)

defineExpose({ order, scopes, loading, saving, validationError, initialize, save, cancel })
</script>

<template>
  <div class="settings form-3" data-testid="feacn-order-settings">
    <div class="header-with-actions">
      <h1 class="primary-heading">Правила применения нормативного документа</h1>
      <div class="header-actions">
        <ActionButton
          :item="null"
          icon="fa-solid fa-check-double"
          icon-size="2x"
          tooltip-text="Сохранить"
          :disabled="loading || saving || !order || validationError"
          data-testid="feacn-order-save-action"
          @click="save"
        />
        <ActionButton
          :item="null"
          icon="fa-solid fa-xmark"
          icon-size="2x"
          tooltip-text="Отменить"
          :disabled="loading || saving"
          data-testid="feacn-order-cancel-action"
          @click="cancel"
        />
      </div>
    </div>
    <hr class="hr" />

    <PageAlertRegion />

    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>

    <form v-else-if="order" @submit.prevent="save">
      <div class="form-group">
        <label class="label">Нормативный документ:</label>
        <div class="readonly-field feacn-order-title">{{ order.title }}</div>
      </div>

      <div class="form-group">
        <RestrictionScopeEditor
          v-model="scopes"
          :countries="countriesStore.countries"
          :disabled="saving"
          :errors="scopeErrors"
          :explanations-enabled="false"
        />
      </div>
    </form>
  </div>
</template>

<style scoped>
.feacn-order-title {
  align-items: flex-start;
  height: auto;
  min-height: 2.25rem;
  padding-top: 0.45rem;
  padding-bottom: 0.45rem;
  line-height: 1.4;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
