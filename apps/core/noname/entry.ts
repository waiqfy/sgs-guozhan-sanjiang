import { lib, game, get, _status, ui, ai } from "noname";
import { boot } from "@/init/index.js";
import { userAgentLowerCase, device } from "@/util/index.js";
import { loadBuildInfo } from "@/util/meta.js";
import "core-js-bundle";
// 保证打包时存在(importmap)
import "vue/dist/vue.esm-browser.js";

(async () => {
	try {
		lib.device = device;

		// 预加载脚本
		const path = "/preload.js";
		const { default: preload } = await import(/* @vite-ignore */ path).catch(() => {
			// Electron平台
			if (typeof window.require === "function") {
				return import("./init/node.js");
			} else {
				// 仅在“确实是移动端客户端/cordova环境”时才走 cordova 分支；
				// 否则（如 macOS 桌面 Safari/Chrome、普通手机浏览器）应走 browser 分支，避免请求 /cordova.js 并卡死在 deviceready。
				const isCordovaLike = typeof window.cordova !== "undefined" || typeof window.NonameAndroidBridge !== "undefined" || typeof window.noname_shijianInterfaces !== "undefined";

				if (import.meta.env.DEV || typeof lib.device == "undefined" || !isCordovaLike) {
					return import("./init/browser.js");
				} else {
					return import("./init/cordova.js");
				}
			}
		});
		await preload({ lib, game, get, _status, ui, ai });
		lib.buildInfo = await loadBuildInfo(url => lib.init.promises.json(url));

		await boot();
		(window as any).__debugLib = lib;
		(window as any).__debugGet = get;
		(window as any).__debugStatus = _status;
	} catch (e) {
		console.error(e);
		alert(`《无名杀》加载内容失败
浏览器UA信息: 
${userAgentLowerCase}
错误信息: 
${e instanceof Error ? e.stack : String(e)}
若您不理解该信息，请依次检查：
1. 游戏文件是否完整（重新下载完整包）
2. 客户端是否需要更新
3. 浏览器是否需要更新
4. 若您直接打开index.html进行游戏，请改为运行文件夹内的noname-server.exe
5. 若以上步骤均无法解决问题，请及时向开发组反馈`);
	}
})();
