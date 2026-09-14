# sixiang merged reference

## std_kebineng 名字:标轲比能 势力:qun

### stdkoujing 名字:寇旌
描述: 出牌阶段限一次，你可以将任意张手牌当作一张 无距离次数限制的【杀】使用；其他角色受到此【杀】造成的伤害后，其可以与你交换手牌。
```js
stdkoujing: {
		audio: "kousheng",
		enable: "phaseUse",
		usable: 1,
		group: ["stdkoujing_effect"],
		selectCard: [1, Infinity],
		position: "hs",
		filterCard: true,
		check(card) {
			return 6 - get.value(card);
		},
		viewAsFilter(player) {
			return player.countCards("hs") > 0;
		},
		viewAs(cards, player) {
			if (cards.length) {
				return {
					name: "sha",
					storage: {
						stdkoujing: player,
					}
				}
			}
			return null;
		},
		mod: {
			cardUsable(card, player) {
				if (card.storage?.stdkoujing) {
					return Infinity;
				}
			},
			targetInRange(card, player) {
				if (card.storage?.stdkoujing) {
					return true;
				}
			}
		},
		ai: {
			order: 3,
			result: {
				player: 1,
			}
		},
		subSkill: {
			effect: {
				audio: "kousheng",
				trigger: {
					global: ["damageEnd"],
				},
				filter(event, player) {
					return event.card?.storage?.stdkoujing == player;
				},
				async cost(event, trigger, player) {
					const target = trigger.player;
					event.result = await target
						.chooseBool({
							prompt: `寇旌：是否与${get.translation(target)}交换手牌`,
							choice: target.countCards("h") < player.countCards("h") && get.attitude(target, player) <= 0,
						})
						.forResult();
				},
				logTarget: "player",
				async content(event, trigger, player) {
					await event.targets[0].swapHandcards(player);
				},
			},
		},
	}
```

## std_niujin 名字:标牛金 势力:wei

### stdcuorui 名字:挫锐
描述: 游戏开始时和当你杀死其他角色时，你可以将手牌摸至X张（X为场上角色数且至多为7）
```js
stdcuorui: {
		audio: "cuorui",
		trigger: {
			global: ["phaseBefore"],
			source: ["die"],
			player: ["enterGame"],
		},
		check: () => true,
		frequent: true,
		filter(event, player, name) {
			if (player.countCards("h") >= Math.min(7, game.players.length)) {
				return false;
			}
			if (event.name != "die") {
				return game.phaseNumber == 0 || event.name != "phase";
			}
			return !event.reserveOut;
		},
		async content(event, trigger, player) {
			const num = Math.min(7, game.players.length);
			await player.drawTo(num);
		},
	}
```

## std_ganfuren 名字:标甘夫人 势力:shu

### stdzhijie 名字:智诫
描述: 每轮限一次，一名角色出牌阶段开始时，你可以展示其一张手牌。其此阶段前三次使用与此牌类别相同的牌时，你摸一张牌。 
```js
stdzhijie: {
		audio: "mbzhijie",
		trigger: {
			global: ["phaseUseBegin"],
		},
		round: 1,
		filter(event, player) {
			return event.player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.choosePlayerCard({
					prompt: get.prompt2(event.skill, trigger.player),
					target: trigger.player,
					position: "h",
					ai(button) {
						if (get.attitude(get.player(), get.event().target) > 0) {
							return get.event().target.getUseValue(button.link);
						}
						return 0;
					},
				})
				.set("target", trigger.player)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const {
				cards: [card],
				targets: [target],
			} = event;
			await player.showCards(card, `${get.translation(player)}对${get.translation(target)}发动了【智诫】`);
			const type = get.type2(card);
			player.addTempSkill(`${event.name}_effect`, "phaseChange");
			player.setStorage(`${event.name}_effect`, [target, type], true);
		},
		subSkill: {
			effect: {
				audio: "mbzhijie",
				charlotte: true,
				trigger: {
					global: ["useCard"],
				},
				forced: true,
				filter(event, player) {
					const storage = player.getStorage("stdzhijie_effect");
					if (event.player != storage[0]) {
						return false;
					}
					const index =
						event.player
							.getHistory("useCard", evt => {
								let type = get.type2(evt.card);
								return evt.isPhaseUsing(event.player) && type == storage[1];
							})
							.indexOf(event) + 1;
					return index > 0 && index < 4;
				},
				async content(event, trigger, player) {
					await player.draw({ nodelay: true });
				},
				intro: {
					markcount: () => 0,
					content(storage) {
						return `${get.translation(storage[0])}前三次使用${get.translation(storage[1])}牌，你摸一张牌`;
					},
				},
			},
		},
	}
```

### stdshushenx 名字:淑慎
描述: 每回合结束时，若你于此回合获得了三张或更多牌，你可以令一名其他角色回复1点体力。
```js
stdshushenx: {
		audio: "mbshushen",
		trigger: {
			global: ["phaseEnd"],
		},
		filter(event, player) {
			return player.getStat()?.gain > 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: lib.filter.notMe,
					ai(target) {
						return get.recoverEffect(target, get.player(), get.player());
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await event.targets[0].recover();
		},
	}
```

## std_wangshen 名字:标王沈 势力:wei

### stdanran 名字:岸然
描述: 当你受到伤害后，你可以摸一张牌，然后下次以此法摸牌数+1（至多四张）。 
```js
stdanran: {
		audio: "clananran",
		trigger: {
			player: ["damageEnd"],
		},
		check: () => true,
		frequent: true,
		async content(event, trigger, player) {
			const num = Math.min(player.countMark(event.name + "_used") + 1, 4);
			await player.draw({ num });
			if (player.countMark(event.name + "_used") < 3) {
				player.addSkill(event.name + "_used");
				player.addMark(event.name + "_used", 1, false);
			}
		},
		subSkill: {
			used: {
				onremove: true,
				charlotte: true,
				intro: {
					markcount: storage => storage + 1,
					content: storage => `当前摸牌数：${storage + 1}`,
				},
			},
		},
	}
```

### stdgaobian 名字:告变
描述: 锁定技，其他角色回合结束时，若本回合仅有一名角色受到过伤害，此受伤角色选择使用本回合进入弃牌堆的一张【杀】或重置“岸然”。
```js
stdgaobian: {
		audio: "clangaobian",
		trigger: {
			global: ["phaseEnd"],
		},
		filter(event, player) {
			if (event.player == player) {
				return false;
			}
			const targets = game.filterPlayer2(target => target.hasHistory("damage"));
			return targets.length == 1 && targets[0]?.isIn();
		},
		forced: true,
		async content(event, trigger, player) {
			const target = game.findPlayer2(target => target.hasHistory("damage"));
			if (!target) {
				return;
			}
			let discarded = _status.discarded.filter(c => c.name == "sha");
			let bool = discarded.some(c => target.hasUseTarget(c));
			let num = get.attitude(target, player);
			let result = bool
				? await target
						.chooseButton({
							createDialog: [
								"选择一项",
								[
									[
										["sha", "使用本回合进入弃牌堆的一张【杀】"],
										["re", `重置${get.translation(player)}的〖岸然〗`],
									],
									"textbutton",
								],
							],
							forced: true,
							ai(button) {
								const { player, discarded: cards, attitude: num } = get.event();
								return {
									sha: Math.max(...cards.map(card => player.getUseValue(card))),
									re: num,
								}[button.link];
							},
						})
						.set("discarded", discarded)
						.set("attitude", num)
						.forResult()
				: {
						bool: true,
						links: ["re"],
					};
			if (result.links?.[0] == "sha") {
				const result2 = await target
					.chooseCardButton({
						prompt: "告变：请选择其中一张【杀】使用",
						cards: discarded,
						forced: true,
					})
					.set("filterButton", button => {
						return get.player().hasUseTarget(button.link);
					})
					.set("ai", button => {
						return get.player().getUseValue(button.link);
					})
					.forResult();
				if (result2?.bool && result2.links?.length) {
					await target.chooseUseTarget(result2.links[0], true, false);
				}
			} else {
				player.refreshSkill("stdanran");
			}
		},
	}
```

## std_caojinyu 名字:标曹金玉 势力:wei

### stdyuqi 名字:隅泣
描述: 与你距离小于等于你当前体力的角色受到伤害后，你可以令其摸一张牌。
```js
stdyuqi: {
		audio: "yuqi",
		trigger: {
			global: ["damageEnd"],
		},
		filter(event, player) {
			return get.distance(event.player, player) <= player.getHp() && event.player.isIn();
		},
		logTarget: "player",
		check(event, player) {
			return get.effect(event.player, { name: "draw" }, player, player) > 0;
		},
		async content(event, trigger, player) {
			await event.targets[0].draw();
		},
	}
```

### stdshanshen 名字:善身
描述: 当一名角色死亡时，若伤害来源不是你，你可以回复1点体力。
```js
stdshanshen: {
		audio: "shanshen",
		trigger: {
			global: ["die"],
		},
		filter(event, player) {
			return !event.reserveOut && event.reason?.source != player && player.isDamaged();
		},
		logTarget: "player",
		check: () => true,
		async content(event, trigger, player) {
			await player.recover();
		},
	}
```

## std_lvboshe 名字:标吕伯奢 势力:qun

### stdfushi 名字:缚豕
描述: 你与其距离1以内的角色每回合首次使用的【杀】 结算完成后，你获得之。你可以将任意张【杀】当成一张可以指定至多等量名目标的【杀】使用。
```js
stdfushi: {
		audio: "olfushi",
		enable: ["chooseToUse"],
		viewAsFilter(player) {
			return player.hasCard("sha", "hs");
		},
		selectCard: [1, Infinity],
		filterCard(card, player) {
			return get.name(card) == "sha";
		},
		selectTarget: () => [1, ui.selected.cards.length],
		complexCard: true,
		viewAs: {
			name: "sha",
		},
		group: ["stdfushi_effect"],
		subSkill: {
			effect: {
				trigger: {
					global: ["useCardAfter"],
				},
				forced: true,
				filter(event, player) {
					return (
						event.cards.length > 0 &&
						get.distance(player, event.player) <= 1 &&
						event.player.getHistory("useCard", evt => evt.card.name == "sha").indexOf(event) == 0
					);
				},
				async content(event, trigger, player) {
					await player.gain({
						cards: trigger.cards,
						animate: "gain2"
					});
				},
			},
		},
	}
```

## std_wuke 名字:标吴珂 势力:wu

### stdanda 名字:谙达
描述: 每轮限一次，当一名角色进入濒死时，你可以令伤害来源交给其一张牌，否则其回复1点体力。
```js
stdanda: {
		audio: "mbanda",
		trigger: {
			global: ["dying"],
		},
		round: 1,
		filter(event, player) {
			return event.source?.isIn();
		},
		logTarget: "player",
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		async content(event, trigger, player) {
			const { targets: [target] } = event;
			const { source } = trigger;
			let result = await source
				.chooseToGive({
					prompt: `交给${get.translation(target)}一张牌否则其回复1点体力`,
					target,
					position: "he",
					ai(card) {
						const { player, target } = get.event();
						if (get.recoverEffect(target, player, player) > 0) {
							return 0;
						}
						return get.tag(card, "save") ? 5.5 - get.value(card) : 7.5 - get.value(card);
					}
				})
				.forResult();
			if (!result.bool) {
				await target.recover();
			}
		},
	}
```

### stdzhuguo 名字:助国
描述: 出牌阶段限一次，你可以令一名角色将手牌摸至两张。
```js
stdzhuguo: {
		audio: "mbzhuguo",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(target => target.countCards("h") < 2);
		},
		filterTarget(card, player, target) {
			return target.countCards("h") < 2;
		},
		async content(event, trigger, player) {
			await event.targets[0].drawTo(2);
		},
	}
```

## std_huangwudie 名字:标黄舞蝶 势力:shu

### stdshuangrui 名字:双锐
描述: 准备阶段，你可以将任意张手牌当一张【杀】使用，若目标角色手牌数与你相同，此【杀】不能被响应。
```js
stdshuangrui: {
		audio: "dcshuangrui",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("h");
		},
		direct: true,
		clearTime: true,
		async content(event, trigger, player) {
			await player
				.chooseToUse()
				.set("openskilldialog", `###${get.prompt(event.name)}###将任意张手牌当作【杀】使用`)
				.set("norestore", true)
				.set("_backupevent", `${event.name}_backup`)
				.set("custom", {
					add: {},
					replace: { window() {} },
				})
				.backup(`${event.name}_backup`)
				.set("targetRequired", true)
				.set("complexTarget", true)
				.set("complexSelect", true)
				.set("addCount", false)
				.set("logSkill", event.name);
		},
		/*ai: {
			effect: {
				player_use(card, player, target) {
					const hs = player.countCards("h"),
						evt = _status.event,
						selected = ui.selected.cards;
					if (evt.name == "chooseToUse" && evt.player == player && evt.skill == "stdshuangrui_backup") {
						if (hs.length - selected.length == target.countCards("h")) {
							return [1, 0.3];
						}
					}
				},
			},
		},*/
		subSkill: {
			backup: {
				filterCard(card) {
					return get.itemtype(card) == "card";
				},
				viewAs: {
					name: "sha",
				},
				selectCard: [1, Infinity],
				position: "h",
				precontent(event, trigger, player) {
					player
						.when("useCard")
						.filter(evt => evt.getParent() == event.getParent())
						.step(async (event, trigger, player) => {
							const num = player.countCards("h");
							if (trigger.targets?.some(target => target.countCards("h") === num)) {
								trigger.directHit.addArray(game.players);
								game.log(trigger.card, "不可被响应");
							}
						});
				},
				ai1(card) {
					if (ui.selected.cards.length) {
						return 0;
					}
					return 5 - get.value(card);
				},
			},
		},
	}
```

## std_qinghegongzhu 名字:标清河公主 势力:wei

### stdzengou 名字:谮构
描述: 出牌阶段限一次，你可观看一名角色的手牌并展示其中两张牌，然后你视为使用一张与展示牌牌名不同的基本牌，否则其摸一张牌。
```js
stdzengou: {
		audio: "mbzengou",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(target => target.countCards("h"));
		},
		filterTarget(card, player, target) {
			return target.countCards("h");
		},
		async content(event, trigger, player) {
			const { target } = event;
			const cards = target.getCards("h");
			if (!cards.length) {
				delete player.getStat()["stdzengou"];
				return;
			}
			let result;
			if (cards.length <= 2) {
				await player.viewHandcards(target);
				result = { bool: true, links: cards };
			} else {
				result = await player
					.chooseCardButton(`谮构：请选择要展示的两张牌`, 2, true, cards)
					.set("ai", button => {
						if (get.type(button.link) == "basic" && !["shan", "du"].includes(get.name(button.link))) {
							return 0;
						}
						return get.value(button.link);
					})
					.forResult();
				cards.forEach(card => card.addKnower(player));
			}
			if (result?.links?.length) {
				const shown = result.links;
				await player.showCards(shown, `${get.translation(player)}展示了${get.translation(target)}的牌`);
				const names = shown.map(card => get.name(card, target));
				const viewAs = info => get.autoViewAs({ name: info[2], nature: info[3], isCard: true });
				const list = get.inpileVCardList(info => {
					if (info[0] == "basic" && !names.includes(info[2])) {
						return player.hasUseTarget(viewAs(info), false, false);
					}
				});
				if (!list.length) {
					player.popup("杯具");
					await target.draw();
					return;
				}
				const result2 = await player
					.chooseButton([`谮构：请选择要视为使用的基本牌`, [list, "vcard"]], true)
					.set("viewAs", viewAs)
					.set("ai", button => get.player().getUseValue(get.event().viewAs(button.link)))
					.forResult();
				if (result2.links?.length) {
					await player.chooseUseTarget(viewAs(result2.links[0]), true);
				}
			}
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					return -target.countCards("h");
				},
			},
		},
	}
```

### stdfeili 名字:诽离
描述: 当你受到伤害时，你可以弃两张牌或令〖谮构〗本轮失效，然后防止此伤害。
```js
stdfeili: {
		audio: "mbfeili",
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			return player.countDiscardableCards(player, "he") > 1 || (player.hasSkill("stdzengou") && !player.isTempBanned("stdzengou"));
		},
		async cost(event, trigger, player) {
			const list = [`弃置两张牌`, `令〖谮构〗本轮失效`];
			const bool1 = player.countDiscardableCards(player, "he") > 1;
			const bool2 = player.hasSkill("stdzengou") && !player.isTempBanned("stdzengou");
			const ai1 = player.countDiscardableCards(player, "he", card => 7 - get.value(card)) > 1;
			const ai2 = (() => {
				if (trigger.num >= player.getHp() + player.hujia) {
					return true;
				}
				const curLen = player.actionHistory.length;
				for (let i = curLen - 1; i >= 0; i--) {
					const history = player.actionHistory[i];
					if (history.isMe && !history.isSkipped) {
						return true;
					}
					if (history.isRound) {
						break;
					}
				}
				return false;
			})();
			if (bool1 && bool2) {
				const result = await player
					.chooseControl("cancel2")
					.set("choiceList", list)
					.set("prompt", get.prompt2(event.skill))
					.set("choice", ai2 ? 1 : ai1 ? 0 : 2)
					.forResult();
				if (result?.control !== "cancel2") {
					event.result = { bool: true, cost_data: result.index };
				}
			} else if (bool1) {
				const result = await player.chooseBool(get.prompt(event.skill), `${list[0]}，防止此次伤害`).set("choice", ai1).forResult();
				if (result?.bool) {
					event.result = { bool: true, cost_data: 0 };
				}
			} else if (bool2) {
				const result = await player.chooseBool(get.prompt(event.skill), `${list[1]}，防止此次伤害`).set("choice", ai2).forResult();
				if (result?.bool) {
					event.result = { bool: true, cost_data: 1 };
				}
			}
		},
		async content(event, trigger, player) {
			const index = event.cost_data;
			if (index == 0) {
				await player.chooseToDiscard("he", 2, true);
			} else {
				player.tempBanSkill("stdzengou", "roundStart");
			}
			trigger.cancel();
		},
	}
```

## std_quyi 名字:标麴义 势力:qun

### stdfuqi 名字:伏骑
描述: 锁定技，你和与你距离为1的角色互相使用的杀不能被响应。
```js
stdfuqi: {
		audio: "fuqi",
		global: "stdfuqi_ai",
		subSkill: {
			ai: {
				directHit_ai: true,
				skillTagFilter(player, tag, arg) {
					if (arg.card?.name == "sha") {
						if (player.hasSkill("stdfuqi")) {
							return get.distance(arg.target, player) == 1;
						}
						if (arg.target.hasSkill("stdfuqi")) {
							return get.distance(player, arg.target) == 1;
						}
					}
				},
			},
		},
		forced: true,
		trigger: {
			global: "useCard",
		},
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			if (event.player == player) {
				return event.targets.some(target => get.distance(target, player) == 1);
			}
			return event.targets.includes(player) && get.distance(event.player, player) == 1;
		},
		async content(event, trigger, player) {
			trigger.directHit.addArray(game.players);
			game.log(trigger.card, "不可被响应");
		},
	}
```

### stdjiaozi 名字:骄恣
描述: 锁定技，你每回合首次造成伤害时，若你的手牌为全场最多，你令此伤害+1。
```js
stdjiaozi: {
		audio: "jiaozi",
		forced: true,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return (
				player.isMaxHandcard() && game.getGlobalHistory("everything", evt => evt.name == "damage" && evt.source == player).indexOf(event) == 0
			);
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	}
```

## std_wenyuan 名字:标文鸳 势力:shu

### stdkengqiang 名字:铿锵
描述: 每回合限一次，当你使用伤害牌时，你可以选择一项：1.摸两张牌；2.失去1点体力，令此牌伤害+1。
```js
stdkengqiang: {
		audio: "dckengqiang",
		usable: 1,
		trigger: { player: "useCard" },
		filter(event, player) {
			return get.is.damageCard(event.card);
		},
		async cost(event, trigger, player) {
			const list = [`摸两张牌`, `失去1点体力，令${get.translation(trigger.card)}伤害+1`];
			const eff1 = get.effect(player, { name: "wuzhong" }, player, player);
			const eff2 =
				get.effect(player, { name: "losehp" }, player, player) +
				Math.max(trigger.targets.map(target => get.damageEffect(target, player, player)));
			const result = await player
				.chooseControl("cancel2")
				.set("choiceList", list)
				.set("prompt", get.prompt2(event.skill))
				.set("choice", eff1 >= eff2 ? 0 : 1)
				.forResult();
			if (result?.control != "cancel2") {
				event.result = { bool: true, cost_data: result.index };
			}
		},
		async content(event, trigger, player) {
			const index = event.cost_data;
			if (index == 0) {
				await player.draw(2);
			} else if (index == 1) {
				await player.loseHp();
				game.log(trigger.card, "造成的伤害+1");
				trigger.baseDamage++;
			}
		},
	}
```

### stdshangjue 名字:殇决
描述: 限定技，当你进入濒死状态时，你可以将体力回复至体力上限，然后你可以失去〖铿锵〗令此技能视为未发动过。
```js
stdshangjue: {
		audio: "dcshangjue",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		trigger: { player: "dying" },
		check: () => true,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.recoverTo(player.maxHp);
			if (player.hasSkill("stdkengqiang", null, null, false)) {
				const result = await player.chooseBool(`殇决：是否失去〖铿锵〗重置此技能`).set("choice", false).forResult();
				if (result?.bool) {
					await player.removeSkills("stdkengqiang");
					player.restoreSkill(event.name);
				}
			}
		},
	}
```

## std_xushao 名字:标许劭 势力:qun

### stdyingmen 名字:盈门
描述: 出牌阶段限一次，若你没有“访客”，你可以摸两张牌并将等量的基本牌或普通锦囊牌置于武将牌上，称为“访客”。
```js
stdyingmen: {
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return !player.countExpansions("stdyingmen");
		},
		async content(event, trigger, player) {
			await player.draw(2);
			const result = await player
				.chooseCard(`盈门：将两张基本牌或普通锦囊牌置于武将牌上，称为“访客”`, "he", true, 2, card =>
					["basic", "trick"].includes(get.type(card))
				)
				.set("ai", card => get.player().getUseValue(card))
				.forResult();
			if (result?.cards?.length) {
				const { cards } = result;
				const next = player.addToExpansion(cards, "give");
				next.gaintag.add(event.name);
				await next;
			}
		},
		intro: {
			markcount: "expansion",
			content: "expansion",
		},
		ai: {
			order: 9,
			result: {
				player: 1,
			},
		},
	}
```

### stdpingjian 名字:评鉴
描述: 你可以将一张手牌当“访客”使用，若如此做，你需移去任意一张“访客”。
```js
stdpingjian: {
		enable: ["chooseToUse"],
		hiddenCard(player, name) {
			return player.getExpansions("stdyingmen").some(card => get.name(card) == name);
		},
		filter(event, player) {
			return player
				.getExpansions("stdyingmen")
				.some(card => event.filterCard(get.autoViewAs({ name: get.name(card), nature: get.nature(card) }, "unsure"), player, event));
		},
		chooseButton: {
			dialog(event, player) {
				const cards = player.getExpansions("stdyingmen");
				const list = get.inpileVCardList(info => {
					return cards.some(card => get.name(card) == info[2] && get.nature(card) == info[3]);
				});
				return ui.create.dialog("评鉴", [list, "vcard"], "hidden");
			},
			filter(button) {
				const evt = get.event().getParent();
				const link = button.link;
				return evt.filterCard(get.autoViewAs({ name: link[2], nature: link[3] }, "unsure"), get.player(), evt);
			},
			check(button) {
				const link = button.link;
				return get.player().getUseValue(get.autoViewAs({ name: link[2], nature: link[3] }, "unsure"));
			},
			backup(links, player) {
				return {
					filterCard(card, player) {
						return get.itemtype(card) == "card";
					},
					position: "h",
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
					},
					log: false,
					async precontent(event, trigger, player) {
						player.logSkill("stdpingjian");
						const result = await player
							.chooseCardButton(`评鉴：请移去一张“访客”`, true, player.getExpansions("stdyingmen"))
							.set("ai", button => -get.player().getUseValue(button.link))
							.forResult();
						if (result?.links?.length) {
							await player.loseToDiscardpile(result.links);
						}
					},
					ai1(card) {
						return 7 - get.value(card);
					},
				};
			},
			prompt(links, player) {
				return `将一张手牌当做${(get.translation(links[0][3]) || "") + get.translation(links[0][2])}使用`;
			},
		},
		ai: {
			order: 7,
			combo: "stdyingmen",
			result: {
				player: 1,
			},
		},
	}
```

## std_zhangxuan 名字:标张嫙 势力:wu

### stdtongli 名字:同礼
描述: 出牌阶段限一次，当你使用牌时，若你本阶段已使用的牌数等于X，你可令此牌额外结算一次（X为场上牌的花色数）。
```js
stdtongli: {
		audio: "tongli",
		trigger: {
			player: "useCard",
		},
		filter(event, player) {
			const evtx = event.getParent("phaseUse");
			const num = game
				.filterPlayer()
				.map(i => i.getCards("ej").map(card => get.suit(card)))
				.flat()
				.unique().length;
			return (
				player.isPhaseUsing() &&
				player.getHistory("useCard", evt => evt.getParent("phaseUse") == evtx).length == num &&
				["basic", "trick"].includes(get.type(event.card))
			);
		},
		check(event, player) {
			return !get.tag(event.card, "norepeat") ^ (event.targets?.reduce((sum, i) => sum + get.effect(i, event.card, player, player), 0) < 0);
		},
		async content(event, trigger, player) {
			trigger.effectCount++;
			game.log(trigger.card, "额外结算一次");
		},
	}
```

### stdshezang 名字:奢葬
描述: 当你进入濒死状态时，你可以将场上至多四张牌移动至你的装备区。
```js
stdshezang: {
		audio: "shezang",
		trigger: { player: "dying" },
		filter(event, player) {
			return player.canMoveCard(
				null,
				true,
				game.filterPlayer(target => target != player),
				player
			);
		},
		check(event, player) {
			return player.canMoveCard(
				true,
				true,
				game.filterPlayer(target => target != player),
				player
			);
		},
		async content(event, trigger, player) {
			let num = 0;
			const goon = () =>
				num++ < 4 &&
				player.canMoveCard(
					null,
					true,
					game.filterPlayer(target => target != player),
					player
				);
			while (goon()) {
				await player
					.moveCard(
						num < 2,
						game.filterPlayer(target => target != player),
						player
					)
					.set("nojudge", true);
			}
		},
	}
```

## std_jushou 名字:标沮授 势力:qun

### stdjianying 名字:渐营
描述: 出牌阶段开始时，你可以移动场上一张牌，然后你于此阶段首次使用与此牌花色或点数相同的牌时，你摸一张牌
```js
stdjianying: {
		audio: "jianying",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.canMoveCard();
		},
		check(event, player) {
			return player.canMoveCard(true);
		},
		async content(event, trigger, player) {
			const result = await player.moveCard(true).forResult();
			if (result?.card) {
				const { card } = result;
				player.addTempSkill(`${event.name}_draw`, "phaseChange");
				player.markAuto(`${event.name}_draw`, card);
			}
		},
		subSkill: {
			draw: {
				charlotte: true,
				audio: "jianying",
				forced: true,
				trigger: {
					player: "useCard",
				},
				onremove: true,
				filter(event, player) {
					const storage = player.getStorage("stdjianying_draw");
					const check = card => get.suit(card) == get.suit(event.card) || get.number(card) == get.number(event.card);
					return (
						storage.some(i => check(i)) &&
						player
							.getHistory("useCard", evt => check(evt.card) && evt.getParent("phaseUse") == event.getParent("phaseUse"))
							.indexOf(event) == 0
					);
				},
				async content(event, trigger, player) {
					await player.draw();
				},
				intro: {
					content: "cards",
				},
			},
		},
	}
```

### stdshibei 名字:矢北
描述: 限定技，当你受到伤害后，你回复1点体力。
```js
stdshibei: {
		audio: "shibei",
		forced: true,
		locked: false,
		limited: true,
		skillAnimation: true,
		animationColor: "metal",
		trigger: { player: "damageEnd" },
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.recover();
		},
	}
```

## std_simahui 名字:标司马徽 势力:qun

### stdjianjie 名字:荐杰
描述: 准备阶段，你可展示至多三名角色各一张牌，这些角色依次可以将展示的红色/黑色牌当做火攻/铁索连环使用。
```js
stdjianjie: {
		audio: "jianjie",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(target => target.countCards("he"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), [1, 3], (card, player, target) => {
					return target.countCards("he");
				})
				.set("ai", target => get.attitude(get.player(), target) * target.countCards("he"))
				.forResult();
		},
		async content(event, trigger, player) {
			const targets = event.targets.sortBySeat();
			const map = new Map();
			for (const target of targets) {
				const result = await player.choosePlayerCard(target, `请选择${get.translation(target)}要展示的牌`, "he", true).forResult();
				if (result?.cards?.length) {
					map.set(target, result.cards[0]);
				}
			}
			await player
				.showCards(Array.from(map.values()), get.translation(player) + "发动了【荐杰】")
				.set("customButton", button => {
					const target = get.owner(button.link);
					if (target) {
						button.node.gaintag.innerHTML = target.getName();
					}
				})
				.set("delay_time", Math.max(2.5, map.size));
			await game.doAsyncInOrder(targets, async (target, index) => {
				const card = map.get(target);
				let vcard;
				switch (get.color(card, target)) {
					case "red":
						vcard = get.autoViewAs({ name: "huogong" }, [card]);
						break;
					case "black":
						vcard = get.autoViewAs({ name: "tiesuo" }, [card]);
						break;
					default:
						return;
				}
				return target.chooseUseTarget(vcard, [card], false);
			});
		},
	}
```

### stdchenghao 名字:称好
描述: 每回合限一次，有角色受到属性伤害时，你可观看牌堆顶的一张牌，然后将之交给任意角色。
```js
stdchenghao: {
		audio: "xinfu_chenghao",
		trigger: { global: "damageBegin3" },
		usable: 1,
		filter(event, player) {
			return event.hasNature();
		},
		check: () => true,
		async content(event, trigger, player) {
			const cards = get.cards(1, true);
			await player.viewCards("称好：牌堆顶的一张牌", cards);
			const result = await player
				.chooseTarget(`将${get.translation(cards)}交给一名角色`, true)
				.set("ai", function (target) {
					const att = get.attitude(_status.event.player, target);
					if (_status.event.enemy) {
						return -att;
					} else if (att > 0) {
						return att / (1 + target.countCards("h"));
					} else {
						return att / 100;
					}
				})
				.set("enemy", get.value(cards[0], player, "raw") < 0)
				.forResult();
			if (result?.targets?.length) {
				const [target] = result.targets;
				player.line(target, "green");
				await target.gain(cards, "draw");
			}
		},
	}
```

## std_zhengxuan 名字:标郑玄 势力:qun

### stdzhengjing 名字:整经
描述: 摸牌阶段开始时，你可以展示你的所有手牌和牌堆顶等量张牌（至多三张），你将其中一种花色的牌交给一名其他角色，然后你获得其余牌。
```js
stdzhengjing: {
		audio: "zhengjing",
		trigger: { player: "phaseDrawBegin" },
		filter(event, player) {
			return player.countCards("h");
		},
		async content(event, trigger, player) {
			const hs = player.getCards("h");
			const top = get.cards(Math.min(3, hs.length), true);
			const cards = hs.concat(top);
			await player
				.showCards(cards, get.translation(player) + "发动了【整经】")
				.set("customButton", button => {
					if (!get.owner(button.link)) {
						button.node.gaintag.innerHTML = "牌堆顶";
					}
				})
				.set("delay_time", Math.min(4, cards.length * 1.5));
			if (game.hasPlayer(target => target != player)) {
				const map = Object.groupBy(cards, i => get.suit(i, player));
				const list = get.addNewRowList(cards, "suit", player);
				const result = await player
					.chooseButtonTarget({
						createDialog: [
							[
								[[`整经：选择一名其他角色令其获得其中一种花色的牌`], "addNewRow"],
								[
									dialog => {
										dialog.classList.add("fullheight");
										dialog.forcebutton = false;
										dialog._scrollset = false;
									},
									"handle",
								],
								list.map(item => [Array.isArray(item) ? item : [item], "addNewRow"]),
							],
						],
						forced: true,
						filterTarget: lib.filter.notMe,
						filterButton(button) {
							return button.links.length > 0;
						},
						ai1(button) {
							const player = get.player();
							if (!game.hasPlayer(current => player != current && get.attitude(player, current) > 0)) {
								return button.links.length;
							}
							return 1 / button.links.length;
						},
						ai2(target) {
							const att = get.attitude(get.player(), target);
							if (att > 0) {
								return att / (1 + target.countCards("h"));
							} else {
								return att / 100;
							}
						},
					})
					.forResult();
				if (result?.links?.length && result.targets?.length) {
					const suit = result.links[0];
					const target = result.targets[0];
					cards.removeArray(map[suit]);
					player.line(target);
					await target
						.gain(map[suit])
						.set("giver", player)
						.set(
							"given",
							map[suit].filter(i => hs.includes(i))
						)
						.set("animate", event => {
							const player = event.player;
							const giver = event.giver;
							const cards = event.cards;
							const given = event.given;
							const top = cards.removeArray(given);
							if (given.length) {
								giver.$give(given, player);
							}
							if (top.length) {
								player.$gain2(top, true);
							}
							return 500;
						});
				}
			}
			await player.gain(cards, "gain2");
		},
	}
```

## std_miheng 名字:标祢衡 势力:qun

### stdkuangcai 名字:狂才
描述: 锁定技，出牌阶段你使用前两张牌无距离和次数限制，结算后若造成伤害你摸一张牌，否则弃置一张牌。
```js
stdkuangcai: {
		audio: "rekuangcai",
		mod: {
			cardUsable(card, player) {
				if (player.isPhaseUsing() && get.event().stdkuangcai < 2) {
					return Infinity;
				}
			},
			targetInRange(card, player) {
				if (player.isPhaseUsing() && get.event().stdkuangcai < 2) {
					return true;
				}
			},
		},
		forced: true,
		onChooseToUse(event) {
			const player = event.player;
			if (!game.online && !event.stdkuangcai && event.type == "phase") {
				event.set("stdkuangcai", player.getHistory("useCard", evt => evt.getParent("phaseUse") == event.getParent("phaseUse")).length);
			}
		},
		trigger: { player: "useCard" },
		filter(event, player) {
			if (!player.isPhaseUsing()) {
				return false;
			}
			return player.getHistory("useCard", evt => evt.getParent("phaseUse") == event.getParent("phaseUse")).indexOf(event) < 2;
		},
		async content(event, trigger, player) {
			if (trigger.addCount !== false) {
				trigger.addCount = false;
				const stat = player.getStat().card,
					name = trigger.card.name;
				if (typeof stat[name] == "number") {
					stat[name]--;
				}
			}
			player
				.when("useCardAfter")
				.filter(evt => evt == trigger)
				.step(async (event, trigger, player) => {
					if (player.hasHistory("sourceDamage", evt => evt.card === trigger.card)) {
						await player.draw();
					} else {
						await player.chooseToDiscard("he", true);
					}
				});
		},
	}
```

### stdshejian 名字:舌剑
描述: 当你成为其他角色使用牌的唯一目标后，你可以选择弃置两张手牌，然后其于本回合的结束阶段受到你造成的1点伤害。
```js
stdshejian: {
		audio: "reshejian",
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.player != player && event.targets.length == 1;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(get.prompt2(event.skill, trigger.player), "h", 2, "chooseonly")
				.set("ai", card => {
					const eff = get.damageEffect(get.event().source, get.player(), get.player());
					if (eff > 0) {
						return 7 - get.value(card);
					}
					return 0;
				})
				.set("source", trigger.player)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discard(event.cards);
			const target = trigger.player;
			player
				.when({ global: "phaseJieshuBegin" })
				.filter(evt => evt.getParent("phase") === trigger.getParent("phase"))
				.step(async (event, trigger, player) => {
					if (target.isIn()) {
						player.line(target);
						await target.damage();
					}
				});
		},
	}
```

## std_majun 名字:标马钧 势力:wei

### stdgongqiao 名字:工巧
描述: 出牌阶段限一次，你可选择一名角色并连续亮出牌堆顶的牌直到有装备牌。然后令其使用此装备牌并用所有手牌交换其余亮出的牌。
```js
stdgongqiao: {
		audio: "gongqiao",
		enable: "phaseUse",
		usable: 1,
		filterTarget: true,
		async content(event, trigger, player) {
			const cards = [];
			const { target } = event;
			let card;
			while (true) {
				card = get.cards(1, true)[0];
				cards.push(card);
				await player
					.showCards(card, `${get.translation(player)}【工巧】亮出的第${get.cnNumber(cards.length, true)}张牌`, true)
					.set("clearArena", false);
				if (get.type(card) == "equip") {
					cards.remove(card);
					break;
				}
			}
			game.broadcastAll(ui.clear);
			if (card && target.hasUseTarget(card)) {
				await target.chooseUseTarget(card, true);
			}
			if (cards.length) {
				const hs = target.getCards("h");
				if (hs.length) {
					target.$throw(hs, 1000);
					game.log(target, "将", hs, "置入处理区");
					await target.lose(hs, ui.ordering);
				}
				await target.gain(cards, "gain2");
			}
		},
		ai: {
			order: 1,
			result: {
				target: 1,
			},
		},
	}
```

## std_zhangfen 名字:标张奋 势力:wu

### stdwanglu 名字:望橹
描述: 出牌阶段限一次，你可以弃置场上一张装备牌，以此法失去武器牌的角色摸X张牌。（X为此武器牌的攻击范围）。
```js
stdwanglu: {
		audio: "dcwanglu",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target.countDiscardableCards(player, "e", card => get.type(card) == "equip");
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await player.discardPlayerCard(target, "e", card => get.type(card) == "equip", true).forResult();
			if (result?.cards?.length) {
				const card = result.cards[0];
				if (get.subtype(card) == "equip1") {
					let num = 1;
					const info = get.info(card, false);
					if (info && info.distance && typeof info.distance.attackFrom == "number") {
						num -= info.distance.attackFrom;
					}
					await target.draw(num);
				}
			}
		},
		ai: {
			order: 5,
			result: {
				target: -1,
			},
		},
	}
```

## std_zhaoyan 名字:标赵嫣 势力:wu

### stdjinhui 名字:锦绘
描述: 准备阶段，你可以亮出牌堆顶三张牌，然后与一名其他角色依次使用其中一张牌（不能连续使用相同颜色的牌）。
```js
stdjinhui: {
		audio: "jinhui",
		trigger: { player: "phaseZhunbeiBegin" },
		check: () => true,
		async content(event, trigger, player) {
			const cards = get.cards(3, true);
			await player.showCards(cards, `${get.translation(player)}发动了【锦绘】`, true).set("clearArena", false);
			const targets = [player];
			if (game.hasPlayer(target => target != player)) {
				const result = await player
					.chooseTarget(`锦绘：与一名其他角色依次使用其中一张牌（不能连续使用相同颜色的牌）`, true, lib.filter.notMe)
					.set("ai", target => get.attitude(get.player(), target))
					.forResult();
				if (result?.targets?.length) {
					const [target] = result.targets;
					player.line(target);
					targets.add(target);
				}
			}
			game.broadcastAll(ui.clear);
			const colors = [];
			for (const target of targets) {
				if (cards.some(card => target.hasUseTarget(card, true, false) && !colors.includes(get.color(card)))) {
					const result = await target
						.chooseCardButton("锦绘：请使用其中一张牌", cards, true)
						.set("filterButton", button => {
							return get.event().cards.includes(button.link);
						})
						.set(
							"cards",
							cards.filter(card => target.hasUseTarget(card, true, false) && !colors.includes(get.color(card)))
						)
						.set("ai", button => get.player().getUseValue(button.link))
						.forResult();
					if (result?.links?.length) {
						const [card] = result.links;
						colors.add(get.color(card));
						cards.remove(card);
						await target.chooseUseTarget(card, true, false);
					}
				}
			}
		},
	}
```

### stdqingman 名字:轻幔
描述: 锁定技，每回合结束时，你摸牌至X张（X为你空置装备栏数，至多为3）。
```js
stdqingman: {
		audio: "qingman",
		forced: true,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			const num = player.countCards("h");
			let num2 = 0;
			for (let i = 1; i <= 5; i++) {
				num2 += player.countEmptySlot(i);
			}
			return num < Math.min(3, num2);
		},
		async content(event, trigger, player) {
			let num2 = 0;
			for (let i = 1; i <= 5; i++) {
				num2 += player.countEmptySlot(i);
			}
			await player.drawTo(Math.min(3, num2));
		},
	}
```

## std_liuli 名字:标刘理 势力:shu

### stdfuli 名字:抚黎
描述: 出牌阶段限一次，你可以展示所有手牌并弃置其中的所有伤害类牌（没有则不弃），然后令一名其他角色重复此流程并回复1体力。
```js
stdfuli: {
		audio: "dcfuli",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h");
		},
		manualConfirm: true,
		async content(event, trigger, player) {
			const func = async function (target) {
				await target.showHandcards();
				const hs = target.getDiscardableCards(target, "h", card => get.tag(card, "damage") && get.type(card) != "delay");
				if (hs.length) {
					await target.discard(hs);
				}
				if (target != player && target.isDamaged()) {
					await target.recover();
				}
			};
			await func(player);
			if (game.hasPlayer(target => target != player)) {
				const result = await player
					.chooseTarget(
						`抚黎：令一名其他角色展示所有手牌并弃置其中的所有伤害类牌（没有则不弃）并回复1体力`,
						true,
						(card, player, target) => {
							return player != target && target.countCards("h");
						}
					)
					.set("ai", target => get.recoverEffect(target, get.player(), get.player()))
					.forResult();
				if (result?.targets?.length) {
					const [target] = result.targets;
					player.line(target);
					await func(target);
				}
			}
		},
		ai: {
			order: 1,
			result: {
				player(player, target) {
					if (game.hasPlayer(target => get.recoverEffect(target, player, player) > 0)) {
						return 1;
					}
					return 0;
				},
			},
		},
	}
```

### stddehua 名字:德化
描述: 你失去仅两张牌的回合结束时，你可以视为使用一张基本牌。
```js
stddehua: {
		audio: "dcdehua",
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return player.getHistory("lose").reduce((list, evt) => list.addArray(evt.cards), []).length == 2;
		},
		async cost(event, trigger, player) {
			const list = get.inpileVCardList(info => {
				if (info[0] != "basic") {
					return false;
				}
				return player.hasUseTarget(get.autoViewAs({ name: info[2], nature: info[3], isCard: true }));
			});
			if (list.length) {
				const result = await player
					.chooseButton([get.prompt2(event.skill), [list, "vcard"]])
					.set("ai", button => get.player().getUseValue(get.autoViewAs({ name: button.link[2], nature: button.link[3], isCard: true })))
					.forResult();
				if (result?.links?.length) {
					event.result = {
						bool: true,
						cost_data: result.links[0],
					};
				}
			}
		},
		async content(event, trigger, player) {
			const link = event.cost_data;
			const card = get.autoViewAs({ name: link[2], nature: link[3], isCard: true });
			await player.chooseUseTarget(card, true);
		},
	}
```

## std_zhangyao 名字:标张美人 势力:wu

### stdlianrong 名字:怜容
描述: 当其他角色的♥️牌因弃置进入弃牌堆后，你可以获得之。
```js
stdlianrong: {
		trigger: {
			global: ["loseAfter", "loseAsyncAfter"],
		},
		filter(event, player) {
			if (event.type != "discard" || event.getlx === false) {
				return false;
			}
			return game.hasPlayer2(
				target => target != player && event.getl?.(target)?.cards2.some(card => get.suit(card) == "heart" && get.position(card, true) == "d")
			);
		},
		async cost(event, trigger, player) {
			const cards = game
				.filterPlayer2(target => target != player)
				.map(target => trigger.getl?.(target)?.cards2?.filter(card => get.suit(card) == "heart" && get.position(card, true) == "d"))
				.flat();
			const result = await player
				.chooseCardButton(get.prompt2(event.skill), cards, [1, Infinity])
				.set("ai", button => {
					return get.value(button.link, get.player(), "raw");
				})
				.forResult();
			if (result?.links?.length) {
				event.result = {
					bool: true,
					cost_data: result.links,
				};
			}
		},
		async content(event, trigger, player) {
			const cards = event.cost_data;
			await player.gain(cards, "gain2");
		},
	}
```

### stdyuanzhuo 名字:怨灼
描述: 出牌阶段限一次，你可以弃置一名其他角色的一张牌，然后其视为对你使用一张【火攻】。
```js
stdyuanzhuo: {
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(target => lib.skill.stdyuanzhuo.filterTarget(void 0, player, target));
		},
		filterTarget(card, player, target) {
			return target != player && target.countDiscardableCards(player, "he");
		},
		async content(event, trigger, player) {
			const { target } = event;
			await player.discardPlayerCard(target, "he", true);
			const card = get.autoViewAs({ name: "huogong", isCard: true });
			if (target.canUse(card, player, true, false)) {
				await target.useCard(card, player, false);
			}
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					return -get.effect(target, { name: "guohe_copy2" }, player, player);
				},
			},
		},
	}
```

## std_wangfuren 名字:标王夫人 势力:wu

### stdbizun 名字:避尊
描述: 每回合限一次，你可以将一张装备牌当【杀】或【闪】使用，然后手牌数唯一最多的角色可以移动场上一张牌。
```js
stdbizun: {
		enable: ["chooseToUse"],
		usable: 1,
		onChooseToUse(event) {
			const player = event.player;
			if (!event.stdbizun) {
				const list = get.inpileVCardList(info => {
					if (!["sha", "shan"].includes(info[2])) {
						return false;
					}
					return event.filterCard(get.autoViewAs({ name: info[2], nature: info[3] }, "unsure"), player, event);
				});
				event.set("stdbizun", list);
			}
		},
		hiddenCard(player, name) {
			return ["sha", "shan"].includes(name) && player.countCards("hes", card => get.type(card, player) == "equip");
		},
		filter(event, player) {
			return player.countCards("hes", card => get.type(card, player) == "equip") && event.stdbizun.length > 0;
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("避尊", [event.stdbizun, "vcard"]);
			},
			filter(button) {
				return get
					.event()
					.getParent()
					.filterCard(get.autoViewAs({ name: button.link[2], nature: button.link[3] }, "unsure"), get.player(), get.event().getParent());
			},
			check(button) {
				const player = get.player();
				return player.getUseValue(get.autoViewAs({ name: button.link[2], nature: button.link[3] }, "unsure"));
			},
			backup(links, player) {
				return {
					popname: true,
					filterCard(card, player) {
						return get.type(card, player) === "equip";
					},
					selectCard: 1,
					check(card) {
						return 7 - get.value(card);
					},
					position: "hes",
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
					},
					log: false,
					async precontent(event, trigger, player) {
						player.logSkill("stdbizun");
						player
							.when({ player: "useCardAfter" })
							.filter(evt => evt.getParent() == event.getParent())
							.step(async (event, trigger, player) => {
								const target = game.findPlayer(targetx => targetx.canMoveCard() && targetx.isMaxHandcard(true));
								if (target) {
									await target.moveCard();
								}
							});
					},
				};
			},
			prompt(links, player) {
				return `将一张装备牌当做${get.translation(links[0][3]) || ""}${get.translation(links[0][2])}使用`;
			},
		},
	}
```

### stdhuangong 名字:还宫
描述: 锁定技，当你失去场上的最后一张牌后，你摸一张牌。
```js
stdhuangong: {
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			if (player.countCards("ej")) {
				return false;
			}
			const evt = event.getl(player);
			return evt?.es?.length || evt.js?.length;
		},
		forced: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	}
```

## std_panglin 名字:标庞林 势力:shu

### stdzhuying 名字:驻营
描述: 当其他角色受到非属性伤害时，若其未横置，你可以令其横置。
```js
stdzhuying: {
		trigger: { global: "damageBegin3" },
		filter(event, player) {
			return event.player != player && !event.hasNature() && !event.player.isLinked();
		},
		check(event, player) {
			return get.effect(event.player, { name: "tiesuo" }, player, player) > 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const target = trigger.player;
			await target.link(true);
		},
	}
```

### stdzhongshi 名字:忠事
描述: 锁定技，你横置/未横置时对未横置/横置角色造成伤害时，此伤害+1。
```js
stdzhongshi: {
		forced: true,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return player.isLinked() != event.player.isLinked();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			trigger.num++;
		},
	}
```

## std_huangchong 名字:标黄崇 势力:shu

### stdjuxian 名字:据险
描述: 锁定技，当其他角色获得你的牌时，你防止之。
```js
stdjuxian: {
		trigger: { global: "gainBefore" },
		filter(event, player) {
			return event.player != player && event.cards.some(card => get.owner(card) == player && "he".includes(get.position(card)));
		},
		forced: true,
		async content(event, trigger, player) {
			trigger.cancel();
		},
		mod: {
			cardGiftable(card, player, target) {
				if (player != target && get.type(card, null, false) != "equip") {
					return false;
				}
			},
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (card.name == "shunshou") {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

### stdlijun 名字:励军
描述: 准备阶段，你展示至多X名的角色的各一张手牌，然后被以此法展示牌的角色依次选择一项：1.使用以此法展示的牌；2.弃置以此法展示的牌（X为你的体力值）。
```js
stdlijun: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(target => target.countCards("h"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), [1, player.getHp()], (card, player, target) => {
					return target.countCards("h");
				})
				.set("ai", target => {
					const player = get.player(),
						att = get.attitude(player, target);
					if (att > 0) {
						return target.countCards("h", card => target.hasValueTarget(card, true, false));
					}
					return true;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { targets } = event;
			for (const target of targets.sortBySeat()) {
				const result = await player.choosePlayerCard(target, `励军：请展示${get.translation(target)}一张手牌`, "h", true).forResult();
				if (result?.cards?.length) {
					const card = result.cards[0];
					await player.showCards([card], `${get.translation(target)}被展示的牌`);
					let resultx;
					if (target.hasUseTarget(card, true, false)) {
						resultx = await target.chooseUseTarget(`励军：使用${get.translation(card)}或者取消并弃置之`, card, false).forResult();
					} else {
						resultx = { bool: false };
					}
					if (!resultx.bool) {
						await target.modedDiscard(card);
					}
				}
			}
		},
	}
```

## std_caoxiong 名字:标曹熊 势力:wei

### stdwuwei 名字:无为
描述: 当你受到伤害后，你可以将一张装备牌置入一名角色的装备区内，然后你弃置其X张牌（X为其因此增加的攻击范围数）。
```js
stdwuwei: {
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return player.countCards("he", card => get.type(card, player) == "equip" && game.hasPlayer(target => target.canEquip(card, true)));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt2(event.skill),
					filterCard(card, player) {
						return get.type(card, player) == "equip";
					},
					filterTarget(card, player, target) {
						if (get.position(card) == "e" && target == player) {
							return false;
						}
						return target.canEquip(card, true);
					},
					position: "he",
					ai1(card) {
						return 6 - get.value(card);
					},
					ai2(target) {
						const card = ui.selected.cards[0],
							att = get.attitude(get.player(), target),
							range = target.getAttackRange(),
							cardrange = 1 - (get.info(card, false)?.distance?.attackFrom || 0);
						if (att <= 0 && cardrange > range) {
							return get.effect(target, { name: "guohe_copy2" }, get.player(), get.player());
						}
						return att * get.equipValue(card, target);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const card = event.cards[0],
				target = event.targets[0],
				range = target.getAttackRange();
			await target.equip(card);
			const num = target.getAttackRange() - range;
			if (num > 0 && target.countDiscardableCards(player, "he")) {
				await player.discardPlayerCard(target, "he", num, true);
			}
		},
	}
```

### stdleiruo 名字:羸弱
描述: 结束阶段，你可以获得一名其他角色装备区内的一张牌，然后其可以视为对你使用一张无距离限制的【杀】。
```js
stdleiruo: {
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(target => target != player && target.countGainableCards(player, "e"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return target != player && target.countGainableCards(player, "e");
				})
				.set("ai", target => {
					if (!get.player().hasShan()) {
						return false;
					}
					return get.effect(target, { name: "shunshou_copy2" }, get.player(), get.player());
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.gainPlayerCard(target, "e", true);
			const card = get.autoViewAs({ name: "sha", isCard: true });
			if (target.canUse(card, player, false, false)) {
				const result = await target
					.chooseBool(`羸弱：是否视为对${get.translation(player)}使用一张无距离限制的【杀】`)
					.set("choice", get.effect(player, card, target, target) > 0)
					.forResult();
				if (result?.bool) {
					await target.useCard(card, player, false);
				}
			}
		},
	}
```

## std_maohuanghou 名字:标毛皇后 势力:wei

### stddechong 名字:得宠
描述: 其他角色的准备阶段，你可以交给其至少一张牌，若如此做，其下个弃牌阶段开始时，若其手牌数不小于体力值，你可以对其造成1点伤害。
```js
stddechong: {
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return event.player != player && player.countCards("he");
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseCard(
					get.prompt2(event.skill, trigger.player),
					"he",
					[1, Infinity],
					(card, player) => {
						const target = get.event().getTrigger().player;
						return lib.filter.canBeGained(card, target, player);
					},
					"allowChooseAll"
				)
				.set("ai", card => {
					const player = get.player(),
						target = get.event().getTrigger().player,
						att = get.attitude(player, target);
					if (att <= 0) {
						const num = target.countCards("h", card => !target.hasValueTarget(card));
						if (num >= target.hp) {
							return 6 - get.value(card);
						}
						return 0;
					}
					if (att > 0) {
						return target.getUseValue(card) - 2;
					}
				})
				.forResult();
			if (result?.cards?.length) {
				event.result = {
					bool: true,
					targets: [trigger.player],
					cost_data: result.cards,
				};
			}
		},
		async content(event, trigger, player) {
			const cards = event.cost_data,
				target = event.targets[0];
			await player.give(cards, target);
			player
				.when({ global: "phaseDiscardBegin" })
				.filter(evt => evt.player == target)
				.step(async (event, trigger, player) => {
					if (trigger.stddechong) {
						return;
					}
					trigger.set("stddechong", true);
					const target = trigger.player;
					if (target.countCards("h") >= target.hp) {
						const result = await player
							.chooseBool(`得宠：是否对${get.translation(target)}造成1点伤害`)
							.set("choice", get.damageEffect(target, player, player) > 0)
							.forResult();
						if (result?.bool) {
							await target.damage();
						}
					}
				});
		},
	}
```

### stdyinzu 名字:荫族
描述: 锁定技，手牌数大于体力值的角色的攻击范围+1；手牌数不大于体力值的角色的攻击范围-1。
```js
stdyinzu: {
		locked: true,
		global: ["stdyinzu_global"],
		subSkill: {
			global: {
				charlotte: true,
				mod: {
					attackRange(player, num) {
						const count = game.countPlayer(current => current.hasSkill("stdyinzu"));
						if (!count) {
							return;
						}
						const sub = player.countCards("h") - player.hp;
						if (sub > 0) {
							return num + count;
						}
						return num - count;
					},
				},
			},
		},
	}
```

## std_zhengcong 名字:标郑聪 势力:qun

### stdqiyue 名字:起钺
描述: 锁定技，游戏开始时，你从游戏外获得【宣花斧】。
```js
stdqiyue: {
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		locked: false,
		filter(event, player) {
			return (event.name != "phase" || game.phaseNumber == 0) && player.hasEquipableSlot(1);
		},
		async content(event, trigger, player) {
			const card = game.createCard2("xuanhuafu", "diamond", 5);
			await player.gain(card, "gain2");
		},
	}
```

### stdjieji 名字:劫击
描述: 锁定技，你每回合使用的首张【杀】对一名其他角色造成伤害后，你获得其一张手牌，然后其视为对你使用一张无距离限制的【杀】。
```js
stdjieji: {
		trigger: { source: "damageSource" },
		filter(event, player) {
			return (
				event.player != player &&
				event.player.isIn() &&
				event.card?.name == "sha" &&
				player.getHistory("useCard", evt => evt.card.name == "sha").indexOf(event.getParent("useCard")) == 0 &&
				event.player.countGainableCards(player, "he")
			);
		},
		forced: true,
		logTarget: "player",
		async content(event, trigger, player) {
			const target = trigger.player;
			await player.gainPlayerCard(target, "he", true);
			const card = get.autoViewAs({ name: "sha", isCard: true });
			if (target.canUse(card, player, false, false)) {
				await target.useCard(card, player, false, "noai");
			}
		},
	}
```

## std_jiangjie 名字:标姜婕 势力:qun

### stdfengzhan 名字:锋展
描述: 锁定技，游戏开始时，你从游戏外获得【百辟双匕】。
```js
stdfengzhan: {
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		locked: false,
		filter(event, player) {
			return (event.name != "phase" || game.phaseNumber == 0) && player.hasEquipableSlot(1);
		},
		async content(event, trigger, player) {
			const card = game.createCard2("baipishuangbi", "spade", 2);
			await player.gain(card, "gain2");
		},
	}
```

### stdruixi 名字:锐袭
描述: 每个回合的结束阶段，若你于本回合内失去过牌，你可以将一张牌当做无距离限制的【杀】使用。
```js
stdruixi: {
		trigger: {
			global: "phaseJieshuBegin",
		},
		filter(event, player) {
			return (
				player.countCards("hes") && player.hasUseTarget(get.autoViewAs({ name: "sha" }, "unsure"), false, false) && player.hasHistory("lose")
			);
		},
		direct: true,
		clearTime: true,
		async content(event, trigger, player) {
			await player
				.chooseToUse()
				.set("openskilldialog", `###${get.prompt(event.name)}###将一张牌当作无距离限制的【杀】使用`)
				.set("norestore", true)
				.set("_backupevent", `${event.name}_backup`)
				.set("custom", {
					add: {},
					replace: { window() {} },
				})
				.backup(`${event.name}_backup`)
				.set("targetRequired", true)
				.set("complexTarget", true)
				.set("complexSelect", true)
				.set("addCount", false)
				.set("logSkill", event.name);
		},
		subSkill: {
			backup: {
				filterCard(card) {
					return get.itemtype(card) == "card";
				},
				filterTarget(card, player, target) {
					return lib.filter.targetEnabled.apply(this, arguments);
				},
				viewAs: {
					name: "sha",
				},
				selectCard: 1,
				position: "hes",
				ai1(card) {
					return 7 - get.value(card);
				},
			},
		},
	}
```

## std_baoxin 名字:标鲍信 势力:qun

### stdyimou 名字:毅谋
描述: 当你受到伤害后，你可以将一张牌交给一名其他角色。
```js
stdyimou: {
		audio: "yimou",
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return player.countCards("he") && game.hasPlayer(target => target != player) && event.num > 0;
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseCardTarget({
					prompt: get.prompt2(event.skill),
					filterCard: true,
					position: "he",
					filterTarget: lib.filter.notMe,
					ai1(card) {
						return 1 / Math.max(0.1, get.value(card));
					},
					ai2(target) {
						var player = _status.event.player,
							att = get.attitude(player, target);
						if (target.hasSkillTag("nogain")) {
							att /= 9;
						}
						return 4 + att;
					},
				})
				.forResult();
			if (result?.bool) {
				event.result = {
					bool: true,
					cost_data: result.cards,
					targets: result.targets,
				};
			}
		},
		async content(event, trigger, player) {
			const target = event.targets[0],
				cards = event.cost_data;
			await player.give(cards, target);
		},
	}
```

### stdmutao 名字:募讨
描述: 准备阶段，你可令一名角色展示所有手牌，若其中有【杀】，你对其造成1点伤害。
```js
stdmutao: {
		audio: "mutao",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(target => target.countCards("h"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return target.countCards("h");
				})
				.set("ai", target => get.damageEffect(target, get.player(), get.player()))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await target.showHandcards();
			if (target.countCards("h", card => get.name(card, target) == "sha")) {
				await target.damage();
			}
		},
	}
```

## std_peixiu 名字:标裴秀 势力:qun

### stdzhitu 名字:制图
描述: 你可以将至少两张点数之和等于13的牌当任意普通锦囊牌使用。
```js
stdzhitu: {
		enable: "chooseToUse",
		filter(event, player) {
			if (player.countCards("he") < 2) {
				return false;
			}
			return get.inpileVCardList(info => {
				if (info[0] != "trick") {
					return false;
				}
				return event.filterCard(get.autoViewAs({ name: info[2] }, "unsure"), player, event);
			}).length;
		},
		hiddenCard(player, name) {
			if (get.type(name) == "trick" && lib.inpile.includes(name) && player.countCards("he") > 1) {
				return true;
			}
		},
		chooseButton: {
			dialog(event, player) {
				const list = get.inpileVCardList(info => info[0] == "trick");
				return ui.create.dialog("制图", [list, "vcard"]);
			},
			filter(button, player) {
				return get.event().getParent().filterCard({ name: button.link[2] }, player, get.event().getParent());
			},
			check(button) {
				const player = get.player();
				return player.getUseValue({ name: button.link[2] }) + 1;
			},
			backup(links, player) {
				return {
					audio: "fjzhitu",
					filterCard(card, player) {
						const selected = ui.selected.cards;
						if (!selected.length) {
							return true;
						}
						return get.number(card, player) + selected.reduce((sum, card) => sum + get.number(card, get.player()), 0) <= 13;
					},
					selectCard: [2, Infinity],
					filterOk() {
						const selected = ui.selected.cards;
						if (!selected.length) {
							return false;
						}
						return selected.reduce((sum, card) => sum + get.number(card, get.player()), 0) == 13;
					},
					ai1(card) {
						const player = get.player();
						const name = lib.skill.stdzhitu_backup.viewAs.name;
						if (ui.selected.cards.length > 1 || card.name == name) {
							return 0;
						}
						const sum = ui.selected.cards.reduce((sumx, cardx) => sumx + get.number(cardx, player), 0);
						if (sum + get.number(card, player) == 13) {
							return 7 - get.value(card);
						}
						return 6 - get.value(card);
					},
					position: "hes",
					popname: true,
					viewAs: { name: links[0][2] },
				};
			},
			prompt(links, player) {
				return "将至少两张点数和等于13的牌当作" + get.translation(links[0][2]) + "使用";
			},
		},
		ai: {
			order: 10,
			result: {
				player: 1,
			},
		},
	}
```

## std_yangbiao 名字:标杨彪 势力:qun

### stdyizheng 名字:义争
描述: 准备阶段，你可以与一名体力值不小于你的角色拼点，赢的角色对没赢的角色造成1点伤害。
```js
stdyizheng: {
		audio: "yizheng",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(target => target.hp >= player.hp && player.canCompare(target));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return target.hp >= player.hp && player.canCompare(target);
				})
				.set("ai", target => {
					const player = get.player(),
						hs = player.getCards("h").sort(function (a, b) {
							return b.number - a.number;
						}),
						ts = target.getCards("h").sort(function (a, b) {
							return b.number - a.number;
						}),
						eff = get.damageEffect(target, player, player);
					if (hs[0].number > ts[0].number) {
						return eff;
					}
					return 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!player.canCompare(target)) {
				return;
			}
			const result = await player.chooseToCompare(target).forResult();
			if (result.winner) {
				const winner = result.winner,
					loser = winner == player ? target : player;
				winner.line(loser);
				await loser.damage(winner);
			}
		},
	}
```

### stdrangjie 名字:让节
描述: 当你受到伤害后，你可以移动场上的一张牌。
```js
stdrangjie: {
		audio: "rangjie",
		trigger: {
			player: "damageEnd",
		},
		filter(event, player) {
			return player.canMoveCard() && event.num > 0;
		},
		check(event, player) {
			return player.canMoveCard(true);
		},
		async content(event, trigger, player) {
			player.moveCard(true);
		},
	}
```

## std_huangfusong 名字:标皇甫嵩 势力:qun

### stdtaoluan 名字:讨乱
描述: 其他角色的结束阶段，你可以交给其一张牌，其展示所有手牌，然后弃置所有【闪】。
```js
stdtaoluan: {
		audio: "sptaoluan",
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return player.countCards("he") && event.player != player;
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseCard(get.prompt2(event.skill, trigger.player), "he")
				.set("ai", card => {
					const target = get.event().getTrigger().player,
						att = get.attitude(get.player(), target),
						shan = target.countCards("h", "shan");
					if (att < 0 && shan.length) {
						return (card.name == "shan" ? 8 : 6) - get.value(card);
					}
					return 0;
				})
				.forResult();
			if (result?.cards?.length) {
				event.result = {
					bool: true,
					cost_data: result.cards,
					targets: [trigger.player],
				};
			}
		},
		async content(event, trigger, player) {
			const cards = event.cost_data,
				target = trigger.player;
			await player.give(cards, target);
			await target.showHandcards();
			await target.modedDiscard(target.getCards("h", card => get.name(card, target) == "shan"));
		},
	}
```

## std_zerong 名字:标笮融 势力:qun

### stdcansi 名字:残肆
描述: 锁定技，准备阶段，你令攻击范围内的一名角色获得你一张牌，然后视为对其依次使用【杀】、【决斗】。
```js
stdcansi: {
		audio: "dccansi",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("he") && game.hasPlayer(target => player.inRange(target)); //&&player.countGainableCards(target,"he")
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(`残肆：令攻击范围内的一名角色获得你一张牌，然后视为对其依次使用【杀】,【决斗】`, true, (card, player, target) => {
					return player.inRange(target);
				})
				.set("ai", target => {
					const cards = [get.autoViewAs({ name: "sha", isCard: true }), get.autoViewAs({ name: "juedou", isCard: true })];
					return cards.reduce((eff, card) => eff + get.effect(target, card, get.player(), get.player()), 0);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const { bool } = await target.gainPlayerCard(player, "he", true).forResult();
			if (!bool) {
				return;
			}
			await game.delayx();
			for (let name of ["sha", "juedou"]) {
				const card = get.autoViewAs({ name: name, isCard: true });
				if (player.canUse(card, target, false, false)) {
					await player.useCard(card, target, false);
				}
			}
		},
	}
```

## std_pangdegong 名字:标庞德公 势力:qun

### stdlingjian 名字:令荐
描述: 锁定技，当你每回合首次使用【杀】结算结束后，若此牌未造成伤害，你重置〖明识〗。
```js
stdlingjian: {
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return (
				player.getHistory("useCard", evt => evt.card?.name == "sha").indexOf(event) == 0 &&
				!player.hasHistory("sourceDamage", evt => evt.card && evt.getParent("useCard") === event) &&
				player.hasSkill("stdmingshi", null, false, false) &&
				player.awakenedSkills.includes("stdmingshi")
			);
		},
		forced: true,
		async content(event, trigger, player) {
			player.restoreSkill("stdmingshi");
			player.popup("明识");
			game.log(player, "恢复了技能", "#g【明识】");
		},
		ai: { combo: "stdmingshi" },
	}
```

### stdmingshi 名字:明识
描述: 限定技，出牌阶段，你可选择一项：①摸两张牌；②回复1点体力；③对一名角色造成1点伤害；④移动场上的一张牌。
```js
stdmingshi: {
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "metal",
		chooseButton: {
			dialog(event, player) {
				const dialog = ui.create.dialog(`###明识###请选择一项`);
				dialog.add([
					[
						["draw", "摸两张牌"],
						["recover", "回复1点体力"],
						["damage", "对一名角色造成1点伤害"],
						["move", "移动场上的一张牌"],
					],
					"textbutton",
				]);
				return dialog;
			},
			filter(button) {
				const player = get.player();
				const { link } = button;
				if (link == "recover") {
					return player.isDamaged();
				}
				if (link == "move") {
					return player.canMoveCard();
				}
				return true;
			},
			check(button) {
				const player = get.player();
				const { link } = button;
				if (link == "recover") {
					return get.recoverEffect(player, player, player);
				}
				if (link == "draw") {
					return get.effect(player, { name: "wuzhong" }, player, player);
				}
				if (link == "damage") {
					return game
						.filterPlayer()
						.map(target => get.damageEffect(target, player, player))
						.sort((a, b) => b - a)[0];
				}
				if (button.link == "move") {
					return 2;
				}
				return 0;
			},
			backup(links, player) {
				return {
					link: links[0],
					delay: false,
					async content(event, trigger, player) {
						player.awakenSkill("stdmingshi");
						const { link } = get.info(event.name);
						switch (link) {
							case "draw":
								await player.draw(2);
								break;
							case "recover":
								if (player.isDamaged()) {
									await player.recover();
								}
								break;
							case "damage": {
								const result = await player
									.chooseTarget(`明识：对一名角色造成1点伤害`, true)
									.set("ai", target => {
										const player = get.player();
										return get.damageEffect(target, player, player);
									})
									.forResult();
								if (result?.targets?.length) {
									player.line(result.targets);
									await result.targets[0].damage();
								}
								break;
							}
							case "move":
								if (player.canMoveCard()) {
									await player.moveCard(true);
								}
								break;
						}
					},
				};
			},
		},
		ai: {
			order: 10,
			result: { player: 1 },
		},
		subSkill: { backup: {} },
	}
```

## std_nanhualaoxian 名字:() {
		return Math.random() > 0.25 ? "标南华老仙" : "标南华小仙";
	} 势力:qun

### stdxianlu 名字:仙箓
描述: 出牌阶段限一次，你可以弃置一名角色场上的一张装备牌，若此牌为红色，你将此牌当【乐不思蜀】置于你的判定区内并对其造成1点伤害。
```js
stdxianlu: {
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(target => target.countCards("e", { type: "equip" }));
		},
		filterTarget(card, player, target) {
			return target.countCards("e", { type: "equip" });
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.countCards("e", { type: "equip" })) {
				return false;
			}
			const result = await player.discardPlayerCard(target, "e", true, card => get.type(card) == "equip").forResult();
			if (result?.cards) {
				const card = result.cards[0];
				if (get.color(card, false) == "red") {
					if (player.canAddJudge("lebu")) {
						await player.addJudge("lebu", [card]);
					}
					await target.damage();
				}
			}
		},
		ai: {
			order: 8,
			result: {
				target(player, target, card) {
					return -1 / target.countCards("e");
				},
			},
		},
	}
```

### stdtianshu 名字:天书
描述: 锁定技，你的手牌上限+X（X为当前势力数-1）。
```js
stdtianshu: {
		mod: {
			maxHandcard(player, num) {
				return num + game.countGroup() - 1;
			},
		},
	}
```

## std_tianfeng 名字:标田丰 势力:qun

### stdgangjian 名字:刚谏
描述: 其他角色的准备阶段，你可以令其视为对你使用一张【杀】，若此【杀】未造成伤害，其本回合不能使用锦囊牌。
```js
stdgangjian: {
		audio: "sijian",
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return event.player.canUse({ name: "sha" }, player);
		},
		check(event, player) {
			if (get.attitude(player, event.player) > 0) {
				return false;
			}
			if (player.getEquip("bagua") || player.getEquip("rw_bagua")) {
				return true;
			}
			if (player.hasSkill("stdguijie") && player.countCards("hes", { color: "red" }) > 1) {
				return true;
			}
			if (player.countCards("hs", "shan") || (player.countCards("hs", "sha") && player.hasSkill("ollongdan", null, null, false))) {
				return true;
			}
			return get.effect(player, { name: "draw" }, player, player) + get.effect(event.player, { name: "sha" }, event.player, player);
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const { player: target } = trigger;
			const sha = get.autoViewAs({ name: "sha", isCard: true });
			if (target.canUse({ name: "sha" }, player)) {
				await target.useCard(sha, player);
				if (!game.hasPlayer2(current => current.hasHistory("damage", evt => evt.getParent(3) == event), true)) {
					target.addTempSkill(event.name + "_effect");
				}
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				mod: {
					cardEnabled(card) {
						if (get.type2(card) == "trick") {
							return false;
						}
					},
				},
				intro: { content: "本回合不能使用锦囊牌" },
			},
		},
	}
```

### stdguijie 名字:瑰杰
描述: 当你需要使用或打出一张【闪】时，你可以弃置两张红色牌并摸一张牌，视为使用或打出之。
```js
stdguijie: {
		enable: ["chooseToRespond", "chooseToUse"],
		viewAs: {
			name: "shan",
			isCard: true,
		},
		filter(event, player) {
			return player.countCards("hes", { color: "red" }) > 1;
		},
		filterCard(card) {
			return get.color(card) == "red";
		},
		selectCard: 2,
		position: "hes",
		prompt: "弃置两张红色牌并摸一张牌，然后视为使用或打出一张【闪】",
		check(card) {
			return 6.5 - get.value(card);
		},
		log: false,
		async precontent(event, trigger, player) {
			player.logSkill("stdguijie");
			const cards = event.result.cards;
			await player.discard(cards);
			event.result.cards = [];
			await player.draw();
		},
		ai: {
			order(item, player) {
				if (player.countCards("hes", card => get.color(card) == "red" && get.name(card) != "shan") > 3) {
					return 7;
				}
				return 2;
			},
			respondShan: true,
			skillTagFilter(player) {
				return player.countCards("hes", { color: "red" }) > 1;
			},
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "respondShan") && current < 0) {
						return 0.6;
					}
				},
			},
		},
	}
```

## std_liuxie 名字:标刘协 势力:qun

### stdtianming 名字:天命
描述: 当你成为【杀】的目标后，你可以弃置所有牌并摸两张牌（无牌则不弃），然后体力值唯一最大的其他角色也可以如此做。
```js
stdtianming: {
		audio: "tianming",
		inherit: "tianming",
		check(event, player) {
			const hs = player.getCards("h");
			if (hs.length <= 2 && hs.some(card => ["shan", "tao"].includes(card.name))) {
				return false;
			}
			return player.countCards("he") <= 3;
		},
		filter(event, player) {
			return event.card.name == "sha" && player.countCards("he");
		},
		async content(event, trigger, player) {
			if (player.countCards("he")) {
				await player.modedDiscard(player.getCards("he"));
			}
			await player.draw(2);
			const target = game.findPlayer(current => current.isMaxHp(true));
			if (target?.countCards("he") && player != target) {
				const result = await target
					.chooseBool(get.prompt(event.name), `弃置所有牌然后摸两张牌？`)
					.set("choice", target.countCards("he") <= 3)
					.forResult();
				if (result?.bool) {
					await target.modedDiscard(target.getCards("he"));
					await target.draw(2);
				}
			}
		},
	}
```

### stdmizhao 名字:密诏
描述: 结束阶段，你可以将所有牌交给一名其他角色并选择另一名角色，然后前者可与后者各失去1点体力。
```js
stdmizhao: {
		audio: "mizhao",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.countCards("h") && game.countPlayer(current => player != current) > 1;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), 2, lib.filter.notMe)
				.set("targetprompt", ["传诏对象", "讨伐对象"])
				.set("ai", target => {
					const player = get.player();
					const att = get.attitude(player, target);
					if (ui.selected.targets.length) {
						const target1 = ui.selected.targets[0];
						const targets = game.filterPlayer(
							current => player != current && current != target1 && get.effect(current, { name: "losehp" }, player, target1, player) > 0
						);
						if (targets.length) {
							return get.effect(target, { name: "losehp" }, player, target1, player);
						}
					}
					return att;
				})
				.set("multitarget", true)
				.forResult();
		},
		async content(event, trigger, player) {
			const { targets } = event;
			player.line2(targets);
			const [target1, target2] = targets;
			if (player.countCards("he")) {
				await player.give(player.getCards("he"), target1);
			}
			const result = await target1
				.chooseBool(get.prompt(event.name), `与${get.translation(target2)}各失去1点体力？`)
				.set(
					"choice",
					get.effect(target1, { name: "losehp" }, player, target1, player) +
						get.effect(target2, { name: "losehp" }, player, target1, player) >
						0
				)
				.forResult();
			if (!result?.bool) {
				return;
			}
			for (const target of targets.sortBySeat()) {
				await target.loseHp();
			}
		},
	}
```

### stdzhongyan 名字:终焉
描述: 主公技。其他群势力角色死亡时，你可以回复1点体力。
```js
stdzhongyan: {
		trigger: { global: "die" },
		filter(event, player) {
			return event.player.group == "qun" && player.isDamaged();
		},
		zhuSkill: true,
		frequent: true,
		async content(event, trigger, player) {
			await player.recover();
		},
	}
```

## std_simazhao 名字:标司马昭 势力:wei

### stdzhaoxin 名字:昭心
描述: 锁定技。准备阶段，你展示所有手牌，若两种颜色的牌数相同，你对一名角色造成1点伤害。
```js
stdzhaoxin: {
		audio: "xinfu_zhaoxin",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("h");
		},
		forced: true,
		async content(event, trigger, player) {
			const hs = player.getCards("h");
			if (!hs.length) {
				return;
			}
			await player.showCards(hs, `${get.translation(player)}发动了【${get.translation(event.name)}】`);
			const blacks = hs.filter(card => get.color(card) === "black").length;
			const reds = hs.filter(card => get.color(card) === "red").length;
			if (blacks !== reds) {
				return;
			}
			const result = await player
				.chooseTarget({
					forced: true,
					prompt: "昭心：是否对一名角色造成1点伤害？",
					ai(target) {
						const player = get.player();
						return get.damageEffect(target, player, player);
					},
				})
				.forResult();
			if (result?.bool && result?.targets?.length) {
				await result.targets[0].damage();
			}
		},
	}
```

## std_guozhao 名字:标郭照 势力:wei

### stdwufei 名字:诬诽
描述: 准备阶段，你可以令一名女性角色展示所有手牌，然后其弃置其中一种颜色的所有牌并摸一张牌。
```js
stdwufei: {
		audio: "wufei",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current.hasSex("female") && current.countCards("h"));
		},
		async cost(event, trigger, player) {
			const list = game.filterPlayer(current => current.hasSex("female") && current.countCards("h"));
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return get.event().list.includes(target);
				})
				.set("ai", target => {
					const player = get.player();
					const att = Math.sign(get.attitude(player, target));
					const list = get
						.event()
						.list.filter(current => current.hasSex("female") && current.countCards("h") && get.attitude(player, current) < 0);
					if (list.length) {
						return -att * target.countCards("h");
					}
					const bool = Object.keys(lib.color).some(color => {
						const num = target.countCards("h", card => get.color(card, target) == color);
						return num > 0 && num <= 2;
					});
					return att * (bool ? 1 : 0);
				})
				.set("list", list)
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			if (!target.countCards("h")) {
				return;
			}
			await target.showHandcards();
			const list = [],
				bannedList = [],
				indexs = Object.keys(lib.color),
				hs = target.getCards("h");
			for (const card of hs) {
				const color = get.color(card, target);
				list.add(color);
				if (!lib.filter.cardDiscardable(card, target, "stdwufei")) {
					bannedList.add(color);
				}
				if (bannedList.length == indexs.length) {
					break;
				}
			}
			list.removeArray(bannedList);
			list.sort((a, b) => indexs.indexOf(a) - indexs.indexOf(b));
			if (!list.length) {
				return;
			}
			const dialog = ["诬诽：弃置一种颜色的所有牌并摸一张牌"];
			for (let i = 0; i < list.length; i++) {
				const colorx = list[i];
				const cards = hs.filter(card => get.color(card, target) == colorx);
				if (cards.length) {
					dialog.addArray([`<span class="text center">${get.translation(colorx)}</span>`, cards]);
				}
			}
			const result =
				list.length > 1
					? await target
							.chooseControl(list)
							.set("ai", () => {
								const { player, controls } = get.event();
								const cards = player.getCards("h");
								return controls.sort((a, b) => {
									return (
										get.value(cards.filter(card => get.color(card) === a)) -
										get.value(cards.filter(card => get.color(card) === b))
									);
								})[0];
							})
							.set("dialog", dialog)
							.forResult()
					: { control: list[0] };
			const control = result?.control;
			if (control) {
				target.popup(control);
				game.log(target, "选择了", "#g" + get.translation(control));
				const cards = target.getCards("h").filter(card => get.color(card) === control);
				if (cards.length) {
					await target.discard(cards);
					await target.draw();
				}
			}
		},
	}
```

### stdjiaochong 名字:椒宠
描述: 男性角色的结束阶段，你可以对一名女性角色发动一次〖诬诽〗。
```js
stdjiaochong: {
		audio: "yichong",
		inherit: "stdwufei",
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return event.player.hasSex("male") && game.hasPlayer(current => current.hasSex("female") && current.countCards("h"));
		},
		async content(event, trigger, player) {
			await player.useSkill("stdwufei", event.targets);
		},
		derivation: "stdwufei",
	}
```

## std_jiakui 名字:标贾逵 势力:wei

### stdzhongzuo 名字:忠佐
描述: 锁定技。一名角色的回合结束时，若你本回合造成或受到过伤害，你与其各摸一张牌。
```js
stdzhongzuo: {
		audio: "zhongzuo",
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return ["damage", "sourceDamage"].some(key => player.hasHistory(key));
		},
		forced: true,
		logTarget: "player",
		async content(event, trigger, player) {
			await game.asyncDraw([trigger.player, player].sortBySeat());
		},
	}
```

### stdwanlan 名字:挽澜
描述: 限定技。其他角色进入濒死时，你可以交给其所有手牌，然后其回复体力至1点。
```js
stdwanlan: {
		audio: "wanlan",
		inherit: "wanlan",
		filter(event, player) {
			return event.player != player && event.player.hp <= 0 && player.countCards("h");
		},
		check(event, player) {
			if (get.attitude(player, event.player) < 4) {
				return false;
			}
			if (player.countCards("hs", card => player.canSaveCard(card, event.player)) >= 1 - event.player.hp) {
				return false;
			}
			if (event.player == player || event.player == get.zhu(player)) {
				return true;
			}
			if (get.recoverEffect(event.player, player, player) <= 0) {
				return false;
			}
			return !player.hasUnknown();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const { player: target } = trigger;
			if (player.countCards("h")) {
				await player.give(player.getCards("h"), target);
			}
			await target.recoverTo(1);
		},
	}
```

## std_yufan 名字:标虞翻 势力:wu

### stdzongxuan 名字:纵玄
描述: 当你的手牌因弃置进入弃牌堆后，你可以弃置场上的一张牌。
```js
stdzongxuan: {
		audio: "zongxuan",
		trigger: {
			player: "loseAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			if (event.type != "discard" || !game.hasPlayer(current => current.countDiscardableCards(player, "ej"))) {
				return false;
			}
			return event.getl?.(player)?.hs?.someInD("d");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return target.countDiscardableCards(player, "ej");
				})
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "guohe_copy", position: "ej" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			if (target.countDiscardableCards(player, "ej")) {
				await player.discardPlayerCard(target, "ej", true);
			}
		},
	}
```

### stdzhiyan 名字:直言
描述: 结束阶段，你可以获得本回合进入弃牌堆的一张装备牌。
```js
stdzhiyan: {
		audio: "zhiyan",
		getcards: () =>
			get
				.discarded()
				.filterInD("d")
				.filter(card => get.type(card) == "equip"),
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return get.info("stdzhiyan").getcards().length;
		},
		async cost(event, trigger, player) {
			const cards = get.info(event.skill).getcards();
			const result = await player
				.chooseButton(["直言：获得其中一张牌", cards])
				.set("ai", button => {
					return get.value(button.link);
				})
				.forResult();
			event.result = {
				bool: result?.bool,
				cost_data: result?.links,
			};
		},
		async content(event, trigger, player) {
			await player.gain(event.cost_data, "gain2");
		},
	}
```

## std_zhugeke 名字:标诸葛恪 势力:wu

### stdaocai 名字:傲才
描述: 每回合结束时，若你没有手牌，你可以观看牌堆顶的两张牌并获得其中一张牌。
```js
stdaocai: {
		audio: "aocai",
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return !player.countCards("h");
		},
		async cost(event, trigger, player) {
			const cards = get.cards(2, true);
			const result = await player
				.chooseButton(["傲才：获得其中一张牌", cards])
				.set("ai", button => {
					return get.value(button.link);
				})
				.forResult();
			event.result = {
				bool: result?.bool,
				cost_data: result?.links,
			};
		},
		async content(event, trigger, player) {
			await player.gain(event.cost_data, "gain2");
		},
	}
```

### stdduwu 名字:黩武
描述: 出牌阶段限一次，你可以弃置所有手牌并对攻击范围内的一名角色造成1点伤害。
```js
stdduwu: {
		audio: "duwu",
		inherit: "duwu",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") && game.hasPlayer(current => get.info("stdduwu").filterTarget(null, player, current));
		},
		filterCard: true,
		selectCard: -1,
		position: "h",
		filterTarget(card, player, target) {
			return player.inRange(target);
		},
		check: card => 1,
		async content(event, trigger, player) {
			await event.target.damage("nocard");
		},
		ai: {
			damage: true,
			order(item, player) {
				if (
					game.hasPlayer(current => player.inRange(current) && get.effect(current, "stdduwu", player, player) > 0) &&
					!player.hasCard(card => player.hasValueTarget(card) > 0, "h")
				) {
					return 10;
				}
				return 2;
			},
			result: {
				target(player, target) {
					return get.damageEffect(target, player);
				},
			},
			threaten: 1.5,
			expose: 0.3,
		},
	}
```

## std_mengda 名字:标孟达 势力:shu

### stdzhuan 名字:逐安
描述: 锁定技。当你每回合首次受到伤害后，你摸三张牌，然后伤害来源获得你一张牌。
```js
stdzhuan: {
		audio: "dclibang",
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return player.getHistory("damage").indexOf(event) == 0;
		},
		forced: true,
		async content(event, trigger, player) {
			await player.draw(3);
			const { source } = trigger;
			if (source?.isIn() && player.countGainableCards(source, "he")) {
				await source.gainPlayerCard(player, "he", true);
			}
		},
	}
```

## std_caozhen 名字:标曹真 势力:wei

### stdsidi 名字:司敌
描述: 当有角色打出【杀】时，你可以摸一张牌。
```js
stdsidi: {
		audio: "sidi",
		trigger: { global: "respond" },
		frequent: true,
		filter: event => event.card?.name == "sha",
		async content(event, trigger, player) {
			await player.draw();
		},
	}
```

## std_dongyun 名字:标董允 势力:shu

### stdbingzheng 名字:秉正
描述: 结束阶段，你可以令一名角色弃置一张牌，若其手牌数不等于体力值，你失去1点体力。
```js
stdbingzheng: {
		audio: "bingzheng",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(target => target.countDiscardableCards(target, "he"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return target.countDiscardableCards(target, "he");
				})
				.set("ai", target => {
					const player = get.player();
					if (!target.countCards("e") && target.countCards("h") - 1 == target.getHp()) {
						return get.effect(target, { name: "guohe_copy2" }, player, player);
					}
					return get.effect(target, { name: "guohe_copy2" }, player, player) + get.effect(player, { name: "losehp" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (target.countDiscardableCards(target, "he")) {
				await target.chooseToDiscard("he", true);
			}
			if (target.countCards("h") != target.getHp()) {
				await player.loseHp();
			}
		},
	}
```

### stdduliang 名字:笃良
描述: 当你受到伤害后，你可以摸一张牌，若你的手牌数等于体力值，你回复1点体力。
```js
stdduliang: {
		trigger: { player: "damageEnd" },
		filter: event => event.num > 0,
		async content(event, trigger, player) {
			await player.draw();
			if (player.countCards("h") == player.getHp() && player.isDamaged()) {
				await player.recover();
			}
		},
	}
```

## std_baosanniang 名字:标鲍三娘 势力:shu

### stdzhennan 名字:镇南
描述: 其他角色的准备阶段，你可以弃置一张手牌，若如此做，其本回合使用下张牌后，若此牌为红色，你令其获得之。
```js
stdzhennan: {
		audio: "xinfu_zhennan",
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return event.player != player && player.countDiscardableCards(player, "h");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(get.prompt2(event.skill, trigger.player))
				.set("ai", card => {
					const { goon } = get.event();
					return goon ? 6.5 - get.value(card) : 0;
				})
				.set("goon", get.attitude(player, trigger.player) > 0)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const { player: target } = trigger;
			player.addTempSkill(event.name + "_effect");
			player.markAuto(event.name + "_effect", [target]);
			target.addTempSkill(event.name + "_ai");
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				trigger: { global: "useCardAfter" },
				filter(event, player) {
					return player.getStorage("stdzhennan_effect").includes(event.player);
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.unmarkAuto(event.name, [trigger.player]);
					if (get.color(trigger.card) == "red") {
						const cards = trigger.cards?.filterInD("od");
						if (cards.length) {
							player.logSkill(event.name, trigger.player);
							await trigger.player.gain(cards, "gain2");
						}
					}
				},
			},
			ai: {
				charlotte: true,
				mod: {
					aiOrder(player, card, num) {
						if (get.itemtype(card) == "card" && get.color(card) == "red" && !["equip", "delay"].includes(get.type(card))) {
							return num + 10;
						}
					},
				},
				trigger: { player: "useCard1" },
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.removeSkill(event.name);
				},
			},
		},
	}
```

### stdshuyong 名字:姝勇
描述: 当其他角色于回合内连续使用两张同名牌时，你可以摸一张牌。
```js
stdshuyong: {
		audio: "meiyong",
		trigger: { global: "useCard" },
		frequent: true,
		filter(event, player) {
			const target = event.player,
				last = target.getLastUsed(1);
			if (target == player || _status.currentPhase != target) {
				return false;
			}
			return last?.card?.name == event.card.name;
		},
		async content(event, trigger, player) {
			await player.draw();
		},
	}
```

## std_liuba 名字:标刘巴 势力:shu

### stdduanbi 名字:锻币
描述: 结束阶段，你可以弃置所有手牌，然后令两名角色各摸两张牌。
```js
stdduanbi: {
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.countCards("h");
		},
		check(event, player) {
			if (player.countCards("h") <= 2) {
				return true;
			}
			const val = player.getCards("h").reduce((sum, card) => sum + get.value(card), 0);
			return val <= 16;
		},
		async content(event, trigger, player) {
			await player.modedDiscard(player.getCards("h"));
			if (game.countPlayer() < 2) {
				return;
			}
			const result = await player
				.chooseTarget(`锻币：令两名角色各摸两张牌`, 2, true)
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "draw" }, player, player) * 2;
				})
				.forResult();
			if (result?.targets?.length) {
				const targets = result.targets.sortBySeat();
				player.line(targets);
				await game.asyncDraw(targets, 2);
			}
		},
	}
```

## std_kongrong 名字:标孔融 势力:qun

### stdlirang 名字:礼让
描述: 其他角色的弃牌阶段结束时，你可以交给其一张牌，然后获得此阶段进入弃牌堆的所有红色牌。
```js
stdlirang: {
		getCards(event) {
			return game
				.getGlobalHistory("everything", evt => {
					if (!evt.cards?.length) {
						return false;
					}
					return (evt.name === "cardsDiscard" || evt.position == ui.discardPile) && evt.getParent("phaseDiscard") == event;
				})
				.reduce((cards, evt) => cards.addArray(evt.cards.filterInD("d")), [])
				.filter(card => get.color(card) == "red");
		},
		trigger: { global: "phaseDiscardEnd" },
		filter(event, player) {
			return event.player != player && player.countCards("he");
		},
		logTarget: "player",
		async cost(event, trigger, player) {
			const { player: target } = trigger;
			const cards = get.info(event.skill).getCards(trigger);
			let str = `交给${get.translation(target)}一张牌`;
			if (cards.length) {
				str += `然后获得${get.translation(cards)}`;
			}
			event.result = await player
				.chooseCard(get.prompt(event.skill, target), "he", str)
				.set("ai", card => {
					const { player, targetx, cardsx } = get.event();
					const att = get.attitude(player, targetx);
					if (att > 0 && cardsx.length) {
						return 8 - get.value(card);
					}
					if (att <= 0 && cardsx.length >= 2) {
						return 6 - get.value(card);
					}
					return 0;
				})
				.set("targetx", target)
				.set("cardsx", cards)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.give(event.cards, trigger.player);
			const cards = get.info(event.name).getCards(trigger);
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
	}
```

## std_zoushi 名字:标邹氏 势力:qun

### stdhuoshui 名字:祸水
描述: 锁定技，判定区有牌的其他角色受到的伤害+1。
```js
stdhuoshui: {
		audio: "rehuoshui",
		trigger: { global: "damageBegin3" },
		filter(event, player) {
			return event.player != player && event.player.countCards("j");
		},
		forced: true,
		async content(event, trigger, player) {
			trigger.num++;
		},
	}
```

### stdqingcheng 名字:倾城
描述: 出牌阶段限一次，你可以将两张红色非锦囊牌当两张【乐不思蜀】对你和一名其他角色使用。
```js
stdqingcheng: {
		audio: "reqingcheng",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			if (player.hasJudge("lebu")) {
				return false;
			}
			return player.countCards("hes", card => get.info("stdqingcheng").filterCard(card, player)) > 1;
		},
		filterCard(card, player) {
			return get.type2(card, player) != "trick" && get.color(card, player) == "red";
		},
		position: "he",
		selectCard: 2,
		filterTarget(card, player, target) {
			return target != player && target.canAddJudge("lebu");
		},
		filterOk() {
			const {
					cards,
					targets: [target],
				} = ui.selected,
				player = get.player(),
				canAdd = (current, card) => {
					const lebu = get.autoViewAs({ name: "lebu", cards: [card] }, [card]);
					return lib.filter.judge(lebu, player, current);
				};
			return canAdd(player, cards[0]) && canAdd(target, cards[1]);
		},
		check(card) {
			return 8 - get.value(card);
		},
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const { cards } = event;
			const targets = [player, event.target].sortBySeat();
			for (let i = 0; i < cards.length; i++) {
				const card = get.autoViewAs({ name: "lebu", cards: [cards[i]] }),
					target = targets[i];
				if ((player == target && player.canAddJudge(card)) || (player != target && player.canUse(card, target))) {
					await player.useCard(card, [cards[i]], targets[i]);
				}
			}
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					return get.effect(target, { name: "lebu" }, player, target);
				},
			},
		},
	}
```

## std_sunluyu 名字:标孙鲁育 势力:wu

### stdmumu 名字:穆穆
描述: 准备阶段，你可以弃置一张手牌，然后移动场上一张装备牌。
```js
stdmumu: {
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
			if (player.canMoveCard(null, true)) {
				await player.moveCard().set("nojudge", true);
			}
		},
	}
```

### stdmeibu 名字:魅步
描述: 装备着武器牌的角色使用【杀】时，你可以令其弃置一张手牌。
```js
stdmeibu: {
		audio: "meibu",
		trigger: { global: "useCard" },
		filter(event, player) {
			return event.player.countDiscardableCards(event.player, "h") && event.player.getEquips(1).length && event.card?.name == "sha";
		},
		logTarget: "player",
		check: (event, player) => get.attitude(player, event.player) < 0,
		async content(event, trigger, player) {
			const { player: target } = trigger;
			if (target.countDiscardableCards(target, "h")) {
				await target.chooseToDiscard("h", true);
			}
		},
	}
```

## std_zhoufang 名字:标周鲂 势力:wu

### stdqijian 名字:七笺
描述: 准备阶段，你可以令两名手牌数之和为7的角色各选择一项：1.弃置对方一张牌；2.令对方摸一张牌。
```js
stdqijian: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => game.hasPlayer(currentx => current.countCards("h") + currentx.countCards("h") == 7));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), 2)
				.set("filterTarget", (card, player, target) => {
					if (!ui.selected.targets.length) {
						return true;
					}
					const targetx = ui.selected.targets[0];
					return targetx.countCards("h") + target.countCards("h") == 7;
				})
				.set("complexTarget", true)
				.set("ai", target => {
					const player = get.player();
					if (!ui.selected.targets.length) {
						return get.attitude(player, target);
					}
					return 1;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const targets = event.targets.sortBySeat();
			const list = ["摸牌", "弃牌"];
			for (const target of targets) {
				if (!target.isIn()) {
					continue;
				}
				const targetx = targets.filter(current => current != target)[0];
				let result;
				const goon = targetx.countDiscardableCards(target, "he");
				if (goon) {
					result = await target
						.chooseControl(list)
						.set("prompt", `七笺：弃置${get.translation(targetx)}一张牌或令其摸一张牌`)
						.set("ai", () => {
							const { player, targetx } = get.event();
							const att = get.attitude(player, targetx);
							return att > 0 ? "摸牌" : "弃牌";
						})
						.set("targetx", targetx)
						.forResult();
				} else {
					result = { control: "摸牌" };
				}
				const control = result?.control;
				if (!targetx.isIn() || !control) {
					continue;
				}
				target.popup(control);
				game.log(target, "选择", "#g" + control);
				target.line(targetx);
				if (control == "摸牌") {
					await targetx.draw();
				} else if (control == "弃牌" && targetx.countDiscardableCards(target, "he")) {
					await target.discardPlayerCard(targetx, "he", true);
				}
			}
		},
	}
```

### stdyoudi 名字:诱敌
描述: 结束阶段，你可以将一张红色牌当【顺手牵羊】使用。
```js
stdyoudi: {
		audio: "xinfu_youdi",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.countCards(
				"hes",
				card => player.hasUseTarget(get.autoViewAs({ name: "shunshou" }, [card]), false, false) && get.color(card, player) == "red"
			);
		},
		direct: true,
		clearTime: true,
		async content(event, trigger, player) {
			const next = player.chooseToUse();
			next.set("openskilldialog", get.prompt2(`${event.name}`));
			next.set("norestore", true);
			next.set("_backupevent", `${event.name}_backup`);
			next.set("custom", {
				add: {},
				replace: { window() {} },
			});
			next.backup(`${event.name}_backup`);
			next.set("logSkill", event.name);
			await next;
		},
		subSkill: {
			backup: {
				filterCard(card, player) {
					return get.itemtype(card) == "card" && get.color(card, player) == "red";
				},
				position: "hes",
				viewAs: { name: "shunshou" },
				check(card) {
					return 7 - get.value(card);
				},
				log: false,
			},
		},
	}
```

## std_sunhao 名字:标孙皓 势力:wu

### stdcanshi 名字:残蚀
描述: 锁定技，摸牌阶段，你改为摸X张牌（X为场上的已受伤角色且X至少为1）。然后本回合你使用【杀】或普通锦囊牌指定目标后，若其已受伤，你弃置一张牌。
```js
stdcanshi: {
		audio: "canshi",
		inherit: "canshi",
		forced: true,
		async content(event, trigger, player) {
			trigger.changeToZero();
			await player.draw(
				Math.max(
					1,
					game.countPlayer(target => {
						if (player.hasSkill("guiming") && target != player && target.group == "wu") {
							return true;
						}
						return target.isDamaged();
					})
				)
			);
			player.addTempSkill("stdcanshi_effect");
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { player: "useCardToPlayered" },
				filter(event, player) {
					if (event.card.name != "sha" && get.type(event.card) != "trick") {
						return false;
					}
					return event.target.isDamaged() && player.countCards("he");
				},
				forced: true,
				autodelay: true,
				async content(event, trigger, player) {
					await player.chooseToDiscard({
						forced: true,
						position: "he",
					});
				},
			},
		},
	}
```

### chouhai
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### guiming
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## std_mateng 名字:标马腾 势力:qun

### stdxiongyi 名字:雄异
描述: 限定技，出牌阶段，你可以选择任意名角色，这些角色依次选择是否使用一张不可被响应的【杀】，然后这些角色重复此流程直至有角色不使用【杀】。
```js
stdxiongyi: {
		limited: true,
		audio: "xiongyi",
		enable: "phaseUse",
		filterTarget: true,
		selectTarget: [1, Infinity],
		multitarget: true,
		multiline: true,
		skillAnimation: true,
		animationColor: "thunder",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const targets = event.targets.sortBySeat();
			let keep = true;
			while (true) {
				let stop = false;
				for (const target of targets) {
					let next = target
						.chooseToUse(function (card) {
							const event = get.event();
							if (!lib.filter.cardEnabled(card, event.player, event)) {
								return false;
							}
							return get.name(card) == "sha";
						}, "雄异：是否使用一张不可被响应的【杀】？")
						.set("oncard", card => {
							_status.event.directHit.addArray(game.players);
						});
					if (!keep) {
						next.set("prompt2", "若你不使用，则结束此流程");
					}
					const result = await next.forResult();
					if (!result.bool && !keep) {
						stop = true;
						break;
					}
				}
				if (keep) {
					keep = false;
				}
				if (stop) {
					break;
				}
			}
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					if (player.hasUnknown()) {
						return 0;
					}
					return target.countCards("hs");
				},
			},
		},
	}
```

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### stdyouji 名字:游骑
描述: 主公技，准备阶段，你可以移动一名群势力角色的一张坐骑牌。
```js
stdyouji: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.canMoveCard(
				null,
				true,
				game.filterPlayer(i => {
					return i.group == "qun";
				}),
				card => {
					return [3, 4, 6].includes(parseInt(get.subtype(card)?.slice("equip".length)));
				},
				"nojudge"
			);
		},
		direct: true,
		clearTime: true,
		zhuSkill: true,
		async content(event, trigger, player) {
			await player
				.moveCard({
					prompt: get.prompt2("stdyouji"),
					sourceTargets: game.filterPlayer(i => {
						return i.group == "qun";
					}),
					filter(card) {
						return [3, 4, 6].includes(parseInt(get.subtype(card)?.slice("equip".length) ?? "0"));
					},
				})
				.set("nojudge", true)
				.set("logSkill", "stdyouji");
		},
	}
```

## std_mayunlu 名字:标马云騄 势力:shu

### stdfengpo 名字:凤魄
描述: 当你使用【杀】造成伤害时，你可以弃置你或其的一张牌，若以此法弃置了方片牌，则此伤害+1。
```js
stdfengpo: {
		audio: "fengpo",
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return (
				event.card?.name == "sha" &&
				[player, event.player].some(target => {
					return target.isIn() && target.countCards("he");
				})
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					const event = get.event().getTrigger();
					return [player, event.player]
						.filter(targetx => {
							return targetx.isIn() && targetx.countCards("he");
						})
						.includes(target);
				})
				.set("ai", target => {
					const player = get.event().player,
						aim = get.event().getTrigger().player;
					let eff = get.damageEffect(aim, player, player);
					if (aim === player && player.getDiscardableCards(player, "he", card => get.suit(card) == "diamond")) {
						eff /= 4;
					}
					return eff + get.effect(target, { name: "guohe" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player
				.discardPlayerCard(target, "he", true)
				.set("ai", button => {
					const suit = get.suit(button.link);
					return get.event().att * (suit == "diamond" ? 5 : 1) * get.value(button.link, player);
				})
				.set("prompt", "凤魄：弃置" + (target != player ? get.translation(target) : "") + "一张牌")
				.set("prompt2", "若弃置了方片牌，则此伤害+1")
				.set("att", get.sgnAttitude(player, target))
				.forResult();
			if (result.bool) {
				if (result.cards && result.cards.some(i => get.suit(i, target) == "diamond")) {
					player.popup("洗具");
					trigger.num++;
				}
			}
		},
	}
```

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## std_jianggan 名字:标蒋干 势力:wei

### stddaoshu 名字:盗书
描述: 每轮限一次，一名角色的准备阶段，你可以展示除其外一名角色的一张牌，然后令其获得此牌，且你与其本回合不能使用与此牌花色相同的牌。
```js
stddaoshu: {
		audio: "daoshu",
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(target => {
				return target != event.player && target.countCards("h");
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					const event = get.event().getTrigger();
					return target != event.player && target.countCards("h");
				})
				.set("ai", target => {
					const player = get.event().player;
					if (get.attitude(player, target) >= 0) {
						return 0;
					}
					return 1 / target.countCards("h");
				})
				.forResult();
		},
		async content(event, trigger, player) {
			player.tempBanSkill("stddaoshu", "roundStart", false);
			const target = event.targets[0];
			const result = await player.choosePlayerCard(target, "h", true).forResult();
			if (result.bool) {
				const cards = result.cards || [];
				if (cards.length) {
					await player.showCards(cards, get.translation(player) + "发动了【盗书】");
					await trigger.player.gain(cards, target, "give");
					const suits = cards.reduce((list, card) => {
						return list.add(get.suit(card, target));
					}, []);
					if (suits.length) {
						for (const i of [player, trigger.player]) {
							i.addTempSkill("stddaoshu_effect");
							i.markAuto("stddaoshu_effect", suits);
						}
					}
				}
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				mod: {
					cardEnabled(card, player) {
						if (player.getStorage("stddaoshu_effect").includes(get.suit(card))) {
							return false;
						}
					},
					cardSavable(card, player) {
						if (player.getStorage("stddaoshu_effect").includes(get.suit(card))) {
							return false;
						}
					},
				},
				intro: { content: "不能使用$花色的牌" },
			},
		},
	}
```

### stddaizui 名字:戴罪
描述: 锁定技，当你受到伤害后，你视为本轮未发动过〖盗书〗。
```js
stddaizui: {
		audio: "spdaizui",
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return player.isTempBanned("stddaoshu");
		},
		forced: true,
		async content(event, trigger, player) {
			delete player.storage.temp_ban_stddaoshu;
			player.popup("盗书");
			game.log(player, "重置了技能", "#g【盗书】");
		},
		ai: {
			combo: "stddaoshu",
		},
	}
```

## std_zhouchu 名字:标周处 势力:wu

### stdxiongxia 名字:凶侠
描述: 你可以将两张牌当作【决斗】对两名其他角色使用。你以此法使用的【决斗】结算完毕后，若所有目标角色都受到了此牌造成的伤害，则〖凶侠〗于本回合失效。
```js
stdxiongxia: {
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
			player.addTempSkill("stdxiongxia_effect");
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return (
						event.skill == "stdxiongxia" &&
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
					player.tempBanSkill("stdxiongxia");
				},
			},
		},
	}
```

## std_lvlingqi 名字:标吕玲绮 势力:qun

### stdhuiji 名字:挥戟
描述: 你使用【杀】可以额外指定至多两个目标。若如此做，目标角色响应此【杀】时，其他目标角色可以代替其使用【闪】。
```js
stdhuiji: {
		audio: "guowu",
		trigger: { player: "useCard2" },
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			return game.hasPlayer(target => {
				return (
					!event.targets.includes(target) &&
					lib.filter.targetEnabled2(event.card, player, target) &&
					lib.filter.targetInRange(event.card, player, target)
				);
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(
					get.prompt2(event.skill),
					(card, player, target) => {
						const event = get.event().getTrigger();
						return (
							!event.targets.includes(target) &&
							lib.filter.targetEnabled2(event.card, player, target) &&
							lib.filter.targetInRange(event.card, player, target)
						);
					},
					[1, 2]
				)
				.set("ai", target => {
					const player = get.event().player,
						event = get.event().getTrigger();
					return get.effect(target, event.card, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.targets.addArray(event.targets);
			player.addTempSkill("stdhuiji_effect");
			trigger.card.stdhuiji = true;
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { global: "chooseToUseBegin" },
				filter(event, player) {
					if (event._stdhuiji_effect) {
						return false;
					}
					const evt = event.getParent(2);
					return evt.card?.stdhuiji;
				},
				forced: true,
				popup: false,
				forceDie: true,
				async content(event, trigger, player) {
					trigger._stdhuiji_effect = true;
					const targets = trigger
						.getParent(2)
						.targets.filter(i => {
							return i != trigger.player;
						})
						.sortBySeat();
					if (targets.length) {
						for (const target of targets) {
							if (!target.isIn()) {
								continue;
							}
							const next = target.chooseToUse("挥战：是否替" + get.translation(trigger.player) + "使用一张【闪】？", function (card) {
								if (get.name(card) != "shan") {
									return false;
								}
								return lib.filter.filterCard.apply(this, arguments);
							});
							next.set("ai", () => {
								const event = _status.event;
								return get.attitude(event.player, event.source) - 2;
							});
							next.set("skillwarn", "替" + get.translation(player) + "使用一张闪");
							next.autochoose = lib.filter.autoRespondShan;
							next.set("source", player);
							const result = await next.forResult();
							if (result.bool) {
								trigger.result = {
									bool: true,
									card: { name: "shan", isCard: true, cards: result.cards.slice() },
									cards: result.cards.slice(),
								};
								trigger.responded = true;
								trigger.animate = false;
								break;
							}
						}
					}
				},
			},
		},
	}
```

## std_dc_yanghu 名字:标羊祜 势力:wei

### stdmingfa 名字:明伐
描述: 出牌阶段，你可以对一名体力值大于1的角色造成1点伤害，然后此技能失效直至其死亡或回复体力。
```js
stdmingfa: {
		audio: "dcmingfa",
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(target => target.getHp() > 1);
		},
		filterTarget(card, player, target) {
			return target.getHp() > 1;
		},
		async content(event, trigger, player) {
			const target = event.target;
			await target.damage();
			if (target.isIn()) {
				player.tempBanSkill("stdmingfa", "forever");
				player.addSkill("stdmingfa_used");
				player.markAuto("stdmingfa_used", [target]);
			}
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
				trigger: { global: ["dieAfter", "recoverAfter"] },
				filter(event, player) {
					return player.getStorage("stdmingfa_used").includes(event.player);
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.storage.temp_ban_stdmingfa?.delete?.(); // optional cleanup if needed
					delete player.storage[`temp_ban_stdmingfa`];
					player.popup("明伐");
					game.log(player, "恢复了技能", "#g【明伐】");
					player.removeSkill("stdmingfa_used");
				},
			},
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					return get.sgn(get.attitude(player, target)) * get.damageEffect(target, player, player);
				},
			},
		},
	}
```

## std_dc_luotong 名字:标骆统 势力:wu

### stdjinjian 名字:进谏
描述: 每回合每项各限一次，当你造成/受到伤害时，你可防止此伤害，然后你本回合内下一次造成/受到的伤害+1。
```js
stdjinjian: {
		audio: "jinjian",
		trigger: {
			source: "damageBegin2",
			player: "damageBegin4",
		},
		filter(event, player, name) {
			return !player.getStorage("stdjinjian_used").includes(name.slice(11));
			// return !player.hasSkill(`stdjinjian_effect${name.slice(11)}`);
		},
		prompt2(event, player, name) {
			return `防止即将${name == "damageBegin2" ? "造成" : "受到"}的伤害`;
		},
		check(event, player) {
			return get.damageEffect(event.player, event.source, player) < 0;
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.addTempSkill("stdjinjian_used");
			player.markAuto("stdjinjian_used", event.triggername.slice(11));
			player.addTempSkill(`stdjinjian_effect${event.triggername.slice(11)}`);
			player.addMark(`stdjinjian_effect${event.triggername.slice(11)}`, 1, false);
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
			effect2: {
				trigger: { source: "damageBegin1" },
				forced: true,
				charlotte: true,
				onremove: true,
				async content(event, trigger, player) {
					const num = player.countMark(event.name);
					trigger.num += num;
					player.removeMark(event.name, num, false);
				},
				marktext: "进",
				intro: {
					content: "下次造成的伤害+$",
				},
			},
			effect4: {
				trigger: { player: "damageBegin3" },
				forced: true,
				charlotte: true,
				onremove: true,
				async content(event, trigger, player) {
					const num = player.countMark(event.name);
					trigger.num += num;
					player.removeMark(event.name, num, false);
				},
				marktext: "谏",
				intro: {
					content: "下次受到的伤害+$",
				},
			},
		},
		ai: {
			maixie_defend: true,
			threaten: 0.9,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return;
					}
					if (player._stdjinjian_tmp) {
						return;
					}
					if (_status.event.getParent("useCard", true) || _status.event.getParent("_wuxie", true)) {
						return;
					}
					if (get.tag(card, "damage")) {
						if (target.hasSkill("stdjinjian_effect4")) {
							return [1, -2];
						} else if (!target.getStorage("stdjinjian_used").includes("4")) {
							if (get.attitude(player, target) > 0) {
								return [0, 0.2];
							}
							if (get.attitude(player, target) < 0) {
								var sha = player.getCardUsable({ name: "sha" });
								player._stdjinjian_tmp = true;
								var num = player.countCards("h", function (card) {
									if (card.name == "sha") {
										if (sha == 0) {
											return false;
										} else {
											sha--;
										}
									}
									return get.tag(card, "damage") && player.canUse(card, target) && get.effect(target, card, player, player) > 0;
								});
								delete player._stdjinjian_tmp;
								if (player.hasSkillTag("damage")) {
									num++;
								}
								if (num < 2) {
									return [0, 0.8];
								}
							}
						}
					}
				},
			},
		},
	}
```

### stdrenzheng 名字:仁政
描述: 锁定技，当有伤害被防止时，你令当前回合角色摸一张牌。
```js
stdrenzheng: {
		audio: "renzheng",
		trigger: { global: ["damageCancelled", "damageZero"] },
		filter(event, player, name) {
			if (!_status.currentPhase?.isIn()) {
				return false;
			}
			if (name == "damageCancelled") {
				return true;
			}
			return event.change_history.some(i => i < 0);
		},
		forced: true,
		logTarget: () => _status.currentPhase,
		async content(event, trigger, player) {
			_status.currentPhase.draw();
		},
	}
```

## std_lijue 名字:标李傕 势力:qun

### stdxiongsuan 名字:凶算
描述: 锁定技，准备阶段，若你的体力值为全场最多，则你须对至少一名体力值等于你的角色各造成1点伤害。
```js
stdxiongsuan: {
		audio: "xinfu_langxi",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.isMaxHp();
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(
					"请选择【凶算】的目标",
					lib.translate.stdxiongsuan_info,
					(card, player, target) => {
						return target.getHp() == player.getHp();
					},
					[1, Infinity],
					true
				)
				.set("ai", target => {
					const player = get.event().player;
					return get.damageEffect(target, player, player);
				})
				.forResult();
		},
		locked: true,
		async content(event, trigger, player) {
			for (const i of event.targets) {
				await i.damage();
			}
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (target.hp <= 1 || !target.hasFriend() || !_status.currentPhase || !get.tag(card, "damage")) {
						return;
					}
					let hp = target.hp - 1;
					if (
						game.hasPlayer(cur => {
							return cur.hp > hp;
						})
					) {
						return;
					}
					let ori = game.countPlayer(cur => {
							return cur.hp === hp + 1 && get.attitude(target, cur) <= 0;
						}),
						now = game.countPlayer(cur => {
							return cur.hp === hp && get.attitude(target, cur) <= 0;
						}),
						seat = 1,
						tar = _status.currentPhase.next;
					while (tar !== target) {
						if (get.attitude(target, tar) <= 0) {
							seat++;
						}
						tar = tar.next;
					}
					return [1, (2 * (now - ori)) / seat];
				},
			},
		},
	}
```

## std_chengpu 名字:标程普 势力:wu

### stdchunlao 名字:醇醪
描述: 弃牌阶段结束时，若你本阶段弃置了不少于两张牌，则你可以用这些牌交换一名其他角色的手牌，然后其可以令你回复1点体力。
```js
stdchunlao: {
		audio: "chunlao",
		trigger: { player: "phaseDiscardEnd" },
		filter(event, player) {
			return (event.cards || []).length >= 2 && game.hasPlayer(target => target != player);
		},
		async cost(event, trigger, player) {
			const cards = trigger.cards;
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "用" + get.translation(cards) + "交换一名其他角色的手牌", (card, player, target) => target != player)
				.set("ai", target => {
					const { cards, player } = get.event();
					const att = get.attitude(player, target);
					return (cards.length - target.countCards("h") + 0.1) * att;
				})
				.set("cards", cards)
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = trigger.cards,
				target = event.targets[0];
			await target.loseToDiscardpile(target.getCards("h"));
			await target.gain(cards, "gain2").set("giver", player);
			if (player.isDamaged()) {
				const { bool } = await target
					.chooseBool("是否令" + get.translation(player) + "回复1点体力？")
					.set("choice", get.recoverEffect(player, target, target) > 0)
					.forResult();
				if (bool) {
					target.line(player);
					await player.recover(target);
				}
			}
		},
	}
```

## std_db_wenyang 名字:标文鸯 势力:wei

### stdquedi 名字:却敌
描述: 你可以将【杀】当作【决斗】使用。
```js
stdquedi: {
		audio: "dbquedi",
		enable: "chooseToUse",
		filterCard: { name: "sha" },
		position: "hes",
		viewAs: { name: "juedou" },
		viewAsFilter(player) {
			if (!player.countCards("hes", { name: "sha" })) {
				return false;
			}
		},
		check(card) {
			return 6 - get.value(card);
		},
	}
```

## std_re_dengzhi 名字:标邓芝 势力:shu

### stdzhiyinmeng 名字:急盟
描述: 准备阶段，你可以交给一名其他角色任意张牌，然后其可以交给你任意张牌。
```js
stdzhiyinmeng: {
		audio: "weimeng",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("he");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: lib.filter.notMe,
					filterCard: true,
					position: "he",
					selectCard: [1, Infinity],
					complexCard: true,
					complexTarget: true,
					complexSelect: true,
					allowChooseAll: true,
					ai1(card) {
						if (ui.selected.cards.length && card.name != "du") {
							return 0;
						}
						if (card.name == "du") {
							return 114514;
						}
						return 5 - get.value(card);
					},
					ai2(target) {
						if (!ui.selected.cards.length) {
							return 0;
						}
						const player = get.event().player,
							att = get.attitude(player, target);
						if (ui.selected.cards[0].name == "du") {
							if (!target.hasSkillTag("nodu")) {
								return -att;
							}
							return -0.00001 * att;
						}
						return att;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.give(event.cards, target);
			await target.chooseToGive("he", [1, Infinity], player, "allowChooseAll");
		},
	}
```

### stdhehe 名字:和合
描述: 摸牌阶段结束时，你可以令至多两名手牌数与你相同的其他角色各摸一张牌。
```js
stdhehe: {
		audio: "jianliang",
		trigger: { player: "phaseDrawEnd" },
		filter(event, player) {
			return game.hasPlayer(target => {
				return target != player && target.countCards("h") == player.countCards("h");
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(
					get.prompt2(event.skill),
					(card, player, target) => {
						return target != player && target.countCards("h") == player.countCards("h");
					},
					[1, 2]
				)
				.set("ai", target => {
					const player = get.event().player;
					return get.effect(target, { name: "draw" }, player, player);
				})
				.forResult();
		},
		locked: true,
		async content(event, trigger, player) {
			await game.asyncDraw(event.targets);
			await game.delayx();
		},
	}
```

## std_zhangyì 名字:标张翼 势力:shu

### stdzhiyi 名字:执义
描述: 锁定技，一名角色的回合结束时，若你本回合使用过【杀】，则你视为使用【杀】或摸一张牌。
```js
stdzhiyi: {
		audio: "zhiyi",
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return player.getHistory("useCard", evt => {
				return evt.card.name == "sha";
			}).length;
		},
		forced: true,
		async content(event, trigger, player) {
			const result = await player.chooseUseTarget("执义：视为使用【杀】，或摸一张牌", { name: "sha" }, false).forResult();
			if (!result.bool) {
				await player.draw();
			}
		},
	}
```

## std_chengyu 名字:标程昱 势力:wei

### stdshefu 名字:设伏
描述: ①结束阶段，你可以将一张手牌称为“伏兵”扣置于武将牌上。②一名角色使用牌时，你可以移去武将牌上的一张与此牌同名的“伏兵”并令此牌无效。
```js
stdshefu: {
		audio: "shefu",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.countCards("h");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(get.prompt(event.skill), "将一张手牌置于武将牌上", "h")
				.set("ai", card => {
					return (
						(lib.card.list
							.slice()
							.map(list => list[2])
							.filter(name => {
								return card.name == name;
							}).length -
							1) /
						(get.value(card) || 0.5)
					);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await player.addToExpansion({
				cards: event.cards,
				source: player,
				animate: "giveAuto",
				gaintag: ["stdshefu"],
			});
		},
		marktext: "伏",
		intro: {
			markcount: "expansion",
			mark(dialog, _, player) {
				const cards = player.getExpansions("stdshefu");
				if (player.isUnderControl(true) && cards.length) {
					dialog.addAuto(cards);
				} else {
					return "共有" + get.cnNumber(cards.length) + "张“伏兵”";
				}
			},
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		group: "stdshefu_effect",
		subSkill: {
			effect: {
				audio: "shefu",
				trigger: { global: "useCard" },
				filter(event, player) {
					return player.getExpansions("stdshefu").some(card => card.name == event.card.name);
				},
				async cost(event, trigger, player) {
					let result = await player
						.chooseButton(["###" + get.prompt("stdshefu") + "###弃置一张同名牌，令此牌无效", player.getExpansions("stdshefu")])
						.set("filterButton", button => {
							return button.link.name == get.event().getTrigger().card.name;
						})
						.set("ai", button => {
							return get.event().goon ? 1 : 0;
						})
						.set("goon", lib.skill.sbkanpo.subSkill.kanpo.check(trigger, player))
						.forResult();
					if (result.bool && result.links) {
						result.cards = result.links.slice();
						delete result.links;
					}
					event.result = result;
				},
				async content(event, trigger, player) {
					await player.loseToDiscardpile(event.cards);
					trigger.targets.length = 0;
					trigger.all_excluded = true;
				},
			},
		},
	}
```

### stdyibing 名字:益兵
描述: 一名角色进入濒死状态时，你可以获得其一张牌。
```js
stdyibing: {
		audio: "benyu",
		trigger: { global: "dying" },
		filter(event, player) {
			return event.player != player && event.player.countCards("eh");
		},
		logTarget: "player",
		check(event, player) {
			return get.effect(event.player, { name: "shunshou_copy2" }, player, player) > 0;
		},
		async content(event, trigger, player) {
			await player.gainPlayerCard(trigger.player, "he", `获得${get.translation(trigger.player)}一张牌`, true);
		},
	}
```

## std_fanyufeng 名字:标樊玉凤 势力:qun

### stdbazhan 名字:把盏
描述: 出牌阶段限两次，你可以将一张手牌展示并交给一名男性角色，然后其可以展示并交给你一张与此牌类别不同的手牌。
```js
stdbazhan: {
		audio: "bazhan",
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		filterCard: true,
		position: "h",
		filterTarget(card, player, target) {
			return target != player && target.hasSex("male");
		},
		discard: false,
		lose: false,
		delay: false,
		usable: 2,
		check(card) {
			if (card.name == "du") {
				return 114514;
			}
			return 5 - get.value(card);
		},
		async content(event, trigger, player) {
			const target = event.target;
			await player.showCards(event.cards);
			await player.give(event.cards, target, "visible");
			if (target.countCards("h")) {
				await target
					.chooseToGive(player, (card, player) => {
						return get.type2(card) != get.type2(get.event().cards[0]);
					})
					.set("cards", event.cards);
			}
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					const cardxx = ui.selected.cards[0];
					if (cardxx.name == "du") {
						return -100;
					}
					if (!player.hasSkill("stdzhanying")) {
						return 1;
					}
					if (target.countMark("stdzhanying_count") == target.countCards("h") + 1) {
						const cards = player.getCards("hs", card => {
							return (
								card != cardxx &&
								get.tag(card, "damage") &&
								player.canUse(card, target) &&
								get.effect(target, card, player, player) > 0
							);
						});
						if (!cards.length) {
							return 1;
						}
						let cardx = cards.filter(card => get.name(card) == "sha");
						cardx.sort((a, b) => get.effect(target, b, player, player) - get.effect(target, a, player, player));
						cardx = cardx.slice(Math.min(cardx.length, player.getCardUsable("sha")), cardx.length);
						cards.removeArray(cardx);
						return -cards.reduce((sum, card) => sum + get.effect(target, card, player, player), 0);
					}
					return 1;
				},
			},
		},
	}
```

### stdzhanying 名字:醮影
描述: 锁定技，你的回合内，手牌数比回合开始时多的角色不能使用红色牌且受到的伤害+1。
```js
stdzhanying: {
		audio: "jiaoying",
		trigger: { global: "damageBegin2" },
		filter(event, player) {
			if (_status.currentPhase !== player) {
				return false;
			}
			return event.player.countCards("h") > event.player.countMark("stdzhanying_count");
		},
		forced: true,
		logTarget: "player",
		async content(event, trigger, player) {
			trigger.num++;
		},
		global: "stdzhanying_mark",
		subSkill: {
			count: {
				charlotte: true,
				onremove: true,
				intro: {
					markcount: storage => (storage || 0).toString(),
					content: "本回合开始时手牌数为#张",
				},
			},
			mark: {
				charlotte: true,
				trigger: { global: "phaseBegin" },
				filter(event, player) {
					return event.player.hasSkill("stdzhanying", null, null, false);
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					player.addTempSkill("stdzhanying_count");
					player.addMark("stdzhanying_count", player.countCards("h"), false);
				},
				mod: {
					cardEnabled(card, player) {
						if (!_status.currentPhase || !_status.currentPhase.hasSkill("stdzhanying")) {
							return;
						}
						if (get.color(card) == "red" && player.countMark("stdzhanying_count") < player.countCards("h")) {
							return false;
						}
					},
					cardSavable(card, player) {
						if (!_status.currentPhase || !_status.currentPhase.hasSkill("stdzhanying")) {
							return;
						}
						if (get.color(card) == "red" && player.countMark("stdzhanying_count") < player.countCards("h")) {
							return false;
						}
					},
				},
			},
		},
	}
```

## std_feiyi 名字:标费祎 势力:shu

### stdtiaohe 名字:调和
描述: 出牌阶段限一次，你可以弃置场上的一张装备牌和一张防具牌（不能为同一名角色的牌）。
```js
stdtiaohe: {
		audio: "fyjianyu",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(tar1 => {
				return (
					tar1.countDiscardableCards(player, "e", i => get.subtype(i) == "equip2") &&
					game.hasPlayer(tar2 => {
						return tar1 !== tar2 && tar2.countDiscardableCards(player, "e");
					})
				);
			});
			// 下面是将判定区内的装备牌也考虑在内的
			// let e = 0,
			// 	fj = false;
			// game.countPlayer(target => {
			// 	let es = target.getDiscardableCards(player, "e"),
			// 		js = target.getDiscardableCards(player, "j", i => get.type(i) == "equip");
			// 	if (es.length) {
			// 		e++;
			// 	}
			// 	e += js.length;
			// 	if (!fj && (es.some(card => get.subtype(card) == "equip2") || js.some(card => get.subtype(card) == "equip2"))) {
			// 		fj = true;
			// 	}
			// });
			// return fj && e >= 2;
		},
		filterTarget(card, player, target) {
			if (!ui.selected.targets.length || ui.selected.targets[0].countDiscardableCards(player, "e", i => get.subtype(i) == "equip2")) {
				return target.countDiscardableCards(player, "e");
			}
			return target.countDiscardableCards(player, "e", i => get.subtype(i) == "equip2");
			// let e = 0;
			// let es = target.getDiscardableCards(player, "e"),
			// 	js = target.getDiscardableCards(player, "j", i => get.type(i) == "equip");
			// if (es.length) {
			// 	e++;
			// }
			// e += js.length;
			// if (!e) {
			// 	return false;
			// }
			// if (!ui.selected.targets.length) {
			// 	return true;
			// }
			// if (!ui.selected.targets[0].countDiscardableCards(player, "ej", i => get.subtype(i) == "equip2")) {
			// 	return es.some(card => get.subtype(card) == "equip2") || js.some(card => get.subtype(card) == "equip2");
			// }
			// return true;
		},
		selectTarget() {
			return 2;
			// /-?
			// if (!ui.selected.targets.length) {
			// 	return [1, 2];
			// }
			// let e = 0,
			// 	player = get.event().player,
			// 	target = ui.selected.targets[0];
			// let es = target.getDiscardableCards(player, "e"),
			// 	js = target.getDiscardableCards(player, "j", i => get.type(i) == "equip");
			// if (es.length) {
			// 	e++;
			// }
			// e += js.length;
			// if (e >= 2 && (es.some(card => get.subtype(card) == "equip2") || js.some(card => get.subtype(card) == "equip2"))) {
			// 	return [1, 2];
			// }
			// return 2;
		},
		complexTarget: true,
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			const targets = event.targets.slice();
			if (targets.length == 1) {
				await player
					.discardPlayerCard("ej", targets[0], true, 2)
					.set("filterButton", button => {
						let position = get.position(button.link),
							subtype = get.subtype(button.link);
						if (!subtype || !subtype.startsWith("equip")) {
							return false;
						}
						if (ui.selected.buttons.length) {
							let pos = get.position(ui.selected.buttons[0].link),
								sub = get.subtype(ui.selected.buttons[0].link);
							if (pos == "e" && position == "e") {
								return false;
							}
							if (sub == "equip2") {
								return true;
							}
							return subtype == "equip2";
						}
						if (position == "e") {
							if (!get.event().js.some(i => get.subtype(i) == "equip2")) {
								return subtype == "equip2";
							}
							return true;
						}
						if (!get.event().es.length) {
							return subtype == "equip2";
						}
						return true;
					})
					.set(
						"es",
						targets[0].getDiscardableCards(player, "e", i => get.subtype(i) == "equip2")
					)
					.set(
						"js",
						targets[0].getDiscardableCards(player, "j", i => get.type(i) == "equip")
					);
				return;
			}
			let canfj = targets.filter(target => {
				return target.countDiscardableCards(player, "e", i => get.subtype(i) == "equip2");
			});
			for (let i = 0; i < 2; i++) {
				if (i && canfj.includes(targets[i]) && !targets[i].countDiscardableCards(player, "e", i => get.subtype(i) == "equip2")) {
					break;
				}
				const result = await player
					.discardPlayerCard("e", targets[i], true)
					.set("filterButton", button => {
						if (get.event().fj) {
							return get.subtype(button.link) == "equip2";
						}
						// return true;
						return get.type(button.link) == "equip";
					})
					.set("fj", canfj.length === 1 && canfj.includes(targets[i]))
					.forResult();
				if (result.bool && get.subtype(result.cards[0]) == "equip2") {
					canfj = [];
				}
			}
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					let att = get.attitude(player, target),
						es = [];
					target.countDiscardableCards(player, "e", i => {
						es.push(get.value(i, target));
					});
					let min = Math.min(...es),
						max = Math.max(...es),
						ext = target.hasSkillTag("noe") ? 10 : 0;
					if (att <= 0) {
						return ext - max;
					}
					return ext - min;
				},
			},
		},
	}
```

### stdqiansu 名字:谦素
描述: 当你成为锦囊牌的目标后，若你的装备区没有牌，则你可以摸一张牌。
```js
stdqiansu: {
		audio: "shengxi_feiyi",
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return get.type2(event.card) == "trick" && !player.countCards("e");
		},
		frequent: true,
		async content(event, trigger, player) {
			player.draw();
		},
		ai: {
			noe: true,
			effect: {
				target(card, player, target) {
					if (target.countCards("e")) {
						return;
					}
					if (target == player && get.type(card) == "equip" && get.equipValue(card) < 5) {
						return 0;
					}
					if (get.type2(card) == "trick") {
						return [1, 0.6];
					}
				},
			},
		},
	}
```

## std_guanxing 名字:标关兴 势力:shu

### stdwuyou 名字:武佑
描述: 出牌阶段限一次，你可以与一名角色进行拼点，若你没赢，你本回合视为拥有〖武圣〗。然后拼点赢的角色视为对没赢的角色使用一张【决斗】。
```js
stdwuyou: {
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
				await player.addAdditionalSkills(event.name + "_effect", "new_rewusheng");
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
		derivation: "new_rewusheng",
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
	}
```

## std_fuhuanghou 名字:标伏寿 势力:qun

### stdqiuyuan 名字:求援
描述: 当你成为一名角色使用【杀】的目标时，你可以令另一名其他角色选择一项：1.交给你一张牌；2.成为此【杀】的额外目标。
```js
stdqiuyuan: {
		audio: "xinqiuyuan",
		inherit: "qiuyuan",
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const { card } = trigger;
			const result = await target
				.chooseToGive(`交给${get.translation(player)}一张牌，或成为${get.translation(card)}的额外目标`, player)
				.set("ai", card => {
					const { player, target } = get.event();
					return get.attitude(player, target) >= 0 ? 1 : -1;
				})
				.forResult();
			if (!result?.bool) {
				trigger.getParent().targets.push(target);
				trigger.getParent().triggeredTargets2.push(target);
				game.log(target, "成为了", card, "的额外目标");
			}
		},
	}
```

### stdzhuikong 名字:惴恐
描述: 其他角色的准备阶段，你可以用【杀】与其拼点，赢的角色可以使用对方的拼点牌。
```js
stdzhuikong: {
		audio: "rezhuikong",
		trigger: { global: "phaseZhunbeiBegin" },
		check(event, player) {
			if (get.attitude(player, event.player) < -2) {
				var cards = player.getCards("h");
				if (cards.length > player.hp) {
					return true;
				}
				for (var i = 0; i < cards.length; i++) {
					var useful = get.useful(cards[i]);
					if (useful < 5) {
						return true;
					}
					if (get.number(cards[i]) > 9 && useful < 7) {
						return true;
					}
				}
			}
			return false;
		},
		filter(event, player) {
			if (player == event.player) {
				return false;
			}
			if (!player.canCompare(event.player)) {
				return false;
			}
			return (_status.connectMode && player.hasCards("h")) || player.hasCards("h", card => get.name(card) == "sha");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(get.prompt(event.skill, trigger.player), "使用一张【杀】与其拼点", card => {
					return get.name(card) == "sha";
				})
				.set("ai", card => {
					if (_status.event.effect) {
						return 6 - get.value(card);
					}
					return 0;
				})
				.set("effect", lib.skill.stdzhuikong.check(trigger, player))
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const target = event.targets[0];
			const next = player.chooseToCompare(target);
			if (!next.fixedResult) {
				next.fixedResult = {};
			}
			next.fixedResult[player.playerid] = event.cards[0];
			const result = await next.forResult();
			if (result?.winner) {
				const card = result[result.winner == player ? "target" : "player"];
				if (!card || !result.winner.hasUseTarget(card)) {
					return;
				}
				await result.winner.chooseUseTarget(card);
			}
		},
	}
```

## std_liubiao 名字:标刘表 势力:qun

### stdzishou 名字:自守
描述: 出牌阶段开始前，你可以摸场上势力数张牌，然后跳过此阶段。
```js
stdzishou: {
		audio: "zishou",
		trigger: {
			player: "phaseUseBefore",
		},
		check(event, player) {
			return player.countCards("h") + 2 <= player.getHandcardLimit();
		},
		async content(event, trigger, player) {
			await player.draw(game.countGroup());
			trigger.cancel();
		},
		ai: {
			threaten: 1.5,
		},
	}
```

### zongshi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### stdjujin 名字:据荆
描述: 主公技，当你受到其他群势力角色造成的伤害后，你可以弃置两张牌，然后回复1点体力。
```js
stdjujin: {
		trigger: {
			player: "damageEnd",
		},
		filter(event, player) {
			if (!event.source || event.source.group != "qun") {
				return false;
			}
			return player.countCards("he") > 1;
		},
		zhuSkill: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(get.prompt2(event.skill), 2, "he")
				.set("ai", card => {
					const player = get.player();
					if (get.recoverEffect(player, player, player) <= 0 || player.hp >= player.maxHp) {
						return 0;
					}
					return 5 - get.value(card);
				})
				.set("chooseonly", true)
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			await player.discard(cards);
			if (player.isDamaged()) {
				await player.recover();
			}
		},
	}
```

## std_gongsunyuan 名字:标公孙渊 势力:qun

### stdhuaiyi 名字:怀异
描述: 锁定技，准备阶段，你展示所有手牌，若颜色不同，你弃置其中一种颜色的所有牌，然后获得至多等量名其他角色各一张牌，若选择角色数大于1，你失去1点体力。
```js
stdhuaiyi: {
		audio: "rehuaiyi",
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			return player.countCards("h");
		},
		forced: true,
		async content(event, trigger, player) {
			const hs = player.getCards("h");
			await player.showCards(hs, get.translation(player) + "发动了【怀异】");
			const colors = [];
			for (let card of hs) {
				colors.add(get.color(card));
			}
			if (colors.length < 2) {
				return;
			}
			const result = await player
				.chooseControl(colors)
				.set("ai", () => {
					return _status.event.color;
				})
				.set(
					"color",
					(function () {
						return colors.sort((a, b) => {
							return player.countCards("h", { color: a }) - player.countCards("h", { color: b });
						})[0];
					})()
				)
				.forResult();
			const discards = player.getCards("h", { color: result.control });
			if (discards.length) {
				await player.discard(discards);
				if (game.hasPlayer(current => current != player && current.countCards("he"))) {
					const result2 = await player
						.chooseTarget(`获得至多${discards.length}名其他角色各一张牌`, [1, discards.length], true, function (card, player, target) {
							return target != player && target.countCards("he") > 0;
						})
						.set("ai", function (target) {
							const player = get.player();
							return get.effect(target, { name: "shunshou_copy2" }, player, player);
						})
						.forResult();
					await player.gainMultiple(result2.targets.sortBySeat(), "he");
					if (result2.targets.length > 1) {
						await player.loseHp();
					}
				}
			}
		},
	}
```

### stdfengbai 名字:封拜
描述: 主公技，当你获得一名群势力角色装备区内的牌后，你可以令其摸一张牌。
```js
stdfengbai: {
		trigger: {
			player: "gainAfter",
			global: "loseAsyncAfter",
		},
		zhuSkill: true,
		logTarget: (event, player, triggername, target) => target,
		check(event, player) {
			return get.effect(event.indexedData, { name: "draw" }, player, player) > 0;
		},
		getIndex(event, player) {
			if (!event.getg || !event.getl) {
				return false;
			}
			const cards = event.getg(player);
			return game
				.filterPlayer(current => {
					if (current == player || current.group != "qun") {
						return false;
					}
					const evt = event.getl(current);
					if (!evt || !evt.es) {
						return false;
					}
					game.log(evt.es);
					return evt.es.some(card => cards.includes(card));
				})
				.sortBySeat();
		},
		async content(event, trigger, player) {
			await event.targets[0].draw();
		},
	}
```

## std_cenhun 名字:标岑昏 势力:wu

### stdjishe 名字:极奢
描述: 出牌阶段，若你的手牌上限大于0，你可以令本回合手牌上限-1，然后摸一张牌。
```js
stdjishe: {
		audio: "jishe",
		enable: "phaseUse",
		filter(event, player) {
			return player.getHandcardLimit() > 0;
		},
		locked: false,
		delay: false,
		async content(event, trigger, player) {
			player.addTempSkill("stdjishe_limit");
			player.addMark("stdjishe_limit", 1, false);
			player.draw("nodelay");
		},
		subSkill: {
			limit: {
				mod: {
					maxHandcard(player, num) {
						return num - player.countMark("stdjishe_limit");
					},
				},
				onremove: true,
				charlotte: true,
				marktext: "奢",
				intro: {
					content: "手牌上限-#",
				},
			},
		},
		ai: {
			order: 10,
			result: {
				player(player) {
					if (!player.needsToDiscard(1)) {
						return 1;
					}
					return 0;
				},
			},
		},
	}
```

### stdwudu 名字:无度
描述: 一名没有手牌的角色受到伤害时，你可以减少1点体力上限，防止此伤害。
```js
stdwudu: {
		trigger: {
			global: "damageBegin4",
		},
		filter(event, player) {
			return !event.player.countCards("h");
		},
		logTarget: "player",
		check(event, player) {
			return player.maxHp > 1 && get.damageEffect(event.player, event.source, player) < 0;
		},
		async content(event, trigger, player) {
			trigger.cancel();
			await player.loseMaxHp();
		},
	}
```

## std_simashi 名字:标司马师 势力:wei

### stdjinglve 名字:景略
描述: 其他角色的弃牌阶段开始时，你可以展示并交给其两张牌，令其本阶段不能弃置这些牌，然后你可以于本阶段结束时获得本阶段弃置的一张牌。
```js
stdjinglve: {
		audio: "jinglve",
		trigger: { global: "phaseDiscardBegin" },
		filter(event, player) {
			return player.countCards("h") > 1 && event.player != player;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(get.prompt2(event.skill), 2)
				.set("ai", card => {
					if (!_status.event.bool) {
						return 0;
					}
					return 5 - get.value(card);
				})
				.set(
					"bool",
					(() => {
						if (get.attitude(player, trigger.player) >= 0) {
							return false;
						}
						const hs = trigger.player.countCards("h"),
							dis = trigger.player.needsToDiscard(0, true, true);
						return hs && dis > 0;
					})()
				)
				.forResult();
			event.result.targets = [trigger.player];
		},
		async content(event, trigger, player) {
			const cards = event.cards,
				target = event.targets[0];
			await player.showCards(cards, get.translation(player) + "发动了【景略】");
			const next = player.give(cards, target);
			next.gaintag.add("stdjinglve");
			await next;
			trigger.player.addTempSkill("stdjinglve_discard");
			player
				.when({ global: "phaseDiscardEnd" })
				.filter(evt => evt == trigger)
				.step(async (event, trigger, player) => {
					trigger.player.removeSkill("stdjinglve_discard");
					const cards = [];
					game.getGlobalHistory("cardMove", function (evt) {
						if (evt.name == "cardsDiscard") {
							if (evt.getParent("phaseDiscard") == trigger) {
								const moves = evt.cards.filterInD("d");
								cards.addArray(moves);
							}
						}
						if (evt.name == "lose") {
							if (evt.type != "discard" || evt.position != ui.discardPile || evt.getParent("phaseDiscard") != trigger) {
								return;
							}
							const moves = evt.cards.filterInD("d");
							cards.addArray(moves);
						}
					});
					if (cards.length) {
						const { bool, links } = await player.chooseButton(["景略：是否获得本阶段弃置的一张牌？", cards]).forResult();
						if (bool) {
							await player.gain(links, "gain2");
						}
					}
				});
		},
		subSkill: {
			discard: {
				charlotte: true,
				mod: {
					cardDiscardable(card, player, name) {
						if (name == "phaseDiscard" && card.hasGaintag("stdjinglve")) {
							return false;
						}
					},
				},
				onremove(player) {
					player.removeGaintag("stdjinglve");
				},
			},
		},
	}
```

## std_sunshao 名字:标孙邵 势力:wu

### stddingyi 名字:定仪
描述: 一名角色的结束阶段，若其装备区内没有牌，其可以摸一张牌。
```js
stddingyi: {
		audio: "mjdingyi",
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return !event.player.countCards("e");
		},
		async cost(event, trigger, player) {
			event.result = await trigger.player.chooseBool(get.prompt(event.skill), "摸一张牌").forResult();
			event.result.targets = [trigger.player];
		},
		async content(event, trigger, player) {
			await event.targets[0].draw();
		},
	}
```

### stdzuici 名字:罪辞
描述: 当你受到伤害后，你可以将场上的一张牌移至伤害来源区域内。
```js
stdzuici: {
		audio: "mjzuici",
		trigger: {
			player: "damageEnd",
		},
		filter(event, player) {
			if (!event.source) {
				return false;
			}
			return player.canMoveCard(
				null,
				null,
				game.filterPlayer(current => current != event.source),
				event.source
			);
		},
		direct: true,
		clearTime: true,
		async content(event, trigger, player) {
			const next = player.moveCard(
				game.filterPlayer(current => current != trigger.source),
				trigger.source
			);
			next.prompt = get.prompt("stdzuici", trigger.source);
			next.prompt2 = "将场上一张牌移动到其区域内";
			next.logSkill = event.name;
			await next;
		},
	}
```

## std_jiangwan 名字:标蒋琬 势力:shu

### stdruwu 名字:儒武
描述: 你可以将装备区内一张不为本回合置入的装备牌当【无中生有】或【决斗】使用。
```js
stdruwu: {
		audio: "olxvfa",
		enable: "chooseToUse",
		filter(event, player) {
			if (!event.stdruwu || !event.stdruwu.length) {
				return false;
			}
			if (event.filterCard(get.autoViewAs({ name: "juedou" }, "unsure"), player, event)) {
				return true;
			}
			if (event.filterCard(get.autoViewAs({ name: "wuzhong" }, "unsure"), player, event)) {
				return true;
			}
			return false;
		},
		onChooseToUse(event) {
			if (game.online || event.stdruwu) {
				return;
			}
			var list = event.player.getCards("e");
			var history = game.getGlobalHistory("everything", evt => evt.player == event.player && evt.name == "equip");
			list = list.filter(card => {
				return !history.some(evt => evt.cards && evt.cards.includes(card));
			});
			event.set("stdruwu", list);
		},
		chooseButton: {
			dialog(event, player) {
				var list = [];
				if (event.filterCard(get.autoViewAs({ name: "juedou" }, "unsure"), player, event)) {
					list.push(["锦囊", "", "juedou"]);
				}
				if (event.filterCard(get.autoViewAs({ name: "wuzhong" }, "unsure"), player, event)) {
					list.push(["锦囊", "", "wuzhong"]);
				}
				return ui.create.dialog("儒武", [list, "vcard"]);
			},
			check(button) {
				if (_status.event.getParent().type != "phase") {
					return 1;
				}
				var player = _status.event.player;
				return player.getUseValue({
					name: button.link[2],
					nature: button.link[3],
				});
			},
			backup(links, player) {
				return {
					filterCard(card) {
						return _status.event.stdruwu.includes(card);
					},
					position: "e",
					audio: "olxvfa",
					popname: true,
					check(card) {
						return 8 - get.value(card);
					},
					viewAs: { name: links[0][2] },
				};
			},
			prompt(links, player) {
				return "将装备区里的一张牌当做" + get.translation(links[0][2]) + "使用";
			},
		},
		hiddenCard(player, name) {
			var list = player.getCards("e");
			var history = game.getGlobalHistory("everything", evt => evt.player == player && evt.name == "equip");
			list = list.filter(card => {
				return !history.some(evt => evt.cards && evt.cards.includes(card));
			});
			if (!list.length) {
				return false;
			}
			return ["juedou", "wuzhong"].includes(name);
		},
		ai: {
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
	}
```

### stdchengshi 名字:承事
描述: 限定技，当一名其他角色死亡时，你可以与其交换座次和装备区内的牌。
```js
stdchengshi: {
		audio: "spjincui",
		trigger: {
			global: "die",
		},
		filter(event, player) {
			return event.player != player;
		},
		check(event, player) {
			return event.player.countCards("e") > player.countCards("e");
		},
		logTarget: "player",
		skillAnimation: true,
		limited: true,
		animationColor: "fire",
		seatRelated: "changeSeat",
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.awakenSkill(event.name);
			game.broadcastAll(
				function (target1, target2) {
					game.swapSeat(target1, target2);
				},
				player,
				target
			);
			await player.swapEquip(target);
		},
		mark: true,
		intro: {
			content: "limited",
		},
		init: (player, skill) => (player.storage[skill] = false),
	}
```

## std_maliang 名字:标马良 势力:shu

### stdxiemu 名字:协穆
描述: 其他角色的出牌阶段限一次，其可以展示并交给你一张基本牌，然后其本回合攻击范围+1。
```js
stdxiemu: {
		audio: "xiemu",
		global: "stdxiemu_global",
		subSkill: {
			global: {
				audio: "xiemu",
				enable: "phaseUse",
				usable: 1,
				filter(event, player) {
					if (!player.countCards("he", card => get.type(card) == "basic")) {
						return false;
					}
					return game.hasPlayer(current => current.hasSkill("stdxiemu") && current != player);
				},
				filterTarget(card, player, target) {
					return target.hasSkill("stdxiemu") && target != player;
				},
				selectTarget() {
					const num = game.countPlayer(current => current.hasSkill("stdxiemu") && current != get.player());
					return num > 1 ? 1 : -1;
				},
				filterCard(card) {
					return get.type(card) == "basic";
				},
				chessForceAll: true,
				position: "he",
				check(card) {
					return 4 - get.value(card);
				},
				prompt() {
					const list = game.filterPlayer(current => {
						return current.hasSkill("stdxiemu");
					});
					return `将一张牌交给${get.translation(list)}${list.length > 1 ? "中的一人" : ""}，然后你本回合攻击范围+1。`;
				},
				log: false,
				discard: false,
				lose: false,
				async content(event, trigger, player) {
					const card = event.cards[0],
						target = event.target;
					player.logSkill("stdxiemu", target);
					await player.showCards(card, get.translation(player) + "发动了【协穆】");
					await player.give(card, target, true);
					player.addTempSkill("stdxiemu_range");
					player.addMark("stdxiemu_range", 1, false);
				},
				ai: {
					order: 7,
					result: {
						target: 1,
					},
				},
			},
			range: {
				charlotte: true,
				onremove: true,
				mod: {
					attackRange(player, num) {
						return num + player.countMark("stdxiemu_range");
					},
				},
				intro: {
					content: "本回合攻击范围+#",
				},
			},
		},
	}
```

### stdnaman 名字:纳蛮
描述: 出牌阶段限一次，你可以将任意张基本牌当指定等量名目标的【南蛮入侵】使用。
```js
stdnaman: {
		audio: "naman",
		enable: "phaseUse",
		usable: 1,
		viewAs: {
			name: "nanman",
		},
		viewAsFilter(player) {
			if (!player.countCards("he", card => get.type(card) == "basic")) {
				return false;
			}
		},
		filterCard(card) {
			return get.type(card) == "basic";
		},
		position: "he",
		selectCard: [1, Infinity],
		selectTarget() {
			return ui.selected.cards.length;
		},
		complexSelect: true,
	}
```

## old_shen_zhaoyun 名字:牢神赵云 势力:shen

### oldjuejing 名字:绝境
描述: 锁定技。①摸牌阶段，你令额定摸牌数+X（X为你已损失的体力值）。②你的手牌上限+2。
```js
oldjuejing: {
		audio: "xinjuejing",
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed && player.getHp() < player.maxHp;
		},
		forced: true,
		async content(event, trigger, player) {
			trigger.num += player.getDamagedHp();
		},
		mod: {
			maxHandcard: (player, num) => num + 2,
			aiOrder(player, card, num) {
				if (num <= 0 || !player.isPhaseUsing() || !get.tag(card, "recover")) {
					return num;
				}
				if (player.needsToDiscard() > 1) {
					return num;
				}
				return 0;
			},
		},
	}
```

### oldlonghun 名字:龙魂
描述: 你可以将花色相同的Y张牌按下列规则使用或打出：♥当【桃】，♦当火【杀】，♣当【闪】，♠当【无懈可击】（Y为你的体力值且至少为1）。
```js
oldlonghun: {
		audio: "relonghun",
		inherit: "xinlonghun",
		prompt: () => `将${get.cnNumber(Math.max(1, get.player().getHp()))}张♦牌当做杀，♥牌当做桃，♣牌当做闪，♠牌当做无懈可击使用或打出`,
		selectCard: () => Math.max(1, get.player().getHp()),
		complexCard: true,
		log: false,
		async precontent(event, trigger, player) {
			player.logSkill("oldlonghun");
		},
		ai: {
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag) {
				var name;
				switch (tag) {
					case "respondSha":
						name = "diamond";
						break;
					case "respondShan":
						name = "club";
						break;
					case "save":
						name = "heart";
						break;
				}
				if (!player.countCards("hes", { suit: name })) {
					return false;
				}
			},
			order(item, player) {
				if (player && _status.event.type == "phase") {
					var max = 0;
					var list = ["sha", "tao"];
					var map = { sha: "diamond", tao: "heart" };
					for (var i = 0; i < list.length; i++) {
						var name = list[i];
						if (
							player.countCards("hes", function (card) {
								return (name != "sha" || get.value(card) < 5) && get.suit(card, player) == map[name];
							}) >= Math.max(1, player.getHp()) &&
							player.getUseValue({
								name: name,
								nature: name == "sha" ? "fire" : null,
							}) > 0
						) {
							var temp = get.order({
								name: name,
								nature: name == "sha" ? "fire" : null,
							});
							if (temp > max) {
								max = temp;
							}
						}
					}
					max /= 1.1;
					return max;
				}
				return 2;
			},
		},
		hiddenCard(player, name) {
			if (name == "wuxie" && _status.connectMode && player.countCards("hes") > 0) {
				return true;
			}
			if (name == "wuxie") {
				return player.countCards("hes", { suit: "spade" }) >= Math.max(1, get.player().getHp());
			}
			if (name == "tao") {
				return player.countCards("hes", { suit: "heart" }) >= Math.max(1, get.player().getHp());
			}
		},
	}
```

## std_xushu 名字:标徐庶 势力:shu

### stdwuyan 名字:无言
描述: 锁定技，你的锦囊牌均视为【无懈可击】。
```js
stdwuyan: {
		audio: "wuyan",
		trigger: {
			player: "useCard",
		},
		forced: true,
		filter(event, player) {
			if (!event.cards || event.cards.length != 1 || get.type2(event.cards[0]) != "trick") {
				return false;
			}
			return event.card.name == "wuxie";
		},
		async content(_) {},
		mod: {
			cardname(card, player) {
				let info = lib.card[card.name];
				if (info && ["trick", "delay"].includes(info.type)) {
					return "wuxie";
				}
			},
		},
	}
```

### stdjujian 名字:举荐
描述: 每回合限一次，你的【无懈可击】结算结束后可以交给一名其他角色。
```js
stdjujian: {
		audio: "jujian",
		trigger: { player: "useCardAfter" },
		usable: 1,
		filter(event, player) {
			return event.cards && event.cards.length && event.card.name == "wuxie";
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), lib.filter.notMe)
				.set("ai", target => {
					const player = get.player();
					return target.getUseValue(_status.event.getTrigger().cards[0]) * get.attitude(player, target);
				})
				.forResult();
			event.result.cards = trigger.cards;
		},
		async content(event, trigger, player) {
			await event.targets[0].gain(event.cards, "gain2");
		},
	}
```

## std_xuezong 名字:标薛综 势力:wu

### stdfunan 名字:复难
描述: 每回合限一次，其他角色使用的牌被你抵消时，你可以获得之。
```js
stdfunan: {
		audio: "funan",
		trigger: {
			target: "shaMiss",
			global: "eventNeutralized",
		},
		usable: 1,
		filter(event, player, name) {
			if (event.type != "card" || event.player == player) {
				return false;
			}
			if (name != "shaMiss" && event._neutralize_event.player != player) {
				return false;
			}
			return event.cards && event.cards.someInD();
		},
		async content(event, trigger, player) {
			await player.gain(trigger.cards.filterInD(), "gain2");
		},
	}
```

### stdjiexun 名字:诫训
描述: 结束阶段，你可以令一名角色弃置一张手牌，若此牌花色为♦️，其摸两张牌。
```js
stdjiexun: {
		audio: "jiexun",
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), function (card, player, target) {
					return target.countCards("h");
				})
				.set("ai", function (target) {
					const player = _status.event.player;
					let eff = get.effect(target, { name: "guohe_copy2" }, player, player);
					if (target == player) {
						return player.countCards("h", { suit: "diamod" }) ? 2 : -2;
					}
					return eff * (target.countCards("h") > 4 ? -1 : 1);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await target
				.chooseToDiscard("h", 1, true)
				.set("ai", card => {
					if (get.suit(card) == "diamond") {
						return 11 - get.value(card);
					}
					return 5 - get.value(card);
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			if (get.suit(result.cards[0]) == "diamond") {
				await target.draw(2);
			}
		},
	}
```

## std_liuzhang 名字:标刘璋 势力:qun

### stdyinge 名字:引戈
描述: 出牌阶段限一次，你可以令一名其他角色交给你一张牌，然后其视为对你或你攻击范围内的另一名角色使用一张【杀】。
```js
stdyinge: {
		audio: "yinlang",
		usable: 1,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return player != target && target.countCards("he");
		},
		async content(event, trigger, player) {
			const target = event.target;
			await target.chooseToGive(1, "he", player, true);
			let targets = game.filterPlayer(current => {
				if (!target.canUse({ name: "sha", isCard: true }, current, false)) {
					return false;
				}
				if (current == player) {
					return true;
				}
				return player.inRange(current);
			});
			if (!targets.length) {
				return;
			}
			const result = await target
				.chooseTarget("选择使用杀的目标", true)
				.set("useTargets", targets)
				.set("filterTarget", (card, player, target) => {
					let targets = get.event().useTargets;
					return targets.includes(target);
				})
				.set("ai", target => {
					return get.effect(target, { name: "sha", isCard: true }, get.player(), get.player());
				})
				.forResult();
			if (result.bool) {
				await target.useCard({ name: "sha", isCard: true }, result.targets);
			}
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					return target.countCards("he") > 2 ? 1 : 0;
				},
			},
		},
	}
```

### stdshiren 名字:施仁
描述: 每回合限一次，当你成为其他角色使用【杀】的目标后，你可以摸两张牌，然后交给该角色一张牌。
```js
stdshiren: {
		audio: "xiusheng",
		trigger: {
			target: "useCardToTargeted",
		},
		filter(event, player) {
			return event.card.name == "sha" && event.player != player;
		},
		usable: 1,
		logTarget: "player",
		async content(event, trigger, player) {
			await player.draw(2);
			await player.chooseToGive(event.targets[0], "he", true);
		},
	}
```

### stdjuyi 名字:据益
描述: 主公技，其他群势力角色每回合首次对你造成伤害时，其可以防止此伤害，改为获得你的一张牌。
```js
stdjuyi: {
		zhuSkill: true,
		trigger: {
			player: "damageBegin4",
		},
		filter(event, player) {
			if (!event.source || event.source == player || !player.countCards("he")) {
				return false;
			}
			if (player.hasHistory("damage", evt => evt.source && evt.source == event.source)) {
				return false;
			}
			return event.source.group == "qun" && !player.getStorage("stdjuyi").includes(event.source);
		},
		async cost(event, trigger, player) {
			const result = await trigger.source
				.choosePlayerCard(
					player,
					"he",
					get.prompt(event.skill, player),
					"据益：是否获得" + get.translation(player) + "一张牌并防止此次伤害？"
				)
				.set("ai", button => {
					if (get.event().eff > 0) {
						return 0;
					}
					return get.value(button.link);
				})
				.set("eff", get.damageEffect(player, trigger.source, trigger.source))
				.forResult();
			event.result = {
				bool: result.bool,
				cards: result.links,
				targets: [trigger.source],
			};
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.give(event.cards, target);
			trigger.cancel();
			if (!player.getStorage("stdjuyi").length) {
				player.when({ global: "phaseEnd" }).step(async () => {
					delete player.storage.stdjuyi;
				});
			}
			player.markAuto("stdjuyi", target);
		},
	}
```

## std_wangyuanji 名字:标王元姬 势力:wei

### stdqianchong 名字:谦冲
描述: 锁定技，若你的装备区内牌的数量为奇数/偶数，你使用牌无次数/距离限制。
```js
stdqianchong: {
		mod: {
			cardUsable(card, player) {
				if (player.countCards("e") % 2 != 0) {
					return Infinity;
				}
			},
			targetInRange(card, player) {
				if (player.countCards("e") % 2 == 0) {
					return true;
				}
			},
		},
	}
```

### stdshangjian 名字:尚俭
描述: 结束阶段，若你本回合失去的牌数不大于你的体力值，你可以从弃牌堆中获得一张你本回合失去的牌。
```js
stdshangjian: {
		trigger: {
			player: "phaseJieshuBegin",
		},
		audio: "xinfu_shangjian",
		filter(event, player) {
			let num = 0,
				cards = [];
			player.getHistory("lose", evt => {
				if (evt.cards2) {
					num += evt.cards2.length;
				}
				if (evt.cards2.some(i => get.position(i) == "d")) {
					cards.addArray(evt.cards2.filter(i => get.position(i) == "d"));
				}
			});
			return cards.length && num > 0 && num <= player.hp;
		},
		async cost(event, trigger, player) {
			let cards = [];
			player.getHistory("lose", evt => {
				if (evt.cards2 && evt.cards2.some(i => get.position(i) == "d")) {
					cards.addArray(evt.cards2.filter(i => get.position(i) == "d"));
				}
			});
			const result = await player
				.chooseButton(["尚俭：选择获得其中一张牌", cards])
				.set("ai", button => {
					return get.value(button.link, get.event().player);
				})
				.forResult();
			event.result = {
				bool: result.bool,
				cost_data: result.links,
			};
		},
		async content(event, trigger, player) {
			await player.gain(event.cost_data, "gain2");
		},
	}
```

## std_wanglang 名字:标王朗 势力:wei

### stdgushe 名字:鼓舌
描述: 出牌阶段限一次，你可以与一名角色拼点，拼点赢的角色摸一张牌，然后拼点输的角色可以与对方重复此流程。
```js
stdgushe: {
		audio: "gushe",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			let num = 1,
				target = event.target;
			while (num > 0 && player.canCompare(target)) {
				num--;
				let winner = [],
					failure = [];
				let result = await player.chooseToCompare(target).forResult();
				if (result.bool) {
					failure.push(target);
					target.chat(lib.skill.gushe.chat.randomGet());
					await player.draw();
				} else if (result.tie) {
					failure = [player, target];
				} else {
					failure.push(player);
					target.chat(lib.skill.gushe.chat.randomGet());
					await target.draw();
				}
				if (player.canCompare(target)) {
					for (let loser of failure) {
						let choice = loser.countCards("h", card => get.value(card) <= 6 && card.number > 10) > 0;
						const { bool } = await loser.chooseBool("是否与其再次拼点？").set("choice", choice).forResult();
						if (bool) {
							num++;
						}
					}
				}
			}
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					let hs = player.getCards("h");
					if (
						hs.some(card => get.value(card) <= 6 && card.number > 10) ||
						(player.getHp() < 2 && player.getHp() + player.countCards("h", { name: ["tao", "jiu"] }) > 2) ||
						(player.getHp() > 1 && player.getHp() + player.countCards("h", { name: "tao" }) > 2)
					) {
						return -1;
					}
					return 0;
				},
			},
		},
	}
```

### stdjici 名字:激词
描述: 当你亮出拼点牌时，你可以失去1点体力，令此牌点数视为k。
```js
stdjici: {
		audio: "jici",
		trigger: {
			player: "compare",
			target: "compare",
		},
		filter(event, player) {
			if (event.player == player && event.iwhile) {
				return false;
			}
			return true;
		},
		check(event, player) {
			return (
				(player.getHp() < 2 && player.getHp() + player.countCards("h", { name: ["tao", "jiu"] }) > 2) ||
				(player.getHp() > 1 && player.getHp() + player.countCards("h", { name: "tao" }) > 2)
			);
		},
		async content(event, trigger, player) {
			await player.loseHp();
			if (player == trigger.player) {
				trigger.num1 = 13;
			} else {
				trigger.num2 = 13;
			}
			game.log(player, "的拼点牌点数为13");
		},
	}
```

## std_zhonghui 名字:标钟会 势力:wei

### stdxingfa 名字:兴伐
描述: 准备阶段，若你的手牌数不小于体力值，你可以对一名其他角色造成1点伤害。
```js
stdxingfa: {
		audio: "gzpaiyi",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return (
				player.getHp() <= player.countCards("h") &&
				game.hasPlayer(function (current) {
					return current != player;
				})
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "对一名其他角色造成1点伤害", function (card, player, target) {
					return target != player;
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					return get.damageEffect(target, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await event.targets[0].damage("nocard");
		},
		ai: {
			expose: 0.25,
			threaten: 1.7,
		},
	}
```

## std_huaxin 名字:标华歆 势力:wei

### stdyuanqing 名字:渊清
描述: 回合结束时，你可以令所有角色依次选择并获得弃牌堆中其于此回合内失去的一张牌。
```js
stdyuanqing: {
		audio: "yuanqing",
		trigger: {
			player: "phaseEnd",
		},
		getCards(player) {
			let cards = [];
			player.getHistory("lose", evt => {
				if (evt.cards2 && evt.cards2.some(i => get.position(i) == "d")) {
					cards.addArray(evt.cards2.filter(i => get.position(i) == "d"));
				}
			});
			return cards;
		},
		filter(event, player) {
			let targets = lib.skill.stdyuanqing.logTarget(event, player);
			return targets && targets.length;
		},
		logTarget(event, player) {
			return game.filterPlayer(current => {
				let cards = lib.skill.stdyuanqing.getCards(current);
				return cards && cards.length;
			});
		},
		async content(event, trigger, player) {
			for (const target of event.targets) {
				let cards = lib.skill.stdyuanqing.getCards(target);
				if (!cards.length) {
					continue;
				}
				const result = await target.chooseButton(["获得其中一张牌", cards], true).forResult();
				if (result.bool) {
					await target.gain(result.links, "gain2");
				}
			}
		},
	}
```

### stdshuchen 名字:疏陈
描述: 你的回合外，你可以将超出手牌上限的手牌当【桃】使用。
```js
stdshuchen: {
		audio: "shuchen",
		enable: "chooseToUse",
		viewAsFilter(player) {
			return player != _status.currentPhase && player.countCards("h") > player.getHandcardLimit();
		},
		filterCard: true,
		position: "h",
		selectCard() {
			const player = get.player();
			return player.countCards("h") - player.getHandcardLimit();
		},
		viewAs: {
			name: "tao",
		},
		prompt: "将超出手牌上限的手牌当桃使用",
		check(card) {
			return 15 - get.value(card);
		},
	}
```

## std_zhangbao 名字:标张苞 势力:shu

### stdjuezhu 名字:角逐
描述: 锁定技，当你造成/受到伤害后，你本回合使用牌无次数限制/视为对伤害来源使用一张【决斗】。
```js
stdjuezhu: {
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
				player.addTempSkill("stdjuezhu_paoxiao");
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
	}
```

### stdchengji 名字:承继
描述: 你可以将两张颜色不同的牌当【杀】使用或打出。
```js
stdchengji: {
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
	}
```

## std_liuchen 名字:标刘谌 势力:shu

### stdzhanjue 名字:战绝
描述: 出牌阶段限一次，你可以将所有手牌当作【决斗】使用，然后摸一张牌。
```js
stdzhanjue: {
		audio: "zhanjue",
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		selectCard: -1,
		position: "h",
		filter(event, player) {
			let hs = player.getCards("h");
			if (!hs.length) {
				return false;
			}
			for (let i = 0; i < hs.length; i++) {
				let mod2 = game.checkMod(hs[i], player, "unchanged", "cardEnabled2", player);
				if (mod2 === false) {
					return false;
				}
			}
			return event.filterCard(get.autoViewAs({ name: "juedou" }, hs));
		},
		viewAs: { name: "juedou" },
		ai: {
			order(item, player) {
				if (player.countCards("h") > 1) {
					return 0.8;
				}
				return 8;
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
					let hs = player.getCards("h"),
						val = hs.reduce((acc, i) => acc - get.value(i, player), 0) / 6 + 1;
					if (td > 0) {
						return val;
					}
					if (
						player.hasSkillTag("directHit_ai", true, {
							target: target,
							card: get.autoViewAs({ name: "juedou" }, hs),
						})
					) {
						return val;
					}
					let pd = get.damageEffect(player, target, player),
						att = get.attitude(player, target);
					if (att > 0 && get.damageEffect(target, player, player) > pd) {
						return val;
					}
					let ts = target.mayHaveSha(player, "respond", null, "count");
					if (ts < 1 && ts * 8 < Math.pow(player.hp, 2)) {
						return val;
					}
					let damage = pd / get.attitude(player, player),
						ps = player.mayHaveSha(player, "respond", hs, "count");
					if (att > 0) {
						if (ts < 1) {
							return val;
						}
						return val + damage + 1;
					}
					if (pd >= 0) {
						return val + damage + 1;
					}
					if (ts - ps + Math.exp(0.8 - player.hp) < 1) {
						return val - ts;
					}
					return val + damage + 1 - ts;
				},
				target(player, target) {
					let td = get.damageEffect(target, player, target) / get.attitude(target, target);
					if (!td) {
						return 0;
					}
					let hs = player.getCards("h");
					if (
						td > 0 ||
						player.hasSkillTag("directHit_ai", true, {
							target: target,
							card: get.autoViewAs({ name: "juedou" }, hs),
						})
					) {
						return td + 1;
					}
					let pd = get.damageEffect(player, target, player),
						att = get.attitude(player, target);
					if (att > 0) {
						return td + 1;
					}
					let ts = target.mayHaveSha(player, "respond", null, "count"),
						ps = player.mayHaveSha(player, "respond", hs, "count");
					if (ts < 1) {
						return td + 1;
					}
					if (pd >= 0) {
						return 0;
					}
					if (ts - ps < 1) {
						return td + 1 - ts;
					}
					return -ts;
				},
			},
			nokeep: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "nokeep") {
					return (
						(!arg || (arg.card && get.name(arg.card) === "tao")) &&
						player.isPhaseUsing() &&
						!player.countSkill("stdzhanjue") &&
						player.hasCard(card => {
							return get.name(card) !== "tao";
						}, "h")
					);
				}
			},
		},
		group: "stdzhanjue_draw",
		subSkill: {
			draw: {
				trigger: {
					player: "useCardAfter",
				},
				forced: true,
				charlotte: true,
				popup: false,
				filter(event, player) {
					return event.skill == "stdzhanjue";
				},
				async content(event, trigger, player) {
					await player.draw();
				},
			},
		},
	}
```

### stdqinwang 名字:勤王
描述: 主公技，你需要打出【杀】时，其他蜀势力角色可以弃置一张基本牌，视为你打出之。
```js
stdqinwang: {
		audio: "qinwang1",
		zhuSkill: true,
		group: "stdqinwang_effect",
		filter(event, player) {
			if (!player.hasZhuSkill("stdqinwang") || event.stdqinwang) {
				return false;
			}
			return game.hasPlayer(current => current != player && current.group == "shu");
		},
		enable: "chooseToRespond",
		viewAs: { name: "sha" },
		filterCard() {
			return false;
		},
		selectCard: -1,
		ai: {
			order() {
				return get.order({ name: "sha" }) + 0.3;
			},
			respondSha: true,
			skillTagFilter(player) {
				if (!player.hasZhuSkill("stdqinwang") || !game.hasPlayer(current => current != player && current.group == "shu")) {
					return false;
				}
			},
		},
		subSkill: {
			effect: {
				audio: "stdqinwang",
				trigger: {
					player: "respondBegin",
				},
				filter(event, player) {
					return event.skill == "stdqinwang";
				},
				forced: true,
				async content(event, trigger, player) {
					delete trigger.skill;
					trigger.getParent().set("stdqinwang", true);
					while (true) {
						if (event.current == undefined) {
							event.current = player.next;
						}
						if (event.current == player) {
							trigger.cancel();
							trigger.getParent().goto(0);
							return;
						} else if (event.current.group == "shu") {
							const discardEvent = event.current.chooseToDiscard("是否弃置一张牌，视为" + get.translation(player) + "打出一张杀？");
							discardEvent.set("filterCard", card => get.type(card) == "basic");
							discardEvent.set("ai", card => {
								const event = _status.event;
								if (get.attitude(event.player, event.source) >= 2) {
									return 6 - get.value(card);
								}
								return 0;
							});
							discardEvent.set("source", player);
							discardEvent.set("skillwarn", "弃置一张牌，视为" + get.translation(player) + "打出一张杀");
							const { bool } = await discardEvent.forResult();
							if (bool) {
								if (typeof event.current.ai.shown == "number" && event.current.ai.shown < 0.95) {
									event.current.ai.shown += 0.3;
									if (event.current.ai.shown > 0.95) {
										event.current.ai.shown = 0.95;
									}
								}
								return;
							} else {
								event.current = event.current.next;
							}
						} else {
							event.current = event.current.next;
						}
					}
				},
			},
		},
	}
```

## std_guansuo 名字:标关索 势力:shu

### stdzhengnan 名字:征南
描述: 准备阶段，你可以将一张红色手牌当【杀】使用；若你因此杀死了角色，摸两张牌。
```js
stdzhengnan: {
		audio: "zhengnan",
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			return player.countCards("hs", { color: "red" });
		},
		direct: true,
		clearTime: true,
		async content(event, trigger, player) {
			const next = player.chooseToUse();
			next.set("openskilldialog", get.prompt2("stdzhengnan"));
			next.set("norestore", true);
			next.set("_backupevent", "stdzhengnan_backup");
			next.set("custom", {
				add: {},
				replace: { window() {} },
			});
			next.backup("stdzhengnan_backup");
			await next;
			if (
				game.getGlobalHistory("everything", evt => {
					if (evt.name != "die" || evt?.source != player) {
						return false;
					}
					return evt.reason?.getParent(event.name) == event;
				}).length > 0
			) {
				await player.draw(2);
			}
		},
		subSkill: {
			backup: {
				audio: "stdzhengnan",
				filterCard(card) {
					return get.itemtype(card) == "card" && get.color(card) == "red";
				},
				position: "hs",
				viewAs: {
					name: "sha",
				},
				prompt: "将一张红色手牌当杀使用",
				check(card) {
					return 7 - get.value(card);
				},
			},
		},
	}
```

## std_xiahouba 名字:标夏侯霸 势力:shu

### stdbaobian 名字:豹变
描述: 出牌阶段开始时，你可以失去1点体力并令一名角色弃置一张手牌；若此牌为基本牌，你视为对其使用一张【杀】。
```js
stdbaobian: {
		audio: "rebaobian",
		trigger: { player: "phaseUseBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return target.countCards("h");
				})
				.set("ai", target => {
					const player = get.player();
					if (player.hp < 2) {
						return 0;
					}
					return get.effect(target, { name: "guohe_copy2" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await player.loseHp();
			const target = event.targets[0],
				card = { name: "sha", isCard: true };
			const { cards } = await target.chooseToDiscard("h", true).forResult();
			if (get.type(cards[0]) == "basic" && player.canUse(card, target, false)) {
				await player.useCard(card, target, false);
			}
		},
	}
```

## std_caorui 名字:标曹叡 势力:wei

### stdhuituo 名字:恢拓
描述: 当你受到伤害后，你可以展示牌堆顶的两张牌，然后替换任意张牌。
```js
stdhuituo: {
		audio: "huituo",
		trigger: {
			player: "damageEnd",
		},
		async content(event, trigger, player) {
			const cards = game.cardsGotoOrdering(get.cards(2)).cards;
			await player.showCards(cards, get.translation(player) + "发动了【恢拓】");
			const next = player.chooseToMove("恢拓：是否交换任意张牌？");
			next.set("list", [
				["展示牌", cards, "sbhuanshi_tag"],
				["你的手牌", player.getCards("h")],
			]);
			next.set("filterMove", (from, to) => {
				return typeof to !== "number";
			});
			next.set("processAI", list => {
				let cards = [...list[0][1], ...list[1][1]],
					player = get.player();
				cards.sort((a, b) => player.getUseValue(a, null, true) - player.getUseValue(b, null, true));
				return [cards.slice(0, 2), cards.slice(2)];
			});
			const { bool, moved } = await next.forResult();
			if (bool) {
				const puts = player.getCards("h", i => moved[0].includes(i)),
					gains = cards.filter(i => moved[1].includes(i));
				if (puts.length && gains.length) {
					player.$throw(puts, 1000);
					await player.lose(puts, ui.special);
					await player.gain(gains, "gain2");
				}
				const cardx = moved[0].slice();
				if (cardx.length) {
					await game.cardsGotoOrdering(cardx);
					await game.cardsGotoPile(cardx.slice().reverse(), "insert");
					game.updateRoundNumber();
				}
			}
		},
	}
```

### stdmingjian 名字:明鉴
描述: 出牌阶段限一次，你可以将一张牌展示并交给一名其他角色，然后其可以使用此牌。
```js
stdmingjian: {
		audio: "mingjian",
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		filterTarget: lib.filter.notMe,
		check(card) {
			return 7 - get.value(card);
		},
		lose: false,
		discard: false,
		delay: false,
		async content(event, trigger, player) {
			const cards = event.cards,
				target = event.target;
			await player.showCards(cards, get.translation(player) + "发动了【明鉴】");
			await player.give(cards, target, true);
			await target
				.chooseToUse(
					function (card, player, event) {
						if (!get.event().cardx?.includes(card)) {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					},
					"明鉴：是否使用" + get.translation(cards) + "？"
				)
				.set("cardx", cards);
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					return target.getUseValue(ui.selected.cards[0]) + 1;
				},
			},
		},
	}
```

### xingshuai
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## std_liuye 名字:标刘晔 势力:wei

### stdpolu 名字:破橹
描述: 你造成或受到伤害后，可以弃置受伤角色装备区里的一张牌；若该角色为你，你摸一张牌。
```js
stdpolu: {
		audio: "polu",
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		filter(event, player) {
			return event.player.countDiscardableCards(player, "e");
		},
		async cost(event, trigger, player) {
			const { bool, links: cards } = await player
				.choosePlayerCard("e", trigger.player, get.prompt2(event.skill, trigger.player))
				.set("ai", button => {
					const target = get.event().getTrigger().player,
						player = get.player();
					if (get.attitude(player, target) <= 0) {
						return get.value(button.link) + 2;
					}
					if (player == target) {
						return 5 - get.value(button.link);
					}
					return 0;
				})
				.forResult();
			event.result = {
				bool: bool,
				cards: cards,
				targets: [trigger.player],
			};
		},
		async content(event, trigger, player) {
			const { targets, cards } = event;
			await targets[0].modedDiscard(cards, player);
			if (player == targets[0]) {
				await player.draw();
			}
		},
	}
```

### stdchoulve 名字:筹略
描述: 出牌阶段限一次，你可以交给其他角色一张手牌，然后其可以展示并交给你一张装备牌。
```js
stdchoulve: {
		audio: "choulve",
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		filterTarget: lib.filter.notMe,
		check(card) {
			return 7 - get.value(card);
		},
		lose: false,
		discard: false,
		delay: false,
		async content(event, trigger, player) {
			const cards = event.cards,
				target = event.target;
			await player.give(cards, target);
			const { bool, cards: cardx } = await target
				.chooseCard(`是否展示并交给${get.translation(player)}一张装备牌？`, "he")
				.set("filterCard", card => get.type(card) == "equip")
				.set("ai", card => {
					if (get.event().att <= 0) {
						return 0;
					}
					return 5 - get.value(card);
				})
				.set("att", get.attitude(target, player))
				.forResult();
			if (bool) {
				await target.showCards(cardx);
				await target.give(cardx, player);
			}
		},
		ai: {
			order: 7,
			result: {
				target: 1,
			},
		},
	}
```

## std_guohuanghou 名字:标郭皇后 势力:wei

### stdjiaozhao 名字:矫诏
描述: 出牌阶段限一次，你可以令一名手牌数不小于两张的其他角色展示两张手牌，然后你可以用一张牌交换其中一张。
```js
stdjiaozhao: {
		audio: "rejiaozhao",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 1;
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (!target.countCards("h")) {
				return;
			}
			const result = await target.chooseCard("展示两张手牌", "h", 2, true).forResult();
			if (!result?.cards?.length) {
				return;
			}
			const { cards } = result;
			await target.showCards(cards);
			if (event.getParent(2).name == "stddanxin") {
				const result = await player
					.chooseButton(["是否选择其中一张牌获得？", cards])
					.set("ai", button => {
						if (button.link.name == "du") {
							return 0;
						}
						return get.value(button.link) + 1;
					})
					.forResult();
				if (result?.bool && result?.links?.length) {
					await player.gain(result.links, target, "giveAuto");
				}
			} else {
				if (!player.countCards("h")) {
					return;
				}
				const cardx = player.getCards("h").sort((a, b) => player.getUseValue(a) - player.getUseValue(b))[0];
				const result = await player
					.chooseButton(2, ["你的手牌", player.getCards("h"), `${get.translation(target)}展示的手牌`, cards])
					.set("filterButton", button => {
						const { player, cards } = get.event();
						if (!ui.selected.buttons.length) {
							return true;
						}
						let card = ui.selected.buttons[0].link;
						if (cards.includes(card)) {
							return !cards.includes(button.link);
						}
						return cards.includes(button.link);
					})
					.set("cards", cards)
					.set("cardx", cardx)
					.set("ai", button => {
						const { player, cards, cardx } = get.event();
						if (ui.selected.buttons.length) {
							return button.link == cardx;
						}
						if (!cards.includes(button.link)) {
							return 0;
						}
						if (player.getUseValue(button.link) > player.getUseValue(cardx)) {
							return 0;
						}
						return player.getUseValue(button.link) + 1;
					})
					.forResult();
				if (result?.bool && result?.links?.length) {
					const cards1 = result.links.filter(card => !cards.includes(card)),
						cards2 = result.links.filter(card => cards.includes(card));
					await player.swapHandcards(target, cards1, cards2);
				}
			}
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					return get.attitude(player, target);
				},
			},
		},
	}
```

### stddanxin 名字:殚心
描述: 当你受到伤害后，你可以发动一次〖矫诏〗且改为你获得其展示牌中的一张。
```js
stddanxin: {
		audio: "redanxin",
		trigger: { player: "damageEnd" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill))
				.set("filterTarget", (card, player, target) => {
					return target != player && target.countCards("h") > 1;
				})
				.set("ai", target => {
					return get.effect(target, { name: "shunshou_copy2" }, get.player(), get.player());
				})
				.forResult();
		},
		derivation: "stdjiaozhao",
		async content(event, trigger, player) {
			await player.useSkill("stdjiaozhao", event.targets);
		},
	}
```

## std_lvfan 名字:标吕范 势力:wu

### mbdiaodu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### stddianfeng 名字:典封
描述: 当一名角色失去装备区内的所有牌时，你可以摸一张牌。
```js
stddianfeng: {
		audio: "spdiancai",
		trigger: {
			player: ["loseAfter"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		getIndex(event, player) {
			return game
				.filterPlayer(current => {
					let evt = event.getl(current);
					return evt?.es?.length > 0 && !current.countCards("e");
				})
				.sortBySeat();
		},
		logTarget(_1, _2, _3, target) {
			return target;
		},
		frequent: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	}
```

## std_dingfeng 名字:标丁奉 势力:wu

### stdduanbing 名字:短兵
描述: 锁定技，你的攻击范围始终为1。你使用【杀】每回合首次造成的伤害+1。
```js
stdduanbing: {
		audio: "duanbing",
		forced: true,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			if (player.hasHistory("sourceDamage", evt => evt?.card?.name == "sha")) {
				return false;
			}
			return event?.card?.name == "sha";
		},
		logTarget: "player",
		async content(event, trigger, player) {
			trigger.num++;
		},
		group: "stdduanbing_forced",
		subSkill: {
			forced: {
				priority: Infinity,
				mod: {
					attackRange: () => 1,
				},
			},
		},
	}
```

### stdfenxun 名字:奋迅
描述: 出牌阶段限一次，你可以弃置一张防具牌并选择一名其他角色，其本回合视为在你的攻击范围内。
```js
stdfenxun: {
		audio: "fenxun",
		enable: "phaseUse",
		usable: 1,
		filterCard(card, player) {
			return get.subtype(card) == "equip2";
		},
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			player.markAuto("stdfenxun_effect", [event.target]);
			player.addTempSkill("stdfenxun_effect");
		},
		check(card) {
			return 6 - get.value(card);
		},
		ai: {
			order: 4,
			result: {
				player(player, target) {
					if (player.inRange(target)) {
						return 0;
					}
					var hs = player.getCards("h", "shunshou");
					if (hs.length && player.canUse(hs[0], target, false)) {
						return 1;
					}
					var geteff = function (current) {
						return player.canUse("sha", current, false, true) && get.effect(current, { name: "sha" }, player, player) > 0;
					};
					if (player.hasSha() && geteff(target)) {
						var num = game.countPlayer(function (current) {
							return current != player && player.inRange(target) && geteff(current);
						});
						if (num == 0) {
							if (
								game.hasPlayer(function (current) {
									return player.canUse("sha", current) && geteff(current) && current != target;
								})
							) {
								return 1;
							}
						} else if (num == 1) {
							return 1;
						}
					}
					return 0;
				},
			},
		},
		subSkill: {
			effect: {
				mark: "character",
				onremove: true,
				intro: {
					content: "$视为在你攻击范围内",
				},
				mod: {
					inRange(from, to) {
						if (from.getStorage("stdfenxun_effect").includes(to)) {
							return true;
						}
					},
				},
			},
		},
	}
```

## std_sunluban 名字:标孙鲁班 势力:wu

### stdzenhui 名字:谮毁
描述: 当你使用【杀】或锦囊牌时，你可以令一名非目标角色成为此牌使用者。
```js
stdzenhui: {
		audio: "rechanhui",
		trigger: { player: "useCard2" },
		filter(event, player) {
			if (!event.targets?.length) {
				return false;
			}
			const card = event.card;
			if (card.name != "sha" && get.type2(card) != "trick") {
				return false;
			}
			return game.hasPlayer(current => {
				return current != player && !event.targets.includes(current);
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					if (player == target) {
						return false;
					}
					const evt = _status.event.getTrigger();
					return !evt.targets.includes(target);
				})
				.set("ai", target => {
					const trigger = _status.event.getTrigger(),
						player = _status.event.player;
					let eff = 0;
					for (let current of trigger.targets) {
						eff += get.effect(current, trigger.card, target, player);
					}
					return eff > get.event().original;
				})
				.set(
					"original",
					(function () {
						let eff = 0;
						for (let cur of trigger.targets) {
							eff += get.effect(cur, trigger.card, player, player);
						}
						return eff;
					})()
				)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			trigger.player = target;
			game.log(target, "成为了", trigger.card, "的使用者");
		},
	}
```

### stdchuyi 名字:除异
描述: 每轮限一次，当一名其他角色对你攻击范围内的一名角色造成伤害时，你可令此伤害+1。
```js
stdchuyi: {
		audio: "xinzenhui",
		trigger: {
			global: "damageBegin1",
		},
		round: 1,
		filter(event, player) {
			if (!event.source || !event.source.isIn() || event.source == player) {
				return false;
			}
			return player.inRange(event.player);
		},
		check(event, player) {
			return get.attitude(player, event.player) <= 0 && get.damageEffect(event.player, event.source, player, event.nature) > 0;
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	}
```

## std_liuzan 名字:标留赞 势力:wu

### stdfenyin 名字:奋音
描述: 摸牌阶段，你可以额外摸两张牌；若如此做，本回合你使用牌时，若此牌颜色与你使用的上一张牌颜色相同，你须弃置一张牌。
```js
stdfenyin: {
		audio: "fenyin",
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.num += 2;
			player.addTempSkill("stdfenyin_discard");
		},
		subSkill: {
			discard: {
				mod: {
					aiOrder(player, card, num) {
						if (typeof card == "object" && player == _status.currentPhase) {
							var evt = player.getLastUsed();
							if (
								evt &&
								evt.card &&
								get.color(evt.card) != "none" &&
								get.color(card) != "none" &&
								get.color(evt.card) != get.color(card)
							) {
								return num + 10;
							}
						}
					},
				},
				audio: "stdfenyin",
				trigger: { player: "useCard" },
				charlotte: true,
				forced: true,
				filter(event, player) {
					if (!player.countCards("he")) {
						return false;
					}
					if (_status.currentPhase != player) {
						return false;
					}
					var color2 = get.color(event.card);
					var evt = player.getLastUsed(1);
					if (!evt) {
						return false;
					}
					var color1 = get.color(evt.card);
					return color1 && color2 && color1 != "none" && color2 != "none" && color1 == color2;
				},
				async content(event, trigger, player) {
					await player.chooseToDiscard("he", true);
				},
			},
		},
	}
```

## std_sunyi 名字:标孙翊 势力:wu

### stdzaoli 名字:躁厉
描述: 锁定技，准备阶段，你弃置手牌或装备区里的所有牌，然后摸X牌并失去1点体力（X为你以此法弃置牌数与你的已损失体力值之和）。
```js
stdzaoli: {
		audio: "zaoli",
		locked: true,
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			return player.countCards("he");
		},
		async cost(event, trigger, player) {
			let list = [];
			if (player.countCards("h")) {
				list.push("手牌");
			}
			if (player.countCards("e")) {
				list.push("装备区");
			}
			let choice = list[0];
			if (list.length > 1) {
				const { control } = await player
					.chooseControl(list)
					.set("prompt", "躁厉：选择弃置的区域")
					.set("ai", () => ["手牌", "装备区"].randomGet())
					.forResult();
				if (control) {
					choice = control;
				}
			}
			event.result = {
				bool: true,
				cost_data: choice == "手牌" ? "h" : "e",
			};
		},
		async content(event, trigger, player) {
			const pos = event.cost_data;
			let num = player.countCards(pos);
			await player.chooseToDiscard(pos, num, true);
			num += player.getDamagedHp();
			await player.draw(num);
			await player.loseHp();
		},
	}
```

## std_taoqian 名字:标陶谦 势力:qun

### stdyirang 名字:揖让
描述: 出牌阶段开始时，你可以展示所有手牌并将这些牌交给一名手牌数最少的其他角色，然后你摸等同于交出类别数量的牌。
```js
stdyirang: {
		audio: "yirang",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("h");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					if (target == player) {
						return false;
					}
					return !game.hasPlayer(current => {
						return current != player && current.countCards("h") < target.countCards("h");
					});
				})
				.set("ai", function (target) {
					return get.attitude(_status.event.player, target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = player.getCards("h"),
				target = event.targets[0];
			let types = [];
			for (let i = 0; i < cards.length; i++) {
				types.add(get.type(cards[i], "trick"));
			}
			await player.give(cards, target);
			await player.draw(types.length);
		},
	}
```

## std_jiling 名字:标纪灵 势力:qun

### stdshuangdao 名字:双刃
描述: 出牌阶段开始时，你可以与一名其他角色拼点。若你赢，你可以视为对计算与其距离为1的至多两名角色各使用一张无距离限制的【杀】；若你没赢，则你本回合不能使用【杀】。
```js
stdshuangdao: {
		audio: "shuangren",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return (
				player.countCards("h") > 0 &&
				game.hasPlayer(function (current) {
					return current != player && player.canCompare(current);
				})
			);
		},
		async cost(event, trigger, player) {
			let goon;
			if (player.needsToDiscard() > 1) {
				goon = player.hasCard(function (card) {
					return card.number > 10 && get.value(card) <= 5;
				});
			} else {
				goon = player.hasCard(function (card) {
					return (card.number >= 9 && get.value(card) <= 5) || get.value(card) <= 3;
				});
			}
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), function (card, player, target) {
					return player.canCompare(target);
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					if (_status.event.goon && get.attitude(player, target) < 0) {
						return get.effect(target, { name: "sha" }, player, player);
					}
					return 0;
				})
				.set("goon", goon)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player.chooseToCompare(target).forResult();
			if (result.bool) {
				if (
					game.hasPlayer(function (current) {
						if (!player.canUse("sha", current, false)) {
							return false;
						}
						return get.distance(target, current) <= 1;
					})
				) {
					const result2 = await player
						.chooseTarget("是否对至多两名与其距离为1的角色各使用一张杀？", [1, 2], function (card, player, target) {
							if (!player.canUse("sha", target, false)) {
								return false;
							}
							return get.distance(get.event().identity, target) <= 1;
						})
						.set("ai", function (target) {
							let player = _status.event.player;
							return get.effect(target, { name: "sha" }, player, player);
						})
						.set("identity", target)
						.forResult();
					if (result2.bool) {
						for (let targetx of result2.targets) {
							await player.useCard({ name: "sha", isCard: true }, targetx, false);
						}
					}
				} else {
					return;
				}
			} else {
				player.addTempSkill("rexianzhen3");
			}
		},
	}
```

## std_liru 名字:标李儒 势力:qun

### stdmieji 名字:灭计
描述: 出牌阶段限一次，你可以交给一名其他角色一张黑色锦囊牌，然后可以弃置其至多两张牌。
```js
stdmieji: {
		audio: "remieji",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h", { type: ["trick", "delay"], color: "black" });
		},
		filterCard(card) {
			return get.color(card) == "black" && get.type(card, "trick") == "trick";
		},
		filterTarget(card, player, target) {
			return target != player;
		},
		discard: false,
		delay: false,
		check(card) {
			return 8 - get.value(card);
		},
		lose: false,
		async content(event, trigger, player) {
			await player.give(event.cards, event.target);
			await player.discardPlayerCard(event.target, "he", [1, 2]);
		},
		ai: {
			order: 9,
			result: {
				target: -1,
			},
		},
	}
```

### stdjuece 名字:绝策
描述: 结束阶段，你可以对一名本回合失去过至少两张牌的角色造成1点伤害。
```js
stdjuece: {
		audio: "rejuece",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(current => {
				let num = 0;
				current.getHistory("lose", evt => {
					if (evt.cards2?.length > 0) {
						num += evt.cards2.length;
					}
				});
				return num > 1;
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "对一名本回合失去过至少两张牌的角色造成1点伤害", function (card, player, target) {
					return _status.event.targets.includes(target);
				})
				.set(
					"targets",
					game.filterPlayer(current => {
						let num = 0;
						current.getHistory("lose", evt => {
							if (evt.cards2?.length > 0) {
								num += evt.cards2.length;
							}
						});
						return num > 1;
					})
				)
				.set("ai", target => {
					var player = _status.event.player;
					return get.damageEffect(target, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await target.damage();
		},
	}
```

## std_wangyun 名字:标王允 势力:qun

### stdyunji 名字:运机
描述: 你可以将一张装备牌当【借刀杀人】使用。
```js
stdyunji: {
		audio: "jingong",
		enable: "chooseToUse",
		filterCard(card, player) {
			return get.type(card) == "equip";
		},
		position: "hes",
		viewAs: { name: "jiedao" },
		viewAsFilter(player) {
			return player.countCards("hes", { type: "equip" });
		},
		prompt: "将一张装备牌当借刀杀人使用",
		check(card) {
			const val = get.value(card);
			return 5 - val;
		},
	}
```

### stdzongji 名字:纵计
描述: 当一名角色受到【杀】或【决斗】造成的伤害后，你可以弃置其与伤害来源的各一张牌。
```js
stdzongji: {
		audio: "wylianji",
		trigger: {
			global: "damageEnd",
		},
		filter(event, player) {
			if (!event.card || !["sha", "juedou"].includes(event.card.name)) {
				return false;
			}
			if (!event.player.isIn() || !event.source || !event.source.isIn()) {
				return false;
			}
			return event.player.countCards("he") || event.source.countCards("he");
		},
		check(event, player) {
			let eff1 = get.effect(event.player, { name: "guohe_copy2" }, player, player),
				eff2 = get.effect(event.source, { name: "guohe_copy2" }, player, player);
			return eff1 + eff2 > 0;
		},
		logTarget(event) {
			return [event.player, event.source];
		},
		async content(event, trigger, player) {
			if (trigger.player.countCards("he")) {
				await player.discardPlayerCard(trigger.player, "he", true);
			}
			if (trigger.source.countCards("he")) {
				await player.discardPlayerCard(trigger.source, "he", true);
			}
		},
	}
```

