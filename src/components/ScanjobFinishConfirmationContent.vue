<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

defineProps({
  options: { type: Object, required: true },
  choices: { type: Object, required: true }
})
defineEmits(['change'])
</script>

<template>
  <div v-if="options.canMarkUnscannedAsNotFound" class="form-group-0" role="group" aria-labelledby="finish-parcels-label">
    <div id="finish-parcels-label" class="label-0">Неотсканированные посылки:</div>
    <div class="radio-group">
      <label v-for="mark in [true, false]" :key="String(mark)" class="radio-styled">
        <input type="radio" name="finishUnscannedParcels" :value="String(mark)"
          :checked="choices.markUnscannedAsNotFound === mark"
          @change="$emit('change', 'markUnscannedAsNotFound', mark)" />
        <span class="radio-mark"></span>
        {{ mark ? 'Отметить как ненайденные' : 'Не отмечать' }}
      </label>
    </div>
  </div>
  <div v-if="options.targetRegisterStatus" class="form-group-0" role="group" aria-labelledby="finish-register-label">
    <div id="finish-register-label" class="label-0">Статус реестра:</div>
    <div class="radio-group">
      <label v-for="update in [true, false]" :key="String(update)" class="radio-styled">
        <input type="radio" name="finishRegisterStatus" :value="String(update)"
          :checked="choices.updateRegisterStatus === update"
          @change="$emit('change', 'updateRegisterStatus', update)" />
        <span class="radio-mark"></span>
        {{ update ? `Изменить на «${options.targetRegisterStatus.title}»` : 'Не изменять' }}
      </label>
    </div>
  </div>
</template>
