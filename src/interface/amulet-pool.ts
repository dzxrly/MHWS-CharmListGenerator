import { type ItemI18n } from 'src/interface/item-i18n';

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

export interface AmuletPool {
  id: string | number;
  rare: AmuletRare;
  slot: AmuletSlot;
  skillPt1: string | number;
  skillPt2: string | number;
  skillPt3: string | number;
}
