<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

defineProps({
  ariaLabel: {
    type: String,
    default: 'Фильтры'
  }
})
</script>

<template>
  <div class="responsive-filter-bar" role="group" :aria-label="ariaLabel">
    <slot />
  </div>
</template>

<style scoped>
/*
 * Sizing modifiers:
 * - small: narrow text controls (10rem width);
 * - compact: short categorical controls (11.75rem preferred width);
 * - regular: searches or controls with longer labels (20rem preferred width);
 * - grow: lets a high-value text/search control absorb extra row space.
 *
 * Compact and regular controls can expand to fill the row. Small controls
 * keep their width. `min(100%, basis)` prevents horizontal overflow.
 */
.responsive-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: var(--responsive-filter-gap, 0.75rem);
  row-gap: var(--responsive-filter-row-gap, var(--responsive-filter-gap, 0.75rem));
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.responsive-filter-bar > :slotted(*) {
  flex: 1 1 var(--responsive-filter-basis, 18rem);
  width: auto;
  max-width: 100%;
  min-width: min(100%, var(--responsive-filter-basis, 18rem));
}

.responsive-filter-bar > :slotted(.responsive-filter-bar__item--small) {
  --responsive-filter-basis: 10rem;
  flex-grow: 0;
}

.responsive-filter-bar > :slotted(.responsive-filter-bar__item--compact) {
  --responsive-filter-basis: 11.75rem;
}

.responsive-filter-bar > :slotted(.responsive-filter-bar__item--regular) {
  --responsive-filter-basis: 20rem;
}

.responsive-filter-bar > :slotted(.responsive-filter-bar__item--grow) {
  flex-grow: 2;
}
</style>
