import { type ItemI18n } from 'src/interface/item-i18n';

export interface SelectedSkill {
  skillId: string | number;
  skillName: string;
  selected: boolean;
}

export interface SkillItem {
  id: string | number;
  name: ItemI18n[];
  level: number | string;
}

export interface Skill {
  skillPt: string;
  skillList: SkillItem[];
}
