<script setup>
import { computed, ref, watch } from 'vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import FieldError from '@/components/FieldError.vue'
import { APP_DIALOG_BUTTON_PROPS, APP_DIALOG_MAX_WIDTH, getAppDialogWidth } from '@/helpers/dialog.helpers.js'
const props = defineProps({ open: Boolean, printers: { type: Array, required: true }, selected: { type: String, default: '' }, busy: Boolean })
const emit = defineEmits(['select', 'cancel'])
const value = ref('')
const invalid = ref(false)
const options = computed(() => [...props.printers].sort((a, b) => Number(/TE200/i.test(b)) - Number(/TE200/i.test(a)) || a.localeCompare(b)))
watch(() => props.open, (open) => {
  if (open) { value.value = props.selected || options.value.find((name) => /TE200/i.test(name)) || ''; invalid.value = false }
})
function submit() {
  invalid.value = !props.printers.includes(value.value)
  if (!invalid.value) emit('select', value.value)
}
</script>

<template>
  <v-dialog :model-value="open" :width="getAppDialogWidth('medium')" :max-width="APP_DIALOG_MAX_WIDTH" persistent>
    <AppDialogFrame title="Локальный принтер этикеток">
      <v-select v-model="value" :items="options" label="Очередь Windows (предпочтительно TE200)" :disabled="busy" hide-details data-testid="printer-selection" />
      <FieldError name="printer" :errors="invalid ? { printer: 'Выберите доступный принтер' } : {}" />
      <p>Выбор сохраняется только в этом браузере. Этикетки: 58 × 40 мм.</p>
      <template #actions>
        <v-btn v-bind="APP_DIALOG_BUTTON_PROPS.secondary" :disabled="busy" @click="emit('cancel')">Отмена</v-btn>
        <v-btn v-bind="APP_DIALOG_BUTTON_PROPS.primary" :loading="busy" @click="submit" data-testid="save-printer">Выбрать</v-btn>
      </template>
    </AppDialogFrame>
  </v-dialog>
</template>
