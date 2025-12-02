<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { useFeacnPrefixesStore } from '@/stores/feacn.prefixes.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useParcelViewsStore } from '@/stores/parcel.views.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { storeToRefs } from 'pinia'
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { wbrRegisterColumnTitles, wbrRegisterColumnTooltips } from '@/helpers/wbr.register.mapping.js'
import { getCheckStatusInfo, getCheckStatusClass } from '@/helpers/parcels.check.helpers.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import WbrFormField from '@/components/WbrFormField.vue'
import { ensureHttps } from '@/helpers/url.helpers.js'
import ActionButton from '@/components/ActionButton.vue'
import ParcelHeaderActionsBar from '@/components/ParcelHeaderActionsBar.vue'
import CheckStatusActionsBar from '@/components/CheckStatusActionsBar.vue'
import FeacnCodeEditor from '@/components/FeacnCodeEditor.vue'
import ParcelNumberExt from '@/components/ParcelNumberExt.vue'
import { handleFellowsClick } from '@/helpers/parcel.number.ext.helpers.js'
import {
  validateParcelData,
  approveParcel as approveParcelHelper,
  approveParcelWithExcise as approveParcelWithExciseHelper,
  generateXml as generateXmlHelper
} from '@/helpers/parcel.actions.helpers.js'
import { DEC_REPORT_UPLOADED_EVENT } from '@/helpers/dec.report.events.js'
import { SwValidationMatchMode } from '@/models/sw.validation.match.mode.js'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

// track current parcel id so we can swap inline without changing route
const currentParcelId = ref(props.id)
const isComponentMounted = ref(true)

const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const authStore = useAuthStore()
const statusStore = useParcelStatusesStore()
const stopWordsStore = useStopWordsStore()
const keyWordsStore = useKeyWordsStore()
const feacnOrdersStore = useFeacnOrdersStore()
const feacnPrefixesStore = useFeacnPrefixesStore()
const countriesStore = useCountriesStore()
const parcelViewsStore = useParcelViewsStore()

await statusStore.ensureLoaded()
await stopWordsStore.ensureLoaded()
await keyWordsStore.ensureLoaded()
await feacnOrdersStore.ensureLoaded()
await feacnPrefixesStore.ensureLoaded()
await countriesStore.ensureLoaded()
// load initial parcel by currentParcelId
await parcelsStore.getById(currentParcelId.value)
await parcelViewsStore.add(currentParcelId.value)

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

// Set the selected parcel ID in auth store
authStore.selectedParcelId = currentParcelId.value

const { item } = storeToRefs(parcelsStore)
const { stopWords } = storeToRefs(stopWordsStore)
const { orders: feacnOrders } = storeToRefs(feacnOrdersStore)
const { prefixes: feacnPrefixes } = storeToRefs(feacnPrefixesStore)
const { countries } = storeToRefs(countriesStore)

// Track loading state from store and running actions
const { loading } = storeToRefs(parcelsStore)
const runningAction = ref(false)

// Pre-fetch next parcels - will be populated in onMounted
const nextParcelsResult = ref({ withoutIssues: null, withIssues: null })
let nextParcelsPromise = null
let nextParcelsParcelId = null

function initNextParcelsPromise(id) {
  if (nextParcelsPromise != null && nextParcelsParcelId === id) {
    // already initialized for this parcel
    return
  }

  nextParcelsParcelId = id
  nextParcelsResult.value = { withoutIssues: null, withIssues: null }

  nextParcelsPromise = registersStore
    .nextParcels(id)
    .then(result => {
      nextParcelsResult.value = result
      return result
    })
}

function ensureNextParcelsPromise() {
  if (!nextParcelsPromise) {
    initNextParcelsPromise(currentParcelId.value)
  }
  return nextParcelsPromise
}

// Reactive reference to track current statusId for color updates
const currentStatusId = ref(null)

// Track overlay state for disabling form elements
const overlayActive = ref(false)

// Watch for changes in item.statusId to initialize currentStatusId
watch(() => item.value?.statusId, (newStatusId) => {
  currentStatusId.value = newStatusId
}, { immediate: true })

const productLinkWithProtocol = computed(() => ensureHttps(item.value?.productLink))

const isDescriptionVisible = ref(false)

// Pre-fetch next parcels after component is mounted
onMounted(() => {
  window.addEventListener(DEC_REPORT_UPLOADED_EVENT, refreshParcelAfterReportUpload)
  initNextParcelsPromise(currentParcelId.value)
})

onUnmounted(() => {
  isComponentMounted.value = false
  window.removeEventListener(DEC_REPORT_UPLOADED_EVENT, refreshParcelAfterReportUpload)
})

const schema = Yup.object().shape({
  statusId: Yup.number().required('Необходимо выбрать статус'),
  tnVed: Yup.string()
    .required('Необходимо указать ТН ВЭД')
    .matches(/^\d{10}$/, 'Код ТН ВЭД должен содержать ровно 10 цифр'),
  countryCode: Yup.number().required('Необходимо выбрать страну'),
  invoiceDate: Yup.date().nullable(),
  weightKg: Yup.number().nullable().min(0, 'Вес не может быть отрицательным'),
  quantity: Yup.number().nullable().min(0, 'Количество не может быть отрицательным'),
  unitPrice: Yup.number().nullable().min(0, 'Цена не может быть отрицательной')
})


async function validateParcel(values, sw, matchMode) {
  if (!isComponentMounted.value || runningAction.value) return
  runningAction.value = true
  try {
    // Wait for next parcels info to complete before calling helper
    await ensureNextParcelsPromise()
    
    await validateParcelData(values, item, parcelsStore, sw, matchMode)
  } catch (error) {
    alertStore.error(error?.message || String(error))
  } finally {
    if (isComponentMounted.value) runningAction.value = false
  }
}

// Approve the parcel
async function approveParcel(values) {
  if (!isComponentMounted.value || runningAction.value) return
  runningAction.value = true
  try {
    // Wait for next parcels info to complete before calling helper
    await ensureNextParcelsPromise()
    
    await approveParcelHelper(values, item, parcelsStore)
  } catch (error) {
    alertStore.error(error?.message || String(error))
  } finally {
    if (isComponentMounted.value) runningAction.value = false
  }
}

// Approve the parcel with excise
async function approveParcelWithExcise(values) {
  if (!isComponentMounted.value || runningAction.value) return
  runningAction.value = true
  try {
    // Wait for next parcels info to complete before calling helper
    await ensureNextParcelsPromise()

    await approveParcelWithExciseHelper(values, item, parcelsStore)
  } catch (error) {
    alertStore.error(error?.message || String(error))
  } finally {
    if (isComponentMounted.value) runningAction.value = false
  }
}

async function refreshParcelAfterReportUpload() {
  if (!isComponentMounted.value || runningAction.value) return
  runningAction.value = true

  try {
    await parcelsStore.getById(currentParcelId.value)
  } catch (error) {
    alertStore.error(error?.message || String(error))
  } finally {
    if (isComponentMounted.value) runningAction.value = false
  }
}

// Handle saving and moving to the next parcel
async function onSubmit(values, useTheNext = false) {
  if (!isComponentMounted.value || runningAction.value || currentParcelId.value != values.id) return
  runningAction.value = true
  try {
    await parcelsStore.update(currentParcelId.value, values)

    // Wait for the appropriate next parcel promise to resolve
    const nextParcels = await ensureNextParcelsPromise()
    const nextParcel = useTheNext
      ? nextParcels?.withoutIssues
      : nextParcels?.withIssues

    if (nextParcel) {
      // Inline swap: set item, update current id and authStore,
      // re-init neighbor promises.
      item.value = nextParcel
      currentParcelId.value = nextParcel.id
      authStore.selectedParcelId = nextParcel.id

      // re-init neighbor promises for the newly active parcel
      initNextParcelsPromise(currentParcelId.value)

      // update URL without remount
      const newUrl = `/registers/${props.registerId}/parcels/edit/${nextParcel.id}`
      router.replace(newUrl)

      // fetch full parcel data 
      // await parcelsStore.getById(nextParcel.id)
    } else {
      const fallbackUrl = `/registers/${props.registerId}/parcels`
      router.push(fallbackUrl)
    }
  } catch (error) {
    alertStore.error(error?.message || String(error))
  } finally {
    if (isComponentMounted.value) runningAction.value = false
  }
}

function onSave(values) {
  return parcelsStore
    .update(currentParcelId.value, values)
    .then(() => {
      router.push(`/registers/${props.registerId}/parcels`)
    })
    .catch((error) => {
      alertStore.error(error?.message || String(error))
    })
}

// Save current parcel and navigate to the previous one if available
async function onBack(values) {
  if (!isComponentMounted.value || runningAction.value || currentParcelId.value != values.id) return
  runningAction.value = true
  try {
    // Wait for next parcels info to complete before processing
    await ensureNextParcelsPromise()
    await parcelsStore.update(currentParcelId.value, values)
    const prevParcel = await parcelViewsStore.back()

    if (prevParcel) {
      // Inline swap to previous parcel: preview -> set item, update id and auth
      item.value = prevParcel
      currentParcelId.value = prevParcel.id
      authStore.selectedParcelId = prevParcel.id

      // re-init next parcels promise for the newly active parcel
      initNextParcelsPromise(currentParcelId.value)

      // fetch full parcel data in background
      // update URL without remount
      const prevUrl = `/registers/${props.registerId}/parcels/edit/${prevParcel.id}`
      router.replace(prevUrl)

    } else {
      const fallbackUrl = `/registers/${props.registerId}/parcels`
      router.push(fallbackUrl)
    }
  } catch (error) {
    alertStore.error(error?.message || String(error))
  } finally {
    if (isComponentMounted.value) runningAction.value = false
  }
}

// Generate XML for this parcel
async function generateXml(values) {
  if (!isComponentMounted.value || runningAction.value || currentParcelId.value != values.id) return
  runningAction.value = true
  try {
    // Wait for next parcels info to complete before calling helper
    const updatePromise = parcelsStore.update(currentParcelId.value, values)
    await Promise.all([ensureNextParcelsPromise(), updatePromise])
    
    await generateXmlHelper(item, parcelsStore, String(item.value?.shk || '').padStart(20, '0'))
  } catch (error) {
    alertStore.error(error?.message || String(error))
  } finally {
    if (isComponentMounted.value) runningAction.value = false
  }
}

// Handle fellows click - redirect to parcels list with filter
function handleFellows() {
  if (!isComponentMounted.value) return
  handleFellowsClick(item.value.registerId, item.value.shk)
}

// Lookup FEACN codes triggered from header actions
async function onLookup(values) {
  if (!isComponentMounted.value || runningAction.value || currentParcelId.value != values.id) return
  runningAction.value = true
  try {
    // Wait for neighbor promises if present
    await ensureNextParcelsPromise()

    await parcelsStore.update(currentParcelId.value, values)
    await parcelsStore.lookupFeacnCode(currentParcelId.value)
  } catch (error) {
    alertStore.error(error?.message || String(error))
  } finally {
    if (isComponentMounted.value) {
      await parcelsStore.getById(currentParcelId.value)
      runningAction.value = false
    }
  }
}

//       :key="currentParcelId" 


</script>

<template>
  <div class="settings form-4 form-compact">
    <Form
      @submit="onSubmit" 
      :initial-values="item" 
      :validation-schema="schema" 
      v-slot="{ errors, values, isSubmitting, setFieldValue }" 
      :class="{ 'form-disabled': overlayActive }"
    >
    <div class="header-with-actions">
      <h1 class="primary-heading">
        {{ item?.id ? `№ ${item.id} -- ` : '' }} посылка {{ item?.shk ? item.shk : '[без номера]' }}
      </h1>
      <!-- Action buttons moved inside Form scope -->
      <ParcelHeaderActionsBar
        :disabled="isSubmitting || runningAction || loading"
        :download-disabled="isSubmitting || runningAction || loading || CheckStatusCode.hasIssues(item?.checkStatus) || item?.blockedByFellowItem"
        @next-parcel="onSubmit(values, true)"
        @next-problem="onSubmit(values, false)"
        @back="onBack(values)"
        @save="onSave(values)"
        @lookup="onLookup(values)"
        @cancel="router.push(`/registers/${props.registerId}/parcels`)"
        @download="generateXml(values)"
      />
    </div>
    
    <hr class="hr" />
      
      <!-- Order Identification & Status Section -->
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="statusId" class="label">{{ wbrRegisterColumnTitles.statusId }}:</label>
            <Field as="select" name="statusId" id="statusId" class="form-control input"
                 @change="(e) => currentStatusId = parseInt(e.target.value)">
              <option v-for="s in statusStore.parcelStatuses" :key="s.id" :value="s.id">{{ s.title }}</option>
            </Field>
          </div>
          <div class="form-group">
            <label for="checkStatus" class="label">{{ wbrRegisterColumnTitles.checkStatus }}:</label>
            <div class="readonly-field status-cell" :class="getCheckStatusClass(item?.checkStatus)" name="checkStatus" id="checkStatus">
              <font-awesome-icon
                class="bookmark-icon"
                icon="fa-solid fa-bookmark"
                v-if="CheckStatusCode.isInheritedSw(item.checkStatus)"
              />
              {{ new CheckStatusCode(item?.checkStatus).toString() }}
            </div>
            <CheckStatusActionsBar
              :item="item"
              :values="values"
              :disabled="isSubmitting || runningAction || loading"
              @validate-sw="(vals) => validateParcel(vals, true, SwValidationMatchMode.NoSwMatch)"
              @validate-sw-ex="(vals) => validateParcel(vals, true, SwValidationMatchMode.SwMatch)"
              @validate-fc="(vals) => validateParcel(vals, false)"
              @approve="approveParcel"
              @approve-excise="approveParcelWithExcise"
            />
          </div>
          <!-- Last view -->
          <div class="form-group">
            <label for="lastView" class="label">Последний просмотр:</label>
            <div class="readonly-field" id="lastView" name="lastView">
              {{ item?.dTime ? new Date(item.dTime).toLocaleString() : '' }}
            </div>
          </div>          
          <!-- Stopwords information when there are issues -->
          <div v-if="getCheckStatusInfo(item, feacnOrders, stopWords, feacnPrefixes)" 
              :class="['form-group',  CheckStatusCode.hasIssues(item?.checkStatus) ? 'stopwords-info' : 'stopwords-info-approved']">
            <div :class="CheckStatusCode.hasIssues(item?.checkStatus) ? 'stopwords-text' : 'stopwords-text-approved'">
              {{ getCheckStatusInfo(item, feacnOrders, stopWords, feacnPrefixes) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Feacn Code Section -->
      <FeacnCodeEditor
        :item="item"
        :values="values"
        :errors="errors"
        :isSubmitting="isSubmitting"
        :columnTitles="wbrRegisterColumnTitles"
        :columnTooltips="wbrRegisterColumnTooltips"
        :setFieldValue="setFieldValue"
        :runningAction="runningAction"
        @update:item="(updatedItem) => (item.value = updatedItem)"
        @overlay-state-changed="overlayActive = $event"
        @set-running-action="runningAction = $event"
      />

      <!-- Product Name and description Section -->
      <div class="form-section">
        <div class="form-row-1 product-name-row">
          <ActionButton
            :item="item"
            :icon="isDescriptionVisible ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'"
            :tooltip-text="isDescriptionVisible ? 'Скрыть описание' : 'Показать описание'"
            @click="isDescriptionVisible = !isDescriptionVisible"
            :iconSize="'1x'"
          />
          <label for="productName" class="label-1 product-name-label">
            {{ wbrRegisterColumnTitles.productName }}:
          </label>
          <Field
            name="productName"
            id="productName"
            :class="['form-control', 'input-1', { 'is-invalid': errors && errors.productName }]"
          />
        </div>
        <div class="form-row-0" v-show="isDescriptionVisible">
          <div class="form-group-0">
            <label for="description" class="label-0">Описание:</label>
            <Field
              as="textarea"
              name="description"
              id="description"
              rows="5"
              class="form-control input-0"
              :class="{ 'is-invalid': errors && errors.description }"
            />
          </div>
        </div>
      </div>

      <!-- Product Identification & Details Section -->
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="shk" class="label">{{ wbrRegisterColumnTitles.shk }}:</label>
            <ParcelNumberExt 
              :item="item"
              field-name="shk"
              :disabled="isSubmitting || runningAction || loading"
              class="readonly-parcel-number"
              @click="() => {/* No action needed for readonly display */}"
              @fellows="handleFellows"
            />
          </div>          

          <div class="form-group">
            <label class="label">{{ wbrRegisterColumnTitles.productLink }}:</label>
            <a
              v-if="item?.productLink"
              :href="productLinkWithProtocol"
              target="_blank"
              rel="noopener noreferrer"
              class="product-link-inline"
            >
              {{ productLinkWithProtocol }}
            </a>
            <span v-else class="no-link">Ссылка отсутствует</span>
          </div>
          <WbrFormField name="countryCode" as="select" :errors="errors" :fullWidth="false">
            <option value="">Выберите страну</option>
            <option v-for="country in countries" :key="country.id" :value="country.isoNumeric">
              {{ country.nameRuOfficial }}
            </option>
          </WbrFormField>
          <WbrFormField name="weightKg" type="number" step="1.0" :errors="errors" :fullWidth="false" />
          <WbrFormField name="quantity" type="number" step="1.0" :errors="errors" :fullWidth="false" />
          <WbrFormField name="unitPrice" type="number" step="1.0" :errors="errors" :fullWidth="false" />
          <WbrFormField name="currency" :errors="errors" :fullWidth="false" />
        </div>
        <div class="form-row">
          <WbrFormField name="recipientName" :errors="errors" :fullWidth="false" />
          <WbrFormField name="passportNumber" :errors="errors" :fullWidth="false" />
        </div>
      </div>
      <!-- DTag -->
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="dtag" class="label">ДТЭГ/ПТДЭГ:</label>
            <div class="form-control input readonly-field" id="dtag" name="dtag">
              {{ item?.dTag ? item.dTag : '-' }}
            </div>
          </div>
          <div class="form-group" v-if="item?.dTagComment != null">
            <div class="form-control input readonly-field" id="dtagComment" name="dtagComment">
              {{ item?.dTagComment ? item.dTagComment : '' }}
            </div>
          </div>
        </div>
        <div class="form-row"  v-if="item?.previousDTagComment != null">
          <div class="form-group">
            <div class="form-control input readonly-field" id="previousDDtagComment" name="previousDDtagComment">
              {{ item?.previousDTagComment ? item.previousDTagComment : '' }}
            </div>
          </div>
        </div>
      </div>

    </Form>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка: {{ item.error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable text-center m-5" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
/* Header with actions layout */
.header-with-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

/* Primary heading with ellipsis */
.primary-heading {
  margin: 0;
  flex: 1;
  min-width: 0; /* Allow shrinking */
  
  /* Ellipsis on overflow */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  /* Ensure it takes available space but can shrink */
  max-width: calc(100% - 300px); /* Reserve space for buttons */
}

.form-section,
.form-row,
.form-group {
  overflow: visible !important;
}

/* On small screens, ensure full width for heading and buttons flow below */
@media (max-width: 768px) {
  .header-with-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .primary-heading {
    max-width: 100%;
    margin-bottom: 0.5rem;
  }
}

/* Product name styling */
.product-name-label {
  width: calc(18.5% - 50px);
  min-width: 140px;
}

/* Override product name row alignment */
.product-name-row {
  display: flex;
  align-items: center;
}

/* Overlay state styling */
.form-disabled .form-control,
.form-disabled button,
.form-disabled select,
.form-disabled textarea,
.form-disabled .v-field,
.form-disabled .v-btn {
  pointer-events: none;
  opacity: 0.5;
  cursor: not-allowed;
}

.form-disabled .feacn-search-wrapper {
  pointer-events: auto;
  opacity: 1;
}

.bookmark-icon {
  font-size: 0.9em;
  margin-right: 6px;
}

</style>
