export interface AmuletPool {
  id: string | number;
  rare: {
    id: string | number;
    name: {
      languageCode: string;
      languageIndexInGame: string | number;
      name: string;
    }[];
    rare: string;
  };
  slot: {
    slotPt: string | number;
    weaponSlot: number[];
    equipmentSlot: number[];
  };
  skillPt1: string | number;
  skillPt2: string | number;
  skillPt3: string | number;
}
