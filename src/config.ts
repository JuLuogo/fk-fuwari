import siteDataJson from "./data/site.json";
import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

/**
 * 站点内容配置来自 src/data/site.json —— 横幅、全站公告、ICP 备案都在这里，
 * 可以直接改 JSON，也可以在 Pages CMS 的「站点设置」里可视化编辑。
 */
type SiteData = {
	banner: {
		enable: boolean;
		src: string;
		position: "top" | "center" | "bottom";
		credit: { enable: boolean; text: string; url: string };
	};
	announcement: {
		enable: boolean;
		id: string;
		type: "info" | "success" | "warning" | "error";
		closable: boolean;
		text: string;
		link: { text: string; url: string };
	};
	icp: { number: string; url: string };
};

const siteData = siteDataJson as SiteData;

export const siteConfig: SiteConfig = {
	title: "付康FK",
	subtitle: "记录生活与技术",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	// 首页横幅，见 src/data/site.json（也可在 Pages CMS「站点设置」里改）
	banner: siteData.banner,
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	// 全站公告条，见 src/data/site.json
	announcement: siteData.announcement,
	// ICP 备案号：number 填了才在页脚显示，留空则不显示
	icp: siteData.icp,
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/JuLuogo/fk-fuwari", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "付康FK",
	bio: "记录生活，分享技术，慢慢生长。",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github", // Visit https://icones.js.org/ for icon codes
			url: "https://github.com/JuLuogo/fk-fuwari",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
