# sp2 merged reference

## star_zhugejin 名字:星诸葛瑾 势力:wu

### starzunjian 名字:尊谏
描述: 出牌阶段每种花色限一次，你可以弃置一种花色的所有手牌并令一名角色摸X张牌（X为你手牌中缺少的花色数），然后若其手牌数为全场唯一最多，其可以交给你至多两张手牌；若其体力值全场唯一最少，你可令其回复一点体力。
```js
starzunjian: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.hasDiscardableCards(player, "h", card => !player.getStorage("starzunjian_used").includes(get.suit(card)));
		},
		filterCard(card, player) {
			if (player.getStorage("starzunjian_used").includes(get.suit(card))) {
				return false;
			}
			if (!lib.filter.cardDiscardable(card, player, "starzunjian")) {
				return false;
			}
			if (ui.selected.cards.length) {
				return get.suit(card) === get.suit(ui.selected.cards[0]);
			}
			return true;
		},
		selectCard() {
			if (ui.selected.cards?.length) {
				return -1;
			}
			return 1;
		},
		position: "h",
		filterTarget: true,
		check(card) {
			return 8 - get.value(card);
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			const target = event.target;
			player.addTempSkill(event.name + "_used");
			player.markAuto(event.name + "_used", [get.suit(cards[0])]);
			const num = lib.suit.slice().removeArray(player.getCards("h").map(card => get.suit(card))).length;
			if (num > 0) {
				await target.draw({ num });
			}
			if (target.isMaxHandcard(true) && target != player) {
				await target.chooseToGive({ target: player, selectCard: [1, 2], position: "h", prompt: `尊谏：你可以交给${get.translation(player)}至多两张手牌` });
			}
			if (target.isMinHp(true) && target.isDamaged()) {
				const result = await player
					.chooseBool({
						prompt: `尊谏：是否令${get.translation(target)}回复一点体力`,
						ai() {
							const { player, target } = get.event();
							if (get.attitude(player, target) > 0) {
								return 1;
							}
							return 0;
						},
					})
					.set("target", target)
					.forResult();
				if (result?.bool) {
					await target.recover();
				}
			}
		},
		ai: {
			order: 0.01,
			result: {
				player: 1,
				target(player, target) {
					if (target.hasSkillTag("nogain")) {
						return 0;
					}
					if (get.attitude(player, target) < 0) {
						return 0;
					}
					return target.countCards("h") * Math.max(1, target.getDamagedHp());
				},
			},
		},
		subSkill: { used: { charlotte: true, onremove: true, intro: { content: "本回合已弃置花色：$" } } },
	}
```

### starhongya 名字:弘雅
描述: 每回合限两次，当你成为其他角色使用牌的目标时，你可以重铸一张比其使用的牌点数更大的手牌令其使用的牌对你无效；若你重铸的牌点数为你手牌中点数最大的牌，则你额外摸X张牌（X为你手牌中缺少的花色数）。
```js
starhongya: {
		audio: 2,
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			return player.hasCards("h") && player != event.player && typeof get.number(event.card) == "number";
		},
		usable: 2,
		async cost(event, trigger, player) {
			const num = get.number(trigger.card);
			event.result = await player
				.chooseCard({
					prompt: get.prompt(event.skill),
					prompt2: `重铸一张点数比${num}更大的手牌令${get.translation(trigger.card)}对你无效`,
					filterCard(card, player) {
						if (!lib.filter.cardRecastable(card, player)) {
							return false;
						}
						return get.number(card) > get.event().num;
					},
					ai(card) {
						const { player, target, cardx } = get.event();
						if (get.effect(player, cardx, target, player) <= 0) {
							return 114514 - get.value(card);
						}
						return 0;
					},
				})
				.set("num", num)
				.set("target", trigger.player)
				.set("cardx", trigger.card)
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			trigger.getParent().excluded.add(player);
			const num = lib.suit.slice().removeArray(player.getCards("h").map(card => get.suit(card))).length;
			const num1 = get.number(cards[0]),
				num2 = Math.max(0, ...player.getCards("h").map(card => get.number(card)));
			await player.recast(cards);
			if (num1 >= num2 && num > 0) {
				await player.draw({ num });
			}
		},
	}
```

## caobao 名字:曹豹 势力:qun

### yanjiu 名字:厌酒
描述: 锁定技，每轮结束时，若X为0，则你回复1点体力；否则你失去X点体力，然后令一名其他角色下次受到【杀】的伤害+1。（X为你本轮使用的【酒】数量）
```js
yanjiu: {
		audio: 2,
		forced: true,
		trigger: { global: "roundEnd" },
		getNum(player) {
			return player.countRoundHistory("useCard", evt => evt.card.name == "jiu");
		},
		async content(event, trigger, player) {
			const num = get.info(event.name).getNum(player);
			if (num > 0) {
				await player.loseHp(num);
				if (game.hasPlayer(current => current != player)) {
					const result = await player
						.chooseTarget(lib.filter.notMe, "请选择一名其他角色，其下次受到【杀】的伤害+1", true)
						.set("ai", target => {
							const player = get.player();
							return -get.attitude(player, target);
						})
						.forResult();
					if (result?.bool) {
						const target = result.targets[0];
						player.line(target);
						target.addSkill(event.name + "_effect");
						target.addMark(event.name + "_effect", 1, false);
					}
				}
			} else {
				await player.recover();
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				trigger: { player: "damageBegin3" },
				filter(event, player) {
					return event.card?.name == "sha";
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					trigger.num += player.countMark(event.name);
					player.removeSkill(event.name);
				},
				intro: { content: "下次受到【杀】的伤害时，此伤害+#" },
			},
		},
	}
```

### poyin 名字:迫饮
描述: 锁定技。①回合开始时，你摸体力上限张牌，然后令其中体力值或已损失体力值张牌视为【酒】。②回合结束时，手牌最多的角色猜测你手牌中的【酒】是否多于其余手牌，若其猜对，则其从牌堆中获得一张【杀】；否则你可以重铸任意张牌。
```js
poyin: {
		audio: 2,
		forced: true,
		trigger: { player: "phaseBegin" },
		async content(event, trigger, player) {
			let result = await player.draw({ num: player.maxHp }).forResult();
			if (get.itemtype(result?.cards) != "cards") {
				return;
			}
			const list = [player.getDamagedHp(), player.getHp()].sort((a, b) => a - b);
			const hs = player.getCards("h", card => result.cards.includes(card));
			if (hs.length <= list[1]) {
				result = { bool: true, cards: hs };
			} else {
				result = await player
					.chooseCard({
						prompt: `迫饮：选择其中${get.cnNumber(list[0])}张或${get.cnNumber(list[1])}张牌视为【酒】`,
						forced: true,
						position: "h",
						selectCard: list,
						filterCard(card, player) {
							return get.event().cards?.includes(card);
						},
						filterOk() {
							return get.event().list.includes(ui.selected.cards?.length);
						},
						ai(card) {
							const num = get.event().selectCard[0];
							if (num == 0) {
								if (player.getHp() >= 3) {
									return 0;
								}
								return 6 - get.value(card);
							} else {
								if (ui.selected.cards.length == get.event().selectCard[0]) {
									return 0;
								}
								return 6 - get.value(card);
							}
						},
					})
					.set("list", list)
					.set("cards", result.cards)
					.forResult();
			}
			if (result?.cards?.length) {
				player.addSkill(`${event.name}_jiu`);
				player.addGaintag(result.cards, `${event.name}_jiu`);
			}
		},
		group: "poyin_end",
		subSkill: {
			end: {
				audio: "poyin",
				trigger: { player: "phaseEnd" },
				forced: true,
				logTarget(event, player, name) {
					return game.filterPlayer(target => target.isMaxHandcard()).sortBySeat();
				},
				async content(event, trigger, player) {
					const { targets } = event;
					for (const target of targets.sortBySeat()) {
						if (!target.isIn()) {
							continue;
						}
						const reality = player.countCards("h", "jiu") > player.countCards("h", card => get.name(card) != "jiu");
						const result = await target
							.chooseBool({
								prompt: `迫饮：请猜测${get.translation(player)}手牌中的【酒】是否多于其余手牌`,
								choice: (() => {
									const view = target.hasSkillTag("viewHandcard", null, player, true);
									if (view) {
										return reality;
									}
									if (player == target) {
										return !reality;
									}
									return Math.random() > 0.5;
								})(),
							})
							.forResult();
						const bool = Boolean(result?.bool);
						if (bool == reality) {
							target.popup("猜测正确");
							game.log(target, "#g猜测正确");
							const card = get.cardPile2(card => get.name(card) == "sha");
							if (card) {
								await target.gain({ cards: [card], animate: "gain2" });
							}
						} else {
							target.popup("猜测错误");
							game.log(target, "#g猜测错误");
							const result = await player
								.chooseCard({
									prompt: `迫饮：你可以重铸任意张牌`,
									selectCard: [1, Infinity],
									filterCard: lib.filter.cardRecastable,
									position: "he",
									ai(card) {
										const player = get.player();
										if (player.hasSkill("yanjiu") && get.name(card) == "jiu") {
											return 8 - get.value(card);
										}
										return 6 - get.value(card);
									},
								})
								.forResult();
							if (result?.bool && result.cards?.length) {
								await player.recast(result.cards);
							}
						}
					}
				},
			},
			jiu: {
				charlotte: true,
				onremove(player, skill) {
					player.removeGaintag(skill);
				},
				mod: {
					cardname(card, player) {
						if (get.itemtype(card) == "card" && card.hasGaintag("poyin_jiu")) {
							return "jiu";
						}
					},
				},
			},
		},
	}
```

## star_zhangsong 名字:星张松 势力:shu

### starxisong 名字:悉诵
描述: 每轮限一次，其他角色的出牌阶段开始时，你可观看其手牌，若如此做，此阶段结束时，你声明一个类别、花色和点数并展示其手牌。若其中有完全符合你声明的牌，此技能视为未发动过，然后其弃置此牌，若你能使用则使用之。
```js
starxisong: {
		audio: 2,
		trigger: {
			global: "phaseUseBegin",
		},
		round: 1,
		filter(event, player) {
			return event.player != player && event.player.countCards("h") > 0;
		},
		logTarget: "player",
		check(event, player) {
			return get.attitude(player, event.player) < 0;
		},
		getList: card => [get.type2(card), get.suit(card), get.number(card)],
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			await player.viewHandcards(target);
			player.addTempSkill(`${event.name}_mark`, "phaseChange");
			player.markAuto(`${event.name}_mark`, target.getCards("h"));
			player
				.when({ global: "phaseUseEnd" })
				.filter(evt => evt == trigger)
				.then(async (event, trigger, player) => {
					if (!target.isIn() || !target.countCards("h")) {
						return;
					}
					//开透视吧，不喜欢ai折磨人的话（）
					const known = target.getCards("h", card => card.isKnownBy(player));
					const types = ["basic", "trick", "equip"];
					const suits = lib.suit.slice();
					const numbers = Array.from({ length: 13 }).map((val, i) => i + 1);
					const getList = get.info("starxisong").getList;
					const result = await player
						.chooseButton([`悉诵：请声明一个类别、花色和点数并展示${get.translation(target)}的手牌`, [types.map(i => [i, get.translation(i)]), "tdnodes"], [suits.map(i => [i, get.translation(i)]), "tdnodes"], [numbers.map(i => [i, get.strNumber(i)]), "tdnodes"]], 3, true)
						.set("filterButton", button => {
							const { buttons } = ui.selected;
							const { link } = button;
							if (!buttons.length) {
								return ["basic", "trick", "equip"].includes(link);
							} else if (buttons.length == 1) {
								return lib.suit.includes(link);
							} else {
								return typeof link == "number";
							}
							return false;
						})
						.set(
							"list",
							known.randomGets(1).flatMap(i => getList(i))
						)
						.set("ai", button => {
							const { list } = get.event();
							if (!list?.length) {
								return Math.random();
							}
							return list.includes(button.link);
						})
						.forResult();
					const { links } = result;
					if (links?.length) {
						game.log(player, "声明了", `#g${get.translation(links[0])}、${get.translation(links[1])}、${get.strNumber(links[2])}`);
						await target.showHandcards();
						const hs = target.getCards("h").filter(card => getList(card).every((val, idx) => val == links[idx]));
						if (hs.length) {
							player.popup("洗具");
							await target.modedDiscard(hs);
							player.refreshSkill("starxisong");
							while (hs.length) {
								const card = hs.shift();
								if (get.position(card) == "d" && (player.hasUseTarget(card, void 0, true) || (get.info(card).notarget && lib.filter.cardEnabled(card, player)))) {
									await player.chooseUseTarget(card, true, false);
								}
							}
						} else {
							player.popup("杯具");
						}
					}
				});
		},
		subSkill: {
			mark: {
				charlotte: true,
				onremove: true,
				intro: {
					name: "悉诵（观看的牌）",
					markcount: () => 0,
					mark(dialog, storage, player) {
						if (player.isUnderControl(true)) {
							dialog.add(storage);
						} else {
							dialog.addText("雨女无瓜");
						}
					},
				},
			},
		},
	}
```

### starfanglang 名字:放浪
描述: ①摸牌阶段结束时，你可以展示一张此阶段摸到的牌，然后直到你的下回合开始，当你每回合使用或打出第一张除展示牌外的牌时，你摸X张牌（X为此牌与展示牌类别、花色、点数相同的项数）。②结束阶段，你可以弃置一张牌，然后获得弃牌堆中与此牌类别、点数、花色相同的牌各一张。
```js
starfanglang: {
		audio: 2,
		trigger: { player: "phaseDrawEnd" },
		filter(event, player) {
			const hs = player.getCards("he");
			return player
				.getHistory("gain", evt => evt.getParent("phaseDraw") == event)
				.reduce((list, evt) => [...list, ...evt.cards], [])
				.containsSome(...hs);
		},
		check: () => true,
		async cost(event, trigger, player) {
			const cards = player.getHistory("gain", evt => evt.getParent("phaseDraw") == trigger).reduce((list, evt) => [...list, ...evt.cards], []);
			event.result = await player
				.chooseCard({
					prompt: get.prompt2(event.skill),
					position: "he",
					filterCard(card, player) {
						return get.event().cards.includes(card);
					},
					cards,
					ai(card) {
						return Math.random();
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			player.addTempSkill(event.name + "_draw", { player: "phaseBeforeStart" });
			player.markAuto(event.name + "_draw", cards);
			await player.showCards(cards);
		},
		group: ["starfanglang_gain"],
		subSkill: {
			draw: {
				audio: "starfanglang",
				charlotte: true,
				onremove: true,
				intro: { content: "cards" },
				trigger: { player: ["useCard", "respond"] },
				forced: true,
				filter(event, player) {
					const storage = player.getStorage("starfanglang_draw");
					return storage.length > 0 && (player.getHistory("useCard").indexOf(event) == 0 || player.getHistory("respond").indexOf(event) == 0) && !event.cards.containsSome(...storage) && get.info("starfanglang_draw").getNum(player, event.card) > 0;
				},
				getNum(player, card) {
					const getList = get.info("starxisong").getList;
					const storage = player.getStorage("starfanglang_draw");
					const list = storage.map(i => getList(i));
					const keys = ["type2", "suit", "number"];
					return keys.filter((key, idx) => list.some(i => i[idx] == get[key](card))).length;
				},
				async content(event, trigger, player) {
					await player.draw(get.info(event.name).getNum(player, trigger.card));
				},
			},
			gain: {
				audio: "starfanglang",
				trigger: { player: "phaseJieshuBegin" },
				filter(event, player) {
					return player.hasDiscardableCards(player, "he");
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseToDiscard(`###${get.prompt(event.skill)}###你可以弃置一张牌，然后你获得弃牌堆中与此牌类别、点数、花色相同的牌各一张牌。`, "he", "chooseonly")
						.set("ai", card => 7 - get.value(card))
						.forResult();
				},
				async content(event, trigger, player) {
					const { cards } = event;
					await player.discard(cards);
					const gain = [];
					const keys = ["type2", "suit", "number"];
					keys.forEach((key, idx) => {
						const card = get.discardPile(card => {
							return !gain.includes(card) && get[key](card) == get[key](cards[0]);
						});
						if (card) {
							gain.push(card);
						}
					});
					if (gain.length) {
						await player.gain(gain, "gain2");
					}
				},
			},
		},
	}
```

## star_zhanghe 名字:星张郃 势力:qun

### starjunxi 名字:峻袭
描述: 出牌阶段开始时，你可选择一名其他角色并记录你的手牌数；此阶段结束时，该角色须弃置任意张牌并失去任意点体力（弃置牌数与体力值之和为X），若X等于0，你弃置两张牌（X为你当前手牌数与记录值的差值）。
```js
starjunxi: {
		audio: 2,
		trigger: {
			player: ["phaseUseBegin", "phaseUseEnd"],
		},
		filter(event, player, name, list) {
			if (name == "phaseUseEnd") {
				return list[0]?.isIn();
			}
			return game.hasPlayer(current => current != player);
		},
		getIndex(event, player, name) {
			if (name == "phaseUseEnd") {
				return player.getStorage("starjunxi");
			}
			return 1;
		},
		async cost(event, trigger, player) {
			if (event.triggername == "phaseUseEnd") {
				event.result = {
					bool: true,
					targets: [event.indexedData[0]],
				};
				return;
			}
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), lib.filter.notMe)
				.set("ai", target => {
					return -get.attitude(get.player(), target);
				})
				.forResult();
		},
		intro: {
			content(storage) {
				return storage.map(info => `${get.translation(info[0])}：${info[1]}`).join("<br>");
			},
		},
		onremove: true,
		async content(event, trigger, player) {
			const target = event.targets[0],
				num = player.countCards("h");
			if (event.triggername == "phaseUseBegin") {
				player.markAuto(event.name, [[target, num]]);
				return;
			}
			const list = player.getStorage(event.name),
				index = list.findIndex(info => info[0] == target);
			if (index < 0) {
				return;
			}
			const num2 = list.splice(index, 1)[0][1];
			player.setStorage(event.name, list, true);
			const numx = Math.abs(num - num2);
			if (numx == 0) {
				await player.chooseToDiscard("he", true, 2);
				return;
			}
			const result =
				target.countDiscardableCards(target, "he") > 0
					? await target
							.chooseToDiscard(`弃置${get.cnNumber(numx)}张牌，每少弃置一张牌便失去1点体力`, [1, numx], "he")
							.set("ai", card => {
								const { eff, maxNum: num, player } = get.event();
								if (eff > 0) {
									const numx = num - ui.selected.cards.length;
									if (numx < player.hp) {
										return 0;
									}
								}
								return 10 - get.value(card);
							})
							.set("complexCard", true)
							.set("maxNum", numx)
							.set("eff", get.effect(target, { name: "losehp" }, target, target))
							.forResult()
					: {
							bool: false,
						};
			if (result?.bool && result.cards?.length) {
				const numx2 = numx - result.cards.length;
				if (numx2 > 0) {
					await target.loseHp(numx2);
				}
			} else {
				await target.loseHp(numx);
			}
		},
	}
```

### starjixian 名字:机先
描述: 若你回合的第一个出牌阶段没有使用基本和锦囊牌，则弃牌阶段结束后你可以执行一个额外的出牌阶段，此阶段你不能使用装备牌。
```js
starjixian: {
		audio: 2,
		trigger: {
			player: "phaseDiscardAfter",
		},
		filter(event, player) {
			const evt = game.getGlobalHistory("everything", evt => evt.name == "phaseUse" && evt.player == player)[0];
			if (!evt || _status.currentPhase != player) {
				return false;
			}
			return !player.hasHistory("useCard", evtx => evtx.getParent("phaseUse") == evt && ["basic", "trick"].includes(get.type2(evtx.card)));
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			const evt = trigger.getParent("phase", true);
			if (evt) {
				evt.phaseList.splice(evt.num + 1, 0, `phaseUse|${event.name}`);
				player
					.when("phaseUseBegin")
					.filter(evt => evt._extraPhaseReason == event.name)
					.step(async (event, trigger, player) => {
						player.addTempSkill(`starjixian_limit`, "phaseChange");
					});
			}
		},
		subSkill: {
			limit: {
				charlotte: true,
				mod: {
					cardEnabled(card, player) {
						if (get.type(card) == "equip") {
							return false;
						}
					},
				},
			},
		},
	}
```

## dc_yanxiang 名字:新杀阎象 势力:qun

### dcyuzheng 名字:谕诤
描述: 出牌阶段每项各限一次，你可以令一名角色选择一项：1.将手牌数调整至与全场最少角色相同，本轮下X次使用或打出牌后摸两张牌（X为以此法弃置的牌数）；2.摸等同于体力上限张牌（至多为5），本轮增加等量手牌上限，且本轮至多可以再使用等量张牌。
```js
dcyuzheng: {
		audio: 2,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			if (!player.getStorage("dcyuzheng_used").includes(1)) {
				return target.maxHp > 0;
			}
			return !target.isMinHandcard();
		},
		filter(event, player) {
			return player.getStorage("dcyuzheng_used").length < 2 && game.hasPlayer(current => get.info("dcyuzheng").filterTarget(null, player, current));
		},
		async content(event, trigger, player) {
			const { target } = event;
			const list = [`将手牌数调整至与全场最少角色相同，本轮下X次使用或打出牌后摸两张牌（X为以此法弃置的牌数）`, `摸等同于体力上限张牌（至多为5），本轮增加等量手牌上限，且本轮至多可以再使用等量张牌`];
			const storage = player.getStorage(`${event.name}_used`);
			let result;
			if (storage.length == 1) {
				result = { index: storage[0] == 0 ? 1 : 0 };
			} else if (target.isMinHandcard()) {
				result = { index: 1 };
			} else {
				result = await target.chooseControl({ choiceList: list, choice: 1 }).forResult();
			}
			if (typeof result?.index == "number") {
				const { index } = result;
				player.addTempSkill(`${event.name}_used`, "phaseChange");
				player.markAuto(`${event.name}_used`, index);
				if (index == 0) {
					const num = game.findPlayer(i => i.isMinHandcard())?.countCards("h");
					if (num == null) {
						return;
					}
					const numx = num - target.countCards("h");
					if (numx > 0) {
						await target.draw({ num: numx });
					} else if (numx < 0) {
						const count = Math.max(1, -numx);
						if (numx < 0) {
							await target.chooseToDiscard({
								position: "h",
								selectCard: -numx,
								forced: true,
								allowChooseAll: true,
							});
						}
						target.addTempSkill(`${event.name}_effect1`, "roundStart");
						target.addMark(`${event.name}_effect1`, count, false);
					}
				} else if (index == 1) {
					const num = Math.min(target.maxHp, 5);
					await target.draw({ num });
					target.addTempSkill(`${event.name}_debuff`, "roundStart");
					target.setMark(`${event.name}_debuff`, num, false);
					target.addTempSkill(`${event.name}_effect2`, "roundStart");
					target.addMark(`${event.name}_effect2`, num, false);
				}
			}
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					if (!player.getStorage("dcyuzheng_used").length) {
						return 114514 - target.countCards("h");
					}
					return -target.countCards("h");
				},
			},
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
			effect1: {
				charlotte: true,
				onremove: true,
				forced: true,
				trigger: { player: ["useCardAfter", "respondAfter"] },
				filter(event, player) {
					return player.hasMark("dcyuzheng_effect1");
				},
				async content(event, trigger, player) {
					player.removeMark(event.name, 1, false);
					if (!player.hasMark(event.name)) {
						player.removeSkill(event.name);
					}
					await player.draw({ num: 2 });
				},
				intro: {
					content: "下#次使用或打出牌后摸两张牌",
				},
			},
			effect2: {
				charlotte: true,
				onremove: true,
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("dcyuzheng_effect2");
					},
				},
				markimage: "image/card/handcard.png",
				intro: {
					content: "本轮手牌上限+#",
				},
			},
			debuff: {
				charlotte: true,
				onremove: true,
				mod: {
					cardEnabled(card, player) {
						if (!player.hasMark("dcyuzheng_debuff")) {
							return false;
						}
					},
					cardSavable(card, player) {
						if (!player.hasMark("dcyuzheng_debuff")) {
							return false;
						}
					},
				},
				trigger: { player: "useCard1" },
				firstDo: true,
				forced: true,
				popup: false,
				filter(event, player) {
					return player.hasMark("dcyuzheng_debuff");
				},
				async content(event, trigger, player) {
					player.removeMark(event.name, 1, false);
				},
				intro: {
					content: "还能再使用#张牌",
				},
			},
		},
	}
```

### dcyxsuishi 名字:邃识
描述: 一名角色的结束阶段，若其手牌数不小于体力值，你可以声明一种伤害牌牌名，其可将一张牌当此牌使用，若此牌造成伤害，受到伤害的角色不能使用与造成伤害的牌颜色相同的牌直到其回合结束。
```js
dcyxsuishi: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return event.player.countCards("h") >= event.player.getHp();
		},
		async cost(event, trigger, player) {
			const list = get.inpileVCardList(info => {
				if (info[3] || info[0] == "delay") {
					return false;
				}
				return get.tag({ name: info[2] }, "damage");
			});
			if (list.length) {
				const result = await player
					.chooseButton([get.prompt2(event.skill, trigger.player), [list, "vcard"]])
					.set("goon", get.attitude(player, trigger.player) > 0)
					.set("target", trigger.player)
					.set("ai", button => {
						if (!get.event().goon) {
							return 0;
						}
						const { target } = get.event();
						const card = get.autoViewAs({ name: button.link[2] }, "unsure");
						return Math.max(...game.players.map(targetx => (target.canUse(card, target) ? get.effect(targetx, card, target, get.player()) : 0)));
					})
					.forResult();
				if (result?.bool && result.links?.length) {
					event.result = {
						bool: true,
						cost_data: { name: result.links[0][2] },
					};
				}
			}
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const {
				cost_data: card,
				targets: [target],
			} = event;
			game.broadcastAll(function (card) {
				lib.skill.dcyxsuishi_backup.viewAs = card;
			}, card);
			const next = target.chooseToUse();
			next.set("openskilldialog", `###${get.translation(event.name)}###是否将一张牌当做【${get.translation(card.name)}】使用？`);
			next.set("norestore", true);
			next.set("addCount", false);
			next.set("_backupevent", `${event.name}_backup`);
			next.set("custom", {
				add: {},
				replace: { window() {} },
			});
			next.backup(`${event.name}_backup`);
			await next;
		},
		subSkill: {
			backup: {
				audio: "dcyxsuishi",
				filterCard(card) {
					return get.itemtype(card) == "card";
				},
				position: "hes",
				selectCard: 1,
				check: card => 6 - get.value(card),
				popname: true,
				async precontent(event, trigger, player) {
					event.getParent().oncard = function () {
						const { card } = get.event();
						player
							.when("useCardAfter")
							.filter(evt => evt.card == card)
							.step(async (event, trigger, player) => {
								const targets = game.filterPlayer(target => target.hasHistory("damage", evt => evt.card == trigger.card));
								player.line(targets, "yellow");
								targets.forEach(target => {
									target.addTempSkill("dcyxsuishi_debuff", { player: "phaseAfter" });
									target.markAuto("dcyxsuishi_debuff", get.color(trigger.card));
								});
							});
					};
				},
			},
			debuff: {
				charlotte: true,
				onremove: true,
				mod: {
					cardEnabled(card, player) {
						if (player.getStorage("dcyxsuishi_debuff").includes(get.color(card))) {
							return false;
						}
					},
					cardSavable(card, player) {
						if (player.getStorage("dcyxsuishi_debuff").includes(get.color(card))) {
							return false;
						}
					},
				},
				intro: {
					content: "不能使用$的牌直到你回合结束",
				},
			},
		},
	}
```

## cuilie 名字:崔烈 势力:qun

### dczijue 名字:赀爵
描述: 出牌阶段限一次，你可令一名其他角色声明2-4中的一个数字，你可交给其X张牌并回复1点体力，然后其他角色计算与你的距离和你的拼点牌点数+X直到你的下回合开始且你拼点时摸一张牌；若你未交给其牌，则你摸X张牌（X为其声明的数字）。
```js
dczijue: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			const { target, name } = event;
			const result = await target
				.chooseControl("两张", "三张", "四张")
				.set("prompt", "声明一个数字")
				.set("ai", () => {
					return get.event().resultx;
				})
				.set(
					"resultx",
					(() => {
						if (get.attitude(target, player) > 0 && player.getDamagedHp() < 2) {
							return "四张";
						}
						return "两张";
					})()
				)
				.forResult();
			target.popup(result.control, "wood");
			const num = result.index + 2;
			game.log(target, "声明的数字为", `#y${num}`);
			const result2 = await player
				.chooseToGive(target, "he", num, `交给${get.translation(target)}${get.cnNumber(num)}张牌，否则你摸${get.cnNumber(num)}张牌`)
				.set("ai", card => {
					const { player } = get.event();
					if (player.getDamagedHp() < 2) {
						return 0;
					}
					return 7 - get.value(card);
				})
				.forResult();
			if (result2?.bool && result2.cards?.length) {
				await player.recover();
				player.addTempSkill(`${name}_effect`, { player: "phaseBegin" });
				player.addMark(`${name}_effect`, num, false);
			} else {
				await player.draw(num);
			}
		},
		subSkill: {
			effect: {
				audio: "dczijue",
				charlotte: true,
				onremove: true,
				forced: true,
				locked: false,
				intro: { content: "其他角色计算与你的距离和你的拼点点数+#且你拼点时摸一张牌" },
				trigger: {
					player: "compare",
					target: "compare",
				},
				filter(event, player, name) {
					if (player != event.target && event.iwhile) {
						return false;
					}
					return player.countMark("dczijue_effect");
				},
				async content(event, trigger, player) {
					const key = player == trigger.player ? "num1" : "num2";
					trigger[key] = Math.min(13, trigger[key] + player.countMark(event.name));
					game.log(player, "的拼点牌点数+", player.countMark(event.name));
					await player.draw();
				},
				mod: {
					globalTo(from, to, num) {
						return num + to.countMark("dczijue_effect");
					},
				},
			},
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					return 1;
				},
				player(player, target) {
					if (get.attitude(player, target) > 0 && player.getHp() > 1) {
						return 3 + get.damageEffect(player, target, player) / 3;
					}
					return 1;
				},
			},
		},
	}
```

### dcchibi 名字:斥避
描述: 其他角色使用牌指定其计算距离大于1的角色为目标时，你可与其拼点：若你赢，你令此牌无效并获得此牌；若你没赢，你成为此牌的额外目标且此技能本回合失效。
```js
dcchibi: {
		audio: 2,
		trigger: { global: "useCardToPlayer" },
		filter(event, player) {
			if (event.player == player || event.player == event.target) {
				return false;
			}
			return get.distance(event.player, event.target) > 1 && player.canCompare(event.player);
		},
		logTarget: "player",
		check(event, player) {
			if (event.target != player && get.tag(event.card, "damage") && player.hp < 2) {
				return false;
			}
			return get.effect(event.target, event.card, event.player, player) < -2;
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player.chooseToCompare(target).forResult();
			const evt = trigger.getParent();
			if (result.bool) {
				evt.targets.length = 0;
				evt.all_excluded = true;
				if (evt.cards?.someInD()) {
					await player.gain(evt.cards.filterInD(), "gain2");
				}
			} else {
				player.tempBanSkill(event.name);
				if (!["basic", "trick"].includes(get.type(evt.card))) {
					return;
				}
				if (evt.targets.includes(player)) {
					return;
				}
				if (!lib.filter.targetEnabled2(evt.card, evt.player, player)) {
					return;
				}
				evt.targets.add(player);
			}
		},
	}
```

## star_jiangwan 名字:星蒋琬 势力:shu

### starzhenting 名字:镇庭
描述: 一名角色的回合结束时，若本回合至少两名角色受到过伤害，你可以选择一项：1.令本回合受到过伤害的一名角色回复1点体力并摸一张牌；2.令本回合造成过伤害的一名角色获得本回合进入弃牌堆的两张牌。
```js
starzhenting: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return (
				game.countPlayer2(current => {
					return current.hasHistory("damage");
				}, true) > 1
			);
		},
		async cost(event, trigger, player) {
			const damage = game.filterPlayer(current => current.hasHistory("damage"));
			const sourceDamage = game.filterPlayer(current => current.hasHistory("sourceDamage"));
			const target = game.players.maxBy(current => {
				let eff = get.effect(current, { name: "draw" }, player, player),
					eff1 = 0,
					eff2 = 0;
				if (damage.includes(current)) {
					eff1 = eff + get.recoverEffect(current, player, player);
				}
				if (sourceDamage.includes(current)) {
					eff2 = 3 * eff;
				}
				return Math.max(eff1, eff2);
			});
			const result = await player
				.chooseButtonTarget({
					createDialog: [
						get.prompt(event.skill),
						[
							[
								["damage", "令一名受到过伤害的角色回复1点体力并摸一张牌"],
								["sourceDamage", "令一名造成过伤害的角色获得本回合进入弃牌堆的两张牌"],
							],
							"textbutton",
						],
					],
					filterButton(button) {
						return get.event()[button.link]?.length;
					},
					filterTarget(card, player, target) {
						const type = ui.selected.buttons?.[0]?.link;
						if (!type) {
							return false;
						}
						return get.event()[type]?.includes(target);
					},
					ai1(button) {
						const { targetx } = get.event();
						if (!targetx) {
							return 0;
						}
						if (get.event()[button.link]?.includes(targetx)) {
							return 1;
						}
						return 0;
					},
					ai2(target) {
						const { targetx } = get.event();
						if (target == targetx) {
							return 1;
						}
						return 0;
					},
				})
				.set("complexTarget", true)
				.set("damage", damage)
				.set("sourceDamage", sourceDamage)
				.set("targetx", target)
				.forResult();
			event.result = {
				bool: result?.bool,
				targets: result?.targets,
				cost_data: result?.links?.[0],
			};
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cost_data: type,
			} = event;
			if (type == "damage") {
				await target.recover();
				await target.draw();
			} else {
				const cards = get.discarded().filterInD("d");
				if (!cards.length) {
					return;
				}
				const result = await player
					.chooseButton([`镇庭：选择令${get.translation(target)}获得的牌`, cards], true, Math.min(cards.length, 2))
					.set("ai", button => {
						const { player, target } = get.event();
						return get.sgnAttitude(player, target) * get.value(button.link, target);
					})
					.set("target", target)
					.forResult();
				if (result?.bool && result?.links?.length) {
					await target.gain(result.links, "gain2");
				}
			}
		},
	}
```

### starchiguo 名字:持国
描述: 出牌阶段开始时，你可以观看牌堆底三张牌，本阶段你使用一张牌时，亮出牌堆底一张牌，若两张牌花色相同，你为你使用的牌增加或减少一个目标（目标数至少为1），然后将此牌置入弃牌堆；否则你将亮出牌交给一名目标角色。
```js
starchiguo: {
		audio: 2,
		trigger: {
			player: "phaseUseBegin",
		},
		async content(event, trigger, player) {
			const cards = get.bottomCards(3, true);
			await player.chooseControl("ok").set("dialog", ["持国：牌堆底三张牌", cards]);
			player.addTempSkill("starchiguo_effect", "phaseChange");
		},
		subSkill: {
			effect: {
				audio: "starchiguo",
				trigger: {
					player: "useCard1",
				},
				charlotte: true,
				async cost(event) {
					event.result = {
						bool: true,
					};
				},
				async content(event, trigger, player) {
					const card = get.bottomCards()[0];
					await game.cardsGotoOrdering([card]);
					await player.showCards(card, `${get.translation(player)}发动了【持国】`, true);
					if (get.suit(card) == get.suit(trigger.card)) {
						const info = get.info(trigger.card);
						if (!["trick", "basic"].includes(info.type) || info.multitarget) {
							return;
						}
						if (trigger.targets?.length) {
							const targets = game.filterPlayer(current => {
								if (trigger.targets?.includes(current)) {
									return trigger.targets.length > 1;
								}
								return lib.filter.targetEnabled2(trigger.card, player, current);
							});
							if (targets.length) {
								const result =
									targets.length > 1
										? await player
												.chooseTarget(
													`为${get.translation(trigger.card)}增加或减少一个目标`,
													(card, player, target) => {
														return get.event().targetx.includes(target);
													},
													true
												)
												.set("ai", target => {
													const player = get.player(),
														trigger = get.event().getTrigger(),
														eff = get.effect(target, trigger.card, trigger.player, player);
													if (trigger.targets?.includes(target)) {
														return -eff;
													}
													return eff;
												})
												.set("targetx", targets)
												.forResult()
										: {
												bool: true,
												targets: targets,
											};
								if (result.bool) {
									player.line(result.targets);
									if (trigger.targets.containsSome(...result.targets)) {
										trigger.targets.removeArray(result.targets);
									} else {
										trigger.targets.addArray(result.targets);
									}
								}
							}
						}
						await game.cardsDiscard(card);
					} else {
						if (trigger.targets?.length) {
							const result =
								trigger.targets.length > 1
									? await player
											.chooseTarget(
												`持国：将${get.translation(card)}交给一名目标角色`,
												(card, player, target) => {
													const trigger = get.event().getTrigger();
													return trigger.targets?.includes(target);
												},
												true
											)
											.set("ai", target => {
												const { player, cardx } = get.event();
												return target.getUseValue(cardx) * get.attitude(player, target);
											})
											.set("cardx", card)
											.forResult()
									: {
											bool: true,
											targets: trigger.targets,
										};
							if (result.bool) {
								const target = result.targets[0];
								player.line(target);
								await target.gain(card, "gain2");
							}
						}
					}
				},
			},
		},
	}
```

## star_taishici 名字:星太史慈 势力:qun

### starchongwei 名字:重围
描述: 锁定技，你计算与其他角色的距离+3。当你造成伤害后，此数值-1，减少至0时你回复1点体力并摸体力值张牌，修改〖冲阻〗并失去此技能。
```js
starchongwei: {
		audio: 2,
		trigger: {
			source: "damageSource",
		},
		mark: true,
		marktext: "围",
		intro: {
			markcount(storage) {
				let num = 3;
				if (typeof storage == "number") {
					num -= storage;
				}
				return Math.max(0, num);
			},
			content(storage, player) {
				let num = 3;
				if (typeof storage == "number") {
					num -= storage;
				}
				num = Math.max(0, num);
				return `计算与其他角色的距离+${num}`;
			},
		},
		async content(event, trigger, player) {
			player.addMark(event.name, 1, false);
			if (player.countMark(event.name) >= 3) {
				await player.recover();
				if (player.getHp() > 0) {
					await player.draw(player.getHp());
				}
				player.setStorage("starchongzu", true);
				await player.removeSkills(event.name);
			}
		},
		onremove: true,
		forced: true,
		mod: {
			globalFrom(from, to, current) {
				const num = Math.max(0, 3 - from.countMark("starchongwei"));
				return current + num;
			},
		},
	}
```

### starchongzu 名字:冲阻
描述: 你使用指定自己为目标的牌结算完成后，可选择一项：1.你使用下一张牌无距离次数限制；2.摸两张牌且此项本回合失效。
```js
starchongzu: {
		audio: 2,
		trigger: {
			player: "useCardAfter",
		},
		filter(event, player) {
			return event.targets?.some(target => target == player);
		},
		async cost(event, trigger, player) {
			let list = [
				["limit", "你使用下一张牌无距离次数限制"],
				["draw", "摸两张牌且此项本回合失效"],
				["damage", "你下次使用牌指定目标后，可对其中一个其他角色造成1点伤害"],
			];
			if (!player.getStorage(event.skill, false)) {
				list.splice(2);
			}
			const result = await player
				.chooseButton([get.prompt(event.skill), [list, "textbutton"]])
				.set("filterButton", button => {
					const { link } = button,
						player = get.player();
					return link != "draw" || !player.hasSkill("starchongzu_used");
				})
				.set("ai", button => {
					const { link } = button;
					return [null, "limit", "damage", "draw"].indexOf(link);
				})
				.forResult();
			if (result.bool) {
				event.result = {
					bool: true,
					cost_data: result.links,
				};
			}
		},
		async content(event, trigger, player) {
			const link = event.cost_data[0];
			switch (link) {
				case "draw": {
					player.addTempSkill(`${event.name}_used`);
					await player.draw(2);
					break;
				}
				case "limit": {
					player
						.when({
							player: "useCard1",
						})
						.step(async (event, trigger, player) => {
							if (trigger.addCount !== false) {
								trigger.addCount = false;
								const stat = player.getStat().card,
									name = trigger.card.name;
								if (typeof stat[name] === "number") {
									stat[name]--;
								}
							}
						})
						.assign({
							mod: {
								cardUsable: () => Infinity,
								targetInRange: () => true,
							},
							ai: {
								presha: true,
							},
						});
					break;
				}
				default: {
					player
						.when({
							player: "useCardToPlayered",
						})
						.filter((evt, player) => evt.targets?.some(target => target != player))
						.step(async (event, trigger, player) => {
							const targets = trigger.targets.filter(target => target != player);
							const result = await player
								.chooseTarget("冲阻：是否对目标角色中的一名其他角色造成1点伤害？", (card, player, target) => {
									return get.event().targetsx.includes(target);
								})
								.set("targetsx", targets)
								.set("ai", target => {
									const player = get.player();
									return get.damageEffect(target, player, player);
								})
								.forResult();
							if (result.bool) {
								const target = result.targets[0];
								player.line(target);
								await target.damage(player);
							}
						});
					break;
				}
			}
		},
		subSkill: {
			used: {
				charlotte: true,
			},
		},
		derivation: "starchongzu_rewrite",
	}
```

## star_zhangrang 名字:星张让 势力:qun

### starduhai 名字:蠹害
描述: 你成为其他角色使用牌的目标后，你可以选择一种花色，然后令其增加此花色的「蠹」标记。该角色的回合结束时，若其手牌中有与「蠹」花色相同的牌，则其失去对应花色数点体力，然后移去这些花色的「蠹」。
```js
starduhai: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.player != player && event.player.isIn() && event.player.getStorage("starduhai_debuff").length < 4;
		},
		logTarget: "player",
		async cost(event, trigger, player) {
			const suits = lib.suit.slice().filter(suit => !trigger.player.getStorage("starduhai_debuff").includes(suit));
			if (!suits.length) {
				return;
			}
			const result = await player
				.chooseControl(suits, "cancel2")
				.set("prompt", get.prompt2(event.skill, trigger.player))
				.set("ai", () => {
					const player = get.player(),
						target = get.event().targetx;
					if (get.attitude(player, target) > 0) {
						return "cancel2";
					}
					return get.event().choices.randomGet();
				})
				.set("targetx", trigger.player)
				.set("choices", suits)
				.forResult();
			if (result?.control != "cancel2") {
				event.result = {
					bool: true,
					cost_data: result.control,
				};
			}
		},
		async content(event, trigger, player) {
			const suit = event.cost_data,
				skill = event.name + "_debuff",
				target = trigger.player;
			player.addTempSkill(skill, { player: "dieAfter" });
			target.markAuto(skill, [suit]);
			game.log(target, "获得了一个", `#g【蠹】(${get.translation(suit)})`);
		},
		subSkill: {
			debuff: {
				onremove(player, skill) {
					if (!game.hasPlayer(target => target != player && target.hasSkill("starduhai"))) {
						game.players.forEach(target => {
							target.unmarkAuto(skill, target.getStorage(skill));
							delete target.storage[skill];
						});
					}
				},
				charlotte: true,
				forced: true,
				intro: {
					content: storage => `已获得标记：<span class=thundertext>${storage.reduce((str, suit) => str + get.translation(suit), "")}</span>`,
				},
				trigger: { global: "phaseEnd" },
				filter(event, player) {
					return event.player.hasCard(card => event.player.getStorage("starduhai_debuff").includes(get.suit(card, event.player)), "h");
				},
				logTarget: "player",
				async content(event, trigger, player) {
					const skill = event.name,
						target = trigger.player,
						suits = target.getStorage(skill).filter(suit => target.hasCard(card => get.suit(card, target) == suit, "h"));
					await target.loseHp(suits.length);
					if (!target?.isIn()) {
						return;
					}
					target.unmarkAuto(skill, suits);
					game.log(target, "移去了", get.cnNumber(suits.length), "个", `#g【蠹】(${suits.reduce((str, suit) => str + get.translation(suit), "")})`);
				},
			},
		},
	}
```

### starlingse 名字:令色
描述: 出牌阶段限一次，你可交给一名其他角色一张牌，然后随机获得该角色与此牌类型相同的两张牌，不足两张则视为其对你使用一张【杀】 。若此【杀】造成伤害，则此技能视为未发动过。
```js
starlingse: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("he") && game.hasPlayer(target => target != player);
		},
		filterCard: true,
		filterTarget: lib.filter.notMe,
		lose: false,
		discard: false,
		delay: false,
		check(card) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const card = event.cards[0],
				type = get.type2(card, false),
				target = event.targets[0];
			await player.give(card, target);
			const cards = target.getCards("he", cardx => get.type2(cardx) == type),
				sha = get.autoViewAs({ name: "sha", isCard: true });
			let gain = [];
			if (cards.length > 0 && cards.length <= 2) {
				gain = cards.slice();
			} else if (cards.length > 2) {
				gain = cards.randomGets(2);
			}
			await player.gain(gain, target, "giveAuto", "bySelf");
			if (cards.length < 2 && target.canUse(sha, player, false, false)) {
				await target.useCard(sha, player, false);
				if (player.hasHistory("damage", evt => evt.getParent(3) == event)) {
					delete player.getStat("skill")[event.name];
					game.log(player, "重置了", "#g【令色】");
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

## star_wenchou 名字:星文丑 势力:qun

### starlianzhan 名字:连战
描述: 当你使用伤害牌指定唯一目标时，你可以选择一项：①为此牌增加一个目标；②令此牌额外结算一次。若如此做，此牌结算完毕后，若此牌造成伤害的次数：为2，你可以回复1点体力（若你未受伤则改为摸两张牌）；为0，目标角色依次视为对你使用同名牌。
```js
starlianzhan: {
		audio: 2,
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			if (event.targets.length !== 1) {
				return false;
			}
			return get.is.damageCard(event.card);
		},
		filterx(event, player) {
			const info = get.info(event.card);
			if (info.allowMultiple == false) {
				return false;
			}
			if (event.targets && !info.multitarget) {
				return game.hasPlayer(current => {
					return !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, player, current) && lib.filter.targetInRange(event.card, player, current);
				});
			}
			return false;
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseButton([
					get.prompt2(event.skill),
					[
						[
							["extraTarget", `使${get.translation(trigger.card)}增加一个目标`],
							["extraEffect", `令${get.translation(trigger.card)}额外结算一次`],
						],
						"textbutton",
					],
				])
				.set("filterButton", button => {
					const { player, evt: event } = get.event();
					if (button.link == "extraTarget") {
						return lib.skill.starlianzhan.filterx(event, player);
					}
					return true;
				})
				.set("ai", button => {
					const { player, evt: event } = get.event();
					if (button.link == "extraTarget") {
						const targets = game.filterPlayer(current => {
							return !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, player, current) && lib.filter.targetInRange(event.card, player, current);
						});
						return Math.max(...targets.map(target => get.effect(target, event.card, player, player)));
					}
					return event.targets.reduce((sum, target) => sum + get.effect(target, event.card, player, player), 0);
				})
				.set("evt", trigger.getParent())
				.forResult();
			event.result = {
				bool: result.bool,
				cost_data: result.links,
			};
		},
		async content(event, trigger, player) {
			const { cost_data } = event;
			player.addTempSkill("starlianzhan_check");
			trigger.getParent().set("starlianzhan_check", true);
			if (cost_data[0] == "extraTarget") {
				const result = await player
					.chooseTarget(
						"请选择" + get.translation(trigger.card) + "的额外目标",
						(card, player, target) => {
							const event = get.event().getTrigger();
							if (event.targets.includes(target)) {
								return false;
							}
							return lib.filter.targetEnabled2(event.card, player, target) && lib.filter.targetInRange(event.card, player, target);
						},
						true
					)
					.set("ai", target => {
						const player = get.player(),
							event = get.event().getTrigger();
						return get.effect(target, event.card, player, player);
					})
					.forResult();
				if (result?.bool && result.targets?.length) {
					player.line(result.targets);
					trigger.targets.addArray(result.targets);
					game.log(result.targets, "成为了", trigger.card, "的额外目标");
				}
			} else {
				trigger.getParent().effectCount++;
				game.log(trigger.card, "额外结算一次");
			}
		},
		subSkill: {
			check: {
				charlotte: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					if (!event.starlianzhan_check) {
						return false;
					}
					const history = player.getHistory("sourceDamage", evt => {
						return event.targets.includes(evt.player) && evt.card == event.card;
					});
					if (history.length == 2) {
						return true;
					}
					if (history.length !== 0) {
						return false;
					}
					const card = new lib.element.VCard({ name: event.card.name, isCard: true });
					return event.targets?.some(target => {
						if (!target?.isIn()) {
							return false;
						}
						return target.canUse(card, player, false);
					});
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const history = player.getHistory("sourceDamage", evt => {
						return trigger.targets.includes(evt.player) && evt.card == trigger.card;
					});
					if (history.length == 0) {
						const card = new lib.element.VCard({ name: trigger.card.name, isCard: true });
						for (const target of trigger.targets || []) {
							if (!target?.isIn()) {
								continue;
							}
							if (target.canUse(card, player, false)) {
								await target.useCard(card, player, false);
							}
						}
					} else if (history.length == 2) {
						const prompt = player.isDamaged() ? "回复1点体力" : "摸两张牌";
						const result = await player.chooseBool(`连战：是否${prompt}？`).forResult();
						const next = player.isDamaged() ? player.recover() : player.draw(2);
						await next;
					}
				},
			},
		},
	}
```

### starweiming 名字:威名
描述: 锁定技，体力值小于你或本轮受到过你造成伤害的其他角色对你使用牌时，其随机弃置一张手牌，若所有条件同时满足，则你摸一张牌。
```js
starweiming: {
		audio: 2,
		trigger: { global: "useCard" },
		filter(event, player) {
			if (event.player === player || !event.targets?.includes(player)) {
				return false;
			}
			return (
				event.player.getHp() < player.getHp() ||
				player.getRoundHistory("sourceDamage", evt => {
					return event.player == evt.player;
				}).length > 0
			);
		},
		forced: true,
		logTarget: "player",
		async content(event, trigger, player) {
			await trigger.player.randomDiscard("h");
			if (
				trigger.player.getHp() < player.getHp() &&
				player.getRoundHistory("sourceDamage", evt => {
					return trigger.player == evt.player;
				}).length > 0
			) {
				await player.draw();
			}
		},
	}
```

## star_yanliang 名字:星颜良 势力:qun

### starjizhan 名字:急战
描述: 你于回合内使用首张伤害牌指定首个目标后，可令此牌对其中一个目标造成伤害+2（你本回合此前每使用过一张非伤害牌，此数值-1）；若此牌结算后未造成伤害，其对你造成1点伤害。
```js
starjizhan: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!event.getParent()?.targets?.length || !event.isFirstTarget) {
				return false;
			}
			return player.getHistory("useCard", evt => get.is.damageCard(evt.card)).indexOf(event.getParent()) == 0;
		},
		async cost(event, trigger, player) {
			const num = 2 - player.getHistory("useCard", evt => !get.is.damageCard(evt.card), trigger.getParent()).length;
			let str = num > 0 ? `令此牌对其中一个目标造成的伤害+${num}` : "选择一个目标";
			event.result = await player
				.chooseTarget(get.prompt(event.skill), `${str}，若此牌结算后未造成伤害，其对你造成1点伤害`)
				.set("filterTarget", (card, player, target) => {
					const trigger = get.event().getTrigger();
					return trigger.targets?.includes(target);
				})
				.set("ai", target => {
					const { player, num } = get.event();
					let eff = 0;
					if (num <= 0 || player.hp <= 1) {
						eff += get.damageEffect(player, target, player);
					}
					if (num > 0) {
						eff += get.damageEffect(target, player, player);
					}
					return eff;
				})
				.set("numx", num)
				.forResult();
			event.result.cost_data = Math.max(0, num);
		},
		async content(event, trigger, player) {
			const map = trigger.getParent().customArgs,
				{
					targets: [target],
					cost_data: num,
				} = event,
				id = target.playerid;
			map[id] ??= {};
			if (typeof map[id].extraDamage !== "number") {
				map[id].extraDamage = 0;
			}
			map[id].extraDamage += num;
			player
				.when("useCardAfter")
				.filter(evt => evt == trigger.getParent())
				.step(async (event, trigger, player) => {
					if (
						game.hasPlayer(current => {
							return current.hasHistory("damage", evt => evt.card == trigger.card);
						})
					) {
						return;
					}
					if (target.isIn() && player?.isIn()) {
						target.line(player);
						await player.damage(target);
					}
				});
		},
		locked: false,
		mod: {
			aiOrder(player, card, num) {
				if (get.is.damageCard(card) && !player.hasHistory("useCard", evt => get.is.damageCard(evt.card))) {
					return num + 15;
				}
			},
		},
	}
```

### starcuxia 名字:促狭
描述: 锁定技，体力值大于你或本轮对你造成过伤害的其他角色对你使用牌时，其随机弃置一张手牌，若所有条件同时满足，则你摸一张牌。
```js
starcuxia: {
		audio: 2,
		trigger: { global: "useCard" },
		filter(event, player) {
			if (event.player === player || !event.targets?.includes(player)) {
				return false;
			}
			return (
				event.player.getHp() > player.getHp() ||
				event.player.getRoundHistory("sourceDamage", evt => {
					return player == evt.player;
				}).length > 0
			);
		},
		forced: true,
		logTarget: "player",
		async content(event, trigger, player) {
			await trigger.player.randomDiscard("h");
			if (
				trigger.player.getHp() > player.getHp() &&
				trigger.player.getRoundHistory("sourceDamage", evt => {
					return player == evt.player;
				}).length > 0
			) {
				await player.draw();
			}
		},
	}
```

## star_dingfeng 名字:星丁奉 势力:wu

### stardangchen 名字:荡尘
描述: 出牌阶段开始时，你可以令一名角色交给你任意张牌，然后你可以弃置X张牌（X为其交给你的牌数）。若你因此弃牌，则当你于本阶段使用【杀】或普通锦囊牌指定其为目标后，可以进行一次判定，若判定的点数为X的倍数，则此牌额外结算一次。
```js
stardangchen: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return player != target && target.countCards("he");
				})
				.set("ai", target => {
					const player = get.player();
					return -get.attitude(player, target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			let result = await target
				.chooseToGive(player, "he", true, [1, Infinity], "allowChooseAll")
				.set("ai", card => {
					const { player, target } = get.event();
					const att = get.attitude(player, target);
					if (att <= 0) {
						if (ui.selected.cards.length > 1) {
							return 0;
						}
						return 6 - get.value(card);
					}
					if (ui.selected.cards.length) {
						return 0;
					}
					return 7 - get.value(card);
				})
				.forResult();
			if (result?.bool && result.cards?.length) {
				const num = result.cards.length;
				const next = player.chooseToDiscard("he", num);
				next.set("prompt", "荡尘：是否弃置" + get.cnNumber(num) + "张牌并获得后续效果？");
				next.set("prompt2", `当你于本回合使用【杀】或普通锦囊牌指定${get.translation(target)}为目标后，可以进行一次判定，若判定的点数为` + num + "的倍数，则此牌额外结算一次");
				next.set("ai", card => {
					const { isDiscard } = get.event();
					if (isDiscard) {
						if (get.tag("draw", card)) {
							return -5;
						} else if (player.getUseValue(card, true, true) > 0) {
							return get.type(card) == "basic" ? 1 : 0.5;
						}
						return 8 - get.value(card);
					}
					return 0;
				});
				next.set(
					"isDiscard",
					(function () {
						const hs = player.getDiscardableCards(player, "h");
						const basic = hs.filter(card => get.type(card) == "basic" && player.getUseValue(card, true, true) > 0);
						if (!basic.length) {
							return false;
						}
						return hs.length - basic.length >= num - 1;
					})()
				);
				result = await next.forResult();
				if (!result?.bool || !result.cards?.length) {
					return;
				}
				player.addTempSkill("stardangchen_buff", { player: "phaseUseEnd" });
				player.setStorage("stardangchen_buff", [num, target], true);
			}
		},
		subSkill: {
			buff: {
				charlotte: true,
				onremove: true,
				audio: "stardangchen",
				trigger: { player: "useCardToPlayered" },
				filter(event, player) {
					const [num, target] = player.getStorage("stardangchen_buff");
					if (event.card.name != "sha" && get.type(event.card) != "trick") {
						return false;
					}
					if (typeof num != "number" || !target?.isIn() || event.target != target) {
						return false;
					}
					return true;
				},
				check(event, player) {
					return get.effect(event.target, event.card, player, player) > 0;
				},
				prompt2(event, player) {
					const [num, target] = player.getStorage("stardangchen_buff");
					return "进行一次判定，若判定结果为" + num + "的倍数，则" + get.translation(event.card) + "额外结算一次";
				},
				async content(event, trigger, player) {
					const [num, target] = player.getStorage("stardangchen_buff");
					const result = await player
						.judge(card => {
							const number = get.number(card);
							return 10 * (0.5 - (number % get.event().num !== 0));
						})
						.set("judge2", result => Boolean(result.bool))
						.set("num", num)
						.forResult();
					const { number } = result;
					if (number % num === 0) {
						trigger.getParent().effectCount++;
						game.log(trigger.card, "额外结算一次");
					}
				},
				intro: {
					content([num, target], player) {
						return `使用【杀】或普通锦囊牌指定${get.translation(target)}可以进行一次判定，若判定的点数为${num}的倍数，则此牌额外结算一次`;
					},
				},
			},
		},
	}
```

### starjianyu 名字:翦羽
描述: 锁定技，其他角色在你回合内失去装备区的牌后，你摸一张牌。
```js
starjianyu: {
		audio: 2,
		trigger: { global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"] },
		getIndex(event, player) {
			if (_status.currentPhase !== player) {
				return false;
			}
			return game.filterPlayer2(target => target !== player && event.getl?.(target)?.es?.length);
		},
		filterTarget: (event, player, name, target) => target,
		logTarget: (event, player, name, target) => target,
		forced: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	}
```

## star_fazheng 名字:星法正 势力:shu

### starzhiji 名字:知机
描述: 准备阶段，你可以弃置任意张手牌并将手牌数摸至五张，然后若你弃置的牌数与你摸的牌数之差X：大于0，你可以对至多X名其他角色各造成1点伤害；等于0，你本回合使用牌无法被响应；小于0，你本回合手牌上限+2。
```js
starzhiji: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			const next = player.chooseToDiscard(get.prompt2(event.skill), [0, Infinity], "allowChooseAll").set("logSkill", "starzhiji");
			if (_status.auto || !(player === game.me || player.isOnline())) {
				next.complexCard = true;
				next.ai = function (card) {
					const player = get.player();
					switch (get.sgn(player.countCards("h") - 5)) {
						case 1: {
							const num = game.countPlayer(target => target !== player && get.damageEffect(target, player, player) > 0);
							if (ui.selected.cards.length < num) {
								return 8 - get.value(card);
							}
							return 0;
						}
						default:
							return lib.skill.zhiheng.check(card) + (5 - player.countCards("h")) * get.effect(player, { name: "draw" }, player, player);
					}
				};
			}
			event.result = await next.forResult();
		},
		popup: false,
		async content(event, trigger, player) {
			const discardedCards = event.cards || [];
			const num = discardedCards.length - ((await player.drawTo(5).forResult()).cards || []).length;
			switch (get.sgn(num)) {
				case 1: {
					const result = await player
						.chooseTarget("是否对至多" + num + "名其他角色各造成1点伤害？", lib.filter.notMe, [1, num])
						.set("ai", target => {
							const player = get.player();
							return get.damageEffect(target, player, player);
						})
						.forResult();
					if (result.bool) {
						const targets = result.targets.sortBySeat();
						player.line(targets);
						for (const i of targets) {
							await i.damage();
						}
					}
					break;
				}
				case 0:
					player.addTempSkill("starzhiji_fuqi");
					break;
				case -1:
					player.addTempSkill("starzhiji_hand");
					player.addMark("starzhiji_hand", 2, false);
					break;
			}
		},
		subSkill: {
			fuqi: {
				charlotte: true,
				audio: "starzhiji",
				trigger: { player: "useCard" },
				forced: true,
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.players);
					game.log(trigger.cards, "不可被响应");
				},
				ai: { directHit_ai: true },
				mark: true,
				intro: { content: "使用牌不可被响应" },
			},
			hand: {
				charlotte: true,
				onremove: true,
				mod: { maxHandcard: (player, num) => num + player.countMark("starzhiji_hand") },
				intro: { content: "手牌上限+#" },
			},
		},
	}
```

### staranji 名字:谙计
描述: 锁定技，一名角色使用牌时，若此花色的牌本轮游戏使用的唯一最少，则你摸一张牌。
```js
staranji: {
		getUsed(player) {
			let history = game.getRoundHistory("useCard"),
				suits = lib.suit.slice();
			const map = history.reduce((map, evt) => {
				const suit = get.suit(evt.card);
				if (!map[suit]) {
					map[suit] = 1;
					suits.add(suit);
				} else {
					map[suit]++;
				}
				return map;
			}, {});
			return [map, suits];
		},
		audio: 2,
		trigger: { global: "useCard" },
		filter(event, player) {
			const [map, suits] = get.info("staranji").getUsed(player),
				min = Math.min(...suits.slice().map(suit => map[suit] || 0));
			return map[get.suit(event.card)] === min;
		},
		forced: true,
		logTarget: "player",
		async content(event, trigger, player) {
			await player.draw();
		},
		init(player, skill) {
			const [map] = get.info(skill).getUsed(player);
			if (Object.keys(map).length) {
				player.storage[skill] = map;
				player.markSkill(skill);
			}
		},
		onremove: true,
		intro: {
			content(storage = {}, player) {
				if (!storage) {
					return "当前暂无记录";
				}
				let str = "本轮游戏所有角色使用牌的花色情况：<br>";
				const list = lib.suit.slice();
				const entries = Object.entries(storage).sort((a, b) => list.indexOf(a[0]) - list.indexOf(b[0]));
				for (const entry of entries) {
					str += "<li>" + get.translation(entry[0]) + "：" + entry[1];
				}
				return str;
			},
		},
		ai: { threaten: 2 },
		group: "staranji_count",
		subSkill: {
			count: {
				charlotte: true,
				trigger: { global: ["useCard1", "roundStart"] },
				filter(event, player, name) {
					return name == "useCard1" || Object.keys(player.storage.staranji || {}).length;
				},
				firstDo: true,
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					if (event.triggername == "roundStart") {
						delete player.storage.staranji;
						player.unmarkSkill("staranji");
					} else {
						const key = get.suit(trigger.card);
						player.storage.staranji ??= {};
						player.storage.staranji[key] ??= 0;
						player.storage.staranji[key]++;
						player.markSkill("staranji");
					}
				},
			},
		},
	}
```

## matie 名字:马铁 势力:qun

### twodcspzhuiji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcquxian 名字:驱险
描述: 回合开始与结束时，你可以从牌堆获得一张【杀】并选择一名其他角色，攻击范围内包含其的角色可以依次对其使用一张【杀】，每有一名角色使用【杀】你便在所有【杀】结算后摸一张牌。若其未以此法受到伤害，这些角色中未使用【杀】的角色失去X点体力（X为这些角色中使用【杀】的角色数）。
```js
dcquxian: {
		audio: 2,
		trigger: { player: ["phaseBegin", "phaseEnd"] },
		async content(event, trigger, player) {
			const card = get.cardPile2("sha");
			if (card) {
				await player.gain(card, "gain2");
			}
			const next = player.chooseTarget(true, "驱险：选择一名其他角色，攻击范围内包含其的角色可以对其使用【杀】", lib.filter.notMe).set("ai", target => {
				const player = get.player();
				return -get.attitude(player, target);
			});
			next.set(
				"targetprompt2",
				next.targetprompt2.concat([
					target => {
						if (!target.isIn() || !target.classList.contains("selectable")) {
							return;
						}
						return `驱险${game.countPlayer(current => target.inRangeOf(current))}`;
					},
				])
			);
			const result = await next.forResult();
			if (result?.targets?.length) {
				const target = result.targets[0];
				player.line(target);
				const targets = game.filterPlayer(current => current.inRange(target)).sortBySeat();
				if (!targets.length) {
					return;
				}
				let num = 0;
				const sha = [],
					nosha = [];
				while (targets.length) {
					const current = targets.shift();
					const { bool } = await current
						.chooseToUse(
							function (card, player, event) {
								if (get.name(card) != "sha") {
									return false;
								}
								return lib.filter.filterCard.apply(this, arguments);
							},
							"驱险：是否对" + get.translation(target) + "使用一张杀？"
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
						.set("sourcex", target)
						.set("addCount", false)
						.forResult();
					if (bool) {
						sha.push(current);
						num++;
					} else {
						nosha.push(current);
					}
				}
				if (num > 0) {
					await player.draw({ num });
				}
				if (!target.hasHistory("damage", evt => evt.getParent().type == "card" && evt.getParent(4) == event) && sha.length && nosha.length) {
					player.line(nosha, "green");
					await game.doAsyncInOrder(nosha, async (targetx, i) => targetx.loseHp(sha.length));
				}
			}
		},
	}
```

## hansong 名字:韩嵩 势力:qun

### dcyinbi 名字:隐避
描述: 锁定技。①你的手牌上限与场上手牌上限最多的角色相同。②若没有其他角色的手牌数与你相等，则你使用牌无距离和次数限制。
```js
dcyinbi: {
		audio: 2,
		mod: {
			targetInRange(card, player) {
				if (!game.hasPlayer(current => current != player && current.countCards("h") == player.countCards("h"))) {
					return true;
				}
			},
			cardUsable(card, player) {
				if (!game.hasPlayer(current => current != player && current.countCards("h") == player.countCards("h"))) {
					return Infinity;
				}
			},
			maxHandcardBase(player) {
				if (_status.dcyinbi) {
					return;
				}
				_status.dcyinbi = true;
				const num = Math.max(...game.filterPlayer().map(target => target.getHandcardLimit()));
				delete _status.dcyinbi;
				return num;
			},
		},
	}
```

### dcshuaiyan 名字:率言
描述: ①其他角色的摸牌阶段或弃牌阶段结束时，若手牌数与你相等，你可以弃置其一张牌或摸一张牌。②你的摸牌阶段或弃牌阶段结束时，可以摸X张牌（X为手牌数与你相同的角色数）。
```js
dcshuaiyan: {
		audio: 2,
		trigger: {
			global: ["phaseDrawEnd", "phaseDiscardEnd"],
		},
		filter(event, player) {
			const num = player.countCards("h");
			if (event.player == player) {
				return game.hasPlayer(current => {
					return current.countCards("h") == num;
				});
			}
			return event.player.countCards("h") == num;
		},
		async cost(event, trigger, player) {
			const num = player.countCards("h");
			if (trigger.player == player) {
				const count = game.countPlayer(current => {
					return current.countCards("h") == num;
				});
				event.result = await player.chooseBool(get.prompt(event.skill), `摸${get.cnNumber(count)}张牌`).forResult();
			} else {
				event.result = await player.chooseBool(get.prompt(event.skill, trigger.player), "弃置其一张牌或摸一张牌").forResult();
				event.result.targets = [trigger.player];
			}
		},
		async content(event, trigger, player) {
			if (trigger.player == player) {
				const num = player.countCards("h");
				const count = game.countPlayer(current => {
					return current.countCards("h") == num;
				});
				await player.draw(count);
				return;
			}
			const target = event.targets[0],
				goon = target.countDiscardableCards(player, "he");
			let result;
			if (goon) {
				result = await player
					.discardPlayerCard(target, "he", "弃置其一张牌，否则摸一张牌")
					.set("ai", button => {
						const { player, target } = get.event();
						if (get.effect(target, { name: "guohe_copy2" }, player, player) > 0) {
							return get.buttonValue(button);
						}
						return 0;
					})
					.set("target", target)
					.forResult();
			} else {
				result = { bool: false };
			}
			if (!result?.bool) {
				await player.draw();
			}
		},
	}
```

## chezhou 名字:车胄 势力:wei

### dcshefu 名字:慑伏
描述: 锁定技。你对其他角色/其他角色对你使用牌的伤害基数改为X（X为此牌对应的所有实体牌最近一次被伤害来源获得后至现在经过的轮次数之和且至多为5）。
```js
dcshefu: {
		audio: 2,
		trigger: {
			global: "damageBefore",
		},
		init(player, skill) {
			player.addSkill(skill + "_mark");
		},
		onremove(player, skill) {
			player.removeSkill(skill + "_mark");
		},
		filter(event, player) {
			if (!event.source || event.source == event.player || ![event.source, event.player].includes(player)) {
				return false;
			}
			const evt = event.getParent(2);
			return evt && evt.name == "useCard";
		},
		forced: true,
		logTarget(event, player) {
			return event.source == player ? event.player : event.source;
		},
		async content(event, trigger, player) {
			if (!trigger.cards?.length) {
				trigger.cancel();
				return;
			}
			const evt = trigger.getParent(2);
			const cards = evt.cards.filter(card => {
				if (trigger.source._start_cards?.includes(card)) {
					return true;
				}
				return trigger.source.getAllHistory("gain", evt => {
					return evt.cards.includes(card);
				}).length;
			});
			trigger.num = Math.min(
				5,
				cards.length +
					cards.reduce((sum, card) => {
						let num = 0,
							history = trigger.source.actionHistory;
						for (let i = history.length - 1; i >= 0; i--) {
							if (history[i].gain.some(evtx => evtx.cards.includes(card))) {
								break;
							}
							if (history[i].isRound) {
								num++;
							}
							if (i == 0 && trigger.source._start_cards?.includes(card)) {
								num--;
							}
						}
						return sum + num;
					}, 0)
			);
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (target == player || !get.tag(card, "damage")) {
						return;
					}
					//临时补丁，等有缘人重写卡牌ai吧
					if (card.name?.endsWith("damage") && lib.card[_status.event?.name]) {
						if (!(_status.event?.cards || []).length) {
							return "zerotarget";
						}
					} else {
						if (!(card.cards || []).length) {
							return "zerotarget";
						}
					}
				},
				player() {
					return lib.skill.dcshefu.ai.effect.target.apply(this, arguments);
				},
			},
		},
		subSkill: {
			mark: {
				charlotte: true,
				silent: true,
				popup: false,
				firstDo: true,
				init(player, skill) {
					const cards = player.getCards("h");
					get.info(skill).onremove(player, skill);
					if (cards.length) {
						for (const card of cards) {
							let num = 1,
								history = player.actionHistory;
							for (let i = history.length - 1; i >= 0; i--) {
								if (history[i].gain.some(evtx => evtx.cards.includes(card))) {
									break;
								}
								if (history[i].isRound) {
									num++;
								}
								if (i == 0 && player._start_cards?.includes(card)) {
									num--;
								}
							}
							num = Math.min(5, num);
							game.broadcastAll(card => {
								card.addGaintag(skill + num);
							}, card);
						}
					}
				},
				onremove(player, skill) {
					for (let i = 1; i < 6; i++) {
						player.removeGaintag(skill + i);
					}
				},
				trigger: {
					player: "gainAfter",
					global: ["loseAsyncAfter", "roundStart"],
				},
				filter(event, player, name) {
					return name == "roundStart" || event.getg?.(player)?.length;
				},
				async content(event, trigger, player) {
					get.info(event.name).init(player, event.name);
				},
			},
		},
	}
```

### dcpigua 名字:披挂
描述: 当你对一名其他角色造成超过1点伤害后，你可以获得其至多等同于游戏轮次的牌，这些牌本回合不计入你的手牌上限。
```js
dcpigua: {
		audio: 2,
		trigger: { source: "damageSource" },
		filter(event, player) {
			if (event.player == player) {
				return false;
			}
			return event.num > 1 && event.player.isIn() && event.player.countCards("he") && game.roundNumber > 0;
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			let result = await player.gainPlayerCard(target, "he", [1, game.roundNumber]).set("prompt", get.prompt2(event.skill, target)).set("logSkill", [event.skill, target]).forResult();
			result.bool = Boolean((result.cards || []).length);
			event.result = result;
		},
		popup: false,
		async content(event, trigger, player) {
			player.addTempSkill("dcpigua_effect");
			player.addGaintag(event.cards, "dcpigua_effect");
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove(player, skill) {
					player.removeGaintag(skill);
				},
				mod: {
					ignoredHandcard(card) {
						if (card.hasGaintag("dcpigua_effect")) {
							return true;
						}
					},
					cardDiscardable(card, _, name) {
						if (name == "phaseDiscard" && card.hasGaintag("dcpigua_effect")) {
							return false;
						}
					},
				},
			},
		},
	}
```

## star_xunyu 名字:星荀彧 势力:wei

### staranshu 名字:安庶
描述: ①每轮结束时，你可将弃牌堆中不同牌名的基本牌各一张置于牌堆顶，然后视为使用一张【五谷丰登】（从你或一名已受伤角色开始结算）；②一名角色的回合结束时，若有角色本回合失去了上轮因〖安庶〗①获得的牌，你可令其将手牌摸至体力上限（至多摸五张）。
```js
staranshu: {
		audio: 2,
		trigger: { global: "roundEnd" },
		filter(event, player) {
			return get.discardPile(card => get.type(card) == "basic");
		},
		prompt2: "将弃牌堆中不同牌名的基本牌各一张置于牌堆顶，然后视为使用一张【五谷丰登】（从你或一名已受伤角色开始结算）",
		async content(event, trigger, player) {
			game.players.forEach(current => current.addTempSkill("staranshu_remove", "roundEnd"));
			const cardx = Array.from(ui.discardPile.childNodes)
				.filter(card => get.type(card) == "basic")
				.randomSort();
			const cards = [];
			for (const card of cardx) {
				if (!cards.some(c => c.name == card.name)) {
					cards.push(card);
				}
			}
			if (!cards.length) return;
			await game.cardsGotoPile(cards, "insert");
			const targets = game.filterPlayer(current => current == player || current.isDamaged());
			let target = player;
			if (targets.length > 1) {
				const result = await player
					.chooseTarget("请选择【五谷丰登】的起点", true, function (card, player, target) {
						return get.event().targets.includes(target);
					})
					.set("targets", targets)
					.set("ai", target => {
						return get.attitude(get.player(), target);
					})
					.forResult();
				if (result?.bool && result.targets?.length) {
					target = result.targets[0];
				}
			}
			player
				.when({ global: "useCardToTargeted" })
				.filter(evt => evt.card?.anshu && evt?.targets?.length == evt.getParent()?.triggeredTargets4?.length)
				.step(async (event, trigger, player) => {
					delete trigger.card.anshu;
					trigger.getParent().targets = trigger.getParent().targets.sortBySeat(target);
					trigger.getParent().triggeredTargets4 = trigger.getParent().triggeredTargets4.sortBySeat(target);
				});
			await player.chooseUseTarget({ name: "wugu", isCard: true, anshu: true }, true);
		},
		group: "staranshu_draw",
		subSkill: {
			draw: {
				audio: "staranshu",
				trigger: { global: "phaseEnd" },
				getIndex(event, player) {
					return game
						.filterPlayer(current => {
							return current.hasHistory("lose", evt => {
								for (var i in evt.gaintag_map) {
									if (evt.gaintag_map[i].includes("staranshu")) {
										return true;
									}
								}
								return false;
							});
						})
						.sortBySeat();
				},
				filter(event, player, name, target) {
					return target.countCards("h") < target.maxHp;
				},
				logTarget(event, player, name, target) {
					return target;
				},
				check(event, player, name, target) {
					return get.attitude(player, target) > 0;
				},
				prompt2: "令其将手牌摸至体力上限（至多摸五张）",
				async content(event, trigger, player) {
					const target = event.targets[0];
					const num = Math.min(5, target.maxHp - target.countCards("h"));
					if (num > 0) {
						await target.draw(num);
					}
				},
			},
			remove: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("staranshu");
				},
				trigger: { player: "gainAfter" },
				filter(event, player) {
					return event.getParent("staranshu", true) && event.getParent("wugu", true);
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.addGaintag(trigger.cards, "staranshu");
				},
			},
		},
	}
```

### starkuangzuo 名字:匡祚
描述: 限定技，出牌阶段，你可以令一名角色A获得〖承奉〗（若其为主公且没有主公技，其额外获得〖统荫〗），然后令另一名角色B将每种花色的牌各一张置于A武将牌上，称为“匡祚”。
```js
starkuangzuo: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "water",
		filterTarget: true,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const target = event.target;
			const list = ["starchengfeng"];
			if (
				target.isZhu2() &&
				!target.getSkills(null, false, false).filter(skill => {
					var info = get.info(skill);
					if (!info || info.charlotte || !info.zhuSkill || get.skillInfoTranslation(skill, player).length == 0) {
						return false;
					}
					return true;
				}).length
			) {
				list.push("startongyin");
			}
			await target.addSkills(list);
			const targets = game.filterPlayer(current => current != target && current.countCards("he"));
			let targetx;
			if (!targets.length) {
				return;
			} else if (targets.length == 1) {
				targetx = targets[0];
			} else {
				const result = await player
					.chooseTarget(`令另一名角色将牌置于${get.translation(target)}武将牌上`, true, function (card, player, target) {
						return target != get.event().gainer && target.countCards("he");
					})
					.set("gainer", target)
					.set("ai", target => {
						return -get.attitude(get.player(), target) * target.countCards("he");
					})
					.forResult();
				if (result?.targets?.length) {
					targetx = result.targets[0];
				} else {
					return;
				}
			}
			let suits = [];
			for (let card of targetx.getCards("he")) {
				suits.add(get.suit(card));
			}
			const result = await targetx
				.chooseCard("he", true, suits.length)
				.set("complexCard", true)
				.set("filterCard", card => {
					return ui.selected.cards.every(cardx => get.suit(cardx) != get.suit(card));
				})
				.forResult();
			if (result?.cards?.length) {
				const next = target.addToExpansion(result.cards, targetx, "give");
				next.gaintag.add("starchengfeng");
				await next;
			}
		},
		ai: {
			order: 10,
			result: {
				target: 1,
			},
		},
		derivation: ["starchengfeng", "startongyin"],
	}
```

## star_zhangzhao 名字:星张昭 势力:wu

### starzhongyan 名字:忠言
描述: 出牌阶段限一次，你可展示牌堆顶三张牌，然后令一名角色将一张手牌与其中一张牌交换。然后若这些牌颜色相同，其回复1点体力或获得场上一张牌。然后若该角色不为你，你执行其未执行的一项。
```js
starzhongyan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => get.info("starzhongyan").filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target.countCards("h");
		},
		async content(event, trigger, player) {
			const target = event.targets[0],
				topCards = get.cards(3);
			await game.cardsGotoOrdering(topCards);
			await player.showCards(topCards, get.translation(player) + "发动了【忠言】");
			if (!target.countCards("h")) {
				return;
			}
			const result = await target
				.chooseToMove("忠言：交换其中一张牌", true)
				.set("list", [
					["牌堆顶", topCards],
					["你的手牌", target.getCards("h")],
				])
				.set("filterMove", (from, to, moved) => {
					if (typeof to == "number") {
						return false;
					}
					var player = _status.event.player;
					var hs = player.getCards("h");
					var changed = hs.filter(function (card) {
						return !moved[1].includes(card);
					});
					var changed2 = moved[1].filter(function (card) {
						return !hs.includes(card);
					});
					var pos1 = moved[0].includes(from.link) ? 0 : 1,
						pos2 = moved[0].includes(to.link) ? 0 : 1;
					if (pos1 == pos2) {
						return false;
					}
					if (changed.length < 1) {
						return true;
					}
					if (pos1 == 0) {
						if (changed.includes(from.link)) {
							return true;
						}
						return changed2.includes(to.link);
					}
					if (changed2.includes(from.link)) {
						return true;
					}
					return changed.includes(to.link);
				})
				.set("filterOk", moved => {
					return moved[0].filter(card => get.owner(card)).length == 1;
				})
				.set("processAI", function (list) {
					var cards1 = list[0][1].slice(),
						cards2 = list[1][1].slice();
					var card1 = cards1.slice().sort((a, b) => get.value(b) - get.value(a))[0];
					var card2 = cards2.slice().sort((a, b) => get.value(a) - get.value(b))[0];
					if (card1 && card2) {
						var index1 = cards1.indexOf(card1),
							index2 = cards2.indexOf(card2);
						cards1[index1] = card2;
						cards2[index2] = card1;
					}
					return [cards1, cards2];
				})
				.forResult();
			if (result.bool) {
				const lose = result.moved[0].slice();
				const gain = result.moved[1].slice().filter(i => !get.owner(i));
				if (lose.some(i => get.owner(i))) {
					await target.lose(
						lose.filter(i => get.owner(i)),
						ui.special
					);
				}
				await game.cardsGotoPile(lose.slice().reverse(), "insert");
				game.updateRoundNumber();
				if (gain.length) {
					await target.gain(gain, "draw");
				}
				if (lose.map(card => get.color(card)).toUniqued().length == 1) {
					const chosen = [],
						list = player != target ? [target, player] : [target];
					for (const current of list) {
						const goon = game.hasPlayer(i => i.countGainableCards(current, "ej"));
						const choices = [];
						const choiceList = ["回复1点体力", "获得场上一张牌"];
						if (current.isDamaged() && !chosen.includes("选项一")) {
							choices.push("选项一");
						} else {
							choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
						}
						if (goon && !chosen.includes("选项二")) {
							choices.push("选项二");
						} else {
							choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
						}
						if (!choices.length) {
							continue;
						}
						const control =
							choices.length == 1
								? choices[0]
								: (
										await current
											.chooseControl(choices)
											.set("choiceList", choiceList)
											.set("prompt", "忠言：请选择一项")
											.set("ai", () => {
												const player = get.player();
												const eff2 = get.recoverEffect(player, player, player);
												return eff2 ? 0 : 1;
											})
											.forResult()
									).control;
						chosen.push(control);
						if (control == "选项一") {
							await current.recover();
						} else {
							const { targets } = await current
								.chooseTarget("获得一名角色场上的一张牌", true, (card, player, target) => {
									const targetx = get.event().targetx;
									return target.countGainableCards(targetx, "ej") > 0;
								})
								.set("ai", target => {
									const player = get.player();
									let att = get.attitude(player, target);
									if (att < 0) {
										att = -Math.sqrt(-att);
									} else {
										att = Math.sqrt(att);
									}
									return att * lib.card.shunshou.ai.result.target(player, target);
								})
								.set("targetx", current)
								.forResult();
							await current.gainPlayerCard(targets[0], "ej", true);
						}
					}
				}
			} else {
				await game.cardsGotoPile(topCards.slice().reverse(), "insert");
				game.updateRoundNumber();
			}
		},
		ai: {
			order: 8,
			result: {
				player: 1,
				target: 1,
			},
		},
	}
```

### starjinglun 名字:经纶
描述: 每回合限一次，当你距离1以内的角色造成伤害后，你可以令其摸X张牌并对其发动〖忠言〗（X为其装备区的牌数）。
```js
starjinglun: {
		audio: 2,
		trigger: {
			global: "damageSource",
		},
		filter(event, player) {
			const target = event.source;
			return target && target.isIn() && get.distance(player, target) <= 1;
		},
		check(event, player) {
			return get.attitude(player, event.source) > 0;
		},
		usable: 1,
		logTarget: "source",
		async content(event, trigger, player) {
			const target = trigger.source,
				num = target.countCards("e");
			if (num) {
				await target.draw(num);
			}
			await player.useSkill("starzhongyan", [target]);
		},
		derivation: "starzhongyan",
	}
```

## star_sunjian 名字:星孙坚 势力:qun

### starruijun 名字:锐军
描述: 当你于出牌阶段首次使用牌指定其他角色为目标后，你可以选择其中一名目标角色并摸X张牌（X为你已损失的体力值+1）。直到此阶段结束，除其外的其他角色均不在你的攻击范围内，你对其使用牌无距离限制，且当你对其造成非首次伤害时，此伤害值改为Y（Y为你此阶段上次对其造成的伤害值+1，至多为5）。
```js
starruijun: {
		audio: 2,
		mod: {
			aiOrder(player, card, num) {
				if (num <= 0 || !player.isPhaseUsing()) {
					return num;
				}
				if (get.tag(card, "recover")) {
					if (player.needsToDiscard()) {
						return num / 3;
					}
					return 0;
				}
				if (player.hasSkill("starruijun_effect")) {
					return num;
				}
				const info = get.info(card);
				if (info?.toself) {
					return num;
				}
				if (
					game.hasPlayer(cur => {
						return (
							player.canUse(card, cur, true, true) &&
							get.attitude(player, cur) < 0 &&
							get.effect(cur, card, player, player) > 0 &&
							get.damageEffect(cur, player, player) > 0 &&
							!cur.hasSkillTag("filterDamage", null, {
								player,
								card,
							})
						);
					})
				) {
					return num + 2;
				}
				return num / 10;
			},
		},
		trigger: {
			player: "useCardToPlayered",
		},
		filter(event, player) {
			if (
				!player.isPhaseUsing() ||
				player.hasHistory("useCard", evt => {
					if (evt === event.getParent()) {
						return false;
					}
					const targets = evt.targets;
					return evt.isPhaseUsing() && targets.some(target => target !== player);
				})
			) {
				return false;
			}
			return event.isFirstTarget && (event.targets || []).some(target => target !== player && target.isIn());
		},
		locked: false,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.name.slice(0, -5)), `选择其中一名目标角色，摸${get.cnNumber(player.getDamagedHp() + 1)}张牌，令所有除其外的其他角色不在你的攻击范围内，且你对其造成的伤害逐次增加。`, (card, player, target) => {
					return target != player && get.event().getTrigger().targets.includes(target) && target.isIn();
				})
				.set("ai", target => {
					const player = get.player(),
						original = get.event().original,
						draw = 1 + player.getDamagedHp();
					if (Array.isArray(original)) {
						if (original.includes(target)) {
							return -get.attitude(player, target);
						}
						return 0;
					}
					if (get.attitude(player, target) >= 0) {
						return draw * get.effect(player, { name: "draw" }, player, player) - original;
					}
					let shas = player.getCardUsable("sha"),
						filterDamage = target.hasSkillTag("filterDamage", null, {
							player,
						}),
						idx = filterDamage ? 1 : 0;
					return (
						player.countCards("hs", card => {
							if (get.info(card).toself || !player.canUse(card, target, false, true)) {
								return 0;
							}
							let eff = get.effect(target, card, player, player);
							if (eff <= 0) {
								return 0;
							}
							if (card.name === "sha" && shas-- <= 0) {
								return 0;
							}
							if (!get.tag(card, "damage") || get.type(card, null, player) === "delay") {
								return eff;
							}
							if (!filterDamage && idx < 3) {
								idx += 0.65;
							}
							return eff * idx;
						}) +
						draw * get.effect(player, { name: "draw" }, player, player) -
						original
					);
				})
				.set(
					"original",
					(function () {
						const cards = player.getCards("hs");
						let shas = player.getCardUsable("sha"), //【杀】的剩余使用次数
							damage = trigger.targets
								.filter(tar => {
									//筛选目标中可狙敌人
									return (
										get.attitude(player, tar) < 0 &&
										get.damageEffect(tar, player, player) > 0 &&
										!tar.hasSkillTag("filterDamage", null, {
											player,
										})
									);
								})
								.map(i => [i, 0]),
							eff = 0;
						for (let card of cards) {
							if (card.name === "sha" && shas-- <= 0) {
								continue;
							} //【杀】只能用次数上限张
							if (get.info(card).toself) {
								continue;
							}
							if (get.tag(card, "damage") && get.type(card, null, player) !== "delay") {
								for (let arr of damage) {
									if (player.canUse(card, arr[0], false, true) && get.effect(arr[0], card, player, player) > 0) {
										arr[1]++; //统计每个可狙敌人可以用的伤害牌数
										if (arr[1] > 4) {
											return damage
												.filter(cur => {
													return cur[1] > 3;
												})
												.map(i => i[0]);
										} //针对目标中敌方角色的伤害牌已经足够多，为降低计算开销直接狙他
									}
								}
							}
							let val = player.getUseValue(card, true, true);
							if (val <= 0) {
								continue;
							}
							eff += val; //正常对其他人用牌的总收益
						}
						return eff;
					})()
				)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw(player.getDamagedHp() + 1);
			player.addTempSkill("starruijun_effect", "phaseChange");
			player.markAuto("starruijun_effect", event.targets[0]);
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					if (!target || target === player || player._starruijun_effect_use || !player.isPhaseUsing() || player.countSkill("starruijun")) {
						return;
					}
					player._starruijun_effect_use = true;
					if (
						get.attitude(player, target) < 0 &&
						get.damageEffect(target, player, player) > 0 &&
						!target.hasSkillTag("filterDamage", null, {
							player,
							card,
						})
					) {
						delete player._starruijun_effect_use;
						return [1, 1 + player.getDamagedHp(), 1, -1.8 * player.countCards("hs", i => get.tag(i, "damage") && get.type(i) != "delay")];
					}
					delete player._starruijun_effect_use;
				},
			},
			threaten(player, target) {
				if (target.hp < 3) {
					return 9 / (1 + target.getHp());
				}
				return 1 + 0.3 * target.getDamagedHp();
			},
		},
		subSkill: {
			effect: {
				audio: "starruijun",
				trigger: {
					source: "damageBegin2",
				},
				filter(event, player) {
					if (!player.getStorage("starruijun_effect").includes(event.player)) {
						return false;
					}
					let evt = event.getParent("phaseUse");
					return (
						evt &&
						player.hasHistory("sourceDamage", evt2 => {
							return evt2.source === player && evt2.player === event.player && evt2.getParent("phaseUse") === evt;
						})
					);
				},
				charlotte: true,
				forced: true,
				onremove: true,
				async content(event, trigger, player) {
					let num = 1;
					const evts = player.getHistory("sourceDamage", evt => {
						return evt.source === player && evt.player === trigger.player && evt.getParent("phaseUse") === trigger.getParent("phaseUse");
					});
					if (evts.length) {
						num += evts.lastItem.num;
					}
					trigger.num = Math.min(5, num);
				},
				ai: {
					damageBonus: true,
					skillTagFilter(player, tag, arg) {
						if (tag !== "damageBonus") {
							return false;
						}
						return (
							arg &&
							arg.target &&
							player.hasHistory("sourceDamage", evt => {
								return evt.source === player && evt.player === arg.target && evt.getParent("phaseUse") === _status.event.getParent("phaseUse");
							})
						);
					},
					effect: {
						player(card, player, target) {
							if (!target || !player.getStorage("starruijun_effect").includes(target) || !get.tag(card, "damage")) {
								return;
							}
							return [2.5, 0, 2.5, 0];
						},
					},
				},
				mod: {
					inRange(from, to) {
						if (!from.getStorage("starruijun_effect").includes(to)) {
							return false;
						}
					},
					targetInRange(card, player, target) {
						if (player.getStorage("starruijun_effect").includes(target)) {
							return true;
						}
					},
				},
			},
		},
	}
```

### stargangyi 名字:刚毅
描述: 锁定技。①你的回合内，若你本回合没有造成过伤害，你不能使用【桃】。②当你处于濒死状态时，以你为目标的【桃】或【酒】的回复值+1。
```js
stargangyi: {
		audio: 2,
		trigger: {
			source: "damage",
		},
		silent: true,
		forced: true,
		group: "stargangyi_recover",
		async content(event, trigger, player) {
			player.addTempSkill("stargangyi_access");
		},
		ai: {
			halfneg: true,
		},
		subSkill: {
			recover: {
				audio: "stargangyi",
				trigger: {
					player: "recoverBegin",
				},
				filter(event, player) {
					const evt = event.getParent(3);
					if (!player.isDying() || evt.type !== "dying") {
						return false;
					}
					return ["tao", "jiu"].includes(event.getParent().name);
				},
				forced: true,
				async content(event, trigger, player) {
					trigger.num++;
				},
				ai: {
					effect: {
						target(card, player, target) {
							if (target.hp <= 0 && get.tag(card, "recover")) {
								return 2;
							}
						},
					},
				},
			},
			access: {
				charlotte: true,
			},
		},
		mod: {
			cardEnabled(card, player) {
				if (player.hasSkill("stargangyi_access")) {
					return;
				}
				if (player === _status.currentPhase && card.name === "tao") {
					return false;
				}
			},
			cardSavable(card, player) {
				if (player.hasSkill("stargangyi_access")) {
					return;
				}
				if (player === _status.currentPhase && card.name === "tao") {
					return false;
				}
			},
		},
	}
```

## star_xiahouba 名字:星夏侯霸 势力:shu

### starweigu 名字:维谷
描述: 你使用伤害牌指定唯一目标或成为伤害牌唯一目标时，你可以弃置一张可指定自己为目标（toself为true或牌面目标合法）的牌，然后选择一项：1、移动场上一张牌；2、令你攻击范围内的所有角色也成为此牌目标（不包括此牌使用者）。此牌结算后若牌未造成伤害，你失去1点体力并摸两张牌。
```js
starweigu: {
		audio: 2,
		trigger: {
			player: "useCardToPlayer",
			target: "useCardToTarget",
		},
		filter(event, player) {
			if (!get.is.damageCard(event.card)) {
				return false;
			}
			if (event.targets?.length !== 1) {
				return false;
			}
			if (!player.hasCards("he", card => get.info("starweigu").isSelf(card, player) && lib.filter.cardDiscardable(card, player, "starweigu"))) {
				return false;
			}
			return true;
		},
		async cost(event, trigger, player) {
			let prompt = "弃置一张可指定自己为目标的牌，然后选择一项:";
			if (player.getStorage("starweigu", false)) {
				prompt += "<span class=text center>1、对一名角色造成2点伤害；</span>";
			} else {
				prompt += "<span class=text center>1、移动场上一张牌；</span>";
			}
			prompt += "2、令你攻击范围内的所有角色也成为此牌目标（不包括此牌使用者）。此牌结算后若牌未造成伤害，你失去1点体力并摸两张牌。";
			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt("starweigu"),
					prompt2: prompt,
					filterCard: get.info("starweigu").isSelf,
					position: "he",
					ai(card) {
						return get.value(card);
					},
					chooseonly: true,
				})
				.forResult();
		},
		getTargets(card, player, source) {
			return game.filterPlayer(current => {
				if (player === current || source == current) {
					return false;
				}
				if (!player.inRange(current)) {
					return false;
				}
				return lib.filter.targetEnabled2(card, source, current);
			});
		},
		isSelf(card, player, evt = get.event()) {
			const info = get.info(card);
			if (info.toself) {
				return true;
			}
			return lib.filter.targetEnabled3(card, player, player);
		},
		async content(event, trigger, player) {
			await player.discard({ cards: event.cards });
			const choiceList = [];
			if (!player.getStorage("starweigu", false)) {
				if (player.canMoveCard()) {
					choiceList.push(["move", "移动场上的一张牌"]);
				}
			} else {
				choiceList.push(["damage", "对一名角色造成2点伤害"]);
			}
			const source = trigger.player == player ? player : trigger.player;
			const targets = get.info("starweigu").getTargets(trigger.card, player, source);
			choiceList.push(["addtarget", `令攻击范围内的所有角色（${targets.length ? get.translation(targets) : "滚木"}）成为${get.translation(trigger.card)}的额外目标`]);
			if (choiceList.length) {
				let choice;
				if (choiceList.length == 2) {
					const result = await player
						.chooseButton({
							createDialog: ["选择一项：", [choiceList, "textbutton"]],
							selectButton: 1,
							forced: true,
							ai(button) {
								const player2 = get.player();
								const { card, targets } = get.event();
								if (button.link === "move") {
									return 1;
								} else if (button.link === "damage") {
									for (const current of game.filterPlayer(current => current !== player2)) {
										if (get.damageEffect(current, player2, player2) > 0) {
											return 666;
										}
									}
								} else if (button.link === "addtarget") {
									let num = 0;
									targets.forEach(target => (num += get.effect(target, { name: card.name }, player2, player2)));
									return num;
								}
								return 0;
							},
						})
						.set("choiceList", choiceList)
						.set("targets", targets)
						.set("card", trigger.card)
						.forResult();
					choice = result?.links?.[0];
				} else {
					choice = choiceList[0][0];
				}
				if (choice === "move") {
					await player.moveCard({
						prompt: "移动场上的一张牌",
						forced: true,
					});
				} else if (choice === "damage") {
					const result = await player
						.chooseTarget({
							prompt: "对一名角色造成2点伤害",
							ai(target) {
								return -get.attitude(get.player(), target);
							},
						})
						.forResult();
					if (result.bool && result.targets?.length) {
						await result.targets[0].damage({
							num: 2,
							source: player,
						});
					}
				} else if (choice === "addtarget") {
					trigger.targets.addArray(targets.filter(target => target.isIn()));
				}
			}
			player
				.when({ global: "useCardAfter" })
				.filter(evt => evt.card === trigger.card)
				.then(async (event, trigger, player) => {
					if (!game.hasGlobalHistory("everything", evt => evt.name === "damage" && evt.card === trigger.card)) {
						await player.loseHp();
						await player.draw(2);
					}
				});
		},
	}
```

### starjuefa 名字:绝伐
描述: 限定技，出牌阶段，你可以将“维谷”中“移动场上一张牌”改为“对一名角色造成2点伤害”直到你的下个回合结束。若如此做，当你于此期间通过“维谷”杀死角色后，你将手牌数和体力值调整至体力上限；若于此期间你未杀死过角色，效果结束时你失去所有体力。
```js
starjuefa: {
		//批量改名前记得这里有starweigu
		audio: 2,
		enable: "phaseUse",
		skillAnimation: true,
		limited: true,
		animationColor: "red",
		manualConfirm: true,
		filter(event, player) {
			return !player.getStorage("starweigu", false);
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.addSkill("starjuefa_effect");
		},
		subSkill: {
			effect: {
				audio: "starjuefa",
				charlotte: true,
				forced: true,
				init(player, skill) {
					player.setStorage("starweigu", true);
					player.addSkill("starjuefa_remove");
					player.markAuto("starjuefa_remove", "die");
				},
				trigger: {
					source: "dieAfter",
				},
				async content(event, trigger, player) {
					player.unmarkAuto("starjuefa_remove", "die");
					if (trigger.reason?.getParent("starweigu")) {
						const num1 = player.countCards("h");
						const num2 = player.maxHp;
						const num3 = player.hp;
						if (num1 > num2) {
							await player.chooseToDiscard({
								selectCard: num1 - num2,
							});
						} else if (num1 < num2) {
							await player.drawTo(num2);
						}
						if (num3 != num2) {
							await player.recover({ num: num2 - num3 });
						}
					}
				},
			},
			remove: {
				audio: "starjuefa",
				charlotte: true,
				forced: true,
				trigger: {
					player: "phaseEnd",
				},
				async content(event, trigger, player) {
					if (!player.getStorage("starjuefa_remove").includes("remove")) {
						player.markAuto("starjuefa_remove", "remove");
					} else {
						player.setStorage("starweigu", false);
						player.removeSkill("starjuefa_effect");
						player.removeSkill("starjuefa_remove");
						if (player.getStorage("starjuefa_remove").includes("die")) {
							if (player.hp > 0) {
								await player.loseHp(player.getHp());
							}
						}
					}
				},
			},
		},
	}
```

## liqueguosi 名字:李傕郭汜 势力:qun

### xiongsuan 名字:凶算
描述: 出牌阶段限一次，你可以弃置一张手牌并对一名角色造成1点伤害，然后你摸三张牌。若该角色不为你，你失去1点体力。
```js
xiongsuan: {
		audio: 2,
		enable: "phaseUse",
		filterTarget: true,
		filterCard: lib.filter.cardDiscardable,
		position: "h",
		usable: 1,
		async content(event, trigger, player) {
			const target = event.target;
			await target.damage();
			await player.draw(3);
			if (target != player) {
				await player.loseHp();
			}
		},
		ai: {
			order: 9,
			result: {
				player(player, target) {
					let res = 2 * get.effect(player, { name: "draw" }, player, player);
					if (
						player.hp <= 1 &&
						!player.hasCard(i => {
							let name = get.name(i, player);
							if (name != "tao" && name != "jiu") {
								return false;
							}
							return lib.filter.cardSavable(i, player, player);
						}, "hs")
					) {
						res = -res / 2;
					}
					if (player !== target) {
						res += get.effect(player, { name: "losehp" }, player, player);
					}
					return res;
				},
				target(player, target) {
					return get.damageEffect(target, player, target);
				},
			},
		},
	}
```

## star_zhangchunhua 名字:星张春华 势力:wei

### starliangyan 名字:梁燕
描述: 出牌阶段限一次。你可以选择一名其他角色，你摸/弃置至多两张牌，令其弃置/摸等量的牌。然后若你与其手牌数相同，以此法摸牌的角色跳过其下一个弃牌阶段。
```js
starliangyan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		chooseButton: {
			dialog(event, player) {
				const name = get.translation(event.result.targets[0]);
				const list = ["你摸一张牌，其弃置一张牌", "你弃置一张牌，其摸一张牌", "你摸两张牌，其弃置两张牌", "你弃置两张牌，其摸两张牌"].map((item, i) => [i, item]);
				const dialog = ui.create.dialog(`梁燕：请选择你与${name}要执行的选项`, [list.slice(0, 2), "tdnodes"], [list.slice(2, 4), "tdnodes"], "hidden");
				return dialog;
			},
			filter(button, player) {
				const link = button.link;
				if (link % 2 === 0) {
					return true;
				}
				return player.countDiscardableCards(player, "he") >= (link + 1) / 2;
			},
			check(button) {
				const player = get.player(),
					target = get.event().getParent().result.targets[0];
				const link = button.link;
				if (get.attitude(player, target) <= 0 && link === 2) {
					return 100;
				}
				const ph = player.countCards("h"),
					th = target.countCards("h");
				if (link % 2 === 0) {
					const num = link / 2 + 1;
					if (ph + num === th - num) {
						return 10;
					}
				} else {
					const num = (link + 1) / 2;
					if (ph - num === th + num) {
						return 10;
					}
				}
				return 5;
			},
			backup(links) {
				return {
					audio: "starliangyan",
					target: get.event().result.targets[0],
					link: links[0],
					filterTarget(card, player, target) {
						return target === lib.skill.starliangyan_backup.target;
					},
					selectTarget: -1,
					async content(content, trigger, player) {
						const target = lib.skill.starliangyan_backup.target;
						const link = lib.skill.starliangyan_backup.link;
						const num = link <= 1 ? 1 : 2;
						const fn = ["draw", "chooseToDiscard"];
						if (link % 2 === 1) {
							fn.reverse();
						}
						await player[fn[0]](num, true, "he");
						await target[fn[1]](num, true, "he");
						if (player.countCards("h") === target.countCards("h")) {
							const skipper = [player, target][link % 2];
							skipper.skip("phaseDiscard");
							game.log(skipper, "跳过了下一个", "#y弃牌阶段");
						}
					},
				};
			},
			prompt(links) {
				return "点击“确定”以执行效果";
			},
		},
		subSkill: {
			backup: {},
		},
		ai: {
			order(item, player) {
				if (!game.hasPlayer(current => current !== player && get.attitude(player, current) > 0) && game.hasPlayer(current => get.attitude(player, current) <= 0)) {
					return 10;
				}
				if (
					game.hasPlayer(current => {
						const del = player.countCards("h") - current.countCards("h"),
							toFind = [2, 4].find(num => Math.abs(del) === num);
						if (toFind === 4 && del < 0 && get.attitude(player, current) <= 0) {
							return true;
						}
						return false;
					})
				) {
					return 10;
				}
				return 1;
			},
			result: {
				target(player, target) {
					const del = player.countCards("h") - target.countCards("h"),
						toFind = [2, 4].find(num => Math.abs(del) === num);
					if (toFind) {
						return (-del * (get.attitude(player, target) * Math.min(3, target.countCards("h"))) * toFind) / 10;
					}
					return -1;
				},
			},
		},
	}
```

### starminghui 名字:明慧
描述: 一名角色的回合结束时，若你的手牌数：最少，你可以视为使用一张无距离限制的【杀】；最多，你可以将手牌弃置至你手牌数不为最多，然后令一名角色回复1点体力。
```js
starminghui: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return player.isMinHandcard() || player.isMaxHandcard();
		},
		direct: true,
		async content(event, trigger, player) {
			let logged = false;
			if (player.isMinHandcard()) {
				const card = new lib.element.VCard({
					name: "sha",
					isCard: true,
				});
				const result = await player
					.chooseUseTarget(`###${get.prompt("starminghui")}###视为使用一张无距离限制的【杀】`, card, false, "nodistance")
					.set("logSkill", "starminghui")
					.forResult();
				if (result?.bool) {
					logged = true;
				}
			}
			const num = player.countCards("h");
			if (player.isMaxHandcard() && num > 0) {
				const maxNum = game
					.findPlayer(current => {
						if (current === player) {
							return false;
						}
						return !game.hasPlayer(current2 => {
							if (current2 === player) {
								return false;
							}
							return current2.countCards("h") > current.countCards("h");
						});
					})
					?.countCards("h");
				if (!maxNum || !player.hasDiscardableCards(player, "h")) {
					return;
				}
				const leastDiscardNum = num - maxNum + 1;
				const prompt = logged ? `是否将手牌弃置至不为最多？` : get.prompt("starminghui");
				const next = player
					.chooseToDiscard(prompt, `弃置${get.cnNumber(leastDiscardNum)}张手牌，然后你令一名角色回复1点体力`, "allowChooseAll")
					.set("selectCard", leastDiscardNum)
					.set(
						"goon",
						game.hasPlayer(current => get.recoverEffect(current, get.player(), get.player()))
					)
					.set("ai", card => {
						if (!get.event().goon) {
							return 0;
						}
						if (get.tag(card, "recover")) {
							return 0;
						}
						if (ui.selected.cards.length === get.event().selectCard[0] - 1) {
							return 6.5 - get.value(card);
						}
						return 4 - get.value(card);
					});
				if (!logged) {
					next.set("logSkill", "starminghui");
				}
				const result = await next.forResult();
				if (!result?.bool || !result.cards?.length) {
					return;
				}
				if (!player.isUnderControl(true) && !player.isOnline()) {
					await game.delayx();
				}
				if (game.hasPlayer(current => current.isDamaged())) {
					const result = await player
						.chooseTarget("令一名角色回复1点体力", (card, player, target) => {
							return target.isDamaged();
						})
						.set("ai", target => get.recoverEffect(target, get.player(), get.player()))
						.forResult();
					if (result?.targets?.length) {
						const target = result.targets[0];
						player.line(target, "green");
						await target.recover();
					}
				}
			}
		},
	}
```

## star_yuanshao 名字:星袁绍 势力:qun

### starxiaoyan 名字:硝焰
描述: 锁定技，游戏开始时，你对所有其他角色各造成1点火属性伤害，然后这些角色可依次交给你一张牌并回复1点体力。
```js
starxiaoyan: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: ["enterGame" /*,'logSkill'*/],
		},
		filter(event, player) {
			if (!game.hasPlayer(current => current != player)) {
				return false;
			}
			//if(event.name=='logSkill'&&evt.skill!='starjiaowang') return false;
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		async content(event, trigger, player) {
			let targets = game.filterPlayer(current => current != player).sortBySeat();
			player.line(targets);
			for (const target of targets) {
				await target.damage("fire");
			}
			targets = targets.filter(i => i.isIn());
			if (targets.length) {
				for (const target of targets) {
					if (!target.countCards("he")) {
						continue;
					}
					const { bool } = await target
						.chooseToGive("he", player)
						.set("prompt", "是否交给" + get.translation(player) + "一张牌" + (target.isDamaged() ? "并回复1点体力" : "") + "？")
						.set("ai", card => {
							const target = get.event().player,
								player = get.event().target;
							const att = get.attitude(target, player);
							if (get.recoverEffect(target, target, target) <= 0) {
								if (att <= 0) {
									return -get.value(card);
								}
								return 0;
							}
							return 7 - get.value(card);
						})
						.set("target", player)
						.forResult();
					if (bool) {
						await target.recover();
					}
				}
			}
		},
	}
```

### starzongshi 名字:纵势
描述: 出牌阶段，你可以展示一张可展示目标的基本牌或普通锦囊牌，然后你将手牌中所有与此牌花色相同的其他牌当作此牌使用（无距离限制），且此牌至多指定转化牌数的目标。
```js
starzongshi: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			const cards = player.getCards("h", card => {
				const type = get.type(card, null, player);
				if (type != "basic" && type != "trick") {
					return false;
				}
				return (
					lib.filter.cardUsable(card, player) &&
					game.hasPlayer(target => {
						return lib.filter.targetEnabled2(card, player, target) /*&&lib.filter.targetInRange(card,player,target)*/;
					})
				);
			});
			if (!cards.length) {
				return false;
			}
			return cards.some(card => {
				const cardss = player.getCards("h", cardx => card != cardx && get.suit(card, player) == get.suit(cardx, player));
				return cardss.length && !cardss.some(cardx => !game.checkMod(cardx, player, "unchanged", "cardEnabled2", player));
			});
		},
		filterCard(card, player) {
			if (ui.selected.cards.length) {
				return false;
			}
			const cards = player.getCards("h", card => {
				const type = get.type(card, null, player);
				if (type != "basic" && type != "trick") {
					return false;
				}
				return (
					lib.filter.cardUsable(card, player) &&
					game.hasPlayer(target => {
						return lib.filter.targetEnabled2(card, player, target) /*&&lib.filter.targetInRange(card,player,target)*/;
					})
				);
			});
			if (!cards.includes(card)) {
				return false;
			}
			const cardss = player.getCards("h", cardx => card != cardx && get.suit(card, player) == get.suit(cardx, player));
			return cardss.length && !cardss.some(cardx => !game.checkMod(cardx, player, "unchanged", "cardEnabled2", player));
		},
		selectCard: [1, 2],
		complexCard: true,
		check(card) {
			const player = get.event().player,
				select = get.copy(get.info(card).selectTarget);
			let range;
			if (select == undefined) {
				range = [1, 1];
			} else if (typeof select == "number") {
				range = [select, select];
			} else if (get.itemtype(select) == "select") {
				range = select;
			} else if (typeof select == "function") {
				range = select(card, player);
				if (typeof range == "number") {
					range = [range, range];
				}
			}
			game.checkMod(card, player, range, "selectTarget", player);
			const cards = player.getCards("h", cardx => card != cardx && get.suit(card, player) == get.suit(cardx, player));
			let targets = game.filterPlayer(target => lib.filter.targetEnabled2(card, player, target) /*&&lib.filter.targetInRange(card,player,target)*/ && get.effect(target, card, player, player) > 0);
			const max = range[1],
				max2 = Math.min(cards.length, targets.length);
			if (max > max2) {
				return 0;
			}
			targets = targets.sort((a, b) => get.effect(b, card, player, player) - get.effect(a, card, player, player)).slice(0, max2);
			const sum = targets.reduce((num, target) => num + get.effect(target, card, player, player), 0);
			if (max == -1) {
				if (
					game
						.filterPlayer(target => {
							return lib.filter.targetEnabled2(card, player, target) /*&&lib.filter.targetInRange(card,player,target)*/;
						})
						.reduce((num, target) => num + get.effect(target, card, player, player), 0) > sum
				) {
					return 0;
				}
			}
			return sum;
		},
		position: "h",
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const card = event.cards[0],
				cards = player.getCards("h", cardx => card != cardx && get.suit(card, player) == get.suit(cardx, player));
			await player.showCards([card], get.translation(player) + "发动了【纵势】");
			const cardx = new lib.element.VCard({
				name: get.name(card, player),
				nature: get.nature(card, player),
				cards: cards,
			});
			const { bool, targets } = await player
				.chooseTarget((card, player, target) => {
					//return player.canUse(get.event().cardx,target);
					return lib.filter.targetEnabled2(get.event().cardx, player, target) /*&&lib.filter.targetInRange(get.event().cardx,player,target)*/;
				}, true)
				.set("cardx", cardx)
				.set("selectTarget", [1, cards.length])
				.set("prompt", "请选择" + (game.hasNature(cardx) ? get.translation(get.nature(cardx)) : "") + "【" + get.translation(cardx) + "】（" + get.translation(cards) + "）的目标")
				.set("ai", target => {
					const player = get.event().player,
						card = get.event().cardx;
					return get.effect(target, card, player, player);
				})
				.forResult();
			if (bool) {
				player.useCard(cardx, cards, targets.sortBySeat());
			}
		},
		ai: {
			order: 9,
			result: { player: 1 },
		},
	}
```

### starjiaowang 名字:骄妄
描述: 锁定技，每轮结束时，若本轮没有角色死亡，则你失去1点体力并发动〖硝焰〗。
```js
starjiaowang: {
		audio: 2,
		trigger: { global: "roundEnd" },
		filter(event, player) {
			const history = game.getAllGlobalHistory();
			for (let i = history.length - 1; i >= 0; i--) {
				const evt = history[i]["everything"];
				for (let j = evt.length - 1; j >= 0; j--) {
					if (evt[j].name == "die") {
						return false;
					}
				}
				if (history[i].isRound) {
					break;
				}
			}
			return true;
		},
		forced: true,
		derivation: "starxiaoyan",
		async content(event, trigger, player) {
			await player.loseHp();
			if (game.hasPlayer(current => current != player)) {
				player.useResult({ skill: "starxiaoyan" }, event);
			}
		},
	}
```

### staraoshi 名字:傲势
描述: 主公技，其他群势力角色的出牌阶段限一次，其可以交给你一张手牌，然后你可以发动一次〖纵势〗。
```js
staraoshi: {
		audio: 2,
		zhuSkill: true,
		global: "staraoshi_global",
		derivation: "starzongshi",
		subSkill: {
			global: {
				audio: "staraoshi",
				forceaudio: true,
				enable: "phaseUse",
				filter(event, player) {
					return player.group == "qun" && game.hasPlayer(target => lib.skill.staraoshi.subSkill.global.filterTarget(null, player, target));
				},
				filterTarget(card, player, target) {
					return target != player && target.hasZhuSkill("staraoshi");
				},
				prompt() {
					const player = get.event().player;
					const targets = game.filterPlayer(target => lib.skill.staraoshi.subSkill.global.filterTarget(null, player, target));
					return "交给" + get.translation(targets) + (targets.length > 1 ? "中的一人" : "") + "一张手牌，然后其可以发动一次【纵势】";
				},
				filterCard: true,
				check(card) {
					const player = get.event().player;
					const target = game
						.filterPlayer(target => {
							return lib.skill.staraoshi.subSkill.global.filterTarget(null, player, target);
						})
						.sort((a, b) => b.countCards("h") - a.countCards("h"))[0];
					return target.getUseValue(card);
				},
				discard: false,
				lose: false,
				delay: false,
				usable: 1,
				async content(event, trigger, player) {
					const target = event.target,
						info = get.info("starzongshi");
					await player.give(event.cards, target);
					const { bool, cards } = await target
						.chooseCard(info.position, (card, player) => {
							return get.event().info.filterCard(card, player);
						})
						.set("info", info)
						.set("ai", card => get.event().info.check(card))
						.set("selectCard", [1, 2])
						.set("complexCard", true)
						.set("prompt", get.prompt("starzongshi"))
						.set("prompt2", lib.translate.starzongshi_info.slice(8).slice(0, -1))
						.forResult();
					if (bool) {
						target.useResult({ skill: "starzongshi", cards: cards }, event);
					}
				},
				ai: {
					order: 9,
					result: {
						target(player, target) {
							return target.countCards("h") + 1;
						},
					},
				},
			},
		},
	}
```

## star_dongzhuo 名字:星董卓 势力:qun

### starweilin 名字:威临
描述: 锁定技。当你于回合内对一名角色造成伤害时，若其本回合未受到过伤害，且你本回合使用的牌数大于等于其体力值，则此伤害+1。
```js
starweilin: {
		audio: 2,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			if (_status.currentPhase !== player) {
				return false;
			}
			return !event.player.getHistory("damage").length && player.getHistory("useCard").length >= event.player.getHp();
		},
		forced: true,
		logTarget: "player",
		async content(event, trigger, player) {
			trigger.num++;
		},
	}
```

### starzhangrong 名字:掌戎
描述: 准备阶段，你可以选择令至多X名体力值大于等于你的角色各失去1点体力或令至多X名手牌数大于等于你的角色各弃置一张手牌（X为你的体力值）。若如此做，你摸等同于选择角色数的牌，且本回合结束时，若这些角色中存在本回合未受到过伤害的角色，则你失去1点体力。
```js
starzhangrong: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.getHp() > 0;
		},
		direct: true,
		async content(event, trigger, player) {
			var str = get.cnNumber(player.getHp());
			var choiceList = ["令至多" + str + "名体力值大于等于你的角色各失去1点体力", "令至多" + str + "名手牌数大于等于你的角色各弃置一张手牌"],
				list = ["cancel2"];
			if (
				game.hasPlayer(target => {
					if (target == player) {
						return player.countCards("h", card => lib.filter.cardDiscardable(card, player));
					}
					return target.countCards("h") >= Math.max(1, player.countCards("h"));
				})
			) {
				list.unshift("弃牌");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			list.unshift("扣血");
			var result = await player
				.chooseControl(list)
				.set("prompt", "###" + get.prompt("starzhangrong") + "###选择其中一项令任意名符合条件的角色执行，然后你摸等量的牌，回合结束时，若这些角色中有本回合未受到过伤害的角色，则你失去1点体力")
				.set("ai", () => {
					var player = _status.event.player;
					var controls = _status.event.controls.slice();
					/*
				var cards=player.getCards('hes',card=>get.tag(card,'damage')&&player.hasValueTarget(card));
				var cardx=cards.filter(card=>get.name(card)=='sha');
				cardx.sort((a,b)=>player.getUseValue(b)-player.getUseValue(a));
				cardx=cardx.slice(Math.min(cardx.length,player.getCardUsable('sha')),cardx.length);
				cards.removeArray(cardx);
				*/
					var targets1 = game.filterPlayer(target => get.attitude(player, target) < 0 && target.getHp() >= player.getHp() && get.effect(target, { name: "losehp" }, player, player) > 0 /*&&cards.some(card=>player.canUse(card,target))*/);
					_status.starzhangrong_check = true;
					var targets2 = game.filterPlayer(target => get.attitude(player, target) < 0 && target.countCards("h") >= Math.max(1, player.countCards("h")) && get.effect(target, { name: "guohe_copy2" }, player, player) > 0 /*&&cards.some(card=>player.canUse(card,target))*/);
					delete _status.starzhangrong_check;
					[targets1, targets2].forEach(list => {
						list.sort((a, b) => get.damageEffect(b) - get.damageEffect(a));
						list = list.slice(0, Math.min(player.getHp() /*,cards.length*/));
					});
					if (!controls.includes("弃牌")) {
						return 1 - get.sgn(targets1.length);
					}
					return Math.max(0, get.sgn(targets2.length - targets1.length));
				})
				.set("choiceList", choiceList)
				.forResult();
			if (result.control != "cancel2") {
				var choice = result.index;
				var result2 = await player
					.chooseTarget([1, player.getHp()], "请选择【掌戎】的目标", "令至多" + str + "名" + (choice ? "手牌数" : "体力值") + "大于你的角色各" + (choice ? "弃置一张手牌" : "失去1点体力"), (card, player, target) => {
						var name = _status.event.card.name;
						if (name == "guohe_copy2") {
							if (target == player) {
								return player.countCards("h", card => lib.filter.cardDiscardable(card, player));
							}
							return target.countCards("h") >= Math.max(1, player.countCards("h"));
						}
						return target.getHp() >= player.getHp();
					})
					.set("ai", target => {
						var player = _status.event.player;
						if (get.attitude(player, target) >= 0) {
							return 0;
						}
						return get.effect(target, _status.event.card, player, player);
					})
					.set("card", { name: choice ? "guohe_copy2" : "losehp" })
					.forResult();
				if (result2.bool) {
					var targets = result2.targets.sortBySeat();
					player.logSkill("starzhangrong", targets);
					targets.forEach(target => {
						target.addTempSkill("starzhangrong_threaten");
						if (choice) {
							target.chooseToDiscard("h", true);
						} else {
							target.loseHp();
						}
					});
					player.draw(targets.length);
					player.when("phaseEnd").step(async () => {
						targets.forEach(target => target.removeSkill("starzhangrong_threaten"));
						var targetx = targets.filter(target => !target.getHistory("damage").length);
						if (targetx.length) {
							targetx.forEach(target => target.chat("乐"));
							player.popup("杯具");
							await player.loseHp();
							return;
						}
						player.popup("洗具");
					});
				}
			}
		},
		global: "starzhangrong_check",
		subSkill: {
			check: {
				mod: {
					canBeDiscarded(card, player, target) {
						if (!_status.starzhangrong_check) {
							return;
						}
						if (player.hasSkill("starzhangrong") && get.position(card) != "h") {
							return false;
						}
					},
				},
			},
			threaten: {
				charlotte: true,
				trigger: { player: "damageEnd" },
				firstDo: true,
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.removeSkill("starzhangrong_threaten");
				},
				ai: { threaten: 114514 + 1919810 },
				mark: true,
				markimage: "image/card/sha.png",
				intro: { content: "我还没受到伤害哟！" },
			},
		},
	}
```

### starhaoshou 名字:豪首
描述: 主公技。其他群势力角色使用【酒】结算完毕后，其可以令你回复1点体力。
```js
starhaoshou: {
		audio: 2,
		trigger: { global: "useCardAfter" },
		filter(event, player) {
			return event.player != player && event.card.name == "jiu" && player.isDamaged() && event.player.group == "qun";
		},
		direct: true,
		zhuSkill: true,
		async content(event, trigger, player) {
			var target = trigger.player;
			var result = await target
				.chooseBool(get.prompt("starhaoshou", player), "令" + get.translation(player) + "回复1点体力")
				.set("choice", get.recoverEffect(player, target, target) > 0)
				.forResult();
			if (result.bool) {
				target.line(player);
				player.logSkill("starhaoshou");
				player.recover(target);
			}
		},
		//global:'starhaoshou_global',
		subSkill: {
			global: {
				audio: "starhaoshou",
				forceaudio: true,
				filter(event, player) {
					if (
						!player.countCards("hes", card => {
							if (get.position(card) == "h" && _status.connectMode) {
								return true;
							}
							return get.name(card) == "jiu";
						})
					) {
						return false;
					}
					return event.type == "dying" && event.dying && event.dying != player && event.dying.hp <= 0 && event.dying.hasZhuSkill("starhaoshou") && player.group == "qun";
				},
				filterCard(card, player) {
					return get.name(card) == "jiu";
				},
				check: () => 1,
				viewAs: { name: "tao" },
				position: "hes",
				prompt() {
					return "将一张【酒】当作【桃】对" + get.translation(_status.event.dying) + "使用";
				},
				ai: {
					save: true,
					skillTagFilter(player, arg, target) {
						if (
							!player.countCards("hes", card => {
								if (get.position(card) == "h" && _status.connectMode) {
									return true;
								}
								return get.name(card) == "jiu";
							}) ||
							player == target ||
							!target.hasSkill("starhaoshou") ||
							player.group != "qun"
						) {
							return false;
						}
					},
				},
			},
		},
	}
```

## star_yuanshu 名字:星袁术 势力:qun

### starcanxi 名字:残玺
描述: 锁定技。①游戏开始时，你获得场上所有角色的势力对应的“玺角”标记（初始势力中未获得的“玺角”标记改为增加等量的体力上限）。②每轮开始时，你选择一个“玺角”对应势力并选择以下一项：1.妄生：本轮被选择势力角色每回合首次造成的伤害+1且计算与其他角色间的距离-1；2.向死：本轮其他被选择势力角色每回合首次回复体力后失去1点体力且每回合对你使用的第一张牌无效。
```js
starcanxi: {
		audio: 2,
		trigger: {
			global: ["phaseBefore", "roundStart"],
			player: "enterGame",
		},
		filter(event, player, name) {
			if (name === "roundStart") {
				return player.getSkills().some(skill => skill.indexOf("starcanxi_") === 0);
			}
			return event.name !== "phase" || game.phaseNumber === 0;
		},
		forced: true,
		async content(event, trigger, player) {
			if (event.triggername !== "roundStart") {
				const list = game.filterPlayer().reduce((list, target) => list.add(target.group), []);
				list.sort((a, b) => lib.group.indexOf(a) - lib.group.indexOf(b));
				const lacks = lib.group.filter(group => group !== "shen" && !list.includes(group));
				list.forEach(group => lib.skill.starcanxi.create(group, player));
				if (lacks.length) {
					await player.gainMaxHp(lacks.length);
				}
				return;
			}
			const groups = player
				.getSkills()
				.filter(skill => skill.indexOf("starcanxi_") === 0)
				.map(group => group.slice(10));
			groups.sort((a, b) => lib.group.indexOf(a) - lib.group.indexOf(b));
			const result = await player
				.chooseButton({
					createDialog: [
						'###残玺###<div class="text center">请选择势力和效果</div>',
						[groups.map(group => [group, lib.translate[`${group}2`] || lib.translate[group]]), "tdnodes"],
						[
							[
								["wangsheng", '<div class="popup text" style="width:calc(100% - 10px);display:inline-block"><div class="skill">【妄生】</div><div>被选择势力角色每回合首次造成的伤害+1且计算与其他角色间的距离-1</div></div>'],
								["xiangsi", '<div class="popup text" style="width:calc(100% - 10px);display:inline-block"><div class="skill">【向死】</div><div>其他被选择势力角色每回合首次回复体力后失去1点体力且每回合对你使用的第一张牌无效</div></div>'],
							],
							"textbutton",
						],
					],
					selectButton: 2,
					forced: true,
					filterButton: button => {
						const effects = ["wangsheng", "xiangsi"];
						if (!ui.selected.buttons.length) {
							return true;
						}
						return effects.includes(ui.selected.buttons[0].link) !== effects.includes(button.link);
					},
					ai: button => {
						const currentPlayer = _status.event.player;
						const map = _status.event.map;
						const effects = ["wangsheng", "xiangsi"];
						const getNum = (group, effect) => {
							let num = 0;
							const sgn = effect === "wangsheng" ? 1.05 : -1;
							game.countPlayer(current => {
								if (!(current === currentPlayer && sgn === -1) && current.group === group) {
									num += get.sgn(get.attitude(currentPlayer, current)) * sgn;
								}
							});
							return num;
						};
						const list = [];
						for (const group of map) {
							for (const effect of effects) {
								list.push([group, effect]);
							}
						}
						list.sort((a, b) => getNum(b[0], b[1]) - getNum(a[0], a[1]));
						return button.link === list[0][0] || button.link === list[0][1] ? 1 : 0;
					},
				})
				.set("map", groups)
				.forResult();
			if (!result.bool) {
				return;
			}
			const links = result.links.slice();
			if (!groups.includes(links[0])) {
				links.reverse();
			}
			const group = links[0];
			const skill = `starcanxi_${links[1]}`;
			const str = lib.translate[`${group}2`] || lib.translate[group];
			player.popup([str, skill]);
			game.log(player, "选择了", `#g${str}`, "、", `#y${get.translation(skill)}`);
			player.addTempSkill(skill, "roundStart");
			player.markAuto(skill, [group]);
		},
		create(group, player) {
			const skill = `starcanxi_${group}`;
			get.info("starcanxi").createSkill(skill);
			if (!_status.postReconnect.starcanxi) {
				_status.postReconnect.starcanxi = [get.info("starcanxi").createSkill, []];
			}
			_status.postReconnect.starcanxi[1].add(skill);
			player.addSkill(skill);
		},
		createSkill(skill) {
			if (!lib.skill[skill]) {
				game.broadcastAll(skill => {
					const group = skill.slice("starcanxi_".length);
					lib.skill[skill] = {
						mark: true,
						charlotte: true,
						onremove(player) {
							player.addMark("starpizhi", 1, false);
						},
						intro: { content: "玉玺的一角" },
					};
					lib.translate[skill] = `残玺·${get.translation(`${group}2`)}`;
					lib.skill[skill].marktext = get.translation(group);
					lib.translate[`${skill}_bg`] = get.translation(group);
				}, skill);
			}
		},
		subSkill: {
			wangsheng: {
				charlotte: true,
				onremove: true,
				trigger: { global: "damageBegin1" },
				filter(event, player) {
					if (!event.source || !player.getStorage("starcanxi_wangsheng").includes(event.source.group)) {
						return false;
					}
					return !event.source.getHistory("sourceDamage").length;
				},
				forced: true,
				logTarget: "source",
				async content(event, trigger, player) {
					trigger.num++;
				},
				group: "starcanxi_remove",
				global: "starcanxi_effect",
				intro: { content: "$势力角色每回合首次造成的伤害+1且计算与其他角色间的距离-1" },
			},
			xiangsi: {
				charlotte: true,
				onremove: true,
				trigger: { global: "recoverEnd" },
				filter(event, player) {
					if (!player.getStorage("starcanxi_xiangsi").includes(event.player.group) || event.player === player) {
						return false;
					}
					return (
						game
							.getGlobalHistory("changeHp", evt => evt.getParent().name === "recover" && evt.player === event.player)
							.map(evt => evt.getParent())
							.indexOf(event) === 0
					);
				},
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					await trigger.player.loseHp();
				},
				group: ["starcanxi_remove", "starcanxi_cancel"],
				global: "starcanxi_effect",
				intro: { content: "其他$势力角色每回合首次回复体力后失去1点体力且每回合对你使用的第一张牌无效" },
			},
			cancel: {
				charlotte: true,
				trigger: { global: "useCard" },
				filter(event, player) {
					if (!event.targets || !event.targets.includes(player) || !player.getStorage("starcanxi_xiangsi").includes(event.player.group) || event.player === player) {
						return false;
					}
					return event.player.getHistory("useCard", evt => evt.targets && evt.targets.includes(player)).indexOf(event) === 0;
				},
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					trigger.excluded.add(player);
				},
			},
			effect: {
				mod: {
					globalFrom(from, to, distance) {
						if (game.hasPlayer(target => target.getStorage("starcanxi_wangsheng").includes(from.group))) {
							return distance - 1;
						}
					},
				},
				ai: {
					effect: {
						player(card, player, target) {
							if (get.itemtype(card) !== "card" || !player || !target) {
								return;
							}
							const targets = game.filterPlayer(targetx => targetx !== player && targetx.getStorage("starcanxi_xiangsi").includes(player.group));
							if (!targets.length) {
								return;
							}
							if (get.tag(card, "recover") && target === player && target.hp > 2) {
								return 0;
							}
							if (get.tag(card, "damage") && targets.includes(target)) {
								return 0.5;
							}
						},
					},
				},
			},
			remove: {
				charlotte: true,
				trigger: { player: "die" },
				forced: true,
				popup: false,
				firstDo: true,
				forceDie: true,
				async content(event, trigger, player) {
					player.removeSkill("starcanxi_wangsheng");
					player.removeSkill("starcanxi_xiangsi");
				},
			},
		},
	}
```

### starpizhi 名字:圮秩
描述: 锁定技。①一名角色死亡后，若你拥有该角色对应的“玺角”标记且你本轮发动〖残玺〗的势力与其相同，或其是该势力最后一名角色，你失去之，然后摸X张牌并回复1点体力。②结束阶段，你摸X张牌。（X为你本局游戏失去的“玺角”标记数）
```js
starpizhi: {
		audio: 2,
		trigger: { player: "phaseEnd", global: "die" },
		filter(event, player) {
			if (event.name === "phase") {
				return player.hasMark("starpizhi");
			}
			if (!game.hasPlayer(current => current !== event.player && current.group === event.player.group)) {
				return true;
			}
			if (!player.getStorage("starcanxi_wangsheng").includes(event.player.group) && !player.getStorage("starcanxi_xiangsi").includes(event.player.group)) {
				return false;
			}
			const groups = player
				.getSkills()
				.filter(skill => skill.indexOf("starcanxi_") === 0)
				.map(group => group.slice(10));
			return groups.includes(event.player.group);
		},
		forced: true,
		async content(event, trigger, player) {
			if (trigger.name === "die") {
				const skills = player.getSkills().filter(skill => skill.indexOf("starcanxi_") === 0 && skill.slice(10) === trigger.player.group);
				player.removeSkill(skills);
			}
			await player.draw(player.countMark("starpizhi"));
			if (player.isDamaged() && trigger.name === "die") {
				await player.recover();
			}
		},
		intro: { content: "已失去#个“玺角”" },
		ai: { combo: "starcanxi" },
	}
```

### starzhonggu 名字:冢骨
描述: 主公技，锁定技。摸牌阶段，若游戏轮数大于等于场上的群势力角色数，则你额外摸两张牌，否则你少摸一张牌。
```js
starzhonggu: {
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed;
		},
		forced: true,
		zhuSkill: true,
		async content(event, trigger, player) {
			const num = game.roundNumber >= game.countPlayer(current => current.group === "qun") ? 2 : -1;
			trigger.num += num;
		},
	}
```

## star_caoren 名字:星曹仁 势力:wei

### starsujun 名字:肃军
描述: 当你使用一张牌时，若你手牌中的基本牌和非基本牌的牌数相等，你可以摸两张牌。
```js
starsujun: {
		audio: 2,
		trigger: { player: "useCard" },
		filter(event, player) {
			return player.countCards("h", { type: "basic" }) * 2 === player.countCards("h");
		},
		frequent: true,
		locked: false,
		async content(event, trigger, player) {
			await player.draw(2);
		},
		mod: {
			aiOrder(player, card, num) {
				const delta = player.countCards("h") - 2 * player.countCards("h", { type: "basic" });
				if (Math.abs(delta) !== 1) {
					return;
				}
				if (delta === 1 && get.type(card) !== "basic") {
					return delta + 10;
				}
				if (delta === -1 && get.type(card) === "basic") {
					return delta + 10;
				}
			},
		},
	}
```

### starlifeng 名字:砺锋
描述: 你可以将一张本回合未有角色使用过的颜色的手牌当做无次数限制且不计入次数的【杀】或【无懈可击】使用。
```js
starlifeng: {
		audio: 2,
		enable: "chooseToUse",
		filter(event, player) {
			if (!event.filterCard(get.autoViewAs({ name: "sha", storage: { starlifeng: true } }, "unsure"), player, event) && !event.filterCard(get.autoViewAs({ name: "wuxie", storage: { starlifeng: true } }, "unsure"), player, event)) {
				return false;
			}
			return player.hasCard(card => !player.getStorage("starlifeng_count").includes(get.color(card, player)), "hs");
		},
		chooseButton: {
			dialog(event, player) {
				const list = [];
				if (event.filterCard(get.autoViewAs({ name: "sha", storage: { starlifeng: true } }, "unsure"), player, event)) {
					list.push(["基本", "", "sha"]);
				}
				if (event.filterCard(get.autoViewAs({ name: "wuxie", storage: { starlifeng: true } }, "unsure"), player, event)) {
					list.push(["锦囊", "", "wuxie"]);
				}
				const dialog = ui.create.dialog("砺锋", [list, "vcard"]);
				dialog.direct = true;
				return dialog;
			},
			check(button) {
				const player = _status.event.player;
				return _status.event.getParent().type === "phase" ? player.getUseValue({ name: button.link[2] }) : 1;
			},
			backup(links, player) {
				return {
					filterCard(card, player) {
						return !player.getStorage("starlifeng_count").includes(get.color(card, player));
					},
					async precontent(event, trigger, player) {
						player.logSkill("starlifeng");
						event.getParent().addCount = false;
					},
					log: false,
					popname: true,
					viewAs: {
						name: links[0][2],
						storage: {
							starlifeng: true,
						},
					},
					ai1(card) {
						const player = _status.event.player;
						const num = player.countCards("h") - 2 * player.countCards("h", { type: "basic" });
						if (player.hasSkill("starsujin") && Math.abs(num) === 1) {
							if (num === 1 && get.type(card) !== "basic") {
								return 15 - get.value(card);
							}
							if (num === -1 && get.type(card) === "basic") {
								return 15 - get.value(card);
							}
						}
						return 7 - get.value(card);
					},
				};
			},
			prompt(links) {
				return `将一张本回合未使用过的颜色的手牌当做【${get.translation(links[0][2])}】使用`;
			},
		},
		hiddenCard(player, name) {
			if (name === "wuxie") {
				return player.hasCards("hs", card => !player.getStorage("starlifeng_count").includes(get.color(card, player)) || _status.connectMode);
			}
		},
		ai: {
			respondSha: true,
			skillTagFilter(player, tag, arg) {
				if (arg === "respond") {
					return false;
				}
				if (!player.hasCards("hs", card => !player.getStorage("starlifeng_count").includes(get.color(card, player)) || _status.connectMode)) {
					return false;
				}
			},
			order: 10,
			result: { player: 1 },
		},
		locked: false,
		mod: {
			cardUsable(card, player) {
				if (card?.storage?.starlifeng) {
					return Infinity;
				}
			},
		},
		group: "starlifeng_mark",
		subSkill: {
			mark: {
				charlotte: true,
				trigger: { global: "useCard1" },
				filter(event, player) {
					return !player.getStorage("starlifeng_count").includes(get.color(event.card));
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					player.addTempSkill("starlifeng_count");
					player.markAuto("starlifeng_count", [get.color(trigger.card)]);
				},
			},
			count: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

## star_sunshangxiang 名字:星孙尚香 势力:wu

### starsaying 名字:飒影
描述: 每轮每种牌名限一次，你需要使用【杀】或【闪】时，你可以使用一张装备牌，视为使用之；你需要使用【桃】或【酒】时，你可以收回装备区里的一张牌，视为使用之。
```js
starsaying: {
		audio: 2,
		enable: "chooseToUse",
		hiddenCard(player, name) {
			if (player.getStorage("starsaying").includes(name)) {
				return false;
			}
			if (["shan", "sha"].includes(name)) {
				return player.hasCards("hs", card => get.type(card) === "equip" && player.canEquip(card, true));
			}
			if (["tao", "jiu"].includes(name)) {
				return player.hasCards("e");
			}
		},
		filter(event, player) {
			for (const name of ["shan", "sha"]) {
				if (player.getStorage("starsaying").includes(name)) {
					continue;
				}
				if (!player.hasCards("hs", card => get.type(card) === "equip" && player.canEquip(card, true))) {
					continue;
				}
				if (event.filterCard({ name, isCard: true }, player, event)) {
					return true;
				}
			}
			for (const name of ["tao", "jiu"]) {
				if (player.getStorage("starsaying").includes(name)) {
					continue;
				}
				if (!player.hasCards("e")) {
					continue;
				}
				if (event.filterCard({ name, isCard: true }, player, event)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				const list = [];
				for (const name of ["shan", "sha"]) {
					if (player.getStorage("starsaying").includes(name)) {
						continue;
					}
					if (!player.hasCards("hs", card => get.type(card) === "equip" && player.canEquip(card, true))) {
						continue;
					}
					if (event.filterCard({ name, isCard: true }, player, event)) {
						list.push(["基本", "", name]);
					}
				}
				for (const name of ["tao", "jiu"]) {
					if (player.getStorage("starsaying").includes(name)) {
						continue;
					}
					if (!player.hasCards("e")) {
						continue;
					}
					if (event.filterCard({ name, isCard: true }, player, event)) {
						list.push(["基本", "", name]);
					}
				}
				return ui.create.dialog("飒影", [list, "vcard"], "hidden");
			},
			check(button) {
				const player = _status.event.player;
				const card = { name: button.link[2], isCard: true };
				return player.getUseValue(card);
			},
			backup(links, player) {
				return {
					check(card) {
						return 1 / Math.max(0.1, get.value(card));
					},
					filterCard(card) {
						if (["sha", "shan"].includes(links[0][2])) {
							return get.position(card) !== "e" && get.type(card) === "equip" && player.canEquip(card, true);
						}
						return get.position(card) === "e";
					},
					position: "hes",
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						suit: "none",
						number: null,
						isCard: true,
					},
					popname: true,
					ignoreMod: true,
					async precontent(event, trigger, player) {
						player.logSkill("starsaying");
						const card = event.result.cards[0];
						player.$give(card, player, false);
						if (["sha", "shan"].includes(event.result.card.name)) {
							await player.equip(card);
						} else {
							await player.gain({ cards: [card], animate: "gain2" });
						}
						const viewAs = {
							name: event.result.card.name,
							nature: event.result.card.nature,
						};
						event.result.card = viewAs;
						event.result.cards = [];
						if (!player.storage.starsaying) {
							player.when({ global: "roundStart" }).step(async () => {
								delete player.storage.starsaying;
							});
						}
						player.markAuto("starsaying", viewAs.name);
					},
				};
			},
			prompt(links, player) {
				const str = ["sha", "shan"].includes(links[0][2]) ? "使用一张装备牌" : "获得装备区里的一张牌";
				return `${str}，视为使用${get.translation(links[0][3] || "")}${get.translation(links[0][2])}`;
			},
		},
		ai: {
			order() {
				const player = _status.event.player;
				const event = _status.event;
				if (event.filterCard({ name: "jiu" }, player, event) && get.effect(player, { name: "jiu" }) > 0) {
					return 6.3;
				}
				return 6.1;
			},
			skillTagFilter(player, tag, arg) {
				const name = tag === "respondSha" ? "sha" : "shan";
				if (player.getStorage("starsaying").includes(name)) {
					return false;
				}
				if (!player.hasCards("hs", card => get.type(card) === "equip" && player.canEquip(card, true))) {
					return false;
				}
			},
			result: {
				player: 1,
			},
			respondSha: true,
			respondShan: true,
		},
	}
```

### starjiaohao 名字:骄豪
描述: 出牌阶段限一次，你可以与一名装备区牌数不大于你的角色拼点，然后你可令赢的角色获得拼点牌或令其使用一张【杀】。
```js
starjiaohao: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") && game.hasPlayer(current => lib.skill.starjiaohao.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return player.canCompare(target) && player.countCards("e") >= target.countCards("e");
		},
		async content(event, trigger, player) {
			const target = event.target;
			const result = await player.chooseToCompare(target).forResult();
			if (result.winner) {
				const cards = [result.player, result.target].filterInD("d");
				const result2 = await player
					.chooseControl("cancel2")
					.set("choiceList", ["令" + get.translation(result.winner) + "获得" + (cards.length ? get.translation(cards) : "空气"), "令" + get.translation(result.winner) + "使用一张杀"])
					.set("ai", function () {
						return _status.event.check;
					})
					.set(
						"check",
						(function () {
							if (get.attitude(player, result.winner) <= 0) {
								return "cancel2";
							}
							if (
								!game.hasPlayer(current => {
									return result.winner.canUse({ name: "sha" }, current, false) && get.effect(current, { name: "sha" }, result.winner, result.winner) > 0;
								}) ||
								!cards.length
							) {
								return "选项一";
							}
							let eff1 = result.winner.getUseValue({ name: "sha" }),
								eff2 = 0;
							for (let card of cards) {
								eff2 += get.value(card, result.winner);
							}
							if (eff1 > eff2 * 2.5) {
								return "选项二";
							}
							return "选项一";
						})()
					)
					.forResult();
				switch (result2.control) {
					case "选项二": {
						const next = result.winner
							.chooseToUse("是否使用一张杀？", { name: "sha" })
							.set("filterTarget", function (card, player, target) {
								return lib.filter.filterTarget.apply(this, arguments);
							})
							.set("addCount", false);
						await next;
						break;
					}
					case "选项一": {
						await result.winner.gain(cards, "gain2");
						break;
					}
				}
			}
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					var hs = player.getCards("h").sort(function (a, b) {
						return b.number - a.number;
					});
					var ts = target.getCards("h").sort(function (a, b) {
						return b.number - a.number;
					});
					if (!hs.length || !ts.length) {
						return 0;
					}
					if (hs[0].number <= ts[0].number) {
						return 2;
					}
					if (player.countCards("h") >= target.countCards("h")) {
						return -10;
					}
					return -1;
				},
			},
		},
	}
```

## dc_jikang 名字:新杀嵇康 势力:wei

### new_qingxian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcjuexiang 名字:绝响
描述: 当你死亡时，杀死你的角色弃置其装备区内的所有牌并失去1点体力，然后你可以令一名其他角色获得〖残韵〗。
```js
dcjuexiang: {
		derivation: "dccanyun",
		audio: "juexiang",
		trigger: { player: "die" },
		forced: true,
		locked: false,
		forceDie: true,
		skillAnimation: true,
		animationColor: "water",
		async content(event, trigger, player) {
			if (trigger.source && trigger.source.isIn()) {
				await trigger.source.discard({ cards: trigger.source.getCards("e") });
				await trigger.source.loseHp();
			}
			const result = await player
				.chooseTarget({
					prompt: "绝响：是否令一名其他角色获得技能〖残韵〗？",
					filterTarget: lib.filter.notMe,
					ai: target => get.attitude(_status.event.player, target),
				})
				.set("forceDie", true)
				.forResult();
			if (!result.bool) {
				return;
			}
			const target = result.targets[0];
			player.line(target, "thunder");
			await target.addSkills("dccanyun");
		},
	}
```

## dc_jsp_guanyu 名字:新杀SP关羽 势力:wei

### new_rewusheng
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcdanji 名字:单骑
描述: 觉醒技。准备阶段，若你区域内的牌数大于体力值，你减1点体力上限，将体力回复至体力上限并摸等量张牌，然后获得〖马术〗和〖怒嗔〗。
```js
dcdanji: {
		audio: "danji",
		skillAnimation: true,
		animationColor: "water",
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		juexingji: true,
		derivation: ["mashu", "dcnuchen"],
		filter(event, player) {
			return player.countCards("hej") > player.getHp();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			const num = player.maxHp - player.hp;
			if (num) {
				await player.recover(num);
				await player.draw(num);
			}
			await player.addSkills(["mashu", "dcnuchen"]);
		},
		ai: {
			maixie: true,
			skillTagFilter: (player, tag, arg) => {
				if (tag === "maixie") {
					return player.hp >= 2 && !player.storage.dcdanji && !player.hasSkill("dcnuchen") && player.countCards("h") === player.hp;
				}
			},
			effect: {
				target: (card, player, target) => {
					let hs = target.countCards("h");
					if (target.hp < 3 || target.storage.dcdanji || target.hasSkill("dcnuchen") || hs > target.hp + 1) {
						return;
					}
					if (get.tag(card, "draw")) {
						return 1.6;
					}
					if (get.tag(card, "lose") || get.tag(card, "discard")) {
						return [1, -0.8];
					}
					if (hs === target.hp && get.tag(card, "damage")) {
						return [1, target.hp / 3];
					}
					if (hs > target.hp && target.hp > 3 && (card.name === "shan" || card.name === "wuxie")) {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

## dc_mengda 名字:孟达 势力:wei

### dclibang 名字:利傍
描述: 出牌阶段限一次。你可以弃置一张牌，正面向上获得两名其他角色的各一张牌。然后你判定，若结果与这两张牌的颜色均不同，你交给其中一名角色两张牌或失去1点体力，否则你获得判定牌并视为对其中一名角色使用一张【杀】。
```js
dclibang: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		position: "he",
		filter(event, player) {
			return player.hasCard(card => lib.filter.cardDiscardable(card, player, "dclibang"), "he") && game.countPlayer(current => current !== player) >= 2;
		},
		filterTarget(card, player, target) {
			return target !== player;
		},
		selectTarget: 2,
		multiline: true,
		multitarget: true,
		async content(event, trigger, player) {
			const { targets } = event;
			event.cardsx = [];
			targets.sortBySeat();
			for (const current of targets) {
				if (!current.hasCards("he")) {
					continue;
				}
				const result = await player
					.gainPlayerCard({
						target: current,
						position: "he",
						forced: true,
						visibleMove: true,
					})
					.forResult();
				if (result.bool && result.cards?.length) {
					event.cardsx.push(result.cards[0]);
				}
			}
			await player.judge().set("callback", lib.skill.dclibang.contentx);
		},
		async contentx(event, trigger, player) {
			const { card, color } = event.judgeResult;
			const parent = event.getParent(2);
			if (parent.cardsx.some(cardx => get.color(cardx) === color)) {
				if (get.position(card, true) === "o") {
					await player.gain({
						cards: [card],
						animate: "gain2",
					});
				}
				const targets = parent.targets.filter(target => player.canUse("sha", target));
				if (!targets.length) {
					return;
				}
				const result = await player
					.chooseTarget({
						prompt: "利傍：视为对其中一名角色使用一张【杀】",
						forced: true,
						filterTarget: (card, player, target) => _status.event.targets.includes(target),
						ai: target => get.effect(target, { name: "sha" }, player, player),
					})
					.set("targets", targets)
					.forResult();
				if (result.bool) {
					await player.useCard({
						card: { name: "sha", isCard: true },
						targets: [result.targets[0]],
						addCount: false,
					});
				}
				return;
			}
			const result = await player
				.chooseCardTarget({
					filterCard(card) {
						return get.itemtype(card) === "card";
					},
					filterTarget(card, player, target) {
						return _status.event.targets.includes(target);
					},
					selectCard: 2,
					targets: parent.targets,
					position: "he",
					prompt: "交给其中一名角色两张牌，或失去1点体力",
					ai1(card) {
						return 1;
					},
					ai2(target) {
						const player = _status.event.player;
						const card = ui.selected.cards[0];
						const val = get.value(card, target);
						if (val > 0) {
							return get.attitude(player, target) * 2;
						}
						return (val - 2) * get.attitude(player, target);
					},
				})
				.forResult();
			if (result.bool) {
				await player.give(result.cards, result.targets[0]);
				return;
			}
			await player.loseHp();
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					if (get.attitude(player, target) > 0 && ui.selected.targets.length) {
						return 0.1;
					}
					return -1;
				},
			},
		},
	}
```

### dcwujie 名字:无节
描述: 锁定技。①你使用无色牌无距离限制且不计入使用次数。②其他角色杀死你后不执行身份奖惩。
```js
dcwujie: {
		audio: 2,
		trigger: {
			player: "dieBefore",
		},
		forced: true,
		forceDie: true,
		logTarget: "source",
		filter(event, player) {
			return get.mode() == "identity" && event.source?.isIn() && event.source != player;
		},
		async content(event, trigger, player) {
			trigger.set("noDieAfter2", true);
		},
		group: "dcwujie_inf",
		subSkill: {
			inf: {
				trigger: { player: "useCard1" },
				forced: true,
				popup: false,
				firstDo: true,
				filter(event, player) {
					if (get.color(event.card) == "none" && event.addCount !== false) {
						return true;
					}
					return false;
				},
				async content(event, trigger, player) {
					trigger.addCount = false;
					const stat = player.getStat().card;
					const name = trigger.card.name;
					if (typeof stat[name] == "number") {
						stat[name]--;
					}
				},
			},
		},
		mod: {
			targetInRange(card, player) {
				const color = get.color(card);
				if (color === "none" || color === "unsure") {
					return true;
				}
			},
			cardUsable(card) {
				const color = get.color(card);
				if (color === "none" || color === "unsure") {
					return Infinity;
				}
			},
		},
	}
```

## guānning 名字:关宁 势力:shu

### dcxiuwen 名字:修文
描述: 当你使用牌时，若你未记录此牌牌名，你可以记录之并摸一张牌。
```js
dcxiuwen: {
		audio: 2,
		trigger: { player: "useCard" },
		filter(event, player) {
			return !player.getStorage("dcxiuwen").includes(event.card.name);
		},
		frequent: true,
		async content(event, trigger, player) {
			player.markAuto("dcxiuwen", [trigger.card.name]);
			await player.draw();
		},
		intro: { content: "已使用：$" },
	}
```

### longsong 名字:龙诵
描述: 出牌阶段开始时，你可以交给或获得一名其他角色一张红色牌，然后你本阶段获得其发动时机包含“出牌阶段”的一项技能且至多可以发动一次。若其没有符合条件的技能，则改为随机获得一个满足条件的技能。
```js
longsong: {
		audio: "dclongsong",
		trigger: { player: "phaseUseBegin" },
		getSkills(skills, len) {
			skills = skills.filter(skill => {
				let str = get.skillInfoTranslation(skill, get.event().player);
				if (str.indexOf("当你于出牌阶段外") != -1) {
					return false;
				}
				if (str.indexOf("当你于出牌阶段") != -1) {
					return true;
				}
				let ss = game.expandSkills([skill]);
				if (
					ss.some(skillx => {
						let info = get.info(skillx);
						if (!info || !info.enable) {
							return false;
						}
						if (info.enable != "phaseUse" && info.enable != "chooseToUse" && (!Array.isArray(info.enable) || (!info.enable.includes("phaseUse") && !info.enable.includes("chooseToUse")))) {
							return false;
						}
						if (info.juexingji || info.hiddenSkill || info.charlotte || info.limited || info.dutySkill) {
							return false;
						}
						if (info.ai && info.ai.notemp) {
							return false;
						}
						return true;
					})
				) {
					return true;
				}
				return false;
			});
			if (len && !skills.length) {
				if (!_status.characterlist) {
					game.initCharacterList();
				}
				let allList = _status.characterlist.slice(0);
				allList.randomSort();
				for (const name of allList) {
					const curSkills = lib.character[name][3];
					const filteredSkills = lib.skill.longsong.getSkills(curSkills);
					if (filteredSkills.length > 0) {
						return filteredSkills.randomGets(1);
					}
				}
			}
			return skills;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt2(event.skill),
					filterTarget(card, player, target) {
						if (target === player) {
							return false;
						}
						const skills = lib.skill.longsong.getSkills(target.getSkills(null, false)).map(skill => get.translation(skill));
						if (skills.length) {
							target.prompt(skills.join("<br>"));
						}
						return true;
					},
					filterCard: { color: "red" },
					selectCard: [0, 1],
					ai1(card) {
						const ai2 = get.event().ai2;
						if (
							game.hasPlayer(current => {
								return ai2(current) > 0;
							})
						) {
							return -1 - get.value(card);
						}
						return 6 - get.value(card);
					},
					ai2(target) {
						const player = get.event().player,
							att = get.attitude(player, target);
						if (att > 0 && !target.hasGainableCards(player, "he")) {
							return 0;
						}
						return lib.skill.longsong.getSkills(target.getSkills(null, false)).length + (att > 0 ? 0 : Math.max(0, get.effect(target, { name: "shunshou_copy2" }, player, player)));
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0],
				cards = event.cards,
				gainableCards = target.getGainableCards(player, "he").filter(card => get.color(card) == "red");
			if (cards) {
				await player.give(cards, target);
			} else {
				if (gainableCards.length) {
					await player.gain(gainableCards.randomGet(), target, "giveAuto", "bySelf");
				} else {
					player.popup("杯具");
					player.chat("无牌可得？！");
					game.log("但是", target, "没有红色牌可被" + get.translation(player) + "获得！");
				}
			}
			let skills = lib.skill.longsong.getSkills(target.getSkills(null, false), true);
			if (!event.isMine() && !event.isOnline()) {
				await game.delayx();
			}
			if (!skills.length) {
				return;
			}
			let skill;
			if (skills.length == 1) {
				skill = skills[0];
			} else {
				skill = (
					await player
						.chooseControl(skills)
						.set(
							"choiceList",
							skills.map(i => {
								return '<div class="skill">' + (lib.translate[i + "_ab"] || lib.translate[i]) + "</div><div>" + get.skillInfoTranslation(i, player, false) + "</div>";
							})
						)
						.set("displayIndex", false)
						.set("prompt", "龙诵：请选择你要获得的技能")
						.set("ai", () => {
							var list = _status.event.controls.slice();
							return list.sort((a, b) => {
								return get.skillRank(b, "in") - get.skillRank(a, "in");
							})[0];
						})
						.forResult()
				).control;
			}
			player.addTempSkill("dclongsong_remove", ["phaseUseAfter", "phaseAfter"]);
			player.markAuto("dclongsong_remove", [skill]);
			await player.addTempSkills(skill, ["phaseUseAfter", "phaseAfter"]);
		},
	}
```

## sunhuan 名字:孙桓 势力:wu

### dcniji 名字:逆击
描述: ①当你成为非装备牌的目标后，你可以摸一张牌，称为“逆击”。②一名角色的结束阶段，你可以使用一张“逆击”牌，然后弃置所有“逆击”牌。
```js
dcniji: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return get.type(event.card) !== "equip";
		},
		frequent: true,
		group: "dcniji_discard",
		async content(event, trigger, player) {
			const next = player.draw();
			const evt = trigger.getParent("dcniji_discard");
			if (!evt || evt.player !== player) {
				next.gaintag = ["dcniji"];
			}
			player.addTempSkill("dcniji_clear");
			await next;
		},
		subSkill: {
			clear: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("dcniji");
				},
			},
			discard: {
				audio: "dcniji",
				trigger: { global: "phaseJieshuBegin" },
				filter(event, player) {
					return player.hasCard(card => card.hasGaintag("dcniji"), "h");
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					const cards = player.getCards("h", card => card.hasGaintag("dcniji") && lib.filter.cardDiscardable(card, player, "dcniji"));
					if (cards.some(card => player.hasUseTarget(card))) {
						const result = await player
							.chooseToUse({
								prompt: "是否使用一张“逆击”牌？",
								filterCard(card, player) {
									if (![card].concat(card.cards || []).some(current => get.itemtype(current) === "card" && current.hasGaintag("dcniji"))) {
										return false;
									}
									return lib.filter.filterCard.apply(this, arguments);
								},
								ai1(card) {
									return get.player().getUseValue(card);
								},
							})
							.forResult();
						if (result.bool) {
							await game.delayex();
						}
					}
					// }
					const remainingCards = cards.filter(card => get.owner(card) === player && get.position(card) === "h" && lib.filter.cardDiscardable(card, player, "dcniji"));
					if (remainingCards.length) {
						await player.discard({ cards: remainingCards });
					}
				},
			},
		},
	}
```

## sunlang 名字:孙狼 势力:shu

### dctingxian 名字:铤险
描述: 每回合限一次。当你使用【杀】指定最后一个目标后，你可以摸X张牌，然后可以令此【杀】对其中至多X个目标无效（X为你装备区的牌数+1）。
```js
dctingxian: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		usable: 1,
		filter(event, player) {
			return event.card.name === "sha" && event.getParent()?.triggeredTargets3.length === event.targets.length;
		},
		async content(event, trigger, player) {
			const num = player.countCards("e") + 1;
			await player.draw(num);
			const maxTargets = Math.min(trigger.targets.length, num);
			const result = await player
				.chooseTarget({
					prompt: `铤险：是否令此杀对其中至多${get.cnNumber(maxTargets)}个目标无效？`,
					selectTarget: [1, maxTargets],
					filterTarget: (card, player, target) => _status.event.getTrigger().targets.includes(target),
					ai: target => 1 - get.effect(target, _status.event.getTrigger().card, _status.event.player, _status.event.player),
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			player.line(result.targets);
			trigger.getParent()?.excluded.addArray(result.targets);
		},
	}
```

### dcbenshi 名字:奔矢
描述: 锁定技。①你的攻击范围+1。②由你使用的【杀】的牌面信息中的“使用目标”产生的规则改为“攻击范围内的所有角色”。
```js
dcbenshi: {
		audio: 2,
		forced: true,
		trigger: { player: "useCard1" },
		filter(event, player) {
			if (event.card.name !== "sha") {
				return false;
			}
			const card = event.card;
			const info = get.info(card);
			const select = get.copy(info.selectTarget);
			let range;
			if (select === undefined) {
				if (info.filterTarget === undefined) {
					return false;
				}
				range = [1, 1];
			} else if (typeof select === "number") {
				range = [select, select];
			} else if (get.itemtype(select) === "select") {
				range = select;
			} else if (typeof select === "function") {
				range = select(card, player);
				if (typeof range === "number") {
					range = [range, range];
				}
			}
			game.checkMod(card, player, range, "selectTarget", player);
			return range[1] === -1;
		},
		async content(event, trigger, player) {},
		mod: {
			attackRange(player, num) {
				return num + 1;
			},
			selectTarget(card, player, range) {
				if (card.name === "sha") {
					range[0] = -1;
					range[1] = -1;
				}
			},
		},
	}
```

## shiyi 名字:是仪 势力:wu

### dccuichuan 名字:榱椽
描述: `出牌阶段限一次。你可以弃置一张手牌并选择一名角色，其随机使用牌堆里一张其空置装备栏对应副类别且其能对其使用的装备牌，你摸X张牌（X为其装备区里的牌数）。然后若其装备区里的牌数增加至四张，你失去〖榱椽〗，获得${get.poptip("dczuojian")}，且令其于此回合结束后进行一个额外回合。`
```js
dccuichuan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: true,
		filterCard: true,
		derivation: "dczuojian",
		filter(event, player) {
			return player.hasCards("h");
		},
		async content(event, trigger, player) {
			const { target } = event;
			const num = target.countCards("e");
			const subtypes = [];
			for (let i = 1; i < 7; i++) {
				if (target.hasEmptySlot(i)) {
					subtypes.push(`equip${i}`);
				}
			}
			subtypes.randomSort();
			for (const subtype of subtypes) {
				const card = get.cardPile2(card => get.subtype(card) === subtype, "random");
				if (!card || !target.canUse(card, target)) {
					continue;
				}
				await target.chooseUseTarget({ card, forced: true, nopopup: true });
				break;
			}
			const numx = target.countCards("e");
			if (numx > 0) {
				await player.draw(numx);
			}
			await game.delayx();
			if (target.countCards("e") !== 4 || num === 4) {
				return;
			}
			player.trySkillAnimate("dccuichuan_animate", "dccuichuan_animate", player.checkShow("dccuichuan"));
			await player.changeSkills(["dczuojian"], ["dccuichuan"]);
			target.insertPhase();
			await game.delayx();
		},
		subSkill: {
			animate: {
				audio: "dccuichuan",
				skillAnimation: true,
				animationColor: "wood",
			},
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					if (target.countCards("e") === 3) {
						return 2;
					}
					return 1;
				},
				player(player, target) {
					if (target.countCards("e") === 3) {
						return 0.5;
					}
					return target.countCards("e") + 1;
				},
			},
		},
	}
```

### dczhengxu 名字:正序
描述: 每回合每项限一次。①当你受到伤害时，若你本回合失去过牌，你可以防止此伤害。②当你失去牌后，若你本回合受到过伤害，你可以摸等量的牌。
```js
dczhengxu: {
		audio: 2,
		group: ["dczhengxu_lose", "dczhengxu_damage"],
		subSkill: {
			lose: {
				audio: "dczhengxu",
				trigger: {
					player: "loseAfter",
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				prompt2(event, player) {
					return `当你失去牌后，若你本回合受到过伤害，你可以摸等量的牌（${get.cnNumber(event.getl(player).cards2.length)}张）`;
				},
				check: () => true,
				filter(event, player) {
					if (event.name === "gain" && event.player === player) {
						return false;
					}
					if (!player.getHistory("damage").length || player.hasHistory("useSkill", evt => evt.skill === "dczhengxu_lose")) {
						return false;
					}
					const evt = event.getl(player);
					return evt && evt.cards2 && evt.cards2.length > 0;
				},
				async content(event, trigger, player) {
					await player.draw(trigger.getl(player).cards2.length);
				},
				ai: {
					effect: {
						target: (card, player, target) => {
							if ((get.tag(card, "lose") || get.tag(card, "discard")) && target.getHistory("damage").length && !target.hasHistory("useSkill", evt => evt.skill === "dczhengxu_lose")) {
								return [1, 1];
							}
						},
					},
				},
			},
			damage: {
				audio: "dczhengxu",
				trigger: {
					player: "damageBegin4",
				},
				prompt2: "当你受到伤害时，若你本回合失去过牌，你可以防止之",
				check: () => true,
				filter(event, player) {
					return player.hasHistory("lose", evt => evt.cards2 && evt.cards2.length) && !player.hasHistory("useSkill", evt => evt.skill === "dczhengxu_damage");
				},
				async content(event, trigger, player) {
					trigger.cancel();
				},
				ai: {
					effect: {
						target: (card, player, target) => {
							if (player.hasSkillTag("jueqing", false, target) || !get.tag(card, "damage")) {
								return;
							}
							if (target.hasHistory("useSkill", evt => evt.skill === "dczhengxu_damage") || !target.hasHistory("lose", evt => evt.cards2 && evt.cards2.length)) {
								return;
							}
							if (get.attitude(player, target) >= 0) {
								return "zeroplayertarget";
							}
							let num = 0;
							let shas = player.getCardUsable("sha");
							const hs = player.getCards("hs", i => {
								if (i === card || (card.cards && card.cards.includes(i)) || !get.tag(i, "damage") || !player.canUse(i, target)) {
									return false;
								}
								if (get.name(i) === "sha") {
									num++;
									return false;
								}
								return true;
							});
							if (card.name === "sha") {
								shas--;
							}
							num = Math.min(num, shas);
							num += hs.length;
							if (!num) {
								return "zeroplayertarget";
							}
							num = 1 - 2 / 3 / num;
							return [num, 0, num, 0];
						},
					},
				},
			},
		},
	}
```

## dc_hujinding 名字:新杀胡金定 势力:shu

### dcdeshi 名字:德释
描述: 锁定技。当你受到【杀】的伤害时，若你已受伤，则你防止此伤害并令系统从弃牌堆/牌堆中检索一张【杀】，你获得此【杀】，然后减1点体力上限。
```js
dcdeshi: {
		audio: 2,
		trigger: { player: "damageBegin4" },
		forced: true,
		filter(event, player) {
			return player.isDamaged() && event.card && event.card.name === "sha";
		},
		async content(event, trigger, player) {
			trigger.cancel();
			for (const func of ["discardPile", "cardPile2"]) {
				const card = get[func](card => card.name === "sha");
				if (card) {
					await player.gain({
						cards: [card],
						animate: "gain2",
					});
					break;
				}
			}
			await player.loseMaxHp();
		},
		ai: {
			halfneg: true,
			filterDamage: true,
			skillTagFilter(player, tag, arg) {
				return arg?.card?.name === "sha";
			},
		},
	}
```

### dcwuyuan 名字:武缘
描述: 出牌阶段限一次。你可将一张【杀】交给一名其他角色，然后你回复1点体力，你与其各摸一张牌。若此【杀】为：红色【杀】，其回复1点体力；属性【杀】，其改为摸两张牌。
```js
dcwuyuan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasCards("h", "sha");
		},
		filterCard: { name: "sha" },
		filterTarget: lib.filter.notMe,
		check(card) {
			const player = _status.event.player;
			if (get.color(card) === "red" && game.hasPlayer(current => current !== player && current.isDamaged() && get.attitude(player, current) > 2)) {
				return 2;
			}
			if (get.natureList(card).length) {
				return 1.5;
			}
			return 1;
		},
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const cards = event.cards;
			const target = event.target;
			await player.give(cards, target, true);
			await player.recover();
			let num = 1;
			if (get.natureList(cards[0]).length) {
				num++;
			}
			await player.draw({ nodelay: true });
			await target.draw(num);
			if (get.color(cards[0]) === "red") {
				await target.recover();
			}
		},
		ai: {
			order: 1,
			result: {
				player(player, target) {
					return player.isDamaged() ? 1 : 0;
				},
				target(player, target) {
					if (!ui.selected.cards.length) {
						return 1;
					}
					let num = 1;
					if (get.natureList(ui.selected.cards[0]).length) {
						num++;
					}
					if (target.hasSkillTag("nogain")) {
						num = 0;
					}
					if (get.color(ui.selected.cards[0]) === "red") {
						return num + 2;
					}
					return num + 1;
				},
			},
		},
	}
```

### huaizi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## liyixiejing 名字:李异谢旌 势力:wu

### dcdouzhen 名字:斗阵
描述: 锁定技。①转换技。你的回合内，阳：当你使用非转化且对应的实体牌为一张黑色基本牌的【决斗】时，你获得目标角色各一张牌并获得1枚“☯”；阴：当你使用或打出非转化且对应的实体牌为一张红色基本牌的【杀】时，你获得1枚“☯”。②若你的“☯”数为：偶数，你的黑色基本牌均视为【决斗】；奇数，你的红色基本牌均视为无次数限制的普【杀】。
```js
dcdouzhen: {
		audio: 2,
		trigger: {
			player: ["useCard", "respond"],
		},
		forced: true,
		zhuanhuanji: "number",
		mark: true,
		marktext: "☯",
		intro: {
			content(storage, player) {
				let str = `<li>已转换过${get.cnNumber(storage || 0)}次。<li>你的回合内，`;
				str += player.countMark("dcdouzhen") % 2 ? "你的红色基本牌均视为普【杀】且无次数限制。" : "你的黑色基本牌均视为【决斗】且使用时获得目标的一张牌。";
				return str;
			},
		},
		filter(event, player) {
			if (player !== _status.currentPhase || !event.card.isCard || !event.cards || event.cards.length !== 1 || get.type(event.cards[0]) !== "basic") {
				return false;
			}
			if (player.countMark("dcdouzhen") % 2) {
				return get.color(event.cards[0]) === "red" && event.card.name === "sha";
			}
			return event.name !== "respond" && get.color(event.cards[0]) === "black" && event.card.name === "juedou";
		},
		async content(event, trigger, player) {
			if (player.countMark("dcdouzhen") % 2) {
				if (trigger.addCount !== false) {
					trigger.addCount = false;
					const stat = player.getStat().card;
					const name = trigger.card.name;
					if (stat[name] > 0) {
						stat[name]--;
					}
				}
				player.changeZhuanhuanji("dcdouzhen");
				return;
			}
			if (trigger.targets.some(target => target.hasGainableCards(player, "he"))) {
				await player.gainMultiple(trigger.targets.sortBySeat(), "he");
			}
			player.changeZhuanhuanji("dcdouzhen");
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					if (card.name !== "juedou") {
						return;
					}
					if (
						player.hasSkillTag(
							"directHit_ai",
							true,
							{
								target,
								card,
							},
							true
						)
					) {
						return [1, 1];
					}
					const hs1 = target.getCards("h", "sha");
					const hs2 = player.getCards("h", card => (get.color(card) === "red" && get.type(card) === "basic") || get.name(card) === "sha");
					const hsx = target.getCards("h");
					if (hs1.length > hs2.length + 1 || (hsx.length > 2 && hs2.length === 0 && hsx[0].number < 6) || (hsx.length > 3 && hs2.length === 0) || (hs1.length > hs2.length && (!hs2.length || hs1[0].number > hs2[0].number))) {
						return [1, -2];
					}
					return [1, -0.5];
				},
			},
		},
		mod: {
			cardname(card, player) {
				if (get.type(card, null, false) !== "basic" || player !== _status.currentPhase) {
					return;
				}
				if (player.countMark("dcdouzhen") % 2) {
					if (get.color(card) === "red") {
						return "sha";
					}
					return;
				}
				if (get.color(card) === "black") {
					return "juedou";
				}
			},
			cardnature(card, player) {
				if (get.type(card, null, false) !== "basic" || player !== _status.currentPhase) {
					return;
				}
				if (player.countMark("dcdouzhen") % 2 && get.color(card) === "red") {
					return false;
				}
			},
			cardUsable(card, player) {
				if (_status.currentPhase === player && card.name === "sha" && player.countMark("dcdouzhen") % 2 && get.color(card) === "red" && card.isCard) {
					return Infinity;
				}
			},
		},
	}
```

## mushun 名字:穆顺 势力:qun

### dcjinjian 名字:劲坚
描述: ①当你受到其他角色造成的伤害后或造成伤害后，你获得一枚“劲”。然后你可以和伤害来源拼点，若你赢，你恢复1点体力。②你的攻击范围+X（X为“劲”数）。
```js
dcjinjian: {
		audio: 2,
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		forced: true,
		locked: false,
		filter(event, player, name) {
			return name === "damageSource" || (event.source && event.source !== player && event.source.isIn());
		},
		async content(event, trigger, player) {
			player.addMark("dcjinjian", 1);
			await game.delayx();
			const source = trigger.source;
			if (!source || source === player || !source.isIn() || !player.canCompare(source)) {
				return;
			}
			const goon = (player.countCards("h") === 1 || player.hasCard(card => get.value(card) <= 5 || get.number(card) > 10)) && (get.attitude(player, source) <= 0 || source.countCards("h") >= 4);
			const result = await player
				.chooseBool({
					prompt: `是否和${get.translation(source)}拼点？`,
					prompt2: "若你赢，则你恢复1点体力",
					ai: () => _status.event.goon,
				})
				.set("goon", goon)
				.forResult();
			if (!result.bool) {
				return;
			}
			player.line(source, "green");
			const result2 = await player.chooseToCompare(source).forResult();
			if (result2.bool) {
				await player.recover();
			}
		},
		intro: {
			name2: "劲",
			content: "mark",
		},
		mod: {
			attackRange(player, num) {
				return num + player.countMark("dcjinjian");
			},
		},
	}
```

### dcshizhao 名字:失诏
描述: 锁定技。每回合限一次，当你于回合外失去手牌后，若你没有手牌，且你：有“劲”，则你移去一枚“劲”并摸两张牌；没有“劲”，则你本回合下一次受到的伤害+1。
```js
dcshizhao: {
		audio: 2,
		usable: 1,
		trigger: {
			player: ["loseAfter"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		forced: true,
		filter(event, player) {
			return player !== _status.currentPhase && !player.hasCards("h") && event.getl(player).hs.length > 0;
		},
		async content(event, trigger, player) {
			if (!player.hasMark("dcjinjian")) {
				player.addTempSkill("dcshizhao_effect");
				player.addMark("dcshizhao_effect", 1, false);
				await game.delayx();
				return;
			}
			player.removeMark("dcjinjian", 1);
			await player.draw(2);
		},
		subSkill: {
			effect: {
				audio: "dcshizhao",
				charlotte: true,
				onremove: true,
				trigger: { player: "damageBegin1" },
				forced: true,
				async content(event, trigger, player) {
					trigger.num += player.countMark(event.name);
					player.removeSkill(event.name);
				},
			},
		},
		ai: {
			combo: "dcjinjian",
			halfneg: true,
		},
	}
```

## dc_zhaoyǎn 名字:赵俨 势力:wei

### dcfuning 名字:抚宁
描述: 当你使用牌时，你可以摸两张牌，然后弃置X张牌（X为你本回合内发动过〖抚宁〗的次数）。
```js
dcfuning: {
		audio: 2,
		trigger: { player: "useCard" },
		prompt2(event, player) {
			const num = 1 + player.getHistory("useSkill", evt => evt.skill === "dcfuning").length;
			return `摸两张牌，然后弃置${get.cnNumber(num)}张牌`;
		},
		check(event, player) {
			return player.getHistory("useSkill", evt => evt.skill === "dcfuning").length < 2;
		},
		async content(event, trigger, player) {
			await player.draw(2);
			const num = player.getHistory("useSkill", evt => evt.skill === "dcfuning").length;
			await player.chooseToDiscard({ position: "he", forced: true, selectCard: num });
		},
	}
```

### dcbingji 名字:秉纪
描述: 出牌阶段每种花色各限一次。若你有手牌且这些牌的花色均相同，则你可以展示手牌，然后选择一名其他角色，视为对其使用一张【杀】或【桃】（有距离限制）。
```js
dcbingji: {
		mod: {
			cardUsable(card, player, num) {
				if (card.storage?.dcbingji) {
					return Infinity;
				}
			},
			cardEnabled(card, player) {
				if (card.storage?.dcbingji) {
					return true;
				}
			},
		},
		locked: false,
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			const hs = player.getCards("h");
			const suits = player.getStorage("dcbingji_used");
			if (!hs.length) {
				return false;
			}
			const suit = get.suit(hs[0], player);
			if (suit === "none" || suits.includes(suit)) {
				return false;
			}
			for (const card of hs.slice(1)) {
				if (get.suit(card, player) !== suit) {
					return false;
				}
			}
			return true;
		},
		ai: {
			order: 10,
			result: { player: 1 },
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("秉纪", [["sha", "tao"], "vcard"], "hidden");
			},
			filter(button, player) {
				return lib.filter.cardEnabled(
					{
						name: button.link[2],
						isCard: true,
						storage: { dcbingji: true },
					},
					player,
					"forceEnable"
				);
			},
			check(button) {
				const card = {
					name: button.link[2],
					isCard: true,
					storage: { dcbingji: true },
				};
				const player = _status.event.player;
				const targets = game.filterPlayer(target => {
					if (player === target) {
						return false;
					}
					return lib.filter.targetEnabled2(card, player, target) && lib.filter.targetInRange(card, player, target);
				});
				return Math.max(...targets.map(target => get.effect(target, card, player, player)));
			},
			backup(links, player) {
				return {
					viewAs: {
						name: links[0][2],
						isCard: true,
						storage: { dcbingji: true },
					},
					filterCard: () => false,
					selectCard: -1,
					filterTarget(card, player, target) {
						if (!card) {
							card = get.card();
						}
						if (player === target) {
							return false;
						}
						return lib.filter.targetEnabled2(card, player, target) && lib.filter.targetInRange(card, player, target);
					},
					selectTarget: 1,
					ignoreMod: true,
					filterOk: () => true,
					log: false,
					async precontent(event, trigger, player) {
						player.logSkill("dcbingji");
						const hs = player.getCards("h");
						event.getParent().addCount = false;
						await player.showCards(hs, `${get.translation(player)}发动了【秉纪】`);
						player.markAuto("dcbingji_used", [get.suit(hs[0], player)]);
						player.addTempSkill("dcbingji_used");
					},
				};
			},
			prompt(links, player) {
				return `请选择【${get.translation(links[0][2])}】的目标`;
			},
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

## wangwei 名字:王威 势力:qun

### dcruizhan 名字:锐战
描述: 其他角色的准备阶段开始时，若其的手牌数不小于其体力值，则你可以和其拼点。若你赢或拼点牌中有【杀】，则你视为对其使用一张【杀】。然后若此【杀】造成了伤害且以上两个条件均被满足，则你获得其一张牌。
```js
dcruizhan: {
		audio: 2,
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player !== event.player && event.player.countCards("h") >= Math.max(1, event.player.hp) && player.canCompare(event.player);
		},
		logTarget: "player",
		check(event, player) {
			const goon = player.hasCard(card => card.name === "sha" || get.value(card) <= 5);
			const target = event.player;
			if (goon && get.attitude(player, target) < 0) {
				return get.effect(target, { name: "sha" }, player, player) > 0;
			}
			return 0;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const result = await player
				.chooseToCompare(target, card => {
					if (typeof card === "string" && lib.skill[card]) {
						const ais = lib.skill[card].check || (() => 0);
						return ais();
					}
					const owner = get.owner(card);
					const getn = card => {
						if (owner.hasSkill("tianbian") && get.suit(card) === "heart") {
							return 13;
						}
						return get.number(card);
					};
					const compareEvent = _status.event.getParent();
					let addi = get.value(card) >= 8 && get.type(card) !== "equip" ? -6 : 0;
					if (card.name === "du") {
						addi -= 5;
					}
					if (owner === compareEvent.player) {
						if (get.name(card, owner) === "sha") {
							return 10 + getn(card);
						}
						return getn(card) - get.value(card) / 2 + addi;
					}
					if (get.name(card, owner) === "sha") {
						return -10 - getn(card) - get.value(card) / 2 + addi;
					}
					return getn(card) - get.value(card) / 2 + addi;
				})
				.forResult();
			const compareWon = result.bool;
			const revealedSha = get.name(result.player, player) === "sha" || get.name(result.target, target) === "sha";
			if ((!compareWon && !revealedSha) || !player.canUse("sha", target, false)) {
				return;
			}
			await player.useCard({
				card: { name: "sha", isCard: true },
				targets: [target],
				addCount: false,
			});
			if (!compareWon || !revealedSha || !target.hasCard(card => lib.filter.canBeGained(card, player, target), "he")) {
				return;
			}
			const dealtDamage = player.hasHistory("sourceDamage", evt => {
				const useEvent = evt.getParent("useCard");
				return useEvent && useEvent.card === evt.card && useEvent.getParent() === event;
			});
			if (dealtDamage) {
				await player.gainPlayerCard({
					target,
					forced: true,
					position: "he",
				});
			}
		},
	}
```

### dcshilie 名字:示烈
描述: ①出牌阶段限一次。你可以选择一项：⒈回复1点体力，将两张牌置于武将牌上作为“示烈”。若“示烈”牌数大于存活人数，则你将最早的多余牌置入弃牌堆；⒉失去1点体力，获得两张“示烈”牌。（满血则不回血，无牌则不移动）②当你死亡时，你可以将所有“示烈”牌交给一名不为伤害来源的其他角色。
```js
dcshilie: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog(
					"示烈：请选择一项",
					[
						[
							["recover", "回复1点体力，将两张牌置于武将牌上作为“示烈”"],
							["losehp", "失去1点体力，获得两张“示烈”牌"],
						],
						"textbutton",
					],
					"hidden"
				);
			},
			check(button) {
				return button.link === "recover" ? 1 : 0;
			},
			backup(links, player) {
				return get.copy(lib.skill[`dcshilie_${links[0]}`]);
			},
			prompt: () => "点击“确定”以执行选项",
		},
		intro: {
			markcount: "expansion",
			content: "expansion",
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile({ cards });
			}
		},
		group: "dcshilie_die",
		ai: {
			order: 0.5,
			result: {
				player(player) {
					if (player.isDamaged() && !player.countCards("h", "tao")) {
						return 1;
					}
					return 0;
				},
			},
		},
		subSkill: {
			backup: {},
			recover: {
				audio: "dcshilie",
				selectCard: -1,
				selectTarget: -1,
				filterCard: () => false,
				filterTarget: () => false,
				multitarget: true,
				async content(event, trigger, player) {
					await player.recover();
					const hs = player.getCards("he");
					if (!hs.length) {
						return;
					}
					let cards = hs;
					if (hs.length > 2) {
						const result = await player
							.chooseCard({
								position: "he",
								selectCard: 2,
								forced: true,
								prompt: "选择两张牌作为“示烈”牌",
							})
							.forResult();
						if (!result.bool) {
							return;
						}
						cards = result.cards;
					}
					await player.addToExpansion({
						cards,
						source: player,
						animate: "give",
						gaintag: ["dcshilie"],
					});
					const expansions = player.getExpansions("dcshilie");
					const count = game.countPlayer();
					if (expansions.length > count) {
						await player.loseToDiscardpile({ cards: expansions.slice(count) });
					}
				},
			},
			losehp: {
				audio: "dcshilie",
				selectCard: -1,
				selectTarget: -1,
				filterCard: () => false,
				filterTarget: () => false,
				multitarget: true,
				async content(event, trigger, player) {
					await player.loseHp();
					const hs = player.getExpansions("dcshilie");
					if (!hs.length) {
						return;
					}
					let cards = hs;
					if (hs.length > 2) {
						const result = await player
							.chooseButton({
								createDialog: ["选择获得两张“示烈”牌", hs],
								selectButton: 2,
								forced: true,
							})
							.forResult();
						if (!result.bool) {
							return;
						}
						cards = result.links;
					}
					await player.gain({ cards, animate: "gain2" });
				},
			},
			die: {
				audio: "dcshilie",
				forceDie: true,
				trigger: { player: "die" },
				filter(event, player) {
					return player.getExpansions("dcshilie").length > 0;
				},
				direct: true,
				skillAnimation: true,
				animationColor: "metal",
				async content(event, trigger, player) {
					const result = await player
						.chooseTarget({
							prompt: get.prompt("dcshilie"),
							prompt2: "令一名角色获得你的“示烈”牌",
							filterTarget: (card, player, target) => target !== player && target !== _status.event.getTrigger().source,
						})
						.forResult();
					if (!result.bool) {
						return;
					}
					const target = result.targets[0];
					player.logSkill("dcshilie_die", target);
					await player.give(player.getExpansions("dcshilie"), target, "give");
				},
			},
		},
	}
```

## dc_huban 名字:胡班 势力:wei

### dcchongyi 名字:崇义
描述: ①一名角色使用【杀】时，若此牌是其于当前出牌阶段内使用的第一张牌，则你可以令其摸两张牌，且其本回合使用【杀】的次数上限+1。②一名角色的出牌阶段结束时，若其于此阶段内使用的最后一张牌为【杀】，则你可以令其本回合的手牌上限+1，然后你获得此【杀】。
```js
dcchongyi: {
		audio: 2,
		init: () => {
			game.addGlobalSkill("dcchongyi_ai");
		},
		onremove: () => {
			if (!game.hasPlayer(i => i.hasSkill("dcchongyi", null, null, false), true)) {
				game.removeGlobalSkill("dcchongyi_ai");
			}
		},
		trigger: { global: "useCard" },
		logTarget: "player",
		filter(event, player) {
			if (event.card.name !== "sha" || !event.player.isIn()) {
				return false;
			}
			const evt = event.getParent("phaseUse");
			if (!evt || evt.player !== event.player) {
				return false;
			}
			const firstUse = event.player.getHistory("useCard").find(evtx => evtx.getParent("phaseUse") === evt);
			return firstUse === event;
		},
		prompt2: event => "令其摸两张牌，且使用【杀】的次数上限+1",
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			await target.draw(2);
			target.addMark("dcchongyi_sha", 1, false);
			target.addTempSkill("dcchongyi_sha");
		},
		group: "dcchongyi_end",
		subSkill: {
			ai: {
				mod: {
					aiOrder(player, card, num) {
						if (card.name !== "sha") {
							return;
						}
						const evt = _status.event.getParent("phaseUse");
						if (!evt || evt.player !== player) {
							return;
						}
						if (player.hasHistory("useCard", evtx => evtx.getParent("phaseUse") === evt)) {
							return;
						}
						if (game.hasPlayer(current => current.hasSkill("dcchongyi") && get.attitude(player, current) >= 0)) {
							return num + 10;
						}
					},
				},
				trigger: { player: "dieAfter" },
				filter: () => !game.hasPlayer(i => i.hasSkill("dcchongyi", null, null, false), true),
				silent: true,
				forceDie: true,
				content: async () => {
					game.removeGlobalSkill("dcchongyi_ai");
				},
			},
			end: {
				audio: "dcchongyi",
				trigger: { global: "phaseUseEnd" },
				logTarget: "player",
				filter(event, player) {
					if (!event.player.isIn()) {
						return false;
					}
					const history = event.player.getHistory("useCard", evt => evt.getParent("phaseUse") === event);
					return history.length && history[history.length - 1].card.name === "sha";
				},
				prompt2(event, player) {
					const target = event.player;
					const history = target.getHistory("useCard", evt => evt.getParent("phaseUse") === event);
					const evt = history.lastItem;
					const cards = evt.cards.filterInD("d");
					let str = `令${get.translation(target)}本回合的手牌上限+1`;
					if (cards.length) {
						str += `，然后你获得${get.translation(cards)}`;
					}
					str += "。";
					return str;
				},
				check(event, player) {
					return get.attitude(player, event.player) > 0;
				},
				async content(event, trigger, player) {
					const target = trigger.player;
					target.addMark("dcchongyi_keep", 1, false);
					target.addTempSkill("dcchongyi_keep");
					const history = target.getHistory("useCard", evt => evt.getParent("phaseUse") === trigger);
					const evt = history.lastItem;
					const cards = evt.cards.filterInD("d");
					if (!cards.length) {
						await game.delayx();
						return;
					}
					await player.gain({ cards, animate: "gain2" });
				},
			},
			sha: {
				charlotte: true,
				mod: {
					cardUsable(card, player, num) {
						if (card.name === "sha") {
							return num + player.countMark("dcchongyi_sha");
						}
					},
				},
				onremove: true,
				intro: { content: "使用【杀】的次数上限+#" },
			},
			keep: {
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("dcchongyi_keep");
					},
				},
				onremove: true,
				intro: { content: "手牌上限+#" },
			},
		},
	}
```

## niufu 名字:牛辅 势力:qun

### dcxiaoxi 名字:宵袭
描述: 锁定技。出牌阶段开始时，你声明X并减X点体力上限（X∈[1,2]）。然后你选择一名攻击范围内的其他角色并选择一项：⒈获得该角色的X张牌。⒉视为对其使用X张【杀】。
```js
dcxiaoxi: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		forced: true,
		filter(event, player) {
			return player.maxHp > 1;
		},
		async content(event, trigger, player) {
			let index = 0;
			if (player.maxHp > 2) {
				const controlResult = await player
					.chooseControl({
						controls: ["1点", "2点"],
						prompt: "宵袭：减少1或2点体力上限",
						ai: () => {
							if (
								!game.hasPlayer(current => {
									if (!player.inRange(current) || get.attitude(player, current) >= 0) {
										return false;
									}
									if (get.effect(current, { name: "shunshou_copy2" }, player, player) > 0 && current.countCards("h") + current.countCards("e", card => get.value(card, current) > 0) > 1) {
										return true;
									}
									if (get.effect(current, { name: "sha" }, player, player) > 0 && current.countCards("hs", "shan") + current.hp > 1) {
										return true;
									}
								})
							) {
								return 0;
							}
							return 1;
						},
					})
					.forResult();
				index = controlResult.index;
			}
			const num = 1 + index;
			await player.loseMaxHp(num);
			if (!game.hasPlayer(current => player.inRange(current))) {
				return;
			}
			const targetResult = await player
				.chooseTarget({
					prompt: "请选择【宵袭】的目标",
					prompt2: `然后你选择一项：⒈获得该角色的${get.cnNumber(num)}张牌。⒉视为对其使用${get.cnNumber(num)}张【杀】。`,
					filterTarget: (_card, player, target) => player.inRange(target),
					forced: true,
					ai: target => {
						if (get.attitude(player, target) >= 0) {
							return 0;
						}
						let gainEffect = get.effect(target, { name: "shunshou_copy2" }, player, player);
						if (gainEffect > 0 && target.countCards("h") + target.countCards("e", card => get.value(card, target) > 0) > 1) {
							gainEffect *= 1.6;
						}
						let damageEffect = player.canUse("sha", target) ? get.effect(target, { name: "sha" }, player, player) : 0;
						if (damageEffect > 0 && target.countCards("hs", "shan") + target.hp > 1) {
							damageEffect *= 2;
						}
						return Math.max(gainEffect, damageEffect);
					},
				})
				.forResult();
			const target = targetResult.targets[0];
			player.line(target, "green");
			const canGain = target.countGainableCards(player, "he") > 0;
			const canUseSha = player.canUse("sha", target);
			if (!canGain && !canUseSha) {
				return;
			}
			let choiceIndex = canGain ? 0 : 1;
			if (canGain && canUseSha) {
				const targetName = get.translation(target);
				const countText = get.cnNumber(num);
				const choiceResult = await player
					.chooseControl({
						choiceList: [`获得${targetName}的${countText}张牌`, `视为对${targetName}使用${countText}张【杀】`],
						ai: () => {
							let gainEffect = get.effect(target, { name: "shunshou_copy2" }, player, player);
							if (gainEffect > 0 && target.countCards("h") + target.countCards("e", card => get.value(card, target) > 0) > 1) {
								gainEffect *= 1.6;
							}
							let damageEffect = player.canUse("sha", target) ? get.effect(target, { name: "sha" }, player, player) : 0;
							if (damageEffect > 0 && target.countCards("hs", "shan") + target.hp > 1) {
								damageEffect *= 2;
							}
							return gainEffect > damageEffect ? 0 : 1;
						},
					})
					.forResult();
				choiceIndex = choiceResult.index;
			}
			if (choiceIndex === 0) {
				await player.gainPlayerCard({
					target,
					forced: true,
					selectButton: num,
					position: "he",
				});
				return;
			}
			for (let i = 0; i < num; i++) {
				if (!player.canUse("sha", target, false)) {
					break;
				}
				await player.useCard({
					card: { name: "sha", isCard: true },
					targets: [target],
					addCount: false,
				});
			}
		},
		ai: {
			neg: true,
		},
	}
```

### xiongrao 名字:熊扰
描述: 限定技。准备阶段开始时，你可以选择所有其他角色。这些角色本回合内所有不为锁定技、限定技、觉醒技的普通技能失效。然后你将体力上限增加至7点并摸X张牌（X为你以此法增加的体力上限数）。
```js
xiongrao: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		limited: true,
		skillAnimation: true,
		animationColor: "soil",
		prompt(event, player) {
			return `是否发动【熊扰】？（可摸${get.cnNumber(Math.max(0, 7 - player.maxHp))}张牌）`;
		},
		logTarget: (event, player) => game.filterPlayer(current => current !== player),
		check(event, player) {
			return player.maxHp <= 3;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			game.countPlayer(current => {
				if (current !== player) {
					current.addTempSkill("xiongrao_blocker");
				}
			});
			const num = 7 - player.maxHp;
			if (num > 0) {
				await player.gainMaxHp(num);
				await player.draw(num);
			}
		},
		subSkill: {
			blocker: {
				init(player, skill) {
					player.addSkillBlocker(skill);
				},
				onremove(player, skill) {
					player.removeSkillBlocker(skill);
				},
				charlotte: true,
				locked: true,
				skillBlocker(skill, player) {
					const info = get.info(skill);
					return info && !info.charlotte && !info.persevereSkill && !get.is.locked(skill) && !info.limited && !info.juexingji;
				},
				mark: true,
				marktext: "扰",
				intro: {
					content(list, player, skill) {
						const storage = player.getSkills(null, false, false).filter(i => lib.skill.xiongrao_blocker.skillBlocker(i, player));
						if (storage.length) {
							return `失效技能：${get.translation(storage)}`;
						}
						return "无失效技能";
					},
				},
			},
		},
	}
```

## bianxi 名字:卞喜 势力:wei

### dunxi 名字:钝袭
描述: ①当你使用具有伤害标签的牌时，你可以令一名不为你的目标角色获得一枚“钝”。②有“钝”的角色使用基本牌或锦囊牌时，若此牌目标数为1且此时没有角色处于濒死状态，你令其移去一枚“钝”。系统随机选择一名角色，并将此牌的目标改为该角色。若该角色和原目标相同，则其失去1点体力。若其正处于出牌阶段内，则结束此阶段。
```js
dunxi: {
		audio: 2,
		trigger: { player: "useCard" },
		filter(event, player) {
			if (!get.tag(event.card, "damage")) {
				return false;
			}
			return event.targets.some(target => target !== player && target.isIn());
		},
		async cost(event, trigger, player) {
			const targets = trigger.targets.filter(current => current !== player && current.isIn());
			if (targets.length === 1) {
				const target = targets[0];
				const result = await player
					.chooseBool({
						prompt: get.prompt(event.skill, target),
						prompt2: `令${get.translation(target)}获得一枚“钝”标记`,
						ai: () => _status.event.goon,
					})
					.set("goon", get.attitude(player, target) < 0)
					.forResult();
				event.result = {
					bool: result.bool,
					targets: [target],
				};
			} else {
				event.result = await player
					.chooseTarget({
						prompt: get.prompt(event.skill),
						prompt2: "选择一名目标角色获得一枚“钝”标记",
						filterTarget: (card, player, target) => target !== player && _status.event.getTrigger().targets.includes(target),
						ai: target => {
							const att = get.attitude(_status.event.player, target);
							if (att >= 0) {
								return 0;
							}
							return -att / (1 + target.hasMark("dunxi"));
						},
					})
					.forResult();
			}
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			target.addMark("dunxi", 1);
			await game.delayx();
		},
		intro: { content: "mark", name2: "钝" },
		group: "dunxi_random",
		subSkill: {
			random: {
				audio: "dunxi",
				trigger: { global: "useCard" },
				forced: true,
				locked: false,
				filter(event, player) {
					if (!event.player.hasMark("dunxi") || event.targets.length !== 1 || event._dunxi || _status.dying.length) {
						return false;
					}
					const type = get.type2(event.card, false);
					return type === "basic" || type === "trick";
				},
				logTarget: "player",
				line: "fire",
				async content(event, trigger, player) {
					trigger._dunxi = true;
					trigger.player.removeMark("dunxi", 1);
					const target = trigger.targets[0];
					trigger.targets.remove(target);
					await game.delayx();
					const filter = get.type(trigger.card) !== "delay" ? current => lib.filter.targetEnabled2(trigger.card, trigger.player, current) : current => lib.filter.judge(trigger.card, trigger.player, current);
					const list = game.filterPlayer(filter);
					if (!list.length) {
						return;
					}
					const targetx = list.randomGet();
					trigger.targets.push(targetx);
					trigger.player.line(targetx, "fire");
					game.log(trigger.card, "的目标被改为", targetx);
					if (targetx === target) {
						await trigger.player.loseHp();
						const evt = trigger.getParent("phaseUse");
						if (evt && evt.player === trigger.player) {
							evt.skipped = true;
						}
					}
				},
			},
		},
	}
```

## fengfang 名字:冯方 势力:qun

### dcditing 名字:谛听
描述: 其他角色的出牌阶段开始时，若你在该角色的攻击范围内，则你可以观看其的X张手牌（X为你的体力值）并选择其中一张，且获得如下效果：①当其使用对应实体牌包含此牌的牌指定你为目标后，你令此牌对你无效。②当其使用对应实体牌包含此牌的牌结算结束后，若你不是此牌的目标，则你摸两张牌。③其出牌阶段结束时，若此牌位于其的手牌区，则你获得此牌。
```js
dcditing: {
		audio: 2,
		trigger: { global: "phaseUseBegin" },
		logTarget: "player",
		filter(event, player) {
			return player.hp > 0 && event.player.hasCards("h") && event.player.inRange(player);
		},
		prompt2: (event, player) => `观看其${get.cnNumber(Math.min(player.hp, event.player.countCards("h")))}张手牌并选择其中一张`,
		check(event, player) {
			const target = event.player;
			if (get.attitude(player, target) > 0) {
				return true;
			}
			if (Math.min(player.hp, target.countCards("h")) > 2) {
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const cards = target.getCards("h");
			const num = Math.min(cards.length, player.hp);
			const shownCards = cards.randomGets(num);
			const result = await player
				.chooseButton({
					createDialog: [`${get.translation(target)}的手牌（${num}/${cards.length}）`, shownCards],
					forced: true,
					ai: button => {
						const player = _status.event.player;
						const target = _status.event.getTrigger().player;
						const card = button.link;
						const attitude = get.attitude(player, target);
						let value = target.getUseValue(card, null, true);
						if (value <= 0) {
							return (-get.value(card, target) / 2) * get.sgn(attitude - 0.05);
						}
						if (target.canUse(card, player) && get.effect(player, card, target, target) > 0) {
							const effect = get.effect(player, card, target, player);
							if (effect < 0) {
								value -= effect;
							}
						}
						return value;
					},
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			player.addTempSkill("dcditing_effect", "phaseUseAfter");
			player.storage.dcditing_effect = [trigger.player, result.links[0]];
		},
		subSkill: {
			effect: {
				audio: "dcditing",
				charlotte: true,
				trigger: { target: "useCardToTargeted" },
				forced: true,
				filter(event, player) {
					const list = player.storage.dcditing_effect;
					return list && event.player === list[0] && event.cards.includes(list[1]);
				},
				async content(event, trigger, player) {
					trigger.excluded.add(player);
					await game.delayx();
				},
				group: ["dcditing_draw", "dcditing_gain"],
			},
			draw: {
				audio: "dcditing",
				charlotte: true,
				trigger: { global: "useCardAfter" },
				forced: true,
				filter(event, player) {
					const list = player.storage.dcditing_effect;
					return list && event.player === list[0] && event.cards.includes(list[1]) && !event.targets.includes(player);
				},
				async content(event, trigger, player) {
					await player.draw(2);
				},
			},
			gain: {
				audio: "dcditing",
				charlotte: true,
				trigger: { global: "phaseUseEnd" },
				forced: true,
				filter(event, player) {
					const list = player.storage.dcditing_effect;
					return list && event.player === list[0] && event.player.getCards("h").includes(list[1]);
				},
				async content(event, trigger, player) {
					const list = player.storage.dcditing_effect;
					await player.gain({
						cards: [list[1]],
						source: list[0],
						animate: "giveAuto",
						bySelf: true,
					});
				},
			},
		},
	}
```

### dcbihuo 名字:避祸
描述: ①当你受到其他角色造成的伤害后，你可令一名角色下回合摸牌阶段的额定摸牌数+1。②当你对其他角色造成伤害后，你可令一名角色下回合摸牌阶段的额定摸牌数-1。
```js
dcbihuo: {
		audio: 2,
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		filter(event, player) {
			return event.source && event.player != event.source;
		},
		async cost(event, trigger, player) {
			const num = event.triggername == "damageEnd" ? 1 : -1;
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "令一名角色下回合的额定摸牌数" + (num > 0 ? "+1" : "-1"))
				.set("ai", target => {
					const { player, numx: num } = get.event();
					const att = get.attitude(player, target);
					if (num > 0) {
						if (att <= 0) {
							return 0;
						}
						if (target.hasJudge("lebu")) {
							return att / 10;
						}
						return (att / Math.sqrt(Math.min(5, 1 + target.countCards("h")))) * Math.sqrt(1 + target.hp);
					}
					if (num < 0) {
						if (att >= 0) {
							return 0;
						}
						if ((target.storage.dcbihuo_effect || 0) <= -2) {
							return -att / 10;
						}
						return (-att / Math.sqrt(Math.min(5, 1 + target.countCards("h")))) * Math.sqrt(1 + target.hp);
					}
				})
				.set("numx", num)
				.forResult();
		},
		async content(event, trigger, player) {
			const num = event.triggername == "damageEnd" ? 1 : -1;
			const target = event.targets[0];
			const effect = event.name + "_effect";
			if (typeof target.storage[effect] != "number") {
				target.storage[effect] = 0;
			}
			target.storage[effect] += num;
			target.addTempSkill(effect, { player: "phaseAfter" });
			target.markSkill(effect);
			await game.delayx();
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				trigger: { player: "phaseDrawBegin2" },
				filter(event, player) {
					return typeof player.storage.dcbihuo_effect == "number" && !event.numFixed;
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const num = player.countMark(event.name);
					trigger.num += num;
					game.log(player, "的额定摸牌数", "#g" + (num >= 0 ? "+" : "") + num);
				},
				mark: true,
				intro: { content: num => "额定摸牌数" + (num >= 0 ? "+" : "") + num },
			},
		},
	}
```

## qinyilu 名字:秦宜禄 势力:qun

### piaoping 名字:漂萍
描述: 转换技，锁定技。当你使用一张牌时，阳：你摸X张牌。阴：你弃置X张牌。（X为你本阶段内发动过〖漂萍〗的次数且至多等于你的体力值）
```js
piaoping: {
		audio: 2,
		trigger: { player: "useCard" },
		forced: true,
		zhuanhuanji: true,
		async content(event, trigger, player) {
			player.changeZhuanhuanji("piaoping");
			const num = Math.min(player.hp, player.getHistory("useSkill", evt => evt.skill === "piaoping").length);
			if (num <= 0) {
				return;
			}
			if (player.storage.piaoping === true) {
				await player.draw(num);
			} else if (player.hasCard(card => lib.filter.cardDiscardable(card, player, "piaoping"), "he")) {
				await game.delayx();
				await player.chooseToDiscard({ forced: true, position: "he", selectCard: num });
			}
		},
		mark: true,
		marktext: "☯",
		intro: {
			content(storage) {
				if (storage) {
					return "转换技，锁定技。当你使用一张牌时，你弃置X张牌。（X为你本阶段内发动过〖漂萍〗的次数且至多等于你的体力值）";
				}
				return "转换技，锁定技。当你使用一张牌时，你摸X张牌。（X为你本阶段内发动过〖漂萍〗的次数且至多等于你的体力值）";
			},
		},
	}
```

### tuoxian 名字:托献
描述: 每局游戏限一次。当你因执行〖漂萍〗的效果而弃置牌后，你可令一名其他角色获得这些牌，然后令该角色选择一项：⒈弃置区域内等量的牌。⒉令你的〖漂萍〗失效直到回合结束。
```js
tuoxian: {
		audio: 2,
		ai: { combo: "piaoping" },
		trigger: { player: "loseAfter" },
		marktext: "栗",
		filter(event, player) {
			return event.type == "discard" && event.getParent(3).name == "piaoping" && player.countMark("tuoxian") > player.countMark("tuoxian_used") && event.cards.filterInD("d").length > 0;
		},
		async cost(event, trigger, player) {
			const cards = trigger.cards.filterInD("d");
			event.result = await player
				.chooseTarget(lib.filter.notMe, get.prompt(event.skill), "令一名其他角色获得" + get.translation(cards))
				.set("ai", function (target) {
					const player = _status.event.player;
					let att = get.attitude(player, target);
					if (att < 0) {
						return 0;
					}
					if (target.hasSkillTag("nogain")) {
						att /= 10;
					}
					return att * Math.pow(1 + target.countCards("he"), 0.25);
				})
				.forResult();
			event.result.cards = cards;
		},
		async content(event, trigger, player) {
			const target = event.targets[0],
				cards = event.cards;
			player.addSkill(event.name + "_used");
			player.addMark(event.name + "_used", 1, false);
			await target.gain(cards, "gain2");
			const result = await target
				.chooseControl()
				.set("choiceList", ["弃置区域内的" + get.cnNumber(cards.length) + "张牌", "令" + get.translation(player) + "的〖漂萍〗于本回合内失效"])
				.set("ai", function () {
					const player = _status.event.player,
						target = _status.event.getParent().player;
					if (
						player.hasCard(function (card) {
							return get.effect(player, { name: card.viewAs || card.name }, player, player) < 0;
						}, "j") ||
						player.hasCard(function (card) {
							return get.value(card, player) <= 0;
						})
					) {
						return 0;
					}
					if (get.attitude(player, target) <= 0 || !target.isPhaseUsing()) {
						return 1;
					}
					if (
						!target.needsToDiscard() &&
						!target.hasCard(function (card) {
							return !target.hasValueTarget(card, null, true);
						}, "hs")
					) {
						return 1;
					}
					return 0;
				})
				.forResult();
			if (result.index == 0) {
				const num = Math.min(target.countCards("hej"), cards.length);
				if (target.countCards("j") > 0) {
					await target.discardPlayerCard(target, num, true, "hej");
				} else {
					await target.chooseToDiscard("he", true, num);
				}
			} else {
				player.tempBanSkill("piaoping");
			}
		},
		init(player) {
			player.addMark("tuoxian", 1, false);
		},
		onremove: true,
		intro: {
			name2: "栗",
			markcount(storage, player) {
				return player.countMark("tuoxian") - player.countMark("tuoxian_used");
			},
			content(storage, player) {
				return `剩余可用${player.countMark("tuoxian") - player.countMark("tuoxian_used")}次`;
			},
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

### zhuili 名字:惴栗
描述: 锁定技。当你成为其他角色使用黑色牌的目标后，若你的〖漂萍〗：处于阴状态，则你将〖漂萍〗转换至阳状态；处于阳状态，则你令〖托献〗发动次数+1，然后若〖托献〗发动次数大于3，则〖惴栗〗于本回合内失效。
```js
zhuili: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			if (player === event.player || get.color(event.card) !== "black") {
				return false;
			}
			return player.hasSkill("piaoping", null, null, false);
		},
		async content(event, trigger, player) {
			if (player.storage.piaoping === true) {
				player.changeZhuanhuanji("piaoping");
			} else {
				player.addMark("tuoxian", 1, false);
				if (player.getAllHistory("useSkill", evt => evt.skill === "tuoxian").length > 3) {
					player.tempBanSkill("zhuili");
				}
			}
			await game.delayx();
		},
		ai: { combo: "piaoping" },
	}
```

## yanrou 名字:阎柔 势力:wei

### choutao 名字:仇讨
描述: 当你使用【杀】时，或成为【杀】的目标后，你可以弃置此【杀】使用者的一张牌，令此【杀】不可被响应。若你是此【杀】的使用者，则你令此【杀】不计入次数限制。
```js
choutao: {
		audio: 2,
		trigger: {
			player: "useCard",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (event.card.name !== "sha" || !event.player.isIn()) {
				return false;
			}
			if (player === event.player) {
				return player.hasCard(card => lib.filter.cardDiscardable(card, player, "choutao"), "he");
			}
			return event.player.hasCard(card => lib.filter.canBeDiscarded(card, player, event.player), "he");
		},
		check(event, player) {
			if (player === event.player) {
				if (!player.hasCard(card => get.value(card) <= 5, "he")) {
					return false;
				}
				for (const target of event.targets) {
					const effect = get.damageEffect(target, player, player);
					if (effect < 0) {
						return false;
					}
					if (target.hasShan() && effect > 0) {
						return true;
					}
				}
				let hasSha = false;
				return (
					player.getCardUsable({ name: "sha" }) <= 0 &&
					player.hasCard(card => {
						if (!hasSha && get.name(card) === "sha" && player.getUseValue(card) > 0) {
							hasSha = true;
							return false;
						}
						return hasSha && get.value(card) <= 5;
					}, "hs")
				);
			}
			const discardEffect = get.effect(event.player, { name: "guohe_copy2" }, player, player);
			const damageEffect = get.damageEffect(player, event.player, player);
			if (!player.hasShan()) {
				return discardEffect > 0;
			}
			if (damageEffect > 0) {
				return discardEffect > 0;
			}
			return player.hp > 2 && damageEffect < discardEffect;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			if (player !== game.me && !player.isOnline() && !player.isUnderControl()) {
				await game.delayx();
			}
			if (player === trigger.player) {
				await player.chooseToDiscard({
					position: "he",
					forced: true,
					ai: card => {
						const player = _status.event.player;
						let value = player.getUseValue(card);
						if (get.name(card) === "sha" && player.getUseValue(card) > 0) {
							value += 5;
						}
						return 20 - value;
					},
				});
			} else {
				await player.discardPlayerCard({
					target: trigger.player,
					forced: true,
					position: "he",
				});
			}
			trigger.directHit.addArray(game.players);
			if (player === trigger.player && trigger.addCount !== false) {
				trigger.addCount = false;
				const stat = player.getStat().card;
				const name = trigger.card.name;
				if (typeof stat[name] === "number") {
					stat[name]--;
				}
			}
		},
	}
```

### xiangshu 名字:襄戍
描述: 限定技。结束阶段开始时，若你本回合内造成过伤害，则你可以选择一名已受伤的角色。该角色回复X点体力并摸X张牌（X为你本回合内造成的伤害值总和且至多为5）。
```js
xiangshu: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		limited: true,
		skillAnimation: true,
		animationColor: "gray",
		filter(event, player) {
			return (player.getStat("damage") ?? 0) > 0 && game.hasPlayer(current => current.isDamaged());
		},
		async cost(event, trigger, player) {
			const num = Math.min(5, player.getStat("damage") ?? 0);
			const result = await player
				.chooseTarget({
					prompt: "是否发动限定技【襄戍】？",
					prompt2: `令一名角色回复${num}点体力并摸${get.cnNumber(num)}张牌`,
					filterTarget: (card, player, target) => target.isDamaged(),
					ai: target => {
						const att = get.attitude(player, target);
						if (att > 0 && num >= Math.min(player.hp, 2)) {
							return att * Math.sqrt(target.getDamagedHp());
						}
						return 0;
					},
				})
				.forResult();
			event.result = {
				bool: result.bool,
				targets: result.targets,
				cost_data: num,
			};
		},
		async content(event, trigger, player) {
			const num = event.cost_data;
			const target = event.targets[0];
			player.awakenSkill(event.name);
			await target.recover(num);
			await target.draw(num);
			if (player !== target) {
				player.addExpose(0.2);
			}
		},
	}
```

## dc_zhuling 名字:朱灵 势力:wei

### dczhanyi 名字:战意
描述: 出牌阶段开始时，你可以弃置所有基本牌/锦囊牌/装备牌，然后获得另外两种类型的牌对应的效果直到你的下个回合开始：基本牌、你使用基本牌无距离限制，且伤害值和回复值基数+1；锦囊牌、你使用锦囊牌时摸一张牌，且锦囊牌不计入手牌上限；装备牌，当装备牌进入你的装备区时，你可弃置一名其他角色的一张牌。
```js
dczhanyi: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			const types = ["basic", "trick", "equip"];
			const cards = player.getCards("he");
			return types.some(type => {
				const ofType = cards.filter(card => get.type2(card, player) === type);
				return ofType.length > 0 && ofType.every(card => lib.filter.cardDiscardable(card, player, "dczhanyi"));
			});
		},
		async cost(event, trigger, player) {
			const allTypes = ["basic", "trick", "equip"];
			const cards = player.getCards("he");
			const types = allTypes.filter(type => {
				const ofType = cards.filter(card => get.type2(card, player) === type);
				return ofType.length > 0 && ofType.every(card => lib.filter.cardDiscardable(card, player, "dczhanyi"));
			});
			const result = await player
				.chooseControl({
					controls: [...types, "cancel2"],
					prompt: get.prompt("dczhanyi"),
					prompt2: "弃置一种类型的所有牌",
					ai: () => {
						const player = _status.event.player;
						const getval = control => {
							if (control === "cancel2") {
								return 0;
							}
							const hs = player.getCards("h");
							let eff = 0;
							const es = player.getCards("e");
							const ss = player.getCards("s");
							let sha = player.getCardUsable({ name: "sha" });
							for (const card of hs) {
								const type = get.type2(card);
								if (type === control) {
									eff -= get.value(card, player);
								} else {
									switch (type) {
										case "basic":
											if (sha > 0 && get.name(card) === "sha") {
												sha--;
												let add = 3;
												if (!player.hasValueTarget(card) && player.hasValueTarget(card, false)) {
													add += player.getUseValue(card, false);
												}
												eff += add;
											}
											break;
										case "trick":
											if (player.hasValueTarget(card)) {
												eff += 6;
											}
											break;
										case "equip":
											if (player.hasValueTarget({ name: "guohe_copy2" })) {
												eff += player.getUseValue({ name: "guohe_copy2" });
											}
											break;
									}
								}
							}
							if (control === "equip") {
								for (const card of es) {
									eff -= get.value(card, player);
								}
							} else {
								for (const card of ss) {
									const type = get.type2(card);
									if (type === control) {
										continue;
									}
									switch (type) {
										case "basic":
											if (sha > 0 && get.name(card) === "sha") {
												sha--;
												let add = 3;
												if (!player.hasValueTarget(card) && player.hasValueTarget(card, false)) {
													add += player.getUseValue(card, false);
												}
												eff += add;
											}
											break;
										case "trick":
											if (player.hasValueTarget(card)) {
												eff += 6;
											}
											break;
										case "equip":
											if (player.hasValueTarget({ name: "guohe_copy2" })) {
												eff += player.getUseValue({ name: "guohe_copy2" });
											}
											break;
									}
								}
							}
							return eff;
						};
						const controls = _status.event.controls.slice(0);
						let eff = 0;
						let current = "cancel2";
						for (const control of controls) {
							const effx = getval(control);
							if (effx > eff) {
								eff = effx;
								current = control;
							}
						}
						return current;
					},
				})
				.forResult();
			if (result.control === "cancel2") {
				return;
			}
			const cards2 = player.getCards("he", card => get.type2(card, player) === result.control);
			if (!cards2.length) {
				return;
			}
			event.result = {
				bool: true,
				cards: cards2,
				cost_data: {
					type: result.control,
				},
			};
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			const { type } = event.cost_data;
			await player.discard({ cards });
			for (const currentType of ["basic", "trick", "equip"]) {
				if (currentType !== type) {
					player.addTempSkill(`dczhanyi_${currentType}`, { player: "phaseBegin" });
				}
			}
		},
		subSkill: {
			basic: {
				audio: "dczhanyi",
				charlotte: true,
				marktext: "基",
				mark: true,
				intro: {
					content: "使用基本牌无距离限制，且伤害值和回复值基数+1",
				},
				trigger: { source: ["damageBegin1", "recoverBegin"] },
				filter(event, player) {
					const evt = event.getParent();
					return evt != null && evt.type === "card" && get.type(evt.card, null, false) === "basic";
				},
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					++trigger.num;
				},
				mod: {
					targetInRange(card) {
						if (get.type(card) === "basic") {
							return true;
						}
					},
				},
				ai: {
					damageBonus: true,
				},
			},
			trick: {
				audio: "dczhanyi",
				charlotte: true,
				marktext: "锦",
				mark: true,
				intro: {
					content: "使用锦囊牌时摸一张牌，且锦囊牌不计入本回合的手牌上限",
				},
				trigger: { player: "useCard" },
				filter(event, player) {
					return get.type2(event.card) === "trick";
				},
				forced: true,
				async content(event, trigger, player) {
					await player.draw();
				},
				mod: {
					ignoredHandcard(card, player) {
						if (get.type2(card, player) === "trick") {
							return true;
						}
					},
					cardDiscardable(card, player, name) {
						if (name === "phaseDiscard" && get.type2(card, player) === "trick") {
							return false;
						}
					},
				},
			},
			equip: {
				audio: "dczhanyi",
				charlotte: true,
				marktext: "装",
				mark: true,
				intro: {
					content: "有装备牌进入你的装备区时，可弃置一名其他角色的一张牌",
				},
				trigger: { player: "equipAfter" },
				filter(event, player) {
					return game.hasPlayer(target => target !== player && target.hasDiscardableCards(player, "he"));
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget({
							prompt: "战意：是否弃置一名其他角色的一张牌？",
							filterTarget: (_card, player, target) => target !== player && target.hasDiscardableCards(player, "he"),
							ai: target => {
								const player = _status.event.player;
								return get.effect(target, { name: "guohe_copy2" }, player, player);
							},
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					await player.discardPlayerCard({ target, position: "he", forced: true });
				},
			},
		},
	}
```

## licaiwei 名字:李采薇 势力:qun

### yijiao 名字:异教
描述: 出牌阶段限一次，你可以选择一名没有“异”标记的其他角色并声明一个整数X（X∈[1,4]），该角色获得10X个“异”标记。有“异”标记的角色的结束阶段，其移去“异”标记，且若其本回合使用牌的点数之和：1.小于“异”标记数，其随机弃置至多三张手牌；2.等于“异”标记数，你摸两张牌且该角色本回合结束后进行一个额外的回合；3.大于“异”标记数，你摸三张牌。
```js
yijiao: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => current !== player && !current.hasMark("yijiao"));
		},
		filterTarget(card, player, target) {
			return target !== player && !target.hasMark("yijiao");
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await player
				.chooseControl({
					controls: ["10个", "20个", "30个", "40个"],
					prompt: `要令${get.translation(target)}获得多少标记？`,
					ai: () => {
						const player = _status.event.player;
						const target = _status.event.getParent().target;
						if (get.attitude(player, target) < 0) {
							return 3;
						}
						return 0;
					},
				})
				.forResult();
			target.addMark("yijiao", 10 * (1 + result.index));
		},
		ai: {
			order: 1.1,
			result: {
				player: 1,
				target: -0.5,
			},
		},
		group: "yijiao_effect",
		subSkill: {
			effect: {
				audio: "yijiao",
				trigger: { global: "phaseJieshuBegin" },
				forced: true,
				filter(event, player) {
					return event.player.isIn() && event.player !== player && event.player.hasMark("yijiao");
				},
				logTarget: "player",
				async content(event, trigger, player) {
					const target = trigger.player;
					const num = target.countMark("yijiao");
					let num2 = 0;
					target.getHistory("useCard", evt => {
						const numz = get.number(evt.card);
						if (typeof numz === "number") {
							num2 += numz;
						}
					});
					if (num > num2) {
						const hs = target.getCards("h", card => lib.filter.cardDiscardable(card, target, "yijiao_effect"));
						if (hs.length) {
							await target.discard({ cards: hs.randomGets(get.rand(1, 3)) });
						}
					} else if (num === num2) {
						await target.insertPhase();
						await player.draw(2);
					} else {
						await player.draw(3);
					}
					target.removeMark("yijiao", num);
				},
			},
		},
		intro: {
			onunmark: true,
			name2: "异",
			content: "mark",
		},
	}
```

### qibie 名字:泣别
描述: 一名角色死亡后，若你有手牌且这些手牌均可被弃置，则你可以弃置所有手牌，然后回复1点体力并摸X+2张牌（X为你弃置的牌数）。
```js
qibie: {
		audio: 2,
		trigger: { global: "die" },
		filter(event, player) {
			return player.hasCards("h") && player.hasCard(card => lib.filter.cardDiscardable(card, player, "qibie"), "h");
		},
		check(event, player) {
			return player.isDamaged() && player.countCards("h", "tao") < Math.max(2, player.hp);
		},
		async content(event, trigger, player) {
			const hs = player.getCards("h");
			await player.discard({ cards: hs });
			await player.recover();
			await player.draw(hs.length + 2);
		},
	}
```

## yanfuren 名字:严夫人 势力:qun

### channi 名字:谗逆
描述: 出牌阶段限一次。你可将任意张手牌交给一名其他角色，然后其可以将至多等量的手牌当做【决斗】使用。当其因此【决斗】：造成伤害后，其摸X张牌（X为此【决斗】对应的实体牌数）；受到伤害后，你弃置所有手牌。
```js
channi: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasCards("h");
		},
		filterTarget: lib.filter.notMe,
		filterCard: true,
		selectCard: [1, Infinity],
		allowChooseAll: true,
		check(card) {
			const player = _status.event.player;
			const num = player.hasSkill("nifu") ? 15 : 8;
			if (ui.selected.cards.length <= Math.max(1, player.needsToDiscard(), player.countCards("h") - 4)) {
				return num - get.value(card);
			}
			return num / 2 - get.value(card);
		},
		position: "h",
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const { cards, target } = event;
			const giveEvent = player.give(cards, target);
			player.addTempSkill("channi_effect");
			await giveEvent;
			if (target.countCards("h") > 0) {
				game.broadcastAll(num => {
					lib.skill.channi_backup.selectCard = [1, num];
				}, cards.length);
				const next = target.chooseToUse({
					openskilldialog: `将至多${get.cnNumber(cards.length)}张手牌当做【决斗】使用`,
					norestore: true,
					addCount: false,
					_backupevent: "channi_backup",
					custom: {
						add: {},
						replace: { window() {} },
					},
				});
				next.backup("channi_backup");
				await next;
			}
			player.removeSkill("channi_effect");
		},
		subSkill: {
			effect: {
				trigger: { global: ["damageSource", "damageEnd"] },
				filter(event, player, name) {
					if (!event.card || event.card.name !== "juedou") {
						return false;
					}
					const evt = event.getParent(2);
					if (!evt || evt.name !== "useCard" || evt.card.name !== "juedou") {
						return false;
					}
					const user = evt.player;
					const evtx = event.getParent("channi", true);
					if (!evtx || evtx.player !== player) {
						return false;
					}
					if (name === "damageSource") {
						return event.source === user && evt.cards.length;
					}
					return event.player === user && player.countCards("h");
				},
				forced: true,
				charlotte: true,
				logTarget(event, player, name) {
					return event[name === "damageSource" ? "source" : "player"];
				},
				async content(event, trigger, player) {
					const evt = trigger.getParent(2);
					if (event.triggername === "damageSource") {
						await evt.player.draw(evt.cards.length);
					} else {
						await player.chooseToDiscard({
							position: "h",
							forced: true,
							selectCard: player.countCards("h"),
						});
					}
				},
			},
			backup: {
				filterCard(card) {
					return get.itemtype(card) === "card";
				},
				viewAs: { name: "juedou" },
				position: "h",
				filterTarget: lib.filter.targetEnabled,
				ai1: card => {
					if (get.name(card) === "sha") {
						return 0;
					}
					return 5.5 - get.value(card);
				},
				log: false,
				allowChooseAll: true,
			},
		},
		ai: {
			order: 0.3,
			result: {
				target(player, target) {
					if (target === game.me || target.isOnline() || target.hasValueTarget({ name: "juedou" })) {
						return 2;
					}
					if (player.needsToDiscard()) {
						return 0.5;
					}
					return 0;
				},
			},
		},
	}
```

### nifu 名字:匿伏
描述: 锁定技。一名角色的回合结束时，你将手牌摸至或弃置至四张。
```js
nifu: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		forced: true,
		filter(event, player) {
			return player.countCards("h") !== 4;
		},
		async content(event, trigger, player) {
			const num = player.countCards("h") - 4;
			if (num > 0) {
				await player.chooseToDiscard({ position: "h", selectCard: num, forced: true, allowChooseAll: true });
			} else {
				await player.draw(-num);
			}
		},
	}
```

## haomeng 名字:郝萌 势力:qun

### xiongmang 名字:雄莽
描述: 你可将任意张花色各不相同的手牌当做目标数上限为X的【杀】使用（X为此【杀】对应的实体牌数）。此【杀】使用结算结束后，若此牌造成过/未造成过伤害，则你本阶段使用【杀】的额定次数+1/减1点体力上限。
```js
xiongmang: {
		audio: 2,
		enable: "chooseToUse",
		viewAs: { name: "sha" },
		viewAsFilter(player) {
			return player.hasCards("hs");
		},
		selectCard() {
			return [1, 4];
		},
		selectTarget() {
			const card = get.card();
			const player = get.player();
			if (card === undefined) {
				return;
			}
			const range = [1, Math.max(1, ui.selected.cards.length)];
			game.checkMod(card, player, range, "selectTarget", player);
			return range;
		},
		complexCard: true,
		filterCard(card) {
			if (!ui.selected.cards.length) {
				return true;
			}
			const suit = get.suit(card);
			for (const i of ui.selected.cards) {
				if (get.suit(i) === suit) {
					return false;
				}
			}
			return true;
		},
		filterOk() {
			if (!ui.selected.targets.length) {
				return false;
			}
			const card = get.card();
			const player = get.player();
			if (card === undefined) {
				return;
			}
			const range = [1, Math.max(1, ui.selected.cards.length)];
			game.checkMod(card, player, range, "selectTarget", player);
			return (range[0] <= ui.selected.targets.length && range[1] >= ui.selected.targets.length) || range[0] === -1;
		},
		check(card) {
			const player = _status.event.player;
			card = get.autoViewAs({ name: "sha" }, ui.selected.cards.concat(card));
			if (game.countPlayer(current => (_status.event.filterTarget || lib.filter.filterTarget)(card, player, current) && get.effect_use(current, card, player, player) > 0) <= ui.selected.cards.length) {
				return 0;
			}
			return 5 - get.value(card);
		},
		position: "hs",
		onuse(links, player) {
			player.addTempSkill("xiongmang_effect");
		},
		ai: {
			order: () => get.order({ name: "sha" }) + 0.2,
			respondSha: true,
			skillTagFilter(player, tag, arg) {
				return player.hasCards("hs");
			},
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return event.skill === "xiongmang";
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					if (!game.getGlobalHistory("changeHp", evt => evt.getParent().name === "damage" && evt.getParent().card && evt.getParent().card === trigger.card).length) {
						await player.loseMaxHp();
					} else {
						player.addTempSkill("xiongmang_more", ["phaseChange", "phaseAfter"]);
						player.addMark("xiongmang_more", 1, false);
					}
				},
			},
			more: {
				charlotte: true,
				onremove: true,
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("xiongmang_more");
						}
					},
				},
				intro: { content: "使用【杀】的额定次数+#" },
			},
		},
	}
```

## re_pangdegong 名字:庞德公 势力:qun

### heqia 名字:和洽
描述: 出牌阶段开始时，你可选择一项：①将任意张牌交给一名其他角色。②令一名有手牌的其他角色交给你任意张牌。然后以此法得到牌的角色可以将一张手牌当作任意基本牌使用（此牌无距离和次数限制），且当其声明使用此牌后，可以为此牌增加至至多X个目标（X为以此法移动的牌数）。
```js
heqia: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current.countCards(current == player ? "he" : "h") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt(event.skill),
					prompt2: "操作提示：选择要给出的牌和目标角色，或直接选择一名目标角色，令其将牌交给自己",
					filterCard: true,
					position: "he",
					selectCard() {
						if (ui.selected.targets.length && !ui.selected.targets[0].countCards("h")) {
							return [1, Infinity];
						}
						return [0, Infinity];
					},
					filterTarget(card, player, target) {
						if (player == target) {
							return false;
						}
						if (!ui.selected.cards.length) {
							return target.countCards("h") > 0;
						}
						return true;
					},
					allowChooseAll: true,
					ai1(card) {
						if (!get.event().nogive || ui.selected.cards.length) {
							return 0 - get.value(card);
						}
						return 1 / Math.max(1, get.value(card));
					},
					ai2(target) {
						return (get.attitude(get.player(), target) - 0.1) * (ui.selected.cards.length ? 1 : -1);
					},
					nogive: !game.hasPlayer(current => current != player && get.attitude(player, current) <= 0 && current.countCards("h")),
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cards,
			} = event;
			let source, num;
			if (cards?.length) {
				await player.give(cards, target);
				source = target;
				num = cards.length;
			} else if (target.countCards("h")) {
				event.source = target;
				const result = await target
					.chooseToGive(player, "he", true, [1, Infinity], `选择交给${get.translation(player)}任意张牌`, "allowChooseAll")
					.set("ai", card => -get.value(card))
					.forResult();
				if (result?.cards?.length) {
					source = player;
					num = result.cards.length;
				}
			}
			event.num = num;
			if (source?.isIn() && source.countCards("h")) {
				const list = get.inpileVCardList(info => {
					if (info[0] != "basic") {
						return false;
					}
					return source.hasUseTarget({ name: info[2], nature: info[3] }, false);
				});
				if (!list.length) {
					return;
				}
				const result = await source
					.chooseButton(["是否将一张手牌当做一种基本牌使用？", [list, "vcard"]])
					.set("ai", button => get.player().getUseValue({ name: button.link[2], nature: button.link[3] }, false))
					.forResult();
				if (!result?.links?.length) {
					return;
				}
				source.addSkill(event.name + "_add");
				const card = { name: result.links[0][2], nature: result.links[0][3] };
				game.broadcastAll(card => {
					lib.skill.heqia_backup.viewAs = card;
				}, card);
				const next = source.chooseToUse();
				next.set("openskilldialog", "将一张手牌当做" + get.translation(card) + "使用");
				next.set("norestore", true);
				next.set("addCount", false);
				next.set("_backupevent", "heqia_backup");
				next.set("custom", {
					add: {},
					replace: { window() {} },
				});
				next.backup("heqia_backup");
				await next;
			}
		},
		subSkill: {
			backup: {
				filterCard(card) {
					return get.itemtype(card) == "card";
				},
				position: "h",
				filterTarget: lib.filter.targetEnabled,
				selectCard: 1,
				check: card => 6 - get.value(card),
				log: false,
			},
			add: {
				charlotte: true,
				trigger: { player: "useCard2" },
				filter(event, player) {
					const evt = event.getParent(2);
					if (evt.name != "heqia" || !event.targets?.length || typeof evt.num != "number" || evt.num <= event.targets.length) {
						return false;
					}
					const { card } = event,
						info = get.info(card);
					if (info.allowMultiple == false) {
						return false;
					}
					if (event.targets && !info.multitarget) {
						return game.hasPlayer(current => {
							return !event.targets.includes(current) && lib.filter.targetEnabled2(card, event.player, current);
						});
					}
					return false;
				},
				async cost(event, trigger, player) {
					player.removeSkill(event.skill);
					const num = trigger.getParent(2).num - trigger.targets.length;
					const prompt2 = "是否为" + get.translation(trigger.card) + "增加至多" + get.cnNumber(num) + "个目标？";
					event.result = await player
						.chooseTarget(prompt2, [1, num], (card, player, target) => {
							return !get.event().targets.includes(target) && lib.filter.targetEnabled2(get.event().card, get.player(), target);
						})
						.set("ai", target => {
							const trigger = get.event().getTrigger();
							const player = get.player();
							return get.effect(target, trigger.card, player, player);
						})
						.set("card", trigger.card)
						.set("targets", trigger.targets)
						.forResult();
				},
				popup: false,
				async content(event, trigger, player) {
					player.line(event.targets);
					game.log(event.targets, "也成为了", trigger.card, "的目标");
					trigger.targets.addArray(event.targets);
				},
			},
		},
	}
```

### yinyi 名字:隐逸
描述: 锁定技。每回合限一次，当你受到非属性伤害时，若你的手牌数和体力值与伤害来源均不相同，则你防止此伤害。
```js
yinyi: {
		audio: 2,
		trigger: { player: "damageBegin1" },
		forced: true,
		usable: 1,
		filter(event, player) {
			return event.source && event.source.hp !== player.hp && !event.hasNature("linked") && event.source.countCards("h") !== player.countCards("h");
		},
		async content(event, trigger, player) {
			trigger.cancel();
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (!get.tag(card, "damage")) {
						return;
					}
					if (player.hp === target.hp || lib.linked.includes(get.nature(card))) {
						return;
					}
					const cards = [card];
					if (card.cards && card.cards.length) {
						cards.addArray(card.cards);
					}
					if (ui.selected.cards.length) {
						cards.addArray(ui.selected.cards);
					}
					if (player.countCards("h", cardx => !cards.includes(cardx)) === target.countCards("h")) {
						return;
					}
					return "zeroplayertarget";
				},
			},
		},
	}
```

## hanmeng 名字:韩猛 势力:qun

### jieliang 名字:截粮
描述: 其他角色的摸牌阶段开始时，你可弃置一张牌，令其本阶段的摸牌数和本回合的手牌上限-1。然后当其于本回合的弃牌阶段内因弃置而失去牌后，你可获得其中的一张。
```js
jieliang: {
		audio: 2,
		trigger: { global: "phaseDrawBegin2" },
		filter(event, player) {
			return event.player !== player && !event.numFixed && event.num > 1 && player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt2(event.skill, target),
					position: "he",
					chooseonly: true,
					ai: card => {
						if (!_status.event.goon) {
							return 0;
						}
						return 7 - get.value(card);
					},
				})
				.set("goon", get.attitude(player, target) < -2)
				.forResult();
			event.result.targets = [target];
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.discard(event.cards);
			trigger.num--;
			if (get.mode() !== "identity" || player.identity !== "nei") {
				player.addExpose(0.15);
			}
			target.addMark("jieliang_less", 1, false);
			target.addTempSkill("jieliang_less");
			player.addTempSkill("jieliang_gain");
		},
		subSkill: {
			less: {
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						return num - player.countMark("jieliang_less");
					},
				},
				onremove: true,
				intro: { content: "手牌上限-#" },
			},
			gain: {
				trigger: { global: "loseAfter" },
				charlotte: true,
				direct: true,
				filter(event, player) {
					return event.type === "discard" && event.player === _status.currentPhase && event.getParent(3).name === "phaseDiscard" && event.cards2.filterInD("d").length > 0;
				},
				async content(event, trigger, player) {
					const result = await player
						.chooseButton({
							createDialog: ["截粮：是否获得一张牌?", trigger.cards2.filterInD("d")],
							ai: button => get.value(button.link, _status.event.player),
						})
						.forResult();
					if (!result.bool) {
						return;
					}
					player.logSkill("jieliang", trigger.player);
					await player.gain({ cards: result.links, animate: "gain2" });
				},
			},
		},
	}
```

### quanjiu 名字:劝酒
描述: 锁定技。①你手牌区中的【酒】的牌名视为【杀】。②你使用对应的实体牌为一张【酒】的非转化【杀】不计入次数限制。
```js
quanjiu: {
		audio: 2,
		mod: {
			aiOrder(player, card, num) {
				if ((card.name === "jiu" || card.name === "xujiu") && get.name(card) === "sha") {
					return num + 0.5;
				}
			},
			cardname(card, player, name) {
				if (card.name === "jiu" || card.name === "xujiu") {
					return "sha";
				}
			},
		},
		trigger: { player: "useCard1" },
		forced: true,
		filter(event, player) {
			return event.addCount !== false && event.card.isCard && event.card.name === "sha" && event.cards.length === 1 && (event.cards[0].name === "jiu" || event.cards[0].name === "xujiu");
		},
		async content(event, trigger, player) {
			trigger.addCount = false;
			const stat = player.getStat().card;
			const name = trigger.card.name;
			if (typeof stat[name] === "number") {
				stat[name]--;
			}
		},
	}
```

## xinping 名字:辛评 势力:qun

### fuyuan 名字:辅袁
描述: 当你于回合外使用或打出牌时，若当前回合角色的手牌数：不小于你，你可摸一张牌；小于你，你可令其摸一张牌。
```js
fuyuan: {
		audio: 2,
		trigger: { player: ["useCard", "respond"] },
		filter(event, player) {
			const target = _status.currentPhase;
			return target && target !== player && target.isIn();
		},
		logTarget(event, player) {
			const target = _status.currentPhase;
			return target.countCards("h") < player.countCards("h") ? target : player;
		},
		check(event, player) {
			const target = lib.skill.fuyuan.logTarget(event, player);
			return get.attitude(player, target) > 0;
		},
		prompt: "是否发动【辅袁】？",
		prompt2(event, player) {
			const target = lib.skill.fuyuan.logTarget(event, player);
			return `令${get.translation(target)}${target === player ? "（你）" : ""}摸一张牌`;
		},
		async content(event, trigger, player) {
			await lib.skill.fuyuan.logTarget(trigger, player).draw();
		},
	}
```

### zhongjie 名字:忠节
描述: 当你死亡时，你可令一名其他角色加1点体力上限并回复1点体力，然后摸一张牌。
```js
zhongjie: {
		audio: 2,
		trigger: { player: "die" },
		forceDie: true,
		skillAnimation: true,
		animationColor: "gray",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: lib.filter.notMe,
					ai: target => get.attitude(_status.event.player, target),
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await target.gainMaxHp();
			await target.recover();
			await target.draw();
		},
	}
```

### yongdi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## zhangning 名字:张宁 势力:qun

### tianze 名字:天则
描述: ①其他角色于其出牌阶段内使用的第一张黑色手牌结算结束后，你可以弃置一张黑色牌，并对其造成1点伤害。②其他角色的判定生效后，若结果为黑色，则你摸一张牌。
```js
tianze: {
		audio: 2,
		trigger: { global: "useCardAfter" },
		filter(event, player) {
			if (player === event.player || !event.player.isIn() || player.hasSkill("tianze_block")) {
				return false;
			}
			let evt = event.getParent("phaseUse");
			if (!evt || evt.player !== event.player) {
				return false;
			}
			return (
				get.color(event.card) === "black" &&
				event.player.hasHistory("lose", event2 => {
					return event2 && event2.hs.length && (event2.relatedEvent || event2.getParent()) === event;
				}) &&
				event.player
					.getHistory("useCard", event2 => {
						return event2.getParent("phaseUse") === evt && get.color(event2.card) === "black";
					})
					.indexOf(event) === 0 &&
				player.hasCard(card => {
					if (_status.connectMode && get.position(card) == "h") {
						return true;
					}
					return get.color(card, player) == "black";
				}, "he")
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(
					"he",
					"chooseonly",
					function (card, player) {
						return get.color(card, player) == "black";
					},
					get.prompt(event.skill, trigger.player),
					"弃置一张黑色牌并对其造成1点伤害"
				)
				.set("ai", function (card) {
					if (!_status.event.goon) {
						return 0;
					}
					return 8 - get.value(card);
				})
				.set("goon", get.damageEffect(trigger.player, player, player) > 0)
				.set("logSkill", [event.skill, trigger.player])
				.forResult();
		},
		popup: false,
		async content(event, trigger, player) {
			await player.discard(event.cards);
			player.addTempSkill("tianze_block");
			if (get.mode() != "identity" || player.identity != "nei") {
				player.addExpose(0.2);
			}
			await trigger.player.damage();
			await game.delayx();
		},
		group: "tianze_draw",
		subSkill: {
			block: { charlotte: true },
			draw: {
				audio: "tianze",
				trigger: { global: "judgeEnd" },
				forced: true,
				locked: false,
				filter(event, player) {
					return event.player != player && event.result && event.result.color == "black";
				},
				async content(event, trigger, player) {
					await player.draw();
				},
			},
		},
	}
```

### difa 名字:地法
描述: 每回合限一次。当你于回合内得到红色牌后，你可以弃置其中一张。然后你选择一个锦囊牌的牌名，并从牌堆/弃牌堆中获得一张此牌名的牌。
```js
difa: {
		audio: 2,
		trigger: { player: "gainAfter" },
		filter(event, player) {
			if (player != _status.currentPhase) {
				return false;
			}
			var hs = player.getCards("h");
			if (!hs.length) {
				return false;
			}
			for (var i of event.cards) {
				if (hs.includes(i) && get.color(i, player) == "red" && lib.filter.cardDiscardable(i, player, "difa")) {
					return true;
				}
			}
			return false;
		},
		async cost(event, trigger, player) {
			let hs = player.getCards("h"),
				cards = trigger.cards.filter(function (i) {
					return hs.includes(i) && get.color(i, player) == "red" && lib.filter.cardDiscardable(i, player, "difa");
				}),
				tricks = [];
			for (let i = 0; i < ui.cardPile.childNodes.length; i++) {
				let card = ui.cardPile.childNodes[i],
					type = get.type2(card, false);
				if (type != "trick" || tricks.includes(type)) {
					continue;
				}
				tricks.push([card.name, get.event().player.getUseValue(card)]);
			}
			for (let i = 0; i < ui.discardPile.childNodes.length; i++) {
				let card = ui.discardPile.childNodes[i],
					type = get.type2(card, false);
				if (type != "trick" || tricks.includes(type)) {
					continue;
				}
				tricks.push([card.name, get.event().player.getUseValue(card)]);
			}
			tricks.sort((a, b) => b[1] - a[1]);
			let result = await player
				.chooseToDiscard(get.prompt2(event.skill), card => {
					return get.event().cards.includes(card);
				})
				.set("ai", card => {
					let val = get.event().val;
					if (typeof val !== "number") {
						return 0;
					}
					return val - get.value(card);
				})
				.set(
					"val",
					(function () {
						if (!tricks.length) {
							return false;
						}
						return 3 * tricks[0][1];
					})()
				)
				.set("cards", cards)
				.set("chooseonly", true)
				.forResult();
			event.result = {
				bool: result.bool,
				cards: result.cards,
				cost_data: tricks,
			};
		},
		usable: 1,
		async content(event, trigger, player) {
			await player.discard(event.cards);
			let list = lib.inpile.filter(function (i) {
				return get.type2(i, false) == "trick";
			});
			if (!list.length) {
				return;
			}
			const result = await player
				.chooseButton(["选择获得一种锦囊牌", [list.map(i => ["锦囊", "", i]), "vcard"]], true)
				.set("ai", function (button) {
					var name = button.link[2];
					for (let i of get.event().list) {
						if (i[0] == name) {
							return i[1];
						}
					}
					return 0;
				})
				.set("list", event.cost_data)
				.forResult();
			if (result.bool) {
				let card = get.cardPile(i => {
					return i.name == result.links[0][2];
				});
				if (card) {
					await player.gain(card, "gain2");
				}
			}
		},
	}
```

## tongyuan 名字:童渊 势力:qun

### chaofeng 名字:朝凤
描述: 出牌阶段限一次。当你造成伤害时，你可以弃置一张手牌，然后摸一张牌。若此伤害的渠道为牌且你弃置的牌：与此牌颜色相同，则你改为摸两张牌；与此牌类型相同，则此伤害+1。
```js
chaofeng: {
		audio: 2,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return player.countCards("h") > 0 && player.isPhaseUsing() && !player.hasSkill("chaofeng_used");
		},
		popup: false,
		async cost(event, trigger, player) {
			let str = "弃置一张手牌并摸一张牌",
				color,
				type;
			if (trigger.card) {
				type = get.type2(trigger.card, false);
				color = get.color(trigger.card, false);
				if (color != "none") {
					str += "；若弃置" + get.translation(color) + "牌则改为摸两张牌";
				}
				if (type) {
					str += "；若弃置类型为" + get.translation(type) + "的牌则伤害+1";
				}
			}
			const next = player.chooseToDiscard("h", get.prompt(event.skill, trigger.player), str);
			next.set("ai", card => {
				const { player, att, color, type } = get.event();
				let val = 4.2 - get.value(card);
				if (get.color(card) == color) {
					val += 3;
				}
				if (get.type2(card) == type) {
					if (att < 0) {
						val += 4;
					} else if (att === 0) {
						val += 2;
					} else {
						val = 0;
					}
				}
				return val;
			});
			next.set("att", get.attitude(player, trigger.player));
			next.logSkill = ["chaofeng", trigger.player];
			if (color != "none") {
				next.set("color", color);
			}
			if (type) {
				next.set("type", type);
			}
			event.result = await next.forResult();
			event.result.cost_data = [color, type];
		},
		async content(event, trigger, player) {
			player.addTempSkill(event.name + "_used", "phaseUseEnd");
			const {
				cards: [card],
				cost_data: [color, type],
			} = event;
			await player.draw(color && get.color(card, card.original == "h" ? player : false) == color ? 2 : 1);
			if (type && get.type2(card, card.original == "h" ? player : false) == type) {
				trigger.num++;
			}
		},
		subSkill: { used: { charlotte: true } },
	}
```

### chuanshu 名字:传术
描述: `限定技。准备阶段，若你已受伤；或当你死亡时，你可令一名其他角色获得${get.poptip("chaofeng")}。然后你获得${get.poptip("ollongdan")}、${get.poptip("drlt_congjian")}和${get.poptip("chuanyun")}。`
```js
chuanshu: {
		audio: 2,
		trigger: { player: ["phaseZhunbeiBegin", "die"] },
		limited: true,
		forceDie: true,
		filter(event, player) {
			return player.isDamaged() && (event.name == "die" || player.isIn()) && game.hasPlayer(current => current != player);
		},
		skillAnimation: true,
		animationColor: "gray",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(lib.filter.notMe, get.prompt2(event.skill))
				.set("ai", target => {
					return get.attitude(get.player(), target);
				})
				.set("forceDie", true)
				.forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const {
				targets: [target],
			} = event;
			await target.addSkills("chaofeng");
			if (player.isIn()) {
				await player.addSkills(get.info(event.name).derivation?.slice(1));
			}
		},
		derivation: ["chaofeng", "ollongdan", "drlt_congjian", "chuanyun"],
		ai: {
			maixie_hp: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
						if (target.isHealthy() && target.maxHp > 1 && game.hasPlayer(current => current != target && get.attitude(current, target) > 0)) {
							return [1, 1.6];
						}
					} else if (get.tag(card, "recover") && target.getDamagedHp() == 1) {
						return [0, 0];
					}
				},
			},
		},
	}
```

## sp_mifangfushiren 名字:糜芳傅士仁 势力:shu

### fengshi 名字:锋势
描述: 当你使用牌指定第一个目标后，你可弃置你与其中一名手牌数小于你的目标角色的各一张牌，并令此牌对其造成的伤害+1；当你成为其他角色使用牌的目标后，若你的手牌数小于其，则你可以弃置你与其的各一张牌，并令此牌对你造成的伤害+1。
```js
fengshi: {
		audio: "mffengshi",
		audioname: ["sp_mifangfushiren"],
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!event.isFirstTarget) {
				return false;
			}
			return event.targets.some(target => {
				return player.countCards("h") > target.countCards("h") && (target.hasCards("he") || player.hasDiscardableCards(player, "he"));
			});
		},
		direct: true,
		async content(event, trigger, player) {
			const { bool, targets } = await player
				.chooseTarget(get.prompt("fengshi"), "弃置你与一名目标角色的各一张牌，然后令" + get.translation(event.card) + "对其造成的伤害+1", (card, player, target) => {
					const targets = get.event().getTrigger().targets;
					if (!targets.includes(target)) {
						return false;
					}
					return player.countCards("h") > target.countCards("h") && target.hasCards("he");
				})
				.set("ai", target => {
					let trigger = get.event().getTrigger(),
						player = trigger.player;
					if (get.attitude(player, target) > 0) {
						return 0;
					}
					let eff = get.effect(player, { name: "guohe" }, player, get.event().player) + get.effect(target, { name: "guohe" }, player, get.event().player);
					if (get.tag(trigger.card, "damage")) {
						eff += get.effect(target, trigger.card, trigger.player, get.event().player);
					}
					return eff;
				})
				.forResult();
			if (bool) {
				const target = targets[0];
				player.logSkill("fengshi", target);
				if (player.hasDiscardableCards(player, "he")) {
					await player.chooseToDiscard("he", true);
				}
				if (target.hasCards("he")) {
					await player.discardPlayerCard(target, "he", true);
				}
				if (get.tag(trigger.card, "damage")) {
					var id = target.playerid;
					var map = trigger.getParent().customArgs;
					if (!map[id]) {
						map[id] = {};
					}
					if (typeof map[id].extraDamage != "number") {
						map[id].extraDamage = 0;
					}
					map[id].extraDamage++;
				}
			}
		},
		group: "fengshi_target",
		subSkill: {
			target: {
				trigger: { target: "useCardToTargeted" },
				filter(event, player) {
					if (event.player == event.target) {
						return false;
					}
					return event.player.countCards("h") > player.countCards("h") && (event.player.hasCards("he") || player.hasDiscardableCards(player, "he"));
				},
				audio: "mffengshi",
				audioname: ["sp_mifangfushiren"],
				logTarget(event, player) {
					return player == event.player ? event.target : event.player;
				},
				prompt2(event, player) {
					var target = lib.skill.dcmffengshi.logTarget(event, player);
					return "弃置你与" + get.translation(target) + "的各一张牌，然后令" + get.translation(event.card) + "的伤害+1";
				},
				check(event, player) {
					let viewer = get.event().player,
						user = event.player,
						target = event.target;
					if (get.attitude(player, target) > 0) {
						return 0;
					}
					let eff = get.effect(user, { name: "guohe" }, user, viewer) + get.effect(target, { name: "guohe" }, user, viewer);
					if (get.tag(event.card, "damage")) {
						eff += get.effect(target, event.card, player, viewer);
					}
					return eff > 0;
				},
				async content(event, trigger, player) {
					const target = trigger.player;
					if (player.hasDiscardableCards(player, "he")) {
						await player.chooseToDiscard("he", true);
					}
					if (target.hasCards("he")) {
						await player.discardPlayerCard(target, "he", true);
					}
					if (get.tag(trigger.card, "damage")) {
						var id = player.playerid;
						var map = trigger.getParent().customArgs;
						if (!map[id]) {
							map[id] = {};
						}
						if (typeof map[id].extraDamage != "number") {
							map[id].extraDamage = 0;
						}
						map[id].extraDamage++;
					}
				},
			},
		},
	}
```

## re_nanhualaoxian 名字:南华老仙 势力:qun

### gongxiu 名字:共修
描述: `结束阶段，若你本回合内发动过${get.poptip("jinghe")}，则你选择一项：①令所有本回合内成为过${get.poptip("jinghe")}目标的角色各摸一张牌；②令所有本回合内未成为过${get.poptip("jinghe")}目标的角色各弃置一张手牌。`
```js
gongxiu: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.hasSkill("jinghe_clear");
		},
		async cost(event, trigger, player) {
			const list1 = [];
			const list2 = [];
			let addIndex = 0;
			const choices = [];
			for (const current of game.filterPlayer()) {
				if (current.additionalSkills[`jinghe_${player.playerid}`]) {
					list1.push(current);
				} else {
					list2.push(current);
				}
			}
			list1.sortBySeat();
			if (list1.length) {
				choices.push(`令${get.translation(list1)}${list1.length > 1 ? "各" : ""}摸一张牌`);
			} else {
				addIndex++;
			}
			list2.sortBySeat();
			if (list2.length) {
				choices.push(`令${get.translation(list2)}${list2.length > 1 ? "各" : ""}弃置一张手牌`);
			}
			const result = await player
				.chooseControl({
					controls: ["cancel2"],
					choiceList: choices,
					prompt: get.prompt("gongxiu"),
					ai: () => {
						if (list2.filter(current => get.attitude(player, current) <= 0 && !current.hasSkillTag("noh")).length - list1.length > 1) {
							return 1 - addIndex;
						}
						return 0;
					},
				})
				.forResult();
			if (result.control === "cancel2") {
				event.result = { bool: false };
				return;
			}
			const discard = result.index + addIndex !== 0;
			event.result = {
				bool: true,
				targets: discard ? list2 : list1,
				cost_data: discard,
			};
		},
		async content(event, trigger, player) {
			if (event.cost_data) {
				const discardEvents = event.targets.map(current =>
					current.chooseToDiscard({
						position: "h",
						forced: true,
					})
				);
				await Promise.all(discardEvents);
				return;
			}
			await game.asyncDraw(event.targets);
			await game.delayx();
		},
		ai: {
			combo: "jinghe",
		},
	}
```

### jinghe 名字:经合
描述: `每回合限一次，出牌阶段，你可以展示至多四张牌名各不相同的手牌并选择等量的角色。系统从“写满技能的天书”（${["releiji", "rebiyue", "new_retuxi", "remingce", "xinzhiyan", "nhyinbing", "nhhuoqi", "nhguizhu", "nhxianshou", "nhlundao", "nhguanyue", "nhyanzheng"].map(skill => get.poptip(skill)).join("、")} ）中随机选择四个技能，然后这些角色依次选择获得其中的一个直到你的下回合开始。`
```js
jinghe: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return !player.hasSkill("jinghe_clear");
		},
		selectCard() {
			if (ui.selected.targets.length) {
				return [ui.selected.targets.length, 4];
			}
			return [1, 4];
		},
		selectTarget() {
			return ui.selected.cards.length;
		},
		filterTarget: true,
		filterCard(card) {
			if (ui.selected.cards.length) {
				const name = get.name(card);
				for (const selectedCard of ui.selected.cards) {
					if (get.name(selectedCard) === name) {
						return false;
					}
				}
			}
			return true;
		},
		check(card) {
			const player = _status.event.player;
			if (game.countPlayer(current => get.attitude(player, current) > 0) > ui.selected.cards.length) {
				return 1;
			}
			return 0;
		},
		position: "h",
		complexCard: true,
		discard: false,
		lose: false,
		delay: false,
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			const { cards, targets } = event;
			const showEvent = player.showCards(cards, `${get.translation(player)}发动了【经合】`);
			const skills = lib.skill.jinghe.derivation.randomGets(4);
			player.addTempSkill("jinghe_clear", { player: "phaseBegin" });
			targets.sortBySeat();
			await showEvent;
			for (const target of targets) {
				const result = await target
					.chooseControl({
						controls: [...skills, "cancel2"],
						choiceList: skills.map(skill => `<div class="skill">【${get.translation(lib.translate[`${skill}_ab`] || get.translation(skill).slice(0, 2))}】</div><div>${get.skillInfoTranslation(skill, player, false)}</div>`),
						displayIndex: false,
						prompt: "选择获得一个技能",
					})
					.forResult();
				const skill = result.control;
				if (skill !== "cancel2") {
					skills.remove(skill);
					await target.addAdditionalSkills(`jinghe_${player.playerid}`, skill, true);
				}
				if (target !== game.me && !target.isOnline2()) {
					await game.delayx();
				}
			}
		},
		ai: {
			threaten: 3,
			order: 10,
			result: {
				target: 1,
			},
		},
		derivation: ["releiji", "rebiyue", "new_retuxi", "remingce", "xinzhiyan", "nhyinbing", "nhhuoqi", "nhguizhu", "nhxianshou", "nhlundao", "nhguanyue", "nhyanzheng"],
		subSkill: {
			clear: {
				onremove(player) {
					game.countPlayer(current => current.removeAdditionalSkills(`jinghe_${player.playerid}`));
				},
			},
		},
	}
```

## dufuren 名字:杜夫人 势力:wei

### yise 名字:异色
描述: 其他角色得到你的牌后，若这些牌中：有红色牌，你可令其回复1点体力；有黑色牌，其下次受到因执行【杀】的效果造成的伤害时，此伤害+1。
```js
yise: {
		audio: 2,
		trigger: {
			global: "gainAfter",
			player: "loseAsyncAfter",
		},
		filter(event, player, name, target) {
			if (event.name == "loseAsync") {
				if (event.type != "gain") {
					return false;
				}
			}
			return target?.isIn();
		},
		getIndex(event, player) {
			const cards = event.getl?.(player)?.cards2;
			if (!cards?.length) {
				return false;
			}
			return game
				.filterPlayer(current => {
					if (current == player) {
						return false;
					}
					return event.getg?.(current)?.some(card => {
						if (!cards.includes(card)) {
							return false;
						}
						return (get.color(card, player) == "red" && current.isDamaged()) || get.color(card, player) == "black";
					});
				})
				.sortBySeat();
		},
		async cost(event, trigger, player) {
			const target = event.indexedData;
			const colors = ["red", "black"].filter(color => trigger.getg(target).some(card => trigger.getl(player).cards2.includes(card) && get.color(card, player) == color));
			const result = await player
				.chooseButton(
					[
						get.prompt(event.skill, target),
						[
							[
								["recover", `令${get.translation(target)}回复1点体力`],
								["damage", `令${get.translation(target)}下次受到【杀】造成的伤害+1`],
							],
							"textbutton",
						],
					],
					[1, colors.length]
				)
				.set("filterButton", button => {
					const { player, target, colors } = get.event();
					const link = button.link;
					if (link == "recover") {
						return colors.includes("red") && target.isDamaged();
					}
					return colors.includes("black");
				})
				.set("ai", button => {
					const { player, target, colors } = get.event();
					const link = button.link;
					if (link == "recover" && get.recoverEffect(target, player, player) > 0) {
						return 2;
					}
					if (link == "damage" && get.attitude(player, target) < 0) {
						return 1;
					}
					return 0;
				})
				.set("target", target)
				.set("colors", colors)
				.forResult();
			event.result = {
				bool: result?.bool,
				cost_data: result?.links,
				targets: [target],
			};
		},
		async content(event, trigger, player) {
			const { indexedData: target, cost_data } = event;
			if (cost_data.includes("recover")) {
				await target.recover();
			}
			if (cost_data.includes("damage")) {
				target.addSkill(event.name + "_damage");
				target.addMark(event.name + "_damage", 1, false);
				game.log(target, "下一次受到【杀】的伤害", "#g+1");
			}
		},
		subSkill: {
			damage: {
				charlotte: true,
				onremove: true,
				trigger: { player: "damageBegin3" },
				filter(event, player) {
					return event.card?.name == "sha";
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					trigger.num += player.countMark(event.name);
					player.removeSkill(event.name);
				},
				intro: { content: "下一次受到杀的伤害+#" },
			},
		},
	}
```

### shunshi 名字:顺世
描述: 准备阶段开始时，或当你于回合外受到伤害后，你可将一张牌交给一名不为伤害来源的其他角色并获得如下效果直到你的回合结束：摸牌阶段的额定摸牌数+1，使用【杀】的次数上限+1，手牌上限+1。
```js
shunshi: {
		audio: 2,
		trigger: { player: ["damageEnd", "phaseZhunbeiBegin"] },
		filter(event, player) {
			return (event.name != "damage" || player != _status.currentPhase) && player.countCards("he") > 0 && game.hasPlayer(current => current != player && current != event.source);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt2(event.skill),
					filterCard: true,
					filterTarget(card, player, target) {
						return target != player && target != _status.event.source;
					},
					position: "he",
					source: trigger.source,
					ai1(card) {
						const { player, source } = get.event();
						if (player.hasSkill("yise")) {
							if (
								get.color(card, player) == "red" &&
								game.hasPlayer(current => {
									return current != player && current != source && current.isDamaged() && get.recoverEffect(current, player, player) > 0;
								})
							) {
								return 10 - get.value(card);
							}
							if (get.color(card, player) == "black") {
								return 4 - get.value(card);
							}
						}
						return 8 - get.value(card);
					},
					ai2(target) {
						const player = get.player(),
							card = ui.selected.cards[0];
						if (player.hasSkill("yise")) {
							if (get.color(card) == "red" && target.isDamaged()) {
								return 2 * get.recoverEffect(target, player, player);
							}
							if (get.color(card) == "black") {
								return -get.attitude(player, target);
							}
						}
						if (get.value(card, target) < 0) {
							return -get.attitude(player, target);
						}
						if (get.value(card, target) < 1) {
							return 0.01 * -get.attitude(player, target);
						}
						return Math.max(1, get.value(card, target) - get.value(card, player)) * get.attitude(player, target);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await player.give(event.cards, event.targets[0]);
			player.addMark(event.name + "_mark", 1, false);
			player.addTempSkill(event.name + "_mark", { player: "phaseEnd" });
		},
		subSkill: {
			mark: {
				charlotte: true,
				onremove: true,
				trigger: { player: "phaseDrawBegin2" },
				filter(event, player) {
					return !event.numFixed;
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					trigger.num += player.countMark(event.name);
				},
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("shunshi_mark");
					},
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("shunshi_mark");
						}
					},
				},
				intro: { content: "拥有#层“顺世”效果" },
			},
		},
	}
```

## caoanmin 名字:曹安民 势力:wei

### xianwei 名字:险卫
描述: 锁定技，准备阶段，你废除一个装备栏并摸X张牌（X为你未废除的装备栏数），然后你令一名其他角色对其自己使用一张牌堆中的一张与此装备栏副类别相同的装备牌（没有可使用的牌则改为摸一张牌）。当你废除所有装备栏后，你加2点体力上限，然后你与所有其他角色视为在彼此的攻击范围内。
```js
xianwei: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return player.hasEnabledSlot();
		},
		async content(event, trigger, player) {
			const disableResult = await player
				.chooseToDisable({
					ai: (event, player, list) => {
						const getVal = num => {
							const card = player.getEquip(num);
							if (card) {
								const val = get.value(card);
								if (val > 0) {
									return 0;
								}
								return 5 - val;
							}
							switch (num) {
								case "equip3":
									return 4.5;
								case "equip4":
									return 4.4;
								case "equip5":
									return 4.3;
								case "equip2":
									return (3 - player.hp) * 1.5;
								case "equip1": {
									if (game.hasPlayer(current => (get.realAttitude || get.attitude)(player, current) < 0 && get.distance(player, current) > 1)) {
										return 0;
									}
									return 3.2;
								}
							}
						};
						list.sort((a, b) => getVal(b) - getVal(a));
						return list[0];
					},
				})
				.forResult();
			const cardType = disableResult.control;
			const num = player.countDisabledSlot();
			if (num < 5) {
				await player.draw(5 - num);
			}
			if (!game.hasPlayer(current => current !== player)) {
				return;
			}
			const targetResult = await player
				.chooseTarget({
					filterTarget: lib.filter.notMe,
					forced: true,
					prompt: `令一名其他角色从牌堆中使用一张${get.translation(cardType)}牌`,
					ai: target => {
						const card = get.cardPile2(card => get.subtype(card) === cardType && target.canUse(card, target));
						if (!card) {
							return 0;
						}
						return get.effect(target, card, target, player);
					},
				})
				.forResult();
			if (!targetResult.bool) {
				return;
			}
			const target = targetResult.targets[0];
			player.line(target, "green");
			const card = get.cardPile2(card => get.subtype(card) === cardType && target.canUse(card, target));
			if (card) {
				await target.chooseUseTarget({ card, nopopup: true, forced: true });
			} else {
				await target.draw();
			}
		},
		group: "xianwei_all",
		subSkill: {
			all: {
				audio: "xianwei",
				trigger: { player: "disableEquipAfter" },
				forced: true,
				filter(event, player) {
					return !player.hasEnabledSlot();
				},
				async content(event, trigger, player) {
					await player.gainMaxHp(2);
					player.addSkill("xianwei_effect");
				},
			},
			effect: {
				charlotte: true,
				mark: true,
				intro: { content: "和其他角色视为在彼此的攻击范围内" },
				mod: {
					inRange: () => true,
					inRangeOf: () => true,
				},
			},
		},
	}
```

## re_zoushi 名字:邹氏 势力:qun

### rehuoshui 名字:祸水
描述: 准备阶段，你可以选择至多X名其他角色（X为你已损失的体力值且至少为1）。你令这些角色中第一名角色的非锁定技失效直到回合结束；第二名角色交给你一张手牌；第三名及之后角色弃置装备区内的所有牌。
```js
rehuoshui: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			const num = Math.min(game.countPlayer() - 1, Math.max(1, player.getDamagedHp()));
			let prompt2;
			if (num > 1) {
				const descriptions = ["第一名角色的非锁定技失效直到回合结束", "；第二名角色交给你一张手牌", "；第三名及之后角色弃置装备区内的所有牌"];
				prompt2 = `选择至多${get.cnNumber(num)}名其他角色。${descriptions.slice(0, Math.min(3, num)).join("")}。`;
			} else {
				prompt2 = "令一名其他角色的非锁定技本回合内失效";
			}
			event.result = await player
				.chooseTarget({
					selectTarget: [1, num],
					prompt: get.prompt("rehuoshui"),
					prompt2,
					filterTarget: lib.filter.notMe,
					ai: target => {
						let attitude = -get.attitude(player, target);
						if (attitude <= 0) {
							return 0;
						}
						if (target.hasSkillTag("maixie") || target.hasSkill("maixie_hp") || target.hasSkill("maixie_defed")) {
							attitude *= 3;
						}
						return attitude / get.threaten(target);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const targets = event.targets;
			targets[0].addTempSkill("fengyin");
			if (targets[1]?.hasCards("h")) {
				const result = await targets[1]
					.chooseCard({
						position: "h",
						forced: true,
						prompt: `交给${get.translation(player)}一张手牌`,
					})
					.forResult();
				if (result.bool && result.cards?.length) {
					await targets[1].give(result.cards, player);
				}
			}
			for (const target of targets.slice(2)) {
				const equipCount = target.countCards("e");
				if (equipCount > 0) {
					await target.chooseToDiscard({
						position: "e",
						forced: true,
						selectCard: equipCount,
					});
				}
			}
			await game.delayx();
		},
	}
```

### reqingcheng 名字:倾城
描述: 出牌阶段限一次，你可以与一名手牌数不大于你的男性角色交换手牌。
```js
reqingcheng: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.reqingcheng.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target !== player && target.hasSex("male") && target.countCards("h") <= player.countCards("h");
		},
		async content(event, trigger, player) {
			await player.swapHandcards(event.target);
		},
		ai: {
			order: 1,
			result: {
				player(player, target) {
					if (target.hasCards("h")) {
						return -Math.max(get.value(target.getCards("h"), player) - get.value(player.getCards("h"), player), 0);
					}
					return 0;
				},
			},
		},
	}
```

## qiuliju 名字:丘力居 势力:qun

### koulve 名字:寇略
描述: 当你于出牌阶段内对其他角色造成伤害后，你可以展示其X张手牌（X为其已损失的体力值）。若这些牌中：有带有伤害标签的基本牌或锦囊牌，则你获得之；有红色牌，则你失去1点体力（若已受伤则改为减1点体力上限），然后摸两张牌。
```js
koulve: {
		audio: 2,
		trigger: { source: "damageSource" },
		logTarget: "player",
		filter(event, player) {
			return event.player.isDamaged() && event.player.countCards("h") > 0 && player.isPhaseUsing();
		},
		check(event, player) {
			if (player.hp === 1 && player.isHealthy()) {
				return false;
			}
			return get.attitude(player, event.player) <= 0;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const result = await player
				.choosePlayerCard({
					target,
					position: "h",
					forced: true,
					selectButton: target.getDamagedHp(),
				})
				.forResult();
			if (!result.bool || !result.cards?.length) {
				return;
			}
			const cards = result.cards;
			await player.showCards(cards, `${get.translation(player)}发动了【宼略】`);
			const gains = [];
			let red = false;
			for (const card of cards) {
				const type = get.type2(card, target);
				if ((type === "basic" || type === "trick") && get.tag(card, "damage") > 0) {
					gains.push(card);
				}
				if (!red && get.color(card, target) === "red") {
					red = true;
				}
			}
			if (gains.length) {
				await player.gain({ cards: gains, animate: "give" });
			}
			if (!red) {
				return;
			}
			if (player.isDamaged()) {
				await player.loseMaxHp();
			} else {
				await player.loseHp();
			}
			await player.draw(2);
		},
	}
```

### qljsuiren 名字:随认
描述: 当你死亡时，你可以将手牌中所有的带有伤害标签的基本牌或锦囊牌交给一名其他角色。
```js
qljsuiren: {
		audio: 2,
		trigger: { player: "die" },
		forceDie: true,
		skillAnimation: true,
		animationColor: "gray",
		filter(event, player) {
			return player.hasCards("h", card => {
				const type = get.type(card, null, player);
				return (type === "basic" || type === "trick") && get.tag(card, "damage") > 0;
			});
		},
		async cost(event, trigger, player) {
			const filterCard = card => {
				const type = get.type(card, null, player);
				return (type === "basic" || type === "trick") && get.tag(card, "damage") > 0;
			};
			const cards = player.getCards("h", filterCard);
			event.result = await player
				.chooseTarget({
					filterTarget: lib.filter.notMe,
					prompt: get.prompt(event.skill),
					prompt2: "将所有伤害性基本牌和锦囊牌交给一名其他角色",
					ai: target => {
						let att = get.attitude(player, target);
						if (att <= 0) {
							return 0;
						}
						if (target.hasSkillTag("nogain")) {
							att /= 100;
						}
						let num = 0.1;
						for (const card of cards) {
							num += Math.max(0, target.getUseValue(card));
						}
						return num * att;
					},
				})
				.set("forceDie", true)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const filterCard = card => {
				const type = get.type(card, null, player);
				return (type === "basic" || type === "trick") && get.tag(card, "damage") > 0;
			};
			await player.give(player.getCards("h", filterCard), target, "give");
		},
	}
```

## re_hucheer 名字:胡车儿 势力:qun

### redaoji 名字:盗戟
描述: 其他角色第一次使用武器牌时，你可选择一项：①获得此牌。②令其本回合内不能使用或打出【杀】。
```js
redaoji: {
		audio: 2,
		trigger: { global: "useCard" },
		filter(event, player) {
			if (player === event.player || get.subtype(event.card, false) !== "equip1" || (event.player.isDead() && !event.cards.filterInD().length)) {
				return false;
			}
			const all = event.player.getAllHistory("useCard");
			for (const evt of all) {
				if (get.subtype(evt.card, false) === "equip1") {
					return evt === event;
				}
			}
			return false;
		},
		async cost(event, trigger, player) {
			const cards = trigger.cards.filterInD();
			const list = [];
			const addIndex = cards.length ? 0 : 1;
			if (cards.length) {
				list.push(`获得${get.translation(cards)}`);
			}
			if (trigger.player.isIn()) {
				list.push(`令${get.translation(trigger.player)}本回合不能使用或打出【杀】`);
			}
			const result = await player
				.chooseControl({
					controls: ["cancel2"],
					choiceList: list,
					prompt: get.prompt(event.skill, trigger.player),
					ai: () => {
						if (addIndex === 0) {
							const choice = get.attitude(player, trigger.player) < 0 ? 1 : "cancel2";
							if (player.countMark("fuzhong") === 3) {
								return choice;
							}
							if (get.effect(trigger.targets[0], trigger.card, trigger.player, player) <= 0) {
								return 0;
							}
							return choice;
						}
						return get.attitude(player, trigger.player) < 0 ? 0 : "cancel2";
					},
				})
				.forResult();
			event.result = {
				bool: result.control !== "cancel2",
				targets: [trigger.player],
				cost_data: {
					index: result.index + addIndex,
					cards,
				},
			};
		},
		async content(event, trigger, player) {
			await game.delayx();
			if (event.cost_data.index === 0) {
				await player.gain({ cards: event.cost_data.cards, animate: "gain2" });
				return;
			}
			trigger.player.addTempSkill("redaoji2");
		},
	}
```

### fuzhong 名字:负重
描述: 锁定技，当你于回合外得到牌后，你获得一枚“重”标记。若X：大于0，你于摸牌阶段开始时令额定摸牌数+1；大于1，你至其他角色的距离-2；大于2，你的手牌上限+3；大于3，结束阶段开始时，你对一名其他角色造成1点伤害，然后移去4枚“重”（X为“重”数）。
```js
fuzhong: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			return player.countMark("fuzhong") > 3;
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget({
					filterTarget: lib.filter.notMe,
					prompt: "对一名其他角色造成1点伤害",
					forced: true,
					ai: target => {
						const player = _status.event.player;
						return get.damageEffect(target, player, player);
					},
				})
				.forResult();
			if (result.bool) {
				const target = result.targets[0];
				player.line(target);
				await target.damage({ nocard: true });
			}
			player.removeMark("fuzhong", 4);
		},
		marktext: "重",
		intro: { content: "mark" },
		group: ["fuzhong_gain", "fuzhong_yingzi"],
		mod: {
			maxHandcard(player, num) {
				if (player.countMark("fuzhong") > 2) {
					return num + 3;
				}
			},
			globalFrom(player, target, num) {
				if (player.countMark("fuzhong") > 1) {
					return num - 2;
				}
			},
		},
		subSkill: {
			gain: {
				audio: "fuzhong",
				trigger: {
					player: "gainAfter",
					global: "loseAsyncAfter",
				},
				forced: true,
				filter(event, player) {
					return player !== _status.currentPhase && event.getg(player).length > 0;
				},
				async content(event, trigger, player) {
					player.addMark("fuzhong", 1);
				},
			},
			yingzi: {
				audio: "fuzhong",
				trigger: { player: "phaseDrawBegin2" },
				forced: true,
				filter(event, player) {
					return !event.numFixed && player.countMark("fuzhong") > 0;
				},
				async content(event, trigger, player) {
					trigger.num++;
				},
			},
		},
	}
```

## re_dongcheng 名字:董承 势力:qun

### xuezhao 名字:血诏
描述: 出牌阶段限一次，你可弃置一张手牌并选择至多X名其他角色(X为你的体力上限）。这些角色依次选择是否交给你一张牌，若选择是，该角色摸一张牌且你本回合可多使用一张【杀】；若选择否，该角色本回合无法响应你使用的牌。若没有角色交给你牌，你将手牌摸至体力上限。
```js
xuezhao: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.maxHp > 0 && player.hasCards("h");
		},
		filterCard: true,
		position: "h",
		filterTarget: lib.filter.notMe,
		selectTarget() {
			return [1, _status.event.player.maxHp];
		},
		check(card) {
			return 2 * (_status.event.player.maxHp + 2) - get.value(card);
		},
		async content(event, trigger, player) {
			const { target } = event;
			let result = { bool: false };
			if (target.hasCards("he")) {
				result = await target
					.chooseCard({
						position: "he",
						prompt: `交给${get.translation(player)}一张牌并摸一张牌，或不能响应其使用的牌直到回合结束`,
						ai: card => {
							const player = _status.event.player;
							const target = _status.event.getParent().player;
							const val = get.value(card);
							if (get.attitude(player, target) <= 0) {
								return -val;
							}
							if (get.name(card, target) === "sha" && target.hasValueTarget(card)) {
								return 30 - val;
							}
							return 20 - val;
						},
					})
					.forResult();
			}
			if (!result.bool) {
				player.addTempSkill("xuezhao_hit");
				player.markAuto("xuezhao_hit", [target]);
				return;
			}
			player.addTempSkill("xuezhao_sha");
			player.addMark("xuezhao_sha", 1, false);
			await target.give(result.cards, player);
			await target.draw();
		},
		async contentAfter(event, trigger, player) {
			if (!player.getHistory("gain", evt => evt.getParent("useSkill") === event.getParent("useSkill")).length) {
				await player.drawTo(player.maxHp);
			}
		},
		ai: {
			threaten: 2.4,
			order: 3.6,
			result: {
				player(player, target) {
					if (get.attitude(target, player) > 0) {
						if (target.hasCards("e", card => get.value(card, target) < 0)) {
							return 3;
						}
						return Math.sqrt(target.countCards("he"));
					}
					if (target.mayHaveShan(player, "use") && player.hasCards("hs", card => !ui.selected.cards.includes(card) && get.name(card) === "sha" && player.canUse(card, target) && get.effect(target, card, player, player) !== 0)) {
						return -Math.sqrt(Math.abs(get.attitude(player, target))) / 2;
					}
					return 0.1;
				},
			},
		},
		subSkill: {
			sha: {
				charlotte: true,
				onremove: true,
				marktext: "血",
				intro: { content: "多杀#刀，誓诛曹贼！" },
				mod: {
					cardUsable(card, player, num) {
						if (card.name === "sha") {
							return num + player.countMark("xuezhao_sha");
						}
					},
				},
			},
			hit: {
				charlotte: true,
				onremove: true,
				marktext: "诏",
				intro: { content: "$篡汉，其心可诛！" },
				trigger: { player: "useCard1" },
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					trigger.directHit.addArray(player.getStorage("xuezhao_hit"));
				},
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						return player.getStorage("xuezhao_hit").includes(arg.target);
					},
				},
			},
		},
	}
```

## tangji 名字:唐姬 势力:qun

### kangge 名字:抗歌
描述: 你的第一个回合开始时，选择一名其他角色，该角色每次于其回合外得到牌后，你摸等量的牌（每回合至多摸三张）；其进入濒死状态时，你可令其回复体力至1点（每轮限一次）。该角色死亡时，你弃置所有牌并失去1点体力。
```js
kangge: {
		audio: 2,
		trigger: { player: "phaseBegin" },
		direct: true,
		filter(event, player) {
			return player.phaseNumber === 1 && !player.storage.kangge && game.hasPlayer(current => current !== player);
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget({
					prompt: "请选择【抗歌】的目标",
					prompt2: "其于回合外摸牌后，你摸等量的牌；其进入濒死状态时，你可令其回复体力至1点；其死亡后，你弃置所有牌并失去1点体力",
					filterTarget: lib.filter.notMe,
					forced: true,
					ai: target => get.attitude(_status.event.player, target),
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			const target = result.targets[0];
			player.logSkill("kangge", target);
			if ((get.mode() !== "identity" || player.identity !== "nei") && (target.identityShown || (typeof target.ai.expose === "number" && target.ai.expose > 0.5))) {
				player.addExpose(0.4);
			}
			player.addSkill("kangge_clear");
			player.storage.kangge = target;
			player.markSkill("kangge");
			await game.delayx();
		},
		intro: { content: "已指定$为目标" },
		group: ["kangge_draw", "kangge_dying", "kangge_die"],
		subSkill: {
			draw: {
				audio: "kangge",
				trigger: {
					global: ["gainAfter", "loseAsyncAfter"],
				},
				forced: true,
				filter(event, player) {
					if (player.countMark("kangge_draw") >= 3) {
						return false;
					}
					const target = player.storage.kangge;
					return target && target !== _status.currentPhase && event.getg(target).length > 0;
				},
				logTarget: "player",
				async content(event, trigger, player) {
					const num = Math.min(3 - player.countMark("kangge_draw"), trigger.getg(player.storage.kangge).length);
					player.addMark("kangge_draw", num, false);
					await player.draw(num);
				},
			},
			clear: {
				trigger: { global: "phaseBeginStart" },
				forced: true,
				firstDo: true,
				popup: false,
				charlotte: true,
				filter(event, player) {
					return player.countMark("kangge_draw") > 0;
				},
				async content(event, trigger, player) {
					player.removeMark("kangge_draw", player.countMark("kangge_draw"), false);
				},
			},
			dying: {
				audio: "kangge",
				trigger: { global: "dying" },
				logTarget: "player",
				filter(event, player) {
					return event.player === player.storage.kangge && event.player.hp < 1 && !player.hasSkill("kangge_temp");
				},
				check(event, player) {
					return get.attitude(player, event.player) > 0;
				},
				prompt2: "令其将体力值回复至1点",
				async content(event, trigger, player) {
					player.addTempSkill("kangge_temp", "roundStart");
					await trigger.player.recover(1 - trigger.player.hp);
				},
			},
			temp: {},
			die: {
				audio: "kangge",
				trigger: { global: "dieAfter" },
				filter(event, player) {
					return event.player === player.storage.kangge;
				},
				forced: true,
				async content(event, trigger, player) {
					const cards = player.getCards("he");
					if (cards.length) {
						await player.discard({ cards });
					}
					await player.loseHp();
				},
			},
		},
		ai: {
			threaten: 2,
		},
	}
```

### jielie 名字:节烈
描述: 当你受到除自己和“抗歌”角色以外的角色造成的伤害时，你可以防止此伤害并选择一种花色，然后你失去X点体力，令“抗歌”角色从弃牌堆中随机获得X张此花色的牌（X为伤害值）。
```js
jielie: {
		audio: 2,
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			return (!event.source || (event.source !== player && event.source !== player.storage.kangge)) && player.storage.kangge && player.storage.kangge.isIn();
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseControl({
					controls: [...lib.suit, "cancel2"],
					prompt: get.prompt("jielie"),
					prompt2: `防止伤害并改为失去等量体力，且令${get.translation(player.storage.kangge)}从弃牌堆中随机获得等量的花色牌`,
					ai: () => {
						if (get.attitude(player, player.storage.kangge) <= 0) {
							return "cancel2";
						}
						return lib.suit.randomGet();
					},
				})
				.forResult();
			event.result = {
				bool: result.control !== "cancel2",
				cost_data: {
					suit: result.control,
				},
			};
		},
		logTarget(_event, player) {
			return player?.storage.kangge;
		},
		async content(event, trigger, player) {
			const { suit } = event.cost_data;
			trigger.cancel();
			await player.loseHp(trigger.num);

			const cards = [];
			while (cards.length < trigger.num) {
				const card = get.discardPile(card => get.suit(card, false) === suit && !cards.includes(card), "random");
				if (card) {
					cards.push(card);
				} else {
					break;
				}
			}
			if (cards.length) {
				await player.storage.kangge.gain({
					cards,
					animate: "gain2",
				});
			}
		},
	}
```

## zhangheng 名字:张横 势力:qun

### dangzai 名字:挡灾
描述: 出牌阶段开始时，你可将一名其他角色判定区内的任意张牌移动至你的判定区内。
```js
dangzai: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return (
				!player.isDisabledJudge() &&
				game.hasPlayer(function (current) {
					return (
						current != player &&
						current.countCards("j", function (card) {
							return player.canAddJudge(card);
						}) > 0
					);
				})
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(
					function (card, player, target) {
						return (
							target != player &&
							target.countCards("j", function (card) {
								return player.canAddJudge(card);
							}) > 0
						);
					},
					get.prompt(event.skill),
					"将一名其他角色判定区内的任意张牌移动到你的判定区内"
				)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player
				.choosePlayerCard(target, "j", true, [1, Infinity])
				.set("filterButton", function (button) {
					return _status.event.player.canAddJudge(button.link);
				})
				.forResult();
			if (result.bool && result.cards) {
				while (result.cards.length) {
					const card = result.cards.shift();
					target.$give(card, player);
					await game.delay();
					const name = card.viewAs || card.name;
					if (card.name != name) {
						await player.addJudge(name, card);
					} else {
						await player.addJudge(card);
					}
				}
			}
		},
	}
```

### liangjue 名字:粮绝
描述: 锁定技，一张黑色牌进入或者离开你的判定区或装备区后，你摸两张牌，然后若你的体力值大于1，你失去1点体力。
```js
liangjue: {
		audio: 2,
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		forced: true,
		getIndex(event, player, triggername) {
			let num = 0;
			if (event.player == player) {
				if (event.name == "equip" && get.color(event.card, player) == "black") {
					num++;
				}
				if (event.name == "addJudge" && get.color(event.cards[0], player) == "black") {
					num++;
				}
			}
			if (!event.getl) {
				return num;
			}
			let evt = event.getl(player);
			if (evt.es && evt.es.length) {
				for (var i of evt.es) {
					if (get.color(i, player) == "black") {
						num++;
					}
				}
			}
			if (evt.js && evt.js.length) {
				for (var i of evt.js) {
					if (get.color(i, player) == "black") {
						num++;
					}
				}
			}
			return num;
		},
		async content(event, trigger, player) {
			await player.draw(2);
			if (player.hp > 1) {
				await player.loseHp();
			}
		},
	}
```

## duanwei 名字:段煨 势力:qun

### junklangmie
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_niujin 名字:新杀牛金 势力:wei

### recuorui 名字:摧锐
描述: 限定技，出牌阶段，你可以依次获得至多X名角色的各一张手牌（X为你的体力值）。
```js
recuorui: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			return player.hp > 0 && game.hasPlayer(current => current !== player && current.hasGainableCards(player, "h"));
		},
		filterTarget(card, player, target) {
			return target !== player && target.hasGainableCards(player, "h");
		},
		selectTarget() {
			return [1, _status.event.player.hp];
		},
		async content(event, trigger, player) {
			if (event.num === 0) {
				player.awakenSkill(event.name);
			}
			await player.gainPlayerCard({
				target: event.target,
				forced: true,
				position: "h",
			});
		},
		ai: {
			order: 10,
			result: {
				player: 1,
				target(player, target) {
					if (target.hasSkillTag("noh")) {
						return 0;
					}
					return -1;
				},
			},
		},
	}
```

### reliewei 名字:裂围
描述: 每回合限Y次，当有角色进入濒死状态时，你可以摸一张牌（Y为你的体力值，若当前回合角色为你，则Y为Infinity）。
```js
reliewei: {
		audio: 2,
		trigger: { global: "dying" },
		filter(event, player) {
			return player === _status.currentPhase || player.getHistory("useSkill", evt => evt.skill === "reliewei").length < player.getHp();
		},
		frequent: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	}
```

## zhangmiao 名字:张邈 势力:qun

### mouni 名字:谋逆
描述: 准备阶段，你可对一名其他角色依次使用你手牌中所有的【杀】（若其进入了濒死状态，则终止此流程）。然后若这些【杀】中有未造成伤害的【杀】，则你跳过本回合的出牌阶段和弃牌阶段。
```js
mouni: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		direct: true,
		filter(event, player) {
			return player.hasCards("h", "sha");
		},
		async content(event, trigger, player) {
			player.addSkill("mouni2");
			const result = await player
				.chooseTarget({
					prompt: get.prompt2("mouni"),
					filterTarget: lib.filter.notMe,
					ai: target => {
						const player = _status.event.player;
						const cards = player.getCards("h", "sha");
						if (
							get.attitude(player, target) >= 0 ||
							!player.canUse(cards[0], target, false) ||
							(!player.hasJudge("lebu") &&
								target.mayHaveShan(player, "use") &&
								!player.hasSkillTag(
									"directHit_ai",
									true,
									{
										target,
										card: cards[0],
									},
									true
								))
						) {
							return 0;
						}
						return get.effect(target, cards[0], player, player);
					},
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			const target = result.targets[0];
			event.target = target;
			player.logSkill("mouni", target);
			let cards = player.getCards("h", "sha");
			while (!event.mouni_dying) {
				const hs = player.getCards("h");
				cards = cards.filter(
					card =>
						hs.includes(card) &&
						get.name(card, player) === "sha" &&
						player.canUse(
							{
								name: "sha",
								nature: get.nature(card, player),
								isCard: true,
								cards: [card],
							},
							target,
							false
						)
				);
				if (!cards.length) {
					break;
				}
				const card = cards.randomRemove(1)[0];
				await player.useCard({
					card,
					targets: [target],
					addCount: false,
				});
			}
			if (
				player.getHistory("useCard", evt => {
					return evt.getParent() === event && !player.getHistory("sourceDamage", evt2 => evt.card === evt2.card).length;
				}).length
			) {
				player.skip("phaseUse");
				player.skip("phaseDiscard");
			}
			player.removeSkill("mouni2");
		},
	}
```

### zongfan 名字:纵反
描述: 觉醒技。结束阶段，若你本回合内因〖谋逆〗使用过【杀】且未跳过本回合的出牌阶段，则你将任意张牌交给一名其他角色，然后加X点体力上限并回复X点体力（X为你以此法给出的牌数且至多为5）。最后失去〖谋逆〗并获得〖战孤〗。
```js
zongfan: {
		derivation: "zhangu",
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		juexingji: true,
		forced: true,
		skillAnimation: true,
		animationColor: "gray",
		filter(event, player) {
			return !player.getHistory("skipped").includes("phaseUse") && player.countHistory("useCard", evt => evt.getParent().name === "mouni") > 0;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const num = player.countCards("he");
			if (num > 0) {
				const result = await player
					.chooseCardTarget({
						prompt: "是否将任意张牌交给一名其他角色？",
						selectCard: [1, num],
						filterCard: true,
						filterTarget: lib.filter.notMe,
						position: "he",
						allowChooseAll: true,
						ai1(card) {
							if (card.name === "du") {
								return 10;
							}
							if (ui.selected.cards.length && ui.selected.cards[0].name === "du") {
								return 0;
							}
							if (ui.selected.cards.length > 4 || !game.hasPlayer(current => get.attitude(player, current) > 0 && !current.hasSkillTag("nogain"))) {
								return 0;
							}
							return 1 / Math.max(0.1, get.value(card));
						},
						ai2(target) {
							let att = get.attitude(player, target);
							if (ui.selected.cards[0].name === "du") {
								return -att;
							}
							if (target.hasSkillTag("nogain")) {
								att /= 6;
							}
							return att;
						},
					})
					.forResult();
				if (result.bool) {
					const cards = result.cards;
					const target = result.targets[0];
					const gainNum = Math.min(5, cards.length);
					await player.give(cards, target);
					await player.gainMaxHp(gainNum);
					await player.recover(gainNum);
				}
			}
			await player.changeSkills(["zhangu"], ["mouni"]);
		},
		ai: {
			combo: "mouni",
		},
	}
```

## liangxing 名字:梁兴 势力:qun

### lulve 名字:掳掠
描述: 出牌阶段开始时，你可选择一名有手牌且手牌数少于你的角色。其选择一项：①将所有手牌交给你，然后你将武将牌翻面。②将武将牌翻面，然后其视为对你使用一张【杀】。
```js
lulve: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			const hs = player.countCards("h");
			return (
				hs > 1 &&
				game.hasPlayer(target => {
					const ts = target.countCards("h");
					return target !== player && ts > 0 && hs > ts;
				})
			);
		},
		direct: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget({
					prompt: get.prompt2("lulve"),
					filterTarget: (card, player, target) => {
						const hs = player.countCards("h");
						const ts = target.countCards("h");
						return target !== player && ts > 0 && hs > ts;
					},
					ai: target => {
						const player = _status.event.player;
						const att = get.attitude(player, target);
						if (target.isTurnedOver()) {
							return att / 10;
						}
						if (!player.hasShan() && target.canUse({ name: "sha", isCard: true }, player, false) && get.effect(player, { name: "sha", isCard: true }, target, player) < 0 && player.hp < 4) {
							return 0;
						}
						return -att * Math.sqrt(target.countCards("h"));
					},
				})
				.forResult();
			if (!result.bool) {
				return;
			}

			const target = result.targets[0];
			player.logSkill("lulve", target);
			const str = get.translation(player);
			const controlResult = await target
				.chooseControl({
					choiceList: [`将所有手牌交给${str}，然后其将武将牌翻面`, `将武将牌翻面，然后视为对${str}使用【杀】`],
					ai: () => {
						const player = _status.event.player;
						const target = _status.event.getParent().player;
						if (player.isTurnedOver()) {
							return 1;
						}
						if (!target.hasShan() && player.canUse({ name: "sha", isCard: true }, target, false) && get.effect(target, { name: "sha", isCard: true }, player, player) < 0) {
							return 0;
						}
						return Math.random() < 0.5 ? 0 : 1;
					},
				})
				.forResult();
			if (controlResult.index === 0) {
				await target.give(target.getCards("h"), player);
				await player.turnOver();
				return;
			}

			await target.turnOver();
			if (target.canUse({ name: "sha", isCard: true }, player, false)) {
				await target.useCard({
					card: { name: "sha", isCard: true },
					targets: [player],
					addCount: false,
				});
			}
		},
	}
```

### lxzhuixi 名字:追袭
描述: 锁定技，当你造成伤害或受到伤害时，若受伤角色的翻面状态和伤害来源的翻面状态不同，则此伤害+1。
```js
lxzhuixi: {
		audio: 2,
		trigger: {
			player: "damageBegin3",
			source: "damageBegin1",
		},
		forced: true,
		logTarget: "player",
		filter(event, player) {
			return event.source && event.player.isTurnedOver() !== event.source.isTurnedOver();
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
		ai: {
			combo: "lulve",
			halfneg: true,
		},
	}
```

## caosong 名字:曹嵩 势力:wei

### cslilu 名字:礼赂
描述: 摸牌阶段，你可以放弃摸牌，改为将手牌摸至X张（X为你的体力上限和5中的最小值），然后将至少一张手牌交给一名其他角色。若你以此法给出的牌数大于你上次以此法给出的牌数，则你加1点体力上限并回复1点体力。
```js
cslilu: {
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return !event.numFixed;
		},
		check(event, player) {
			return Math.min(player.maxHp, 5) - player.countCards("h") > 3 || game.hasPlayer(current => current !== player && get.attitude(player, current) > 0);
		},
		async content(event, trigger, player) {
			trigger.changeToZero();
			await player.drawTo(Math.min(player.maxHp, 5));
			const handCount = player.countCards("h");
			if (!handCount) {
				return;
			}
			let prompt = "将至少一张手牌交给一名其他角色";
			const markCount = player.countMark("cslilu");
			if (markCount < handCount) {
				if (markCount > 0) {
					prompt += `。若给出的牌数大于${get.cnNumber(markCount)}张，则你`;
				} else {
					prompt += "，并";
				}
				prompt += "加1点体力上限并回复1点体力";
			}
			const hasBeneficiary = game.hasPlayer(current => current !== player && get.attitude(player, current) > 0 && !current.hasSkillTag("nogain") && !current.hasJudge("lebu"));
			const goon = hasBeneficiary && markCount < handCount ? markCount + 1 : 1;
			const result = await player
				.chooseCardTarget({
					prompt,
					filterCard: true,
					filterTarget: lib.filter.notMe,
					selectCard: [1, Infinity],
					forced: true,
					ai1: card => {
						if (ui.selected.cards.length >= _status.event.goon) {
							return 0;
						}
						if (get.tag(card, "damage") && game.hasPlayer(current => current !== player && get.attitude(player, current) > 0 && !current.hasSkillTag("nogain") && !current.hasJudge("lebu") && current.hasValueTarget(card))) {
							return 1;
						}
						return 1 / Math.max(0.1, get.value(card));
					},
					ai2: target => Math.sqrt(5 - Math.min(4, target.countCards("h"))) * get.attitude(_status.event.player, target),
					allowChooseAll: true,
				})
				.set("goon", goon)
				.forResult();
			if (!result.bool) {
				return;
			}
			const currentMarkCount = player.countMark("cslilu");
			const giveEvent = player.give(result.cards, result.targets[0]);
			let gainMaxHpEvent;
			let recoverEvent;
			if (result.cards.length > currentMarkCount) {
				gainMaxHpEvent = player.gainMaxHp();
				recoverEvent = player.recover();
			}
			player.storage.cslilu = result.cards.length;
			player.markSkill("cslilu");
			await giveEvent;
			if (gainMaxHpEvent) {
				await gainMaxHpEvent;
				await recoverEvent;
			}
		},
	}
```

### csyizheng 名字:翊正
描述: 结束阶段开始时，你可以选择一名其他角色。你的下回合开始前，当该角色造成伤害或回复体力时，若其体力上限小于你，则你减1点体力上限，且令此伤害值/回复值+1。
```js
csyizheng: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: lib.filter.notMe,
					ai: target => {
						if (target.isTurnedOver() || target.hasJudge("lebu")) {
							return 0;
						}
						return get.attitude(_status.event.player, target) * Math.max(0, target.countCards("h") - 2);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.storage.csyizheng2 = target;
			player.addTempSkill("csyizheng2", { player: "phaseBegin" });
		},
		ai: {
			combo: "cslilu",
		},
	}
```

## re_taoqian 名字:陶谦 势力:qun

### zhaohuo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### reyixiang 名字:义襄
描述: 锁定技，其他角色于其出牌阶段内使用的第一张牌对你的伤害-1；其使用的第二张牌若为黑色，则对你无效。
```js
reyixiang: {
		audio: "yixiang",
		audioname: ["re_taoqian"],
		trigger: { player: "damageBegin1" },
		forced: true,
		filter(event, player) {
			const evt = event.getParent(2);
			if (evt.name !== "useCard" || evt.card !== event.card) {
				return false;
			}
			const source = evt.player;
			const phsu = evt.getParent("phaseUse");
			if (!source || source === player || source !== phsu.player) {
				return false;
			}
			return source.getHistory("useCard", evt2 => evt2.getParent("phaseUse") === phsu)[0] === evt;
		},
		async content(event, trigger, player) {
			trigger.num--;
		},
		group: "reyixiang_card",
		subSkill: {
			card: {
				audio: "yixiang",
				audioname: ["re_taoqian"],
				trigger: { target: "useCardToTargeted" },
				forced: true,
				filter(event, player) {
					if (get.color(event.card) !== "black") {
						return false;
					}
					const evt = event.getParent();
					const source = evt.player;
					const phsu = evt.getParent("phaseUse");
					if (!source || source === player || source !== phsu.player) {
						return false;
					}
					return source.getHistory("useCard", evt2 => evt2.getParent("phaseUse") === phsu).indexOf(evt) === 1;
				},
				async content(event, trigger, player) {
					trigger.excluded.add(player);
				},
			},
		},
		ai: {
			effect: {
				target(card, player, target, current, isLink) {
					if (isLink || typeof card !== "object" || !player.isPhaseUsing()) {
						return;
					}
					let num;
					const evt = _status.event.getParent("useCard");
					const evt2 = _status.event.getParent("phaseUse");
					if (evt.card === card) {
						num = player.getHistory("useCard", evt => evt.getParent("phaseUse") === evt2).indexOf(evt);
					} else {
						num = player.getHistory("useCard", evt => evt.getParent("phaseUse") === evt2).length;
					}
					if (num < 0 || num > 1) {
						return;
					}
					if (num === 0 && get.tag(card, "damage")) {
						if (
							target.hasSkillTag("filterDamage", null, {
								player: player,
								card: card,
							}) ||
							!player.hasSkillTag("damageBonus", true, {
								target: target,
								card: card,
							})
						) {
							return "zeroplayertarget";
						}
						return [0.5, 0, 0.5, 0];
					}
					if (num === 1 && get.color(card) === "black") {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

### reyirang 名字:揖让
描述: 出牌阶段开始时，你可以将所有非基本牌交给一名其他角色。若其体力上限大于你，则你将体力上限调整至与其相同并回复X点体力（X为你以此法交给其的牌数）。
```js
reyirang: {
		audio: "yirang",
		audioname: ["re_taoqian"],
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			if (!player.hasCards("he", card => get.type(card) !== "basic")) {
				return false;
			}
			return game.hasPlayer(current => current !== player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: (_card, player, target) => target !== player,
					ai: target => (get.attitude(_status.event.player, target) - 2) * target.maxHp,
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = player.getCards("he", card => get.type(card) !== "basic");
			const target = event.targets[0];
			await player.give(cards, target, "give");
			if (target.maxHp <= player.maxHp) {
				return;
			}
			await player.gainMaxHp({
				num: target.maxHp - player.maxHp,
				forced: true,
			});
			await player.recover(cards.length);
		},
	}
```

## zhaozhong 名字:赵忠 势力:qun

### yangzhong 名字:殃众
描述: 当你造成或受到伤害后，若受伤角色和伤害来源均存活，则伤害来源可弃置两张牌，然后令受伤角色失去1点体力。
```js
yangzhong: {
		audio: 2,
		trigger: {
			source: "damageSource",
			player: "damageEnd",
		},
		direct: true,
		filter(event, player) {
			const target = event.player;
			const source = event.source;
			if (player !== source && !player.hasSkill("yangzhong")) {
				return false;
			}
			if (!target || !source || !target.isIn() || !source.isIn()) {
				return false;
			}
			return source.countCards("he") > 1;
		},
		async content(event, trigger, player) {
			const next = trigger.source.chooseToDiscard({
				prompt: `是否对${get.translation(trigger.player)}发动【殃众】？`,
				prompt2: "弃置两张牌，并令其失去1点体力",
				position: "he",
				selectCard: 2,
				ai: card => {
					const evt = _status.event;
					if (get.attitude(evt.player, evt.getTrigger().player) >= 0) {
						return 0;
					}
					return 7 - get.value(card);
				},
			});
			next.logSkill = ["yangzhong", trigger.player];
			const result = await next.forResult();
			if (result.bool) {
				await trigger.player.loseHp();
			}
		},
	}
```

### huangkong 名字:惶恐
描述: 锁定技，当你于回合外成为【杀】或普通锦囊牌的目标后，若你没有手牌，则你摸两张牌。
```js
huangkong: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			if (player === _status.currentPhase || player.hasCards("h")) {
				return false;
			}
			return event.card.name === "sha" || get.type(event.card, null, false) === "trick";
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
	}
```

## hanfu 名字:韩馥 势力:qun

### hfjieying 名字:节应
描述: 结束阶段，你可以选择一名其他角色，该角色下回合使用目标数为1的【杀】或普通锦囊牌无距离限制且可多指定一个目标，且当其造成伤害后，其无法再使用牌直到回合结束。
```js
hfjieying: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: lib.filter.notMe,
					ai: target => (get.attitude(player, target) * (1 + target.countCards("h", card => !get.tag(card, "damage") && target.hasValueTarget(card)))) / (1 + target.countCards("h")),
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			target.addTempSkill("hfjieying2", { player: "phaseEnd" });
		},
		ai: {
			expose: 0.05,
		},
	}
```

### weipo 名字:危迫
描述: 锁定技，其他角色使用【杀】或普通锦囊牌指定你为目标后，若你的手牌数小于X，则你将手牌摸至X张，并记录摸牌事件结算后的手牌数Y。此牌结算结束后，若你的手牌数小于Y，则你将一张手牌交给此牌的使用者，且此技能失效直到你的下回合开始。（X为你的体力上限且至多为5）
```js
weipo: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			return player !== event.player && player.countCards("h") < Math.min(5, player.maxHp) && (event.card.name === "sha" || get.type(event.card) === "trick");
		},
		async content(event, trigger, player) {
			player.addTempSkill("weipo2");
			await player.drawTo(Math.min(5, player.maxHp));
			const evt = trigger.getParent();
			if (!evt.weipo) {
				evt.weipo = {};
			}
			evt.weipo[player.playerid] = player.countCards("h");
		},
	}
```

## re_quyi 名字:新杀麴义 势力:qun

### refuqi 名字:伏骑
描述: 锁定技，当你使用牌时，你令所有距离为1的其他角色不能使用或打出牌响应此牌。
```js
refuqi: {
		audio: "fuqi",
		forced: true,
		trigger: {
			player: "useCard",
		},
		filter(event, player) {
			return event.card && (get.type(event.card) === "trick" || (get.type(event.card) === "basic" && !["shan", "tao", "jiu", "du"].includes(event.card.name))) && game.hasPlayer(current => current !== player && get.distance(player, current) <= 1);
		},
		async content(event, trigger, player) {
			trigger.directHit.addArray(game.filterPlayer(current => current !== player && get.distance(player, current) <= 1));
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				return get.distance(player, arg.target) <= 1;
			},
		},
	}
```

### jiaozi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## dongxie 名字:董翓 势力:qun

### dcjiaoxia 名字:狡黠
描述: ①出牌阶段开始时，你可以令自己的所有手牌于此阶段均视为【杀】。若如此做，你使用以此法转化的【杀】造成伤害后，你可以使用此牌对应的原卡牌。②出牌阶段，你对你本阶段未使用过【杀】的角色使用【杀】无距离和次数限制。
```js
dcjiaoxia: {
		mod: {
			cardUsableTarget(card, player, target) {
				if (!player.isPhaseUsing()) {
					return;
				}
				if (card.name === "sha" && !player.getStorage("dcjiaoxia_mark").includes(target)) {
					return true;
				}
			},
			targetInRange(card, player, target) {
				if (!player.isPhaseUsing()) {
					return;
				}
				if (card.name === "sha" && !player.getStorage("dcjiaoxia_mark").includes(target)) {
					return true;
				}
			},
		},
		audio: 2,
		locked: false,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.hasCards("h");
		},
		check(event, player) {
			return player.hasCards("h", card => {
				return game.hasPlayer(target => {
					const cardx = get.autoViewAs({ name: "sha" }, [card]);
					return player.canUse(cardx, target) && get.effect(target, cardx, player, player) > 0 && (!player.hasUseTarget(card) || player.hasValueTarget(card));
				});
			});
		},
		async content(event, trigger, player) {
			const cards = player.getCards("h");
			player.addTempSkill("dcjiaoxia_viewas", "phaseUseAfter");
			player.addGaintag(cards, "dcjiaoxia_viewas");
		},
		group: "dcjiaoxia_load",
		subSkill: {
			load: {
				charlotte: true,
				trigger: { player: "useCard1" },
				filter(event, player) {
					if (!player.isPhaseUsing()) {
						return false;
					}
					return event.card.name === "sha" && event.targets && event.targets.some(target => !player.getStorage("dcjiaoxia_mark").includes(target));
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					if (trigger.addCount !== false) {
						trigger.addCount = false;
						const stat = player.getStat().card;
						const name = trigger.card.name;
						if (typeof stat[name] === "number") {
							stat[name]--;
						}
					}
					player.addTempSkill("dcjiaoxia_mark", "phaseUseAfter");
					player.markAuto(
						"dcjiaoxia_mark",
						trigger.targets.filter(target => !player.getStorage("dcjiaoxia_mark").includes(target))
					);
				},
			},
			mark: {
				charlotte: true,
				onremove: true,
			},
			viewas: {
				mod: {
					aiOrder(player, card, num) {
						if (get.itemtype(card) === "card" && card.hasGaintag("dcjiaoxia_viewas")) {
							return num + 1;
						}
					},
					cardname(card, player) {
						if (get.itemtype(card) === "card" && card.hasGaintag("dcjiaoxia_viewas")) {
							return "sha";
						}
					},
				},
				charlotte: true,
				onremove(player) {
					player.removeGaintag("dcjiaoxia_viewas");
				},
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return (
						event.cards &&
						event.cards.length === 1 &&
						player.hasUseTarget(get.copy(event.cards[0])) &&
						player.getHistory("lose", evt => {
							if ((evt.relatedEvent || evt.getParent()) !== event) {
								return false;
							}
							for (const i in evt.gaintag_map) {
								if (evt.gaintag_map[i].includes("dcjiaoxia_viewas")) {
									return true;
								}
							}
							return false;
						}).length &&
						player.getHistory("sourceDamage", evt => evt.card === event.card).length &&
						player.hasUseTarget(event.cards[0])
					);
				},
				direct: true,
				async content(event, trigger, player) {
					const card = trigger.cards[0];
					await player.chooseUseTarget({
						card,
						prompt: get.prompt("dcjiaoxia"),
						prompt2: `使用${get.translation(card)}`,
						addCount: false,
						logSkill: "dcjiaoxia",
					});
				},
			},
		},
	}
```

### dchumei 名字:狐魅
描述: 出牌阶段各限一次，你可以选择一名体力值不大于X的角色，令其：①摸一张牌。②交给你一张牌。③回复1点体力。（X为你本阶段造成的伤害数）
```js
dchumei: {
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
		},
		onChooseToUse(event) {
			if (!game.online && !event.dchumei_num) {
				const player = event.player;
				const evtx = event.getParent("phaseUse");
				event.set(
					"dchumei_num",
					player.getHistory("sourceDamage", evt => evt.getParent("phaseUse") === evtx).reduce((sum, evt) => sum + evt.num, 0)
				);
			}
		},
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			if (typeof event.dchumei_num !== "number") {
				return false;
			}
			return game.hasPlayer(target => lib.skill.dchumei.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			if (target.getHp() > _status.event.dchumei_num) {
				return false;
			}
			const list = player.getStorage("dchumei_used");
			if (!list.includes("draw")) {
				return true;
			}
			if (!list.includes("give") && target.countCards("he")) {
				return true;
			}
			if (!list.includes("recover") && target.isDamaged()) {
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			const { target } = event;
			const str = get.translation(target);
			const result = await player
				.chooseButton({
					createDialog: [
						"狐魅：请选择一项",
						[
							[
								["draw", `令${str}摸一张牌`],
								["give", `令${str}交给你一张牌`],
								["recover", `令${str}回复1点体力`],
							].filter(list => {
								if (player.getStorage("dchumei_used").includes(list[0])) {
									return false;
								}
								if (list[0] === "give" && !target.countCards("he")) {
									return false;
								}
								if (list[0] === "recover" && target.isHealthy()) {
									return false;
								}
								return true;
							}),
							"textbutton",
						],
					],
					forced: true,
					filterButton: button => {
						const { player, target } = get.event();
						if (player.getStorage("dchumei_used").includes(button.link)) {
							return false;
						}
						if (button.link === "give" && !target.countCards("he")) {
							return false;
						}
						if (button.link === "recover" && target.isHealthy()) {
							return false;
						}
						return true;
					},
					ai: button => {
						const current = _status.event.player;
						const target = _status.event.target;
						switch (button.link) {
							case "draw": {
								return get.effect(target, { name: "draw" }, current, current);
							}
							case "give": {
								return get.effect(target, { name: "shunshou_copy2" }, current, current);
							}
							case "recover": {
								return get.recoverEffect(target, current, current);
							}
						}
						return 0;
					},
				})
				.set("target", target)
				.forResult();
			if (!result.bool) {
				return;
			}
			player.addTempSkill("dchumei_used", "phaseUseAfter");
			player.markAuto("dchumei_used", result.links);
			switch (result.links[0]) {
				case "draw": {
					await target.draw();
					return;
				}
				case "recover": {
					await target.recover();
					return;
				}
			}
			const giveResult = await target
				.chooseCard({
					prompt: `狐魅：交给${get.translation(player)}一张牌`,
					position: "he",
					forced: true,
				})
				.forResult();
			if (!giveResult.bool) {
				return;
			}
			await player.gain({ cards: giveResult.cards, source: target, animate: "giveAuto" });
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					const list = player.getStorage("dchumei_used");
					if (!list.includes("draw")) {
						return 1;
					}
					if (!list.includes("give")) {
						return -1;
					}
					if (!list.includes("recover")) {
						return 1;
					}
				},
			},
		},
	}
```

## wangrong 名字:王荣 势力:qun

### minsi 名字:敏思
描述: 出牌阶段限一次，你可以弃置任意张点数之和为13的牌，然后摸两倍数量的牌。以此法得到的牌中，黑色牌本回合无距离限制，红色牌本回合不计入手牌上限。
```js
minsi: {
		audio: 2,
		enable: "phaseUse",
		getResult(cards) {
			const l = cards.length;
			const all = Math.pow(l, 2);
			const list = [];
			for (let i = 1; i < all; i++) {
				const array = [];
				for (let j = 0; j < l; j++) {
					if (Math.floor((i % Math.pow(2, j + 1)) / Math.pow(2, j)) > 0) {
						array.push(cards[j]);
					}
				}
				let num = 0;
				for (const card of array) {
					num += get.number(card);
				}
				if (num === 13) {
					list.push(array);
				}
			}
			if (list.length) {
				list.sort((a, b) => (a.length !== b.length ? b.length - a.length : get.value(a) - get.value(b)));
				return list[0];
			}
			return list;
		},
		usable: 1,
		filterCard(card) {
			let num = 0;
			for (const selected of ui.selected.cards) {
				num += get.number(selected);
			}
			return get.number(card) + num <= 13;
		},
		complexCard: true,
		selectCard() {
			let num = 0;
			for (const selected of ui.selected.cards) {
				num += get.number(selected);
			}
			if (num === 13) {
				return ui.selected.cards.length;
			}
			return ui.selected.cards.length + 2;
		},
		check(card) {
			const evt = _status.event;
			if (!evt.minsi_choice) {
				evt.minsi_choice = lib.skill.minsi.getResult(evt.player.getCards("he"));
			}
			if (!evt.minsi_choice.includes(card)) {
				return 0;
			}
			return 1;
		},
		position: "he",
		async content(event, trigger, player) {
			const { cards } = event;
			await player.draw({ num: cards.length * 2, gaintag: ["minsi2"] });
			player.addTempSkill("minsi2");
		},
		ai: {
			order: 5,
			result: { player: 1 },
		},
	}
```

### jijing 名字:吉境
描述: 当你受到伤害后，你可以进行一次判定，然后若你弃置任意张点数之和与判定结果点数相同的牌，你回复1点体力。
```js
jijing: {
		audio: 2,
		trigger: { player: "damageEnd" },
		frequent: true,
		async content(event, trigger, player) {
			const judgeResult = await player.judge().forResult();
			const num = judgeResult.number;
			const cards = player.getCards("he");
			const length = cards.length;
			const all = Math.pow(length, 2);
			const list = [];
			for (let index = 1; index < all; index++) {
				const combination = [];
				for (let cardIndex = 0; cardIndex < length; cardIndex++) {
					if (Math.floor((index % Math.pow(2, cardIndex + 1)) / Math.pow(2, cardIndex)) > 0) {
						combination.push(cards[cardIndex]);
					}
				}
				let sum = 0;
				for (const card of combination) {
					sum += get.number(card);
				}
				if (sum === num) {
					list.push(combination);
				}
			}
			if (list.length) {
				list.sort((a, b) => get.value(a) - get.value(b));
			}
			const cardResult = list.length ? list[0] : list;
			const next = player.chooseToDiscard({
				prompt: `是否弃置任意张点数之和为${get.cnNumber(num)}的牌并回复1点体力？`,
				filterCard: card => {
					let sum = 0;
					for (const selectedCard of ui.selected.cards) {
						sum += get.number(selectedCard);
					}
					return get.number(card) + sum <= _status.event.num;
				},
				position: "he",
				complexCard: true,
				selectCard: () => {
					let sum = 0;
					for (const card of ui.selected.cards) {
						sum += get.number(card);
					}
					if (sum === _status.event.num) {
						return ui.selected.cards.length;
					}
					return ui.selected.cards.length + 2;
				},
				ai: card => {
					if (!_status.event.cardResult.includes(card)) {
						return 0;
					}
					return 6 - get.value(card);
				},
			});
			next.set("num", num);
			next.set("cardResult", cardResult);
			const result = await next.forResult();
			if (!result.bool) {
				return;
			}
			await player.recover();
		},
	}
```

### zhuide 名字:追德
描述: 当你死亡时，你可令一名其他角色从牌堆中获得四张名称各不相同的基本牌。
```js
zhuide: {
		audio: 2,
		trigger: { player: "die" },
		forceDie: true,
		skillAnimation: true,
		animationColor: "thunder",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: lib.filter.notMe,
					ai: target => get.attitude(_status.event.player, target),
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const names = [];
			const cards = [];
			for (let i = 0; i < 4; i++) {
				const card = get.cardPile2(card => !cards.includes(card) && !names.includes(card.name) && get.type(card) === "basic");
				if (!card) {
					break;
				}
				cards.push(card);
				names.push(card.name);
			}
			if (cards.length) {
				await target.gain({
					cards,
					animate: "gain2",
				});
			}
		},
	}
```

## ol_dingyuan 名字:丁原 势力:qun

### cixiao 名字:慈孝
描述: 准备阶段，若场上没有“义子”标记，你可令一名其他角色获得一个“义子”标记；若场上有“义子”标记，你可以弃置一张牌移动“义子”标记。拥有“义子”标记的角色获得技能“叛弑”。
```js
cixiao: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		direct: true,
		filter(event, player) {
			if (!game.hasPlayer(current => current.hasSkill("panshi"))) {
				return true;
			}
			return player.countCards("he") >= 1 && game.hasPlayer(current => current !== player && !current.hasSkill("panshi"));
		},
		async content(event, trigger, player) {
			if (!game.hasPlayer(current => current.hasSkill("panshi"))) {
				const result = await player
					.chooseTarget({
						filterTarget: lib.filter.notMe,
						prompt: get.prompt("cixiao"),
						prompt2: "令一名其他角色获得「义子」标记",
						ai: target => {
							const player = _status.event.player;
							const attitude = -get.attitude(player, target);
							return attitude * target.countCards("h");
						},
					})
					.forResult();
				if (!result.bool) {
					return;
				}
				const target = result.targets[0];
				player.logSkill("cixiao", target);
				await target.addSkills("panshi");
				return;
			}
			const list = game.filterPlayer(current => current.hasSkill("panshi"));
			const panshiPlayer = list[0];
			const attitude = -get.attitude(player, panshiPlayer);
			const result = await player
				.chooseCardTarget({
					prompt: get.prompt("cixiao"),
					prompt2: `弃置一张牌并将${get.translation(list)}的「义子」标记转移给其他角色`,
					position: "he",
					filterTarget(card, player, target) {
						return player !== target && !target.hasSkill("panshi");
					},
					filterCard: lib.filter.cardDiscardable,
					ai1(card) {
						if (_status.event.goon) {
							return 5 - get.value(card);
						}
						return 0;
					},
					ai2(target) {
						const player = _status.event.player;
						const attitude = -get.attitude(player, target);
						return attitude * target.countCards("h");
					},
					goon: attitude * panshiPlayer.countCards("h") <= 0,
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			const target = result.targets[0];
			player.logSkill("cixiao");
			const discardEvent = player.discard({ cards: result.cards }).set("delay", false);
			const panshiPlayers = game.filterPlayer(current => current.hasSkill("panshi"));
			for (const current of panshiPlayers) {
				current.removeSkills("panshi");
			}
			player.line2(panshiPlayers.concat(result.targets), "green");
			target.addSkills("panshi");
			await discardEvent;
			await game.delayx();
		},
		derivation: "panshi",
		ai: { threaten: 8 },
	}
```

### xianshuai 名字:先率
描述: 锁定技，有角色造成伤害后，若此伤害是本轮第一次造成伤害：你摸一张牌；若伤害来源是你，则你对受伤角色再造成1点伤害。
```js
xianshuai: {
		audio: 2,
		trigger: { global: "damageSource" },
		forced: true,
		filter(event, player) {
			return event.source && event.source.isIn() && !player.hasSkill("xianshuai2");
		},
		async content(event, trigger, player) {
			player.addTempSkill("xianshuai2", "roundStart");
			await player.draw();
			if (player === trigger.source && trigger.player.isIn()) {
				player.line(trigger.player, "green");
				await trigger.player.damage();
			}
		},
	}
```

## re_hejin 名字:新杀何进 势力:qun

### spmouzhu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### spyanhuo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_hansui 名字:新杀韩遂 势力:qun

### spniluan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### spweiwu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## liuhong 名字:刘宏 势力:qun

### yujue 名字:鬻爵
描述: `出牌阶段限一次，你可以废除一个装备栏，然后令一名有手牌的其他角色交给你一张手牌。其获得${get.poptip("zhihu")}直到你的下回合开始。`
```js
yujue: {
		initSkill(skill) {
			if (!lib.skill[skill]) {
				lib.skill[skill] = {
					charlotte: true,
					onremove: true,
					mark: "character",
					intro: { content: "以$之名，授予汝技能〖执笏〗，直至$的下回合开始为止！" },
				};
				lib.translate[skill] = "执笏";
			}
		},
		audio: 2,
		derivation: "zhihu",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasEnabledSlot();
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("###鬻爵###" + lib.translate.yujue_info);
			},
			chooseControl(event, player) {
				const list = [];
				for (let i = 1; i < 6; i++) {
					if (player.hasEnabledSlot(i)) {
						list.push("equip" + i);
					}
				}
				list.push("cancel2");
				return list;
			},
			check(event, player) {
				if (player.countEnabledSlot() == 1 && player.maxHp <= 3 && player.hasSkill("tuxing")) {
					return "cancel2";
				}
				for (let i = 5; i > 0; i--) {
					if (player.hasEmptySlot(i)) {
						return "equip" + i;
					}
				}
				return "cancel2";
			},
			backup(result) {
				return {
					audio: "yujue",
					position: result.control,
					async content(event, trigger, player) {
						await player.disableEquip(lib.skill.yujue_backup.position);
						if (
							player.isIn() &&
							game.hasPlayer(current => {
								return current != player && current.countCards("h");
							})
						) {
							const result = await player
								.chooseTarget(true, "选择一名其他角色交给你一张手牌并获得技能〖执笏〗", (card, player, target) => {
									if (player == target) {
										return false;
									}
									return target.countCards("h") > 0;
								})
								.set("ai", target => {
									return get.attitude(get.player(), target) * target.countCards("h");
								})
								.forResult();
							if (result?.bool) {
								const target = result.targets[0];
								player.line(target);
								const result2 = await target.chooseToGive(player, "h", true).forResult();
								if (result2?.bool) {
									player.addTempSkill("yujue_clear", { player: "phaseBeginStart" });
									const skill = `yujue_${player.playerid}`;
									game.broadcastAll(lib.skill.yujue.initSkill, skill);
									target.storage[skill] = player;
									target.addSkill(skill);
									await target.addAdditionalSkills(skill, "zhihu");
								}
							}
						}
					},
				};
			},
		},
		ai: {
			order: 1,
			result: {
				player(player) {
					if (player.countEnabledSlot() == 1 && player.maxHp <= 3 && player.hasSkill("tuxing")) {
						return 0;
					}
					if (
						game.hasPlayer(function (target) {
							if (player == target) {
								return false;
							}
							var hs = target.countCards("h");
							return hs > 2 && get.attitude(player, target) > 0;
						})
					) {
						return 1;
					}
					return 0;
				},
			},
		},
		subSkill: {
			backup: {},
			clear: {
				charlotte: true,
				onremove(player) {
					game.countPlayer(current => {
						current.removeSkill(`yujue_${player.playerid}`);
					});
				},
			},
		},
	}
```

### tuxing 名字:图兴
描述: 锁定技，当你废除一个装备栏时，你加1点体力上限并回复1点体力。然后若你所有的装备栏均已被废除，则你减4点体力上限，且本局游戏内造成的伤害+1。
```js
tuxing: {
		audio: 2,
		trigger: { player: "disableEquipEnd" },
		forced: true,
		async content(event, trigger, player) {
			const num = trigger.slots.length;
			await player.gainMaxHp(num);
			await player.recover(num);
			if (!player.hasEnabledSlot()) {
				await player.loseMaxHp(4);
				player.addSkill(event.name + "_effect");
				player.addMark(event.name + "_effect", 1, false);
			}
		},
		ai: { combo: "yujue" },
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				audio: "tuxing",
				trigger: { source: "damageBegin1" },
				forced: true,
				async content(event, trigger, player) {
					trigger.num += player.countMark(event.name);
				},
				intro: { content: "造成伤害时，此伤害+#" },
			},
		},
	}
```

## zhujun 名字:朱儁 势力:qun

### gongjian 名字:攻坚
描述: 每回合限一次，当有角色使用【杀】指定第一个目标后，若此【杀】的目标和本局游戏内被使用的上一张【杀】的目标的交集A不为空，则你可以依次弃置A中所有角色的至多两张牌，然后获得以此法弃置的所有【杀】。
```js
gongjian: {
		audio: 2,
		trigger: { global: "useCardToPlayered" },
		usable: 1,
		logTarget(event) {
			return event.parent.gongjian_targets.filter(target => event.targets.includes(target) && target.hasCards("he"));
		},
		filter(event, player) {
			if (event.card.name !== "sha" || !event.isFirstTarget) {
				return false;
			}
			return event.parent.gongjian_targets?.some(target => event.targets.includes(target) && target.hasCards("he")) === true;
		},
		check(event, player) {
			const targets = event.parent.gongjian_targets.filter(target => event.targets.includes(target) && target.hasCards("he"));
			let attitude = 0;
			for (const target of targets) {
				attitude += get.attitude(player, target);
			}
			return attitude < 0;
		},
		async content(event, trigger, player) {
			const targets = trigger.parent.gongjian_targets.filter(target => trigger.targets.includes(target));
			for (const target of targets) {
				await player
					.discardPlayerCard({
						target,
						forced: true,
						position: "he",
						selectButton: [1, 2],
					})
					.set("forceAuto", true);
			}
			const cards = game
				.getGlobalHistory("cardMove", evt => evt.player && evt.hs && evt.type === "discard" && evt.getParent(3) === event)
				.map(evt => [evt.hs, evt.player])
				.flatMap(([cards, playerx]) => cards.filter(card => get.name(card, playerx) === "sha" && get.position(card, true) === "d"));
			if (cards.length) {
				await player.gain({
					cards,
					animate: "gain2",
				});
			}
		},
		group: "gongjian_count",
		subSkill: {
			count: {
				trigger: { global: "useCard1" },
				silent: true,
				firstDo: true,
				filter(event, player) {
					return event.card && event.card.name === "sha";
				},
				async content(event, trigger, player) {
					if (player.storage.gongjian) {
						trigger.gongjian_targets = player.storage.gongjian;
					}
					player.storage.gongjian = trigger.targets;
				},
			},
		},
	}
```

### kuimang 名字:溃蟒
描述: 锁定技，一名角色死亡后，若你对其造成过伤害，你摸两张牌。
```js
kuimang: {
		audio: 2,
		trigger: { global: "dieAfter" },
		forced: true,
		filter(event, player) {
			return player.getAllHistory("sourceDamage", damage => damage.player === event.player).length > 0;
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
	}
```

## re_maliang 名字:新杀马良 势力:shu

### rexiemu 名字:协穆
描述: 结束阶段，若全场没有“协穆”标记，你可以选择一名角色获得“协穆”标记直到你的下回合开始。你或该角色在各自的回合外使用或打出手牌时，你与其各摸一张牌（每回合限一次）。
```js
rexiemu: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return !game.hasPlayer(current => current.hasMark("rexiemu"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: lib.filter.notMe,
					ai: target => {
						const player = _status.event.player;
						return get.attitude(player, target) * Math.sqrt(Math.max(1 + player.countCards("h"), 1 + target.countCards("h")));
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			target.addMark("rexiemu", 1);
			player.addSkill("rexiemu2");
		},
		intro: { content: "mark" },
		ai: {
			expose: 0.1,
		},
	}
```

### heli 名字:贺励
描述: 出牌阶段限一次，你可以选择手牌数比你少的一名其他角色。该角色展示所有手牌，然后每缺少一种类型的牌，便从牌堆中随机获得一张此类型的牌。
```js
heli: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.heli.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target.countCards("h") < player.countCards("h");
		},
		async content(event, trigger, player) {
			const target = event.target;
			if (target.hasCards("h")) {
				await target.showHandcards();
			}
			const list = [];
			const cards = [];
			for (const name of lib.inpile) {
				list.add(get.type2(name));
			}
			for (const type of list) {
				if (target.hasCards("h", card => get.type2(card, target) === type)) {
					continue;
				}
				const card = get.cardPile2(card => get.type2(card, false) === type, "random");
				if (card) {
					cards.push(card);
				}
			}
			if (cards.length) {
				await target.gain({
					cards,
					animate: "gain2",
					log: true,
				});
			}
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					return 1 / Math.sqrt(1 + target.countCards("h"));
				},
			},
		},
	}
```

## caobuxing 名字:曹不兴 势力:wu

### moying 名字:墨影
描述: 每回合限一次，当你于回合外不因使用而失去单一一张锦囊牌或装备牌后，你可以选择一个花色和与此牌点数差绝对值不超过2的点数，然后获得牌堆中所有与此牌花色点数相同的牌。
```js
moying: {
		audio: 2,
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			if (player == _status.currentPhase || (event.relatedEvent || event.getParent())?.name == "useCard") {
				return false;
			}
			if (event.name == "gain" && event.player == player) {
				return false;
			}
			const evt = event.getl(player);
			return evt && evt.cards2 && evt.cards2.length == 1 && ["equip", "trick"].includes(get.type2(evt.cards2[0], evt.type == "discard" && evt.hs.includes(evt.cards2[0]) ? player : false));
		},
		usable: 1,
		async cost(event, trigger, player) {
			const number = trigger.getl(player).cards2[0].number;
			const numbers = [number - 2, number - 1, number, number + 1, number + 2].filter(function (number) {
				return number >= 1 && number <= 13;
			});
			const suits = lib.suit.slice();
			const result = await player
				.chooseButton([get.prompt2("moying"), `<div class="text center">花色</div>`, [suits.map(suit => [suit, get.translation(suit)]), "tdnodes"], `<div class="text center">点数</div>`, [numbers, "tdnodes"]], 2)
				.set("filterButton", button => {
					const selected = ui.selected.buttons;
					if (!selected.length) {
						return true;
					}
					return typeof button.link != typeof selected[0].link;
				})
				.set("ai", button => {
					return Math.random();
				})
				.forResult();
			if (result?.links?.length) {
				const links = result.links;
				if (!suits.includes(links[0])) {
					links.reverse();
				}
				event.result = {
					bool: true,
					cost_data: [links[0], links[1]],
				};
			}
		},
		async content(event, trigger, player) {
			const {
				cost_data: [suit, number],
			} = event;
			const cards = [];
			for (let i = 0; i < ui.cardPile.childNodes.length; i++) {
				const card = ui.cardPile.childNodes[i];
				if (get.suit(card) == suit && get.number(card) == number) {
					cards.push(card);
				}
			}
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
	}
```

### juanhui 名字:绢绘
描述: 结束阶段，你可以选择一名其他角色。记录该角色下回合的出牌阶段里使用的基本牌和普通锦囊牌（每种牌名限记一次），你的下回合出牌阶段，可将一张手牌当这些牌里的任意一张牌使用（每张限使用一次，且【杀】不计次数）。当"绢绘"的牌全部用完时，你回复1点体力并将手牌摸至三张。
```js
juanhui: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("juanhui"), lib.filter.notMe, "选择记录一名其他角色使用过的牌")
				.set("ai", function (target) {
					if (target.isTurnedOver() || target.hasJudge("lebu")) {
						return Math.random();
					}
					return (1 + target.countCards("h")) * 2 + Math.random();
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const [target] = event.targets;
			player.storage.juanhui2 = target;
			player.storage.juanhui3 = [];
			player.addSkill("juanhui2");
		},
	}
```

## lijue 名字:李傕 势力:qun

### xinfu_langxi 名字:狼袭
描述: 准备阶段，你可以对一名体力小于或等于你的其他角色造成0～2点随机伤害。
```js
xinfu_langxi: {
		audio: 2,
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && current.hp <= player.hp;
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.name.slice(0, -5)), "对一名体力值不大于你的其他角色造成0-2点随机伤害", (card, player, target) => {
					return target !== player && target.hp <= player.hp;
				})
				.set("ai", target => {
					const player = get.event().player,
						att = get.attitude(player, target);
					if (att > 0) {
						return 0;
					}
					return get.damageEffect(target, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (get.mode() !== "identity" || player.identity !== "nei") {
				player.addExpose(0.3);
			}
			event.num = get.rand(1, 6);
			const num = Math.ceil(event.num / 2 - 1);
			player.popup(num ? get.cnNumber(num) + "点" : "🐏袭");
			await target.damage(Math.ceil(event.num / 2 - 1));
		},
		ai: {
			threaten: 1.7,
		},
	}
```

### xinfu_yisuan 名字:亦算
描述: 出牌阶段限一次。当你于出牌阶段内使用的锦囊牌结算结束后，你可以减1点体力上限并获得此牌对应的所有实体牌。
```js
xinfu_yisuan: {
		usable: 1,
		audio: 2,
		trigger: {
			player: "useCardEnd",
		},
		check(event, player) {
			return get.value(event.cards) + player.maxHp * 2 - 18 > 0;
		},
		prompt2(event, player) {
			return `你可以减1点体力上限，然后获得${get.translation(event.cards.filterInD())}。`;
		},
		filter(event, player) {
			return player.isPhaseUsing() && get.type(event.card) === "trick" && event.cards.filterInD().length > 0;
		},
		async content(event, trigger, player) {
			await player.loseMaxHp();
			await player.gain({
				cards: trigger.cards.filterInD(),
				animate: "gain2",
				log: true,
			});
		},
	}
```

## zhangji 名字:张济 势力:qun

### xinfu_lveming 名字:掠命
描述: 出牌阶段限一次，你可以选择一名装备区装备比你少的角色，令其选择一个点数，然后你进行判定：<br>若点数相同，你对其造成2点伤害；<br>若点数不同，则你随机获得其区域内的一张牌。
```js
xinfu_lveming: {
		intro: {
			content: "已发动过#次",
		},
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player !== target && target.countCards("e") < player.countCards("e");
		},
		async content(event, trigger, player) {
			const target = event.target;
			const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(index => get.strNumber(index));
			const controlResult = await target
				.chooseControl({
					controls: list,
					prompt: "请选择一个点数",
					ai: () => get.rand(0, 12),
				})
				.forResult();
			const num = controlResult.control ? controlResult.index + 1 : 13;
			target.$damagepop(controlResult.control || "K", "thunder");
			event.num = num;
			game.log(target, "选择的点数是", `#y${get.strNumber(num)}`);
			player.addMark(event.name, 1, false);
			const judgeResult = await player
				.judge({
					judge: card => {
						if (card.number === _status.event.getParent("xinfu_lveming").num) {
							return 4;
						}
						return 0;
					},
				})
				.forResult();
			if (judgeResult.bool) {
				await target.damage(2);
				return;
			}

			const card = target.getCards("hej").randomGet();
			if (card) {
				await player.gain({
					cards: [card],
					source: target,
					animate: "giveAuto",
					bySelf: true,
				});
			}
		},
		ai: {
			order: 9,
			result: {
				player(player, target) {
					if (target.countCards("hej")) {
						return 0.92;
					}
					return 0;
				},
				target(player, target) {
					const numj = target.countCards("j");
					const numhe = target.countCards("he");
					if (numhe + numj > 0) {
						return (1.6 * numj - numhe) / (numj + numhe) - 0.3;
					}
					return -0.3;
				},
			},
			threaten: 1.1,
		},
	}
```

### xinfu_tunjun 名字:屯军
描述: 限定技，出牌阶段，你可以选择一名角色，令其随机使用牌堆中的X张装备牌（X为你发动过“掠命”的次数）。
```js
xinfu_tunjun: {
		skillAnimation: true,
		animationColor: "metal",
		limited: true,
		enable: "phaseUse",
		audio: 2,
		filter(event, player) {
			return player.hasMark("xinfu_lveming");
		},
		filterTarget: true,
		selectTarget: 1,
		async content(event, trigger, player) {
			const { target } = event;
			player.awakenSkill(event.name);
			let num = player.countMark("xinfu_lveming");
			while (num > 0) {
				num--;
				const card = get.cardPile2(card => get.type(card) == "equip" && target.canEquip(card));
				if (card) {
					target.$gain(card);
					await target.chooseUseTarget({ forced: true, card, animate: false, nopopup: true });
				} else {
					break;
				}
			}
		},
		ai: {
			combo: "xinfu_lveming",
			order(item, player) {
				player ??= get.player();
				let num = 0;
				for (let i = 1; i < 6; i++) {
					num += player.countEquipableSlot(i);
				}
				if (num <= 2) {
					return 6;
				}
				if (
					player.hp <= 2 ||
					!game.hasPlayer(current => {
						if (player == current || get.attitude(player, current) < 0 || current.hp <= 1) {
							return false;
						}
						return current.hp > 2 || current.countCards("hs") > 2;
					})
				) {
					return 1;
				}
				return 0;
			},
			result: {
				target(player, target) {
					let num = 0;
					for (let i = 1; i < 6; i++) {
						num += target.countEquipableSlot(i);
					}
					return num;
				},
			},
		},
	}
```

## fanchou 名字:樊稠 势力:qun

### xinxingluan 名字:兴乱
描述: 每回合限一次。当你于出牌阶段内使用牌结算结束后，你可选择一项：①观看牌堆中的两张点数为6的牌并获得其中一张（没有则改为摸六张牌）；②令一名其他角色弃置一张点数为6的牌或交给你一张牌；③获得场上的一张点数为6的牌。
```js
xinxingluan: {
		audio: "xinfu_xingluan",
		usable: 1,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return player.isPhaseUsing();
		},
		async cost(event, trigger, player) {
			const choiceList = ["观看牌堆中两张点数为6的牌并获得其中一张", "令一名其他角色弃置一张点数为6的牌或交给你一张牌", "获得场上一张点数为6的牌"];
			const choices = ["选项一"];
			if (game.hasPlayer(current => current !== player && current.countCards("he") > 0)) {
				choices.push("选项二");
			} else {
				choiceList[1] = `<span style="opacity:0.5">${choiceList[1]}</span>`;
			}
			if (game.hasPlayer(current => current.hasCard(card => get.number(card) === 6 && lib.filter.canBeGained(card, current, player), "ej"))) {
				choices.push("选项三");
			} else {
				choiceList[2] = `<span style="opacity:0.5">${choiceList[2]}</span>`;
			}
			const result = await player
				.chooseControl({
					controls: [...choices, "cancel2"],
					choiceList,
					prompt: get.prompt(event.skill),
					ai: () => {
						if (
							game.hasPlayer(current => {
								if (current === player) {
									return false;
								}
								const att = -get.sgn(get.attitude(player, current) - 0.1);
								return current.hasCard(card => get.number(card) === 6 && lib.filter.canBeGained(card, current, player) && get.sgn(get.useful(card, current)) === att, "ej");
							})
						) {
							return "选项三";
						}
						if (
							game.hasPlayer(target => {
								if (target === player) {
									return false;
								}
								const att = get.attitude(player, target);
								return att < 0 && target.countCards("he") > 0 && !target.hasCard(card => get.value(card, target) <= 0, "he");
							})
						) {
							return "选项二";
						}
						return "选项一";
					},
				})
				.forResult();
			if (result.control === "cancel2") {
				return;
			}
			const results = { bool: true, cost_data: { index: choices.indexOf(result.control) } };
			if (results.cost_data.index === 1) {
				const { targets } = await player
					.chooseTarget({
						prompt: "令一名其他角色弃置一张点数为6的牌，否则交给你一张牌",
						forced: true,
						filterTarget: (_card, player, current) => current !== player && current.countCards("he") > 0,
						ai: target => {
							const att = get.attitude(player, target);
							if (att >= 0) {
								return 0;
							}
							if (!target.hasCard(card => get.value(card, target) <= 0, "he")) {
								return -att / Math.sqrt(target.countCards("he"));
							}
							return 0;
						},
					})
					.forResult();
				results.targets = targets;
			} else if (results.cost_data.index === 2) {
				const { targets } = await player
					.chooseTarget({
						prompt: "获得一名角色装备区或判定区内点数为6的牌",
						forced: true,
						filterTarget: (_card, player, current) => current.hasCard(card => get.number(card) === 6 && lib.filter.canBeGained(card, current, player), "ej"),
						ai: target => {
							const att = -get.sgn(get.attitude(player, target) - 0.1);
							const cards = target.getCards("ej", card => get.number(card) === 6 && lib.filter.canBeGained(card, target, player));
							let max = 0;
							for (const card of cards) {
								const num = get.useful(card, target) * att;
								if (num > max) {
									max = num;
								}
								return max;
							}
						},
					})
					.forResult();
				results.targets = targets;
			}
			event.result = results;
		},
		async content(event, trigger, player) {
			const { index } = event.cost_data;
			if (index === 2) {
				const target = event.targets[0];
				await player.gainPlayerCard({
					target,
					position: "ej",
					forced: true,
					filterButton: button => get.number(button.link) === 6,
				});
				return;
			}
			if (index === 1) {
				const target = event.targets[0];
				const discardResult = await target
					.chooseToDiscard({
						position: "he",
						prompt: `弃置一张点数为6的牌，否则交给${get.translation(player)}一张牌`,
						filterCard: card => get.number(card) === 6,
						ai: card => 8 - get.value(card),
					})
					.forResult();
				if (discardResult.bool) {
					return;
				}
				const giveResult = await target
					.chooseCard({
						position: "he",
						forced: true,
						prompt: `交给${get.translation(player)}一张牌`,
					})
					.forResult();
				if (giveResult.bool) {
					await target.give(giveResult.cards, player, "giveAuto");
				}
				return;
			}
			const cards = [];
			for (let i = 0; i < 2; i++) {
				const card = get.cardPile2(card => !cards.includes(card) && get.number(card) === 6);
				if (!card) {
					break;
				}
				cards.push(card);
			}
			if (!cards.length) {
				await player.draw(6);
				return;
			}
			let gainCards = cards;
			if (cards.length > 1) {
				const buttonResult = await player
					.chooseButton({
						createDialog: ["兴乱：选择获得其中一张", cards],
						forced: true,
						ai: button => get.value(button.link, player),
					})
					.forResult();
				if (!buttonResult.bool) {
					return;
				}
				gainCards = buttonResult.links;
			}
			await player.gain({ cards: gainCards, animate: "gain2" });
		},
	}
```

## guosi 名字:郭汜 势力:qun

### xinfu_tanbei 名字:贪狈
描述: 出牌阶段限一次，你可以令一名其他角色选择一项：1.令你随机获得其区域内的一张牌，本回合内你不能对其使用牌。2.令你此回合内对其使用牌没有次数与距离限制。
```js
xinfu_tanbei: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player !== target;
		},
		async content(event, trigger, player) {
			const { target } = event;
			let result = { index: 1 };
			if (target.hasCards("hej")) {
				result = await target
					.chooseControl({
						choiceList: [`令${get.translation(player)}随机获得你区域内的一张牌，然后其本回合内不能再对你使用牌。`, `令${get.translation(player)}本回合内对你使用牌没有次数与距离限制。`],
						ai: () => [0, 1].randomGet(),
					})
					.forResult();
			}
			player.addTempSkill("tanbei_effect3");
			if (result.index !== 0) {
				target.addTempSkill("tanbei_effect1");
				return;
			}
			const card = target.getCards("hej").randomGet();
			await player.gain({ cards: [card], source: target, animate: "giveAuto", bySelf: true });
			target.addTempSkill("tanbei_effect2");
		},
		ai: {
			order() {
				return [2, 4, 6, 8, 10].randomGet();
			},
			result: {
				target(player, target) {
					return -2 - target.countCards("h");
				},
			},
			threaten: 1.1,
		},
	}
```

### xinfu_sidao 名字:伺盗
描述: 出牌阶段限一次，当你对一名其他角色连续使用两张牌后，你可以将一张手牌当做【顺手牵羊】对其使用。
```js
xinfu_sidao: {
		audio: 2,
		trigger: {
			player: "useCardAfter",
		},
		filter(event, player) {
			if (player.hasSkill("xinfu_sidaoy") || !player.hasCards("hs")) {
				return false;
			}
			if (!event.targets || !event.targets.length || !event.isPhaseUsing(player)) {
				return false;
			}
			const history = player.getHistory("useCard");
			const index = history.indexOf(event) - 1;
			if (index < 0) {
				return false;
			}
			const evt = history[index];
			if (!evt || !evt.targets || !evt.targets.length || !evt.isPhaseUsing(player)) {
				return false;
			}
			for (const target of event.targets) {
				if (evt.targets.includes(target) && lib.filter.filterTarget({ name: "shunshou" }, player, target)) {
					return true;
				}
			}
			return false;
		},
		direct: true,
		async content(event, trigger, player) {
			const targets = player.getLastUsed(1).targets;
			const next = player.chooseToUse();
			next.set(
				"targets",
				game.filterPlayer(current => targets.includes(current) && trigger.targets.includes(current))
			);
			next.set("openskilldialog", get.prompt2("xinfu_sidao"));
			next.set("norestore", true);
			next.set("_backupevent", "xinfu_sidaox");
			next.set("custom", {
				add: {},
				replace: { window() {} },
			});
			next.backup("xinfu_sidaox");
			await next;
		},
	}
```

## lvkai 名字:吕凯 势力:shu

### xinfu_tunan 名字:图南
描述: 出牌阶段限一次，你可以令一名其他角色观看牌堆顶的一张牌，然后该角色选择一项：1.使用此牌（无距离限制）；2.将此牌当普通【杀】使用。
```js
xinfu_tunan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const { target } = event;
			const cards = get.cards(1, true);
			await target.viewCards(get.translation(player) + "对你发动了【图南】", cards);
			const [card] = cards;
			const bool1 = game.hasPlayer(function (current) {
				return target.canUse(card, current, false);
			});
			const bool2 = game.hasPlayer(function (current) {
				return target.canUse(get.autoViewAs({ name: "sha" }, [card]), current);
			});
			let result;
			if (bool1 && bool2) {
				result = await target
					.chooseControl(function () {
						return 0;
					})
					.set("choiceList", ["使用" + get.translation(cards) + "。（没有距离限制）", "将" + get.translation(cards) + "当做【杀】使用。"])
					.set("ai", function () {
						return _status.event.choice;
					})
					.set("choice", target.getUseValue(card, false) > target.getUseValue({ name: "sha", cards: cards }) ? 0 : 1)
					.forResult();
			} else if (bool1) {
				result = { index: 0 };
			} else if (bool2) {
				result = { index: 1 };
			} else {
				return;
			}
			if (typeof result.index == "number") {
				const { index } = result;
				if (index == 1) {
					await target.chooseUseTarget({ name: "sha" }, cards, true, false).set("viewAs", false);
				} else {
					await target.chooseUseTarget(card, true, false, "nodistance");
				}
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

### xinfu_bijing 名字:闭境
描述: 结束阶段，你可以选择至多两张手牌并标记为“闭境”，然后你获得如下效果：1.其他角色的弃牌阶段开始时，若你于本回合内失去过“闭境”，其弃置两张牌；2.准备阶段，你重铸所有“闭境”牌。
```js
xinfu_bijing: {
		audio: 2,
		subSkill: {
			lose: {
				trigger: {
					global: "phaseDiscardBegin",
				},
				audio: "xinfu_bijing",
				charlotte: true,
				filter(event, player) {
					if (event.player === player) {
						return false;
					}
					return (
						player.getHistory("lose", evt => {
							for (const i in evt.gaintag_map) {
								if (evt.gaintag_map[i].includes("xinfu_bijing")) {
									return true;
								}
							}
						}).length > 0 && event.player.hasCards("he")
					);
				},
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					await trigger.player.chooseToDiscard({ selectCard: 2, forced: true, position: "he" });
				},
				sub: true,
			},
			discard: {
				audio: "xinfu_bijing",
				trigger: {
					player: "phaseZhunbeiBegin",
				},
				forced: true,
				charlotte: true,
				filter(event, player) {
					return player.hasCard(card => card.hasGaintag("xinfu_bijing") && player.canRecast(card), "h");
				},
				async content(event, trigger, player) {
					await player.recast(player.getCards("h", card => card.hasGaintag("xinfu_bijing") && player.canRecast(card)));
				},
				sub: true,
			},
		},
		trigger: {
			player: "phaseJieshuBegin",
		},
		filter(event, player) {
			return player.hasCards("h");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: get.prompt2(event.skill),
					position: "h",
					selectCard: [1, 2],
					ai: card => {
						if (card.name === "shan") {
							return 6;
						}
						return 6 - get.value(card);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			player.addGaintag(event.cards, "xinfu_bijing");
			player.addSkill("xinfu_bijing_lose");
			player.addSkill("xinfu_bijing_discard");
		},
	}
```

## zhanggong 名字:张恭 势力:wei

### xinfu_zhenxing 名字:镇行
描述: 结束阶段开始时或当你受到伤害后，你可以观看牌堆顶的至多三张牌，然后你获得其中与其余牌花色均不相同的一张牌。
```js
xinfu_zhenxing: {
		audio: 2,
		trigger: {
			player: ["damageEnd", "phaseJieshuBegin"],
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseControl("一张", "两张", "三张", "cancel2")
				.set("prompt", get.prompt2(event.skill))
				.set("ai", function () {
					return 0;
				})
				.forResult();
			event.result = {
				bool: result.control !== "cancel2",
				cost_data: result.index + 1,
			};
		},
		async content(event, trigger, player) {
			const cards = get.cards(event.cost_data);
			await game.cardsGotoOrdering(cards);
			let result = await player
				.chooseButton(["【镇行】：请选择要获得的牌", cards])
				.set("filterButton", function (button) {
					var cards = _status.event.cards;
					for (var i = 0; i < cards.length; i++) {
						if (button.link != cards[i] && get.suit(cards[i]) == get.suit(button.link)) {
							return false;
						}
					}
					return true;
				})
				.set("ai", function (button) {
					return get.value(button.link);
				})
				.set("cards", cards)
				.forResult();
			if (result.bool) {
				await player.gain(result.links, "gain2");
			}
		},
	}
```

### xinfu_qianxin 名字:遣信
描述: 出牌阶段限一次，若牌堆中没有“信”，你可以选择一名角色并将任意张手牌放置于牌堆中X倍数的位置（X为存活人数），称为“信”。该角色的弃牌阶段开始时，若其手牌区内有于本回合内获得过的“信”，其选择一项：令你将手牌摸至四张；本回合手牌上限-2。
```js
xinfu_qianxin: {
		audio: 2,
		group: ["xinfu_qianxin2"],
		enable: "phaseUse",
		usable: 1,
		onChooseToUse(event) {
			if (!game.online) {
				var num1 = game.players.length - 1;
				var player = event.player;
				var num2 = ui.cardPile.childElementCount;
				var num3 = num2;
				if (num1 > num2) {
					num3 = 0;
				} else if (player.storage.xinfu_qianxin) {
					for (var i = 0; i < num2; i++) {
						if (player.storage.xinfu_qianxin.includes(ui.cardPile.childNodes[i])) {
							num3 = 0;
							break;
						}
					}
				}
				event.set("qianxinNum", num3);
			}
		},
		filter(event, player) {
			return event.qianxinNum && event.qianxinNum > 0;
		},
		filterTarget(card, player, target) {
			return target != player;
		},
		filterCard: true,
		selectCard() {
			var num1 = game.players.length - 1;
			var num2 = _status.event.qianxinNum;
			return [1, Math.floor(num2 / num1)];
		},
		discard: false,
		check() {
			return -1;
		},
		delay: false,
		lose: false,
		prompt() {
			return "选择一名角色并将任意张手牌放置于牌堆中" + get.cnNumber(game.players.length) + "倍数的位置（先选择的牌在上）";
		},
		allowChooseAll: true,
		async content(event, trigger, player) {
			const { cards, target } = event;
			player.$throw(cards.length);
			player.storage.xinfu_qianxin = cards.slice(0);
			player.storage.xinfu_qianxin2 = target;
			game.log(player, "把", get.cnNumber(cards.length), "张牌放在了牌堆里");
			await player.lose(cards, ui.cardPile).set("insert_index", function (event, card) {
				const num1 = game.players.length,
					i = event.cards.indexOf(card);
				const num3 = num1 * (i + 1) - 1;
				return ui.cardPile.childNodes[num3];
			});
			await game.delayx();
		},
		ai: {
			order: 1,
			result: {
				target: -1,
			},
		},
	}
```

## weiwenzhugezhi 名字:卫温诸葛直 势力:wu

### xinfu_fuhai 名字:浮海
描述: 出牌阶段对每名角色限一次，你可以展示一张手牌并选择上家或下家，该角色展示一张手牌。若你展示的牌点数大于等于其展示的牌点数，你弃置你展示的牌，然后继续对其上家或下家重复此流程；若你展示的牌点数小于该展示角色牌的点数，则该角色弃置其展示的牌，然后你与其各摸X张牌（X为你此回合内发动此技能选择的角色数），且你此阶段内〖浮海〗失效。
```js
xinfu_fuhai: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.hasCards("h") && game.hasPlayer(target => get.info("xinfu_fuhai").filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			return [player.next, player.previous].includes(target) && !player.getStorage("xinfu_fuhai_used").includes(target);
		},
		line: false,
		async content(event, trigger, player) {
			const { target } = event;
			let current, result;
			const side = target == player.next ? "next" : "previous";
			player.addTempSkill(event.name + "_used", "phaseAnyAfter");
			player.addTempSkill(event.name + "_mark");
			while (true) {
				current = !current ? target : current[side];
				if (!player.hasCards("h") || !current.hasCards("h") || player == current || player.getStorage(event.name + "_used").includes(current)) {
					return;
				}
				player.line(current, "green");
				player.markAuto(event.name + "_used", [current]);
				player.markAuto(event.name + "_mark", [current]);
				const next = current[side];
				let stopm = false,
					stopt = false;
				if (get.attitude(current, player) > 0) {
					if (get.attitude(next, target) <= 0 || !next.hasCards("h") || player.countCards("h") == 1) {
						stopm = true;
						stopt = true;
					}
				} else {
					if (get.attitude(next, target) >= 0) {
						stopt = true;
						stopm = false;
					}
				}
				result = await player
					.chooseCard({
						prompt: "浮海：请展示一张牌",
						forced: true,
						ai(card) {
							if (get.event().stopm) {
								return 14 - get.number(card);
							}
							return get.number(card);
						},
					})
					.set("stopm", stopm)
					.forResult();
				if (result?.bool && result.cards?.length) {
					const cards = result.cards;
					await player.showCards(cards);
					result = await current
						.chooseCard({
							prompt: "浮海：请展示一张牌",
							forced: true,
							ai(card) {
								if (get.event().stopt) {
									return 14 - get.number(card);
								}
								return get.number(card);
							},
						})
						.set("stopt", stopt)
						.forResult();
					if (result?.bool && result.cards?.length) {
						const cardx = result.cards;
						await current.showCards(cardx);
						const num1 = get.number(cards[0]);
						const num2 = get.number(cardx[0]);
						if (num1 < num2) {
							await current.modedDiscard({ cards: cardx });
							await game.asyncDraw([player, current], player.getStorage(event.name + "_mark").length);
							player.tempBanSkill(event.name, "phaseAnyAfter");
							break;
						} else {
							await player.modedDiscard({ cards });
						}
					}
				}
			}
		},
		ai: {
			order: 1,
			result: {
				player(player, target) {
					const hs = player.countCards("h");
					const side = target == player.next ? "next" : "previous";
					let current = player;
					for (let i = 0; i < hs; i++) {
						current = current[side];
						if (current == player || !current.countCards("h")) {
							return 0;
						}
						if (get.attitude(current, player) > 0) {
							return 1;
						}
					}
					return 0;
				},
			},
		},
		subSkill: {
			used: { charlotte: true, onremove: true, intro: { content: "本阶段$已成为过浮海的目标" } },
			mark: { charlotte: true, onremove: true },
		},
	}
```

## beimihu 名字:beimihu 势力:qun

### zongkui 名字:纵傀
描述: 回合开始前，你可以指定一名未拥有“傀”标记的其他角色，令其获得一枚“傀”标记。每轮开始时，你指定一名体力值最少且没有“傀”标记的其他角色，令其获得一枚“傀”标记。
```js
zongkui: {
		trigger: {
			player: "phaseBeforeEnd",
			global: "roundStart",
		},
		audio: 2,
		audioname: ["tw_beimihu"],
		filter(event, player, name) {
			return game.hasPlayer(current => {
				if (name == "roundStart" && !current.isMinHp()) {
					return false;
				}
				return current != player && !current.hasMark("zongkui_mark");
			});
		},
		async cost(event, trigger, player) {
			const targets = game.filterPlayer(current => {
				if (event.triggername == "roundStart" && !current.isMinHp()) {
					return false;
				}
				return current != player && !current.hasMark("zongkui_mark");
			});
			if (event.triggername == "roundStart" && targets.length == 1) {
				event.result = { bool: true, targets: targets };
			} else {
				const round = event.triggername == "roundStart";
				const next = player
					.chooseTarget(get.prompt(event.skill), `令一名${event.triggername == "roundStart" ? "体力值最小的" : ""}其他角色获得“傀”标记`, (card, player, target) => {
						if (get.event().round && !target.isMinHp()) {
							return false;
						}
						return target != player && !target.hasMark("zongkui_mark");
					})
					.set("ai", target => {
						const num = target.isMinHp() ? 0.5 : 1;
						return num * get.threaten(target);
					})
					.set("round", round);
				if (round) {
					next.set("forced", true);
				}
				event.result = await next.forResult();
			}
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			target.addMark("zongkui_mark", 1);
			await game.delayx();
		},
		subSkill: {
			mark: {
				marktext: "傀",
				intro: {
					name2: "傀",
					content: "mark",
				},
			},
		},
		ai: {
			combo: "guju",
			threaten: 1.4,
		},
	}
```

### guju 名字:骨疽
描述: 锁定技，拥有“傀”标记的角色受到伤害后，你摸一张牌。
```js
guju: {
		audio: 2,
		audioname: ["tw_beimihu"],
		trigger: { global: "damageEnd" },
		forced: true,
		filter(event, player) {
			return event.player != player && event.player.hasMark("zongkui_mark");
		},
		async content(event, trigger, player) {
			await player.draw();
			player.addMark(event.name, 1, false);
			const { player: target } = trigger;
			if (player.hasZhuSkill("bingzhao", target) && target.group == player.storage.bingzhao && target.isIn()) {
				const result = await target
					.chooseBool(`是否对${get.translation(player)}发动【秉诏】？`)
					.set("choice", get.attitude(target, player) > 1)
					.forResult();
				if (!result?.bool) {
					return;
				}
				target.logSkill("bingzhao", player);
				await player.draw();
				player.addMark(event.name, 1, false);
			}
		},
		intro: { content: "已因〖骨疽〗获得#张牌" },
		ai: { combo: "zongkui" },
	}
```

### baijia 名字:拜假
描述: 觉醒技，准备阶段，若你因〖骨疽〗得到的牌不少于七张，则你增加1点体力上限，回复1点体力，然后令所有未拥有“傀”标记的其他角色获得“傀”标记，最后失去技能〖骨疽〗，并获得技能〖蚕食〗。
```js
baijia: {
		audio: 2,
		audioname: ["tw_beimihu"],
		derivation: "bmcanshi",
		juexingji: true,
		ai: { combo: "guju" },
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			return player.getAllHistory("gain", evt => evt.getParent().name == "draw" && evt.getParent(2).name == "guju").reduce((num, evt) => num + evt.cards.length, 0) >= 7;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.gainMaxHp();
			await player.recover();
			const targets = game.filterPlayer(current => player != current && !current.hasMark("zongkui_mark"));
			if (targets.length) {
				for (const target of targets.sortBySeat()) {
					target.addMark("zongkui_mark", 1);
					player.line(target, "green");
				}
			}
			await player.changeSkills(["bmcanshi"], ["guju"]);
		},
	}
```

## sp_liuqi 名字:刘琦 势力:qun

### rewenji 名字:问计
描述: 出牌阶段开始时，你可以令一名其他角色交给你一张牌。你于本回合内使用与该牌类型相同的牌时不能被其他角色响应。
```js
rewenji: {
		audio: "spwenji",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current !== player && current.hasCards("he"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: (_card, player, target) => target !== player && target.hasCards("he"),
					ai: target => {
						const att = get.attitude(_status.event.player, target);
						if (att > 0) {
							return Math.sqrt(att) / 10;
						}
						return 5 - att;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const cardResult = await target
				.chooseCard({
					position: "he",
					forced: true,
					prompt: `问计：将一张牌交给${get.translation(player)}`,
				})
				.forResult();
			if (!cardResult.bool) {
				return;
			}

			player.addTempSkill("rewenji_respond");
			player.storage.rewenji_respond = get.type2(cardResult.cards[0], target);
			await target.give(cardResult.cards, player, true);
		},
		subSkill: {
			respond: {
				onremove: true,
				trigger: { player: "useCard" },
				forced: true,
				charlotte: true,
				audio: "spwenji",
				filter(event, player) {
					return get.type2(event.card) === player.storage.rewenji_respond;
				},
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.filterPlayer(current => current !== player));
				},
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						return get.type2(arg.card) === player.storage.rewenji_respond;
					},
				},
			},
		},
	}
```

### sptunjiang 名字:屯江
描述: 结束阶段，若你未于本回合的出牌阶段内使用牌指定过其他角色为目标，则你可以摸X张牌（X为全场势力数）。
```js
sptunjiang: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		filter(event, player) {
			return (
				player.getHistory("useCard", evt => {
					if (evt.targets && evt.targets.length && evt.isPhaseUsing()) {
						const targets = evt.targets.slice(0);
						while (targets.includes(player)) {
							targets.remove(player);
						}
						return targets.length > 0;
					}
					return false;
				}).length === 0
			);
		},
		async content(event, trigger, player) {
			await player.draw(game.countGroup());
		},
	}
```

## xf_tangzi 名字:唐咨 势力:wei

### xinfu_xingzhao 名字:兴棹
描述: 锁定技。若场上已受伤的角色数：≥1，你视为拥有技能〖恂恂〗；X≥2，有装备牌进入或离开你的装备区时，你摸一张牌；X≥3，判定阶段或弃牌阶段开始时，你跳过此阶段；为0或≥4，当你造成伤害时，此伤害+1。
```js
xinfu_xingzhao: {
		audio: 2,
		group: ["xz_xunxun", "xinfu_xingzhao2", "xinfu_xingzhao3"],
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		forced: true,
		filter(event, player) {
			if (game.countPlayer(current => current.isDamaged()) < 2) {
				return false;
			}
			const evt = event.getl(player);
			if (event.name === "equip" && event.player === player) {
				return true;
			}
			return evt && evt.es.length;
		},
		getIndex(event, player) {
			const evt = event.getl(player);
			if (event.name === "equip" && event.player === player && evt && evt.es.length) {
				return 2;
			}
			return 1;
		},
		async content(event, trigger, player) {
			await player.draw();
		},
		derivation: "xz_xunxun",
		mark: true,
		intro: {
			content(storage, player) {
				const num = game.countPlayer(current => current.isDamaged());
				let str = "<li>造成的伤害+1";
				if (num >= 1) {
					str = "<li>视为拥有技能“恂恂”";
				}
				if (num >= 2) {
					str += "<br><li>装备牌进入或离开你的装备区时摸一张牌";
				}
				if (num >= 3) {
					str += "<br><li>始终跳过弃牌阶段";
				}
				if (num >= 4) {
					str += "<br><li>造成的伤害+1";
				}
				return str;
			},
		},
	}
```

## xf_huangquan 名字:OL黄权 势力:shu

### xinfu_dianhu 名字:点虎
描述: 锁定技，游戏开始时，你选择一名其他角色。当其受到来自你的伤害后或回复体力后，你摸一张牌。
```js
xinfu_dianhu: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		locked: true,
		filter(event, player) {
			return game.hasPlayer(current => current != player) && (event.name != "phase" || game.phaseNumber == 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget("选择【点虎】的目标", lib.translate.xinfu_dianhu_info, true, function (card, player, target) {
					return target != player;
				})
				.set("ai", function (target) {
					var att = get.attitude(_status.event.player, target);
					if (att < 0) {
						return -att + 3;
					}
					return Math.random();
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			game.log(target, "成为了", "【点虎】", "的目标");
			if (get.mode() != "identity" || player.identity != "nei") {
				player.addExpose(0.25);
			}
			target.addSkill("xinfu_dianhu_effect");
			target.markAuto("xinfu_dianhu_effect", player);
		},
		subSkill: {
			effect: {
				intro: {
					content: "当你受到来自$的伤害或回复体力后，其摸一张牌",
				},
				trigger: {
					player: ["damageEnd", "recoverEnd"],
				},
				charlotte: true,
				forceDie: true,
				filter(event, player) {
					const targets = player.getStorage("xinfu_dianhu_effect");
					if (targets?.length) {
						if (event.name == "damage") {
							return event.source?.isIn() && targets.includes(event.source);
						}
						return targets.some(target => target.isIn());
					}
				},
				async cost(event, trigger, player) {
					const targets = player.getStorage(event.skill);
					for (const target of targets.sortBySeat(_status.currentPhase)) {
						if (!target.isIn() || (trigger.name == "damage" && target != trigger.source)) {
							continue;
						}
						await target.useSkill(event.skill, [player]);
					}
				},
				async content(event, trigger, player) {
					await player.draw();
				},
			},
		},
	}
```

### xinfu_jianji 名字:谏计
描述: 出牌阶段限一次，你可以令一名其他角色摸一张牌。然后该角色可以使用此牌。
```js
xinfu_jianji: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target !== player;
		},
		async content(event, trigger, player) {
			const { target } = event;
			const { cards } = await target.draw().forResult();
			const card = cards?.[0];
			if (!card || !game.hasPlayer(current => target.canUse(card, current)) || get.owner(card) !== target) {
				return;
			}
			await target.chooseToUse({
				prompt: `是否使用${get.translation(card)}？`,
				filterCard: cardx => cardx === _status.event.cardx,
				cardx: card,
			});
		},
		ai: {
			order: 7.5,
			result: {
				target: 1,
			},
		},
	}
```

## xf_sufei 名字:OL苏飞 势力:wu

### xinfu_lianpian 名字:联翩
描述: 每回合限三次。当你于出牌阶段对一名角色连续使用牌时，你可以摸一张牌，然后可以将此牌交给该角色。
```js
xinfu_lianpian: {
		audio: 2,
		usable: 3,
		trigger: {
			player: "useCardToPlayered",
		},
		frequent: true,
		filter(event, player) {
			if (!event.targets?.length || event.getParent()?.triggeredTargets3.length > 1 || !event.isPhaseUsing(player)) {
				return false;
			}
			const evt = player.getLastUsed(1);
			if (!evt?.targets?.length || !evt.isPhaseUsing(player)) {
				return false;
			}
			for (let i = 0; i < event.targets.length; i++) {
				if (evt.targets.includes(event.targets[i])) {
					return true;
				}
			}
			return false;
		},
		async content(event, trigger, player) {
			const { cards } = await player.draw().forResult();
			if (!cards?.length) {
				return;
			}
			const card = cards[0];
			const ablers = player.getLastUsed(1)?.targets.slice(0) ?? [];
			for (let i = 0; i < ablers.length; i++) {
				if (ablers[i] == player || !trigger.targets.includes(ablers[i])) {
					ablers.splice(i--, 1);
				}
			}
			if (get.owner(card) == player && ablers.length) {
				const result = await player
					.chooseTarget({
						prompt: `联翩：是否将${get.translation(card)}交给其他角色`,
						filterTarget(card, player, target) {
							return get.event().ablers.includes(target) && target != player;
						},
						ai: target => 0,
					})
					.set("ablers", ablers)
					.forResult();
				if (result?.bool && result.targets?.length) {
					const target = result.targets[0];
					player.line(target);
					await player.give(card, target, true);
				}
			}
		},
		locked: false,
		mod: {
			aiOrder(player, card, num) {
				if (player.isPhaseUsing() && (!player.storage.counttrigger || !player.storage.counttrigger.xinfu_lianpian || player.storage.counttrigger.xinfu_lianpian < 3)) {
					const evt = player.getLastUsed();
					if (
						evt?.targets?.length &&
						evt.isPhaseUsing(player) &&
						game.hasPlayer(current => {
							return evt.targets.includes(current) && player.canUse(card, current) && get.effect(current, card, player, player) > 0;
						})
					) {
						return num + 10;
					}
				}
			},
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					var evt = player.getLastUsed();
					if (evt && evt.targets.includes(target) && (!player.storage.counttrigger || !player.storage.counttrigger.xinfu_lianpian || player.storage.counttrigger.xinfu_lianpian < 3) && player.isPhaseUsing(player)) {
						return [1.5, 0];
					}
				},
			},
		},
	}
```

## xushao 名字:许劭 势力:qun

### pingjian 名字:评荐
描述: 结束阶段开始时/当你受到伤害后/出牌阶段限一次，你可以令系统随机检索出三张拥有发动时机为结束阶段开始时/当你受到伤害后/出牌阶段的技能的武将牌。然后你可以选择尝试发动其中一个技能。每个技能每局游戏只能选择一次。
```js
pingjian: {
		initList() {
			game.initCharacterList();
		},
		init(player) {
			player.addSkill("pingjian_check");
			if (!player.storage.pingjian_check) {
				player.storage.pingjian_check = {};
			}
		},
		audio: 2,
		trigger: { player: ["damageEnd", "phaseJieshuBegin"] },
		frequent: true,
		async content(event, trigger, player) {
			if (Object.keys(player.storage.pingjian_check)?.length) {
				Object.keys(player.storage.pingjian_check).forEach(skill => {
					player.removeSkill(skill);
					const names = player.tempname && player.tempname.filter(i => get.character(i, 3)?.includes(skill));
					if (names) {
						get.nameList(player).forEach(name => {
							const { tempname } = get.character(name);
							if (tempname && Array.isArray(tempname)) {
								names.removeArray(tempname);
							}
						});
						game.broadcastAll((player, names) => player.tempname.removeArray(names), player, names);
					}
					delete player.storage.pingjian_check[skill];
				});
			}
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			const allList = _status.characterlist.slice(0);
			game.countPlayer(current => {
				if (current.name && lib.character[current.name] && current.name.indexOf("gz_shibing") !== 0 && current.name.indexOf("gz_jun_") !== 0) {
					allList.add(current.name);
				}
				if (current.name1 && lib.character[current.name1] && current.name1.indexOf("gz_shibing") !== 0 && current.name1.indexOf("gz_jun_") !== 0) {
					allList.add(current.name1);
				}
				if (current.name2 && lib.character[current.name2] && current.name2.indexOf("gz_shibing") !== 0 && current.name2.indexOf("gz_jun_") !== 0) {
					allList.add(current.name2);
				}
			});
			const list = [];
			const skills = [];
			const map = [];
			allList.randomSort();
			const triggerName = event.triggername;
			for (const name of allList) {
				if (name.indexOf("zuoci") !== -1 || name.indexOf("xushao") !== -1) {
					continue;
				}
				const characterSkills = lib.character[name][3];
				for (const skill of characterSkills) {
					if (player.getStorage("pingjian").includes(skill)) {
						continue;
					}
					if (player.hasSkill(skill, null, null, false)) {
						continue;
					}
					if (skills.includes(skill)) {
						list.add(name);
						if (!map[name]) {
							map[name] = [];
						}
						map[name].push(skill);
						skills.add(skill);
						continue;
					}
					const expandedSkills = [skill];
					game.expandSkills(expandedSkills);
					for (const expandedSkill of expandedSkills) {
						const info = lib.skill[expandedSkill];
						if (get.is.zhuanhuanji(expandedSkill, player)) {
							continue;
						}
						if (!info || !info.trigger || !info.trigger.player || info.silent || info.limited || info.juexingji || info.hiddenSkill || info.dutySkill || (info.zhuSkill && !player.isZhu2())) {
							continue;
						}
						if (info.trigger.player === triggerName || (Array.isArray(info.trigger.player) && info.trigger.player.includes(triggerName))) {
							if (info.ai && (info.ai.combo || info.ai.notemp || info.ai.neg)) {
								continue;
							}
							if (info.init) {
								continue;
							}
							if (info.filter) {
								try {
									const bool = info.filter(trigger, player, triggerName);
									if (!bool) {
										continue;
									}
								} catch (e) {
									continue;
								}
							}
							list.add(name);
							if (!map[name]) {
								map[name] = [];
							}
							map[name].push(skill);
							skills.add(skill);
							break;
						}
					}
				}
				if (list.length > 2) {
					break;
				}
			}
			if (!skills.length) {
				return;
			}
			event.list = list;
			const result = await player
				.chooseControl({ controls: skills })
				.set("dialog", ["评鉴：请选择尝试发动的技能", [list, "character"]])
				.forResult();
			player.markAuto("pingjian", [result.control]);
			player.addTempSkill(result.control);
			player.storage.pingjian_check[result.control] = trigger.name === "damage" ? trigger : "phaseJieshu";
			const name = event.list.find(name => lib.character[name][3].includes(result.control));
			// if(name) lib.skill.rehuashen.createAudio(name,result.control,'xushao');
			if (name) {
				game.broadcastAll((player, name) => player.tempname.add(name), player, name);
			}
		},
		group: "pingjian_use",
		phaseUse_special: [],
		ai: { threaten: 5 },
	}
```

## xinpi 名字:辛毗 势力:wei

### xpchijie 名字:持节
描述: 每回合每项各限一次。1.当其他角色使用的牌对你结算结束后，你可以令此牌对所有后续目标无效。2.其他角色使用的牌结算完成时，若你是此牌的目标之一且此牌未造成过伤害，则你可以获得此牌对应的所有实体牌。
```js
xpchijie: {
		audio: 2,
		trigger: {
			target: "useCardToAfter",
		},
		filter(event, player) {
			const evt = event.getParent();
			const targets = evt.targets.slice(evt.num + 1);
			return event.player !== player && targets.length > 0;
		},
		usable: 1,
		prompt2(event, player) {
			const evt = event.getParent();
			const targets = evt.targets.slice(evt.num + 1);
			return `令${get.translation(event.card)}对${get.translation(targets)}无效`;
		},
		check(event, player) {
			const evt = event.getParent();
			const targets = evt.targets.slice(evt.num + 1);
			let num = 0;
			for (const current of targets) {
				num += get.effect(current, evt.card, evt.player, player);
			}
			return num < -1;
		},
		async content(event, trigger, player) {
			const evt = trigger.getParent();
			evt.excluded.addArray(evt.targets);
		},
		group: "xpchijie2",
	}
```

### yinju 名字:引裾
描述: 限定技，出牌阶段，你可以选择一名其他角色。若如此做，直到回合结束：1.当你使用牌指定其为目标后，你与其各摸一张牌；2.当你即将对其造成伤害时，防止此伤害，然后其回复等量的体力。
```js
yinju: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		filterTarget: lib.filter.notMe,
		skillAnimation: true,
		animationColor: "water",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.storage.yinju2 = event.target;
			player.addTempSkill("yinju2");
			event.target.addTempSkill("yinju2_target");
		},
		ai: {
			result: {
				order: 10,
				player(player, target) {
					if (player.hasCards("hs", card => get.tag(card, "damage") && player.canUse(card, target)) && target.hp <= 2) {
						return 0.1;
					}
					if (player.countCards("hes", card => player.canUse(card, target)) <= 2) {
						return -100;
					}
					return 1;
				},
				target(player, target) {
					return target.isDamaged() ? 5 : 3;
				},
			},
		},
	}
```

## lisu 名字:李肃 势力:qun

### lslixun 名字:利熏
描述: 锁定技，当你受到伤害时，你防止此伤害，然后获得等同于伤害值的“珠”标记。出牌阶段开始时，你进行判定，若结果点数小于“珠”的数量，你弃置等同于“珠”数量的手牌（若弃牌的牌数不够，则失去剩余数量的体力值）。
```js
lslixun: {
		audio: 2,
		forced: true,
		trigger: { player: "damageBegin4" },
		marktext: "珠",
		intro: {
			name2: "珠",
			content: "共有#个“珠”",
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.addMark("lslixun", trigger.num);
		},
		group: "lslixun_fate",
	}
```

### lskuizhu 名字:馈珠
描述: 出牌阶段结束时，你可以选择体力值为全场最多的一名其他角色，将手牌摸至与该角色相同（最多摸至五张），然后该角色观看你的手牌，弃置任意张手牌并从观看的牌中获得等量的牌。若其得到的牌大于一张，则你选择一项：移去一个“珠”；或令其对其攻击范围内的一名角色造成1点伤害。
```js
lskuizhu: {
		audio: 2,
		trigger: { player: "phaseUseEnd" },
		filter(event, player) {
			return !player.isMaxHp(true);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("lskuizhu"),
					filterTarget: (_card, player, target) => target !== player && target.isMaxHp(),
					ai: target => {
						const targetHandCount = Math.min(5, target.countCards("h"));
						const delta = targetHandCount - player.countCards("h");
						if (delta <= 0) {
							return 0;
						}
						if (get.attitude(player, target) < 1) {
							return false;
						}
						return target.countCards("he", card => lib.skill.zhiheng.check(card) > 0) > 1 ? delta : 0;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.drawTo(Math.min(5, target.countCards("h")));
			if (!player.hasCards("h")) {
				return;
			}
			await target.viewHandcards(player);
			if (!target.hasCards("h")) {
				return;
			}
			const result = await target
				.chooseToDiscard({
					forced: true,
					position: "h",
					selectCard: [0, player.countCards("h")],
					prompt: `弃置至多${get.cnNumber(player.countCards("h"))}张手牌，并获得${get.translation(player)}等量的手牌`,
					allowChooseAll: true,
					ai: card => {
						if (ui.selected.cards.length > 1) {
							return -1;
						}
						return lib.skill.zhiheng.check(card);
					},
				})
				.forResult();
			let result2 = result;
			if (result.bool && result.cards?.length && player.hasGainableCards(target, "h")) {
				result2 = await target
					.gainPlayerCard({
						target: player,
						position: "h",
						forced: true,
						selectButton: result.cards.length,
						visible: true,
					})
					.forResult();
			}
			if (!result2.bool || !result2.cards || result2.cards.length <= 1) {
				return;
			}
			const forced = !(player.storage.lslixun > 0);
			const result3 = await player
				.chooseTarget({
					forced,
					prompt: `令${get.translation(target)}对其攻击范围内的一名角色造成1点伤害${forced ? "" : "，或点「取消」移去一个“珠”"}`,
					filterTarget: (_card, _player, damageTarget) => damageTarget !== target && target.inRange(damageTarget),
					ai: damageTarget => get.damageEffect(damageTarget, target, player),
				})
				.forResult();
			if (!result3.bool || !result3.targets?.length) {
				player.removeMark("lslixun", 1);
				return;
			}
			const target2 = result3.targets[0];
			player.line(target2);
			await target2.damage({ source: target });
		},
		ai: {
			expose: 0.25,
		},
	}
```

## zhangwen 名字:张温 势力:wu

### songshu 名字:颂蜀
描述: 出牌阶段，你可以和其他角色拼点。若你没赢，你与其各摸两张牌，且你本阶段内不能再发动〖颂蜀〗。
```js
songshu: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.hasCards("h");
		},
		filterTarget(card, player, target) {
			return target !== player && player.canCompare(target);
		},
		async content(event, trigger, player) {
			const target = event.target;
			const result = await player
				.chooseToCompare(target)
				.set("small", get.attitude(player, target) > 0)
				.forResult();
			if (result.bool) {
				target.addTempSkill("songshu_ai");
				return;
			}
			const playerDrawEvent = player.draw({
				num: 2,
				nodelay: true,
			});
			const targetDrawEvent = target.draw(2);
			player.tempBanSkill("songshu", "phaseUseAfter");
			await playerDrawEvent;
			await targetDrawEvent;
		},
		ai: {
			basic: {
				order: 1,
			},
			expose: 0.2,
			result: {
				target(player, target) {
					if (target.hasSkill("songshu_ai", null, null, false)) {
						return 0;
					}
					let maxNumber = 0;
					const targetCards = target.getCards("h");
					for (const card of targetCards) {
						if (get.number(card) > maxNumber) {
							maxNumber = get.number(card);
						}
					}
					if (maxNumber > 10) {
						maxNumber = 10;
					}
					if (maxNumber < 5 && targetCards.length > 1) {
						maxNumber = 5;
					}
					const cards = player.getCards("h");
					for (const card of cards) {
						if (get.number(card) < maxNumber) {
							return 1;
						}
					}
					return 0;
				},
			},
		},
	}
```

### sibian 名字:思辩
描述: 摸牌阶段，你可以放弃摸牌，改为亮出牌堆顶的四张牌，然后获得其中所有点数最大与点数最小的牌，且可以将剩余的牌交给手牌数最少的角色。
```js
sibian: {
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.changeToZero();
			const cards = get.cards(4);
			await game.cardsGotoOrdering(cards);
			await player.showCards(cards);
			cards.sort((a, b) => b.number - a.number);
			const gains = [];
			const remainingCards = [];
			const extremeNumbers = [cards[0].number, cards[3].number];
			for (const card of cards) {
				if (extremeNumbers.includes(card.number)) {
					gains.push(card);
				} else {
					remainingCards.push(card);
				}
			}
			await player.gain({
				cards: gains,
				animate: "gain2",
			});
			if (!remainingCards.length) {
				return;
			}

			const result = await player
				.chooseTarget({
					prompt: `是否令一名手牌数最少的角色获得${get.translation(remainingCards)}`,
					filterTarget: (_card, _player, target) => target.isMinHandcard(),
					ai: target => get.attitude(_status.event.player, target),
				})
				.forResult();
			if (!result.bool) {
				return;
			}

			const target = result.targets[0];
			player.line(target);
			player.addExpose(0.2);
			await target.gain({
				cards: remainingCards,
				animate: "gain2",
			});
		},
	}
```

## mangyachang 名字:忙牙长 势力:qun

### spjiedao 名字:截刀
描述: 当你每回合第一次造成伤害时，你可令此伤害至多+X（X为你损失的体力值）。然后若受到此伤害的角色没有死亡，你弃置等同于此伤害加值的牌。
```js
spjiedao: {
		audio: 2,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return player.isDamaged() && game.getGlobalHistory("everything", evt => evt.name === "damage" && evt.source === player, event).indexOf(event) === 0 && event.player.isIn();
		},
		logTarget: "player",
		check(trigger, player) {
			if (get.attitude(player, trigger.player) >= -1) {
				return false;
			}
			return !trigger.player.hasSkillTag("filterDamage", null, {
				player: player,
				card: trigger.card,
			});
		},
		async cost(event, trigger, player) {
			const num = player.getDamagedHp();
			const map = {};
			const controls = [];
			for (let i = 1; i <= num; i++) {
				const cn = get.cnNumber(i, true);
				map[cn] = i;
				controls.push(cn);
			}
			controls.push("cancel2");
			const result = await player
				.chooseControl({
					controls,
					prompt: get.prompt2(event.skill, trigger.player),
					ai: () => {
						if (!lib.skill.spjiedao.check(_status.event.getTrigger(), player)) {
							return "cancel2";
						}
						return get.cnNumber(_status.event.goon, true);
					},
				})
				.set("goon", num)
				.forResult();
			event.result = {
				bool: result.control !== "cancel2",
				cost_data: map[result.control] || 1,
			};
		},
		async content(event, trigger, player) {
			const selectedNum = event.cost_data;
			trigger.num += selectedNum;
			player
				.when({ global: "damageEnd" })
				.filter(evt => evt === trigger)
				.step(async (event, trigger, player) => {
					if (!trigger.player.isIn()) {
						return;
					}
					await player.chooseToDiscard({
						selectCard: selectedNum,
						forced: true,
						position: "he",
					});
				});
		},
	}
```

## xugong 名字:许贡 势力:wu

### biaozhao 名字:表召
描述: 结束阶段，你可以将一张牌置于武将牌上，称为“表”。当有一张与“表”花色点数均相同的牌进入弃牌堆后，你将“表”置入弃牌堆并失去1点体力，若此牌是其他角色因弃置而进入弃牌堆的，则改为该角色获得“表”。准备阶段，若你的武将牌上有“表”，则你将“表”置入弃牌堆。然后你选择一名角色，该角色回复1点体力且将手牌摸至与全场手牌数最多的人相同（最多摸五张）。
```js
biaozhao: {
		audio: 2,
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile({ cards });
			}
		},
		trigger: {
			player: "phaseJieshuBegin",
		},
		direct: true,
		filter(event, player) {
			return player.countCards("he") > 0 && !player.getExpansions("biaozhao").length;
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseCard({
					position: "he",
					prompt: get.prompt("biaozhao"),
					prompt2: "将一张牌置于武将牌上作为“表”",
					ai: card => 6 - get.value(card),
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			player.logSkill("biaozhao");
			await player.addToExpansion({
				cards: result.cards,
				source: player,
				animate: "give",
				gaintag: ["biaozhao"],
			});
		},
		ai: {
			notemp: true,
		},
		group: ["biaozhao2", "biaozhao3"],
	}
```

### yechou 名字:业仇
描述: 当你死亡时，你可以选择一名已损失体力值大于1的角色。直到其下个回合开始前，每个回合结束时，该角色失去1点体力。
```js
yechou: {
		audio: 2,
		trigger: {
			player: "die",
		},
		forceDie: true,
		skillAnimation: true,
		animationColor: "wood",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: (card, player, target) => player !== target && target.getDamagedHp() > 1,
					ai: target => {
						const attitude = get.attitude(_status.event.player, target);
						if (attitude > 0) {
							return 0;
						}
						const adjustedAttitude = Math.sqrt(0.01 - attitude);
						return adjustedAttitude * (get.distance(_status.currentPhase, target, "absolute") || game.players.length);
					},
				})
				.set("forceDie", true)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.line(target, "green");
			target.addTempSkill("yechou2", { player: "phaseZhunbeiBegin" });
		},
		ai: {
			expose: 0.5,
			maixie_defend: true,
		},
	}
```

## zhangchangpu 名字:张昌蒲 势力:wei

### yanjiao 名字:严教
描述: 出牌阶段限一次，你可以选择一名其他角色并从牌堆顶亮出四张牌。该角色将这些牌分成点数之和相等的两组，你与其各获得其中一组，然后将剩余未分组的牌置入弃牌堆。若未分组的牌超过一张，则你本回合手牌上限-1。
```js
yanjiao: {
		audio: 2,
		ai: {
			order: 10,
			result: {
				player: 1,
				target: 1.1,
			},
		},
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target !== player;
		},
		async content(event, trigger, player) {
			const { target } = event;
			let num = 4;
			if (player.storage.xingshen) {
				num += player.storage.xingshen;
				player.storage.xingshen = 0;
				player.unmarkSkill("xingshen");
			}
			if (player.storage.olxingshen) {
				num += player.storage.olxingshen;
				player.storage.olxingshen = 0;
				player.unmarkSkill("olxingshen");
			}
			num = Math.min(10, num);
			const cards = get.cards(num);
			await game.cardsGotoOrdering(cards);
			await player.showCards(cards);
			let getedResult = lib.skill.yanjiao.getResult(cards);
			if (!getedResult.length) {
				player.addTempSkill("yanjiao2");
				return;
			}
			const { control } = await target
				.chooseControl({
					controls: ["自动分配", "手动分配"],
					prompt: "【严教】：是否让系统自动分配方案？",
					ai: () => 0,
				})
				.forResult();
			if (control === "手动分配") {
				const moveResult = await target
					.chooseToMove({
						prompt: "严教：分出点数相等的两组牌",
						list: [
							["未分配", cards, list => `未分配（点数和${list.reduce((sum, card) => sum + card.number, 0)}）`],
							["第一组", [], list => `第一组（点数和${list.reduce((sum, card) => sum + card.number, 0)}）`],
							["第二组", [], list => `第二组（点数和${list.reduce((sum, card) => sum + card.number, 0)}）`],
						],
						processAI: () => false,
					})
					.set("chooseTime", `${cards.length * 4}`)
					.set("filterOk", moved => {
						const num1 = moved[1].reduce((sum, card) => sum + card.number, 0);
						if (num1 === 0) {
							return false;
						}
						const num2 = moved[2].reduce((sum, card) => sum + card.number, 0);
						return num1 === num2;
					})
					.forResult();
				if (!moveResult.bool) {
					player.addTempSkill("yanjiao2");
					return;
				}
				const moved = moveResult.moved;
				getedResult = [[moved[1], moved[2], moved[0]]];
			}
			const togain = getedResult[0];
			await target.showCards(togain[0], `${get.translation(target)}分出的第一份牌`);
			await target.showCards(togain[1], `${get.translation(target)}分出的第二份牌`);
			const { index } = await target
				.chooseControl({
					choiceList: [`获得${get.translation(togain[0])}`, `获得${get.translation(togain[1])}`],
					ai: () => (Math.random() < 0.5 ? 1 : 0),
				})
				.forResult();
			const list = [
				[target, togain[index]],
				[player, togain[1 - index]],
			];
			await game
				.loseAsync({
					gain_list: list,
					giver: target,
					animate: "gain2",
				})
				.setContent("gaincardMultiple");
			if (togain[2].length > 1) {
				player.addTempSkill("yanjiao2");
			}
		},
		getResult(cards) {
			const cl = cards.length;
			const maxmium = Math.pow(3, cl);
			const filter = list => {
				if (!list[1].length || !list[0].length) {
					return false;
				}
				const num1 = list[1].reduce((sum, card) => sum + card.number, 0);
				const num2 = list[0].reduce((sum, card) => sum + card.number, 0);
				return num1 === num2;
			};
			const results = [];
			for (let i = 0; i < maxmium; i++) {
				const result = [[], [], []];
				for (let j = 0; j < cl; j++) {
					result[Math.floor((i % Math.pow(3, j + 1)) / Math.pow(3, j))].push(cards[j]);
				}
				if (filter(result)) {
					results.push(result);
				}
			}
			const filterSame = (list1, list2) => {
				if (list1[1].length !== list2[0].length || list1[0].length !== list2[1].length) {
					return false;
				}
				return list1[0].every(card => list2[1].includes(card)) && list1[1].every(card => list2[0].includes(card));
			};
			for (let i = 0; i < results.length; i++) {
				for (let j = i + 1; j < results.length; j++) {
					if (filterSame(results[i], results[j])) {
						results.splice(j--, 1);
					}
				}
			}
			results.sort((a, b) => a[2].length - b[2].length);
			return results.slice(0, 50);
		},
	}
```

### xingshen 名字:省身
描述: 当你受到伤害后，你可以摸一张牌且下一次发动〖严教〗亮出的牌数+1。若你的手牌数为全场最少，则改为摸两张牌；若你的体力值为全场最少，则〖严教〗亮出的牌数改为+2（加值总数不能超过4）。
```js
xingshen: {
		audio: 2,
		intro: {
			content: "下一次发动【严教】时多展示#张牌",
		},
		trigger: {
			player: "damageEnd",
		},
		frequent: true,
		async content(event, trigger, player) {
			await player.draw(player.isMinHandcard() ? 2 : 1);
			if (!player.storage.xingshen) {
				player.storage.xingshen = 0;
			}
			player.storage.xingshen += player.isMinHp() ? 2 : 1;
			if (player.storage.xingshen > 4) {
				player.storage.xingshen = 4;
			}
			player.markSkill("xingshen");
		},
	}
```

## gaolan 名字:OL高览 势力:qun

### xiying 名字:袭营
描述: 出牌阶段开始时，你可以弃置一张非基本手牌，然后令所有其他角色依次选择一项：弃置一张牌，或本回合内不能使用或打出牌；且你本回合内获得如下效果：结束阶段，若你于本回合的出牌阶段内造成过伤害，则你从牌堆中获得一张伤害性基本牌或普通锦囊牌。
```js
xiying: {
		trigger: { player: "phaseUseBegin" },
		audio: 2,
		filter(event, player) {
			return player.hasCards("h", card => _status.connectMode || get.type(card) !== "basic");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt2("xiying"),
					position: "h",
					filterCard: card => get.type(card) !== "basic",
					chooseonly: true,
					ai: card => _status.event.val - get.value(card),
				})
				.set("val", 4 * Math.sqrt(game.countPlayer(current => get.attitude(player, current) < 0 && current.hasCards("he"))))
				.forResult();
			if (event.result.bool) {
				event.result.targets = game.filterPlayer(current => current !== player);
				event.result.targets.sortBySeat();
			}
		},
		async content(event, trigger, player) {
			await player.discard({ cards: event.cards, discarder: player });
			player.addTempSkill("xiying_gain");
			for (const target of event.targets) {
				if (!target.isIn()) {
					continue;
				}
				const result = await target
					.chooseToDiscard({
						position: "he",
						prompt: "弃置一张牌，或本回合内不能使用或打出牌",
						ai: card => {
							const current = _status.event.player;
							const source = _status.event.getTrigger().player;
							if (get.attitude(source, current) > 0) {
								return -1;
							}
							if (_status.event.getRand() > 0.5) {
								return 5 - get.value(card);
							}
							return -1;
						},
					})
					.forResult();
				if (!result.bool) {
					target.addTempSkill("xiying2");
				}
			}
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				return arg.target.hasSkill("xiying2");
			},
		},
		subSkill: {
			gain: {
				audio: "xiying",
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				charlotte: true,
				filter(event, player) {
					return player.getHistory("sourceDamage", evt => evt.isPhaseUsing(player)).length > 0;
				},
				async content(event, trigger, player) {
					const card = get.cardPile2(card => {
						const type = get.type(card, null, false);
						if (type !== "basic" && type !== "trick") {
							return false;
						}
						return get.tag(card, "damage") > 0;
					});
					if (!card) {
						return;
					}
					await player.gain({ cards: [card], animate: "gain2" });
				},
			},
		},
	}
```

## sp_shenpei 名字:SP审配 势力:qun

### gangzhi 名字:刚直
描述: 锁定技，当你即将受到其他角色造成的伤害时，或即将对其他角色造成伤害时，你防止此伤害，改为受到伤害的角色失去等量的体力。
```js
gangzhi: {
		audio: 2,
		trigger: {
			player: "damageBefore",
			source: "damageBefore",
		},
		forced: true,
		filter(event, player) {
			if (event.source === event.player) {
				return false;
			}
			if (event.player === player) {
				return event.source && event.source.isIn();
			}
			return true;
		},
		async content(event, trigger, player) {
			trigger.cancel();
			await trigger.player.loseHp(trigger.num);
		},
		ai: {
			jueqing: true,
		},
		init(player) {
			game.addGlobalSkill("gangzhi_jueqing");
		},
		onremove() {
			if (!game.hasPlayer(cur => cur.hasSkill("gangzhi", null, null, false), true)) {
				game.removeGlobalSkill("gangzhi_jueqing");
			}
		},
		subSkill: {
			jueqing: {
				trigger: { player: "dieAfter" },
				filter(event, player) {
					return !game.hasPlayer(cur => cur.hasSkill("gangzhi", null, null, false));
				},
				silent: true,
				forceDie: true,
				async content(event, trigger, player) {
					game.removeGlobalSkill("gangzhi_jueqing");
				},
				ai: {
					jueqing: true,
					skillTagFilter(player, tag, arg) {
						if (tag === "jueqing") {
							return arg && arg.hasSkill("gangzhi");
						}
					},
				},
			},
		},
	}
```

### beizhan 名字:备战
描述: 回合结束后，你可以令一名角色将手牌摸至体力上限（至多为5）。其下个回合开始时，若其手牌数为全场最多，则其此回合内使用的牌不能指定其他角色为目标。
```js
beizhan: {
		trigger: { player: "phaseEnd" },
		audio: 2,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					ai: target => {
						const player = _status.event.player;
						const attitude = get.attitude(player, target);
						const handcardCount = target.countCards("h");
						const maxHp = target.maxHp;
						if (handcardCount >= maxHp && target.isMaxHandcard()) {
							return -attitude * handcardCount;
						}
						if (handcardCount < maxHp && game.hasPlayer(current => current.countCards("h") > maxHp)) {
							return attitude * 2 * (maxHp - handcardCount);
						}
						return 0;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const drawEvent = target.drawTo(Math.min(5, target.maxHp));
			target.addSkill("beizhan2");
			await drawEvent;
		},
		ai: {
			expose: 0.25,
		},
	}
```

## xunchen 名字:OL荀谌 势力:qun

### fenglve 名字:锋略
描述: 出牌阶段开始时，你可以与一名角色拼点，若你赢，该角色将其区域内的各一张牌交给你；若你没赢，你交给其一张牌。当你的单人拼点结算后，你可以令对方获得你拼点的牌。
```js
fenglve: {
		audio: 2,
		trigger: {
			player: "phaseUseBegin",
		},
		direct: true,
		async content(event, trigger, player) {
			const goon = player.hasCard(card => {
				if (get.position(card) !== "h") {
					return false;
				}
				const val = get.value(card);
				if (val < 0) {
					return true;
				}
				if (val <= 5) {
					return card.number >= 12;
				}
				if (val <= 6) {
					return card.number >= 13;
				}
				return false;
			});
			const targetResult = await player
				.chooseTarget({
					prompt: get.prompt2("fenglve"),
					filterTarget: (card, player, target) => player.canCompare(target),
					ai: target => {
						if (!_status.event.goon) {
							return 0;
						}
						return (-get.attitude(player, target) * (1 + target.countCards("e"))) / (1 + target.countCards("j"));
					},
				})
				.set("goon", goon)
				.forResult();
			if (!targetResult.bool) {
				return;
			}
			const target = targetResult.targets[0];
			player.logSkill("fenglve", target);
			const compareResult = await player.chooseToCompare(target).forResult();
			let gainner;
			let giver;
			let cardResult;
			if (compareResult.bool) {
				const num = ["h", "e", "j"].filter(position => target.hasCards(position)).length;
				if (!num) {
					return;
				}
				gainner = player;
				giver = target;
				cardResult = await target
					.choosePlayerCard({
						target,
						selectButton: num,
						position: "hej",
						forced: true,
						filterButton: button => ui.selected.buttons.every(selected => get.position(button.link) !== get.position(selected.link)),
						prompt: `选择交给${get.translation(gainner)}的牌`,
					})
					.forResult();
			} else {
				if (!player.countCards("he")) {
					return;
				}
				gainner = target;
				giver = player;
				cardResult = await player
					.choosePlayerCard({
						target: player,
						forced: true,
						position: "he",
						prompt: `选择交给${get.translation(gainner)}的牌`,
					})
					.forResult();
			}
			await giver.give(cardResult.links, gainner);
		},
		group: "fenglve2",
		ai: {
			expose: 0.25,
		},
	}
```

### mouzhi 名字:谋识
描述: 出牌阶段限一次，你可以将一张手牌交给一名角色，若如此做，当其于其下回合的出牌阶段内对一名角色造成伤害后，若是此阶段其第一次对该角色造成伤害，你摸一张牌。
```js
mouzhi: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasCards("h");
		},
		filterCard: true,
		filterTarget(card, player, target) {
			if (target.storage.mouzhi2 && target.storage.mouzhi2.includes(player)) {
				return false;
			}
			return target !== player;
		},
		delay: 0,
		lose: false,
		discard: false,
		check(card) {
			if (card.name === "du") {
				return 20;
			}
			const player = _status.event.player;
			const useValue = player.getUseValue(card);
			let maxValue = 0;
			game.countPlayer(current => {
				if (current !== player && !current.hasSkillTag("nogain") && get.attitude(player, current) > 0) {
					const currentValue = current.getUseValue(card);
					if (currentValue > maxValue) {
						maxValue = currentValue;
					}
				}
			});
			if (maxValue > 0 && get.tag(card, "damage")) {
				return 15;
			}
			if (maxValue > useValue) {
				return 10;
			}
			if (player.needsToDiscard()) {
				return 1 / Math.max(0.1, get.value(card));
			}
			return -1;
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			const target = event.target;
			const giveEvent = player.give(cards, target);
			target.addTempSkill("mouzhi2", { player: "phaseEnd" });
			target.storage.mouzhi2.add(player);
			target.storage.mouzhi2.sortBySeat(target);
			target.markSkill("mouzhi2");
			await giveEvent;
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					const card = ui.selected.cards[0];
					if (card.name === "du") {
						return target.hasSkill("lucia_duqu") ? 1 : -1;
					}
					const targetValue = target.getUseValue(card);
					const playerValue = player.getUseValue(card);
					if (targetValue > playerValue) {
						return 2;
					}
					if (targetValue > 0) {
						return 1.5;
					}
					if (player.needsToDiscard()) {
						return 1;
					}
					return 0;
				},
			},
		},
	}
```

## sp_zhanghe 名字:SP张郃 势力:qun

### yuanlve 名字:远略
描述: 出牌阶段限一次，你可以将一张非装备牌交给一名角色，然后该角色可以使用该牌并令你摸一张牌。
```js
yuanlve: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		filter(event, player) {
			return player.hasCards("h", card => get.type(card) !== "equip");
		},
		filterCard(card) {
			return get.type(card) !== "equip";
		},
		filterTarget: lib.filter.notMe,
		delay: false,
		discard: false,
		lose: false,
		check(card) {
			if (card.name === "du") {
				return 20;
			}
			const player = _status.event.player;
			const useValue = player.getUseValue(card);
			let maxValue = 0;
			game.countPlayer(current => {
				if (current !== player && !current.hasSkillTag("nogain") && get.attitude(player, current) > 0) {
					const currentValue = current.getUseValue(card);
					if (currentValue > maxValue) {
						maxValue = currentValue;
					}
				}
			});
			if (maxValue > useValue) {
				return 15;
			}
			if (maxValue > 0) {
				return 10;
			}
			if (player.needsToDiscard()) {
				return 1 / Math.max(0.1, get.value(card));
			}
			return -1;
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.give(cards, target);
			const result = await target
				.chooseUseTarget({
					card: cards[0],
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			await player.draw();
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					const card = ui.selected.cards[0];
					if (card.name === "du") {
						return target.hasSkill("lucia_duqu") ? 1 : -1;
					}
					const targetValue = target.getUseValue(card);
					const playerValue = player.getUseValue(card);
					if (targetValue > playerValue) {
						return 2;
					}
					if (targetValue > 0) {
						return 1.5;
					}
					if (player.needsToDiscard()) {
						return 1;
					}
					return 0;
				},
			},
		},
	}
```

## sp_xuyou 名字:SP许攸 势力:qun

### spshicai 名字:恃才
描述: 出牌阶段，牌堆顶的一张牌对你可见。你可以弃置一张牌，然后获得牌堆顶的一张牌，且不能再发动〖恃才〗直到此牌离开你的手牌区。
```js
spshicai: {
		audio: 2,
		enable: "phaseUse",
		position: "he",
		filter(event, player) {
			return !player.storage.spshicai2 || !player.hasCards("h", card => card === player.storage.spshicai2);
		},
		filterCard: true,
		prompt() {
			const str = get.itemtype(_status.pileTop) === "card" ? get.translation(_status.pileTop) : "牌堆顶的一张牌";
			return `弃置一张牌，然后获得${str}`;
		},
		check(card) {
			const player = _status.event.player;
			const cardx = _status.pileTop;
			if (get.itemtype(cardx) !== "card") {
				return 0;
			}
			const val = player.getUseValue(cardx, null, true);
			if (!val) {
				return 0;
			}
			const val2 = player.getUseValue(card, null, true);
			return (val - val2) / Math.max(0.1, get.value(card));
		},
		async content(event, trigger, player) {
			const card = get.cards()[0];
			player.storage.spshicai2 = card;
			await player.gain({
				cards: [card],
				animate: "draw",
			});
			game.log(player, "获得了牌堆顶的一张牌");
		},
		group: "spshicai_mark",
		ai: {
			order: 1,
			result: { player: 1 },
		},
	}
```

### spfushi 名字:附势
描述: 锁定技，若己方存活角色数：大于敌方，你视为拥有〖择主〗；小于敌方，你视为拥有〖逞功〗。
```js
spfushi: {
		group: ["zezhu", "chenggong"],
		derivation: ["zezhu", "chenggong"],
		locked: true,
	}
```

## chunyuqiong 名字:淳于琼 势力:qun

### cangchu 名字:仓储
描述: 锁定技，游戏开始时，你获得3枚“粮”标记，当你受到1点火焰伤害后，你失去一枚“粮”标记。
```js
cangchu: {
		trigger: {
			global: "phaseBefore",
			player: ["damageEnd", "enterGame"],
		},
		audio: 2,
		forced: true,
		filter(event, player) {
			if (event.name !== "damage") {
				return event.name !== "phase" || game.phaseNumber === 0;
			}
			return event.hasNature("fire") && player.countMark("cangchu") > 0;
		},
		async content(event, trigger, player) {
			if (trigger.name !== "damage") {
				player.addMark("cangchu", 3);
				return;
			}
			player.removeMark("cangchu", Math.min(trigger.num, player.countMark("cangchu")));
			if (!player.hasMark("cangchu")) {
				event.trigger("cangchuAwaken");
			}
		},
		marktext: "粮",
		intro: {
			name2: "粮",
			content: "mark",
		},
		ai: {
			threaten(player, target) {
				return 1 + target.countMark("cangchu") / 2;
			},
			effect: {
				target(card, player, target, current) {
					if (target.hasMark("cangchu")) {
						if (card.name === "sha") {
							if (lib.skill.global.includes("huoshaowuchao") || game.hasNature(card, "fire") || player.hasSkill("zhuque_skill")) {
								return 2;
							}
						}
						if (get.tag(card, "fireDamage") && current < 0) {
							return 2;
						}
					}
				},
			},
			combo: "liangying",
		},
	}
```

### sushou 名字:宿守
描述: 弃牌阶段开始时，你可以摸X+1张牌（X为“粮”数），然后可以交给任意名友方角色各一张牌。
```js
sushou: {
		audio: 2,
		trigger: { player: "phaseDiscardBegin" },
		frequent: true,
		async content(event, trigger, player) {
			await player.draw(1 + player.countMark("cangchu"));
			const num = Math.min(
				player.countCards("h"),
				player.countCards("he"),
				game.countPlayer(target => target != player && target.isFriendOf(player))
			);
			if (num) {
				let list = [];
				if (_status.connectMode) {
					game.broadcastAll(() => (_status.noclearcountdown = true));
				}
				while (num - list.length > 0) {
					const { bool, targets, cards } = await player
						.chooseCardTarget({
							prompt: "宿守：你可以交给友方角色各一张牌",
							position: "he",
							animate: false,
							filterCard(card, player) {
								return !get.event().list.some(list => list[1] == card);
							},
							filterTarget(card, player, target) {
								return target != player && target.isFriendOf(player) && !get.event().list.some(list => list[0] == target);
							},
							ai1(card) {
								if (card.name == "shan") {
									return 1;
								}
								return Math.random();
							},
							ai2(target) {
								return get.attitude(get.event().player, target);
							},
						})
						.set("list", list)
						.forResult();
					if (bool) {
						list.push([targets[0], cards[0]]);
						player.addGaintag(cards, "olsujian_given");
					} else {
						break;
					}
				}
				if (_status.connectMode) {
					game.broadcastAll(() => {
						delete _status.noclearcountdown;
						game.stopCountChoose();
					});
				}
				if (list.length) {
					await game
						.loseAsync({
							gain_list: list,
							player: player,
							cards: list.slice().flatMap(list => list[1]),
							giver: player,
							animate: "giveAuto",
						})
						.setContent("gaincardMultiple");
				}
			}
		},
	}
```

### liangying 名字:粮营
描述: 锁定技，若你有“粮”标记，则友方角色摸牌阶段摸牌数+1；当你失去所有“粮”标记后，你减1点体力上限，然后令敌方角色各摸两张牌。
```js
liangying: {
		trigger: {
			global: "phaseDrawBegin2",
			player: "cangchuAwaken",
		},
		forced: true,
		audio: false,
		logTarget(event, player) {
			if (event.name === "phaseDraw") {
				return event.player;
			}
			return game.filterPlayer(current => current.isEnemyOf(player));
		},
		filter(event, player) {
			if (event.name === "cangchu") {
				return true;
			}
			return player.hasMark("cangchu") && !event.numFixed && event.player.isFriendOf(player);
		},
		async content(event, trigger, player) {
			if (trigger.name !== "cangchu") {
				trigger.num++;
				return;
			}
			const loseMaxHpEvent = player.loseMaxHp();
			const list = game.filterPlayer(current => current.isEnemyOf(player));
			const drawPromise = list.length ? game.asyncDraw(list, 2) : null;
			await loseMaxHpEvent;
			if (drawPromise) {
				await drawPromise;
			}
			await game.delay();
		},
		ai: {
			combo: "cangchu",
		},
	}
```

## lvkuanglvxiang 名字:OL吕旷吕翔 势力:qun

### liehou 名字:列侯
描述: 出牌阶段限一次，你可以令一名攻击范围内的角色交给你一张手牌，然后你将一张手牌交给攻击范围内的另一名角色。
```js
liehou: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		filterTarget(card, player, target) {
			return player.inRange(target) && target.countCards("h");
		},
		async content(event, trigger, player) {
			const { target } = event;
			const giveResult = await target
				.chooseCard({
					position: "h",
					forced: true,
					prompt: `交给${get.translation(player)}一张牌`,
				})
				.forResult();
			if (!giveResult.bool) {
				return;
			}
			await target.give(giveResult.cards, player);
			if (!player.countCards("h") || !game.hasPlayer(current => current !== target && player.inRange(current))) {
				return;
			}
			const result = await player
				.chooseCardTarget({
					position: "h",
					filterCard: true,
					filterTarget: (card, player, target) => target !== _status.event.getParent().target && player.inRange(target),
					forced: true,
					prompt: "将一张手牌交给一名攻击范围内的其他角色",
					ai1: card => {
						const current = _status.event.player;
						if (get.name(card) === "du") {
							return 20;
						}
						if (game.hasPlayer(target => target !== _status.event.getParent().target && current.inRange(target) && get.attitude(current, target) > 0 && target.getUseValue(card) > current.getUseValue(card))) {
							return 12;
						}
						if (game.hasPlayer(target => target !== current && get.attitude(current, target) > 0)) {
							if (card.name === "wuxie") {
								return 11;
							}
							if (card.name === "shan" && current.countCards("h", "shan") > 1) {
								return 9;
							}
						}
						return 6 / Math.max(1, get.value(card));
					},
					ai2: target => {
						const current = _status.event.player;
						const card = ui.selected.cards[0];
						const attitude = get.attitude(current, target);
						if (card.name === "du") {
							return -6 * attitude;
						}
						if (attitude > 0) {
							if (get.position(card) === "h" && target.getUseValue(card) > current.getUseValue(card)) {
								return 4 * attitude;
							}
							if (get.value(card, target) > get.value(card, current)) {
								return 2 * attitude;
							}
							return 1.2 * attitude;
						}
						return (-attitude * Math.min(4, target.countCards("he"))) / 6;
					},
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			await player.give(result.cards, result.targets[0]);
		},
		ai: {
			order: 6,
			result: {
				target: -1,
			},
		},
	}
```

### qigong 名字:齐攻
描述: 当你使用的仅指定唯一目标的【杀】被【闪】抵消之后，你可以令一名角色再对目标角色使用一张【杀】（不可被响应）。
```js
qigong: {
		trigger: { player: "shaMiss" },
		audio: 2,
		filter(event, player) {
			return event.targets?.length === 1 && event.target?.isIn() && game.hasPlayer(current => current !== event.target && current.canUse("sha", event.target, false));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt(event.skill),
					prompt2: `令一名角色可再对${get.translation(trigger.target)}使用一张【杀】`,
					filterTarget: (card, player, target) => {
						const source = _status.event.getTrigger().target;
						return target !== source && target.canUse("sha", source, false);
					},
					ai: target => {
						const player = _status.event.player;
						const card = { name: "sha" };
						const source = _status.event.getTrigger().target;
						if (target.hasSha()) {
							const effect = get.effect(source, card, target, target);
							if (effect > 0) {
								return get.effect(source, card, target, player);
							}
						}
						return target !== player ? Math.random() * get.attitude(player, target) : 0;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			target.addTempSkill("qigong_ai", "chooseToUseEnd");
			const next = target
				.chooseToUse({
					prompt: `是否再对${get.translation(trigger.target)}使用一张【杀】？`,
					filterCard: (card, player, event) => get.name(card) === "sha" && lib.filter.filterCard(card, player, event),
					filterTarget: (card, player, target) => target === trigger.target,
					selectTarget: -1,
				})
				.set("addCount", false)
				.set("oncard", () => {
					_status.event.directHit.addArray(game.players);
				});
			await next;
		},
		subSkill: {
			ai: {
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						return arg.card && arg.card.name === "sha";
					},
				},
			},
		},
	}
```

## duji 名字:duji 势力:wei

### xinfu_andong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### xinfu_yingshi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## liuyao 名字:liuyao 势力:qun

### xinfu_kannan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twniju
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## lvdai 名字:lvdai 势力:wu

### xinfu_qinguo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## sp_taishici 名字:sp_taishici 势力:qun

### xinfu_jixu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_zhangliang 名字:re_zhangliang 势力:qun

### xinfu_jijun
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### xinfu_fangtong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

