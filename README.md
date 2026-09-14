<h1 align="center">gz3</h1>

<p align="center">基于无名杀（noname）引擎的个人国战武将包 —— 232 名自制/魔改武将，完全独立于官方武将包</p>

## 这是什么

这是基于 [无名杀](https://github.com/libnoname/noname) 引擎二次开发的个人项目：删掉了官方所有武将包，换成一套自制的 232 名武将（`apps/core/character/homebrew/`），只保留"国战"模式常驻可用。目标是让 homebrew 这一个包完全自包含——技能、翻译、图片、音频都不依赖任何官方包，哪怕官方包被整个删除也能正常运行。

本项目基于 GPL-3.0 协议开源，使用/分发时请遵守协议、保留代码出处：<https://github.com/libnoname/noname>。

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) ^20.19.0 || >=22.12.0
- [pnpm](https://pnpm.io/) >= 9
- 浏览器/Webview：Chromium >= 91 || Safari >= 16.4.0（暂不支持 Firefox）

### 安装依赖

```bash
pnpm install
```

### 开发调试（改代码实时热更新，推荐日常开发用这个）

```bash
pnpm dev
```

### 生成生产版本（纯静态网页，输出到根目录 `dist/`）

```bash
pnpm build
```

`dist/` 是完全静态的网页产物（HTML/JS/图片/音频），可以直接用任意静态服务器托管，也可以配合下面的桌面端打包。

### 打包成 Windows 桌面客户端（exe）

```bash
cd apps/electron
pnpm build:win
```

产物在仓库根目录的 `output/` 里。当前配置打的是 `portable`（绿色版单文件exe，不需要安装），如果要改成安装版，改 `apps/electron/build.ts` 里的 target 为 `"nsis"`。

> 注意：这一步在 Windows 上需要用**管理员权限**打开的终端运行，否则会在下载 `winCodeSign` 时因为 Windows 阻止创建符号链接而失败。

## 项目结构速览

```
apps/core/character/homebrew/   本项目唯一的武将包：character.js（武将定义）、
                                 skill.js（技能实现）、translate.js（文本）
apps/core/character/homebrew/aiShow.js   AI"要不要冒险暴露暗置武将"的判断逻辑（见下）
apps/core/mode/guozhan/         国战模式本体（永久内置，武将包被删也不受影响）
apps/core/image/、apps/core/audio/   美术/音频资源，只保留 homebrew 232 名武将实际用到的部分
apps/core/noname/               无名杀引擎本体，基本没有大改
apps/electron/                  桌面端（Electron）打包配置
scripts/build.ts                 顶层构建脚本，把各子项目产物汇总进 dist/
```

## AI 在哪里（如果你想改进 AI）

这个引擎的 AI 是"分散式"的——没有一个单独的"AI大脑"文件统管一切，每个技能自己决定要不要用、怎么用。想改进 AI，要看你想改的是哪一层：

1. **单个技能自己的价值判断** —— 每个技能定义里的 `ai: {...}` 字段（`apps/core/character/homebrew/skill.js`）。这里控制"这个技能对我值不值、该不该对某个目标用"，常见字段有 `ai.order`（优先级）、`ai.result`（对目标/对局面的价值评估，通常调用 `get.attitude`/`get.effect`）、`ai.skillTagFilter`（额外的可用性判断）。改某个具体武将的AI手感，基本都是改这里。

2. **国战"暗置角色要不要冒险用技能暴露自己"的判断** —— 这是本项目自己加的一层，在 `apps/core/character/homebrew/aiShow.js`：
   - 每个技能在 `skill.js` 里可以打一个 `aiShowTag`（`response`/`defense`/`aoe`/`draw`/`offense`/`control`/`support`/`recover`）和 `aiShowCost`（是否需要付代价发动），当前是脚本自动打的粗标签，不精确。
   - `shouldRiskShow()` 是实际的判断规则（进攻类默认压制、防御/响应/摸牌类放行、代价类看手牌数等）。
   - `applyAiShowGates()` 是全局挂载点，会在 `skill.js` 加载时给所有打了标签的技能包一层过滤，只影响AI自己的座位（`player == game.me` 时完全不生效，人类玩家看到的选项不受影响）。
   - 这套东西是"能用但很糙"的第一版，权重、标签准确度都还需要靠实际对局观察慢慢调——发现某个技能AI表现不对，先看看它有没有打对标签，或者要不要用 `aiShowClassify(event, player)` 针对这个技能单独写判断逻辑（用于像"龙胆"这种一个技能里混合了进攻和防御两种用法的情况）。

3. **国战武将选择/候选池相关**——`apps/core/mode/guozhan/src/patch/game.js` 的 `getCharacterChoice`（候选武将怎么抽）、`apps/core/mode/guozhan/src/patch/content.js` 的 `chooseThirdCharacter`（三将模式选将流程）。这些不算严格意义的"AI"，但会影响AI能选到什么。

4. **引擎通用的AI基础设施** —— `apps/core/noname/ai/basic.js`、`apps/core/noname/ai/index.js`，是最底层的按钮/卡牌选择循环，一般不需要碰，除非要改的是"AI怎么点选项"这种通用交互逻辑本身。

5. **通用价值评估原语** —— `get.attitude(player, target)`（判断我对目标是敌意还是友善，多少）、`get.effect(card, target, player)`（估算一张牌对某人的效果好坏），这两个是几乎所有技能AI都会调用的基础函数，在 `apps/core/noname/get/index.js` 里。

## 贡献

- 每个分支/PR 只做一件事，别顺手夹带无关的重构或格式化。
- 改完之后自己实际玩一下验证行为，尤其是牵扯AI判断的改动，多打几局观察再提。
- 提 PR 时说清楚改了什么、为什么改、怎么验证的。
