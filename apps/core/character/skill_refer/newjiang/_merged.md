# newjiang merged reference

## yj_wanglang 名字:☆王朗 势力:qun

### fuyu 名字:负隅
描述: 每回合每项各限一次，当你成为其他角色使用基本牌或普通锦囊牌的唯一目标时，或你使用基本牌或普通锦囊牌指定其他角色为唯一目标时，你可与其拼点：若此牌的使用者赢，此牌额外结算一次；若此牌的使用者没赢，此牌无效。若你的拼点结果与上一次发动此技能时相同，你摸两张牌。
```js
fuyu: {
		audio: 4,
		logAudio: index => (typeof index === "number" ? "fuyu" + index + ".mp3" : 2),
		trigger: {
			player: "useCardToPlayer",
			target: "useCardToTarget",
		},
		usable: 2,
		filter(event, player, name) {
			if (event.targets?.length !== 1 || !event.isFirstTarget) {
				return false;
			}
			if (!["basic", "trick"].includes(get.type(event.card))) {
				return false;
			}
			const target = name === "useCardToTarget" ? event.player : event.targets[0];
			if (!player.canCompare(target) || target == player) {
				return false;
			}
			const storage = player.getStorage("fuyu_used", {});
			return !storage[name];
		},
		logTarget(event, player, name) {
			return name === "useCardToTarget" ? event?.player : event?.targets[0];
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const result = await player.chooseToCompare(target).forResult();
			const cardUserWon = !result.tie && result.winner === trigger.player;
			if (cardUserWon) {
				game.log(trigger.card, "额外结算一次");
				trigger.getParent().effectCount++;
			} else {
				game.log(trigger.card, "被无效了");
				trigger.getParent().all_excluded = true;
			}
			const playerResult = result.bool;
			const lastResult = player.storage[event.name + "_last"];
			if (playerResult === lastResult) {
				player.logSkill(event.name, null, null, null, [get.rand(3, 4)]);
				await player.draw(2);
			}
			player.setStorage(event.name + "_last", playerResult);
			const storage = player.getStorage(event.name + "_used", {});
			storage[event.triggername] = true;
			player.setStorage(event.name + "_used", storage);
			player.addTempSkill(event.name + "_used");
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

### zhanshi 名字:瞻势
描述: 当有角色进行拼点时，你可选择此次拼点中的任意名角色并弃置等量张牌，此次拼点结算后，你选择的角色中每有一名角色赢，你摸三张牌。
```js
zhanshi: {
		audio: 4,
		logAudio: index => (typeof index === "number" ? "zhanshi" + index + ".mp3" : 2),
		trigger: { global: "compareCardShowBefore" },
		filter(event, player) {
			return player.hasDiscardableCards(player, "he");
		},
		async cost(event, trigger, player) {
			const participants = [trigger.player, ...(trigger.targets?.length ? trigger.targets : [trigger.target])];
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt2(event.skill),
					filterTarget(card, player, target) {
						return get.event().targets.includes(target);
					},
					selectTarget() {
						return ui.selected.cards.length;
					},
					filterCard: lib.filter.cardDiscardable,
					position: "he",
					selectCard: [1, participants.length],
				})
				.set("targets", participants)
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards, targets } = event;
			await player.discard({ cards });
			player.addTempSkill(event.name + "_draw");
			player.markAuto(event.name + "_draw", [[trigger, targets]]);
		},
		subSkill: {
			draw: {
				charlotte: true,
				forced: true,
				popup: false,
				onremove: true,
				trigger: { global: ["chooseToCompareAfter", "compareMultipleAfter"] },
				filter(event, player) {
					if (event.preserve || event.compareMultiple) {
						return false;
					}
					const bool = event.name == "compareMultiple";
					return player.getStorage("zhanshi_draw").find(arr => (!bool ? event == arr[0] : event.getParent() == arr[0]));
				},
				async content(event, trigger, player) {
					const bool = trigger.name == "compareMultiple";
					const list = player.getStorage("zhanshi_draw").find(arr => (!bool ? trigger == arr[0] : trigger.getParent() == arr[0]));
					const targets = list[1];
					const winner = trigger.winner || trigger.result?.winner;
					const winCount = targets.filter(t => t === winner).length;
					if (winCount > 0) {
						player.logSkill("zhanshi", null, null, null, [get.rand(3, 4)]);
						await player.draw(winCount * 3);
					}
				},
			},
		},
	}
```

## yj_x_xunxu 名字:荀勖 势力:wei

### diyin 名字:笛音
描述: 锁定技，你每失去七次牌后，你获得下一次进入弃牌堆的牌；当你受到伤害后，所有体力与你相同的角色各摸一张牌。
```js
diyin: {
		audio: 2,
		forced: true,
		trigger: {
			global: ["loseAfter", "loseAsyncAfter", "cardsDiscardAfter"],
		},
		filter(event, player) {
			return player.countMark("diyin") >= 7 && event.getd()?.filterInD("d")?.length > 0;
		},
		async content(event, trigger, player) {
			const cards = trigger.getd().filterInD("d");
			player.setMark(event.name, 0, false);
			await player.gain({ cards, animate: "gain2" });
		},
		init(player, skill) {
			player.addSkill(`${skill}_mark`);
		},
		onremove(player, skill) {
			delete player.storage[skill];
			player.removeSkill(`${skill}_mark`);
		},
		intro: {
			markcount: "mark",
			content: "当前已失去：#/7",
		},
		group: ["diyin_damage"],
		subSkill: {
			mark: {
				charlotte: true,
				forced: true,
				popup: false,
				trigger: {
					global: ["loseEnd", "loseAsyncEnd", "equipEnd", "gainEnd", "addJudgeEnd", "addToExpansionEnd"],
				},
				filter(event, player) {
					return event.getl?.(player)?.cards2?.length > 0 && player.countMark("diyin") < 7;
				},
				async content(event, trigger, player) {
					const skill = "diyin";
					player.addMark(skill, 1, false);
				},
			},
			damage: {
				audio: "diyin",
				forced: true,
				trigger: {
					player: "damageEnd",
				},
				logTarget(event, player) {
					return game.filterPlayer(target => target.hp == player?.hp).sortBySeat();
				},
				async content(event, trigger, player) {
					const { targets } = event;
					await game.asyncDraw(targets);
				},
			},
		},
	}
```

### boqia 名字:博洽
描述: 每回合限一次，你可以将三张牌当一张基本牌或非伤害普通锦囊牌使用，若这三张牌的花色或类型均不同，此牌结算后你令一名角色将手牌调整至其体力上限，然后此技能可再次发动（每回合每种牌名限一次）。
```js
boqia: {
		audio: 2,
		usable: 1,
		hiddenCard(player, name) {
			if (player.getStat().skill?.boqia >= 0 || player.countCards("hes") < 3 || player.getStorage("boqia_used").includes(name)) {
				return false;
			}
			return get.type(name) == "basic" || (get.type(name) == "trick" && !get.tag({ name }, "damage"));
		},
		enable: "chooseToUse",
		getList(event, player) {
			return get.inpileVCardList(info => {
				if (player.getStorage("boqia_used").includes(info[2])) {
					return false;
				}
				return (info[0] == "basic" || (info[0] == "trick" && !get.tag({ name: info[2] }, "damage"))) && event.filterCard(get.autoViewAs({ name: info[2], nature: info[3] }, "unsure"), player, event);
			});
		},
		filter(event, player) {
			return player.countCards("hes") >= 3 && get.info("boqia").getList(event, player).length > 0;
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("博洽", [get.info("boqia").getList(event, player), "vcard"], "hidden");
			},
			check(button) {
				const event = get.event().getParent();
				if (event.type !== "phase") {
					return 1;
				}
				return get.player().getUseValue(get.autoViewAs({ name: button.link[2], nature: button.link[3] }, "unsure"));
			},
			prompt(links) {
				return '###博洽###<div class="text center">将三张牌当作' + (get.translation(links[0][3]) || "") + "【" + get.translation(links[0][2]) + "】使用</div>";
			},
			backup(links) {
				return {
					audio: "boqia",
					filterCard: true,
					selectCard: 3,
					position: "hes",
					popname: true,
					log: false,
					viewAs: { name: links[0][2], nature: links[0][3] },
					check(card) {
						const selected = ui.selected.cards.slice();
						if (selected.length) {
							const types = selected
								.concat([card])
								.map(card => get.type2(card))
								.unique();
							const suits = selected
								.concat([card])
								.map(card => get.suit(card))
								.unique();
							if (types.length == selected.length + 1 || suits.length == selected.length + 1) {
								return 8 - get.value(card);
							}
							return 6 - get.value(card);
						}
						return 6.5 - get.value(card);
					},
					async precontent(event, trigger, player) {
						player.logSkill("boqia");
						player.addTempSkill("boqia_used");
						player.markAuto("boqia_used", [event.result.card.name]);
						const { cards } = event.result;
						if (["type2", "suit"].some(key => cards?.map(card => get[key](card)).unique().length == 3)) {
							event.getParent().oncard = () => {
								const { card } = get.event();
								player
									.when("useCardAfter")
									.filter(evt => evt.card == card)
									.then(async (event, trigger, player) => {
										const result = await player
											.chooseTarget({
												prompt: `博洽：令一名角色将手牌调整至体力上限`,
												filterTarget: lib.filter.all,
												ai(target) {
													const player = get.player();
													const num = target.maxHp - target.countCards("h");
													if (num > 0) {
														return get.effect(target, { name: "draw" }, player, player) * num;
													} else if (num < 0) {
														return get.effect(target, { name: "guohe_copy2", position: "h" }, target, player) * -num;
													}
													return 0;
												},
												forced: true,
											})
											.forResult();
										if (result.targets?.length) {
											const {
												targets: [target],
											} = result;
											player.line(target);
											const num = target.maxHp - target.countCards("h");
											if (num > 0) {
												await target.draw({ num });
											} else if (num < 0) {
												await target.chooseToDiscard({ position: "h", selectCard: -num, forced: true });
											}
										}
										const stat = player.getStat().skill;
										if (typeof stat.boqia == "number") {
											delete stat.boqia;
										}
									});
							};
						}
					},
				};
			},
		},
		ai: {
			fireAttack: true,
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (arg === "respond") {
					return false;
				}
				return (() => {
					switch (tag) {
						case "fireAttack":
							return ["sha"];
						default:
							return [tag.slice("respond".length).toLowerCase()];
					}
				})().some(name => get.info("boqia").hiddenCard(player, name));
			},
			order() {
				const player = get.player();
				if (player.hasSkill("diyin")) {
					const mark = player.countMark("boqia_mark");
					if (mark + 3 >= 7) {
						return 8;
					}
					return 6;
				}
				return 5;
			},
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
			backup: {},
			used: { charlotte: true, onremove: true },
		},
	}
```

## yj_fazheng 名字:☆法正 势力:qun

### youtan 名字:藏铗
描述: 锁定技，你于出牌阶段外获得牌时，记录此牌花色；你于出牌阶段内不能使用此技能未记录的花色的牌。
```js
youtan: {
		audio: 4,
		trigger: {
			player: "gainAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player, name) {
			const evt = event.getParent("phaseUse", true);
			if (evt && evt.player == player) {
				return false;
			}
			const cards = event.getg(player);
			return cards?.length && cards.some(card => !player.getStorage("youtan").includes(get.suit(card)));
		},
		intro: { content: "已记录花色：$" },
		forced: true,
		onremove(player, skill) {
			player.removeTip(skill);
			player.setStorage(skill, []);
		},
		async content(event, trigger, player) {
			const suits = trigger
				.getg(player)
				.map(card => get.suit(card))
				.removeArray(player.getStorage(event.name));
			if (suits?.length) {
				player.markAuto(event.name, suits);
				player.addTip(
					event.name,
					`藏铗${player
						.getStorage(event.name)
						.sort((a, b) => lib.suit.indexOf(b) - lib.suit.indexOf(a))
						.map(i => get.translation(i))
						.join("")}`
				);
			}
		},
		mod: {
			cardEnabled(card, player) {
				if (!player.isPhaseUsing() || get.suit(card) == "unsure") {
					return;
				}
				if (!player.getStorage("youtan").includes(get.suit(card))) {
					return false;
				}
			},
			cardSavable(card, player) {
				if (!player.isPhaseUsing() || get.suit(card) == "unsure") {
					return;
				}
				if (!player.getStorage("youtan").includes(get.suit(card))) {
					return false;
				}
			},
		},
	}
```

### ciren 名字:堕洄
描述: 其他角色的准备阶段，其可以交给你一张牌，然后你须选择一项：1.交给其另一张同花色牌；2.令其摸一张牌。
```js
ciren: {
		audio: 2,
		global: "ciren_global",
		subSkill: {
			global: {
				trigger: {
					player: "phaseZhunbeiBegin",
				},
				filter(event, player) {
					if (!player.countCards("he")) {
						return false;
					}
					return game.hasPlayer(current => {
						return current != player && current.hasSkill("ciren");
					});
				},
				async cost(event, trigger, player) {
					const targets = game.filterPlayer(current => current != player && current.hasSkill("ciren"));
					event.result = await player
						.chooseCardTarget({
							prompt: get.prompt("ciren"),
							prompt2: `将一张牌交给${get.translation(targets)}${targets.length > 1 ? "中的一人" : ""}，令其交给你另一张同花色牌，或你摸一张牌`,
							position: "he",
							filterCard: true,
							filterTarget(card, player, target) {
								return get.event().targetx.includes(target);
							},
							targetx: targets,
							ai1(card) {
								return 6 - get.value(card);
							},
							ai2(target) {
								const player = get.player();
								return get.attitude(player, target);
							},
						})
						.forResult();
					event.result.skill_popup = false;
				},
				async content(event, trigger, player) {
					const {
							cards,
							targets: [target],
						} = event,
						suit = get.suit(cards[0]);
					await target.logSkill("ciren", player);
					await player.give(cards, target);
					const result = await target
						.chooseToGive(player, `交给${get.translation(player)}另一张${get.translation(suit)}牌，否则其摸一张牌`, "he")
						.set("filterCard", card => {
							const { player, preCards, suit } = get.event();
							return !preCards.includes(card) && get.suit(card) == suit;
						})
						.set("ai", card => {
							const { player, att } = get.event(),
								value = get.value(card);
							if (value <= 0 && att <= 0) {
								return 10;
							}
							if (value > 15 && att > 0) {
								return 10;
							}
							return 0;
						})
						.set("att", get.attitude(target, player))
						.set("preCards", cards)
						.set("suit", suit)
						.forResult();
					if (!result?.bool) {
						await player.draw();
					}
				},
			},
		},
	}
```

### zhancai 名字:跃渊
描述: `出牌阶段限一次，你可以摸${get.poptip("youtan")}记录花色数张牌，然后清除一个记录的花色。`
```js
zhancai: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.getStorage("youtan").length;
		},
		prompt() {
			const num = get.player().getStorage("youtan").length;
			return `摸${get.cnNumber(num)}张牌，然后移去一个记录的花色`;
		},
		manualConfirm: true,
		async content(event, trigger, player) {
			const skill = "youtan";
			await player.draw(player.getStorage(skill).length);
			const list = player.getStorage(skill);
			if (!list?.length) {
				return;
			}
			const result = await player
				.chooseButton(["跃渊：移去一个花色", [list.map(suit => ["", "", `lukai_${suit}`]), "vcard"]], true)
				.set("ai", button => {
					const player = get.player(),
						suit = button.link[2].slice(6);
					const num = player.countCards("hs", card => {
						return get.suit(card) == suit && player.hasValueTarget(card);
					});
					if (num > 0) {
						return 1 / num;
					}
					return 2;
				})
				.forResult();
			if (result?.bool && result.links?.length) {
				player.unmarkAuto(
					skill,
					result.links.map(i => i[2].slice(6))
				);
				player.addTip(
					skill,
					`藏铗${player
						.getStorage(skill)
						.map(i => get.translation(i))
						.join("")}`
				);
			}
		},
		ai: {
			order: 9,
			combo: "youtan",
			result: {
				player(player) {
					return player.getStorage("youtan").filter(suit => {
						return (
							player.countCards("hs", card => {
								return get.suit(card) == suit && player.hasValueTarget(card);
							}) === 0
						);
					}).length;
				},
			},
		},
	}
```

## yj_hanbing 名字:寒冰剑少女 势力:qun

### bingling 名字:冰伶
描述: 当你使用【杀】指定目标时，你可弃置目标角色两张牌。若这两张牌类别/花色/牌名字数/点数相同，则你获得这两张牌/回复1点体力/摸X张牌/令其失去所有体力（X为其中一张牌的牌名字数）；若皆不同，则你受到1点无来源的火焰伤害。
```js
bingling: {
		audio: 2,
		trigger: { player: ["useCardToPlayer"] },
		filter(event, player) {
			return event.card.name == "sha" && event.target.countDiscardableCards(player, "he") >= 2;
		},
		logTarget: "target",
		async cost(event, trigger, player) {
			const target = trigger.target;
			event.result = await player.discardPlayerCard(target, "he", get.prompt2(event.skill), 2).set("chooseonly", true).forResult();
		},
		async content(event, trigger, player) {
			await trigger.target.modedDiscard(event.cards, player);
			if (event.cards.length > 1) {
				const card = event.cards[0],
					cardx = event.cards[1];
				let num = 0;
				if (get.type2(card, false) == get.type2(cardx, false)) {
					await player.gain(event.cards, "gain2");
					num++;
				}
				if (get.suit(card, false) == get.suit(cardx, false)) {
					await player.recover();
					num++;
				}
				if (get.cardNameLength(card, false) == get.cardNameLength(cardx, false)) {
					await player.draw(get.cardNameLength(card));
					num++;
				}
				if (get.number(card, false) == get.number(cardx, false)) {
					await trigger.target.loseHp(trigger.target.getHp());
					num++;
				}
				if (num == 0) {
					await player.damage(1, "fire", "nosource");
				}
			}
		},
	}
```

## yj_tengjia 名字:藤甲男孩 势力:qun

### tenggu 名字:藤固
描述: `锁定技，你不能装备防具牌，你视为装备着${get.poptip("tengjia")}；你因非火焰伤害而进入濒死时，若你的体力上限大于1，你减少1点体力上限并回复全部体力。`
```js
tenggu: {
		audio: 2,
		trigger: {
			player: "dying",
		},
		init(player, skill) {
			player.addExtraEquip(skill, "tengjia", true, player => lib.card.tengjia);
		},
		onremove(player, skill) {
			player.removeExtraEquip(skill);
		},
		filter(event, player) {
			if (!event.reason || player.maxHp < 2) {
				return false;
			}
			const reason = event.reason;
			return reason.name == "damage" && !reason.hasNature("fire");
		},
		forced: true,
		async content(event, trigger, player) {
			await player.loseMaxHp();
			await player.recoverTo(player.maxHp);
		},
		mod: {
			targetEnabled(card, player, target) {
				if (get.subtypes(card)?.includes("equip2")) {
					return false;
				}
			},
		},
		group: ["tenggu_tengjia", "tenggu_noequip"],
		subSkill: {
			noequip: {
				audio: "tenggu",
				trigger: {
					player: "equipBefore",
				},
				filter(event, player) {
					return get.subtypes(event.card)?.includes("equip2");
				},
				forced: true,
				async content(event, trigger, player) {
					trigger.cancel();
					if (trigger.cards?.length) {
						const map = new Map(),
							targets = [];
						for (const card of trigger.cards) {
							const owner = get.owner(card);
							if (owner) {
								targets.add(owner);
								map.set(owner, (map.get(owner) ?? []).concat([card]));
							}
						}
						if (targets.length) {
							await game
								.loseAsync({
									map: map,
									targets: targets,
									cards: trigger.cards,
								})
								.setContent(async (event, trigger, player) => {
									const { map, targets, cards } = event;
									for (const target of targets) {
										const lose = map.get(target);
										const next = target.lose(lose, ui.discardPile);
										next.getlx = false;
										await next;
									}
									game.log(cards, "进入了弃牌堆");
								});
						}
					}
				},
			},
			tengjia: {
				trigger: {
					target: ["useCardToBefore", "shaBefore"],
					player: "damageBegin3",
				},
				equipSkill: true,
				forced: true,
				priority: 6,
				audio: "tenggu",
				logAudio(event) {
					return `tengjia${event.name == "damage" ? 2 : 1}.mp3`;
				},
				filter(event, player, name) {
					if (player.hasSkillTag("unequip2")) {
						return false;
					}
					const owner = event[event.name == "damage" ? "source" : "player"];
					if (
						owner?.hasSkillTag("unequip", false, {
							name: event.card ? event.card.name : null,
							target: player,
							card: event.card,
						})
					) {
						return false;
					}
					if (name == "shaBefore") {
						return event.card.name == "sha" && !game.hasNature(event.card);
					}
					if (event.name == "damage") {
						return game.hasNature(event, "fire");
					}
					return ["wanjian", "nanman"].includes(event.card.name);
				},
				async content(event, trigger, player) {
					if (trigger.name == "damage") {
						trigger.num++;
					} else {
						trigger.cancel();
					}
				},
				ai: {
					effect: {
						target(card, player, target, current) {
							if (target.hasSkillTag("unequip2")) {
								return;
							}
							if (
								player.hasSkillTag("unequip", false, {
									name: card ? card.name : null,
									target: target,
									card: card,
								}) ||
								player.hasSkillTag("unequip_ai", false, {
									name: card ? card.name : null,
									target: target,
									card: card,
								})
							) {
								return;
							}
							if (card.name == "nanman" || card.name == "wanjian") {
								return "zeroplayertarget";
							}
							if (card.name == "sha") {
								if (game.hasNature(card, "fire")) {
									return 2;
								}
								if (player.hasSkill("zhuque_skill")) {
									return 1.9;
								}
								if (!game.hasNature(card)) {
									return "zeroplayertarget";
								}
							}
							if (get.tag(card, "fireDamage") && current < 0) {
								return 2;
							}
						},
					},
				},
			},
		},
	}
```

### dunyong 名字:钝勇
描述: 你对其他角色造成伤害时，若你的体力上限不为全场唯一最低，你受到等量伤害；有角色进入濒死时，你摸X张牌，令你本回合使用牌无距离次数限制（X为濒死角色的体力上限）。
```js
dunyong: {
		audio: 2,
		trigger: {
			source: "damageBegin4",
			global: "dying",
		},
		filter(event, player) {
			if (event.name == "damage") {
				if (event.player == player || player.isMinMaxHp(true)) {
					return false;
				}
				return true;
			}
			return event.player.maxHp > 0;
		},
		priority: 1,
		forced: true,
		locked: false,
		logTarget: "player",
		async content(event, trigger, player) {
			const name = event.name;
			if (trigger.name == "damage") {
				await player.damage(trigger.num, "nosource", "nocard");
			} else {
				await player.draw(trigger.player.maxHp);
				player.addTip(name, "钝勇 无限制");
				player
					.when({
						global: ["phaseBefore", "phaseAfter"],
					})
					.step(async (event, trigger, player) => {
						player.removeTip(name);
					})
					.assign({
						mod: {
							cardUsable: () => Infinity,
							targetInRange: () => true,
						},
					});
			}
		},
	}
```

## yj_puyuan 名字:SP蒲元 势力:shu

### biancai 名字:辨材
描述: 每回合开始时，你可以进行判定并获得判定牌，若结果为红色/黑色，你从牌堆/弃牌堆中获得一张装备牌。
```js
biancai: {
		trigger: { global: "phaseBegin" },
		async content(event, trigger, player) {
			const result = await player.judge().forResult();
			if (get.position(result?.card, true) == "d") {
				await player.gain(result.card, "gain2");
			}
			if (result?.color == "red") {
				const card = get.cardPile(card => get.type(card) == "equip", "cardPile");
				await player.gain(card, "gain2");
			} else if (result?.color == "black") {
				const card = get.cardPile(card => get.type(card) == "equip", "discardPile");
				await player.gain(card, "gain2");
			} else {
				player.popup("杯具");
			}
		},
	}
```

### cuiren 名字:淬刃
描述: 出牌阶段限一次，你可以弃置一张装备牌，并根据弃置牌的类别获得以下效果直到回合结束；武器：你使用牌无距离和次数限制；防具：你使用牌无法被响应；坐骑：你使用牌指定目标时，可以多指定任意个目标。
```js
cuiren: {
		enable: "phaseUse",
		usable: 1,
		position: "he",
		filterCard(card, player) {
			return get.type(card) == "equip" && lib.filter.cardDiscardable(card, player, "cuiren");
		},
		filter(event, player) {
			return player.hasCards("he", card => get.type(card) == "equip");
		},
		check(card) {
			if (["equip1", "equip2", "equip3", "equip4"].every(subtype => get.subtypes(card).includes(subtype))) {
				return 0;
			}
			return 20 - get.value(card);
		},
		async content(event, trigger, player) {
			const types = get.subtypes(event.cards[0]);
			if (types.includes("equip1")) {
				player.addTempSkill("cuiren_effect1");
			}
			if (types.includes("equip2")) {
				player.addTempSkill("cuiren_effect2");
			}
			if (["equip3", "equip4"].some(subtype => types.includes(subtype))) {
				player.addTempSkill("cuiren_effect3");
			}
		},
		ai: {
			order: 10,
			result: { player: 1 },
		},
		subSkill: {
			effect1: {
				charlotte: true,
				mark: true,
				intro: { content: "本回合你使用牌无距离和次数限制" },
				mod: {
					targetInRange(card, player) {
						return true;
					},
					cardUsable(card, player) {
						return Infinity;
					},
				},
			},
			effect2: {
				charlotte: true,
				mark: true,
				intro: { content: "本回合你使用牌无法被响应" },
				targetprompt2: target => {
					const player = get.player(),
						card = get.card();
					if (get.type(card) == "trick" || (get.type(card) == "basic" && !["shan", "tao", "jiu", "du"].includes(card.name))) {
						return "不可响应";
					}
				},
				onChooseToUse(event) {
					event.targetprompt2.add(lib.skill.cuiren_effect2.targetprompt2);
				},
				onChooseTarget(event) {
					event.targetprompt2.add(lib.skill.cuiren_effect2.targetprompt2);
				},
				trigger: { player: "useCard" },
				forced: true,
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.players);
				},
				ai: {
					directHit_ai: true,
				},
			},
			effect3: {
				intro: { content: "本回合你使用牌指定目标时，可以多指定任意个目标" },
				trigger: { player: "useCard2" },
				filter(event, player) {
					if (!["basic", "trick"].includes(get.type(event.card)) || !event.targets?.length) {
						return false;
					}
					return game.hasPlayer(current => {
						if (event.targets.includes(current)) {
							return false;
						}
						return lib.filter.targetEnabled2(event.card, player, current) && lib.filter.targetInRange(event.card, player, current);
					});
				},
				async cost(event, trigger, player) {
					const targets = game.filterPlayer(current => {
						if (trigger.targets.includes(current)) {
							return false;
						}
						return lib.filter.targetEnabled2(trigger.card, player, current) && lib.filter.targetInRange(trigger.card, player, current);
					});
					if (!targets?.length) {
						return;
					}
					event.result = await player
						.chooseTarget(`为${get.translation(trigger.card)}额外指定任意目标`)
						.set("ai", target => {
							const player = get.player(),
								trigger = get.event().getTrigger();
							return get.effect(target, trigger.card, player, player);
						})
						.set("targetx", targets)
						.set("filterTarget", (card, player, target) => {
							return get.event().targetx.includes(target);
						})
						.set("selectTarget", [1, Infinity])
						.forResult();
				},
				async content(event, trigger, player) {
					trigger.targets.addArray(event.targets);
				},
			},
		},
	}
```

### shenfeng 名字:神锋
描述: 当你使用【杀】指定一名角色为目标后，你可以弃置一张装备牌，然后选择一项：1.令此【杀】伤害+1；2.令此【杀】造成的伤害视为失去体力；3.令其弃置两张牌。
```js
shenfeng: {
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return get.name(event.card) == "sha" && player.hasCards("he", card => get.type(card) == "equip") && event.target.isIn();
		},
		async cost(event, trigger, player) {
			const { target } = trigger;
			event.result = await player
				.chooseToDiscard(get.prompt2(event.skill, target), "he", card => {
					return get.type(card) == "equip";
				})
				.set("ai", card => {
					const { player, goon } = get.event();
					if (!goon) {
						return 0;
					}
					if (get.name(card) == "muniu" && player.countCards("h") > 3) {
						return 0;
					}
					return 6 - get.value(card);
				})
				.set("chooseonly", true)
				.set("goon", get.attitude(player, target) <= 0)
				.forResult();
		},
		logTarget: "target",
		async content(event, trigger, player) {
			await player.discard(event.cards);
			const target = event.targets[0];
			const { card } = trigger;
			const result = await player
				.chooseButton([
					"神锋：请选择一项",
					[
						[
							["damage", `令${get.translation(card)}对${get.translation(target)}伤害+1`],
							["losehp", `令${get.translation(card)}对${get.translation(target)}造成的伤害视为失去体力`],
							["discard", `令${get.translation(target)}弃置两张牌`],
						],
						"textbutton",
					],
				])
				.set("forced", true)
				.set("filterButton", button => {
					const { target } = get.event();
					if (button.link == "discard") {
						return target.hasCards("he");
					}
					return true;
				})
				.set("target", target)
				.set("ai", button => {
					const { player, target } = get.event();
					if (button.link == "discard") {
						return target.hasCards("he") ? 2 : 0;
					}
					if (button.link == "damage") {
						return !target.hasCards("he") ? 2.5 : 0.5;
					}
					return 1;
				})
				.forResult();
			if (!result?.links?.length) {
				return;
			}
			if (result.links[0] == "damage") {
				const id = target.playerid;
				const map = trigger.customArgs;
				map[id] ??= {};
				map[id].extraDamage ??= 0;
				map[id].extraDamage++;
			} else if (result.links[0] == "losehp") {
				player.addTempSkill(event.name + "_effect");
				player.markAuto(event.name + "_effect", [[card, target]]);
			} else {
				await target.chooseToDiscard(2, "he", true);
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				trigger: { source: "damageBefore" },
				forced: true,
				popup: false,
				filter(event, player) {
					if (!event.card) {
						return false;
					}
					return player.getStorage("shenfeng_effect").some(([card, target]) => event.card == card && target == event.player);
				},
				async content(event, trigger, player) {
					let list = player.getStorage(event.name).filter(([card, target]) => trigger.card == card && target == trigger.player);
					player.unmarkAuto(event.name, list);
					if (!player.getStorage(event.name).length) {
						player.removeSkill(event.name);
					}
					trigger.cancel();
					await trigger.player.loseHp(trigger.num);
				},
			},
		},
	}
```

## v_sunce 名字:威孙策 势力:wu

### dczhifeng 名字:猘锋
描述: 每回合限X次（X为游戏人数）。当你的手牌数：大于体力值时，你可将至少一张黑色牌当作不计入次数的【酒】使用；小于体力值时，你可将一张红色牌当作无距离限制的任意【杀】使用或打出，然后将手牌摸至体力上限；等于体力值时，你可将任意张牌当作【决斗】对至多两名角色使用。
```js
dczhifeng: {
		audio: 2,
		locked: false,
		mod: {
			cardUsable(card, player, num) {
				if (card.storage?.dczhifeng && card.name == "jiu") {
					return Infinity;
				}
			},
			targetInRange(card, player) {
				if (card.storage?.dczhifeng && card.name == "sha") {
					return true;
				}
			},
		},
		hiddenCard(player, name) {
			if ((player.getStat().skill.dczhifeng || 0) >= game.players.length + game.dead.length) {
				return false;
			}
			const [cards, bool] = get.info("dczhifeng").getFilter(player);
			if (_status.event.name == "chooseToRespond" && !["sha"].includes(name)) {
				//, "shan"
				return false;
			}
			return cards.some(namex => namex == name) && bool;
		},
		onChooseToUse(event) {
			if (game.online) {
				return;
			}
			event.set("dczhifeng", get.info("dczhifeng").getFilter(event.player));
		},
		onChooseToRespond(event) {
			if (game.online) {
				return;
			}
			event.set("dczhifeng", get.info("dczhifeng").getFilter(event.player));
		},
		enable: ["chooseToUse", "chooseToRespond"],
		usable() {
			return game.players.length + game.dead.length;
		},
		filter(event, player) {
			if (!event.dczhifeng?.length) {
				return false;
			}
			const [cards, bool] = event.dczhifeng;
			if (!bool || (event.name == "chooseToRespond" && cards.some(name => !["sha"].includes(name)))) {
				//, "shan"
				return false;
			}
			return (
				get.inpileVCardList(([_, __, name, nature]) => {
					if (!cards.some(namex => namex == name)) {
						return false;
					}
					const card = get.autoViewAs({ name, nature, storage: { dczhifeng: true } }, "unsure");
					return event.filterCard(card, player, event);
				}).length > 0
			);
		},
		chooseButton: {
			dialog(event, player) {
				const [cards] = event.dczhifeng;
				const vcards = get.inpileVCardList(([_, __, name, nature]) => {
					if (!cards.some(namex => namex == name)) {
						return false;
					}
					const card = get.autoViewAs({ name, nature, storage: { dczhifeng: true } }, "unsure");
					return event.filterCard(card, player, event);
				});
				const dialog = ui.create.dialog("猘锋", [vcards, "vcard"]);
				dialog.direct = true;
				return dialog;
			},
			check({ link: [_, __, name] }) {
				return get.order({ name }, get.player());
			},
			backup(links) {
				const backup = get.info("dczhifeng_backup");
				backup.audio = "dczhifeng";
				backup.viewAs = { name: links[0][2], nature: links[0][3], storage: { dczhifeng: true } };
				return backup;
			},
			prompt(links) {
				let str;
				if (["sha"].includes(links[0][2])) {
					//, "shan"
					str = "一张红色";
				} else if (links[0][2] == "jiu") {
					str = "至少一张黑色";
				} else {
					str = "任意张";
				}
				return `###猘锋###将${str}牌当做${get.translation(links[0][3]) || ""}${get.translation(links[0][2])}使用`;
			},
		},
		getFilter(player, toOther) {
			const hp = player.getHp(),
				num = player.countCards("h") - (toOther ? 1 : 0);
			if (num > hp) {
				return [["jiu"], player.countCards("hes", { color: "black" }) >= 1];
			} else if (num == hp) {
				return [["juedou"], player.countCards("hes")];
			}
			return [["sha"], player.countCards("hes", { color: "red" })]; //, "shan"
		},
		ai: {
			//respondShan: true,
			respondSha: true,
			skillTagFilter(player) {
				if ((player.getStat().skill.dczhifeng || 0) >= game.players.length + game.dead.length) {
					return false;
				}
				return (
					player.getHp() > player.countCards("h") &&
					player.hasCard(card => {
						if (get.position(card) === "h" && _status.connectMode) {
							return true;
						}
						return get.color(card) === "red";
					}, "hes")
				);
			},
			order(item, player) {
				player = player || get.player();
				const cards = get
					.info("dczhifeng")
					.getFilter(player)[0]
					.map(name => get.order({ name }, player));
				return Math.max(...cards) + 0.5;
			},
			result: {
				player: 1,
			},
		},
		subSkill: {
			backup: {
				position: "hes",
				selectCard() {
					const choice = get.info("dczhifeng_backup").viewAs.name;
					if (["sha"].includes(choice)) {
						//, "shan"
						return [1, 1];
					} else if (choice == "jiu") {
						return [1, Infinity];
					}
					return [1, Infinity];
				},
				filterCard(card, player) {
					const choice = get.info("dczhifeng_backup").viewAs.name;
					if (["sha"].includes(choice)) {
						//, "shan"
						return get.color(card, player) == "red";
					} else if (choice == "jiu") {
						return get.color(card, player) == "black";
					}
					return true;
				},
				selectTarget() {
					const card = get.card();
					if (card.name == "juedou") {
						return [1, 2];
					}
					const info = get.info(card);
					return get.select(get.copy(info.selectTarget));
				},
				popname: true,
				allowChooseAll: true,
				log: false,
				async precontent(event, trigger, player) {
					player.logSkill("dczhifeng");
					const name = event.result.card.name;
					if (["sha"].includes(name)) {
						//, "shan"
						player.addTempSkill("dczhifeng_draw");
					} else if (name == "jiu") {
						event.getParent().addCount = false;
					}
				},
				ai1(card) {
					const player = get.player(),
						name = get.info("dczhifeng_backup").viewAs.name,
						num = ui.selected.cards.length;
					if (num) {
						if (name == "jiu" && num > 1) {
							return 0;
						} else if (name == "juedou") {
							return 0;
						}
					}
					return 7 - get.value(card, player);
				},
			},
			draw: {
				charlotte: true,
				trigger: { player: ["useCard", "respond"] },
				filter(event) {
					return ["sha"].includes(event.card.name) && event.skill == "dczhifeng_backup"; //, "shan"
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					await player.drawTo(player.maxHp);
					player.removeSkill(event.name);
				},
			},
		},
	}
```

### dcweijing 名字:威靖
描述: `其他吴势力角色的回合开始时，你可令其执行一项：1、受到你造成的1点伤害；2、交给你一张牌，然后其可发动一次对应条件的${get.poptip("dczhifeng")}。`
```js
dcweijing: {
		audio: 2,
		trigger: { global: "phaseBegin" },
		derivation: "dczhifeng",
		filter(event, player) {
			return event.player != player && event.player.group === "wu" && event.player.isIn();
		},
		async cost(event, trigger, player) {
			const choiceList = [`对${get.translation(trigger.player)}造成1点伤害`, `令${get.translation(trigger.player)}交给你一张牌然后其可发动一次〖猘锋〗`],
				choice = ["选项一", "选项二"];
			if (!trigger.player.countGainableCards(player, "he")) {
				choiceList[1] = `<span style="opacity:0.5">${choiceList[1]}</span>`;
				choice.remove("选项二");
			}
			const { control } = await player
				.chooseControl(choice, "cancel2")
				.set("choiceList", choiceList)
				.set("ai", (event, player) => {
					const target = event.getTrigger().player;
					if (get.damageEffect(target, player, player) > 0) {
						return 0;
					} else if (get.event().controls.includes("选项二")) {
						const cards = get
							.info("dczhifeng")
							.getFilter(player, target != player)[0]
							.flatMap(name => {
								const card = get.autoViewAs({ name, storage: { dczhifeng: name == "jiu" } }, "unsure");
								return target.hasUseTarget(card) ? [card] : [];
							});
						if (cards.some(card => target.getUseValue(card) * get.sgnAttitude(player, target) > 0)) {
							return 1;
						} else if (get.attitude(player, target) < 0 && !cards.length) {
							return 1;
						}
					}
					return "cancel2";
				})
				.forResult();
			event.result = {
				bool: control != "cancel2",
				targets: [trigger.player],
				cost_data: control,
			};
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cost_data: control,
			} = event;
			if (control == "选项一") {
				await target.damage();
			} else {
				if (player !== target) {
					await target.chooseToGive(`威靖：交给${get.translation(player)}一张牌然后可发动一次【猘锋】`, player, "he", true);
				}
				const info = get.info("dczhifeng");
				const [cards, bool] = info.getFilter(target);
				const vcards = get.inpileVCardList(([_, __, name, nature]) => {
					if (nature || !cards.some(namex => namex == name)) {
						return false;
					}
					return target.hasUseTarget(get.autoViewAs({ name }, "unsure"));
				});
				if (!bool || !vcards.length) {
					return;
				}
				const choice = vcards[0][2];
				game.broadcastAll(
					function (skill, name) {
						lib.skill[skill].viewAs = { name };
						lib.skill[skill].prompt = lib.skill.dczhifeng.chooseButton.prompt([[null, null, name]]);
					},
					"dczhifeng_backup",
					choice
				);
				await target
					.chooseToUse()
					//.set("logSkill", "dczhifeng")
					.set("openskilldialog", info.chooseButton.prompt([[null, null, choice]]))
					.set("norestore", true)
					.set("_backupevent", "dczhifeng_backup")
					.set("custom", {
						add: {},
						replace: { window() {} },
					})
					.set("filterTarget", (card, player, target) => {
						if (card.name == "sha") {
							return lib.filter.targetEnabled.call(this, card, player, target);
						}
						return lib.filter.filterTarget.call(this, card, player, target);
					})
					.set("addCount", choice != "jiu")
					/*.set("oncard", () => {
						get.event().addSkillCount = false;
					})*/
					.backup("dczhifeng_backup");
			}
		},
	}
```

## yao_yuanshu 名字:爻袁术 势力:qun

### dcwangyao 名字:妄爻
描述: 游戏开始时，你获得阳“爻”、阴“爻”各一枚。你成为其他角色使用【杀】或普通锦囊牌的目标后，可以翻转一枚“爻”，然后若两枚“爻”阴阳相同，你摸一张牌。
```js
dcwangyao: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (event.name.startsWith("useCard")) {
				if (event.player == player) {
					return false;
				}
				if (event.card?.name != "sha" && get.type(event.card) != "trick") {
					return false;
				}
				return ["dcwangyao_marka", "dcwangyao_markb"].every(mark => player.hasSkill(mark));
			}
			return event.name != "phase" || game.phaseNumber == 0;
		},
		async cost(event, trigger, player) {
			if (trigger.name.startsWith("useCard")) {
				const list = ["dcwangyao_marka", "dcwangyao_markb"].map(mark => {
					const type = player.getStorage(mark, false);
					return [mark, "", type ? "阳" : "阴"];
				});
				const result = await player
					.chooseButton([
						"妄爻：是否翻转一枚爻？",
						[
							list,
							(item, type, position, noclick, node) => {
								node = ui.create.buttonPresets.vcard(item, "vcard", position, noclick, node);
								node.owner = get.player();
								node._customintro = function (uiintro, evt) {
									const yao = node.owner?.getStorage(node.link[2], false);
									uiintro.add(`${yao ? "阳" : "阴"}爻`);
								};
								return node;
							},
						],
					])
					.set("ai", button => {
						if (button.link[2] == true) {
							return 1;
						}
						return 2;
					})
					.forResult();
				if (result.bool) {
					event.result = {
						bool: true,
						cost_data: result.links[0],
					};
				}
			} else {
				event.result = {
					bool: true,
				};
			}
		},
		async content(event, trigger, player) {
			if (trigger.name.startsWith("useCard")) {
				const [mark, trash, type] = event.cost_data;
				game.log(player, "翻转了一枚", type, "爻");
				get.info(event.name).setType(player, mark, type != "阳");
				const list = ["dcwangyao_marka", "dcwangyao_markb"];
				if (player.getStorage(list[0], false) == player.getStorage(list[1], false)) {
					await player.draw();
				}
				return;
			}
			player.addSkill("dcwangyao_marka");
			player.addSkill("dcwangyao_markb");
		},
		setType(player, skill, type) {
			player.setStorage(skill, type);
			player.markSkill(skill);
			game.broadcastAll(
				(player, skill, type) => {
					const color = type ? "black" : "white",
						bgColor = type ? "rgb(255, 255, 255)" : "rgba(1, 1, 1, 0.9)";
					const text = `<span style="color: ${color}">爻</span>`;
					if (player.marks[skill]) {
						player.marks[skill].firstChild.style.backgroundColor = bgColor;
						player.marks[skill].firstChild.innerHTML = text;
					}
				},
				player,
				skill,
				type
			);
		},
		subSkill: {
			marka: {
				init(player, skill) {
					get.info("dcwangyao").setType(player, skill, true);
				},
				mark: true,
				marktext: "爻",
				intro: {
					content(storage, player) {
						const color = storage ? "gold" : "gray",
							name = storage ? "阳" : "阴";
						return `此爻为<span style="color: ${color}">${name}爻</span>`;
					},
				},
				onremove: true,
			},
			markb: {
				init(player, skill) {
					get.info("dcwangyao").setType(player, skill, false);
				},
				mark: true,
				marktext: "爻",
				intro: {
					content(storage, player) {
						const color = storage ? "gold" : "gray",
							name = storage ? "阳" : "阴";
						return `此爻为<span style="color:${color}">${name}爻</span>`;
					},
				},
				onremove: true,
			},
		},
	}
```

### dczengua 名字:谮卦
描述: 出牌阶段限一次，你可弃置一张手牌并选择一名其他角色，猜测其手牌中某种类型的牌是否为全场最多。若猜对，你获得其一张此类别的手牌；否则，其摸一张牌，你翻转一枚“爻”。
```js
dczengua: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		filterCard: true,
		async content(event, trigger, player) {
			const target = event.target;
			const result = await player
				.chooseButton(
					[
						`猜测${get.translation(target)}手牌中某种类型的牌是否为全场最多`,
						[
							["basic", "trick", "equip"].map(type => {
								return ["", "", `caoying_${type}`];
							}),
							"vcard",
						],
						[
							[
								["isMax", "全场最多"],
								["notMax", "不为最多"],
							],
							"tdnodes",
						],
					],
					2,
					true
				)
				.set("filterButton", button => {
					if (ui.selected.buttons?.length) {
						return typeof button.link == "string";
					}
					return typeof button.link != "string";
				})
				.set("complexSelect", true)
				.set("ai", button => {
					//花里胡哨一看战绩0.5
					return Math.random();
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			const type = result.links[0][2].slice(8),
				isMax = result.links[1] == "isMax";
			const count = current => current.countCards("h", card => get.type2(card) == type),
				bool = !game.hasPlayer(current => {
					return count(current) > count(target);
				});
			if (isMax == bool) {
				player.popup("洗具", "wood");
				if (!target.countGainableCards(player, "h", card => get.type2(card) == type)) {
					return;
				}
				await player
					.gainPlayerCard(target, "h", true)
					.set("filterButton", button => {
						return get.type2(button.link) == get.event().cardType;
					})
					.set("cardType", type);
			} else {
				player.popup("杯具", "fire");
				await target.draw();
				const list = ["dcwangyao_marka", "dcwangyao_markb"].map(mark => {
					const type = player.getStorage(mark, false);
					return [mark, "", type ? "阳" : "阴"];
				});
				if (
					!list.every(info => {
						return typeof player.storage[info[0]] == "boolean";
					})
				) {
					return;
				}
				const result2 = await player
					.chooseButton(
						[
							"谮卦：翻转一枚爻",
							[
								list,
								(item, type, position, noclick, node) => {
									node = ui.create.buttonPresets.vcard(item, "vcard", position, noclick, node);
									node.owner = get.player();
									node._customintro = function (uiintro, evt) {
										const yao = node.owner?.getStorage(node.link[2], false);
										uiintro.add(`${yao ? "阳" : "阴"}爻`);
									};
									return node;
								},
							],
						],
						true
					)
					.set("ai", button => {
						if (button.link[2] == true) {
							return 1;
						}
						return 2;
					})
					.forResult();
				if (result2.bool) {
					const [mark, trash, type] = result2.links[0];
					game.log(player, "翻转了一枚", type, "爻");
					get.info("dcwangyao").setType(player, mark, type != "阳");
				}
			}
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					if (
						target.countCards("h") < 2 ||
						!game.hasPlayer(current => {
							return current != target && current.countCards("h") > target.countCards("h") / 2;
						})
					) {
						return 2 * get.sgnAttitude(player, target);
					}
					return 0;
				},
				player: -1,
			},
		},
	}
```

### dckanghui 名字:亢悔
描述: 锁定技，若你的“爻”均为：阳，你的手牌上限+2；阴：其他角色对你造成的伤害+1。
```js
dckanghui: {
		audio: 2,
		forced: true,
		trigger: {
			player: "damageBegin3",
		},
		filter(event, player) {
			if (event.source == player) {
				return false;
			}
			const list = ["dcwangyao_marka", "dcwangyao_markb"];
			return list.every(mark => {
				if (typeof player.storage[mark] != "boolean") {
					return false;
				}
				return player.getStorage(mark, false) == false;
			});
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
		mod: {
			maxHandcard(player, num) {
				const list = ["dcwangyao_marka", "dcwangyao_markb"];
				if (list.every(mark => player.getStorage(mark, false))) {
					return num + 2;
				}
			},
		},
		ai: {
			combo: "dcwangyao",
		},
	}
```

## yj_zhanghuan 名字:新杀张奂 势力:qun

### dcyiju 名字:义拒
描述: 锁定技，其他角色使用牌指定你为唯一目标后，你弃置一张牌。
```js
dcyiju: {
		audio: 2,
		trigger: { target: "useCardToPlayered" },
		forced: true,
		filter(event, player) {
			return event.player != player && event.targets.length == 1 && player.countDiscardableCards(player, "he");
		},
		async content(event, trigger, player) {
			await player.chooseToDiscard(`义拒：请弃置一张牌`, "he", true).set("ai", card => {
				const player = get.player();
				if (player.hasSkill("dcshuguo", null, false, false)) {
					return Math.max(...game.filterPlayer2(target => player.canUse(card, target, true, false)).map(target => get.effect_use(target, card, player, player)));
				}
				return 6 - get.value(card);
			});
		},
		ai: {
			neg: true,
			combo: "dcshuguo",
		},
	}
```

### dcshuguo 名字:戍国
描述: 每回合结束时，你可以依次使用本回合因弃置而置入弃牌堆的牌直到你使用了其他角色弃置的牌。若你的手牌数不为全场唯一最多，每有一张本回合弃置的牌没有使用，你摸一张牌（至多摸5）。
```js
dcshuguo: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return game.hasGlobalHistory("cardMove", evt => {
				if (evt.type !== "discard") {
					return false;
				}
				return evt.cards2.someInD("d");
			});
		},
		async content(event, trigger, player) {
			const cards = [],
				cards2 = [];
			game.checkGlobalHistory("cardMove", evt => {
				if (evt.type !== "discard") {
					return false;
				}
				const cardsx = evt.cards2.filterInD("d");
				if (cardsx.length) {
					cards.addArray(cardsx);
					if (evt.player !== player) {
						cards2.addArray(cardsx);
					}
				}
			});
			const goon = () => cards.some(card => player.hasUseTarget(card) && get.position(card) == "d");
			while (goon()) {
				const result = await player
					.chooseButton([
						"戍国：请选择要使用的牌",
						[
							cards.map(card => [
								card,
								(() => {
									return cards2.includes(card) ? "其他角色" : "";
								})(),
							]),
							(item, type, position, noclick, node) => {
								node = ui.create.buttonPresets.card(item[0], type, position, noclick);
								game.createButtonCardsetion(item[1], node);
								return node;
							},
						],
					])
					.set("filterButton", button => {
						return get.event().canUse.includes(button.link);
					})
					.set("ai", button => {
						return get.player().getUseValue(button.link);
					})
					.set(
						"canUse",
						cards.filter(card => player.hasUseTarget(card) && get.position(card) == "d")
					)
					.forResult();
				if (result?.bool && result.links?.length) {
					const card = result.links[0];
					cards.remove(card);
					await player.chooseUseTarget(card, true);
					if (cards2.includes(card)) {
						break;
					}
				} else {
					break;
				}
			}
			if (!player.isMaxHandcard(true)) {
				await player.draw(Math.min(cards.length, 5));
			}
		},
	}
```

## yj_zhangyan 名字:新杀张燕 势力:qun

### dcqiaolve 名字:趫掠
描述: 你使用牌指定首个目标后，若包含了其他角色为目标且其本局游戏第一次成为该牌名的目标，你可以获得其一张牌。
```js
dcqiaolve: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!event.targets?.length || !event.isFirstTarget) {
				return false;
			}
			return event.targets.some(target => {
				if (target == player || !target.countGainableCards(player, "he")) {
					return false;
				}
				return game.getAllGlobalHistory("useCard", evt => evt.targets.includes(target) && evt.card.name == event.card.name).indexOf(event.getParent()) == 0;
			});
		},
		async cost(event, trigger, player) {
			const targets = trigger.targets.filter(target => {
				if (target == player || !target.countGainableCards(player, "he")) {
					return false;
				}
				return game.getAllGlobalHistory("useCard", evt => evt.targets.includes(target) && evt.card.name == trigger.card.name).indexOf(trigger.getParent()) == 0;
			});
			if (targets.length > 1) {
				event.result = await player
					.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
						const { targets } = get.event();
						return targets?.includes(target);
					})
					.set("targets", targets)
					.set("ai", target => {
						const player = get.player();
						return get.effect(target, { name: "shunshou_copy2" }, player, player);
					})
					.forResult();
			} else {
				event.result = await player
					.chooseBool(get.prompt2(event.skill, targets))
					.set("choice", get.effect(targets[0], { name: "shunshou_copy2" }, player, player) > 0)
					.forResult();
				event.result.targets = targets;
			}
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			await player.gainPlayerCard(target, "he", true);
		},
	}
```

### dchanjie 名字:悍捷
描述: 其他角色的回合开始时，若其体力值不小于你，你可以将一张黑色手牌当一张伤害牌对其使用。
```js
dchanjie: {
		audio: 2,
		trigger: { global: "phaseBegin" },
		filter(event, player) {
			return player != event.player && event.player.hp >= player.hp && player.countCards("hs", { color: "black" });
		},
		direct: true,
		clearTime: true,
		async content(event, trigger, player) {
			const list = get.inpileVCardList(info => {
				if (info[0] == "delay") {
					return false;
				}
				return (
					get.tag({ name: info[2] }, "damage") &&
					player.countCards("hs", card => {
						if (get.color(card) != "black") {
							return false;
						}
						const vcard = get.autoViewAs({ name: info[2], nature: info[3] }, [card]);
						return player.canUse(vcard, trigger.player, false);
					}) > 0
				);
			});
			if (!list.length) {
				return;
			}
			const result = await player
				.chooseButton([get.prompt2(event.name, trigger.player), [list, "vcard"]])
				.set("ai", button => {
					const { player, sourcex: target } = get.event();
					const card = player.getCards("hs", { color: "black" }).maxBy(card => {
						const vcard = get.autoViewAs({ name: button.link[2], nature: button.link[3] }, [card]);
						if (player.canUse(vcard, target, false)) {
							return get.effect_use(target, vcard, player, player);
						}
						return 0;
					});
					if (!card) {
						return 0;
					}
					return get.effect_use(target, card, player, player);
				})
				.set("sourcex", trigger.player)
				.forResult();
			if (!result?.links?.length) {
				return;
			}
			const card = {
				name: result.links[0][2],
				nature: result.links[0][3],
			};
			const prompt = `撼捷：是否将一张黑色手牌当做${get.translation(card)}对${get.translation(trigger.player)}使用？`;
			game.broadcastAll(
				(card, prompt) => {
					lib.skill.dchanjie_backup.viewAs = card;
					lib.skill.dchanjie_backup.prompt = prompt;
				},
				card,
				prompt
			);
			const next = player.chooseToUse();
			next.set("openskilldialog", prompt);
			next.set("norestore", true);
			next.set("addCount", false);
			next.set("onlyTarget", trigger.player);
			next.set("_backupevent", "dchanjie_backup");
			next.set("custom", {
				add: {},
				replace: { window() {} },
			});
			next.set("logSkill", event.name);
			next.backup("dchanjie_backup");
			event.result = await next.forResult();
		},
		subSkill: {
			backup: {
				filterCard(card) {
					return get.itemtype(card) == "card" && get.color(card) == "black";
				},
				position: "hs",
				selectCard: 1,
				check: card => 7 - get.value(card),
				filterTarget(card, player, target) {
					const { onlyTarget } = get.event();
					return target == onlyTarget && lib.filter.targetEnabled.apply(this, arguments);
				},
				async precontent(event) {
					delete event.result.skill;
				},
				log: false,
				popname: true,
			},
		},
	}
```

## wufu 名字:伍孚 势力:qun

### dczhonge 名字:忠锷
描述: 出牌阶段限一次，你可以将手牌调整至体力上限，与一名其他角色同时选择一项：1.你与其依次摸一张牌；2.你与其依次视为对对方使用一张【杀】。若其选择的项与你不同，你执行每项操作时额外执行一次。
```js
dczhonge: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		filterCard(card, player) {
			return player.countCards("h") > player.maxHp;
		},
		selectCard() {
			const player = get.player();
			if (player.countCards("h") <= player.maxHp) {
				return [0, 1];
			}
			return player.countCards("h") - player.maxHp;
		},
		allowChooseAll: true,
		async content(event, trigger, player) {
			if (!event.cards?.length) {
				await player.drawTo(player.maxHp);
			}
			const target = event.target,
				targets = [player, target];
			const map = await game.chooseAnyOL(targets, get.info(event.name).chooseControl, [targets]).forResult();
			let list = [];
			for (const i of targets) {
				const result = map.get(i);
				i.popup(result.control);
				list.push(result.control);
			}
			list.sort((a, b) => (a === "摸牌" ? -1 : 1));
			const bool = list[0] != list[1];
			for (const i of list) {
				for (const current of targets) {
					if (i == "摸牌") {
						await current.draw();
						if (bool && current == player) {
							await current.draw();
						}
					} else {
						const sha = new lib.element.VCard({ name: "sha", isCard: true }),
							aim = current === player ? target : player;
						if (current.isIn() && current.canUse(sha, aim, false)) {
							current.line(aim);
							await current.useCard(sha, aim, false, "noai");
						}
						if (bool && current == player) {
							const sha2 = new lib.element.VCard({ name: "sha", isCard: true });
							if (current.isIn() && current.canUse(sha2, aim, false)) {
								current.line(aim);
								await current.useCard(sha2, aim, false, "noai");
							}
						}
					}
				}
			}
		},
		chooseControl(player, targets, eventId) {
			const str = get.translation(targets[0] == player ? targets[1] : targets[0]);
			return player
				.chooseControl("摸牌", "出杀")
				.set("prompt", `忠锷：请选择一项与${str}依次执行`)
				.set("prompt2", `若你与其选择的选项不同，${get.translation(targets[0])}执行时额外执行一遍`)
				.set("ai", () => {
					if (get.event().att > 0) {
						return "摸牌";
					}
					return Math.random() > 0.3 ? "出杀" : "摸牌";
				})
				.set("att", Math.max(get.attitude(targets[0], targets[1]), get.attitude(targets[1], targets[0])))
				.set("id", eventId)
				.set("_global_waiting", true);
		},
		ai: {
			order: 3,
			result: {
				target(player, target) {
					return get.effect(target, { name: "sha" }, player, target) + 1;
				},
				player(player, target) {
					return player.maxHp - player.countCards("h");
				},
			},
		},
	}
```

### dcjuekai 名字:绝忾
描述: `限定技，出牌阶段，你可以重置${get.poptip("dczhonge")}，然后直到出牌阶段结束，此阶段获得过牌的角色无法再使用手牌。`
```js
dcjuekai: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "fire",
		manualConfirm: true,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			if (typeof get.skillCount("dczhonge") == "number" && get.skillCount("dczhonge") >= 1) {
				delete player.getStat("skill")["dczhonge"];
				game.log(player, "重置了技能", "#g【忠锷】");
			}
			player.addTempSkill("dcjuekai_effect", "phaseChange");
			for (const target of game.players) {
				if (
					target.getHistory("gain", evt => {
						return evt.getParent("phaseUse") == event.getParent("phaseUse", true);
					}).length
				) {
					player.line(target, "green");
					target.addTempSkill("dcjuekai_fengyin", "phaseChange");
				}
			}
		},
		ai: {
			combo: "dczhonge",
			order: 1,
			result: {
				player(player) {
					if (!player.getStat("skill")?.["dczhonge"]) {
						return 0;
					}
					return 1;
				},
			},
		},
		subSkill: {
			effect: {
				trigger: {
					global: ["gainAfter", "loseAsyncAfter"],
				},
				charlotte: true,
				direct: true,
				async content(event, trigger, player) {
					for (const target of game.players) {
						if (!target.hasSkill("dcjuekai_fengyin") && trigger.getg && trigger.getg(target)?.length) {
							player.line(target, "green");
							target.addTempSkill("dcjuekai_fengyin", "phaseChange");
						}
					}
				},
			},
			fengyin: {
				charlotte: true,
				onremove: true,
				mark: true,
				marktext: "忾",
				intro: {
					content: "本阶段无法使用手牌",
				},
				mod: {
					cardEnabled2(card) {
						if (get.position(card) == "h") {
							return false;
						}
					},
				},
			},
		},
	}
```

## yj_sb_guojia 名字:新杀谋郭嘉 势力:wei

### xianmou 名字:先谋
描述: 转换技。①游戏开始时，你可以转换此技能状态；②你失去过牌的回合结束时，你可以：阳，观看牌堆顶五张牌并获得至多X张牌，若未获得X张牌则获得〖遗计〗直到再发动此项；阴，观看一名角色手牌并弃置其中至多X张牌，若弃置X张牌则你进行一次【闪电】判定。（X为你本回合失去牌数）
```js
xianmou: {
		mark: true,
		marktext: "☯",
		zhuanhuanji(player, skill) {
			player.storage[skill] = !player.storage[skill];
			player.changeSkin({ characterName: "yj_sb_guojia" }, "yj_sb_guojia" + (player.storage[skill] ? "_shadow" : ""));
		},
		intro: {
			content(storage) {
				if (!storage) {
					return "你失去过牌的回合结束时，你可以观看牌堆顶五张牌并获得至多X张牌，若未获得X张牌则获得〖遗计〗直到再发动此项（X为你本回合失去牌数）";
				}
				return "你失去过牌的回合结束时，你可以观看一名角色手牌并弃置其中至多X张牌，若弃置X张牌则你进行一次【闪电】判定（X为你本回合失去牌数）";
			},
		},
		audio: 2,
		audioname: ["yj_sb_guojia_shadow"],
		trigger: {
			global: "phaseEnd",
		},
		filter(event, player) {
			return player.getHistory("lose", evt => evt.cards2 && evt.cards2.length).length;
		},
		getNum(player) {
			let num = 0;
			player.getHistory("lose", evt => {
				if (evt.cards2) {
					num += evt.cards2.length;
				}
			});
			return num;
		},
		async cost(event, trigger, player) {
			let num = get.info(event.skill)?.getNum(player);
			if (player.storage[event.skill]) {
				event.result = await player
					.chooseTarget(get.prompt(event.skill), `观看一名角色手牌并弃置其中至多${num}张牌`, function (card, player, target) {
						return target.countCards("h");
					})
					.set("ai", function (target) {
						const player = _status.event.player;
						return get.effect(target, { name: "guohe_copy2" }, player, player);
					})
					.forResult();
			} else {
				event.result = await player.chooseBool(get.prompt(event.skill), `观看牌堆顶五张牌并获得至多${num}张牌`).forResult();
			}
			event.result.cost_data = num;
		},
		async content(event, trigger, player) {
			let num = event.cost_data;
			player.changeZhuanhuanji(event.name);
			if (player.storage[event.name]) {
				player.addAdditionalSkills(event.name, []);
				let cards = game.cardsGotoOrdering(get.cards(5)).cards;
				const result = await player
					.chooseButton([`是否获得至多${num}张牌？`, cards], [1, num])
					.set("ai", function (button) {
						if (ui.selected.buttons.length + 1 >= _status.event.maxNum) {
							return 0;
						}
						return get.value(button.link);
					})
					.set("maxNum", num)
					.forResult();
				if (result.bool) {
					await player.gain(result.links, "gain2");
					cards.removeArray(result.links);
				}
				await game.cardsGotoPile(cards.reverse(), "insert");
				if (!result.bool || result.links.length < num) {
					await player.addAdditionalSkills(event.name, get.info(event.name)?.derivation);
				}
			} else {
				const target = event.targets[0];
				const result = await player
					.discardPlayerCard(target, "h", `是否弃置${get.translation(target)}至多${num}张牌?`, [1, num], "visible")
					.set("ai", function (button) {
						if (ui.selected.buttons.length + 1 >= _status.event.maxNum) {
							return 5 - get.value(button.link);
						}
						return get.value(button.link);
					})
					.set("maxNum", num)
					.forResult();
				if (result?.bool && result.links?.length >= num) {
					await player.executeDelayCardEffect("shandian");
				}
			}
		},
		derivation: "new_reyiji",
		group: "xianmou_change",
		subSkill: {
			change: {
				audio: "xianmou",
				audioname: ["yj_sb_guojia_shadow"],
				trigger: {
					global: "phaseBefore",
					player: "enterGame",
				},
				filter(event, player) {
					return event.name != "phase" || game.phaseNumber == 0;
				},
				prompt2(event, player) {
					return "切换【先谋】为状态" + (player.storage.xianmou ? "阳" : "阴");
				},
				check: () => Math.random() > 0.5,
				async content(event, trigger, player) {
					player.changeZhuanhuanji("xianmou");
				},
			},
		},
	}
```

### lunshi 名字:论势
描述: 其他角色对其以外的角色使用普通锦囊牌的结算中，若你手牌中两种颜色的牌数量相同，你可将一张手牌当作不可被响应的【无懈可击】使用。
```js
lunshi: {
		audio: 2,
		audioname: ["yj_sb_guojia_shadow"],
		position: "hs",
		enable: "chooseToUse",
		filter(event, player) {
			if (!player.countCards("hs")) {
				return false;
			}
			if (player.countCards("h", { color: "black" }) != player.countCards("h", { color: "red" })) {
				return false;
			}
			if (event.type != "wuxie") {
				return false;
			}
			let info = event.info_map;
			if (!info || get.type(info.card) != "trick") {
				return false;
			}
			return info.player != info.target;
		},
		filterCard: true,
		viewAs: {
			name: "wuxie",
		},
		viewAsFilter(player) {
			if (!player.countCards("hs")) {
				return false;
			}
			if (player.countCards("h", { color: "black" }) != player.countCards("h", { color: "red" })) {
				return false;
			}
			return true;
		},
		prompt: "将一张手牌当无懈可击使用",
		check(card) {
			return 8 - get.value(card);
		},
		group: "lunshi_nowuxie",
		subSkill: {
			nowuxie: {
				trigger: {
					player: "useCard",
				},
				forced: true,
				locked: false,
				popup: false,
				filter(event, player) {
					return event.card.name == "wuxie" && event.skill == "lunshi";
				},
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.players);
				},
			},
		},
	}
```

## xunyuxunyou 名字:荀彧荀攸 势力:wei

### zhinang 名字:智囊
描述: ①当你使用锦囊牌后，你可以获得一个技能台词包含“谋”的技能直到再发动此项；②当你使用装备牌后，你可以获得一个技能名包含“谋”的技能直到再发动此项。
```js
zhinang: {
		getMap() {
			if (!_status.zhinang_map) {
				_status.zhinang_map = {
					name: {},
					info: {},
				};
				let list;
				if (_status.connectMode) {
					list = get.charactersOL();
				} else {
					list = get.gainableCharacters();
				}
				list.forEach(name => {
					if (name !== "xunyuxunyou") {
						const skills = get.character(name, 3);
						skills.forEach(skill => {
							const info = get.info(skill);
							if (!info || (info.ai && info.ai.combo)) {
								return;
							}
							if (skill in _status.zhinang_map) {
								return;
							}
							if (get.translation(skill).includes("谋")) {
								_status.zhinang_map.name[skill] = name;
							}
							const voices = get.Audio.skill({ skill, name }).textList;
							if (voices.some(data => data.includes("谋"))) {
								_status.zhinang_map.info[skill] = name;
							}
						});
					}
				});
			}
			return _status.zhinang_map;
		},
		trigger: {
			player: "useCardAfter",
		},
		filter(event, player) {
			return ["trick", "equip"].includes(get.type2(event.card));
		},
		prompt2(event, player) {
			const type = get.type2(event.card),
				name = `zhinang_${type}`,
				skills = player.getRemovableAdditionalSkills(name);
			let str = `获得一个技能${type == "trick" ? "台词" : "名"}包含“谋”的技能`;
			if (skills.length) {
				str = `失去${skills.map(skill => `【${get.translation(skill)}】`)}并${str}`;
			}
			return str;
		},
		keepSkill: true,
		async content(event, trigger, player) {
			const map = lib.skill.zhinang.getMap(),
				type = get.type2(trigger.card) == "equip" ? "name" : "info",
				list = Object.keys(map[type]);
			if (list.length > 0) {
				const skill = list.randomGet(),
					voiceMap = get.Audio.skill({ skill, player: map[type][skill] }).audioList;
				if (type == "info") {
					findaudio: for (let data of voiceMap) {
						if (!data.text) {
							continue;
						}
						if (data.text.includes("谋")) {
							player.chat(data.text);
							game.broadcastAll(file => game.playAudio(file), data.file);
							break findaudio;
						}
					}
				} else {
					player.flashAvatar("zhinang", map[type][skill]);
				}
				await player.addAdditionalSkills(`zhinang_${get.type2(trigger.card)}`, skill);
			}
		},
		init(player, skill) {
			player.addSkill(["zhinang_equip", "zhinang_trick"]);
		},
		onremove(player, skill) {
			player.removeSkill(["zhinang_equip", "zhinang_trick"]);
		},
		subSkill: {
			equip: {},
			trick: {},
		},
	}
```

### gouzhu 名字:苟渚
描述: 你失去技能后，若此技能为：锁定技，回复1点体力；觉醒技，获得一张基本牌；限定技，对随机一名其他角色造成1点伤害；转换技，手牌上限+1；主公技，增加1点体力上限。
```js
gouzhu: {
		trigger: {
			player: "changeSkillsAfter",
		},
		filter(_1, player, _3, skill) {
			let list = get.skillCategoriesOf(skill, player);
			return list.length && list.some(item => item in lib.skill.gouzhu.effectMap);
		},
		getIndex(event, player) {
			if (!event.removeSkill.length) {
				return false;
			}
			return event.removeSkill;
		},
		prompt(_1, _2, _3, skill) {
			return `失去了技能【${get.translation(skill)}】，是否发动【苟渚】？`;
		},
		frequent: true,
		effectMap: {
			锁定技: async function () {
				let player = _status.event.player;
				if (player.isDamaged()) {
					await player.recover();
				}
			},
			觉醒技: async function () {
				let player = _status.event.player;
				let card = get.cardPile(card => get.type(card) == "basic");
				if (card) {
					await player.gain(card, "gain2");
				}
			},
			限定技: async function () {
				let player = _status.event.player;
				let target = game.filterPlayer(current => current != player).randomGet();
				if (target) {
					player.line(target, "green");
					await target.damage(player);
				}
			},
			转换技: async function () {
				let player = _status.event.player;
				player.addMark("gouzhu", 1, false);
				game.log(player, "手牌上限+1");
				await game.delay();
			},
			主公技: async function () {
				let player = _status.event.player;
				await player.gainMaxHp();
			},
		},
		mod: {
			maxHandcard(player, num) {
				return num + player.countMark("gouzhu");
			},
		},
		intro: {
			content: "手牌上限+#",
		},
		locked: false,
		onremove: true,
		async content(event, trigger, player) {
			let skill = event.indexedData;
			let list = get.skillCategoriesOf(skill, player);
			for (const item of list) {
				if (item in lib.skill.gouzhu.effectMap) {
					const next = game.createEvent("gouzhu_effect", false);
					next.player = player;
					next.setContent(lib.skill.gouzhu.effectMap[item]);
					await next;
				}
			}
		},
	}
```

## xiahoumao 名字:夏侯楙 势力:wei

### tongwei 名字:统围
描述: 出牌阶段限一次。你可以重铸两张牌并指定一名其他角色，当其使用的下一张牌结算结束后，若此牌点数在你上次以此法重铸的牌的点数之间，你视为对其使用一张【杀】或【过河拆桥】。
```js
tongwei: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("he", card => lib.skill.tongwei.filterCard(card, player)) > 1 && game.hasPlayer(i => i !== player);
		},
		filterTarget: lib.filter.notMe,
		filterCard: lib.filter.cardRecastable,
		selectCard: 2,
		position: "he",
		discard: false,
		lose: false,
		delay: false,
		popname: true,
		check(card) {
			let num = 6.5;
			if (ui.selected.cards.length) {
				const cardx = ui.selected.cards[0];
				num = get.number(cardx);
			}
			const del = Math.abs(get.number(card) - num);
			return 5 + del / 5 - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.recast(cards);
			const numbers = cards.map(c => get.number(c, player)).sort((a, b) => a - b);
			target.when("useCard1").step(async (event, trigger, player) => {
				trigger._tongwei_checked = true;
			});
			const playerx = player;
			target
				.when("useCardAfter")
				.assign({
					mod: {
						aiOrder(player, card, num) {
							const number = get.number(card);
							if (typeof number !== "number" || number < numbers[0] || number > numbers[1]) {
								return num + 10;
							}
						},
					},
				})
				.filter((event, player) => event._tongwei_checked)
				.step(async (event, trigger, player) => {
					const number = get.number(trigger.card);
					if (typeof number !== "number" || number < numbers[0] || number > numbers[1]) {
						return;
					}
					const names = ["sha", "guohe"].filter(name => playerx.canUse({ name, isCard: true }, player, false));
					let result;
					if (!names.length) {
						return;
					}
					if (names.length === 1) {
						result = { links: [[null, null, names[0]]] };
					} else {
						const choice = names.map(name => [name, get.effect(player, { name, isCard: true }, playerx, playerx)]).sort((a, b) => b[1] - a[1])[0][0];
						result = await playerx
							.chooseButton({
								createDialog: [`请选择要视为对${get.translation(player)}使用的牌`, [names, "vcard"]],
								forced: true,
								ai(button) {
									return button.link[0][2] === _status.event.choice;
								},
							})
							.set("choice", choice)
							.forResult();
					}
					const name = result.links[0][2];
					const card = { name, isCard: true };
					if (playerx.canUse(card, player, false)) {
						await playerx.useCard(card, player, "tongwei");
					}
				});
		},
		ai: {
			expose: 0.2,
			order: 7,
			threaten: 2.2,
			result: {
				target: -1,
			},
		},
	}
```

### cuguo 名字:蹙国
描述: 锁定技。当你于一回合使用牌首次被抵消后，你弃置一张牌，视为对此牌的目标角色使用一张该被抵消的牌。此牌结算结束后，若此牌被抵消，你失去1点体力。
```js
cuguo: {
		audio: 2,
		trigger: { player: ["shaMiss", "eventNeutralized"] },
		filter(event, player) {
			if (event.type != "card" && event.name != "_wuxie") {
				return false;
			}
			if (
				!event.target ||
				!event.target.isIn() ||
				!player.canUse(
					{
						name: event.card.name,
						nature: event.card.nature,
						isCard: true,
					},
					event.target,
					false
				)
			) {
				return false;
			}
			if (!player.hasCard(card => lib.filter.cardDiscardable(card, player), "he")) {
				return false;
			}
			const history = game.getGlobalHistory("everything", evt => {
				if (evt._neutralized || (evt.responded && (!evt.result || !evt.result.bool))) {
					var evtx = evt.getParent();
					return evtx.name == "useCard" && evtx.player == player;
				}
			});
			return history.length == 1;
		},
		locked: true,
		async cost(event, trigger, player) {
			const card = {
				name: trigger.card.name,
				nature: trigger.card.nature,
				isCard: true,
				storage: { cuguo: true },
			};
			event.result = await player
				.chooseToDiscard("蹙国：请弃置一张牌", `视为你对${get.translation(trigger.target)}使用一张${get.translation(card.nature || "")}【${get.translation(card.name)}】`, "he", true)
				.set("logSkill", [event.skill, trigger.target])
				.forResult();
		},
		async content(event, trigger, player) {
			const card = {
				name: trigger.card.name,
				nature: trigger.card.nature,
				isCard: true,
				storage: { cuguo: true },
			};
			if (player.canUse(card, trigger.target, false)) {
				const next = player.useCard(card, trigger.target);
				player
					.when("useCardAfter")
					.filter(event => {
						return event.card.storage?.cuguo && event == next;
					})
					.step(async (event, trigger, player) => {
						if (
							game.hasGlobalHistory("everything", evt => {
								if (evt._neutralized || (evt.responded && (!evt.result || !evt.result.bool))) {
									if (evt.getParent() == trigger) {
										return true;
									}
								}
								return false;
							})
						) {
							await player.loseHp();
						}
					});
				await next;
			}
		},
	}
```

## chenshi 名字:陈式 势力:shu

### qingbei 名字:擎北
描述: ①每轮开始时，你可以选择任意种花色，你不能于本轮内使用这些花色的牌。②你使用有花色的牌结算结束后，你摸X张牌（X为你本轮〖擎北①〗选择的花色数）。
```js
qingbei: {
		audio: 2,
		trigger: {
			global: "roundStart",
			player: "useCardAfter",
		},
		filter(event, player) {
			if (event.name != "useCard") {
				return true;
			}
			if (!player.getStorage("qingbei_effect").length) {
				return false;
			}
			const suit = get.suit(event.card);
			if (!suit) {
				return false;
			}
			return suit !== "none";
		},
		async cost(event, trigger, player) {
			if (trigger.name == "useCard") {
				event.result = {
					bool: true,
				};
				return;
			}
			const result = await player
				.chooseButton([`###${get.prompt(event.skill)}###<div class='text center'>选择任意个花色，令你本轮不能使用这些花色的牌</div>`, [lib.suit.map(i => ["", "", "lukai_" + i]), "vcard"]], [1, 4])
				.set("ai", button => {
					const player = get.player(),
						suit = button.link[2].slice(6),
						val = player
							.getCards("hs", { suit: suit })
							.map(card => {
								return get.value(card) + player.getUseValue(card) / 3;
							})
							.reduce((sum, value) => {
								return sum + value;
							}, 0);
					if (val > 10 && ui.selected.buttons.length > 0) {
						return -1;
					}
					if (val > 6 && ui.selected.buttons.length == 2) {
						return -1;
					}
					if (ui.selected.buttons.length == 3) {
						return -1;
					}
					return 1 + 1 / val;
				})
				.forResult();
			if (result?.bool && result.links?.length) {
				event.result = {
					bool: true,
					cost_data: result.links,
				};
			}
		},
		async content(event, trigger, player) {
			if (trigger.name == "useCard") {
				await player.draw(player.getStorage("qingbei_effect").length, "nodelay");
				return;
			}
			const { name, cost_data: links } = event;
			const suits = links.map(i => i[2].slice(6)).sort((a, b) => lib.suit.indexOf(b) - lib.suit.indexOf(a));
			const skill = `${name}_effect`;
			player.addTempSkill(skill, "roundStart");
			player.setStorage(skill, suits, true);
			player.addTip(skill, `${get.translation(skill)}${suits.map(i => get.translation(i)).join("")}`);
		},
		ai: {
			threaten: 2.3,
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove(player, skill) {
					delete player.storage[skill];
					player.removeTip(skill);
				},
				mark: true,
				intro: {
					content: `本轮内不能使用$花色的牌`,
				},
				mod: {
					cardEnabled(card, player) {
						if (player.getStorage("qingbei_effect").includes(get.suit(card))) {
							return false;
						}
					},
					cardSavable(card, player) {
						if (player.getStorage("qingbei_effect").includes(get.suit(card))) {
							return false;
						}
					},
				},
			},
		},
	}
```

## sunli 名字:孙礼 势力:wei

### kangli 名字:伉厉
描述: 当你造成或受到伤害后，你可以摸两张牌。然后你下次造成伤害时弃置这些牌。
```js
kangli: {
		audio: 2,
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		frequent: true,
		async content(event, trigger, player) {
			await player.draw({ num: 2, gaintag: ["kangli"] });
			player.when({ source: "damageBegin1" }).step(async (event, trigger, player) => {
				const cards = player.getCards("h", card => card.hasGaintag("kangli") && lib.filter.cardDiscardable(card, player, "kangli"));
				if (cards.length) {
					await player.discard({ cards });
				}
			});
		},
		ai: {
			maixie: true,
		},
	}
```

## feiyao 名字:费曜 势力:wei

### zhenfeng 名字:镇锋
描述: 每回合限一次。当其他角色于其回合内使用牌时，若其手牌数不大于其体力值，你可以猜测其手牌中与此牌类别相同的牌数。若你猜对，你摸X张牌并视为对其使用一张【杀】（X为你连续猜对的次数且至多为5）；若你猜错且差值大于1，其视为对你使用一张【杀】。
```js
zhenfeng: {
		audio: 2,
		trigger: { global: "useCard" },
		usable: 1,
		filter(event, player) {
			return event.player != player && event.player == _status.currentPhase && event.player.countCards("h") <= event.player.getHp();
		},
		check(event, player) {
			const target = event.player;
			const type = get.type2(event.card, target);
			const att = get.attitude(player, target);
			if (att <= 0) {
				return true;
			}
			if (target.isAllCardsKnown(player) && (target.getHp() >= 3 || get.effect(target, { name: "sha" }, player, player) > 0 || target.hasShan())) {
				return true;
			}
			if (1.5 * target.getHp() + 0.8 * target.countCards("h") > 6 - player.countMark("zhenfeng")) {
				return true;
			}
			return false;
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			const choices = Array.from({ length: target.countCards("h") + 1 }).map((_, i) => get.cnNumber(i, true));
			const type = get.type2(trigger.card, target);
			const result = await player
				.chooseControl(choices, "cancel2")
				.set("prompt", `镇锋：猜测其手牌中的${get.translation(type)}牌数`)
				.set("ai", () => {
					return _status.event.choice;
				})
				.set(
					"choice",
					(function () {
						if (!get.info("zhenfeng").check(trigger, player)) {
							return "cancel2";
						}
						const num = target.countCards("h");
						const knownNum = target.countKnownCards(player, card => get.type2(card) == type);
						if (target.isAllCardsKnown(player)) {
							return knownNum;
						}
						const restNum = num - knownNum;
						let numx;
						if (type == "basic") {
							numx = knownNum + Math.floor(Math.random() * (restNum + 1));
						} else if (type == "trick") {
							if (num > 2) {
								numx = 2;
							} else {
								numx = 1;
							}
							if (Math.random() < 0.5) {
								numx += Math.random() > 0.5 ? 1 : -1;
							}
						} else {
							numx = Math.random() < 0.4 ? 1 : 0;
						}
						if (numx < knownNum) {
							numx = knownNum;
						} else if (numx >= choices.length) {
							numx = choices.length - 1;
						}
						return numx;
					})()
				)
				.forResult();
			event.result = {
				bool: result?.control != "cancel2",
				cost_data: result.index,
			};
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const target = event.targets[0];
			const guessedNum = event.cost_data;
			const type = get.type2(trigger.card, target);
			player.chat("我猜" + get.cnNumber(guessedNum) + "张");
			game.log(player, "猜测", target, "有", get.cnNumber(guessedNum) + "张" + get.translation(type) + "牌");
			await game.delay();
			const count = target.countCards("h", card => get.type2(card) == type);
			if (count == guessedNum) {
				player.popup("洗具");
				game.log(player, "猜测", "#g正确");
				if (player.countMark("zhenfeng") < 5) {
					player.addMark("zhenfeng", 1, false);
				}
				await player.draw(player.countMark("zhenfeng"));
				if (player.canUse("sha", target, false)) {
					await player.useCard({ name: "sha", isCard: true }, target);
				}
			} else {
				player.popup("杯具");
				game.log(player, "猜测", "#y错误");
				player.clearMark("zhenfeng");
				if (Math.abs(count - guessedNum) > 1 && target.canUse("sha", player, false)) {
					await target.useCard({ name: "sha", isCard: true }, player, false, "noai");
				}
			}
		},
		onremove: true,
		intro: { content: "已连续猜对#次" },
	}
```

## wuanguo 名字:武安国 势力:qun

### diezhang 名字:叠嶂
描述: 转换技。①出牌阶段，你使用【杀】的次数上限+1。②阳：当你使用牌被其他角色抵消后，你可以弃置一张牌，视为对其使用X张【杀】；阴：当其他角色使用牌被你抵消后，你可以摸X张牌，视为对其使用一张【杀】（X为1）。
```js
diezhang: {
		audio: 2,
		locked: false,
		zhuanhuanji(player, skill) {
			if (!player.storage.duanwan) {
				player.storage[skill] = !player.storage[skill];
			}
		},
		trigger: { global: ["eventNeutralized", "shaMiss"] },
		filter(event, player) {
			if (player.hasSkill("diezhang_used")) {
				return false;
			}
			if (event.type !== "card") {
				return false;
			}
			const evt = event._neutralize_event;
			const user = event.player;
			let responder;
			if (event.name === "sha") {
				responder = event.target;
			} else {
				if (evt.type !== "card") {
					return false;
				}
				responder = evt.player;
			}
			if (!player.storage.diezhang) {
				if (user !== player || responder === player) {
					return false;
				}
				return player.countDiscardableCards(player, "he") > 0 && player.canUse("sha", responder, false);
			}
			if (user === player || responder !== player) {
				return false;
			}
			return player.canUse("sha", user, false);
		},
		async cost(event, trigger, player) {
			const evt = trigger._neutralize_event;
			const user = trigger.player;
			const responder = trigger.name === "sha" ? trigger.target : evt.player;
			const num = player.storage.duanwan ? 2 : 1;
			const target = player.storage.diezhang ? user : responder;
			const next = player.storage.diezhang
				? player.chooseBool({
						prompt: get.prompt("diezhang", target),
						prompt2: `摸${get.cnNumber(num)}张牌，视为对其使用一张【杀】`,
						ai() {
							return get.event().goon;
						},
					})
				: player
						.chooseToDiscard({
							prompt: get.prompt("diezhang", target),
							prompt2: `弃置一张牌，视为对其使用${get.cnNumber(num)}张【杀】`,
							position: "he",
							ai(card) {
								return get.event().goon ? 6 - get.value(card) : 0;
							},
						})
						.set("chooseonly", true);
			next.set("goon", get.effect(target, { name: "sha" }, player, player) > 0);
			event.result = await next.forResult();
			event.result.targets = [target];
			event.result.cost_data = {
				num,
			};
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			if (player.storage.duanwan) {
				player.addTempSkill("diezhang_used");
			}
			player.changeZhuanhuanji("diezhang");

			const target = event.targets[0];
			const num = event.cost_data.num;
			if (!event.cards?.length) {
				await player.draw({
					num,
					nodelay: true,
				});
				await player.useCard({
					card: get.autoViewAs({ name: "sha", isCard: true }),
					targets: [target],
					addCount: false,
				});
				return;
			}
			await player.discard({ cards: event.cards });
			for (let i = 0; i < num; ++i) {
				await player.useCard({
					card: get.autoViewAs({ name: "sha", isCard: true }),
					targets: [target],
					addCount: false,
				});
			}
		},
		marktext: "☯",
		mark: true,
		intro: {
			content(storage, player) {
				const cnNum = get.cnNumber(player.storage.duanwan ? 2 : 1);
				if (storage) {
					return `当其他角色使用牌被你抵消后，你可以摸${cnNum}张牌，视为对其使用一张【杀】。`;
				}
				return `当你使用牌被其他角色抵消后，你可以弃置一张牌，视为对其使用${cnNum}张【杀】。`;
			},
		},
		mod: {
			cardUsable(card, player, num) {
				if (!player.storage.duanwan && card.name === "sha") {
					return num + 1;
				}
			},
		},
		subSkill: { used: { charlotte: true } },
	}
```

### duanwan 名字:断腕
描述: 限定技。当你处于濒死状态时，你可以将体力回复至2点，然后删除〖叠嶂①〗和当前转换技状态的〖叠嶂②〗分支，并将〖叠嶂〗修改为“每回合限一次”且将X修改为2。
```js
duanwan: {
		audio: 2,
		enable: "chooseToUse",
		skillAnimation: true,
		animationColor: "soil",
		limited: true,
		filter(event, player) {
			return event.type === "dying" && player === event.dying;
		},
		async content(event, trigger, player) {
			player.changeZhuanhuanji("diezhang");
			player.awakenSkill(event.name);
			const num = 2 - player.hp;
			if (num > 0) {
				await player.recover({ num });
			}
		},
		ai: {
			save: true,
			skillTagFilter(player, tag, target) {
				return player === target;
			},
			result: { player: 1 },
		},
	}
```

## hanlong 名字:韩龙 势力:wei

### duwang 名字:独往
描述: 锁定技。①游戏开始时，你从牌堆顶将五张不为【杀】的牌置于武将牌上，称为“刺”。②若你有牌名不为【杀】的“刺”，你至其他角色或其他角色至你的距离+1。
```js
duwang: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		filter(event, player) {
			return event.name !== "phase" || game.phaseNumber === 0;
		},
		async content(event, trigger, player) {
			const cards = [];
			for (const card of ui.cardPile.childNodes) {
				if (card.name === "sha") {
					continue;
				}
				cards.push(card);
				if (cards.length >= 5) {
					break;
				}
			}
			if (!cards.length) {
				return;
			}
			const next = player.addToExpansion(cards, "gain2");
			next.gaintag.add("duwang");
			await next;
		},
		marktext: "刺",
		intro: {
			name: "刺",
			name2: "刺",
			content: "expansion",
			markcount: "expansion",
		},
		mod: {
			globalFrom(from, to, distance) {
				return distance + Math.min(1, from.getExpansions("duwang").filter(i => i.name !== "sha").length);
			},
			globalTo(from, to, distance) {
				return distance + Math.min(1, to.getExpansions("duwang").filter(i => i.name !== "sha").length);
			},
		},
	}
```

### cibei 名字:刺北
描述: ①当一名角色使用非转化【杀】造成伤害且此牌对应的实体牌进入弃牌堆后，你可以将一张不为【杀】的“刺”置入弃牌堆，并将这些牌置入“刺”，然后弃置一名角色区域里的一张牌。②一名角色的回合结束时，若你的“刺”均为【杀】，你获得所有“刺”，且这些牌不能被弃置，不计入手牌上限，且当你使用对应实体牌包含这些牌的牌时无次数和距离限制。
```js
cibei: {
		audio: 2,
		trigger: { global: "cardsDiscardAfter" },
		filter(event, player) {
			if (!player.getExpansions("duwang").filter(card => card.name !== "sha").length) {
				return false;
			}
			const evt = event.getParent();
			if (evt.name !== "orderingDiscard") {
				return false;
			}
			const evtx = evt.relatedEvent || evt.getParent();
			return evtx.name === "useCard" && evtx.card.name === "sha" && evtx.card.isCard && event.cards.filterInD("d").length && game.hasPlayer2(current => current.hasHistory("sourceDamage", evtxx => evtxx.card === evtx.card));
		},
		group: "cibei_fullyReady",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseButton({
					createDialog: [`###${get.prompt(event.skill)}###<div class="text center">将一张“刺”置入弃牌堆，并将${get.translation(trigger.cards.filterInD("d"))}置入“刺”</div>`, player.getExpansions("duwang")],
					filterButton(button) {
						return button.link.name !== "sha";
					},
				})
				.set("filterButton", button => button.link.name !== "sha")
				.forResult();
			event.result.cards = event.result.links;
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			const loseEvent = player.loseToDiscardpile({ cards });
			const expansionEvent = player.addToExpansion({
				cards: trigger.cards.filterInD("d"),
				animate: "gain2",
				gaintag: ["duwang"],
			});
			await loseEvent;
			await expansionEvent;
			if (!game.hasPlayer(current => current.hasDiscardableCards(player, "hej"))) {
				return;
			}
			const result = await player
				.chooseTarget({
					prompt: "刺北：弃置一名角色区域内的一张牌",
					filterTarget(card, player, target) {
						return target.hasDiscardableCards(player, "hej");
					},
					forced: true,
					ai(target) {
						return get.effect(target, { name: "guohe" }, get.player());
					},
				})
				.forResult();
			if (!result.bool || !result.targets?.length) {
				return;
			}
			const target = result.targets[0];
			player.line(target);
			const discardEvent = player.discardPlayerCard({
				target,
				position: "hej",
				forced: true,
			});
			player.addExpose(0.1);
			await discardEvent;
		},
		ai: {
			combo: "duwang",
		},
		subSkill: {
			fullyReady: {
				audio: "cibei",
				trigger: { global: "phaseEnd" },
				forced: true,
				locked: false,
				filter(event, player) {
					const storage = player.getExpansions("duwang");
					return storage.length > 0 && storage.every(i => i.name === "sha");
				},
				async content(event, trigger, player) {
					const next = player.gain({
						cards: player.getExpansions("duwang"),
						animate: "gain2",
						gaintag: ["cibei_mark"],
					});
					player.addSkill("cibei_mark");
					await next;
				},
			},
			mark: {
				trigger: { player: "useCard1" },
				onremove: true,
				charlotte: true,
				silent: true,
				firstDo: true,
				filter(event, player) {
					return player.hasHistory("lose", evt => {
						const evtx = evt.relatedEvent || evt.getParent();
						if (evtx !== event) {
							return false;
						}
						return Object.values(evt.gaintag_map).some(tags => tags.includes("cibei_mark"));
					});
				},
				async content(event, trigger, player) {
					if (trigger.addCount !== false) {
						trigger.addCount = false;
						const stat = player.getStat().card;
						const name = trigger.card.name;
						if (typeof stat[name] === "number") {
							stat[name]--;
						}
					}
				},
				mod: {
					ignoredHandcard(card, player) {
						if (card.hasGaintag("cibei_mark")) {
							return true;
						}
					},
					cardDiscardable(card, player, name) {
						if (card.hasGaintag("cibei_mark")) {
							return false;
						}
					},
					canBeDiscarded(card) {
						if (card.hasGaintag("cibei_mark")) {
							return false;
						}
					},
					targetInRange(card, player, target) {
						if (!card.cards) {
							return;
						}
						if (card.cards.some(i => i.hasGaintag("cibei_mark"))) {
							return true;
						}
					},
					cardUsable(card, player) {
						if (!card.cards) {
							return;
						}
						if (card.cards.some(i => i.hasGaintag("cibei_mark"))) {
							return true;
						}
					},
				},
			},
		},
	}
```

## yj_qiaozhou 名字:谯周 势力:shu

### shiming 名字:识命
描述: 每轮限一次。一名角色的摸牌阶段，你可以观看牌堆顶的三张牌，并可以将其中一张置于牌堆底。然后该角色可以改为对自己造成1点伤害，然后从牌堆底摸三张牌。
```js
shiming: {
		audio: 2,
		trigger: { global: "phaseDrawBegin1" },
		round: 1,
		check(event, player) {
			return true;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const cards = get.cards(3, true);
			let result = await player
				.chooseButton(["识命：是否将其中一张置于牌堆底？", cards.slice(0)])
				.set("ai", button => {
					const { att, damage, player } = get.event();
					const val = get.value(button.link, player);
					if ((att > 0 && damage < 0) || (att <= 0 && damage > 0)) {
						return 6 - val;
					}
					return val - 5.99;
				})
				.set("att", get.attitude(player, target))
				.set("damage", get.damageEffect(target, target, player) > 0 && target.hp <= 3 ? 1 : -1)
				.forResult();
			if (result?.bool && result.links?.length) {
				const { links: cards } = result;
				player.popup("一下", "wood");
				game.log(player, "将一张牌置于了牌堆底");
				await game.cardsGotoPile(cards);
			}
			result = await target
				.chooseBool("是否跳过摸牌阶段并对自己造成1点伤害，然后从牌堆底摸三张牌？")
				.set("ai", () => _status.event.bool)
				.set("bool", get.damageEffect(target, target) >= -6 || target.hp > 3)
				.forResult();
			if (result?.bool) {
				trigger.cancel();
				await target.damage(target);
				await target.draw(3, "bottom");
			}
		},
	}
```

### jiangxi 名字:将息
描述: `一名角色的回合结束时，若一号位于此回合内进入过濒死状态或未受到过伤害，你可以重置${get.poptip("shiming")}并摸一张牌；若所有角色均未受到过伤害，你可以与当前回合角色各摸一张牌。`
```js
jiangxi: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			const zhu = game.findPlayer(current => current.getSeatNum() == 1);
			return (
				(zhu &&
					player.storage["shiming_roundcount"] &&
					(game.getGlobalHistory("changeHp", evt => {
						return evt.player == zhu && evt._dyinged;
					}).length > 0 ||
						zhu.getHistory("damage").length == 0)) ||
				!game.hasPlayer2(current => current.getHistory("damage").length > 0)
			);
		},
		direct: true,
		seatRelated: true,
		async content(event, trigger, player) {
			const zhu = game.findPlayer(current => current.getSeatNum() == 1);
			if (zhu && player.storage["shiming_roundcount"]) {
				if (
					game.getGlobalHistory("changeHp", evt => {
						return evt.player == zhu && evt._dyinged;
					}).length > 0 ||
					zhu.getHistory("damage").length == 0
				) {
					const result = await player.chooseBool(get.prompt(event.name), "重置〖识命〗").forResult();
					if (result?.bool) {
						player.logSkill(event.name);
						event.logged = true;
						player.refreshSkill("shiming");
						await player.draw();
					}
				}
			}
			if (!game.hasPlayer2(current => current.getHistory("damage").length > 0)) {
				const result = await player
					.chooseBool(get.prompt(event.name), `与${get.translation(trigger.player)}各摸一张牌`)
					.set(
						"choice",
						(() => {
							let eff = current => get.effect(current, { name: "draw" }, player, player);
							return eff(trigger.player) + eff(player) > 0;
						})()
					)
					.forResult();
				if (result?.bool) {
					if (!event.logged) {
						player.logSkill(event.name);
					}
					await trigger.player.draw("nodelay");
					await player.draw();
				}
			}
		},
	}
```

## yj_sufei 名字:苏飞 势力:wu

### shuojian 名字:数荐
描述: 出牌阶段限三次。你可以交给一名其他角色一张牌，其选择一项：1.令你摸X张牌并弃置X-1张牌；2.视为使用X张【过河拆桥】，然后此技能本回合失效（X为此技能本阶段剩余发动次数+1）。
```js
shuojian: {
		audio: 2,
		enable: "phaseUse",
		usable: 3,
		filterTarget: lib.filter.notMe,
		filterCard: true,
		position: "he",
		discard: false,
		lose: false,
		delay: false,
		check(card, player) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			const target = event.target;
			await player.give(cards, target);
			const num = 3 - get.skillCount("shuojian") + 1;
			if (num === 0) {
				return;
			}
			const playerName = get.translation(player);
			const numText = get.cnNumber(num);
			for (let num2 = num; num2 > 0; num2--) {
				const forced = num !== num2;
				const prompt = `###${playerName}对你发动了【数谏】###视为使用${numText}张【过河拆桥】${forced ? "" : `且${playerName}此技能本回合失效，或点击“取消”令其摸${numText}张牌`}`;
				const result = target.hasUseTarget({ name: "guohe" })
					? await target
							.chooseUseTarget({
								prompt,
								card: get.autoViewAs({ name: "guohe", isCard: true }),
								forced,
								ai(...args) {
									let evt = _status.event;
									if (evt.name === "chooseTarget") {
										const parent = evt.getParent();
										if (parent == null) {
											return 0;
										}
										evt = parent;
									}
									if (!evt.goon) {
										return 0;
									}
									return get.effect_use(...args);
								},
							})
							.set("goon", target.getUseValue({ name: "guohe" }) > (get.sgnAttitude(target, player) * player.getUseValue({ name: "wuzhong" })) / (2 - num * 0.4))
							.forResult()
					: { bool: false };
				if (result.bool) {
					continue;
				}
				await player.draw(num);
				if (num > 1) {
					await player.chooseToDiscard({
						selectCard: num - 1,
						position: "he",
						forced: true,
					});
				}
				return;
			}
			player.tempBanSkill("shuojian");
		},
		ai: {
			expose: 0.15,
			order: 8,
			result: { target: 1 },
		},
	}
```

## liwan 名字:李婉 势力:wei

### liandui 名字:联对
描述: ①当你使用牌时，若本局游戏内上一张被使用的牌的使用者不为你，你可以令其摸两张牌。②其他角色使用牌时，若本局游戏内上一张被使用的牌的使用者为你，其可以令你摸两张牌。
```js
liandui: {
		audio: 2,
		trigger: { global: "useCard" },
		filter(event, player) {
			const history = game.getAllGlobalHistory("useCard");
			const index = history.indexOf(event);
			if (index <= 0) {
				return false;
			}
			const previous = history[index - 1].player;
			if (event.player == player && previous != player && previous.isIn()) {
				return true;
			}
			if (event.player != player && previous == player) {
				return true;
			}
			return false;
		},
		async cost(event, trigger, player) {
			if (!trigger.player) {
				return;
			}
			const history = game.getAllGlobalHistory("useCard");
			const index = history.indexOf(trigger);
			const previous = history[index - 1].player;
			const result = await trigger.player
				.chooseBool("是否对" + get.translation(previous) + "发动【联对】？", "令" + get.translation(previous) + "摸两张牌")
				.set("ai", () => _status.event.bool)
				.set("bool", get.effect(previous, { name: "draw" }, trigger.player, trigger.player) > 0)
				.forResult();
			if (result.bool) {
				event.result = { bool: true, cost_data: previous };
			}
		},
		async content(event, trigger, player) {
			const { cost_data: previous } = event;
			previous.draw(2);
		},
	}
```

### biejun 名字:别君
描述: ①其他角色的出牌阶段限一次。其可以将一张手牌交给你。②每回合限一次。当你受到伤害时，若你手牌中没有本回合因〖别君①〗得到的牌，你可以翻面并防止此伤害。
```js
biejun: {
		audio: 2,
		global: "biejun_give",
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			return (
				!player.hasSkill("biejun_used") &&
				player.countCards("h", card => {
					return card.hasGaintag("biejun");
				}) == 0
			);
		},
		prompt2: "翻面并防止此伤害",
		check(event, player) {
			return player.isTurnedOver() || event.num >= player.hp || get.distance(_status.currentPhase, player, "absolute") >= 3;
		},
		async content(event, trigger, player) {
			player.addTempSkill("biejun_used");
			player.turnOver();
			trigger.cancel();
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return [1, -2];
					}
					if (get.tag(card, "damage")) {
						if (lib.skill.biejun.filter(null, target) && target.isTurnedOver()) {
							return [0, 1];
						}
					}
				},
			},
		},
		subSkill: {
			used: { charlotte: true },
			give: {
				audio: 2,
				enable: "phaseUse",
				usable: 1,
				filter(event, player) {
					if (!player.countCards("h")) {
						return false;
					}
					var targets = game.filterPlayer(function (current) {
						return current != player && current.hasSkill("biejun");
					});
					if (!targets.length) {
						return false;
					}
					return true;
				},
				selectCard: 1,
				filterCard: true,
				chessForceAll: true,
				filterTarget(card, player, target) {
					return target.hasSkill("biejun");
				},
				selectTarget() {
					var player = _status.event.player;
					var targets = game.filterPlayer(function (current) {
						return current != player && current.hasSkill("biejun");
					});
					return targets.length > 1 ? 1 : -1;
				},
				complexSelect: true,
				prompt() {
					var player = _status.event.player;
					var targets = game.filterPlayer(function (current) {
						return current != player && current.hasSkill("biejun");
					});
					return "将一张手牌交给" + get.translation(targets) + (targets.length > 1 ? "中的一人" : "");
				},
				position: "h",
				discard: false,
				lose: false,
				delay: false,
				check(card) {
					const player = _status.event.player;
					if (game.hasPlayer(current => lib.skill.biejun_give.filterTarget(null, player, current) && get.attitude(player, current) > 0)) {
						return 5 - get.value(card);
					}
					return -get.value(card);
				},
				async content(event, trigger, player) {
					game.trySkillAudio("biejun", event.target);
					player.give(event.cards, event.target).gaintag.add("biejun");
					event.target.addTempSkill("biejun_tag");
				},
				ai: {
					order: 2,
					result: { target: 1 },
				},
			},
			tag: {
				charlotte: true,
				forced: true,
				onremove(player) {
					player.removeGaintag("biejun");
				},
			},
		},
	}
```

## zhugeshang 名字:诸葛尚 势力:shu

### sangu 名字:三顾
描述: 结束阶段，你可以选择至多三个{【杀】或不为notarget或singleCard的普通锦囊牌}中的牌名，然后令一名其他角色记录这些牌名。该角色的下个出牌阶段开始时，其的手牌于其需要使用牌时均视为其记录中的第一张牌直到此阶段结束，且当其使用或打出有对应实体牌的牌时，移除这些牌中的第一张牌。若你以此法选择过的牌名均为你本回合内使用过的牌名，则防止你因其以此法使用牌造成的伤害。
```js
sangu: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		getEffect(player, target, event, list1, list2) {
			const att = get.attitude(player, target);
			if (att === 0) {
				return 0;
			}
			const getv = (name, player, arg) => {
				let v = event.getTempCache("sangu", `${player.playerid}${name}`);
				if (typeof v === "number") {
					return v;
				}
				v = player.getUseValue({ name, storage: { sangu: true } }, arg);
				event.putTempCache("sangu", `${player.playerid}${name}`, v);
				return v;
			};
			if (att < 0) {
				for (const name of list1) {
					if (getv(name, target) <= 0) {
						return -att * Math.sqrt(get.threaten(target)) * 2;
					}
				}
				return 0;
			}
			let list = list1.concat(player.hp > 1 ? list2 : []);
			let eff = 0;
			list.sort((a, b) => getv(b, target) - getv(a, target));
			list = list.slice(3);
			for (const name of list) {
				const res = getv(name, target);
				if (res <= 5) {
					break;
				}
				eff += res;
			}
			return Math.sqrt(eff / 1.5) * att;
		},
		async content(event, trigger, player) {
			const list1 = [];
			const list2 = [];
			const used = player
				.iterHistory("useCard")
				.map(evt => evt.card.name)
				.toArray();
			for (const name of lib.inpile) {
				if (name !== "sha") {
					const type = get.type(name);
					if (type !== "trick") {
						continue;
					}
					const info = lib.card[name];
					if (!info || info.singleCard || info.notarget) {
						continue;
					}
				}
				if (used.includes(name)) {
					list1.push(name);
				} else {
					list2.push(name);
				}
			}
			if (!list1.length && !list2.length) {
				return;
			}
			const targetResult = await player
				.chooseTarget({
					prompt: get.prompt2("sangu"),
					filterTarget: lib.filter.notMe,
					ai(target) {
						return lib.skill.sangu.getEffect(_status.event.player, target, _status.event.getTrigger(), _status.event.list1, _status.event.list2);
					},
				})
				.set("list1", list1)
				.set("list2", list2)
				.forResult();
			if (!targetResult.bool || !targetResult.targets?.length) {
				return;
			}
			const target = targetResult.targets[0];
			player.logSkill("sangu", target);
			event.target = target;
			/** @type { any[] } */
			const dialog = [`为${get.translation(target)}选择至多三个牌名`];
			if (list1.length) {
				dialog.push('<div class="text center">本回合已使用过的牌</div>');
				dialog.push([list1.map(i => [get.type(i), "", i]), "vcard"]);
			}
			if (list2.length) {
				dialog.push('<div class="text center">本回合未使用过的牌</div>');
				dialog.push([list2.map(i => [get.type(i), "", i]), "vcard"]);
			}
			const buttonResult = await player
				.chooseButton({
					createDialog: dialog,
					selectButton: [1, 3],
					forced: true,
					ai(button) {
						const name = button.link[2];
						const list = _status.event.list;
						const player = _status.event.player;
						const target = _status.event.getParent()?.target;
						const triggerEvent = _status.event.getTrigger();
						const getv = (name, player) => {
							let v = triggerEvent.getTempCache("sangu", `${player.playerid}${name}`);
							if (typeof v === "number") {
								return v;
							}
							v = player.getUseValue({ name, storage: { sangu: true } });
							triggerEvent.putTempCache("sangu", `${player.playerid}${name}`, v);
							return v;
						};
						if (get.attitude(player, target) < 0) {
							if (!list.includes(name)) {
								return 0;
							}
							return -getv(name, target);
						}
						if (player.hp < 2 && !list.includes(name)) {
							return 0;
						}
						let val = getv(name, target);
						const base = 5;
						val = Math.min(15, val - base);
						if (name === "wuzhong" || name === "dongzhuxianji") {
							val += 15;
						} else if (name === "shunshou") {
							val += 6;
						}
						return val;
					},
				})
				.set("list", list1)
				.forResult();
			if (!buttonResult.bool || !buttonResult.links?.length) {
				return;
			}
			const names = buttonResult.links.map(i => i[2]);
			if (!target.storage.sangu_effect) {
				target.storage.sangu_effect = [];
			}
			target.storage.sangu_effect = target.storage.sangu_effect.concat(names);
			game.log(player, "为", target, "选择了", `#y${get.translation(names)}`);
			target.addTempSkill("sangu_effect", { player: "phaseUseAfter" });
			target.markSkill("sangu_effect");
			const allUsed = names.every(name => used.includes(name));
			if (allUsed) {
				target.addTempSkill("sangu_prevent", { player: "phaseUseAfter" });
				target.markAuto("sangu_prevent", [player]);
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "damage") && card.storage && card.storage.sangu) {
						return "zeroplayertarget";
					}
				},
			},
		},
		subSkill: {
			effect: {
				trigger: { player: "phaseUseBegin" },
				charlotte: true,
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.addTempSkill("sangu_viewas");
				},
				onremove: true,
				intro: {
					mark(dialog, storage, player) {
						if (!storage || !storage.length) {
							return "当前无可用牌";
						}
						dialog.add([[storage[0]], "vcard"]);
						if (storage.length > 1) {
							dialog.addSmall([storage.slice(1), "vcard"]);
						}
					},
					content: "$",
				},
			},
			viewas: {
				hiddenCard(player, name) {
					const storage = player.getStorage("sangu_effect");
					if (!storage.length) {
						return;
					}
					return name === storage[0];
				},
				mod: {
					cardname(card, player) {
						if (_status.event.name !== "chooseToUse" || _status.event.skill) {
							return;
						}
						const storage = player.getStorage("sangu_effect");
						if (!storage.length) {
							return;
						}
						return storage[0];
					},
					cardnature(card, player) {
						if (_status.event.name !== "chooseToUse" || _status.event.skill) {
							return;
						}
						const storage = player.getStorage("sangu_effect");
						if (!storage.length) {
							return;
						}
						return false;
					},
				},
				trigger: { player: ["useCard", "respond"] },
				forced: true,
				charlotte: true,
				filter(event, player) {
					return event.cards.length > 0 && player.getStorage("sangu_effect").length > 0;
				},
				async content(event, trigger, player) {
					if (!trigger.card.storage) {
						trigger.card.storage = {};
					}
					trigger.card.storage.sangu = true;
					player.unmarkAuto("sangu_effect", [player.getStorage("sangu_effect")[0]]);
				},
			},
			prevent: {
				trigger: { source: "damageBegin2" },
				forced: true,
				charlotte: true,
				onremove: true,
				filter(event, player) {
					return event.card && event.card.storage && event.card.storage.sangu && player.getStorage("sangu_prevent").includes(event.player);
				},
				async content(event, trigger, player) {
					trigger.cancel();
				},
			},
		},
	}
```

### yizu 名字:轶祖
描述: 锁定技。每回合限一次，当你成为【杀】或【决斗】的目标后，若你的体力值不大于使用者的体力值，则你回复1点体力。
```js
yizu: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		forced: true,
		usable: 1,
		filter(event, player) {
			return player.isDamaged() && player.hp <= event.player.hp && (event.card.name == "sha" || event.card.name == "juedou");
		},
		async content(event, trigger, player) {
			await player.recover();
		},
		ai: {
			effect: {
				target_use(card, player, target, current) {
					if (target.isHealthy() || (card.name != "sha" && card.name != "juedou")) {
						return;
					}
					if (target.storage.counttrigger && target.storage.counttrigger.yizu && current < 0) {
						return 5;
					}
					if (player.hp < target.hp) {
						return;
					}
					if (current > 0) {
						return 1.2;
					}
					if (get.attitude(player, target) >= 0) {
						return;
					}
					var copy = get.effect(target, { name: "shacopy" }, player, player);
					if (
						copy > 0 &&
						player.isPhaseUsing() &&
						Math.min(
							player.getCardUsable("sha"),
							player.countCards("hs", function (card) {
								return get.name(card) == "sha" && player.canUse(card, target, null, true);
							})
						) >= 2
					) {
						return;
					}
					return [0, 2];
				},
			},
		},
	}
```

## kebineng 名字:轲比能 势力:qun

### kousheng 名字:寇旌
描述: ①出牌阶段开始时，你可以选择任意张手牌，这些牌称为“寇旌”直到回合结束。②你的“寇旌”均视为【杀】且无次数限制。③当你因执行对应实体牌包含“寇旌”的【杀】的效果而造成伤害后，你展示所有“寇旌”牌，然后目标角色可以用所有手牌交换这些牌。
```js
kousheng: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.hasCards("h");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: get.prompt("kousheng"),
					prompt2: "你可以选择任意张手牌，这些手牌于本回合内视为无次数限制的【杀】。但当有角色受到这些【杀】的伤害后，其可以用所有手牌交换剩余的牌。",
					selectCard: [1, player.countCards("h")],
					position: "h",
					allowChooseAll: true,
					ai(card) {
						const player = _status.event.player;
						const standard = _status.event.standard;
						if (standard <= 0) {
							return 0;
						}
						const eff = player.getUseValue(card, null, true);
						if (eff <= standard) {
							return standard - eff + 0.1;
						}
						return 0;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			player.addGaintag(event.cards, "kousheng");
			player.addTempSkill("kousheng_effect");
			await game.delayx();
		},
		subSkill: {
			effect: {
				audio: "kousheng",
				trigger: { player: "useCard1" },
				forced: true,
				charlotte: true,
				firstDo: true,
				filter(event, player) {
					if (event.card.name !== "sha") {
						return false;
					}
					return player.hasHistory("lose", evt => {
						const evtx = evt.relatedEvent || evt.getParent();
						if (evtx !== event) {
							return false;
						}
						return Object.values(evt.gaintag_map).some(tags => tags.includes("kousheng"));
					});
				},
				async content(event, trigger, player) {
					if (!trigger.card.storage) {
						trigger.card.storage = {};
					}
					trigger.card.storage.kousheng = true;
					if (trigger.addCount !== false) {
						trigger.addCount = false;
						const stat = player.getStat().card;
						const name = trigger.card.name;
						if (typeof stat[name] === "number") {
							stat[name]--;
						}
					}
				},
				onremove(player) {
					player.removeGaintag("kousheng");
				},
				mod: {
					cardUsable(card, player, target) {
						if (card.name !== "sha" || !card.cards) {
							return;
						}
						if (card.cards.some(i => i.hasGaintag("kousheng"))) {
							return Infinity;
						}
					},
					cardname(card) {
						if (get.itemtype(card) === "card" && card.hasGaintag("kousheng")) {
							return "sha";
						}
					},
					cardnature(card) {
						if (get.itemtype(card) === "card" && card.hasGaintag("kousheng")) {
							return false;
						}
					},
				},
				group: "kousheng_damage",
			},
			damage: {
				audio: "kousheng",
				trigger: { source: "damageSource" },
				forced: true,
				filter(event, player) {
					if (!event.card || !event.card.storage || !event.card.storage.kousheng || event.getParent()?.type !== "card") {
						return false;
					}
					const target = event.player;
					return target.isIn() && player.hasCard(card => card.hasGaintag("kousheng"), "h");
				},
				async content(event, trigger, player) {
					const target = trigger.player;
					const cards = player.getCards("h", card => card.hasGaintag("kousheng"));
					event.cards = cards;
					const str = get.translation(player);
					await player.showCards(cards, `${str}的【寇旌】牌`);
					if (!target.hasCards("h")) {
						return;
					}
					const result = await target
						.chooseBool({
							prompt: "是否交换“寇旌”牌？",
							prompt2: `用你的所有手牌交换${str}的下列“寇旌”牌：${get.translation(cards)}`,
							ai() {
								const player = _status.event.player;
								const target = _status.event.getParent()?.player;
								if (player.hasShan() || player.hasCards("hs", { name: ["tao", "jiu"] }) || get.attitude(player, target) >= 0) {
									return false;
								}
								const hs1 = player.getCards("h");
								const hs2 = _status.event.getParent()?.cards || [];
								if (hs2?.length >= player.hp) {
									return true;
								}
								if (get.value(hs1, player) >= get.value(hs2, target)) {
									return false;
								}
								return true;
							},
						})
						.forResult();
					if (!result.bool) {
						return;
					}
					await player.swapHandcards(target, cards, target.getCards("h"));
				},
			},
		},
	}
```

## lukai 名字:陆凯 势力:wu

### lkbushi 名字:卜筮
描述: ①你使用♠牌无次数限制。②当你使用或打出♥牌后，你摸一张牌。③当你成为♣牌的目标后，你可以弃置一张牌，令此牌对你无效。④结束阶段开始时，你从牌堆获得一张♦牌。⑤准备阶段开始时，你可调整此技能中四种花色的对应顺序。
```js
lkbushi: {
		audio: 2,
		getBushi(player) {
			if (!player.storage.lkbushi) {
				return ["spade", "heart", "club", "diamond"];
			}
			return player.storage.lkbushi;
		},
		init(player, skill) {
			player.addTip(
				skill,
				`${get.translation(skill)}${lib.skill.lkbushi
					.getBushi(player)
					.map(i => get.translation(i))
					.join("")}`
			);
		},
		onremove(player, skill) {
			delete player.storage[skill];
			player.removeTip(skill);
		},
		trigger: { player: "phaseZhunbeiBegin" },
		direct: true,
		locked: false,
		async content(event, trigger, player) {
			const list = lib.skill.lkbushi.getBushi(player).map(i => ["", "", `lukai_${i}`]);
			const result = await player
				.chooseToMove({
					prompt: "卜筮：是否调整〖卜筮〗的花色顺序？",
					list: [
						[
							"无次数限制/使用打出摸牌<br>可弃牌无效/结束阶段获得",
							[list, "vcard"],
							list => {
								const list2 = list.map(i => get.translation(i[2].slice(6)));
								return `你使用${list2[0]}牌时无次数限制；使用或打出${list2[1]}时，摸一张牌；<br>成为${list2[2]}牌目标后可弃一张牌无效；结束阶段从牌堆获得一张${list2[3]}牌`;
							},
						],
					],
					processAI() {
						const player = _status.event.player;
						const list = lib.skill.lkbushi.getBushi(player);
						const list2 = [];
						let hs = player.getCards("hs", card => player.hasValueTarget(card));
						list.sort((a, b) => hs.filter(i => get.suit(i) === b).length - hs.filter(i => get.suit(i) === a).length);
						list2.push(list.shift());
						hs = player.getCards("hs", "sha");
						list.sort((a, b) => hs.filter(i => get.suit(i) === b).length - hs.filter(i => get.suit(i) === a).length);
						list2.unshift(list.shift());
						list.randomSort();
						list2.addArray(list);
						return [list2.map(i => ["", "", `lukai_${i}`])];
					},
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			const oldList = lib.skill.lkbushi.getBushi(player);
			const list2 = result.moved[0].map(i => i[2].slice(6));
			if (oldList.every((suit, index) => suit === list2[index])) {
				return;
			}
			player.logSkill("lkbushi");
			player.storage.lkbushi = list2;
			player.addTip(
				"lkbushi",
				`${get.translation("lkbushi")}${lib.skill.lkbushi
					.getBushi(player)
					.map(i => get.translation(i))
					.join("")}`
			);
			const str = `#g${list2.map(i => get.translation(i)).join("/")}`;
			game.log(player, "将", "#g【卜筮】", "的花色序列改为", str);
			await game.delayx();
		},
		mark: true,
		marktext: "筮",
		intro: {
			content(storage, player) {
				const list = lib.skill.lkbushi.getBushi(player).map(i => get.translation(i));
				return `①你使用${list[0]}牌无次数限制。②当你使用或打出${list[1]}牌后，你摸一张牌。③当你成为${list[2]}牌的目标后，你可以弃置一张牌，令此牌对你无效。④结束阶段开始时，你从牌堆获得一张${list[3]}牌。⑤准备阶段开始时，你可调整此技能中四种花色的对应顺序。`;
			},
		},
		group: ["lkbushi_unlimit", "lkbushi_draw", "lkbushi_defend", "lkbushi_gain"],
		subSkill: {
			unlimit: {
				mod: {
					cardUsable(card, player) {
						const list = lib.skill.lkbushi.getBushi(player);
						const suit = get.suit(card);
						if (suit === "unsure" || list[0] === suit) {
							return Infinity;
						}
					},
				},
				trigger: { player: "useCard1" },
				forced: true,
				popup: false,
				silent: true,
				firstDo: true,
				filter(event, player) {
					if (event.addCount === false) {
						return false;
					}
					const list = lib.skill.lkbushi.getBushi(player);
					return list[0] === get.suit(event.card);
				},
				async content(event, trigger, player) {
					trigger.addCount = false;
					const stat = player.getStat().card;
					const name = trigger.card.name;
					if (stat[name] && typeof stat[name] === "number") {
						stat[name]--;
					}
				},
			},
			draw: {
				audio: "lkbushi",
				trigger: { player: ["useCardAfter", "respondAfter"] },
				forced: true,
				locked: false,
				filter(event, player) {
					const list = lib.skill.lkbushi.getBushi(player);
					return list[1] === get.suit(event.card);
				},
				async content(event, trigger, player) {
					await player.draw();
				},
			},
			defend: {
				audio: "lkbushi",
				trigger: { target: "useCardToTargeted" },
				direct: true,
				filter(event, player) {
					const list = lib.skill.lkbushi.getBushi(player);
					return list[2] === get.suit(event.card) && !event.excluded.includes(player) && player.countCards("he") > 0;
				},
				async content(event, trigger, player) {
					const next = player
						.chooseToDiscard({
							prompt: get.prompt("lkbushi"),
							prompt2: `弃置一张牌，令${get.translation(trigger.card)}对你无效`,
							position: "he",
							ai(card) {
								if (_status.event.eff >= 0) {
									return 0;
								}
								return -_status.event.eff * 1.1 - get.value(card);
							},
						})
						.set("eff", get.effect(player, trigger.card, trigger.player, player));
					next.logSkill = ["lkbushi_defend", trigger.player];
					const result = await next.forResult();
					if (result.bool) {
						trigger.excluded.add(player);
					}
				},
			},
			gain: {
				audio: "lkbushi",
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					const list = lib.skill.lkbushi.getBushi(player);
					const card = get.cardPile2(card => get.suit(card, false) === list[3]);
					if (card) {
						await player.gain({
							cards: [card],
							animate: "gain2",
						});
					}
				},
			},
		},
	}
```

### lkzhongzhuang 名字:忠壮
描述: 锁定技。①当你因执行【杀】的效果而造成伤害时，若你的攻击范围大于3，则此伤害+1。②当一名角色受到你因执行【杀】的效果而造成的伤害时，若你的攻击范围小于3，则此伤害改为1。
```js
lkzhongzhuang: {
		audio: 2,
		trigger: { source: ["damageBegin1", "damageBegin4"] },
		forced: true,
		filter(event, player, name) {
			if (!event.card || event.card.name !== "sha" || event.getParent().type !== "card") {
				return false;
			}
			const range = player.getAttackRange();
			if (name === "damageBegin1") {
				return range > 3;
			}
			return range < 3 && event.num > 1;
		},
		async content(event, trigger, player) {
			if (event.triggername === "damageBegin1") {
				trigger.num++;
			} else {
				trigger.num = 1;
			}
		},
		global: "lkzhongzhuang_ai",
		subSkill: {
			ai: {
				ai: {
					filterDamage: true,
					skillTagFilter(player, tag, arg) {
						if (!arg || !arg.card || arg.card.name !== "sha") {
							return false;
						}
						return Boolean(arg.player && arg.player.hasSkill("lkzhongzhuang") && arg.player.getAttackRange() < 3);
					},
				},
			},
		},
	}
```

## linghuyu 名字:令狐愚 势力:wei

### xvzhi 名字:蓄志
描述: 出牌阶段限一次，你可令两名角色各选择任意张手牌并交换这些牌，然后获得牌数较少的角色视为使用无视距离的【杀】；若获得牌数相等，你摸两张牌且可以对此阶段未以此法选择过的角色再发动一次〖蓄志〗。
```js
xvzhi: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return (
				game.countPlayer(target => {
					return lib.skill.xvzhi.filterTarget(null, player, target);
				}) > 1
			);
		},
		filterTarget(card, player, target) {
			const stat = player.getStat("xvzhi");
			return target.countCards("h") && (!stat || !stat.includes(target));
		},
		selectTarget: 2,
		usable: 1,
		multiline: true,
		multitarget: true,
		async content(event, trigger, player) {
			const targets = event.targets;
			if (!player.getStat().xvzhi) {
				player.getStat().xvzhi = [];
			}
			player.getStat().xvzhi.addArray(targets);
			if (targets.some(i => !i.countCards("h"))) {
				return;
			}
			const next = player.chooseCardOL(targets, "h", true, [1, Infinity], "蓄志：选择任意张手牌并与对方交换", "allowChooseAll").set("ai", card => {
				const player = get.event().player,
					target = get
						.event()
						.getParent(2)
						.targets.find(i => i != player);
				const sha = new lib.element.VCard({ name: "sha", isCard: true });
				const playerEffect = player.hasUseTarget(sha, false)
					? Math.max(
							...game
								.filterPlayer(current => player.canUse(sha, current, false))
								.map(current => {
									return get.effect(current, sha, player, player);
								})
						)
					: 0;
				const targetEffect = target.hasUseTarget(sha, false)
					? Math.max(
							...game
								.filterPlayer(current => target.canUse(sha, current, false))
								.map(current => {
									return get.effect(current, sha, player, player);
								})
						)
					: 0;
				return 5 + 2 * get.sgn(playerEffect - targetEffect) - get.value(card);
			});
			next._args.remove("glow_result");
			const result = await next.forResult();
			await targets[0].swapHandcards(targets[1], result[0].cards, result[1].cards);
			if (result[0].cards.length == result[1].cards.length) {
				await player.draw(2);
				player.getStat("skill").xvzhi--;
			} else {
				const aim = targets[result[0].cards.length > result[1].cards.length ? 0 : 1];
				const sha = new lib.element.VCard({ name: "sha", isCard: true });
				if (aim.hasUseTarget(sha, false)) {
					await aim.chooseUseTarget(sha, true, false, "nodistance");
				}
			}
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					return get.sgn(get.attitude(player, target)) * target.countCards("h");
				},
			},
		},
	}
```

## yj_simafu 名字:司马孚 势力:wei

### beiyu 名字:备预
描述: 出牌阶段限一次，你可将手牌摸至体力上限并将一种花色的所有手牌置于牌堆底。
```js
beiyu: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		manualConfirm: true,
		async content(event, trigger, player) {
			await player.drawTo(player.maxHp);
			if (!player.countCards("h")) {
				return;
			}
			const list = get.addNewRowList(player.getCards("h"), "suit", player);
			const result = await player
				.chooseButton(
					[
						[
							[[`备预：将一种花色的手牌置于牌堆底`], "addNewRow"],
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
					true
				)
				.set("filterButton", button => {
					return button.links.length > 0;
				})
				.set("ai", button => {
					const player = get.player();
					const { links } = button;
					return Math.max(1, 5 - links.length);
				})
				.forResult();
			if (result?.links?.length) {
				const [suit] = result.links,
					cards = player.getCards("h", card => get.suit(card, player) == suit).randomSort();
				if (cards.length) {
					game.log(player, "将", cards, "置于牌堆底");
					await player.lose(cards, ui.cardPile);
				}
			}
		},
		ai: {
			order(item, player) {
				if (player.maxHp - player.countCards("h") >= 2 && player.countCards("h") <= 2) {
					return 10;
				}
				return 1;
			},
			result: { player: 1 },
		},
	}
```

### duchi 名字:督持
描述: 每回合限一次，当你成为其他角色使用牌的目标后，你可从牌堆底摸一张牌并展示所有手牌，若颜色均相同，则此牌对你无效。
```js
duchi: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.player != player;
		},
		usable: 1,
		logTarget: "player",
		check(event, player) {
			return get.effect(player, event.card, event.player, player) <= 0;
		},
		async content(event, trigger, player) {
			await player.draw().set("bottom", true);
			if (player.countCards("h")) {
				await player.showHandcards(get.translation(player) + "发动了【督持】");
				const colors = player.getCards("h").reduce((list, card) => list.add(get.color(card)), []);
				if (colors.length == 1) {
					player.popup("洗具");
					trigger.getParent().excluded.add(player);
					return;
				}
			}
			player.popup("杯具");
		},
		ai: { threaten: 0.8 },
	}
```

## yj_xuangongzhu 名字:宣公主 势力:wei

### yjqimei 名字:齐眉
描述: 出牌阶段限一次，你可以选择一名其他角色，你与其各摸两张牌并展示两张手牌，然后你根据你与其展示牌的花色总数执行以下效果：1、你依次使用这些展示的牌中可以使用的牌；2、你与其复原武将牌；3、你与其重铸展示牌；4、你与其各摸一张牌。
```js
yjqimei: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			const { target } = event;
			await player.draw(2, "nodelay");
			await target.draw(2);
			const targets = [player, target].filter(current => current.countCards("h") > 1);
			if (targets.length) {
				const next = player.chooseCardOL(targets, "h", true, 2, "齐眉：请展示两张手牌");
				next._args.remove("glow_result");
				const result = await next.forResult();
				const videoId = lib.status.videoId++;
				game.broadcastAll(
					(targets, result, id, player) => {
						const dialog = ui.create.dialog(get.translation(player) + "发动了【齐眉】");
						dialog.videoId = id;
						for (let i = 0; i < result.length; i++) {
							dialog.add('<div class="text center">' + get.translation(targets[i]) + "展示</div>");
							dialog.add(result[i].cards);
						}
					},
					targets,
					result,
					videoId,
					player
				);
				let cards = result.reduce((list, evt) => {
					list.addArray(evt.cards);
					return list;
				}, []);
				await player.showCards(cards).set("dialog", videoId).set("delay_time", 4).set("multipleShow", true);
				const suits = cards.reduce((list, card) => list.add(get.suit(card)), []);
				switch (suits.length) {
					case 1:
						while (cards.length) {
							const card = cards.shift();
							if (player.hasUseTarget(card)) {
								player.$gain2(card, false);
								await game.delayx();
								await player.chooseUseTarget(true, card, false);
							}
						}
						break;
					case 2:
						for (const current of [player, target]) {
							if (!current.isIn()) {
								continue;
							}
							if (current.isLinked()) {
								await current.link(false);
							}
							if (current.isTurnedOver()) {
								await current.turnOver(false);
							}
						}
						break;
					case 3:
						for (let i = 0; i < result.length; i++) {
							const current = targets[i],
								cards = result[i].cards.filter(card => {
									return get.owner(card) === current && current.canRecast(card);
								});
							if (cards.length) {
								await current.recast(cards);
							}
						}
						break;
					case 4:
						await player.draw("nodelay");
						await target.draw();
						break;
				}
			}
		},
		ai: {
			order: 9,
			result: {
				target: 1,
			},
		},
	}
```

### yjzhuiji 名字:追姬
描述: 当你死亡时，你可以令一名角色从牌堆和弃牌堆中的随机使用任意装备牌直至其没有空置的装备栏。若如此做，当其失去以此法使用的装备牌后，其废除对应的装备栏。
```js
yjzhuiji: {
		audio: 2,
		trigger: { player: "die" },
		filter(event, player) {
			return game.hasPlayer(target => {
				return (
					target != player &&
					Array.from({ length: 5 })
						.map((_, i) => i + 1)
						.some(i => target.hasEmptySlot(i))
				);
			});
		},
		forceDie: true,
		skillAnimation: true,
		animationColor: "water",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return (
						target != player &&
						Array.from({ length: 5 })
							.map((_, i) => i + 1)
							.some(i => target.hasEmptySlot(i))
					);
				})
				.set("ai", target => {
					const player = get.event().player;
					return (
						get.sgn(get.attitude(player, target)) *
						Array.from({ length: 5 })
							.map((_, i) => i + 1)
							.reduce((sum, i) => sum + target.countEmptySlot(i), 0)
					);
				})
				.set("forceDie", true)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			let num = 1,
				cards = [];
			while (num <= 5) {
				while (target.hasEmptySlot(num)) {
					const card = get.cardPile2(card => {
						return !cards.includes(card) && get.subtype(card) == "equip" + num && target.canUse(card, target);
					}, "random");
					if (card) {
						cards.push(card);
						target.$gain2(card, false);
						await game.delayx();
						await target.chooseUseTarget(card, true, "nopopup");
					} else {
						break;
					}
				}
				num++;
			}
			if (cards.length) {
				target.addSkill("yjzhuiji_buff");
				target.markAuto("yjzhuiji_buff", cards);
			}
		},
		subSkill: {
			buff: {
				charlotte: true,
				mod: {
					aiValue(player, card, num) {
						if (player.getStorage("yjzhuiji_buff").includes(card)) {
							return num + 100;
						}
					},
					aiUseful(player, card, num) {
						if (player.getStorage("yjzhuiji_buff").includes(card)) {
							return num / 114514;
						}
					},
				},
				trigger: {
					player: "loseAfter",
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				filter(event, player) {
					const evt = event.getl(player);
					return evt && evt.es && evt.es.some(i => player.getStorage("yjzhuiji_buff").includes(i));
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					const evt = trigger.getl(player);
					const cards = evt.es.filter(i => player.getStorage("yjzhuiji_buff").includes(i));
					player.unmarkAuto("yjzhuiji_buff", cards);
					for (const card of cards) {
						player.disableEquip({ slots: [get.subtype(card)] });
					}
				},
				intro: {
					mark(dialog, storage) {
						if (storage && storage.length) {
							dialog.addSmall([storage, "vcard"]);
						} else {
							return "暂无装备";
						}
					},
				},
			},
		},
	}
```

## xukun 名字:徐琨 势力:wu

### fazhu 名字:筏铸
描述: 准备阶段，你可以重铸你的区域内任意张非伤害牌，然后将以此法获得的牌交给至多等量名角色各一张，这些角色可以依次使用一张无距离限制的【杀】。
```js
fazhu: {
		audio: 3,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.hasCard(card => !get.is.damageCard(card) && player.canRecast(card), "hej");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.choosePlayerCard(get.prompt(event.name.slice(0, -5)), player, "hej", [1, Infinity], "allowChooseAll")
				.set("ai", button => {
					const card = button.link;
					if (get.position(card) == "j") {
						return 10;
					}
					return 6 - get.value(card);
				})
				.set("filterButton", button => {
					const card = button.link,
						player = get.player();
					return !get.is.damageCard(card) && player.canRecast(card);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await player.recast(event.cards);
			const cards = player
				.getHistory("gain", evt => evt.getParent(3) == event)
				.reduce((list, evt) => {
					list.addArray(evt.cards);
					return list;
				}, []);
			let num = Math.min(cards.length, game.countPlayer()),
				list = [];
			if (!num) {
				return;
			}
			if (_status.connectMode) {
				game.broadcastAll(() => (_status.noclearcountdown = true));
			}
			while (num - list.length > 0 && cards.some(i => get.owner(i) == player && get.position(i) == "h" && !i.hasGaintag("olsujian_given"))) {
				const result = await player
					.chooseCardTarget({
						prompt: "筏铸：将以此法获得的牌交给任意角色各一张",
						position: "he",
						animate: false,
						filterCard(card, player) {
							if (!get.event().cards.includes(card)) {
								return false;
							}
							return !get.event().list.some(list => list[1] == card);
						},
						filterTarget(card, player, target) {
							return !get.event().list.some(list => list[0] == target);
						},
						ai1(card) {
							if (card.name == "sha") {
								return 2.5;
							}
							return 1 + Math.random();
						},
						ai2(target) {
							return get.attitude(get.event().player, target);
						},
					})
					.set("forced", !list.length)
					.set("list", list)
					.set("cards", cards)
					.forResult();
				if (result.bool) {
					list.push([result.targets[0], result.cards[0]]);
					player.addGaintag(result.cards, "olsujian_given");
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
				const targets = list.slice().map(list => list[0]);
				await game
					.loseAsync({
						gain_list: list,
						player: player,
						cards: list.slice().flatMap(list => list[1]),
						giver: player,
						animate: "giveAuto",
					})
					.setContent("gaincardMultiple");
				for (const target of targets) {
					await target
						.chooseToUse(function (card, player, event) {
							if (get.name(card) != "sha") {
								return false;
							}
							return lib.filter.cardEnabled.apply(this, arguments);
						})
						.set("openskilldialog", "筏铸：是否使用一张【杀】（无距离限制）？")
						.set("norestore", true)
						.set("custom", {
							add: {},
							replace: { window() {} },
						})
						.set("targetRequired", true)
						.set("complexSelect", true)
						.set("filterTarget", function (card, player, target) {
							return lib.filter.targetEnabled.apply(this, arguments);
						})
						.set("addCount", false);
				}
			}
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (!card || get.type(card) != "delay") {
						return;
					}
					if (!get.tag(card, "damage") && target.canRecast(card)) {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

## yj_zhangliao 名字:☆张辽 势力:qun

### weifeng 名字:威风
描述: 锁定技，当你于出牌阶段内使用第一张伤害性基本牌或普通锦囊牌后，你令此牌的一名没有“惧”的其他目标角色获得一枚名称为此牌牌名的“惧”。有“惧”的角色受到伤害时，其移去“惧”，然后若造成伤害的牌名称和“惧”：相同，此伤害+1；不同，你获得该角色的一张牌。准备阶段开始时或你死亡时，你移去场上的所有“惧”。
```js
weifeng: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		forced: true,
		filter(event, player) {
			if (!event.targets?.some(target => target !== player && !target.storage.weifeng2)) {
				return false;
			}
			const evt = event.getParent("phaseUse");
			if (evt?.player !== player) {
				return false;
			}
			if (!get.tag(event.card, "damage")) {
				return false;
			}
			if (!["basic", "trick"].includes(get.type(event.card))) {
				return false;
			}
			return player.getHistory("useCard", ev => ev.getParent("phaseUse") === evt && get.tag(ev.card, "damage") && ["basic", "trick"].includes(get.type(ev.card))).indexOf(event) === 0 && game.hasPlayer(current => current !== player && !current.storage.weifeng2 && event.targets.includes(current));
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget({
					prompt: `威风：请选择一个目标，令其获得一个【惧(${get.translation(trigger.card.name)})】标记`,
					filterTarget(_card, player, target) {
						return player !== target && !target.storage.weifeng2 && _status.event.getTrigger().targets.includes(target);
					},
					forced: true,
					ai(target) {
						return -get.attitude(_status.event.player, target);
					},
				})
				.forResult();
			if (!result.bool || !result.targets?.length) {
				return;
			}
			const target = result.targets[0];
			target.storage.weifeng2 = trigger.card.name;
			player.line(target, "green");
			game.log(target, "获得了一个", `#g【惧(${get.translation(trigger.card.name)})】`, "标记");
			target.markSkill("weifeng2");
			player.addSkill("weifeng3");
		},
	}
```

## yj_zhanghe 名字:☆张郃 势力:qun

### xinzhilve 名字:知略
描述: 出牌阶段限一次，你可以失去1点体力并选择一项：1.移动场上的一张牌；2.视为使用一张无距离限制且不计入次数限制的【杀】并摸一张牌。然后你本回合的手牌上限+1。
```js
xinzhilve: {
		enable: "phaseUse",
		audio: "zhilve",
		usable: 1,
		chooseButton: {
			dialog(event, player) {
				const list = ["移动场上的一张牌", "摸一张牌并视为使用一张【杀】"];
				const choiceList = ui.create.dialog("知略：失去1点体力并...", "forcebutton", "hidden");
				choiceList.add([
					list.map((item, i) => {
						return [i, item];
					}),
					"textbutton",
				]);
				return choiceList;
			},
			filter(button, player) {
				if (button.link == 0) {
					return player.canMoveCard();
				}
				return player.hasUseTarget({ name: "sha", isCard: true }, false);
			},
			check(button) {
				const player = get.player();
				const link = button.link;
				if (link == 0) {
					return player.canMoveCard(true);
				}
				return player.hasValueTarget({ name: "sha", isCard: true }, false);
			},
			backup(links) {
				return lib.skill["xinzhilve_" + ["move", "use"][links[0]]];
			},
			prompt(links, player) {
				return links[0] == 0 ? "点击“确定”以移动场上一张牌" : "请选择【杀】的目标";
			},
		},
		ai: {
			order(item, player) {
				return get.order({ name: "sha" }) + 0.1;
			},
			result: {
				player(player) {
					if (player.hp > 2 && (player.hasValueTarget({ name: "sha", isCard: true }, false) || player.canMoveCard(true))) {
						return 1;
					}
					return 0;
				},
			},
		},
		subSkill: {
			backup: {},
			move: {
				audio: "zhilve",
				filterCard: () => false,
				selectCard: -1,
				delay: false,
				async content(event, trigger, player) {
					await player.loseHp();
					if (player.canMoveCard()) {
						await player.moveCard(true);
					}
					player.addTempSkill("xinzhilve_mark");
					player.addMark("xinzhilve_mark", 1, false);
				},
			},
			use: {
				audio: "zhilve",
				filterCard: () => false,
				selectCard: -1,
				delay: false,
				filterTarget(card, player, target) {
					return player.canUse({ name: "sha", isCard: true }, target, false);
				},
				async content(event, trigger, player) {
					await player.loseHp();
					await player.draw();
					const next = player.useCard({ name: "sha", isCard: true }, false, event.target);
					next.forceDie = true;
					await next;
					player.addTempSkill("xinzhilve_mark");
					player.addMark("xinzhilve_mark", 1, false);
				},
				ai: {
					result: {
						target(player, target) {
							return get.effect(target, { name: "sha" }, player, target);
						},
					},
				},
			},
			mark: {
				markimage: "image/card/handcard.png",
				charlotte: true,
				onremove: true,
				intro: { content: "本回合手牌上限+#" },
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("xinzhilve_mark");
					},
				},
			},
		},
	}
```

## yj_xuhuang 名字:☆徐晃 势力:qun

### xinxhzhiyan 名字:治严
描述: 出牌阶段每项各限一次，若你的手牌数：大于体力值，则你可以将X张手牌交给一名其他角色（X为你的手牌数与体力值之差）；小于体力上限，则你可以摸X张牌且本阶段内不能再对其他角色使用牌。（X为你的手牌数与体力上限之差）
```js
xinxhzhiyan: {
		audio: "xhzhiyan",
		enable: "phaseUse",
		filter(event, player) {
			const list = player.getStorage("xinxhzhiyan_used");
			return (!list.includes("give") && player.countCards("h") > player.hp) || (!list.includes("draw") && player.countCards("h") < player.maxHp);
		},
		filterCard: true,
		selectCard() {
			var player = _status.event.player;
			const list = player.getStorage("xinxhzhiyan_used");
			if (list.includes("give")) {
				return 0;
			}
			var num = Math.max(0, player.countCards("h") - player.hp);
			if (ui.selected.cards.length || !list.includes("draw") || player.countCards("h") >= player.maxHp) {
				return [num, num];
			}
			return [0, num];
		},
		filterTarget: lib.filter.notMe,
		selectTarget() {
			if (ui.selected.cards.length) {
				return [1, 1];
			}
			return [0, 0];
		},
		check(card) {
			var player = _status.event.player;
			var checkx = function (card) {
				if (
					player.getUseValue(card, null, true) <= 0 &&
					game.hasPlayer(function (current) {
						return current != player && get.value(card, current) > 0 && get.attitude(player, current) > 0;
					})
				) {
					return 2;
				}
				return 1;
			};
			if (
				player.countCards("h", function (card) {
					return checkx(card) > 0;
				}) <
				player.countCards("h") - player.hp
			) {
				return 0;
			}
			return checkx(card);
		},
		delay: false,
		discard: false,
		lose: false,
		allowChooseAll: true,
		async content(event, trigger, player) {
			const bool = event.cards?.length > 0;
			player.addTempSkill("xinxhzhiyan_used", "phaseUseEnd");
			if (!bool) {
				player.markAuto("xinxhzhiyan_used", "draw");
				player.addTempSkill("xinxhzhiyan_false", "phaseUseEnd");
				player.draw(player.maxHp - player.countCards("h"));
			} else {
				player.markAuto("xinxhzhiyan_used", "give");
				player.give(event.cards, event.target);
			}
		},
		ai: {
			order(obj, player) {
				if (player.countCards("h") > player.hp) {
					return 10;
				}
				return 0.5;
			},
			result: {
				player(player, target) {
					if (!ui.selected.cards.length && player.countCards("h") < player.maxHp) {
						return 1;
					}
					return 0;
				},
				target: 1,
			},
		},
	}
```

## yj_ganning 名字:☆甘宁 势力:qun

### gnjinfan 名字:锦帆
描述: 弃牌阶段开始时，你可将任意张手牌置于武将牌上，称为“铃”（每种花色的“铃”限一张）。你可以如手牌般使用或打出“铃”。当有“铃”移动到处理区后，你从牌堆中获得与“铃”花色相同的一张牌。
```js
gnjinfan: {
		trigger: { player: "phaseDiscardBegin" },
		locked: false,
		audio: 2,
		filter(event, player) {
			const list = player
				.iterableGetCards("s", card => card.hasGaintag("gnjinfan"))
				.map(card => get.suit(card))
				.toArray();
			if (list.length >= lib.suit.length) {
				return false;
			}
			return _status.connectMode || player.hasCards("h", card => !list.includes(get.suit(card)));
		},
		async cost(event, trigger, player) {
			const max = (() => {
				const list = new Set(player.iterableGetCards("s", card => card.hasGaintag("gnjinfan")).map(card => get.suit(card)));
				const list2 = new Set(player.iterableGetCards("h").map(card => get.suit(card)));
				return Math.max(1, list2.difference(list).size);
			})();
			event.result = await player
				.chooseCard({
					prompt: get.prompt("gnjinfan"),
					prompt2: "将任意张手牌当做“铃”置于武将牌上",
					filterCard(card, player) {
						const suit = get.suit(card, player);
						return !player.countCards("s", cardx => cardx.hasGaintag("gnjinfan") && get.suit(cardx, false) === suit) && !ui.selected.cards.some(cardx => get.suit(cardx, player) === suit);
					},
					selectCard: [1, max],
					position: "h",
					complexCard: true,
					ai(card) {
						const player = _status.event.player;
						if (player.hasUseTarget(card) && !player.hasValueTarget(card)) {
							return 0;
						}
						if (["sha", "shan", "wuxie", "caochuan"].includes(card.name)) {
							return 2 + Math.random();
						}
						return 1 + Math.random();
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			game.log(player, "将", event.cards, "放到了武将牌上");
			const next = player.loseToSpecial(event.cards, "gnjinfan");
			next.visible = true;
			await next;
			player.markSkill("gnjinfan");
		},
		group: ["gnjinfan_gain"],
		marktext: "铃",
		intro: {
			mark(dialog, storage, player) {
				dialog.addAuto(player.getCards("s", card => card.hasGaintag("gnjinfan")));
			},
			markcount(storage, player) {
				return player.getCards("s", card => card.hasGaintag("gnjinfan")).length;
			},
			onunmark(storage, player) {
				const cards = player.getCards("s", card => card.hasGaintag("gnjinfan"));
				if (cards.length) {
					player.lose({
						cards,
						position: ui.discardPile,
					});
					player.$throw(cards, 1000);
					game.log(cards, "进入了弃牌堆");
				}
			},
		},
		mod: {
			aiOrder(player, card, num) {
				if (get.itemtype(card) === "card" && card.hasGaintag("gnjinfan")) {
					return num + 0.5;
				}
			},
		},
		init(player, skill) {
			player.addSkill("gnjinfan_nouse");
		},
		onremove(player, skill) {
			player.removeSkill("gnjinfan_nouse");
		},
		subSkill: {
			nouse: {
				charlotte: true,
				locked: true,
				mod: {
					cardEnabled2(card, player) {
						if (get.itemtype(card) !== "card" || !card.hasGaintag("gnjinfan")) {
							return;
						}
						if (!player.hasSkill("gnjinfan")) {
							return false;
						}
					},
				},
			},
		},
	}
```

### gnsheque 名字:射却
描述: 一名其他角色的准备阶段开始时，若其装备区内有牌，则你可以对其使用一张【杀】（无距离关系的限制且无视防具）。
```js
gnsheque: {
		audio: 2,
		trigger: { global: "phaseZhunbeiBegin" },
		direct: true,
		filter(event, player) {
			return event.player.isIn() && event.player.countCards("e") > 0 && lib.filter.targetEnabled({ name: "sha" }, player, event.player) && (player.hasSha() || (_status.connectMode && player.countCards("h") > 0));
		},
		clearTime: true,
		async content(event, trigger, player) {
			await player
				.chooseToUse({
					prompt: "射却：是否对" + get.translation(trigger.player) + "使用一张杀？",
					filterCard(card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.call(this, card, player, event);
					},
					filterTarget(card, player, target) {
						if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
							return false;
						}
						return lib.filter.targetEnabled.call(this, card, player, target) ?? false;
					},
				})
				.set("logSkill", "gnsheque")
				.set("complexSelect", true)
				.set("sourcex", trigger.player)
				.set("oncard", card => {
					try {
						card.gnsheque_tag = true;
					} catch (e) {
						alert("发生了一个导致【射却】无法正常触发无视防具效果的错误。请关闭十周年UI/手杀ui等扩展以解决");
					}
				});
		},
		ai: {
			unequip: true,
			unequip_ai: true,
			skillTagFilter(player, tag, arg) {
				if (tag == "unequip_ai") {
					if (_status.event.getParent().name != "gnsheque") {
						return false;
					}
				} else if (!arg || !arg.card || !arg.card.gnsheque_tag) {
					return false;
				}
			},
		},
	}
```

## yj_huangzhong 名字:☆黄忠 势力:qun

### spshidi 名字:势敌
描述: 转换技，锁定技。①准备阶段/结束阶段开始时，若你发动此分支的累计次数为奇数/偶数，则你获得一个“☯”。②若你的“☯”数为偶数，则你至其他角色的距离-1，且你使用的黑色【杀】不可被响应。③若你的“☯”数为奇数，则其他角色至你的距离+1，且你不可响应红色【杀】。
```js
spshidi: {
		audio: 2,
		trigger: { player: ["phaseZhunbeiBegin", "phaseJieshuBegin"] },
		zhuanhuanji: "number",
		filter(event, player) {
			return player.countMark("spshidi") % 2 == ["phaseJieshu", "phaseZhunbei"].indexOf(event.name);
		},
		logAudio(event, player) {
			return "spshidi" + (2 - (player.countMark("spshidi") % 2)) + ".mp3";
		},
		forced: true,
		async content(event, trigger, player) {
			player.changeZhuanhuanji("spshidi");
		},
		mod: {
			globalFrom(from, to, distance) {
				if (from.countMark("spshidi") % 2 == 0) {
					return distance - 1;
				}
			},
			globalTo(from, to, distance) {
				if (to.countMark("spshidi") % 2 == 1) {
					return distance + 1;
				}
			},
			aiOrder(player, card, num) {
				if (player.countMark("spshidi") % 2 == 0 && card.name == "sha" && get.color(card) == "black") {
					return num + 0.1;
				}
			},
		},
		mark: true,
		marktext: "☯",
		intro: {
			content(storage, player) {
				return "已转换过" + (storage || 0) + "次";
			},
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (!arg || !arg.card || !arg.target || arg.card.name != "sha") {
					return false;
				}
				return player.countMark("spshidi") % 2 == 0 && get.color(arg.card) == "black";
			},
		},
		group: ["spshidi_use", "spshidi_beused"],
		subSkill: {
			use: {
				audio: "spshidi1.mp3",
				trigger: { player: "useCard" },
				forced: true,
				filter(event, player) {
					return event.card.name == "sha" && player.countMark("spshidi") % 2 == 0 && get.color(event.card, false) == "black";
				},
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.players);
				},
			},
			beused: {
				audio: "spshidi2.mp3",
				trigger: { target: "useCardToTargeted" },
				forced: true,
				filter(event, player) {
					return event.card.name == "sha" && player.countMark("spshidi") % 2 == 1 && get.color(event.card, false) == "red";
				},
				async content(event, trigger, player) {
					trigger.directHit.add(player);
				},
			},
		},
	}
```

### spyishi 名字:义释
描述: 当你对装备区有牌的其他角色造成伤害时，你可令此伤害-1，然后获得其装备区内的一张牌。
```js
spyishi: {
		audio: 2,
		trigger: { source: "damageBegin2" },
		filter(event, player) {
			return player != event.player && event.player.countCards("e") > 0;
		},
		check(event, player) {
			return (
				get.damageEffect(event.player, player, player) <= 0 ||
				(get.attitude(player, event.player) <= 0 &&
					!event.player.hasSkillTag("noe") &&
					event.player.hasCard(function (card) {
						return get.value(card) > 9 - event.player.hp;
					}, "e"))
			);
		},
		logTarget: "player",
		async content(event, trigger, player) {
			trigger.num--;
			await player.gainPlayerCard({
				target: trigger.player,
				position: "e",
				forced: true,
			});
		},
	}
```

### spqishe 名字:骑射
描述: 你可以将一张装备牌当做【酒】使用。你的手牌上限+X（X为你装备区内的牌数）。
```js
spqishe: {
		audio: 2,
		enable: "chooseToUse",
		viewAs: { name: "jiu" },
		filterCard: { type: "equip" },
		position: "hes",
		viewAsFilter(player) {
			return player.hasCard({ type: "equip" }, "ehs");
		},
		check(card) {
			if (_status.event.type == "dying") {
				return 1 / (get.value(card) || 0.5);
			}
			return 5 - get.value(card);
		},
		locked: false,
		mod: {
			maxHandcard(player, num) {
				return num + player.countCards("e");
			},
		},
	}
```

## yj_weiyan 名字:☆魏延 势力:qun

### mbguli 名字:孤厉
描述: 出牌阶段限一次。你可以将所有手牌当做一张无视防具且无次数限制的【杀】使用。此牌结算结束后，你可以将手牌摸至X张（X为你的体力上限），然后若此牌未造成过伤害，你失去1点体力。
```js
mbguli: {
		audio: 2,
		enable: "phaseUse",
		filterCard: true,
		selectCard: -1,
		position: "h",
		usable: 1,
		filter(event, player) {
			var hs = player.getCards("h");
			if (!hs.length) {
				return false;
			}
			for (var card of hs) {
				var mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
				if (mod2 === false) {
					return false;
				}
			}
			return event.filterCard(get.autoViewAs({ name: "sha" }, hs));
		},
		viewAs: {
			name: "sha",
			storage: { mbguli: true },
		},
		onuse(links, player) {
			player.addTempSkill("mbguli_effect", "phaseUseAfter");
		},
		locked: false,
		mod: {
			cardUsable(card, player) {
				if (card?.storage?.mbguli) {
					return Infinity;
				}
			},
		},
		ai: {
			order(item, player) {
				player ??= get.player();
				if (player?.countCards("h") == 1) {
					return 114514;
				}
				return 1;
			},
			threaten: 1.14514,
			unequip_ai: true,
			skillTagFilter(player, tag, arg) {
				if (arg && arg.name == "sha" && arg.card && arg.card.storage && arg.card.storage.mbguli) {
					return true;
				}
				return false;
			},
		},
		subSkill: {
			effect: {
				audio: "mbguli",
				trigger: { global: "useCardAfter" },
				charlotte: true,
				prompt2: "将手牌摸至体力上限，然后若此牌未造成过伤害，你失去1点体力",
				check(event, player) {
					const bool = game.hasPlayer2(current => {
						return current.hasHistory("damage", evt => evt.card == event.card);
					}, true)
					if (bool) {
						return true;
					}
					const num = player.maxHp - player.countCards("h");
					return (num >= 3 && player.hp >= 2) || (num >= 2 && player.hp >= 3);
				},
				filter(event, player) {
					return event.card.storage?.mbguli;
				},
				async content(event, trigger, player) {
					await player.drawTo(player.maxHp);
					if (
						game.hasPlayer2(current => {
							return current.hasHistory("damage", evt => evt.card == trigger.card);
						}, true)
					) {
						return;
					}
					await player.loseHp();
				},
				group: "mbguli_unequip",
			},
			unequip: {
				trigger: {
					player: "useCardToPlayered",
				},
				filter({ card }) {
					return card.name == "sha" && card.storage && card.storage.mbguli;
				},
				forced: true,
				popup: false,
				logTarget: "target",
				async content(event, trigger, player) {
					trigger.target.addTempSkill("qinggang2");
					trigger.target.storage.qinggang2.add(trigger.card);
					trigger.target.markSkill("qinggang2");
				},
			},
		},
	}
```

### mbaosi 名字:骜肆
描述: 锁定技。当你于出牌阶段对一名攻击范围内的角色造成伤害后，你于此阶段对其使用牌无次数限制。你于出牌阶段使用的第X张牌不可被响应（X为游戏轮数）。
```js
mbaosi: {
		audio: 2,
		trigger: { source: "damageSource" },
		forced: true,
		filter(event, player) {
			return player.inRange(event.player) && player.isPhaseUsing() && event.player.isIn() && !player.getStorage("mbaosi_inf").includes(event.player);
		},
		logTarget: "player",
		async content(event, trigger, player) {
			player.addTempSkill("mbaosi_inf", "phaseUseAfter");
			player.markAuto("mbaosi_inf", [trigger.player]);
		},
		group: ["mbaosi_directHit"],
		subSkill: {
			directHit: {
				forced: true,
				trigger: { player: "useCard" },
				filter(event, player) {
					const evt = event.getParent("phaseUse");
					return evt?.player == player && player.getHistory("useCard", evtx => evtx.getParent("phaseUse") == evt).indexOf(event) == game.roundNumber - 1;
				},
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.players);
					game.log(trigger.card, "不可被响应");
				},
			},
			inf: {
				charlotte: true,
				onremove: true,
				forced: true,
				intro: { content: "对$使用牌无次数限制" },
				mod: {
					cardUsableTarget(card, player, target) {
						if (player.getStorage("mbaosi_inf").includes(target)) {
							return true;
						}
					},
				},
			},
		},
	}
```

## yj_zhoubuyi 名字:☆周不疑 势力:wei

### mbhuiyao 名字:慧夭
描述: 出牌阶段限一次。你可以受到1点无来源伤害，然后你选择一名其他角色，令其视为对另一名角色造成过1点伤害。
```js
mbhuiyao: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		// filterTarget:lib.filter.notMe,
		async content(event, trigger, player) {
			await player.damage("nosource");

			const players = game.filterPlayer(current => current !== player);
			if (players.length < 1) {
				return;
			}
			const result =
				players.length === 1
					? { bool: true, targets: [players[0], player] }
					: await player
							.chooseTarget({
								prompt: `慧夭：请选择两名角色`,
								prompt2: `令不为你的第一名角色视为对第二名角色造成过1点伤害。`,
								filterTarget(card, player, target) {
									return ui.selected.targets.length > 0 || player !== target;
								},
								selectTarget: 2,
								forced: true,
								ai(target) {
									return target === get.event().aiTargets[ui.selected.targets.length] ? 10 : 0;
								},
							})
							.set("multitarget", true)
							.set("targetprompt", ["伤害来源", "受伤角色"])
							.set("aiTargets", lib.skill.mbhuiyao.getUnrealDamageTargets(player, [players, [...players, player]], true))
							.forResult();
			if (!result.bool || !result.targets?.length) {
				return;
			}
			const targets = result.targets;
			player.line2(targets, "green");
			await game.delaye();
			await targets[1].damage({
				source: targets[0],
				unreal: true,
			});
		},
		getUnrealDamageTargets(player, lists, forced) {
			const targets = [null, null];
			let sourceList;
			let targetList;
			if (lists.length === 2 && lists.every(l => Array.isArray(l))) {
				sourceList = lists[0];
				targetList = lists[1];
			} else {
				sourceList = lists.slice();
				targetList = lists.slice();
			}
			const list = targetList
				.map(current => {
					const hp = current.hp;
					const maxHp = current.maxHp;
					current.hp = 100;
					current.maxHp = 100;
					const att = -get.sgnAttitude(player, current);
					let val = get.damageEffect(current, player, current) * att;
					current.getSkills(null, false, false).forEach(skill => {
						const info = get.info(skill);
						if (info && info.ai && (info.ai.maixie || info.ai.maixie_hp || info.ai.maixie_defend)) {
							val = Math[val > 0 ? "max" : "min"](val > 0 ? 0.1 : -0.1, val + 2 * att);
						}
					});
					const eff = 100 / val + 15;
					current.hp = hp;
					current.maxHp = maxHp;
					return [current, eff];
				})
				.sort((a, b) => b[1] - a[1])[0];
			if (list[1] < 0 && !forced) {
				return targets;
			}
			const targetx = list[0];
			targets[1] = targetx;
			const list2 = sourceList
				.filter(i => i !== targetx)
				.map(current => {
					const hp = targetx.hp;
					const maxHp = targetx.maxHp;
					targetx.hp = 100;
					targetx.maxHp = 100;
					const att = -get.sgnAttitude(player, current);
					const eff = get.damageEffect(targetx, current, current) * att;
					targetx.hp = hp;
					targetx.maxHp = maxHp;
					return [current, eff];
				})
				.sort((a, b) => b[1] - a[1])[0];
			if (!list2) {
				return targets;
			}
			targets[0] = list2[0];
			return targets;
		},
		ai: {
			order: 6,
			result: {
				player(player) {
					if (player.getHp() + player.countCards("hs", card => player.canSaveCard(card, player)) <= 1) {
						return 0;
					}
					let limit = 25;
					const quesong = player.hasSkill("mbquesong") && !player.getStat().damaged;
					if (quesong) {
						limit -= 7.5;
					}
					if (
						quesong &&
						game.hasPlayer(target => {
							const att = get.attitude(player, target);
							if (att < 0) {
								return false;
							}
							return (
								att *
									Math.sqrt(
										Math.max(
											1,
											[1, 2, 3, 4].reduce((p, c) => p + target.countEmptySlot(c), 0)
										)
									) >=
									10 || target.getHp() <= 2
							);
						})
					) {
						return 1;
					}
					if (
						!quesong &&
						game.hasPlayer(target => {
							if (target === player) {
								return false;
							}
							const hp = target.hp;
							const maxHp = target.maxHp;
							target.hp = 100;
							target.maxHp = 100;
							const att = -get.sgnAttitude(player, target);
							let val = get.damageEffect(target, player, target) * att;
							target.getSkills(null, false, false).forEach(skill => {
								const info = get.info(skill);
								if (info && info.ai && (info.ai.maixie || info.ai.maixie_hp || info.ai.maixie_defend)) {
									val = Math[val > 0 ? "max" : "min"](val > 0 ? 0.1 : -0.1, val + 2 * att);
								}
							});
							const eff = 100 / val;
							target.hp = hp;
							target.maxHp = maxHp;
							if (eff < limit) {
								return false;
							}
							return true;
						})
					) {
						return 1;
					}
					return 0;
				},
			},
			combo: "mbquesong",
			halfneg: true,
		},
	}
```

### mbquesong 名字:雀颂
描述: 一名角色的结束阶段，若你于本回合受到过伤害，你可以令至多三名角色选择一项：1.摸4-X张牌并复原武将牌；2.弃置X-1张牌然后回复1点体力（X为此次选择的角色数）。若你本回合受到过伤害的次数大于X，被选择的角色可以依次执行两项，然后其非锁定技失效直到其下个回合开始。
```js
mbquesong: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return player.hasHistory("damage");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), [1, 3])
				.set("ai", target => {
					const player = get.player();
					if (get.attitude(player, target) <= 0) {
						return 0;
					}
					var len = 4 - (ui.selected.targets.length + 1),
						hp = target.getHp();
					return len + target.isTurnedOver() * 2 + (1.5 * Math.min(4, target.getDamagedHp())) / (hp + 1);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { targets } = event;
			const num = targets.length;
			await game.doAsyncInOrder(targets, async target => {
				const bool = num > 1 ? target.countDiscardableCards(target, "he") >= num - 1 : target.isDamaged();
				const list = [`摸${get.cnNumber(4 - num)}张牌并复原武将牌`];
				if (bool) {
					list.push(`${num > 1 ? `弃置${get.cnNumber(num - 1)}张牌，然后` : ""}回复1点体力`);
					if (player.getHistory("damage").length > num) {
						list.push(`依次执行以上两项，然后非锁定失效直到你下个回合开始`);
					}
				}
				const result =
					list.length == 1
						? { index: 0 }
						: await target
								.chooseControl()
								.set("choiceList", list)
								.set("prompt", "雀颂：请选择一项")
								.set("ai", () => {
									const { num, player } = get.event();
									return get.effect(player, { name: "draw" }, player, player) * (4 - num) >= get.effect(player, { name: "guohe_copy2" }, player, player) + get.recoverEffect(player, player, player) ? 0 : 1;
								})
								.set("num", num)
								.forResult();
				if (typeof result?.index == "number") {
					const { index } = result;
					if (index % 2 == 0) {
						await target.draw(4 - num);
						await target.link(false);
						await target.turnOver(false);
					}
					if (index > 0) {
						if (num > 1) {
							await target.chooseToDiscard(num - 1, "he", true);
						}
						await target.recover();
					}
					if (index == 2) {
						target.addTempSkill("fengyin", { player: "phaseBeforeStart" });
					}
				}
			});
		},
		ai: {
			expose: 0.2,
			maixie: true,
			skillTagFilter(player, tag) {
				if (player.getStat().damaged) {
					return false;
				}
			},
		},
	}
```

## mp_wangrong 名字:王戎 势力:wei

### mpjianlin 名字:俭吝
描述: 每回合结束后，若本回合你有基本牌因使用、打出或弃置而进入弃牌堆，则你可以选择其中一张牌获得之。
```js
mpjianlin: {
		audio: 2,
		trigger: {
			global: "phaseAfter",
		},
		getCards(player) {
			const cards = [];
			game.checkGlobalHistory("cardMove", evt => {
				if (evt.name == "lose") {
					if (evt.position !== ui.discardPile) {
						return false;
					}
				} else if (evt.name !== "cardsDiscard") {
					return false;
				}
				if (get.info("mpjianlin").isUseOrRespond(evt, player)) {
					cards.addArray(
						evt.cards.filter(card => {
							return get.type(card) == "basic" && get.position(card) === "d";
						})
					);
				}
			});
			player.checkHistory("lose", evt => {
				if (evt.type == "discard") {
					cards.addArray(
						evt.cards2.filter(card => {
							return get.type(card) == "basic" && get.position(card) === "d";
						})
					);
				}
			});
			return cards;
		},
		isUseOrRespond(event, player) {
			if (event.name !== "cardsDiscard") {
				return false;
			}
			const evtx = event.getParent();
			if (evtx.name !== "orderingDiscard") {
				return false;
			}
			const evt2 = evtx.relatedEvent || evtx.getParent();
			return ["useCard", "respond"].includes(evt2.name) && evt2.player == player;
		},
		filter(event, player) {
			return get.info("mpjianlin").getCards(player).length;
		},
		async cost(event, trigger, player) {
			const cards = get.info(event.skill).getCards(player);
			const { bool, links } = await player.chooseButton(["俭吝：你可以获得其中一张牌", cards]).set("ai", get.buttonValue).forResult();
			event.result = {
				bool: bool,
				cost_data: links,
			};
		},
		async content(event, trigger, player) {
			player.gain(event.cost_data, "gain2");
		},
	}
```

### mpsixiao 名字:死孝
描述: 锁定技，游戏开始时，你选择一名其他角色。每回合限一次，当该角色需要使用或打出牌时，其可以观看你的手牌并可以使用或打出其中一张牌，然后你摸一张牌。
```js
mpsixiao: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		locked: true,
		filter(event, player) {
			return (event.name != "phase" || game.phaseNumber == 0) && game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(true, lib.filter.notMe, "死孝：请选择一名角色当其孝子", lib.translate.mpsixiao_info)
				.set("ai", target => {
					return get.attitude(get.player(), target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			game.log(player, "成为了", target, "的孝子");
			target.storage.mpsixiao_use = player;
			target.addSkill("mpsixiao_use");
		},
		subSkill: {
			use: {
				charlotte: true,
				mark: "character",
				intro: {
					content: "当你需要使用或打出牌时，你可以观看$的手牌并可以使用或打出其中一张牌，然后$摸一张牌",
				},
				hiddenCard(player, name) {
					if (!lib.inpile.includes(name) || player.hasSkill("mpsixiao_used", null, null, false)) {
						return false;
					}
					const target = player.storage.mpsixiao_use;
					const cards = target.getCards("h");
					for (var i of cards) {
						if (get.name(i, target) == name) {
							return true;
						}
					}
					return false;
				},
				enable: ["chooseToUse", "chooseToRespond"],
				filter(event, player) {
					const target = player.storage.mpsixiao_use;
					const cards = target.getCards("h");
					if (player.hasSkill("mpsixiao_used", null, null, false)) {
						return false;
					}
					return cards.some(i =>
						event.filterCard(
							{
								name: get.name(i, target),
								nature: get.nature(i, target),
								isCard: true,
							},
							player,
							event
						)
					);
				},
				chooseButton: {
					dialog(event, player) {
						const target = player.storage.mpsixiao_use;
						const cards = target.getCards("h");
						return ui.create.dialog("死孝", cards);
					},
					filter(button, player) {
						const evt = _status.event.getParent();
						const target = player.storage.mpsixiao_use;
						return evt.filterCard(
							{
								name: get.name(button.link, target),
								nature: get.nature(button.link, target),
								isCard: true,
							},
							player,
							evt
						);
					},
					check(button) {
						const player = get.player();
						const evt = _status.event.getParent();
						if (evt.dying) {
							return get.attitude(player, evt.dying);
						}
						if (_status.event.getParent().type != "phase") {
							return 1;
						}
						return player.getUseValue(get.autoViewAs(button.link), null, true);
					},
					backup(links, player) {
						const target = player.storage.mpsixiao_use;
						return {
							viewAs: {
								name: get.name(links[0], target),
								nature: get.nature(links[0], target),
								isCard: true,
							},
							card: links[0],
							filterCard: () => false,
							selectCard: -1,
							log: false,
							async precontent(event, trigger, player) {
								const card = lib.skill.mpsixiao_use_backup.card,
									target = player.storage.mpsixiao_use;
								event.result.card = card;
								event.result.cards = [card];
								player.logSkill("mpsixiao_use", target);
								player.addTempSkill("mpsixiao_used");
								target
									.when({ global: ["useCardAfter", "respondAfter"] })
									.filter(evt => evt.player == player && evt.skill == "mpsixiao_use_backup")
									.step(async () => {
										await target.draw();
									});
							},
						};
					},
					ai: {
						respondSha: true,
						respondShan: true,
						skillTagFilter(player, tag) {
							const name = "s" + tag.slice("respondS".length);
							return lib.skill.mpsixiao_use.hiddenCard(player, name);
						},
					},
				},
				ai: {
					order: 8,
					result: {
						player: 1,
					},
				},
			},
			used: {},
		},
	}
```

## mp_liuling 名字:刘伶 势力:jin

### mpjiusong 名字:酒颂
描述: ①你可以将一张锦囊牌当【酒】使用。②当一名角色使用【酒】时，你获得1枚“醉”标记（“醉”数至多为3）。
```js
mpjiusong: {
		audio: 2,
		enable: "chooseToUse",
		trigger: { global: "useCard" },
		filterCard(card) {
			return get.type2(card) == "trick";
		},
		viewAs: { name: "jiu" },
		position: "hs",
		viewAsFilter(player) {
			return player.hasCard(card => get.type2(card) == "trick", "hs");
		},
		check(card) {
			if (get.itemtype(card) !== "card") {
				return true;
			}
			if (get.event().type == "dying") {
				return 1 / Math.max(0.1, get.value(card));
			}
			return 4 - get.value(card);
		},
		prompt: "将一张锦囊牌当【酒】使用",
		filter(event, player) {
			if (event.name == "chooseToUse") {
				return player.hasCard(card => get.type2(card) == "trick", "hs");
			}
			return event.card?.name == "jiu" && player.countMark("mpjiusong") < 3;
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			player.addMark("mpjiusong");
		},
		marktext: "醉",
		intro: {
			name: "醉(酒颂/酕醄)",
			name2: "醉",
			content: "mark",
		},
	}
```

### mpmaotao 名字:酕醄
描述: 当其他角色使用基本牌或普通锦囊牌指定唯一目标时，你可以移去1枚“醉”，令此牌的目标改为随机一名合法角色（无距离限制）。若目标角色与原目标相同且你本回合未以此法获得过牌，你从牌堆中随机获得一张锦囊牌。
```js
mpmaotao: {
		audio: 2,
		trigger: { global: "useCardToPlayer" },
		filter(event, player) {
			if (event.targets.length != 1 || !event.isFirstTarget) {
				return false;
			}
			if (!["basic", "trick"].includes(get.type(event.card))) {
				return false;
			}
			return event.player != player && player.hasMark("mpjiusong");
		},
		prompt2(event, player) {
			const target = event.target;
			const card = event.card;
			const source = event.player;
			let list;
			if (get.type(card) != "delay") {
				list = game.filterPlayer(current => {
					return lib.filter.targetEnabled2(card, source, current);
				});
			} else {
				list = game.filterPlayer(current => lib.filter.judge(card, source, current));
			}
			const gainText = `${list.length > 1 && !player.storage.mpmaotao_gained ? `若新目标与原目标相同，你` : ""}${!player.storage.mpmaotao_gained ? "获得牌堆中的一张锦囊牌。" : ""}`;
			return `移去1枚“醉”${list.length > 1 ? `，令${get.translation(card)}目标改为${get.translation(list)}中的一名随机角色` : ""}。${gainText}`;
		},
		check(event, player) {
			const target = event.target;
			const card = event.card;
			const source = event.player;
			const eff = get.effect(target, card, source, player);
			let list;
			if (get.type(card) != "delay") {
				list = game.filterPlayer(current => {
					return lib.filter.targetEnabled2(card, source, current);
				});
			} else {
				list = game.filterPlayer(current => lib.filter.judge(card, source, current));
			}
			if (list.length == 1 && !player.storage.mpmaotao_gained) {
				return true;
			}
			if (eff > 0) {
				return false;
			}
			let list2 = list.filter(current => get.effect(current, card, source, player) > eff);
			let list3 = list.filter(current => get.effect(current, card, source, player) > 0);
			return list2.length >= list.length / 2 || (player.countMark("mpjiusong") >= 2 && list3.length >= list.length / 2);
		},
		async content(event, trigger, player) {
			player.removeMark("mpjiusong", 1);
			const card = trigger.card;
			const source = trigger.player;
			let target = trigger.target;
			let list,
				oriTarget = trigger.target;
			trigger.targets.remove(oriTarget);
			trigger.getParent().triggeredTargets1.remove(oriTarget);
			trigger.untrigger();
			await game.delayx();
			if (get.type(trigger.card) != "delay") {
				list = game.filterPlayer(current => {
					return lib.filter.targetEnabled2(card, source, current);
				});
			} else {
				list = game.filterPlayer(current => lib.filter.judge(card, source, current));
			}
			if (list.length) {
				target = list.randomGet();
			}
			trigger.targets.push(target);
			source.line(target, "thunder");
			game.log(card, "的目标被改为", target);
			if (target == oriTarget && !player.storage.mpmaotao_gained) {
				const card = get.cardPile2(card => get.type2(card) == "trick");
				if (card) {
					player.addTempSkill("mpmaotao_gained");
					await player.gain(card, "gain2");
				} else {
					player.chat("没牌了！");
					game.log("但是牌堆中已经没有", "#y锦囊牌", "了!");
				}
			}
		},
		ai: { combo: "mpjiusong" },
		subSkill: {
			gained: {
				charlotte: true,
				init(player, skill) {
					player.storage[skill] ??= true;
				},
				onremove: true,
				mark: true,
				intro: { content: "本回合已因【酕醄】获得过锦囊牌" },
			},
		},
	}
```

### mpbishi 名字:避世
描述: 锁定技。你不能成为伤害类锦囊牌的目标。
```js
mpbishi: {
		audio: 2,
		forced: true,
		trigger: { global: "useCard1" },
		filter(event, player) {
			if (get.type2(event.card) != "trick" || !get.tag(event.card, "damage")) {
				return false;
			}
			if (!lib.skill.xunshi.isXunshi(event.card)) {
				return false;
			}
			const targets = event.targets.slice();
			targets.remove(event.player);
			return targets.length == game.countPlayer() - 2;
		},
		async content(event, trigger, player) {},
		mod: {
			targetEnabled(card) {
				if (get.type2(card) == "trick" && get.tag(card, "damage") > 0) {
					return false;
				}
			},
		},
	}
```

## mp_xiangxiu 名字:向秀 势力:jin

### mpmiaoxi 名字:妙析
描述: 出牌阶段限一次，你可以同时展示你和一名其他角色的一张手牌，若这两张牌：颜色相同，获得对方的展示牌；花色相同，令其失去1点体力；点数相同，本回合〖妙析〗发动次数+1，然后此项本回合失效。
```js
mpmiaoxi: {
		audio: 2,
		enable: "phaseUse",
		usable(skill, player) {
			return 1 + (player.hasSkill(skill + "_rewrite", null, null, false) ? 1 : 0);
		},
		filterCard: true,
		position: "h",
		filterTarget(card, player, target) {
			return target.countCards("h") && target != player;
		},
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const target = event.target;
			const carda = event.cards[0];
			const result = await player.choosePlayerCard(target, "h", true).forResult();
			if (result.bool) {
				const cardb = result.cards[0];
				player.$throw(carda);
				target.$throw(cardb);
				game.log(player, "展示了", player, "的", carda, "和", target, "的", cardb);
				await player.showCards([carda, cardb], get.translation(player) + "发动了【妙析】");
				if (get.color(carda) == get.color(cardb)) {
					await player.gain(cardb, "gain2");
				}
				if (get.suit(carda) == get.suit(cardb)) {
					await target.loseHp();
				}
				if (get.number(carda) == get.number(cardb) && !player.hasSkill("mpmiaoxi_rewrite", null, null, false)) {
					player.addTempSkill("mpmiaoxi_rewrite");
				}
			}
		},
		ai: {
			order: 5,
			result: {
				target: -1,
			},
		},
		subSkill: { rewrite: { charlotte: true } },
	}
```

### mpsijiu 名字:思旧
描述: 回合结束时，若你本回合获得过其他角色的牌，你可以摸一张牌并观看一名角色的手牌。
```js
mpsijiu: {
		audio: 2,
		trigger: {
			player: "phaseEnd",
		},
		filter(event, player) {
			return game.hasPlayer(current => {
				if (current == player) {
					return false;
				}
				return (
					current.getHistory("lose", evt => {
						let evtx = evt.getParent();
						if (!evtx.getg) {
							return false;
						}
						var cards = evtx.getg(player);
						if (!cards.length) {
							return false;
						}
						var cards2 = evt.cards2;
						for (var card of cards2) {
							if (cards.includes(card)) {
								return true;
							}
						}
						return false;
					}).length > 0
				);
			});
		},
		frequent: true,
		async content(event, trigger, player) {
			await player.draw();
			const result = await player
				.chooseTarget("是否观看一名角色的手牌？", function (card, player, target) {
					return target != player && target.countCards("h");
				})
				.set("ai", target => {
					return 11 - get.attitude(get.player(), target);
				})
				.forResult();
			if (result.bool) {
				const target = result.targets[0];
				await player.viewHandcards(target);
			}
		},
	}
```

## yj_majun 名字:马钧 势力:wei

### gongqiao 名字:工巧
描述: ①出牌阶段限一次。你可以将一张手牌置于你的任意装备栏内（可替换原装备牌）。②若你装备区内的实体牌有：⒈基本牌，当你使用基本牌时，你令此牌的牌面数值+1；⒉锦囊牌，当你于一回合内首次使用一种类型的牌后，你摸一张牌；⒊装备牌，你的手牌上限+3。
```js
gongqiao: {
		createCard(type) {
			if (!_status.postReconnect.gongqiao) {
				_status.postReconnect.gongqiao = [
					function (list) {
						for (const type of list) {
							lib.skill.gongqiao.createCard(type);
						}
					},
					[],
				];
			}
			_status.postReconnect.gongqiao[1].add(type);
			if (!lib.card[`gongqiao_${type}`]) {
				lib.translate[`gongqiao_${type}`] = "工巧";
				const card = {
					derivation: "yj_majun",
					fullskin: true,
					image: "image/card/majun_gongqiao.png",
					type,
					ai: { basic: { equipValue: 2 } },
					originalType: type,
					cardPrompt(card) {
						let str = `原本是一张${get.translation(this.originalType)}牌。`,
							subtypes = get.subtypes(card);
						if (subtypes?.length) {
							str = `${str.slice(0, -1)}，被置入了${subtypes.map(i => `${get.translation(i)}栏`).join("、")}。`;
						}
						return str;
					},
					async onLose(event, trigger, player) {
						// 神秘结算
						event.cards.forEach(card => {
							card.fix();
							ui.discardPile.appendChild(card);
							game.log(card, "被置入了弃牌堆");
						});
						if (event.getParent(2).name == "gain") {
							const remove = event.getParent(2).cards.filter(card => card[card.cardSymbol] == event.card);
							event.getParent(2).cards.removeArray(remove);
						}
					},
				};
				lib.translate[`gongqiao_${type}_info`] = `原本是一张${get.translation(type)}牌。`;
				lib.card[`gongqiao_${type}`] = card;
				game.finishCard(`gongqiao_${type}`);
			}
		},
		video(player, info) {
			for (const type of info[0]) {
				lib.skill.gongqiao.createCard(type);
			}
		},
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		locked: false,
		filter(event, player) {
			if (!player.countCards("h")) {
				return false;
			}
			for (let i = 0; i <= 5; i++) {
				if (player.hasEquipableSlot(i)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("###工巧###你可将一张手牌置于你的任意装备栏内（可替换原装备牌）");
			},
			chooseControl(event, player) {
				const choices = [];
				for (let i = 0; i <= 5; i++) {
					if (player.hasEquipableSlot(i)) {
						choices.push(`equip${i}`);
					}
				}
				choices.push("cancel2");
				return choices;
			},
			check() {
				const player = get.player(),
					num = [5, 3, 4, 1, 2].find(index => player.hasEmptySlot(index));
				if (num) {
					return `equip${num}`;
				}
				return "cancel2";
			},
			backup(result, player) {
				return {
					audio: "gongqiao",
					slot: result.control,
					filterCard: true,
					position: "h",
					discard: false,
					lose: false,
					delay: false,
					prepare: "throw",
					async content(event, trigger, player) {
						const type = get.type2(event.cards[0]);
						const list = [type];
						game.addVideo("skill", player, ["gongqiao", [list]]);
						game.broadcastAll(
							(player, list) => {
								for (const type of list) {
									lib.skill.gongqiao.createCard(type);
								}
							},
							player,
							list
						);
						const card = get.autoViewAs({ name: `gongqiao_${type}` }, event.cards);
						card.subtypes = [lib.skill.gongqiao_backup.slot];
						await player.equip(card);
					},
					ai1(card) {
						const player = get.player();
						if (
							player.hasCard(cardx => {
								return get.type2(cardx, false) === get.type2(card, false);
							}, "e")
						) {
							return 7 - get.value(card);
						}
						return 15 - get.value(card);
					},
					ai2: () => 1,
				};
			},
			prompt(result, player) {
				return `选择一张手牌置入${get.translation(result.control)}栏`;
			},
		},
		mod: {
			maxHandcard(player, num) {
				if (
					player.hasCard(card => {
						return get.type2(card, false) === "equip";
					}, "e")
				) {
					return num + 3;
				}
			},
		},
		ai: {
			order: 10,
			result: {
				player: 1,
			},
		},
		group: ["gongqiao_basic", "gongqiao_trick"],
		subSkill: {
			backup: {},
			basic: {
				trigger: { player: "useCard1" },
				forced: true,
				popup: false,
				filter(event, player) {
					return (
						get.type2(event.card, false) === "basic" &&
						player.hasCard(card => {
							return get.type2(card, false) === "basic";
						}, "e")
					);
				},
				async content(event, trigger, player) {
					trigger.baseDamage++;
					game.log(player, "使用的", trigger.card, "牌面数值+1");
				},
			},
			trick: {
				audio: "gongqiao",
				trigger: { player: "useCardAfter" },
				forced: true,
				filter(event, player) {
					const type = get.type2(event.card, false);
					if (
						player.hasHistory(
							"useCard",
							evt => {
								return evt !== event && get.type2(evt.card, false) === type;
							},
							event
						)
					) {
						return false;
					}
					return player.hasCard(card => {
						return get.type2(card, false) === "trick";
					}, "e");
				},
				async content(event, trigger, player) {
					await player.draw();
				},
			},
		},
	}
```

### jingyi 名字:精益
描述: 锁定技。每回合每个副类别限一次，当有实体牌进入你的装备区后，你摸X张牌，然后弃置两张牌（X为你装备区内实体牌的数量）。
```js
jingyi: {
		audio: 2,
		trigger: { player: "equipAfter" },
		forced: true,
		filter(event, player, name, card) {
			const subtypes = get.subtypes(card);
			return !player.getStorage("jingyi_used").some(i => subtypes.includes(i));
		},
		getIndex(event, player) {
			return event.cards ?? [];
		},
		async content(event, trigger, player) {
			const card = event.indexedData,
				subtypes = get.subtypes(card);
			player.addTempSkill(event.name + "_used");
			if (subtypes?.length) {
				player.markAuto(event.name + "_used", subtypes);
			}
			const num = player.getCards("e").reduce((sum, card) => {
				const num = card.viewAs ? card.cards.length : 1;
				return sum + num;
			}, 0);
			if (num > 0) {
				await player.draw(num);
			}
			if (player.countCards("he") > 0) {
				await player.chooseToDiscard(2, "he", true);
			}
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

## new_yj_dongzhuo 名字:☆董卓 势力:qun

### xiongjin 名字:雄进
描述: 每轮每项各限一次。①出牌阶段开始时，你可以摸X张牌，然后本回合的弃牌阶段开始时，你弃置所有非基本牌。②其他角色的出牌阶段开始时，你可以令其摸X张牌，然后本回合的弃牌阶段开始时，其弃置所有基本牌。（X为你已损失的体力值，至少为1，至多为4）
```js
xiongjin: {
		audio: 2,
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return !player.getStorage("xiongjin_used").includes((event.player === player).toString());
		},
		logTarget: "player",
		prompt2(event, player) {
			const goon = event.player === player;
			return (goon ? "" : "令其") + "摸" + get.cnNumber(Math.min(4, Math.max(1, player.getDamagedHp()))) + "张牌，本回合的弃牌阶段开始时，" + (goon ? "弃置所有非基本牌" : "其弃置所有基本牌");
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const goon = target === player;
			player.addTempSkill("xiongjin_used", "roundStart");
			player.markAuto("xiongjin_used", [goon.toString()]);
			player.addTempSkill("xiongjin_effect");
			player.storage.xiongjin_effect_target ??= [];
			player.storage.xiongjin_effect_target.add(target);
			target.markAuto("xiongjin_effect", [goon ? "nobasic" : "basic"]);
			target.draw(Math.min(4, Math.max(1, player.getDamagedHp())));
			if (target != player) {
				player.addExpose(0.2);
			}
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
			effect: {
				charlotte: true,
				onremove(player, skill) {
					player.storage.xiongjin_effect_target.forEach(target => {
						target.unmarkAuto(skill, target.storage[skill]);
					});
					delete player.storage.xiongjin_effect_target;
				},
				intro: {
					markcount: () => 0,
					content(storage) {
						if (storage.length > 1) {
							return "弃牌阶段开始时，弃置所有牌";
						}
						return "弃牌阶段开始时，弃置所有" + (storage[0] === "basic" ? "基本" : "非基本") + "牌";
					},
				},
				trigger: { global: "phaseDiscardBegin" },
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const targets = player.storage.xiongjin_effect_target;
					if (targets?.length) {
						for (const target of targets.sortBySeat()) {
							const storage = target.getStorage("xiongjin_effect");
							const cards = target.getCards("he", card => {
								if (!lib.filter.cardDiscardable(card, target)) {
									return false;
								}
								const type = get.type(card);
								return (type === "basic" && storage.includes("basic")) || (type !== "basic" && storage.includes("nobasic"));
							});
							if (cards.length) {
								target.discard(cards);
							}
						}
					}
				},
			},
		},
	}
```

### zhenbian 名字:镇边
描述: 锁定技。①你的手牌上限等于体力上限。②有牌非因使用进入弃牌堆后，你记录这些牌的花色，然后若你因此记录了至少四种花色且你的体力上限小于8，则你清除记录，增加1点体力上限并摸一张牌。
```js
zhenbian: {
		audio: 2,
		trigger: { global: ["loseAfter", "cardsDiscardAfter", "loseAsyncAfter"] },
		filter(event, player) {
			if (event.name.indexOf("lose") === 0) {
				if (event.getlx === false || event.position !== ui.discardPile) {
					return false;
				}
			} else if (event.getParent()?.relatedEvent?.name == "useCard") {
				return false;
			}
			return event.cards.length;
		},
		forced: true,
		async content(event, trigger, player) {
			if (trigger.cards.some(card => !player.getStorage("zhenbian").includes(get.suit(card, false)))) {
				player.markAuto(
					"zhenbian",
					trigger.cards.reduce((list, card) => list.add(get.suit(card, false)), [])
				);
				player.storage.zhenbian.sort((a, b) => lib.suit.indexOf(b) - lib.suit.indexOf(a));
				player.addTip("zhenbian", get.translation("zhenbian") + player.getStorage("zhenbian").reduce((str, suit) => str + get.translation(suit), ""));
			}
			if (player.getStorage("zhenbian").length >= 4 && player.maxHp < 8) {
				player.unmarkSkill("zhenbian");
				await player.gainMaxHp();
				await player.draw();
			}
		},
		intro: {
			content: "已记录花色$",
			onunmark(storage, player) {
				delete player.storage.zhenbian;
				player.removeTip("zhenbian");
			},
		},
		mod: { maxHandcardBase: player => player.maxHp },
		onremove: (player, skill) => player.removeTip(skill),
	}
```

### baoxi 名字:暴袭
描述: 每轮每项各限一次，当一次性至少有两张基本牌/非基本牌进入弃牌堆后，你可以减1点体力上限，将一张手牌当作无距离和次数限制的【决斗】/【杀】使用。
```js
baoxi: {
		audio: 2,
		group: ["baoxi_juedou", "baoxi_sha"], //同时机沟槽技能改个翻译方便区分
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
			backup: {
				filterCard: card => get.itemtype(card) === "card",
				filterTarget: lib.filter.targetEnabled,
				check(card) {
					const player = get.player();
					if (player.maxHp <= 1) {
						return 0;
					}
					return player.getUseValue(get.autoViewAs(get.info("baoxi_backup").viewAs, [card]), false) - get.value(card);
				},
				log: false,
				async precontent(event, trigger, player) {
					player.logSkill("baoxi");
					player.loseMaxHp();
					player.addTempSkill("baoxi_used", "roundStart");
					player.markAuto("baoxi_used", [event.result.card.name]);
				},
			},
			juedou: {
				trigger: { global: ["loseAfter", "cardsDiscardAfter", "loseAsyncAfter"] },
				filter(event, player) {
					if (player.getStorage("baoxi_used").includes("juedou")) {
						return false;
					}
					if (event.name.indexOf("lose") === 0 && (event.getlx === false || event.position !== ui.discardPile)) {
						return false;
					}
					return (
						event.cards.filter(card => get.type(card) === "basic").length > 1 &&
						player.hasCard(card => {
							return _status.connectMode || player.hasUseTarget(get.autoViewAs({ name: "juedou" }, [card]), false);
						}, "h")
					);
				},
				direct: true,
				async content(event, trigger, player) {
					game.broadcastAll(() => (lib.skill.baoxi_backup.viewAs = { name: "juedou" }));
					const next = player.chooseToUse();
					next.set("openskilldialog", "暴袭：是否将一张手牌当作【决斗】使用？");
					next.set("norestore", true);
					next.set("_backupevent", "baoxi_backup");
					next.set("custom", {
						add: {},
						replace: { window: function () {} },
					});
					next.backup("baoxi_backup");
					next.set("addCount", false);
				},
			},
			sha: {
				trigger: { global: ["loseAfter", "cardsDiscardAfter", "loseAsyncAfter"] },
				filter(event, player) {
					if (player.getStorage("baoxi_used").includes("sha")) {
						return false;
					}
					if (event.name.indexOf("lose") === 0 && (event.getlx === false || event.position !== ui.discardPile)) {
						return false;
					}
					return (
						event.cards.filter(card => get.type(card) !== "basic").length > 1 &&
						player.hasCard(card => {
							return _status.connectMode || player.hasUseTarget(get.autoViewAs({ name: "sha" }, [card]), false);
						}, "h")
					);
				},
				direct: true,
				async content(event, trigger, player) {
					game.broadcastAll(() => (lib.skill.baoxi_backup.viewAs = { name: "sha" }));
					const next = player.chooseToUse();
					next.set("openskilldialog", "暴袭：是否将一张手牌当作【杀】使用？");
					next.set("norestore", true);
					next.set("_backupevent", "baoxi_backup");
					next.set("custom", {
						add: {},
						replace: { window: function () {} },
					});
					next.backup("baoxi_backup");
					next.set("addCount", false);
				},
			},
		},
	}
```

## fj_peixiu 名字:裴秀 势力:qun

### fjzhitu 名字:制图
描述: 当你使用基本牌或单目标普通锦囊牌指定唯一目标时，你可以令任意名你与其距离等于你与目标角色距离的角色也成为此牌的目标，若目标角色为你，则改为你可以令任意你与其距离为1的角色也成为此牌的目标。
```js
fjzhitu: {
		audio: 2,
		trigger: {
			player: "useCard2",
		},
		filter(event, player) {
			const { card, targets } = event;
			if (!["basic", "trick"].includes(get.type(card)) || lib.skill.xunshi.isXunshi(card)) {
				return false;
			}
			const info = get.info(card);
			if (info.allowMultiple == false) {
				return false;
			}
			if (targets && targets.length == 1) {
				return game.hasPlayer(current => !targets.includes(current) && lib.filter.targetEnabled2(card, player, current) && (get.distance(player, current) == get.distance(player, targets[0]) || (get.distance(player, current) <= 1 && targets.includes(player))));
				//依旧新杀神秘结算：使用牌指定自己为目标时，可以选择与自己距离为1的其他角色为额外目标。
			}
			return false;
		},
		async cost(event, trigger, player) {
			const { card, targets } = trigger;
			const prompt2 = `为${get.translation(card)}增加任意个你与其距离为${!targets.includes(player) ? get.distance(player, targets[0]) : 1}的目标`;
			event.result = await player
				.chooseTarget(
					get.prompt(event.skill),
					(card, player, target) => {
						const { card: cardx, targets } = get.event();
						return !targets.includes(target) && lib.filter.targetEnabled2(cardx, player, target) && (get.distance(player, target) == get.distance(player, targets[0]) || (get.distance(player, target) <= 1 && targets.includes(player)));
					},
					[1, Infinity]
				)
				.set("prompt2", prompt2)
				.set("ai", target => {
					const { card, player } = get.event();
					return get.effect(target, card, player, player);
				})
				.set("card", card)
				.set("targets", targets)
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.targets.addArray(event.targets);
			game.log(event.targets, "也成为了", trigger.card, "的目标");
		},
	}
```

### dcfujue 名字:复爵
描述: 出牌阶段限一次。你可以将你的手牌调整至五张，然后你可以移动场上一张牌。若你于此流程中获得且失去过牌，本回合你计算与其他角色的距离-1且你下次使用的牌不可被响应。
```js
dcfujue: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			//新杀结算
			//return player.countCards("h") !== 5;
			return true;
		},
		manualConfirm: true,
		async content(event, trigger, player) {
			const num = player.countCards("h") - 5;
			if (num > 0) {
				await player.chooseToDiscard({ position: "h", selectCard: num, forced: true, allowChooseAll: true });
			} else if (num < 0) {
				await player.draw({ num: -num });
			}
			if (player.canMoveCard()) {
				await player.moveCard();
			}
			const lose = player.hasHistory("lose", evt => evt.getParent(3) == event);
			const bool1 = lose && player.hasHistory("gain", evt => evt.getParent(2) == event);
			const bool2 = game.getGlobalHistory("everything", evt => evt.name == "equip" && evt.player == player && evt.getParent(2) == event).length && lose;
			if (bool1 || bool2) {
				player.addTempSkill(event.name + "_effect");
				player.addMark(event.name + "_effect", 1, false);
				player.addTempSkill(event.name + "_effect2");
			}
		},
		ai: {
			expose: 0.2,
			order(item, player) {
				if (player.countCards("he") > 4) {
					return 0.5;
				}
				return 9;
			},
			result: {
				player: 1,
			},
		},
		subSkill: {
			effect2: {
				charlotte: true,
				mark: true,
				forced: true,
				trigger: { player: "useCard" },
				intro: { content: "使用下一张牌不可被响应" },
				async content(event, trigger, player) {
					player.removeSkill(event.name);
					trigger.directHit.addArray(game.players);
					game.log(trigger.card, "不可被响应");
				},
			},
			effect: {
				charlotte: true,
				onremove: true,
				intro: {
					content: `本回合计算与其他角色的距离-#`,
				},
				mod: {
					globalFrom(from, to, current) {
						return current - from.countMark("dcfujue_effect");
					},
				},
			},
		},
	}
```

