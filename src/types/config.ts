import type { AUTO_MODE, DARK_MODE, LIGHT_MODE } from "@constants/constants";

export type SiteConfig = {
	title: string;
	subtitle: string;

	lang:
		| "en"
		| "zh_CN"
		| "zh_TW"
		| "ja"
		| "ko"
		| "es"
		| "th"
		| "vi"
		| "tr"
		| "id";

	themeColor: {
		hue: number;
		fixed: boolean;
	};
	banner: {
		enable: boolean;
		src: string;
		position?: "top" | "center" | "bottom";
		credit: {
			enable: boolean;
			text: string;
			url?: string;
		};
	};
	toc: {
		enable: boolean;
		depth: 1 | 2 | 3;
	};

	favicon: Favicon[];

	/**
	 * 全站公告条。enable 打开且 text 不为空时才会显示在页面顶部，
	 * 访客关闭后会记在 localStorage 里，改 id 或改内容即可重新展示。
	 */
	announcement?: AnnouncementConfig;

	/**
	 * 备案信息（中国大陆站点）。填写 number 后页脚才会显示备案号，
	 * number 留空则完全不渲染，不会占位。
	 */
	icp?: {
		/** 备案号，例如 "粤ICP备12345678号-1"，留空则不显示 */
		number: string;
		/** 备案链接，默认指向工信部政务服务平台 */
		url?: string;
	};
};

export type AnnouncementConfig = {
	/** 是否启用全站公告 */
	enable: boolean;
	/** 公告标识，用于记住访客是否已关闭；留空时按内容自动生成 */
	id?: string;
	/** 公告类型，决定配色 */
	type?: "info" | "success" | "warning" | "error";
	/** 是否允许访客关闭 */
	closable?: boolean;
	/** 公告内容（纯文本） */
	text: string;
	/** 可选链接，text 和 url 都填了才显示 */
	link?: {
		text: string;
		url: string;
	};
};

export type Favicon = {
	src: string;
	theme?: "light" | "dark";
	sizes?: string;
};

export enum LinkPreset {
	Home = 0,
	Archive = 1,
	About = 2,
}

export type NavBarLink = {
	name: string;
	url: string;
	external?: boolean;
};

export type NavBarConfig = {
	links: (NavBarLink | LinkPreset)[];
};

export type ProfileConfig = {
	avatar?: string;
	name: string;
	bio?: string;
	links: {
		name: string;
		url: string;
		icon: string;
	}[];
};

export type LicenseConfig = {
	enable: boolean;
	name: string;
	url: string;
};

export type LIGHT_DARK_MODE =
	| typeof LIGHT_MODE
	| typeof DARK_MODE
	| typeof AUTO_MODE;

export type BlogPostData = {
	body: string;
	title: string;
	published: Date;
	description: string;
	tags: string[];
	draft?: boolean;
	pinned?: boolean;
	image?: string;
	category?: string;
	prevTitle?: string;
	prevSlug?: string;
	nextTitle?: string;
	nextSlug?: string;
};

export type ExpressiveCodeConfig = {
	theme: string;
};
