import { lib, game, ui, get, ai, _status } from "noname";

// 势力判断专用：不能直接比较 a.group == b.group / a.group != b.group，原因有两个——
// ①暗置的武将没有确定的势力（player.group / player.identity 均被引擎置为字符串
// "unknown"，见 mode/guozhan/src/patch/content.js 的换将/明置逻辑），两个都暗置的角色
// 会被误判为"同势力"（都是"unknown"）；②野心家：player.group 存的是武将本身的势力
// （如"qun"），只有 player.identity 会被引擎改成"ye"（见
// mode/guozhan/src/patch/player.js 的明置逻辑），所以两个武将本身势力恰好相同的野心家
// 会被 a.group === b.group 误判成同势力队友，而真实规则里野心家彼此互相敌对（除非通过
// yexinjia_friend 结盟）。因此统一改用 player.isFriendOf/isEnemyOf（这两个方法内部已经
// 正确处理了 identity=="ye"/"unknown" 的情况），并额外要求双方都已明置。
function sameGroup(a, b) {
	return !!a && !!b && a.identity !== "unknown" && b.identity !== "unknown" && a.isFriendOf(b);
}
function diffGroup(a, b) {
	return !!a && !!b && a.identity !== "unknown" && b.identity !== "unknown" && a.isEnemyOf(b);
}

// "首次明置武将牌"类技能的3将模式兜底专用：某技能可能挂在player的主将(name1)、副将(name2)，
// 也可能是三将/sanjiang模式额外抽到的第三个武将(name3)——三者里具体是哪一个，取决于这名角色
// 实际被摆在哪个槽位，不能想当然认定就是name3。name1/name2走正常的isUnseen(0)/isUnseen(1)
// 暗置-明置判断，而name3从被抽到那一刻起就是直接展示的，不走isUnseen那一套(见
// guozhan/src/patch/player.js里name3字段的注释)，因此恒定视为"已明置"。
function isCharacterShown(player, skill) {
	if (get.character(player.name1, 3).includes(skill)) {
		return !player.isUnseen(0);
	}
	if (get.character(player.name2, 3).includes(skill)) {
		return !player.isUnseen(1);
	}
	if (get.character(player.name3, 3).includes(skill)) {
		return true;
	}
	return false;
}

// 所有"变更此武将牌"类技能的通用逻辑：从当前不在场的武将里随机亮出2个供玩家选择
// （而不是直接随机抽1个焗给玩家），适用于caishi(才识)/xiongyi(雄异)/jianglve(将略)/
// xishe_change(袭射)。
// slotOrSkillId传技能id时，自动判断该技能实际挂在主将(0)/副将(1)/第三将(2，3将/sanjiang
// 模式专属)中的哪一个槽位；传数字时直接指定槽位（用于xishe_change这类不属于任何角色、
// 而是固定改副将的临时技能，无法通过技能id反查槽位）。
// 第三将槽位不走player.changeCharacter——引擎的changeCharacter/reinit2从设计上就只处理
// name1/name2这一对，完全不认识name3（见content.ts的changeCharacter实现），所以第三将槽位
// 换将照抄xushuTransThird()换第三将时的写法：直接removeSkill旧技能、置换name3、更新
// avatar3g/name3这两个UI节点、再addSkill新技能。
function pickCharacterCandidates() {
	if (!_status.characterlist) {
		game.initCharacterList();
	}
	const pool = _status.characterlist.filter(name => lib.character[name]);
	const shuffled = pool.slice();
	shuffled.randomSort();
	return shuffled.slice(0, Math.min(2, shuffled.length));
}

// 实际执行"把skillId所在的那张武将牌换成chosen"——独立拆出来（不是async），
// 这样async content的技能可以await它，非async(旧的"step N"写法，比如guiyin/jianglve)
// 的技能也能直接调用而不需要处理Promise。
// slotOrSkillId传技能id时，自动判断该技能实际挂在主将(0)/副将(1)/第三将(2，3将/sanjiang
// 模式专属)中的哪一个槽位；传数字时直接指定槽位（用于xishe_change这类不属于任何角色、
// 而是固定改副将的临时技能，无法通过技能id反查槽位）。
// 第三将槽位不走player.changeCharacter——引擎的changeCharacter/reinit2从设计上就只处理
// name1/name2这一对，完全不认识name3（见content.ts的changeCharacter实现），所以第三将槽位
// 换将照抄xushuTransThird()换第三将时的写法：直接removeSkill旧技能、置换name3、更新
// avatar3g/name3这两个UI节点、再addSkill新技能。
function applyCharacterChange(player, slotOrSkillId, chosen) {
	let slot;
	if (typeof slotOrSkillId === "number") {
		slot = slotOrSkillId;
	} else {
		const names = [player.name1, player.name2, player.name3].filter(Boolean);
		slot = names.findIndex(name => get.character(name, 3).includes(slotOrSkillId));
		if (slot < 0) {
			slot = 0;
		}
	}
	if (slot === 2) {
		const oldName = player.name3;
		if (oldName && lib.character[oldName]) {
			for (const oldSkill of get.character(oldName, 3)) {
				if (player.hasSkill(oldSkill, null, null, false)) {
					player.removeSkill(oldSkill);
				}
			}
		}
		if (_status.characterlist) {
			_status.characterlist.remove(chosen);
			if (oldName) {
				_status.characterlist.add(oldName);
			}
		}
		player.name3 = chosen;
		if (player.node.avatar3g) {
			player.node.avatar3g.setBackground(chosen, "character");
			player.node.avatar3g.show();
			player.node.name3.innerHTML = get.slimName(chosen);
			player.node.name3.show();
		}
		for (const newSkill of get.character(chosen, 3)) {
			if (lib.skill[newSkill]) {
				player.addSkill(newSkill);
			}
		}
		game.log(player, "将第三个武将从", `#b${get.translation(oldName)}`, "变更为了", `#b${get.translation(chosen)}`);
		return null;
	}
	const names2 = [player.name1, player.name2].filter(Boolean);
	names2[slot] = chosen;
	return player.changeCharacter(names2);
}

// 所有"变更此武将牌"类技能的通用逻辑（async版本）：从当前不在场的武将里随机亮出2个供
// 玩家选择（而不是直接随机抽1个焗给玩家），适用于caishi(才识)/xiongyi(雄异)/jugu2(巨贾)/
// xishe_change(袭射)这几个async content写的技能。旧式"step N"写法的技能（jianglve/guiyin）
// 没法直接await这个函数，改成自己在content里插入chooseButton步骤、拿到chosen后调用上面的
// applyCharacterChange。
async function pickAndChangeCharacter(player, slotOrSkillId, prompt) {
	const candidates = pickCharacterCandidates();
	if (!candidates.length) {
		return false;
	}
	let chosen = candidates[0];
	if (candidates.length > 1) {
		const result = await player
			.chooseButton([prompt || "请选择要变更为的武将", [candidates, "character"]])
			.set("filterButton", button => candidates.includes(button.link))
			.set("ai", button => get.guozhanRank(button.link))
			.forResult();
		chosen = (result?.bool && result.links?.[0]) || candidates[0];
	}
	if (!chosen) {
		return false;
	}
	const changeEvent = applyCharacterChange(player, slotOrSkillId, chosen);
	if (changeEvent) {
		await changeEvent;
	}
	return true;
}

// 徐庶"举荐"专用：交换两名角色"第三个武将"（name3，国战三将/sanjiang模式专属槽位）。
function hasLianhengTag(card, owner) {
	if (!card) {
		return false;
	}
	if (typeof card.hasGaintag === "function" && card.hasGaintag("_lianheng")) {
		return true;
	}
	if (owner && ["tao", "wugu"].includes(get.name(card))) {
		return game.hasPlayer(current => current.isIn() && current.hasSkill("jiahe") && sameGroup(current, owner));
	}
	return false;
}

async function xushuTransThird(player, target) {
	const name1 = player.name3,
		name2 = target.name3;
	const getSkills = (current, name) => {
		return get.character(name, 3).filter(skillId => {
			if (!current.hasSkill(skillId, null, null, false)) {
				return false;
			}
			const info = lib.skill[skillId];
			return info && !info.charlotte && get.skillInfoTranslation(skillId, current).length > 0;
		});
	};
	const map1 = new Map();
	const skills1 = getSkills(player, name1);
	for (const skillId of skills1) {
		const cards = player.getExpansions(skillId);
		if (cards && cards.length) {
			map1.set(skillId, cards);
			await player.lose(cards, ui.special).set("getlx", false);
		}
	}
	const map2 = new Map();
	const skills2 = getSkills(target, name2);
	for (const skillId of skills2) {
		const cards = target.getExpansions(skillId);
		if (cards && cards.length) {
			map2.set(skillId, cards);
			await target.lose(cards, ui.special).set("getlx", false);
		}
	}
	for (const skillId of skills1) {
		if (player.awakenedSkills?.includes(skillId)) {
			player.restoreSkill(skillId);
			target.awakenSkill(skillId);
		}
		player.removeSkill(skillId);
	}
	for (const skillId of skills2) {
		if (target.awakenedSkills?.includes(skillId)) {
			target.restoreSkill(skillId);
			player.awakenSkill(skillId);
		}
		target.removeSkill(skillId);
	}
	player.name3 = name2;
	target.name3 = name1;
	if (player.node.avatar3g) {
		player.node.avatar3g.setBackground(name2, "character");
		player.node.name3.innerHTML = get.slimName(name2);
	}
	if (target.node.avatar3g) {
		target.node.avatar3g.setBackground(name1, "character");
		target.node.name3.innerHTML = get.slimName(name1);
	}
	for (const skillId of get.character(name2, 3)) {
		if (lib.skill[skillId]) {
			player.addSkill(skillId);
		}
	}
	for (const skillId of get.character(name1, 3)) {
		if (lib.skill[skillId]) {
			target.addSkill(skillId);
		}
	}
	for (const [skillId, cards] of map1) {
		if (target.hasSkill(skillId, null, null, false) && cards.length) {
			target.$addToExpansion(cards, null, skillId);
			target.markSkill(skillId);
		}
	}
	for (const [skillId, cards] of map2) {
		if (player.hasSkill(skillId, null, null, false) && cards.length) {
			player.$addToExpansion(cards, null, skillId);
			player.markSkill(skillId);
		}
	}
	game.log(player, "与", target, "进行了第三个武将的易位");
}

// 张郃"巧变"专用：跳过摸牌/出牌阶段（无论是自己选择跳过，还是被其他效果跳过）时结算对应奖励。
async function qiaobianGrantBonus(phaseEvent, player) {
	if (phaseEvent.name == "phaseUse") {
		if (player.canMoveCard()) {
			await player.moveCard();
		}
		return;
	}
	const result = await player
		.chooseTarget([1, 2], "巧变：获得至多两名角色各一张手牌", function (card, player, target) {
			return target != player && target.countCards("h");
		})
		.set("ai", target => {
			return 1 - get.attitude(get.player(), target);
		})
		.forResult();
	if (!result.bool || !result.targets?.length) {
		return;
	}
	result.targets.sortBySeat();
	player.line(result.targets, "green");
	await player.gainMultiple(result.targets);
	await game.delay();
}

export default {

// ========== zhangxingcai 张星彩 ==========
	// 甚贤：当其他角色于你的回合外因弃置而失去基本牌后，若你的手牌数小于7，你可以摸一张牌。 参考zhangxingcai(shu)
	shenxian: {
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (event.type != "discard" || _status.currentPhase == player || event.getlx === false) {
				return false;
			}
			if (event.name == "lose" && event.player == player) {
				return false;
			}
			if (player.countCards("h") >= 7) {
				return false;
			}
			var cards = event.cards.slice(0);
			var evt = event.getl(player);
			if (evt && evt.cards) {
				cards.removeArray(evt.cards);
			}
			for (var i = 0; i < cards.length; i++) {
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
				await game.delay();
			}
			await player.draw();
		},
		ai: {
			threaten: 1.5,
		},
	},

	// 枪舞：当你因“甚贤”的效果摸牌后，你可以弃置一张牌，然后你的下回合，你使用【杀】的距离和基础次数+1。 参考gz_qiangwu
	qiangwu: {
		audio: 2,
		trigger: { player: "drawAfter" },
		filter(event, player) {
			// 甚贤(shenxian)自己的filter要求_status.currentPhase != player（只在别人回合触发），
			// 所以真正由甚贤摸的牌绝不可能发生在玩家自己回合开始时；这里加一道保险，
			// 避免event.getParent("shenxian")在别的场合（比如玩家自己回合的正常摸牌）误判为真。
			if (_status.currentPhase == player) {
				return false;
			}
			let evt = event,
				found = false;
			for (let i = 0; i < 6 && evt; i++) {
				evt = evt.getParent?.();
				if (evt && evt.skill === "shenxian") {
					found = true;
					break;
				}
			}
			return found && player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseToDiscard("he").set("prompt", get.prompt2("qiangwu")).forResult();
		},
		async content(event, trigger, player) {
			player.addTempSkill("qiangwu_arm");
		},
		ai: {
			combo: "shenxian",
		},
	},
	qiangwu_arm: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			player.removeSkill("qiangwu_arm");
			player.addTempSkill("qiangwu_buff", "phaseUseAfter");
		},
	},
	qiangwu_buff: {
		charlotte: true,
		mod: {
			attackRange(player, num) {
				return num + 1;
			},
			cardUsable(card, player, num) {
				if (get.name(card, false) == "sha") {
					return num + 1;
				}
			},
		},
		intro: {
			content: "本回合你使用【杀】的距离和基础次数各+1",
		},
	},

// ========== zhangbao 张苞 ==========
	// 角逐：锁定技，当你造成/受到伤害后，你本回合使用牌无次数限制/视为对伤害来源使用一张【决斗】。 参考stdjuezhu
	juezhu: {
		audio: 2,
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		filter(event, player, name) {
			if (name == "damageSource") {
				return true;
			}
			return event.source?.isIn() && player.canUse({ name: "juedou", isCard: true }, event.source);
		},
		forced: true,
		async content(event, trigger, player) {
			if (event.triggername == "damageSource") {
				player.addTempSkill("juezhu_paoxiao");
			} else {
				let card = { name: "juedou", isCard: true };
				if (player.canUse(card, trigger.source)) {
					await player.useCard(card, trigger.source);
				}
			}
		},
		subSkill: {
			paoxiao: {
				charlotte: true,
				mod: {
					cardUsable() {
						return Infinity;
					},
				},
			},
		},
		ai: {
			threaten: 1.4,
		},
	},

	// 承继：你可以将两张颜色不同的牌当【杀】使用或打出。 参考stdchengji
	chengji: {
		audio: 2,
		enable: ["chooseToRespond", "chooseToUse"],
		filterCard(card, player) {
			if (!ui.selected.cards.length) {
				return true;
			}
			return ui.selected.cards.every(cardx => get.color(cardx, player) != get.color(card, player));
		},
		complexCard: true,
		position: "hes",
		selectCard: 2,
		viewAs: { name: "sha" },
		viewAsFilter(player) {
			if (player.countCards("hes") < 2) {
				return false;
			}
			let color = get.color(player.getCards("hes")[0], player);
			return _status.connectMode || player.getCards("hes").some(card => get.color(card, player) != color);
		},
		prompt: "将两张颜色不同的牌当杀使用或打出",
		check(card) {
			const val = get.value(card);
			if (_status.event.name == "chooseToRespond") {
				return 1 / Math.max(0.1, val);
			}
			return 5 - val;
		},
		ai: {
			skillTagFilter(player) {
				if (player.countCards("hes") < 2) {
					return false;
				}
				let color = get.color(player.getCards("hes")[0], player);
				return _status.connectMode || player.getCards("hes").some(card => get.color(card, player) != color);
			},
			respondSha: true,
		},
	},

// ========== liuqi 刘琦 ==========
	// 问计：出牌阶段开始时，你可以令一名其他角色交给你一张牌，若其与你：势力相同或未确定势力，你本回合使用此牌无距离、次数限制且不能被响应；势力不同，你交给其一张除此牌外的牌。 参考gzwenji
	wenji: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		direct: true,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && current.countCards("he");
			});
		},
		preHidden: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt2("wenji"), function (card, player, target) {
					return target != player && target.countCards("he") > 0;
				})
				.set("ai", function (target) {
					var att = get.attitude(_status.event.player, target);
					if (target.identity == "unknown" && att <= 0) {
						return 20;
					}
					if (att > 0) {
						return Math.sqrt(att) / 10;
					}
					return 5 - att;
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("wenji", target);
				target.chooseCard("he", true, "问计：将一张牌交给" + get.translation(player));
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				event.card = result.cards[0];
				target.give(result.cards, player).gaintag.add("wenji");
			}
			"step 3";
			if (target.identity == "unknown" || target.isFriendOf(player)) {
				player.addTempSkill("wenji_respond");
				event.finish();
			} else if (
				target.isIn() &&
				player.countCards("he", function (card) {
					return !card.hasGaintag("wenji");
				})
			) {
				player
					.chooseCard("he", "交给" + get.translation(target) + "一张其他牌，或令其摸一张牌", function (card) {
						return !card.hasGaintag("wenji");
					})
					.set("ai", function (card) {
						return 5 - get.value(card);
					});
			} else {
				event.finish();
			}
			"step 4";
			if (result.bool) {
				player.give(result.cards, target);
				player.removeGaintag("wenji");
			} else {
				target.draw();
			}
		},
		subSkill: {
			respond: {
				onremove(player) {
					player.removeGaintag("wenji");
				},
				mod: {
					targetInRange(card, player, target) {
						if (!card.cards) {
							return;
						}
						for (var i of card.cards) {
							if (i.hasGaintag("wenji")) {
								return true;
							}
						}
					},
					cardUsable(card, player, target) {
						if (!card.cards) {
							return;
						}
						for (var i of card.cards) {
							if (i.hasGaintag("wenji")) {
								return Infinity;
							}
						}
					},
				},
				trigger: { player: "useCard" },
				forced: true,
				charlotte: true,
				audio: "wenji",
				filter(event, player) {
					return (
						player.getHistory("lose", function (evt) {
							if ((evt.relatedEvent || evt.getParent()) != event) {
								return false;
							}
							for (var i in evt.gaintag_map) {
								if (evt.gaintag_map[i].includes("wenji")) {
									return true;
								}
							}
							return false;
						}).length > 0
					);
				},
				content() {
					trigger.directHit.addArray(
						game.filterPlayer(function (current) {
							return current != player;
						})
					);
					if (trigger.addCount !== false) {
						trigger.addCount = false;
						var stat = player.getStat();
						if (stat && stat.card && stat.card[trigger.card.name]) {
							stat.card[trigger.card.name]--;
						}
					}
				},
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						return arg.card && arg.card.cards && arg.card.cards.filter(card => card.hasGaintag("wenji")).length > 0;
					},
				},
			},
		},
		ai: {
			threaten: 0.8,
		},
	},

	// 屯江：结束阶段，若你于出牌阶段内使用过牌且未指定过其他角色为目标，你可以摸X张牌（X为全场势力数）。 参考gztunjiang
	tunjiang: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		preHidden: true,
		filter(event, player) {
			if (
				!player.getHistory("useCard", function (evt) {
					return evt.isPhaseUsing();
				}).length
			) {
				return false;
			}
			return (
				player.getHistory("useCard", function (evt) {
					if (evt.targets && evt.targets.length && evt.isPhaseUsing()) {
						var targets = evt.targets.slice(0);
						while (targets.includes(player)) {
							targets.remove(player);
						}
						return targets.length > 0;
					}
					return false;
				}).length == 0
			);
		},
		content() {
			player.draw(game.countGroup());
		},
	},

// ========== pengyang 彭羕 ==========
	// 通令：出牌阶段限一次，当你对势力与你不同的角色造成伤害后，你可以选择一名势力与你相同的角色，令其可以对受到此伤害的角色使用一张牌，当此牌结算结束后，若此牌造成过伤害，则你与其各摸两张牌，否则受到你伤害的角色获得你对其造成伤害的牌。 参考gztongling
	tongling: {
		audio: "daming",
		trigger: { source: "damageSource" },
		filter(event, player) {
			if (event.player.isFriendOf(player)) {
				return false;
			}
			return player.isPhaseUsing() && event.player.isIn() && !player.hasSkill("tongling_used");
		},
		direct: true,
		content() {
			"step 0";
			var str = "";
			if (get.itemtype(trigger.cards) == "cards" && trigger.cards.filterInD().length) {
				str += "；未造成伤害，其获得" + get.translation(trigger.cards.filterInD());
			}
			player
				.chooseTarget(get.prompt("tongling"), "令一名势力与你相同的角色选择是否对其使用一张牌。若使用且此牌：造成伤害，你与其各摸两张牌" + str, function (card, player, target) {
					return target.isFriendOf(player);
				})
				.set("ai", function (target) {
					var aim = _status.event.aim;
					var cards = target.getCards("hs", function (card) {
						return target.canUse(card, aim, false) && get.effect(aim, card, target, player) > 0 && get.effect(aim, card, target, target) > 0;
					});
					if (cards.length) {
						return cards.some(card => get.tag(card, "damage")) ? 2 : 1;
					}
					return 0;
				})
				.set("aim", trigger.player);
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("tongling", target);
				player.addTempSkill("tongling_used", "phaseUseAfter");
				player.line2([target, trigger.player]);
				target
					.chooseToUse(
						function (card, player, event) {
							return lib.filter.filterCard.apply(this, arguments);
						},
						"通令：是否对" + get.translation(trigger.player) + "使用一张牌？"
					)
					.set("targetRequired", true)
					.set("complexSelect", true)
					.set("complexTarget", true)
					.set("filterTarget", function (card, player, target) {
						if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
							return false;
						}
						return lib.filter.targetEnabled.apply(this, arguments);
					})
					.set("sourcex", trigger.player)
					.set("addCount", false);
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				if (target.hasHistory("sourceDamage", evt => evt.getParent(4).name == "tongling")) {
					player.draw(2, "nodelay");
					target.draw(2);
				} else {
					if (get.itemtype(trigger.cards) == "cards" && trigger.cards.filterInD().length && trigger.player.isIn()) {
						trigger.player.gain(trigger.cards.filterInD(), "gain2");
					}
				}
			}
		},
		subSkill: { used: { charlotte: true } },
		ai: {
			threaten: 1,
		},
	},

	// 近陷：当你明置此武将牌后，你令距离1以内的所有角色各执行此效果：若其武将牌均明置，则其暗置一张武将牌，否则其弃置两张牌。 参考gzjinyu
	jinxian: {
		audio: "xiaoni",
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			if (
				!game.hasPlayer(function (current) {
					return get.distance(player, current) <= 1;
				})
			) {
				return false;
			}
			return event.toShow.some(name => get.character(name, 3).includes("jinxian"));
		},
		logTarget(event, player) {
			return game
				.filterPlayer(function (current) {
					return get.distance(player, current) <= 1;
				})
				.sortBySeat(player);
		},
		forced: true,
		locked: false,
		// 若此武将是作为第三个武将(3将模式)获得的，一开始就是明置状态(name3不走isUnseen/showCharacter那一套
		// 隐藏-揭示流程，见guozhan/src/patch/player.js里name3的注释)，没有showCharacterAfter这个环节，
		// 只能在addSkill时另起一个异步流程，重跑一遍同样的结算。
		init(player, skill) {
			if (!player.storage.jinxian_init && isCharacterShown(player, skill)) {
				player.storage.jinxian_init = true;
				(async () => {
					await lib.skill.jinxian.grant(player);
				})();
			}
		},
		async content(event, trigger, player) {
			await lib.skill.jinxian.grant(player);
		},
		async grant(player) {
			const targets = game
				.filterPlayer(function (current) {
					return get.distance(player, current) <= 1;
				})
				.sortBySeat(player);
			for (const target of targets) {
				if (!target.isIn()) {
					continue;
				}
				if (!target.isUnseen(2)) {
					let control;
					if (get.is.jun(target)) {
						control = "副将";
					} else {
						const result = await target
							.chooseControl("主将", "副将")
							.set("prompt", "近陷：请暗置一张武将牌")
							.set("ai", function () {
								const target = _status.event.player;
								if (get.character(target.name, 3).includes("jinxian")) {
									return "主将";
								}
								if (get.character(target.name2, 3).includes("jinxian")) {
									return "副将";
								}
								if (
									lib.character[target.name][3].some(skill => {
										const info = get.info(skill);
										return info && info.ai && info.ai.maixie;
									})
								) {
									return "主将";
								}
								return "副将";
							})
							.forResult();
						control = result.control;
					}
					if (control) {
						target.hideCharacter(control == "主将" ? 0 : 1);
					}
				} else {
					await target.chooseToDiscard(2, "he", true);
				}
			}
		},
	},

// ========== xiahouba 夏侯霸 ==========
	// 豹烈：锁定技，出牌阶段开始时，所有攻击范围内包含你的其他势力的角色依次选择一项：1.弃置一张牌并对你使用一张【杀】；2.令你弃置其一张牌；你对体力值不小于你的其他角色使用【杀】无距离与次数限制。 参考gzbaolie
	baolie: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
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
		trigger: { player: "phaseUseBegin" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.isEnemyOf(player) && player.inRangeOf(current);
			});
		},
		logTarget(event, player) {
			return game.filterPlayer(function (current) {
				return current.isEnemyOf(player) && player.inRangeOf(current);
			});
		},
		check: () => false,
		content() {
			"step 0";
			event.targets = game
				.filterPlayer(function (current) {
					return current.isEnemyOf(player) && player.inRangeOf(current);
				})
				.sortBySeat();
			"step 1";
			var target = event.targets.shift();
			if (target.isIn()) {
				event.target = target;
				target
					.chooseToUse(
						function (card, player, event) {
							if (get.name(card) != "sha") {
								return false;
							}
							return lib.filter.filterCard.apply(this, arguments);
						},
						"豹烈：对" + get.translation(player) + "使用一张杀，或令其弃置你的一张牌"
					)
					.set("targetRequired", true)
					.set("complexSelect", true)
					.set("complexTarget", true)
					.set("filterTarget", function (card, player, target) {
						if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
							return false;
						}
						return lib.filter.filterTarget.apply(this, arguments);
					})
					.set("sourcex", player);
			} else if (event.targets.length) {
				event.redo();
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool == false && target.countCards("he") > 0) {
				player.discardPlayerCard(target, "he", true);
			}
			if (event.targets.length) {
				event.goto(1);
			}
		},
		ai: {
			threaten: 1.3,
		},
	},

// ========== fushiren 傅士仁 ==========
	// 锋势：当你使用牌指定唯一目标后，若其手牌数小于你，你可以弃置你与其各一张牌，令此牌不可响应或伤害+1。若此牌造成伤害，此技能本回合失效。 参考mffengshi(sp2)
	fengshi: {
		audio: 2,
		trigger: { player: "useCardToTargeted" },
		direct: true,
		filter(event, player) {
			if (!event.isFirstTarget || event.targets.length != 1 || player.hasSkill("fengshi_ban")) {
				return false;
			}
			return event.target.countCards("h") < player.countCards("h") && player.countCards("he") > 0 && event.target.countCards("he") > 0;
		},
		content() {
			"step 0";
			player
				.chooseBool(get.prompt("fengshi"), "弃置你与" + get.translation(trigger.target) + "的各一张牌，然后令" + get.translation(trigger.card) + "不可被响应或使其伤害+1")
				.set("ai", () => true);
			"step 1";
			if (!result.bool) {
				event.finish();
			} else {
				player.logSkill("fengshi", trigger.target);
				player.chooseToDiscard("he", true);
			}
			"step 2";
			if (trigger.target.countDiscardableCards(player, "he") > 0) {
				player.discardPlayerCard(trigger.target, "he", true);
			}
			"step 3";
			player
				.chooseControl("不可被响应", "伤害+1")
				.set("prompt2", "锋势：请选择此牌的效果")
				.set("ai", () => (get.tag(trigger.card, "damage") ? "伤害+1" : "不可被响应"));
			"step 4";
			if (result.control == "不可被响应") {
				trigger.norespond = true;
			} else {
				trigger.getParent().baseDamage = (trigger.getParent().baseDamage || 1) + 1;
			}
			player.storage.fengshi_card = trigger.card;
			player.addTempSkill("fengshi_track");
		},
		subSkill: {
			track: {
				charlotte: true,
				trigger: { source: "damageSource" },
				filter(event, player) {
					return event.card && event.card === player.storage.fengshi_card;
				},
				forced: true,
				popup: false,
				content() {
					player.addTempSkill("fengshi_ban", "phaseAfter");
					player.removeSkill("fengshi_track");
				},
			},
			ban: {},
		},
		ai: {
			threaten: 1,
		},
	},

// ========== liubei 刘备 ==========
	// 仁德：出牌阶段，你可以将至少一张手牌交给其他角色，然后你于此阶段内不能再以此法交给该角色牌；若你于此阶段内给出的牌首次达到两张，你可以视为使用一张基本牌。 参考gz_rende
	rende: {
		audio: "rerende",
		audioname: ["gz_jun_liubei"],
		enable: "phaseUse",
		filter(_event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(current => get.info("rende").filterTarget?.(null, player, current));
		},
		filterTarget(_card, player, target) {
			if (player == target) {
				return false;
			}
			return !player.getStorage("rende_targeted").includes(target);
		},
		filterCard: true,
		selectCard: [1, Infinity],
		allowChooseAll: true,
		discard: false,
		lose: false,
		delay: false,
		check(card) {
			if (ui.selected.cards.length && ui.selected.cards[0].name == "du") {
				return 0;
			}
			if (!ui.selected.cards.length && card.name == "du") {
				return 20;
			}
			const player = get.owner(card);
			if (player == null) {
				return 0;
			}
			if (ui.selected.cards.length >= Math.max(2, player.countCards("h") - player.hp)) {
				return 0;
			}
			if (player.hp == player.maxHp || player.storage.rerende < 0 || player.countCards("h") <= 1) {
				const players = game.filterPlayer(lib.filter.all);
				for (let i = 0; i < players.length; i++) {
					if (players[i].hasSkill("haoshi") && !players[i].isTurnedOver() && !players[i].hasJudge("lebu") && get.attitude(player, players[i]) >= 3 && get.attitude(players[i], player) >= 3) {
						return 11 - get.value(card);
					}
				}
				if (player.countCards("h") > player.hp) {
					return 10 - get.value(card);
				}
				if (player.countCards("h") > 2) {
					return 6 - get.value(card);
				}
				return -1;
			}
			return 10 - get.value(card);
		},
		async content(event, _trigger, player) {
			const { target, cards, name } = event;
			player.addTempSkill(name + "_targeted", "phaseUseAfter");
			player.markAuto(name + "_targeted", [target]);
			let num = 0;
			player.getHistory("lose", evt => {
				if (evt.getParent(2)?.name == name) {
					num += evt.cards.length;
				}
				return true;
			});
			await player.give(cards, target);
			const list = get.inpileVCardList(info => {
				return get.type(info[2]) == "basic" && player.hasUseTarget(new lib.element.VCard({ name: info[2], nature: info[3], isCard: true }), void 0, true);
			});
			if (num < 2 && num + cards.length > 1 && list.length) {
				const { links } = await player
					.chooseButton(["是否视为使用一张基本牌？", [list, "vcard"]])
					.set("ai", button => {
						return get.player().getUseValue({ name: button.link[2], nature: button.link[3], isCard: true });
					})
					.forResult();
				if (!links?.length) {
					return;
				}
				await player.chooseUseTarget(get.autoViewAs({ name: links[0][2], nature: links[0][3], isCard: true }), true);
			}
		},
		ai: {
			fireAttack: true,
			order(skill, player) {
				if (player.hp < player.maxHp && player.storage.rerende < 2 && player.countCards("h") > 1) {
					return 10;
				}
				return 4;
			},
			result: {
				target(player, target) {
					if (target.hasSkillTag("nogain")) {
						return 0;
					}
					if (target.isEnemyOf(player) && game.hasPlayer(current => current !== player && current.isFriendOf(player))) {
						return 0;
					}
					if (ui.selected.cards.length && ui.selected.cards[0].name == "du") {
						if (target.hasSkillTag("nodu")) {
							return 0;
						}
						return -10;
					}
					if (target.hasJudge("lebu")) {
						return 0;
					}
					const nh = target.countCards("h");
					const np = player.countCards("h");
					if (player.hp == player.maxHp || player.storage.rerende < 0 || player.countCards("h") <= 1) {
						if (nh >= np - 1 && np <= player.hp && !target.hasSkill("haoshi")) {
							return 0;
						}
					}
					return Math.max(1, 5 - nh);
				},
			},
			effect: {
				target_use(card, player, target) {
					if (player == target && get.type(card) == "equip") {
						if (player.countCards("e", { subtype: get.subtype(card) })) {
							if (
								game.hasPlayer(function (current) {
									return current != player && get.attitude(player, current) > 0;
								})
							) {
								return 0;
							}
						}
					}
				},
			},
			threaten: 0.8,
		},
		subSkill: {
			targeted: {
				onremove: true,
				charlotte: true,
			},
		},
	},

	// 振鞘：锁定技，你的攻击范围+1；当你于出牌阶段使用第一张【杀】指定目标后，若你的装备区里没有武器牌，你令此【杀】的结算执行两次。 参考jsrgzhenqiao
	zhenqiao: {
		audio: 2,
		trigger: { player: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			if (!event.isFirstTarget || event.card.name != "sha" || !player.hasEmptySlot(1)) {
				return false;
			}
			if (!event.isPhaseUsing()) {
				return false;
			}
			return (
				player.getHistory("useCard", evt => {
					return evt.card.name == "sha" && evt.isPhaseUsing();
				}).length == 1
			);
		},
		async content(event, trigger, player) {
			trigger.getParent().effectCount++;
		},
		mod: {
			attackRange(player, num) {
				return num + 1;
			},
		},
	},

// ========== guanyu 关羽 ==========
	// 武魂：锁定技，游戏开始时，你可以明置此武将。杀死你的角色本局游戏无法通过【桃】和【桃园结义】回复体力。 参考wuhun(extra)
	wuhun: {
		audio: "wuhun2",
		trigger: { player: "gameStart", global: "dieAfter" },
		filter(event, player) {
			if (event.name == "gameStart") {
				return true;
			}
			return event.player == player && event.source && event.source.isIn();
		},
		direct: true,
		content() {
			"step 0";
			if (trigger.name == "gameStart") {
				player.chooseBool(get.prompt("wuhun"), "是否明置此武将牌？").set("ai", () => Math.random() > 0.5);
			} else {
				trigger.source.addTempSkill("wuhun_ban");
				event.finish();
			}
			"step 1";
			if (result.bool) {
				var index = get.character(player.name2, 3).includes("wuhun") && !get.character(player.name, 3).includes("wuhun") ? 1 : 0;
				player.showCharacter(index);
			}
		},
		subSkill: {
			ban: {
				charlotte: true,
				trigger: { player: "recoverBefore" },
				filter(event) {
					return event.card && ["tao", "taoyuanjieyi"].includes(event.card.name);
				},
				forced: true,
				popup: false,
				content() {
					trigger.cancel();
				},
				mod: {
					cardEnabled2(card, player) {
						if (["tao", "taoyuanjieyi"].includes(card.name)) {
							return false;
						}
					},
				},
			},
		},
	},

	// 武圣：你可以将一张红色牌当【杀】使用或打出。你使用的♦【杀】无距离限制。你对有暗置武将的角色使用♥【杀】伤害+1。 参考gz_wusheng
	wusheng: {
		audio: "wusheng",
		audioname: ["re_guanyu", "jsp_guanyu", "re_guanzhang", "dc_jsp_guanyu"],
		audioname2: {
			gz_guansuo: "wusheng_guansuo",
			dc_guansuo: "wusheng_guansuo",
			guanzhang: "wusheng_guanzhang",
			guansuo: "wusheng_guansuo",
			std_guanxing: "wusheng_guanzhang",
			ty_guanxing: "wusheng_guanzhang",
		},
		enable: ["chooseToRespond", "chooseToUse"],
		filterCard(card, player) {
			return get.color(card) == "red";
		},
		locked: false,
		position: "hes",
		viewAs: {
			name: "sha",
		},
		viewAsFilter(player) {
			if (!player.countCards("hes", { color: "red" })) {
				return false;
			}
		},
		prompt: "将一张红色牌当杀使用或打出",
		check(card) {
			const val = get.value(card);
			const event = get.event();
			if (event.name == "chooseToRespond") {
				return 1 / Math.max(0.1, val);
			}
			return 5 - val;
		},
		mod: {
			targetInRange(card) {
				if (get.suit(card) == "diamond" && card.name == "sha") {
					return true;
				}
			},
		},
		trigger: { player: "useCardToTargeted" },
		filter(event, player) {
			return event.card?.name == "sha" && get.suit(event.card) == "heart" && event.target?.isUnseen(2);
		},
		forced: true,
		popup: false,
		content() {
			trigger.getParent().baseDamage = (trigger.getParent().baseDamage || 1) + 1;
		},
		ai: {
			respondSha: true,
			skillTagFilter(player) {
				if (!player.countCards("hes", { color: "red" })) {
					return false;
				}
			},
			threaten: 1.6,
		},
	},

	// 义绝：每回合限一次，你可以弃置一张牌，然后令一名其他角色展示一张牌：若此牌为黑色，你暗置其一张武将牌且本回合不能明置；若此牌为红色，则你获得之。 参考new_yijue
	yijue: {
		skillAnimation: true,
		animationColor: "soil",
		audio: "yijue",
		enable: "phaseUse",
		usable: 1,
		filterCard: lib.filter.cardDiscardable,
		position: "he",
		filterTarget(card, player, target) {
			return player != target && target.countCards("h") > 0;
		},
		check(card) {
			return 8 - get.value(card);
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (!target.countCards("h")) {
				return;
			}
			const result = await target
				.chooseCard(true, "h", "义绝：展示一张手牌")
				.set("ai", card => (get.color(card) == "black" ? 8 : -get.value(card)))
				.forResult();
			if (!result?.bool || !result.cards?.length) {
				return;
			}
			const [card] = result.cards;
			await target.showCards([card], get.translation(player) + "发动了〖义绝〗");
			if (get.color(card) == "black") {
				if (!target.isUnseen(2)) {
					const slots = [target.name1, target.name2].filter(name => name && !get.is.jun(name));
					let num;
					if (slots.length <= 1) {
						num = target.name1 == slots[0] ? 0 : 1;
					} else {
						const buttonResult = await player
							.chooseButton(["义绝：请选择暗置" + get.translation(target) + "的一张武将牌", [slots, "character"]])
							.set("filterButton", button => !get.is.jun(button.link))
							.forResult();
						if (!buttonResult?.bool || !buttonResult.links?.length) {
							return;
						}
						num = target.name1 == buttonResult.links[0] ? 0 : 1;
					}
					await target.hideCharacter(num);
					target.addTempSkill("yijue_ban", "phaseAfter");
				}
			} else {
				await player.gain(card, target, "give", "bySelf");
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					if (target.hasSkillTag("nogain") || !target.countCards("h")) {
						return 0;
					}
					return -get.attitude(player, target);
				},
			},
		},
		subSkill: {
			ban: { ai: { nomingzhi: true } },
		},
	},

// ========== zhangfei 张飞 ==========
	// 咆哮：锁定技，你使用【杀】不限次数。你的回合使用的第一张【杀】被抵消后，你本回合下一次【杀】造成的伤害+1。每回合你使用第二张【杀】时，摸一张牌。 参考gz_paoxiao
	paoxiao: {
		audio: "paoxiao",
		trigger: {
			player: "useCard",
		},
		filter(event, player) {
			if (_status.currentPhase != player) {
				return false;
			}
			if (event.card.name != "sha") {
				return false;
			}
			const history = player.getHistory("useCard", evt => {
				return evt.card.name == "sha";
			});
			return history && history.indexOf(event) == 1;
		},
		forced: true,
		preHidden: true,
		async content(_event, _trigger, player) {
			await player.draw();
		},
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return Infinity;
				}
			},
		},
		group: ["paoxiao_miss", "paoxiao_buff", "paoxiao_clear"],
		subSkill: {
			miss: {
				sub: true,
				audio: "paoxiao",
				trigger: { player: "shaMiss" },
				forced: true,
				filter(event, player) {
					if (_status.currentPhase != player) {
						return false;
					}
					const useEvent = event.getParent();
					const history = player.getHistory("useCard", evt => evt.card && evt.card.name == "sha");
					return history && history.indexOf(useEvent) == 0;
				},
				async content(_event, _trigger, player) {
					player.storage.paoxiao_buffed = true;
					player.markSkill("paoxiao");
				},
			},
			buff: {
				sub: true,
				audio: "paoxiao",
				trigger: { player: "useCardToPlayered" },
				forced: true,
				filter(event, player) {
					return _status.currentPhase == player && event.card.name == "sha" && !!player.storage.paoxiao_buffed;
				},
				logTarget: "target",
				async content(event, trigger, player) {
					delete player.storage.paoxiao_buffed;
					player.markSkill("paoxiao");
					const map = trigger.getParent()?.customArgs;
					const id = trigger.target.playerid;
					map[id] ??= {};
					map[id].extraDamage ??= 0;
					map[id].extraDamage++;
				},
			},
			clear: {
				sub: true,
				trigger: { player: "phaseAfter" },
				forced: true,
				filter(event, player) {
					return !!player.storage.paoxiao_buffed;
				},
				async content(_event, _trigger, player) {
					delete player.storage.paoxiao_buffed;
				},
			},
		},
		ai: {
			unequip: true,
			skillTagFilter(player, tag, arg) {
				if (arg && arg.name == "sha") {
					return true;
				}
				return false;
			},
			threaten: 1.8,
		},
	},

// ========== zhugeliang 诸葛亮 ==========
	// 问天：每回合限一次，你的任意阶段开始时，你可以观看牌堆顶X张牌（X为存活角色数且最大为5），以任意顺序置于牌堆顶或牌堆底；你可以将牌堆顶的牌当【无懈可击】/【火攻】使用，若此牌不为黑色/红色，本技能于本轮内失效。 参考jsrgwentian(jsrg)
	wentian: {
		skillAnimation: true,
		animationColor: "soil",
		trigger: { player: ["phaseZhunbeiBegin", "phaseJudgeBegin", "phaseDrawBegin", "phaseUseBegin", "phaseDiscardBegin", "phaseJieshuBegin"] },
		usable: 1,
		prompt2: "观看牌堆顶的牌，以任意顺序置于牌堆顶或牌堆底",
		group: "wentian_viewas",
		async content(event, trigger, player) {
			const num = Math.min(5, game.countPlayer());
			const cards = get.cards(num);
			await game.cardsGotoOrdering(cards);
			const next = player.chooseToMove("allowChooseAll");
			next.set("list", [["牌堆顶", cards.filterInD()], ["牌堆底"]]);
			next.set("prompt", "问天：点击或拖动将牌移动到牌堆顶或牌堆底");
			next.processAI = list => {
				const cards = list[0][1],
					player = _status.event.player;
				const top = [];
				const judges = player.getCards("j");
				let stopped = false;
				if (!player.hasWuxie()) {
					for (let i = 0; i < judges.length; i++) {
						const judge = get.judge(judges[i]);
						cards.sort((a, b) => judge(b) - judge(a));
						if (judge(cards[0]) < 0) {
							stopped = true;
							break;
						} else {
							top.unshift(cards.shift());
						}
					}
				}
				let bottom;
				if (!stopped) {
					cards.sort((a, b) => get.value(b, player) - get.value(a, player));
					while (cards.length) {
						if (get.value(cards[0], player) <= 5) {
							break;
						}
						top.unshift(cards.shift());
					}
				}
				bottom = cards;
				return [top, bottom];
			};
			const { moved } = await next.forResult();
			const top = moved[0];
			const bottom = moved[1];
			top.reverse();
			game.cardsGotoPile(top.concat(bottom), ["top_cards", top], (event, card) => {
				if (event.top_cards.includes(card)) {
					return ui.cardPile.firstChild;
				}
				return null;
			});
			player.popup(get.cnNumber(top.length) + "上" + get.cnNumber(bottom.length) + "下");
			game.log(player, "将" + get.cnNumber(top.length) + "张牌置于牌堆顶");
			await game.delayx();
		},
		subSkill: {
			viewas: {
				audio: "wentian",
				enable: "chooseToUse",
				filter(event, player) {
					for (const name of ["wuxie", "huogong"]) {
						if (event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) {
							return true;
						}
					}
					return false;
				},
				hiddenCard(player, name) {
					if (player.isTempBanned("wentian")) {
						return false;
					}
					return name == "wuxie";
				},
				viewAs(cards, player) {
					const event = get.event(),
						filter = event._backup.filterCard;
					for (const name of ["wuxie", "huogong"]) {
						if (filter(get.autoViewAs({ name }, "unsure"), player, event)) {
							return { name };
						}
					}
					return null;
				},
				filterCard: () => false,
				selectCard: -1,
				prompt() {
					const player = get.player();
					const event = get.event(),
						filter = event._backup.filterCard;
					let str = "将牌堆顶的牌当【";
					for (const name of ["wuxie", "huogong"]) {
						if (filter({ name }, player, event)) {
							str += get.translation(name);
							break;
						}
					}
					str += "】使用";
					return str;
				},
				log: false,
				async precontent(event, trigger, player) {
					player.logSkill("wentian");
					const cards = get.cards();
					const name = event.result.card?.name;
					event.result.card = get.autoViewAs({ name }, cards);
					event.result.cards = cards;
					game.cardsGotoOrdering(cards);
					const color = name == "wuxie" ? "black" : "red";
					if (get.color(cards, false) != color) {
						player.tempBanSkill("wentian", "roundStart");
					}
				},
			},
		},
		ai: {
			threaten: 0.9,
		},
	},

	// 空城：锁定技，当你成为【杀】或【决斗】的目标时，若你没有手牌，取消之；你的回合外，其他角色交给你的牌正面朝上置于你的武将牌上，摸牌阶段开始时，你获得这些牌。 参考gz_kongcheng
	kongcheng: {
		audio: "kongcheng",
		trigger: {
			target: "useCardToTarget",
		},
		locked: true,
		forced: true,
		check(event, player) {
			return get.effect(event.target, event.card, event.player, player) < 0;
		},
		filter(event, player) {
			return player.countCards("h") == 0 && (event.card.name == "sha" || event.card.name == "juedou");
		},
		async content(_event, trigger, player) {
			// @ts-expect-error 类型系统未来可期
			trigger.getParent()?.targets.remove(player);
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		ai: {
			effect: {
				target(card, _player, target, _current) {
					if (target.countCards("h") == 0 && (card.name == "sha" || card.name == "juedou")) {
						return "zeroplayertarget";
					}
				},
			},
		},
		intro: {
			markcount: "expansion",
			mark(dialog, _content, player) {
				const contents = player.getExpansions("kongcheng");
				if (contents?.length) {
					if (player == game.me || player.isUnderControl(void 0, void 0)) {
						dialog.addAuto(contents);
					} else {
						return "共有" + get.cnNumber(contents.length) + "张牌";
					}
				}
			},
			content(_content, player) {
				const contents = player.getExpansions("kongcheng");
				if (contents && contents.length) {
					if (player == game.me || player.isUnderControl(void 0, void 0)) {
						return get.translation(contents);
					}
					return "共有" + get.cnNumber(contents.length) + "张牌";
				}
			},
		},
		group: ["kongcheng_gain", "kongcheng_got"],
		subSkill: {
			gain: {
				audio: "kongcheng",
				trigger: {
					player: "gainBefore",
				},
				filter(event, player) {
					// @ts-expect-error 类型系统未来可期
					return event.source && event.source != player && player != _status.currentPhase && !event.bySelf && player.countCards("h") == 0;
				},
				async content(_event, trigger, _player) {
					trigger.name = "addToExpansion";
					trigger.setContent("addToExpansion");
					// @ts-expect-error 类型系统未来可期
					trigger.gaintag = ["kongcheng"];
					// @ts-expect-error 类型系统未来可期
					trigger.untrigger();
					trigger.trigger("addToExpansionBefore");
				},
				sub: true,
				forced: true,
			},
			got: {
				trigger: {
					player: "phaseDrawBegin1",
				},
				filter(_event, player) {
					return player.getExpansions("kongcheng").length > 0;
				},
				async content(_event, _trigger, player) {
					player.gain(player.getExpansions("kongcheng"), "draw");
				},
				sub: true,
				forced: true,
			},
		},
	},

// ========== zhaoyun 赵云 ==========
	// 龙胆：你可以将一张【闪】当【杀】、【杀】当【闪】使用或打出。当你发动“龙胆”使用的【杀】被【闪】抵消时，你可以对另一名角色造成1点伤害；当你发动“龙胆”使用的【闪】抵消了一名角色使用的【杀】，则你可以令另一名其他角色回复1点体力。 参考gz_longdan
	longdan: {
		audio: "longdan_sha",
		group: ["longdan_sha", "longdan_shan", "longdan_draw", "longdan_shamiss", "longdan_shanafter"],
		subSkill: {
			shanafter: {
				sub: true,
				audio: "longdan_sha",
				trigger: {
					player: "useCard",
				},
				filter(event, _player) {
					// @ts-expect-error 类型系统未来可期
					return event.skill == "longdan_shan" && event.getParent(2)?.name == "sha";
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget("是否发动【龙胆】令一名其他角色回复1点体力？", function (card, player, target) {
							return target != _status.event?.source && target != player;
						})
						.set("ai", function (target) {
							return get.attitude(_status.event?.player, target);
						})
						// @ts-expect-error 类型系统未来可期
						.set("source", trigger.getParent(2)?.player)
						.forResult();
				},
				logTarget: "targets",
				async content(event, _trigger, _player) {
					await event.targets[0].recover();
				},
			},
			shamiss: {
				sub: true,
				audio: "longdan_sha",
				trigger: {
					player: "shaMiss",
				},
				filter(event, player) {
					return event.skill == "longdan_sha";
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget("是否发动【龙胆】对一名其他角色造成1点伤害？", function (card, player, target) {
							return target != _status.event?.target && target != player;
						})
						.set("ai", function (target) {
							return -get.attitude(_status.event?.player, target);
						})
						.set("target", trigger.target)
						.forResult();
				},
				logTarget: "targets",
				async content(event, _trigger, _player) {
					await event.targets[0].damage();
				},
			},
			draw: {
				trigger: {
					player: ["useCard", "respond"],
				},
				audio: "longdan_sha",
				forced: true,
				locked: false,
				filter(event, player) {
					return event.skill == "longdan_sha" || event.skill == "longdan_shan";
				},
				async content(_event, _trigger, player) {
					player.draw();
				},
				sub: true,
			},
			sha: {
				audio: "longdan_sha",
				enable: ["chooseToUse", "chooseToRespond"],
				filterCard: {
					name: "shan",
				},
				viewAs: {
					name: "sha",
				},
				position: "hs",
				viewAsFilter(player) {
					if (!player.countCards("hs", "shan")) {
						return false;
					}
				},
				prompt: "将一张闪当杀使用或打出",
				check() {
					return 1;
				},
				ai: {
					effect: {
						target(card, player, target, current) {
							if (get.tag(card, "respondSha") && current < 0) {
								return 0.6;
							}
						},
					},
					respondSha: true,
					skillTagFilter(player) {
						if (!player.countCards("hs", "shan")) {
							return false;
						}
					},
					order() {
						return get.order({ name: "sha" }) + 0.1;
					},
				},
				sub: true,
			},
			shan: {
				audio: "longdan_sha",
				enable: ["chooseToRespond", "chooseToUse"],
				filterCard: {
					name: "sha",
				},
				viewAs: {
					name: "shan",
				},
				position: "hs",
				prompt: "将一张杀当闪使用或打出",
				check() {
					return 1;
				},
				viewAsFilter(player) {
					if (!player.countCards("hs", "sha")) {
						return false;
					}
				},
				ai: {
					respondShan: true,
					skillTagFilter(player) {
						if (!player.countCards("hs", "sha")) {
							return false;
						}
					},
					effect: {
						target(card, player, target, current) {
							if (get.tag(card, "respondShan") && current < 0) {
								return 0.6;
							}
						},
					},
				},
				sub: true,
			},
		},
		ai: {
			threaten: 1.3,
		},
	},

	// 冲阵：当你发动“龙胆”时，你可以弃置对方的一张手牌。 参考chongzhen(sp)
	chongzhen: {
		audio: 2,
		trigger: { player: ["useCard", "respond"] },
		filter(event, player) {
			if (event.card.name != "sha" && event.card.name != "shan") {
				return false;
			}
			if (!event.skill || event.skill.indexOf("longdan") == -1) {
				return false;
			}
			var target = lib.skill.chongzhen.logTarget(event, player);
			return target && target.countDiscardableCards(player, "h") > 0;
		},
		logTarget(event, player) {
			if (event.name == "respond") {
				return event.source;
			}
			if (event.card.name == "sha") {
				return event.targets[0];
			}
			return event.respondTo[0];
		},
		prompt2(event, player) {
			var target = lib.skill.chongzhen.logTarget(event, player);
			return "弃置" + get.translation(target) + "的一张手牌";
		},
		async content(event, trigger, player) {
			var target = lib.skill.chongzhen.logTarget(trigger, player);
			await player.discardPlayerCard(target, "h", true);
		},
		ai: {
			combo: "longdan",
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "respondShan") || get.tag(card, "respondSha")) {
						if (get.attitude(target, player) <= 0) {
							return 0.6;
						}
					}
				},
			},
		},
	},

// ========== machao 马超 ==========
	// 马术：锁定技，你与其他角色的距离-1。 参考gz_mashu
	mashu: {
		mod: {
			globalFrom(from, to, distance) {
				return distance - 1;
			},
		},
	},

	// 追命：当你使用【杀】指定唯一目标时，你可以使其一张武将牌的非锁定技失效，然后声明一种颜色并令目标角色弃置任意张牌，然后你展示其一张牌，若此牌颜色与你声明的相同，则你选择一项，此【杀】：不能被响应/伤害+1/不计入次数限制。 前半段"封一张武将牌"原实现写成了封单个技能，与描述不符，改用gz_tieji(guozhan)同款的fengyin_main/fengyin_vice（本项目guozhan模式自带，见mode/guozhan/src/skill/character/rest.js）封整张武将牌；后半段声明颜色部分是原创设计，保留
	zhuiming: {
		audio: "zhuiming",
		trigger: {
			player: "useCardToPlayered",
		},
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			return event.isFirstTarget && event.targets.length == 1 && event.target.isIn();
		},
		direct: true,
		async content(event, trigger, player) {
			let target = trigger.target;
			const targetMainShowing = !target.isUnseen(0);
			const targetViceShowing = !target.isUnseen(1);
			const controls = [];
			if (targetMainShowing && !target.hasSkill("fengyin_main")) {
				controls.push("主将");
			}
			if (targetViceShowing && !target.hasSkill("fengyin_vice")) {
				controls.push("副将");
			}
			if (controls.length) {
				const sealResult = await player
					.chooseControl(controls, "cancel2")
					.set("prompt", "追命：你可以令" + get.translation(target) + "的一张武将牌上的非锁定技于本回合内失效")
					.set("ai", () => {
						if (get.attitude(player, target) >= 0) {
							return "cancel2";
						}
						return controls[Math.floor(Math.random() * controls.length)];
					})
					.forResult();
				if (sealResult.control == "主将") {
					target.addTempSkill("fengyin_main");
					game.log(target, "的", "#g主将武将牌", "因〖追命〗而失效");
				} else if (sealResult.control == "副将") {
					target.addTempSkill("fengyin_vice");
					game.log(target, "的", "#g副将武将牌", "因〖追命〗而失效");
				}
			}
			let colors = Object.keys(lib.color).remove("none");
			let result = await player
				.chooseControl(colors, "cancel2")
				.set("prompt", get.prompt("zhuiming"))
				.set("prompt2", `声明一种颜色并令${get.translation(trigger.target)}弃置任意张牌`)
				.set("ai", () => {
					let player = get.player(),
						target = get.event().target,
						att = get.attitude(player, target) > 0 ? 1 : -1,
						colors = get.event().controls,
						known = target.getCards("e");
					if (att > 0) {
						return "cancel2";
					}
					known.addArray(target.getKnownCards(player));
					if (colors.includes("red") && !known.some(i => get.color(i) != "red")) {
						return "red";
					}
					known = 2 * known.filter(i => get.color(i) == colors[0]).length - known.length;
					if (Math.abs(known) > 1) {
						if (known > 1) {
							return colors[0];
						}
						return colors[1];
					}
					let list = get
						.event()
						.controls.map(i => [
							i,
							target
								.getCards("he")
								.map(get.value)
								.reduce((p, c) => p + c, 0),
						])
						.sort((a, b) => {
							return att * (a[1] - b[1]);
						});
					return list[0][0];
				})
				.set("target", target)
				.forResult();
			let color = result.control;
			if (color == "cancel2") {
				event.finish();
				return;
			}
			player.logSkill("zhuiming", target);
			player.popup(color, color == "red" ? "fire" : "thunder");
			game.log(player, "声明了", color);
			let prompt = `追命：${get.translation(player)}声明了${get.translation(color)}`,
				prompt2 = `请弃置任意张牌，然后其展示你一张牌，若此牌颜色为${get.translation(color)}，你可选择一项：此【杀】不计入次数限制/不可被响应/伤害+1`;
			await target
				.chooseToDiscard(prompt, prompt2, [1, Infinity], "he", true, "allowChooseAll")
				.set("ai", card => {
					let color = get.event().color,
						player = get.player();
					if (get.position(card) == "e" && get.color(card) == color) {
						return 2;
					}
					if (player.getHp() <= 2 && get.color(card) == color) {
						return Math.random() < 0.5;
					}
					return 0;
				})
				.set("color", color);
			if (target.countCards("he")) {
				result = await player
					.choosePlayerCard(target, "he", true)
					.set("ai", button => {
						let color = get.event().color,
							att = get.event().att;
						if (get.position(button.link) == "e" && get.color(button.link) == color) {
							return 100 * att;
						}
						return 1 + Math.random();
					})
					.set("color", color)
					.set("att", get.attitude(player, target) > 0 ? 1 : -1)
					.forResult();
			} else {
				event.finish();
				return;
			}
			let card = result.cards[0];
			player.showCards(card, `${get.translation(target)}因【追命】被展示`);
			if (get.color(card) == color) {
				const choice = await player
					.chooseControl(["不能被响应", "伤害+1", "不计入次数限制"], "cancel2")
					.set("prompt", "追命：请选择一项效果")
					.set("ai", () => {
						return "伤害+1";
					})
					.forResult();
				if (choice.control == "不能被响应") {
					trigger.directHit.addArray(game.players);
					game.log(trigger.card, "不可被响应");
				} else if (choice.control == "伤害+1") {
					let map = trigger.getParent().customArgs;
					let id = target.playerid;
					if (!map[id]) {
						map[id] = {};
					}
					if (typeof map[id].extraDamage != "number") {
						map[id].extraDamage = 0;
					}
					map[id].extraDamage++;
					game.log(trigger.card, "伤害+1");
				} else if (choice.control == "不计入次数限制") {
					let evt = trigger.getParent();
					if (evt.addCount !== false) {
						evt.addCount = false;
						const stat = player.getStat().card,
							name = trigger.card.name;
						if (typeof stat[name] == "number") {
							stat[name]--;
						}
					}
					game.log(trigger.card, "不计入次数限制");
				}
			}
		},
		ai: {
			threaten: 1.5,
		},
	},
	// 追命封锁武将牌所需的fengyin_main/fengyin_vice，参考本项目guozhan模式自带实现(mode/guozhan/src/skill/character/rest.js)，直接照抄到这里，避免分散在多个文件里
	fengyin_main: {
		init(player, skill) {
			player.addSkillBlocker(skill);
		},
		onremove(player, skill) {
			player.removeSkillBlocker(skill);
		},
		charlotte: true,
		skillBlocker(skill, player) {
			return lib.character[player.name1][3].includes(skill) && !lib.skill[skill].charlotte && !get.is.locked(skill, player);
		},
		mark: true,
		marktext: "主",
		intro: {
			content(storage, player, skill) {
				var list = player.getSkills(null, null, false).filter(function (i) {
					return lib.skill.fengyin_main.skillBlocker(i, player);
				});
				if (list.length) {
					return "失效技能：" + get.translation(list);
				}
				return "无失效技能";
			},
		},
	},
	fengyin_vice: {
		init(player, skill) {
			player.addSkillBlocker(skill);
		},
		onremove(player, skill) {
			player.removeSkillBlocker(skill);
		},
		charlotte: true,
		skillBlocker(skill, player) {
			return lib.character[player.name2][3].includes(skill) && !lib.skill[skill].charlotte && !get.is.locked(skill, player);
		},
		mark: true,
		marktext: "副",
		intro: {
			content(storage, player, skill) {
				var list = player.getSkills(null, null, false).filter(function (i) {
					return lib.skill.fengyin_vice.skillBlocker(i, player);
				});
				if (list.length) {
					return "失效技能：" + get.translation(list);
				}
				return "无失效技能";
			},
		},
	},

// ========== huangyueying 黄月英 ==========
	// 集智：当你使用非转化锦囊牌时，你可以摸一张牌。若此牌是基本牌，你可以弃置此牌然后本回合手牌上限+1。 参考gz_jizhi
	jizhi: {
		audio: "jizhi",
		trigger: { player: "useCard" },
		frequent: true,
		preHidden: true,
		filter(event) {
			return get.type(event.card) == "trick" && !event.card.viewAs;
		},
		async content(event, trigger, player) {
			const { cards } = await player.draw("nodelay").forResult();
			const gained = cards && cards[0];
			if (gained && get.type(gained) == "basic" && player.countCards("h", gained)) {
				const result = await player
					.chooseBool("集智：是否弃置摸到的" + get.translation(gained) + "，然后令本回合手牌上限+1？")
					.set("choice", get.value(gained, player) < 5)
					.forResult();
				if (result.bool) {
					await player.discard(gained);
					player.addTempSkill("jizhi_add");
					player.addMark("jizhi_add", 1, false);
				}
			}
		},
		subSkill: {
			add: {
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("jizhi_add");
					},
				},
				intro: { content: "手牌上限+#" },
			},
		},
		ai: {
			threaten: 1.4,
			noautowuxie: true,
		},
	},

	// 奇才：锁定技，你使用锦囊牌无距离限制，其他角色不能弃置你装备区里的防具牌与宝物牌。 参考reqicai(refresh)
	qicai: {
		audio: 2,
		mod: {
			targetInRange(card, player, target, now) {
				var type = get.type(card);
				if (type == "trick" || type == "delay") {
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

// ========== huangzhong 黄忠 ==========
	// 烈弓：你使用【杀】可以选择距离不大于此【杀】点数的角色为目标。当你使用【杀】指定目标后，你可以执行以下效果：1.若其手牌数小于等于你，其不能抵消此【杀】；2.若其体力值大于等于你，此【杀】伤害值+1。 参考gz_liegong
	liegong: {
		audio: "liegong",
		audioname: ["huangzhong"],
		mod: {
			targetInRange(card, player, target) {
				if (card.name == "sha" && typeof get.number(card) == "number" && get.distance(player, target) <= get.number(card)) {
					return true;
				}
			},
		},
		trigger: { player: "useCardToTargeted" },
		logTarget: "target",
		locked: false,
		check(event, player) {
			return get.attitude(player, event.target) <= 0;
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
				trigger.getParent().directHit.push(trigger.target);
				game.log(trigger.target, "不能响应", trigger.card);
			}
			if (trigger.target.hp >= player.hp) {
				const id = trigger.target.playerid;
				const map = trigger.getParent().customArgs;
				if (!map[id]) {
					map[id] = {};
				}
				if (typeof map[id].extraDamage != "number") {
					map[id].extraDamage = 0;
				}
				map[id].extraDamage++;
				game.log(trigger.card, "对", trigger.target, "的伤害值+1");
			}
		},
		ai: {
			threaten: 0.5,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (
					arg?.target &&
					arg?.card &&
					get.attitude(player, arg.target) <= 0 &&
					arg.card.name == "sha" &&
					player.countCards("h", function (card) {
						return card != arg.card && (!arg.card.cards || !arg.card.cards.includes(card));
					}) >= arg.target.countCards("h")
				) {
					return true;
				}
				return false;
			},
		},
	},

	// 摧锋：限定技，出牌阶段，你可以失去一点体力视为使用一张无距离限制的单目标伤害牌，此回合结束时，若此牌的目标于此回合受到的伤害值不为1，你重置此技能。 参考jsrgcuifeng(jsrg)
	cuifeng: {
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		locked: false,
		filterx(event, player) {
			return player.hp > 0;
		},
		chooseButton: {
			dialog(event, player) {
				let list = [];
				for (let name of lib.inpile) {
					let info = lib.card[name];
					if (!info || info.notarget || (info.selectTarget && info.selectTarget != 1) || !get.tag({ name: name }, "damage")) {
						continue;
					}
					if (name == "sha") {
						list.push(["基本", "", "sha"]);
						for (let nature of lib.inpile_nature) {
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
				return _status.event.getParent().filterCard(
					{
						name: button.link[2],
						nature: button.link[3],
						isCard: true,
						storage: { cuifeng: true },
					},
					player,
					_status.event.getParent()
				);
			},
			check(button) {
				let player = _status.event.player;
				let effect = player.getUseValue({
					name: button.link[2],
					nature: button.link[3],
					storage: { cuifeng: true },
				});
				if (effect > 0) {
					return effect;
				}
				return 0;
			},
			backup(links, player) {
				return {
					audio: "cuifeng",
					selectCard: -1,
					filterCard: () => false,
					popname: true,
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						isCard: true,
						storage: { cuifeng: true },
					},
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
									player.awakenedSkills.remove("cuifeng");
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
			targetInRange: card => {
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

// ========== weiyan 魏延 ==========
	// 狂骨：当你对距离1以内的角色造成1点伤害后，你可以回复1点体力或摸一张牌。 参考gz_kuanggu
	kuanggu: {
		audio: "kuanggu",
		audioname: ["weiyan"],
		trigger: {
			source: "damageSource",
		},
		filter(event, _player) {
			// @ts-expect-error 类型系统未来可期
			return event.checkKuanggu && event.num > 0;
		},
		getIndex(event, _player, _triggername) {
			return event.num;
		},
		preHidden: true,
		async cost(event, _trigger, player) {
			let choice;
			if (
				player.isDamaged() &&
				get.recoverEffect(player) > 0 &&
				player.countCards("hs", function (card) {
					return card.name == "sha" && player.hasValueTarget(card);
				}) >= player.getCardUsable("sha", void 0)
			) {
				choice = "recover_hp";
			} else {
				choice = "draw_card";
			}
			const next = player.chooseDrawRecover("###" + get.prompt(event.skill) + "###摸一张牌或回复1点体力");
			next.set("choice", choice);
			next.set("ai", function () {
				// @ts-expect-error 类型系统未来可期
				return _status.event.getParent().choice;
			});
			next.set("logSkill", event.skill);
			next.setHiddenSkill(event.skill);
			const { control } = await next.forResult();
			if (control == "cancel2") {
				return;
			}
			event.result = { bool: true, skill_popup: false };
		},
		async content(_event, _trigger, _player) {},
		ai: {
			threaten: 1.4,
		},
	},

	// 骛肆：出牌阶段限一次，当你对一名其他角色造成伤害后，本阶段内，你与其的距离视为1。 参考skill_old.js
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

// ========== pangtong 庞统 ==========
	// 连环：你可以将一张♣手牌当【铁索连环】使用或重铸。你使用【铁索连环】可以指定至多四个目标。
	// 参考skill_old.js/shenhua包lianhuan——之前直接在selectTarget()/filterOk()里把select[1]硬编码成4，绕开了backup.selectTarget()本该算出的真实范围(可能被其他效果动态调整)，和官方"新连环"的真实做法不同。
	// 改为保留铁索连环本身[1,2]的初始目标范围不变，用官方lianhuan_add子技能在useCard2阶段(结算前)一次性额外追加目标补到最多4个。
	lianhuan: {
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
		filterTarget(card, player, target) {
			const cardx = ui.selected.cards[0],
				event = _status.event,
				backup = event._backup;
			if (!cardx || game.checkMod(cardx, player, "unchanged", "cardEnabled2", player) === false) {
				return false;
			}
			const cardy = get.autoViewAs({ name: "tiesuo" }, [cardx]);
			return backup.filterCard(cardy, player, event) && backup.filterTarget(cardy, player, target);
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
			if (!target) {
				return 0;
			}
			const player = get.player();
			return get.effect(target, { name: "tiesuo" }, player, player);
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
						.chooseTarget(
							max > 1 ? [1, max] : 1,
							get.prompt("lianhuan"),
							"为" + get.translation(trigger.card) + "额外指定至多" + get.cnNumber(max) + "个目标",
							(card, player, target) => {
								return !_status.event.sourcex.includes(target) && lib.filter.targetEnabled2(_status.event.card, player, target);
							}
						)
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

	// 涅槃：限定技，当你处于濒死状态时，你可以弃置你区域里的所有牌，摸X张牌，体力回复至X点，并复原你的武将牌。（X为你的体力上限） 参考gz_niepan
	niepan: {
		audio: "niepan",
		unique: true,
		enable: "chooseToUse",
		mark: true,
		skillAnimation: true,
		limited: true,
		animationColor: "orange",
		init(player) {
			player.storage.niepan = false;
		},
		filter(event, player) {
			if (player.storage.niepan) {
				return false;
			}
			if (event.type == "dying") {
				if (player != event.dying) {
					return false;
				}
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			player.awakenSkill("niepan", void 0);
			player.storage.niepan = true;
			await player.discard(player.getCards("hej"));
			await player.link(false);
			await player.turnOver(false);
			const x = player.maxHp;
			await player.draw(x);
			if (player.hp < x) {
				await player.recover(x - player.hp);
			}
		},
		ai: {
			order: 1,
			skillTagFilter(player, arg, target) {
				if (player != target) {
					return false;
				}
			},
			save: true,
			result: {
				player(player) {
					if (player.hp <= 0) {
						return 10;
					}
					if (player.hp <= 2 && player.countCards("he") <= 1) {
						return 10;
					}
					return 0;
				},
			},
			threaten: 0.6,
		},
		intro: {
			content: "limited",
		},
	},

// ========== jiangwei 姜维 ==========
	// 挑衅：出牌阶段限一次，你可以令一名攻击范围内有你的其他角色选择一项：1.弃置一张手牌并对你使用一张【杀】；2.你弃置其一张牌。 参考tiaoxin(shenhua)
	tiaoxin: {
		audio: 2,
		audioname: ["sp_jiangwei", "xiahouba", "re_jiangwei", "gz_jiangwei", "ol_jiangwei"],
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.inRange(player) && target.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const result = await target
				.chooseToUse(
					function (card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					},
					"挑衅：弃置一张手牌并对" + get.translation(player) + "使用一张杀，或令其弃置你的一张牌"
				)
				.set("targetRequired", true)
				.set("complexSelect", true)
				.set("complexTarget", true)
				.set("filterTarget", function (card, player, target) {
					if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
						return false;
					}
					return lib.filter.filterTarget.apply(this, arguments);
				})
				.set("sourcex", player)
				.forResult();
			if (result.bool) {
				if (target.countCards("h") > 0) {
					await target.chooseToDiscard("he", true);
				}
			} else if (target.countCards("he") > 0) {
				player.discardPlayerCard(target, "he", true);
			}
		},
		ai: {
			order: 4,
			expose: 0.2,
			result: {
				target: -1,
				player(player, target) {
					if (target.countCards("h") == 0) {
						return 0;
					}
					if (target.countCards("h") == 1) {
						return -0.1;
					}
					if (player.hp <= 2) {
						return -2;
					}
					if (player.countCards("h", "shan") == 0) {
						return -1;
					}
					return -0.5;
				},
			},
			threaten: 1.1,
		},
	},

	// 遗志：每轮限一次，一名同势力角色的准备阶段开始时，你可以发动"观星"，其本回合视为拥有"看破"。 参考skill_old.js
	yizhi: {
		skillAnimation: true,
		animationColor: "soil",
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

// ========== liushan 刘禅 ==========
	// 放权：你可以跳过出牌阶段，然后本回合结束时，你可以弃置一张手牌或者使用一张非伤害类牌，令一名其他角色执行一个额外的回合。 参考fangquan(shenhua)
	fangquan: {
		audio: 2,
		trigger: { player: "phaseUseBefore" },
		filter(event, player) {
			return player.countCards("h") > 0 && !player.hasSkill("fangquan3");
		},
		preHidden: true,
		async cost(event, trigger, player) {
			const fang = player.countMark("fangquan2") == 0 && player.hp >= 2 && player.countCards("h") <= player.hp + 1;
			event.result = await player
				.chooseBool(get.prompt2(event.skill))
				.set("ai", function () {
					const player = get.player();
					if (!_status.event.fang) {
						return false;
					}
					return game.hasPlayer(function (target) {
						if (target.hasJudge("lebu") || target == player) {
							return false;
						}
						if (get.attitude(player, target) > 4) {
							return get.threaten(target) / Math.sqrt(target.hp + 1) / Math.sqrt(target.countCards("h") + 1) > 0;
						}
						return false;
					});
				})
				.set("fang", fang)
				.setHiddenSkill(event.name.slice(0, -5))
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.addTempSkill("fangquan2");
			player.addMark("fangquan2", 1, false);
		},
	},
	fangquan2: {
		trigger: { player: "phaseEnd" },
		locked: true,
		log: false,
		audio: false,
		onremove: true,
		sourceSkill: "fangquan",
		getIndex(event, player) {
			return player.countMark("fangquan2") || 1;
		},
		async cost(event, trigger, player) {
			const choiceList = ["弃置一张手牌", "使用一张非伤害类牌", "取消"];
			const choice = await player
				.chooseControl(choiceList)
				.set("choiceList", choiceList)
				.set("prompt", "是否弃置一张手牌或使用一张非伤害类牌，令一名其他角色进行一个额外回合？")
				.set("ai", function () {
					const player = get.player();
					if (
						!game.hasPlayer(function (target) {
							if (target.hasJudge("lebu") || target == player) {
								return false;
							}
							if (get.attitude(player, target) > 4) {
								return get.threaten(target) / Math.sqrt(target.hp + 1) / Math.sqrt(target.countCards("h") + 1) > 0;
							}
							return false;
						})
					) {
						return "取消";
					}
					return player.countCards("h") > 0 ? "弃置一张手牌" : "使用一张非伤害类牌";
				})
				.forResult();
			if (choice.control == "取消") {
				return;
			}
			if (choice.control == choiceList[0]) {
				const result = await player
					.chooseToDiscard("he", true)
					.set("ai", function (card) {
						return 20 - get.value(card);
					})
					.forResult();
				if (!result?.bool) {
					return;
				}
			} else {
				const result = await player
					.chooseToUse(function (card) {
						return !get.tag(card, "damage");
					})
					.set("prompt", "放权：请使用一张非伤害类牌")
					.forResult();
				if (!result?.bool) {
					return;
				}
			}
			const chooseTarget = player.chooseTarget(true, "请选择进行额外回合的目标角色", lib.filter.notMe);
			chooseTarget.ai = function (target) {
				const player = get.player();
				if (target.hasJudge("lebu") || get.attitude(player, target) <= 0) {
					return -1;
				}
				if (target.isTurnedOver()) {
					return 0.18;
				}
				return get.threaten(target) / Math.sqrt(target.hp + 1) / Math.sqrt(target.countCards("h") + 1);
			};
			event.result = await chooseTarget.forResult();
		},
		async content(event, trigger, player) {
			const [target] = event.targets;
			player.logSkill("fangquan", event.targets, "fire");
			target.markSkillCharacter("fangquan", player, "放权", "进行一个额外回合");
			target.insertPhase();
			player.removeMark("fangquan2");
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
			player.unmarkSkill("fangquan");
			player.removeSkill("fangquan3");
		},
	},

	// 享乐：锁定技，当你成为一名角色使用【杀】的目标后，该角色选择一项：1.弃置一张基本牌；2.令此【杀】对你无效。 参考xiangle(shenhua)
	xiangle: {
		audio: 2,
		audioname: ["re_liushan", "ol_liushan"],
		trigger: { target: "useCardToTargeted" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return event.card.name == "sha";
		},
		async content(event, trigger, player) {
			const eff = get.effect(player, trigger.card, trigger.player, trigger.player);
			const result = await trigger.player
				.chooseToDiscard("享乐：弃置一张基本牌，否则杀对" + get.translation(player) + "无效", function (card) {
					return get.type(card) == "basic";
				})
				.set("ai", function (card) {
					if (_status.event.eff > 0) {
						return 10 - get.value(card);
					}
					return 0;
				})
				.set("eff", eff)
				.forResult();
			if (!result?.bool) {
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
			threaten: 0.7,
		},
	},

// ========== menghuo 孟获 ==========
	// 祸首：锁定技，【南蛮入侵】对你无效；当其他角色使用【南蛮入侵】指定目标后，你代替其成为此牌的伤害来源。 参考huoshou(shenhua)
	huoshou: {
		audio: "huoshou1",
		audioname: ["re_menghuo"],
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
			threaten: 0.7,
		},
	},
	huoshou1: {
		audio: 2,
		audioname: ["re_menghuo"],
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
		audio: "huoshou1",
		audioname: ["re_menghuo"],
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

	// 再起：弃牌阶段结束时，你可以令至多X名与你势力相同的角色各选择一项：1.摸一张牌；2.令你回复1点体力（X为本回合置入弃牌堆的红色牌数）。 参考rezaiqi
	zaiqixx: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		direct: true,
		filter(event, player) {
			return lib.skill.zaiqixx.count() > 0;
		},
		trigger: {
			player: "phaseJieshuBegin",
		},
		async content(event, trigger, player) {
			let result;

			result = await player
				.chooseTarget([1, lib.skill.zaiqixx.count()], get.prompt2("zaiqixx"), (card, player, target) => {
					return target.side == player.side || sameGroup(target, player);
				})
				.set("ai", function (target) {
					return get.attitude(_status.event.player, target);
				})
				.forResult();

			if (result.bool) {
				var targets = result.targets;
				targets.sortBySeat();
				player.line(targets, "fire");
				player.logSkill("zaiqixx", targets);
				event.targets = targets;
			} else {
				return;
			}

			while (event.targets.length) {
				event.current = event.targets.shift();
				if (player.isHealthy()) {
					result = { index: 0 };
				} else {
					result = await event.current
						.chooseControl()
						.set("choiceList", ["摸一张牌", "令" + get.translation(player) + "回复1点体力"])
						.set("ai", function () {
							if (get.attitude(event.current, player) > 0) {
								return 1;
							}
							return 0;
						})
						.forResult();
				}

				if (result.index == 1) {
					event.current.line(player);
					await player.recover(event.current);
				} else {
					await event.current.draw();
				}
				await game.delay();
			}
		},
		count: () => get.discarded().filter(card => get.color(card) === "red").length,
	},

// ========== zhurong 祝融 ==========
	// 巨象：锁定技，【南蛮入侵】对你无效；其他角色使用的【南蛮入侵】结算结束后，你获得之。 参考juxiang(shenhua)
	juxiang: {
		locked: true,
		audio: "juxiang1",
		audioname: ["re_zhurong", "ol_zhurong"],
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
		audioname: ["re_zhurong", "ol_zhurong"],
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
		audio: "juxiang1",
		audioname: ["re_zhurong", "ol_zhurong"],
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

	// 烈刃：当你使用【杀】指定一个目标后，你可以与其拼点，若你赢，你获得其一张牌；若你没赢，你获得其拼点的牌，其获得你拼点的牌。 参考lieren(shenhua)
	lieren: {
		audio: 2,
		audioname: ["boss_lvbu3", "ol_zhurong"],
		trigger: { player: "useCardToTarget" },
		filter(event, player) {
			return event.card && event.card.name == "sha" && event.target && event.target.isIn() && player.canCompare(event.target);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2(event.skill)).set("ai", () => get.attitude(get.player(), trigger.target) < 0).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			const result = await player.chooseToCompare(target).forResult();
			if (result.tie) {
				return;
			}
			if (result.bool) {
				if (target.countGainableCards(player, "he")) {
					await player.gainPlayerCard(target, true, "he");
				}
			} else {
				const cards1 = [],
					cards2 = [];
				game.getGlobalHistory("cardMove", evt => {
					if (evt.getParent(2).name === "chooseToCompare" && evt.getParent(3) === event) {
						if (get.position(evt.cards[0], true) == "d") {
							if (evt.player === player) {
								cards1.addArray(evt.cards);
							} else if (evt.player === target) {
								cards2.addArray(evt.cards);
							}
						}
					}
				});
				if (cards1.length) {
					await target.gain(cards1, "gain2");
				}
				if (cards2.length) {
					await player.gain(cards2, "gain2");
				}
			}
		},
		check(event, player) {
			return get.attitude(player, event.player) < 0 && player.countCards("h") > 1;
		},
		ai: {
			threaten: 1.3,
		},
	},

// ========== ganfuren 甘夫人 ==========
	// 神智：准备阶段，你可以选择一名角色，弃置其一个区域中的最后一张牌或你的所有手牌，然后其回复1点体力。 参考shenzhi(sp)
	shenzhi: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return true;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill))
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "recover" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const areas = ["j", "e"].filter(pos => target.getCards(pos).length);
			const canArea = areas.length > 0;
			const canHand = player.countCards("h") > 0;
			if (canArea || canHand) {
				const choiceList = ["弃置其区域内最后一张牌", "弃置你的所有手牌"];
				const result = await player
					.chooseControl(choiceList)
					.set("choiceList", choiceList)
					.set("prompt", get.prompt2(event.skill))
					.forResult();
				if (result.control == choiceList[0] && canArea) {
					const pos = areas[areas.length - 1];
					const cards = target.getCards(pos);
					await target.discard(cards[cards.length - 1]);
				} else if (canHand) {
					await player.discard(player.getCards("h"));
				}
			}
			await target.recover();
		},
		ai: {
			threaten: 0.8,
			expose: 0.1,
		},
	},

	// 淑慎：每回合各限一次，当你回复1点体力后，你可以令一名其他角色摸两张牌；当你一次性获得至少两张牌后，你可以令一名其他角色回复1点体力。 参考gz_shushen
	shushen: {
		audio: "shushen",
		trigger: { player: "recoverEnd" },
		usable: 1,
		group: ["shushen2"],
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), lib.filter.notMe)
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "draw" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await event.targets[0].draw(2);
		},
		ai: {
			threaten: 0.8,
			expose: 0.1,
		},
	},
	shushen2: {
		audio: "shushen",
		trigger: { player: "gainAfter" },
		usable: 1,
		sourceSkill: "shushen",
		filter(event, player) {
			return event.cards && event.cards.length >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("shushen"), lib.filter.notMe)
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "recover" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await event.targets[0].recover();
		},
		ai: {
			threaten: 0.8,
			expose: 0.1,
		},
	},

// ========== xushu 徐庶 ==========
	// 无言：锁定技，你使用锦囊牌造成伤害时，或你受到锦囊牌的伤害时，防止之。 参考xinwuyan
	wuyan: {
		audio: 2,
		trigger: { source: "damageBegin2", player: "damageBegin4" },
		forced: true,
		check(event, player) {
			if (player == event.player) {
				return true;
			}
			return false;
		},
		filter(event, player) {
			return get.type(event.card, "trick") == "trick";
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
			threaten: 0.8,
		},
	},

	// 举荐：限定技，准备阶段，你可以选择一名其他角色，将此武将牌与其对应位置的一张武将牌交换。 参考skill_old.js
	jujian: {
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
					prompt: get.prompt2("jujian"),
					filterTarget(card, player, target) {
						return target != player;
					},
					ai(target) {
						const plyr = get.player();
						if (target.isUnseen()) {
							return -1;
						}
						return -get.attitude(plyr, target);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.awakenSkill(event.name);
			const myPos = player.name1 == "xushu" ? 1 : player.name2 == "xushu" ? 2 : player.name3 == "xushu" ? 3 : null;
			if (myPos == 1 || myPos == 2) {
				await player.transCharacter(target, myPos, myPos);
				return;
			}
			if (myPos == 3 && target.name3) {
				await xushuTransThird(player, target);
			}
		},
	},

// ========== jiangwanfeiyi 蒋琬&费祎 ==========
	// 生息：弃牌阶段结束时，若你未于此回合内造成过伤害，你可以摸两张牌。 参考shengxi(sp)
	shengxi: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: { player: "phaseDiscardEnd" },
		frequent: true,
		filter(event, player) {
			return !player.getStat("damage");
		},
		content() {
			player.draw(2);
		},
	},

	// 守成：当一名与你势力相同的角色于其回合外失去最后的手牌后，你可以令该角色摸一张牌。 参考shoucheng(sp)
	shoucheng: {
		init(player) {
			game.addGlobalSkill("shoucheng_draw", player);
		},
		onremove: () => {
			if (!game.hasPlayer(i => i.hasSkill("shoucheng", null, null, false), true)) {
				game.removeGlobalSkill("shoucheng_draw");
			}
		},
		trigger: {
			global: ["equipAfter", "addJudgeAfter", "loseAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		audio: 2,
		direct: true,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				if (current == _status.currentPhase || !sameGroup(current, player)) {
					return false;
				}
				var evt = event.getl(current);
				return evt && evt.hs && evt.hs.length && current.countCards("h") == 0;
			});
		},
		async content(event, trigger, player) {
			event.list = game
				.filterPlayer(function (current) {
					if (current == _status.currentPhase || !sameGroup(current, player)) {
						return false;
					}
					var evt = trigger.getl(current);
					return evt && evt.hs && evt.hs.length;
				})
				.sortBySeat(_status.currentPhase);
			while (true) {
				const target = event.list.shift();
				event.target = target;
				if (target.isIn() && target.countCards("h") == 0) {
					const result = await player
						.chooseBool(get.prompt2("shoucheng", target))
						.set("ai", function () {
							return get.attitude(_status.event.player, _status.event.getParent().target) > 0;
						})
						.forResult();
					if (result.bool) {
						player.logSkill(event.name, target);
						await target.draw();
					}
				}
				if (!event.list.length) {
					break;
				}
			}
		},
		ai: {
			threaten: 1.3,
		},
		subSkill: {
			draw: {
				trigger: { player: "dieAfter" },
				filter(event, player) {
					return !game.hasPlayer(current => {
						return current.hasSkill("shoucheng", null, null, false);
					}, true);
				},
				content() {
					game.removeGlobalSkill("shoucheng_draw");
				},
				ai: {
					noh: true,
					skillTagFilter(player, tag, arg) {
						if (player === _status.currentPhase || player.countCards("h") !== 1) {
							return false;
						}
						return game.hasPlayer(current => {
							return current.hasSkill("shoucheng") && player.isFriendOf(current);
						});
					},
				},
			},
		},
	},

// ========== madai 马岱 ==========
	// 潜袭：准备阶段，你可以摸一张牌，然后弃置一张牌，然后选择一名距离为1的角色，本回合其不能使用或打出与你弃置牌颜色相同的手牌，你使用牌无视其该颜色的防具。若其本回合没有失去过牌且受到伤害，出牌阶段结束时，你摸两张牌。 参考qianxi(yijiang)
	qianxi: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		preHidden: true,
		async content(event, trigger, player) {
			await player.draw();
			let result = await player
				.chooseToDiscard({
					position: "he",
					forced: true,
					ai(card) {
						const player = get.player();
						if (get.color(card, player)) {
							return 7 - get.value(card, player);
						}
						return 4 - get.value(card, player);
					},
				})
				.forResult();
			if (!result.bool || !result.cards?.length || !game.hasPlayer(current => current != player && get.distance(player, current) <= 1)) {
				return;
			}
			const color = get.color(result.cards[0], result.cards[0].original === "h" ? player : false);
			result = await player
				.chooseTarget({
					filterTarget(card, player, target) {
						return player !== target && get.distance(player, target) <= 1;
					},
					forced: true,
					ai(target) {
						return -get.attitude(_status.event.player, target);
					},
				})
				.forResult();
			if (result.bool && result.targets?.length) {
				const target = result.targets[0];
				target.storage.qianxi2 = color;
				player.storage.qianxi_targets = player.storage.qianxi_targets || {};
				player.storage.qianxi_targets[target.playerid] = { color: color, lost: false, damaged: false };
				player.line([target], "green");
				target.addTempSkill("qianxi2", "phaseAfter");
				target.markSkill("qianxi2");
				player.addTempSkill("qianxi3", "phaseAfter");
				player.markSkill("qianxi3");
			}
		},
		subSkill: {
			track: {
				sub: true,
				trigger: { global: ["loseAfter", "loseAsyncAfter", "damageEnd"] },
				silent: true,
				forced: true,
				filter(event, player) {
					const map = player.storage.qianxi_targets;
					return map && map[event.player?.playerid];
				},
				content() {
					const info = player.storage.qianxi_targets[trigger.player.playerid];
					if (trigger.name == "damage") {
						info.damaged = true;
					} else {
						info.lost = true;
					}
				},
			},
			settle: {
				sub: true,
				trigger: { player: "phaseUseEnd" },
				forced: true,
				filter(event, player) {
					return player.storage.qianxi_targets && Object.keys(player.storage.qianxi_targets).length;
				},
				async content(event, trigger, player) {
					const map = player.storage.qianxi_targets;
					let num = 0;
					for (const id in map) {
						if (!map[id].lost && map[id].damaged) {
							num++;
						}
					}
					if (num) {
						await player.draw(2);
					}
					player.storage.qianxi_targets = {};
				},
			},
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (tag !== "directHit_ai" || !arg.target.hasSkill("qianxi2")) {
					return false;
				}
				if (arg.card.name == "sha") {
					return (
						arg.target.storage.qianxi2 == "red" &&
						(!arg.target.hasSkillTag(
							"freeShan",
							false,
							{
								player: player,
								card: arg.card,
								type: "use",
							},
							true
						) ||
							player.hasSkillTag("unequip", false, {
								name: arg.card ? arg.card.name : null,
								target: arg.target,
								card: arg.card,
							}) ||
							player.hasSkillTag("unequip_ai", false, {
								name: arg.card ? arg.card.name : null,
								target: arg.target,
								card: arg.card,
							}))
					);
				}
				return arg.target.storage.qianxi2 == "black";
			},
			threaten: 1.2,
		},
	},
	qianxi2: {
		charlotte: true,
		mark: true,
		audio: false,
		sourceSkill: "qianxi",
		mod: {
			cardEnabled2(card, player) {
				if (get.color(card) == player.storage.qianxi2 && get.position(card) == "h") {
					return false;
				}
			},
		},
		intro: {
			content(color) {
				return "本回合不能使用或打出" + get.translation(color) + "的手牌";
			},
		},
	},
	qianxi3: {
		charlotte: true,
		mark: true,
		audio: false,
		sourceSkill: "qianxi",
		ai: {
			unequip: true,
			skillTagFilter(player, tag, arg) {
				if (tag !== "unequip" || !arg || !arg.target) {
					return false;
				}
				const info = player.storage.qianxi_targets && player.storage.qianxi_targets[arg.target.playerid];
				if (!info) {
					return false;
				}
				const armor = arg.target.getEquip(2);
				return !!armor && get.color(armor) == info.color;
			},
		},
		intro: {
			content: "你使用牌无视被“潜袭”标记的角色的对应颜色防具",
		},
	},

// ========== shamoke 沙摩柯 ==========
	// 蒺藜：当你于一回合内使用或打出第X张牌时，你可以摸X张牌（X为你的攻击范围）。你的回合结束时，你可以重铸装备区的武器牌。 参考gzjili(sp)
	jili2: {
		mod: {
			aiOrder(player, card, num) {
				if (player.isPhaseUsing() && get.subtype(card) == "equip1" && !get.cardtag(card, "gifts")) {
					var range0 = player.getAttackRange();
					var range = 0;
					var info = get.info(card);
					if (info && info.distance && info.distance.attackFrom) {
						range -= info.distance.attackFrom;
					}
					if (player.getEquip(1)) {
						var num = 0;
						var info = get.info(player.getEquip(1));
						if (info && info.distance && info.distance.attackFrom) {
							num -= info.distance.attackFrom;
						}
						range0 -= num;
					}
					range0 += range;
					if (
						range0 == player.getHistory("useCard").length + player.getHistory("respond").length + 2 &&
						player.countCards("h", function (cardx) {
							return get.subtype(cardx) != "equip1" && player.getUseValue(cardx) > 0;
						})
					) {
						return num + 10;
					}
				}
			},
		},
		trigger: { player: ["useCard", "respond", "phaseUseEnd"] },
		frequent: true,
		locked: false,
		preHidden: true,
		onremove(player) {
			player.removeTip("jili2");
		},
		filter(event, player) {
			if (event.name == "phaseUse") {
				return player.getEquip(1);
			}
			let count = player.getHistory("useCard").length + player.getHistory("respond").length;
			player.addTip("jili2", "蒺藜 " + count, true);
			return count == player.getAttackRange();
		},
		audio: 2,
		async content(event, trigger, player) {
			if (trigger.name == "phaseUseEnd") {
				const equip = player.getEquip(1);
				if (equip) {
					const result = await player.chooseBool(get.prompt2("jili2_recast", equip)).forResult();
					if (result.bool) {
						player.recast(equip);
					}
				}
				return;
			}
			await player.draw(player.getHistory("useCard").length + player.getHistory("respond").length);
		},
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

// ========== mifuren 糜夫人 ==========
	// 闺秀：当你明置此武将牌时，你可以摸两张牌；锁定技，当你移除此武将牌时，你可以将体力回复至一点或回复1点体力。 参考gz_guixiu(guozhan)
	guixiu: {
		audio: "guixiu",
		trigger: {
			player: ["showCharacterAfter", "removeCharacterBefore"],
		},
		unique: true,
		filter(event, player) {
			if (event.name == "removeCharacter" || event.name == "changeVice") {
				return get.character(event.toRemove, 3).includes("guixiu") && player.isDamaged();
			}
			return event.toShow.some(name => get.character(name, 3).includes("guixiu"));
		},
		// 参考官方gz_guixiu：明置时直接摸两张牌，没有chooseBool这一环节；若糜夫人是作为
		// 第三个武将(3将模式)获得的，一开始就是明置状态，没有showCharacterAfter这个环节。
		init(player, skill) {
			if (!player.storage.guixiu_shown && isCharacterShown(player, skill)) {
				player.storage.guixiu_shown = true;
				player.draw(2);
			}
		},
		async content(_event, trigger, player) {
			if (trigger.name == "showCharacter") {
				player.storage.guixiu_shown = true;
				await player.draw(2);
			} else {
				if (player.hp <= 0) {
					await player.recoverTo(1);
				} else {
					await player.recover();
				}
			}
		},
	},

	// 存嗣：锁定技，出牌阶段或你进入濒死时，你可以移除此武将牌，令一名角色获得“勇决”（与你势力相同的角色的出牌阶段，当其使用的第一张牌结算结束后，若此牌为【杀】，其令此【杀】不计入次数且可以获得之），然后若该角色不为你，其摸两张牌。 参考gz_cunsi(guozhan)
	cunsi: {
		audio: "cunsi",
		locked: true,
		trigger: { player: ["phaseUseBegin", "dying"] },
		filter(event, player) {
			return player.checkMainSkill("cunsi", false) || player.checkViceSkill("cunsi", false);
		},
		unique: true,
		forceunique: true,
		filterTarget: true,
		skillAnimation: true,
		animationColor: "orange",
		derivation: "gzyongjue",
		async content(event, _trigger, player) {
			const result = await player.chooseTarget("请选择获得〖勇决〗的角色", () => true).forResult();
			if (!result.bool || !result.targets?.length) {
				return;
			}
			const target = result.targets[0];
			if (player.checkMainSkill("cunsi", false)) {
				await player.removeCharacter(0);
			} else {
				await player.removeCharacter(1);
			}
			target.addSkills("gzyongjue");
			if (target != player) {
				await target.draw(2);
			}
		},
		ai: {
			order: 9,
			result: {
				player(player, target) {
					var num = 0;
					if (player.isDamaged() && target.isFriendOf(player)) {
						num++;
						if (target != player) {
							num += 0.5;
						}
					}
					return num;
				},
			},
			threaten: 0.7,
		},
	},

// ========== masu 马谡 ==========
	// 散谣：出牌阶段限一次，你可以弃置一张牌，然后对体力值或手牌数最大的一名角色造成1点伤害。 参考sanyao(yijiang)
	sanyao: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target.isMaxHp() || target.isMaxHandcard();
		},
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		check(card) {
			return 7 - get.value(card);
		},
		position: "he",
		filterCard: true,
		async content(event, trigger, player) {
			const { target } = event;
			target.damage("nocard");
		},
		ai: {
			result: {
				target(player, target) {
					if (target.countCards("j") && get.attitude(player, target) > 0) {
						return 1;
					}
					if (target.countCards("e")) {
						return -1;
					}
					return get.damageEffect(target, player);
				},
			},
			order: 7,
			threaten: 1.3,
		},
	},

	// 制蛮：当你对其他角色造成伤害时，你可以防止此伤害，然后获得其装备区或判定区里的一张牌。若其与你势力相同，其可以变更副将。（此效果每名角色限一次） 参考zhiman(yijiang)
	zhiman: {
		audio: 2,
		audioname2: {
			guansuo: "zhiman_guansuo",
			gz_guansuo: "zhiman_guansuo",
		},
		trigger: { source: "damageBegin2" },
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
			var cards = event.player.getGainableCards(player, "ej");
			for (var i = 0; i < cards.length; i++) {
				if (get.equipValue(cards[i]) >= 6) {
					return true;
				}
			}
			return false;
		},
		filter(event, player) {
			return player != event.player;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const target = trigger.player;
			const result = await player.chooseBool(get.prompt2("zhiman", target)).forResult();
			if (!result.bool) {
				return;
			}
			trigger.cancel();
			if (target.countGainableCards(player, "ej")) {
				await player.gainPlayerCard(target, "ej", true);
			}
			player.storage.zhiman_used = player.storage.zhiman_used || [];
			if (sameGroup(target, player) && !player.storage.zhiman_used.includes(target.playerid)) {
				player.storage.zhiman_used.push(target.playerid);
				const changeResult = await target.chooseBool(get.prompt2("zhiman_changevice")).forResult();
				if (changeResult.bool) {
					await target.changeVice();
				}
			}
		},
	},

// ========== wangping 王平 ==========
	// 将略：限定技，出牌阶段，你可以选择一个“军令”，与你势力相同的其他角色均可以执行该“军令”（未确定势力的角色可以在此时明置武将牌），你和所有执行“军令”的角色各加1点体力上限并回复1点体力，然后你摸X张牌（X为因此回复体力的角色数）。若你不为大势力，你可以变更此将。 参考jianglue(guozhan)
	jianglve: {
		limited: true,
		audio: 2,
		enable: "phaseUse",
		prepare(cards, player) {
			var targets = game.filterPlayer(function (current) {
				return current.isFriendOf(player) || current.isUnseen();
			});
			player.line(targets, "fire");
		},
		content() {
			"step 0";
			player.awakenSkill(event.name);
			player.addTempSkill("jianglve_count");
			player.chooseJunlingFor(player).set("prompt", "选择一张军令牌，令与你势力相同的其他角色选择是否执行");
			"step 1";
			event.junling = result.junling;
			event.targets = result.targets;
			event.players = game
				.filterPlayer(function (current) {
					if (current == player) {
						return false;
					}
					return current.isFriendOf(player) || (player.identity != "ye" && current.isUnseen());
				})
				.sort(lib.sort.seat);
			event.num = 0;
			event.filterName = function (name) {
				return lib.character[name][1] == player.identity && !get.is.double(name);
			};
			"step 2";
			if (num < event.players.length) {
				event.current = event.players[num];
			}
			if (event.current && event.current.isAlive()) {
				event.showCharacter = false;
				var choiceList = ["执行该军令，增加1点体力上限，然后回复1点体力", "不执行该军令"];
				if (event.current.isFriendOf(player)) {
					event.current
						.chooseJunlingControl(player, event.junling, targets)
						.set("prompt", "将略")
						.set("choiceList", choiceList)
						.set("ai", function () {
							if (event.junling == "junling6" && (event.current.countCards("h") > 3 || event.current.countCards("e") > 2)) {
								return 1;
							}
							return event.junling == "junling5" ? 1 : 0;
						});
				} else if ((event.filterName(event.current.name1) || event.filterName(event.current.name2)) && event.current.wontYe(player.identity)) {
					event.showCharacter = true;
					choiceList[0] = "明置一张武将牌以" + choiceList[0];
					choiceList[1] = "不明置武将牌且" + choiceList[1];
					event.current
						.chooseJunlingControl(player, event.junling, targets)
						.set("prompt", "将略")
						.set("choiceList", choiceList)
						.set("ai", function () {
							if (event.junling == "junling6" && (event.current.countCards("h") > 3 || event.current.countCards("e") > 2)) {
								return 1;
							}
							return event.junling == "junling5" ? 1 : 0;
						});
				} else {
					event.current.chooseJunlingControl(player, event.junling, targets).set("prompt", "将略").set("controls", ["ok"]);
				}
			} else {
				event.goto(4);
			}
			"step 3";
			event.carry = false;
			if (result.index == 0 && result.control != "ok") {
				event.carry = true;
				if (event.showCharacter) {
					var list = [];
					if (event.filterName(event.current.name1)) {
						list.push("主将");
					}
					if (event.filterName(event.current.name2)) {
						list.push("副将");
					}
					if (list.length > 1) {
						event.current.chooseControl(["主将", "副将"]).set("ai", function () {
							return Math.random() > 0.5 ? 0 : 1;
						}).prompt = "选择并展示一张武将牌，然后执行军令";
					} else {
						event._result = { index: list[0] == "主将" ? 0 : 1 };
					}
				}
			}
			"step 4";
			if (!event.list) {
				event.list = [player];
			}
			if (event.carry) {
				if (event.showCharacter) {
					event.current.showCharacter(result.index);
				}
				event.current.carryOutJunling(player, event.junling, targets);
				event.list.push(event.current);
			}
			event.num++;
			if (event.num < event.players.length) {
				event.goto(2);
			}
			"step 5";
			event.num = 0;
			player.storage.jianglve_count = 0;
			"step 6";
			if (event.list[num].isAlive()) {
				event.list[num].gainMaxHp(true);
				event.list[num].recover();
			}
			event.num++;
			"step 7";
			if (event.num < event.list.length) {
				event.goto(6);
			} else if (player.storage.jianglve_count > 0) {
				player.draw(player.storage.jianglve_count);
			}
			"step 8";
			event.canChange = !player.isMajor() && !!(_status.characterlist && _status.characterlist.length);
			if (event.canChange) {
				player.chooseBool("将略：是否变更此将？").set("ai", () => true);
			}
			"step 9";
			// 注意：这个content()是旧式"step N"写法，会被StepCompiler拆开重新编译，
			// 不能引用pickCharacterCandidates/applyCharacterChange这些模块作用域里的
			// 普通函数（拆开后找不到，会报"is not defined"），只能把逻辑原样内联在这里。
			event.doChange = !!(event.canChange && result && result.bool);
			if (event.doChange) {
				// 换将不再是直接随机抽1个焗给玩家，而是亮出2个候选让玩家自己选一个
				if (!_status.characterlist) {
					game.initCharacterList();
				}
				var pool = _status.characterlist.filter(function (name) {
					return lib.character[name];
				});
				pool.randomSort();
				event.candidates = pool.slice(0, Math.min(2, pool.length));
				if (!event.candidates.length) {
					event.doChange = false;
				} else if (event.candidates.length > 1) {
					player
						.chooseButton(["将略：请选择要变更为的武将", [event.candidates, "character"]])
						.set("filterButton", function (button) {
							return event.candidates.includes(button.link);
						})
						.set("ai", function (button) {
							return get.guozhanRank(button.link);
						});
				} else {
					event._result = { bool: true, links: event.candidates.slice() };
				}
			}
			"step 10";
			if (event.doChange && result && result.bool && result.links && result.links.length) {
				var newChar = result.links[0];
				var names3 = [player.name1, player.name2, player.name3].filter(Boolean);
				var slot = names3.findIndex(function (name) {
					return get.character(name, 3).includes("jianglve");
				});
				if (slot < 0) {
					slot = 0;
				}
				if (slot === 2) {
					var oldName3 = player.name3;
					if (oldName3 && lib.character[oldName3]) {
						get.character(oldName3, 3).forEach(function (oldSkill) {
							if (player.hasSkill(oldSkill, null, null, false)) {
								player.removeSkill(oldSkill);
							}
						});
					}
					if (_status.characterlist) {
						_status.characterlist.remove(newChar);
						if (oldName3) {
							_status.characterlist.add(oldName3);
						}
					}
					player.name3 = newChar;
					if (player.node.avatar3g) {
						player.node.avatar3g.setBackground(newChar, "character");
						player.node.avatar3g.show();
						player.node.name3.innerHTML = get.slimName(newChar);
						player.node.name3.show();
					}
					get.character(newChar, 3).forEach(function (newSkill) {
						if (lib.skill[newSkill]) {
							player.addSkill(newSkill);
						}
					});
					game.log(player, "将第三个武将从", "#b" + get.translation(oldName3), "变更为了", "#b" + get.translation(newChar));
				} else {
					var newPairs2 = [player.name1, player.name2].filter(Boolean);
					newPairs2[slot] = newChar;
					player.changeCharacter(newPairs2);
				}
			}
		},
		marktext: "略",
		skillAnimation: "epic",
		animationColor: "soil",
		ai: {
			order: 10,
			result: {
				player(player) {
					if (player.isUnseen() && player.wontYe()) {
						if (get.population(player.group) >= game.players.length / 4) {
							return 1;
						}
						return Math.random() > 0.7 ? 1 : 0;
					} else {
						return 1;
					}
				},
			},
			threaten: 0.8,
		},
		subSkill: {
			count: {
				sub: true,
				trigger: { global: "recoverAfter" },
				silent: true,
				filter(event) {
					return event.getParent("jianglve");
				},
				content() {
					player.storage.jianglve_count++;
				},
			},
		},
	},

// ========== fazheng 法正 ==========
	// 眩惑：其他角色的出牌阶段开始时，你可以交给其一张牌，然后其交给你两张牌。若其与你势力相同，其选择并获得以下技能之一直到回合结束：“武圣”、“咆哮”、“龙胆”、“铁骑”、“烈弓”、“狂骨”；不同，本轮不能再发动此技能。 参考gzxuanhuo(guozhan)
	xuanhuo: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return event.player != player && player.countCards("he") > 0 && !player.storage.xuanhuo_locked;
		},
		subSkill: {
			reset: {
				sub: true,
				trigger: { player: "phaseZhunbeiBegin" },
				silent: true,
				forced: true,
				content() {
					delete player.storage.xuanhuo_locked;
				},
			},
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const giveResult = await player.chooseToGive(target, "he", true).set("prompt", get.prompt2("xuanhuo", target)).forResult();
			if (!giveResult.bool) {
				return;
			}
			await target.chooseToGive(player, "he", 2, true);
			if (sameGroup(target, player)) {
				const list = ["wusheng", "paoxiao", "longdan", "gz_tieji", "liegong", "kuanggu"];
				const result = await target
					.chooseControl(list)
					.set("prompt", "眩惑：选择获得一项技能直到回合结束")
					.set("choiceList", ["武圣", "咆哮", "龙胆", "铁骑", "烈弓", "狂骨"])
					.set("ai", () => list[Math.floor(Math.random() * list.length)])
					.forResult();
				target.addTempSkill(result.control, "phaseAfter");
				target.popup(get.translation(result.control));
			} else {
				player.storage.xuanhuo_locked = true;
			}
		},
		ai: {
			order: 8,
			result: {
				player(player, target) {
					// AI自己知道自己的真实势力(player.group恒为真实势力，即使自己还暗置)，
					// 不需要像sameGroup那样要求双方identity都已确定——包括对方还暗置、亮出后才成为队友的情况。
					const isAlly = target => (player.identity == "ye" || target.identity == "ye" ? sameGroup(target, player) : target.group == player.group);
					if (isAlly(target)) {
						return 1;
					}
					// 对敌人发动本轮就不能再对任何人发动了(见filter里的xuanhuo_locked)，
					// 为避免提前把机会浪费在敌人身上，优先留着等队友；只有确定本轮不会再遇到队友、
					// 或对方手上有桃值得抢下来时，才对敌人发动。
					if (player.storage.xuanhuo_locked) {
						return 0;
					}
					let hasFutureAlly = false;
					for (let p = target.getNext(); p != player; p = p.getNext()) {
						if (p.isIn() && isAlly(p)) {
							hasFutureAlly = true;
							break;
						}
					}
					if (!hasFutureAlly) {
						return 1;
					}
					if (target.countCards("h", card => get.name(card) == "tao")) {
						return 1;
					}
					return 0;
				},
			},
			threaten: 1,
		},
	},

	// 恩怨：锁定技，当其他角色对你使用【桃】时，你令其摸一张牌；当你受到伤害后，伤害来源需交给你一张红色手牌，否则失去1点体力。 参考gzenyuan(guozhan)
	enyuan: {
		locked: true,
		audio: "xinenyuan",
		group: ["enyuan_gain", "enyuan_damage"],
		preHidden: true,
		ai: {
			maixie_defend: true,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return [1, -1.5];
					}
					if (!target.hasFriend()) {
						return;
					}
					if (get.tag(card, "damage")) {
						return [1, 0, 0, -0.7];
					}
				},
			},
		},
		subSkill: {
			gain: {
				audio: "xinenyuan",
				trigger: { target: "useCardToTargeted" },
				forced: true,
				filter(event, player) {
					return event.card.name == "tao" && event.player != player;
				},
				logTarget: "player",
				content() {
					trigger.player.draw();
				},
			},
			damage: {
				audio: "xinenyuan",
				trigger: { player: "damageEnd" },
				forced: true,
				filter(event, player) {
					return event.source && event.source != player && event.num > 0;
				},
				content() {
					"step 0";
					player.logSkill("enyuan_damage", trigger.source);
					trigger.source
						.chooseCard("交给" + get.translation(player) + "一张红色手牌，或失去1点体力", "h", card => get.color(card) == "red")
						.set("ai", function (card) {
							if (get.attitude(_status.event.player, _status.event.getParent().player) > 0) {
								return 11 - get.value(card);
							}
							return 7 - get.value(card);
						});
					"step 1";
					if (result.bool) {
						trigger.source.give(result.cards[0], player, "giveAuto");
					} else {
						trigger.source.loseHp();
					}
				},
			},
		},
	},

// ========== guanxing 关兴 ==========
	// 武佑：出牌阶段限一次，你可以与一名角色拼点，若你没赢，你本回合视为拥有“武圣”。然后拼点赢的角色视为对没赢的角色使用一张【决斗】。 参考stdwuyou(sixiang)
	wuyou: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => player.canCompare(current));
		},
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player.chooseToCompare(target).forResult();
			if (!result.bool) {
				player.addTempSkill(event.name + "_effect");
				await player.addAdditionalSkills(event.name + "_effect", "wusheng");
			}
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
		subSkill: {
			effect: {
				charlotte: true,
				mark: true,
				marktext: "佑",
				intro: {
					content: "视为拥有〖武圣〗",
				},
			},
		},
	},

	// 青龙：锁定技，当你使用的【杀】被目标角色使用的【闪】抵消后，你可以对其使用一张【杀】。 参考pshuiqiang(offline)
	qinglong: {
		trigger: { player: ["shaMiss", "eventNeutralized"] },
		forced: true,
		direct: true,
		clearTime: true,
		filter(event, player) {
			if (!event.card || event.card.name !== "sha") {
				return false;
			}
			return event.target.isIn() && player.canUse("sha", event.target, false) && (player.hasSha() || (_status.connectMode && player.hasCards("h")));
		},
		async content(event, trigger, player) {
			await player
				.chooseToUse({
					prompt: get.prompt2("qinglong", trigger.target),
					filterCard(card, player, event) {
						if (get.name(card) !== "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					},
					filterTarget: trigger.target,
					selectTarget: -1,
				})
				.set("addCount", false)
				.set("logSkill", "qinglong");
		},
		ai: {
			threaten: 1.2,
		},
	},

// ========== liaohua 廖化 ==========
	// 争先：锁定技，此武将牌首次明置后，你获得一个"先驱"标记。你的回合开始时，你可以执行一个额外出牌阶段；同势力其他角色的回合开始时，若其有"先驱"标记，你令其执行一个额外出牌阶段。 参考gzdangxian
	zhengxian: {
		skillAnimation: true,
		animationColor: "soil",
		trigger: { global: "phaseBegin" },
		forced: true,
		preHidden: true,
		audio: "dangxian",
		filter(event, player) {
			return event.player != player && event.player.isFriendOf(player) && event.player.hasMark("xianqu_mark");
		},
		async content(event, trigger, player) {
			// phaseBegin触发时trigger.num还是0(指向即将执行的phaseZhunbei)，直接splice(trigger.num,...)
			// 会把额外出牌阶段插到准备阶段前面；应该插在准备阶段和判定阶段之间，所以是trigger.num+1
			trigger.phaseList.splice(trigger.num + 1, 0, `phaseUse|${event.name}`);
		},
		group: ["zhengxian_show", "zhengxian_self"],
		global: "zhengxian_ai",
		// 若廖化是作为第三个武将(3将模式)获得的，一开始就是明置状态，没有showCharacterAfter这个环节，
		// 加skill时(player.addSkill)直接判定：此时若玩家已经没有任何武将牌处于暗置状态，视为"已明置"，直接给1枚先驱标记。
		init(player, skill) {
			if (!player.storage.zhengxian_draw && isCharacterShown(player, skill)) {
				player.storage.zhengxian_draw = true;
				player.addMark("xianqu_mark", 1);
			}
		},
		ai: {
			threaten: 1.1,
		},
		subSkill: {
			self: {
				audio: "dangxian",
				trigger: { player: "phaseBegin" },
				filter(event, player) {
					return player.hasMark("xianqu_mark");
				},
				async cost(event, trigger, player) {
					event.result = await player.chooseBool(get.prompt("zhengxian")).forResult();
				},
				async content(event, trigger, player) {
					// 同上：插在准备阶段和判定阶段之间，不是准备阶段前面
					trigger.phaseList.splice(trigger.num + 1, 0, `phaseUse|${event.name}`);
				},
			},
			ai: {
				ai: {
					keepXianqu: true,
					skillTagFilter(player, tag, arg) {
						if (player.countMark("xianqu_mark") > 1) {
							return false;
						}
						if (!game.hasPlayer(current => current.isFriendOf(player) && current.hasSkill("zhengxian"))) {
							return false;
						}
					},
				},
			},
			show: {
				audio: "dangxian",
				trigger: { player: "showCharacterAfter" },
				forced: true,
				filter(event, player) {
					return event.toShow.some(name => get.character(name, 3).includes("zhengxian")) && !player.storage.zhengxian_draw;
				},
				content() {
					player.storage.zhengxian_draw = true;
					player.addMark("xianqu_mark", 1);
				},
			},
		},
	},

// ========== guanping 关平 ==========
	// 龙吟：当一名角色于其出牌阶段内使用【杀】时，你可以弃置一张牌，令此【杀】不计入次数。若此【杀】为红色，你摸一张牌。当你以此法失去最后一张手牌时，你摸两张牌，然后此技能本回合失效。 参考longyin
	longyin: {
		audio: 2,
		audioname: ["ol_guanping"],
		init: player => {
			game.addGlobalSkill("longyin_order");
		},
		onremove: player => {
			if (!game.hasPlayer(current => current.hasSkill("longyin", null, null, false), true)) {
				game.removeGlobalSkill("longyin_order");
			}
		},
		trigger: { global: "useCard" },
		filter(event, player) {
			return event.card.name == "sha" && player.countCards("he") > 0 && event.player.isPhaseUsing();
		},
		async cost(event, trigger, player) {
			let go = false;
			if (get.attitude(player, trigger.player) > 0) {
				if (get.color(trigger.card) == "red") {
					go = true;
				} else if (trigger.addCount === false || !trigger.player.isPhaseUsing()) {
					go = false;
				} else if (!trigger.player.hasSkill("paoxiao") && !trigger.player.hasSkill("tanlin3") && !trigger.player.hasSkill("zhaxiang2") && !trigger.player.hasSkill("fengnu") && !trigger.player.getEquip("zhuge")) {
					var nh = trigger.player.countCards("h");
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
					} else if (nh >= 3) {
						if (nh == 3) {
							go = Math.random() < 0.5;
						} else if (nh == 2) {
							go = Math.random() < 0.2;
						}
					}
				}
			}
			if (go && !event.isMine() && !event.isOnline() && player.hasCard(card => get.value(card) < 6 && lib.filter.cardDiscardable(card, player, event.name), "he")) {
				await game.delayx();
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
			const handBefore = player.countCards("h");
			const usedHandCount = event.cards.filter(card => get.position(card) == "h").length;
			await player.discard({
				cards: event.cards,
				discarder: player,
			});
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
			if (usedHandCount > 0 && handBefore - usedHandCount <= 0) {
				await player.draw(2);
				player.tempBanSkill(event.name, "phaseAfter");
			}
		},
		ai: {
			expose: 0.2,
			threaten: 0.8,
		},
		subSkill: {
			order: {
				mod: {
					aiOrder: (player, card, num) => {
						if (num && card.name === "sha" && get.color(card) === "red") {
							let gp = game.findPlayer(current => {
								return current.hasSkill("longyin") && current.hasCard(i => true, "he");
							});
							if (gp) {
								return num + 0.15 * Math.sign(get.attitude(player, gp));
							}
						}
					},
				},
				trigger: { player: "dieAfter" },
				filter: (event, player) => {
					return !game.hasPlayer(current => current.hasSkill("longyin", null, null, false), true);
				},
				silent: true,
				forceDie: true,
				charlotte: true,
				content: () => {
					game.removeGlobalSkill("longyin_order");
				},
			},
		},
	},

// ========== jianyong 简雍 ==========
	// 巧说：出牌阶段，你可以与一名角色拼点，若你：赢，本回合你使用下一张基本牌或普通锦囊牌可以多（无距离限制）或少选择一个目标；没赢，本回合不能对自己以外的目标使用牌。 参考qiaoshui(yijiang)
	qiaoshui: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		audioname2: {
			re_jianyong: "reqiaoshui",
			xin_jianyong: "xinqiaoshui",
		},
		trigger: {
			player: "phaseUseBegin",
		},
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("qiaoshui"),
					filterTarget(card, player, target) {
						return player.canCompare(target);
					},
					ai(target) {
						const player = get.player();
						return -get.attitude(player, target) / target.countCards("h");
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
			threaten: 0.9,
		},
		subSkill: {
			2: {
				charlotte: true,
				mod: {
					targetEnabled(card, player, target) {
						if (player != target) {
							return false;
						}
					},
				},
			},
			3: {
				audio: "qiaoshui",
				trigger: {
					player: "useCard2",
				},
				silent: true,
				charlotte: true,
				sourceSkill: "qiaoshui",
				filter(event, player) {
					const type = get.type(event.card);
					return type == "basic" || type == "trick";
				},
				async content(event, trigger, player) {
					player.removeSkill(event.name);

					// 00，01，10，11分别表示是否可以增加目标和是否可以减少目标
					// 0b00: Neither，0b01: Add，0b10: Remove，0b11: Both
					let flags = 0;

					// 是否能增加目标
					const info = get.info(trigger.card);
					if (trigger.targets && !info.multitarget) {
						const players = game.filterPlayer();
						for (const target of players) {
							if (lib.filter.targetEnabled2(trigger.card, player, target) && !trigger.targets.includes(target)) {
								flags |= 0b01;
								break;
							}
						}
					}

					// 是否能减少目标
					if (!info.multitarget && trigger.targets && trigger.targets.length > 1) {
						flags |= 0b10;
					}

					if (flags === 0) {
						return;
					}

					// 增加目标的流程（不受距离限制）
					const addTarget = async forced => {
						const result = await player
							.chooseTarget({
								prompt: forced ? `巧说：为${get.translation(trigger.card)}额外指定一名目标` : `巧说：是否为${get.translation(trigger.card)}额外指定一名目标？`,
								filterTarget(card, player, target) {
									const currentEvent = get.event();
									if (currentEvent.targets.includes(target)) {
										return false;
									}
									return lib.filter.targetEnabled2(currentEvent.card, currentEvent.player, target);
								},
								forced,
								ai(target) {
									const trigger = _status.event.getTrigger();
									const player = _status.event.player;
									return get.effect(target, trigger.card, player, player);
								},
							})
							.set("targets", trigger.targets)
							.set("card", trigger.card)
							.forResult();

						if (!result.bool || !result.targets?.length) {
							return;
						}

						if (!event.isMine()) {
							await game.delayx();
						}
						const target = result.targets[0];
						player.logSkill("qiaoshui3", target);
						trigger.targets.add(target);
					};

					// 减少目标的流程
					const removeTarget = async forced => {
						const result = await player
							.chooseTarget({
								prompt: forced ? `巧说：减少一名${get.translation(trigger.card)}的目标` : `巧说：是否减少一名${get.translation(trigger.card)}的目标？`,
								filterTarget(card, player, target) {
									return get.event().targets.includes(target);
								},
								forced,
								ai(target) {
									const trigger = get.event().getTrigger();
									return -get.effect(target, trigger.card, trigger.player, get.player());
								},
							})
							.set("targets", trigger.targets)
							.forResult();

						if (!result.bool || !result.targets?.length) {
							return;
						}

						const target = result.targets[0];
						if (event.isMine()) {
							player.logSkill("qiaoshui3", target);
						}
						trigger.targets.remove(target);
						await game.delay();
						if (!event.isMine()) {
							player.logSkill("qiaoshui3", target);
						}
					};

					const items = [addTarget, removeTarget];

					switch (flags) {
						case 0b01:
						case 0b10:
							await items[flags - 1](false);
							break;
						case 0b11: {
							const result = await player
								.chooseControlList({
									prompt: get.prompt("qiaoshui3"),
									list: [`为${get.translation(trigger.card)}增加一个目标`, `为${get.translation(trigger.card)}减少一个目标`],
									ai() {
										return get.event().add ? 0 : 1;
									},
								})
								.set("add", get.effect(player, trigger.card, trigger.player, player) >= 0)
								.forResult();

							if (result.control === "cancel2") {
								return;
							}

							await items[result.index](true);
						}
					}
				},
			},
		},
	},

	// 纵适：当你拼点后，若你赢，你可以获得与你拼点角色的拼点牌；没赢，你可以获得你拼点的牌。 参考jyzongshi
	jyzongshi: {
		audio: 2,
		audioname: ["re_jianyong"],
		trigger: {
			global: ["chooseToCompareAfter", "compareMultipleAfter"],
		},
		getCards(event, player) {
			if (event.compareMultiple) {
				return [];
			}
			if (event.compareMeanwhile) {
				const index = [...event.targets, event.player].indexOf(player),
					winner = event.winner || event.result.winner;
				if (index < 0) {
					return [];
				}
				return event.cards
					.filter((card, i) => {
						return (i == index) != (winner == player);
					})
					.filterInD("od");
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
			if (event.preserve) {
				return false;
			}
			const cards = get.info("jyzongshi").getCards(event, player);
			return cards.length;
		},
		check(event, player) {
			const cards = get.info("jyzongshi").getCards(event, player);
			return cards.every(card => card.name != "du");
		},
		async content(event, trigger, player) {
			const cards = get.info(event.name).getCards(trigger, player);
			await player.gain(cards, "gain2", "log");
		},
	},

// ========== koufeng 寇封 ==========
	// 怀兵：准备阶段，你可以选择两名角色，获得这两名角色各一张手牌，然后你展示手牌，令其中体力值较少的角色下个摸牌阶段摸牌数、出牌阶段【杀】的使用次数、弃牌阶段手牌上限改为其中红色牌的数量。 参考sxrmhuaibing
	huaibing: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			return game.countPlayer(current => current.countCards("h")) >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), 2, (card, player, target) => {
					return target.countCards("h");
				})
				.set("ai", target => {
					const player = get.player();
					let eff = get.effect(target, { name: "shunshou_copy2" }, player, player),
						count = player.countCards("h", { color: "red" }) - 2;
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
		async content(event, trigger, player) {
			const gains = event.targets.filter(current => current != player && current.countCards("h"));
			if (gains.length) {
				await player.gainMultiple(gains, "h");
			}
			await player.showHandcards(`${get.translation(player)}发动了【怀兵】`);
			const num = event.targets.reduce((sum, current) => sum + current.getHp(), 0) / 2,
				current = event.targets.find(current => current.getHp() < num);
			if (!current) {
				return;
			}
			const red = player.countCards("h", { color: "red" });
			for (const key of ["Draw", "Use", "Discard"]) {
				current.addTempSkill(`${event.name}_${key}`, { player: `phase${key}After` });
				current.setStorage(`${event.name}_${key}`, red);
				current.markSkill(`${event.name}_${key}`);
			}
		},
		subSkill: {
			Draw: {
				charlotte: true,
				marktext: "摸",
				intro: {
					content: "下个摸牌阶段摸牌数改为#",
				},
				onremove: true,
				trigger: {
					player: "phaseDrawBegin2",
				},
				filter(event, player) {
					const storage = player.getStorage("huaibing_Draw", 0);
					return !event.numFixed && typeof storage == "number";
				},
				firstDo: true,
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					trigger.num = player.getStorage(event.name, 0);
					trigger.numFixed = true;
				},
			},
			Use: {
				charlotte: true,
				marktext: "杀",
				intro: {
					content: "下个出牌阶段出【杀】次数改为#",
				},
				onremove: true,
				trigger: {
					player: "phaseUseBegin",
				},
				filter(event, player) {
					const storage = player.getStorage("huaibing_Use", 0);
					return typeof storage == "number";
				},
				firstDo: true,
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					player
						.when("phaseUseAfter")
						.step(async () => {})
						.assign({
							mod: {
								cardUsable(card, player, num) {
									const storage = player.getStorage("huaibing_Use", 0);
									if (typeof storage != "number" || card.name != "sha") {
										return;
									}
									return storage;
								},
							},
						});
				},
			},
			Discard: {
				charlotte: true,
				marktext: "弃",
				intro: {
					content: "下个弃牌阶段手牌上限改为#",
				},
				onremove: true,
				trigger: {
					player: "phaseDiscardBegin",
				},
				filter(event, player) {
					const storage = player.getStorage("huaibing_Discard", 0);
					return typeof storage == "number";
				},
				firstDo: true,
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					player
						.when("phaseDiscardAfter")
						.step(async () => {})
						.assign({
							mod: {
								maxHandcardFinal(player, num) {
									const storage = player.getStorage("huaibing_Discard", 0);
									if (typeof storage != "number") {
										return;
									}
									return storage;
								},
							},
						});
				},
			},
		},
		ai: {
			threaten: 1.2,
		},
	},

// ========== wuyi 吴懿 ==========
	// 奔袭：锁定技，当你于回合内使用牌时，本回合你计算与其他角色的距离-1。 参考gz_ol_benxi
	benxi: {
		audio: "benxi",
		trigger: {
			player: "useCard",
		},
		filter(event, player) {
			return player == _status.currentPhase;
		},
		forced: true,
		async content(event, trigger, player) {
			const name = `${event.name}_effect`;
			player.addTempSkill(name);
			player.addMark(name, 1, false);
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				intro: {
					markcount(storage, player) {
						return -1 * (storage || 0);
					},
					content: "计算与其他角色距离-#",
				},
				mod: {
					globalFrom(from, to, distance) {
						return distance - from.countMark("benxi_effect");
					},
				},
			},
		},
		ai: {
			threaten: 1.1,
		},
	},

	// 转征：每轮限两次，出牌阶段，你可以选择一名距离1以内的同势力角色，你摸X张牌，然后其可以与你副将易位（X为你与其之间的角色数且至少为1）。 参考gz_ol_zhuanzheng
	zhuanzheng: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			if (player.countMark("zhuanzheng_used") >= 1 + player.countMark("zhuanzheng_more")) {
				return false;
			}
			return game.hasPlayer(current => player.isFriendOf(current));
		},
		filterTarget(card, player, target) {
			return player.isFriendOf(target) && get.distance(player, target) <= 1;
		},
		async content(event, trigger, player) {
			const { target } = event,
				name = `${event.name}_used`;
			player.addTempSkill(name, { global: "roundStart" });
			player.addMark(name, 1, false);
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
			if (target !== player) {
				const result = await target
					.chooseBool(`是否与${get.translation(player)}交换副将？`)
					.set("choice", Math.random() > 0.5)
					.forResult();
				if (result.bool) {
					player.addTempSkill(`${event.name}_more`, { global: "roundStart" });
					player.addMark(`${event.name}_more`, 1, false);
					// @ts-expect-error 祖宗之法就是这么做的
					await player.transCharacter(target);
				}
			}
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
			more: {
				charlotte: true,
				onremove: true,
			},
		},
	},

// ========== zhangsong 张松 ==========
	// 强识：出牌阶段开始时，你可以展示一名其他角色的一张手牌，然后你本阶段使用此类别的非转化牌后可摸一张牌。 参考qiangzhi(yijiang)
	qiangzhi: {
		audio: 2,
		audioname: ["re_zhangsong"],
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && current.countCards("h") > 0;
			});
		},
		subfrequent: ["draw"],
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("qiangzhi"),
					filterTarget(card, player, target) {
						return target !== player && target.countCards("h") > 0;
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
			const result = await player
				.choosePlayerCard({
					target,
					position: "h",
					forced: true,
				})
				.forResult();
			if (!result.cards?.length) {
				return;
			}
			const card = result.cards[0];
			await target.showCards(card, get.translation(target) + "因【强识】展示");
			player.storage.qiangzhi_draw = get.type(card, "trick");
			game.addVideo("storage", player, ["qiangzhi_draw", player.storage.qiangzhi_draw]);
			player.addTempSkill("qiangzhi_draw", "phaseUseEnd");
		},
		subSkill: {
			draw: {
				trigger: { player: "useCard" },
				frequent: true,
				popup: false,
				charlotte: true,
				prompt: "是否执行【强识】的效果摸一张牌？",
				sourceSkill: "qiangzhi",
				filter(event, player) {
					return !event.card.viewAs && get.type(event.card, "trick") == player.storage.qiangzhi_draw;
				},
				async content(event, trigger, player) {
					player.draw("nodelay");
				},
				onremove: true,
				mark: true,
				intro: {
					content(type) {
						return get.translation(type) + "牌";
					},
				},
			},
		},
	},

	// 献图：其他角色出牌阶段开始时，你可以摸两张牌，然后交给其等量牌。此阶段结束时，若本回合没有角色进入濒死状态，你失去1点体力。 参考xiantu(yijiang)
	xiantu: {
		audio: 2,
		logAudio(event) {
			if (typeof event == "string") {
				return "xiantu2.mp3";
			}
			return 1;
		},
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return event.player != player;
		},
		logTarget: "player",
		prompt2: "摸两张牌，然后交给其等量牌。若本回合没有角色进入濒死状态，则你失去1点体力。",
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
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (get.mode() !== "identity" || player.identity !== "nei") {
				player.addExpose(0.2);
			}
			await player.draw(2);
			const result = await player
				.chooseCard(2, "he", true, `交给${get.translation(target)}两张牌`)
				.set("ai", card => {
					if (ui.selected.cards.length && card.name == ui.selected.cards[0].name) {
						return -1;
					}
					if (get.tag(card, "damage")) {
						return 1;
					}
					if (get.type(card) == "equip") {
						return 1;
					}
					return 0;
				})
				.forResult();
			if (result?.bool && result.cards?.length) {
				player.give(result.cards, target);
				player.addTempSkill("xiantu_mark", { global: "phaseAnyEnd" });
				player
					.when({
						global: "phaseAnyEnd",
					})
					.filter(evt => evt == event.getParent(evt.name, true, true))
					.step(async (event, trigger, player) => {
						if (
							game.hasGlobalHistory("everything", evt => {
								if (evt.name != "dying") {
									return false;
								}
								return evt.getParent(trigger.name, true) == trigger;
							})
						) {
							return;
						}
						player.logSkill("xiantu", null, null, null, ["loseHp"]);
						await player.loseHp();
					});
			}
		},
		ai: {
			threaten: 1.1,
		},
	},
	// 献图的配套标记技能：在等待“此阶段结束时判定是否失去体力”期间，用于向他人展示该效果正在生效（无独立描述，随xiantu一起实现）。
	xiantu_mark: {
		charlotte: true,
		onremove: true,
		intro: {
			content: "此阶段结束时，若本回合没有角色进入濒死状态，你将失去1点体力",
		},
	},

// ========== zhoucang 周仓 ==========
	// 忠勇：每回合限一次，当同势力角色使用【杀】结算结束后，你可以令其获得此【杀】或目标角色使用的【闪】，然后其可以对此【杀】的目标角色使用一张【杀】。 参考zhongyong(yijiang)
	zhongyong: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: {
			player: "shaMiss",
		},
		filter(event, player) {
			return event.responded && get.itemtype(event.responded.cards) == "cards";
		},
		async cost(event, trigger, player) {
			const cards = trigger.responded.cards;

			event.result = await player
				.chooseTarget({
					prompt: `忠勇：将${get.translation(trigger.responded.cards)}交给一名角色`,
					filterTarget(card, player, target) {
						return target !== get.event().source;
					},
					ai(target) {
						let att = get.attitude(get.player(), target);
						const cards = target.getCards("h");
						if (cards.length >= 2 && cards.some(card => card.name === "shan")) {
							att /= 1.5;
						}
						return att;
					},
				})
				.set("source", trigger.target);
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const cards = trigger.responded.cards;
			const target = event.targets[0];
			if (target === player) {
				return;
			}

			await player
				.chooseToUse({
					prompt: `是否对${get.translation(trigger.target)}使用一张杀？`,
					filterCard(card) {
						return card.name === "sha";
					},
					filterTarget(card, player, target) {
						return target === get.event().target;
					},
					selectTarget: -1,
				})
				.set("target", trigger.target)
				.set("addCount", false);
		},
		ai: {
			threaten: 1.1,
		},
	},

// ========== liuchen 刘谌 ==========
	// 战绝：出牌阶段，你可以将所有手牌（至少一张）当一张【决斗】使用，结算完成后，你摸一张牌，然后受伤角色各摸一张牌。每阶段你因“战绝”摸第两张牌后，此阶段“战绝”失效。 参考zhanjue(yijiang)
	zhanjue: {
		audio: 2,
		enable: "phaseUse",
		filterCard: true,
		selectCard() {
			const player = _status.event.player;
			return [player.countCards("h"), player.countCards("h")];
		},
		position: "h",
		filter(event, player) {
			if (player.getStat().skill.zhanjue_draw && player.getStat().skill.zhanjue_draw >= 2) {
				return false;
			}
			var hs = player.getCards("h");
			if (!hs.length) {
				return false;
			}
			for (var i = 0; i < hs.length; i++) {
				var mod2 = game.checkMod(hs[i], player, "unchanged", "cardEnabled2", player);
				if (mod2 === false) {
					return false;
				}
			}
			return true;
		},
		viewAs: { name: "juedou" },
		group: ["zhanjue4"],
		ai: {
			damage: true,
			order(item, player) {
				return 0.8;
			},
			tag: {
				respond: 2,
				respondSha: 2,
				damage: 1,
			},
			result: {
				player(player, target) {
					let td = get.damageEffect(target, player, target);
					if (!td) {
						return 0;
					}
					if (td > 0) {
						return 1;
					}
					return -1;
				},
				target(player, target) {
					let td = get.damageEffect(target, player, target) / get.attitude(target, target);
					return td > 0 ? td + 1 : -1;
				},
			},
			nokeep: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "nokeep") {
					return (!arg || (arg.card && get.name(arg.card) === "tao")) && player.isPhaseUsing() && get.skillCount("zhanjue_draw") < 2 && player.hasCard(card => get.name(card) != "tao", "h");
				}
			},
			threaten: 1.4,
		},
	},
	zhanjue2: {
		audio: false,
		trigger: { player: "phaseBefore" },
		silent: true,
		sourceSkill: "zhanjue",
		async content(event, trigger, player) {
			player.storage.zhanjue = 0;
		},
	},
	zhanjue3: {
		audio: false,
		trigger: { player: "damageAfter", source: "damageAfter" },
		forced: true,
		popup: false,
		sourceSkill: "zhanjue",
		filter(event, player) {
			return event.parent.skill == "zhanjue";
		},
		async content(event, trigger, player) {
			trigger.player.addTempSkill("zhanjue5");
		},
	},
	zhanjue4: {
		audio: false,
		trigger: { player: "useCardAfter" },
		forced: true,
		popup: false,
		sourceSkill: "zhanjue",
		filter(event, player) {
			return event.skill == "zhanjue";
		},
		async content(event, trigger, player) {
			const stat = player.getStat().skill;
			stat.zhanjue_draw ??= 0;
			++stat.zhanjue_draw;
			await player.draw({ nodelay: true });
			const list = game.filterPlayer(current => {
				if (current.getHistory("damage", evt => evt.card === trigger.card).length > 0) {
					if (current === player) {
						stat.zhanjue_draw++;
					}
					return true;
				}
				return false;
			});
			if (list.length) {
				list.sortBySeat();
				await game.asyncDraw(list);
			}
			await game.delay();
		},
	},
	zhanjue5: {},

	// 勤王：你可以弃置一张牌，然后发动一次“激将”。响应此“激将”打出【杀】的角色摸一张牌。 参考qinwang(yijiang)
	qinwang: {
		audio: "qinwang1",
		group: ["qinwang1"],
		filter(event, player) {
			return player.countCards("he") > 0 && game.hasPlayer(current => current != player && sameGroup(current, player));
		},
		enable: ["chooseToUse", "chooseToRespond"],
		viewAs: {
			name: "sha",
			cards: [],
			suit: "none",
			number: null,
			isCard: true,
		},
		filterCard: lib.filter.cardDiscardable,
		position: "he",
		check(card) {
			const player = _status.event.player;
			const players = game.filterPlayer();
			for (let i = 0; i < players.length; i++) {
				const nh = players[i].countCards("h");
				if (players[i] != player && sameGroup(players[i], player) && get.attitude(players[i], player) > 2 && nh >= 3 && players[i].countCards("h", "sha")) {
					return 5 - get.value(card);
				}
			}
			return 0;
		},
		ai: {
			order() {
				return get.order({ name: "sha" }) - 0.3;
			},
			respondSha: true,
			skillTagFilter(player) {
				if (!player.countCards("he") || !game.hasPlayer(current => current != player && sameGroup(current, player))) {
					return false;
				}
			},
		},
	},
	qinwang1: {
		audio: 2,
		trigger: { player: ["useCardBegin", "respondBegin"] },
		logTarget: "targets",
		sourceSkill: "qinwang",
		filter(event, player) {
			return event.skill == "qinwang";
		},
		forced: true,
		async content(event, trigger, player) {
			delete trigger.skill;
			delete trigger.card.cards;
			await player.discard(trigger.cards);
			delete trigger.cards;
			trigger.getParent().set("jijiang", true);
			let current = player.next;
			while (current != player) {
				if (!sameGroup(current, player)) {
					current = current.next;
					continue;
				}
				const next = current
					.chooseToRespond({
						prompt: "是否替" + get.translation(player) + "打出一张杀？",
						ai() {
							const event = get.event();
							return get.attitude(event.player, event.source) - 2;
						},
					})
					.set("filterCard", function (card, player) {
						if (get.name(card) !== "sha") {
							return false;
						}
						return lib.filter.cardRespondable(card, player);
					})
					.set("source", player)
					.set("jijiang", true)
					.set("skillwarn", "替" + get.translation(player) + "打出一张杀");
				next.noOrdering = true;
				next.autochoose = lib.filter.autoRespondSha;
				const result = await next.forResult();
				if (result.bool) {
					await current.draw();
					trigger.card = result.card;
					trigger.cards = result.cards;
					trigger.throw = false;
					return;
				}
				current = current.next;
			}
		},
	},

// ========== huanghao 黄皓 ==========
	// 贿生：当你受到其他角色造成的伤害时，你可以展示任意张牌，令伤害来源观看之并选择一项：1.获得其中至多x张牌，防止x点伤害（x为本次伤害值）；2.弃置等量的牌。 参考huisheng(yijiang)
	huisheng: {
		audio: 2,
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			if (!player.countCards("he")) {
				return false;
			}
			if (!event.source || event.source == player || !event.source.isIn()) {
				return false;
			}
			return true;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: get.prompt2("huisheng", trigger.source),
					selectCard: [1, player.countCards("he")],
					position: "he",
				})
				.forResult();
		},
		logTarget(event) {
			return event?.source;
		},
		async content(event, trigger, player) {
			await game.delay();
			const cards = event.cards;
			const x = Math.max(1, trigger.num || 1);
			const num = Math.min(x, cards.length);
			const source = trigger.source;
			const result = await source
				.chooseButton({
					createDialog: [`获得其中至多${num}张牌，防止${num}点伤害，或弃置${cards.length}张牌`, cards],
					selectButton: [0, num],
				})
				.forResult();
			if (result.bool && result.links?.length) {
				const gained = result.links;
				await source.gain(gained, player, "giveAuto");
				trigger.num -= Math.min(gained.length, trigger.num);
				if (trigger.num <= 0) {
					trigger.cancel();
				}
			} else {
				await source.discard(cards);
			}
		},
		ai: {
			threaten: 0.6,
		},
	},

	// 存畏：锁定技，当你成为锦囊牌的目标后，若你为唯一目标，则你摸一张牌，否则你弃置一张牌。 参考dccunwei(huicui)
	cunwei: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			return get.type2(event.card) == "trick" && (event.targets.length == 1 || player.countCards("he") > 0);
		},
		async content(event, trigger, player) {
			if (trigger.targets.length == 1) {
				await player.draw();
			} else if (player.countCards("he") > 0) {
				await player.chooseToDiscard("he", true, "存畏：请弃置一张牌");
			}
		},
		ai: { halfneg: true },
	},

// ========== guanyinping 关银屏 ==========
	// 雪恨：出牌阶段限一次，你可以弃置一张红色牌并选择至多X名角色（X为你已损失的体力值且至少为1），然后你横置这些角色，并对其中一名角色造成1点火焰伤害。 参考xueji(sp)
	xueji: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("he", { color: "red" }) > 0;
		},
		filterTarget: true,
		selectTarget() {
			var player = _status.event.player;
			return [1, Math.max(1, player.getDamagedHp())];
		},
		position: "he",
		filterCard: { color: "red" },
		selectCard: 1,
		check(card) {
			return 8 - get.value(card);
		},
		multitarget: true,
		multiline: true,
		line: "fire",
		async content(event, trigger, player) {
			const { targets } = event;
			event.delay = false;
			for (let i = 0; i < targets.length; i++) {
				if (!targets[i].isLinked()) {
					await targets[i].link(true);
					event.delay = true;
				}
			}
			if (event.delay) {
				await game.delay();
			}
			await targets[0].damage("fire", "nocard");
		},
		ai: {
			damage: true,
			fireAttack: true,
			threaten: 1.5,
			order: 7,
			result: {
				target(player, target) {
					var eff = get.damageEffect(target, player, target, "fire");
					if (target.isLinked()) {
						return eff / 10;
					} else {
						return eff;
					}
				},
			},
		},
	},

	// 虎啸：锁定技，当你对一名角色造成火焰伤害后，其摸一张牌。 参考gz_huxiao(guozhan)
	huxiao: {
		audio: "huxiao",
		trigger: { source: "damageSource" },
		forced: true,
		filter(event, player) {
			if (event._notrigger.includes(event.player) || !event.player.isIn()) {
				return false;
			}
			return event.hasNature("fire");
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await trigger.player.draw();
		},
	},

// ========== maliang 马良 ==========
	// 协穆：其他与你势力相同的角色的出牌阶段，其可以展示并交给你一张基本牌，然后其于本回合内计算与其他角色的距离-1。 参考skill_old.js
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
				.chooseCard("h", false)
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

	// 纳蛮：出牌阶段限一次，你可以将任意张基本牌当【南蛮入侵】使用，并选择等量名角色为目标。你获得因此打出的红色【杀】。 参考skill_old.js
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
		ai: {
			threaten: 1.4,
		},
	},

	// naman_gain：纳蛮的配套子技能 参考skill_old.js
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

// ========== mizhu 糜竺 ==========
	// 资援：出牌阶段限一次，你可以交给一名其他角色任意张点数之和为13的牌，然后该角色回复1点体力。 参考ziyuan(sp)
	ziyuan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard(card) {
			var num = 0;
			for (var i = 0; i < ui.selected.cards.length; i++) {
				num += get.number(ui.selected.cards[i]);
			}
			return get.number(card) + num <= 13;
		},
		complexCard: true,
		selectCard() {
			var num = 0;
			for (var i = 0; i < ui.selected.cards.length; i++) {
				num += get.number(ui.selected.cards[i]);
			}
			if (num == 13) {
				return ui.selected.cards.length;
			}
			return ui.selected.cards.length + 2;
		},
		discard: false,
		lose: false,
		delay: false,
		filterTarget(card, player, target) {
			return player != target;
		},
		check(card) {
			var num = 0;
			for (var i = 0; i < ui.selected.cards.length; i++) {
				num += get.number(ui.selected.cards[i]);
			}
			if (num + get.number(card) == 13) {
				return 9 - get.value(card);
			}
			if (ui.selected.cards.length == 0) {
				var cards = _status.event.player.getCards("h");
				for (var i = 0; i < cards.length; i++) {
					for (var j = i + 1; j < cards.length; j++) {
						if (cards[i].number + cards[j].number == 13) {
							if (cards[i] == card || cards[j] == card) {
								return 8.5 - get.value(card);
							}
						}
					}
				}
			}
			return 0;
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.give(cards, target, "give");
			await target.recover();
		},
		ai: {
			order(skill, player) {
				if (
					game.hasPlayer(function (current) {
						return current.hp < current.maxHp && current != player && get.recoverEffect(current, player, player) > 0;
					})
				) {
					return 10;
				}
				return 1;
			},
			result: {
				player(player, target) {
					if (get.attitude(player, target) < 0) {
						return -1;
					}
					var eff = get.recoverEffect(target, player, player);
					if (eff < 0) {
						return 0;
					}
					if (eff > 0) {
						if (target.hp == 1) {
							return 3;
						}
						return 2;
					}
					if (player.needsToDiscard()) {
						return 1;
					}
					return 0;
				},
			},
			threaten: 1.3,
		},
	},

	// 巨贾：锁定技，你的手牌上限+X；你首次明置此武将时，你摸X张牌（X为你的体力上限）。准备阶段开始时，若你没有手牌，你可以变更此武将牌。 参考jugu(sp)
	jugu: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		mod: {
			maxHandcard(player, num) {
				return num + player.maxHp;
			},
		},
		trigger: { player: "showCharacterEnd" },
		forced: true,
		filter(event, player) {
			return !player.storage.jugu_shown;
		},
		// 若巨贾是作为第三个武将(3将模式)获得的，一开始就是明置状态，没有showCharacterEnd这个环节。
		init(player, skill) {
			if (!player.storage.jugu_shown && isCharacterShown(player, skill)) {
				player.storage.jugu_shown = true;
				player.draw(player.maxHp);
			}
		},
		async content(event, trigger, player) {
			player.storage.jugu_shown = true;
			await player.draw(player.maxHp);
		},
		group: ["jugu2"],
	},
	jugu2: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		sourceSkill: "jugu",
		filter(event, player) {
			return !player.countCards("h");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("jugu2"))
				.set("ai", () => get.attitude(player, player) >= 0)
				.forResult();
		},
		async content(event, trigger, player) {
			// 原来无条件changeVice()，只要巨贾在副将上才是对的——巨贾也可能挂在
			// 主将或第三将(3将/sanjiang模式)上，这种情况下应该变更的是jugu实际所在
			// 的那张武将牌，而不是恒定变更副将
			await pickAndChangeCharacter(player, "jugu", "巨贾：请选择要变更为的武将");
		},
	},

// ========== dongyun 董允 ==========
	// 秉正：出牌阶段结束时，你可以令手牌数不等于体力值的一名角色弃置一张手牌或摸一张牌。然后若其手牌数等于体力值，你摸一张牌，且可以交给该角色一张牌。 参考bingzheng(sp)
	bingzheng: {
		audio: 2,
		trigger: { player: "phaseUseEnd" },
		direct: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2("bingzheng"), function (card, player, target) {
					return target.countCards("h") != target.hp;
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					var att = get.attitude(player, target);
					var nh = target.countCards("h");
					if (att > 0) {
						if (nh == target.hp - 1) {
							if (player == target) {
								return att + 1;
							}
							return att + 2;
						}
						if (player == target && player.needsToDiscard()) {
							return att / 3;
						}
						return att;
					} else {
						if (nh == target.hp + 1) {
							return -att;
						}
						if (nh == 0) {
							return 0;
						}
						return -att / 2;
					}
				})
				.forResult();
			if (result.bool) {
				player.logSkill("bingzheng", result.targets);
				event.target = result.targets[0];
			} else {
				event.finish();
				return;
			}
			let result2;
			if (event.target.countCards("h")) {
				result2 = await player
					.chooseControl(function (event, player) {
						var target = event.target;
						if (get.attitude(player, target) < 0) {
							return 1;
						}
						return 0;
					})
					.set("choiceList", ["令" + get.translation(event.target) + "摸一张牌", "令" + get.translation(event.target) + "弃置一张手牌"])
					.forResult();
			} else {
				event.directfalse = true;
			}
			if (event.directfalse || result2.index == 0) {
				await event.target.draw();
			} else {
				await event.target.chooseToDiscard("h", true);
			}
			if (event.target.countCards("h") == event.target.hp) {
				const drawNext = player.draw();
				if (event.target == player) {
					event.finish();
					return;
				}
				const next = player.chooseCard("是否交给" + get.translation(event.target) + "一张牌？", "he");
				next.set("ai", function (card) {
					if (get.position(card) != "h") {
						return 0;
					}
					if (_status.event.shan && card.name == "shan") {
						return 11;
					}
					if (_status.event.goon) {
						return 10 - get.value(card);
					}
					return -get.value(card, _status.event.player, "raw");
				});
				if (get.attitude(player, event.target) > 1 && player.countCards("h", "shan") > 1 && player.countCards("h") > event.target.countCards("h")) {
					next.set("shan", true);
				}
				if (get.attitude(player, event.target) > 0 && player.needsToDiscard()) {
					next.set("goon", true);
				}
				await drawNext;
				const result3 = await next.forResult();
				if (result3.bool) {
					await player.give(result3.cards, event.target);
				}
			} else {
				event.finish();
			}
		},
		ai: {
			expose: 0.2,
			threaten: 1.4,
		},
	},

	// 舍宴：当你成为普通锦囊牌的目标时，你可以为此牌增加一个目标或令此牌对其中一个目标无效（有效的目标数至少为1且以此法增加的目标无距离限制）。 参考sheyan(sp)
	sheyan: {
		audio: 2,
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			if (!event.targets?.includes(player)) {
				return false;
			}
			const info = get.info(event.card);
			if (!info || info.type != "trick") {
				return false;
			}
			if (info.multitarget) {
				return false;
			}
			if (event.targets.length > 1) {
				return true;
			}
			return game.hasPlayer(current => {
				return !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, event.player, current);
			});
		},
		async cost(event, trigger, player) {
			const bool1 = game.hasPlayer(current => {
				return !trigger.targets.includes(current) && lib.filter.targetEnabled2(trigger.card, trigger.player, current);
			});
			const bool2 = trigger.targets.length > 1;
			let str = "";
			if (bool1) {
				str += `为${get.translation(trigger.card)}增加一个目标`;
			}
			if (bool1 && bool2) {
				str += `，或`;
			}
			if (bool2) {
				str += `令${get.translation(trigger.card)}对其中一个目标无效`;
			}
			const next = player
				.chooseTarget(get.prompt(event.skill), str, (card, player, target) => {
					const trigger = get.event().getTrigger();
					if (trigger.targets.includes(target) && trigger.targets.length > 1) {
						return true;
					}
					return !trigger.targets.includes(target) && lib.filter.targetEnabled2(trigger.card, trigger.player, target);
				})
				.set("ai", target => {
					const player = get.player();
					const trigger = get.event().getTrigger();
					return get.effect(target, trigger.card, player, player) * (trigger.targets.includes(target) ? -1 : 1);
				})
				.set("targets", trigger.targets);
			next.targetprompt2.add(target => {
				const trigger = get.event().getTrigger();
				if (!target.classList.contains("selectable") || !trigger.targets.includes(target)) {
					return;
				}
				return "可无效";
			});
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			event.type = trigger.targets.includes(target) ? "remove" : "add";
			if (!event.isMine() && !event.isOnline()) {
				await game.delayx();
			}
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

// ========== zhangyi 张翼 ==========
	// 执义：锁定技，一名角色的结束阶段，若你本回合内使用或打出过基本牌，你选择一项：1.视为使用任意一张你本回合内使用或打出过的基本牌；2.摸一张牌。 参考zhiyi(mobile)
	zhiyi: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		forced: true,
		filter(event, player) {
			return player.getHistory("useCard", evt => get.type(evt.card) == "basic").length > 0 || player.getHistory("respond", evt => get.type(evt.card) == "basic").length > 0;
		},
		async content(event, trigger, player) {
			const useCards = player.getHistory("useCard", evt => get.type(evt.card) == "basic").map(evt => evt.card);
			const respondCards = player.getHistory("respond", evt => get.type(evt.card) == "basic").map(evt => evt.card);
			const seen = new Set();
			const infos = [];
			for (const card of useCards.concat(respondCards)) {
				const key = card.name + "|" + (card.nature || "");
				if (seen.has(key)) {
					continue;
				}
				seen.add(key);
				infos.push({ name: card.name, nature: card.nature, isCard: true });
			}
			const choiceList = ["摸一张牌"].concat(infos.map(info => "视为使用一张" + get.translation(info)));
			const result = await player
				.chooseControl(choiceList)
				.set("prompt", "执义：请选择一项")
				.set("ai", () => 0)
				.forResult();
			if (result.index === 0) {
				await player.draw();
			} else {
				await player.chooseUseTarget(infos[result.index - 1], false, true);
			}
		},
		ai: {
			threaten: 1.0,
		},
	},

// ========== lifeng 李丰 ==========
	// 屯储：摸牌阶段，你可以多摸两张牌，将一至两张手牌置于你的武将牌上，称为“粮”，然后本回合不能使用【杀】。 参考tunchu
	liangcang: {
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		frequent: true,
		preHidden: true,
		locked: false,
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.num += 2;
			player.addTempSkill("liangcang_choose", "phaseDrawAfter");
		},
		onremove(player, skill) {
			var cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
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
					const nh = player.countCards("h");
					if (nh) {
						const result = await player
							.chooseCard("h", [1, Math.min(2, nh)], "将一至两张手牌置于你的武将牌上，称为“粮”", "allowChooseAll")
							.set("ai", function (card) {
								var player = _status.event.player;
								var count = game.countPlayer(function (current) {
									return get.attitude(player, current) > 2 && current.hp - current.countCards("h") > 1;
								});
								if (ui.selected.cards.length >= count) {
									return -get.value(card);
								}
								return 5 - get.value(card);
							})
							.forResult();
						if (result.bool) {
							const next = player.addToExpansion(result.cards, player, "giveAuto");
							next.gaintag.add("liangcang");
							await next;
							player.addTempSkill("liangcang_forbid", "phaseAfter");
						}
					}
				},
			},
			forbid: {
				charlotte: true,
				mod: {
					cardEnabled(card, player) {
						if (card.name == "sha") {
							return false;
						}
					},
				},
			},
		},
		ai: {
			threaten: 0.8,
		},
	},

	// 输粮：一名角色的结束阶段，若该角色的手牌数小于其体力上限，你可以移去一张“粮”，令其摸两张牌。 参考shuliang
	shuliang: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		direct: true,
		filter(event, player) {
			return player.getExpansions("liangcang").length > 0 && event.player.countCards("h") < event.player.maxHp && event.player.isIn();
		},
		async content(event, trigger, player) {
			const goon = get.attitude(player, trigger.player) > 0;
			const result = await player
				.chooseCardButton(get.prompt("shuliang", trigger.player), player.getExpansions("liangcang"))
				.set("ai", function () {
					if (_status.event.goon) {
						return 1;
					}
					return 0;
				})
				.set("goon", goon)
				.forResult();
			if (result.bool) {
				player.logSkill("shuliang", trigger.player);
				await player.loseToDiscardpile(result.links);
				await trigger.player.draw(2);
			}
		},
		ai: { combo: "liangcang" },
	},

// ========== zhaotongguang 赵统赵广 ==========
	// 翊赞：你可以将X张牌（其中至少一张牌是基本牌）当任意基本牌使用或打出。（X为你体力值的一半，向上取整） 参考zj_yizan
	// X用Math.max(1, ...)兜底：玩家进入濒死时hp可能是0甚至负数，Math.ceil(0/2)算出来是0，
	// selectCard变成[0,0]，此时不用选任何牌就能视为打出一张基本牌（等于白嫖无懈可击/桃/杀），
	// 必须保证X至少是1
	yizan: {
		audio: "yizan_respond_shan",
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			if (get.type(name) !== "basic") {
				return false;
			}
			const num = Math.max(1, Math.ceil(player.hp / 2));
			return player.countCards("esh") >= num;
		},
		filter(event, player) {
			const num = Math.max(1, Math.ceil(player.hp / 2));
			if (player.countCards("hes") < num) {
				return false;
			}
			for (const name of lib.inpile) {
				if (get.type(name) !== "basic") {
					continue;
				}
				if (event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) {
					return true;
				}
				if (name === "sha") {
					for (const nature of lib.inpile_nature) {
						if (event.filterCard(get.autoViewAs({ name, nature }, "unsure"), player, event)) {
							return true;
						}
					}
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				const list = get.inpileVCardList(info => {
					if (info[0] !== "basic") {
						return false;
					}
					const card = get.autoViewAs({ name: info[2], nature: info[3] }, "unsure");
					return event.filterCard(card, player, event);
				});
				return ui.create.dialog("翊赞", [list, "vcard"], "hidden");
			},
			check(button) {
				const player = _status.event.player;
				const num = Math.max(1, Math.ceil(player.hp / 2));
				const card = { name: button.link[2], nature: button.link[3] };
				if (_status.event.getParent().type !== "phase" || game.hasPlayer(current => player.canUse(card, current) && get.effect(current, card, player, player) > 0)) {
					switch (button.link[2]) {
						case "tao":
						case "shan":
							return 5;
						case "jiu": {
							if (player.countCards("hes") > num) {
								return 3;
							}
							return 0;
						}
						case "sha":
							if (button.link[3] === "fire") {
								return 2.95;
							} else if (button.link[3] === "thunder" || button.link[3] === "ice") {
								return 2.92;
							}
							return 2.9;
					}
				}
				return 0;
			},
			backup(links, player) {
				const num = Math.max(1, Math.ceil(player.hp / 2));
				return {
					audio: "zj_yizan",
					// 选中的num张牌里必须至少有一张基本牌：非基本牌只有在已选中过基本牌、或者剩余可选数量还够留一张基本牌时才能选
					filterCard(card) {
						if (get.type(card) === "basic") {
							return true;
						}
						if (ui.selected.cards.some(c => get.type(c) === "basic")) {
							return true;
						}
						return num - ui.selected.cards.length - 1 > 0;
					},
					selectCard: [num, num],
					check(card) {
						return 6 - get.value(card);
					},
					viewAs: { name: links[0][2], nature: links[0][3] },
					async precontent(event) {
						event.result.skill = "yizan";
					},
					position: "hes",
					popname: true,
				};
			},
			prompt(links, player) {
				const num = Math.max(1, Math.ceil(player.hp / 2));
				return `将${get.cnNumber(num)}张牌（其中至少一张是基本牌）当做${get.translation(links[0][3] || "")}${get.translation(links[0][2])}使用或打出`;
			},
		},
		ai: {
			order() {
				const player = _status.event.player;
				const event = _status.event;
				const num = Math.max(1, Math.ceil(player.hp / 2));
				if (event.filterCard({ name: "jiu" }, player, event) && get.effect(player, { name: "jiu" }) > 0 && player.countCards("hes") > num) {
					return 3.3;
				}
				return 3.1;
			},
			skillTagFilter(player, tag, arg) {
				if (tag === "fireAttack") {
					return true;
				}
				const num = Math.max(1, Math.ceil(player.hp / 2));
				if (player.countCards("hes") < num) {
					return false;
				}
			},
			result: {
				player: 1,
			},
			respondSha: true,
			respondShan: true,
			fireAttack: true,
			threaten: 1.3,
		},
	},

// ========== qinmi 秦宓 ==========
	// 专对：同势力角色成为【杀】的目标后，你可以与使用者拼点，若你赢，此【杀】无效；若你没赢，且你不是此牌的目标，你可以将一张手牌置于牌堆顶，取消此【杀】的所有目标，然后你成为此【杀】的目标。 参考zhuandui
	zhuandui: {
		audio: 2,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			if (event.player == player || event.target == player) {
				return false;
			}
			if (!sameGroup(event.target, player)) {
				return false;
			}
			return player.canCompare(event.player);
		},
		logTarget: "player",
		check(event, player) {
			return get.attitude(player, event.target) > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseToCompare(trigger.player).forResult();
		},
		async content(event, trigger, player) {
			const evt = trigger.getParent();
			if (event.bool) {
				player.logSkill("zhuandui", trigger.target);
				evt.excluded.add(trigger.target);
			} else if (!evt.targets.includes(player) && player.countCards("h")) {
				const result = await player.chooseCard("h", 1, "专对：将一张手牌置于牌堆顶，取消此【杀】的所有目标，然后你成为此【杀】的目标").forResult();
				if (result.bool) {
					await game.cardsGotoPile(result.cards, "insert");
					evt.excluded.addArray(evt.targets);
					evt.targets.length = 0;
					evt.targets.push(player);
				}
			}
		},
		ai: {
			threaten: 0.7,
		},
	},

	// 天辩：你可用牌堆顶的牌进行拼点。你的红桃拼点牌的点数视为K。 参考tianbian
	tianbian: {
		audio: 2,
		enable: "chooseCard",
		check(event, player) {
			var player = _status.event.player;
			return !player.hasCard(function (card) {
				var val = get.value(card);
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
					if (event.player == player) {
						return !event.iwhile && get.suit(event.card1) == "heart";
					} else {
						return get.suit(event.card2) == "heart";
					}
				},
				silent: true,
				async content(event, trigger, player) {
					game.log(player, "拼点牌点数视为", "#yK");
					if (player == trigger.player) {
						trigger.num1 = 13;
					} else {
						trigger.num2 = 13;
					}
				},
			},
		},
	},

// ========== yanyan 严颜 ==========
	// 拒降：当你成为其他角色使用【杀】的目标后，你可以与其各摸一张牌，然后其本回合不能再对你使用牌。当你使用【杀】指定一名角色为目标后，你可以获得其一张牌，然后你本回合不能再对其使用牌。 参考rejuzhan
	jujiang: {
		audio: 2,
		trigger: { global: ["useCardToTargeted", "useCardToPlayered"] },
		filter(event, player, name) {
			if (event.card.name !== "sha") {
				return false;
			}
			if (name == "useCardToPlayered") {
				return event.player == player && event.target.hasGainableCards(player, "he") && event.target.isIn();
			}
			return event.target == player && event.player.isIn();
		},
		logTarget: (event, player, name) => (name == "useCardToTargeted" ? event.player : event.target),
		prompt2(event, player, name) {
			if (name == "useCardToPlayered") {
				return `获得${get.translation(event.target)}一张牌，然后你本回合不能再对其使用牌。`;
			}
			return `与${get.translation(event.player)}各摸一张牌，然后其本回合不能再对你使用牌。`;
		},
		async content(event, trigger, player) {
			if (trigger.triggername == "useCardToPlayered") {
				const target = trigger.target;
				await player.gainPlayerCard({ target, position: "he", forced: true });
				player.addTempSkill("jujiang_debuff");
				player.markAuto("jujiang_debuff", target);
			} else {
				const target = trigger.player;
				await game.asyncDraw([player, target]);
				target.addTempSkill("jujiang_debuff");
				target.markAuto("jujiang_debuff", player);
			}
		},
		subSkill: {
			debuff: {
				charlotte: true,
				onremove: true,
				intro: { content: "本回合不能对$使用牌" },
				mod: {
					playerEnabled(card, player, target) {
						if (player.getStorage("jujiang_debuff").includes(target)) {
							return false;
						}
					},
				},
			},
		},
		ai: {
			threaten: 1.1,
		},
	},

// ========== chendao 陈到 ==========
	// 往烈：出牌阶段开始时，你可以选择一张手牌，你于此阶段内：使用此牌无距离限制且不能被响应；使用此牌结算结束后不能再对其他角色使用牌。 参考potwanglie
	wanglie: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("h");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(get.prompt2(event.skill), "h")
				.set("ai", card => {
					const player = get.player();
					if (player.hasValueTarget(card, true)) {
						return player.getUseValue(card, false, true) * (get.tag(card, "damage") && get.type(card) != "delay" ? 2 : 1);
					}
					return 0.1 + Math.random();
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const card = event.cards[0];
			player.addGaintag(card, "wanglie");
			player.addTempSkill(event.name + "_effect", "phaseUseAfter");
			await game.delayx();
		},
		locked: false,
		mod: {
			aiOrder(player, card, num) {
				if (!player.isPhaseUsing() || typeof card !== "object" || num <= 0) {
					return;
				}
				if (get.itemtype(card) == "card" && card.hasGaintag("wanglie")) {
					num / 20;
				}
				return num;
			},
		},
		ai: {
			threaten: 1.4,
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("wanglie");
				},
				mod: {
					targetInRange(card, player, target) {
						if (card.cards?.some(cardx => cardx.hasGaintag("wanglie"))) {
							return true;
						}
					},
				},
				audio: "wanglie",
				trigger: { player: ["useCard", "useCardAfter"] },
				filter(event, player) {
					return player.hasHistory("lose", evt => {
						const evtx = evt.relatedEvent || evt.getParent();
						if (event !== evtx) {
							return false;
						}
						return Object.values(evt.gaintag_map).flat().includes("wanglie");
					});
				},
				silent: true,
				async content(event, trigger, player) {
					if (event.triggername == "useCard") {
						player.logSkill(event.name);
						if (Array.isArray(trigger.directHit)) {
							trigger.directHit.addArray(game.players);
						}
						game.log(trigger.card, "不可被响应");
					} else {
						player.addTempSkill("wanglie_debuff", "phaseUseAfter");
					}
				},
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						if (arg?.card?.cards?.some(card => card.hasGaintag("wanglie"))) {
							return true;
						}
					},
				},
			},
			debuff: {
				mark: true,
				charlotte: true,
				intro: { content: "本阶段不能对其他角色使用牌" },
				mod: {
					playerEnabled(card, player, target) {
						if (player !== target) {
							return false;
						}
					},
				},
			},
		},
	},

// ========== zhugezhan 诸葛瞻 ==========
	// 罪论：结束阶段，你可以观看牌堆顶三张牌，你每满足以下一项便获得其中的一张，然后将其余牌以任意顺序置于牌堆顶：1.你于此回合内造成过伤害；2.你于此回合内未弃置过牌；3.手牌数为全场最少。若均不满足，你与一名其他角色各失去1点体力。 参考xinfu_zuilun
	zuilun: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: {
			player: "phaseJieshuBegin",
		},
		check(event, player) {
			let num = 0;
			if (
				player.hasHistory("lose", function (evt) {
					return evt.type == "discard";
				})
			) {
				num++;
			}
			if (!player.isMinHandcard()) {
				num++;
			}
			if (!player.getStat("damage")) {
				num++;
			}
			if (num == 3) {
				return player.hp >= 2;
			}
			return true;
		},
		prompt(event, player) {
			let num = 3;
			if (
				player.hasHistory("lose", function (evt) {
					return evt.type == "discard";
				})
			) {
				num--;
			}
			if (!player.isMinHandcard()) {
				num--;
			}
			if (!player.getStat("damage")) {
				num--;
			}
			return get.prompt("zuilun") + "（可获得" + get.cnNumber(num) + "张牌）";
		},
		async content(event, trigger, player) {
			let num = 0;
			const cards = get.cards(3);
			await game.cardsGotoOrdering(cards);
			if (
				player.hasHistory("lose", function (evt) {
					return evt.type == "discard";
				})
			) {
				num++;
			}
			if (!player.isMinHandcard()) {
				num++;
			}
			if (!player.getStat("damage")) {
				num++;
			}
			if (num == 0) {
				await player.gain(cards, "draw");
				return;
			}
			let prompt = "罪论：将" + get.cnNumber(num) + "张牌置于牌堆顶";
			if (num < 3) {
				prompt += "并获得其余的牌";
			}
			const chooseToMove = player.chooseToMove(prompt, true);
			if (num < 3) {
				chooseToMove.set("list", [["牌堆顶", cards], ["获得"]]);
				chooseToMove.set("filterMove", function (from, to, moved) {
					if (to == 1 && moved[0].length <= _status.event.num) {
						return false;
					}
					return true;
				});
				chooseToMove.set("filterOk", function (moved) {
					return moved[0].length == _status.event.num;
				});
			} else {
				chooseToMove.set("list", [["牌堆顶", cards]]);
			}
			chooseToMove.set("num", num);
			chooseToMove.set("processAI", function (list) {
				const check = function (card) {
					const player = _status.event.player;
					const next = player.next;
					const att = get.attitude(player, next);
					const judge = next.getCards("j")[tops.length];
					if (judge) {
						return get.judge(judge)(card) * att;
					}
					return next.getUseValue(card) * att;
				};
				const cards = list[0][1].slice(0),
					tops = [];
				while (tops.length < _status.event.num) {
					list.sort(function (a, b) {
						return check(b) - check(a);
					});
					tops.push(cards.shift());
				}
				return [tops, cards];
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
			const chooseTarget = player.chooseTarget("请选择一名角色，与其一同失去1点体力", true, function (card, player, target) {
				return target != player;
			});
			chooseTarget.ai = function (target) {
				return -get.attitude(_status.event.player, target);
			};
			result = await chooseTarget.forResult();
			player.line(result.targets[0], "fire");
			await player.loseHp();
			await result.targets[0].loseHp();
		},
	},

	// 父荫：锁定技，当你每回合第一次成为【杀】或【决斗】的目标后，若你的手牌数小于等于使用者，此牌对你无效。 参考xinfu_fuyin
	fuyin: {
		trigger: {
			target: "useCardToTargeted",
		},
		forced: true,
		audio: 2,
		filter(event, player) {
			if (event.player.countCards("h") < player.countCards("h")) {
				return false;
			}
			if (event.card.name != "sha" && event.card.name != "juedou") {
				return false;
			}
			return !game.hasPlayer2(function (current) {
				return (
					current.getHistory("useCard", function (evt) {
						return evt != event.getParent() && evt.card && ["sha", "juedou"].includes(evt.card.name) && evt.targets.includes(player);
					}).length > 0
				);
			});
		},
		async content(event, trigger, player) {
			trigger.getParent().excluded.add(player);
		},
		ai: {
			effect: {
				target(card, player, target) {
					let hs = player.getCards("h", i => i !== card && (!card.cards || !card.cards.includes(i))),
						num = player.getCardUsable("sha");
					if ((card.name !== "sha" && card.name !== "juedou") || hs.length < target.countCards("h")) {
						return 1;
					}
					if (
						game.hasPlayer2(function (current) {
							return (
								current.getHistory("useCard", function (evt) {
									return evt.card && ["sha", "juedou"].includes(evt.card.name) && evt.targets.includes(player);
								}).length > 0
							);
						})
					) {
						return 1;
					}
					if (card.name === "sha") {
						num--;
					}
					hs = hs.filter(i => {
						if (!player.canUse(i, target)) {
							return false;
						}
						if (i.name === "juedou") {
							return true;
						}
						if (num && i.name === "sha") {
							num--;
							return true;
						}
						return false;
					});
					if (!hs.length) {
						return "zeroplayertarget";
					}
					num = 1 - 2 / 3 / hs.length;
					return [num, 0, num, 0];
				},
			},
			threaten: 0.8,
		},
	},

// ========== meifang 糜芳 ==========
	// 火厄：锁定技，结束阶段，你视为对至多四名其他角色使用一张【火攻】，若能造成伤害，须造成伤害并取消剩余目标（否则当前目标观看你的手牌）。最后你分配因此展示的牌，点数之和小于13则失去1点体力。 参考sxrmhuoe
	huoe: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		forced: true,
		trigger: {
			player: "phaseJieshuBegin",
		},
		filter(event, player) {
			const card = new lib.element.VCard({ name: "huogong", isCard: true });
			return game.hasPlayer(current => current != player && player.canUse(card, current));
		},
		async cost(event, trigger, player) {
			const card = new lib.element.VCard({ name: "huogong", isCard: true });
			event.result = await player
				.chooseTarget(
					get.prompt2(event.skill),
					(card, player, target) => {
						const { huogong } = get.event();
						return target != player && player.canUse(huogong, target);
					},
					[1, 4],
					true
				)
				.set("huogong", card)
				.set("ai", target => {
					const { huogong, player } = get.event();
					return get.effect(target, huogong, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const card = new lib.element.VCard({ name: "huogong", isCard: true, storage: { huoe: true } }),
				targets = event.targets;
			player.addTempSkill("huoe_effect");
			const next = player.useCard(card, targets);
			await next;
			player.removeSkill("huoe_effect");
			const cards = game
				.getGlobalHistory("everything", evt => {
					return evt.name == "showCards" && evt.getParent(evtx => evtx == next, true);
				})
				.reduce((arr, evt) => arr.concat(evt.cards ?? []), []);
			if (!cards.length) {
				return;
			}
			let num = 0;
			while (cards.length) {
				const card = cards.shift();
				num += get.number(card);
				const result = await player
					.chooseTarget(`火厄：分配${get.translation(card)}给一名角色`, true)
					.set("ai", target => {
						const { cardx, player } = get.event();
						return get.value(cardx, target) * get.attitude(player, target);
					})
					.set("cardx", card)
					.forResult();
				if (result?.bool) {
					const target = result.targets[0],
						owner = get.owner(card);
					if (!owner) {
						await target.gain(card, "gain2");
					} else if (target != owner) {
						await owner.give(card, target, true);
					}
				}
			}
			if (num < 13) {
				await player.loseHp();
			}
		},
		ai: {
			threaten: 1.4,
		},
		subSkill: {
			effect: {
				trigger: {
					player: "chooseToDiscardBegin",
				},
				charlotte: true,
				filter(event, player) {
					const evt = event.getParent();
					return evt.name == "huogong" && evt.card?.storage?.huoe;
				},
				async cost(event, trigger, player) {
					if (
						player.countCards(trigger.position, card => {
							if (!lib.filter.cardDiscardable(card, player, trigger)) {
								return false;
							}
							return trigger.filterCard(card, player);
						})
					) {
						trigger.forced = true;
						const evt = trigger.getParent(2);
						evt.targets.splice(evt.num + 1);
					} else if (player.countCards("h")) {
						const evt = trigger.getParent();
						const next = evt.target.viewHandcards(player);
						event.next.remove(next);
						trigger.next.push(next);
					}
				},
			},
		},
	},

	// 贪惏：锁定技，你需要弃牌的弃牌阶段改为摸牌阶段。 参考sxrmtanduo
	tanlin: {
		audio: 2,
		trigger: { player: "phaseChange" },
		forced: true,
		filter(event, player) {
			if (!event.phaseList[event.num].startsWith("phaseDiscard")) {
				return false;
			}
			return player.needsToDiscard();
		},
		async content(event, trigger, player) {
			trigger.phaseList[trigger.num] = `phaseDraw|${event.name}`;
			await game.delayx();
		},
	},

// ========== dengzhi 邓芝 ==========
	// 简亮：准备阶段，若你的手牌数不为全场最多，你可以与你势力相同的所有角色各摸一张牌。 参考gzjianliang
	jianliang: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		frequent: true,
		preHidden: true,
		filter(event, player) {
			return !player.isMaxHandcard();
		},
		logTarget(event, player) {
			var isFriend;
			if (player.identity == "unknown") {
				var group = "shu";
				if (!player.wontYe("shu")) {
					group = null;
				}
				isFriend = function (current) {
					return current == player || current.identity == group;
				};
			} else {
				isFriend = function (target) {
					return target.isFriendOf(player);
				};
			}
			return game.filterPlayer(isFriend);
		},
		content() {
			"step 0";
			var list = game.filterPlayer(function (current) {
				return current.isFriendOf(player);
			});
			if (list.length == 1) {
				list[0].draw();
				event.finish();
			} else {
				game.asyncDraw(list);
			}
			"step 1";
			game.delayx();
		},
	},

	// 危盟：出牌阶段限一次，你可以获得一名其他角色一个区域内的至多X张牌，然后交给其等量的牌（X为你的体力上限）。（纵横：X改为1） 参考gzweimeng
	weimeng: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countGainableCards(player, "he") > 0;
		},
		content() {
			"step 0";
			player.gainPlayerCard(target, "he", true, event.name == "weimeng" ? [1, player.maxHp] : 1);
			"step 1";
			if (result.bool && target.isIn()) {
				var num = result.cards.length,
					hs = player.getCards("he");
				if (!hs.length) {
					event.goto(3);
				} else if (hs.length <= num) {
					event._result = { bool: true, cards: hs };
				} else {
					player.chooseCard("he", true, "选择交给" + get.translation(target) + get.cnNumber(num) + "张牌", num);
				}
			} else {
				event.goto(3);
			}
			"step 2";
			player.give(result.cards, target);
			"step 3";
			if (target.isIn() && event.name == "weimeng") {
				player.chooseBool("纵横：是否令" + get.translation(target) + "获得【危盟】？").set("ai", function () {
					var evt = _status.event.getParent();
					return get.attitude(evt.player, evt.target) > 0;
				});
			} else {
				event.finish();
			}
			"step 4";
			if (result.bool) {
				target.addTempSkill("weimeng_zongheng", { player: "phaseEnd" });
				game.log(player, "发起了", "#y纵横", "，令", target, "获得了技能", "#g【危盟】");
			}
		},
		derivation: "weimeng_zongheng",
		subSkill: {
			zongheng: {
				inherit: "weimeng",
				ai: {
					order: 6,
					tag: {
						lose: 1,
						loseCard: 1,
						gain: 1,
					},
					result: {
						target: -1,
					},
				},
			},
		},
		ai: {
			order: 6,
			tag: {
				lose: 1,
				loseCard: 1,
				gain: 1,
			},
			result: {
				target(player, target) {
					return -Math.pow(Math.min(player.hp, target.countCards("he")), 2) / 4;
				},
			},
			threaten: 1.0,
		},
	},

// ========== zongyu 宗预 ==========
	// 气傲：每名角色的回合限两次，当你成为其他势力角色使用牌的目标后，你可以弃置其一张牌，然后你弃置一张手牌。 参考zyqiao(sp)
	zyqiao: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		logTarget: "player",
		usable: 2,
		preHidden: true,
		filter(event, player) {
			var source = event.player;
			if (source == player) {
				return false;
			}
			if (source.isFriendOf(player)) {
				return false;
			}
			return source.countDiscardableCards(player, "he") > 0;
		},
		check(event, player) {
			var target = event.player;
			if (get.attitude(player, target) >= 0) {
				return false;
			}
			if (
				!player.countCards("h", function (card) {
					return lib.filter.cardDiscardable(card, player, "zyqiao");
				})
			) {
				return true;
			}
			if (player.countCards("h", card => get.value(card, player) < 5)) {
				return true;
			}
			if (target.countCards("he", card => get.value(card, target) > 6) && player.countCards("h", card => get.value(card, player) < 7)) {
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			await player.discardPlayerCard(trigger.player, true, "he");
			if (
				player.countCards("h", function (card) {
					return lib.filter.cardDiscardable(card, player, "zyqiao");
				})
			) {
				await player.chooseToDiscard("h", true);
			}
		},
		ai: {
			threaten: 0.7,
		},
	},

	// 承赏：每名角色回合限一次，当你对其他势力角色使用的牌结算结束后，若此牌未造成过伤害，你可以检索并获得弃牌堆中与此牌花色相同的一张牌。 参考gzchengshang
	chengshang: {
		audio: "chengshang",
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			if (player.hasHistory("sourceDamage", evt => evt.card === event.card)) {
				return false;
			}
			return event.targets?.some(i => i.isIn() && diffGroup(player, i));
		},
		usable: 1,
		async content(event, trigger, player) {
			const cards = Array.from(ui.discardPile.childNodes).filter(card => get.suit(card, false) == get.suit(trigger.card, false));
			if (!cards.length) {
				player.getStat("triggerSkill").chengshang--;
				return;
			}
			const result = await player.chooseCardButton("承赏：是否获得其中一张牌？", cards).set("ai", button => 6 - get.value(button)).forResult();
			if (!result.bool || !result.links?.length) {
				player.getStat("triggerSkill").chengshang--;
				return;
			}
			await player.gain(result.links[0], "gain2");
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					if (get.tag(card, "damage")) {
						return;
					}
				},
			},
		},
	},

// ========== liuba 刘巴 ==========
	// 统度：每名与你势力相同的角色的结束阶段，该角色可以摸X张牌（X为其本回合弃牌阶段弃置的牌数且至多为3）。 参考gztongduo
	tongdu: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		direct: true,
		preHidden: true,
		filter(event, player) {
			if ((player != event.player && !player.hasSkill("tongdu")) || !event.player.isFriendOf(player)) {
				return false;
			}
			return (
				event.player.getHistory("lose", function (evt) {
					return evt.type == "discard" && evt.cards2.length > 0 && evt.getParent("phaseDiscard").player == event.player;
				}).length > 0
			);
		},
		content() {
			"step 0";
			var num = 0;
			trigger.player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard").player == trigger.player) {
					num += evt.cards2.length;
				}
			});
			num = Math.min(3, num);
			event.num = num;
			var next = trigger.player.chooseBool("是否发动【统度】摸" + get.cnNumber(num) + "张牌？");
			if (player == trigger.player) {
				next.setHiddenSkill("tongdu");
			}
			"step 1";
			if (result.bool) {
				player.logSkill("tongdu", trigger.player);
				trigger.player.draw(num);
			}
		},
	},

	// 归隐：限定技，出牌阶段，你可以令所有与你势力相同的角色各回复一点体力，然后你变更此武将。 参考qingyin
	guiyin: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		delay: false,
		filter(event, player) {
			var isFriend;
			if (player.identity == "unknown") {
				var group = "shu";
				if (!player.wontYe("shu")) {
					group = null;
				}
				isFriend = function (current) {
					return current == player || current.identity == group;
				};
			} else {
				isFriend = function (target) {
					return target.isFriendOf(player);
				};
			}
			return game.hasPlayer(function (current) {
				return isFriend(current) && current.hp < current.maxHp;
			});
		},
		selectTarget: -1,
		filterTarget(card, player, target) {
			if (player == target) {
				return true;
			}
			if (player.identity == "unknown") {
				var group = "shu";
				if (!player.wontYe("shu")) {
					return false;
				}
				return target.identity == group;
			}
			return target.isFriendOf(player);
		},
		selectCard: [0, 1],
		filterCard: () => false,
		multitarget: true,
		multiline: true,
		skillAnimation: true,
		animationColor: "orange",
		content() {
			"step 0";
			player.awakenSkill("guiyin");
			event.num = 0;
			"step 1";
			if (targets[num].hp < targets[num].maxHp) {
				targets[num].recover(1);
			}
			event.num++;
			if (event.num < targets.length) {
				event.redo();
			}
			"step 2";
			// 归隐可能挂在主将、副将，也可能挂在第三将(3将/sanjiang模式)，不能只判断name1/name2；
			// "变更此武将"是换成一张新武将牌，不是removeCharacter变小兵——原来这里错误地
			// 调用了removeCharacter，跟文本描述的"变更"对不上。
			// 注意：这个content()是旧式"step N"写法，会被StepCompiler拆开重新编译，不能引用
			// pickCharacterCandidates/applyCharacterChange这些模块作用域里的普通函数
			// （拆开后找不到，会报"is not defined"），只能把逻辑原样内联在这里。
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			var pool2 = _status.characterlist.filter(function (name) {
				return lib.character[name];
			});
			pool2.randomSort();
			event.candidates = pool2.slice(0, Math.min(2, pool2.length));
			event.doChange = !!event.candidates.length;
			if (event.doChange) {
				if (event.candidates.length > 1) {
					player
						.chooseButton(["归隐：请选择要变更为的武将", [event.candidates, "character"]])
						.set("filterButton", function (button) {
							return event.candidates.includes(button.link);
						})
						.set("ai", function (button) {
							return get.guozhanRank(button.link);
						});
				} else {
					event._result = { bool: true, links: event.candidates.slice() };
				}
			}
			"step 3";
			if (event.doChange && result && result.bool && result.links && result.links.length) {
				var newChar2 = result.links[0];
				var names4 = [player.name1, player.name2, player.name3].filter(Boolean);
				var slot2 = names4.findIndex(function (name) {
					return get.character(name, 3).includes("guiyin");
				});
				if (slot2 < 0) {
					slot2 = 0;
				}
				if (slot2 === 2) {
					var oldName4 = player.name3;
					if (oldName4 && lib.character[oldName4]) {
						get.character(oldName4, 3).forEach(function (oldSkill) {
							if (player.hasSkill(oldSkill, null, null, false)) {
								player.removeSkill(oldSkill);
							}
						});
					}
					if (_status.characterlist) {
						_status.characterlist.remove(newChar2);
						if (oldName4) {
							_status.characterlist.add(oldName4);
						}
					}
					player.name3 = newChar2;
					if (player.node.avatar3g) {
						player.node.avatar3g.setBackground(newChar2, "character");
						player.node.avatar3g.show();
						player.node.name3.innerHTML = get.slimName(newChar2);
						player.node.name3.show();
					}
					get.character(newChar2, 3).forEach(function (newSkill) {
						if (lib.skill[newSkill]) {
							player.addSkill(newSkill);
						}
					});
					game.log(player, "将第三个武将从", "#b" + get.translation(oldName4), "变更为了", "#b" + get.translation(newChar2));
				} else {
					var newPairs3 = [player.name1, player.name2].filter(Boolean);
					newPairs3[slot2] = newChar2;
					player.changeCharacter(newPairs3);
				}
			}
		},
		ai: {
			order(item, player) {
				var isFriend;
				if (player.identity == "unknown") {
					var group = "shu";
					if (!player.wontYe("shu")) {
						group = null;
					}
					isFriend = function (current) {
						return current == player || current.identity == group;
					};
				} else {
					isFriend = function (target) {
						return target.isFriendOf(player);
					};
				}
				var targets = game.filterPlayer(function (current) {
					return isFriend(current);
				});
				var num = 0,
					max = 0;
				for (var i of targets) {
					var dam = i.maxHp - i.hp;
					num += dam;
					max += i.maxHp;
				}
				return num / max >= 1 / Math.max(1.6, game.roundNumber) ? 1 : -1;
			},
			result: {
				player: 1,
			},
			threaten: 0.6,
		},
	},

// ========== yangwan 杨婉 ==========
	// 诱言：你的回合内限一次，当你的牌因弃置而置入弃牌堆时，你可以展示牌堆顶的四张牌，然后获得其中与你此次弃置的牌花色均不同的牌。 参考gzyouyan
	youyan: {
		audio: "youyan",
		trigger: {
			player: "loseAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			if (event.type != "discard" || event.getlx === false || player != _status.currentPhase) {
				return false;
			}
			var evt = event.getl(player);
			if (!evt || !evt.cards2 || !evt.cards2.length) {
				return false;
			}
			var list = [];
			for (var i of evt.cards2) {
				list.add(get.suit(i, player));
				if (list.length >= lib.suit.length) {
					return false;
				}
			}
			return true;
		},
		usable: 1,
		preHidden: true,
		async content(event, trigger, player) {
			let cards = get.cards(4, true);
			await player.showCards(cards, get.translation(player) + "发动了【诱言】");
			var evt = trigger.getl(player);
			var list = [];
			for (var i of evt.cards2) {
				list.add(get.suit(i, player));
			}
			cards = cards.filter(card => !list.includes(get.suit(card, false)));
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					if (
						typeof card == "object" &&
						player == _status.currentPhase &&
						(!player.storage.counttrigger || !player.storage.counttrigger.youyan) &&
						player.needsToDiscard() == 1 &&
						card.cards &&
						card.cards.filter(function (i) {
							return get.position(i) == "h";
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

	// 追还：回合结束时，你可以选择至多两名角色，其中一名角色下一次受到伤害后，其对来源造成1点伤害；另一名角色下一次受到伤害后，伤害来源弃置两张手牌。 参考gzzhuihuan
	zhuihuan: {
		skillAnimation: true,
		animationColor: "soil",
		audio: "zhuihuan",
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget([1, 2], `###${get.prompt(event.skill)}###选择至多两名角色获得“追还”效果`)
				.setHiddenSkill(event.skill)
				.set("ai", target => {
					return get.attitude(get.player(), target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const prompt2 = "被选择的目标角色下次受到伤害后，其对伤害来源造成1点伤害；未被选择的目标角色下次受到伤害后，伤害来源弃置两张手牌。";
			const next = player
				.chooseTarget("选择一名角色获得反伤效果", prompt2, (card, player, target) => {
					return get.event().allTargets.includes(target);
				})
				.set("allTargets", event.targets)
				.set("ai", target => {
					return get.attitude(get.player(), target);
				});
			if (event.targets.length > 1) {
				next.set("forced", true);
			}
			const result = await next.forResult();
			player.addTempSkill("zhuihuan_timeout", { player: "phaseZhunbeiBegin" });
			const id = `zhuihuan_${player.playerid}`;
			event.targets.forEach(target => {
				if (result?.bool && result.targets?.includes(target)) {
					player.line(target, "fire");
					target.addAdditionalSkill(id, "zhuihuan_damage");
				} else {
					player.line(target, "thunder");
					target.addAdditionalSkill(id, "zhuihuan_discard");
				}
			});
		},
		ai: {
			threaten: 0.7,
		},
		subSkill: {
			timeout: {
				charlotte: true,
				onremove(player) {
					var id = "zhuihuan_" + player.playerid;
					game.countPlayer(current => current.removeAdditionalSkill(id));
				},
			},
			damage: {
				charlotte: true,
				trigger: { player: "damageEnd" },
				forced: true,
				forceDie: true,
				filter(event, player) {
					return event.source && event.source.isAlive();
				},
				logTarget: "source",
				content() {
					player.removeSkill("zhuihuan_damage");
					trigger.source.damage();
				},
				mark: true,
				marktext: "追",
				intro: {
					content: "当你下次受到伤害后，你对伤害来源造成1点伤害。",
				},
				ai: {
					threaten: 0.5,
				},
			},
			discard: {
				charlotte: true,
				trigger: { player: "damageEnd" },
				forced: true,
				forceDie: true,
				filter(event, player) {
					return event.source && event.source.isAlive();
				},
				logTarget: "source",
				content() {
					player.removeSkill("zhuihuan_discard");
					trigger.source.chooseToDiscard(2, "h", true);
				},
				mark: true,
				marktext: "还",
				intro: {
					content: "当你下次受到伤害后，你令伤害来源弃置两张手牌。",
				},
				ai: {
					threaten: 0.8,
				},
			},
		},
	},

// ========== yangyi 杨仪 ==========
	// 度斩：每回合限一次，当你成为【杀】的目标后，你可以重铸一张牌，然后令此【杀】的使用者选择一项：1.摸两张牌，令此【杀】无效；2.弃置一张牌，令此【杀】不可被响应。 参考skill_old.js
	duzhan: {
		skillAnimation: true,
		animationColor: "soil",
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
		ai: {
			threaten: 0.8,
		},
	},

	// 共损：出牌阶段开始时，你可以弃置两张牌并选择一名其他角色，然后你选择一个基本牌或普通锦囊牌的牌名，直至你的下个回合开始前或你死亡时，你与其均无法使用、打出或弃置该牌名的手牌。 参考gongsun(mobile)
	gongsun: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		selectCard: 2,
		position: "he",
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const name = await player
				.chooseButton(["请选择一个基本牌或普通锦囊牌的牌名", [get.inpileVCardList(info => info[1] == "basic" || info[1] == "trick").filter(card => card[2] != "wuxie"), "vcard"]])
				.set("ai", button => {
					return Math.random();
				})
				.forResultBool();
			if (!name) {
				return;
			}
			const cardName = name.links[0][2];
			const id = "gongsun_" + player.playerid;
			const list = [player, target];
			player.storage.gongsun_list = player.storage.gongsun_list || [];
			player.storage.gongsun_list.push(cardName);
			list.forEach(current => {
				current.addAdditionalSkill(id + "_" + cardName, {
					mod: {
						cardEnabled(card) {
							if (get.name(card) == cardName) {
								return false;
							}
						},
						cardDiscardable(card) {
							if (get.name(card) == cardName) {
								return false;
							}
						},
						cardSavable(card) {
							if (get.name(card) == cardName) {
								return false;
							}
						},
					},
				});
			});
			player.addTempSkill("gongsun_clear", { player: "phaseUseBegin", global: "dieAfter" });
		},
		subSkill: {
			clear: {
				charlotte: true,
				trigger: { player: "phaseUseBegin", global: "dieAfter" },
				forced: true,
				popup: false,
				content() {
					player.storage.gongsun_list = [];
					player.removeSkill("gongsun_clear");
				},
			},
		},
	},

// ========== longyufei 龙羽飞 ==========
	// 龙裔：你可以将所有手牌当任意一张基本牌使用或打出（每回合每种牌名限一次）。若其中有锦囊牌，你摸一张牌；若其中有装备牌，此牌不可被响应。 参考longyi(offline)
	longyi: {
		enable: ["chooseToUse", "chooseToRespond"],
		filter(event, player) {
			if (event.type === "wuxie") {
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
			for (const i of lib.inpile) {
				if (i !== "du" && get.type(i) === "basic" && event.filterCard({ name: i, cards: hs }, player, event)) {
					return true;
				}
				if (i === "sha") {
					const list = ["fire", "thunder", "ice"];
					for (const j of list) {
						if (event.filterCard({ name: i, nature: j, cards: hs }, player, event)) {
							return true;
						}
					}
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				const vcards = [];
				const hs = player.getCards("h");
				for (const i of lib.inpile) {
					if (i !== "du" && get.type(i) === "basic" && event.filterCard({ name: i, cards: hs }, player, event)) {
						vcards.push(["基本", "", i]);
					}
					if (i === "sha") {
						for (const j of lib.inpile_nature) {
							if (event.filterCard({ name: i, nature: j, cards: hs }, player, event)) {
								vcards.push(["基本", "", i, j]);
							}
						}
					}
				}
				return ui.create.dialog("龙裔", [vcards, "vcard"]);
			},
			check(button, player) {
				if (_status.event.getParent().type !== "phase") {
					return 1;
				}
				return _status.event.player.getUseValue({
					name: button.link[2],
					nature: button.link[3],
				});
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
				return `将所有手牌当做${get.translation(links[0][3]) || ""}${get.translation(links[0][2])}使用或打出`;
			},
		},
		hiddenCard(player, name) {
			return name !== "du" && get.type(name) === "basic" && player.countCards("h") > 0;
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
					if (_status.event.type === "respondShan") {
						return 1;
					}
					let val = 0;
					const hs = player.getCards("h");
					let max = 0;
					for (const i of hs) {
						val += get.value(i, player);
						if (get.type(i, null, player) === "trick") {
							max += 5;
						}
					}
					if (player.hasSkill("zhenjue")) {
						max += 7;
					}
					return val <= max ? 1 : 0;
				},
			},
			threaten: 1.3,
		},
		group: "longyi_effect",
		subSkill: {
			effect: {
				trigger: { player: ["useCard", "respond"] },
				forced: true,
				charlotte: true,
				popup: false,
				filter(event, player) {
					if (event.skill !== "longyi_backup") {
						return false;
					}
					for (const i of event.cards) {
						const type = get.type2(i, player);
						if (type === "equip" || type === "trick") {
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
						player.draw();
					}
					if (map.equip && trigger.directHit) {
						trigger.directHit.addArray(game.players);
					}
				},
			},
			backup: {},
		},
	},

	// 阵绝：当前回合角色结束阶段，若你没有手牌，你可以令其选择一项：1.弃一张牌；2.令你摸一张牌。 参考zhenjue(offline)
	zhenjue: {
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

// ========== mengda 孟达 ==========
	// 求安：当你受到伤害时：若你没有"函"，你可以将造成此伤害的牌置于武将牌上（称为"函"），然后防止此伤害；若你有"函"，你可以将"函"转移给一名其他角色。 参考qiuan(offline)
	qiuan: {
		audio: 2,
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			if (player.getExpansions("qiuan").length) {
				return game.hasPlayer(current => current != player);
			}
			return event.cards && event.cards.filterInD().length > 0;
		},
		check(event, player) {
			if (player.getExpansions("qiuan").length) {
				return true;
			}
			if (get.damageEffect(player, event.source || player, player, event.nature) >= 0) {
				return false;
			}
			return true;
		},
		preHidden: true,
		async content(event, trigger, player) {
			if (player.getExpansions("qiuan").length) {
				const cards = player.getExpansions("qiuan");
				const target = await player
					.chooseTarget(get.prompt2("qiuan"), lib.filter.notMe)
					.set("ai", target => {
						return get.attitude(get.player(), target);
					})
					.forResult();
				if (target.bool) {
					await player.loseToExpansion(cards, target.targets[0], "qiuan");
				}
				return;
			}
			const cards = trigger.cards.filterInD();
			await player.addToExpansion({
				cards,
				animate: "gain2",
				gaintag: ["qiuan"],
			});
			trigger.cancel();
		},
		ai: {
			combo: "liangfan",
			threaten: 0.8,
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		marktext: "函",
	},

	// 量反：准备阶段开始时，有"函"的角色获得其"函"，然后失去1点体力。若其为你，当你于本回合使用因此获得的"函"造成伤害后，你可以获得受伤角色的一张牌；若其不为你，你获得其一张牌。 参考liangfan(offline)
	liangfan: {
		audio: 2,
		trigger: { global: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return game.hasPlayer(current => current.getExpansions("qiuan").length > 0);
		},
		logTarget(event, player) {
			return game.filterPlayer(current => current.getExpansions("qiuan").length > 0);
		},
		async content(event, trigger, player) {
			const targets = game.filterPlayer(current => current.getExpansions("qiuan").length > 0);
			for (const target of targets) {
				const cards = target.getExpansions("qiuan");
				if (target == player) {
					const next = player.gain({
						cards,
						animate: "gain2",
						gaintag: ["liangfan"],
					});
					player.addTempSkill("liangfan2");
					await next;
					await player.loseHp();
				} else {
					await target.loseToExpansion(cards, player, "liangfan_gain");
					await target.loseHp();
					await player.gainPlayerCard(target, "he", true);
				}
			}
		},
		ai: {
			combo: "qiuan",
		},
	},
	liangfan2: {
		audio: "liangfan",
		mark: true,
		mod: {
			aiOrder(player, card, num) {
				if (get.itemtype(card) === "card" && card.hasGaintag("liangfan")) {
					return num + 0.1;
				}
			},
		},
		intro: { content: "使用“量反”牌造成伤害后，可获得目标角色的一张牌" },
		trigger: { source: "damageEnd" },
		logTarget: "player",
		charlotte: true,
		sourceSkill: "liangfan",
		onremove(player) {
			player.removeGaintag("liangfan");
		},
		prompt: event => `量反：是否获得${get.translation(event.player)}的一张牌？`,
		filter(event, player) {
			const evt = event.getParent(2);
			if (evt.name !== "useCard" || evt.card !== event.card) {
				return false;
			}
			if (!event.player.countGainableCards(player, "he")) {
				return false;
			}
			return (
				player.getHistory("lose", evt2 => {
					if (evt2.getParent() !== evt) {
						return false;
					}
					for (const i in evt2.gaintag_map) {
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
			await player.gainPlayerCard({
				target: trigger.player,
				position: "he",
				forced: true,
			});
		},
	},

// ========== haozhao 郝昭 ==========
	// 镇骨：结束阶段，你可以选择一名其他角色，你的回合结束时和该角色的下个回合结束时，其将手牌摸至或弃至与你手牌数相同（最多摸至五张）。 参考drlt_zhengu(shenhua)
	drlt_zhengu: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), lib.filter.notMe)
				.set("ai", target => {
					const player = get.player();
					const num = Math.min(5, player.countCards("h")) - target.countCards("h");
					const att = get.attitude(player, target);
					return num * att;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.addSkill("drlt_zhengu_mark");
			player.markAuto("drlt_zhengu_mark", [target]);
		},
		async sync(player, target) {
			const num = player.countCards("h");
			const num2 = target.countCards("h");
			if (num < num2) {
				await target.chooseToDiscard(num2 - num, true, "h", "allowChooseAll");
			} else {
				await target.drawTo(Math.min(5, num));
			}
		},
		ai: {
			threaten: 0.7,
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

// ========== simazhao 司马昭 ==========
	// 昭然：出牌阶段开始时，你可以令你的手牌对所有角色可见直到此阶段结束。若如此做，当你于本阶段失去任意花色的最后一张手牌时（每种花色限一次），你摸一张牌或弃置一名其他角色的一张牌。 参考zhaoran(yingbian)
	zhaoran: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		preHidden: true,
		async content(event, trigger, player) {
			player.addTempSkill("zhaoran2", "phaseUseAfter");
			const cards = player.getCards("h");
			if (cards.length > 0) {
				await player.addShownCards({
					cards,
					gaintag: ["visible_zhaoran"],
				});
			}
		},
	},
	zhaoran2: {
		audio: "zhaoran",
		group: "zhaoran3",
		sourceSkill: "zhaoran",
		init: (player, skill) => {
			if (!player.storage[skill]) {
				player.storage[skill] = [];
			}
		},
		onremove: true,
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		forced: true,
		charlotte: true,
		popup: false,
		filter(event, player, name) {
			if (name === "gainBegin") {
				return true;
			}
			const evt = event.getl(player);
			if (!evt || !evt.hs || !evt.hs.length) {
				return false;
			}
			const list = player.getStorage("zhaoran2");
			for (const card of evt.hs) {
				const suit = get.suit(card, player);
				if (!list.includes(suit) && !player.countCards("h", { suit: suit })) {
					return true;
				}
			}
			return false;
		},
		async content(event, trigger, player) {
			if (trigger.delay === false) {
				await game.delayx();
			}
			const list = [];
			const suits = get.copy(player.storage.zhaoran2);
			suits.addArray(player.getCards("h").map(card => get.suit(card)));
			const evt = trigger.getl(player);
			for (const card of evt.hs) {
				const suit = get.suit(card, player);
				if (!suits.includes(suit)) {
					list.add(suit);
				}
			}
			player.markAuto("zhaoran2", list);
			const filterTarget = (card, currentPlayer, target) => {
				return target !== currentPlayer && target.countDiscardableCards(currentPlayer, "he") > 0;
			};
			for (let count = list.length; count > 0; count--) {
				if (!game.hasPlayer(current => filterTarget(null, player, current))) {
					player.logSkill("zhaoran2");
					await player.draw();
					continue;
				}
				const result = await player
					.chooseTarget({
						prompt: "弃置一名其他角色的一张牌或摸一张牌",
						filterTarget,
						ai(target) {
							const attitude = get.attitude(player, target);
							if (attitude >= 0) {
								return 0;
							}
							if (target.countCards("he", card => get.value(card) > 5)) {
								return -attitude;
							}
							return 0;
						},
					})
					.forResult();
				if (!result.bool || !result.targets?.length) {
					player.logSkill("zhaoran2");
					await player.draw();
					continue;
				}
				const target = result.targets[0];
				player.logSkill("zhaoran2", target);
				await player.discardPlayerCard({
					target,
					position: "he",
					forced: true,
				});
			}
		},
		intro: {
			content: "已因$牌触发过效果",
		},
	},
	zhaoran3: {
		trigger: { player: ["phaseUseEnd", "gainBegin"] },
		forced: true,
		charlotte: true,
		firstDo: true,
		silent: true,
		sourceSkill: "zhaoran",
		async content(event, trigger, player) {
			if (event.triggername === "gainBegin") {
				trigger.gaintag.add("visible_zhaoran");
			} else {
				await player.hideShownCards({
					cards: player.getCards("h"),
					gaintag: ["visible_zhaoran"],
				});
			}
		},
	},

	// 蓄伐：出牌阶段限一次，你可以展示一名其他角色一张手牌，令其当前手牌中与此牌类型不同的牌视为【杀】直到其回合结束。 参考choufa(yingbian)
	choufa: {
		enable: "phaseUse",
		audio: 2,
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.choufa.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target !== player && !target.hasSkill("choufa2") && target.hasCards("h");
		},
		async content(event, _trigger, player) {
			const target = event.targets[0];
			const result = await player
				.choosePlayerCard({
					target,
					position: "h",
					forced: true,
				})
				.forResult();
			if (!result?.bool || !result.cards?.length) {
				return;
			}
			await player.showCards(result.cards);
			const type = get.type2(result.cards[0], target);
			target.storage.choufa2 = type;
			target.addTempSkill("choufa2", { player: "phaseAfter" });
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					return -target.countCards("h");
				},
			},
			threaten: 1.4,
		},
	},
	choufa2: {
		onremove: true,
		charlotte: true,
		mark: true,
		intro: { content: "手牌中的非$牌均视为杀" },
		mod: {
			cardname(card, player) {
				if (get.type2(card, false) !== player.storage.choufa2) {
					return "sha";
				}
			},
			cardnature(card, player) {
				if (get.type2(card, false) !== player.storage.choufa2) {
					return false;
				}
			},
		},
	},

// ========== simashi 司马师 ==========
	// 夷灭：每回合限一次，当你于回合内对其他角色造成伤害时，你可以失去1点体力，然后令此伤害增加至其体力值，结算完成后，若其未死亡，其回复等同于伤害增加值的体力。 参考yimie(yingbian)
	yimie: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		usable: 1,
		preHidden: true,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return _status.currentPhase == player && player != event.player && event.num < event.player.hp;
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
		logTarget: "player",
		async content(event, trigger, player) {
			player.loseHp();
			trigger.player.addTempSkill("yimie2");
			trigger.yimie_num = trigger.player.hp - trigger.num;
			trigger.num = trigger.player.hp;
		},
		ai: {
			damageBonus: true,
			skillTagFilter(player, tag, arg) {
				return arg && arg.target && arg.target.hp > 1 && player.hp > 1 && get.attitude(player, arg.target) < -2;
			},
			threaten: 1.6,
		},
	},
	yimie2: {
		trigger: { player: "damageEnd" },
		forced: true,
		popup: false,
		charlotte: true,
		sourceSkill: "yimie",
		filter(event, player) {
			return typeof event.yimie_num == "number";
		},
		async content(event, trigger, player) {
			await player.recover(trigger.yimie_num);
		},
	},

	// 泰然：锁定技，回合结束时，你回复体力至上限且手牌摸至体力上限；出牌阶段开始时，你失去上回合以此法回复的体力，弃置以此法获得的手牌。 参考tairan(yingbian)
	tairan: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return player.hp < player.maxHp || player.countCards("h") < player.maxHp;
		},
		async content(_event, _trigger, player) {
			player.addSkill("tairan2");
			if (!player.storage.tairan2) {
				player.storage.tairan2 = 0;
			}
			const num = player.maxHp - player.hp;
			if (num > 0) {
				player.storage.tairan2 = num;
				await player.recover({ num });
			}
			if (player.countCards("h") >= player.maxHp) {
				return;
			}
			const next = player.drawTo(player.maxHp);
			next.gaintag = ["tairan"];
			await next;
		},
	},
	tairan2: {
		mod: {
			aiOrder(player, card, num) {
				if (card.hasGaintag && card.hasGaintag("tairan")) {
					return 10 * num;
				}
			},
			aiValue(player, card, num) {
				if (card.hasGaintag && card.hasGaintag("tairan")) {
					if (card.name !== "wuxie" && (get.type(card) === "basic" || get.type(card, "trick") === "trick")) {
						return num / 64;
					}
					return num / 8;
				}
			},
			aiUseful(player, card, num) {
				return lib.skill.tairan2.mod.aiValue.apply(this, arguments);
			},
		},
		audio: "tairan",
		trigger: { player: "phaseUseBegin" },
		charlotte: true,
		forced: true,
		onremove: true,
		sourceSkill: "tairan",
		async content(_event, _trigger, player) {
			const map = player.storage.tairan2;
			if (map > 0) {
				player.loseHp(map);
			}
			const hs = player.getCards("h", card => card.hasGaintag("tairan"));
			if (hs.length) {
				player.discard({ cards: hs });
			}
			player.removeSkill("tairan2");
		},
	},

// ========== jiachong 贾充 ==========
	// 凶竖：每回合限一次，一名角色使用【杀】或伤害类锦囊牌指定目标后，若你为此牌的使用者，你可以摸一张牌，然后令一名其他角色代替你成为此牌的伤害来源，若你不为此牌的使用者，你可以弃一张牌，然后代替使用者成为此牌的伤害来源。 参考skill_old.js
	xiongshu: {
		skillAnimation: true,
		animationColor: "water",
		aiShowTag: "response",
		aiShowCost: true,
		audio: 2,
		usable: 1,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			// AOE牌(万箭齐发/南蛮等)一次使用会对每个目标各触发一次useCardToTargeted，
			// 加isFirstTarget保证这类牌只在第一个目标结算时问一次，不会连续弹好几次。
			if (!event.isFirstTarget) {
				return false;
			}
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
				event.result = await player.chooseToDiscard("he").set("prompt2", get.prompt2("xiongshu")).forResult();
			}
		},
		async content(event, trigger, player) {
			if (!game.hasPlayer(current => current != player)) {
				return;
			}
			const useEvent = trigger.getParent();
			if (trigger.player == player) {
				await player.draw();
				const result = await player.chooseTarget("凶竖：选择一名其他角色代替你成为此牌的伤害来源", (card, plyr, target) => target != player).forResult();
				const target = result && result.targets && result.targets[0];
				if (!target) {
					return;
				}
				if (useEvent) {
					useEvent.customArgs = useEvent.customArgs || {};
					useEvent.customArgs.default = useEvent.customArgs.default || {};
					useEvent.customArgs.default.customSource = target;
				}
			} else {
				// 卡面："若你不为此牌的使用者，你可以弃一张牌，然后代替使用者成为此牌的伤害来源"——
				// 是你自己顶替，不是再挑一个人顶替。
				if (useEvent) {
					useEvent.customArgs = useEvent.customArgs || {};
					useEvent.customArgs.default = useEvent.customArgs.default || {};
					useEvent.customArgs.default.customSource = player;
				}
			}
		},
		ai: {
			threaten: 1.0,
		},
	},

	// 奸回：一名角色对与其势力相同的角色造成伤害后，你可以令伤害来源或受伤角色摸一张牌，然后你弃置其中另一名角色的一张牌。 参考skill_old.js
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

// ========== xiahoudun 夏侯惇 ==========
	// 刚烈：当你受到伤害后，你可以进行判定，若结果为：红色，你对伤害来源造成1点伤害；黑色，你弃置其一张牌。 参考gz_ganglie
	ganglie: {
		audio: "ganglie",
		trigger: {
			player: "damageEnd",
		},
		filter(event, player) {
			return event.source != undefined && event.num > 0;
		},
		check(event, player) {
			return get.attitude(player, event.source) <= 0;
		},
		logTarget: "source",
		preHidden: true,
		async content(event, trigger, player) {
			const result = await player.judge(card => (get.color(card) == "red" ? 1 : 0)).forResult();

			switch (result.color) {
				case "black":
					if (trigger.source.countCards("he")) {
						player.discardPlayerCard(trigger.source, "he", true);
					}
					break;

				case "red":
					if (trigger.source.isIn()) {
						trigger.source.damage();
					}
					break;
				default:
					break;
			}
		},
		ai: {
			maixie_defend: true,
			expose: 0.4,
			threaten: 1.3,
		},
	},

	// 清俭：每回合限一次，当你于摸牌阶段外获得牌后，你可以展示任意张牌并将这些牌交给一名其他角色。 参考qingjian(refresh)
	qingjian: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		trigger: { player: "gainAfter" },
		direct: true,
		usable: 1,
		filter(event, player) {
			var evt = event.getParent("phaseDraw");
			if (evt && evt.player == player) {
				return false;
			}
			return event.getg(player).length > 0;
		},
		async content(event, trigger, player) {
			event.cards = trigger.getg(player);
			const result = await player
				.chooseCardTarget({
					filterCard(card) {
						return _status.event.getParent().cards.includes(card);
					},
					selectCard: [1, event.cards.length],
					filterTarget(card, player, target) {
						return player != target;
					},
					allowChooseAll: true,
					ai1(card) {
						if (ui.selected.cards.length > 0) {
							return -1;
						}
						if (card.name == "du") {
							return 20;
						}
						return _status.event.player.countCards("h") - _status.event.player.hp;
					},
					ai2(target) {
						var att = get.attitude(_status.event.player, target);
						if (ui.selected.cards.length && ui.selected.cards[0].name == "du") {
							if (target.hasSkillTag("nodu")) {
								return 0;
							}
							return 1 - att;
						}
						if (target.countCards("h") > _status.event.player.countCards("h")) {
							return 0;
						}
						return att - 4;
					},
					prompt: "展示任意张牌并将这些牌交给一名其他角色",
				})
				.forResult();
			if (!result.bool || !result.cards?.length) {
				return;
			}
			player.logSkill("qingjian", result.targets);
			await player.showCards(result.cards);
			await result.targets[0].gain(result.cards, player, "give");
		},
		ai: {
			expose: 0.3,
		},
	},

// ========== zhenji 甄姬 ==========
	// 倾国：你可以将一张黑色手牌当【闪】使用或打出。 参考qingguo(standard)
	qingguo: {
		mod: {
			aiValue(player, card, num) {
				if (get.name(card) != "shan" && get.color(card) != "black") {
					return;
				}
				const cards = player.getCards("hs", card => get.name(card) == "shan" || get.color(card) == "black");
				cards.sort((a, b) => {
					return (get.name(b) == "shan" ? 1 : 2) - (get.name(a) == "shan" ? 1 : 2);
				});
				const geti = () => {
					if (cards.includes(card)) {
						cards.indexOf(card);
					}
					return cards.length;
				};
				if (get.name(card) == "shan") {
					return Math.min(num, [6, 4, 3][Math.min(geti(), 2)]) * 0.6;
				}
				return Math.max(num, [6.5, 4, 3][Math.min(geti(), 2)]);
			},
			aiUseful(...args) {
				return lib.skill.qingguo.mod?.aiValue?.(...args) ?? 0;
			},
		},
		locked: false,
		audio: 2,
		audioname: ["sb_zhenji"],
		audioname2: {
			re_zhenji: "reqingguo",
		},
		enable: ["chooseToRespond", "chooseToUse"],
		filterCard(card) {
			return get.color(card) === "black";
		},
		viewAs: { name: "shan" },
		viewAsFilter(player) {
			if (!player.hasCards("hs", { color: "black" })) {
				return false;
			}
		},
		position: "hs",
		prompt: "将一张黑色手牌当闪使用或打出",
		check() {
			return 1;
		},
		ai: {
			order: 3,
			respondShan: true,
			skillTagFilter(player) {
				if (!player.hasCards("hs", { color: "black" })) {
					return false;
				}
			},
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "respondShan") && current < 0) {
						return 0.6;
					}
				},
			},
			threaten: 0.8,
		},
	},

	// 洛神：准备阶段，你可以进行判定，若结果为黑色，你可以重复此流程，然后你获得其中所有的判定牌。 参考luoshen(standard)
	luoshen: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		frequent: true,
		preHidden: true,
		async content(event, trigger, player) {
			event.cards ??= [];
			while (true) {
				const judgeEvent = player.judge({
					judge(card) {
						if (get.color(card) == "black") {
							return 1.5;
						}
						return -1.5;
					},
					judge2(result) {
						return result.bool;
					},
				});
				judgeEvent.set("callback", async event => {
					if (event.judgeResult.color === "black") {
						event.getParent().orderingCards.remove(event.card);
					}
				});
				const result = await judgeEvent.forResult();
				if (!result?.bool || !result.card) {
					break;
				}

				event.cards.push(result.card);
				const result2 = await player
					.chooseBool({
						prompt: "是否再次发动【洛神】？",
					})
					.set("frequentSkill", "luoshen")
					.forResult();
				if (!result2?.bool) {
					break;
				}
			}
			if (event.cards.someInD()) {
				await player.gain({
					cards: event.cards.filterInD(),
					animate: "gain2",
				});
			}
		},
	},

	// 神赋：每轮限一次，当你失去最后一张手牌时，你可以发动一次"洛神"。 参考skill_old.js
	shenfu: {
		skillAnimation: true,
		animationColor: "water",
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

// ========== xiahouyuan 夏侯渊 ==========
	// 神速：你可以做出如下选择：1.跳过判定阶段和摸牌阶段；2.跳过出牌阶段并弃置一张装备牌；3.跳过弃牌阶段并叠置。你每选择一项，便视为你使用一张无距离限制的【杀】。 参考shensu1/shensu2(shenhua)/gz_shensu(第③项按叠置改写)
	shensu: {
		audio: "shensu1",
		audioname: ["xiahouba", "re_xiahouyuan", "ol_xiahouyuan"],
		group: ["shensu_1", "shensu_2", "shensu_3"],
		preHidden: ["shensu_1", "shensu_2", "shensu_3"],
		ai: {
			threaten: 1.8,
		},
	},
	shensu_1: {
		audio: 2,
		audioname: ["xiahouba", "re_xiahouyuan", "ol_xiahouyuan"],
		trigger: { player: "phaseJudgeBefore" },
		sourceSkill: "shensu",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("shensu"), "跳过判定阶段和摸牌阶段，视为对一名其他角色使用一张无距离限制的【杀】", function (card, player, target) {
					if (player == target) {
						return false;
					}
					return player.canUse({ name: "sha" }, target, false);
				})
				.set("check", player.countCards("h") > 2)
				.set("ai", function (target) {
					if (!_status.event.check) {
						return 0;
					}
					return get.effect(target, { name: "sha" }, _status.event.player);
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.skip("phaseDraw");
			await player.useCard({ name: "sha", isCard: true }, event.targets[0], false);
		},
	},
	shensu_2: {
		audio: "shensu1",
		audioname: ["xiahouba", "re_xiahouyuan", "ol_xiahouyuan"],
		trigger: { player: "phaseUseBefore" },
		sourceSkill: "shensu",
		filter(event, player) {
			return (
				player.countCards("he", function (card) {
					if (_status.connectMode) {
						return true;
					}
					return get.type(card) == "equip";
				}) > 0
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt("shensu"),
					prompt2: "弃置一张装备牌并跳过出牌阶段，视为对一名其他角色使用一张无距离限制的【杀】",
					filterCard(card, player) {
						return get.type(card) == "equip" && lib.filter.cardDiscardable(card, player);
					},
					position: "he",
					filterTarget(card, player, target) {
						if (player == target) {
							return false;
						}
						return player.canUse({ name: "sha" }, target, false);
					},
					ai1(card) {
						if (_status.event.check) {
							return 0;
						}
						return 6 - get.value(card);
					},
					ai2(target) {
						if (_status.event.check) {
							return 0;
						}
						return get.effect(target, { name: "sha" }, _status.event.player);
					},
					check:
						player.countCards("hs", i => {
							return player.hasValueTarget(i, null, true);
						}) >
						player.hp - 1,
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			await player.discard(event.cards[0]);
			await player.useCard({ name: "sha", isCard: true }, event.targets[0], false);
		},
	},
	shensu_3: {
		audio: "shensu1",
		audioname: ["xiahouba", "re_xiahouyuan", "ol_xiahouyuan"],
		trigger: { player: "phaseDiscardBefore" },
		sourceSkill: "shensu",
		async cost(event, trigger, player) {
			const check = player.needsToDiscard() || player.isTurnedOver();
			event.result = await player
				.chooseTarget(get.prompt("shensu"), "跳过弃牌阶段并叠置，视为对一名其他角色使用一张无距离限制的【杀】", function (card, player, target) {
					if (player == target) {
						return false;
					}
					return player.canUse({ name: "sha" }, target, false);
				})
				.set("check", check)
				.set("ai", function (target) {
					if (!_status.event.check) {
						return 0;
					}
					return get.effect(target, { name: "sha" }, _status.event.player, _status.event.player);
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			await player.turnOver();
			await player.useCard({ name: "sha", isCard: true }, event.targets[0], false);
		},
	},

	// 设变：锁定技，当你受到来自黑色牌的伤害后，可以复原武将牌。 参考skill_old.js
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

// ========== zhanghe 张郃 ==========
	// 巧变：你可以弃置一张牌或将其置于牌堆顶，跳过你的一个阶段（准备阶段和结束阶段除外）。当你因延时锦囊以外的效果跳过：摸牌阶段，你可以获得至多两名其他角色各一张手牌；出牌阶段，你可以移动场上的一张牌。 参考gz_qiaobian
	//
	// 实现说明：拆成qiaobian1（自己选择是否跳过）和qiaobian2（跳过后结算奖励，不论是
	// 自己跳过的还是被别的效果跳过的）两个独立技能，都直接写进character.js的skills
	// 数组，不用group/preHidden挂载——preHidden只在角色带hasHiddenSkill(整体暗置)时
	// 才影响技能触发路径，本项目所有角色都没有这个标记，之前的group+preHidden写法和
	// 现在这个直接摊平的写法在注册路径上其实等价，这里拆开单纯是为了减少单个技能内部
	// 的分支复杂度、便于排查。
	// qiaobian1监听"phaseXBegin"——这一时机只有在"其他技能"已经处理完同一阶段的Before
	// 且没有把该阶段cancel/skip掉时才会到达，所以在这里发起"是否自己选择跳过"的询问，
	// 不会跟别的技能的Before抢时机。
	// qiaobian2监听"phaseXCancelled"/"phaseXSkipped"（分别对应"Before阶段被别的技能
	// cancel()掉"和"阶段真正开始前就被player.skip()标记跳过"，两者与Begin互斥且穷尽；
	// 用apps/core/character/_merged_skill_all.md里大量官方技能验证过官方一律是把
	// "XSkipped"和"XCancelled"配对监听，而不是"XOmitted"——之前按自己读gameEvent.ts
	// _triggered状态机推出来的"Omitted"是想当然，没有任何官方技能这么用）以及
	// "phaseZhunbei"（用于在每回合开始时记录判定区里的延时锦囊，供奖励结算时排除
	// 因乐不思蜀/兵粮寸断导致的跳过）。
	qiaobian1: {
		skillAnimation: true,
		animationColor: "water",
		audio: "qiaobian",
		sourceSkill: "qiaobian",
		trigger: {
			player: ["phaseJudgeBegin", "phaseDrawBegin", "phaseUseBegin", "phaseDiscardBegin"],
		},
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			let check;
			switch (trigger.name) {
				case "phaseJudge":
					check = player.countCards("j");
					break;
				case "phaseDraw": {
					let i;
					let num = 0;
					let num2 = 0;
					const players = game.filterPlayer(lib.filter.all);
					for (i = 0; i < players.length; i++) {
						if (player != players[i] && players[i].countCards("h")) {
							const att = get.attitude(player, players[i]);
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
						check = game.hasPlayer(current => {
							return get.attitude(player, current) > 0 && current.countCards("j") > 0;
						});
						if (!check) {
							if (player.countCards("h") > player.hp + 1) {
								check = false;
							} else if (player.countCards("h", { name: "wuzhong" })) {
								check = false;
							} else {
								check = true;
							}
						}
					}
					break;
				case "phaseDiscard":
					check = player.needsToDiscard();
					break;
			}
			const phaseName = { phaseJudge: "判定", phaseDraw: "摸牌", phaseUse: "出牌", phaseDiscard: "弃牌" }[trigger.name];
			const choice = await player
				.chooseControl("discard", "top", "cancel2")
				.set("prompt", get.prompt("qiaobian"))
				.set("choiceList", ["弃置一张手牌，跳过" + phaseName + "阶段", "将一张手牌置于牌堆顶，跳过" + phaseName + "阶段", "不发动"])
				.set("check", check)
				.set("ai", () => (get.event().check ? "discard" : "cancel2"))
				.forResult();
			if (choice.control == "cancel2") {
				event.result = { bool: false };
				return;
			}
			const cardResult = await player
				.chooseCard("h", 1, "巧变：选择一张手牌", lib.filter.cardDiscardable)
				.set("ai", card => 7 - get.value(card))
				.setHiddenSkill(event.skill)
				.forResult();
			if (!cardResult.bool || !cardResult.cards?.length) {
				event.result = { bool: false };
				return;
			}
			if (choice.control == "top") {
				await game.cardsGotoPile(cardResult.cards, "insert");
			} else {
				await player.discard(cardResult.cards);
			}
			event.result = { bool: true, control: choice.control };
		},
		async content(event, trigger, player) {
			trigger.cancel();
			const phaseName = { phaseJudge: "判定", phaseDraw: "摸牌", phaseUse: "出牌", phaseDiscard: "弃牌" }[trigger.name];
			game.log(player, "跳过了", "#y" + phaseName + "阶段");
			// 巧变2(qiaobian2)已经监听了phaseDrawCancelled/phaseUseCancelled，trigger.cancel()后会自然触发那边的奖励结算，
			// 这里不能再手动调一次qiaobianGrantBonus，否则会连续拿两次奖励。
		},
		ai: {
			threaten: 3,
		},
	},
	qiaobian2: {
		audio: "qiaobian",
		sourceSkill: "qiaobian",
		trigger: {
			player: ["phaseZhunbei", "phaseDrawCancelled", "phaseDrawSkipped", "phaseUseCancelled", "phaseUseSkipped"],
		},
		filter(event, player, name) {
			if (name == "phaseZhunbei") {
				return true;
			}
			if (typeof name != "string") {
				return false;
			}
			const delayCard = name.startsWith("phaseDraw") ? "bingliang" : "lebu";
			return !(player.storage.qiaobian_delay || []).includes(delayCard);
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const name = event.triggername;
			if (name == "phaseZhunbei") {
				const judges = player.getCards("j");
				player.storage.qiaobian_delay = judges.filter(c => get.type(c) == "delay").map(c => c.name);
				return;
			}
			await qiaobianGrantBonus(trigger, player);
		},
	},

// ========== caoren 曹仁 ==========
	// 据守：结束阶段，你可以摸X张牌（X为存活角色亮明势力数），然后你可以使用一张装备牌。若X大于2，则你将武将牌叠置。 参考gz_jushou
	jushou: {
		skillAnimation: true,
		animationColor: "water",
		audio: "xinjushou",
		trigger: {
			player: "phaseJieshuBegin",
		},
		preHidden: true,
		async content(event, trigger, player) {
			"step 0";
			const groups = [];
			const players = game.filterPlayer(lib.filter.all);

			for (const target of players) {
				if (target.isUnseen(-1)) {
					continue;
				}
				let add = true;
				for (const group of groups) {
					if (group.isFriendOf(target)) {
						add = false;
						break;
					}
				}
				if (add) {
					groups.add(target);
				}
			}
			const num = groups.length;
			await player.draw(num);
			if (num > 2) {
				await player.turnOver();
			}

			const result = await player
				.chooseCard("he", false, "使用一张装备牌")
				.set("ai", card => {
					if (get.type(card) == "equip") {
						return 5 - get.value(card);
					}
					return -1;
				})
				.set("filterCard", card => get.type(card) == "equip")
				.forResult();

			if (result.bool && result.cards?.length && player.hasUseTarget(result.cards[0])) {
				player.chooseUseTarget(result.cards[0], true, "nopopup");
			}
		},
		ai: {
			threaten: 0.8,
		},
	},

	// 严整：若你处于叠置状态，你可以将一张装备牌当【无懈可击】使用。当你的【无懈可击】被抵消或其他角色的锦囊牌对你生效后，你可以平置武将牌。 参考skill_old.js
	yanzheng: {
		aiShowTag: "support",
		audio: 2,
		group: ["yanzheng_flat"],
		enable: ["chooseToUse"],
		filter(event, player) {
			return event.type === "wuxie";
		},
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
		trigger: { player: "useCardAfter", global: "useCardToTargeted" },
		filter(event, player, name) {
			if (!player.isTurnedOver()) {
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
			await player.turnOver(false);
		},
	},

// ========== dianwei 典韦 ==========
	// 强袭：出牌阶段对每名角色限一次，你可以失去1点体力或弃置一张武器牌，对一名其他角色造成1点伤害。 参考qiangxix(shenhua)
	qiangxix: {
		audio: "qiangxi",
		audioname: ["boss_lvbu3"],
		mod: {
			aiOrder(player, card, num) {
				if (player.getEquips(1).length || get.subtype(card, player) !== "equip1" || !player.hasSkillTag("noe")) {
					return num;
				}
				return 10;
			},
		},
		enable: "phaseUse",
		locked: false,
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
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			var stat = player.getStat()._qiangxix;
			return !stat || !stat.includes(target);
		},
		selectCard() {
			if (_status.event.player.hp < 1) {
				return 1;
			}
			return [0, 1];
		},
		async content(event, trigger, player) {
			const { target, cards } = event;
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

// ========== xunyu 荀彧 ==========
	// 驱虎：出牌阶段限一次，你可以与一名体力值大于你的角色拼点。若你：赢，其对其攻击范围内你指定的另一名角色造成1点伤害；没赢，其对你造成1点伤害。 参考gz_quhu
	quhu: {
		audio: "quhu",
		audioname: ["re_xunyu", "ol_xunyu"],
		enable: "phaseUse",
		usable: 1,
		filter(_event, player) {
			if (player.countCards("h") == 0) {
				return false;
			}
			return game.hasPlayer(current => current.hp > player.hp && player.canCompare(current));
		},
		filterTarget(_card, player, target) {
			return target.hp > player.hp && player.canCompare(target);
		},
		async content(event, _trigger, player) {
			const target = event.target;
			const { bool } = await player.chooseToCompare(target, void 0).forResult();
			if (!bool) {
				return void (await player.damage(target));
			}
			if (!game.hasPlayer(player => player != target && target.inRange(player))) {
				return;
			}
			const result = await player
				.chooseTarget((card, player, target) => {
					const source = _status.event?.source;
					return target != source && source?.inRange(target);
				}, true)
				.set("ai", target => get.damageEffect(target, _status.event?.source, player))
				.set("source", target)
				.forResult();
			if (!result.bool || !result.targets || !result.targets.length) {
				return;
			}
			target.line(result.targets[0], "green");
			await result.targets[0].damage(target);
		},
		ai: {
			order: 0.5,
			result: {
				target(player, target) {
					const att = get.attitude(player, target);
					const oc = target.countCards("h") == 1;
					if (att > 0 && oc) {
						return 0;
					}
					const players = game.filterPlayer(lib.filter.all);
					for (let i = 0; i < players.length; i++) {
						if (players[i] != target && players[i] != player && target.inRange(players[i])) {
							if (get.damageEffect(players[i], target, player) > 0) {
								return att > 0 ? att / 2 : att - (oc ? 5 : 0);
							}
						}
					}
					return 0;
				},
				player(player, target) {
					if (target.hasSkillTag("jueqing", false, target)) {
						return -10;
					}
					const hs = player.getCards("h");
					let mn = 1;
					for (let i = 0; i < hs.length; i++) {
						const num = get.number(hs[i]);
						if (typeof num == "number") {
							mn = Math.max(mn, num);
						}
					}
					if (mn <= 11 && player.hp < 2) {
						return -20;
					}
					let max = player.maxHp - hs.length;
					const players = game.filterPlayer(lib.filter.all);
					for (let i = 0; i < players.length; i++) {
						if (get.attitude(player, players[i]) > 2) {
							max = Math.max(Math.min(5, players[i].hp) - players[i].countCards("h"), max);
						}
					}
					switch (max) {
						case 0:
							return mn == 13 ? 0 : -20;
						case 1:
							return mn >= 12 ? 0 : -15;
						case 2:
							return 0;
						case 3:
							return 1;
						default:
							return max;
					}
				},
			},
			expose: 0.2,
			threaten: 1.3,
		},
	},

	// 节命：当你受到伤害或死亡时，你可以令一名角色摸X张牌，然后将手牌弃置至X张（X为其体力上限且至多为5）。 参考gz_jieming
	jieming: {
		audio: "jieming",
		trigger: {
			player: ["damageEnd", "dieAfter"],
		},
		preHidden: true,
		async cost(event, _trigger, player) {
			const next = player.chooseTarget(get.prompt("jieming"), "令一名角色摸X张牌，然后将手牌弃置至X张（X为其体力上限且至多为5）");

			next.set("ai", check);
			next.setHiddenSkill("jieming");

			event.result = await next.forResult();

			function check(target) {
				const player = get.player();
				const att = get.attitude(player, target);
				if (att > 2) {
					return Math.max(0, Math.min(5, target.maxHp) - target.countCards("h"));
				}
				return att / 3;
			}
		},
		logTarget: "targets",
		async content(event, _trigger, _player) {
			for (const target of event.targets) {
				const num = Math.min(5, target.maxHp);
				if (num > 0) {
					await target.draw(num);
				}
				if (target.countCards("h") > num) {
					await target.chooseToDiscard(target.countCards("h") - num, "h", true);
				}
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "damage") && target.hp > 1) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						let max = 0;
						const players = game.filterPlayer(lib.filter.all);
						for (let i = 0; i < players.length; i++) {
							if (get.attitude(target, players[i]) > 0) {
								max = Math.max(Math.min(5, players[i].hp) - players[i].countCards("h"), max);
							}
						}
						switch (max) {
							case 0:
								return 2;
							case 1:
								return 1.5;
							case 2:
								return [1, 2];
							default:
								return [0, max];
						}
					}
				},
			},
		},
	},

// ========== caopi 曹丕 ==========
	// 行殒：当其他角色死亡时，你可以选择一项：1.获得其所有牌；2.回复1点体力。 参考gz_xingshang
	xingyun: {
		audio: "xingshang",
		trigger: {
			global: "die",
		},
		preHidden: true,
		target: "player",
		filter(event, player) {
			return event.player != player;
		},
		logTarget: "player",
		async cost(event, trigger, player) {
			const choices = ["获得其所有牌"];
			if (player.hp < player.maxHp) {
				choices.push("回复1点体力");
			}
			const result = await player.chooseControl(choices).set("prompt", "行殒：请选择一项").set("ai", () => choices[0]).forResult();
			event.result = { bool: true, cost_data: result.control };
		},
		async content(event, trigger, player) {
			if (event.cost_data == "获得其所有牌") {
				const toGain = trigger.player.getCards("he");
				if (toGain.length) {
					await player.gain(toGain, trigger.player, "giveAuto", "bySelf");
				}
			} else {
				await player.recover();
			}
		},
	},

	// 放逐：当你受到伤害后，你可以令一名其他角色选择一项：1.弃置X张牌并失去1点体力；2.摸X张牌并翻面（X为你已损失的体力值）。 参考gz_fangzhu
	fangzhu: {
		audio: "fangzhu",
		audioname2: {
			new_simayi: "refangzhu_new_simayi",
		},
		trigger: {
			player: "damageEnd",
		},
		preHidden: true,
		async cost(event, _trigger, player) {
			const next = player.chooseTarget(get.prompt2("fangzhu"), (_card, player, target) => player != target);

			next.setHiddenSkill("fangzhu");
			next.set("ai", check);

			event.result = await next.forResult();

			return;

			function check(target) {
				if (target.hasSkillTag("noturn")) {
					return 0;
				}

				const player = get.player();
				const att = get.attitude(player, target);

				if (att == 0) {
					return 0;
				}
				if (att > 0) {
					if (target.isTurnedOver()) {
						return 1000 - target.countCards("h");
					}
					return -1;
				} else {
					if (target.isTurnedOver()) {
						return -1;
					}
					if (player.getDamagedHp() >= 3) {
						return -1;
					}
					return target.countCards("h") + 1;
				}
			}
		},
		logTarget: "targets",
		async content(event, _trigger, player) {
			const { targets } = event;
			const target = targets[0];
			const num = player.getDamagedHp();

			let result;

			if (num > 0) {
				const str = [`放逐：弃置${get.cnNumber(num)}张牌并失去1点体力`, `或者点击“取消”不弃牌，改为摸${get.cnNumber(num)}张牌并翻面`];
				const next = target.chooseToDiscard(num, "he", ...str);
				next.set("ai", check);

				result = await next.forResult();
			} else {
				result = {
					bool: false,
					cards: [],
				};
			}

			if (result.bool) {
				await target.loseHp();
			} else {
				if (num > 0) {
					await target.draw(num);
				}
				await target.turnOver(void 0);
			}

			return;

			function check(card) {
				const player = get.player();
				if (player.isTurnedOver()) {
					return -1;
				}
				return player.hp * player.hp - Math.max(1, get.value(card));
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
						const players = game.filterPlayer(lib.filter.all);
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
			threaten: 1.4,
		},
	},

// ========== dengai 邓艾 ==========
	// 屯田：当你于回合外失去牌后，你可以判定，若结果为♥，你获得之，否则你可以将此判定牌置于你的武将牌上，称为"田"。你计算与其他角色的距离-X（X为"田"的数量）。当一名与你势力相同的角色受到伤害后，你可以将一张"田"交给该角色。 参考tuntian(shenhua)
	tuntian: {
		audio: 2,
		audioname: ["gz_dengai"],
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		frequent: true,
		preHidden: true,
		filter(event, player) {
			if (player == _status.currentPhase) {
				return false;
			}
			if (event.name == "gain" && event.player == player) {
				return false;
			}
			const evt = event.getl(player);
			return evt && evt.cards2 && evt.cards2.length > 0;
		},
		async content(event, trigger, player) {
			const judge = player.judge(function (card) {
				if (get.suit(card) == "heart") {
					return -1;
				}
				return 1;
			});
			judge.judge2 = function (result) {
				return result.bool;
			};
			const result = await judge.forResult();
			if (result.bool) {
				return void (await player.gain([result.card], "gain2"));
			}
			const card = result.card;
			const chooseBool = player.chooseBool("是否将" + get.translation(card) + "作为“田”置于武将牌上？");
			chooseBool.ai = function () {
				return true;
			};
			const { bool } = await chooseBool.forResult();
			if (!bool) {
				return;
			}
			const addToExpansion = player.addToExpansion(card, "gain2");
			addToExpansion.gaintag.add("tuntian");
			await addToExpansion;
		},
		marktext: "田",
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
		group: ["tuntian_dist", "tuntian_give"],
		locked: false,
		subSkill: {
			dist: {
				locked: false,
				mod: {
					globalFrom(from, to, distance) {
						return distance - from.getExpansions("tuntian").length;
					},
				},
			},
			give: {
				trigger: { player: "damageEnd" },
				preHidden: true,
				filter(event, player) {
					return player.getExpansions("tuntian").length > 0 && game.hasPlayer(current => current != player && current.isFriendOf(player));
				},
				async cost(event, trigger, player) {
					const result = await player
						.chooseTarget("将一张“田”交给一名与你势力相同的角色", (card, player, target) => target != player && target.isFriendOf(player))
						.forResult();
					event.result = result;
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					const cards = player.getExpansions("tuntian");
					if (cards.length && target) {
						await player.give(cards.slice(0, 1), target);
					}
				},
			},
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

	// 急袭：你可以将一张"田"当【顺手牵羊】使用。 参考jixi(shenhua)
	jixi: {
		audio: 2,
		audioname: ["re_dengai", "gz_dengai", "ol_dengai"],
		enable: "phaseUse",
		filter(event, player) {
			return player.getExpansions("tuntian").length > 0 && event.filterCard({ name: "shunshou" }, player, event);
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("急袭", player.getExpansions("tuntian"), "hidden");
			},
			filter(button, player) {
				const card = button.link;
				if (!game.checkMod(card, player, "unchanged", "cardEnabled2", player)) {
					return false;
				}
				const evt = _status.event.getParent();
				return evt.filterCard(get.autoViewAs({ name: "shunshou" }, [card]), player, evt);
			},
			backup(links, player) {
				return {
					audio: "jixi",
					audioname: ["re_dengai", "gz_dengai", "ol_dengai"],
					selectCard: -1,
					position: "x",
					filterCard: card => card == lib.skill.jixi_backup.card,
					viewAs: { name: "shunshou" },
					card: links[0],
				};
			},
			prompt(links, player) {
				return "选择 顺手牵羊（" + get.translation(links[0]) + "）的目标";
			},
		},
		subSkill: {
			backup: {},
		},
		ai: {
			order: 10,
			result: {
				player(player) {
					return player.getExpansions("tuntian").length - 1;
				},
			},
			combo: "tuntian",
		},
	},

// ========== lidian 李典 ==========
	// 恂恂：摸牌阶段开始时，你可以观看牌堆顶的四张牌，将其中两张牌以任意顺序置于牌堆顶，其余以任意顺序置于牌堆底。 参考xunxun(refresh)
	xunxun: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		preHidden: true,
		frequent: true,
		async content(event, trigger, player) {
			const cards = get.cards(4, true);
			await game.cardsGotoOrdering(cards);
			const result = await player
				.chooseToMove("恂恂：将两张牌置于牌堆顶（靠左的牌更靠上）", true)
				.set("list", [["牌堆顶", cards], ["牌堆底"]])
				.set("filterMove", function (from, to, moved) {
					if (to == 1 && moved[1].length >= 2) {
						return false;
					}
					return true;
				})
				.set("filterOk", function (moved) {
					return moved[1].length == 2;
				})
				.set("processAI", function (list) {
					var cards = list[0][1].slice(0).sort(function (a, b) {
						return get.value(b) - get.value(a);
					});
					return [cards, cards.splice(2)];
				})
				.forResult();
			const top = result.moved[0];
			const bottom = result.moved[1];
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

	// 忘隙：当你对其他角色造成1点伤害后，或当你受到其他角色造成的1点伤害后，你可以摸两张牌并将其中一张牌交给其。 参考wangxi(refresh)
	wangxi: {
		audio: 2,
		trigger: { player: "damageEnd", source: "damageSource" },
		getIndex: event => event.num,
		filter(event) {
			if (event._notrigger.includes(event.player)) {
				return false;
			}
			return event.num && event.source?.isIn() && event.player?.isIn() && event.source != event.player;
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
		logTarget(event, player) {
			if (event.player == player) {
				return event.source;
			}
			return event.player;
		},
		preHidden: true,
		async content(event, trigger, player) {
			const target = trigger.player == player ? trigger.source : trigger.player;
			const { cards: gained } = await player.draw(2).forResult();
			const result = await player
				.chooseCard(true, "将摸到的牌中的一张交给" + get.translation(target))
				.set("gained", gained)
				.set("filterCard", (card, player) => get.event().gained.includes(card))
				.forResult();
			if (result.bool && result.cards?.length) {
				await player.give(result.cards, target);
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			threaten: 0.8,
		},
	},

// ========== caohong 曹洪 ==========
	// 护援：出牌阶段结束时，你可以展示并交给一名其他角色一张牌，若此牌为锦囊牌，你可以移动场上一张牌；若此牌为装备牌，其可以使用之，然后你可以弃置场上一张牌。 参考skill_old.js
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
			await player.showCards(cards, get.translation(player) + "展示的牌");
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

	// 鹤翼：与你势力相同的角色拥有"飞影"。 参考heyi(guozhan)
	heyi: {
		zhenfa: "inline",
		global: "heyi_distance",
		subSkill: {
			distance: {
				mod: {
					globalTo(from, to, distance) {
						if (
							game.hasPlayer(current => {
								return current.hasSkill("heyi") && current.inline(to);
							})
						) {
							return distance + 1;
						}
					},
				},
			},
		},
	},

	// 飞影：锁定技，其他角色计算与你的距离+1。 参考gz_feiying
	feiying: {
		mod: {
			globalTo(from, to, distance) {
				return distance + 1;
			},
		},
		ai: {
			threaten: 0.7,
		},
	},

// ========== wenpin 文聘 ==========
	// 镇卫：其他角色成为【杀】或黑色锦囊牌的唯一目标时，你可以将此牌转移给你。 参考zhenwei(sp)
	zhenwei: {
		audio: 2,
		trigger: { global: "useCardToTarget" },
		filter(event, player) {
			if (player == event.player || player == event.target) {
				return false;
			}
			if (event.targets.length > 1) {
				return false;
			}
			if (!event.target) {
				return false;
			}
			const card = event.card;
			if (card.name == "sha") {
				return true;
			}
			if (get.color(card) == "black" && get.type(card, "trick") == "trick") {
				return true;
			}
			return false;
		},
		check(event, player) {
			return get.effect(event.target, event.card, event.player, player) < 0;
		},
		async content(event, trigger, player) {
			trigger.getParent().targets.remove(trigger.target);
			if (trigger.getParent().triggeredTargets2) {
				trigger.getParent().triggeredTargets2.remove(trigger.target);
			}
			trigger.getParent().targets.push(player);
			trigger.untrigger();
			trigger.player.line(player);
			await game.delayx();
		},
		ai: {
			threaten: 1.3,
		},
	},

// ========== xunyou 荀攸 ==========
	// 奇策：出牌阶段限一次，你可以将所有手牌当一张目标数不大于X的普通锦囊牌使用（X为你的手牌数）。 参考gz_qice
	qice: {
		audio: "qice",
		usable: 1,
		enable: "phaseUse",
		filter(_event, player) {
			var hs = player.getCards("h");
			if (!hs.length) {
				return false;
			}
			for (var i = 0; i < hs.length; i++) {
				var mod2 = game.checkMod(hs[i], player, "unchanged", "cardEnabled2", player);
				if (mod2 === false) {
					return false;
				}
			}
			return true;
		},
		chooseButton: {
			dialog() {
				var list = lib.inpile;
				var list2 = [];
				for (var i = 0; i < list.length; i++) {
					if (list[i] != "wuxie" && get.type(list[i]) == "trick") {
						list2.push(["锦囊", "", list[i]]);
					}
				}
				return ui.create.dialog(get.translation("qice"), [list2, "vcard"]);
			},
			filter(button, player) {
				var card = { name: button.link[2] };
				var info = get.info(card);
				var num = player.countCards("h");
				if (get.select(info.selectTarget)[1] == -1) {
					if (
						game.countPlayer(function (current) {
							return player.canUse(card, current);
						}) > num
					) {
						return false;
					}
				} else if (info.changeTarget) {
					var giveup = true;
					var list = game.filterPlayer(function (current) {
						return player.canUse(card, current);
					});
					for (var i = 0; i < list.length; i++) {
						var targets = [list[i]];
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
				return lib.filter.filterCard(card, player, _status.event.getParent());
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
					audio: "qice",
					selectCard: -1,
					position: "h",
					selectTarget() {
						var select = get.select(get.info(get.card()).selectTarget);
						var nh = _status.event.player.countCards("h");
						if (select[1] > nh) {
							select[1] = nh;
						}
						return select;
					},
					filterTarget(card, player, target) {
						var info = get.info(card);
						if (info.changeTarget) {
							var targets = [target];
							info.changeTarget(player, targets);
							if (targets.length > player.countCards("h")) {
								return false;
							}
						}
						return lib.filter.filterTarget(card, player, target);
					},
					popname: true,
					viewAs: { name: links[0][2] },
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
			result: {
				player(player) {
					var num = 0;
					var cards = player.getCards("h");
					if (cards.length >= 3 && player.hp >= 3) {
						return 0;
					}
					for (var i = 0; i < cards.length; i++) {
						num += Math.max(0, get.value(cards[i], player, "raw"));
					}
					return 16 - num;
				},
			},
			threaten: 1.6,
		},
	},

	// 智愚：当你受到伤害后，你可以摸一张牌，然后展示所有手牌，若颜色均相同，伤害来源弃置一张手牌。 参考zhiyu(yijiang)
	zhiyu: {
		audio: 2,
		trigger: { player: "damageEnd" },
		preHidden: true,
		async content(event, trigger, player) {
			await player.draw();
			if (!player.hasCard(() => true, "h")) {
				return;
			}
			await player.showHandcards();
			if (!trigger.source) {
				return;
			}
			const cards = player.getCards("h");
			const color = get.color(cards[0], player);
			for (const card of cards.slice(1)) {
				if (get.color(card, player) !== color) {
					return;
				}
			}
			await trigger.source.chooseToDiscard({ forced: true });
		},
		ai: {
			maixie_defend: true,
			threaten: 0.9,
		},
	},

// ========== cuimao 崔琰&毛玠 ==========
	// 征辟：出牌阶段每项限一次：1.选择一名未确定势力的角色，直到回合结束或其明置武将牌，你对其使用牌无距离和次数限制；2.选择一名有明置武将牌的角色，交给其一张牌，然后其交给你一张除此牌以外的非基本牌或两张基本牌。 参考gz_zhengbi(旧版卡面)，2026年重印卡面文本改动较大，按新文本重写
	zhengbi: {
		skillAnimation: true,
		animationColor: "water",
		audio: "zhengbi",
		enable: "phaseUse",
		group: ["zhengbi_reset"],
		preHidden: ["zhengbi_reset"],
		filterTarget(card, player, target) {
			if (target === player) {
				return false;
			}
			if (target.isUnseen()) {
				return !player.storage.zhengbi_used1;
			}
			return !player.storage.zhengbi_used2;
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (target.isUnseen()) {
				player.storage.zhengbi_used1 = true;
				player.storage.zhengbi_target = target;
				player.addTempSkill("zhengbi_effect", "phaseUseAfter");
				return;
			}
			player.storage.zhengbi_used2 = true;
			const giveResult = await player
				.chooseToGive(target, "he", true)
				.set("ai", card => 5 - get.value(card))
				.forResult();
			if (!giveResult.bool || !giveResult.cards || !giveResult.cards.length) {
				return;
			}
			const givenCard = giveResult.cards[0];
			const choices2 = [];
			if (target.countCards("he", card => card != givenCard && get.type(card) != "basic")) {
				choices2.push("一张非基本牌");
			}
			if (target.countCards("he", card => card != givenCard && get.type(card) == "basic") > 1) {
				choices2.push("两张基本牌");
			}
			if (!choices2.length) {
				return;
			}
			const result2 = await target.chooseControl(choices2).set("prompt", "征辟：交给" + get.translation(player)).forResult();
			const check = result2.control == "一张非基本牌";
			const result3 = await target
				.chooseCard("he", check ? 1 : 2, card => card != givenCard && (check ? get.type(card) != "basic" : get.type(card) == "basic"), true)
				.forResult();
			if (result3.cards && result3.cards.length) {
				await target.give(result3.cards, player);
			}
		},
		subSkill: {
			reset: {
				sub: true,
				trigger: { player: "phaseZhunbeiBegin" },
				silent: true,
				forced: true,
				content() {
					delete player.storage.zhengbi_used1;
					delete player.storage.zhengbi_used2;
					delete player.storage.zhengbi_target;
				},
			},
			effect: {
				charlotte: true,
				mod: {
					targetInRange(card, player, target) {
						// 用identity=="unknown"而不是isUnseen()：一旦目标本回合内明置导致势力确定，
						// 哪怕武将牌暗置状态本身没变化，这条"对未定势力无限制"的效果也应立即失效。
						if (target === player.storage.zhengbi_target && target.identity == "unknown") {
							return true;
						}
					},
					// 次数限制是按"这张牌今天已经用了几次"整体计数的，cardUsable这个mod的第三个参数
					// 收到的是这个已用次数(number)，不是target，写在这里恒为false没有意义；真正
					// "对特定目标不受今天已用次数限制"要用cardUsableTarget这个mod（第三个参数才是
					// 具体的目标Player），原来这里写错了mod名导致这条"无次数限制"从来没真正生效过。
					cardUsableTarget(card, player, target) {
						if (target === player.storage.zhengbi_target && target.identity == "unknown") {
							return true;
						}
					},
				},
			},
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					if (target.isUnseen()) {
						return 1;
					}
					return get.attitude(player, target) > 0 ? 1 : -1;
				},
			},
		},
	},

	// 奉迎：限定技，出牌阶段，你可以进行一个额外的回合，然后每名与你势力相同且手牌数小于体力上限的角色摸牌至体力上限。 参考gz_fengying(guozhan native)，但按用户明确要求砍掉了官方"挟天子"卡牌自带的两个副作用：
	// 不走真正的卡牌使用流程（不会被无懈可击响应/抵消），也不需要弃置一张手牌，直接授予额外回合。
	fengying: {
		audio: "fengying",
		enable: "phaseUse",
		filter(_event, player) {
			return !player.storage.fengying;
		},
		limited: true,
		skillAnimation: "epic",
		animationColor: "gray",
		async content(event, trigger, player) {
			player.awakenSkill("fengying", undefined);
			player.storage.fengying = true;
			player.addSkill("fengying_grant");
			// 照抄真正挟天子卡牌的用法(apps/core/card/guozhan.js:657)：发动后立即结束本回合的
			// 出牌阶段(skipped=true)，让本回合尽快走完弃牌/结束阶段，phaseDiscardAfter那步
			// 才能尽快触发，不用等玩家把出牌阶段剩下的操作走完。
			const useEvt = event.getParent("phaseUse");
			if (useEvt && useEvt.name === "phaseUse") {
				useEvt.skipped = true;
			}

			const list = game.filterPlayer(current => current.isFriendOf(player) && current.countCards("h") < current.maxHp);
			list.sort(lib.sort.seat);
			player.line(list, "thunder");
			await game.asyncDraw(list, current => current.maxHp - current.countCards("h"));
		},
		// 注意：fengying_grant不能写进group——group声明的子技能只要玩家拥有fengying就永远挂着，
		// 会导致每个回合的phaseDiscardAfter都无条件insertPhase()，跟"限定技发动过之后才生效"完全不符。
		// 只在content里按需player.addSkill()挂上，子技能自己content里再removeSkill()卸掉。
		subSkill: {
			// 直接照抄真正的挟天子技能本体(apps/core/card/guozhan.js:2132的xietianzi)，
			// 只去掉里面"是否弃一张手牌"的成本判断，其余(触发时机phaseDiscardAfter、
			// 不带参数的insertPhase()、发动后自行removeSkill)原样保留。
			grant: {
				charlotte: true,
				forced: true,
				popup: false,
				nopop: true,
				trigger: { player: "phaseDiscardAfter" },
				content(event, trigger, player) {
					player.removeSkill("fengying_grant");
					player.insertPhase();
				},
			},
		},
		ai: {
			order: 0.1,
			result: {
				player(player) {
					let value = 0;
					const cards = player.getCards("h");
					if (cards.length >= 4) {
						return 0;
					}
					for (let i = 0; i < cards.length; i++) {
						value += Math.max(0, get.value(cards[i], player, "raw"));
					}
					const targets = game.filterPlayer(function (current) {
						return current.isFriendOf(player) && current != player;
					});
					let eff = 0;
					for (let i = 0; i < targets.length; i++) {
						var num = targets[i].countCards("h") - targets[i].maxHp;
						if (num <= 0) {
							continue;
						}
						eff += num;
					}
					return 5 * eff - value;
				},
			},
		},
	},

// ========== zangba 臧霸 ==========
	// 横江：同势力角色受到伤害后，你可以横置伤害来源；若其已横置，则改为对其造成1点雷电伤害。当前回合的弃牌阶段结束时，伤害来源弃置一张牌。 参考gz_hengjiang
	hengjiang: {
		audio: "hengjiang",
		trigger: { global: "damageEnd" },
		preHidden: true,
		filter(event, player) {
			return event.player && (event.player == player || sameGroup(event.player, player)) && event.source && event.source.isIn();
		},
		logTarget(event) {
			return event.source;
		},
		async content(event, trigger, player) {
			const source = trigger.source;
			if (!source.isLinked()) {
				await source.link(true);
			} else {
				await source.damage(1, "thunder");
			}
			if (!player.storage.hengjiang_targets) {
				player.storage.hengjiang_targets = [];
			}
			player.storage.hengjiang_targets.add(source);
			// "当前回合"指伤害发生时正在进行的那个回合，不是臧霸自己的回合，记下来给hengjiang_effect用一个全局触发去匹配。
			if (_status.currentPhase) {
				player.storage.hengjiang_phase = _status.currentPhase;
				player.addSkill("hengjiang_effect");
			}
		},
		ai: {
			maixie_defend: true,
			threaten: 1.2,
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { global: "phaseDiscardEnd" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.player === player.storage.hengjiang_phase;
				},
				onremove(player) {
					delete player.storage.hengjiang_targets;
					delete player.storage.hengjiang_phase;
				},
				async content(event, trigger, player) {
					const targets = (player.storage.hengjiang_targets || []).filter(target => target.isIn());
					for (const target of targets) {
						target.logSkill("hengjiang", player);
						await target.chooseToDiscard(true);
					}
					player.removeSkill("hengjiang_effect");
				},
			},
		},
	},

// ========== yujin 于禁 ==========
	// 节钺：准备阶段，你可以交给不为魏势力的一名角色一张手牌，然后令其执行一次“军令”。若其执行，你摸一张牌；若其不执行，你本回合的摸牌阶段多摸三张牌。 参考gz_jieyue
	jieyue: {
		skillAnimation: true,
		animationColor: "water",
		audio: ["jieyue", 2],
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			return (
				player.countCards("h") > 0 &&
				game.hasPlayer(function (current) {
					return current != player && current.group != "wei";
				})
			);
		},
		preHidden: true,
		async cost(event, _trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt2("jieyue"),
					position: "h",
					filterCard: true,
					filterTarget(card, player, target) {
						return target.group != "wei" && target != player;
					},
					ai1(card, player, target) {
						if (get.attitude(player, target) > 0) {
							return 11 - get.value(card);
						}
						return 7 - get.value(card);
					},
					ai2(target) {
						var att = get.attitude(get.event().player, target);
						if (att < 0) {
							return -att;
						}
						return 1;
					},
				})
				.setHiddenSkill("jieyue")
				.forResult();
		},
		logTarget: "targets",
		async content(event, _trigger, player) {
			const { targets, cards } = event;
			const target = targets[0];

			await player.give(cards, target);

			const junlingResult = await player.chooseJunlingFor(target).forResult();
			const { junling, targets: junlingTargets } = junlingResult;

			const choiceList = [];
			choiceList.push(`执行该军令，然后${get.translation(player)}摸一张牌`);
			choiceList.push(`令${get.translation(player)}摸牌阶段额外摸三张牌`);

			const chooseJunlingResult = await target.chooseJunlingControl(player, junling, junlingTargets).set("prompt", "节钺").set("choiceList", choiceList).set("ai", chooseJunlingCheck).forResult();

			if (chooseJunlingResult.index == 0) {
				await target.carryOutJunling(player, junling, junlingTargets);
				await player.draw();
			} else {
				player.addTempSkill("jieyue_eff");
			}

			return;

			function chooseJunlingCheck() {
				if (get.attitude(target, player) > 0) {
					return get.junlingEffect(player, junling, target, junlingTargets, target) > 1 ? 0 : 1;
				}
				return get.junlingEffect(player, junling, target, junlingTargets, target) >= -1 ? 0 : 1;
			}
		},
		ai: {
			threaten: 2,
		},
		subSkill: {
			eff: {
				trigger: {
					player: "phaseDrawBegin2",
				},
				filter(event, _player) {
					return !event.numFixed;
				},
				charlotte: true,
				silent: true,
				async content(_event, trigger, _player) {
					trigger.num += 3;
				},
				sub: true,
			},
		},
	},

	// 毅重：锁定技，若你的装备区里没有防具牌，每回合第一张黑色【杀】对你无效。 参考yizhong(yijiang)
	yizhong: {
		trigger: { target: "shaBefore" },
		forced: true,
		audio: 2,
		filter(event, player) {
			if (!player.hasEmptySlot(2)) {
				return false;
			}
			if (player.storage.yizhong_used == game.roundNumber + "_" + game.phaseNumber) {
				return false;
			}
			return event.card.name == "sha" && get.color(event.card) == "black";
		},
		async content(event, trigger, player) {
			player.storage.yizhong_used = game.roundNumber + "_" + game.phaseNumber;
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

// ========== niujin 牛金 ==========
	// 挫锐：限定技，出牌阶段，你可以将手牌摸至五张，并重置基本牌的使用次数，然后废除判定区，若已废除则改为对一名其他角色造成1点伤害。 参考cuorui(sp)
	cuorui: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: "epic",
		animationColor: "gray",
		async content(event, trigger, player) {
			player.awakenSkill("cuorui");
			await player.drawTo(5);
			const stat = player.getStat().card;
			for (const name in stat) {
				if (get.type(name) == "basic") {
					stat[name] = 0;
				}
			}
			if (!player.storage.cuorui_nojudge) {
				player.storage.cuorui_nojudge = true;
				player.addSkill("cuorui_nojudge");
				player.popup("废除判定区");
				game.log(player, "废除了判定区");
			} else {
				const result = await player.chooseTarget("挫锐：对一名其他角色造成1点伤害", (card, player, target) => target != player, true).forResult();
				if (result.targets && result.targets.length) {
					await result.targets[0].damage(1);
				}
			}
		},
		subSkill: {
			nojudge: {
				trigger: { player: "phaseJudgeBefore" },
				forced: true,
				audio: "cuorui",
				filter(event, player) {
					return player.storage.cuorui_nojudge && (get.is.single() || player.countCards("j"));
				},
				content() {
					trigger.cancel();
					game.log(player, "跳过了", "#g判定阶段");
				},
			},
		},
		ai: {
			threaten: 1.3,
		},
	},

	// 裂围：锁定技，当你杀死一名角色后，你的限定技视为未发动过。 参考liewei(sp)
	liewei: {
		audio: 2,
		trigger: { source: "dieAfter" },
		forced: true,
		filter(event, player) {
			return player.awakenedSkills.includes("cuorui");
		},
		content(event, trigger, player) {
			player.restoreSkill("cuorui");
		},
	},

// ========== zhangchunhua 张春华 ==========
	// 绝情：锁定技，你即将造成的伤害视为失去体力。 参考jueqing(yijiang)
	jueqing: {
		audio: 2,
		trigger: { source: "damageBefore" },
		forced: true,
		async content(event, trigger, player) {
			trigger.cancel();
			trigger.player.loseHp(trigger.num);
		},
		ai: {
			jueqing: true,
			threaten: 1.2,
		},
	},

	// 伤逝：每名角色的每个阶段限一次，当你的手牌数小于X时，你可以将手牌摸至X张（X为你已损失的体力值）。 参考gz_shangshi
	shangshi: {
		audio: "reshangshi",
		trigger: { global: "phaseAnyEnd" },
		filter(event, player) {
			return player.countCards("h") < player.getDamagedHp();
		},
		preHidden: true,
		frequent: true,
		async content(event, trigger, player) {
			await player.drawTo(player.getDamagedHp());
		},
	},

// ========== wangyi 王异 ==========
	// 贞烈：当你成为其他角色使用【杀】或普通锦囊牌的目标后，你可以令其对你造成一点伤害。若如此做，此牌对你无效，然后你弃置其一张牌。 参考zhenlie(yijiang)
	zhenlie: {
		audio: 2,
		audioname: ["re_wangyi"],
		filter(event, player) {
			return event.player != player && event.card && (event.card.name == "sha" || get.type(event.card) == "trick");
		},
		logTarget: "player",
		check(event, player) {
			if (event.getParent().excluded.includes(player)) {
				return false;
			}
			const baseDamage = event.card.baseDamage ?? get.info(event.card)?.baseDamage ?? 1;
			if (baseDamage <= 1) {
				return false;
			}
			return get.attitude(player, event.player) <= 0;
		},
		trigger: { target: "useCardToTargeted" },
		async content(event, trigger, player) {
			await player.damage(1, player);
			trigger.getParent().excluded.add(player);
			if (trigger.player.countCards("he")) {
				await player.discardPlayerCard({
					target: trigger.player,
					position: "he",
					forced: true,
				});
			}
		},
		ai: {
			filterDamage: true,
			skillTagFilter: (player, tag, arg) => {
				return arg && arg.jiu == true;
			},
		},
	},

	// 秘计：结束阶段，你可以摸X张牌（X为你已损失的体力值），然后可以将至多等量的牌交给其他角色。 参考miji(yijiang)
	miji: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		audioname: ["re_wangyi"],
		trigger: {
			player: "phaseJieshuBegin",
		},
		locked: false,
		filter(event, player) {
			return player.hp < player.maxHp;
		},
		async content(event, trigger, player) {
			const num = Math.min(4, player.getDamagedHp());
			await player.draw(num);
			if (_status.connectMode) {
				game.broadcastAll(() => {
					_status.noclearcountdown = true;
				});
			}

			const check = () => {
				const result = {
					bool: true,
					cards: [],
				};
				const cards = player.getCards("he");
				const targets = game.filterPlayer(current => player !== current);

				for (const card of cards) {
					const val = get.value(card, player);
					let max = val;
					let target = null;
					for (const targetx of targets) {
						const otherVal = get.value(card, targetx);
						if (otherVal > max) {
							max = otherVal;
							target = targetx;
						}
					}
					if (target != null) {
						result.cards.push([card, target, max - val]);
					}
				}
				if (result.cards.length < num) {
					result.bool = false;
				} else if (result.cards.length > num) {
					result.cards
						.sort((a, b) => {
							return b[2] - a[2];
						})
						.slice(0, num);
				}
				return result;
			};

			let given = 0;
			let forced = false;
			const givenMap = new Map();
			const aiCheck = check();
			while (given < num) {
				const result = await player
					.chooseCardTarget({
						filterTarget: lib.filter.notMe,
						filterCard(card) {
							return get.itemtype(card) === "card" && !card.hasGaintag("miji_tag");
						},
						selectCard: [1, num - given],
						prompt: "请选择要分配的卡牌和目标",
						forced,
						ai1(card) {
							const event = get.event();
							if (!event.res.bool || ui.selected.cards.length) {
								return 0;
							}
							for (const arr of event.res.cards) {
								if (arr[0] === card) {
									return arr[2];
								}
							}
							return 0;
						},
						ai2(target) {
							const event = get.event();
							const card = ui.selected.cards[0];
							for (const arr of event.res.cards) {
								if (arr[0] === card) {
									return get.attitude(player, target);
								}
							}
							const val = target.getUseValue(card);
							if (val > 0) {
								return val * get.attitude(player, target) * 2;
							}
							return get.value(card, target) * get.attitude(player, target);
						},
					})
					.set("res", aiCheck)
					.forResult();

				if (!result.bool || !result.cards?.length || !result.targets?.length) {
					break;
				}

				forced = true;
				const cards = result.cards;
				const target = result.targets[0].playerid;
				player.addGaintag(cards, "miji_tag");
				given += cards.length;
				if (!givenMap.has(target)) {
					givenMap.set(target, []);
				}
				givenMap.get(target).addArray(cards);
			}

			if (_status.connectMode) {
				game.broadcastAll(() => {
					delete _status.noclearcountdown;
					game.stopCountChoose();
				});
			}

			if (!givenMap.size) {
				return;
			}

			const map = [];
			const cards = [];
			for (const [name, cardxs] of givenMap) {
				const source = (_status.connectMode ? lib.playerOL : game.playerMap)[name];
				player.line(source, "green");
				if (player !== source && (get.mode() !== "identity" || player.identity !== "nei")) {
					player.addExpose(0.18);
				}
				map.push([source, cardxs]);
				cards.addArray(cardxs);
			}

			const loseAsyncEvent = game.loseAsync({
				gain_list: map,
				player: player,
				cards,
				giver: player,
				animate: "giveAuto",
			});
			loseAsyncEvent.setContent("gaincardMultiple");
			await loseAsyncEvent;
		},
		mod: {
			aiOrder(player, card, num) {
				if (num > 0 && _status.event && _status.event.type === "phase" && get.tag(card, "recover")) {
					if (player.needsToDiscard()) {
						return num / 3;
					}
					return 0;
				}
			},
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

// ========== caochong 曹冲 ==========
	// 稱象：当你受到伤害后，你可以亮出牌堆顶的四张牌，然后获得其中任意张点数之和不大于13的牌。若获得的牌点数之和为13，你复原武将牌。 参考chengxiang(yijiang)
	chengxiang: {
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.num > 0;
		},
		frequent: true,
		async content(event, trigger, player) {
			const num = 4;
			event.showCards ??= [];
			const cards = [];
			event.cards = cards;
			cards.addArray(event.showCards);
			if (num > cards.length) {
				cards.addArray(get.cards(num - cards.length));
			}
			await player.showCards(cards, `${get.translation(player)}发动了〖稱象〗`, true).set("clearArena", false);
			const maxNum = 13;
			const result = await player
				.chooseCardButton(cards, `称象：选择任意张点数之和不大于${maxNum}的牌`, [1, Infinity], true)
				.set("filterButton", function (button) {
					let num = 0;
					for (const selectedButton of ui.selected.buttons) {
						num += get.number(selectedButton.link);
					}
					return num + get.number(button.link) <= _status.event.maxNum;
				})
				.set("maxNum", maxNum)
				.set("ai", function (button) {
					const card = button.link;
					if (get.name(card) === "tao" || get.name(card) === "jiu") {
						return 20 - get.number(card);
					}
					return 13 - get.number(card);
				})
				.forResult();
			game.broadcastAll(ui.clear);
			if (result.links?.length) {
				const { links } = result;
				await player.gain(links, "gain2");
				const sum = links.reduce((s, c) => s + get.number(c), 0);
				if (sum === 13) {
					// "复原武将牌"指的是武将牌叠置(turnOver)状态复原，不是回复体力；
					// 之前误用recoverTo(maxHp)直接回满体力，跟"复原"完全是两回事。
					await player.turnOver(false);
				}
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			threaten: 0.8,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
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

	// 仁心：每轮限一次，当一名其他角色受到致命伤害时，你可以翻面并弃置一张装备牌，然后防止此伤害，本回合内，其防止受到的所有伤害。 参考renxin(yijiang)
	renxin: {
		skillAnimation: true,
		animationColor: "water",
		trigger: { global: "damageBegin4" },
		audio: 2,
		audioname: ["re_caochong"],
		filter(event, player) {
			return event.player != player && event.num >= event.player.hp && player.countCards("he", { type: "equip" }) > 0 && !player.hasSkill("renxin_roundlimit");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt("renxin", trigger.player),
					prompt2: "弃置一张装备牌并将武将牌翻面，防止" + get.translation(trigger.player) + "受到的此伤害，其本回合防止受到的所有伤害",
					filterCard: get.filter({ type: "equip" }),
					position: "he",
					ai(card) {
						const player = get.player();
						if (get.attitude(player, _status.event.getTrigger().player) > 3) {
							return 11 - get.value(card);
						}
						return -1;
					},
				})
				.set("chooseonly", true)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.discard({
				cards: event.cards,
				discarder: player,
			});
			await player.turnOver();
			player.addTempSkill("renxin_roundlimit", "roundStart");
			trigger.cancel();
			trigger.player.addTempSkill("renxin_immune", { player: "phaseAfter" });
		},
		subSkill: {
			roundlimit: { charlotte: true },
			immune: {
				charlotte: true,
				trigger: { global: "damageBegin4" },
				filter(event, player) {
					return event.player === player;
				},
				forced: true,
				popup: false,
				content(event, trigger, player) {
					trigger.cancel();
				},
			},
		},
		ai: {
			expose: 0.5,
		},
	},

// ========== guohuai 郭淮 ==========
	// 精策：回合结束时，若你本回合使用过至少X张牌，你可以选择一项：1.执行一个额外的摸牌阶段；2.执行一个额外的出牌阶段。若你本回合使用过至少X种花色的牌，改为你可以依次执行所有项（X为你的体力值）。 参考jingce(yijiang)
	jingce: {
		audio: 2,
		trigger: { player: "phaseAfter" },
		filter(event, player) {
			return player.countUsed(null, true) >= player.hp;
		},
		async cost(event, trigger, player) {
			const suits = new Set(player.getHistory("useCard").map(evt => get.suit(evt.card)));
			if (suits.size >= player.hp) {
				event.result = { bool: true, control: "all" };
				return;
			}
			const result = await player
				.chooseControl("额外的摸牌阶段", "额外的出牌阶段", "cancel2")
				.set("prompt", get.prompt("jingce"))
				.forResult();
			event.result = { bool: result.control !== "cancel2", control: result.control };
		},
		async content(event, trigger, player) {
			const { control } = event;
			if (control === "all") {
				await player.insertPhase().set("phaseList", ["phaseDraw"]);
				await player.insertPhase().set("phaseList", ["phaseUse"]);
			} else if (control === "额外的摸牌阶段") {
				await player.insertPhase().set("phaseList", ["phaseDraw"]);
			} else if (control === "额外的出牌阶段") {
				await player.insertPhase().set("phaseList", ["phaseUse"]);
			}
		},
		ai: {
			threaten: 1.3,
		},
	},

// ========== manchong 满宠 ==========
	// 峻刑：出牌阶段限一次，你可以弃置任意张手牌并令一名其他角色选择一项：1.弃置与你弃置的牌类别均不同的一张手牌；2.执行一个军令。 参考junxing(yijiang)
	junxing: {
		enable: "phaseUse",
		audio: 2,
		usable: 1,
		filterCard: true,
		selectCard: [1, Infinity],
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		check(card) {
			if (ui.selected.cards.length) {
				return -1;
			}
			if (get.type(card) == "basic") {
				return 8 - get.value(card);
			}
			return 5 - get.value(card);
		},
		filterTarget(card, player, target) {
			return player != target;
		},
		allowChooseAll: true,
		async content(event, trigger, player) {
			const { cards, target } = event;
			const types = new Set(cards.map(card => get.type2(card, player)));
			const result = await target
				.chooseToDiscard({
					filterCard(card) {
						return !_status.event.types.has(get.type2(card));
					},
					ai(card) {
						return 8 - get.value(card);
					},
				})
				.set("types", types)
				.set("dialog", ["弃置一张与" + get.translation(player) + "弃置的牌类别均不同的牌，或执行一个军令", "hidden", cards])
				.forResult();
			if (!result.bool) {
				const { junling, targets } = await player.chooseJunlingFor(player).forResult();
				const { index } = await target.chooseJunlingControl(player, junling, targets).set("prompt", get.prompt("junxing")).forResult();
				if (index == 0) {
					await target.carryOutJunling(player, junling, targets);
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
					return -1 / (target.countCards("h") + 1);
				},
			},
		},
	},

	// 御策：当你受到伤害后，你可以展示一张手牌，令伤害来源选择一项：1.弃置一张与你展示的牌类别不同的手牌；2.令你回复1点体力然后你弃置此牌。 参考yuce(yijiang)
	yuce: {
		audio: 2,
		audioname: ["re_manchong"],
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: get.prompt2(event.skill),
					ai(card) {
						if (get.type(card) == "basic") {
							return 1;
						}
						return Math.abs(get.value(card)) + 1;
					},
				})
				.forResult();
		},
		logTarget: "source",
		async content(event, trigger, player) {
			const [card] = event.cards;
			const source = trigger.source;
			await player.showCards(card, get.translation(player) + "发动了【御策】");
			const type = get.type2(card);
			let result = { bool: false };
			if (source?.isIn()) {
				result = await source
					.chooseToDiscard({
						prompt: "弃置一张与" + get.translation(player) + "展示的牌类别不同的手牌，或令" + get.translation(player) + "回复1点体力",
						filterCard(card) {
							return get.type2(card) != _status.event.type;
						},
						ai(card) {
							if (get.recoverEffect(_status.event.getParent().player, _status.event.player, _status.event.player) < 0) {
								return 7 - get.value(card);
							}
							return 0;
						},
					})
					.set("type", type)
					.forResult();
			}
			if (!result.bool) {
				await player.recover({ source });
				await player.discard(card);
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

// ========== caozhen 曹真 ==========
	// 司敌：当有角色打出【杀】或使用【闪】时，你可以摸一张牌。 参考sidi(yijiang，效果全新设计，仅参考基本结构)
	sidi: {
		audio: 2,
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
		ai: {
			threaten: 0.9,
		},
	},

// ========== hanhaoshihuan 韩浩&史涣 ==========
	// 慎断：当你的牌因弃置而置入弃牌堆时，你可以将其中一张黑色非锦囊牌当无距离限制的【兵粮寸断】使用，然后你可以重复此流程。 参考shenduan(yijiang)
	shenduan: {
		trigger: {
			player: "loseAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			if (event.type != "discard" || event.getlx === false) {
				return;
			}
			var evt = event.getl(player);
			for (var i = 0; i < evt.cards2.length; i++) {
				if (get.color(evt.cards2[i], evt.hs.includes(evt.cards2[i]) ? evt.player : false) == "black" && get.type(evt.cards2[i]) != "trick" && get.position(evt.cards2[i], evt.hs.includes(evt.cards2[i]) ? evt.player : false) == "d") {
					return true;
				}
			}
			return false;
		},
		audio: 2,
		async cost(event, trigger, player) {
			const cards = [];
			const evt = trigger.getl(player);
			for (let i = 0; i < evt.cards2.length; i++) {
				if (get.color(evt.cards2[i], evt.hs.includes(evt.cards2[i]) ? evt.player : false) == "black" && get.type(evt.cards2[i], evt.hs.includes(evt.cards2[i]) ? evt.player : false) != "trick" && get.position(evt.cards2[i]) == "d") {
					cards.push(evt.cards2[i]);
				}
			}
			if (!cards.length) {
				return;
			}
			const result = await player
				.chooseButtonTarget({
					createDialog: [get.prompt2(event.skill), cards],
					filterButton: true,
					filterTarget(_, player, target) {
						const card = ui.selected.buttons[0]?.link;
						return player.canUse({ name: "bingliang" }, target, false);
					},
					ai1(button) {
						return Math.random();
					},
					ai2(target) {
						const player = get.player();
						return get.effect(target, { name: "bingliang" }, player, player);
					},
				})
				.forResult();
			const { bool, links, targets } = result;
			if (bool && links?.length && targets?.length) {
				cards.remove(links[0]);
				event.result = {
					bool: true,
					cost_data: [targets[0], links[0], cards],
				};
			}
		},
		async content(event, trigger, player) {
			let {
				cost_data: [target, card, cards],
			} = event;
			player.line(target);
			await player.useCard({ name: "bingliang" }, target, [card], "shenduan").set("animate", false);
			while (cards?.someInD("d")) {
				const result = await player
					.chooseButtonTarget({
						createDialog: [get.prompt2(event.name), cards],
						filterButton: true,
						filterTarget(_, player, target) {
							const card = ui.selected.buttons[0]?.link;
							return player.canUse({ name: "bingliang" }, target, false);
						},
						ai1(button) {
							return Math.random();
						},
						ai2(target) {
							const player = get.player();
							return get.effect(target, { name: "bingliang" }, player, player);
						},
					})
					.forResult();
				const { bool, links, targets } = result;
				if (bool && links?.length && targets?.length) {
					player.line(targets[0]);
					cards.remove(links[0]);
					await player.useCard({ name: "bingliang" }, targets[0], links, "shenduan").set("animate", false);
				} else {
					break;
				}
				cards = cards.filterInD("d");
			}
		},
		ai: {
			threaten: 1.3,
		},
	},

	// 勇略：其他角色的判定阶段开始时，你可以弃置其判定区里的一张牌，然后你视为对其使用一张【杀】。 参考yonglve(yijiang)
	yonglve: {
		trigger: { global: "phaseJudgeBegin" },
		audio: 2,
		filter(event, player) {
			return event.player != player && event.player.countCards("j") > 0;
		},
		logTarget: "player",
		async cost(event, trigger, player) {
			event.result = await player
				.discardPlayerCard({
					prompt: get.prompt("yonglve", trigger.player),
					target: trigger.player,
					position: "j",
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await trigger.player.discard({
				cards: event.cards,
				discarder: player,
			});
			await player.useCard({
				card: get.autoViewAs({ name: "sha", isCard: true }),
				targets: [trigger.player],
			});
		},
	},

// ========== caorui 曹叡 ==========
	// 恢拓：当你受到伤害后，你可以令一名角色判定，若结果为♥，其回复1点体力，然后此技能本回合失效；否则，其摸等同于伤害值的牌。 参考huituo(yijiang)
	huituo: {
		audio: 2,
		audioname: ["re_caorui"],
		trigger: { player: "damageEnd" },
		direct: true,
		filter(event, player) {
			return !player.hasSkill("huituo_off");
		},
		async content(event, trigger, player) {
			const forced = event.forced === undefined ? false : event.forced;
			const str = `###${forced ? "恢拓：请选择一名角色" : get.prompt("huituo")}###令一名角色判定。若结果为红桃，其回复1点体力；否则，其摸${get.cnNumber(trigger.num)}张牌`;
			let result = await player
				.chooseTarget(str, event.forced)
				.set("ai", function (target) {
					const player = get.player();
					if (get.attitude(player, target) > 0) {
						return get.recoverEffect(target, player, player) + 1;
					}
					return 0;
				})
				.forResult();
			if (result?.bool) {
				player.logSkill(event.name, result.targets);
				const target = result.targets[0];
				event.target = target;
				const judgeResult = await target
					.judge(card => {
						return get.suit(card) == "heart" ? 1 : -1;
					})
					.forResult();
				if (get.suit(judgeResult?.card) == "heart") {
					await target.recover();
					player.addTempSkill("huituo_off", { player: "phaseAfter" });
				} else {
					await target.draw(trigger.num);
				}
			}
		},
		subSkill: {
			off: { charlotte: true },
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			threaten: 0.8,
		},
	},

	// 明鉴：出牌阶段限一次，你可以将所有手牌交给一名其他角色，然后其下回合手牌上限和使用【杀】的次数上限+1；其下回合首次造成伤害后，你可以发动一次X为伤害值的“恢拓”。 参考mingjian(yijiang)
	mingjian: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player != target;
		},
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const { target } = event;
			const cards = player.getCards("h");
			await player.give(cards, target);
			target.addTempSkill("mingjian_buff", { player: "phaseAfter" });
			target.storage.mingjian_buff = (target.storage.mingjian_buff || 0) + 1;
			target.updateMarks("mingjian_buff");
			player.addTempSkill("mingjian_reward", { player: "phaseAfter" });
			player.storage.mingjian_reward = target;
			player.storage.mingjian_reward_used = false;
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
					if (get.attitude(player, target) > 3) {
						return get.threaten(target);
					}
					return 0;
				},
			},
		},
		subSkill: {
			buff: {
				charlotte: true,
				mark: true,
				intro: {
					content: "手牌上限+#，出杀次数+#",
				},
				init(player, skill) {
					if (!player.storage[skill]) {
						player.storage[skill] = 0;
					}
				},
				onremove: true,
				mod: {
					maxHandcard(player, num) {
						return num + player.storage.mingjian_buff;
					},
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.storage.mingjian_buff;
						}
					},
				},
			},
			reward: {
				charlotte: true,
				trigger: { global: "damageEnd" },
				filter(event, player) {
					return event.player === player.storage.mingjian_reward && !player.storage.mingjian_reward_used;
				},
				async cost(event, trigger, player) {
					event.result = await player.chooseBool(get.prompt("mingjian_reward", trigger.player)).forResult();
				},
				async content(event, trigger, player) {
					player.storage.mingjian_reward_used = true;
					const num = trigger.num;
					const result = await player
						.chooseTarget(get.prompt("mingjian_reward"), true)
						.set("ai", function (t) {
							return get.attitude(get.player(), t) > 0 ? get.recoverEffect(t, get.player(), get.player()) + 1 : 0;
						})
						.forResult();
					if (result?.bool) {
						const target2 = result.targets[0];
						const judgeResult = await target2
							.judge(card => {
								return get.suit(card) == "heart" ? 1 : -1;
							})
							.forResult();
						if (get.suit(judgeResult?.card) == "heart") {
							await target2.recover();
						} else {
							await target2.draw(num);
						}
					}
				},
			},
		},
	},

// ========== yangxiu 杨修 ==========
	// 啖酪：当你成为锦囊牌和【杀】的目标后，若你不是此牌的唯一目标，你可以摸一张牌，然后此牌对你无效。 参考danlao(sp)
	danlao: {
		audio: 2,
		filter(event, player) {
			return (event.card.name == "sha" || get.type(event.card) == "trick") && event.targets && event.targets.length > 1;
		},
		check(event, player) {
			return event.getParent().excluded.includes(player) || get.tag(event.card, "multineg") || get.effect(player, event.card, event.player, player) <= 0;
		},
		trigger: { target: "useCardToTargeted" },
		async content(event, trigger, player) {
			trigger.getParent().excluded.add(player);
			await player.draw();
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

	// 鸡肋：当你受到伤害后，你可以声明一种牌的类别，本回合伤害来源不能使用、打出或弃置你声明的此类手牌。 参考jilei(sp)，限制实现参考jilei2(sp)
	jilei: {
		trigger: { player: "damageEnd" },
		audio: 2,
		filter(event) {
			return event.source && event.source.isIn();
		},
		async cost(event, trigger, player) {
			const types = ["basic", "trick", "equip"].map(i => `jilei_${i}`);
			const { bool, links } = await player
				.chooseButton([get.prompt2(event.skill, trigger.source), [types, "vcard"]])
				.set("ai", button => {
					const type = button.link[2].slice(6);
					const { source } = get.event();
					if (source.getStorage("jilei_limit").includes(type)) {
						return 0;
					}
					return ["equip", "trick", "basic"].indexOf(type);
				})
				.set("source", trigger.source)
				.forResult();
			event.result = {
				bool: bool,
				targets: [trigger.source],
				cost_data: links,
			};
		},
		async content(event, trigger, player) {
			const type = event.cost_data[0][2].slice(6);
			player.popup(get.translation(type) + "牌");
			trigger.source.addTempSkill("jilei_limit", { global: "phaseAfter" });
			trigger.source.markAuto("jilei_limit", type);
		},
		ai: {
			maixie_defend: true,
			threaten: 0.7,
		},
		subSkill: {
			limit: {
				charlotte: true,
				intro: {
					content(storage) {
						return "不能使用、打出或弃置" + get.translation(storage) + "牌";
					},
				},
				init(player, skill) {
					if (!player.storage[skill]) {
						player.storage[skill] = [];
					}
				},
				mark: true,
				onremove: true,
				mod: {
					cardDiscardable(card, player) {
						if (player.storage.jilei_limit.includes(get.type(card, "trick"))) {
							var hs = player.getCards("h");
							if (hs.includes(card)) {
								return false;
							}
						}
					},
					cardEnabled(card, player) {
						if (player.storage.jilei_limit.includes(get.type(card, "trick"))) {
							var hs = player.getCards("h"),
								cards = [card];
							if (Array.isArray(card.cards)) {
								cards.addArray(card.cards);
							}
							for (var i of cards) {
								if (hs.includes(i)) {
									return false;
								}
							}
						}
					},
					cardRespondable(card, player) {
						if (player.storage.jilei_limit.includes(get.type(card, "trick"))) {
							var hs = player.getCards("h"),
								cards = [card];
							if (Array.isArray(card.cards)) {
								cards.addArray(card.cards);
							}
							for (var i of cards) {
								if (hs.includes(i)) {
									return false;
								}
							}
						}
					},
				},
			},
		},
	},

// ========== chengyu 程昱 ==========
	// 设伏：出牌阶段结束时，你可以将一张手牌扣置于武将牌上；当一名角色使用牌时，你可以移去你武将牌上的一张同名牌令之无效。 参考shefu(sp)
	shefu: {
		skillAnimation: true,
		animationColor: "water",
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		audio: 2,
		group: ["shefu_nullify"],
		init(player) {
			if (!player.storage.shefu) {
				player.storage.shefu = [];
			}
			if (!player.storage.shefu2) {
				player.storage.shefu2 = [];
			}
		},
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		onremove(player, skill) {
			var cards = player.getExpansions(skill);
			if (cards.length) {
				game.broadcastAll(cards => {
					cards.forEach(card => card.classList.remove("infohidden"));
				}, cards);
				player.loseToDiscardpile(cards);
			}
		},
		intro: {
			content: "cards",
			onunmark(storage, player) {
				player.storage.shefu = [];
				player.storage.shefu2 = [];
			},
			mark(dialog, content, player) {
				if (content && content.length) {
					dialog.addAuto(content);
					if (player.isUnderControl(true)) {
						var str = "";
						for (var i = 0; i < player.storage.shefu2.length; i++) {
							str += get.translation(player.storage.shefu2[i]);
							if (i < player.storage.shefu2.length - 1) {
								str += "、";
							}
						}
						dialog.add('<div class="text center">' + str + "</div>");
					}
				}
			},
		},
		async content(event, trigger, player) {
			const list1 = [],
				list2 = [],
				list3 = [];
			for (let i = 0; i < lib.inpile.length; i++) {
				const type = get.type(lib.inpile[i]);
				if (type == "basic") {
					list1.push(["基本", "", lib.inpile[i]]);
				} else if (type == "trick") {
					list2.push(["锦囊", "", lib.inpile[i]]);
				} else if (type == "delay") {
					list3.push(["锦囊", "", lib.inpile[i]]);
				}
			}
			const result = await player
				.chooseButton([get.prompt("shefu"), [list1.concat(list2).concat(list3), "vcard"]])
				.set("filterButton", function (button) {
					var player = _status.event.player;
					if (player.storage.shefu2 && player.storage.shefu2.includes(button.link[2])) {
						return false;
					}
					return true;
				})
				.set("ai", function (button) {
					var rand = _status.event.rand;
					switch (button.link[2]) {
						case "sha":
							return 5 + rand[1];
						case "tao":
							return 4 + rand[2];
						case "lebu":
							return 3 + rand[3];
						case "shan":
							return 4.5 + rand[4];
						case "wuzhong":
							return 4 + rand[5];
						case "shunshou":
							return 3 + rand[6];
						case "nanman":
							return 2 + rand[7];
						case "wanjian":
							return 2 + rand[8];
						default:
							return rand[0];
					}
				})
				.set("rand", [Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random()])
				.forResult();
			if (result.bool) {
				event.cardname = result.links[0][2];
				player.logSkill("shefu");
				const result2 = await player.chooseCard("he", "选择一张牌作为“伏兵”", true).forResult();
				if (result2.bool) {
					const card = result2.cards[0];
					event.card = card;
					const next = player.addToExpansion(card, player, "give");
					next.gaintag.add("shefu");
					await next;
					// "扣置"：除程昱自己外，其他所有客户端都把这张牌的牌面盖住，只显示牌背。
					game.broadcastAll(
						(card, owner) => {
							if (game.me !== owner) {
								card.classList.add("infohidden");
							}
						},
						card,
						player
					);
				}
				if (player.getExpansions("shefu").includes(event.card)) {
					player.storage.shefu.push(event.card);
					player.storage.shefu2.push(event.cardname);
					if (player.isOnline2()) {
						player.send(function (storage) {
							game.me.storage.shefu2 = storage;
						}, player.storage.shefu2);
					}
					player.syncStorage("shefu");
					player.markSkill("shefu");
				}
			} else {
				event.finish();
			}
		},
		ai: {
			threaten: 0.9,
		},
	},
	shefu_nullify: {
		charlotte: true,
		sourceSkill: "shefu",
		trigger: { global: "useCard" },
		filter(event, player) {
			return (player.storage.shefu2 || []).includes(get.name(event.card, event.player));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(`设伏：是否移去一张同名的“伏兵”，令${get.translation(trigger.card)}无效？`)
				.set("ai", () => get.attitude(player, trigger.player) <= 0)
				.forResult();
		},
		async content(event, trigger, player) {
			const name = get.name(trigger.card, trigger.player);
			const index = player.storage.shefu2.indexOf(name);
			if (index === -1) {
				return;
			}
			const card = player.storage.shefu[index];
			player.storage.shefu.splice(index, 1);
			player.storage.shefu2.splice(index, 1);
			if (player.isOnline2()) {
				player.send(function (storage) {
					game.me.storage.shefu2 = storage;
				}, player.storage.shefu2);
			}
			game.broadcastAll(card => {
				card.classList.remove("infohidden");
			}, card);
			await player.loseToDiscardpile([card]);
			player.syncStorage("shefu");
			player.markSkill("shefu");
			trigger.untrigger();
		},
		ai: {
			skillTagFilter(player, tag, target) {
				return get.attitude(player, target) <= 0;
			},
		},
	},

	// 益兵：当一名其他角色进入濒死状态时，你可以获得其一张手牌。当一名其他角色死亡时，你可以回复1点体力。 参考stdyibing
	yibing: {
		audio: "benyu",
		trigger: { global: ["dying", "dieAfter"] },
		filter(event, player) {
			if (event.player == player) {
				return false;
			}
			if (event.name == "dying") {
				return event.player.countCards("eh") > 0;
			}
			return true;
		},
		logTarget: "player",
		check(event, player) {
			return get.effect(event.player, { name: "shunshou_copy2" }, player, player) > 0;
		},
		async content(event, trigger, player) {
			if (trigger.name == "dying") {
				await player.gainPlayerCard(trigger.player, "he", `获得${get.translation(trigger.player)}一张牌`, true);
			} else {
				await player.recover();
			}
		},
	},

// ========== caoang 曹昂 ==========
	// 慷愾：当一名同势力角色成为【杀】的目标后，你可以摸一张牌，然后交给其一张牌并展示之。若此牌为装备牌，该角色可以使用此牌。 参考kaikang(sp)
	kaikang: {
		audio: 2,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			return event.card.name == "sha" && event.target.isIn() && sameGroup(event.target, player);
		},
		check(event, player) {
			return get.attitude(player, event.target) >= 0;
		},
		preHidden: true,
		logTarget: "target",
		async content(event, trigger, player) {
			const drawNext = player.draw();
			if (trigger.target != player) {
				const result = await player
					.chooseCard(true, "he", "交给" + get.translation(trigger.target) + "一张牌")
					.set("ai", function (card) {
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
				const giveNext = player.give(result.cards, trigger.target, "give");
				const delayNext = game.delay();
				event.card = result.cards[0];
				await giveNext;
				await delayNext;
				await trigger.target.showCards(event.card);
				if (trigger.target.getCards("h").includes(event.card) && get.type(event.card) == "equip") {
					await trigger.target.chooseUseTarget(event.card);
				}
			} else {
				event.finish();
				await drawNext;
			}
		},
		ai: {
			threaten: 1.1,
		},
	},

// ========== zhugedan 诸葛诞 ==========
	// 功獒：锁定技，一名其他角色首次进入濒死状态时，你增加1点体力上限或回复1点体力。 参考gz_gongao
	gongao: {
		audio: "gongao",
		trigger: { global: "dying" },
		forced: true,
		init(player) {
			if (!player.storage.gongao) {
				player.storage.gongao = [];
			}
		},
		filter(event, player) {
			return event.player != player && !player.storage.gongao.includes(event.player);
		},
		async content(event, trigger, player) {
			player.storage.gongao.push(trigger.player);
			player.markSkill("gongao");
			if (player.maxHp > player.hp) {
				await player.recover();
			} else {
				await player.gainMaxHp();
			}
		},
		intro: { content: "已记录：#" },
		ai: {
			threaten: 1.5,
		},
	},

	// 威重：锁定技，你的体力上限或体力变化时，你摸一张牌。 参考weizhong(sp)
	weizhong: {
		audio: 1,
		trigger: { player: ["gainMaxHpEnd", "loseMaxHpEnd", "recoverEnd", "damageEnd"] },
		forced: true,
		content() {
			player.draw();
		},
	},

	// 举义：限定技，准备阶段，你可以将手牌摸至体力上限，若以此法摸牌数大于5，你获得“崩坏”。 参考juyi(sp)
	juyi: {
		skillAnimation: true,
		animationColor: "thunder",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("h") < player.maxHp;
		},
		limited: true,
		juexingji: true,
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt(event.name)).forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const num = player.maxHp - player.countCards("h");
			await player.draw(num);
			if (num > 5) {
				player.addSkills("benghuai");
			}
		},
	},

// ========== xizhicai 戏志才 ==========
	// 天妒：当你的判定牌生效后，你可以获得此牌。 参考tiandu(standard)
	tiandu: {
		audio: 2,
		audioname: ["re_guojia", "xizhicai", "gz_nagisa"],
		trigger: { player: "judgeEnd" },
		preHidden: true,
		frequent(event) {
			return event.result.card?.name !== "du";
		},
		check(event) {
			return event.result.card?.name !== "du";
		},
		filter(event, player) {
			return get.position(event.result.card, true) === "o";
		},
		async content(event, trigger, player) {
			player.gain({
				cards: [trigger.result.card],
				animate: "gain2",
			});
		},
	},

	// 先辅：锁定技，当你首次明置此武将牌时，你获得1枚"先驱"标记。一名与你势力相同的角色的准备阶段，你可以移去1枚"先驱"标记并选择该角色，当其受到伤害后，你受到等量的无来源伤害；当其回复体力后，你回复等量体力。
	// 之前的实现完全照抄了sp包非国战版xianfu(游戏开始时选一名角色结成"双生"羁绊)，和这条国战redesign的翻译文本完全对不上——触发时机错误(开局而非明置武将牌)，"先驱"标记从未真正生成过，addSkill("xianfu2")/markSkill("xianfu_mark")指向的技能压根没定义过，伤害/回复共享效果实际上从未生效。
	// 改为用guozhan模式引擎自带的通用"先驱"标记(xianqu_mark，见apps/core/mode/guozhan/src/patch/player.js里"全场第一个明置武将的角色获得先驱标记"的规则、rest.js里_guozhan_marks的通用弃置先驱标记效果)：明置本武将牌时获得1枚，与全场"先驱"共用同一个计数器，若戏志才本人恰好是全场第一个明置武将的角色，会按国战规则额外再计入1枚，两者自然叠加。有几枚先驱标记，先辅2就能对几名角色分别发动(每次消耗1枚)。
	xianfu: {
		skillAnimation: true,
		animationColor: "water",
		audio: 6,
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			return event.toShow?.some(name => get.character(name, 3).includes("xianfu"));
		},
		forced: true,
		popup: false,
		// expandSkills只展开一层group，xianfu_effect自己的group(xianfu_damage/xianfu_recover)不会被
		// 二次展开，之前嵌套写法导致伤害/回复共享效果实际上从未真正挂到玩家身上，改成在这里一次性列全。
		group: ["xianfu2", "xianfu_effect", "xianfu_damage", "xianfu_recover"],
		// 若戏志才是作为第三个武将(3将模式)获得的，一开始就是明置状态，没有showCharacterAfter这个环节，
		// 加skill时(player.addSkill)直接判定：此时若玩家已经没有任何武将牌处于暗置状态，视为"已明置"，直接给1枚先驱标记。
		init(player, skill) {
			if (!player.storage.xianfu_init && isCharacterShown(player, skill)) {
				player.storage.xianfu_init = true;
				player.addMark("xianqu_mark", 1);
			}
		},
		async content(event, trigger, player) {
			player.addMark("xianqu_mark", 1);
		},
	},
	xianfu2: {
		audio: 6,
		sourceSkill: "xianfu",
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return (
				event.player !== player &&
				event.player.isFriendOf(player) &&
				player.countMark("xianqu_mark") > 0 &&
				!(player.storage.xianfu_targets || []).includes(event.player)
			);
		},
		// 只要还有活着的友方廖化(zhengxian)，自己的"先驱"标记留着就能在自己回合开始时白嫖一个
		// 额外出牌阶段，价值比先辅这个绑定效果更高，AI不应该主动消耗掉；廖化死了之后再正常使用
		check(event, player) {
			return !game.hasPlayer(current => current.isIn() && current.hasSkill("zhengxian") && current.isFriendOf(player));
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("xianfu", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			player.removeMark("xianqu_mark", 1);
			player.storage.xianfu_targets ??= [];
			player.storage.xianfu_targets.push(target);
			player.markSkill("xianfu_effect");
			player.line(target, "green");
		},
		ai: {
			skillTagFilter(player, tag, target) {
				return get.attitude(player, target) > 0;
			},
		},
	},
	xianfu_effect: {
		charlotte: true,
		sourceSkill: "xianfu",
		intro: {
			content(storage, player) {
				const targets = player.storage.xianfu_targets || [];
				return targets.length ? `${get.translation(targets)}受到伤害后你受到等量无来源伤害；其回复体力后你回复等量体力` : "";
			},
		},
	},
	xianfu_damage: {
		charlotte: true,
		sourceSkill: "xianfu",
		trigger: { global: "damageEnd" },
		forced: true,
		popup: false,
		filter(event, player) {
			return (player.storage.xianfu_targets || []).includes(event.player) && event.num > 0 && event.player.isIn();
		},
		async content(event, trigger, player) {
			await player.damage(trigger.num, "nocard");
		},
	},
	xianfu_recover: {
		charlotte: true,
		sourceSkill: "xianfu",
		trigger: { global: "recoverEnd" },
		forced: true,
		popup: false,
		filter(event, player) {
			return (player.storage.xianfu_targets || []).includes(event.player) && event.num > 0;
		},
		async content(event, trigger, player) {
			await player.recover(trigger.num);
		},
	},

	// 筹策：当你受到伤害后，你可以判定，若结果为：黑色，你弃置一名角色区域里的一张牌；红色，你令一名角色摸一张牌。 参考chouce(sp)
	chouce: {
		audio: 2,
		audioname2: { sxrm_caocao: "chouce_sxrm_caocao", tw_sxrm_caocao: "chouce_sxrm_caocao" },
		trigger: { player: "damageEnd" },
		getIndex: event => event.num,
		filter(event) {
			return event.num > 0;
		},
		async content(event, trigger, player) {
			const result = await player.judge().forResult();
			const color = result?.color;
			let result2;
			switch (color) {
				case "black":
					if (game.hasPlayer(current => current.countDiscardableCards(player, "hej"))) {
						result2 = await player
							.chooseTarget(
								"弃置一名角色区域内的一张牌",
								(card, player, target) => {
									return target.countDiscardableCards(player, "hej");
								},
								true
							)
							.set("ai", target => {
								const player = get.player();
								let att = get.attitude(player, target);
								if (att < 0) {
									att = -Math.sqrt(-att);
								} else {
									att = Math.sqrt(att);
								}
								return att * lib.card.guohe.ai.result.target(player, target);
							})
							.forResult();
					}
					break;

				case "red": {
					const next = player.chooseTarget("令一名角色摸一张牌");
					next.set("ai", target => {
						const player = get.player();
						let att = get.attitude(player, target) / Math.sqrt(1 + target.countCards("h"));
						if (target.hasSkillTag("nogain")) {
							att /= 10;
						}
						return att;
					});
					result2 = await next.forResult();
					break;
				}

				default:
					break;
			}
			if (result2?.bool && result2?.targets?.length) {
				const target = result2.targets[0];
				player.line(target, "green");
				if (color == "black") {
					if (target.countDiscardableCards(player, "hej")) {
						await player.discardPlayerCard(target, "hej", true);
					}
				} else {
					await target.draw();
				}
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			threaten: 1.1,
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

// ========== wanglang 王朗 ==========
	// 鼓舌：出牌阶段限一次，你可以用一张手牌与至多三名角色同时拼点，然后依次结算拼点结果，没赢的角色选择一项：1.弃置一张牌；2.令你摸一张牌。若你没赢，本回合不能对其他角色使用牌。 参考wangchao(wei)
	gushe: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		selectTarget: [1, 3],
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			const { targets } = event;
			player.storage.gushe_allWin = true;
			const next = player.chooseToCompare(targets);
			next.callback = lib.skill.gushe.callback;
			await next;
			if (!player.storage.gushe_allWin) {
				player.addTempSkill("gushe_limit", "phaseAfter");
			}
			delete player.storage.gushe_allWin;
		},
		async callback(event, trigger, player) {
			const { target, winner } = event;
			if (winner !== player) {
				player.storage.gushe_allWin = false;
				const result = await player
					.chooseToDiscard("he", "弃置一张牌，或摸一张牌")
					.set("ai", function () {
						return -1;
					})
					.forResult();
				if (!result.bool) {
					await player.draw();
				}
			}
			if (winner !== target) {
				const result2 = await target
					.chooseToDiscard("he", "弃置一张牌，或令" + get.translation(player) + "摸一张牌")
					.set("ai", function (card) {
						if (_status.event.goon) {
							return 6 - get.value(card);
						}
						return 0;
					})
					.set("goon", get.attitude(target, player) < 0)
					.forResult();
				if (!result2.bool) {
					await player.draw();
				}
			}
		},
		subSkill: {
			limit: {
				charlotte: true,
				intro: { content: "本回合不能对其他角色使用牌" },
				mod: {
					playerEnabled(card, player, target) {
						if (player !== target) {
							return false;
						}
					},
				},
			},
		},
		ai: {
			order: 7,
			threaten: 0.9,
		},
	},

	// 激词：当你亮出拼点牌时，你可以失去1点体力，令你的拼点牌的点数视为K。 参考jici(sp)
	jici: {
		audio: 2,
		trigger: { player: "compare" },
		filter(event, player) {
			return event.getParent().name == "gushe" && !event.iwhile && event.num1 <= player.countMark("gushe");
		},
		content() {
			if (trigger.num1 < player.countMark("gushe")) {
				trigger.num1 += player.countMark("gushe");
			} else {
				player.getStat().skill.gushe--;
			}
		},
		ai: {
			combo: "gushe",
		},
	},

	// 孝廉：当你首次明置此武将时，你可以移动场上的一张装备牌。 参考skill_old.js
	xiaolian: {
		skillAnimation: true,
		animationColor: "water",
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			return !!(event.toShow && event.toShow.includes("caoang")) && game.hasPlayer(current => current.countCards("e") > 0);
		},
		// 若曹昂是作为第三个武将(3将模式)获得的，一开始就是明置状态，没有showCharacterAfter这个环节，
		// 只能在addSkill时另起一个异步流程，重跑一遍同样的"是否发动"询问+结算。
		init(player, skill) {
			if (!player.storage.xiaolian_init && isCharacterShown(player, skill) && game.hasPlayer(current => current.countCards("e") > 0)) {
				player.storage.xiaolian_init = true;
				(async () => {
					const result = await player.chooseBool(get.prompt2("xiaolian")).forResult();
					if (result.bool) {
						await lib.skill.xiaolian.grant(player);
					}
				})();
			}
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("xiaolian")).forResult();
		},
		async content(event, trigger, player) {
			await lib.skill.xiaolian.grant(player);
		},
		async grant(player) {
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

// ========== xinxianying 辛宪英 ==========
	// 忠鉴：当你成为一张牌的目标后，你可以视为对使用者使用一张【知己知彼】；然后你可以明置你以此法观看的武将牌或手牌。 参考skill_old.js
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
		ai: {
			threaten: 0.7,
		},
	},

	// 才识：你可以变更此武将牌，视为使用一张【无懈可击】。 参考skill_old.js
	caishi: {
		aiShowTag: "support",
		audio: 2,
		skillAnimation: true,
		animationColor: "water",
		limited: true,
		enable: "chooseToUse",
		filter(event, player) {
			return event.type === "wuxie";
		},
		filterCard() {
			return false;
		},
		selectCard: -1,
		viewAsFilter(player) {
			return !player.storage.caishi_used;
		},
		viewAs: { name: "wuxie" },
		// 效果顺序是"先变将，然后打出这张无懈可击"，不是"打出无懈可击之后再变将"，
		// 所以变将放进precontent——它在这张viewAs牌真正的无懈可击效果resolve之前执行，
		// 而不是等onuse(卡牌使用完毕后)才做。之前onuse方案的时序是反的。
		async precontent(event, trigger, player) {
			event.result.skill = "caishi";
			player.storage.caishi_used = true;
			player.awakenSkill?.("caishi");
			// 才识可能挂在主将、副将，也可能挂在第三将(3将/sanjiang模式)，提示语不能写死"主将"
			const change = await player.chooseBool(get.prompt("caishi"), "是否变更此武将牌？").forResult();
			if (!change.bool) {
				return;
			}
			// pickAndChangeCharacter会自己判断才识具体挂在哪个槽位（含第三将），
			// 并且是亮出2个候选让玩家选，而不是直接随机抽1个焗给玩家
			await pickAndChangeCharacter(player, "caishi", "才识：请选择要变更为的武将");
		},
	},

// ========== guanqiujian 毌丘俭 ==========
	// 征荣：锁定技，当你造成伤害时，若你或受伤角色为孤军，此伤害+1。你发起“军令”时改为由你选择一张。 参考gzzhengrong
	zhengrong: {
		audio: "drlt_zhenrong",
		trigger: {
			source: "damageBegin3",
			player: "chooseJunlingForBegin",
		},
		forced: true,
		preHidden: true,
		filter(event, player) {
			if (event.name != "damage") {
				return true;
			}
			return !game.hasPlayer(function (current) {
				return current != player && current.isFriendOf(player);
			});
		},
		check(event, player) {
			return (
				!event.player.hasSkillTag("filterDamage", null, {
					player: event.source,
					card: event.card,
				}) && get.damageEffect(event.player, event.source, player, _status.event.player) > 0
			);
		},
		content() {
			trigger.num++;
		},
		mod: {
			globalFrom(player, target, num) {
				if (target.isMajor()) {
					return num - 1;
				}
			},
		},
		ai: { halfneg: true },
	},

	// 鸿举：限定技，出牌阶段，你可以选择一名其他角色，然后令其以外的角色依次执行一次“军令”（你必须执行），不执行的角色本回合移出游戏。 参考gzhongju
	hongju: {
		audio: "drlt_hongju",
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		filterTarget: lib.filter.notMe,
		content() {
			"step 0";
			player.awakenSkill("hongju");
			event.players = game
				.filterPlayer(function (current) {
					return current != player && current != target;
				})
				.sortBySeat();
			game.delayx();
			player.chooseJunlingFor(event.players[0]).set("prompt", "请选择一项“军令”");
			"step 1";
			event.junling = result.junling;
			event.targets = result.targets;
			event.num = 0;
			player.carryOutJunling(player, event.junling, event.targets);
			"step 2";
			if (num < event.players.length) {
				event.current = event.players[num];
			}
			if (event.current && event.current.isAlive()) {
				player.line(event.current);
				event.current
					.chooseJunlingControl(player, event.junling, targets)
					.set("prompt", "鸿举")
					.set("choiceList", ["执行该军令", "不执行该军令，且本回合移出游戏"])
					.set("ai", function () {
						var evt = _status.event.getParent(2);
						return get.junlingEffect(evt.player, evt.junling, evt.current, evt.targets, evt.current) > 0 ? 0 : 1;
					});
			} else {
				event.goto(4);
			}
			"step 3";
			if (result.index == 0) {
				event.current.carryOutJunling(player, event.junling, event.targets);
			} else {
				event.current.out();
			}
			"step 4";
			game.delayx();
			event.num++;
			if (event.num < event.players.length) {
				event.goto(2);
			}
		},
		ai: {
			threaten: 1.6,
		},
	},

// ========== luzhi 鲁芝 ==========
	// 清忠：出牌阶段开始时，你可以摸两张牌，然后本阶段结束时，若你手牌不为场上唯一最少，你与一名手牌数最少的角色交换手牌。 参考qingzhong(sp)
	qingzhong: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
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
			return false;
		},
		content() {
			player.draw(2);
			player.addTempSkill("qingzhong_give");
		},
		subSkill: {
			give: {
				audio: "qingzhong",
				trigger: { player: "phaseUseEnd" },
				filter(event, player) {
					return !player.isMinHandcard(true);
				},
				forced: true,
				async content(event, trigger, player) {
					const list = game.filterPlayer(function (current) {
						return current.isMinHandcard();
					});
					if (list.length == 1) {
						if (list[0] != player) {
							player.line(list[0], "green");
							await player.swapHandcards(list[0]);
						}
						event.finish();
						return;
					} else {
						const result = await player
							.chooseTarget(true, "清忠：选择一名手牌最少的角色与其交换手牌", function (card, player, target) {
								return target.isMinHandcard();
							})
							.set("ai", function (target) {
								return get.attitude(_status.event.player, target);
							})
							.forResult();
						if (result.bool) {
							const target = result.targets[0];
							if (target != player) {
								player.line(target, "green");
								await player.swapHandcards(target);
							}
						}
					}
				},
			},
		},
		ai: {
			threaten: 0.8,
		},
	},

	// 卫境：每轮限一次，当你需要使用一张基本牌时，你可以视为使用之。 参考weijing(sp)
	weijing: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		enable: "chooseToUse",
		filter(event, player) {
			if (event.type == "wuxie" || player.hasSkill("weijing_used")) {
				return false;
			}
			for (var name of ["sha", "shan", "tao", "jiu"]) {
				if (event.filterCard({ name: name, isCard: true }, player, event)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				var vcards = [];
				for (var name of ["sha", "shan", "tao", "jiu"]) {
					var card = { name: name, isCard: true };
					if (event.filterCard(card, player, event)) {
						vcards.push(["基本", "", name]);
					}
				}
				var dialog = ui.create.dialog("卫境", [vcards, "vcard"], "hidden");
				dialog.direct = true;
				return dialog;
			},
			backup(links, player) {
				return {
					filterCard: () => false,
					selectCard: -1,
					viewAs: {
						name: links[0][2],
						isCard: true,
					},
					popname: true,
					async precontent(event, trigger, player) {
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
					if (player.hasSkill("qingzhong_give")) {
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
		subSkill: {
			used: {
				mark: true,
				intro: {
					content: "本轮已发动",
				},
			},
		},
	},

// ========== wenyang 文鸯 ==========
	// 覆阵：准备阶段，你可以视为对一个确定势力的所有其他角色使用一张【决斗】，结算后所有角色本回合只能再使用共计X张手牌（X为结算流程中共计打出【杀】的数量）。 参考gz_duanqiu(guozhan，同角色技能"断虬"，audio字段本身指向jsrgfuzhen，确认为同一设计)
	fuzhen: {
		skillAnimation: true,
		animationColor: "water",
		audio: "jsrgfuzhen",
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		preHidden: true,
		filter(event, player) {
			const card = new lib.element.VCard({ name: "juedou", isCard: true });
			return game.hasPlayer(current => {
				if (current.isUnseen()) {
					return false;
				}
				return player.isEnemyOf(current) && player.canUse(card, current) && player != current;
			});
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2(event.skill), (cardx, player, target) => {
					if (target.isUnseen()) {
						return false;
					}
					const card = new lib.element.VCard({ name: "juedou", isCard: true });
					return player.isEnemyOf(target) && player.canUse(card, target) && target != player;
				})
				.set("ai", target => {
					const card = new lib.element.VCard({ name: "juedou", isCard: true });
					let eff = 0,
						limit = player.getHandcardLimit();
					for (let current of game.filterPlayer(i => target.isFriendOf(i))) {
						if (player.canUse(card, current)) {
							limit++;
							eff += get.effect(current, card, player, player);
						}
					}
					if (player.countCards("h") > limit) {
						eff -= 2 * (player.countCards("h") - limit);
					}
					return eff;
				})
				.setHiddenSkill(event.skill)
				.forResult();
			if (result.bool) {
				event.result = {
					bool: true,
					targets: game.filterPlayer(i => result.targets[0].isFriendOf(i) && i != player),
				};
			}
		},
		async content(event, trigger, player) {
			const card = new lib.element.VCard({ name: "juedou", isCard: true }),
				targets = event.targets.filter(target => player.canUse(card, target));
			await player.useCard(card, targets);
			if (!player.isIn()) {
				return;
			}
			let num = 0;
			game.filterPlayer(current => {
				current.checkHistory("respond", evt => {
					if (evt.getParent(4) == event) {
						num++;
					}
				});
			});
			player.addTempSkill("fuzhen_count");
			if (num > 0) {
				player.addMark("fuzhen_count", num, 0);
			}
		},
		global: "fuzhen_zhixi",
		ai: {
			threaten: 1.8,
		},
		subSkill: {
			count: {
				charlotte: true,
				init(player, skill) {
					player.storage[skill] = 0;
				},
				onremove: true,
				mark: true,
				intro: {
					content: "本回合所有角色合计还可使用#张手牌",
				},
				trigger: {
					global: "useCard",
				},
				firstDo: true,
				filter(event, player) {
					return event.player.hasHistory("lose", evt => {
						return evt.hs.length > 0 && (evt.relatedEvent || evt.getParent()) == event;
					});
				},
				direct: true,
				async content(event, trigger, player) {
					player.removeMark(event.name, 1, false);
				},
				ai: {
					presha: true,
					pretao: true,
				},
			},
			zhixi: {
				mod: {
					cardEnabled(card) {
						if (get.position(card) != "h" || !_status.currentPhase) {
							return;
						}
						const target = _status.currentPhase;
						if (target.hasSkill("fuzhen_count") && !target.hasMark("fuzhen_count")) {
							return false;
						}
					},
					cardSavable(card) {
						if (get.position(card) != "h" || !_status.currentPhase) {
							return;
						}
						const target = _status.currentPhase;
						if (target.hasSkill("fuzhen_count") && !target.hasMark("fuzhen_count")) {
							return false;
						}
					},
				},
			},
		},
	},

// ========== jianggan 蒋干 ==========
	// 伪诚：当你交给其他角色手牌，或你的手牌被其他角色获得后，若你的手牌数小于体力上限，你可以摸一张牌。 参考weicheng(sp)
	weicheng: {
		audio: 2,
		trigger: {
			global: "gainAfter",
			player: "loseAsyncAfter",
		},
		frequent: true,
		filter(event, player) {
			if (player.getHp() <= player.countCards("h")) {
				return false;
			}
			if (event.name == "loseAsync") {
				if (event.type != "gain") {
					return false;
				}
				var cards = event.getl(player).hs;
				return game.hasPlayer(function (current) {
					if (current == player) {
						return false;
					}
					var cardsx = event.getg(current);
					for (var i of cardsx) {
						if (cards.includes(i)) {
							return true;
						}
					}
					return false;
				});
			}
			if (event.player == player) {
				return false;
			}
			var evt = event.getl(player);
			return evt && evt.hs && evt.hs.length > 0;
		},
		preHidden: true,
		content() {
			player.draw();
		},
	},

	// 盗书：出牌阶段限一次，你可以选择一名其他角色并选择一种花色，然后获得其一张手牌。若此牌与你选择的花色：相同，你对其造成1点伤害且此技能视为未发动过；不同，你交给其一张其他花色的手牌（若没有须展示所有手牌）。 参考daoshu(sp)
	daoshu: {
		audio: 2,
		enable: "phaseUse",
		filterTarget(c, p, t) {
			return t != p && t.countGainableCards(p, "h") > 0;
		},
		filter(e, p) {
			return !p.hasSkill("daoshu_used");
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await player
				.chooseControl(lib.suit)
				.set("prompt", "请选择一个花色")
				.set("ai", () => get.event().chosen)
				.set(
					"chosen",
					(function () {
						let suits = {},
							msuit,
							mcount = 0;
						target.getKnownCards(player).forEach(i => {
							let suit = get.suit(i);
							if (suits[suit]) {
								suits[suit]++;
							} else {
								suits[suit] = 1;
							}
						});
						for (let i in suits) {
							if (suits[i] > mcount && lib.suit.includes(i)) {
								msuit = i;
								mcount = suits[i];
							}
						}
						if (msuit) {
							return msuit;
						}
						return lib.suit.randomGet();
					})()
				)
				.forResult();
			event.suit = result.control;
			player.popup(event.suit + 2);
			game.log(player, "选择了", event.suit + 2);
			const result2 = await player.gainPlayerCard(target, true, "h", "visibleMove").forResult();
			if (result2.bool) {
				const suit2 = get.suit(result2.cards[0]);
				if (suit2 == event.suit) {
					await target.damage();
					player.getStat().skill.daoshu--;
					event.finish();
					return;
				} else {
					player.addTempSkill("daoshu_used", "phaseUseEnd");
					if (
						player.countCards("h", function (card) {
							return get.suit(card) != suit2;
						}) == 0
					) {
						await player.showHandcards();
						event.finish();
						return;
					} else {
						const result3 = await player
							.chooseCard(
								"h",
								true,
								function (card) {
									return get.suit(card) != _status.event.suit2;
								},
								"交给" + get.translation(target) + "一张不为" + get.translation(suit2) + "花色的牌"
							)
							.set("suit2", suit2)
							.forResult();
						await player.give(result3.cards, target, true);
					}
				}
			} else {
				event.finish();
				return;
			}
		},
		ai: {
			order: 1,
			threaten: 1.0,
			result: {
				target: -1,
			},
		},
		subSkill: {
			used: { charlotte: true },
		},
	},

// ========== caoshuang 曹爽 ==========
	// 擅专：每名角色的回合限一次，当你满足场上一名明置角色武将牌上的一个无标签技能的发动条件时，你可以视为发动该技能。 参考shanzhuan(sp)
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
			return game.hasPlayer(current => current != player && !current.isUnseen() && current.getSkills(null, false).some(isCandidate));
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
			const owners = game.filterPlayer(current => current != player && !current.isUnseen() && current.getSkills(null, false).some(isCandidate));
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

	// 托孤：一名角色死亡时，你可以令其选择其武将牌上的一个无标签技能，你失去上一次以此法获得的技能，获得此技能。 参考tuogu(sp)
	tuogu: {
		audio: 2,
		trigger: { global: "die" },
		filter(event, player) {
			return (
				event.player.getStockSkills("仲村由理", "天下第一").filter(function (skill) {
					var info = get.info(skill);
					return info && !info.juexingji && !info.hiddenSkill && !info.zhuSkill && !info.charlotte && !info.limited && !info.dutySkill;
				}).length > 0
			);
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const list = trigger.player.getStockSkills("仲村由理", "天下第一").filter(function (skill) {
				var info = get.info(skill);
				return info && !info.juexingji && !info.hiddenSkill && !info.zhuSkill && !info.charlotte && !info.limited && !info.dutySkill;
			});
			if (list.length == 1) {
				event._result = { control: list[0] };
			} else {
				event._result = await trigger.player
					.chooseControl(list)
					.set("prompt", "选择令" + get.translation(player) + "获得一个技能")
					.set("forceDie", true)
					.set("ai", function () {
						return list.randomGet();
					})
					.forResult();
			}
			if (player.storage.tuogu_last) {
				player.removeSkills(player.storage.tuogu_last);
			}
			player.storage.tuogu_last = event._result.control;
			player.addSkills(event._result.control);
		},
		ai: {
			threaten: 1.3,
		},
	},

// ========== huaxin 华歆 ==========
	// 望归：每回合限一次，当你造成伤害后，你可以对一名与你势力不同的其他角色造成1点伤害；当你受到伤害后，你可以令所有与你势力相同的角色各摸一张牌。 参考wanggui(huicui)
	wanggui: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		usable: 1,
		async cost(event, trigger, player) {
			if (trigger.player == player) {
				event.result = await player.chooseBool("望归：是否令与你势力相同的角色各摸一张牌？").forResult();
				event.result.targets = game.filterPlayer(current => {
					return current.isFriendOf(player);
				});
			} else {
				event.result = await player
					.chooseTarget(get.prompt(event.skill), "望归：是否对与你势力不同的一名角色造成1点伤害？", (card, player, target) => {
						return diffGroup(player, target);
					})
					.set("ai", target => {
						let player = _status.event.player;
						return get.damageEffect(target, player, player);
					})
					.forResult();
			}
		},
		async content(event, trigger, player) {
			if (trigger.player == player) {
				const targets = event.targets;
				targets.sortBySeat();
				await game.asyncDraw(targets);
			} else {
				const target = event.targets[0];
				target.damage("nocard");
			}
		},
		ai: {
			threaten: 1.2,
		},
	},

	// 息兵：每回合限一次，当其他角色于其出牌阶段内使用黑色【杀】或黑色普通锦囊牌指定唯一目标后，你可以：令该角色将手牌摸至体力值（至多摸至五）。若其因此摸牌，其本回合不能再使用牌。 参考fakexibing(guozhan)
	xibing: {
		skillAnimation: true,
		animationColor: "water",
		audio: "xibing",
		usable: 1,
		filter(event, player) {
			if (player == event.player || event.targets.length != 1 || event.player.countCards("h") >= event.player.hp) {
				return false;
			}
			var bool = function (card) {
				return (card.name == "sha" || get.type(card, null, false) == "trick") && get.color(card, false) == "black";
			};
			if (!bool(event.card)) {
				return false;
			}
			var evt = event.getParent("phaseUse");
			if (evt.player != event.player) {
				return false;
			}
			return (
				event.player.getHistory("useCard", function (evtx) {
					return bool(evtx.card) && evtx.getParent("phaseUse") == evt;
				})[0] == event.getParent()
			);
		},
		logTarget: "player",
		check(event, player) {
			var target = event.player;
			var att = get.attitude(player, target);
			var num2 = Math.min(5, target.hp) - target.countCards("h");
			if (num2 <= 0) {
				return att <= 0;
			}
			var num = target.countCards("h", function (card) {
				return target.hasValueTarget(card, null, true);
			});
			if (!num) {
				return att > 0;
			}
			return (num - num2) * att < 0;
		},
		content() {
			var num = trigger.player.hp - trigger.player.countCards("h");
			if (num > 0) {
				trigger.player.draw(Math.min(num, 5 - trigger.player.countCards("h")));
			}
			trigger.player.addTempSkill("xibing_banned");
		},
		subSkill: {
			banned: {
				mod: {
					cardEnabled2(card) {
						if (get.position(card) == "h") {
							return false;
						}
					},
				},
			},
		},
	},

// ========== tianyu 田豫 ==========
	// 扫狄：当你使用【杀】或普通锦囊牌仅指定一名其他角色为目标时，你可以令你与其之间的角色（取最短的座次边，若双向同样短则自选一边）均成为此牌的目标（目标须合法）。 参考saodi(sp)
	saodi: {
		audio: 2,
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			const { target } = event;
			if (event.targets.length != 1 || target == player || [player, target].some(i => i.hasSkill("undist")) || !target.isIn()) {
				return false;
			}
			if (event.card.name != "sha" && get.type(event.card) != "trick") {
				return false;
			}
			const [left, right, left2, right2] = get.info("saodi").getTargets(player, target);
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
		async cost(event, trigger, player) {
			const choices = [];
			const { skill } = event,
				{ target, card } = trigger;
			const [left, right, left2, right2] = get.info(skill).getTargets(player, target);
			if (target == left2 && left.some(i => lib.filter.targetEnabled2(card, player, i))) {
				choices.push("↖顺时针");
			}
			if (target == right2 && right.some(i => lib.filter.targetEnabled2(card, player, i))) {
				choices.push("逆时针↗");
			}
			choices.push("cancel2");
			const { control } = await player
				.chooseControl(choices)
				.set("prompt", get.prompt(skill))
				.set("prompt2", `令自己和${get.translation(target)}某个方向之间的所有角色均成为${get.translation(card)}的目标`)
				.set("choices", choices)
				.set("ai", () => {
					const evt = get.event().getTrigger();
					return lib.skill.saodi.aiJudge(evt.card, evt.player, evt.target, true);
				})
				.forResult();
			if (control === "cancel2") {
				return;
			}
			const targets = [];
			game.log(player, "选择了", "#g" + control);
			if (control == "↖顺时针") {
				var current = player.getPrevious();
				while (current != target) {
					if (lib.filter.targetEnabled2(card, player, current)) {
						targets.push(current);
					}
					current = current.getPrevious();
				}
			} else {
				var current = player.getNext();
				while (current != target) {
					if (lib.filter.targetEnabled2(card, player, current)) {
						targets.push(current);
					}
					current = current.getNext();
				}
			}
			event.result = {
				bool: true,
				targets: targets,
			};
		},
		async content(event, trigger, player) {
			if (!event.isMine() && !event.isOnline()) {
				await game.delayx();
			}
			trigger.targets.addArray(event.targets);
		},
		ai: {
			threaten: 1.0,
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

// ========== dongzhao 董昭 ==========
	// 劝进：出牌阶段限一次，你可以将一张手牌交给一名此阶段受到过伤害的角色，对其发起一次“军令”。若其执行，则你摸一张牌；否则你将手牌摸至与手牌最多的角色相同（最多摸五张）。 参考quanjin(gz_dongzhao)
	quanjin: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		onChooseToUse(event) {
			if (!game.online) {
				event.set(
					"quanjin_list",
					game.filterPlayer(i => i != event.player && i.getHistory("damage").length)
				);
			}
		},
		filter(event, player) {
			return event.quanjin_list && event.quanjin_list.length > 0 && player.countCards("h") > 0;
		},
		filterCard: true,
		filterTarget(card, player, target) {
			return _status.event.quanjin_list.includes(target);
		},
		discard: false,
		lose: false,
		delay: false,
		check(card) {
			var evt = _status.event;
			if (
				evt.quanjin_list.filter(function (target) {
					return get.attitude(evt.player, target) > 0;
				}).length
			) {
				return 8 - get.value(card);
			}
			return 6.5 - get.value(card);
		},
		content() {
			"step 0";
			player.give(cards, target);
			"step 1";
			player.chooseJunlingFor(target);
			"step 2";
			event.junling = result.junling;
			event.targets = result.targets;
			var str = get.translation(player);
			target
				.chooseJunlingControl(player, result.junling, result.targets)
				.set("prompt", "劝进")
				.set("choiceList", ["执行该军令，然后" + str + "摸一张牌", "不执行该军令，然后其将手牌摸至与全场最多相同"])
				.set("ai", function () {
					var evt = _status.event.getParent(2),
						player = evt.target,
						source = evt.player,
						junling = evt.junling,
						targets = evt.targets;
					var num = 0;
					game.countPlayer(function (current) {
						var num2 = current.countCards("h");
						if (num2 > num) {
							num = num2;
						}
					});
					num = Math.max(0, num - source.countCards("h"));
					if (num > 1) {
						if (get.attitude(player, target) > 0) {
							return get.junlingEffect(source, junling, player, targets, player) > num;
						}
						return get.junlingEffect(source, junling, player, targets, player) > -num;
					}
					if (get.attitude(player, target) > 0) {
						return get.junlingEffect(source, junling, player, targets, player) > 0;
					}
					return get.junlingEffect(source, junling, player, targets, player) > 1;
				});
			"step 3";
			if (result.index == 0) {
				target.carryOutJunling(player, event.junling, targets);
				player.draw();
			} else {
				var num = 0;
				game.countPlayer(function (current) {
					var num2 = current.countCards("h");
					if (num2 > num) {
						num = num2;
					}
				});
				num -= player.countCards("h");
				if (num > 0) {
					player.draw(Math.min(num, 5));
				}
			}
		},
		ai: {
			order: 1,
			result: {
				player(player, target) {
					if (get.attitude(player, target) > 0) {
						return 3.3;
					}
					var num = 0;
					game.countPlayer(function (current) {
						var num2 = current.countCards("h");
						if (player == current) {
							num2--;
						}
						if (target == current) {
							num2++;
						}
						if (num2 > num) {
							num = num2;
						}
					});
					num = Math.max(0, num - player.countCards("h"));
					if (!num) {
						return 0;
					}
					if (num > 1) {
						return 2;
					}
					if (ui.selected.cards.length && get.value(ui.selected.cards[0]) > 5) {
						return 0;
					}
					return 1;
				},
			},
		},
	},

	// 凿运：出牌阶段限一次，你可以选择一名与你势力不同且距离大于1的角色，你弃置X张手牌（X为计算你与其的距离-1），令你本回合计算与其的距离为1，然后你对其造成1点伤害。 参考zaoyun(gz_dongzhao)
	zaoyun: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			var num = player.countCards("h");
			return game.hasPlayer(function (current) {
				if (current.isEnemyOf(player)) {
					var dist = get.distance(player, current);
					return dist > 1 && dist <= num;
				}
			});
		},
		selectCard() {
			var list = [],
				player = _status.event.player;
			if (ui.selected.targets.length) {
				return get.distance(player, ui.selected.targets[0]) - 1;
			}
			game.countPlayer(function (current) {
				if (current.isEnemyOf(player)) {
					var dist = get.distance(player, current);
					if (dist > 1) {
						list.push(dist - 1);
					}
				}
			});
			list.sort();
			return [list[0], list[list.length - 1]];
		},
		filterCard: true,
		filterTarget(card, player, target) {
			return target.isEnemyOf(player) && get.distance(player, target) == ui.selected.cards.length + 1;
		},
		check(card) {
			var player = _status.event.player;
			if (
				ui.selected.cards.length &&
				game.hasPlayer(function (current) {
					return current.isEnemyOf(player) && get.distance(player, current) == ui.selected.cards.length + 1 && get.damageEffect(current, player, player) > 0;
				})
			) {
				return 0;
			}
			return 7 - ui.selected.cards.length * 2 - get.value(card);
		},
		content() {
			target.damage("nocard");
			if (!player.storage.zaoyun2) {
				player.storage.zaoyun2 = [];
			}
			player.storage.zaoyun2.push(target);
			player.addTempSkill("zaoyun2");
		},
		ai: {
			order: 5,
			threaten: 1.2,
			result: {
				target(player, target) {
					return get.damageEffect(target, player, target);
				},
			},
		},
	},

// ========== yanghu 羊祜 ==========
	// 德劭：每回合限X次（X为你的体力值），当你成为其他角色使用黑色牌的唯一目标后，若其明置的武将牌数不大于你，你可以弃置其一张牌。 参考gzdeshao
	deshao: {
		audio: "dcdeshao",
		trigger: { target: "useCardToTargeted" },
		usable(skill, player) {
			return player.hp;
		},
		filter(event, player) {
			if (player == event.player || event.targets.length != 1 || get.color(event.card) != "black") {
				return false;
			}
			return event.player.countDiscardableCards(player, "he");
		},
		check(event, player) {
			return get.effect(event.player, { name: "guohe_copy2" }, player, player) > 0;
		},
		logTarget: "player",
		content() {
			player.discardPlayerCard(trigger.player, true, "he");
		},
	},

	// 明伐：出牌阶段限一次，你可以选择一名其他角色；该角色的下个回合结束时，若其手牌数小于你，你对其造成1点伤害并获得其一张手牌，然后若其手牌数不小于你，你将手牌摸至与其相同（至多摸五张）。 参考gzmingfa
	mingfa: {
		audio: "dcmingfa",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player != target;
		},
		content() {
			player.markAuto("mingfa", targets);
			game.delayx();
		},
		onremove: true,
		ai: {
			order: 1,
			threaten: 1.1,
			result: { target: -1 },
		},
		group: "mingfa_effect",
		subSkill: {
			effect: {
				audio: "dcmingfa",
				trigger: { global: "phaseEnd" },
				forced: true,
				filter(event, player) {
					return player.getStorage("mingfa").includes(event.player);
				},
				logTarget: "player",
				content() {
					var target = trigger.player;
					player.unmarkAuto("mingfa", [target]);
					if (target.isIn()) {
						var num = target.countCards("h") - player.countCards("h");
						if (num < 0) {
							target.damage();
							player.gainPlayerCard(target, true, "h");
						} else if (num > 0) {
							player.draw(Math.min(5, num));
						}
					}
				},
			},
		},
	},

// ========== caomao 曹髦 ==========
	// 决讨：当你成为【杀】的目标后，你可以令此【杀】不可响应，然后令使用者明置一张武将牌。 参考juetao(xianding)
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
			if (!source || !source.isIn()) {
				return;
			}
			if (source.isUnseen(0) && source.isUnseen(1)) {
				const ctrl = await source.chooseControl("主将", "副将").set("prompt", "决讨：请明置一张武将牌").forResult();
				await source.showCharacter(ctrl.control == "主将" ? 0 : 1);
			} else if (source.isUnseen(0)) {
				await source.showCharacter(0);
			} else if (source.isUnseen(1)) {
				await source.showCharacter(1);
			}
		},
	},

	// 潜龙：当你受到伤害后，你可以展示牌堆顶的三张牌，然后你可以使用其中至多已损失体力值张牌（无次数距离限制）。 参考qianlong(xianding)
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
			const pool = cards.slice();
			for (const c of pool) {
				c.storage = Object.assign({}, c.storage, { qianlong: true });
			}
			while (remain > 0 && pool.length) {
				const usable = pool.filter(card => player.hasUseTarget(card, false) || (get.info(card).notarget && lib.filter.cardEnabled(card, player)));
				if (!usable.length) {
					break;
				}
				const choice = await player.chooseButton(["潜龙：是否使用其中一张牌（无次数距离限制）？", [usable, "vcard"]], false).forResult();
				if (!choice || !choice.bool || !choice.links || !choice.links.length) {
					break;
				}
				const card = choice.links[0];
				const result = await player.chooseUseTarget(card, false, false).forResult();
				if (result && result.bool) {
					remain--;
					pool.remove(card);
				}
			}
			player.removeSkill("qianlong_range");
		},
	},
	qianlong_range: {
		charlotte: true,
		// 之前targetInRange/cardUsable对任意牌都无条件生效，只靠addSkill/removeSkill的时间窗口来限定范围——
		// 一旦这中间发生任何交互导致"无次数限制"被引擎缓存下来，就会变成整个回合杀不计次数。
		// 改为只对潜龙本次展示出的这几张具体牌对象生效(card.storage.qianlong标记)，不会影响手牌里的杀。
		mod: {
			targetInRange(card) {
				if (card && card.storage && card.storage.qianlong) {
					return true;
				}
			},
			cardUsable(card) {
				if (card && card.storage && card.storage.qianlong) {
					return Infinity;
				}
			},
		},
	},

	// 忿肆：锁定技，准备阶段，你对体力值不小于你的一名角色造成1点伤害，然后若该角色不为你，则其视为对你使用一张【杀】。 参考fensi(xianding)
	fensi: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		async content(event, trigger, player) {
			if (
				!game.hasPlayer(current => {
					return current !== player && current.hp >= player.hp;
				})
			) {
				await player.damage();
				return;
			} else {
				const result = await player
					.chooseTarget(true, "忿肆：对一名体力值不小于你的角色造成1点伤害", (card, player, target) => {
						return target.hp >= player.hp;
					})
					.set("ai", target => {
						const player = _status.event.player;
						return get.damageEffect(target, player, player);
					})
					.forResult();
				if (result.targets?.length) {
					const {
						targets: [target],
					} = result;
					player.line(target, "green");
					await target.damage();
					if (target != player && target.isIn() && target.canUse("sha", player, false)) {
						await target.useCard({ name: "sha", isCard: true }, player, false, "noai");
					}
				}
			}
		},
		ai: {
			threaten: 1.4,
		},
	},

// ========== caofang 曹芳 ==========
	// 诏图：每轮限一次，你可以将一张红色非锦囊牌当【乐不思蜀】使用，此回合结束后，目标执行一个手牌上限-2的额外回合。 参考jsrgzhaotu(jsrg)
	zhaotu: {
		skillAnimation: true,
		animationColor: "water",
		enable: "chooseToUse",
		viewAs: { name: "lebu" },
		position: "hes",
		round: 1,
		viewAsFilter(player) {
			return player.countCards("hes");
		},
		filterCard(card, player) {
			return get.color(card) == "red" && get.type2(card) != "trick";
		},
		onuse(result, player) {
			player.tempBanSkill("zhaotu", null, false);
			const next = result.targets[0].insertPhase();
			next.skill = "zhaotu";
			result.targets[0]
				.when({
					player: "phaseBegin",
				})
				.filter(evt => evt.skill == "zhaotu")
				.step(async (event, trigger, player) => {
					player.addTempSkill("zhaotu_handcard");
					player.addMark("zhaotu_handcard", 2, false);
				});
		},
		subSkill: {
			handcard: {
				intro: {
					content(storage, player) {
						return "手牌上限-" + storage;
					},
				},
				charlotte: true,
				onremove: true,
				mod: {
					maxHandcard(player, num) {
						return num - player.countMark("zhaotu_handcard");
					},
				},
			},
		},
		ai: {
			order: 5,
			threaten: 0.8,
			result: {
				target(player, target) {
					return 0.5 - 0.75 * target.needsToDiscard(2, null, true);
				},
			},
		},
	},

	// 惊惧：你可以将其他角色判定区里的一张牌移至你的判定区里，视为你使用一张基本牌。 参考jsrgjingju(jsrg)
	jingju: {
		enable: "chooseToUse",
		filter(event, player) {
			if (event.type == "wuxie" || event.jingju) {
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
							.set("logSkill", "jingju")
							.forResult();

						if (!result.bool) {
							const parent = event.getParent();
							if (parent != null) {
								parent.jingju = true;
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
			skillTagFilter(player, tag, arg) {
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

// ========== simayi 司马懿 ==========
	// 反馈：当你受到伤害后，你可以获得其同势力角色的一张手牌或场上的一张牌。 参考fankui(standard)
	fankui: {
		audio: 2,
		trigger: { player: "damageEnd" },
		logTarget: "source",
		preHidden: true,
		filter(event, player) {
			return event.num > 0 && event.source?.isIn() && game.hasPlayer(current => current.isFriendOf(event.source) && current.hasGainableCards(player, current !== player ? "he" : "e"));
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget((card, player, target) => {
					return target.isFriendOf(trigger.source) && target.hasGainableCards(player, target !== player ? "he" : "e");
				}, get.prompt("fankui"))
				.set("ai", target => {
					const player = _status.event.player;
					return get.effect(target, { name: "shunshou_copy2" }, player, player);
				})
				.forResult();
			if (result.bool) {
				const [target] = result.targets;
				await player.gainPlayerCard({
					target: target,
					position: target !== player ? "he" : "e",
					forced: true,
				});
			}
		},
		ai: {
			maixie_defend: true,
			threaten: 1.4,
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

	// 鬼才：当一名角色的判定牌生效前，你可以打出一张牌代替之。 参考guicai(standard)
	guicai: {
		audio: 2,
		audioname2: { new_simayi: "reguicai_new_simayi" },
		trigger: { global: "judge" },
		preHidden: true,
		filter(event, player) {
			return player.hasCards("hs");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: `${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt(event.skill)}`,
					filterCard(card) {
						const player = get.player();
						const mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
						if (mod2 !== "unchanged") {
							return !!mod2;
						}
						const mod = game.checkMod(card, player, "unchanged", "cardRespondable", player);
						if (mod !== "unchanged") {
							return !!mod;
						}
						return true;
					},
					position: "hs",
					ai(card) {
						const trigger = get.event().getTrigger();
						const { player, judging } = get.event();
						const result = trigger.judge(card) - trigger.judge(judging);
						const attitude = get.attitude(player, trigger.player);
						let val = get.value(card);
						if (get.subtype(card) == "equip2") {
							val /= 2;
						} else {
							val /= 4;
						}
						if (attitude == 0 || result == 0) {
							return 0;
						}
						if (attitude > 0) {
							return result - val;
						}
						return -result - val;
					},
				})
				.set("judging", trigger.player.judging[0])
				.setHiddenSkill(event.skill)
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
			if (cards?.length) {
				if (trigger.player.judging[0].clone) {
					trigger.player.judging[0].clone.classList.remove("thrownhighlight");
					game.broadcast(card => {
						if (card.clone) {
							card.clone.classList.remove("thrownhighlight");
						}
					}, trigger.player.judging[0]);
					game.addVideo("deletenode", player, get.cardsInfo([trigger.player.judging[0].clone]));
				}
				await game.cardsDiscard(trigger.player.judging[0]);
				trigger.player.judging[0] = cards[0];
				trigger.orderingCards.addArray(cards);
				game.log(trigger.player, "的判定牌改为", cards);
				await game.delay(2);
			}
		},
		ai: {
			rejudge: true,
			tag: { rejudge: 1 },
		},
	},

// ========== caocao 曹操 ==========
	// 奸雄：当你受到伤害后，你可以摸一张牌然后令一名角色获得对你造成伤害的牌。 参考gz_jianxiong
	jianxiong: {
		audio: "jianxiong",
		trigger: {
			player: "damageEnd",
		},
		async cost(event, trigger, player) {
			let list = ["摸牌"];
			if (get.itemtype(trigger.cards) == "cards" && trigger.cards.filterInD().length) {
				list.push("拿牌");
			}
			list.push("cancel2");
			const { control } = await player
				.chooseControl(list)
				.set("prompt", get.prompt2("jianxiong"))
				.set("ai", () => {
					const player = get.event().player,
						trigger = get.event().getTrigger();
					const cards = trigger.cards ? trigger.cards.filterInD() : [];
					if (get.event().controls.includes("拿牌")) {
						if (
							cards.reduce((sum, card) => {
								return sum + (card.name == "du" ? -1 : 1);
							}, 0) > 1 ||
							player.getUseValue(cards[0]) > 6
						) {
							return "拿牌";
						}
					}
					return "摸牌";
				})
				.forResult();
			event.result = { bool: control != "cancel2", cost_data: { result: control } };
		},
		async content(event, trigger, player) {
			if (event.cost_data.result == "摸牌") {
				await player.draw();
			} else {
				const cards = trigger.cards.filterInD();
				const result = await player
					.chooseTarget(get.prompt("jianxiong"), "令一名角色获得" + get.translation(cards))
					.set("ai", target => {
						return get.attitude(get.player(), target);
					})
					.forResult();
				const target = result.bool ? result.targets[0] : player;
				await target.gain(cards, "gain2");
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return [1, -1];
					}
					if (get.tag(card, "damage") && player != target) {
						return [1, 0.6];
					}
				},
			},
		},
	},

	// 挥鞭：出牌阶段限一次，你可以对一名角色造成1点伤害，然后令一名与其同势力且已受伤的角色回复1点体力。 参考huibian(gz_jun_caocao)
	huibian: {
		enable: "phaseUse",
		audio: 2,
		usable: 1,
		filter(event, player) {
			return (
				game.countPlayer(function (current) {
					return sameGroup(current, player);
				}) > 1 &&
				game.hasPlayer(function (current) {
					return current.isDamaged();
				})
			);
		},
		filterTarget(card, player, target) {
			if (ui.selected.targets.length) {
				return target.isDamaged() && sameGroup(target, ui.selected.targets[0]);
			}
			return true;
		},
		selectTarget: 2,
		multitarget: true,
		targetprompt: ["受到伤害", "回复体力"],
		async content(event, trigger, player) {
			const {
				targets: [target1, target2],
			} = event;
			await target1.damage(player);
			await target2.recover();
		},
		ai: {
			threaten: 1.2,
			order: 9,
			result: {
				target(player, target) {
					if (ui.selected.targets.length) {
						return 1;
					}
					if (get.damageEffect(target, player, player) > 0) {
						return 2;
					}
					if (target.hp > 2) {
						return 1;
					}
					if (target.hp == 1) {
						return -1;
					}
					return 0.1;
				},
			},
		},
	},

// ========== zhangliao 张辽 ==========
	// 突袭：你的回合内限两次，当你不因此技能获得牌后，你可以将其中任意张牌置入弃牌堆，然后获得至多X名其他角色各一张手牌（X为你以此法置入弃牌堆的牌数）。 参考sbtuxi(sb)
	tuxi: {
		audio: 2,
		trigger: {
			player: "gainAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			if (player !== _status.currentPhase || event.getParent("tuxi").player === player) {
				return false;
			}
			return event.getg(player).length;
		},
		get usable() {
			return 2;
		},
		async cost(event, trigger, player) {
			const cards = trigger.getg(player).filter(i => get.owner(i) === player);
			event.result = await player
				.chooseCard({
					prompt: get.prompt("tuxi"),
					prompt2: "将本次获得的任意张牌置于弃牌堆，然后获得至多等量名其他角色的各一张手牌",
					filterCard: card => get.event().cards.includes(card),
					selectCard: [1, cards.length],
					allowChooseAll: true,
				})
				.set("ai", card => {
					const player = get.player();
					const targets = game.filterPlayer(current => player !== current && current.countGainableCards(player, "h") && get.effect(current, { name: "shunshou_copy2" }, player, player) > 0);
					if (ui.selected.cards.length > targets.length) {
						return 0;
					}
					return 6.5 - get.value(card);
				})
				.set("cards", cards)
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			const num = cards.length;
			await player.loseToDiscardpile({ cards });
			if (!game.hasPlayer(current => player !== current && current.countGainableCards(player, "h"))) {
				return;
			}
			const { bool, targets } = await player
				.chooseTarget({
					prompt: `获得至多${get.cnNumber(num)}名其他角色的各一张手牌`,
					filterTarget: (card, player, target) => player !== target && target.countGainableCards(player, "h"),
					selectTarget: [1, num],
					forced: true,
				})
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "shunshou_copy2" }, player, player);
				})
				.forResult();
			if (bool) {
				await player.gainMultiple(targets.sortBySeat());
			}
		},
		ai: {
			threaten: 2,
		},
	},

// ========== xuzhu 许褚 ==========
	// 裸衣：限定技。废除你的防具栏。本局游戏，你可以将一张防具牌当【桃】以外的基本牌使用或打出。你使用【杀】和【决斗】造成的伤害+1。
	// standard包的luoyi其实是完全不同的技能(典韦"少摸一张牌，本回合伤害+1")，和这条翻译文本对不上，注释是错的；下方是按卡面文本原创实现。
	// 之前多处误把"equip1"(武器)写成本该是"equip2"(防具)：filter/disableEquip/viewAsFilter/filterCard全错，导致武器槽被废除、防具被当成杀使用，还漏了viewAs需要的position:"e"(装备区)导致hover时崩溃(见error log)。已改为equip2并补上position。
	luoyi: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			return !player.storage.luoyi_used;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt(event.name)).forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.storage.luoyi_used = true;
			player.disableEquip("equip2");
			player.addSkills("luoyi_viewas");
			player.addSkills("luoyi_effect");
		},
		ai: {
			threaten: 1.8,
		},
		subSkill: {
			viewas: {
				audio: "luoyi",
				enable: "chooseToUse",
				viewAs: { name: "sha" },
				position: "e",
				viewAsFilter(player) {
					return player.getCards("e", { subtype: "equip2" }).length;
				},
				filterCard(card, player) {
					return get.subtype(card) == "equip2";
				},
				popname: true,
				check(card) {
					return 5 - get.value(card);
				},
				prompt(links, player) {
					return "裸衣：将一张防具牌当基本牌使用或打出";
				},
			},
			effect: {
				audio: "luoyi",
				charlotte: true,
				mod: {
					cardDamage(card, player, num) {
						if (get.name(card) == "sha" || get.name(card) == "juedou") {
							return num + 1;
						}
					},
				},
			},
		},
	},

// ========== guojia 郭嘉 ==========
	// 天妒：一名角色的回合开始时，你可以进行一次判定，若结果为♠，你受到1点雷电伤害。当你的判定牌生效后，你可以获得此牌。 参考tiandu(standard)
	tiandu2: {
		audio: 2,
		trigger: { global: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt(event.name)).forResult();
		},
		async content(event, trigger, player) {
			const result = await player.judge(card => (get.suit(card) == "spade" ? -1 : 1)).forResult();
			if (result.color == "black" && get.suit(result.card) == "spade") {
				await player.damage("thunder", "nosource");
			}
		},
		subSkill: {
			gain: {
				audio: 2,
				trigger: { player: "judgeEnd" },
				preHidden: true,
				filter(event, player) {
					return get.position(event.result.card, true) === "o";
				},
				async content(event, trigger, player) {
					player.gain({
						cards: [trigger.result.card],
						animate: "gain2",
					});
				},
			},
		},
		group: "tiandu2_gain",
	},

	// 遗计：当你受到伤害后或进入濒死时，你可以摸两张牌，然后你可以将至多两张牌交给其他角色。 参考yiji(standard)
	yiji: {
		audio: 2,
		trigger: { player: "damageEnd", global: "dying" },
		frequent: true,
		filter(event, player, name) {
			if (name == "dying") {
				return event.player == player;
			}
			return event.num > 0;
		},
		async content(event, trigger, player) {
			await player.draw(2);
			const hs = player.getCards("h").slice(0, 2);
			if (!hs.length) {
				return;
			}
			const result = await player
				.chooseCardButton({
					prompt: "遗计：请选择至多两张牌交给其他角色",
					cards: hs,
					select: [0, hs.length],
				})
				.forResult();
			if (result?.links?.length) {
				const target = await player
					.chooseTarget({
						prompt: `将${get.translation(result.links)}交给一名角色`,
						filterTarget: (card, player, target) => target != player,
						forced: true,
					})
					.forResult();
				if (target?.targets?.length) {
					await player.give(result.links, target.targets[0]);
				}
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			threaten: 1.3,
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

// ========== xuhuang 徐晃 ==========
	// 治严：出牌阶段每项各限一次，你可以：1.将手牌摸至体力上限，然后本阶段不能对其他角色使用牌；2.交给一名其他角色X张手牌（X为你的手牌数减体力值）。 参考skill_old.js
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
		ai: {
			threaten: 0.8,
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

// ========== yuejin 乐进 ==========
	// 骁果：其他角色的结束阶段，你可以弃置一张手牌，然后该角色选择一项：1.弃置一张装备牌，你获得此装备牌或摸一张牌；2.受到你造成的1点伤害。 参考xiaoguo(sp)
	xiaoguo: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return event.player.isIn() && event.player != player && player.countCards("h");
		},
		direct: true,
		async content(event, trigger, player) {
			const next = player.chooseToDiscard(get.prompt("xiaoguo", trigger.player));
			next.set("ai", function (card) {
				return _status.event.eff - get.useful(card);
			});
			next.set("logSkill", ["xiaoguo", trigger.player]);
			next.set(
				"eff",
				(function () {
					if (trigger.player.hasSkillTag("noe")) {
						return get.attitude(_status.event.player, trigger.player);
					}
					return get.damageEffect(trigger.player, player, _status.event.player);
				})()
			);
			const result = await next.forResult();
			if (result.bool) {
				if (get.mode() !== "identity" || player.identity !== "nei") {
					player.addExpose(0.15);
				}
				const result2 = await trigger.player
					.chooseToDiscard("he", "弃置一张装备牌，然后" + get.translation(player) + "获得此牌或摸一张牌，或受到1点伤害", { type: "equip" })
					.set("ai", function (card) {
						if (_status.event.damage > 0) {
							return 0;
						}
						if (_status.event.noe) {
							return 12 - get.value(card);
						}
						return -_status.event.damage - get.value(card);
					})
					.set("damage", get.damageEffect(trigger.player, player, trigger.player))
					.set("noe", trigger.player.hasSkillTag("noe"))
					.forResult();
				if (result2.bool) {
					const result3 = await player.chooseBool("骁果：是否获得" + get.translation(result2.cards[0]) + "？").forResult();
					if (result3.bool) {
						await player.gain(result2.cards, "gain2");
					} else {
						await player.draw();
					}
				} else {
					await trigger.player.damage();
				}
			} else {
				event.finish();
			}
		},
		ai: {
			threaten: 1.3,
		},
	},

// ========== bianfuren 卞夫人 ==========
	// 挽危：当同势力角色因被其他角色获得或弃置而确定移动牌时，你可以选择用自己的牌代替此次将被获取或弃置的牌。 参考wanwei(sp)
	wanwei: {
		trigger: { target: ["rewriteGainResult", "rewriteDiscardResult"] },
		direct: true,
		preHidden: true,
		filter(event, player) {
			return event.player != player && event.player.isFriendOf(player);
		},
		audio: 2,
		async content(event, trigger, player) {
			const prompt = "即将失去" + get.translation(trigger.result.cards) + "，是否发动【挽危】？";
			const next = player.choosePlayerCard(player, prompt, trigger.position);
			next.set("ai", function (button) {
				return 20 - get.value(button.link);
			});
			next.filterButton = trigger.filterButton;
			next.selectButton = trigger.result.cards.length;
			next.setHiddenSkill("wanwei");
			const result = await next.forResult();
			if (result.bool) {
				player.logSkill("wanwei");
				trigger.result.cards = result.links.slice(0);
				trigger.result.links = result.links.slice(0);
				trigger.cards = result.links.slice(0);
				trigger.untrigger();
			}
		},
		ai: {
			threaten: 1.1,
		},
	},

	// 约俭：锁定技，同势力角色的基础手牌上限改为X（X为其体力上限）。 参考gz_yuejian
	yuejian: {
		audio: "yuejian",
		trigger: { global: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return game.hasPlayer(current => current.isFriendOf(player) && !current.hasSkill("yuejian_num"));
		},
		async content(event, trigger, player) {
			game.filterPlayer(current => current.isFriendOf(player)).forEach(current => {
				current.addSkill("yuejian_num");
			});
		},
		subSkill: {
			num: {
				charlotte: true,
				mod: {
					maxHandcardBase(player, num) {
						return player.maxHp;
					},
				},
			},
		},
	},

// ========== caozhi 曹植 ==========
	// 诗酒：你明置一张武将牌后，若当前回合角色能使用【酒】，你可令其视为使用之。当你受到伤害后，若你的武将牌均明置，你可以重铸任意张牌并暗置此武将牌。 参考skill_old.js
	shijiu: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			const current = _status.currentPhase;
			return !!(current && current.isIn() && current.canUse({ name: "jiu", isCard: true }, current));
		},
		async cost(event, trigger, player) {
			const current = _status.currentPhase;
			event.result = await player.chooseBool(`诗酒：是否令${get.translation(current)}视为使用一张【酒】？`).forResult();
		},
		async content(event, trigger, player) {
			const current = _status.currentPhase;
			if (current.isIn() && current.canUse({ name: "jiu", isCard: true }, current)) {
				await current.useCard({ name: "jiu", isCard: true }, current);
			}
		},
		group: "shijiu_recast",
		subSkill: {
			recast: {
				aiShowTag: "defense",
				charlotte: true,
				trigger: { player: "damageEnd" },
				filter(event, player) {
					return !player.isUnseen(2);
				},
				async cost(event, trigger, player) {
					event.result = await player.chooseBool("诗酒：是否重铸任意张牌，然后暗置此武将牌？").forResult();
				},
				async content(event, trigger, player) {
					if (player.countCards("he")) {
						const result = await player.chooseCard("he", [0, player.countCards("he")], "诗酒：选择任意张牌重铸（可不选）", true).forResult();
						if (result && result.bool && result.cards && result.cards.length) {
							await player.recast(result.cards);
						}
					}
					if (!player.isIn()) {
						return;
					}
					let slot = 0;
					if (player.name2) {
						const ctrl = await player.chooseControl("主将", "副将").set("prompt", "诗酒：请暗置一张武将牌").forResult();
						slot = ctrl.control == "主将" ? 0 : 1;
					}
					await player.hideCharacter(slot);
				},
			},
		},
	},

	// 纵缰：当其他角色的牌不因使用而置入弃牌堆后，你可以获得其中的锦囊牌和坐骑牌。 参考skill_old.js
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
			// 修复：原来用 card.isInD && card.isInD() 判断"是否在弃牌堆里"，但isInD在整个
			// 引擎里根本不存在（是凭空编的方法名），恒为undefined，导致这里永远过滤成空数组，
			// 弃牌堆判定卡的锦囊/坐骑就是这样"提示发动却什么都获得不到"。参考yijiang包官方
			// luoying的写法，改用get.position(card, true) == "d"来判断。
			const cards = trigger.cards.filter(card => get.position(card, true) == "d" && (get.type(card) == "trick" || ["equip3", "equip4"].includes(get.subtype(card))));
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
		ai: {
			threaten: 1.2,
		},
	},

// ========== zhonghui 钟会 ==========
	// 权计：当你受到或造成伤害后，你可以摸一张牌并将一张手牌置于你的武将牌上，称为“权”。 参考gz_ol_quanji
	quanji: {
		audio: "quanji",
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		frequent: true,
		filter(event, player) {
			return event.num > 0;
		},
		async content(event, trigger, player) {
			await player.draw();
			if (!player.countCards("h")) {
				return;
			}
			const result = await player.chooseCard("将一张牌置于武将牌上作为“权”", "he", true).forResult();
			if (result?.bool && result?.cards?.length) {
				const next = player.addToExpansion(result.cards, player, "give");
				next.gaintag.add(event.name);
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
			maixie: true,
			maixie_hp: true,
			threaten: 0.8,
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
							return [0.5, get.tag(card, "damage") * 2];
						}
						if (target.hp == 3) {
							return [0.5, get.tag(card, "damage") * 1.5];
						}
						if (target.hp == 2) {
							return [1, get.tag(card, "damage") * 0.5];
						}
					}
				},
			},
		},
	},

	// 排异：弃牌阶段结束时，若你此阶段未弃置过牌，你可以将任意张“权”交给一名角色，然后若其手牌数大于你，你对其造成1点伤害。 参考gz_ol_paiyi
	paiyi: {
		skillAnimation: true,
		animationColor: "water",
		audio: "paiyi",
		trigger: {
			player: "phaseDiscardEnd",
		},
		filter(event, player) {
			let cards = [];
			player.getHistory("lose", evt => {
				if (evt.type == "discard" && evt.getParent(event.name) == event) {
					cards.addArray(evt.cards2);
				}
			});
			return !cards.length && player.getExpansions("quanji").length > 0;
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseButtonTarget({
					createDialog: [get.prompt(event.skill), player.getExpansions("quanji")],
					selectButton: [1, Infinity],
					filterTarget: true,
					allowChooseAll: true,
					ai1(card) {
						return get.value(card);
					},
					ai2(target) {
						const cards = ui.selected.cards;
						if (!cards?.length) {
							return 0;
						}
						const vals = cards.reduce((sum, card) => {
							return sum + get.value(card, target);
						}, 0);
						if (target != player && target.countCards("h") + cards.length > player.countCards("h")) {
							return vals + get.damageEffect(target, player, player);
						}
						return vals;
					},
				})
				.forResult();
			if (result.bool) {
				event.result = {
					bool: true,
					cards: result.links,
					targets: result.targets,
				};
			}
		},
		async content(event, trigger, player) {
			const {
				cards,
				targets: [target],
			} = event;
			await target.gain(cards, "give", player);
			if (target.countCards("h") > player.countCards("h")) {
				await target.damage();
			}
		},
	},

	// 邀叛：限定技，你杀死一名角色的回合结束后，你可以指定一名同势力角色，其可以与你副将易位。然后控制此武将牌的角色获得所有“权”，执行一个额外出牌阶段。 参考gz_yaopan
	yaopan: {
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		trigger: {
			global: "phaseEnd",
		},
		filter(event, player) {
			let targets = game
				.getGlobalHistory("everything", evt => {
					if (evt.name !== "die" || evt.player === player) {
						return false;
					}
					return (evt.reason ?? {}).source === player;
				})
				.map(evt => evt.player);
			return targets.length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return player == target || player.isFriendOf(target);
				})
				.set("ai", target => {
					return get.attitude(get.player(), target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const target = event.targets[0];
			const cards = player.getExpansions("quanji");
			if (cards.length) {
				await target.gain(cards, "give", player);
			}
			const next = target.insertPhase();
			next.phaseList = ["phaseUse"];
		},
	},

// ========== wangji 王基 ==========
	// 奇制：当你于回合内使用基本牌或锦囊牌指定目标后，你可以弃置不是此牌目标的一名角色一张牌，然后该角色摸一张牌。 参考qizhi(sp)
	qizhi: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!event.targets || !event.isFirstTarget) {
				return false;
			}
			if (_status.currentPhase != player) {
				return false;
			}
			var type = get.type(event.card, "trick");
			if (type != "basic" && type != "trick") {
				return false;
			}
			if (event.noai) {
				return false;
			}
			return game.hasPlayer(function (target) {
				return !event.targets.includes(target) && target.countCards("he") > 0;
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "弃置一名角色的一张牌，然后其摸一张牌", function (card, player, target) {
					return !_status.event.targets.includes(target) && target.countCards("he") > 0;
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					if (target == player) {
						return 2;
					}
					if (get.attitude(player, target) <= 0) {
						return 1;
					}
					return 0.5;
				})
				.set("targets", trigger.targets)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.getHistory("custom").push({ [event.name]: true });
			await player.discardPlayerCard(target, true, "he");
			await target.draw();
		},
		ai: {
			threaten: 0.9,
		},
	},

	// 进趋：结束阶段，你可以摸两张牌，然后将手牌弃至X张（X为你于此回合内发动过“奇制”的次数）。 参考jinqu(sp)
	jinqu: {
		skillAnimation: true,
		animationColor: "water",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		check(event, player) {
			return (
				player.getHistory("custom", function (evt) {
					return evt.qizhi == true;
				}).length >= player.countCards("h")
			);
		},
		prompt(event, player) {
			var num = player.getHistory("custom", function (evt) {
				return evt.qizhi == true;
			}).length;
			return "进趋：是否摸两张牌并将手牌弃置至" + get.cnNumber(num) + "张？";
		},
		async content(event, trigger, player) {
			await player.draw(2);
			const dh =
				player.countCards("h") -
				player.getHistory("custom", function (evt) {
					return evt.qizhi == true;
				}).length;
			if (dh > 0) {
				await player.chooseToDiscard(dh, true, "allowChooseAll");
			}
		},
		ai: { combo: "qizhi" },
	},

// ========== dingfeng 丁奉 ==========
	// 短兵：当你使用【杀】选择目标后，你可以令一名距离为1的角色也成为此【杀】的目标。若你的【杀】指定的目标距离为1，此【杀】视为【刺杀】。 参考duanbing(sp)
	duanbing: {
		audio: 2,
		audioname2: { heqi: "duanbing_heqi" },
		trigger: { player: "useCard2" },
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			return game.hasPlayer(function (current) {
				return !event.targets.includes(current) && get.distance(player, current) <= 1 && player.canUse(event.card, current);
			});
		},
		direct: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt("duanbing"), "为" + get.translation(trigger.card) + "增加一个目标", function (card, player, target) {
					return !_status.event.sourcex.includes(target) && get.distance(player, target) <= 1 && player.canUse(_status.event.card, target);
				})
				.set("sourcex", trigger.targets)
				.set("ai", function (target) {
					var player = _status.event.player;
					return get.effect(target, _status.event.card, player, player);
				})
				.set("card", trigger.card)
				.forResult();
			if (result.bool) {
				if (!event.isMine() && !event.isOnline()) {
					await game.delayx();
				}
				event.target = result.targets[0];
			} else {
				event.finish();
				return;
			}
			player.logSkill("duanbing", event.target);
			trigger.targets.push(event.target);
		},
		group: "duanbing_sha",
		subSkill: {
			sha: {
				audio: 2,
				audioname: ["heqi"],
				trigger: { player: "useCardToPlayered" },
				forced: true,
				filter(event, player) {
					return event.card.name == "sha" && !event.getParent().directHit.includes(event.target) && get.distance(player, event.target) <= 1;
				},
				logTarget: "target",
				content(event, trigger, player) {
					const id = trigger.target.playerid;
					const map = trigger.getParent().customArgs;
					if (!map[id]) {
						map[id] = {};
					}
					if (typeof map[id].shanRequired == "number") {
						map[id].shanRequired++;
					} else {
						map[id].shanRequired = 2;
					}
				},
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						if (!arg || !arg.card || !arg.target || arg.card.name != "sha" || arg.target.countCards("h", "shan") > 1 || get.distance(player, arg.target) > 1) {
							return false;
						}
					},
				},
			},
		},
		ai: {
			threaten: 1.4,
			effect: {
				player_use(card, player, target, current, isLink) {
					if (!isLink && card.name == "sha") {
						if (player._duanbingtmp) {
							return;
						}
						player._duanbingtmp = true;
						if (get.effect(target, card, player, player) <= 0) {
							delete player._duanbingtmp;
							return;
						}
						if (
							game.hasPlayer(function (current) {
								return current != target && get.distance(player, current) <= 1 && player.canUse(card, current) && get.effect(current, card, player, player) > 0;
							})
						) {
							delete player._duanbingtmp;
							return [1, 1];
						}
						delete player._duanbingtmp;
					}
				},
			},
		},
	},

	// 奋迅：出牌阶段开始时，你可以选择一名其他角色，本回合你计算与其的距离视为1，然后直到回合结束时，若你未对其造成过伤害，你弃置一张牌。 参考fenxun(sp)
	fenxun: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filterTarget(card, player, target) {
			return target != player;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("fenxun"), lib.filter.notMe)
				.set("ai", target => {
					const player = get.player();
					return player.canUse("sha", target, false) ? get.effect(target, { name: "sha" }, player, player) : 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.storage.fenxun2 = [target];
			player.addTempSkill("fenxun2", "phaseAfter");
			player.addTempSkill("fenxun_check", "phaseAfter");
		},
		subSkill: {
			check: {
				trigger: { player: "phaseAfter" },
				forced: true,
				filter(event, player) {
					return player.storage.fenxun2?.length && !player.getHistory("damage", evt => evt.player == player && player.storage.fenxun2.includes(evt.target)).length;
				},
				async content(event, trigger, player) {
					if (player.countCards("he")) {
						await player.chooseToDiscard("he", true);
					}
				},
			},
		},
		ai: {
			order: 4,
			result: {
				player(player, target) {
					if (get.distance(player, target) <= 1) {
						return 0;
					}
					if (player.hasSha() && player.canUse("sha", target, false) && get.effect(target, { name: "sha" }, player, player) > 0) {
						return 1;
					}
					return 0;
				},
			},
		},
	},

// ========== lvfan 吕范 ==========
	// 调度：同势力角色使用装备牌时，若其装备区没有该类别装备，可以摸一张牌。准备阶段，你可以将与一名同势力角色装备区里的一张牌移动至另一名同势力角色的装备区。 参考gz_diaodu_best
	diaodu: {
		skillAnimation: true,
		animationColor: "wood",
		audio: "diaodu",
		trigger: {
			global: "useCard",
			player: "phaseZhunbeiBegin",
		},
		filter(event, player, name) {
			if (name === "phaseZhunbeiBegin") {
				return (
					game.hasPlayer(current => current !== player && current.isFriendOf(player) && current.countCards("e") > 0) &&
					game.countPlayer(current => current !== player && current.isFriendOf(player)) > 1
				);
			}
			if (get.type(event.card) !== "equip") {
				return false;
			}
			if (!event.player.isIn() || !event.player.isFriendOf(player)) {
				return false;
			}
			return !event.player.getEquips(get.subtype(event.card)).length;
		},
		frequent(event, player, name) {
			return name !== "phaseZhunbeiBegin";
		},
		logTarget(event, player, name) {
			if (name !== "phaseZhunbeiBegin") {
				return event.player;
			}
		},
		async cost(event, trigger, player) {
			if (trigger.name === "phaseZhunbeiBegin") {
				event.result = await player
					.chooseTarget(get.prompt("diaodu"), "选择一名同势力角色，移动其装备区里的一张牌", (card, player, target) => target !== player && target.isFriendOf(player) && target.countCards("e") > 0)
					.forResult();
				return;
			}
			const next = trigger.player.chooseBool(get.prompt("diaodu"), "摸一张牌");
			next.set("frequentSkill", "diaodu");
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			if (trigger.name === "phaseZhunbeiBegin") {
				const source = event.targets[0];
				const cardResult = await player.choosePlayerCard(source, "e", true).forResult();
				if (!cardResult.bool || !cardResult.cards || !cardResult.cards.length) {
					return;
				}
				const targets2 = game.filterPlayer(current => current !== player && current !== source && current.isFriendOf(player));
				if (!targets2.length) {
					return;
				}
				const result2 = await player.chooseTarget(targets2, "选择移动至的同势力角色", true).forResult();
				if (result2.bool && result2.targets && result2.targets.length) {
					await source.give(cardResult.cards[0], result2.targets[0]);
				}
				return;
			}
			await trigger.player.draw();
		},
		ai: {
			threaten: 0.7,
		},
	},

	// 典财：其他角色的出牌阶段结束时，若你于此阶段失去的牌数不小于X，你可以将手牌摸至体力上限，然后你可以变更副将（X为你的体力值）。 参考gz_diancai
	diancai: {
		audio: "diancai",
		trigger: {
			global: "phaseUseEnd",
		},
		preHidden: true,
		filter(event, player) {
			if (_status.currentPhase === player) {
				return false;
			}
			let num = 0;
			player.getHistory("lose", evt => {
				if (evt.cards2 && evt.getParent("phaseUse") === event) {
					num += evt.cards2.length;
				}
				return false;
			});
			return num >= player.hp;
		},
		async content(event, trigger, player) {
			const num = player.maxHp - player.countCards("h");
			if (num > 0) {
				await player.draw(num);
			}
			await player.mayChangeVice(undefined, undefined);
		},
	},

// ========== zhouchu 周处 ==========
	// 凶侠：出牌阶段，你可以将两张牌当【决斗】对两名其他角色使用，然后此牌结算结束后，若此牌对所有目标角色均造成过伤害，此技能本回合失效。 参考stdxiongxia
	xiongxia: {
		audio: "xianghai",
		enable: "chooseToUse",
		filterCard: true,
		selectCard: 2,
		position: "hes",
		viewAs: { name: "juedou" },
		selectTarget: 2,
		viewAsFilter(player) {
			if (player.countCards("hes") < 2) {
				return false;
			}
		},
		check(card) {
			if (get.name(card) == "sha") {
				return 4 - get.value(card);
			}
			return 7.5 - get.value(card);
		},
		onuse(links, player) {
			player.addTempSkill("xiongxia_effect");
		},
		ai: {
			threaten: 1.3,
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return (
						event.skill == "xiongxia" &&
						(event.targets || []).every(target => {
							return target.getHistory("damage", evt => {
								return evt.card && evt.card == event.card;
							}).length;
						})
					);
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.tempBanSkill("xiongxia");
				},
			},
		},
	},

// ========== panjun 潘濬 ==========
	// 聪察：准备阶段，你可以选择一名未确定势力的角色，直到你的下个回合开始，当其首次确定势力后，若其与你：势力相同，你与其各摸两张牌；势力不同，其失去1点体力；摸牌阶段，若所有角色均已确定势力，你可以多摸两张牌。 参考gzcongcha
	congcha: {
		skillAnimation: true,
		animationColor: "wood",
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
			const target = event.targets[0];
			player.storage.congcha2 = target;
			player.addTempSkill("congcha2", { player: "phaseBegin" });
		},
		subfrequent: ["draw"],
		group: "congcha_draw",
		ai: {
			threaten: 0.8,
		},
		subSkill: {
			draw: {
				audio: "congcha",
				trigger: { player: "phaseDrawBegin2" },
				frequent: true,
				filter(event, player) {
					return (
						!event.numFixed &&
						!game.hasPlayer(function (current) {
							return current.isUnseen();
						})
					);
				},
				prompt: "是否发动【聪察】多摸两张牌？",
				content() {
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

	// 公清：锁定技，当你受到伤害时，若伤害来源的攻击范围：小于3，则此伤害改为1；大于3，则此伤害+1。 参考xinfu_gongqing
	gongqing: {
		audio: 2,
		trigger: {
			player: ["damageBegin3", "damageBegin4"],
		},
		forced: true,
		filter(event, player, name) {
			if (!event.source) {
				return false;
			}
			var range = event.source.getAttackRange();
			if (name == "damageBegin3") {
				return range > 3;
			}
			return event.num > 1 && range < 3;
		},
		content() {
			trigger.num = event.triggername == "damageBegin4" ? 1 : trigger.num + 1;
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

// ========== sunquan 孙权 ==========
	// 制衡：出牌阶段限一次，你可以弃置至多X张牌（X为你的体力上限），然后摸等量的牌。若你以此法弃置了所有手牌，则你额外摸一张牌。 参考gz_zhiheng
	zhiheng: {
		audio: "zhiheng",
		enable: "phaseUse",
		usable: 1,
		position: "he",
		filterCard: lib.filter.cardDiscardable,
		discard: false,
		lose: false,
		selectCard() {
			return [1, get.player().maxHp];
		},
		check(card) {
			return 6 - get.value(card);
		},
		prompt: "出牌阶段限一次，你可以弃置至多X张牌（X为你的体力上限），然后摸等量的牌。若你以此法弃置了所有手牌，则你额外摸一张牌。",
		async content(event, trigger, player) {
			const { cards } = event;
			let num = 1;
			const hs = player.getCards("h");
			if (!hs.length) {
				num = 0;
			}
			for (let i = 0; i < hs.length; i++) {
				if (!cards.includes(hs[i])) {
					num = 0;
					break;
				}
			}
			await player.discard(cards);
			await player.draw(num + cards.length);
		},
		ai: {
			threaten: 1,
		},
	},

	// 嘉禾：锁定技，你与其他同势力角色间可以合纵；与你势力相同的角色的【桃】和【五谷丰登】视为带有合纵标记。 参考skill_old.js
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
			if (!sameGroup(target, player)) {
				await player.draw(cards.length);
			}
		},
		ai: {
			order: 4,
			result: {
				target(player, target) {
					return sameGroup(target, player) ? 1 : get.attitude(player, target) > 0 ? 1 : -1;
				},
			},
		},
	},

// ========== luxun 陆逊 ==========
	// 谦逊：锁定技，当你成为【顺手牵羊】或【乐不思蜀】的目标时，取消之。 参考gz_qianxun
	qianxun: {
		audio: "qianxun",
		trigger: {
			target: "useCardToTarget",
			player: "addJudgeBefore",
		},
		forced: true,
		preHidden: true,
		priority: 15,
		check(event, player) {
			return event.name == "addJudge" || get.effect(event.target, event.card, event.player, player) < 0;
		},
		filter(event, player) {
			return event.card.name == (event.name == "addJudge" ? "lebu" : "shunshou");
		},
		async content(event, trigger, player) {
			if (trigger.name == "addJudge") {
				trigger.cancel(undefined, undefined, undefined);
				const owner = get.owner(trigger.card);
				if (owner && owner.getCards("hej").includes(trigger.card)) {
					owner.lose(trigger.card, ui.discardPile);
				} else {
					game.cardsDiscard(trigger.card);
				}
				game.log(trigger.card, "进入了弃牌堆");
			} else {
				trigger.getParent()?.targets?.remove(player);
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (card.name == "shunshou" || card.name == "lebu") {
						return "zeroplayertarget";
					}
				},
			},
		},
	},

	// 度势：出牌阶段，你可以将一张红色手牌当【以逸待劳】使用。当你因【以逸待劳】的效果失去最后的手牌时，摸一张牌，失去“度势”，获得“连营”。 参考gz_duoshi
	lxdushi: {
		audio: "duoshi",
		enable: "phaseUse",
		position: "hs",
		filterCard(card, player) {
			return get.color(card, player) === "red";
		},
		viewAs: { name: "yiyi" },
		check(card) {
			return 5 - get.value(card);
		},
		prompt: "将一张红色手牌当【以逸待劳】使用",
		onuse(event, player) {
			player.addTempSkill("lxdushi_effect");
		},
		ai: {
			threaten: 1.2,
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { player: ["loseAfter", "loseAsyncAfter"] },
				filter(event, player) {
					// 原来写死event.getParent(2)假设"lxdushi"这个skill标记正好在往上数第2层事件上，
					// 但viewAs技能实际使用以逸待劳时，"lose"事件到顶层带skill标记的useCard事件之间
					// 具体隔几层(chooseToDiscard/choose/discard等中间事件)并不固定，写死层数导致这个
					// filter一直找不到、永远是false。改成不限层数地往上找，只要祖先链上有任意一层
					// 事件的skill是"lxdushi"就算数。
					let evt = event,
						found = false;
					for (let i = 0; i < 8 && evt; i++) {
						evt = evt.getParent?.();
						if (evt && evt.skill === "lxdushi") {
							found = true;
							break;
						}
					}
					if (!found) {
						return false;
					}
					if (player.countCards("h")) {
						return false;
					}
					const evt2 = event.getl(player);
					return evt2 && evt2.player === player && evt2.hs && evt2.hs.length > 0;
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					await player.draw();
					player.removeSkill("lxdushi");
					player.addSkill("lianying");
				},
			},
		},
	},
	lianying: {
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

// ========== ganning 甘宁 ==========
	// 奇袭：你可以将一张黑色牌当【过河拆桥】使用。当你于回合外弃置其他角色的牌后，你可以使用其中一张基本牌或装备牌。 参考qixi(standard)
	qixi: {
		audio: 2,
		enable: "chooseToUse",
		filterCard(card) {
			return get.color(card) === "black";
		},
		position: "hes",
		viewAs: { name: "guohe" },
		viewAsFilter(player) {
			if (!player.hasCards("hes", { color: "black" })) {
				return false;
			}
		},
		prompt: "将一张黑色牌当过河拆桥使用",
		check(card) {
			return 4 - get.value(card);
		},
		subSkill: {
			effect: {
				audio: "qixi",
				trigger: { global: ["loseAfter", "loseAsyncAfter"] },
				filter(event, player) {
					if (player.isPhaseUsing()) {
						return false;
					}
					const evt = event.getl(player);
					if (!evt || evt.player === player || !evt.hs || !evt.hs.length) {
						return false;
					}
					if (get.event("source") !== player) {
						return false;
					}
					return evt.hs.some(card => ["basic", "equip"].includes(get.type(card)));
				},
				logTarget(event, player) {
					return event.getl(player).player;
				},
				async cost(event, trigger, player) {
					event.result = await player.chooseBool(get.prompt("qixi"), "是否使用其中一张基本牌或装备牌？").forResult();
				},
				async content(event, trigger, player) {
					const evt = trigger.getl(player);
					const cards = evt.hs.filter(card => ["basic", "equip"].includes(get.type(card)));
					const result = await player.chooseCard(cards, "选择一张牌使用", true).forResult();
					if (result.bool && result.cards && result.cards.length) {
						await player.useCard(result.cards[0], false, "nowuxie");
					}
				},
			},
		},
	},

	// 奋威：每轮限一次，当一张锦囊牌指定不少于两个目标后，你可令此牌对其中任意名目标角色无效。然后你可以发动一次“奇袭”。 参考jdfenwei
	fenwei: {
		audio: "sbfenwei",
		trigger: { global: "useCardToPlayered" },
		filter(event, player) {
			if (player.hasSkill("fenwei_round")) {
				return false;
			}
			if (!event.isFirstTarget || get.type(event.card) !== "trick") {
				return false;
			}
			return event.targets.length >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), `令${get.translation(trigger.card)}对任意名角色无效`, [1, trigger.targets.length], (card, player, target) => get.event().targets.includes(target))
				.set("ai", target => {
					const player = get.player();
					const trigger = get.event().getTrigger();
					return -get.effect(target, trigger.card, trigger.player, player);
				})
				.set("targets", trigger.targets)
				.forResult();
		},
		skillAnimation: true,
		animationColor: "wood",
		async content(event, trigger, player) {
			player.addTempSkill("fenwei_round", "roundStart");
			trigger.getParent().excluded.addArray(event.targets);
			if (player.countCards("hes", { color: "black" })) {
				const result = await player
					.chooseCard("hes", true, card => get.color(card) === "black")
					.set("prompt", "奇袭：将一张黑色牌当【过河拆桥】使用")
					.forResult();
				if (result.bool && result.cards && result.cards.length) {
					const vcard = get.autoViewAs({ name: "guohe" }, result.cards);
					await player.chooseUseTarget(vcard, false).forResult();
				}
			}
		},
		ai: { expose: 0.2, threaten: 1.4 },
	},

// ========== lvmeng 吕蒙 ==========
	// 克己：锁定技，弃牌阶段开始时，若你未于出牌阶段内使用过颜色不同的牌，则你于本回合内的手牌上限+4。 参考gz_keji
	keji: {
		skillAnimation: true,
		animationColor: "wood",
		audio: "keji",
		forced: true,
		trigger: {
			player: "phaseDiscardBegin",
		},
		filter(event, player) {
			const list = [];
			player.getHistory("useCard", function (evt) {
				if (evt.isPhaseUsing(player)) {
					const color = get.color(evt.card);
					if (color != "nocolor") {
						list.add(color);
					}
				}
				return true;
			});
			return list.length <= 1;
		},
		check(event, player) {
			return player.needsToDiscard();
		},
		async content(event, trigger, player) {
			player.addTempSkill("keji_add", "phaseAfter");
		},
		subSkill: {
			add: {
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						return num + 4;
					},
				},
			},
		},
	},

	// 夺荆：一名其他角色的出牌阶段开始时，若其体力值不小于你，你令其结束当前阶段，其回合结束后，你执行一个只有出牌阶段的回合，此回合开始时，你失去"克己"，并获得"涉猎"和"攻心"。 参考skill_old.js
	duojing: {
		aiShowTag: "control",
		audio: 2,
		trigger: { global: "phaseUseBefore" },
		filter(event, player) {
			return event.player != player && event.player.hp >= player.hp;
		},
		check(event, player) {
			var aliveRatio = game.players.length / Math.max(1, game.players.length + game.dead.length);
			return _status._aozhan || aliveRatio <= 0.5;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt("duojing"), "夺荆：是否令" + get.translation(trigger.player) + "跳过出牌阶段？").forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.storage.duojing_target = trigger.player;
			player.addTempSkill("duojing_after", { global: [] });
		},
		ai: {
			order: 9,
			result: { player: 1 },
			threaten: 1.4,
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
					player.insertPhase(null, true).set("phaseList", ["phaseUse"]);
					player.removeSkill("duojing");
					player.removeSkill("keji");
					player.addSkill("shelie");
					player.addSkill("gongxin");
				},
			},
		},
	},
	// 涉猎：摸牌阶段可改为亮出牌堆顶五张牌，获得其中每种不同花色的牌各一张，其余置入弃牌堆。（获得自"夺荆"） 参考gz_shelie(guozhan)。translate.js里一直有这两条技能的文本，但代码从未真正写过，导致夺荆之后addSkill("shelie"/"gongxin")形同虚设，这次补上
	shelie: {
		aiShowTag: "support",
		audio: "shelie",
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.changeToZero();
			const cards = get.cards(5);
			await game.cardsGotoOrdering(cards);
			const videoId = lib.status.videoId++;
			game.broadcastAll(
				function (player, id, cards) {
					let str;
					if (player == game.me && !_status.auto) {
						str = "涉猎：获取花色各不相同的牌";
					} else {
						str = "涉猎";
					}
					const dialog = ui.create.dialog(str, cards);
					dialog.videoId = id;
				},
				player,
				videoId,
				cards
			);
			let time = get.utc();
			game.addVideo("showCards", player, ["涉猎", get.cardsInfo(cards)]);
			game.addVideo("delay", null, 2);
			const list = [];
			for (const card of cards) {
				list.add(get.suit(card, false));
			}
			const next = player.chooseButton(list.length, true);
			next.set("dialog", event.videoId);
			next.set("filterButton", function (button) {
				for (let i = 0; i < ui.selected.buttons.length; i++) {
					if (get.suit(ui.selected.buttons[i].link) == get.suit(button.link)) {
						return false;
					}
				}
				return true;
			});
			next.set("ai", function (button) {
				return get.value(button.link, _status.event.player);
			});
			const result = await next.forResult();
			if (!result.bool || !result.links?.length) {
				return;
			}
			time = 1000 - (get.utc() - time);
			if (time > 0) {
				await game.delay(0, time);
			}
			game.broadcastAll("closeDialog", videoId);
			await player.gain(result.links, "log", "gain2");
		},
		ai: {
			threaten: 1.2,
		},
	},
	// 攻心：出牌阶段限一次，观看一名其他角色的手牌，展示其中一张红桃牌，然后置于牌堆顶或弃置。（获得自"夺荆"） 参考gz_gongxin(guozhan)
	gongxin: {
		aiShowTag: "offense",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countCards("h");
		},
		async content(event, trigger, player) {
			const target = event.target,
				cards = target.getCards("h"),
				next = player.chooseToMove_new("攻心");
			next.set("list", [
				[get.translation(target) + "的手牌", cards],
				[["弃置"], ["置于牌堆顶"]],
			]);
			next.set("filterOk", moved => {
				return moved[1].slice().concat(moved[2]).filter(card => get.suit(card) == "heart").length == 1;
			});
			next.set("filterMove", (from, to, moved) => {
				if (moved[0].includes(from.link) && moved[1].length + moved[2].length >= 1 && [1, 2].includes(to)) {
					return false;
				}
				return get.suit(from) == "heart";
			});
			next.set("processAI", list => {
				let card = list[0][1]
					.slice()
					.filter(card => get.suit(card) == "heart")
					.sort((a, b) => get.value(b) - get.value(a))[0];
				if (!card) {
					return false;
				}
				return [list[0][1].slice().remove(card), [card], []];
			});
			const result = await next.forResult();
			if (result.bool) {
				if (result.moved[1].length) {
					await target.discard(result.moved[1]);
				} else {
					await player.showCards(result.moved[2], get.translation(player) + "对" + get.translation(target) + "发动了【攻心】");
					await target.lose(result.moved[2], ui.cardPile, "visible", "insert");
				}
			}
		},
		ai: {
			threaten: 1.5,
			result: {
				target(player, target) {
					return -target.countCards("h");
				},
			},
		},
	},

// ========== huanggai 黄盖 ==========
	// 苦肉：出牌阶段限一次，你可以弃置一张牌，然后摸一张牌，并失去1点体力。 参考kurou
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

	// 诈降：锁定技，当你失去1点体力后，你摸两张牌，然后若此时为你的出牌阶段内，则本回合你使用【杀】的次数上限+1、使用红色【杀】无距离限制。 参考hgzhaxiang
	zhaxiang: {
		audio: 2,
		locked: true,
		trigger: { player: "loseHpAfter" },
		forced: true,
		async content(event, trigger, player) {
			await player.draw(2);
			if (trigger.getParent("phaseUse")) {
				player.addTempSkill("zhaxiang_buff", "phaseUseAfter");
			}
		},
		ai: {
			threaten: 1.6,
		},
	},
	zhaxiang_buff: {
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

// ========== zhouyu 周瑜 ==========
	// 英姿：锁定技，摸牌阶段，你多摸一张牌；你的手牌上限等于你的体力上限。 参考yingzi
	yingzi: {
		skillAnimation: true,
		animationColor: "wood",
		audio: "reyingzi_sunce",
		locked: true,
		trigger: { player: "phaseDrawBegin2" },
		forced: true,
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
		mod: {
			maxHandcardBase(player, num) {
				return player.maxHp;
			},
		},
		ai: {
			threaten: 1.3,
		},
	},

	// 反间：出牌阶段限一次，你可以展示一张手牌并交给一名其他角色，然后其横置，并选择一项：1.展示所有手牌，然后弃置与此牌花色相同的所有牌；2.失去1点体力。 参考fanjian
	fanjian: {
		aiShowTag: "offense",
		audio: 2,
		skillAnimation: true,
		animationColor: "wood",
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

	// 焰洄：当你使用牌指定目标后，你可以展示一名目标角色的一张手牌，若此牌本回合已被展示过，你弃置之；本阶段结束时，你选择一项：1.对一名本阶段因此失去过牌的角色造成1点火焰伤害；2.摸X张牌（X为本回合展示过牌的角色数）。 参考bingshi包potyanhui(skill_old.js早期备注称"未找到实现"，实际_merged_skill_all.md已有完整代码，"是否已展示过"按其用game.getGlobalHistory查本回合showCards历史判断，而非只记自己展示过的牌)
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
			if (!player.storage.yanhui_targets) {
				player.storage.yanhui_targets = [];
			}
			if (!player.storage.yanhui_targets.includes(target)) {
				player.storage.yanhui_targets.push(target);
			}
			const shownBefore = game
				.getGlobalHistory("everything", evt => evt.name == "showCards" && evt.cards && evt.cards.length)
				.map(evt => evt.cards)
				.flat();
			await target.showCards([card], get.translation(player) + "发动了〖焰洄〗");
			if (shownBefore.includes(card)) {
				await target.discard(card);
				if (!player.storage.yanhui_lost) {
					player.storage.yanhui_lost = [];
				}
				if (!player.storage.yanhui_lost.includes(target)) {
					player.storage.yanhui_lost.push(target);
				}
			}
			player.addTempSkill("yanhui_end", "phaseUseAfter");
		},
		group: "yanhui_end",
		subSkill: {
			end: {
				charlotte: true,
				trigger: { player: "phaseUseAfter" },
				filter(event, player) {
					return player.storage.yanhui_targets && player.storage.yanhui_targets.length > 0;
				},
				async cost(event, trigger, player) {
					const lost = player.storage.yanhui_lost || [];
					const choices = ["draw"];
					if (lost.length) {
						choices.unshift("burn");
					}
					const result = await player
						.chooseControl(choices)
						.set("prompt", get.prompt("yanhui"))
						.set("choiceList", [lost.length ? "对一名因〖焰洄〗失去过牌的角色造成1点火焰伤害" : null, "摸" + (player.storage.yanhui_targets || []).length + "张牌"].filter(Boolean))
						.forResult();
					event.result = { bool: true, cost_data: result.control };
				},
				async content(event, trigger, player) {
					const lost = player.storage.yanhui_lost || [];
					const targets = player.storage.yanhui_targets || [];
					if (event.cost_data == "burn" && lost.length) {
						const result = await player.chooseTarget(true, (card, player, target) => lost.includes(target)).forResult();
						if (result.bool && result.targets && result.targets.length) {
							await result.targets[0].damage(1, player, "fire");
						}
					} else if (targets.length) {
						await player.draw(targets.length);
					}
					delete player.storage.yanhui_targets;
					delete player.storage.yanhui_lost;
				},
			},
		},
	},

// ========== daqiao 大乔 ==========
	// 国色：你可以将一张♦牌当【乐不思蜀】使用。每回合限一次，你可以将场上的一张【乐不思蜀】移动至另一名角色的判定区。 参考guose(standard)
	guose: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		filter(event, player) {
			return player.hasCards("hes", { suit: "diamond" });
		},
		enable: "chooseToUse",
		filterCard(card) {
			return get.suit(card) === "diamond";
		},
		position: "hes",
		viewAs: { name: "lebu" },
		prompt: "将一张方片牌当乐不思蜀使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: {
			threaten: 1.5,
		},
	},

	// 国色（移动乐不思蜀部分）： 参考skill_old.js
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

	// 流离：当你成为【杀】的目标时，你可以弃置一张牌并将此【杀】转移给你攻击范围内的一名其他角色（不能是此【杀】的使用者）。 参考liuli(standard)
	liuli: {
		audio: 2,
		audioname: ["re_daqiao", "daxiaoqiao"],
		trigger: { target: "useCardToTarget" },
		preHidden: true,
		filter(event, player) {
			if (event.card.name !== "sha") {
				return false;
			}
			if (!player.hasCards("he")) {
				return false;
			}
			return game.hasPlayer(current => {
				return player.inRange(current) && current !== event.player && current !== player && !!lib.filter.targetEnabled(event.card, event.player, current);
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					filterTarget(card, player, target) {
						const trigger = _status.event;
						if (player.inRange(target) && target != trigger.source) {
							if (lib.filter.targetEnabled(trigger.card, trigger.source, target)) {
								return true;
							}
						}
						return false;
					},
					filterCard: lib.filter.cardDiscardable,
					position: "he",
					ai1: card => get.unuseful(card) + 9,
					ai2: target => {
						const player = get.player();
						if (player.hasCards("h", "shan")) {
							return -get.attitude(player, target);
						}
						if (get.attitude(player, target) < 5) {
							return 6 - get.attitude(player, target);
						}
						if (player.hp == 1 && !player.hasCards("h", "shan")) {
							return 10 - get.attitude(player, target);
						}
						if (player.hp == 2 && !player.hasCards("h", "shan")) {
							return 8 - get.attitude(player, target);
						}
						return -1;
					},
					prompt: get.prompt(event.skill),
					prompt2: "弃置一张牌，将此【杀】转移给攻击范围内的一名其他角色",
					source: trigger.player,
					card: trigger.card,
				})
				.setHiddenSkill(event.name.slice(0, -5))
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
			} else {
				throw new ReferenceError("找不到触发【流离】的使用牌事件");
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

// ========== sunshangxiang 孙尚香 ==========
	// 枭姬：当你失去装备区里的牌后，你可以摸两张牌。 参考xiaoji
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

	// 结姻：出牌阶段限一次，你可以选择一名男性角色并弃置一张手牌或将一张装备牌置入其装备区。然后你与其体力值较高的角色摸一张牌，体力值较低的角色回复1点体力。 参考jieyin
	jieyin: {
		aiShowTag: "draw",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		selectCard: 1,
		position: "he",
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
			threaten: 2,
		},
	},

// ========== sunjian 孙坚 ==========
	// 英魂：准备阶段，你可以选择一名其他角色并选择一项：1.令其摸X张牌，然后弃置一张牌；2.令其摸一张牌，然后弃置X张牌。（X为你已损失的体力值） 参考gzyinghun
	yinghun: {
		skillAnimation: true,
		animationColor: "wood",
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
			threaten(player, target) {
				return Math.max(0.5, target.getDamagedHp() / 2);
			},
		},
	},

	// 毅魄：限定技，当你的体力值变为1时，你可以发动一次“英魂”。 参考yipo
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
			const targetResult = await player.chooseTarget(get.prompt2("yinghun"), (card, player, target) => player != target).forResult();
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

// ========== sunce 孙策 ==========
	// 激昂：当你使用【决斗】或红色【杀】指定目标后，或成为【决斗】或红色【杀】的目标后，你可以摸一张牌。当你拼点的牌亮出后，你可以令此牌的点数+3或-3。 参考jiang(standard)
	scjiang: {
		audio: 2,
		preHidden: true,
		audioname: ["sp_lvmeng", "re_sunben", "re_sunce"],
		mod: {
			aiOrder(player, card, num) {
				if (get.color(card) === "red" && get.name(card) === "sha") {
					return get.order({ name: "sha" }) + 0.15;
				}
			},
		},
		trigger: {
			player: "useCardToPlayered",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (!(event.card.name == "juedou" || (event.card.name == "sha" && get.color(event.card) == "red"))) {
				return false;
			}
			return player == event.target || event.getParent().triggeredTargets3.length == 1;
		},
		locked: false,
		frequent: true,
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
			threaten: 1.5,
		},
	},

	// 激昂（拼点点数+3/-3 部分）：当你拼点的牌亮出后，你可以令此牌的点数+3或-3。 参考yingyang(guozhan gz_sunce)
	scjiang_pd: {
		audio: 2,
		trigger: {
			player: "compare",
			target: "compare",
		},
		filter(event) {
			return !event.iwhile;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			const next = player.chooseControl("点数+3", "点数-3", "cancel2");

			next.set("prompt", get.prompt2("scjiang_pd"));
			next.set("ai", check);
			next.set("small", Reflect.get(trigger, "small"));

			const result = await next.forResult();
			event.result = {
				bool: result.index != 2,
				cost_data: {
					index: result.index,
				},
			};

			return;

			function check() {
				const event = get.event();
				const small = Reflect.get(event, "small");

				return small ? 1 : 0;
			}
		},
		async content(event, trigger, player) {
			/** @type {number} */
			const index = event.cost_data?.index;

			if (index == 0) {
				game.log(player, "拼点牌点数+3");
				if (player == trigger.player) {
					trigger.num1 += 3;
					if (trigger.num1 > 13) {
						trigger.num1 = 13;
					}
				} else {
					trigger.num2 += 3;
					if (trigger.num2 > 13) {
						trigger.num2 = 13;
					}
				}
			} else {
				game.log(player, "拼点牌点数-3");
				if (player == trigger.player) {
					trigger.num1 -= 3;
					if (trigger.num1 < 1) {
						trigger.num1 = 1;
					}
				} else {
					trigger.num2 -= 3;
					if (trigger.num2 < 1) {
						trigger.num2 = 1;
					}
				}
			}
		},
	},

	// 鹰扬：准备阶段，你可以与一名其他角色拼点。赢的角色视为对没赢的角色使用一张【决斗】。若你因此【决斗】受到伤害，你失去此技能并获得"魂殇"。 参考skill_old.js
	scyingyang: {
		skillAnimation: true,
		animationColor: "wood",
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
				player.addSkills(["schunshang"]);
			}
		},
	},
	// 魂殇：锁定技，准备阶段，若你已损失体力值不小于2，你本回合内视为拥有“英姿”和“英魂”。 参考skill_old.js
	schunshang: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return player.getDamagedHp() >= 2;
		},
		async content(event, trigger, player) {
			await player.addTempSkills(["yingzi", "yinghun"], "phaseAfter");
		},
	},

// ========== xiaoqiao 小乔 ==========
	// 天香：当你受到伤害时，你可以弃置一张♥手牌并选择一名其他角色，然后防止此次伤害并选择一项：1.令来源对其造成1点伤害，然后其摸X张牌（X为其已损失体力值且至多为5）；2.令其失去1点体力，然后其获得你弃置的牌。每项于一个回合内各限一次。 参考retianxiang
	tianxiang: {
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
			const canOpt1 = source && source.isIn() && !player.hasSkill("tianxiang_mark1");
			const canOpt2 = !player.hasSkill("tianxiang_mark2");
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
				player.addTempSkill("tianxiang_mark1", "phaseAfter");
				if (source.isIn() && target.isIn()) {
					await target.damage(1, source);
					if (target.isIn()) {
						const num = Math.min(5, target.getDamagedHp());
						if (num > 0) {
							await target.draw(num);
						}
					}
				}
			} else {
				player.addTempSkill("tianxiang_mark2", "phaseAfter");
				if (target.isIn()) {
					await target.loseHp();
					if (target.isIn()) {
						await target.gain(event.cards);
					}
				}
			}
		},
		ai: {
			threaten: 0.7,
		},
	},
	tianxiang_mark1: {
		charlotte: true,
	},
	tianxiang_mark2: {
		charlotte: true,
	},

	// 红颜：锁定技，你的♠牌和你的♠判定牌视为♥牌。若你的装备区有♥牌，则你的手牌上限+1。 参考hongyan
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

// ========== taishici 太史慈 ==========
	// 天义：出牌阶段限一次，你可以与一名角色拼点：若你赢，在本回合结束之前，你可以多使用一张【杀】、使用【杀】无距离限制且可以多选择一个目标；若你没赢，本回合你不能使用【杀】。 参考tianyi(shenhua)
	tianyi: {
		audio: 2,
		audioname: ["re_taishici"],
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
		charlotte: true,
	},
	tianyi3: {
		mod: {
			cardEnabled(card) {
				if (card.name == "sha") {
					return false;
				}
			},
		},
		charlotte: true,
	},

	// 酣战：当你参与的拼点结束后，你可以使用其中一张拼点牌，此牌不计入使用次数。 参考skill_old.js
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

// ========== zhoutai 周泰 ==========
	// 不屈：锁定技，当你处于濒死状态时，你将牌堆顶的一张牌置于你的武将牌上，称为“创”，若此牌的点数与已有的“创”点数均不同，则你将体力回复至1点，若出现相同点数则将此牌置入弃牌堆。若你的武将牌上有“创”，则你可以令你的手牌上限与“创”的数量相等。 参考buqu(shenhua，非guozhan版本；guozhan版gzbuqu机制不符，改用此版本并去掉其mod里的非guozhan限制)
	buqu: {
		audio: 2,
		audioname: ["key_yuri"],
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
			maxHandcard(player, num) {
				const cards = player.getExpansions("buqu");
				if (cards.length) {
					return cards.length;
				}
			},
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		ai: {
			save: true,
			mingzhi: true,
			skillTagFilter(player, tag, target) {
				if (player != target) {
					return false;
				}
			},
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage") || get.tag(card, "loseHp")) {
						let num = target.getExpansions("buqu").length || target.getHp();
						return (num + 1) / 5;
					}
				},
			},
		},
	},

	// 奋激：一名角色的结束阶段，若其没有手牌，你可以令其摸两张牌，然后你失去1点体力。 参考new_fenji(shenhua)
	fenji: {
		audio: "fenji",
		trigger: { global: "phaseAfter" },
		filter(event, player) {
			if (event.player.countCards("h") == 0 && event.player.isIn()) {
				return true;
			}
			return false;
		},
		preHidden: true,
		check(event, player) {
			if (get.attitude(get.event().player, event.player) <= 0) {
				return false;
			}
			return 2 * get.effect(event.player, { name: "draw" }, player, get.event().player) + get.effect(player, { name: "losehp" }, player, get.event().player) > 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			player.line(trigger.player, "green");
			await trigger.player.draw(2);
			await player.loseHp();
		},
	},

// ========== lusu 鲁肃 ==========
	// 好施：摸牌阶段，你可以多摸两张牌，然后若你的手牌数大于5，你将半数手牌（向下取整）交给手牌最少的一名其他角色。 参考haoshi(shenhua)
	haoshi: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed;
		},
		preHidden: true,
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
		async content(event, trigger, player) {
			trigger.num += 2;
			player.addSkill("haoshi2");
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
					ai2(target) {
						return get.attitude(_status.event.player, target);
					},
				})
				.forResult();
			if (result.targets && result.targets[0]) {
				await player.give(result.cards, result.targets[0]);
			}
		},
	},

	// 缔盟：出牌阶段限一次，你可以令两名其他角色交换手牌（这两名角色手牌数差须小于等于你的牌数）。若如此做，此阶段结束时，你弃置X张牌（X为这两名角色手牌数差）。 参考oldimeng(refresh)
	dimeng: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.dimeng.filterTarget(null, player, current));
		},
		selectTarget: 2,
		complexTarget: true,
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			var ps = player.countCards("he");
			if (!ui.selected.targets.length) {
				var hs = target.countCards("h");
				return game.hasPlayer(function (current) {
					if (current == player || current == target) {
						return false;
					}
					var cs = current.countCards("h");
					return (hs > 0 || cs > 0) && Math.abs(hs - cs) <= ps;
				});
			}
			var current = ui.selected.targets[0],
				hs = target.countCards("h"),
				cs = current.countCards("h");
			return (hs > 0 || cs > 0) && Math.abs(hs - cs) <= ps;
		},
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			const { targets } = event;
			await targets[0].swapHandcards(targets[1]);
			player.addTempSkill("dimeng_discard", "phaseUseAfter");
			player.markAuto("dimeng_discard", [targets]);
		},
		ai: {
			threaten: 4.5,
			pretao: true,
			nokeep: true,
			order: 6,
			expose: 0.2,
			result: {
				target(player, target) {
					if (!ui.selected.targets.length) {
						return -Math.sqrt(target.countCards("h"));
					}
					var h1 = ui.selected.targets[0].getCards("h"),
						h2 = target.getCards("h");
					if (h2.length > h1.length) {
						return 0;
					}
					var delval = get.value(h2, target) - get.value(h1, ui.selected.targets[0]);
					if (delval >= 0) {
						return 0;
					}
					return -delval * (h1.length - h2.length);
				},
			},
		},
		subSkill: {
			discard: {
				audio: "dimeng",
				trigger: { player: "phaseUseEnd" },
				forced: true,
				charlotte: true,
				onremove: true,
				filter(event, player) {
					return player.countCards("he") > 0;
				},
				async content(event, trigger, player) {
					for (let targets of player.getStorage("dimeng_discard")) {
						if (targets.length < 2) {
							continue;
						}
						const num = Math.abs(targets[0].countCards("h") - targets[1].countCards("h"));
						if (num > 0 && player.countCards("he") > 0) {
							await player.chooseToDiscard("he", true, num);
						}
					}
				},
			},
		},
	},

// ========== zhangzhang 张昭&张纮 ==========
	// 直谏：出牌阶段，你可以将手牌中的一张装备牌置于其他角色的装备区里，然后摸一张牌（可以替换原装备）。 参考olzhijian(refresh)
	zhijian: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("he", { type: "equip" }) > 0;
		},
		filterCard(card) {
			return get.type(card) == "equip";
		},
		position: "he",
		check(card) {
			var player = _status.currentPhase;
			if (player.countCards("he", { subtype: get.subtype(card) }) > 1) {
				return 11 - get.equipValue(card);
			}
			return 6 - get.value(card);
		},
		filterTarget(card, player, target) {
			if (target.isMin()) {
				return false;
			}
			return player != target && target.canEquip(card, true);
		},
		async content(event, trigger, player) {
			await event.target.equip(event.cards[0]);
			await player.draw();
		},
		discard: false,
		lose: false,
		prepare(cards, player, targets) {
			player.$give(cards, targets[0], false);
		},
		ai: {
			basic: {
				order: 10,
			},
			result: {
				target(player, target) {
					var card = ui.selected.cards[0];
					if (card) {
						return get.effect(target, card, target, target);
					}
					return 0;
				},
			},
			threaten: 1.35,
		},
	},

	// 固政：每回合限一次，当一名角色一次性弃置至少两张牌后，你可以令其获得其中一张弃置的牌。若其不是你，你获得其余弃置的牌。 参考olguzheng(refresh)
	guzheng: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		trigger: {
			global: ["loseAfter", "loseAsyncAfter"],
		},
		filter(event, player) {
			if (event.type != "discard") {
				return false;
			}
			if (player.hasSkill("guzheng_used")) {
				return false;
			}
			var phaseName;
			for (var name of lib.phaseName) {
				var evt = event.getParent(name);
				if (!evt || evt.name != name) {
					continue;
				}
				phaseName = name;
				break;
			}
			if (!phaseName) {
				return false;
			}
			return game.hasPlayer(current => {
				var evt = event.getl(current);
				if (!evt || !evt.cards2 || evt.cards2.filterInD("d").length < 2) {
					return false;
				}
				return true;
			});
		},
		checkx(event, player, cards) {
			if (cards.length > 2 || get.attitude(player, event.player) > 0) {
				return true;
			}
			for (var i = 0; i < cards.length; i++) {
				if (get.value(cards[i], event.player, "raw") < 0) {
					return true;
				}
			}
			return false;
		},
		direct: true,
		preHidden: true,
		async content(event, trigger, player) {
			const targets = [],
				cardsList = [],
				players = game.filterPlayer().sortBySeat(_status.currentPhase);
			for (const current of players) {
				const cards = [];
				const evt = trigger.getl(current);
				if (!evt || !evt.cards2) {
					continue;
				}
				const cardsx = evt.cards2.filterInD("d");
				cards.addArray(cardsx);
				if (cards.length) {
					targets.push(current);
					cardsList.push(cards);
				}
			}
			while (targets.length) {
				const target = targets.shift();
				const cards = cardsList.shift();
				const result = await player
					.chooseCardButton(get.prompt("guzheng", target), cards)
					.set("check", lib.skill.guzheng.checkx(trigger, player, cards))
					.set("ai", function (button) {
						if (_status.event.check) {
							return 20 - get.value(button.link, _status.event.getTrigger().player);
						}
						return 0;
					})
					.setHiddenSkill("guzheng")
					.forResult();
				if (result?.bool && result.links?.length) {
					player.logSkill("guzheng", target);
					player.addTempSkill("guzheng_used", ["phaseZhunbeiAfter", "phaseDrawAfter", "phaseJudgeAfter", "phaseUseAfter", "phaseDiscardAfter", "phaseJieshuAfter"]);
					const card = result.links[0];
					await target.gain(card, "gain2");
					if (target != player) {
						const rest = cards.remove(card).filterInD("d");
						if (rest.length > 0) {
							await player.gain(rest, "gain2");
						}
					}
					break;
				}
			}
		},
		ai: {
			threaten: 1.3,
			expose: 0.2,
		},
		subSkill: {
			used: {
				charlotte: true,
			},
		},
	},

// ========== jiangqing 蒋钦 ==========
	// 尚义：出牌阶段每名角色限一次，你可以令一名其他角色观看你的手牌，然后你选择一项：1.观看其手牌并可以弃置其中的一张黑色牌；2.观看其所有暗置的武将牌，你可以明置其中一张然后令此技能本回合失效。 参考gz_shangyi(guozhan，候选中带gz前缀直接选用；按描述补充“每名角色限一次”与“明置武将牌并本回合失效”的部分)
	shangyi: {
		audio: "shangyi",
		enable: "phaseUse",
		init(player) {
			player.storage.shangyi_used = [];
		},
		group: "shangyi_reset",
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(target => lib.skill.shangyi.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			if ((player.storage.shangyi_used || []).includes(target.playerid)) {
				return false;
			}
			return target.countCards("h") > 0 || target.isUnseen(2);
		},
		async content(event, trigger, player) {
			const target = event.target;
			if (!player.storage.shangyi_used) {
				player.storage.shangyi_used = [];
			}
			player.storage.shangyi_used.push(target.playerid);

			await target.viewHandcards(player);

			let result;
			if (!target.countCards("h")) {
				result = { index: 1 };
			} else if (!target.isUnseen(2)) {
				result = { index: 0 };
			} else {
				result = await player
					.chooseControl()
					.set("choiceList", [`观看${get.translation(target)}的手牌并可以弃置其中的一张黑色牌`, `观看${get.translation(target)}的所有暗置的武将牌`])
					.forResult();
			}

			if (result.index == 0) {
				await player
					.discardPlayerCard(target, "h")
					.set("filterButton", function (button) {
						return get.color(button.link) == "black";
					})
					.set("visible", true);
			} else {
				await player.viewCharacter(target, 2);
				if (target.isUnseen(2)) {
					const { bool, index } = await player
						.chooseControl("明置第一张", "明置第二张", "cancel2")
						.set("prompt", get.prompt("shangyi"))
						.set("prompt2", "你可以明置其一张暗置的武将牌，然后令〖尚义〗本回合失效")
						.forResult();
					if (index != 2) {
						await target.showCharacter(index);
						player.addTempSkill("shangyi_disabled", "phaseUseAfter");
					}
				}
			}
		},
		subSkill: {
			reset: {
				trigger: { player: "phaseZhunbeiBegin" },
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.storage.shangyi_used = [];
				},
			},
			disabled: {
				charlotte: true,
				mod: {
					skillEnable(name) {
						if (name == "shangyi") {
							return false;
						}
					},
				},
			},
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

	// 鸟翔：锁定技，当你使用【杀】指定其他角色为目标后，若你在其攻击范围内，其需使用两张【闪】才能抵消。 参考dcniaoxiang(xianding)
	niaoxiang: {
		audio: "zniaoxiang",
		trigger: { player: "useCardToPlayered" },
		forced: true,
		filter(event, player) {
			if (!event.target.inRange(player)) {
				return false;
			}
			return event.card.name === "sha" && !event.getParent().directHit.includes(event.target);
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const id = trigger.target.playerid;
			const map = trigger.getParent().customArgs;
			if (!map[id]) {
				map[id] = {};
			}
			if (typeof map[id].shanRequired === "number") {
				map[id].shanRequired++;
			} else {
				map[id].shanRequired = 2;
			}
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (!arg.target.inRange(player)) {
					return false;
				}
				if (arg.card.name !== "sha" || arg.target.countCards("h", "shan") > 1) {
					return false;
				}
			},
		},
	},

// ========== zhugejin 诸葛瑾 ==========
	// 缓释：当一名角色的判定牌生效前，你可以令其观看你的手牌并选择你的一张牌，然后你用此牌代替判定牌。 参考gzhuanshi(guozhan，候选中带gz前缀直接选用)
	huanshi: {
		audio: "huanshi",
		trigger: { global: "judge" },
		popup: false,
		preHidden: true,
		filter(event, player) {
			return player.countCards("hes") > 0 && event.player.isFriendOf(player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(`${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt(event.skill)}`, "hes", card => {
					const player = get.player();
					const mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
					if (mod2 != "unchanged") {
						return mod2;
					}
					const mod = game.checkMod(card, player, "unchanged", "cardRespondable", player);
					if (mod != "unchanged") {
						return mod;
					}
					return true;
				})
				.set("ai", card => {
					const trigger = get.event().getTrigger();
					const { player, judging } = get.event();
					const result = trigger.judge(card) - trigger.judge(judging);
					const attitude = get.attitude(player, trigger.player);
					if (attitude == 0 || result == 0) {
						return 0;
					}
					if (attitude > 0) {
						return result - get.value(card) / 2;
					} else {
						return -result - get.value(card) / 2;
					}
				})
				.set("judging", trigger.player.judging[0])
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			const next = player.respond(event.cards, event.name, "highlight", "noOrdering");
			await next;
			const { cards } = next;
			if (cards?.length) {
				if (trigger.player.judging[0].clone) {
					trigger.player.judging[0].clone.classList.remove("thrownhighlight");
					game.broadcast(function (card) {
						if (card.clone) {
							card.clone.classList.remove("thrownhighlight");
						}
					}, trigger.player.judging[0]);
					game.addVideo("deletenode", player, get.cardsInfo([trigger.player.judging[0].clone]));
				}
				await game.cardsDiscard(trigger.player.judging[0]);
				trigger.player.judging[0] = cards[0];
				trigger.orderingCards.addArray(cards);
				game.log(trigger.player, "的判定牌改为", cards);
				await game.delay(2);
			}
		},
		ai: {
			rejudge: true,
			tag: { rejudge: 1 },
			threaten: 0.7,
		},
	},

	// 弘援：当你因合纵而摸牌时，你可改为一名与你势力相同的其他角色摸等量的牌；出牌阶段限一次，你可令一张无合纵标记的手牌在本阶段内视为有合纵标记。 参考gzhongyuan(guozhan，候选中带gz前缀直接选用)
	hongyuan: {
		audio: "hongyuan",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasCard(function (card) {
				return lib.skill.hongyuan.filterCard(card);
			}, "h");
		},
		filterCard(card) {
			return !get.cardtag(card, "lianheng") && !card.hasGaintag("_lianheng");
		},
		position: "h",
		discard: false,
		lose: false,
		async content(event, trigger, player) {
			event.cards[0].addGaintag("_lianheng");
			player.addTempSkill("hongyuan_clear");
		},
		check(card) {
			return 4.5 - get.value(card);
		},
		group: "hongyuan_draw",
		preHidden: true,
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
					return (
						event.getParent().name == "_lianheng" &&
						game.hasPlayer(function (current) {
							return current != player && current.isFriendOf(player);
						})
					);
				},
				async content(event, trigger, player) {
					const { bool, targets } = await player
						.chooseTarget(get.prompt("hongyuan"), "将摸牌（" + get.cnNumber(trigger.num) + "张）转移给一名同势力角色", function (card, player, target) {
							return target != player && target.isFriendOf(player);
						})
						.setHiddenSkill("hongyuan")
						.set("ai", () => -1)
						.forResult();
					if (bool) {
						const target = targets[0];
						player.logSkill("hongyuan", target);
						trigger.cancel();
						await target.draw(trigger.num);
					}
				},
			},
		},
	},

	// 明哲：当你于回合外使用或打出一张红色牌，或你于回合外失去装备区的红色牌时，你可以摸一张牌。 参考gzmingzhe(guozhan，候选中带gz前缀直接选用)
	mingzhe: {
		audio: "mingzhe",
		trigger: {
			player: ["loseAfter", "useCard", "respond"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			if (player == _status.currentPhase) {
				return false;
			}
			if (event.name == "useCard" || event.name == "respond") {
				return (
					get.color(event.card, false) == "red" &&
					player.hasHistory("lose", function (evt) {
						return (evt.relatedEvent || evt.getParent()) == event && evt.hs && evt.hs.length > 0;
					})
				);
			}
			var evt = event.getl(player);
			if (!evt || !evt.es || !evt.es.length) {
				return false;
			}
			for (var i of evt.es) {
				if (get.color(i, player) == "red") {
					return true;
				}
			}
			return false;
		},
		frequent: true,
		preHidden: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	},

// ========== lukang 陆抗 ==========
	// 燊围：同势力角色的结束阶段，你可以将手牌摸至当前体力值。 参考skill_old.js
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
		ai: {
			threaten: 0.7,
		},
	},

	// 恪守：当你受到伤害时，你可以弃置两张颜色相同的牌，令此伤害-1；孤军：你摸一张牌。 参考fakekeshou(guozhan gz_lukang)
	keshou: {
		audio: "keshou",
		trigger: { player: "damageBegin3" },
		filter(event, player) {
			return event.num > 0;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(get.prompt("keshou"), "弃置两张颜色相同的牌，令即将受到的伤害-1", "he", 2, card => {
					return !ui.selected.cards.length || get.color(card) == get.color(ui.selected.cards[0]);
				})
				.set("logSkill", "keshou")
				.set("complexCard", true)
				.setHiddenSkill("keshou")
				.set("ai", card => {
					if (!_status.event.check) {
						return 0;
					}
					var player = _status.event.player;
					if (player.hp == 1) {
						if (
							!player.countCards("h", function (card) {
								return get.tag(card, "save");
							}) &&
							!player.hasSkillTag("save", true)
						) {
							return 10 - get.value(card);
						}
						return 7 - get.value(card);
					}
					return 6 - get.value(card);
				})
				.set("check", player.countCards("h", { color: "red" }) > 1 || player.countCards("h", { color: "black" }) > 1)
				.forResult();
		},
		popup: false,
		async content(event, trigger, player) {
			trigger.num--;
		},
		group: "keshou_draw",
		subSkill: {
			draw: {
				audio: "keshou",
				trigger: {
					player: "loseAfter",
					global: "loseAsyncAfter",
				},
				filter(event, player) {
					if (event.type != "discard" || event.getlx === false) {
						return false;
					}
					if (
						!(
							!player.isUnseen() &&
							!game.hasPlayer(current => {
								return current != player && current.isFriendOf(player);
							})
						)
					) {
						return false;
					}
					const evt = event.getl(player);
					return evt && evt.cards2 && evt.cards2.length > 1;
				},
				prompt2: "进行一次判定，若为红色，则你摸一张牌",
				async content(event, trigger, player) {
					const result = await player
						.judge(card => {
							return get.color(card) == "red" ? 1 : 0;
						})
						.forResult();
					if (result.judge > 0) {
						await player.draw();
					}
				},
			},
		},
	},

// ========== xusheng 徐盛 ==========
	// 疑城：当一名与你势力相同的角色使用【杀】指定第一个目标后，或成为【杀】的目标后，其可以摸一张牌，然后弃置一张牌。 参考gz_yicheng_new
	yicheng: {
		audio: "yicheng",
		trigger: {
			global: ["useCardToPlayered", "useCardToTargeted"],
		},
		filter(event, player, name) {
			const bool = name === "useCardToPlayered";
			if (bool && !event.isFirstTarget) {
				return false;
			}
			return event.card.name == "sha" && event[bool ? "player" : "target"].isFriendOf(player);
		},
		logTarget(event, player, name) {
			return event?.[name === "useCardToPlayered" ? "player" : "target"];
		},
		async cost(event, trigger, player, name) {
			const bool = name === "useCardToPlayered";
			const target = trigger[bool ? "player" : "target"];
			const result = await target
				.chooseBool(get.prompt2("yicheng"))
				.set("ai", () => (get.attitude(get.player(), get.event().player) < 0 ? false : true))
				.forResult();
			event.result = { bool: result.bool, cost_data: target };
		},
		async content(event, trigger, player) {
			const target = event.cost_data;
			await target.draw();
			await target.chooseToDiscard("he", true);
		},
	},

	// 破军：当你于出牌阶段使用【杀】指定目标后，你可以将该角色的至多X张牌置于其武将牌上，本回合结束后，其获得这些牌（X为其体力值）。 参考repojun(refresh)
	pojun: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		direct: true,
		filter(event, player) {
			return player.isPhaseUsing() && event.card.name == "sha" && event.target.hp > 0 && event.target.countCards("he") > 0;
		},
		preHidden: true,
		async content(event, trigger, player) {
			const target = trigger.target;
			const next = player.choosePlayerCard(target, "he", [1, Math.min(target.hp, target.countCards("he"))], get.prompt("pojun", target), "allowChooseAll");
			next.set("ai", function (button) {
				var val = get.value(button.link);
				if (button.link == target.getEquip(2)) {
					return 2 * (val + 3);
				}
				return val;
			});
			next.set("forceAuto", true);
			next.setHiddenSkill(event.name);
			const result = await next.forResult();
			if (result.bool) {
				player.logSkill("pojun", target);
				target.addSkill("pojun2");
				const next2 = target.addToExpansion("giveAuto", result.cards, target);
				next2.gaintag.add("pojun2");
				await next2;
			}
		},
		ai: {
			unequip_ai: true,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (get.attitude(player, arg.target) > 0) {
					return false;
				}
				if (tag == "directHit_ai") {
					return arg.target.hp >= Math.max(1, arg.target.countCards("h") - 1);
				}
				return false;
			},
			threaten: 1.3,
		},
	},
	pojun2: {
		trigger: { global: "phaseEnd" },
		forced: true,
		popup: false,
		charlotte: true,
		sourceSkill: "pojun",
		filter(event, player) {
			return player.getExpansions("pojun2").length > 0;
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions("pojun2");
			if (cards.length) {
				await player.gain(cards, "draw");
			}
			player.removeSkill("pojun2");
		},
	},

// ========== lingtong 凌统 ==========
	// 旋略：当你失去装备区里的牌或一次性失去至少两张牌后，你可以弃置一名其他角色的一张牌。 参考xuanlve(guozhan)
	xuanlve: {
		audio: 2,
		trigger: {
			player: "loseAfter",
			global: "loseAsyncAfter",
		},
		preHidden: true,
		filter(event, player) {
			var evt = event.getl(player);
			if (!evt || !evt.cards || !evt.cards.length) {
				return false;
			}
			if (evt.es && evt.es.length > 0) {
				return true;
			}
			return evt.cards.length >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "弃置一名其他角色的一张牌", (card, player, target) => {
					return target != player && target.countDiscardableCards(player, "he");
				})
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "guohe_copy2" }, player, player);
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discardPlayerCard(event.targets[0], "he", true);
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
			threaten: 1.1,
		},
	},

	// 勇进：限定技，出牌阶段限一次，你可以移动场上的至多三张装备牌。你可以失去X点体力，令本次以此法可以移动的装备牌数量增加X。 参考yongjin(refresh)
	yongjin: {
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		enable: "phaseUse",
		filter(event, player, cards) {
			return game.hasPlayer(function (current) {
				var es = current.getCards("e", function (card) {
					return !cards || !cards.includes(card);
				});
				for (var i = 0; i < es.length; i++) {
					if (
						game.hasPlayer(function (current2) {
							return current != current2 && !current2.isMin() && current2.canEquip(es[i]);
						})
					) {
						return true;
					}
				}
				return false;
			});
		},
		async cost(event, trigger, player) {
			let extra = 0;
			const max = player.hp - 1;
			if (max > 0) {
				const { control } = await player
					.chooseControl(Array.from({ length: max + 1 }, (_, i) => String(i)))
					.set("prompt", "勇进：是否失去体力以增加本次可移动的装备牌数量？")
					.set("choiceList", Array.from({ length: max + 1 }, (_, i) => (i === 0 ? "不失去体力" : `失去${i}点体力，可移动装备牌数+${i}`)))
					.set("ai", () => "0")
					.forResult();
				extra = Number(control) || 0;
			}
			event.result = { bool: true, cost_data: extra };
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			if (event.cost_data > 0) {
				await player.loseHp(event.cost_data);
			}
			event.count = 3 + event.cost_data;
			event.cards = [];
			while (event.count > 0) {
				event.count--;
				if (!lib.skill.yongjin.filter(null, player, event.cards)) {
					break;
				}
				const chooseTargetResult = await player
					.chooseTarget(2, function (card, player, target) {
						if (ui.selected.targets.length) {
							var from = ui.selected.targets[0];
							if (target.isMin()) {
								return false;
							}
							var es = from.getCards("e", function (card) {
								return !_status.event.cards.includes(card);
							});
							for (var i = 0; i < es.length; i++) {
								if (target.canEquip(es[i])) {
									return true;
								}
							}
							return false;
						}
						return (
							target.countCards("e", function (card) {
								return !_status.event.cards.includes(card);
							}) > 0
						);
					})
					.set("ai", () => Math.random())
					.set("multitarget", true)
					.set("cards", event.cards)
					.set("targetprompt", ["被移走", "移动目标"])
					.set("prompt", "移动场上的一张装备牌")
					.forResult();
				if (!chooseTargetResult.bool) {
					break;
				}
				player.line2(chooseTargetResult.targets, "green");
				event.targets = chooseTargetResult.targets;
				await game.delay();
				if (event.targets.length != 2) {
					break;
				}
				const chooseCardResult = await player
					.choosePlayerCard("e", true, event.targets[0])
					.set("filterButton", function (button) {
						if (_status.event.cards.includes(button.link)) {
							return false;
						}
						return _status.event.targets1.canEquip(button.link);
					})
					.set("targets1", event.targets[1])
					.set("cards", event.cards)
					.forResult();
				if (!chooseCardResult.bool || !chooseCardResult.links.length) {
					break;
				}
				const link = chooseCardResult.links[0];
				event.cards.add(link);
				await event.targets[1].equip(link);
				event.targets[0].$give(link, event.targets[1]);
				await game.delay();
			}
		},
	},

// ========== chendong 陈武&董袭 ==========
	// 断绁：出牌阶段限一次，你可以令至多两名其他角色横置，然后你横置。若你已经处于连环状态，你可以立即发动一次“奋命”。 参考duanxie(sp)
	duanxie: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && !current.isLinked();
			});
		},
		filterTarget(card, player, target) {
			return player != target && !target.isLinked();
		},
		selectTarget: [1, 2],
		async content(event, trigger, player) {
			const alreadyLinked = player.isLinked();
			for (const target of event.targets) {
				if (!target.isLinked()) {
					await target.link();
				}
			}
			if (!player.isLinked()) {
				await player.link();
			}
			if (alreadyLinked && lib.skill.fenming) {
				await lib.skill.fenming.doFenming(player);
			}
		},
		ai: {
			result: {
				player(player) {
					return player.isLinked() ? 0 : -0.8;
				},
				target(player, target) {
					return get.effect(target, { name: "tiesuo" }, player, target) / get.attitude(target, target);
				},
			},
			order: 2,
			expose: 0.3,
		},
	},

	// 奋命：结束阶段，若你处于连环状态，你可以弃置所有处于连环状态的其他角色各一张牌，然后对其中一名因此没有手牌的角色造成1点伤害。 参考fake_fenming(guozhan)
	fenming: {
		skillAnimation: true,
		animationColor: "wood",
		audio: "fenming",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.isLinked() && game.hasPlayer(current => current != player && current.isLinked() && current.countCards("he") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("fenming")).forResult();
		},
		async content(event, trigger, player) {
			await lib.skill.fenming.doFenming(player);
		},
		doFenming: async function (player) {
			const targets = game.filterPlayer(current => current != player && current.isLinked() && current.countCards("he") > 0);
			const damaged = [];
			for (const target of targets) {
				const hadCards = target.countCards("h") > 0;
				await player.discardPlayerCard(target, "he", true);
				if (hadCards && !target.countCards("h")) {
					damaged.push(target);
				}
			}
			if (damaged.length) {
				let target = damaged[0];
				if (damaged.length > 1) {
					const result = await player
						.chooseTarget("奋命：选择一名因此没有手牌的角色，对其造成1点伤害", (card, player, target) => damaged.includes(target))
						.set("ai", target => get.damageEffect(target, player, player))
						.forResult();
					if (result.bool && result.targets && result.targets.length) {
						target = result.targets[0];
					}
				}
				await player.damage(target, 1);
			}
		},
		ai: {
			order: 6,
			result: { player: 1 },
			threaten: 1.3,
		},
	},

// ========== wuguotai 吴国太 ==========
	// 补益：每名角色的回合限一次，当与你势力相同的角色因受到伤害而进入濒死状态被救回后，你可以对伤害来源发起一次“军令”，若其不执行，你令脱离濒死状态的角色回复1点体力。 参考gzbuyi(guozhan)
	buyi: {
		audio: ["buyi", 2],
		trigger: { global: "dyingAfter" },
		filter(event, player) {
			if (!(event.player && event.player.isAlive() && event.source && event.source.isAlive())) {
				return false;
			}
			if (!event.player.isFriendOf(player) || !event.reason || event.reason.name != "damage") {
				return false;
			}
			const used = player.storage.buyi_used || [];
			return !used.some(entry => entry.source == event.source && entry.round == game.roundNumber);
		},
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		logTarget: "source",
		preHidden: true,
		async cost(event, trigger, player) {
			const result = await player.chooseJunlingFor(trigger.source).forResult();
			event.result = { bool: true, cost_data: { junling: result.junling, targets: result.targets } };
		},
		async content(event, trigger, player) {
			const { junling, targets } = event.cost_data;
			if (!player.storage.buyi_used) {
				player.storage.buyi_used = [];
			}
			player.storage.buyi_used.push({ source: trigger.source, round: game.roundNumber });
			const choiceList = ["执行该军令", "令" + get.translation(trigger.player) + (trigger.player == trigger.source ? "（你）" : "") + "回复1点体力"];
			const result = await trigger.source
				.chooseJunlingControl(player, junling, targets)
				.set("prompt", "补益")
				.set("choiceList", choiceList)
				.set("ai", function () {
					if (get.recoverEffect(trigger.player, player, player) > 0) {
						return 1;
					}
					return get.attitude(trigger.source, trigger.player) < 0 ? 1 : 0;
				})
				.forResult();
			if (result.index == 0) {
				trigger.source.carryOutJunling(player, junling, targets);
			} else {
				await trigger.player.recover(player);
			}
		},
	},

	// 甘露：出牌阶段限一次，你可以选择两名装备区内牌数之差不大于你已损失体力值的角色，交换其装备区里的所有牌。若这两名角色均与你势力相同，则本回合结束时，你可以再次发动此技能。 参考ganlu(yijiang)
	ganlu: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		selectTarget: 2,
		filterTarget(card, player, target) {
			if (target.isMin()) {
				return false;
			}
			if (ui.selected.targets.length == 0) {
				return true;
			}
			if (ui.selected.targets[0].countCards("e") == 0 && target.countCards("e") == 0) {
				return false;
			}
			return Math.abs(ui.selected.targets[0].countCards("e") - target.countCards("e")) <= player.maxHp - player.hp;
		},
		multitarget: true,
		async content(event, trigger, player) {
			const { targets } = event;
			targets[0].swapEquip(targets[1]);
			if (targets[0].isFriendOf(player) && targets[1].isFriendOf(player)) {
				const stat = player.getStat && player.getStat("skill");
				if (stat && stat[event.name]) {
					stat[event.name]--;
				}
			}
		},
		ai: {
			order: 10,
			threaten(player, target) {
				return 0.8 * Math.max(1 + target.maxHp - target.hp);
			},
			effect: {
				target(card, player, target) {
					if (target.hp == target.maxHp && get.tag(card, "damage")) {
						return 0.2;
					}
				},
			},
		},
	},

// ========== sunyi 孙翊 ==========
	// 躁厉：锁定技，准备阶段，你弃置你手牌/装备区的所有牌，并摸等量的牌。然后，你可以将一张牌当【决斗】使用，若如此做，你失去1点体力、并摸已损失体力数量的牌。 参考stdzaoli(sixiang)
	zaolix: {
		skillAnimation: true,
		animationColor: "wood",
		audio: "zaoli",
		locked: true,
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		forced: true,
		async content(event, trigger, player) {
			const num = player.countCards("he");
			if (num) {
				await player.chooseToDiscard("he", num, true);
				await player.draw(num);
			}
			if (player.countCards("he")) {
				const chooseResult = await player
					.chooseCard("he", 1, "躁厉：你可以选择一张牌当【决斗】使用")
					.set("ai", card => (Math.random() > 0.5 ? 5 : 0))
					.forResult();
				if (chooseResult.bool && chooseResult.cards && chooseResult.cards.length) {
					await player.chooseUseTarget({ name: "juedou", isCard: true, cards: chooseResult.cards }, false, true).forResult();
					await player.loseHp();
					await player.draw(player.getDamagedHp());
				}
			}
		},
		ai: {
			threaten: 1.1,
		},
	},

// ========== bulianshi 步练师 ==========
	// 安恤：出牌阶段限一次，你可以选择两名手牌数不同的其他角色，令其中手牌少的角色获得手牌多的角色的一张手牌并展示之，若此牌不为♠，你摸一张牌；若这两名角色手牌数相等，你回复1点体力。 参考dcanxu(refresh)
	anxu: {
		enable: "phaseUse",
		usable: 1,
		multitarget: true,
		audio: 2,
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			var num = target.countCards("h");
			if (ui.selected.targets.length) {
				return num < ui.selected.targets[0].countCards("h");
			}
			var players = game.filterPlayer();
			for (var i = 0; i < players.length; i++) {
				if (num > players[i].countCards("h")) {
					return true;
				}
			}
			return false;
		},
		selectTarget: 2,
		async content(event, trigger, player) {
			let gainner, giver;
			const { targets } = event;
			if (targets[0].countCards("h") < targets[1].countCards("h")) {
				gainner = targets[0];
				giver = targets[1];
			} else {
				gainner = targets[1];
				giver = targets[0];
			}
			const result = await gainner.gainPlayerCard(giver, true, "h", "visibleMove").forResult();
			if (result?.cards?.length) {
				const card = result.cards[0];
				if (gainner.getCards("h").includes(card) && get.suit(card, gainner) != "spade") {
					await player.draw();
				}
			}
			if (gainner.countCards("h") == giver.countCards("h")) {
				await player.recover();
			}
		},
		ai: {
			order: 10.5,
			threaten: 2.3,
			result: {
				player: 1,
			},
		},
	},

	// 追忆：限定技，准备阶段，若你已受伤，你可以令一名其他角色摸三张牌，回复1点体力并复原武将牌。 参考olzhuiyi(onlyOL)
	zhuiyi: {
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.isDamaged() && game.players.length > 1;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt(event.skill),
					prompt2: "令一名其他角色摸三张牌、回复1点体力并复原武将牌",
					filterTarget: lib.filter.notMe,
					ai(target) {
						const player = get.player();
						let num = get.attitude(player, target);
						if (num > 0) {
							if (target.getHp() == 1) {
								num += 2;
							}
							if (target.isDamaged()) {
								num += 2;
							}
						}
						return num;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const {
				targets: [target],
			} = event;
			await target.draw({ num: 3 });
			await target.recover();
			if (target.isTurnedOver()) {
				await target.turnOver(false);
			}
			if (target.isLinked()) {
				await target.link(false);
			}
		},
	},

// ========== chengpu 程普 ==========
	// 蹈火：你可以将两张颜色不同的牌当火【杀】使用，并将“阴阳鱼”标记补至1。当你的【酒】【杀】造成伤害时，你可以选择一名与目标角色势力相同的另一名角色，令其与目标角色交换副将牌。 参考gz_ol_daohuo(guozhan)
	daohuo: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard(card) {
			return ui.selected.cards.every(cardx => get.color(cardx) != get.color(card));
		},
		complexCard: true,
		selectCard: 2,
		position: "hes",
		viewAs: {
			name: "sha",
			nature: "fire",
		},
		viewAsFilter(player) {
			return (
				player
					.getCards("hes")
					.map(card => get.color(card))
					.toUniqued().length > 1
			);
		},
		prompt: "将两张颜色不同的牌当火【杀】使用",
		check(card) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			if (!player.countMark("yinyang_mark")) {
				player.addMark("yinyang_mark", 1, false);
			}
		},
		ai: {
			threaten: 1.2,
		},
	},
	daohuo_effect: {
		audio: "daohuo",
		sourceSkill: "daohuo",
		trigger: { source: "damageSource" },
		filter(event, player) {
			return event.card && event.card.name == "sha" && event.card.hasNature && event.card.hasNature("jiu") && event.player && event.player.isIn();
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			const targets = game.filterPlayer(current => current != target && current.isFriendOf(target));
			if (!targets.length) {
				event.result = { bool: false };
				return;
			}
			event.result = await player
				.chooseTarget(
					"蹈火：选择一名与" + get.translation(target) + "势力相同的角色，令其与" + get.translation(target) + "交换副将牌",
					(card, player, current) => get.event("targets2").includes(current)
				)
				.set("targets2", targets)
				.set("ai", () => Math.random())
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			await target.transCharacter(event.targets[0]);
		},
	},

	// 醇醪：锁定技，与你势力相同的角色可以移去一个“阴阳鱼”标记或“珠联璧合”标记，视为使用一张【酒】。 参考gz_ol_chunlao(guozhan)
	chunlao: {
		audio: "chunlao",
		locked: true,
		global: "chunlao_jiu",
		subSkill: {
			jiu: {
				enable: "chooseToUse",
				filter(event, player) {
					if (!game.hasPlayer(current => current.isFriendOf(player) && current.hasSkill("chunlao"))) {
						return false;
					}
					if (!player.hasMark("yinyang_mark") && !player.hasMark("zhulianbihe_mark")) {
						return false;
					}
					const jiu = new lib.element.VCard({ name: "jiu", isCard: true });
					return event.filterCard(jiu, player, event);
				},
				hiddenCard(player, name) {
					if (name != "jiu" || !game.hasPlayer(current => current.isFriendOf(player) && current.hasSkill("chunlao"))) {
						return false;
					}
					return player.hasMark("yinyang_mark") || player.hasMark("zhulianbihe_mark");
				},
				chooseButton: {
					dialog(event, player) {
						return ui.create.dialog("###醇醪###弃置一枚“阴阳鱼”或“珠联璧合”，视为使用一张【酒】");
					},
					chooseControl(event, player) {
						const list = [];
						if (player.hasMark("zhulianbihe_mark")) {
							list.push("珠联璧合");
						}
						if (player.hasMark("yinyang_mark")) {
							list.push("阴阳鱼");
						}
						list.push("cancel2");
						return list;
					},
					check(button) {
						const player = get.player(),
							card = new lib.element.VCard({ name: "jiu", isCard: true });
						if (!player.getUseValue(card)) {
							return "cancel2";
						}
						if (player.hasMark("yinyang_mark")) {
							return "阴阳鱼";
						}
						if (player.hasMark("zhulianbihe_mark")) {
							if (player.getUseValue("tao") < player.getUseValue("jiu")) {
								return "珠联璧合";
							}
						}
						return "cancel2";
					},
					backup(result, player) {
						return {
							link: result.control,
							filterCard: () => false,
							selectCard: -1,
							viewAs: {
								name: "jiu",
								isCard: true,
							},
							async precontent(event, trigger, player) {
								delete event.result.skill;
								player.logSkill("chunlao");
								const map = {
									阴阳鱼: "yinyang_mark",
									珠联璧合: "zhulianbihe_mark",
								};
								player.removeMark(map[get.info("chunlao_jiu_backup").link], 1, false);
							},
						};
					},
					prompt(result, player) {
						return `移去一个${result.control}标记，视为使用一张【酒】`;
					},
				},
				ai: {
					order(item, player) {
						return get.order({ name: "jiu" }, player) + 0.1;
					},
					result: {
						player: 1,
					},
				},
			},
		},
	},

// ========== handang 韩当 ==========
	// 弓骑：若你的坐骑区有牌，你的攻击范围无限；出牌阶段限一次，你可以弃置一张非基本牌并选择一名其他角色，然后你弃置其一张牌。若你弃置的是武器牌，你本回合使用【杀】可以发动该武器的效果。 参考gongji(yijiang)
	gongji: {
		audio: 2,
		mod: {
			attackRangeBase(player) {
				if (player.countCards("e", card => ["equip3", "equip4"].includes(get.subtype(card)))) {
					return Infinity;
				}
			},
		},
		enable: "phaseUse",
		usable: 1,
		position: "he",
		filterCard(card) {
			return get.type(card) != "basic";
		},
		filterTarget(card, player, target) {
			return player != target && target.countCards("he") > 0;
		},
		check(card) {
			if (get.type(card) != "equip") {
				return 0;
			}
			return 6 - get.equipValue(card);
		},
		async content(event, trigger, player) {
			const { target, cards } = event;
			const card = cards[0];
			await player.discardPlayerCard(target, "he", true);
			if (card && get.type(card) == "equip" && get.subtype(card) == "equip1" && lib.skill[card.name]) {
				player.addTempSkill(card.name);
			}
		},
		ai: {
			order: 9,
			result: {
				player: 1,
			},
			threaten: 1.3,
		},
	},

	// 解烦：出牌阶段限一次，你可以选择一名角色，令其选择一项：1.令攻击范围内含有其的角色各弃置一张牌；2.摸等同于攻击范围内含有其的角色数的牌。 参考sbjiefan(sb)
	jiefan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: true,
		async content(event, trigger, player) {
			const { target } = event;
			const targets = game.filterPlayer(current => current.inRange(target));
			const count = targets.length;
			const { control } = await target
				.chooseControl(["选项一", "选项二"])
				.set("choiceList", [`令所有攻击范围内含有你的角色依次弃置一张牌（${get.translation(targets)}）`, `你摸等同于攻击范围内含有你的角色数的牌（${get.cnNumber(count)}张牌）`])
				.set("ai", () => (Math.random() > 0.5 ? "选项一" : "选项二"))
				.forResult();
			if (control == "选项一") {
				for (const current of targets) {
					target.line(current, "thunder");
					await current.chooseToDiscard({ prompt: "解烦：请弃置一张牌", position: "he", forced: true });
				}
			} else {
				await target.draw(count);
			}
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					const targets = game.filterPlayer(current => current.inRange(target));
					return Math.min(2, targets.length) / 2;
				},
			},
		},
	},

// ========== panzhangmazhong 潘璋马忠 ==========
	// 夺刀：当你成为其他角色使用【杀】的目标后，你可以弃置一张牌，然后获得该角色装备区里的武器牌。 参考reduodao
	duodao: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.card.name == "sha" && player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			let prompt = "弃置一张牌，然后",
				cards = trigger.player.getEquips(1).filter(card => {
					return lib.filter.canBeGained(card, player, trigger.player);
				});
			if (cards.length) {
				prompt += "获得" + get.translation(trigger.player) + "装备区中的" + get.translation(cards);
			} else {
				prompt += "无事发生";
			}
			event.result = await player
				.chooseToDiscard("he", get.prompt(event.skill, trigger.player), prompt)
				.set("ai", function (card) {
					let eff = get.event().eff;
					if (typeof eff === "number") {
						return eff - get.value(card);
					}
					return 0;
				})
				.set(
					"eff",
					(function () {
						let es = trigger.player.getEquips(1).filter(card => {
							return lib.filter.canBeGained(card, player, trigger.player);
						});
						if (!es.length) {
							return false;
						}
						if (get.attitude(player, trigger.player) > 0) {
							return (
								-2 *
								es.reduce((acc, card) => {
									return acc + get.value(card, trigger.player);
								}, 0)
							);
						}
						return (
							2 *
							es.reduce((acc, card) => {
								return acc + get.value(card, player);
							}, 0)
						);
					})()
				)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const cards = trigger.player.getEquips(1).filter(card => {
				return lib.filter.canBeGained(card, player, trigger.player);
			});
			if (cards.length) {
				player.gain(cards, trigger.player, "give", "bySelf");
			}
		},
	},

	// 暗箭：锁定技，当你使用【杀】指定一名角色为目标后，若你不在其攻击范围内，此【杀】对其造成的基础伤害值+1且无视其防具，然后若该角色因此进入濒死状态，其不能使用【桃】直到此次濒死结算结束。 参考reanjian
	anjian: {
		trigger: { player: "useCardToPlayered" },
		forced: true,
		audio: 2,
		filter(event, player) {
			return event.card.name == "sha" && !event.target.inRange(player);
		},
		logTarget: "target",
		async content(event, trigger, player) {
			trigger.getParent().anjian_buffed = true;
			const map = trigger.customArgs;
			const id = trigger.target.playerid;
			if (!map[id]) {
				map[id] = {};
			}
			if (!map[id].extraDamage) {
				map[id].extraDamage = 0;
			}
			map[id].extraDamage++;
			trigger.target.addTempSkill("anjian2");
			trigger.target.addTempSkill("anjian4");
			trigger.target.storage.anjian2.add(trigger.card);
		},
		ai: {
			unequip_ai: true,
			skillTagFilter(player, tag, arg) {
				if (arg && arg.name == "sha" && arg.target && !arg.target.inRange(player)) {
					return true;
				}
				return false;
			},
			threaten: 1.5,
		},
	},
	anjian2: {
		firstDo: true,
		sourceSkill: "anjian",
		ai: { unequip2: true },
		init(player, skill) {
			if (!player.storage[skill]) {
				player.storage[skill] = [];
			}
		},
		onremove: true,
		trigger: {
			player: ["damage", "damageCancelled", "damageZero"],
			target: ["shaMiss", "useCardToExcluded"],
		},
		charlotte: true,
		filter(event, player) {
			const evt = event.getParent("useCard", true, true);
			if (evt && evt.effectedCount < evt.effectCount) {
				return false;
			}
			return player.storage.anjian2 && event.card && player.storage.anjian2.includes(event.card);
		},
		silent: true,
		forced: true,
		popup: false,
		priority: 12,
		async content(event, trigger, player) {
			player.storage.anjian2.remove(trigger.card);
			if (!player.storage.anjian2.length) {
				player.removeSkill("anjian2");
			}
		},
	},
	anjian3: {
		mod: {
			cardSavable(card) {
				if (card.name == "tao") {
					return false;
				}
			},
		},
	},
	anjian4: {
		trigger: { player: "dyingBegin" },
		forced: true,
		silent: true,
		firstDo: true,
		sourceSkill: "anjian",
		filter(event, player) {
			return (event.getParent(2).anjian_buffed = true);
		},
		async content(event, trigger, player) {
			player.addTempSkill("anjian3", { global: ["dyingEnd", "phaseEnd"] });
		},
	},

// ========== zhuran 朱然 ==========
	// 胆守：每回合限一次，当你成为基本牌或锦囊牌的目标后，你可以摸X张牌（X为你本回合成为基本牌或锦囊牌的目标的次数）。 参考xindanshou
	danshou: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		usable: 1,
		filter(event, player) {
			return event.targets?.includes(player) && ["basic", "trick"].includes(get.type2(event.card));
		},
		async cost(event, trigger, player) {
			let num = 0;
			game.countPlayer2(current => {
				num += current.getHistory("useCard").filter(evt => ["basic", "trick"].includes(get.type2(evt.card)) && evt.targets?.includes(player)).length;
			});
			const result = await player.chooseBool(get.prompt2("danshou")).forResult();
			event.result = { bool: result.bool, cost_data: num };
		},
		async content(event, trigger, player) {
			await player.draw(event.cost_data);
		},
	},

	// 截路：当你造成伤害后，若该伤害未使目标角色进入濒死状态，你可以摸一张牌，然后终止当前事件的后续结算，并结束当前回合。 参考skill_old.js
	jielu: {
		aiShowTag: "defense",
		audio: 2,
		trigger: { source: "damageEnd" },
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
		ai: {
			threaten: 1.4,
		},
	},

// ========== sunluban 孙鲁班 ==========
	// 谮毁：当你使用【杀】或锦囊牌造成伤害时，你可以令一名非目标角色成为伤害来源。 参考skill_old.js
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

	// 除异：每轮限一次，当一名其他角色对与你势力不同的角色造成伤害时，你可以令此伤害+1。若伤害来源为男性，你可以流失1点体力，令此伤害额外+1。 参考skill_old.js
	chuyi: {
		skillAnimation: true,
		animationColor: "wood",
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
			event.result = await player
				.chooseBool(get.prompt2("chuyi", trigger.player))
				.set("ai", () => {
					if (trigger.source && trigger.source.isFriendOf(player)) {
						return true;
					}
					return get.attitude(player, trigger.player) < 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.num++;
			player.addTempSkill("chuyi_used", "roundStart");
			if (trigger.source && trigger.source.hasSex("male")) {
				const result = await player
					.chooseBool("除异：是否流失1点体力，令此伤害额外+1？")
					.set("ai", () => diffGroup(player, trigger.player))
					.forResult();
				if (result.bool) {
					await player.loseHp();
					trigger.num++;
				}
			}
		},
		ai: {
			threaten: 1.3,
		},
	},

// ========== quancong 全琮 ==========
	// 邀名：每回合各限一次，当你造成或受到伤害后，你可以选择一名角色，若其手牌数：大于等于你，你弃置其一张牌；小于等于你，其摸一张牌。 参考olyaoming
	// "各限一次"指的是"造成伤害"和"受到伤害"这两个触发时机各自限一次（用player.storage.yaoming_used
	// 记录本回合已经触发过的trigger名字），跟弃牌/摸牌是哪个分支无关——一次发动里该弃牌的弃牌、该
	// 摸牌的摸牌，两个效果本来就不冲突，不需要按分支分别计次。
	yaoming: {
		audio: 2,
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		group: ["yaoming_reset"],
		filter(event, player, name) {
			const used = player.storage.yaoming_used || [];
			return !used.includes(name);
		},
		async cost(event, trigger, player) {
			const next = player.chooseTarget({
				prompt: get.prompt2(event.skill),
				filterTarget(card, player, target) {
					let bool = false;
					if (player.countCards("h") <= target.countCards("h")) {
						bool = target.hasDiscardableCards(player, "he");
					}
					if (player.countCards("h") >= target.countCards("h")) {
						bool = true;
					}
					return bool;
				},
				ai(target) {
					let eff = 0;
					const player = get.player();
					if (player.countCards("h") >= target.countCards("h")) {
						eff += get.effect(target, { name: "draw" }, player, player);
					}
					if (player.countCards("h") <= target.countCards("h")) {
						eff += get.effect(target, { name: "guohe_copy2" }, player, player);
					}
					return eff;
				},
			});
			next.targetprompt2.add(target => {
				if (!target.classList.contains("selectable")) {
					return;
				}
				let str = "";
				const player = get.player();
				if (player.countCards("h") >= target.countCards("h")) {
					str += "摸牌";
				}
				if (player.countCards("h") <= target.countCards("h")) {
					str += "弃牌";
				}
				return str;
			});
			event.result = await next.forResult();
		},
		async content(event, trigger, player, name) {
			const {
				targets: [target],
			} = event;
			// 用发动前的手牌数一次性判断两个条件，而不是分别用当时最新的手牌数各判断一次——
			// 否则弃牌会改变目标手牌数，导致摸牌那个条件用"弃牌后的手牌数"重新判断又成立了一次。
			// 一开始就打平的话，两个条件本来就都满足，弃牌、摸牌应该都执行。
			const shouldDiscard = player.countCards("h") <= target.countCards("h");
			const shouldDraw = player.countCards("h") >= target.countCards("h");
			if (shouldDiscard) {
				await player.discardPlayerCard({ target, position: "he", forced: true });
			}
			if (shouldDraw) {
				await target.draw();
			}
			player.storage.yaoming_used = (player.storage.yaoming_used || []).concat(name);
		},
		ai: {
			threaten: 1.1,
		},
		subSkill: {
			reset: {
				charlotte: true,
				trigger: { global: "roundStart" },
				forced: true,
				popup: false,
				content() {
					delete player.storage.yaoming_used;
				},
			},
		},
	},

	// 赈赡：当你需要使用或打出基本牌时，你可以与手牌数小于你的一名角色交换手牌，视为使用或打出之。 参考olzhenshan（代码本来就没有加每回合限一次的限制，只是旧注释写错了，随文本一起更正）
	zhenshan: {
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		filter(event, player) {
			if (event.type == "wuxie") {
				return false;
			}
			const nh = player.countCards("h");
			if (
				!game.hasPlayer(function (current) {
					return current != player && current.countCards("h") < nh;
				})
			) {
				return false;
			}
			for (const i of lib.inpile) {
				if (get.type(i) != "basic") {
					continue;
				}
				const card = { name: i, isCard: true };
				if (event.filterCard(card, player, event)) {
					return true;
				}
				if (i == "sha") {
					for (const j of lib.inpile_nature) {
						card.nature = j;
						if (event.filterCard(card, player, event)) {
							return true;
						}
					}
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				const list = [];
				for (const i of lib.inpile) {
					if (get.type(i) != "basic") {
						continue;
					}
					const card = { name: i, isCard: true };
					if (event.filterCard(card, player, event)) {
						list.push(["基本", "", i]);
					}
					if (i == "sha") {
						for (const j of lib.inpile_nature) {
							card.nature = j;
							if (event.filterCard(card, player, event)) {
								list.push(["基本", "", i, j]);
							}
						}
					}
				}
				return ui.create.dialog("赈赡", [list, "vcard"], "hidden");
			},
			check(button) {
				const player = _status.event.player;
				const card = { name: button.link[2], nature: button.link[3] };
				if (card.name == "jiu") {
					return 0;
				}
				if (
					game.hasPlayer(function (current) {
						return get.effect(current, card, player, player) > 0;
					})
				) {
					if (card.name == "sha") {
						const eff = player.getUseValue(card);
						if (eff > 0) {
							return 2.9 + eff / 10;
						}
						return 0;
					} else if (card.name == "tao" || card.name == "shan") {
						return 4;
					}
				}
				return 0;
			},
			backup(links, player) {
				return {
					filterCard: () => false,
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						isCard: true,
					},
					selectCard: -1,
					log: false,
					async precontent(event, trigger, player) {
						const result = await player
							.chooseTarget({
								prompt: "赈赡：选择一名手牌数小于你的角色交换手牌",
								filterTarget(card, player, target) {
									return target != player && target.countCards("h") < player.countCards("h");
								},
								forced: true,
								ai(target) {
									return get.attitude(get.player(), target) * Math.sqrt(target.countCards("h") + 1);
								},
							})
							.forResult();
						if (result?.bool) {
							player.logSkill("zhenshan", result.targets);
							await player.swapHandcards(result.targets[0]);
						} else {
							event.result.cancel = true;
						}
					},
				};
			},
			prompt(links, player) {
				return "选择" + get.translation(links[0][3] || "") + "【" + get.translation(links[0][2]) + "】的目标";
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

// ========== sunxiu 孙休 ==========
	// 宴诛：限定技，出牌阶段，你可以选择一名其他角色，你获得其装备区里的所有牌。 参考mobileyanzhu
	yanzhu: {
		audio: 2,
		skillAnimation: true,
		animationColor: "wood",
		limited: true,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return target != player && target.countCards("e") > 0;
		},
		filter(event, player) {
			return game.hasPlayer(target => target != player && target.countCards("e") > 0);
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const { target } = event;
			const es = target.getCards("e");
			await player.gain(es, target, "give");
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					const ne = target.countCards("e");
					if (!ne) {
						return 0;
					}
					return -ne;
				},
			},
			threaten: 1.3,
		},
	},

	// 兴学：结束阶段，你可以令至多X名角色（X为你的体力上限）依次摸一张牌，并将一张牌置于牌堆顶或将此牌交给另一名此技能的目标。 参考mobilexingxue
	xingxue: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.maxHp > 0;
		},
		async cost(event, trigger, player) {
			const num = player.maxHp;
			event.result = await player
				.chooseTarget([1, num], get.prompt2(event.skill))
				.set("ai", function (target) {
					var att = get.attitude(_status.event.player, target);
					if (target.countCards("he")) {
						return att;
					}
					return att / 10;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { targets } = event;
			await game.doAsyncInOrder(targets, async target => {
				await target.draw();
				if (target.countCards("he")) {
					let result;
					if (targets.length == 1) {
						result = await target.chooseCard("选择一张牌置于牌堆顶", "he", true).forResult();
					} else {
						result = await target
							.chooseCardTarget({
								prompt: "将一张牌置于牌堆顶，或交给其他目标角色",
								filterCard: true,
								position: "he",
								filterTarget(card, player, target) {
									return target != player && get.event().targets.includes(target);
								},
								targets: targets,
								forced: true,
								selectTarget: [0, 1],
								ai1: card => 6 - get.value(card),
								ai2: target => get.attitude(_status.event.player, target),
							})
							.forResult();
					}
					if (result.bool && result.cards?.length) {
						const { cards, targets: giveTargets } = result;
						if (giveTargets?.length) {
							await target.give(cards, giveTargets[0]);
						} else {
							target.$throw(cards.length, 1000);
							game.log(target, `将${get.cnNumber(cards.length)}张牌置于牌堆顶`);
							await target.lose(cards, ui.cardPile, "insert");
						}
					}
				}
			});
		},
	},

// ========== zhuzhi 朱治 ==========
	// 安国：锁定技，若其他同势力角色的装备区没有武器/防具牌，其视为装备着你装备区内的武器/防具牌。若其装备区有武器/防具牌，其攻击距离/其他角色计算与其的距离+1。若你的装备区仅有一张牌，此牌不能被弃置或获得。 参考skill_old.js
	anguo: {
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
			game.addGlobalSkill("anguo_share", player);
		},
		onremove(player) {
			game.removeGlobalSkill("anguo_share", player);
		},
		ai: {
			threaten: 0.8,
		},
	},

	anguo_share: {
		charlotte: true,
		mod: {
			attackRange(player, num) {
				const src = game.filterPlayer(cur => cur != player && cur.isFriendOf(player) && cur.hasSkill("anguo"))[0];
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
				const src = game.filterPlayer(cur => cur != to && cur.isFriendOf(to) && cur.hasSkill("anguo"))[0];
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

// ========== sundeng 孙登 ==========
	// 匡弼：出牌阶段限一次，你可以将至多三张牌置于武将牌上，称为"弼"。你的回合外，与你势力相同的角色可以如手牌般使用或打出"弼"；每当一张"弼"因此离开你的武将牌后，你摸一张牌。你的下个回合开始时，移去所有"弼"。 参考skill_old.js
	kuangbi: {
		skillAnimation: true,
		animationColor: "wood",
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
		ai: {
			threaten: 0.9,
		},
	},

// ========== zumao 祖茂 ==========
	// 引兵：结束阶段，你可以将任意名攻击范围内包含你的角色各一张手牌置于你的武将牌上；当你受到【杀】或【决斗】造成的伤害后，来源可以获得一张“引兵”牌。 参考yinbing(sp)
	yinbing: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(target => target != player && target.inRange(player) && target.countCards("h"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("yinbing"), "选择任意名攻击范围包含你的角色，令其各交给你一张手牌置于你的武将牌上", [1, Infinity], (card, player, target) => target != player && target.inRange(player) && target.countCards("h"))
				.set("ai", target => (get.attitude(get.player(), target) > 0 ? 1 : 0))
				.forResult();
		},
		async content(event, trigger, player) {
			for (const target of event.targets) {
				if (!target.isIn() || !target.countCards("h")) continue;
				const { cards } = await target
					.chooseCard("h", true, get.prompt2("yinbing", target))
					.set("ai", card => 6 - get.value(card))
					.set("target", player)
					.forResult();
				if (cards && cards.length) {
					const next = player.addToExpansion(cards, target, "give");
					next.gaintag.add("yinbing");
					await next;
				}
			}
		},
		marktext: "兵",
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) player.loseToDiscardpile(cards);
		},
		ai: {
			combo: "juedi",
			threaten: 1.1,
		},
		group: "yinbing_gain",
		subSkill: {
			gain: {
				audio: "yinbing",
				trigger: { player: "damageEnd" },
				filter(event, player) {
					return (event.card?.name == "sha" || event.card?.name == "juedou") && event.source && event.source.isIn() && player.getExpansions("yinbing").length;
				},
				forced: true,
				logTarget: "source",
				async content(event, trigger, player) {
					const source = trigger.source;
					const cards = player.getExpansions("yinbing");
					if (cards.length && source && source.isIn()) {
						await source.gain(cards.randomGet(1), "gain2");
					}
				},
			},
		},
	},

	// 绝地：锁定技，准备阶段，你选择一项：1.移去所有“引兵”牌，然后你摸牌至体力上限；2.令一名体力值小于等于你的其他角色获得所有“引兵”牌，然后其回复1点体力并摸等量的牌。 参考juedi(sp)
	juedi: {
		skillAnimation: true,
		animationColor: "wood",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.getExpansions("yinbing").length > 0;
		},
		forced: true,
		audio: 2,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2("juedi"), true, function (card, player, target) {
					return player.hp >= target.hp;
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					var att = get.attitude(player, target);
					if (att < 2) {
						return att - 10;
					}
					var num = att / 10;
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
		ai: {
			combo: "yinbing",
		},
	},

// ========== zhugeke 诸葛恪 ==========
	// 傲才：当你于回合外需要使用或打出一张基本牌时，你可以观看牌堆顶三张牌：若其中有此牌，你可以使用或打出之；否则，你可以将这些牌置于牌堆底。 参考aocai(sp)
	aocai: {
		audio: 2,
		audioname: ["gz_zhugeke"],
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			if (player != _status.currentPhase && get.type(name) == "basic" && lib.inpile.includes(name)) {
				return true;
			}
		},
		filter(event, player) {
			if (event.responded || player == _status.currentPhase || event.aocai) {
				return false;
			}
			return lib.inpile.some(i => get.type(i) == "basic" && event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event));
		},
		delay: false,
		async content(event, trigger, player) {
			const evt = event.getParent(2);
			const cards = get.cards(3, true);
			const cardsx = cards.slice().map(card => {
				const cardx = ui.create.card();
				cardx.init(get.cardInfo(card));
				cardx._cardid = card.cardid;
				return cardx;
			});
			evt.set("aocai", true);
			player.directgains(cardsx, null, "aocai_hs");
			const result = await player
				.chooseCard(
					"傲才：选择要" + (evt.name == "chooseToUse" ? "使用" : "打出") + "的牌",
					(card, player) => {
						return get.event().cards.includes(card);
					},
					"s"
				)
				.set(
					"cards",
					cardsx.filter(card => {
						if (player.hasSkill("aozhan") && card.name == "tao") {
							return (
								evt.filterCard(
									{
										name: "sha",
										isCard: true,
										cards: [card],
									},
									evt.player,
									evt
								) ||
								evt.filterCard(
									{
										name: "shan",
										isCard: true,
										cards: [card],
									},
									evt.player,
									evt
								)
							);
						}
						return evt.filterCard(card, evt.player, evt);
					})
				)
				.set("ai", card => {
					if (get.type(card) == "equip") {
						return 0;
					}
					const evt = get.event().getParent(3),
						player = get.event().player;
					if (evt.type == "phase" && !player.hasValueTarget(card, null, true)) {
						return 0;
					}
					if (evt && evt.ai) {
						const tmp = _status.event;
						_status.event = evt;
						const result = (evt.ai || event.ai1)(card, player, evt);
						_status.event = tmp;
						return result;
					}
					return 1;
				})
				.forResult();
			let card;
			if (result.bool) {
				card = cards.find(card => card.cardid === result.cards[0]._cardid);
			}
			const cards2 = player.getCards("s", card => card.hasGaintag("aocai_hs"));
			if (player.isOnline2()) {
				player.send(
					(cards, player) => {
						cards.forEach(i => i.delete());
						if (player == game.me) {
							ui.updatehl();
						}
					},
					cards2,
					player
				);
			}
			cards2.forEach(i => i.delete());
			if (player == game.me) {
				ui.updatehl();
			}
			if (card) {
				let name = card.name,
					aozhan = player.hasSkill("aozhan") && name == "tao";
				if (aozhan) {
					name = evt.filterCard(
						{
							name: "sha",
							isCard: true,
							cards: [card],
						},
						evt.player,
						evt
					)
						? "sha"
						: "shan";
				}
				if (evt.name == "chooseToUse") {
					game.broadcastAll(
						(result, name) => {
							lib.skill.aocai_backup.viewAs = { name: name, cards: [result], isCard: true };
						},
						card,
						name
					);
					evt.set("_backupevent", "aocai_backup");
					evt.set("openskilldialog", "请选择" + get.translation(card) + "的目标");
					evt.backup("aocai_backup");
				} else {
					delete evt.result.used;
					delete evt.result.skill;
					evt.result.card = get.autoViewAs(card);
					if (aozhan) {
						evt.result.card.name = name;
					}
					evt.result.cards = [card];
					evt.redo();
					return;
				}
			}
			evt.goto(0);
		},
		ai: {
			effect: {
				target(card, player, target, effect) {
					if (get.tag(card, "respondShan")) {
						return 0.7;
					}
					if (get.tag(card, "respondSha")) {
						return 0.7;
					}
				},
			},
			order: 11,
			respondShan: true,
			respondSha: true,
			result: {
				player(player) {
					if (_status.event.dying) {
						return get.attitude(player, _status.event.dying);
					}
					return 1;
				},
			},
		},
		subSkill: {
			backup: {
				async precontent(event, trigger, player) {
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

	// 黩武：限定技，出牌阶段，你可以对你攻击范围内所有其他势力发起一个“军令”。若其中每有一名角色不执行，你对其造成1点伤害并摸一张牌。当所有“军令”结算结束后，若结算期间有角色进入濒死状态被救回，则你失去1点体力。 参考gzduwu
	duwu: {
		limited: true,
		audio: 2,
		enable: "phaseUse",
		delay: false,
		filter(event, player) {
			var isEnemy;
			if (player.identity == "unknown") {
				if (!player.wontYe("wu")) {
					isEnemy = function (current) {
						return current != player;
					};
				} else {
					isEnemy = function (current) {
						return current != player && current.identity != "wu";
					};
				}
			} else {
				isEnemy = function (target) {
					return target.isEnemyOf(player);
				};
			}
			return game.hasPlayer(function (current) {
				return isEnemy(current) && player.inRange(current);
			});
		},
		filterTarget(card, player, target) {
			if (player == target || !player.inRange(target)) {
				return false;
			}
			if (player.identity == "unknown") {
				if (!player.wontYe("wu")) {
					return true;
				}
				return target.identity != "wu";
			}
			return target.isEnemyOf(player);
		},
		selectTarget: -1,
		filterCard: () => false,
		selectCard: [0, 1],
		multitarget: true,
		multiline: true,
		content() {
			"step 0";
			player.awakenSkill("duwu");
			player.addSkill("duwu_count");
			targets.sortBySeat();
			event.players = targets.slice(0);
			game.delayx();
			player.chooseJunlingFor(event.players[0]).set("prompt", "为所有目标角色选择军令牌");
			"step 1";
			event.junling = result.junling;
			event.targets = result.targets;
			event.num = 0;
			"step 2";
			if (num < event.players.length) {
				event.current = event.players[num];
			}
			if (event.current && event.current.isAlive()) {
				event.current
					.chooseJunlingControl(player, event.junling, targets)
					.set("prompt", "黩武")
					.set("choiceList", ["执行该军令", "不执行该军令并受到1点伤害"])
					.set("ai", function () {
						var evt = _status.event.getParent(2);
						var junlingEff = get.junlingEffect(evt.player, evt.junling, evt.current, evt.targets, evt.current);
						var damageEff = get.damageEffect(evt.current, evt.player, evt.current);
						var attitudeSelf = get.attitude(evt.current, evt.current);
						var drawEff = get.effect(evt.player, { name: "draw" }, evt.player, evt.current);

						return junlingEff > damageEff / attitudeSelf + drawEff ? 0 : 1;
					});
			} else {
				event.goto(4);
			}
			"step 3";
			if (result.index == 0) {
				event.current.carryOutJunling(player, event.junling, targets);
			} else {
				player.draw();
				event.current.damage();
			}
			"step 4";
			game.delayx();
			event.num++;
			if (event.num < event.players.length) {
				event.goto(2);
			}
			"step 5";
			var list = player.getStorage("duwu_count").filter(function (target) {
				return target.isAlive();
			});
			if (list.length) {
				player.loseHp();
			}
			player.removeSkill("duwu_count");
		},
		animationColor: "wood",
		ai: {
			order: 2,
			result: {
				player(player) {
					if (
						game.countPlayer(function (current) {
							return !current.isFriendOf(player) && !player.inRange(current);
						}) <= Math.min(2, Math.max(0, game.roundNumber - 1))
					) {
						return 1;
					}
					if (player.hp == 1) {
						return 1;
					}
					return 0;
				},
			},
			threaten: 1.4,
		},
		subSkill: {
			count: {
				sub: true,
				trigger: { global: "dyingBegin" },
				silent: true,
				charlotte: true,
				filter(event, player) {
					return event.getParent("duwu").player == player;
				},
				content() {
					player.markAuto("duwu_count", [trigger.player]);
				},
			},
		},
	},

// ========== sunluyu 孙鲁育 ==========
	// 穆穆：准备阶段，你可以弃置一张牌，移动场上的一张装备牌（可以替换原装备）。 参考stdmumu(sixiang)
	mumu: {
		skillAnimation: true,
		animationColor: "wood",
		audio: "mumu",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countDiscardableCards(player, "h");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(get.prompt2(event.skill), "h")
				.set("ai", card => {
					if (get.event().goon) {
						return 6 - get.value(card);
					}
					return 0;
				})
				.set("goon", player.canMoveCard(true, true))
				.forResult();
		},
		async content(event, trigger, player) {
			if (player.canMoveCard(null, true, null, null, null, "canReplace")) {
				await player.moveCard({ nojudge: true, canReplace: true });
			}
		},
	},

	// 止息：锁定技，当一名角色使用【杀】或伤害类锦囊牌时，若你在其攻击范围内，且你已受伤，你可以令其弃置一张牌。 参考skill_old.js
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
		ai: {
			threaten: 0.9,
		},
	},

// ========== buzhi 步骘 ==========
	// 弘德：每回合限一次，当你一次性得到或失去至少两张牌后，你可以令一名其他角色摸等量的牌（至多为4）。 参考hongde(sp)
	hongde: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		usable: 1,
		trigger: {
			player: ["loseAfter", "gainAfter"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		direct: true,
		filter(event, player) {
			var num = event.getl(player).cards2.length;
			if (event.getg) {
				num = Math.max(num, event.getg(player).length);
			}
			return num > 1;
		},
		async content(event, trigger, player) {
			var num = trigger.getl(player).cards2.length;
			if (trigger.getg) {
				num = Math.max(num, trigger.getg(player).length);
			}
			num = Math.min(num, 4);
			const result = await player
				.chooseTarget(get.prompt("hongde"), "令一名其他角色摸" + get.cnNumber(num) + "张牌", function (card, player, target) {
					return target != player;
				})
				.set("ai", function (target) {
					return get.attitude(get.player(), target);
				})
				.set("num", num)
				.forResult();
			if (result.bool) {
				player.logSkill("hongde", result.targets);
				await result.targets[0].draw(num);
			}
		},
	},

	// 定叛：出牌阶段每个势力限一次，你可以令一名装备区有牌的角色摸一张牌，其选择一项：1.获得装备区所有牌，然后你对其造成1点伤害；2.你弃置其装备区一张牌。 参考dingpan(sp)
	dingpan: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(target => lib.skill.dingpan.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			return target.countCards("e") > 0;
		},
		usable(skill, player) {
			let num,
				mode = get.mode();
			if (mode == "identity" || mode == "doudizhu") {
				if (mode == "identity" && _status.mode == "purple") {
					num = player.getEnemies().length;
				} else {
					num = get.population("fan");
				}
			} else if (mode == "versus") {
				if (!_status.mode || _status.mode != "two") {
					num = player.getEnemies().length;
				} else {
					const target = game.findPlayer(x => {
						return !game.hasPlayer(y => {
							return x != y && y.getFriends().length > x.getFriends().length;
						});
					});
					num = target ? target.getFriends(true).length : 1;
				}
			} else {
				num = get.population ? get.population(null, player) : 1;
			}
			return num;
		},
		async content(event, trigger, player) {
			const { target } = event;
			await target.draw();
			let goon = get.damageEffect(target, player, target) >= 0;
			if (!goon && target.hp >= 4 && get.attitude(player, target) < 0) {
				const es = target.getCards("e");
				for (let i = 0; i < es.length; i++) {
					if (get.equipValue(es[i], target) >= 8) {
						goon = true;
						break;
					}
				}
			}
			const result = await target
				.chooseControl(function () {
					if (_status.event.goon) {
						return "选项一";
					}
					return "选项二";
				})
				.set("goon", goon)
				.set("prompt", "定叛")
				.set("choiceList", ["获得" + get.translation(player) + "装备区里的所有牌，然后令其对你造成1点伤害", "令" + get.translation(player) + "弃置你装备区里的一张牌"])
				.forResult();
			if (result.control == "选项二") {
				await player.discardPlayerCard(target, true, "e");
				event.finish();
				return;
			}
			await target.gain(target.getCards("e"), "gain2");
			await game.delay(0.5);
			await target.damage();
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					if (get.damageEffect(target, player, target) >= 0) {
						return 2;
					}
					var att = get.attitude(player, target);
					if (att == 0) {
						return 0;
					}
					var es = target.getCards("e");
					if (att > 0 && (target.countCards("h") > 2 || target.needsToDiscard(1))) {
						return 0;
					}
					if (es.length == 1 && att > 0) {
						return 0;
					}
					for (var i = 0; i < es.length; i++) {
						var val = get.equipValue(es[i], target);
						if (val <= 4) {
							if (att > 0) {
								return 1;
							}
						} else if (val >= 7) {
							if (att < 0) {
								return -1;
							}
						}
					}
					return 0;
				},
			},
			threaten: 1.1,
		},
	},

// ========== sunhao 孙皓 ==========
	// 残蚀：摸牌阶段，你可以多摸X张牌（X为已受伤的角色数），然后当你本回合使用【杀】或普通锦囊牌时，你弃置一张牌。 参考canshi(sp)
	canshi: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		check(event, player) {
			var num = game.countPlayer(function (current) {
				if (player.hasSkill("guiming") && current != player && current.group !== "unknown" && player.group !== "unknown" && current.group === player.group) {
					return true;
				}
				return current.isDamaged();
			});
			return num > 0;
		},
		prompt(event, player) {
			var num = game.countPlayer(function (current) {
				if (player.hasSkill("guiming") && current != player && current.group !== "unknown" && player.group !== "unknown" && current.group === player.group) {
					return true;
				}
				return current.isDamaged();
			});
			return "残蚀：是否发动，多摸" + get.cnNumber(num) + "张牌？";
		},
		content() {
			var num = game.countPlayer(function (current) {
				if (player.hasSkill("guiming") && current != player && current.group !== "unknown" && player.group !== "unknown" && current.group === player.group) {
					return true;
				}
				return current.isDamaged();
			});
			if (num > 0) {
				player.draw(num);
			}
			player.addTempSkill("canshi_effect");
		},
		ai: {
			threaten: 0.9,
		},
		subSkill: {
			effect: {
				audio: "canshi",
				mod: {
					aiOrder(player, card, num) {
						if (!["basic", "trick"].includes(get.type2(card))) {
							return;
						}
						if (!player.needsToDiscard()) {
							return 0.1;
						}
					},
				},
				trigger: { player: "useCard" },
				forced: true,
				filter(event, player) {
					if (player.countCards("he") == 0) {
						return false;
					}
					if (event.card.name == "sha") {
						return true;
					}
					return get.type(event.card) == "trick" && get.subtype(event.card) != "trick_delay";
				},
				autodelay: true,
				async content(event, trigger, player) {
					await player
						.chooseToDiscard(true, "he", card => {
							const { player, usefulCards } = get.event();
							if (usefulCards.includes(card)) {
								return 0.1;
							}
							return 20 - get.value(card);
						})
						.set(
							"usefulCards",
							player.getDiscardableCards(player, "h", card => player.getUseValue(card))
						);
				},
			},
		},
	},

	// 仇海：锁定技，当你受到【杀】造成的伤害时，若你没有手牌，此伤害+1。 参考chouhai(sp)
	chouhai: {
		audio: 2,
		trigger: { player: "damageBegin3" },
		forced: true,
		check() {
			return false;
		},
		filter(event, player) {
			return event.card && event.card.name == "sha" && player.countCards("h") == 0;
		},
		content() {
			trigger.num++;
		},
		ai: {
			neg: true,
			effect: {
				target(card, player, target, current) {
					if (card.name == "sha" && target.countCards("h") == 0) {
						return [1, -2];
					}
				},
			},
		},
	},

	// 归命：锁定技，当你发动“残蚀”时，同势力角色视为已受伤。 参考guiming(sp)
	guiming: {
		audio: 2,
		locked: true,
		ai: { combo: "canshi" },
	},

// ========== kanze 阚泽 ==========
	// 下书：出牌阶段开始时，你可以将所有手牌交给一名其他角色，然后该角色亮出任意数量的手牌，你选择一项：1.获得其亮出的手牌；2.获得其未亮出的手牌。 参考xiashu(sp)
	xiashu: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		direct: true,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const hs = player.getCards("h");
			let maxval = 0;
			for (let i = 0; i < hs.length; i++) {
				maxval = Math.max(maxval, get.value(hs[i]));
			}
			const result = await player
				.chooseTarget(get.prompt2("xiashu"), lib.filter.notMe)
				.set("ai", function (target) {
					var player = _status.event.player;
					var maxval = _status.event.maxval;
					var dh = target.countCards("h") - player.countCards("h");
					var att = get.attitude(player, target);
					if (target.hasSkill("qingjian")) {
						return false;
					}
					if (dh <= 0) {
						return 0;
					}
					if (att > 0) {
						return 0.1;
					}
					if (maxval >= 8) {
						return 0;
					}
					if (att == 0) {
						return 0.2;
					}
					if (dh >= 3) {
						return dh;
					}
					if (dh == 2) {
						if (maxval <= 7) {
							return dh;
						}
					}
					if (maxval <= 6) {
						return dh;
					}
					return 0;
				})
				.set("maxval", maxval)
				.forResult();
			if (result.bool) {
				player.logSkill("xiashu", result.targets);
				event.target = result.targets[0];
				await player.give(hs, event.target);
			} else {
				event.finish();
				return;
			}
			const hs2 = event.target.getCards("h");
			if (!hs2.length) {
				event.finish();
				return;
			}
			hs2.sort(function (a, b) {
				return get.value(b, player, "raw") - get.value(a, player, "raw");
			});
			const result2 = await event.target
				.chooseCard([0, hs2.length], "展示任意数量的手牌", true, "allowChooseAll")
				.set("ai", function (card) {
					var rand = _status.event.rand;
					var list = _status.event.list;
					if (_status.event.att) {
						if (ui.selected.cards.length >= Math.ceil(list.length / 2)) {
							return 0;
						}
						var value = get.value(card);
						if (_status.event.getParent().player.isHealthy()) {
							value += (get.tag(card, "damage") ? 1.5 : 0) + (get.tag(card, "draw") ? 2 : 0);
						}
						return value;
					}
					if (ui.selected.cards.length >= Math.floor(list.length / 2)) {
						return 0;
					}
					return list.indexOf(card) % 2 == rand ? 1 : 0;
				})
				.set("rand", Math.random() < 0.6 ? 1 : 0)
				.set("list", hs2)
				.set("att", get.attitude(event.target, player) > 0)
				.forResult();
			const showNext = event.target.showCards(result2.cards);
			event.cards1 = result2.cards;
			event.cards2 = event.target.getCards("h", function (card) {
				return !event.cards1.includes(card);
			});
			await showNext;
			let choice;
			const num1 = event.cards1.length;
			const num2 = event.cards2.length;
			if (get.attitude(event.target, player) > 0 && num1 >= num2) {
				choice = 0;
			} else if (num1 == num2) {
				choice = Math.random() < 0.45 ? 0 : 1;
			} else if (num1 > num2) {
				if (num1 - num2 == 1) {
					choice = Math.random() < 0.6 ? 0 : 1;
				} else {
					choice = 0;
				}
			} else {
				if (num2 - num1 == 1) {
					choice = Math.random() < 0.6 ? 1 : 0;
				} else {
					choice = 1;
				}
			}
			const result3 = await player
				.chooseControl(function (event, player) {
					return _status.event.choice;
				})
				.set("choiceList", ["获得" + get.translation(event.target) + "展示的牌", "获得" + get.translation(event.target) + "未展示的牌"])
				.set("choice", choice)
				.forResult();
			if (result3.index == 0) {
				await player.gain(event.cards1, event.target, "give", "bySelf");
			} else {
				await player.gain(event.cards2, event.target, "giveAuto", "bySelf");
			}
		},
		ai: {
			expose: 0.1,
		},
	},

	// 宽释：你的回合内，你可以在相应时机使用一个你的本回合已使用或失效的无标签技能。 参考skill_old.js
	// 宽释：不是把某个技能的效果再执行一次，而是点技能后列出候选，把其中一个"本回合已经用掉/失效"的技能刷新回可用状态，
	// 让它之后能按自己正常的触发条件重新发动。候选必须是"无标签"(非锁定技)、且这回合已经因为次数限制用不了了的技能——
	// 一直可以用、不会"失效"的技能(比如无使用次数限制的受伤后触发技)没有东西可刷，不列入候选。
	kuanshi: {
		aiShowTag: "support",
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return lib.skill.kuanshi.getCandidates(player).length > 0;
		},
		getCandidates(player) {
			return player.getSkills(null, false, false).filter(name => {
				if (name == "kuanshi") {
					return false;
				}
				const info = get.info(name);
				if (!info || info.locked || info.sourceSkill) {
					return false;
				}
				// countSkill会自动合并stat.skill/stat.triggerSkill/useSkill历史记录三种统计口径，
				// 不同类型的技能（enable主动技 vs trigger触发技）实际用的口径不一样，不能只读某一个
				const used = player.countSkill(name);
				if (!used) {
					// 一次都没发动过，谈不上"已使用或失效"
					return false;
				}
				if (typeof info.usable == "number") {
					// 有明确次数限制的技能，要用满次数才算"失效"
					return used >= info.usable;
				}
				// 没有usable字段的技能大多靠自身触发时机天然限定一回合一次（比如phaseUseBegin），
				// 只要这回合真发动过一次就算已经用掉，不然getCandidates永远是空的，宽释按钮都点不开
				return true;
			});
		},
		async cost(event, trigger, player) {
			const list = lib.skill.kuanshi.getCandidates(player);
			const result = await player.chooseButton(["宽释：选择一个本回合已用完次数的技能，重置其可用次数", [list, "skill"]], false).forResult();
			if (result && result.bool && result.links && result.links.length) {
				event.result = { bool: true, cost_data: result.links[0] };
			} else {
				event.result = { bool: false };
			}
		},
		async content(event, trigger, player) {
			const name = event.cost_data;
			if (!name || !lib.skill[name]) {
				return;
			}
			// countSkill会看stat.skill/stat.triggerSkill两个统计口径里任意一个是数字的那个，
			// 不确定这个技能实际记在哪一个里，两个都清掉才能保证countSkill重新算出0
			const statSkill = player.getStat("skill");
			const statTrigger = player.getStat("triggerSkill");
			if (typeof statSkill[name] == "number") {
				statSkill[name] = 0;
			}
			if (typeof statTrigger[name] == "number") {
				statTrigger[name] = 0;
			}
			game.log(player, "发动了", "#g【宽释】", "，重置了", "#y" + get.translation(name));
			player.markSkill(name);
		},
		ai: {
			threaten: 1,
			order: 3,
		},
	},

// ========== lvdai 吕岱 ==========
	// 勤国：每回合限三次，当有装备牌置入你的装备区后，你可以视为使用一张无距离限制且不计入次数限制的【杀】；当你的装备区里的牌数变化后，若你的装备区里的牌数等于你的体力值，你回复1点体力。 参考xinfu_qinguo
	qinguo: {
		audio: "qinguo_use",
		group: "qinguo_recover",
		trigger: { player: "equipAfter" },
		usable: 3,
		direct: true,
		async content(event, trigger, player) {
			await player.chooseUseTarget({ name: "sha", isCard: true }, get.prompt("qinguo"), "你可以视为使用一张无距离限制且不计入次数限制的【杀】", false, "nodistance").set("logSkill", "qinguo");
		},
		subSkill: {
			recover: {
				audio: "qinguo_use",
				trigger: {
					player: "loseAfter",
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				prompt: "是否发动【勤国】回复1点体力？",
				filter(event, player) {
					if (player.isHealthy() || player.countCards("e") != player.hp) {
						return false;
					}
					var evt = event.getl(player);
					if (event.name == "equip" && event.player == player) {
						return event.cards.length != (evt.es?.length ?? 0);
					}
					return evt && evt.es.length;
				},
				frequent: true,
				content() {
					player.recover();
				},
			},
		},
		ai: {
			threaten: 1.3,
			effect: {
				target(card, player, target, current) {
					if (
						get.type(card) == "equip" &&
						!get.cardtag(card, "gifts") &&
						game.hasPlayer(function (current) {
							return target.canUse("sha", current);
						})
					) {
						return [1, 1.5];
					}
				},
			},
			noe: true,
			reverseEquip: true,
			skillTagFilter(player, tag, arg) {
				if (tag == "noe") {
					return player.countCards("e") == player.hp + 1;
				}
				return game.hasPlayer(function (current) {
					return player.canUse("sha", current);
				});
			},
		},
	},

// ========== zhoufang 周鲂 ==========
	// 断发：出牌阶段，你可以弃置任意张黑色牌，然后摸等量的牌（你每阶段以此法弃置的牌数之和不能大于体力上限）。 参考xinfu_duanfa
	duanfa: {
		init(player) {
			player.storage.duanfa = 0;
		},
		audio: 2,
		enable: "phaseUse",
		position: "he",
		filter(card, player) {
			return player.storage.duanfa < player.maxHp;
		},
		filterCard(card, player) {
			if (!lib.filter.cardDiscardable(card, player)) {
				return false;
			}
			return get.color(card) == "black";
		},
		selectCard() {
			var player = _status.event.player;
			return [1, player.maxHp - player.storage.duanfa];
		},
		check(card) {
			return 6 - get.value(card);
		},
		delay: false,
		allowChooseAll: true,
		content() {
			player.draw(cards.length);
			player.storage.duanfa += cards.length;
		},
		group: "duanfa_clear",
		subSkill: {
			clear: {
				trigger: {
					player: "phaseBefore",
				},
				forced: true,
				silent: true,
				popup: false,
				content() {
					player.storage.duanfa = 0;
				},
				sub: true,
			},
		},
		ai: {
			order: 4,
			result: {
				player: 1,
			},
		},
	},

	// 诱敌：结束阶段，你可以令一名其他角色弃置你的一张手牌，若此牌不为：【杀】，你获得其一张牌；黑色牌，你摸一张牌。 参考xinfu_youdi
	youdi: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		trigger: {
			player: "phaseJieshuBegin",
		},
		direct: true,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			let result = await player
				.chooseTarget(get.prompt2("youdi"), function (card, player, target) {
					return player != target;
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					if (player.countCards("h", "sha") > player.countCards("h") / 3 && player.countCards("h", { color: "red" }) > player.countCards("h") / 2) {
						return 0;
					}
					if (target.countCards("he") == 0) {
						return 0.1;
					}
					return -get.attitude(_status.event.player, target);
				})
				.forResult();
			if (result.bool) {
				const delayNext = game.delay();
				player.logSkill("youdi", result.targets);
				event.target = result.targets[0];
				const discardNext = event.target.discardPlayerCard(player, "h", true);
				await delayNext;
				const discardResult = await discardNext.forResult();
				if (discardResult) {
					result = discardResult;
				}
				if (get.color(result.links[0]) != "black") {
					await player.draw("nodelay");
				}
				if (result.links[0].name != "sha" && event.target.countCards("he")) {
					await player.gainPlayerCard("he", event.target, true);
				}
			} else {
				event.finish();
			}
		},
		ai: {
			expose: 0.3,
			threaten: 1.4,
		},
	},

// ========== sunru 孙茹 ==========
	// 影箭：准备阶段，你可以视为使用一张无距离限制的冰【杀】。 参考yingjian(mobile)
	yingjian: {
		skillAnimation: true,
		animationColor: "wood",
		trigger: { player: "phaseZhunbeiBegin" },
		direct: true,
		audio: "qingyi",
		async content(event, trigger, player) {
			player.chooseUseTarget("###是否发动【影箭】？###视为使用一张没有距离限制的冰【杀】", { name: "sha", nature: "ice" }, false, "nodistance").logSkill = "yingjian";
		},
		ai: {
			threaten(player, target) {
				return 1.6;
			},
		},
	},

	// 释矍：锁定技，防止你受到的所有火焰伤害和传导伤害。 参考shixin(mobile)（原技能"释衅"仅防火焰伤害，卡面第二技能与原技能不同名，视为全新技能，此处沿用其防止火焰伤害的实现，因传导伤害本质仍是火焰伤害，已被一并防止）
	shijue: {
		audio: 2,
		trigger: { player: "damageBegin4" },
		filter(event) {
			return event.hasNature("fire");
		},
		forced: true,
		async content(event, trigger, player) {
			trigger.cancel();
		},
		ai: {
			nofire: true,
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "fireDamage")) {
						return "zeroplayertarget";
					}
				},
			},
		},
	},

// ========== liuzan 留赞 ==========
	// 奋音：锁定技，你的回合内，当一张牌进入弃牌堆后，若此回合内没有此花色的牌进入过弃牌堆，你摸一张牌。 参考refenyin(xianding)
	fenyin: {
		audio: 2,
		audioname: ["wufan"],
		trigger: { global: ["loseAfter", "cardsDiscardAfter", "loseAsyncAfter", "equipAfter"] },
		forced: true,
		filter(event, player) {
			if (player !== _status.currentPhase) {
				return false;
			}
			const cards = event.getd();
			if (!cards.length) {
				return false;
			}
			const list = [];
			let num = cards.length;
			for (let i = 0; i < cards.length; i++) {
				const card = cards[i];
				list.add(get.suit(card, false));
			}
			game.getGlobalHistory("cardMove", evt => {
				if (evt.name !== "lose" && evt.name !== "cardsDiscard") {
					return false;
				}
				if (evt.name === "lose" && evt.position !== ui.discardPile) {
					return false;
				}
				if (evt === event || evt.getParent() === event) {
					return false;
				}
				num += evt.cards.length;
				for (let i = 0; i < evt.cards.length; i++) {
					const card = evt.cards[i];
					list.remove(get.suit(card, evt.cards2 && evt.cards2.includes(card) ? evt.player : false));
				}
			});
			player.storage.fenyin_mark2 = num;
			return list.length > 0;
		},
		async content(event, trigger, player) {
			const list = [];
			const list2 = [];
			const cards = trigger.getd();
			for (let i = 0; i < cards.length; i++) {
				const card = cards[i];
				const suit = get.suit(card, false);
				list.add(suit);
				list2.add(suit);
			}
			game.getGlobalHistory("cardMove", evt => {
				if (evt.name !== "lose" && evt.name !== "cardsDiscard") {
					return false;
				}
				if (evt.name === "lose" && evt.position !== ui.discardPile) {
					return false;
				}
				if (evt === trigger || evt.getParent() === trigger) {
					return false;
				}
				for (let i = 0; i < evt.cards.length; i++) {
					const card = evt.cards[i];
					const suit = get.suit(card, false);
					list.remove(suit);
					list2.add(suit);
				}
			});
			list2.sort();
			player.draw(list.length);
			player.storage.fenyin_mark = list2;
			player.addTempSkill("fenyin_mark");
			player.markSkill("fenyin_mark");
		},
		subSkill: {
			mark: {
				charlotte: true,
				onremove(player) {
					delete player.storage.fenyin_mark;
					delete player.storage.fenyin_mark2;
				},
				intro: {
					content(s, p) {
						let str = "本回合已经进入过弃牌堆的卡牌的花色：";
						for (let i = 0; i < s.length; i++) {
							str += get.translation(s[i]);
						}
						str += "<br>本回合进入过弃牌堆的牌数：";
						str += p.storage.fenyin_mark2;
						return str;
					},
				},
			},
		},
	},

	// 力激：出牌阶段限一次，若本回合进入弃牌堆的牌包含所有花色，你可以弃置一张牌，然后对一名其他角色造成1点伤害。 参考liji(xianding)
	liji: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		filterCard: true,
		position: "he",
		filter(event, player) {
			return (player.storage.fenyin_mark || []).length >= 4;
		},
		check(card) {
			return 8 - get.value(card);
		},
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			await event.target.damage("nocard");
		},
		ai: {
			threaten: 1.1,
			order: 6,
			result: {
				target: -1.5,
			},
			tag: {
				damage: 1,
			},
		},
	},

// ========== xuezong 薛综 ==========
	// 复难：当其他角色的牌因响应你使用的牌或被你抵消而进入弃牌堆后，你可以获得之（每回合每种类别限一次）。 参考mbfunan(mobile)/funan(yijiang)：respondTo=[原牌使用者,原牌]这个字段是判断"响应/抵消"关系的关键——事件的player是别人、respondTo[0]是我时属于"别人响应了我"；事件的player是我、respondTo[0]是别人时属于"我抵消/响应了别人的牌"（这次按后一种情况补上了原来完全没覆盖的"我用闪抵消别人的杀、我用无懈抵消别人的锦囊"）
	funan: {
		audio: 2,
		trigger: { global: ["respond", "useCard"] },
		filter(event, player) {
			if (!event.respondTo) {
				return false;
			}
			const responder = event.player,
				respondPlayer = event.respondTo[0];
			let type, cards;
			if (responder !== player && respondPlayer === player) {
				type = "respond";
				cards = event.cards;
			} else if (responder === player && respondPlayer !== player && event.card) {
				// 只有真正让对方那张牌"抵消/失效"的响应才算：无懈可击必定如此；闪则只有响应单目标的
				// 【杀】才算抵消，响应万箭齐发这类需要打闪的群体锦囊时，闪只是保护自己，那张锦囊
				// 本身照常结算，不算抵消
				const original = event.respondTo[1];
				const originalName = get.itemtype(original) == "card" ? original.name : null;
				if (event.card.name == "wuxie" || (event.card.name == "shan" && originalName == "sha")) {
					type = "counter";
					cards = get.itemtype(original) == "card" ? [original] : original?.cards || [];
				}
			}
			if (!type || !cards) {
				return false;
			}
			cards = cards.filterInD("od");
			if (!cards.length) {
				return false;
			}
			if ((player.storage.funan_used || []).includes(type)) {
				return false;
			}
			event._funanType = type;
			event._funanCards = cards;
			return true;
		},
		check(event, player) {
			return get.value(event._funanCards) > 0;
		},
		logTarget(event, player) {
			return event.player;
		},
		async content(event, trigger, player) {
			player.storage.funan_used = (player.storage.funan_used || []).concat(trigger._funanType);
			await player.gain(trigger._funanCards, "gain2");
		},
		subSkill: {
			clear: {
				trigger: { player: "phaseZhunbeiBegin" },
				forced: true,
				silent: true,
				popup: false,
				content() {
					delete player.storage.funan_used;
				},
			},
		},
		group: "funan_clear",
		ai: {
			threaten: 0.9,
			expose: 0.2,
		},
	},

	// 诫训：结束阶段，你可以令一名角色弃置一张手牌，然后若此牌的花色为：♦，其摸两张牌；♥，回复1点体力。 参考jiexun(yijiang)（原技能机制不同，此处按描述重写）
	jiexun: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current.countCards("h") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("jiexun"), "令一名角色弃置一张手牌", function (card, player, target) {
					return target.countCards("h") > 0;
				})
				.set("ai", function (target) {
					return get.attitude(_status.event.player, target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await target
				.chooseToDiscard("h", true, 1)
				.set("ai", card => {
					const chooser = get.player();
					if (get.suit(card, chooser) == "diamond") {
						return 10 - get.value(card);
					}
					if (get.suit(card, chooser) == "heart" && chooser.isDamaged()) {
						return 9 - get.value(card);
					}
					return 5 - get.value(card);
				})
				.forResult();
			if (!result || !result.cards || !result.cards.length) {
				return;
			}
			const card = result.cards[0];
			const suit = get.suit(card, target);
			if (suit === "diamond") {
				await target.draw(2);
			} else if (suit === "heart") {
				await target.recover();
			}
		},
		ai: {
			order: 4,
			result: {
				target: 1,
			},
		},
	},

// ========== luji 陆绩 ==========
	// 怀橘：锁定技，你首次明置此武将时，你获得3枚“阴阳鱼”标记；当同势力角色受到伤害时，其可以弃1枚“阴阳鱼”标记，防止此伤害。 参考skill_old.js
	huaiju: {
		skillAnimation: true,
		animationColor: "wood",
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.toShow.includes("luji") && !player.storage.huaiju_inited;
		},
		// 若陆绩是作为第三个武将(3将模式)获得的，一开始就是明置状态，没有showCharacterAfter这个环节。
		init(player, skill) {
			if (!player.storage.huaiju_inited && isCharacterShown(player, skill)) {
				player.storage.huaiju_inited = true;
				player.addMark("yinyang_mark", 3, false);
			}
		},
		content(event, trigger, player) {
			player.storage.huaiju_inited = true;
			player.addMark("yinyang_mark", 3, false);
		},
		ai: {
			threaten: 0.7,
		},
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

	// 遗礼：摸牌阶段，你可以少摸一张牌或流失一点体力，获得2枚“阴阳鱼”标记，然后你可以令任意名其他角色各获得你的1枚“阴阳鱼”标记。 参考skill_old.js
	yili: {
		skillAnimation: true,
		animationColor: "wood",
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
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
			player.addMark("yinyang_mark", 2, false);
			const others = game.filterPlayer(current => current != player);
			if (!others.length) {
				return;
			}
			const giveResult = await player
				.chooseTarget("遗礼：你可以令任意名其他角色各获得你的1枚“阴阳鱼”标记", [0, others.length], (card, player, target) => target != player)
				.forResult();
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

// ========== sunliang 孙亮 ==========
	// 溃诛：弃牌阶段结束时，你可以选择一项：1.令至多X名角色各摸一张牌；2.对任意名体力值之和不大于X的角色各造成1点伤害。（X为你此阶段弃置的牌数） 参考xinkuizhu(mobile)
	kuizhu: {
		audio: "nzry_kuizhu",
		trigger: { player: "phaseDiscardAfter" },
		filter(event, player) {
			return player.getHistory("lose", function (evt) {
				return evt.type == "discard" && evt.getParent("phaseDiscard") == event;
			}).length;
		},
		direct: true,
		async content(event, trigger, player) {
			var cards = [];
			player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard") == trigger) {
					cards.addArray(evt.cards2);
				}
			});
			var num = cards.length;
			var str1 = "令至多" + num + "名角色各摸一张牌";
			var str2 = "对任意名体力值之和不大于" + num + "的角色各造成1点伤害";
			var result = await player
				.chooseControl("cancel2")
				.set("ai", function () {
					if (
						game.countPlayer(function (current) {
							return get.attitude(player, current) < 0 && current.hp <= event.num;
						}) > 0 &&
						event.num <= 3
					) {
						return 1;
					}
					return 0;
				})
				.set("choiceList", [str1, str2])
				.set("prompt", "是否发动【溃诛】？")
				.set("num", num)
				.forResult();
			if (result.control == "cancel2") {
				return;
			}
			var control = [str1, str2][result.index];
			if (control == str2) {
				var result2 = await player
					.chooseTarget("请选择〖溃诛〗的目标", [1, game.countPlayer()], function (card, player, target) {
						var targets = ui.selected.targets;
						var sum = 0;
						for (var i = 0; i < targets.length; i++) {
							sum += targets[i].hp;
						}
						return sum + target.hp <= _status.event.num;
					})
					.set("ai", function (target) {
						return get.attitude(player, target) < 0 ? 1 : -1;
					})
					.set("num", num)
					.forResult();
				if (!result2.bool) {
					return;
				}
				var targets = result2.targets.sortBySeat();
				player.logSkill("kuizhu", targets);
				for (var i of targets) {
					await i.damage();
				}
				return;
			}
			var result2 = await player
				.chooseTarget("请选择〖溃诛〗的目标", "令至多" + get.cnNumber(num) + "名角色各摸一张牌", [1, num])
				.set("ai", function (target) {
					return get.attitude(_status.event.player, target);
				})
				.forResult();
			if (!result2.bool) {
				return;
			}
			var targets = result2.targets.sortBySeat();
			player.logSkill("kuizhu", targets);
			await game.asyncDraw(targets);
		},
		ai: {
			threaten: 1.3,
		},
	},

	// 立军：其他同势力角色的出牌阶段限一次，其使用【杀】结算结束后，其可以将此【杀】交给你。 参考xinlijun(mobile)
	lijun: {
		audio: "nzry_lijun1",
		trigger: { global: "useCardAfter" },
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			if (_status.currentPhase != event.player || event.player == player) {
				return false;
			}
			if (!event.player.isFriendOf(player)) {
				return false;
			}
			return event.cards.filterInD().length;
		},
		direct: true,
		async content(event, trigger, player) {
			const bool = await trigger.player
				.chooseBool(get.prompt("lijun"), "将" + get.translation(trigger.cards) + "交给" + get.translation(player))
				.set("choice", get.attitude(trigger.player, player) > 0)
				.forResult();
			if (!bool.bool) {
				return;
			}
			player.logSkill("lijun", trigger.player);
			await player.gain(trigger.cards.filterInD(), "gain2");
			const bool2 = await player
				.chooseBool()
				.set("prompt", "是否令" + get.translation(trigger.player) + "摸一张牌？")
				.set("choice", get.attitude(player, trigger.player) > 0)
				.forResult();
			if (bool2.bool) {
				await trigger.player.draw();
			}
		},
	},

// ========== xugong 许贡 ==========
	// 表召：出牌阶段限一次，你可以视为对一名角色使用一张【知己知彼】。然后，你可以选择另一名角色，令其于下个回合对该角色使用牌无次数限制。若如此做，直到你的下个回合开始，该角色对你造成的伤害+1。 参考gzbiaozhao(guozhan)（原技能机制不同，此处按描述重写）
	biaozhao: {
		audio: "biaozhao",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player;
		},
		content() {
			"step 0";
			player.useCard({ name: "zhibi", isCard: true }, target);
			"step 1";
			const targets = game.filterPlayer(current => current != player && current != target);
			if (!targets.length) {
				event.finish();
				return;
			}
			player
				.chooseTarget("表召：是否选择一名角色，令其于下个回合对" + get.translation(target) + "使用牌无次数限制？", targets)
				.set("ai", cur => get.attitude(_status.event.player, cur))
				.set("targetX", target);
			"step 2";
			if (result.bool) {
				const b = result.targets[0];
				b.addTempSkill("biaozhao_buff", "phaseUseAfter");
				b.storage.biaozhao_buff = target;
				target.addTempSkill("biaozhao_mark", "phaseUseAfter");
				target.storage.biaozhao_mark = player;
			}
		},
		subSkill: {
			buff: {
				charlotte: true,
				mod: {
					cardUsable(card, player, num) {
						if (player.storage.biaozhao_buff) {
							return Infinity;
						}
					},
				},
			},
			mark: {
				charlotte: true,
				intro: { content: "对表召发动者造成的伤害+1，直到下回合开始" },
				trigger: { global: "damageBegin1" },
				filter(event, player) {
					return player.storage.biaozhao_mark && event.player == player.storage.biaozhao_mark && event.source == player;
				},
				forced: true,
				content() {
					trigger.num++;
				},
			},
		},
	},

	// 業仇：锁定技，你死亡时，视为对杀死你的角色依次使用三张无距离限制的【杀】，第一张【杀】不可响应，第二张【杀】无视防具，第三张【杀】伤害+1。 参考gzyechou(guozhan)
	yechou: {
		audio: "yechou",
		trigger: { player: "die" },
		forced: true,
		forceDie: true,
		skillAnimation: true,
		animationColor: "gray",
		logTarget: "source",
		mod: {
			cardRespondable(card, player) {
				if (card.name == "shan" && card.storage && card.storage.yechou_unresp) {
					return false;
				}
			},
		},
		filter(event, player) {
			return event.source && event.source.isIn() && player.canUse("sha", event.source, false);
		},
		content() {
			"step 0";
			var target = trigger.source;
			event.target = target;
			player
				.useCard({ name: "sha", isCard: true, storage: { yechou_unresp: true } }, target)
				.set("forceDie", true)
				.set("oncard", function () {
					_status.event.directHit.addArray(game.filterPlayer());
				});
			"step 1";
			if (!target.isIn() || !player.canUse("sha", target, false)) {
				event.goto(3);
			} else {
				player.addTempSkill("yechou_unequip");
				player
					.useCard({ name: "sha", isCard: true }, target)
					.set("forceDie", true)
					.set("oncard", function () {
						_status.event.directHit.addArray(game.filterPlayer());
					});
			}
			"step 2";
			player.removeSkill("yechou_unequip");
			if (!target.isIn() || !player.canUse("sha", target, false)) {
				event.goto(3);
			} else {
				player
					.useCard({ name: "sha", isCard: true }, target)
					.set("forceDie", true)
					.set("oncard", function () {
						_status.event.directHit.addArray(game.filterPlayer());
						_status.event.baseDamage++;
					});
			}
			"step 3";
		},
		ai: {
			threaten: 0.001,
		},
		subSkill: {
			unequip: {
				charlotte: true,
				ai: {
					unequip: true,
					skillTagFilter(player, tag, arg) {
						if (!arg || !arg.card || !arg.card.storage || !arg.card.storage.gzyechou) {
							return false;
						}
					},
				},
			},
		},
	},

// ========== luyusheng 陆郁生 ==========
	// 贞特：每回合限一次，当你成为其他角色使用基本牌或普通锦囊牌的目标后，你可以令该角色选择一项：1.本回合不能再使用此颜色的牌；2.此牌对你无效。 参考zhente(huicui)
	// 注：huicui原实现"令此牌对你无效"分支用trigger.untrigger()会连带取消此牌对其他目标的结算，
	// 已改用trigger.excluded.add(player)，仅令此牌对发动者自己无效。
	zhente: {
		skillAnimation: true,
		animationColor: "wood",
		aiShowTag: "support",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		usable: 1,
		filter(event, player) {
			return event.player !== player && ["basic", "trick"].includes(get.type(event.card)) && !event.excluded.includes(player);
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
				trigger.excluded.add(player);
			}
		},
		ai: {
			threaten: 0.7,
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

	// 至微：限定技，一名其他角色的准备阶段，你可以交给其任意张牌。该角色造成伤害后，你摸一张牌；该角色受到伤害后，你弃置一张手牌。你弃牌阶段弃置的牌均被该角色获得。该角色死亡时，重置此技能。
	// 参考huicui包zhiwei/gz_luyusheng包fakezhiwei（陆郁生"至微"）——之前误判为偶然重名的不同技能，实际核心效果(造成/受到伤害摸/弃牌、弃牌阶段的牌归其所有)完全一致，只是本地卡面的发动/重置条件改成了"交给任意张牌激活"和"死亡后重置技能"而非官方的明置/暗置武将牌机制。已按此参考修正："死亡后重置"改用player.restoreSkill()而非直接置storage为false（后者不会清掉awakenedSkills，限定技实际上永远不会真正解锁）。
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
			await player
				.chooseToGive(trigger.player, "he", [0, Infinity])
				.set("prompt", get.prompt2(event.skill))
				.forResult();
			event.result = { bool: true };
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.storage.zhiwei_effect = trigger.player;
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
		mark: "character",
		intro: {
			content: "$造成伤害后你摸一张牌，$受到伤害后你弃置一张手牌；你弃牌阶段弃置的牌均被$获得",
		},
		// group引用的是自动生成的子技能id(父技能id_子技能key)，之前写成"zhiwei_draw"等，
		// 和subSkill实际生成的"zhiwei_effect_draw"对不上，expandSkills找不到这些id直接过滤掉，
		// 导致摸牌/弃牌/获得/清除这四个效果全部从未真正挂载——这就是"没有效果"的原因。
		group: ["zhiwei_effect_draw", "zhiwei_effect_discard", "zhiwei_effect_gain", "zhiwei_effect_clear"],
		subSkill: {
			draw: {
				trigger: { global: "damageEnd" },
				forced: true,
				filter(event, player) {
					return event.source && event.source === player.storage.zhiwei_effect;
				},
				async content(event, trigger, player) {
					await player.draw();
				},
			},
			discard: {
				trigger: { global: "damageEnd" },
				forced: true,
				filter(event, player) {
					return event.player === player.storage.zhiwei_effect && player.countCards("h") > 0;
				},
				async content(event, trigger, player) {
					await player.chooseToDiscard("h", true);
				},
			},
			gain: {
				trigger: { player: "loseAfter", global: "loseAsyncAfter" },
				forced: true,
				filter(event, player) {
					if (event.type !== "discard" || event.getlx === false || event.getParent("phaseDiscard")?.player !== player || !player.storage.zhiwei_effect || !player.storage.zhiwei_effect.isIn()) {
						return false;
					}
					const evt = event.getl(player);
					return evt && evt.cards2.filterInD("d").length > 0;
				},
				async content(event, trigger, player) {
					if (trigger.delay === false) {
						game.delay();
					}
					await player.storage.zhiwei_effect.gain(trigger.getl(player).cards2.filterInD("d"), "gain2");
				},
			},
			clear: {
				trigger: { global: "die" },
				forced: true,
				filter(event, player) {
					return event.player === player.storage.zhiwei_effect;
				},
				async content(event, trigger, player) {
					player.removeSkill("zhiwei_effect");
					player.storage.zhiwei_effect = null;
					player.restoreSkill("zhiwei");
				},
			},
		},
	},

// ========== wujing 吴景 ==========
	// 调归：出牌阶段限一次，你可以将一张牌当【调虎离山】使用，若你的势力因此形成队列或围攻关系，则你摸X张牌（X为该阵法关系人数）；与你势力相同的角色成为【调虎离山】的目标时，其可以摸一张牌并取消之。 参考diaohulishan(card/guozhan.js中已有的调虎离山实现，直接复用而非另写；_trans_merge.md里guozhan包的donggui为暗置武将牌机制，描述不符未采用)
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
			threaten: 1.1,
			order: 6,
			skillTagFilter(player) {
				return !player.storage.diaogui_used;
			},
		},
	},
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

	// 风扬：阵法技，势力与你不同的角色不能弃置或获得与你处于同一队列的角色装备区里的牌。 参考fengyang_old(_merged_skill_all.md中guozhan包"fengyang"这个key实际是完全不同的另一技能——结束阶段弃装备摸两张，描述不符；改按角色定位比对描述后确认fengyang_old的描述与我们一致，但该key在_merged_skill_all.md里也搜不到代码，实际代码取自dist/mode/guozhan编译产物)
	fengyang: {
		aiShowTag: "defense",
		audio: 2,
		locked: true,
		init(player) {
			game.addGlobalSkill("fengyang_share", player);
		},
		onremove(player) {
			game.removeGlobalSkill("fengyang_share", player);
		},
	},
	fengyang_share: {
		charlotte: true,
		mod: {
			canBeDiscarded(card, player, target) {
				if (get.position(card) !== "e") {
					return;
				}
				if (game.hasPlayer(src => src.hasSkill("fengyang") && (src == target || src.inline(target)) && player.isEnemyOf(src))) {
					return false;
				}
			},
			canBeGained(card, player, target) {
				if (get.position(card) !== "e") {
					return;
				}
				if (game.hasPlayer(src => src.hasSkill("fengyang") && (src == target || src.inline(target)) && player.isEnemyOf(src))) {
					return false;
				}
			},
		},
	},

// ========== zhouyi 周夷 ==========
	// 逐寇：当你于一名角色的出牌阶段内第一次造成伤害后，你可以摸X张牌（X为本回合你使用过的牌数且至多为3）。 参考gzzhukou
	// 结构照抄官方（首次伤害判定用getHistory sourceDamage在该出牌阶段内的下标==0），仅将官方"至多为5"按卡面改为"至多为3"。
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
		ai: {
			threaten: 1,
		},
	},

	// 断念：出牌阶段结束时，你可以弃置所有手牌（至少一张），然后将手牌摸至体力上限。 参考gzduannian
	duannian: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseUseEnd" },
		filter(event, player) {
			return player.countCards("h") > 0 && !player.hasCard(card => !lib.filter.cardDiscardable(card, player, "duannian"), "h");
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2(event.skill)).forResult();
		},
		async content(event, trigger, player) {
			await player.discard(player.getCards("h", card => lib.filter.cardDiscardable(card, player, "duannian")));
			await player.drawTo(player.maxHp);
		},
	},

	// 莲佑：当你死亡时，你可以令一名其他角色获得“兴火”。 参考gzlianyou
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

	// 兴火：锁定技，当你造成火焰伤害时，此伤害+1。 参考gzxinghuo
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

// ========== fengxi 冯熙 ==========
	// 玉碎：每回合限一次，当你成为其他角色使用黑色牌的目标后，你可以失去1点体力，然后选择一项：1.令其弃置手牌至手牌数与你相同；2.令其失去体力至体力值与你相同。 参考gzyusui
	// 官方版限定"敌对势力"目标、弃牌数为"其体力上限"，本项目按卡面改为不限势力、弃牌数对齐至我方手牌数。
	yusui: {
		skillAnimation: true,
		animationColor: "wood",
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

	// 驳言：出牌阶段限一次，你可以令一名其他角色将手牌摸至体力上限（至多摸至五张），然后其本回合不能使用或打出手牌。（纵横：出牌阶段限一次，你可以选择一名其他角色，该角色本回合不能使用或打出手牌。） 参考gzboyan
	// 未实现官方"纵横"模式下的联动分支，因本项目未实现"纵横"这一国战子机制。
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
		ai: {
			threaten: 1.2,
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

// ========== sunhuan 孙桓 ==========
	// 逆击：当你成为基本牌或锦囊牌的目标后，你可以摸一张牌。结束阶段，你弃置所有本回合以此法摸到的牌，弃牌前你可以先使用其中一张牌。 参考dcniji(sp2)
	// 官方原实现filter限定"仅基本牌/普通锦囊牌"且要求"使用者不是自己"，改用get.type(card)!=="equip"（非装备牌）扩大范围并去掉多余限制，以匹配描述"基本牌或锦囊牌"；并补充frequent标记。
	niji: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		frequent: true,
		filter(event, player) {
			return get.type(event.card) !== "equip";
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2(event.skill)).forResult();
		},
		async content(event, trigger, player) {
			const next = player.draw();
			next.gaintag.add("niji");
			await next;
			player.addTempSkill("niji_end", { player: "phaseAfter" });
		},
		ai: {
			threaten: 1,
		},
	},
	niji_end: {
		charlotte: true,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.countCards("he", card => card.hasGaintag("niji")) > 0;
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			if (player.countCards("he", card => card.hasGaintag("niji"))) {
				await player.chooseToUse({
					filterCard(card) {
						return card.hasGaintag("niji");
					},
					prompt: get.prompt2("niji"),
					complexSelect: false,
				});
			}
			const cards = player.getCards("he", card => card.hasGaintag("niji"));
			if (cards.length) {
				await player.discard(cards);
			}
		},
	},

// ========== sunchen 孙綝 ==========
	// 自固：出牌阶段限一次，你可以弃置一张牌并获得场上一张装备牌。若你未因此法获得其他角色的牌，你摸一张牌。 参考dczigu
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

	// 作威：每项限一次，当你于回合内使用牌时，若你的手牌数：大于X，你可以弃置一名其他角色一张牌；等于X，你可以对此牌目标角色造成1点伤害；小于X，你可以摸一张牌（X为你装备区的牌数量且至少为1）。 参考dczuowei
	// dczuowei原版三档效果分别为"令此牌不可被响应/对一名其他角色造成1点伤害/摸两张牌且本回合不再触发"，与卡面描述（弃一名其他角色一张牌/对此牌目标造成1点伤害/摸一张牌）不同，已按描述改写三档效果。
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
					.chooseTarget(get.prompt2("zuowei"), (card, player, target) => target != player && target.countCards("he") > 0)
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
		ai: {
			threaten: 1.2,
		},
	},
	zuowei_gt: { charlotte: true },
	zuowei_eq: { charlotte: true },
	zuowei_lt: { charlotte: true },

// ========== sunjun 孙峻 ==========
	// 邀宴：准备阶段，你可以令所有角色依次选择是否于本回合结束时参与议事，若此议事结果为：红色，你获得任意未参与议事的角色各一张手牌；黑色，你可以对一名参与议事的角色造成2点伤害。 参考jsrgyaoyan
	// jsrg原版逐人征询是否参会、回合结束才裁决的流程与卡面差异较大，改用引擎自带的player.chooseToDebate议事原语，在准备阶段直接选定参与者并即时裁决。
	yaoyan: {
		skillAnimation: true,
		animationColor: "wood",
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current !== player);
		},
		async cost(event, trigger, player) {
			event.result = { bool: true };
		},
		async content(event, trigger, player) {
			const targets = game.filterPlayer().sortBySeat();
			const joined = [];
			for (const current of targets) {
				if (!current.isIn()) {
					continue;
				}
				const choice = current === player || get.attitude(current, player) > 0;
				const { bool } = await current
					.chooseBool(`是否响应${get.translation(player)}的【邀宴】，于回合结束参与议事？`)
					.set("choice", choice)
					.forResult();
				if (bool) {
					joined.push(current);
				}
			}
			if (joined.length) {
				player.addTempSkill("yaoyan_hold");
				player.markAuto("yaoyan_hold", joined);
			}
		},
		ai: {
			threaten: 1.1,
			order: 6,
		},
	},
	// 邀宴（延续）：回合结束时，你与本回合中响应邀请的角色进行议事。 参考jsrgyaoyan
	yaoyan_hold: {
		charlotte: true,
		onremove: true,
		intro: {
			content: "已邀请$于回合结束时议事",
		},
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			return (player.getStorage("yaoyan_hold") || []).some(current => current.isIn());
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const joined = player.getStorage("yaoyan_hold").filter(current => current.isIn());
			player.removeSkill("yaoyan_hold");
			await player
				.chooseToDebate([player, ...joined.filter(current => current !== player)])
				.set("callback", async (event, trigger, player) => {
					const { debateResult: result } = event;
					const { red, black } = result;
					const opinion = red.length >= black.length ? "red" : "black";
					if (opinion === "red") {
						const others = game.filterPlayer(current => current !== player && !joined.includes(current) && current.hasGainableCards(player, "h"));
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
				})
				.forResult();
		},
	},

	// 霸政：当你参与的议事意见展示时，本回合受到过你造成伤害的角色的意见视为与你相同。 参考jsrgbazheng
	// jsrgbazheng监听全局debateShowOpinion，对孙峻参与的任意议事(不限于自己发起的邀宴)都生效；
	// 需在议事"展示意见"阶段(而非事后结算回调里)直接修改trigger.red/trigger.black，
	// 这样后续的展示/裁决才会按修改后的阵营计算。
	bazheng: {
		aiShowTag: "control",
		audio: 2,
		trigger: { global: "debateShowOpinion" },
		filter(event, player) {
			if (!event.targets?.includes(player)) {
				return false;
			}
			const damaged = player
				.getHistory("sourceDamage")
				.map(evt => evt.player)
				.toUniqued();
			const colors = ["red", "black"];
			let dissent;
			for (const color of colors) {
				if (event[color]?.some(i => i[0] == player)) {
					dissent = colors.find(i => i != color);
					break;
				}
			}
			return dissent && event[dissent]?.some(i => damaged.includes(i[0]));
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const colors = ["red", "black"];
			let myOpinion, dissent;
			for (const color of colors) {
				if (trigger[color].some(i => i[0] == player)) {
					myOpinion = color;
					dissent = colors.find(i => i != color);
					break;
				}
			}
			const damaged = player
				.getHistory("sourceDamage")
				.map(evt => evt.player)
				.toUniqued();
			for (let i = trigger[dissent].length - 1; i >= 0; i--) {
				const pair = trigger[dissent][i];
				if (damaged.includes(pair[0])) {
					trigger[myOpinion].push(pair);
					trigger[dissent].splice(i, 1);
				}
			}
		},
		intro: {
			content: "锁定技，你参与的议事意见展示时，本回合受到过你造成的伤害的角色的意见视为与你相同",
		},
	},

// ========== chengong 陈宫 ==========
	// 引叛：出牌阶段限一次，你可以选择一名角色，令所有与其势力不同的角色依次选择是否对其使用一张无距离次数限制的【杀】，结算完成后，该角色于其下个回合使用【杀】的次数+X，若其进入过濒死状态，其回复1点体力（X为其以损失的体力值）。 未找到，需另写（卡面注释标明为全新技能，_trans_merge.md/_merged_skill_all.md均无对应代码，按描述原创实现）
	yinpan: {
		skillAnimation: true,
		animationColor: "qun",
		aiShowTag: "defense",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		usable: 1,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("yinpan"), (card, player, target) => true)
				.set("ai", target => -get.attitude(player, target))
				.forResult();
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
				if (!other.hasCard(card => get.name(card, other) == "sha", "he")) {
					continue;
				}
				const cardResult = await other
					.chooseCard("he", card => get.name(card, other) == "sha", `引叛：是否打出一张【杀】对${get.translation(victim)}使用（无距离次数限制）？`)
					.set("ai", card => get.effect(victim, { name: "sha" }, other, other) > 0 ? 5 - get.value(card) : -1)
					.forResult();
				if (cardResult.bool && cardResult.cards?.length && victim.isIn()) {
					const dyingBefore = victim.getHistory("damage", evt => evt._dyinged).length;
					await other.useCard(cardResult.cards[0], victim, false);
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

	// 智迟：锁定技，当你于回合外受到伤害后，本回合【杀】和普通锦囊牌对你无效。 参考zhichi(yijiang)
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
		ai: {
			threaten: 0.8,
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

// ========== xuyou 许攸 ==========
	// 恃才：锁定技，当你受到伤害后，若伤害值大于1，则你弃置两张牌：否则你摸两张牌。 参考gzshicai(guozhan)
	shicai: {
		audio: 2,
		trigger: { player: "damageEnd" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return event.num == 1 || player.countCards("he") > 0;
		},
		check(event, player) {
			return event.num == 1;
		},
		async content(event, trigger, player) {
			if (trigger.num == 1) {
				await player.draw(2);
			} else {
				await player.chooseToDiscard(true, "he", 2);
			}
		},
		ai: {
			threaten: 1,
		},
	},

	// 成略：当与你势力相同的角色使用牌指定目标后，若此牌目标数大于1，你可以令其摸一张牌，然后若你也是此牌的目标之一，你可以令一名与你势力相同的角色获得一枚"阴阳鱼"标记。 参考gzchenglve(guozhan)
	chenglve: {
		audio: 2,
		trigger: { global: "useCardAfter" },
		filter(event, player) {
			return event.targets && event.targets.length > 1 && event.player.isIn() && event.player.isFriendOf(player);
		},
		logTarget: "player",
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		preHidden: true,
		async content(event, trigger, player) {
			await trigger.player.draw();
			if (trigger.targets.includes(player)) {
				const result = await player
					.chooseTarget("成略：是否令一名与你势力相同的角色获得一枚“阴阳鱼”标记？", (card, player, current) => {
						return !current.hasMark("yinyang_mark") && current.isFriendOf(player);
					})
					.set("ai", target => get.attitude(get.player(), target) * Math.sqrt(1 + target.needsToDiscard()))
					.forResult();
				if (result.bool) {
					const current = result.targets[0];
					player.line(current, "green");
					current.addMark("yinyang_mark", 1, false);
					await game.delayx();
				}
			}
		},
	},

// ========== shixie 士燮 ==========
	// 避乱：锁定技，你拥有一个额外的装备栏，其可以装备任意副类别的装备牌。若你的装备区里有牌，其他角色计算与你的距离+2。 参考biluan(sp，改写)
	biluan: {
		audio: 2,
		forced: true,
		locked: true,
		mod: {
			equipEnabled(card, player) {
				if (get.type(card) == "equip" && !player.hasEmptySlot(get.subtype(card)) && player.hasEmptySlot("equip5")) {
					return "equip5";
				}
			},
			globalTo(from, to, distance) {
				if (to.countCards("e") > 0) {
					return distance + 2;
				}
			},
		},
		ai: {
			threaten: 0.6,
		},
	},

	// 礼下：锁定技，每名其他势力角色的准备阶段，若你不在其攻击范围内，其选择一项：1.令你摸一张牌；2.弃置你装备区里的一张牌，然后失去1点体力。3.交给你一张装备牌，视为对你使用一张无次数距离限制的【杀】。 参考lixia(sp，改写)
	lixia: {
		audio: 2,
		trigger: { global: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return event.player != player && !event.player.isFriendOf(player) && !event.player.inRange(player);
		},
		logTarget(event) {
			return event.player;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const list = ["摸一张牌", "弃置你装备区里的一张牌，然后失去1点体力"];
			if (target.countCards("he") > 0) {
				list.push("交给" + get.translation(player) + "一张装备牌，视为对其使用一张无距离次数限制的【杀】");
			}
			const result = await target
				.chooseControl(list)
				.set("prompt", "礼下：请选择一项")
				.set("ai", () => {
					if (get.attitude(target, player) >= 0) {
						return list[0];
					}
					if (player.countCards("e") > 0) {
						return list[1];
					}
					return list[Math.floor(Math.random() * list.length)];
				})
				.forResult();
			const choice = list.indexOf(result.control);
			if (choice == 1 && player.countCards("e") > 0) {
				await player.chooseToDiscard("e", true);
				await target.loseHp();
			} else if (choice == 2) {
				const cardResult = await target.chooseCard("he", "he", card => get.type(card) == "equip").forResult();
				if (cardResult.bool && cardResult.cards && cardResult.cards.length) {
					await target.give(cardResult.cards, player);
					await target.useCard({ name: "sha", isCard: true }, player, false);
				} else {
					await player.draw();
				}
			} else {
				await player.draw();
			}
		},
	},

// ========== huatuo 华佗 ==========
	// 急救：你于回合外可以将一张红色牌当【桃】使用。 参考jijiu(standard)
	jijiu: {
		locked: false,
		audio: 2,
		audioname: ["re_huatuo"],
		enable: "chooseToUse",
		viewAsFilter(player) {
			return player !== _status.currentPhase && player.hasCards("hes", { color: "red" });
		},
		filterCard(card) {
			return get.color(card) === "red";
		},
		position: "hes",
		viewAs: { name: "tao" },
		prompt: "将一张红色牌当桃使用",
		check(card) {
			return 15 - get.value(card);
		},
		ai: {
			threaten: 1.5,
		},
	},

	// 除疠：出牌阶段限一次，你可以选择一项：1.选择至多三名势力各不相同或未确定势力的其他角色，然后弃置你与这些角色各一张牌，被弃置牌的角色各摸一张牌。2.弃置一张手牌，然后令一名角色回复1点体力。 参考new_chuli(guozhan)
	chuwen: {
		audio: "chulao",
		enable: "phaseUse",
		usable: 1,
		filterCard(card, player) {
			return player.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			const choice = await player
				.chooseControl("弃牌摸牌", "弃牌回血")
				.set("prompt", "除疠：请选择一项")
				.set("ai", () => {
					return player.countCards("he") > 1 ? "弃牌摸牌" : "弃牌回血";
				})
				.forResult();
			if (choice.control == "弃牌摸牌") {
				const cardResult = await player
					.chooseCard("he", true, "除疠：选择一张牌弃置")
					.set("ai", card => (get.suit(card) == "spade" ? 8 : 5) - get.value(card))
					.forResult();
				if (!cardResult.bool || !cardResult.cards?.length) {
					return;
				}
				const targets = await player
					.chooseTarget([1, 3], "除疠：选择至多三名势力各不相同或未确定势力的其他角色", (card, player, target) => {
						if (player == target || target.countCards("he") <= 0) {
							return false;
						}
						for (let i = 0; i < ui.selected.targets.length; i++) {
							if (ui.selected.targets[i].isFriendOf(target)) {
								return false;
							}
						}
						return true;
					})
					.set("ai", target => get.attitude(get.player(), target))
					.forResult();
				if (!targets.bool || !targets.targets || !targets.targets.length) {
					return;
				}
				const drawList = [];
				if (get.suit(cardResult.cards[0]) == "spade") {
					drawList.push(player);
				}
				await player.discard(cardResult.cards);
				for (const target of targets.targets) {
					if (target.countCards("he") > 0) {
						const result = await player.discardPlayerCard(target, "he", true).forResult();
						if (result.bool && result.cards?.length && get.suit(result.cards[0]) == "spade") {
							drawList.push(target);
						}
					}
				}
				if (drawList.length) {
					await game.asyncDraw(drawList);
				}
			} else {
				const result = await player.chooseToDiscard("he", true).forResult();
				if (result.bool) {
					const target = await player
						.chooseTarget("除疠：令一名角色回复1点体力", (card, player, target) => target.isDamaged())
						.set("ai", target => get.attitude(get.player(), target))
						.forResult();
					if (target.bool && target.targets && target.targets.length) {
						await target.targets[0].recover();
					}
				}
			}
		},
		ai: {
			order: 5,
			result: {
				player: 1,
			},
		},
	},

// ========== lvbu 吕布 ==========
	// 无双：锁定技，①当你使用【杀】指定一名角色为目标后，其需使用两张【闪】才能抵消；②当你使用【决斗】指定其他角色为目标后，或成为其他角色使用【决斗】的目标后，其每次响应需打出两张【杀】。 参考wushuang(standard)
	wushuang: {
		audio: 2,
		audioname: ["re_lvbu", "shen_lvbu", "lvlingqi", "mb_shen_lvbu"],
		audioname2: { sb_lvbu: "sbliyu_effect" },
		forced: true,
		locked: true,
		group: ["wushuang1", "wushuang2", "wushuang_ext"],
		preHidden: ["wushuang1", "wushuang2", "wushuang_ext"],
		ai: {
			threaten: 2.5,
		},
	},
	wushuang1: {
		audio: "wushuang",
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

	// 无双（额外）：锁定技，你使用非转化的【决斗】和【杀】可以选择至多三名角色为目标。（卡面写作"空巢【杀】"，此处按普通【杀】处理） 参考skill_old.js
	wushuang_ext: {
		aiShowTag: "offense",
		sourceSkill: "wushuang",
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

// ========== diaochan 貂蝉 ==========
	// 离间：出牌阶段限一次，你可以弃置一张牌，然后令一名男性其他角色视为对另一名男性其他角色使用一张【决斗】（不能被【无懈可击】响应）。 参考lijian(standard)
	lijian: {
		audio: 2,
		audioname: ["re_diaochan"],
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.countPlayer(current => current !== player && current.hasSex("male")) > 1;
		},
		check(card) {
			return 10 - get.value(card);
		},
		filterCard: true,
		position: "he",
		filterTarget(card, player, target) {
			if (player === target) {
				return false;
			}
			if (!target.hasSex("male")) {
				return false;
			}
			if (ui.selected.targets.length === 1) {
				return target.canUse({ name: "juedou" }, ui.selected.targets[0]);
			}
			return true;
		},
		targetprompt: ["先出杀", "后出杀"],
		selectTarget: 2,
		multitarget: true,
		async content(event, trigger, player) {
			const next = event.targets[1]
				.useCard({
					card: get.autoViewAs({ name: "juedou", isCard: true }),
					targets: [event.targets[0]],
					nowuxie: true,
					noai: true,
				})
				.set("animate", false);
			await game.delay(0.5);
			return next;
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					if (ui.selected.targets.length === 0) {
						return -3;
					} else {
						return get.effect(target, { name: "juedou" }, ui.selected.targets[0], target);
					}
				},
			},
			expose: 0.4,
			threaten: 3,
		},
	},

	// 闭月：结束阶段，你摸X张牌（X为本回合受到伤害的角色数+1，且至多为4）。 参考biyue(standard，改写)
	biyue: {
		skillAnimation: true,
		animationColor: "qun",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		preHidden: true,
		async content(event, trigger, player) {
			await player.draw(Math.min(4, game.countPlayer2(current => current.hasHistory("damage")) + 1));
		},
	},

// ========== yuanshao 袁绍 ==========
	// 乱击：你可以将两张手牌当【万箭齐发】使用（不能使用本阶段发动此技能时使用过的花色）；与你势力相同的角色打出【闪】响应此牌后可摸一张牌。 参考gz_luanji(guozhan)
	luanji: {
		audio: "luanji",
		enable: "phaseUse",
		viewAs: {
			name: "wanjian",
		},
		filterCard(card, player) {
			if (!player.storage.luanji) {
				return true;
			}
			return !player.storage.luanji.includes(get.suit(card));
		},
		selectCard: 2,
		position: "hs",
		filter(event, player) {
			return (
				player.countCards("hs", function (card) {
					return !player.storage.luanji || !player.storage.luanji.includes(get.suit(card));
				}) > 1
			);
		},
		check(card) {
			const player = get.player();
			const targets = game.filterPlayer(current => player.canUse("wanjian", current) ?? false);
			let num = 0;
			for (let i = 0; i < targets.length; i++) {
				let eff = get.sgn(get.effect(targets[i], { name: "wanjian" }, player, player));
				if (targets[i].hp == 1) {
					eff *= 1.5;
				}
				num += eff;
			}
			if (!player.needsToDiscard(-1)) {
				if (targets.length >= 7) {
					if (num < 2) {
						return 0;
					}
				} else if (targets.length >= 5) {
					if (num < 1.5) {
						return 0;
					}
				}
			}
			return 6 - get.value(card);
		},
		ai: {
			// 稍微压低优先级，避免在还没考虑清楚本回合其他技能/用牌前，就抢先把手牌拆成万箭齐发浪费掉。
			order(item, player) {
				return get.order({ name: "wanjian" }, player) - 0.1;
			},
		},
		group: ["luanji_count", "luanji_reset", "luanji_respond"],
		subSkill: {
			reset: {
				trigger: {
					player: "phaseAfter",
				},
				silent: true,
				filter(event, player) {
					return player.storage.luanji ? true : false;
				},
				async content(event, trigger, player) {
					delete player.storage.luanji;
				},
				sub: true,
				forced: true,
				popup: false,
			},
			count: {
				trigger: {
					player: "useCard",
				},
				silent: true,
				filter(event) {
					return event.skill == "luanji";
				},
				async content(event, trigger, player) {
					if (!player.storage.luanji) {
						player.storage.luanji = [];
					}
					for (let i = 0; i < trigger.cards.length; i++) {
						player.storage.luanji.add(get.suit(trigger.cards[i]));
					}
				},
				sub: true,
				forced: true,
				popup: false,
			},
			respond: {
				trigger: {
					global: "respond",
				},
				silent: true,
				filter(event) {
					if (event.player.isUnseen()) {
						return false;
					}
					return event.getParent(2).skill == "luanji" && event.player.isFriendOf(_status.currentPhase);
				},
				async content(event, trigger, player) {
					await trigger.player.draw();
				},
				sub: true,
				forced: true,
				popup: false,
			},
		},
		ai: {
			threaten: 1.6,
		},
	},

	// 血睿：锁定技，你杀死同势力角色不执行奖惩。当你造成伤害后，受伤角色可以明置一张武将牌。 参考skill_old.js
	xueyi: {
		audioname: ["yuanshao"],
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

// ========== yanliangwenchou 颜良&文丑 ==========
	// 双雄：出牌阶段开始时，你可以令一名角色弃置一张牌，然后本回合你可以将与结果颜色不同的一张手牌当【决斗】使用。每回合限一次，当你因【决斗】受到伤害后，你可以获得此次【决斗】中其他角色打出的【杀】。 参考shuangxiong(shenhua，改写)
	shuangxiong: {
		skillAnimation: true,
		animationColor: "qun",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current.countCards("he") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget("双雄：令一名角色弃置一张牌", (card, player, target) => target.countCards("he") > 0)
				.set("ai", target => get.effect(target, { name: "guohe_copy2" }, player, player))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player.discardPlayerCard(target, "he", true).forResult();
			if (result.bool && result.cards && result.cards.length) {
				player.storage.shuangxiong = get.color(result.cards[0]);
				player.addTempSkill("shuangxiong_viewas");
			}
		},
		subSkill: {
			viewas: {
				charlotte: true,
				onremove: true,
				audio: "shuangxiong",
				enable: "chooseToUse",
				viewAs: { name: "juedou" },
				position: "hs",
				viewAsFilter(player) {
					return player.hasCard(card => get.color(card) != player.storage.shuangxiong, "hs");
				},
				filterCard(card, player) {
					return get.color(card) != player.storage.shuangxiong;
				},
				prompt() {
					return "将一张颜色不为" + get.translation(_status.event.player.storage.shuangxiong) + "的手牌当做【决斗】使用";
				},
				check(card) {
					const player = _status.event.player;
					const raw = player.getUseValue(card, null, true);
					const eff = player.getUseValue(get.autoViewAs({ name: "juedou" }, [card]));
					return eff - raw;
				},
				ai: { order: 7 },
			},
		},
		ai: {
			threaten: 1.5,
		},
	},
	// 双雄（获杀）：每回合限一次，当你因【决斗】受到伤害后，你可以获得此次【决斗】中其他角色打出的【杀】。 参考shuangxiong(shenhua，改写)
	shuangxiong_gain: {
		audio: "shuangxiong",
		trigger: { player: "damageBegin1" },
		usable: 1,
		filter(event, player) {
			return event.card && event.card.name == "juedou" && event.source;
		},
		check(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			const cards = trigger.card.cards;
			if (cards && cards.length) {
				await player.gain(cards, "gain2");
			}
		},
	},

// ========== dongzhuo 董卓 ==========
	// 酒池：你可以将一张♠牌当【酒】使用。 参考jiuchi(shenhua)
	jiuchi: {
		audio: 2,
		audioname: ["re_dongzhuo"],
		enable: "chooseToUse",
		filterCard(card) {
			return get.suit(card) == "spade";
		},
		viewAs: { name: "jiu" },
		viewAsFilter(player) {
			if (!player.countCards("hs", { suit: "spade" })) {
				return false;
			}
			return true;
		},
		prompt: "将一张黑桃手牌当酒使用",
		check(card) {
			if (_status.event.type == "dying") {
				return 1 / Math.max(0.1, get.value(card));
			}
			return 4 - get.value(card);
		},
		ai: {
			threaten: 1.5,
		},
	},

	// 横征：摸牌阶段开始时，若你没有手牌、体力值为1或全场唯一最少，你可以放弃摸牌，改为从每名其他角色的区域内获得一张牌。 参考hengzheng(sp)
	hengzheng: {
		skillAnimation: true,
		animationColor: "qun",
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		preHidden: true,
		filter(event, player) {
			if (event.numFixed) {
				return false;
			}
			if (player.hp == 1 || player.countCards("h") == 0) {
				return true;
			}
			return !game.hasPlayer(current => current != player && current.hp <= player.hp);
		},
		check(event, player) {
			var num = game.countPlayer(function (current) {
				if (current.countCards("he") && current != player && get.attitude(player, current) <= 0) {
					return true;
				}
				if (current.countCards("j") && current != player && get.attitude(player, current) > 0) {
					return true;
				}
			});
			return num >= 2;
		},
		async content(event, trigger, player) {
			const targets = game.filterPlayer();
			targets.remove(player);
			targets.sort(lib.sort.seat);
			event.targets = targets;
			event.num = 0;
			trigger.changeToZero();
			player.line(targets, "green");
			while (event.num < event.targets.length) {
				if (event.targets[event.num].countCards("hej")) {
					await player.gainPlayerCard(event.targets[event.num], "hej", true);
				}
				event.num++;
			}
		},
		ai: {
			noh: true,
			skillTagFilter(player, tag) {
				if (tag == "noh") {
					if (player.countCards("h") != 1) {
						return false;
					}
				}
			},
			threaten(player, target) {
				if (target.hp == 1) {
					return 2.5;
				}
				return 1;
			},
		},
	},

	// 暴凌：限定技，出牌阶段，若你有副将，你可以移除之，然后增加3点体力上限，回复3点体力并获得"崩坏"。 参考fake_baoling(guozhan)
	baoling: {
		audio: "baoling",
		skillAnimation: true,
		animationColor: "qun",
		enable: "phaseUse",
		limited: true,
		filter(event, player) {
			return player.hasViceCharacter();
		},
		check(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.removeCharacter(1);
			await player.gainMaxHp(3);
			await player.recover(3);
			await player.addSkills("benghuai");
		},
		derivation: "benghuai",
		ai: {
			order: 10,
			result: { player: 1 },
		},
	},
	// 崩坏：锁定技，结束阶段，若你不是体力值最小的角色，你选择一项：1.失去1点体力，2.减1点体力上限。（获得自"暴凌"/"举义"）
	benghuai: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.hp < player.hp);
		},
		async content(event, trigger, player) {
			const choice = await player
				.chooseControl("失去1点体力", "体力上限-1")
				.set("prompt", "崩坏：请选择一项")
				.set("ai", () => (player.hp > 1 ? "失去1点体力" : "体力上限-1"))
				.forResult();
			if (choice.control == "失去1点体力") {
				await player.loseHp();
			} else {
				await player.loseMaxHp();
			}
		},
	},

// ========== jiaxu 贾诩 ==========
	// 完杀：锁定技，你的回合内，除与你势力相同的角色外，不处于濒死状态的角色不能使用【桃】。 参考wansha(shenhua，改写)
	wansha: {
		locked: true,
		audio: 2,
		audioname: ["re_jiaxu", "boss_lvbu3", "new_simayi"],
		audioname2: { shen_simayi: "jilue_wansha" },
		global: "wansha2",
		trigger: { global: "dying" },
		priority: 15,
		forced: true,
		preHidden: true,
		filter(event, player, name) {
			return _status.currentPhase == player && event.player != player;
		},
		async content() {},
	},
	wansha2: {
		mod: {
			cardSavable(card, player) {
				if (card.name == "tao" && _status.currentPhase?.isIn() && _status.currentPhase.hasSkill("wansha") && _status.currentPhase != player && !player.isFriendOf(_status.currentPhase)) {
					if (!player.isDying()) {
						return false;
					}
				}
			},
			cardEnabled(card, player) {
				if (card.name == "tao" && _status.currentPhase?.isIn() && _status.currentPhase.hasSkill("wansha") && _status.currentPhase != player && !player.isFriendOf(_status.currentPhase)) {
					if (!player.isDying()) {
						return false;
					}
				}
			},
		},
	},

	// 乱武：限定技，出牌阶段，你可以令所有其他角色对距离最近的另一名角色使用一张【杀】，否则其失去1点体力。 参考luanwu(shenhua)
	luanwu: {
		audio: 2,
		audioname: ["re_jiaxu"],
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(current => player != current);
		},
		limited: true,
		skillAnimation: "epic",
		animationColor: "thunder",
		filterTarget: lib.filter.notMe,
		selectTarget: -1,
		multiline: true,
		async contentBefore(event, trigger, player) {
			player.awakenSkill(event.skill);
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await target
				.chooseToUse(
					"乱武：使用一张【杀】或失去1点体力",
					function (card) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					},
					function (card, player, target) {
						if (player == target) {
							return false;
						}
						var dist = get.distance(player, target);
						if (dist > 1) {
							if (
								game.hasPlayer(function (current) {
									return current != player && get.distance(player, current) < dist;
								})
							) {
								return false;
							}
						}
						return lib.filter.filterTarget.apply(this, arguments);
					}
				)
				.set("ai2", function () {
					return get.effect_use.apply(this, arguments) - get.event().effect;
				})
				.set("effect", get.effect(target, { name: "losehp" }, target, target))
				.set("addCount", false)
				.forResult();
			if (!result?.bool) {
				await target.loseHp();
			}
		},
		ai: {
			threaten: 1.8,
			order: () => 1 + 10 * Math.random(),
			result: {
				player(player) {
					const players = game.filterPlayer();
					let num = 0;
					for (let i = 0; i < players.length; i++) {
						let att = get.attitude(player, players[i]);
						if (att > 0) {
							att = 1;
						}
						if (att < 0) {
							att = -1;
						}
						if (players[i] != player && players[i].hp <= 3) {
							const hs = players[i].countCards("hs");
							if (hs === 0) {
								num += att / players[i].hp;
							} else if (hs === 1) {
								num += att / 2 / players[i].hp;
							} else if (hs === 2) {
								num += att / 4 / players[i].hp;
							}
						}
						if (players[i].hp == 1) {
							num += att * 1.5;
						}
					}
					if (player.hp == 1) {
						return -num;
					}
					if (player.hp == 2) {
						return -game.players.length / 4 - num;
					}
					return -game.players.length / 3 - num;
				},
			},
		},
	},

	// 帷幕：锁定技，当你成为黑色锦囊牌的目标时，取消之。你的回合内，当你第一次受到伤害时，防止此伤害。 参考gz_weimu(guozhan，改写)
	weimu: {
		audio: "weimu",
		trigger: {
			target: "useCardToTarget",
			player: ["damageBegin1", "phaseAfter"],
		},
		forced: true,
		priority: 15,
		preHidden: true,
		filter(event, player) {
			if (event.name == "damage") {
				return _status.currentPhase == player && !player.storage.weimu_used;
			}
			if (event.name == "phaseAfter") {
				return player.storage.weimu_used;
			}
			return get.type(event.card, null, false) == "trick" && get.color(event.card) == "black";
		},
		async content(event, trigger, player) {
			if (trigger.name == "damage") {
				trigger.cancel();
				player.storage.weimu_used = true;
			} else if (trigger.name == "phaseAfter") {
				delete player.storage.weimu_used;
			} else {
				trigger.getParent()?.targets.remove(player);
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (get.type(card, "trick") == "trick" && get.color(card) == "black") {
						return "zeroplayertarget";
					}
				},
			},
		},
	},

// ========== pangde 庞德 ==========
	// (mashu 马术：与machao所在批次共用，此处不重复实现)
	// 鞭出：当你使用【杀】指定目标后，你可以弃置该角色的一张牌，若弃置的牌为装备牌，其不能使用【闪】。 参考jianchu(shenhua)
	bianchu: {
		audio: 2,
		audioname: ["re_pangde"],
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return event.card.name == "sha" && event.target.countDiscardableCards(player, "he") > 0;
		},
		preHidden: true,
		check(event, player) {
			return get.attitude(player, event.target) <= 0;
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const result = await player
				.discardPlayerCard(trigger.target, get.prompt("bianchu", trigger.target), true)
				.set("ai", function (button) {
					if (!_status.event.att) {
						return 0;
					}
					if (get.position(button.link) == "e") {
						if (get.subtype(button.link) == "equip2") {
							return 5 * get.value(button.link);
						}
						return get.value(button.link);
					}
					return 1;
				})
				.set("att", get.attitude(player, trigger.target) <= 0)
				.forResult();
			if (result.bool && result.links && result.links.length) {
				if (get.type(result.links[0], null, result.links[0].original == "h" ? player : false) == "equip") {
					trigger.getParent().directHit.add(trigger.target);
				}
			}
		},
		ai: {
			threaten: 1.3,
			unequip_ai: true,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (tag == "directHit_ai") {
					return (
						arg.card.name == "sha" &&
						arg.target.countCards("e", function (card) {
							return get.value(card) > 1;
						}) > 0
					);
				}
				if (arg && arg.name == "sha" && arg.target.getEquip(2)) {
					return true;
				}
				return false;
			},
		},
	},

// ========== zuoci 左慈 ==========
	// 役鬼：当你首次明置此武将牌后，你获得两张未加入游戏的武将牌作为"魂"牌；每种牌名每回合限一次，你可以移去一张"魂"牌，视为使用任意一张基本牌或普通锦囊牌，且目标必须为与此"魂"牌势力相同或未确定势力的角色。 参考fake_yigui(guozhan，简化改写)
	yigui: {
		skillAnimation: true,
		animationColor: "qun",
		audio: "yigui",
		trigger: { player: "showCharacterAfter" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return !player.storage.yigui_inited;
		},
		// 若左慈是作为第三个武将(3将模式)获得的，一开始就是明置状态，没有showCharacterAfter这个环节。
		init(player, skill) {
			if (!player.storage.yigui_inited && isCharacterShown(player, skill)) {
				lib.skill.yigui.grant(player);
			}
		},
		grant(player) {
			player.storage.yigui_inited = true;
			if (!player.storage.yigui) {
				player.storage.yigui = [];
			}
			const pool = _status.characterlist;
			for (let i = 0; i < 2 && pool && pool.length; i++) {
				const c = pool.randomRemove();
				player.storage.yigui.push(c);
			}
			player.markAuto("yigui", []);
		},
		async content(event, trigger, player) {
			lib.skill.yigui.grant(player);
		},
		intro: {
			content: "存有#张“魂”",
		},
		ai: {
			threaten: 1.5,
		},
		subSkill: {
			use: {
				audio: "yigui",
				enable: "chooseToUse",
				filter(event, player) {
					if (event.type == "wuxie" || event.type == "respondShan") {
						return false;
					}
					return (player.storage.yigui || []).length > 0;
				},
				hiddenCard(player, name) {
					if (!lib.inpile.includes(name) || !["basic", "trick"].includes(get.type(name))) {
						return false;
					}
					return (player.storage.yigui || []).length > 0 && !player.storage["yigui_used_" + name];
				},
				chooseButton: {
					dialog(event, player) {
						const dialog = ui.create.dialog("役鬼", "hidden");
						dialog.add([player.storage.yigui, "character"]);
						const list = get.inpileVCardList(info => ["basic", "trick"].includes(get.type(info[2])) && !player.storage["yigui_used_" + info[2]]);
						dialog.add([list, "vcard"]);
						return dialog;
					},
					filter(button, player) {
						if (!ui.selected.buttons.length) {
							return typeof button.link == "string";
						}
						return typeof button.link == "object";
					},
					check() {
						return 1 + Math.random();
					},
					backup(links, player) {
						const character = links[0];
						const name = links[1][2];
						const nature = links[1][3] || null;
						const group = get.character(character, 1);
						return {
							character,
							group,
							filterCard: () => false,
							selectCard: -1,
							popname: true,
							audio: "yigui",
							viewAs: { name, nature, isCard: true },
							filterTarget(card, player, target) {
								if (group != "unknown" && target.group != group && target.group != "unknown") {
									return false;
								}
								return lib.filter.filterTarget.apply(this, arguments);
							},
							onuse(result, player) {
								player.storage.yigui.remove(character);
								player.storage["yigui_used_" + name] = true;
								player.when({ global: "phaseAfter" }).step(() => delete player.storage["yigui_used_" + name]);
								player.markAuto("yigui", []);
							},
						};
					},
				},
			},
		},
	},

	// 汲魂：当你受到伤害后，或与你势力相同的角色进入濒死状态被救回后，你可以将一张未加入游戏的武将牌扣置加入"魂"牌。 参考fake_jihun(guozhan，简化改写)
	jihun: {
		audio: "jihun",
		trigger: { player: "damageEnd", global: "dyingAfter" },
		preHidden: true,
		filter(event, player) {
			if (event.name == "damage") {
				return true;
			}
			return event.player.isFriendOf(player) && event.player.isIn() && !event.player.isDead();
		},
		check() {
			return true;
		},
		async content(event, trigger, player) {
			const pool = _status.characterlist;
			if (pool && pool.length) {
				const c = pool.randomRemove();
				if (!player.storage.yigui) {
					player.storage.yigui = [];
				}
				player.storage.yigui.push(c);
				player.markAuto("yigui", []);
			}
		},
	},

// ========== zhangjiao 张角 ==========
	// 雷击：当你使用或打出【闪】时，你可以令一名其他角色判定：若为♠，你对其造成2点雷电伤害；若为♣，你回复1点体力，并对其造成1点雷电伤害。 参考leiji(shenhua，改写)
	leiji: {
		audio: 2,
		trigger: { player: ["useCard", "respond"] },
		filter(event, player) {
			return event.card.name == "shan" && game.hasPlayer(current => current != player);
		},
		preHidden: true,
		line: "thunder",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => target != player)
				.set("ai", target => {
					const player = get.player();
					if (target.hasSkill("hongyan")) {
						return 0;
					}
					return get.damageEffect(target, player, player, "thunder");
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			const [target] = event.targets;
			const next = target.judge(card => {
				if (get.suit(card) == "spade") {
					return -4;
				}
				if (get.suit(card) == "club") {
					return 3;
				}
				return 1;
			});
			const result = await next.forResult();
			if (get.suit(result.card) == "spade") {
				await target.damage(2, "thunder");
			} else if (get.suit(result.card) == "club") {
				await player.recover();
				await target.damage(1, "thunder");
			}
		},
		ai: {
			threaten: 1.4,
			mingzhi: false,
			useShan: true,
		},
	},

	// 鬼道：当一名角色的判定牌生效前，你可以打出一张黑色牌替换之（你获得原判定牌）。 参考guidao(shenhua)
	guidao: {
		audio: 2,
		audioname: ["sp_zhangjiao"],
		trigger: { global: "judge" },
		filter(event, player) {
			return player.countCards("hes", { color: "black" }) > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(`${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt(event.skill)}`, "hes", card => {
					const player = get.player();
					if (get.color(card) !== "black") {
						return false;
					}
					const mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
					if (mod2 != "unchanged") {
						return mod2;
					}
					const mod = game.checkMod(card, player, "unchanged", "cardRespondable", player);
					if (mod != "unchanged") {
						return mod;
					}
					return true;
				})
				.set("ai", card => {
					const trigger = get.event().getTrigger();
					const { player, judging } = get.event();
					const result = trigger.judge(card) - trigger.judge(judging);
					const attitude = get.attitude(player, trigger.player);
					let val = get.value(card);
					if (get.subtype(card) == "equip2") {
						val /= 2;
					} else {
						val /= 6;
					}
					if (attitude == 0 || result == 0) {
						return 0;
					}
					if (attitude > 0) {
						return result - val;
					}
					return -result - val;
				})
				.set("judging", trigger.player.judging[0])
				.forResult();
		},
		popup: false,
		async content(event, trigger, player) {
			const next = player.respond(event.cards, event.name, "highlight", "noOrdering");
			await next;
			const { cards } = next;
			if (cards?.length) {
				player.$gain2(trigger.player.judging[0]);
				await player.gain(trigger.player.judging[0]);
				trigger.player.judging[0] = cards[0];
				trigger.orderingCards.addArray(cards);
				game.log(trigger.player, "的判定牌改为", cards);
				await game.delay(2);
			}
		},
		ai: {
			rejudge: true,
			tag: { rejudge: 1 },
		},
	},

	// 黄天：锁定技，当【闪电】从非判定区进入弃牌堆时，你可以获得之。与你势力相同角色使用【闪电】时，你可以视为发动一次"雷击"。 参考skill_old.js
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

// ========== yuji 于吉 ==========
	// 千幻：当与你势力相同的一名角色受到伤害后，你可以展示牌堆顶一张牌，将此牌置于你的武将牌上，称为"千幻"（最多拥有四张）。当一名与你势力相同的角色成为基本牌或锦囊牌的唯一目标时，你可以移去一张"千幻"：若其与此牌花色相同，取消之，否则你弃置一张与此牌颜色相同的牌，然后取消之。 参考qianhuan(guozhan，改写)
	qianhuan: {
		audio: 2,
		preHidden: true,
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		group: ["qianhuan_add", "qianhuan_use"],
		ai: {
			threaten: 1.8,
		},
		subSkill: {
			add: {
				audio: "qianhuan",
				trigger: {
					global: "damageEnd",
				},
				filter(event, player) {
					if (player.getExpansions("qianhuan").length >= 4) {
						return false;
					}
					return player.isFriendOf(event.player) && ui.cardPile.firstChild;
				},
				async content(_event, _trigger, player) {
					const result = await player.chooseBool("是否展示牌堆顶一张牌，将其置于武将牌上作为“千幻”？").forResult();
					if (!result.bool) {
						return;
					}
					const card = get.cards(1)[0];
					if (card) {
						await player.showCards([card]);
						const next = player.addToExpansion(card, player, "give");
						next.gaintag.add("qianhuan");
						await next;
					}
				},
			},
			use: {
				audio: "qianhuan",
				trigger: {
					global: "useCardToTarget",
				},
				filter(event, player) {
					if (!["basic", "trick"].includes(get.type(event.card, "trick"))) {
						return false;
					}
					return event.target && player.isFriendOf(event.target) && event.targets.length == 1 && player.getExpansions("qianhuan").length > 0;
				},
				async cost(event, trigger, player) {
					const result = await player
						.chooseButton([get.prompt("qianhuan"), player.getExpansions("qianhuan")])
						.set("ai", function (button) {
							return get.attitude(get.player(), trigger.target) < 0 ? 1 : 0;
						})
						.forResult();
					event.result = {
						bool: result.bool,
						cost_data: {
							links: result.links,
						},
					};
				},
				logTarget: "target",
				async content(event, trigger, player) {
					const card = event.cost_data.links[0];
					if (get.suit(card) == get.suit(trigger.card)) {
						trigger.getParent().targets.remove(trigger.target);
					} else {
						const result = await player.chooseToDiscard("he", true, c => get.color(c) == get.color(card)).forResult();
						if (result.bool) {
							trigger.getParent().targets.remove(trigger.target);
						}
					}
					await player.loseToDiscardpile(card);
				},
			},
		},
	},

// ========== caiwenji 蔡文姬 ==========
	// 悲歌：当一名角色受到【杀】造成的伤害后，若你有牌，你可以令其判定，然后你可以弃置一张牌，根据结果执行对应的效果：♥，其回复1点体力；♦，其摸两张牌；♣，伤害来源弃置两张牌；♠，伤害来源翻面。 参考beige(shenhua)
	beige: {
		audio: 2,
		audioname: ["re_caiwenji", "ol_caiwenji"],
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return event.card && event.card.name == "sha" && event.source && event.player.isIn() && player.countCards("he");
		},
		checkx(event, player) {
			const att1 = get.attitude(player, event.player);
			const att2 = get.attitude(player, event.source);
			return att1 > 0 && att2 <= 0;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			const next = player.chooseBool(get.prompt2(event.skill, trigger.player));
			next.set("ai", () => lib.skill.beige.checkx(trigger, player));
			next.setHiddenSkill(event.skill);
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			const result = await trigger.player.judge().forResult();
			const check = lib.skill.beige.checkx(trigger, player);
			const discardResult = await player
				.chooseToDiscard("he", "悲歌：你可以弃置一张牌，然后执行判定结果对应的效果")
				.set("ai", function (card) {
					if (_status.event.goon) {
						return 8 - get.value(card);
					}
					return 0;
				})
				.set("goon", check)
				.forResult();
			if (!discardResult.bool) {
				return;
			}
			switch (result.suit) {
				case "heart":
					await trigger.player.recover();
					break;
				case "diamond":
					await trigger.player.draw(2);
					break;
				case "club":
					await trigger.source.chooseToDiscard("he", 2, true);
					break;
				case "spade":
					await trigger.source.turnOver();
					break;
			}
		},
		ai: {
			threaten: 0.9,
			expose: 0.3,
		},
	},

	// 断肠：锁定技，当你死亡时，你令杀死你的角色失去其一张武将牌上的所有技能。 参考gz_duanchang(guozhan)
	duanchang: {
		audio: "duanchang",
		trigger: {
			player: "die",
		},
		forced: true,
		forceDie: true,
		filter(event, player) {
			return event.source && event.source.isIn() && event.source != player && (event.source.hasMainCharacter() || event.source.hasViceCharacter());
		},
		logTarget: "source",
		async content(event, trigger, player) {
			const main = trigger.source.hasMainCharacter();
			const vice = trigger.source.hasViceCharacter();
			let control;
			if (!vice) {
				control = "主将";
			} else if (!main) {
				control = "副将";
			} else {
				const result = await player
					.chooseControl("主将", "副将")
					.set("prompt", "断肠：令" + get.translation(trigger.source) + "失去一张武将牌的所有技能")
					.set("forceDie", true)
					.set("ai", () => "主将")
					.forResult();
				control = result.control;
			}
			let skills;
			if (control == "主将") {
				trigger.source.showCharacter(0);
				skills = lib.character[trigger.source.name][3];
				game.log(trigger.source, "失去了主将技能");
			} else {
				trigger.source.showCharacter(1);
				skills = lib.character[trigger.source.name2][3];
				game.log(trigger.source, "失去了副将技能");
			}
			const list = [];
			for (let i = 0; i < skills.length; i++) {
				list.add(skills[i]);
				const info = lib.skill[skills[i]];
				if (info.charlotte) {
					list.splice(i--);
					continue;
				}
				if (typeof info.derivation == "string") {
					list.add(info.derivation);
				} else if (Array.isArray(info.derivation)) {
					list.addArray(info.derivation);
				}
			}
			trigger.source.removeSkill(list);
			trigger.source.syncSkills();
		},
	},

// ========== mateng 马腾 ==========
	// (mashu 马术：与machao所在批次共用，此处不重复实现)
	// 雄异：限定技，出牌阶段，你可以令与你势力相同的所有角色各摸三张牌，然后若你不为大势力，你可以变更此将。 参考xiongyi(sp，改写)
	xiongyi: {
		skillAnimation: true,
		animationColor: "gray",
		enable: "phaseUse",
		audio: 2,
		limited: true,
		filterTarget(card, player, target) {
			return target.isFriendOf(player);
		},
		multitarget: true,
		multiline: true,
		selectTarget: -1,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await game.asyncDraw(event.targets, 3);
			if (!player.isMajor()) {
				if (!_status.characterlist) {
					game.initCharacterList();
				}
				if (_status.characterlist.length) {
					const result = await player.chooseBool("雄异：是否变更此将？").set("ai", () => true).forResult();
					if (result.bool) {
						await pickAndChangeCharacter(player, "xiongyi", "雄异：请选择要变更为的武将");
					}
				}
			}
		},
		ai: {
			threaten: 1,
			order: 8,
			result: {
				player: 1,
			},
		},
	},

// ========== kongrong 孔融 ==========
	// 名士：锁定技，当你受到伤害时，若无伤害来源或伤害来源有暗置的武将牌，防止此伤害。你的武将牌无法被其他角色暗置或移除。你的手牌被其他角色获得时，改为弃置之。 参考gz_mingshi(guozhan，改写)
	zymingshi: {
		audio: "mingshi",
		trigger: { player: "damageBegin1", global: "loseAsyncAfter" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			if (event.name == "damage") {
				return !event.source || event.source.isUnseen(2);
			}
			const evt = event.getl && event.getl(player);
			return evt && evt.giver && evt.giver != player && evt.hs && evt.hs.length > 0;
		},
		async content(event, trigger, player) {
			if (trigger.name == "damage") {
				trigger.cancel();
			} else {
				const evt = trigger.getl(player);
				if (evt && evt.hs && evt.hs.length) {
					await player.loseToDiscardpile(evt.hs);
				}
			}
		},
		mod: {
			hideEnable(player, target) {
				if (target == player) {
					return false;
				}
			},
		},
		ai: {
			threaten: 0.6,
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

	// 礼让：当你的牌因弃置而置入弃牌堆时，你可以将其中的任意张牌交给其他角色。 参考lirang(sp)
	lirang: {
		audio: 2,
		trigger: {
			player: "loseAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			if (!game.hasPlayer(current => current != player)) {
				return false;
			}
			if (event.type != "discard" || event.getlx === false) {
				return false;
			}
			var evt = event.getl(player);
			if (!evt || !evt.cards2) {
				return false;
			}
			for (var i = 0; i < evt.cards2.length; i++) {
				if (get.position(evt.cards2[i]) == "d") {
					return true;
				}
			}
			return false;
		},
		async cost(event, trigger, player) {
			if (trigger.delay == false) {
				await game.delay();
			}
			const cards = trigger.getl(player)?.cards2?.filterInD("od"),
				give_map = {};
			if (_status.connectMode) {
				game.broadcastAll(function () {
					_status.noclearcountdown = true;
				});
			}
			do {
				const result =
					cards.length > 1
						? await player
								.chooseButtonTarget({
									createDialog: [`礼让：是否分配本次弃置的牌？`, cards],
									selectButton: [1, Infinity],
									cardsx: cards,
									filterTarget: lib.filter.notMe,
									ai1(button) {
										return get.value(button.link);
									},
									canHidden: true,
									ai2(target) {
										const player = get.player();
										const card = ui.selected.buttons[0].link;
										if (card) {
											return get.value(card, target) * get.attitude(player, target);
										}
										return 1;
									},
								})
								.set("allowChooseAll", true)
								.setHiddenSkill("lirang")
								.forResult()
						: await player
								.chooseTarget(`礼让：是否令一名角色获得${get.translation(cards)}？`, lib.filter.notMe)
								.set("ai", target => {
									const att = get.attitude(_status.event.player, target);
									if (_status.event.enemy) {
										return -att;
									} else if (att > 0) {
										return att / (1 + target.countCards("h"));
									} else {
										return att / 100;
									}
								})
								.setHiddenSkill("lirang")
								.set("enemy", get.value(cards[0], player, "raw") < 0)
								.forResult();
				if (result?.bool) {
					if (!result.links?.length) {
						result.links = cards.slice(0);
					}
					cards.removeArray(result.links);
					let id = result.targets[0]?.playerid;
					if (!give_map[id]) {
						give_map[id] = [];
					}
					give_map[id].addArray(result.links);
				} else {
					break;
				}
			} while (cards.length > 0);
			if (_status.connectMode) {
				game.broadcastAll(function () {
					delete _status.noclearcountdown;
					game.stopCountChoose();
				});
			}
			const targets = [],
				lose_list = [];
			for (let i in give_map) {
				let source = (_status.connectMode ? lib.playerOL : game.playerMap)[i];
				lose_list.push([source, give_map[i]]);
				targets.push(source);
			}
			event.result = {
				bool: targets.length > 0,
				targets: targets?.sortBySeat(),
				cost_data: lose_list,
			};
		},
		async content(event, trigger, player) {
			await game
				.loseAsync({
					gain_list: event.cost_data,
					giver: player,
					animate: "gain2",
				})
				.setContent("gaincardMultiple");
		},
		ai: {
			expose: 0.1,
			effect: {
				target(card, player, target, current) {
					if (target.hasFriend() && get.tag(card, "discard")) {
						if (current < 0) {
							return 0;
						}
						return [1, 1];
					}
				},
			},
		},
	},

// ========== jiling 吉玲 ==========
	// 双刃：出牌阶段开始时，你可以与一名角色拼点。若你：赢，你视为对其或与其势力相同的一名角色使用一张不计入次数的【杀】；没赢，你本回合不能再使用【杀】。锁定技，你使用【杀】对目标角色造成伤害后，可弃置一张手牌并对该角色距离1的另一名角色造成1点伤害。 参考shuangren(sp，改写)
	shuangren: {
		skillAnimation: true,
		animationColor: "qun",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		direct: true,
		preHidden: true,
		filter(event, player) {
			return (
				player.countCards("h") > 0 &&
				game.hasPlayer(function (current) {
					return current != player && player.canCompare(current);
				})
			);
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2("shuangren"), function (card, player, target) {
					return player.canCompare(target);
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					return get.attitude(player, target) < 0 ? get.effect(target, { name: "sha" }, player, player) : 0;
				})
				.setHiddenSkill(event.name)
				.forResult();
			if (result.bool) {
				event.target = result.targets[0];
				player.logSkill("shuangren", event.target);
				const result2 = await player.chooseToCompare(event.target).forResult();
				if (result2.bool) {
					const target = event.target;
					const result3 = await player
						.chooseTarget("对" + get.translation(target) + "或与其势力相同的一名角色使用一张【杀】（不计入次数）", true, function (card, player, target2) {
							if (!player.canUse("sha", target2, false)) {
								return false;
							}
							return target2 == target || target2.isFriendOf(target);
						})
						.set("ai", function (target) {
							var player = _status.event.player;
							return get.effect(target, { name: "sha" }, player, player);
						})
						.forResult();
					if (result3.bool && result3.targets && result3.targets.length) {
						await player.useCard({ name: "sha", isCard: true }, result3.targets[0], false);
					}
				} else {
					player.addTempSkill("shuangren_lock", "phaseUseAfter");
				}
			} else {
				event.finish();
			}
		},
		subSkill: {
			lock: {
				mod: {
					cardEnabled2(card, player) {
						if (card.name == "sha") {
							return false;
						}
					},
				},
			},
		},
		ai: {
			threaten: 1.4,
		},
	},
	// 双刃（追加伤害）：锁定技，你使用【杀】对目标角色造成伤害后，可弃置一张手牌并对该角色距离1的另一名角色造成1点伤害。 参考shuangren(sp，改写)
	shuangren_extra: {
		audio: "shuangren",
		trigger: { source: "damageSource" },
		filter(event, player) {
			return event.card && event.card.name == "sha" && player.countCards("h") > 0 && game.hasPlayer(current => current != event.player && get.distance(event.player, current) == 1);
		},
		check(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			const result = await player.chooseToDiscard("h", false).forResult();
			if (result.bool) {
				const target = await player
					.chooseTarget((card, player, target) => target != trigger.player && get.distance(trigger.player, target) == 1)
					.set("ai", target => get.damageEffect(target, player, player))
					.forResult();
				if (target.bool && target.targets && target.targets.length) {
					await target.targets[0].damage(1);
				}
			}
		},
	},

// ========== tianfeng 田丰 ==========
	// 死谏：当你失去最后一张手牌后，或体力值变为1时，你可以弃置一名其他角色的一张牌。 参考sijian(sp，改写)
	sijian: {
		trigger: {
			player: ["loseAfter", "loseHpAfter", "damageAfter"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		direct: true,
		audio: 2,
		preHidden: true,
		filter(event, player) {
			if (event.name == "loseHp" || event.name == "damage") {
				return player.hp == 1 && !player.storage.sijian_hp1;
			}
			if (player.countCards("h")) {
				return false;
			}
			var evt = event.getl(player);
			return evt && evt.hs && evt.hs.length > 0;
		},
		async content(event, trigger, player) {
			if (trigger.name == "loseHp" || trigger.name == "damage") {
				player.storage.sijian_hp1 = true;
			}
			const result = await player
				.chooseTarget(get.prompt("sijian"), "弃置一名其他角色的一张牌", function (card, player, target) {
					return player != target && target.countCards("he") > 0;
				})
				.set("ai", function (target) {
					return -get.attitude(_status.event.player, target);
				})
				.setHiddenSkill(event.name)
				.forResult();
			if (result.bool) {
				player.logSkill("sijian", result.targets);
				event.target = result.targets[0];
				await player.discardPlayerCard(event.target, true);
			} else {
				event.finish();
			}
		},
		ai: {
			threaten: 0.7,
			expose: 0.2,
		},
		subSkill: {
			reset: {
				trigger: { player: "phaseAfter" },
				silent: true,
				forced: true,
				popup: false,
				filter(event, player) {
					return player.storage.sijian_hp1;
				},
				async content(event, trigger, player) {
					delete player.storage.sijian_hp1;
				},
			},
		},
	},

	// 随势：锁定技，当其他角色受到伤害进入濒死状态时，若伤害来源与你势力相同，你摸一张牌，当其他角色死亡时，若其与你势力相同，你失去1点体力或弃置所有手牌。 参考gz_suishi(guozhan)
	suishi: {
		audio: "suishi",
		locked: true,
		forced: true,
		preHidden: ["suishi_draw", "suishi_lose"],
		group: ["suishi_draw", "suishi_lose"],
		subSkill: {
			draw: {
				audio: "suishi1.mp3",
				trigger: {
					global: "dying",
				},
				forced: true,
				filter(event, player) {
					return event.player != player && event.parent?.name == "damage" && event.parent.source && event.parent.source.isFriendOf(player);
				},
				async content(_event, _trigger, player) {
					await player.draw();
				},
			},
			lose: {
				audio: "suishi2.mp3",
				trigger: {
					global: "dieAfter",
				},
				check() {
					return false;
				},
				forced: true,
				filter(event, player) {
					return event.player.isFriendOf(player);
				},
				async content(_event, _trigger, player) {
					const result = player.countDiscardableCards(player, "h") ? await player.chooseBool("随势：弃置所有手牌，或点取消失去1点体力").forResult() : { bool: false };
					if (result.bool) {
						await player.modedDiscard(player.getCards("h"));
					} else {
						await player.loseHp();
					}
				},
			},
		},
	},

// ========== panfeng 潘凤 ==========
	// 狂斧：与你势力相同角色的出牌阶段限一次，其可以令你摸两张牌，然后视为对其指定的一名角色使用一张【决斗】。若你因此受到伤害，你弃置两张牌且此技能本轮失效。 参考gz_kuangfu(guozhan，改写)
	kuangfu: {
		audio: "kuangfu",
		trigger: { global: "phaseUseBegin" },
		usable: 1,
		filter(event, player) {
			return event.player != player && event.player.isFriendOf(player) && !player.storage.kuangfu_lock;
		},
		logTarget(event) {
			return event.player;
		},
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		async content(event, trigger, player) {
			const ally = trigger.player;
			await player.draw(2);
			const result = await ally
				.chooseTarget("狂斧：指定一名角色，令" + get.translation(player) + "视为对其使用一张【决斗】", (card, playerx, target) => player.canUse({ name: "juedou" }, target))
				.set("ai", target => get.effect(target, { name: "juedou" }, player, player))
				.forResult();
			if (result.bool && result.targets && result.targets.length) {
				const target = result.targets[0];
				const before = player.hp;
				await player.useCard({ name: "juedou", isCard: true }, target, false);
				if (player.hp < before) {
					await player.chooseToDiscard("he", 2, true);
					player.storage.kuangfu_lock = true;
				}
			}
		},
		subSkill: {
			reset: {
				trigger: { player: "phaseAfter" },
				silent: true,
				forced: true,
				popup: false,
				filter(event, player) {
					return player.storage.kuangfu_lock;
				},
				async content(event, trigger, player) {
					delete player.storage.kuangfu_lock;
				},
			},
		},
		ai: {
			threaten: 1.1,
		},
	},

// ========== zoushi 邹氏 ==========
	// 祸水：锁定技，你的回合内，其他角色不能明置其武将牌；势力与你不同且有暗置的武将牌的角色于你回合内不能使用或打出【闪】响应你的牌。 参考gz_huoshui
	huoshui: {
		audio: 2,
		forced: true,
		global: "huoshui_mingzhi",
		trigger: { player: "useCardToTargeted" },
		preHidden: true,
		filter(event, player) {
			return (event.card.name == "sha" || event.card.name == "wanjian") && event.target.isUnseen(2) && event.target.isEnemyOf(player);
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const target = trigger.target;
			target.addTempSkill("huoshui_norespond");
			target.markAuto("huoshui_norespond", [trigger.card]);
		},
		subSkill: {
			norespond: {
				charlotte: true,
				trigger: { global: "useCardEnd" },
				onremove: true,
				forced: true,
				popup: false,
				silent: true,
				firstDo: true,
				filter(event, player) {
					return player.getStorage("huoshui_norespond").includes(event.card);
				},
				async content(event, trigger, player) {
					player.unmarkAuto("huoshui_norespond", [trigger.card]);
					if (!player.storage.huoshui_norespond.length) {
						player.removeSkill("huoshui_norespond");
					}
				},
				mod: {
					cardEnabled(card) {
						if (card.name == "shan") {
							return false;
						}
					},
					cardRespondable(card) {
						if (card.name == "shan") {
							return false;
						}
					},
				},
			},
			mingzhi: {
				ai: {
					nomingzhi: true,
					skillTagFilter(player) {
						if (_status.currentPhase && _status.currentPhase != player && _status.currentPhase.hasSkill("huoshui")) {
							return true;
						}
						return false;
					},
				},
			},
		},
	},

	// 倾城：出牌阶段，你可以弃置一张黑色牌，暗置一名其他角色的一张武将牌。若你弃置的是装备牌，你可以再暗置一名其他角色的一张武将牌。 参考gz_qingcheng
	qingcheng: {
		audio: "qingcheng",
		enable: "phaseUse",
		filter(event, player) {
			return (
				player.countCards("he", { color: "black" }) > 0 &&
				game.hasPlayer(function (current) {
					return current != player && !current.isUnseen(2);
				})
			);
		},
		filterCard: {
			color: "black",
		},
		position: "he",
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			return !target.isUnseen(2);
		},
		check(card) {
			return 6 - get.value(card, get.event().player);
		},
		async content(event, trigger, player) {
			await chooseToHide(event.target);

			if (get.type(event.cards[0]) != "equip") {
				return;
			}

			const result = await player
				.chooseTarget("是否暗置一名武将牌均为明置的角色的一张武将牌？", (card, player, target) => {
					return target != player && !target.isUnseen(2);
				})
				.set("ai", target => {
					return -get.attitude(_status.event.player, target);
				})
				.forResult();

			if (result.bool && result.targets && result.targets.length) {
				player.line(result.targets[0], "green");
				await chooseToHide(result.targets[0]);
			}

			return;

			/**
			 * @param {PlayerGuozhan} target
			 */
			async function chooseToHide(target) {
				/** @type {Partial<Result>} */
				let result;

				if (get.is.jun(target)) {
					result = { control: "副将" };
				} else {
					let choice = "主将";
					const skills = lib.character[target.name2][3];
					for (var i = 0; i < skills.length; i++) {
						var info = get.info(skills[i]);
						if (info && info.ai && info.ai.maixie) {
							choice = "副将";
							break;
						}
					}
					if (get.character(target.name, 3).includes("buqu")) {
						choice = "主将";
					} else if (get.character(target.name2, 3).includes("buqu")) {
						choice = "副将";
					}
					result = await player
						.chooseControl("主将", "副将", () => {
							return _status.event.choice;
						})
						.set("prompt", "暗置" + get.translation(event.target) + "的一张武将牌")
						.set("choice", choice)
						.forResult();
				}

				if (result.control == "主将") {
					target.hideCharacter(0);
				} else {
					target.hideCharacter(1);
				}
				target.addTempSkill("qingcheng_ai");
			}
		},
		ai: {
			threaten: 1.3,
			order: 8,
			result: {
				target(player, target) {
					if (target.hp <= 0) {
						return -5;
					}
					if (player.getStat().skill.qingcheng) {
						return 0;
					}
					if (!target.hasSkillTag("maixie")) {
						return 0;
					}
					if (get.attitude(player, target) >= 0) {
						return 0;
					}
					if (
						player.hasCard(function (card) {
							return get.tag(card, "damage") && player.canUse(card, target, true, true);
						}, undefined)
					) {
						if (target.maxHp > 3) {
							return -0.5;
						}
						return -1;
					}
					return 0;
				},
			},
		},
	},

// ========== huaxiong 华雄 ==========
	// 耀武：锁定技，当你受到【杀】造成的伤害时，若此【杀】：为红色，伤害来源摸一张牌；不为红色，你摸一张牌。 参考new_reyaowu(refresh)
	yaowu: {
		audio: 2,
		audioname: ["sb_huaxiong", "ol_huaxiong"],
		trigger: { player: "damageBegin3" },
		filter(event) {
			return event.card && event.card.name == "sha" && (get.color(event.card) != "red" || (event.source && event.source.isIn()));
		},
		forced: true,
		async content(event, trigger, player) {
			if (get.color(trigger.card) != "red") {
				await player.draw();
			} else {
				await trigger.source.draw();
			}
		},
		ai: {
			effect: {
				target: (card, player, target, current) => {
					if (card.name == "sha") {
						if (get.color(card) == "red") {
							return [1, 0, 1, 0.6];
						}
						return [1, 0.6];
					}
				},
			},
		},
	},

	// 扬威：限定技，当你首次明置此武将牌时，你可以摸两张牌、体力上限+2并回复2点体力，然后其他角色依次可对你使用一张无距离限制的【杀】。 参考skill_old.js
	yangwei: {
		skillAnimation: true,
		animationColor: "qun",
		aiShowTag: "response",
		limited: true,
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			// 修复：同jugu(糜竺)的问题，用player.name1判断华雄若被摆在副将位就永远不会触发，
			// 改用固定角色key"huaxiong"。
			return !!(event.toShow && event.toShow.includes("huaxiong"));
		},
		// 若华雄是作为第三个武将(3将模式)获得的，一开始就是明置状态，没有showCharacterAfter这个环节。
		// 修复：init()在addSkillTrigger阶段同步调用，此时并未处于游戏主循环的事件栈内，
		// 在这里直接起一个游离的async IIFE去await chooseBool，实测该询问事件不会被正常推进/结算，
		// 导致扬威作为第三武将时形同虚设。改成挂一个gameStart触发的子技能，让询问+结算走正常的
		// 触发器流程（游戏开始时必然在事件循环内运行）。
		group: ["yangwei_check"],
		async grant(player) {
			player.awakenSkill("yangwei");
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
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("yangwei")).forResult();
		},
		async content(event, trigger, player) {
			await lib.skill.yangwei.grant(player);
		},
		ai: {
			threaten: 1.5,
		},
		subSkill: {
			check: {
				trigger: { player: "gameStart" },
				filter(event, player) {
					return !player.storage.yangwei && isCharacterShown(player, "yangwei");
				},
				async cost(event, trigger, player) {
					event.result = await player.chooseBool(get.prompt2("yangwei")).forResult();
				},
				async content(event, trigger, player) {
					await lib.skill.yangwei.grant(player);
				},
			},
		},
	},

// ========== hetaihou 何太后 ==========
	// 鸩毒：一名角色的出牌阶段开始时，你可以弃置一张手牌，令其视为使用一张【酒】。若其不为你，你对其造成1点伤害。 参考zhendu(sp)
	// 说明：国战包gz_hetaihou下zhendu/qiluan均标注"未找到该技能的代码定义"，按角色定位失败，改用sp包同名zhendu，描述几乎完全一致。
	zhendu: {
		audio: 2,
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return event.player.isIn() && player.countCards("h") > 0 && event.player.hasUseTarget({ name: "jiu" }, null, event);
		},
		direct: true,
		preHidden: true,
		async content(event, trigger, player) {
			let nono = Math.abs(get.attitude(player, trigger.player)) < 3;
			if (player == trigger.player || get.damageEffect(trigger.player, player, player) <= 0 || !trigger.player.hasUseTarget({ name: "jiu" }, null, trigger)) {
				nono = true;
			} else if (trigger.player.hp > 2) {
				nono = true;
			} else if (trigger.player.hp > 1 && player.countCards("h") < 3 && trigger.player.canUse("sha", player) && !player.countCards("h", "shan") && trigger.player.countCards("h") >= 3) {
				nono = true;
			}
			const next = player.chooseToDiscard(get.prompt2("zhendu", trigger.player));
			next.set("ai", function (card) {
				if (_status.event.nono) {
					return -1;
				}
				return 7 - get.useful(card);
			});
			next.set("logSkill", ["zhendu", trigger.player]);
			next.set("nono", nono);
			next.setHiddenSkill("zhendu");
			let result = await next.forResult();
			if (result.bool) {
				const childResult = await trigger.player.chooseUseTarget({ name: "jiu" }, true, "noTargetDelay", "nodelayx").forResult();
				if (childResult) {
					result = childResult;
				}
			} else {
				event.finish();
				return;
			}
			if (result.bool && trigger.player != player) {
				await trigger.player.damage();
			}
		},
		ai: {
			threaten: 2,
			expose: 0.3,
		},
	},

	// 戚乱：每回合结束时，你可以摸X张牌（X为本回合死亡的角色数）。若你于本回合内杀死过角色，则你额外摸两张牌。 参考qiluan(sp)
	// 说明：同上，gz_hetaihou下无代码；sp包qiluan概念相近但计数方式(getStat("kill")*3)与卡面(死亡数+额外摸两张)不符，已按描述重写触发与结算逻辑。
	qiluan: {
		audio: "qiluan2",
		preHidden: true,
		init(player) {
			player.storage.qiluan_dienum = 0;
			player.storage.qiluan_killed = false;
		},
		trigger: { player: "phaseEnd" },
		frequent: true,
		filter(event, player) {
			return player.storage.qiluan_dienum > 0;
		},
		prompt(event, player) {
			let num = player.storage.qiluan_dienum + (player.storage.qiluan_killed ? 2 : 0);
			return get.prompt("qiluan") + "（可摸" + get.cnNumber(num) + "张牌）";
		},
		async content(event, trigger, player) {
			let num = player.storage.qiluan_dienum;
			if (player.storage.qiluan_killed) {
				num += 2;
			}
			await player.draw(num);
			player.storage.qiluan_dienum = 0;
			player.storage.qiluan_killed = false;
		},
		group: ["qiluan_record"],
		subSkill: {
			record: {
				sub: true,
				audio: "qiluan2",
				trigger: { global: "dieAfter" },
				frequent: true,
				forced: true,
				popup: false,
				silent: true,
				charlotte: true,
				content() {
					player.storage.qiluan_dienum++;
					if (trigger.source == player) {
						player.storage.qiluan_killed = true;
					}
				},
			},
		},
	},

// ========== yuanshu 袁术 ==========
	// 伪帝：出牌阶段开始时，你可以令与你势力相同的其他角色各交给你任意张牌。 参考skill_old.js
	weidi: {
		skillAnimation: true,
		animationColor: "qun",
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

	// 庸肆：锁定技，若场上没有【玉玺】，视为你装备着【玉玺】；其他势力角色装备【玉玺】时，你失去1点体力或弃两张牌。 参考gzyongsi
	// 说明：gzyongsi前半段"视为装备玉玺"与卡面完全一致，但后半段为"成为知己知彼目标时展示手牌"，与卡面"其他势力装备玉玺时你失去体力或弃牌"不符，已重写后半段效果。
	yongsi: {
		skillAnimation: true,
		animationColor: "qun",
		audio: "yongsi1",
		init(player, skill) {
			player.addExtraEquip(skill, "yuxi", true, player => lib.card.yuxi && !game.hasPlayer(current => current.getEquip("yuxi")));
		},
		onremove(player, skill) {
			player.removeExtraEquip(skill);
		},
		group: ["yongsi_draw", "yongsi_punish"],
		ai: {
			threaten(player, target) {
				if (
					game.hasPlayer(function (current) {
						return current != target && current.getEquip("yuxi");
					})
				) {
					return 0.5;
				}
				return 2;
			},
			forceMajor: true,
			skillTagFilter() {
				return !game.hasPlayer(function (current) {
					return current.getEquip("yuxi");
				});
			},
		},
		subSkill: {
			draw: {
				sub: true,
				equipSkill: true,
				noHidden: true,
				trigger: { player: "phaseDrawBegin2" },
				forced: true,
				filter(event, player) {
					if (event.numFixed || player.isDisabled(5)) {
						return false;
					}
					return !game.hasPlayer(function (current) {
						return current.getEquips("yuxi").length > 0;
					});
				},
				content() {
					trigger.num++;
				},
				audio: ["yongsi1", 2],
			},
			punish: {
				sub: true,
				trigger: { global: "equipAfter" },
				forced: true,
				filter(event, player) {
					return event.player != player && event.card && event.card.name == "yuxi" && diffGroup(event.player, player);
				},
				logTarget(event) {
					return event.player;
				},
				async content(event, trigger, player) {
					const { control } = await player.chooseControl(["失去1点体力", "弃置两张牌"]).set("prompt", get.prompt("yongsi")).forResult();
					if (control == "失去1点体力") {
						await player.loseHp();
					} else {
						await player.chooseToDiscard(2, true, "he");
					}
				},
				audio: ["yongsi1", 2],
			},
		},
	},

// ========== liqueguosi 李傕&郭汜 ==========
	// 凶算：出牌阶段限一次，你可以弃置一张手牌并选择一名与你势力相同的角色，对其造成1点伤害，然后其摸三张牌。若其有已发动的限定技，你选择其中一个，于其下个回合结束后重置。 参考gz_xiongsuan
	// 说明：源码为限定技且自己摸三张牌、本回合结束重置，均与卡面(出牌阶段限一次、目标摸三张牌、目标下个回合结束后重置)不符，已按描述重写。
	xiongsuan: {
		audio: "xiongsuan",
		enable: "phaseUse",
		usable: 1,
		filter(_event, player) {
			return player.countCards("h") > 0;
		},
		filterCard: true,
		filterTarget(_card, player, target) {
			return target.isFriendOf(player);
		},
		check(card) {
			return 7 - get.value(card);
		},
		async content(event, trigger, player) {
			const { target } = event;

			await target.damage("nocard");
			await target.draw(3);

			const skills = target.getOriginalSkills();
			const list = skills.filter(skill => lib.skill[skill].limited && target.awakenedSkills.includes(skill));

			let result;
			if (list.length == 1) {
				result = {
					control: list[0],
				};
			} else if (list.length > 1) {
				result = await player.chooseControl(list).set("prompt", "选择一个限定技，于其下个回合结束后重置之").forResult();
			} else {
				return;
			}

			target.storage.xiongsuan_restore = result.control;
			target.addTempSkill("xiongsuan_restore");
		},
		subSkill: {
			restore: {
				trigger: {
					player: "phaseAfter",
				},
				forced: true,
				popup: false,
				charlotte: true,
				onremove: true,
				async content(_event, _trigger, player) {
					player.restoreSkill(player.storage.xiongsuan_restore, undefined);
				},
			},
		},
		ai: {
			threaten: 1.1,
			order: 4,
			damage: true,
			result: {
				target(player, target) {
					if (target.hp > 1) {
						var skills = target.getOriginalSkills();
						for (var i = 0; i < skills.length; i++) {
							if (lib.skill[skills[i]].limited && target.awakenedSkills.includes(skills[i])) {
								return 8;
							}
						}
					}
					if (target != player) {
						return 0;
					}
					if (get.damageEffect(target, player, player) >= 0) {
						return 10;
					}
					if (target.hp >= 4) {
						return 5;
					}
					if (target.hp == 3) {
						if (
							player.countCards("h") <= 2 &&
							game.hasPlayer(function (current) {
								return current.hp <= 1 && get.attitude(player, current) < 0;
							})
						) {
							return 3;
						}
					}
					return 0;
				},
			},
		},
	},

// ========== zhangxiu 张绣 ==========
	// 附敌：当你受到伤害后，你可以将一张手牌交给伤害来源，然后对与其势力相同中体力值最大且大于等于你的一名角色造成1点伤害。 参考gzfudi
	fudi: {
		trigger: { global: "damageEnd" },
		direct: true,
		preHidden: true,
		audio: 2,
		filter(event, player) {
			return event.source && event.source.isAlive() && event.source != player && event.player == player && player.countCards("h") && event.num > 0;
		},
		content() {
			"step 0";
			var players = game.filterPlayer(function (current) {
				return (
					current.isFriendOf(trigger.source) &&
					current.hp >= player.hp &&
					!game.hasPlayer(function (current2) {
						return current2.hp > current.hp && current2.isFriendOf(trigger.source);
					})
				);
			});
			var check = true;
			if (!players.length) {
				check = false;
			} else {
				if (get.attitude(player, trigger.source) >= 0) {
					check = false;
				}
			}
			player
				.chooseCard(get.prompt("fudi", trigger.source), "交给其一张手牌，然后对其势力中体力值最大且不小于你的一名角色造成1点伤害")
				.set("aicheck", check)
				.set("ai", function (card) {
					if (!_status.event.aicheck) {
						return 0;
					}
					return 9 - get.value(card);
				})
				.setHiddenSkill(event.name);
			"step 1";
			if (result.bool) {
				player.logSkill("fudi", trigger.source);
				player.give(result.cards, trigger.source);
			} else {
				event.finish();
			}
			"step 2";
			var list = game.filterPlayer(function (current) {
				return (
					current.hp >= player.hp &&
					current.isFriendOf(trigger.source) &&
					!game.hasPlayer(function (current2) {
						return current2.hp > current.hp && current2.isFriendOf(trigger.source);
					})
				);
			});
			if (list.length) {
				if (list.length == 1) {
					event._result = { bool: true, targets: list };
				} else {
					player
						.chooseTarget(true, "对" + get.translation(trigger.source) + "势力中体力值最大的一名角色造成1点伤害", function (card, player, target) {
							return _status.event.list.includes(target);
						})
						.set("list", list)
						.set("ai", function (target) {
							return get.damageEffect(target, player, player);
						});
				}
			} else {
				event.finish();
			}
			"step 3";
			if (result.bool && result.targets.length) {
				player.line(result.targets[0]);
				result.targets[0].damage();
			}
		},
		ai: {
			threaten: 0.9,
			maixie: true,
			maixie_defend: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage") && target.hp > 1) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						if (!target.countCards("h")) {
							return [1, -1];
						}
						if (
							game.countPlayer(function (current) {
								return current.isFriendOf(player) && current.hp >= target.hp - 1;
							})
						) {
							return [1, 0, 0, -2];
						}
					}
				},
			},
		},
	},

	// 从谏：锁定技，你于回合外造成的伤害+1，你于回合内受到的伤害+1。 参考gzcongjian
	congjian: {
		trigger: {
			player: "damageBegin3",
			source: "damageBegin1",
		},
		forced: true,
		preHidden: true,
		audio: "drlt_congjian",
		filter(event, player, name) {
			if (event.num <= 0) {
				return false;
			}
			if (name == "damageBegin1" && _status.currentPhase != player) {
				return true;
			}
			if (name == "damageBegin3" && _status.currentPhase == player) {
				return true;
			}
			return false;
		},
		check(event, player) {
			return _status.currentPhase != player;
		},
		content() {
			trigger.num++;
		},
	},

// ========== zhangren 张任 ==========
	// 穿心：出牌阶段，当你使用【杀】或【决斗】对目标角色造成伤害时，若其与你势力不同且有副将，你可以防止此伤害，若如此做，其选择一项：1.弃置装备区里的所有牌，然后失去1点体力；2.移除副将。 参考chuanxin(sp)
	// 说明：gz_zhangren下chuanxin标注"未找到该技能的代码定义"，按角色定位失败，改用sp包chuanxin（其guozhan分支描述chuanxin_info_guozhan与卡面完全一致）。
	chuanxin: {
		audio: 2,
		trigger: { source: "damageBegin2" },
		preHidden: true,
		filter(event, player) {
			if (_status.currentPhase != player) {
				return false;
			}
			if (!_status.event.getParent("phaseUse")) {
				return false;
			}
			if (event.card && (event.card.name == "sha" || event.card.name == "juedou") && event.getParent().name == event.card.name) {
				if (get.mode() == "guozhan") {
					return (event.player.identity != "qun" || player.identity == "ye") && !event.player.isUnseen() && event.player.hasViceCharacter();
				} else {
					var info = lib.character[event.player.name];
					if (!info) {
						return false;
					}
					var skills = event.player.getSkills();
					for (var i = 0; i < info[3].length; i++) {
						if (lib.skill[info[3][i]].fixed) {
							continue;
						}
						if (skills.includes(info[3][i])) {
							return true;
						}
					}
				}
			}
			return false;
		},
		logTarget: "player",
		check(event, player) {
			if (get.mode() == "guozhan") {
				if (!event.player.isUnseen(1) && get.guozhanRank(event.player.name2, event.player) < 4) {
					return false;
				}
			}
			if (event.player.hasSkill("subplayer")) {
				return false;
			}
			if (get.attitude(player, event.player) < 0) {
				if (event.player.hp == 1 && event.player.countCards("e") < 2 && event.player.name2 != "gz_pangtong") {
					return false;
				}
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			trigger.cancel();
			let result;
			if (trigger.player.countCards("e")) {
				result = await trigger.player
					.chooseControl(function (event, player) {
						if (get.mode() == "guozhan" && get.guozhanRank(player.name2, player) < 4) {
							return 1;
						}
						if (player.hp == 1) {
							return 1;
						}
						if (player.hp == 2 && player.countCards("e") >= 2) {
							return 1;
						}
						return 0;
					})
					.set("choiceList", ["弃置装备区内的所有牌并失去1点体力", get.mode() == "guozhan" ? "移除副将牌" : "随机移除武将牌上的一个技能"])
					.forResult();
			} else {
				event._result = { index: 1 };
				result = event._result;
			}
			if (result.index == 1) {
				if (get.mode() != "guozhan") {
					const info = lib.character[trigger.player.name];
					const skills = trigger.player.getSkills();
					const list = [];
					for (let i = 0; i < info[3].length; i++) {
						if (lib.skill[info[3][i]].fixed) {
							continue;
						}
						if (skills.includes(info[3][i])) {
							list.push(info[3][i]);
						}
					}
					if (list.length) {
						const skill = list.randomGet();
						await trigger.player.removeSkills(skill);
					}
				} else {
					await trigger.player.removeCharacter(1);
				}
			} else {
				await trigger.player.discard(trigger.player.getCards("e"));
				await trigger.player.loseHp();
			}
		},
		ai: { threaten: 1.2 },
	},

	// 锋矢：阵法技，在同一个围攻关系中，若你是围攻角色，则你或另一名围攻角色使用【杀】指定被围攻角色为目标后，可以选择：1.令该角色弃置装备区里的一张牌。2.本回合锁定技失效。 参考gz_fengshi
	// 说明：源码gz_fengshi只有强制弃牌一种效果，缺少"本回合锁定技失效"的可选项，已补充为二选一。
	zfengshi: {
		audio: "zfengshi",
		trigger: {
			global: "useCardToPlayered",
		},
		filter(event, player) {
			if (event.card.name != "sha" || game.countPlayer() < 4) {
				return false;
			}
			return player.siege(event.target) && event.player.siege(event.target) && event.target.countCards("e");
		},
		zhenfa: "siege",
		logTarget: "target",
		async content(event, trigger, player) {
			const target = trigger.target;
			const { control } = await player
				.chooseControl(["弃置装备区内的一张牌", "本回合锁定技失效"])
				.set("prompt", get.prompt("zfengshi"))
				.set("choiceList", ["令" + get.translation(target) + "弃置装备区内的一张牌", "令" + get.translation(target) + "本回合锁定技失效"])
				.forResult();
			if (control == "弃置装备区内的一张牌") {
				await target.chooseToDiscard("e", true);
			} else {
				const skills = target.getSkills().filter(skill => lib.skill[skill] && lib.skill[skill].forced);
				for (const skill of skills) {
					target.tempBanSkill(skill, "phaseEnd");
				}
			}
		},
	},

// ========== hejin 何进 ==========
	// 诏兵：弃牌阶段开始时，你可以弃置任意张手牌，然后令至多等量其他角色选择一项：1.展示并交给你一张【杀】；2.失去1点体力。 参考jsrgzhaobing
	// 说明：源码为结束阶段强制弃置所有手牌，与卡面(弃牌阶段开始时、可弃置任意张)不符，已改为弃牌阶段开始时可选择弃置数量。
	zhaobing: {
		skillAnimation: true,
		animationColor: "qun",
		audio: 2,
		trigger: { player: "phaseDiscardBegin" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const num = player.countCards("h");
			const { bool, cards } = await player
				.chooseToDiscard("h", [1, num], false)
				.set("prompt", "诏兵：弃置任意张手牌")
				.set("ai", card => 6 - get.value(card))
				.forResult();
			if (!bool || !cards || !cards.length) {
				return;
			}
			await player.discard(cards);
			const dnum = cards.length;
			const { bool: bool2, targets } = await player
				.chooseTarget(get.prompt("zhaobing"), `令至多${get.cnNumber(dnum)}名其他角色依次选择一项：1.展示并交给你一张【杀】；2.失去1点体力`, [1, dnum], lib.filter.notMe)
				.set("ai", target => 2 - get.attitude(player, target))
				.forResult();
			if (!bool2 || !targets || !targets.length) {
				return;
			}
			for (const target of targets.sortBySeat()) {
				if (!target.isIn()) {
					continue;
				}
				const { bool: give } = await target
					.chooseToGive(player, `诏兵：展示并交给${get.translation(player)}一张【杀】，或失去1点体力`, card => get.name(card) == "sha")
					.set("ai", card => 6 - get.value(card))
					.forResult();
				if (!give) {
					await target.loseHp();
				}
			}
		},
		ai: { expose: 0.2, threaten: 1.2 },
	},

	// 延祸：锁定技，当你死亡时，你令此局游戏【杀】造成的伤害+1。 参考jsrgyanhuo(继承spyanhuo)
	yanhuo: {
		audio: "yanhuo",
		trigger: { player: "die" },
		forceDie: true,
		skillAnimation: true,
		animationColor: "soil",
		content() {
			player.line(game.players, "green");
			game.addGlobalSkill("yanhuo_damage");
			game.broadcastAll(() => {
				if (!_status.yanhuo) {
					_status.yanhuo = 0;
				}
				_status.yanhuo++;
			});
		},
		subSkill: {
			damage: {
				trigger: { player: "useCard" },
				forced: true,
				filter(event, player) {
					return event.card.name == "sha";
				},
				content() {
					trigger.baseDamage += _status.yanhuo || 0;
				},
			},
		},
	},

// ========== hansui 韩遂 ==========
	// 逆乱：出牌阶段，你可以将一张黑色牌当【杀】使用。若此【杀】未造成过伤害，则不计入次数。 参考spniluan
	niluan: {
		enable: "phaseUse",
		audio: "niluan",
		viewAs: { name: "sha" },
		check(card) {
			return 5.1 - get.value(card);
		},
		filterCard: { color: "black" },
		position: "hes",
		viewAsFilter(player) {
			return player.countCards("hes", lib.skill.niluan.filterCard) > 0;
		},
		group: "niluan_clear",
		subSkill: {
			clear: {
				trigger: { player: "useCardAfter" },
				forced: true,
				silent: true,
				charlotte: true,
				filter(event, player) {
					return event.skill == "niluan" && event.addCount !== false && player.getHistory("sourceDamage", card => card.card == event.card).length == 0;
				},
				content() {
					trigger.addCount = false;
					if (player.stat[player.stat.length - 1].card.sha > 0) {
						player.stat[player.stat.length - 1].card.sha--;
					}
				},
			},
		},
		ai: { threaten: 1.0 },
	},

	// 违忤：出牌阶段限一次，你可以将一张红色牌当无距离限制的【顺手牵羊】使用。 参考spweiwu
	weiwu: {
		audio: 2,
		locked: false,
		enable: "phaseUse",
		usable: 1,
		viewAs: {
			name: "shunshou",
			storage: { weiwu: true },
		},
		filterCard: { color: "red" },
		position: "hes",
		check(card) {
			return 7 - get.value(card);
		},
		mod: {
			targetInRange(card) {
				if (card.storage && card.storage.weiwu) {
					return true;
				}
			},
		},
	},

// ========== gaoshun 高顺 ==========
	// 迅析：其他角色于其回合外明置武将时，你可以视为对其使用一张无距离数量限制的【杀】。 参考fakexunxi
	xunxi: {
		trigger: { global: "showCharacterEnd" },
		filter(event, player) {
			const card = new lib.element.VCard({ name: "sha", isCard: true });
			return event.player != player && event.player != _status.currentPhase && player.canUse(card, event.player, false);
		},
		check(event, player) {
			const card = new lib.element.VCard({ name: "sha", isCard: true });
			return get.effect(event.player, card, player, player) > 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const card = new lib.element.VCard({ name: "sha", isCard: true });
			await player.useCard(card, trigger.player, false);
		},
	},

	// 摄甲：锁定技，每回合各限一次，当你成为【杀】的目标后/使用【杀】指定唯一目标后，若你的装备区没有防具牌/武器牌，则你本回合视为装备着使用者的防具牌/目标角色的武器牌。 参考skill_old.js
	shejia: {
		aiShowTag: "support",
		audio: 2,
		group: ["shejia_armor", "shejia_weapon", "shejia_reset", "shejia_share", "shejia_clear"],
		ai: { threaten: 0.8 },
	},

	shejia_clear: {
		sourceSkill: "shejia",
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

	shejia_armor: {
		sourceSkill: "shejia",
		charlotte: true,
		trigger: { player: "useCardToTargeted" },
		filter(event, player) {
			return (
				get.name(event.card) == "sha" &&
				!player.storage.gsshejia_armor_used &&
				!player.getEquip(2) &&
				event.player &&
				event.player != player &&
				event.targets &&
				event.targets.includes(player) &&
				event.player.getEquip(2)
			);
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

	shejia_weapon: {
		sourceSkill: "shejia",
		charlotte: true,
		trigger: { player: "useCardToTargeted" },
		filter(event, player) {
			return (
				get.name(event.card) == "sha" &&
				!player.storage.gsshejia_weapon_used &&
				!player.getEquip(1) &&
				event.targets &&
				event.targets.length == 1 &&
				event.targets[0] != player &&
				event.targets[0].getEquip(1)
			);
		},
		forced: true,
		popup: false,
		content(event, trigger, player) {
			player.storage.gsshejia_weapon_used = true;
			player.storage.gsshejia_weapon_source = trigger.targets[0].playerid;
		},
	},

	shejia_share: {
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

	shejia_reset: {
		sourceSkill: "shejia",
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

	// 禁酒：锁定技，你的【酒】只能当【杀】使用或打出；其他角色于你的回合内不能使用【酒】。 参考rejinjiu
	// 说明：源码rejinjiu的子技能rejinjiu2(受到酒杀伤害-X)与卡面描述无关，已剔除；其余(酒视为杀、回合内其他角色不能用酒)与卡面一致。
	jinjiu: {
		audio: 2,
		mod: {
			cardname(card, player) {
				if (card.name == "jiu") {
					return "sha";
				}
			},
		},
		trigger: { player: ["useCard1", "respond"] },
		firstDo: true,
		forced: true,
		filter(event, player) {
			return event.card.name == "sha" && !event.skill && event.cards.length == 1 && event.cards[0].name == "jiu";
		},
		async content(event, trigger, player) {},
		global: "jinjiu_noalcohol",
		subSkill: {
			noalcohol: {
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
		},
		ai: {
			skillTagFilter(player) {
				if (!player.countCards("h", "jiu")) {
					return false;
				}
			},
			respondSha: true,
		},
	},

// ========== liubiao 刘表 ==========
	// 宴殺：准备阶段，你可以视为使用一张以任意名角色为目标的【五谷丰登】，结算后所有非目标角色依次可以将一张装备牌当【杀】对其中一名目标角色使用（无距离限制）。 参考jsrgyansha(jsrg)
	yansha: {
		skillAnimation: true,
		animationColor: "qun",
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("yansha"), [1, game.countPlayer()], (card, player, target) => true)
				.set("ai", target => get.attitude(player, target))
				.forResult();
		},
		async content(event, trigger, player) {
			const targets = event.targets;
			if (!targets || !targets.length) {
				return;
			}
			const card = { name: "wugu", isCard: true };
			if (lib.filter.cardEnabled(card, player)) {
				await player.useCard(card, targets, false);
			}
			const aliveTargets = targets.filter(current => current.isIn());
			if (!aliveTargets.length) {
				return;
			}
			const others = game.filterPlayer(current => !targets.includes(current)).sortBySeat();
			for (const other of others) {
				const currentTargets = aliveTargets.filter(current => current.isIn());
				if (!currentTargets.length) {
					break;
				}
				const result = await other
					.chooseCardTarget({
						prompt: `宴殺：是否将一张装备牌当【杀】对其中一名目标角色使用（无距离限制）？`,
						position: "hes",
						filterCard(card) {
							return get.type(card) == "equip";
						},
						filterTarget(card, player, target2) {
							if (!get.event().candidates.includes(target2)) {
								return false;
							}
							const vcard = get.autoViewAs({ name: "sha" }, ui.selected.cards);
							return player.canUse(vcard, target2, false);
						},
						ai1(card) {
							return 7 - get.value(card);
						},
						ai2(target2) {
							const player = get.player();
							const vcard = get.autoViewAs({ name: "sha" }, ui.selected.cards);
							return get.effect(target2, vcard, player, player);
						},
						targets: currentTargets,
					})
					.set("candidates", currentTargets)
					.forResult();
				if (result.bool) {
					await other.useCard(get.autoViewAs({ name: "sha" }, result.cards), result.cards, result.targets);
				}
			}
		},
		ai: { expose: 0.2 },
	},

	// 自守：准备阶段，你可以额外摸X张牌，然后令你本回合的手牌上限+X（X为场上势力数）。若如此做，你于本回合出牌阶段使用牌时，只能指定自己为目标。 参考gzzishou(yijiang/gz)
	zishou: {
		skillAnimation: true,
		animationColor: "qun",
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("zishou")).forResult();
		},
		async content(event, trigger, player) {
			const x = new Set(game.filterPlayer().map(current => current.group)).size || 1;
			await player.draw(x);
			player.storage.zishou_x = x;
			player.addTempSkill("zishou_buff", "phaseAfter");
		},
		ai: { threaten: 0.7, order: 9, result: { player: 1 } },
	},
	zishou_buff: {
		charlotte: true,
		mod: {
			maxHandcard(player, num) {
				return num + (player.storage.zishou_x || 0);
			},
			targetInRange(card, player, target) {
				if (get.itemtype(card) == "card" && target != player) {
					return false;
				}
			},
		},
		onremove(player) {
			delete player.storage.zishou_x;
		},
	},

// ========== fuhuanghou 伏皇后 ==========
	// 惴恐：其他角色准备阶段，你可以与其拼点，赢的角色可以使用对方的拼点牌，输的角色本回合不能使用对方拼点牌类型的牌。 参考zhuikong(yijiang)
	zhuikong: {
		aiShowTag: "support",
		audio: 2,
		trigger: { global: "phaseZhunbeiBegin" },
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
		ai: { threaten: 0.75 },
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

	// 求援：当你成为一名角色使用【杀】的目标时，你可以令另一名角色选择交给你一张牌或成为此【杀】额外目标。 参考qiuyuan(yijiang)
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

// ========== liru 李儒 ==========
	// 絕策：结束阶段，你可以对一名手牌数全场最小的其他角色造成1点伤害。 参考hb_liru_juece(hb)
	liru_juece: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "phaseEnd" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("liru_juece"), (card, player, target) => {
					if (target == player) {
						return false;
					}
					const min = Math.min(...game.filterPlayer(current => current != player).map(current => current.countCards("h")));
					return target.countCards("h") == min;
				})
				.set("ai", target => -get.attitude(player, target))
				.forResult();
		},
		async content(event, trigger, player) {
			if (event.targets && event.targets.length) {
				await event.targets[0].damage(1);
			}
		},
	},

	// 滅計：当一名角色于你的回合内不以此法失去手牌后，你可以令其弃置一张牌。 参考hb_liru_mieji(hb)
	liru_mieji: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (_status.currentPhase != player || player.storage.liru_mieji_active) {
				return false;
			}
			if (event.player == player) {
				return false;
			}
			const evt = event.getl && event.getl(event.player);
			return !!(evt && evt.hs && evt.hs.length);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("liru_mieji", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (!target.isIn() || !target.countCards("h")) {
				return;
			}
			player.storage.liru_mieji_active = true;
			await target.chooseToDiscard("h", true).forResult();
			player.storage.liru_mieji_active = false;
		},
	},

	// 焚城：限定技，出牌阶段，你可以选择一名角色开始，令所有其他角色依次选择一项：1.弃置任意张牌（须比上家弃置的牌多）；2.受到你造成的2点火焰伤害。 参考hb_liru_fencheng(hb)
	liru_fencheng: {
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
		ai: { threaten: 1.6 },
	},

// ========== caifuren 蔡夫人 ==========
	// 窃聽：其他角色的回合结束时，若其有未明置武将或未于此回合内对除其外的角色使用过牌，你可以选择一项：1.将其装备区里的一张牌置入你的装备区；2.摸一张牌。 参考qieting(yijiang)
	qieting: {
		aiShowTag: "offense",
		audio: 2,
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			if (event.player == player) {
				return false;
			}
			if (event.player.isUnseen && (event.player.isUnseen(0) || event.player.isUnseen(1))) {
				return true;
			}
			return !event.player.getHistory("useCard", evt => evt.targets && evt.targets.some(target => target != event.player)).length;
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseControl("获得装备", "摸一张牌")
				.set("prompt", get.prompt2("qieting", trigger.player))
				.forResult();
			event.result = { bool: true, cost_data: result.control };
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (event.cost_data == "获得装备" && target.getEquips().length) {
				const result = await player.choosePlayerCard(target, "e", true).forResult();
				if (result.cards && result.cards.length) {
					await player.gain(result.cards, target, "give");
				}
			} else {
				await player.draw();
			}
		},
		ai: { threaten: 1.0 },
	},

	// 獻州：限定技，出牌阶段，你可以将装备区里的所有牌交给一名其他角色，然后其选择一项：1.令你回复X点体力；2.对其攻击范围内至多X名角色各造成1点伤害。（X为你给出的牌数） 参考xianzhou(yijiang)
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

// ========== yj_jushou 沮授 ==========
	// 漸營：当你于出牌阶段使用牌时，若此牌与你于此阶段内使用的上一张牌花色/点数相同，你可以摸/重铸一张牌。 参考jianying(yijiang)
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
		async cost(event, trigger, player) {
			const { control } = await player.chooseControl("摸牌", "重铸").set("prompt", get.prompt2("jianying")).forResult();
			event.result = { bool: true, cost_data: control };
		},
		async content(event, trigger, player) {
			if (event.cost_data == "摸牌") {
				await player.draw();
			} else {
				const result = await player.chooseCard("he", true).set("prompt2", get.prompt2("jianying")).forResult();
				if (result.bool && result.cards && result.cards.length) {
					await player.recast(result.cards);
				}
			}
		},
		ai: { threaten: 0.8 },
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

	// 矢北：锁定技，当你受到伤害后，若此次伤害是你本回合受到的第一次伤害，则你回复1点体力，否则你失去1点体力。 参考shibei(yijiang)
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

// ========== liuxie 刘协 ==========
	// 天命：当你成为【杀】的目标后，你可以弃置两张牌（不足则全弃，无牌则不弃）并摸两张牌，然后若全场体力值唯一最大的角色不为你，其也可以如此做。 参考tianming(sp)
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
		ai: { threaten: 0.7 },
	},

	// 密詔：出牌阶段限一次，你可以将所有手牌交给一名其他角色，然后令其与你选择的另一名其他角色拼点，拼点赢的角色视为对拼点没赢的角色使用一张【杀】。 参考mizhao(sp)
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

// ========== zhanglu 张鲁 ==========
	// 義舍：每名同势力角色出牌阶段限一次，若你没有“米”，其可以摸两张牌，然后将等量张牌置于你的武将牌上，称为“米”。当你移去最后一张“米”后，你回复1点体力。 参考yishe(sp)
	yishe: {
		skillAnimation: true,
		animationColor: "qun",
		aiShowTag: "draw",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return event.player.isFriendOf(player) && !player.getExpansions("yishe").length;
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		async cost(event, trigger, player) {
			event.result = await trigger.player.chooseBool(get.prompt2("yishe")).forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			await target.draw(2);
			const num = Math.min(2, target.countCards("h"));
			if (num > 0) {
				const result = await target.chooseCard(num, "h", true, `义舍：选择${get.cnNumber(num)}张手牌作为“米”`).forResult();
				if (result.bool && result.cards && result.cards.length) {
					await player.addToExpansion({ cards: result.cards, source: target, gaintag: ["yishe"], animate: "gain2" });
				}
			}
		},
		group: "yishe_recover",
		ai: { threaten: 0.7 },
		subSkill: {
			recover: {
				audio: "yishe",
				trigger: {
					player: ["loseAfter"],
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				filter(event, player) {
					if (player.isHealthy()) {
						return false;
					}
					const evt = event.getl(player);
					if (!evt || !evt.xs || !evt.xs.length || player.getExpansions("yishe").length > 0) {
						return false;
					}
					if (event.name == "lose") {
						for (const i in event.gaintag_map) {
							if (event.gaintag_map[i].includes("yishe")) {
								return true;
							}
						}
						return false;
					}
					return player.hasHistory("lose", function (evt) {
						if (event != evt.getParent()) {
							return false;
						}
						for (const i in evt.gaintag_map) {
							if (evt.gaintag_map[i].includes("yishe")) {
								return true;
							}
						}
						return false;
					});
				},
				forced: true,
				async content(event, trigger, player) {
					await player.recover();
				},
			},
		},
	},

	// 布施：当你受到1点伤害后，你可以令一名同势力角色获得一张“米”；当你对其他角色造成伤害后，你令与其势力相同的一名角色获得一张“米”。 参考bushi(sp)
	bushi: {
		aiShowTag: "support",
		audio: 2,
		trigger: { player: "damageEnd", source: "damageSource" },
		filter(event, player, name) {
			if (!player.getExpansions("yishe").length) {
				return false;
			}
			if (name == "damageSource") {
				return !!(event.player && event.player.isIn());
			}
			return true;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("bushi")).set("ai", () => true).forResult();
		},
		async content(event, trigger, player, name) {
			const refPlayer = name == "damageSource" ? trigger.player : player;
			const candidates = game.filterPlayer(current => sameGroup(current, refPlayer));
			if (!candidates.length) {
				return;
			}
			const result = await player
				.chooseTarget(`布施：请选择一名同势力角色获得一张“米”`, (card, plyr, target) => get.event().candidates.includes(target))
				.set("candidates", candidates)
				.set("ai", target => get.attitude(player, target))
				.forResult();
			const recipient = (result.bool && result.targets && result.targets[0]) || candidates[0];
			if (!recipient || !recipient.isIn()) {
				return;
			}
			const list = player.getExpansions("yishe");
			if (!list.length) {
				return;
			}
			const cardResult = await recipient
				.chooseCardButton("布施：选择获得一张“米”", true, list)
				.set("ai", button => 6 - get.value(button.link))
				.forResult();
			const cards = (cardResult.bool && cardResult.links && cardResult.links.length && cardResult.links) || list.slice(0, 1);
			await recipient.gain(cards, player, "giveAuto", "bySelf");
		},
	},

	// 米道：当一名角色的判定牌生效前，你可以打出一张“米”代替之。每回合限一次，当有角色使用【杀】或伤害类锦囊牌指定目标时，你可以移去一张“米”，然后更改此次使用牌的花色和造成伤害属性。 参考midao(sp)
	midao: {
		skillAnimation: true,
		animationColor: "qun",
		aiShowTag: "recover",
		audio: 2,
		trigger: { global: "judge" },
		group: ["midao_change"],
		filter(event, player) {
			return player.getExpansions("yishe").length > 0 && event.player.isIn();
		},
		async cost(event, trigger, player) {
			const list = player.getExpansions("yishe");
			const result = await player.chooseButton([`米道：是否打出一张“米”代替${get.translation(trigger.player)}的判定牌？`, list]).forResult();
			event.result = { bool: !!(result.bool && result.links && result.links.length), cost_data: result.links && result.links[0] };
		},
		async content(event, trigger, player) {
			const card = event.cost_data;
			if (trigger.player.judging && trigger.player.judging[0]) {
				game.cardsDiscard(trigger.player.judging[0]);
			}
			trigger.player.judging[0] = card;
			if (trigger.orderingCards) {
				trigger.orderingCards.addArray([card]);
			}
			if (!player.getExpansions("yishe").length) {
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
		trigger: { source: "damageBegin1" },
		usable: 1,
		filter(event, player) {
			if (!event.card || (event.card.name != "sha" && get.type(event.card) != "trick")) {
				return false;
			}
			return player.getExpansions("yishe").length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(`米道：是否移去一张“米”，改变${get.translation(trigger.card)}的花色和造成伤害的属性？`).forResult();
		},
		async content(event, trigger, player) {
			const mi = player.getExpansions("yishe").slice(0, 1);
			if (mi.length) {
				await player.loseToDiscardpile(mi);
			}
			const suits = ["heart", "diamond", "club", "spade"].filter(s => s != get.suit(trigger.card));
			const { control: suit } = await player.chooseControl(suits).set("prompt", "米道：选择新的花色").set("choiceList", suits.map(s => get.translation(s))).forResult();
			const natures = ["none", "fire", "thunder", "ice"].filter(n => n != (get.nature(trigger.card) || "none"));
			const { control: nature } = await player
				.chooseControl(natures)
				.set("prompt", "米道：选择新的伤害属性")
				.set("choiceList", natures.map(n => (n == "none" ? "无属性" : get.translation(n))))
				.forResult();
			trigger.card.midao_suit = suit;
			trigger.card.midao_nature = nature == "none" ? "" : nature;
		},
	},

// ========== yanbaihu 严白虎 ==========
	// 雉盜：锁定技，出牌阶段开始时，你选择一名其他角色，然后直到此回合结束，你与其的距离视为1且你不能使用牌指定除你与其外的角色为目标；当你于出牌阶段内首次对其造成伤害后，你获得其区域内的一张牌。 参考本项目guozhan模式自带的gzzhidao(mode/guozhan/src/skill/character/rest.js)，直接照抄到这里，避免分散在多个文件里
	gzzhidao: {
		skillAnimation: true,
		animationColor: "qun",
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		forced: true,
		preHidden: true,
		content() {
			"step 0";
			player.chooseTarget("请选择【雉盗】的目标", "本回合内只能对自己和该角色使用牌，且第一次对其造成伤害时摸一张牌", lib.filter.notMe, true).set("ai", function (target) {
				var player = _status.event.player;
				return (1 - get.sgn(get.attitude(player, target))) * Math.max(1, get.distance(player, target));
			});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.line(target, "green");
				game.log(player, "选择了", target);
				player.storage.gzzhidao2 = target;
				player.addTempSkill("gzzhidao2");
			}
		},
	},
	gzzhidao2: {
		mod: {
			playerEnabled(card, player, target) {
				if (target != player && target != player.storage.gzzhidao2) {
					return false;
				}
			},
			globalFrom(from, to) {
				if (to == from.storage.gzzhidao2) {
					return -Infinity;
				}
			},
		},
		audio: "gzzhidao",
		trigger: { source: "damageSource" },
		forced: true,
		charlotte: true,
		filter(event, player) {
			return (
				event.player == player.storage.gzzhidao2 &&
				player
					.getHistory("sourceDamage", function (evt) {
						return evt.player == event.player;
					})
					.indexOf(event) == 0 &&
				event.player.countGainableCards(player, "hej") > 0
			);
		},
		logTarget: "player",
		content() {
			player.gainPlayerCard(trigger.player, "hej", true);
		},
	},

	// 寄篱：锁定技。当你成为红色基本牌或红色普通锦囊牌的唯一目标后，你令此牌的使用者于此牌结算完成后视为对你使用一张牌名和属性相同的牌。当你于一个阶段内第二次受到伤害时，你防止此伤害并移除此武将牌。 参考本项目guozhan模式自带的gzyjili(mode/guozhan/src/skill/character/rest.js)，直接照抄到这里，避免分散在多个文件里
	gzyjili: {
		audio: 2,
		forced: true,
		preHidden: ["gzyjili_remove"],
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			if (get.color(event.card) != "red" || event.targets.length != 1) {
				return false;
			}
			var type = get.type(event.card);
			return type == "basic" || type == "trick";
		},
		check() {
			return false;
		},
		content() {
			player.addTempSkill("gzyjili2");
			var evt = trigger.getParent();
			if (!evt.gzyjili) {
				evt.gzyjili = [];
			}
			evt.gzyjili.add(player);
		},
		group: "gzyjili_remove",
		subSkill: {
			remove: {
				audio: "gzyjili",
				trigger: { player: "damageBegin2" },
				forced: true,
				filter(event, player) {
					var evt = false;
					for (var i of lib.phaseName) {
						evt = event.getParent(i);
						if (evt && evt.player) {
							break;
						}
					}
					return (
						evt &&
						evt.player &&
						player.getHistory("damage", function (evtx) {
							return evtx.getParent(evt.name) == evt;
						}).length == 1
					);
				},
				content() {
					trigger.cancel();
					player.removeCharacter(get.character(player.name1, 3).includes("gzyjili") ? 0 : 1);
				},
			},
		},
	},
	gzyjili2: {
		trigger: { global: "useCardAfter" },
		charlotte: true,
		popup: false,
		forced: true,
		filter(event, player) {
			return (
				event.gzyjili &&
				event.gzyjili.includes(player) &&
				!event.addedTarget &&
				event.player &&
				event.player.isAlive() &&
				event.player.canUse(
					{
						name: event.card.name,
						nature: event.card.nature,
						isCard: true,
					},
					player
				)
			);
		},
		content() {
			trigger.player.useCard(
				{
					name: trigger.card.name,
					nature: trigger.card.nature,
					isCard: true,
				},
				player,
				false
			);
		},
	},

// ========== huangfusong 皇甫嵩 ==========
	// 觀火：出牌阶段，你可以视为使用一张【火攻】，当此牌结算结束后，若此牌未造成伤害且你于此阶段：第一次发动此技能，此阶段你使用【火攻】造成的伤害+1；不为第一次发动此技能，你失去此技能。
	// 参考jsrg包jsrgguanhuo——之前误标"原创无参考"，而且旧代码(选牌比花色、弃同花色牌免伤)和这条翻译文本完全对不上，应是搬错了别的技能的实现，现按jsrgguanhuo的viewAs火攻结构重写。
	guanhuo: {
		audio: 2,
		enable: "phaseUse",
		viewAs: {
			name: "huogong",
			isCard: true,
			storage: { guanhuo: true },
		},
		async precontent(event, trigger, player) {
			player.addTempSkill("guanhuo_effect");
		},
		filterCard: () => false,
		selectCard: -1,
		prompt: "视为使用一张【火攻】",
		ai: {
			order(item, player) {
				return get.order({ name: "huogong" }) + 0.01;
			},
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return event.card?.storage?.guanhuo && !game.hasPlayer2(current => current.hasHistory("damage", evt => evt.card == event.card));
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const count = player.getHistory("useSkill", evt => {
						return evt.skill == "guanhuo" && evt.event.getParent("phaseUse") === trigger.getParent("phaseUse");
					}).length;
					if (count == 1) {
						player.addTempSkill("guanhuo_ex", "phaseUseAfter");
						player.addMark("guanhuo_ex", 1, false);
					} else {
						await player.removeSkills("guanhuo");
					}
				},
			},
			ex: {
				charlotte: true,
				onremove: true,
				intro: { content: "你使用【火攻】造成的伤害+#" },
				trigger: { source: "damageBegin1" },
				filter(event, player) {
					return event.card?.name == "huogong" && event.getParent().type == "card";
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					trigger.num += player.countMark("guanhuo_ex");
				},
			},
		},
	},

// ========== taoqian 陶谦 ==========
	// 招禍：锁定技，当其他角色进入濒死状态时，若你的体力上限大于1，你减1点体力上限，然后摸两张牌。 参考zhaohuo(mobile)
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

	// 義襄：锁定技，其他角色的出牌阶段内，其使用的第一张牌对你造成伤害时，此伤害-1；若其使用的第二张牌为黑色，则对你无效。 参考yixiang(mobile)
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
		ai: { threaten: 0.6 },
	},

	// 揖讓：限定技，出牌阶段开始时，你可以展示所有牌，将其中的非基本牌交给一名其他角色，然后若其体力上限大于你，你将体力上限加至与其相同并回复X点体力（X为你以此法交给其的牌数）。然后你失去“招祸”。 参考yirang(mobile)
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
			event.result = await player
				.chooseBool(get.prompt2("yirang"))
				// 揖讓会把手牌全部展示交出去，还搭上"招祸"，只有自己体力上限已经很低（≤2）
				// 快撑不住的时候换血才划算，体力上限还高时AI不应该主动发动
				.set("ai", () => player.maxHp <= 2)
				.forResult();
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

// ========== quyi 麹义 ==========
	// 伏骑：锁定技，你距离其为1的其他角色不能响应你使用的【杀】或普通锦囊牌。 参考fuqi(sp)
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
		ai: { threaten: 1.5 },
	},
	// 骄恣：锁定技，当你造成或受到伤害时，若你的手牌数是全场最多，伤害来源可以获得受伤角色一张牌。 参考jiaozi(sp)
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

// ========== beimihu 卑弥呼 ==========
	// 鬼术：出牌阶段，你可以将一张♠手牌当【知己知彼】或【远交近攻】使用（不可与你本回合上次以此法使用的牌相同）。
	// 参考guozhan包gz_beimihu的gzguishu——之前误标"原创无参考"，实际存在且角色(卑弥呼)、配对技能(远域/远城)都对得上，机制等价(官方用chooseButton二选一，本地拆成两个互斥viewAs子技能)。
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
	// 远城：锁定技，当你受到伤害时，若你不在伤害来源攻击范围内，此伤害-1。
	// 参考guozhan包gz_beimihu的gzyuanyu(远域)——之前误标"原创无参考"，卑弥呼配对技能一致，只是官方额外处理"伤害无来源"这种边界情况，本地卡面翻译没有这一条，故未加。
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
		ai: { threaten: 0.7 },
	},

// ========== xushao 许劭 ==========
	// 盈门：锁定技，当你首次明置此武将牌时，你在剩余武将牌堆中将四张武将牌置于你的武将牌上，称为“访客”；当你受到或造成伤害后，你获得一张“访客”；回合开始前，你可以移去任意张“访客”，然后从剩余武将牌堆将“访客”补至四张。 参考sbyingmen(jsrg，改写数量与获得时机)
	yingmen: {
		skillAnimation: true,
		animationColor: "qun",
		init(player) {
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const characters = _status.characterlist.randomRemove(4);
			lib.skill.yingmen.addVisitors(characters, player);
		},
		group: ["yingmen_gain", "yingmen_reload"],
		ai: {
			threaten: 1.2,
			combo: "pingjian",
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
			player.addSkillBlocker("yingmen");
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
			player.markAuto("yingmen", characters);
			let storage = player.getStorage("yingmen");
			let skills = lib.skill.yingmen.getSkills(storage, player);
			player.addInvisibleSkill(skills);
		},
		removeVisitors(characters, player) {
			let skills = lib.skill.yingmen.getSkills(characters, player);
			let characters2 = player.getStorage("yingmen").slice(0);
			characters2.removeArray(characters);
			skills.removeArray(lib.skill.yingmen.getSkills(characters2, player));
			if (Array.isArray(player.tempname)) {
				game.broadcastAll((player, characters) => player.tempname.removeArray(characters), player, characters);
			}
			player.unmarkAuto("yingmen", characters);
			_status.characterlist.addArray(characters);
			player.removeInvisibleSkill(skills);
		},
		onremove(player, skill) {
			lib.skill.yingmen.removeVisitors(player.getStorage("yingmen"), player);
			player.removeSkillBlocker("yingmen");
		},
		skillBlocker(skill, player) {
			if (!player.invisibleSkills.includes(skill) || skill == "pingjian" || skill == "yingmen") {
				return false;
			}
			player.removeSkillBlocker("yingmen");
			const bool = !player.hasSkill("pingjian");
			player.addSkillBlocker("yingmen");
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
				let skills = lib.skill.yingmen.getSkills(storage, player);
				if (skills.length) {
					dialog.addText("<li>当前可用技能：" + get.translation(skills), false);
				}
			},
		},
	},
	yingmen_gain: {
		charlotte: true,
		trigger: { player: "damageEnd", source: "damageSource" },
		forced: true,
		popup: false,
		filter(event, player, name) {
			if (name == "damageSource") {
				return !!(event.player && event.player.isIn());
			}
			return true;
		},
		async content(event, trigger, player) {
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const characters = _status.characterlist.randomRemove(1);
			if (characters.length) {
				lib.skill.yingmen.addVisitors(characters, player);
			}
		},
	},
	yingmen_reload: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		async content(event, trigger, player) {
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const num = player.getStorage("yingmen").length;
			if (num > 0) {
				const result = await player
					.chooseButton(["盈门：是否移去任意名访客？", [player.getStorage("yingmen"), "character"]], [0, num])
					.forResult();
				if (result?.bool && result.links?.length) {
					lib.skill.yingmen.removeVisitors(result.links, player);
				}
			}
			const characters = _status.characterlist.randomRemove(4 - player.getStorage("yingmen").length);
			if (characters.length) {
				lib.skill.yingmen.addVisitors(characters, player);
			}
		},
	},

	// 评鉴：你于“访客”的无类型标签技能的发动时机可以发动该技能，然后你选择一项：1.移去该“访客”并摸一张牌；2.移去另一张“访客”。 参考sbpingjian(jsrg)
	pingjian: {
		trigger: { player: ["useSkill", "logSkillBegin"] },
		forced: true,
		locked: false,
		filter(event, player) {
			let skill = get.sourceSkillFor(event);
			return player.invisibleSkills.includes(skill) && lib.skill.yingmen.getSkills(player.getStorage("yingmen"), player).includes(skill);
		},
		async content(event, trigger, player) {
			const visitors = player.getStorage("yingmen").slice(0);
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
				lib.skill.yingmen.removeVisitors(result.links, player);
				game.log(player, "移去了", "#y" + get.translation(result.links[0]));
				if (event.drawers.includes(result.links[0])) {
					player.addTempSkill("pingjian_draw");
					player.markAuto("pingjian_draw", [trigger.skill]);
				}
			}
		},
		group: "pingjian_trigger",
		subSkill: {
			draw: {
				charlotte: true,
				onremove: true,
				trigger: { player: ["useSkillAfter", "logSkill"] },
				forced: true,
				popup: false,
				filter(event, player) {
					return player.getStorage("pingjian_draw").includes(event.skill);
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
					let skills = lib.skill.yingmen.getSkills(player.getStorage("yingmen"), player);
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
		ai: { combo: "yingmen" },
	},

// ========== miheng 祢衡 ==========
	// 狂才：锁定技，你于回合内使用牌无距离和次数限制。若你本回合：未使用过牌，你的手牌上限+1；使用过牌且未造成过伤害，你的手牌上限-1。 参考rekuangcai(re)
	kuangcai: {
		audio: "kuangcai",
		mod: {
			cardUsable() {
				return Infinity;
			},
			targetInRange() {
				return true;
			},
			maxHandcard(player, num) {
				if (!player.storage.kuangcai_used) {
					return num + 1;
				}
				if (!player.storage.kuangcai_damaged) {
					return num - 1;
				}
				return num;
			},
		},
		trigger: { player: ["useCard", "phaseZhunbeiBegin"], source: "damageSource" },
		forced: true,
		popup: false,
		content(event, trigger, player, name) {
			if (name == "phaseZhunbeiBegin") {
				player.storage.kuangcai_used = false;
				player.storage.kuangcai_damaged = false;
			} else if (name == "useCard") {
				player.storage.kuangcai_used = true;
			} else {
				player.storage.kuangcai_damaged = true;
			}
		},
		ai: { threaten: 1.4 },
	},
	// 舌剑：当你成为其他角色使用牌的唯一目标后，你可以弃置所有手牌（至少一张），然后选择一项：1.弃置其等量牌；2.若没有角色处于濒死状态，你对其造成1点伤害。 参考reshejian(re)
	shejian: {
		aiShowTag: "support",
		aiShowCost: true,
		audio: "shejian",
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return !!(event.targets && event.targets.length == 1 && player.countCards("h") > 0);
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const result = await player
				.chooseToDiscard("h", player.countCards("h"), false)
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

// ========== yl_luzhi 卢植 ==========
	// 儒宗：回合结束时，若你本回合使用牌指定过的目标角色均为同一名，你可以将手牌数摸至与其相同（至多摸五张），只是若为你，你可以改为令任意名其他角色将手牌数摸至与你相同。
	// 参考jsrg包jsrgruzong(卢植)——之前误标"原创无参考"，机制/数值基本一致，本地用独立的ruzong_track子技能代替官方checkHistory的写法。
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
					.chooseTarget("儒宗：是否令任意名其他角色将手牌数摸至与你相同？", [0, Infinity], (card, pl, ta) => ta != player)
					.forResult();
				if (result?.bool && result.targets?.length) {
					for (const other of result.targets) {
						if (!other.isIn()) {
							continue;
						}
						const diff = player.countCards("h") - other.countCards("h");
						if (diff > 0) {
							await other.draw(diff);
						}
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
	// 蹈刃：出牌阶段限一次，你可以将一张手牌交给一名其他角色，然后对你与其攻击范围内均包含的所有角色各造成1点伤害。
	// 参考jsrg包jsrgdaoren(卢植)——之前误标"原创无参考"，机制一致，仅伤害类型本地用damage(1)而非官方的damage("nocard")。
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
			threaten: 0.8,
			order: 6,
			result: {
				target(player, target) {
					return get.attitude(player, target) < 0 ? 1 : -1;
				},
			},
		},
	},

// ========== liuyan 刘焉 ==========
	// 图射：当你使用非基本牌指定目标后，你可以展示所有手牌，若其中没有基本牌，则你可以摸一张牌。 参考xinfu_tushe(xinfu)
	tushe: {
		aiShowTag: "draw",
		audio: "tushe",
		trigger: { player: "useCard" },
		filter(event, player) {
			return !!(event.card && get.type(event.card) != "basic" && event.targets && event.targets.length);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("tushe"), "是否展示所有手牌，查看能否摸一张牌？")
				.set("ai", () => !get.player().countCards("h", card => get.type(card) == "basic"))
				.forResult();
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
	// 立牧：出牌阶段，你可以将一张♦牌当【乐不思蜀】对自己使用，然后回复1点体力，本回合你对攻击范围内的其他角色使用牌无次数和距离限制。 参考xinfu_limu(xinfu)
	limu: {
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
			player.addTempSkill("limu_buff", "phaseUseAfter");
		},
		ai: { threaten: 0.7 },
	},
	limu_buff: {
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

// ========== xunchen 荀谌 ==========
	// 锋略：出牌阶段限一次，你可以与一名角色拼点：若你赢，其将区域里的两张牌交给你；若其赢，你交给其一张牌。 参考refenglve(re，去除平局额外效果)
	fenglve: {
		aiShowTag: "support",
		audio: "fenglve",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => current != player && player.canCompare(current));
		},
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			if (!target.isIn() || !player.canCompare(target)) {
				return;
			}
			const result = await player.chooseToCompare(target).forResult();
			if (result.bool) {
				if (target.countCards("ej")) {
					await player.gainPlayerCard(target, "ej", true, 2);
				}
			} else if (player.countCards("he")) {
				await player.chooseToGive(target, "he", true, `锋略：交给${get.translation(target)}一张牌`, 1).forResult();
			}
		},
	},
	// 暗涌：每回合限一次，当与你势力相同的角色对另一名其他角色造成伤害时，你可以令此伤害值翻倍，然后若受伤角色：武将牌均明置，你失去1点体力且此技能本轮失效；仅明置一张武将牌，你弃置两张牌。 参考anyong(huicui，改写判定条件与效果)
	anyong: {
		skillAnimation: true,
		animationColor: "qun",
		aiShowTag: "support",
		aiShowCost: true,
		audio: "anyong",
		trigger: { global: "damageBegin1" },
		filter(event, player) {
			return !!(
				event.source &&
				event.source != player &&
				event.source.isIn() &&
				event.source.isFriendOf(player) &&
				event.player &&
				event.player != event.source &&
				event.player.isIn() &&
				player.storage.anyong_round !== game.phaseNumber
			);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("anyong", trigger.player)).forResult();
		},
		async content(event, trigger, player) {
			player.storage.anyong_round = game.phaseNumber;
			trigger.num *= 2;
			const target = trigger.player;
			if (!target.isIn()) {
				return;
			}
			const seen0 = !(target.isUnseen && target.isUnseen(0));
			const seen1 = !(target.isUnseen && target.isUnseen(1));
			if (seen0 && seen1) {
				await player.loseHp();
				player.storage.anyong_disabled_round = game.roundNumber;
			} else if (seen0 !== seen1) {
				if (player.countCards("he")) {
					await player.chooseToDiscard(2, "he", true).forResult();
				}
			}
		},
		ai: { threaten: 1.3 },
	},

// ========== xurong 徐荣 ==========
	// 凶镶：当你首次明置此武将牌后，你获得3枚“暴戾”。出牌阶段，你可以交给一名没有“暴戾”且与你势力不同的其他角色1枚“暴戾”。你对有“暴戾”的其他角色造成的伤害+1（每回合每名角色限一次），且其出牌阶段开始时，弃其“暴戾”并随机执行一项：1.受到你造成的1点火焰伤害且本回合不能对你使用【杀】；2.失去1点体力且本回合手牌上限-1；3.你获得其一张装备区里的牌和一张手牌。 参考xinfu_xionghuo(xinfu，沿用暴戾机制并按卡面重做数值)
	xionghuo: {
		skillAnimation: true,
		animationColor: "qun",
		aiShowTag: "support",
		init(player) {
			player.storage.xionghuo_supply = 3;
			player.addSkill("xionghuo_dmg");
		},
		audio: "xionghuo",
		enable: "phaseUse",
		filter(event, player) {
			return (
				(player.storage.xionghuo_supply || 0) > 0 &&
				game.hasPlayer(current => current != player && diffGroup(current, player) && !current.storage.xionghuo_holder)
			);
		},
		filterTarget(card, player, target) {
			return target != player && diffGroup(target, player) && !target.storage.xionghuo_holder;
		},
		prompt: "凶镶：交给一名没有“暴戾”且势力不同的其他角色1枚“暴戾”",
		async content(event, trigger, player) {
			const target = event.target;
			player.storage.xionghuo_supply = (player.storage.xionghuo_supply || 0) - 1;
			target.storage.xionghuo_holder = player;
			target.addSkill("xionghuo_punish");
			player.popup("暴戾");
		},
		ai: {
			threaten: 1.4,
			order: 9,
			result: {
				target(player, target) {
					return -get.attitude(player, target);
				},
			},
		},
	},
	xionghuo_dmg: {
		charlotte: true,
		trigger: { global: "damageBegin1" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !!(
				event.player &&
				event.player != player &&
				event.player.storage.xionghuo_holder === player &&
				event.player.storage.xionghuo_hit !== game.phaseNumber
			);
		},
		content(event, trigger, player) {
			trigger.num++;
			trigger.player.storage.xionghuo_hit = game.phaseNumber;
		},
	},
	xionghuo_punish: {
		charlotte: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return !!player.storage.xionghuo_holder;
		},
		async content(event, trigger, player) {
			const source = player.storage.xionghuo_holder;
			delete player.storage.xionghuo_holder;
			player.removeSkill("xionghuo_punish");
			const choice = Math.floor(Math.random() * 3);
			if (choice === 0 && source?.isIn()) {
				await player.damage(1, source, "fire");
				player.storage.xionghuo_ban_source = source;
				player.addTempSkill("xionghuo_ban", "phaseAfter");
			} else if (choice === 1) {
				await player.loseHp();
				player.addTempSkill("xionghuo_hclimit", "phaseAfter");
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
	xionghuo_ban: {
		charlotte: true,
		mod: {
			cardEnabled2(card, player, target) {
				if (card.name == "sha" && target === player.storage.xionghuo_ban_source) {
					return false;
				}
			},
		},
		onremove(player) {
			delete player.storage.xionghuo_ban_source;
		},
	},
	xionghuo_hclimit: {
		charlotte: true,
		mod: {
			maxHandcard(player, num) {
				return num - 1;
			},
		},
	},

// ========== huangzu 黄祖 ==========
	// 袭射：其他角色的准备阶段，你可以弃置装备区里的一张牌，视为对其使用一张【杀】，若其体力值小于你，此【杀】不能被响应，然后你可以重复此流程。若你以此法杀死了其他角色，此回合结束时你可以变更一次副将且变更后的副将处于暗置状态。 参考xishe(dc)
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
					.set("prompt", "袭射：弃置一张装备区里的牌，视为对其使用一张【杀】")
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
				const cont = await player.chooseBool("袭射：是否继续弃置装备区里的牌，视为对其使用【杀】？").forResult();
				if (!cont.bool) {
					break;
				}
			}
			if (killed) {
				// 不能直接用"phaseAfter"当过期条件——xishe_change自己的trigger也是phaseAfter，
				// 触发事件名撞过期条件会导致引擎在该触发的这一刻先把技能过期删掉，永远等不到执行
				// (跟duojing_after是同一类bug)，改成不会自然满足的{global:[]}，靠content自己收尾
				player.addTempSkill("xishe_change", { global: [] });
			}
		},
		ai: { threaten: 1.6 },
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
			// expire改成了{global:[]}不会自然过期，不管选是否都要在这里手动收尾，
			// 否则以后每个phaseAfter都会再问一次
			player.removeSkill("xishe_change");
		},
		async content(event, trigger, player) {
			// xishe_change是附加的临时技能，不属于任何角色，无法通过技能id反查槽位，
			// 所以固定传1(副将)——这个技能本来就是"变更一次副将"，不是通用换将
			await pickAndChangeCharacter(player, 1, "袭射：请选择要变更为的副将");
		},
	},

// ========== lvlingqi 吕玲绮 ==========
	// 帼武：出牌阶段开始时，你可以展示全部手牌，根据你展示的类别数，你获得对应效果：至少一类，从弃牌堆获得一张【杀】；至少两类，此阶段使用牌无距离限制；至少三类，此阶段使用【杀】可以多指定两名角色为目标（此效果每回合限一次）。 参考guowu(huicui)
	guowu: {
		skillAnimation: true,
		animationColor: "qun",
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
	// 妆戎：出牌阶段限一次，你可以弃置一张锦囊牌，若如此做你视为拥有标准版“无双”直到此阶段结束。 参考zhuangrong(huicui)
	zhuangrong: {
		skillAnimation: true,
		animationColor: "qun",
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
		ai: { threaten: 1.4 },
	},
	// 神威：锁定技，摸牌阶段，你额外摸两张牌；你的手牌上限+2。 参考llqshenwei(huicui，之前误标"原创无参考"，实际存在且完全一致)
	shenwei2: {
		audio: "shenwei2",
		mod: {
			maxHandcard(player, num) {
				return num + 2;
			},
		},
		trigger: { player: "phaseDrawBegin2" },
		forced: true,
		popup: false,
		filter(event) {
			return !event.numFixed;
		},
		content(event, trigger, player) {
			trigger.num += 2;
		},
	},

// ========== liuzhang 刘璋 ==========
	// 引戈：出牌阶段限一次，你可以令一名其他角色交给你两张牌，然后其视为对你或你攻击范围内另一名其他角色使用一张【杀】。 参考lz_yinge(原创，未见对应官方技能)
	yinge: {
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
			const result = await target
				.chooseTarget(`引戈：选择一名角色，视为对其使用一张【杀】`, (card, plyr, to) => get.event().candidates.includes(to))
				.set("candidates", candidates)
				.forResult();
			if (result && result.bool && result.targets && result.targets.length) {
				const victim = result.targets[0];
				if (target.isIn() && victim.isIn() && target.canUse({ name: "sha", isCard: true }, victim, false)) {
					await target.useCard({ name: "sha", isCard: true }, victim, false, "noai");
				}
			}
		},
		ai: { threaten: 1.0 },
	},
	// 施仁：每回合限一次，当你成为其他角色使用【杀】的目标后，你可以摸两张牌，然后交给该角色一张牌。 参考lz_shiren(原创，未见对应官方技能)
	shiren: {
		skillAnimation: true,
		animationColor: "qun",
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
	// 据益：同势力其他角色每回合首次对你造成伤害时其可以防止此伤害，然后获得你的一张牌。你每回合首次受到虚拟牌造成的伤害或者失去体力时，你可以弃置两张牌，防止之。 参考lz_juyi(原创，未见对应官方技能)
	juyi2: {
		audio: 2,
		group: ["juyi2_source", "juyi2_self"],
	},
	juyi2_source: {
		aiShowTag: "defense",
		sourceSkill: "juyi2",
		trigger: { player: "damageBefore" },
		filter(event, player) {
			return event.source && event.source !== player && event.source.isIn() && event.source.isFriendOf(player) && event.source.storage.juyi2_round !== game.phaseNumber;
		},
		async cost(event, trigger, player) {
			event.result = await trigger.source.chooseBool(`据益：是否防止你对${get.translation(player)}造成的伤害，然后获得其一张牌？`).forResult();
		},
		async content(event, trigger, player) {
			trigger.source.storage.juyi2_round = game.phaseNumber;
			trigger.cancel();
			if (player.countCards("he")) {
				await trigger.source.gainPlayerCard(player, "he", true);
			}
		},
	},
	juyi2_self: {
		aiShowTag: "defense",
		aiShowCost: true,
		sourceSkill: "juyi2",
		trigger: { player: ["damageBefore", "loseHpBefore"] },
		filter(event, player) {
			if (player.storage.juyi2_self_round === game.phaseNumber) {
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
			player.storage.juyi2_self_round = game.phaseNumber;
			await player.chooseToDiscard(2, "he", true).forResult();
			trigger.cancel();
		},
	},

// ========== simaliang 司马亮 ==========
	// 慴懼：锁定技，当你使用【杀】指定唯一目标后或成为【杀】的唯一目标后，你与对方议事：若结果为黑色，双方各减1点体力上限；否则意见为黑色的角色摸两张牌。 参考sml_sheju(hb)
	sheju: {
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
	// 族望：锁定技，准备阶段和结束阶段，你将手牌摸至体力上限。 参考sml_zuwang(hb)
	zuwang: {
		audio: 2,
		trigger: { player: ["phaseZhunbeiBegin", "phaseAfter"] },
		forced: true,
		filter(event, player) {
			return player.countCards("h") < player.maxHp;
		},
		async content(event, trigger, player) {
			await player.draw(player.maxHp - player.countCards("h"));
		},
		ai: { threaten: 0.9 },
	},

// ========== wangyun 王允 ==========
	// 赦论：出牌阶段限一次，你可以选择一名你攻击范围内的其他角色，然后你令除其外所有手牌数不大于你的角色议事，结果为：红色，你弃置其2张牌；黑色，你对其造成1点伤害。
	// 参考jsrg包jsrgshelun(王允)——之前误标"原创无参考"，议事+红弃牌/黑伤害的整体结构一致；本地卡面把目标限定在攻击范围内、黑色伤害改成1点，是与官方jsrgshelun(无范围限制、伤害2点)的有意差异，未改动。
	shelun: {
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
		ai: { threaten: 1.3 },
	},
	// 伐异：当你参与议事结束后，你可以对一名意见与你不同的角色造成1点伤害。
	// 参考jsrg包jsrgfayi(王允)——之前误标"原创无参考"，机制一致，本地限定只能选一名目标而官方允许多选，与本地翻译文本("一名角色")相符，未改动。
	fayi: {
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

// ========== jiananfeng 贾南风 ==========
	// 擅政：出牌阶段限一次，你可以与任意名角色议事，若结果为红色，你对一名未参与议事的角色造成1点伤害；黑色，你获得意见牌。 参考jsrg包jsrgshanzheng(贾南风)，机制一致
	shanzheng: {
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
		ai: { threaten: 1.5 },
	},
	// 凶暴：当你参与议事时，你可以额外展示一张手牌，若如此做，其他角色改为随机展示手牌。
	// 参考jsrg包jsrgxiongbao(贾南风)——之前那张"额外展示"的牌只是走了player.showCards()做视觉展示，从没真正塞进trigger.fixedResult，等于对议事结果毫无影响，是个功能性bug；官方版本会把玩家自己选的两张牌都算进议事意见里。改为把两张牌都push进fixedResult，同时把filter的手牌数门槛从>0改成>1(至少要有两张牌才谈得上"额外")。
	xiongbao: {
		aiShowTag: "support",
		audio: 2,
		trigger: { global: "chooseToDebateBegin" },
		filter(event, player) {
			return event.list && event.list.includes(player) && player.countCards("h") > 1;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool("凶暴：是否额外展示一张手牌，令其余参与者改为随机展示手牌？").forResult();
		},
		async content(event, trigger, player) {
			const hs = player.getCards("h");
			const extra = hs.randomGet();
			const first = hs.filter(c => c !== extra).randomGet();
			await player.showCards([extra], `${get.translation(player)}发动了〖凶暴〗`);
			trigger.fixedResult = (trigger.fixedResult || []).concat([
				[player, first],
				[player, extra],
			]);
			const others = trigger.list.filter(target => target !== player && target.countCards("h") > 0);
			if (others.length) {
				trigger.fixedResult = trigger.fixedResult.concat(others.map(target => [target, target.getCards("h").randomGet()]));
			}
		},
	},
	// 烈妒：锁定技，其他女性角色和手牌数最大的角色不能响应你使用的牌。
	// 参考jsrg包jsrgliedu(贾南风)——之前只写了个ai.norespond的AI提示标签，从没有真正让这些角色"不能响应"，规则层面完全没生效，是个功能性bug。改为forced技能直接把符合条件的角色塞进trigger.directHit(引擎里"不能响应此牌"的真实机制)。
	// 官方jsrgliedu的"手牌数最大"判定标准是"比你(贾南风)自己多"，与本地卡面翻译"全场手牌数最大的角色"不同，此处按本地翻译文本实现。
	liedu: {
		audio: 2,
		forced: true,
		trigger: { player: "useCard" },
		filterx(current, player) {
			if (current === player) {
				return false;
			}
			if (current.hasSex("female")) {
				return true;
			}
			const maxCount = Math.max(0, ...game.filterPlayer().map(p => p.countCards("h")));
			return maxCount > 0 && current.countCards("h") === maxCount;
		},
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.liedu.filterx(current, player));
		},
		async content(event, trigger, player) {
			trigger.directHit.addArray(game.filterPlayer(current => lib.skill.liedu.filterx(current, player)));
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				return lib.skill.liedu.filterx(arg.target, player);
			},
		},
	},

// ========== liuhong 刘宏 ==========
	// 朝争：出牌阶段开始时，你可以与所有其他角色议事，若结果为红色，所有意见为红色的角色回复1点体力；若结果为黑色，所有意见为红色的其他角色各失去1点体力。若所有结果均一致，所有与你势力相同的角色摸一张牌，本回合你视为大势力。
	// 与卡面文字核对一致；onlyOL包olchaozheng(闪刘宏)也是议事机制，但具体红黑结算数值和这张卡不同，本地已经在用真正的player.chooseToDebate()实现卡面这套数值，不是另起炉灶，无需按官方数值改。
	chaozheng: {
		skillAnimation: true,
		animationColor: "qun",
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
						player.storage.chaozheng_big = true;
						player.markSkill("chaozheng");
						player.addTempSkill("chaozheng_clear", "phaseAfter");
					}
				});
		},
	},
	chaozheng_clear: {
		charlotte: true,
		onremove(player) {
			delete player.storage.chaozheng_big;
		},
	},
	// 甚宠：限定技，出牌阶段，你可以令一名其他角色获得“飞扬”和“跋扈”，然后当你死亡时，该角色失去这些技能，杀死你的角色弃置所有手牌。
	// 参考onlyOL包olshenchong(闪刘宏)——之前的授予/死亡结算结构写得比较随意，改用官方的awakenSkill+addSkills+die子技能(判定来源弃牌、目标失去技能)结构；飞扬/跋扈内容改用官方olrefeiyang/jsrgbahu的实际效果(此前是自造的"杀无次数限制"/"用牌无距离限制"，找不到出处)。
	shenchong: {
		aiShowTag: "support",
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		enable: "phaseUse",
		filterTarget: lib.filter.notMe,
		derivation: ["feiyang", "bahu"],
		async content(event, trigger, player) {
			const { target, name: skillName } = event;
			player.awakenSkill(skillName);
			await target.addSkills(["feiyang", "bahu"]);
			player.addSkill(skillName + "_die");
			player.markAuto(skillName + "_die", [target]);
		},
		ai: { threaten: 1.6 },
		subSkill: {
			die: {
				audio: "jsrgshenchong",
				charlotte: true,
				trigger: { player: "die" },
				filter(event, player) {
					return (event.source?.isIn() && event.source.countCards("h")) || player.getStorage("shenchong_die").some(current => current.isIn());
				},
				forced: true,
				forceDie: true,
				async content(event, trigger, player) {
					const source = trigger.source;
					if (source?.isIn() && source.countCards("h")) {
						player.line(source);
						await source.chooseToDiscard(source.countCards("h"), "h", true);
						await game.delayx();
					}
					const targets = player
						.getStorage("shenchong_die")
						.filter(current => current.isIn())
						.sortBySeat();
					if (targets.length > 0) {
						player.line(targets);
						for (const current of targets) {
							await current.removeSkills(["feiyang", "bahu"]);
						}
						await game.delayx();
					}
				},
			},
		},
	},
	// 飞扬：判定阶段开始时，若判定区有牌，你可以弃置两张牌，然后弃置判定区里的所有牌。 参考onlyOL包olrefeiyang
	feiyang: {
		trigger: { player: "phaseJudgeBegin" },
		filter(event, player) {
			return (
				player.countCards("j") &&
				player.countCards("he", card => {
					if (get.position(card) === "h" && _status.connectMode) {
						return false;
					}
					return lib.filter.cardDiscardable(card, player);
				}) > 1
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("he", 2, get.prompt(event.skill), "弃置两张牌，然后弃置判定区里的所有牌")
				.set("logSkill", event.skill)
				.set("ai", card => {
					return _status.event.goon ? 9 - get.value(card) : 0;
				})
				.set(
					"goon",
					(() => {
						if (player.hasSkillTag("rejudge") && player.countCards("j") < 2) {
							return false;
						}
						if (player.hasSkill("dckanyu", null, false, false) && !player.hasCards("j", card => card.name == "lebu")) {
							return false;
						}
						return player.hasCard(function (card) {
							if (get.tag(card, "damage") && get.damageEffect(player, player, _status.event.player, get.natureList(card)) >= 0) {
								return false;
							}
							return (
								get.effect(
									player,
									{
										name: card.viewAs || card.name,
										cards: [card],
									},
									player,
									player
								) < 0
							);
						}, "j");
					})()
				)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discardPlayerCard(player, "j", true, player.countCards("j"));
		},
	},
	// 跋扈：准备阶段，你摸一张牌，你使用【杀】的次数上限+1。 参考jsrgbahu
	bahu: {
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		async content(event, trigger, player) {
			await player.draw();
		},
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return num + 1;
				}
			},
		},
	},

// ========== liubian 刘辩 ==========
	// 诗怨：每回合每项限一次，当你成为其他角色使用牌的目标后，若其体力值大于你，你可以摸两张牌；否则，你可以摸一张牌。 参考shiyuan(xianding)
	shiyuan: {
		aiShowTag: "draw",
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		frequent: true,
		filter(event, player) {
			if (!event.player || event.player === player) {
				return false;
			}
			const branch = event.player.hp > player.hp ? "gt" : "le";
			return !player.getHistory("gain", evt => evt.getParent("shiyuan")?.branch === branch).length;
		},
		async cost(event, trigger, player) {
			const branch = trigger.player.hp > player.hp ? "gt" : "le";
			event.result = await player.chooseBool(`诗怨：是否摸${branch === "gt" ? "两" : "一"}张牌？`).forResult();
		},
		async content(event, trigger, player) {
			const branch = trigger.player.hp > player.hp ? "gt" : "le";
			event.branch = branch;
			await player.draw(branch === "gt" ? 2 : 1);
		},
	},
	// 毒逝：锁定技，你将受到伤害时，改为失去等量体力。 参考dushi(xianding)
	dushi: {
		audio: 2,
		trigger: { player: "damageBefore" },
		forced: true,
		async content(event, trigger, player) {
			trigger.cancel();
			await player.loseHp(trigger.num);
		},
		ai: { threaten: 0.6 },
	},

// ========== duyu 杜预 ==========
	// 武库：锁定技，当与你势力不同的角色使用装备牌时，若你的“武库”标记数小于3，你获得1枚“武库”标记。 参考gz_wuku(guozhan native，上限按要求从官方的2改成3)
	wuku: {
		audio: "spwuku",
		trigger: { global: "useCard" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			if (get.type(event.card) != "equip") {
				return false;
			}
			// 原来用!player.isFriendOf(event.player)判断"势力不同"，但isFriendOf在对方未定势力时
			// 也返回false（既不是朋友也不确定是敌人），会被误判成"势力不同"而触发；改用diffGroup，
			// 要求双方都已经明确势力且确实不同才算数，对面没有势力(未明置)时不发动
			if (!diffGroup(player, event.player)) {
				return false;
			}
			return player.countMark("wuku") < 3;
		},
		async content(event, trigger, player) {
			player.addMark("wuku", 1);
		},
		marktext: "库",
		intro: {
			content: "mark",
		},
		ai: {
			combo: "miewu",
		},
	},
	// 灭吴：每回合限一次，你可以移去1个“武库”标记，将一张牌当任意一张非装备牌使用或打出，然后你摸一张牌。 参考gz_miewu(guozhan native, mode/guozhan/src/skill/character/yingbian.js)，直接照抄官方代码（只把gz_前缀去掉换成本项目已有的wuku/miewu命名），
	// 修正了之前homebrew重写版本丢掉的细节：可选区域是"hse"(含展示区)不是"he"；【杀】要分火/雷属性分别列出候选；排除了万箭齐发等几张选完牌还要另外处理目标的复杂锦囊。
	miewu: {
		skillAnimation: true,
		animationColor: "qun",
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		filter(event, player) {
			if (!player.countMark("wuku") || !player.countCards("hse") || player.hasSkill("miewu_used")) {
				return false;
			}
			for (let i of lib.inpile) {
				let type = get.type2(i);
				if ((type == "basic" || type == "trick") && event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				let list = [];
				for (let i = 0; i < lib.inpile.length; i++) {
					let name = lib.inpile[i];
					if (name == "sha") {
						if (event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) {
							list.push(["基本", "", "sha"]);
						}
						for (let nature of lib.inpile_nature) {
							if (event.filterCard(get.autoViewAs({ name, nature }, "unsure"), player, event)) {
								list.push(["基本", "", "sha", nature]);
							}
						}
					} else if (get.type2(name) == "trick" && event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) {
						list.push(["锦囊", "", name]);
					} else if (get.type(name) == "basic" && event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) {
						list.push(["基本", "", name]);
					}
				}
				return ui.create.dialog("灭吴", [list, "vcard"]);
			},
			check(button) {
				if (_status.event.getParent().type != "phase") {
					return 1;
				}
				let player = _status.event.player;
				if (["wugu", "zhulu_card", "yiyi", "lulitongxin", "lianjunshengyan", "diaohulishan"].includes(button.link[2])) {
					return 0;
				}
				return player.getUseValue({
					name: button.link[2],
					nature: button.link[3],
				});
			},
			backup(links, player) {
				return {
					filterCard: true,
					audio: "miewu",
					popname: true,
					check(card) {
						return 8 - get.value(card);
					},
					position: "hse",
					viewAs: { name: links[0][2], nature: links[0][3] },
					onuse(result, player) {
						const next = game.createEvent("miewuDraw", false, _status.event.getParent());
						next.player = player;
						next.setContent(async (event, trigger, player) => {
							await player.draw();
						});
					},
					onrespond(result, player) {
						const next = game.createEvent("miewuDraw", false, _status.event.getParent());
						next.player = player;
						next.setContent(async (event, trigger, player) => {
							await player.draw();
						});
					},
					precontent() {
						player.addTempSkill("miewu_used");
						player.removeMark("wuku", 1);
					},
				};
			},
			prompt(links, player) {
				return "将一张牌当做" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
			},
		},
		hiddenCard(player, name) {
			if (!lib.inpile.includes(name)) {
				return false;
			}
			var type = get.type2(name);
			return (type == "basic" || type == "trick") && player.countMark("wuku") > 0 && player.countCards("she") > 0 && !player.hasSkill("miewu_used");
		},
		ai: {
			combo: "wuku",
			fireAttack: true,
			respondSha: true,
			respondShan: true,
			skillTagFilter(player) {
				if (!player.countMark("wuku") || !player.countCards("hse") || player.hasSkill("miewu_used")) {
					return false;
				}
			},
			order: 1,
			result: {
				player(player) {
					if (_status.event.dying) {
						return get.attitude(player, _status.event.dying);
					}
					return 1;
				},
			},
		},
		subSkill: {
			used: {
				charlotte: true,
			},
			backup: {
				audio: "miewu",
			},
		},
	},

// ========== yanfuren 严夫人 ==========
	// 谗逆：出牌阶段限一次，你可以选择一名其他角色并交给其至少一张手牌，然后其可以将一张手牌当【决斗】使用：当其因此【决斗】而造成伤害后，其摸一张牌；当其因此【决斗】而受到伤害后，你弃置所有手牌。 参考channi(sp2)
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
			await player
				.chooseToGive(target, "h", true, `谗逆：选择至少一张手牌交给${get.translation(target)}`, [1, player.countCards("h")])
				.set("ai", card => (target.isFriendOf(player) ? 10 - get.value(card) : -1))
				.forResult();
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
		ai: {
			threaten: 1.1,
			result: {
				target(player, target) {
					return get.attitude(player, target);
				},
			},
		},
	},
	// 匿伏：锁定技，每名角色的回合结束时，你将手牌摸至或弃至三张。 参考nifu(sp2)
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
