<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import SearchPanel from 'components/index/SearchPanel.vue';
import { type AmuletItem } from 'src/interface/amulet';
import ResultsPanel from 'components/index/ResultsPanel.vue';

const { t } = useI18n();
const $q = useQuasar();

const results = ref<AmuletItem[]>([]);

const isLtMd = computed(() => $q.screen.lt.md);
</script>

<template>
  <q-page
    class="index-page-wrapper column justify-start items-center full-width bg-transparent"
    :class="isLtMd ? 'q-pa-sm' : 'q-pa-md'"
  >
    <div
      class="title-block full-width column justify-center items-start bg-white rounded-borders q-pa-md"
    >
      <div
        class="row justify-start items-center full-width text-primary"
        :class="isLtMd ? 'text-body1 text-bold' : 'text-h6'"
      >
        <q-icon name="construction" />
        <span class="q-ml-md">{{ t('title') }}</span>
      </div>
      <div
        class="row justify-start items-center full-width q-mt-md"
        :class="isLtMd ? 'text-body2' : 'text-body1'"
      >
        <span>{{ t('description') }}</span>
        <q-btn
          color="primary"
          href="https://mhwilds.wiki-db.com/sim/"
          target="_blank"
          flat
          rounded
          :dense="isLtMd"
        >
          <template v-slot:default>
            <div class="row justify-between items-center">
              <q-icon class="q-mr-sm" name="open_in_new" size="xs" />
              <span class="text-body2">{{ t('armorSearcherLinkBtn') }}</span>
            </div>
          </template>
        </q-btn>
      </div>
    </div>
    <div
      class="search-block full-width column justify-center items-start bg-white rounded-borders q-mt-md"
    >
      <SearchPanel @change="(value) => (results = value)" />
    </div>
    <div
      v-if="results.length > 0"
      class="res-block full-width column justify-center items-start bg-white rounded-borders q-mt-md"
    >
      <ResultsPanel :results="results" />
    </div>
  </q-page>
</template>

<style lang="sass" scoped>
.index-page-wrapper
  .title-block > div
    transition: all 0.3s ease-in-out

.index-page-wrapper > div
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08)
  transition: all 0.3s ease-in-out
</style>
