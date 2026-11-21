<script lang="ts">
import type {
	EncryptedPostPayload,
	UnlockedPostContent,
} from "@utils/encrypted-format";
import { onMount, tick } from "svelte";

interface Props {
	payload?: EncryptedPostPayload | null;
	hint?: string;
}

let { payload = null, hint = "" }: Props = $props();

let password = $state("");
let busy = $state(false);
let error = $state("");
let unlocked = $state(false);
let bodyEl = $state<HTMLDivElement | null>(null);
let inputEl = $state<HTMLInputElement | null>(null);

onMount(() => {
	inputEl?.focus();
});

function base64ToBytes(base64: string) {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iter: number) {
	const baseKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(passphrase),
		"PBKDF2",
		false,
		["deriveKey"],
	);
	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
		baseKey,
		{ name: "AES-GCM", length: 256 },
		false,
		["decrypt"],
	);
}

function escapeHtml(text: string) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/**
 * innerHTML 注入的 <script> 不会执行，但正文里可能带需要运行的脚本
 * （比如 GitHub 仓库卡片的元数据请求），所以换成一个新节点再插一次。
 */
function runInjectedScripts() {
	if (!bodyEl) return;
	for (const old of Array.from(bodyEl.querySelectorAll("script"))) {
		const script = document.createElement("script");
		for (const attr of Array.from(old.attributes)) {
			script.setAttribute(attr.name, attr.value);
		}
		script.textContent = old.textContent ?? "";
		old.replaceWith(script);
	}
}

/** 解锁后重建右侧目录（加密文章的目录在构建期被刻意置空） */
function rebuildToc(headings: UnlockedPostContent["headings"]) {
	const host = document.querySelector("table-of-contents");
	if (!host || headings.length === 0) return;
	const minDepth = Math.min(...headings.map((h) => h.depth));
	host.innerHTML = headings
		.map((heading) => {
			const indent =
				heading.depth === minDepth
					? ""
					: heading.depth === minDepth + 1
						? "ml-4"
						: "ml-8";
			return `<a href="#${heading.slug}" class="px-2 flex gap-2 relative transition w-full min-h-9 rounded-xl hover:bg-[var(--toc-btn-hover)] active:bg-[var(--toc-btn-active)] py-2">
					<div class="transition w-5 h-5 shrink-0 rounded-lg flex items-center justify-center font-bold ${indent}">
						<div class="transition w-2 h-2 rounded-[0.1875rem] bg-[var(--toc-badge-bg)]"></div>
					</div>
					<div class="transition text-sm text-50">${escapeHtml(heading.text)}</div>
				</a>`;
		})
		.join("");
}

async function unlock() {
	if (busy) return;
	if (!password) {
		error = "请输入密码";
		return;
	}
	if (!payload) {
		error = "没有找到加密数据，可能是文章还没执行过 pnpm lock-post";
		return;
	}
	if (!globalThis.crypto?.subtle) {
		error = "当前环境不支持 WebCrypto，请用 HTTPS 或 localhost 打开";
		return;
	}

	busy = true;
	error = "";
	try {
		const key = await deriveKey(
			password,
			base64ToBytes(payload.salt),
			payload.iter,
		);
		const plain = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: base64ToBytes(payload.iv), tagLength: 128 },
			key,
			base64ToBytes(payload.ct),
		);
		const content = JSON.parse(
			new TextDecoder().decode(plain),
		) as UnlockedPostContent;

		unlocked = true;
		await tick();
		if (bodyEl) {
			bodyEl.innerHTML = content.html || "";
			runInjectedScripts();
		}
		rebuildToc(content.headings || []);
	} catch {
		// AES-GCM 认证失败无法区分「密码错」和「密文被改」，统一提示
		error = "密码错误";
		password = "";
	} finally {
		busy = false;
	}
}
</script>

{#if !payload}
	<div class="card-base onload-animation mb-6 flex flex-col items-center gap-3 px-6 py-10">
		<div class="text-4xl select-none">🔒</div>
		<div class="text-lg font-bold text-black/85 dark:text-white/85">这篇私密文章还没设置密码</div>
		<div class="max-w-md text-center text-sm text-black/45 dark:text-white/45">
			文章已被标记为加密，但还没有生成密文。作者在 Pages CMS 里对这篇文章点一次
			「加密这篇文章」并填入密码后即可阅读。
		</div>
	</div>
{:else if !unlocked}
	<div class="card-base onload-animation mb-6 flex flex-col items-center gap-4 px-6 py-10">
		<div class="text-center">
			<div class="mb-2 text-4xl select-none">🔒</div>
			<div class="text-lg font-bold text-black/85 dark:text-white/85">这是一篇加密文章</div>
			<div class="mt-1 text-sm text-black/45 dark:text-white/45">
				输入密码解锁正文。解密只在你的浏览器里完成，线上没有明文。
			</div>
		</div>

		<form
			class="flex w-full max-w-md flex-col gap-2"
			onsubmit={(event) => {
				event.preventDefault();
				unlock();
			}}
		>
			<div class="flex gap-2">
				<input
					bind:this={inputEl}
					bind:value={password}
					type="password"
					name="post-password"
					autocomplete="current-password"
					aria-label="文章密码"
					placeholder="请输入密码"
					disabled={busy}
					class="min-w-0 flex-1 rounded-lg bg-[var(--btn-regular-bg)] px-3 py-2 text-sm text-black/80 outline-none transition placeholder:text-black/30 focus:bg-[var(--btn-regular-bg-hover)] dark:text-white/80 dark:placeholder:text-white/30"
				/>
				<button
					type="submit"
					disabled={busy}
					class="btn-regular shrink-0 rounded-lg px-4 py-2 text-sm font-bold text-[var(--btn-content)] active:scale-95 disabled:opacity-50"
				>
					{busy ? "解密中…" : "解锁"}
				</button>
			</div>

			{#if hint}
				<div class="text-xs text-black/40 dark:text-white/40">密码提示：{hint}</div>
			{/if}
			{#if error}
				<div class="text-xs text-rose-500">{error}</div>
			{/if}
		</form>
	</div>
{/if}

<!-- 解锁后把正文 HTML 注入这里 -->
<div
	id="post-content-body"
	bind:this={bodyEl}
	class="prose dark:prose-invert prose-base !max-w-none custom-md mb-6"
	hidden={!unlocked}
></div>
