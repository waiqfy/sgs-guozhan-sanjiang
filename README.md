<h1 align="center">gz3</h1>

<p align="center">基于无名杀（noname）引擎的个人国战武将包 —— 232 名自制/魔改武将，完全独立于官方武将包</p>

## 这是什么

这是基于 [无名杀](https://github.com/libnoname/noname) 引擎二次开发的个人项目：删掉了官方所有武将包，换成一套自制的 232 名武将（`apps/core/character/homebrew/`），只保留"国战"模式常驻可用。目标是让 homebrew 这一个包完全自包含——技能、翻译、图片、音频都不依赖任何官方包，哪怕官方包被整个删除也能正常运行。

本项目基于 GPL-3.0 协议开源，使用/分发时请遵守协议、保留代码出处：<https://github.com/libnoname/noname>。

## 国战模式跟你想的可能不太一样

游戏模式固定是"国战"（`apps/core/mode/guozhan/`），永久内置、不依赖武将包。除了标准国战规则（主副将、明置/暗置、势力身份、军令、珠联璧合）之外，这个仓库自己加了/改了几处规则，是本项目跟原版国战最大的区别：

### 三将规则（`sanjiang` 开关）

标准国战一局每人只有主副两张武将牌。开启"三将"后，每人在游戏开始前会额外拿到**第三张**武将牌，流程是（实现见 [`chooseThirdCharacter`](apps/core/mode/guozhan/src/patch/content.js)）：

1. 主副将选将时，每人选剩下没用到的候选武将不会被扔掉，而是记下来（`_gz3Leftover`）。
2. 开局前，按座次顺序，每人从**自己刚才选主副将时剩下的候选**里私下选 1 个，放进一个"公共武将池"（没有剩余候选的人——比如"再战"沿用了上局武将——退回到从当前武将池随机抽一批候选）。
3. 公共池凑够玩家人数后，再从剩下的全武将池里随机补 1 个，凑成 N+1 个，然后**公开展示**这 N+1 个武将。
4. 按出牌顺序的**反序**依次选：本局最后行动的玩家先选，`playerFirst`（第一个行动的玩家）最后选——弥补"先手要先亮出攻击目标"在这个环节里的信息劣势。
5. 选完剩 1 个没人要，直接弃置。
6. 第三个武将从一开始就**明置**、不计入势力归属判断，不会触发"首次亮出/明置时"这类技能（因为没有走 `showCharacter` 事件），但技能正常挂在身上，会在开局后的"游戏开始时"时机正常触发。

开启"三将"时，主副将**不要求同势力**（等同于自动开启"群雄割据"，不用再手动勾一遍）。

### 势力人数上限：统一"取一半"

原版规则里，"群雄割据"（`separatism`）开启时势力人数上限是 `人数/2 - 1`，跟普通模式的 `人数/2` 不是一套公式，容易在 5 人局这类场次把同势力第二个人直接挤成野心家。这个仓库把两种模式统一成同一条规则——**势力上限恒为在场人数的一半**（[`game.js`](apps/core/mode/guozhan/src/patch/game.js) 的 `getIdentityList`、[`player.js`](apps/core/mode/guozhan/src/patch/player.js) 的 `wontYe`、[`rest.js`](apps/core/mode/guozhan/src/skill/character/rest.js) 里野心家判定，三处保持一致；旧公式注释保留在原地方便以后需要时改回去）。

### AI 站队意愿：能组队就组队，不再乱打自己人

以前暗置状态下的 AI 在"要不要明置组队"、"该不该把这个人当队友"这两件事上偏随机，明明有安全组队的机会也可能选择继续装死，甚至打到自己真正的队友身上。现在这两处判断都会先看一眼"这真的是不是我的队友、组不组队安全"，明显更倾向于主动组队、不误伤队友。

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
