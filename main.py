import json
import os

LANGUAGE_INDEX = {
    "ja-JP": 0,
    "eu-US": 1,
    "ko-KR": 11,
    "zh-Hant": 12,
    "zh-Hans": 13,
}

OUTPUT_DIR = "output"


def read_skill_json(
    amulet_skill_table_path: str, skill_common_data_path: str, i18n_msg_path: str
) -> list[dict]:
    _loaded_amulet_skill_table = None
    with open(os.path.join(amulet_skill_table_path), "r", encoding="utf-8") as f:
        _loaded_amulet_skill_table = json.load(f)[0]["fields"]["_Values"]

    _loaded_skill_common_data = None
    with open(os.path.join(skill_common_data_path), "r", encoding="utf-8") as f:
        _loaded_skill_common_data = json.load(f)[0]["fields"]["_Values"]

    _loaded_i18n_msg = None
    with open(os.path.join(i18n_msg_path), "r", encoding="utf-8") as f:
        _loaded_i18n_msg = json.load(f)["entries"]

    def get_skill_i18n_name(skill_id: str | int) -> list[dict]:
        for _skill in _loaded_skill_common_data:
            if str(_skill["fields"]["_skillId"]) == str(skill_id):
                for _msg in _loaded_i18n_msg:
                    if _msg["guid"] == _skill["fields"]["_skillName"]:
                        return [
                            {
                                "lang": LANGUAGE_INDEX[i],
                                "name": _msg["content"][LANGUAGE_INDEX[i]],
                            }
                            for i in LANGUAGE_INDEX.keys()
                        ]
        raise ValueError(f"Skill id {skill_id} not found")

    _json_data = {}
    for _amulet_skill in _loaded_amulet_skill_table:
        _pt = _amulet_skill["fields"]["_SkillPt"]
        if _pt in _json_data.keys():
            _json_data[_pt].append(
                {
                    "id": _amulet_skill["fields"]["_SkillType"],
                    "name": get_skill_i18n_name(_amulet_skill["fields"]["_SkillType"]),
                    "level": _amulet_skill["fields"]["_SkillLv"],
                }
            )
        else:
            _json_data[_pt] = [
                {
                    "id": _amulet_skill["fields"]["_SkillType"],
                    "name": get_skill_i18n_name(_amulet_skill["fields"]["_SkillType"]),
                    "level": _amulet_skill["fields"]["_SkillLv"],
                }
            ]
    return [
        {
            "skill_pt": _pt,
            "skill_list": _json_data[_pt],
        }
        for _pt in _json_data.keys()
    ]


if __name__ == "__main__":
    # load skill json
    skill_json = read_skill_json(
        "./data/RandomAmuletLotSkillTable.json",
        "./data/SkillCommonData.json",
        "./data/SkillCommon.msg.23.json",
    )
    print(skill_json[0])
