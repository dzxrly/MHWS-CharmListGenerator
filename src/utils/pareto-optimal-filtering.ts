import { type AmuletItem } from 'src/interface/amulet';
import { type SkillItem } from 'src/interface/skill';

// 内部使用的包装类型
interface ProcessedAmulet {
  original: AmuletItem;
  originalIndex: number;
  skillMap: Map<string, number>;
  skillTypesKey: string; // 仅包含ID (e.g. "101,105") -> 用于第一轮
  skillValuesKey: string; // 包含ID和等级 (e.g. "101:2,105:1") -> 用于第二轮
  skillCount: number;
}

/**
 * 筛选护石算法 (Pareto Optimal Filtering)
 * * 流程：
 * 1. 预处理：计算特征。
 * 2. 第一轮 (Step 2)：固定孔位 (Slot)，筛选出技能最强的护石。
 * 3. 第二轮 (Step 4)：固定技能 (Skill Types + Levels)，筛选出孔位最强的护石。
 */
export function filterBestAmulets(amulets: AmuletItem[]): AmuletItem[] {
  if (!amulets || amulets.length === 0) return [];

  // --- 步骤 1: 预处理与分组 (Preprocessing & Grouping) ---
  // Key = WeaponSlot + EquipmentSlot 的序列化字符串
  const slotGroups = new Map<string, ProcessedAmulet[]>();

  amulets.forEach((item, index) => {
    // 1.1 数据清洗
    const validSkills = (item.skills || []).filter((s): s is SkillItem => !!s);

    const skillMap = new Map<string, number>();
    const skillIds: string[] = [];

    for (const s of validSkills) {
      const sId = String(s.id);
      const sLv = typeof s.level === 'string' ? parseInt(s.level, 10) : s.level;

      const currentLv = skillMap.get(sId) || 0;
      skillMap.set(sId, currentLv + sLv);

      if (currentLv === 0) {
        skillIds.push(sId);
      }
    }

    // 1.2 生成技能特征
    skillIds.sort();

    // 第一轮用：只看技能种类
    const skillTypesKey = skillIds.join(',');

    // 第二轮用：看技能种类+数值 (e.g., "1:2|5:1")
    const skillValuesKey = skillIds.map((id) => `${id}:${skillMap.get(id)}`).join('|');

    // 1.3 生成分组 Key (基于孔位)
    const slotKey = `${JSON.stringify(item.slot.weaponSlot)}|${JSON.stringify(item.slot.equipmentSlot)}`;

    const processed: ProcessedAmulet = {
      original: item,
      originalIndex: index,
      skillMap,
      skillTypesKey,
      skillValuesKey, // 新增
      skillCount: skillIds.length,
    };

    if (!slotGroups.has(slotKey)) {
      slotGroups.set(slotKey, []);
    }
    slotGroups.get(slotKey)!.push(processed);
  });

  const step1Survivors: ProcessedAmulet[] = [];

  // --- 步骤 2: 基于孔位分组，筛选最佳技能 (原有逻辑) ---
  for (const groupItems of slotGroups.values()) {
    if (groupItems.length === 1) {
      step1Survivors.push(groupItems[0]!);
      continue;
    }

    // 2.1 按“技能类型”二次聚类
    const sameTypeBuckets = new Map<string, ProcessedAmulet[]>();
    for (const p of groupItems) {
      if (!sameTypeBuckets.has(p.skillTypesKey)) {
        sameTypeBuckets.set(p.skillTypesKey, []);
      }
      sameTypeBuckets.get(p.skillTypesKey)!.push(p);
    }

    // 2.2 同类型筛选 (数值帕累托)
    const typeSurvivors: ProcessedAmulet[] = [];
    for (const items of sameTypeBuckets.values()) {
      typeSurvivors.push(...getSameTypeParetoFrontier(items));
    }

    // 2.3 跨类型筛选 (子集支配)
    typeSurvivors.sort((a, b) => b.skillCount - a.skillCount);
    const groupSurvivors: ProcessedAmulet[] = [];

    for (const candidate of typeSurvivors) {
      let isDominated = false;
      for (const superior of groupSurvivors) {
        if (superior.skillCount === candidate.skillCount) continue;
        if (isSubsetAndDominated(candidate, superior)) {
          isDominated = true;
          break;
        }
      }
      if (!isDominated) {
        groupSurvivors.push(candidate);
      }
    }
    step1Survivors.push(...groupSurvivors);
  }

  // --- 步骤 3: 准备第二轮筛选 (基于技能分组) ---
  // 此时 step1Survivors 里的护石，已经是各孔位模版下的技能最优解。
  // 现在我们要跨孔位比较：如果技能完全一样，保留孔位更好的。

  const skillValueGroups = new Map<string, ProcessedAmulet[]>();
  for (const p of step1Survivors) {
    if (!skillValueGroups.has(p.skillValuesKey)) {
      skillValueGroups.set(p.skillValuesKey, []);
    }
    skillValueGroups.get(p.skillValuesKey)!.push(p);
  }

  const finalSurvivors: ProcessedAmulet[] = [];

  // --- 步骤 4: 基于技能分组，筛选最佳孔位 (新增逻辑) ---
  for (const groupItems of skillValueGroups.values()) {
    // 只有1个直接保留
    if (groupItems.length === 1) {
      finalSurvivors.push(groupItems[0]!);
      continue;
    }

    // 在同技能组内，进行孔位的 Pareto 筛选
    const survivorsInGroup = getSlotParetoFrontier(groupItems);
    finalSurvivors.push(...survivorsInGroup);
  }

  // --- 步骤 5: 结果整理 ---
  finalSurvivors.sort((a, b) => a.originalIndex - b.originalIndex);
  return finalSurvivors.map((p) => p.original);
}

// =========================================================================
//  Helpers - Skill Logic (第一轮相关)
// =========================================================================

function getSameTypeParetoFrontier(items: ProcessedAmulet[]): ProcessedAmulet[] {
  if (items.length === 1) return items;
  const result: ProcessedAmulet[] = [];
  for (let i = 0; i < items.length; i++) {
    let dominated = false;
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      if (checkSkillDominance(items[j]!, items[i]!)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) result.push(items[i]!);
  }
  return result;
}

function checkSkillDominance(sup: ProcessedAmulet, sub: ProcessedAmulet): boolean {
  for (const [skillId, subLevel] of sub.skillMap) {
    const supLevel = sup.skillMap.get(skillId);
    if (supLevel === undefined) return false;
    if (supLevel < subLevel) return false;
  }
  return true;
}

function isSubsetAndDominated(sub: ProcessedAmulet, sup: ProcessedAmulet): boolean {
  return checkSkillDominance(sup, sub);
}

// =========================================================================
//  Helpers - Slot Logic (第二轮相关)
// =========================================================================

/**
 * 针对相同技能组合的护石，筛选出孔位最优的集合
 */
function getSlotParetoFrontier(items: ProcessedAmulet[]): ProcessedAmulet[] {
  const result: ProcessedAmulet[] = [];

  for (let i = 0; i < items.length; i++) {
    let dominated = false;
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;

      // 检查 j 是否支配 i (孔位上 j 是否 >= i)
      if (checkFullSlotDominance(items[j]!, items[i]!)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) {
      result.push(items[i]!);
    }
  }
  return result;
}

/**
 * 检查 slotSup 是否在孔位上完全支配 slotSub
 * 规则：Weapon 和 Equipment 必须分别满足支配条件 (>=)，且不能完全相等(去重在外部逻辑，或此处视为支配)
 * 根据帕累托过滤惯例，如果 A >= B，则 B 被淘汰。
 */
function checkFullSlotDominance(sup: ProcessedAmulet, sub: ProcessedAmulet): boolean {
  const wDom = isSlotBetterOrEqual(sup.original.slot.weaponSlot, sub.original.slot.weaponSlot);
  const eDom = isSlotBetterOrEqual(
    sup.original.slot.equipmentSlot,
    sub.original.slot.equipmentSlot,
  );

  // 必须两方面都 >= 才能算支配
  return wDom && eDom;
}

/**
 * 核心孔位对比逻辑
 * 对比规则：
 * 1. 数组长度一致 (均为 number[])。
 * 2. 只有非0个数相同，才能对比；否则返回 false (不可比)。
 * 3. 在非0个数相同的前提下，每一位都 >= 目标，才返回 true。
 * @param arrSup 强者数组
 * @param arrSub 弱者数组
 */
function isSlotBetterOrEqual(arrSup: number[], arrSub: number[]): boolean {
  // 1. 计算非0个数
  const countSup = arrSup.filter((n) => n > 0).length;
  const countSub = arrSub.filter((n) => n > 0).length;

  // 规则：如果非0个数不同，则不能对比，互不支配
  if (countSup !== countSub) {
    return false;
  }

  // 规则：逐位比较 (前提是数组已降序，用户保证)
  // 因为是固定长度数组比较，长度通常为3
  const len = Math.max(arrSup.length, arrSub.length);
  for (let i = 0; i < len; i++) {
    const vSup = arrSup[i] || 0;
    const vSub = arrSub[i] || 0;

    if (vSup < vSub) {
      return false; // 只要有一位弱，就不能支配
    }
  }

  return true; // 所有位都 >=
}
