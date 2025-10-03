<script setup lang="ts">
import { useQuasar } from 'quasar';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SelectedSkill, SkillItem, Skill } from 'src/interface/skill';
import LoadingPage from 'components/basic/LoadingPage.vue';
import { type Amulet, type AmuletItem } from 'src/interface/amulet';
import { type ItemI18n } from 'src/interface/item-i18n';
import { generateAmuletList, toArmorSearcherFormat } from 'src/utils/utils';

const { t } = useI18n();
const local = useI18n({ useScope: 'local' });
const $q = useQuasar();

const skillPoolList = ref<Skill[]>([]);
const amuletPoolList = ref<Amulet[]>([]);
const dataLoading = ref(true);
const searching = ref(false);
const selectedSkills = ref<SelectedSkill[]>([]);
const tipsStickyProbe = ref<HTMLElement | null>(null);
const isTipsSticky = ref(false);
const maxNumber = ref(5000);
const strictMode = ref(false);
const searchResults = ref<AmuletItem[]>([]);
const strictModeOptions = [
  { label: t('strictModeOption1'), value: true },
  { label: t('strictModeOption2'), value: false },
];

const isLtMd = computed(() => $q.screen.lt.md);
const languageCode = computed(() => local.locale.value);
const isSelected = computed(() => selectedSkills.value.some((skill) => skill.selected));
const selectedSkillsCountLess3 = computed(
  () => selectedSkills.value.filter((skill) => skill.selected).length < 3,
);
const tipsBorderRadius = computed(() => {
  return isTipsSticky.value ? '0px 0px 19px 19px' : '19px';
});

function fetchSkillPools() {
  dataLoading.value = true;
  skillPoolList.value = [];
  amuletPoolList.value = [];
  selectedSkills.value = [];
  new Promise((resolve, reject) => {
    import('assets/data/skill_pool.json?raw')
      .then((module) => {
        resolve(JSON.parse(module.default) as Skill[]);
      })
      .catch((error) => {
        reject(new Error(`Failed to load data: ${error}`));
      });
  })
    .then((data) => {
      dataLoading.value = false;
      skillPoolList.value = data as Skill[];
      skillPoolList.value.forEach((pool: Skill) => {
        pool.skillList.forEach((skill: SkillItem) => {
          selectedSkills.value.push({
            skillId: skill.id,
            skillName:
              skill.name.find((n: ItemI18n) => n.languageCode === languageCode.value)?.name ||
              'Unknown',
            selected: false,
          });
        });
      });
      // Sort selectedSkills by skillName
      selectedSkills.value.sort((a, b) => a.skillName.localeCompare(b.skillName));
      // Make selectedSkills unique by skillId
      selectedSkills.value = Array.from(
        new Map(selectedSkills.value.map((item) => [item['skillId'], item])).values(),
      );
    })
    .catch((error) => {
      dataLoading.value = false;
      $q.notify({
        type: 'negative',
        message: `${t('loadingError')}: ${error.toString()}`,
      });
    });

  new Promise((resolve, reject) => {
    dataLoading.value = true;
    import('assets/data/amulet_pool.json?raw')
      .then((module) => {
        resolve(JSON.parse(module.default) as Amulet[]);
      })
      .catch((error) => {
        reject(new Error(`Failed to load data: ${error}`));
      });
  })
    .then((data) => {
      dataLoading.value = false;
      amuletPoolList.value = data as Amulet[];
    })
    .catch((error) => {
      dataLoading.value = false;
      $q.notify({
        type: 'negative',
        message: `${t('loadingError')}: ${error.toString()}`,
      });
    });
}

function clearAllSelected() {
  $q.dialog({
    title: t('clearAllSelectedBtn'),
    message: t('clearAllSelectedConfirm'),
    persistent: true,
    focus: 'cancel',
    ok: {
      label: t('confirmBtn'),
      color: 'negative',
    },
    cancel: {
      label: t('cancelBtn'),
      color: 'primary',
    },
  }).onOk(() => {
    selectedSkills.value.forEach((skill) => {
      skill.selected = false;
    });
  });
}

function searchAmuletList() {
  searching.value = true;
  generateAmuletList(
    skillPoolList.value,
    amuletPoolList.value,
    selectedSkills.value.filter((skill) => skill.selected),
    strictMode.value,
    maxNumber.value,
  )
    .then((data: AmuletItem[]) => {
      searching.value = false;
      searchResults.value = data;
      console.log(toArmorSearcherFormat(data, languageCode.value));
    })
    .catch((error) => {
      searching.value = false;
      $q.notify({
        type: 'negative',
        message: `${t('searchError')}: ${error.toString()}`,
      });
    });
}

onMounted(() => {
  fetchSkillPools();

  if (tipsStickyProbe.value) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isTipsSticky.value = !entry.isIntersecting;
        });
      },
      { threshold: [1] },
    );
    observer.observe(tipsStickyProbe.value);
  }
});

// watch selectedSkills number, if <3 then set strictMode to false
watch(
  () => selectedSkills.value.filter((skill) => skill.selected).length,
  (newVal) => {
    if (newVal < 3) {
      strictMode.value = false;
    }
  },
);
</script>

<template>
  <div class="search-panel-wrapper column justify-start items-start full-width">
    <div
      class="row justify-start items-center full-width text-primary"
      :class="[isLtMd ? 'text-body1 text-bold' : 'text-h6', isSelected ? 'q-mb-md' : '']"
    >
      <q-icon name="list_alt" />
      <span class="q-ml-md">{{ t('skillSelectPlaceholder') }}</span>
    </div>
    <div ref="tipsStickyProbe" style="height: 1px"></div>
    <div
      v-if="isSelected"
      class="sticky-desc full-width row justify-start items-center q-pa-md bg-primary text-white"
    >
      <q-btn
        class="q-mr-sm"
        :label="t('clearAllSelectedBtn')"
        outline
        rounded
        icon="delete_forever"
        @click="clearAllSelected"
      />
      <span>{{ t('selectedTips') }}</span>
      <span v-for="skill in selectedSkills.filter((n) => n.selected)" :key="skill.skillId">
        <q-chip
          class="q-ml-sm"
          color="white"
          text-color="primary"
          outline
          removable
          @remove="skill.selected = false"
        >
          {{ skill.skillName }}
        </q-chip>
      </span>
    </div>
    <div class="row justify-center items-center full-width q-mt-md">
      <transition enter-active-class="fadeIn" leave-active-class="fadeOut">
        <div v-if="!dataLoading" class="row justify-start items-center full-width wrap">
          <div
            class="checkbox-wrapper col-xs-12 col-sm-12 col-md-4 col-lg-3 col-xl-2 q-pa-xs rounded-borders"
            v-for="skill in selectedSkills"
            :key="skill.skillId"
          >
            <q-checkbox
              class="full-width non-selectable"
              v-model="skill.selected"
              :label="skill.skillName"
              color="primary"
            />
          </div>
        </div>
        <loading-page v-else />
      </transition>
    </div>
    <div
      class="column justify-start items-center full-width q-mt-md"
      :class="isLtMd ? 'q-px-md' : 'q-px-xl'"
    >
      <div class="row justify-between items-center full-width">
        <span
          class="col-xs-12 col-sm-12 col-md-6 col-lg-6 col-xl-6 text-body1"
          :class="{ 'text-center q-mb-sm': isLtMd }"
          >{{ t('maxNumberInput') }}</span
        >
        <q-input
          class="col-xs-12 col-sm-12 col-md-6 col-lg-6 col-xl-6"
          v-model.number="maxNumber"
          outlined
          rounded
          :dense="isLtMd"
          color="primary"
        >
          <template v-slot:append>
            <q-btn flat round icon="add" @click="maxNumber += 100" />
          </template>
          <template v-slot:prepend>
            <q-btn flat round icon="remove" @click="maxNumber = Math.max(100, maxNumber - 100)" />
          </template>
        </q-input>
      </div>
      <div
        class="row justify-start items-center full-width text-subtitle2 text-grey-8"
        :class="{ 'q-mt-sm': isLtMd }"
      >
        <span>{{ t('maxNumberInputToolTip') }}</span>
      </div>
      <div class="row justify-between items-center full-width q-mt-md">
        <span
          class="col-xs-12 col-sm-12 col-md-6 col-lg-6 col-xl-6 text-body1"
          :class="{ 'text-center q-mb-sm': isLtMd }"
          >{{ t('strictModeSwitch') }}</span
        >
        <q-select
          class="col-xs-12 col-sm-12 col-md-6 col-lg-6 col-xl-6"
          v-model="strictMode"
          :options="strictModeOptions"
          outlined
          rounded
          emit-value
          map-options
          :dense="isLtMd"
          :disable="selectedSkillsCountLess3"
          color="primary"
        />
      </div>
      <div
        class="row justify-start items-center full-width text-subtitle2 text-grey-8"
        :class="{ 'q-mt-sm': isLtMd }"
      >
        <span>{{ t('strictModeSwitchTip') }}</span>
      </div>
      <div class="row justify-center items-center full-width q-mt-md">
        <q-btn
          class="full-width"
          :label="t('searchBtn')"
          color="primary"
          rounded
          :loading="searching"
          :disable="!isSelected"
          @click="searchAmuletList"
        >
          <template v-slot:loading>
            <q-spinner color="white" />
          </template>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<style scoped lang="sass">
.search-panel-wrapper
  .sticky-desc
    position: sticky
    top: 0
    z-index: 1
    border-radius: v-bind(tipsBorderRadius)
    transition: all 0.15s ease-in-out

  .checkbox-wrapper
    background-color: rgba($primary, 0)
    transition: all 0.3s ease-in-out

  .checkbox-wrapper:hover
    background-color: rgba($primary, 0.1)
</style>
