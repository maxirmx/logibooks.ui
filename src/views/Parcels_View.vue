<script setup>
import ParcelsList from '@/components/WbrParcels_List.vue'
const props = defineProps({ id: { type: Number, required: true } })
</script>

<template>
  <Suspense>
    <ParcelsList :register-id="props.id" />
  </Suspense>
</template>
