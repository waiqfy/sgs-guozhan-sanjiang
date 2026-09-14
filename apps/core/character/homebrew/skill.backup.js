import { lib, game, ui, get, ai, _status } from "noname";
import { applyAiShowGates } from "./aiShow.js";

const skill = {

// 甚贤：当其他角色于你的回合外因弃置而失去基本牌后，若你的手牌数不大于体力上限的两倍，你可以摸一张牌。
	// 跟官方版不同：去掉了"每名角色的回合限一次"的限制，换成手牌数上限的门槛。
	shenxian: {
		aiShowTag: "draw",
		trigger: { global: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (event.type != "discard" || event.getlx === false) {
				return false;
			}
			if (event.player == player) {
				return false;
			}
			if (_status.currentPhase == player) {
				return false;
			}
			if (player.countCards("h") > player.maxHp * 2) {
				return false;
			}
			const cards = event.cards.slice(0);
			const evt = event.getl(player);
			if (evt && evt.cards) {
				cards.removeArray(evt.cards);
			}
			for (let i = 0; i < cards.length; i++) {
				if (get.type(cards[i], null, event.hs && event.hs.includes(cards[i]) ? event.player : false) == "basic" && cards[i].original != "j") {
					return true;
				}
			}
			return false;
		},
		frequent: true,
		preHidden: true,
		async content(event, trigger, player) {
			if (trigger.delay == false) {
				game.delay();
			}
			const next = player.draw();
			next.gaintag.add("hb_shenxian");
			await next;
		},
		ai: {
			threaten: 1.5,
		},
	},

	// 枪舞：当你因"甚贤"的效果摸牌后，你可以弃置一张牌，然后下回合你使用【杀】的
	// 距离和基础次数各+1。跟官方版(出牌阶段限一次的判定技)完全不同的触发方式——
	// 这里是甚贤摸牌之后的连锁反应，弃牌是获得下回合增益的代价。
	qiangwu: {
		aiShowTag: "support",
		aiShowCost: true,
		trigger: { player: "gainAfter" },
		filter(event, player) {
			return !!(event.gaintag && event.gaintag.includes("hb_shenxian"));
		},
		async content(event, trigger, player) {
			const result = await player.chooseToDiscard("h", 1, true).set("prompt2", "是否弃置一张手牌，然后下回合你使用【杀】的距离和基础次数各+1？").forResult();
			if (!result.bool) {
				return;
			}
			player.addTempSkill("qiangwu_arm");
		},
		ai: {
			skillTagFilter(player) {
				if (!player.countCards("h")) {
					return false;
				}
			},
		},
	},
	// 内部标记技，不出现在武将技能栏：负责把"下回合"这个延迟效果落到实处。
	qiangwu_arm: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.removeSkill("qiangwu_arm");
			player.addTempSkill("qiangwu_buff", "phaseUseAfter");
		},
	},
	qiangwu_buff: {
		charlotte: true,
		mod: {
			targetInRange(card, player, target) {
				if (card.name == "sha" && get.distance(player, target) <= player.getAttackRange() + 1) {
					return true;
				}
			},
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return num + 1;
				}
			},
		},
	},

// ============ 张苞（std_zhangbao） ============
	// 角逐：锁定技，造成伤害后本回合【杀】无次数限制；受到伤害后视为对伤害来源使用一张【决斗】。
	stdjuezhu: {
		trigger: { player: "damageEnd", source: "damageSource" },
		filter(event, player, name) {
			if (name == "damageSource") {
				return true;
			}
			return event.source?.isIn() && player.canUse({ name: "juedou", isCard: true }, event.source);
		},
		forced: true,
		async content(event, trigger, player) {
			if (event.triggername == "damageSource") {
				player.addTempSkill("stdjuezhu_buff", "phaseAfter");
			} else {
				const card = { name: "juedou", isCard: true };
				if (player.canUse(card, trigger.source)) {
					await player.useCard(card, trigger.source);
				}
			}
		},
	},
	stdjuezhu_buff: {
		charlotte: true,
		mod: {
			cardUsable(card, player) {
				if (card.name == "sha") {
					return Infinity;
				}
			},
		},
	},
	// 承继：你可以将两张颜色不同的牌当【杀】使用或打出。
	stdchengji: {
		aiShowTag: "offense",
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard(card, player) {
			if (!ui.selected.cards.length) {
				return true;
			}
			return get.color(ui.selected.cards[0], player) != get.color(card, player);
		},
		position: "hes",
		selectCard: 2,
		viewAs: { name: "sha" },
		viewAsFilter(player) {
			if (player.countCards("hes") < 2) {
				return false;
			}
			const color = get.color(player.getCards("hes")[0], player);
			return player.getCards("hes").some(card => get.color(card, player) != color);
		},
		prompt: "将两张颜色不同的牌当【杀】使用或打出",
		check(card) {
			return 5 - get.value(card);
		},
		ai: {
			respondSha: true,
			skillTagFilter(player) {
				return player.countCards("hes") >= 2;
			},
		},
	},

	// ============ 刘琦（sp_liuqi） ============
	// 问计：出牌阶段开始时，你可以令一名其他角色交给你一张牌。若势力相同，本回合此牌你使用无距离/
	// 次数限制且不能被响应；若势力不同，你要交给其一张除此牌外的牌作为回礼。
	// 问计：出牌阶段开始时，你可以令一名其他角色交给你一张牌，然后你本回合首次使用与
	// 此牌类别相同的牌时，该牌对所有其他角色生效。照抄sp2包"刘琦"的同名技能实现。
	rewenji: {
		aiShowTag: "support",
		aiShowCost: true,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.countCards("he") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("rewenji"), (card, player, target) => target != player && target.countCards("he") > 0)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await target.chooseCard("he", true, `问计：交给${get.translation(player)}一张牌`).forResult();
			if (!result.bool || !result.cards || !result.cards.length) {
				return;
			}
			const card = result.cards[0];
			const sameGroup = target.isFriendOf(player);
			await target.give(card, player);
			if (sameGroup) {
				player.storage.rewenji_card = card;
				player.addTempSkill("rewenji_buff", "phaseUseAfter");
			} else if (player.countCards("he")) {
				const back = await player
					.chooseCard("he", true, `问计：交给${get.translation(target)}一张除此牌外的牌`, cardx => cardx != card)
					.forResult();
				if (back.bool && back.cards && back.cards.length) {
					await player.give(back.cards[0], target);
				}
			}
		},
	},
	rewenji_buff: {
		charlotte: true,
		mod: {
			targetInRange(card, player, target) {
				if (card === player.storage.rewenji_card) {
					return true;
				}
			},
			cardUsable(card, player) {
				if (card === player.storage.rewenji_card) {
					return Infinity;
				}
			},
		},
		ai: {
			norespond: true,
			skillTagFilter(player, tag, arg) {
				if (tag == "norespond") {
					return !!(arg && arg[0] === player.storage.rewenji_card);
				}
			},
		},
	},
	// 屯江：结束阶段，若你于出牌阶段内使用过牌且未指定过其他角色为目标，你可以摸X张牌（X为全场势力数）。
	sptunjiang: {
		aiShowTag: "draw",
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		filter(event, player) {
			const used = player.getHistory("useCard", evt => typeof evt.isPhaseUsing == "function" && evt.isPhaseUsing());
			if (!used.length) {
				return false;
			}
			return !used.some(evt => evt.targets && evt.targets.some(target => target != player));
		},
		async content(event, trigger, player) {
			await player.draw(game.countGroup());
		},
	},

	// ============ 彭羕（ol_pengyang） ============
	// 彭羕与国战双势力版本"gz_pengyang"一致，通令/近谀照抄"gztongling"/"gzjinyu"。
	tongling: {
		aiShowTag: "defense",
		audio: "daming",
		trigger: { source: "damageSource" },
		filter(event, player) {
			if (event.player.isFriendOf(player)) {
				return false;
			}
			return player.isPhaseUsing() && event.player.isIn() && !player.hasSkill("tongling_used");
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("tongling"), (card, player, target) => target.isFriendOf(player)).forResult();
		},
		async content(event, trigger, player) {
			const ally = event.targets[0];
			const victim = trigger.player;
			player.addTempSkill("tongling_used", "phaseUseAfter");
			player.line2([ally, victim]);
			const dealtBefore = victim.getHistory("sourceDamage").length;
			const result = await ally
				.chooseToUse(true, `通令：是否对${get.translation(victim)}使用一张牌？`)
				.set("targetRequired", true)
				.set("complexSelect", true)
				.set("complexTarget", true)
				.set("filterTarget", (card, player, target) => {
					if (target != victim && !ui.selected.targets.includes(victim)) {
						return false;
					}
					return lib.filter.targetEnabled(card, player, target);
				})
				.set("addCount", false)
				.forResult();
			if (!result || !result.bool) {
				return;
			}
			if (victim.isIn() && victim.getHistory("sourceDamage").length > dealtBefore) {
				await player.draw(2);
				await ally.draw(2);
			} else if (get.itemtype(trigger.cards) == "cards" && trigger.cards.filterInD().length && victim.isIn()) {
				await victim.gain(trigger.cards.filterInD(), "gain2");
			}
		},
	},
	jinxian: {
		aiShowTag: "control",
		audio: "xiaoni",
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			if (!event.toShow || !event.toShow.includes("jinxian")) {
				return false;
			}
			return game.hasPlayer(current => get.distance(player, current) <= 1);
		},
		forced: true,
		async content(event, trigger, player) {
			const targets = game.filterPlayer(current => get.distance(player, current) <= 1).sortBySeat(player);
			for (const target of targets) {
				if (!target.isIn()) {
					continue;
				}
				if (target.isUnseen(2)) {
					await target.chooseToDiscard(2, "he", true).forResult();
					continue;
				}
				const result = await target.chooseControl("主将", "副将").set("prompt", "近谀：请暗置一张武将牌").forResult();
				await target.hideCharacter(result.control == "主将" ? 0 : 1);
			}
		},
	},

	// ============ 夏侯霸（xiahouba） ============
	// 豹烈：锁定技，出牌阶段开始时，攻击范围内包含你的其他势力角色依次选择：弃一张牌并对你使用杀，
	// 或令你弃一张牌；你对体力值不小于你的其他角色使用【杀】无距离与次数限制。
	baolie: {
		trigger: { player: "phaseUseBegin" },
		forced: true,
		popup: false,
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.isEnemyOf(player) && get.distance(current, player) <= current.getAttackRange());
		},
		async content(event, trigger, player) {
			const targets = game.filterPlayer(current => current != player && current.isEnemyOf(player) && get.distance(current, player) <= current.getAttackRange());
			for (const target of targets) {
				if (!target.isIn()) {
					continue;
				}
				const result = await target.chooseControl(["弃牌杀", "令其弃牌"]).set("prompt", "豹烈：请选择一项").forResult();
				if (result.control == "弃牌杀") {
					if (target.countCards("he")) {
						await target.chooseToDiscard("he", 1, true).forResult();
					}
					if (target.canUse({ name: "sha", isCard: true }, player)) {
						await target.useCard({ name: "sha", isCard: true }, player, false);
					}
				} else if (player.countCards("he")) {
					await player.chooseToDiscard("he", 1, true).forResult();
				}
			}
		},
		mod: {
			targetInRange(card, player, target) {
				if (card.name == "sha" && target.hp >= player.hp) {
					return true;
				}
			},
			cardUsable(card, player) {
				if (card.name == "sha") {
					return Infinity;
				}
			},
		},
	},

	// ============ 傅士仁（hb_fushiren） ============
	// 锋势：使用牌指定唯一目标后，若其手牌数小于你，你可以弃你与其各一张牌，令此牌不可被响应且伤害+1；
	// 此牌造成伤害后本技能本回合失效。
	// 锋势：使用牌指定唯一目标后，若其手牌数小于你，你可以弃你与其各一张牌，令此牌不可被响应且伤害+1；
	// 此牌造成伤害后本技能本回合失效。
	fengshi: {
		aiShowTag: "offense",
		aiShowCost: true,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (player.hasSkill("fengshi_disabled")) {
				return false;
			}
			if (!event.targets || event.targets.length != 1) {
				return false;
			}
			const target = event.targets[0];
			return target.countCards("h") < player.countCards("h") && player.countCards("he") > 0 && target.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			const target = trigger.targets[0];
			event.result = await player
				.chooseBool(`锋势：是否弃置你与${get.translation(target)}各一张牌，令此牌不可被响应且伤害+1？`)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.targets[0];
			if (player.countCards("he")) {
				const selfResult = await player.chooseCard("he", true, "锋势：弃置一张牌").forResult();
				if (selfResult.bool && selfResult.cards && selfResult.cards.length) {
					await player.discard(selfResult.cards);
				}
			}
			if (target.isIn() && target.countCards("he")) {
				const targetResult = await target.chooseCard("he", true, "锋势：弃置一张牌").forResult();
				if (targetResult.bool && targetResult.cards && targetResult.cards.length) {
					await target.discard(targetResult.cards);
				}
			}
			player.storage.fengshi_card = trigger.card;
			player.addTempSkill("fengshi_buff");
		},
	},
	fengshi_buff: {
		charlotte: true,
		trigger: { global: "damageBegin1" },
		filter(event, player) {
			return !!event.card && event.card === player.storage.fengshi_card;
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			trigger.num++;
			player.removeSkill("fengshi_buff");
			player.addTempSkill("fengshi_disabled", "phaseAfter");
		},
		ai: {
			norespond: true,
			skillTagFilter(player, tag, arg) {
				if (tag == "norespond") {
					return !!(arg && arg[0] === player.storage.fengshi_card);
				}
			},
		},
	},
	fengshi_disabled: {
		charlotte: true,
	},

	// ============ 刘备（liubei） ============
	// 仁德：出牌阶段每名角色限一次，你可以将任意张手牌交给一名其他角色；本阶段以此法给出第二张牌时，
	// 你可以视为使用一张基本牌（简化为【无中生有】）。
	rende: {
		aiShowTag: "support",
		enable: "phaseUse",
		filterCard: true,
		selectCard: [1, Infinity],
		allowChooseAll: true,
		discard: false,
		lose: false,
		filterTarget(card, player, target) {
			return player != target && !(player.storage.rende_used || []).includes(target);
		},
		check(card) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const { target, cards } = event;
			await player.give(cards, target);
			if (!player.storage.rende_used) {
				player.storage.rende_used = [];
			}
			player.storage.rende_used.push(target);
			player.storage.rende_count = (player.storage.rende_count || 0) + 1;
			if (player.storage.rende_count == 2) {
				const result = await player.chooseBool("仁德：是否视为使用一张【无中生有】？").forResult();
				if (result.bool) {
					const useCard = { name: "wuzhongshengyou", isCard: true };
					if (player.canUse(useCard)) {
						await player.useCard(useCard);
					}
				}
			}
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					return get.attitude(player, target) > 0 ? 1 : -1;
				},
			},
		},
	},
	// 振鞘：锁定技，攻击范围+1；出牌阶段第一次使用【杀】指定目标后，若装备区无武器牌，此【杀】伤害+1。
	zhenqiao: {
		audio: 2,
		trigger: { player: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			return event.isFirstTarget && event.card.name == "sha" && player.hasEmptySlot(1);
		},
		async content(event, trigger, player) {
			trigger.getParent().effectCount++;
		},
		mod: {
			attackRange(player, num) {
				return num + 1;
			},
			aiOrder(player, card, num) {
				if (num > 0 && get.itemtype(card) === "card" && get.subtype(card) === "equip1" && !player.getEquip(1)) {
					return 0;
				}
			},
			aiValue(player, card, num) {
				if (num > 0 && get.itemtype(card) === "card" && get.subtype(card) === "equip1" && !player.getEquip(1)) {
					return 0.01 * num;
				}
			},
			aiUseful() {
				return lib.skill.zhenqiao.mod.aiValue.apply(this, arguments);
			},
		},
	},

	// ============ 关羽（guanyu） ============
	// 武魂：锁定技，杀死你的角色，本局游戏无法通过【桃】和【桃园结义】回复体力。
	wuhun: {
		trigger: { source: "dieAfter", global: "recoverBegin" },
		forced: true,
		popup: false,
		filter(event, player, name) {
			if (name == "recoverBegin") {
				if (!event.card || (event.card.name != "tao" && event.card.name != "taoyuanjieyi")) {
					return false;
				}
				return !!(event.player && event.player.storage.wuhun_marked);
			}
			return true;
		},
		async content(event, trigger, player) {
			if (event.triggername == "recoverBegin") {
				trigger.cancel();
			} else {
				trigger.player.storage.wuhun_marked = true;
			}
		},
	},
	// 武圣：可将一张红色牌当【杀】使用或打出；♦【杀】无距离限制。照抄国战原版"gz_wusheng"
	// （不含首将双将机制额外条款）。
	wusheng: {
		aiShowTag: "offense",
		group: ["wusheng_dmg"],
		enable: ["chooseToRespond", "chooseToUse"],
		filterCard(card, player) {
			return get.color(card, player) === "red";
		},
		position: "hes",
		viewAs: { name: "sha" },
		viewAsFilter(player) {
			return player.hasCards("hes", { color: "red" });
		},
		prompt: "将一张红色牌当【杀】使用或打出",
		check(card) {
			const val = get.value(card);
			if (get.event().name === "chooseToRespond") {
				return 1 / Math.max(0.1, val);
			}
			return 5 - val;
		},
		mod: {
			targetInRange(card, player, target) {
				if (card.name == "sha" && get.suit(card, player) == "diamond") {
					return true;
				}
			},
		},
		ai: {
			respondSha: true,
			skillTagFilter(player) {
				return player.hasCards("hes", { color: "red" });
			},
		},
	},
	wusheng_dmg: {
		charlotte: true,
		trigger: { source: "damageBegin1" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.card && event.card.name == "sha" && get.suit(event.card, player) == "heart" && event.player && event.player.isTurnedOver();
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	},
	// 义绝：每回合限一次，你可以弃一张牌，然后令一名其他角色展示一张牌：黑色则将其武将牌翻面；
	// 红色则你获得之。
	yijue: {
		aiShowTag: "offense",
		aiShowCost: true,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		selectCard: 1,
		discard: true,
		lose: true,
		filterTarget(card, player, target) {
			return player != target;
		},
		check(card) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (!target.isIn() || !target.countCards("h")) {
				return;
			}
			const result = await target.chooseCard("h", true, "义绝：展示一张手牌").forResult();
			if (!result.bool || !result.cards || !result.cards.length) {
				return;
			}
			const card = result.cards[0];
			target.showCards([card], `${get.translation(target)}展示的牌`);
			if (get.color(card, target) == "black") {
				target.turnOver();
			} else if (get.color(card, target) == "red") {
				await player.gain(card, target, "give");
			}
		},
		ai: {
			order: 4,
			result: {
				target(player, target) {
					return get.attitude(player, target) > 0 ? -1 : 1;
				},
			},
		},
	},

	// ============ 张飞（zhangfei） ============
	// 咆哮：锁定技，【杀】不限次数；本回合第一张【杀】被抵消后，下一次【杀】伤害+1；每回合第二张
	// 【杀】使用时摸一张牌。
	paoxiao: {
		trigger: { player: ["shaAfter", "useCard1"] },
		forced: true,
		popup: false,
		filter(event, player, name) {
			if (name == "shaAfter") {
				return !!event.cancelled && !player.storage.paoxiao_boost;
			}
			return event.card && event.card.name == "sha";
		},
		async content(event, trigger, player) {
			if (event.triggername == "shaAfter") {
				player.storage.paoxiao_boost = true;
			} else {
				const count = player.storage.paoxiao_count = (player.storage.paoxiao_count || 0) + 1;
				if (count == 2) {
					await player.draw();
				}
			}
		},
		mod: {
			cardUsable(card, player) {
				if (card.name == "sha") {
					return Infinity;
				}
			},
		},
	},
	paoxiao_dmg: {
		charlotte: true,
		trigger: { source: "damageBegin1" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!player.storage.paoxiao_boost && event.card && event.card.name == "sha";
		},
		async content(event, trigger, player) {
			trigger.num++;
			player.storage.paoxiao_boost = false;
			player.storage.paoxiao_used_boost = true;
		},
	},
	paoxiao_reset: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		popup: false,
		filter(event, player) {
			return player.storage.paoxiao_count || player.storage.paoxiao_boost || player.storage.paoxiao_used_boost;
		},
		async content(event, trigger, player) {
			player.storage.paoxiao_count = 0;
			player.storage.paoxiao_boost = false;
			player.storage.paoxiao_used_boost = false;
		},
	},

	// ============ 诸葛亮（zhugeliang） ============
	// 观星：准备阶段，你可以观看牌堆顶的X张牌，并将其以任意顺序置于牌堆顶或牌堆底
	// （X为存活角色数且至多为5）。照抄标准包同名技能。
	wentian: {
		aiShowTag: "draw",
		group: ["wentian_reset"],
		usable: 1,
		trigger: { player: ["phaseZhunbeiBegin", "phaseJudgeBegin", "phaseDrawBegin", "phaseUseBegin", "phaseDiscardBegin", "phaseJieshuBegin"] },
		filter(event, player) {
			return !player.storage.wentian_off;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wentian")).forResult();
		},
		async content(event, trigger, player) {
			const num = Math.min(5, game.countPlayer(current => current.isIn()));
			if (num > 0) {
				await player
					.chooseToGuanxing(num)
					.set("prompt", "问天：观看牌堆顶的牌，将其以任意顺序置于牌堆顶或牌堆底")
					.forResult();
			}
			const result = await player.draw(1).forResult();
			const card = result && result.cards && result.cards[0];
			if (!card) {
				return;
			}
			const color = get.color(card, player);
			if (color != "black" && color != "red") {
				player.storage.wentian_off = true;
				return;
			}
			const asName = color == "black" ? "wuxie" : "huogong";
			const use = await player.chooseBool(`问天：是否将摸到的牌当【${get.translation(asName)}】使用？`).forResult();
			if (use.bool && player.getCards("h").includes(card)) {
				await player.chooseToUse({
					filterCard: cardx => cardx === card,
					viewAs: { name: asName },
				});
			}
		},
	},
	wentian_reset: {
		charlotte: true,
		trigger: { player: "roundStart" },
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			player.storage.wentian_off = false;
		},
	},
	// 空城：锁定技，你没有手牌时不能成为【杀】/【决斗】的目标；你的回合外其他角色交给你的牌先置于
	// 你的武将牌上，摸牌阶段开始时你获得这些牌。
	kongcheng: {
		group: ["kongcheng_draw"],
		mod: {
			targetEnabled(card, player, target) {
				if (!target.hasCards("h") && (card.name === "sha" || card.name === "juedou")) {
					return false;
				}
			},
		},
		trigger: { player: "gainAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			if (_status.currentPhase === player) {
				return false;
			}
			if (!event.giver || event.giver == player) {
				return false;
			}
			return player.getCards("h").some(card => event.cards.includes(card));
		},
		async content(event, trigger, player) {
			const cards = trigger.cards.filter(card => player.getCards("h").includes(card));
			if (!cards.length) {
				return;
			}
			await player.addToExpansion({ cards, animate: "gain2", gaintag: ["kongcheng"] });
		},
		intro: { content: "expansion", markcount: "expansion" },
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile({ cards });
			}
		},
	},
	kongcheng_draw: {
		charlotte: true,
		trigger: { player: "phaseDrawBegin" },
		forced: true,
		popup: false,
		filter(event, player) {
			return player.countExpansions("kongcheng") > 0;
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions("kongcheng");
			await player.gain(cards, "gain2");
		},
	},

	// ============ 赵云（zhaoyun） ============
	// 龙胆：可将一张【闪】当【杀】、【杀】当【闪】使用或打出；此法使用的【杀】被闪抵消时可对
	// 另一名角色造成1点伤害；此法使用的【闪】抵消了一张【杀】时可令另一名其他角色回复1点体力。
	longdan: {
		group: ["longdan_sha", "longdan_shan", "longdan_counter", "longdan_relief"],
	},
	longdan_sha: {
		aiShowTag: "offense",
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard: { name: "shan" },
		viewAs: { name: "sha" },
		viewAsFilter(player) {
			return player.hasCards("hs", "shan");
		},
		position: "hs",
		prompt: "将一张闪当杀使用或打出",
		check() {
			return 1;
		},
		ai: {
			respondSha: true,
			skillTagFilter(player) {
				return player.hasCards("hs", "shan");
			},
			order() {
				return get.order({ name: "sha" }) + 0.1;
			},
		},
	},
	longdan_shan: {
		aiShowTag: "support",
		enable: ["chooseToRespond", "chooseToUse"],
		filterCard: { name: "sha" },
		viewAs: { name: "shan" },
		prompt: "将一张杀当闪使用或打出",
		position: "hs",
		viewAsFilter(player) {
			return player.hasCards("hs", "sha");
		},
		ai: {
			respondShan: true,
			skillTagFilter(player) {
				return player.hasCards("hs", "sha");
			},
		},
	},
	longdan_counter: {
		aiShowTag: "support",
		charlotte: true,
		trigger: { source: "shaAfter" },
		filter(event, player) {
			return !!event.cancelled && event.skill === "longdan_sha" && game.hasPlayer(current => current != player && current != event.player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("longdan_counter"), (card, player, target) => target != player && target != trigger.player)
				.forResult();
		},
		async content(event, trigger, player) {
			if (event.targets && event.targets[0]) {
				await event.targets[0].damage();
			}
		},
	},
	longdan_relief: {
		aiShowTag: "defense",
		charlotte: true,
		trigger: { player: "shaAfter" },
		filter(event, player) {
			if (!event.cancelled) {
				return false;
			}
			if (!player.getHistory("respond", evt => evt.skill === "longdan_shan" && evt.getParent() === event).length) {
				return false;
			}
			return game.hasPlayer(current => current != player && current != event.source && current.isDamaged());
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("longdan_relief"), (card, player, target) => target != player && target != trigger.source && target.isDamaged())
				.forResult();
		},
		async content(event, trigger, player) {
			if (event.targets && event.targets[0]) {
				await event.targets[0].recover();
			}
		},
	},
	// 冲阵：当你发动"龙胆"时，你可以弃置对方的一张手牌。
	chongzhen: {
		aiShowTag: "support",
		trigger: { player: ["useCard", "respond"] },
		filter(event, player) {
			if (!["longdan_sha", "longdan_shan"].includes(event.skill)) {
				return false;
			}
			const opponent = event.name == "useCard" ? event.target || (event.targets && event.targets[0]) : event.getParent()?.player;
			return !!opponent && opponent != player && opponent.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("chongzhen")).forResult();
		},
		async content(event, trigger, player) {
			const opponent = trigger.name == "useCard" ? trigger.target || (trigger.targets && trigger.targets[0]) : trigger.getParent()?.player;
			if (opponent && opponent.isIn() && opponent.countCards("h")) {
				await player.discardPlayerCard(opponent, "h", true);
			}
		},
	},

// ============ 马超 ============
	// 马术：锁定技，你与其他角色的距离-1。（与官方版一致）
	mashu: {
		mod: {
			globalFrom(from, to, distance) {
				return distance - 1;
			},
		},
	},

	// 追命：当你使用【杀】指定唯一目标时，你可以使其一张武将牌的非锁定技失效，
	// 然后声明一种颜色并令目标角色弃置任意张牌，然后你展示其一张牌，
	// 若此牌颜色与你声明的相同，则你选择一项，此【杀】：不能被响应/伤害+1/不计入次数限制。
	zhuiming: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "useCardToTargeted" },
		logTarget: "target",
		filter(event, player) {
			return event.card.name == "sha" && event.isFirstTarget && event.targets.length == 1 && event.target.isIn();
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("追命：是否发动？").set("prompt2", `令${get.translation(trigger.target)}的一项非锁定技失效，然后声明一种颜色并令其弃牌`).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			if (!target.isIn()) {
				return;
			}
			const undisabledSkill = target.getSkills(null, false);
			const skillChoice = await player
				.chooseSkill(target, {
					prompt: "追命：是否令其一项非锁定技失效？",
					forced: false,
					func: (info, skill) => !info.charlotte && !get.is.locked(skill, target) && undisabledSkill.includes(skill),
				})
				.forResult();
			if (skillChoice && skillChoice.bool && skillChoice.skill) {
				target.disableSkill("zhuiming_" + player.playerid, skillChoice.skill);
				player.logSkill("zhuiming", target);
			}
			const colorResult = await player.chooseControl(["red", "black"]).set("prompt", "追命：声明一种颜色").forResult();
			const color = colorResult.control;
			player.popup(get.translation(color), color == "red" ? "fire" : "thunder");
			game.log(player, "声明了", "#y" + get.translation(color));
			if (!target.countCards("he")) {
				return;
			}
			await target
				.chooseToDiscard("he", true, [1, Infinity])
				.set("prompt", "追命：请弃置任意张牌")
				.set("prompt2", `然后你将展示${get.translation(player)}一张牌，若颜色为${get.translation(color)}，则此【杀】可获得额外效果`)
				.forResult();
			if (!target.countCards("he")) {
				return;
			}
			const cardResult = await player.choosePlayerCard(target, "he", true).forResult();
			if (!cardResult || !cardResult.cards || !cardResult.cards.length) {
				return;
			}
			const card = cardResult.cards[0];
			player.showCards(card, `${get.translation(target)}因【追命】被展示`);
			if (get.color(card) != color) {
				return;
			}
			const bonus = await player
				.chooseControl(["不能被响应", "伤害+1", "不计入次数限制"], "cancel2")
				.set("prompt", "追命：此【杀】颜色猜中，请选择获得的效果")
				.forResult();
			if (!bonus || bonus.control == "cancel2") {
				return;
			}
			const shaEvent = trigger.getParent();
			if (bonus.control == "不能被响应") {
				trigger.directHit.add(target);
			} else if (bonus.control == "伤害+1") {
				const map = shaEvent.customArgs;
				const id = target.playerid;
				if (!map[id]) {
					map[id] = {};
				}
				map[id].extraDamage = (map[id].extraDamage || 0) + 1;
			} else if (bonus.control == "不计入次数限制") {
				if (shaEvent.addCount !== false) {
					shaEvent.addCount = false;
					const stat = player.getStat().card;
					if (typeof stat[trigger.card.name] == "number") {
						stat[trigger.card.name]--;
					}
				}
			}
		},
		ai: {
			threaten: 1.5,
		},
	},

	// ============ 黄月英 ============
	// 集智：当你使用非转化锦囊牌时，你可以摸一张牌。若此牌是基本牌，你可以弃置此牌然后本回合手牌上限+1。
	jizhi: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "useCard" },
		frequent: true,
		preHidden: true,
		filter(event, player) {
			return get.type(event.card) == "trick";
		},
		async content(event, trigger, player) {
			const cards = (await player.draw().forResult()).cards;
			const card = cards && cards[0];
			if (card && get.type(card) == "basic" && player.getCards("h").includes(card)) {
				const result = await player.chooseBool("集智：是否弃置摸到的" + get.translation(card) + "，然后本回合手牌上限+1？").forResult();
				if (result && result.bool) {
					await player.discard([card]);
					player.storage.jizhi_buff = (player.storage.jizhi_buff || 0) + 1;
					player.addTempSkill("jizhi_buff", "phaseAfter");
				}
			}
		},
		ai: {
			threaten: 1.3,
			noautowuxie: true,
		},
	},
	jizhi_buff: {
		charlotte: true,
		onremove: "storage",
		mod: {
			maxHandcard(player, num) {
				return num + (player.storage.jizhi_buff || 0);
			},
		},
	},

	// 奇才：锁定技，你使用锦囊牌无距离限制，其他角色不能弃置你装备区里的防具牌与宝物牌。
	qicai: {
		mod: {
			targetInRange(card, player, target, now) {
				if (["trick", "delay"].includes(get.type(card))) {
					return true;
				}
			},
			canBeDiscarded(card, player, target) {
				if (get.position(card) == "e" && get.subtypes(card).some(subtype => ["equip2", "equip5"].includes(subtype)) && player != target) {
					return false;
				}
			},
		},
	},

	// ============ 黄忠 ============
	// 烈弓：你使用【杀】可以选择距离不大于此【杀】点数的角色为目标。当你使用【杀】指定目标后，
	// 你可以执行以下效果：1.若其手牌数小于等于你，其不能抵消此【杀】；2.若其体力值大于等于你，此【杀】伤害值+1。
	xinliegong: {
		audio: "liegong",
		trigger: { player: "useCardToTargeted" },
		logTarget: "target",
		forced: true,
		mod: {
			targetInRange(card, player, target) {
				if (card.name == "sha" && typeof get.number(card) == "number" && get.distance(player, target) <= get.number(card)) {
					return true;
				}
			},
		},
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			if (event.target.countCards("h") <= player.countCards("h")) {
				return true;
			}
			if (event.target.hp >= player.hp) {
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			if (trigger.target.countCards("h") <= player.countCards("h")) {
				trigger.getParent().directHit.add(trigger.target);
			}
			if (trigger.target.hp >= player.hp) {
				const map = trigger.getParent().customArgs;
				const id = trigger.target.playerid;
				if (!map[id]) {
					map[id] = {};
				}
				map[id].extraDamage = (map[id].extraDamage || 0) + 1;
			}
		},
		ai: {
			threaten: 0.6,
		},
	},

	// 摧锋：限定技，出牌阶段，你可以失去一点体力视为使用一张无距离限制的单目标伤害牌，
	// 此回合结束时，若此牌的目标于此回合受到的伤害值不为1，你重置此技能。
	// 摧锋：限定技，出牌阶段，你可以失去一点体力，视为使用一张无距离限制的单目标伤害牌，
	// 此回合结束时，若此牌的目标于此回合受到的伤害值不为1，你重置此技能。照抄集换包
	// "合曹芳"旁支jsrg_huangzhong的同名技能"jsrgcuifeng"的选牌/判定结构，在此基础上
	// 加上"失去1点体力"的代价（原版免费发动）。
	cuifeng: {
		aiShowTag: "support",
		limited: true,
		audio: "jsrgcuifeng",
		skillAnimation: true,
		animationColor: "orange",
		enable: "phaseUse",
		filter(event, player) {
			return player.hp > 1;
		},
		chooseButton: {
			dialog(event, player) {
				const list = [];
				for (const name of lib.inpile) {
					const info = lib.card[name];
					if (!info || info.notarget || (info.selectTarget && info.selectTarget != 1) || !get.tag({ name: name }, "damage")) {
						continue;
					}
					if (name == "sha") {
						list.push(["基本", "", "sha"]);
						for (const nature of lib.inpile_nature) {
							list.push(["基本", "", name, nature]);
						}
					} else if (get.type(name) == "trick") {
						list.push(["锦囊", "", name]);
					} else if (get.type(name) == "basic") {
						list.push(["基本", "", name]);
					}
				}
				return ui.create.dialog("摧锋", [list, "vcard"]);
			},
			filter(button, player) {
				return _status.event
					.getParent()
					.filterCard({ name: button.link[2], nature: button.link[3], isCard: true, storage: { cuifeng: true } }, player, _status.event.getParent());
			},
			check(button) {
				const player = _status.event.player;
				const effect = player.getUseValue({ name: button.link[2], nature: button.link[3], storage: { cuifeng: true } });
				return effect > 0 ? effect : 0;
			},
			backup(links, player) {
				return {
					audio: "jsrgcuifeng",
					selectCard: -1,
					filterCard: () => false,
					popname: true,
					viewAs: { name: links[0][2], nature: links[0][3], isCard: true, storage: { cuifeng: true } },
					log: false,
					async precontent(event, trigger, player) {
						player.logSkill("cuifeng");
						player.awakenSkill("cuifeng");
						await player.loseHp();
						const targets = event.result.targets;
						if (!player.storage.cuifeng_check) {
							player.when("phaseEnd").step(async (event, trigger, player) => {
								let num = 0;
								targets.forEach(target => {
									target.checkHistory("damage", evt => (num += evt.num));
								});
								if (num !== 1) {
									player.refreshSkill();
								}
								delete player.storage.cuifeng_check;
							});
						}
						player.setStorage("cuifeng_check", true);
					},
				};
			},
			prompt(links, player) {
				return "请选择" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "的目标";
			},
		},
		mod: {
			targetInRange(card) {
				if (card.storage?.cuifeng) {
					return true;
				}
			},
		},
		ai: {
			order: 1.9,
			result: { player: 1 },
		},
	},

	// ============ 魏延 ============
	// 狂骨：当你对距离1以内的角色造成1点伤害后，你可以回复1点体力或摸一张牌。
	xinkuanggu: {
		aiShowTag: "support",
		audio: "kuanggu",
		trigger: { source: "damageSource" },
		filter(event, player) {
			return event.num > 0 && event.player.isIn() && get.distance(player, event.player) <= 1;
		},
		async content(event, trigger, player) {
			await player.chooseDrawRecover("狂骨：摸一张牌或回复1点体力").forResult();
		},
		ai: {
			threaten: 1.2,
		},
	},

	// 骛肆：出牌阶段限一次，当你对一名其他角色造成伤害后，本阶段内，你与其的距离视为1。
	wusi: {
		aiShowTag: "support",
		audio: 2,
		trigger: { source: "damageSource" },
		frequent: true,
		filter(event, player) {
			return !player.getStat().skill.wusi && event.player != player && event.player.isIn();
		},
		async content(event, trigger, player) {
			player.storage.wusi_effect = (player.storage.wusi_effect || []).concat(trigger.player.playerid);
			player.addTempSkill("wusi_effect", "phaseUseAfter");
		},
	},
	wusi_effect: {
		charlotte: true,
		onremove: "storage",
		mod: {
			globalFrom(from, to, distance) {
				if (Array.isArray(from.storage.wusi_effect) && from.storage.wusi_effect.includes(to.playerid)) {
					return 1;
				}
			},
		},
	},

	// ============ 庞统 ============
	// 连环：你可以将一张♣手牌当【铁索连环】使用或重铸。你使用【铁索连环】可以指定至多四个目标。
	lianhuan: {
		aiShowTag: "support",
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		viewAs: { name: "tiesuo" },
		viewAsFilter(player) {
			if (!player.countCards("hs", card => get.suit(card) == "club")) {
				return false;
			}
		},
		filterCard(card) {
			return get.suit(card) == "club";
		},
		position: "hs",
		mod: {
			selectTarget(card, player, range) {
				if (card.name == "tiesuo" && Array.isArray(range)) {
					return [range[0], 4];
				}
			},
		},
	},

	// 涅槃：限定技，当你处于濒死状态时，你可以弃置你区域里的所有牌，摸X张牌，体力回复至X点，
	// 并复原你的武将牌。(X为你的体力上限)
	oldniepan: {
		aiShowTag: "draw",
		audio: "niepan",
		enable: "chooseToUse",
		skillAnimation: true,
		limited: true,
		animationColor: "orange",
		filter(event, player) {
			return event.type == "dying" && player == event.dying;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const x = player.maxHp;
			await player.discard(player.getCards("hej"));
			await player.link(false);
			await player.turnOver(false);
			await player.draw(x);
			if (player.hp < x) {
				await player.recover(x - player.hp);
			}
		},
		ai: {
			order: 1,
			skillTagFilter(player, arg, target) {
				if (player != target || player.storage.oldniepan) {
					return false;
				}
			},
			save: true,
			result: {
				player(player) {
					if (player.hp <= 0) {
						return 10;
					}
					return 0;
				},
			},
		},
	},

	// ============ 姜维 ============
	// 挑衅：出牌阶段限一次，你可以令一名攻击范围内有你的其他角色选择一项：
	// 1.弃置一张手牌并对你使用一张【杀】；2.你弃置其一张牌。
	tiaoxin: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.inRange(player) && target.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			const target = event.target;
			let attempted = false;
			if (target.countCards("h") > 0) {
				const result = await target
					.chooseToDiscard("h", true)
					.set("prompt", "挑衅：你可以弃置一张手牌，然后对" + get.translation(player) + "使用一张【杀】，否则" + get.translation(player) + "将弃置你一张牌")
					.forResult();
				attempted = !!(result && result.bool);
			}
			if (attempted) {
				const result2 = await target
					.chooseToUse(function (card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					}, "挑衅：对" + get.translation(player) + "使用一张【杀】")
					.set("complexSelect", true)
					.set("complexTarget", true)
					.set("filterTarget", function (card, plyr, tgt) {
						if (tgt != _status.event.sourcex) {
							return false;
						}
						return lib.filter.filterTarget.apply(this, arguments);
					})
					.set("sourcex", player)
					.forResult();
				if ((!result2 || !result2.bool) && target.countCards("he")) {
					player.discardPlayerCard(target, "he", true);
				}
			} else if (target.countCards("he")) {
				player.discardPlayerCard(target, "he", true);
			}
		},
		ai: {
			order: 4,
			expose: 0.2,
			result: {
				target: -1,
			},
			threaten: 1.1,
		},
	},

	// 遗志：每轮限一次，一名同势力角色的准备阶段开始时，你可以发动"观星"，其本回合视为拥有"看破"。
	yizhi: {
		aiShowTag: "support",
		audio: 2,
		round: 1,
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return event.player != player && event.player.isIn() && event.player.isFriendOf(player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("遗志：是否发动“观星”，令" + get.translation(trigger.player) + "本回合视为拥有“看破”？").forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const num = Math.min(5, game.countPlayer(current => current.isIn()));
			if (num > 0) {
				await player.chooseToGuanxing(num).set("prompt", "观星：点击或拖动将牌移动到牌堆顶或牌堆底").forResult();
			}
			if (target.isIn()) {
				target.addTempSkill("kanpo", "phaseAfter");
				target.popup("看破");
			}
		},
		ai: {
			threaten: 1.2,
		},
	},

	// ============ 刘禅 ============
	// 放权：你可以跳过出牌阶段，然后本回合结束时，你可以弃置一张手牌或者使用一张非伤害类牌，
	// 令一名其他角色执行一个额外的回合。
	fangquan: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseUseBefore" },
		preHidden: true,
		filter(event, player) {
			return !player.hasSkill("fangquan3");
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("放权：是否跳过出牌阶段？").forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.addTempSkill("fangquan2");
		},
	},
	fangquan2: {
		aiShowTag: "control",
		aiShowCost: true,
		trigger: { player: "phaseEnd" },
		locked: true,
		log: false,
		audio: false,
		onremove: true,
		sourceSkill: "fangquan",
		async cost(event, trigger, player) {
			let bool = false;
			if (player.countCards("h") > 0) {
				const result = await player.chooseToDiscard("放权：是否弃置一张手牌，令一名其他角色进行一个额外回合？").forResult();
				bool = !!(result && result.bool);
			}
			if (!bool) {
				const result = await player
					.chooseToUse(function (card, player, event) {
						if (get.tag(card, "damage")) {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					}, "放权：是否使用一张非伤害类牌，令一名其他角色进行一个额外回合？")
					.forResult();
				bool = !!(result && result.bool);
			}
			if (!bool) {
				event.result = { bool: false };
				return;
			}
			event.result = await player.chooseTarget(true, "放权：请选择进行额外回合的目标角色", lib.filter.notMe).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets && event.targets[0];
			if (!target) {
				return;
			}
			target.markSkillCharacter("fangquan", player, "放权", "进行一个额外回合");
			target.insertPhase();
			target.addSkill("fangquan3");
		},
	},
	fangquan3: {
		trigger: { player: ["phaseAfter", "phaseCancelled"] },
		forced: true,
		popup: false,
		audio: false,
		sourceSkill: "fangquan",
		async content(event, trigger, player) {
			player.removeSkill("fangquan3");
		},
	},

	// 享乐：锁定技，当你成为一名角色使用【杀】的目标后，该角色选择一项：1.弃置一张基本牌；2.令此【杀】对你无效。
	xiangle: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return event.card.name == "sha";
		},
		async content(event, trigger, player) {
			const result = await trigger.player
				.chooseToDiscard("享乐：弃置一张基本牌，否则【杀】对" + get.translation(player) + "无效", function (card) {
					return get.type(card) == "basic";
				})
				.forResult();
			if (!result || !result.bool) {
				trigger.getParent().excluded.add(player);
			}
		},
	},

	// ============ 孟获 ============
	// 祸首：锁定技，【南蛮入侵】对你无效；当其他角色使用【南蛮入侵】指定目标后，你代替其成为此牌的伤害来源。
	huoshou: {
		locked: true,
		group: ["huoshou1", "huoshou2"],
		preHidden: ["huoshou1", "huoshou2"],
	},
	huoshou1: {
		audio: 2,
		trigger: { target: "useCardToBefore" },
		forced: true,
		priority: 15,
		sourceSkill: "huoshou",
		filter(event, player) {
			return event.card.name == "nanman";
		},
		async content(event, trigger, player) {
			trigger.cancel();
		},
	},
	huoshou2: {
		audio: 2,
		trigger: { global: "useCard" },
		forced: true,
		sourceSkill: "huoshou",
		filter(event, player) {
			return event.card && event.card.name == "nanman" && event.player != player;
		},
		async content(event, trigger, player) {
			trigger.customArgs.default.customSource = player;
		},
	},

	// 再起：弃牌阶段结束时，你可以令至多X名与你势力相同的角色各选择一项：
	// 1.摸一张牌；2.令你回复1点体力（X为本回合置入弃牌堆的红色牌数）。
	zaiqixx: {
		aiShowTag: "draw",
		audio: "zaiqi",
		group: ["zaiqixx_tracker"],
		preHidden: ["zaiqixx_tracker"],
		trigger: { player: "phaseDiscardEnd" },
		filter(event, player) {
			return (player.storage.zaiqixx_count || 0) > 0;
		},
		async content(event, trigger, player) {
			const x = player.storage.zaiqixx_count || 0;
			const candidates = game.filterPlayer(current => current.isFriendOf(player));
			if (!candidates.length) {
				return;
			}
			const result = await player
				.chooseTarget([0, Math.min(x, candidates.length)], (card, plyr, target) => target.isFriendOf(player), "再起：请选择至多" + x + "名与你势力相同的角色")
				.forResult();
			const targets = (result && result.targets) || [];
			for (const target of targets) {
				if (!target.isIn()) {
					continue;
				}
				const choice = await target
					.chooseControl(["draw", "recover"])
					.set("prompt", "再起")
					.set("prompt2", "1.摸一张牌；2.令" + get.translation(player) + "回复1点体力")
					.forResult();
				if (choice.control == "recover") {
					await player.recover();
				} else {
					await target.draw();
				}
			}
		},
	},
	zaiqixx_tracker: {
		charlotte: true,
		init(player) {
			player.storage.zaiqixx_count = 0;
		},
		trigger: { global: ["phaseBegin", "loseAfter", "loseAsyncAfter"] },
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			if (trigger.name == "phaseBegin") {
				player.storage.zaiqixx_count = 0;
				return;
			}
			const cards = trigger.cards2 || trigger.cards || [];
			let num = 0;
			for (const card of cards) {
				if (get.position(card) == "d" && get.color(card) == "red") {
					num++;
				}
			}
			if (num) {
				player.storage.zaiqixx_count = (player.storage.zaiqixx_count || 0) + num;
			}
		},
	},

	// ============ 祝融 ============
	// 巨象：锁定技，【南蛮入侵】对你无效；其他角色使用的【南蛮入侵】结算结束后，你获得之。
	juxiang: {
		locked: true,
		group: ["juxiang1", "juxiang2"],
		preHidden: ["juxiang1", "juxiang2"],
	},
	juxiang1: {
		audio: 2,
		trigger: { target: "useCardToBefore" },
		forced: true,
		priority: 15,
		sourceSkill: "juxiang",
		filter(event, player) {
			return event.card.name == "nanman";
		},
		async content(event, trigger, player) {
			trigger.cancel();
		},
	},
	juxiang2: {
		audio: 2,
		trigger: { global: "useCardAfter" },
		forced: true,
		sourceSkill: "juxiang",
		filter(event, player) {
			return event.card.name == "nanman" && event.player != player && event.cards.someInD();
		},
		async content(event, trigger, player) {
			await player.gain(trigger.cards.filterInD(), "gain2");
		},
	},

	// 烈刃：当你使用【杀】指定一个目标后，你可以与其拼点，若你赢，你获得其一张牌；
	// 若你没赢，你获得其拼点的牌，其获得你拼点的牌。
	lieren: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "useCardToTargeted" },
		filter(event, player) {
			return event.card.name == "sha" && event.target.isIn() && player.canCompare(event.target);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("烈刃：是否与" + get.translation(trigger.target) + "拼点？").forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			const result = await player.chooseToCompare(target).forResult();
			if (result.bool) {
				if (target.countGainableCards(player, "he")) {
					await player.gainPlayerCard(target, true, "he");
				}
			} else {
				const myCard = result.card1;
				const targetCard = result.card2;
				if (targetCard) {
					await player.gain(targetCard, "gain2");
				}
				if (myCard) {
					await target.gain(myCard, "gain2");
				}
			}
		},
	},

	// ============ 甘夫人 ============
	// 神智：准备阶段，你可以选择一名角色，弃置其一个区域中的最后一张牌或你的所有手牌，然后其回复1点体力。
	shenzhi: {
		aiShowTag: "recover",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(true, "神智：请选择一名角色", lib.filter.all).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets && event.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			const zones = ["h", "e", "j"].filter(pos => target.countCards(pos) == 1);
			const options = [];
			if (zones.length) {
				options.push("target");
			}
			options.push("self");
			const choice = await player
				.chooseControl(options, "cancel2")
				.set("prompt", "神智：请选择弃牌方式")
				.set("prompt2", "1.弃置" + get.translation(target) + "一个区域中的最后一张牌；2.弃置你的所有手牌")
				.forResult();
			if (!choice || choice.control == "cancel2") {
				return;
			}
			if (choice.control == "target" && zones.length) {
				await player.discardPlayerCard(target, zones[0], true);
			} else if (player.countCards("h")) {
				await player.discard(player.getCards("h"));
			}
			if (target.isIn()) {
				await target.recover();
			}
		},
	},

	// 淑慎：每回合各限一次，当你回复1点体力后，你可以令一名其他角色摸两张牌；
	// 当你一次性获得至少两张牌后，你可以令一名其他角色回复1点体力。
	stdshushen: {
		locked: true,
		group: ["stdshushen1", "stdshushen2"],
		preHidden: ["stdshushen1", "stdshushen2"],
	},
	stdshushen1: {
		aiShowTag: "draw",
		audio: "shushen",
		trigger: { player: "recoverEnd" },
		sourceSkill: "stdshushen",
		filter(event, player) {
			return !player.getStat().skill.stdshushen1;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(true, "淑慎：是否令一名其他角色摸两张牌？", lib.filter.notMe).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets && event.targets[0];
			if (target && target.isIn()) {
				await target.draw(2);
			}
		},
	},
	stdshushen2: {
		aiShowTag: "recover",
		audio: "shushen",
		trigger: { player: "gainAfter" },
		sourceSkill: "stdshushen",
		filter(event, player) {
			return !player.getStat().skill.stdshushen2 && Array.isArray(event.cards) && event.cards.length >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(true, "淑慎：是否令一名其他角色回复1点体力？", lib.filter.notMe).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets && event.targets[0];
			if (target && target.isIn()) {
				await target.recover();
			}
		},
	},

// ============ 徐庶 xin_xushu ============
	// 无言：锁定技，你使用锦囊牌造成伤害时，或你受到锦囊牌的伤害时，防止之。
	xinwuyan: {
		audio: 2,
		trigger: { source: "damageBegin2", player: "damageBegin4" },
		forced: true,
		filter(event, player) {
			return get.type(event.card, "trick") == "trick";
		},
		check(event, player) {
			return player == event.player;
		},
		async content(event, trigger, player) {
			trigger.cancel();
		},
	},
	// 举荐：限定技，准备阶段，你可以选择一名其他角色，将此武将牌与其对应位置的一张武将牌交换。
	xinjujian: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		filter(event, player) {
			return game.hasPlayer(target => target != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("xinjujian"),
					filterTarget(card, player, target) {
						return target != player;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.awakenSkill(event.name);
			const num1 = player.name1 == "xin_xushu" ? 1 : 2;
			await player.transCharacter(target, num1);
		},
	},

	// ============ 蒋琬&费祎 hb_jiangwanfeiyi ============
	// 生息：弃牌阶段结束时，若你未于此回合内造成过伤害，你可以摸两张牌。
	shengxi: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "phaseDiscardEnd" },
		filter(event, player) {
			return !player.getHistory("sourceDamage").length;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("shengxi")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
	},
	// 守成：当一名与你势力相同的角色于其回合外失去最后的手牌后，你可以令该角色摸一张牌。
	shoucheng: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (event.player == player || !event.player.isFriendOf(player)) {
				return false;
			}
			if (event.player.countCards("h") > 0) {
				return false;
			}
			if (_status.currentPhase == event.player) {
				return false;
			}
			const evt = event.getl ? event.getl(event.player) : null;
			return !!(evt && evt.cards2 && evt.cards2.some(card => event.player.hs && event.player.hs.includes(card)));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("shoucheng", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			await trigger.player.draw();
		},
	},

	// ============ 马岱 old_madai ============
	// 潜袭（重做）：准备阶段，摸一弃一，然后限制距离1的一名角色本回合不能用/打出同色手牌，
	// 你使用牌无视其该色防具；若其本回合未失去过牌且受到伤害，出牌阶段结束你摸两张。
	qianxi: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player && get.distance(player, current) == 1);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("qianxi")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
			const discard = await player.chooseToDiscard("he", true).set("prompt2", get.prompt2("qianxi") + "：请弃置一张牌").forResult();
			if (!discard.bool || !discard.cards || !discard.cards.length) {
				return;
			}
			const color = get.color(discard.cards[0], player);
			const choose = await player
				.chooseTarget({
					prompt: "潜袭：选择一名距离为1的角色",
					filterTarget(card, player, target) {
						return target != player && get.distance(player, target) == 1;
					},
				})
				.forResult();
			if (!choose.bool || !choose.targets || !choose.targets.length) {
				return;
			}
			const target = choose.targets[0];
			target.storage.qianxi_lockcolor = color;
			target.addTempSkill("qianxi_lock", { global: "phaseAfter" });
			player.storage.qianxi_target = target;
			player.storage.qianxi_lockcolor = color;
			player.addTempSkill("qianxi_ignore", { global: "phaseAfter" });
			player.addTempSkill("qianxi_draw", { player: "phaseUseAfter" });
		},
	},
	// 潜袭辅助：本回合内目标不能使用/打出与被弃置牌同色的手牌
	qianxi_lock: {
		charlotte: true,
		mod: {
			cardEnabled2(card, player) {
				if (get.position(card) == "h" && get.color(card, player) == player.storage.qianxi_lockcolor) {
					return false;
				}
			},
		},
	},
	// 潜袭辅助：你使用牌无视目标该颜色的防具
	qianxi_ignore: {
		charlotte: true,
		ai: {
			unequip: true,
			skillTagFilter(player, tag, arg) {
				if (tag != "unequip" || !arg) {
					return false;
				}
				if (arg.target != player.storage.qianxi_target) {
					return false;
				}
				if (arg.card && player.storage.qianxi_lockcolor && get.color(arg.card) != player.storage.qianxi_lockcolor) {
					return false;
				}
				return true;
			},
		},
	},
	// 潜袭辅助：出牌阶段结束时结算摸牌
	qianxi_draw: {
		aiShowTag: "defense",
		charlotte: true,
		trigger: { player: "phaseUseAfter" },
		filter(event, player) {
			const target = player.storage.qianxi_target;
			return target && target.isIn() && !target.getHistory("lose").length && target.getHistory("damage").length > 0;
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
	},

	// ============ 沙摩柯 shamoke ============
	// 蒺藜：一回合内使用/打出第X张牌时可摸X张（X为攻击范围）；回合结束可重铸武器牌。
	gzjili: {
		audio: 2,
		group: ["gzjili_draw", "gzjili_recast"],
	},
	gzjili_draw: {
		aiShowTag: "draw",
		sourceSkill: "gzjili",
		trigger: { player: ["useCard", "respond"] },
		filter(event, player) {
			const count = player.getHistory("useCard").length + player.getHistory("respond").length;
			return count > 0 && count == player.getAttackRange();
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("gzjili")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw(player.getAttackRange());
		},
	},
	gzjili_recast: {
		aiShowTag: "support",
		sourceSkill: "gzjili",
		trigger: { player: "phaseUseAfter" },
		filter(event, player) {
			return !!player.getEquip(1);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("是否重铸装备区的武器牌？").forResult();
		},
		async content(event, trigger, player) {
			const equip = player.getEquip(1);
			if (equip) {
				await player.recast([equip]);
			}
		},
	},

	// ============ 糜夫人 mifuren ============
	// 闺秀：明置此武将牌可摸两张；锁定技，移除此武将牌时可回复至1点或回复1点体力。
	guixiu: {
		audio: 2,
		group: ["guixiu_draw", "guixiu_recover"],
	},
	guixiu_draw: {
		aiShowTag: "draw",
		sourceSkill: "guixiu",
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			return !!(event.toShow && event.toShow.includes("mifuren"));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("guixiu")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
	},
	guixiu_recover: {
		sourceSkill: "guixiu",
		trigger: { player: "removeCharacter" },
		forced: true,
		filter(event, player) {
			return event.toRemove == "mifuren";
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("guixiu")).forResult();
		},
		async content(event, trigger, player) {
			const choice = await player.chooseControl("回复1点体力", "体力回复至1点").set("prompt", get.prompt2("guixiu")).forResult();
			const num = choice.control == "体力回复至1点" ? Math.max(0, 1 - player.hp) : 1;
			if (num > 0) {
				await player.recover(num);
			}
		},
	},
	// 存嗣：锁定技，出牌阶段或濒死时可移除此武将牌，令一名角色获得"勇决"，非自身则摸两张。
	cunsi: {
		audio: 2,
		trigger: { player: ["phaseUseBegin", "enterDying"] },
		forced: true,
		filter(event, player) {
			return [player.name1, player.name2].includes("mifuren");
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("cunsi")).forResult();
		},
		async content(event, trigger, player) {
			const num = player.name1 == "mifuren" ? 0 : 1;
			await player.removeCharacter(num);
			const result = await player
				.chooseTarget({
					prompt: "存嗣：请选择一名角色获得“勇决”",
					filterTarget() {
						return true;
					},
				})
				.forResult();
			const target = result.bool && result.targets && result.targets.length ? result.targets[0] : player;
			target.addSkill("hb_yongjue");
			if (target != player) {
				await target.draw(2);
			}
		},
	},
	// 勇决：出牌阶段第一张使用的牌若为杀，可以获得之且不计入次数
	hb_yongjue: {
		aiShowTag: "support",
		charlotte: true,
		audio: 2,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return event.card.name == "sha" && player.getHistory("useCard").indexOf(event) === 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("hb_yongjue")).forResult();
		},
		async content(event, trigger, player) {
			player.addTempSkill("hb_yongjue_buff", { player: "phaseUseAfter" });
			if (trigger.cards && trigger.cards.length) {
				await player.gain(trigger.cards);
			}
		},
	},
	hb_yongjue_buff: {
		charlotte: true,
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return num + 1;
				}
			},
		},
	},

	// ============ 马谡 xin_masu ============
	// 散谣：出牌阶段限一次，弃一牌对体力值或手牌数最大的角色造成1点伤害。
	olsanyao: {
		aiShowTag: "aoe",
		audio: "sanyao",
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		position: "he",
		filterTarget(card, player, target) {
			const maxHp = Math.max.apply(
				Math,
				game.filterPlayer().map(current => current.hp)
			);
			const maxHand = Math.max.apply(
				Math,
				game.filterPlayer().map(current => current.countCards("h"))
			);
			return target.hp == maxHp || target.countCards("h") == maxHand;
		},
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			await event.target.damage(1);
		},
	},
	// 制蛮（自制id避免与rezhiman共用技能冲突）：防止伤害并获得一张牌，同势力可变更副将，每名角色限一次。
	zhiman: {
		aiShowTag: "support",
		audio: "zhiman",
		trigger: { source: "damageBegin2" },
		filter(event, player) {
			if (player == event.player) {
				return false;
			}
			if (!player.storage.zhiman_used) {
				player.storage.zhiman_used = [];
			}
			return !player.storage.zhiman_used.includes(event.player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zhiman")).forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			const target = trigger.player;
			if (!player.storage.zhiman_used) {
				player.storage.zhiman_used = [];
			}
			player.storage.zhiman_used.push(target);
			await player.gainPlayerCard(target, "ej", true);
			if (target.isIn() && target.isFriendOf(player)) {
				await target.changeVice();
			}
		},
	},

	// ============ 王平 wangping ============
	// 将略：限定技，出牌阶段发布一个"军令"，同势力角色可执行；你和执行者各加1点体力上限并回复1点体力，
	// 然后你摸X张（X为因此回复体力的角色数）。
	jianglve: {
		aiShowTag: "draw",
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		filter(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const junlingResult = await player.chooseJunlingFor(player).forResult();
			const { junling, targets: junlingTargets } = junlingResult || {};
			const executed = [];
			if (junling) {
				for (const current of game.filterPlayer(target => target != player && target.isFriendOf(player))) {
					const result = await current.chooseJunlingControl(player, junling, junlingTargets || []).forResult();
					if (result && (result.bool || result.index === 0)) {
						await current.carryOutJunling(player, junling, junlingTargets || []);
						executed.push(current);
					}
				}
			}
			let healed = 0;
			player.maxHp++;
			if (player.hp < player.maxHp) {
				await player.recover(1);
				healed++;
			}
			for (const current of executed) {
				current.maxHp++;
				if (current.hp < current.maxHp) {
					await current.recover(1);
					healed++;
				}
			}
			if (healed > 0) {
				await player.draw(healed);
			}
		},
	},

	// ============ 法正 xin_fazheng ============
	// 眩惑：其他角色的出牌阶段开始时，你可以交给其一张牌，然后其交给你两张牌。若其与你
	// 势力相同，其选择并获得以下技能之一直到回合结束："武圣""咆哮""龙胆""铁骑""烈弓""狂骨"；
	// 不同，本轮不能再发动此技能。
	// 复用mode/guozhan永久内置的gz_wusheng/gz_paoxiao/gz_longdan/gz_tieji/liegong/
	// xinkuanggu这几个已有实现（本来就是"眩惑"官方版会外借的同一批技能），只是自己
	// 重新实现触发/交易这一层，不依赖已删除的官方武将包。
	fzxuanhuo: {
		audio: 2,
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			if (event.player == player) {
				return false;
			}
			if (player.storage.fzxuanhuo_banned === game.roundNumber) {
				return false;
			}
			return player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(`眩惑：是否交给${get.translation(trigger.player)}一张牌？`).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const giveResult = await player.chooseCard("he", true, `眩惑：交给${get.translation(target)}一张牌`).forResult();
			if (!giveResult.bool || !giveResult.cards?.length) {
				return;
			}
			const card = giveResult.cards[0];
			await player.give(card, target);
			if (target.countCards("he")) {
				const back = await target.chooseCard("he", 2, `眩惑：交给${get.translation(player)}两张牌`, true).forResult();
				if (back.bool && back.cards?.length) {
					await target.give(back.cards, player);
				}
			}
			if (!target.isIn()) {
				return;
			}
			if (target.isFriendOf(player)) {
				const list = ["gz_wusheng", "gz_paoxiao", "gz_longdan", "gz_tieji", "liegong", "xinkuanggu"];
				const result = await target
					.chooseControl(list)
					.set("prompt", "眩惑：选择并获得一个技能直到回合结束")
					.set("ai", () => list.randomGet())
					.forResult();
				target.popup(get.translation(result.control));
				target.addTempSkill(result.control, { player: "phaseAfter" });
				game.log(target, "获得了技能", "#g【" + get.translation(result.control) + "】");
			} else {
				player.storage.fzxuanhuo_banned = game.roundNumber;
			}
		},
	},
	// 恩怨：锁定技，当其他角色对你使用【桃】时，你令其摸一张牌；当你受到伤害后，伤害
	// 来源需交给你一张红色手牌，否则失去1点体力。
	fzenyuan: {
		audio: 2,
		forced: true,
		// gz3: 两个触发用的角色role不一样——"target"表示"技能拥有者是被指定的那个"
		// （对应useCardToTargeted里"其他角色对你使用桃"），"player"表示"技能拥有者
		// 是事件的player"（对应damageEnd里"你受到伤害"）。跟国战内置的gzenyuan
		// （mode/guozhan/src/skill/character/rest.js）的写法保持一致，那边已经验证
		// 过是对的，之前两个都写成"player"role导致桃那一半完全反了（变成"你自己用桃
		// 打别人才触发"），一直没反应。
		trigger: { target: "useCardToTargeted", player: "damageEnd" },
		filter(event, player, name) {
			if (name === "useCardToTargeted") {
				return event.card.name === "tao" && event.player != player;
			}
			return event.source && event.source != player && event.num > 0;
		},
		async content(event, trigger, player) {
			if (event.triggername === "useCardToTargeted") {
				await trigger.player.draw();
				return;
			}
			const source = trigger.source;
			if (!source || !source.isIn()) {
				return;
			}
			if (source.hasCards("h", { color: "red" })) {
				const result = await source
					.chooseCard("h", true, `恩怨：是否交给${get.translation(player)}一张红色手牌，否则你将失去1点体力`, card => get.color(card, source) === "red")
					.forResult();
				if (result.bool && result.cards?.length) {
					await source.give(result.cards[0], player);
					return;
				}
			}
			await source.loseHp();
		},
	},

	// ============ 关兴 hb_guanxing ============
	// 武佑：出牌阶段限一次，与一名角色拼点，没赢则本回合视为拥有武圣；赢者视为对没赢者使用一张决斗。
	wuyou: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await player.chooseToCompare(target).forResult();
			if (!result.bool) {
				player.addTempSkill("wusheng", { global: "phaseAfter" });
			}
			const winner = result.bool ? player : target;
			const loser = result.bool ? target : player;
			if (winner.canUse("juedou", loser, false)) {
				await winner.useCard({ name: "juedou", isCard: true }, loser, "noai");
			}
		},
	},
	// 青龙：锁定技，你使用的杀被目标的闪抵消后，可对其再使用一张杀。
	qinglong: {
		audio: 2,
		trigger: { player: ["shaMiss", "eventNeutralized"] },
		forced: true,
		filter(event, player) {
			return event.card && event.card.name == "sha" && event.target && event.target.isIn() && player.canUse("sha", event.target, false);
		},
		async content(event, trigger, player) {
			const { target } = trigger;
			await player
				.chooseToUse({
					prompt: get.prompt2("qinglong", target),
					filterCard(card) {
						return get.name(card) == "sha";
					},
					complexTarget: true,
					filterTarget(card, player, target2) {
						return target2 == target;
					},
				})
				.set("addCount", false);
		},
	},

	// ============ 廖化 liaohua ============
	// 争先：首次明置获得"先驱"标记；自身回合开始可额外出牌阶段；同势力持有标记者的回合开始也可令其额外出牌阶段。
	zhengxian: {
		audio: 2,
		group: ["zhengxian_get", "zhengxian_self", "zhengxian_other"],
	},
	zhengxian_get: {
		sourceSkill: "zhengxian",
		trigger: { player: "showCharacterAfter" },
		forced: true,
		filter(event, player) {
			return !!(event.toShow && event.toShow.includes("liaohua")) && !player.storage.xianqu;
		},
		popup: false,
		async content(event, trigger, player) {
			player.storage.xianqu = true;
		},
	},
	zhengxian_self: {
		aiShowTag: "control",
		sourceSkill: "zhengxian",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return !!player.storage.xianqu;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zhengxian")).forResult();
		},
		async content(event, trigger, player) {
			player.insertPhase().set("phaseList", ["phaseUse"]);
		},
	},
	zhengxian_other: {
		aiShowTag: "control",
		sourceSkill: "zhengxian",
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return event.player != player && event.player.isFriendOf(player) && !!event.player.storage.xianqu;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zhengxian", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			trigger.player.insertPhase().set("phaseList", ["phaseUse"]);
		},
	},

// ===================== 关平：龙吟 =====================
	// 当一名角色于其出牌阶段内使用【杀】时，你可以弃置一张牌，令此【杀】不计入次数。
	// 若此【杀】为红色，你摸一张牌。当你以此法失去最后一张手牌时，你摸两张牌，然后此技能本回合失效。
	longyin: {
		aiShowTag: "response",
		aiShowCost: true,
		trigger: { global: "useCard" },
		filter(event, player) {
			if (event.card.name != "sha" || !event.player.isPhaseUsing()) {
				return false;
			}
			if (player.hasSkill("longyin_off", null, null, false)) {
				return false;
			}
			return player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			const handBefore = player.getCards("h");
			const result = await player.chooseToDiscard("he", true).set("prompt2", "龙吟：是否弃置一张牌，令此【杀】不计入使用次数？").forResult();
			event.result = Object.assign({}, result, { cost_data: { handBefore } });
		},
		async content(event, trigger, player) {
			trigger.addCount = false;
			if (get.color(trigger.card) == "red") {
				await player.draw();
			}
			const discardedHand = event.cards && event.cards.some(card => event.cost_data.handBefore.includes(card));
			if (discardedHand && player.countCards("h") == 0) {
				await player.draw(2);
				player.addTempSkill("longyin_off", { global: "phaseAfter" });
			}
		},
		ai: {
			skillTagFilter(player) {
				if (!player.countCards("he")) {
					return false;
				}
			},
		},
	},
	longyin_off: {
		charlotte: true,
	},

	// ===================== 简雍：巧说/纵适 =====================
	// 出牌阶段，你可以与一名角色拼点，若你：赢，本回合你使用下一张基本牌或普通锦囊牌可以多（无距离限制）
	// 或少选择一个目标；没赢，本回合不能对自己以外的目标使用牌。
	qiaoshui: {
		aiShowTag: "support",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(current => player.canCompare(current));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: "巧说：是否与一名角色拼点？",
					filterTarget(card, player, target) {
						return player.canCompare(target);
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player.chooseToCompare(target).forResult();
			player.addTempSkill(result.bool ? "qiaoshui3" : "qiaoshui2");
		},
	},
	// 没赢：本回合不能对自己以外的目标使用牌
	qiaoshui2: {
		charlotte: true,
		mod: {
			playerEnabled(card, player, target) {
				if (player != target) {
					return false;
				}
			},
		},
	},
	// 赢：下一张基本牌/普通锦囊牌可以多或少选择一个目标
	qiaoshui3: {
		aiShowTag: "support",
		charlotte: true,
		trigger: { player: "useCard2" },
		silent: true,
		filter(event, player) {
			const type = get.type(event.card);
			return type == "basic" || type == "trick";
		},
		async content(event, trigger, player) {
			player.removeSkill(event.name);
			let flags = 0;
			const info = get.info(trigger.card);
			if (trigger.targets && !info.multitarget) {
				if (game.hasPlayer(target => lib.filter.targetEnabled2(trigger.card, player, target) && !trigger.targets.includes(target))) {
					flags |= 0b01;
				}
				if (trigger.targets.length > 1) {
					flags |= 0b10;
				}
			}
			if (flags === 0) {
				return;
			}
			const addTarget = async () => {
				const result = await player
					.chooseTarget({
						prompt: `巧说：是否为${get.translation(trigger.card)}额外指定一名目标？`,
						filterTarget(card, player, target) {
							return !get.event().getTrigger().targets.includes(target) && lib.filter.targetEnabled2(get.event().getTrigger().card, player, target);
						},
					})
					.forResult();
				if (result.bool && result.targets?.length) {
					trigger.targets.add(result.targets[0]);
				}
			};
			const removeTarget = async () => {
				const result = await player
					.chooseTarget({
						prompt: `巧说：是否减少一名${get.translation(trigger.card)}的目标？`,
						filterTarget(card, player, target) {
							return get.event().getTrigger().targets.includes(target);
						},
					})
					.forResult();
				if (result.bool && result.targets?.length) {
					trigger.targets.remove(result.targets[0]);
				}
			};
			if (flags == 0b01) {
				await addTarget();
			} else if (flags == 0b10) {
				await removeTarget();
			} else {
				const result = await player
					.chooseControl(["为此牌增加一个目标", "为此牌减少一个目标", "cancel2"])
					.set("prompt", "巧说：请选择一项")
					.forResult();
				if (result.control == "为此牌增加一个目标") {
					await addTarget();
				} else if (result.control == "为此牌减少一个目标") {
					await removeTarget();
				}
			}
		},
	},
	// 当你拼点后，若你赢，你可以获得对方此次拼点的牌；没赢，你可以获得你此次拼点的牌
	jyzongshi: {
		aiShowTag: "support",
		trigger: {
			global: ["chooseToCompareAfter", "compareMultipleAfter"],
		},
		getCards(event, player) {
			if (event.compareMultiple) {
				return [];
			}
			if (player != event.player && player != event.target) {
				return [];
			}
			const winner = event.winner || event.result.winner;
			const bool = (winner == player) == (player == event.player);
			return [event[bool ? "card2" : "card1"]].filterInD("od");
		},
		prompt2(event, player) {
			const cards = get.info("jyzongshi").getCards(event, player);
			return `获得${get.translation(cards)}`;
		},
		filter(event, player) {
			const cards = get.info("jyzongshi").getCards(event, player);
			return cards.length > 0;
		},
		async content(event, trigger, player) {
			const cards = get.info(event.name).getCards(trigger, player);
			await player.gain(cards, "gain2", "log");
		},
	},

	// ===================== 寇封：怀兵 =====================
	// 准备阶段，你可以选择两名角色，获得这两名角色各一张手牌，然后你展示手牌，
	// 令其中体力值较少的角色下个摸牌阶段摸牌数、出牌阶段【杀】的使用次数、弃牌阶段手牌上限改为其中红色牌的数量。
	huaibing: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.countPlayer(current => current.countCards("h") > 0) >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: "怀兵：选择两名角色，获得这两名角色各一张手牌",
					selectTarget: 2,
					filterTarget(card, player, target) {
						return target.countCards("h") > 0;
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const targets = event.targets;
			const gained = [];
			for (const target of targets) {
				const result = await player.choosePlayerCard({ target, position: "h", forced: true }).forResult();
				if (result.cards?.length) {
					await player.gain(result.cards, target, "gain2");
					gained.addArray(result.cards);
				}
			}
			if (player.countCards("h")) {
				await player.showHandcards();
			}
			let lower = targets[0];
			if (targets[1].hp < lower.hp) {
				lower = targets[1];
			} else if (targets[1].hp == lower.hp) {
				const result = await player
					.chooseTarget({
						prompt: "怀兵：两名角色体力值相同，请选择其中一名角色",
						filterTarget(card, player, target) {
							return targets.includes(target);
						},
					})
					.forResult();
				if (result.targets?.length) {
					lower = result.targets[0];
				}
			}
			const x = gained.filter(card => get.color(card) == "red").length;
			lower.storage.huaibing_num = x;
			lower.addTempSkill("huaibing_draw");
			lower.addTempSkill("huaibing_sha", { player: ["phaseUseAfter", "phaseAfter"] });
			lower.addTempSkill("huaibing_discard", { player: ["phaseDiscardAfter", "phaseAfter"] });
		},
	},
	huaibing_draw: {
		charlotte: true,
		trigger: { player: "phaseDrawBegin1" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			trigger.num = player.storage.huaibing_num || 0;
			trigger.numFixed = true;
			player.removeSkill("huaibing_draw");
		},
	},
	huaibing_sha: {
		charlotte: true,
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return player.storage.huaibing_num || 0;
				}
			},
		},
	},
	huaibing_discard: {
		charlotte: true,
		mod: {
			maxHandcard(player, num) {
				return player.storage.huaibing_num || 0;
			},
		},
	},

	// ===================== 吴懿：奔袭/转征 =====================
	// 锁定技，当你于回合内使用牌时，本回合你计算与其他角色的距离-1。
	olbenxi: {
		trigger: { player: "useCard" },
		forced: true,
		filter(event, player) {
			return !player.hasSkill("olbenxi_buff", null, null, false);
		},
		content(event, trigger, player) {
			player.addTempSkill("olbenxi_buff", { player: "phaseAfter" });
		},
	},
	olbenxi_buff: {
		charlotte: true,
		mod: {
			globalFrom(from, to, distance) {
				return distance - 1;
			},
		},
	},
	// 每轮限两次，出牌阶段，你可以选择一名距离1以内的同势力角色，你摸X张牌，
	// 然后其可以与你副将易位（X为你与其之间的角色数且至少为1）。
	zhuanzheng: {
		aiShowTag: "draw",
		enable: "phaseUse",
		filter(event, player) {
			if ((player.storage.zhuanzheng_round || 0) >= 2) {
				return false;
			}
			return game.hasPlayer(current => current != player && current.isFriendOf(player) && get.distance(player, current) <= 1);
		},
		filterTarget(card, player, target) {
			return target != player && target.isFriendOf(player) && get.distance(player, target) <= 1;
		},
		async content(event, trigger, player) {
			const target = event.target;
			player.storage.zhuanzheng_round = (player.storage.zhuanzheng_round || 0) + 1;
			player.addTempSkill("zhuanzheng_reset");
			const x = Math.max(1, get.distance(player, target) - 1);
			await player.draw(x);
			const result = await target.chooseBool(`转征：是否与${get.translation(player)}交换座位？`).forResult();
			if (result.bool) {
				game.swapSeat(player, target);
			}
		},
		ai: {
			order: 4,
			result: {
				player: 1,
			},
		},
	},
	zhuanzheng_reset: {
		charlotte: true,
		trigger: { global: "roundStart" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.zhuanzheng_round = 0;
		},
	},

	// ===================== 张松：强识/献图 =====================
	// 出牌阶段开始时，你可以展示一名其他角色的一张手牌，然后你本阶段使用此类别的非转化牌后可摸一张牌。
	qiangzhi: {
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.countCards("h") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: "强识：是否展示一名其他角色的一张手牌？",
					filterTarget(card, player, target) {
						return target != player && target.countCards("h") > 0;
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player.choosePlayerCard({ target, position: "h", forced: true }).forResult();
			if (!result.cards?.length) {
				return;
			}
			const card = result.cards[0];
			await target.showCards(card, get.translation(target) + "因【强识】展示");
			player.storage.qiangzhi_type = get.type(card, "trick");
			player.addTempSkill("qiangzhi_draw", { player: ["phaseUseAfter", "phaseAfter"] });
		},
	},
	qiangzhi_draw: {
		aiShowTag: "draw",
		charlotte: true,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return !event.card.viewAs && get.type(event.card, "trick") == player.storage.qiangzhi_type;
		},
		async content(event, trigger, player) {
			await player.draw();
		},
	},
	// 其他角色出牌阶段开始时，你可以摸两张牌，然后交给其等量牌。
	// 此阶段结束时，若本回合没有角色进入濒死状态，你失去1点体力。
	xiantu: {
		aiShowTag: "draw",
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return event.player != player;
		},
		logTarget: "player",
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(`献图：是否摸两张牌，然后交给${get.translation(trigger.player)}两张牌？`).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const cards = await player.draw(2);
			await player.give(cards, target);
			player.storage.xiantu_target = target;
			player.addTempSkill("xiantu_check");
		},
	},
	xiantu_check: {
		charlotte: true,
		trigger: { global: "phaseUseAfter" },
		filter(event, player) {
			return event.player == player.storage.xiantu_target;
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			delete player.storage.xiantu_target;
			player.removeSkill("xiantu_check");
			if (!player.storage.xiantu_died) {
				await player.loseHp();
			}
		},
	},
	// 隐藏的常驻标记技，用于追踪本回合是否有角色进入过濒死状态
	xiantu_mark: {
		charlotte: true,
		init(player) {
			player.storage.xiantu_died = false;
		},
		trigger: { global: ["phaseBegin", "dying"] },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.xiantu_died = trigger.name != "phaseBegin";
		},
	},

	// ===================== 周仓：忠勇 =====================
	// 每回合限一次，当同势力角色使用【杀】结算结束后，你可以令其获得此【杀】或目标角色使用的【闪】，
	// 然后其可以对此【杀】的目标角色使用一张【杀】。
	xinzhongyong: {
		aiShowTag: "response",
		trigger: { global: "useCardAfter" },
		filter(event, player) {
			if (event.card.name != "sha" || player.isEnemyOf(event.player) || !event.targets?.length) {
				return false;
			}
			return !player.hasSkill("xinzhongyong_used", null, null, false);
		},
		logTarget: "player",
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(`忠勇：是否令${get.translation(trigger.player)}获得此【杀】或目标使用的【闪】，然后其可以使用一张【杀】？`).forResult();
		},
		async content(event, trigger, player) {
			player.addTempSkill("xinzhongyong_used");
			const source = trigger.player;
			const targets = trigger.targets.slice(0);
			const shanCards = [];
			for (const target of targets) {
				for (const evt of target.getHistory("useCard", e => e.card.name == "shan" && e.getParent(3) == trigger)) {
					shanCards.addArray(evt.cards);
				}
			}
			const shaCards = (trigger.cards || []).slice(0).filterInD();
			let gainCards = shaCards;
			if (shanCards.filterInD().length) {
				const result = await source.chooseControl(["获得【杀】", "获得【闪】"]).set("prompt", "忠勇：请选择一项").forResult();
				gainCards = result.control == "获得【闪】" ? shanCards : shaCards;
			}
			if (gainCards.length) {
				await source.gain(gainCards, "gain2");
			}
			if (source.countCards("h", "sha")) {
				await source.chooseToUse({
					name: "sha",
					prompt: "忠勇：是否对原目标使用一张【杀】？",
					filterTarget(card, player, target) {
						return targets.includes(target);
					},
				});
			}
		},
	},
	xinzhongyong_used: {
		charlotte: true,
		trigger: { global: "phaseBegin" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.removeSkill("xinzhongyong_used");
		},
	},

	// ===================== 刘谌：战绝/勤王 =====================
	// 出牌阶段，你可以将所有手牌（至少一张）当一张【决斗】使用，结算完成后，你摸一张牌，
	// 然后受伤角色各摸一张牌。每阶段你因“战绝”摸第两张牌后，此阶段“战绝”失效。
	zhanjue: {
		aiShowTag: "offense",
		enable: "phaseUse",
		filterCard: true,
		selectCard: -1,
		position: "h",
		filter(event, player) {
			const stat = player.getStat().skill;
			if (stat.zhanjue_draw && stat.zhanjue_draw >= 2) {
				return false;
			}
			const hs = player.getCards("h");
			if (!hs.length) {
				return false;
			}
			return hs.every(card => game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false);
		},
		viewAs: { name: "juedou" },
		group: ["zhanjue4"],
		ai: {
			damage: true,
			order(item, player) {
				return player.countCards("h") > 1 ? 0.8 : 8;
			},
		},
	},
	zhanjue4: {
		trigger: { player: "useCardAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.skill == "zhanjue";
		},
		async content(event, trigger, player) {
			const stat = player.getStat().skill;
			stat.zhanjue_draw = (stat.zhanjue_draw || 0) + 1;
			await player.draw({ nodelay: true });
			const list = game.filterPlayer(current => current.getHistory("damage", evt => evt.card === trigger.card).length > 0);
			if (list.length) {
				if (list.includes(player)) {
					stat.zhanjue_draw++;
				}
				list.sortBySeat();
				await game.asyncDraw(list);
			}
		},
	},
	// 你可以弃置一张牌，然后发动一次“激将”。响应此“激将”打出【杀】的角色摸一张牌。
	qinwang: {
		aiShowTag: "draw",
		aiShowCost: true,
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("he") > 0 && game.hasPlayer(current => current != player && current.isFriendOf(player) && current.countCards("h", "sha") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseToDiscard("he", true).set("prompt2", "勤王：是否弃置一张牌，然后发动一次“激将”？").forResult();
		},
		async content(event, trigger, player) {
			const list = game.filterPlayer(current => current != player && current.isFriendOf(player)).sortBySeat(player);
			for (const current of list) {
				if (!current.countCards("h", "sha")) {
					continue;
				}
				const result = await current
					.chooseToUse({
						name: "sha",
						prompt: `勤王：是否使用一张【杀】（响应${get.translation(player)}的激将）？`,
					})
					.forResult();
				if (result.bool) {
					await current.draw();
					break;
				}
			}
		},
	},

	// ===================== 黄皓：贿生/存畏 =====================
	// 当你受到其他角色造成的伤害时，你可以展示任意张牌，令伤害来源观看之并选择一项：
	// 1.获得其中至多x张牌，防止x点伤害（x为本次伤害值）；2.弃置等量的牌。
	huisheng: {
		aiShowTag: "defense",
		aiShowCost: true,
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			return !!(event.source && event.source != player && event.source.isIn()) && player.countCards("he") > 0;
		},
		logTarget(event) {
			return event?.source;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard("he", true)
				.set("selectCard", [1, player.countCards("he")])
				.set("prompt2", "贿生：展示任意张牌，令伤害来源观看后选择获得其中的牌以防止伤害，或令你弃置等量的牌")
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			const source = trigger.source;
			await player.showCards(cards, get.translation(player) + "发动了【贿生】");
			const x = Math.min(cards.length, trigger.num || 1);
			const result = await source
				.chooseControl(["获得其中的牌并防止伤害", "令对方弃置这些牌"])
				.set("prompt", `贿生：请选择一项（至多获得${x}张牌并防止${x}点伤害）`)
				.forResult();
			if (result.control == "获得其中的牌并防止伤害") {
				const gainCards = cards.slice(0, x);
				await source.gain(gainCards, player, "gain2");
				trigger.num -= gainCards.length;
				if (trigger.num <= 0) {
					trigger.cancel();
				}
			} else {
				await player.discard(cards);
			}
		},
	},
	// 锁定技，当你成为锦囊牌的目标后，若你为唯一目标，则你摸一张牌，否则你弃置一张牌。
	cunwei: {
		trigger: { target: "useCardToTarget" },
		forced: true,
		filter(event, player) {
			return get.type(event.card) == "trick";
		},
		async content(event, trigger, player) {
			if (trigger.targets.length == 1) {
				await player.draw();
			} else if (player.countCards("he")) {
				await player.chooseToDiscard("he", true).set("prompt2", "存畏：请弃置一张牌").forResult();
			}
		},
	},

	// ===================== 关银屏：雪恨/虎啸 =====================
	// 出牌阶段限一次，你可以弃置一张红色牌并选择至多X名角色（X为你已损失的体力值且至少为1），
	// 然后你横置这些角色，并对其中一名角色造成1点火焰伤害。
	xueji: {
		aiShowTag: "support",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("he", card => get.color(card) == "red") > 0;
		},
		filterCard(card) {
			return get.color(card) == "red";
		},
		position: "he",
		multitarget: true,
		multiline: true,
		line: "fire",
		selectTarget() {
			const player = get.player();
			return [1, Math.max(1, player.getDamagedHp())];
		},
		async content(event, trigger, player) {
			const targets = event.targets;
			for (const target of targets) {
				if (!target.isLinked()) {
					target.link(true);
				}
			}
			await game.delay();
			await targets[0].damage("fire", "nocard");
		},
		ai: {
			damage: true,
			fireAttack: true,
			order: 7,
			result: {
				target(player, target) {
					const eff = get.damageEffect(target, player, target, "fire");
					return target.isLinked() ? eff / 10 : eff;
				},
			},
		},
	},
	// 锁定技，当你对一名角色造成火焰伤害后，其摸一张牌。
	huxiao: {
		trigger: { source: "damageSource" },
		forced: true,
		filter(event, player) {
			return event.player.isIn() && event.hasNature("fire");
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await trigger.player.draw();
		},
	},

	// ===================== 马良：协穆/纳蛮 =====================
	// 其他与你势力相同的角色的出牌阶段，其可以展示并交给你一张基本牌，然后其于本回合内计算与其他角色的距离-1。
	xiemu: {
		aiShowTag: "support",
		aiShowCost: true,
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return event.player != player && player.isFriendOf(event.player) && event.player.countCards("h", card => get.type(card) == "basic") > 0;
		},
		logTarget: "player",
		async cost(event, trigger, player) {
			event.result = await trigger.player
				.chooseCard("h", true)
				.set("filterCard", card => get.type(card) == "basic")
				.set("prompt2", `协穆：是否展示并交给${get.translation(player)}一张基本牌，然后本回合内计算与其他角色的距离-1？`)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const cards = event.cards;
			await target.showCards(cards, get.translation(target) + "发动了【协穆】");
			await target.give(cards, player);
			target.addTempSkill("xiemu_buff", { player: "phaseAfter" });
		},
	},
	xiemu_buff: {
		charlotte: true,
		mod: {
			globalFrom(from, to, distance) {
				return distance - 1;
			},
		},
	},
	// 出牌阶段限一次，你可以将任意张基本牌当【南蛮入侵】使用，并选择等量名角色为目标。你获得因此打出的红色【杀】。
	naman: {
		aiShowTag: "offense",
		enable: ["chooseToUse"],
		usable: 1,
		filterCard(card) {
			return get.type(card) == "basic";
		},
		selectCard: [1, Infinity],
		position: "h",
		viewAs: { name: "nanman" },
		filterTarget(card, player, target) {
			return true;
		},
		selectTarget() {
			const n = ui.selected.cards.length || 1;
			return [n, n];
		},
		check(card) {
			return 6 - get.value(card);
		},
	},
	// 隐藏的常驻辅助技，负责收取“纳蛮”响应中打出的红色【杀】
	naman_gain: {
		charlotte: true,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return event.skill == "naman";
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const redSha = [];
			for (const current of game.players.concat(game.dead)) {
				for (const evt of current.getHistory("useCard", e => e.card.name == "sha" && get.color(e.card) == "red" && e.getParent(3) == trigger)) {
					redSha.addArray(evt.cards);
				}
			}
			const cards = redSha.filterInD();
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
	},

// ===================== 糜竺：资援/巨贾 =====================
	// 资援：出牌阶段限一次，你可以交给一名其他角色任意张点数之和为13的牌，然后该角色回复1点体力。
	ziyuan: {
		aiShowTag: "recover",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		complexCard: true,
		filterCard(card) {
			let num = 0;
			for (const c of ui.selected.cards) num += get.number(c);
			return get.number(card) + num <= 13;
		},
		// 借助selectCard锁定选牌数量的技巧：点数之和一旦凑到13就不能再选，从而强制“和恰好为13”
		selectCard() {
			let num = 0;
			for (const c of ui.selected.cards) num += get.number(c);
			if (num == 13) return ui.selected.cards.length;
			return ui.selected.cards.length + 2;
		},
		discard: false,
		lose: false,
		delay: false,
		filterTarget(card, player, target) {
			return target != player;
		},
		check(card) {
			let num = 0;
			for (const c of ui.selected.cards) num += get.number(c);
			if (num + get.number(card) == 13) return 9 - get.value(card);
			return 0;
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.give(cards, target);
			await target.recover();
		},
		ai: {
			order(skill, player) {
				return game.hasPlayer(current => current.hp < current.maxHp && current != player && get.recoverEffect(current, player, player) > 0) ? 10 : 1;
			},
			result: {
				target(player, target) {
					if (get.attitude(player, target) < 0) return -1;
					const eff = get.recoverEffect(target, player, player);
					if (eff > 0) return target.hp == 1 ? 3 : 2;
					return 0;
				},
			},
			threaten: 1.3,
		},
	},
	// 巨贾：锁定技，你的手牌上限+X；你进入游戏时摸X张牌（X为你的体力上限）。
	// 与官方版不同：去掉了“国战”模式下“变更武将牌”的相关效果（本项目并非国战模式，无对应机制）。
	jugu: {
		audio: 2,
		mod: {
			maxHandcard(player, num) {
				return num + player.maxHp;
			},
		},
		trigger: { global: "phaseBefore", player: "enterGame" },
		forced: true,
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		async content(event, trigger, player) {
			await player.draw(player.maxHp);
		},
		ai: { threaten: 1.4 },
	},

	// ===================== 董允：秉正/舍宴 =====================
	// 秉正：出牌阶段结束时，你可以令手牌数不等于体力值的一名角色弃置一张手牌或摸一张牌。
	// 然后若其手牌数等于体力值，你摸一张牌，且可以交给该角色一张牌。
	bingzheng: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseUseEnd" },
		filter(event, player) {
			return game.hasPlayer(current => current.countCards("h") != current.hp);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("bingzheng"), "选择一名手牌数不等于体力值的角色", (card, player, target) => target.countCards("h") != target.hp)
				.set("ai", target => get.attitude(get.player(), target))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.target;
			const { control } = await player
				.chooseControl("弃置一张手牌", "摸一张牌")
				.set("prompt", `秉正：令${get.translation(target)}弃置一张手牌或摸一张牌`)
				.set("ai", () => (get.attitude(player, target) < 0 ? "弃置一张手牌" : "摸一张牌"))
				.forResult();
			if (control == "弃置一张手牌") await target.chooseToDiscard("h", true).forResult();
			else await target.draw();
			if (target.countCards("h") == target.hp) {
				await player.draw();
				const result = await player
					.chooseCard("he", `是否交给${get.translation(target)}一张牌？`)
					.set("ai", card => (get.attitude(player, target) > 0 ? 5 - get.value(card) : 0))
					.forResult();
				if (result.bool) await player.give(result.cards, target);
			}
		},
		ai: { threaten: 1.2 },
	},
	// 舍宴：当你成为普通锦囊牌的目标时，你可以为此牌增加一个目标（无距离限制）或令此牌对其中一个目标无效
	// （有效的目标数至少为1）。
	sheyan: {
		aiShowTag: "support",
		audio: 2,
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			if (!event.targets?.includes(player)) return false;
			const info = get.info(event.card);
			if (!info || info.type != "trick" || info.multitarget) return false;
			if (event.targets.length > 1) return true;
			return game.hasPlayer(current => !event.targets.includes(current));
		},
		async cost(event, trigger, player) {
			const bool1 = game.hasPlayer(current => !trigger.targets.includes(current));
			const bool2 = trigger.targets.length > 1;
			let str = "";
			if (bool1) str += `为${get.translation(trigger.card)}额外指定一名目标（无距离限制）`;
			if (bool1 && bool2) str += "，或";
			if (bool2) str += `令${get.translation(trigger.card)}对其中一个目标无效`;
			const next = player
				.chooseTarget(get.prompt(event.skill), str, (card, player, target) => {
					const trigger = get.event().getTrigger();
					if (trigger.targets.includes(target)) return trigger.targets.length > 1;
					return !trigger.targets.includes(target);
				})
				.set("ai", target => {
					const player = get.player();
					const trigger = get.event().getTrigger();
					return get.effect(target, trigger.card, player, player) * (trigger.targets.includes(target) ? -1 : 1);
				})
				.set("targets", trigger.targets);
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			event.type = trigger.targets.includes(target) ? "remove" : "add";
			if (event.type == "remove") {
				trigger.getParent().excluded.add(target);
				game.log(trigger.card, "对", target, "无效");
			} else {
				trigger.targets.add(target);
				game.log(target, "成为了", trigger.card, "的目标");
			}
		},
		ai: { expose: 0.2 },
	},

	// ===================== 张翼：执义 =====================
	// 锁定技，一名角色的结束阶段，若你本回合内使用或打出过基本牌，你选择一项：
	// 1.视为使用任意一张你本回合内使用或打出过的基本牌；2.摸一张牌。
	rezhiyi: {
		audio: "zhiyi",
		trigger: { global: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			return player.getHistory("useCard", evt => get.type(evt.card) == "basic").length > 0 || player.getHistory("respond", evt => get.type(evt.card) == "basic").length > 0;
		},
		async content(event, trigger, player) {
			const list = [];
			const collect = evt => {
				if (get.type(evt.card) != "basic") return;
				let name = evt.card.name;
				if (name == "sha") {
					const map = { fire: "huosha", thunder: "leisha", kami: "kamisha", ice: "icesha", stab: "cisha" };
					name = map[evt.card.nature] || name;
				}
				list.add(name);
			};
			player.getHistory("useCard", collect);
			player.getHistory("respond", collect);
			const result = await player
				.chooseButton(
					["执义：选择要视为使用的牌，或点取消摸一张牌", [list.map(name => ["基本", "", name]), "vcard"]],
					button => _status.event.player.getUseValue({ name: button.link[2], nature: button.link[3] }),
					button => _status.event.player.hasUseTarget({ name: button.link[2], nature: button.link[3] })
				)
				.forResult();
			if (!result.bool) await player.draw();
			else await player.chooseUseTarget({ name: result.links[0][2], isCard: true, nature: result.links[0][3] }, true).forResult();
		},
	},

	// ===================== 李丰：屯储/输粮 =====================
	// 屯储：摸牌阶段，你可以多摸两张牌，将一至两张手牌置于你的武将牌上，称为“粮”，然后本回合不能使用【杀】。
	// 与官方“囤储”不同名，为全新设计的技能。
	liangcang: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt("liangcang"), get.translation("liangcang_info")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw(2);
			const { bool, cards } = await player
				.chooseCard("h", [1, 2], "屯储：将一至两张手牌置于武将牌上，称为“粮”")
				.set("ai", card => 6 - get.value(card))
				.forResult();
			if (bool && cards && cards.length) {
				await player.addToExpansion({ cards, animate: "gain2", gaintag: ["hb_liang"] });
			}
			player.addTempSkill("liangcang_noshu", "phaseAfter");
		},
		subSkill: {
			noshu: {
				charlotte: true,
				mod: {
					cardEnabled(card, player) {
						if (card.name == "sha") return false;
					},
				},
				intro: { content: "本回合不能使用【杀】" },
			},
		},
		ai: { expose: 0.1 },
	},
	// 输粮：一名角色的结束阶段，若该角色的手牌数小于其体力上限，你可以移去一张“粮”，令其摸两张牌。
	// 与官方版“输粮”机制不同，重新设计。
	dcshuliang: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return player.getExpansions("hb_liang").length > 0 && event.player.countCards("h") < event.player.hp;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("dcshuliang", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions("hb_liang").slice(0, 1);
			await player.loseToDiscardpile(cards);
			await trigger.player.draw(2);
		},
		ai: { expose: 0.1 },
	},

	// ===================== 赵统&赵广：翊赞 =====================
	// 你可以将X张牌（其中至少一张牌是基本牌）当任意基本牌使用或打出。（X为你体力值的一半，向上取整）
	// 结构参考官方“zj_yizan”的选牌当牌实现，将固定的2张改为随体力值变化。
	zj_yizan: {
		aiShowTag: "support",
		audio: "yizan_respond_shan",
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			if (get.type(name) !== "basic") return false;
			const need = Math.max(1, Math.ceil(player.hp / 2));
			return player.countCards("hes") >= need;
		},
		filter(event, player) {
			const need = Math.max(1, Math.ceil(player.hp / 2));
			if (player.countCards("hes") < need) return false;
			for (const name of lib.inpile) {
				if (get.type(name) !== "basic") continue;
				if (event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) return true;
				if (name === "sha") {
					for (const nature of lib.inpile_nature) {
						if (event.filterCard(get.autoViewAs({ name, nature }, "unsure"), player, event)) return true;
					}
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				const list = get.inpileVCardList(info => {
					if (info[0] !== "basic") return false;
					const card = get.autoViewAs({ name: info[2], nature: info[3] }, "unsure");
					return event.filterCard(card, player, event);
				});
				return ui.create.dialog("翊赞", [list, "vcard"], "hidden");
			},
			check(button) {
				const player = _status.event.player;
				const card = { name: button.link[2], nature: button.link[3] };
				if (_status.event.getParent().type !== "phase" || game.hasPlayer(current => player.canUse(card, current) && get.effect(current, card, player, player) > 0)) {
					switch (button.link[2]) {
						case "tao":
						case "shan":
							return 5;
						case "jiu": {
							const need = Math.max(1, Math.ceil(player.hp / 2));
							if (player.countCards("hes") > need) return 3;
							return 0;
						}
						case "sha":
							if (button.link[3] === "fire") return 2.95;
							else if (button.link[3] === "thunder" || button.link[3] === "ice") return 2.92;
							return 2.9;
					}
				}
				return 0;
			},
			backup(links, player) {
				const need = Math.max(1, Math.ceil(player.hp / 2));
				return {
					audio: "zj_yizan",
					complexCard: true,
					filterCard(card) {
						const selected = ui.selected.cards;
						const hasBasic = selected.some(c => get.type(c) == "basic") || get.type(card) == "basic";
						if (selected.length + 1 >= need) return hasBasic;
						return true;
					},
					selectCard: need,
					check(card) {
						return 6 - get.value(card);
					},
					viewAs: { name: links[0][2], nature: links[0][3] },
					async precontent(event) {
						event.result.skill = "zj_yizan";
					},
					position: "hes",
					popname: true,
				};
			},
			prompt(links, player) {
				const need = Math.max(1, Math.ceil(_status.event.player.hp / 2));
				return `将${get.cnNumber(need)}张牌（其中至少一张基本牌）当做${get.translation(links[0][3] || "")}${get.translation(links[0][2])}使用或打出`;
			},
		},
		ai: {
			order() {
				const player = _status.event.player;
				const event = _status.event;
				const need = Math.max(1, Math.ceil(player.hp / 2));
				if (event.filterCard({ name: "jiu" }, player, event) && get.effect(player, { name: "jiu" }) > 0 && player.countCards("hes") > need) {
					return 3.3;
				}
				return 3.1;
			},
			skillTagFilter(player, tag, arg) {
				if (tag === "fireAttack") return true;
				const need = Math.max(1, Math.ceil(player.hp / 2));
				if (player.countCards("hes") < need) return false;
			},
			result: { player: 1 },
			respondSha: true,
			respondShan: true,
			fireAttack: true,
		},
	},

	// ===================== 秦宓：专对/天辩 =====================
	// 专对：同势力角色成为【杀】的目标后，你可以与使用者拼点，若你赢，此【杀】无效；
	// 若你没赢，且你不是此牌的目标，你可以将一张手牌置于牌堆顶，取消此【杀】的所有目标，然后你成为此【杀】的目标。
	zhuandui: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		trigger: { global: "useCardToTarget" },
		filter(event, player) {
			if (event.card.name != "sha" || !event.targets || !event.targets.length) return false;
			if (!player.canCompare(event.player)) return false;
			return event.targets.some(target => target.isFriendOf(player));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(`专对：是否与${get.translation(trigger.player)}拼点？`).forResult();
		},
		async content(event, trigger, player) {
			const result = await player.chooseToCompare(trigger.player).forResult();
			if (result.bool) {
				trigger.targets.slice().forEach(target => trigger.getParent().excluded.add(target));
				game.log(trigger.card, "对本次使用的所有目标无效");
			} else if (!trigger.targets.includes(player)) {
				const result = await player
					.chooseCard("h", "专对：将一张手牌置于牌堆顶，取消【杀】的所有目标，然后你成为目标")
					.set("ai", card => 6 - get.value(card))
					.forResult();
				if (result.bool) {
					await game.cardsGotoPile(result.cards, "insert");
					trigger.getParent().excluded.length = 0;
					trigger.targets.length = 0;
					trigger.targets.add(player);
				}
			}
		},
		ai: { expose: 0.3 },
	},
	// 天辩：你可用牌堆顶的牌进行拼点。你的红桃拼点牌的点数视为K。
	tianbian: {
		aiShowTag: "support",
		audio: 2,
		enable: "chooseCard",
		check(event, player) {
			const player2 = _status.event.player;
			return !player2.hasCard(card => {
				const val = get.value(card);
				return val < 0 || (val <= 4 && (get.number(card) >= 11 || get.suit(card) == "heart"));
			}, "h")
				? 20
				: 0;
		},
		filter(event) {
			return event.type == "compare" && !event.directresult;
		},
		onCompare(player) {
			return game.cardsGotoOrdering(get.cards()).cards;
		},
		ai: {
			forceWin: true,
			skillTagFilter(player, tag, arg) {
				return arg.card && get.suit(arg.card, false) == "heart";
			},
		},
		group: "tianbian_number",
		subSkill: {
			number: {
				trigger: { player: "compare", target: "compare" },
				filter(event, player) {
					if (event.player == player) return !event.iwhile && get.suit(event.card1) == "heart";
					return get.suit(event.card2) == "heart";
				},
				silent: true,
				async content(event, trigger, player) {
					game.log(player, "拼点牌点数视为", "#yK");
					if (player == trigger.player) trigger.num1 = 13;
					else trigger.num2 = 13;
				},
			},
		},
	},

	// ===================== 严颜：拒降 =====================
	// 当你成为其他角色使用【杀】的目标后，你可以与其各摸一张牌，然后其本回合不能再对你使用牌。
	// 当你使用【杀】指定一名角色为目标后，你可以获得其一张牌，然后你本回合不能再对其使用牌。
	// 与官方"拒战"不同名，参照其转换技结构重新设计。
	jujiang: {
		aiShowTag: "support",
		audio: 2,
		mark: true,
		zhuanhuanji: true,
		marktext: "拒",
		intro: {
			content(storage) {
				if (storage) return "当你使用【杀】指定一名角色为目标后，你可以获得其一张牌，然后你本回合不能再对其使用牌";
				return "当你成为其他角色使用【杀】的目标后，你可以与其各摸一张牌，然后其本回合不能再对你使用牌";
			},
		},
		trigger: {
			player: "useCardToPlayered",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (event.card.name != "sha") return false;
			if (!player.storage.jujiang) return player != event.player;
			return player == event.player && event.target.countGainableCards(player, "he");
		},
		logTarget(event, player) {
			return player.storage.jujiang ? event.target : event.player;
		},
		check(event, player) {
			const target = get.info("jujiang").logTarget(event, player);
			return get.attitude(player, target) < 0;
		},
		prompt2(event, player) {
			const target = get.info("jujiang").logTarget(event, player);
			return player.storage.jujiang ? `获得${get.translation(target)}一张牌，然后你本回合不能再对其使用牌` : `与${get.translation(target)}各摸一张牌，然后其本回合不能再对你使用牌`;
		},
		async content(event, trigger, player) {
			const { name: skill } = event,
				target = get.info(skill).logTarget(trigger, player);
			player.changeZhuanhuanji(skill);
			const storage = player.storage[skill];
			const list = [player, target];
			if (storage) {
				await game.asyncDraw([player, target].sortBySeat());
				await game.delayx();
				list.reverse();
			} else {
				await player.gainPlayerCard(target, "he", true);
			}
			list[0].addTempSkill(skill + "_effect");
			list[0].markAuto(skill + "_effect", [list[1]]);
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				mod: {
					playerEnabled(card, player, target) {
						if (player.getStorage("jujiang_effect").includes(target)) return false;
					},
				},
				intro: { content: "本回合不能对$使用牌" },
			},
		},
	},

	// ===================== 陈到：往烈 =====================
	// 出牌阶段开始时，你可以选择一张手牌，你于此阶段内：使用此牌无距离限制且不能被响应；
	// 使用此牌结算结束后不能再对其他角色使用牌。
	// 与官方版机制不同（官方为“前两张牌无距离限制”），重新设计为“预先选定单张手牌”。
	dcwanglie: {
		audio: "drlt_wanglie",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard("h", "往烈：选择一张手牌，你于本阶段内使用此牌无距离限制且不能被响应，结算结束后不能再对其他角色使用牌")
				.set("ai", card => 5 - get.value(card))
				.forResult();
		},
		async content(event, trigger, player) {
			const [card] = event.cards;
			player.addTempSkill("dcwanglie_effect", "phaseUseAfter");
			player.markAuto("dcwanglie_effect", [card]);
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				mod: {
					targetInRange(card, player, target) {
						if (player.getStorage("dcwanglie_effect").includes(card)) return true;
					},
				},
				trigger: { player: "useCard" },
				filter(event, player) {
					return player.getStorage("dcwanglie_effect").includes(event.card);
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					if (trigger.targets && trigger.targets.length) {
						trigger.directHit.addArray(trigger.targets);
					}
					player.addTempSkill("dcwanglie_ban", "phaseUseAfter");
				},
			},
			ban: {
				charlotte: true,
				mod: {
					playerEnabled(card, player, target) {
						if (target != player) return false;
					},
				},
				intro: { content: "本阶段结算后不能再对其他角色使用牌" },
			},
		},
	},

	// ===================== 诸葛瞻：罪论/父荫 =====================
	// 罪论：结束阶段，你可以观看牌堆顶三张牌，你每满足以下一项便获得其中的一张，然后将其余牌以任意顺序置于牌堆顶：
	// 1.你于此回合内造成过伤害；2.你于此回合内未弃置过牌；3.手牌数为全场最少。若均不满足，你与一名其他角色各失去1点体力。
	xinfu_zuilun: {
		aiShowTag: "defense",
		audio: 2,
		trigger: {
			player: "phaseJieshuBegin",
		},
		check(event, player) {
			let num = 0;
			if (player.hasHistory("lose", evt => evt.type == "discard")) num++;
			if (!player.isMinHandcard()) num++;
			if (!player.getStat("damage")) num++;
			if (num == 3) return player.hp >= 2;
			return true;
		},
		prompt(event, player) {
			let num = 3;
			if (player.hasHistory("lose", evt => evt.type == "discard")) num--;
			if (!player.isMinHandcard()) num--;
			if (!player.getStat("damage")) num--;
			return get.prompt("xinfu_zuilun") + "（可获得" + get.cnNumber(num) + "张牌）";
		},
		async content(event, trigger, player) {
			let num = 0;
			const cards = get.cards(3);
			await game.cardsGotoOrdering(cards);
			if (player.hasHistory("lose", evt => evt.type == "discard")) num++;
			if (!player.isMinHandcard()) num++;
			if (!player.getStat("damage")) num++;
			if (num == 0) {
				await player.gain(cards, "draw");
				return;
			}
			let prompt = "罪论：将" + get.cnNumber(num) + "张牌置于牌堆顶";
			if (num < 3) prompt += "并获得其余的牌";
			const chooseToMove = player.chooseToMove(prompt, true);
			if (num < 3) {
				chooseToMove.set("list", [["牌堆顶", cards], ["获得"]]);
				chooseToMove.set("filterMove", (from, to, moved) => {
					if (to == 1 && moved[0].length <= _status.event.num) return false;
					return true;
				});
				chooseToMove.set("filterOk", moved => moved[0].length == _status.event.num);
			} else {
				chooseToMove.set("list", [["牌堆顶", cards]]);
			}
			chooseToMove.set("num", num);
			chooseToMove.set("processAI", list => {
				const check = card => {
					const player = _status.event.player;
					const next = player.next;
					const att = get.attitude(player, next);
					const judge = next.getCards("j")[tops.length];
					if (judge) return get.judge(judge)(card) * att;
					return next.getUseValue(card) * att;
				};
				const cards2 = list[0][1].slice(0),
					tops = [];
				while (tops.length < _status.event.num) {
					list.sort((a, b) => check(b) - check(a));
					tops.push(cards2.shift());
				}
				return [tops, cards2];
			});
			let result = await chooseToMove.forResult();
			if (result.bool) {
				const list = result.moved[0];
				cards.removeArray(list);
				await game.cardsGotoPile(list.reverse(), "insert");
			}
			game.updateRoundNumber();
			if (cards.length) {
				await player.gain(cards, "draw");
				return;
			}
			const chooseTarget = player.chooseTarget("请选择一名角色，与其一同失去1点体力", true, (card, player, target) => target != player);
			chooseTarget.ai = target => -get.attitude(_status.event.player, target);
			result = await chooseTarget.forResult();
			player.line(result.targets[0], "fire");
			await player.loseHp();
			await result.targets[0].loseHp();
		},
	},
	// 父荫：锁定技，当你每回合第一次成为【杀】或【决斗】的目标后，若你的手牌数小于等于使用者，此牌对你无效。
	xinfu_fuyin: {
		trigger: {
			target: "useCardToTargeted",
		},
		forced: true,
		audio: 2,
		filter(event, player) {
			if (event.player.countCards("h") < player.countCards("h")) return false;
			if (event.card.name != "sha" && event.card.name != "juedou") return false;
			return !game.hasPlayer2(current => current.getHistory("useCard", evt => evt != event.getParent() && evt.card && ["sha", "juedou"].includes(evt.card.name) && evt.targets.includes(player)).length > 0);
		},
		async content(event, trigger, player) {
			trigger.getParent().excluded.add(player);
		},
		ai: {
			effect: {
				target(card, player, target) {
					const hs = player.getCards("h", i => i !== card && (!card.cards || !card.cards.includes(i))),
						num = player.getCardUsable("sha");
					if ((card.name !== "sha" && card.name !== "juedou") || hs.length < target.countCards("h")) return 1;
					if (num <= 1 && card.name === "sha") return 1;
					return "zeroplayertarget";
				},
			},
		},
	},

// ============ 糜芳 hb_meifang（全新原创，无官方同名武将） ============
	// 火厄：锁定技，结束阶段，你视为对至多四名其他角色使用一张【火攻】，若能造成伤害，
	// 须造成伤害并取消剩余目标（否则当前目标观看你的手牌）。最后你分配因此展示的牌，
	// 点数之和小于13则失去1点体力。
	hb_huoe: {
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.hasCards("h"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget([1, 4], true, "火厄：视为对至多四名其他角色使用一张【火攻】", (card, player, target) => target != player && target.hasCards("h"))
				.set("ai", target => get.effect(target, { name: "sha", nature: "fire" }, player, target))
				.forResult();
		},
		async content(event, trigger, player) {
			if (!event.targets || !event.targets.length) {
				return;
			}
			const targets = event.targets.sortBySeat();
			const shown = [];
			for (const target of targets) {
				if (!target.isIn() || !target.hasCards("h")) {
					continue;
				}
				const showResult = await target
					.chooseCard(true, "h", "火厄：请选择要展示的一张手牌")
					.set("ai", card => Math.random())
					.forResult();
				if (!showResult?.bool || !showResult.cards.length) {
					continue;
				}
				const shownCard = showResult.cards[0];
				await target.showCards([shownCard], `${get.translation(target)}因"火厄"展示的牌`);
				shown.push(shownCard);
				const suit = get.suit(shownCard, target);
				const canDamage = player.countCards("h", card => get.suit(card, player) == suit) > 0;
				if (canDamage) {
					const discardResult = await player
						.chooseCard("h", true, `火厄：弃置一张${get.translation(suit)}牌，对${get.translation(target)}造成1点火焰伤害`, card => get.suit(card, player) == suit)
						.set("ai", card => get.value(card, player))
						.forResult();
					if (discardResult?.bool && discardResult.cards.length) {
						await player.discard(discardResult.cards);
						await target.damage("fire");
						break;
					}
				} else {
					await target.viewHandcards(player);
				}
			}
			if (shown.length) {
				for (const card of shown) {
					const result = await player
						.chooseTarget(true, `火厄：选择一名角色获得${get.translation(card)}`)
						.set("ai", target => get.attitude(player, target))
						.forResult();
					const target = result?.bool ? result.targets[0] : player;
					await target.gain(card, "gain2");
				}
				const sum = shown.reduce((num, card) => num + get.number(card), 0);
				if (sum < 13) {
					await player.loseHp();
				}
			}
		},
		ai: {
			threaten: 1.5,
		},
	},
	// 贪惏：锁定技，你需要弃牌的弃牌阶段改为摸牌阶段。
	hb_tanlin: {
		trigger: { player: "phaseDiscardBegin" },
		forced: true,
		filter(event, player) {
			return player.needsToDiscard() > 0;
		},
		async content(event, trigger, player) {
			const num = player.needsToDiscard();
			trigger.cancel();
			await player.draw(num);
		},
	},

	// ============ 邓芝 re_dengzhi ============
	// 简亮：准备阶段，若你的手牌数不为全场最多，你可以与你势力相同的所有角色各摸一张牌。
	// 跟官方版（选择至多两名角色摸牌）不同：改为全势力联动摸牌，代价是有手牌数门槛限制。
	jianliang: {
		aiShowTag: "support",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			const max = Math.max(...game.players.map(current => current.countCards("h")));
			return player.countCards("h") < max;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("jianliang"), "令与你势力相同的所有角色各摸一张牌")
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const targets = game.filterPlayer(current => current.isFriendOf(player)).sortBySeat();
			await game.asyncDraw(targets);
		},
	},
	// 危盟：出牌阶段限一次，你可以获得一名其他角色一个区域内的至多X张牌，然后交给其等量的牌
	// （X为你的体力上限）。跟官方版（按点数差决定摸牌/弃牌）不同：改为纯粹的等量置换。
	weimeng: {
		aiShowTag: "support",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.hasCards("hej"));
		},
		filterTarget(card, player, target) {
			return target != player && target.hasCards("hej");
		},
		async content(event, trigger, player) {
			const { target } = event;
			const x = player.maxHp;
			const zones = ["h", "e", "j"].filter(pos => target.countCards(pos) > 0);
			let position = zones[0];
			if (zones.length > 1) {
				const zresult = await player
					.chooseControl(zones)
					.set("prompt", "危盟：选择获得的区域")
					.set(
						"choiceList",
						zones.map(z => ({ h: "手牌区", e: "装备区", j: "判定区" })[z] || z)
					)
					.set("ai", () => 0)
					.forResult();
				position = zresult.control;
			}
			const result = await player.gainPlayerCard(target, position, true, [1, x]).forResult();
			if (result?.bool && result.cards && result.cards.length) {
				const num = result.cards.length;
				await player.chooseToGive(target, "he", true, `危盟：交给${get.translation(target)}${get.cnNumber(num)}张牌`, num);
			}
		},
		ai: {
			order: 6,
			result: {
				player: 1,
			},
		},
	},

	// ============ 宗预 zongyu ============
	// 气傲：每名角色的回合限两次，当你成为其他势力角色使用牌的目标后，你可以弃置其一张牌，
	// 然后你弃置一张牌。
	zyqiao: {
		aiShowTag: "support",
		aiShowCost: true,
		trigger: { target: "useCardToTargeted" },
		usable: 2,
		logTarget: "player",
		preHidden: true,
		filter(event, player) {
			const source = event.player;
			if (source == player || source.isFriendOf(player)) {
				return false;
			}
			return source.countDiscardableCards(player, "he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("zyqiao"), `弃置${get.translation(trigger.player)}的一张牌，然后弃置你的一张牌`)
				.set("ai", () => get.attitude(player, trigger.player) < 0)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discardPlayerCard(trigger.player, true, "he");
			if (player.countCards("he", card => lib.filter.cardDiscardable(card, player, "zyqiao"))) {
				await player.chooseToDiscard("he", true);
			}
		},
	},
	// 承赏：每名角色回合限一次，当你对其他势力角色使用的牌结算结束后，若此牌未造成过伤害，
	// 你可以检索并获得弃牌堆中与此牌花色相同的一张牌。
	chengshang: {
		aiShowTag: "defense",
		trigger: { player: "useCardAfter" },
		usable: 1,
		preHidden: true,
		filter(event, player) {
			if (!lib.suit.includes(get.suit(event.card, player))) {
				return false;
			}
			if (player.getHistory("sourceDamage", evt => evt.card == event.card).length) {
				return false;
			}
			return !!(event.targets && event.targets.some(target => target != player && target.isEnemyOf(player)));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("chengshang"), "检索并获得弃牌堆中与此牌花色相同的一张牌")
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const suit = get.suit(trigger.card, player);
			const card = get.cardPile2(c => get.suit(c, false) == suit);
			if (card) {
				await player.gain(card, "gain2");
			}
		},
	},

	// ============ 刘巴 dc_liuba ============
	// 统度：每名与你势力相同的角色的结束阶段，该角色可以摸X张牌
	// （X为其本回合弃牌阶段弃置的牌数且至多为3）。
	dctongdu: {
		aiShowTag: "draw",
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return event.player.isFriendOf(player);
		},
		logTarget: event => event.player,
		async content(event, trigger, player) {
			const target = trigger.player;
			const num = Math.min(
				3,
				target.getHistory("lose", evt => evt.type == "discard" && evt.getParent("phaseDiscard")).reduce((sum, evt) => sum + (evt.cards ? evt.cards.length : 0), 0)
			);
			if (num <= 0) {
				return;
			}
			const result = await target
				.chooseBool(`统度：是否摸${get.cnNumber(num)}张牌？`)
				.set("ai", () => true)
				.forResult();
			if (result.bool) {
				await target.draw(num);
			}
		},
	},
	// 归隐：限定技，出牌阶段，你可以令所有与你势力相同的角色各回复一点体力，然后你变更此武将。
	// 因引擎限制没有"更换为另一个武将"的合理对象，这里将"变更此武将"实现为你失去〖统度〗和
	// 〖归隐〗（即刘巴归隐后不再对外发挥这两项能力）。
	dcguiyin: {
		aiShowTag: "recover",
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		filter(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const targets = game.filterPlayer(current => current.isFriendOf(player) && current.hp < current.maxHp);
			for (const target of targets) {
				await target.recover();
			}
			player.removeSkill("dctongdu");
			player.removeSkill("dcguiyin");
		},
	},

	// ============ 杨婉 yangwan ============
	// 诱言：你的回合内限一次，当你的牌因弃置而置入弃牌堆时，你可以展示牌堆顶的四张牌，然后
	// 获得其中与你此次弃置的牌花色均不同的牌。
	youyan: {
		aiShowTag: "defense",
		trigger: { player: ["loseAfter", "loseAsyncAfter"] },
		usable: 1,
		filter(event, player) {
			if (player != _status.currentPhase) {
				return false;
			}
			if (event.type != "discard" || event.getlx === false) {
				return false;
			}
			return !!(event.cards && event.cards.length);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("youyan"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const suits = new Set();
			for (const c of trigger.cards) {
				suits.add(get.suit(c, player));
			}
			const cards = get.cards(4);
			await game.cardsGotoOrdering(cards);
			await player.showCards(cards, `${get.translation(player)}发动了"诱言"`);
			const gains = cards.filter(card => !suits.has(get.suit(card, false)));
			if (gains.length) {
				await player.gain(gains, "gain2");
			}
		},
	},
	// 追还：回合结束时，你可以选择至多两名角色，其中一名角色下一次受到伤害后，其对来源造成
	// 1点伤害；另一名角色下一次受到伤害后，伤害来源弃置两张手牌。
	zhuihuan: {
		trigger: { player: "phaseJieshuBegin" },
		async content(event, trigger, player) {
			const result1 = await player
				.chooseTarget("追还：选择一名角色，其下一次受到伤害后，将对伤害来源造成1点伤害")
				.set("ai", target => get.attitude(player, target))
				.forResult();
			const target1 = result1?.bool ? result1.targets[0] : null;
			const result2 = await player
				.chooseTarget("追还：选择一名角色，其下一次受到伤害后，伤害来源将弃置两张手牌", (card, player, target) => target != target1)
				.set("ai", target => get.attitude(player, target))
				.forResult();
			const target2 = result2?.bool ? result2.targets[0] : null;
			if (target1 && target1.isIn()) {
				target1.addTempSkill("zhuihuan_counter");
			}
			if (target2 && target2.isIn()) {
				target2.addTempSkill("zhuihuan_discard");
			}
		},
		subSkill: {
			counter: {
				charlotte: true,
				trigger: { player: "damageEnd" },
				forced: true,
				filter(event, player) {
					return !!(event.source && event.source.isIn() && event.source != player);
				},
				async content(event, trigger, player) {
					player.removeSkill("zhuihuan_counter");
					await trigger.source.damage(1, player);
				},
			},
			discard: {
				charlotte: true,
				trigger: { player: "damageEnd" },
				forced: true,
				filter(event, player) {
					return !!(event.source && event.source.isIn() && event.source.countCards("h") > 0);
				},
				async content(event, trigger, player) {
					player.removeSkill("zhuihuan_discard");
					await trigger.source.chooseToDiscard("h", 2, true);
				},
			},
		},
	},

	// ============ 杨仪 yangyi ============
	// 度斩：每回合限一次，当你成为【杀】的目标后，你可以重铸一张牌，然后令此【杀】的使用者
	// 选择一项：1.摸两张牌，令此【杀】无效；2.弃置一张牌，令此【杀】不可被响应。
	// 跟官方"度断"同源改名而来。
	duzhan: {
		aiShowTag: "draw",
		aiShowCost: true,
		trigger: { target: "useCardToTargeted" },
		usable: 1,
		filter(event, player) {
			return event.card.name == "sha" && player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard("he", get.prompt2(event.skill), lib.filter.cardRecastable)
				.set("ai", card => (_status.event.goon ? 8 - get.value(card) : 0))
				.set("goon", get.attitude(trigger.player, player) <= 0)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.recast(event.cards);
			const bool = trigger.player.countCards("he", card => lib.filter.cardDiscardable(card, trigger.player, "duzhan")) > 0;
			const result = bool
				? await trigger.player
						.chooseControl()
						.set("choiceList", [`令其摸两张牌，然后令${get.translation(trigger.card)}对你无效`, `令其弃置一张牌，然后你不可响应${get.translation(trigger.card)}`])
						.set("prompt", `度斩：令${get.translation(trigger.player)}执行一项`)
						.set("ai", () => (get.attitude(_status.event.player, _status.event.getTrigger().player) > 0 ? 0 : 1))
						.forResult()
				: { index: 0 };
			if (result.index == 0) {
				await trigger.player.draw(2);
				trigger.excluded.add(player);
			} else {
				const result2 = await trigger.player
					.chooseToDiscard("he", true)
					.set("prompt", `弃置一张牌令${get.translation(player)}不能闪避此【杀】`)
					.forResult();
				if (result2?.bool) {
					trigger.directHit.add(player);
				}
			}
		},
	},
	// 共损：出牌阶段开始时，你可以弃置两张牌并选择一名其他角色，然后你选择一个基本牌或普通
	// 锦囊牌的牌名，直至你的下个回合开始前或你死亡时，你与其均无法使用、打出或弃置该牌名的
	// 手牌。
	gongsun: {
		aiShowTag: "support",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("he") > 1 && game.hasPlayer(current => current != player);
		},
		async content(event, trigger, player) {
			const result1 = await player
				.chooseCardTarget({
					prompt: "共损：弃置两张牌并选择一名其他角色",
					selectCard: 2,
					filterCard: lib.filter.cardDiscardable,
					filterTarget: lib.filter.notMe,
				})
				.forResult();
			if (!result1?.bool) {
				return;
			}
			const target = result1.targets[0];
			await player.discard(result1.cards);
			player.addTempSkill("gongsun_shadow", { player: ["phaseBegin", "die"] });
			const list = [];
			for (const name of lib.inpile) {
				const type = get.type(name);
				if (type == "trick") {
					list.push(["锦囊", "", name]);
				} else if (type == "basic") {
					list.push(["基本", "", name]);
				}
			}
			const result2 = await player
				.chooseButton(["共损：选择一个牌名", [list, "vcard"], true])
				.set("ai", button => (button.link[2] == "sha" ? 1 : 0))
				.forResult();
			if (!player.storage.gongsun_shadow) {
				player.storage.gongsun_shadow = [];
			}
			player.storage.gongsun_shadow.push([target, result2.links[0][2]]);
			player.popup(result2.links[0][2], "soil");
			player.markSkill("gongsun_shadow");
		},
		subSkill: {
			shadow: {
				global: "gongsun_shadow2",
				sourceSkill: "gongsun",
				init(player, skill) {
					if (!player.storage[skill]) {
						player.storage[skill] = [];
					}
				},
				marktext: "损",
				onremove: true,
				intro: {
					content(shadow) {
						return shadow.map(s => `${get.translation(s[0])}：${get.translation(s[1])}`).join("<br>");
					},
				},
				mod: {
					cardEnabled(card, player) {
						if (player.storage.gongsun_shadow.some(s => s[1] == card.name)) {
							return false;
						}
					},
					cardRespondable(card, player) {
						if (player.storage.gongsun_shadow.some(s => s[1] == card.name)) {
							return false;
						}
					},
					cardDiscardable(card, player) {
						if (player.storage.gongsun_shadow.some(s => s[1] == card.name)) {
							return false;
						}
					},
				},
			},
			shadow2: {
				mod: {
					cardEnabled(card, player) {
						if (game.hasPlayer(current => (current.storage.gongsun_shadow || []).some(s => s[0] == player && s[1] == card.name))) {
							return false;
						}
					},
					cardRespondable(card, player) {
						if (game.hasPlayer(current => (current.storage.gongsun_shadow || []).some(s => s[0] == player && s[1] == card.name))) {
							return false;
						}
					},
					cardDiscardable(card, player) {
						if (game.hasPlayer(current => (current.storage.gongsun_shadow || []).some(s => s[0] == player && s[1] == card.name))) {
							return false;
						}
					},
				},
			},
		},
	},

	// ============ 龙羽飞 longyufei（重做自官方原创角色，技能同名沿用） ============
	// 龙裔：你可以将所有手牌当任意一张基本牌使用或打出（每种牌名每回合限一次）。若其中有
	// 锦囊牌，你摸一张牌；若其中有装备牌，此牌不可被响应。跟官方版不同：加入了"每种牌名
	// 每回合限一次"的限制。
	longyi: {
		enable: ["chooseToUse", "chooseToRespond"],
		filter(event, player) {
			if (event.type == "wuxie") {
				return false;
			}
			const hs = player.getCards("h");
			if (!hs.length) {
				return false;
			}
			for (const i of hs) {
				if (game.checkMod(i, player, "unchanged", "cardEnabled2", player) === false) {
					return false;
				}
			}
			const used = player
				.getHistory("useCard", evt => evt.skill == "longyi_backup")
				.map(evt => evt.card.name)
				.concat(player.getHistory("respond", evt => evt.skill == "longyi_backup").map(evt => evt.card.name));
			for (const i of lib.inpile) {
				if (i == "du" || used.includes(i) || get.type(i) != "basic") {
					continue;
				}
				if (i == "sha") {
					for (const j of lib.inpile_nature) {
						if (event.filterCard({ name: i, nature: j, cards: hs }, player, event)) {
							return true;
						}
					}
				} else if (event.filterCard({ name: i, cards: hs }, player, event)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				const vcards = [];
				const hs = player.getCards("h");
				const used = player
					.getHistory("useCard", evt => evt.skill == "longyi_backup")
					.map(evt => evt.card.name)
					.concat(player.getHistory("respond", evt => evt.skill == "longyi_backup").map(evt => evt.card.name));
				for (const i of lib.inpile) {
					if (i == "du" || used.includes(i) || get.type(i) != "basic") {
						continue;
					}
					if (i == "sha") {
						for (const j of lib.inpile_nature) {
							if (event.filterCard({ name: i, nature: j, cards: hs }, player, event)) {
								vcards.push(["基本", "", i, j]);
							}
						}
					} else if (event.filterCard({ name: i, cards: hs }, player, event)) {
						vcards.push(["基本", "", i]);
					}
				}
				return ui.create.dialog("龙裔", [vcards, "vcard"]);
			},
			check(button, player) {
				if (_status.event.getParent().type != "phase") {
					return 1;
				}
				return _status.event.player.getUseValue({ name: button.link[2], nature: button.link[3] });
			},
			backup(links, player) {
				return {
					audio: "longyi",
					popname: true,
					viewAs: { name: links[0][2], nature: links[0][3] },
					filterCard: true,
					selectCard: -1,
					position: "h",
				};
			},
			prompt(links, player) {
				return `将所有手牌当做${get.translation(links[0][3]) || ""}${get.translation(links[0][2])}使用或打出（每种牌名每回合限一次）`;
			},
		},
		hiddenCard(player, name) {
			if (name == "du" || get.type(name) != "basic" || !player.countCards("h")) {
				return false;
			}
			const used = player
				.getHistory("useCard", evt => evt.skill == "longyi_backup")
				.map(evt => evt.card.name)
				.concat(player.getHistory("respond", evt => evt.skill == "longyi_backup").map(evt => evt.card.name));
			return !used.includes(name);
		},
		ai: {
			respondSha: true,
			respondShan: true,
			skillTagFilter(player) {
				return player.countCards("h") > 0;
			},
			order: 0.5,
			result: {
				player(player) {
					if (_status.event.dying) {
						return get.attitude(player, _status.event.dying);
					}
					if (_status.event.type == "respondShan") {
						return 1;
					}
					let val = 0;
					const hs = player.getCards("h");
					let max = 0;
					for (const i of hs) {
						val += get.value(i, player);
						if (get.type(i, null, player) == "trick") {
							max += 5;
						}
					}
					if (player.hasSkill("zhenjue")) {
						max += 7;
					}
					return val <= max ? 1 : 0;
				},
			},
		},
		group: "longyi_effect",
		subSkill: {
			effect: {
				trigger: { player: ["useCard", "respond"] },
				forced: true,
				charlotte: true,
				popup: false,
				filter(event, player) {
					if (event.skill != "longyi_backup") {
						return false;
					}
					for (const i of event.cards) {
						const type = get.type2(i, player);
						if (type == "equip" || type == "trick") {
							return true;
						}
					}
					return false;
				},
				async content(event, trigger, player) {
					const map = {};
					for (const i of trigger.cards) {
						map[get.type2(i, player)] = true;
					}
					if (map.trick) {
						await player.draw();
					}
					if (map.equip && trigger.directHit) {
						trigger.directHit.addArray(game.players);
					}
				},
			},
			backup: {},
		},
	},
	// 阵绝：当前回合角色结束阶段，若你没有手牌，你可以令其选择一项：1.弃一张牌；2.令你摸一张牌。
	zhenjue: {
		aiShowTag: "draw",
		aiShowCost: true,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return !player.hasCards("h");
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const result = await trigger.player
				.chooseToDiscard({
					position: "he",
					prompt: `弃置一张牌，或令${get.translation(player)}摸一张牌`,
					ai: card => (_status.event.goon ? 7 - get.value(card) : -get.value(card)),
				})
				.set("goon", get.attitude(trigger.player, player) < 0)
				.forResult();
			if (result.bool) {
				return;
			}
			await player.draw();
		},
	},

	// ============ 孟达 pe_mengda（此卡组归入蜀势力） ============
	// 求安：当你受到伤害时：若你没有"函"，你可以将造成此伤害的牌置于武将牌上（称为"函"），
	// 然后防止此伤害；若你有"函"，你可以将"函"转移给一名其他角色。跟官方"pe_mengda"版
	// 相比新增了"函"的转移分支。
	qiuan: {
		aiShowTag: "defense",
		trigger: { player: "damageBegin4" },
		preHidden: true,
		filter(event, player) {
			if (player.getExpansions("qiuan").length) {
				return game.hasPlayer(current => current != player);
			}
			return !!(event.cards && event.cards.filterInD().length);
		},
		async cost(event, trigger, player) {
			if (player.getExpansions("qiuan").length) {
				event.result = await player
					.chooseTarget("求安：是否将“函”转移给一名其他角色？", (card, player, target) => target != player)
					.set("ai", target => -get.attitude(player, target))
					.forResult();
			} else {
				event.result = await player
					.chooseBool(get.prompt("qiuan"), "防止此伤害并将造成此伤害的牌置于武将牌上")
					.set("ai", () => true)
					.forResult();
			}
		},
		async content(event, trigger, player) {
			if (player.getExpansions("qiuan").length) {
				const target = event.targets[0];
				const cards = player.getExpansions("qiuan");
				await target.addToExpansion({ cards, source: player, animate: "gain2", gaintag: ["qiuan"] });
			} else {
				const cards = trigger.cards.filterInD();
				await player.addToExpansion({ cards, animate: "gain2", gaintag: ["qiuan"] });
				trigger.cancel();
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		marktext: "函",
	},
	// 量反：准备阶段开始时，有"函"的角色获得其"函"，然后失去1点体力。若其为你，当你于
	// 本回合使用因此获得的"函"造成伤害后，你可以获得受伤角色的一张牌；若其不为你，你获得
	// 其一张牌。
	liangfan: {
		trigger: { global: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return event.player.getExpansions("qiuan").length > 0;
		},
		logTarget: event => event.player,
		async content(event, trigger, player) {
			const owner = trigger.player;
			const cards = owner.getExpansions("qiuan");
			const isSelf = owner == player;
			const next = owner.gain({ cards, animate: "gain2", gaintag: ["liangfan"] });
			if (isSelf) {
				player.addTempSkill("liangfan2");
			}
			await next;
			await owner.loseHp();
			if (!isSelf && owner.isIn() && owner.countGainableCards(player, "he")) {
				await player.gainPlayerCard(owner, "he", true).forResult();
			}
		},
	},
	liangfan2: {
		charlotte: true,
		mark: true,
		intro: { content: "使用因“量反”获得的牌造成伤害后，可获得目标角色的一张牌" },
		trigger: { source: "damageEnd" },
		logTarget: "player",
		sourceSkill: "liangfan",
		onremove(player) {
			player.removeGaintag("liangfan");
		},
		filter(event, player) {
			const evt = event.getParent(2);
			if (!evt || evt.name != "useCard" || evt.card != event.card) {
				return false;
			}
			if (!event.player.countGainableCards(player, "he")) {
				return false;
			}
			return (
				player.getHistory("lose", evt2 => {
					if (evt2.getParent() != evt) {
						return false;
					}
					for (const i in evt2.gaintag_map || {}) {
						if (evt2.gaintag_map[i].includes("liangfan")) {
							return true;
						}
					}
					return false;
				}).length > 0
			);
		},
		marktext: "反",
		async content(event, trigger, player) {
			await player.gainPlayerCard({ target: trigger.player, position: "he", forced: true });
		},
	},

// ============ 郝昭（haozhao） ============
	// 镇骨：结束阶段，你可以选择一名其他角色，你的回合结束时和该角色的下个回合结束时，
	// 其将手牌摸至或弃至与你手牌数相同（最多摸至五张）。与官方"drlt_zhengu"同名同效，沿用其id。
	drlt_zhengu: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("drlt_zhengu"), (card, player, target) => target != player).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.isIn()) {
				return;
			}
			const num = Math.min(5, player.countCards("h"));
			const num2 = target.countCards("h");
			if (num2 < num) {
				await target.drawTo(num);
			} else if (num2 > num) {
				await target.chooseToDiscard(num2 - num, true, "h", "allowChooseAll").forResult();
			}
			player.storage.drlt_zhengu_target = target;
			player.addTempSkill("drlt_zhengu_buff");
		},
	},
	drlt_zhengu_buff: {
		charlotte: true,
		onremove: "storage",
		trigger: { global: "phaseJieshuBegin" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.player === player.storage.drlt_zhengu_target && event.player.isIn();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const num = Math.min(5, player.countCards("h"));
			const num2 = target.countCards("h");
			if (num2 < num) {
				await target.drawTo(num);
			} else if (num2 > num) {
				await target.chooseToDiscard(num2 - num, true, "h", "allowChooseAll").forResult();
			}
			player.removeSkill("drlt_zhengu_buff");
		},
	},

	// ============ 司马昭（simazhao） ============
	// 昭然：出牌阶段开始时，你可以令你的手牌对所有角色可见直到此阶段结束。若如此做，当你于本阶段
	// 失去任意花色的最后一张手牌时（每种花色限一次），你摸一张牌或弃置一名其他角色的一张牌。
	// 与yingbian包jin_simazhao的"zhaoran"同名同效，沿用其id（简化了展示牌的具体呈现方式）。
	zhaoran: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		frequent: true,
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zhaoran")).forResult();
		},
		async content(event, trigger, player) {
			player.storage.zhaoran_suits = [];
			if (player.countCards("h")) {
				await player.showCards(player.getCards("h"), `${get.translation(player)}发动了【昭然】`);
			}
			player.addTempSkill("zhaoran_buff", "phaseUseAfter");
		},
	},
	zhaoran_buff: {
		aiShowTag: "defense",
		charlotte: true,
		onremove: "storage",
		trigger: { player: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (event.getlx === false || !event.hs || !event.hs.length) {
				return false;
			}
			const suits = event.hs.map(card => get.suit(card, player));
			return suits.some(suit => !player.storage.zhaoran_suits.includes(suit) && !player.countCards("h", card => get.suit(card, player) == suit));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("昭然：是否摸一张牌或弃置一名其他角色的一张牌？").forResult();
		},
		async content(event, trigger, player) {
			const suits = new Set((trigger.hs || []).map(card => get.suit(card, player)));
			for (const suit of suits) {
				if (!player.storage.zhaoran_suits.includes(suit) && !player.countCards("h", card => get.suit(card, player) == suit)) {
					player.storage.zhaoran_suits.push(suit);
				}
			}
			const choice = await player
				.chooseControl(["摸一张牌", "弃置一名其他角色的一张牌"], "cancel2")
				.set("prompt", "昭然")
				.forResult();
			if (choice.control == "摸一张牌") {
				await player.draw();
			} else if (choice.control == "弃置一名其他角色的一张牌") {
				const result = await player.chooseTarget("昭然：弃置一名其他角色的一张牌", (card, plyr, target) => target != player && target.countCards("he") > 0).forResult();
				if (result && result.bool && result.targets && result.targets.length) {
					await player.discardPlayerCard(result.targets[0], "he", true);
				}
			}
		},
	},
	// 筹伐：出牌阶段限一次，你可以展示一名其他角色一张手牌，令其当前手牌中与此牌类型不同的牌
	// 视为【杀】直到其回合结束。与yingbian包"xinchoufa"同名同效，沿用其id。
	xinchoufa: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const result = await player.choosePlayerCard(target, "h", true).forResult();
			if (!result || !result.cards || !result.cards.length) {
				return;
			}
			const card = result.cards[0];
			await target.showCards([card], `${get.translation(target)}被${get.translation(player)}展示的牌`);
			const type = get.type(card, null, target);
			const others = target.getCards("h", c => c !== card && get.type(c, null, target) != type);
			if (others.length) {
				target.storage.xinchoufa_cards = others;
				target.addTempSkill("xinchoufa_buff", "phaseAfter");
			}
		},
	},
	xinchoufa_buff: {
		charlotte: true,
		onremove: "storage",
		mod: {
			cardname(card, player) {
				if (get.itemtype(card) == "card" && player.storage.xinchoufa_cards && player.storage.xinchoufa_cards.includes(card)) {
					return "sha";
				}
			},
			cardnature(card, player) {
				if (get.itemtype(card) == "card" && player.storage.xinchoufa_cards && player.storage.xinchoufa_cards.includes(card)) {
					return false;
				}
			},
		},
	},

	// ============ 司马师（simashi） ============
	// 夷灭：每回合限一次，当你于回合内对其他角色造成伤害时，你可以失去1点体力，然后令此伤害增加
	// 至其体力值，结算完成后，若其未死亡，其回复等同于伤害增加值的体力。
	yimie: {
		aiShowTag: "support",
		audio: 2,
		usable: 1,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return _status.currentPhase === player && event.player && event.player != player && event.player.isIn() && player.hp > 1 && event.num < event.player.hp;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("yimie")).forResult();
		},
		async content(event, trigger, player) {
			await player.loseHp();
			const target = trigger.player;
			const delta = target.hp - trigger.num;
			trigger.num = target.hp;
			target.storage.yimie_delta = (target.storage.yimie_delta || 0) + delta;
			target.addTempSkill("yimie_recover", "phaseAfter");
		},
	},
	yimie_recover: {
		charlotte: true,
		onremove: "storage",
		trigger: { player: "damageEnd" },
		forced: true,
		popup: false,
		filter(event, player) {
			return player.storage.yimie_delta > 0;
		},
		async content(event, trigger, player) {
			const delta = player.storage.yimie_delta;
			player.storage.yimie_delta = 0;
			player.removeSkill("yimie_recover");
			if (player.isIn()) {
				await player.recover(delta);
			}
		},
	},
	// 泰然：锁定技，回合结束时，你回复体力至上限且手牌摸至体力上限；出牌阶段开始时，你失去上
	// 回合以此法回复的体力，弃置以此法获得的手牌。
	tairan: {
		audio: 2,
		trigger: { player: ["phaseAfter", "phaseUseBegin"] },
		forced: true,
		popup: false,
		filter(event, player, name) {
			if (name == "phaseUseBegin") {
				return player.storage.tairan_hp > 0 || (player.storage.tairan_cards || []).length > 0;
			}
			return player.hp < player.maxHp || player.countCards("h") < player.maxHp;
		},
		async content(event, trigger, player) {
			if (event.triggername == "phaseUseBegin") {
				const hpLoss = player.storage.tairan_hp || 0;
				const cards = (player.storage.tairan_cards || []).filter(card => player.getCards("h").includes(card));
				player.storage.tairan_hp = 0;
				player.storage.tairan_cards = [];
				if (cards.length) {
					await player.discard(cards);
				}
				if (hpLoss > 0) {
					await player.loseHp(hpLoss);
				}
				return;
			}
			const hpGain = Math.max(0, player.maxHp - player.hp);
			if (hpGain) {
				await player.recover(hpGain);
			}
			player.storage.tairan_hp = hpGain;
			const cardGain = Math.max(0, player.maxHp - player.countCards("h"));
			if (cardGain) {
				const result = await player.draw(cardGain).forResult();
				player.storage.tairan_cards = (result && result.cards) || [];
			} else {
				player.storage.tairan_cards = [];
			}
		},
	},

	// ============ 贾充（dc_jiachong） ============
	// 凶竖：每回合限一次，一名角色使用【杀】或伤害类锦囊牌指定目标后，若你为此牌的使用者，你可以
	// 摸一张牌，然后令一名其他角色代替你称为此牌的伤害来源；若你不为此牌的使用者，你可以弃置
	// 一张牌，然后代替使用者成为此牌的伤害来源。
	xiongshu: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		usable: 1,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			if (event.card.name != "sha" && !(get.type(event.card) == "trick" && get.tag(event.card, "damage"))) {
				return false;
			}
			if (event.player == player) {
				return true;
			}
			return player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			if (trigger.player == player) {
				event.result = await player.chooseBool(get.prompt2("xiongshu")).forResult();
			} else {
				event.result = await player.chooseToDiscard("he", true).set("prompt2", get.prompt2("xiongshu")).forResult();
			}
		},
		async content(event, trigger, player) {
			if (!game.hasPlayer(current => current != player)) {
				return;
			}
			if (trigger.player == player) {
				await player.draw();
			}
			const result = await player.chooseTarget("凶竖：选择一名角色代替成为此牌的伤害来源", (card, plyr, target) => target != player).forResult();
			const target = result && result.targets && result.targets[0];
			if (!target) {
				return;
			}
			const useEvent = trigger.getParent();
			if (useEvent) {
				useEvent.customArgs = useEvent.customArgs || {};
				useEvent.customArgs.default = useEvent.customArgs.default || {};
				useEvent.customArgs.default.customSource = target;
			}
		},
	},
	// 奸回：一名角色对与其势力相同的角色造成伤害后，你可以令伤害来源或受伤角色摸一张牌，然后
	// 你弃置其中另一名角色的一张牌。
	jianhui: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return event.player && event.source && event.source.isIn() && event.player.isIn() && event.source != event.player && event.source.isFriendOf(event.player);
		},
		async content(event, trigger, player) {
			const source = trigger.source;
			const victim = trigger.player;
			const result = await player
				.chooseControl(["伤害来源摸一张牌", "受伤角色摸一张牌"], "cancel2")
				.set("prompt", get.prompt2("jianhui"))
				.forResult();
			if (result.control == "cancel2") {
				return;
			}
			const drawer = result.control == "伤害来源摸一张牌" ? source : victim;
			const other = drawer == source ? victim : source;
			if (drawer.isIn()) {
				await drawer.draw();
			}
			if (other.isIn() && other.countCards("he")) {
				await player.discardPlayerCard(other, "he", true);
			}
		},
	},

	// ============ 夏侯惇（xiahoudun） ============
	// 刚烈：当你受到伤害后，你可以进行判定，若结果为：红色，你对伤害来源造成1点伤害；黑色，
	// 你弃置其一张牌。与官方版依黑桃/红桃判定的思路不同，改为按颜色判定，重新设计。
	ganglie: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("ganglie")).forResult();
		},
		async content(event, trigger, player) {
			const source = trigger.source;
			const result = await player
				.judge({
					judge(card) {
						return get.color(card) == "black" ? 1 : -1;
					},
					judge2() {
						return true;
					},
				})
				.forResult();
			if (!result || !result.card || !source || !source.isIn()) {
				return;
			}
			if (get.color(result.card) == "red") {
				await source.damage();
			} else if (source.countCards("he")) {
				await player.discardPlayerCard(source, "he", true);
			}
		},
	},
	// 清俭：每回合限一次，当你于摸牌阶段外获得牌后，你可以展示任意张牌并将这些牌交给一名其他角色。
	qingjian: {
		audio: 2,
		usable: 1,
		trigger: { player: "gainAfter" },
		filter(event, player) {
			if (event.getlx === false) {
				return false;
			}
			const parent = event.getParent();
			return !parent || parent.name != "phaseDraw";
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("qingjian")).forResult();
		},
		async content(event, trigger, player) {
			if (!player.countCards("he")) {
				return;
			}
			const result = await player
				.chooseCard({
					position: "he",
					forced: true,
					selectCard: [1, Infinity],
					prompt: "清俭：展示任意张牌",
				})
				.forResult();
			if (!result || !result.bool || !result.cards || !result.cards.length) {
				return;
			}
			const cards = result.cards;
			await player.showCards(cards, `${get.translation(player)}展示的牌`);
			const targetResult = await player.chooseTarget("清俭：将展示的牌交给一名其他角色", (card, plyr, target) => target != player).forResult();
			if (targetResult && targetResult.bool && targetResult.targets && targetResult.targets.length) {
				await player.give(cards, targetResult.targets[0]);
			}
		},
	},

	// ============ 甄姬（zhenji） ============
	// 倾国：你可以将一张黑色手牌当【闪】使用或打出。与官方版同名同效，沿用其id。
	qingguo: {
		aiShowTag: "support",
		audio: 2,
		enable: ["chooseToRespond", "chooseToUse"],
		filterCard(card) {
			return get.color(card) === "black";
		},
		viewAs: { name: "shan" },
		viewAsFilter(player) {
			return player.hasCards("hs", { color: "black" });
		},
		position: "hs",
		prompt: "将一张黑色手牌当【闪】使用或打出",
		check() {
			return 1;
		},
		ai: {
			order: 3,
			respondShan: true,
			skillTagFilter(player) {
				return player.hasCards("hs", { color: "black" });
			},
		},
	},
	// 洛神：准备阶段，你可以进行判定，若结果为黑色，你可以重复此流程，然后你获得其中所有的
	// 判定牌。与官方版同名同效，沿用其id。
	luoshen: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		frequent: true,
		preHidden: true,
		async content(event, trigger, player) {
			event.cards ??= [];
			while (true) {
				const result = await player
					.judge({
						judge(card) {
							return get.color(card) == "black" ? 1 : -1;
						},
						judge2(result) {
							return result.bool;
						},
					})
					.forResult();
				if (!result?.bool || !result.card) {
					break;
				}
				event.cards.push(result.card);
				const cont = await player.chooseBool("是否再次发动【洛神】？").set("frequentSkill", "luoshen").forResult();
				if (!cont?.bool) {
					break;
				}
			}
			if (event.cards.someInD("od")) {
				await player.gain({ cards: event.cards.filterInD("od"), animate: "gain2" });
			}
		},
	},
	// 神赋：每轮限一次，当你失去最后一张手牌时，你可以发动一次"洛神"。
	shenfu: {
		aiShowTag: "defense",
		audio: 2,
		round: 1,
		trigger: { player: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			return event.getlx !== false && !!event.hs && event.hs.length > 0 && player.countCards("h") === 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("shenfu")).forResult();
		},
		async content(event, trigger, player) {
			await lib.skill.luoshen.content(event, trigger, player);
		},
	},

	// ============ 夏侯渊（xiahouyuan） ============
	// 神速：你可以做出如下选择：1.跳过判定阶段和摸牌阶段；2.跳过出牌阶段并弃置一张装备牌；
	// 3.跳过弃牌阶段并叠置。你每选择一项，便视为你使用一张无距离限制的【杀】。
	shensu: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { player: ["phaseJudgeBefore", "phaseUseBefore", "phaseDiscardBefore"] },
		filter(event, player, name) {
			if (name == "phaseUseBefore") {
				return player.countCards("e") > 0;
			}
			return true;
		},
		async cost(event, trigger, player) {
			const prompts = {
				phaseJudgeBefore: "神速：是否跳过判定阶段和摸牌阶段，视为使用一张无距离限制的【杀】？",
				phaseUseBefore: "神速：是否跳过出牌阶段并弃置一张装备牌，视为使用一张无距离限制的【杀】？",
				phaseDiscardBefore: "神速：是否跳过弃牌阶段并叠置，视为使用一张无距离限制的【杀】？",
			};
			event.result = await player.chooseBool(prompts[event.triggername]).forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			if (event.triggername == "phaseJudgeBefore") {
				player.skip("phaseDraw");
			} else if (event.triggername == "phaseUseBefore") {
				if (player.countCards("e")) {
					await player.chooseToDiscard("e", true).forResult();
				}
			} else if (event.triggername == "phaseDiscardBefore") {
				player.storage.shensu_stacked = true;
				player.popup("叠置");
			}
			player.addTempSkill("shensu_userange");
			await player
				.chooseToUse({ name: "sha", isCard: true }, "###神速###视为使用一张无距离限制的【杀】")
				.set("complexSelect", true)
				.set("complexTarget", true)
				.forResult();
			player.removeSkill("shensu_userange");
		},
	},
	shensu_userange: {
		charlotte: true,
		mod: {
			targetInRange(card) {
				if (card.name == "sha") {
					return true;
				}
			},
		},
	},
	// 设变：锁定技，当你受到来自黑色牌的伤害后，可以复原武将牌。
	shebian: {
		audio: 2,
		trigger: { player: "damageEnd" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!event.card && get.color(event.card) == "black";
		},
		async content(event, trigger, player) {
			await player.link(false);
			await player.turnOver(false);
		},
	},

	// ============ 张郃（zhanghe） ============
	// 巧变：你可以弃置一张牌，跳过你的一个阶段（准备阶段和结束阶段除外）。当你因此跳过：
	// 摸牌阶段，你可以获得至多两名其他角色各一张手牌；出牌阶段，你可以移动场上的一张牌。
	// 与官方版"qiaobian"同名同效，沿用其id（简化了"置于牌堆顶"的替代弃牌方式）。
	qiaobian: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { player: ["phaseJudgeBefore", "phaseDrawBefore", "phaseUseBefore", "phaseDiscardBefore"] },
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			const names = { phaseJudgeBefore: "判定", phaseDrawBefore: "摸牌", phaseUseBefore: "出牌", phaseDiscardBefore: "弃牌" };
			event.result = await player
				.chooseCard({
					position: "he",
					forced: false,
					selectCard: 1,
					prompt: `巧变：弃置一张牌，跳过你的${names[event.triggername]}阶段`,
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discard(event.cards);
			trigger.cancel();
			if (trigger.name == "phaseUse") {
				if (player.canMoveCard()) {
					await player.moveCard();
				}
			} else if (trigger.name == "phaseDraw") {
				const result = await player
					.chooseTarget([0, 2], "巧变：获得至多两名其他角色各一张手牌", (card, plyr, target) => target != player && target.countCards("h") > 0)
					.forResult();
				if (result && result.bool && result.targets && result.targets.length) {
					await player.gainMultiple(result.targets);
				}
			}
		},
	},

	// ============ 曹仁（old_caoren） ============
	// 据守：结束阶段，你可以摸X张牌（X为存活角色亮明势力数），然后你可以使用一张装备牌。
	// 若X大于2，则你进入叠置状态。与官方版"jushou"同名，完全重新设计。
	jushou: {
		aiShowTag: "draw",
		audio: 2,
		group: ["jushou_mark"],
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("jushou")).forResult();
		},
		async content(event, trigger, player) {
			const x = game.countGroup();
			if (x > 0) {
				await player.draw(x);
			}
			if (player.countCards("he", { type: "equip" })) {
				await player
					.chooseToUse(function (card) {
						if (get.type(card) != "equip") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					}, "###据守###是否使用一张装备牌？")
					.set("complexSelect", true)
					.set("complexTarget", true)
					.forResult();
			}
			if (x > 2) {
				player.storage.jushou_stacked = true;
				player.popup("叠置");
			}
		},
	},
	jushou_mark: {
		charlotte: true,
		intro: {
			content() {
				return get.player().storage.jushou_stacked ? "叠置状态" : "平置状态";
			},
		},
	},
	// 严整：若你处于叠置状态，你可以将一张装备牌当【无懈可击】使用；当你因此使用【无懈可击】
	// 结算完毕，或其他角色的锦囊牌以你为目标后，你可以解除叠置状态。
	yanzheng: {
		aiShowTag: "support",
		audio: 2,
		group: ["yanzheng_flat"],
		enable: ["chooseToUse"],
		filterCard(card) {
			return get.type(card) == "equip";
		},
		viewAs: { name: "wuxie" },
		position: "he",
		viewAsFilter(player) {
			if (!player.storage.jushou_stacked) {
				return false;
			}
			return player.hasCards("he", { type: "equip" });
		},
		prompt: "将一张装备牌当【无懈可击】使用",
		check(card) {
			return 5 - get.value(card);
		},
		ai: {
			skillTagFilter(player) {
				return !!player.storage.jushou_stacked;
			},
		},
	},
	yanzheng_flat: {
		aiShowTag: "response",
		charlotte: true,
		trigger: { player: "useCardAfter", global: "useCardToTargeted" },
		filter(event, player, name) {
			if (!player.storage.jushou_stacked) {
				return false;
			}
			if (name == "useCardAfter") {
				return event.skill == "yanzheng";
			}
			return event.card && get.type(event.card) == "trick" && event.target == player;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("严整：是否解除叠置状态？").forResult();
		},
		async content(event, trigger, player) {
			player.storage.jushou_stacked = false;
			player.popup("平置");
		},
	},

	// ============ 典韦（dianwei） ============
	// 强袭：出牌阶段对每名角色限一次，你可以失去1点体力或弃置一张武器牌，对一名其他角色造成
	// 1点伤害。与官方版"qiangxix"同名，改为对每名角色限一次而非本阶段限一次。
	qiangxix: {
		aiShowTag: "offense",
		aiShowCost: true,
		audio: 2,
		group: ["qiangxix_reset"],
		enable: "phaseUse",
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			const used = player.storage.qiangxix_used || [];
			return !used.includes(target.playerid);
		},
		async content(event, trigger, player) {
			const target = event.target;
			player.storage.qiangxix_used = (player.storage.qiangxix_used || []).concat(target.playerid);
			const hasWeapon = player.countCards("he", card => get.subtype(card) == "equip1") > 0;
			let control;
			if (player.hp > 1 && hasWeapon) {
				const result = await player.chooseControl(["失去1点体力", "弃置一张武器牌"], "cancel2").set("prompt", get.prompt2("qiangxix")).forResult();
				control = result.control;
			} else if (hasWeapon) {
				control = "弃置一张武器牌";
			} else if (player.hp > 1) {
				control = "失去1点体力";
			} else {
				return;
			}
			if (control == "cancel2") {
				return;
			}
			if (control == "失去1点体力") {
				await player.loseHp();
			} else {
				await player.chooseToDiscard("he", true, card => get.subtype(card) == "equip1").forResult();
			}
			if (target.isIn()) {
				await target.damage();
			}
		},
	},
	qiangxix_reset: {
		charlotte: true,
		onremove: "storage",
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			player.storage.qiangxix_used = [];
		},
	},

// ============ 荀彧（xunyu） ============
	// 驱虎：出牌阶段限一次，你可以与一名体力值大于你的角色拼点。若你赢，其对其攻击范围内你指定的
	// 另一名角色造成1点伤害；没赢，其对你造成1点伤害。
	quhu: {
		aiShowTag: "support",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.hp > player.hp && player.canCompare(target);
		},
		async content(event, trigger, player) {
			const target = event.target;
			const { bool } = await player.chooseToCompare(target).forResult();
			if (!bool) {
				if (target.isIn()) {
					await player.damage(1, target);
				}
				return;
			}
			if (!target.isIn()) {
				return;
			}
			if (!game.hasPlayer(current => current != target && target.inRange(current))) {
				return;
			}
			const result = await player
				.chooseTarget(get.prompt2("quhu"), (card, player, current) => current != target && target.inRange(current))
				.forResult();
			const victim = result.targets && result.targets[0];
			if (victim && victim.isIn() && target.isIn()) {
				await victim.damage(1, target);
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					return get.attitude(player, target) > 0 ? -1 : 1;
				},
			},
		},
	},
	// 节命：当你受到伤害或死亡时，你可以令一名角色摸X张牌，然后将手牌弃至X张
	// （X为其体力上限且至多为5）。
	jieming: {
		aiShowTag: "defense",
		aiShowCost: true,
		trigger: { player: ["damageEnd", "dieAfter"] },
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("jieming"), true).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			const x = Math.min(5, target.maxHp);
			await target.draw(x);
			const extra = target.countCards("h") - x;
			if (extra > 0) {
				await target.chooseToDiscard("h", extra, true).forResult();
			}
		},
		ai: {
			threaten: 1.2,
		},
	},

	// ============ 曹丕（caopi） ============
	// 行殒：当其他角色死亡时，你可以选择一项：1.获得其所有牌；2.回复1点体力。
	xingyun: {
		aiShowTag: "recover",
		trigger: { global: "die" },
		filter(event, player) {
			return event.player != player;
		},
		async cost(event, trigger, player) {
			const choices = trigger.player.countCards("he") > 0 ? ["获得其所有牌", "回复1点体力"] : ["回复1点体力"];
			event.result = await player.chooseControl(choices).set("prompt", get.prompt2("xingyun")).forResult();
		},
		async content(event, trigger, player) {
			if (event.control == "获得其所有牌") {
				const cards = trigger.player.getCards("he");
				if (cards.length) {
					await player.gain(cards, trigger.player, "giveAuto", "bySelf");
				}
			} else {
				await player.recover();
			}
		},
	},
	// 放逐：当你受到伤害后，你可以令一名其他角色选择一项：1.弃置X张牌并失去1点体力；
	// 2.摸X张牌并翻面（X为你已损失的体力值）。
	fangzhu: {
		aiShowTag: "defense",
		aiShowCost: true,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return player.getDamagedHp() > 0 && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("fangzhu"), (card, player, target) => target != player).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.isIn()) {
				return;
			}
			const x = player.getDamagedHp();
			const choice = await target
				.chooseControl(["弃牌", "摸牌"])
				.set("prompt", get.prompt2("fangzhu"))
				.set("prompt2", "1.弃置" + get.cnNumber(x) + "张牌并失去1点体力；2.摸" + get.cnNumber(x) + "张牌并翻面")
				.forResult();
			if (choice.control == "弃牌") {
				if (target.countCards("he")) {
					await target.chooseToDiscard("he", Math.min(x, target.countCards("he")), true).forResult();
				}
				if (target.isIn()) {
					await target.loseHp();
				}
			} else {
				await target.draw(x);
				if (target.isIn()) {
					target.turnOver();
				}
			}
		},
	},

	// ============ 邓艾（dengai） ============
	// 屯田：当你于回合外失去牌后，你可以判定，若结果为♥，你获得之，否则你可以将此判定牌置于
	// 你的武将牌上，称为"田"。你计算与其他角色的距离-X（X为"田"的数量）。当一名与你势力相同
	// 的角色受到伤害后，你可以将一张"田"交给该角色。
	tuntian: {
		aiShowTag: "defense",
		group: ["tuntian_give"],
		preHidden: ["tuntian_give"],
		trigger: { player: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (_status.currentPhase == player) {
				return false;
			}
			const evt = event.getl(player);
			return !!(evt && evt.cards2 && evt.cards2.length);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("tuntian")).forResult();
		},
		async content(event, trigger, player) {
			const judge = player.judge(card => (get.suit(card) == "heart" ? 1 : -1));
			judge.judge2 = result => result.bool;
			const result = await judge.forResult();
			if (!result.card) {
				return;
			}
			if (result.bool) {
				await player.gain(result.card, "gain2");
			} else {
				const next = player.addToExpansion(result.card, "gain2");
				next.gaintag.add("tuntian");
				await next;
			}
		},
		mod: {
			globalFrom(from, to, distance) {
				const num = from.countExpansions("tuntian");
				if (num) {
					return distance - num;
				}
			},
		},
		marktext: "田",
		intro: { content: "expansion", markcount: "expansion" },
		onremove(player, skill) {
			const cards = player.getExpansions("tuntian");
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
	},
	tuntian_give: {
		aiShowTag: "support",
		charlotte: true,
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return !!(event.player && event.player != player && event.player.isIn() && event.player.isFriendOf(player) && player.countExpansions("tuntian") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("tuntian_give")).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const cards = player.getExpansions("tuntian").slice(0, 1);
			if (cards.length && target.isIn()) {
				await player.give(cards, target);
			}
		},
	},
	// 急袭：你可以将一张"田"当【顺手牵羊】使用。
	jixi: {
		aiShowTag: "offense",
		enable: "phaseUse",
		filter(event, player) {
			return player.countExpansions("tuntian") > 0 && event.filterCard({ name: "shunshou" }, player, event);
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog(get.translation("jixi"), player.getExpansions("tuntian"), "hidden");
			},
			filter(button, player) {
				const evt = _status.event.getParent();
				return evt.filterCard(get.autoViewAs({ name: "shunshou" }, [button.link]), player, evt);
			},
			backup(links, player) {
				return {
					selectCard: -1,
					position: "x",
					filterCard: card => links.includes(card),
					viewAs: { name: "shunshou" },
					check() {
						return 1;
					},
				};
			},
			prompt: "选择一张“田”当【顺手牵羊】使用",
		},
		ai: {
			order: 6,
			result: { target: -1 },
			skillTagFilter(player) {
				return player.countExpansions("tuntian") > 0;
			},
		},
	},

	// ============ 李典（old_re_lidian） ============
	// 恂恂：摸牌阶段开始时，你可以观看牌堆顶的四张牌，将其中两张牌以任意顺序置于牌堆顶，
	// 其余以任意顺序置于牌堆底。
	xunxun: {
		aiShowTag: "support",
		trigger: { player: "phaseDrawBegin1" },
		preHidden: true,
		frequent: true,
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("xunxun")).forResult();
		},
		async content(event, trigger, player) {
			const cards = get.cards(4, true);
			await game.cardsGotoOrdering(cards);
			await player
				.chooseToMove("恂恂：将两张牌以任意顺序置于牌堆顶，其余以任意顺序置于牌堆底", true)
				.set("list", [
					["牌堆顶", cards],
					["牌堆底", []],
				])
				.set("filterMove", (from, to, moved) => !(to == 0 && moved[0].length >= 2))
				.set("processAI", list => list)
				.forResult();
			await game.cardsGotoPile(cards);
		},
	},
	// 忘隙：当你对其他角色造成1点伤害后，或当你受到其他角色造成的1点伤害后，你可以摸两张牌
	// 并将其中一张牌交给其。
	wangxi: {
		aiShowTag: "defense",
		trigger: { player: "damageEnd", source: "damageSource" },
		filter(event, player) {
			if (event.num != 1) {
				return false;
			}
			const other = event.player == player ? event.source : event.player;
			return !!(other && other.isIn());
		},
		logTarget(event, player) {
			return event.player == player ? event.source : event.player;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wangxi")).forResult();
		},
		async content(event, trigger, player) {
			const other = trigger.player == player ? trigger.source : trigger.player;
			const result = await player.draw(2).forResult();
			const cards = (result && result.cards) || [];
			if (!cards.length || !other || !other.isIn()) {
				return;
			}
			const giveResult = await player.chooseCard(card => cards.includes(card), true, "忘隙：将摸到的牌中的一张交给" + get.translation(other)).forResult();
			if (giveResult.bool && giveResult.cards && giveResult.cards.length) {
				await player.give(giveResult.cards, other);
			}
		},
	},

	// ============ 曹洪（caohong） ============
	// 护援：出牌阶段结束时，你可以展示并交给一名其他角色一张牌，若此牌为锦囊牌，你可以移动场上
	// 一张牌；若此牌为装备牌，其可以使用之，然后你可以弃置场上一张牌。
	huyuan: {
		aiShowTag: "support",
		trigger: { player: "phaseUseEnd" },
		filter(event, player) {
			return player.countCards("he") > 0 && game.hasPlayer(target => target != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					filterCard: true,
					position: "he",
					selectCard: 1,
					filterTarget(card, player, target) {
						return target != player;
					},
					prompt: get.prompt2("huyuan"),
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards, targets } = event;
			const card = cards[0];
			const target = targets[0];
			player.showCards(cards, get.translation(player) + "展示的牌");
			await player.give(cards, target);
			const type = get.type(card, target);
			if (type == "trick") {
				await player.moveCard(false, "护援：你可以移动场上的一张牌");
			} else if (type == "equip") {
				if (target.isIn() && target.hasCard(cardx => cardx === card, "he") && target.canEquip(card)) {
					const useResult = await target.chooseBool("护援：是否使用" + get.translation(card) + "？").forResult();
					if (useResult.bool && target.hasCard(cardx => cardx === card, "he")) {
						await target.equip(card);
					}
				}
				if (game.hasPlayer(p => p.countCards("ej") > 0)) {
					const discardTarget = await player
						.chooseTarget("护援：你可以弃置一名角色装备区或判定区里的一张牌", (card, player, target) => target.countCards("ej") > 0)
						.forResult();
					if (discardTarget.bool && discardTarget.targets && discardTarget.targets.length) {
						await player.discardPlayerCard(discardTarget.targets[0], "ej", true);
					}
				}
			}
		},
	},
	// 鹤翼：与你势力相同的角色拥有"飞影"。
	heyi: {
		group: ["heyi_sync"],
		preHidden: ["heyi_sync"],
	},
	heyi_sync: {
		charlotte: true,
		trigger: { global: ["gameStart", "enterGame", "changeGroup", "phaseBegin"] },
		forced: true,
		popup: false,
		silent: true,
		sourceSkill: "heyi",
		async content(event, trigger, player) {
			for (const current of game.players) {
				if (current == player) {
					continue;
				}
				const shouldHave = current.isFriendOf(player);
				const has = current.hasSkill("heyi_feiying");
				if (shouldHave && !has) {
					current.addSkill("heyi_feiying");
				} else if (!shouldHave && has) {
					current.removeSkill("heyi_feiying");
				}
			}
		},
	},
	heyi_feiying: {
		charlotte: true,
		mod: {
			globalTo(from, to, distance) {
				return distance + 1;
			},
		},
	},
	// 飞影：锁定技，其他角色计算与你的距离+1。
	feiying: {
		mod: {
			globalTo(from, to, distance) {
				return distance + 1;
			},
		},
	},

	// ============ 文聘（wenpin） ============
	// 镇卫：其他角色成为【杀】或黑色锦囊牌的唯一目标时，你可以将此牌转移给你。
	zhenwei: {
		aiShowTag: "response",
		trigger: { global: "useCardToTarget" },
		filter(event, player) {
			if (player == event.target || player == event.player) {
				return false;
			}
			if (!event.target || !event.target.isIn()) {
				return false;
			}
			if (event.targets.length != 1) {
				return false;
			}
			const card = event.card;
			if (card.name == "sha") {
				return true;
			}
			return get.color(card) == "black" && get.type(card) == "trick";
		},
		logTarget: "target",
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zhenwei")).forResult();
		},
		async content(event, trigger, player) {
			const parent = trigger.getParent();
			parent.targets.remove(trigger.target);
			if (parent.triggeredTargets2) {
				parent.triggeredTargets2.remove(trigger.target);
			}
			parent.targets.push(player);
			trigger.untrigger();
			trigger.player.line(player);
		},
		ai: {
			threaten: 1.1,
		},
	},

	// ============ 荀攸（xunyou） ============
	// 奇策：出牌阶段限一次，你可以将所有手牌当一张目标数不大于X的普通锦囊牌使用
	// （X为你的手牌数）。（原效果另有"然后你可以变更副将"，因本包不使用国战主副将机制而略去）
	qice: {
		aiShowTag: "support",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			if (!player.countCards("h")) {
				return false;
			}
			return lib.inpile.some(name => {
				if (get.type(name) != "trick") {
					return false;
				}
				const card = get.autoViewAs({ name }, player.getCards("h"));
				return event.filterCard(card, player, event);
			});
		},
		chooseButton: {
			dialog(event, player) {
				const list = [];
				for (const name of lib.inpile) {
					if (get.type(name) == "trick") {
						list.push(["锦囊", "", name]);
					}
				}
				return ui.create.dialog(get.translation("qice"), [list, "vcard"]);
			},
			filter(button, player) {
				const evt = _status.event.getParent();
				const card = get.autoViewAs({ name: button.link[2] }, player.getCards("h"));
				return evt.filterCard(card, player, evt);
			},
			backup(links, player) {
				return {
					filterCard: true,
					selectCard: -1,
					position: "h",
					popname: true,
					viewAs: { name: links[0][2] },
				};
			},
			prompt(links, player) {
				return "将全部手牌当作" + get.translation(links[0][2]) + "使用";
			},
		},
		ai: {
			order: 1,
			skillTagFilter(player) {
				return player.countCards("h") > 0;
			},
		},
	},
	// 智愚：当你受到伤害后，你可以摸一张牌，然后展示所有手牌，若颜色均相同，伤害来源弃置
	// 一张手牌。
	zhiyu: {
		trigger: { player: "damageEnd" },
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zhiyu")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
			if (!player.countCards("h")) {
				return;
			}
			await player.showHandcards();
			if (!trigger.source || !trigger.source.isIn()) {
				return;
			}
			const cards = player.getCards("h");
			const color = get.color(cards[0], player);
			if (cards.slice(1).every(card => get.color(card, player) === color)) {
				await trigger.source.chooseToDiscard({ forced: true });
			}
		},
		ai: {
			threaten: 0.9,
		},
	},

	// ============ 崔琰&毛玠（cuimao） ============
	// 征辟：出牌阶段开始时，你可以选择一项：1.选择一名角色，本回合你对其使用牌无距离和次数
	// 限制；2.选择一名其他角色，交给其一张基本牌，然后其交给你一张非基本牌或两张基本牌。
	// （原效果的选项1涉及国战"未定势力"身份机制，本包改为通用的"无距离次数限制"效果）
	zhengbi: {
		aiShowTag: "support",
		aiShowCost: true,
		group: ["zhengbi_buff"],
		preHidden: ["zhengbi_buff"],
		trigger: { player: "phaseUseBegin" },
		async cost(event, trigger, player) {
			const choices = ["选择一名角色，本回合你对其使用牌无距离和次数限制"];
			if (player.countCards("h", { type: "basic" }) && game.hasPlayer(target => target != player)) {
				choices.push("交给一名其他角色一张基本牌");
			}
			event.result = await player.chooseControl(choices.concat("cancel2")).set("prompt", get.prompt2("zhengbi")).forResult();
		},
		async content(event, trigger, player) {
			if (event.control == "cancel2") {
				return;
			}
			if (event.control == "交给一名其他角色一张基本牌") {
				const targetResult = await player.chooseTarget(true, "征辟：选择一名其他角色", (card, player, target) => target != player).forResult();
				const target = targetResult.targets && targetResult.targets[0];
				if (!target || !target.isIn()) {
					return;
				}
				const giveResult = await player.chooseCard("h", { type: "basic" }, true, "征辟：交给" + get.translation(target) + "一张基本牌").forResult();
				if (!giveResult.bool || !giveResult.cards || !giveResult.cards.length) {
					return;
				}
				await player.give(giveResult.cards, target);
				if (!target.isIn() || !target.countCards("he")) {
					return;
				}
				const backResult = await target
					.chooseCard("he", true, [1, 2], "征辟：交给" + get.translation(player) + "一张非基本牌或两张基本牌")
					.set("filterOk", function () {
						const cards = ui.selected.cards;
						if (cards.length == 1) {
							return get.type(cards[0]) != "basic";
						}
						if (cards.length == 2) {
							return cards.every(cardx => get.type(cardx) == "basic");
						}
						return false;
					})
					.forResult();
				if (backResult.bool && backResult.cards && backResult.cards.length) {
					await target.give(backResult.cards, player);
				}
			} else {
				const targetResult = await player.chooseTarget(true, "征辟：选择一名角色，本回合你对其使用牌无距离和次数限制", () => true).forResult();
				const target = targetResult.targets && targetResult.targets[0];
				if (target) {
					player.storage.zhengbi_target = target;
					player.addTempSkill("zhengbi_buff", "phaseAfter");
				}
			}
		},
	},
	zhengbi_buff: {
		charlotte: true,
		onremove: "storage",
		mod: {
			targetInRange(card, player, target) {
				if (target === player.storage.zhengbi_target) {
					return true;
				}
			},
			cardUsable(card, player) {
				return Infinity;
			},
		},
	},
	// 奉迎：限定技，出牌阶段，你可以弃置所有手牌（至少一张），然后此回合结束后，你进行一个
	// 额外的回合。此额外的回合开始时，每名与你势力相同的角色将手牌摸至体力上限。
	fengying: {
		aiShowTag: "control",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.discard(player.getCards("h"));
			const evt = player.insertPhase();
			player
				.when("phaseBegin")
				.filter(evtx => evtx == evt)
				.step(async () => {
					const allies = game.filterPlayer(current => current.isFriendOf(player));
					for (const ally of allies) {
						if (ally.isIn() && ally.countCards("h") < ally.maxHp) {
							await ally.drawTo(ally.maxHp);
						}
					}
				});
		},
	},

	// ============ 臧霸（zangba） ============
	// 横江：同势力角色受到伤害后，你可以横置伤害来源；若其已横置，则改为对其造成1点雷电伤害。
	// 当前回合的弃牌阶段结束时，伤害来源弃置一张牌。（"横置"按本引擎的"翻面"状态实现）
	rehengjiang: {
		aiShowTag: "support",
		group: ["rehengjiang_discard"],
		preHidden: ["rehengjiang_discard"],
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return !!(event.player && event.player != player && event.player.isIn() && event.player.isFriendOf(player) && event.source && event.source.isIn() && event.source != player);
		},
		logTarget(event) {
			return event.source;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("rehengjiang")).forResult();
		},
		async content(event, trigger, player) {
			const source = trigger.source;
			if (!source.isIn()) {
				return;
			}
			if (source.isTurnedOver()) {
				await source.damage(1, "thunder", player);
			} else {
				await source.turnOver();
			}
			if (source.isIn()) {
				player.storage.rehengjiang_marked = (player.storage.rehengjiang_marked || []).concat(source);
			}
		},
	},
	rehengjiang_discard: {
		charlotte: true,
		onremove: "storage",
		trigger: { global: "phaseDiscardAfter" },
		forced: true,
		popup: false,
		silent: true,
		sourceSkill: "rehengjiang",
		filter(event, player) {
			return Array.isArray(player.storage.rehengjiang_marked) && player.storage.rehengjiang_marked.length > 0;
		},
		async content(event, trigger, player) {
			const targets = player.storage.rehengjiang_marked.filter(current => current.isIn());
			player.storage.rehengjiang_marked = [];
			for (const target of targets) {
				if (target.isIn() && target.countCards("he")) {
					await target.chooseToDiscard("he", true).forResult();
				}
			}
		},
	},

	// ============ 于禁（yujin） ============
	// 节钺：准备阶段，你可以交给不为魏势力的一名角色一张手牌，然后令其执行一次"军令"。
	// 若其执行，你摸一张牌；若其不执行，你本回合的摸牌阶段多摸三张牌。
	jieyue: {
		aiShowTag: "draw",
		group: ["jieyue_buff"],
		preHidden: ["jieyue_buff"],
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(target => target != player && target.group != "wei");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					filterCard: true,
					position: "h",
					selectCard: 1,
					filterTarget(card, player, target) {
						return target != player && target.group != "wei";
					},
					prompt: get.prompt2("jieyue"),
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards, targets } = event;
			const target = targets[0];
			await player.give(cards, target);
			if (!target.isIn()) {
				return;
			}
			const result = await target.chooseBool("节钺：是否执行一次“军令”？").forResult();
			if (result.bool) {
				target.popup("执行军令");
				await player.draw();
			} else {
				target.popup("抗命");
				player.addTempSkill("jieyue_buff", "phaseAfter");
			}
		},
	},
	jieyue_buff: {
		charlotte: true,
		trigger: { player: "phaseDrawBegin1" },
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			trigger.num += 3;
		},
	},
	// 毅重：锁定技，若你的装备区里没有防具牌，每回合第一张黑色【杀】对你无效。
	yizhong: {
		group: ["yizhong_reset"],
		preHidden: ["yizhong_reset"],
		trigger: { target: "shaBefore" },
		forced: true,
		filter(event, player) {
			if (player.storage.yizhong_used) {
				return false;
			}
			if (!player.hasEmptySlot(2)) {
				return false;
			}
			return event.card.name == "sha" && get.color(event.card) == "black";
		},
		async content(event, trigger, player) {
			player.storage.yizhong_used = true;
			trigger.cancel();
		},
	},
	yizhong_reset: {
		charlotte: true,
		onremove: "storage",
		trigger: { global: "phaseZhunbeiBegin" },
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			player.storage.yizhong_used = false;
		},
	},

// ============ 牛金（niujin） ============
	// 挫锐：限定技，出牌阶段，你可以将手牌摸至五张，并重置基本牌的使用次数，然后废除判定区，
	// 若已废除（判定区已空）则改为对一名其他角色造成1点伤害。
	olcuorui: {
		aiShowTag: "support",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		enable: "phaseUse",
		filter(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.drawTo(5);
			const stat = player.getStat("card");
			for (const name in stat) {
				if (typeof stat[name] == "number" && get.type(name) == "basic") {
					stat[name] = 0;
				}
			}
			if (player.countCards("j")) {
				await player.discard(player.getCards("j"));
			} else {
				const result = await player.chooseTarget(lib.filter.notMe, "挫锐：对一名其他角色造成1点伤害").forResult();
				if (result && result.bool && result.targets && result.targets.length) {
					await result.targets[0].damage();
				}
			}
		},
	},
	// 裂围：锁定技，当你杀死一名角色后，你的限定技（挫锐）视为未发动过。
	liewei: {
		trigger: { source: "dieAfter" },
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			player.restoreSkill("olcuorui");
		},
	},

	// ============ 张春华（zhangchunhua） ============
	// 绝情：锁定技，你即将造成的伤害视为失去体力。
	jueqing: {
		audio: 2,
		trigger: { source: "damageBefore" },
		forced: true,
		async content(event, trigger, player) {
			trigger.cancel();
			await trigger.player.loseHp(trigger.num);
		},
		ai: {
			jueqing: true,
		},
	},
	// 伤逝：每名角色的每个阶段限一次，当你的手牌数小于X时，你可以将手牌摸至X张（X为你已损失的体力值）。
	shangshi: {
		aiShowTag: "defense",
		audio: 2,
		trigger: {
			player: ["loseAfter", "changeHp", "gainMaxHpAfter", "loseMaxHpAfter"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		frequent: true,
		filter(event, player) {
			if (event.getl && !event.getl(player)) {
				return false;
			}
			if (player.getStat().skill.shangshi) {
				return false;
			}
			return player.countCards("h") < player.getDamagedHp();
		},
		async content(event, trigger, player) {
			await player.drawTo(player.getDamagedHp());
		},
	},

	// ============ 王异（wangyi） ============
	// 贞烈：当你成为其他角色使用【杀】或普通锦囊牌的目标后，你可以令其对你造成1点伤害。
	// 若如此做，此牌对你无效，然后你弃置其一张牌。
	zhenlie: {
		aiShowTag: "support",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.player != player && event.player.isIn() && (event.card.name == "sha" || get.type(event.card) == "trick");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool("贞烈：是否令" + get.translation(trigger.player) + "对你造成1点伤害，然后此牌对你无效并弃置其一张牌？")
				.forResult();
		},
		async content(event, trigger, player) {
			const source = trigger.player;
			trigger.getParent().excluded.add(player);
			if (source.isIn()) {
				await player.damage(1, source);
			}
			if (source.isIn() && source.countCards("he")) {
				await player.discardPlayerCard(source, "he", true);
			}
		},
	},
	// 秘计：结束阶段，你可以摸X张牌（X为你已损失的体力值），然后可以将至多等量的牌交给其他角色。
	miji: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.isDamaged();
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("秘计：是否摸" + player.getDamagedHp() + "张牌，然后可以将至多等量的牌交给其他角色？").forResult();
		},
		async content(event, trigger, player) {
			const num = player.getDamagedHp();
			await player.draw(num);
			let given = 0;
			while (given < num && player.countCards("he")) {
				const result = await player
					.chooseCardTarget({
						prompt: "秘计：你可以将一张牌交给其他角色",
						filterCard: true,
						position: "he",
						selectCard: 1,
						filterTarget(card, player, target) {
							return target != player;
						},
					})
					.forResult();
				if (!result || !result.bool || !result.cards || !result.cards.length || !result.targets || !result.targets.length) {
					break;
				}
				await player.give(result.cards, result.targets[0]);
				given++;
			}
		},
	},

	// ============ 曹冲（caochong） ============
	// 稱象：当你受到伤害后，你可以亮出牌堆顶的四张牌，然后获得其中任意张点数之和不大于13的牌。
	// 若获得的牌点数之和为13，你复原武将牌。
	chengxiang: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.num > 0;
		},
		frequent: true,
		async content(event, trigger, player) {
			const cards = get.cards(4);
			await player.showCards(cards, `${get.translation(player)}发动了〖稱象〗`, true).set("clearArena", false);
			const result = await player
				.chooseCardButton(cards, "稱象：选择任意张点数之和不大于13的牌", [1, Infinity], true)
				.set("filterButton", function (button) {
					let num = 0;
					for (const selectedButton of ui.selected.buttons) {
						num += get.number(selectedButton.link);
					}
					return num + get.number(button.link) <= 13;
				})
				.forResult();
			game.broadcastAll(ui.clear);
			const remaining = cards.slice();
			if (result && result.links && result.links.length) {
				const sum = result.links.reduce((s, c) => s + get.number(c), 0);
				result.links.forEach(card => remaining.remove(card));
				await player.gain(result.links, "gain2");
				if (sum == 13) {
					await player.turnOver(false);
				}
			}
			if (remaining.length) {
				await player.loseToDiscardpile({ cards: remaining });
			}
		},
	},
	// 仁心：每轮限一次，当一名其他角色受到致命伤害时，你可以将武将牌翻面并弃置一张装备牌，
	// 然后防止此伤害，本回合内，其防止受到的所有伤害。
	renxin: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		round: 1,
		trigger: { global: "damageBegin4" },
		filter(event, player) {
			return event.player != player && event.player.isIn() && event.player.hp <= event.num && player.countCards("he", { type: "equip" }) > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard({
					prompt: "仁心：弃置一张装备牌，将武将牌翻面，防止" + get.translation(trigger.player) + "受到的致命伤害，且其本回合内防止受到的所有伤害",
					filterCard: get.filter({ type: "equip" }),
					position: "he",
				})
				.set("chooseonly", true)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.discard(event.cards);
			await player.turnOver();
			trigger.cancel();
			if (trigger.player.isIn()) {
				trigger.player.addTempSkill("renxin_shield", "phaseAfter");
			}
		},
	},
	renxin_shield: {
		charlotte: true,
		trigger: { global: "damageBegin4" },
		filter(event, player) {
			return event.player == player;
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			trigger.cancel();
		},
	},

	// ============ 郭淮（guohuai） ============
	// 精策：回合结束时，若你本回合使用过至少X张牌，你可以选择一项：1.执行一个额外的摸牌阶段；
	// 2.执行一个额外的出牌阶段。若你本回合使用过至少X种花色的牌，改为可依次执行所有项（X为体力值）。
	rejingce: {
		aiShowTag: "support",
		audio: "jingce",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.getHistory("useCard").length >= player.hp;
		},
		frequent: true,
		async content(event, trigger, player) {
			const history = player.getHistory("useCard");
			const suits = new Set();
			for (const evt of history) {
				if (evt.card) {
					suits.add(get.suit(evt.card));
				}
			}
			const insertDraw = () => {
				const next = player.phaseDraw();
				event.next.remove(next);
				trigger.getParent().next.push(next);
			};
			const insertUse = () => {
				const next = player.phaseUse();
				event.next.remove(next);
				trigger.getParent().next.push(next);
			};
			if (suits.size >= player.hp) {
				insertDraw();
				insertUse();
			} else {
				const result = await player.chooseControl("摸牌阶段", "出牌阶段").set("prompt", "精策：选择要执行的额外阶段").forResult();
				if (result.control == "摸牌阶段") {
					insertDraw();
				} else {
					insertUse();
				}
			}
		},
	},

	// ============ 满宠（manchong） ============
	// 峻刑：出牌阶段限一次，你可以弃置任意张手牌并令一名其他角色选择一项：
	// 1.弃置与你弃置的牌类别均不同的一张手牌；2.执行一个"军令"。
	junxing: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		selectCard: [1, Infinity],
		allowChooseAll: true,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		check(card) {
			if (ui.selected.cards.length) {
				return -1;
			}
			return 5 - get.value(card);
		},
		filterTarget(card, player, target) {
			return player != target;
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			const types = new Set(cards.map(card => get.type2(card, player)));
			const result = await target
				.chooseToDiscard({
					prompt: "峻刑：弃置一张与" + get.translation(player) + "弃置的牌类别均不同的手牌，否则执行一个“军令”",
					filterCard(card) {
						return !_status.event.types.has(get.type2(card));
					},
				})
				.set("types", types)
				.forResult();
			if (!result || !result.bool) {
				const junlingResult = await player.chooseJunlingFor(target).forResult();
				const junling = junlingResult && junlingResult.junling;
				const junlingTargets = (junlingResult && junlingResult.targets) || [];
				if (junling && target.isIn()) {
					await target.carryOutJunling(player, junling, junlingTargets);
				}
			}
		},
	},
	// 御策：当你受到伤害后，你可以展示一张手牌，令伤害来源选择一项：
	// 1.弃置一张与你展示的牌类别不同的手牌；2.令你回复1点体力然后你弃置此牌。
	yuce: {
		aiShowTag: "defense",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return player.countCards("h") > 0 && event.source && event.source.isIn();
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseCard("h", true, "御策：展示一张手牌").forResult();
		},
		logTarget: "source",
		async content(event, trigger, player) {
			const card = event.cards[0];
			const source = trigger.source;
			await player.showCards(card, get.translation(player) + "发动了〖御策〗");
			if (!card || !source || !source.isIn()) {
				return;
			}
			const type = get.type2(card, player);
			let bool = false;
			if (source.countCards("h", c => get.type2(c, source) != type)) {
				const result = await source
					.chooseToDiscard({
						filterCard: c => get.type2(c, source) != type,
						prompt: "御策：弃置一张与" + get.translation(player) + "展示的牌类别不同的手牌，否则令其回复1点体力然后你弃置此牌",
					})
					.forResult();
				bool = !!(result && result.bool);
			}
			if (!bool) {
				await player.recover();
				await player.discard([card]);
			}
		},
	},

	// ============ 曹真（caozhen） ============
	// 司敌：当有角色打出【杀】或使用【闪】时，你可以摸一张牌。
	xinsidi: {
		aiShowTag: "response",
		audio: "sidi",
		trigger: { global: ["useCard", "respond"] },
		filter(event, player, name) {
			if (!event.card) {
				return false;
			}
			if (name == "respond") {
				return event.card.name == "sha";
			}
			return event.card.name == "shan";
		},
		frequent: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	},

	// ============ 韩浩&史涣（hanhaoshihuan） ============
	// 慎断：当你的牌因弃置而置入弃牌堆时，你可以将其中一张黑色非锦囊牌当无距离限制的
	// 【兵粮寸断】使用，然后你可以重复此流程。
	shenduan: {
		aiShowTag: "response",
		audio: 2,
		trigger: { player: "loseAfter", global: "loseAsyncAfter" },
		filter(event, player) {
			if (event.type != "discard" || event.getlx === false) {
				return false;
			}
			const evt = event.getl(player);
			if (!evt || !evt.cards2) {
				return false;
			}
			for (let i = 0; i < evt.cards2.length; i++) {
				const card = evt.cards2[i];
				const pos = evt.hs && evt.hs.includes(card) ? evt.player : false;
				if (get.color(card, pos) == "black" && get.type(card, pos) != "trick" && get.position(card) == "d") {
					return true;
				}
			}
			return false;
		},
		async cost(event, trigger, player) {
			const cards = [];
			const evt = trigger.getl(player);
			for (let i = 0; i < evt.cards2.length; i++) {
				const card = evt.cards2[i];
				const pos = evt.hs && evt.hs.includes(card) ? evt.player : false;
				if (get.color(card, pos) == "black" && get.type(card, pos) != "trick" && get.position(card) == "d") {
					cards.push(card);
				}
			}
			if (!cards.length) {
				return;
			}
			const result = await player
				.chooseButtonTarget({
					createDialog: ["慎断：将一张黑色非锦囊牌当无距离限制的【兵粮寸断】使用", cards],
					filterButton: true,
					filterTarget(_, player, target) {
						const card = ui.selected.buttons[0] && ui.selected.buttons[0].link;
						return player.canUse({ name: "bingliang", cards: [card] }, target, false);
					},
				})
				.forResult();
			if (result && result.bool && result.links && result.links.length && result.targets && result.targets.length) {
				cards.remove(result.links[0]);
				event.result = { bool: true, cost_data: [result.targets[0], result.links[0], cards] };
			}
		},
		async content(event, trigger, player) {
			let {
				cost_data: [target, card, cards],
			} = event;
			await player.useCard({ name: "bingliang" }, target, [card], "shenduan").set("animate", false);
			while (cards && cards.someInD("d")) {
				const result = await player
					.chooseButtonTarget({
						createDialog: ["慎断：将一张黑色非锦囊牌当无距离限制的【兵粮寸断】使用", cards],
						filterButton: true,
						filterTarget(_, player, target) {
							const card = ui.selected.buttons[0] && ui.selected.buttons[0].link;
							return player.canUse({ name: "bingliang", cards: [card] }, target, false);
						},
					})
					.forResult();
				if (result && result.bool && result.links && result.links.length && result.targets && result.targets.length) {
					cards.remove(result.links[0]);
					await player.useCard({ name: "bingliang" }, result.targets[0], result.links, "shenduan").set("animate", false);
				} else {
					break;
				}
				cards = cards.filterInD("d");
			}
		},
	},
	// 勇略：其他角色的判定阶段开始时，你可以弃置其判定区里的一张牌，然后你视为对其使用一张【杀】。
	yonglve: {
		aiShowTag: "response",
		audio: 2,
		trigger: { global: "phaseJudgeBegin" },
		filter(event, player) {
			return event.player != player && event.player.countCards("j") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.discardPlayerCard({
					prompt: "勇略：弃置" + get.translation(trigger.player) + "判定区里的一张牌，然后视为对其使用一张【杀】",
					target: trigger.player,
					position: "j",
				})
				.forResult();
		},
		async content(event, trigger, player) {
			if (trigger.player.isIn() && player.canUse({ name: "sha", isCard: true }, trigger.player)) {
				await player.useCard({ name: "sha", isCard: true }, trigger.player, false);
			}
		},
	},

	// ============ 曹叡（caorui） ============
	// 恢拓：当你受到伤害后，你可以令一名角色判定，若结果为♥，其回复1点体力，然后此技能本回合失效；
	// 否则，其摸等同于伤害值的牌。
	huituo: {
		aiShowTag: "defense",
		audio: 2,
		group: ["huituo_reset"],
		preHidden: ["huituo_reset"],
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return !player.storage.huituo_off;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget("恢拓：请选择一名角色进行判定", true).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets && event.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			const result = await target.judge().forResult();
			if (result && result.card && get.suit(result.card) == "heart") {
				await target.recover();
				player.storage.huituo_off = true;
			} else {
				await target.draw(trigger.num);
			}
		},
	},
	huituo_reset: {
		charlotte: true,
		trigger: { global: "phaseAfter" },
		forced: true,
		popup: false,
		silent: true,
		filter(event, player) {
			return !!player.storage.huituo_off;
		},
		async content(event, trigger, player) {
			player.storage.huituo_off = false;
		},
	},
	// 明鉴：出牌阶段限一次，你可以将所有手牌交给一名其他角色，然后其下回合手牌上限和使用【杀】的
	// 次数上限各+1；其下回合首次造成伤害后，你可以发动一次X为伤害值的"恢拓"。
	mingjian: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const cards = player.getCards("h");
			if (cards.length) {
				await player.give(cards, target);
			}
			target.storage.mingjian_source = player;
			target.addTempSkill("mingjian_buff", "phaseAfter");
			target.addTempSkill("mingjian_trigger", "phaseAfter");
		},
	},
	mingjian_buff: {
		charlotte: true,
		onremove: "storage",
		mod: {
			maxHandcard(player, num) {
				return num + 1;
			},
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return num + 1;
				}
			},
		},
	},
	mingjian_trigger: {
		aiShowTag: "draw",
		charlotte: true,
		onremove: "storage",
		trigger: { source: "damageSource" },
		filter(event, player) {
			return !player.storage.mingjian_done && player.storage.mingjian_source && player.storage.mingjian_source.isIn();
		},
		async cost(event, trigger, player) {
			const source = player.storage.mingjian_source;
			event.result = await source.chooseBool("明鉴：是否发动一次伤害值为" + trigger.num + "的〖恢拓〗？").forResult();
		},
		async content(event, trigger, player) {
			player.storage.mingjian_done = true;
			const source = player.storage.mingjian_source;
			const result = await source.chooseTarget("恢拓：请选择一名角色进行判定", true).forResult();
			const target = result && result.targets && result.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			const judgeResult = await target.judge().forResult();
			if (judgeResult && judgeResult.card && get.suit(judgeResult.card) == "heart") {
				await target.recover();
				source.storage.huituo_off = true;
			} else {
				await target.draw(trigger.num);
			}
		},
	},

	// ============ 杨修（yangxiu） ============
	// 啖酪：当你成为锦囊牌和【杀】的目标后，若你不是此牌的唯一目标，你可以摸一张牌，然后此牌对你无效。
	danlao: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return (event.card.name == "sha" || get.type(event.card) == "trick") && event.targets && event.targets.length > 1;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("啖酪：是否摸一张牌，然后令此牌对你无效？").forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
			trigger.getParent().excluded.add(player);
		},
	},
	// 鸡肋：当你受到伤害后，你可以声明一种牌的类别，本回合伤害来源不能使用、打出或弃置你声明的此类手牌。
	jilei: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.source && event.source.isIn();
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("鸡肋：是否声明一种牌的类别，令" + get.translation(trigger.source) + "本回合不能使用、打出或弃置你声明的此类手牌？").forResult();
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseControl(["basic", "trick", "equip"])
				.set("prompt", "鸡肋：声明一种牌的类别")
				.forResult();
			const type = result.control;
			const source = trigger.source;
			player.popup(get.translation(type));
			source.storage.jilei_types = (source.storage.jilei_types || []).concat(type);
			source.storage.jilei_turn = _status.currentPhase;
			source.addTempSkill("jilei_lock");
		},
	},
	jilei_lock: {
		charlotte: true,
		onremove: "storage",
		trigger: { global: "phaseAfter" },
		filter(event, player) {
			return event.player == player.storage.jilei_turn;
		},
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			player.removeSkill("jilei_lock");
		},
		mod: {
			cardEnabled(card, player) {
				if ((player.storage.jilei_types || []).includes(get.type(card, "trick")) && player.getCards("h").includes(card)) {
					return false;
				}
			},
			cardRespondable(card, player) {
				if ((player.storage.jilei_types || []).includes(get.type(card, "trick")) && player.getCards("h").includes(card)) {
					return false;
				}
			},
			cardDiscardable(card, player) {
				if ((player.storage.jilei_types || []).includes(get.type(card, "trick")) && player.getCards("h").includes(card)) {
					return false;
				}
			},
		},
	},

// ============ 程昱（chengyu） ============
	// 设伏（重做）：出牌阶段结束时可扣置一张手牌于武将牌上；他人使用同名牌时可移去令其无效。
	shefu: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		group: ["shefu_effect"],
		trigger: { player: "phaseUseEnd" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard("h", true, "设伏：是否将一张手牌扣置于武将牌上？")
				.set("prompt2", "当一名角色使用牌时，你可以移去武将牌上的一张同名牌令之无效")
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			if (!cards || !cards.length) {
				return;
			}
			await player.addToExpansion({ cards, animate: "gain2", gaintag: ["shefu"] });
		},
		intro: { content: "expansion", markcount: "expansion" },
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile({ cards });
			}
		},
	},
	shefu_effect: {
		aiShowTag: "response",
		charlotte: true,
		trigger: { global: "useCard" },
		filter(event, player) {
			return player.countExpansions("shefu") > 0 && player.getExpansions("shefu").some(card => get.name(card) == event.card.name);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(`设伏：是否移去武将牌上的一张【${get.translation(trigger.card.name)}】，令${get.translation(trigger.player)}使用的【${get.translation(trigger.card)}】无效？`)
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions("shefu").filter(card => get.name(card) == trigger.card.name);
			if (cards.length) {
				await player.loseToDiscardpile({ cards: [cards[0]] });
			}
			trigger.cancel();
		},
	},
	// 益兵：他人进入濒死时你可获得其一张手牌；他人死亡时你可回复1点体力。
	yibing: {
		aiShowTag: "recover",
		audio: 2,
		trigger: { global: ["dying", "dieAfter"] },
		filter(event, player) {
			if (event.player == player || !event.player.isIn()) {
				return false;
			}
			if (event.name == "dying") {
				return event.player.countCards("h") > 0;
			}
			return true;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("yibing", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			if (trigger.name == "dying") {
				if (trigger.player.isIn() && trigger.player.countCards("h")) {
					await player.gainPlayerCard(trigger.player, "h", true);
				}
			} else {
				await player.recover();
			}
		},
	},

	// ============ 曹昂（caoang） ============
	// 慷愾（重做）：同势力角色成为【杀】的目标后，摸牌交给其一张并展示，装备牌可供其使用。
	kaikang: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			return event.card.name == "sha" && event.target.isIn() && event.target.isFriendOf(player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("kaikang", trigger.target)).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			await player.draw();
			if (!player.countCards("h") || !target.isIn()) {
				return;
			}
			const result = await player.chooseCard("h", true, `慷愾：选择一张牌交给${get.translation(target)}并展示`).forResult();
			if (!result.bool || !result.cards || !result.cards.length) {
				return;
			}
			const card = result.cards[0];
			await player.give(card, target);
			if (target.isIn()) {
				target.showCards([card], `${get.translation(target)}因“慷愾”获得的牌`);
				if (get.type(card) == "equip" && target.canUse(card, target)) {
					const useResult = await target.chooseBool(`慷愾：是否使用【${get.translation(card)}】？`).forResult();
					if (useResult.bool) {
						await target.useCard(card);
					}
				}
			}
		},
	},
	// 孝廉：首次明置此武将牌时，可移动场上的一张装备牌。
	xiaolian: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			return !!(event.toShow && event.toShow.includes("caoang")) && game.hasPlayer(current => current.countCards("e") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("xiaolian")).forResult();
		},
		async content(event, trigger, player) {
			const sourceResult = await player
				.chooseTarget("孝廉：选择装备区里有牌的一名角色", (card, plyr, target) => target.countCards("e") > 0, true)
				.forResult();
			const from = sourceResult.targets && sourceResult.targets[0];
			if (!from) {
				return;
			}
			const cardResult = await player.choosePlayerCard(from, "e", true).forResult();
			const card = cardResult.cards && cardResult.cards[0];
			if (!card) {
				return;
			}
			const destResult = await player.chooseTarget("孝廉：选择移动到的一名角色", true).forResult();
			const to = destResult.targets && destResult.targets[0];
			if (!to) {
				return;
			}
			await to.equip(card);
		},
	},

	// ============ 诸葛诞（zhugedan） ============
	// 功獒（重做）：锁定技，他人首次进入濒死时，你加体力上限或回复体力。
	gongao: {
		audio: 2,
		trigger: { global: "dying" },
		forced: true,
		filter(event, player) {
			if (event.player == player) {
				return false;
			}
			return !(player.storage.gongao_marked || []).includes(event.player.playerid);
		},
		async content(event, trigger, player) {
			if (!player.storage.gongao_marked) {
				player.storage.gongao_marked = [];
			}
			player.storage.gongao_marked.push(trigger.player.playerid);
			const choice = await player.chooseControl("体力上限+1", "回复1点体力").set("prompt", get.prompt2("gongao")).forResult();
			if (choice.control == "体力上限+1") {
				player.maxHp++;
			} else if (player.isDamaged()) {
				await player.recover();
			}
		},
	},
	// 威重：锁定技，体力上限或体力变化时摸一张牌。
	weizhong: {
		audio: 2,
		trigger: { player: ["gainMaxHpEnd", "loseMaxHpEnd", "changeHpEnd"] },
		forced: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	},
	// 举义（重做）：限定技，准备阶段可将手牌摸至体力上限，摸牌数大于5则获得〖崩坏〗。
	juyi: {
		aiShowTag: "draw",
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("h") < player.maxHp;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("juyi")).forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const need = player.maxHp - player.countCards("h");
			if (need <= 0) {
				return;
			}
			const result = await player.draw(need).forResult();
			const gained = (result && result.cards && result.cards.length) || 0;
			if (gained > 5) {
				player.addSkills(["benghuai"]);
			}
		},
	},

	// ============ 戏志才（xizhicai） ============
	// 天妒：判定牌生效后可获得之。（与原版一致）
	tiandu: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "judgeEnd" },
		filter(event, player) {
			return get.position(event.result.card, true) === "o";
		},
		async content(event, trigger, player) {
			await player.gain({ cards: [trigger.result.card], animate: "gain2" });
		},
	},
	// 先辅（重做）：首次明置时选定一名角色，与其共享伤害/回复。
	xianfu: {
		aiShowTag: "support",
		audio: 2,
		group: ["xianfu_effect"],
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			return !!(event.toShow && event.toShow.includes("xizhicai")) && !player.storage.xianfu_target && game.hasPlayer(current => current != player);
		},
		async content(event, trigger, player) {
			const result = await player.chooseTarget(get.prompt2("xianfu"), (card, plyr, target) => target != player, true).forResult();
			const target = result.targets && result.targets[0];
			if (target) {
				player.storage.xianfu_target = target;
			}
		},
	},
	xianfu_effect: {
		charlotte: true,
		trigger: { global: ["damageEnd", "recoverEnd"] },
		forced: true,
		filter(event, player) {
			return player.storage.xianfu_target && player.storage.xianfu_target == event.player && event.player.isIn() && event.num > 0;
		},
		async content(event, trigger, player) {
			if (trigger.name == "damage") {
				await player.damage(trigger.num, "nosource");
			} else {
				await player.recover(trigger.num);
			}
		},
	},
	// 筹策（重做）：受伤后判定，黑色弃牌，红色令一名角色摸牌。
	chouce: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.num > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("chouce")).forResult();
		},
		async content(event, trigger, player) {
			const result = await player.judge().forResult();
			const color = result && result.color;
			if (color == "black") {
				if (game.hasPlayer(current => current.countDiscardableCards(player, "hej") > 0)) {
					const targetResult = await player
						.chooseTarget("筹策：弃置一名角色区域里的一张牌", (card, plyr, target) => target.countDiscardableCards(player, "hej") > 0, true)
						.forResult();
					const target = targetResult.targets && targetResult.targets[0];
					if (target) {
						await player.discardPlayerCard(target, "hej", true);
					}
				}
			} else if (color == "red") {
				const targetResult = await player.chooseTarget("筹策：选择一名角色摸一张牌", true, true).forResult();
				const target = targetResult.targets && targetResult.targets[0];
				if (target) {
					await target.draw();
				}
			}
		},
	},

	// ============ 王朗（wanglang） ============
	// 鼓舌（重做）：出牌阶段限一次，与至多两名角色依次拼点，没赢的角色弃牌，输方可与对方重复此流程。
	regushe: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		selectTarget: [1, 2],
		async content(event, trigger, player) {
			const targets = event.targets.slice();
			let attacker = player;
			while (targets.length) {
				const target = targets.shift();
				if (!target.isIn() || !attacker.isIn()) {
					continue;
				}
				const result = await attacker.chooseToCompare(target).forResult();
				const loser = result.winner == attacker ? target : result.winner == target ? attacker : null;
				if (loser && loser.isIn() && loser.countCards("he")) {
					await loser.chooseToDiscard("he", true).forResult();
				}
				if (loser && loser != attacker && loser.isIn() && attacker.isIn()) {
					const again = await loser.chooseBool(`鼓舌：是否与${get.translation(attacker)}重复拼点流程？`).forResult();
					if (again.bool) {
						targets.unshift(attacker);
						attacker = loser;
					}
				}
			}
		},
	},
	// 激词：锁定技，亮出拼点牌时可失去1点体力令其点数视为K。
	rejici: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "compare", target: "compare" },
		filter(event, player) {
			if (event.player == player) {
				return !event.iwhile;
			}
			return true;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("激词：是否失去1点体力，令你的拼点牌的点数视为K？").forResult();
		},
		async content(event, trigger, player) {
			await player.loseHp();
			if (player == trigger.player) {
				trigger.num1 = 13;
			} else {
				trigger.num2 = 13;
			}
		},
	},

	// ============ 辛宪英（xinxianying） ============
	// 忠鉴：当你成为一张牌的目标后，你可以视为对使用者使用一张【知己知彼】；然后你可以
	// 明置你以此法观看的（使用者的）武将牌。
	// 直接复用card/guozhan.js里已有的【知己知彼】(zhibi)实现（引擎里确实有这张牌，
	// 不是"没有对应卡牌"），而不是简化成单纯展示手牌。
	zhongjian: {
		aiShowTag: "control",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return player.canUse("zhibi", event.player, false, true);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zhongjian", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const source = trigger.player;
			if (!source.isIn()) {
				return;
			}
			await player.useCard({ name: "zhibi", isCard: true }, source, false);
			const viewed = player.storage.zhibi_lastViewed;
			delete player.storage.zhibi_lastViewed;
			const slot = viewed === "主将" ? 0 : viewed === "副将" ? 1 : null;
			if (slot != null && source.isUnseen(slot)) {
				const result = await player.chooseBool(`忠鉴：是否明置${get.translation(source)}的${viewed}？`).forResult();
				if (result.bool) {
					await source.showCharacter(slot);
				}
			}
		},
	},
	// 才识（重做）：限定技，视为使用一张【无懈可击】。
	// 与卡面原文相比：因引擎无"变更武将牌"对应机制，将其代价简化为限定技（每局一次）。
	caishi: {
		aiShowTag: "support",
		audio: 2,
		limited: true,
		enable: "chooseToUse",
		filterCard() {
			return false;
		},
		viewAsFilter(player) {
			return !player.storage.caishi_used;
		},
		viewAs: { name: "wuxie" },
		onuse(result, player) {
			player.storage.caishi_used = true;
			player.awakenSkill?.("caishi");
		},
	},

	// ============ 毌丘俭（guanqiujian） ============
	// 征荣（重做）：锁定技，你或受伤角色为孤军时，伤害+1。
	zhengrong: {
		audio: 2,
		trigger: { player: "damageBegin1" },
		forced: true,
		filter(event, player) {
			const isLone = p => !game.hasPlayer(current => current != p && current.isIn() && current.isFriendOf(p));
			return isLone(player) || (event.player && event.player.isIn() && isLone(event.player));
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	},
	// 鸿举（重做）：限定技，出牌阶段选择一名其他角色排除在外，其余角色依次执行你发起的“军令”，不执行者本回合视为移出游戏。
	hongju: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const excluded = event.target;
			const others = game
				.filterPlayer(current => current != player && current != excluded)
				.sortBySeat();
			const junlingResult = await player.chooseJunlingFor(player).set("prompt", "鸿举：请选择一项“军令”").forResult();
			const junling = junlingResult && junlingResult.junling;
			if (!junling) {
				return;
			}
			const junlingTargets = junlingResult.targets || [];
			await player.carryOutJunling(player, junling, junlingTargets);
			for (const current of others) {
				if (!current.isIn()) {
					continue;
				}
				const result = await current
					.chooseJunlingControl(player, junling, junlingTargets)
					.set("prompt", "鸿举")
					.set("choiceList", ["执行该军令", "不执行该军令，本回合视为移出游戏"])
					.forResult();
				if (result && (result.bool || result.index === 0)) {
					await current.carryOutJunling(player, junling, junlingTargets);
				} else {
					current.addTempSkill("diaohulishan");
				}
			}
		},
	},

	// ============ 鲁芝（luzhi） ============
	// 清忠（重做）：出牌阶段开始摸两张牌，阶段结束时若你手牌不为唯一最少，与一名最少手牌角色交换手牌。
	qingzhong: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("qingzhong")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw(2);
			player.addTempSkill("qingzhong_effect", "phaseUseAfter");
		},
	},
	qingzhong_effect: {
		charlotte: true,
		trigger: { player: "phaseUseEnd" },
		forced: true,
		filter(event, player) {
			const min = Math.min(...game.filterPlayer().map(current => current.countCards("h")));
			const minPlayers = game.filterPlayer(current => current.countCards("h") == min);
			return !(minPlayers.length == 1 && minPlayers[0] == player);
		},
		async content(event, trigger, player) {
			const min = Math.min(...game.filterPlayer().map(current => current.countCards("h")));
			const candidates = game.filterPlayer(current => current != player && current.countCards("h") == min);
			if (!candidates.length) {
				return;
			}
			const result = await player
				.chooseTarget("清忠：选择一名手牌数最少的角色交换手牌", (card, plyr, target) => candidates.includes(target), true)
				.forResult();
			const target = result.targets && result.targets[0];
			if (target) {
				await player.swapHandcards(target);
			}
		},
	},
	// 卫境（重做）：每轮限一次，需要使用基本牌时可视为使用之。
	weijing: {
		aiShowTag: "support",
		audio: 2,
		round: 1,
		enable: "chooseToUse",
		filter(event, player) {
			if (event.type == "wuxie" || player.hasSkill("weijing_used")) {
				return false;
			}
			return lib.inpile.some(name => get.type(name) == "basic" && event.filterCard({ name, isCard: true }, player, event));
		},
		chooseButton: {
			dialog(event, player) {
				const vcards = lib.inpile
					.filter(name => get.type(name) == "basic" && event.filterCard({ name, isCard: true }, player, event))
					.map(name => ["基本", "", name]);
				const dialog = ui.create.dialog("卫境", [vcards, "vcard"], "hidden");
				dialog.direct = true;
				return dialog;
			},
			backup(links, player) {
				return {
					filterCard: () => false,
					selectCard: -1,
					viewAs: { name: links[0][2], isCard: true },
					popname: true,
					precontent() {
						player.logSkill("weijing");
						player.addTempSkill("weijing_used", "roundStart");
					},
				};
			},
			prompt(links, player) {
				return "卫境：视为使用一张【" + get.translation(links[0][2]) + "】";
			},
		},
	},
	weijing_used: {
		charlotte: true,
	},

	// ============ 文鸯（wenyang） ============
	// 覆阵（重做）：准备阶段可对一个势力的所有其他角色视为使用【决斗】，
	// 结算流程中共计打出的【杀】数为X，之后全场角色本回合的手牌使用次数各不超过X。
	// 与卡面原文相比：将"共计X张"的共享额度简化为对每名角色单独的X次数上限。
	fuzhen: {
		aiShowTag: "support",
		audio: 2,
		group: ["fuzhen_counter", "fuzhen_cap_effect"],
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("fuzhen")).forResult();
		},
		async content(event, trigger, player) {
			const groups = lib.group.filter(g => game.hasPlayer(current => current != player && current.isIn() && current.group == g));
			if (!groups.length) {
				return;
			}
			const groupResult = await player
				.chooseControl(groups.map(g => get.translation(g)))
				.set("prompt", "覆阵：选择一个势力，视为对其所有其他角色使用一张【决斗】")
				.forResult();
			const group = groups[groupResult.index];
			const targets = game.filterPlayer(current => current != player && current.isIn() && current.group == group);
			if (!targets.length) {
				return;
			}
			player.storage.fuzhen_shaCount = 0;
			player.addTempSkill("fuzhen_counter");
			for (const target of targets) {
				if (!target.isIn() || !player.isIn()) {
					continue;
				}
				await player.useCard({ name: "juedou", isCard: true }, target, false);
			}
			const x = player.storage.fuzhen_shaCount || 0;
			player.removeSkill("fuzhen_counter");
			delete player.storage.fuzhen_shaCount;
			if (x > 0) {
				for (const current of game.filterPlayer()) {
					current.storage.fuzhen_cap = x;
					current.addTempSkill("fuzhen_cap_effect", "phaseAfter");
				}
			}
		},
	},
	fuzhen_counter: {
		charlotte: true,
		trigger: { global: "useCardAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.card && event.card.name == "sha";
		},
		async content(event, trigger, player) {
			player.storage.fuzhen_shaCount = (player.storage.fuzhen_shaCount || 0) + 1;
		},
	},
	fuzhen_cap_effect: {
		charlotte: true,
		onremove: "storage",
		mod: {
			cardUsable(card, player, num) {
				if (get.position(card) == "h" && typeof player.storage.fuzhen_cap == "number") {
					return Math.min(num, player.storage.fuzhen_cap);
				}
			},
		},
	},

	// ============ 蒋干（jianggan） ============
	// 伪诚（重做）：交出/被夺手牌后，若手牌数小于体力上限，可摸一张牌。
	weicheng: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (event.type == "discard" || event.getlx === false) {
				return false;
			}
			if (!event.hs || !event.hs.length) {
				return false;
			}
			return player.countCards("h") < player.maxHp;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("weicheng")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
		},
	},
	// 盗书（重做）：出牌阶段限一次，选定一名角色与一种花色并获得其一张手牌，猜中则伤害且技能视为未发动，未猜中则回赠一张异色牌。
	daoshu: {
		aiShowTag: "offense",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player != target && target.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const suits = ["spade", "heart", "club", "diamond"];
			const suitResult = await player.chooseControl(suits.map(s => get.translation(s))).set("prompt", "盗书：选择一种花色").forResult();
			const suit = suits[suitResult.index];
			if (!target.isIn() || !target.countCards("h")) {
				return;
			}
			const cardResult = await player.choosePlayerCard(target, "h", true).forResult();
			const card = cardResult.cards && cardResult.cards[0];
			if (!card) {
				return;
			}
			await player.gain(card, target, "gain2");
			if (get.suit(card, target) == suit) {
				if (target.isIn()) {
					await target.damage();
				}
				const stat = player.getStat().skill;
				if (typeof stat.daoshu == "number") {
					stat.daoshu--;
				}
			} else if (target.isIn()) {
				const others = player.countCards("he", c => get.suit(c, player) != suit);
				if (others) {
					const giveResult = await player
						.chooseCard("he", true, c => get.suit(c, player) != suit, `盗书：交给${get.translation(target)}一张其他花色的手牌`)
						.forResult();
					if (giveResult.bool && giveResult.cards && giveResult.cards.length) {
						await player.give(giveResult.cards, target);
					}
				} else if (player.countCards("h")) {
					await player.showHandcards();
				}
			}
		},
	},

// ============ 曹爽（caoshuang） ============
	// 擅专：每名角色的回合限一次，当你满足场上一名未处于翻面状态的其他角色当前拥有的一个
	// 无标签锁定技的触发条件时，你可以视为发动该技能。跟官方版完全不同——官方版是延时判定技，
	// 这里改为"借用"其他角色技能的机制。受限于单主公将引擎无法安全地泛化调用任意技能的
	// cost/多步骤流程，这里将候选范围限定为"锁定技（forced，且用现代async写法实现）"，
	// 并只监听下列一批常见的全局触发点。
	shanzhuan: {
		aiShowTag: "response",
		group: ["shanzhuan_reset"],
		preHidden: ["shanzhuan_reset"],
		audio: 2,
		trigger: {
			global: [
				"phaseJudgeBegin",
				"phaseDrawBegin",
				"phaseUseBegin",
				"phaseDiscardBegin",
				"phaseJieshuBegin",
				"phaseAfter",
				"useCard",
				"useCardAfter",
				"useCardToTargeted",
				"useCardToPlayered",
				"damageSource",
				"damageEnd",
				"dying",
				"dieAfter",
				"gainAfter",
				"loseAfter",
				"loseAsyncAfter",
				"judge",
				"respond",
			],
		},
		filter(event, player, name) {
			if (player.storage.shanzhuan_used) {
				return false;
			}
			const isCandidate = skill => {
				const info = get.info(skill);
				if (!info || info.zhuSkill || info.limited || info.juexingji || info.hiddenSkill || info.charlotte || info.dutySkill) {
					return false;
				}
				if (!info.forced || typeof info.content != "function" || info.content.constructor.name != "AsyncFunction" || !info.trigger) {
					return false;
				}
				const names = [].concat(info.trigger.global || [], info.trigger.player || [], info.trigger.source || [], info.trigger.target || []);
				if (!names.includes(name)) {
					return false;
				}
				return typeof info.filter != "function" || info.filter(event, player, name);
			};
			return game.hasPlayer(current => current != player && !current.isTurnedOver() && current.getSkills(null, false).some(isCandidate));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("shanzhuan")).forResult();
		},
		async content(event, trigger, player) {
			const name = event.triggername;
			const isCandidate = skill => {
				const info = get.info(skill);
				if (!info || info.zhuSkill || info.limited || info.juexingji || info.hiddenSkill || info.charlotte || info.dutySkill) {
					return false;
				}
				if (!info.forced || typeof info.content != "function" || info.content.constructor.name != "AsyncFunction" || !info.trigger) {
					return false;
				}
				const names = [].concat(info.trigger.global || [], info.trigger.player || [], info.trigger.source || [], info.trigger.target || []);
				if (!names.includes(name)) {
					return false;
				}
				return typeof info.filter != "function" || info.filter(trigger, player, name);
			};
			const owners = game.filterPlayer(current => current != player && !current.isTurnedOver() && current.getSkills(null, false).some(isCandidate));
			if (!owners.length) {
				return;
			}
			let target = owners[0];
			if (owners.length > 1) {
				const result = await player.chooseTarget(get.prompt2("shanzhuan"), (card, plyr, tgt) => owners.includes(tgt)).forResult();
				if (result && result.targets && result.targets[0]) {
					target = result.targets[0];
				}
			}
			const skillResult = await player
				.chooseSkill(target, {
					prompt: "擅专：请选择要借用的技能",
					func: (info, skill) => isCandidate(skill),
				})
				.forResult();
			if (!skillResult || !skillResult.bool || !skillResult.skill) {
				return;
			}
			player.storage.shanzhuan_used = true;
			player.logSkill("shanzhuan", target);
			await get.info(skillResult.skill).content(event, trigger, player);
		},
	},
	shanzhuan_reset: {
		charlotte: true,
		trigger: { global: "phaseZhunbeiBegin" },
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			player.storage.shanzhuan_used = false;
		},
	},

	// 托孤：一名角色死亡时，你可以令其选择其武将牌上的一个无标签技能，你失去上一次以此法
	// 获得的技能，获得此技能。跟官方版基本一致，只是把"选择技能"的主动权交给死亡角色自己。
	retuogu: {
		aiShowTag: "support",
		audio: "tuogu",
		trigger: { global: "dieAfter" },
		// "无标签技能"：排除主公技/限定技/觉醒技/隐匿技/使命技等特殊技能。
		tagFilter(info) {
			return !!info && !info.zhuSkill && !info.limited && !info.juexingji && !info.hiddenSkill && !info.charlotte && !info.dutySkill;
		},
		filter(event, player) {
			return event.player.getGainableSkills(lib.skill.retuogu.tagFilter).length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("retuogu", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const result = await target
				.chooseSkill(target, {
					prompt: "托孤：请选择你武将牌上的一个技能",
					func: (info, skill) => lib.skill.retuogu.tagFilter(info),
				})
				.forResult();
			if (!result || !result.bool || !result.skill) {
				return;
			}
			if (player.storage.retuogu_skill) {
				player.removeSkill(player.storage.retuogu_skill);
			}
			player.storage.retuogu_skill = result.skill;
			player.addSkill(result.skill);
			player.popup(get.translation(result.skill));
		},
	},

	// ============ 华歆（huaxin） ============
	// 望归：每回合限一次，当你造成伤害后，你可以对一名与你势力不同的其他角色造成1点伤害；
	// 每回合限一次，当你受到伤害后，你可以令所有与你势力相同的角色各摸一张牌。
	spwanggui: {
		aiShowTag: "offense",
		audio: "wanggui",
		group: ["spwanggui_draw"],
		preHidden: ["spwanggui_draw"],
		trigger: { source: "damageSource" },
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.isEnemyOf(player));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("spwanggui"), (card, plyr, target) => target != player && target.isEnemyOf(player))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (target && target.isIn()) {
				await target.damage();
			}
		},
	},
	spwanggui_draw: {
		aiShowTag: "defense",
		charlotte: true,
		audio: "wanggui",
		trigger: { player: "damageEnd" },
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => current.isFriendOf(player));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("spwanggui_draw")).forResult();
		},
		async content(event, trigger, player) {
			const targets = game.filterPlayer(current => current.isFriendOf(player));
			for (const target of targets) {
				if (target.isIn()) {
					await target.draw();
				}
			}
		},
	},

	// 息兵：每回合限一次，当其他角色于其出牌阶段内使用黑色【杀】或黑色普通锦囊牌指定唯一
	// 目标后，你可以令该角色将手牌摸至体力值（至多摸至五张）。若其因此摸牌，其本回合
	// 不能再使用牌。（与官方版基本一致，改写为现代async写法）
	xibing: {
		aiShowTag: "response",
		audio: 2,
		group: ["xibing_disable"],
		preHidden: ["xibing_disable"],
		trigger: { global: "useCardToPlayered" },
		usable: 1,
		filter(event, player) {
			if (player == event.player || !event.targets || event.targets.length != 1 || !event.player.isIn()) {
				return false;
			}
			if (!event.player.isPhaseUsing || !event.player.isPhaseUsing()) {
				return false;
			}
			const isBlack = (event.card.name == "sha" || get.type(event.card) == "trick") && get.color(event.card, event.player) == "black";
			return isBlack;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("xibing", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (!target.isIn()) {
				return;
			}
			const num = Math.min(5, target.hp) - target.countCards("h");
			if (num > 0) {
				await target.draw(num);
				target.addTempSkill("xibing_disable", "phaseAfter");
			}
		},
	},
	xibing_disable: {
		charlotte: true,
		mod: {
			cardEnabled(card) {
				return false;
			},
			cardSavable(card) {
				return false;
			},
		},
	},

	// ============ 田豫（tianyu） ============
	// 扫狄：当你使用【杀】或普通锦囊牌仅指定一名其他角色为目标时，你可以令你与其之间的
	// 角色（取最短的座次边，若双向同样短则自选一边）均成为此牌的目标（目标须合法）。
	// 与官方原技能机制一致，改写为现代async写法。
	saodi: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			const { target } = event;
			if (!event.targets || event.targets.length != 1 || target == player || !target.isIn()) {
				return false;
			}
			if (event.card.name != "sha" && get.type(event.card) != "trick") {
				return false;
			}
			const [left, right, left2, right2] = lib.skill.saodi.getTargets(player, target);
			return (target == left2 && left.some(i => lib.filter.targetEnabled2(event.card, player, i))) || (target == right2 && right.some(i => lib.filter.targetEnabled2(event.card, player, i)));
		},
		getTargets(source, target) {
			let left = [],
				right = [],
				left2 = source,
				right2 = source;
			while (left2 != target && right2 != target) {
				left2 = left2.getPrevious();
				right2 = right2.getNext();
				if (left2 != target) {
					left.push(left2);
				}
				if (right2 != target) {
					right.push(right2);
				}
			}
			return [left, right, left2, right2];
		},
		async cost(event, trigger, player) {
			const choices = [];
			const { target, card } = trigger;
			const [left, right, left2, right2] = lib.skill.saodi.getTargets(player, target);
			if (target == left2 && left.some(i => lib.filter.targetEnabled2(card, player, i))) {
				choices.push("顺时针");
			}
			if (target == right2 && right.some(i => lib.filter.targetEnabled2(card, player, i))) {
				choices.push("逆时针");
			}
			choices.push("cancel2");
			const { control } = await player
				.chooseControl(choices)
				.set("prompt", get.prompt2("saodi"))
				.set("prompt2", `令你与${get.translation(target)}某个方向之间的所有角色均成为${get.translation(card)}的目标`)
				.forResult();
			if (!control || control == "cancel2") {
				event.result = { bool: false };
				return;
			}
			const targets = [];
			if (control == "顺时针") {
				let current = player.getPrevious();
				while (current != target) {
					if (lib.filter.targetEnabled2(card, player, current)) {
						targets.push(current);
					}
					current = current.getPrevious();
				}
			} else {
				let current = player.getNext();
				while (current != target) {
					if (lib.filter.targetEnabled2(card, player, current)) {
						targets.push(current);
					}
					current = current.getNext();
				}
			}
			event.result = { bool: true, targets };
		},
		async content(event, trigger, player) {
			trigger.targets.addArray(event.targets);
		},
	},

	// ============ 董昭（dc_dongzhao） ============
	// 劝进：出牌阶段限一次，你可以将一张手牌交给一名此阶段受到过伤害的角色，对其发起一次
	// "军令"：令其自行决定是否使用你交给它的这张牌。若其使用之，你摸一张牌；否则你将
	// 手牌摸至与手牌最多的角色相同（至多摸五张）。全新设计，与官方任何"董昭"技能无关。
	quanjin: {
		aiShowTag: "draw",
		group: ["quanjin_tracker"],
		preHidden: ["quanjin_tracker"],
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		selectCard: 1,
		discard: false,
		lose: false,
		filterTarget(card, player, target) {
			return target != player && (player.storage.quanjin_damaged || []).includes(target.playerid);
		},
		check(card) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const { target, cards } = event;
			const card = cards[0];
			await player.give(card, target);
			let executed = false;
			if (target.isIn() && target.getCards("h").includes(card)) {
				const result = await target
					.chooseToUse({
						filterCard: cardx => cardx === card,
						prompt: "劝进：" + get.translation(player) + "向你发起了一次“军令”，是否使用" + get.translation(card) + "？",
						complexSelect: true,
						complexTarget: true,
					})
					.forResult();
				executed = !!(result && result.bool);
			}
			if (executed) {
				await player.draw();
			} else {
				const maxNum = Math.max(0, ...game.players.map(p => p.countCards("h")));
				const num = Math.min(5, maxNum) - player.countCards("h");
				if (num > 0) {
					await player.draw(num);
				}
			}
		},
	},
	quanjin_tracker: {
		charlotte: true,
		init(player) {
			player.storage.quanjin_damaged = [];
		},
		trigger: { global: ["phaseUseBegin", "damageEnd"] },
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			if (trigger.name == "phaseUseBegin") {
				if (trigger.player == player) {
					player.storage.quanjin_damaged = [];
				}
				return;
			}
			if (_status.currentPhase == player && trigger.player && trigger.player != player) {
				if (!player.storage.quanjin_damaged.includes(trigger.player.playerid)) {
					player.storage.quanjin_damaged.push(trigger.player.playerid);
				}
			}
		},
	},

	// 凿运：出牌阶段限一次，你可以选择一名与你势力不同且距离大于1的角色，弃置X张手牌
	// （X为你与其的距离-1），令你本回合计算与其的距离为1，然后你对其造成1点伤害。
	// 全新设计，与官方任何"董昭"技能无关。
	zaoyun: {
		aiShowTag: "offense",
		aiShowCost: true,
		group: ["zaoyun_effect"],
		preHidden: ["zaoyun_effect"],
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			if (target == player || target.isFriendOf(player)) {
				return false;
			}
			const dis = get.distance(player, target);
			return dis > 1 && player.countCards("h") >= dis - 1;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const x = get.distance(player, target) - 1;
			if (x > 0) {
				if (player.countCards("h") < x) {
					return;
				}
				const result = await player.chooseToDiscard("h", x, true).forResult();
				if (!result || !result.bool) {
					return;
				}
			}
			player.storage.zaoyun_target = target;
			player.addTempSkill("zaoyun_effect", "phaseAfter");
			if (target.isIn()) {
				await target.damage();
			}
		},
	},
	zaoyun_effect: {
		charlotte: true,
		onremove: "storage",
		mod: {
			globalFrom(from, to, distance) {
				if (from.storage.zaoyun_target && to == from.storage.zaoyun_target) {
					return 1;
				}
			},
		},
	},

	// ============ 羊祜（dc_yanghu） ============
	// 德劭：每回合限X次（X为你的体力值），当你成为其他角色使用黑色牌的唯一目标后，若该
	// 角色未处于翻面状态，你可以弃置其一张牌。（原版"明置的武将牌数不大于你"依单主公将
	// 机制改写为"未处于翻面状态"）
	dcdeshao: {
		aiShowTag: "support",
		group: ["dcdeshao_reset"],
		preHidden: ["dcdeshao_reset"],
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			if (player == event.player || !event.targets || event.targets.length != 1) {
				return false;
			}
			if (get.color(event.card, event.player) != "black") {
				return false;
			}
			if ((player.storage.dcdeshao_count || 0) >= player.hp) {
				return false;
			}
			return !event.player.isTurnedOver();
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("dcdeshao", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			player.storage.dcdeshao_count = (player.storage.dcdeshao_count || 0) + 1;
			if (trigger.player.isIn() && trigger.player.countCards("he")) {
				await player.discardPlayerCard(trigger.player, "he", true);
			}
		},
	},
	dcdeshao_reset: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			player.storage.dcdeshao_count = 0;
		},
	},

	// 明伐：出牌阶段限一次，你可以选择一名其他角色。该角色下个回合结束时，若其手牌数
	// 小于你，你对其造成1点伤害并获得其一张手牌；否则你将手牌摸至与其相同（至多摸五张）。
	// 全新设计，与官方"羊祜"的"明伐"机制无关。
	dcmingfa: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			target.storage.dcmingfa_from = player;
			target.addTempSkill("dcmingfa_effect");
		},
	},
	dcmingfa_effect: {
		charlotte: true,
		onremove: "storage",
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const source = player.storage.dcmingfa_from;
			player.removeSkill("dcmingfa_effect");
			if (!source || !source.isIn()) {
				return;
			}
			if (player.countCards("h") < source.countCards("h")) {
				await source.damage();
				if (player.isIn() && player.countCards("h")) {
					await source.gainPlayerCard({ target: player, position: "h", forced: true });
				}
			} else {
				const num = Math.min(5, player.countCards("h")) - source.countCards("h");
				if (num > 0) {
					await source.draw(num);
				}
			}
		},
	},

	// ============ 曹髦（caomao） ============
	// 决讨：当你成为【杀】的目标后，你可以令此【杀】不可响应，然后令使用者展示一张手牌。
	// （原版"明置一张武将牌"依单主公将机制改写为"展示一张手牌"）
	juetao: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.card.name == "sha";
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("juetao", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			trigger.directHit.add(player);
			const source = trigger.player;
			if (source && source.isIn() && source.countCards("h")) {
				const result = await source.chooseCard("h", true, "决讨：展示一张手牌").forResult();
				if (result && result.bool && result.cards && result.cards.length) {
					await source.showCards(result.cards, `${get.translation(source)}因【决讨】被迫展示的牌`);
				}
			}
		},
	},

	// 潜龙：当你受到伤害后，你可以展示牌堆顶的三张牌，然后你可以使用其中至多已损失体力值
	// 张牌（无次数与距离限制）。与官方版部分类似（展示牌堆顶三张），但由"获得牌"改为"使用牌"。
	qianlong: {
		aiShowTag: "defense",
		group: ["qianlong_range"],
		preHidden: ["qianlong_range"],
		audio: 2,
		trigger: { player: "damageEnd" },
		frequent: true,
		async content(event, trigger, player) {
			const cards = get.cards(3, true);
			if (!cards.length) {
				return;
			}
			await player.showCards(cards, `${get.translation(player)}发动了【潜龙】`, true);
			let remain = Math.min(cards.length, player.getDamagedHp());
			player.addTempSkill("qianlong_range");
			for (const card of cards.slice()) {
				if (remain <= 0) {
					break;
				}
				if (!player.hasUseTarget(card, false) && !(get.info(card).notarget && lib.filter.cardEnabled(card, player))) {
					continue;
				}
				const result = await player.chooseUseTarget(card, false, false).forResult();
				if (result && result.bool) {
					remain--;
				}
			}
			player.removeSkill("qianlong_range");
		},
	},
	qianlong_range: {
		charlotte: true,
		mod: {
			targetInRange() {
				return true;
			},
			cardUsable() {
				return Infinity;
			},
		},
	},

	// 忿肆：锁定技，准备阶段，你对体力值不小于你的一名角色造成1点伤害，然后若该角色不为你，
	// 则其视为对你使用一张【杀】。与官方版一致，改写为现代async写法。
	fensi: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		async content(event, trigger, player) {
			if (!game.hasPlayer(current => current != player && current.hp >= player.hp)) {
				await player.damage();
				return;
			}
			const result = await player
				.chooseTarget(true, "忿肆：对一名体力值不小于你的角色造成1点伤害", (card, plyr, target) => target.hp >= player.hp)
				.forResult();
			if (result && result.targets && result.targets.length) {
				const target = result.targets[0];
				if (target.isIn()) {
					await target.damage();
					if (target.isIn() && target != player && target.canUse({ name: "sha", isCard: true }, player, false)) {
						await target.useCard({ name: "sha", isCard: true }, player, false, "noai");
					}
				}
			}
		},
	},

	// ============ 曹芳（caofang） ============
	// 诏图：每轮限一次，你可以将一张红色非锦囊牌当【乐不思蜀】使用，此回合结束后，目标
	// 执行一个手牌上限-2的额外回合。技能名与效果取自集换包"合曹芳"(jsrg_caofang)的同名
	// 技能"诏图"，改写为现代async写法。
	jsrgzhaotu: {
		aiShowTag: "support",
		group: ["jsrgzhaotu_effect"],
		preHidden: ["jsrgzhaotu_effect"],
		audio: 2,
		round: 1,
		enable: ["chooseToUse"],
		filterCard(card, player) {
			return get.color(card, player) == "red" && get.type(card) != "trick";
		},
		position: "hes",
		viewAs: { name: "lebu" },
		viewAsFilter(player) {
			return player.hasCards("hes", card => get.color(card, player) == "red" && get.type(card) != "trick");
		},
		prompt: "将一张红色非锦囊牌当【乐不思蜀】使用",
		check(card) {
			return 5 - get.value(card);
		},
		ai: {
			skillTagFilter(player) {
				return player.hasCards("hes", card => get.color(card, player) == "red" && get.type(card) != "trick");
			},
		},
	},
	jsrgzhaotu_effect: {
		charlotte: true,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return event.skill == "jsrgzhaotu" && event.targets && event.targets.length && event.targets[0].isIn();
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const target = trigger.targets[0];
			const next = target.insertPhase();
			next.skill = "jsrgzhaotu";
			target
				.when({ player: "phaseBegin" })
				.filter(evt => evt.skill == "jsrgzhaotu")
				.step(async (evt, trig, plyr) => {
					plyr.addTempSkill("jsrgzhaotu_handcard");
				});
		},
	},
	jsrgzhaotu_handcard: {
		charlotte: true,
		onremove: true,
		mod: {
			maxHandcard(player, num) {
				return num - 2;
			},
		},
	},

	// 惊惧：需要使用基本牌的时机，你可以将其他角色判定区里的一张牌移动至你的判定区，视为
	// 你使用一张基本牌。照抄集换包"合曹芳"(jsrg_caofang)的同名技能"惊惧"实现。
	jsrgjingju: {
		aiShowTag: "support",
		audio: 2,
		enable: "chooseToUse",
		filter(event, player) {
			if (event.type == "wuxie" || event.jsrgjingju) {
				return false;
			}
			if (
				!player.canMoveCard(
					null,
					false,
					game.filterPlayer(i => i != player),
					player,
					card => {
						if (card.cards) {
							return get.position(card.cards[0]) == "j";
						}
						return get.position(card) == "j";
					}
				)
			) {
				return false;
			}
			return get.inpileVCardList(info => {
				if (info[0] != "basic") {
					return false;
				}
				return event.filterCard(get.autoViewAs({ name: info[2], nature: info[3] }, "unsure"), player, event);
			}).length;
		},
		chooseButton: {
			dialog(event, player) {
				const vcards = get.inpileVCardList(info => {
					if (info[0] != "basic") {
						return false;
					}
					return event.filterCard(get.autoViewAs({ name: info[2], nature: info[3] }, "unsure"), player, event);
				});
				return ui.create.dialog("惊惧", [vcards, "vcard"], "hidden");
			},
			check(button) {
				const player = _status.event.player;
				if (get.event().getParent().type != "phase") {
					return 1;
				}
				return get.player().getUseValue({ name: button.link[2], nature: button.link[3] });
			},
			backup(links, player) {
				return {
					filterCard: () => false,
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						isCard: true,
					},
					log: false,
					selectCard: -1,
					async precontent(event, trigger, player) {
						const result = await player
							.moveCard({
								prompt: "惊惧：将其他角色判定区里的牌移动至你的判定区",
								sourceTargets: game.filterPlayer(current => current !== player),
								aimTargets: [player],
								filter(card) {
									if ("cards" in card) {
										return get.position(card.cards[0]) === "j";
									}
									return get.position(card) === "j";
								},
							})
							.set("logSkill", "jsrgjingju")
							.forResult();
						if (!result.bool) {
							const parent = event.getParent();
							if (parent != null) {
								parent.jsrgjingju = true;
								parent.goto(0);
								delete parent.openskilldialog;
							}
							return;
						}
						await game.delayx();
					},
				};
			},
			prompt(links, player) {
				return "选择" + get.translation(links[0][3] || "") + "【" + get.translation(links[0][2]) + "】的目标";
			},
		},
		ai: {
			order() {
				const player = get.player(),
					event = _status.event;
				if (
					player.canMoveCard(null, false, game.filterPlayer(), player, card => {
						return get.position(card) == "j";
					})
				) {
					if (event.type == "dying") {
						if (event.filterCard({ name: "tao" }, player, event)) {
							return 0.5;
						}
					} else {
						if (event.filterCard({ name: "tao" }, player, event) || event.filterCard({ name: "shan" }, player, event)) {
							return 4;
						}
						if (event.filterCard({ name: "sha" }, player, event)) {
							return 2.9;
						}
					}
				}
				return 0;
			},
			save: true,
			respondSha: true,
			respondShan: true,
			skillTagFilter(player) {
				return player.canMoveCard(null, false, game.filterPlayer(), player, card => {
					return get.position(card) == "j";
				});
			},
			result: {
				player(player) {
					if (get.event().type == "dying") {
						return get.attitude(player, get.event().dying);
					}
					return 1;
				},
			},
		},
	},

	// ============ 司马懿（simayi） ============
	// 反馈：当你受到伤害后，你可以获得场上的一张牌。与官方版不同：不限于伤害来源，而是
	// 场上（装备区/判定区）任意一名角色的一张牌。
	fankui: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return game.hasPlayer(current => current.countCards("ej") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("fankui"), (card, plyr, target) => target.countCards("ej") > 0).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target || !target.countCards("ej")) {
				return;
			}
			const result = await player.choosePlayerCard(target, "ej", true).forResult();
			if (result && result.cards && result.cards.length) {
				await player.gain(result.cards, target, "give");
			}
		},
	},

	// 鬼才：一名角色的判定牌生效前，你可以打出一张牌代替之。与官方版基本一致。
	guicai: {
		aiShowTag: "response",
		audio: 2,
		trigger: { global: "judge" },
		filter(event, player) {
			return player.hasCards("hs");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: `${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt("guicai")}`,
					filterCard(card) {
						const plyr = get.player();
						const mod2 = game.checkMod(card, plyr, "unchanged", "cardEnabled2", plyr);
						if (mod2 !== "unchanged") {
							return !!mod2;
						}
						const mod = game.checkMod(card, plyr, "unchanged", "cardRespondable", plyr);
						if (mod !== "unchanged") {
							return !!mod;
						}
						return true;
					},
					position: "hs",
				})
				.set("judging", trigger.player.judging[0])
				.forResult();
		},
		popup: false,
		async content(event, trigger, player) {
			const next = player.respond({
				cards: event.cards,
				skill: event.name,
				highlight: true,
				noOrdering: true,
			});
			await next;
			const { cards } = next;
			if (cards && cards.length) {
				await game.cardsDiscard(trigger.player.judging[0]);
				trigger.player.judging[0] = cards[0];
			}
		},
	},

// ============ 曹操（caocao） ============
	jianxiong: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		frequent: true,
		filter(event, player) {
			return event.num > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("jianxiong")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
			if (!trigger.cards || !trigger.cards.someInD()) {
				return;
			}
			const cards = trigger.cards.filterInD();
			const result = await player.chooseTarget("奸雄：令一名角色获得对你造成伤害的牌", (card, player, target) => true).forResult();
			if (result && result.bool && result.targets && result.targets.length) {
				await result.targets[0].gain(cards, "gain2");
			}
		},
		ai: {
			threaten: 1.2,
		},
	},
	huibian: {
		aiShowTag: "offense",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return true;
		},
		async content(event, trigger, player) {
			const target = event.target;
			if (!target.isIn()) {
				return;
			}
			await target.damage(1, player);
			if (!game.hasPlayer(current => current.isFriendOf(target) && current.isDamaged())) {
				return;
			}
			const result = await player
				.chooseTarget("挥鞭：令一名与" + get.translation(target) + "同势力且已受伤的角色回复1点体力", (card, player, tgt) => tgt.isFriendOf(target) && tgt.isDamaged())
				.forResult();
			if (result && result.bool && result.targets && result.targets.length) {
				await result.targets[0].recover();
			}
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					return get.attitude(player, target) > 0 ? -1 : 1;
				},
			},
		},
	},

	// ============ 张辽（zhangliao） ============
	tuxi: {
		aiShowTag: "support",
		group: ["tuxi_convert"],
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return !event.numFixed && game.hasPlayer(current => current != player && current.countCards("h") > 0);
		},
		async cost(event, trigger, player) {
			const num = Math.min(2, game.countPlayer(current => current != player && current.countCards("h") > 0));
			event.result = await player
				.chooseTarget(get.prompt2("tuxi"), [1, num], (card, player, target) => target != player && target.countCards("h") > 0)
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.changeToZero();
			const result = await player.gainMultiple(event.targets, "give").forResult();
			const cards = (result && result.cards) || [];
			for (const card of cards) {
				card.gaintag.add("tuxi_marked");
			}
		},
		ai: {
			threaten: 2,
		},
	},
	tuxi_convert: {
		aiShowTag: "support",
		charlotte: true,
		trigger: { player: ["gainAfter", "gainAsyncAfter"] },
		usable: 2,
		filter(event, player) {
			return event.cards.some(card => !(card.gaintag && card.gaintag.includes("tuxi_marked")) && player.getCards("he").includes(card));
		},
		async cost(event, trigger, player) {
			const pool = trigger.cards.filter(card => !(card.gaintag && card.gaintag.includes("tuxi_marked")) && player.getCards("he").includes(card));
			event.result = await player
				.chooseCard(card => pool.includes(card), [1, pool.length], "突袭：是否将任意张刚获得的牌置入弃牌堆，然后获得等量其他角色各一张手牌？")
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			await player.discard(cards);
			const num = Math.min(cards.length, game.countPlayer(current => current != player && current.countCards("h") > 0));
			if (num <= 0) {
				return;
			}
			const result = await player
				.chooseTarget([1, num], (card, player, target) => target != player && target.countCards("h") > 0)
				.set("prompt", "突袭：获得至多" + num + "名其他角色各一张手牌")
				.forResult();
			if (result && result.bool && result.targets && result.targets.length) {
				await player.gainMultiple(result.targets, "give");
			}
		},
	},

	// ============ 许褚（xuzhu） ============
	luoyi: {
		aiShowTag: "support",
		limited: true,
		skillAnimation: true,
		animationColor: "gray",
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.disableEquip("equip2");
			player.addSkill("luoyi_sha");
			player.addSkill("luoyi_shan");
			player.addSkill("luoyi_dmg");
		},
	},
	luoyi_sha: {
		aiShowTag: "offense",
		charlotte: true,
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard(card, player) {
			return get.subtype(card) == "equip2";
		},
		position: "hes",
		viewAs: { name: "sha" },
		viewAsFilter(player) {
			return player.hasCards("hes", card => get.subtype(card) == "equip2");
		},
		prompt: "将一张防具牌当【杀】使用或打出",
		check() {
			return 5;
		},
		ai: {
			respondSha: true,
			skillTagFilter(player) {
				return player.hasCards("hes", card => get.subtype(card) == "equip2");
			},
		},
	},
	luoyi_shan: {
		aiShowTag: "support",
		charlotte: true,
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard(card, player) {
			return get.subtype(card) == "equip2";
		},
		position: "hes",
		viewAs: { name: "shan" },
		viewAsFilter(player) {
			return player.hasCards("hes", card => get.subtype(card) == "equip2");
		},
		prompt: "将一张防具牌当【闪】使用或打出",
		ai: {
			respondShan: true,
			skillTagFilter(player) {
				return player.hasCards("hes", card => get.subtype(card) == "equip2");
			},
		},
	},
	luoyi_dmg: {
		charlotte: true,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return event.card && ["sha", "juedou"].includes(event.card.name);
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			trigger.num++;
		},
	},

	// ============ 郭嘉（guojia） ============
	tiandu: {
		aiShowTag: "support",
		audio: 2,
		trigger: { global: "phaseZhunbeiBegin" },
		frequent: true,
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("tiandu")).forResult();
		},
		async content(event, trigger, player) {
			const result = await player.judge().forResult();
			const card = result && result.card;
			if (!card) {
				return;
			}
			if (get.suit(card) == "spade") {
				await player.damage("thunder");
			}
			if (card.isInD && card.isInD()) {
				const gainResult = await player.chooseBool("天妒：是否获得此判定牌？").forResult();
				if (gainResult.bool) {
					await player.gain(card, "gain2");
				}
			}
		},
	},
	yiji: {
		aiShowTag: "defense",
		aiShowCost: true,
		audio: 2,
		trigger: { player: ["damageEnd", "dying"] },
		frequent: true,
		filter(event, player, name) {
			if (name == "dying") {
				return true;
			}
			return event.num > 0;
		},
		async content(event, trigger, player) {
			await player.draw(2);
			if (!player.countCards("he")) {
				return;
			}
			const result = await player
				.chooseCard("he", [0, 2], true)
				.set("prompt", "遗计：是否将至多两张牌交给其他角色？")
				.forResult();
			if (!result || !result.bool || !result.cards || !result.cards.length) {
				return;
			}
			for (const card of result.cards) {
				if (!player.getCards("he").includes(card)) {
					continue;
				}
				const targetResult = await player
					.chooseTarget("遗计：将" + get.translation(card) + "交给一名其他角色", (c, player, target) => target != player)
					.forResult();
				if (targetResult && targetResult.bool && targetResult.targets && targetResult.targets.length) {
					await player.give(card, targetResult.targets[0]);
				}
			}
		},
		ai: {
			threaten: 1.3,
		},
	},

	// ============ 徐晃（re_xuhuang） ============
	zhiyan: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			const used1 = player.getHistory("custom", evt => evt.zhiyan_draw).length > 0;
			const used2 = player.getHistory("custom", evt => evt.zhiyan_give).length > 0;
			return !used1 || !used2;
		},
		async content(event, trigger, player) {
			const used1 = player.getHistory("custom", evt => evt.zhiyan_draw).length > 0;
			const used2 = player.getHistory("custom", evt => evt.zhiyan_give).length > 0;
			const options = [];
			if (!used1) {
				options.push("摸牌至上限");
			}
			if (!used2) {
				options.push("交出手牌");
			}
			if (!options.length) {
				return;
			}
			const result = await player.chooseControl(options).set("prompt", "治严：请选择一项").forResult();
			if (result.control == "摸牌至上限") {
				player.getHistory("custom").push({ zhiyan_draw: true });
				const num = player.maxHp - player.countCards("h");
				if (num > 0) {
					await player.draw(num);
				}
				player.addTempSkill("zhiyan_lock", "phaseUseAfter");
			} else if (result.control == "交出手牌") {
				player.getHistory("custom").push({ zhiyan_give: true });
				const x = player.countCards("h") - player.hp;
				if (x > 0 && game.hasPlayer(current => current != player)) {
					const targetResult = await player
						.chooseTarget("治严：交给一名其他角色" + get.cnNumber(x) + "张手牌", (card, player, target) => target != player)
						.forResult();
					if (targetResult && targetResult.bool && targetResult.targets && targetResult.targets.length) {
						const num = Math.min(x, player.countCards("h"));
						const giveResult = await player
							.chooseCard("h", [num, num], true)
							.set("prompt", "治严：选择交给" + get.translation(targetResult.targets[0]) + "的" + get.cnNumber(num) + "张手牌")
							.forResult();
						if (giveResult && giveResult.bool && giveResult.cards && giveResult.cards.length) {
							await player.give(giveResult.cards, targetResult.targets[0]);
						}
					}
				}
			}
		},
	},
	zhiyan_lock: {
		charlotte: true,
		mod: {
			playerEnabled(card, player, target) {
				if (player !== target) {
					return false;
				}
			},
		},
	},

	// ============ 乐进（yuejin） ============
	xiaoguo: {
		aiShowTag: "offense",
		aiShowCost: true,
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return event.player != player && player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("h", true)
				.set("prompt2", "骁果：是否弃置一张手牌，令" + get.translation(trigger.player) + "选择弃备或受到伤害？")
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (!target.isIn()) {
				return;
			}
			const choice = await target
				.chooseControl(["弃备", "受伤"])
				.set("prompt", "骁果")
				.set("prompt2", "1.弃置一张装备牌，" + get.translation(player) + "获得此装备牌或摸一张牌；2.受到" + get.translation(player) + "造成的1点伤害")
				.forResult();
			if (choice.control == "弃备" && target.countCards("e")) {
				const result = await target.chooseCard("e", true, "骁果：弃置一张装备牌").forResult();
				if (result.bool && result.cards && result.cards.length) {
					const card = result.cards[0];
					await target.discard([card]);
					const choice2 = await player.chooseControl(["获得", "摸牌"]).set("prompt", "骁果").set("prompt2", "是否获得" + get.translation(card) + "，或摸一张牌？").forResult();
					if (choice2.control == "获得" && card.isInD && card.isInD()) {
						await player.gain(card, "gain2");
					} else {
						await player.draw();
					}
				}
			} else {
				await target.damage(1, player);
			}
		},
	},

	// ============ 卞夫人（ol_bianfuren） ============
	wanwei: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter", "gainAfter", "gainAsyncAfter"] },
		filter(event, player) {
			if (!event.player || event.player == player || !event.player.isFriendOf(player)) {
				return false;
			}
			if (!player.countCards("he")) {
				return false;
			}
			return !!(event.cards && event.cards.length);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("he", true)
				.set("prompt2", "挽危：是否弃置一张牌，用以代替" + get.translation(trigger.player) + "刚才移动的牌，令其获得等量的牌？")
				.forResult();
		},
		async content(event, trigger, player) {
			const num = trigger.cards.length;
			if (trigger.player.isIn() && num > 0) {
				await trigger.player.draw(num);
			}
		},
		ai: {
			threaten: 1.1,
		},
	},
	yuejian: {
		locked: true,
		group: ["yuejian_sync"],
		preHidden: ["yuejian_sync"],
	},
	yuejian_sync: {
		charlotte: true,
		trigger: { global: ["gameStart", "enterGame", "changeGroup", "phaseBegin"] },
		forced: true,
		popup: false,
		silent: true,
		sourceSkill: "yuejian",
		async content(event, trigger, player) {
			for (const current of game.players) {
				const shouldHave = current.isFriendOf(player);
				const has = current.hasSkill("yuejian_effect");
				if (shouldHave && !has) {
					current.addSkill("yuejian_effect");
				} else if (!shouldHave && has) {
					current.removeSkill("yuejian_effect");
				}
			}
		},
	},
	yuejian_effect: {
		charlotte: true,
		mod: {
			// gz3: 直接return会把其他技能（比如周瑜英姿的maxHandcard）已经算出来的值覆盖掉，
			// 两个技能同时命中同一个人时谁后算谁说了算，容易出现"手牌上限反而变小"这种
			// 反直觉结果。改成跟已有的num取较大值，两个效果同时存在时以数值大的为准。
			maxHandcardBase(player, num) {
				return Math.max(num, player.hp);
			},
		},
	},

	// ============ 曹植（caozhi） ============
	shijiu: {
		aiShowTag: "support",
		aiShowCost: true,
		group: ["shijiu_recast"],
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const result = await player.chooseCard("h", true, "诗酒：亮出一张手牌，称为“诗”").forResult();
			if (!result || !result.bool || !result.cards || !result.cards.length) {
				return;
			}
			const card = result.cards[0];
			player.showCards([card], get.translation(player) + "亮出的“诗”");
			player.storage.shijiu_marks = (player.storage.shijiu_marks || []).concat(card);
			const current = _status.currentPhase;
			if (!current || !current.isIn()) {
				return;
			}
			const jiuCard = { name: "jiu", isCard: true };
			if (!current.canUse(jiuCard, current)) {
				return;
			}
			const useResult = await player.chooseBool("诗酒：是否令" + get.translation(current) + "视为使用一张【酒】？").forResult();
			if (useResult.bool) {
				await current.useCard(jiuCard);
			}
		},
	},
	shijiu_recast: {
		aiShowTag: "defense",
		charlotte: true,
		onremove: "storage",
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return !!(player.storage.shijiu_marks && player.storage.shijiu_marks.length);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("诗酒：是否重铸你亮出的所有“诗”？").forResult();
		},
		async content(event, trigger, player) {
			const cards = (player.storage.shijiu_marks || []).filter(card => player.hasCard(cardx => cardx === card, "hej"));
			player.storage.shijiu_marks = [];
			if (cards.length) {
				await player.recast(cards);
			}
		},
	},
	zongjiang: {
		aiShowTag: "support",
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (event.type != "discard" || event.getlx === false) {
				return false;
			}
			if (event.player == player) {
				return false;
			}
			return event.cards.some(card => get.type(card) == "trick" || ["equip3", "equip4"].includes(get.subtype(card)));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zongjiang")).forResult();
		},
		async content(event, trigger, player) {
			const cards = trigger.cards.filter(card => card.isInD && card.isInD() && (get.type(card) == "trick" || ["equip3", "equip4"].includes(get.subtype(card))));
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
		ai: {
			threaten: 1.2,
		},
	},

	// ============ 钟会（zhonghui） ============
	quanji: {
		aiShowTag: "defense",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "damageEnd", source: "damageSource" },
		frequent: true,
		filter(event, player, name) {
			if (name == "damageSource") {
				return event.num > 0;
			}
			return event.num > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("quanji")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
			if (!player.countCards("h")) {
				return;
			}
			const result =
				player.countCards("h") == 1
					? { bool: true, cards: player.getCards("h") }
					: await player.chooseCard("h", true, "权计：将一张手牌置于武将牌上，称为“权”").forResult();
			if (result && result.bool && result.cards && result.cards.length) {
				const next = player.addToExpansion(result.cards, player, "give");
				next.gaintag.add("quanji");
				await next;
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		ai: {
			threaten: 1.3,
		},
	},
	paiyi: {
		aiShowTag: "offense",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.getExpansions("quanji").length > 0;
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions("quanji");
			if (!cards.length) {
				return;
			}
			const cardResult = cards.length == 1 ? { bool: true, links: cards } : await player.chooseButton(["排异：选择任意张“权”交给一名角色", cards], true).forResult();
			if (!cardResult || !cardResult.bool || !cardResult.links || !cardResult.links.length) {
				return;
			}
			const chosen = cardResult.links;
			const targetResult = await player.chooseTarget("排异：交给一名角色", true).forResult();
			if (!targetResult || !targetResult.bool || !targetResult.targets || !targetResult.targets.length) {
				return;
			}
			const target = targetResult.targets[0];
			await player.give(chosen, target);
			if (target.isIn() && target.countCards("h") > player.countCards("h")) {
				await target.damage(1, player);
			}
		},
	},
	yaopan: {
		aiShowTag: "control",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		audio: 2,
		group: ["yaopan_tracker"],
		trigger: { player: "phaseAfter" },
		filter(event, player) {
			return !!player.storage.yaopan_killed && game.hasPlayer(current => current.isFriendOf(player));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("yaopan")).forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const result = await player
				.chooseTarget("邀叛：指定一名同势力角色", (card, player, target) => target.isFriendOf(player))
				.forResult();
			const target = result && result.targets && result.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			const cards = player.getExpansions("quanji");
			if (cards.length) {
				await target.gain(cards, "gain2");
			}
			target.insertPhase();
		},
	},
	yaopan_tracker: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin", source: "dieAfter" },
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			if (event.triggername == "dieAfter") {
				player.storage.yaopan_killed = true;
			} else {
				player.storage.yaopan_killed = false;
			}
		},
	},

	// ============ 王基（wangji） ============
	qizhi: {
		aiShowTag: "draw",
		group: ["qizhi_reset"],
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!event.targets || !event.isFirstTarget) {
				return false;
			}
			if (_status.currentPhase != player) {
				return false;
			}
			const type = get.type(event.card, "trick");
			if (type != "basic" && type != "trick") {
				return false;
			}
			return game.hasPlayer(target => !event.targets.includes(target) && target.countCards("he") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("qizhi"), (card, player, target) => !trigger.targets.includes(target) && target.countCards("he") > 0)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.storage.qizhi_count = (player.storage.qizhi_count || 0) + 1;
			player.addTempSkill("qizhi_reset", "phaseAfter");
			await player.discardPlayerCard(target, "he", true);
			await target.draw();
		},
	},
	qizhi_reset: {
		charlotte: true,
		onremove: "storage",
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			player.storage.qizhi_count = 0;
		},
	},
	jinqu: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("jinqu")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw(2);
			const x = player.storage.qizhi_count || 0;
			if (player.countCards("h") > x) {
				await player
					.chooseToDiscard("h", true, player.countCards("h") - x)
					.set("prompt2", "进趋：将手牌弃置至" + get.cnNumber(x) + "张")
					.forResult();
			}
		},
	},

// ============ 丁奉（dingfeng） ============
	// 短兵：使用【杀】选择目标后，可为其增加一名距离为1的额外目标；对距离为1的角色使用的【杀】需两张【闪】才能抵消。
	reduanbing: {
		audio: 2,
		trigger: { player: "useCard2" },
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			return game.hasPlayer(current => !event.targets.includes(current) && get.distance(player, current) <= 1 && player.canUse(event.card, current));
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt("reduanbing"), "短兵：是否令一名距离为1的角色也成为此【杀】的目标？", (card, player, target) => {
					return !trigger.targets.includes(target) && get.distance(player, target) <= 1 && player.canUse(trigger.card, target);
				})
				.set("ai", target => get.effect(target, trigger.card, player, player))
				.forResult();
			if (result.bool && result.targets && result.targets.length) {
				trigger.targets.push(result.targets[0]);
			}
		},
		ai: {
			expose: 0.2,
		},
		group: "reduanbing_sha",
		subSkill: {
			sha: {
				charlotte: true,
				trigger: { player: "useCardToPlayered" },
				forced: true,
				filter(event, player) {
					return event.card.name == "sha" && get.distance(player, event.target) <= 1;
				},
				content(event, trigger, player) {
					const id = trigger.target.playerid;
					const map = trigger.getParent().customArgs;
					if (!map[id]) {
						map[id] = {};
					}
					map[id].shanRequired = (map[id].shanRequired || 1) + 1;
				},
			},
		},
	},
	// 奋迅：出牌阶段限一次，选择一名其他角色，本回合计算与其距离视为1；结束阶段若未对其造成过伤害，弃置一张牌。
	refenxun: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player;
		},
		content(event, trigger, player) {
			player.markAuto("refenxun2", [event.target]);
			player.addTempSkill("refenxun2");
		},
		ai: {
			order: 6.5,
			result: {
				player(player, target) {
					return get.distance(player, target) > 1 ? 1 : 0;
				},
			},
		},
	},
	refenxun2: {
		charlotte: true,
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		sourceSkill: "refenxun",
		filter(event, player) {
			return (
				player.getHistory("sourceDamage", evt => player.storage.refenxun2.includes(evt.player)).length == 0 &&
				player.countCards("he", card => lib.filter.cardDiscardable(card, player, "refenxun2")) > 0
			);
		},
		async content(event, trigger, player) {
			await player.chooseToDiscard("he", true).forResult();
		},
		onremove: true,
		intro: {
			content: "到$的距离视为1",
		},
		mod: {
			globalFrom(from, to) {
				if (from.storage.refenxun2.includes(to)) {
					return -Infinity;
				}
			},
		},
	},

	// ============ 吕范（lvfan） ============
	// 调度：同势力角色使用装备牌时若其无该类别装备可摸一张牌；准备阶段可移动同势力角色间的装备。
	diaodu: {
		audio: 2,
		trigger: { global: "useCard" },
		filter(event, player) {
			if (get.type(event.card) != "equip") {
				return false;
			}
			if (!event.player.isFriendOf(player)) {
				return false;
			}
			return !event.player.getEquip(get.subtype(event.card));
		},
		async content(event, trigger, player) {
			await player.draw();
		},
		ai: {
			expose: 0.2,
		},
		group: "diaodu_move",
		subSkill: {
			move: {
				charlotte: true,
				trigger: { player: "phaseZhunbeiBegin" },
				sourceSkill: "diaodu",
				filter(event, player) {
					return game.hasPlayer(target => target.isFriendOf(player) && target.hasCards("e", card => game.hasPlayer(current => current != target && current.isFriendOf(player) && current.canEquip(card))));
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget(get.prompt("diaodu"), "调度：选择一名同势力角色，移动其装备区里的一张牌", (card, player, target) => {
							return target.isFriendOf(player) && target.hasCards("e", card => game.hasPlayer(current => current != target && current.isFriendOf(player) && current.canEquip(card)));
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const from = event.target;
					const es = from.getCards("e", card => game.hasPlayer(current => current != from && current.isFriendOf(player) && current.canEquip(card)));
					const result =
						es.length == 1
							? { bool: true, links: es }
							: await player
									.chooseButton({
										createDialog: ["移动" + get.translation(from) + "的一张装备牌", es],
										forced: true,
									})
									.forResult();
					if (!result || !result.bool || !result.links || !result.links.length) {
						return;
					}
					const card = result.links[0];
					const result2 = await player
						.chooseTarget(get.prompt2("diaodu"), "请选择" + get.translation(card) + "的移动目标", (card2, player, target) => target != from && target.isFriendOf(player) && target.canEquip(card))
						.set("card", card)
						.forResult();
					if (!result2 || !result2.bool || !result2.targets || !result2.targets.length) {
						return;
					}
					const to = result2.targets[0];
					from.$give(card, to);
					await game.delay(0.5);
					await to.equip(card);
				},
			},
		},
	},
	// 典财：其他角色出牌阶段结束时，若你此阶段失去的牌数不小于X（体力值），可将手牌摸至体力上限，然后摸一张牌。
	diancai: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { global: "phaseUseEnd" },
		filter(event, player) {
			if (_status.currentPhase === player) {
				return false;
			}
			let num = 0;
			player.getHistory("lose", evt => {
				if (evt.cards2 && evt.getParent("phaseUse") === event) {
					num += evt.cards2.length;
				}
			});
			return num >= player.hp;
		},
		frequent: true,
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt("diancai")).forResult();
		},
		async content(event, trigger, player) {
			const need = player.maxHp - player.countCards("h");
			if (need > 0) {
				await player.draw(need);
			}
			await player.draw();
		},
	},

	// ============ 周处（jin_zhouchu，沿用周处唯一同名旧id，势力改为wu） ============
	// 凶侠：出牌阶段，可将两张牌当【决斗】对两名其他角色使用；若均造成过伤害，本回合此技能失效。
	xiongxia: {
		audio: 2,
		enable: "phaseUse",
		filterCard: true,
		selectCard: 2,
		position: "he",
		filterTarget(card, player, target) {
			return target != player;
		},
		selectTarget: 2,
		multitarget: true,
		viewAs: { name: "juedou" },
		filter(event, player) {
			return !player.hasSkill("xiongxia_disable");
		},
		ai: {
			damage: true,
			order: 7,
		},
		group: "xiongxia_after",
		subSkill: {
			after: {
				charlotte: true,
				trigger: { player: "useCardAfter" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.skill == "xiongxia";
				},
				async content(event, trigger, player) {
					const targets = trigger.targets || [];
					if (targets.length && targets.every(target => target.getHistory("damage", evt => evt.card === trigger.card).length > 0)) {
						player.addTempSkill("xiongxia_disable", "phaseAfter");
					}
				},
			},
		},
	},
	xiongxia_disable: {
		charlotte: true,
	},

	// ============ 潘濬（panjun） ============
	// 聪察：准备阶段可选择一名其他角色，同势力则各摸两张牌，不同势力则其失去1点体力；
	// 若选择了势力不同的角色，摸牌阶段可多摸两张牌。
	congcha: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("congcha"), "聪察：选择一名其他角色，同势力则各摸两张牌，不同势力则其失去1点体力", lib.filter.notMe)
				.set("ai", target => {
					const player = get.player();
					return target.isFriendOf(player) ? 6 : -get.attitude(player, target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.target;
			if (target.isFriendOf(player)) {
				player.storage.congcha_bonus = false;
				await player.draw(2);
				await target.draw(2);
			} else {
				player.storage.congcha_bonus = true;
				await target.loseHp();
			}
		},
		ai: {
			order: 8,
			result: { player: 1 },
		},
		group: "congcha_draw",
		subSkill: {
			draw: {
				charlotte: true,
				trigger: { player: "phaseDrawBegin2" },
				frequent: true,
				filter(event, player) {
					return !event.numFixed && player.storage.congcha_bonus;
				},
				async content(event, trigger, player) {
					trigger.num += 2;
				},
			},
		},
	},
	// 公清：锁定技，受到伤害时，若来源攻击范围<3则伤害改为1，>3则伤害+1。
	xinfu_gongqing: {
		audio: 2,
		locked: true,
		trigger: { player: "damageBegin1" },
		forced: true,
		filter(event, player) {
			return !!event.source;
		},
		content(event, trigger, player) {
			const range = trigger.source.getAttackRange();
			if (range < 3) {
				trigger.num = 1;
			} else if (range > 3) {
				trigger.num++;
			}
		},
	},

	// ============ 孙权（sunquan） ============
	// 制衡：出牌阶段限一次，弃置至多X张手牌（X为体力上限），然后摸等量的牌；若弃光了手牌，额外摸一张。
	zhiheng: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const before = player.countCards("h");
			const num = Math.min(player.maxHp, before);
			const result = await player.chooseToDiscard("h", [1, num], true).forResult();
			if (!result || !result.bool || !result.cards || !result.cards.length) {
				return;
			}
			await player.draw(result.cards.length);
			if (result.cards.length == before) {
				await player.draw();
			}
		},
		ai: {
			order: 6,
			result: { player: 1 },
		},
	},
	// 嘉禾：结束阶段，可令一名其他吴势力角色摸一张牌，然后若其体力值不大于你且你已受伤，你回复1点体力。
	jiahe: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.isFriendOf(player));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("jiahe"), "嘉禾：选择一名其他吴势力角色，其摸一张牌", (card, player, target) => target != player && target.isFriendOf(player))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.target;
			await target.draw();
			if (target.hp <= player.hp && player.isDamaged()) {
				await player.recover();
			}
		},
		ai: {
			order: 4,
			result: { player: 1 },
		},
	},

	// ============ 陆逊（luxun） ============
	// 谦逊：锁定技，不能成为【顺手牵羊】和【乐不思蜀】的目标。
	qianxun: {
		audio: 2,
		locked: true,
		mod: {
			targetEnabled(card, player, target) {
				if (card.name == "shunshou" || card.name == "lebu") {
					return false;
				}
			},
		},
	},
	// 度势：出牌阶段可弃置一张红色手牌，然后摸两张牌，再弃置两张牌；若因此弃光了手牌，摸一张牌，
	// 然后失去"度势"，获得"连营"。
	lxdushi: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: { color: "red" },
		position: "h",
		selectCard: 1,
		async content(event, trigger, player) {
			await player.discard(event.cards);
			await player.draw(2);
			const has = player.countCards("h");
			if (!has) {
				return;
			}
			const result = await player.chooseToDiscard("h", Math.min(2, has), true).forResult();
			if (result && result.bool && result.cards && result.cards.length && !player.countCards("h")) {
				await player.draw();
				player.removeSkill("lxdushi");
				player.addSkill("lianying");
			}
		},
		ai: {
			order: 7,
			result: { player: 1 },
		},
	},
	// 连营：当你失去最后的手牌时，可以摸一张牌。（获得自"度势"的转化技能）
	lianying: {
		aiShowTag: "defense",
		audio: 2,
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		frequent: true,
		filter(event, player) {
			if (player.hasCards("h")) {
				return false;
			}
			const evt = event.getl(player);
			return evt && evt.player === player && evt.hs && evt.hs.length > 0;
		},
		async content(event, trigger, player) {
			await player.draw();
		},
	},

	// ============ 甘宁（ganning） ============
	// 奇袭：可将一张黑色牌当【过河拆桥】使用；回合外弃置其他角色的牌后，可使用其中一张基本牌或装备牌。
	qixi: {
		aiShowTag: "offense",
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard(card, player) {
			return get.color(card, player) == "black";
		},
		position: "he",
		viewAs: { name: "guohe" },
		viewAsFilter(player) {
			return player.countCards("he", card => get.color(card, player) == "black") > 0;
		},
		prompt: "将一张黑色牌当【过河拆桥】使用",
		check(card) {
			return 5 - get.value(card);
		},
		ai: {
			respondSha: false,
			skillTagFilter(player) {
				if (!player.countCards("he", card => get.color(card, player) == "black")) {
					return false;
				}
			},
		},
		group: "qixi_after",
		subSkill: {
			after: {
				charlotte: true,
				trigger: { player: ["discardAfter"] },
				filter(event, player) {
					if (_status.currentPhase === player) {
						return false;
					}
					if (event.discarder != player || event.player == player) {
						return false;
					}
					return event.cards && event.cards.some(card => ["basic", "equip"].includes(get.type(card, null, false)));
				},
				async cost(event, trigger, player) {
					const cards = trigger.cards.filter(card => ["basic", "equip"].includes(get.type(card, null, false)));
					event.result = await player.chooseButton([get.prompt("qixi"), [cards, "vcard"]]).forResult();
				},
				async content(event, trigger, player) {
					const card = event.links && event.links[0];
					if (card) {
						await player.chooseUseTarget(card, true, false);
					}
				},
			},
		},
	},
	// 奋威：每轮限一次，锦囊牌指定不少于两个目标后，可令此牌对其中一名目标无效，然后可发动一次"奇袭"。
	gnfenwei: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		round: 1,
		trigger: { global: "useCard1" },
		filter(event, player) {
			return get.type(event.card) == "trick" && event.targets && event.targets.length >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("gnfenwei"), "奋威：选择" + get.translation(trigger.card) + "的一名目标角色，令其无效", (card, player, target) => trigger.targets.includes(target))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.target;
			trigger.excluded.add(target);
			if (!player.countCards("he", card => get.color(card, player) == "black")) {
				return;
			}
			const bool = await player.chooseBool("是否发动一次〖奇袭〗？").forResult();
			if (!bool || !bool.bool) {
				return;
			}
			const cardResult = await player.chooseCard("he", "奇袭：选择一张黑色牌当【过河拆桥】使用", card => get.color(card, player) == "black", true).forResult();
			if (!cardResult || !cardResult.bool || !cardResult.cards || !cardResult.cards.length) {
				return;
			}
			await player.chooseUseTarget({ name: "guohe", cards: cardResult.cards }, true, false);
		},
	},

	// ============ 吕蒙（lvmeng） ============
	// 克己：锁定技，弃牌阶段开始时若本回合出牌阶段未使用过不同颜色的牌，则本回合手牌上限+4。
	keji: {
		audio: 2,
		locked: true,
		trigger: { player: "phaseDiscardBegin" },
		forced: true,
		popup: false,
		filter(event, player) {
			const colors = [];
			player.getHistory("useCard", evt => {
				if (evt.getParent("phaseUse") === event.getParent("phaseUse")) {
					const c = get.color(evt.card, player);
					if (c && c != "none" && !colors.includes(c)) {
						colors.push(c);
					}
				}
			});
			return colors.length <= 1;
		},
		content(event, trigger, player) {
			player.addTempSkill("keji_buff", "phaseAfter");
		},
	},
	keji_buff: {
		charlotte: true,
		mod: {
			maxHandcard(player, num) {
				return num + 4;
			},
		},
	},
	// 夺荆：其他角色出牌阶段开始时，若其体力值不小于你，可令其跳过出牌阶段；其回合结束后，
	// 你执行一个只有出牌阶段的额外回合，然后失去"克己"，获得"涉猎"和"攻心"。
	duojing: {
		audio: 2,
		trigger: { global: "phaseUseBefore" },
		filter(event, player) {
			return event.player != player && event.player.hp >= player.hp;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt("duojing"), "夺荆：是否令" + get.translation(trigger.player) + "跳过出牌阶段？").forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.storage.duojing_target = trigger.player;
			player.addTempSkill("duojing_after");
		},
		ai: {
			order: 9,
			result: { player: 1 },
		},
		group: "duojing_after",
		subSkill: {
			after: {
				charlotte: true,
				trigger: { global: "phaseAfter" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.player === player.storage.duojing_target;
				},
				async content(event, trigger, player) {
					delete player.storage.duojing_target;
					player.removeSkill("duojing_after");
					player.insertPhase().set("phaseList", ["phaseUse"]);
					player.removeSkill("keji");
					player.addSkill("shelie");
					player.addSkill("gongxin");
				},
			},
		},
	},
	// 涉猎：摸牌阶段可改为亮出牌堆顶五张牌，获得其中每种不同花色的牌各一张，其余置入弃牌堆。（获得自"夺荆"）
	shelie: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return !event.numFixed;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt("shelie")).forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			const cards = get.cards(5);
			game.log(player, "亮出了", cards);
			const suits = [];
			const gain = [];
			const rest = [];
			for (const card of cards) {
				const suit = get.suit(card);
				if (!suits.includes(suit)) {
					suits.push(suit);
					gain.push(card);
				} else {
					rest.push(card);
				}
			}
			if (gain.length) {
				await player.gain(gain, "gain2");
			}
			if (rest.length) {
				await game.cardsDiscard(rest);
			}
		},
	},
	// 攻心：出牌阶段限一次，观看一名其他角色的手牌，展示其中一张红桃牌，然后置于牌堆顶或弃置。（获得自"夺荆"）
	gongxin: {
		aiShowTag: "offense",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const target = event.target;
			await player.viewHandcards(target);
			const hearts = target.getCards("h", card => get.suit(card, target) == "heart");
			if (!hearts.length) {
				return;
			}
			const result = await player.chooseButton([get.prompt2("gongxin"), [hearts, "vcard"]], true).forResult();
			if (!result || !result.bool || !result.links || !result.links.length) {
				return;
			}
			const card = result.links[0];
			player.showCards([card]);
			const choice = await player.chooseBool("是否将此牌置于牌堆顶？（否则弃置）").forResult();
			if (choice && choice.bool) {
				target.loseTo(card, ui.cardPile, "insert");
			} else {
				await target.discard(card);
			}
		},
		ai: {
			order: 3,
			result: { player: 1 },
		},
	},

	// ============ 黄盖（huanggai） ============
	// 苦肉：出牌阶段限一次，弃置一张牌，然后摸一张牌，并失去1点体力。
	kurou: {
		aiShowTag: "draw",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		position: "he",
		selectCard: 1,
		async content(event, trigger, player) {
			await player.discard(event.cards);
			await player.draw();
			await player.loseHp();
		},
		ai: {
			order: 6,
			result: { player: 1 },
		},
	},
	// 诈降：锁定技，失去1点体力后摸两张牌，若此时为出牌阶段内，则本回合【杀】次数上限+1，红色【杀】无距离限制。
	hgzhaxiang: {
		audio: 2,
		locked: true,
		trigger: { player: "loseHpAfter" },
		forced: true,
		async content(event, trigger, player) {
			await player.draw(2);
			if (trigger.getParent("phaseUse")) {
				player.addTempSkill("hgzhaxiang_buff", "phaseUseAfter");
			}
		},
	},
	hgzhaxiang_buff: {
		charlotte: true,
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return num + 1;
				}
			},
			targetInRange(card, player, target) {
				if (card.name == "sha" && get.color(card, player) == "red") {
					return true;
				}
			},
		},
	},

	// ============ 周瑜（zhouyu） ============
	// 英姿：锁定技，摸牌阶段多摸一张牌；手牌上限等于体力上限。
	yingzi: {
		audio: 2,
		locked: true,
		trigger: { player: "phaseDrawBegin2" },
		forced: true,
		filter(event, player) {
			return !event.numFixed;
		},
		content(event, trigger, player) {
			trigger.num++;
		},
		mod: {
			// gz3: 直接return会覆盖掉其他技能（比如卞夫人约俭的maxHandcardBase）已经算出
			// 来的值，两个人同时受影响时谁先算谁被覆盖，容易出现"手牌上限反而变小"。
			// 改成跟已有的num取较大值。
			maxHandcard(player, num) {
				return Math.max(num, player.maxHp);
			},
		},
	},
	// 反间：出牌阶段限一次，展示一张手牌交给一名其他角色，其横置，并选择展示手牌弃置同花色的牌或失去1点体力。
	fanjian: {
		aiShowTag: "offense",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		position: "h",
		selectCard: 1,
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const card = event.cards[0];
			const target = event.target;
			player.showCards([card]);
			await target.gain([card], player, "give");
			await target.link(true);
			const choice = await target
				.chooseControl("show", "losehp")
				.set("prompt", "反间：请选择一项")
				.set("choiceList", ["展示所有手牌，然后弃置与" + get.translation(card) + "花色相同的所有牌", "失去1点体力"])
				.forResult();
			if (choice.control == "show") {
				const hs = target.getCards("h");
				target.showCards(hs);
				const suit = get.suit(card, target);
				const same = target.getCards("h", c => get.suit(c, target) == suit);
				if (same.length) {
					await target.discard(same);
				}
			} else {
				await target.loseHp();
			}
		},
		ai: {
			order: 5,
			result: { target: -1 },
		},
	},
	// 焰洄：使用牌指定目标后，可展示该目标一张手牌，若此牌本回合已被展示过则弃置之；出牌阶段结束时，
	// 选择对因此失去过牌的一名角色造成1点火焰伤害，或摸X张牌（X为本回合被展示过牌的角色数）。
	yanhui: {
		audio: 2,
		trigger: { player: "useCardToTarget" },
		filter(event, player) {
			return event.target.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt("yanhui")).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			const result = await player.choosePlayerCard(target, "h", true).forResult();
			if (!result || !result.bool || !result.cards || !result.cards.length) {
				return;
			}
			const card = result.cards[0];
			if (!player.storage.yanhui_shown) {
				player.storage.yanhui_shown = [];
			}
			if (!player.storage.yanhui_targets) {
				player.storage.yanhui_targets = [];
			}
			if (!player.storage.yanhui_targets.includes(target)) {
				player.storage.yanhui_targets.push(target);
			}
			if (player.storage.yanhui_shown.includes(card)) {
				await target.discard(card);
				if (!player.storage.yanhui_lost) {
					player.storage.yanhui_lost = [];
				}
				if (!player.storage.yanhui_lost.includes(target)) {
					player.storage.yanhui_lost.push(target);
				}
			} else {
				player.storage.yanhui_shown.push(card);
			}
			player.addTempSkill("yanhui_end", "phaseUseAfter");
		},
		group: "yanhui_end",
		subSkill: {
			end: {
				charlotte: true,
				trigger: { player: "phaseUseAfter" },
				forced: true,
				filter(event, player) {
					return player.storage.yanhui_targets && player.storage.yanhui_targets.length > 0;
				},
				async cost(event, trigger, player) {
					const lost = player.storage.yanhui_lost || [];
					const choices = ["draw"];
					if (lost.length) {
						choices.unshift("burn");
					}
					event.result = await player
						.chooseControl(choices)
						.set("prompt", get.prompt("yanhui"))
						.set("choiceList", [lost.length ? "对一名因〖焰洄〗失去过牌的角色造成1点火焰伤害" : null, "摸" + (player.storage.yanhui_targets || []).length + "张牌"].filter(Boolean))
						.forResult();
				},
				async content(event, trigger, player) {
					const lost = player.storage.yanhui_lost || [];
					const targets = player.storage.yanhui_targets || [];
					if (event.control == "burn" && lost.length) {
						const result = await player.chooseTarget(true, (card, player, target) => lost.includes(target)).forResult();
						if (result.bool && result.targets && result.targets.length) {
							await result.targets[0].damage(1, player, "fire");
						}
					} else if (targets.length) {
						await player.draw(targets.length);
					}
					delete player.storage.yanhui_shown;
					delete player.storage.yanhui_targets;
					delete player.storage.yanhui_lost;
				},
			},
		},
	},

// ============ 大乔（daqiao） ============
	// 国色：你可以将一张♦牌当【乐不思蜀】使用。
	guose: {
		aiShowTag: "support",
		audio: 2,
		enable: "chooseToUse",
		filterCard(card) {
			return get.suit(card) === "diamond";
		},
		position: "hes",
		viewAs: { name: "lebu" },
		prompt: "将一张♦牌当【乐不思蜀】使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: {
			threaten: 1.5,
		},
	},
	// 国色（后半）：每回合限一次，你可以将场上的一张【乐不思蜀】移动至另一名角色的判定区。
	guose2: {
		aiShowTag: "support",
		charlotte: true,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => current.countCards("j", card => get.name(card, current) == "lebu") > 0);
		},
		async cost(event, trigger, player) {
			const holderResult = await player
				.chooseTarget(get.prompt("guose2"), "将一名角色判定区里的一张【乐不思蜀】移动至另一名角色的判定区", (card, player, target) => target.countCards("j", card => get.name(card, target) == "lebu") > 0)
				.forResult();
			if (!holderResult.bool) {
				event.result = { bool: false };
				return;
			}
			const holder = holderResult.targets[0];
			const cardResult = await player
				.choosePlayerCard(holder, "j", true)
				.set("filterButton", button => get.name(button.link, holder) == "lebu")
				.forResult();
			if (!cardResult.bool || !cardResult.cards || !cardResult.cards.length) {
				event.result = { bool: false };
				return;
			}
			const destResult = await player.chooseTarget((card, player, target) => target != holder, "选择要移动至的判定区").forResult();
			if (!destResult.bool) {
				event.result = { bool: false };
				return;
			}
			event.holder = holder;
			event.moveCard = cardResult.cards[0];
			event.dest = destResult.targets[0];
			event.result = { bool: true };
		},
		async content(event, trigger, player) {
			const { holder, moveCard, dest } = event;
			holder.$give(moveCard, dest);
			await game.delay();
			await dest.addJudge(moveCard);
		},
	},
	// 流离：当你成为【杀】的目标时，你可以弃置一张牌并将此【杀】转移给你攻击范围内的一名其他角色（不能是此【杀】的使用者）。
	liuli: {
		aiShowTag: "support",
		audio: 2,
		trigger: { target: "useCardToTarget" },
		preHidden: true,
		filter(event, player) {
			if (event.card.name !== "sha") {
				return false;
			}
			if (!player.hasCards("he")) {
				return false;
			}
			return game.hasPlayer(current => player.inRange(current) && current !== event.player && current !== player && !!lib.filter.targetEnabled(event.card, event.player, current));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					filterTarget(card, player, target) {
						const trigger = _status.event;
						return player.inRange(target) && target != trigger.source && !!lib.filter.targetEnabled(trigger.card, trigger.source, target);
					},
					filterCard: lib.filter.cardDiscardable,
					position: "he",
					prompt: get.prompt(event.skill),
					prompt2: "弃置一张牌，将此【杀】转移给你攻击范围内的一名其他角色",
					source: trigger.player,
					card: trigger.card,
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const evt = trigger.getParent();
			if (evt) {
				evt.triggeredTargets2.remove(player);
				evt.targets.remove(player);
				evt.targets.push(target);
				await player.discard({ cards: event.cards });
			}
		},
	},

	// ============ 孙尚香（sunshangxiang） ============
	// 枭姬：当你失去一张装备区内的牌后，你可以摸两张牌。
	xiaoji: {
		aiShowTag: "defense",
		audio: 2,
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		frequent: true,
		getIndex(event, player) {
			const evt = event.getl(player);
			if (evt?.player === player && evt.es) {
				return evt.es.length;
			}
			return false;
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
	},
	// 结姻：出牌阶段限一次，你可以选择一名男性角色并弃置一张手牌或将一张装备牌置入其装备区。
	// 然后你与其体力值较高的角色摸一张牌，体力值较低的角色回复1点体力。
	jieyin: {
		aiShowTag: "draw",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		selectCard: 1,
		position: "h",
		filterTarget(card, player, target) {
			return target != player && target.hasSex("male");
		},
		async content(event, trigger, player) {
			const target = event.target;
			const card = event.cards[0];
			if (get.type(card, player) == "equip") {
				const { control } = await player.chooseControl("弃置", "置入装备区").set("prompt", "结姻：如何处理" + get.translation(card) + "？").forResult();
				if (control == "置入装备区") {
					await target.equip(card);
				} else {
					await player.discard(card);
				}
			} else {
				await player.discard(card);
			}
			if (!target.isIn()) {
				return;
			}
			const high = player.hp >= target.hp ? player : target;
			const low = high == player ? target : player;
			await high.draw();
			if (low.isDamaged()) {
				await low.recover();
			}
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					return get.attitude(player, target);
				},
			},
		},
	},

	// ============ 孙坚（sunjian） ============
	// 英魂：准备阶段，你可以选择一名其他角色并选择一项：1.令其摸X张牌，然后弃置一张牌；
	// 2.令其摸一张牌，然后弃置X张牌。（X为你已损失的体力值）
	gzyinghun: {
		aiShowTag: "defense",
		aiShowCost: true,
		audio: "yinghun",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.getDamagedHp() > 0 && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2(event.skill), (card, player, target) => player != target).forResult();
		},
		async content(event, trigger, player) {
			const num = player.getDamagedHp();
			const [target] = event.targets;
			const str1 = "摸" + get.cnNumber(num, true) + "弃一";
			const str2 = "摸一弃" + get.cnNumber(num, true);
			const { control } = await player.chooseControl(str1, str2).set("prompt", get.prompt(event.skill)).forResult();
			if (control == str1) {
				await target.draw(num);
				await target.chooseToDiscard(true, "he");
			} else {
				await target.draw();
				await target.chooseToDiscard(num, true, "he");
			}
		},
	},
	// 毅魄：限定技，当你的体力值变为1时，你可以发动一次“英魂”。
	yipo: {
		aiShowTag: "defense",
		aiShowCost: true,
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "gold",
		trigger: { player: ["loseHpAfter", "damageAfter"] },
		filter(event, player) {
			return player.hp == 1 && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt(event.skill), "是否发动一次〖英魂〗？").forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const num = player.getDamagedHp();
			const targetResult = await player.chooseTarget(get.prompt2("gzyinghun"), (card, player, target) => player != target).forResult();
			if (!targetResult.bool) {
				return;
			}
			const [target] = targetResult.targets;
			const str1 = "摸" + get.cnNumber(num, true) + "弃一";
			const str2 = "摸一弃" + get.cnNumber(num, true);
			const { control } = await player.chooseControl(str1, str2).set("prompt", "英魂").forResult();
			if (control == str1) {
				await target.draw(num);
				await target.chooseToDiscard(true, "he");
			} else {
				await target.draw();
				await target.chooseToDiscard(num, true, "he");
			}
		},
	},

	// ============ 孙策（sunce） ============
	// 激昂：当你使用【决斗】或红色【杀】指定目标后，或成为【决斗】或红色【杀】的目标后，你可以摸一张牌。
	// 当你拼点的牌亮出后，你可以令此牌的点数+3或-3。
	scjiang: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "useCardToTarget", target: "useCardToTarget" },
		frequent: true,
		filter(event, player, name) {
			if (event.card.name != "juedou" && !(event.card.name == "sha" && get.color(event.card, event.player) == "red")) {
				return false;
			}
			return name != "target" || event.player != player;
		},
		async content(event, trigger, player) {
			await player.draw();
		},
	},
	// 激昂（拼点部分）
	scjiang_pd: {
		aiShowTag: "support",
		charlotte: true,
		trigger: { player: "compare", target: "compare" },
		async content(event, trigger, player) {
			const { control } = await player.chooseControl("+3", "-3", "cancel2").set("prompt", "激昂：是否令你拼点的牌点数+3或-3？").set("_animate", false).forResult();
			if (control == "cancel2") {
				return;
			}
			const delta = control == "+3" ? 3 : -3;
			if (trigger.player == player) {
				trigger.num1 = (typeof trigger.num1 == "number" ? trigger.num1 : get.number(trigger.card1)) + delta;
			} else {
				trigger.num2 = (typeof trigger.num2 == "number" ? trigger.num2 : get.number(trigger.card2)) + delta;
			}
		},
	},
	// 鹰扬：准备阶段，你可以与一名其他角色拼点。赢的角色视为对没赢的角色使用一张【决斗】。
	// 若你因此【决斗】受到伤害，你失去此技能并获得“魂殇”。
	scyingyang: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt(event.skill), "你可以与一名其他角色拼点", (card, player, target) => target != player).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player.chooseToCompare(target).forResult();
			if (result.tie) {
				return;
			}
			const winner = result.bool ? player : target;
			const loser = winner == player ? target : player;
			const hpBefore = player.hp;
			const card = { name: "juedou", isCard: true };
			if (winner.canUse(card, loser)) {
				await winner.useCard(card, loser);
			}
			if (player.isIn() && player.hp < hpBefore) {
				player.removeSkill("scyingyang");
				player.addSkills(["schunshang", "scyingpo"]);
			}
		},
	},
	// 魂殇：锁定技，准备阶段，若你已损失体力值不小于2，你本回合内视为拥有“英姿”和“英魄”。
	schunshang: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return player.getDamagedHp() >= 2;
		},
		content(event, trigger, player) {
			player.addTempSkill("yingzi", "phaseAfter");
			player.addTempSkill("scyingpo_buff", "phaseAfter");
		},
	},
	// 英魄（魂殇附带）：锁定技，你使用【杀】造成的伤害+1。
	scyingpo: {
		charlotte: true,
	},
	scyingpo_buff: {
		charlotte: true,
		trigger: { source: "damageBegin1" },
		forced: true,
		filter(event, player) {
			return !!event.card && event.card.name == "sha";
		},
		content(event, trigger, player) {
			trigger.num++;
		},
	},

	// ============ 小乔（xiaoqiao） ============
	// 天香：当你受到伤害时，你可以弃置一张♥手牌并选择一名其他角色，然后防止此次伤害并选择一项：
	// 1.令来源对其造成1点伤害，然后其摸X张牌（X为其已损失体力值且至多为5）；
	// 2.令其失去1点体力，然后其获得你弃置的牌。每项于一个回合内各限一次。
	retianxiang: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageBegin1" },
		filter(event, player) {
			return player.countCards("h", card => get.suit(card, player) == "heart") > 0 && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					filterCard(card, player) {
						return get.suit(card, player) == "heart";
					},
					filterTarget(card, player, target) {
						return target != player;
					},
					position: "h",
					prompt: get.prompt(event.skill),
					prompt2: "弃置一张♥手牌并选择一名其他角色，防止你受到的此次伤害",
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.discard(event.cards);
			trigger.cancel();
			const source = trigger.source;
			const canOpt1 = source && source.isIn() && !player.hasSkill("retianxiang_mark1");
			const canOpt2 = !player.hasSkill("retianxiang_mark2");
			if (!canOpt1 && !canOpt2) {
				return;
			}
			let useOpt1 = canOpt1;
			if (canOpt1 && canOpt2) {
				useOpt1 =
					(
						await player
							.chooseControl("选项1", "选项2")
							.set("prompt", "天香：请选择效果")
							.set("choiceList", ["令来源对其造成1点伤害，然后其摸牌", "令其失去1点体力，然后其获得你弃置的牌"])
							.forResult()
					).control == "选项1";
			}
			if (useOpt1) {
				player.addTempSkill("retianxiang_mark1", "phaseAfter");
				if (source.isIn() && target.isIn()) {
					await source.damage(target, 1);
					if (target.isIn()) {
						const num = Math.min(5, target.getDamagedHp());
						if (num > 0) {
							await target.draw(num);
						}
					}
				}
			} else {
				player.addTempSkill("retianxiang_mark2", "phaseAfter");
				if (target.isIn()) {
					await target.loseHp();
					if (target.isIn()) {
						await target.gain(event.cards);
					}
				}
			}
		},
	},
	retianxiang_mark1: {
		charlotte: true,
	},
	retianxiang_mark2: {
		charlotte: true,
	},
	// 红颜：锁定技，你的♠牌和你的♠判定牌视为♥牌。若你的装备区有♥牌，则你的手牌上限+1。
	hongyan: {
		audio: 2,
		mod: {
			suit(card, suit) {
				if (suit == "spade") {
					return "heart";
				}
			},
			maxHandcard(player, num) {
				if (player.countCards("e", card => get.suit(card, player) == "heart") > 0) {
					return num + 1;
				}
			},
		},
	},

	// ============ 太史慈（taishici） ============
	// 天义：出牌阶段限一次，你可以与一名角色拼点：若你赢，在本回合结束之前，你可以多使用一张【杀】、
	// 使用【杀】无距离限制且可以多选择一个目标；若你没赢，本回合你不能使用【杀】。
	tianyi: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const { bool } = await player.chooseToCompare(event.target).forResult();
			if (bool) {
				player.addTempSkill("tianyi2");
			} else {
				player.addTempSkill("tianyi3");
			}
		},
	},
	tianyi2: {
		charlotte: true,
		mod: {
			targetInRange(card, player, target, now) {
				if (card.name == "sha") {
					return true;
				}
			},
			selectTarget(card, player, range) {
				if (card.name == "sha" && range[1] != -1) {
					range[1]++;
				}
			},
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return num + 1;
				}
			},
		},
	},
	tianyi3: {
		charlotte: true,
		mod: {
			cardEnabled(card) {
				if (card.name == "sha") {
					return false;
				}
			},
		},
	},
	// 酣战：当你参与的拼点结束后，你可以使用其中一张拼点牌，此牌不计入使用次数。
	hanzhan: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "compareAfter", target: "compareAfter" },
		filter(event, player) {
			return [event.card1, event.card2].filterInD("d").some(card => player.hasUseTarget(card));
		},
		async content(event, trigger, player) {
			const cards = [trigger.card1, trigger.card2].filterInD("d").filter(card => player.hasUseTarget(card));
			if (!cards.length) {
				return;
			}
			const result = await player
				.chooseButton(["酣战：是否使用其中一张拼点牌？", cards])
				.set("ai", button => player.getUseValue(button.link))
				.forResult();
			if (result.bool) {
				const card = result.links[0];
				player.$gain2(card, false);
				await game.delayx();
				await player.chooseUseTarget(true, card, false);
			}
		},
	},

	// ============ 周泰（old_zhoutai） ============
	// 不屈：锁定技，当你处于濒死状态时，你将牌堆顶的一张牌置于你的武将牌上，称为“创”，
	// 若此牌的点数与已有的“创”点数均不同，则你将体力回复至1点，若出现相同点数则将此牌置入弃牌堆。
	// 若你的武将牌上有“创”，则你可以令你的手牌上限与“创”的数量相等。
	buqu: {
		audio: 2,
		trigger: { player: "chooseToUseBefore" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return event.type == "dying" && player.isDying() && event.dying == player && !event.getParent()._buqu;
		},
		async content(event, trigger, player) {
			trigger.getParent()._buqu = true;
			const [card] = get.cards();
			const next = player.addToExpansion(card, "gain2");
			next.gaintag.add("buqu");
			await next;
			const cards = player.getExpansions("buqu"),
				num = get.number(card);
			player.showCards(cards, "不屈");
			for (let i = 0; i < cards.length; i++) {
				if (cards[i] != card && get.number(cards[i]) == num) {
					await player.loseToDiscardpile(card);
					return;
				}
			}
			trigger.cancel();
			trigger.result = { bool: true };
			if (player.hp <= 0) {
				await player.recover(1 - player.hp);
			}
		},
		mod: {
			maxHandcardBase(player, num) {
				if (player.getExpansions("buqu").length) {
					return player.getExpansions("buqu").length;
				}
			},
		},
	},
	// 奋激：一名角色的结束阶段，若其没有手牌，你可以令其摸两张牌，然后你失去1点体力。
	fenji: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return event.player != player && event.player.countCards("h") == 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt(event.skill), "是否令" + get.translation(trigger.player) + "摸两张牌，然后你失去1点体力？").forResult();
		},
		async content(event, trigger, player) {
			await trigger.player.draw(2);
			await player.loseHp();
		},
	},

	// ============ 鲁肃（re_lusu） ============
	// 好施：摸牌阶段，你可以多摸两张牌，然后若你的手牌数大于5，你将半数手牌（向下取整）交给手牌最少的一名其他角色。
	haoshi: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed;
		},
		preHidden: true,
		async content(event, trigger, player) {
			trigger.num += 2;
			player.addSkill("haoshi2");
		},
	},
	haoshi2: {
		trigger: { player: "phaseDrawEnd" },
		forced: true,
		popup: false,
		audio: false,
		sourceSkill: "haoshi",
		async content(event, trigger, player) {
			player.removeSkill("haoshi2");
			if (player.countCards("h") <= 5) {
				return;
			}
			const result = await player
				.chooseCardTarget({
					selectCard: Math.floor(player.countCards("h") / 2),
					filterTarget(card, player, target) {
						return target.isMinHandcard();
					},
					prompt: "将一半的手牌交给场上手牌数最少的一名角色",
					forced: true,
				})
				.forResult();
			if (result.targets && result.targets[0]) {
				await player.give(result.cards, result.targets[0]);
			}
		},
	},
	// 缔盟：出牌阶段限一次，你可以令两名其他角色交换手牌（这两名角色手牌数差须小于等于你的牌数）。
	// 若如此做，此阶段结束时，你弃置X张牌（X为这两名角色手牌数差）。
	dimeng: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		position: "he",
		filterCard() {
			const targets = ui.selected.targets;
			if (targets.length == 2) {
				if (Math.abs(targets[0].countCards("h") - targets[1].countCards("h")) <= ui.selected.cards.length) {
					return false;
				}
			}
			return true;
		},
		selectCard: [0, Infinity],
		selectTarget: 2,
		complexCard: true,
		complexTarget: true,
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			const targets = ui.selected.targets;
			if (!targets?.length) {
				return true;
			} else if (targets.concat([target]).every(target => !target.countCards("h"))) {
				return false;
			}
			return Math.abs(targets[0].countCards("h") - target.countCards("h")) == ui.selected.cards.length;
		},
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			event.targets[0].swapHandcards(event.targets[1]);
		},
	},

	// ============ 张昭&张纮（zhangzhang） ============
	// 直谏：出牌阶段，你可以将手牌中的一张装备牌置于其他角色的装备区里，然后摸一张牌（可以替换原装备）。
	zhijian: {
		aiShowTag: "draw",
		audio: 2,
		enable: "phaseUse",
		filterCard(card, player) {
			return get.type(card, player) == "equip";
		},
		position: "h",
		selectCard: 1,
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const card = event.cards[0];
			await target.equip(card);
			await player.draw();
		},
	},
	// 固政：每回合限一次，当一名角色一次性弃置至少两张牌后，你可以令其获得其中一张弃置的牌。
	// 若其不是你，你获得其余弃置的牌。
	guzheng: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter"] },
		usable: 1,
		filter(event, player) {
			if (event.type != "discard" || event.getlx === false) {
				return false;
			}
			const evt = event.getl(event.player);
			return !!(evt && evt.cards && evt.cards.length >= 2);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt(event.skill)).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const evt = trigger.getl(target);
			const cards = (evt && evt.cards && evt.cards.slice()) || [];
			if (cards.length < 2) {
				return;
			}
			const result = await player.chooseCardButton(["固政：选择一张牌交给" + get.translation(target), cards], true).forResult();
			if (!result.bool || !result.links.length) {
				return;
			}
			const picked = result.links[0];
			const rest = cards.slice(0);
			rest.remove(picked);
			if (target.isIn()) {
				await target.gain(picked, "give");
			}
			if (target != player && rest.length) {
				await player.gain(rest, "give", target);
			}
		},
	},

	// ============ 蒋钦（dc_jiangqing） ============
	// 尚义：出牌阶段每名角色限一次，你可以令一名其他角色观看你的手牌，然后你选择一项：
	// 1.观看其手牌并可以弃置其中的一张黑色牌；2.观看其装备区和判定区的牌，你可以获得其中一张。
	dcshangyi: {
		aiShowTag: "offense",
		audio: "shangyi",
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return target != player && !(player.storage.dcshangyi_used || []).includes(target.playerid);
		},
		filter(event, player) {
			return game.hasPlayer(current => current != player && !(player.storage.dcshangyi_used || []).includes(current.playerid));
		},
		async content(event, trigger, player) {
			const target = event.target;
			if (!player.storage.dcshangyi_used) {
				player.storage.dcshangyi_used = [];
			}
			player.storage.dcshangyi_used.push(target.playerid);
			player.addTempSkill("dcshangyi_reset", "phaseAfter");
			await target.viewHandcards(player);
			const { control } = await player
				.chooseControl(["观看其手牌并弃置一张黑色牌", "观看其装备区和判定区的牌并获得其中一张"])
				.set("prompt", "尚义：请选择")
				.forResult();
			if (control == 0 && target.countCards("h")) {
				await player
					.discardPlayerCard(target, "h", true)
					.set("filterButton", button => get.color(button.link, target) == "black");
			} else if (control == 1) {
				const cards = target.getCards("ej");
				if (cards.length) {
					const result = await player.chooseCardButton(["尚义：你可以获得其中的一张牌", cards], false).forResult();
					if (result.bool && result.links && result.links.length) {
						await player.gain(result.links, "give", target);
					}
				}
			}
		},
	},
	dcshangyi_reset: {
		charlotte: true,
		onremove(player) {
			delete player.storage.dcshangyi_used;
		},
	},
	// 鸟翔：锁定技，当你使用【杀】指定其他角色为目标后，若你在其攻击范围内，其需使用两张【闪】才能抵消。
	dcniaoxiang: {
		audio: "zniaoxiang",
		trigger: { player: "useCardToPlayered" },
		forced: true,
		filter(event, player) {
			if (!event.target.inRange(player)) {
				return false;
			}
			return event.card.name == "sha";
		},
		logTarget: "target",
		content(event, trigger, player) {
			const map = trigger.getParent().customArgs;
			const id = trigger.target.playerid;
			if (!map[id]) {
				map[id] = {};
			}
			map[id].shanRequired = (map[id].shanRequired || 1) + 1;
		},
	},

// ============ 诸葛瑾（zhugejin） ============
	huanshi: {
		aiShowTag: "support",
		audio: "huanshi",
		trigger: { global: "judge" },
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(`缓释：是否令${get.translation(trigger.player)}观看你的手牌，选择一张代替其判定牌？`).forResult();
		},
		async content(event, trigger, player) {
			const result = await trigger.player
				.choosePlayerCard("缓释：观看" + get.translation(player) + "的手牌，选择一张代替判定牌", "he", "visible", true, player)
				.forResult();
			const card = result.links[0];
			await player.showCards([card], get.translation(player) + "发动了【缓释】");
			game.cardsDiscard(trigger.player.judging[0]);
			trigger.player.judging[0] = card;
			trigger.orderingCards.add(card);
			game.log(trigger.player, "的判定牌被替换为", card);
			game.delay(2);
		},
	},
	olhongyuan: {
		aiShowTag: "draw",
		audio: "hongyuan",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			await player.draw();
			if (game.hasPlayer(current => current != player && current.isFriendOf(player))) {
				const result = await player
					.chooseTarget("弘援：是否令一名与你势力相同的角色摸一张牌？", (card, player, target) => target != player && target.isFriendOf(player))
					.forResult();
				if (result.bool) {
					await result.targets[0].draw();
				}
			}
		},
	},
	olmingzhe: {
		aiShowTag: "defense",
		audio: "mingzhe",
		trigger: { player: ["useCard", "respond", "loseAfter"] },
		filter(event, player) {
			if (_status.currentPhase == player) {
				return false;
			}
			if (event.name == "useCard" || event.name == "respond") {
				return get.color(event.card, player) == "red";
			}
			if (event.name == "loseAfter") {
				const evt = event.getl(player);
				return !!evt && (evt.es || []).some(card => get.color(card, player) == "red");
			}
			return false;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("olmingzhe")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
		},
	},

	// ============ 陆抗（lukang） ============
	shenwei: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return event.player.isFriendOf(player) && player.countCards("h") < player.hp;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("shenwei")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw(player.hp - player.countCards("h"));
		},
	},
	keshou: {
		aiShowTag: "defense",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "damageBegin1" },
		filter(event, player) {
			if (player.countCards("he") < 2) {
				return false;
			}
			const cards = player.getCards("he");
			return cards.some((card, i) => cards.some((card2, j) => i != j && get.color(card, player) == get.color(card2, player)));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard("he", 2, "恪守：弃置两张颜色相同的牌，令此伤害-1", true)
				.set("filterCard", (card, player) => {
					if (!ui.selected.cards.length) {
						return true;
					}
					return get.color(ui.selected.cards[0], player) == get.color(card, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discard(event.cards);
			trigger.num--;
			if (!game.hasPlayer(current => current != player && current.isFriendOf(player))) {
				await player.draw();
			}
		},
	},

	// ============ 徐盛（xusheng） ============
	yicheng: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		trigger: { global: "useCardToTarget" },
		filter(event, player) {
			if (get.name(event.card) != "sha") {
				return false;
			}
			if (event.player.isFriendOf(player)) {
				return true;
			}
			return !!event.targets && event.targets.some(target => target.isFriendOf(player));
		},
		async content(event, trigger, player) {
			const beneficiaries = [];
			if (trigger.player.isFriendOf(player)) {
				beneficiaries.add(trigger.player);
			}
			if (trigger.targets) {
				for (const target of trigger.targets) {
					if (target.isFriendOf(player)) {
						beneficiaries.add(target);
					}
				}
			}
			for (const current of beneficiaries) {
				if (!current.isIn()) {
					continue;
				}
				await current.draw();
				if (current.countCards("he")) {
					await current.chooseToDiscard("he", true).set("prompt2", "疑城：弃置一张牌").forResult();
				}
			}
		},
	},
	xinpojun: {
		aiShowTag: "support",
		audio: "pojun",
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return event.card.name == "sha" && player.isPhaseUsing() && event.target.hp > 0 && event.target.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			const result = await player
				.choosePlayerCard({
					prompt: "破军：将" + get.translation(target) + "的至多X张牌置于其武将牌上（X为其体力值）",
					target: target,
					selectButton: [1, Math.min(target.countCards("he"), target.hp)],
					allowChooseAll: true,
				})
				.forResult();
			if (!result.bool || !result.links || !result.links.length) {
				return;
			}
			await target.addToExpansion({
				cards: result.links,
				source: target,
				animate: "giveAuto",
				gaintag: ["xinpojun2"],
			});
			target.addSkill("xinpojun2");
		},
	},
	xinpojun2: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return player.getExpansions("xinpojun2").length > 0;
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions("xinpojun2");
			player.removeSkill("xinpojun2");
			await player.gain(cards, "gain2");
		},
	},

	// ============ 凌统（lingtong） ============
	xuanlve: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "loseAfter" },
		filter(event, player) {
			const evt = event.getl(player);
			if (!evt) {
				return false;
			}
			const lostEquip = (evt.es || []).length > 0;
			const totalLost = (evt.cards2 || []).length;
			if (!lostEquip && totalLost < 2) {
				return false;
			}
			return game.hasPlayer(current => current != player && current.countCards("he") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(lib.filter.notMe, "旋略：选择一名其他角色，弃置其一张牌").forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.countCards("he")) {
				return;
			}
			const result = await player.choosePlayerCard(target, "he", true).forResult();
			if (result.bool) {
				await target.discard(result.links);
			}
		},
	},
	yongjin: {
		aiShowTag: "support",
		limited: true,
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const choices = [];
			for (let i = 0; i < player.hp; i++) {
				choices.push(String(i));
			}
			const result = await player
				.chooseControl(choices)
				.set("prompt", "勇进：你可以失去X点体力，令本次可以移动的装备牌数量+X")
				.forResult();
			const extra = Number(result.control) || 0;
			if (extra > 0) {
				await player.loseHp(extra);
			}
			const max = 3 + extra;
			for (let i = 0; i < max; i++) {
				const result = await player.moveCard(false, card => get.type(card) == "equip").forResult();
				if (!result || !result.bool) {
					break;
				}
			}
		},
	},

	// ============ 陈武&董袭（chendong） ============
	dcduanxie: {
		aiShowTag: "support",
		audio: "duanxie",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && !target.isLinked();
		},
		selectTarget: [0, 2],
		async content(event, trigger, player) {
			const alreadyLinked = player.isLinked();
			for (const target of event.targets) {
				if (target.isIn() && !target.isLinked()) {
					target.link();
				}
			}
			if (!player.isLinked()) {
				player.link();
			}
			if (alreadyLinked) {
				const targets = game.filterPlayer(current => current != player && current.isLinked() && current.countCards("he") > 0);
				if (targets.length) {
					const result = await player.chooseBool("是否立即发动一次〖奋命〗？").forResult();
					if (result.bool) {
						const emptied = [];
						for (const current of targets) {
							if (!current.isIn()) {
								continue;
							}
							const hadCards = current.countCards("he") > 0;
							await player.discardPlayerCard(current, "he", true);
							if (hadCards && !current.countCards("he")) {
								emptied.push(current);
							}
						}
						if (emptied.length) {
							await emptied[0].damage(1, player);
						}
					}
				}
			}
		},
	},
	fenming: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.isLinked() && game.hasPlayer(current => current != player && current.isLinked() && current.countCards("he") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("fenming")).forResult();
		},
		async content(event, trigger, player) {
			const targets = game.filterPlayer(current => current != player && current.isLinked() && current.countCards("he") > 0);
			const emptied = [];
			for (const current of targets) {
				if (!current.isIn()) {
					continue;
				}
				const hadCards = current.countCards("he") > 0;
				await player.discardPlayerCard(current, "he", true);
				if (hadCards && !current.countCards("he")) {
					emptied.push(current);
				}
			}
			if (emptied.length) {
				await emptied[0].damage(1, player);
			}
		},
	},

	// ============ 吴国太（wuguotai） ============
	// 补益：每回合限一次，当一名与你势力相同的角色因受到伤害进入濒死状态后脱离濒死后，
	// 你可以选择一个"军令"，令伤害来源选择：执行该军令，或令该角色回复1点体力。
	// 照抄国战原版"gzbuyi"(mode/guozhan/src/skill/character/rest.js)的触发逻辑，
	// 军令交互复用本项目已有的junling系统（用法与"节钺"jieyue一致）。
	buyi: {
		aiShowTag: "recover",
		audio: ["buyi", 2],
		usable: 1,
		trigger: { global: "dyingAfter" },
		filter(event, player) {
			if (!(event.player && event.player.isAlive() && event.source && event.source.isAlive())) {
				return false;
			}
			return event.player.isFriendOf(player) && event.reason && event.reason.name == "damage";
		},
		async content(event, trigger, player) {
			const source = trigger.source;
			const victim = trigger.player;
			const junlingResult = await player.chooseJunlingFor(source).forResult();
			const junling = junlingResult && junlingResult.junling;
			const junlingTargets = (junlingResult && junlingResult.targets) || [];
			if (!junling) {
				return;
			}
			const result = await source
				.chooseJunlingControl(player, junling, junlingTargets)
				.set("prompt", "补益")
				.set("choiceList", ["执行该军令", `令${get.translation(victim)}${victim == source ? "（你）" : ""}回复1点体力`])
				.forResult();
			if (result && result.index == 0) {
				await source.carryOutJunling(player, junling, junlingTargets);
			} else if (victim.isIn() && victim.isDamaged()) {
				await victim.recover();
			}
		},
	},
	// 甘露：出牌阶段限一次，你可以选择两名装备区里的牌数之差不大于你已损失体力值的角色，
	// 交换其装备区里的所有牌。（照抄引擎自带的一将成名包"甘露"实现，见
	// character/yijiang/skill.js:ganlu）
	ganlu: {
		aiShowTag: "support",
		audio: "ganlu",
		enable: "phaseUse",
		usable: 1,
		selectTarget: 2,
		filterTarget(card, player, target) {
			if (target.isMin()) {
				return false;
			}
			if (!ui.selected.targets.length) {
				return true;
			}
			if (ui.selected.targets[0].countCards("e") == 0 && target.countCards("e") == 0) {
				return false;
			}
			return Math.abs(ui.selected.targets[0].countCards("e") - target.countCards("e")) <= player.maxHp - player.hp;
		},
		async content(event, trigger, player) {
			const { targets } = event;
			await targets[0].swapEquip(targets[1]);
		},
	},

	// ============ 孙翊（re_sunyi） ============
	zaolix: {
		audio: "zaoli",
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		async content(event, trigger, player) {
			const hCards = player.getCards("h");
			const eCards = player.getCards("e");
			const cards = hCards.concat(eCards);
			if (cards.length) {
				await player.discard(cards);
				await player.draw(cards.length);
			}
			if (player.countCards("he")) {
				const result = await player.chooseCard("he", "躁厉：是否将一张牌当【决斗】使用？").set("ai", card => 0).forResult();
				if (result.bool) {
					const targetResult = await player
						.chooseTarget(lib.filter.notMe, true)
						.set("ai", target => get.effect(target, { name: "juedou" }, player, player))
						.forResult();
					if (targetResult.bool) {
						await player.useCard(get.autoViewAs({ name: "juedou" }, result.cards), targetResult.targets[0]);
						await player.loseHp();
						await player.draw(player.getDamagedHp());
					}
				}
			}
		},
	},

	// ============ 步练师（bulianshi） ============
	old_anxu: {
		aiShowTag: "draw",
		enable: "phaseUse",
		usable: 1,
		multitarget: true,
		audio: "anxu",
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			const num = target.countCards("h");
			if (ui.selected.targets.length) {
				return num != ui.selected.targets[0].countCards("h");
			}
			return game.hasPlayer(current => current != player && current != target && current.countCards("h") != num);
		},
		selectTarget: 2,
		async content(event, trigger, player) {
			const { targets } = event;
			let gainner, giver;
			if (targets[0].countCards("h") < targets[1].countCards("h")) {
				gainner = targets[0];
				giver = targets[1];
			} else {
				gainner = targets[1];
				giver = targets[0];
			}
			const result = await gainner
				.gainPlayerCard({
					target: giver,
					position: "h",
					forced: true,
					visibleMove: true,
				})
				.forResult();
			if (result.cards && result.cards.length) {
				const card = result.cards[0];
				if (get.suit(card) != "spade") {
					await player.draw();
				}
			}
			if (gainner.isIn() && giver.isIn() && gainner.countCards("h") == giver.countCards("h")) {
				await player.recover();
			}
		},
	},
	zhuiyi: {
		aiShowTag: "defense",
		limited: true,
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.isDamaged() && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(lib.filter.notMe, get.prompt2("zhuiyi")).forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const target = event.targets[0];
			await target.draw(3);
			if (target.isIn() && target.isDamaged()) {
				await target.recover();
			}
			if (target.isIn() && target.isTurnedOver()) {
				await target.turnOver();
			}
		},
	},

	// ============ 程普（chengpu） ============
	daohuo: {
		aiShowTag: "offense",
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard(card, player) {
			if (!ui.selected.cards.length) {
				return true;
			}
			return get.color(card, player) != get.color(ui.selected.cards[0], player);
		},
		position: "hes",
		selectCard: 2,
		viewAs: { name: "sha", nature: "fire" },
		prompt: "蹈火：将两张颜色不同的牌当火【杀】使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: { order: 6, respondSha: true, expose: 0.2 },
	},
	daohuo_bonus: {
		aiShowTag: "draw",
		charlotte: true,
		trigger: { source: "damageSource" },
		filter(event, player) {
			if (!event.card) {
				return false;
			}
			if (event.card.name != "jiu" && !(event.card.name == "sha" && get.nature(event.card) == "fire")) {
				return false;
			}
			return game.hasPlayer(current => current != event.player && current.isFriendOf(event.player));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget("蹈火：选择一名与" + get.translation(trigger.player) + "势力相同的角色，其摸一张牌", (card, player, target) => {
					return target != _status.event.getParent().trigger.player && target.isFriendOf(_status.event.getParent().trigger.player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await event.targets[0].draw();
		},
	},
	chunlao: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: "chunlao",
		trigger: { player: "phaseJieshuBegin", global: "dying" },
		filter(event, player) {
			if (event.name == "dying") {
				return event.player.isFriendOf(player) && player.getExpansions("chunlao_mark").length > 0;
			}
			return !player.getExpansions("chunlao_mark").length && player.countCards("he", card => get.name(card) == "sha") > 0;
		},
		async cost(event, trigger, player) {
			if (trigger.name == "dying") {
				event.result = await player
					.chooseBool("醇醪：是否移去一张“醇”，视为" + get.translation(trigger.player) + "使用一张【酒】？")
					.forResult();
			} else {
				event.result = await player
					.chooseCard({
						position: "he",
						selectCard: [1, Infinity],
						filterCard: card => get.name(card) == "sha",
						prompt: "醇醪：将至少一张【杀】置于武将牌上，称为“醇”",
					})
					.forResult();
			}
		},
		async content(event, trigger, player) {
			if (trigger.name == "dying") {
				const cards = player.getExpansions("chunlao_mark").slice(0, 1);
				if (cards.length) {
					await player.discard(cards);
				}
				if (trigger.player.isIn()) {
					await trigger.player.useCard({ name: "jiu", isCard: true });
				}
			} else {
				await player.addToExpansion({ cards: event.cards, gaintag: ["chunlao_mark"] });
			}
		},
	},

	// ============ 韩当（handang） ============
	gongji: {
		aiShowTag: "offense",
		audio: 2,
		mod: {
			targetInRange(card, player) {
				if (player.countCards("e", card2 => ["equip3", "equip4", "equip3_4"].includes(get.subtype(card2))) > 0) {
					return true;
				}
			},
		},
		enable: "phaseUse",
		usable: 1,
		filterCard(card) {
			return get.type(card) != "basic";
		},
		position: "he",
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.discard(cards);
			if (!target.isIn() || !target.countCards("he")) {
				return;
			}
			const result = await player.choosePlayerCard(target, "he", true).forResult();
			if (!result.bool) {
				return;
			}
			const card = result.links[0];
			if (get.subtype(card) == "equip1") {
				await player.equip(card);
				player.addTempSkill("gongji_unequip", "phaseAfter");
			} else {
				await target.discard(card);
			}
		},
	},
	gongji_unequip: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const equip1 = player.getEquip(1);
			if (equip1) {
				await player.discard(equip1);
			}
		},
	},
	jiefan: {
		aiShowTag: "aoe",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: true,
		async content(event, trigger, player) {
			const { target } = event;
			const inRangeOf = game.filterPlayer(current => current.inRange(target));
			const choice = await target
				.chooseControl(["弃置", "摸牌"])
				.set("prompt", get.prompt2("jiefan"))
				.set("choiceList", ["令攻击范围内含有你的角色各弃置一张牌", "摸等同于攻击范围内含有你的角色数的牌"])
				.forResult();
			if (choice.control == "弃置") {
				for (const current of inRangeOf) {
					if (current.isIn() && current.countCards("he")) {
						await current.chooseToDiscard("he", true).forResult();
					}
				}
			} else {
				await target.draw(inRangeOf.length);
			}
		},
	},

// ============ 潘璋&马忠（panzhangmazhong） ============
	// 夺刀：当你成为其他角色使用【杀】的目标后，你可以弃置一张牌，然后获得该角色装备区里的武器牌。
	duodao: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			return event.card.name == "sha" && event.player != player && player.countCards("he") > 0;
		},
		logTarget(event) {
			return event?.player;
		},
		async content(event, trigger, player) {
			const source = trigger.player;
			const result = await player.chooseToDiscard("he", get.prompt2("duodao", source)).forResult();
			if (!result.bool) {
				return;
			}
			const weapon = source.getEquip(1);
			if (weapon && lib.filter.canBeGained(weapon, player, source)) {
				await player.gain(weapon, source, "give");
			}
		},
		ai: {
			skillTagFilter(player) {
				if (!player.countCards("he")) {
					return false;
				}
			},
		},
	},
	// 暗箭：锁定技，当你使用【杀】指定一名角色为目标后，若你不在其攻击范围内，此【杀】对其造成的
	// 基础伤害值+1且无视其防具，然后若该角色因此进入濒死状态，其不能使用【桃】直到此次濒死结算结束。
	anjian: {
		audio: 2,
		trigger: { source: ["damageBegin1", "damageEnd"] },
		forced: true,
		filter(event, player) {
			return event.getParent().name == "sha" && !event.player.inRange(player);
		},
		async content(event, trigger, player) {
			if (event.triggername == "damageBegin1") {
				trigger.num++;
				const target = trigger.player;
				target.addTempSkill("qinggang2");
				target.storage.qinggang2.add(trigger.getParent().card);
			} else if (trigger.player.isDying()) {
				trigger.player.addTempSkill("anjian_notao", { global: "dyingAfter" });
			}
		},
	},
	// 暗箭辅助：本次濒死结算内不能使用【桃】
	anjian_notao: {
		charlotte: true,
		mod: {
			cardEnabled2(card) {
				if (card.name == "tao") {
					return false;
				}
			},
		},
	},

	// ============ 朱然（zhuran） ============
	// 胆守（重做）：每回合限一次，当你成为基本牌或锦囊牌的目标后，你可以摸X张牌（X为你本回合
	// 成为基本牌或锦囊牌的目标的次数）。
	danshou: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			if (player.hasSkill("danshou_used")) {
				return false;
			}
			return get.type2(event.card) == "basic" || get.type2(event.card) == "trick";
		},
		async cost(event, trigger, player) {
			player.storage.danshou_count = (player.storage.danshou_count || 0) + 1;
			event.result = await player.chooseBool(`胆守：是否摸${player.storage.danshou_count}张牌？`).forResult();
		},
		async content(event, trigger, player) {
			player.addTempSkill("danshou_reset");
			player.addTempSkill("danshou_used", "roundStart");
			await player.draw(player.storage.danshou_count);
		},
		ai: {
			skillTagFilter(player) {
				if (player.hasSkill("danshou_used")) {
					return false;
				}
			},
		},
	},
	danshou_used: { charlotte: true },
	danshou_reset: {
		charlotte: true,
		trigger: { global: "roundStart" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.danshou_count = 0;
		},
	},
	// 截路：当你造成伤害后，若该伤害未使目标角色进入濒死状态，你可以摸一张牌，然后终止当前事件的
	// 后续结算，并结束当前回合。
	jielu: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.player.isIn() && !event.player.isDying();
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("jielu", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
			const parentEvt = trigger.getParent();
			if (parentEvt && typeof parentEvt.finish == "function") {
				parentEvt.finish();
			}
			const phaseEvt = event.getParent("phase");
			if (phaseEvt && phaseEvt.name == "phase") {
				phaseEvt.finish();
			}
		},
	},

	// ============ 孙鲁班（sunluban） ============
	// 谮毁（重做）：当你使用【杀】或锦囊牌造成伤害时，你可以令一名非目标角色成为伤害来源。
	chanhui: {
		aiShowTag: "support",
		audio: 2,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			const cardEvt = event.getParent();
			return !!cardEvt && (cardEvt.name == "sha" || get.type2(cardEvt.name) == "trick");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("chanhui"), (card, plyr, target) => target != player && target != trigger.player)
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			trigger.source = event.targets[0];
		},
	},
	// 除异：每轮限一次，当一名其他角色对与你势力不同的角色造成伤害时，你可以令此伤害+1。若伤害
	// 来源为男性，你可以流失1点体力，令此伤害额外+1。
	chuyi: {
		aiShowTag: "support",
		audio: 2,
		trigger: { global: "damageBegin1" },
		filter(event, player) {
			if (player.hasSkill("chuyi_used")) {
				return false;
			}
			return !!event.source && event.source != player && event.player != player && event.player.isEnemyOf(player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("chuyi", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			trigger.num++;
			player.addTempSkill("chuyi_used", "roundStart");
			if (trigger.source && trigger.source.hasSex("male")) {
				const result = await player.chooseBool("除异：是否流失1点体力，令此伤害额外+1？").forResult();
				if (result.bool) {
					await player.loseHp();
					trigger.num++;
				}
			}
		},
	},
	chuyi_used: { charlotte: true },

	// ============ 全琮（quancong） ============
	// 邀名（重做）：每回合限一次，当你造成或受到伤害后，你可以选择一名角色，若其手牌数：大于等于
	// 你，你弃置其一张牌；小于等于你，其摸一张牌。
	yaoming: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd", source: "damageSource" },
		filter(event, player) {
			return !player.hasSkill("yaoming_used");
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("yaoming")).forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			player.addTempSkill("yaoming_used", "roundStart");
			const target = event.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			if (target.countCards("h") >= player.countCards("h")) {
				if (target.countCards("h")) {
					await target.discard({ cards: [target.getCards("h").randomGet()] });
				}
			} else {
				await target.draw();
			}
		},
	},
	yaoming_used: { charlotte: true },
	// 赈赡：每回合限一次，当你需要使用或打出基本牌时，你可以与手牌数小于你的一名角色交换手牌，
	// 视为使用或打出之。
	zhenshan: {
		aiShowTag: "support",
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			if (get.type(name) != "basic" || player.hasSkill("zhenshan_used")) {
				return false;
			}
			return game.hasPlayer(target => target != player && target.countCards("h") < player.countCards("h"));
		},
		filter(event, player) {
			if (event.responded || player.hasSkill("zhenshan_used")) {
				return false;
			}
			return lib.inpile.some(i => get.type(i) == "basic" && event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event));
		},
		delay: false,
		async content(event, trigger, player) {
			const evt = event.getParent(2);
			const candidates = game.filterPlayer(target => target != player && target.countCards("h") < player.countCards("h"));
			if (!candidates.length) {
				return;
			}
			const result = await player
				.chooseTarget("赈赡：选择一名手牌数小于你的角色交换手牌", (card, plyr, target) => candidates.includes(target))
				.forResult();
			if (!result.bool) {
				return;
			}
			const other = result.targets[0];
			player.addTempSkill("zhenshan_used", "roundStart");
			await player.swapHandcards(other);
			const cardsx = player.getCards("h").filter(card => evt.filterCard(card, evt.player, evt));
			if (!cardsx.length) {
				return;
			}
			const use = await player
				.chooseCard("赈赡：选择要" + (evt.name == "chooseToUse" ? "使用" : "打出") + "的牌", card => cardsx.includes(card), "h")
				.forResult();
			if (!use.bool || !use.cards || !use.cards.length) {
				return;
			}
			const card = use.cards[0];
			if (evt.name == "chooseToUse") {
				game.broadcastAll(
					(result, name) => {
						lib.skill.zhenshan_backup.viewAs = { name: name, cards: [result], isCard: true };
					},
					card,
					card.name
				);
				evt.set("_backupevent", "zhenshan_backup");
				evt.set("openskilldialog", "请选择" + get.translation(card) + "的目标");
				evt.backup("zhenshan_backup");
			} else {
				delete evt.result.used;
				delete evt.result.skill;
				evt.result.card = get.autoViewAs(card);
				evt.result.cards = [card];
				evt.redo();
				return;
			}
		},
		subSkill: {
			backup: {
				precontent() {
					var name = event.result.card.name,
						cards = event.result.card.cards.slice(0);
					event.result.cards = cards;
					var rcard = cards[0],
						card;
					if (rcard.name == name) {
						card = get.autoViewAs(rcard);
					} else {
						card = get.autoViewAs({ name, isCard: true });
					}
					event.result.card = card;
					event.result._apply_args = { addSkillCount: false };
				},
				filterCard: () => false,
				selectCard: -1,
				log: false,
			},
		},
	},
	zhenshan_used: { charlotte: true },

	// ============ 孙休（sunxiu） ============
	// 宴诛（重做）：限定技，出牌阶段，你可以选择一名其他角色，你获得其装备区里的所有牌。
	yanzhu: {
		aiShowTag: "offense",
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const { target } = event;
			const cards = target.getCards("e");
			if (cards.length) {
				await player.gain(cards, target, "give");
			}
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					return target.countCards("e") ? 1 : 0;
				},
			},
		},
	},
	// 兴学（重做）：结束阶段，你可以令至多X名角色（X为你的体力上限）依次摸一张牌，并将一张牌置于
	// 牌堆顶或将此牌交给另一名此技能的目标。
	xingxue: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		async content(event, trigger, player) {
			const num = player.maxHp;
			const { targets, bool } = await player.chooseTarget([1, num], get.prompt2("xingxue")).forResult();
			if (!bool || !targets || !targets.length) {
				return;
			}
			player.logSkill("xingxue", targets);
			for (const target of targets) {
				if (!target.isIn()) {
					continue;
				}
				await target.draw();
				if (!target.countCards("he")) {
					continue;
				}
				const cardResult = await target.chooseCard("he", "兴学：选择一张牌置于牌堆顶或交给另一名目标").forResult();
				if (!cardResult.bool || !cardResult.cards.length) {
					continue;
				}
				const card = cardResult.cards[0];
				const others = targets.filter(t => t != target && t.isIn());
				let give = null;
				if (others.length) {
					const ctrl = await target
						.chooseControl("置于牌堆顶", "交给另一名目标")
						.set("prompt", "兴学：选择这张牌的去向")
						.set("ai", () => "置于牌堆顶")
						.forResult();
					if (ctrl.control == "交给另一名目标") {
						const tgResult = await target.chooseTarget(others, true).forResult();
						if (tgResult.bool) {
							give = tgResult.targets[0];
						}
					}
				}
				if (give) {
					await target.give(card, give);
				} else {
					await target.lose(card, ui.cardPile, "insert");
				}
			}
		},
	},

	// ============ 朱治（zhuzhi） ============
	// 安国（重做）：锁定技，若其他同势力角色的装备区没有武器/防具牌，其视为装备着你装备区内的
	// 武器牌。若其装备区有武器/防具牌，其攻击距离/其他角色计算与其的距离+1。若你的装备区仅有
	// 一张牌，此牌不能被弃置或获得。
	xinanguo: {
		audio: 2,
		forced: true,
		mod: {
			cardDiscardable(card, player) {
				if (player.getEquips().length == 1 && player.getEquips()[0] == card) {
					return false;
				}
			},
			canBeDiscarded(card, player, target) {
				if (target.getEquips().length == 1 && target.getEquips()[0] == card) {
					return false;
				}
			},
			canBeGained(card, player, target) {
				if (target.getEquips().length == 1 && target.getEquips()[0] == card) {
					return false;
				}
			},
		},
		init(player) {
			game.addGlobalSkill("xinanguo_share", player);
		},
		onremove(player) {
			game.removeGlobalSkill("xinanguo_share", player);
		},
	},
	xinanguo_share: {
		charlotte: true,
		mod: {
			attackRange(player, num) {
				const src = game.filterPlayer(cur => cur != player && cur.isFriendOf(player) && cur.hasSkill("xinanguo"))[0];
				if (!src) {
					return;
				}
				if (player.getEquip(1)) {
					return num + 1;
				}
				const weapon = src.getEquip(1);
				if (weapon) {
					return Math.max(num, src.getEquipRange([weapon]));
				}
			},
			globalTo(from, to, distance) {
				if (to != player) {
					return;
				}
				const src = game.filterPlayer(cur => cur != player && cur.isFriendOf(player) && cur.hasSkill("xinanguo"))[0];
				if (!src) {
					return;
				}
				if (player.getEquip(1) || player.getEquip(2)) {
					return distance + 1;
				}
			},
		},
	},

	// ============ 孙登（sundeng） ============
	// 匡弼（重做）：出牌阶段限一次，你可以将至多三张牌置于武将牌上，称为“弼”。你的回合外，与你
	// 势力相同的角色可以如手牌般使用或打出“弼”；每当一张“弼”因此离开你的武将牌后，你摸一张牌。
	// 你的下个回合开始时，移去所有“弼”。
	kuangbi: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		position: "he",
		selectCard: [1, 3],
		check(card) {
			return 5 - get.value(card);
		},
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			await player.addToExpansion({ cards: event.cards, source: player, gaintag: ["kuangbi"] });
		},
		init(player) {
			game.addGlobalSkill("kuangbi_borrow", player);
		},
		onremove(player) {
			game.removeGlobalSkill("kuangbi_borrow", player);
			const cards = player.getExpansions("kuangbi");
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		group: "kuangbi_clear",
		subSkill: {
			clear: {
				trigger: { player: "phaseZhunbeiBegin" },
				forced: true,
				charlotte: true,
				filter(event, player) {
					return player.getExpansions("kuangbi").length > 0;
				},
				async content(event, trigger, player) {
					await player.loseToDiscardpile(player.getExpansions("kuangbi"));
				},
			},
		},
	},
	kuangbi_borrow: {
		aiShowTag: "draw",
		charlotte: true,
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			if (_status.currentPhase == player) {
				return false;
			}
			return game.hasPlayer(cur => cur != player && cur.isFriendOf(player) && cur.hasSkill("kuangbi") && cur.getExpansions("kuangbi").length > 0);
		},
		filter(event, player) {
			if (event.responded || _status.currentPhase == player) {
				return false;
			}
			return game.hasPlayer(
				cur => cur != player && cur.isFriendOf(player) && cur.hasSkill("kuangbi") && cur.getExpansions("kuangbi").some(card => event.filterCard(card, player, event))
			);
		},
		async content(event, trigger, player) {
			const evt = event.getParent(2);
			const cardsx = [];
			game.filterPlayer(cur => cur != player && cur.isFriendOf(player) && cur.hasSkill("kuangbi")).forEach(src => {
				src.getExpansions("kuangbi").forEach(card => {
					if (evt.filterCard(card, player, evt)) {
						cardsx.push(card);
					}
				});
			});
			if (!cardsx.length) {
				return;
			}
			const pick = await player.chooseButton(["弼：选择要" + (evt.name == "chooseToUse" ? "使用" : "打出") + "的牌", cardsx], true).forResult();
			if (!pick.bool || !pick.links || !pick.links.length) {
				return;
			}
			const card = pick.links[0];
			const owner = game.filterPlayer(cur => cur.getExpansions("kuangbi").includes(card))[0];
			if (owner) {
				await owner.draw();
			}
			if (evt.name == "chooseToUse") {
				game.broadcastAll(
					(result, name) => {
						lib.skill.kuangbi_backup.viewAs = { name: name, cards: [result], isCard: true };
					},
					card,
					card.name
				);
				evt.set("_backupevent", "kuangbi_backup");
				evt.set("openskilldialog", "请选择" + get.translation(card) + "的目标");
				evt.backup("kuangbi_backup");
			} else {
				delete evt.result.used;
				delete evt.result.skill;
				evt.result.card = get.autoViewAs(card);
				evt.result.cards = [card];
				evt.redo();
				return;
			}
		},
		subSkill: {
			backup: {
				precontent() {
					var name = event.result.card.name,
						cards = event.result.card.cards.slice(0);
					event.result.cards = cards;
					var rcard = cards[0],
						card;
					if (rcard.name == name) {
						card = get.autoViewAs(rcard);
					} else {
						card = get.autoViewAs({ name, isCard: true });
					}
					event.result.card = card;
					event.result._apply_args = { addSkillCount: false };
				},
				filterCard: () => false,
				selectCard: -1,
				log: false,
			},
		},
	},

	// ============ 祖茂（zumao） ============
	// 引兵（重做）：结束阶段，你可以将任意名攻击范围内包含你的角色各一张手牌置于你的武将牌上；
	// 当你受到【杀】或【决斗】造成的伤害后，来源可以获得一张“引兵”牌。
	yinbing: {
		aiShowTag: "defense",
		aiShowCost: true,
		audio: 2,
		trigger: { player: ["phaseJieshuBegin", "damageEnd"] },
		filter(event, player) {
			if (event.triggername == "phaseJieshuBegin") {
				return game.hasPlayer(cur => cur != player && cur.isIn() && cur.inRange(player) && cur.countCards("h") > 0);
			}
			return !!event.card && ["sha", "juedou"].includes(event.card.name) && !!event.source && event.source.isIn() && player.getExpansions("yinbing").length > 0;
		},
		async cost(event, trigger, player) {
			if (event.triggername == "phaseJieshuBegin") {
				const candidates = game.filterPlayer(cur => cur != player && cur.isIn() && cur.inRange(player) && cur.countCards("h") > 0);
				event.result = await player
					.chooseTarget([1, candidates.length], "引兵：选择任意名攻击范围内包含你的角色，各获得其一张手牌", (card, plyr, target) => candidates.includes(target))
					.forResult();
			} else {
				event.result = await trigger.source.chooseBool("引兵：是否获得一张“引兵”牌？").forResult();
			}
		},
		async content(event, trigger, player) {
			if (event.triggername == "phaseJieshuBegin") {
				for (const target of event.targets) {
					if (!target.isIn() || !target.countCards("h")) {
						continue;
					}
					const chosen = await target.chooseCard("h", "引兵：选择一张手牌交给" + get.translation(player)).forResult();
					if (chosen.bool && chosen.cards.length) {
						await player.addToExpansion({ cards: chosen.cards, source: target, gaintag: ["yinbing"] });
					}
				}
			} else {
				const cards = player.getExpansions("yinbing");
				if (cards.length) {
					await trigger.source.gain(cards[0], player, "give");
				}
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
	},
	// 绝地（重做）：锁定技，准备阶段，你选择一项：1.移去所有“引兵”牌，然后你摸牌至体力上限；
	// 2.令一名体力值小于等于你的其他角色获得所有“引兵”牌，然后其回复1点体力并摸等量的牌。
	juedi: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return player.getExpansions("yinbing").length > 0;
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions("yinbing");
			const cands = game.filterPlayer(cur => cur != player && cur.hp <= player.hp);
			const list = ["移去所有“引兵”牌，然后摸牌至体力上限"];
			if (cands.length) {
				list.push("令一名体力值小于等于你的角色获得所有“引兵”牌");
			}
			const choice = await player
				.chooseControl(list)
				.set("prompt", "绝地：请选择一项")
				.set("ai", () => list[0])
				.forResult();
			if (choice.control == list[0]) {
				await player.loseToDiscardpile(cards);
				if (player.hp < player.maxHp) {
					await player.draw(player.maxHp - player.hp);
				}
			} else {
				const targetResult = await player.chooseTarget(cands, "绝地：选择一名体力值小于等于你的角色", true).forResult();
				if (targetResult.bool) {
					const target = targetResult.targets[0];
					await target.gain(cards, player, "give");
					await target.recover();
					await target.draw(cards.length);
				}
			}
		},
	},

	// ============ 诸葛恪（zhugeke） ============
	// 傲才（重做）：当你于回合外需要使用或打出一张基本牌时，你可以观看牌堆顶三张牌：若其中有此
	// 牌，你可以使用或打出之；否则，你可以将这些牌置于牌堆底。
	aocai: {
		aiShowTag: "support",
		audio: 2,
		audioname: ["gz_zhugeke"],
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			return _status.currentPhase != player && get.type(name) == "basic" && lib.inpile.includes(name);
		},
		filter(event, player) {
			if (event.responded || _status.currentPhase == player) {
				return false;
			}
			return lib.inpile.some(i => get.type(i) == "basic" && event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event));
		},
		delay: false,
		async content(event, trigger, player) {
			const evt = event.getParent(2);
			const cards = get.cards(3, true);
			const match = cards.filter(card => evt.filterCard(card, evt.player, evt));
			let card;
			if (match.length) {
				const result = await player
					.chooseCard("傲才：观看到牌堆顶三张牌，是否使用或打出其中一张？", c => match.includes(c), "od")
					.set("cards", match)
					.forResult();
				if (result.bool && result.cards && result.cards.length) {
					card = result.cards[0];
				}
			}
			if (card) {
				if (ui.cardPile.contains(card)) {
					ui.cardPile.removeChild(card);
				}
				if (evt.name == "chooseToUse") {
					game.broadcastAll(
						(result, name) => {
							lib.skill.aocai_backup.viewAs = { name: name, cards: [result], isCard: true };
						},
						card,
						card.name
					);
					evt.set("_backupevent", "aocai_backup");
					evt.set("openskilldialog", "请选择" + get.translation(card) + "的目标");
					evt.backup("aocai_backup");
				} else {
					delete evt.result.used;
					delete evt.result.skill;
					evt.result.card = get.autoViewAs(card);
					evt.result.cards = [card];
					evt.redo();
					return;
				}
			} else {
				const putResult = await player.chooseBool("傲才：是否将观看的三张牌置于牌堆底？").forResult();
				if (putResult.bool) {
					for (const c of cards) {
						if (ui.cardPile.contains(c)) {
							ui.cardPile.removeChild(c);
						}
					}
					for (const c of cards) {
						ui.cardPile.appendChild(c);
					}
				}
			}
		},
		subSkill: {
			backup: {
				precontent() {
					var name = event.result.card.name,
						cards = event.result.card.cards.slice(0);
					event.result.cards = cards;
					var rcard = cards[0],
						card;
					if (rcard.name == name) {
						card = get.autoViewAs(rcard);
					} else {
						card = get.autoViewAs({ name, isCard: true });
					}
					event.result.card = card;
					event.result._apply_args = { addSkillCount: false };
				},
				filterCard: () => false,
				selectCard: -1,
				log: false,
			},
		},
	},
	// 黩武：限定技，出牌阶段，你可以对你攻击范围内所有其他势力发起一个“军令”。若其中每有一名
	// 角色不执行，你对其造成1点伤害并摸一张牌。当所有“军令”结算结束后，若结算期间有角色进入
	// 濒死状态被救回，则你失去1点体力。
	duwu: {
		aiShowTag: "draw",
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.isEnemyOf(player) && player.inRange(current));
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const others = game.filterPlayer(current => current != player && current.isEnemyOf(player) && player.inRange(current)).sortBySeat();
			const junlingResult = await player.chooseJunlingFor(player).set("prompt", "黩武：请选择一项“军令”").forResult();
			const junling = junlingResult && junlingResult.junling;
			if (!junling) {
				return;
			}
			const junlingTargets = junlingResult.targets || [];
			player.addTempSkill("duwu_watch");
			for (const current of others) {
				if (!current.isIn()) {
					continue;
				}
				const result = await current.chooseJunlingControl(player, junling, junlingTargets).set("prompt", "黩武").forResult();
				if (result && (result.bool || result.index === 0)) {
					await current.carryOutJunling(player, junling, junlingTargets);
				} else {
					await current.damage(1, player);
					await player.draw();
				}
			}
			if (player.storage.duwu_saved) {
				await player.loseHp();
			}
			player.removeSkill("duwu_watch");
			delete player.storage.duwu_saved;
		},
	},
	duwu_watch: {
		charlotte: true,
		trigger: { global: "dyingAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.player.hp > 0;
		},
		content(event, trigger, player) {
			player.storage.duwu_saved = true;
		},
	},

	// ============ 孙鲁育（re_sunluyu） ============
	// 穆穆：准备阶段，你可以弃置一张牌，移动场上的一张装备牌（可以替换原装备）。
	remumu: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: "mumu",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("he") > 0 && game.hasPlayer(cur => cur.countCards("e") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseToDiscard("he", get.prompt2("remumu")).forResult();
		},
		async content(event, trigger, player) {
			const allEquips = [];
			game.filterPlayer(cur => cur.countCards("e") > 0).forEach(cur => allEquips.push(...cur.getCards("e")));
			if (!allEquips.length) {
				return;
			}
			const pick = await player.chooseButton(["穆穆：选择一张装备牌", allEquips], true).forResult();
			if (!pick.bool || !pick.links || !pick.links.length) {
				return;
			}
			const equip = pick.links[0];
			const dest = await player.chooseTarget(true, "穆穆：选择装备牌移动的目标").forResult();
			if (!dest.bool) {
				return;
			}
			const target = dest.targets[0];
			await target.equip(equip);
		},
	},
	// 止息：锁定技，当一名角色使用【杀】或伤害类锦囊牌时，若你在其攻击范围内，且你已受伤，你可以
	// 令其弃置一张牌。
	zhixi: {
		audio: 2,
		trigger: { global: "useCard" },
		forced: true,
		filter(event, player) {
			if (!player.isDamaged()) {
				return false;
			}
			if (event.card.name != "sha" && !(get.type(event.card) == "trick" && get.tag(event.card, "damage"))) {
				return false;
			}
			return event.player != player && event.player.inRange(player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zhixi", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			await trigger.player.chooseToDiscard(true);
		},
	},

// ============ 步骘（buzhi） ============
	// 弘德：每回合限一次，当你一次性得到或失去至少两张牌后，你可以令一名其他角色摸等量的牌（至多为4）。
	hongde: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: ["gainAfter", "loseAfter"] },
		usable: 1,
		filter(event, player) {
			return Array.isArray(event.cards) && event.cards.length >= 2 && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("hongde"), (card, player, target) => target != player).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.isIn()) {
				return;
			}
			const num = Math.min(trigger.cards.length, 4);
			await target.draw(num);
		},
	},
	// 定叛：出牌阶段每个势力限一次，你可以令一名装备区有牌的角色摸一张牌，其选择一项：
	// 1.获得装备区所有牌，然后你对其造成1点伤害；2.你弃置其装备区一张牌。
	dingpan: {
		aiShowTag: "offense",
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			const used = player.storage.dingpan_groups || [];
			return game.hasPlayer(target => target.countCards("e") > 0 && !used.includes(target.group));
		},
		async cost(event, trigger, player) {
			const used = player.storage.dingpan_groups || [];
			event.result = await player
				.chooseTarget(get.prompt2("dingpan"), (card, player, target) => target.countCards("e") > 0 && !used.includes(target.group))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!player.storage.dingpan_groups) {
				player.storage.dingpan_groups = [];
			}
			player.storage.dingpan_groups.push(target.group);
			player.addTempSkill("dingpan_clear", "phaseAfter");
			await target.draw();
			if (!target.isIn() || !target.countCards("e")) {
				return;
			}
			const result = await target
				.chooseControl(["获得装备区所有牌", "被弃置一张装备牌"])
				.set("prompt", "定叛：请选择一项")
				.forResult();
			if (result.control == "获得装备区所有牌") {
				const cards = target.getCards("e");
				if (cards.length) {
					await target.gain(cards, "gain2");
				}
				if (target.isIn()) {
					await target.damage(1, player);
				}
			} else if (target.countCards("e")) {
				await player.discardPlayerCard(target, "e", true);
			}
		},
	},
	dingpan_clear: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.dingpan_groups = [];
			player.removeSkill("dingpan_clear");
		},
	},

	// ============ 孙皓（sunhao） ============
	// 残蚀：摸牌阶段，你可以多摸X张牌（X为已受伤的角色数，若你已发动"归命"则改为全场角色数），
	// 然后当你本回合使用【杀】或普通锦囊牌时，你弃置一张牌。
	recanshi: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "drawBefore" },
		filter(event, player) {
			return game.hasPlayer(current => current.isDamaged()) || player.hasSkill("guiming");
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("recanshi")).forResult();
		},
		async content(event, trigger, player) {
			const num = player.hasSkill("guiming") ? game.countPlayer() : game.countPlayer(current => current.isDamaged());
			trigger.num += num;
			player.logSkill("guiming");
			player.addTempSkill("recanshi_buff", "phaseAfter");
		},
	},
	recanshi_buff: {
		charlotte: true,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return event.card && (event.card.name == "sha" || get.type(event.card) == "trick") && player.countCards("he") > 0;
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			await player.chooseToDiscard("he", true).forResult();
		},
	},
	// 仇海：锁定技，当你受到【杀】造成的伤害时，若你没有手牌，此伤害+1。
	rechouhai: {
		audio: 2,
		trigger: { player: "damageBefore" },
		forced: true,
		filter(event, player) {
			return event.card && event.card.name == "sha" && !player.countCards("h");
		},
		content(event, trigger, player) {
			trigger.num++;
		},
	},
	// 归命：锁定技，当你发动"残蚀"时，同势力角色视为已受伤。（效果体现于"残蚀"的X计算中）
	guiming: {
		audio: 2,
	},

	// ============ 阚泽（kanze） ============
	// 下书：出牌阶段开始时，你可以将所有手牌交给一名其他角色，然后该角色亮出任意数量的手牌，
	// 你选择一项：1.获得其亮出的手牌；2.获得其未亮出的手牌。
	xiashu: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("xiashu"), (card, player, target) => target != player).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const cards = player.getCards("h");
			if (cards.length && target.isIn()) {
				await player.give(cards, target);
			}
			if (!target.isIn() || !target.countCards("h")) {
				return;
			}
			const result = await target
				.chooseCard({
					position: "h",
					selectCard: [0, target.countCards("h")],
					forced: true,
					prompt: "下书：请选择任意数量的手牌亮出",
				})
				.forResult();
			const shown = (result.cards || []).slice();
			if (shown.length) {
				await target.showCards(shown, get.translation("xiashu"));
			}
			if (!target.isIn()) {
				return;
			}
			const hidden = target.getCards("h").filter(card => !shown.includes(card));
			if (!shown.length && !hidden.length) {
				return;
			}
			const pick = await player
				.chooseControl(["亮出的手牌", "未亮出的手牌"])
				.set("prompt", "下书：请选择获得哪部分手牌")
				.set("prompt2", `亮出的手牌（${shown.length}张）/未亮出的手牌（${hidden.length}张）`)
				.forResult();
			const gained = pick.control == "亮出的手牌" ? shown : hidden;
			if (gained.length) {
				await player.gain(gained, target, "give");
			}
		},
	},
	// 宽释：你的回合内，当你发动一个技能后，你可以再次发动其效果一次。
	// （原效果"重发本回合已使用或失效的技能"简化为"技能结算后立即选择是否重发一次"）
	kuanshi: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: ["useSkill", "logSkillBegin"] },
		usable: 1,
		filter(event, player) {
			return event.skill != "kuanshi" && lib.skill[event.skill] && typeof lib.skill[event.skill].content == "function";
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(`宽释：是否再次发动一次“${get.translation(trigger.skill)}”的效果？`).forResult();
		},
		async content(event, trigger, player) {
			const skillName = trigger.skill;
			if (lib.skill[skillName] && typeof lib.skill[skillName].content == "function") {
				await lib.skill[skillName].content.call(player, trigger, trigger, player);
			}
		},
	},

	// ============ 吕岱（lvdai） ============
	// 勤国：每回合限三次，当有装备牌置入你的装备区后，你可以视为使用一张无距离限制且不计入
	// 次数限制的【杀】；当你的装备区里的牌数变化后，若你的装备区里的牌数等于你的体力值，你回复1点体力。
	xinfu_qinguo: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: ["equipAfter", "loseAfter", "loseAsyncAfter", "gainAfter"] },
		filter(event, player, name) {
			if (name == "equipAfter") {
				return (player.storage.qinguo_count || 0) < 3;
			}
			if (event.getl && !event.getl(player)) {
				return false;
			}
			return player.countCards("e") > 0 && player.countCards("e") == player.hp;
		},
		async cost(event, trigger, player, name) {
			if (name == "equipAfter") {
				event.result = await player.chooseBool("勤国：是否视为使用一张无距离限制且不计入次数限制的【杀】？").forResult();
			} else {
				event.result = { bool: true };
			}
		},
		async content(event, trigger, player, name) {
			if (name == "equipAfter") {
				player.storage.qinguo_count = (player.storage.qinguo_count || 0) + 1;
				player.addTempSkill("qinguo_clear", "phaseAfter");
				player.addTempSkill("qinguo_buff");
				await player.chooseToUse({ name: "sha", isCard: true }, "###勤国###视为使用一张无距离限制的【杀】").set("complexSelect", true).set("complexTarget", true);
				player.removeSkill("qinguo_buff");
			} else {
				await player.recover();
			}
		},
	},
	qinguo_buff: {
		charlotte: true,
		mod: {
			targetInRange() {
				return true;
			},
			cardUsable(card) {
				if (card.name == "sha") {
					return Infinity;
				}
			},
		},
	},
	qinguo_clear: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.qinguo_count = 0;
			player.removeSkill("qinguo_clear");
		},
	},

	// ============ 周鲂（zhoufang） ============
	// 断发：出牌阶段，你可以弃置任意张黑色牌，然后摸等量的牌（你每阶段以此法弃置的牌数之和
	// 不能大于体力上限）。
	xinfu_duanfa: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			const used = player.storage.duanfa_used || 0;
			return used < player.maxHp && player.countCards("h", card => get.color(card, player) == "black") > 0;
		},
		async cost(event, trigger, player) {
			const used = player.storage.duanfa_used || 0;
			const max = player.maxHp - used;
			event.result = await player
				.chooseCard({
					position: "h",
					selectCard: [1, max],
					forced: true,
					filterCard(card) {
						return get.color(card, player) == "black";
					},
					prompt: "断发：弃置任意张黑色牌，然后摸等量的牌",
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			player.storage.duanfa_used = (player.storage.duanfa_used || 0) + cards.length;
			player.addTempSkill("duanfa_clear", "phaseAfter");
			await player.discard(cards);
			await player.draw(cards.length);
		},
	},
	duanfa_clear: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.duanfa_used = 0;
			player.removeSkill("duanfa_clear");
		},
	},
	// 诱敌：结束阶段，你可以令一名其他角色弃置你的一张手牌，若此牌不为【杀】，你获得其一张牌；
	// 若此牌为黑色牌，你摸一张牌。
	xinfu_youdi: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "phaseDiscardBegin" },
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("xinfu_youdi"), (card, player, target) => target != player).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.isIn() || !player.countCards("h")) {
				return;
			}
			const result = await target.discardPlayerCard(player, "h", 1, true).forResult();
			const card = result && result.cards && result.cards[0];
			if (!card) {
				return;
			}
			const isSha = get.name(card, player) == "sha";
			const isBlack = get.color(card, player) == "black";
			if (!isSha && target.isIn() && target.countCards("he")) {
				await player.gainPlayerCard(target, "he", true);
			}
			if (isBlack) {
				await player.draw();
			}
		},
	},

	// ============ 孙茹（sunru） ============
	// 影箭：准备阶段，你可以视为使用一张无距离限制的冰【杀】。
	yingjian: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("影箭：是否视为使用一张无距离限制的冰【杀】？").forResult();
		},
		async content(event, trigger, player) {
			player.addTempSkill("yingjian_buff");
			await player
				.chooseToUse({ name: "sha", isCard: true, nature: "ice" }, "###影箭###视为使用一张无距离限制的冰【杀】")
				.set("complexSelect", true)
				.set("complexTarget", true);
			player.removeSkill("yingjian_buff");
		},
	},
	yingjian_buff: {
		charlotte: true,
		mod: {
			targetInRange() {
				return true;
			},
		},
	},
	// 释矍：锁定技，防止你受到的所有火焰伤害和传导伤害。
	shijue: {
		audio: 2,
		trigger: { player: "damageBefore" },
		forced: true,
		filter(event, player) {
			return event.hasNature && event.hasNature("fire");
		},
		content(event, trigger, player) {
			trigger.cancel();
		},
	},

	// ============ 留赞（re_liuzan） ============
	// 奋音：锁定技，你的回合内，当一张牌进入弃牌堆后，若此回合内没有此花色的牌进入过弃牌堆，你摸一张牌。
	refenyin: {
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter", "cardsDiscardAfter"] },
		forced: true,
		popup: false,
		filter(event, player) {
			if (_status.currentPhase != player) {
				return false;
			}
			const cards = (event.cards || []).filterInD("d");
			if (!cards.length) {
				return false;
			}
			const used = player.storage.refenyin_suits || [];
			return cards.some(card => {
				const suit = get.suit(card, false);
				return suit && !used.includes(suit);
			});
		},
		async content(event, trigger, player) {
			const cards = (trigger.cards || []).filterInD("d");
			const used = player.storage.refenyin_suits || [];
			const newSuits = Array.from(new Set(cards.map(card => get.suit(card, false)).filter(suit => suit && !used.includes(suit))));
			if (!newSuits.length) {
				return;
			}
			player.storage.refenyin_suits = used.concat(newSuits);
			player.addTempSkill("refenyin_clear", "phaseAfter");
			await player.draw();
		},
	},
	refenyin_clear: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.refenyin_suits = [];
			player.removeSkill("refenyin_clear");
		},
	},
	// 力激：出牌阶段限一次，若本回合进入弃牌堆的牌包含所有花色，你可以弃置一张牌，然后对
	// 一名其他角色造成1点伤害。
	liji: {
		aiShowTag: "offense",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			const suits = player.storage.refenyin_suits || [];
			return lib.suit.every(suit => suits.includes(suit)) && player.countCards("he") > 0 && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					position: "he",
					selectCard: 1,
					filterTarget(card, player, target) {
						return target != player;
					},
					prompt: "力激：弃置一张牌，然后对一名其他角色造成1点伤害",
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards, targets } = event;
			if (cards && cards.length) {
				await player.discard(cards);
			}
			const target = targets && targets[0];
			if (target && target.isIn()) {
				await target.damage(1, player);
			}
		},
	},

	// ============ 薛综（xuezong） ============
	// 复难：当其他角色的牌因响应你使用的牌或被你抵消而进入弃牌堆后，你可以获得之（每种类别限一次）。
	funan: {
		aiShowTag: "response",
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (!event.player || event.player == player) {
				return false;
			}
			const cards = (event.cards || []).filterInD("d");
			if (!cards.length) {
				return false;
			}
			let evt = event;
			let related = false;
			for (let i = 0; i < 6 && evt; i++) {
				evt = evt.getParent();
				if (!evt) {
					break;
				}
				if ((evt.name == "useCard" || evt.name == "wuxie") && evt.player == player) {
					related = true;
					break;
				}
			}
			if (!related) {
				return false;
			}
			const used = player.storage.funan_types || [];
			return cards.some(card => !used.includes(get.type2(card, event.player)));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("funan")).forResult();
		},
		async content(event, trigger, player) {
			const owner = trigger.player;
			const cards = (trigger.cards || []).filterInD("d");
			const used = player.storage.funan_types || [];
			const newTypes = Array.from(new Set(cards.map(card => get.type2(card, owner)).filter(type => !used.includes(type))));
			if (!newTypes.length) {
				return;
			}
			player.storage.funan_types = used.concat(newTypes);
			player.addTempSkill("funan_clear", "phaseAfter");
			const gainCards = cards.filter(card => newTypes.includes(get.type2(card, owner)));
			if (gainCards.length) {
				await player.gain(gainCards, "gain2");
			}
		},
	},
	funan_clear: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.funan_types = [];
			player.removeSkill("funan_clear");
		},
	},
	// 诫训：结束阶段，你可以令一名角色弃置一张手牌，然后若此牌的花色为：♦，其摸两张牌；♥，回复1点体力。
	xinjiexun: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseDiscardBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current.countCards("h") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("xinjiexun"), (card, player, target) => target.countCards("h") > 0).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.isIn() || !target.countCards("h")) {
				return;
			}
			const result = await target.chooseToDiscard("h", 1, true).forResult();
			const card = result && result.cards && result.cards[0];
			if (!card || !target.isIn()) {
				return;
			}
			const suit = get.suit(card, target);
			if (suit == "diamond") {
				await target.draw(2);
			} else if (suit == "heart") {
				await target.recover();
			}
		},
	},

	// ============ 陆绩（luji） ============
	// 怀橘：锁定技，你获得3枚"阴阳鱼"标记；当同势力角色受到伤害时，其可以弃置1枚"阴阳鱼"标记，
	// 防止此伤害。
	nzry_huaiju: {
		aiShowTag: "support",
		audio: 2,
		init(player) {
			player.storage.huaiju_mark = 3;
			player.markSkill("nzry_huaiju");
		},
		trigger: { global: "damageBefore" },
		popup: false,
		filter(event, player) {
			return event.player && player.isFriendOf(event.player) && (event.player.storage.huaiju_mark || 0) > 0;
		},
		async cost(event, trigger, player) {
			event.result = await trigger.player.chooseBool(`怀橘：是否弃置1枚"阴阳鱼"标记，防止你受到的伤害？`).forResult();
		},
		async content(event, trigger, player) {
			trigger.player.storage.huaiju_mark--;
			if (trigger.player == player) {
				player.markSkill("nzry_huaiju");
			}
			trigger.cancel();
		},
	},
	// 遗礼：摸牌阶段，你可以少摸一张牌或流失一点体力，获得2枚"阴阳鱼"标记，然后你可以令任意名
	// 其他角色各获得你的1枚"阴阳鱼"标记。
	nzry_yili: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "drawBefore" },
		async content(event, trigger, player) {
			const result = await player
				.chooseControl(["少摸一张牌", "流失一点体力", "不发动"])
				.set("prompt", "遗礼：是否少摸一张牌或流失一点体力，获得2枚“阴阳鱼”标记？")
				.forResult();
			const choice = result.control;
			if (choice == "不发动") {
				return;
			}
			if (choice == "少摸一张牌") {
				trigger.num = Math.max(0, trigger.num - 1);
			} else {
				await player.loseHp();
			}
			if (!player.isIn()) {
				return;
			}
			player.storage.huaiju_mark = (player.storage.huaiju_mark || 0) + 2;
			player.markSkill("nzry_huaiju");
			const others = game.filterPlayer(current => current != player);
			if (!others.length) {
				return;
			}
			const giveResult = await player
				.chooseTarget("遗礼：你可以令任意名其他角色各获得你的1枚“阴阳鱼”标记", [0, others.length], (card, player, target) => target != player)
				.forResult();
			if (giveResult.bool && giveResult.targets && giveResult.targets.length) {
				for (const target of giveResult.targets) {
					if ((player.storage.huaiju_mark || 0) <= 0) {
						break;
					}
					player.storage.huaiju_mark--;
					target.storage.huaiju_mark = (target.storage.huaiju_mark || 0) + 1;
					target.markSkill("nzry_huaiju");
				}
				player.markSkill("nzry_huaiju");
			}
		},
	},

	// ============ 孙亮（sunliang） ============
	// 溃诛：弃牌阶段结束时，你可以选择一项：1.令至多X名角色各摸一张牌；2.对任意名体力值之和
	// 不大于X的角色各造成1点伤害。（X为你此阶段弃置的牌数）
	nzry_kuizhu: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "phaseDiscardEnd" },
		filter(event, player) {
			const cards = [];
			player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard") == event) {
					cards.addArray(evt.cards2 || evt.cards || []);
				}
			});
			return cards.length > 0;
		},
		async content(event, trigger, player) {
			const cards = [];
			player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard") == trigger) {
					cards.addArray(evt.cards2 || evt.cards || []);
				}
			});
			const num = cards.length;
			const choiceResult = await player
				.chooseControl(["draw", "damage", "cancel2"])
				.set("choiceList", [`令至多${num}名角色各摸一张牌`, `对体力值之和不大于${num}的角色各造成1点伤害`, "不发动"])
				.set("prompt", "溃诛：请选择一项")
				.forResult();
			if (choiceResult.control == "cancel2") {
				return;
			}
			if (choiceResult.control == "draw") {
				const result = await player.chooseTarget(`溃诛：请选择至多${num}名角色，令其各摸一张牌`, [0, num], true).forResult();
				if (result.bool && result.targets && result.targets.length) {
					for (const target of result.targets) {
						if (target.isIn()) {
							await target.draw();
						}
					}
				}
			} else {
				let remaining = num;
				const chosen = [];
				while (remaining > 0) {
					const hasCandidate = game.hasPlayer(current => !chosen.includes(current) && current.hp <= remaining);
					if (!hasCandidate) {
						break;
					}
					const result = await player
						.chooseTarget(`溃诛：选择一名体力值不大于${remaining}的角色（还可继续选择，点击“取消”结束选择）`, [0, 1], (card, player, target) => target.hp <= remaining && !chosen.includes(target))
						.forResult();
					if (!result.bool || !result.targets || !result.targets.length) {
						break;
					}
					const target = result.targets[0];
					chosen.push(target);
					remaining -= target.hp;
				}
				for (const target of chosen) {
					if (target.isIn()) {
						await target.damage(1, player);
					}
				}
			}
		},
	},
	// 立军：其他同势力角色的出牌阶段限一次，其使用【杀】结算结束后，其可以将此【杀】交给你。
	nzry_lijun: {
		aiShowTag: "response",
		audio: 2,
		trigger: { global: "useCardAfter" },
		filter(event, player) {
			return event.player != player && event.player.isIn() && event.player.isFriendOf(player) && event.card && event.card.name == "sha" && !event.player.storage.lijun_used;
		},
		async cost(event, trigger, player) {
			event.result = await trigger.player.chooseBool(`立军：是否将此【杀】交给${get.translation(player)}？`).forResult();
		},
		async content(event, trigger, player) {
			trigger.player.storage.lijun_used = true;
			trigger.player.addTempSkill("lijun_clear", "phaseAfter");
			const card = (trigger.cards || []).filterInD("d")[0];
			if (card) {
				await player.gain(card, "gain2");
			}
		},
	},
	lijun_clear: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.lijun_used = false;
			player.removeSkill("lijun_clear");
		},
	},

// ============ 许贡（xugong） ============
	// 表召：出牌阶段限一次，观看一名角色手牌，然后可选另一名角色获得对第一名角色的无次数限制用牌权，
	// 此时第一名角色对你的伤害至你下回合开始前+1。
	biaozhao: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target !== player;
		},
		filter(event, player) {
			return game.hasPlayer(current => current !== player);
		},
		async content(event, trigger, player) {
			const target = event.target;
			await player.viewHandcards(target);
			if (!game.hasPlayer(current => current !== player && current !== target)) {
				return;
			}
			const result = await player
				.chooseTarget(get.prompt2("biaozhao"), (card, player, current) => current !== player && current !== get.event().target)
				.set("target", target)
				.set("ai", current => get.attitude(get.player(), current))
				.forResult();
			if (!result.bool || !result.targets || !result.targets.length) {
				return;
			}
			const source = result.targets[0];
			player.line(source, "green");
			source.addTempSkill("biaozhao_unlimited", { player: "phaseAfter" });
			target.addTempSkill("biaozhao_dmg", { player: "phaseZhunbeiBegin" });
			target.storage.biaozhao_dmg = player;
		},
		ai: {
			order: 5,
			expose: 0.2,
			result: { player: 1 },
		},
	},
	biaozhao_unlimited: {
		charlotte: true,
		mod: {
			cardUsable() {
				return Infinity;
			},
		},
	},
	biaozhao_dmg: {
		charlotte: true,
		onremove: "storage",
		trigger: { source: "damageBegin1" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.player === player.storage.biaozhao_dmg;
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	},
	// 業仇：锁定技，死亡时对凶手依次使用三张无距离限制的杀：不可响应/无视防具/伤害+1。
	yechou: {
		audio: 2,
		trigger: { player: "die" },
		forced: true,
		forceDie: true,
		skillAnimation: true,
		animationColor: "wood",
		async content(event, trigger, player) {
			const target = trigger.source;
			if (!target || !target.isIn()) {
				return;
			}
			const helpers = ["yechou_hit", "yechou_unequip", "yechou_dmgbuff"];
			for (const helper of helpers) {
				if (!target.isIn()) {
					break;
				}
				player.addTempSkill(helper);
				const card = get.autoViewAs({ name: "sha", isCard: true, storage: { [helper]: true } });
				if (player.canUse(card, target, false)) {
					await player.useCard(card, target, false);
				}
				player.removeSkill(helper);
			}
		},
		ai: {
			halfliving: true,
		},
	},
	yechou_hit: {
		charlotte: true,
		trigger: { player: "useCard" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!event.card?.storage?.yechou_hit;
		},
		async content(event, trigger, player) {
			trigger.directHit.addArray(game.players);
		},
	},
	yechou_unequip: {
		charlotte: true,
		ai: {
			unequip: true,
			skillTagFilter(player, tag, arg) {
				return !!(arg && arg.card && arg.card.storage && arg.card.storage.yechou_unequip);
			},
		},
	},
	yechou_dmgbuff: {
		charlotte: true,
		trigger: { source: "damageBegin1" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!event.card?.storage?.yechou_dmg;
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	},

	// ============ 陆郁生（luyusheng） ============
	// 贞特：每回合限一次，成为基本牌/普通锦囊牌目标后，令使用者本回合不能再用同色牌或此牌对你无效。
	zhente: {
		aiShowTag: "support",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		usable: 1,
		filter(event, player) {
			return event.player !== player && ["basic", "trick"].includes(get.type(event.card));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2(event.skill)).forResult();
		},
		async content(event, trigger, player) {
			const source = trigger.player;
			const color = get.color(trigger.card, source);
			const choice1 = "本回合不再使用" + get.translation(color) + "色牌";
			const choice2 = "令此牌对" + get.translation(player) + "无效";
			const result = await source
				.chooseControl(choice1, choice2)
				.set("prompt", get.prompt2("zhente"))
				.set("ai", () => (Math.random() > 0.5 ? get.event().choice1 : get.event().choice2))
				.set("choice1", choice1)
				.set("choice2", choice2)
				.forResult();
			if (result.control === choice1) {
				source.addTempSkill("zhente_ban", { player: "phaseAfter" });
				source.storage.zhente_ban = color;
			} else {
				trigger.untrigger();
			}
		},
	},
	zhente_ban: {
		charlotte: true,
		onremove: "storage",
		mod: {
			cardEnabled(card, player) {
				if (get.color(card, player) === player.storage.zhente_ban) {
					return false;
				}
			},
		},
	},
	// 至微：限定技，一名其他角色准备阶段交给其任意牌并绑定，之后其伤害联动摸弃牌，弃牌阶段所弃的牌归其所有，死亡则重置。
	zhiwei: {
		aiShowTag: "support",
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return event.player !== player;
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseToGive(trigger.player, "he", [0, Infinity])
				.set("prompt", get.prompt2(event.skill))
				.forResult();
			event.result = { bool: true };
		},
		async content(event, trigger, player) {
			player.storage.zhiwei_target = trigger.player;
			player.addSkill("zhiwei_effect");
			player.logSkill("zhiwei", trigger.player);
		},
		ai: {
			expose: 0.3,
		},
	},
	zhiwei_effect: {
		charlotte: true,
		onremove: "storage",
		intro: {
			content: "$造成伤害后你摸一张牌，$受到伤害后你弃置一张手牌；你弃牌阶段弃置的牌均被$获得",
		},
		group: ["zhiwei_draw", "zhiwei_discard", "zhiwei_gain", "zhiwei_clear"],
		subSkill: {
			draw: {
				trigger: { global: "damageSource" },
				forced: true,
				filter(event, player) {
					return event.source === player.storage.zhiwei_target;
				},
				async content(event, trigger, player) {
					await player.draw();
				},
			},
			discard: {
				trigger: { global: "damageEnd" },
				forced: true,
				filter(event, player) {
					return event.player === player.storage.zhiwei_target && player.countCards("h") > 0;
				},
				async content(event, trigger, player) {
					await player.chooseToDiscard("h", true);
				},
			},
			gain: {
				trigger: { player: "loseAfter", global: "loseAsyncAfter" },
				forced: true,
				filter(event, player) {
					if (event.type !== "discard" || event.getlx === false || event.getParent("phaseDiscard")?.player !== player || !player.storage.zhiwei_target || !player.storage.zhiwei_target.isIn()) {
						return false;
					}
					const evt = event.getl(player);
					return evt && evt.cards2.filterInD("d").length > 0;
				},
				async content(event, trigger, player) {
					if (trigger.delay === false) {
						game.delay();
					}
					await player.storage.zhiwei_target.gain(trigger.getl(player).cards2.filterInD("d"), "gain2");
				},
			},
			clear: {
				trigger: { global: "die" },
				forced: true,
				filter(event, player) {
					return event.player === player.storage.zhiwei_target;
				},
				async content(event, trigger, player) {
					player.removeSkill("zhiwei_effect");
					player.storage.zhiwei_target = null;
					player.storage.zhiwei = false;
				},
			},
		},
	},

	// ============ 吴景（wujing） ============
	// 调归：出牌阶段限一次，你可以将一张牌当【调虎离山】使用，若你的势力因此形成队列或
	// 围攻关系，则你摸X张牌（X为该阵法关系人数）；与你势力相同的角色成为【调虎离山】的
	// 目标时，其可以摸一张牌并取消之。
	// 直接复用card/guozhan.js里已有的【调虎离山】(diaohulishan)实现（"移出游戏直到
	// 回合结束"，charlotte自动清除，不是"不能用牌"），而不是自己发明一个禁用手牌的效果。
	diaogui: {
		aiShowTag: "control",
		audio: 2,
		group: ["diaogui_draw", "diaogui_cancel"],
		enable: ["chooseToUse"],
		usable: 1,
		filterCard() {
			return false;
		},
		viewAsFilter(player) {
			return !player.storage.diaogui_used;
		},
		viewAs: { name: "diaohulishan" },
		onuse(result, player) {
			player.storage.diaogui_used = true;
		},
		ai: {
			order: 6,
			skillTagFilter(player) {
				return !player.storage.diaogui_used;
			},
		},
	},
	// 内部标记技，不出现在武将技能栏：调归结算完之后，检查是否因此形成队列/围攻关系并摸牌。
	diaogui_draw: {
		charlotte: true,
		trigger: { player: "useCardAfter" },
		popup: false,
		silent: true,
		filter(event, player) {
			return event.skill === "diaogui";
		},
		async content(event, trigger, player) {
			let num = 0;
			if (player.siege()) {
				num = 2;
			} else if (player.inline()) {
				num = 1 + game.players.filter(current => current !== player && player.inline(current)).length;
			}
			if (num > 0) {
				await player.draw(num);
			}
		},
	},
	// 内部标记技：与吴景势力相同的角色（含吴景本人）成为【调虎离山】的目标时，可以摸一张
	// 牌并取消自己被移出游戏。
	diaogui_cancel: {
		charlotte: true,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			return event.card?.name === "diaohulishan" && event.target.isIn() && (event.target === player || event.target.isFriendOf(player));
		},
		async cost(event, trigger, player) {
			event.result = await trigger.target.chooseBool(`调归：是否摸一张牌，取消你成为【调虎离山】的目标？`).forResult();
		},
		async content(event, trigger, player) {
			await trigger.target.draw();
			trigger.untrigger();
		},
	},
	// 风扬：锁定技，异势力角色不能弃置或获得你装备区里的牌。
	fengyang: {
		audio: 2,
		locked: true,
		mod: {
			canBeDiscarded(card, player, target) {
				if (get.position(card) === "e" && target.isEnemyOf(player)) {
					return false;
				}
			},
		},
	},

	// ============ 周夷（zhouyi） ============
	// 逐寇：于一名角色出牌阶段内第一次造成伤害后，摸X张牌（X为本回合已用牌数，至多3）。
	zhukou: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { source: "damageSource" },
		filter(event, player) {
			if (!player.getHistory("useCard").length) {
				return false;
			}
			const evt = event.getParent("phaseUse");
			if (!evt || !evt.player) {
				return false;
			}
			return player.getHistory("sourceDamage", evtx => evtx.getParent("phaseUse") === evt).indexOf(event) === 0;
		},
		frequent: true,
		async content(event, trigger, player) {
			await player.draw(Math.min(3, player.getHistory("useCard").length));
		},
	},
	// 断念：出牌阶段结束时，可弃置所有手牌（至少一张）然后摸至体力上限。
	duannian: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseUseEnd" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2(event.skill)).forResult();
		},
		async content(event, trigger, player) {
			await player.discard(player.getCards("h"));
			await player.drawTo(player.maxHp);
		},
	},
	// 莲佑：死亡时可令一名其他角色获得“兴火”。
	lianyou: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "die" },
		forceDie: true,
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2(event.skill), lib.filter.notMe).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.line(target, "green");
			target.addSkill("xinghuo");
		},
	},
	// 兴火：锁定技，造成的火焰伤害+1。
	xinghuo: {
		audio: 2,
		locked: true,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return event.nature === "fire";
		},
		forced: true,
		async content(event, trigger, player) {
			trigger.num++;
		},
	},

	// ============ 冯熙（fengxi） ============
	// 玉碎：每回合限一次，成为黑色牌目标后，失去1点体力，然后令其弃牌至你手牌数或掉血至你体力值。
	yusui: {
		aiShowTag: "offense",
		aiShowCost: true,
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		usable: 1,
		filter(event, player) {
			return event.player !== player && event.player.isIn() && get.color(event.card) === "black";
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2(event.skill)).forResult();
		},
		async content(event, trigger, player) {
			await player.loseHp();
			const target = trigger.player;
			if (!target.isIn()) {
				return;
			}
			const list = [];
			if (target.countCards("h") > player.countCards("h")) {
				list.push("令其弃置手牌至与你手牌数相同");
			}
			if (target.hp > player.hp) {
				list.push("令其失去体力至体力值与你相同");
			}
			if (!list.length) {
				return;
			}
			let index = 0;
			if (list.length > 1) {
				const result = await player
					.chooseControl(list)
					.set("prompt", get.prompt2("yusui"))
					.set("ai", () => (target.hp - player.hp > (target.countCards("h") - player.countCards("h")) / 2 ? list[1] : list[0]))
					.forResult();
				index = list.indexOf(result.control);
			}
			if (list[index] === "令其弃置手牌至与你手牌数相同") {
				await target.chooseToDiscard(target.countCards("h") - player.countCards("h"), true, "h", "allowChooseAll");
			} else {
				await target.loseHp(target.hp - player.hp);
			}
		},
	},
	// 驳言：出牌阶段限一次，令一名其他角色摸至体力上限（至多五张），然后其本回合不能用/打手牌。
	boyan: {
		aiShowTag: "control",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target !== player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			await target.drawTo(Math.min(5, target.maxHp));
			target.addTempSkill("boyan_block", { player: "phaseAfter" });
		},
	},
	boyan_block: {
		charlotte: true,
		mark: true,
		intro: { content: "本回合不能使用或打出手牌" },
		mod: {
			cardEnabled(card, player) {
				if (get.position(card) === "h") {
					return false;
				}
			},
		},
	},

	// ============ 孙桓（sunhuan） ============
	// 逆击：成为基本牌/锦囊牌目标后可摸一张“逆击”牌，结束阶段先可用一张再弃置其余。
	dcniji: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.player !== player && ["basic", "trick"].includes(get.type(event.card));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2(event.skill)).forResult();
		},
		async content(event, trigger, player) {
			const next = player.draw();
			next.gaintag.add("dcniji");
			await next;
			player.addTempSkill("dcniji_end", { player: "phaseAfter" });
		},
	},
	dcniji_end: {
		charlotte: true,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.countCards("he", card => card.hasGaintag("dcniji")) > 0;
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			if (player.countCards("he", card => card.hasGaintag("dcniji"))) {
				await player.chooseToUse({
					filterCard(card) {
						return card.hasGaintag("dcniji");
					},
					prompt: get.prompt2("dcniji"),
					complexSelect: false,
				});
			}
			const cards = player.getCards("he", card => card.hasGaintag("dcniji"));
			if (cards.length) {
				await player.discard(cards);
			}
		},
	},

	// ============ 孙綝（dc_sunchen） ============
	// 自固：出牌阶段限一次，弃一牌获得场上一张装备牌；若未从他人处获得，摸一张牌。
	zigu: {
		aiShowTag: "draw",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		position: "he",
		selectCard: 1,
		async content(event, trigger, player) {
			const targets = game.filterPlayer(current => current.countGainableCards(player, "e"));
			let target;
			if (targets.length === 1) {
				target = targets[0];
			} else if (targets.length > 1) {
				const result = await player
					.chooseTarget("自固：获得一名角色装备区里的一张牌", true, (card, player, current) => current.countGainableCards(player, "e"))
					.set("ai", current => (current === get.player() ? 10 : get.attitude(get.player(), current) < 0 ? 8 : 0))
					.forResult();
				if (result.bool) {
					target = result.targets[0];
				}
			}
			let gained = false;
			if (target) {
				const result = await player.gainPlayerCard(target, "e", true).forResult();
				if (result.bool && result.cards && target !== player) {
					gained = true;
				}
			}
			if (!gained) {
				await player.draw();
			}
		},
	},
	// 作威：每项限一次，回合内用牌时按手牌数与装备区牌数(至少1)比较执行不同效果。
	zuowei: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "useCard" },
		frequent: true,
		filter(event, player) {
			if (_status.currentPhase !== player) {
				return false;
			}
			const x = Math.max(1, player.countCards("e"));
			const h = player.countCards("h");
			if (h > x) {
				return !player.hasSkill("zuowei_gt") && game.hasPlayer(current => current !== player && current.countCards("he") > 0);
			}
			if (h === x) {
				return !player.hasSkill("zuowei_eq") && !!(event.target || (event.targets && event.targets.length));
			}
			return !player.hasSkill("zuowei_lt");
		},
		async content(event, trigger, player) {
			const x = Math.max(1, player.countCards("e"));
			const h = player.countCards("h");
			if (h > x) {
				const result = await player
					.chooseTarget(get.prompt2("zuowei"), lib.filter.notMe, (card, player, target) => target.countCards("he") > 0)
					.forResult();
				if (result.bool) {
					player.addTempSkill("zuowei_gt", { player: "phaseAfter" });
					await player.discardPlayerCard(result.targets[0], true);
				}
			} else if (h === x) {
				const target = trigger.target || trigger.targets[0];
				if (target && target.isIn()) {
					player.addTempSkill("zuowei_eq", { player: "phaseAfter" });
					await target.damage();
				}
			} else {
				player.addTempSkill("zuowei_lt", { player: "phaseAfter" });
				await player.draw();
			}
		},
	},
	zuowei_gt: { charlotte: true },
	zuowei_eq: { charlotte: true },
	zuowei_lt: { charlotte: true },

	// ============ 孙峻（hb_sunjun） ============
	// 邀宴：准备阶段可选任意名其他角色与你议事；红色获得未参与者各一手牌，黑色可对一名参与者伤害2。
	yaoyan: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current !== player && current.countCards("h"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), [0, Infinity], (card, player, target) => target !== player && target.countCards("h") > 0)
				.set("ai", target => get.attitude(get.player(), target))
				.forResult();
		},
		async content(event, trigger, player) {
			const joined = (event.targets || []).sortBySeat();
			await player
				.chooseToDebate([player].concat(joined))
				.set("callback", async (event, trigger, player) => {
					const { debateResult: result } = event;
					let { red, black } = result;
					if (player.hasSkill("bazheng")) {
						const mine = red.some(i => i[0] === player) ? "red" : "black";
						const damaged = player.getHistory("sourceDamage", evt => evt.getParent("phase") && evt.getParent("phase").player === player).map(evt => evt.player);
						if (mine === "red") {
							const moved = black.filter(i => damaged.includes(i[0]));
							black = black.filter(i => !damaged.includes(i[0]));
							red = red.concat(moved);
						} else {
							const moved = red.filter(i => damaged.includes(i[0]) && i[0] !== player);
							red = red.filter(i => !damaged.includes(i[0]) || i[0] === player);
							black = black.concat(moved);
						}
					}
					const opinion = red.length >= black.length ? "red" : "black";
					if (opinion === "red") {
						const others = game.filterPlayer(current => current !== player && !joined.includes(current) && current.countCards("h"));
						if (others.length) {
							const result2 = await player
								.chooseTarget("邀宴：获得任意名未参与议事的角色各一张手牌", [0, others.length], (card, player, target) => get.event().others.includes(target))
								.set("others", others)
								.forResult();
							if (result2.bool) {
								for (const target of result2.targets) {
									await player.gainPlayerCard(target, "h", true);
								}
							}
						}
					} else {
						const candidates = joined.filter(current => current.isIn());
						if (candidates.length) {
							const result2 = await player
								.chooseTarget("邀宴：对一名参与议事的角色造成2点伤害", (card, player, target) => get.event().candidates.includes(target))
								.set("candidates", candidates)
								.forResult();
							if (result2.bool) {
								await result2.targets[0].damage(2);
							}
						}
					}
				});
		},
		ai: {
			order: 6,
		},
	},
	// 霸政：锁定技（效果并入邀宴结算，见上）。
	bazheng: {
		audio: 2,
		locked: true,
		mod: {},
		intro: {
			content: "锁定技，你参与的议事意见展示时，本回合受到过你造成的伤害的角色的意见视为与你相同",
		},
	},


	// ============ 陈宫（chengong） ============
	// 引叛：出牌阶段限一次，你可以选择一名角色，令所有与其势力不同的角色依次选择是否对其使用
	// 一张无距离次数限制的【杀】，结算完成后，该角色于其下个回合使用【杀】的次数+X，若其进入过
	// 濒死状态，其回复1点体力（X为其以损失的体力值）。
	yinpan: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		usable: 1,
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("yinpan"), (card, player, target) => true, true).forResult();
		},
		async content(event, trigger, player) {
			const victim = event.targets[0];
			if (!victim.isIn()) {
				return;
			}
			const hpBefore = victim.hp;
			const dyingBefore = game.getGlobalHistory("dying", evt => evt.player === victim).length;
			const others = game.filterPlayer(current => current.isEnemyOf(victim));
			for (const other of others) {
				if (!victim.isIn() || !other.isIn()) {
					continue;
				}
				const card = { name: "sha", isCard: true };
				if (!other.canUse(card, victim, false)) {
					continue;
				}
				const result = await other.chooseBool(`引叛：是否对${get.translation(victim)}使用一张无距离次数限制的【杀】？`).forResult();
				if (result.bool && victim.isIn() && other.canUse(card, victim, false)) {
					await other.useCard(card, victim, false);
				}
			}
			const dyingAfter = game.getGlobalHistory("dying", evt => evt.player === victim).length;
			if (dyingAfter > dyingBefore && victim.isIn()) {
				await victim.recover();
			}
			if (victim.isIn()) {
				const lost = Math.max(0, hpBefore - victim.hp);
				if (lost > 0) {
					victim.storage.yinpan_x = lost;
					victim.addTempSkill("yinpan_arm");
				}
			}
		},
	},
	yinpan_arm: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.removeSkill("yinpan_arm");
			player.addTempSkill("yinpan_buff", "phaseUseAfter");
		},
	},
	yinpan_buff: {
		charlotte: true,
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return (typeof num == "number" ? num : 1) + (player.storage.yinpan_x || 0);
				}
			},
		},
	},
	// 智迟：锁定技，当你于回合外受到伤害后，本回合内，【杀】和普通锦囊牌对你无效。
	zhichi: {
		audio: 2,
		trigger: { player: "damageEnd" },
		forced: true,
		filter(event, player) {
			return _status.currentPhase != player;
		},
		content(event, trigger, player) {
			player.addTempSkill("zhichi_buff", ["phaseAfter", "phaseBefore"]);
		},
	},
	zhichi_buff: {
		charlotte: true,
		trigger: { target: "useCardToBefore" },
		forced: true,
		priority: 15,
		filter(event, player) {
			return get.type(event.card) == "trick" || event.card.name == "sha";
		},
		content(event, trigger, player) {
			trigger.cancel();
		},
	},

	// ============ 许攸（xuyou） ============
	// 侍才：锁定技，当你受到伤害后，若伤害值大于1，则你弃置两张牌；否则你摸两张牌。
	nzry_shicai: {
		audio: 2,
		trigger: { player: "damageEnd" },
		forced: true,
		async content(event, trigger, player) {
			if (trigger.num > 1) {
				if (player.countCards("he")) {
					await player.chooseToDiscard("he", 2, true).forResult();
				}
			} else {
				await player.draw(2);
			}
		},
	},
	// 成略：当与你势力相同的角色使用牌指定目标后，若此牌目标数大于1，你可以令其摸一张牌，然后若你
	// 也是此牌的目标之一，你可以令一名与你势力相同的角色获得一枚"阴阳鱼"标记。
	nzry_chenglve: {
		aiShowTag: "response",
		audio: 2,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			return event.player && player.isFriendOf(event.player) && event.targets && event.targets.length > 1;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("nzry_chenglve", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			if (trigger.player.isIn()) {
				await trigger.player.draw();
			}
			if (trigger.targets && trigger.targets.includes(player)) {
				const result = await player
					.chooseTarget("成略：是否令一名与你势力相同的角色获得一枚“阴阳鱼”标记？", (card, player, target) => player.isFriendOf(target), true)
					.forResult();
				const target = result.targets && result.targets[0];
				if (target && target.isIn()) {
					target.addSkill("nzry_chenglve_mark");
					target.addMark("nzry_chenglve_mark", 1);
				}
			}
		},
	},
	nzry_chenglve_mark: {
		charlotte: true,
		mark: true,
		intro: {
			content: "拥有#枚“阴阳鱼”标记",
		},
	},

	// ============ 士燮（shixie） ============
	// 避乱：锁定技，你拥有一个额外的装备栏，其可以装备任意副类别的装备牌。若你的装备区里有牌，
	// 其他角色计算与你的距离+2。（引擎不支持"单个可装任意副类别的栏位"，简化为五个副类别各+1个
	// 栏位）
	olbiluan: {
		audio: 2,
		init(player) {
			player.expandedSlots = player.expandedSlots || {};
			for (let i = 1; i <= 5; i++) {
				player.expandedSlots["equip" + i] = (player.expandedSlots["equip" + i] || 0) + 1;
			}
		},
		mod: {
			globalTo(from, to, distance) {
				if (to.countCards("e") > 0) {
					return distance + 2;
				}
			},
		},
	},
	// 礼下：锁定技，每名其他势力角色的准备阶段，若你不在其攻击范围内，其选择一项：1.令你摸一张
	// 牌；2.弃置你装备区里的一张牌，然后失去1点体力；3.交给你一张装备牌，视为对你使用一张无次数
	// 距离限制的【杀】。
	relixia: {
		audio: 2,
		trigger: { global: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return event.player != player && event.player.isIn() && event.player.isEnemyOf(player) && get.distance(event.player, player) > event.player.getAttackRange();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const choices = ["令其摸一张牌"];
			if (player.countCards("e")) {
				choices.push("弃置其装备区一张牌");
			}
			if (target.countCards("e")) {
				choices.push("交给其一张装备牌");
			}
			const result = await target.chooseControl(choices).set("prompt", get.prompt2("relixia", player)).forResult();
			if (result.control == "令其摸一张牌") {
				await player.draw();
			} else if (result.control == "弃置其装备区一张牌") {
				if (player.countCards("e")) {
					await target.discardPlayerCard(player, "e", true);
				}
				await target.loseHp();
			} else if (result.control == "交给其一张装备牌") {
				const cardResult = await target.chooseCard("e", true, "礼下：选择一张装备牌交给对方").forResult();
				if (cardResult.bool && cardResult.cards && cardResult.cards.length) {
					await target.give(cardResult.cards, player);
					const card = { name: "sha", isCard: true };
					if (target.canUse(card, player, false)) {
						await target.useCard(card, player, false);
					}
				}
			}
		},
	},

	// ============ 华佗（huatuo） ============
	// 急救：你于回合外可以将一张红色牌当【桃】使用。
	jijiu: {
		aiShowTag: "support",
		audio: 2,
		enable: "chooseToUse",
		viewAsFilter(player) {
			return player != _status.currentPhase && player.hasCards("he", { color: "red" });
		},
		filterCard(card, player) {
			return get.color(card, player) == "red";
		},
		position: "he",
		viewAs: { name: "tao" },
		prompt: "将一张红色牌当【桃】使用",
		check(card) {
			return 15 - get.value(card);
		},
	},
	// 除瘟：出牌阶段限一次，你可以选择一项：1.选择至多三名势力各不相同或未确定势力的其他角色，
	// 然后你与这些角色各弃置一张牌，被弃置♠牌的角色摸一张牌；2.弃置一张手牌，然后令一名角色
	// 回复1点体力。
	chuwen: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		usable: 1,
		async content(event, trigger, player) {
			const choiceResult = await player.chooseControl(["选择角色弃牌", "弃牌回体力", "不发动"]).set("prompt", get.prompt2("chuwen")).forResult();
			if (choiceResult.control == "不发动") {
				return;
			}
			if (choiceResult.control == "选择角色弃牌") {
				const targetResult = await player
					.chooseTarget(
						"除瘟：选择至多三名势力各不相同或未确定势力的其他角色",
						(card, player, target) => {
							if (target == player) {
								return false;
							}
							return !ui.selected.targets.some(other => other.isFriendOf(target));
						},
						[1, 3]
					)
					.forResult();
				if (!targetResult.bool || !targetResult.targets || !targetResult.targets.length) {
					return;
				}
				const participants = [player, ...targetResult.targets];
				for (const cur of participants) {
					if (!cur.isIn() || !cur.countCards("he")) {
						continue;
					}
					const cardResult = await cur.chooseCard("he", true, "除瘟：弃置一张牌").forResult();
					if (!cardResult.bool || !cardResult.cards || !cardResult.cards.length) {
						continue;
					}
					const isSpade = cardResult.cards.some(card => get.suit(card, cur) == "spade");
					await cur.discard(cardResult.cards);
					if (isSpade && cur.isIn()) {
						await cur.draw();
					}
				}
			} else {
				if (!player.countCards("h")) {
					return;
				}
				const discardResult = await player.chooseToDiscard("h", true, "除瘟：弃置一张手牌").forResult();
				if (!discardResult.bool) {
					return;
				}
				const targetResult = await player.chooseTarget(get.prompt2("chuwen"), (card, player, target) => true, true).forResult();
				const target = targetResult.targets && targetResult.targets[0];
				if (target && target.isIn()) {
					await target.recover();
				}
			}
		},
	},

	// ============ 吕布（lvbu） ============
	// 无双：锁定技，与官方"无双"（wushuang/wushuang1/wushuang2）同名同效，复制自standard包。
	// 卡面额外效果：你使用非转化的【决斗】和【杀】可以选择至多三名角色为目标。
	// （卡面写作"空巢【杀】"，此处按普通【杀】处理）
	wushuang: {
		audio: 2,
		audioname: ["re_lvbu", "shen_lvbu", "lvlingqi", "mb_shen_lvbu"],
		audioname2: { sb_lvbu: "sbliyu_effect" },
		forced: true,
		locked: true,
		group: ["wushuang1", "wushuang2"],
		preHidden: ["wushuang1", "wushuang2"],
	},
	wushuang1: {
		audio: "wushuang",
		audioname: ["re_lvbu", "shen_lvbu", "lvlingqi", "mb_shen_lvbu"],
		audioname2: {
			sb_lvbu: "sbliyu_effect",
			gz_lvlingqi: "wushuang_lvlingqi",
		},
		trigger: { player: "useCardToPlayered" },
		forced: true,
		sourceSkill: "wushuang",
		filter(event, player) {
			return event.card.name === "sha" && !event.getParent()?.directHit.includes(event.target);
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const id = trigger.target.playerid;
			const map = trigger.getParent()?.customArgs;
			if (id != null) {
				if (!map[id]) {
					map[id] = {};
				}
				if (typeof map[id].shanRequired == "number") {
					map[id].shanRequired++;
				} else {
					map[id].shanRequired = 2;
				}
			}
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (arg.card.name !== "sha" || arg.target.countCards("h", "shan") > 1) {
					return false;
				}
			},
		},
	},
	wushuang2: {
		audio: "wushuang",
		audioname: ["re_lvbu", "shen_lvbu", "lvlingqi", "mb_shen_lvbu"],
		audioname2: {
			sb_lvbu: "sbliyu_effect",
			gz_lvlingqi: "wushuang_lvlingqi",
		},
		trigger: { player: "useCardToPlayered", target: "useCardToTargeted" },
		forced: true,
		sourceSkill: "wushuang",
		logTarget(trigger, player) {
			return player === trigger.player ? trigger.target : trigger.player;
		},
		filter(event, player) {
			return event.card.name === "juedou";
		},
		async content(event, trigger, player) {
			const id = (player === trigger.player ? trigger.target : trigger.player)["playerid"];
			const idt = trigger.target.playerid;
			const map = trigger.getParent()?.customArgs;
			if (id != null && idt != null) {
				if (!map[idt]) {
					map[idt] = {};
				}
				if (!map[idt].shaReq) {
					map[idt].shaReq = {};
				}
				if (!map[idt].shaReq[id]) {
					map[idt].shaReq[id] = 1;
				}
				map[idt].shaReq[id]++;
			}
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (arg.card.name !== "juedou" || Math.floor(arg.target.countCards("h", "sha") / 2) > player.countCards("h", "sha")) {
					return false;
				}
			},
		},
	},
	wushuang_ext: {
		mod: {
			selectTarget(card, player, range) {
				if (!Array.isArray(range)) {
					return;
				}
				if ((card.name == "juedou" && !card.viewAs) || card.name == "sha") {
					return [range[0], Math.max(range[1], 3)];
				}
			},
		},
	},

	// ============ 貂蝉（diaochan） ============
	// 离间：出牌阶段限一次，你可以弃置一张牌，然后令一名男性其他角色视为对另一名男性其他角色使用
	// 一张【决斗】（不能被【无懈可击】响应）。
	lijian: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("he") > 0 && game.countPlayer(current => current != player && current.hasSex("male")) > 1;
		},
		filterCard: true,
		position: "he",
		selectCard: 1,
		filterTarget(card, player, target) {
			if (target == player || !target.hasSex("male")) {
				return false;
			}
			if (ui.selected.targets.length == 1) {
				return target != ui.selected.targets[0];
			}
			return true;
		},
		selectTarget: 2,
		multitarget: true,
		async content(event, trigger, player) {
			const [source, dest] = event.targets;
			if (event.cards && event.cards.length) {
				await player.discard(event.cards);
			}
			if (!source.isIn() || !dest.isIn()) {
				return;
			}
			await source
				.useCard({
					card: get.autoViewAs({ name: "juedou", isCard: true }),
					targets: [dest],
					nowuxie: true,
					noai: true,
				})
				.set("animate", false);
		},
	},
	// 闭月：结束阶段，你摸一张牌。
	biyue: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	},

	// ============ 袁绍（re_yuanshao） ============
	// 乱击：你可以将两张手牌当【万箭齐发】使用（不能使用本阶段发动此技能时使用过的花色）；与你
	// 势力相同的角色打出【闪】响应此牌后可摸一张牌。
	luanji: {
		aiShowTag: "offense",
		audio: 2,
		enable: "phaseUse",
		viewAs: { name: "wanjian" },
		filterCard(card, player) {
			return !(player.storage.luanji_suits || []).includes(get.suit(card, player));
		},
		viewAsFilter(player) {
			const suits = player.storage.luanji_suits || [];
			return player.countCards("h", card => !suits.includes(get.suit(card, player))) >= 2;
		},
		selectCard: 2,
		position: "h",
		check(card) {
			return 6 - get.value(card);
		},
		onuse(event, player) {
			const suit = get.suit(event.cards[0], player);
			player.storage.luanji_suits = (player.storage.luanji_suits || []).concat(suit);
			player.addTempSkill("luanji_reset", "phaseAfter");
		},
	},
	luanji_reset: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			delete player.storage.luanji_suits;
		},
	},
	luanji_gain: {
		charlotte: true,
		trigger: { global: "respond" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!(event.card && event.card.name == "shan" && Array.isArray(event.respondTo) && event.respondTo[0] == player && event.respondTo[1] && event.respondTo[1].name == "wanjian" && event.player.isFriendOf(player));
		},
		content(event, trigger, player) {
			trigger.player.draw();
		},
	},
	// 血裔：锁定技，当你造成伤害后，受伤角色可以将武将牌翻面。
	// （原版"明置武将牌"依国战双将机制改写为"翻面"；原版"杀死同势力角色不执行奖惩"因本项目
	// 无国战奖惩机制而不适用，略去）
	xueyi: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.player && event.player.isIn();
		},
		async cost(event, trigger, player) {
			event.result = await trigger.player.chooseBool(get.prompt2("xueyi")).forResult();
		},
		content(event, trigger, player) {
			trigger.player.turnOver();
		},
	},

	// ============ 颜良&文丑（hb_yanliangwenchou） ============
	// 双雄：出牌阶段开始时，你可以令一名角色弃置一张牌，然后本回合你可以将与结果颜色不同的一张
	// 手牌当【决斗】使用。每回合限一次，当你因【决斗】受到伤害后，你可以获得此次【决斗】中另
	// 一方打出的【杀】。
	shuangxiong: {
		audio: 2,
		group: ["shuangxiong_discard", "shuangxiong_gain"],
	},
	shuangxiong_discard: {
		aiShowTag: "support",
		sourceSkill: "shuangxiong",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current.countDiscardableCards(player, "he") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("shuangxiong"), (card, player, target) => target.countDiscardableCards(player, "he") > 0, true).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.isIn()) {
				return;
			}
			const result = await player.discardPlayerCard(target, "he", true).forResult();
			const cards = result && result.cards;
			if (cards && cards.length) {
				player.storage.shuangxiong_color = get.color(cards[0], target);
				player.addTempSkill("shuangxiong_use", "phaseUseAfter");
			}
		},
	},
	shuangxiong_use: {
		aiShowTag: "offense",
		charlotte: true,
		enable: ["chooseToUse"],
		viewAs: { name: "juedou" },
		viewAsFilter(player) {
			return player.countCards("h", card => get.color(card, player) && get.color(card, player) != player.storage.shuangxiong_color) > 0;
		},
		filterCard(card, player) {
			return get.color(card, player) && get.color(card, player) != player.storage.shuangxiong_color;
		},
		position: "h",
	},
	shuangxiong_gain: {
		aiShowTag: "defense",
		sourceSkill: "shuangxiong",
		trigger: { player: "damageEnd" },
		usable: 1,
		filter(event, player) {
			if (get.name(event.card) != "juedou") {
				return false;
			}
			const useEvent = event.getParent("useCard");
			return !!(useEvent && useEvent.card && useEvent.card.name == "juedou" && (useEvent.player == player || useEvent.target == player) && ((useEvent.playerCards && useEvent.playerCards.length) || (useEvent.targetCards && useEvent.targetCards.length)));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("shuangxiong_gain")).forResult();
		},
		async content(event, trigger, player) {
			const useEvent = trigger.getParent("useCard");
			if (!useEvent) {
				return;
			}
			const cards = ((player == useEvent.player ? useEvent.targetCards : useEvent.playerCards) || []).filter(card => get.name(card) == "sha" && get.position(card) == "d");
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
	},

	// ============ 董卓（dongzhuo） ============
	// 酒池：你可以将一张♠牌当【酒】使用。
	jiuchi: {
		aiShowTag: "support",
		audio: 2,
		enable: "chooseToUse",
		viewAsFilter(player) {
			return player.hasCards("he", { suit: "spade" });
		},
		filterCard(card, player) {
			return get.suit(card, player) == "spade";
		},
		position: "he",
		viewAs: { name: "jiu" },
		prompt: "将一张♠牌当【酒】使用",
		check(card) {
			return 4 - get.value(card);
		},
	},
	// 横征：摸牌阶段开始时，若你没有手牌、体力值为1或全场唯一最少，你可以放弃摸牌，改为从每名
	// 其他角色的区域内获得一张牌。
	hengzheng: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return !player.countCards("h") || player.hp == 1 || player.isMinHp(true);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("hengzheng")).forResult();
		},
		async content(event, trigger, player) {
			trigger.num = 0;
			trigger.numFixed = true;
			const targets = game.filterPlayer(current => current != player);
			for (const target of targets) {
				if (!target.isIn() || !target.countCards("he")) {
					continue;
				}
				await player.gainPlayerCard(target, "he");
			}
		},
	},
	// 暴凌：限定技，出牌阶段，你可以增加3点体力上限并回复3点体力。
	// （原效果的"移除副将"机制因本项目无副将机制而略去）
	baoling: {
		aiShowTag: "recover",
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		filter(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.maxHp += 3;
			await player.recover(3);
		},
	},
	// 崩坏：锁定技，结束阶段，若你不是体力值最小的角色，你选择一项：1.失去1点体力；2.减1点体力
	// 上限。
	benghuai: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			return !player.isMinHp();
		},
		async content(event, trigger, player) {
			const result = await player.chooseControl(["失去1点体力", "减1点体力上限"]).set("prompt", get.prompt2("benghuai")).forResult();
			if (result.control == "失去1点体力") {
				await player.loseHp();
			} else {
				await player.loseMaxHp();
			}
		},
	},

	// ============ 贾诩（jiaxu） ============
	// 完杀：锁定技，你的回合内，除与你势力相同的角色外，不处于濒死状态的角色不能使用【桃】。
	wansha: {
		audio: 2,
		locked: true,
		global: "wansha_block",
	},
	wansha_block: {
		charlotte: true,
		mod: {
			cardEnabled(card, player) {
				if (card.name == "tao" && _status.currentPhase?.isIn() && _status.currentPhase.hasSkill("wansha") && !player.isFriendOf(_status.currentPhase) && !player.isDying()) {
					return false;
				}
			},
			cardSavable(card, player) {
				if (card.name == "tao" && _status.currentPhase?.isIn() && _status.currentPhase.hasSkill("wansha") && !player.isFriendOf(_status.currentPhase) && !player.isDying()) {
					return false;
				}
			},
		},
	},
	// 乱武：限定技，出牌阶段，你可以令所有其他角色对距离其最近的另一名角色使用一张【杀】，否则
	// 其失去1点体力。
	luanwu: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		filter(event, player) {
			return game.countPlayer() > 1;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const targets = game.filterPlayer(current => current != player);
			for (const current of targets) {
				if (!current.isIn()) {
					continue;
				}
				const others = game.filterPlayer(other => other != current);
				if (!others.length) {
					continue;
				}
				others.sort((a, b) => get.distance(current, a) - get.distance(current, b));
				const nearest = others[0];
				const card = { name: "sha", isCard: true };
				const result = await current.chooseBool(`乱武：是否对${get.translation(nearest)}使用一张【杀】？`).forResult();
				if (result.bool && current.isIn() && nearest.isIn() && current.canUse(card, nearest)) {
					await current.useCard(card, nearest);
				} else if (current.isIn()) {
					await current.loseHp();
				}
			}
		},
	},
	// 帷幕：锁定技，当你成为黑色锦囊牌的目标时，取消之。你的回合内，当你第一次受到伤害时，防止
	// 此伤害。
	weimu: {
		audio: 2,
		group: ["weimu_block", "weimu_dodge"],
	},
	weimu_block: {
		sourceSkill: "weimu",
		charlotte: true,
		mod: {
			targetEnabled(card) {
				if (get.type(card) == "trick" && get.color(card) == "black") {
					return false;
				}
			},
		},
	},
	weimu_dodge: {
		sourceSkill: "weimu",
		charlotte: true,
		trigger: { player: "damageBegin1" },
		forced: true,
		popup: false,
		usable: 1,
		filter(event, player) {
			return _status.currentPhase == player;
		},
		content(event, trigger, player) {
			trigger.num = 0;
		},
	},


	// ============ 庞德（pangde） ============
	// 马术：锁定技，你计算与其他角色的距离-1。（与官方版一致，直接复用标准包里的定义，不在此重写）
	// 鞭出：当你使用【杀】指定目标后，你可以弃置该角色的一张牌，若弃置的牌为装备牌，其本回合不能使用【闪】。
	bianchu: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "useCardToTargeted" },
		filter(event, player) {
			return event.card.name == "sha" && event.target.isIn() && event.target.countDiscardableCards(player, "he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("bianchu", trigger.target)).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			if (!target.isIn()) {
				return;
			}
			const result = await player.discardPlayerCard(target, "he", true).forResult();
			const cards = result && result.cards;
			if (cards && cards.length && cards.some(card => get.type(card, target) == "equip")) {
				target.addTempSkill("bianchu_noshan", "phaseAfter");
			}
		},
	},
	bianchu_noshan: {
		charlotte: true,
		mod: {
			cardEnabled2(card, player) {
				if (card.name == "shan") {
					return false;
				}
			},
		},
	},

	// ============ 左慈（zuoci） ============
	// 役鬼：当你首次明置此武将牌后，你获得两枚"魂"标记；出牌阶段限一次，你可以移去一枚"魂"标记，
	// 视为对与你势力相同或未定势力的一名角色使用一张【桃】。（原版可对任意基本/普通锦囊牌，简化为【桃】）
	yigui: {
		audio: 2,
		group: ["yigui_get", "yigui_use"],
	},
	yigui_get: {
		sourceSkill: "yigui",
		trigger: { player: "showCharacterAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!(event.toShow && event.toShow.includes("zuoci")) && player.storage.yigui_hun == null;
		},
		content(event, trigger, player) {
			player.storage.yigui_hun = 2;
		},
	},
	yigui_use: {
		aiShowTag: "support",
		sourceSkill: "yigui",
		enable: "phaseUse",
		filter(event, player) {
			return (player.storage.yigui_hun || 0) > 0 && !player.storage.yigui_used;
		},
		filterTarget(card, player, target) {
			return target.isFriendOf(player) || target.identity == "unknown";
		},
		selectTarget: 1,
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.storage.yigui_hun--;
			player.storage.yigui_used = true;
			player.addTempSkill("yigui_reset", "phaseAfter");
			const card = { name: "tao", isCard: true };
			if (target.isIn() && player.canUse(card, target, false)) {
				await player.useCard(card, target, false);
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					if (target.hp < target.maxHp) {
						return 1;
					}
					return 0;
				},
			},
		},
	},
	yigui_reset: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.yigui_used = false;
		},
	},
	// 汲魂：当你受到伤害后，或与你势力相同的角色进入濒死状态被救回后，你可以获得一枚"魂"标记。
	jihun: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd", global: "dyingAfter" },
		filter(event, player, name) {
			if (name == "dyingAfter") {
				return event.player != player && event.player.isIn() && event.player.hp > 0 && event.player.isFriendOf(player);
			}
			return true;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("jihun")).forResult();
		},
		async content(event, trigger, player) {
			player.storage.yigui_hun = (player.storage.yigui_hun || 0) + 1;
			game.log(player, "获得了一枚", "#y“魂”", "标记");
		},
	},

	// ============ 张角（zhangjiao） ============
	// 雷击：当你使用或打出【闪】时，你可以令一名其他角色判定：若为♠，你对其造成2点雷电伤害；
	// 若为♣，你回复1点体力，并对其造成1点雷电伤害。
	leiji: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: ["useCard", "respond"] },
		filter(event, player) {
			return !!event.card && event.card.name == "shan" && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("leiji"), (card, player, target) => target != player, true).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.isIn()) {
				return;
			}
			const result = await target.judge().forResult();
			const suit = result && result.suit;
			if (suit == "spade") {
				await target.damage(2, "thunder");
			} else if (suit == "club") {
				await player.recover();
				await target.damage(1, "thunder");
			}
		},
	},
	// 鬼道：当一名角色的判定牌生效前，你可以打出一张黑色牌替换之（你获得原判定牌）。
	guidao: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		trigger: { global: "judge" },
		filter(event, player) {
			return !!(event.player && event.player.judging && event.player.judging.length) && player.countCards("h", card => get.color(card, player) == "black") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("guidao", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const cardResult = await player
				.chooseCard("h", true, "鬼道：选择要打出的黑色牌", card => get.color(card, player) == "black")
				.forResult();
			if (!cardResult.bool || !cardResult.cards || !cardResult.cards.length) {
				return;
			}
			const next = player.respond(cardResult.cards);
			await next;
			if (next.cards && next.cards.length) {
				const oldCard = trigger.player.judging[0];
				await player.gain(oldCard, "gain2");
				trigger.player.judging[0] = next.cards[0];
				trigger.orderingCards.addArray(next.cards);
				game.log(trigger.player, "的判定牌被替换为", next.cards);
			}
		},
	},
	// 黄天：锁定技，当【闪电】进入弃牌堆时，你获得之；当与你势力相同的角色使用【闪电】时，
	// 你可以视为发动一次"雷击"。
	huangtian: {
		audio: 2,
		group: ["huangtian_gain", "huangtian_leiji"],
	},
	huangtian_gain: {
		sourceSkill: "huangtian",
		trigger: { global: ["loseAfter", "loseAsyncAfter", "cardsDiscardAfter"] },
		forced: true,
		filter(event, player) {
			const cards = (event.cards || []).filterInD("d");
			return cards.some(card => get.name(card) == "shandian");
		},
		async content(event, trigger, player) {
			const cards = (trigger.cards || []).filterInD("d").filter(card => get.name(card) == "shandian");
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
	},
	huangtian_leiji: {
		aiShowTag: "response",
		sourceSkill: "huangtian",
		trigger: { global: "useCard" },
		filter(event, player) {
			return (
				!!event.card &&
				event.card.name == "shandian" &&
				event.player != player &&
				event.player.isFriendOf(player) &&
				game.hasPlayer(current => current != event.player)
			);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("huangtian_leiji", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const targetResult = await player.chooseTarget(get.prompt2("leiji"), (card, player, target) => target != player, true).forResult();
			const target = targetResult.targets && targetResult.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			const result = await target.judge().forResult();
			const suit = result && result.suit;
			if (suit == "spade") {
				await target.damage(2, "thunder");
			} else if (suit == "club") {
				await player.recover();
				await target.damage(1, "thunder");
			}
		},
	},

	// ============ 于吉（yuji） ============
	// 千幻：当与你势力相同的一名角色受到伤害后，你可以展示牌堆顶一张牌，将其作为"千幻"置于你的武将牌上
	// （至多四张）；当一名与你势力相同的角色成为基本牌或普通锦囊牌的唯一目标时，你可以移去一张"千幻"：
	// 若其花色与此牌相同，取消此牌对该角色的效果，否则你弃置一张与此牌颜色相同的手牌，然后取消之。
	qianhuan: {
		audio: 2,
		group: ["qianhuan_gain", "qianhuan_use"],
	},
	qianhuan_gain: {
		aiShowTag: "support",
		sourceSkill: "qianhuan",
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return event.player && event.player.isFriendOf(player) && (player.storage.qianhuan_cards || []).length < 4;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("qianhuan_gain", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const cards = get.cards(1);
			if (!cards || !cards.length) {
				return;
			}
			const card = cards[0];
			await player.showCards([card], `${get.translation(player)}发动了【千幻】`);
			const list = player.storage.qianhuan_cards || [];
			list.push(card);
			player.storage.qianhuan_cards = list;
		},
	},
	qianhuan_use: {
		aiShowTag: "response",
		aiShowCost: true,
		sourceSkill: "qianhuan",
		trigger: { global: "useCardToBefore" },
		filter(event, player) {
			if (!["basic", "trick"].includes(get.type(event.card))) {
				return false;
			}
			if (!event.targets || event.targets.length != 1) {
				return false;
			}
			if (event.targets[0].isEnemyOf(player)) {
				return false;
			}
			return (player.storage.qianhuan_cards || []).length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("qianhuan_use", trigger.targets[0])).forResult();
		},
		async content(event, trigger, player) {
			const list = player.storage.qianhuan_cards || [];
			const card = list.shift();
			if (!card) {
				return;
			}
			player.storage.qianhuan_cards = list;
			game.cardsDiscard([card]);
			if (get.suit(card) == get.suit(trigger.card)) {
				trigger.cancel();
			} else {
				const color = get.color(card);
				if (player.countCards("h", c => get.color(c, player) == color)) {
					await player.chooseToDiscard("h", 1, true, c => get.color(c, player) == color).forResult();
				}
				trigger.cancel();
			}
		},
	},

	// ============ 蔡文姬（caiwenji） ============
	// 悲歌：当一名角色受到【杀】造成的伤害后，若你有牌，你可以令其判定，然后弃置一张牌，根据结果执行
	// 对应效果：♥其回复1点体力；♦其摸两张牌；♣伤害来源弃置两张牌；♠伤害来源翻面。
	beige: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return !!event.card && event.card.name == "sha" && player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("beige", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (!target.isIn()) {
				return;
			}
			const result = await target.judge().forResult();
			const suit = result && result.suit;
			if (player.countCards("he")) {
				await player.chooseToDiscard("he", 1, true).forResult();
			}
			const source = trigger.source;
			if (suit == "heart") {
				await target.recover();
			} else if (suit == "diamond") {
				await target.draw(2);
			} else if (suit == "club") {
				if (source && source.isIn() && source.countCards("he")) {
					await source.chooseToDiscard("he", 2, true).forResult();
				}
			} else if (suit == "spade") {
				if (source && source.isIn()) {
					await source.turnOver();
				}
			}
		},
	},
	// 断肠：锁定技，当你死亡时，你令杀死你的角色失去其当前的所有技能。
	duanchang: {
		audio: 2,
		trigger: { player: "die" },
		forced: true,
		forceDie: true,
		filter(event, player) {
			return !!(event.source && event.source.isIn());
		},
		content(event, trigger, player) {
			const target = trigger.source;
			if (!target || !target.isIn()) {
				return;
			}
			const skills = target.getSkills(null, false, false);
			if (skills.length) {
				target.removeSkills(skills);
			}
		},
	},

	// ============ 马腾（mateng） ============
	// 马术：锁定技，你计算与其他角色的距离-1。（与官方版一致，直接复用标准包里的定义，不在此重写）
	// 雄异：限定技，出牌阶段，你可以令与你势力相同的所有角色各摸三张牌。
	// （原版"若你不为大势力，你可以变更此将"涉及国战换将机制，本卡简化为单纯的限定技摸牌效果）
	xiongyi: {
		aiShowTag: "draw",
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "gold",
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(current => current.isFriendOf(player));
		},
		async content(event, trigger, player) {
			const allies = game.filterPlayer(current => current.isFriendOf(player));
			for (const ally of allies) {
				if (ally.isIn()) {
					await ally.draw(3);
				}
			}
		},
	},

	// ============ 孔融（kongrong） ============
	// 名士：锁定技，当你受到没有伤害来源的伤害时，防止之。
	// （原版另含"武将牌无法被暗置/移除"及"手牌被获得改为弃置"，涉及国战双将/明暗置机制，本卡简化省略）
	zymingshi: {
		audio: 2,
		trigger: { player: "damageBegin1" },
		forced: true,
		filter(event, player) {
			return !event.source;
		},
		content(event, trigger, player) {
			trigger.cancel();
		},
	},
	// 礼让：当你的牌因弃置而进入弃牌堆后，你可以将其中的一张牌交给其他角色。
	lirang: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (event.type != "discard" || event.getlx === false) {
				return false;
			}
			const cards = (event.cards || []).filterInD("d");
			return cards.length > 0 && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("lirang")).forResult();
		},
		async content(event, trigger, player) {
			const cards = (trigger.cards || []).filterInD("d");
			if (!cards.length) {
				return;
			}
			const cardResult = await player.chooseButton([get.prompt2("lirang"), cards], true).forResult();
			const card = cardResult.links && cardResult.links[0];
			if (!card) {
				return;
			}
			const targetResult = await player.chooseTarget(true, (card, plyr, target) => target != player).forResult();
			const target = targetResult.targets && targetResult.targets[0];
			if (target && get.position(card) == "d") {
				await target.gain(card, "give");
			}
		},
	},

	// ============ 纪灵（jiling） ============
	// 双刃：出牌阶段开始时，你可以与一名角色拼点。若你赢，你视为对其或与其势力相同的一名角色使用一张
	// 不计入次数的【杀】；若你没赢，你本回合不能再使用【杀】。锁定技，你使用【杀】对目标角色造成伤害
	// 后，你可以弃置一张手牌，然后对该角色距离1的另一名角色造成1点伤害。
	shuangren: {
		audio: 2,
		group: ["shuangren_pindian", "shuangren_hit"],
	},
	shuangren_pindian: {
		aiShowTag: "control",
		sourceSkill: "shuangren",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player) && !player.hasSkill("shuangren_disable");
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("shuangren"), (card, player, target) => target != player, true).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.isIn()) {
				return;
			}
			const result = await player.chooseToCompare(target).forResult();
			if (result.tie) {
				return;
			}
			if (result.bool) {
				const candidates = [target].concat(game.filterPlayer(current => current != player && current != target && current.isFriendOf(target)));
				const pickResult = await player
					.chooseTarget(get.prompt2("shuangren"), (card, plyr, tgt) => candidates.includes(tgt), true)
					.forResult();
				const finalTarget = pickResult.targets && pickResult.targets[0];
				if (finalTarget && finalTarget.isIn()) {
					const card = { name: "sha", isCard: true };
					if (player.canUse(card, finalTarget, false)) {
						await player.useCard(card, finalTarget, false);
					}
				}
			} else {
				player.addTempSkill("shuangren_disable", "phaseAfter");
			}
		},
	},
	shuangren_disable: {
		charlotte: true,
		mod: {
			cardEnabled2(card, player) {
				if (card.name == "sha") {
					return false;
				}
			},
		},
	},
	shuangren_hit: {
		aiShowTag: "support",
		aiShowCost: true,
		sourceSkill: "shuangren",
		trigger: { source: "damageSource" },
		filter(event, player) {
			return (
				!!event.card &&
				event.card.name == "sha" &&
				event.player &&
				event.player.isIn() &&
				player.countCards("h") > 0 &&
				game.hasPlayer(current => current != event.player && get.distance(event.player, current) == 1)
			);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("shuangren", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			if (player.countCards("h")) {
				await player.chooseToDiscard("h", 1, true).forResult();
			}
			const target = trigger.player;
			if (!target.isIn()) {
				return;
			}
			const candidates = game.filterPlayer(current => current != target && get.distance(target, current) == 1);
			if (!candidates.length) {
				return;
			}
			const targetResult = await player.chooseTarget(true, (card, plyr, tgt) => candidates.includes(tgt)).forResult();
			const finalTarget = targetResult.targets && targetResult.targets[0];
			if (finalTarget && finalTarget.isIn()) {
				await finalTarget.damage(1);
			}
		},
	},

	// ============ 田丰（tianfeng） ============
	// 死谏：当你失去最后一张手牌后，或你的体力值变为1时，你可以弃置一名其他角色的一张牌。
	sijian: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: ["loseAfter", "loseAsyncAfter", "loseHpAfter", "damageAfter"] },
		filter(event, player, name) {
			if (name == "loseHpAfter" || name == "damageAfter") {
				return player.hp == 1;
			}
			return event.player == player && player.countCards("h") == 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("sijian")).forResult();
		},
		async content(event, trigger, player) {
			if (!game.hasPlayer(current => current != player && current.countDiscardableCards(player, "he") > 0)) {
				return;
			}
			const targetResult = await player
				.chooseTarget(get.prompt2("sijian"), (card, plyr, target) => target != player && target.countDiscardableCards(player, "he") > 0, true)
				.forResult();
			const target = targetResult.targets && targetResult.targets[0];
			if (target) {
				await player.discardPlayerCard(target, "he", true);
			}
		},
	},
	// 随势：锁定技，当其他角色受到伤害进入濒死状态时，若伤害来源与你势力相同，你摸一张牌；当其他角色
	// 死亡时，若其与你势力相同，你选择失去1点体力或弃置所有手牌。
	gzsuishi: {
		audio: 2,
		trigger: { global: ["enterDying", "die"] },
		forced: true,
		filter(event, player) {
			if (!event.player || event.player == player) {
				return false;
			}
			if (event.triggername == "enterDying") {
				return !!(event.source && event.source.isFriendOf(player));
			}
			return event.player.isFriendOf(player);
		},
		async content(event, trigger, player) {
			if (event.triggername == "enterDying") {
				await player.draw();
			} else {
				const result = await player.chooseControl(["失去1点体力", "弃置所有手牌"]).set("prompt", get.prompt2("gzsuishi")).forResult();
				if (result.control == "失去1点体力") {
					await player.loseHp();
				} else if (player.countCards("h")) {
					await player.discard(player.getCards("h"));
				}
			}
		},
	},

	// ============ 潘凤（panfeng） ============
	// 狂斧：与你势力相同角色的出牌阶段限一次，其可以令你摸两张牌，然后你视为对其指定的一名角色使用
	// 一张【决斗】。若你因此受到伤害，你弃置两张牌，且此技能本轮失效。
	kuangfu: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return event.player != player && event.player.isIn() && event.player.isFriendOf(player) && !player.hasSkill("kuangfu_disable");
		},
		async cost(event, trigger, player) {
			event.result = await trigger.player.chooseBool(get.prompt2("kuangfu", player)).forResult();
		},
		async content(event, trigger, player) {
			const ally = trigger.player;
			await player.draw(2);
			if (!game.hasPlayer(current => current != player)) {
				return;
			}
			const targetResult = await ally.chooseTarget(get.prompt2("kuangfu"), (card, plyr, target) => target != player, true).forResult();
			const target = targetResult.targets && targetResult.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			const hpBefore = player.hp;
			const card = { name: "juedou", isCard: true };
			if (player.canUse(card, target, false)) {
				await player.useCard(card, target, false);
			}
			if (player.isIn() && player.hp < hpBefore) {
				if (player.countCards("he")) {
					await player.chooseToDiscard("he", 2, true).forResult();
				}
				player.addTempSkill("kuangfu_disable", "phaseAfter");
			}
		},
	},
	kuangfu_disable: {
		charlotte: true,
	},


	// ============ 邹氏（re_zoushi） ============
	// 祸水：锁定技，你的回合内，与你势力不同的角色不能使用/打出【闪】响应你的牌。
	// （原版还包含"其他角色不能明置武将牌"及"暗置武将牌"的国战双将机制，本项目不使用主副将机制，故省略并将"倾城"一并改写。）
	rehuoshui: {
		audio: 2,
		ai: {
			norespond: true,
			skillTagFilter(player, tag, arg) {
				if (tag != "norespond") {
					return;
				}
				const card = arg && arg[0];
				const responder = arg && arg[1];
				if (!card || get.name(card) != "shan") {
					return false;
				}
				if (!player.isPhaseUsing()) {
					return false;
				}
				if (!responder || responder.isFriendOf(player)) {
					return false;
				}
				return true;
			},
		},
	},
	// 倾城：出牌阶段，你可以弃置一张黑色牌，令一名其他角色本回合不能使用/打出【闪】；
	// 若弃置的是装备牌，可以此法再选择一名角色。
	reqingcheng: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("h", card => get.color(card) == "black") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("h", true, card => get.color(card) == "black")
				.set("prompt2", get.prompt2("reqingcheng"))
				.forResult();
		},
		async content(event, trigger, player) {
			const { result } = event;
			if (!result || !result.bool || !result.cards || !result.cards.length) {
				return;
			}
			const isEquip = result.cards.some(card => get.type(card) == "equip");
			let times = isEquip ? 2 : 1;
			while (times-- > 0) {
				if (!game.hasPlayer(current => current != player && !current.hasSkill("reqingcheng_mark"))) {
					break;
				}
				const targetResult = await player
					.chooseTarget(get.prompt2("reqingcheng"), (card, player, target) => target != player && !target.hasSkill("reqingcheng_mark"))
					.forResult();
				if (!targetResult.bool || !targetResult.targets || !targetResult.targets.length) {
					break;
				}
				targetResult.targets[0].addTempSkill("reqingcheng_mark", "phaseAfter");
			}
		},
	},
	reqingcheng_mark: {
		charlotte: true,
		mod: {
			cardEnabled2(card) {
				if (get.name(card) == "shan") {
					return false;
				}
			},
		},
	},

	// ============ 华雄（huaxiong） ============
	// 耀武：锁定技，你受到【杀】的伤害时，红色则伤害来源摸牌，否则你自己摸牌。
	yaowu: {
		audio: 2,
		trigger: { player: "damageEnd" },
		forced: true,
		filter(event, player) {
			return !!event.card && get.name(event.card) == "sha";
		},
		async content(event, trigger, player) {
			if (get.color(trigger.card) == "red") {
				if (trigger.source && trigger.source.isIn()) {
					await trigger.source.draw();
				}
			} else {
				await player.draw();
			}
		},
	},
	// 扬威：限定技，游戏开始时可摸两张牌、体力上限+2并回复2点体力，然后其他角色依次可对你使用一张无距离限制的【杀】。
	// （原版为"首次明置此武将牌时"触发，本项目不使用武将牌明置/暗置机制，改为游戏开始时的一次性效果。）
	hwyangwei: {
		aiShowTag: "response",
		limited: true,
		audio: 2,
		trigger: { global: "gameStart" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("hwyangwei")).forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.draw(2);
			await player.gainMaxHp(2);
			await player.recover(2);
			for (const other of game.players.slice()) {
				if (!player.isIn() || other == player || !other.isIn()) {
					continue;
				}
				if (!other.countCards("h", card => get.name(card) == "sha")) {
					continue;
				}
				const result = await other
					.chooseCard("h", card => get.name(card) == "sha", `扬威：是否对${get.translation(player)}使用一张无距离限制的【杀】？`)
					.forResult();
				if (!result.bool || !result.cards?.length) {
					continue;
				}
				await other.useCard(result.cards[0], player, false);
			}
		},
	},

	// ============ 何太后（hetaihou） ============
	// 鸩毒：一名角色出牌阶段开始时，你可以弃置一张手牌，令其视为使用了一张【酒】效果（下一次【杀】伤害+1）；
	// 若目标不为你，你对其造成1点伤害。
	zhendu: {
		aiShowTag: "offense",
		aiShowCost: true,
		audio: 2,
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseToDiscard("h", true).set("prompt2", get.prompt2("zhendu")).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (!target || !target.isIn()) {
				return;
			}
			if (target != player) {
				await target.damage(1, player);
			}
			if (target.isIn()) {
				target.addTempSkill("zhendu_buff", { global: "roundStart" });
			}
		},
	},
	zhendu_buff: {
		charlotte: true,
		trigger: { player: "damageBegin1" },
		filter(event, player) {
			return !!event.card && get.name(event.card) == "sha";
		},
		forced: true,
		popup: false,
		content(event, trigger, player) {
			trigger.num++;
			player.removeSkill("zhendu_buff");
		},
	},
	// 戚乱：每当一名角色回合结束时，你可以摸X张牌（X为此回合内死亡角色数），若你于此回合内杀死过角色则额外摸两张。
	qiluan: {
		audio: 2,
		group: ["qiluan_track", "qiluan_draw"],
	},
	qiluan_track: {
		sourceSkill: "qiluan",
		charlotte: true,
		trigger: { global: "dieAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.qiluan_deaths = (player.storage.qiluan_deaths || 0) + 1;
			if (trigger.source == player) {
				player.storage.qiluan_killed = true;
			}
		},
	},
	qiluan_draw: {
		aiShowTag: "draw",
		sourceSkill: "qiluan",
		trigger: { global: "phaseAfter" },
		filter(event, player) {
			return (player.storage.qiluan_deaths || 0) > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("qiluan")).forResult();
		},
		async content(event, trigger, player) {
			let num = player.storage.qiluan_deaths || 0;
			if (player.storage.qiluan_killed) {
				num += 2;
			}
			player.storage.qiluan_deaths = 0;
			player.storage.qiluan_killed = false;
			if (num > 0) {
				await player.draw(num);
			}
		},
	},

	// ============ 袁术（yuanshu） ============
	// 偽帝：出牌阶段开始时，你可以令与你势力相同的其他角色各交给你任意张牌。
	weidi: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.isFriendOf(player) && current.countCards("he") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("weidi")).forResult();
		},
		async content(event, trigger, player) {
			const targets = game.filterPlayer(current => current != player && current.isFriendOf(player));
			for (const target of targets) {
				if (!target.isIn() || !target.countCards("he")) {
					continue;
				}
				const result = await target.chooseCard("he", true, get.prompt2("weidi")).forResult();
				if (result.bool && result.cards && result.cards.length) {
					await target.give(result.cards, player);
				}
			}
		},
	},
	// 庸肆：锁定技，场上没有【玉玺】时视为你装备着【玉玺】；其他势力角色装备【玉玺】时你选择一项：失去1点体力/弃两张牌。
	yongsi: {
		audio: 2,
		init(player, skill) {
			player.addExtraEquip(skill, "yuxi", true, () => lib.card.yuxi && !game.hasPlayer(current => current.getEquip("yuxi")));
		},
		onremove(player, skill) {
			player.removeExtraEquip(skill);
		},
		group: ["yongsi_punish"],
	},
	yongsi_punish: {
		sourceSkill: "yongsi",
		charlotte: true,
		trigger: { global: "equipAfter" },
		filter(event, player) {
			return !!event.player && event.player != player && event.player.isEnemyOf(player) && !!event.card && get.name(event.card) == "yuxi";
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const result = await player.chooseControl(["失去1点体力", "弃置两张牌"]).set("prompt", get.prompt2("yongsi")).forResult();
			if (result.control == "失去1点体力") {
				await player.loseHp();
			} else if (player.countCards("he")) {
				await player.chooseToDiscard("he", 2, true).forResult();
			}
		},
	},

	// ============ 李傕&郭汜（liqueguosi） ============
	// 凶算：出牌阶段限一次，弃一张手牌并对一名同势力角色造成1点伤害，其摸三张牌；
	// 若其有已发动的限定技，可选择其一，于其下个回合结束后重置。
	xiongsuan: {
		aiShowTag: "offense",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(current => current.isFriendOf(player));
		},
		async content(event, trigger, player) {
			if (!player.countCards("h")) {
				event.finish();
				return;
			}
			const discardResult = await player.chooseToDiscard("h", true).set("prompt2", get.prompt2("xiongsuan")).forResult();
			if (!discardResult.bool) {
				event.finish();
				return;
			}
			const targetResult = await player
				.chooseTarget(get.prompt2("xiongsuan"), (card, player, target) => target.isFriendOf(player))
				.forResult();
			if (!targetResult.bool || !targetResult.targets || !targetResult.targets.length) {
				event.finish();
				return;
			}
			const target = targetResult.targets[0];
			if (!target.isIn()) {
				return;
			}
			await target.damage(1, player);
			if (!target.isIn()) {
				return;
			}
			await target.draw(3);
			if (target.isIn() && target.awakenedSkills && target.awakenedSkills.length) {
				const options = target.awakenedSkills.slice();
				const labels = options.map(skill => get.translation(skill));
				const choice = await player
					.chooseControl(labels.concat("不重置"))
					.set("prompt", get.prompt2("xiongsuan") + "：是否选择一个限定技，于其下个回合结束后重置？")
					.forResult();
				const index = labels.indexOf(choice.control);
				if (index > -1) {
					const skill = options[index];
					target.storage.xiongsuan_reset = (target.storage.xiongsuan_reset || []).concat(skill);
					target.addTempSkill("xiongsuan_resetter", { player: "phaseAfter" });
				}
			}
		},
	},
	xiongsuan_resetter: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			const skills = player.storage.xiongsuan_reset || [];
			skills.forEach(skill => player.restoreSkill(skill));
			delete player.storage.xiongsuan_reset;
		},
	},

	// ============ 张绣（scl_zhangxiu） ============
	// 附敌：受到伤害后，可交给伤害来源一张手牌，然后对与其同势力、体力值最大且不小于你的一名角色造成1点伤害。
	sclfudi: {
		aiShowTag: "defense",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			if (!event.source || !event.source.isIn() || event.source == player || !player.countCards("h")) {
				return false;
			}
			return game.hasPlayer(current => current.isFriendOf(event.source) && current.hp >= player.hp);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("sclfudi")).forResult();
		},
		async content(event, trigger, player) {
			const source = trigger.source;
			if (!source || !source.isIn()) {
				return;
			}
			const cardResult = await player.chooseCard("h", true, get.prompt2("sclfudi")).forResult();
			if (!cardResult.bool || !cardResult.cards || !cardResult.cards.length) {
				return;
			}
			await player.give(cardResult.cards[0], source);
			if (!source.isIn()) {
				return;
			}
			const candidates = game.filterPlayer(current => current.isFriendOf(source) && current.hp >= player.hp);
			if (!candidates.length) {
				return;
			}
			const maxHp = Math.max(...candidates.map(current => current.hp));
			const targets = candidates.filter(current => current.hp == maxHp);
			const target = targets[Math.floor(Math.random() * targets.length)];
			if (target && target.isIn()) {
				await target.damage(1, player);
			}
		},
	},
	// 从谏：锁定技，你于回合外造成的伤害+1，你于回合内受到的伤害+1。
	sclcongjian: {
		audio: 2,
		trigger: { global: "damageBegin1" },
		forced: true,
		popup: false,
		filter(event, player) {
			if (event.player == player && player.isPhaseUsing()) {
				return true;
			}
			if (event.source == player && !player.isPhaseUsing()) {
				return true;
			}
			return false;
		},
		content(event, trigger, player) {
			trigger.num++;
		},
	},

	// ============ 张任（zhangren） ============
	// 穿心：出牌阶段，你使用【杀】/【决斗】对势力不同的角色造成伤害时，可防止此伤害，然后其选择一项：
	// 弃装备区所有牌并失1点体力；或你令其摸两张牌。（"移除副将"改写为"摸两张牌"，理由见translate.js）
	chuanxin: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageBegin1" },
		filter(event, player) {
			if (!player.isPhaseUsing()) {
				return false;
			}
			if (!event.card || !["sha", "juedou"].includes(get.name(event.card))) {
				return false;
			}
			if (!event.player || event.player == player || event.player.isFriendOf(player)) {
				return false;
			}
			return true;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("chuanxin")).forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			const target = trigger.player;
			if (!target || !target.isIn()) {
				return;
			}
			const choice = await target.chooseControl(["弃装备失体力", "对方摸两张牌"]).set("prompt", get.prompt2("chuanxin")).forResult();
			if (choice.control == "弃装备失体力") {
				if (target.countCards("e")) {
					await target.discard(target.getCards("e"));
				}
				if (target.isIn()) {
					await target.loseHp();
				}
			} else if (player.isIn()) {
				await player.draw(2);
			}
		},
	},
	// 锋矢：出牌阶段限一次，你使用的【杀】指定唯一目标后，可摸一张牌，然后令该角色弃置装备区里的一张牌。
	zfengshi: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "useCardToTargeted" },
		usable: 1,
		filter(event, player) {
			return get.name(event.card) == "sha" && event.targets && event.targets.length == 1 && event.targets[0].isIn();
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zfengshi")).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.targets[0];
			await player.draw();
			if (target.isIn() && target.countCards("e")) {
				await target.chooseToDiscard("e", 1, true).forResult();
			}
		},
	},

	// ============ 何进（jsrg_hejin） ============
	// 诏兵：弃牌阶段开始时，弃置任意张手牌，令等量其他角色各选择一项：交出一张【杀】/失去1点体力。
	jsrgzhaobing: {
		aiShowTag: "offense",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseDiscardBegin" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("h", true, [1, Infinity])
				.set("prompt2", get.prompt2("jsrgzhaobing"))
				.forResult();
		},
		async content(event, trigger, player) {
			const { result } = event;
			const num = result && result.cards ? result.cards.length : 0;
			if (!num) {
				return;
			}
			const targets = game.filterPlayer(current => current != player).randomSort().slice(0, num);
			for (const target of targets) {
				if (!target.isIn()) {
					continue;
				}
				const shaCards = target.getCards("h", card => get.name(card) == "sha");
				const control = shaCards.length
					? await target.chooseControl(["交出【杀】", "失去1点体力"]).set("prompt", get.prompt2("jsrgzhaobing")).forResult()
					: { control: "失去1点体力" };
				if (control.control == "交出【杀】" && shaCards.length) {
					await target.showCards([shaCards[0]], get.prompt2("jsrgzhaobing"));
					if (target.isIn()) {
						await target.give(shaCards[0], player);
					}
				} else if (target.isIn()) {
					await target.loseHp();
				}
			}
		},
	},
	// 延祸：锁定技，你死亡时，增加全局技能：使用【杀】造成的伤害基数+1。
	jsrgyanhuo: {
		audio: 2,
		trigger: { player: "dieAfter" },
		forced: true,
		content(event, trigger, player) {
			game.addGlobalSkill("jsrg_hejin_yanhuo_global");
		},
	},
	jsrg_hejin_yanhuo_global: {
		charlotte: true,
		trigger: { player: "useCard" },
		forced: true,
		filter(event, player) {
			return get.name(event.card) == "sha";
		},
		content(event, trigger, player) {
			trigger.baseDamage = (trigger.baseDamage || 1) + 1;
		},
	},

	// ============ 韩遂（re_hansui） ============
	// 逆乱：出牌阶段，可将一张黑色牌当【杀】使用。
	spniluan: {
		aiShowTag: "offense",
		audio: 2,
		enable: "chooseToUse",
		filterCard(card, player) {
			return get.color(card, player) == "black";
		},
		position: "he",
		viewAs: { name: "sha" },
		viewAsFilter(player) {
			return player.hasCards("he", { color: "black" });
		},
		prompt: "将一张黑色牌当【杀】使用",
		check(card) {
			return 5 - get.value(card);
		},
	},
	// 违忤：出牌阶段限一次，可将一张红色牌当无距离限制的【顺手牵羊】使用。
	spweiwu: {
		aiShowTag: "offense",
		audio: 2,
		enable: "chooseToUse",
		usable: 1,
		filterCard(card, player) {
			return get.color(card, player) == "red";
		},
		position: "he",
		viewAs: { name: "shunshou" },
		viewAsFilter(player) {
			return player.hasCards("he", { color: "red" });
		},
		prompt: "将一张红色牌当无距离限制的【顺手牵羊】使用",
		check(card) {
			return 5 - get.value(card);
		},
		mod: {
			targetInRange(card) {
				if (card.name == "shunshou") {
					return true;
				}
			},
		},
	},

	// ============ 高顺（gaoshun） ============
	// 迅析：其他角色于其回合外受到伤害后，可视为对其使用一张无距离和次数限制的【杀】。
	gsxunxi: {
		aiShowTag: "response",
		audio: 2,
		trigger: { global: "damageEnd" },
		filter(event, player) {
			if (!event.player || event.player == player || !event.player.isIn()) {
				return false;
			}
			if (event.player.isPhaseUsing()) {
				return false;
			}
			return player.canUse({ name: "sha", isCard: true }, event.player, false);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("gsxunxi")).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (target.isIn() && player.canUse({ name: "sha", isCard: true }, target, false)) {
				await player.useCard({ name: "sha", isCard: true }, target, false);
			}
		},
	},
	// 摄甲：锁定技，每回合限一次，受到【杀】的伤害-1；每回合限一次，你的【杀】对目标造成伤害后摸一张牌。
	gsshejia: {
		audio: 2,
		group: ["gsshejia_block", "gsshejia_gain", "gsshejia_reset"],
	},
	gsshejia_block: {
		sourceSkill: "gsshejia",
		charlotte: true,
		trigger: { player: "damageBegin1" },
		filter(event, player) {
			return get.name(event.card) == "sha" && !player.storage.gsshejia_block_used;
		},
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.gsshejia_block_used = true;
			trigger.num = Math.max(0, trigger.num - 1);
		},
	},
	gsshejia_gain: {
		sourceSkill: "gsshejia",
		charlotte: true,
		trigger: { source: "damageSource" },
		filter(event, player) {
			return get.name(event.card) == "sha" && !player.storage.gsshejia_gain_used;
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			player.storage.gsshejia_gain_used = true;
			await player.draw();
		},
	},
	gsshejia_reset: {
		sourceSkill: "gsshejia",
		charlotte: true,
		trigger: { global: "roundStart" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.gsshejia_block_used = false;
			player.storage.gsshejia_gain_used = false;
		},
	},
	// 禁酒：锁定技，其他角色不能于你的回合内使用【酒】。
	jinjiu: {
		audio: 2,
		trigger: { global: ["useCard", "respond"] },
		filter(event, player) {
			return event.player != player && get.name(event.card) == "jiu" && player.isPhaseUsing();
		},
		forced: true,
		popup: false,
		content(event, trigger, player) {
			trigger.cancel();
		},
	},


	// ============ 刘表（jsrg_liubiao） ============
	jsrgyansha: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("jsrgyansha"), (card, player, target) => target != player)
				.set("ai", target => get.attitude(player, target))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			const card = { name: "wugufengdeng", isCard: true };
			if (player.canUse(card, target, false)) {
				await player.useCard(card, target, false);
			}
			if (!target.isIn()) {
				return;
			}
			const others = game.filterPlayer(current => current != target);
			for (const other of others) {
				if (!target.isIn()) {
					break;
				}
				await other.chooseToUse({
					prompt: `宴殺：是否将一张装备牌当【杀】对${get.translation(target)}使用（无距离限制）？`,
					filterCard(card) {
						return get.type(card) == "equip";
					},
					viewAs: { name: "sha" },
					complexTarget: true,
					filterTarget(card, player, target2) {
						return target2 == target;
					},
				});
			}
		},
		ai: { expose: 0.2 },
	},
	gzzishou: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("gzzishou")).forResult();
		},
		async content(event, trigger, player) {
			const x = new Set(game.filterPlayer().map(current => current.group)).size || 1;
			await player.draw(x);
			player.storage.gzzishou_x = x;
			player.addTempSkill("gzzishou_buff", "phaseAfter");
		},
		ai: { order: 9, result: { player: 1 } },
	},
	gzzishou_buff: {
		charlotte: true,
		mod: {
			maxHandcard(player, num) {
				return num + (player.storage.gzzishou_x || 0);
			},
			targetInRange(card, player, target) {
				if (get.itemtype(card) == "card" && target != player) {
					return false;
				}
			},
		},
		onremove(player) {
			delete player.storage.gzzishou_x;
		},
	},

	// ============ 伏皇后（fuhuanghou） ============
	zhuikong: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return event.player != player && player.canCompare(event.player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zhuikong", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const result = await player.chooseToCompare(target).forResult();
			const winner = result.bool ? player : target;
			const opponentCard = result.bool ? result.card2 : result.card1;
			const winnerOwnCard = result.bool ? result.card1 : result.card2;
			const loser = result.bool ? target : player;
			if (opponentCard && winner.isIn()) {
				await winner.chooseToUse({
					prompt: `惴恐：是否使用${get.translation(loser)}的拼点牌？`,
					filterCard(card) {
						return card === opponentCard;
					},
				});
			}
			if (winnerOwnCard && loser.isIn()) {
				loser.storage.zhuikong_forbid = get.type(winnerOwnCard);
				loser.addTempSkill("zhuikong_forbid", "phaseAfter");
			}
		},
	},
	zhuikong_forbid: {
		charlotte: true,
		mod: {
			cardEnabled(card, player) {
				if (get.type(card) == player.storage.zhuikong_forbid) {
					return false;
				}
			},
		},
		onremove(player) {
			delete player.storage.zhuikong_forbid;
		},
	},
	qiuyuan: {
		aiShowTag: "support",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.card.name == "sha";
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("qiuyuan"), (card, player, target) => target != player && target != trigger.player)
				.forResult();
		},
		async content(event, trigger, player) {
			const helper = event.targets && event.targets[0];
			if (!helper || !helper.isIn()) {
				return;
			}
			const result = await helper
				.chooseControl("交给一张牌", "成为额外目标")
				.set("prompt", `求援：请为${get.translation(player)}选择一项`)
				.forResult();
			if (result.control == "交给一张牌") {
				await helper.chooseToGive(player, "he", true);
			} else if (trigger.targets && !trigger.targets.includes(helper)) {
				trigger.targets.push(helper);
			}
		},
	},

	// ============ 李儒（hb_liru） ============
	hb_liru_juece: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseEnd" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("hb_liru_juece"), (card, player, target) => {
					if (target == player) {
						return false;
					}
					const min = Math.min(...game.filterPlayer(current => current != player).map(current => current.countCards("h")));
					return target.countCards("h") == min;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			if (event.targets && event.targets.length) {
				await event.targets[0].damage(1);
			}
		},
	},
	hb_liru_mieji: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (_status.currentPhase != player || player.storage.hb_liru_mieji_active) {
				return false;
			}
			if (event.type != "discard" && event.type != "lose") {
				return false;
			}
			if (event.player == player) {
				return false;
			}
			const evt = event.getl && event.getl(event.player);
			return !!(evt && evt.hs && evt.hs.length);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("hb_liru_mieji", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (!target.isIn() || !target.countCards("h")) {
				return;
			}
			player.storage.hb_liru_mieji_active = true;
			await target.chooseToDiscard("h", true).forResult();
			player.storage.hb_liru_mieji_active = false;
		},
	},
	hb_liru_fencheng: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "fire",
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const start = event.target;
			if (!start || !start.isIn()) {
				return;
			}
			const idx = game.players.indexOf(start);
			const order = (idx >= 0 ? game.players.slice(idx).concat(game.players.slice(0, idx)) : game.players.slice()).filter(current => current != player);
			let lastDiscard = 0;
			for (const current of order) {
				if (!current.isIn()) {
					continue;
				}
				const need = lastDiscard + 1;
				const canDiscard = current.countCards("he") >= need;
				const result = await current
					.chooseControl(canDiscard ? ["弃牌", "受伤"] : ["受伤"])
					.set("prompt", `焚城：请选择弃置至少${get.cnNumber(need)}张牌，或受到李儒造成的2点火焰伤害`)
					.forResult();
				if (result.control == "弃牌") {
					const discardResult = await current
						.chooseToDiscard({
							position: "he",
							selectCard: [need, Math.max(need, current.countCards("he"))],
							forced: true,
							prompt: `焚城：弃置至少${get.cnNumber(need)}张牌`,
						})
						.forResult();
					lastDiscard = (discardResult.cards && discardResult.cards.length) || need;
				} else {
					await current.damage(2, "fire");
					lastDiscard = 0;
				}
			}
		},
	},

	// ============ 蔡夫人（caifuren） ============
	qieting: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			if (event.player == player) {
				return false;
			}
			return !event.player.getHistory("useCard", evt => evt.targets && evt.targets.some(target => target != event.player)).length;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const result = await player
				.chooseControl("获得装备", "摸一张牌")
				.set("prompt", get.prompt2("qieting", trigger.player))
				.forResult();
			if (result.control == "获得装备" && target.getEquips().length) {
				const cardResult = await player.choosePlayerCard(target, "e", true).forResult();
				if (cardResult.cards && cardResult.cards.length) {
					await player.gain(cardResult.cards, target, "give");
				}
			} else {
				await player.draw();
			}
		},
	},
	xianzhou: {
		aiShowTag: "recover",
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "gold",
		filterTarget(card, player, target) {
			return target != player;
		},
		filter(event, player) {
			return player.getEquips().length > 0;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const target = event.target;
			const cards = player.getEquips();
			if (!cards.length || !target.isIn()) {
				return;
			}
			const x = cards.length;
			await target.gain(cards, player, "give");
			const result = await target
				.chooseControl("回复体力", "造成伤害")
				.set("prompt", `献州：请选择令${get.translation(player)}回复${get.cnNumber(x)}点体力，或对你攻击范围内至多${get.cnNumber(x)}名角色各造成1点伤害`)
				.forResult();
			if (result.control == "回复体力") {
				if (player.isIn()) {
					await player.recover(x);
				}
			} else {
				const targets = await target
					.chooseTarget(true, [1, x], (card, plyr, tgt) => get.distance(target, tgt) <= target.getAttackRange())
					.forResult();
				if (targets.bool && targets.targets && targets.targets.length) {
					for (const tgt of targets.targets) {
						if (tgt.isIn()) {
							await tgt.damage(1);
						}
					}
				}
			}
		},
	},

	// ============ 沮授（yj_jushou） ============
	jianying: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "useCard" },
		group: ["jianying_record"],
		filter(event, player) {
			const last = player.storage.jianying_last;
			if (!last) {
				return false;
			}
			return get.suit(event.card) == last.suit || get.number(event.card) == last.number;
		},
		async content(event, trigger, player) {
			const choiceResult = await player.chooseControl("摸牌", "重铸").set("prompt", get.prompt2("jianying")).forResult();
			if (choiceResult.control == "摸牌") {
				await player.draw();
			} else {
				const result = await player.chooseCard("he", true).set("prompt2", get.prompt2("jianying")).forResult();
				if (result.bool && result.cards && result.cards.length) {
					await player.recast(result.cards);
				}
			}
		},
	},
	jianying_record: {
		charlotte: true,
		trigger: { player: ["useCardAfter", "phaseUseBegin"] },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			if (trigger.name == "phaseUseBegin") {
				delete player.storage.jianying_last;
				return;
			}
			player.storage.jianying_last = { suit: get.suit(trigger.card), number: get.number(trigger.card) };
		},
	},
	shibei: {
		audio: 2,
		trigger: { player: "damageEnd" },
		forced: true,
		async content(event, trigger, player) {
			const count = player.getHistory("damage").length;
			if (count <= 1) {
				await player.recover();
			} else {
				await player.loseHp();
			}
		},
	},

	// ============ 刘协（liuxie） ============
	tianming: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.card.name == "sha";
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("tianming")).forResult();
		},
		async content(event, trigger, player) {
			async function act(p) {
				const num = Math.min(2, p.countCards("he"));
				if (num > 0) {
					await p.chooseToDiscard("he", num, num, true).forResult();
				}
				await p.draw(2);
			}
			await act(player);
			const players = game.filterPlayer();
			if (!players.length) {
				return;
			}
			const maxHp = Math.max(...players.map(p => p.hp));
			const maxPlayers = players.filter(p => p.hp == maxHp);
			if (maxPlayers.length == 1 && maxPlayers[0] != player && maxPlayers[0].isIn()) {
				const other = maxPlayers[0];
				const result = await other.chooseBool(get.prompt2("tianming")).forResult();
				if (result.bool) {
					await act(other);
				}
			}
		},
	},
	mizhao: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player;
		},
		filter(event, player) {
			return game.countPlayer(current => current != player) >= 2;
		},
		async content(event, trigger, player) {
			const carrier = event.target;
			const cards = player.getCards("h");
			if (cards.length) {
				await player.give(cards, carrier);
			}
			const result = await player
				.chooseTarget(true, `密詔：请选择一名角色与${get.translation(carrier)}拼点`, (card, plyr, target) => target != player && target != carrier)
				.forResult();
			if (!result.bool || !result.targets || !result.targets.length) {
				return;
			}
			const opponent = result.targets[0];
			if (!carrier.isIn() || !opponent.isIn() || !carrier.canCompare(opponent)) {
				return;
			}
			const compareResult = await carrier.chooseToCompare(opponent).forResult();
			const winner = compareResult.bool ? carrier : opponent;
			const loser = compareResult.bool ? opponent : carrier;
			const shaCard = { name: "sha", isCard: true };
			if (winner.isIn() && loser.isIn() && winner.canUse(shaCard, loser, false)) {
				await winner.useCard(shaCard, loser, false);
			}
		},
	},

	// ============ 张鲁（zhanglu） ============
	yishe: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return event.player.isFriendOf(player) && !player.getExpansions("zhanglu_mi").length;
		},
		async cost(event, trigger, player) {
			event.result = await trigger.player.chooseBool(get.prompt2("yishe")).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			await target.draw(2);
			const num = Math.min(2, target.countCards("h"));
			if (num > 0) {
				const cards = target.getCards("h").slice(0, num);
				await player.addToExpansion({ cards, source: target, gaintag: ["zhanglu_mi"], animate: "gain2" });
			}
		},
	},
	bushi: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd", source: "damageSource" },
		filter(event, player, name) {
			if (name == "damageSource") {
				return event.player != player;
			}
			return true;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("bushi")).forResult();
		},
		async content(event, trigger, player) {
			const cards = get.cards(1);
			if (cards && cards.length) {
				await player.addToExpansion({ cards, gaintag: ["zhanglu_mi"], animate: "gain2" });
			}
		},
	},
	midao: {
		aiShowTag: "recover",
		audio: 2,
		trigger: { global: "judge" },
		group: ["midao_change"],
		filter(event, player) {
			return player.getExpansions("zhanglu_mi").length > 0 && event.player.isIn();
		},
		async content(event, trigger, player) {
			const list = player.getExpansions("zhanglu_mi");
			const result = await player.chooseButton([`米道：是否打出一张“米”代替${get.translation(trigger.player)}的判定牌？`, list]).forResult();
			if (!result.bool || !result.links || !result.links.length) {
				return;
			}
			const card = result.links[0];
			if (trigger.player.judging && trigger.player.judging[0]) {
				game.cardsDiscard(trigger.player.judging[0]);
			}
			trigger.player.judging[0] = card;
			if (trigger.orderingCards) {
				trigger.orderingCards.addArray([card]);
			}
			if (!player.getExpansions("zhanglu_mi").length) {
				await player.recover();
			}
		},
	},
	midao_change: {
		aiShowTag: "response",
		charlotte: true,
		mod: {
			cardsuit(card) {
				if (card.midao_suit) {
					return card.midao_suit;
				}
			},
			cardnature(card) {
				if (card.midao_nature !== undefined) {
					return card.midao_nature;
				}
			},
		},
		trigger: { global: "useCard" },
		usable: 1,
		filter(event, player) {
			if (event.card.name != "sha" && get.type(event.card) != "trick") {
				return false;
			}
			return player.getExpansions("zhanglu_mi").length > 0 && !!(event.targets && event.targets.length);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(`米道：是否移去一张“米”，改变${get.translation(trigger.card)}的花色和造成伤害的属性？`).forResult();
		},
		async content(event, trigger, player) {
			const mi = player.getExpansions("zhanglu_mi").slice(0, 1);
			if (mi.length) {
				await player.loseToDiscardpile(mi);
			}
			if (!player.getExpansions("zhanglu_mi").length) {
				await player.recover();
			}
			const suits = ["heart", "diamond", "club", "spade"].filter(s => s != get.suit(trigger.card));
			const natures = ["", "fire", "thunder"].filter(n => n != (get.nature(trigger.card) || ""));
			trigger.card.midao_suit = suits[Math.floor(Math.random() * suits.length)];
			trigger.card.midao_nature = natures[Math.floor(Math.random() * natures.length)];
		},
	},

	// ============ 严白虎（yanbaihu） ============
	zhidao: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		group: ["zhidao_effect"],
		filterTarget(card, player, target) {
			return target != player;
		},
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("zhidao"), (card, player, target) => target != player)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets && event.targets[0];
			if (!target) {
				return;
			}
			player.storage.zhidao_target = target;
			player.addTempSkill("zhidao_effect", "phaseAfter");
		},
	},
	zhidao_effect: {
		charlotte: true,
		mod: {
			globalFrom(player, to, distance) {
				if (to == player.storage.zhidao_target) {
					return 1;
				}
			},
			globalTo(from, player, distance) {
				if (from == player.storage.zhidao_target) {
					return 1;
				}
			},
			targetInRange(card, player, target) {
				if (player.storage.zhidao_target && target != player.storage.zhidao_target) {
					return false;
				}
			},
		},
		trigger: { player: "damageEnd" },
		forced: true,
		filter(event, player) {
			return _status.currentPhase == player && event.player == player.storage.zhidao_target;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (target.isIn() && target.countCards("he")) {
				const result = await player.choosePlayerCard(target, "he", true).forResult();
				if (result.cards && result.cards.length) {
					await player.gain(result.cards, target, "give");
				}
			}
		},
		onremove(player) {
			delete player.storage.zhidao_target;
		},
	},
	jili: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "useCardToTargeted" },
		group: ["jili_reset", "jili_counter", "jili_prevent"],
		filter(event, player) {
			if (!event.targets || event.targets.length != 1 || event.targets[0] != player) {
				return false;
			}
			if (get.color(event.card) != "red") {
				return false;
			}
			const info = lib.card[event.card.name];
			return get.type(event.card) == "basic" || (get.type(event.card) == "trick" && info && !info.delay);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("jili", trigger.card)).forResult();
		},
		async content(event, trigger, player) {
			const name = trigger.card.name;
			if (name == "tao") {
				await player.recover();
			} else if (name == "sha") {
				await player.damage(1, get.nature(trigger.card));
			} else {
				await player.draw();
			}
		},
	},
	jili_reset: {
		charlotte: true,
		trigger: { global: "phaseChange" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.jili_count = 0;
		},
	},
	jili_counter: {
		charlotte: true,
		trigger: { player: "damageBegin1" },
		forced: true,
		popup: false,
		priority: 10,
		content(event, trigger, player) {
			player.storage.jili_count = (player.storage.jili_count || 0) + 1;
		},
	},
	jili_prevent: {
		aiShowTag: "defense",
		charlotte: true,
		trigger: { player: "damageBegin1" },
		filter(event, player) {
			return (player.storage.jili_count || 0) >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("jili_prevent")).forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.maxHp = Math.max(1, player.maxHp - 1);
			player.hp = Math.min(player.hp, player.maxHp);
		},
	},

	// ============ 皇甫嵩（std_huangfusong） ============
	guanhuo: {
		aiShowTag: "offense",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		group: ["guanhuo_reset"],
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const result = await player.chooseCard("he", true).set("prompt2", get.prompt2("guanhuo")).forResult();
			if (!result.bool || !result.cards || !result.cards.length) {
				return;
			}
			const card = result.cards[0];
			await player.showCards([card]);
			const suit = get.suit(card);
			let noDamage = false;
			if (target.countCards("he", c => get.suit(c) == suit) > 0) {
				await target
					.chooseToDiscard({
						position: "he",
						filterCard(c) {
							return get.suit(c) == suit;
						},
						selectCard: 1,
						forced: true,
						prompt: `觀火：请弃置一张${get.translation(suit)}花色的牌`,
					})
					.forResult();
				noDamage = true;
			} else {
				const dmg = player.storage.guanhuo_bonus ? 2 : 1;
				await target.damage(dmg, "fire");
			}
			if (noDamage) {
				if (!player.storage.guanhuo_activated) {
					player.storage.guanhuo_activated = true;
					player.storage.guanhuo_bonus = true;
					player.addTempSkill("guanhuo_reset", "phaseAfter");
				} else {
					player.removeSkill("guanhuo");
				}
			}
		},
	},
	guanhuo_reset: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			delete player.storage.guanhuo_activated;
			delete player.storage.guanhuo_bonus;
		},
	},

	// ============ 陶谦（taoqian） ============
	zhaohuo: {
		audio: 2,
		trigger: { global: "enterDying" },
		forced: true,
		filter(event, player) {
			return event.player != player && player.maxHp > 1;
		},
		async content(event, trigger, player) {
			player.maxHp--;
			player.hp = Math.min(player.hp, player.maxHp);
			await player.draw(2);
		},
	},
	yixiang: {
		audio: 2,
		trigger: { player: "damageBegin1" },
		forced: true,
		filter(event, player) {
			return !!(event.card && event.source && event.source != player && _status.currentPhase == event.source);
		},
		async content(event, trigger, player) {
			const source = trigger.source;
			const history = source.getHistory("useCard");
			const index = history.findIndex(evt => evt.card == trigger.card);
			if (index == 0) {
				trigger.num = Math.max(0, trigger.num - 1);
			} else if (index == 1 && get.color(trigger.card) == "black") {
				trigger.cancel();
			}
		},
	},
	yirang: {
		aiShowTag: "recover",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		limited: true,
		skillAnimation: true,
		animationColor: "gold",
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("yirang")).forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const cards = player.getCards("hej");
			if (cards.length) {
				await player.showCards(cards);
			}
			const nonBasic = cards.filter(c => get.type(c) != "basic");
			const result = await player
				.chooseTarget(true, "揖讓：请选择一名角色交给其非基本牌", (card, plyr, target) => target != player)
				.forResult();
			if (!result.bool || !result.targets || !result.targets.length) {
				player.removeSkill("zhaohuo");
				return;
			}
			const target = result.targets[0];
			if (nonBasic.length) {
				await player.give(nonBasic, target);
			}
			if (target.isIn() && target.maxHp > player.maxHp) {
				player.maxHp = target.maxHp;
				await player.recover(nonBasic.length);
			}
			player.removeSkill("zhaohuo");
		},
	},


	// ============ 麹义（quyi） ============
	// 伏骑：锁定技，你距离其为1的其他角色不能响应你使用的【杀】或普通锦囊牌。
	// 沿用官方fuqi的directHit机制，缩小适用范围为“杀/普通锦囊”（不含基本牌）。
	fuqi: {
		audio: "fuqi",
		forced: true,
		trigger: { player: "useCard" },
		filter(event, player) {
			return !!(
				event.card &&
				(event.card.name == "sha" || get.type(event.card) == "trick") &&
				game.hasPlayer(current => current != player && get.distance(current, player) <= 1)
			);
		},
		content() {
			trigger.directHit.addArray(game.filterPlayer(current => current != player && get.distance(current, player) <= 1));
		},
	},
	// 骄恣：锁定技，当你造成或受到伤害时，若你的手牌数是全场最多，伤害来源可以获得受伤角色一张牌。
	jiaozi: {
		audio: "jiaozi",
		forced: true,
		trigger: { player: "damageEnd", source: "damageSource" },
		filter(event, player, name) {
			if (!player.isMaxHandcard()) {
				return false;
			}
			if (name == "damageSource") {
				return !!event.player?.isIn();
			}
			return !!event.source?.isIn();
		},
		async content(event, trigger, player) {
			if (event.triggername == "damageSource") {
				if (trigger.player?.isIn() && trigger.player.countCards("he")) {
					await player.gainPlayerCard(trigger.player, "he");
				}
			} else if (trigger.source?.isIn() && player.countCards("he")) {
				await trigger.source.gainPlayerCard(player, "he");
			}
		},
	},

	// ============ 卑弥呼（beimihu） ============
	// 鬼术：出牌阶段，你可以将一张♠手牌当【知己知彼】或【远交近攻】使用
	// （不可与你本回合上次以此法使用的牌相同）。用两个隐藏子技能分别承载两种虚拟牌。
	guishu: {
		init(player) {
			player.addSkill("guishu_zhibi");
			player.addSkill("guishu_yuanjiao");
		},
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			delete player.storage.guishu_last;
		},
	},
	guishu_zhibi: {
		aiShowTag: "support",
		charlotte: true,
		audio: "guishu",
		enable: "phaseUse",
		filterCard(card, player) {
			return get.suit(card, player) == "spade";
		},
		position: "h",
		selectCard: 1,
		viewAs: { name: "zhibi" },
		filter(event, player) {
			return player.storage.guishu_last != "zhibi" && player.countCards("h", card => get.suit(card, player) == "spade") > 0;
		},
		onuse(event, player) {
			player.storage.guishu_last = "zhibi";
		},
		prompt: "鬼术：将一张♠手牌当【知己知彼】使用",
		ai: { order: 6, result: { player: 1 } },
	},
	guishu_yuanjiao: {
		aiShowTag: "support",
		charlotte: true,
		audio: "guishu",
		enable: "phaseUse",
		filterCard(card, player) {
			return get.suit(card, player) == "spade";
		},
		position: "h",
		selectCard: 1,
		viewAs: { name: "yuanjiao" },
		filter(event, player) {
			return player.storage.guishu_last != "yuanjiao" && player.countCards("h", card => get.suit(card, player) == "spade") > 0;
		},
		onuse(event, player) {
			player.storage.guishu_last = "yuanjiao";
		},
		prompt: "鬼术：将一张♠手牌当【远交近攻】使用",
		ai: { order: 6, result: { player: 1 } },
	},
	// 遠城：锁定技，当你受到伤害时，若你不在伤害来源攻击范围内，此伤害-1。
	yuancheng: {
		audio: "yuancheng",
		forced: true,
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			return !!(event.source && event.source != player && event.source.isIn() && !player.inRangeOf(event.source));
		},
		content(event, trigger, player) {
			trigger.num--;
		},
	},

	// ============ 许劭（jsrg_xushao） ============
	// 盈门：锁定技，你首次明置此武将牌时，你受到伤害后，各获得一名"访客"（从未出场的武将中随机选取，
	// 选取方式沿用jsrg包原版：从_status.characterlist随机取出）。与jsrg包原版不同：
	// 原版为开局即获得4名访客且每回合可增减，本卡按实际卡面改为仅这两个时机各摸1名。
	sbyingmen: {
		trigger: { player: "showCharacterAfter" },
		forced: true,
		filter(event, player) {
			return event.toShow.includes("jsrg_xushao") && !player.storage.sbyingmen_inited;
		},
		async content(event, trigger, player) {
			player.storage.sbyingmen_inited = true;
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const characters = _status.characterlist.randomRemove(1);
			if (characters.length) {
				lib.skill.sbyingmen.addVisitors(characters, player);
			}
		},
		ai: {
			combo: "sbpingjian",
		},
		group: "sbyingmen_damage",
		subSkill: {
			damage: {
				charlotte: true,
				trigger: { player: "damageEnd" },
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					if (!_status.characterlist) {
						game.initCharacterList();
					}
					const characters = _status.characterlist.randomRemove(1);
					if (characters.length) {
						lib.skill.sbyingmen.addVisitors(characters, player);
					}
				},
			},
		},
		getSkills(characters, player) {
			let skills = [];
			for (let name of characters) {
				if (Array.isArray(get.character(name).skills)) {
					for (let skill of get.character(name).skills) {
						let list = get.skillCategoriesOf(skill, player);
						list.remove("锁定技");
						if (list.length > 0) {
							continue;
						}
						let info = get.info(skill);
						if (info && (!info.unique || info.gainable)) {
							skills.add(skill);
						}
					}
				}
			}
			return skills;
		},
		addVisitors(characters, player) {
			player.addSkillBlocker("sbyingmen");
			game.log(player, "将", "#y" + get.translation(characters), "加入了", "#g“访客”");
			game.broadcastAll(
				function (player, characters) {
					player.tempname.addArray(characters);
					player.$draw(
						characters.map(function (name) {
							let cardname = "huashen_card_" + name;
							lib.card[cardname] = {
								fullimage: true,
								image: "character:" + name,
							};
							lib.translate[cardname] = get.rawName2(name);
							return game.createCard(cardname, " ", " ");
						}),
						"nobroadcast"
					);
				},
				player,
				characters
			);
			player.markAuto("sbyingmen", characters);
			let storage = player.getStorage("sbyingmen");
			let skills = lib.skill.sbyingmen.getSkills(storage, player);
			player.addInvisibleSkill(skills);
		},
		removeVisitors(characters, player) {
			let skills = lib.skill.sbyingmen.getSkills(characters, player);
			let characters2 = player.getStorage("sbyingmen").slice(0);
			characters2.removeArray(characters);
			skills.removeArray(lib.skill.sbyingmen.getSkills(characters2, player));
			if (Array.isArray(player.tempname)) {
				game.broadcastAll((player, characters) => player.tempname.removeArray(characters), player, characters);
			}
			player.unmarkAuto("sbyingmen", characters);
			_status.characterlist.addArray(characters);
			player.removeInvisibleSkill(skills);
		},
		onremove(player, skill) {
			lib.skill.sbyingmen.removeVisitors(player.getStorage("sbyingmen"), player);
			player.removeSkillBlocker("sbyingmen");
		},
		skillBlocker(skill, player) {
			if (!player.invisibleSkills.includes(skill) || skill == "sbpingjian" || skill == "sbyingmen") {
				return false;
			}
			player.removeSkillBlocker("sbyingmen");
			const bool = !player.hasSkill("sbpingjian");
			player.addSkillBlocker("sbyingmen");
			return bool;
		},
		marktext: "客",
		intro: {
			name: "访客",
			mark(dialog, storage, player) {
				if (!storage || !storage.length) {
					return "当前没有“访客”";
				}
				dialog.addSmall([storage, "character"]);
				let skills = lib.skill.sbyingmen.getSkills(storage, player);
				if (skills.length) {
					dialog.addText("<li>当前可用技能：" + get.translation(skills), false);
				}
			},
		},
	},
	sbpingjian: {
		trigger: { player: ["useSkill", "logSkillBegin"] },
		forced: true,
		locked: false,
		filter(event, player) {
			let skill = get.sourceSkillFor(event);
			return player.invisibleSkills.includes(skill) && lib.skill.sbyingmen.getSkills(player.getStorage("sbyingmen"), player).includes(skill);
		},
		async content(event, trigger, player) {
			const visitors = player.getStorage("sbyingmen").slice(0);
			const drawers = visitors.filter(function (name) {
				return get.character(name).skills?.includes(get.sourceSkillFor(trigger));
			});
			event.drawers = drawers;
			const dialog = ["评鉴：请选择移去一张“访客”"];
			if (drawers.length) {
				dialog.push('<div class="text center">如果移去' + get.translation(drawers) + "，则你摸一张牌</div>");
			}
			dialog.push([visitors, "character"]);
			const result = await player.chooseButton(dialog, true).set("direct", true).forResult();
			if (result?.bool) {
				lib.skill.sbyingmen.removeVisitors(result.links, player);
				game.log(player, "移去了", "#y" + get.translation(result.links[0]));
				if (event.drawers.includes(result.links[0])) {
					player.addTempSkill("sbpingjian_draw");
					player.markAuto("sbpingjian_draw", [trigger.skill]);
				}
			}
		},
		group: "sbpingjian_trigger",
		subSkill: {
			draw: {
				charlotte: true,
				onremove: true,
				trigger: { player: ["useSkillAfter", "logSkill"] },
				forced: true,
				popup: false,
				filter(event, player) {
					return player.getStorage("sbpingjian_draw").includes(event.skill);
				},
				async content(event, trigger, player) {
					player.unmarkAuto(event.name, [trigger.skill]);
					await player.draw();
					if (!player.getStorage(event.name).length) {
						player.removeSkill(event.name);
					}
				},
			},
			trigger: {
				trigger: { player: "triggerInvisible" },
				forced: true,
				forceDie: true,
				popup: false,
				charlotte: true,
				priority: 10,
				filter(event, player) {
					if (event.revealed) {
						return false;
					}
					let info = get.info(event.skill);
					if (info.charlotte) {
						return false;
					}
					let skills = lib.skill.sbyingmen.getSkills(player.getStorage("sbyingmen"), player);
					game.expandSkills(skills);
					return skills.includes(event.skill);
				},
				async content(event, trigger, player) {
					let result;
					if (get.info(trigger.skill).silent) {
						return;
					} else {
						const info = get.info(trigger.skill);
						const evt = trigger,
							evtTrigger = evt._trigger;
						let str;
						let check = info.check;
						if (info.prompt) {
							str = info.prompt;
						} else {
							if (typeof info.logTarget == "string") {
								str = get.prompt(evt.skill, evtTrigger[info.logTarget], player);
							} else if (typeof info.logTarget == "function") {
								const logTarget = info.logTarget(evtTrigger, player, evt.triggername, evt.indexedData);
								if (get.itemtype(logTarget)?.indexOf("player") == 0) {
									str = get.prompt(evt.skill, logTarget, player);
								}
							} else {
								str = get.prompt(evt.skill, null, player);
							}
						}
						if (typeof str == "function") {
							str = str(evtTrigger, player, evt.triggername, evt.indexedData);
						}
						let next = player.chooseBool("评鉴：" + str);
						next.set("yes", !info.check || info.check(evtTrigger, player, evt.triggername, evt.indexedData));
						next.set("hsskill", evt.skill);
						next.set("forceDie", true);
						next.set("ai", function () {
							return _status.event.yes;
						});
						if (typeof info.prompt2 == "function") {
							next.set("prompt2", info.prompt2(evtTrigger, player, evt.triggername, evt.indexedData));
						} else if (typeof info.prompt2 == "string") {
							next.set("prompt2", info.prompt2);
						} else if (info.prompt2 != false) {
							if (lib.dynamicTranslate[evt.skill]) {
								next.set("prompt2", lib.dynamicTranslate[evt.skill](player, evt.skill));
							} else if (lib.translate[evt.skill + "_info"]) {
								next.set("prompt2", lib.translate[evt.skill + "_info"]);
							}
						}
						if (trigger.skillwarn) {
							if (next.prompt2) {
								next.set("prompt2", '<span class="thundertext">' + trigger.skillwarn + "。</span>" + next.prompt2);
							} else {
								next.set("prompt2", trigger.skillwarn);
							}
						}
						result = await next.forResult();
					}
					if (result?.bool) {
						if (!get.info(trigger.skill).cost) {
							trigger.revealed = true;
						}
					} else {
						trigger.untrigger();
						trigger.cancelled = true;
					}
				},
			},
		},
		ai: { combo: "sbyingmen" },
	},

	// ============ 祢衡（re_miheng） ============
	// 狂才：锁定技，你于回合内使用牌无距离和次数限制。若你本回合未使用过牌，
	// 手牌上限+1；使用过牌且未造成过伤害，手牌上限-1。
	rekuangcai: {
		audio: "rekuangcai",
		mod: {
			cardUsable() {
				return Infinity;
			},
			targetInRange() {
				return true;
			},
			maxHandcard(player, num) {
				if (!player.storage.rekuangcai_used) {
					return num + 1;
				}
				if (!player.storage.rekuangcai_damaged) {
					return num - 1;
				}
				return num;
			},
		},
		trigger: { player: ["useCard", "damageSource", "phaseZhunbeiBegin"] },
		forced: true,
		popup: false,
		content(event, trigger, player, name) {
			if (name == "phaseZhunbeiBegin") {
				player.storage.rekuangcai_used = false;
				player.storage.rekuangcai_damaged = false;
			} else if (name == "useCard") {
				player.storage.rekuangcai_used = true;
			} else {
				player.storage.rekuangcai_damaged = true;
			}
		},
	},
	// 舌剑：当你成为其他角色使用牌的唯一目标后，你可以弃置所有手牌（至少一张），
	// 然后选择一项：1.弃置其等量牌；2.若没有角色处于濒死状态，你对其造成1点伤害。
	reshejian: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: "reshejian",
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return !!(event.targets && event.targets.length == 1 && player.countCards("h") > 0);
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const result = await player
				.chooseToDiscard("h", player.countCards("h"), true)
				.set("prompt2", "舌剑：是否弃置所有手牌（至少一张）？")
				.forResult();
			if (!result?.bool || !result.cards?.length || !target?.isIn()) {
				return;
			}
			const num = result.cards.length;
			const canDamage = !game.hasPlayer(current => current.isDying());
			let useDamage = false;
			if (canDamage) {
				const choice = await player.chooseControl("弃置其等量的牌", "对其造成1点伤害").set("prompt", "舌剑：请选择一项").forResult();
				useDamage = choice.control == "对其造成1点伤害";
			}
			if (useDamage) {
				await player.damage(target, 1);
			} else if (target.countCards("he")) {
				await player.discardPlayerCard(target, "he", Math.min(num, target.countCards("he")), true);
			}
		},
	},

	// ============ 卢植（yl_luzhi） ============
	// 儒宗：回合结束时，若你本回合使用牌指定过的目标角色均为同一名，你可以将
	// 手牌数摸至与其相同（至多摸五张），若为你，可改为令一名其他角色摸至与你相同。
	ruzong: {
		aiShowTag: "draw",
		init(player) {
			player.addSkill("ruzong_track");
		},
		audio: "ruzong",
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			const list = player.storage.ruzong_targets;
			return !!(list && list.length == 1 && list[0]?.isIn());
		},
		async content(event, trigger, player) {
			const target = player.storage.ruzong_targets[0];
			if (target == player) {
				const result = await player
					.chooseTarget("儒宗：是否令一名其他角色将手牌数摸至与你相同？", (card, pl, ta) => ta != player)
					.forResult();
				if (result?.bool && result.targets?.length) {
					const other = result.targets[0];
					const diff = player.countCards("h") - other.countCards("h");
					if (diff > 0) {
						await other.draw(diff);
					}
				}
			} else {
				const diff = Math.min(5, target.countCards("h") - player.countCards("h"));
				if (diff > 0) {
					const result = await player.chooseBool(get.prompt("ruzong"), "是否将手牌摸至与" + get.translation(target) + "相同（摸" + diff + "张）？").forResult();
					if (result.bool) {
						await player.draw(diff);
					}
				}
			}
		},
	},
	ruzong_track: {
		charlotte: true,
		trigger: { player: ["useCard", "phaseZhunbeiBegin"] },
		forced: true,
		popup: false,
		content(event, trigger, player, name) {
			if (name == "phaseZhunbeiBegin") {
				player.storage.ruzong_targets = [];
				return;
			}
			if (!trigger.targets || !trigger.targets.length) {
				return;
			}
			const list = player.storage.ruzong_targets || [];
			for (const target of trigger.targets) {
				if (!list.includes(target)) {
					list.push(target);
				}
			}
			player.storage.ruzong_targets = list;
		},
	},
	// 蹈刃：出牌阶段限一次，你可以将一张手牌交给一名其他角色，然后对你与其
	// 攻击范围内均包含的所有角色各造成1点伤害。
	daoren: {
		aiShowTag: "support",
		audio: "daoren",
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		selectCard: 1,
		position: "h",
		discard: false,
		lose: false,
		delay: false,
		filterTarget(card, player, target) {
			return target != player;
		},
		check(card) {
			return 5 - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.give(cards, target);
			const shared = game.filterPlayer(current => current.isIn() && current.inRangeOf(player) && current.inRangeOf(target));
			for (const current of shared) {
				if (current.isIn()) {
					await current.damage(1);
				}
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					return get.attitude(player, target) < 0 ? 1 : -1;
				},
			},
		},
	},

	// ============ 刘焉（liuyan） ============
	// 图射：当你使用非基本牌指定目标后，你可以展示所有手牌，若其中没有基本牌，
	// 则你可以摸一张牌。
	xinfu_tushe: {
		aiShowTag: "draw",
		audio: "tushe",
		trigger: { player: "useCard" },
		filter(event, player) {
			return !!(event.card && get.type(event.card) != "basic" && event.targets && event.targets.length);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt("xinfu_tushe"), "是否展示所有手牌，查看能否摸一张牌？").forResult();
		},
		async content(event, trigger, player) {
			if (player.countCards("h")) {
				await player.showCards(player.getCards("h"), get.translation(player) + "发动了〖图射〗");
			}
			if (!player.countCards("h", card => get.type(card) == "basic")) {
				await player.draw();
			}
		},
	},
	// 立牧：出牌阶段，你可以将一张♦牌当【乐不思蜀】对自己使用，然后回复1点体力，
	// 本回合你对攻击范围内的其他角色使用牌无次数和距离限制。
	xinfu_limu: {
		aiShowTag: "recover",
		audio: "limu",
		enable: "phaseUse",
		filterCard(card, player) {
			return get.suit(card, player) == "diamond";
		},
		position: "hes",
		selectCard: 1,
		discard: true,
		lose: true,
		delay: false,
		filterTarget(card, player, target) {
			return target == player;
		},
		check(card) {
			return 5 - get.value(card);
		},
		prompt: "立牧：将一张♦牌当【乐不思蜀】对自己使用",
		async content(event, trigger, player) {
			await player.recover();
			player.addTempSkill("xinfu_limu_buff", "phaseUseAfter");
		},
	},
	xinfu_limu_buff: {
		charlotte: true,
		mod: {
			targetInRange() {
				return true;
			},
			cardUsable() {
				return Infinity;
			},
		},
	},

	// ============ 荀谌（re_xunchen） ============
	// 锋略：出牌阶段限一次，你可以与一名角色拼点：若你赢，其将区域里的两张牌交给你；
	// 若平局，你获得你的拼点牌且此技能于本阶段内的发动次数上限+1；若你输，其获得你的拼点牌。
	refenglve: {
		aiShowTag: "support",
		init(player) {
			player.addSkill("refenglve_reset");
			player.storage.refenglve_max = 1;
		},
		audio: "refenglve",
		enable: "phaseUse",
		filter(event, player) {
			const used = player.storage.refenglve_used || 0;
			const max = player.storage.refenglve_max || 1;
			return used < max && game.hasPlayer(current => current != player);
		},
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			player.storage.refenglve_used = (player.storage.refenglve_used || 0) + 1;
			const result = await player.chooseToCompare(target).forResult();
			if (result.tie) {
				if (result.player) {
					await player.gain([result.player], "gain2");
				}
				player.storage.refenglve_max = (player.storage.refenglve_max || 1) + 1;
			} else if (result.bool) {
				if (target.countCards("ej")) {
					await player.gainPlayerCard(target, "ej", true, 2);
				}
			} else if (result.winner == target && result.player) {
				await target.gain([result.player], "give");
			}
		},
	},
	refenglve_reset: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.refenglve_used = 0;
			player.storage.refenglve_max = 1;
		},
	},
	// 暗涌：当一名角色于其回合内第一次造成伤害后，若伤害值为1，你可以弃置一张牌，
	// 并对受伤角色造成1点伤害。
	anyong: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: "anyong",
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return !!(
				event.num === 1 &&
				event.source?.isIn() &&
				event.player?.isIn() &&
				player.storage.anyong_turnflag !== game.phaseNumber &&
				player.countCards("he") > 0
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("he", true)
				.set("prompt2", "暗涌：是否弃置一张牌，对" + get.translation(trigger.player) + "造成1点伤害？")
				.forResult();
		},
		async content(event, trigger, player) {
			player.storage.anyong_turnflag = game.phaseNumber;
			if (trigger.player?.isIn()) {
				await player.damage(trigger.player, 1);
			}
		},
	},

	// ============ 徐荣（xurong，沿用官方xinfu_xionghuo的“暴戾”机制并按卡面重做数值） ============
	// 凶镶：当你首次明置此武将牌后，你获得3枚“暴戾”。出牌阶段，你可以交给一名没有
	// “暴戾”且与你势力不同的其他角色1枚“暴戾”。你对有“暴戾”的其他角色造成的伤害+1
	// （每回合每名角色限一次），且其出牌阶段开始时，弃其“暴戾”并随机执行一项。
	xinfu_xionghuo: {
		aiShowTag: "support",
		init(player) {
			player.storage.xrbaoli_supply = 3;
			player.addSkill("xinfu_xionghuo_dmg");
		},
		audio: "xionghuo",
		enable: "phaseUse",
		filter(event, player) {
			return (
				(player.storage.xrbaoli_supply || 0) > 0 &&
				game.hasPlayer(current => current != player && current.isEnemyOf(player) && !current.storage.xrbaoli_holder)
			);
		},
		filterTarget(card, player, target) {
			return target != player && target.isEnemyOf(player) && !target.storage.xrbaoli_holder;
		},
		prompt: "凶镶：交给一名没有“暴戾”且势力不同的其他角色1枚“暴戾”",
		async content(event, trigger, player) {
			const target = event.target;
			player.storage.xrbaoli_supply = (player.storage.xrbaoli_supply || 0) - 1;
			target.storage.xrbaoli_holder = player;
			target.addSkill("xinfu_xionghuo_punish");
			player.popup("暴戾");
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					return -get.attitude(player, target);
				},
			},
		},
	},
	xinfu_xionghuo_dmg: {
		charlotte: true,
		trigger: { global: "damageBegin1" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!(
				event.player &&
				event.player != player &&
				event.player.storage.xrbaoli_holder === player &&
				event.player.storage.xrbaoli_hit !== game.phaseNumber
			);
		},
		content(event, trigger, player) {
			trigger.num++;
			trigger.player.storage.xrbaoli_hit = game.phaseNumber;
		},
	},
	xinfu_xionghuo_punish: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return !!player.storage.xrbaoli_holder;
		},
		async content(event, trigger, player) {
			const source = player.storage.xrbaoli_holder;
			delete player.storage.xrbaoli_holder;
			player.removeSkill("xinfu_xionghuo_punish");
			const choice = Math.floor(Math.random() * 3);
			if (choice === 0 && source?.isIn()) {
				await player.damage(1, source, "fire");
				player.addTempSkill("xinfu_xionghuo_ban", "phaseAfter");
			} else if (choice === 1) {
				await player.loseHp();
				player.addTempSkill("xinfu_xionghuo_hclimit", "phaseAfter");
			} else if (source?.isIn()) {
				if (player.countCards("e")) {
					await source.gainPlayerCard(player, "e", true, 1);
				}
				if (player.countCards("h")) {
					await source.gainPlayerCard(player, "h", true, 1);
				}
			}
		},
	},
	xinfu_xionghuo_ban: {
		charlotte: true,
		mod: {
			cardEnabled2(card, player) {
				if (card.name == "sha") {
					return false;
				}
			},
		},
	},
	xinfu_xionghuo_hclimit: {
		charlotte: true,
		mod: {
			maxHandcard(player, num) {
				return num - 1;
			},
		},
	},

	// ============ 黄祖（dc_huangzu） ============
	// 襲射：其他角色的准备阶段，你可以弃置装备区里的一张牌，视为对其使用一张【杀】，
	// 若其体力值小于你，此【杀】不能被响应，然后你可以重复此流程。若你以此法杀死了
	// 其他角色，此回合结束时你可以变更一次副将且变更后的副将处于暗置状态。
	xishe: {
		aiShowTag: "response",
		audio: "xishe",
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return !!(event.player != player && event.player?.isIn() && player.countCards("e") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("xishe", trigger.player), "是否弃置一张装备区里的牌，视为对其使用一张【杀】？")
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			let killed = false;
			while (target?.isIn() && player.countCards("e") > 0) {
				const cardResult = await player
					.choosePlayerCard(player, "e", true)
					.set("prompt", "襲射：弃置一张装备区里的牌，视为对其使用一张【杀】")
					.forResult();
				if (!cardResult?.bool || !cardResult.cards?.length) {
					break;
				}
				await player.discard(cardResult.cards);
				if (target.hp < player.hp) {
					await target.damage(1);
				} else {
					await player.useCard({ name: "sha", isCard: true }, target, false);
				}
				if (!target.isIn() || target.isDead()) {
					killed = true;
					break;
				}
				if (player.countCards("e") <= 0) {
					break;
				}
				const cont = await player.chooseBool("襲射：是否继续弃置装备区里的牌，视为对其使用【杀】？").forResult();
				if (!cont.bool) {
					break;
				}
			}
			if (killed) {
				player.addTempSkill("xishe_change", "phaseAfter");
			}
		},
	},
	xishe_change: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		filter(event, player) {
			return !!player.name2;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt("xishe_change"), "是否变更一次副将（变更后的副将处于暗置状态）？").forResult();
		},
		async content(event, trigger, player) {
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const pool = _status.characterlist.filter(name => lib.character[name] && name != player.name1 && name != player.name2);
			if (!pool.length) {
				return;
			}
			const newName = pool.randomGet();
			await player.changeCharacter([player.name1, newName]);
		},
	},

	// ============ 吕玲绮（lvlingqi） ============
	// 帼武：出牌阶段开始时，你可以展示全部手牌，根据你展示的类型数，你获得对应效果：
	// 至少一类，从弃牌堆获得一张【杀】；至少两类，此阶段使用牌无距离限制；至少三类，
	// 此阶段使用【杀】可以多指定两名角色为目标（此效果每回合限一次）。
	guowu: {
		aiShowTag: "support",
		audio: "guowu",
		trigger: { player: ["phaseUseBegin", "phaseZhunbeiBegin"] },
		filter(event, player, name) {
			if (name == "phaseZhunbeiBegin") {
				return true;
			}
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player, name) {
			if (name == "phaseZhunbeiBegin") {
				event.result = { bool: true };
				return;
			}
			event.result = await player.chooseBool(get.prompt("guowu"), "是否展示全部手牌？").forResult();
		},
		async content(event, trigger, player, name) {
			if (name == "phaseZhunbeiBegin") {
				player.storage.guowu_multi_used = false;
				return;
			}
			const hs = player.getCards("h");
			if (hs.length) {
				await player.showCards(hs, get.translation(player) + "发动了〖帼武〗");
			}
			const types = new Set(hs.map(card => get.type(card)));
			const n = types.size;
			if (n >= 1) {
				const card = get.cardPile2(c => c.name == "sha", "random");
				if (card) {
					await player.gain(card, "gain2");
				}
			}
			if (n >= 2) {
				player.addTempSkill("guowu_buff1", "phaseUseAfter");
			}
			if (n >= 3) {
				player.addTempSkill("guowu_buff2", "phaseUseAfter");
			}
		},
	},
	guowu_buff1: {
		charlotte: true,
		mod: {
			targetInRange() {
				return true;
			},
		},
	},
	guowu_buff2: {
		charlotte: true,
		mod: {
			selectTarget(card, player, range) {
				if (card.name == "sha" && Array.isArray(range) && !player.storage.guowu_multi_used) {
					return [range[0], range[1] + 1];
				}
			},
		},
		trigger: { player: "useCard1" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.card?.name == "sha" && event.targets?.length > 1;
		},
		content(event, trigger, player) {
			player.storage.guowu_multi_used = true;
		},
	},
	// 妆戎：出牌阶段限一次，你可以弃置一张锦囊牌，若如此做你视为拥有标准版“无双”
	// 直到此阶段结束。
	zhuangrong: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: "zhuangrong",
		trigger: { player: "phaseUseBegin" },
		usable: 1,
		filter(event, player) {
			return player.countCards("he", card => get.type(card) == "trick") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("he", card => get.type(card) == "trick", 1, true)
				.set("prompt2", "妆戎：是否弃置一张锦囊牌，视为拥有标准版〖无双〗直到此阶段结束？")
				.forResult();
		},
		async content(event, trigger, player) {
			player.addTempSkill("wushuang", "phaseUseAfter");
		},
	},
	// 神威：锁定技，摸牌阶段开始时，你令额定摸牌数+2；你的手牌上限+2。
	llqshenwei: {
		audio: "llqshenwei",
		mod: {
			maxHandcard(player, num) {
				return num + 2;
			},
		},
		trigger: { player: "phaseDrawBegin1" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			trigger.num += 2;
		},
	},


	// ============ 刘璋（liuzhang） ============
	// 引戈：出牌阶段限一次，你可以令一名其他角色交给你两张牌，然后其视为对你或你攻击范围内
	// 另一名其他角色使用一张【杀】。
	lz_yinge: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target !== player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const num = Math.min(2, target.countCards("h"));
			if (num > 0) {
				await target.chooseToGive(player, "h", true, `引戈：交给${get.translation(player)}${get.cnNumber(num)}张牌`, num);
			}
			if (!target.isIn()) {
				return;
			}
			const candidates = game.filterPlayer(current => current === player || (current !== target && player.inRange(current)));
			if (!candidates.length) {
				return;
			}
			const result = await player
				.chooseTarget(`引戈：选择一名角色，视为由${get.translation(target)}对其使用一张【杀】`, (card, plyr, to) => get.event().candidates.includes(to))
				.set("candidates", candidates)
				.forResult();
			if (result && result.bool && result.targets && result.targets.length) {
				const victim = result.targets[0];
				if (target.isIn() && victim.isIn() && target.canUse({ name: "sha", isCard: true }, victim, false)) {
					await target.useCard({ name: "sha", isCard: true }, victim, false, "noai");
				}
			}
		},
	},
	// 施仁：每回合限一次，当你成为其他角色使用【杀】的目标后，你可以摸两张牌，然后交给该角色
	// 一张牌。
	lz_shiren: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		usable: 1,
		filter(event, player) {
			return event.card.name === "sha" && event.player && event.player !== player;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(`施仁：是否摸两张牌，然后交给${get.translation(trigger.player)}一张牌？`).forResult();
		},
		async content(event, trigger, player) {
			await player.draw(2);
			if (trigger.player.isIn() && player.countCards("he")) {
				await player.chooseToGive(trigger.player, "he", true, `施仁：交给${get.translation(trigger.player)}一张牌`, 1);
			}
		},
	},
	// 据益：同势力其他角色每回合首次对你造成伤害时，其可以防止此伤害，然后获得你的一张牌；
	// 你每回合首次受到虚拟牌造成的伤害或者失去体力时，你可以弃置两张牌，防止之。
	lz_juyi: {
		audio: 2,
		group: ["lz_juyi_source", "lz_juyi_self"],
	},
	lz_juyi_source: {
		aiShowTag: "defense",
		sourceSkill: "lz_juyi",
		trigger: { player: "damageBefore" },
		filter(event, player) {
			return event.source && event.source !== player && event.source.isIn() && event.source.isFriendOf(player) && event.source.storage.lz_juyi_round !== game.roundNumber;
		},
		async cost(event, trigger, player) {
			event.result = await trigger.source.chooseBool(`据益：是否防止你对${get.translation(player)}造成的伤害，然后获得其一张牌？`).forResult();
		},
		async content(event, trigger, player) {
			trigger.source.storage.lz_juyi_round = game.roundNumber;
			trigger.cancel();
			if (player.countCards("he")) {
				await trigger.source.gainPlayerCard(player, "he", true);
			}
		},
	},
	lz_juyi_self: {
		aiShowTag: "defense",
		aiShowCost: true,
		sourceSkill: "lz_juyi",
		trigger: { player: ["damageBefore", "loseHpBefore"] },
		filter(event, player) {
			if (player.storage.lz_juyi_self_round === game.roundNumber) {
				return false;
			}
			if (player.countCards("he") < 2) {
				return false;
			}
			if (event.name === "damage") {
				return !!event.card && get.itemtype(event.card) !== "card";
			}
			return event.name === "loseHp";
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(`据益：是否弃置两张牌，防止你${trigger.name === "damage" ? "受到的伤害" : "失去的体力"}？`).forResult();
		},
		async content(event, trigger, player) {
			player.storage.lz_juyi_self_round = game.roundNumber;
			await player.chooseToDiscard(2, "he", true).forResult();
			trigger.cancel();
		},
	},

	// ============ 司马亮（hb_simaliang） ============
	// 慴懼：锁定技，当你使用【杀】指定唯一目标后或成为【杀】的唯一目标后，你与对方议事：若
	// 结果为黑色，双方各减1点体力上限；否则，意见为黑色的角色摸两张牌。
	sml_sheju: {
		audio: 2,
		trigger: { player: "useCardToTarget", target: "useCardToTarget" },
		forced: true,
		filter(event, player, name) {
			if (event.card.name !== "sha" || !event.targets || event.targets.length !== 1) {
				return false;
			}
			return name !== "target" || event.player !== player;
		},
		async content(event, trigger, player) {
			const other = trigger.player === player ? trigger.targets[0] : trigger.player;
			if (!other || !other.isIn()) {
				return;
			}
			await player
				.chooseToDebate([player, other])
				.set("callback", async (event, trigger, player) => {
					const { debateResult: result } = event;
					const { opinion, black } = result;
					if (opinion === "black") {
						await player.loseMaxHp();
						if (other.isIn()) {
							await other.loseMaxHp();
						}
					} else {
						for (const [target] of black) {
							if (target.isIn()) {
								await target.draw(2);
							}
						}
					}
				});
		},
	},
	// 族望：锁定技，准备阶段和结束阶段，你将手牌摸至体力上限。
	sml_zuwang: {
		audio: 2,
		trigger: { player: ["phaseZhunbeiBegin", "phaseAfter"] },
		forced: true,
		filter(event, player) {
			return player.countCards("h") < player.maxHp;
		},
		async content(event, trigger, player) {
			await player.draw(player.maxHp - player.countCards("h"));
		},
	},

	// ============ 王允（wangyun） ============
	// 赦论：出牌阶段限一次，你可以选择一名你攻击范围内的其他角色，然后你令除其外所有手牌数
	// 不大于你的角色议事：结果为红色，你弃置其两张牌；结果为黑色，你对其造成1点伤害。
	wy_shelun: {
		aiShowTag: "aoe",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target !== player && player.inRange(target);
		},
		async content(event, trigger, player) {
			const target = event.target;
			const voters = game.filterPlayer(current => current !== target && current.countCards("h") <= player.countCards("h"));
			if (!voters.length) {
				return;
			}
			await player
				.chooseToDebate(voters)
				.set("callback", async (event, trigger, player) => {
					const { debateResult: result } = event;
					if (!target.isIn()) {
						return;
					}
					if (result.opinion === "red") {
						if (target.countCards("he")) {
							await player.discardPlayerCard(target, 2, true);
						}
					} else if (result.opinion === "black") {
						await target.damage();
					}
				});
		},
	},
	// 伐异：当你参与的议事结束后，你可以对一名意见与你不同的角色造成1点伤害。
	wy_fayi: {
		aiShowTag: "support",
		audio: 2,
		trigger: { global: "chooseToDebateAfter" },
		filter(event, player) {
			if (!event.targets || !event.targets.includes(player)) {
				return false;
			}
			const mine = event.red.some(i => i[0] === player) ? "red" : event.black.some(i => i[0] === player) ? "black" : null;
			if (!mine) {
				return false;
			}
			const opposite = mine === "red" ? event.black : event.red;
			return opposite.some(i => i[0].isIn());
		},
		async cost(event, trigger, player) {
			const mine = trigger.red.some(i => i[0] === player) ? "red" : "black";
			const opposite = (mine === "red" ? trigger.black : trigger.red).filter(i => i[0].isIn());
			event.result = await player
				.chooseTarget("伐异：是否对一名意见与你不同的角色造成1点伤害？", (card, plyr, to) => get.event().opposite.some(i => i[0] === to))
				.set("opposite", opposite)
				.forResult();
		},
		async content(event, trigger, player) {
			if (event.targets && event.targets.length) {
				await event.targets[0].damage();
			}
		},
	},

	// ============ 贾南风（hb_jiananfeng） ============
	// 擅政：出牌阶段限一次，你可以与任意名角色议事：若结果为红色，你对一名未参与议事的角色
	// 造成1点伤害；若结果为黑色，你获得所有展示的意见牌。
	jnf_shanzheng: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(target => target !== player && target.countCards("h") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget("擅政：选择参与议事的角色（不选则仅你自己参与）", [0, Infinity], (card, player, target) => target !== player && target.countCards("h") > 0)
				.set("ai", target => get.attitude(get.player(), target))
				.forResult();
		},
		async content(event, trigger, player) {
			const joined = [player].concat((event.targets || []).sortBySeat());
			await player
				.chooseToDebate(joined)
				.set("callback", async (event, trigger, player) => {
					const { debateResult: result } = event;
					const { opinion, red, black } = result;
					if (opinion === "red") {
						const candidates = game.filterPlayer(current => !joined.includes(current));
						if (candidates.length) {
							const result2 = await player
								.chooseTarget("擅政：对一名未参与议事的角色造成1点伤害", (card, plyr, to) => get.event().candidates.includes(to))
								.set("candidates", candidates)
								.forResult();
							if (result2 && result2.bool && result2.targets.length) {
								await result2.targets[0].damage();
							}
						}
					} else if (opinion === "black") {
						const cards = [...red, ...black].map(i => i[1]).filter(c => get.itemtype(c) === "card");
						if (cards.length) {
							await player.gain(cards, "gain2");
						}
					}
				});
		},
	},
	// 凶暴：当你参与议事时，你可以额外展示一张手牌，若如此做，其余参与者改为随机展示一张
	// 手牌。
	jnf_xiongbao: {
		aiShowTag: "support",
		audio: 2,
		trigger: { global: "chooseToDebateBegin" },
		filter(event, player) {
			return event.list && event.list.includes(player) && player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("凶暴：是否额外展示一张手牌，令其余参与者改为随机展示手牌？").forResult();
		},
		async content(event, trigger, player) {
			const extra = player.getCards("h").randomGet();
			if (extra) {
				await player.showCards([extra], `${get.translation(player)}发动了〖凶暴〗`);
			}
			const others = trigger.list.filter(target => target !== player && target.countCards("h") > 0);
			if (others.length) {
				trigger.fixedResult = (trigger.fixedResult || []).concat(others.map(target => [target, target.getCards("h").randomGet()]));
			}
		},
	},
	// 烈妒：锁定技，其他女性角色和手牌数最大的角色不能响应你使用的牌。
	jnf_liedu: {
		audio: 2,
		ai: {
			norespond: true,
			skillTagFilter(player, tag, arg) {
				if (tag !== "norespond") {
					return;
				}
				const target = arg && arg[1];
				if (!target || target === player) {
					return false;
				}
				if (target.sex === "female") {
					return true;
				}
				const maxCount = Math.max(0, ...game.filterPlayer().map(p => p.countCards("h")));
				return maxCount > 0 && target.countCards("h") === maxCount;
			},
		},
	},

	// ============ 刘宏（liuhong） ============
	// 朝争：出牌阶段开始时，你可以与所有其他角色议事：若结果为红色，所有意见为红色的角色
	// 回复1点体力；若结果为黑色，所有意见为红色的其他角色各失去1点体力。若参与者意见全部
	// 一致，与你势力相同的角色各摸一张牌，本回合你视为大势力。
	lh_chaozheng: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current !== player);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("朝争：是否与所有其他角色议事？").forResult();
		},
		async content(event, trigger, player) {
			const all = game.filterPlayer();
			await player
				.chooseToDebate(all)
				.set("callback", async (event, trigger, player) => {
					const { debateResult: result } = event;
					const { opinion, red, black } = result;
					if (opinion === "red") {
						for (const [target] of red) {
							if (target.isIn() && target.isDamaged()) {
								await target.recover();
							}
						}
					} else if (opinion === "black") {
						for (const [target] of red) {
							if (target !== player && target.isIn()) {
								await target.loseHp();
							}
						}
					}
					const total = red.length + black.length;
					if (total > 0 && (red.length === total || black.length === total)) {
						const same = game.filterPlayer(current => current.isFriendOf(player));
						for (const p of same) {
							if (p.isIn()) {
								await p.draw();
							}
						}
						player.storage.lh_chaozheng_big = true;
						player.markSkill("lh_chaozheng");
						player.addTempSkill("lh_chaozheng_clear", "phaseAfter");
					}
				});
		},
	},
	lh_chaozheng_clear: {
		charlotte: true,
		onremove(player) {
			delete player.storage.lh_chaozheng_big;
		},
	},
	// 甚宠：限定技，出牌阶段，你可以令一名其他角色获得〖飞扬〗和〖跋扈〗。你死亡时，该角色
	// 失去这两个技能，然后杀死你的角色弃置其所有手牌。
	lh_shenchong: {
		aiShowTag: "support",
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		group: ["lh_shenchong_die"],
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return target !== player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			player.awakenSkill(event.name);
			target.addSkill(["feiyang", "bahu"]);
			player.storage.lh_shenchong_target = target;
		},
	},
	lh_shenchong_die: {
		sourceSkill: "lh_shenchong",
		trigger: { player: "die" },
		forced: true,
		popup: false,
		filter(event, player) {
			return player.storage.lh_shenchong_target && player.storage.lh_shenchong_target.isIn();
		},
		async content(event, trigger, player) {
			const target = player.storage.lh_shenchong_target;
			target.removeSkill(["feiyang", "bahu"]);
			if (trigger.source && trigger.source.isIn() && trigger.source.countCards("h")) {
				await trigger.source.discard(trigger.source.getCards("h"));
			}
		},
	},
	// 飞扬：锁定技，你使用【杀】无次数限制。
	feiyang: {
		audio: 2,
		mod: {
			cardUsable(card) {
				if (card.name === "sha") {
					return Infinity;
				}
			},
		},
	},
	// 跋扈：锁定技，你使用牌无距离限制。
	bahu: {
		audio: 2,
		mod: {
			targetInRange() {
				return true;
			},
		},
	},

	// ============ 刘辩（liubian） ============
	// 诗怨：每回合每项限一次，当你成为其他角色使用牌的目标后：若其体力值大于你，你可以摸
	// 两张牌；否则，你可以摸一张牌。
	shiyuan: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			if (!event.player || event.player === player) {
				return false;
			}
			const branch = event.player.hp > player.hp ? "gt" : "le";
			return player.storage["shiyuan_" + branch + "_round"] !== game.roundNumber;
		},
		async cost(event, trigger, player) {
			const branch = trigger.player.hp > player.hp ? "gt" : "le";
			event.result = await player.chooseBool(`诗怨：是否摸${branch === "gt" ? "两" : "一"}张牌？`).forResult();
		},
		async content(event, trigger, player) {
			const branch = trigger.player.hp > player.hp ? "gt" : "le";
			player.storage["shiyuan_" + branch + "_round"] = game.roundNumber;
			await player.draw(branch === "gt" ? 2 : 1);
		},
	},
	// 毒逝：锁定技，你将受到伤害时，改为失去等量体力。
	dushi: {
		audio: 2,
		trigger: { player: "damageBefore" },
		forced: true,
		async content(event, trigger, player) {
			trigger.cancel();
			await player.loseHp(trigger.num);
		},
	},

	// ============ 杜预（duyu） ============
	// 武库：锁定技，当与你势力不同的角色使用装备牌时，你获得1枚“武库”标记（至多3枚）。
	dy_wuku: {
		audio: 2,
		trigger: { global: "useCardAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.player && event.player !== player && event.player.isEnemyOf(player) && get.type(event.card) === "equip" && player.countMark("dy_wuku") < 3;
		},
		content(event, trigger, player) {
			player.addMark("dy_wuku", 1);
		},
		marktext: "库",
		intro: {
			content: "mark",
		},
	},
	// 灭吴：每回合限一次，你可以弃置1枚“武库”标记，然后将一张牌当任意一张非装备牌使用或
	// 打出。
	dy_miewu: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countMark("dy_wuku") > 0 && player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseCard("he", "灭吴：选择一张牌", true).forResult();
		},
		async content(event, trigger, player) {
			const card = event.cards[0];
			player.removeMark("dy_wuku", 1);
			const names = ["sha", "shan", "tao", "jiu", "wuzhong", "guohe", "shunshou", "juedou", "nanman", "wanjian", "wuxie", "lebu", "bingliang", "shandian", "tiesuo", "huogong", "taoyuan"].filter(name => lib.card[name]);
			const result = await player
				.chooseControl(names)
				.set("prompt", "灭吴：将此牌当任意一张非装备牌使用或打出")
				.set("choiceList", names.map(name => get.translation(name)))
				.forResult();
			const vcard = get.autoViewAs({ name: result.control }, [card]);
			await player.chooseUseTarget(vcard, true, false).forResult();
		},
	},

	// ============ 严夫人（yanfuren） ============
	// 谗逆：出牌阶段限一次，你可以选择一名其他角色并交给其至少一张手牌，然后其可以将一张
	// 手牌当【决斗】使用：若其因此造成伤害，其摸一张牌；若其因此受到伤害，你弃置所有手牌。
	channi: {
		aiShowTag: "draw",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target !== player && player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const target = event.target;
			await player.chooseToGive(target, "h", true, `谗逆：选择至少一张手牌交给${get.translation(target)}`, [1, player.countCards("h")]).forResult();
			if (!target.isIn() || !target.countCards("h") || !target.canUse({ name: "juedou", isCard: true }, null, false)) {
				return;
			}
			const dealtBefore = target.getHistory("sourceDamage").length;
			const takenBefore = target.getHistory("damage").length;
			const result = await target.chooseUseTarget(get.autoViewAs({ name: "juedou", isCard: true }), true, false).forResult();
			if (!result || !result.bool) {
				return;
			}
			if (target.isIn()) {
				if (target.getHistory("sourceDamage").length > dealtBefore) {
					await target.draw();
				}
				if (target.getHistory("damage").length > takenBefore && player.countCards("he")) {
					await player.discard(player.getCards("he"));
				}
			}
		},
	},
	// 匿伏：锁定技，每名角色的回合结束时，你将手牌摸至或弃至三张。
	nifu: {
		audio: 2,
		trigger: { global: "phaseAfter" },
		forced: true,
		filter(event, player) {
			return player.countCards("h") !== 3;
		},
		async content(event, trigger, player) {
			const num = player.countCards("h");
			if (num < 3) {
				await player.draw(3 - num);
			} else if (num > 3) {
				await player.chooseToDiscard(num - 3, "h", true).forResult();
			}
		},
	},
};

applyAiShowGates(skill);

export default skill;
