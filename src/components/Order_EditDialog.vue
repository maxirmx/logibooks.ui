<script setup>
import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useOrdersStore } from '@/stores/orders.store.js'
import { useOrderStatusesStore } from '@/stores/order.statuses.store.js'
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { registerColumnTitles, registerColumnTooltips } from '@/helpers/register.mapping.js'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})

const ordersStore = useOrdersStore()
const statusStore = useOrderStatusesStore()

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

      <!-- Order Identification & Status Section -->
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="statusId" class="label" :title="getFieldTooltip('statusId')">{{ getFieldLabel('statusId') }}:</label>
            <Field as="select" name="statusId" id="statusId" class="form-control input"
                   @change="(e) => currentStatusId = parseInt(e.target.value)">
              <option v-for="s in statusStore.orderStatuses" :key="s.id" :value="s.id">{{ s.title }}</option>
            </Field>
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
            <a v-if="item?.productLink" :href="item.productLink" target="_blank" rel="noopener noreferrer" class="product-link" :title="item.productLink">
              {{ item.productLink }}
            </a>
            <span v-else class="no-link">Ссылка отсутствует</span>
          </div>
          <div class="form-group">
            <label for="country" class="label" :title="getFieldTooltip('country')">{{ getFieldLabel('country') }}:</label>
            <Field name="country" id="country" type="text" class="form-control input" />
          </div>
          <div class="form-group">
            <label for="weightKg" class="label" :title="getFieldTooltip('weightKg')">{{ getFieldLabel('weightKg') }}:</label>
            <Field name="weightKg" id="weightKg" type="number" step="0.001" class="form-control input" :class="{ 'is-invalid': errors.weightKg }" />
          </div>
          <div class="form-group">
            <label for="quantity" class="label" :title="getFieldTooltip('quantity')">{{ getFieldLabel('quantity') }}:</label>
            <Field name="quantity" id="quantity" type="number" step="0.001" class="form-control input" :class="{ 'is-invalid': errors.quantity }" />
          </div>
          <div class="form-group">
            <label for="unitPrice" class="label" :title="getFieldTooltip('unitPrice')">{{ getFieldLabel('unitPrice') }}:</label>
            <Field name="unitPrice" id="unitPrice" type="number" step="0.01" class="form-control input" :class="{ 'is-invalid': errors.unitPrice }" />
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

.form-section {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
  border-bottom: 2px solid #ddd;
  padding-bottom: 0.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0rem;
}

.form-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 0.5rem;
  min-width: 0;
  overflow: hidden;
  gap: 0.5rem;
}



.label {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0;
  width: 40%;
  min-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  flex-shrink: 0;
}

.input {
  padding: 0.25rem;
  border-radius: 4px;
  font-size: 1rem;
  height: 2.25rem;
  margin-bottom: 0;
  width: 60%;
  flex-grow: 1;
}

.input:focus {
  outline: none;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
}


.product-link {
  color: rgba(var(--v-theme-primary), 1);
  text-decoration: none;
  padding: 0.25rem 0;
  display: inline-block;
  font-size: 1rem;
  width: 60%;
  flex-grow: 1;
}

.product-link:hover {
  text-decoration: underline;
  cursor: pointer;
}

.no-link {
  color: #999;
  font-style: italic;
  font-size: 1rem;
  width: 60%;
  flex-grow: 1;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}
</style>
