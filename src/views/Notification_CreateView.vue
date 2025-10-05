<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import NotificationSettings from '@/dialogs/Notification_Settings.vue'
</script>

<template>
  <Suspense>
    <NotificationSettings :mode="'create'" />
  </Suspense>
</template>
