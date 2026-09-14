import { build as buildElectron, Platform, Arch, type PackagerOptions, type Configuration } from "electron-builder";
import { build as buildVite } from "vite";

async function main(targets: PackagerOptions["targets"], config: Partial<Configuration> = {}) {
	const appPaths = await buildElectron({
		config: {
			asar: false,
			appId: "com.libnoname.noname",
			productName: "noname",
			directories: {
				output: "../../output",
			},
			files: [
				{ from: "dist", to: "" },
				{ from: "../../dist", to: "" },
				{ from: "../../dist/node_modules", to: "node_modules" },
				"package.json",
			],
			extraMetadata: {
				main: "app/main.js",
			},
			// gz3: files已经手动指定了要拷贝的内容（含../../dist/node_modules），不需要
			// electron-builder自己再去扫一遍node_modules生成依赖图——这个仓库的pnpm
			// workspace每个子项目单独一份lockfile的结构，会导致它内置的pnpm依赖收集器
			// 解析出一棵没有name字段的树而崩溃。返回false等价于告诉它"node_modules我自己管"，
			// 顺带跳过用不上的原生依赖重编译（当前依赖都是纯JS，没有native binding）。
			beforeBuild: async () => false,
			...config,
		},
		targets,
	});
	console.log("打包完成");
}

await buildVite();

switch (process.argv[2]) {
	case "win":
		// gz3: 改用portable（绿色版）——单个exe直接运行，不用装/卸载
		main(Platform.WINDOWS.createTarget("portable", Arch.x64), {
			win: {
				verifyUpdateCodeSignature: false,
				icon: "noname.ico",
			},
		});
		break;
	case "linux":
		main(Platform.LINUX.createTarget("AppImage", Arch.x64));
		break;
	case "macos":
		main(Platform.MAC.createTarget("dmg", Arch.arm64, Arch.x64), {
			mac: {
				identity: null,
			},
		});
		break;
	default:
		console.log("未知平台:", process.argv[2]);
}
