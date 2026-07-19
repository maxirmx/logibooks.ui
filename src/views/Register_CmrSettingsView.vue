<script setup>
import CmrSettings from '@/dialogs/Cmr_Settings.vue'

const props = defineProps({
  id: { type: Number, required: true }
})
</script>

<template>
  <Suspense>
    <CmrSettings :id="props.id" />
  </Suspense>
</template>
