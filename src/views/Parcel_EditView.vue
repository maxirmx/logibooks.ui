<script setup>
import ParcelEditDialog from '@/components/WbrParcel_EditDialog.vue'

const props = defineProps({
  registerId: { type: Number, required: true },
  id: { type: Number, required: true }
})
</script>

<template>
  <Suspense>
    <ParcelEditDialog :register-id="props.registerId" :id="props.id" />
  </Suspense>
</template>
