<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref, watch, onBeforeUnmount } from 'vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import ActionButton from '@/components/ActionButton.vue'
import OzonParcelEditDialog from '@/dialogs/OzonParcel_EditDialog.vue'
import WbrParcelEditDialog from '@/dialogs/WbrParcel_EditDialog.vue'
import WbrNParcelEditDialog from '@/dialogs/WbrNParcel_EditDialog.vue'
import GtcParcelEditDialog from '@/dialogs/GtcParcel_EditDialog.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, GTC_COMPANY_ID, WBRN_REGISTER_ID } from '@/helpers/company.constants.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { isImportCustomsProcedure } from '@/helpers/customs.procedure.helpers.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelCheckStatusSubscription } from '@/composables/useParcelCheckStatusSubscription.js'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { reportError } from '@/helpers/error.helpers.js'
import { navigateParcel, resolveParcelReturnLocation } from '@/helpers/parcel.navigation.helpers.js'
import router from '@/router'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true },
  mode: { type: String, default: OP_MODE_PAPERWORK },
  returnUrl: { type: String, default: null },
  boxId: { type: Number, default: null }
})

const register = ref(null)
const loading = ref(true)
const error = ref(null)
const isComponentMounted = ref(true)
let registerRequestSequence = 0
const authStore = useAuthStore()
const parcelsStore = useParcelsStore()
const alertStore = useAlertStore()
const passportSubscriptionEnabled = computed(() =>
  !loading.value &&
  authStore.isSrLogistPlus &&
  isImportCustomsProcedure(register.value?.customsProcedureCode)
)

useParcelCheckStatusSubscription({
  registerId: computed(() => props.registerId),
  enabled: passportSubscriptionEnabled,
  refresh: refreshParcel
})

async function refreshParcel() {
  if (!isComponentMounted.value) return false
  const id = props.id
  const sequence = registerRequestSequence
  try {
    await parcelsStore.getById(id)
    return true
  } catch (error) {
    if (isComponentMounted.value && id === props.id && sequence === registerRequestSequence) {
      alertStore.error(error, {
        fallback: 'Не удалось обновить данные посылки',
        action: { label: 'Повторить', handler: refreshParcel }
      })
    } else {
      // A refresh from the previous editor must not notify the destination page.
      reportError(error, { context: 'parcel refresh after editor disposal or replacement' })
    }
    return false
  }
}

const editComponent = computed(() => {
  if (!isComponentMounted.value || !register.value) return null
  const registerType = register.value.registerType
  if (registerType === OZON_COMPANY_ID) return OzonParcelEditDialog
  if (registerType === WBR_COMPANY_ID) return WbrParcelEditDialog
  if (registerType === GTC_COMPANY_ID) return GtcParcelEditDialog
  if (registerType === WBRN_REGISTER_ID) return WbrNParcelEditDialog
  return null
})

async function loadRegister() {
  if (!isComponentMounted.value) return
  const sequence = ++registerRequestSequence
  const id = props.registerId
  loading.value = true
  error.value = null
  try {
    const result = await fetchWrapper.get(`${apiUrl}/registers/${id}`)
    if (isComponentMounted.value && sequence === registerRequestSequence) register.value = result
  } catch (err) {
    if (isComponentMounted.value && sequence === registerRequestSequence) {
      error.value = err
      alertStore.error(err, {
        fallback: 'Не удалось загрузить реестр',
        action: { label: 'Повторить', handler: loadRegister }
      })
    } else {
      // The register request may finish after a route change or unmount.
      reportError(err, { context: 'parcel register load after disposal or replacement' })
    }
  } finally {
    if (isComponentMounted.value && sequence === registerRequestSequence) {
      loading.value = false
    }
  }
}

async function close() {
  try {
    await navigateParcel(router, resolveParcelReturnLocation({
      registerId: props.registerId,
      parcelId: props.id,
      mode: props.mode,
      returnUrl: props.returnUrl,
      boxId: props.boxId
    }))
  } catch (error) {
    alertStore.error(error, { fallback: 'Не удалось закрыть карточку посылки' })
  }
}

watch(() => props.registerId, loadRegister, { immediate: true })

onBeforeUnmount(() => {
  isComponentMounted.value = false
  ++registerRequestSequence
})
</script>

<template>
  <div v-if="loading || error || !editComponent" class="settings form-4 form-compact">
    <div class="header-with-actions">
      <h1 class="primary-heading responsive-edit-heading">Посылка № {{ props.id }}</h1>
      <ActionButton :item="{}" icon="fa-solid fa-xmark" tooltip-text="Закрыть" @click="close" />
    </div>
    <hr class="hr" />
    <PageAlertRegion />
    <div v-if="loading" role="status">Загрузка...</div>
    <div v-else-if="!error">Неизвестный тип компании</div>
  </div>
  <component
      v-else
      :is="editComponent" 
      :key="`${props.registerId}:${props.id}`"
      :register-id="props.registerId" 
      :id="props.id"
      :mode="props.mode"
      :return-url="props.returnUrl"
      :box-id="props.boxId"
  />
</template>
