import type { Skill, SelectedSkill, SkillItem } from 'src/interface/skill';
import type {
  Amulet,
  AmuletItem,
  AmuletRare,
  AmuletSlot,
  AmuletWithSkillPool,
} from 'src/interface/amulet';
import { filterBestAmulets } from 'src/utils/pareto-optimal-filtering';

self.onmessage = (e: MessageEvent) => {
  const { skillPool, amuletPool, selectedSkills, strictMode, maxNumber, enableFilter } = e.data;

  try {
    const result = calculateAmuletList(
      skillPool,
      amuletPool,
      selectedSkills,
      strictMode,
      maxNumber,
      enableFilter,
    );
    self.postMessage({ success: true, data: result });
  } catch (error) {
    self.postMessage({ success: false, error: (error as Error).message });
  }
};

function getSkillPoolBySkillPt(
  skillPool: Skill[],
  skillPt: string | number,
  selectedSkills: SelectedSkill[],
  noFilter: boolean = false,
): SkillItem[] | undefined {
  if (skillPt.toString() === '0') return undefined;
  if (noFilter) {
    return skillPool.find((s) => s.skillPt.toString() === skillPt.toString())?.skillList || [];
  } else {
    const skill = skillPool.find((s) => s.skillPt.toString() === skillPt.toString());
    if (!skill) return [];

    const selectedSkillIdSet = new Set(selectedSkills.map((s) => s.skillId));
    const filteredSkillItems = skill.skillList.filter((s) => selectedSkillIdSet.has(s.id));

    return filteredSkillItems.length > 0 ? filteredSkillItems : [];
  }
}

function filterAmuletBySelectedSkills(
  skillPool: Skill[],
  amulet: Amulet[],
  selectedSkills: SelectedSkill[],
  bothMode: boolean = false,
): AmuletWithSkillPool[] {
  const res: AmuletWithSkillPool[] = [];
  if (selectedSkills.length === 0) return res;

  amulet.forEach((a: Amulet) => {
    const skillPool1Filtered = getSkillPoolBySkillPt(skillPool, a.skillPt1, selectedSkills, false);
    const skillPool2Filtered = getSkillPoolBySkillPt(skillPool, a.skillPt2, selectedSkills, false);
    const skillPool3Filtered = getSkillPoolBySkillPt(skillPool, a.skillPt3, selectedSkills, false);

    if (bothMode) {
      const amuletWithSkillPool: AmuletWithSkillPool = {
        ...a,
        skillPool1: skillPool1Filtered,
        skillPool2: skillPool2Filtered,
        skillPool3: skillPool3Filtered,
      };
      if (
        (amuletWithSkillPool.skillPool1 === undefined ||
          amuletWithSkillPool.skillPool1.length > 0) &&
        (amuletWithSkillPool.skillPool2 === undefined ||
          amuletWithSkillPool.skillPool2.length > 0) &&
        (amuletWithSkillPool.skillPool3 === undefined || amuletWithSkillPool.skillPool3.length > 0)
      )
        res.push(amuletWithSkillPool);
    } else {
      const totalSkillPool: SkillItem[] = [
        ...(skillPool1Filtered ?? []),
        ...(skillPool2Filtered ?? []),
        ...(skillPool3Filtered ?? []),
      ];
      if (totalSkillPool.length > 0) {
        const amuletWithSkillPool: AmuletWithSkillPool = {
          ...a,
          skillPool1:
            skillPool1Filtered !== undefined && skillPool1Filtered.length === 0
              ? getSkillPoolBySkillPt(skillPool, a.skillPt1, selectedSkills, true)
              : skillPool1Filtered,
          skillPool2:
            skillPool2Filtered !== undefined && skillPool2Filtered.length === 0
              ? getSkillPoolBySkillPt(skillPool, a.skillPt2, selectedSkills, true)
              : skillPool2Filtered,
          skillPool3:
            skillPool3Filtered !== undefined && skillPool3Filtered.length === 0
              ? getSkillPoolBySkillPt(skillPool, a.skillPt3, selectedSkills, true)
              : skillPool3Filtered,
        };
        res.push(amuletWithSkillPool);
      }
    }
  });

  return res;
}

function calculateAmuletList(
  skillPool: Skill[],
  amuletPool: Amulet[],
  selectedSkills: SelectedSkill[],
  strictMode: boolean,
  maxNumber: number,
  enableFilter: boolean = true,
): AmuletItem[] {
  if (selectedSkills.length === 0) {
    throw new Error('No skills selected');
  }

  let amuletPoolWithSkillPool = filterAmuletBySelectedSkills(
    skillPool,
    amuletPool,
    selectedSkills,
    strictMode,
  );

  const selectedSkillIdSet = new Set(selectedSkills.map((s) => s.skillId));
  amuletPoolWithSkillPool.sort((a, b) => {
    const aSkillIds = [
      ...(a.skillPool1 ?? []).map((s) => s.id),
      ...(a.skillPool2 ?? []).map((s) => s.id),
      ...(a.skillPool3 ?? []).map((s) => s.id),
    ];

    const bSkillIds = [
      ...(b.skillPool1 ?? []).map((s) => s.id),
      ...(b.skillPool2 ?? []).map((s) => s.id),
      ...(b.skillPool3 ?? []).map((s) => s.id),
    ];

    const aCount = aSkillIds.filter((id) => selectedSkillIdSet.has(id)).length;
    const bCount = bSkillIds.filter((id) => selectedSkillIdSet.has(id)).length;

    return bCount - aCount;
  });
  amuletPoolWithSkillPool = amuletPoolWithSkillPool.slice(0, maxNumber);

  const result: AmuletItem[] = [];
  amuletPoolWithSkillPool.forEach((amuletWithSkillPool: AmuletWithSkillPool) => {
    if (amuletWithSkillPool.skillPool1 && amuletWithSkillPool.skillPool1.length > 0) {
      amuletWithSkillPool.skillPool1.forEach((skill1) => {
        if (amuletWithSkillPool.skillPool2 && amuletWithSkillPool.skillPool2.length > 0) {
          amuletWithSkillPool.skillPool2
            .filter((skill2) => {
              return skill2.id !== skill1.id;
            })
            .forEach((skill2) => {
              if (amuletWithSkillPool.skillPool3 && amuletWithSkillPool.skillPool3.length > 0) {
                amuletWithSkillPool.skillPool3
                  .filter((skill3) => {
                    return skill3.id !== skill1.id && skill3.id !== skill2.id;
                  })
                  .forEach((skill3) => {
                    result.push({
                      rare: amuletWithSkillPool.rare,
                      slot: amuletWithSkillPool.slot,
                      skills: [skill1, skill2, skill3],
                    });
                  });
              } else {
                result.push({
                  rare: amuletWithSkillPool.rare,
                  slot: amuletWithSkillPool.slot,
                  skills: [skill1, skill2, undefined],
                });
              }
            });
        }
      });
    }
  });

  const resSet: {
    rare: AmuletRare;
    slot: AmuletSlot;
    skills: Set<SkillItem | undefined>;
  }[] = [];
  result.forEach((r) => {
    resSet.push({
      rare: r.rare,
      slot: r.slot,
      skills: new Set(r.skills),
    });
  });

  const finalResult: AmuletItem[] = [];
  resSet.forEach((r) => {
    if (
      !finalResult.find(
        (fr) =>
          fr.rare.id === r.rare.id &&
          fr.slot.slotPt === r.slot.slotPt &&
          fr.skills.length === r.skills.size &&
          fr.skills.every((s) => r.skills.has(s)),
      )
    ) {
      finalResult.push({
        rare: r.rare,
        slot: r.slot,
        skills: Array.from(r.skills),
      });
    }
  });

  finalResult.sort((a, b) => getRareLevel(b.rare) - getRareLevel(a.rare));

  if (enableFilter) {
    return filterBestAmulets(finalResult);
  }

  return finalResult;
}

function getRareLevel(rare: AmuletRare): number {
  const match = rare.rare.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}
