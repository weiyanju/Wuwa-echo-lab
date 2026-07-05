import assert from "node:assert/strict";
import test from "node:test";

import {
  assetPathToRawUrl,
  assetPathToWuwaCdnUrl,
  buildSonataRecords,
  indexTextRows,
  rarityToCostMap,
  sanitizeFilePart,
} from "./wuwa-sonata-assets.mjs";

test("maps phantom rarity values to costs", () => {
  const map = rarityToCostMap({
    value: [
      { Rare: 0, Cost: 1 },
      { Rare: 1, Cost: 3 },
      { Rare: 2, Cost: 4 },
    ],
  });

  assert.equal(map.get(0), 1);
  assert.equal(map.get(1), 3);
  assert.equal(map.get(2), 4);
});

test("converts game asset paths to WW_Asset raw PNG URLs", () => {
  assert.equal(
    assetPathToRawUrl("/Game/Aki/UI/UIResources/Common/Image/IconMonsterHead/T_IconMonsterHead_34026_UI.T_IconMonsterHead_34026_UI"),
    "https://raw.githubusercontent.com/alt3ri/WW_Asset/Global/UIResources/Common/Image/IconMonsterHead/T_IconMonsterHead_34026_UI.png",
  );
});

test("converts game asset paths to wuwa CDN AVIF URLs", () => {
  assert.equal(
    assetPathToWuwaCdnUrl("/Game/Aki/UI/UIResources/Common/Image/IconMonsterHead/T_IconMonsterHead_32066_UI.T_IconMonsterHead_32066_UI"),
    "https://static-cloudflare-f8p1t7z8.wutheringwaves.wiki/transform/kuro/gameclient/Content/Aki/UI/UIResources/Common/Image/IconMonsterHead/T_IconMonsterHead_32066_UI.avif",
  );
});

test("indexes text rows by id", () => {
  const text = indexTextRows([
    { Id: "MonsterInfo_340000260_Name", Content: "无铭探索者" },
    { Id: "ItemInfo_50020032_Name", Content: "剪心辑梦之影" },
  ]);

  assert.equal(text.get("MonsterInfo_340000260_Name"), "无铭探索者");
  assert.equal(text.get("ItemInfo_50020032_Name"), "剪心辑梦之影");
});

test("builds set records from fetter groups and phantom items", () => {
  const records = buildSonataRecords({
    fetterGroups: [
      {
        Id: 31,
        FetterGroupName: "PhantomFetter_31_Name",
        FetterMap: [
          { Key: 2, Value: 61 },
          { Key: 5, Value: 62 },
        ],
      },
    ],
    phantomItems: [
      {
        ItemId: 60001925,
        MonsterName: "MonsterInfo_340000260_Name",
        Rarity: 2,
        QualityId: 5,
        PhantomType: 1,
        FetterGroup: [29, 31],
        Icon: "/Game/Aki/UI/UIResources/Common/Image/IconMonsterHead/T_IconMonsterHead_34026_UI.T_IconMonsterHead_34026_UI",
        IconBig: "/Game/Aki/UI/UIResources/Common/Image/IconMonsterHead732/T_IconMonsterHead732_34026_UI.T_IconMonsterHead732_34026_UI",
      },
      {
        ItemId: 60001815,
        MonsterName: "MonsterInfo_320000510_Name",
        Rarity: 1,
        QualityId: 5,
        PhantomType: 1,
        FetterGroup: [31],
        Icon: "/Game/Aki/UI/UIResources/Common/Image/IconMonsterHead/T_IconMonsterHead_32051_UI.T_IconMonsterHead_32051_UI",
        IconBig: "/Game/Aki/UI/UIResources/Common/Image/IconMonsterHead732/T_IconMonsterHead732_32051_UI.T_IconMonsterHead732_32051_UI",
      },
      {
        ItemId: 60001755,
        MonsterName: "MonsterInfo_310000770_Name",
        Rarity: 0,
        QualityId: 5,
        PhantomType: 1,
        FetterGroup: [24, 31],
        Icon: "/Game/Aki/UI/UIResources/Common/Image/IconMonsterHead/T_IconMonsterHead_31077_UI.T_IconMonsterHead_31077_UI",
        IconBig: "/Game/Aki/UI/UIResources/Common/Image/IconMonsterHead732/T_IconMonsterHead732_31077_UI.T_IconMonsterHead732_31077_UI",
      },
      {
        ItemId: 60101945,
        MonsterName: "MonsterInfo_Special_Name",
        Rarity: 0,
        QualityId: 5,
        PhantomType: 1,
        FetterGroup: [31],
        Icon: "/Game/Aki/UI/UIResources/Common/Image/IconMonsterGoods/T_IconMonsterGoods_SG_32060_UI.T_IconMonsterGoods_SG_32060_UI",
      },
    ],
    rarityCost: new Map([
      [0, 1],
      [1, 3],
      [2, 4],
    ]),
    text: new Map([
      ["ItemInfo_50020032_Name", "剪心辑梦之影"],
      ["MonsterInfo_340000260_Name", "无铭探索者"],
      ["MonsterInfo_320000510_Name", "莳植机麋"],
      ["MonsterInfo_310000770_Name", "莳植熊蜂"],
    ]),
    setNameOverrides: new Map([[31, "ItemInfo_50020032_Name"]]),
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].name, "剪心辑梦之影");
  assert.deepEqual(records[0].echoesByCost.cost4.map((echo) => echo.name), ["无铭探索者"]);
  assert.deepEqual(records[0].echoesByCost.cost3.map((echo) => echo.name), ["莳植机麋"]);
  assert.deepEqual(records[0].echoesByCost.cost1.map((echo) => echo.name), ["莳植熊蜂"]);
  assert.equal(records[0].echoesByCost.cost1.some((echo) => echo.id === 60101945), false);
  assert.match(records[0].echoesByCost.cost4[0].imageUrl, /T_IconMonsterHead_34026_UI\.png$/);
  assert.deepEqual(records[0].echoesByCost.cost4[0].imageCandidates, [
    "https://raw.githubusercontent.com/alt3ri/WW_Asset/Global/UIResources/Common/Image/IconMonsterHead/T_IconMonsterHead_34026_UI.png",
    "https://raw.githubusercontent.com/alt3ri/WW_Asset/Global/UIResources/Common/Image/IconMonsterHead732/T_IconMonsterHead732_34026_UI.png",
    "https://static-cloudflare-f8p1t7z8.wutheringwaves.wiki/transform/kuro/gameclient/Content/Aki/UI/UIResources/Common/Image/IconMonsterHead/T_IconMonsterHead_34026_UI.avif",
    "https://static-cloudflare-f8p1t7z8.wutheringwaves.wiki/transform/kuro/gameclient/Content/Aki/UI/UIResources/Common/Image/IconMonsterHead732/T_IconMonsterHead732_34026_UI.avif",
  ]);
});

test("sanitizes names for Windows filenames", () => {
  assert.equal(sanitizeFilePart("剪心:辑梦/之影?"), "剪心_辑梦_之影_");
});
