# 出牌阶段技能时机排查日志

排查 `apps/core/character/homebrew/skill.js` 里所有卡面文本提到"出牌阶段"/"出牌阶段开始
时"的技能，核对实际实现的触发时机（`trigger` 用的哪个阶段事件、`player`/`global` 范围）
是否跟卡面描述一致。每次排查追加一节，不要覆盖旧记录。人工排查，未使用 Agent。

## 2026-09-29 第一轮：全部"出牌阶段"技能

### 排查方法

1. 从 translate.js 里 grep 出所有 `_info` 含"出牌阶段开始时"的技能（22个）——这类应该是
   `trigger:{player/global:"phaseUseBegin"}`，只在阶段刚开始那一刻问一次，不应该是
   `enable:"phaseUse"`（整个阶段随时可点）。
2. 再 grep 所有 `_info` 含"出牌阶段限X次"或"出牌阶段，你可以"（不带"开始时"，85个，含少量
   重复）——这类通常应该是 `enable:"phaseUse"`（整个阶段内随时可发动，被限次数/每回合限
   一次），不应该被做成只在阶段开始那一刻问一次的 trigger。
3. 对每个逐一核对 `trigger`/`enable` 声明是否跟上面两条规律匹配；不匹配的进一步深挖是否
   真的是bug，还是有额外结构原因（比如子技能拆分、原文本身就该在这个时机、跟已验证过的
   官方参考代码逐字比对）。

### 结论：xxx 技能 正确/修改

**"出牌阶段开始时"组（22个）：**

| 技能 | 角色 | 结论 |
|---|---|---|
| wenji 问计 | 刘琦 | 正确（`trigger:{player:"phaseUseBegin"}`） |
| baolie 咆哮 | 夏侯霸 | 正确（`trigger:{player:"phaseUseBegin"}`，锁定技触发范围内所有敌方角色） |
| xuanhuo 炫惑 | 法正 | 正确（"其他角色的...开始时" → `trigger:{global:"phaseUseBegin"}`） |
| qiangzhi 强制 | 张松 | 正确（`trigger:{player:"phaseUseBegin"}`） |
| xiantu 先图 | 张松 | 正确（"其他角色...开始时" → `trigger:{global:"phaseUseBegin"}`） |
| wanglie 枉戾 | 陈到 | 正确 |
| **gongsun 共损** | 杨仪 | **本轮之前已修复**（commit 5de7d524）：原来用 `enable:"phaseUse"` 整阶段随时可点，时机不对，且弃牌后选不了目标；改成官方同款 `trigger:phaseUseBegin`+`direct:true`+`chooseCardTarget` |
| zhaoran 昭然 | 司马昭 | 正确 |
| tairan 泰然 | 司马师 | 正确（"回合结束时"部分用 `phaseJieshuBegin`，"出牌阶段开始时"部分是子技能 `tairan2` 用 `phaseUseBegin`，两段时机都对） |
| qingzhong 轻重 | 鲁芝 | 正确 |
| fenxun 奋迅 | 丁奉 | 正确（本session早前已修过它自己另一个"自我碰撞"的bug，这次单独核对时机部分没问题） |
| duojing 夺荆 | 吕蒙 | 正确但特殊：用 `trigger:{global:"phaseUseBefore"}`+`trigger.cancel()`，因为"令其结束当前阶段"需要在阶段**开始前**拦截取消，而不是阶段开始后再处理，`phaseUseBefore` 是有意为之（且此技能的另一部分`duojing_after`本session早前已修过时机bug） |
| xiashu 郄署 | 阚泽 | 正确 |
| shuangxiong 双雄 | 颜良&文丑 | 正确 |
| shuangren 双刃 | 吉玲 | 正确 |
| zhendu 鸩毒 | 何太后 | 正确（"一名角色...开始时" → `trigger:{global:"phaseUseBegin"}`） |
| weidi 威敌 | 袁术 | 正确 |
| zhidao 雉盜 | 严白虎 | 正确 |
| yirang 移让 | 陶谦 | 正确 |
| **xionghuo_punish 凶镶（惩罚子技能）** | 徐荣 | **本轮发现并修复**：卡面"其出牌阶段开始时，弃其暴戾并随机执行一项"，但代码写成 `trigger:{player:"phaseZhunbeiBegin"}`（准备阶段），改成 `phaseUseBegin` |
| guowu 国务 | 吕玲绮 | 正确 |
| chaozheng 朝政 | 刘宏 | 正确 |

**"出牌阶段限X次 / 出牌阶段，你可以"组（85个，不含"开始时"）：**

全部核对 `enable`/`trigger` 声明后：

- 绝大多数（约70+个）已经是 `enable:"phaseUse"`，符合"整阶段内随时可发动、按次数/每回合限
  制"的预期，逐一过了一遍没有发现明显时机错位，判定**正确**。
- `naman` 纳蛮、`diaogui` 调虎离山：用 `enable:["chooseToUse"]`（视为使用某牌）而非
  `enable:"phaseUse"`，但这是本文件"将一张牌当XX使用"类技能的常见写法（`chooseToUse`
  窗口本来就只在玩家自己出牌阶段正常出现），判定**正确**，不是这次要找的那类bug。
- `qiaobian`/`qiaobian2` 巧变：文本里的"出牌阶段，你可以移动场上的一张牌"指的是**跳过出
  牌阶段时**的替代效果，不是"出牌阶段内随时可用"，代码监听 `phaseUseCancelled`/
  `phaseUseSkipped`，判定**正确**。
- `guishu` 鬼术：主技能只是在 `phaseZhunbeiBegin` 清空"上次用过的牌名"记录，真正可发动
  的是两个子技能 `guishu_zhibi`/`guishu_yuanjiao`，都用 `enable:"phaseUse"`，判定**正确**。
- `tongling`（彭羕）、`wusi`（魏延）、`lijun`（孙亮）：文本是"出牌阶段限一次，当...后"，
  这个"限一次"是次数限制，真正触发时机是"造成伤害后"等具体事件（`damageSource`/
  `useCardAfter`），不是"阶段开始"，代码用 `trigger:{...}` + `usable:1`，判定**正确**。
- `qiaoshui` 巧说：文本没写"开始时"，但代码是 `trigger:{player:"phaseUseBegin"}`。逐字比对
  `_merged_skill_all.md` 里 yijiang 包的官方 `qiaoshui` 源码，**完全逐字一致**，判定
  **正确**（官方原版就是阶段开始时问一次，本地翻译文本省略了"开始时"三个字，不是机制错）。
- `zhuangrong` 妆戎：**之前的排查已经修过**（代码里留了注释："出牌阶段限一次"不是"出牌阶段
  开始时"...），现状是 `enable:"phaseUse"`，判定**正确（历史已修）**。

### 存疑、未改动，需要人工确认（原创技能，无参考代码可比对）

以下三个技能文本是"出牌阶段限一次，你可以..."（没有"开始时"），按本轮总结的规律**应该**
是 `enable:"phaseUse"`，但实际代码是固定在 `phaseUseBegin`（或 `phaseZhunbeiBegin`触发
后立即问）只问一次，属于"卡面写的次数限制，代码却做成了限定时机"的可疑模式——**但**它们
都标注为"原创实现"或引用的参考包里找不到对应源码，无法像 qiaoshui 那样逐字核对，所以没有
擅自改动，列在这里供你确认是否要改成 `enable:"phaseUse"`：

| 技能 | 角色 | 现状 | 疑点 |
|---|---|---|---|
| yinpan 引叛 | 陈宫 | `trigger:{player:"phaseUseBegin"}`+`usable:1`，comment 标注"未找到，按描述原创实现" | 文本只说"限一次"，没说"开始时"；效果是"选一人+众敌可选择用杀"，逻辑上不一定非要卡在阶段开始那一刻 |
| kuangfu 狂斧 | 潘凤 | `trigger:{global:"phaseUseBegin"}`，参考"gz_kuangfu(guozhan，改写)" | 同上；虽标了参考包，但"改写"意味着不能保证时机也照搬 |
| yishe 義舍 | 张鲁 | `trigger:{player:"phaseUseBegin"}`，参考"yishe(sp)" | 同上 |

如果确认这三个确实应该改成随时可发动，我可以照 gongsun 的方式（`enable:"phaseUse"` +
`usable:1`，cost() 的选人逻辑挪进 filter/content）重构，但目前没有实锤证据，先不动。

### 校验方式

未涉及代码修改的部分不需要跑 `node --check`；`xionghuo_punish` 的修复已经过
`node --check apps/core/character/homebrew/skill.js` 验证并 commit（本节写完后一并提交）。
