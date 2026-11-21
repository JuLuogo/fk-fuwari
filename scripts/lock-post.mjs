#!/usr/bin/env node
/**
 * 把一篇带密码的文章「锁定」成加密文章。
 *
 *   pnpm lock-post <slug> [--password <密码>] [--skip-build]
 *
 * 做四件事：
 *   1. 读明文（优先 private/posts/<slug>.md，否则用 src/content/posts/<slug>.md），
 *      密码取自 frontmatter 的 password 或 --password 参数
 *   2. 把明文临时放回内容目录、跑一次构建，从 dist/posts/<slug>/index.html 里
 *      抠出「正文 HTML + 目录 headings」（保证和主题的 Markdown 渲染完全一致）
 *   3. PBKDF2-SHA256(600000) + AES-256-GCM 加密，写 src/data/encrypted/<slug>.json
 *   4. 把内容目录里的文章换成 stub（frontmatter 保留、去掉 password、正文清空）
 *
 * 提交物只有 stub 与密文 JSON；明文和密码留在 gitignored 的 private/posts/ 里。
 */

import { execSync } from "node:child_process";
import { webcrypto as crypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PRIVATE_DIR = path.join(ROOT, "private", "posts");
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

  <slug>            文章 slug（文件名去掉 .md），例如 encrypted-demo
  --password <密码>  临时指定密码；不传则读取 frontmatter 里的 password
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
	// 前一个 block 的结束行 = 下一个 block 的开始行
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
		// 旧值可能是多行，整段丢掉
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
		const slug = match[2];
		// 去掉 rehype-autolink-headings 追加的锚点（<a class="anchor">#</a> 或 <span class="anchor">）
		const inner = match[3]
			.replace(/<a[^>]*class="[^"]*\banchor\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, "")
			.replace(/<span[^>]*class="[^"]*\banchor\b[^"]*"[^>]*>[\s\S]*?<\/span>/g, "");
		headings.push({ depth, slug, text: decodeEntities(inner) });
	}
	return headings;
}

/* ------------------------------ 主流程 ------------------------------ */

const privatePath = path.join(PRIVATE_DIR, `${slug}.md`);
const contentPath = path.join(CONTENT_DIR, `${slug}.md`);
const encryptedPath = path.join(ENCRYPTED_DIR, `${slug}.json`);

const sourcePath = fs.existsSync(privatePath) ? privatePath : contentPath;
if (!fs.existsSync(sourcePath)) {
	fail(`找不到文章：${path.relative(ROOT, privatePath)} 或 ${path.relative(ROOT, contentPath)}`);
}

const raw = fs.readFileSync(sourcePath, "utf8");
const { frontmatter, body } = splitFrontmatter(raw);
const password = passwordFromCli ?? getFrontmatterValue(frontmatter, "password");

if (!password) {
	fail("没有密码：请在 frontmatter 里写 password: xxx，或用 --password 传入");
}
if (!body.trim()) {
	fail("正文是空的，没什么可加密的");
}

// 明文永远留一份在 private/（gitignored），作为后续编辑的唯一来源
fs.mkdirSync(PRIVATE_DIR, { recursive: true });
fs.writeFileSync(privatePath, raw, "utf8");

// 临时把明文放回内容目录，用主题自己的渲染管线生成正文 HTML
const publicFrontmatter = stripFrontmatterKeys(frontmatter, ["password", "encrypted"]);
fs.mkdirSync(CONTENT_DIR, { recursive: true });
fs.writeFileSync(contentPath, `---\n${publicFrontmatter}\n---\n\n${body.trim()}\n`, "utf8");

try {
	if (!skipBuild) {
		console.log("构建中（用主题管线渲染正文）…");
		execSync("pnpm exec astro build", { cwd: ROOT, stdio: "inherit" });
	}

	const pagePath = path.join(ROOT, "dist", "posts", slug, "index.html");
	if (!fs.existsSync(pagePath)) fail(`构建产物里没有这篇文章：${path.relative(ROOT, pagePath)}`);

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
	console.log(`  正文 ${html.length} 字符 · 目录 ${headings.length} 个标题 · 密文 ${payload.ct.length} 字符`);
} finally {
	// 无论成功失败，都把内容目录换成 stub，避免明文被提交
	const stubFrontmatter = withFrontmatterKey(
		stripFrontmatterKeys(frontmatter, ["password"]),
		"encrypted",
		"true",
	);
	fs.writeFileSync(contentPath, `---\n${stubFrontmatter}\n---\n`, "utf8");
	console.log(`✓ 已写回 stub：${path.relative(ROOT, contentPath)}`);
	console.log(`  明文保留在：${path.relative(ROOT, privatePath)}（该目录已 gitignore）`);
}
