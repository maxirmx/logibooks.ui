<script setup>
import OrdersList from '@/components/WbrOrders_List.vue'
const props = defineProps({ id: { type: Number, required: true } })
</script>

<template>
  <Suspense>
    <OrdersList :register-id="props.id" />
  </Suspense>
</template>
