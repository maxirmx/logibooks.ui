<script setup>
import InvoiceSettings from '@/dialogs/Invoice_Settings.vue'

const props = defineProps({
  id: { type: Number, required: true },
  selection: { type: String, default: undefined },
  documentType: { type: String, default: 'invoice' }
})
</script>

<template>
  <Suspense>
    <InvoiceSettings
      :id="props.id"
      :selection="props.selection"
      :document-type="props.documentType"
    />
  </Suspense>
</template>
