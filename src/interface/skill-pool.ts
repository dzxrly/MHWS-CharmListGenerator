export interface SkillName {
  languageCode: string;
  languageIndexInGame: string | number;
  name: string;
}

export interface SkillItem {
  id: string | number;
  name: SkillName[];
  level: number | string;
}

export interface SkillPool {
  skillPt: string;
  skillList: SkillItem[];
}
