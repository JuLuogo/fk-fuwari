#!/usr/bin/env node
/**
 * 把一篇文章「加密」：正文渲染成 HTML 后用密码加密，只把密文写进仓库。
 *
 *   pnpm lock-post <slug> [--password <密码>] [--skip-build]
 *
 * 过程（四步）：
 *   1. 读 src/content/posts/<slug>.md（正文就是明文，留在仓库里没问题）
 *   2. 临时去掉这个文件的 encrypted 标记、跑一次构建，用主题自己的 Markdown 管线
 *      渲染出正文 HTML 与标题（这样加密内容和普通文章长得完全一样）
 *   3. PBKDF2-SHA256(60 万次) + AES-256-GCM 加密，写 src/data/encrypted/<slug>.json
 *   4. 把文章 frontmatter 加上 encrypted: true、去掉用完的 password，正文原样保留
 *
 * 密码来源（按优先级）：--password 参数 > 环境变量 LOCK_POST_PASSWORD > frontmatter 的 password
 * 密码本身不会被写进仓库（frontmatter 里的 password 用完即删），明文正文会保留在仓库里。
 */

import { execSync } from "node:child_process";
import { webcrypto as crypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "src", "content", "posts");
const ENCRYPTED_DIR = path.join(ROOT, "src", "data", "encrypted");

/** 与 src/utils/encrypted-format.ts 保持一致 */
const PAYLOAD_VERSION = 1;
const ITERATIONS = 600000;
// 正文锚点：见 src/pages/posts/[...slug].astro（HTML 注释会被 Astro 的 slot 编译器丢掉，所以用空 div）
const BEGIN_MARK = "data-post-begin";
const END_MARK = "data-post-end";

/* ------------------------------ 参数 ------------------------------ */

let passwordFromCli;
let skipBuild = false;
const positionals = [];

for (let i = 2; i < process.argv.length; i++) {
	const arg = process.argv[i];
	if (arg === "--password") passwordFromCli = process.argv[++i];
	else if (arg === "--skip-build") skipBuild = true;
	else if (!arg.startsWith("--")) positionals.push(arg);
}

const slug = positionals[0];

function fail(message) {
	console.error("✗ " + message);
	process.exit(1);
}

if (!slug) {
	console.log(`用法: pnpm lock-post <slug> [--password <密码>] [--skip-build]

  <slug>            文章 slug（文件名去掉 .md），例如 my-secret-note
  --password <密码>  密码；不传则依次读环境变量 LOCK_POST_PASSWORD、frontmatter 的 password
  --skip-build      复用已有的 dist/posts/<slug>/index.html，不重新构建（调试用）
`);
	process.exit(1);
}

/* --------------------------- frontmatter --------------------------- */

function splitFrontmatter(raw) {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
	if (!match) fail("文件开头没有找到 frontmatter（第一行必须是 ---）");
	return { frontmatter: match[1], body: raw.slice(match[0].length) };
}

function parseBlocks(frontmatter) {
	const lines = frontmatter.split(/\r?\n/);
	const blocks = [];
	let current = null;
	lines.forEach((line, index) => {
		const match = /^([A-Za-z_][\w-]*)\s*:/.exec(line);
		if (match) {
			current = { key: match[1], start: index, end: lines.length };
			blocks.push(current);
		}
	});
	for (let i = 0; i < blocks.length - 1; i++) {
		blocks[i].end = blocks[i + 1].start;
	}
	return { lines, blocks };
}

function getFrontmatterValue(frontmatter, key) {
	const { lines, blocks } = parseBlocks(frontmatter);
	const block = blocks.find((b) => b.key === key);
	if (!block) return undefined;
	const firstLine = lines[block.start];
	const inline = firstLine.slice(firstLine.indexOf(":") + 1).trim();
	const value =
		inline !== ""
			? inline
			: lines.slice(block.start + 1, block.end).join("\n").trim();
	return value.replace(/^["']|["']$/g, "");
}

function stripFrontmatterKeys(frontmatter, keys) {
	const { lines, blocks } = parseBlocks(frontmatter);
	const remove = new Set();
	for (const block of blocks) {
		if (keys.includes(block.key)) {
			for (let i = block.start; i < block.end; i++) remove.add(i);
		}
	}
	return lines
		.filter((line, index) => !remove.has(index))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function withFrontmatterKey(frontmatter, key, value) {
	const { lines, blocks } = parseBlocks(frontmatter);
	const block = blocks.find((b) => b.key === key);
	if (!block) {
		return `${frontmatter.trim()}\n${key}: ${value}`;
	}
	const indent = /^\s*/.exec(lines[block.start])?.[0] ?? "";
	const kept = [];
	lines.forEach((line, index) => {
		if (index === block.start) {
			kept.push(`${indent}${key}: ${value}`);
			return;
		}
		if (index > block.start && index < block.end) return;
		kept.push(line);
	});
	return kept
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/* ------------------------------ 工具 ------------------------------ */

function toBase64(bytes) {
	return Buffer.from(bytes).toString("base64");
}

const encoder = new TextEncoder();

async function encryptPayload(plaintext, password) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const baseKey = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		"PBKDF2",
		false,
		["deriveKey"],
	);
	const key = await crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
		baseKey,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt"],
	);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv, tagLength: 128 },
		key,
		encoder.encode(plaintext),
	);
	return {
		v: PAYLOAD_VERSION,
		alg: "AES-GCM",
		kdf: "PBKDF2-SHA256",
		iter: ITERATIONS,
		salt: toBase64(salt),
		iv: toBase64(iv),
		ct: toBase64(new Uint8Array(ciphertext)),
	};
}

function decodeEntities(text) {
	return text
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}

function extractHeadings(html) {
	const headings = [];
	const re = /<h([1-6])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
	let match;
	while ((match = re.exec(html)) !== null) {
		const depth = Number(match[1]);
		const id = match[2];
		// 去掉 rehype-autolink-headings 追加的锚点（<a class="anchor">#</a> 或 <span class="anchor">）
		const inner = match[3]
			.replace(/<a[^>]*class="[^"]*\banchor\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, "")
			.replace(/<span[^>]*class="[^"]*\banchor\b[^"]*"[^>]*>[\s\S]*?<\/span>/g, "");
		headings.push({ depth, slug: id, text: decodeEntities(inner) });
	}
	return headings;
}

/* ------------------------------ 主流程 ------------------------------ */

const postPath = path.join(CONTENT_DIR, `${slug}.md`);
const encryptedPath = path.join(ENCRYPTED_DIR, `${slug}.json`);

if (!fs.existsSync(postPath)) {
	fail(`找不到文章：${path.relative(ROOT, postPath)}`);
}

const raw = fs.readFileSync(postPath, "utf8");
const { frontmatter, body } = splitFrontmatter(raw);
const password =
	passwordFromCli ||
	process.env.LOCK_POST_PASSWORD ||
	getFrontmatterValue(frontmatter, "password");

if (!password) {
	fail("没有密码：用 --password 传入，或设置 LOCK_POST_PASSWORD，或在 frontmatter 里写 password: xxx");
}
if (!body.trim()) {
	fail("正文是空的，没什么可加密的");
}

// 临时版本：去掉 encrypted（这样页面才会渲染正文用于提取）和 password（用过即删）
const plainFrontmatter = stripFrontmatterKeys(frontmatter, [
	"password",
	"encrypted",
]);
fs.writeFileSync(
	postPath,
	`---\n${plainFrontmatter}\n---\n\n${body.trim()}\n`,
	"utf8",
);

try {
	if (!skipBuild) {
		console.log("构建中（用主题管线渲染正文）…");
		execSync("pnpm exec astro build", { cwd: ROOT, stdio: "inherit" });
	}

	const pagePath = path.join(ROOT, "dist", "posts", slug, "index.html");
	if (!fs.existsSync(pagePath)) {
		fail(`构建产物里没有这篇文章：${path.relative(ROOT, pagePath)}`);
	}

	const page = fs.readFileSync(pagePath, "utf8");
	const beginIndex = page.indexOf(BEGIN_MARK);
	const endIndex = page.indexOf(END_MARK);
	if (beginIndex < 0 || endIndex < 0) {
		fail("页面里找不到正文锚点（data-post-begin / data-post-end），请检查 src/pages/posts/[...slug].astro");
	}
	const html = page
		.slice(page.indexOf(">", beginIndex) + 1, page.lastIndexOf("<", endIndex))
		.trim();
	if (!html) fail("取到的正文是空的");

	const headings = extractHeadings(html);
	const payload = await encryptPayload(JSON.stringify({ html, headings }), password);

	fs.mkdirSync(ENCRYPTED_DIR, { recursive: true });
	fs.writeFileSync(encryptedPath, JSON.stringify(payload, null, "\t") + "\n", "utf8");

	console.log(`✓ 已加密：${path.relative(ROOT, encryptedPath)}`);
	console.log(
		`  正文 ${html.length} 字符 · 目录 ${headings.length} 个标题 · 密文 ${payload.ct.length} 字符`,
	);
} finally {
	// 写回文章：加上 encrypted: true、去掉密码，正文（明文）原样保留在仓库里
	const finalFrontmatter = withFrontmatterKey(
		stripFrontmatterKeys(frontmatter, ["password"]),
		"encrypted",
		"true",
	);
	fs.writeFileSync(
		postPath,
		`---\n${finalFrontmatter}\n---\n\n${body.trim()}\n`,
		"utf8",
	);
	console.log(`✓ 已标记加密：${path.relative(ROOT, postPath)}（正文明文保留在仓库）`);
}
