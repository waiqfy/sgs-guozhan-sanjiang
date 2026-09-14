# diy merged reference

## huan_noname 名字:幻小无 势力:qun

### noname_gongchuang 名字:共创
描述: 锁定技，准备阶段，所有角色依次选择：1.交给你一张牌；2.令你获得2枚“漏洞”（至多24枚）。然后你交给任意名角色至多四张牌，若牌数不小于2/4，本回合你使用牌时不可被响应/摸一张牌。
```js
noname_gongchuang: {
		forced: true,
		trigger: { player: "phaseZhunbeiBegin" },
		logTarget: () => game.filterPlayer().sortBySeat(),
		async content(event, trigger, player) {
			const { targets } = event;
			await game.doAsyncInOrder(targets, async target => {
				const cards = target.getCards("he");
				let result;
				if (!cards?.length) {
					result = { bool: false };
				} else {
					result = await target
						.chooseToGive(player, "he", `共创：是否交给${get.translation(player)}一张牌否则令其获得2枚“漏洞”（至多24枚）`)
						.set("ai", card => {
							const { sourcex, player } = get.event();
							const att = get.attitude(player, sourcex);
							if (sourcex == player) {
								if (get.position(card) == "e") {
									return -get.value(card, player);
								}
								return 0;
							}
							if (att > 0) {
								return get.value(card, sourcex) - 4;
							}
							return 5 - get.value(card, player);
						})
						.set("sourcex", player)
						.forResult();
				}
				if (!result?.bool) {
					get.info(event.name).addMark(player, 2);
					target.chat("不给！");
					await game.delayx();
				}
			});
			const give_map = new Map();
			const assigned = [];
			if (_status.connectMode) {
				game.broadcastAll(function () {
					_status.noclearcountdown = true;
				});
			}
			while (assigned.length < 4 && player.hasCard(card => !card.hasGaintag("noname_gongchuang_assigned"), "he")) {
				const result = await player
					.chooseCardTarget({
						prompt: `共创：你可以分配至多四张牌，请选择要分配的卡牌和目标`,
						filterCard(card) {
							if (card.hasGaintag("noname_gongchuang_assigned")) {
								return false;
							}
							return true;
						},
						selectCard: [1, 4 - assigned.length],
						filterTarget: true,
						position: "he",
						ai1: card => {
							if (!ui.selected.cards.length) {
								return 1;
							}
							return 0;
						},
						ai2: target => {
							const player = get.player(),
								card = ui.selected.cards[0];
							const val = target.getUseValue(card);
							if (val > 0) {
								return val * get.attitude(player, target) * 2;
							}
							return get.value(card, target) * get.attitude(player, target);
						},
					})
					.forResult();
				if (result?.bool && result.cards?.length && result.targets?.length) {
					const {
						cards,
						targets: [target],
					} = result;
					player.addGaintag(cards, "noname_gongchuang_assigned");
					assigned.addArray(cards);
					give_map.set(target, (give_map.get(target) || []).concat(cards));
				} else {
					break;
				}
			}
			if (_status.connectMode) {
				game.broadcastAll(function () {
					delete _status.noclearcountdown;
					game.stopCountChoose();
				});
			}
			player.line(Array.from(give_map.keys()), "green");
			for (const target of Array.from(give_map.keys()).sortBySeat()) {
				game.log(target, "从", player, `获得了${get.cnNumber(give_map.get(target).length)}张牌`);
			}
			const cards = Array.from(give_map.values()).flat();
			await game
				.loseAsync({
					gain_list: Array.from(give_map.entries()),
					giver: player,
					player: player,
					cards: cards,
					animate: "giveAuto",
				})
				.setContent("gaincardMultiple");
			if (cards.length >= 2) {
				player.addTempSkill(`${event.name}_directHit`);
			}
			if (cards.length >= 4) {
				player.addTempSkill(`${event.name}_draw`);
			}
		},
		addMark(player, num) {
			num = Math.min(num, 24 - player.countMark("noname_gongchuang"));
			if (num > 0) {
				player.addMark("noname_gongchuang", num);
			}
		},
		removeMark(player, num) {
			player.removeMark("noname_gongchuang", num);
		},
		markimage: "image/card/noname_bug.png",
		intro: {
			name: "共创（漏洞）",
			name2: "漏洞",
			markcount: "mark",
			content: "mark",
		},
		subSkill: {
			assigned: {
				name: "已分配",
			},
			directHit: {
				charlotte: true,
				priority: 10,
				forced: true,
				popup: false,
				trigger: {
					player: "useCard",
				},
				async content(event, trigger, player) {
					game.log(trigger.card, "不可响应");
					trigger.directHit.addArray(game.players.concat(game.dead));
				},
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						return;
					},
				},
			},
			draw: {
				charlotte: true,
				trigger: {
					player: "useCard",
				},
				priority: 9,
				forced: true,
				async content(event, trigger, player) {
					await player.draw("nodelay");
				},
			},
		},
	}
```

### huan_duocai 名字:多彩
描述: `出牌阶段，你可弃置4枚“漏洞”，获得一名其他角色的一个技能，其该技能失效，效果直至其下回合结束。当其他角色使用牌指定你为目标时，你可弃置1枚“漏洞”取消之。当你受到伤害后，你可视为对伤害来源发动一次${get.poptip("noname_gongchuang")}。`
```js
huan_duocai: {
		enable: "phaseUse",
		filter(event, player) {
			return player.countMark("noname_gongchuang") >= 4;
		},
		getSkills(player, target) {
			const skills = target.getSkills(null, false, false).filter(skill => {
				const info = get.info(skill);
				if (!info || info.charlotte || (info.unique && !info.gainable) || player.hasSkill(skill, null, false, false)) {
					return false;
				}
				return true;
			});
			return skills;
		},
		filterTarget(card, player, target) {
			return target != player && get.info("huan_duocai").getSkills(player, target).length;
		},
		async content(event, trigger, player) {
			get.info("noname_gongchuang").removeMark(player, 4);
			const { target } = event;
			const skills = get.info(event.name).getSkills(player, target);
			let result;
			if (skills.length == 1) {
				result = { bool: true, links: skills };
			} else {
				result = await player
					.chooseButton([`多彩：获得${get.translation(target)}的一个技能`, [skills, "skill"]], true)
					.set("ai", button => get.skillRank(button.link, "inout"))
					.forResult();
			}
			const { links } = result;
			if (links?.length) {
				const [skill] = links;
				player.flashAvatar(event.name, target.name);
				await player.addAdditionalSkills(`${event.name}_${target.playerid}`, skill, true);
				if (!get.info(skill).persevereSkill) {
					target.markAuto(`${event.name}_blocker`, skill);
				}
				target.addTempSkill(`${event.name}_blocker`, { player: "phaseAfter" });
			}
		},
		ai: {
			order: 7,
			result: { target: -1 },
			combo: "noname_gongchuang",
		},
		group: ["huan_duocai_target", "huan_duocai_damage"],
		subSkill: {
			target: {
				trigger: { target: "useCardToTarget" },
				filter(event, player) {
					return event.player != player && player.countMark("noname_gongchuang") > 0;
				},
				logTarget: "player",
				prompt2: (event, player) => `移去1枚“漏洞”令${get.translation(event.card)}对你无效`,
				check(event, player) {
					return get.effect(player, event.card, event.player, player) < 0;
				},
				async content(event, trigger, player) {
					get.info("noname_gongchuang").removeMark(player, 1);
					game.log(trigger.card, "对", player, "无效");
					trigger.getParent().excluded.add(player);
				},
			},
			damage: {
				trigger: { player: "damageEnd" },
				filter(event, player) {
					return event.source?.isIn();
				},
				logTarget: "source",
				prompt2(event, player) {
					return `对其发动一次〖共创〗`;
				},
				check: () => true,
				async content(event, trigger, player) {
					const next = game.createEvent("noname_gongchuang");
					next.player = player;
					next.targets = event.targets;
					next.setContent(get.info("noname_gongchuang").content);
					player.logSkill("noname_gongchuang", event.targets);
					await next;
				},
			},
			blocker: {
				charlotte: true,
				init(player, skill) {
					player.addSkillBlocker(skill);
				},
				onremove(player, skill) {
					delete player.storage[skill];
					player.removeSkillBlocker(skill);
					game.players.forEach(target => target.removeAdditionalSkills(`huan_duocai_${player.playerid}`));
				},
				skillBlocker(skill, player) {
					return player.getStorage("huan_duocai_blocker").includes(skill);
				},
				markimage: "image/card/noname_blocker.png",
				mark: true,
				intro: {
					content: (storage, player, skill) => (storage?.length ? `失效技能：${get.translation(storage)}` : "无失效技能"),
				},
			},
		},
	}
```

### noname_changeGroup
```js
noname_changeGroup: {
		charlotte: true,
		forced: true,
		popup: false,
		trigger: {
			player: ["changeHp", "enterGame"],
			global: "phaseBefore",
		},
		filter(event, player) {
			if (event.name != "changeHp") {
				return event.name != "phase" || game.phaseNumber == 0;
			}
			return event.player.getHp() > 0;
		},
		async content(event, trigger, player) {
			const list = ["wu", "wei", "shu", "qun"];
			const hp = player.getHp();
			if (hp > 0 && hp < 5) {
				const group = list[hp - 1];
				if (player.group != group) {
					await player.changeGroup(group);
				}
			}
			if (hp > 4 && player.group != "shen") {
				await player.changeGroup("shen");
			}
		},
	}
```

## noname 名字:小无 势力:key

### noname_zhuyuan 名字:祝愿
描述: ①每回合每名角色限一次。出牌阶段，你可以将四张花色各不相同的牌交给一名其他角色。你与其获得技能〖铁骑〗和〖激昂〗至各自的回合结束。②锁定技，若你于当前回合内：未发动过〖祝愿〗，则你使用牌无次数限制；发动过〖祝愿〗，则你使用牌无距离限制。
```js
noname_zhuyuan: {
		charlotte: true,
		enable: "phaseUse",
		position: "he",
		selectCard: 4,
		complexCard: true,
		prompt: "将四张花色各不同的牌交一名角色并令你与其获得【铁骑】和【激昂】直到各自回合结束",
		check(card) {
			if (ui.selected.cards.length && ui.selected.cards[0].name == "du") {
				return 0;
			}
			if (!ui.selected.cards.length && card.name == "du") {
				return 20;
			}
			var player = get.owner(card);
			if (ui.selected.cards.length >= Math.max(2, player.countCards("h") - player.hp)) {
				return 0;
			}
			if (player.hp == player.maxHp || player.countCards("h") <= 1) {
				var players = game.filterPlayer();
				for (var i = 0; i < players.length; i++) {
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
		filterCard(card, player) {
			var suit = get.suit(card, player);
			for (var i = 0; i < ui.selected.cards.length; i++) {
				if (get.suit(ui.selected.cards[i], player) == suit) {
					return false;
				}
			}
			return true;
		},
		filter(event, player) {
			var suits = [];
			player.countCards("he", function (card) {
				if (suits.length < 4) {
					suits.add(get.suit(card, player));
				}
			});
			if (suits.length < 4) {
				return false;
			}
			var stat = player.getStat();
			if (!stat.noname_zhuyuan) {
				return true;
			}
			return game.hasPlayer(function (current) {
				return current != player && !stat.noname_zhuyuan.includes(current);
			});
		},
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			var stat = player.getStat();
			if (!stat.noname_zhuyuan) {
				return true;
			}
			return !stat.noname_zhuyuan.includes(target);
		},
		discard: false,
		lose: false,
		delay: false,
		derivation: ["noname_retieji", "noname_jiang"],
		async content(event, trigger, player) {
			const stat = player.getStat();
			stat.noname_zhuyuan ??= [];
			stat.noname_zhuyuan.push(event.target);
			await player.give(event.cards, event.target, true);
			game.log(player, "获得了技能", "#g【铁骑】");
			player.addTempSkill("noname_retieji", {
				player: "phaseAfter",
			});
			game.log(player, "获得了技能", "#g【激昂】");
			player.addTempSkill("noname_jiang", {
				player: "phaseAfter",
			});
			game.log(event.target, "获得了技能", "#g【铁骑】");
			event.target.addTempSkill("noname_retieji", {
				player: "phaseAfter",
			});
			game.log(event.target, "获得了技能", "#g【激昂】");
			event.target.addTempSkill("noname_jiang", {
				player: "phaseAfter",
			});
		},
		mod: {
			targetInRange(card, player) {
				var stat = player.getStat();
				if (stat.noname_zhuyuan) {
					return true;
				}
			},
			cardUsable(card, player) {
				var stat = player.getStat();
				if (!stat.noname_zhuyuan) {
					return Infinity;
				}
			},
		},
		ai: {
			order: 5,
			result: {
				target: 10,
			},
		},
	}
```

### noname_duocai 名字:多彩
描述: 其他角色的牌进入弃牌堆后，你可以获得之。若你以此法得到的牌数：大于2，你弃置一名角色区域内的一张牌；等于2，你摸一张牌；小于2，你回复1点体力。
```js
noname_duocai: {
		charlotte: true,
		trigger: {
			global: ["loseAfter", "gainAfter", "equipAfter", "addJudgeAfter", "loseAsyncAfter", "addToExpansionAfter", "cardsDiscardAfter"],
		},
		filter(event, player) {
			return game.hasPlayer2(i => i !== player && event.getd(i, "cards2").length);
		},
		direct: true,
		async content(event, trigger, player) {
			let result;

			if (trigger.delay == false && player != game.me && !player.isOnline()) {
				await game.delayx();
			}

			const cards = game.filterPlayer2(i => i !== player && trigger.getd(i, "cards2").length).flatMap(target => trigger.getd(target, "cards2"));

			result = await player
				.chooseButton({
					createDialog: [get.prompt2("noname_duocai"), cards],
					selectButton: [1, cards.length],
					ai(button) {
						return get.value(button.link);
					},
				})
				.forResult();

			if (!result.bool) {
				return;
			}

			player.logSkill("noname_duocai");
			await player.gain({
				cards: result.links,
				animate: "gain2",
			});

			if (result.links?.length && result.links.length <= 2) {
				if (result.links.length == 2) {
					await player.draw();
				} else {
					await player.recover();
				}
				return;
			}

			const filterTarget = (card, player, target) => {
				return target !== player && target.countDiscardableCards(player, "hej") > 0;
			};

			if (!game.hasPlayer(current => filterTarget(null, player, current))) {
				return;
			}

			result = await player
				.chooseTarget({
					prompt: "弃置一名其他角色区域内的一张牌",
					forced: true,
					filterTarget,
					ai(target) {
						const player = _status.event.player;
						return get.effect(target, { name: "guohe" }, player, player);
					},
				})
				.forResult();

			if (result.bool && result.targets?.length) {
				const target = result.targets[0];
				player.line(target, "green");
				await player.discardPlayerCard({
					target,
					position: "hej",
					forced: true,
				});
			}
		},
	}
```

## ns_shijian 名字:诗笺 势力:key

### nspianwu 名字:翩舞
描述: <font color=red>特殊效果：你的技能不会失效或失去。</font><br>锁定技，你于以下时机创建一个随机的触发技能：游戏开始后；当你受到伤害后；当你造成伤害时（三轮内）；你的回合结束时。然后你令一名角色获得此技能。以此法创建的技能每回合限发动五次。
```js
nspianwu: {
		skillTrigger(triggerName, player, skill) {
			var next = game.createEvent(triggerName, false);
			next.player = player;
			next.skill = skill;
			next.setContent(async (event, trigger, player) => {
				event.trigger(event.name);
			});
		},
		init(player, skill) {
			lib.skill[skill].skillTrigger("shijian_init", player, skill);
		},
		onremove(player, skill) {
			lib.skill[skill].skillTrigger("shijian_removeSkill", player, skill);
		},
		audio: 4,
		trigger: {
			global: "phaseBefore",
			player: ["damageEnd", "phaseJieshuBegin"],
			source: "damageSource",
		},
		forced: true,
		superCharlotte: true,
		charlotte: true,
		fixed: true,
		filter(event, player, name) {
			if (name == "phaseBefore" && game.phaseNumber != 0) {
				return false;
			}
			if (name == "damageSource" && game.roundNumber > 3) {
				return false;
			}
			return get.is.playerNames(player, "ns_shijian") || game.ns_shijian?.players?.includes(player);
		},
		async content(event, trigger, player) {
			lib.skill[event.name].skillTrigger("shijian_addSkill", player, event.name);
			player.chat(["获得技能是随机生成的，请仔细看看。", "是欧皇技能还是非酋技能呢？"].randomGet());
		},
		ai: {
			maixie: true,
			maixie_hp: true,
		},
		global: "nspianwu_global",
		subSkill: {
			global: {
				trigger: {
					player: ["shijian_init", "shijian_removeSkill", "shijian_addSkill"],
				},
				filter(event, player) {
					return (event.skill == "nspianwu" && get.is.playerNames(player, "ns_shijian")) || game.ns_shijian?.players?.includes(player);
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					switch (event.triggername) {
						case "shijian_init":
							game.ns_shijian = game.ns_shijian || {
								skills: 0,
								players: [],
							};
							game.ns_shijian.players.add(player);
							break;
						case "shijian_removeSkill":
							player.addSkills(event.skill);
							break;
						case "shijian_addSkill": {
							/** @type ExSkillData 新技能内容 */
							const newSkill = {
								audio: "nspianwu",
							};
							/** 新技能描述 */
							let newSkillTran = "";
							/** 新技能名(id) */
							const skillName = "ns_shijian_createSkill_" + game.ns_shijian.skills++;
							/**
							 * @type skillInit[] 获得技能时的效果列表
							 */
							const initList = lib.skill.nspianwu_global.initList;
							/**
							 * @type skillInit 随机筛选出的“获得技能时的效果”
							 */
							let randomInit = null;
							if (Math.random() <= 0.45) {
								//随机选择
								randomInit = initList.randomGet();
								newSkillTran += "当你获得此技能时，" + randomInit.translate + "。";
								newSkill.init = randomInit.init;
							}

							/** 技能每回合的可用次数 */
							let usable = Infinity;
							if (Math.random() <= 0.6) {
								usable = [1, 2, 3].randomGet();
								newSkill.usable = usable;
								newSkillTran += `每回合限${usable}次，`;
							}

							//随机决定是否是锁定技
							if (Math.random() <= 0.35) {
								newSkill.forced = true;
								newSkillTran += "锁定技，";
							}

							/**
							 * @type skillTrigger[] 触发技能的时机
							 */
							const triggerList = lib.skill.nspianwu_global.triggerList;
							/** 随机取得时机名 */
							const randomTrigger = triggerList[Math.floor(Math.random() * triggerList.length)];
							if (randomTrigger.noUseable) {
								delete newSkill.usable;
								newSkillTran = newSkillTran.replace(`每回合限${usable}次，`, "");
							}
							/**
							 * @type triggerSource[] 时机触发者数组
							 */
							const triggerSource = lib.skill.nspianwu_global.triggerSource.filter(v => {
								if (randomTrigger.noSource && v.target == "source") {
									return false;
								}
								return true;
							});
							/** 随机取得时机触发者 */
							const randomTriggerSource = triggerSource[Math.floor(Math.random() * triggerSource.length)];
							/** @type triggerOpportunity[] 触发技的前，中，后，取消后，跳过后 */
							const triggerOpportunity = lib.skill.nspianwu_global.triggerOpportunity.filter(v => {
								if (randomTrigger.noCancel && Array.isArray(v.trigger) && v.trigger[0] == "Skipped") {
									return false;
								}
								return true;
							});
							/** 随机取得发动时机的前，后，取消 */
							let randomTriggerOpportunity = triggerOpportunity[Math.floor(Math.random() * triggerOpportunity.length)];
							newSkillTran += `当${randomTriggerSource.translate}${randomTrigger.translate}${randomTriggerOpportunity.translate}，`;
							newSkill.trigger = {};
							if (Object.prototype.toString.call(randomTriggerOpportunity.trigger) === "[object Object]") {
								newSkill.trigger = randomTriggerOpportunity.trigger;
							} else if (Array.isArray(randomTriggerOpportunity.trigger)) {
								const triggerArr = [];
								for (const trigger of randomTriggerOpportunity.trigger) {
									triggerArr.push(randomTrigger.trigger + trigger);
								}
								newSkill.trigger[randomTriggerSource.target] = triggerArr;
							} else {
								newSkill.trigger[randomTriggerSource.target] = randomTrigger.trigger + randomTriggerOpportunity.trigger;
							}

							/** @type skillFilter 获取随机的发动条件 */
							let randomSkillFilter;

							//有50%的几率有filter
							if (Math.random() <= 0.45) {
								/** @type skillFilter[] 获取发动条件数组 */
								let filterList = lib.skill.nspianwu_global.skillFilterList_onlyPlayer;
								if (randomTriggerSource.target != "player") {
									filterList = filterList.concat(lib.skill.nspianwu_global.skillFilterList_onlyTarget);
								}
								if (randomTrigger.num) {
									filterList = filterList.concat(lib.skill.nspianwu_global.skillFilterList_hasNum);
								}
								randomSkillFilter = filterList[Math.floor(Math.random() * filterList.length)];
								if (typeof randomSkillFilter.translate == "string") {
									newSkillTran += randomSkillFilter.translate + "，";
								} else {
									// @ts-expect-error ignore
									newSkillTran += randomSkillFilter.translate(randomTrigger.translate) + "，";
								}
							}

							/** @type skillContent[] 技能发动条件 */
							let contentList = lib.skill.nspianwu_global.skillContentList_onlyPlayer;
							if (randomTriggerSource.target != "player") {
								contentList = contentList.concat(lib.skill.nspianwu_global.skillContentList_onlyTarget);
							}
							/** End时机不能操作num */
							if (randomTrigger.num && "End" != randomTriggerOpportunity.trigger && !Array.isArray(randomTriggerOpportunity.trigger)) {
								contentList = contentList.concat(lib.skill.nspianwu_global.skillContentList_hasNum);
							}
							/** End时机不取消 */
							if (!randomTrigger.noCancel && "End" != randomTriggerOpportunity.trigger && !Array.isArray(randomTriggerOpportunity.trigger)) {
								contentList = contentList.concat(lib.skill.nspianwu_global.skillContentList_onlyCancel);
							}
							// 排除类似摸牌时摸牌的效果
							const exclude = ["摸牌", "伤害", "失去体力", "失去体力上限"];
							const exclude2 = [/摸\S+牌/, /受到\S+伤害/, /失去\S+体力(?!上限)/, /失去\S+体力上限/];
							if (exclude.includes(randomTrigger.translate)) {
								const index = exclude.indexOf(randomTrigger.translate);
								contentList = contentList.filter(list => exclude2[index].test(list.translate) == false);
							}
							/**  @type skillContent 随机的发动效果 */
							const randomSkillContent = contentList[Math.floor(Math.random() * contentList.length)];

							newSkill.filter = function (event, player, name) {
								if (!event.player.isAlive()) {
									return false;
								}
								if (typeof randomTrigger.filter == "function") {
									if (randomTrigger.filter(event, player, name) == false) {
										return false;
									}
								}
								if (typeof randomSkillContent.filter == "function") {
									if (randomSkillContent.filter(event, player, name) == false) {
										return false;
									}
								}
								if (randomSkillFilter) {
									return randomSkillFilter.filter(event, player, name);
								}
								return true;
							};

							newSkillTran += randomSkillContent.translate;
							newSkill.content = randomSkillContent.content;

							if (randomSkillContent.translate == "你额外进行一个回合(每轮限一次)") {
								delete newSkill.usable;
								newSkillTran = newSkillTran.replace(`每回合限${usable}次，`, "");
								newSkill.round = 1;
							}

							// ai是否发动
							newSkill.check = function (event, player) {
								/** 收益 */
								let result = 0;
								/** 技能content的效果 */
								const contentResult = randomSkillContent.result;
								// 对于加减数值的判断
								if (randomTrigger.num && lib.skill.nspianwu_global.skillContentList_hasNum.includes(randomSkillContent)) {
									result += contentResult.evtPlayer(event.player, event.name);
								}
								// 对于是否取消此时机的判断
								else if (lib.skill.nspianwu_global.skillContentList_onlyCancel.includes(randomSkillContent)) {
									result += contentResult.evtPlayer(event.player, event.name);
								}
								// 其他正常技能的判断
								else {
									if (contentResult.player) {
										if (typeof contentResult.player == "function") {
											result += contentResult.player(player, event.name);
										} else {
											result += contentResult.player;
										}
									} else if (contentResult.evtPlayer) {
										if (typeof contentResult.evtPlayer == "function") {
											result += contentResult.evtPlayer(event.player, event.name);
										} else {
											result += contentResult.evtPlayer;
										}
									}
								}
								if (get.attitude(player, event.player) < 0) {
									/** 技能是对trigger.player还是player生效 */
									const toPlayer = lib.skill.nspianwu_global.skillContentList_onlyPlayer.includes(randomSkillContent);
									if (!toPlayer) {
										result = -result;
									}
								}
								return result > 0;
							};

							const skillNameList = ["微尘", "芷蕊", "余念", "稚遇", "幽殤", "代真", "淡陌", "余念", "紫寒", "忆伤", "酒巷", "千兰", "之柔", "新蕾", "稚言", "祭心", "染尘", "未安", "奢念", "暮兮", "曼易", "心盲", "矜暮", "紫蓝", "以亦", "夏蓉", "柒夏", "久安", "安暖", "妙彤", "凛然", "北觅", "晴天", "殇忆", "卿尘", "墨默", "拾忆", "青琯", "黛儿", "木槿", "初夏", "陌然", "眸敛", "涵双", "情寂", "陌沫", "凉生", "暖亦", "凉栀", "念露", "慕青", "平蝶", "安蕾", "如初", "挽安", "宛海", "屿风", "幻柏", "千寻", "妙菡", "雨寒", "南浔", "初雨", "梦琪", "曼文", "栀颜", "素笺", "哽咽", "明眸", "陌屿", "陌颜", "葬情", "妄想", "断念", "惜雪", "蝶衣", "傲珊", "青栀", "熙妍", "迁心", "旧颜", "孤音", "怜梦", "含烟", "冷傲", "晓灵", "浅伤", "断城", "喜孤", "青橙", "沦陷", "故里", "屿暖", "紫翠", "孤心", "淡然", "墨兮", "南忆", "酒笙", "归安", "暮凉", "暖言", "亡心", "新波", "沐兮", "非墨", "执念", "天荷", "凡旋", "展眉", "陌路", "顾念", "柒安", "静枫", "泪雨", "深碍", "如南", "拒昧", "凡蕾", "风吟", "冷眸", "沛菡", "久孤", "瘾情", "安朵", "夏青", "凉薄", "亦瑶", "旧夢", "陌若", "敬情", "雅蕊", "厌离", "温唇", "遇見", "妄生", "元霜", "尔岚", "南莲", "陌殇", "沫忆", "若雨", "倾忆", "芷蕾", "呓语", "枫溪", "凡柔", "温瞳", "墨轩", "花葬", "梵心", "洛雪", "無言", "兮颜", "清欢"];

							if (!newSkill.trigger.player && !lib.skill.nspianwu_global.skillContentList_onlyPlayer.includes(randomSkillContent)) {
								newSkill.logTarget = event => event.player;
							}
							if (!newSkill.usable && !newSkill.round) {
								newSkill.usable = 5;
							}
							if (!newSkillTran.endsWith("。")) {
								newSkillTran += "。";
							}
							game.broadcastAll(
								(skill, info, newSkillTranslate, newSkillTran) => {
									lib.skill[skill] = info;
									lib.translate[skill] = newSkillTranslate;
									lib.translate[skill + "_info"] = newSkillTran;
									game.finishSkill(skill);
								},
								skillName,
								newSkill,
								skillNameList.randomGet(),
								newSkillTran
							);

							const next = player.chooseTarget();
							next.set("filterTarget", lib.filter.notMe);
							next.set("prompt", `是否将【${lib.translate[skillName]}】赠予其他角色？`);
							next.set("prompt2", lib.translate[skillName + "_info"]);
							next.set("ai", target => {
								const player = _status.event.player;
								const att = get.attitude(player, target);
								let initResult = 0;
								let initResultOfMe = 0;
								if (randomInit) {
									if (typeof randomInit.result.player == "function") {
										initResult += randomInit.result.player(target);
										initResult += randomInit.result.player(player);
									} else if (typeof randomInit.result.player == "number") {
										initResult += randomInit.result.player;
										initResultOfMe += randomInit.result.player;
									}
								}
								// 获得技能就死亡
								if (initResult == -Infinity) {
									return -att;
								}
								let contentResult = 0,
									contentResultOfMe = 0,
									rs = randomSkillContent.result,
									rp = randomTriggerSource.target,
									rtr = randomTrigger.result;
								/** 技能是对trigger.player还是target生效 */
								const toTarget = lib.skill.nspianwu_global.skillContentList_onlyPlayer.includes(randomSkillContent);
								if (rtr) {
									if (typeof rtr.evtPlayer == "function") {
										rtr = rtr.evtPlayer(target);
									} else {
										rtr = rtr.evtPlayer;
									}
								} else {
									rtr = 0;
								}
								if (rs.player) {
									if (typeof rs.player == "function") {
										contentResult += rs.player(target);
										contentResultOfMe += rs.player(player);
									} else {
										contentResult += rs.player;
										contentResultOfMe += rs.player;
									}
								} else if (rs.evtPlayer) {
									/** 对trigger.player的收益 */
									let result = 0;
									if (typeof rs.evtPlayer == "function") {
										result += rs.evtPlayer(target);
										if (result > 0 && toTarget) {
											contentResult += result;
										} else if (result > 0) {
											contentResult += result + 1;
										} else if (result <= 0 && toTarget) {
											if (lib.skill[skillName].forced) {
												contentResult += result - 3;
											} else {
												contentResult += result - 2;
											}
										} else if (result <= 0) {
											if (lib.skill[skillName].forced) {
												contentResult += result - 3;
											} else {
												contentResult -= result - 2;
											}
										}
										if (toTarget) {
											contentResultOfMe += rs.evtPlayer(player);
										}
									} else {
										if (toTarget) {
											contentResult += rs.evtPlayer;
											contentResultOfMe += rs.evtPlayer;
										} else {
											if (lib.skill[skillName].forced) {
												if (rs.evtPlayer > 0) {
													contentResult += rs.evtPlayer;
													contentResultOfMe += rs.evtPlayer;
												} else {
													contentResult -= rs.evtPlayer;
													contentResultOfMe -= rs.evtPlayer;
												}
											} else {
												contentResult += rs.evtPlayer;
												contentResultOfMe += rs.evtPlayer;
											}
										}
									}
								}
								const mySkillLength = player.skills.filter(skill => skill.indexOf("ns_shijian_createSkill_") == 0).length;
								if (contentResult > contentResultOfMe && att > 3 && initResult > 0) {
									return 1000;
								}
								if (contentResultOfMe > -2 && initResultOfMe > 2) {
									return 0;
								}
								if (contentResultOfMe > 0 && initResult > -1) {
									if (mySkillLength < 9) {
										return 0;
									}
									if (game.countPlayer(current => get.attitude(player, current) > 3) > 0) {
										return att;
									}
									return 0;
								}
								if (rp != "player") {
									if (rtr <= 0 && contentResult < 0 && !toTarget) {
										if (mySkillLength < 9) {
											return 0;
										}
										if (game.countPlayer(current => get.attitude(player, current) > 3) > 0) {
											return att;
										}
										return 0;
									}
								}
								if (contentResult >= 0) {
									if (mySkillLength < 9) {
										return 0;
									}
									if (game.countPlayer(current => get.attitude(player, current) > 3) > 0) {
										return att;
									}
									return 0;
								} else {
									return 0 - att;
								}
							});
							const result = await next.forResult();
							if (result.bool) {
								player.line(result.targets[0]);
								await result.targets[0].addSkills(skillName);
							} else {
								await player.addSkills(skillName);
							}
						}
					}
				},
				/**
				 * @type skillInit[] 获得技能时的效果列表
				 */
				initList: [
					{
						id: "draw",
						init: player => {
							player.draw();
						},
						translate: "你摸一张牌",
						result: { player: 1 },
					},
					{
						id: "recover",
						init: player => {
							player.recover();
						},
						translate: "你回复1点体力",
						result: { player: 1 },
					},
					{
						id: "loseHp",
						init: player => {
							player.loseHp();
						},
						translate: "你失去1点体力",
						result: {
							player: player => (player.hasSkillTag("maihp") ? 1 : -1),
						},
					},
					{
						id: "damage",
						init: player => {
							player.damage(1, "nosource");
						},
						translate: "你受到1点无伤害来源的伤害",
						result: {
							// TODO maixie和maixie_hp的区别
							player: player => (player.hasSkillTag("maixie") ? 1 : -1),
						},
					},
					{
						id: "recover",
						init: player => {
							player.recover(player.maxHp - player.hp);
						},
						translate: "你将体力值回复至体力上限",
						result: {
							player: player => player.maxHp - player.hp,
						},
					},
					{
						id: "chooseToDiscard",
						init: player => {
							player.countCards("he") && player.chooseToDiscard("he", true);
						},
						translate: "你需弃置一张牌",
						result: {
							player: player => {
								if (player.countCards("he") == 0) {
									return 0;
								}
								if (player.hasSkillTag("nodiscard")) {
									return 1;
								}
								return -1;
							},
						},
					},
					{
						id: "link",
						init: player => {
							player.link(true);
						},
						translate: "你横置",
						result: {
							player: player => {
								if (player.hasSkillTag("noLink")) {
									return 0;
								}
								if (player.hasSkillTag("nofire") && player.hasSkillTag("nothunder")) {
									return 0;
								}
								return player.isLinked() ? 1 : -1;
							},
						},
					},
					{
						id: "gainMaxHp",
						init: player => {
							player.gainMaxHp();
						},
						translate: "你增加1点体力上限",
						result: { player: 1 },
					},
					{
						id: "loseMaxHp",
						init: player => {
							player.loseMaxHp();
						},
						translate: "你失去1点体力上限",
						result: { player: -2 },
					},
					{
						id: "getBuff",
						init: player => {
							player.getBuff();
						},
						translate: "你随机获得一个正面效果",
						result: { player: 1 },
					},
					{
						id: "getDebuff",
						init: player => {
							player.getDebuff();
						},
						translate: "你随机获得一个负面效果",
						result: { player: -1 },
					},
					{
						id: "tempHide",
						init: player => {
							player.tempHide();
						},
						translate: "你获得【潜行】到你的回合开始",
						result: { player: 3 },
					},
					{
						id: "gainEquip",
						init: player => {
							const card = get.cardPile2(card => get.type(card) == "equip");
							if (card) {
								player.equip(card);
							}
						},
						translate: "你随机从牌堆中装备一张装备牌(若有)",
						result: { player: 2 },
					},
					{
						id: "gainBasic",
						init: player => {
							const card = get.cardPile2(card => get.type(card) == "basic");
							if (card) {
								player.gain(card, "gain2", "log");
							}
						},
						translate: "你随机从牌堆中获得一张基本牌(若有)",
						result: { player: 2 },
					},
					{
						id: "gainTrick",
						init: player => {
							const card = get.cardPile2(card => get.type(card) == "trick");
							if (card) {
								player.gain(card, "gain2", "log");
							}
						},
						translate: "你随机从牌堆中获得一张普通锦囊牌(若有)",
						result: { player: 2 },
					},
					{
						id: "gainDelay",
						init: player => {
							const card = get.cardPile2(card => get.type(card) == "delay");
							if (card) {
								player.gain(card, "gain2", "log");
							}
						},
						translate: "你随机从牌堆中获得一张延时锦囊牌(若有)",
						result: { player: 2 },
					},
					{
						id: "die",
						init: player => {
							player.die();
						},
						translate: "你死亡",
						result: { player: -Infinity },
					},
				],
				/**
				 * @type triggerOpportunity[] 触发技的前，中，后，取消后，跳过后
				 */
				triggerOpportunity: [
					{
						trigger: "Before",
						translate: "前",
					},
					{
						trigger: "Begin",
						translate: "时",
					},
					{
						trigger: "End",
						translate: "后",
					},
					{
						trigger: ["Skipped", "Cancelled"],
						translate: "被跳过或取消后",
					},
				],
				/**
				 * @type skillTrigger[] 触发技能的时机
				 */
				triggerList: [
					{
						trigger: "damage",
						translate: "受到伤害",
						num: true,
						result: {
							evtPlayer: -1,
						},
					},
					{
						trigger: "recover",
						translate: "回复体力",
						num: true,
						result: {
							evtPlayer: 1,
						},
					},
					{
						trigger: "loseHp",
						translate: "失去体力",
						num: true,
						noSource: true,
						result: {
							evtPlayer: -1,
						},
					},
					{
						trigger: "gainMaxHp",
						translate: "增加体力上限",
						num: true,
						noSource: true,
						result: {
							evtPlayer: 1,
						},
					},
					{
						trigger: "loseMaxHp",
						translate: "失去体力上限",
						num: true,
						noSource: true,
						result: {
							evtPlayer: -1,
						},
					},
					{
						trigger: {
							player: "loseAfter",
							global: "loseAsyncAfter",
						},
						translate: "失去的牌因弃置而进入弃牌堆后",
						filter(event, player) {
							if (event.type !== "discard" || event.getlx === false) {
								return false;
							}
							return event.getl?.(player)?.cards2?.some(card => get.position(card) === "d");
						},
						noSource: true,
						noCancel: true,
					},
					{
						trigger: "phaseDraw",
						translate: "摸牌阶段",
						num: true,
						noSource: true,
						noUseable: true,
						result: {
							evtPlayer: 1,
						},
					},
					{
						trigger: "phaseJudge",
						translate: "判定阶段",
						noSource: true,
						noUseable: true,
						result: {
							evtPlayer: 0,
						},
					},
					{
						trigger: "phaseDiscard",
						translate: "弃牌阶段",
						noSource: true,
						noUseable: true,
						result: {
							evtPlayer: 0,
						},
					},
					{
						trigger: "draw",
						translate: "摸牌",
						noSource: true,
						result: {
							evtPlayer: 1,
						},
					},
					{
						trigger: "judge",
						translate: "判定",
						noCancel: true,
						noSource: true,
					},
					{
						trigger: "turnOver",
						translate: "翻面",
						noSource: true,
						result: {
							evtPlayer: player => {
								if (player.hasSkillTag("noturn")) {
									return 0;
								}
								return player.isTurnedOver() ? 1 : -1;
							},
						},
					},
					{
						trigger: "link",
						translate: "横置/重置",
						noSource: true,
						result: {
							evtPlayer: player => {
								if (player.hasSkillTag("noLink")) {
									return 0;
								}
								if (player.hasSkillTag("nofire") && player.hasSkillTag("nothunder")) {
									return 0;
								}
								return player.isLinked() ? 1 : -1;
							},
						},
					},
					{
						trigger: "useCard",
						translate: "使用牌",
						noCancel: true,
						noSource: true,
					},
					{
						trigger: "useSkill",
						translate: "使用主动技能",
						noCancel: true,
						noSource: true,
					},
					{
						trigger: "addJudge",
						translate: "的判定区添加延时锦囊",
						noCancel: true,
						noSource: true,
						result: {
							evtPlayer: player => {
								if (player.hasSkill("reqianxun") && player.hasSkillTag("nolose")) {
									return 1;
								}
								if (player.hasSkill("xinleiji")) {
									return 1;
								}
								return -1;
							},
						},
					},
				],
				/**
				 * @type triggerSource[] 时机触发者列表
				 */
				triggerSource: [
					{
						target: "player",
						translate: "你",
					},
					{
						target: "source",
						translate: "以你为来源的角色",
					},
					{
						target: "global",
						translate: "一名角色",
					},
				],
				/**
				 * @type skillFilter[] 技能发动条件(仅player)
				 */
				skillFilterList_onlyPlayer: [
					{
						filter(event, player) {
							return player.hp > 2;
						},
						translate: "若你的体力值大于2",
					},
					{
						filter(event, player) {
							return player.hp < 2;
						},
						translate: "若你的体力值小于2",
					},
					{
						filter(event, player) {
							return player.countCards("j") > 0;
						},
						translate: "若你的判定区内有牌",
					},
					{
						filter(event, player) {
							return !player.countCards("j");
						},
						translate: "若你的判定区内没有牌",
					},
					{
						filter(event, player) {
							return !player.countCards("h");
						},
						translate: "若你没有手牌",
					},
					{
						filter(event, player) {
							return !player.getHistory("useCard");
						},
						translate: "若你本回合没有使用过牌",
					},
					{
						filter(event, player) {
							return player.getHistory("useCard").length > 0;
						},
						translate: "若你本回合使用过牌",
					},
					{
						filter(event, player) {
							return !player.getHistory("respond");
						},
						translate: "若你本回合没有打出过牌",
					},
					{
						filter(event, player) {
							return player.isDamaged();
						},
						translate: "若你已受伤",
					},
					{
						filter(event, player) {
							return player.isHealthy();
						},
						translate: "若你的体力值为满",
					},
					{
						filter(event, player) {
							return player.isMaxHp();
						},
						translate: "若你的体力值为全场最多（或之一）",
					},
					{
						filter(event, player) {
							return player.isMaxHp(true);
						},
						translate: "若你的体力值为全场最多",
					},
					{
						filter(event, player) {
							return player.isMinHp();
						},
						translate: "若你的体力值为全场最少（或之一）",
					},
					{
						filter(event, player) {
							return player.isMinHp(true);
						},
						translate: "若你的体力值为全场最少",
					},
					{
						filter(event, player) {
							return player.isMaxCard();
						},
						translate: "若你的牌为全场最多（或之一）",
					},
					{
						filter(event, player) {
							return player.isMaxCard(true);
						},
						translate: "若你的牌为全场最多",
					},
					{
						filter(event, player) {
							return player.isMinCard();
						},
						translate: "若你的牌为全场最少（或之一）",
					},
					{
						filter(event, player) {
							return player.isMinCard(true);
						},
						translate: "若你的牌为全场最少",
					},
					{
						filter(event, player) {
							return player.isMaxHandcard();
						},
						translate: "若你的手牌为全场最多（或之一）",
					},
					{
						filter(event, player) {
							return player.isMaxHandcard(true);
						},
						translate: "若你的手牌为全场最多",
					},
					{
						filter(event, player) {
							return player.isMinHandcard();
						},
						translate: "若你的手牌为全场最少（或之一）",
					},
					{
						filter(event, player) {
							return player.isMinHandcard(true);
						},
						translate: "若你的手牌为全场最少",
					},
					{
						filter(event, player) {
							return player.isMaxEquip();
						},
						translate: "若你装备区的牌为全场最多（或之一）",
					},
					{
						filter(event, player) {
							return player.isMaxEquip(true);
						},
						translate: "若你装备区的牌为全场最多",
					},
					{
						filter(event, player) {
							return player.isMinEquip();
						},
						translate: "若你装备区的牌为全场最少（或之一）",
					},
					{
						filter(event, player) {
							return player.isMinEquip(true);
						},
						translate: "若你装备区的牌为全场最少",
					},
					{
						filter(event, player) {
							return player.getPrevious() != player && player.getPrevious().hp > 1;
						},
						translate: "若你的上家（不为自己）的体力值大于1",
					},
					{
						filter(event, player) {
							return player.getPrevious() != player && player.getPrevious().hp == 1;
						},
						translate: "若你的上家（不为自己）的体力值等于1",
					},
					{
						filter(event, player) {
							return player.getPrevious() != player && player.getPrevious().countCards("h") > 2;
						},
						translate: "若你的上家（不为自己）的手牌数大于2",
					},
					{
						filter(event, player) {
							return player.getPrevious() != player && !player.getPrevious().countCards("h");
						},
						translate: "若你的上家（不为自己）没有手牌",
					},
					{
						filter(event, player) {
							return player.getPrevious() != player && player.getPrevious().getHistory("useCard").length > 0;
						},
						translate: "若你的上家（不为自己）本回合使用过牌",
					},
					{
						filter(event, player) {
							return player.getPrevious() != player && !player.getPrevious().getHistory("respond");
						},
						translate: "若你的上家（不为自己）本回合没有打出过牌",
					},
					{
						filter(event, player) {
							return player.getPrevious() != player && player.getPrevious().isDamaged();
						},
						translate: "若你的上家（不为自己）已受伤",
					},
					{
						filter(event, player) {
							return player.getPrevious() != player && player.getPrevious().isHealthy();
						},
						translate: "若你的上家（不为自己）的体力值为满",
					},
					{
						filter(event, player) {
							return player.getNext() != player && player.getNext().hp > 1;
						},
						translate: "若你的下家（不为自己）的体力值大于1",
					},
					{
						filter(event, player) {
							return player.getNext() != player && player.getNext().hp == 1;
						},
						translate: "若你的下家（不为自己）的体力值等于1",
					},
					{
						filter(event, player) {
							return player.getNext() != player && player.getNext().countCards("h") > 2;
						},
						translate: "若你的下家（不为自己）的手牌数大于2",
					},
					{
						filter(event, player) {
							return player.getNext() != player && !player.getNext().countCards("h");
						},
						translate: "若你的下家（不为自己）没有手牌",
					},
					{
						filter(event, player) {
							return player.getNext() != player && player.getNext().getHistory("useCard").length > 0;
						},
						translate: "若你的下家（不为自己）本回合使用过牌",
					},
					{
						filter(event, player) {
							return player.getNext() != player && !player.getNext().getHistory("respond");
						},
						translate: "若你的下家（不为自己）本回合没有打出过牌",
					},
					{
						filter(event, player) {
							return player.getNext() != player && player.getNext().isDamaged();
						},
						translate: "若你的下家（不为自己）已受伤",
					},
					{
						filter(event, player) {
							return player.getNext() != player && player.getNext().isHealthy();
						},
						translate: "若你的下家（不为自己）的体力值为满",
					},
				],
				/**
				 * @type skillFilter[] 技能发动条件(仅trigger.player)
				 */
				skillFilterList_onlyTarget: [
					{
						filter(event, player) {
							return event.player.hp > 1;
						},
						translate: "若其的体力值大于1",
					},
					{
						filter(event, player) {
							return event.player.countCards("h", "sha") > 0;
						},
						translate: "若其手牌中有【杀】",
					},
					{
						filter(event, player) {
							return event.player.isDamaged();
						},
						translate: "若其已受伤",
					},
					{
						filter(event, player) {
							return event.player.isHealthy();
						},
						translate: "若其的体力值为满",
					},
					{
						filter(event, player) {
							return event.player.isMaxHp();
						},
						translate: "若其的体力值为全场最多（或之一）",
					},
					{
						filter(event, player) {
							return event.player.isMaxHp(true);
						},
						translate: "若其的体力值为全场最多",
					},
					{
						filter(event, player) {
							return event.player.isMinHp();
						},
						translate: "若其的体力值为全场最少（或之一）",
					},
					{
						filter(event, player) {
							return event.player.isMinHp(true);
						},
						translate: "若其的体力值为全场最少",
					},
					{
						filter(event, player) {
							return event.player.isMaxCard();
						},
						translate: "若其的牌为全场最多（或之一）",
					},
					{
						filter(event, player) {
							return event.player.isMaxCard(true);
						},
						translate: "若其的牌为全场最多",
					},
					{
						filter(event, player) {
							return event.player.isMinCard();
						},
						translate: "若其的牌为全场最少（或之一）",
					},
					{
						filter(event, player) {
							return event.player.isMinCard(true);
						},
						translate: "若其的牌为全场最少",
					},
					{
						filter(event, player) {
							return event.player.isMaxHandcard();
						},
						translate: "若其的手牌为全场最多（或之一）",
					},
					{
						filter(event, player) {
							return event.player.isMaxHandcard(true);
						},
						translate: "若其的手牌为全场最多",
					},
					{
						filter(event, player) {
							return event.player.isMinHandcard();
						},
						translate: "若其的手牌为全场最少（或之一）",
					},
					{
						filter(event, player) {
							return event.player.isMinHandcard(true);
						},
						translate: "若其的手牌为全场最少",
					},
					{
						filter(event, player) {
							return event.player.isMaxEquip();
						},
						translate: "若其装备区的牌为全场最多（或之一）",
					},
					{
						filter(event, player) {
							return event.player.isMaxEquip(true);
						},
						translate: "若其装备区的牌为全场最多",
					},
					{
						filter(event, player) {
							return event.player.isMinEquip();
						},
						translate: "若其装备区的牌为全场最少（或之一）",
					},
					{
						filter(event, player) {
							return event.player.isMinEquip(true);
						},
						translate: "若其装备区的牌为全场最少",
					},
				],
				/**
				 * @type skillFilter[] 技能发动条件(仅trigger.num存在)
				 */
				skillFilterList_hasNum: [
					{
						filter(event, player) {
							return event.num && event.num > 1;
						},
						translate: translate => `若${translate}的点数大于1`,
					},
					{
						filter(event, player) {
							return event.num && event.num > 2;
						},
						translate: translate => `若${translate}的点数大于2`,
					},
				],
				/**
				 * @type skillContent[] 技能发动效果(仅player)
				 */
				skillContentList_onlyPlayer: [
					{
						async content(event, trigger, player) {
							player.insertPhase();
						},
						translate: "你在此回合结束后执行一个额外回合(每轮限一次)",
						result: {
							player: 2,
						},
					},
					{
						async content(event, trigger, player) {
							player.chat("草，怎么是空技能");
						},
						translate: "undefined",
						result: {
							player: 1,
						},
					},
					{
						async content(event, trigger, player) {
							player.draw();
						},
						translate: "你摸一张牌",
						result: {
							player: 1,
						},
					},
					{
						async content(event, trigger, player) {
							player.draw(2);
						},
						translate: "你摸两张牌",
						result: {
							player: 2,
						},
					},
					{
						async content(event, trigger, player) {
							player.draw(3);
						},
						translate: "你摸三张牌",
						result: {
							player: 3,
						},
					},
					{
						async content(event, trigger, player) {
							player.recover();
						},
						translate: "你回复1点体力",
						filter: (event, player) => !player.isHealthy(),
						result: {
							player: player => (player.isHealthy() ? 0 : 1),
						},
					},
					{
						async content(event, trigger, player) {
							player.recover(player.maxHp - player.hp);
						},
						translate: "你回复体力至体力上限",
						filter: (event, player) => !player.isHealthy(),
						result: {
							player: player => (player.isHealthy() ? 0 : player.maxHp - player.hp),
						},
					},
					{
						async content(event, trigger, player) {
							player.damage("nocard", "nosource");
						},
						translate: "你受到1点无来源的伤害",
						result: {
							player: player => (player.hasSkillTag("maixie") ? 1 : -1),
						},
					},
					{
						async content(event, trigger, player) {
							player.loseHp();
						},
						translate: "你失去1点体力",
						result: {
							player: player => (player.hasSkillTag("maihp") ? 1 : -1),
						},
					},
					{
						async content(event, trigger, player) {
							player.chooseToDiscard("he", true);
						},
						filter: (event, player) => player.countCards("he") > 0,
						translate: "你需弃置一张牌",
						result: {
							player: player => {
								if (player.countCards("he") == 0) {
									return 0;
								}
								if (player.hasSkillTag("nodiscard")) {
									return 1;
								}
								return -1;
							},
						},
					},
					{
						async content(event, trigger, player) {
							player.gainMaxHp();
						},
						translate: "你增加1点体力上限",
						result: {
							player: 1,
						},
					},
					{
						async content(event, trigger, player) {
							player.loseMaxHp();
						},
						translate: "你减少1点体力上限",
						result: {
							player: player => (player.maxHp == 1 ? -Infinity : -3),
						},
					},
					{
						async content(event, trigger, player) {
							player.die();
						},
						translate: "你立即阵亡",
						result: {
							player: -Infinity,
						},
					},
					{
						async content(event, trigger, player) {
							player.turnOver();
						},
						translate: "你翻面",
						result: {
							player: player => {
								if (player.hasSkillTag("noturn")) {
									return 0;
								}
								return player.isTurnedOver() ? 1 : -1;
							},
						},
					},
					{
						async content(event, trigger, player) {
							player.link();
						},
						translate: "你横置/重置",
						result: {
							player: player => {
								if (player.hasSkillTag("noLink")) {
									return 0;
								}
								if (player.hasSkillTag("nofire") && player.hasSkillTag("nothunder")) {
									return 0;
								}
								return player.isLinked() ? 1 : -1;
							},
						},
					},
					{
						async content(event, trigger, player) {
							const next = player.judge(card => {
								if (get.color(card) == "red") {
									return 2;
								}
								return -0.5;
							});
							next.judge2 = result => {
								return result.bool;
							};
							const result = await next.forResult();
							if (result.bool) {
								const nextx = player.chooseTarget(lib.filter.notMe);
								next.ai = function (target) {
									const player = _status.event.player;
									return get.damageEffect(target, player, player);
								};
								const resultx = await nextx.forResult();
								if (resultx.bool) {
									player.line(resultx.targets);
									resultx.targets[0].damage(1);
								}
							}
						},
						translate: "你进行一次判定, 若结果为红色，你可以对一名其他角色造成1点伤害",
						result: {
							player: player => (player.hasSkill("tiandu") || player.hasSkill("xinleiji") ? 3 : 1),
						},
					},
					{
						async content(event, trigger, player) {
							player.getBuff();
						},
						translate: "你随机获得一个正面效果",
						result: {
							player: 1,
						},
					},
					{
						async content(event, trigger, player) {
							player.tempHide();
						},
						translate: "你获得【潜行】到你的回合开始",
						result: {
							player: 3,
						},
						filter: (event, player) => !player.hasSkill("qianxing"),
					},
					{
						async content(event, trigger, player) {
							var card = get.cardPile2(card => get.type(card) == "equip");
							if (card) {
								await player.equip(card);
							}
						},
						translate: "你随机从牌堆中装备一张装备牌",
						result: {
							player: 2,
						},
					},
					{
						async content(event, trigger, player) {
							var card = get.cardPile2(card => get.type(card) == "basic");
							if (card) {
								await player.gain(card, "gain2", "log");
							}
						},
						translate: "你随机从牌堆中获得一张基本牌",
						result: {
							player: 2,
						},
					},
					{
						async content(event, trigger, player) {
							var card = get.cardPile2(card => get.type(card) == "trick");
							if (card) {
								await player.gain(card, "gain2", "log");
							}
						},
						translate: "你随机从牌堆中获得一张普通锦囊牌",
						result: {
							player: 2,
						},
					},
					{
						async content(event, trigger, player) {
							var card = get.cardPile2(card => get.type(card) == "delay");
							if (card) {
								await player.gain(card, "gain2", "log");
							}
						},
						translate: "你随机从牌堆中获得一张延时锦囊牌",
						result: {
							player: 2,
						},
					},
					{
						async content(event, trigger, player) {
							let cards = get.cards(3);
							await game.cardsGotoOrdering(cards);
							await player.showCards(cards);
							var num = 0;
							for (var i = 0; i < cards.length; i++) {
								if (get.suit(cards[i]) == "heart") {
									num++;
									cards.splice(i--, 1);
								}
							}
							if (num) {
								await player.recover(num);
							}
							if (cards.length) {
								await player.gain(event.cards, "gain2");
								game.delay();
							}
						},
						translate: "你展示牌堆顶的三张牌，然后回复X点体力（X为其中红桃牌数目），然后你将其中的红桃牌置于弃牌堆，并获得其他牌",
						result: {
							player: 3,
						},
					},
					{
						async content(event, trigger, player) {
							await player.chooseToUse();
						},
						translate: "你可以立即使用一张牌",
						filter(event, player) {
							return player.countCards("h") > 0;
						},
						result: {
							player: player => (player.countCards("h") > 0 ? 1 : 0),
						},
					},
					{
						async content(event, trigger, player) {
							player.addTempSkill("fengyin");
						},
						translate: "本回合你的非锁定技失效",
						filter: (event, player) => !player.hasSkill("fengyin"),
						result: {
							player: -2,
						},
					},
				],
				/**
				 * @type skillContent[] 技能发动效果(仅trigger.player)
				 */
				skillContentList_onlyTarget: [
					{
						async content(event, trigger, player) {
							trigger.player.draw();
						},
						translate: "其摸一张牌",
						result: {
							evtPlayer: 1,
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.draw(2);
						},
						translate: "其摸两张牌",
						result: {
							evtPlayer: 2,
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.recover();
						},
						translate: "其回复1点体力",
						filter: (event, player) => !event.player.isHealthy(),
						result: {
							evtPlayer: player => (player.isHealthy() ? 0 : 1),
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.damage("nocard", player);
						},
						translate: "其受到1点来自于你的伤害",
						result: {
							evtPlayer: player => (player.hasSkillTag("maixie") ? 1 : -1),
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.damage(2, "nocard", player);
						},
						translate: "其受到2点来自于你的伤害",
						result: {
							evtPlayer: player => (player.hasSkillTag("maixie") && player.hp > 2 ? 2 : -2),
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.loseHp();
						},
						translate: "其失去1点体力",
						result: {
							evtPlayer: player => (player.hasSkillTag("maihp") ? 1 : -1),
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.chooseToDiscard("he", true);
						},
						filter: (event, player) => event.player.countCards("he") > 0,
						translate: "其需弃置一张牌",
						result: {
							evtPlayer: player => {
								if (player.countCards("he") == 0) {
									return 0;
								}
								if (player.hasSkillTag("nodiscard")) {
									return 1;
								}
								return -1;
							},
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.gainMaxHp();
						},
						translate: "其增加1点体力上限",
						result: {
							evtPlayer: 1,
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.loseMaxHp();
						},
						translate: "其失去1点体力上限",
						result: {
							evtPlayer: player => (player.maxHp == 1 ? -Infinity : -2),
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.turnOver();
						},
						translate: "其翻面",
						result: {
							evtPlayer: player => {
								if (player.hasSkillTag("noturn")) {
									return 0;
								}
								return player.isTurnedOver() ? 1 : -1;
							},
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.link();
						},
						translate: "其横置/重置",
						result: {
							evtPlayer: player => {
								if (player.hasSkillTag("noLink")) {
									return 0;
								}
								if (player.hasSkillTag("nofire") && player.hasSkillTag("nothunder")) {
									return 0;
								}
								return player.isLinked() ? 1 : -1;
							},
						},
					},
					{
						async content(event, trigger, player) {
							const next = trigger.player.judge(card => {
								if (get.color(card) == "black") {
									return 2;
								}
								return -0.5;
							});
							next.judge2 = result => {
								return result.bool;
							};
							const result = next.forResult();
							if (result.bool) {
								trigger.player.chooseDrawRecover();
							}
						},
						translate: "其进行一次判定，若结果为黑色，其选择摸牌或者回血",
						result: {
							evtPlayer: player => (player.hasSkill("tiandu") || player.hasSkill("xinleiji") ? 3 : 1),
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.die();
						},
						translate: "其立即阵亡",
						result: {
							evtPlayer: -Infinity,
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.getBuff();
						},
						translate: "其随机获得一个正面效果",
						result: {
							evtPlayer: 1,
						},
					},
					{
						async content(event, trigger, player) {
							var card = get.cardPile2(card => get.type(card) == "equip");
							if (card) {
								await trigger.player.equip(card);
							}
						},
						translate: "其随机从牌堆中装备一张装备牌",
						result: {
							evtPlayer: 2,
						},
					},
					{
						async content(event, trigger, player) {
							var card = get.cardPile2(card => get.type(card) == "basic");
							if (card) {
								await trigger.player.gain(card, "gain2", "log");
							}
						},
						translate: "其随机从牌堆中获得一张基本牌",
						result: {
							evtPlayer: 2,
						},
					},
					{
						async content(event, trigger, player) {
							var card = get.cardPile2(card => get.type(card) == "trick");
							if (card) {
								await trigger.player.gain(card, "gain2", "log");
							}
						},
						translate: "其随机从牌堆中获得一张普通锦囊牌",
						result: {
							evtPlayer: 2,
						},
					},
					{
						async content(event, trigger, player) {
							var card = get.cardPile2(card => get.type(card) == "delay");
							if (card) {
								await trigger.player.gain(card, "gain2", "log");
							}
						},
						translate: "其随机从牌堆中获得一张延时锦囊牌",
						result: {
							evtPlayer: 2,
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.chooseToUse();
						},
						translate: "其可以立即使用一张牌",
						filter(event, player) {
							return event.player.countCards("h") > 0;
						},
						result: {
							evtPlayer: player => (player.countCards("h") > 0 ? 1 : 0),
						},
					},
					{
						async content(event, trigger, player) {
							trigger.player.addTempSkill("fengyin");
						},
						filter(event, player) {
							return !event.player.hasSkill("fengyin");
						},
						translate: "本回合其的非锁定技失效",
						result: {
							evtPlayer: -2,
						},
					},
				],
				/**
				 * @type skillContent[] 技能发动效果(仅trigger.num存在)
				 */
				skillContentList_hasNum: [
					{
						async content(event, trigger, player) {
							trigger.num++;
						},
						translate: "该数值+1",
						result: {
							evtPlayer(player, triggerName) {
								if (["damage", "loseHp", "loseMaxHp"].includes(triggerName)) {
									return -1;
								}
								return 1;
							},
						},
					},
					{
						async content(event, trigger, player) {
							trigger.num += 2;
						},
						translate: "该数值+2",
						result: {
							evtPlayer(player, triggerName) {
								if (["damage", "loseHp", "loseMaxHp"].includes(triggerName)) {
									return -2;
								}
								return 2;
							},
						},
					},
					{
						async content(event, trigger, player) {
							trigger.num--;
						},
						translate: "该数值-1",
						result: {
							evtPlayer(player, triggerName) {
								if (["damage", "loseHp", "loseMaxHp"].includes(triggerName)) {
									return 1;
								}
								return -1;
							},
						},
					},
					{
						async content(event, trigger, player) {
							trigger.num -= 2;
						},
						translate: "该数值-2",
						result: {
							evtPlayer(player, triggerName) {
								if (["damage", "loseHp", "loseMaxHp"].includes(triggerName)) {
									return 2;
								}
								return -2;
							},
						},
					},
					{
						async content(event, trigger, player) {
							trigger.num *= 2;
						},
						translate: "该数值乘2",
						result: {
							evtPlayer(player, triggerName) {
								if (["damage", "loseHp", "loseMaxHp"].includes(triggerName)) {
									return -2;
								}
								return 2;
							},
						},
					},
				],
				/**
				 * @type skillContent[] 技能发动效果(仅可取消的时机可用)
				 */
				skillContentList_onlyCancel: [
					{
						async content(event, trigger, player) {
							trigger.cancel();
						},
						translate: "取消该效果",
						result: {
							evtPlayer(player, triggerName) {
								if (["damage", "loseHp", "loseMaxHp", "addJudge"].includes(triggerName)) {
									return 1;
								}
								return -2;
							},
						},
					},
				],
			},
		},
	}
```

## ns_huangchengyan 名字:黄承彦 势力:shu

### nslongyue 名字:龙岳
描述: 当一名角色使用锦囊牌时，若此牌是其本回合内使用的第一张牌，则你可令其摸一张牌。
```js
nslongyue: {
		init: () => {
			game.addGlobalSkill("nslongyue_ai");
		},
		onremove: () => {
			if (!game.hasPlayer(i => i.hasSkill("nslongyue", null, null, false), true)) {
				game.removeGlobalSkill("nslongyue_ai");
			}
		},
		trigger: { global: "useCard" },
		filter(event, player) {
			return get.type(event.card, "trick") == "trick" && event.player.getHistory("useCard").indexOf(event) == 0;
		},
		logTarget: "player",
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		async content(event, trigger, player) {
			await trigger.player.draw();
		},
		ai: {
			expose: 0.2,
		},
	}
```

### nszhenyin 名字:阵引
描述: 每回合限一次。一名角色的判定牌生效前，你可令当前回合角色打出一张手牌代替之。
```js
nszhenyin: {
		trigger: { global: "judge" },
		usable: 1,
		filter(event, player) {
			return _status.currentPhase?.countCards("hs") > 0;
		},
		logTarget() {
			return _status.currentPhase;
		},
		check(event, player) {
			var target = _status.currentPhase;
			var judge = event.judge(event.player.judging[0]);
			var max = 0;
			var hs = target.getCards("h", function (card) {
				var mod2 = game.checkMod(card, target, "unchanged", "cardEnabled2", target);
				if (mod2 != "unchanged") {
					return mod2;
				}
				var mod = game.checkMod(card, target, "unchanged", "cardRespondable", target);
				if (mod != "unchanged") {
					return mod;
				}
				return true;
			});
			for (var i of hs) {
				var num = event.judge(i) - judge;
				if (num > max) {
					max = num;
				}
			}
			var att = get.attitude(player, target);
			if (att > 0) {
				return max > 0;
			}
			if (att < 0) {
				return max <= 0;
			}
			return false;
		},
		async content(event, trigger, player) {
			const target = _status.currentPhase;
			if (
				target?.hasCard(card => {
					const player = _status.currentPhase;
					const mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
					if (mod2 != "unchanged") {
						return mod2;
					}
					const mod = game.checkMod(card, player, "unchanged", "cardRespondable", player);
					if (mod != "unchanged") {
						return mod;
					}
					return true;
				}, "hs")
			) {
				const result = await target
					.chooseCard(`${target == trigger.player ? "你" : get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，请打出一张手牌进行改判`, "hs", card => {
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
							return result / Math.max(0.1, get.value(card));
						} else {
							return -result / Math.max(0.1, get.value(card));
						}
					})
					.set("judging", trigger.player.judging[0])
					.forResult();
				if (result?.cards?.length) {
					const next = target.respond(result.cards, event.name, "highlight", "noOrdering").set("nopopup", true);
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
				}
			}
		},
		ai: {
			rejudge: true,
			tag: { rejudge: 1 },
		},
	}
```

## ns_sunchensunjun 名字:孙綝孙峻 势力:wu

### nsxianhai 名字:险害
描述: 每轮限一次，当一名其他角色于回合内造成伤害后，若其此回合内造成过的伤害总和大于你上一回合内造成的伤害总和，则你可以减1点体力上限，令其废除一种装备栏并弃置手牌中所有的【闪】。若〖兴黜〗已发动，此回合结束后视为该限定技未发动过。
```js
nsxianhai: {
		trigger: { global: "damageSource" },
		filter(event, player) {
			return event.source && event.source != player && event.source.isIn() && event.source == _status.currentPhase && (event.source.getStat("damage") || 0) > (player.getLastStat("damage") || 0) && !player.hasSkill("nsxianhai_round");
		},
		check(event, player) {
			return player.maxHp > 1 && get.attitude(player, event.source) < -4;
		},
		logTarget: "source",
		async content(event, trigger, player) {
			let result;

			// step 0
			player.addTempSkill("nsxianhai_round", "roundStart");
			await player.loseMaxHp();

			const slotSet = new Set();
			for (const slot of [1, 2, 3, 4, 5]) {
				if (trigger.source.hasEnabledSlot(slot)) {
					slotSet.add(slot === 3 || slot === 4 ? "equip3_4" : `equip${slot}`);
				}
			}
			const list = Array.from(slotSet);

			if (list.length) {
				result = await player
					.chooseControl(list)
					.set("prompt", "选择废除" + get.translation(trigger.source) + "的一种装备栏")
					.set("ai", () => {
						const target = _status.event.getTrigger().source;
						if (list.includes("equip6") && target.getEquip("equip3") && target.getEquip("equip4")) {
							return "equip6";
						}
						if (list.includes("equip2") && target.getEquip(2) && get.value(target.getEquip(2), target) > 0) {
							return "equip2";
						}
						if (list.includes("equip5") && target.getEquip(5) && get.value(target.getEquip(5), target) > 0) {
							return "equip5";
						}
						return 0;
					})
					.forResult();

				// step 1
				if (result.control !== "equip3_4") {
					trigger.source.disableEquip(result.control);
				} else {
					trigger.source.disableEquip(3, 4);
				}
			}

			// step 2
			if (player.awakenedSkills.includes("nsxingchu")) {
				const next = game.createEvent("nsxianhai_clear");
				event.next.remove(next);
				event.getParent("phase").after.push(next);
				next.player = player;
				next.setContent(function () {
					player.restoreSkill("nsxingchu");
				});
			}

			// step 3
			if (trigger.source) {
				const hs = trigger.source.getCards("h", "shan");
				if (hs.length) {
					await trigger.source.discard(hs);
				}
			}
		},
	}
```

### nsxingchu 名字:兴黜
描述: 限定技，当你杀死一名角色/你死亡时，你可以令一名角色获得其/你的所有牌并增加1点体力上限。
```js
nsxingchu: {
		trigger: { global: "die" },
		forceDie: true,
		filter(event, player) {
			return player == event.player || player == event.source;
		},
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		direct: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2("nsxingchu"))
				.set("ai", function (target) {
					return get.attitude(_status.event.player, target);
				})
				.set("forceDie", true)
				.forResult();
			if (result.bool) {
				const target = result.targets[0];
				player.logSkill("nsxingchu", target);
				player.awakenSkill(event.name);
				const he = trigger.player.getCards("he");
				if (he.length) {
					await target.gain(he, trigger.player, "giveAuto", "bySelf");
				}
				await target.gainMaxHp();
			}
		},
	}
```

## ns_yuanxi 名字:袁熙 势力:qun

### nsshengyan 名字:盛筵
描述: 锁定技，你的判定牌生效后，若结果花色与你本回合内其他判定结果的花色均不同，则你令当前回合角色本回合的手牌上限+2。
```js
nsshengyan: {
		trigger: { player: "judgeEnd" },
		forced: true,
		filter(event, player) {
			const { currentPhase } = _status;
			return currentPhase?.isIn() && !player.getStorage("nsshengyan_record").includes(event.result.suit);
		},
		logTarget: () => _status.currentPhase,
		async content(event, trigger, player) {
			const record = event.name + "_record";
			player.addTempSkill(record);
			player.markAuto(record, [trigger.result.suit]);
			player.storage[record].sort((a, b) => lib.suit.indexOf(b) - lib.suit.indexOf(a));
			player.addTip(record, get.translation(record) + player.getStorage(record).reduce((str, suit) => str + get.translation(suit), ""));
			const { currentPhase } = _status;
			if (!currentPhase.isIn()) {
				return;
			}
			currentPhase.addTempSkill(event.name + "_effect");
			currentPhase.addMark(event.name + "_effect", 2, false);
		},
		subSkill: {
			record: {
				charlotte: true,
				onremove(player, skill) {
					delete player.storage[skill];
					player.removeTip(skill);
				},
				intro: { content: "本回合已判定花色：$" },
			},
			effect: {
				charlotte: true,
				onremove: true,
				markimage: "image/card/handcard.png",
				intro: { content: "手牌上限+#" },
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("nsshengyan_effect");
					},
				},
				marktext: "筵",
			},
		},
	}
```

### nsdaizhan 名字:怠战
描述: 准备阶段，你可以将一张非锦囊牌当做【兵粮寸断】或【乐不思蜀】对自己使用。若如此做，回合结束时，你将手牌摸至手牌上限。
```js
nsdaizhan: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return ["lebu", "bingliang"].some(name => player.hasCard(card => player.canAddJudge({ name: name, cards: [card] }) && (_status.connectMode || get.type2(card) != "trick"), "he"));
		},
		async cost(event, trigger, player) {
			const list = ["lebu", "bingliang"].filter(name => player.hasCard(card => player.canAddJudge({ name: name, cards: [card] }) && get.type2(card) != "trick", "he"));
			const result = await player
				.chooseButton([get.prompt2(event.skill), [list.map(name => [get.type(name), "", name]), "vcard"]])
				.set("ai", button => {
					const player = get.player();
					if (button.link[2] == "lebu") {
						return 0;
					}
					const delta = player.getHandcardLimit() + player.countCards("j") * 2 + 2 - player.hp;
					if (delta >= 2) {
						return 1 + Math.random();
					}
					if (delta >= 0 && !player.countCards("h", card => player.hasValueTarget(card))) {
						return Math.random();
					}
					return 0;
				})
				.forResult();
			event.result = {
				bool: result?.bool,
				cost_data: result?.links,
				skill_popup: false,
			};
		},
		async content(event, trigger, player) {
			const { cost_data: links } = event;
			const card = { name: links[0][2] };
			game.broadcastAll(card => {
				lib.skill.nsdaizhan_backup.viewAs = card;
			}, card);
			const next = player.chooseToUse();
			next.set("openskilldialog", "怠战：是否将一张非锦囊牌当做" + get.translation(card) + "对自己使用？");
			next.set("norestore", true);
			next.set("addCount", false);
			next.set("_backupevent", "nsdaizhan_backup");
			next.set("custom", {
				add: {},
				replace: { window() {} },
			});
			next.backup("nsdaizhan_backup");
			await next;
		},
		subSkill: {
			backup: {
				filterCard(card, player) {
					return (
						get.itemtype(card) == "card" &&
						get.type2(card) != "trick" &&
						player.canAddJudge({
							name: lib.skill.nsdaizhan_backup.viewAs.name,
							cards: [card],
						})
					);
				},
				filterTarget(card, player, target) {
					return player == target;
				},
				selectTarget: -1,
				check(card) {
					return 8 - get.value(card);
				},
				position: "he",
				async precontent(event, trigger, player) {
					player.addTempSkill("nsdaizhan_effect");
				},
				ai: { result: { target: 1 } },
			},
			effect: {
				charlotte: true,
				trigger: { player: "phaseEnd" },
				forced: true,
				popup: false,
				filter(event, player) {
					return player.countCards("h") < player.getHandcardLimit();
				},
				async content(event, trigger, player) {
					await player.drawTo(player.getHandcardLimit());
				},
				ai: { nowuxie_judge: true },
			},
		},
	}
```

## ns_caoshuang 名字:曹爽 势力:wei

### nsjiquan 名字:集权
描述: 与你距离1以内的其他角色造成或受到伤害后，你可以将其区域内的一张牌置于你的武将牌上（称为“威”）。你使用【杀】的次数上限+X（X为“威”数）。
```js
nsjiquan: {
		trigger: {
			global: ["damageEnd", "damageSource"],
		},
		direct: true,
		filter(event, player, name) {
			var target = name == "damageSource" ? event.source : event.player;
			return target && target != player && get.distance(player, target) <= 1 && target.countCards("hej") > 0;
		},
		locked(skill, player) {
			return player && player.storage.nsfuwei;
		},
		async content(event, trigger, player) {
			let result;

			const target = event.triggername == "damageSource" ? trigger.source : trigger.player;
			event.target = target;

			result = await player
				.choosePlayerCard(target, "hej", player.storage.nsfuwei ? true : 1)
				.set("ai", button => {
					const val = get.buttonValue(button);
					if (get.attitude(_status.event.player, get.owner(button.link)) > 0) {
						return -val;
					}
					return val;
				})
				.forResult();

			if (!result.bool) {
				return;
			}

			player.logSkill("nsjiquan", target);
			const next = player.addToExpansion(result.cards, target, "give");
			next.gaintag.add("nsjiquan_mark");
			await next;

			await game.delayx();
		},
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return num + player.getExpansions("nsjiquan_mark").length;
				}
			},
		},
	}
```

### nsfuwei 名字:附位
描述: 觉醒技，结束阶段开始时，若“威”数大于4，则你加2点体力上限，获得〖喋谋〗和〖制皇〗，并将〖集权〗改为锁定技。
```js
nsfuwei: {
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			return player.getExpansions("nsjiquan_mark").length > 4;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.addSkill("nsdiemou");
			player.addSkill("nszhihuang");
			player.gainMaxHp(2);
		},
		derivation: ["nsdiemou", "nszhihuang"],
		ai: { combo: "nsjiquan" },
	}
```

## ns_sunyi 名字:孙翊 势力:wu

### nsguolie 名字:果烈
描述: 摸牌阶段开始前，你可跳过此阶段。若如此做，你的红色牌均视为【杀】，黑色牌均视为【过河拆桥】且均无视距离与次数直到回合结束，且结束阶段，你获得本回合从你以外的区域内进入弃牌堆的所有牌。
```js
nsguolie: {
		trigger: { player: "phaseDrawBefore" },
		check(event, player) {
			var h1 = player.getUseValue({ name: "sha" }, false);
			var h2 = player.getUseValue({ name: "guohe" });
			return (
				player.countCards("h", function (card) {
					if (get.color(card) == "red") {
						return h1 > 0;
					}
					return h2 > 0;
				}) > 2
			);
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.addTempSkill("nsguolie2");
		},
	}
```

## ns_huangwudie 名字:黄舞蝶 势力:shu

### nsdiewu 名字:蝶舞
描述: 当你获得两张或更多的牌后/受到伤害后，你获得一个“蝶舞”标记；你可移去一枚“蝶舞”标记，然后视为使用一张【杀】或【闪】。当你以此法使用【杀】造成伤害后，则你摸一张牌。
```js
nsdiewu: {
		trigger: {
			player: ["damageEnd", "gainAfter"],
			global: "loseAsyncAfter",
		},
		forced: true,
		locked: false,
		filter(event, player) {
			if (event.name != "damage") {
				return event.getg(player).length > 1;
			}
			return true;
		},
		async content(event, trigger, player) {
			player.addMark("nsdiewu", 1);
		},
		intro: {
			content: "mark",
		},
		group: ["nsdiewu_sha", "nsdiewu_shan", "nsdiewu_draw"],
		subSkill: {
			sha: {
				enable: "chooseToUse",
				viewAs: { name: "sha", isCard: true },
				prompt: "视为使用一张【杀】",
				viewAsFilter(player) {
					return player.countMark("nsdiewu") > 0;
				},
				filterCard: () => false,
				selectCard: -1,
				onuse(links, player) {
					player.removeMark("nsdiewu", 1);
				},
				ai: {
					order() {
						var player = _status.event.player;
						if (!player.storage.nspojian && player.countMark("nsdiewu") <= player.hp) {
							return 0;
						}
						return get.order({ name: "sha" }) + 0.1;
					},
				},
			},
			shan: {
				enable: "chooseToUse",
				viewAs: { name: "shan", isCard: true },
				viewAsFilter(player) {
					return player.countMark("nsdiewu") > 0 && !player.storage.nspojian;
				},
				filterCard: () => false,
				selectCard: -1,
				onuse(links, player) {
					player.removeMark("nsdiewu", 1);
				},
				ai: {
					order() {
						var player = _status.event.player;
						if (player.hp > 1 && player.countMark("nsdiewu") <= player.hp) {
							return 0;
						}
						return get.order({ name: "shan" }) - 0.2;
					},
				},
			},
			draw: {
				trigger: { source: "damageEnd" },
				forced: true,
				popup: false,
				filter(event, player) {
					var evt = event.getParent();
					return evt && evt.type == "card" && evt.skill == "nsdiewu_sha";
				},
				async content(event, trigger, player) {
					await player.draw();
				},
			},
		},
		ai: {
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag) {
				if (tag == "respondShan" && player.storage.nspojian) {
					return false;
				}
				return player.countMark("nsdiewu") > 0;
			},
		},
	}
```

### nslingying 名字:灵影
描述: 锁定技，你使用【杀】无距离限制，且你使用【杀】的次数上限+1。
```js
nslingying: {
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return num + 1;
				}
			},
			targetInRange(card) {
				if (card.name == "sha") {
					return true;
				}
			},
		},
	}
```

### nspojian 名字:破茧
描述: 觉醒技，准备阶段，若你的"蝶舞"标记的数量不小于你的体力值，则你减1点体力上限并摸两张牌，删除〖蝶舞〗中使用【闪】的部分并获得技能〖烈弓〗。
```js
nspojian: {
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "fire",
		filter(event, player) {
			return player.countMark("nsdiewu") >= player.hp;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.storage.nspojian = true;
			player.loseMaxHp();
			player.draw(2);
			player.addSkill("nsliegong");
		},
		derivation: "nsliegong",
		ai: {
			combo: "nsdiewu",
		},
	}
```

## ns_chentai 名字:陈泰 势力:wei

### nsweiyuan 名字:围援
描述: 出牌阶段限一次，当你使用牌指定其他角色A为唯一目标后，你可以令一名除该角色外的其他角色B选择一项：①交给A一张牌：然后你对B造成1点伤害；②你摸一张牌，且可以将一张手牌当做本回合使用过的一张基本牌/普通锦囊牌使用（无次数距离限制）。
```js
nsweiyuan: {
		trigger: { player: "useCardToTargeted" },
		direct: true,
		filter(event, player) {
			return (
				player != event.target &&
				event.targets &&
				event.targets.length == 1 &&
				event.target.isIn() &&
				player.isPhaseUsing() &&
				!player.hasSkill("nsweiyuan2") &&
				game.hasPlayer(function (current) {
					return current != player && current != event.target;
				})
			);
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			result = await player
				.chooseTarget(get.prompt2("nsweiyuan"), (card, player, target) => {
					return target != player && target != _status.event.getTrigger().target;
				})
				.set("ai", target => {
					return Math.max(Math.random(), get.attitude(player, target));
				})
				.forResult();

			// step 1
			if (!result.bool) {
				return;
			}

			player.addTempSkill("nsweiyuan2", "phaseUseAfter");
			const target = result.targets[0];
			event.target = target;
			player.logSkill("nsweiyuan", target);

			result = await target
				.chooseCard("he", "交给" + get.translation(trigger.target) + "一张牌并受到1点伤害，或令" + get.translation(player) + "摸一张牌且可以重复使用牌")
				.set("ai", card => {
					if (_status.event.goon) {
						return Math.random();
					}
					return 0;
				})
				.set(
					"goon",
					(() => {
						if (get.attitude(target, player) > 0) {
							return false;
						}
						return Math.random() > 0.5;
					})()
				)
				.forResult();

			// step 2
			if (result.bool) {
				await target.gain(result.cards, trigger.target);
				await target.damage();
			} else {
				player.addTempSkill("nsweiyuan_use");
				await player.draw();
			}
		},
	}
```

### nsjuxian 名字:据险
描述: 当你受到伤害时，你可以摸两张并跳过下一个摸牌阶段，且在此之前不能再次发动〖据险〗。然后若你的手牌数不小于体力上限，则伤害来源弃置一张牌。
```js
nsjuxian: {
		trigger: { player: "damageBegin2" },
		filter(event, player) {
			return !player.hasSkill("nsjuxian2");
		},
		check(event, player) {
			if (player.countCards("h") + 2 >= player.maxHp) {
				return !event.source || !event.source.countCards("he") || get.attitude(player, event.source) > 0;
			}
			return true;
		},
		async content(event, trigger, player) {
			player.addSkill("nsjuxian2");
			await player.draw(2);
			const target = trigger.source;
			if (player.countCards("h") >= player.maxHp && target && target.countCards("he")) {
				player.line(target, "green");
				await target.chooseToDiscard("he", true);
			}
		},
	}
```

## ns_zhangning 名字:张宁 势力:qun

### nsfuzhou 名字:符咒
描述: 出牌阶段限一次。你可以将一张黑色牌置于一名角色的判定区内，称为“符”。其于判定阶段进行“符”判定，若判定结果为：黑色，其受到1点雷属性伤害并弃置一张牌；红色，你摸两张牌，且该角色本回合手牌上限减1。
```js
nsfuzhou: {
		enable: "phaseUse",
		usable: 2,
		filter(event, player) {
			if (!player.storage.nstaiping && player.getStat("skill").nsfuzhou) {
				return false;
			}
			return player.countCards("he", { color: "black" }) > 0;
		},
		filterCard: { color: "black" },
		filterTarget(card, player, target) {
			return !target.hasJudge("nsfuzhou_card");
		},
		check(card) {
			return 8 - get.value(card);
		},
		prepare: "give",
		position: "he",
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const { target, cards } = event;
			await target.addJudge({ name: "nsfuzhou_card" }, cards[0]);
			cards[0].storage.nsfuzhou_source = player;
			await game.delayx();
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					if (player.storage.nsfuzhou_draw) {
						if (
							get.attitude(player, target) > 0 &&
							player.countCards("he", function (card) {
								return get.color(card) == "red";
							})
						) {
							return 1;
						}
						return 0;
					}
					if (player.storage.nsfuzhou_damage) {
						return -2;
					}
					return -1.5;
				},
			},
		},
	}
```

### nsguidao 名字:鬼道
描述: 一名角色的判定牌生效前，你可以打出一张黑色牌替换之。
```js
nsguidao: {
		trigger: { global: "judge" },
		filter(event, player) {
			return (
				player.countCards("hes", function (card) {
					if (player.storage.nstaiping || (_status.connectMode && get.position(card) != "e")) {
						return true;
					}
					return get.color(card) == "black";
				}) > 0
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(`${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt(event.skill)}`, "hes", card => {
					const player = get.player();
					if (!player.storage.nstaiping && get.color(card) != "black") {
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
	}
```

### nstaiping 名字:太平
描述: 觉醒技。准备阶段，若你：已因〖符咒〗造成了两次或更多的伤害，则你将〖鬼道〗中的“黑色牌”修改为“牌”，将〖符咒〗修改为〖符咒·邪〗；若你已因〖符咒〗摸了两次或更多的牌，则你将〖鬼道〗中的“黑色牌”修改为“牌”，将〖符咒〗修改为〖符咒·正〗。
```js
nstaiping: {
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			return (
				player.getAllHistory("sourceDamage", function (evt) {
					return evt.getParent().name == "nsfuzhou_card";
				}).length > 1 ||
				player.getAllHistory("gain", function (evt) {
					return evt.getParent(2).name == "nsfuzhou_card";
				}).length > 1
			);
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.storage.nstaiping = true;
			if (
				player.getAllHistory("sourceDamage", function (evt) {
					return evt.getParent().name == "nsfuzhou_card";
				}).length > 1
			) {
				player.storage.nsfuzhou_damage = true;
			}
			if (
				player.getAllHistory("gain", function (evt) {
					return evt.getParent(2).name == "nsfuzhou_card";
				}).length > 1
			) {
				player.storage.nsfuzhou_draw = true;
			}
		},
		ai: {
			combo: "nsfuzhou",
		},
		derivation: ["nsfuzhou_damage", "nsfuzhou_draw"],
	}
```

## ns_yanghu 名字:羊祜 势力:jin

### nsbizhao 名字:避召
描述: 隐匿技，锁定技，当你于回合外明置此武将牌后，其他角色计算与你的距离+1直至你的回合开始。
```js
nsbizhao: {
		trigger: { player: "showCharacterAfter" },
		forced: true,
		hiddenSkill: true,
		filter(event, player) {
			return (
				event.toShow?.some(name => {
					return get.character(name, 3).includes("nsbizhao");
				}) && player != _status.currentPhase
			);
		},
		async content(event, trigger, player) {
			player.addTempSkill(event.name + "_effect", { player: "phaseBeginStart" });
			player.addMark(event.name + "_effect", 1, false);
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				intro: { content: "其他角色至自己的距离+#" },
				mod: {
					globalTo(source, player, distance) {
						return distance + player.countMark("nsbizhao_effect");
					},
				},
			},
		},
	}
```

### nsqingde 名字:清德
描述: 每回合限一次，当你使用【杀】或普通锦囊牌对其他角色造成伤害后，你可使用该牌与受到伤害的角色拼点。你可令输的角色摸两张牌；当你受到其他角色使用【杀】或普通锦囊牌造成的伤害后，可使用该牌与伤害来源拼点。你可令赢的角色回复1点体力。
```js
nsqingde: {
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		usable: 1,
		filter(event, player) {
			if (!event.card || !event.cards || event.player == event.source || (event.card.name != "sha" && get.type(event.card) != "trick") || event.cards.filterInD().length != 1) {
				return false;
			}
			var target = lib.skill.nsqingde.logTarget(event, player);
			if (player.hasSkillTag("noCompareSource") || target.hasSkillTag("noCompareTarget")) {
				return false;
			}
			return target.countCards("h") > 0;
		},
		logTarget(event, player) {
			if (player == event.source) {
				return event.player;
			}
			return event.source;
		},
		check(event, player) {
			var target = lib.skill.nsqingde.logTarget(event, player);
			return get.attitude(player, target) <= 0;
		},
		async content(event, trigger, player) {
			let result;

			const target = lib.skill.nsqingde.logTarget(trigger, player);
			const next = player.chooseToCompare(target);
			if (event.triggername == "damageSource") {
				next.set("small", true);
			}
			next.fixedResult ??= {};
			next.fixedResult[player.playerid] = trigger.cards.filterInD()[0];
			result = await next.forResult();

			if (result.tie) {
				return;
			}

			let win = result.bool;
			if (event.triggername == "damageSource") {
				win = !win;
			}
			const target2 = win ? player : target;

			if (event.triggername == "damageSource") {
				result = await player
					.chooseBool("是否令" + get.translation(target2) + "摸两张牌？")
					.set("ai", () => get.attitude(player, target2) > 0)
					.forResult();
				if (result.bool) {
					await target2.draw(2);
				}
				return;
			}

			if (!target2.isDamaged()) {
				return;
			}

			result = await player
				.chooseBool("是否令" + get.translation(target2) + "回复1点体力？")
				.set("ai", () => get.attitude(player, target2) > 0)
				.forResult();
			if (result.bool) {
				await target2.recover();
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (target.storage.counttrigger && target.storage.counttrigger.nsqingde) {
						return;
					}
					var num = get.number(card);
					if (typeof num == "number") {
						if (target.hasSkillTag("noCompareSource") || player.hasSkillTag("noCompareTarget")) {
							return;
						}
						var hs = player.getCards("h");
						if (card.cards) {
							hs.removeArray(card.cards);
						}
						if (ui.selected.cards) {
							hs.removeArray(ui.selected.cards);
						}
						if (!hs.length) {
							return;
						}
						for (var i of hs) {
							if (get.number(i) >= num) {
								return;
							}
							if (player.hasSkill("tianbian") && get.suit(card) == "heart") {
								return;
							}
						}
						return "zerotarget";
					}
				},
			},
		},
	}
```

### nsyidi 名字:遗敌
描述: 出牌阶段限一次，你可展示一张手牌，然后将其交给一名其他角色。若为基本牌，该角色可使用此牌；若不为基本牌，你摸一张牌。
```js
nsyidi: {
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		filterCard: true,
		filterTarget: lib.filter.notMe,
		discard: false,
		lose: false,
		delay: false,
		check(card) {
			var player = _status.event.player;
			if (get.type(card) == "basic") {
				if (
					game.hasPlayer(function (current) {
						return get.attitude(current, player) > 0 && current.getUseValue(card) > player.getUseValue(card, null, true);
					})
				) {
					return 5 + Math.random();
				}
				return 0;
			}
			if (
				game.hasPlayer(function (current) {
					return get.attitude(current, player) > 0 && !current.hasJudge("lebu") && current.getUseValue(card) > player.getUseValue(card);
				})
			) {
				return 4.7 + Math.random();
			}
			if (
				card.name == "wuxie" &&
				game.hasPlayer(function (current) {
					return get.attitude(current, player) > 0;
				})
			) {
				return 5 + Math.random();
			}
			return 4 - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			let result;

			// step 0
			result = await player.give(cards, target, "visible").forResult();
			if (get.type(cards[0], player) != "basic") {
				await player.draw().forResult();
				return;
			}

			// step 1
			if (target.getCards("h").includes(cards[0]) && target.hasUseTarget(cards[0])) {
				await target.chooseUseTarget(cards[0]).forResult();
			}
		},
		ai: {
			order: 7,
			result: {
				player(player, target) {
					if (!ui.selected.cards.length || get.type(ui.selected.cards[0], player) == "basic") {
						return 0;
					}
					if (get.value(ui.selected.cards[0]) < 4) {
						return 2;
					}
					return 0.5;
				},
				target: 1,
			},
		},
	}
```

## ns_zanghong 名字:臧洪 势力:qun

### nsshimeng 名字:誓盟
描述: 出牌阶段限一次，你可以选择任意名角色。这些角色依次选择一项：⒈摸一张牌。⒉使用一张【杀】。然后若选择前者角色数大于选择后者的角色数，则你获得1点护甲并失去1点体力。
```js
nsshimeng: {
		enable: "phaseUse",
		usable: 1,
		selectTarget: [1, Infinity],
		filterTarget: true,
		async contentBefore(event, trigger, player) {
			const parent = event.getParent();
			if (parent == null) {
				return;
			}
			parent._nsshimeng_count = [0, 0];
		},
		async content(event, trigger, player) {
			const { target } = event;
			let result;

			// step 0
			if (!target.isIn()) {
				return;
			}
			result = await target
				.chooseToUse("使用一张【杀】，或摸一张牌", function (card, player) {
					if (get.name(card) != "sha") {
						return false;
					}
					return lib.filter.cardEnabled.apply(this, arguments);
				})
				.set("addCount", false)
				.forResult();

			// step 1
			const parent = event.getParent();
			if (!parent) {
				return;
			}
			if (result.bool) {
				parent._nsshimeng_count[0]++;
			} else {
				parent._nsshimeng_count[1]++;
				await target.draw();
			}
		},
		async contentAfter(event, trigger, player) {
			const list = event.getParent()?._nsshimeng_count;
			if (list[0] < list[1]) {
				await player.changeHujia(1);
				await player.loseHp();
			}
		},
		ai: {
			order: 3.05,
			result: {
				player(player, target) {
					var att = get.attitude(player, target);
					if (att <= 0) {
						return 0;
					}
					if (player.hp > 1 || player.countCards("hs", ["tao", "jiu"])) {
						return 1;
					}
					if (!ui.selected.targets.length) {
						if (target != player) {
							return 0;
						}
						if (player.hasSha()) {
							return 1;
						}
						return 0;
					}
					if (ui.selected.targets.length > 1 && !target.hasSha()) {
						return 0;
					}
					return 1;
				},
			},
		},
	}
```

## ns_ruanji 名字:阮籍 势力:wei

### nsshizui 名字:酾醉
描述: 每回合限一次。当你成为基本牌或普通锦囊牌的目标后，你可以弃置一张牌，然后视为使用一张【酒】。若你弃置的牌与其使用的牌花色相同，则此牌对你无效；若你弃置的牌为♣，则你获得其使用的牌。
```js
nsshizui: {
		trigger: { target: "useCardToTargeted" },
		usable: 1,
		filter(event, player) {
			var type = get.type(event.card, null, false);
			return (type == "basic" || type == "trick") && player.countCards("he") > 0 && player.hasUseTarget({ name: "jiu" }, null, true);
		},
		async cost(event, trigger, player) {
			var suit = get.suit(trigger.card),
				cards = trigger.cards.filterInD();
			var str = "弃置一张牌并视为使用一张【酒】";
			if (lib.suit.includes(suit)) {
				str += "；若弃置" + get.translation(suit) + "牌，则" + get.translation(trigger.card) + "对你无效";
			}
			if (cards.length) {
				str += "；若弃置♣牌则获得" + get.translation(cards);
			}
			str += "。";
			var next = player.chooseToDiscard("he", get.prompt(event.skill), str, "chooseonly");
			next.set("val1", cards.length ? get.value(cards, player) : 0);
			next.set("val2", -get.effect(player, trigger.card, trigger.player, player));
			next.set("suit", suit);
			next.set("ai", function (card) {
				var base = 2,
					suit = get.suit(card);
				if (suit == "club") {
					base += _status.event.val1;
				}
				if (suit == _status.event.suit) {
					base += _status.event.val2;
				}
				return base - get.value(card);
			});
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			await player.discard(cards);
			const suit1 = get.suit(cards[0], player);
			await player.chooseUseTarget("jiu", true);
			const suit2 = get.suit(trigger.card, false);
			if (suit1 == suit2 && lib.suit.includes(suit1)) {
				trigger.excluded.add(player);
			}
			if (suit1 == "club") {
				const cards = trigger.cards.filterInD();
				if (cards.length > 0) {
					await player.gain(cards, "gain2");
				}
			}
		},
	}
```

### nsxiaoye 名字:啸野
描述: 一名角色的结束阶段开始时，若你于当前回合内使用过【酒】，则你可以视为使用一张其于本回合内使用过的【杀】或普通锦囊牌。
```js
nsxiaoye: {
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return (
				player.hasHistory("useCard", function (evt) {
					return evt.card.name == "jiu";
				}) &&
				event.player.hasHistory("useCard", function (evt) {
					return (
						(evt.card.name == "sha" || get.type(evt.card) == "trick") &&
						player.hasUseTarget({
							name: evt.card.name,
							nature: evt.card.nature,
							isCard: true,
						})
					);
				})
			);
		},
		async cost(event, trigger, player) {
			const list = [];
			trigger.player.getHistory("useCard", function (evt) {
				if (evt.card.name != "sha" && get.type(evt.card) != "trick") {
					return;
				}
				if (evt.card.name == "sha" && evt.card.nature) {
					list.add("sha:" + evt.card.nature);
				} else {
					list.add(evt.card.name);
				}
			});
			for (let i = 0; i < list.length; i++) {
				if (list[i].indexOf("sha:") == 0) {
					list[i] = ["基本", "", "sha", list[i].slice(4)];
				} else {
					list[i] = [get.type(list[i]), "", list[i]];
				}
			}
			const result = await player
				.chooseButton([get.prompt(event.skill), [list, "vcard"]])
				.set("filterButton", function (button) {
					return player.hasUseTarget({
						name: button.link[2],
						nature: button.link[3],
						isCard: true,
					});
				})
				.set("ai", function (button) {
					return player.getUseValue({
						name: button.link[2],
						nature: button.link[3],
						isCard: true,
					});
				})
				.forResult();
			if (result.bool) {
				event.result = {
					bool: true,
					cost_data: {
						card: {
							name: result.links[0][2],
							nature: result.links[0][3],
							isCard: true,
						},
					},
				};
			}
		},
		async content(event, trigger, player) {
			player.chooseUseTarget(true, event.cost_data.card);
		},
	}
```

## ns_limi 名字:李密 势力:jin

### nstuilun 名字:退论
描述: 结束阶段，你可以失去任意点体力（至多失去至1点）并弃置任意张手牌（至多弃置至一张）。若如此做，你获得如下效果直到你下回合开始：其他角色的回合开始时，若你的体力值小于该角色，则你可以令一名角色回复或失去1点体力；若你的手牌数小于该角色，则你可以令一名角色摸一张牌或弃置一张牌。
```js
nstuilun: {
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return (
				player.hp > 1 &&
				player.countCards("h") > 1 &&
				player.hasCard(function (card) {
					return lib.filter.cardDiscardable(card, player, "nstuilun");
				}, "h")
			);
		},
		prompt2: "失去任意点体力（至多失去至1点）并弃置任意张手牌（至多弃置至一张）。",
		check(event, player) {
			if (
				game.hasPlayer(function (current) {
					return current != player && current.hp >= player.hp;
				})
			) {
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			if (player.hp == 2) {
				result = { numbers: [1] };
			} else {
				result = await player
					.chooseNumbers({
						list: [
							{
								min: 1,
								max: player.hp - 1,
								prompt: "请选择失去体力的量",
							},
						],
						processAI() {
							return [Math.floor(get.rand(0, player.hp - 2)) + 1];
						},
					})
					.forResult();
			}

			// step 1
			await player.loseHp(result.numbers[0]);

			// step 2
			if (player.countCards("h") > 1 && player.hasCard(card => lib.filter.cardDiscardable(card, player, "nstuilun"), "h")) {
				await player.chooseToDiscard({
					forced: true,
					position: "h",
					selectCard: [1, player.countCards("h") - 1],
					allowChooseAll: true,
				});
			} else {
				await game.delayx();
			}

			// step 3
			player.addTempSkill("nstuilun_effect", {
				player: "phaseBeginStart",
			});
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { global: "phaseBegin" },
				forced: true,
				popup: false,
				filter(event, player) {
					return player.hp < event.player.hp || (player.hp > 0 && player.countCards("h") < event.player.countCards("h"));
				},
				async content(event, trigger, player) {
					let result;

					if (player.hp < trigger.player.hp) {
						result = await player
							.chooseTarget("退论：是否令一名角色回复或失去1点体力？")
							.set("ai", target => {
								let eff = get.effect(target, { name: "losehp" }, player, player);
								if (target.isDamaged()) {
									eff = Math.max(eff, get.recoverEffect(target, player, player));
								}
								return eff;
							})
							.forResult();

						if (result.bool) {
							const target = result.targets[0];
							player.logSkill("nstuilun_effect", target);

							if (target.isHealthy()) {
								result = { index: 1 };
							} else {
								result = await player
									.chooseControl("回复1点体力", "失去1点体力")
									.set("prompt", "令" + get.translation(target) + "…")
									.set("ai", () => {
										if (get.recoverEffect(target, player, player) >= get.effect(target, { name: "losehp" }, player, player)) {
											return 0;
										}
										return 1;
									})
									.forResult();
							}

							if (result.index == 0) {
								await target.recover();
							} else {
								await target.loseHp();
							}
						}
					}

					if (trigger.player.countCards("h") > player.countCards("h")) {
						result = await player
							.chooseTarget("退论：是否令一名角色摸一张牌或弃置一张牌？")
							.set("ai", target => {
								const att = get.attitude(player, target);
								if (att > 0 || target.countCards("he") == 0) {
									return get.effect(target, { name: "draw" }, player, player);
								}
								return get.effect(target, { name: "guohe_copy2" }, target, player);
							})
							.forResult();

						if (result.bool) {
							const target = result.targets[0];
							player.logSkill("nstuilun_effect", target);

							if (!target.countCards("he")) {
								result = { index: 0 };
							} else {
								result = await player
									.chooseControl("摸一张牌", "弃置一张牌")
									.set("prompt", "令" + get.translation(target) + "…")
									.set("ai", () => (get.attitude(player, target) > 0 ? 0 : 1))
									.forResult();
							}

							if (result.index == 0) {
								await target.draw();
							} else {
								await target.chooseToDiscard("he", true);
							}
						}
					}
				},
			},
		},
	}
```

## ns_zhonglimu 名字:钟离牧 势力:wu

### nskuanhuai 名字:宽怀
描述: 出牌阶段开始时，你可以从弃牌堆中获得一张非基本牌。若如此做：你本阶段内不能使用基本牌，且本回合的弃牌阶段结束时，你可以依次使用本阶段内弃置的基本牌。
```js
nskuanhuai: {
		trigger: { player: "phaseUseBegin" },
		async content(event, trigger, player) {
			const card = get.discardPile(card => get.type(card) != "basic");
			if (card) {
				await player.gain({
					cards: [card],
					animate: "gain2",
				});
			}
			player.addTempSkill("nskuanhuai_blocker", "phaseUseAfter");
			player.addTempSkill("nskuanhuai_effect");
		},
		subSkill: {
			blocker: {
				charlotte: true,
				mod: {
					cardEnabled(card) {
						if (get.type(card) == "basic") {
							return false;
						}
					},
					cardSavable(card) {
						if (get.type(card) == "basic") {
							return false;
						}
					},
				},
			},
			effect: {
				trigger: { player: "phaseDiscardEnd" },
				charlotte: true,
				popup: false,
				filter(event, player) {
					return player.hasHistory("lose", function (evt) {
						if (evt.type != "discard" || evt.getParent("phaseDiscard") != event) {
							return false;
						}
						for (var i of evt.cards2) {
							if (get.type(i, null, false) == "basic" && get.position(i, true) == "d" && player.hasUseTarget(i)) {
								return true;
							}
						}
						return false;
					});
				},
				async content(event, trigger, player) {
					let result;
					const cards = player
						.getHistory("lose", evt => evt.type === "discard" && evt.getParent("phaseDiscard") === trigger)
						.flatMap(evt => evt.cards2)
						.filter(card => get.type(card, null, false) === "basic" && get.position(card, true) === "d");

					while (true) {
						const cards2 = cards.filter(card => get.position(card, true) == "d" && player.hasUseTarget(card));
						if (!cards2.length) {
							return;
						}

						result = await player
							.chooseButton({
								createDialog: ["宽怀：是否使用其中一张牌？", cards2],
							})
							.forResult();
						if (!result.bool) {
							return;
						}

						const card = result.links?.[0];
						const index = cards.indexOf(card);
						if (index != -1) {
							cards.splice(index, 1);
						}
						await player.chooseUseTarget(card, true);
					}
				},
			},
		},
	}
```

### nsdingbian 名字:定边
描述: 锁定技。当你于回合内使用锦囊牌或装备牌后，你令自己本回合的手牌上限-1且选择一项：⒈从牌堆获得一张基本牌。⒉令一种基本牌于本回合内不计入手牌上限。
```js
nsdingbian: {
		trigger: { player: "useCard" },
		forced: true,
		filter(event, player) {
			if (player != _status.currentPhase) {
				return false;
			}
			return get.type(event.card) != "basic";
		},
		async content(event, trigger, player) {
			let result;

			player.addTempSkill("nsdingbian_mark");
			player.addMark("nsdingbian_mark", 1, false);

			const storage = player.getStorage("nsdingbian_ignore");
			let goon = false;
			for (const name of lib.inpile) {
				if (get.type(name) == "basic" && !storage.includes(name)) {
					goon = true;
					break;
				}
			}

			if (goon) {
				result = await player
					.chooseControl()
					.set("choiceList", ["从牌堆中获得一张基本牌", "令一种基本牌于本回合内不计入手牌上限"])
					.set("prompt", "定边：请选择一项")
					.set("ai", () => {
						const player = _status.event.player;
						const list = ["tao", "shan"];
						const list2 = player.getStorage("nsdingbian_ignore");
						list.removeArray(list2);
						if (!list.length) {
							return 0;
						}
						const num1 = player.countCards("hs", card => {
							return get.type(card) != "basic" && player.hasValueTarget(card, null, true);
						});
						const num2 = player.getHandcardLimit();
						if (player.countCards("h", list) <= num2 - num1) {
							return 0;
						}
						return 1;
					})
					.forResult();
			} else {
				result = { index: 0 };
			}

			if (result.index == 0) {
				const card = get.cardPile2(card => get.type(card, null, false) == "basic");
				if (card) {
					await player.gain(card, "gain2");
				}
				return;
			}

			const list = [];
			const storage2 = player.getStorage("nsdingbian_ignore");
			for (const name of lib.inpile) {
				if (get.type(name) == "basic" && !storage2.includes(name)) {
					list.push(name);
				}
			}

			result = await player
				.chooseButton(["令一种基本牌于本回合内不计入手牌上限", [list, "vcard"]], true)
				.set("ai", button => {
					const name = button.link[2];
					const player = _status.event.player;
					if (name == "sha") {
						return 0;
					}
					const cards = player.getCards("h", name);
					if (!cards.length) {
						return 0;
					}
					return get.value(cards, player);
				})
				.forResult();

			if (result.bool && result.links?.length) {
				player.markAuto("nsdingbian_ignore", [result.links[0][2]]);
			}
		},
		subSkill: {
			mark: {
				onremove(player) {
					delete player.storage.nsdingbian_mark;
					delete player.storage.nsdingbian_ignore;
				},
				mod: {
					maxHandcard: (player, num) => num - player.countMark("nsdingbian_mark"),
					ignoredHandcard(card, player) {
						if (player.getStorage("nsdingbian_ignore").includes(get.name(card, player))) {
							return true;
						}
					},
					cardDiscardable(card, player, name) {
						if (name == "phaseDiscard" && player.getStorage("nsdingbian_ignore").includes(get.name(card, player))) {
							return false;
						}
					},
				},
				intro: { content: "手牌上限-#" },
			},
		},
	}
```

## prp_zhugeliang 名字:派对浪客 势力:shu

### nsxingyun 名字:星陨
描述: 每回合限一次。你可以将一张手牌当做任意一张符合“四象天阵”的牌使用。然后若这两张牌的类型不同，则你删除此“四象天阵”并摸两张牌。当你删除“四象天阵”中的最后一个项目后，你获得技能〖八阵〗。
```js
nsxingyun: {
		audio: 2,
		enable: "chooseToUse",
		getSixiang(card) {
			if (typeof card == "string") {
				card = { name: card };
			}
			if (card.name == "shan") {
				return "玄武";
			}
			var type = get.type(card, null, false);
			if (type == "delay") {
				return "朱雀";
			}
			if (get.tag(card, "damage")) {
				return "白虎";
			}
			if (get.tag(card, "recover")) {
				return "玄武";
			}
			if (type == "trick") {
				return "青龙";
			}
			return false;
		},
		filter(event, player) {
			if (player.hasSkill("nsxingyun_round")) {
				return false;
			}
			var list = player.getStorage("nsxingyun");
			if (list.length >= 4) {
				return false;
			}
			for (var i of lib.inpile) {
				var type = lib.skill.nsxingyun.getSixiang(i);
				if (!type || list.includes(type)) {
					continue;
				}
				if (event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) {
					return true;
				}
				if (i == "sha") {
					for (var j of lib.inpile_nature) {
						if (event.filterCard(get.autoViewAs({ name: i, nature: j }, "unsure"), player, event)) {
							return true;
						}
					}
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				var map = { 青龙: [], 朱雀: [], 白虎: [], 玄武: [] };
				var list = player.getStorage("nsxingyun");
				for (var i of lib.inpile) {
					var type = lib.skill.nsxingyun.getSixiang(i);
					if (!type || list.includes(type)) {
						continue;
					}
					if (event.filterCard({ name: i }, player, event)) {
						map[type].push([get.type2(i, false), "", i]);
					}
					if (i == "sha") {
						for (var j of lib.inpile_nature) {
							if (event.filterCard({ name: i, nature: j }, player, event)) {
								map[type].push([get.type2(i, false), "", i, j]);
							}
						}
					}
				}
				var dialog = ["星陨", "hidden"];
				for (var i in map) {
					if (map[i].length > 0) {
						dialog.push('<div class="text center">' + i + "</div>");
						dialog.push([map[i], "vcard"]);
					}
				}
				return ui.create.dialog.apply(ui.create, dialog);
			},
			filter(button, player) {
				return _status.event.getParent().filterCard(
					{
						name: button.link[2],
						nature: button.link[3],
					},
					player,
					_status.event.getParent()
				);
			},
			check(button) {
				if (_status.event.getParent().type != "phase") {
					return 1;
				}
				return _status.event.player.getUseValue(
					{
						name: button.link[2],
						nature: button.link[3],
					},
					false
				);
			},
			backup(links, player) {
				return {
					selectCard: 1,
					filterCard: true,
					popname: true,
					position: "hs",
					check(card) {
						return 7 - get.value(card);
					},
					viewAs: { name: links[0][2], nature: links[0][3] },
					async precontent(event, trigger, player) {
						player.addTempSkill("nsxingyun_round");
					},
				};
			},
			prompt(links, player) {
				return "将一张手牌当做" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
			},
		},
		ai: {
			threaten: 2.6,
			order: 1,
			result: { player: 1 },
		},
		group: "nsxingyun_clear",
		derivation: ["nsxingyun_faq", "bazhen"],
		subSkill: {
			backup: {},
			clear: {
				trigger: { player: "useCardAfter" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.skill == "nsxingyun_backup" && event.cards.length == 1 && lib.skill.nsxingyun.getSixiang(event.card) != lib.skill.nsxingyun.getSixiang(event.cards[0]) && !player.getStorage("nsxingyun").includes(lib.skill.nsxingyun.getSixiang(event.card));
				},
				async content(event, trigger, player) {
					await player.draw({ num: 2 });
					player.markAuto("nsxingyun", [lib.skill.nsxingyun.getSixiang(trigger.card)]);
					if (player.getStorage("nsxingyun").length >= 4) {
						await player.addSkills("bazhen");
					}
				},
			},
			round: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

### nshanlang 名字:酣浪
描述: 准备阶段，你可以和至多三名角色拼点。然后若这些角色中有拼点牌唯一最大的角色，则你可以令该角色从牌堆中获得一张不符合“四象天阵”的牌。
```js
nshanlang: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(current => player != current && player.canCompare(current));
		},
		async cost(event, trigger, player) {
			const goon = player.hasCard(function (card) {
				return get.value(card) <= 7;
			}, "h");
			event.result = await player
				.chooseTarget([1, 3], get.prompt(event.skill), "和至多三名角色进行拼点", function (card, player, target) {
					return target != player && player.canCompare(target);
				})
				.set("ai", function (target) {
					if (!_status.event.goon) {
						return false;
					}
					var att = get.attitude(_status.event.player, target);
					if (att >= 0) {
						return 0;
					}
					if (target.hasSkillTag("noh")) {
						att /= 3;
					}
					return -att / Math.sqrt(target.countCards("h"));
				})
				.set("goon", goon)
				.forResult();
		},
		async content(event, trigger, player) {
			const { targets } = event;
			let result;

			event.max_num = 0;
			targets.sortBySeat();

			const next = player.chooseToCompare(targets);
			next.callback = lib.skill.nshanlang.callback;
			await next;

			if (!event.target) {
				return;
			}

			const target = event.target;
			result = await player
				.chooseBool("是否令" + get.translation(target) + "获得一张牌？")
				.set("goon", get.attitude(player, target) > 0)
				.set("ai", () => _status.event.goon)
				.forResult();

			if (result.bool) {
				const card = get.cardPile2(card => {
					return !lib.skill.nsxingyun.getSixiang(card);
				});
				if (card) {
					await target.gain(card, "gain2");
				}
			}
		},
		async callback(event, trigger, player) {
			const { target } = event;
			var list = [
					[player, event.num1],
					[target, event.num2],
				],
				evt = event.getParent(2);
			for (var i of list) {
				if (i[1] > evt.max_num) {
					evt.max_num = i[1];
					evt.target = i[0];
				} else if (evt.target && i[1] == evt.max_num && i[0] != evt.target) {
					delete evt.target;
				}
			}
		},
	}
```

## ns_zhangwei 名字:张葳 势力:shu

### nsqiyue 名字:骑钺
描述: 锁定技，当有角色的武将牌状态改变后，你摸一张牌。
```js
nsqiyue: {
		trigger: {
			global: ["turnOverEnd", "linkEnd", "showCharacterEnd", "hideCharacterEnd", "removeCharacterEnd"],
		},
		forced: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	}
```

### nsxuezhu 名字:血逐
描述: 当你受到伤害或造成伤害后，你可以令受到伤害的角色摸两张牌并翻面。
```js
nsxuezhu: {
		trigger: { player: "damageEnd", source: "damageSource" },
		filter(event, player) {
			return event.player.isIn();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await trigger.player.draw(2);
			await trigger.player.turnOver();
		},
		check(event, player) {
			return !event.player.isTurnedOver() || get.attitude(player, event.player) > 0;
		},
	}
```

## diy_wenyang 名字:文鸯 势力:wei

### lvli
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### choujue
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ns_zuoci 名字:左慈 势力:qun

### nsxinsheng 名字:新生
描述: 每当你对其他角色造成伤害后，若你未受伤，则你可以增加X点体力上限并摸X张牌，X为伤害点数。
```js
nsxinsheng: {
		trigger: { source: "damageEnd" },
		frequent: true,
		filter(event, player) {
			return player.isHealthy();
		},
		async content(event, trigger, player) {
			player.gainMaxHp(trigger.num, true);
			player.draw(trigger.num);
		},
	}
```

### nsdunxing 名字:遁形
描述: 每当你即将受到其他角色造成的伤害时，若你已受伤，则你可以防止此伤害，改为失去X点体力上限并摸X张牌，X为伤害点数。
```js
nsdunxing: {
		trigger: { player: "damageBefore" },
		filter(event, player) {
			return player.isDamaged();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.loseMaxHp(trigger.num, true);
			player.draw(trigger.num);
		},
	}
```

## ns_lvzhi 名字:吕后 势力:qun

### nsnongquan 名字:弄权
描述: 出牌阶段，你可以将最后一张手牌当作【无中生有】使用。
```js
nsnongquan: {
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("h") == 1 && player.canUse("wuzhong", player);
		},
		direct: true,
		delay: 0,
		async content(event, trigger, player) {
			player.useCard({ name: "wuzhong" }, player.getCards("h"), player, "nsnongquan");
		},
		ai: {
			order: 10,
			result: {
				player(player, target) {
					return 10 - get.value(player.getCards("h")[0]);
				},
			},
		},
	}
```

### nsdufu 名字:毒妇
描述: 每当你即将造成一次伤害时，你可以为此伤害重新指定伤害来源。
```js
nsdufu: {
		trigger: { source: "damageBefore" },
		check(event, player) {
			return event.player.hasSkillTag("maixie");
		},
		direct: true,
		async content(event, trigger, player) {
			let result;

			// step 0
			result = await player
				.chooseTarget(get.prompt2("nsdufu"), (card, player, target) => {
					return target != player;
				})
				.set("ai", target => {
					if (_status.event.bool) {
						return -get.attitude(_status.event.player, target);
					}
					return 0;
				})
				.set("bool", trigger.player.hasSkillTag("maixie_defend"))
				.forResult();

			// step 1
			if (result.bool && result.targets?.length) {
				player.logSkill("nsdufu", result.targets);
				trigger.source = result.targets[0];
			}
		},
	}
```

## ns_wangyun 名字:王允 势力:qun

### liangji 名字:环计
描述: 出牌阶段限一次，你可以选择一名未以此法放置牌的其他角色并将一张手牌置于其武将牌上。目标角色于摸牌阶段开始时，获得此牌。若其为男性角色，则获得技能〖无双〗，若其为女性角色，则获得技能〖离间〗，直到回合结束。
```js
liangji: {
		audio: ["liangji", 2],
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && !target.hasSkill("liangji_1");
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await player
				.chooseCard("h", "环计：将一张牌置于" + get.translation(target) + "的武将牌上", true)
				.set("ai", function (card) {
					if (get.attitude(_status.event.player, _status.event.getParent().player) > 0) {
						return 7 - get.value(card);
					}
					return -get.value(card);
				})
				.forResult();
			if (result.bool) {
				player.$give(result.cards, target);
				await player.lose(result.cards, ui.special);
				target.storage.liangji_1 = result.cards;
				target.storage.liangji_1_source = target;
				target.syncStorage("liangji_1");
				target.addSkill("liangji_1");
			}
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					if (get.attitude(player, target) > 0) {
						return Math.sqrt(target.countCards("he"));
					}
					return 0;
				},
				player: 1,
			},
		},
		subSkill: {
			1: {
				trigger: {
					player: "phaseDrawBegin",
				},
				forced: true,
				mark: true,
				intro: {
					content: "cards",
				},
				async content(event, trigger, player) {
					const cards = player.storage.liangji_1;
					if (cards) {
						await player.gain(cards, "gain2");
					}
					player.storage.liangji_1 = 0;
					if (player.sex == "male") {
						player.addTempSkill("wushuang");
					}
					if (player.sex == "female") {
						player.addTempSkill("lijian");
					}
					player.removeSkill("liangji_1");
				},
				sub: true,
			},
		},
	}
```

### jugong 名字:居功
描述: 回合外每名角色的回合限一次，每当场上有角色因受到【杀】或【决斗】造成的伤害，你可以摸一张牌并且将一张手牌置于你的武将牌上，称之为“功”。在你即将受到伤害时，你可以弃置两张“功”，防止此伤害。
```js
jugong: {
		audio: ["jingong", 2],
		trigger: {
			global: "damageEnd",
		},
		usable: 1,
		frequent: true,
		marktext: "功",
		init(player) {
			player.storage.jugong = [];
		},
		filter(event, player) {
			return event.card && (event.card.name == "sha" || event.card.name == "juedou") && event.notLink() && _status.currentPhase != player;
		},
		async content(event, trigger, player) {
			await player.draw();
			if (!player.countCards("h")) return;
			const result = await player.chooseCard("将" + get.cnNumber(1) + "张手牌置于武将牌上作为”功”", 1, true).forResult();
			if (result.cards && result.cards.length) {
				await player.lose(result.cards, ui.special);
				player.storage.jugong = player.storage.jugong.concat(result.cards);
				player.syncStorage("jugong");
				player.markSkill("jugong");
				game.log(player, "将", result.cards, "置于武将牌上作为”功”");
			}
		},
		intro: {
			content: "cards",
		},
		group: "jugong_1",
		subSkill: {
			1: {
				trigger: {
					player: "damageBegin",
				},
				filter(event, player) {
					return player.storage.jugong.length > 1;
				},
				async content(event, trigger, player) {
					let result;

					// step 0
					result = await player.chooseCardButton("移去两张“功”", 2, player.storage.jugong, true).forResult();

					// step 1
					if (event.directresult || result.bool) {
						player.logSkill("jugong");
						const links = event.directresult || result.links;
						for (const link of links) {
							player.storage.jugong.remove(link);
						}
						player.syncStorage("jugong");
						if (!player.storage.jugong.length) {
							player.unmarkSkill("jugong");
						} else {
							player.markSkill("jugong");
						}
						player.$throw(links);
						game.log(player, "被移去了", links);
						for (const link of links) {
							ui.discardPile.appendChild(link);
						}
					}

					// step 2
					trigger.cancel();
				},
				sub: true,
			},
		},
		ai: {
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
						if (!target.hasSkill("paiyi") && target.hp > 1) {
							return [0.5, get.tag(card, "damage") * 1.5];
						}
						if (target.hp == 3) {
							return [0.5, get.tag(card, "damage") * 0.2];
						}
						if (target.hp == 2) {
							return [0.1, get.tag(card, "damage") * 0.1];
						}
					}
				},
			},
		},
	}
```

### chengmou 名字:逞谋
描述: 摸牌阶段开始时，若你有“功”牌，你获得之并跳过摸牌阶段，若你所获得的“功”牌多于两张，你须失去1点体力。
```js
chengmou: {
		audio: ["moucheng", 2],
		trigger: {
			player: "phaseDrawBegin",
		},
		frequent: true,
		filter(event, player) {
			return player.storage.jugong.length > 0;
		},
		async content(event, trigger, player) {
			// step 0
			if (player.storage.jugong.length > 2) {
				await player.loseHp();
			}

			// step 1
			const cards = player.storage.jugong;
			if (cards) {
				await player.gain(cards, "gain2");
			}
			player.storage.jugong = [];

			// step 2
			trigger.cancel();
		},
		ai: {
			combo: "jugong",
		},
	}
```

## ns_nanhua 名字:南华 势力:qun

### nshuanxian 名字:幻仙
描述: 锁定技，游戏开始时，你获得随从“幻身·右”，当你首次受到伤害时，你获得随从“幻身·左”（体力上限2，初始手牌2）；你与幻身在摸牌阶段均少摸一张牌；在你的回合中（如果有对应幻身），你以【幻身·左-本体-幻身·右】的顺序进行3个连续回合。
```js
nshuanxian: {
		trigger: { global: "gameStart", player: "enterGame" },
		forced: true,
		nosub: true,
		unique: true,
		group: ["nshuanxian_left", "nshuanxian_right", "nshuanxian_damage", "nshuanxian_swap", "nshuanxian_draw"],
		async content(event, trigger, player) {
			player.storage.nshuanxian_right = player.addSubPlayer({
				name: "ns_nanhua_right",
				skills: ["nshuanxian_left", "nshuanxian_draw", "nshuanxian_swap"],
				hp: 2,
				maxHp: 2,
				hs: get.cards(2),
				skill: "nshuanxian",
				intro: "你的本体回合结束后，切换至此随从并进行一个额外的回合；若你的上家与下家不同，在你的下家的准备阶段，切换至此随从",
				intro2: "当前回合结束后切换回本体",
				onremove(player) {
					delete player.storage.nshuanxian_right;
				},
			});
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
						if (!target.hasFriend()) {
							return;
						}
						if (target.hp <= 2) {
							return;
						}
						if (!target.storage.nshuanxian_damage) {
							if (get.attitude(player, target) < 0 || get.tag(card, "multineg")) {
								return [0, 1];
							}
							return [1, 1];
						}
					}
				},
			},
		},
		subSkill: {
			chosen: {},
			leftdist: {
				mod: {
					globalFrom(from, to, distance) {},
					globalTo(from, to, distance) {},
				},
			},
			rightdist: {
				mod: {
					globalFrom(from, to, distance) {},
					globalTo(from, to, distance) {},
				},
			},
			swap: {
				trigger: { global: "phaseBegin" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.player != player;
				},
				priority: 20,
				async content(event, trigger, player) {
					const { step, source, target, targets, card, cards, skill, forced, num } = event;
					let result;
					const next = player.getNext();
					const prev = player.getPrevious();
					const left = player.storage.nshuanxian_left;
					const right = player.storage.nshuanxian_right;
					if (prev == next || (trigger.player != next && trigger.player != prev)) {
						if (player.hasSkill("subplayer")) {
							player.exitSubPlayer();
						}
					} else if (prev == trigger.player && player.name != left && left) {
						if (!player.hasSkill("subplayer")) {
							player.callSubPlayer(left);
						} else {
							player.toggleSubPlayer(left);
						}
					} else if (next == trigger.player && player.name != right && right) {
						if (!player.hasSkill("subplayer")) {
							player.callSubPlayer(right);
						} else {
							player.toggleSubPlayer(right);
						}
					}
				},
			},
			damage: {
				trigger: { player: "damageEnd" },
				forced: true,
				filter(event, player) {
					return !player.storage.nshuanxian_damage;
				},
				async content(event, trigger, player) {
					player.storage.nshuanxian_damage = true;
					player.storage.nshuanxian_left = player.addSubPlayer({
						name: "ns_nanhua_left",
						skills: ["nshuanxian_middle", "nshuanxian_draw", "nshuanxian_swap"],
						hp: 2,
						maxHp: 2,
						hs: get.cards(2),
						skill: "nshuanxian",
						intro: "你的本体回合开始前，切换至此随从并进行一个额外的回合；若你的上家与下家不同，在你的上家的准备阶段，切换至此随从",
						intro2: "当前回合结束后切换回本体",
						onremove(player) {
							delete player.storage.nshuanxian_left;
						},
					});
					trigger.nshuanxian = true;
				},
			},
			draw: {
				trigger: { player: "phaseDrawBegin" },
				silent: true,
				filter(event) {
					return event.num > 0;
				},
				async content(event, trigger, player) {
					trigger.num--;
				},
			},
			left: {
				trigger: { player: "phaseBefore" },
				forced: true,
				popup: false,
				priority: 40,
				filter(event, player) {
					if (event.skill == "nshuanxian_middle") {
						return false;
					}
					if (event.skill == "nshuanxian_right") {
						return false;
					}
					var left = player.storage.nshuanxian_left;
					if (player.hasSkill("subplayer")) {
						if (!left) {
							return player.name == player.storage.nshuanxian_right;
						}
						return player.storage.subplayer.skills.includes(left);
					} else {
						if (!left) {
							return false;
						}
						return player.hasSkill(left);
					}
				},
				async content(event, trigger, player) {
					if (player.hasSkill("subplayer")) {
						var left = player.storage.nshuanxian_left;
						if (left && player.storage.subplayer.skills.includes(left)) {
							player.toggleSubPlayer(player.storage.nshuanxian_left);
						} else {
							player.exitSubPlayer();
						}
					} else {
						player.callSubPlayer(player.storage.nshuanxian_left);
					}
				},
			},
			middle: {
				trigger: { player: ["phaseAfter", "phaseCancelled"] },
				forced: true,
				popup: false,
				priority: -40,
				filter(event, player) {
					if (player.hasSkill("nshuanxian_chosen")) {
						return false;
					}
					return true;
				},
				async content(event, trigger, player) {
					await player.exitSubPlayer();
					player.insertPhase(null, true);
				},
			},
			right: {
				trigger: { player: ["phaseAfter", "phaseCancelled"] },
				forced: true,
				popup: false,
				priority: -40,
				filter(event, player) {
					if (player.hasSkill("nshuanxian_chosen")) {
						return false;
					}
					if (player.hasSkill("subplayer")) {
						return false;
					}
					var right = player.storage.nshuanxian_right;
					if (!right) {
						return false;
					}
					return player.hasSkill(right);
				},
				async content(event, trigger, player) {
					player.callSubPlayer(player.storage.nshuanxian_right);
					player.insertPhase(null, true);
					player.addTempSkill("nshuanxian_chosen", ["phaseBegin", "phaseCancelled"]);
				},
			},
			end: {
				trigger: { player: ["phaseAfter", "phaseCancelled"] },
				forced: true,
				popup: false,
				priority: -40,
				filter(event, player) {
					if (player.hasSkill("nshuanxian_chosen")) {
						return false;
					}
					return true;
				},
				async content(event, trigger, player) {
					if (player.hasSkill("subplayer")) {
						player.exitSubPlayer();
					}
				},
				// 理论上我可以不改，但我不想格式化后还得正则替换，于是交给GPT-5 mini了，因为免费
				async content_old(event, trigger, player) {
					let result;

					const controls = ["本体"];
					const left = player.storage.nshuanxian_left;
					const right = player.storage.nshuanxian_right;
					if (player.hasSkill("subplayer")) {
						if (player.storage.subplayer.skills.includes(left)) {
							controls.unshift("幻身·左");
						}
						if (player.storage.subplayer.skills.includes(right)) {
							controls.push("幻身·右");
						}
					} else {
						if (player.hasSkill(left)) {
							controls.unshift("幻身·左");
						}
						if (player.hasSkill(right)) {
							controls.push("幻身·右");
						}
					}

					if (controls.length > 1) {
						result = await player
							.chooseControl(controls)
							.set("prompt", "选择一个形态直到下一回合开始")
							.set("ai", () => Math.floor(Math.random() * _status.event.num))
							.set("num", controls.length)
							.forResult();
					} else {
						return;
					}

					switch (result.control) {
						case "幻身·左": {
							if (!player.hasSkill("subplayer")) {
								player.callSubPlayer(player.storage.nshuanxian_left);
							} else {
								player.toggleSubPlayer(player.storage.nshuanxian_left);
							}
							break;
						}
						case "幻身·右": {
							if (!player.hasSkill("subplayer")) {
								player.callSubPlayer(player.storage.nshuanxian_right);
							}
							break;
						}
						default: {
							if (player.hasSkill("subplayer")) {
								player.exitSubPlayer();
							}
							break;
						}
					}

					player.addTempSkill("nshuanxian_chosen", "phaseBegin");
				},
			},
		},
	}
```

### nstaiping_nh 名字:太平
描述: 当你受到1点伤害后（首次伤害除外），你可以选择一项: ①令一个“幻身”增加1点体力上限。②令一个“幻身”回复1点体力。
```js
nstaiping_nh: {
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return !event.nshuanxian && player.getSubPlayers("nshuanxian").length && event.num > 0;
		},
		getIndex: event => event.num,
		priority: -0.1,
		async cost(event, trigger, player) {
			const left = player.storage.nshuanxian_left;
			const right = player.storage.nshuanxian_right;
			const list = [];
			let choice = 0;
			let hpleft = 0;
			let maxleft = 0;
			if (left && player.hasSkill(left)) {
				if (player.storage[left].hp < player.storage[left].maxHp) {
					list.push("令幻身·左回复1点体力");
					hpleft = player.storage[left].hp;
				}
				list.push("令幻身·左增加1点体力上限");
				maxleft = player.storage[left].hp;
			}
			if (left && player.hasSkill(right)) {
				if (player.storage[right].hp < player.storage[right].maxHp) {
					list.push("令幻身·右回复1点体力");
					if (!hpleft || player.storage[right].hp < hpleft || (player.storage[right].hp == hpleft && Math.random() < 0.5)) {
						choice = list.length - 1;
					}
				}
				list.push("令幻身·右增加1点体力上限");
				if (!hpleft && maxleft && choice == 0) {
					if (player.storage[right].maxHp < maxleft || (player.storage[right].maxHp == maxleft && Math.random() < 0.5)) {
						choice = list.length - 1;
					}
				}
			}
			if (!list.length) {
				return;
			}
			let map = {};
			for (var i = 0; i < list.length; i++) {
				map["选项" + get.cnNumber(i + 1, true)] = list[i];
			}
			const result = await player
				.chooseControlList(list, () => get.event().choice)
				.set("prompt", get.prompt(event.skill))
				.set("choice", choice)
				.forResult();
			event.result = {
				bool: result.control != "cancel2",
				cost_data: {
					control: result.control,
					map: map,
				},
			};
		},
		async content(event, trigger, player) {
			const {
				cost_data: { control, map },
			} = event;
			const left = player.storage.nshuanxian_left;
			const right = player.storage.nshuanxian_right;
			switch (map[control]) {
				case "令幻身·左回复1点体力":
					player.storage[left].hp++;
					break;
				case "令幻身·左增加1点体力上限":
					player.storage[left].maxHp++;
					break;
				case "令幻身·右回复1点体力":
					player.storage[right].hp++;
					break;
				case "令幻身·右增加1点体力上限":
					player.storage[right].maxHp++;
					break;
			}
			game.log(player, map[control].replace(/一/, "了一"));
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			combo: "nshuanxian",
		},
	}
```

### nsshoudao 名字:授道
描述: 当左右“幻身”全部死亡时，你获得技能“雷击”和“鬼道”。当你死亡时，若此时有两个“幻身”，你可以令一名其他角色获得技能“雷击”和“鬼道”。若有一个“幻身”，你可以令一名其他角色获得技能“雷击”或“鬼道”。(杀死你的角色除外)
```js
nsshoudao: {
		group: ["nsshoudao_gain", "nsshoudao_die"],
		subSkill: {
			gain: {
				trigger: { player: "subPlayerDie" },
				forced: true,
				filter(event, player) {
					const left = player.storage.nshuanxian_left;
					if (left && player.hasSkill(left)) {
						return false;
					}
					const right = player.storage.nshuanxian_right;
					if (right && player.hasSkill(right)) {
						return false;
					}
					if (!player.storage.nshuanxian_damage) {
						return false;
					}
					return true;
				},
				async content(event, trigger, player) {
					await player.addSkills(["releiji", "guidao"]);
				},
			},
			die: {
				trigger: { player: "die" },
				filter(event, player) {
					if (!game.hasPlayer(current => player != current && player != event.source)) {
						return false;
					}
					const left = player.storage.nshuanxian_left;
					if (left && player.hasSkill(left)) {
						return true;
					}
					const right = player.storage.nshuanxian_right;
					if (right && player.hasSkill(right)) {
						return true;
					}
					return false;
				},
				skillAnimation: true,
				animationColor: "wood",
				forceDie: true,
				async cost(event, trigger, player) {
					const { source } = trigger;
					let str;
					const left = player.storage.nshuanxian_left;
					const right = player.storage.nshuanxian_right;
					if (left && player.hasSkill(left) && right && player.hasSkill(right)) {
						str = "令一名其他角色获得技能【雷击】和【鬼道】";
					} else {
						str = "令一名其他角色获得技能【雷击】或【鬼道】";
					}
					if (source) {
						str += "（" + get.translation(source) + "除外）";
					}
					event.result = await player
						.chooseTarget(
							(card, player, target) => {
								return target != player && target != _status.event.source;
							},
							get.prompt(event.name.slice(0, -5))
						)
						.set("ai", target => {
							if (target.hasSkill("releiji")) {
								return 0;
							}
							return get.attitude(get.player(), target);
						})
						.set("source", source)
						.set("prompt2", str)
						.set("forceDie", true)
						.forResult();
				},
				async content(event, trigger, player) {
					const {
						targets: [target],
					} = event;
					const left = player.storage.nshuanxian_left;
					const right = player.storage.nshuanxian_right;
					if (left && player.hasSkill(left) && right && player.hasSkill(right)) {
						await target.addSkills(["releiji", "guidao"]);
					} else {
						const { control } = await player
							.chooseControl("releiji", "guidao")
							.set("prompt", `令${get.translation(target)}获得一项技能`)
							.forResult();
						await target.addSkills(control);
					}
				},
			},
		},
		ai: { combo: "nshuanxian" },
	}
```

## ns_nanhua_left 名字:幻身·左 势力:qun

## ns_nanhua_right 名字:幻身·右 势力:qun

## ns_huamulan 名字:SP花木兰 势力:qun

### nscongjun 名字:从军
描述: 锁定技，游戏开始时，你变身为一名随机男性角色；当一名敌方角色使用无懈可击时，你有小概率亮出此武将并变回花木兰，然后对该角色造成2点伤害。
```js
nscongjun: {
		forbid: ["guozhan"],
		unique: true,
		forceunique: true,
		locked: true,
		init(player) {
			if (player.storage.nscongjun_show || ![player.name1, player.name2].includes("ns_huamulan")) {
				return false;
			}
			var change = function (target) {
				if (target == player) {
					var list;
					if (_status.connectMode) {
						list = get.charactersOL(function (i) {
							return lib.character[i][0] != "male";
						});
					} else {
						list = get.gainableCharacters(function (info) {
							return info[0] == "male";
						});
					}
					var name = list.randomGet();
					target.reinit("ns_huamulan", name, "nosmooth");
					target.storage.nscongjun_show = name;
					target.addSkill("nscongjun_show");
					player._inits.remove(change);
					player.hp = player.maxHp;
					player.update();
				}
			};
			if (!player._inits) {
				player._inits = [];
			}
			player._inits.push(change);
		},
		subSkill: {
			show: {
				trigger: { global: "useCard" },
				filter(event, player) {
					return player.storage.nscongjun_show && event.card.name == "wuxie" && event.getRand() < 0.1 && player.getEnemies().includes(event.player);
				},
				direct: true,
				skillAnimation: true,
				animationColor: "thunder",
				async content(event, trigger, player) {
					let result;
					// step 0
					await game.delay(0.5);
					// step 1
					player.reinit(player.storage.nscongjun_show, "ns_huamulan", "nosmooth");
					player.logSkill("nscongjun_show");
					// step 2
					player.removeSkill("nscongjun_show");
					player.line(trigger.player, "green");
					await trigger.player.damage(2);
				},
			},
		},
	}
```

### xiaoji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### gongji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ns_huangzu 名字:黄祖 势力:qun

### nsjihui 名字:急恚
描述: 锁定技，每当一名角色一次弃置了三张或更多的牌，你获得一个额外回合；你的额外回合内，你使用牌只能指定你与上一回合角色为目标。
```js
nsjihui: {
		trigger: { global: "discardAfter" },
		filter(event, player) {
			return event.cards.length >= 3;
		},
		forced: true,
		async content(event, trigger, player) {
			player.insertPhase();
			player.storage.nsjihui_use = _status.currentPhase;
			player.addSkill("nsjihui_use");
		},
		subSkill: {
			use: {
				mark: "character",
				intro: {
					content: "使用牌只能指定自己与$为目标",
				},
				trigger: { player: "phaseAfter" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.skill == "nsjihui";
				},
				onremove: true,
				async content(event, trigger, player) {
					player.removeSkill("nsjihui_use");
				},
				mod: {
					playerEnabled(card, player, target) {
						if (player != target && player.storage.nsjihui_use != target) {
							return false;
						}
					},
				},
			},
		},
	}
```

### nsmouyun 名字:谋运
描述: 每两轮限一次，你可以弃置场上体力值最少的一名其他角色区域内的X张牌。（X为其损失的体力值）
```js
nsmouyun: {
		enable: "phaseUse",
		round: 2,
		filterTarget(card, player, target) {
			return target.isMinHp() && target != player && target.isDamaged();
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (target.isDamaged()) {
				await player.discardPlayerCard(target, "hej", target.maxHp - target.hp, true);
			}
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					return target.hp - target.maxHp;
				},
			},
		},
	}
```

## ns_jinke 名字:荆轲 势力:qun

### nspinmin 名字:拼命
描述: 锁定技，当你于回合内死亡时，你不死亡并增加1点体力上限（每回合最多增加1点且不能超过4）；当你于回合外死亡时，你不死亡并减少1点体力上限（体力上限为0会导致你死亡）。
```js
nspinmin: {
		trigger: { player: "dieBefore" },
		forced: true,
		filter(event, player) {
			return player.maxHp > 0 && event.getParent().name != "giveup";
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.hp = 1;
			player.update();
			if (_status.currentPhase == player) {
				const num = 4;
				if (!player.hasSkill("nspinmin_used") && player.maxHp < num) {
					player.gainMaxHp(true);
					player.addTempSkill("nspinmin_used");
				}
			} else {
				await player.loseMaxHp(true);
			}
		},
		subSkill: {
			used: {},
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (get.tag(card, "save")) {
						if (_status.currentPhase == player) {
							return 0;
						}
						if (target.maxHp > 1 && player != target) {
							return 0;
						}
					}
					if (get.tag(card, "recover")) {
						if (_status.currentPhase == player) {
							return 0;
						}
					}
				},
			},
		},
	}
```

### nsshishou 名字:失手
描述: 锁定技，当你于回合内失去手牌时，你失去1点体力并摸一张牌；你回合内使用的牌数不能超过4。
```js
nsshishou: {
		trigger: { player: "loseEnd" },
		forced: true,
		filter(event, player) {
			if (_status.currentPhase != player) {
				return false;
			}
			for (var i = 0; i < event.cards.length; i++) {
				if (event.cards[i].original == "h") {
					return true;
				}
			}
			return false;
		},
		async content(event, trigger, player) {
			await player.loseHp();
			await player.draw();
		},
		group: "nsshishou_use",
		subSkill: {
			use: {
				mod: {
					cardEnabled(card, player) {
						if (_status.currentPhase != player) {
							return;
						}
						if (get.cardCount(true, player) >= 4) {
							return false;
						}
					},
				},
			},
		},
		ai: {
			neg: true,
		},
	}
```

## ns_yanliang 名字:颜良 势力:qun

### nsduijue 名字:对决
描述: 出牌阶段开始时，你可以弃置一张手牌，若如此做，此阶段你可以将一张与此牌颜色不同的手牌当作【决斗】使用（限2次）。
```js
nsduijue: {
		trigger: { player: "phaseUseBegin" },
		direct: true,
		filter(event, player) {
			return player.countCards("h");
		},
		async content(event, trigger, player) {
			const color = {
				black: player.countCards("h", card => {
					return get.color(card) == "red" && get.value(card) < 8;
				}),
				red: player.countCards("h", card => {
					return get.color(card) == "black" && get.value(card) < 8;
				}),
			};
			let result;
			result = await player
				.chooseToDiscard(get.prompt2("nsduijue"))
				.set("ai", function (card) {
					const num = _status.event.color[get.color(card)];
					if (_status.event.goon && num >= 1) {
						return 7 + num - get.value(card);
					}
				})
				.set(
					"goon",
					game.hasPlayer(current => {
						return get.effect(current, { name: "juedou" }, player, player) > 0;
					})
				)
				.set("color", color)
				.set("logSkill", "nsduijue")
				.forResult();
			if (result.bool) {
				player.addTempSkill("nsduijue_use", "phaseUseAfter");
				player.storage.nsduijue_use = get.color(result.cards[0]);
			}
		},
		subSkill: {
			use: {
				enable: "phaseUse",
				viewAs: { name: "juedou" },
				usable: 2,
				filter(event, player) {
					return player.hasCard(function (card) {
						return get.color(card) != player.storage.nsduijue_use;
					}, "hs");
				},
				position: "hs",
				filterCard(card, player) {
					return get.color(card) != player.storage.nsduijue_use;
				},
				check(card) {
					return 8 - get.value(card);
				},
				ai: {
					basic: {
						order: 10,
					},
				},
			},
		},
	}
```

### nsshuangxiong 名字:双雄
描述: 当你使用【决斗】或被使用【决斗】时，你可以将武将牌翻面。
```js
nsshuangxiong: {
		trigger: { player: "juedouBegin", target: "juedouBegin" },
		check(event, player) {
			return player.isTurnedOver();
		},
		async content(event, trigger, player) {
			await player.turnOver();
		},
		ai: { combo: "nsduijue" },
	}
```

### dualside
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ns_wenchou 名字:文丑 势力:qun

### nsguanyong 名字:冠勇
描述: 你可以将一张手牌当【杀】打出。
```js
nsguanyong: {
		enable: "chooseToRespond",
		filterCard: true,
		viewAs: { name: "sha" },
		viewAsFilter(player) {
			if (!player.countCards("hs")) {
				return false;
			}
		},
		position: "hs",
		prompt: "将一张手牌当杀打出",
		check(card) {
			return 7 - get.value(card);
		},
		ai: {
			respondSha: true,
			skillTagFilter(player, tag, arg) {
				if (arg !== "respond") {
					return false;
				}
				if (!player.countCards("hs")) {
					return false;
				}
			},
		},
	}
```

### dualside
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ns_caocao 名字:曹操 势力:wei

### nscaiyi 名字:猜疑
描述: 其他角色摸牌后，你可以观看其摸到的牌，若其中有【杀】，则视为你对其使用一张【杀】，若其中没有【杀】，则视为其对你使用一张【杀】（计入出杀次数）。
```js
nscaiyi: {
		trigger: { global: "drawAfter" },
		check(event, player) {
			if (get.attitude(player, event.player) >= 0) {
				return false;
			}
			if (get.effect(event.player, { name: "sha" }, player, player) <= 0) {
				return false;
			}
			if (get.effect(player, { name: "sha" }, event.player, player) >= 0) {
				return true;
			}
			return player.hasShan() && player.hp >= event.player.hp;
		},
		filter(event, player) {
			return player != event.player && Array.isArray(event.result) && event.result.length > 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.viewCards(get.translation(trigger.player) + "摸到的牌", trigger.result);
			if (!event.isMine()) {
				await game.delayx();
			}
			const list = [];
			for (const card of trigger.result) {
				if (card.name == "sha") {
					list.push(card);
				}
			}
			if (list.length) {
				await player.useCard({ name: "sha" }, trigger.player);
			} else {
				await trigger.player.useCard({ name: "sha" }, player);
			}
		},
	}
```

### nsgefa 名字:割发
描述: 当你的体力值等于0或更低时，你可以将任意一张♣牌当【桃】使用。
```js
nsgefa: {
		enable: "chooseToUse",
		filter(event, player) {
			return player.hp <= 0;
		},
		filterCard: { suit: "club" },
		position: "hse",
		viewAs: { name: "tao" },
		prompt: "将一张梅花牌当桃使用",
		check(card) {
			return 15 - get.value(card);
		},
		ai: {
			skillTagFilter(player) {
				return player.countCards("hes", { suit: "club" }) > 0;
			},
			threaten: 1.5,
			save: true,
			respondTao: true,
		},
	}
```

### nshaoling 名字:号令
描述: 限定技，出牌阶段，你可以指定一名其他角色，令除其外所有其他角色选择一项：1、对该角色使用一张【杀】；2、交给你一张牌，然后视为你对其使用一张【杀】。
```js
nshaoling: {
		skillAnimation: true,
		animationColor: "water",
		limited: true,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return target !== player;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const target = event.target;
			let targets = game
				.filterPlayer(cur => {
					return cur !== player && cur !== target;
				})
				.sortBySeat();
			while (targets.length) {
				const current = targets.shift();
				if (target.isAlive() && current.countCards("he")) {
					const result = await current
						.chooseToUse({ name: "sha" }, target, -1, "号令")
						.set("prompt2", "选择一项：1. 对" + get.translation(target) + "使用一张【杀】；2. 取消并交给" + get.translation(player) + "一张牌，然后其视为对你使用一张【杀】")
						.forResult();
					if (result.bool) {
						continue;
					}
					if (current.countCards("he")) {
						const { cards } = await current.chooseCard("he", true, "交给" + get.translation(player) + "一张牌").forResult();
						if (cards) {
							await current.give(cards, player);
						}
					}
					await player.useCard({ name: "sha" }, current, false);
				}
			}
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					var players = game.filterPlayer();
					if (player.hp > 1) {
						if (game.phaseNumber < game.players.length) {
							return 0;
						}
						if (player.hasUnknown()) {
							return 0;
						}
					}
					var effect = 0;
					for (var i = 0; i < players.length; i++) {
						if (players[i] != target && players[i] != player && players[i].countCards("he")) {
							effect += get.effect(target, { name: "sha" }, players[i], target);
						}
					}
					return effect;
				},
			},
		},
	}
```

## ns_caocaosp 名字:SP曹操 势力:qun

### nsjianxiong 名字:奸雄
描述: 当你成为一名角色牌的目标后你可以对该角色使用一张牌，若此牌对其造成伤害，则该角色的牌失效。若失效的为黑色牌，则你摸一张牌。
```js
nsjianxiong: {
		trigger: { target: "useCardToBefore" },
		direct: true,
		async content(event, trigger, player) {
			await player.chooseToUse(
				function (card) {
					return !get.info(card).multitarget;
				},
				get.prompt("nsjianxiong", trigger.player),
				trigger.player,
				-1
			);
			if (event.damaged) {
				trigger.cancel();
				if (get.color(trigger.card) == "black") {
					await player.draw();
				}
			}
		},
		subSkill: {
			damage: {
				trigger: { source: "damageAfter" },
				silent: true,
				filter(event, player) {
					return event.getParent(4).name == "nsjianxiong";
				},
				async content(event, trigger, player) {
					trigger.getParent(4).damaged = true;
				},
			},
		},
		group: "nsjianxiong_damage",
		ai: {
			effect: {
				player(card, player, target) {
					if (_status.currentPhase != player) {
						return;
					}
					if (get.tag(card, "damage") && !player.needsToDiscard(1) && target.hp > 1) {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

### nsxionglue 名字:雄略
描述: 出牌阶段限一次，你可以弃置一张黑色手牌，然后发现一张锦囊牌。
```js
nsxionglue: {
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h", { color: "black" });
		},
		check(card) {
			return 7 - get.value(card);
		},
		filterCard: { color: "black" },
		async content(event, trigger, player) {
			let result;

			// step 0
			let list = get.inpile("trick");
			list = list.randomGets(3);
			list = list.map(name => ["锦囊", "", name]);
			const dialog = ui.create.dialog("选择一张锦囊牌加入你的手牌", [list, "vcard"], "hidden");
			result = await player
				.chooseButton(dialog, true)
				.set("ai", button => {
					const card = { name: button.link[2] };
					const value = get.value(card);
					return value;
				})
				.forResult();

			// step 1
			if (result && result.bool) {
				const choice = result.links?.[0] || (result.buttons?.[0] && result.buttons[0].link);
				if (choice) {
					const name = choice[2];
					await player.gain(game.createCard(name), "draw");
				}
			}
		},
		ai: {
			order: 9,
			result: {
				player: 1,
			},
		},
	}
```

## ns_zhugeliang 名字:诸葛亮 势力:shu

### nsguanxing 名字:观星
描述: 锁定技，准备阶段，你观看牌堆的X张牌(X为场上存活人数)并且任意移动Y张牌(Y为你当前体力值)。
```js
nsguanxing: {
		trigger: { player: "phaseBegin" },
		forced: true,
		filter(event, player) {
			return player.hp > 0;
		},
		async content(event, trigger, player) {
			let result;

			const cards = get.cards(game.countPlayer());
			const chosen = [];
			let num = player.hp;

			while (num > 0) {
				const judgeCards = player.getCards("j");
				let pos = 0;
				let choiceIndex = -1;

				const getVal = (card, position) => {
					if (judgeCards[position]) {
						return get.judge(judgeCards[position])(card);
					}
					return get.value(card);
				};

				const limit = Math.min(cards.length, judgeCards.length + 2);
				for (const [posIndex] of cards.slice(0, limit).entries()) {
					pos = posIndex;
					let max = getVal(cards[posIndex], posIndex);
					choiceIndex = -1;

					for (const [jIndex, currentCard] of cards.entries()) {
						if (jIndex <= posIndex) {
							continue;
						}
						const current = getVal(currentCard, posIndex);
						if (current > max) {
							choiceIndex = jIndex;
							max = current;
						}
					}

					if (choiceIndex !== -1) {
						break;
					}
				}

				result = await player
					.chooseCardButton(`观星：选择要移动的牌（还能移动${num}张）`, cards)
					.set("filterButton", button => {
						return !_status.event.chosen.includes(button.link);
					})
					.set("chosen", chosen)
					.set("ai", button => {
						return button.link == _status.event.choice ? 1 : 0;
					})
					.set("choice", cards[choiceIndex])
					.forResult();

				if (!result.bool) {
					break;
				}

				const card = result.links[0];
				chosen.push(card);
				cards.remove(card);

				result = await player
					.chooseControl(() => {
						return _status.event.controlai;
					})
					.set("controlai", pos || 0)
					.set("sortcard", cards.slice())
					.set("tosort", card)
					.forResult();

				if (typeof result.index !== "number") {
					break;
				}

				if (result.index > cards.length) {
					ui.cardPile.appendChild(card);
				} else {
					cards.splice(result.index, 0, card);
				}
				num--;
			}

			while (cards.length) {
				ui.cardPile.insertBefore(cards.pop(), ui.cardPile.firstChild);
			}

			const judgeCards = player.getCards("j");
			if (judgeCards.length === 1) {
				if (get.judge(judgeCards[0])(ui.cardPile.firstChild) < 0) {
					player.addTempSkill("guanxing_fail");
				}
			}
		},
		ai: {
			guanxing: true,
		},
	}
```

### kongcheng
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### nsyunxing 名字:陨星
描述: 锁定技，当场上一名角色死亡，若为蜀，你失去1点体力；若为吴，你回复1点体力；若为魏，你摸一张牌并弃置一名角色的手牌；若为群，你强制结束当前回合；若为你，你可以使一名角色翻面。
```js
nsyunxing: {
		trigger: { global: "dieAfter" },
		forced: true,
		check(event, player) {
			return event.player.group == "wei" || (event.player.group == "wu" && player.hp == 1);
		},
		filter(event, player) {
			return ["wei", "shu", "wu", "qun"].includes(event.player.group);
		},
		async content(event, trigger, player) {
			let result;

			switch (trigger.player.group) {
				case "wei": {
					await player.draw();
					break;
				}
				case "shu": {
					await player.loseHp();
					break;
				}
				case "wu": {
					await player.recover();
					break;
				}
				case "qun": {
					const phaseUseEvt = event.getParent("phaseUse");
					if (phaseUseEvt && phaseUseEvt.name == "phaseUse") {
						phaseUseEvt.skipped = true;
					}
					const phaseEvt = event.getParent("phase");
					if (phaseEvt && phaseEvt.name == "phase") {
						phaseEvt.finish();
					}
					break;
				}
			}

			if (
				trigger.player.group != "wei" ||
				!game.hasPlayer(function (current) {
					return current.countCards("h");
				})
			) {
				return;
			}

			result = await player
				.chooseTarget("弃置一名角色的一张手牌", true, function (card, player, target) {
					return target.countCards("h");
				})
				.set("ai", function (target) {
					if (target.hasSkillTag("noh")) {
						return 0;
					}
					return -get.attitude(_status.event.player, target);
				})
				.forResult();

			if (result.bool) {
				const target = result.targets[0];
				await player.discardPlayerCard(target, true, "h");
				player.line(target, "green");
			}
		},
		group: "nsyunxing_self",
		subSkill: {
			self: {
				trigger: { player: "dieBegin" },
				direct: true,
				async content(event, trigger, player) {
					let result;
					// step 0
					result = await player
						.chooseTarget(get.prompt("nsyunxing"), (card, _player, target) => {
							return target != player;
						})
						.set("prompt2", "令一名其他角色翻面")
						.set("ai", target => {
							const att = get.attitude(_status.event.player, target);
							if (target.isTurnedOver()) {
								if (att > 2) {
									return att * 2;
								} else {
									return att;
								}
							} else {
								return -att;
							}
						})
						.forResult();

					// step 1
					if (result.bool) {
						player.logSkill("nsyunxing", result.targets);
						await result.targets[0].turnOver();
					}
				},
			},
		},
	}
```

## ns_wangyue 名字:王越 势力:qun

### nsjianshu 名字:剑术
描述: 锁定技：每当你的装备区有武器时，你使用【杀】指定一个目标后，该角色需要依次使用两张【闪】才能抵消此【杀】。
```js
nsjianshu: {
		trigger: { player: "shaBegin" },
		forced: true,
		filter(event, player) {
			return !event.directHit && player.getEquip(1);
		},
		priority: -1,
		async content(event, trigger, player) {
			if (typeof trigger.shanRequired == "number") {
				trigger.shanRequired++;
			} else {
				trigger.shanRequired = 2;
			}
		},
	}
```

### nscangjian 名字:藏剑
描述: 每当你对一名角色造成伤害，你可以获得其装备区一张牌。
```js
nscangjian: {
		trigger: { source: "damageEnd" },
		direct: true,
		filter(event) {
			return event.player.isIn() && event.player.countCards("e") > 0;
		},
		async content(event, trigger, player) {
			await player
				.gainPlayerCard({
					prompt: get.prompt("nscangjian", trigger.player),
					target: trigger.player,
					position: "e",
				})
				.set("logSkill", ["nscangjian", trigger.player]);
		},
	}
```

## ns_yuji 名字:于吉 势力:qun

### nsyaowang 名字:妖妄
描述: 回合开始时，你可以选择一名其他角色然后获得其一个技能直到回合结束，然后该角色随机获得一项未上场武将的一个技能直到其回合结束。
```js
nsyaowang: {
		trigger: { player: "phaseBegin" },
		filter(event, player) {
			return game.hasPlayer(
				current =>
					player != current &&
					current.getSkills(null, false, false).filter(skill => {
						const info = get.info(skill);
						return info && !info.charlotte;
					}).length
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return (
						player != target &&
						target.getSkills(null, false, false).filter(skill => {
							const info = get.info(skill);
							return info && !info.charlotte;
						}).length
					);
				})
				.set("ai", target => {
					if (get.attitude(get.player(), target) > 0) {
						return Math.random();
					}
					return 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const skills = target.getSkills(null, false, false).filter(skill => {
				const info = get.info(skill);
				return info && !info.charlotte;
			});
			if (!skills.length) {
				return;
			}
			const list = skills.map(skill => [
				skill,
				'<div class="popup text" style="width:calc(100% - 10px);display:inline-block"><div class="skill">' +
					(() => {
						let str = get.translation(skill);
						if (!lib.skill[skill]?.nobracket) {
							str = "【" + str + "】";
						}
						return str;
					})() +
					"</div><div>" +
					lib.translate[skill + "_info"] +
					"</div></div>",
			]);
			const { links } = await player
				.chooseButton(["选择获得一个技能", [list, "textbutton"]])
				.set("displayIndex", false)
				.set("ai", button => {
					const player = get.player();
					let info = get.info(button.link);
					if (info?.ai?.neg || info?.ai?.halfneg) {
						return 0;
					}
					return get.skillRank(button.link, "inout");
				})
				.forResult();
			if (!links?.length) {
				return;
			}
			await player.addTempSkills(links[0]);
			const names = game.players.concat(game.dead).reduce((list, i) => list.addArray(get.nameList(i)), []);
			const skillList = get.gainableSkills((info, skill, name) => !names.includes(name));
			if (!skillList.length) {
				return;
			}
			const skill = skillList.randomGet();
			await target.addTempSkills(skill, { player: "phaseAfter" });
		},
	}
```

### nshuanhuo 名字:幻惑
描述: 每当你失去1点体力或受到一次大于2的伤害时，你可以交换除你之外的两名角色的武将牌（体力及体力上限不变）。
```js
nshuanhuo: {
		trigger: { player: ["loseHpAfter", "damageAfter"] },
		filter(event, player) {
			if (
				game.countPlayer(function (current) {
					return current != player && !current.isUnseen(2);
				}) < 2
			) {
				return false;
			}
			if (event.name == "damage") {
				return event.num > 1;
			}
			return true;
		},
		direct: true,
		skillAnimation: true,
		animationColor: "thunder",
		async content(event, trigger, player) {
			let result;

			// step 0
			result = await player
				.chooseTarget(2, get.prompt2("nshuanhuo"), function (card, p, target) {
					return target != player && !target.isUnseen(2);
				})
				.set("ai", function (target) {
					const att = get.attitude(player, target);
					if (ui.selected.targets.length) {
						if (att < 0) {
							return get.rank(target, true) - get.rank(ui.selected.targets[0], true);
						}
					} else {
						if (att >= 0) {
							return 1 / (1 + get.rank(target, true));
						}
					}
					return 0;
				})
				.forResult();

			// step 1
			if (result.bool) {
				player.logSkill("nshuanhuo", result.targets);
			} else {
				event.finish();
				return;
			}

			// step 2
			const name1 = result.targets[0].name;
			const name2 = result.targets[1].name;
			result.targets[0].reinit(name1, name2, false);
			result.targets[1].reinit(name2, name1, false);
		},
	}
```

## ns_xinxianying 名字:辛宪英 势力:wei

### nsdongcha 名字:洞察
描述: 锁定技，单体锦囊牌无法对你造成伤害。其它角色于其回合内第二次使用锦囊牌指定你为目标时，取消之。
```js
nsdongcha: {
		trigger: { player: "damageBefore" },
		forced: true,
		priority: 15,
		filter(event, player) {
			if (get.type(event.card, "trick") == "trick") {
				if (event.getParent(2).name == "useCard") {
					return event.getParent(2).targets.length == 1;
				}
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			trigger.cancel();
		},
		ai: {
			notrick: true,
			effect: {
				target(card, player, target, current) {
					if (get.type(card) == "trick" && get.tag(card, "damage") && !get.tag(card, "multitarget")) {
						return "zeroplayertarget";
					}
				},
			},
		},
		group: "nsdongcha_cancel",
		subSkill: {
			cancel: {
				trigger: { target: "useCardToAfter" },
				silent: true,
				filter(event, player) {
					return get.type(event.card, "trick") == "trick" && _status.currentPhase == event.player && event.player != player;
				},
				async content(event, trigger, player) {
					player.addTempSkill("nsdongcha_disable");
				},
			},
			disable: {
				trigger: { target: "useCardToBefore" },
				forced: true,
				priority: 15,
				onremove: true,
				filter(event, player) {
					return event.player == _status.currentPhase && get.type(event.card, "trick") == "trick";
				},
				async content(event, trigger, player) {
					trigger.cancel();
				},
				ai: {
					effect: {
						target(card, player, target, current) {
							if (get.type(card, "trick") == "trick" && _status.currentPhase == player) {
								return "zeroplayertarget";
							}
						},
					},
				},
			},
		},
	}
```

### nscaijian 名字:才鉴
描述: 出牌阶段限一次，若你的手牌数不大于你的体力上限，则你可以展示你的手牌，观看牌堆顶相同数量的牌并以任意方式交换之。
```js
nscaijian: {
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			var nh = player.countCards("h");
			return nh && nh <= player.maxHp;
		},
		async content(event, trigger, player) {
			let result;

			player.showHandcards();
			const num = player.countCards("h");

			player.directgain(get.cards(num));
			result = await player
				.chooseCard("将" + get.cnNumber(num) + "张手牌以按顺序置于牌堆顶（先选择的在上）", num, true)
				.set("ai", function (card) {
					return -get.value(card);
				})
				.forResult();

			if (!result.bool) {
				return;
			}

			const next = player.lose(result.cards, ui.special);
			next._triggered = null;
			await next;

			const cards = result.cards.slice(0);

			if (player == game.me && _status.auto) {
				await game.delay();
			}

			while (cards.length) {
				const current = cards.pop();
				current.fix();
				ui.cardPile.insertBefore(current, ui.cardPile.firstChild);
			}
		},
		ai: {
			order: 10,
			result: {
				player: 1,
			},
		},
	}
```

### nsgongjian 名字:恭俭
描述: 锁定技，弃牌阶段，你须将弃牌交给一名体力值大于你的其它角色。
```js
nsgongjian: {
		trigger: { player: "phaseDiscardEnd" },
		forced: true,
		filter(event, player) {
			if (event.cards && event.cards.length > 0) {
				return game.hasPlayer(function (current) {
					return current.hp > player.hp;
				});
			}
			return false;
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			result = await player
				.chooseTarget("恭俭：将弃置的牌交给一名体力值大于你的角色", (card, player, target) => {
					return target.hp > player.hp;
				})
				.set("ai", target => {
					return get.attitude(_status.event.player, target) / Math.sqrt(target.countCards("h") + 1);
				})
				.forResult();

			// step 1
			if (result.bool && result.targets?.length) {
				const target = result.targets[0];
				player.line(target, "green");
				await target.gain(trigger.cards, "gain2");
			}
		},
		ai: {
			halfneg: true,
		},
	}
```

## ns_guanlu 名字:管辂 势力:wei

### nsbugua 名字:卜卦
描述: 出牌阶段限一次，你可以弃置一张牌，并将牌堆顶的六张牌反面朝上逐张按先后顺序排放，然后抛骰子，展示牌序号与骰子显示的点数一致的牌，然后你根据这张牌的花色、点数按以下规则随机获得牌堆中相应的一张牌：乾（红桃偶数）：无中生有；坤（黑桃奇数）：决斗；震（黑桃偶数）：南蛮入侵；巽（红桃奇数）：万箭齐发；坎（梅花偶数）：过河拆桥、兑（梅花奇数）：借刀杀人、艮（方片偶数）：顺手牵羊、离（方片奇数）：火攻。若牌堆中无此牌则摸一张牌，然后你观看未展示的另外五张牌并按任意顺序将其置于牌堆顶。
```js
nsbugua: {
		group: "nsbugua_use",
		ai: {
			threaten: 1.4,
		},
		subSkill: {
			use: {
				enable: "phaseUse",
				usable: 1,
				filterCard: true,
				check(card) {
					return 9 - get.value(card);
				},
				filter(event, player) {
					return player.countCards("he");
				},
				position: "he",
				ai: {
					order: 9.5,
					result: {
						player: 1,
					},
				},
				content: [
					async (event, trigger, player) => {
						const num = get.rand(6) + 1;
						const cards = get.cards(6);
						event.cards = cards;
						const cards2 = cards.slice(0);
						event.cards2 = cards2;
						const card = cards2.splice(num - 1, 1)[0];
						event.cardx = card;
						await player.showCards(get.translation(player) + "亮出了" + get.translation(card), cards).set("hiddencards", cards2);
						player.throwDice(num);
					},
					async (event, trigger, player) => {
						const { cards, cards2, cardx: card } = event;
						card.discard();

						let name = null;
						switch (get.suit(card)) {
							case "club": {
								if (card.number % 2 == 0) {
									name = "guohe";
								} else {
									name = "jiedao";
								}
								break;
							}
							case "spade": {
								if (card.number % 2 == 0) {
									name = "nanman";
								} else {
									name = "juedou";
								}
								break;
							}
							case "diamond": {
								if (card.number % 2 == 0) {
									name = "shunshou";
								} else {
									name = "huogong";
								}
								break;
							}
							case "heart": {
								if (card.number % 2 == 0) {
									name = "wuzhong";
								} else {
									name = "wanjian";
								}
								break;
							}
						}

						const togain = get.cardPile(name, "cardPile", "random");
						if (togain) {
							await player.gain(togain, "gain2");
						} else {
							await player.draw();
						}

						event.list = cards2;

						result = await player.chooseCardButton(event.list, true, "按顺序将牌置于牌堆顶（先选择的在上）", event.list.length).forResult();

						const list = result.links.slice(0);
						while (list.length) {
							ui.cardPile.insertBefore(list.pop(), ui.cardPile.firstChild);
						}
					},
				],
			},
			twice: {},
		},
	}
```

### nstuiyan 名字:推演
描述: 出牌阶段，若你使用的牌点数比上一张使用的牌点数大，你可以摸一张牌，反之你本回合不能再以此法摸牌；当你使用的牌点数首次达到8的倍数时，你可以在结算后立即发动一次【卜卦】。
```js
nstuiyan: {
		trigger: { player: "useCard" },
		filter(event, player) {
			return _status.currentPhase == player && event.getParent("phaseUse", true) && !player.hasSkill("nstuiyan_fail") && typeof player.storage.nstuiyan == "number" && event.card.number > player.storage.nstuiyan;
		},
		frequent: true,
		priority: 2,
		async content(event, trigger, player) {
			await player.draw();
		},
		onremove(player) {
			delete player.storage.nstuiyan;
			delete player.storage.nstuiyan_done;
			delete player.storage.nstuiyan2;
			delete player.storage.nstuiyan2_done;
		},
		intro: {
			mark(dialog, content, player) {
				if (player.storage.nstuiyan_done) {
					dialog.addText("推演摸牌已结束");
				} else {
					dialog.addText("上一张点数：" + player.storage.nstuiyan);
				}
				if (player.storage.nstuiyan2_done) {
					dialog.addText("总点数8的倍数已达成");
				} else {
					dialog.addText("总点数：" + player.storage.nstuiyan2);
				}
			},
			content(storage, player) {
				var str = "";
				if (player.storage.nstuiyan_done) {
					str += "推演摸牌已结束；";
				} else {
					str += "上一张牌点数：" + storage + "；";
				}
				if (player.storage.nstuiyan2_done) {
					str += "总点数8的倍数已达成";
				} else {
					str += "总点数：" + player.storage.nstuiyan2;
				}
				return str;
			},
			markcount(storage, player) {
				if (player.storage.nstuiyan2_done) {
					if (player.storage.nstuiyan_done) {
						return 0;
					} else {
						return player.storage.nstuiyan;
					}
				} else {
					return player.storage.nstuiyan2;
				}
			},
		},
		group: ["nstuiyan_use", "nstuiyan_clear"],
		subSkill: {
			bugua: {
				trigger: { player: "useCardAfter" },
				direct: true,
				filter(event, player) {
					return player.countCards("h") > 0;
				},
				async content(event, trigger, player) {
					let result;

					// step 0
					player.removeSkill("nstuiyan_bugua");
					result = await player
						.chooseToDiscard({
							prompt: "推演：是否发动一次【卜卦】？",
							position: "he",
							ai(card) {
								return 8 - get.value(card);
							},
						})
						.set("logSkill", "nstuiyan")
						.forResult();

					// step 1
					if (result.bool) {
						event.insert(lib.skill.nsbugua.subSkill.use.content, { player: player });
					}
				},
			},
			use: {
				trigger: { player: "useCard" },
				silent: true,
				priority: -1,
				filter(event, player) {
					return _status.currentPhase == player && event.getParent("phaseUse", true) && typeof event.card.number == "number";
				},
				async content(event, trigger, player) {
					if (typeof player.storage.nstuiyan2 !== "number") {
						player.storage.nstuiyan2 = 0;
					}
					if (!player.hasSkill("nstuiyan_fail") && (trigger.card.number <= player.storage.nstuiyan || typeof trigger.card.number !== "number")) {
						player.storage.nstuiyan_done = true;
						player.addTempSkill("nstuiyan_fail");
					}
					player.storage.nstuiyan = trigger.card.number;
					player.storage.nstuiyan2 += trigger.card.number;
					if (player.storage.nstuiyan2 % 8 === 0 && !player.storage.nstuiyan2_done) {
						player.storage.nstuiyan2_done = true;
						player.addTempSkill("nstuiyan_bugua");
					}
					player.markSkill("nstuiyan");
				},
			},
			clear: {
				trigger: { player: ["phaseUseAfter", "phaseAfter"] },
				silent: true,
				async content(event, trigger, player) {
					delete player.storage.nstuiyan;
					delete player.storage.nstuiyan_done;
					delete player.storage.nstuiyan2;
					delete player.storage.nstuiyan2_done;
					player.unmarkSkill("nstuiyan");
				},
			},
			fail: {},
		},
		ai: {
			threaten: 1.4,
		},
	}
```

### nstianji 名字:天机
描述: 限定技，当一名其他角色进入濒死状态，你可自减1点体力上限，令其回复体力至1并增加1点体力上限。
```js
nstianji: {
		trigger: { global: "dying" },
		limited: true,
		skillAnimation: true,
		animationColor: "water",
		filter(event, player) {
			return event.player.hp <= 0 && event.player != player;
		},
		logTarget: "player",
		check(event, player) {
			return get.attitude(player, event.player) > 1;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			await trigger.player.recover({
				num: 1 - trigger.player.hp,
			});
			await trigger.player.gainMaxHp();
		},
	}
```

## ns_simazhao 名字:司马昭 势力:wei

### nszhaoxin 名字:昭心
描述: 锁定技，你始终展示手牌。
```js
nszhaoxin: {
		mark: true,
		intro: {
			mark(dialog, content, player) {
				var hs = player.getCards("h");
				if (hs.length) {
					dialog.addSmall(hs);
				} else {
					dialog.addText("无手牌");
				}
			},
			content(content, player) {
				var hs = player.getCards("h");
				if (hs.length) {
					return get.translation(hs);
				} else {
					return "无手牌";
				}
			},
		},
		locked: true,
		ai: {
			neg: true,
		},
	}
```

### nsxiuxin 名字:修穆
描述: 锁定技，若你没有某种花色的手牌，你不能成为这种花色的牌的目标。
```js
nsxiuxin: {
		mod: {
			targetEnabled(card, player, target) {
				var suit = get.suit(card);
				if (suit && !target.countCards("h", { suit: suit })) {
					return false;
				}
			},
		},
	}
```

### nsshijun 名字:弑君
描述: 锁定技，你造成伤害时，你令此伤害+1，并在结算后失去1点体力。
```js
nsshijun: {
		trigger: { source: "damageBegin" },
		forced: true,
		async content(event, trigger, player) {
			trigger.num++;
			trigger.nsshijun = true;
		},
		subSkill: {
			hp: {
				trigger: { source: "damageAfter" },
				silent: true,
				filter(event) {
					return event.nsshijun;
				},
				async content(event, trigger, player) {
					await player.loseHp();
				},
			},
		},
		group: "nsshijun_hp",
		ai: {
			halfneg: true,
		},
	}
```

## ns_sunjian 名字:孙坚 势力:wu

### nswulie 名字:武烈
描述: 限定技，准备阶段，你可以失去1点体力上限，从弃牌堆选择最多三张牌以任意顺序放置于牌堆顶。若如此做，此回合的结束阶段，你可以重复此操作。
```js
nswulie: {
		trigger: { player: "phaseBegin" },
		limited: true,
		skillAnimation: true,
		animationColor: "metal",
		filter(event, player) {
			return ui.discardPile.childElementCount > 0;
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			player.awakenSkill(event.name);
			await player.loseMaxHp();

			// step 1
			result = await player.chooseCardButton(Array.from(ui.discardPile.childNodes), "将至多三张任意顺置于牌堆顶（先选择的在上）", true, [1, 3]).forResult();

			// step 2
			if (result.bool) {
				const cards = result.links?.toReversed();
				for (const card of cards) {
					ui.cardPile.insertBefore(card, ui.cardPile.firstChild);
				}
				player.addTempSkill("nswulie_end");
			}
		},
		subSkill: {
			end: {
				trigger: { player: "phaseEnd" },
				filter(event, player) {
					return ui.discardPile.childElementCount > 0;
				},
				async content(event, trigger, player) {
					let result;

					// step 0
					await player.loseMaxHp();

					// step 1
					const choices = Array.from(ui.discardPile.childNodes);
					result = await player.chooseCardButton(choices, "将至多三张任意顺置于牌堆顶（先选择的在上）", true, [1, 3]).forResult();

					// step 2
					if (result.bool) {
						const cards = result.links.slice(0);
						for (const card of cards.reverse()) {
							ui.cardPile.insertBefore(card, ui.cardPile.firstChild);
						}
					}
				},
			},
		},
	}
```

### nshunyou 名字:魂佑
描述: 出牌阶段限一次，你可以弃置一张基本牌，获得弃牌堆底的一张装备牌和一张锦囊牌，然后你可以将那张装备牌装备给一名角色（允许替换）。如果弃牌堆没有装备以及锦囊牌，则改为摸X张牌，X为你已损失的体力值+1（至多三张）。
```js
nshunyou: {
		enable: "phaseUse",
		usable: 1,
		filterCard: { type: "basic" },
		filter(event, player) {
			return player.countCards("h", { type: "basic" });
		},
		async content(event, trigger, player) {
			let result;
			let equip = null;
			let trick = null;

			for (const card of ui.discardPile.childNodes) {
				const type = get.type(card, "trick");
				if (type == "trick") {
					trick = card;
				} else if (type == "equip") {
					equip = card;
				}
				if (trick && equip) {
					break;
				}
			}

			const list = [];
			if (trick) {
				list.push(trick);
			}
			if (equip) {
				list.push(equip);
			}

			if (!list.length) {
				await player.draw(Math.min(3, 1 + player.maxHp - player.hp));
				return;
			}

			await player.gain(list, "gain2");
			event.equip = equip;

			if (!(event.equip && get.owner(event.equip) == player)) {
				return;
			}

			result = await player
				.chooseTarget("是否将" + get.translation(event.equip) + "装备给一其角色？", (card, player, target) => {
					return target != player;
				})
				.set("ai", target => {
					const att = get.attitude(_status.event.player, target);
					if (att > 1) {
						if (!target.getEquip(_status.event.subtype)) {
							return att;
						}
					}
					return 0;
				})
				.set("subtype", get.subtype(event.equip))
				.forResult();

			if (!result.bool) {
				return;
			}

			const target = result.targets[0];
			player.line(result.targets, "green");
			player.$give(event.equip, target);
			await player.lose(event.equip, ui.special);
			await game.delay(0.5);
			await target.equip(event.equip);
			await game.delay();
		},
		check(card) {
			return 7 - get.value(card);
		},
		ai: {
			order: 7,
			result: {
				player: 1,
			},
		},
	}
```

### nscangxi 名字:藏玺
描述: 主公技，其他吴势力角色的弃牌阶段结束时，若其弃置了至少两张牌，则可以选择判定，若是黑色，则其选择一项，1，令主公摸一张并且展示；2，主公手牌上限永久加一；3，额外弃置一张牌，令主公获得本回合进入弃牌堆的一张牌。
```js
nscangxi: {
		global: "nscangxi2",
		locked: false,
		zhuSkill: true,
		init(player) {
			player.storage.nscangxi = 0;
		},
		intro: {
			content: "手牌上限+#",
		},
		mod: {
			maxHandcard(player, num) {
				return num + player.storage.nscangxi;
			},
		},
	}
```

## ns_duangui 名字:段珪 势力:qun

### nscuanquan 名字:篡权
描述: 锁定技，如果你的身份为忠臣，则在受伤三次后与主公，互换身份和体力上限。
```js
nscuanquan: {
		mode: ["identity"],
		init(player) {
			player.storage.nscuanquan = 0;
		},
		forced: true,
		unique: true,
		forceunique: true,
		skillAnimation: true,
		animationColor: "thunder",
		trigger: { player: "damageAfter" },
		filter(event, player) {
			return player.identity == "zhong" && player.storage.nscuanquan == 3 && game.zhu && game.zhu.isZhu;
		},
		group: "nscuanquan_count",
		subSkill: {
			count: {
				trigger: { player: "damageEnd" },
				silent: true,
				async content(event, trigger, player) {
					player.storage.nscuanquan++;
				},
			},
		},
		logTarget() {
			return [game.zhu];
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			game.broadcastAll(player => {
				const tmp = player.maxHp;
				player.identity = "zhu";
				player.maxHp = game.zhu.hp;
				player.showIdentity();
				player.update();
				game.zhu.identity = "zhong";
				game.zhu.maxHp = tmp;
				game.zhu.showIdentity();
				game.zhu.update();
				game.zhu = player;
			}, player);
			await event.trigger("zhuUpdate");
		},
	}
```

### nsjianning 名字:奸佞
描述: 出牌阶段限一次，如果你的身份为内奸，你可以与一名手牌数比你少的角色交换手牌，并对其造成1点伤害。
```js
nsjianning: {
		mode: ["identity"],
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.identity == "nei";
		},
		filterTarget(card, player, target) {
			return target.countCards("h") < player.countCards("h");
		},
		async content(event, trigger, player) {
			// step 0
			if (!player.identityShown) {
				game.broadcastAll(player => {
					player.showIdentity();
				}, player);
			}
			await player.swapHandcards(event.target);

			// step 1
			await event.target.damage();
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					if (
						!player.countCards("h", function (card) {
							return get.value(card) >= 8;
						}) &&
						player.countCards("h") - target.countCards("h") <= 1
					) {
						if (
							target.hp == 1 ||
							player.countCards("h", function (card) {
								return get.value(card) < 0;
							})
						) {
							return get.damageEffect(target, player, target);
						}
					}
					return 0;
				},
			},
		},
	}
```

### nschangshi 名字:常仕
描述: 出牌阶段限一次，如果你的身份为反贼，你可以指定两名其他角色互换体力；如果两名角色体力之差等于1，你失去1点体力。
```js
nschangshi: {
		mode: ["identity"],
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.identity == "fan";
		},
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			if (ui.selected.targets.length) {
				return target.hp != ui.selected.targets[0].hp;
			}
			return true;
		},
		multitarget: true,
		selectTarget: 2,
		async content(event, trigger, player) {
			game.broadcastAll(
				(player, targets) => {
					player.showIdentity();
					var tmp = targets[0].hp;
					targets[0].hp = targets[1].hp;
					targets[1].hp = tmp;
					targets[0].update();
					targets[1].update();
					if (Math.abs(targets[0].hp - targets[1].hp) == 1) {
						player.loseHp();
					}
				},
				player,
				event.targets
			);
		},
		ai: {
			order: 10,
			result: {
				player(player, target) {
					if (ui.selected.targets.length && Math.abs(target.hp - ui.selected.targets[0].hp) === 1) {
						return get.effect(player, { name: "losehp" }, player, player) / 10;
					}
					return 0;
				},
				target(player, target) {
					let att = get.attitude(player, target),
						max;
					if (!ui.selected.targets.length) {
						let search = false;
						game.countPlayer(cur => {
							if (player === cur || target === cur || (cur.hp - target.hp) * (get.attitude(player, cur) - att) >= 0) {
								return false;
							}
							if (!search) {
								max = Math.min(cur.hp, target.maxHp) - target.hp;
								search = true;
							} else if (att > 0) {
								max = Math.max(max, Math.min(cur.hp, target.maxHp) - target.hp);
							} else {
								max = Math.min(max, Math.min(cur.hp, target.maxHp) - target.hp);
							}
						});
						if (target === get.zhu(player)) {
							return 2 * max;
						}
						return max;
					}
					max = Math.min(ui.selected.targets[0].hp, target.maxHp) - target.hp;
					if (target === get.zhu(player)) {
						return 2 * max;
					}
					return max;
				},
			},
		},
	}
```

### nsbaquan 名字:霸权
描述: 回合结束时，你可以弃置所有手牌，并获得相应点数的护甲，你的新一回合开始时清除所有护甲。
```js
nsbaquan: {
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		check(event, player) {
			if (player.hasShan() || player.hujia > 0) {
				return false;
			}
			var nh = player.countCards("h");
			if (player.hp == 1) {
				return nh <= 3;
			}
			if (player.hp == 2) {
				return nh <= 1;
			}
			return false;
		},
		async content(event, trigger, player) {
			const cards = player.getCards("h");
			player.discard(cards);
			player.changeHujia(cards.length);
			player.storage.nsbaquan = true;
		},
		group: "nsbaquan_clear",
		subSkill: {
			clear: {
				trigger: { player: "phaseBegin" },
				forced: true,
				filter(event, player) {
					return player.storage.nsbaquan && player.hujia > 0;
				},
				async content(event, trigger, player) {
					player.changeHujia(-player.hujia);
					game.log(player, "失去了所有护甲");
					delete player.storage.nsbaquan;
				},
			},
		},
	}
```

## ns_zhangbao 名字:张宝 势力:qun

### nsfuhuo 名字:符火
描述: 出牌阶段限一次，你可将一张手牌置于一名武将牌上没有“符”的角色的武将牌上，称为“符”，若如此做，其回合外使用或打出【闪】时，你可令其判定，若结果为：红桃，你对其造成2点火焰伤害；方块，你弃置其一张手牌，然后对其造成1点火焰伤害。你的下个回合开始时，你获得其武将牌上的“符”。
```js
nsfuhuo: {
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		filterTarget(card, player, target) {
			return player != target && !target.hasSkill("nsfuhuo2");
		},
		prepare: "throw",
		discard: false,
		async content(event, trigger, player) {
			const { target, cards } = event;
			target.$gain2(cards);
			target.storage.nsfuhuo2 = cards[0];
			target.addSkill("nsfuhuo2");
			target.storage.nsfuhuo3 = player;
			ui.special.appendChild(cards[0]);
			target.syncStorage("nsfuhuo2");
		},
		check(card) {
			return 6 - get.value(card);
		},
		ai: {
			expose: 0.1,
			order: 4,
			result: {
				target(player, target) {
					if (target.hasSkillTag("maixie")) {
						return 0;
					}
					return -1;
				},
			},
		},
		group: ["nsfuhuo_die", "nsfuhuo_gain"],
		subSkill: {
			die: {
				trigger: { player: "dieBegin" },
				silent: true,
				async content(event, trigger, player) {
					for (const current of game.players) {
						if (current.hasSkill("nsfuhuo2") && current.storage.nsfuhuo3 === player) {
							current.removeSkill("nsfuhuo2");
						}
					}
				},
			},
			gain: {
				trigger: { player: "phaseBegin" },
				silent: true,
				async content(event, trigger, player) {
					for (const target of game.players) {
						if (target.hasSkill("nsfuhuo2") && target.storage.nsfuhuo3 === player) {
							const card = target.storage.nsfuhuo2;
							target.removeSkill("nsfuhuo2");
							target.$give(card, player);
							await player.gain({
								cards: [card],
							});
						}
					}
				},
			},
		},
	}
```

### nswangfeng 名字:望风
描述: 在判定牌生效前，你可以打出一张红色牌替换之。
```js
nswangfeng: {
		trigger: { global: "judge" },
		filter(event, player) {
			return player.countCards("hes", { color: "red" }) > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(`${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt(event.skill)}`, "hes", card => {
					const player = get.player();
					if (get.color(card) !== "red") {
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
						val /= 4;
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
	}
```

## ns_masu 名字:马谡 势力:shu

### nstanbing 名字:谈兵
描述: 摸牌阶段开始时，你可弃置一张手牌，然后摸X张牌(X为你弃置牌的名称字数)，若如此做，本回合你不可使用或打出【杀】。
```js
nstanbing: {
		trigger: { player: "phaseDrawBegin" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		direct: true,
		async content(event, trigger, player) {
			let result;
			// step 0
			result = await player
				.chooseToDiscard("h", get.prompt2("nstanbing"))
				.set("ai", card => {
					if (!player.needsToDiscard(1)) {
						return get.translation(card.name).length - 1;
					}
					return 0;
				})
				.set("logSkill", "nstanbing")
				.forResult();
			// step 1
			if (result.bool) {
				await player.draw(get.translation(result.cards[0].name).length);
				player.addTempSkill("nstanbing_sha");
			}
		},
		subSkill: {
			sha: {
				mod: {
					cardEnabled(card, player) {
						if (card.name == "sha") {
							return false;
						}
					},
					cardUsable(card, player) {
						if (card.name == "sha") {
							return false;
						}
					},
				},
			},
		},
	}
```

### nsxinzhan 名字:心战
描述: 出牌阶段限一次，你可将任意张手牌交给一名其他角色，若如此做，该角色失去X点体力(X为你交给其的牌张数的一半，向下取整)，若你给的牌达到六张，则改为该角色失去1点体力上限。
```js
nsxinzhan: {
		enable: "phaseUse",
		filterCard: [1, Infinity],
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		usable: 1,
		selectCard: [1, Infinity],
		check(card) {
			var player = _status.event.player;
			if (
				player.countCards("h") >= 8 &&
				game.hasPlayer(function (current) {
					return current.isDamaged() && get.attitude(player, current) > 3;
				})
			) {
				if (ui.selected.cards.length >= 6) {
					return 0;
				}
				return 1;
			} else {
				if (ui.selected.cards.length >= 2) {
					return 0;
				}
				if (
					player.countCards("h", function (card) {
						return get.value(card) < 0;
					})
				) {
					return 8 - get.value(card, player, "raw");
				} else {
					return 4 - get.value(card, player, "raw");
				}
			}
		},
		discard: false,
		prepare: "give2",
		allowChooseAll: true,
		async content(event, trigger, player) {
			const { target, cards } = event;
			await target.gain({
				cards,
				source: player,
			});
			const num = Math.floor(cards.length / 2);
			if (num >= 3) {
				await target.loseMaxHp({
					forced: true,
				});
			} else if (num) {
				await target.loseHp(num);
			}
		},
		filterTarget(card, player, target) {
			return target != player;
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					if (ui.selected.cards.length >= 6) {
						if (target.isDamaged()) {
							return 2;
						}
						return 1;
					}
					if (ui.selected.cards.length == 1) {
						return 1;
					}
					return -1;
				},
			},
		},
	}
```

## ns_zhangxiu 名字:张绣 势力:qun

### nsbaiming 名字:百鸣
描述: 当你使用【杀】时，你可以获得一项未获得过且与杀或伤害相关的技能，此【杀】结算完毕后，你失去以此法获得的技能。
```js
nsbaiming: {
		trigger: { player: "useCard" },
		filter(event, player) {
			if (player.additionalSkills.nsbaiming?.length) {
				return false;
			}
			return event.card?.name == "sha" && player.storage.nsbaiming?.length;
		},
		group: "nsbaiming_clear",
		init(player) {
			var check = function (list) {
				for (var i = 0; i < list.length; i++) {
					var info = lib.skill[list[i]];
					if (!info) {
						continue;
					}
					if (info && info.trigger) {
						for (var j in info.trigger) {
							var cond = info.trigger[j];
							if (typeof cond == "string") {
								cond = [cond];
							}
							if (j == "source" || j == "global") {
								if (cond.indexOf("damageBefore") != -1) {
									return true;
								}
								if (cond.indexOf("damageBegin") != -1) {
									return true;
								}
								if (cond.indexOf("damageBegin1") != -1) {
									return true;
								}
								if (cond.indexOf("damageBegin2") != -1) {
									return true;
								}
								if (cond.indexOf("damageEnd") != -1) {
									return true;
								}
								if (cond.indexOf("damageSource") != -1) {
									return true;
								}
								if (cond.indexOf("damageAfter") != -1) {
									return true;
								}
							}
						}
					}
					if (get.skillInfoTranslation(list[i], player).includes("【杀】")) {
						return true;
					}
				}
				return false;
			};
			player.storage.nsbaiming = get.gainableSkills(function (info, skill) {
				var list = [skill];
				game.expandSkills(list);
				return check(list);
			}, player);
		},
		async cost(event, trigger, player) {
			const skills = player.storage.nsbaiming.slice(0);
			const list = skills.map(skill => [
				skill,
				'<div class="popup text" style="width:calc(100% - 10px);display:inline-block"><div class="skill">' +
					(() => {
						let str = get.translation(skill);
						if (!lib.skill[skill]?.nobracket) {
							str = "【" + str + "】";
						}
						return str;
					})() +
					"</div><div>" +
					lib.translate[skill + "_info"] +
					"</div></div>",
			]);
			const { bool, links } = await player
				.chooseButton([`###百鸣###<div class="text center">你可以获得其中一个技能</div>`, [list, "textbutton"]])
				.set("displayIndex", false)
				.set("ai", button => {
					const { link } = button,
						{ choice } = get.event();
					if (choice.includes(link)) {
						return 2;
					}
					return 1;
				})
				.set(
					"choice",
					skills.filter(skill => {
						const info = get.info(skill) || {};
						if (info.ai?.neg || info.ai?.halfneg || info.ai?.combo) {
							return false;
						}
						return ["使用【杀】时", "使用【杀】指定"].some(str => get.skillInfoTranslation(skill, player).includes(str));
					})
				)
				.forResult();
			event.result = {
				bool: bool,
				cost_data: links,
			};
		},
		async content(event, trigger, player) {
			const { cost_data: links, name } = event;
			player.addAdditionalSkill(name, links);
			player.popup(links);
			game.log(player, "获得了技能", "【" + get.translation(links) + "】");
			await game.delay();
			player.storage.nsbaiming.remove(links[0]);
			trigger.nsbaiming = true;
		},
		subSkill: {
			clear: {
				trigger: { player: "useCardAfter" },
				silent: true,
				filter(event) {
					return event.nsbaiming == true;
				},
				async content(event, trigger, player) {
					player.removeAdditionalSkill("nsbaiming");
				},
			},
		},
	}
```

### nsfuge 名字:覆戈
描述: 你的回合结束后，你可以执行一个额外的回合，此回合的摸牌阶段，你于摸牌阶段额外摸X张牌（X为你已损失的体力值）；若如此做，直到洗牌前，你不能再发动此技能。
```js
nsfuge: {
		trigger: { player: "phaseAfter" },
		filter(event, player) {
			return !player.storage.nsfuge;
		},
		init(player) {
			lib.onwash.push(function () {
				delete player.storage.nsfuge;
			});
		},
		skillAnimation: true,
		check(event, player) {
			return player.hp == 1 || player.maxHp - player.hp >= 2;
		},
		async content(event, trigger, player) {
			player.storage.nsfuge = true;
			player.insertPhase();
		},
		group: "nsfuge_draw",
		subSkill: {
			draw: {
				trigger: { player: "phaseDrawBegin" },
				silent: true,
				filter(event, player) {
					var evt = event.getParent("phase");
					return evt && evt.skill == "nsfuge";
				},
				async content(event, trigger, player) {
					trigger.num += player.maxHp - player.hp;
				},
			},
		},
	}
```

## ns_lvmeng 名字:吕蒙 势力:wu

### nsqinxue 名字:勤学
描述: 每个效果每回合只能使用一次。①当你使用一张基本牌时，你从牌堆随机获得一张锦囊牌；②当你使用一张锦囊牌时，你从牌堆随机获得一张装备牌；③当你使用一张装备牌时，你从牌堆随机获得一张基本牌。
```js
nsqinxue: {
		trigger: { player: "useCard" },
		forced: true,
		filter(event, player) {
			const type = get.type2(event.card);
			if (player.getStorage("nsqinxue_mark").includes(type)) {
				return false;
			}
			return ["basic", "trick", "equip"].includes(type);
		},
		async content(event, trigger, player) {
			let card;
			const type0 = get.type2(trigger.card);
			let type = null;

			switch (type0) {
				case "basic": {
					type = "trick";
					break;
				}
				case "trick": {
					type = "equip";
					break;
				}
				case "equip": {
					type = "basic";
					break;
				}
			}

			card = get.cardPile(cardx => {
				return get.type2(cardx) == type;
			});

			if (card) {
				player.addTempSkill("nsqinxue_mark");
				player.markAuto("nsqinxue_mark", [type0]);
				await player.gain({
					cards: [card],
					animate: "gain2",
				});
			}
		},
		subSkill: {
			mark: {
				charlotte: true,
				onremove: true,
				intro: { content: "【勤学】已触发类别：$" },
			},
		},
	}
```

### nsbaiyi 名字:白衣
描述: `锁定技，若你本回合发动过${get.poptip("nsqinxue")}，你跳过弃牌阶段，改为弃置X张牌（X为本回合发动${get.poptip("nsqinxue")}的次数）；若你弃置了三张类别不同的牌，你获得一个额外回合（不可连续获得回合），否则你观看牌堆顶的X张牌并获得其中一张。`
```js
nsbaiyi: {
		trigger: { player: "phaseDiscardBefore" },
		filter(event, player) {
			return player.getStorage("nsqinxue_mark").length > 0;
		},
		forced: true,
		async content(event, trigger, player) {
			let result;
			trigger.cancel();
			const num = player.getStorage("nsqinxue_mark").length;
			if (!num) {
				return;
			}
			result = await player.chooseToDiscard("白衣：请弃置" + get.cnNumber(num) + "张牌", "he", true, num).forResult();
			if (!result?.bool || !result.cards?.length) {
				return;
			}
			let goon = true;
			if (result.cards?.length === 3) {
				const types = new Set();
				for (const card of result.cards) {
					types.add(get.type2(card));
				}
				if (types.size === 3 && trigger.getParent("phase")?.skill != "nsbaiyi") {
					goon = false;
					player.insertPhase();
				}
			}

			if (!goon) {
				return;
			}

			const cards = get.cards(result.cards.length, true);
			result = await player.chooseCardButton(cards, "白衣：获得其中一张牌", true).forResult();

			if (result?.bool && result.links?.length) {
				await player.gain(result.links, "draw");
				const discard = cards.filter(card => !result.links.includes(card));
				if (discard.length) {
					player.$throw(discard, 1000);
					await game.cardsDiscard(discard);
					game.log(discard, "进入了弃牌堆");
				}
			}
		},
		derivation: "nsqinxue",
		ai: {
			threaten: 1.5,
			combo: "nsqinxue",
		},
	}
```

## ns_shenpei 名字:审配 势力:qun

### nshunji 名字:混击
描述: 出牌阶段限一次，你可以摸一张牌，视为使用一张【万箭齐发】。此【万箭齐发】造成伤害时，受伤角色选择一项：①弃置你一张牌；②摸一张牌。
```js
nshunji: {
		enable: "phaseUse",
		viewAs: { name: "wanjian" },
		usable: 1,
		delay: 0,
		selectCard: 0,
		group: ["nshunji_damage", "nshunji_draw"],
		subSkill: {
			draw: {
				trigger: { player: "useCard" },
				silent: true,
				popup: false,
				filter(event) {
					return event.skill == "nshunji";
				},
				async content(event, trigger, player) {
					player.draw();
				},
			},
			damage: {
				trigger: { source: "damageBegin1" },
				filter(event) {
					return event.getParent(2).skill == "nshunji" && event.player?.isIn();
				},
				forced: true,
				locked: false,
				logTarget: "player",
				async content(event, trigger, player) {
					let result;
					const target = event.targets[0];
					if (player.hasCards("he")) {
						result = await target
							.discardPlayerCard(player, "混击", "he")
							.set("boolline", true)
							.set("prompt2", "弃置" + get.translation(player) + "的一张牌，或取消并摸一张牌")
							.forResult();
					} else {
						await target.draw();
						return;
					}
					if (!result?.bool) {
						await target.draw();
					}
				},
			},
		},
	}
```

### shibei
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ns_yujisp 名字:于吉 势力:qun

### nsguhuo 名字:蛊惑
描述: 锁定技，你在一个回合中使用前两张牌时，你对一名随机角色从牌堆(牌堆无则从弃牌堆)随机使用一张同类别卡牌。
```js
nsguhuo: {
		trigger: { player: "useCardAfter" },
		forced: true,
		usable: 2,
		filter(event, player) {
			if (event.parent.name == "nsguhuo") {
				return false;
			}
			if (event.card == event.cards[0]) {
				var type = get.type(event.card, "trick");
				var names = [];
				if (
					get.cardPile(function (card) {
						if (get.type(card, "trick") != type) {
							return false;
						}
						if (get.info(card).multitarget) {
							return false;
						}
						if (names.includes(card.name)) {
							return false;
						}
						if (player.hasUseTarget(card)) {
							return true;
						} else {
							names.add(card.name);
							return false;
						}
					})
				) {
					return true;
				}
			}
			return true;
		},
		async content(event, trigger, player) {
			const type = get.type(trigger.card, "trick");
			const names = [];
			const card = get.cardPile(cardx => {
				if (get.type(cardx, "trick") != type) {
					return false;
				}
				if (get.info(cardx).multitarget) {
					return false;
				}
				if (names.includes(cardx.name)) {
					return false;
				}
				if (player.hasUseTarget(cardx)) {
					return true;
				}
				names.add(cardx.name);
				return false;
			});
			if (!card) {
				return;
			}

			const info = get.info(card);
			const targets = game.filterPlayer(current => {
				return lib.filter.filterTarget(card, player, current);
			});

			if (!targets.length) {
				return;
			}

			targets.sort(lib.sort.seat);
			const select = get.select(info.selectTarget);
			if (select[0] == -1 || select[1] == -1) {
				await player.useCard(card, targets, "noai");
				return;
			}
			if (targets.length >= select[0]) {
				const num = select[0] + Math.floor(Math.random() * (select[1] - select[0] + 1));
				await player.useCard(card, targets.randomGets(num), "noai");
			}
		},
	}
```

## ns_yangyi 名字:杨仪 势力:shu

### nsjuanli 名字:狷戾
描述: 出牌阶段限一次，你可以和一名有手牌的其他角色进行赌牌，若你赢，目标角色失去1点体力且该角色与你距离-1直到与你下次赌牌，若你没赢，目标角色回复1点体力，且该角色与你距离+1直到与你的下次赌牌。（赌牌:赌牌的两名角色分别亮开一张手牌，若花色相同则赌牌平局，若花色不同，则依次亮出牌堆顶的牌直到翻开的牌与其中一人亮出牌的花色相同，则该角色获得赌牌的胜利）
```js
nsjuanli: {
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countCards("h");
		},
		filter(event, player) {
			return player.countCards("h");
		},
		init(player) {
			player.storage.nsjuanli_win = [];
			player.storage.nsjuanli_lose = [];
		},
		intro: {
			content(storage, player) {
				var str = "";
				if (player.storage.nsjuanli_win.length) {
					str += get.translation(player.storage.nsjuanli_win) + "与你距离-1直到与你下次赌牌";
				}
				if (player.storage.nsjuanli_lose.length) {
					if (str.length) {
						str += "；";
					}
					str += get.translation(player.storage.nsjuanli_lose) + "与你距离+1直到与你下次赌牌";
				}
				return str;
			},
		},
		onremove: ["nsjuanli_win", "nsjuanli_lose"],
		async content(event, trigger, player) {
			const { target } = event;
			const prompt2 = "赌牌的两名角色分别亮开一张手牌，若花色相同则赌牌平局，若花色不同，则依次亮出牌堆顶的牌直到翻开的牌与其中一人亮出牌的花色相同，则该角色获得赌牌的胜利";
			let result;

			player.storage.nsjuanli_win.remove(target);
			player.storage.nsjuanli_lose.remove(target);

			result = await player.chooseCard("h", true).set("prompt2", prompt2).forResult();
			if (!result.bool) {
				return;
			}
			const card1 = result.cards[0];

			result = await target.chooseCard("h", true).set("prompt2", prompt2).forResult();
			if (!result.bool) {
				return;
			}
			const card2 = result.cards[0];

			player.$compare(card1, target, card2);
			await game.delay(0, 1500);
			game.log(player, "亮出的牌为", card1);
			game.log(target, "亮出的牌为", card2);

			const suit1 = get.suit(card1);
			const suit2 = get.suit(card2);

			if (suit1 == suit2) {
				game.broadcastAll(function (str) {
					const dialog = ui.create.dialog(str);
					dialog.classList.add("center");
					setTimeout(function () {
						dialog.close();
					}, 1000);
				}, "平局");
				await game.delay(2);
				if (!player.storage.nsjuanli_win.length && !player.storage.nsjuanli_lose.length) {
					player.unmarkSkill("nsjuanli");
				}
				return;
			}

			const cards = [];
			for (let i = 0; i < 1000; i++) {
				const drawn = get.cards();
				if (!drawn || !drawn.length) {
					break;
				}
				const current = drawn[0];
				current.discard();
				cards.push(current);

				const suit = get.suit(current);
				if (suit == suit1) {
					await player.showCards(cards, get.translation(player) + "赌牌获胜");
					player.storage.nsjuanli_win.add(target);
					await target.loseHp();
					player.markSkill("nsjuanli");
					break;
				}
				if (suit == suit2) {
					await player.showCards(cards, get.translation(target) + "赌牌获胜");
					player.storage.nsjuanli_lose.add(target);
					await target.recover();
					player.markSkill("nsjuanli");
					break;
				}
			}
		},
		mod: {
			globalTo(from, to, distance) {
				if (to.storage.nsjuanli_win && to.storage.nsjuanli_win.includes(from)) {
					return distance - 1;
				}
				if (to.storage.nsjuanli_lose && to.storage.nsjuanli_lose.includes(from)) {
					return distance + 1;
				}
			},
		},
		ai: {
			order: 4,
			result: {
				target(player, target) {
					if (target.isHealthy()) {
						return -1 / (1 + target.hp);
					} else {
						return -0.3 / (1 + target.hp);
					}
				},
			},
		},
	}
```

### nsyuanchou 名字:远筹
描述: 锁定技，当你成为锦囊牌的目标时，若来源角色与你的距离大于1，则取消之。
```js
nsyuanchou: {
		trigger: { target: "useCardToBefore" },
		forced: true,
		priority: 15,
		check(event, player) {
			return get.effect(event.target, event.card, event.player, player) < 0;
		},
		filter(event, player) {
			return get.type(event.card, "trick") == "trick" && get.distance(event.player, player) > 1;
		},
		async content(event, trigger, player) {
			trigger.cancel();
		},
		ai: {
			effect: {
				target_use(card, player, target, current) {
					if (get.type(card, "trick") == "trick" && get.distance(player, target) > 1) {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

## ns_liuzhang 名字:刘璋 势力:qun

### nsanruo 名字:暗弱
描述: 锁定技，你手牌中的【杀】和普通锦囊牌(借刀杀人等带有指向目标的锦囊除外)均对你不可见。但你可以正常使用之。
```js
nsanruo: {
		unique: true,
		locked: true,
		init(player) {
			if (!player.node.handcards1.cardMod) {
				player.node.handcards1.cardMod = {};
			}
			if (!player.node.handcards2.cardMod) {
				player.node.handcards2.cardMod = {};
			}
			var cardMod = function (card) {
				if (get.info(card).multitarget) {
					return;
				}
				if (card.name == "sha" || get.type(card) == "trick") {
					return ["暗弱", "杀或普通锦囊牌对你不可见"];
				}
			};
			player.node.handcards1.cardMod.nsanruo = cardMod;
			player.node.handcards2.cardMod.nsanruo = cardMod;
			player.node.handcards1.classList.add("nsanruo");
			player.node.handcards2.classList.add("nsanruo");
			if (!ui.css.nsanruo) {
				ui.css.nsanruo = lib.init.sheet('.handcards.nsanruo>.card[data-card-type="trick"]:not(*[data-card-multitarget="1"])>*,' + '.handcards.nsanruo>.card[data-card-name="sha"]>*{visibility:hidden !important}');
			}
		},
		onremove(player) {
			player.node.handcards1.classList.remove("nsanruo");
			player.node.handcards2.classList.remove("nsanruo");
			delete player.node.handcards1.cardMod.nsanruo;
			delete player.node.handcards2.cardMod.nsanruo;
		},
		ai: {
			neg: true,
		},
	}
```

### nsxunshan 名字:循善
描述: 锁定技，你使用【暗弱】牌可以为其指定任意名合法目标（托管无效）。
```js
nsxunshan: {
		mod: {
			selectTarget(card, player, range) {
				if (!player.hasSkill("nsanruo")) {
					return;
				}
				if (_status.auto) {
					return;
				}
				if (get.position(card) != "h" || get.owner(card) != player) {
					return;
				}
				if (get.info(card).multitarget) {
					return;
				}
				if (card.name == "sha" || get.type(card) == "trick") {
					range[1] = game.countPlayer();
				}
			},
		},
		ai: {
			combo: "nsanruo",
		},
	}
```

### nskaicheng 名字:开城
描述: 主公技，你的回合内，你可以将一张【暗弱】牌交给一名群势力其他角色观看，其可以选择是否告诉你此牌的名字。然后你选择一项：使用这张牌并摸一张牌；或结束此回合。
```js
nskaicheng: {
		enable: "phaseUse",
		usable: 1,
		zhuSkill: true,
		filter(event, player) {
			if (!player.hasZhuSkill("nskaicheng")) {
				return false;
			}
			if (
				!player.hasCard(function (card) {
					if (get.info(card).multitarget) {
						return false;
					}
					return card.name == "sha" || get.type(card) == "trick";
				})
			) {
				return false;
			}
			return game.hasPlayer(function (current) {
				return current != player && current.group == "qun";
			});
		},
		filterCard(card) {
			if (get.info(card).multitarget) {
				return false;
			}
			return card.name == "sha" || get.type(card) == "trick";
		},
		filterTarget(card, player, target) {
			return player != target && target.group == "qun";
		},
		lose: false,
		async content(event, trigger, player) {
			const { target, cards } = event;
			let result;

			// step 0
			result = await target
				.chooseBool("是否将" + get.translation(cards) + "告知" + get.translation(player))
				.set("ai", () => get.attitude(target, player) > 0)
				.forResult();

			// step 1
			if (!player.hasUseTarget(cards[0])) {
				if (result.bool) {
					result = await player
						.chooseControl("确定")
						.set("prompt", "你展示的手牌为" + get.translation(cards))
						.forResult();
				} else {
					event.hidden = true;
					result = await player
						.chooseControl("确定")
						.set("prompt", get.translation(target) + "拒绝告知你卡牌信息")
						.forResult();
				}
			} else {
				if (result.bool) {
					result = await player.chooseBool("是否使用展示的牌？", "你展示的手牌为" + get.translation(cards) + "。如果你使用此牌，则在结算后摸一张牌；如果你不使用此牌，则结束出牌阶段").forResult();
				} else {
					event.hidden = true;
					result = await player.chooseBool("是否使用展示的牌？", get.translation(target) + "拒绝告知你卡牌信息。如果你使用此牌，则在结算后摸一张牌；如果你不使用此牌，则结束出牌阶段").forResult();
				}
			}

			// step 2
			if (result.bool) {
				await player.chooseUseTarget(true, cards[0], event.hidden ? "选择此牌的目标" : null);
			} else {
				const evt = _status.event.getParent("phaseUse");
				if (evt) {
					evt.skipped = true;
				}
				return;
			}

			// step 3
			await player.draw();
		},
		ai: {
			combo: "nsanruo",
		},
	}
```

## ns_xinnanhua 名字:南华老仙 势力:qun

### ns_xiandao 名字:仙道
描述: <font color=#f00>锁定技</font> 游戏开始、你进入游戏时和回合结束阶段，你随机获得技能〖雷击〗或〖鬼道〗，直到下个出牌阶段阶段开始。你防止受到任何属性伤害。
```js
ns_xiandao: {
		audio: ["huashen", 2],
		forced: true,
		noRemove: true,
		trigger: {
			player: "damageBefore",
		},
		filter(event, player) {
			return event.nature != null;
		},
		async content(event, trigger, player) {
			trigger.cancel();
		},
		ai: {
			nofire: true,
			nothunder: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "natureDamage")) {
						return "zeroplayertarget";
					}
				},
			},
		},
		group: "ns_xiandao_add",
		subSkill: {
			add: {
				audio: ["huashen", 2],
				forced: true,
				priority: 10,
				trigger: {
					global: "gameStart",
					player: ["phaseEnd", "enterGame"],
				},
				async content(event, trigger, player) {
					const n = [1, 2].randomGet();
					if (n === 1) {
						player.addTempSkill("releiji", { player: "phaseUseBegin" });
						player.markSkill("releiji", { player: "phaseUseBegin" });
					} else {
						player.addTempSkill("guidao", { player: "phaseUseBegin" });
						player.markSkill("guidao", { player: "phaseUseBegin" });
					}
				},
			},
		},
	}
```

### ns_xiuzheng 名字:修真
描述: 出牌阶段限一次，你可选择一名其他角色，然后亮出牌堆顶的两张牌，若同为红色，则其受到1点火焰伤害；若同为黑色，其受到1点雷电伤害；若颜色不相同，你弃置其一张牌。然后你获得这两张展示的牌后再弃置两张牌。
```js
ns_xiuzheng: {
		audio: ["xinsheng", 2],
		enable: "phaseUse",
		usable: 1,
		priority: 10,
		filter(event, player) {
			return ui.cardPile.childElementCount + ui.discardPile.childElementCount >= 2;
		},
		filterTarget(card, player, target) {
			return player != target;
		},
		async content(event, trigger, player) {
			const { target } = event;
			const cards = get.cards(2);
			await player.showCards(cards);

			const color1 = get.color(cards[0]);
			const color2 = get.color(cards[1]);

			if (color1 == "red" && color2 == "red") {
				await target.damage({ nature: "fire" });
			}
			if (color1 != color2) {
				await player.discardPlayerCard({
					target,
					position: "he",
					forced: true,
				});
			}
			if (color1 == "black" && color2 == "black") {
				await target.damage({ nature: "thunder" });
			}

			if (cards.length) {
				await player.gain({
					cards,
					animate: "gain2",
				});
				await game.delay();
			}

			await player.chooseToDiscard({
				selectCard: 2,
				position: "he",
				prompt: "请弃置两张牌",
				forced: true,
			});
		},
		ai: {
			threaten: 0.5,
			order: 13,
			result: {
				target(player, target) {
					return get.damageEffect(target, player);
				},
			},
		},
	}
```

### ns_chuanshu 名字:传术
描述: <span class=yellowtext>限定技</span> 当一名其他角色进入濒死状态时，你可以令其选择获得技能〖雷击〗或〖鬼道〗，其回复体力至1并摸两张牌。当该被【传术】的角色造成或受到一次伤害后，你摸一张牌。其阵亡后，你重置技能〖传术〗。
```js
ns_chuanshu: {
		audio: ["xingshuai", 2],
		trigger: { global: "dying" },
		limited: true,
		skillAnimation: true,
		animationColor: "water",
		filter(event, player) {
			return event.player.hp <= 0 && event.player != player;
		},
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const result = await trigger.player
				.chooseControl("releiji", "guidao")
				.set("prompt", "" + get.translation(trigger.player) + "获得一项技能")
				.forResult();
			trigger.player.addSkills(result.control);
			await trigger.player.recover(1 - trigger.player.hp);
			await trigger.player.draw(2);
			trigger.player.storage.ns_chuanshu2 = player;
			trigger.player.addSkill("ns_chuanshu2");
			player.awakenSkill(event.name);
		},
	}
```

## ns_caimao 名字:蔡瑁 势力:qun

### nsdingzhou 名字:定州
描述: 出牌阶段限一次，你可以选择一名区域内有牌的其他角色。你随机获得其区域内的一张牌，然后摸一张牌。若你以此法获得了两张颜色不同的牌，则你失去1点体力。
```js
nsdingzhou: {
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countCards("hej") > 0;
		},
		async content(event, trigger, player) {
			const { target } = event;
			let result;
			let cards = target.getCards("hej");

			if (get.isLuckyStar(player)) {
				const cardx = ui.cardPile.firstChild;
				if (cardx) {
					const color = get.color(cardx);
					const cardsx = cards.filter(i => get.color(i) == color);
					if (cardsx.length > 0) {
						cards = cardsx;
					}
				}
			}

			const card = cards.randomGet();
			event.card = card;
			await player.gain(card, target, "giveAuto", "bySelf");
			result = await player.draw().forResult();

			if (Array.isArray(result?.cards) && get.color(card) != get.color(result.cards[0])) {
				await player.loseHp();
			}
		},
		ai: {
			order: 7,
			result: { target: -1 },
		},
	}
```

## ns_luyusheng 名字:陆郁生 势力:wu

### nshuaishuang 名字:怀霜
描述: 锁定技，结束阶段，你从牌堆/弃牌堆获得一张【桃】，然后失去1点体力。
```js
nshuaishuang: {
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		async content(event, trigger, player) {
			const card = get.cardPile(card => card.name == "tao");
			if (card) {
				await player.gain(card, "gain2");
			} else {
				return;
			}
			game.updateRoundNumber();
			await player.loseHp();
		},
	}
```

### nsfengli 名字:奉礼
描述: 回合结束时，你可以选择一名其他角色并展示所有手牌直到你的下回合开始。当该角色于回合外需要使用或打出牌时，其可暗置你的一张明置手牌，然后视为使用或打出之。当你的明置手牌减少时，你可令一名手牌数小于你的角色摸一张牌。
```js
nsfengli: {
		trigger: { player: "phaseEnd" },
		direct: true,
		filter(event, player) {
			return (
				player.countCards("h") > 0 &&
				game.hasPlayer(function (current) {
					return current != player && !current.hasSkill("nsfengli_use");
				})
			);
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2("nsfengli"), function (card, player, target) {
					return target != player && !target.hasSkill("nsfengli_use");
				})
				.set("ai", function (target) {
					return get.attitude(_status.event.player, target) / (5 + target.countCards("h"));
				})
				.forResult();
			if (result.bool) {
				const target = result.targets[0];
				player.logSkill("nsfengli", target);
				const cards = player.getCards("h");
				player.addShownCards(cards, "visible_nsfengli");
				player.addSkill("nsfengli2");
				target.addSkill("nsfengli_use");
				target.storage.nsfengli_use = player;
			}
		},
		group: ["nsfengli_draw", "nsfengli_clear"],
		onremove(player) {
			player.removeSkill("nsfengli2");
		},
	}
```

## ns_chengpu 名字:铁索程普 势力:wu

### decadelihuo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### decadechunlao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ns_sundeng 名字:画饼孙登 势力:wu

### xinkuangbi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ns_duji 名字:画饼杜畿 势力:wei

### xinfu_andong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### xinyingshi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ns_mengyou 名字:数学孟优 势力:qun

### nsmanzhi 名字:蛮智
描述: 准备阶段或结束阶段开始时，你可以将场上出现的数字代入等式中的A和B。若此等式成立，你摸Y张牌。（等式为Y=0.5A<sup>2</sup>+2.5B-X，其中X为游戏轮数，Y为存活人数）
```js
nsmanzhi: {
		audio: "dcmanzhi",
		trigger: { player: ["phaseZhunbeiBegin", "phaseJieshuBegin"] },
		direct: true,
		filter(event, player) {
			var nums = [];
			game.countPlayer(current => {
				nums.add(current.hp);
				nums.add(current.maxHp);
				nums.add(current.countCards("h"));
				nums.add(current.countCards("e"));
				nums.add(current.countCards("j"));
			});
			for (var a of nums) {
				for (var b of nums) {
					if (0.5 * a * a + 2.5 * b - game.roundNumber == game.countPlayer()) {
						return true;
					}
				}
			}
			return false;
		},
		async content(event, trigger, player) {
			const nums = [];
			game.countPlayer(current => {
				nums.add(current.hp);
				nums.add(current.maxHp);
				nums.add(current.countCards("h"));
				nums.add(current.countCards("e"));
				nums.add(current.countCards("j"));
			});
			nums.sort((a, b) => a - b);

			const roundNumber = game.roundNumber;
			const playerCount = game.countPlayer();

			let a = null;
			let b = null;
			let goon = false;

			for (const valueA of nums) {
				for (const valueB of nums) {
					if (0.5 * valueA * valueA + 2.5 * valueB - roundNumber == playerCount) {
						a = valueA;
						b = valueB;
						goon = true;
						break;
					}
				}
				if (goon) {
					break;
				}
			}

			const result = await player
				.chooseButton(2, [
					"蛮智：请选择让下列等式成立的A与B的值",
					'<div class="text center">目标等式</div>',
					`0.5 × A<sup>2</sup> + 2.5 × B - ${roundNumber} = ${playerCount}`,
					'<div class="text center">A的可选值</div>',
					[
						nums.map(i => {
							return [`A|${i}`, i == a ? `<span class="yellowtext">${i}</span>` : i];
						}),
						"tdnodes",
					],
					'<div class="text center">B的可选值</div>',
					[
						nums.map(i => {
							return [`B|${i}`, i == b ? `<span class="yellowtext">${i}</span>` : i];
						}),
						"tdnodes",
					],
				])
				.set("filterButton", button => {
					if (!ui.selected.buttons.length) {
						return true;
					}
					return button.link[0] != ui.selected.buttons[0].link[0];
				})
				.set("filterOk", () => {
					if (ui.selected.buttons.length != 2) {
						return false;
					}
					let selectedA;
					let selectedB;
					for (const selected of ui.selected.buttons) {
						if (selected.link[0] == "A") {
							selectedA = parseInt(selected.link.slice(2));
						} else {
							selectedB = parseInt(selected.link.slice(2));
						}
					}
					return 0.5 * selectedA * selectedA + 2.5 * selectedB - roundNumber == playerCount;
				})
				.set("choice", [a, b])
				.set("ai", button => {
					const choice = _status.event.choice;
					if (button.link == `A|${choice[0]}` || button.link == `B|${choice[1]}`) {
						return 1;
					}
					return 0;
				})
				.forResult();

			if (result.bool) {
				let selectedA;
				let selectedB;
				for (const link of result.links) {
					if (link[0] == "A") {
						selectedA = parseInt(link.slice(2));
					} else {
						selectedB = parseInt(link.slice(2));
					}
				}
				const equals = `0.5×${selectedA}<sup>2</sup>+2.5×${selectedB}-${roundNumber}=${playerCount}`;
				player.logSkill("nsmanzhi");
				player.chat(equals);
				game.log(player, "的计算结果为", equals);
				await player.draw(playerCount);
			}
		},
	}
```

## junk_zhangrang 名字:新杀张让 势力:qun

### junktaoluan 名字:滔乱
描述: 你可将一张牌当做任意一张基本牌或普通锦囊牌使用（此牌不得是本局游戏你以此法使用过的牌，且每回合每种花色限一次），然后你令一名其他角色选择一项：1.交给你一张与“滔乱”声明的牌类别不同的牌；2.本回合“滔乱”失效且回合结束时你失去1点体力。
```js
junktaoluan: {
		hiddenCard(player, name) {
			return !player.getStorage("junktaoluan").includes(name) && player.countCards("hes", card => !player.getStorage("junktaoluan2").includes(get.suit(card))) > 0 && !player.hasSkill("junktaoluan3") && lib.inpile.includes(name);
		},
		audio: "taoluan",
		enable: "chooseToUse",
		filter(event, player) {
			return (
				!player.hasSkill("junktaoluan3") &&
				player.countCards("hes", card => {
					return lib.inpile.some(name => {
						if (player.getStorage("junktaoluan2").includes(get.suit(card))) {
							return false;
						}
						if (player.getStorage("junktaoluan").includes(name)) {
							return false;
						}
						if (get.type(name) != "basic" && get.type(name) != "trick") {
							return false;
						}
						if (
							event.filterCard(
								{
									name: name,
									isCard: true,
									cards: [card],
								},
								player,
								event
							)
						) {
							return true;
						}
						if (name == "sha") {
							for (var nature of lib.inpile_nature) {
								if (
									event.filterCard(
										{
											name: name,
											nature: nature,
											isCard: true,
											cards: [card],
										},
										player,
										event
									)
								) {
									return true;
								}
							}
						}
						return false;
					});
				}) > 0
			);
		},
		chooseButton: {
			dialog(event, player) {
				var list = [];
				for (var name of lib.inpile) {
					if (get.type(name) == "basic" || get.type(name) == "trick") {
						if (player.getStorage("junktaoluan").includes(name)) {
							continue;
						}
						list.push([get.translation(get.type(name)), "", name]);
						if (name == "sha") {
							for (var j of lib.inpile_nature) {
								list.push(["基本", "", "sha", j]);
							}
						}
					}
				}
				return ui.create.dialog("滔乱", [list, "vcard"]);
			},
			filter(button, player) {
				return _status.event.getParent().filterCard({ name: button.link[2] }, player, _status.event.getParent());
			},
			check(button) {
				var player = _status.event.player;
				var card = {
					name: button.link[2],
					nature: button.link[3],
				};
				if (player.countCards("hes", cardx => cardx.name == card.name)) {
					return 0;
				}
				return _status.event.getParent().type == "phase" ? player.getUseValue(card) : 1;
			},
			backup(links, player) {
				return {
					filterCard(card, player) {
						return !player.getStorage("junktaoluan2").includes(get.suit(card));
					},
					audio: "taoluan",
					popname: true,
					check(card) {
						return 7 - get.value(card);
					},
					position: "hse",
					viewAs: { name: links[0][2], nature: links[0][3] },
					onuse(result, player) {
						player.markAuto("junktaoluan2", [get.suit(result.cards[0], player)]);
						var evt = _status.event.getParent("phase");
						if (evt && evt.name == "phase" && !evt.junktaoluan) {
							evt.junktaoluan = true;
							var next = game.createEvent("taoluan_clear");
							_status.event.next.remove(next);
							evt.after.push(next);
							next.player = player;
							next.setContent(async (event, trigger, player) => {
								delete player.storage.junktaoluan2;
							});
						}
						player.markAuto("junktaoluan", [result.card.name]);
					},
				};
			},
			prompt(links, player) {
				return "将一张牌当做" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
			},
		},
		ai: {
			order: 4,
			save: true,
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (!player.countCards("hes", card => !player.getStorage("junktaoluan2").includes(get.suit(card))) || player.hasSkill("taoluan3")) {
					return false;
				}
				if (tag == "respondSha" || tag == "respondShan") {
					if (arg == "respond") {
						return false;
					}
					return !player.getStorage("taoluan").includes(tag == "respondSha" ? "sha" : "shan");
				}
				return !player.getStorage("taoluan").includes("tao") || (!player.getStorage("taoluan").includes("jiu") && arg == player);
			},
			result: {
				player(player) {
					var players = game.filterPlayer();
					for (var i = 0; i < players.length; i++) {
						if (players[i] != player && players[i].countCards("he") && get.attitude(player, players[i]) > 0) {
							return 1;
						}
					}
					return 0;
				},
			},
			threaten: 1.9,
		},
		group: "junktaoluan2",
	}
```

## old_bulianshi 名字:RE步练师 势力:wu

### anxu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### zhuiyi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_maliang 名字:OL马良 势力:shu

### zishu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### xinyingyuan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## junk_liubei 名字:旧界刘备 势力:shu

### junkrende 名字:仁德
描述: 出牌阶段限一次，你可以将任意张手牌交给其他角色。若你给出的牌多于一张，则你回复1点体力。
```js
junkrende: {
		audio: "rende",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		filterTarget: lib.filter.notMe,
		filterCard: true,
		selectCard: [1, Infinity],
		allowChooseAll: true,
		position: "h",
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const { cards, target, targets } = event;
			const assignedTargets = targets.slice(0);
			let result;

			event.num = cards.length;
			event.targets = assignedTargets;

			await player.give(cards, target);
			if (event.num > 1) {
				await player.recover();
			}

			while (player.countCards("h") > 0 && game.hasPlayer(current => current != player && !assignedTargets.includes(current))) {
				result = await player
					.chooseCardTarget({
						prompt: "是否继续分配剩余的手牌",
						prompt2: "操作提示：请先选择要分配的手牌，然后再选择一名角色，该角色将获得你选择的所有手牌。",
						filterCard: true,
						selectCard: [1, Infinity],
						filterTarget(card, player, target) {
							return target != player && !assignedTargets.includes(target);
						},
					})
					.forResult();

				if (!result.bool) {
					break;
				}

				const currentTarget = result.targets[0];
				const selectedCards = result.cards;

				player.line(currentTarget, "green");
				await player.give(selectedCards, currentTarget);
				assignedTargets.push(currentTarget);

				const prevNum = event.num;
				event.num += selectedCards.length;

				if (prevNum < 2 && event.num > 1) {
					await player.recover();
				}
			}
		},
	}
```

### jijiang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## junk_huangyueying 名字:旧界黄月英 势力:shu

### junkjizhi 名字:集智
描述: 当你使用非转化的普通锦囊牌时，你可以亮出牌堆顶的一张牌A。若A不为基本牌，则你获得A。否则你选择一项：⒈将A置入弃牌堆。⒉将一张手牌置于牌堆顶，然后获得A。
```js
junkjizhi: {
		audio: "jizhi",
		trigger: { player: "useCard" },
		frequent: true,
		filter(event, player) {
			return get.type(event.card) == "trick" && event.card.isCard;
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			const card = get.cards()[0];
			await game.cardsGotoOrdering(card);
			await player.showCards(card, get.translation(player) + "发动了【集智】");

			if (get.type(card) !== "basic") {
				await player.gain(card, "gain2");
				return;
			}
			if (!player.countCards("h")) {
				return;
			}

			// step 1
			result = await player.chooseCard("h", "是否用一张手牌交换" + get.translation(card) + "？", "若选择「取消」，则" + get.translation(card) + "将被置入弃牌堆。").forResult();

			// step 2
			if (result.bool && result.cards?.length) {
				const handcard = result.cards[0];
				player.$throw(handcard, 1000);
				game.log(player, "将", handcard, "置于牌堆顶");
				await player.lose(handcard, ui.cardPile, "visible", "insert");
				await player.gain(card, "gain2");
			}
		},
	}
```

### junkqicai 名字:奇才
描述: 锁定技。①你使用锦囊牌无距离限制。②你装备区内的非坐骑牌不能被其他角色弃置。
```js
junkqicai: {
		mod: {
			targetInRange(card, player, target, now) {
				var type = get.type(card);
				if (type == "trick" || type == "delay") {
					return true;
				}
			},
			canBeDiscarded(card, player, target) {
				if (get.position(card) == "e" && !get.subtypes(card).some(subtype => ["equip3", "equip4", "equip6"].includes(subtype)) && player != target) {
					return false;
				}
			},
		},
	}
```

## junk_lidian 名字:OL李典 势力:wei

### xunxun
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### junkwangxi 名字:忘隙
描述: 当你对其他角色造成1点伤害后，或受到其他角色造成的1点伤害后，你可以摸两张牌，然后交给其其中一张牌。
```js
junkwangxi: {
		audio: "wangxi",
		inherit: "wangxi",
		async content(event, trigger, player) {
			const target = get.info(event.name).logTarget(trigger, player);
			const result = await player.draw(2).forResult();
			if (get.itemtype(result.cards) == "cards" && target.isIn() && player.hasCard(card => result.cards.includes(card), "he")) {
				await player.chooseToGive(target, "he", true, card => get.event().cards?.includes(card)).set("cards", result.cards);
			}
		},
	}
```

## junk_duanwei 名字:牢段煨 势力:qun

### langmie
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## junk_xuyou 名字:手杀许攸 势力:qun

### nzry_chenglve
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### junkshicai 名字:恃才
描述: 当你使用牌结算完毕后，若此牌与你本回合使用的牌类型均不同，则你可以将此牌置于牌堆顶，然后摸一张牌。
```js
junkshicai: {
		audio: "nzry_shicai_2",
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			if (!event.cards.filterInD("oe").length) {
				return false;
			}
			return player.getHistory("useCard", evt => get.type2(evt.card) == get.type2(event.card)).indexOf(event) == 0;
		},
		prompt2(event, player) {
			const cards = event.cards.filterInD("oe");
			return "你可以将" + get.translation(cards) + (cards.length > 1 ? "以任意顺序" : "") + "置于牌堆顶，然后摸一张牌";
		},
		async content(event, trigger, player) {
			let result;
			let cards = trigger.cards.filterInD("oe");
			/** @type {[Player, Card[]][]} */
			const loseList = [];

			for (const card of cards) {
				const owner = get.owner(card);
				if (!owner) {
					continue;
				}
				const existed = loseList.find(item => item[0] == owner);
				if (existed) {
					existed[1].push(card);
				} else {
					loseList.push([owner, [card]]);
				}
			}

			if (loseList.length) {
				await game
					.loseAsync({
						lose_list: loseList,
					})
					.setContent("chooseToCompareLose");
			}

			if (cards.length > 1) {
				result = await player
					.chooseToMove({ prompt: "恃才：将牌按顺序置于牌堆顶" })
					.set("list", [["牌堆顶", cards]])
					.set("reverse", _status.currentPhase?.next ? get.attitude(player, _status.currentPhase.next) > 0 : false)
					.set("processAI", list => {
						const sorted = list[0][1].slice(0);
						sorted.sort((a, b) => {
							return (_status.event.reverse ? 1 : -1) * (get.value(b) - get.value(a));
						});
						return [sorted];
					})
					.forResult();

				if (result.bool && result.moved && result.moved[0].length) {
					cards = result.moved[0].slice(0);
				}
			}

			cards.reverse();
			await game.cardsGotoPile(cards, "insert");
			game.log(player, "将", cards, "置于了牌堆顶");
			await player.draw();
		},
		ai: {
			reverseOrder: true,
			skillTagFilter(player) {
				if (
					player.getHistory("useCard", function (evt) {
						return get.type(evt.card) == "equip";
					}).length > 0
				) {
					return false;
				}
			},
		},
	}
```

### nzry_cunmu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## junk_guanyu 名字:旧谋关羽 势力:shu

### olsbfumeng
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### olsbguidao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## junk_liuyan 名字:OL刘焉 势力:qun

### olpianan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### olyinji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### olkuisi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## zhangren 名字:zhangren 势力:qun

### chuanxin
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### zfengshi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

