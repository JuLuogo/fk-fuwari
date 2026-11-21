import { vitePreprocess } from "@astrojs/svelte";

export default {
	preprocess: [vitePreprocess({ script: true })],
	compilerOptions: {
		// Svelte 5 服务端渲染默认是同步的，client:load 的组件在 SSR 时会被 await，
		// 不打开这个开关会打印实验性警告（功能正常，只是构建日志噪音）。
		experimental: { async: true },
	},
};
