<script setup>
import { computed, ref, unref } from 'vue'
import router from '@/router'
import ActionButton from '@/components/ActionButton.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import CompanyRegisterOutputFormatEditor from '@/components/CompanyRegisterOutputFormatEditor.vue'
import { getCompanyDisplayName, getRegisterTypeDisplayName } from '@/helpers/register.display.helpers.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

const props = defineProps({
  id: { type: Number, required: true },
  registerType: { type: Number, required: true }
})
const alertStore = useAlertStore()
const companiesStore = useCompaniesStore()
const editorRef = ref(null)
const navigating = ref(false)
const busy = computed(() => navigating.value || editorRef.value?.loading || editorRef.value?.saving)
const canSave = computed(() => unref(editorRef.value?.canSave) === true)
const headingCompanies = computed(() => {
  const formatCompany = getRegisterTypeDisplayName(companiesStore.companies, props.registerType, '')
  const configurationCompany = getCompanyDisplayName(companiesStore.companies, props.id, '')
  return formatCompany && configurationCompany ? `${formatCompany} → ${configurationCompany}` : ''
})
const returnPath = computed(() => `/company/edit/${props.id}`)

async function returnToCompany() {
  if (navigating.value) return false
  navigating.value = true
  try {
    await router.push(returnPath.value)
    return true
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Не удалось вернуться к компании',
      action: { label: 'Повторить', handler: returnToCompany }
    })
    return false
  } finally {
    navigating.value = false
  }
}

async function save() {
  if (busy.value || !canSave.value) return false
  const saved = await editorRef.value.save()
  if (!saved) return false
  return returnToCompany()
}
</script>

<template>
  <div class="settings form-3">
    <div class="header-with-actions">
      <h1 class="primary-heading register-output-heading">
        <span>Формат выгрузки реестра</span>
        <span v-if="headingCompanies" class="register-output-heading__company">{{ headingCompanies }}</span>
      </h1>
      <div class="header-actions">
        <ActionButton
          :item="null"
          icon="fa-solid fa-check-double"
          icon-size="2x"
          tooltip-text="Сохранить"
          :disabled="busy || !canSave"
          data-testid="register-output-save-action"
          @click="save"
        />
        <ActionButton
          :item="null"
          icon="fa-solid fa-xmark"
          icon-size="2x"
          tooltip-text="Отменить"
          :disabled="busy"
          data-testid="register-output-cancel-action"
          @click="returnToCompany"
        />
      </div>
    </div>
    <hr class="hr" />
    <PageAlertRegion />
    <CompanyRegisterOutputFormatEditor
      ref="editorRef"
      :company-id="id"
      :initial-register-type="registerType"
      standalone
    />
  </div>
</template>

<style scoped>
.register-output-heading { display: flex; flex-direction: column; }
.register-output-heading__company {
  font-size: 0.6em;
  font-weight: 500;
  line-height: 1.3;
  /* Let the second heading line occupy the usual space before the divider. */
  margin-bottom: -1.3em;
}
</style>
