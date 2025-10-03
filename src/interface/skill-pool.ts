import { type ItemI18n } from 'src/interface/item-i18n';

export interface SkillItem {
  id: string | number;
  name: ItemI18n[];
  level: number | string;
}

export interface SkillPool {
  skillPt: string;
  skillList: SkillItem[];
}
