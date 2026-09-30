# AI 发动意愿排查日志

记录对 `apps/core/character/homebrew/skill.js` 里"技能内部选择缺 AI 回调导致 AI 从不
主动发动"这一类问题的排查过程和结论，供之后核对。每次排查追加一节，不要覆盖旧记录。

## 2026-09-29 全文件排查（commit 15107ce8）

### 起因

用户反馈吕岱"勤国"(qinguo)人工使用正常，但 AI 从不主动发动；进而要求排查全文件同类问题。

### qinguo 单独诊断

`player.chooseUseTarget({name:"sha",isCard:true}, ...)` 底层落到 `content.ts` 里一个
不带 `.skill` 的裸 `chooseTarget()`，默认 `ai = get.effect_use`。这个默认值靠
`_status.event.skill` / `_status.event._get_card` 等隐式上下文反推 card/player，没有直
接证据证明它在这个调用点必然算出非正分（没能手工构造出一个具体的、必然失败的盘面），
但鉴于本文件已经有一次"裸 chooseTarget() 因为不显式带某个字段导致行为跟原生流程不一致"
的真实先例（除疠 chuli 的 target 选择缓存 bug，见 commit 6e52866c），判断这条隐式推断
链路不够可靠，改成显式提供：

```js
.set("ai", target => get.effect(target, { name: "sha" }, player, player))
```

直接用实参算分，和文件里其他"视为使用杀"技能（如孙茹 yingjian 等）的写法保持一致。

**注意**：这一条修复没有一个"复现失败→修复后成功"的确凿证据链，只是消除了一个结构上
更脆弱的隐式依赖，做法上偏保守。如果之后实测 AI 依旧不用勤国，说明真正原因不在这里，
需要继续查（比如是否单纯因为场上没有合适目标而静默放弃，这本身不算 bug）。

### 全文件扫描方法

grep 全部 `.chooseCard(` `.choosePlayerCard(` `.chooseToDiscard(` `.chooseControl(`
`.chooseBool(` `.chooseTarget(` 调用，检查每处是否在同一条链上带 `.set("ai", ...)`
（或等价的内联 `ai:` / `.ai =` 赋值）。

- **chooseCard / choosePlayerCard / chooseToDiscard / chooseControl / chooseBool**：
  逐一核对后，确认引擎侧默认值都是合理的非"必定放弃"（`get.unuseful` /
  `get.unuseful3` / 事件自带默认值等），**没有发现属于这一类的真实 bug**，本轮未改动。
  这五类如果之后又出现"AI 不用"的报告，需要换角度排查，不要默认套用这次的结论。
- **裸 chooseTarget()（没有 `.skill`，不是走技能原生 filterTarget 流程的那种）**：
  默认 `ai = get.attitude2`，偏好"让 target 属性变好"，即偏向友方。对造成伤害/弃置对方
  牌/嫁祸伤害来源这类**打击性**选目标场景来说方向是反的——不给 ai 回调要么导致 AI 选中
  关系最好的队友当目标（方向搞反），要么在场上凑巧没有正分目标时直接判定为负分而放弃
  发动。

### 本轮修复的 7 处（均改为 `.set("ai", target => -get.attitude(player, target))`，优先选敌方）

| 角色 | 技能/分支 | 效果 | 问题 |
|---|---|---|---|
| 贾充 jiachong | 凶竖 | 选一人代替自己成为伤害来源 | 应嫁祸敌方，没ai会栽赃队友 |
| 曹洪 caohong | 护援 | 弃一名角色装备区/判定区的牌 | 应弃敌方的，没ai会弃队友 |
| 牛金 niujin | 挫锐 | 对一名其他角色造成1点伤害（forced） | forced保证选人，但没ai方向反了 |
| 周瑜 zhouyu | 焰洄/yanhui_end | 对因焰洄失去过牌的角色造成1点火焰伤害（forced） | 同上，方向反了 |
| 孙峻 sunchen | 作威/zuowei | 强制弃置一名角色的手牌/装备 | 应弃敌方的 |
| 孙峻 sunjun | 邀宴（伤害分支） | 对参与议事的角色造成2点伤害 | 同技能"获得手牌"分支之前已经修过并留了注释指出这个坑，这次补上遗漏的伤害分支 |
| 蒋琬 jiananfeng | 擅政 | 对未参与议事的角色造成1点伤害 | 与邀宴同款漏洞 |

### 本轮明确排除、判断"看起来不理想但不算这类bug"的情况

- 若干裸 `chooseControl(...)` 调用没有 `.set("ai",...)`，默认选第一个选项——如果第一个
  选项本身不是"取消/不发动"，那么技能依然会发动，只是"总选同一个分支，不够聪明"，这是
  AI质量问题而非"从不发动"问题，本轮未处理（例如郭淮/静策、甄宓/天香、张鲁/米道等）。
  如果以后要专门优化这批技能的分支选择，需要另起一轮，不要跟"AI不愿意用"这个类别混着改。

### 校验方式

每处改动后及全部改完后都跑过 `node --check apps/core/character/homebrew/skill.js`，
全部通过；未涉及 translate.js。commit: `15107ce8`。
