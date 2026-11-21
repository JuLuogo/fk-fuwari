/**
 * 「这篇文章是不是加密文章」的唯一判断入口。
 * 两套用法都算：
 *   1) frontmatter 里填了 password（密码存在仓库里，最简单）
 *   2) 打开 encrypted 开关（配合「加密这篇文章」按钮 / pnpm lock-post 生成的密文）
 */
export function isPostEncrypted(data: {
	password?: string | null;
	encrypted?: boolean | null;
}): boolean {
	return (data.password ?? "").trim() !== "" || data.encrypted === true;
}
