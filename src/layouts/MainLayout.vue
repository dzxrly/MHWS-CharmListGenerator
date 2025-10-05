<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { useQuasar } from 'quasar';

const { t } = useI18n();
const $q = useQuasar();

const isLtMd = computed(() => $q.screen.lt.md);
</script>

<template>
  <q-layout view="lHh Lpr lff">
    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="bg-transparent">
      <div class="row full-width justify-center items-center q-mb-sm">
        <q-btn
          class="q-mx-sm"
          href="https://eggtargaryen.com"
          target="_blank"
          :label="t('footerAuthor')"
          color="grey-8"
          :size="isLtMd ? 'sm' : 'md'"
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
          :size="isLtMd ? 'sm' : 'md'"
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
          :size="isLtMd ? 'sm' : 'md'"
          rounded
          flat
          dense
          no-wrap
        />
      </div>
    </q-footer>
  </q-layout>
</template>
