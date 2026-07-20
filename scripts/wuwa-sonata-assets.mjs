import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA_REPO_RAW = "https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/3.5";
const ASSET_REPO_RAW = "https://raw.githubusercontent.com/alt3ri/WW_Asset/Global";
const WUWA_CDN_BASE = "https://static-cloudflare-f8p1t7z8.wutheringwaves.wiki/transform/kuro/gameclient/Content/Aki/UI";
const DEFAULT_OUT_DIR = path.resolve("tmp/wuwa-sonata-assets-github");

const DATA_URLS = {
  fetterGroups: `${DATA_REPO_RAW}/BinData/phantom/phantomfettergroup.json`,
  fetters: `${DATA_REPO_RAW}/BinData/phantom/phantomfetter.json`,
  phantomItems: `${DATA_REPO_RAW}/BinData/phantom/phantomitem.json`,
  phantomRarity: `${DATA_REPO_RAW}/BinData/phantom/phantomrarity.json`,
  multiText: `${DATA_REPO_RAW}/Textmaps/zh-Hans/multi_text/MultiText.json`,
  multiTextFirstHalf: `${DATA_REPO_RAW}/Textmaps/zh-Hans/multi_text_1sthalf/MultiText.json`,
  multiTextSecondHalf: `${DATA_REPO_RAW}/Textmaps/zh-Hans/multi_text_2ndhalf/MultiText.json`,
};

export function sanitizeFilePart(value) {
  return String(value)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

export function normalizeTable(table) {
  if (Array.isArray(table)) return table;
  if (Array.isArray(table?.value)) return table.value;
  return [];
}

export function indexTextRows(...tables) {
  const text = new Map();
  for (const table of tables) {
    for (const row of normalizeTable(table)) {
      if (row?.Id != null && row?.Content != null) {
        text.set(String(row.Id), row.Content);
      }
    }
  }
  return text;
}

export function rarityToCostMap(phantomRarity) {
  return new Map(normalizeTable(phantomRarity).map((row) => [row.Rare, row.Cost]));
}

export function assetPathToRawUrl(assetPath) {
  if (!assetPath) return "";
  const normalized = String(assetPath).replaceAll("\\", "/");
  const uiResourcesIndex = normalized.indexOf("UIResources/");
  if (uiResourcesIndex === -1) return "";

  const relativeWithObjectName = normalized.slice(uiResourcesIndex);
  const objectPath = relativeWithObjectName.split(".")[0];
  return `${ASSET_REPO_RAW}/${objectPath}.png`;
}

export function assetPathToWuwaCdnUrl(assetPath) {
  if (!assetPath) return "";
  const normalized = String(assetPath).replaceAll("\\", "/");
  const uiResourcesIndex = normalized.indexOf("UIResources/");
  if (uiResourcesIndex === -1) return "";

  const relativeWithObjectName = normalized.slice(uiResourcesIndex);
  const objectPath = relativeWithObjectName.split(".")[0];
  return `${WUWA_CDN_BASE}/${objectPath}.avif`;
}

function imageCandidatesForItem(item) {
  const assetPaths = [item.Icon, item.IconBig, item.IconMiddle, item.IconSmall];
  return [
    ...assetPaths.map((assetPath) => assetPathToRawUrl(assetPath)),
    ...assetPaths.map((assetPath) => assetPathToWuwaCdnUrl(assetPath)),
  ]
    .filter(Boolean)
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function resolveText(text, key, fallback = "") {
  return text.get(String(key)) ?? fallback;
}

function formatEffectDescription(template, params = []) {
  if (!template) return "";
  return template.replace(/\{(\d+)\}/g, (_, index) => params[Number(index)] ?? `{${index}}`);
}

function buildEffectRows(fetterGroup, fetterById, text) {
  return (fetterGroup.FetterMap ?? []).map((entry) => {
    const effect = fetterById.get(entry.Value);
    const template = resolveText(text, effect?.EffectDescription, effect?.EffectDescription ?? "");
    return {
      requiredPieces: entry.Key,
      effectId: entry.Value,
      description: formatEffectDescription(template, effect?.EffectDescriptionParam),
      simpleDescription: resolveText(text, effect?.SimplyEffectDesc, effect?.SimplyEffectDesc ?? ""),
    };
  });
}

export function buildSonataRecords({
  fetterGroups,
  fetters = [],
  phantomItems,
  rarityCost,
  text,
  setNameOverrides = new Map(),
}) {
  const fetterById = new Map(normalizeTable(fetters).map((row) => [row.Id, row]));
  const qualityFiveItems = normalizeTable(phantomItems).filter((item) => (
    item?.QualityId === 5
    && item?.PhantomType === 1
    && String(item?.ItemId ?? "").startsWith("600")
  ));

  return normalizeTable(fetterGroups)
    .map((group) => {
      const groupNameKey = setNameOverrides.get(group.Id) ?? group.FetterGroupName;
      const echoesByCost = {};

      for (const item of qualityFiveItems) {
        if (!Array.isArray(item.FetterGroup) || !item.FetterGroup.includes(group.Id)) continue;

        const cost = rarityCost.get(item.Rarity);
        if (!cost) continue;

        const costKey = `cost${cost}`;
        echoesByCost[costKey] ??= [];
        const imageCandidates = imageCandidatesForItem(item);
        echoesByCost[costKey].push({
          id: item.ItemId,
          name: resolveText(text, item.MonsterName, item.MonsterName),
          rarity: item.Rarity,
          cost,
          imageUrl: imageCandidates[0] ?? "",
          imageCandidates,
          sourceAssetPath: item.Icon,
          localImage: "",
        });
      }

      for (const echoes of Object.values(echoesByCost)) {
        echoes.sort((a, b) => a.id - b.id);
      }

      return {
        id: group.Id,
        name: resolveText(text, groupNameKey, groupNameKey),
        nameKey: groupNameKey,
        effects: buildEffectRows(group, fetterById, text),
        echoesByCost: Object.fromEntries(
          Object.entries(echoesByCost).sort(([a], [b]) => Number(b.replace("cost", "")) - Number(a.replace("cost", ""))),
        ),
      };
    })
    .filter((record) => Object.keys(record.echoesByCost).length > 0)
    .sort((a, b) => b.id - a.id);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Codex data export script",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

async function download(url, filePath) {
  const response = await fetch(url, {
    headers: {
      accept: "image/png,image/*;q=0.8,*/*;q=0.5",
      "user-agent": "Codex data export script",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, bytes);
  return bytes.length;
}

function parseArgs(argv) {
  const outIndex = argv.indexOf("--out");
  return {
    outDir: outIndex >= 0 && argv[outIndex + 1] ? path.resolve(argv[outIndex + 1]) : DEFAULT_OUT_DIR,
  };
}

function addLocalImagePaths(records) {
  for (const record of records) {
    const setSlug = `${String(record.id).padStart(2, "0")}_${sanitizeFilePart(record.name)}`;
    for (const [costKey, echoes] of Object.entries(record.echoesByCost)) {
      for (const echo of echoes) {
        echo.localImageBase = path.posix.join(
          "images",
          setSlug,
          `${costKey}_${echo.id}_${sanitizeFilePart(echo.name)}`,
        );
        echo.localImage = `${echo.localImageBase}.png`;
      }
    }
  }
}

async function writeOutputs(summary, outDir) {
  await mkdir(path.join(outDir, "images"), { recursive: true });

  const failures = [];
  for (const record of summary.sets) {
    for (const echoes of Object.values(record.echoesByCost)) {
      for (const echo of echoes) {
        const errors = [];
        for (const candidate of echo.imageCandidates?.length ? echo.imageCandidates : [echo.imageUrl]) {
          try {
            const extension = path.extname(new URL(candidate).pathname) || ".png";
            echo.localImage = `${echo.localImageBase ?? echo.localImage.replace(/\.[^.]+$/, "")}${extension}`;
            const filePath = path.join(outDir, echo.localImage);
            await mkdir(path.dirname(filePath), { recursive: true });
            echo.imageBytes = await download(candidate, filePath);
            echo.imageUrl = candidate;
            break;
          } catch (error) {
            errors.push(`${candidate}: ${error.message}`);
          }
        }
        if (!echo.imageBytes) {
          echo.imageBytes = 0;
          failures.push({ setId: record.id, echoId: echo.id, urls: echo.imageCandidates, error: errors.join("; ") });
        }
      }
    }
  }
  summary.failures = failures;

  await writeFile(path.join(outDir, "sonata-effects.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  const csvRows = ["set_id,set_name,cost,echo_id,echo_name,local_image,image_url"];
  for (const record of summary.sets) {
    for (const [costKey, echoes] of Object.entries(record.echoesByCost)) {
      for (const echo of echoes) {
        csvRows.push(
          [record.id, record.name, costKey.replace("cost", ""), echo.id, echo.name, echo.localImage, echo.imageUrl]
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(","),
        );
      }
    }
  }
  await writeFile(path.join(outDir, "sonata-effects.csv"), `${csvRows.join("\n")}\n`, "utf8");

  const markdown = [
    "# Wuwa Sonata Effects Echoes",
    "",
    `Data source: Arikatsu/WutheringWaves_Data 3.5`,
    `Asset source: alt3ri/WW_Asset Global`,
    `Generated at: ${summary.generatedAt}`,
    `Sets: ${summary.setCount}`,
    `Echo images: ${summary.echoImageCount}`,
    "",
    ...summary.sets.flatMap((record) => [
      `## ${record.name}`,
      "",
      ...Object.entries(record.echoesByCost).flatMap(([costKey, echoes]) => [
        `### COST ${costKey.replace("cost", "")}`,
        "",
        ...echoes.map((echo) => `- ${echo.name} (${echo.id}) - ${echo.localImage}`),
        "",
      ]),
    ]),
  ].join("\n");
  await writeFile(path.join(outDir, "README.md"), markdown, "utf8");
}

export async function generateSonataAssetExport({ outDir = DEFAULT_OUT_DIR } = {}) {
  await mkdir(outDir, { recursive: true });

  const [
    fetterGroups,
    fetters,
    phantomItems,
    phantomRarity,
    multiText,
    multiTextFirstHalf,
    multiTextSecondHalf,
  ] = await Promise.all([
    fetchJson(DATA_URLS.fetterGroups),
    fetchJson(DATA_URLS.fetters),
    fetchJson(DATA_URLS.phantomItems),
    fetchJson(DATA_URLS.phantomRarity),
    fetchJson(DATA_URLS.multiText),
    fetchJson(DATA_URLS.multiTextFirstHalf),
    fetchJson(DATA_URLS.multiTextSecondHalf),
  ]);

  const text = indexTextRows(multiText, multiTextFirstHalf, multiTextSecondHalf);
  const records = buildSonataRecords({
    fetterGroups,
    fetters,
    phantomItems,
    rarityCost: rarityToCostMap(phantomRarity),
    text,
  });
  addLocalImagePaths(records);

  const summary = {
    generatedAt: new Date().toISOString(),
    dataSource: DATA_REPO_RAW,
    assetSource: ASSET_REPO_RAW,
    outDir,
    setCount: records.length,
    echoImageCount: records.reduce(
      (sum, record) => sum + Object.values(record.echoesByCost).reduce((costSum, echoes) => costSum + echoes.length, 0),
      0,
    ),
    sets: records,
    failures: [],
  };

  await writeOutputs(summary, outDir);
  return summary;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  const { outDir } = parseArgs(process.argv.slice(2));
  generateSonataAssetExport({ outDir })
    .then((summary) => {
      console.log(JSON.stringify({
        outDir: summary.outDir,
        setCount: summary.setCount,
        echoImageCount: summary.echoImageCount,
        failures: summary.failures.length,
      }, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
