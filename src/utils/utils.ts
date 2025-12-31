import type { SelectedSkill, Skill, SkillItem } from 'src/interface/skill';
import type { Amulet, AmuletItem } from 'src/interface/amulet';

/** 基于技能池与护石池生成可用护石列表:
 * 1\. 将护石的技能点映射为具体技能池;
 * 2\. 过滤出包含已选技能的护石;
 * 3\. 按命中数量排序并截断为 `maxNumber`;
 * 4\. 映射为 `AmuletItem` 输出。
 * @param {Skill[]} skillPool 全量技能池数据。
 * @param {Amulet[]} amuletPool 全量护石池数据。
 * @param {SelectedSkill[]} selectedSkills 已选技能集合,空数组时返回空结果。
 * @param {boolean} strictMode 是否启用同时包含全部已选技能的模式。
 * @param {boolean} [enableFilter=false] 是否启用帕累托最优过滤。
 * @returns {Promise<AmuletItem[]>} 生成的护石条目列表。
 */
function generateAmuletList(
  skillPool: Skill[],
  amuletPool: Amulet[],
  selectedSkills: SelectedSkill[],
  strictMode: boolean,
  enableFilter: boolean = false,
): Promise<AmuletItem[]> {
  return new Promise((resolve, reject) => {
    if (selectedSkills.length === 0) {
      reject(new Error('No skills selected'));
      return;
    }

    const worker = new Worker(new URL('../workers/utils.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.postMessage({
      skillPool: JSON.parse(JSON.stringify(skillPool)),
      amuletPool: JSON.parse(JSON.stringify(amuletPool)),
      selectedSkills: JSON.parse(JSON.stringify(selectedSkills)),
      strictMode,
      enableFilter,
    });

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.success) {
        resolve(e.data.data);
      } else {
        reject(new Error(e.data.error));
      }
      worker.terminate();
    };

    worker.onerror = (error) => {
      reject(new Error(`Worker error: ${error.message}`));
      worker.terminate();
    };
  });
}

function toArmorSearcherFormat(amuletList: AmuletItem[], languageCode: string): string[] {
  const res: string[] = [];
  amuletList.forEach((amulet: AmuletItem) => {
    const skillParts: string[] = [];
    amulet.skills.forEach((skill: SkillItem | undefined) => {
      if (skill) {
        skillParts.push(skill.name.find((n) => n.languageCode === languageCode)?.name || 'Unknown');
        skillParts.push(skill.level.toString());
      } else {
        skillParts.push('');
        skillParts.push('0');
      }
    });
    res.push(
      `${skillParts.join(',')},${amulet.slot.equipmentSlot.join(',')},${amulet.slot.weaponSlot.join(',')}`,
    );
  });
  return res;
}

export { generateAmuletList, toArmorSearcherFormat };
