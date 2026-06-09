#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const seedPath = path.join(rootDir, "supabase", "seed.sql");

const tableConfigs = {
  cat: {
    label: "cats",
    prefix: "10000000",
    row: ({ uuid }) =>
      `('${uuid}', '', '', '', '', 'avatars/', '', '', array['']),`,
  },
  quest: {
    label: "quests",
    prefix: "20000000",
    row: ({ uuid }) =>
      `('${uuid}', '', id('cats', ''), '', '', 'dialogue', 'C', 0, 10, '', '', 'cards/'),`,
  },
  post: {
    label: "posts",
    prefix: "30000000",
    withSort: true,
    sortPattern:
      "'{uuid}'[^\\n]*,\\s*(\\d+)\\s*,\\s*(?:default|null|'[^']*')\\s*\\),?",
    row: ({ uuid, sortOrder }) =>
      `('${uuid}', '', id('cats', ''), id('quests', ''), '', '', 'posts/', 'quest_completed:', 'free', null, ${sortOrder}, default),`,
  },
  dialogue: {
    label: "dialogue_nodes",
    prefix: "60000000",
    withSort: true,
    row: ({ uuid, sortOrder }) =>
      `('${uuid}', id('cats', ''), '', '', '', 0, ${sortOrder}),`,
  },
  "reply-rule": {
    label: "comment_reply_rules",
    prefix: "40000000",
    withSort: true,
    sortPattern:
      "'{uuid}'[^\\n]*,\\s*(\\d+)\\s*,\\s*(?:true|false)\\s*\\),?",
    row: ({ uuid, sortOrder }) =>
      `('${uuid}', '', id('cats', ''), null, 'contains', '', '', false, ${sortOrder}, true),`,
  },
  "preset-comment": {
    label: "comments",
    prefix: "50000000",
    withSort: true,
    scanAllForSort: true,
    row: ({ uuid, sortOrder }) =>
      `('${uuid}', '', id('posts', ''), null, id('cats', ''), '', ${sortOrder}),`,
  },
};

const aliases = {
  cats: "cat",
  q: "quest",
  quests: "quest",
  p: "post",
  posts: "post",
  d: "dialogue",
  dialogue_node: "dialogue",
  dialogue_nodes: "dialogue",
  rule: "reply-rule",
  reply: "reply-rule",
  preset: "preset-comment",
  preset_comment: "preset-comment",
  "preset-comment": "preset-comment",
  comment: "preset-comment",
  comments: "preset-comment",
};

if (isCliEntry()) {
  const requested = process.argv[2];
  try {
    console.log(await generateSeedRow(requested));
  } catch (error) {
    console.log(error.message);
    process.exit(requested ? 1 : 0);
  }
}

export async function generateSeedRow(requested) {
  const tableKey = aliases[requested] || requested;
  if (!tableKey || !tableConfigs[tableKey]) {
    throw new Error(`用法: node tools/seed-row.mjs <类型>

可用类型:
  cat         生成 cats 行
  quest       生成 quests 行
  post        生成 posts 行
  dialogue    生成 dialogue_nodes 行
  reply-rule  生成 comment_reply_rules 行
  comment     生成预设 comments 行

示例:
  node tools/seed-row.mjs post`);
  }

  const seed = await readFile(seedPath, "utf8");
  const config = tableConfigs[tableKey];
  const nextNumber = getNextUuidNumber(seed, config.prefix);
  const uuid = `${config.prefix}-0000-0000-0000-${String(nextNumber).padStart(12, "0")}`;
  const sortOrder = config.withSort ? getNextSortOrder(seed, config) : null;

  return config.row({ uuid, sortOrder });
}

function isCliEntry() {
  if (typeof process === "undefined") return false;
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

function getNextUuidNumber(seedText, prefix) {
  const pattern = new RegExp(`${escapeRegExp(prefix)}-0000-0000-0000-(\\d{12})`, "g");
  let max = 0;
  for (const match of seedText.matchAll(pattern)) {
    max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function getNextSortOrder(seedText, config) {
  const block = config.scanAllForSort ? seedText : getInsertBlock(seedText, config.label);
  if (!block) return 1;

  const pattern = config.sortPattern || "'{uuid}'[^\\n]*,\\s*(\\d+)\\s*\\),?";
  const rowPattern = new RegExp(
    pattern.replace("{uuid}", `${escapeRegExp(config.prefix)}-0000-0000-0000-\\d{12}`),
    "g",
  );
  let max = 0;
  for (const match of block.matchAll(rowPattern)) {
    max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function getInsertBlock(seedText, tableName) {
  const start = seedText.indexOf(`insert into public.${tableName}`);
  if (start < 0) return "";
  const end = seedText.indexOf("on conflict", start);
  return end < 0 ? seedText.slice(start) : seedText.slice(start, end);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
