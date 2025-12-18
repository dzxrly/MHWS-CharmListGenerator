<script setup lang="ts">
import { computed, type PropType, ref } from 'vue';
import type { AmuletItem } from 'src/interface/amulet';
import { copyToClipboard, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { toArmorSearcherFormat } from 'src/utils/utils';
import { type ItemI18n } from 'src/interface/item-i18n';

const props = defineProps({
  results: {
    type: Object as PropType<AmuletItem[]>,
    required: true,
  },
});

const exportLanguageOptions = [
  { label: '日本語', value: 'ja-JP' },
  { label: 'English', value: 'en-US' },
  { label: '한국어', value: 'ko-KR' },
  { label: '简体中文', value: 'zh-Hans' },
  { label: '繁體中文', value: 'zh-Hant' },
];

const $q = useQuasar();
const { t } = useI18n();
const local = useI18n({ useScope: 'local' });
const selectedExportLanguage = ref<string>(
  exportLanguageOptions.find((n) => n.value === local.locale.value)?.value ?? local.locale.value,
);

const isLtMd = computed(() => $q.screen.lt.md);

function cpToClipBoard(resList: AmuletItem[]) {
  if (resList.length > 5000) {
    $q.notify({
      type: 'negative',
      message: t('tooLargeTips'),
    });
  } else {
    copyToClipboard(toArmorSearcherFormat(resList, selectedExportLanguage.value).join('\n'))
      .then(() => {
        $q.notify({
          type: 'positive',
          message: t('cpToClipboardSuccessMsg'),
        });
      })
      .catch(() => {
        $q.notify({
          type: 'negative',
          message: t('cpToClipboardErrorMsg'),
        });
      });
  }
}

function downloadAsTxtFile(resList: AmuletItem[]) {
  const blob = new Blob([toArmorSearcherFormat(resList, selectedExportLanguage.value).join('\n')], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'results.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="column justify-start items-center full-width">
    <div class="row justify-between items-center full-width text-primary q-px-md q-pt-md">
      <div
        class="row justify-start items-center"
        :class="isLtMd ? 'text-body1 text-bold' : 'text-h6'"
      >
        <q-icon name="dashboard" />
        <span class="q-ml-md">{{ t('resultsTitle') }}</span>
        <span class="text-caption text-grey-8 q-ml-md">{{
          `${t('resultsTitleCount')}${results.length}`
        }}</span>
      </div>
      <div class="row justify-end items-center">
        <q-select
          v-model="selectedExportLanguage"
          :options="exportLanguageOptions"
          :label="t('exportLanguageSelectLabel')"
          dense
          outlined
          rounded
          emit-value
          map-options
        />
      </div>
    </div>
    <div
      v-if="results.length > 5000"
      class="row justify-between items-center full-width q-mt-md q-px-md"
    >
      <div
        class="rounded-borders bg-negative text-white row justify-start items-center full-width q-py-sm q-px-md"
      >
        <q-icon class="q-mr-md text-body1" color="white" name="warning_amber" />
        <span class="text-body1">{{ t('tooLargeTips') }}</span>
      </div>
    </div>
    <div class="row justify-between items-center full-width q-mt-md q-px-md">
      <div class="col-xs-12 col-sm-12 col-md-6 col-lg-6 col-xl-6" :class="{ 'q-pr-md': !isLtMd }">
        <q-btn
          no-caps
          no-wrap
          class="full-width"
          color="primary"
          outline
          rounded
          icon="file_copy"
          :label="t('cpToClipboardBtn')"
          @click="cpToClipBoard(results)"
          :disable="results.length > 5000"
        />
      </div>
      <div
        class="col-xs-12 col-sm-12 col-md-6 col-lg-6 col-xl-6"
        :class="isLtMd ? 'q-mt-md' : 'q-pl-md'"
      >
        <q-btn
          no-caps
          no-wrap
          class="full-width"
          color="primary"
          outline
          rounded
          icon="download"
          :label="t('exportBtn')"
          @click="downloadAsTxtFile(results)"
        />
      </div>
    </div>
    <div class="row justify-start items-center full-width q-mt-md">
      <q-virtual-scroll
        style="max-height: 450px; width: 100%"
        :items="props.results"
        v-slot="{ item, index }"
      >
        <q-item :key="index">
          <div class="row justify-between items-center full-width" :class="{ reverse: !isLtMd }">
            <div class="col col-shrink row justify-center items-center q-pr-md">
              <q-btn
                no-caps
                no-wrap
                color="primary"
                flat
                :rounded="!isLtMd"
                :round="isLtMd"
                icon="file_copy"
                :label="isLtMd ? '' : t('cpToClipboardBtn')"
                @click="cpToClipBoard([item])"
              />
            </div>
            <div class="col column justify-center items-center">
              <div class="row justify-start items-center full-width">
                <q-badge>{{ item.rare.rare }}</q-badge>
                <span class="q-ml-sm text-body1">{{
                  item.rare.name.find((n: ItemI18n) => n.languageCode === selectedExportLanguage)
                    ?.name ?? 'Unknown'
                }}</span>
                <div v-if="!isLtMd" class="row justify-center items-center no-wrap q-ml-md">
                  <q-icon name="img:/greatsword.png" />
                  <span class="text-subtitle1 text-grey-8 q-ml-xs">{{
                    item.slot.weaponSlot.join('-')
                  }}</span>
                </div>
                <div v-if="!isLtMd" class="row justify-center items-center no-wrap q-ml-md">
                  <q-icon name="img:/head.png" />
                  <span class="text-subtitle1 text-grey-8 q-ml-xs">{{
                    item.slot.equipmentSlot.join('-')
                  }}</span>
                </div>
              </div>
              <div
                v-if="isLtMd"
                class="row justify-start items-center full-width"
                :class="isLtMd ? 'q-mt-xs' : 'q-mt-sm'"
              >
                <div class="row justify-center items-center no-wrap">
                  <q-icon name="img:/greatsword.png" />
                  <span class="text-subtitle1 text-grey-8 q-ml-xs">{{
                    item.slot.weaponSlot.join('-')
                  }}</span>
                </div>
                <div class="row justify-center items-center no-wrap q-ml-md">
                  <q-icon name="img:/head.png" />
                  <span class="text-subtitle1 text-grey-8 q-ml-xs">{{
                    item.slot.equipmentSlot.join('-')
                  }}</span>
                </div>
              </div>
              <div
                class="row justify-start items-center full-width"
                :class="isLtMd ? 'q-mt-xs' : 'q-mt-sm'"
              >
                <span v-for="(skill, index) in item.skills" :key="index">
                  <span v-if="skill !== undefined" class="q-mr-md text-grey-8">{{
                    `Lv.${skill.level} ${skill.name.find((n: ItemI18n) => n.languageCode === selectedExportLanguage)?.name ?? 'Unknown'}`
                  }}</span>
                </span>
              </div>
            </div>
          </div>
        </q-item>
      </q-virtual-scroll>
    </div>
  </div>
</template>
