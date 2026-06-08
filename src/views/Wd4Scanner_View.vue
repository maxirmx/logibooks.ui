<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import setupE1 from '@/assets/wd4/setup-e1.png'
import interf10 from '@/assets/wd4/interf10.png'
import setupE0 from '@/assets/wd4/setup-e0.png'
import wlsclp from '@/assets/wd4/wlsclp.png'
import tsuset0d0a from '@/assets/wd4/tsuset0d0a.png'
import labelPrefixBs20 from '@/assets/wd4/label-prefix-bs20.png'
import bluetoothDeviceBs20 from '@/assets/wd4/bluetooth-device-bs20.jpeg'

const barcodeImages = {
  '@SETUPE1': setupE1,
  '@INTERF10': interf10,
  '@SETUPE0': setupE0,
  '@WLSCLP': wlsclp,
  '@TSUSET0D0A': tsuset0d0a,
}

const fullSetup = [
  '@SETUPE1',
  '@INTERF10',
  '@SETUPE0',
  '@SETUPE1',
  '@WLSCLP',
  '@SETUPE0',
  '@SETUPE1',
  '@TSUSET0D0A',
  '@SETUPE0',
]

const shortSetup = [
  '@SETUPE1',
  '@INTERF10',
  '@TSUSET0D0A',
  '@SETUPE0',
]
</script>

<template>
  <article class="wd4-page">
    <header class="wd4-header">
      <h1 class="primary-heading">Настройки WD4</h1>
      <p>Настройка сканера-кольца Newland NLS-WD4 штрих-кодами и подключение по Bluetooth.</p>
    </header>

    <section class="wd4-section">
      <h2>Полный вариант</h2>
      <p>Сканируйте штрих-коды последовательно, сверху вниз.</p>

      <div class="barcode-list">
        <figure
          v-for="(code, index) in fullSetup"
          :key="`full-${index}-${code}`"
          class="barcode-item"
        >
          <figcaption>
            <span class="step-number">{{ index + 1 }}</span>
            <code>{{ code }}</code>
          </figcaption>
          <img :src="barcodeImages[code]" :alt="`Штрих-код ${code}`" loading="lazy" decoding="async" />
        </figure>
      </div>
    </section>

    <section class="wd4-section">
      <h2>Сокращённый вариант, только для новых устройств</h2>
      <p>Используйте эту последовательность для нового сканера.</p>

      <div class="barcode-list">
        <figure
          v-for="(code, index) in shortSetup"
          :key="`short-${index}-${code}`"
          class="barcode-item"
        >
          <figcaption>
            <span class="step-number">{{ index + 1 }}</span>
            <code>{{ code }}</code>
          </figcaption>
          <img :src="barcodeImages[code]" :alt="`Штрих-код ${code}`" />
        </figure>
      </div>
    </section>

    <section class="wd4-section">
      <h2>Подключение Bluetooth</h2>
      <ol class="pairing-list">
        <li>Выполняется после настройки штрих-кодами.</li>
        <li>Нужно искать устройство с префиксом, как на коробке.</li>
      </ol>

      <div class="photo-grid">
        <figure class="photo-item">
          <figcaption>Наклейка на коробке, префикс BS20</figcaption>
          <img :src="labelPrefixBs20" alt="Наклейка на коробке WD4 с префиксом BS20" />
        </figure>
        <figure class="photo-item">
          <figcaption>Устройство Bluetooth, которое увидит телефон</figcaption>
          <img :src="bluetoothDeviceBs20" alt="Bluetooth устройство с префиксом BS20 на телефоне" />
        </figure>
      </div>
    </section>
  </article>
</template>

<style scoped>
.wd4-page {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 1rem;
  align-self: flex-start;
}

.wd4-header {
  margin-bottom: 1.5rem;
}

.wd4-header h1 {
  margin-bottom: 0.5rem;
  font-size: 2rem;
  font-weight: 600;
}

.wd4-header p,
.wd4-section p,
.pairing-list {
  font-size: 1rem;
  color: #374151;
}

.wd4-section {
  padding: 1.25rem 0;
  border-top: 2px solid rgba(var(--primary-color-rgb), 0.2);
}

.wd4-section h2 {
  margin-bottom: 0.5rem;
  color: var(--primary-color);
  font-size: 1.35rem;
  font-weight: 600;
}

.barcode-list {
  --wd4-barcode-width: min(100%, 1002px);

  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 1040px;
  margin-top: 1rem;
}

.barcode-item,
.photo-item {
  margin: 0;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.barcode-item figcaption,
.photo-item figcaption {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0.65rem 0.8rem;
  border-bottom: 1px solid #d8dee8;
  background: #f7f9fc;
  color: #1f2937;
  font-weight: 600;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  flex: 0 0 1.6rem;
  border-radius: 50%;
  background: var(--primary-color);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 700;
}

.barcode-item code {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
}

.barcode-item img {
  display: block;
  width: var(--wd4-barcode-width);
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  padding: 0.9rem;
  background: #ffffff;
}

.pairing-list {
  margin: 0.75rem 0 1rem 1.25rem;
  padding: 0;
}

.pairing-list li + li {
  margin-top: 0.4rem;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.photo-item img {
  display: block;
  width: 100%;
  height: auto;
  background: #ffffff;
}

@media (max-width: 640px) {
  .wd4-page {
    padding: 0.5rem;
  }

  .photo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
