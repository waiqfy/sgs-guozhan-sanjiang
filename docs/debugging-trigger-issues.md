# 调试"技能不触发/触发错误"类问题的方法论

来源：张郃"巧变2"(qiaobian2) 长期无法触发的排查过程，以及后续用同样方法定位到的貂蝉闭月、于吉千幻等崩溃。记录下来供下次遇到类似"某技能明明写对了但就是不发动/不提示"时参考。

## 第一步：永远先看 error log，而不是先猜代码

`apps/core/log/error/*.txt` 里每个文件对应一次真实报错，包含：
- 出错文件、行号、列号
- `event.name` / `event.step` / `event.parent.name...` 的事件调用链（能看出是在哪个阶段、哪个事件触发时崩的）
- 出错代码上下文（前后几行源码快照，**注意行号是当时的行号，文件改过之后可能对不上，要按代码内容定位，不要死盯行号**）
- 完整 JS 堆栈

**关键认识：`checkSkipped()` 的推测性探测会牵连无关技能。**
无名杀引擎在 `gameEvent.ts` 的 `checkSkipped()` 里，每次事件 `loop()` 开始时都会调用 `compiler.isPrevented(event)`，这会**提前**（在正式 cost/content 之前）试探性地跑一遍所有已注册技能的 `filter()`，用来判断这个事件是否会被打断/跳过。

这意味着：
- 探测阶段传给 `filter()` 的 `event` 往往是**原始触发事件**，很多正式内容阶段才会补上的字段（`event.triggername`、`event.card`、`event.target` 等）此时可能是 `undefined`。
- **任何一个技能的 `filter()` 在这个探测阶段抛出未捕获异常，都会让整个 `arrangeTrigger` 批次静默中断**——不仅这个技能不触发，同一批次里其他本该正常触发的技能也会跟着不提示、不弹窗，且不会有任何游戏内提示告诉你为什么。
- 所以"A技能不触发"的报错日志里出现的可能是完全无关的"B技能"，因为是 B 的 filter 先炸的。看 error log 时不要因为文件名/技能名对不上就跳过，只要事件链时间点吻合就要怀疑。

排查时按时间顺序看最新的几个 error log 文件（`ls -t apps/core/log/error/*.txt`），尤其关注和你操作时间点接近的那些，即使技能名看起来不相关。

## 第二步：反推 filter/content 该用什么参数，而不是想当然

这个项目里技能签名的实际约定（从官方参考技能反查得出，不能靠读引擎源码空想）：

- `filter(event, player, name)`：三参数，`name` 是本次匹配上的触发器名字符串。**永远用第三个参数 `name`，不要用 `event.triggername`**——探测阶段的 `event` 没有这个字段，`event.triggername` 只在后面重新包装出的 cost/content 事件上才存在。这是本次巧变2 卡了很久的真正根因。
- `content(event, trigger, player)`：这里的 `trigger` 才是被正确包装、带 `triggername` 的事件，`content` 里用 `trigger.triggername`/`event.triggername` 是安全的。
- 涉及 `Xxx1`/`Xxx2` 拆分的多阶段判定（跳过阶段 vs 因跳过获得奖励），命名规律是 `"XSkipped"` 配 `"XCancelled"`，**不是** `"XOmitted"`——这个也是靠 grep 官方参考技能反查出来的，不要凭引擎命名直觉猜。

遇到"某个字段是 undefined"的报错时，先假设是"探测阶段字段还没填"，而不是急着加 `?.` 糊弄过去——加保护是对的，但要弄清楚为什么会是 undefined，往往能顺带发现引擎调用链里更深层的问题。

## 第三步：搜代码里明显不存在的 API 调用

本次连带修复的几个例子，都是"写了一个听起来应该存在、但实际上引擎里没有的方法"，一旦被探测阶段调用到就会崩溃并拖累同批次其他技能：

- `player.cardsGotoPile(...)` 不存在，应为 `game.cardsGotoPile(...)`
- `game.hasCard(...)` 不存在，判断牌堆是否有牌应该用 `ui.cardPile.firstChild` 或 `get.cardPile2(...)`
- `game.getGlobalHistory("damage", ...)` 的第一个参数必须是固定的几个 key 之一（`cardMove`/`custom`/`useCard`/`changeHp`/`everything`），`"damage"` 不是合法 key，会导致 `history.filter is not a function`；想按事件名筛选应该用 `game.getGlobalHistory("everything", evt => evt.name == "damage" && ...)`
- 卡牌 id 拼写错误（如 `wugufengdeng` 应为 `wugu`）会让 `get.info()` 返回 `undefined`，后续任何访问其属性（如 `.multicheck`）都会崩，且同样会在探测阶段被反复触发

这类 bug 的共同特征：**平时测试可能不容易触发到那条代码路径，但一旦触发就会波及一大片看似无关的技能**。写完新技能后，建议用 `node --check` 只能保证语法正确，不能保证 API 存在；最好在浏览器里跑一圈触发一次相关事件，看 devtools console 和 error log 有没有新增报错。

## 第四步：旧式无参数写法（老 ES5 技能）的作用域坑

`content()` / `check()` / `prompt()` 写成无参数的老式写法时，引擎会通过 `ArrayCompiler` 重建执行作用域，这个作用域**只**注入 `player`/`event`/`trigger`，模块级别的 helper 函数（比如本文件里自定义的 `sameGroup()`）不在作用域内，会报 `ReferenceError`。解决办法是把逻辑内联展开，不要指望能调用文件顶部定义的函数。

## 排查流程总结（按性价比从低到高排序，先做便宜的）

1. 看最新几份 `apps/core/log/error/*.txt`，按事件链时间点找可疑项，不要只看技能名字面匹配。
2. 检查报错技能里用到的每个 API/字段是否真实存在（有疑问就搜引擎源码里有没有这个方法名）。
3. 检查 filter/content 参数用的是不是这个项目的实际约定（第三参数 `name`，而不是 `event.triggername`）。
4. 如果以上都排除了，再考虑加临时 `console.log`/`game.log`，从技能自身 filter/content，一路往下追到 `gameEvent.ts` 的 `checkSkipped()`、`library/index.js` 的 `filterTrigger()`，逐层确认到底是"没注册"、"探测阶段被跳过"还是"filter 自身逻辑返回了 false"。这一步最贵，放最后。
5. 定位到根因、修复后，记得给同一个文件里其他用了同样错误模式的地方也扫一遍（写个小脚本 grep 一下），避免同一个 bug 模式散落在别处没修到。
6. 调试用的临时 log 全部改完要清理干净，单独提交一次"清理调试log"，别和真正的修复混在一起不好回滚。
