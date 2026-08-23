<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref, watch } from 'vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import RestrictionScopeEditor from '@/components/RestrictionScopeEditor.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import {
  APP_DIALOG_BUTTON_PROPS,
  APP_DIALOG_MAX_WIDTH,
  APP_DIALOG_SIZES
} from '@/helpers/dialog.helpers.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  order: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])
const alertStore = useAlertStore()
const countriesStore = useCountriesStore()
const feacnStore = useFeacnOrdersStore()
const scopes = ref([])
const saving = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const validationError = computed(() => {
  if (scopes.value.some((scope) => scope.countryIsoNumeric == null)) {
    return 'Укажите страну для каждой области действия'
  }
  if (scopes.value.some((scope) => ![10, 40].includes(Number(scope.customsProcedureCode)))) {
    return 'Укажите поддерживаемую таможенную процедуру'
  }
  const keys = scopes.value.map(
    (scope) => `${Number(scope.countryIsoNumeric)}:${Number(scope.customsProcedureCode)}`
  )
  if (new Set(keys).size !== keys.length) {
    return 'Одинаковые страна и процедура не могут повторяться'
  }
  return null
})

const visibleValidationError = computed(() =>
  validationError.value?.includes('не могут повторяться') ? null : validationError.value
)

watch(
  () => [props.modelValue, props.order],
  ([open]) => {
    if (!open) return
    scopes.value = (props.order?.scopes || []).map((scope) => ({ ...scope }))
    countriesStore.ensureLoaded().catch(() => {
      alertStore.error('Не удалось загрузить список стран')
    })
  },
  { immediate: true }
)

function close() {
  if (!saving.value) isOpen.value = false
}

async function save() {
  if (saving.value || validationError.value || !props.order) return
  saving.value = true
  try {
    const payload = scopes.value.map((scope) => ({
      countryIsoNumeric: Number(scope.countryIsoNumeric),
      customsProcedureCode: Number(scope.customsProcedureCode),
      explanation: scope.explanation?.trim() || null
    }))
    await feacnStore.updateScopes(props.order.id, payload)
    emit('saved')
    isOpen.value = false
  } catch (error) {
    alertStore.error(error)
  } finally {
    saving.value = false
  }
}

defineExpose({ scopes, validationError, save, close })
</script>

<template>
  <v-dialog
    v-model="isOpen"
    :width="APP_DIALOG_SIZES.workflow"
    :max-width="APP_DIALOG_MAX_WIDTH"
    persistent
    aria-label="Области действия нормативного документа"
  >
    <AppDialogFrame :title="`Области действия: ${order?.title || ''}`">
      <PageAlertRegion />
      <RestrictionScopeEditor
        v-model="scopes"
        :countries="countriesStore.countries"
        :disabled="saving"
      />
      <div v-if="visibleValidationError" class="invalid-feedback scope-validation-error">
        {{ visibleValidationError }}
      </div>

      <template #actions>
        <v-btn v-bind="APP_DIALOG_BUTTON_PROPS.secondary" :disabled="saving" @click="close">
          Отмена
        </v-btn>
        <v-btn
          v-bind="APP_DIALOG_BUTTON_PROPS.primary"
          :loading="saving"
          :disabled="saving || Boolean(validationError)"
          data-testid="save-order-scopes"
          @click="save"
        >
          Сохранить
        </v-btn>
      </template>
    </AppDialogFrame>
  </v-dialog>
</template>

<style scoped>
.scope-validation-error {
  display: block;
  margin-top: 0.75rem;
}
</style>
