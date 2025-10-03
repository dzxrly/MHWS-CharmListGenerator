import json
import os
import shutil

LANGUAGE_INDEX = {
    "ja-JP": 0,
    "en-US": 1,
    "ko-KR": 11,
    "zh-Hant": 12,
    "zh-Hans": 13,
}

APP_ITEM_RARE_FIXED = {
    "18": "Rare 0",
    "17": "Rare 1",
    "16": "Rare 2",
    "15": "Rare 3",
    "14": "Rare 4",
    "13": "Rare 5",
    "12": "Rare 6",
    "11": "Rare 7",
    "10": "Rare 8",
    "9": "Rare 9",
    "8": "Rare 10",
    "7": "Rare 11",
    "2081494400": "MAX",
}

APP_EQUIP_DEF_ACCESSORY_TYPE_FIXED = {
    "Weapon": "-1638455296",
    "Equipment": "1842954880",
    "MAX": "-1621790336",
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
                                "language_code": lang_code,
                                "language_index_in_game": str(lang_index),
                                "name": _msg["content"][lang_index],
                            }
                            for lang_code, lang_index in LANGUAGE_INDEX.items()
                        ]
        raise ValueError(f"Skill id {skill_id} not found")

    _json_data = {}
    for _amulet_skill in _loaded_amulet_skill_table:
        _pt = _amulet_skill["fields"]["_SkillPt"]
        if _pt in _json_data.keys():
            _json_data[_pt].append(
                {
                    "id": str(_amulet_skill["fields"]["_SkillType"]),
                    "name": get_skill_i18n_name(_amulet_skill["fields"]["_SkillType"]),
                    "level": _amulet_skill["fields"]["_SkillLv"],
                }
            )
        else:
            _json_data[_pt] = [
                {
                    "id": str(_amulet_skill["fields"]["_SkillType"]),
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


def read_amulet_rare_json(amulet_data_path: str, i18n_msg_path: str) -> list[dict]:
    _loaded_amulet_data = None
    with open(os.path.join(amulet_data_path), "r", encoding="utf-8") as f:
        _loaded_amulet_data = json.load(f)[0]["fields"]["_Values"]

    _loaded_i18n_msg = None
    with open(os.path.join(i18n_msg_path), "r", encoding="utf-8") as f:
        _loaded_i18n_msg = json.load(f)["entries"]

    _json_data = []
    for _amulet in _loaded_amulet_data:
        _name = None
        for _msg in _loaded_i18n_msg:
            if _msg["guid"] == _amulet["fields"]["_Name"]:
                _name = [
                    {
                        "language_code": lang_code,
                        "language_index_in_game": str(lang_index),
                        "name": _msg["content"][lang_index],
                    }
                    for lang_code, lang_index in LANGUAGE_INDEX.items()
                ]
                break
        _json_data.append(
            {
                "id": str(
                    _amulet["fields"]["_AmuletType"]["value"]["fields"]["_Value"]
                ),
                "name": _name,
                "rare": APP_ITEM_RARE_FIXED[
                    str(_amulet["fields"]["_Rare"]["value"]["fields"]["_Value"])
                ],
            }
        )

    return _json_data


def read_amulet_pool_json(
    amulet_pool_path: str,
    amulet_slot_path: str,
    amulet_rare: list[dict],
) -> list[dict]:
    _loaded_amulet_pool = None
    with open(os.path.join(amulet_pool_path), "r", encoding="utf-8") as f:
        _loaded_amulet_pool = json.load(f)[0]["fields"]["_Values"]

    _loaded_amulet_slot = None
    with open(os.path.join(amulet_slot_path), "r", encoding="utf-8") as f:
        _loaded_amulet_slot = json.load(f)[0]["fields"]["_Values"]

    def get_amulet_rare_by_id(amulet_id: str | int) -> dict:
        for _amulet in amulet_rare:
            if str(_amulet["id"]) == str(amulet_id):
                return _amulet
        raise ValueError(f"Amulet id {amulet_id} not found")

    def get_slot_config_by_pt(pt: str | int) -> dict:
        for _slot in _loaded_amulet_slot:
            if str(_slot["fields"]["_SlotPt"]) == str(pt):
                _weapon_slot = []
                _equipment_slot = []
                for _key in _slot["fields"].keys():
                    if _key.startswith("_SlotType"):
                        if (
                            str(_slot["fields"][_key])
                            == APP_EQUIP_DEF_ACCESSORY_TYPE_FIXED["Weapon"]
                        ):
                            _weapon_slot.append(
                                _slot["fields"][f"_SlotLevel{_key[-2:]}"]
                            )
                        else:
                            _weapon_slot.append(0)

                        if (
                            str(_slot["fields"][_key])
                            == APP_EQUIP_DEF_ACCESSORY_TYPE_FIXED["Equipment"]
                        ):
                            _equipment_slot.append(
                                _slot["fields"][f"_SlotLevel{_key[-2:]}"]
                            )
                        else:
                            _equipment_slot.append(0)
                return {
                    "slot_pt": str(_slot["fields"]["_SlotPt"]),
                    "weapon_slot": sorted(_weapon_slot, reverse=True),
                    "equipment_slot": sorted(_equipment_slot, reverse=True),
                }
        raise ValueError(f"Amulet slot pt {pt} not found")

    _json_data = []
    for _amulet_pool in _loaded_amulet_pool:
        _info = {
            "id": str(_amulet_pool["fields"]["_Index"]),
            "rare": get_amulet_rare_by_id(
                _amulet_pool["fields"]["_AmuletType"]["value"]["fields"]["_Value"]
            ),
            "slot": get_slot_config_by_pt(_amulet_pool["fields"]["_SlotPt"]),
        }
        _pt_idx = 1
        for _key in _amulet_pool["fields"].keys():
            if _key.startswith("_SkillPt_"):
                _info[f"skill_pt_{_pt_idx}"] = str(_amulet_pool["fields"][_key])
                _pt_idx += 1
        _json_data.append(_info)

    return _json_data


if __name__ == "__main__":
    # load skill json
    skill_json = read_skill_json(
        "./data/RandomAmuletLotSkillTable.json",
        "./data/SkillCommonData.json",
        "./data/SkillCommon.msg.23.json",
    )
    print("[INFO] 加载了 %d 个技能池配置" % len(skill_json))
    # load amulet rare json
    amulet_rare_json = read_amulet_rare_json(
        "./data/AmuletData.json",
        "./data/Amulet.msg.23.json",
    )
    print("[INFO] 加载了 %d 个护石配置" % len(amulet_rare_json))
    # load amulet pool json
    amulet_pool_json = read_amulet_pool_json(
        "./data/RandomAmuletPtTable.json",
        "./data/RandomAmuletAccSlot.json",
        amulet_rare_json,
    )
    print("[INFO] 加载了 %d 个护石池配置" % len(amulet_pool_json))
    # save to output dir
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR)
    with open(os.path.join(OUTPUT_DIR, "skill_pool.json"), "w", encoding="utf-8") as f:
        json.dump(skill_json, f, ensure_ascii=False, indent=4)
    with open(os.path.join(OUTPUT_DIR, "amulet_pool.json"), "w", encoding="utf-8") as f:
        json.dump(amulet_pool_json, f, ensure_ascii=False, indent=4)
    print("[INFO] 已保存到 %s 目录下" % OUTPUT_DIR)
