<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { getErrorMessage } from '@/helpers/error.helpers.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Form } from 'vee-validate'
import router from '@/router'
import ActionButton from '@/components/ActionButton.vue'
import { useRegisterTotalsRefresh } from '@/composables/useRegisterTotalsRefresh.js'
import ActionDialog from '@/l2/ActionDialog.vue'
import { useActionDialog } from '@/composables/useActionDialog.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCustomsStationsStore } from '@/stores/customs.stations.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { getWeightCorrection } from '@/helpers/weight.correction.helpers.js'

const props = defineProps({
  id: { type: Number, required: true }
})

const registersStore = useRegistersStore()
const { refreshingTotals, refreshTotals } = useRegisterTotalsRefresh(() => props.id)
const companiesStore = useCompaniesStore()
const warehousesStore = useWarehousesStore()
const customsStationsStore = useCustomsStationsStore()
const alertStore = useAlertStore()

const { item, loading: registerLoading } = storeToRefs(registersStore)
const { companies, loading: companiesLoading, error: companiesError } = storeToRefs(companiesStore)
const {
  warehouses,
  loading: warehousesLoading,
  error: warehousesError
} = storeToRefs(warehousesStore)
const {
  customsStations,
  loading: customsStationsLoading,
  error: customsStationsError
} = storeToRefs(customsStationsStore)

const { actionDialogState, showActionDialog, hideActionDialog } = useActionDialog()
const isInitializing = ref(true)
const isSubmitting = ref(false)
const loadFailed = ref(false)

const senderCompanyId = ref(null)
const recipientCompanyId = ref(null)
const loadingWarehouseId = ref(null)
const loadingDate = ref('')
const carrierCompanyId = ref(null)
const deliveryWarehouseId = ref(null)
const vehicleRegistrationNumber = ref('')
const vehicleMakeModel = ref('')
const customsStationId = ref(null)
const documentDate = ref('')
const applyCmrWeightCorrection = ref(true)

const currentRegister = computed(() => (item.value?.id === props.id ? item.value : null))
const cmrWeightCorrection = computed(() => getWeightCorrection(currentRegister.value))
const showCmrWeightCorrection = computed(() => cmrWeightCorrection.value.canCorrect)
watch(() => currentRegister.value?.id, () => { applyCmrWeightCorrection.value = true })
const heading = computed(() => {
  const number = currentRegister.value?.invoiceNumber
  return number ? `Настройки CMR (${number})` : 'Настройки CMR'
})
const isReferencesLoading = computed(
  () =>
    isInitializing.value ||
    registerLoading.value ||
    companiesLoading.value ||
    warehousesLoading.value ||
    customsStationsLoading.value
)
const isFormDisabled = computed(
  () =>
    isReferencesLoading.value || isSubmitting.value || refreshingTotals.value || loadFailed.value || !currentRegister.value || currentRegister.value.derivedTotalsPending === true
)

function localToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isoDate(value) {
  if (!value) return ''
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : ''
}

function optionalId(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function optionalText(value) {
  const text = String(value || '').trim()
  return text || null
}

function companyLabel(company) {
  return company.shortName || company.name || String(company.id)
}

function customsStationLabel(station) {
  const number = station.number ? ` (${station.number})` : ''
  return `${station.name || station.id}${number}`
}

function initializeDefaults() {
  const register = currentRegister.value
  if (!register) return
  senderCompanyId.value = optionalId(register.senderId)
  recipientCompanyId.value = optionalId(register.recipientId)
  carrierCompanyId.value = optionalId(register.recipientId)
  loadingWarehouseId.value = null
  deliveryWarehouseId.value = null
  customsStationId.value = null
  loadingDate.value = localToday()
  documentDate.value = isoDate(register.invoiceDate) || localToday()
  vehicleRegistrationNumber.value = ''
  vehicleMakeModel.value = ''
}

function referenceError() {
  return (
    item.value?.error || companiesError.value || warehousesError.value || customsStationsError.value
  )
}

async function loadReferences() {
  isInitializing.value = true
  loadFailed.value = false
  try {
    await Promise.all([
      registersStore.getById(props.id),
      companiesStore.getAll(),
      warehousesStore.ensureLoaded(),
      customsStationsStore.getAll()
    ])

    const error = referenceError()
    if (error) throw error
    if (!currentRegister.value) throw new Error('Реестр не найден')
    if (Number(currentRegister.value.transportationTypeCode) !== 1) {
      throw new Error('CMR доступна только для автомобильных реестров')
    }
    initializeDefaults()
  } catch (error) {
    loadFailed.value = true
    alertStore.error(error, {
      fallback: 'Не удалось загрузить данные для CMR'
    })
  } finally {
    isInitializing.value = false
  }
}

function buildPayload() {
  return {
    senderCompanyId: optionalId(senderCompanyId.value),
    recipientCompanyId: optionalId(recipientCompanyId.value),
    carrierCompanyId: optionalId(carrierCompanyId.value),
    loadingWarehouseId: optionalId(loadingWarehouseId.value),
    deliveryWarehouseId: optionalId(deliveryWarehouseId.value),
    customsStationId: optionalId(customsStationId.value),
    loadingDate: loadingDate.value || null,
    vehicleRegistrationNumber: optionalText(vehicleRegistrationNumber.value),
    vehicleMakeModel: optionalText(vehicleMakeModel.value),
    documentDate: documentDate.value,
    applyWeightCorrection: showCmrWeightCorrection.value ? applyCmrWeightCorrection.value : true
  }
}

async function onSubmit() {
  if (isFormDisabled.value) return
  if (!documentDate.value) {
    alertStore.error('Дата документа обязательна')
    return
  }

  const payload = buildPayload()
  isSubmitting.value = true
  showActionDialog('download-cmr')
  try {
    await registersStore.downloadCmrFile(
      currentRegister.value.id,
      currentRegister.value.invoiceNumber,
      payload
    )
    router.go(-1)
  } catch (error) {
    alertStore.error(getErrorMessage(error, 'Не удалось сформировать CMR'))
  } finally {
    hideActionDialog()
    isSubmitting.value = false
  }
}

function onCancel() {
  if (!isSubmitting.value) router.go(-1)
}

onMounted(loadReferences)
</script>

<template>
  <div class="settings form-3 cmr-settings-dialog form-compact">
    <Form :initial-values="{}" @submit="onSubmit" @invalid-submit="focusFirstInvalidField">
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ heading }}</h1>
        <div class="header-actions-bar">
          <div
            v-if="isReferencesLoading || refreshingTotals || currentRegister?.derivedTotalsPending"
            class="header-actions header-actions-group"
            data-testid="register-totals-actions"
          >
            <span v-if="isReferencesLoading || refreshingTotals" class="spinner-border spinner-border-m"></span>
            <ActionButton
              v-if="currentRegister?.derivedTotalsPending"
              :item="{}"
              icon="fa-solid fa-arrows-rotate"
              icon-size="2x"
              tooltip-text="Обновить итоги"
              aria-label="Обновить итоги"
              :disabled="refreshingTotals || isSubmitting"
              @click="refreshTotals"
            />
          </div>
          <div class="header-actions header-actions-group">
            <ActionButton
              :item="{}"
              icon="fa-solid fa-check-double"
              icon-size="2x"
              tooltip-text="Сформировать"
              :disabled="isFormDisabled"
              @click="onSubmit"
            />
            <ActionButton
              :item="{}"
              icon="fa-solid fa-xmark"
              icon-size="2x"
              tooltip-text="Отменить"
              :disabled="isSubmitting"
              @click="onCancel"
            />
          </div>
        </div>
      </div>
      <hr class="hr" />

      <PageAlertRegion />

      <div class="form-section" data-testid="cmr-fields">
        <div class="form-row" data-testid="cmr-row-1">
          <div class="form-group">
            <label class="label" for="senderCompanyId">Отправитель:</label>
            <select
              id="senderCompanyId"
              v-model="senderCompanyId"
              class="form-control input"
              :disabled="isFormDisabled"
            >
              <option :value="null">Не выбрано</option>
              <option v-for="company in companies" :key="company.id" :value="company.id">
                {{ companyLabel(company) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="label" for="recipientCompanyId">Получатель:</label>
            <select
              id="recipientCompanyId"
              v-model="recipientCompanyId"
              class="form-control input"
              :disabled="isFormDisabled"
            >
              <option :value="null">Не выбрано</option>
              <option v-for="company in companies" :key="company.id" :value="company.id">
                {{ companyLabel(company) }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row" data-testid="cmr-row-2">
          <div class="form-group">
            <label class="label" for="loadingWarehouseId">Место погрузки:</label>
            <select
              id="loadingWarehouseId"
              v-model="loadingWarehouseId"
              class="form-control input"
              :disabled="isFormDisabled"
            >
              <option :value="null">Не выбрано</option>
              <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                {{ warehouse.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="label" for="loadingDate">Дата погрузки:</label>
            <input
              id="loadingDate"
              v-model="loadingDate"
              type="date"
              class="form-control input"
              :disabled="isFormDisabled"
            />
          </div>
        </div>

        <div class="form-row" data-testid="cmr-row-3">
          <div class="form-group">
            <label class="label" for="carrierCompanyId">Перевозчик:</label>
            <select
              id="carrierCompanyId"
              v-model="carrierCompanyId"
              class="form-control input"
              :disabled="isFormDisabled"
            >
              <option :value="null">Не выбрано</option>
              <option v-for="company in companies" :key="company.id" :value="company.id">
                {{ companyLabel(company) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="label" for="deliveryWarehouseId">Место разгрузки:</label>
            <select
              id="deliveryWarehouseId"
              v-model="deliveryWarehouseId"
              class="form-control input"
              :disabled="isFormDisabled"
            >
              <option :value="null">Не выбрано</option>
              <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
                {{ warehouse.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row" data-testid="cmr-row-4">
          <div class="form-group">
            <label class="label" for="vehicleRegistrationNumber"
              >Регистрац. номер тягач/полуприцеп:</label
            >
            <input
              id="vehicleRegistrationNumber"
              v-model="vehicleRegistrationNumber"
              type="text"
              class="form-control input"
              :disabled="isFormDisabled"
            />
          </div>
          <div class="form-group">
            <label class="label" for="vehicleMakeModel">Марка тягач/полуприцеп:</label>
            <input
              id="vehicleMakeModel"
              v-model="vehicleMakeModel"
              type="text"
              class="form-control input"
              :disabled="isFormDisabled"
            />
          </div>
        </div>

        <div class="form-row" data-testid="cmr-row-5">
          <div class="form-group">
            <label class="label" for="customsStationId">Таможенный пост:</label>
            <select
              id="customsStationId"
              v-model="customsStationId"
              class="form-control input"
              :disabled="isFormDisabled"
            >
              <option :value="null">Не выбрано</option>
              <option v-for="station in customsStations" :key="station.id" :value="station.id">
                {{ customsStationLabel(station) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="label" for="documentDate">Дата:</label>
            <input
              id="documentDate"
              v-model="documentDate"
              type="date"
              class="form-control input"
              required
              :disabled="isFormDisabled"
            />
          </div>
        </div>
        <div v-if="showCmrWeightCorrection" class="form-row-1 weight-correction-row">
          <div class="form-group weight-correction-group">
            <label class="custom-checkbox weight-correction-checkbox">
              <input
                v-model="applyCmrWeightCorrection"
                type="checkbox"
                class="custom-checkbox-input"
                :disabled="isFormDisabled"
              />
              <span class="custom-checkbox-box"></span>
              <span class="custom-checkbox-label">Применить поправочный коэффициент {{ cmrWeightCorrection.coefficientText }} к весу посылок.</span>
            </label>
          </div>
        </div>
      </div>
    </Form>

    <ActionDialog :action-dialog="actionDialogState" />
  </div>
</template>

<style scoped>
.cmr-settings-dialog {
  max-width: 1200px;
}

.cmr-settings-dialog .form-row {
  column-gap: 2rem;
}

.cmr-settings-dialog .label {
  width: 48%;
  min-width: 190px;
}

.weight-correction-row {
  margin-top: 0.5rem;
}

.weight-correction-group,
.weight-correction-checkbox {
  width: 100%;
}

.custom-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
}

.custom-checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.custom-checkbox-box {
  width: 16px;
  height: 16px;
  background-color: #1976d2;
  border-radius: 3px;
  position: relative;
  margin-top: 0.1rem;
}

.custom-checkbox-box:after {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 12px;
  height: 12px;
  background-image: url('@/assets/check-solid.svg');
  background-size: cover;
  opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  transform: translateY(-2px);
}

.custom-checkbox-input:checked ~ .custom-checkbox-box:after {
  opacity: 1;
  transform: translateY(0);
}

.custom-checkbox-label {
  flex: 1;
  white-space: normal;
}

.custom-checkbox:hover .custom-checkbox-box {
  background-color: #1565c0;
}

@media (max-width: 900px) {
  .cmr-settings-dialog .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
