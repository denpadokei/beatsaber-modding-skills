#!/usr/bin/env node
// Dependency-free structural validator for the skill repository.
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function parseFrontmatter(rawText, file) {
  const text = rawText.replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) {
    fail(`${file}: missing YAML frontmatter`);
    return null;
  }
  const end = text.indexOf("\n---", 4);
  if (end === -1) {
    fail(`${file}: unterminated YAML frontmatter`);
    return null;
  }
  const block = text.slice(4, end);
  const data = {};
  for (const rawLine of block.split("\n")) {
    if (!rawLine.trim() || rawLine.startsWith(" ") || rawLine.startsWith("#")) continue;
    const match = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      warn(`${file}: unparsed frontmatter line: ${rawLine}`);
      continue;
    }
    const [, key, rawValue] = match;
    if (key in data) fail(`${file}: duplicate frontmatter key "${key}"`);
    if (!/^["']/.test(rawValue) && rawValue.includes('"')) {
      fail(`${file}: unquoted frontmatter value contains a double quote -> ${key}`);
    }
    data[key] = rawValue.replace(/^["']|["']$/g, "");
  }
  return data;
}

function stripCodeFences(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/~~~[\s\S]*?~~~/g, "");
}

function slugify(heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function headingsOf(text) {
  const slugs = new Set();
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const match = line.match(/^#{1,6}\s+(.*)$/);
    if (match) slugs.add(slugify(match[1]));
  }
  return slugs;
}

async function checkLinks(file, text) {
  const dir = path.dirname(file);
  const rel = path.relative(ROOT, file);
  const body = stripCodeFences(text);
  const links = [...body.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);

  for (const link of links) {
    if (/^(https?:|mailto:|#)/.test(link)) continue;
    const [targetPath, anchor] = link.split("#");
    if (!targetPath) continue;
    const resolved = path.resolve(dir, targetPath);
    if (!(await exists(resolved))) {
      fail(`${rel}: broken link -> ${link}`);
      continue;
    }
    if (anchor && resolved.endsWith(".md")) {
      const targetText = await readFile(resolved, "utf8");
      if (!headingsOf(targetText).has(anchor.toLowerCase())) {
        warn(`${rel}: anchor not found -> ${link}`);
      }
    }
  }
}

function checkDescription(name, description) {
  if (!description) {
    fail(`${name}: missing description`);
    return;
  }
  if (description.length < 20) fail(`${name}: description is too short (${description.length})`);
  if (description.length > 1024) fail(`${name}: description exceeds 1024 chars (${description.length})`);
}

// Agent Skills / skills.sh require lowercase hyphenated names so the CLI can
// map `--skill <name>` onto the directory it discovers.
function checkName(file, name, dirName) {
  if (!name) {
    fail(`${file}: missing name`);
    return;
  }
  if (name !== dirName) {
    fail(`${file}: frontmatter name "${name}" does not match directory "${dirName}"`);
  }
  if (name.length > 64) fail(`${file}: name exceeds 64 chars (${name.length})`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    fail(`${file}: name must be lowercase words separated by single hyphens -> ${name}`);
  }
}

async function validateSkill(skillDir) {
  const name = path.basename(skillDir);
  const skillFile = path.join(skillDir, "SKILL.md");
  const rel = path.relative(ROOT, skillFile);

  if (!(await exists(skillFile))) {
    fail(`${name}: missing SKILL.md`);
    return;
  }

  const text = await readFile(skillFile, "utf8");
  const frontmatter = parseFrontmatter(text, rel);
  if (frontmatter) {
    checkName(rel, frontmatter.name, name);
    checkDescription(rel, frontmatter.description);
    if (!frontmatter.license) warn(`${rel}: no license field`);
    const unknownKeys = Object.keys(frontmatter).filter(
      (key) => !["name", "description", "license", "metadata", "allowed-tools", "version"].includes(key),
    );
    for (const key of unknownKeys) warn(`${rel}: unrecognized frontmatter key "${key}"`);
  }

  if (!/^#\s+\S/m.test(text)) fail(`${rel}: missing H1 heading`);

  await checkLinks(skillFile, text);

  const linked = new Set();
  for (const md of (await walk(skillDir)).filter((f) => f.endsWith(".md"))) {
    const mdText = stripCodeFences(await readFile(md, "utf8"));
    for (const match of mdText.matchAll(/\]\(([^)\s#]+)/g)) {
      const resolved = path.resolve(path.dirname(md), match[1]);
      linked.add(path.relative(skillDir, resolved));
    }
  }

  for (const sub of ["references", "assets"]) {
    const dir = path.join(skillDir, sub);
    if (!(await exists(dir))) continue;
    for (const file of await walk(dir)) {
      const assetRel = path.relative(skillDir, file).split(path.sep).join("/");
      if (!linked.has(path.normalize(assetRel))) {
        fail(`${rel}: ${sub} file is not linked from SKILL.md -> ${assetRel}`);
      }
    }
  }

  for (const file of await walk(skillDir)) {
    if (!file.endsWith(".md")) continue;
    const content = await readFile(file, "utf8");
    if (content.trim().length === 0) fail(`${path.relative(ROOT, file)}: empty file`);
    if (!/^#\s+\S/m.test(content)) fail(`${path.relative(ROOT, file)}: missing H1 heading`);
    await checkLinks(file, content);
  }

  for (const file of await walk(skillDir)) {
    if (!file.endsWith(".json.txt")) continue;
    const content = await readFile(file, "utf8");
    try {
      JSON.parse(content);
    } catch (error) {
      fail(`${path.relative(ROOT, file)}: invalid JSON (${error.message})`);
    }
  }
}

async function validateRootDocs() {
  for (const file of ["README.md", ...(await walk(path.join(ROOT, "docs"))).filter((f) => f.endsWith(".md"))]) {
    const full = path.isAbsolute(file) ? file : path.join(ROOT, file);
    if (!(await exists(full))) {
      fail(`missing root document: ${file}`);
      continue;
    }
    const text = await readFile(full, "utf8");
    await checkLinks(full, text);
  }
  for (const required of ["README.md", "LICENSE", "package.json", ".gitignore"]) {
    if (!(await exists(path.join(ROOT, required)))) fail(`missing ${required}`);
  }
}

async function main() {
  if (!(await exists(SKILLS_DIR))) {
    console.error("No skills/ directory found");
    process.exit(1);
  }

  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skills = entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(SKILLS_DIR, entry.name));

  if (skills.length !== 4) fail(`expected 4 skills (pc + bsml-ui + quest + chromapper), found ${skills.length}`);

  for (const skill of skills) await validateSkill(skill);
  await validateRootDocs();

  const labels = await Promise.all(
    skills.map(async (dir) => {
      const file = path.join(dir, "SKILL.md");
      const fm = parseFrontmatter(await readFile(file, "utf8"), path.relative(ROOT, file));
      return fm?.name ?? path.basename(dir);
    }),
  );

  for (const warning of warnings) console.warn(`WARN  ${warning}`);
  for (const error of errors) console.error(`ERROR ${error}`);

  if (errors.length) {
    console.error(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exit(1);
  }

  console.log(`OK  ${labels.length} skills validated: ${labels.join(", ")}`);
  console.log(`    ${warnings.length} warning(s)`);
}

await main();
