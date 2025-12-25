import { type AmuletItem } from 'src/interface/amulet';
import { type SkillItem } from 'src/interface/skill';

// 内部使用的包装类型，用于缓存计算出的特征，避免重复运算
interface ProcessedAmulet {
  original: AmuletItem; // 保留原始对象的引用
  originalIndex: number; // 原始索引，用于最后恢复排序
  skillMap: Map<string, number>; // 技能ID -> 总等级
  skillTypesKey: string; // 技能类型指纹 (e.g. "101,105")
  skillCount: number; // 有效技能数量
}

/**
 * 筛选护石算法 (Pareto Optimal Filtering)
 * * 规则：
 * 1. 忽略 Rare (稀有度)。
 * 2. Slot (孔位) 作为分组依据，只有孔位完全相同的护石才会互相竞争。
 * 3. 在同组内，保留所有“非受支配”的护石。
 * * @param amulets 原始护石列表
 * @returns 筛选后的最佳护石列表 (AmuletItem[])
 */
export function filterBestAmulets(amulets: AmuletItem[]): AmuletItem[] {
  if (!amulets || amulets.length === 0) return [];

  // --- 步骤 1: 预处理与分组 (Preprocessing & Grouping) ---
  // Key = WeaponSlot + EquipmentSlot 的序列化字符串
  const groups = new Map<string, ProcessedAmulet[]>();

  amulets.forEach((item, index) => {
    // 1.1 数据清洗：移除无效技能 (undefined)，累加重复技能等级
    const validSkills = (item.skills || []).filter((s): s is SkillItem => !!s);

    const skillMap = new Map<string, number>();
    const skillIds: string[] = [];

    for (const s of validSkills) {
      const sId = String(s.id);
      // 兼容 level 可能是字符串的情况
      const sLv = typeof s.level === 'string' ? parseInt(s.level, 10) : s.level;

      const currentLv = skillMap.get(sId) || 0;
      skillMap.set(sId, currentLv + sLv);

      // 记录ID用于生成指纹 (仅在第一次遇到时添加)
      if (currentLv === 0) {
        skillIds.push(sId);
      }
    }

    // 1.2 生成技能特征
    skillIds.sort(); // 排序以确保 "A,B" 和 "B,A" 生成相同的 Key
    const skillTypesKey = skillIds.join(',');

    // 1.3 生成分组 Key (核心属性 A+B)
    // 忽略 rare，仅使用 weaponSlot 和 equipmentSlot
    const slotKey = `${JSON.stringify(item.slot.weaponSlot)}|${JSON.stringify(item.slot.equipmentSlot)}`;

    // 1.4 包装对象
    const processed: ProcessedAmulet = {
      original: item,
      originalIndex: index,
      skillMap,
      skillTypesKey,
      skillCount: skillIds.length,
    };

    if (!groups.has(slotKey)) {
      groups.set(slotKey, []);
    }
    groups.get(slotKey)!.push(processed);
  });

  const survivors: ProcessedAmulet[] = [];

  // --- 步骤 2: 组内筛选 (Intra-Group Filtering) ---
  for (const groupItems of groups.values()) {
    // 极速路径：如果该孔位模版下只有一个护石，直接保留
    if (groupItems.length === 1) {
      survivors.push(groupItems[0]!);
      continue;
    }

    // 2.1 按“技能类型”二次聚类
    // 将技能组合完全一样（比如都是 攻击+看破）的放在一起
    const sameTypeBuckets = new Map<string, ProcessedAmulet[]>();
    for (const p of groupItems) {
      if (!sameTypeBuckets.has(p.skillTypesKey)) {
        sameTypeBuckets.set(p.skillTypesKey, []);
      }
      sameTypeBuckets.get(p.skillTypesKey)!.push(p);
    }

    // 2.2 同类型筛选：保留数值上的帕累托前沿
    // 此时不考虑“不同技能组合”之间的关系，只看“同技能”下的数值压制
    const typeSurvivors: ProcessedAmulet[] = [];
    for (const items of sameTypeBuckets.values()) {
      typeSurvivors.push(...getSameTypeParetoFrontier(items));
    }

    // 2.3 跨类型筛选：处理子集支配关系
    // 策略：按技能数量降序排列 (3 -> 2 -> 1 -> 0)
    // 只有技能多的组合，才有可能支配技能少的组合。
    typeSurvivors.sort((a, b) => b.skillCount - a.skillCount);

    const groupSurvivors: ProcessedAmulet[] = [];

    for (const candidate of typeSurvivors) {
      let isDominated = false;

      // 遍历已经存活的、技能数量 >= candidate 的强者
      for (const superior of groupSurvivors) {
        // 如果技能数相同，之前 2.2 已经处理过同类型数值比较了。
        // 如果这里技能数相同但类型不同（如 {A,B} vs {A,C}），则互不支配，跳过。
        if (superior.skillCount === candidate.skillCount) continue;

        // 检查子集支配关系：
        // superior 是否拥有 candidate 的所有技能，且等级均不低于 candidate？
        if (isSubsetAndDominated(candidate, superior)) {
          isDominated = true;
          break; // 被支配，淘汰
        }
      }

      if (!isDominated) {
        groupSurvivors.push(candidate);
      }
    }

    // 将本组幸存者加入总列表
    survivors.push(...groupSurvivors);
  }

  // --- 步骤 3: 结果整理与拆包 (Formatting & Unpacking) ---

  // 3.1 恢复原始顺序 (可选，但推荐，保证UI列表不乱跳)
  survivors.sort((a, b) => a.originalIndex - b.originalIndex);

  // 3.2 拆包：将 ProcessedAmulet 映射回 AmuletItem
  return survivors.map((p) => p.original);
}

/**
 * 辅助：同类型筛选
 * 当技能 ID 集合完全一致时，只需比较等级。
 */
function getSameTypeParetoFrontier(items: ProcessedAmulet[]): ProcessedAmulet[] {
  if (items.length === 1) return items;

  const result: ProcessedAmulet[] = [];

  for (let i = 0; i < items.length; i++) {
    let dominated = false;
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      // 如果 j 支配 i，则 i 淘汰
      if (checkDominance(items[j]!, items[i]!)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) {
      result.push(items[i]!); // 这里也加上 ! 以防万一
    }
  }
  return result;
}

/**
 * 核心支配逻辑检查
 * 判断 A (sup) 是否支配 B (sub)
 * 支配定义：
 * 1. A 包含 B 的所有技能 Key。
 * 2. 对于 B 拥有的每个技能，A 的等级 >= B 的等级。
 * 3. (隐含) 如果 A 等级全等于 B 且 A 技能数也等于 B，为了去重，我们也视为 A 支配 B (保留前者)。
 */
function checkDominance(sup: ProcessedAmulet, sub: ProcessedAmulet): boolean {
  // 遍历弱者(sub)的所有技能，检查强者(sup)是否满足条件
  for (const [skillId, subLevel] of sub.skillMap) {
    const supLevel = sup.skillMap.get(skillId);

    // 如果 sup 没有这个技能，无法支配
    if (supLevel === undefined) return false;

    // 如果 sup 等级低于 sub，无法支配
    if (supLevel < subLevel) return false;
  }

  return true;
}

/**
 * 跨类型支配检查
 * 判断 sub (子集) 是否被 sup (超集) 支配
 * 前提：sup.skillCount > sub.skillCount
 */
function isSubsetAndDominated(sub: ProcessedAmulet, sup: ProcessedAmulet): boolean {
  // 逻辑与 checkDominance 一致，只是调用场景不同
  return checkDominance(sup, sub);
}
