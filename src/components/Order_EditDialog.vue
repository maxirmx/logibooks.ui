<script setup>
import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useOrdersStore } from '@/stores/orders.store.js'
import { useOrderStatusStore } from '@/stores/order.status.store.js'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { registerColumnTitles, registerColumnTooltips } from '@/helpers/register.mapping.js'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

const ordersStore = useOrdersStore()
const statusStore = useOrderStatusStore()

const { item } = storeToRefs(ordersStore)

// Reactive reference to track current statusId for color updates
const currentStatusId = ref(null)

// Watch for changes in item.statusId to initialize currentStatusId
watch(() => item.value?.statusId, (newStatusId) => {
  currentStatusId.value = newStatusId
}, { immediate: true })

// Field name mapping from camelCase to PascalCase for registerColumnTitles lookup
const fieldNameMapping = {
  statusId: 'Status',
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
  
  const title = registerColumnTitles[mappingKey]
  const tooltip = registerColumnTooltips[mappingKey]
  
  // If there's tooltip text, combine title with tooltip for a more descriptive label
  if (tooltip) {
    return `${title} (${tooltip})`
  }
  
  return title
}

// Function to get tooltip for a field (if available)
const getFieldTooltip = (fieldName) => {
  const mappingKey = fieldNameMapping[fieldName]
  return mappingKey ? registerColumnTooltips[mappingKey] : null
}

// Function to get status color based on statusId numeric value
const getStatusColor = (statusId) => {
  if (!statusId) return 'default'
  
  // Color mapping based on statusId ranges
  if (statusId <= 100) {
    return 'blue'   // statusId <= 100
  } else if (statusId > 100 && statusId <= 200) {
    return 'red'    // statusId > 100 and <= 200
  } else {
    return 'green'  // statusId > 200
  }
}

statusStore.ensureStatusesLoaded()
await ordersStore.getById(props.id)

const schema = Yup.object().shape({
  statusId: Yup.number().required('Необходимо выбрать статус'),
  tnVed: Yup.string().required('Необходимо указать ТН ВЭД'),
  invoiceDate: Yup.date().nullable(),
  weightKg: Yup.number().nullable().min(0, 'Вес не может быть отрицательным'),
  quantity: Yup.number().nullable().min(0, 'Количество не может быть отрицательным'),
  unitPrice: Yup.number().nullable().min(0, 'Цена не может быть отрицательной')
})

function onSubmit(values, { setErrors }) {
  return ordersStore
    .update(props.id, values)
    .then(() => router.push(`/registers/${props.registerId}/orders`))
    .catch((error) => setErrors({ apiError: error.message || String(error) }))
}
</script>

<template>
  <div class="settings form-3">
    <h1 class="primary-heading">
      Заказ {{ item?.orderNumber ? item.orderNumber : '[без номера]' }}
    </h1>
    <hr class="hr" />
    <Form @submit="onSubmit" :initial-values="item" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
      
      <!-- Row 1: Basic Info --> 
      <div class="form-row">
        <div class="form-group">
          <label for="statusId" class="label" :title="getFieldTooltip('statusId')">{{ getFieldLabel('statusId') }}:</label>
          <Field as="select" name="statusId" id="statusId" class="form-control input" 
                 :class="[
                   { 'is-invalid': errors.statusId },
                   `status-${getStatusColor(currentStatusId)}`
                 ]"
                 @change="(e) => currentStatusId = parseInt(e.target.value)">
            <option v-for="s in statusStore.statuses" :key="s.id" :value="s.id">{{ s.title }}</option>
          </Field>
        </div>
        <div class="form-group">
          <label for="customsClearance" class="label" :title="getFieldTooltip('customsClearance')">{{ getFieldLabel('customsClearance') }}:</label>
          <Field name="customsClearance" id="customsClearance" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="dutyPayment" class="label" :title="getFieldTooltip('dutyPayment')">{{ getFieldLabel('dutyPayment') }}:</label>
          <Field name="dutyPayment" id="dutyPayment" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 2: Order Details -->
      <div class="form-row">
        <div class="form-group">
          <label for="personalData" class="label" :title="getFieldTooltip('personalData')">{{ getFieldLabel('personalData') }}:</label>
          <Field name="personalData" id="personalData" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="otherReason" class="label" :title="getFieldTooltip('otherReason')">{{ getFieldLabel('otherReason') }}:</label>
          <Field name="otherReason" id="otherReason" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="extId" class="label" :title="getFieldTooltip('extId')">{{ getFieldLabel('extId') }}:</label>
          <Field name="extId" id="extId" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 3: Product Identification -->
      <div class="form-row">
        <div class="form-group">
          <label for="tnVed" class="label" :title="getFieldTooltip('tnVed')">{{ getFieldLabel('tnVed') }}:</label>
          <Field name="tnVed" id="tnVed" type="text" class="form-control input" :class="{ 'is-invalid': errors.tnVed }" />
        </div>
        <div class="form-group">
          <label for="country" class="label" :title="getFieldTooltip('country')">{{ getFieldLabel('country') }}:</label>
          <Field name="country" id="country" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="invoiceDate" class="label" :title="getFieldTooltip('invoiceDate')">{{ getFieldLabel('invoiceDate') }}:</label>
          <Field name="invoiceDate" id="invoiceDate" type="date" class="form-control input" :class="{ 'is-invalid': errors.invoiceDate }" />
        </div>
      </div>

      <!-- Row 4: Product Basic Info -->
      <div class="form-row">
        <div class="form-group">
          <label for="siteArticle" class="label" :title="getFieldTooltip('siteArticle')">{{ getFieldLabel('siteArticle') }}:</label>
          <Field name="siteArticle" id="siteArticle" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="barcode" class="label" :title="getFieldTooltip('barcode')">{{ getFieldLabel('barcode') }}:</label>
          <Field name="barcode" id="barcode" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="category" class="label" :title="getFieldTooltip('category')">{{ getFieldLabel('category') }}:</label>
          <Field name="category" id="category" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 5: Product Specifications -->
      <div class="form-row">
        <div class="form-group">
          <label for="subcategory" class="label" :title="getFieldTooltip('subcategory')">{{ getFieldLabel('subcategory') }}:</label>
          <Field name="subcategory" id="subcategory" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="productName" class="label" :title="getFieldTooltip('productName')">{{ getFieldLabel('productName') }}:</label>
          <Field name="productName" id="productName" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="brand" class="label" :title="getFieldTooltip('brand')">{{ getFieldLabel('brand') }}:</label>
          <Field name="brand" id="brand" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 6: Materials -->
      <div class="form-row">
        <div class="form-group">
          <label for="size" class="label" :title="getFieldTooltip('size')">{{ getFieldLabel('size') }}:</label>
          <Field name="size" id="size" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="gender" class="label" :title="getFieldTooltip('gender')">{{ getFieldLabel('gender') }}:</label>
          <Field name="gender" id="gender" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="heelHeight" class="label" :title="getFieldTooltip('heelHeight')">{{ getFieldLabel('heelHeight') }}:</label>
          <Field name="heelHeight" id="heelHeight" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 7: More Materials & Origin -->
      <div class="form-row">
        <div class="form-group">
          <label for="fabricType" class="label" :title="getFieldTooltip('fabricType')">{{ getFieldLabel('fabricType') }}:</label>
          <Field name="fabricType" id="fabricType" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="composition" class="label" :title="getFieldTooltip('composition')">{{ getFieldLabel('composition') }}:</label>
          <Field name="composition" id="composition" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="lining" class="label" :title="getFieldTooltip('lining')">{{ getFieldLabel('lining') }}:</label>
          <Field name="lining" id="lining" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 8: Measurements & Pricing -->
      <div class="form-row">
        <div class="form-group">
          <label for="insole" class="label" :title="getFieldTooltip('insole')">{{ getFieldLabel('insole') }}:</label>
          <Field name="insole" id="insole" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="sole" class="label" :title="getFieldTooltip('sole')">{{ getFieldLabel('sole') }}:</label>
          <Field name="sole" id="sole" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 9: Pricing & Currency -->
      <div class="form-row">
        <div class="form-group">
          <label for="weightKg" class="label" :title="getFieldTooltip('weightKg')">{{ getFieldLabel('weightKg') }}:</label>
          <Field name="weightKg" id="weightKg" type="number" step="0.001" class="form-control input" :class="{ 'is-invalid': errors.weightKg }" />
        </div>
        <div class="form-group">
          <label for="quantity" class="label" :title="getFieldTooltip('quantity')">{{ getFieldLabel('quantity') }}:</label>
          <Field name="quantity" id="quantity" type="number" step="0.001" class="form-control input" :class="{ 'is-invalid': errors.quantity }" />
        </div>
        <div class="form-group">
          <label for="unit" class="label" :title="getFieldTooltip('unit')">{{ getFieldLabel('unit') }}:</label>
          <Field name="unit" id="unit" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 10: Tracking & Processing -->
      <div class="form-row">
        <div class="form-group">
          <label for="unitPrice" class="label" :title="getFieldTooltip('unitPrice')">{{ getFieldLabel('unitPrice') }}:</label>
          <Field name="unitPrice" id="unitPrice" type="number" step="0.01" class="form-control input" :class="{ 'is-invalid': errors.unitPrice }" />
        </div>
        <div class="form-group">
          <label for="currency" class="label" :title="getFieldTooltip('currency')">{{ getFieldLabel('currency') }}:</label>
          <Field name="currency" id="currency" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="declaration" class="label" :title="getFieldTooltip('declaration')">{{ getFieldLabel('declaration') }}:</label>
          <Field name="declaration" id="declaration" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 11: Recipient Personal Info -->
      <div class="form-row">
        <div class="form-group">
          <label for="sticker" class="label" :title="getFieldTooltip('sticker')">{{ getFieldLabel('sticker') }}:</label>
          <Field name="sticker" id="sticker" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="shk" class="label" :title="getFieldTooltip('shk')">{{ getFieldLabel('shk') }}:</label>
          <Field name="shk" id="shk" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="stickerCode" class="label" :title="getFieldTooltip('stickerCode')">{{ getFieldLabel('stickerCode') }}:</label>
          <Field name="stickerCode" id="stickerCode" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 12: Recipient Contact Info -->
      <div class="form-row">
        <div class="form-group">
          <label for="recipientName" class="label" :title="getFieldTooltip('recipientName')">{{ getFieldLabel('recipientName') }}:</label>
          <Field name="recipientName" id="recipientName" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="recipientInn" class="label" :title="getFieldTooltip('recipientInn')">{{ getFieldLabel('recipientInn') }}:</label>
          <Field name="recipientInn" id="recipientInn" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="passportNumber" class="label" :title="getFieldTooltip('passportNumber')">{{ getFieldLabel('passportNumber') }}:</label>
          <Field name="passportNumber" id="passportNumber" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 13: Supplier & Manufacturing -->
      <div class="form-row">
        <div class="form-group">
          <label for="pinfl" class="label" :title="getFieldTooltip('pinfl')">{{ getFieldLabel('pinfl') }}:</label>
          <Field name="pinfl" id="pinfl" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="contactPhone" class="label" :title="getFieldTooltip('contactPhone')">{{ getFieldLabel('contactPhone') }}:</label>
          <Field name="contactPhone" id="contactPhone" type="tel" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="boxNumber" class="label" :title="getFieldTooltip('boxNumber')">{{ getFieldLabel('boxNumber') }}:</label>
          <Field name="boxNumber" id="boxNumber" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Row 14: Processing Details -->
      <div class="form-row">
        <div class="form-group">
          <label for="supplier" class="label" :title="getFieldTooltip('supplier')">{{ getFieldLabel('supplier') }}:</label>
          <Field name="supplier" id="supplier" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="supplierInn" class="label" :title="getFieldTooltip('supplierInn')">{{ getFieldLabel('supplierInn') }}:</label>
          <Field name="supplierInn" id="supplierInn" type="text" class="form-control input" />
        </div>
        <div class="form-group">
          <label for="factoryAddress" class="label" :title="getFieldTooltip('factoryAddress')">{{ getFieldLabel('factoryAddress') }}:</label>
          <Field name="factoryAddress" id="factoryAddress" type="text" class="form-control input" />
        </div>
      </div>

      <!-- Full width field for address -->
      <div class="form-group full-width">
        <label for="recipientAddress" class="label" :title="getFieldTooltip('recipientAddress')">{{ getFieldLabel('recipientAddress') }}:</label>
        <Field name="recipientAddress" id="recipientAddress" type="text" class="form-control input" />
      </div>

      <!-- Full width field for description -->
      <div class="form-group full-width">
        <div class="label-with-link">
          <label for="description" class="label" :title="getFieldTooltip('description')">{{ getFieldLabel('description') }}:</label>
          <a v-if="item?.productLink" :href="item.productLink" target="_blank" rel="noopener noreferrer" class="product-link" :title="item.productLink">
            {{ getFieldLabel('productLink') }}
          </a>
        </div>
        <Field as="textarea" name="description" id="description" rows="3" class="form-control input" />
      </div>

      <!-- Action buttons -->
      <div class="form-actions">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Сохранить
        </button>
        <button class="button secondary" type="button" @click="router.push(`/registers/${props.registerId}/orders`)">
          Отменить
        </button>
      </div>
      
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
    
    <div v-if="item?.loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке заказа: {{ item.error }}</div>
    </div>
  </div>
</template>

<style scoped>
.form-3 {
  max-width: 2400px;
  margin: 0 auto;
  margin-bottom: 0.1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 0rem;
  min-width: 0;
  overflow: hidden;
}

.form-group.full-width {
  grid-column: 1 / -1;
  margin-bottom: 0rem;
}

.label {
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  width: 80% !important;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  flex-shrink: 1;
}

.input {
  padding: 0.1rem;
  border-radius: 4px;
  font-size: 0.8rem;
  height: 2rem;
  margin-bottom: 0.1rem;
  width: 80% !important;
}

.input:focus {
  outline: none;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
}

textarea.input {
  height: auto;
  resize: vertical;
  min-height: 4rem;
  width: 80%;
}

/* Status color indicators */
.status-blue {
  background-color: #e3f2fd !important;
  border-color: #2196f3 !important;
  color: #1565c0 !important;
}

.status-red {
  background-color: #ffebee !important;
  border-color: #f44336 !important;
  color: #c62828 !important;
}

.status-green {
  background-color: #e8f5e8 !important;
  border-color: #4caf50 !important;
  color: #2e7d32 !important;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
}

@media (max-width: 1024px) and (min-width: 769px) {
  .form-row {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
}
</style>
