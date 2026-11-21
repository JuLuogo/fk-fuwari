/**
 * 加密文章的载荷格式。与 scripts/lock-post.mjs 里的常量保持一致，
 * 改动任意一边都要同步另一边。
 */

/** 载荷版本，解密端据此判断兼容性 */
export const ENCRYPTED_PAYLOAD_VERSION = 1;
/** PBKDF2 迭代次数（与 lock 脚本一致） */
export const ENCRYPTED_ITERATIONS = 600000;

export type EncryptedPostPayload = {
	/** 版本号 */
	v: number;
	/** 对称加密算法 */
	alg: "AES-GCM";
	/** 密钥派生算法 */
	kdf: "PBKDF2-SHA256";
	/** PBKDF2 迭代次数 */
	iter: number;
	/** base64 随机盐 */
	salt: string;
	/** base64 初始向量 */
	iv: string;
	/** base64 密文（含 GCM 认证标签） */
	ct: string;
};

/** 解密后得到的正文内容 */
export type UnlockedPostContent = {
	/** 正文 HTML（构建期由主题渲染管线生成） */
	html: string;
	/** 标题结构，用于解锁后重建目录 */
	headings: { depth: number; slug: string; text: string }[];
};
