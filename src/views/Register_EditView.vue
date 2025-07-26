<script setup>
import RegisterEditDialog from '@/components/Register_EditDialog.vue'

const props = defineProps({
  id: { type: Number, required: true }
})
</script>

<template>
  <Suspense>
    <RegisterEditDialog :id="props.id" />
  </Suspense>
</template>
