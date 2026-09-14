import { lib, game, ui, get, ai, _status } from "noname";
import { applyAiShowGates } from "./aiShow.js";

// 合纵标记通用判定：字面上带有"_lianheng"获得标记的牌（写法与guozhan模式gzhongyuan/gzwanyi
// 等技能的card.hasGaintag("_lianheng")约定一致），或者孙权"嘉禾"(jiahe)赋予的"己方桃/五谷
// 丰登视为合纵标记"规则。孙权jiahe与诸葛瑾olhongyuan共用这一份判定，避免各写各的。
function hasLianhengTag(card, owner) {
	if (!card) {
		return false;
	}
	// 与国战模式自带的_lianheng判定保持一致：牌面印刷的合纵标记(card.hasTag("lianheng"))
	// 与技能赋予的"_lianheng"获得标记都算
	if (typeof card.hasTag === "function" && card.hasTag("lianheng")) {
		return true;
	}
	if (typeof card.hasGaintag === "function" && card.hasGaintag("_lianheng")) {
		return true;
	}
	// 五谷丰登的卡牌id是wugu
	if (owner && ["tao", "wugu"].includes(get.name(card))) {
		// isFriendOf 对未明置（势力未定）的一方返回 false，正好满足"与你势力相同"的要求
		return game.hasPlayer(current => current.isIn() && current.hasSkill("jiahe") && typeof current.isFriendOf === "function" && current.isFriendOf(owner));
	}
	return false;
}

// 找到触发某个游戏事件(event)的"外部发起者"：沿着getParent()链向上找第一个带有.player属性的
// 祖先事件，把它当作"是谁的技能/行动导致了这个事件"。用于孔融"忠事"判断暗置/移除自己的武将牌
// 是否是"其他角色"造成的（hideCharacter/removeCharacter事件本身的.player固定是被暗置/移除
// 的那个人，不能反映真正的发起者，需要往上找）。找不到时返回null（视为无法判定，不做处理）。
function findExternalActor(event, self) {
	let e = event && event.getParent ? event.getParent() : null;
	while (e) {
		if (e.player) {
			return e.player;
		}
		e = e.getParent ? e.getParent() : null;
	}
	return null;
}

const skill = {
	// 甚贤：当其他角色于你的回合外因弃置而失去基本牌后，若你的手牌数不大于体力上限的两倍，你可以摸一张牌。
	// 跟官方版不同：去掉了"每名角色的回合限一次"的限制，换成手牌数上限的门槛。
	// 参考: skill_refer/sp/skill.js 的 shenxian技能
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
	// 参考: skill_refer/sp/skill.js 的 qiangwu技能
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
	// 参考: skill_refer/sixiang/skill.js 的 stdjuezhu技能
	stdjuezhu: {
		aiShowTag: "defense",
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
	// 修复: 官方参考(sixiang的stdjuezhu_paoxiao子技能)是对所有牌都无次数限制，
	// 而不仅仅是【杀】——卡面描述"你本回合使用牌无次数限制"也没有限定牌名，之前误写成了只对sha生效。
	stdjuezhu_buff: {
		charlotte: true,
		mod: {
			cardUsable() {
				return Infinity;
			},
		},
	},
	// 承继：你可以将两张颜色不同的牌当【杀】使用或打出。
	// 参考: skill_refer/sixiang/skill.js 的 stdchengji技能
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
	// 参考: skill_refer/sp2/skill.js 的 rewenji技能
	rewenji: {
		aiShowTag: "support",
		aiShowCost: true,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.countCards("he") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("rewenji"), (card, player, target) => target != player && target.countCards("he") > 0).forResult();
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
				const back = await player.chooseCard("he", true, `问计：交给${get.translation(target)}一张除此牌外的牌`, cardx => cardx != card).forResult();
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
	// 参考: skill_refer/sp2/skill.js 的 sptunjiang技能
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
	// 参考: mode/guozhan/src/skill/character/rest.js 的 gztongling技能（不在skill_refer目录内，
	// 但彭羕在skill_refer各包均无同名武将，国战模式的双势力版是engine自带的最贴近参考）
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
	// 参考: mode/guozhan/src/skill/character/rest.js 的 gzjinyu技能（同上，非skill_refer目录）
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
	// 参考: mode/guozhan/src/skill/character/rest.js 的 gzbaolie技能（非skill_refer目录）
	baolie: {
		aiShowTag: "offense",
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
		// 修复: 之前用cardUsable让【杀】对所有目标都无次数限制，范围过大——卡面写的是
		// "你对体力值不小于你的其他角色使用【杀】...无次数限制"，只应该对这类目标生效。
		// 参考官方gzbaolie用cardUsableTarget按目标豁免次数限制的写法改成这样。
		mod: {
			targetInRange(card, player, target) {
				if (card.name == "sha" && target.hp >= player.hp) {
					return true;
				}
			},
			cardUsableTarget(card, player, target) {
				if (card.name == "sha" && target.hp >= player.hp) {
					return true;
				}
			},
		},
	},

	// ============ 傅士仁（hb_fushiren） ============
	// 锋势：使用牌指定唯一目标后，若其手牌数小于你，你可以弃你与其各一张牌，令此牌不可被响应且伤害+1；
	// 此牌造成伤害后本技能本回合失效。
	// 锋势：使用牌指定唯一目标后，若其手牌数小于你，你可以弃你与其各一张牌，令此牌不可被响应且伤害+1；
	// 此牌造成伤害后本技能本回合失效。
	// 参考: skill_refer/sp2/_merged.md 的 sp_mifangfushiren-fengshi（技能名：锋势），效果与本实现基本一致
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
			event.result = await player.chooseBool(`锋势：是否弃置你与${get.translation(target)}各一张牌，令此牌不可被响应且伤害+1？`).forResult();
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
	// 参考: skill_refer/standard/skill.js 的 rende技能
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
	// 参考: skill_refer/jsrg/skill.js 的 jsrgzhenqiao技能（几乎逐字照抄）
	zhenqiao: {
		aiShowTag: "offense",
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
	// 原创技能，无官方参考（skill_refer/extra里同名的wuhun/new_wuhun实为"杀死你的角色会被
	// 反噬/连带伤害"等完全不同的效果，并非"杀死你的角色无法用桃回血"，非有效参考）
	wuhun: {
		aiShowTag: "control",
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
	// 参考: mode/guozhan/src/skill/character/normal.js 的 gz_wusheng技能（非skill_refer目录，
	// 已去掉双势力守约机制条款，与本文件顶部注释一致）
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
	// 义绝：每回合限一次，你可以弃一张牌，然后令一名其他角色展示一张牌：黑色则暗置其一张武将牌
	// （且本回合不能明置）；红色则你获得之。
	// 参考: skill_refer/refresh/skill.js 的 new_yijue技能（refresh包里key为"yijue"的是另一个
	// 无关武将的同名巧合，真正对应关羽的是new_yijue）。经用户纠正：卡面"暗置"对应的是"明置"的
	// 反面，不是"翻面"，故黑色分支改用本项目已确认可用的player.hideCharacter(slot)机制实现
	// （选择武将牌写法参考本文件"倾城"reqingcheng技能）。"本回合不能明置"没有通用的禁止明置
	// 钩子，退而求其次用yijue_lock子技能监听showCharacterAfter，一旦检测到目标由暗置变为
	// 明置就立刻重新hide回去，实现"事实上不能明置"的效果（子技能通过{global:"phaseAfter"}
	// 挂到本回合结束失效，写法参考本文件"潜袭"qianxi_lock的用法）。
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
				const slots = target.name2 ? [0, 1] : [0];
				const available = slots.filter(slot => !target.isUnseen(slot));
				if (available.length) {
					let slot = available[0];
					if (available.length > 1) {
						const result2 = await player
							.chooseControl("主将", "副将")
							.set("prompt", "义绝：请选择暗置" + get.translation(target) + "的哪张武将牌")
							.forResult();
						slot = result2.control == "主将" ? 0 : 1;
					}
					await target.hideCharacter(slot);
					target.storage.yijue_lockslot = slot;
					target.addTempSkill("yijue_lock", { global: "phaseAfter" });
				}
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
	// 义绝辅助：本回合内一旦目标由暗置变为明置，立刻重新暗置回去，实现"本回合不能明置"。
	yijue_lock: {
		charlotte: true,
		trigger: { player: "showCharacterAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			const slot = player.storage.yijue_lockslot;
			return slot != null && event.toShow && event.toShow.length && (event.num == 2 || event.num == slot);
		},
		async content(event, trigger, player) {
			await player.hideCharacter(player.storage.yijue_lockslot, false);
		},
	},

	// ============ 张飞（zhangfei） ============
	// 咆哮：锁定技，【杀】不限次数；本回合第一张【杀】被抵消后，下一次【杀】伤害+1；每回合第二张
	// 【杀】使用时摸一张牌。
	// 参考: skill_refer/standard/skill.js 的 paoxiao技能（官方版为纯粹的无次数限制锁定技，
	// 这里在此基础上按卡面描述加上了"被抵消后下次伤害+1""每回合第二杀摸牌"的额外机制）
	paoxiao: {
		aiShowTag: "offense",
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
				const count = (player.storage.paoxiao_count = (player.storage.paoxiao_count || 0) + 1);
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
		ai: {
			unequip: true,
			skillTagFilter(player, tag, arg) {
				if (!get.zhu(player, "shouyue")) {
					return false;
				}
				if (arg && arg.name == "sha") {
					return true;
				}
				return false;
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
	// 参考: skill_refer/standard/skill.js 的 guanxing技能（问天=观星+额外的当【无懈可击】/
	// 【火攻】使用效果，key不同是因为在原有观星基础上扩展了新效果）
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
			const num = Math.min(
				5,
				game.countPlayer(current => current.isIn())
			);
			if (num > 0) {
				await player.chooseToGuanxing(num).set("prompt", "问天：观看牌堆顶的牌，将其以任意顺序置于牌堆顶或牌堆底").forResult();
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
		ai: {
			threaten: 1.2,
			guanxing: true,
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
	// 参考: skill_refer/standard/skill.js 的 kongcheng技能
	kongcheng: {
		aiShowTag: "defense",
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
		ai: {
			noh: true,
			skillTagFilter(player, tag) {
				if (tag === "noh") {
					if (player.countCards("h") != 1) {
						return false;
					}
				}
			},
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
	// 参考: skill_refer/standard/skill.js 的 longdan技能
	longdan: {
		aiShowTag: "response",
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
			event.result = await player.chooseTarget(get.prompt2("longdan_counter"), (card, player, target) => target != player && target != trigger.player).forResult();
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
			event.result = await player.chooseTarget(get.prompt2("longdan_relief"), (card, player, target) => target != player && target != trigger.source && target.isDamaged()).forResult();
		},
		async content(event, trigger, player) {
			if (event.targets && event.targets[0]) {
				await event.targets[0].recover();
			}
		},
	},
	// 冲阵：当你发动"龙胆"时，你可以弃置对方的一张手牌。
	// 参考: skill_refer/sp/skill.js 的 chongzhen技能
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
		ai: {
			combo: "ollongdan",
			mingzhi: false,
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "respondShan") || get.tag(card, "respondSha")) {
						if (get.attitude(target, player) <= 0) {
							if (current > 0) {
								return;
							}
							if (target.countCards("h") == 0) {
								return 1.6;
							}
							if (target.countCards("h") == 1) {
								return 1.2;
							}
							if (target.countCards("h") == 2) {
								return [0.8, 0.2, 0, -0.2];
							}
							return [0.4, 0.7, 0, -0.7];
						}
					}
				},
			},
		},
	},

	// ============ 马超 ============
	// 马术：锁定技，你与其他角色的距离-1。（与官方版一致）
	// 参考: skill_refer/standard/skill.js 的 mashu技能
	mashu: {
		aiShowTag: "offense",
		mod: {
			globalFrom(from, to, distance) {
				return distance - 1;
			},
		},
	},

	// 追命：当你使用【杀】指定唯一目标时，你可以使其一张武将牌的非锁定技失效，
	// 然后声明一种颜色并令目标角色弃置任意张牌，然后你展示其一张牌，
	// 若此牌颜色与你声明的相同，则你选择一项，此【杀】：不能被响应/伤害+1/不计入次数限制。
	// 参考: skill_refer/jsrg/skill.js 的 jsrgzhuiming技能（在其基础上加了前置的"令一项非
	// 锁定技失效"步骤，并把命中颜色后的效果从"全部生效"改成了"三选一"，与卡面描述一致）
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
			event.result = await player
				.chooseBool("追命：是否发动？")
				.set("prompt2", `令${get.translation(trigger.target)}的一项非锁定技失效，然后声明一种颜色并令其弃牌`)
				.forResult();
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
			const bonus = await player.chooseControl(["不能被响应", "伤害+1", "不计入次数限制"], "cancel2").set("prompt", "追命：此【杀】颜色猜中，请选择获得的效果").forResult();
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
	// 参考: skill_refer/standard/skill.js 的 jizhi技能
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
	// 参考: skill_refer/standard/skill.js 的 qicai技能
	qicai: {
		aiShowTag: "defense",
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
	// 参考: skill_refer/shenhua/skill.js 的 xinliegong技能
	xinliegong: {
		aiShowTag: "offense",
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
		check(event, player) {
			return get.attitude(player, event.target) <= 0;
		},
	},

	// 摧锋：限定技，出牌阶段，你可以失去一点体力视为使用一张无距离限制的单目标伤害牌，
	// 此回合结束时，若此牌的目标于此回合受到的伤害值不为1，你重置此技能。
	// 摧锋：限定技，出牌阶段，你可以失去一点体力，视为使用一张无距离限制的单目标伤害牌，
	// 此回合结束时，若此牌的目标于此回合受到的伤害值不为1，你重置此技能。照抄集换包
	// "合曹芳"旁支jsrg_huangzhong的同名技能"jsrgcuifeng"的选牌/判定结构，在此基础上
	// 加上"失去1点体力"的代价（原版免费发动）。
	// 参考: skill_refer/jsrg/skill.js 的 jsrgcuifeng技能
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
				return _status.event.getParent().filterCard({ name: button.link[2], nature: button.link[3], isCard: true, storage: { cuifeng: true } }, player, _status.event.getParent());
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
	// 参考: skill_refer/shenhua/skill.js 的 xinkuanggu技能
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
	// 原创技能，无官方参考
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
	// 参考: skill_refer/shenhua/skill.js 的 lianhuan技能——这是"连环"这个技能在官方全部
	// 25个包里唯一的真实代码实现（skill_refer/refresh的ollianhuan、skill_refer/mobile的
	// xinlianhuan都是inherit:"lianhuan"复用它），filterCard/filterTarget/selectTarget/
	// filterOk/viewAs/precontent/content照抄（"使用或重铸"二选一靠这几个函数配合
	// event._backup/ui.selected实现，是这个引擎里"一张viewAs牌可以同时支持使用与重铸"的
	// 标准写法，没有更简单的等价API）。
	// 修复：1. 原实现enable:["chooseToUse","chooseToRespond"]，完全没有走上面这套filterCard/
	// filterOk流程，"重铸"这半句卡面描述在游戏里没有对应按钮——现按官方写法换成
	// enable:"chooseToUse"+完整的filterCard/filterTarget/selectTarget/filterOk。
	// 2. 原实现想用mod:{selectTarget(){return [range[0],4]}}把目标数上限从2改成4，但
	// "selectTarget"在这个引擎里根本不是任何地方用过的mod钩子名（本项目、25个官方包、国战
	// 模式全都没有这个用法），对UI的目标选择数量完全不起作用。真正官方的"追加目标"写法是
	// skill_refer/mobile的xinlianhuan_add（新连环，用useCard2触发在牌结算前追加一个目标）：
	// 铁索连环卡本身selectTarget是[1,2]，让初次选择维持官方的[1,2]，改用同款useCard2追加
	// 目标的子技能lianhuan_add一次性补齐到最多4个，而不是徒劳地改一个不存在的mod钩子。
	lianhuan: {
		aiShowTag: "support",
		audio: 2,
		hiddenCard(player, name) {
			return name == "tiesuo" && player.hasCard(card => get.suit(card) == "club", "sh");
		},
		enable: "chooseToUse",
		filter(event, player) {
			if (!player.hasCard(card => get.suit(card) == "club", "sh")) {
				return false;
			}
			return event.type == "phase" || event.filterCard(get.autoViewAs({ name: "tiesuo" }, "unsure"), player, event);
		},
		position: "hs",
		filterCard(card, player, event) {
			if (!event) {
				event = _status.event;
			}
			if (get.suit(card) != "club") {
				return false;
			}
			if (event.type == "phase" && get.position(card) != "s" && player.canRecast(card)) {
				return true;
			} else {
				if (game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false) {
					return false;
				}
				const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
				return event._backup.filterCard(cardx, player, event);
			}
		},
		filterTarget(fuck, player, target) {
			const card = ui.selected.cards[0],
				event = _status.event,
				backup = event._backup;
			if (!card || game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false) {
				return false;
			}
			const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
			return backup.filterCard(cardx, player, event) && backup.filterTarget(cardx, player, target);
		},
		selectTarget() {
			const card = ui.selected.cards[0],
				event = _status.event,
				player = event.player,
				backup = event._backup;
			let recast = false,
				use = false;
			const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
			if (event.type == "phase" && player.canRecast(card)) {
				recast = true;
			}
			if (card && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false) {
				if (backup.filterCard(cardx, player, event)) {
					use = true;
				}
			}
			if (!use) {
				return [0, 0];
			} else {
				const select = backup.selectTarget(cardx, player);
				if (recast && select[0] > 0) {
					select[0] = 0;
				}
				return select;
			}
		},
		filterOk() {
			const card = ui.selected.cards[0],
				event = _status.event,
				player = event.player,
				backup = event._backup;
			const selected = ui.selected.targets.length;
			let recast = false,
				use = false;
			const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
			if (event.type == "phase" && player.canRecast(card)) {
				recast = true;
			}
			if (card && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false) {
				if (backup.filterCard(cardx, player, event)) {
					use = true;
				}
			}
			if (recast && selected == 0) {
				return true;
			} else if (use) {
				const select = backup.selectTarget(cardx, player);
				if (select[0] <= -1) {
					return true;
				}
				return selected >= select[0] && selected <= select[1];
			}
		},
		ai1(card) {
			return 6 - get.value(card);
		},
		ai2(target) {
			const player = get.player();
			const card = ui.selected.cards[0],
				event = _status.event,
				backup = event._backup;
			if (!card || game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false) {
				return 0;
			}
			const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
			if (backup.filterCard(cardx, player, event) && backup.filterTarget(cardx, player, target)) {
				return get.effect(target, { name: "tiesuo" }, player, player);
			}
			return 0;
		},
		discard: false,
		lose: false,
		delay: false,
		viewAs(cards, player) {
			return {
				name: "tiesuo",
			};
		},
		prepare: () => true,
		async precontent(event, trigger, player) {
			const result = event.result;
			if (!result?.targets?.length) {
				delete result.card;
			}
		},
		async content(event, trigger, player) {
			await player.recast(event.cards);
		},
		group: "lianhuan_add",
		subSkill: {
			add: {
				charlotte: true,
				trigger: { player: "useCard2" },
				filter(event, player) {
					if (event.card.name != "tiesuo" || event.targets.length >= 4) {
						return false;
					}
					return game.hasPlayer(current => !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, player, current));
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const max = 4 - trigger.targets.length;
					const result = await player
						.chooseTarget(max > 1 ? [1, max] : 1, get.prompt("lianhuan"), "为" + get.translation(trigger.card) + "额外指定至多" + get.cnNumber(max) + "个目标", (card, player, target) => {
							return !_status.event.sourcex.includes(target) && lib.filter.targetEnabled2(_status.event.card, player, target);
						})
						.set("sourcex", trigger.targets)
						.set("ai", target => {
							const player = _status.event.player;
							return get.effect(target, _status.event.card, player, player);
						})
						.set("card", trigger.card)
						.forResult();
					if (!result.bool || !result.targets?.length) {
						return;
					}
					const targets = result.targets;
					player.logSkill("lianhuan_add", targets);
					trigger.targets.addArray(targets);
					game.log(targets, "也成为了", trigger.card, "的目标");
				},
			},
		},
		ai: {
			order(item, player) {
				if (game.hasPlayer(current => get.effect(current, { name: "tiesuo" }, player, player) > 0) || player.hasCard(card => get.suit(card) == "club" && player.canRecast(card), "h")) {
					return 8;
				}
				return 1;
			},
			result: { player: 1 },
		},
	},

	// 涅槃：限定技，当你处于濒死状态时，你可以弃置你区域里的所有牌，摸X张牌，体力回复至X点，
	// 并复原你的武将牌。(X为你的体力上限)
	// 参考: skill_refer/shenhua/skill.js 的 oldniepan技能
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
	// 参考: skill_refer/shenhua/skill.js 的 tiaoxin技能
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
					.chooseToUse(
						function (card, player, event) {
							if (get.name(card) != "sha") {
								return false;
							}
							return lib.filter.filterCard.apply(this, arguments);
						},
						"挑衅：对" + get.translation(player) + "使用一张【杀】"
					)
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
	// 原创技能，无官方参考（skill_refer各包搜不到"遗志"，guozhan模式的姜维"yizhi"是完全
	// 不同架构的viceSkill继承机制，无法作为结构参考）
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
			const num = Math.min(
				5,
				game.countPlayer(current => current.isIn())
			);
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
	// 参考: skill_refer/shenhua/skill.js 的 fangquan技能（在官方"弃一张手牌"选项基础上按卡面
	// 描述加上了"使用一张非伤害类牌"的另一种代价选项）
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
	// 参考: skill_refer/shenhua/skill.js 的 xiangle技能
	xiangle: {
		aiShowTag: "defense",
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
		ai: {
			effect: {
				target(card, player, target, current) {
					if (card.name == "sha" && get.attitude(player, target) < 0) {
						if (_status.event.name == "xiangle") {
							return;
						}
						if (get.attitude(player, target) > 0 && current < 0) {
							return "zerotarget";
						}
						const bs = player.getCards("h", { type: "basic" });
						bs.remove(card);
						if (card.cards) {
							bs.removeArray(card.cards);
						} else {
							bs.removeArray(ui.selected.cards);
						}
						if (!bs.length) {
							return "zerotarget";
						}
						if (player.hasSkill("jiu") || player.hasSkill("tianxianjiu")) {
							return;
						}
						if (bs.length <= 2) {
							for (let i = 0; i < bs.length; i++) {
								if (get.value(bs[i]) < 7) {
									return [1, 0, 1, -0.5];
								}
							}
							return [1, 0, 0.3, 0];
						}
						return [1, 0, 1, -0.5];
					}
				},
			},
		},
	},

	// ============ 孟获 ============
	// 祸首：锁定技，【南蛮入侵】对你无效；当其他角色使用【南蛮入侵】指定目标后，你代替其成为此牌的伤害来源。
	// 参考: skill_refer/shenhua/skill.js 的 huoshou/huoshou1/huoshou2技能（几乎逐字照抄）
	huoshou: {
		aiShowTag: "aoe",
		locked: true,
		group: ["huoshou1", "huoshou2"],
		preHidden: ["huoshou1", "huoshou2"],
		ai: {
			halfneg: true,
			effect: {
				target(card, player, target) {
					if (card.name == "nanman") {
						return "zeroplayertarget";
					}
				},
			},
		},
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
	// 参考: skill_refer/refresh/skill.js 的 rezaiqi技能（结构一致，X的统计范围按卡面描述
	// 收窄为"本回合"，而非官方版的整个弃牌堆红色牌数）
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
			const result = await player.chooseTarget([0, Math.min(x, candidates.length)], (card, plyr, target) => target.isFriendOf(player), "再起：请选择至多" + x + "名与你势力相同的角色").forResult();
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
	// 参考: skill_refer/shenhua/skill.js 的 juxiang/juxiang1/juxiang2技能（几乎逐字照抄）
	juxiang: {
		aiShowTag: "aoe",
		locked: true,
		group: ["juxiang1", "juxiang2"],
		preHidden: ["juxiang1", "juxiang2"],
		ai: {
			effect: {
				target(card) {
					if (card.name == "nanman") {
						return [0, 1, 0, 0];
					}
				},
			},
		},
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
	// 参考: skill_refer/shenhua/skill.js 的 lieren技能（官方版触发点是"使用杀造成伤害后"且
	// 输拼点无效果；这里按卡面改成了"使用杀指定目标后"触发，并加上了"没赢则双方各获得对方
	// 拼点牌"的效果）
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
		check(event, player) {
			return get.attitude(player, event.player) < 0 && player.countCards("h") > 1;
		},
	},

	// ============ 甘夫人 ============
	// 神智：准备阶段，你可以选择一名角色，弃置其一个区域中的最后一张牌或你的所有手牌，然后其回复1点体力。
	// 参考: skill_refer/sp/skill.js 的 shenzhi技能（官方版只能弃置自己的手牌并给自己回血；
	// 这里按卡面改成了可选任意角色、弃置其某区域最后一张牌或自己全部手牌，回血给该角色）
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
		check(event, player) {
			if (player.hp > 2) {
				return false;
			}
			var cards = player.getCards("h");
			if (cards.length < player.hp) {
				return false;
			}
			if (cards.length > 3) {
				return false;
			}
			for (var i = 0; i < cards.length; i++) {
				if (get.value(cards[i]) > 7 || get.tag(cards[i], "recover") >= 1) {
					return false;
				}
			}
			return true;
		},
	},

	// 淑慎：每回合各限一次，当你回复1点体力后，你可以令一名其他角色摸两张牌；
	// 当你一次性获得至少两张牌后，你可以令一名其他角色回复1点体力。
	// 参考: skill_refer/standard/skill.js 的 stdshushen技能（官方版只有"回复体力后令目标摸牌"
	// 单向效果；这里按卡面拆成了stdshushen1/2两个方向，多加了"一次获得至少两张牌后令目标回血"）
	stdshushen: {
		aiShowTag: "support",
		locked: true,
		group: ["stdshushen1", "stdshushen2"],
		preHidden: ["stdshushen1", "stdshushen2"],
		ai: { threaten: 0.8, expose: 0.1 },
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
	// 参考: skill_refer/yijiang/skill.js 的 xinwuyan技能（完全一致）
	xinwuyan: {
		aiShowTag: "defense",
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
		ai: {
			notrick: true,
			notricksource: true,
			effect: {
				target(card, player, target, current) {
					if (get.type(card) == "trick" && get.tag(card, "damage")) {
						return "zeroplayertarget";
					}
				},
				player(card, player, target, current) {
					if (get.type(card) == "trick" && get.tag(card, "damage")) {
						return "zeroplayertarget";
					}
				},
			},
		},
	},
	// 举荐：限定技，准备阶段，你可以选择一名其他角色，将此武将牌与其对应位置的一张武将牌交换。
	// 原创技能，无官方参考（skill_refer/yijiang与sixiang里同名的xinjujian/jujian/stdjujian都是
	// 与"交换武将牌"完全无关的弃牌类技能，key和中文名"举荐"的巧合，非有效参考）
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
	// 参考: skill_refer/sp/skill.js 的 shengxi技能（触发时机按卡面"弃牌阶段结束时"改成了
	// phaseDiscardEnd，官方版是phaseDiscardBegin）
	shengxi: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "phaseDiscardEnd" },
		filter(event, player) {
			return !player.getHistory("sourceDamage").length;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("shengxi"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
	},
	// 守成：当一名与你势力相同的角色于其回合外失去最后的手牌后，你可以令该角色摸一张牌。
	// 参考: skill_refer/sp/skill.js 的 shoucheng技能（照搬官方的触发时机列表与 event.getl(current).hs
	// 判定；同一事件里可能有多名角色同时失去最后的手牌，故用 direct + 逐个询问。卡面未排除自己，
	// isFriendOf(自己) 为 true，因此自己于回合外失去最后手牌时同样可以发动）
	shoucheng: {
		aiShowTag: "draw",
		audio: 2,
		trigger: {
			global: ["equipAfter", "addJudgeAfter", "loseAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		direct: true,
		filter(event, player) {
			return game.hasPlayer(current => {
				if (current == _status.currentPhase || !current.isFriendOf(player)) {
					return false;
				}
				const evt = event.getl(current);
				return evt && evt.hs && evt.hs.length && current.countCards("h") == 0;
			});
		},
		async content(event, trigger, player) {
			const list = game
				.filterPlayer(current => {
					if (current == _status.currentPhase || !current.isFriendOf(player)) {
						return false;
					}
					const evt = trigger.getl(current);
					return evt && evt.hs && evt.hs.length;
				})
				.sortBySeat(_status.currentPhase || player);
			for (const target of list) {
				if (!target.isIn() || target.countCards("h") > 0) {
					continue;
				}
				const result = await player
					.chooseBool(get.prompt2("shoucheng", target))
					.set("ai", () => get.attitude(player, target) > 0)
					.forResult();
				if (result.bool) {
					player.logSkill("shoucheng", target);
					await target.draw();
				}
			}
		},
		ai: {
			threaten: 1.3,
		},
	},

	// ============ 马岱 old_madai ============
	// 潜袭：以官方 skill_refer/yijiang/skill.js 的 qianxi 技能为基础（摸一弃一后选距离1角色，
	// 本回合其不能用/打出同色手牌，check/ai沿用官方directHit_ai+skillTagFilter逻辑判断该锁定
	// 是否已让目标无法响应），按卡面追加两条效果：①你使用牌无视目标该颜色防具（qianxi_ignore）；
	// ②若目标本回合未失去过牌且受到伤害，出牌阶段结束你摸两张（qianxi_draw）。
	// "无视其该颜色的防具"：防具技能（八卦/仁王盾等）都会用 hasSkillTag("unequip", false, {name, target, card})
	// 询问攻击方，qianxi_ignore 就在这个钩子里比较目标防具的颜色与被弃牌的颜色。
	qianxi: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player && get.distance(player, current) <= 1);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("qianxi"))
				.set("ai", () => game.hasPlayer(current => current != player && get.distance(player, current) <= 1 && get.attitude(player, current) < 0))
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
			const discard = await player
				.chooseToDiscard({
					position: "he",
					forced: true,
					prompt2: get.prompt2("qianxi") + "：请弃置一张牌",
					ai(card) {
						const player = get.player();
						if (get.color(card, player)) {
							return 7 - get.value(card, player);
						}
						return 4 - get.value(card, player);
					},
				})
				.forResult();
			if (!discard.bool || !discard.cards?.length || !game.hasPlayer(current => current != player && get.distance(player, current) <= 1)) {
				return;
			}
			const color = get.color(discard.cards[0], discard.cards[0].original === "h" ? player : false);
			const choose = await player
				.chooseTarget({
					prompt: "潜袭：选择一名距离为1的角色",
					filterTarget(card, player, target) {
						return target != player && get.distance(player, target) <= 1;
					},
					forced: true,
					ai(target) {
						return -get.attitude(get.player(), target);
					},
				})
				.forResult();
			if (!choose.bool || !choose.targets?.length) {
				return;
			}
			const target = choose.targets[0];
			player.line(target, "green");
			target.storage.qianxi_lockcolor = color;
			target.addTempSkill("qianxi_lock", { global: "phaseAfter" });
			target.markSkill("qianxi_lock");
			player.storage.qianxi_target = target;
			player.storage.qianxi_lockcolor = color;
			player.addTempSkill("qianxi_ignore", { global: "phaseAfter" });
			// 摸牌判定挂到本回合结束才移除（子技能自身在 phaseUseEnd 触发，到期时机不能与之相同）
			player.addTempSkill("qianxi_draw", { player: "phaseAfter" });
		},
		// 沿用官方 qianxi 的 directHit_ai + skillTagFilter：让AI判断“目标已被潜袭锁色”时更倾向直接
		// 出杀/黑色牌（因为对方可能无法用同色闪/无懈应对），逻辑改为读取本地 qianxi_lock/qianxi_lockcolor。
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (tag !== "directHit_ai" || !arg.target.hasSkill("qianxi_lock")) {
					return false;
				}
				if (arg.card.name == "sha") {
					return arg.target.storage.qianxi_lockcolor == "red" && (!arg.target.hasSkillTag("freeShan", false, { player: player, card: arg.card, type: "use" }, true) || player.hasSkillTag("unequip", false, { name: arg.card ? arg.card.name : null, target: arg.target, card: arg.card }) || player.hasSkillTag("unequip_ai", false, { name: arg.card ? arg.card.name : null, target: arg.target, card: arg.card }));
				}
				return arg.target.storage.qianxi_lockcolor == "black";
			},
		},
	},
	// 潜袭辅助：本回合内目标不能使用/打出与被弃置牌同色的手牌（结构同官方qianxi2的cardEnabled2锁色）
	qianxi_lock: {
		charlotte: true,
		onremove(player) {
			delete player.storage.qianxi_lockcolor;
		},
		mod: {
			cardEnabled2(card, player) {
				if (get.position(card) == "h" && get.color(card, player) == player.storage.qianxi_lockcolor) {
					return false;
				}
			},
		},
		intro: {
			content(_, player) {
				return "不能使用或打出" + get.translation(player.storage.qianxi_lockcolor) + "的手牌";
			},
		},
	},
	// 潜袭辅助：你使用牌无视目标该颜色的防具（比较的是目标装备区防具的颜色）；本回合结束移除时顺带清理 storage
	qianxi_ignore: {
		charlotte: true,
		onremove(player) {
			delete player.storage.qianxi_target;
			delete player.storage.qianxi_lockcolor;
		},
		ai: {
			unequip: true,
			skillTagFilter(player, tag, arg) {
				if (tag != "unequip" || !arg || !arg.target) {
					return false;
				}
				if (arg.target != player.storage.qianxi_target) {
					return false;
				}
				const armor = arg.target.getEquip(2);
				return !!armor && get.color(armor) == player.storage.qianxi_lockcolor;
			},
		},
	},
	// 潜袭辅助：出牌阶段结束时结算摸牌
	qianxi_draw: {
		aiShowTag: "defense",
		charlotte: true,
		trigger: { player: "phaseUseEnd" },
		forced: true,
		filter(event, player) {
			const target = player.storage.qianxi_target;
			return target && target.isIn() && !target.getHistory("lose").length && target.getHistory("damage").length > 0;
		},
		async content(event, trigger, player) {
			player.removeSkill("qianxi_draw");
			await player.draw(2);
		},
	},

	// ============ 沙摩柯 shamoke ============
	// 蒺藜：一回合内使用/打出第X张牌时可摸X张（X为攻击范围）；回合结束可重铸武器牌。
	// 参考: skill_refer/sp/skill.js 的 gzjili技能（摸牌部分照抄，重铸武器部分是按卡面新增的）
	gzjili: {
		aiShowTag: "draw",
		audio: 2,
		group: ["gzjili_draw", "gzjili_recast"],
		ai: {
			threaten: 1.8,
			effect: {
				target_use(card, player, target, current) {
					let used = target.getHistory("useCard").length + target.getHistory("respond").length;
					if (get.subtype(card) == "equip1" && !get.cardtag(card, "gifts")) {
						if (player != target || !player.isPhaseUsing()) {
							return;
						}
						let range0 = player.getAttackRange();
						let range = 0;
						let info = get.info(card);
						if (info && info.distance && info.distance.attackFrom) {
							range -= info.distance.attackFrom;
						}
						if (player.getEquip(1)) {
							let num = 0;
							let info = get.info(player.getEquip(1));
							if (info && info.distance && info.distance.attackFrom) {
								num -= info.distance.attackFrom;
							}
							range0 -= num;
						}
						range0 += range;
						let delta = range0 - used;
						if (delta < 0) {
							return;
						}
						let num = player.countCards("h", function (card) {
							return (get.cardtag(card, "gifts") || get.subtype(card) != "equip1") && player.getUseValue(card) > 0;
						});
						if (delta == 2 && num > 0) {
							return [1, 3];
						}
						if (num >= delta) {
							return "zeroplayertarget";
						}
					} else if (get.tag(card, "respondShan") > 0) {
						if (current < 0 && used == target.getAttackRange() - 1) {
							if (card.name === "sha") {
								if (!target.mayHaveShan(player, "use")) {
									return;
								}
							} else if (!target.mayHaveShan(player)) {
								return 0.9;
							}
							return [1, (used + 1) / 2];
						}
					} else if (get.tag(card, "respondSha") > 0) {
						if (current < 0 && used == target.getAttackRange() - 1 && target.mayHaveSha(player)) {
							return [1, (used + 1) / 2];
						}
					}
				},
			},
		},
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
			event.result = await player
				.chooseBool(get.prompt2("gzjili"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw(player.getAttackRange());
		},
	},
	gzjili_recast: {
		aiShowTag: "support",
		sourceSkill: "gzjili",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return !!player.getEquip(1);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("gzjili"), "是否重铸装备区的武器牌？")
				.set("ai", () => {
					const weapon = player.getEquip(1);
					return !!weapon && (get.equipValue(weapon, player) < 5 || player.hasCard(card => get.subtype(card) == "equip1", "h"));
				})
				.forResult();
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
	// 参考: skill_refer/sp/skill.js 的 guixiu技能（sp包里糜夫人"闺秀"是另一版设计——被杀指定
	// 目标且手牌少于体力时摸牌；这里按卡面实现的是"明置武将牌摸两张牌"版本，效果不同但是
	// 同一武将同名技能的不同版本）
	guixiu: {
		aiShowTag: "draw",
		audio: 2,
		group: ["guixiu_draw", "guixiu_recover"],
	},
	// 三将规则下第三张武将牌开局即视为明置、不走 showCharacter 事件，故"明置时"改在 gameStart 结算
	guixiu_draw: {
		aiShowTag: "draw",
		sourceSkill: "guixiu",
		// 三将规则下第三将由 mode 补发一个 showCharacter 事件（patch/content.js chooseThirdCharacter），
		// 这里不需要再走 gameStart，否则会触发两次。
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			return !!(event.toShow && event.toShow.includes("mifuren"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("guixiu"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
	},
	// 参考: mode/guozhan 的 gzguixiu：移除/变更副将都会触发 removeCharacterBefore，event.toRemove 为被移除的武将
	guixiu_recover: {
		sourceSkill: "guixiu",
		trigger: { player: "removeCharacterBefore" },
		forced: true,
		filter(event, player) {
			return event.toRemove == "mifuren" && player.isDamaged();
		},
		async content(event, trigger, player) {
			const choice = await player
				.chooseControl("回复1点体力", "体力回复至1点")
				.set("prompt", get.prompt("guixiu"))
				.set("ai", () => (player.hp < 1 ? "体力回复至1点" : "回复1点体力"))
				.forResult();
			const num = choice.control == "体力回复至1点" ? 1 - player.hp : 1;
			if (num > 0) {
				await player.recover(num);
			}
		},
	},
	// 存嗣：锁定技，出牌阶段或濒死时可移除此武将牌，令一名角色获得"勇决"，非自身则摸两张。
	// 参考: mode/guozhan/src/skill/character/rest.js 的 gzcunsi（出牌阶段主动技，按技能所在的武将牌
	// 移除主将或副将）；"进入濒死时"按卡面另加 cunsi_dying 子技能，走 dying 时机（引擎没有 enterDying）。
	cunsi: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		skillAnimation: true,
		animationColor: "orange",
		filter(event, player) {
			return get.info("cunsi").getIndex(player) >= 0;
		},
		filterTarget: true,
		// "存嗣"所在的武将牌：0 主将 / 1 副将，第三将或找不到时返回 -1（无法移除）
		getIndex(player) {
			if (get.character(player.name1, 3).includes("cunsi")) {
				return 0;
			}
			if (get.character(player.name2, 3).includes("cunsi")) {
				return 1;
			}
			return -1;
		},
		async removeAndGive(player, target) {
			const index = get.info("cunsi").getIndex(player);
			if (index < 0) {
				return;
			}
			await player.removeCharacter(index);
			if (!target || !target.isIn()) {
				return;
			}
			target.addSkill("hb_yongjue");
			if (target != player) {
				await target.draw(2);
			}
		},
		async content(event, trigger, player) {
			await get.info("cunsi").removeAndGive(player, event.targets[0]);
		},
		group: "cunsi_dying",
		subSkill: {
			dying: {
				audio: "cunsi",
				trigger: { player: "dying" },
				filter(event, player) {
					return get.info("cunsi").getIndex(player) >= 0;
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget(get.prompt("cunsi"), "移除此武将牌，令一名角色获得“勇决”（若不为你则其摸两张牌）")
						.set("ai", target => {
							const player = get.player();
							if (target == player) {
								return 1;
							}
							return Math.max(0, get.attitude(player, target) - 3);
						})
						.forResult();
				},
				logTarget: "targets",
				async content(event, trigger, player) {
					await get.info("cunsi").removeAndGive(player, event.targets[0]);
				},
			},
		},
		ai: {
			order: 4,
			result: {
				target(player, target) {
					if (target.isMin()) {
						return 0;
					}
					if (player.hp > 1) {
						if (game.phaseNumber < game.players.length) {
							return 0;
						}
						if (target.hp == 1 && target.maxHp > 2) {
							return 0;
						}
						if (get.attitude(player, target) < 5) {
							return 0;
						}
					}
					if (get.attitude(player, target) < 5) {
						return 0;
					}
					if (target.hp == 1 && target.maxHp > 2) {
						return 0.2;
					}
					if (target == game.me) {
						return 1.2;
					}
					return 1;
				},
			},
			expose: 0.5,
			threaten: 1.5,
		},
	},
	// 勇决：出牌阶段第一张使用的牌若为杀，可以获得之且不计入次数
	// 参考: mode/guozhan 的 gzyongjue（回合内首张牌为杀、结算后拿回处理区里的实体牌）；"不计入次数"
	// 照官方 longyin 的写法在 useCardAfter 时把本回合的使用计数减一（useCard 时 addCount 已经太晚）。
	hb_yongjue: {
		aiShowTag: "support",
		charlotte: true,
		audio: 2,
		mark: true,
		intro: {
			content: "你的出牌阶段，当你使用的第一张牌结算结束后，若此牌为【杀】，你可以获得之，然后其不计入本回合的使用次数",
		},
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			if (event.card.name != "sha" || !player.isPhaseUsing() || player.getHistory("useCard")[0] != event) {
				return false;
			}
			return !!event.cards && event.cards.filterInD("od").length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("hb_yongjue"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.gain(trigger.cards.filterInD("od"), "gain2");
			if (trigger.addCount !== false) {
				trigger.addCount = false;
				const stat = player.getStat().card;
				if (typeof stat[trigger.card.name] == "number") {
					stat[trigger.card.name]--;
				}
			}
		},
	},

	// ============ 马谡 xin_masu ============
	// 散谣：出牌阶段限一次，弃一牌对体力值或手牌数最大的角色造成1点伤害。
	// 参考: skill_refer/yijiang/skill.js 的 olsanyao技能（官方版是"手牌最多"与"体力最大"两个
	// 选项各限一次、总共可发动两次；这里按卡面简化为"出牌阶段限一次"，可选任一条件的目标）
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
		ai: {
			order: 7,
			result: {
				player: 1,
			},
		},
	},
	// 制蛮（自制id避免与rezhiman共用技能冲突）：防止伤害并获得一张牌，同势力可变更副将，每名角色限一次。
	// 参考: skill_refer/yijiang/skill.js 的 zhiman 与 mode/guozhan 的 gz_zhiman：变更副将走
	// mayChangeVice()（询问式，且引擎自带"同一技能对每名角色限一次"的记录），防伤害/拿牌本身不限次。
	zhiman: {
		aiShowTag: "support",
		audio: "zhiman",
		trigger: { source: "damageBegin2" },
		filter(event, player) {
			return player != event.player;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const target = trigger.player;
			if (target.countGainableCards(player, "ej")) {
				await player.gainPlayerCard(target, "ej", true);
			}
			trigger.cancel();
			if (target.isIn() && target.isFriendOf(player)) {
				await target.mayChangeVice();
			}
		},
		check(event, player) {
			if (get.damageEffect(event.player, player, player) < 0) {
				return true;
			}
			var att = get.attitude(player, event.player);
			if (att > 0 && event.player.countCards("j")) {
				return true;
			}
			if (event.num > 1) {
				if (att < 0) {
					return false;
				}
				if (att > 0) {
					return true;
				}
			}
			var cards = event.player.getGainableCards(player, "e");
			for (var i = 0; i < cards.length; i++) {
				if (get.equipValue(cards[i]) >= 6) {
					return true;
				}
			}
			return false;
		},
	},

	// ============ 王平 wangping ============
	// 将略：限定技，出牌阶段发布一个"军令"，同势力角色可执行（未确定势力的角色可以在此时明置
	// 武将牌，若确认同势力则同样可以执行）；你和执行者各加1点体力上限并回复1点体力，然后你摸X张
	// （X为因此回复体力的角色数）。若你不为大势力，你可以变更此将。
	// 参考: mode/guozhan/src/skill/character/rest.js 的 jianglue技能（非skill_refer目录；
	// 沿用了同一套chooseJunlingFor/chooseJunlingControl/carryOutJunling军令API，改写成了
	// async/await写法）。存疑：这几个军令相关方法由guozhan模式的patch/player.js注入，如果
	// 该武将会在非国战模式下使用，需要确认这些API在当前工程里是否始终可用。
	// 修复：此前遗漏了卡面后半句"若你不为大势力，你可以变更此将"，已按马腾"雄异"(xiongyi)同款
	// 的"大势力"判定+player.reinitCharacter换将写法补全；同时此前"同势力角色可执行"直接用
	// isFriendOf筛选，未确定势力的角色（isUnseen()）严格判定下不算同势力，从而被完全排除在
	// 军令执行之外，与卡面"未确定势力的角色可以在此时明置武将牌"矛盾，现补上明置选项——
	// AI是否愿意明置的判断直接用自己的真实势力是否与王平相同来决定（真同势力则倾向明置以蹭
	// 军令收益，真不同势力则不明置），即用户所说的"其他AI有同势力时应该尽量亮出"。
	// 修复：军令流程改为逐条照搬官方 jianglue（未确定势力者用"明置一张同势力单势力武将牌以执行"的
	// 选项，明置哪张由其自己选；回复计数用 recoverAfter 子技能统计；体力上限用 gainMaxHp 事件）；
	// "大势力"用引擎的 isMajor()；"变更此将"按技能所在的那张武将牌处理（见 changeThisCharacter）。
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
		prepare(cards, player) {
			player.line(
				game.filterPlayer(current => current != player && (current.isFriendOf(player) || current.isUnseen())),
				"fire"
			);
		},
		// 变更技能所在的那张武将牌：在副将上→走官方 mayChangeVice（询问"是否变更副将"，不占用每技能限一次的
		// 变更记录）；在主将上→参照 changeVice 的候选规则（同势力/双势力、非君主、场上未出现）从武将池随机
		// 取至多三张供选择后换将；第三将或找不到时不处理。糜竺"巨贾"的"变更此武将牌"共用此方法。
		async changeThisCharacter(player, skill) {
			let index = -1;
			if (get.character(player.name1, 3).includes(skill)) {
				index = 0;
			} else if (get.character(player.name2, 3).includes(skill)) {
				index = 1;
			}
			if (index == 1) {
				await player.mayChangeVice(true);
				return;
			}
			if (index != 0) {
				return;
			}
			const bool = await player
				.chooseBool(get.prompt(skill), "是否变更此武将牌（主将）？")
				.set("ai", () => get.guozhanRank(player.name1, player) <= 3)
				.forResult();
			if (!bool.bool) {
				return;
			}
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			let group = player.identity;
			if (!lib.group.includes(group)) {
				group = get.character(player.name1, 1);
			}
			const pool = _status.characterlist.filter(name => {
				if (!lib.character[name] || name.startsWith("gz_jun_") || name.startsWith("gz_shibing")) {
					return false;
				}
				if (game.hasPlayer2(current => get.nameList(current).includes(name))) {
					return false;
				}
				const group2 = get.character(name, 1);
				if (group == "ye") {
					return group2 != "ye";
				}
				if (group == group2) {
					return true;
				}
				const double = get.is.double(name, true);
				return !!(double && double.includes(group));
			});
			if (!pool.length) {
				return;
			}
			pool.randomSort();
			const list = pool.slice(0, 3);
			let name = list[0];
			if (list.length > 1) {
				const result = await player
					.chooseButton(true, ["选择要变更的武将牌", [list, "character"]])
					.set("ai", button => get.guozhanRank(button.link))
					.forResult();
				if (result.links?.length) {
					name = result.links[0];
				}
			}
			_status.characterlist.remove(name);
			_status.characterlist.add(player.name1);
			game.log(player, "将主将从", "#g" + get.translation(player.name1), "变更为", "#g" + get.translation(name));
			await player.reinitCharacter(player.name1, name, false);
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.addTempSkill("jianglve_count");
			player.storage.jianglve_count = 0;
			const junlingResult = await player.chooseJunlingFor(player).set("prompt", "选择一张军令牌，令与你势力相同的其他角色选择是否执行").forResult();
			const junling = junlingResult?.junling;
			const targets = junlingResult?.targets || [];
			const list = [player];
			if (junling) {
				const filterName = name => get.character(name, 1) == player.identity && !get.is.double(name);
				const aiCheck = current => {
					if (junling == "junling6" && (current.countCards("h") > 3 || current.countCards("e") > 2)) {
						return 1;
					}
					return junling == "junling5" ? 1 : 0;
				};
				const players = game.filterPlayer(current => current != player && (current.isFriendOf(player) || (player.identity != "ye" && current.isUnseen()))).sortBySeat(player);
				for (const current of players) {
					if (!current.isAlive()) {
						continue;
					}
					const choiceList = ["执行该军令，增加1点体力上限，然后回复1点体力", "不执行该军令"];
					let showCharacter = false;
					let result;
					if (current.isFriendOf(player)) {
						result = await current
							.chooseJunlingControl(player, junling, targets)
							.set("prompt", "将略")
							.set("choiceList", choiceList)
							.set("ai", () => aiCheck(current))
							.forResult();
					} else if ((filterName(current.name1) || filterName(current.name2)) && current.wontYe(player.identity)) {
						showCharacter = true;
						choiceList[0] = "明置一张武将牌以" + choiceList[0];
						choiceList[1] = "不明置武将牌且" + choiceList[1];
						result = await current
							.chooseJunlingControl(player, junling, targets)
							.set("prompt", "将略")
							.set("choiceList", choiceList)
							.set("ai", () => aiCheck(current))
							.forResult();
					} else {
						await current.chooseJunlingControl(player, junling, targets).set("prompt", "将略").set("controls", ["ok"]).forResult();
						continue;
					}
					if (!result || result.index !== 0 || result.control == "ok") {
						continue;
					}
					if (showCharacter) {
						const choices = [];
						if (filterName(current.name1)) {
							choices.push("主将");
						}
						if (filterName(current.name2)) {
							choices.push("副将");
						}
						let control = choices[0];
						if (choices.length > 1) {
							const choose = await current
								.chooseControl(choices)
								.set("prompt", "选择并展示一张武将牌，然后执行军令")
								.set("ai", () => (get.character(current.name1, 3).includes("fzxuanhuo") ? "主将" : get.character(current.name2, 3).includes("fzxuanhuo") ? "副将" : choices.randomGet()))
								.forResult();
							control = choose.control;
						}
						await current.showCharacter(control == "主将" ? 0 : 1);
					}
					await current.carryOutJunling(player, junling, targets);
					list.push(current);
				}
			}
			for (const current of list) {
				if (!current.isAlive()) {
					continue;
				}
				await current.gainMaxHp(true);
				await current.recover();
			}
			const count = player.storage.jianglve_count || 0;
			player.removeSkill("jianglve_count");
			if (count > 0) {
				await player.draw(count);
			}
			if (!player.isIn() || player.isMajor()) {
				return;
			}
			await get.info("jianglve").changeThisCharacter(player, "jianglve");
		},
		marktext: "略",
		ai: {
			order: 10,
			result: {
				player(player) {
					if (player.isUnseen() && player.wontYe()) {
						if (get.population(player.group) >= game.players.length / 4) {
							return 1;
						}
						return Math.random() > 0.7 ? 1 : 0;
					}
					return 1;
				},
			},
		},
		subSkill: {
			count: {
				charlotte: true,
				trigger: { global: "recoverAfter" },
				silent: true,
				filter(event, player) {
					return !!event.getParent("jianglve", true);
				},
				onremove(player) {
					delete player.storage.jianglve_count;
				},
				content(event, trigger, player) {
					player.storage.jianglve_count = (player.storage.jianglve_count || 0) + 1;
				},
			},
		},
	},

	// ============ 法正 xin_fazheng ============
	// 眩惑：其他角色的出牌阶段开始时，你可以交给其一张牌，然后其交给你两张牌。若其与你
	// 势力相同，其选择并获得以下技能之一直到回合结束："武圣""咆哮""龙胆""铁骑""烈弓""狂骨"；
	// 不同，本轮不能再发动此技能。
	// 复用mode/guozhan永久内置的gz_wusheng/gz_paoxiao/gz_longdan/gz_tieji/liegong/
	// xinkuanggu这几个已有实现（本来就是"眩惑"官方版会外借的同一批技能），只是自己
	// 重新实现触发/交易这一层，不依赖已删除的官方武将包。
	// 参考: mode/guozhan/src/skill/character/rest.js 的 gzxuanhuo技能（非skill_refer目录）
	fzxuanhuo: {
		aiShowTag: "support",
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
			event.result = await player
				.chooseBool(`眩惑：是否交给${get.translation(trigger.player)}一张牌？`)
				.set("ai", () => get.attitude(player, trigger.player) > 0 && trigger.player.countCards("he") >= 2)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const giveResult = await player
				.chooseCard("he", true, `眩惑：交给${get.translation(target)}一张牌`)
				.set("ai", card => 6 - get.value(card))
				.forResult();
			if (!giveResult.bool || !giveResult.cards?.length) {
				return;
			}
			const card = giveResult.cards[0];
			await player.give(card, target);
			if (target.countCards("he")) {
				const back = await target
					.chooseCard("he", 2, `眩惑：交给${get.translation(player)}两张牌`, true)
					.set("ai", card => 5 - get.value(card))
					.forResult();
				if (back.bool && back.cards?.length) {
					await target.give(back.cards, player);
				}
			}
			if (!target.isIn()) {
				return;
			}
			if (target.isFriendOf(player)) {
				// 工程里没有裸名 liegong，"烈弓"用国战模式内置的 gz_liegong
				const list = ["gz_wusheng", "gz_paoxiao", "gz_longdan", "gz_tieji", "gz_liegong", "xinkuanggu"];
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
	// 参考: mode/guozhan/src/skill/character/rest.js 的 gzenyuan技能（非skill_refer目录）
	fzenyuan: {
		aiShowTag: "defense",
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
				// "需交给你一张红色手牌，否则失去1点体力"：有红色手牌时也可以选择不交（改为失去体力）
				const result = await source
					.chooseCard("h", `恩怨：是否交给${get.translation(player)}一张红色手牌？`, "否则你失去1点体力", card => get.color(card, source) === "red")
					.set("ai", card => (source.hp <= 2 ? 10 : 7) - get.value(card))
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
	// 参考: skill_refer/sixiang/skill.js 的 stdwuyou技能
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
			const target = event.targets[0];
			const result = await player.chooseToCompare(target).forResult();
			if (!result.bool) {
				// 用附加技能挂"武圣"，避免与自带的武圣冲突（照官方 stdwuyou_effect 写法）
				player.addTempSkill("wuyou_effect", { global: "phaseAfter" });
				await player.addAdditionalSkills("wuyou_effect", "wusheng");
			}
			// 平局没有赢家，不结算决斗
			const winner = result.winner;
			if (!winner) {
				return;
			}
			const loser = player == winner ? target : player;
			const juedou = get.autoViewAs({ name: "juedou", isCard: true });
			if (winner.canUse(juedou, loser, false)) {
				await winner.useCard(juedou, loser, false);
			}
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					return get.effect(target, { name: "juedou" }, player, player) * get.attitude(player, target);
				},
			},
		},
		derivation: "wusheng",
		subSkill: {
			effect: {
				charlotte: true,
				mark: true,
				marktext: "佑",
				intro: {
					content: "本回合视为拥有〖武圣〗",
				},
			},
		},
	},
	// 青龙：锁定技，你使用的杀被目标的闪抵消后，可对其再使用一张杀。
	// 原创技能，无官方参考
	qinglong: {
		aiShowTag: "offense",
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
	// 参考: skill_refer_guozhan 的 gz_liaohua-gzdangxian（技能名：当先），结构一致（首次明置
	// 获得"先驱"标记；持有该标记的同势力角色回合开始时获得额外出牌阶段）。
	// 修复：①"先驱"改用国战模式共享的 xianqu_mark 标记（官方当先同款），这样其他持有"先驱"的
	// 同势力角色也能被 zhengxian_other 识别；②"额外出牌阶段"照官方在 phaseBegin 时往本回合的
	// phaseList 里插入一个 phaseUse（原来的 insertPhase 是在本回合之后再插一个完整回合）；
	// ③"你令其执行"是锁定效果，改为 forced；④三将规则的第三张武将牌在 gameStart 时视为已明置。
	// 争先：首次明置获得"先驱"标记；自身回合开始可额外出牌阶段；同势力持有标记者的回合开始也令其额外出牌阶段。
	zhengxian: {
		aiShowTag: "control",
		audio: 2,
		group: ["zhengxian_get", "zhengxian_self", "zhengxian_other"],
	},
	zhengxian_get: {
		sourceSkill: "zhengxian",
		trigger: { player: "showCharacterAfter", global: "gameStart" },
		forced: true,
		filter(event, player, name) {
			if (player.storage.zhengxian_got) {
				return false;
			}
			if (name == "gameStart") {
				return player.name3 == "liaohua";
			}
			return !!(event.toShow && event.toShow.includes("liaohua"));
		},
		popup: false,
		async content(event, trigger, player) {
			player.storage.zhengxian_got = true;
			player.addMark("xianqu_mark", 1);
		},
	},
	zhengxian_self: {
		aiShowTag: "control",
		sourceSkill: "zhengxian",
		trigger: { player: "phaseBegin" },
		filter(event, player) {
			return player.hasMark("xianqu_mark");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("zhengxian"), "是否执行一个额外的出牌阶段？")
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.phaseList.splice(trigger.num, 0, "phaseUse|zhengxian");
		},
	},
	zhengxian_other: {
		aiShowTag: "control",
		sourceSkill: "zhengxian",
		trigger: { global: "phaseBegin" },
		forced: true,
		filter(event, player) {
			return event.player != player && event.player.isFriendOf(player) && event.player.hasMark("xianqu_mark");
		},
		logTarget: "player",
		async content(event, trigger, player) {
			trigger.phaseList.splice(trigger.num, 0, "phaseUse|zhengxian");
		},
	},

	// ===================== 关平：龙吟 =====================
	// 当一名角色于其出牌阶段内使用【杀】时，你可以弃置一张牌，令此【杀】不计入次数。
	// 若此【杀】为红色，你摸一张牌。当你以此法失去最后一张手牌时，你摸两张牌，然后此技能本回合失效。
	// 参考: skill_refer/yijiang/skill.js 的 longyin（关平"龙吟"，前半段与官方一致，后半段"失去最后一张手牌"为改良新增）
	// 修复：弃牌选择照官方改为非强制（chooseonly，真正弃置放到 content 里）；"不计入次数"照官方在
	// useCard 时机手动把使用者的计数减一；"失去最后一张手牌"在弃置之后、摸牌之前判定。
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
			let go = false;
			if (get.attitude(player, trigger.player) > 0) {
				if (get.color(trigger.card) == "red") {
					go = true;
				} else if (trigger.addCount === false || !trigger.player.isPhaseUsing()) {
					go = false;
				} else if (!trigger.player.hasSkill("paoxiao") && !trigger.player.hasSkill("gz_paoxiao") && !trigger.player.getEquip("zhuge")) {
					const nh = trigger.player.countCards("h");
					if (player == trigger.player) {
						go = player.countCards("h", "sha") > 0;
					} else if (nh >= 4) {
						go = true;
					} else if (player.countCards("h", "sha")) {
						if (nh == 3) {
							go = Math.random() < 0.8;
						} else if (nh == 2) {
							go = Math.random() < 0.5;
						}
					} else if (nh == 3) {
						go = Math.random() < 0.5;
					} else if (nh == 2) {
						go = Math.random() < 0.2;
					}
				}
			}
			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt("longyin"),
					prompt2: "弃置一张牌" + (get.color(trigger.card) == "red" ? "并摸一张牌" : "") + "，令" + get.translation(trigger.player) + "本次使用的【杀】不计入使用次数",
					position: "he",
					ai(card) {
						if (get.event().go) {
							return 6 - get.value(card);
						}
						return 0;
					},
				})
				.set("go", go)
				.set("chooseonly", true)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const cards = event.cards;
			const fromHand = cards.filter(card => get.owner(card) == player && get.position(card) == "h").length;
			await player.discard({ cards, discarder: player });
			const lostLastHand = fromHand > 0 && player.countCards("h") == 0;
			if (trigger.addCount !== false) {
				trigger.addCount = false;
				const stat = trigger.player.getStat().card;
				const name = trigger.card.name;
				if (typeof stat[name] === "number") {
					stat[name]--;
				}
			}
			if (get.color(trigger.card) == "red") {
				await player.draw();
			}
			if (lostLastHand) {
				await player.draw(2);
				player.addTempSkill("longyin_off", { global: "phaseAfter" });
			}
		},
		ai: {
			expose: 0.2,
		},
	},
	longyin_off: {
		charlotte: true,
	},

	// ===================== 简雍：巧说/纵适 =====================
	// 出牌阶段，你可以与一名角色拼点，若你：赢，本回合你使用下一张基本牌或普通锦囊牌可以多（无距离限制）
	// 或少选择一个目标；没赢，本回合不能对自己以外的目标使用牌。
	// 参考: skill_refer/yijiang/skill.js 的 qiaoshui（简雍"巧说"，胜负效果结构一致，细节数值略有调整）
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
					ai(target) {
						const player = get.player();
						if (player.countCards("h") < 2 || !player.hasCard(card => get.number(card) >= 10, "h")) {
							return 0;
						}
						return Math.max(0, -get.attitude(player, target) + 1);
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
		ai: {
			expose: 0.1,
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
				const result = await player.chooseControl(["为此牌增加一个目标", "为此牌减少一个目标", "cancel2"]).set("prompt", "巧说：请选择一项").forResult();
				if (result.control == "为此牌增加一个目标") {
					await addTarget();
				} else if (result.control == "为此牌减少一个目标") {
					await removeTarget();
				}
			}
		},
	},
	// 当你拼点后，若你赢，你可以获得对方此次拼点的牌；没赢，你可以获得你此次拼点的牌
	// 参考: skill_refer/yijiang/skill.js 的 jyzongshi（简雍"纵适"，效果一致）
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
		check(event, player) {
			const cards = get.info("jyzongshi").getCards(event, player);
			return cards.every(card => card.name != "du");
		},
	},

	// ===================== 寇封：怀兵 =====================
	// 准备阶段，你可以选择两名角色，获得这两名角色各一张手牌，然后你展示手牌，
	// 令其中体力值较少的角色下个摸牌阶段摸牌数、出牌阶段【杀】的使用次数、弃牌阶段手牌上限改为其中红色牌的数量。
	// 参考: skill_refer/sxrm/_merged.md 的 sxrm_liufeng-sxrmhuaibing（技能名：怀兵），效果描述与本实现基本一致
	// 修复（照官方 sxrmhuaibing）：目标不能选自己（自己的手牌无法"获得"）；X 为展示后全部手牌中的红色牌数；
	// 三个效果各自挂到目标"下个对应阶段结束"才移除（原来默认到期会在寇封本回合结束就被移除）；
	// 体力值相同时没有"较少"的角色，不产生效果。
	huaibing: {
		aiShowTag: "control",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.countPlayer(current => current != player && current.countCards("h") > 0) >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("huaibing"), 2, (card, player, target) => target != player && target.countCards("h") > 0)
				.set("ai", target => {
					const player = get.player();
					const eff = get.effect(target, { name: "shunshou_copy2" }, player, player);
					const count = player.countCards("h", { color: "red" }) - 2;
					if (ui.selected.targets.length) {
						const first = ui.selected.targets[0];
						if (first.hp != target.hp) {
							const current = first.hp > target.hp ? target : first;
							return eff + get.effect(current, { name: "wuzhong" }, current, player) * count;
						}
					}
					return eff;
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const targets = event.targets;
			const gains = targets.filter(current => current.countCards("h") > 0);
			if (gains.length) {
				await player.gainMultiple(gains, "h");
			}
			await player.showHandcards(`${get.translation(player)}发动了【怀兵】`);
			const [first, second] = targets;
			if (first.getHp() == second.getHp()) {
				return;
			}
			const lower = first.getHp() < second.getHp() ? first : second;
			const red = player.countCards("h", { color: "red" });
			lower.addTempSkill("huaibing_draw", { player: "phaseDrawAfter" });
			lower.addTempSkill("huaibing_sha", { player: "phaseUseAfter" });
			lower.addTempSkill("huaibing_discard", { player: "phaseDiscardAfter" });
			for (const name of ["huaibing_draw", "huaibing_sha", "huaibing_discard"]) {
				lower.setStorage(name, red);
				lower.markSkill(name);
			}
		},
	},
	huaibing_draw: {
		charlotte: true,
		onremove: true,
		marktext: "摸",
		intro: {
			content: "下个摸牌阶段摸牌数改为#",
		},
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed && typeof player.storage.huaibing_draw == "number";
		},
		firstDo: true,
		forced: true,
		locked: false,
		popup: false,
		async content(event, trigger, player) {
			trigger.num = player.storage.huaibing_draw;
			trigger.numFixed = true;
		},
	},
	huaibing_sha: {
		charlotte: true,
		onremove: true,
		marktext: "杀",
		intro: {
			content: "下个出牌阶段【杀】的使用次数改为#",
		},
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha" && typeof player.storage.huaibing_sha == "number") {
					return player.storage.huaibing_sha;
				}
			},
		},
	},
	huaibing_discard: {
		charlotte: true,
		onremove: true,
		marktext: "弃",
		intro: {
			content: "下个弃牌阶段手牌上限改为#",
		},
		mod: {
			maxHandcard(player, num) {
				if (typeof player.storage.huaibing_discard == "number") {
					return player.storage.huaibing_discard;
				}
			},
		},
	},

	// ===================== 吴懿：奔袭/转征 =====================
	// 锁定技，当你于回合内使用牌时，本回合你计算与其他角色的距离-1。
	// 参考: skill_refer/yijiang/skill.js 的 olbenxi（吴懿"奔袭"，仅采用其①距离-1部分，官方②额外效果未采用）
	// 修复：只在自己回合内使用牌时触发；每次使用都叠加一层（本回合距离 -X，X 为触发次数），到本回合结束。
	olbenxi: {
		aiShowTag: "offense",
		trigger: { player: "useCard" },
		forced: true,
		filter(event, player) {
			return _status.currentPhase == player;
		},
		content(event, trigger, player) {
			player.addTempSkill("olbenxi_buff", { player: "phaseAfter" });
			player.addMark("olbenxi_buff", 1, false);
		},
		ai: {
			unequip_ai: true,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (_status.currentPhase !== player || game.hasPlayer(current => get.distance(player, current) > 1)) {
					return false;
				}
				if (tag === "directHit_ai") {
					return arg.card.name === "sha";
				}
				if (!arg || !arg.card || (arg.card.name != "sha" && arg.card.name !== "chuqibuyi")) {
					return false;
				}
				var card = arg.target.getEquip(2);
				if (card && card.name.indexOf("bagua") != -1) {
					return true;
				}
				if (player._olbenxi_ai) {
					return false;
				}
			},
		},
	},
	olbenxi_buff: {
		charlotte: true,
		onremove: true,
		marktext: "袭",
		intro: {
			content: "本回合你计算与其他角色的距离-#",
		},
		mod: {
			globalFrom(from, to, distance) {
				return distance - from.countMark("olbenxi_buff");
			},
		},
	},
	// 参考: skill_refer_guozhan 的 gz_ol_zhuanzheng（OL吴懿"转征"），效果结构几乎一致（选一名
	// 距离1以内同势力角色，摸X张牌，X为二者之间的角色数且至少为1，然后可与其副将易位）；
	// 官方是"每轮限一次，若控制此武将牌的角色发生变化则+1次"，本地简化为固定每轮限两次。
	// 修复（照官方 gz_ol_zhuanzheng）：X 按座位数两边同时数（你与其之间的角色数）；"每轮限两次"用
	// 到 roundStart 才移除的 zhuanzheng_used 标记计数；副将易位走引擎的 transCharacter。
	// 每轮限两次，出牌阶段，你可以选择一名距离1以内的同势力角色，你摸X张牌，
	// 然后其可以与你副将易位（X为你与其之间的角色数且至少为1）。
	zhuanzheng: {
		aiShowTag: "draw",
		enable: "phaseUse",
		filter(event, player) {
			if (player.countMark("zhuanzheng_used") >= 2) {
				return false;
			}
			return game.hasPlayer(current => current != player && current.isFriendOf(player) && get.distance(player, current) <= 1);
		},
		filterTarget(card, player, target) {
			return target != player && target.isFriendOf(player) && get.distance(player, target) <= 1;
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.addTempSkill("zhuanzheng_used", { global: "roundStart" });
			player.addMark("zhuanzheng_used", 1, false);
			let num = -1,
				left = player,
				right = player;
			while (target?.isIn()) {
				if (left == target || right == target) {
					break;
				}
				left = left.getPrevious();
				right = right.getNext();
				num++;
			}
			await player.draw(Math.max(1, num));
			const result = await target
				.chooseBool(`转征：是否与${get.translation(player)}交换副将？`)
				.set("choice", Math.random() > 0.5)
				.forResult();
			if (result.bool && target.isIn() && player.isIn()) {
				await player.transCharacter(target);
			}
		},
		ai: {
			order: 4,
			result: {
				player: 1,
			},
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	},

	// ===================== 张松：强识/献图 =====================
	// 出牌阶段开始时，你可以展示一名其他角色的一张手牌，然后你本阶段使用此类别的非转化牌后可摸一张牌。
	// 参考: skill_refer/yijiang/skill.js 的 qiangzhi（张松"强识"，效果基本一致，homebrew 额外限定"非转化牌"）
	qiangzhi: {
		aiShowTag: "support",
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
					ai() {
						return Math.random();
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
			// 非转化牌：不经技能转化、且使用的就是实体牌本身
			return !event.skill && !!event.card.isCard && get.type(event.card, "trick") == player.storage.qiangzhi_type;
		},
		async content(event, trigger, player) {
			await player.draw();
		},
	},
	// 其他角色出牌阶段开始时，你可以摸两张牌，然后交给其等量牌。
	// 此阶段结束时，若本回合没有角色进入濒死状态，你失去1点体力。
	// 参考: skill_refer/yijiang/skill.js 的 xiantu（张松"献图"，结构一致，失体力的判定条件由"未杀死角色"改为"本回合无人进入濒死"）
	// 修复：摸牌后由张松任选两张牌交出（await player.draw() 不返回牌）；"本回合是否有角色进入濒死"直接查
	// 本回合的全局事件历史（game.hasGlobalHistory("everything")），不再需要常驻的 xiantu_mark 标记技。
	xiantu: {
		aiShowTag: "draw",
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return event.player != player;
		},
		logTarget: "player",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(`献图：是否摸两张牌，然后交给${get.translation(trigger.player)}两张牌？`)
				.set("ai", () => get.info("xiantu").check(trigger, player))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			await player.draw(2);
			const result = await player
				.chooseCard(2, "he", true, `献图：交给${get.translation(target)}两张牌`)
				.set("ai", card => {
					if (ui.selected.cards.length && card.name == ui.selected.cards[0].name) {
						return -1;
					}
					if (get.tag(card, "damage") || get.type(card) == "equip") {
						return 1;
					}
					return 0;
				})
				.forResult();
			if (result?.bool && result.cards?.length) {
				await player.give(result.cards, target);
			}
			player.storage.xiantu_target = target;
			player.addTempSkill("xiantu_check");
		},
		check(event, player) {
			if (get.attitude(player, event.player) < 5) {
				return false;
			}
			if (player.maxHp - player.hp >= 2) {
				return false;
			}
			if (player.hp == 1) {
				return false;
			}
			if (player.hp == 2 && player.countCards("h") < 2) {
				return false;
			}
			if (event.player.countCards("h") >= event.player.hp) {
				return false;
			}
			return true;
		},
		ai: {
			threaten: 1.1,
		},
	},
	xiantu_check: {
		charlotte: true,
		trigger: { global: "phaseUseEnd" },
		filter(event, player) {
			return event.player == player.storage.xiantu_target;
		},
		forced: true,
		popup: false,
		onremove(player) {
			delete player.storage.xiantu_target;
		},
		async content(event, trigger, player) {
			player.removeSkill("xiantu_check");
			if (game.hasGlobalHistory("everything", evt => evt.name == "dying")) {
				return;
			}
			player.logSkill("xiantu");
			await player.loseHp();
		},
	},

	// ===================== 周仓：忠勇 =====================
	// 每回合限一次，当同势力角色使用【杀】结算结束后，你可以令其获得此【杀】或目标角色使用的【闪】，
	// 然后其可以对此【杀】的目标角色使用一张【杀】。
	// 参考: skill_refer/yijiang/skill.js 的 xinzhongyong（周仓"忠勇"，官方为"自己使用的杀"转手给他人，
	// 此处改为"同势力角色使用的杀"由自己经手，核心的"获得杀/闪后可再用一张杀"结构一致）
	// 修复："每回合限一次"用 usable:1；"同势力"用 isFriendOf；只在处理区/弃牌堆里确实有可获得的杀/闪时触发；
	// "其可以对此杀的目标角色使用一张杀"照官方用 filterCard: get.filter({name:"sha"}) 限制只能出杀。
	xinzhongyong: {
		aiShowTag: "response",
		trigger: { global: "useCardAfter" },
		usable: 1,
		filter(event, player) {
			if (event.card.name != "sha" || !event.player.isIn() || !event.player.isFriendOf(player) || !event.targets?.length) {
				return false;
			}
			return get
				.info("xinzhongyong")
				.getCards(event)
				.some(list => list.length > 0);
		},
		// 返回 [此杀的实体牌, 目标为响应此杀而使用的闪]（都只取仍在处理区/弃牌堆的）
		getCards(event) {
			const sha = (event.cards || []).filterInD("od");
			const shan = [];
			for (const current of game.filterPlayer2()) {
				for (const evt of current.getHistory("useCard", evt => evt.card.name == "shan" && evt.getParent(3) == event)) {
					shan.addArray(evt.cards);
				}
			}
			return [sha, shan.filterInD("od")];
		},
		logTarget: "player",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(`忠勇：是否令${get.translation(trigger.player)}获得此【杀】或目标使用的【闪】，然后其可以使用一张【杀】？`)
				.set("ai", () => get.attitude(player, trigger.player) > 0)
				.forResult();
		},
		async content(event, trigger, player) {
			const source = trigger.player;
			const targets = trigger.targets.slice(0);
			const [sha, shan] = get.info("xinzhongyong").getCards(trigger);
			let cards = sha.length ? sha : shan;
			if (sha.length && shan.length) {
				const result = await source
					.chooseControl(["获得【杀】", "获得【闪】"])
					.set("prompt", "忠勇：请选择一项")
					.set("ai", () => (sha.length >= shan.length ? "获得【杀】" : "获得【闪】"))
					.forResult();
				cards = result.control == "获得【闪】" ? shan : sha;
			}
			if (cards.length) {
				await source.gain(cards, "gain2");
			}
			if (!source.isIn()) {
				return;
			}
			await source
				.chooseToUse({
					prompt: "忠勇：是否对原目标使用一张【杀】？",
					filterCard: get.filter({ name: "sha" }),
					filterTarget(card, player, target) {
						return get.event().zhongyongTargets.includes(target) && lib.filter.filterTarget.apply(this, arguments);
					},
				})
				.set("zhongyongTargets", targets)
				.set("addCount", false);
		},
	},

	// ===================== 刘谌：战绝/勤王 =====================
	// 出牌阶段，你可以将所有手牌（至少一张）当一张【决斗】使用，结算完成后，你摸一张牌，
	// 然后受伤角色各摸一张牌。每阶段你因“战绝”摸第两张牌后，此阶段“战绝”失效。
	// 参考: skill_refer/yijiang/skill.js 的 zhanjue（刘谌"战绝"，效果基本一致）
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
	// 参考: skill_refer/yijiang/skill.js 的 qinwang（刘谌"勤王"，官方为主公技且在需要使用/打出杀时触发，
	// 此处改为出牌阶段可主动发动，"弃牌+激将+响应者摸牌"核心结构一致）
	// 修复：主动技的 cost 永远不会被调用，"弃置一张牌"改为主动技自身的选牌（默认弃置）；"激将"照官方
	// jijiang1 的做法——其他同势力角色依次选择是否替你打出（chooseToRespond）一张【杀】，打出者摸一张牌，
	// 然后你以该牌的花色点数属性视为使用一张【杀】（选目标为强制）。
	qinwang: {
		aiShowTag: "draw",
		aiShowCost: true,
		enable: "phaseUse",
		filterCard: lib.filter.cardDiscardable,
		position: "he",
		prompt: "弃置一张牌，然后发动一次“激将”：其他同势力角色可以替你打出一张【杀】（你视为使用之），打出者摸一张牌",
		filter(event, player) {
			if (!player.countCards("he") || !game.hasPlayer(current => current != player && current.isFriendOf(player))) {
				return false;
			}
			return player.hasUseTarget(get.autoViewAs({ name: "sha", isCard: true }));
		},
		check(card) {
			const player = get.player();
			if (!game.hasPlayer(current => current != player && current.isFriendOf(player) && get.attitude(current, player) > 2 && current.countCards("h", "sha") > 0)) {
				return 0;
			}
			return 5 - get.value(card);
		},
		async content(event, trigger, player) {
			let current = player.getNext();
			while (current != player) {
				if (current.isIn() && current.isFriendOf(player)) {
					const next = current.chooseToRespond({
						prompt: `勤王：是否替${get.translation(player)}打出一张【杀】？`,
						filterCard(card, player) {
							return get.name(card) == "sha" && lib.filter.cardRespondable(card, player);
						},
						ai() {
							const evt = get.event();
							return get.attitude(evt.player, evt.source) - 2;
						},
					});
					next.set("source", player)
						.set("jijiang", true)
						.set("skillwarn", `替${get.translation(player)}打出一张杀`);
					next.noOrdering = true;
					next.autochoose = lib.filter.autoRespondSha;
					const result = await next.forResult();
					if (result.bool) {
						await current.draw();
						const card = result.card;
						const sha = get.autoViewAs({ name: "sha", suit: get.suit(card), number: get.number(card), nature: get.nature(card), isCard: true });
						if (player.isIn() && player.hasUseTarget(sha)) {
							await player.chooseUseTarget(sha, true);
						}
						return;
					}
				}
				current = current.getNext();
			}
		},
		ai: {
			order: 6,
			result: {
				player(player) {
					return player.hasValueTarget(get.autoViewAs({ name: "sha", isCard: true })) ? 1 : 0;
				},
			},
		},
	},

	// ===================== 黄皓：贿生/存畏 =====================
	// 当你受到其他角色造成的伤害时，你可以展示任意张牌，令伤害来源观看之并选择一项：
	// 1.获得其中至多x张牌，防止x点伤害（x为本次伤害值）；2.弃置等量的牌。
	// 参考: skill_refer/yijiang/skill.js 的 huisheng（黄皓"贿生"，效果一致，homebrew 将"获得一张防一次伤害"扩展为"按伤害值x张防x点"）
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
		// 修复（照官方 huisheng）：展示是"可以"，选牌不强制；伤害来源自己挑要获得的牌（至多 x 张，x 为伤害值），
		// 获得后防止此伤害；不获得则由伤害来源弃置等量的牌（其牌数不够时只能选择获得）。
		async cost(event, trigger, player) {
			const att = get.attitude(player, trigger.source) > 0;
			let goon = player.hp === 1;
			if (!goon) {
				let num = 0;
				for (const card of player.iterableGetCards("he")) {
					if (get.value(card) < 8) {
						num++;
						if (num >= 2) {
							goon = true;
							break;
						}
					}
				}
			}
			event.result = await player
				.chooseCard({
					prompt: get.prompt2("huisheng", trigger.source),
					selectCard: [1, player.countCards("he")],
					position: "he",
					ai(card) {
						const { att, goon } = get.event();
						if (att) {
							return 10 - get.value(card);
						}
						if (goon) {
							return 8 - get.value(card);
						}
						if (!ui.selected.cards.length) {
							return 7 - get.value(card);
						}
						return 0;
					},
				})
				.set("goon", goon)
				.set("att", att)
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			const source = trigger.source;
			await player.showCards(cards, get.translation(player) + "发动了【贿生】");
			const x = Math.max(1, trigger.num || 1);
			const num = cards.length;
			const goon = num > 2 || get.attitude(source, player) >= 0;
			let forced = false;
			let str = `获得其中至多${get.cnNumber(x)}张牌并防止此伤害`;
			if (source.countCards("he") < num) {
				forced = true;
			} else {
				str += `，或取消并弃置${get.cnNumber(num)}张牌`;
			}
			const result = await source
				.chooseButton({
					createDialog: [str, cards],
					selectButton: [1, Math.min(x, num)],
					forced,
					ai(button) {
						if (get.event().goon) {
							return get.value(button.link);
						}
						return get.value(button.link) - 8;
					},
				})
				.set("goon", goon)
				.forResult();
			if (result.bool && result.links?.length) {
				await source.gain({
					cards: result.links,
					source: player,
					animate: "giveAuto",
					bySelf: true,
				});
				trigger.cancel();
			} else {
				await source.chooseToDiscard("he", num, true);
			}
		},
	},
	// 参考: skill_refer/huicui/skill.js 的 dc_huanghao-dccunwei（技能名：存畏），效果几乎逐字
	// 一致（锁定技，成为锦囊牌唯一目标摸一张牌，否则弃置一张牌）。之前搜索漏看了huicui包
	// 带"dc"前缀的黄皓角色。
	// 锁定技，当你成为锦囊牌的目标后，若你为唯一目标，则你摸一张牌，否则你弃置一张牌。
	cunwei: {
		aiShowTag: "defense",
		trigger: { target: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			return get.type2(event.card) == "trick" && (event.targets.length == 1 || player.countCards("he") > 0);
		},
		async content(event, trigger, player) {
			if (trigger.targets.length == 1) {
				await player.draw();
			} else if (player.countCards("he")) {
				await player.chooseToDiscard("he", true, "存畏：请弃置一张牌").forResult();
			}
		},
		ai: { halfneg: true },
	},

	// ===================== 关银屏：雪恨/虎啸 =====================
	// 出牌阶段限一次，你可以弃置一张红色牌并选择至多X名角色（X为你已损失的体力值且至少为1），
	// 然后你横置这些角色，并对其中一名角色造成1点火焰伤害。
	// 参考: skill_refer/sp/skill.js 的 xueji（关银屏"雪恨"，弃红色牌、选X名角色横置(link)、对其一造成火焰伤害的结构一致）
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
		// 修复：主动技没有 filterTarget 就不会进入选目标流程（照官方 xueji 加 filterTarget: true）
		filterTarget: true,
		multitarget: true,
		multiline: true,
		line: "fire",
		selectTarget() {
			const player = get.player();
			return [1, Math.max(1, player.getDamagedHp())];
		},
		async content(event, trigger, player) {
			const targets = event.targets;
			let delay = false;
			for (const target of targets) {
				if (!target.isLinked()) {
					await target.link(true);
					delay = true;
				}
			}
			if (delay) {
				await game.delay();
			}
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
		check(card) {
			return 8 - get.value(card);
		},
	},
	// 锁定技，当你对一名角色造成火焰伤害后，其摸一张牌。
	// 参考: skill_refer/sp/skill.js 的 huxiao（关银屏"虎啸"，homebrew 省略官方"本回合对其用牌无次数限制"部分）
	huxiao: {
		aiShowTag: "offense",
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
	// 与 skill_refer/old(sp)/skill.js 的同名技能"协穆"(old_maliang)效果不同，已排除
	// （官方：出牌阶段限一次弃一张【杀】选一个势力，直到下回合开始成为该势力黑色牌目标后摸两张；与本效果完全不同）
	// 修复："其可以…"是对方在其出牌阶段的主动选择：照官方 gzxuanhuo_others 的写法做成全局子技能 xiemu_give
	// （其他同势力角色的出牌阶段限一次，主动展示并交给马良一张基本牌），不再在阶段开始时强制询问。
	xiemu: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		global: "xiemu_give",
		subSkill: {
			give: {
				audio: "xiemu",
				enable: "phaseUse",
				usable: 1,
				filter(event, player) {
					if (!player.countCards("h", card => get.type(card) == "basic")) {
						return false;
					}
					return game.hasPlayer(current => current != player && current.hasSkill("xiemu") && player.isFriendOf(current));
				},
				filterCard(card) {
					return get.type(card) == "basic";
				},
				position: "h",
				filterTarget(card, player, target) {
					return target != player && target.hasSkill("xiemu") && player.isFriendOf(target);
				},
				discard: false,
				lose: false,
				delay: false,
				prompt: "展示并交给一名有“协穆”的同势力角色一张基本牌，然后你本回合内计算与其他角色的距离-1",
				check(card) {
					return 5 - get.value(card);
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					const cards = event.cards;
					await player.showCards(cards, get.translation(player) + "发动了【协穆】");
					await player.give(cards, target);
					player.addTempSkill("xiemu_buff", { player: "phaseAfter" });
				},
				ai: {
					order: 6,
					result: {
						player(player) {
							return game.hasPlayer(current => get.distance(player, current) > 1) ? 1 : 0.2;
						},
					},
				},
			},
		},
	},
	xiemu_buff: {
		charlotte: true,
		mark: true,
		intro: { content: "本回合你计算与其他角色的距离-1" },
		mod: {
			globalFrom(from, to, distance) {
				return distance - 1;
			},
		},
	},
	// 出牌阶段限一次，你可以将任意张基本牌当【南蛮入侵】使用，并选择等量名角色为目标。你获得因此打出的红色【杀】。
	// 与 skill_refer/old(sp)/skill.js 的同名技能"纳蛮"(old_maliang)效果不同，已排除
	// （官方：当其他角色打出的【杀】结算结束后，你可以获得此牌对应的所有实体牌；与本效果完全不同）
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
			return target != player;
		},
		selectTarget() {
			const n = ui.selected.cards.length || 1;
			return [n, n];
		},
		check(card) {
			return 6 - get.value(card);
		},
		group: "naman_gain",
	},
	// 隐藏的辅助技（纳蛮的 group），负责收取“纳蛮”响应中打出的红色【杀】
	// 修复：南蛮入侵要求的杀是"打出"（respond 历史），不是使用；以是否隶属于此次纳蛮的 useCard 事件来判定。
	naman_gain: {
		aiShowTag: "draw",
		charlotte: true,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return event.skill == "naman";
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const redSha = [];
			for (const current of game.filterPlayer2()) {
				for (const evt of current.getHistory("respond", evt => evt.card.name == "sha" && get.color(evt.card) == "red" && evt.getParent("useCard", true) == trigger)) {
					redSha.addArray(evt.cards);
				}
			}
			const cards = redSha.filterInD("od");
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
	},

	// ===================== 糜竺：资援/巨贾 =====================
	// 资援：出牌阶段限一次，你可以交给一名其他角色任意张点数之和为13的牌，然后该角色回复1点体力。
	// 参考: skill_refer/sp/skill.js 的 ziyuan（糜竺"资援"，效果一致）
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
	// 参考: skill_refer/sp/skill.js 的 jugu（糜竺"巨贾"），手牌上限+X的核心效果一致。
	// 经核实，明置/暗置机制（player.showCharacter/isUnseen）及主副将变更机制
	// （player.changeCharacter）在本项目中真实可用，此前"本项目并非国战模式，无对应机制"
	// 的假设有误，现按translate.js的jugu_info补回：①摸牌效果改为"你首次明置此武将时"
	// 触发（用法同辛宪英/戏志才等技能的showCharacterAfter写法），而非游戏开始时；
	// ②补上"准备阶段开始时，若你没有手牌，你可以变更此武将牌"的效果。
	// 巨贾：锁定技，你的手牌上限+X；你首次明置此武将时，你摸X张牌（X为你的体力上限）。
	// 准备阶段开始时，若你没有手牌，你可以变更此武将牌。
	jugu: {
		aiShowTag: "draw",
		audio: 2,
		group: ["jugu_change"],
		mod: {
			maxHandcard(player, num) {
				return num + player.maxHp;
			},
		},
		// 修复："首次明置此武将"看的是糜竺这张牌是否被明置（toShow 含 "mizhu"），与主/副将位置无关；
		// 三将规则的第三张武将牌开局即视为明置，在 gameStart 结算。
		trigger: { player: "showCharacterAfter", global: "gameStart" },
		forced: true,
		filter(event, player, name) {
			if (player.storage.jugu_drawn) {
				return false;
			}
			if (name == "gameStart") {
				return player.name3 == "mizhu";
			}
			return !!(event.toShow && event.toShow.includes("mizhu"));
		},
		async content(event, trigger, player) {
			player.storage.jugu_drawn = true;
			await player.draw(player.maxHp);
		},
		ai: { threaten: 1.4 },
	},
	// "变更此武将牌"：变更"巨贾"所在的那张武将牌（副将走 mayChangeVice，主将在同势力候选里换将），
	// 复用王平"将略"的 changeThisCharacter（其内部已包含"是否变更"的询问）。
	jugu_change: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return !player.countCards("h") && [player.name1, player.name2].some(name => get.character(name, 3).includes("jugu"));
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			await get.info("jianglve").changeThisCharacter(player, "jugu");
		},
	},

	// ===================== 董允：秉正/舍宴 =====================
	// 秉正：出牌阶段结束时，你可以令手牌数不等于体力值的一名角色弃置一张手牌或摸一张牌。
	// 然后若其手牌数等于体力值，你摸一张牌，且可以交给该角色一张牌。
	// 参考: skill_refer/sp/skill.js 的 bingzheng（董允"秉正"，效果一致）
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
			const target = event.targets[0];
			let control = "摸一张牌";
			if (target.countCards("h")) {
				control = (
					await player
						.chooseControl("弃置一张手牌", "摸一张牌")
						.set("prompt", `秉正：令${get.translation(target)}弃置一张手牌或摸一张牌`)
						.set("ai", () => (get.attitude(player, target) < 0 ? "弃置一张手牌" : "摸一张牌"))
						.forResult()
				).control;
			}
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
	// 参考: skill_refer/sp/skill.js 的 sheyan（董允"舍宴"，效果一致；xianding 包另有同名技能 sheyan，
	// 因角色不对应（非董允）且效果不同，未采用）
	sheyan: {
		aiShowTag: "support",
		audio: 2,
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			if (!event.targets?.includes(player)) return false;
			const info = get.info(event.card);
			if (!info || info.type != "trick" || info.multitarget) return false;
			if (event.targets.length > 1) return true;
			// 增加的目标虽无距离限制，但仍须是此牌的合法目标（照官方用 targetEnabled2 检查）
			return game.hasPlayer(current => !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, event.player, current));
		},
		async cost(event, trigger, player) {
			const bool1 = game.hasPlayer(current => !trigger.targets.includes(current) && lib.filter.targetEnabled2(trigger.card, trigger.player, current));
			const bool2 = trigger.targets.length > 1;
			let str = "";
			if (bool1) str += `为${get.translation(trigger.card)}额外指定一名目标（无距离限制）`;
			if (bool1 && bool2) str += "，或";
			if (bool2) str += `令${get.translation(trigger.card)}对其中一个目标无效`;
			const next = player
				.chooseTarget(get.prompt(event.skill), str, (card, player, target) => {
					const trigger = get.event().getTrigger();
					if (trigger.targets.includes(target)) return trigger.targets.length > 1;
					return lib.filter.targetEnabled2(trigger.card, trigger.player, target);
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
	// 参考：skill_refer/mobile 官方"手杀执义"(rezhiyi)，效果文字与本项目 translate.js 一致（顺序为
	// "视为使用"排1"摸牌"排2，与手杀顺序相反但语义相同），trigger/filter/content 逐一核实吻合，
	// 仅将官方写法中重复的 sha 花色映射抽成 collect() 复用，逻辑未简化。
	rezhiyi: {
		aiShowTag: "support",
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
	// 参考: skill_refer_guozhan 里 gz_lifeng 实际引用的是基础引擎里(skill_refer/mobile包)的
	// 裸key"tunchu"/"shuliang"，而非huicui包的dc前缀版本——merge工具因gz_lifeng走跨包引用
	// 未能直接收录，需查原始源码确认。mobile版tunchu结构一致（摸牌阶段多摸两张、存为"粮"
	// 标记、持有期间不能用杀），本地版本已是对此结构的合理实现。
	// 与 skill_refer/huicui 的 dc_lifeng-dctunchu"囤储"（初始手牌翻倍/手牌不能被弃置）是另一个
	// 不同技能，非参考。
	// 屯储：摸牌阶段，你可以多摸两张牌，将一至两张手牌置于你的武将牌上，称为“粮”，然后本回合不能使用【杀】。
	// 修复（照官方 tunchu 的结构）：摸牌阶段"多摸两张"用 phaseDrawBegin2 的 trigger.num += 2，摸完
	// （phaseDrawEnd）再强制把一至两张手牌置为"粮"；"粮"改用本技能名做 gaintag/expansion 并配 intro，
	// 这样标记可见、输粮也能正确取到；移除技能时把"粮"置入弃牌堆。
	liangcang: {
		aiShowTag: "draw",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("liangcang"), get.translation("liangcang_info"))
				.set("ai", () => !player.hasSha() || player.hp < 2 || !game.hasPlayer(current => get.attitude(player, current) < 0 && player.canUse("sha", current)))
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.num += 2;
			player.addTempSkill("liangcang_choose", "phaseDrawAfter");
			player.addTempSkill("liangcang_noshu", "phaseAfter");
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		marktext: "粮",
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		subSkill: {
			choose: {
				trigger: { player: "phaseDrawEnd" },
				forced: true,
				popup: false,
				charlotte: true,
				async content(event, trigger, player) {
					player.removeSkill("liangcang_choose");
					if (!player.countCards("h")) {
						return;
					}
					const result = await player
						.chooseCard("h", [1, 2], true, "屯储：将一至两张手牌置于你的武将牌上，称为“粮”")
						.set("ai", card => {
							if (ui.selected.cards.length && get.value(card) > 5) {
								return 0;
							}
							return 6 - get.value(card);
						})
						.forResult();
					if (result.bool && result.cards?.length) {
						const next = player.addToExpansion(result.cards, player, "giveAuto");
						next.gaintag.add("liangcang");
						await next;
					}
				},
			},
			noshu: {
				charlotte: true,
				mod: {
					cardEnabled(card, player) {
						if (card.name == "sha") return false;
					},
				},
				mark: true,
				intro: { content: "本回合不能使用【杀】" },
			},
		},
		ai: { expose: 0.1 },
	},
	// 参考: skill_refer/mobile 包的裸key"shuliang"，正是 gz_lifeng 在国战里实际引用的原版
	// （结束阶段，若目标手牌数小于体力值，可移去一张"粮"标记令其摸两张），与本地"输粮"结构一致。
	// 与 skill_refer/huicui/skill.js 的同名技能"输粮"(dc_lifeng-dcshuliang)是另一个不同技能
	// （交出任意张牌给没手牌的角色，无"粮"标记机制），非参考。
	// 输粮：一名角色的结束阶段，若该角色的手牌数小于其体力上限，你可以移去一张“粮”，令其摸两张牌。
	// 修复："结束阶段"用 phaseJieshuBegin；按卡面比较的是体力上限（maxHp）；移去哪张"粮"由李丰自选。
	dcshuliang: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return player.getExpansions("liangcang").length > 0 && event.player.isIn() && event.player.countCards("h") < event.player.maxHp;
		},
		async cost(event, trigger, player) {
			const goon = get.attitude(player, trigger.player) > 0;
			const result = await player
				.chooseCardButton(get.prompt("dcshuliang", trigger.player), player.getExpansions("liangcang"))
				.set("ai", () => (get.event().goon ? 1 : 0))
				.set("goon", goon)
				.forResult();
			event.result = { bool: result.bool, cost_data: result.links };
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.loseToDiscardpile(event.cost_data);
			await trigger.player.draw(2);
		},
		ai: { expose: 0.1, combo: "liangcang" },
	},

	// ===================== 赵统&赵广：翊赞 =====================
	// 你可以将X张牌（其中至少一张牌是基本牌）当任意基本牌使用或打出。（X为你体力值的一半，向上取整）
	// 参考: skill_refer/offline/skill.js 的 zj_yizan（赵统 zj_zhaotong / 赵广 zj_zhaoguang 共有技能"翊赞"，
	// 官方为固定"两张牌当一张基本牌"，此处改为随体力值变化的X张，核心的选牌当牌实现结构沿用官方）
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
	// 参考: skill_refer/yijiang/skill.js 的 zhuandui（秦宓"专对"，官方为"使用杀指定目标/成为杀目标后拼点，
	// 赢则闪不可响应/杀对自己无效"，此处改为"同势力角色成为杀目标后拼点，赢则杀对目标全部无效，输则可代为受targeted"，
	// 均为"拼点决定杀是否生效"的核心机制，结构可参考）
	// 修复：改在 useCard 时机触发（此时目标已确定、且每张【杀】只触发一次，避免 useCardToTarget 每个目标各触发一次），
	// 直接在 useCard 事件上操作 excluded/targets；"置于牌堆顶"用 player.lose(cards, ui.cardPile, "insert")。
	zhuandui: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		trigger: { global: "useCard" },
		filter(event, player) {
			if (event.card.name != "sha" || !event.targets?.length || event.player == player) return false;
			if (!player.canCompare(event.player)) return false;
			return event.targets.some(target => target.isFriendOf(player));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(`专对：是否与${get.translation(trigger.player)}拼点？`)
				.set("ai", () => {
					if (get.attitude(player, trigger.player) >= 0) return false;
					if (trigger.targets.every(target => get.effect(target, trigger.card, trigger.player, player) >= 0)) return false;
					return player.hasCard(card => get.number(card) >= 10 || get.suit(card) == "heart", "h");
				})
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const result = await player.chooseToCompare(trigger.player).forResult();
			if (result.bool) {
				trigger.excluded.addArray(trigger.targets);
				game.log(trigger.card, "对本次使用的所有目标无效");
			} else if (!trigger.targets.includes(player)) {
				const choose = await player
					.chooseCard("h", "专对：是否将一张手牌置于牌堆顶，取消此【杀】的所有目标，然后你成为此【杀】的目标？")
					.set("ai", card => {
						const player = get.player();
						const trigger = get.event().getTrigger();
						if (trigger.targets.some(target => get.attitude(player, target) > 3 && get.effect(target, trigger.card, trigger.player, player) < 0) && player.hp > 1) {
							return 6 - get.value(card);
						}
						return 0;
					})
					.forResult();
				if (choose.bool && choose.cards?.length) {
					await player.lose(choose.cards, ui.cardPile, "insert");
					trigger.excluded.length = 0;
					trigger.targets.length = 0;
					trigger.targets.add(player);
					game.log(trigger.card, "的目标改为", player);
				}
			}
		},
		ai: { expose: 0.3 },
	},
	// 天辩：你可用牌堆顶的牌进行拼点。你的红桃拼点牌的点数视为K。
	// 参考: skill_refer/yijiang/skill.js 的 tianbian（秦宓"天辩"，效果一致）
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
	// 参考: skill_refer/shenhua/skill.js 的 nzry_juzhan（严颜"拒战"，与本"拒降"效果几乎完全一致，仅技能名不同，转换技结构沿用）
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
	// 参考: skill_refer/shenhua/skill.js 的 dcwanglie（陈到"往烈"，"无距离限制"与"不可响应+限制后续用牌"的
	// 两组效果元素均取自官方，仅将官方"前两张牌被动生效"的结构改为"预选单张手牌"的主动发动结构）
	dcwanglie: {
		aiShowTag: "offense",
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
				trigger: { player: ["useCard", "useCardAfter"] },
				filter(event, player) {
					return player.getStorage("dcwanglie_effect").includes(event.card);
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					if (event.triggername == "useCard") {
						// "不能被响应"：既不能用闪/杀响应（directHit），也不能被无懈可击（nowuxie），同官方 dcwanglie
						trigger.nowuxie = true;
						trigger.directHit.addArray(game.players);
					} else {
						// "使用此牌结算结束后不能再对其他角色使用牌"：在 useCardAfter 时机才加禁令
						player.addTempSkill("dcwanglie_ban", "phaseUseAfter");
					}
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
		check(event, player) {
			if (player.hasSkill("dcwanglie2", null, null, false)) {
				return true;
			}
			if (["wuzhong", "kaihua", "dongzhuxianji"].includes(event.card.name)) {
				return false;
			}
			player._wanglie_temp = true;
			let eff = 0;
			for (const i of event.targets) {
				eff += get.effect(i, event.card, player, player);
			}
			delete player._wanglie_temp;
			if (eff < 0) {
				return true;
			}
			if (
				!player.countCards("h", function (card) {
					return player.hasValueTarget(card, null, true);
				})
			) {
				return true;
			}
			if (
				get.tag(event.card, "damage") &&
				!player.needsToDiscard() &&
				!player.countCards("h", function (card) {
					return get.tag(card, "damage") && player.hasValueTarget(card, null, true);
				})
			) {
				return true;
			}
			return false;
		},
		ai: {
			//pretao:true,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				//if(tag=='pretao') return true;
				if (player._wanglie_temp) {
					return false;
				}
				player._wanglie_temp = true;
				const bool = (function () {
					if (["wuzhong", "kaihua", "dongzhuxianji"].includes(arg.card.name)) {
						return false;
					}
					if (get.attitude(player, arg.target) > 0 || !player.isPhaseUsing()) {
						return false;
					}
					let cards = player.getCards("h", function (card) {
						return card != arg.card && (!arg.card.cards || !arg.card.cards.includes(card));
					});
					let sha = player.getCardUsable("sha");
					if (arg.card.name == "sha") {
						sha--;
					}
					cards = cards.filter(function (card) {
						if (card.name == "sha" && sha <= 0) {
							return false;
						}
						return player.hasValueTarget(card, null, true);
					});
					if (!cards.length) {
						return true;
					}
					if (!get.tag(arg.card, "damage")) {
						return false;
					}
					if (
						!player.needsToDiscard() &&
						!cards.filter(function (card) {
							return get.tag(card, "damage");
						}).length
					) {
						return true;
					}
					return false;
				})();
				delete player._wanglie_temp;
				return bool;
			},
		},
	},

	// ===================== 诸葛瞻：罪论/父荫 =====================
	// 罪论：结束阶段，你可以观看牌堆顶三张牌，你每满足以下一项便获得其中的一张，然后将其余牌以任意顺序置于牌堆顶：
	// 1.你于此回合内造成过伤害；2.你于此回合内未弃置过牌；3.手牌数为全场最少。若均不满足，你与一名其他角色各失去1点体力。
	// 参考: skill_refer/shenhua/skill.js 的 xinfu_zuilun（诸葛瞻"罪论"，效果一致）
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
	// 参考: skill_refer/shenhua/skill.js 的 xinfu_fuyin（诸葛瞻"父荫"，效果一致）
	xinfu_fuyin: {
		aiShowTag: "defense",
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
	// 原创技能，无官方参考
	hb_huoe: {
		aiShowTag: "aoe",
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.hasCards("h"));
		},
		async content(event, trigger, player) {
			// 锁定技不会执行 cost（引擎对 forced 技能直接跳过 cost），目标选择放在 content 里强制进行
			const result = await player
				.chooseTarget([1, 4], true, "火厄：视为对至多四名其他角色使用一张【火攻】", (card, player, target) => target != player && target.hasCards("h"))
				.set("ai", target => get.effect(target, { name: "sha", nature: "fire" }, player, player))
				.forResult();
			if (!result?.bool || !result.targets?.length) {
				return;
			}
			const targets = result.targets.sortBySeat();
			player.line(targets, "fire");
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
					// 展示的牌仍在原目标手里，分配即从其手牌移交给所选角色
					const owner = get.owner(card);
					if (!owner || get.position(card) != "h") {
						continue;
					}
					const result2 = await player
						.chooseTarget(true, `火厄：选择一名角色获得${get.translation(card)}`)
						.set("ai", target => get.attitude(player, target))
						.forResult();
					const target = result2?.bool ? result2.targets[0] : player;
					if (target != owner) {
						await target.gain(card, owner, "giveAuto");
					}
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
	// 原创技能，无官方参考
	hb_tanlin: {
		aiShowTag: "draw",
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
	// 参考: skill_refer/huicui/skill.js 的 jianliang（邓芝"简亮"，官方触发时机为摸牌阶段开始、选至多两名角色摸牌，
	// 此处改为准备阶段、令全势力摸牌，"手牌数不为全场最多"的核心条件沿用官方）
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
	// 参考: skill_refer/huicui/skill.js 的 weimeng（邓芝"危盟"，"获得至多X张牌再等量交还"的核心结构一致，
	// 官方额外的点数比较摸牌/弃牌后续效果按上述说明简化未采用）
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
				// chooseControl 传了 controls 时 choiceList 不会替换按钮，改为纯 choiceList 按 index 取区域
				const names = { h: "手牌区", e: "装备区", j: "判定区" };
				const zresult = await player
					.chooseControl()
					.set("prompt", "危盟：选择获得的区域")
					.set(
						"choiceList",
						zones.map(z => names[z] || z)
					)
					.set("ai", () => (zones.includes("h") ? zones.indexOf("h") : 0))
					.forResult();
				position = zones[zresult.index] || zones[0];
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
	// 参考: skill_refer/sp/skill.js 的 zyqiao（宗预"气傲"，效果一致）
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
			// 卡面："然后你弃置一张手牌"
			if (player.countCards("h", card => lib.filter.cardDiscardable(card, player, "zyqiao"))) {
				await player.chooseToDiscard("h", true);
			}
		},
		check(event, player) {
			var target = event.player;
			if (get.attitude(player, target) >= 0) {
				return false;
			}
			if (
				!player.countCards("he", function (card) {
					return lib.filter.cardDiscardable(card, player, "zyqiao");
				})
			) {
				return true;
			}
			if (player.countCards("he", card => get.value(card, player) < 5)) {
				return true;
			}
			if (target.countCards("he", card => get.value(card, target) > 6) && player.countCards("he", card => get.value(card, player) < 7)) {
				return true;
			}
			return false;
		},
	},
	// 承赏：每名角色回合限一次，当你对其他势力角色使用的牌结算结束后，若此牌未造成过伤害，
	// 你可以检索并获得弃牌堆中与此牌花色相同的一张牌。
	// 参考: skill_refer/sp/skill.js 的 chengshang（宗预"承赏"，效果一致）
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
			if (!event.targets || !event.targets.some(target => target != player && target.isEnemyOf(player))) {
				return false;
			}
			const suit = get.suit(event.card, player);
			return !!get.discardPile(card => get.suit(card, false) == suit);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("chengshang"), "检索并获得弃牌堆中与此牌花色相同的一张牌")
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const suit = get.suit(trigger.card, player);
			// 检索的是弃牌堆（get.cardPile2 是摸牌堆），由你从同花色的牌中选一张获得
			const cards = Array.from(ui.discardPile.childNodes).filter(card => get.suit(card, false) == suit);
			if (!cards.length) {
				return;
			}
			const result = await player
				.chooseButton([`承赏：选择一张${get.translation(suit)}牌获得`, cards], true)
				.set("ai", button => get.value(button.link, player))
				.forResult();
			if (result?.bool && result.links?.length) {
				await player.gain(result.links, "gain2");
			}
		},
	},

	// ============ 刘巴 dc_liuba ============
	// 统度：每名与你势力相同的角色的结束阶段，该角色可以摸X张牌
	// （X为其本回合弃牌阶段弃置的牌数且至多为3）。
	// 参考: skill_refer_guozhan 的 gz_liuba-gztongduo（技能名：统度），效果与本地几乎完全一致
	// （结束阶段，己方角色可摸X张牌，X为其本回合弃牌阶段弃置的牌数且至多为3）；merge工具漏收录
	// 了gz_liuba的技能代码（显示"未找到"），实际在guozhan原始源码里能找到。
	// 与 skill_refer/sp 的同名技能"统度"(ol_liuba-oltongduo)效果不同（原版为准备阶段获得他人一张手牌、
	// 出牌阶段结束时置于牌堆顶），非参考；huicui包dc_liuba本技能为"铸币/流转"，也无对应
	dctongdu: {
		aiShowTag: "draw",
		trigger: { global: "phaseJieshuBegin" },
		direct: true,
		filter(event, player) {
			if (!event.player.isFriendOf(player)) {
				return false;
			}
			return lib.skill.dctongdu.getNum(event.player) > 0;
		},
		// X：其本回合弃牌阶段弃置的牌数（getParent 找不到时返回 {} 为真值，须 forced=true 再判 player）
		getNum(target) {
			let num = 0;
			target.getHistory("lose", evt => {
				if (evt.type != "discard" || !evt.cards2 || !evt.cards2.length) {
					return false;
				}
				const phase = evt.getParent("phaseDiscard", true);
				if (phase && phase.player == target) {
					num += evt.cards2.length;
				}
				return false;
			});
			return Math.min(3, num);
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const num = lib.skill.dctongdu.getNum(target);
			if (num <= 0) {
				return;
			}
			// 同官方 gztongduo：只询问处于结束阶段的角色本人，同意后再记录发动
			const result = await target
				.chooseBool(`是否发动【统度】摸${get.cnNumber(num)}张牌？`)
				.set("ai", () => true)
				.forResult();
			if (result?.bool) {
				player.logSkill("dctongdu", target);
				await target.draw(num);
			}
		},
	},
	// 参考: skill_refer_guozhan 的 gz_liuba-qingyin（技能名：清隐），结构相近（限定技，出牌阶段，
	// 令己方角色回复体力，然后移除此武将牌），但清隐是回复满体力、本地卡面是各回复1点，效果
	// 数值不同，仅结构上借鉴。之前"变更此武将"因引擎限制被简化成"失去统度/归隐"两个技能，
	// 现改用已确认可用的player.changeCharacter()真正变更武将牌（参考郝昭xishe_change的随机
	// 取未用过武将的写法）。
	// 归隐：限定技，出牌阶段，你可以令所有与你势力相同的角色各回复一点体力，然后你变更此武将。
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
			const targets = game.filterPlayer(current => current.isFriendOf(player) && current.hp < current.maxHp).sortBySeat();
			if (targets.length) {
				player.line(targets, "green");
			}
			for (const target of targets) {
				await target.recover();
			}
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const pool = _status.characterlist.filter(name => lib.character[name] && ![player.name1, player.name2, player.name3].includes(name));
			if (!pool.length) {
				return;
			}
			const newName = pool.randomGet();
			// "变更此武将"：找出"归隐"所在的那张武将牌（主将/副将/三将规则下的第三将），只变更这一张
			const owns = name => !!name && !!lib.character[name] && get.character(name, 3).includes("dcguiyin");
			if (owns(player.name1)) {
				await player.changeCharacter(player.name2 ? [newName, player.name2] : [newName]);
			} else if (owns(player.name2)) {
				await player.changeCharacter([player.name1, newName]);
			} else if (owns(player.name3)) {
				// 第三将的技能是开局 addSkill 加上的，引擎没有对应的换将接口，手动换牌面并换技能
				const oldName = player.name3;
				const removeSkills = get.character(oldName, 3).filter(skill => player.hasSkill(skill, null, null, false));
				const addSkills = get.character(newName, 3).filter(skill => lib.skill[skill] && !(lib.skill[skill].zhuSkill && !player.isZhu2()));
				game.log(player, "将第三个武将从", `#b${get.translation(oldName)}`, "变更为了", `#b${get.translation(newName)}`);
				player.name3 = newName;
				if (player.node.avatar3g) {
					player.node.avatar3g.setBackground(newName, "character");
				}
				if (player.node.name3) {
					player.node.name3.innerHTML = get.slimName(newName);
				}
				_status.characterlist.remove(newName);
				_status.characterlist.add(oldName);
				await player.changeSkills(addSkills, removeSkills);
			}
		},
	},

	// ============ 杨婉 yangwan ============
	// 诱言：你的回合内限一次，当你的牌因弃置而置入弃牌堆时，你可以展示牌堆顶的四张牌，然后
	// 获得其中与你此次弃置的牌花色均不同的牌。
	// 参考: skill_refer/xianding/skill.js 的 youyan（杨婉"诱言"，效果一致）
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
			// loseAsync 没有 event.cards，统一用 getl(player).cards2 取你此次因弃置失去的牌
			const evt = event.getl(player);
			return !!(evt && evt.cards2 && evt.cards2.length);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("youyan"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const suits = new Set();
			for (const c of trigger.getl(player).cards2) {
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
		ai: {
			effect: {
				player_use(card, player, target) {
					if (
						typeof card === "object" &&
						player === _status.currentPhase &&
						//(!player.storage.counttrigger||!player.storage.counttrigger.youyan)&&
						player.needsToDiscard() === 1 &&
						card.cards &&
						card.cards.filter(i => {
							return get.position(i) === "h";
						}).length > 0 &&
						!get.tag(card, "draw") &&
						!get.tag(card, "gain") &&
						!get.tag(card, "discard")
					) {
						return "zeroplayertarget";
					}
				},
			},
		},
	},
	// 追还：回合结束时，你可以选择至多两名角色，其中一名角色下一次受到伤害后，其对来源造成
	// 1点伤害；另一名角色下一次受到伤害后，伤害来源弃置两张手牌。
	// 参考: skill_refer/xianding/skill.js 的 zhuihuan（杨婉"追还"，效果一致）
	zhuihuan: {
		aiShowTag: "control",
		aiShowCost: true,
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget([1, 2], get.prompt("zhuihuan"), "选择至多两名角色：第一名角色下一次受到伤害后对来源造成1点伤害；第二名角色下一次受到伤害后伤害来源弃置两张手牌")
				.set("targetprompt", ["反伤1点", "来源弃两张"])
				.set("complexSelect", true)
				.set("complexTarget", true)
				.set("ai", target => {
					const att = get.attitude(player, target);
					if (att <= 0) {
						return 0;
					}
					return att * (target.hasSkill("zhuihuan_counter") || target.hasSkill("zhuihuan_discard") ? 0.5 : 1);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			// "下一次受到伤害后"要跨回合生效：addTempSkill 默认当前回合结束就移除，改为 addSkill 常驻、子技能触发后自删
			const [target1, target2] = event.targets;
			if (target1?.isIn()) {
				target1.addSkill("zhuihuan_counter");
			}
			if (target2?.isIn()) {
				target2.addSkill("zhuihuan_discard");
			}
		},
		subSkill: {
			counter: {
				charlotte: true,
				mark: true,
				marktext: "还",
				intro: { content: "下一次受到伤害后，对伤害来源造成1点伤害" },
				trigger: { player: "damageEnd" },
				forced: true,
				logTarget: "source",
				async content(event, trigger, player) {
					player.removeSkill("zhuihuan_counter");
					const source = trigger.source;
					if (source && source.isIn() && source != player) {
						await source.damage(player);
					}
				},
			},
			discard: {
				charlotte: true,
				mark: true,
				marktext: "还",
				intro: { content: "下一次受到伤害后，伤害来源弃置两张手牌" },
				trigger: { player: "damageEnd" },
				forced: true,
				logTarget: "source",
				async content(event, trigger, player) {
					player.removeSkill("zhuihuan_discard");
					const source = trigger.source;
					if (source && source.isIn() && source.countCards("h") > 0) {
						await source.chooseToDiscard("h", 2, true);
					}
				},
			},
		},
	},

	// ============ 杨仪 yangyi ============
	// 度斩：每回合限一次，当你成为【杀】的目标后，你可以重铸一张牌，然后令此【杀】的使用者
	// 选择一项：1.摸两张牌，令此【杀】无效；2.弃置一张牌，令此【杀】不可被响应。
	// 参考: skill_refer/mobile/skill.js 的 duoduan（杨仪"度断"，效果一致，仅技能名改为"度斩"）
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
	// 参考: skill_refer/mobile/skill.js 的 gongsun（杨仪"共损"，效果一致；tw 包亦有同名同效技能）
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
					position: "he",
					ai1(card) {
						let friend = 0,
							enemy = 0;
						const player = _status.event.player;
						const num = game.countPlayer(target => {
							const att = get.attitude(player, target);
							if (att < 0) {
								enemy++;
							}
							if (target != player && att > 0) {
								friend++;
							}
							return true;
						});
						if (num > friend + enemy + 2 || friend < enemy) {
							return 0;
						}
						if (card.name == "sha") {
							return 10 - enemy;
						}
						return 10 - enemy - get.value(card);
					},
					ai2(target) {
						return -get.attitude(_status.event.player, target) * (1 + target.countCards("h"));
					},
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
	// 参考: skill_refer/offline/skill/offline_piracyS.js 的 longyi（龙羽飞"龙裔"，效果基本一致，
	// homebrew 额外加入"每种牌名每回合限一次"的限制）
	longyi: {
		aiShowTag: "support",
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
	// 参考: skill_refer/offline/skill/offline_piracyS.js 的 zhenjue（龙羽飞"阵绝"，效果一致）
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
	// 参考: skill_refer/offline/character.js+skill 的 qiuan（孟达 pe_mengda，character 定义同键名，
	// 官方基础"置函防伤害"效果一致，转移分支为 homebrew 新增）
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
	// 参考: skill_refer/offline 的 liangfan（孟达"量反"，效果一致）
	liangfan: {
		aiShowTag: "support",
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
		ai: {
			combo: "qiuan",
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
	// 参考: skill_refer/shenhua/skill.js 的 drlt_zhengu（郝昭"镇骨"，效果一致）
	drlt_zhengu: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("drlt_zhengu"), lib.filter.notMe)
				.set("ai", target => {
					const num = Math.min(5, player.countCards("h")) - target.countCards("h");
					return num * get.attitude(player, target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			// 同官方：用常驻标记记录目标，"你的回合结束时"与"其下个回合结束时"各结算一次
			//（addTempSkill 默认本回合结束就移除，第二次结算永远到不了）
			const target = event.targets[0];
			player.addSkill("drlt_zhengu_mark");
			player.markAuto("drlt_zhengu_mark", [target]);
		},
		// 摸至或弃至与你手牌数相同；"最多摸至五张"只封顶摸牌，不封顶弃牌
		async sync(player, target) {
			const num = player.countCards("h");
			const num2 = target.countCards("h");
			if (num < num2) {
				await target.chooseToDiscard(num2 - num, true, "h", "allowChooseAll");
			} else {
				await target.drawTo(Math.min(5, num));
			}
		},
		subSkill: {
			mark: {
				charlotte: true,
				onremove: true,
				intro: { content: "你的回合结束时和$的下个回合结束时，其将手牌摸至或弃置至与你手牌数相同（至多摸至五张）" },
				audio: "drlt_zhengu",
				trigger: { global: "phaseEnd" },
				filter(event, player) {
					if (player == event.player) {
						return player.getStorage("drlt_zhengu_mark").some(current => current.isIn());
					}
					return player.getStorage("drlt_zhengu_mark").includes(event.player);
				},
				forced: true,
				logTarget(event, player) {
					return player == event.player
						? player
								.getStorage("drlt_zhengu_mark")
								.filter(current => current.isIn())
								.sortBySeat()
						: event.player;
				},
				async content(event, trigger, player) {
					if (player == trigger.player) {
						for (const target of event.targets.sortBySeat()) {
							if (!target.isIn()) {
								continue;
							}
							await lib.skill.drlt_zhengu.sync(player, target);
						}
					} else {
						const target = event.targets[0];
						player.unmarkAuto(event.name, [target]);
						if (!player.getStorage(event.name).length) {
							player.removeSkill(event.name);
						}
						await lib.skill.drlt_zhengu.sync(player, target);
					}
				},
			},
		},
	},

	// ============ 司马昭（simazhao） ============
	// 昭然：出牌阶段开始时，你可以令你的手牌对所有角色可见直到此阶段结束。若如此做，当你于本阶段
	// 失去任意花色的最后一张手牌时（每种花色限一次），你摸一张牌或弃置一名其他角色的一张牌。
	// 与yingbian包jin_simazhao的"zhaoran"同名同效，沿用其id（简化了展示牌的具体呈现方式）。
	// 参考: skill_refer/yingbian/skill.js 的 zhaoran（jin_simazhao"昭然"，效果一致）
	zhaoran: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		frequent: true,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("zhaoran"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			// 同官方：手牌持续可见（含本阶段新获得的牌）直到出牌阶段结束，而非只展示一次
			player.addTempSkill("zhaoran_buff", "phaseUseAfter");
			const cards = player.getCards("h");
			if (cards.length) {
				await player.addShownCards({ cards, gaintag: ["visible_zhaoran"] });
			}
		},
	},
	zhaoran_buff: {
		charlotte: true,
		onremove: true,
		group: "zhaoran_visible",
		init(player, skill) {
			if (!player.storage[skill]) {
				player.storage[skill] = [];
			}
		},
		// 失去手牌的各种途径（含他人获得/弃置你的牌、loseAsync）统一用 getl(player) 取失去的手牌
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		forced: true,
		popup: false,
		filter(event, player) {
			const evt = event.getl(player);
			if (!evt || !evt.hs || !evt.hs.length) {
				return false;
			}
			const list = player.getStorage("zhaoran_buff");
			return evt.hs.some(card => {
				const suit = get.suit(card, player);
				return !list.includes(suit) && !player.countCards("h", { suit });
			});
		},
		async content(event, trigger, player) {
			if (trigger.delay === false) {
				await game.delayx();
			}
			const list = [];
			const suits = get.copy(player.getStorage("zhaoran_buff"));
			suits.addArray(player.getCards("h").map(card => get.suit(card, player)));
			for (const card of trigger.getl(player).hs) {
				const suit = get.suit(card, player);
				if (!suits.includes(suit)) {
					list.add(suit);
				}
			}
			player.markAuto("zhaoran_buff", list);
			const filterTarget = (card, current, target) => target != current && target.countDiscardableCards(current, "he") > 0;
			for (let count = list.length; count > 0; count--) {
				if (!game.hasPlayer(current => filterTarget(null, player, current))) {
					player.logSkill("zhaoran_buff");
					await player.draw();
					continue;
				}
				const result = await player
					.chooseTarget("昭然：弃置一名其他角色的一张牌，或点“取消”摸一张牌", filterTarget)
					.set("ai", target => {
						const att = get.attitude(player, target);
						if (att >= 0) {
							return 0;
						}
						return target.countCards("he", card => get.value(card) > 5) ? -att : 0;
					})
					.forResult();
				if (!result?.bool || !result.targets?.length) {
					player.logSkill("zhaoran_buff");
					await player.draw();
					continue;
				}
				const target = result.targets[0];
				player.logSkill("zhaoran_buff", target);
				await player.discardPlayerCard(target, "he", true);
			}
		},
		intro: { content: "已因$牌触发过效果" },
	},
	zhaoran_visible: {
		charlotte: true,
		trigger: { player: ["phaseUseEnd", "gainBegin"] },
		forced: true,
		firstDo: true,
		silent: true,
		popup: false,
		async content(event, trigger, player) {
			if (event.triggername == "gainBegin") {
				trigger.gaintag.add("visible_zhaoran");
			} else {
				await player.hideShownCards({ cards: player.getCards("h"), gaintag: ["visible_zhaoran"] });
			}
		},
	},
	// 筹伐：出牌阶段限一次，你可以展示一名其他角色一张手牌，令其当前手牌中与此牌类型不同的牌
	// 视为【杀】直到其回合结束。与yingbian包"xinchoufa"同名同效，沿用其id。
	// 参考: skill_refer/yingbian/skill.js 的 xinchoufa（jin_simazhao"筹伐"，效果一致）
	xinchoufa: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.xinchoufa.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player.choosePlayerCard({ target, position: "h", forced: true }).forResult();
			if (!result?.bool || !result.cards?.length) {
				return;
			}
			const card = result.cards[0];
			await player.showCards(result.cards, `${get.translation(player)}对${get.translation(target)}发动了【蓄伐】`);
			// 同官方：用 get.type2（延时锦囊也算锦囊）比较类型，标记 gaintag，效果持续到其（下个）回合结束
			const type = get.type2(card, target);
			const hs = target.getCards("h", c => c !== card && get.type2(c, target) !== type);
			if (!hs.length) {
				return;
			}
			target.addGaintag(hs, "xinchoufa");
			target.addTempSkill("xinchoufa_buff", { player: "phaseAfter" });
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					return -target.countCards("h");
				},
			},
		},
	},
	xinchoufa_buff: {
		charlotte: true,
		onremove(player) {
			player.removeGaintag("xinchoufa");
		},
		mod: {
			cardname(card) {
				if (get.itemtype(card) == "card" && card.hasGaintag("xinchoufa")) {
					return "sha";
				}
			},
			cardnature(card) {
				if (get.itemtype(card) == "card" && card.hasGaintag("xinchoufa")) {
					return false;
				}
			},
		},
	},

	// ============ 司马师（simashi） ============
	// 夷灭：每回合限一次，当你于回合内对其他角色造成伤害时，你可以失去1点体力，然后令此伤害增加
	// 至其体力值，结算完成后，若其未死亡，其回复等同于伤害增加值的体力。
	// 参考: skill_refer/yingbian/skill.js 的 yimie（jin_simashi"夷灭"，效果一致；character.js 已注明
	// simashi 卡面技能名与 mobile 包原版不同，此处采用的是 yingbian 包 jin_simashi 的同名技能，效果吻合）
	yimie: {
		aiShowTag: "support",
		audio: 2,
		usable: 1,
		trigger: { source: "damageBegin1" },
		logTarget: "player",
		filter(event, player) {
			// 同官方：不要求你体力大于1（失去体力进入濒死是玩家自己的选择）
			return _status.currentPhase === player && event.player && event.player != player && event.player.isIn() && event.num < event.player.hp;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("yimie"))
				.set("ai", () => lib.skill.yimie.check(trigger, player))
				.forResult();
		},
		async content(event, trigger, player) {
			await player.loseHp();
			const target = trigger.player;
			// 增加值记在这次伤害事件上，结算完成后由 yimie_recover 按同一事件回复
			trigger.yimie_num = target.hp - trigger.num;
			trigger.num = target.hp;
			target.addTempSkill("yimie_recover");
		},
		check(event, player) {
			if (
				event.player.hasSkillTag("nodamage", null, {
					source: player,
					card: event.card,
					natures: get.natureList(event),
				})
			) {
				return false;
			}
			let tj = player.countCards("hs", function (card) {
					return get.name(card) === "tao" || get.name(card) === "jiu";
				}),
				att = get.attitude(_status.event.player, event.player),
				eff = get.damageEffect(event.player, player, _status.event.player, get.natureList(event)),
				fd = event.player.hasSkillTag("filterDamage", null, {
					player: player,
					card: event.card,
				}),
				hp = player.hp + tj;
			if (player.storage.tairan2) {
				hp -= player.storage.tairan2;
			}
			if (eff <= 0 || fd || att >= -2 || Math.abs(hp) <= 1) {
				return false;
			}
			if (hp > 2 || (eff > 0 && event.player.isLinked() && event.hasNature())) {
				return true;
			}
			return !event.player.countCards("hs") || (event.player.hp > 2 * event.num && !event.player.hasSkillTag("maixie"));
		},
		ai: {
			damageBonus: true,
			skillTagFilter(player, tag, arg) {
				return arg && arg.target && arg.target.hp > 1 && player.hp > 1 && get.attitude(player, arg.target) < -2;
			},
		},
	},
	yimie_recover: {
		charlotte: true,
		trigger: { player: "damageEnd" },
		forced: true,
		popup: false,
		filter(event, player) {
			return typeof event.yimie_num == "number" && event.yimie_num > 0;
		},
		async content(event, trigger, player) {
			player.removeSkill("yimie_recover");
			await player.recover(trigger.yimie_num);
		},
	},
	// 泰然：锁定技，回合结束时，你回复体力至上限且手牌摸至体力上限；出牌阶段开始时，你失去上
	// 回合以此法回复的体力，弃置以此法获得的手牌。
	// 参考: skill_refer/yingbian/skill.js 的 tairan（jin_simashi"泰然"，效果一致）
	tairan: {
		aiShowTag: "recover",
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
	// 参考: skill_refer_guozhan 原始源码(character/yingbian.js的gz_jin_jiachong在jinEx配置为
	// true时使用的legacy技能对)里的 fakexiongshu，效果结构与本地几乎一致（useCard指定唯一
	// 目标后触发；是使用者则摸牌+指定他人代替成为伤害来源，不是使用者则弃牌+自己代替成为
	// 伤害来源）。merge工具因gz_jin_jiachong走skills二选一的动态数组未能收录，需查原始
	// 源码才能找到。与 skill_refer/yingbian 的同名"xiongshu"（固定目标横置/展示手牌判定机制）
	// 是另一个不同版本，非参考。
	// 凶竖：每回合限一次，一名角色使用【杀】或伤害类锦囊牌指定目标后，若你为此牌的使用者，你可以
	// 摸一张牌，然后令一名其他角色代替你称为此牌的伤害来源；若你不为此牌的使用者，你可以弃置
	// 一张牌，然后代替使用者成为此牌的伤害来源。
	xiongshu: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		usable: 1,
		// 同官方 fakexiongshu：指定目标后（useCardToPlayered）只在首个目标时触发一次，AOE 不重复询问
		trigger: { global: "useCardToPlayered" },
		filter(event, player) {
			if (!event.isFirstTarget) {
				return false;
			}
			if (event.card.name != "sha" && !(get.type(event.card) == "trick" && get.tag(event.card, "damage"))) {
				return false;
			}
			if (event.player == player) {
				return game.hasPlayer(current => current != player);
			}
			return player.countDiscardableCards(player, "he") > 0;
		},
		async cost(event, trigger, player) {
			if (trigger.player == player) {
				event.result = await player
					.chooseBool(get.prompt("xiongshu"), `摸一张牌，然后令一名其他角色代替你成为${get.translation(trigger.card)}的伤害来源`)
					.set("ai", () => !trigger.targets.some(current => current.hp == 1 && get.attitude(player, current) < 0))
					.forResult();
			} else {
				// "你可以弃置一张牌"：可取消，只选牌不弃，弃置放在 content 里
				event.result = await player
					.chooseToDiscard("he", get.prompt("xiongshu"), `弃置一张牌，然后代替${get.translation(trigger.player)}成为${get.translation(trigger.card)}的伤害来源`, "chooseonly")
					.set("ai", card => {
						const goon = trigger.targets.some(current => current.hp <= 1 && get.attitude(player, current) < 0);
						return goon ? 6 - get.value(card) : 0;
					})
					.forResult();
			}
		},
		async content(event, trigger, player) {
			const useEvent = trigger.getParent();
			useEvent.customArgs ??= { default: {} };
			useEvent.customArgs.default ??= {};
			if (trigger.player == player) {
				await player.draw();
				const result = await player
					.chooseTarget(`凶竖：令一名其他角色代替你成为${get.translation(trigger.card)}的伤害来源`, true, lib.filter.notMe)
					.set("ai", target => trigger.targets.reduce((sum, current) => sum + get.damageEffect(current, target, player), 0))
					.forResult();
				if (result?.bool && result.targets?.length) {
					const target = result.targets[0];
					player.line(target);
					game.log(target, "成为了", trigger.card, "的伤害来源");
					useEvent.customArgs.default.customSource = target;
				}
			} else {
				// 你不是使用者：弃置所选的牌，然后由你代替使用者成为伤害来源
				await player.discard(event.cards);
				game.log(player, "成为了", trigger.card, "的伤害来源");
				useEvent.customArgs.default.customSource = player;
			}
		},
	},
	// 参考: skill_refer_guozhan 原始源码(character/yingbian.js的gz_jin_jiachong legacy技能对)
	// 里的 fakejianhui，效果结构一致（同势力间伤害后，选一方摸牌一方被弃牌）。与
	// skill_refer/yingbian 的同名"jianhui"（记仇复仇型技能）是另一个不同版本，非参考。
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
			const result = await player.chooseControl(["伤害来源摸一张牌", "受伤角色摸一张牌"], "cancel2").set("prompt", get.prompt2("jianhui")).forResult();
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
	// 参考: skill_refer/standard/skill.js 的 ganglie（沿用其id及"受伤判定"触发点，但判定标准由黑桃/红桃改为按颜色，效果重新设计）
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
		check(event, player) {
			if (!event.source?.isIn()) {
				return Math.random() < 0.5;
			}
			return get.attitude(player, event.source) <= 0;
		},
		ai: {
			maixie_defend: true,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return [1, -1];
					}
					return 0.8;
					// if(get.tag(card,'damage')&&get.damageEffect(target,player,player)>0) return [1,0,0,-1.5];
				},
			},
		},
	},
	// 与 skill_refer/refresh 的同名技能"qingjian"效果不同（原版触发点相同"回合外获得牌"，但原版是限量4次地将"刚获得的那些牌"直接分给他人，不含"展示任意张手牌"的设计），非参考
	// 原创技能，无官方参考
	// 清俭：每回合限一次，当你于摸牌阶段外获得牌后，你可以展示任意张牌并将这些牌交给一名其他角色。
	qingjian: {
		aiShowTag: "support",
		audio: 2,
		usable: 1,
		trigger: { player: "gainAfter" },
		filter(event, player) {
			if (event.getlx === false || !event.cards?.length) {
				return false;
			}
			// "摸牌阶段外"：摸牌阶段的 gain 直接父事件是 draw，要沿父链找 phaseDraw（找不到须返回 undefined）
			const evt = event.getParent("phaseDraw", true);
			if (evt && evt.player == player) {
				return false;
			}
			return player.countCards("he") > 0 && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(get.prompt("qingjian"), "展示任意张牌并将这些牌交给一名其他角色", "he", [1, Infinity])
				.set("ai", card => {
					if (!game.hasPlayer(current => current != player && get.attitude(player, current) > 2)) {
						return 0;
					}
					return player.countCards("h") > player.hp ? 5 - get.value(card, player) : 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			await player.showCards(cards, `${get.translation(player)}发动了【清俭】`);
			// 展示后必须交给一名其他角色（已付出展示的代价，不再可取消）
			const result = await player
				.chooseTarget("清俭：将展示的牌交给一名其他角色", true, lib.filter.notMe)
				.set("ai", target => get.attitude(player, target))
				.forResult();
			if (result?.bool && result.targets?.length) {
				const target = result.targets[0];
				player.line(target, "green");
				await player.give(cards, target);
			}
		},
	},

	// ============ 甄姬（zhenji） ============
	// 参考: skill_refer/standard/skill.js 的 qingguo（同名同效，沿用其id）
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
	// 参考: skill_refer/standard/skill.js 的 luoshen（同名同效，沿用其id）
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
	// 与 skill_refer/onlyOL 的同名技能"shenfu"效果不同（原版为另一套设计），非参考
	// 原创技能，无官方参考
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
	// 参考: skill_refer/shenhua/skill.js 的 shensu（沿用其id及"跳过阶段视为使用无距离限制的杀"的核心设计）
	// 神速：你可以做出如下选择：1.跳过判定阶段和摸牌阶段；2.跳过出牌阶段并弃置一张装备牌；
	// 3.跳过弃牌阶段并叠置。你每选择一项，便视为你使用一张无距离限制的【杀】。
	shensu: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { player: ["phaseJudgeBefore", "phaseUseBefore", "phaseDiscardBefore"] },
		filter(event, player, name) {
			// 无距离限制的【杀】：canUse 第三参 false = 不检查距离
			if (!game.hasPlayer(current => current != player && player.canUse({ name: "sha" }, current, false))) {
				return false;
			}
			if (name == "phaseUseBefore") {
				// 官方允许弃置手牌中的装备牌
				return player.countCards("he", card => get.type(card) == "equip" && lib.filter.cardDiscardable(card, player)) > 0;
			}
			return true;
		},
		async cost(event, trigger, player) {
			const filterTarget = (card, player, target) => target != player && player.canUse({ name: "sha" }, target, false);
			const ai = target => (_status.event.goon ? get.effect(target, { name: "sha" }, player, player) : 0);
			if (event.triggername == "phaseJudgeBefore") {
				event.result = await player
					.chooseTarget(get.prompt("shensu"), "跳过判定阶段和摸牌阶段，视为对一名其他角色使用一张无距离限制的【杀】", filterTarget)
					.set("goon", player.countCards("h") > 2)
					.set("ai", ai)
					.forResult();
			} else if (event.triggername == "phaseUseBefore") {
				event.result = await player
					.chooseCardTarget({
						prompt: get.prompt("shensu"),
						prompt2: "弃置一张装备牌并跳过出牌阶段，视为对一名其他角色使用一张无距离限制的【杀】",
						filterCard(card, player) {
							return get.type(card) == "equip" && lib.filter.cardDiscardable(card, player);
						},
						position: "he",
						filterTarget,
						ai1(card) {
							return _status.event.goon ? 6 - get.value(card) : 0;
						},
						ai2: ai,
						goon: player.countCards("hs", card => player.hasValueTarget(card, null, true)) <= player.hp - 1,
					})
					.forResult();
			} else {
				event.result = await player
					.chooseTarget(get.prompt("shensu"), "跳过弃牌阶段并叠置，视为对一名其他角色使用一张无距离限制的【杀】", filterTarget)
					.set("goon", player.needsToDiscard() > 0 && !player.isTurnedOver())
					.set("ai", ai)
					.forResult();
			}
		},
		async content(event, trigger, player) {
			trigger.cancel();
			const target = event.targets[0];
			if (event.triggername == "phaseJudgeBefore") {
				player.skip("phaseDraw");
			} else if (event.triggername == "phaseUseBefore") {
				await player.discard(event.cards);
			} else {
				// 叠置=翻面，已用turnOver实现（详见曹仁jushou/yanzheng处的说明）
				await player.turnOver(true);
			}
			// 同官方：直接对已选目标使用虚拟【杀】（chooseToUse 两参数时对象会被当成真实牌过滤器，永远无牌可选）
			if (target?.isIn()) {
				await player.useCard({ name: "sha", isCard: true }, target, false);
			}
		},
	},
	// 与 skill_refer/refresh 的同名技能"shebian"效果不同（原版为翻面后移动场上牌），非参考
	// 原创技能，无官方参考
	// 设变：锁定技，当你受到来自黑色牌的伤害后，可以复原武将牌。
	shebian: {
		aiShowTag: "defense",
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
	// 参考: skill_refer/shenhua/skill.js 的 qiaobian（同名同效，沿用其id，简化了"置于牌堆顶"的替代弃牌方式）
	// 巧变：你可以弃置一张牌，跳过你的一个阶段（准备阶段和结束阶段除外）。当你因此跳过：
	// 摸牌阶段，你可以获得至多两名其他角色各一张手牌；出牌阶段，你可以移动场上的一张牌。
	// 与官方版"qiaobian"同名同效，沿用其id（简化了"置于牌堆顶"的替代弃牌方式）。
	qiaobian: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		group: ["qiaobian_record", "qiaobian_effect"],
		trigger: { player: ["phaseJudgeBefore", "phaseDrawBefore", "phaseUseBefore", "phaseDiscardBefore"] },
		filter(event, player) {
			return player.countCards("he", card => lib.filter.cardDiscardable(card, player, "qiaobian")) > 0;
		},
		async cost(event, trigger, player) {
			const name = ["判定", "摸牌", "出牌", "弃牌"][lib.skill.qiaobian.trigger.player.indexOf(event.triggername)];
			let str = `弃置一张牌或将其置于牌堆顶，跳过${name}阶段`;
			if (trigger.name == "phaseDraw") {
				str += "，然后可以获得至多两名其他角色各一张手牌";
			}
			if (trigger.name == "phaseUse") {
				str += "，然后可以移动场上的一张牌";
			}
			// AI 判断沿用官方 qiaobian
			let check;
			switch (trigger.name) {
				case "phaseJudge":
					check = player.countCards("j") > 0;
					break;
				case "phaseDraw": {
					let num = 0,
						num2 = 0;
					for (const current of game.filterPlayer()) {
						if (current != player && current.countCards("h")) {
							const att = get.attitude(player, current);
							if (att <= 0) {
								num++;
							}
							if (att < 0) {
								num2++;
							}
						}
					}
					check = num >= 2 && num2 > 0;
					break;
				}
				case "phaseUse":
					if (!player.canMoveCard(true)) {
						check = false;
					} else {
						check = game.hasPlayer(current => get.attitude(player, current) > 0 && current.countCards("j"));
						if (!check) {
							check = !(player.countCards("h") > player.hp + 1 || player.countCards("h", { name: "wuzhong" }));
						}
					}
					break;
				default:
					check = player.needsToDiscard() > 0;
			}
			event.result = await player
				.chooseCard(get.prompt("qiaobian"), str, "he", (card, player) => lib.filter.cardDiscardable(card, player, "qiaobian"))
				.set("ai", card => (_status.event.check ? 7 - get.value(card) : -1))
				.set("check", check)
				.forResult();
		},
		async content(event, trigger, player) {
			const card = event.cards[0];
			const name = ["判定", "摸牌", "出牌", "弃牌"][lib.skill.qiaobian.trigger.player.indexOf(event.triggername)];
			// "弃置一张牌或将其置于牌堆顶"
			const result = await player
				.chooseControl("弃置", "置于牌堆顶")
				.set("prompt", `巧变：${get.translation(card)}`)
				.set("ai", () => (trigger.name == "phaseJudge" && get.value(card, player) >= 5 ? 1 : 0))
				.forResult();
			if (result.control == "置于牌堆顶") {
				await player.lose(card, ui.cardPile, "insert");
				game.log(player, "将", card, "置于了牌堆顶");
			} else {
				await player.discard(card);
			}
			trigger.cancel();
			game.log(player, "跳过了", `#y${name}阶段`);
			// 跳过后的效果统一由 qiaobian_effect 在 phaseXxxCancelled/Skipped 时机结算（其他技能造成的跳过同样触发）
		},
		subSkill: {
			// 记录判定阶段内新增的跳过（乐不思蜀/兵粮寸断等延时锦囊造成），供 qiaobian_effect 排除
			record: {
				charlotte: true,
				forced: true,
				silent: true,
				popup: false,
				trigger: { player: ["phaseBeforeStart", "phaseJudgeBegin", "phaseJudgeEnd"] },
				async content(event, trigger, player) {
					if (event.triggername == "phaseJudgeBegin") {
						player.storage.qiaobian_snapshot = player.skipList.slice();
					} else if (event.triggername == "phaseJudgeEnd") {
						const before = player.storage.qiaobian_snapshot || [];
						player.storage.qiaobian_delayskip = player.skipList.filter(name => !before.includes(name));
						delete player.storage.qiaobian_snapshot;
					} else {
						delete player.storage.qiaobian_delayskip;
						delete player.storage.qiaobian_snapshot;
					}
				},
			},
			effect: {
				charlotte: true,
				audio: "qiaobian",
				trigger: { player: ["phaseDrawSkipped", "phaseDrawCancelled", "phaseUseSkipped", "phaseUseCancelled"] },
				filter(event, player) {
					// "因延时锦囊以外的效果跳过"
					if (player.getStorage("qiaobian_delayskip").includes(event.name)) {
						return false;
					}
					if (event.name == "phaseDraw") {
						return game.hasPlayer(current => current != player && current.countCards("h") > 0);
					}
					return player.canMoveCard();
				},
				prompt2(event, player) {
					return event.name == "phaseDraw" ? "获得至多两名其他角色各一张手牌" : "移动场上的一张牌";
				},
				check(event, player) {
					if (event.name == "phaseDraw") {
						return game.hasPlayer(current => current != player && current.countCards("h") > 0 && get.attitude(player, current) < 0);
					}
					return player.canMoveCard(true);
				},
				async content(event, trigger, player) {
					if (trigger.name == "phaseUse") {
						if (player.canMoveCard()) {
							await player.moveCard();
						}
						return;
					}
					const result = await player
						.chooseTarget([1, 2], "巧变：获得至多两名其他角色各一张手牌", (card, player, target) => target != player && target.countCards("h") > 0)
						.set("ai", target => 1 - get.attitude(player, target))
						.forResult();
					if (!result?.bool || !result.targets?.length) {
						return;
					}
					result.targets.sortBySeat();
					player.line(result.targets, "green");
					await player.gainMultiple(result.targets);
					await game.delay();
				},
			},
		},
		ai: { threaten: 3 },
	},

	// ============ 曹仁（old_caoren） ============
	// 参考: skill_refer_guozhan 的 gz_jushou（"结束阶段摸X张牌，X为亮明势力数，若X大于2则
	// 叠置"，与本地X的计算方式和>2叠置阈值完全一致，官方用turnOver()实现叠置，印证本地
	// 用turnOver()/isTurnedOver()是正确写法）；shenhua包同名"jushou"（摸3张并翻面）与
	// shenhua包"xinjujou"（摸4张+弃牌，弃到装备则改为使用之）是另外两个不同版本。本地"你
	// 可以使用一张装备牌"是卡面本身的简化选择（不要求先弃牌），未强行套用官方"先弃牌"流程，
	// 保留卡面原意。
	// 据守：结束阶段，你可以摸X张牌（X为存活角色亮明势力数），然后你可以使用一张装备牌。
	// 若X大于2，则你将武将牌叠置。
	jushou: {
		aiShowTag: "draw",
		audio: 2,
		group: ["jushou_mark"],
		trigger: { player: "phaseJieshuBegin" },
		// X：存活角色亮明的势力数。国战按 isFriendOf 去重（野心家各算一个势力；game.countGroup 按 group 去重会把野心家并入同势力）
		countGroups() {
			if (get.mode() != "guozhan") {
				return game.countGroup();
			}
			const groups = [];
			for (const target of game.filterPlayer()) {
				if (target.isUnseen(-1)) {
					continue;
				}
				if (!groups.some(current => current.isFriendOf(target))) {
					groups.push(target);
				}
			}
			return groups.length;
		},
		async cost(event, trigger, player) {
			const x = lib.skill.jushou.countGroups();
			event.result = await player
				.chooseBool(get.prompt("jushou"), `摸${get.cnNumber(x)}张牌，然后可以使用一张装备牌${x > 2 ? "，并将武将牌叠置" : ""}`)
				.set("ai", () => x <= 2 || player.isTurnedOver() || player.hp + player.countCards("h") < 4)
				.forResult();
		},
		async content(event, trigger, player) {
			const x = lib.skill.jushou.countGroups();
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
				await player.turnOver(true);
			}
		},
	},
	jushou_mark: {
		charlotte: true,
		mark: true,
		marktext: "守",
		intro: {
			content(storage, player) {
				return player.isTurnedOver() ? "叠置状态" : "平置状态";
			},
		},
	},
	// 与 skill_refer/sp 的同名技能"yanzheng"效果不同（原版触发条件为"手牌数大于体力值"而非"叠置状态"，且无解除叠置的联动），非参考
	// 原创技能，无官方参考。"叠置状态"的判断与解除均改用player.isTurnedOver()/turnOver()，
	// 说明同上方jushou处。
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
			if (!player.isTurnedOver()) {
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
				return !!player.isTurnedOver();
			},
		},
	},
	yanzheng_flat: {
		aiShowTag: "response",
		charlotte: true,
		audio: "yanzheng",
		trigger: { player: "eventNeutralized", target: "useCardToAfter" },
		filter(event, player, name) {
			if (!player.isTurnedOver()) {
				return false;
			}
			if (name == "eventNeutralized") {
				// 你使用的【无懈可击】被（另一张无懈）抵消：被抵消的是这张无懈的结算事件（type=card）
				return event.type == "card" && !!event.card && event.card.name == "wuxie" && event.player == player;
			}
			// 其他角色的锦囊牌对你生效后（被无懈/取消的不算）
			return event.type == "card" && !!event.card && get.type(event.card) == "trick" && event.player != player && !event._neutralized && !event._cancelled;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool("严整：是否平置武将牌？")
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.turnOver(false);
		},
	},

	// ============ 典韦（dianwei） ============
	// 参考: skill_refer/shenhua/skill.js 的 qiangxix（沿用其id及核心效果"失去体力或弃武器造成1点伤害"，限制方式改为对每名角色限一次而非每回合限两次）
	// 强袭：出牌阶段对每名角色限一次，你可以失去1点体力或弃置一张武器牌，对一名其他角色造成
	// 1点伤害。与官方版"qiangxix"同名，改为对每名角色限一次而非本阶段限一次。
	qiangxix: {
		aiShowTag: "offense",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		// 同官方 qiangxix：选牌即弃武器、不选牌即失去体力，在 useSkill 里一次完成；不再要求体力大于1
		filter(event, player) {
			if (player.hp < 1 && !player.hasCard(card => lib.skill.qiangxix.filterCard(card), "he")) {
				return false;
			}
			return game.hasPlayer(current => lib.skill.qiangxix.filterTarget(null, player, current));
		},
		filterCard(card) {
			return get.subtype(card) == "equip1";
		},
		position: "he",
		selectCard() {
			return _status.event.player.hp < 1 ? 1 : [0, 1];
		},
		prompt: "失去1点体力或弃置一张武器牌，对一名其他角色造成1点伤害（对每名角色限一次）",
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			// "对每名角色限一次"：记在本回合 stat 上，回合更替自动重置（取消发动不会计入）
			const stat = player.getStat()._qiangxix;
			return !stat || !stat.includes(target);
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const { cards } = event;
			const stat = player.getStat();
			stat._qiangxix ??= [];
			stat._qiangxix.push(target);
			if (!cards?.length) {
				await player.loseHp();
			}
			await target.damage("nocard");
		},
		ai: {
			damage: true,
			order: 8,
			result: {
				player(player, target) {
					if (ui.selected.cards.length) {
						return 0;
					}
					if (player.hp >= target.hp) {
						return -0.9;
					}
					if (player.hp <= 2) {
						return -10;
					}
					return get.effect(player, { name: "losehp" }, player, player);
				},
				target(player, target) {
					if (!ui.selected.cards.length) {
						if (player.hp < 2) {
							return 0;
						}
						if (player.hp == 2 && target.hp >= 2) {
							return 0;
						}
						if (target.hp > player.hp) {
							return 0;
						}
					}
					return get.damageEffect(target, player, target);
				},
			},
			threaten: 1.5,
		},
	},

	// ============ 荀彧（xunyu） ============
	// 参考: skill_refer/shenhua/skill.js 的 quhu（同名同效，沿用其id）
	// 驱虎：出牌阶段限一次，你可以与一名体力值大于你的角色拼点。若你赢，其对其攻击范围内你指定的
	// 另一名角色造成1点伤害；没赢，其对你造成1点伤害。
	quhu: {
		aiShowTag: "support",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(current => lib.skill.quhu.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target != player && target.hp > player.hp && player.canCompare(target);
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			// 平局时 bool 为 false，同样算"没赢"
			const { bool } = await player.chooseToCompare(target).forResult();
			if (!bool) {
				if (target.isIn()) {
					await player.damage(target);
				}
				return;
			}
			if (!target.isIn()) {
				return;
			}
			if (!game.hasPlayer(current => current != target && target.inRange(current))) {
				return;
			}
			// 赢后必须指定其攻击范围内的一名角色（同官方 forced）
			const result = await player
				.chooseTarget(get.prompt2("quhu"), true, (card, player, current) => current != target && target.inRange(current))
				.set("ai", current => get.damageEffect(current, target, player))
				.forResult();
			if (result?.bool && result.targets?.length) {
				const victim = result.targets[0];
				target.line(victim, "green");
				await victim.damage(target);
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
	// 参考: skill_refer/shenhua/skill.js 的 jieming（同名同效，沿用其id）
	// 节命：当你受到伤害或死亡时，你可以令一名角色摸X张牌，然后将手牌弃至X张
	// （X为其体力上限且至多为5）。
	jieming: {
		aiShowTag: "defense",
		aiShowCost: true,
		trigger: { player: ["damageEnd", "die"] },
		// 死亡角色自己的触发必须 forceDie；死亡分支由 die 时机结算，致死伤害的 damageEnd（此时已死亡）不再重复触发
		forceDie: true,
		filter(event, player, name) {
			if (name == "damageEnd") {
				return player.isAlive();
			}
			return true;
		},
		async cost(event, trigger, player) {
			// "你可以令一名角色"：可取消，不再 forced
			event.result = await player
				.chooseTarget(get.prompt2("jieming"))
				.set("ai", target => {
					let att = get.attitude(player, target);
					if (target.hasSkillTag("nogain")) {
						att /= 6;
					}
					if (att > 2) {
						return Math.max(0, Math.min(5, target.maxHp) - target.countCards("h"));
					}
					return att / 3;
				})
				.forResult();
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
	// 参考: skill_refer/shenhua/_merged.md 的 caopi-xingshang（技能名：行殇，"角色死亡后获得其所有牌"部分核心一致，
	// 本技能改为二选一并加入回复体力的分支，技能名"行殒"与官方"行殇"不同字，视为在此基础上的改编）
	// 行殒：当其他角色死亡时，你可以选择一项：1.获得其所有牌；2.回复1点体力。
	xingyun: {
		aiShowTag: "recover",
		trigger: { global: "die" },
		filter(event, player) {
			return event.player != player && (event.player.countCards("he") > 0 || player.isDamaged());
		},
		async cost(event, trigger, player) {
			const canGain = trigger.player.countCards("he") > 0;
			const choices = canGain ? ["获得其所有牌", "回复1点体力"] : ["回复1点体力"];
			// 选项结果通过 cost_data 传给 content（content 里的 event.control 恒为 undefined）；cancel2 允许不发动
			const result = await player
				.chooseControl(choices, "cancel2")
				.set("prompt", get.prompt2("xingyun"))
				.set("ai", () => {
					if (canGain && (!player.isDamaged() || trigger.player.countCards("he") >= 2)) {
						return "获得其所有牌";
					}
					return player.isDamaged() ? "回复1点体力" : "获得其所有牌";
				})
				.forResult();
			event.result = { bool: result.control != "cancel2", cost_data: result.control };
		},
		async content(event, trigger, player) {
			if (event.cost_data == "获得其所有牌") {
				const cards = trigger.player.getCards("he");
				if (cards.length) {
					await player.gain(cards, trigger.player, "giveAuto", "bySelf");
				}
			} else {
				await player.recover();
			}
		},
	},
	// 参考: skill_refer/shenhua/skill.js 的 fangzhu（同名同效，沿用其id）
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
		ai: {
			maixie: true,
			maixie_hp: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						if (target.hp <= 1) {
							return;
						}
						if (!target.hasFriend()) {
							return;
						}
						let hastarget = false;
						let turnfriend = false;
						const players = game.filterPlayer();
						for (let i = 0; i < players.length; i++) {
							if (get.attitude(target, players[i]) < 0 && !players[i].isTurnedOver()) {
								hastarget = true;
							}
							if (get.attitude(target, players[i]) > 0 && players[i].isTurnedOver()) {
								hastarget = true;
								turnfriend = true;
							}
						}
						if (get.attitude(player, target) > 0 && !hastarget) {
							return;
						}
						if (turnfriend || target.hp == target.maxHp) {
							return [0.5, 1];
						}
						if (target.hp > 1) {
							return [1, 0.5];
						}
					}
				},
			},
		},
	},

	// ============ 邓艾（dengai） ============
	// 参考: skill_refer/shenhua/skill.js 的 tuntian（同名同效，沿用其id）
	// 屯田：当你于回合外失去牌后，你可以判定，若结果为♥，你获得之，否则你可以将此判定牌置于
	// 你的武将牌上，称为"田"。你计算与其他角色的距离-X（X为"田"的数量）。当一名与你势力相同
	// 的角色受到伤害后，你可以将一张"田"交给该角色。
	tuntian: {
		aiShowTag: "defense",
		group: ["tuntian_give", "tuntian_dist"],
		preHidden: ["tuntian_give"],
		// 官方写法：牌被他人获得/置入装备区等时内部lose带getlx:false，只挂loseAfter收不到，需同时挂global的这些时机
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			if (_status.currentPhase == player) {
				return false;
			}
			if (event.name == "gain" && event.player == player) {
				return false;
			}
			const evt = event.getl(player);
			return !!(evt && evt.cards2 && evt.cards2.length);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("tuntian"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const judge = player.judge(card => (get.suit(card) == "heart" ? 1 : -1));
			judge.judge2 = result => result.bool;
			const result = await judge.forResult();
			if (!result.card) {
				return;
			}
			if (result.bool) {
				if (get.position(result.card, true) == "d") {
					await player.gain(result.card, "gain2");
				}
				return;
			}
			if (get.position(result.card, true) != "d") {
				return;
			}
			const choose = await player
				.chooseBool("是否将" + get.translation(result.card) + "作为“田”置于武将牌上？")
				.set("ai", () => true)
				.forResult();
			if (!choose.bool) {
				return;
			}
			const next = player.addToExpansion(result.card, "gain2");
			next.gaintag.add("tuntian");
			await next;
		},
		subSkill: {
			dist: {
				charlotte: true,
				mod: {
					globalFrom(from, to, distance) {
						let num = distance - from.countExpansions("tuntian");
						// 急袭时用作【顺手牵羊】的那张"田"不再计入距离
						if (_status.event.skill == "jixi_backup") {
							num++;
						}
						return num;
					},
				},
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
		ai: {
			effect: {
				target(card, player, target, current) {
					if (typeof card === "object" && get.name(card) === "sha" && target.mayHaveShan(player, "use")) {
						return [0.6, 0.75];
					}
					if (!target.hasFriend() && !player.hasUnknown()) {
						return;
					}
					if (_status.currentPhase == target || get.type(card) === "delay") {
						return;
					}
					if (card.name != "shuiyanqijunx" && get.tag(card, "loseCard") && target.countCards("he")) {
						if (target.hasSkill("ziliang")) {
							return 0.7;
						}
						return [0.5, Math.max(2, target.countCards("h"))];
					}
					if (target.isUnderControl(true, player)) {
						if ((get.tag(card, "respondSha") && target.countCards("h", "sha")) || (get.tag(card, "respondShan") && target.countCards("h", "shan"))) {
							if (target.hasSkill("ziliang")) {
								return 0.7;
							}
							return [0.5, 1];
						}
					} else if (get.tag(card, "respondSha") || get.tag(card, "respondShan")) {
						if (get.attitude(player, target) > 0 && card.name == "juedou") {
							return;
						}
						if (get.tag(card, "damage") && target.hasSkillTag("maixie")) {
							return;
						}
						if (target.countCards("h") == 0) {
							return 2;
						}
						if (target.hasSkill("ziliang")) {
							return 0.7;
						}
						if (get.mode() == "guozhan") {
							return 0.5;
						}
						return [0.5, Math.max(target.countCards("h") / 4, target.countCards("h", "sha") + target.countCards("h", "shan"))];
					}
				},
			},
			threaten(player, target) {
				if (target.countCards("h") == 0) {
					return 2;
				}
				return 0.5;
			},
			nodiscard: true,
			nolose: true,
			notemp: true,
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
			const result = await player
				.chooseButton([get.prompt("tuntian", trigger.player), "选择一张“田”交给" + get.translation(trigger.player), player.getExpansions("tuntian")])
				.set("ai", button => {
					const player = get.player(),
						target = get.event().getTrigger().player;
					if (get.attitude(player, target) <= 0) {
						return 0;
					}
					return get.value(button.link, target) + 1;
				})
				.forResult();
			event.result = {
				bool: !!(result && result.bool && result.links && result.links.length),
				cards: result && result.links ? result.links.slice(0) : [],
				targets: [trigger.player],
			};
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const cards = (event.cards || []).filter(card => player.getExpansions("tuntian").includes(card));
			if (cards.length && target.isIn()) {
				await player.give(cards, target);
			}
		},
	},
	// 参考: skill_refer/shenhua/skill.js 的 jixi（同名同效，沿用其id）
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
	// 参考: skill_refer/refresh/skill.js 的 xunxun（同名同效，沿用其id；character.js中标注为"标准包"实为refresh包版本）
	// 恂恂：摸牌阶段开始时，你可以观看牌堆顶的四张牌，将其中两张牌以任意顺序置于牌堆顶，
	// 其余以任意顺序置于牌堆底。
	xunxun: {
		aiShowTag: "support",
		trigger: { player: "phaseDrawBegin1" },
		preHidden: true,
		frequent: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("xunxun"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			// 官方写法（refresh包xunxun）：四张牌里挑两张移到"牌堆底"，剩下的两张留在"牌堆顶"
			const cards = get.cards(4, true);
			await game.cardsGotoOrdering(cards);
			const result = await player
				.chooseToMove("恂恂：将两张牌置于牌堆顶（靠左的牌更靠上），其余置于牌堆底", true)
				.set("list", [["牌堆顶", cards], ["牌堆底"]])
				.set("filterMove", (from, to, moved) => {
					if (to == 1 && moved[1].length >= 2) {
						return false;
					}
					return true;
				})
				.set("filterOk", moved => moved[1].length == 2)
				.set("processAI", list => {
					const cards = list[0][1].slice(0).sort((a, b) => get.value(b) - get.value(a));
					return [cards, cards.splice(2)];
				})
				.forResult();
			const top = (result && result.moved && result.moved[0]) || cards.slice(0, 2);
			const bottom = (result && result.moved && result.moved[1]) || cards.filter(card => !top.includes(card));
			top.reverse();
			player.popup(`${get.cnNumber(top.length)}上${get.cnNumber(bottom.length)}下`);
			await game.cardsGotoPile(top.concat(bottom), ["top_cards", top], (event, card) => {
				if (event.top_cards.includes(card)) {
					return ui.cardPile.firstChild;
				}
				return null;
			});
		},
	},
	// 参考: skill_refer/refresh/skill.js 的 wangxi（同名同效，沿用其id；character.js中标注为"标准包"实为refresh包版本）
	// 忘隙：当你对其他角色造成1点伤害后，或当你受到其他角色造成的1点伤害后，你可以摸两张牌
	// 并将其中一张牌交给其。
	wangxi: {
		aiShowTag: "defense",
		trigger: { player: "damageEnd", source: "damageSource" },
		// 官方写法：每1点伤害触发一次（getIndex），伤害来源不能是自己
		getIndex: event => event.num,
		filter(event, player) {
			if (event._notrigger && event._notrigger.includes(event.player)) {
				return false;
			}
			return !!(event.num && event.source && event.source.isIn() && event.player && event.player.isIn() && event.source != event.player);
		},
		logTarget(event, player) {
			return event.player == player ? event.source : event.player;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wangxi"))
				.set("ai", () => lib.skill.wangxi.check(trigger, player))
				.forResult();
		},
		async content(event, trigger, player) {
			const other = trigger.player == player ? trigger.source : trigger.player;
			const result = await player.draw(2).forResult();
			const cards = (result && result.cards) || [];
			if (!cards.length || !other || !other.isIn()) {
				return;
			}
			const giveResult = await player
				.chooseCard(card => cards.includes(card), true, "忘隙：将摸到的牌中的一张交给" + get.translation(other))
				.set("ai", card => {
					const player = get.player(),
						target = get.event().target;
					return get.attitude(player, target) > 0 ? get.value(card) : -get.value(card);
				})
				.set("target", other)
				.forResult();
			if (giveResult.bool && giveResult.cards && giveResult.cards.length) {
				await player.give(giveResult.cards, other);
			}
		},
		check(event, player) {
			if (player.isPhaseUsing()) {
				return true;
			}
			if (event.player == player) {
				return get.attitude(player, event.source) > -3;
			}
			return get.attitude(player, event.player) > -3;
		},
		ai: {
			maixie: true,
			maixie_hp: true,
		},
	},

	// ============ 曹洪（caohong） ============
	// 参考: skill_refer_guozhan 的 gz_caohong-fake_huyuan（技能名同为"护援"），同角色同名，
	// 但效果重新设计（官方是"装备进入装备区后弃牌/结束阶段放装备"，本地是"展示交牌+移动/
	// 弃置场上牌"），之前只查常规包没查国战，误判为无参考。
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
					ai1(card) {
						const type = get.type(card);
						if (type == "trick" || type == "equip") {
							return 8 - get.value(card);
						}
						return 4 - get.value(card);
					},
					ai2(target) {
						const player = get.player();
						const att = get.attitude(player, target);
						if (att <= 0) {
							return 0;
						}
						const card = ui.selected.cards[0];
						if (card && get.type(card) == "equip") {
							return att * (target.canUse(card, target) ? 1.5 : 0.5);
						}
						return att;
					},
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
				// "其可以使用之"：让其自行选择是否使用该装备（写法同官方kaikang的chooseUseTarget）
				if (target.isIn() && target.getCards("h").includes(card) && target.canUse(card, target)) {
					await target.chooseUseTarget(card, "护援：是否使用" + get.translation(card) + "？", false);
				}
				if (game.hasPlayer(p => p.countCards("ej") > 0)) {
					const discardTarget = await player
						.chooseTarget("护援：你可以弃置一名角色装备区或判定区里的一张牌", (card, player, target) => target.countCards("ej") > 0)
						.set("ai", target => {
							const player = get.player();
							return get.effect(target, { name: "guohe_copy2" }, player, player);
						})
						.forResult();
					if (discardTarget.bool && discardTarget.targets && discardTarget.targets.length) {
						await player.discardPlayerCard(discardTarget.targets[0], "ej", true);
					}
				}
			}
		},
	},
	// 参考: skill_refer_guozhan 的 gz_caohong-heyi（技能名同为"鹤翼"），效果高度一致（官方是
	// "阵法技，同队列角色视为拥有飞影"，本地把国战专属"队列"概念平替为"势力"）。
	// 鹤翼：与你势力相同的角色拥有"飞影"。
	// 写法同官方guozhan的heyi：用global技能动态判断，不给队友addSkill快照，曹洪死亡/移除/势力变化后即时失效
	heyi: {
		aiShowTag: "support",
		global: "heyi_feiying",
	},
	heyi_feiying: {
		charlotte: true,
		mod: {
			globalTo(from, to, distance) {
				if (to.hasSkill("feiying")) {
					return;
				}
				if (
					game.hasPlayer(current => {
						return current != to && current.hasSkill("heyi") && current.isFriendOf(to);
					})
				) {
					return distance + 1;
				}
			},
		},
	},
	// 参考: skill_refer/standard/skill.js 的 feiying（同名同效锁定技，沿用其id）
	// 飞影：锁定技，其他角色计算与你的距离+1。
	feiying: {
		aiShowTag: "defense",
		mod: {
			globalTo(from, to, distance) {
				return distance + 1;
			},
		},
	},

	// ============ 文聘（wenpin） ============
	// 参考: skill_refer/sp/skill.js 的 zhenwei（同名同效，沿用其id）
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
			// "黑色锦囊牌"含延时锦囊，用get.type(card,"trick")（官方zhenwei同）
			return get.color(card) == "black" && get.type(card, "trick") == "trick";
		},
		logTarget: "target",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("zhenwei"))
				.set("ai", () => {
					if (!trigger.target.isFriendOf(player)) {
						return false;
					}
					return player.hasCard(card => get.type(card) == "basic", "h");
				})
				.forResult();
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_qice（荀攸"奇策"）。经核实，主副将
	// 机制在本项目中真实可用（见郝昭xishe_change等技能），此前"本包不使用国战主副将机制，
	// 略去变更副将部分"的假设有误，现补回translate.js描述中的"然后你可以变更副将"效果：
	// 沿用官方版通过group+subSkill在useCardAfter（skill=="qice_backup"，即chooseButton
	// 自动生成的备用viewAs技能）中调用变更副将逻辑的写法，变更副将直接用国战自带的
	// player.mayChangeVice（自带询问与选将流程）。"目标数不大于X"照搬官方gz_qice的
	// chooseButton.filter/selectTarget/filterTarget限制。
	// 奇策：出牌阶段限一次，你可以将所有手牌当一张目标数不大于X的普通锦囊牌使用
	// （X为你的手牌数），然后你可以变更副将。
	qice: {
		aiShowTag: "support",
		enable: "phaseUse",
		usable: 1,
		group: ["qice_change"],
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
				// 官方gz_qice写法："目标数不大于X（手牌数）"：全场目标类的锦囊要求可用目标数不超过手牌数
				const card = { name: button.link[2] };
				const info = get.info(card);
				const num = player.countCards("h");
				if (get.select(info.selectTarget)[1] == -1) {
					if (game.countPlayer(current => player.canUse(card, current)) > num) {
						return false;
					}
				} else if (info.changeTarget) {
					let giveup = true;
					const list = game.filterPlayer(current => player.canUse(card, current));
					for (let i = 0; i < list.length; i++) {
						const targets = [list[i]];
						info.changeTarget(player, targets);
						if (targets.length <= num) {
							giveup = false;
							break;
						}
					}
					if (giveup) {
						return false;
					}
				}
				const evt = _status.event.getParent();
				return evt.filterCard(get.autoViewAs(card, player.getCards("h")), player, evt);
			},
			check(button) {
				if (["chiling", "xietianzi", "tiesuo", "lulitongxin", "diaohulishan", "jiedao"].includes(button.link[2])) {
					return 0;
				}
				return _status.event.player.getUseValue(button.link[2]);
			},
			backup(links, player) {
				return {
					filterCard: true,
					selectCard: -1,
					position: "h",
					popname: true,
					viewAs: { name: links[0][2] },
					selectTarget() {
						const select = get.select(get.info(get.card()).selectTarget);
						const nh = _status.event.player.countCards("h");
						if (select[1] > nh) {
							select[1] = nh;
						}
						return select;
					},
					filterTarget(card, player, target) {
						const info = get.info(card);
						if (info.changeTarget) {
							const targets = [target];
							info.changeTarget(player, targets);
							if (targets.length > player.countCards("h")) {
								return false;
							}
						}
						return lib.filter.filterTarget(card, player, target);
					},
					ai1() {
						return 1;
					},
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
			result: {
				player(player) {
					let num = 0;
					const cards = player.getCards("h");
					if (cards.length >= 3 && player.hp >= 3) {
						return 0;
					}
					for (let i = 0; i < cards.length; i++) {
						num += Math.max(0, get.value(cards[i], player, "raw"));
					}
					return 16 - num;
				},
			},
			threaten: 1.6,
		},
	},
	// 变更副将：用国战自带的player.mayChangeVice（自带询问；无副将/联机不可用时静默跳过）
	qice_change: {
		charlotte: true,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return event.skill == "qice_backup" && !!player.name2;
		},
		silent: true,
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			await player.mayChangeVice();
		},
	},
	// 参考: skill_refer/yijiang/skill.js 的 zhiyu（同名同效，沿用其id）
	// 智愚：当你受到伤害后，你可以摸一张牌，然后展示所有手牌，若颜色均相同，伤害来源弃置
	// 一张手牌。
	zhiyu: {
		aiShowTag: "defense",
		trigger: { player: "damageEnd" },
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("zhiyu"))
				.set("ai", () => true)
				.forResult();
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_zhengbi（选项流程、选项2的"一张非基本牌或两张
	// 基本牌"结算照搬官方；选项1按本卡面实现为"直到其明置武将牌或此回合结束，对其使用牌无距离和次数限制"）
	// 征辟：出牌阶段开始时，你可以选择一项：1.选择一名未确定势力的角色，直到其明置武将牌或此回合
	// 结束，你对其使用牌无距离和次数限制；2.选择有明置武将牌的一名其他角色，交给其一张基本牌，
	// 然后该角色交给你一张非基本牌或两张基本牌。
	zhengbi: {
		aiShowTag: "support",
		aiShowCost: true,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			if (game.hasPlayer(current => current != player && current.isUnseen())) {
				return true;
			}
			return player.countCards("h", { type: "basic" }) > 0 && game.hasPlayer(current => current != player && !current.isUnseen());
		},
		async cost(event, trigger, player) {
			const choices = [];
			const choiceList = ["选择一名未确定势力的角色，直到其明置武将牌或此回合结束，你对其使用牌无距离和次数限制", "选择有明置武将牌的一名其他角色，交给其一张基本牌，然后其交给你一张非基本牌或两张基本牌"];
			if (game.hasPlayer(current => current != player && current.isUnseen())) {
				choices.push("选项一");
			} else {
				choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
			}
			if (player.countCards("h", { type: "basic" }) > 0 && game.hasPlayer(current => current != player && !current.isUnseen())) {
				choices.push("选项二");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			choices.push("cancel2");
			const result = await player
				.chooseControl(choices)
				.set("choiceList", choiceList)
				.set("prompt", get.prompt("zhengbi"))
				.set("ai", () => {
					const player = get.player();
					const controls = get.event().controls;
					if (controls.includes("选项二") && player.countCards("h", card => get.type(card) == "basic" && get.value(card) < 6) && game.hasPlayer(current => current != player && !current.isUnseen() && current.countCards("he", { type: ["trick", "delay", "equip"] }) > 0)) {
						return controls.indexOf("选项二");
					}
					if (controls.includes("选项一") && game.hasPlayer(current => current != player && current.isUnseen() && get.attitude(player, current) <= 0)) {
						return controls.indexOf("选项一");
					}
					return controls.indexOf("cancel2");
				})
				.forResult();
			if (!result || result.control == "cancel2") {
				event.result = { bool: false };
				return;
			}
			if (result.control == "选项一") {
				const targetResult = await player
					.chooseTarget("征辟：选择一名未确定势力的角色，直到其明置武将牌或此回合结束，你对其使用牌无距离和次数限制", (card, player, target) => target != player && target.isUnseen())
					.set("ai", target => {
						const player = get.player();
						return 1 - get.attitude(player, target) + Math.random();
					})
					.forResult();
				event.result = {
					bool: !!(targetResult && targetResult.bool && targetResult.targets && targetResult.targets.length),
					targets: (targetResult && targetResult.targets) || [],
					cost_data: 0,
				};
				return;
			}
			const cardTargetResult = await player
				.chooseCardTarget({
					prompt: "征辟：将一张基本牌交给有明置武将牌的一名其他角色，然后其交给你一张非基本牌或两张基本牌",
					position: "h",
					filterCard(card) {
						return get.type(card) == "basic";
					},
					filterTarget(card, player, target) {
						return target != player && !target.isUnseen();
					},
					ai1(card) {
						return 5 - get.value(card);
					},
					ai2(target) {
						const player = get.player();
						const att = get.attitude(player, target);
						if (att > 0) {
							return 0;
						}
						return -(att - 1) / (target.countCards("h") + 1);
					},
				})
				.forResult();
			event.result = {
				bool: !!(cardTargetResult && cardTargetResult.bool && cardTargetResult.targets && cardTargetResult.targets.length),
				targets: (cardTargetResult && cardTargetResult.targets) || [],
				cards: (cardTargetResult && cardTargetResult.cards) || [],
				cost_data: 1,
			};
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target) {
				return;
			}
			if (event.cost_data == 0) {
				player.storage.zhengbi_buff = target;
				player.addTempSkill("zhengbi_buff", "phaseAfter");
				return;
			}
			if (!event.cards || !event.cards.length) {
				return;
			}
			await player.give(event.cards, target);
			if (!target.isIn()) {
				return;
			}
			const choices = [];
			if (target.countCards("he", { type: ["trick", "delay", "equip"] })) {
				choices.push("一张非基本牌");
			}
			if (target.countCards("h", { type: "basic" }) > 1) {
				choices.push("两张基本牌");
			}
			if (!choices.length) {
				// 官方gz_zhengbi写法：无法按要求交牌时，交出所有手牌
				if (target.countCards("h")) {
					await target.give(target.getCards("h"), player);
				}
				return;
			}
			const controlResult = await target
				.chooseControl(choices)
				.set("ai", (event, player) => {
					if (choices.length > 1) {
						if (player.countCards("he", { type: ["trick", "delay", "equip"] }, card => get.value(card) < 7)) {
							return 0;
						}
						return 1;
					}
					return 0;
				})
				.set("prompt", "征辟：交给" + get.translation(player) + "…")
				.forResult();
			const check = controlResult.control == "一张非基本牌";
			const cardResult = await target
				.chooseCard("he", check ? 1 : 2, { type: check ? ["trick", "delay", "equip"] : "basic" }, true, "征辟：交给" + get.translation(player) + controlResult.control)
				.set("ai", card => -get.value(card))
				.forResult();
			if (cardResult.cards && cardResult.cards.length) {
				await target.give(cardResult.cards, player);
			}
		},
	},
	zhengbi_buff: {
		charlotte: true,
		onremove: "storage",
		mark: "character",
		intro: { content: "对$使用牌无距离和次数限制（直到其明置武将牌或此回合结束）" },
		trigger: { global: "showCharacterAfter" },
		forced: true,
		popup: false,
		silent: true,
		filter(event, player) {
			return !!player.storage.zhengbi_buff && event.player == player.storage.zhengbi_buff;
		},
		async content(event, trigger, player) {
			player.removeSkill("zhengbi_buff");
		},
		mod: {
			targetInRange(card, player, target) {
				if (target == player.storage.zhengbi_buff) {
					return true;
				}
			},
			cardUsableTarget(card, player, target) {
				if (target == player.storage.zhengbi_buff) {
					return true;
				}
			},
		},
	},
	// 参考: skill_refer/xianding/skill.js 的 fengying（同名同效，沿用其id）
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
		ai: {
			order: 0.0001,
			result: {
				player(player) {
					return player.isMinHp() ? 1 : 0;
				},
			},
		},
	},

	// ============ 臧霸（zangba） ============
	// 与 skill_refer/sp 的同名技能"rehengjiang"效果不同（原版为手牌上限-1的削弱型技能，huicui包同名角色未在skill_refer中重新定义，实际继承的仍是sp版本），非参考
	// 原创技能，无官方参考（沿用了官方同角色技能id，效果按本卡重新设计）
	// 横江：同势力角色受到伤害后，你可以横置伤害来源；若其已横置，则改为对其造成1点雷电伤害。
	// 当前回合的弃牌阶段结束时，伤害来源弃置一张牌。（"横置"=连环状态：player.link()/isLinked()）
	rehengjiang: {
		aiShowTag: "support",
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return !!(event.player && event.player != player && event.player.isIn() && event.player.isFriendOf(player) && event.source && event.source.isIn() && event.source != player);
		},
		logTarget(event) {
			return event.source;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("rehengjiang"))
				.set("ai", () => {
					const source = trigger.source;
					if (get.attitude(player, source) >= 0) {
						return false;
					}
					if (source.isLinked()) {
						return get.damageEffect(source, player, player, "thunder") > 0;
					}
					return true;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const source = trigger.source;
			if (!source.isIn()) {
				return;
			}
			if (source.isLinked()) {
				await source.damage(1, "thunder", player);
			} else {
				await source.link(true);
			}
			if (source.isIn()) {
				// 记录到本回合结束即自动清除的临时子技能上（弃牌阶段结束时结算）
				player.addTempSkill("rehengjiang_discard");
				if (!Array.isArray(player.storage.rehengjiang_discard)) {
					player.storage.rehengjiang_discard = [];
				}
				player.storage.rehengjiang_discard.add(source);
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
			return player.getStorage("rehengjiang_discard").length > 0;
		},
		async content(event, trigger, player) {
			const targets = player.getStorage("rehengjiang_discard").filter(current => current.isIn());
			delete player.storage.rehengjiang_discard;
			for (const target of targets) {
				if (target.isIn() && target.countCards("he")) {
					await target.chooseToDiscard("he", true).forResult();
				}
			}
		},
	},

	// ============ 于禁（yujin） ============
	// 与 skill_refer/yijiang 的同名技能"jieyue"效果不同（原版为结束阶段弃置一张牌），非参考；old包xin_yujin虽引用jieyue但未在其skill.js中定义（应为国战模式内置技能，不在本次skill_refer范围内）
	// 参考: skill_refer_guozhan 的 gz_yujin-gz_jieyue（技能名同为"节钺"），效果高度一致（准备
	// 阶段交一张手牌给非魏势力角色发起军令，执行则摸一张牌，不执行则摸牌阶段多摸三张），
	// 官方用国战专属的"军令"选择/执行API（chooseJunlingFor等），本地简化为chooseBool。
	// 之前只怀疑"应为国战内置技能"但没去原始源码验证，这次已确认找到。
	// 节钺：准备阶段，你可以交给不为魏势力的一名角色一张手牌，然后令其执行一次"军令"。
	// 若其执行，你摸一张牌；若其不执行，你本回合的摸牌阶段多摸三张牌。
	jieyue: {
		aiShowTag: "draw",
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
					ai1(card, player, target) {
						if (get.attitude(player, target) > 0) {
							return 11 - get.value(card);
						}
						return 7 - get.value(card);
					},
					ai2(target) {
						const att = get.attitude(get.player(), target);
						if (att < 0) {
							return -att;
						}
						return 1;
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const { cards, targets } = event;
			const target = targets[0];
			await player.give(cards, target);
			if (!target.isIn()) {
				return;
			}
			// 官方gz_jieyue写法：你选一张军令，其选择执行（你摸一张牌）或不执行（你本回合摸牌阶段多摸三张）
			const junlingResult = await player.chooseJunlingFor(target).forResult();
			const junling = junlingResult && junlingResult.junling;
			if (!junling) {
				return;
			}
			const junlingTargets = junlingResult.targets || [];
			const choiceList = [`执行该军令，然后${get.translation(player)}摸一张牌`, `不执行该军令，令${get.translation(player)}本回合摸牌阶段额外摸三张牌`];
			const chooseResult = await target
				.chooseJunlingControl(player, junling, junlingTargets)
				.set("prompt", "节钺")
				.set("choiceList", choiceList)
				.set("ai", () => {
					if (get.attitude(target, player) > 0) {
						return get.junlingEffect(player, junling, target, junlingTargets, target) > 1 ? 0 : 1;
					}
					return get.junlingEffect(player, junling, target, junlingTargets, target) >= -1 ? 0 : 1;
				})
				.forResult();
			if (chooseResult && chooseResult.index == 0) {
				await target.carryOutJunling(player, junling, junlingTargets);
				await player.draw();
			} else {
				// 只在其不执行时临时获得（不能放进group，否则永久+3）
				player.addTempSkill("jieyue_buff", "phaseAfter");
			}
		},
	},
	jieyue_buff: {
		charlotte: true,
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed;
		},
		forced: true,
		popup: false,
		silent: true,
		async content(event, trigger, player) {
			trigger.num += 3;
		},
	},
	// 参考: skill_refer/yijiang/skill.js 的 yizhong（同名同效，沿用其id；old包re_yujin亦引用同一id）
	// 毅重：锁定技，若你的装备区里没有防具牌，每回合第一张黑色【杀】对你无效。
	yizhong: {
		aiShowTag: "defense",
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
		ai: {
			effect: {
				target(card, player, target) {
					if (player == target && get.subtypes(card).includes("equip2")) {
						if (get.equipValue(card) <= 8) {
							return 0;
						}
					}
					if (!player.hasEmptySlot(2)) {
						return;
					}
					if (card.name == "sha" && get.color(card) == "black") {
						return "zeroplayertarget";
					}
				},
			},
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
	// 参考: skill_refer/tw/_merged.md 的 tw_niujin-twcuorui（技能名：挫锐），"摸牌至X张，然后废除判定区，
	// 若已废除则改为对一名其他角色造成1点伤害"的核心结构一致（本实现改为出牌阶段发动、
	// 固定摸至五张并加入重置基本牌使用次数）；与 skill_refer/sp 的同名技能"olcuorui"（锁定技，
	// 防止延时锦囊生效及限制手牌）效果不同，非该技能的参考
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
			// 官方twcuorui写法：未废除则废除判定区；已废除则改为对一名其他角色造成1点伤害
			if (!player.isDisabledJudge()) {
				await player.disableJudge();
			} else {
				const result = await player
					.chooseTarget(lib.filter.notMe, "挫锐：对一名其他角色造成1点伤害")
					.set("ai", target => {
						const player = get.player();
						return get.damageEffect(target, player, player);
					})
					.forResult();
				if (result && result.bool && result.targets && result.targets.length) {
					player.line(result.targets[0]);
					await result.targets[0].damage();
				}
			}
		},
		check(event, player) {
			var num = 0;
			for (var target of game.players) {
				if (target != player && target.countCards("h") > num) {
					num = target.countCards("h");
				}
			}
			num = Math.min(num, 5 + player.countCards("h"));
			return num - player.countCards("h") >= 2;
		},
	},
	// 参考: skill_refer/tw/_merged.md 的 tw_niujin-twliewei（技能名：裂围），"杀死角色后可重置〖挫锐〗"的
	// 核心思路一致（本实现简化为锁定技直接重置，未采用其"摸两张牌"二选一分支）；与 skill_refer/sp 的
	// 同名技能"liewei"（原版为杀死角色后摸3张牌）效果不同，非该技能的参考
	// 裂围：锁定技，当你杀死一名角色后，你的限定技（挫锐）视为未发动过。
	liewei: {
		aiShowTag: "support",
		trigger: { source: "dieAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return player.awakenedSkills.some(skill => lib.skill[skill] && lib.skill[skill].limited);
		},
		async content(event, trigger, player) {
			// "你的限定技视为未发动过"：重置所有已发动的限定技（含副将/第三将的）
			const skills = player.awakenedSkills.filter(skill => lib.skill[skill] && lib.skill[skill].limited);
			for (const skill of skills) {
				player.restoreSkill(skill);
			}
		},
	},

	// ============ 张春华（zhangchunhua） ============
	// 参考: skill_refer/yijiang/skill.js 的 jueqing（同名同效，沿用其id，原版audioname即标注为张春华）
	// 绝情：锁定技，你即将造成的伤害视为失去体力。
	jueqing: {
		aiShowTag: "offense",
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
	// 参考: skill_refer/yijiang/skill.js 的 shangshi（同名同效，沿用其id）
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
			// 每名角色的每个阶段限一次：用到阶段切换（phaseChange）即失效的临时标记计数
			if (player.hasSkill("shangshi_used")) {
				return false;
			}
			return player.countCards("h") < player.getDamagedHp();
		},
		async content(event, trigger, player) {
			player.addTempSkill("shangshi_used", "phaseChange");
			await player.drawTo(player.getDamagedHp());
		},
		subSkill: {
			used: { charlotte: true },
		},
		ai: {
			noh: true,
			freeSha: true,
			freeShan: true,
			skillTagFilter(player, tag) {
				if (player.maxHp - player.hp < player.countCards("h")) {
					return false;
				}
			},
		},
	},

	// ============ 王异（wangyi） ============
	// 参考: skill_refer/yijiang/skill.js 的 zhenlie（同名同效，沿用其id）
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
				.set("ai", () => lib.skill.zhenlie.check(trigger, player))
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
		check(event, player) {
			if (event.getParent().excluded.includes(player)) {
				return false;
			}
			if (get.attitude(player, event.player) > 0 || (player.hp < 2 && !get.tag(event.card, "damage"))) {
				return false;
			}
			let evt = event.getParent(),
				directHit = (evt.nowuxie && get.type(event.card, "trick") === "trick") || (evt.directHit && evt.directHit.includes(player)) || (evt.customArgs && evt.customArgs.default && evt.customArgs.default.directHit2);
			if (get.tag(event.card, "respondSha")) {
				if (directHit || player.countCards("h", { name: "sha" }) === 0) {
					return true;
				}
			} else if (get.tag(event.card, "respondShan")) {
				if (directHit || player.countCards("h", { name: "shan" }) === 0) {
					return true;
				}
			} else if (get.tag(event.card, "damage")) {
				if (event.card.name === "huogong") {
					return event.player.countCards("h") > 4 - player.hp - player.hujia;
				}
				if (event.card.name === "shuiyanqijunx") {
					return player.countCards("e") === 0;
				}
				return true;
			} else if (player.hp > 2) {
				if (event.card.name === "shunshou" || (event.card.name === "zhujinqiyuan" && (event.card.yingbian || get.distance(event.player, player) < 0))) {
					return true;
				}
			}
			return false;
		},
		ai: {
			filterDamage: true,
			skillTagFilter: (player, tag, arg) => {
				return arg && arg.jiu == true;
			},
			effect: {
				target(card, player, target) {
					if (target.hp <= 0 && target.hasSkill("zhenlie_lose") && get.tag(card, "recover")) {
						return [1, 1.2];
					}
				},
			},
		},
	},
	// 参考: skill_refer/yijiang/skill.js 的 miji（同名同效，沿用其id）
	// 秘计：结束阶段，你可以摸X张牌（X为你已损失的体力值），然后可以将至多等量的牌交给其他角色。
	miji: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.isDamaged();
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool("秘计：是否摸" + player.getDamagedHp() + "张牌，然后可以将至多等量的牌交给其他角色？")
				.set("ai", () => true)
				.forResult();
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
		ai: {
			threaten(player, target) {
				return 0.6 + 0.7 * target.getDamagedHp();
			},
			effect: {
				target(card, player, target) {
					if (target.hp <= 2 && get.tag(card, "damage")) {
						let num = 1;
						if (
							get.itemtype(player) === "player" &&
							player.hasSkillTag("damageBonus", false, {
								target: target,
								card: card,
							}) &&
							!target.hasSkillTag("filterDamage", null, {
								player: player,
								card: card,
							})
						) {
							num = 2;
						}
						if (target.hp > num) {
							return [1, 1];
						}
					}
				},
			},
		},
	},

	// ============ 曹冲（caochong） ============
	// 参考: skill_refer/yijiang/skill.js 的 chengxiang（同名同效，沿用其id及maxNum=13的设计）
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
					// 复原武将牌 = 翻回正面 + 解除连环
					if (player.isTurnedOver()) {
						await player.turnOver(false);
					}
					if (player.isLinked()) {
						await player.link(false);
					}
				}
			}
			if (remaining.length) {
				await player.loseToDiscardpile({ cards: remaining });
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						if (!target.hasFriend()) {
							return;
						}
						if (target.hp >= 4) {
							return [1, 2];
						}
						if (target.hp == 3) {
							return [1, 1.5];
						}
						if (target.hp == 2) {
							return [1, 0.5];
						}
					}
				},
			},
		},
	},
	// 参考: skill_refer/yijiang/skill.js 的 renxin（沿用其id及核心效果"翻面弃装备防止致命伤害"，本包改判定条件为"体力值不大于伤害值"而非固定"hp==1"以支持多点致命伤害）
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
		ai: {
			expose: 0.5,
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
	// 参考: skill_refer/yijiang/skill.js 的 rejingce（同名同效，沿用其id）
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
	// 参考: skill_refer/yijiang/skill.js 的 junxing（同名同效，沿用其id）
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
		ai: {
			order: 2,
			expose: 0.3,
			threaten: 1.8,
			result: {
				target(player, target) {
					if (target.hasSkillTag("noturn")) {
						return 0;
					}
					if (target.isTurnedOver()) {
						return 2;
					}
					return -1 / (target.countCards("h") + 1);
				},
			},
		},
	},
	// 参考: skill_refer/yijiang/skill.js 的 yuce（同名同效，沿用其id）
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
			event.result = await player
				.chooseCard("h", get.prompt2("yuce"))
				.set("ai", card => {
					if (get.type(card) == "basic") {
						return 1;
					}
					return Math.abs(get.value(card)) + 1;
				})
				.forResult();
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
		ai: {
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage") && target.countCards("h")) {
						return 0.8;
					}
				},
			},
		},
	},

	// ============ 曹真（caozhen） ============
	// 参考: skill_refer/sixiang/_merged.md 的 std_caozhen-stdsidi（技能名：司敌），"打出杀摸一张牌"部分
	// 一致，本实现在此基础上加入"使用闪"也触发的分支；与 skill_refer/yijiang 的同名技能"xinsidi"
	// （出牌阶段开始时基于装备区颜色的技能）效果不同，非该技能的参考
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
	// 参考: skill_refer/yijiang/skill.js 的 shenduan（同名同效，沿用其id）
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
	// 参考: skill_refer/yijiang/skill.js 的 yonglve（沿用其id及核心效果，本包略去了原版"须在攻击范围内"的限制）
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
	// 参考: skill_refer/yijiang/skill.js 的 huituo（沿用其id及核心效果，判定标准由原版"红色"细化为卡面描述的"♥"）
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
			event.result = await player
				.chooseTarget(get.prompt("huituo"), "令一名角色判定，若结果为♥，其回复1点体力；否则其摸" + get.cnNumber(trigger.num) + "张牌")
				.set("ai", target => {
					const player = get.player();
					if (get.attitude(player, target) > 0) {
						return get.recoverEffect(target, player, player) + 1;
					}
					return 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets && event.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			await lib.skill.huituo.doJudge(player, target, trigger.num);
		},
		// 恢拓的判定结算，供明鉴"发动一次恢拓"复用
		async doJudge(player, target, num) {
			const result = await target
				.judge(card => {
					if (get.suit(card) == "heart") {
						return target.isDamaged() ? 1 : 0;
					}
					return num > 0 ? 0.5 : 0;
				})
				.forResult();
			if (result && result.card && get.suit(result.card) == "heart") {
				await target.recover();
				player.storage.huituo_off = true;
			} else if (num > 0) {
				await target.draw(num);
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
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
	// 参考: skill_refer/yijiang/skill.js 的 mingjian（同名同效，沿用其id）
	// 明鉴：出牌阶段限一次，你可以将所有手牌交给一名其他角色，然后其下回合手牌上限和使用【杀】的
	// 次数上限各+1；其下回合首次造成伤害后，你可以发动一次X为伤害值的"恢拓"。
	mingjian: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		filterCard: true,
		selectCard: -1,
		discard: false,
		lose: false,
		delay: false,
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.give(cards, target);
			// 官方写法：{player:"phaseAfter"}=直到目标的下个回合结束才移除（字符串expire会在本回合结束就移除）
			target.addTempSkill("mingjian_buff", { player: "phaseAfter" });
			target.storage.mingjian_buff = (target.storage.mingjian_buff || 0) + 1;
			target.updateMarks("mingjian_buff");
			target.storage.mingjian_trigger = player;
			target.addTempSkill("mingjian_trigger", { player: "phaseAfter" });
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					if (target.hasSkillTag("nogain")) {
						return 0;
					}
					if (player.countCards("h") == player.countCards("h", "du")) {
						return -1;
					}
					if (target.hasJudge("lebu")) {
						return 0;
					}
					if (get.attitude(player, target) > 3) {
						var basis = get.threaten(target);
						if (
							player == get.zhu(player) &&
							player.hp <= 2 &&
							player.countCards("h", "shan") &&
							!game.hasPlayer(function (current) {
								return get.attitude(current, player) > 3 && current.countCards("h", "tao") > 0;
							})
						) {
							return 0;
						}
						if (target.countCards("h") + player.countCards("h") > target.hp + 2) {
							return basis * 0.8;
						}
						return basis;
					}
					return 0;
				},
			},
		},
	},
	mingjian_buff: {
		charlotte: true,
		mark: true,
		intro: { content: "手牌上限+#，使用【杀】的次数上限+#" },
		init(player, skill) {
			if (!player.storage[skill]) {
				player.storage[skill] = 0;
			}
		},
		onremove: true,
		mod: {
			maxHandcard(player, num) {
				return num + (player.storage.mingjian_buff || 0);
			},
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return num + (player.storage.mingjian_buff || 0);
				}
			},
		},
	},
	mingjian_trigger: {
		aiShowTag: "draw",
		charlotte: true,
		onremove: ["mingjian_trigger", "mingjian_done"],
		trigger: { source: "damageSource" },
		filter(event, player) {
			const source = player.storage.mingjian_trigger;
			return _status.currentPhase == player && !player.storage.mingjian_done && !!source && source.isIn() && event.num > 0;
		},
		async cost(event, trigger, player) {
			// "首次造成伤害后"：无论曹叡是否发动，本回合都只问这一次
			player.storage.mingjian_done = true;
			const source = player.storage.mingjian_trigger;
			const result = await source
				.chooseTarget("明鉴：是否发动一次伤害值为" + trigger.num + "的〖恢拓〗？", "令一名角色判定，若结果为♥，其回复1点体力；否则其摸" + get.cnNumber(trigger.num) + "张牌")
				.set("ai", target => {
					const player = get.player();
					if (get.attitude(player, target) > 0) {
						return get.recoverEffect(target, player, player) + 1;
					}
					return 0;
				})
				.forResult();
			event.result = {
				bool: !!(result && result.bool && result.targets && result.targets.length),
				targets: (result && result.targets) || [],
			};
		},
		async content(event, trigger, player) {
			const source = player.storage.mingjian_trigger;
			const target = event.targets[0];
			if (!target || !target.isIn() || !source || !source.isIn()) {
				return;
			}
			source.line(target, "green");
			await lib.skill.huituo.doJudge(source, target, trigger.num);
		},
	},

	// ============ 杨修（yangxiu） ============
	// 参考: skill_refer/sp/skill.js 的 danlao（同名同效，沿用其id）
	// 啖酪：当你成为锦囊牌和【杀】的目标后，若你不是此牌的唯一目标，你可以摸一张牌，然后此牌对你无效。
	danlao: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return (event.card.name == "sha" || get.type(event.card) == "trick") && event.targets && event.targets.length > 1;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool("啖酪：是否摸一张牌，然后令此牌对你无效？")
				.set("ai", () => lib.skill.danlao.check(trigger, player))
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
			trigger.getParent().excluded.add(player);
		},
		check(event, player) {
			return event.getParent().excluded.includes(player) || get.tag(event.card, "multineg") || get.effect(player, event.card, event.player, player) <= 0;
		},
		ai: {
			effect: {
				target(card) {
					if (get.type(card) != "trick") {
						return;
					}
					if (card.name == "tiesuo") {
						return [0, 0];
					}
					if (card.name == "yihuajiemu") {
						return [0, 1];
					}
					if (get.tag(card, "multineg")) {
						return [0, 2];
					}
				},
			},
		},
	},
	// 参考: skill_refer/sp/skill.js 的 jilei（沿用其id及核心效果"声明牌的类别并限制伤害来源使用/打出/弃置"）
	// 鸡肋：当你受到伤害后，你可以声明一种牌的类别，本回合伤害来源不能使用、打出或弃置你声明的此类手牌。
	jilei: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.source && event.source.isIn();
		},
		async cost(event, trigger, player) {
			const source = trigger.source;
			const result = await player
				.chooseControl(["basic", "trick", "equip", "cancel2"])
				.set("prompt", get.prompt2("jilei", source))
				.set("ai", () => {
					const player = get.player(),
						source = get.event().source;
					if (get.attitude(player, source) > 0) {
						return "cancel2";
					}
					const list = ["basic", "trick", "equip"].filter(type => !source.getStorage("jilei_lock").includes(type));
					if (!list.length) {
						return "cancel2";
					}
					if (list.includes("trick") && source.countCards("h", card => get.type(card, null, source) == "trick" && source.hasValueTarget(card))) {
						return "trick";
					}
					if (list.includes("basic")) {
						return "basic";
					}
					return list[0];
				})
				.set("source", source)
				.forResult();
			event.result = {
				bool: !!(result && result.control && result.control != "cancel2"),
				targets: [source],
				cost_data: result && result.control,
			};
		},
		async content(event, trigger, player) {
			const type = event.cost_data;
			const source = event.targets[0];
			player.popup(get.translation(type) + "牌");
			game.log(player, "声明了", "#y" + get.translation(type) + "牌");
			// 官方写法：类别记在临时技能同名storage里，本回合结束随技能一起清除（不跨回合累积）
			source.addTempSkill("jilei_lock");
			source.markAuto("jilei_lock", type);
		},
		ai: {
			maixie_defend: true,
			threaten: 0.7,
		},
	},
	jilei_lock: {
		charlotte: true,
		mark: true,
		intro: {
			content(storage) {
				return "本回合不能使用、打出或弃置" + get.translation(storage) + "牌";
			},
		},
		init(player, skill) {
			if (!player.storage[skill]) {
				player.storage[skill] = [];
			}
		},
		onremove: true,
		mod: {
			cardDiscardable(card, player) {
				if (player.getStorage("jilei_lock").includes(get.type(card, "trick")) && player.getCards("h").includes(card)) {
					return false;
				}
			},
			cardEnabled(card, player) {
				if (player.getStorage("jilei_lock").includes(get.type(card, "trick"))) {
					const hs = player.getCards("h"),
						cards = [card];
					if (Array.isArray(card.cards)) {
						cards.addArray(card.cards);
					}
					if (cards.some(i => hs.includes(i))) {
						return false;
					}
				}
			},
			cardRespondable(card, player) {
				if (player.getStorage("jilei_lock").includes(get.type(card, "trick"))) {
					const hs = player.getCards("h"),
						cards = [card];
					if (Array.isArray(card.cards)) {
						cards.addArray(card.cards);
					}
					if (cards.some(i => hs.includes(i))) {
						return false;
					}
				}
			},
			cardSavable(card, player) {
				if (player.getStorage("jilei_lock").includes(get.type(card, "trick"))) {
					const hs = player.getCards("h"),
						cards = [card];
					if (Array.isArray(card.cards)) {
						cards.addArray(card.cards);
					}
					if (cards.some(i => hs.includes(i))) {
						return false;
					}
				}
			},
		},
	},

	// ============ 程昱（chengyu） ============
	// 设伏：出牌阶段结束时可扣置一张手牌于武将牌上；他人使用同名牌时可移去令其无效。
	// 参考: skill_refer/sp/skill.js 的 shefu（沿用"扣牌于武将牌上、他人用同名牌时移去令其无效"的核心思路）。
	// 官方版本机制本质不同：结束阶段先从"可用牌名列表"里选一个牌名再另选一张手牌作为该牌名的"伏兵"，
	// 可同时囤积多个不同牌名的埋伏、trigger为结束阶段(phaseJieshuBegin)。而本地卡面只说"扣置一张手牌"，
	// 直接以该手牌自身的名字为准（不额外选牌名），且只维护一张埋伏，trigger为"出牌阶段结束时"，
	// 均与卡面描述一致，故保留当前更简单直接的实现，不照搬官方多埋伏/选牌名的复杂结构。
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
				.chooseCard("h", get.prompt("shefu"))
				.set("prompt2", "将一张手牌扣置于武将牌上；当一名角色使用牌时，你可以移去武将牌上的一张同名牌令之无效")
				.set("ai", card => {
					switch (card.name) {
						case "sha":
							return 5;
						case "shan":
							return 4.5;
						case "tao":
							return 4;
						case "wuzhong":
						case "shunshou":
						case "guohe":
						case "juedou":
						case "lebu":
							return 3;
						default:
							return 0;
					}
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			if (!cards || !cards.length) {
				return;
			}
			// "扣置"：以give动画背面置入，不亮牌面
			const next = player.addToExpansion(cards, player, "give");
			next.gaintag.add("shefu");
			await next;
		},
		// 扣置的牌只有本人（及其控制者）可见，其他人只看到张数
		intro: {
			markcount: "expansion",
			mark(dialog, storage, player) {
				const cards = player.getExpansions("shefu");
				if (player.isUnderControl(true)) {
					dialog.addAuto(cards);
				} else {
					return "共有" + get.cnNumber(cards.length) + "张牌";
				}
			},
		},
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
			if (event.all_excluded) {
				return false;
			}
			return player.countExpansions("shefu") > 0 && player.getExpansions("shefu").some(card => get.name(card) == event.card.name);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(`设伏：是否移去武将牌上的一张【${get.translation(trigger.card.name)}】，令${get.translation(trigger.player)}使用的【${get.translation(trigger.card)}】无效？`)
				.set("ai", () => {
					let effect = 0;
					if (trigger.card.name == "wuxie" || trigger.card.name == "shan") {
						if (get.attitude(player, trigger.player) < -1) {
							effect = -1;
						}
					} else if (trigger.targets && trigger.targets.length) {
						for (const target of trigger.targets) {
							effect += get.effect(target, trigger.card, trigger.player, player);
						}
					}
					return effect < 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions("shefu").filter(card => get.name(card) == trigger.card.name);
			if (cards.length) {
				await player.loseToDiscardpile({ cards: [cards[0]] });
			}
			// 官方shefu2写法：清空目标并标记all_excluded令此牌无效，而不是cancel整个使用事件
			trigger.targets.length = 0;
			trigger.all_excluded = true;
		},
	},
	// 参考: skill_refer/sixiang/_merged.md 的 std_chengyu-stdyibing（技能名：益兵），"他人进入濒死时获得
	// 其一张牌"部分一致，本实现在此基础上加入"死亡时回复1点体力"分支；与官方同角色的另一技能
	// "贲育"不同名，非该技能的参考
	// 益兵：他人进入濒死时你可获得其一张手牌；他人死亡时你可回复1点体力。
	yibing: {
		aiShowTag: "recover",
		audio: 2,
		trigger: { global: ["dying", "dieAfter"] },
		filter(event, player) {
			if (event.player == player) {
				return false;
			}
			if (event.name == "dying") {
				return event.player.isIn() && event.player.countCards("h") > 0;
			}
			// 死亡时机不能要求死者isIn()
			return player.isDamaged();
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("yibing", trigger.player))
				.set("ai", () => {
					if (trigger.name == "dying") {
						return lib.skill.yibing.check(trigger, player);
					}
					return true;
				})
				.forResult();
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
		check(event, player) {
			return get.effect(event.player, { name: "shunshou_copy2" }, player, player) > 0;
		},
	},

	// ============ 曹昂（caoang） ============
	// 慷愾：同势力角色成为【杀】的目标后，摸牌交给其一张并展示，装备牌可供其使用。
	// 以官方 skill_refer/sp/skill.js 的 kaikang 为基础（摸牌、选牌交给目标、装备可供目标使用的流程一致），
	// 仅把判定条件由官方"距离1以内"改成卡面描述的"同势力"，并按卡面加入"展示该牌"这一步。
	kaikang: {
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			return event.card.name == "sha" && event.target.isIn() && event.target.isFriendOf(player);
		},
		logTarget: "target",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("kaikang", trigger.target))
				.set("ai", () => lib.skill.kaikang.check(trigger, player))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			await player.draw();
			// 官方kaikang写法：目标是自己时只摸牌，不存在"交给自己"
			if (target == player || !player.countCards("he") || !target.isIn()) {
				return;
			}
			const result = await player
				.chooseCard(true, "he", `慷愾：交给${get.translation(target)}一张牌并展示之`)
				.set("ai", card => {
					if (get.position(card) == "e") {
						return -1;
					}
					if (card.name == "shan") {
						return 1;
					}
					if (get.type(card) == "equip") {
						return 0.5;
					}
					return 0;
				})
				.forResult();
			if (!result.bool || !result.cards || !result.cards.length) {
				return;
			}
			const card = result.cards[0];
			await player.give(card, target, "give");
			if (!target.isIn() || !target.getCards("h").includes(card)) {
				return;
			}
			await target.showCards([card], `${get.translation(target)}因“慷愾”获得的牌`);
			// "该角色可以使用此牌"：由其选择是否使用（chooseUseTarget），不能直接useCard（无目标会被跳过）
			if (get.type(card) == "equip" && target.getCards("h").includes(card)) {
				await target.chooseUseTarget(card, `慷愾：是否使用【${get.translation(card)}】？`);
			}
		},
		check(event, player) {
			return get.attitude(player, event.target) >= 0;
		},
		ai: {
			threaten: 1.1,
		},
	},
	// 与 skill_refer/tw 的同名技能"孝廉"(tw_caoang-twxiaolian)效果不同（原版为"代替他人成为杀的目标，
	// 受伤后为原目标叠加"马"标记增加距离"的机制，与本技能"首次明置移动装备牌"完全不同），非参考；
	// skill_refer全部包中未找到效果吻合的对应技能
	// 孝廉：首次明置此武将牌时，可移动场上的一张装备牌。
	xiaolian: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			// 只移动装备牌，且须存在能接收的另一名角色（用引擎的canMoveCard判断）
			return !!(event.toShow && event.toShow.includes("caoang")) && player.canMoveCard(null, true, get.filter({ type: "equip" }));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("xiaolian"))
				.set("ai", () => player.canMoveCard(true, true, get.filter({ type: "equip" })))
				.forResult();
		},
		async content(event, trigger, player) {
			// 用引擎moveCard（自带来源/目标可装备校验与AI），只允许装备牌
			await player.moveCard(false, "孝廉：移动场上的一张装备牌", get.filter({ type: "equip" }));
		},
	},

	// ============ 诸葛诞（zhugedan） ============
	// 功獒：锁定技，他人首次进入濒死时，你加体力上限或回复体力。
	// 参考: skill_refer/sp/skill.js 的 gongao（沿用"体力上限/体力"提升的核心思路）。官方版触发于
	// "角色死亡后"且同时执行"加体力上限+回复体力"两个效果；本地卡面明确是"他人首次进入濒死"、
	// 二选一，机制本质不同（触发时机、是否二选一都变了），非简单数值差异，故保留当前重新设计的
	// 实现，仅确认filter/content与卡面描述一致（含"每名角色仅首次濒死触发一次"的marked记录）。
	gongao: {
		aiShowTag: "recover",
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
			const choices = ["体力上限+1"];
			if (player.isDamaged()) {
				choices.push("回复1点体力");
			}
			let control = choices[0];
			if (choices.length > 1) {
				const choice = await player
					.chooseControl(choices)
					.set("prompt", get.prompt2("gongao"))
					.set("ai", () => (player.hp <= 2 ? "回复1点体力" : "体力上限+1"))
					.forResult();
				control = choice.control;
			}
			if (control == "回复1点体力") {
				await player.recover();
			} else {
				// 走gainMaxHp事件，让威重等"体力上限变化"时机能响应
				await player.gainMaxHp();
			}
		},
		ai: {
			threaten: 1.5,
		},
	},
	// 参考: skill_refer/sp/skill.js 的 weizhong（沿用其id及"体力上限变化摸牌"的核心思路，触发范围由官方仅"体力上限变化"扩大为卡面描述的"体力上限或体力变化"，摸牌数固定为1张而非按手牌数分档）
	// 威重：锁定技，体力上限或体力变化时摸一张牌。
	weizhong: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: ["gainMaxHpEnd", "loseMaxHpEnd", "changeHpEnd"] },
		forced: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	},
	// 举义：限定技，准备阶段可将手牌摸至体力上限，摸牌数大于5则获得〖崩坏〗。
	// 参考: skill_refer/sp/skill.js 的 juyi（沿用与〖崩坏〗的关联、"体力上限相关摸牌"的判定思路）。
	// 官方版是"体力上限>玩家数"时自动触发的觉醒技(juexingji)，无条件摸满体力上限并同时获得
	// 崩坏+威重；本地卡面是"限定技"、玩家自选发动、摸至体力上限、且只有摸牌数大于5才获得崩坏，
	// 触发条件与技能类型均不同，非简单数值差异，故保留当前的限定技实现。
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
			event.result = await player
				.chooseBool(get.prompt2("juyi"))
				.set("ai", () => {
					const num = player.maxHp - player.countCards("h");
					return num >= 2 && num <= 5;
				})
				.forResult();
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
	// 参考: skill_refer/standard/_merged.md 的 guojia-tiandu（技能名：天妒，描述："当你的判定
	// 牌生效后，你可以获得之"）。该包源码中tiandu的audioname列表本就同时包含"re_guojia"与
	// "xizhicai"，说明官方设定戏志才与郭嘉共享同一个简化版"天妒"，此处实现与官方一致。
	// 修复：此技能原与下方"郭嘉（guojia）"分组的tiandu共用同一个key，JS对象字面量后定义的
	// 属性会覆盖前者，导致两个武将实际都会用郭嘉那份"判定+黑桃雷电伤害"的复杂效果。现保留
	// 戏志才用tiandu这个key（与官方一致），郭嘉分组下的tiandu已改用独立key gjtiandu。
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
		check(event) {
			return event.result.card?.name !== "du";
		},
	},
	// 先辅：锁定技，首次明置获得1枚"先驱"标记；任意角色的准备阶段可移去1枚标记选择该角色，
	// 之后其受伤你受到等量无来源伤害、其回复你回复等量体力。
	// 参考: skill_refer/sp/_merged.md 的 xizhicai-xianfu（"受伤/回复时共享等量伤害与回复"这一核心
	// 效果一致），但官方版是"游戏开始时直接选定目标"，与本地卡面明确写的"先驱标记，在某角色准备
	// 阶段移去标记选定"机制不同——旧版实现（首次明置时立刻不带标记地强制选目标）既没有标记
	// 也不是在目标"准备阶段"选择，与卡面不符，现改为标记+按时机选择的正确实现（沿用官方
	// xianfu2/xianfu_mark的"受伤/回复共享"结算与他人可视化标记，支持同一/多名角色多次入选）。
	xianfu: {
		aiShowTag: "support",
		audio: 2,
		forced: true,
		mark: true,
		marktext: "驱",
		group: ["xianfu_choose", "xianfu_effect"],
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			return !!(event.toShow && event.toShow.includes("xizhicai"));
		},
		async content(event, trigger, player) {
			player.storage.xianfu = (player.storage.xianfu || 0) + 1;
			player.markSkill("xianfu");
		},
		intro: {
			name: "先辅（先驱）",
			markcount: "xianfu",
			content: "拥有#枚“先驱”标记，可在一名角色的准备阶段移去1枚令其成为“先辅”目标",
		},
	},
	// 先辅辅助：任意角色准备阶段，可移去1枚"先驱"标记选定该角色
	xianfu_choose: {
		charlotte: true,
		sourceSkill: "xianfu",
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return (player.storage.xianfu || 0) > 0 && event.player != player && !(player.storage.xianfu_targets || []).includes(event.player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("xianfu", trigger.player))
				.set("ai", () => get.attitude(player, trigger.player) > 3 && trigger.player.hp >= player.hp)
				.forResult();
		},
		async content(event, trigger, player) {
			player.storage.xianfu--;
			if (!player.storage.xianfu_targets) {
				player.storage.xianfu_targets = [];
			}
			player.storage.xianfu_targets.push(trigger.player);
			player.markSkill("xianfu");
		},
	},
	xianfu_effect: {
		charlotte: true,
		sourceSkill: "xianfu",
		trigger: { global: ["damageEnd", "recoverEnd"] },
		forced: true,
		filter(event, player) {
			return (player.storage.xianfu_targets || []).includes(event.player) && event.player.isIn() && event.num > 0;
		},
		async content(event, trigger, player) {
			if (trigger.name == "damage") {
				await player.damage(trigger.num, "nosource");
			} else {
				await player.recover(trigger.num);
			}
		},
	},
	// 筹策：受伤后判定，黑色弃牌，红色令一名角色摸牌。
	// 以官方 skill_refer/sp/_merged.md 的 xizhicai-chouce 为基础（受伤后判定：黑色弃置一名角色
	// 一张牌、红色令一名角色摸牌，核心一致），卡面没有提及"先辅"联动加摸，故省略官方"若摸牌角色
	// 是〖先辅〗目标则改为摸两张"的联动分支，其余流程与官方一致。
	chouce: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.num > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("chouce"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const result = await player.judge().forResult();
			const color = result && result.color;
			if (color == "black") {
				if (game.hasPlayer(current => current.countDiscardableCards(player, "hej") > 0)) {
					const targetResult = await player
						.chooseTarget("筹策：弃置一名角色区域里的一张牌", (card, plyr, target) => target.countDiscardableCards(player, "hej") > 0, true)
						.set("ai", target => {
							const player = get.player();
							return get.effect(target, { name: "guohe_copy2" }, player, player);
						})
						.forResult();
					const target = targetResult.targets && targetResult.targets[0];
					if (target) {
						await player.discardPlayerCard(target, "hej", true);
					}
				}
			} else if (color == "red") {
				const targetResult = await player
					.chooseTarget("筹策：选择一名角色摸一张牌", true)
					.set("ai", target => {
						const player = get.player();
						return get.attitude(player, target);
					})
					.forResult();
				const target = targetResult.targets && targetResult.targets[0];
				if (target) {
					await target.draw();
				}
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						if (!target.hasFriend()) {
							return;
						}
						if (target.hp >= 4) {
							return [1, get.tag(card, "damage") * 1.5];
						}
						if (target.hp == 3) {
							return [1, get.tag(card, "damage") * 1];
						}
						if (target.hp == 2) {
							return [1, get.tag(card, "damage") * 0.5];
						}
					}
				},
			},
		},
	},

	// ============ 王朗（wanglang） ============
	// 卡面重新设计（用户2026-09-13提供新卡图更新）：出牌阶段限一次，你可以与一名角色拼点，拼点牌
	// 展示后你可以选择重复此流程，拼点结果为展示所有手牌点数之和，拼点赢的角色摸两张牌或令输的
	// 角色流失1点体力。是否重复流程由王朗一方决定；若王朗自己的点数总和更低，王朗也会成为输家。
	regushe: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && player.canCompare(target);
		},
		async content(event, trigger, player) {
			const target = event.target;
			let sum1 = 0,
				sum2 = 0;
			while (true) {
				const result = await player.chooseToCompare(target).forResult();
				if (!result || result.cancelled) {
					break;
				}
				sum1 += result.num1;
				sum2 += result.num2;
				if (!player.isIn() || !target.isIn() || !player.countCards("h") || !target.countCards("h")) {
					break;
				}
				const again = await player.chooseBool(`鼓舌：是否与${get.translation(target)}重复拼点流程（当前${get.translation(player)}：${sum1}，${get.translation(target)}：${sum2}）？`).forResult();
				if (!again.bool) {
					break;
				}
			}
			if (!player.isIn() || !target.isIn() || sum1 == sum2) {
				return;
			}
			const winner = sum1 > sum2 ? player : target;
			const loser = winner == player ? target : player;
			if (!winner.isIn()) {
				return;
			}
			const result = await winner.chooseControl(["摸两张牌", "令对方流失1点体力"]).set("prompt", "鼓舌：请选择拼点结果").forResult();
			if (result.control == "摸两张牌") {
				await winner.draw(2);
			} else if (loser.isIn()) {
				await loser.loseHp();
			}
		},
	},
	// 参考: skill_refer/xianding/_merged.md 的 wanglang-rejici（技能名：激词），情况同上，
	// _merged.md未收录具体实现代码，效果为本地全新设计。
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
			event.result = await player
				.chooseBool("激词：是否失去1点体力，令你的拼点牌的点数视为K？")
				.set("ai", () => {
					const mine = player == trigger.player ? trigger.num1 : trigger.num2;
					const other = player == trigger.player ? trigger.num2 : trigger.num1;
					return player.hp > 2 && mine < 13 && mine <= other;
				})
				.forResult();
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
	// 与 skill_refer/yijiang 的同名技能"忠鉴"效果不同（yijiang版为"出牌阶段限一次，展示一张
	// 手牌后展示一名角色的X张手牌并按颜色/点数关系摸牌、弃牌或改变手牌上限"，与本地"成为目标后
	// 可对使用者视为使用【知己知彼】"完全不同机制），非参考，效果为本地全新设计。
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
			event.result = await player
				.chooseBool(get.prompt2("zhongjian", trigger.player))
				.set("ai", () => trigger.player != player)
				.forResult();
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
				const result = await player
					.chooseBool(`忠鉴：是否明置${get.translation(source)}的${viewed}？`)
					.set("ai", () => get.attitude(player, source) < 0)
					.forResult();
				if (result.bool) {
					await source.showCharacter(slot);
				}
			}
		},
	},
	// 原创技能，无官方参考（未在任何已核对的官方包中找到与卡面"变更此武将牌，视为使用一张
	// 【无懈可击】"效果相同或相近的技能，官方国战同名技能gz_caishi是完全不同的重做效果）。
	// 卡面中"变更此武将牌"是代价（不是限定技，变更后此武将牌连同本技能一起离开，天然只能用一次）：
	// 在viewAs技能的precontent里先强制变更，再视为使用【无懈可击】。才识在副将时走国战自带的
	// player.changeVice（先明置再从同势力候选中选将）；在主将时引擎没有"变更主将"流程，沿用本文件
	// 惯例用player.changeCharacter随机换一名武将。
	// 才识：你可以变更此武将牌，视为使用一张【无懈可击】。
	caishi: {
		aiShowTag: "support",
		audio: 2,
		enable: "chooseToUse",
		filterCard() {
			return false;
		},
		selectCard: -1,
		viewAs: { name: "wuxie" },
		prompt: "变更“才识”所在的武将牌，视为使用一张【无懈可击】",
		// 才识所在的武将牌：0主将/1副将；第三将（name3）无变更流程，返回null
		getSlot(player) {
			if (player.name1 && get.character(player.name1, 3).includes("caishi")) {
				return 0;
			}
			if (player.name2 && get.character(player.name2, 3).includes("caishi")) {
				return 1;
			}
			return null;
		},
		viewAsFilter(player) {
			return lib.skill.caishi.getSlot(player) != null;
		},
		async precontent(event, trigger, player) {
			const slot = lib.skill.caishi.getSlot(player);
			if (slot == 1) {
				await player.changeVice();
				return;
			}
			if (slot == 0) {
				if (!_status.characterlist) {
					game.initCharacterList();
				}
				const pool = _status.characterlist.filter(name => lib.character[name] && !game.hasPlayer2(current => get.nameList(current).includes(name)));
				if (!pool.length) {
					return;
				}
				const newName = pool.randomGet();
				await player.changeCharacter(player.name2 ? [newName, player.name2] : [newName]);
			}
		},
		ai: {
			order: 1,
			result: {
				player(player) {
					// 只有副将本身价值不高时才值得换将
					return lib.skill.caishi.getSlot(player) == 1 && get.guozhanRank(player.name2, player) <= 3 ? 1 : 0;
				},
			},
		},
	},

	// ============ 毌丘俭（guanqiujian） ============
	// 与 skill_refer/shenhua 的同名技能"征荣"效果不同（官方版为"使用带伤害标签的基本/锦囊牌
	// 指定目标后，将一名手牌数不小于你的目标的一张牌置于武将牌上称为'荣'"，与本地"锁定技，
	// 你或受伤角色为孤军时伤害+1，且改变'军令'选择方式"完全不同机制），非参考，效果为本地
	// 全新设计。
	// 征荣：锁定技，当你造成伤害时，若你或受伤角色为孤军，此伤害+1。你发起"军令"时改为由你选择一张。
	zhengrong: {
		aiShowTag: "offense",
		audio: 2,
		// "当你造成伤害时"：source时机（player:damageBegin1是自己受伤）
		trigger: { source: "damageBegin1" },
		forced: true,
		group: ["zhengrong_junling"],
		filter(event, player) {
			// 孤军：势力已确定（非未明置）且场上没有其他同势力角色
			const isLone = p => !p.isUnseen() && !game.hasPlayer(current => current != p && current.isFriendOf(p));
			return isLone(player) || (event.player && event.player.isIn() && isLone(event.player));
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
		ai: {
			damageBonus: true,
			skillTagFilter(player, tag, arg) {
				const isLone = p => !p.isUnseen() && !game.hasPlayer(current => current != p && current.isFriendOf(p));
				return isLone(player) || !!(arg && arg.target && get.itemtype(arg.target) == "player" && isLone(arg.target));
			},
		},
		subSkill: {
			// 发起军令时（chooseJunlingFor事件默认随机亮出2张军令供选），改为6张全部亮出由你选择一张
			junling: {
				charlotte: true,
				trigger: { player: "chooseJunlingForBegin" },
				forced: true,
				popup: false,
				silent: true,
				async content(event, trigger, player) {
					trigger.num = 6;
				},
			},
		},
	},
	// 参考: skill_refer_guozhan 的 gz_guanqiujian-gzhongju（技能名同为"鸿举"），流程高度一致
	// （限定技，出牌阶段选一名角色排除在外，自己先执行军令，其余角色依次选择执行或本回合
	// 移出游戏/调虎离山化），之前只查过shenhua包，没查国战，误判为无参考。
	// 鸿举：限定技，出牌阶段选择一名其他角色排除在外，其余角色依次执行你发起的“军令”，不执行者本回合视为移出游戏。
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
			const others = game.filterPlayer(current => current != player && current != excluded).sortBySeat();
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
				const result = await current.chooseJunlingControl(player, junling, junlingTargets).set("prompt", "鸿举").set("choiceList", ["执行该军令", "不执行该军令，本回合视为移出游戏"]).forResult();
				if (result && (result.bool || result.index === 0)) {
					await current.carryOutJunling(player, junling, junlingTargets);
				} else {
					current.addTempSkill("diaohulishan");
				}
			}
		},
	},

	// ============ 鲁芝（luzhi） ============
	// 参考: skill_refer/sp/_merged.md 的 luzhi-qingzhong（技能名：清忠/清吏），效果基本一致
	// （出牌阶段开始摸两张牌，阶段结束时与手牌数最少的角色交换手牌），本地按卡面调整为
	// "若你手牌不为场上唯一最少才交换"，属对卡面描述的微调实现。
	// 清忠：出牌阶段开始摸两张牌，阶段结束时若你手牌不为唯一最少，与一名最少手牌角色交换手牌。
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
		check(event, player) {
			if (
				game.hasPlayer(function (current) {
					return current != player && current.isMinHandcard() && get.attitude(player, current) > 0;
				})
			) {
				return true;
			}
			if (player.countCards("h") <= 2) {
				return true;
			}
			// if(player.countCards('h')<=3&&!player.countCards('h','shan')) return true;
			//if(player.countCards('h',{type:'basic'})<=1) return true;
			return false;
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
			const result = await player.chooseTarget("清忠：选择一名手牌数最少的角色交换手牌", (card, plyr, target) => candidates.includes(target), true).forResult();
			const target = result.targets && result.targets[0];
			if (target) {
				await player.swapHandcards(target);
			}
		},
	},
	// 参考: skill_refer/sp/_merged.md 的 luzhi-weijing（技能名：卫境），核心机制一致（每轮限
	// 一次，需要使用某基本牌时可视为使用之），本地按卡面把官方版限定的"【杀】或【闪】"扩大为
	// "任意一张基本牌"，属对卡面描述的扩展实现。
	// 卫境：每轮限一次，需要使用基本牌时可视为使用之。
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
				const vcards = lib.inpile.filter(name => get.type(name) == "basic" && event.filterCard({ name, isCard: true }, player, event)).map(name => ["基本", "", name]);
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
		ai: {
			order(item, player) {
				var player = _status.event.player;
				var event = _status.event;
				if (event.filterCard({ name: "sha" }, player, event)) {
					if (
						!player.hasShan() &&
						!game.hasPlayer(function (current) {
							return player.canUse("sha", current) && current.hp == 1 && get.effect(current, { name: "sha" }, player, player) > 0;
						})
					) {
						return 0;
					}
					return 2.95;
				} else {
					var player = _status.event.player;
					if (player.hasSkill("qingzhong_effect")) {
						return 2.95;
					}
					return 3.15;
				}
			},
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (arg === "respond" || player.hasSkill("weijing_used")) {
					return false;
				}
			},
			result: {
				player: 1,
			},
		},
	},
	weijing_used: {
		charlotte: true,
	},

	// ============ 文鸯（wenyang） ============
	// 原创技能，无官方参考。与 skill_refer/xianding 包同名武将文鸯的技能"膂力"(xinlvli)效果
	// 不同（膂力为受伤后摸牌/回体力的资源转换技，与"覆阵"的决斗+手牌上限机制无关）；也与
	// skill_refer/jsrg 包"兴文鸯"的同名技能"覆阵"(jsrgfuzhen)无关（未在核对范围内找到jsrg版
	// 覆阵的效果与本地一致的证据）。
	// 覆阵：准备阶段可对一个势力的所有其他角色视为使用【决斗】，结算流程中共计打出的【杀】数为X，
	// 之后本回合全场角色只能再共计使用X张手牌（是全场共享的一个总额度X，不是每人各自X张）。
	// 参考: skill_refer_guozhan 的 gz_wenyang（晋势力）-gz_duanqiu（技能名：断虬），效果结构
	// 与本地几乎一致（准备阶段视为对一个势力全体使用一张决斗，结算后全场本回合共计只能再用
	// X张手牌，X为决斗中打出杀的数量），官方也是"全场共享一个额度"的设计（用一个技能拥有者
	// 身上的mark配合全局mod实现），印证了此前"改用game.fuzhen_pool共享额度"这次修复的方向
	// 是对的。之前只查过xianding"膂力"和jsrg"覆阵"（仅有语音线索查不到代码），没查到国战
	// 晋势力这个版本，误判为无参考。
	// 修复：原实现把"共计X张"的共享额度错误简化成"每名角色各自的X次数上限"，与卡面不符
	// （卡面明确是全场共用一个额度）；现改为用game.fuzhen_pool记录共享剩余额度，任意角色使用
	// 一张手牌就消耗1点，额度耗尽后所有角色本回合都不能再使用手牌。
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
				game.fuzhen_pool = x;
				for (const current of game.filterPlayer()) {
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
	// 覆阵共享额度：全场共用一个剩余次数game.fuzhen_pool，任意角色用一张手牌就消耗1点，
	// 归零后所有持有本临时技能的角色本回合都不能再使用手牌。
	fuzhen_cap_effect: {
		charlotte: true,
		trigger: { player: "useCardAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return typeof game.fuzhen_pool == "number" && game.fuzhen_pool > 0 && get.position(event.card, player) == "h";
		},
		async content(event, trigger, player) {
			game.fuzhen_pool = Math.max(0, (game.fuzhen_pool || 0) - 1);
		},
		mod: {
			cardEnabled2(card, player) {
				if (get.position(card) == "h" && typeof game.fuzhen_pool == "number" && game.fuzhen_pool <= 0) {
					return false;
				}
			},
		},
		onremove() {
			delete game.fuzhen_pool;
		},
	},

	// ============ 蒋干（jianggan） ============
	// 参考: skill_refer/sp/_merged.md 的 jianggan-weicheng（技能名：伪诚），效果基本一致
	// （手牌因交给他人/被他人获得而移动后，若手牌数小于体力上限/体力值可摸一张牌）。
	// 伪诚：交出/被夺手牌后，若手牌数小于体力上限，可摸一张牌。
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
	// 参考: skill_refer/sp/_merged.md 的 jianggan-daoshu（技能名：盗书），效果一致（出牌阶段
	// 限一次，选定花色并获得一名角色的一张手牌，花色猜中则伤害并令技能本阶段可再次发动，
	// 未猜中则须交还一张异色手牌，没有则展示所有手牌）。
	// 盗书：出牌阶段限一次，选定一名角色与一种花色并获得其一张手牌，猜中则伤害且技能视为未发动，未猜中则回赠一张异色手牌。
	// 修复：回赠环节原用"he"(手牌+装备)选牌/计数，与卡面"交给其一张其他花色的手牌"(仅手牌)不符，已改为"h"。
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
			const suitResult = await player
				.chooseControl(suits.map(s => get.translation(s)))
				.set("prompt", "盗书：选择一种花色")
				.forResult();
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
				const others = player.countCards("h", c => get.suit(c, player) != suit);
				if (others) {
					const giveResult = await player.chooseCard("h", true, c => get.suit(c, player) != suit, `盗书：交给${get.translation(target)}一张其他花色的手牌`).forResult();
					if (giveResult.bool && giveResult.cards && giveResult.cards.length) {
						await player.give(giveResult.cards, target);
					}
				} else if (player.countCards("h")) {
					await player.showHandcards();
				}
			}
		},
		ai: {
			order: 1,
			result: {
				target: -1,
			},
		},
	},

	// ============ 曹爽（caoshuang） ============
	// 与 skill_refer/sp 包的同名技能"擅专"效果不同（官方版为"对其他角色造成伤害后，可将其
	// 一张牌置入其判定区并转化为【乐不思蜀】或【兵粮寸断】、未造成伤害则结束阶段摸牌"的延时
	// 判定类技能，与本地"借用其他角色的无标签锁定技"完全不同机制），非参考，效果为本地全新设计。
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
			global: ["phaseJudgeBegin", "phaseDrawBegin", "phaseUseBegin", "phaseDiscardBegin", "phaseJieshuBegin", "phaseAfter", "useCard", "useCardAfter", "useCardToTargeted", "useCardToPlayered", "damageSource", "damageEnd", "dying", "dieAfter", "gainAfter", "loseAfter", "loseAsyncAfter", "judge", "respond"],
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

	// 参考: skill_refer/sp/_merged.md 的 caoshuang-retuogu（技能名：托孤），效果基本一致（一名
	// 角色死亡时，选择其武将牌上一个非主公技/限定技/觉醒技/隐匿技/使命技等"无标签"技能，你
	// 获得该技能并失去上次以此法获得的技能）。
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
		check(event, player) {
			var list = event.player.getStockSkills("仲村由理", "天下第一").filter(function (skill) {
				var info = get.info(skill);
				return info && !info.juexingji && !info.hiddenSkill && !info.zhuSkill && !info.charlotte && !info.limited && !info.dutySkill;
			});
			var negSkill = list.some(function (skill) {
				return get.skillRank(skill, "inout") <= 0;
			});
			var att = get.sgnAttitude(event.player, player);
			if (!player.storage.retuogu) {
				if (negSkill && att < 0) {
					return false;
				}
				return true;
			}
			list.sort(function (a, b) {
				return att * (get.skillRank(b, "inout") - get.skillRank(a, "inout"));
			})[0];
			return get.skillRank(list[0], "inout") >= get.skillRank(player.storage.retuogu, "inout");
		},
	},

	// ============ 华歆（huaxin） ============
	// 参考: skill_refer/huicui/_merged.md 的 huaxin-spwanggui（技能名：望归），"造成伤害后对
	// 异势力角色造成1点伤害"部分一致；"受到伤害后"部分本地扩展为"令所有同势力角色各摸一张牌"，
	// 官方版为"自己摸一张牌，或与一名同势力角色各摸一张牌"，按卡面描述做了范围扩展。
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
			event.result = await player.chooseTarget(get.prompt2("spwanggui"), (card, plyr, target) => target != player && target.isEnemyOf(player)).forResult();
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
	// 参考: skill_refer/huicui/_merged.md 的 huaxin-xibing（技能名：息兵），效果基本一致。
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
		check(event, player) {
			var target = event.player;
			var att = get.attitude(player, target);
			var num2 = Math.min(5, target.hp) - target.countCards("h");
			if (num2 <= 0) {
				return false;
			}
			var num = target.countCards("h", function (card) {
				return target.hasValueTarget(card, null, true);
			});
			if (!num) {
				return att > 0;
			}
			return (num - num2) * att < 0;
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
	// 参考: skill_refer/sp/_merged.md 的 tianyu-saodi（技能名：扫狄），效果一致（使用【杀】或
	// 普通锦囊牌仅指定一名其他角色为目标时，可令你与其之间较短一侧的角色一并成为目标）。
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
		aiJudge(card, player, target, bool) {
			let left3 = false,
				right3 = false;
			let eff_left = 0,
				eff_right = 0;
			const [left, right, left2, right2] = get.info("saodi").getTargets(player, target);
			if (target == left2) {
				for (const i of left) {
					if (lib.filter.targetEnabled2(card, player, i)) {
						left3 = true;
						eff_left += get.effect(i, card, player, player);
					}
				}
			}
			if (target == right2) {
				for (const i of right) {
					if (lib.filter.targetEnabled2(card, player, i)) {
						right3 = true;
						eff_right += get.effect(i, card, player, player);
					}
				}
			}
			if (left3 && right3) {
				if (!bool) {
					return Math.max(eff_left, eff_right);
				}
				if (eff_left > Math.max(0, eff_right)) {
					return "↖顺时针";
				}
				if (eff_right > Math.max(0, eff_left)) {
					return "逆时针↗";
				}
				return "cancel2";
			} else if (left3) {
				if (bool) {
					return eff_left > 0 ? "↖顺时针" : "cancel2";
				}
				return eff_left;
			} else if (right3) {
				if (bool) {
					return eff_right > 0 ? "逆时针↗" : "cancel2";
				}
				return eff_right;
			} else {
				return bool ? "cancel2" : 0;
			}
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					if (!target || player._saodi_judging || ui.selected.targets.length || player == target || target.hasSkill("undist")) {
						return;
					}
					if (typeof card != "object" || (card.name != "sha" && get.type(card) != "trick")) {
						return false;
					}
					player._saodi_judging = true;
					var effect = lib.skill.saodi.aiJudge(card, player, target);
					delete player._saodi_judging;
					if (effect > 0) {
						return [1, effect / Math.max(0.01, get.attitude(player, player))];
					}
				},
			},
		},
	},

	// ============ 董昭（dc_dongzhao） ============
	// 与 skill_refer/huicui 的官方董昭技能"移驾"(dcyijia)、"定基"(dcdingji)均效果不同，
	// 且本地技能名"劝进/凿运"亦非该包技能名，非参考，均为本地全新设计。
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
	// 参考: skill_refer/huicui/_merged.md 的 dc_yanghu-dcdeshao（技能名：德劭），核心机制一致
	// （成为其他角色使用黑色牌的目标后，按体力值相关的限次可弃置其一张牌）。
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
		check(event, player) {
			var eff = get.effect(player, { name: "draw" }, player, player);
			if (player.countCards("h") + 1 <= event.player.countCards("h") && event.player.countCards("he") > 0) {
				eff += get.effect(event.player, { name: "guohe_copy2" }, player, player);
			}
			return eff;
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

	// 参考: skill_refer_guozhan 的 gz_dc_yanghu-gzmingfa（技能名：明伐），效果基本一致（出牌
	// 阶段限一次选一名角色，其下回合结束时按双方手牌数多寡造成伤害获得牌或摸牌补差，官方
	// 摸牌封顶5张，本地"至多摸五张"完全一致），本地把官方限定的"敌方角色"放宽为"其他角色"。
	// 之前只查过常规huicui包（延时判定式设计，确实不同），没查国战，误判为全新设计。
	// 明伐：出牌阶段限一次，你可以选择一名其他角色。该角色下个回合结束时，若其手牌数
	// 小于你，你对其造成1点伤害并获得其一张手牌；否则你将手牌摸至与其相同（至多摸五张）。
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
	// 与 skill_refer/xianding 包（"轩辕"）的同名技能"决讨"效果不同（官方版为"限定技，体力值
	// 为1时可选一名角色，反复亮出并使用牌堆底的牌直到不可用或其死亡"，与本地"成为【杀】的
	// 目标后令其不可响应并令使用者亮出武将牌/手牌"完全不同机制），非参考，效果为本地全新设计。
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

	// 与 skill_refer/xianding 包（"轩辕"）的同名技能"潜龙"效果不同（官方版为"受伤后展示牌堆
	// 顶三张牌并获得其中至多已损失体力值张牌，其余置于牌堆底"，即"获得牌"；本地改为"使用"其中
	// 的牌），仅沿用"受伤后展示牌堆顶三张牌，数量与已损失体力值挂钩"的构思，非严格参考。
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

	// 参考: skill_refer/xianding/_merged.md 的 caomao-fensi（技能名：忿肆），效果一致。
	// 忿肆：锁定技，准备阶段，你对体力值不小于你的一名角色造成1点伤害，然后若该角色不为你，
	// 则其视为对你使用一张【杀】。与官方版一致，改写为现代async写法。
	fensi: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		async content(event, trigger, player) {
			if (!game.hasPlayer(current => current != player && current.hp >= player.hp)) {
				await player.damage();
				return;
			}
			const result = await player.chooseTarget(true, "忿肆：对一名体力值不小于你的角色造成1点伤害", (card, plyr, target) => target.hp >= player.hp).forResult();
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
	// 参考: skill_refer/jsrg/_merged.md 的 jsrg_caofang-jsrgzhaotu（技能名：诏图），效果一致。
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

	// 参考: skill_refer/jsrg/_merged.md 的 jsrg_caofang-jsrgjingju（技能名：惊惧），直接复用
	// 该包实现。
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
	// 参考: skill_refer/standard/_merged.md 的 simayi-fankui（技能名：反馈），基础机制一致
	// （受伤后可获得一张牌），官方版限定为"伤害来源的一张牌"，本地按卡面扩展为"场上任意一名
	// 角色装备区/判定区的一张牌"，属对卡面描述的扩展实现。
	// 反馈：当你受到伤害后，你可以获得场上的一张牌。与官方版不同：不限于伤害来源，而是
	// 场上（装备区/判定区）任意一名角色的一张牌。
	// 卡面重新设计（用户2026-09-13提供新卡图更新）：反馈：当你受到伤害后，你可以获得其（伤害
	// 来源）同势力角色的一张手牌或场上的一张牌。同势力判定从严：自己与自己永远同势力，其余
	// 未明置的角色一律视为不同势力（不可作为"同势力"目标），仅当伤害来源本人、或已明置且
	// 势力(group)与伤害来源相同的角色，才算"其同势力角色"。
	fankui: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			const source = event.source;
			const isMate = current => source && source.isIn() && (current == source || (!current.isUnseen(0) && current.group == source.group));
			return game.hasPlayer(current => isMate(current) && current.countCards("h") > 0) || game.hasPlayer(current => current.countCards("ej") > 0);
		},
		async cost(event, trigger, player) {
			const source = trigger.source;
			const isMate = current => source && source.isIn() && (current == source || (!current.isUnseen(0) && current.group == source.group));
			const hasHandTarget = game.hasPlayer(current => isMate(current) && current.countCards("h") > 0);
			const hasFieldTarget = game.hasPlayer(current => current.countCards("ej") > 0);
			let mode = "hand";
			if (hasHandTarget && hasFieldTarget) {
				const modeResult = await player.chooseControl(["获得其同势力角色的一张手牌", "获得场上的一张牌"]).set("prompt", get.prompt2("fankui")).forResult();
				mode = modeResult.control == "获得场上的一张牌" ? "field" : "hand";
			} else if (!hasHandTarget) {
				mode = "field";
			}
			event.fankuiZone = mode == "hand" ? "h" : "ej";
			event.result = await player.chooseTarget(get.prompt2("fankui"), (card, plyr, target) => (mode == "hand" ? isMate(target) && target.countCards("h") > 0 : target.countCards("ej") > 0)).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const zone = event.fankuiZone;
			if (!target || !target.countCards(zone)) {
				return;
			}
			const result = await player.choosePlayerCard(target, zone, true).forResult();
			if (result && result.cards && result.cards.length) {
				await player.gain(result.cards, target, "give");
			}
		},
		ai: {
			maixie_defend: true,
			effect: {
				target(card, player, target) {
					if (player.countCards("he") > 1 && get.tag(card, "damage")) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -1.5];
						}
						if (get.attitude(target, player) < 0) {
							return [1, 1];
						}
					}
				},
			},
		},
	},

	// 参考: skill_refer/standard/_merged.md 的 simayi-guicai（技能名：鬼才），效果一致。
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
		ai: {
			rejudge: true,
			tag: { rejudge: 1 },
		},
	},

	// ============ 曹操（caocao） ============
	// 与 skill_refer/standard 包的同名技能"奸雄"效果不同（官方版为"受到伤害后可直接获得
	// 对你造成此伤害的牌"，本地卡面改为"摸一张牌，然后令一名角色获得对你造成伤害的牌"，
	// 获得方从"自己"改为"可指定的任意角色"），非参考，效果为本地全新设计。
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
	// 参考: skill_refer_guozhan 的 gz_jun_caocao-huibian（技能名同为"挥鞭"），效果一致（出牌
	// 阶段限一次，对一名角色造成伤害，然后令另一名已受伤的同势力角色回复体力），本地把官方
	// 限定的"魏势力"放宽为"同势力"、去掉了官方"伤害后受伤角色摸两张牌"的中间环节。
	// 之前搜的是"护驾"这个错误的技能名（官方压根没有叫护驾的对应技能），才误判为无参考。
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
			const result = await player.chooseTarget("挥鞭：令一名与" + get.translation(target) + "同势力且已受伤的角色回复1点体力", (card, player, tgt) => tgt.isFriendOf(target) && tgt.isDamaged()).forResult();
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
	// 参考: skill_refer/standard/_merged.md 的 zhangliao-tuxi（技能名：突袭），核心构思一致
	// （少摸牌换取获得其他角色手牌），本地按卡面改写为"每回合限两次，获得的牌可再弃置换取
	// 获得等量其他角色各一张手牌"的两段式实现（tuxi + tuxi_convert）。
	tuxi: {
		aiShowTag: "support",
		group: ["tuxi_convert"],
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return !event.numFixed && game.hasPlayer(current => current != player && current.countCards("h") > 0);
		},
		async cost(event, trigger, player) {
			const num = Math.min(
				2,
				game.countPlayer(current => current != player && current.countCards("h") > 0)
			);
			event.result = await player.chooseTarget(get.prompt2("tuxi"), [1, num], (card, player, target) => target != player && target.countCards("h") > 0).forResult();
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
			event.result = await player.chooseCard(card => pool.includes(card), [1, pool.length], "突袭：是否将任意张刚获得的牌置入弃牌堆，然后获得等量其他角色各一张手牌？").forResult();
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			await player.discard(cards);
			const num = Math.min(
				cards.length,
				game.countPlayer(current => current != player && current.countCards("h") > 0)
			);
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
	// 与 skill_refer/standard 包的同名技能"裸衣"效果不同（官方版为"摸牌阶段可少摸一张牌，
	// 若如此做则本回合杀/决斗伤害+1"，与本地"限定技，废除防具栏，防具可当基本牌使用，永久
	// 杀/决斗伤害+1"完全不同机制），非参考，效果为本地全新设计。
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
	// 修复：此技能原与xizhicai分组的tiandu共用同一个key，已改用独立key gjtiandu，避免两个
	// 武将的天妒互相覆盖。官方standard包的guojia-tiandu是"判定牌生效后可获得之"的简化版，
	// 与本项目戏志才处的tiandu一致；这份"黑桃判定+雷电伤害"的复杂版本官方出处未能定位，
	// 暂视为本项目给郭嘉的原创加强版保留。
	gjtiandu: {
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
	// 参考: skill_refer/standard/_merged.md 的 guojia-yiji（技能名：遗计），核心构思一致
	// （受伤后获取资源并分配给角色），官方版为"观看牌堆顶两张牌并分配给任意角色"，本地按
	// 卡面改为"摸两张牌到手中，然后可将至多两张交给其他角色"，并新增"进入濒死时"也可触发，
	// 属对卡面描述的改写。
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
			const result = await player.chooseCard("he", [0, 2], true).set("prompt", "遗计：是否将至多两张牌交给其他角色？").forResult();
			if (!result || !result.bool || !result.cards || !result.cards.length) {
				return;
			}
			for (const card of result.cards) {
				if (!player.getCards("he").includes(card)) {
					continue;
				}
				const targetResult = await player.chooseTarget("遗计：将" + get.translation(card) + "交给一名其他角色", (c, player, target) => target != player).forResult();
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
	// 原创技能，无官方参考。skill_refer/shenhua 包徐晃(re_xuhuang)的实际技能为"断粮"(duanliang)
	// 和"截辎"(jiezi)，与本地"治严"效果均不同，character.js已注明为"全新设计，替换原技能"。
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
					const targetResult = await player.chooseTarget("治严：交给一名其他角色" + get.cnNumber(x) + "张手牌", (card, player, target) => target != player).forResult();
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
	// 参考: skill_refer/sp/_merged.md 的 yuejin-xiaoguo（技能名：骁果），效果基本一致（其他
	// 角色结束阶段弃一张手牌，令其选择弃装备牌或受到1点伤害），本地在"弃装备牌"分支按卡面
	// 增加了"你获得此装备牌或摸一张牌"的二选一，官方版固定为摸一张牌。
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
					const choice2 = await player
						.chooseControl(["获得", "摸牌"])
						.set("prompt", "骁果")
						.set("prompt2", "是否获得" + get.translation(card) + "，或摸一张牌？")
						.forResult();
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
	// 参考: 国战gz_bianfuren的技能列表直接引用了裸key"wanwei"，实际定义继承自
	// skill_refer/sp/skill.js 的旧版"wanwei"（sp包"扶危"改名前的遗留定义，audio仍标"wanwei"），
	// 效果为"因被获得/弃置而失去牌时可自己选择失去哪些牌"，与本地"用己方牌代替他人将被移动
	// 的牌"效果不同，但确系同名同角色的真实官方出处，之前只查了sp包现役的"扶危"，没深挖
	// 改名前的旧key，也没查国战，误判为无参考。
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
	// 参考: skill_refer_guozhan 的 gz_bianfuren-gz_yuejian（技能名同为"约俭"），同角色同名，
	// 但效果重新设计（官方是"弃牌阶段开始时若未指定过其他势力角色为目标则手牌上限+已损失
	// 体力值"，本地是"锁定技，同势力角色基础手牌上限改为体力上限"）。与 skill_refer/sp 包
	// ol_bianfuren 的同名"约俭"（展示手牌获得异色牌）是另一个不同版本，均非参考，效果为
	// 本地全新设计。之前只查了sp包，没查国战。
	yuejian: {
		aiShowTag: "support",
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
	// 原创技能，无官方参考（skill_refer/yijiang 包曹植的实际技能为"落英"(luoying)，效果为
	// "获得他人因弃置/判定而进入弃牌堆的梅花牌"，与本地"诗酒"效果不同，character.js已注明
	// 两个技能均为新名全新设计）。
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
	// 原创技能，无官方参考（同上，与yijiang包曹植"落英"效果不同）。
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
	// 参考: skill_refer/yijiang/_merged.md 的 zhonghui-quanji（技能名：权计），核心机制一致
	// （受伤/造成伤害后摸一张牌并将一张手牌置为"权"），官方版仅在"受到1点伤害后"触发且带有
	// "手牌上限+权的数量"的被动加成，本地按卡面扩展为"受到或造成伤害后"均可触发，且未实现
	// 手牌上限加成（卡面描述本身也未提及手牌上限加成，与官方版此点不同）。
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
			const result = player.countCards("h") == 1 ? { bool: true, cards: player.getCards("h") } : await player.chooseCard("h", true, "权计：将一张手牌置于武将牌上，称为“权”").forResult();
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_ol_paiyi（技能名：排异），②弃牌阶段结束时，
	// 若弃牌数小于持有的"权"数，可将任意张"权"交给一名角色，然后若其手牌数大于你对其造成1点伤害，
	// 与本项目卡面效果高度一致（官方判定条件为"弃牌数<权数"，本项目按卡面简化为"未弃置过牌"）；
	// 官方版①"体力上限减半个阴阳鱼"及"权"资源的国战主将技体系不适用于本项目，未移植。
	// 修复：原实现误写成 enable:"phaseUse" 的主动技，已改为弃牌阶段结束时触发的被动技，
	// 并加上"本阶段未弃置过牌"的限制条件（写法参考本文件xinfu_zuilun等处的同类判断）。
	paiyi: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "phaseDiscardEnd" },
		filter(event, player) {
			if (!player.getExpansions("quanji").length) {
				return false;
			}
			return !player.getHistory("lose", evt => evt.type == "discard" && evt.getParent("phaseDiscard")).length;
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_yaopan（钟会"邀叛"）。经核实，
	// 主副将/明置暗置机制在本项目中真实可用（见郝昭xishe_change、辛宪英zhongjian等技能），
	// 之前认为"本项目非国战模式无对应机制"的假设有误，现补回translate.js描述中的
	// "与你副将易位"效果：使用player.changeCharacter实现双方副将互换（简化自官方
	// transCharacter，未迁移技能扩展区里的额外内容，属可接受的简化）。
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
			const result = await player.chooseTarget("邀叛：指定一名同势力角色", (card, player, target) => target.isFriendOf(player)).forResult();
			const target = result && result.targets && result.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			if (target != player) {
				const swapResult = await target.chooseBool(`邀叛：是否与${get.translation(player)}交换副将？`).forResult();
				if (swapResult.bool && player.isIn() && target.isIn()) {
					const playerName2 = player.name2;
					const targetName2 = target.name2;
					const newPlayerPairs = [player.name1, targetName2].filter(Boolean);
					const newTargetPairs = [target.name1, playerName2].filter(Boolean);
					await player.changeCharacter(newPlayerPairs);
					await target.changeCharacter(newTargetPairs);
				}
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
	// 参考: skill_refer/shenhua/_merged.md 的 wangji-qizhi（技能名：奇制），该包中未收录qizhi/
	// jinqu的具体实现代码（提示为全局共享技能），但技能名与translate.js描述均对应官方"王基"
	// 广为人知的"奇制/进趋"效果（回合内使用基本/普通锦囊牌指定目标后可弃置非目标角色一张牌
	// 令其摸牌；结束阶段可摸两张牌然后按"奇制"发动次数弃牌），本地实现与该已知效果一致。
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
			event.result = await player.chooseTarget(get.prompt2("qizhi"), (card, player, target) => !trigger.targets.includes(target) && target.countCards("he") > 0).forResult();
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
	// 参考: skill_refer/shenhua/_merged.md 的 wangji-jinqu（技能名：进趋），情况同上。
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
	// 参考: skill_refer/sp/_merged.md 的 dingfeng-reduanbing（技能名：短兵），效果一致（使用
	// 【杀】选择目标后可为其增加一名距离为1的角色为额外目标；对距离为1的角色使用的【杀】
	// 需两张【闪】才能抵消）。
	// 短兵：使用【杀】选择目标后，可为其增加一名距离为1的额外目标；对距离为1的角色使用的【杀】需两张【闪】才能抵消。
	reduanbing: {
		aiShowTag: "offense",
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
	// 参考: skill_refer/sp/_merged.md 的 dingfeng-refenxun（技能名：奋迅），效果一致（出牌
	// 阶段限一次选择一名其他角色，本回合计算与其距离视为1；结束阶段若未对其造成过伤害，
	// 弃置一张牌）。
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
			return player.getHistory("sourceDamage", evt => player.storage.refenxun2.includes(evt.player)).length == 0 && player.countCards("he", card => lib.filter.cardDiscardable(card, player, "refenxun2")) > 0;
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
	// 排除: skill_refer/xianding 包的同名技能"调度"（官方xianding版为"出牌阶段开始时或发动
	// 〖典财〗后，可获得距离不大于1的角色装备区一张牌并转交给另一名角色，由其决定是否使用，
	// 使用/不使用则你/其摸一张牌"，与本地机制不同）。国战版 skill_refer_guozhan 的 gz_lvfan-
	// gz_diaodu_best（同势力用装备牌可摸牌 + 转移同势力角色装备区的牌）结构上与本项目更接近，
	// 但具体条件（本项目为"无该类别装备可摸牌"，官方为"先获得装备区一张牌再转交"）按卡面
	// 描述保留本地实现，不完全照搬。
	// 调度：同势力角色使用装备牌时若其无该类别装备可摸一张牌；准备阶段可移动同势力角色间的装备。
	diaodu: {
		aiShowTag: "support",
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
	// 参考: skill_refer/xianding/_merged.md 的 lvfan-diancai（技能名：典财），基础机制一致
	// （其他角色出牌阶段结束时，若你于此阶段失去的牌数不小于体力值相关的X，可将手牌摸至
	// 体力上限）。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_diancai（吕范"典财"），官方版用
	// 国战模式专属的player.mayChangeVice实现"变更副将"，本项目改用引擎通用API
	// player.changeCharacter实现（用法同郝昭xishe_change）。另外，官方版摸至体力上限后
	// 没有额外摸牌效果，故去掉了此前多出的一次player.draw()。
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
			if (!player.name2) {
				return;
			}
			const changeResult = await player.chooseBool(get.prompt("diancai"), "是否变更副将？").forResult();
			if (!changeResult.bool) {
				return;
			}
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

	// ============ 周处（jin_zhouchu，沿用周处唯一同名旧id，势力改为wu） ============
	// 参考: skill_refer/sixiang/_merged.md 的 zhouchu-stdxiongxia（技能名：凶侠），效果基本
	// 一致（可将两张牌当【决斗】对两名其他角色使用，若此牌令所有目标角色都受到过伤害，则
	// 〖凶侠〗本回合失效），仅措辞略有差异。
	// 凶侠：出牌阶段，可将两张牌当【决斗】对两名其他角色使用；若均造成过伤害，本回合此技能失效。
	xiongxia: {
		aiShowTag: "offense",
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
		check(card) {
			if (get.name(card) == "sha") {
				return 4 - get.value(card);
			}
			return 7.5 - get.value(card);
		},
	},
	xiongxia_disable: {
		charlotte: true,
	},

	// ============ 潘濬（panjun） ============
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_panjun-gzcongcha（技能名：聪察），
	// 原始代码见 guozhan/src/skill/character/rest.js 的 gzcongcha/gzcongcha2，效果一致：准备
	// 阶段选择一名未确定势力的其他角色，待其（于你下回合开始前）首次明置武将牌后结算：同势力
	// 则你与其各摸两张牌，不同势力则其失去1点体力；摸牌阶段若所有角色均已明置可多摸两张牌。
	congcha: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.isUnseen());
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("congcha"), "聪察：选择一名武将牌均暗置的其他角色", (card, plyr, target) => target != player && target.isUnseen())
				.set("ai", target => {
					const player = get.player();
					if (get.attitude(player, target) > 0) {
						return Math.random() + Math.sqrt(target.hp);
					}
					return Math.random() + Math.sqrt(Math.max(1, 4 - target.hp));
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.target;
			player.storage.congcha2 = target;
			player.addTempSkill("congcha2", { player: "phaseBegin" });
		},
		subfrequent: ["draw"],
		group: "congcha_draw",
		subSkill: {
			draw: {
				charlotte: true,
				trigger: { player: "phaseDrawBegin2" },
				frequent: true,
				filter(event, player) {
					return !event.numFixed && !game.hasPlayer(current => current.isUnseen());
				},
				prompt: "是否发动〖聪察〗多摸两张牌？",
				async content(event, trigger, player) {
					trigger.num += 2;
				},
			},
		},
	},
	congcha2: {
		charlotte: true,
		trigger: { global: "showCharacterAfter" },
		forced: true,
		onremove: true,
		filter(event, player) {
			return event.player == player.storage.congcha2;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			player.removeSkill("congcha2");
			if (player.isFriendOf(trigger.player)) {
				await Promise.all([player.draw(2), trigger.player.draw(2)]);
			} else {
				await trigger.player.loseHp();
			}
		},
		mark: "character",
		intro: { content: "已指定$为目标" },
	},
	// 参考: skill_refer/sp/_merged.md 的 panjun-xinfu_gongqing（技能名：公清），效果一致。
	// 公清：锁定技，受到伤害时，若来源攻击范围<3则伤害改为1，>3则伤害+1。
	xinfu_gongqing: {
		aiShowTag: "defense",
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
		ai: {
			filterDamage: true,
			skillTagFilter(player, tag, arg) {
				if (arg && arg.player) {
					if (arg.player.hasSkillTag("jueqing", false, player)) {
						return false;
					}
					if (arg.player.getAttackRange() < 3) {
						return true;
					}
				}
				return false;
			},
		},
	},

	// ============ 孙权（sunquan） ============
	// 参考: skill_refer/standard/_merged.md 的 sunquan-zhiheng（技能名：制衡），效果基本一致
	// （出牌阶段限一次，弃置任意张牌摸等量的牌），本地按卡面加入"弃光手牌则额外摸一张"的
	// 加成，为对卡面描述的扩展实现。
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
		check(card) {
			let player = get.player();
			if (get.position(card) === "e") {
				let subs = get.subtypes(card);
				if (subs.includes("equip2") || subs.includes("equip3")) {
					return player.getHp() - get.value(card);
				}
			}
			return 6 - get.value(card);
		},
	},
	// 嘉禾：锁定技，你与其他同势力角色间可以合纵；你势力相同的角色的【桃】和【五谷丰登】视为
	// 带有合纵标记。
	// 修复: 原实现是"结束阶段令队友摸牌+回体力"，与translate.js的jiahe_info完全不符，是此前
	// 版本瞎编的效果，现按jiahe_info重写。本项目此前从未真正接入guozhan模式的"合纵"标签/行动
	// 机制（skill_refer_guozhan的gzhongyuan/gzwanyi等只是引用了这个概念，mode/guozhan/src/
	// skill/character/rest.js里的_lianheng技能本身也没有被实际授予本项目的角色），这是第一次
	// 真正引入：约定用card.hasGaintag("_lianheng")表示"合纵标记"（写法与guozhan模式一致，
	// 便于以后其他技能复用同一约定），配合下方hasLianhengTag()辅助函数统一判定"某张牌对某名
	// 角色是否视为带合纵标记"（字面标记，或本技能新增的"己方桃/五谷丰登视为合纵标记"规则）。
	// "合纵"这个基础行动（出牌阶段可将至多三张带合纵标记的牌交给一名角色，若对方是其他势力则
	// 你摸等量的牌，原版限定只能给不同势力角色）本项目也未曾实装过，故一并原创引入并直接绑定在
	// jiahe技能上（没有再拆出单独的全局技能）；本技能的"你与其他同势力角色间可以合纵"就解释为
	// "合纵"的目标不再限制为不同势力角色，己方角色也可以是目标（只是给同势力角色不摸牌，因为
	// 摸牌只在"交给不同势力角色"时触发，符合原版设计）。诸葛瑾"弘援"(olhongyuan)复用同一套
	// hasLianhengTag()判定与"_lianheng"标记字符串。
	jiahe: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard(card, player) {
			return hasLianhengTag(card, player);
		},
		position: "he",
		selectCard: [1, 3],
		discard: false,
		lose: false,
		filterTarget(card, player, target) {
			return target != player;
		},
		check(card) {
			if (get.name(card) == "tao") {
				return 0;
			}
			return 7 - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			if (!target.isIn()) {
				return;
			}
			await player.give(cards, target);
			if (target.group != player.group) {
				await player.draw(cards.length);
			}
		},
		ai: {
			order: 4,
			result: {
				target(player, target) {
					return target.group == player.group ? 1 : get.attitude(player, target) > 0 ? 1 : -1;
				},
			},
		},
	},

	// ============ 陆逊（luxun） ============
	// 谦逊：锁定技，不能成为【顺手牵羊】和【乐不思蜀】的目标。
	// 参考: skill_refer/standard/_merged.md 的 qianxun（技能名：谦逊），效果一致（锁定技，不能成为顺手牵羊/乐不思蜀的目标）。
	qianxun: {
		aiShowTag: "defense",
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
	// 参考: skill_refer/standard/_merged.md 的 lianying（技能名：连营），效果一致（失去最后的手牌时可摸一张牌）。
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
		ai: {
			threaten: 0.8,
			effect: {
				player_use(card, player, target) {
					if (player.countCards("h") === 1) {
						return [1, 0.8];
					}
				},
				target(card, player, target) {
					if (get.tag(card, "loseCard") && target.countCards("h") === 1) {
						return 0.5;
					}
				},
			},
			noh: true,
			freeSha: true,
			freeShan: true,
			skillTagFilter(player, tag) {
				if (player.countCards("h") !== 1) {
					return false;
				}
			},
		},
	},

	// ============ 甘宁（ganning） ============
	// 参考: skill_refer/standard/_merged.md 的 qixi（技能名：奇袭），基础"将一张黑色牌当过河拆桥使用"机制一致；
	// 回合外弃置牌后可用其中基本/装备牌的 qixi_after 子技能为本项目扩展，未在标准包中找到对应，属原创扩展。
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
	// 参考: skill_refer/offline（九鼎子包）的 jd_sb_ganning-jdfenwei（技能名同为"奋威"），核心
	// 思路一致（普通锦囊牌指定≥2目标后，可令其中一个目标无效，若选了自己可联动发动一次"奇袭"）。
	// 之前只查过refresh/sb（sb包真正的奋威其实是sbfenwei，之前误查成了无关的sbduojing），
	// 没查offline子包，漏了这个参考。官方是"限定技"(一局一次)，本地"每轮限一次"为改写。
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
			event.result = await player.chooseTarget(get.prompt("gnfenwei"), "奋威：选择" + get.translation(trigger.card) + "的一名目标角色，令其无效", (card, player, target) => trigger.targets.includes(target)).forResult();
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_lvmeng-gz_keji（技能名：克己），
	// 效果完全一致（锁定技，出牌阶段未使用过不同颜色的牌则弃牌阶段开始时手牌上限+4）。
	// 之前只对比过skill_refer/standard的同名"克己"（跳过弃牌阶段，完全不同的技能），
	// 误判为原创；国战版才是真正对应的原版，结构本就一致，仅补上官方的check(AI提示：
	// 快到弃牌阶段、需要弃牌时才愿意主动发动明置)。
	// 克己：锁定技，弃牌阶段开始时若本回合出牌阶段未使用过不同颜色的牌，则本回合手牌上限+4。
	keji: {
		aiShowTag: "support",
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
		check(event, player) {
			return player.needsToDiscard();
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
	// 已检索 skill_refer 与 skill_refer_guozhan 全部"夺荆"相关词条（仅sb包的sbduojing为护甲相关觉醒技，机制无关），
	// 均未找到与本项目描述吻合的参考，原创技能，无官方参考。
	duojing: {
		aiShowTag: "control",
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_shelie（技能名：涉猎），效果一致（摸牌阶段可改为亮出牌堆顶
	// 五张牌，获得每种花色各一张）；skill_refer/_trans_merge.md 的 extra-shelie 亦为同名同效标准技能。
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
		ai: {
			threaten: 1.2,
		},
	},
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_gongxin（技能名：攻心），效果一致（出牌阶段限一次，观看一名
	// 其他角色手牌，展示其中一张♥牌，置于牌堆顶或弃置）。
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
	// 参考: skill_refer/refresh/_merged.md 的 re_huanggai（界黄盖）rekurou技能（出牌阶段限一次，
	// 弃置一张牌，然后失去1点体力）。用户确认：本项目卡面在此基础上有意多加了"摸一张牌"这一步，
	// 保留这个额外效果，只把filterCard/position等结构对齐rekurou的规范写法
	// （filterCard改用lib.filter.cardDiscardable）。
	kurou: {
		aiShowTag: "draw",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: lib.filter.cardDiscardable,
		position: "he",
		selectCard: 1,
		check(card) {
			return 8 - get.value(card);
		},
		async content(event, trigger, player) {
			await player.discard(event.cards);
			await player.draw();
			await player.loseHp();
		},
		ai: {
			order: 6,
			result: {
				player(player) {
					if (player.needsToDiscard(3) && !player.hasValueTarget({ name: "sha" }, false)) {
						return -1;
					}
					return get.effect(player, { name: "losehp" }, player, player);
				},
			},
			neg: true,
		},
	},
	// 诈降：锁定技，失去1点体力后摸两张牌，若此时为出牌阶段内，则本回合【杀】次数上限+1，红色【杀】无距离限制。
	// 参考: skill_refer/refresh/_merged.md 的 zhaxiang（技能名：诈降），基础结构一致（锁定技，失去体力后摸牌，
	// 出牌阶段内则本回合杀次数上限+1、红色杀无距离限制）；参考版摸三张牌且额外"红杀不能被闪响应"，
	// 本项目 translate.js 明确为摸两张牌且无此额外效果，属弱化版本，已按描述实现。
	hgzhaxiang: {
		aiShowTag: "defense",
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
		ai: {
			maihp: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, 1];
						}
						return 1.2;
					}
					if (get.tag(card, "loseHp")) {
						if (target.hp <= 1) {
							return;
						}
						var using = target.isPhaseUsing();
						if (target.hp <= 2) {
							return [1, player.countCards("h") <= 1 && using ? 3 : 0];
						}
						if (using && target.countCards("h", { name: "sha", color: "red" })) {
							return [1, 3];
						}
						return [1, target.countCards("h") <= target.hp || (using && game.hasPlayer(current => current != player && get.attitude(player, current) < 0 && player.inRange(current))) ? 3 : 2];
					}
				},
			},
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
	// 参考: skill_refer/standard/_merged.md 的 yingzi（技能名：英姿），"摸牌阶段多摸一张牌"部分一致；
	// "手牌上限等于体力上限"部分为周瑜英姿的经典完整效果（该参考文件的standard版本裁剪掉了这部分），本项目按经典版本保留。
	// 英姿：锁定技，摸牌阶段多摸一张牌；手牌上限等于体力上限。
	yingzi: {
		aiShowTag: "draw",
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
		ai: {
			threaten: 1.3,
		},
	},
	// 反间：出牌阶段限一次，展示一张手牌交给一名其他角色，其横置，并选择展示手牌弃置同花色的牌或失去1点体力。
	// 参考: skill_refer/refresh 包（界周瑜）的 refanjian（技能名：反间），核心机制（展示一张手牌交给
	// 目标，目标二选一：展示手牌弃置同花色的牌 / 失去1点体力）一致；本项目按卡面仅弃置"手牌"中同花色
	// 的牌（官方版为"he"含装备区，此处按卡面缩小范围为手牌）。排除现行 standard 包的"反间"（猜花色版），
	// 那是完全不同的效果。
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
	// 已检索 skill_refer/_trans_merge.md 仅"bingshi-potyanhui"一处同名词条（无可用代码定义，未找到实现），
	// skill_refer_guozhan 中未找到"焰洄"，原创技能，无官方参考。
	yanhui: {
		aiShowTag: "offense",
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
	// 参考: skill_refer/standard/_merged.md 的 guose（技能名：国色），效果一致（可将一张方片牌当乐不思蜀使用）。
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
	// 排除: skill_refer/refresh/_merged.md 的 daqiao-reguose（界大乔"国色"合并版），后半效果为"弃置一张方片牌
	// 并弃置场上一张乐不思蜀"，与本项目"移动乐不思蜀至另一角色判定区"不同，非参考。原创技能。
	guose2: {
		aiShowTag: "support",
		charlotte: true,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => current.countCards("j", card => get.name(card, current) == "lebu") > 0);
		},
		async cost(event, trigger, player) {
			const holderResult = await player.chooseTarget(get.prompt("guose2"), "将一名角色判定区里的一张【乐不思蜀】移动至另一名角色的判定区", (card, player, target) => target.countCards("j", card => get.name(card, target) == "lebu") > 0).forResult();
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
	// 参考: skill_refer/standard/_merged.md 的 liuli（技能名：流离），效果一致。
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
		ai: {
			effect: {
				target_use(card, player, target) {
					if (!target.hasCards("he")) {
						return;
					}
					if (card.name !== "sha") {
						return;
					}
					let min = 1;
					const friend = get.attitude(player, target) > 0;
					const vcard = { name: "shacopy", nature: card.nature, suit: card.suit };
					const players = game.filterPlayer();
					for (const current of players) {
						if (player != current && get.attitude(target, current) < 0 && target.canUse(card, current)) {
							if (!friend) {
								return 0;
							}
							if (get.effect(current, vcard, player, player) > 0) {
								if (!player.canUse(card, players[0])) {
									return [0, 0.1];
								}
								min = 0;
							}
						}
					}
					return min;
				},
			},
		},
	},

	// ============ 孙尚香（sunshangxiang） ============
	// 参考: skill_refer/standard/_merged.md 的 xiaoji（技能名：枭姬），效果一致。
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
		ai: {
			noe: true,
			reverseEquip: true,
			effect: {
				target(card, player, target, current) {
					if (get.type(card) == "equip" && !get.cardtag(card, "gifts")) {
						return [1, 3];
					}
				},
			},
		},
	},
	// 结姻：出牌阶段限一次，你可以弃置两张手牌并选择一名已经受伤的男性角色，你与其各回复1点体力。
	// 确认: character.js里此技能确实属于孙尚香(sunshangxiang)而非蒋钦；translate.js无_info覆盖
	// （沿用引擎默认释义），用户确认这就是官方标准版"结姻"，现按 skill_refer/standard/_merged.md
	// 的 jieyin 标准实现改写（原代码"弃一张牌或给装备+按体力高低摸牌/回体"是与官方完全不同的
	// 另一套重做机制，用户确认应改回标准版）。
	jieyin: {
		aiShowTag: "recover",
		audio: 2,
		enable: "phaseUse",
		filterCard: true,
		usable: 1,
		selectCard: 2,
		check(card) {
			const player = get.owner(card);
			if (player == null) {
				return 0;
			}
			if (player.countCards("h") > player.hp) {
				return 8 - get.value(card);
			}
			if (player.hp < player.maxHp) {
				return 6 - get.value(card);
			}
			return 4 - get.value(card);
		},
		filterTarget(card, player, target) {
			if (!target.hasSex("male")) {
				return false;
			}
			if (target.hp >= target.maxHp) {
				return false;
			}
			if (target === player) {
				return false;
			}
			return true;
		},
		async content(event, trigger, player) {
			await player.recover();
			await event.target.recover();
		},
		ai: {
			order: 5.5,
			result: {
				player(player) {
					if (player.hp < player.maxHp) {
						return 4;
					}
					if (player.countCards("h") > player.hp) {
						return 0;
					}
					return -1;
				},
				target: 4,
			},
			threaten: 2,
		},
	},

	// ============ 孙坚（sunjian） ============
	// 英魂：准备阶段，你可以选择一名其他角色并选择一项：1.令其摸X张牌，然后弃置一张牌；
	// 2.令其摸一张牌，然后弃置X张牌。（X为你已损失的体力值）
	// 参考: skill_refer/shenhua/_merged.md 的 sunjian-gzyinghun（技能名：英魂），效果一致（准备阶段若已受伤，
	// 可令一名其他角色摸X弃一或摸一弃X，X为已损失体力值）。
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
		ai: {
			effect: {
				target(card, player, target) {
					if (
						get.tag(card, "damage") &&
						get.itemtype(player) === "player" &&
						target.hp >
							(player.hasSkillTag("damageBonus", true, {
								target: target,
								card: card,
							})
								? 2
								: 1)
					) {
						return [1, 0.5];
					}
				},
			},
			threaten(player, target) {
				return Math.max(0.5, target.getDamagedHp() / 2);
			},
			maixie: true,
		},
	},
	// 毅魄：限定技，当你的体力值变为1时，你可以发动一次“英魂”。
	// 排除: skill_refer/onlyOL/_merged.md 的 ol_sb_sunjian-olsbyipo（技能名：毅魄），效果为"体力值变化后若为
	// 首次降至该新低点即可发动"（非限定技，不要求恰好为1），与本项目描述（限定技，仅体力值变为1时触发）不同，非参考。原创技能。
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
	// 参考: skill_refer/shenhua/_merged.md 的 sunce-jiang（技能名：激昂），前半效果一致（使用/成为决斗或红杀目标后可摸一张牌）；
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 yingyang（技能名：鹰扬），后半"拼点牌+3/-3"效果与本项目 scjiang_pd 一致。
	// 本项目 translate.js 将这两项官方分属不同技能的效果合并为一个"激昂"，故拆分实现为 scjiang + scjiang_pd 两部分。
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
		ai: {
			effect: {
				target_use(card, player, target) {
					if (card.name == "sha" && get.color(card) == "red") {
						return [1, 0.6];
					}
				},
				player_use(card, player, target) {
					if (card.name == "sha" && get.color(card) == "red") {
						return [1, 1];
					}
				},
			},
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
	// 注意: 技能名"鹰扬"与 skill_refer_guozhan 中的 yingyang（拼点+3/-3，已被 scjiang_pd 参考使用）重名，
	// 但本项目此处"鹰扬"的实际效果（准备阶段拼点，赢家视为对输家使用决斗，受伤后转化为"魂殇"）与guozhan版yingyang无关，
	// 且guozhan的"魂殇"hunshang为郡主技（viceSkill）体系的一部分（未找到独立代码实现），与本项目机制不同，原创技能。
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
	// 参考: skill_refer/shenhua/_merged.md 的 xiaoqiao-retianxiang（技能名：天香），效果与本项目 translate.js 完全一致，
	// 核心逻辑（弃红桃手牌防止伤害并选目标，二选一：伤害来源对其造成1伤害后摸牌 / 失1点体力后获得弃置的牌）相同。
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
				useOpt1 = (await player.chooseControl("选项1", "选项2").set("prompt", "天香：请选择效果").set("choiceList", ["令来源对其造成1点伤害，然后其摸牌", "令其失去1点体力，然后其获得你弃置的牌"]).forResult()).control == "选项1";
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
		ai: {
			maixie_defend: true,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return;
					}
					if (get.tag(card, "damage") && target.countCards("he") > 1) {
						return 0.7;
					}
				},
			},
		},
	},
	retianxiang_mark1: {
		charlotte: true,
	},
	retianxiang_mark2: {
		charlotte: true,
	},
	// 红颜：锁定技，你的♠牌和你的♠判定牌视为♥牌。若你的装备区有♥牌，则你的手牌上限+1。
	// 参考: skill_refer/shenhua/_merged.md 的 xiaoqiao-hongyan（技能名：红颜），基础"黑桃视为红桃"部分一致；
	// "装备区有红桃则手牌上限+1"为本项目额外增强，参考版无此部分，属本项目扩展。
	hongyan: {
		aiShowTag: "support",
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
	// 参考: skill_refer/shenhua/_merged.md 的 taishici-tianyi（技能名：天义），效果与代码结构完全一致。
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
		ai: {
			order(name, player) {
				const cards = player.getCards("h");
				if (player.countCards("h", "sha") == 0) {
					return 1;
				}
				for (let i = 0; i < cards.length; i++) {
					if (cards[i].name != "sha" && get.number(cards[i]) > 11 && get.value(cards[i]) < 7) {
						return 9;
					}
				}
				return get.order({ name: "sha" }) - 1;
			},
			result: {
				player(player) {
					if (player.countCards("h", "sha") > 0) {
						return 0.6;
					}
					const num = player.countCards("h");
					if (num > player.hp) {
						return 0;
					}
					if (num == 1) {
						return -2;
					}
					if (num == 2) {
						return -1;
					}
					return -0.7;
				},
				target(player, target) {
					const num = target.countCards("h");
					if (num == 1) {
						return -1;
					}
					if (num == 2) {
						return -0.7;
					}
					return -0.5;
				},
			},
			threaten: 1.3,
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
	// 排除: skill_refer/refresh/_merged.md 的 taishici-hanzhan（技能名：酣战），效果为"拼点时可改为随机选一张手牌拼点；
	// 拼点结束后可获得点数最大的杀"，与本项目描述（拼点结束后可使用其中一张拼点牌，不计入使用次数）不同，非参考。原创技能。
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
	// 已检索 skill_refer 与 skill_refer_guozhan 全部资料，未找到"buqu"/"不屈"的可用代码实现（经典标准武将技能，
	// 本项目按经典设计独立实现），原创实现，无本仓库内的官方参考代码。
	buqu: {
		aiShowTag: "defense",
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
	// 参考: skill_refer/shenhua 的 new_fenji（等同 mobile 包 xin_zhoutai 的"奋激"，触发时机
	// official为phaseAfter，本项目按卡面"结束阶段"改用phaseEnd），效果一致，未限制"一名角色"
	// 是否排除周泰自己（官方版同样不排除自己）。
	fenji: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return event.player.isIn() && event.player.countCards("h") == 0;
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
	// 参考: skill_refer/shenhua/_merged.md 的 lusu-haoshi（技能名：好施），效果一致（摸牌阶段额外摸两张牌，
	// 手牌数大于5则将一半（向下取整）交给场上手牌最少的其他角色）。
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
		check(event, player) {
			return (
				player.countCards("h") + 2 + event.num <= 5 ||
				game.hasPlayer(function (target) {
					return (
						player !== target &&
						!game.hasPlayer(function (current) {
							return current !== player && current !== target && current.countCards("h") < target.countCards("h");
						}) &&
						get.attitude(player, target) > 0
					);
				})
			);
		},
		ai: {
			threaten: 2,
			noh: true,
			skillTagFilter(player, tag) {
				if (tag == "noh") {
					if (player.countCards("h") != 2) {
						return false;
					}
				}
			},
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
	// 参考: skill_refer/shenhua/_merged.md 的 lusu-dimeng（技能名：缔盟），效果一致（选两名其他角色，弃置等同于
	// 二者手牌数之差的牌，然后交换其手牌）。
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
		check(card) {
			const list = [],
				player = _status.event.player;
			const num = player.countCards("he");
			const players = game.filterPlayer();
			let count;
			for (let i = 0; i < players.length; i++) {
				if (players[i] != player && get.attitude(player, players[i]) > 3) {
					list.push(players[i]);
				}
			}
			list.sort(function (a, b) {
				return a.countCards("h") - b.countCards("h");
			});
			if (list.length == 0) {
				return -1;
			}
			const from = list[0];
			list.length = 0;
			for (let i = 0; i < players.length; i++) {
				if (players[i] != player && get.attitude(player, players[i]) < 1) {
					list.push(players[i]);
				}
			}
			if (list.length == 0) {
				return -1;
			}
			list.sort(function (a, b) {
				return b.countCards("h") - a.countCards("h");
			});
			if (from.countCards("h") >= list[0].countCards("h")) {
				return -1;
			}
			for (let i = 0; i < list.length && from.countCards("h") < list[i].countCards("h"); i++) {
				if (list[i].countCards("h") - from.countCards("h") <= num) {
					count = list[i].countCards("h") - from.countCards("h");
					break;
				}
			}
			if (count < 2 && from.countCards("h") >= 2) {
				return -1;
			}
			if (ui.selected.cards.length < count) {
				return 11 - get.value(card);
			}
			return -1;
		},
		ai: {
			order: 6,
			threaten: 3,
			expose: 0.9,
			result: {
				target(player, target) {
					const list = [];
					const num = player.countCards("he");
					const players = game.filterPlayer();
					if (ui.selected.targets.length == 0) {
						for (let i = 0; i < players.length; i++) {
							if (players[i] != player && get.attitude(player, players[i]) > 3) {
								list.push(players[i]);
							}
						}
						list.sort(function (a, b) {
							return a.countCards("h") - b.countCards("h");
						});
						if (target == list[0]) {
							return get.attitude(player, target);
						}
						return -get.attitude(player, target);
					} else {
						const from = ui.selected.targets[0];
						for (let i = 0; i < players.length; i++) {
							if (players[i] != player && get.attitude(player, players[i]) < 1) {
								list.push(players[i]);
							}
						}
						list.sort(function (a, b) {
							return b.countCards("h") - a.countCards("h");
						});
						if (from.countCards("h") >= list[0].countCards("h")) {
							return -get.attitude(player, target);
						}
						for (let i = 0; i < list.length && from.countCards("h") < list[i].countCards("h"); i++) {
							if (list[i].countCards("h") - from.countCards("h") <= num) {
								const count = list[i].countCards("h") - from.countCards("h");
								if (count < 2 && from.countCards("h") >= 2) {
									return -get.attitude(player, target);
								}
								if (target == list[i]) {
									return get.attitude(player, target);
								}
								return -get.attitude(player, target);
							}
						}
					}
				},
			},
		},
	},

	// ============ 张昭&张纮（zhangzhang） ============
	// 参考: skill_refer/shenhua/_merged.md 的 zhangzhang-zhijian（技能名：直谏），基础机制一致（出牌阶段将手牌中
	// 一张装备牌置入其他角色装备区，然后摸一张牌）；参考版"不得替换原装备"（filterTarget限制target.canEquip），
	// 本项目 translate.js 明确改为"可以替换原装备"，故 filterTarget 未加此限制，属本项目调整。
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
		check(card) {
			const player = _status.currentPhase;
			if (player.countCards("he", { subtype: get.subtype(card) }) > 1) {
				return 11 - get.equipValue(card);
			}
			return 6 - get.value(card);
		},
		ai: {
			basic: {
				order: 10,
			},
			result: {
				target(player, target) {
					const card = ui.selected.cards[0];
					if (card) {
						return get.effect(target, card, target, target);
					}
					return 0;
				},
			},
			threaten: 1.3,
		},
	},
	// 固政：每回合限一次，当一名角色一次性弃置至少两张牌后，你可以令其获得其中一张弃置的牌。
	// 若其不是你，你获得其余弃置的牌。
	// 参考: skill_refer/shenhua/_merged.md 的 zhangzhang-guzheng（技能名：固政），设计思路一致（令角色获得弃置牌中的一张，
	// 其余归你），但参考版触发时机限定为"其他角色弃牌阶段结束时"且仅限弃牌阶段产生的弃牌，本项目 translate.js 改为
	// "每回合限一次，任意一次性弃置至少两张牌后"（不限弃牌阶段、不限于其他角色），已按本项目描述实现，属扩展版本。
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
		ai: {
			threaten: 1.3,
			expose: 0.2,
		},
	},

	// ============ 蒋钦（dc_jiangqing） ============
	// 尚义：出牌阶段每名角色限一次，你可以令一名其他角色观看你的手牌，然后你选择一项：
	// 1.观看其手牌并可以弃置其中的一张黑色牌；2.观看其所有暗置的武将牌，你可以明置其中一张然后令此技能本回合失效。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_jiangqing-gz_shangyi（技能名：尚义），选项1（观看手牌弃黑色牌）结构一致；
	// 但参考版选项2仅为"观看其所有暗置的武将牌"（viewCharacter），本项目 translate.js 描述多出"可以明置其中一张然后令此技能本回合失效"，
	// 参考版未覆盖，该部分改用本项目已确认可用的明置/暗置机制（player.showCharacter/isUnseen，见"薛夷"xueyi技能同用法）原创实现。
	// 另排除: skill_refer/xianding/_merged.md 的 dc_jiangqing-dcshangyi，其描述（"弃置不同花色的黑色牌各一张"，无第二选项）与本项目不同，非参考。
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
			const { control } = await player.chooseControl(["观看其手牌并弃置一张黑色牌", "观看其装备区和判定区的牌并获得其中一张"]).set("prompt", "尚义：请选择").forResult();
			if (control == 0 && target.countCards("h")) {
				await player.discardPlayerCard(target, "h", true).set("filterButton", button => get.color(button.link, target) == "black");
			} else if (control == 1) {
				const options = [];
				if (target.isUnseen(0)) {
					options.push("主将");
				}
				if (target.name2 && target.isUnseen(1)) {
					options.push("副将");
				}
				if (!options.length) {
					return;
				}
				let slot;
				if (options.length == 1) {
					slot = options[0] == "主将" ? 0 : 1;
				} else {
					const result = await player
						.chooseControl(options.concat("cancel2"))
						.set("prompt", "尚义：你可以选择明置" + get.translation(target) + "的一张暗置的武将牌")
						.forResult();
					if (result.control == "cancel2") {
						return;
					}
					slot = result.control == "主将" ? 0 : 1;
				}
				await target.showCharacter(slot);
				player.removeSkill("dcshangyi");
				player.addTempSkill("dcshangyi_disabled", "phaseAfter");
			}
		},
		ai: {
			order: 11,
			result: {
				target(player, target) {
					return -target.countCards("h");
				},
			},
			threaten: 1.1,
		},
	},
	dcshangyi_reset: {
		charlotte: true,
		onremove(player) {
			delete player.storage.dcshangyi_used;
		},
	},
	// 令“尚义”本回合失效（发动第二项效果后获得的转化技，回合结束后失去，同时恢复“尚义”）
	dcshangyi_disabled: {
		charlotte: true,
		onremove(player) {
			player.addSkill("dcshangyi");
		},
	},
	// 鸟翔：锁定技，当你使用【杀】指定其他角色为目标后，若你在其攻击范围内，其需使用两张【闪】才能抵消。
	dcniaoxiang: {
		aiShowTag: "offense",
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
	// 参考: skill_refer/sp/skill.js 的 olhuanshi（技能名：缓释），核心机制一致（令一名角色观看你的手牌，选择一张代替其判定牌）；
	// 排除: skill_refer_guozhan 的 gzhuanshi（技能名：缓释）效果为"打出一张牌代替判定"，与本项目机制不同，非参考。
	// olhuanshi额外含"重铸任意张牌"分支，本项目未实现该部分（translate.js无对应描述），视为简化版本。
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
			const result = await trigger.player.choosePlayerCard("缓释：观看" + get.translation(player) + "的手牌，选择一张代替判定牌", "he", "visible", true, player).forResult();
			const card = result.links[0];
			await player.showCards([card], get.translation(player) + "发动了【缓释】");
			game.cardsDiscard(trigger.player.judging[0]);
			trigger.player.judging[0] = card;
			trigger.orderingCards.add(card);
			game.log(trigger.player, "的判定牌被替换为", card);
			game.delay(2);
		},
		check(event, player) {
			if (get.attitude(player, event.player) <= 0) {
				return false;
			}
			var cards = player.getCards("he");
			var judge = event.judge(event.player.judging[0]);
			for (var i = 0; i < cards.length; i++) {
				var judge2 = event.judge(cards[i]);
				if (judge2 > judge) {
					return true;
				}
				if (_status.currentPhase != player && judge2 == judge && get.color(cards[i]) == "red" && get.useful(cards[i]) < 5) {
					return true;
				}
			}
			return false;
		},
		ai: {
			rejudge: true,
			tag: {
				rejudge: 1,
			},
		},
	},
	// 弘援：出牌阶段限一次，你可令一张没有合纵标记的手牌视为拥有合纵标记直到本回合结束；当你
	// 即将因合纵而摸牌时，你可改为令一名与你势力相同的其他角色摸等量的牌。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gzhongyuan（技能名：弘援），描述与本项目
	// translate.js完全一致，代码结构（group+subSkill.draw监听drawBefore、subSkill.clear在
	// onremove时清除标记）直接照搬。原版用event.getParent().name=="_lianheng"判断摸牌是否
	// 由官方"合纵"行动触发；本项目目前唯一的"合纵"给牌行动是孙权"嘉禾"(jiahe，见上方)，故这里
	// 判断event.getParent().name=="jiahe"，若以后新增其他合纵给牌技能，需要把技能名加入下面
	// 这个数组。合纵标记判定统一复用本文件顶部的hasLianhengTag()与"_lianheng"标记字符串。
	olhongyuan: {
		aiShowTag: "draw",
		audio: "hongyuan",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasCard(card => !hasLianhengTag(card, player), "h");
		},
		filterCard(card, player) {
			return !hasLianhengTag(card, player);
		},
		position: "h",
		selectCard: 1,
		discard: false,
		lose: false,
		check(card) {
			return 4.5 - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards } = event;
			cards[0].addGaintag("_lianheng");
			player.addTempSkill("olhongyuan_clear", { player: "phaseAfter" });
		},
		group: "olhongyuan_draw",
		ai: { order: 2, result: { player: 1 } },
		subSkill: {
			clear: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("_lianheng");
				},
			},
			draw: {
				audio: "hongyuan",
				trigger: { player: "drawBefore" },
				direct: true,
				filter(event, player) {
					return !!event.getParent() && ["jiahe"].includes(event.getParent().name) && game.hasPlayer(current => current != player && current.isFriendOf(player));
				},
				async content(event, trigger, player) {
					const result = await player
						.chooseTarget(get.prompt("olhongyuan"), "弘援：是否将摸牌（" + get.cnNumber(trigger.num) + "张）转移给一名同势力角色？", (card, player, target) => target != player && target.isFriendOf(player))
						.setHiddenSkill("olhongyuan")
						.set("ai", () => -1)
						.forResult();
					if (result && result.bool && result.targets && result.targets.length) {
						const target = result.targets[0];
						player.logSkill("olhongyuan", target);
						trigger.cancel();
						await target.draw(trigger.num);
					}
				},
			},
		},
	},
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gzmingzhe（技能名：明哲），描述与本项目 translate.js 完全一致
	// （回合外使用/打出红色牌或失去装备区红色牌时可摸一张牌），当前代码逻辑吻合，仅补充注释。
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
	// 燊围：同势力角色的结束阶段，可以将手牌摸至当前体力值。原创技能，无官方参考（trans_merge/guozhan 均未搜到"燊围"）。
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
	// 恪守：受到伤害时可弃置两张同色牌令伤害-1；孤军（除自己外无同势力角色）时改为摸一张牌。
	// skill_refer_guozhan/_trans_merge_guozhan.md 中的 keshou 词条无对应代码定义（未找到实现，可能为动态生成的fake技能），原创实现。
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_jiangqing-gz_yicheng_new（技能名：疑城），效果吻合（同势力角色用杀指定第一目标后或成为杀目标后，摸一弃一）；
	// 本实现以循环形式同时处理使用者与目标两侧的受益人，逻辑等价，未逐字照抄结构。
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
	// 参考: skill_refer/yijiang/_merged.md 的 xusheng-xinpojun（技能名：破军），效果与代码结构一致（出牌阶段用杀指定目标后，
	// 将其至多X张牌扣置武将牌旁，回合结束后其获得这些牌，X为其体力值）。
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
		ai: {
			unequip_ai: true,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (get.attitude(player, arg.target) > 0 || !player.isPhaseUsing()) {
					return false;
				}
				if (tag == "directHit_ai") {
					return arg.target.hp >= Math.max(1, arg.target.countCards("h") - 1);
				}
				if (arg && arg.name == "sha" && arg.target.getEquip(2)) {
					return true;
				}
				return false;
			},
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 xuanlve（技能名：旋略），基础效果（失去装备区的牌后可弃置一名其他角色一张牌）一致；
	// 本项目 translate.js 描述多了"或一次性失去至少两张牌"的触发条件，参考版未覆盖，属本项目扩展。
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
		ai: {
			noe: true,
			reverseEquip: true,
			effect: {
				target(card, player, target, current) {
					if (get.type(card) == "equip") {
						return [1, 1];
					}
				},
			},
		},
	},
	// 参考: skill_refer/refresh/_merged.md 的 lingtong-yongjin（技能名：勇进），基础效果（限定技，出牌阶段移动至多三张装备牌）一致；
	// 本项目 translate.js 描述多了"可失去X点体力令可移动装备牌数量+X"，参考版未覆盖，属本项目扩展，原创部分已按描述实现。
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
			const result = await player.chooseControl(choices).set("prompt", "勇进：你可以失去X点体力，令本次可以移动的装备牌数量+X").forResult();
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
		ai: {
			order: 7,
			result: {
				player(player) {
					var num = 0;
					var friends = game.filterPlayer(function (current) {
						return get.attitude(player, current) >= 4;
					});
					var vacancies = {
						equip1: 0,
						equip2: 0,
						equip3: 0,
						equip4: 0,
						equip5: 0,
					};
					for (var i = 0; i < friends.length; i++) {
						for (var j = 1; j <= 5; j++) {
							if (friends[i].hasEmptySlot(j)) {
								vacancies["equip" + j]++;
							}
						}
					}
					var sources = game.filterPlayer(function (current) {
						return ((current == player && current.hasSkill("decadexuanfeng")) || get.attitude(player, current) < 0) && current.countCards("e");
					});
					for (var i = 0; i < sources.length; i++) {
						var es = sources[i].getCards("e");
						for (var j = 0; j < es.length; j++) {
							var type = get.subtype(es[j]);
							if (sources[i] == player || (vacancies[type] > 0 && get.value(es[j]) > 0)) {
								num++;
								if (
									sources[i] == player &&
									vacancies[type] &&
									game.hasPlayer(function (current) {
										return get.attitude(player, current) < 0 && current.countDiscardableCards(player, "he") > 0 && get.damageEffect(current, player, player) > 0;
									})
								) {
									num += 0.5;
								}
								if (num >= 3) {
									return 1;
								}
								vacancies[type]--;
							}
						}
					}
					if (num && player.hp == 1) {
						return 0.5;
					}
					return 0;
				},
			},
		},
	},

	// ============ 陈武&董袭（chendong） ============
	// 参考: skill_refer/xianding/_merged.md 的 dc_jiangqing-dcduanxie（技能名：断绁，inherit自sp包的duanxie），
	// 基础机制（出牌阶段限一次，令其他角色横置然后自己横置）一致；本项目 translate.js 描述扩展为"至多两名目标"
	// 且"已连环时可立即发动一次奋命"，参考版为单目标且无此联动，属本项目扩展，已按描述实现。
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
	// 已检索 skill_refer 中的 sp-fenming、tw-twfenming、shiji-spfenming 等同名技能，效果均与本项目 translate.js
	// 描述（结束阶段处于连环时弃置所有连环角色各一张牌，并对其中一名因此没有手牌的角色造成1点伤害）不同，非参考；原创技能。
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
	// 排除: skill_refer/sixiang/_merged.md 的 stdzaoli（技能名：躁厉），效果为"弃置手牌或装备区其一并摸等量牌失去1点体力"，
	// 与本项目 translate.js 描述（同时弃置手牌+装备区并摸等量牌；然后可另将一张牌当决斗使用并失去体力再摸牌）不同，非参考。原创技能。
	zaolix: {
		aiShowTag: "draw",
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
				const result = await player
					.chooseCard("he", "躁厉：是否将一张牌当【决斗】使用？")
					.set("ai", card => 0)
					.forResult();
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
	// 参考: skill_refer/yijiang/_merged.md 的 bulianshi-old_anxu（技能名：安恤），基础机制（出牌阶段限一次，令两名手牌数
	// 不同的其他角色中手牌少者获得手牌多者一张手牌并展示，非黑桃则摸一张）完全一致；本项目 translate.js 额外增加了
	// "若两者手牌数相等则你回复1点体力"的分支，参考版无此分支，属本项目扩展，已按描述实现。
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
		ai: {
			order: 10.5,
			threaten: 2.3,
			result: {
				target(player, target) {
					var num = target.countCards("h");
					var att = get.attitude(player, target);
					if (ui.selected.targets.length == 0) {
						if (att > 0) {
							return -1;
						}
						var players = game.filterPlayer();
						for (var i = 0; i < players.length; i++) {
							var num2 = players[i].countCards("h");
							var att2 = get.attitude(player, players[i]);
							if (num2 < num) {
								if (att2 > 0) {
									return -3;
								}
								return -1;
							}
						}
						return 0;
					} else {
						return 1;
					}
				},
				player: 1,
			},
		},
	},
	// 排除: skill_refer/yijiang/_merged.md 的 bulianshi-zhuiyi（技能名：追忆），效果为"角色死亡时令一名其他角色摸三张牌并回复1点体力"，
	// 与本项目 translate.js 描述（限定技，准备阶段，已受伤时可令一名其他角色摸三张牌、回复1点体力并复原武将牌）触发时机和机制均不同，非参考。原创技能。
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_ol_daohuo（技能名：蹈火）。按用户要求严格按
	// translate.js的daohuo_info完整实现，不做简化："阴阳鱼"/"珠联璧合"按普通标记（player.addMark/
	// countMark/removeMark）实现，guozhan专属的transCharacter两人互换副将改用引擎通用的
	// player.changeCharacter(newPairs)分别对双方各调用一次达到"交换"效果。
	daohuo: {
		aiShowTag: "offense",
		group: ["daohuo_view", "daohuo_yinyang", "daohuo_swap"],
		check(card) {
			return 6 - get.value(card);
		},
	},
	daohuo_view: {
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
		prompt: "蹈火：将两张颜色不同的牌当火【杀】使用，然后将你的“阴阳鱼”标记补至1",
		check(card) {
			return 6 - get.value(card);
		},
		ai: { order: 6, respondSha: true, expose: 0.2 },
	},
	// 内部标记技：daohuo_view结算后，将"阴阳鱼"标记补至1（不影响已有>=1的情况）。
	daohuo_yinyang: {
		charlotte: true,
		silent: true,
		popup: false,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return event.skill == "daohuo_view" && !player.countMark("yinyang_mark");
		},
		forced: true,
		content() {
			player.addMark("yinyang_mark", 1, false);
		},
	},
	// 内部技：当你的【酒】或【杀】造成伤害时，可选一名与受伤角色势力相同的另一名角色，令其与受伤角色交换副将牌。
	daohuo_swap: {
		charlotte: true,
		trigger: { source: "damageSource" },
		filter(event, player) {
			if (!event.card) {
				return false;
			}
			if (event.card.name != "jiu" && event.card.name != "sha") {
				return false;
			}
			const target = event.player;
			return target?.isIn() && game.hasPlayer(current => current != target && current.isFriendOf(target));
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			event.result = await player
				.chooseTarget("蹈火：是否选择一名与" + get.translation(target) + "势力相同的角色，令其与" + get.translation(target) + "交换副将牌？", (card, playerx, current) => {
					const evtTarget = _status.event.getParent().trigger.player;
					return current != evtTarget && current.isFriendOf(evtTarget);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const other = event.targets[0];
			if (!target?.isIn() || !other?.isIn()) {
				return;
			}
			const targetVice = target.name2;
			const otherVice = other.name2;
			await target.changeCharacter([target.name1, otherVice].filter(Boolean));
			await other.changeCharacter([other.name1, targetVice].filter(Boolean));
		},
	},
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_ol_chunlao（技能名：醇醪）。按卡面完整实现，
	// "阴阳鱼"/"珠联璧合"标记用普通计数标记，视为使用【酒】用hiddenCard+chooseButton虚拟牌结构
	// （参照官方gz_ol_chunlao的subSkill.jiu写法简化命名，保留完整的"选择消耗哪种标记"逻辑）。
	chunlao: {
		aiShowTag: "support",
		audio: "chunlao",
		global: "chunlao_jiu",
	},
	chunlao_jiu: {
		charlotte: true,
		onremove: true,
		enable: "chooseToUse",
		filter(event, player) {
			if (!game.hasPlayer(current => current.isFriendOf(player) && current.hasSkill("chunlao"))) {
				return false;
			}
			if (!player.countMark("yinyang_mark") && !player.countMark("zhulianbihe_mark")) {
				return false;
			}
			const jiu = new lib.element.VCard({ name: "jiu", isCard: true });
			return event.filterCard(jiu, player, event);
		},
		hiddenCard(player, name) {
			if (name != "jiu") {
				return false;
			}
			if (!game.hasPlayer(current => current.isFriendOf(player) && current.hasSkill("chunlao"))) {
				return false;
			}
			return player.countMark("yinyang_mark") > 0 || player.countMark("zhulianbihe_mark") > 0;
		},
		chooseButton: {
			dialog() {
				return ui.create.dialog("###醇醪###移去一枚“阴阳鱼”或“珠联璧合”标记，视为使用一张【酒】");
			},
			chooseControl(event, player) {
				const list = [];
				if (player.countMark("zhulianbihe_mark")) {
					list.push("珠联璧合");
				}
				if (player.countMark("yinyang_mark")) {
					list.push("阴阳鱼");
				}
				list.push("cancel2");
				return list;
			},
			check(button) {
				if (button.link == "cancel2") {
					return 0;
				}
				return 1;
			},
			backup(result, player) {
				return {
					link: result.control,
					filterCard: () => false,
					selectCard: -1,
					viewAs: { name: "jiu", isCard: true },
					async precontent(event, trigger, player) {
						delete event.result.skill;
						player.logSkill("chunlao");
						const mark = event.result.link == "阴阳鱼" ? "yinyang_mark" : "zhulianbihe_mark";
						player.removeMark(mark, 1, false);
					},
				};
			},
		},
	},

	// ============ 韩当（handang） ============
	// 排除: skill_refer/yijiang/_merged.md 的 handang-gongji（技能名：弓骑），效果为"弃一张牌后攻击范围无限至回合结束，
	// 若弃的是装备牌可另弃一名角色一张牌"，与本项目 translate.js 描述（坐骑区有牌则攻击范围恒定无限；出牌阶段限一次弃非基本牌
	// 选一名角色弃其一张牌，若弃的是武器本回合可发动该武器效果）不同，非参考。原创技能。
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
	// 排除: skill_refer/yijiang/_merged.md 的 handang-jiefan（技能名：解烦，限定技），效果为"选一名角色，令攻击范围内含有
	// 该角色的所有角色依次选择弃武器牌或摸一张牌"，与本项目 translate.js 描述（出牌阶段限一次，令目标角色本人选择
	// "令攻击范围内含有其的角色各弃一张牌"或"摸等同于该范围角色数的牌"）机制不同（选择方与效果对象都不同），非参考。原创技能。
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
			const choice = await target.chooseControl(["弃置", "摸牌"]).set("prompt", get.prompt2("jiefan")).set("choiceList", ["令攻击范围内含有你的角色各弃置一张牌", "摸等同于攻击范围内含有你的角色数的牌"]).forResult();
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
	// 排除: skill_refer/yijiang/_merged.md 的 panzhangmazhong-duodao（技能名：夺刀），效果为"受到杀造成的伤害后"才触发，
	// 与本项目 translate.js 描述（"成为杀的目标后"即可触发，无需实际受到伤害）触发时机不同，非参考。原创技能。
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
	// 排除: skill_refer/yijiang/_merged.md 的 panzhangmazhong-anjian（技能名：暗箭），仅有"伤害+1"，无"无视防具"和"禁止用桃"部分，
	// 与本项目 translate.js 描述不完全一致（本项目为增强版），非直接参考，已按本项目描述保留增强实现。
	anjian: {
		aiShowTag: "offense",
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
	// 胆守：每回合限一次，当你成为基本牌或锦囊牌的目标后，你可以摸X张牌（X为你本回合
	// 成为基本牌或锦囊牌的目标的次数）。
	// 排除: skill_refer/yijiang/_merged.md 的 zhuran-danshou（技能名：胆守），效果为"出牌阶段主动选攻击范围内角色，
	// 按发动次数弃牌产生递增效果"，与本项目 translate.js 描述（被动触发：成为基本/锦囊牌目标后摸X张牌）机制完全不同，非参考。原创技能。
	// 修复：卡面"每回合限一次"指个人回合(turn)，原实现却用"roundStart"(每轮，一圈所有人回合结束才重置)
	// 来重置"本回合已发动"标记与计数，导致一整轮里只能发动一次而非每个回合各一次，现改为"phaseBegin"
	// （每次任意角色的回合开始时）重置，与"每回合限一次"的字面意思一致。
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
			player.addTempSkill("danshou_used", { global: "phaseBegin" });
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
		trigger: { global: "phaseBegin" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.danshou_count = 0;
		},
	},
	// 截路：当你造成伤害后，若该伤害未使目标角色进入濒死状态，你可以摸一张牌，然后终止当前事件的
	// 后续结算，并结束当前回合。
	// 已搜索 skill_refer/_trans_merge.md 与 skill_refer_guozhan/_trans_merge_guozhan.md，均未找到"截路"技能，原创技能，无官方参考。
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
	// 谮毁：当你使用【杀】或锦囊牌造成伤害时，你可以令一名非目标角色成为伤害来源。
	// 排除: skill_refer/yijiang/_merged.md 的 sunluban-chanhui（技能名：谮毁），效果为"使用杀/黑色普通锦囊指定唯一目标时，
	// 令另一名可成为目标的角色选择代替使用者或成为额外目标"，与本项目 translate.js 描述（造成伤害时嫁祸伤害来源）机制不同，非参考，原创技能。
	chanhui: {
		aiShowTag: "support",
		audio: 2,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			const cardEvt = event.getParent();
			return !!cardEvt && (cardEvt.name == "sha" || get.type2(cardEvt.name) == "trick");
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget(get.prompt2("chanhui"), (card, plyr, target) => target != player && target != trigger.player).forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			trigger.source = event.targets[0];
		},
	},
	// 除异：每轮限一次，当一名其他角色对与你势力不同的角色造成伤害时，你可以令此伤害+1。若伤害
	// 来源为男性，你可以流失1点体力，令此伤害额外+1。
	// 已搜索 skill_refer/_trans_merge.md 与 skill_refer_guozhan/_trans_merge_guozhan.md，均未找到"除异"技能，原创技能，无官方参考。
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
	// 邀名：每回合限一次，当你造成或受到伤害后，你可以选择一名角色，若其手牌数：大于等于
	// 你，你弃置其一张牌；小于等于你，其摸一张牌（手牌数相等时两个效果都执行）。
	// 以官方 skill_refer/onlyOL/_merged.md 的 ol_quancong-olyaoming 为基础改写（弃置/摸牌两条件
	// 独立判断、弃牌范围"he"均沿用官方写法），略去官方"若目标为当前回合角色则你本回合视为拥有
	// 〖赈赡〗"的衍生联动——本项目 quancong 的 zhenshan 是常驻拥有的独立第二技能而非衍生获得，
	// 该联动逻辑不适用，属合理简化。
	// 排除: skill_refer/yijiang/_merged.md 的 quancong-yaoming，效果（二选一：弃手牌数大于你者一张手牌/令手牌数小于你者摸一张）与本项目不同，非参考。
	// 修复两处：①原代码用if/else导致"手牌数相等"时只弃牌不摸牌，与卡面"大于等于/小于等于"两个
	// 独立条件不符，现改为官方式的两个独立if；②"每回合限一次"的重置时机原为"roundStart"（每轮
	// 才重置一次），改为"phaseBegin"（每个回合开始都重置），与"每回合限一次"字面一致。
	yaoming: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd", source: "damageSource" },
		filter(event, player) {
			return !player.hasSkill("yaoming_used");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("yaoming"), (card, plyr, target) => {
					if (player.countCards("h") >= target.countCards("h")) {
						return true;
					}
					return target.hasDiscardableCards(player, "he");
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			player.addTempSkill("yaoming_used", { global: "phaseBegin" });
			const target = event.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			if (target.countCards("h") >= player.countCards("h") && target.hasDiscardableCards(player, "he")) {
				await player.discardPlayerCard({ target, position: "he", forced: true });
			}
			if (target.isIn() && target.countCards("h") <= player.countCards("h")) {
				await target.draw();
			}
		},
	},
	yaoming_used: { charlotte: true },
	// 赈赡：每回合限一次，当你需要使用或打出基本牌时，你可以与手牌数小于你的一名角色交换手牌，
	// 视为使用或打出之。
	// 参考: skill_refer/onlyOL/skill.js 的 ol_quancong-olzhenshan（技能名：赈赡，与"邀名"olyaoming配套），
	// 以及 skill_refer/tw/_merged.md 的 zhenshan（技能名：振赡，同音异字，效果描述几乎逐字相同：
	// "每回合限一次，当你需要使用或打出一张基本牌时，可以与一名手牌数少于你的角色交换手牌，视为使用或打出此牌"），核心机制一致。
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
			const result = await player.chooseTarget("赈赡：选择一名手牌数小于你的角色交换手牌", (card, plyr, target) => candidates.includes(target)).forResult();
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
			const use = await player.chooseCard("赈赡：选择要" + (evt.name == "chooseToUse" ? "使用" : "打出") + "的牌", card => cardsx.includes(card), "h").forResult();
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
		ai: {
			order() {
				const player = _status.event.player;
				const event = _status.event;
				const nh = player.countCards("h");
				if (
					game.hasPlayer(function (current) {
						return get.attitude(player, current) > 0 && current.countCards("h") < nh;
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
			skillTagFilter(player, tag, arg) {
				if (player.getStat().skill.zhenshan > 0) {
					return false;
				}
				const nh = player.countCards("h");
				return game.hasPlayer(function (current) {
					return current != player && current.countCards("h") < nh;
				});
			},
			result: {
				player(player) {
					if (_status.event.type == "dying") {
						return get.attitude(player, _status.event.dying);
					}
					return 1;
				},
			},
		},
	},
	zhenshan_used: { charlotte: true },

	// ============ 孙休（sunxiu） ============
	// 宴诛：限定技，出牌阶段，你可以选择一名其他角色，你获得其装备区里的所有牌。
	// 排除: skill_refer/yijiang/_merged.md 的 sunxiu-yanzhu 及其 mobile/reyanzhu 等变体，均为"令目标选择交出装备区牌
	// 或改为弃一张牌/受到伤害+1"的博弈式设计，与本项目 translate.js 描述（限定技，直接获得目标装备区所有牌，无目标选择）不同，非参考，原创技能。
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
	// 兴学：结束阶段，你可以令至多X名角色（X为你的体力上限）依次摸一张牌，并将一张牌置于
	// 牌堆顶或将此牌交给另一名此技能的目标。
	// 以官方 skill_refer/yijiang/_merged.md 的 sunxiu-xingxue 为基础（结束阶段令至多X名角色依次摸
	// 一张牌、置一张牌于牌堆顶的核心流程一致）：官方X默认取体力值、失去〖宴诛〗后改为体力上限，
	// 本项目〖宴诛〗本就是与官方机制不同的独立限定技（见上），故X固定按卡面直接取体力上限，并
	// 按卡面追加"可将牌交给另一名目标"的选项。
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
	// 安国：锁定技，若其他同势力角色的装备区没有武器/防具牌，其视为装备着你装备区内的武器/防具
	// 牌。若其装备区有武器/防具牌，其攻击距离/其他角色计算与其的距离+1。若你的装备区仅有一张
	// 牌，此牌不能被弃置或获得。（原创，武器牌对应攻击距离一档，防具牌对应距离一档，分别按“该
	// 槽位有牌则+1，没有牌则借用你对应槽位的牌”独立判定；不能被弃置/获得沿用程普等已用过的
	// canBeDiscarded/canBeGained 三件套写法）
	xinanguo: {
		aiShowTag: "support",
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
				const src = game.filterPlayer(cur => cur != to && cur.isFriendOf(to) && cur.hasSkill("xinanguo"))[0];
				if (!src) {
					return;
				}
				if (to.getEquip(2)) {
					return distance + 1;
				}
				if (src.getEquip(2)) {
					return distance + 1;
				}
			},
		},
	},

	// ============ 孙登（sundeng） ============
	// 匡弼：出牌阶段限一次，你可以将至多三张牌置于武将牌上，称为"弼"。你的回合外，与你
	// 势力相同的角色可以如手牌般使用或打出"弼"；每当一张"弼"因此离开你的武将牌后，你摸一张牌。
	// 你的下个回合开始时，移去所有"弼"。
	// 已核对 skill_refer/_trans_merge.md 里的 rekuangbi/yijiang-kuangbi/yijiang-xinkuangbi 三个同名
	// 官方技能，均是"他人代为存牌、之后由你/他人按各自方式取回"的机制，没有一个和本地卡面"同势力
	// 角色可直接如手牌使用打出弼、弼离开后你摸牌"的机制吻合，原创技能，无可复用的官方参考。
	kuangbi: {
		aiShowTag: "support",
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
		// “你的回合外”指的是“弼”的主人（拥有〖匡弼〗的那名角色）的回合外，而非借用者自己的回合外；
		// “与你势力相同的角色”按项目约定自己与自己永远同势力，故不排除弼主人本人借用自己的“弼”。
		hiddenCard(player, name) {
			return game.hasPlayer(cur => cur.isFriendOf(player) && cur.hasSkill("kuangbi") && _status.currentPhase != cur && cur.getExpansions("kuangbi").length > 0);
		},
		filter(event, player) {
			if (event.responded) {
				return false;
			}
			return game.hasPlayer(cur => cur.isFriendOf(player) && cur.hasSkill("kuangbi") && _status.currentPhase != cur && cur.getExpansions("kuangbi").some(card => event.filterCard(card, player, event)));
		},
		async content(event, trigger, player) {
			const evt = event.getParent(2);
			const cardsx = [];
			game.filterPlayer(cur => cur.isFriendOf(player) && cur.hasSkill("kuangbi") && _status.currentPhase != cur).forEach(src => {
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
	// 引兵：结束阶段，你可以将任意名攻击范围内包含你的角色各一张手牌置于你的武将牌上；
	// 当你受到【杀】或【决斗】造成的伤害后，来源可以获得一张"引兵"牌。
	// 对比 skill_refer/sp/skill.js 同角色(祖茂)同名 yinbing："置于武将牌上"的牌来源(官方是你自己
	// 的非基本牌、本地是攻击范围内其他角色的手牌)、受伤后结算方式(官方是移去一张、本地是伤害
	// 来源获得一张)均不同，机制本质不同，非参考，保留当前原创实现。
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
				event.result = await player.chooseTarget([1, candidates.length], "引兵：选择任意名攻击范围内包含你的角色，各获得其一张手牌", (card, plyr, target) => candidates.includes(target)).forResult();
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
	// 绝地：锁定技，准备阶段，你选择一项：1.移去所有"引兵"牌，然后你摸牌至体力上限；
	// 2.令一名体力值小于等于你的其他角色获得所有"引兵"牌，然后其回复1点体力并摸等量的牌。
	// 以官方 skill_refer/sp/skill.js 同角色(祖茂)同名 juedi 为基础改写：官方版效果与本地卡面几乎
	// 逐句一致（仅"引兵"牌的来源不同，见上方yinbing说明，不影响juedi本身），核心结构（用一次
	// chooseTarget、filterTarget限定为"你hp>=目标hp"、选中自己就走"移去+摸牌"分支、选中他人就
	// 走"给牌+回复+摸牌"分支）原样保留，含官方的AI权重逻辑，仅将filterTarget中的固定target改为
	// 引擎API的player/target参数写法。
	juedi: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.getExpansions("yinbing").length > 0;
		},
		forced: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2("juedi"), true, function (card, player, target) {
					return player.hp >= target.hp;
				})
				.set("ai", function (target) {
					const player = get.player();
					const att = get.attitude(player, target);
					if (att < 2) {
						return att - 10;
					}
					let num = att / 10;
					if (target == player) {
						num += player.maxHp - player.countCards("h") + 0.5;
					} else {
						num += _status.event.n2 * 2;
						if (target.isDamaged()) {
							if (target.hp == 1) {
								num += 3;
							} else if (target.hp == 2) {
								num += 2;
							} else {
								num += 0.5;
							}
						}
					}
					if (target.hasJudge("lebu")) {
						num /= 2;
					}
					return num;
				})
				.set("n2", player.getExpansions("yinbing").length)
				.forResult();
			if (result.bool) {
				player.line(result.targets[0], "green");
				const cards = player.getExpansions("yinbing");
				if (result.targets[0] == player) {
					const loseNext = player.loseToDiscardpile(cards);
					const num = player.maxHp - player.countCards("h");
					await loseNext;
					if (num > 0) {
						await player.draw(num);
					}
				} else {
					const target = result.targets[0];
					await target.recover();
					await player.give(cards, target, "give");
					await target.draw(cards.length);
				}
			}
		},
	},

	// ============ 诸葛恪（zhugeke） ============
	// 傲才：当你于回合外需要使用或打出一张基本牌时，你可以观看牌堆顶三张牌：若其中有此
	// 牌，你可以使用或打出之；否则，你可以将这些牌置于牌堆底。
	// 对比 skill_refer/sp/skill.js 同角色(诸葛恪)同名 aocai："观看张数固定为2张、无手牌时改为4张、
	// 未选中时不放回牌堆底"，与本地卡面"固定3张、未选中可选择放至牌堆底"的数值和分支都不同，
	// 结构上沿用了同一套"虚拟牌viewAs+backup"实现思路（与kuangbi_backup同款写法），保留现状。
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
		aiShowTag: "control",
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
			event.result = await player.chooseTarget(get.prompt2("dingpan"), (card, player, target) => target.countCards("e") > 0 && !used.includes(target.group)).forResult();
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
			const result = await target.chooseControl(["获得装备区所有牌", "被弃置一张装备牌"]).set("prompt", "定叛：请选择一项").forResult();
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
		aiShowTag: "defense",
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
		aiShowTag: "support",
		audio: 2,
	},

	// ============ 阚泽（kanze） ============
	// 下书：出牌阶段开始时，你可以将所有手牌交给一名其他角色，然后该角色亮出任意数量的手牌，
	// 你选择一项：1.获得其亮出的手牌；2.获得其未亮出的手牌。
	xiashu: {
		aiShowTag: "support",
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
			const pick = await player.chooseControl(["亮出的手牌", "未亮出的手牌"]).set("prompt", "下书：请选择获得哪部分手牌").set("prompt2", `亮出的手牌（${shown.length}张）/未亮出的手牌（${hidden.length}张）`).forResult();
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
			await player.chooseToUse({ name: "sha", isCard: true, nature: "ice" }, "###影箭###视为使用一张无距离限制的冰【杀】").set("complexSelect", true).set("complexTarget", true);
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
		aiShowTag: "defense",
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
		aiShowTag: "draw",
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
	// 修复：本项目"阴阳鱼"是跨武将共享的标记概念（程普醇醪需要能消耗任何角色的阴阳鱼标记），
	// 原实现用陆绩专属的player.storage.huaiju_mark单独计数，与许攸nzry_chenglve、程普chunlao
	// 用的标记方式互不相通，现统一改用通用计数标记yinyang_mark（player.addMark/countMark/
	// removeMark），效果不变。
	// 怀橘：锁定技，你首次明置此武将时，你获得3枚"阴阳鱼"标记；当同势力角色受到伤害时，其可以
	// 弃置1枚"阴阳鱼"标记，防止此伤害。
	// 修复: 原实现用init(player)在角色进入游戏时就直接发放标记，未按卡面"你首次明置此武将时"
	// 的条件触发（若此武将作为暗置的副将登场，会在未明置前就已提前拿到标记）；已改为参考
	// sbyingmen(许劭)的写法，通过showCharacterAfter监听首次明置。
	nzry_huaiju: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.toShow.includes("luji") && !player.storage.nzry_huaiju_inited;
		},
		content(event, trigger, player) {
			player.storage.nzry_huaiju_inited = true;
			player.addMark("yinyang_mark", 3, false);
		},
		group: "nzry_huaiju_effect",
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { global: "damageBefore" },
				popup: false,
				filter(event, player) {
					return event.player && player.isFriendOf(event.player) && event.player.countMark("yinyang_mark") > 0;
				},
				async cost(event, trigger, player) {
					event.result = await trigger.player.chooseBool(`怀橘：是否弃置1枚"阴阳鱼"标记，防止你受到的伤害？`).forResult();
				},
				async content(event, trigger, player) {
					trigger.player.removeMark("yinyang_mark", 1, false);
					trigger.cancel();
				},
			},
		},
	},
	// 遗礼：摸牌阶段，你可以少摸一张牌或流失一点体力，获得2枚"阴阳鱼"标记，然后你可以令任意名
	// 其他角色各获得你的1枚"阴阳鱼"标记。
	// 修复: 原实现监听"drawBefore"，会对一切来源的摸牌（包括其他技能触发的摸牌）生效，与卡面
	// "摸牌阶段"的限定不符，已改为"phaseDrawBegin1"（仅摸牌阶段的摸牌生效）。
	nzry_yili: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		async content(event, trigger, player) {
			const result = await player.chooseControl(["少摸一张牌", "流失一点体力", "不发动"]).set("prompt", "遗礼：是否少摸一张牌或流失一点体力，获得2枚“阴阳鱼”标记？").forResult();
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
			player.addMark("yinyang_mark", 2, false);
			const others = game.filterPlayer(current => current != player);
			if (!others.length) {
				return;
			}
			const giveResult = await player.chooseTarget("遗礼：你可以令任意名其他角色各获得你的1枚“阴阳鱼”标记", [0, others.length], (card, player, target) => target != player).forResult();
			if (giveResult.bool && giveResult.targets && giveResult.targets.length) {
				for (const target of giveResult.targets) {
					if (player.countMark("yinyang_mark") <= 0) {
						break;
					}
					player.removeMark("yinyang_mark", 1, false);
					target.addMark("yinyang_mark", 1, false);
				}
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
					const result = await player.chooseTarget(`溃诛：选择一名体力值不大于${remaining}的角色（还可继续选择，点击“取消”结束选择）`, [0, 1], (card, player, target) => target.hp <= remaining && !chosen.includes(target)).forResult();
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
		aiShowTag: "offense",
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
			return !!event.card?.storage?.yechou_dmgbuff;
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
			const result = await player.chooseToGive(trigger.player, "he", [0, Infinity]).set("prompt", get.prompt2(event.skill)).forResult();
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
		aiShowTag: "defense",
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
		aiShowTag: "offense",
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
				const result = await player.chooseTarget(get.prompt2("zuowei"), lib.filter.notMe, (card, player, target) => target.countCards("he") > 0).forResult();
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
			await player.chooseToDebate([player].concat(joined)).set("callback", async (event, trigger, player) => {
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
		aiShowTag: "control",
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_chengong-gzyinpan（技能名：引叛），
	// 主体流程（选一名角色，所有与其势力不同的角色依次选择是否对其使用无距离次数限制的杀，结算后
	// 下回合杀的使用次数上限+X，若进入过濒死则回复1点体力）与本项目一致；官方X为"以此法受到的
	// 伤害次数"，本项目按卡面改为"以此法损失的体力值"，属数值定义上的卡面差异，保留。
	// 修复：判断"是否进入过濒死状态"，原实现用了game.getGlobalHistory("dying", ...)——但
	// globalHistory只记录cardMove/custom/useCard/changeHp/everything这几类，根本没有"dying"
	// 这个分类，取到的history是undefined，调用.filter直接崩溃。改用官方gzyinpan同款思路：
	// 濒死时机由引擎在damage事件本身打上event._dyinged标记（见content.ts里player.dying()
	// 调用前的赋值），改成对比"每次使用杀之前/之后victim被标记过_dyinged的伤害次数"是否变化。
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
			let everDying = false;
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
					const dyingBefore = victim.getHistory("damage", evt => evt._dyinged).length;
					await other.useCard(card, victim, false);
					const dyingAfter = victim.getHistory("damage", evt => evt._dyinged).length;
					if (dyingAfter > dyingBefore) {
						everDying = true;
					}
				}
			}
			if (everDying && victim.isIn()) {
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
		aiShowTag: "defense",
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
	// 排除: shenhua 包同名技能"恃才"（当你使用非装备牌结算结束后或成为自己使用装备牌的目标后，
	// 可将该牌置于牌堆顶再摸一张）效果完全不同，非参考。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_xuyou-gzshicai（技能名：侍才），效果
	// 一致（锁定技，受到伤害后：伤害值为1则摸牌，大于1则弃两张牌），仅官方摸1张/本项目摸两张
	// 的数值按卡面调整，核心逻辑复用官方结构。
	nzry_shicai: {
		aiShowTag: "defense",
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
	// 修复：本项目"阴阳鱼"是跨武将共享的通用计数标记（yinyang_mark，与陆绩nzry_huaiju/
	// 程普chunlao互通），原实现自建了一个独立的nzry_chenglve_mark展示标记技能，与其他角色的
	// 阴阳鱼标记不互通，现改为统一的player.addMark("yinyang_mark", ...)。
	// 成略：当与你势力相同的角色使用牌指定目标后，若此牌目标数大于1，你可以令其摸一张牌，然后若你
	// 也是此牌的目标之一，你可以令一名与你势力相同的角色获得一枚"阴阳鱼"标记。
	// 与 shenhua 包同名技能"成略"（转换技，出牌阶段限一次，摸牌后弃牌换取本回合特定花色无距离
	// 次数限制）效果完全不同，非参考；本效果为按卡面全新设计。
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
				const result = await player.chooseTarget("成略：是否令一名与你势力相同的角色获得一枚“阴阳鱼”标记？", (card, player, target) => player.isFriendOf(target), true).forResult();
				const target = result.targets && result.targets[0];
				if (target && target.isIn()) {
					target.addMark("yinyang_mark", 1, false);
				}
			}
		},
	},

	// ============ 士燮（shixie） ============
	// 避乱：锁定技，你拥有一个额外的装备栏，其可以装备任意副类别的装备牌。若你的装备区里有牌，
	// 其他角色计算与你的距离+2。（引擎不支持"单个可装任意副类别的栏位"，简化为五个副类别各+1个
	// 栏位）
	olbiluan: {
		aiShowTag: "defense",
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
		aiShowTag: "control",
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
	// 修复：原实现误将"被弃置牌的角色各摸一张牌"限定为只有弃置♠牌才摸牌，卡面原文并无花色
	// 限制，现改为无条件摸牌。
	// 除瘟：出牌阶段限一次，你可以选择一项：1.选择至多三名势力各不相同或未确定势力的其他角色，
	// 然后弃置你与这些角色各一张牌，被弃置牌的角色各摸一张牌；2.弃置一张手牌，然后令一名角色
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
					await cur.discard(cardResult.cards);
					if (cur.isIn()) {
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
		aiShowTag: "offense",
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
		aiShowTag: "offense",
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
	// 修复：代码原来固定摸1张，与translate.js描述的"X为本回合受到伤害的角色数+1，且至多为4"
	// 公式不符，属实现与卡面描述不一致的真bug。参考: skill_refer/sb/skill.js 的
	// sb_diaochan-sbbiyue（技能名同为"闭月"），描述几乎逐字一致（"Y为本回合包括已死亡角色在内
	// 受到过伤害的角色数+1且至多为4"），用官方的game.countPlayer2(...)写法（含已死亡角色）
	// 补全摸牌数公式。
	// 闭月：结束阶段，你摸X张牌（X为本回合受到伤害的角色数+1，且至多为4）。
	biyue: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		async content(event, trigger, player) {
			await player.draw(Math.min(4, game.countPlayer2(current => current.hasHistory("damage")) + 1));
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
	// 参考: translate.js的xueyi_info核对过卡面描述："当你造成伤害后，受伤角色可以明置一张
	// 武将牌"，"明置"指的是player.showCharacter/isUnseen那套明置暗置机制（真实可用，参考
	// 辛宪英zhongjian的用法），并非"翻面"（turnOver），此前把"明置"直接对应成"翻面"的
	// 改写是误判，现改用showCharacter实现。"你杀死同势力角色不执行奖惩"是国战身份局的
	// 奖惩机制，本项目未见对应系统，予以保留省略。
	// 血裔：锁定技，当你造成伤害后，受伤角色可以明置一张武将牌。
	xueyi: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return !!(event.player && event.player.isIn() && event.player.isUnseen(2));
		},
		async cost(event, trigger, player) {
			event.result = await trigger.player.chooseBool(get.prompt2("xueyi")).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (!target || !target.isIn()) {
				return;
			}
			const options = [];
			if (target.isUnseen(0)) {
				options.push("主将");
			}
			if (target.name2 && target.isUnseen(1)) {
				options.push("副将");
			}
			if (!options.length) {
				return;
			}
			let slot;
			if (options.length == 1) {
				slot = options[0] == "主将" ? 0 : 1;
			} else {
				const result = await target.chooseControl(options).set("prompt", get.prompt2("xueyi")).forResult();
				slot = result.control == "主将" ? 0 : 1;
			}
			await target.showCharacter(slot);
		},
	},

	// ============ 颜良&文丑（hb_yanliangwenchou） ============
	// 双雄：出牌阶段开始时，你可以令一名角色弃置一张牌，然后本回合你可以将与结果颜色不同的一张
	// 手牌当【决斗】使用。每回合限一次，当你因【决斗】受到伤害后，你可以获得此次【决斗】中另
	// 一方打出的【杀】。
	shuangxiong: {
		aiShowTag: "support",
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 fake_baoling（庞德"暴凌"，官方国战版
	// 用player.removeCharacter(1)移除副将）。经核实，主副将机制在本项目中真实可用，
	// player.changeCharacter([player.name1])可实现同等的"移除副将"效果，此前"本项目无
	// 副将机制而略去"的假设有误，现按translate.js描述补上"若你有副将，你可以移除之"；
	// 同时translate.js明确写有"并获得'崩坏'"，故"崩坏"不再作为董卓的初始技能（见
	// character.js），改为在此技能觉醒时通过addSkill授予。
	// 暴凌：限定技，出牌阶段，若你有副将，你可以移除之，然后增加3点体力上限，回复3点体力并
	// 获得"崩坏"。
	baoling: {
		aiShowTag: "recover",
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		filter(event, player) {
			return !!player.name2;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.changeCharacter([player.name1]);
			player.maxHp += 3;
			await player.recover(3);
			player.addSkill("benghuai");
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
		aiShowTag: "control",
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
		aiShowTag: "defense",
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
	// 参考: skill_refer/shenhua 包的 jianchu（audioname标注属于re_pangde，即庞德），guozhan
	// 里同key的jianchu是动态生成的fake技能无代码，但真实实现在shenhua这份"国战裸key对应到
	// 常规包"的典型情况。官方效果：使用杀指定目标后弃其一张牌，若为装备牌则此杀不可被闪响应，
	// 若非装备牌则该角色获得此杀；本项目按卡面只实现了"装备牌分支"，未实现"非装备牌→获得此
	// 杀"（卡面未提及，视为合理简化）。
	// 鞭出：当你使用【杀】指定目标后，你可以弃置该角色的一张牌，若弃置的牌为装备牌，其不能使用
	// 【闪】。（卡面未注明持续时长，按本回合内不能使用【闪】实现）
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
	// 役鬼：当你首次明置此武将牌后，你获得两张未加入游戏的武将牌作为"魂"牌；每种牌名每回合限一次，
	// 你可以移去一张"魂"牌，视为使用任意一张基本牌或普通锦囊牌，且目标必须为与此"魂"牌势力相同或
	// 未确定势力的角色。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_zuoci-fake_yigui（技能名：役鬼），
	// "魂"为真实武将牌（从_status.characterlist随机取出，用法同许劭sbyingmen"访客"的取用惯例），
	// chooseButton两级选择（先选魂再选虚拟卡名）结构照抄，官方按国战身份(identity/野心家)判断目标合法性，
	// 本项目改用势力(group)判断：目标势力与所选"魂"相同，或目标未明置(isUnseen(0)，"未确定势力")即合法。
	// 官方额外含濒死/无懈可击的专属分支，卡面描述未涉及，予以排除。
	yigui: {
		aiShowTag: "support",
		audio: 2,
		group: ["yigui_get", "yigui_use"],
		ai: {
			order: () => 1 + 10 * Math.random(),
			result: { player: 1 },
		},
	},
	yigui_get: {
		sourceSkill: "yigui",
		trigger: { player: "showCharacterAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!(event.toShow && event.toShow.includes("zuoci")) && player.storage.yigui_huns == null;
		},
		async content(event, trigger, player) {
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const characters = _status.characterlist.randomRemove(2);
			player.storage.yigui_huns = characters;
			if (characters.length) {
				game.log(player, "获得了两张“魂”牌：", "#y" + get.translation(characters));
			}
		},
	},
	yigui_use: {
		aiShowTag: "support",
		sourceSkill: "yigui",
		enable: "chooseToUse",
		hiddenCard(player, name) {
			if (!["basic", "trick"].includes(get.type(name))) {
				return false;
			}
			if ((player.storage.yigui_usednames || []).includes(name)) {
				return false;
			}
			return (player.storage.yigui_huns || []).length > 0;
		},
		filter(event, player) {
			if (event.type == "wuxie" || event.type == "respondShan") {
				return false;
			}
			const huns = player.storage.yigui_huns || [];
			if (!huns.length) {
				return false;
			}
			const used = player.storage.yigui_usednames || [];
			return get
				.inpileVCardList(info => {
					if (used.includes(info[2])) {
						return false;
					}
					return ["basic", "trick"].includes(info[0]);
				})
				.some(cardx => {
					const card = { name: cardx[2], nature: cardx[3] };
					if (!lib.filter.filterCard(card, player, event)) {
						return false;
					}
					if (event.filterCard && !event.filterCard(card, player, event)) {
						return false;
					}
					return huns.some(hun => {
						const group = get.character(hun).group;
						return game.hasPlayer(current => event.filterTarget(card, player, current) && (current == player || current.isUnseen(0) || current.group == group));
					});
				});
		},
		chooseButton: {
			select: 2,
			dialog(event, player) {
				const dialog = ui.create.dialog("役鬼", "hidden");
				dialog.add([player.storage.yigui_huns || [], "character"]);
				const used = player.storage.yigui_usednames || [];
				const list = get.inpileVCardList(info => {
					if (used.includes(info[2])) {
						return false;
					}
					return ["basic", "trick"].includes(info[0]);
				});
				dialog.add([list, "vcard"]);
				return dialog;
			},
			filter(button, player) {
				const evt = _status.event.getParent("chooseToUse");
				if (!ui.selected.buttons.length) {
					return typeof button.link == "string";
				}
				if (typeof ui.selected.buttons[0].link != "string") {
					return false;
				}
				if (typeof button.link != "object") {
					return false;
				}
				const name = button.link[2];
				const used = player.storage.yigui_usednames || [];
				if (used.includes(name)) {
					return false;
				}
				const card = { name, nature: button.link[3] };
				if (!lib.filter.filterCard(card, player, evt)) {
					return false;
				}
				if (evt.filterCard && !evt.filterCard(card, player, evt)) {
					return false;
				}
				const group = get.character(ui.selected.buttons[0].link).group;
				return game.hasPlayer(current => evt.filterTarget(card, player, current) && (current == player || current.isUnseen(0) || current.group == group));
			},
			check(button) {
				return 1 + Math.random();
			},
			backup(links, player) {
				const name = links[1][2],
					nature = links[1][3] || null;
				const character = links[0];
				const group = get.character(character).group;
				return {
					audio: "yigui",
					filterCard: () => false,
					selectCard: -1,
					popname: true,
					viewAs: { name: name, nature: nature, isCard: true },
					filterTarget(card, player, target) {
						if (!lib.filter.filterTarget(card, player, target)) {
							return false;
						}
						return target == player || target.isUnseen(0) || target.group == group;
					},
					onuse(result, player) {
						const huns = (player.storage.yigui_huns || []).slice();
						huns.remove(character);
						player.storage.yigui_huns = huns;
						if (!_status.characterlist) {
							game.initCharacterList();
						}
						_status.characterlist.add(character);
						game.log(player, "移去了一张", "#g“魂（" + get.translation(character) + "）”");
						const usedNames = (player.storage.yigui_usednames || []).slice();
						usedNames.add(name);
						player.storage.yigui_usednames = usedNames;
						if (!player.storage.yigui_reset_added) {
							player.storage.yigui_reset_added = true;
							player.when({ global: "phaseBefore" }).step(() => {
								delete player.storage.yigui_usednames;
								delete player.storage.yigui_reset_added;
							});
						}
					},
				};
			},
			prompt(links, player) {
				const name = links[1][2],
					character = links[0],
					nature = links[1][3];
				return "移去「" + get.translation(character) + "」并视为使用" + (get.translation(nature) || "") + get.translation(name);
			},
		},
		ai: {
			order: 6,
			result: { player: 1 },
		},
	},
	// 汲魂：当你受到伤害后，或与你势力相同的角色进入濒死状态被救回后，你可以将一张未加入游戏的武将牌
	// 扣置加入"魂"牌。
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
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const characters = _status.characterlist.randomRemove(1);
			if (!characters.length) {
				return;
			}
			const huns = (player.storage.yigui_huns || []).slice();
			huns.addArray(characters);
			player.storage.yigui_huns = huns;
			game.log(player, "获得了一张", "#y“魂（" + get.translation(characters) + "）”");
		},
	},

	// ============ 张角（zhangjiao） ============
	// 雷击：当你使用或打出【闪】时，你可以令一名其他角色判定：若为♠，你对其造成2点雷电伤害；
	// 若为♣，你回复1点体力，并对其造成1点雷电伤害。
	// 参考: skill_refer/sp2/_merged.md 的 releiji-releiji（技能名：雷击，界张角同名技能），效果一致，代码结构已吻合，仅加注释。
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
	// 参考: skill_refer/shenhua/_merged.md 的 zhangjiao-guidao（技能名：鬼道，旧张角），效果一致，代码结构已吻合，仅加注释。
	// 与 界张角(refresh包xinguidao)"鬼道"多出"打出黑桃2-9额外摸牌"效果不同，非参考。
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
			const cardResult = await player.chooseCard("h", true, "鬼道：选择要打出的黑色牌", card => get.color(card, player) == "black").forResult();
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
		ai: {
			rejudge: true,
			tag: { rejudge: 1 },
		},
	},
	// 黄天：锁定技，当【闪电】进入弃牌堆时，你获得之；当与你势力相同的角色使用【闪电】时，
	// 你可以视为发动一次"雷击"。
	// 原创技能，无官方参考（各包同名"黄天"均为主公技/道兵机制，与本卡"获得闪电+视为发动雷击"效果不同，已排除）
	huangtian: {
		aiShowTag: "response",
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
			return !!event.card && event.card.name == "shandian" && event.player != player && event.player.isFriendOf(player) && game.hasPlayer(current => current != event.player);
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
		aiShowTag: "response",
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
		aiShowTag: "control",
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
	// 雄异：限定技，出牌阶段，你可以令与你势力相同的所有角色各摸三张牌，然后若你不为大势力，
	// 你可以变更此将。
	// 经核实，主将变更机制（player.reinitCharacter/changeCharacter）在本项目中真实可用（用法同
	// 本文件qice_change的"从剩余武将牌堆随机取一名变更"写法），此前"涉及国战换将机制，简化省略"
	// 的做法有误，现补全"变更此将"效果：更换的是自己的主将（player.name1），随机取自剩余武将牌堆。
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
			if (!player.isIn()) {
				return;
			}
			const groupCount = {};
			game.filterPlayer().forEach(current => {
				groupCount[current.group] = (groupCount[current.group] || 0) + 1;
			});
			const maxCount = Math.max(0, ...Object.values(groupCount));
			if ((groupCount[player.group] || 0) >= maxCount) {
				return;
			}
			const result = await player.chooseBool(get.prompt("xiongyi"), "是否变更此武将牌？").forResult();
			if (!result.bool) {
				return;
			}
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const pool = _status.characterlist.filter(name => lib.character[name] && name != player.name1 && name != player.name2);
			if (!pool.length) {
				return;
			}
			const newName = pool.randomGet();
			await player.reinitCharacter(player.name1, newName);
		},
	},

	// ============ 孔融（kongrong） ============
	// 名士：锁定技，当你受到伤害时，若无伤害来源或伤害来源有暗置的武将牌，防止此伤害。你的武将牌
	// 无法被其他角色暗置或移除。你的手牌被其他角色获得时，改为弃置之。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_kongrong-gz_mingshi（技能名：名士），
	// 官方为"伤害-1"，卡面为"防止伤害"，已按卡面实现，源角色暗置判定沿用官方的isUnseen(2)写法。
	// "武将牌无法被其他角色暗置或移除"：引擎里hideCharacter/removeCharacter/changeCharacter都
	// 是普通的player方法调用，散落在各技能content里直接执行，没有统一的"是否允许对某玩家执行
	// 暗置/移除"的拦截mod点（这点和邹氏"祸水"里全面调查后确认"不能明置"也只能靠nomingzhi这个
	// AI标签、没有硬性规则拦截是一个道理）。退而求其次：全局监听hideCharacterAfter/
	// removeCharacterBefore/removeCharacterAfter，若目标是孔融本人，且用findExternalActor()
	// （见本文件顶部）能确认发起者是孔融以外的角色，则立刻复原——暗置就重新showCharacter()明置
	// 回去；移除则在removeCharacterBefore先记下被移除的武将名，removeCharacterAfter时用
	// player.changeCharacter()把武将牌换回来（changeCharacter是本项目已确认可用的安全API，
	// 不直接碰引擎内部的reinit/characterlist细节，风险更低）。这样实现的是"事实上不能被暗置/
	// 移除"，而不是真正阻止该动作发生（和yijue_lock、rehuoshui同样的思路）。
	// "手牌被其他角色获得时，改为弃置之"：引擎里"获得"(gain)有gainBefore这个可拦截的触发时机
	// （参考skill_refer_guozhan的gz_kongcheng技能：它在gainBefore里直接改写trigger.name/
	// trigger.setContent()把一次gain转成addToExpansion）。这里更简单，只需要在gainBefore时
	// 用trigger.cancel()跳过原本的获得流程（cancel()会让事件在Before之后直接进入Omitted/
	// finish，不会再执行gain的正式内容，验证见gameEvent.ts的loop()实现），然后改为孔融弃置
	// 这些牌。识别"这是孔融的手牌"用trigger.source==player（多数抓牌类技能如顺手牵羊/乐不思蜀
	// 会把被拿牌的一方作为gain()的source参数）或牌在孔融手上（get.owner+get.position兜底），
	// 无法覆盖"先弃到牌堆再从牌堆获得"这种不经过source的间接获得手法，这属于已知的覆盖盲区。
	zymingshi: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageBegin1" },
		forced: true,
		filter(event, player) {
			return !event.source || event.source.isUnseen(2);
		},
		content(event, trigger, player) {
			trigger.cancel();
		},
		group: ["zymingshi_guard", "zymingshi_gain"],
		subSkill: {
			guard: {
				charlotte: true,
				silent: true,
				trigger: { global: ["hideCharacterAfter", "removeCharacterBefore", "removeCharacterAfter"] },
				forced: true,
				filter(event, player, name) {
					if (event.player != player) {
						return false;
					}
					const actor = findExternalActor(event, player);
					return !!(actor && actor != player);
				},
				content(event, trigger, player) {
					if (event.triggername == "removeCharacterBefore") {
						player.storage.zymingshi_snapshot = player.storage.zymingshi_snapshot || {};
						player.storage.zymingshi_snapshot[trigger.num] = player["name" + (trigger.num + 1)];
						return;
					}
					if (event.triggername == "hideCharacterAfter") {
						if (trigger.num == 0 || trigger.num == 2) {
							player.showCharacter(0, false);
						}
						if (player.name2 && (trigger.num == 1 || trigger.num == 2)) {
							player.showCharacter(1, false);
						}
						return;
					}
					if (event.triggername == "removeCharacterAfter") {
						const snap = player.storage.zymingshi_snapshot;
						const savedName = snap && snap[trigger.num];
						if (savedName) {
							const pairs = [player.name1, player.name2].filter(Boolean);
							pairs[trigger.num] = savedName;
							delete snap[trigger.num];
							player.changeCharacter(pairs, false);
						}
					}
				},
			},
			gain: {
				charlotte: true,
				silent: true,
				trigger: { global: "gainBefore" },
				forced: true,
				filter(event, player) {
					if (!event.player || event.player == player || !event.cards || !event.cards.length) {
						return false;
					}
					if (event.source == player) {
						return true;
					}
					return event.cards.every(card => get.owner(card) == player && get.position(card) == "h");
				},
				async content(event, trigger, player) {
					trigger.cancel();
					const cards = trigger.cards.filter(card => get.owner(card) == player && get.position(card) == "h");
					if (cards.length) {
						await player.discard(cards);
					}
				},
			},
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return;
					}
					if (!player.isUnseen(2)) {
						return;
					}
					var num = get.tag(card, "damage");
					if (num) {
						if (num > 1) {
							return 0.5;
						}
						return 0;
					}
				},
			},
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
		aiShowTag: "control",
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
				const pickResult = await player.chooseTarget(get.prompt2("shuangren"), (card, plyr, tgt) => candidates.includes(tgt), true).forResult();
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
			return !!event.card && event.card.name == "sha" && event.player && event.player.isIn() && player.countCards("h") > 0 && game.hasPlayer(current => current != event.player && get.distance(event.player, current) == 1);
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
			const targetResult = await player.chooseTarget(get.prompt2("sijian"), (card, plyr, target) => target != player && target.countDiscardableCards(player, "he") > 0, true).forResult();
			const target = targetResult.targets && targetResult.targets[0];
			if (target) {
				await player.discardPlayerCard(target, "he", true);
			}
		},
	},
	// 随势：锁定技，当其他角色受到伤害进入濒死状态时，若伤害来源与你势力相同，你摸一张牌；当其他角色
	// 死亡时，若其与你势力相同，你选择失去1点体力或弃置所有手牌。
	gzsuishi: {
		aiShowTag: "draw",
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
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_huoshui（邹氏"祸水"）。经核实，
	// 明置/暗置（player.hideCharacter/isUnseen）机制在本项目中真实可用（见辛宪英zhongjian
	// 等技能），此前"本项目不使用主副将机制，故省略"的假设有误。
	// 现按translate.js的rehuoshui_info补上"势力与你不同且有暗置的武将牌的角色于你回合内
	// 不能使用或打出【闪】响应你的牌"的硬性规则（此前只有ai.norespond提示，没有真正的
	// 规则限制），用global mod实现，参考wansha(贾诩"完杀")的mod写法。
	// "其他角色不能明置武将牌"部分：核实官方gz_huoshui的实现后发现，官方对这部分也不是靠
	// 拦截player.showCharacter强制实现的——而是用nomingzhi+skillTagFilter这个引擎级AI标签，
	// 让AI在你回合内不要主动明置。真人玩家依然可以选择明置（规则上就是"建议不要"而非"不能"），
	// 现按官方同款写法补上这部分（nomingzhi是引擎核心ai标签，非国战模式专属，可安全使用）。
	rehuoshui: {
		aiShowTag: "control",
		audio: 2,
		locked: true,
		global: "rehuoshui_block",
		ai: {
			norespond: true,
			nomingzhi: true,
			skillTagFilter(player, tag, arg) {
				if (tag == "nomingzhi") {
					return !!(_status.currentPhase && _status.currentPhase != player && _status.currentPhase.hasSkill("rehuoshui"));
				}
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
	rehuoshui_block: {
		charlotte: true,
		mod: {
			cardEnabled2(card, player) {
				if (get.name(card) != "shan") {
					return;
				}
				const phasePlayer = _status.currentPhase;
				if (!phasePlayer || !phasePlayer.isIn() || phasePlayer == player || !phasePlayer.hasSkill("rehuoshui")) {
					return;
				}
				if (!player.isEnemyOf(phasePlayer) || !player.isUnseen(2)) {
					return;
				}
				return false;
			},
			cardRespondable(card, player) {
				// 卡面限定为"响应你的牌"，需精确判断当前正在响应的牌的使用者是否为祸水拥有者，
				// 而不能只用"是否在其回合内"来近似（该回合内理论上也可能出现由其他角色使用/
				// 视为使用的需要响应闪的牌，如某些技能允许非当前回合角色使用【杀】）。
				if (get.name(card) != "shan") {
					return;
				}
				const evt = _status.event;
				if (!evt || evt.name != "chooseToRespond") {
					return;
				}
				const source = evt.getParent && evt.getParent().player;
				if (!source || source == player || !source.isIn() || !source.hasSkill("rehuoshui")) {
					return;
				}
				const phasePlayer = _status.currentPhase;
				if (!phasePlayer || phasePlayer != source) {
					return;
				}
				if (!player.isEnemyOf(source) || !player.isUnseen(2)) {
					return;
				}
				return false;
			},
		},
	},
	// 倾城：出牌阶段，你可以弃置一张黑色牌，暗置一名其他角色的一张武将牌。若你弃置的是装备牌，
	// 你可以再暗置一名其他角色的一张武将牌。
	// 修复: 原实现与卡面完全不符——原代码是"令一名其他角色本回合不能使用/打出【闪】"，而
	// translate.js里"倾城"实际是"暗置一名其他角色的一张武将牌"（装备牌可再暗置一名），是完全
	// 不同的效果（此前只顾着修"祸水"里的暗置判定，这个技能被漏掉了）。现用本项目已确认可用的
	// player.hideCharacter(slot)/isUnseen(slot)机制重写，选择武将牌的写法参考jinxian(近谀)的
	// chooseControl("主将","副将")实现。排除: gz_huoshui本身没有"倾城"这个技能。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_zoushi-gz_qingcheng（技能名：倾城，
	// 归属邹氏而非huoshui，此前只查了huoshui这一个角色，遗漏了直接以技能名搜索），效果几乎
	// 完全一致："弃一张黑色牌，暗置一名其他角色的武将牌；若弃的是装备牌可再暗置一名角色的
	// 武将牌"。官方版额外要求目标须"武将牌均明置"才能选中，本项目按卡面未写明此限制，未实现。
	reqingcheng: {
		aiShowTag: "control",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		filterCard(card, player) {
			return get.color(card) == "black";
		},
		position: "he",
		selectCard: 1,
		discard: true,
		lose: true,
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			const slots = target.name2 ? [0, 1] : [0];
			return slots.some(slot => !target.isUnseen(slot));
		},
		check(card) {
			return 5 - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			const isEquip = cards.some(card => get.type(card) == "equip");
			const hideOne = async to => {
				if (!to || !to.isIn()) {
					return;
				}
				const slots = to.name2 ? [0, 1] : [0];
				const available = slots.filter(slot => !to.isUnseen(slot));
				if (!available.length) {
					return;
				}
				let slot = available[0];
				if (available.length > 1) {
					const result = await player
						.chooseControl("主将", "副将")
						.set("prompt", "倾城：请选择暗置" + get.translation(to) + "的哪张武将牌")
						.forResult();
					slot = result.control == "主将" ? 0 : 1;
				}
				await to.hideCharacter(slot);
			};
			await hideOne(target);
			if (isEquip) {
				const candidates = game.filterPlayer(current => {
					if (current == player) {
						return false;
					}
					const slots = current.name2 ? [0, 1] : [0];
					return slots.some(slot => !current.isUnseen(slot));
				});
				if (candidates.length) {
					const result2 = await player
						.chooseTarget("倾城：是否再暗置一名其他角色的一张武将牌？", (card, player, to) => get.event().candidates.includes(to))
						.set("candidates", candidates)
						.forResult();
					if (result2 && result2.bool && result2.targets && result2.targets.length) {
						await hideOne(result2.targets[0]);
					}
				}
			}
		},
	},

	// ============ 华雄（huaxiong） ============
	// 耀武：锁定技，你受到【杀】的伤害时，红色则伤害来源摸牌，否则你自己摸牌。
	yaowu: {
		aiShowTag: "draw",
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
	// 参考: translate.js的hwyangwei_info核对过卡面描述："当你首次明置此武将牌时"触发。经
	// 核实，明置机制（player.showCharacter/isUnseen及showCharacterAfter触发时机）在本
	// 项目中真实可用（参考辛宪英xianfu的用法），此前"本项目不使用武将牌明置/暗置机制"的
	// 假设有误，现改回按首次明置触发（限定技本身保证只结算一次，不需要额外的已用标记）。
	// 扬威：限定技，当你首次明置此武将牌时，你可以摸两张牌、体力上限+2并回复2点体力，
	// 然后其他角色依次可对你使用一张无距离限制的【杀】。
	hwyangwei: {
		aiShowTag: "response",
		limited: true,
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			return !!(event.toShow && event.toShow.includes(player.name1));
		},
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
				const result = await other.chooseCard("h", card => get.name(card) == "sha", `扬威：是否对${get.translation(player)}使用一张无距离限制的【杀】？`).forResult();
				if (!result.bool || !result.cards?.length) {
					continue;
				}
				await other.useCard(result.cards[0], player, false);
			}
		},
	},

	// ============ 何太后（hetaihou） ============
	// 鸩毒：一名角色的出牌阶段开始时，你可以弃置一张手牌，令其视为使用一张【酒】。若其不为你，
	// 你对其造成1点伤害。
	// 修正：此前用自造的"下次杀伤害+1"临时技能近似模拟"酒"效果，不是真正的"视为使用"，现改为
	// 调用player.useCard真正虚拟使用一张【酒】（酒不需要指定目标，效果和联动都走引擎原生逻辑）。
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
				const card = { name: "jiu", isCard: true };
				if (target.canUse(card, target, false)) {
					await target.useCard(card, target, false);
				}
			}
		},
	},
	// 戚乱：每当一名角色回合结束时，你可以摸X张牌（X为此回合内死亡角色数），若你于此回合内杀死过角色则额外摸两张。
	qiluan: {
		aiShowTag: "draw",
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
		aiShowTag: "support",
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
			const targetResult = await player.chooseTarget(get.prompt2("xiongsuan"), (card, player, target) => target.isFriendOf(player)).forResult();
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
			const targetResult = await player.chooseTarget(get.prompt2("sclfudi"), (card, plyr, tgt) => targets.includes(tgt), true).forResult();
			const target = targetResult.targets && targetResult.targets[0];
			if (target && target.isIn()) {
				await target.damage(1, player);
			}
		},
	},
	// 从谏：锁定技，你于回合外造成的伤害+1，你于回合内受到的伤害+1。
	sclcongjian: {
		aiShowTag: "offense",
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
	// 参考: translate.js的chuanxin_info核对过卡面描述，确为"移除副将"效果（非"摸两张牌"）。
	// 经核实，主副将机制在本项目中真实可用，player.changeCharacter([player.name1])可实现
	// "移除副将"（只保留主将），此前"本项目无副将机制"的假设有误，现按描述改正：
	// 触发条件补上"且有副将"，第二个选项改为移除副将。
	// 穿心：出牌阶段，你使用【杀】/【决斗】对势力不同且有副将的角色造成伤害时，可防止此
	// 伤害，然后其选择一项：弃装备区所有牌并失1点体力；或移除副将。
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
			return !!event.player.name2;
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
			const choice = await target.chooseControl(["弃装备失体力", "移除副将"]).set("prompt", get.prompt2("chuanxin")).forResult();
			if (choice.control == "弃装备失体力") {
				if (target.countCards("e")) {
					await target.discard(target.getCards("e"));
				}
				if (target.isIn()) {
					await target.loseHp();
				}
			} else if (target.isIn() && target.name2) {
				await target.changeCharacter([target.name1]);
			}
		},
	},
	// 锋矢：阵法技，在同一个围攻关系中，若你是围攻角色，则你或另一名围攻角色使用【杀】指定被围攻
	// 角色为目标后，可以选择：1.令该角色弃置装备区里的一张牌。2.本回合锁定技失效。
	// 修正：此前完全没有实现"阵法技/围攻"效果，是与卡面无关的另一个简化技能（自己出杀单目标摸牌+
	// 弃备），现改为真正的围攻(siege)阵法判定，siege()/sieged()机制沿用本文件吴景diaogui已
	// 确认可用的写法。
	zfengshi: {
		aiShowTag: "control",
		audio: 2,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			if (get.name(event.card) != "sha" || !event.targets || event.targets.length != 1) {
				return false;
			}
			const target = event.targets[0];
			if (!target.isIn() || !target.sieged()) {
				return false;
			}
			if (!player.siege(target)) {
				return false;
			}
			return event.player.siege(target);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zfengshi")).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.targets[0];
			if (!target.isIn()) {
				return;
			}
			const choice = await player.chooseControl(["弃置装备区里的一张牌", "本回合锁定技失效"]).set("prompt", get.prompt2("zfengshi")).forResult();
			if (choice.control == "弃置装备区里的一张牌") {
				if (target.isIn() && target.countCards("e")) {
					await target.chooseToDiscard("e", 1, true).forResult();
				}
			} else if (target.isIn()) {
				const skills = target.getSkills(null, false).filter(skill => get.is.locked(skill, target));
				if (skills.length) {
					target.disableSkill("zfengshi_lock", skills);
					target.addTempSkill("zfengshi_lock_reset", "phaseAfter");
				}
			}
		},
	},
	zfengshi_lock_reset: {
		charlotte: true,
		trigger: { player: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.enableSkill("zfengshi_lock");
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
			event.result = await player.chooseToDiscard("h", true, [1, Infinity]).set("prompt2", get.prompt2("jsrgzhaobing")).forResult();
		},
		async content(event, trigger, player) {
			const { result } = event;
			const num = result && result.cards ? result.cards.length : 0;
			if (!num) {
				return;
			}
			const others = game.filterPlayer(current => current != player);
			if (!others.length) {
				return;
			}
			const targetResult = await player.chooseTarget([1, Math.min(num, others.length)], get.prompt2("jsrgzhaobing"), (card, plyr, tgt) => tgt != plyr).forResult();
			const targets = (targetResult.targets || []).slice(0, num);
			for (const target of targets) {
				if (!target.isIn()) {
					continue;
				}
				const shaCards = target.getCards("h", card => get.name(card) == "sha");
				const control = shaCards.length ? await target.chooseControl(["交出【杀】", "失去1点体力"]).set("prompt", get.prompt2("jsrgzhaobing")).forResult() : { control: "失去1点体力" };
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
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "dieAfter" },
		forced: true,
		content(event, trigger, player) {
			game.addGlobalSkill("jsrg_hejin_yanhuo_global");
		},
	},
	jsrg_hejin_yanhuo_global: {
		charlotte: true,
		trigger: { global: "damageBegin1" },
		forced: true,
		popup: false,
		filter(event, player) {
			return get.name(event.card) == "sha";
		},
		content(event, trigger, player) {
			trigger.num++;
		},
	},

	// ============ 韩遂（re_hansui） ============
	// 逆乱：出牌阶段，你可以将一张黑色牌当【杀】使用。若此【杀】未造成过伤害，则不计入次数。
	// 补全："若此【杀】未造成过伤害，则不计入次数"此前完全没有实现，现补上：用一枚待处理标记
	// 记录本次视为使用是否造成过伤害，未造成伤害则仿照本文件zhuiming"不计入次数限制"分支的
	// 写法（event.addCount=false并回退stat计数）事后撤销这次使用计数。
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
		onuse(result, player) {
			player.storage.spniluan_pending = true;
		},
		group: ["spniluan_mark", "spniluan_nocount"],
	},
	spniluan_mark: {
		sourceSkill: "spniluan",
		charlotte: true,
		trigger: { source: "damageSource" },
		silent: true,
		forced: true,
		popup: false,
		filter(event, player) {
			return !!player.storage.spniluan_pending && get.name(event.card) == "sha";
		},
		content(event, trigger, player) {
			player.storage.spniluan_damaged = true;
		},
	},
	spniluan_nocount: {
		sourceSkill: "spniluan",
		charlotte: true,
		trigger: { global: "useCardAfter" },
		silent: true,
		forced: true,
		popup: false,
		filter(event, player) {
			return event.player == player && !!player.storage.spniluan_pending;
		},
		content(event, trigger, player) {
			if (!player.storage.spniluan_damaged && trigger.addCount !== false) {
				trigger.addCount = false;
				const stat = player.getStat().card;
				if (typeof stat[trigger.card.name] == "number") {
					stat[trigger.card.name]--;
				}
			}
			delete player.storage.spniluan_pending;
			delete player.storage.spniluan_damaged;
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
	// 迅析：其他角色于其回合外明置武将时，你可以视为对其使用一张无距离数量限制的【杀】。
	// 修正：此前触发时机写成了"其他角色回合外受到伤害后"，与卡面"回合外明置武将"完全不同，
	// 已按showCharacterAfter改正；"无距离数量限制"沿用本文件陈宫yinpan的canUse/useCard(...,false)写法。
	gsxunxi: {
		aiShowTag: "response",
		audio: 2,
		trigger: { global: "showCharacterAfter" },
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
	// 摄甲：锁定技，每回合各限一次，当你成为【杀】的目标后/使用【杀】指定唯一目标后，若你的装备区
	// 没有防具牌/武器牌，则你本回合视为装备着使用者的防具牌/目标角色的武器牌。
	// 修正：此前完全是另一套自造效果（受杀伤害-1摸牌/造成杀伤害后摸牌），与卡面"借防具/借武器"
	// 毫无关系，已重写。"借武器"部分（借来的武器只影响攻击距离）沿用本文件朱治xinanguo_share里
	// 已确认可行的attackRange+getEquipRange写法。
	// "视为装备着使用者的防具牌"：查过card/standard.js的bagua（八卦阵，skills:["bagua_skill"]）
	// 和card/extra.js的tengjia（藤甲，skills:["tengjia1","tengjia2","tengjia3"]）后发现，本项目
	// 的防具效果都是通过给持有者"附加技能"(equipSkill)实现的，而不是散落在别处的mod——也就是说
	// "借用某名角色的防具效果"等价于"临时获得那张防具牌skills数组里列出的技能"，不需要针对
	// 每种防具各写一遍判定逻辑，直接对着被借防具的card.skills逐个addTempSkill即可通用覆盖藤甲/
	// 八卦阵，以及本项目未来新增的、同样走skills机制的防具。经检索本项目未收录"仁王盾"这张牌
	// （card目录下的standard.js/extra.js/guozhan.js/sp.js/xianxia.js/yingbian.js/yongjian.js/
	// zhulu.js均未定义renwangdun），故未覆盖；若以后引入了不通过skills字段实现效果的防具（比如
	// 直接写死在mod.cardEnabled2等全局钩子里、不挂在equip卡牌skills数组上的写法），本方案也无法
	// 覆盖，需要另外针对该防具补充判断分支。
	gsshejia: {
		aiShowTag: "support",
		audio: 2,
		group: ["gsshejia_armor", "gsshejia_weapon", "gsshejia_reset", "gsshejia_share", "gsshejia_clear"],
	},
	gsshejia_clear: {
		sourceSkill: "gsshejia",
		charlotte: true,
		trigger: { global: "phaseAfter" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			delete player.storage.gsshejia_armor_source;
			delete player.storage.gsshejia_weapon_source;
			delete player.storage.gsshejia_armor_skills;
		},
	},
	gsshejia_armor: {
		sourceSkill: "gsshejia",
		charlotte: true,
		trigger: { player: "useCardToTargeted" },
		filter(event, player) {
			return get.name(event.card) == "sha" && !player.storage.gsshejia_armor_used && !player.getEquip(2) && event.player && event.player != player && event.targets && event.targets.includes(player) && event.player.getEquip(2);
		},
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.gsshejia_armor_used = true;
			const source = trigger.player;
			player.storage.gsshejia_armor_source = source.playerid;
			const armor = source.getEquip(2);
			const skills = (armor && get.info(armor).skills) || [];
			player.storage.gsshejia_armor_skills = skills.slice();
			for (const skillname of skills) {
				player.addTempSkill(skillname, { player: "phaseAfter" });
			}
		},
	},
	gsshejia_weapon: {
		sourceSkill: "gsshejia",
		charlotte: true,
		trigger: { player: "useCardToTargeted" },
		filter(event, player) {
			return get.name(event.card) == "sha" && !player.storage.gsshejia_weapon_used && !player.getEquip(1) && event.targets && event.targets.length == 1 && event.targets[0] != player && event.targets[0].getEquip(1);
		},
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.gsshejia_weapon_used = true;
			player.storage.gsshejia_weapon_source = trigger.targets[0].playerid;
		},
	},
	gsshejia_share: {
		charlotte: true,
		mod: {
			attackRange(player, num) {
				const id = player.storage.gsshejia_weapon_source;
				if (!id) {
					return;
				}
				const source = game.filterPlayer(cur => cur.playerid == id)[0];
				const weapon = source && source.isIn() && source.getEquip(1);
				if (weapon) {
					return Math.max(num, source.getEquipRange([weapon]));
				}
			},
		},
	},
	gsshejia_reset: {
		sourceSkill: "gsshejia",
		charlotte: true,
		trigger: { global: "roundStart" },
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.gsshejia_armor_used = false;
			player.storage.gsshejia_weapon_used = false;
			delete player.storage.gsshejia_armor_source;
			delete player.storage.gsshejia_weapon_source;
			delete player.storage.gsshejia_armor_skills;
		},
	},
	// 禁酒：锁定技，你的【酒】只能当【杀】使用或打出；其他角色于你的回合内不能使用【酒】。
	// 参考: translate.js的jinjiu_info核对后确认这个效果范围只针对技能拥有者自己的【酒】
	// （"你的【酒】"），与skill_refer/sb/_merged.md的sbjinjiu所继承的rejinjiu（源自
	// skill_refer/refresh/skill.js）完全一致，官方就是这么写的："你的酒只能当杀用"是用
	// mod.cardname(card,player){ if(card.name=="jiu") return "sha"; }这个引擎钩子把【酒】的
	// 有效牌名直接改写成"sha"实现的（mod只对技能拥有者自己生效，天然满足"你的"这个范围限定，
	// 不需要额外挡住"按原样使用酒"的入口——因为一旦cardname被改写，可以使用/打出的判定与结算
	// 都会按【杀】处理，原本的"酒"用法就已经不存在了）。"其他角色于你的回合内不能使用【酒】"
	// 部分改用rejinjiu3同款的mod.cardEnabled/cardSavable写法（通过global挂到jinjiu_block，
	// 对所有角色生效，而不是只在自己使用/打出时才拦截取消，判定时机更早也更彻底）。
	jinjiu: {
		aiShowTag: "control",
		audio: 2,
		locked: true,
		mod: {
			cardname(card, player) {
				if (card.name == "jiu") {
					return "sha";
				}
			},
		},
		global: "jinjiu_block",
	},
	jinjiu_block: {
		charlotte: true,
		mod: {
			cardEnabled(card, player) {
				if (card.name == "jiu" && _status.currentPhase && _status.currentPhase != player && _status.currentPhase.hasSkill("jinjiu")) {
					return false;
				}
			},
			cardSavable(card, player) {
				if (card.name == "jiu" && _status.currentPhase && _status.currentPhase != player && _status.currentPhase.hasSkill("jinjiu")) {
					return false;
				}
			},
		},
	},

	// ============ 刘表（jsrg_liubiao） ============
	// 宴殺：准备阶段，你可以视为使用一张以任意名角色为目标的【五谷丰登】，结算后所有非目标角色
	// 依次可以将一张装备牌当【杀】对其中一名目标角色使用（无距离限制）。
	// 修正：此前只能选择单个目标（不符合"任意名角色"可多选的卡面描述），已改为chooseTarget多选，
	// 装备当杀的目标改为从"目标角色"集合中选一个（沿用complexTarget的思路）。
	jsrgyansha: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget([1, Math.max(1, game.countPlayer() - 1)], get.prompt2("jsrgyansha"), (card, player, target) => target != player)
				.set("ai", target => get.attitude(player, target))
				.forResult();
		},
		async content(event, trigger, player) {
			const targets = (event.targets || []).filter(t => t.isIn());
			if (!targets.length) {
				return;
			}
			const card = { name: "wugufengdeng", isCard: true };
			if (player.canUse(card, targets, false)) {
				await player.useCard(card, targets, false);
			}
			const alive = targets.filter(t => t.isIn());
			if (!alive.length) {
				return;
			}
			const others = game.filterPlayer(current => !targets.includes(current));
			for (const other of others) {
				const stillAlive = alive.filter(t => t.isIn());
				if (!stillAlive.length) {
					break;
				}
				await other.chooseToUse({
					prompt: `宴殺：是否将一张装备牌当【杀】对其中一名目标角色使用（无距离限制）？`,
					filterCard(card) {
						return get.type(card) == "equip";
					},
					viewAs: { name: "sha" },
					complexTarget: true,
					filterTarget(card, player, target2) {
						return stillAlive.includes(target2);
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
			event.result = await player.chooseTarget(get.prompt2("qiuyuan"), (card, player, target) => target != player && target != trigger.player).forResult();
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
	// 窃聽：其他角色的回合结束时，若其有未明置武将或未于此回合内对除其外的角色使用过牌，你可以
	// 选择一项：1.将其装备区里的一张牌置入你的装备区；2.摸一张牌。
	// 修正：此前只判断了"未对其他角色使用过牌"，遗漏了"有未明置武将"这一并列条件（or），已补上；
	// 另外"置入你的装备区"此前用gain把牌放进手牌，改为player.equip(card)真正移入装备区
	// （沿用本文件宫辑gongji的player.equip写法）。
	qieting: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			if (event.player == player) {
				return false;
			}
			if (event.player.isUnseen(0) || event.player.isUnseen(1)) {
				return true;
			}
			return !event.player.getHistory("useCard", evt => evt.targets && evt.targets.some(target => target != event.player)).length;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const result = await player.chooseControl("获得装备", "摸一张牌").set("prompt", get.prompt2("qieting", trigger.player)).forResult();
			if (result.control == "获得装备" && target.getEquips().length) {
				const cardResult = await player.choosePlayerCard(target, "e", true).forResult();
				if (cardResult.cards && cardResult.cards.length) {
					const card = cardResult.cards[0];
					await target.give(card, player);
					if (player.isIn() && get.type(card) == "equip") {
						await player.equip(card);
					}
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
				const targets = await target.chooseTarget(true, [1, x], (card, plyr, tgt) => get.distance(target, tgt) <= target.getAttackRange()).forResult();
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
		aiShowTag: "recover",
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
			const result = await player.chooseTarget(true, `密詔：请选择一名角色与${get.translation(carrier)}拼点`, (card, plyr, target) => target != player && target != carrier).forResult();
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
	// 布施：当你受到1点伤害后，你可以令一名同势力角色获得一张"米"；当你对其他角色造成伤害后，
	// 你令与其势力相同的一名角色获得一张"米"。
	// 修正：此前无论哪种触发都无差别地把新摸的牌放进"自己"的米堆，既没有区分两个分支各自应
	// 归属的势力，也没有让玩家选择具体获得的角色（卡面写的是"令一名同势力角色/其势力相同的
	// 一名角色"，暗示可选择），现补上按分支选择目标势力范围内角色的逻辑。
	bushi: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "damageEnd", source: "damageSource" },
		filter(event, player, name) {
			if (name == "damageSource") {
				return event.player != player && event.player.isIn() && game.hasPlayer(current => current.isFriendOf(event.player));
			}
			if (event.num <= 0) {
				return false;
			}
			return game.hasPlayer(current => current.isFriendOf(player));
		},
		async cost(event, trigger, player, name) {
			event.result = await player.chooseBool(get.prompt2("bushi")).forResult();
		},
		async content(event, trigger, player, name) {
			const isSource = name == "damageSource";
			const base = isSource ? trigger.player : player;
			const candidates = game.filterPlayer(current => current.isFriendOf(base));
			if (!candidates.length) {
				return;
			}
			const targetResult = await player.chooseTarget(get.prompt2("bushi"), (card, plyr, tgt) => candidates.includes(tgt), true).forResult();
			const target = targetResult.targets && targetResult.targets[0];
			if (!target || !target.isIn()) {
				return;
			}
			const cards = get.cards(1);
			if (cards && cards.length) {
				await player.addToExpansion({ cards, source: target, gaintag: ["zhanglu_mi"], animate: "gain2" });
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
			event.result = await player.chooseTarget(get.prompt2("zhidao"), (card, player, target) => target != player).forResult();
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
			if (target.isIn() && target.countCards("hej")) {
				const result = await player.choosePlayerCard(target, "hej", true).forResult();
				if (result.cards && result.cards.length) {
					await player.gain(result.cards, target, "give");
				}
			}
		},
		onremove(player) {
			delete player.storage.zhidao_target;
		},
	},
	// 寄篱：当你成为红色基本牌或红色普通锦囊牌的唯一目标后，你可以令此牌结算执行两次。当你于任意
	// 一个阶段内受到第二次伤害时，你可以防止此伤害，然后变更该武将牌。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 提到的gzyjili（技能名"寄篱"），完整代码（含
	// 官方合并文档未收录的gzyjili2定义）在scratchpad/noname_official_kept/apps/core/mode/
	// guozhan/src/skill/character/rest.js里找到。"结算执行两次"官方并不是真的让原来那张牌重新
	// 结算一次，而是：useCardToTargeted时把自己记录到trigger.getParent()（这张牌的useCard
	// 事件）的一个数组上，再由一个监听全局useCardAfter的子技能(gzyjili2)在这张牌结算完成后，
	// 让使用者对疾疠拥有者"视为使用"一张牌名和属性都相同的新牌。用户确认国战官方版本一致，可以
	// 完全照搬，故直接照抄这个思路重写，删除了此前"按桃/杀/其他分别摸牌"的硬编码近似实现。
	jili: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		group: ["jili_reset", "jili_counter", "jili_prevent", "jili_virtual"],
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
		content(event, trigger, player) {
			const evt = trigger.getParent();
			if (!evt.jili) {
				evt.jili = [];
			}
			evt.jili.add(player);
		},
	},
	// 寄篱辅助：当使用者对疾疠拥有者使用过的一张红色基本/普通锦囊牌结算完成后（即上方jili记录的
	// 这张useCard事件结束时），令使用者对疾疠拥有者视为使用一张牌名和属性都相同的新牌，实现"结算
	// 执行两次"的效果。写法与官方gzyjili2完全一致。
	jili_virtual: {
		charlotte: true,
		trigger: { global: "useCardAfter" },
		popup: false,
		forced: true,
		filter(event, player) {
			return event.jili && event.jili.includes(player) && !event.addedTarget && event.player && event.player.isAlive() && event.player.canUse({ name: event.card.name, nature: event.card.nature, isCard: true }, player);
		},
		async content(event, trigger, player) {
			await trigger.player.useCard({ name: trigger.card.name, nature: trigger.card.nature, isCard: true }, player, false);
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
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const pool = _status.characterlist.filter(name => lib.character[name] && name != player.name1 && name != player.name2);
			if (pool.length) {
				const newName = pool.randomGet();
				await player.reinitCharacter(player.name1, newName);
			}
		},
	},

	// ============ 皇甫嵩（std_huangfusong） ============
	// 觀火：出牌阶段，你可以视为使用一张【火攻】，当此牌结算结束后，若此牌未造成伤害且你于此阶段：
	// 第一次发动此技能，此阶段你使用【火攻】造成的伤害+1；不为第一次发动此技能，你失去此技能。
	// 修正：此前手动重写了一遍"火攻"的展示弃牌/造成伤害逻辑，不是真正的"视为使用"（会漏掉
	// 无懈可击等对使用锦囊牌的联动判定），改为player.useCard真正虚拟使用【火攻】，是否造成过
	// 伤害通过damageSource时机打标记来判断（写法同本文件何进jsrgyanhuo的num++思路）。
	guanhuo: {
		aiShowTag: "offense",
		aiShowCost: true,
		audio: 2,
		enable: "phaseUse",
		group: ["guanhuo_reset", "guanhuo_mark", "guanhuo_bonus"],
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const card = { name: "huogong", isCard: true };
			if (!player.canUse(card, target, false)) {
				return;
			}
			player.storage.guanhuo_pending = true;
			player.storage.guanhuo_damaged = false;
			await player.useCard(card, target, false);
			delete player.storage.guanhuo_pending;
			const noDamage = !player.storage.guanhuo_damaged;
			delete player.storage.guanhuo_damaged;
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
	guanhuo_mark: {
		sourceSkill: "guanhuo",
		charlotte: true,
		trigger: { source: "damageSource" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!player.storage.guanhuo_pending && get.name(event.card) == "huogong";
		},
		content(event, trigger, player) {
			player.storage.guanhuo_damaged = true;
		},
	},
	guanhuo_bonus: {
		sourceSkill: "guanhuo",
		charlotte: true,
		trigger: { global: "damageBegin1" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!player.storage.guanhuo_bonus && event.source == player && get.name(event.card) == "huogong";
		},
		content(event, trigger, player) {
			trigger.num++;
		},
	},
	guanhuo_reset: {
		sourceSkill: "guanhuo",
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
		aiShowTag: "support",
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
		aiShowTag: "defense",
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
			const result = await player.chooseTarget(true, "揖讓：请选择一名角色交给其非基本牌", (card, plyr, target) => target != player).forResult();
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
		aiShowTag: "control",
		audio: "fuqi",
		forced: true,
		trigger: { player: "useCard" },
		filter(event, player) {
			return !!(event.card && (event.card.name == "sha" || get.type(event.card) == "trick") && game.hasPlayer(current => current != player && get.distance(current, player) <= 1));
		},
		content(event, trigger, player) {
			trigger.directHit.addArray(game.filterPlayer(current => current != player && get.distance(current, player) <= 1));
		},
	},
	// 骄恣：锁定技，当你造成或受到伤害时，若你的手牌数是全场最多，伤害来源可以获得受伤角色一张牌。
	jiaozi: {
		aiShowTag: "support",
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
		aiShowTag: "support",
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
		aiShowTag: "defense",
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
	// 盈门：锁定技，你首次明置此武将牌时，你在剩余武将牌堆中将四张武将牌置于你的武将牌上，
	// 称为"访客"；当你受到或造成伤害后，你获得一张"访客"；回合开始前，你可以移去任意张
	// "访客"，然后从剩余武将牌堆将"访客"补至四张。
	// 参考: skill_refer/jsrg/_merged.md 的 jsrg_xushao-sbyingmen（技能名：盈门）/sbpingjian
	// （技能名：评鉴）。访客机制（characterlist随机取放、getSkills/addVisitors/removeVisitors、
	// skillBlocker与"锁定技标签"技能过滤）与官方一致，直接复用；触发时机按本卡面改为"首次
	// 明置"（而非官方的"游戏开始时"）触发初始4张，并补全了官方"回合开始时移去+补至四张"的
	// 子技能（原实现遗漏了该部分，且首次触发只随机拿了1张而非官方/卡面所需的4张，均已修正）。
	sbyingmen: {
		aiShowTag: "support",
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
			const characters = _status.characterlist.randomRemove(4);
			if (characters.length) {
				lib.skill.sbyingmen.addVisitors(characters, player);
			}
		},
		ai: {
			combo: "sbpingjian",
		},
		group: ["sbyingmen_damage", "sbyingmen_reload"],
		subSkill: {
			damage: {
				// 卡面："当你受到或造成伤害后，你获得一张'访客'"——需同时监听受到伤害(damageEnd)
				// 与造成伤害(damageSource)两种时机，原实现只监听了damageEnd(受到伤害)，已补全。
				charlotte: true,
				trigger: { player: "damageEnd", source: "damageSource" },
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
			// 回合开始前：可移去任意张"访客"，然后从剩余武将牌堆补至四张（原实现完全缺失此
			// 子技能，已按卡面/jsrg官方 sbyingmen_reload 补全）。
			reload: {
				charlotte: true,
				trigger: { player: "phaseZhunbeiBegin" },
				forced: true,
				filter(event, player) {
					return player.storage.sbyingmen_inited;
				},
				async content(event, trigger, player) {
					if (!_status.characterlist) {
						game.initCharacterList();
					}
					const num = player.getStorage("sbyingmen").length;
					if (num > 0) {
						const result = await player
							.chooseButton(["盈门：是否移去任意张“访客”？", [player.getStorage("sbyingmen"), "character"]], [1, num])
							.set("ai", () => Math.random() > 0.8)
							.forResult();
						if (result?.bool && result.links?.length) {
							lib.skill.sbyingmen.removeVisitors(result.links, player);
							game.log(player, "移去了", "#y" + get.translation(result.links));
						}
					}
					const characters = _status.characterlist.randomRemove(4 - player.getStorage("sbyingmen").length);
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
	// 评鉴：你于"访客"的无类型标签技能的发动时机可以发动该技能，然后你选择一项：
	// 1.移去该"访客"并摸一张牌；2.移去另一张"访客"。
	// 参考: skill_refer/jsrg/_merged.md 的 jsrg_xushao-sbpingjian（技能名：评鉴），逻辑与官方一致，直接复用。
	sbpingjian: {
		aiShowTag: "support",
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
	// 参考: skill_refer/huicui/_merged.md 的 re_miheng-rekuangcai（技能名：狂才），"无距离和次数
	// 限制"部分限定为"回合内"，沿用官方 player == _status.currentPhase 的判断（原实现遗漏此
	// 限制，导致非其回合内也无限制生效，已修正）；手牌上限部分卡面无"结束阶段摸伤害值张牌"，
	// 未沿用。
	rekuangcai: {
		aiShowTag: "offense",
		audio: "rekuangcai",
		mod: {
			cardUsable(card, player) {
				if (player == _status.currentPhase) {
					return Infinity;
				}
			},
			targetInRange(card, player) {
				if (player == _status.currentPhase) {
					return true;
				}
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
	// 参考: skill_refer/huicui/_merged.md 的 re_miheng-reshejian（技能名：舌剑），触发时机与两个
	// 选项结构一致；数值/限制与官方不同（官方为"弃至少两张手牌/每回合限两次"，本卡面为
	// "弃置全部手牌（至少一张）/无次数限制，但选项2追加'无人濒死'限制"），已按本卡面重写。
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
			const result = await player.chooseToDiscard("h", player.countCards("h"), true).set("prompt2", "舌剑：是否弃置所有手牌（至少一张）？").forResult();
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
				const result = await player.chooseTarget("儒宗：是否令一名其他角色将手牌数摸至与你相同？", (card, pl, ta) => ta != player).forResult();
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
	// 与 sp 包同名技能"图射"（当你使用非装备牌指定目标后，若你没有基本牌，可摸X张牌，
	// X为此牌目标数，无需展示手牌）效果不同，非参考；本卡面为重新设计（需展示手牌、固定摸1张、
	// 限定"非基本牌"而非"非装备牌"）。
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
	// 排除: sp 包同名技能"立牧"（无回复体力效果，无次数/距离限制的条件是"判定区内有牌"而非
	// "本回合内"）效果不同，非参考。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gz_limu（audio同为xinfu_limu，此前只
	// 对比了sp包，遗漏了这个更贴近的guozhan版本），前半段"方片牌当乐不思蜀对自己使用，然后
	// 回复1点体力"与本项目完全一致；官方后续效果是"本回合额外使用杀的次数=此牌点数"，本项目
	// 按卡面改为"本回合对攻击范围内角色使用牌无次数和距离限制"，属卡面差异化设计，保留。
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
	// 若其赢，你交给其一张牌。
	// 参考: skill_refer/huicui/_merged.md 的 re_xunchen-refenglve（技能名：锋略），拼点结构一致，
	// 但官方多出"平局：获得自己拼点牌且发动次数上限+1"的分支，本卡面（translate.js）并无平局
	// 描述，故不沿用该分支——原实现照抄了官方的平局加次数机制，与卡面不符，已删除并改为严格
	// 按卡面的"限一次/只有输赢两种结果"重写。
	refenglve: {
		aiShowTag: "support",
		audio: "refenglve",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const result = await player.chooseToCompare(target).forResult();
			if (result.bool) {
				if (target.countCards("ej")) {
					await player.gainPlayerCard(target, "ej", true, 2);
				}
			} else if (result.winner == target && result.player) {
				await target.gain([result.player], "give");
			}
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					if (
						!player.hasCard(function (card) {
							if (get.position(card) != "h") {
								return false;
							}
							var val = get.value(card);
							if (val < 0) {
								return true;
							}
							if (val <= 5) {
								return card.number >= 11;
							}
							if (val <= 6) {
								return card.number >= 13;
							}
							return false;
						})
					) {
						return 0;
					}
					return -Math.sqrt(1 + target.countCards("he")) / (1 + target.countCards("j"));
				},
			},
		},
	},
	// 暗涌：每回合限一次，当与你势力相同的角色对另一名其他角色造成伤害时，你可以令此伤害值
	// 翻倍，然后若受伤角色：武将牌均明置，你失去1点体力且此技能本轮失效；仅明置一张武将牌，
	// 你弃置两张牌。
	// 排除: huicui 包同名技能"暗涌"（当一名角色于其回合内第一次造成伤害后，若伤害值为1，可弃置
	// 一张牌并对受伤角色造成1点伤害）效果完全不同，非参考——原实现照抄了官方描述而非本卡面
	// （translate.js）描述，已按卡面重写为伤害翻倍+根据受伤角色明置状态产生后果。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gzanyong（此前从未查过guozhan，只对比了
	// huicui完全不同的版本），效果与本项目translate.js文本几乎逐字重合："己方角色对其他角色
	// 造成伤害时可令伤害翻倍，然后若受伤角色武将牌均明置则你失去1点体力并失去此技能，仅明置
	// 一张武将牌则你弃置两张牌"，当前isUnseen(slot)判断写法与官方思路一致，无需改动。
	anyong: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: "anyong",
		trigger: { global: "damageBegin1" },
		filter(event, player) {
			return !!(event.source && event.source.isIn() && event.player && event.player.isIn() && event.source !== event.player && event.source.isFriendOf(player) && player.storage.anyong_used_round !== game.roundNumber && player.storage.anyong_disabled_round !== game.roundNumber);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("暗涌：是否令" + get.translation(trigger.source) + "对" + get.translation(trigger.player) + "造成的伤害翻倍？").forResult();
		},
		async content(event, trigger, player) {
			player.storage.anyong_used_round = game.roundNumber;
			trigger.num *= 2;
			const target = trigger.player;
			const slots = target.name2 ? [0, 1] : [0];
			const revealed = slots.filter(slot => !target.isUnseen(slot));
			if (revealed.length === slots.length) {
				player.storage.anyong_disabled_round = game.roundNumber;
				await player.loseHp();
			} else if (revealed.length === 1) {
				await player.chooseToDiscard(2, "he", true).forResult();
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
			return (player.storage.xrbaoli_supply || 0) > 0 && game.hasPlayer(current => current != player && current.isEnemyOf(player) && !current.storage.xrbaoli_holder);
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
			return !!(event.player && event.player != player && event.player.storage.xrbaoli_holder === player && event.player.storage.xrbaoli_hit !== game.phaseNumber);
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
			event.result = await player.chooseBool(get.prompt("xishe", trigger.player), "是否弃置一张装备区里的牌，视为对其使用一张【杀】？").forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			let killed = false;
			while (target?.isIn() && player.countCards("e") > 0) {
				const cardResult = await player.choosePlayerCard(player, "e", true).set("prompt", "襲射：弃置一张装备区里的牌，视为对其使用一张【杀】").forResult();
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
	// 参考: skill_refer/huicui/_merged.md 的 lvlingqi-guowu（技能名：帼武），结构一致，
	// 按卡面文字仅限【杀】（不含普通锦囊）多指定两名目标（原实现只加了一个名额，已修正为2）。
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
				const card = get.discardPile(c => c.name == "sha");
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
					return [range[0], range[1] + 2];
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
	// 排除: huicui 包同名技能"妆戎"（觉醒技，体力值或手牌数为1时减体力上限并获得〖神威〗〖无双〗）
	// 效果完全不同，非参考。
	// 参考: skill_refer_guozhan/_merged_guozhan.md 的 gzzhuangrong（audio同为zhuangrong，此前
	// 只对比了huicui的觉醒技版本，遗漏了这个几乎完全吻合的guozhan版本），效果一致："出牌阶段
	// 限一次，弃置一张锦囊牌并获得〖无双〗至出牌阶段结束"；官方用自定义gz_wushuang，本项目
	// 用引擎自带的标准版wushuang替代，属合理写法差异。
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
	// 参考: skill_refer/huicui/_merged.md 的 llqshenwei（技能名：神威），描述完全一致，直接复用。
	llqshenwei: {
		aiShowTag: "draw",
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
		aiShowTag: "defense",
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
		aiShowTag: "control",
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
			await player.chooseToDebate([player, other]).set("callback", async (event, trigger, player) => {
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
		aiShowTag: "draw",
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
			await player.chooseToDebate(voters).set("callback", async (event, trigger, player) => {
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
			await player.chooseToDebate(joined).set("callback", async (event, trigger, player) => {
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
		aiShowTag: "control",
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
			await player.chooseToDebate(all).set("callback", async (event, trigger, player) => {
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
		aiShowTag: "defense",
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
		aiShowTag: "support",
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
				.set(
					"choiceList",
					names.map(name => get.translation(name))
				)
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
		aiShowTag: "support",
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
