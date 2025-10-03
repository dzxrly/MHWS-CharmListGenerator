import { type ItemI18n } from 'src/interface/item-i18n';
import { type SkillItem } from 'src/interface/skill';

export interface AmuletRare {
  id: string | number;
  name: ItemI18n[];
  rare: string;
}

export interface AmuletSlot {
  slotPt: string | number;
  weaponSlot: number[];
  equipmentSlot: number[];
}

export interface Amulet {
  id: string | number;
  rare: AmuletRare;
  slot: AmuletSlot;
  skillPt1: string | number;
  skillPt2: string | number;
  skillPt3: string | number;
}

export interface AmuletWithSkillPool extends Amulet {
  skillPool1: SkillItem[] | undefined;
  skillPool2: SkillItem[] | undefined;
  skillPool3: SkillItem[] | undefined;
}

export interface AmuletItem {
  rare: AmuletRare;
  slot: AmuletSlot;
  skills: Array<SkillItem | undefined>;
}
