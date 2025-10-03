<script setup lang="ts">
import { useQuasar } from 'quasar';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SkillItem, SkillName, SkillPool } from 'src/interface/skill-pool';
import LoadingPage from 'components/basic/LoadingPage.vue';

const { t } = useI18n();
const local = useI18n({ useScope: 'local' });
const $q = useQuasar();

const skillPoolList = ref<SkillPool[]>([]);
const skillPoolLoading = ref(true);
const selectedSkills = ref<
  {
    skillId: string | number;
    skillName: string;
    selected: boolean;
    disabled: boolean;
  }[]
>([]);
const tipsStickyProbe = ref<HTMLElement | null>(null);
const isTipsSticky = ref(false);
const maxSelectedSkills: number = 3;

const isLtMd = computed(() => $q.screen.lt.md);
const languageCode = computed(() => local.locale.value);
const isSelected = computed(() => selectedSkills.value.some((skill) => skill.selected));
const tipsBorderRadius = computed(() => {
  return isTipsSticky.value ? '0px 0px 19px 19px' : '19px';
});

function fetchSkillPools() {
  skillPoolLoading.value = true;
  skillPoolList.value = [];
  selectedSkills.value = [];
  new Promise((resolve, reject) => {
    import('assets/data/skill_pool.json?raw')
      .then((module) => {
        resolve(JSON.parse(module.default) as SkillPool[]);
      })
      .catch((error) => {
        reject(new Error(`Failed to load data: ${error}`));
      });
  })
    .then((data) => {
      skillPoolLoading.value = false;
      skillPoolList.value = data as SkillPool[];
      skillPoolList.value.forEach((pool: SkillPool) => {
        pool.skillList.forEach((skill: SkillItem) => {
          selectedSkills.value.push({
            skillId: skill.id,
            skillName:
              skill.name.find((n: SkillName) => n.languageCode === languageCode.value)?.name ||
              'Unknown',
            selected: false,
            disabled: false,
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
      skillPoolLoading.value = false;
      console.error(error);
    });
}

// check selected skills count and disable others if exceed maxSelectedSkills
function updateSkillSelection() {
  const selectedCount = selectedSkills.value.filter((skill) => skill.selected).length;
  if (selectedCount >= maxSelectedSkills) {
    selectedSkills.value.forEach((skill) => {
      if (!skill.selected) {
        skill.disabled = true;
      }
    });
  } else {
    selectedSkills.value.forEach((skill) => {
      skill.disabled = false;
    });
  }
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

watch(
  () => selectedSkills.value.map((skill) => skill.selected),
  () => {
    updateSkillSelection();
  },
  { deep: true },
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
        <div v-if="!skillPoolLoading" class="row justify-start items-center full-width wrap">
          <div
            class="col-xs-12 col-sm-12 col-md-4 col-lg-3 col-xl-2 q-pa-xs rounded-borders"
            :class="{ 'checkbox-wrapper': !skill.disabled }"
            v-for="skill in selectedSkills"
            :key="skill.skillId"
          >
            <q-checkbox
              class="full-width non-selectable"
              v-model="skill.selected"
              :label="skill.skillName"
              color="primary"
              :disable="skill.disabled"
            />
          </div>
        </div>
        <loading-page v-else />
      </transition>
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
