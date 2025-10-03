<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="loading-page-wrapper column justify-center items-center full-width">
    <q-spinner color="primary" size="32px" />
    <span class="text-span text-body1 q-mt-sm">{{ t('loading') }}</span>
  </div>
</template>

<style scoped lang="sass">
.loading-page-wrapper
  min-height: 150px

  .text-span
    color: rgba(0, 0, 0, 0.6)
    animation: refresh 3s infinite

@keyframes refresh
  0%
    color: rgba(0, 0, 0, 0.6)
  50%
    color: rgba(0, 0, 0, 1)
  100%
    color: rgba(0, 0, 0, 0.6)
</style>
