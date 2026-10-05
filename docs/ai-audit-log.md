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

## 2026-09-30 第二轮：顶层 ai.result.player 缺失排查

### 起因

李儒"焚城"(liru_fencheng)限定技 AI 从不主动发动，查出是 `ai.result` 只给了 `target`
评分、没给 `player`——这跟第一轮排查的"内部选择缺 ai 回调"是完全不同的另一类 bug：
这里缺的是技能顶层"要不要点这个按钮"的热情度信号，不是某次内部选人/选牌的评分。
第一轮排查范围没覆盖这类，所以漏掉了。本轮专门排查全部 `enable:"phaseUse"` /
`limited:true` 的技能。

### 排查方法

脚本遍历 `skill.js` 找出所有顶层 `enable:"phaseUse"` 或 `limited:true` 的技能，提取
其**顶层**（排除 subSkill 内部）`ai:` 块，检查 `result` 里是否存在 `player` 这个键
（而不是仅仅文本包含"player"字符串——很多 `result.target(player, target)` 的参数名
就叫 player，直接文本匹配会把这类函数签名误判为"有 result.player"，排查时踩了这个坑，
后来改成只认 `result: { player: ... }` 这种真正的键）。

**排除以下两类，不算这个 bug**（它们的 AI 意愿走不同的评估路径，没有 result.player
也不受影响）：
- `viewAs:`/`chooseButton:` 驱动的"将一张牌当 XX 使用"类技能（jixi/邓艾急袭、
  caishi、guanhuo/皇甫嵩觀火等）——这类技能是否发动由"这张虚拟牌值不值得打"的常规
  选牌评分决定，不走 `result.player` 这条线。
- 顶层直接声明了 `check(event, player)` 函数的技能（如 kuangfu_active、
  yishe_active）——`check` 本身就是这类技能已验证可行的发动意愿判断方式。

### 本轮修复的 13 处（统一补上 `result.player: 1`，保留原有的 target 评分/threaten 不变）

| 技能 | 角色 | 原状态 |
|---|---|---|
| zhengbi 征辟 | 崔琰&毛玠 | 有 `order`+`result.target`，缺 `player` |
| cuorui 挫锐(限定技) | 牛金 | 只有 `threaten`，没有 `order`/`result` |
| gushe 鼓舌 | 王朗 | 只有 `order`+`threaten`，没有 `result` |
| daoshu 盗书 | 蒋干 | 有 `result.target`(常量)，缺 `player` |
| mingfa 明法 | 羊祜 | 有 `result.target`(常量)，缺 `player` |
| guose2 国色(移动乐不思蜀分支) | 大乔 | 完全没有 `ai` |
| shangyi 尚义 | 蒋钦 | 有 `order`+`result.target`，缺 `player` |
| yongjin 勇进 | 凌统 | 完全没有 `ai` |
| ganlu 甘露 | 吴国太 | 有 `threaten`+`effect`(供别人查询用)，没有 `result` |
| biaozhao 表召 | 许贡 | 完全没有 `ai`（插在 subSkill 前） |
| zhuangrong 妆戎 | 吕玲绮 | 只有 `threaten`，没有 `order`/`result` |
| shanzheng 擅政 | 贾南风 | 只有 `threaten`，没有 `order`/`result` |
| weimeng 危盟/纵横 | 邓芝 | 有 `result.target`，缺 `player` |
| liru_fencheng 焚城(限定技，本轮起因) | 李儒 | 有 `order`+`result.target`，缺 `player`（已在上一条消息单独修复并提交） |

### 本轮排除、确认不是这类 bug 的情况

- `fengying`(奉迎，限定技)：`result.player(player){...}` 是个函数，已经有真正的
  `player` 键，第一遍文本扫描漏判了（regex 把函数体里出现的其他字符串干扰了判断），
  复查后确认它本来就是对的，没有改动。
- `jixi`(急袭，邓艾)：`chooseButton` 驱动，按上面排除规则跳过。
- `kuanshi`(宽释，阚泽)：这个技能顶部的注释里提到了字面字符串 `enable:"phaseUse"`
  （描述以前的错误实现），脚本按纯文本扫描时被注释文字污染误判成"当前还是
  enable:phaseUse"，实际代码早就改成 `trigger:[...]` 数组+`cost()` 了，是真正的
  触发型技能，是否发动走 `cost()` 自己的 ai，不需要也不会检查 `result.player`。

### 校验方式

全部改完后跑过 `node --check apps/core/character/homebrew/skill.js`，通过；未涉及
translate.js。

## 2026-10-04 第三轮：友/敌方向（attitude）问题

### 起因

用户反馈刘备仁德乱给人牌、孙鲁育止息对临时队友也发动。前两轮覆盖范围都不含这一类：
第一轮只查"内部选择缺ai回调→方向反了"，第二轮只查顶层`ai.result.player`缺失。

### 关键机制（get/index.js effect_use，约7086-7090行）

```
final = result1 * attitude(player, player) + result2 * attitude(player, target)
```

`ai.result.target`返回的是"这个技能对target是好是坏的**量级和正负**"，引擎会**再乘一次**
对target的态度。因此：

- 送礼/增益类：返回正数（如1），引擎自动让友方得正分、敌方得负分，不需要自己判断敌友。
- 打击类：返回负数（如-1），引擎自动让敌方得正分、友方得负分。
- **不能在result.target里直接返回`get.attitude(player,target)`或`-get.attitude(...)`**：
  会被平方——送礼型`+attitude`变成`attitude²`，强敌和强友得分一样高(乱送牌给敌人)；
  打击型`-attitude`变成`-attitude²`，敌友得分一样低(AI分不出该打谁、甚至从不发动)。
  这个写法和chooseTarget的`.set("ai", target => ...)`回调(直接当分数用，不再乘态度)是两回事，
  第一轮用`-get.attitude`修chooseTarget是对的，但不能照搬到result.target里。

### 本轮修复

result.target里直接返回attitude的13处，改成返回`1`(送礼型)或`-1`(打击型)：
- 送礼型(+1)：jieyin、xianzhou、mizhao、shenchong、channi
- 打击型(-1)：hongju(鸿举的指定对象是唯一不被移出游戏、可被集火的人，应指定想集火的敌人，起初误归为送礼型改反了)、yijue、boyan、yinpan、liru_fencheng、xionghuo_give、yinge、shelun

另有chooseBool无条件true但效果依赖具体对象的：zhixi(止息)令trigger.player弃牌，改成按
`attitude<0`才发动。rende(仁德)的result.target本来返回的是正数量级，机制上没问题，这次顺手加的
`attitude<=0→0`只是多一道保险，并不是乱给牌的根因(根因没查到，见下)。

### 扫描结论与遗留

全文件脚本扫描所有顶层技能+子技能的`ai.result.target`共51处(47处enable型)，其中函数体里没有任何
attitude判断的24处逐个看过正负号，都和描述一致（打击型为负、增益型为正），没发现符号反的。
**没有处理、需要人工确认的**：
- wuyou/zhanjue/duanxie：返回值里已经乘/除了attitude或get.effect(自带态度加权)，会被二次加权，
  方向对不对要看具体场景，没动。
- zhengbi/jiahe：用`att>0?1:-1`这类按态度分支返回±1，乘上态度后敌友得分都为正，分不出该选谁，
  但它们的选择本身还有其他约束，没动。
- 刘备仁德"乱给人牌"：result.target本身没问题，真正原因可能在check(card)选牌/发动时机，没复现到具体场景，
  暂未处理，需要具体的对局情况。

### 同一天顺手修的其他AI/方向问题

- tianxiang(天香)：chooseCardTarget缺ai回调，AI会把伤害/失去体力转给队友，补ai1/ai2只选敌方。
