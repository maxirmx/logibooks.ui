<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

defineProps({ failed: { type: Object, default: null }, overflow: { type: Object, default: null }, retained: Boolean })
</script>

<template>
  <div v-if="failed || overflow" data-testid="print-recovery-details">
    <p v-if="failed" data-testid="failed-print">
      Не удалось напечатать скан {{ failed.scanCodeId }} ({{ failed.template }}), задание {{ failed.scanJobId }}.
      Проверьте, была ли напечатана этикетка, перед повторной отправкой.
    </p>
    <p v-if="overflow" data-testid="print-overflow">
      Переполнение начиная со скана {{ overflow.scanCodeId }} ({{ overflow.template }}), задание {{ overflow.scanJobId }}.
      Выключите автомаркировку и проверьте сканы.
    </p>
    <p v-if="retained">
      Автомаркировка приостановлена. Проверьте указанные сканы и сохраните режим «Отключён» в настройках принтера перед повторным включением.
    </p>
  </div>
</template>
