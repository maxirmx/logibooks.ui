<script setup>
import OrderEditDialog from '@/components/Order_EditDialog.vue'

const props = defineProps({
  registerId: { type: String, required: true },
  id: { type: String, required: true }
})

const registerId = parseInt(props.registerId)
const id = parseInt(props.id)
</script>

<template>
  <Suspense>
    <OrderEditDialog :register-id="registerId" :id="id" />
  </Suspense>
</template>
