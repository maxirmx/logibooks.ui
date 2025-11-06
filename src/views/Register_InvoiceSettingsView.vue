<script setup>
import InvoiceSettings from '@/dialogs/Invoice_Settings.vue'

const props = defineProps({
  id: { type: Number, required: true }
})
</script>

<template>
  <Suspense>
    <InvoiceSettings :id="props.id" />
  </Suspense>
</template>
