<script setup>
import OrderEditDialog from '@/components/Order_EditDialog.vue'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})
</script>

<template>
  <Suspense>
    <OrderEditDialog :register-id="props.registerId" :id="props.id" />
  </Suspense>
</template>
