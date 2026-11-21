import type { EncryptedPostPayload } from "./encrypted-format";

/**
 * 构建期加密：把渲染好的正文 HTML 加密成 Pages 上可以直接解密的载荷。
 * 参数与 scripts/lock-post.mjs 完全一致（PBKDF2-SHA256 60 万次 + AES-256-GCM）。
 */

const ITERATIONS = 600000;
const PAYLOAD_VERSION = 1;

// Node 20+ / 现代浏览器都有全局 Web Crypto
const webcrypto = globalThis.crypto;

function toBase64(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString("base64");
}

export async function encryptPostContent(
	plaintext: string,
	password: string,
): Promise<EncryptedPostPayload> {
	const salt = webcrypto.getRandomValues(new Uint8Array(16));
	const iv = webcrypto.getRandomValues(new Uint8Array(12));

	const baseKey = await webcrypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveKey"],
	);
	const key = await webcrypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
		baseKey,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt"],
	);
	const ciphertext = await webcrypto.subtle.encrypt(
		{ name: "AES-GCM", iv, tagLength: 128 },
		key,
		new TextEncoder().encode(plaintext),
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
