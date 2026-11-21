import { defineCollection, z } from "astro:content";

/**
 * Tolerant helpers: content may be edited by hand, or through Pages CMS (.pages.yml).
 * A CMS can write an empty value ("" or null) for a field the author left blank,
 * so we normalize those to something the schema can accept instead of failing the build.
 */
const optionalDate = z.preprocess(
	(value) => (value === "" || value === null ? undefined : value),
	z.coerce.date().optional(),
);

const stringOrEmpty = z
	.preprocess((value) => (typeof value === "string" ? value : ""), z.string())
	.default(""); // "".

const stringList = z
	.preprocess(
		(value) => (Array.isArray(value) ? value.map(String) : []),
		z.array(z.string()),
	)
	.default([]);

const booleanOrFalse = z
	.preprocess(
		(value) => (typeof value === "boolean" ? value : false),
		z.boolean(),
	)
	.default(false);

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.coerce.date(),
		updated: optionalDate,
		draft: booleanOrFalse,
		pinned: booleanOrFalse,
		// 加密文章：正文以密文形式放在 src/data/encrypted/<slug>.json，
		// md 只是 frontmatter + 空正文的 stub（密码从不进仓库）
		encrypted: booleanOrFalse,
		// 填了密码 -> 每次构建都用当前正文自动加密（改正文/改密码都自动生效）
		password: stringOrEmpty,
		passwordHint: stringOrEmpty,
		description: stringOrEmpty,
		image: stringOrEmpty,
		tags: stringList,
		category: stringOrEmpty,
		lang: stringOrEmpty,

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});
export const collections = {
	posts: postsCollection,
	spec: specCollection,
};
