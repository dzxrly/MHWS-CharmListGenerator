<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <q-layout view="lHh Lpr lff">
    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="bg-transparent">
      <div class="row full-width justify-center items-center">
        <q-btn
          class="q-mx-sm"
          href="https://eggtargaryen.com"
          target="_blank"
          :label="t('footerAuthor')"
          color="grey-8"
          rounded
          no-caps
          flat
          dense
          no-wrap
        />
        <q-btn
          class="q-mx-sm"
          href="https://github.com/dzxrly/MHWS-CharmListGenerator"
          target="_blank"
          :label="t('footerRepo')"
          color="grey-8"
          rounded
          flat
          dense
          no-wrap
        />
        <q-btn
          class="q-mx-sm"
          href="https://github.com/dzxrly/MHWS-CharmListGenerator/blob/main/LICENSE"
          target="_blank"
          :label="t('footerLicense')"
          color="grey-8"
          rounded
          flat
          dense
          no-wrap
        />
      </div>
    </q-footer>
  </q-layout>
</template>
