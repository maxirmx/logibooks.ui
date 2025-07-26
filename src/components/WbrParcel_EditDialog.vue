<script setup>
import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { storeToRefs } from 'pinia'
import { ref, watch, computed } from 'vue'
import { wbrRegisterColumnTitles, wbrRegisterColumnTooltips } from '@/helpers/wbr.register.mapping.js'
import { HasIssues, getCheckStatusInfo } from '@/helpers/orders.check.helper.js'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

const parcelsStore = useParcelsStore()
const statusStore = useParcelStatusesStore()
const parcelCheckStatusStore = useParcelCheckStatusStore()
const stopWordsStore = useStopWordsStore()
const feacnCodesStore = useFeacnCodesStore()
const countriesStore = useCountriesStore()

const { item } = storeToRefs(parcelsStore)
const { stopWords } = storeToRefs(stopWordsStore)
const { orders: feacnOrders } = storeToRefs(feacnCodesStore)
const { countries } = storeToRefs(countriesStore)

// Reactive reference to track current statusId for color updates
const currentStatusId = ref(null)

// Watch for changes in item.statusId to initialize currentStatusId
watch(() => item.value?.statusId, (newStatusId) => {
  currentStatusId.value = newStatusId
}, { immediate: true })

function getCountryAlpha2(code) {
  const num = Number(code)
  const country = countries.value.find(c => c.isoNumeric === num)
  return country ? country.isoAlpha2 : code
}

const countryAlpha2 = computed(() => getCountryAlpha2(item.value?.country))

// Field name mapping from camelCase to PascalCase for wbrRegisterColumnTitles lookup
const fieldNameMapping = {
  statusId: 'Status',
  checkStatusId: 'CheckStatusId',
  orderNumber: 'OrderNumber',
  invoiceDate: 'InvoiceDate',
  sticker: 'Sticker',
  shk: 'Shk',
  stickerCode: 'StickerCode',
  extId: 'ExtId',
  tnVed: 'TnVed',
  siteArticle: 'SiteArticle',
  heelHeight: 'HeelHeight',
  size: 'Size',
  productName: 'ProductName',
  description: 'Description',
  gender: 'Gender',
  brand: 'Brand',
  fabricType: 'FabricType',
  composition: 'Composition',
  lining: 'Lining',
  insole: 'Insole',
  sole: 'Sole',
  country: 'Country',
  factoryAddress: 'FactoryAddress',
  unit: 'Unit',
  weightKg: 'WeightKg',
  quantity: 'Quantity',
  unitPrice: 'UnitPrice',
  currency: 'Currency',
  barcode: 'Barcode',
  declaration: 'Declaration',
  productLink: 'ProductLink',
  recipientName: 'RecipientName',
  recipientInn: 'RecipientInn',
  passportNumber: 'PassportNumber',
  pinfl: 'Pinfl',
  recipientAddress: 'RecipientAddress',
  contactPhone: 'ContactPhone',
  boxNumber: 'BoxNumber',
  supplier: 'Supplier',
  supplierInn: 'SupplierInn',
  category: 'Category',
  subcategory: 'Subcategory',
  personalData: 'PersonalData',
  customsClearance: 'CustomsClearance',
  dutyPayment: 'DutyPayment',
  otherReason: 'OtherReason'
}

// Function to get label for a field
const getFieldLabel = (fieldName) => {
  const mappingKey = fieldNameMapping[fieldName]
  if (!mappingKey) return fieldName

  const title = wbrRegisterColumnTitles[mappingKey]
  const tooltip = wbrRegisterColumnTooltips[mappingKey]

  // If there's tooltip text, combine title with tooltip for a more descriptive label
  if (tooltip) {
    return `${title} (${tooltip})`
  }

  return title
}

// Function to get tooltip for a field (if available)
const getFieldTooltip = (fieldName) => {
  const mappingKey = fieldNameMapping[fieldName]
  return mappingKey ? wbrRegisterColumnTooltips[mappingKey] : null
}

statusStore.ensureStatusesLoaded()
parcelCheckStatusStore.ensureStatusesLoaded()
await stopWordsStore.getAll()
if (countries.value.length === 0) {
  await countriesStore.getAll()
}
await parcelsStore.getById(props.id)

const schema = Yup.object().shape({
  statusId: Yup.number().required('Необходимо выбрать статус'),
  tnVed: Yup.string().required('Необходимо указать ТН ВЭД'),
  invoiceDate: Yup.date().nullable(),
  weightKg: Yup.number().nullable().min(0, 'Вес не может быть отрицательным'),
  quantity: Yup.number().nullable().min(0, 'Количество не может быть отрицательным'),
  unitPrice: Yup.number().nullable().min(0, 'Цена не может быть отрицательной')
})

function onSubmit(values, { setErrors }) {
  return parcelsStore
    .update(props.id, values)
    .then(() => router.push(`/registers/${props.registerId}/parcels`))
    .catch((error) => setErrors({ apiError: error.message || String(error) }))
}


async function validateParcel() {
  try {
    await parcelsStore.validate(item.value.id)
    // Optionally reload the order data to reflect any changes
    await parcelsStore.getById(props.id)
  } catch (error) {
    console.error('Failed to validate parcel:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при проверке посылки'
  }
}
</script>

<template>
  <div class="settings form-3">
    <h1 class="primary-heading">
      Посылка {{ item?.shk ? item.shk : '[без номера]' }}
    </h1>
    <hr class="hr" />
    <Form @submit="onSubmit" :initial-values="item" :validation-schema="schema" v-slot="{ errors, isSubmitting }">

      <!-- Order Identification & Status Section -->
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="statusId" class="label" :title="getFieldTooltip('statusId')">{{ getFieldLabel('statusId') }}:</label>
            <Field as="select" name="statusId" id="statusId" class="form-control input"
                   @change="(e) => currentStatusId = parseInt(e.target.value)">
              <option v-for="s in statusStore.parcelStatuses" :key="s.id" :value="s.id">{{ s.title }}</option>
            </Field>
          </div>
          <div class="form-group">
            <label for="checkStatusId" class="label" :title="getFieldTooltip('checkStatusId')">{{ getFieldLabel('checkStatusId') }}:</label>
            <div class="readonly-field status-cell" :class="{ 'has-issues': HasIssues(item?.checkStatusId) }">
              {{ parcelCheckStatusStore.getStatusTitle(item?.checkStatusId) }}
            </div>
            <button class="validate-btn" @click="validateParcel" type="button" title="Проверить посылку">
              <font-awesome-icon size="1x" icon="fa-solid fa-clipboard-check" />
            </button>
          </div>
          <!-- Stopwords information when there are issues -->
          <div v-if="HasIssues(item?.checkStatusId) && getCheckStatusInfo(item, feacnOrders, stopWords)" class="form-group stopwords-info">
            <div class="stopwords-text">
              {{ getCheckStatusInfo(item, feacnOrders, stopWords) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Product Identification & Details Section -->
      <div class="form-section">
        <h3 class="section-title">Информация о товаре</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="tnVed" class="label" :title="getFieldTooltip('tnVed')">{{ getFieldLabel('tnVed') }}:</label>
            <Field name="tnVed" id="tnVed" type="text" class="form-control input" :class="{ 'is-invalid': errors.tnVed }" />
          </div>
          <div class="form-group">
            <label for="shk" class="label" :title="getFieldTooltip('shk')">{{ getFieldLabel('shk') }}:</label>
            <Field name="shk" id="shk" type="text" class="form-control input" />
          </div>
          <div class="form-group">
            <label for="productName" class="label" :title="getFieldTooltip('productName')">{{ getFieldLabel('productName') }}:</label>
            <Field name="productName" id="productName" type="text" class="form-control input" />
          </div>
          <div class="form-group">
            <label class="label">{{ getFieldLabel('productLink') }}:</label>
            <a v-if="item?.productLink" :href="item.productLink" target="_blank" rel="noopener noreferrer" class="product-link-inline" :title="item.productLink">
              {{ item.productLink }}
            </a>
            <span v-else class="no-link">Ссылка отсутствует</span>
          </div>
          <div class="form-group">
            <label for="country" class="label" :title="getFieldTooltip('country')">{{ getFieldLabel('country') }}:</label>
            <input id="country" type="text" class="form-control input" :value="countryAlpha2" readonly />
          </div>
          <div class="form-group">
            <label for="weightKg" class="label" :title="getFieldTooltip('weightKg')">{{ getFieldLabel('weightKg') }}:</label>
            <Field name="weightKg" id="weightKg" type="number" step="1.0" class="form-control input" :class="{ 'is-invalid': errors.weightKg }" />
          </div>
          <div class="form-group">
            <label for="quantity" class="label" :title="getFieldTooltip('quantity')">{{ getFieldLabel('quantity') }}:</label>
            <Field name="quantity" id="quantity" type="number" step="1.0" class="form-control input" :class="{ 'is-invalid': errors.quantity }" />
          </div>
          <div class="form-group">
            <label for="unitPrice" class="label" :title="getFieldTooltip('unitPrice')">{{ getFieldLabel('unitPrice') }}:</label>
            <Field name="unitPrice" id="unitPrice" type="number" step="1.0" class="form-control input" :class="{ 'is-invalid': errors.unitPrice }" />
          </div>
          <div class="form-group">
            <label for="currency" class="label" :title="getFieldTooltip('currency')">{{ getFieldLabel('currency') }}:</label>
            <Field name="currency" id="currency" type="text" class="form-control input" />
          </div>
        </div>
      </div>

      <!-- Recipient Information Section -->
      <div class="form-section">
        <h3 class="section-title">Информация о получателе</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="recipientName" class="label" :title="getFieldTooltip('recipientName')">{{ getFieldLabel('recipientName') }}:</label>
            <Field name="recipientName" id="recipientName" type="text" class="form-control input" />
          </div>
          <div class="form-group">
            <label for="passportNumber" class="label" :title="getFieldTooltip('passportNumber')">{{ getFieldLabel('passportNumber') }}:</label>
            <Field name="passportNumber" id="passportNumber" type="text" class="form-control input" />
          </div>
        </div>
      </div>

      <!-- Action buttons -->

      <div class="form-actions">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Сохранить
        </button>
        <button class="button secondary" type="button" @click="router.push(`/registers/${props.registerId}/parcels`)">
          Отменить
        </button>
      </div>

      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>

    <div v-if="item?.loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке информации о посылке: {{ item.error }}</div>
    </div>
  </div>
</template>

