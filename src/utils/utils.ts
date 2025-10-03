import type { SelectedSkill, Skill, SkillItem } from 'src/interface/skill';
import type { Amulet, AmuletItem, AmuletWithSkillPool } from 'src/interface/amulet';

/** 根据技能点标识从技能池中取得对应的技能列表，并且只保留已选技能。
 * @param {Skill[]} skillPool 全量技能池数据。
 * @param {string|number} skillPt 技能点标识。
 * @param {SelectedSkill[]} selectedSkills 已选技能集合。
 * @returns {SkillItem[]} 匹配到的技能列表，找不到时返回空数组。
 */
function getSkillPoolBySkillPt(
  skillPool: Skill[],
  skillPt: string | number,
  selectedSkills: SelectedSkill[],
): SkillItem[] | undefined {
  if (skillPt.toString() === '0') return undefined;
  const skill = skillPool.find((s) => s.skillPt.toString() === skillPt.toString());
  if (!skill) return [];

  const selectedSkillIdSet = new Set(selectedSkills.map((s) => s.skillId));
  const filteredSkillItems = skill.skillList.filter((s) => selectedSkillIdSet.has(s.id));

  return filteredSkillItems.length > 0 ? filteredSkillItems : [];
}

/** 按已选技能过滤带技能池的护石。
 * - bothMode 为 `true` 时：护石必须同时包含全部已选技能。
 * - bothMode 为 `false` 时：护石只需包含任意一个已选技能。
 * @param {AmuletWithSkillPool[]} amuletWithSkillPool 待过滤的护石集合。
 * @param {SelectedSkill[]} selectedSkills 已选技能集合。
 * @param {boolean} [bothMode=false] 是否启用同时包含全部已选技能的模式，默认为 `false`。
 * @returns {AmuletWithSkillPool[]} 过滤后的护石集合。
 */
function filterAmuletWithSkillPoolBySelectedSkills(
  amuletWithSkillPool: AmuletWithSkillPool[],
  selectedSkills: SelectedSkill[],
  bothMode: boolean = false,
): AmuletWithSkillPool[] {
  const selectedSkillIdSet = new Set(selectedSkills.map((s) => s.skillId));
  if (selectedSkillIdSet.size === 0) return amuletWithSkillPool;

  return amuletWithSkillPool.filter((amulet: AmuletWithSkillPool) => {
    // 仅保留数组类型的池；空数组也参与判断
    const pools = [amulet.skillPool1, amulet.skillPool2, amulet.skillPool3].filter(
      (p): p is SkillItem[] => Array.isArray(p),
    );

    // 若没有任何数组类型的池，直接不匹配
    if (pools.length === 0) return false;

    // 按池检查是否命中至少一个已选技能（过滤 id=0 的占位）
    const poolHits = pools.map((pool) =>
      pool.some((s) => s.id !== 0 && selectedSkillIdSet.has(s.id)),
    );

    // bothMode: 每个池都要至少命中一个；否则任意一个池命中即可
    return bothMode ? poolHits.every(Boolean) : poolHits.some(Boolean);
  });
}

/** 基于技能池与护石池生成可用护石列表：
 * 1\. 将护石的技能点映射为具体技能池；
 * 2\. 过滤出包含已选技能的护石；
 * 3\. 按命中数量排序并截断为 `maxNumber`；
 * 4\. 映射为 `AmuletItem` 输出。
 * @param {Skill[]} skillPool 全量技能池数据。
 * @param {Amulet[]} amuletPool 全量护石池数据。
 * @param {SelectedSkill[]} selectedSkills 已选技能集合，空数组时返回空结果。
 * @param {boolean} strictMode 是否启用同时包含全部已选技能的模式。
 * @param {number} [maxNumber=5000] 返回结果的最大数量上限。
 * @returns {AmuletItem[]} 生成的护石条目列表。
 */
function generateAmuletList(
  skillPool: Skill[],
  amuletPool: Amulet[],
  selectedSkills: SelectedSkill[],
  strictMode: boolean,
  maxNumber: number = 5000,
): Promise<AmuletItem[]> {
  return new Promise((resolve, reject) => {
    try {
      // 将计算逻辑推迟到下一个事件循环，以防止阻塞
      setTimeout(() => {
        if (selectedSkills.length === 0) {
          reject(new Error('No skills selected')); // 没有选择技能时，拒绝 Promise
          return;
        }

        let amuletPoolWithSkillPool: AmuletWithSkillPool[] = [];
        amuletPool.forEach((amulet: Amulet) => {
          amuletPoolWithSkillPool.push({
            ...amulet,
            skillPool1: getSkillPoolBySkillPt(skillPool, amulet.skillPt1, selectedSkills),
            skillPool2: getSkillPoolBySkillPt(skillPool, amulet.skillPt2, selectedSkills),
            skillPool3: getSkillPoolBySkillPt(skillPool, amulet.skillPt3, selectedSkills),
          });
        });

        amuletPoolWithSkillPool = filterAmuletWithSkillPoolBySelectedSkills(
          amuletPoolWithSkillPool,
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
                amuletWithSkillPool.skillPool2.forEach((skill2) => {
                  if (skill1.id !== skill2.id) {
                    if (
                      amuletWithSkillPool.skillPool3 &&
                      amuletWithSkillPool.skillPool3.length > 0
                    ) {
                      amuletWithSkillPool.skillPool3.forEach((skill3) => {
                        if (skill3.id !== skill1.id && skill3.id !== skill2.id) {
                          result.push({
                            rare: amuletWithSkillPool.rare,
                            slot: amuletWithSkillPool.slot,
                            skills: [skill1, skill2, skill3],
                          });
                        }
                      });
                    } else {
                      result.push({
                        rare: amuletWithSkillPool.rare,
                        slot: amuletWithSkillPool.slot,
                        skills: [skill1, skill2, undefined],
                      });
                    }
                  }
                });
              }
            });
          }
        });

        resolve(result); // 成功时，返回最终结果
      }, 0);
    } catch {
      reject(new Error('Search Error')); // 如果计算过程中发生任何同步错误，则拒绝 Promise
    }
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
