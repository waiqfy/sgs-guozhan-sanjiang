# old merged reference

## old_pot_dengai 名字:牢势邓艾 势力:wei

### old_pottuntian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### old_potjixi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### old_potzaoxian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## yj_y_xunxu 名字:勘律荀勖 势力:wei

### kanlv 名字:勘律
描述: 当你受到伤害后，你可亮出牌堆顶的四张牌和你的手牌，然后你依次执行以下两项：1.将其中四种花色各一张交给一名其他角色；2.你获得其余牌。
```js
kanlv: {
		audio: 2,
		trigger: {
			player: "damageEnd",
		},
		frequent: true,
		check: () => true,
		async content(event, trigger, player) {
			const top = get.cards(4, true);
			let cards = player.getCards("h").concat(top);
			await game.cardsGotoOrdering(top);
			await player
				.showCards(cards, get.translation(player) + "发动了【勘律】", true)
				.set("clearArena", false)
				.set("noOrdering", true);
			cards = player.getCards("h").concat(top);
			if (game.hasPlayer(target => target != player)) {
				let result;
				if (!cards.map(card => get.suit(card)).containsAll(...lib.suit.slice())) {
					result = { bool: false };
				} else {
					const fake = game.createFakeCards(top);
					player.directgains(fake, null, event.name + "_tag");
					result = await player
						.chooseCardTarget({
							prompt: "勘律：请将四种花色的牌各一张交给一名其他角色",
							filterCard(card) {
								if (get.position(card) == "s" && !card.hasGaintag("kanlv_tag")) {
									return false;
								}
								const suit = get.suit(card);
								return lib.suit.includes(suit) && !ui.selected.cards.some(cardx => get.suit(cardx) == suit);
							},
							position: "hs",
							selectCard: 4,
							complexCard: true,
							forced: true,
							filterTarget: lib.filter.notMe,
							ai1(card) {
								return 1 / Math.max(0.1, get.value(card));
							},
							ai2(target) {
								const player = get.player();
								let att = get.attitude(player, target);
								if (target.hasSkillTag("nogain")) {
									att /= 9;
								}
								return 4 + att;
							},
						})
						.set("fake", fake)
						.set("top", top)
						.set("custom", {
							replace: {
								window() {},
							},
							add: {
								confirm(bool) {
									const event = get.event();
									const { fake, top } = event;
									if (bool === true) {
										const { cards } = event.result;
										for (let i = 0; i < cards?.length; i++) {
											const card = cards[i];
											if (fake.includes(card)) {
												const rcard = top.find(i => i.cardid == card._cardid);
												if (rcard) {
													event.result.cards[i] = rcard;
												} else {
													event.result.cards?.splice(i, 1);
													i = Math.max(0, i - 1);
												}
											}
										}
									}
									/*if (typeof bool == "boolean") {
											game.deleteFakeCards(fake);
										}*/
								},
							},
						})
						.forResult();
					game.deleteFakeCards(fake);
				}
				if (result.bool && result?.cards?.length && result.targets?.length) {
					const {
						targets: [target],
						cards,
					} = result;
					player.line(target);
					const noowner = cards.filter(card => top.includes(card));
					const owner = cards.slice().removeArray(noowner);
					if (noowner.length) {
						target.$gain2(noowner, true);
					}
					if (owner.length) {
						player.$give(owner, target);
					}
					await target.gain({ cards }).set("giver", player).set("visible", true);
				}
			}
			game.broadcastAll(() => ui.clear());
			await player.gain({ cards: top.filterInD(), animate: "gain2" });
		},
		subSkill: {
			tag: {
				name: "牌堆顶",
			},
		},
	}
```

### yjshenwei 名字:慎微
描述: 当你使用牌后，本回合不能再使用该花色的牌，若此牌指定了其他角色为目标，你受到1点伤害；当你需要使用【桃】时，若此时你没有可使用的牌，你可弃置一种花色的手牌视为使用之，若有角色因此脱离濒死，此技能本轮失效。
```js
yjshenwei: {
		audio: 2,
		onChooseToUse(event) {
			const { player } = event;
			if (game.me == player && !event.yjshenwei_custom) {
				event.custom ??= {
					replace: {},
					add: {},
				};
				const addCard = event.custom.add.card;
				event.custom.add.card = function (...args) {
					const event = get.event();
					if (event.skill == "yjshenwei") {
						const selected = ui.selected.cards;
						if (!event.yjshenwei_selected?.length) {
							event.yjshenwei_selected ??= [];
							const card = selected[0];
							if (card) {
								const { player } = event;
								const suit = get.suit(card);
								const cards = player.getDiscardableCards(player, "h", cardx => cardx != card && get.suit(cardx) == suit);
								ui.selected.cards.addArray(cards);
								event.yjshenwei_selected = ui.selected.cards.slice();
								cards.forEach(card => {
									card.classList.add("selected");
									card.updateTransform(true);
								});
							}
						} else if (!event.yjshenwei_selected.every((card, index) => selected[index])) {
							ui.selected.cards = [];
							event.yjshenwei_selected = [];
							selected.forEach(card => {
								card.classList.remove("selected");
								card.updateTransform(false);
							});
						}
					}
					if (typeof addCard == "function") {
						addCard.apply(this, ...args);
					}
				};
				event.set("yjshenwei_custom", true);
			}
		},
		enable: "chooseToUse",
		viewAsFilter(player) {
			return !player.hasCard(card => player.hasUseTarget(card, void 0, true) || (get.info(card).notarget && lib.filter.cardEnabled(card, player)), "hs");
		},
		filterCard(card, player) {
			if (ui.selected.cards?.length) {
				const suit = get.suit(ui.selected.cards[0]);
				if (get.suit(card) != suit) {
					return false;
				}
			}
			return lib.filter.cardDiscardable(card, player, "yjshenwei");
		},
		selectCard: [1, Infinity],
		viewAs: {
			name: "tao",
			storage: {
				yjshenwei: true,
			},
			suit: "none",
			number: void 0,
			color: "none",
		},
		check(card) {
			return 6 - get.value(card);
		},
		ignoreMod: true,
		log: false,
		async precontent(event, trigger, player) {
			player.logSkill("yjshenwei");
			const cards = event.result.cards?.slice(0);
			event.result.cards = [];
			await player.modedDiscard({ cards });
			player.addTempSkill("yjshenwei_tempBan");
		},
		group: ["yjshenwei_useCard"],
		subSkill: {
			useCard: {
				audio: "yjshenwei",
				forced: true,
				locked: false,
				trigger: {
					player: "useCardAfter",
				},
				filter(event, player) {
					const suit = get.suit(event.card);
					return lib.suit.includes(suit) && (event.targets?.some(target => target != player) || !player.getStorage("yjshenwei_useCard").includes(suit));
				},
				async content(event, trigger, player) {
					player.addTempSkill("yjshenwei_debuff");
					player.markAuto("yjshenwei_debuff", get.suit(trigger.card));
					if (trigger.targets?.some(target => target != player)) {
						await player.damage();
					}
				},
			},
			tempBan: {
				charlotte: true,
				forced: true,
				popup: false,
				trigger: {
					global: ["recoverBegin", "recoverAfter"],
				},
				filter(event, player, name) {
					if (name == "recoverAfter") {
						if (event.player.isDying()) {
							return false;
						}
						return event.yjshenwei_tempBan;
					} else {
						if (!event.card?.storage?.yjshenwei) {
							return false;
						}
						if (!event.player.isDying()) {
							return false;
						}
						return true;
					}
				},
				async content(event, trigger, player) {
					if (event.triggername == "recoverBegin") {
						trigger.set(event.name, true);
					} else {
						player.tempBanSkill("yjshenwei", "roundStart");
					}
				},
			},
			debuff: {
				charlotte: true,
				onremove: true,
				intro: {
					content: "不能使用$牌",
				},
				mod: {
					cardEnabled(card, player) {
						if (player.getStorage("yjshenwei_debuff").includes(get.suit(card))) {
							return false;
						}
					},
					cardSavable(card, player) {
						if (player.getStorage("yjshenwei_debuff").includes(get.suit(card))) {
							return false;
						}
					},
				},
			},
		},
	}
```

## cy_lingju 名字:仇渊灵雎 势力:qun

### jiechou 名字:竭雠
描述: 每回合限一次，有角色失去手牌中最后一张伤害牌后，你可选择一项：①对其造成1点伤害&nbsp②摸一张牌，然后交给其一张牌。
```js
jiechou: {
		audio: 4,
		logAudio(event, player, triggername, _, costResult) {
			if (costResult.cost_data?.index == 0) {
				return 2;
			}
			return ["jiechou3.mp3", "jiechou4.mp3"];
		},
		usable: 1,
		trigger: {
			global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		locked: false,
		mod: {
			aiOrder: (player, card, order) => {
				if (get.name(card) == "sha" && get.info("jiechou").clearMind(player)) {
					order += 9;
				}
				return order;
			},
		},
		clearMind(player) {
			if (!player.hasSkill("ciju") || !player.hasSkill("chouyuan")) return false;
			return player.countCards("h", card => get.is.damageCard(card)) == player.countCards("h", { name: "sha" }) && player.countCards("h") > 2;
		},
		getIndex(event, player) {
			return game
				.filterPlayer(current => {
					if (current.countCards("h", card => get.is.damageCard(card))) {
						return false;
					}
					const evt = event.getl?.(current);
					return evt?.hs?.some(card => get.is.damageCard(card));
				})
				.sortBySeat(_status.currentPhase);
		},
		filter: (event, player, name, target) => target?.isIn(),
		logTarget: (event, player, name, target) => target,
		check: (event, player, name, target) =>
			get.attitude(player, target) < 0 ||
			player.hasCards("he", card => {
				return get.value(card, target) * get.sgnAttitude(player, target) > 4;
			}),
		async cost(event, trigger, player) {
			const target = event.indexedData;
			const choiceList = [`对${get.translation(target)}造成1点伤害`, `摸一张牌，然后交给${get.translation(target)}一张牌`];
			const controls = ["选项一", "选项二", "cancel2"];
			const result = await player
				.chooseControl({
					controls: [...controls],
					choiceList,
					choice: (() => {
						const bool1 = get.damageEffect(target, player, player) > 3;
						const bool2 = player.hasCards("h", card => get.name(card) == "du") && get.attitude(player, target) < 0;
						if (bool2) {
							return 1;
						}
						if (bool1) {
							return 0;
						}
						if (target == player && player.hp > 1 && get.info("chouyuan").countIdentity().length > 1 && player.hasSkill("ciju") && player.hasSkill("chouyuan") && Array.from(ui.discardPile.childNodes).filter(card => card.name == "sha") >= get.info("chouyuan").countIdentity().length) return 0;
						return 1;
					})(),
					prompt: get.prompt(event.skill),
				})
				.forResult();
			event.result = {
				bool: result?.control != "cancel2",
				cost_data: {
					index: ["选项一", "选项二"].indexOf(result.control),
				},
			};
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const { index } = event.cost_data;
			if (index == 0) {
				await target.damage();
			} else {
				await player.draw({ num: 1 });
				if ((target == player && !player.hasCards("e")) || !player.hasCards("he")) return;
				await player.chooseToGive({
					prompt: `竭雠：交给${get.translation(target)}一张牌`,
					selectCard: 1,
					forced: true,
					position: "he",
					target: target,
					ai(card) {
						return 6 - get.value(card);
					},
				});
			}
		},
	}
```

### ciju 名字:刺踽
描述: 当你受到伤害后，你可令当前回合角色将本回合手牌上限调整为0，然后其使用牌无次数限制直至其使用了不同牌名的牌。
```js
ciju: {
		audio: 2,
		trigger: {
			player: "damageEnd",
		},
		filter(event, player) {
			const current = _status.currentPhase;
			return current?.isIn() && current.getHandcardLimit() > 0;
		},
		check(event, player) {
			const current = _status.currentPhase;
			if (current == player && current.countCards("h", card => card.name == "sha" && current.hasUseTarget(card, true, false)) > 1) return true;
			if (get.attitude(player, current) < 0 && (player.hp > 2 || current.countCards("h") < 4)) return true;
			if (get.attitude(player, current) > 0 && current.mayHaveSha(player, "use", false, 2)) return true;
			if (event.source && event.source == player) return true;
			return false;
		},
		async content(event, trigger, player) {
			_status.currentPhase.addTempSkills(["ciju_handcard", "ciju_use"]);
		},
		subSkill: {
			handcard: {
				charlotte: true,
				mark: true,
				marktext: "踽",
				intro: {
					content: "膝盖中了一箭",
				},
				mod: {
					maxHandcardFinal(player, num) {
						return 0;
					},
				},
			},
			use: {
				charlotte: true,
				mark: true,
				marktext: "刺",
				intro: {
					content: "你被强化了",
				},
				onremove: true,
				mod: {
					cardUsable(card, player, num) {
						return Infinity;
					},
					aiOrder: (player, card, order) => {
						if (get.name(card) == "sha") {
							order += 9;
						}
						return order;
					},
				},
				trigger: {
					player: ["useCard1", "useCardAfter"],
				},
				silent: true,
				filter(event, player, name) {
					if (name == "useCard1") {
						return event.addCount != false;
					}
					return true;
				},
				async content(event, trigger, player) {
					if (trigger.name == "useCard1") {
						trigger.addCount = false;
						const stat = player.getStat().card,
							name = trigger.card.name;
						if (typeof stat[name] === "number") {
							stat[name]--;
						}
					} else {
						if (player.storage[event.name] && player.storage[event.name] != trigger.card.name) {
							player.removeSkill(event.name);
						} else {
							player.storage[event.name] = trigger.card.name;
						}
					}
				},
			},
		},
	}
```

### chouyuan 名字:仇渊
描述: 出牌阶段限一次，你可以弃置一名角色至多X张牌（X为正面朝上的身份牌类别数），然后其从弃牌堆中获得等量的【杀】。
```js
chouyuan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target.hasDiscardableCards(player, "he");
		},
		filter(event, player) {
			return get.info("chouyuan").countIdentity().length > 0 && game.hasPlayer(target => target.hasDiscardableCards(player, "he"));
		},
		countIdentity() {
			return game
				.filterPlayer2(current => current.identityShown)
				.reduce((arr, pl) => {
					const index = arr.some(item => item == pl.identity);
					if (!index) {
						arr.push(pl.identity);
					}
					return arr;
				}, []);
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			let num = get.info(event.name).countIdentity().length;
			if (!target.hasDiscardableCards(player, "he")) return;
			const result = await player.discardPlayerCard({ target, position: "he", selectButton: [1, num], forced: true, allowChooseAll: true }).forResult();
			const { cards } = result;
			num = cards?.length ?? 0;
			if (ui["discardPile"].childNodes.length == 0) return;
			const list = [];
			for (let i = 0; i < ui["discardPile"].childNodes.length; i++) {
				const card = ui["discardPile"].childNodes[i];
				if (card.name == "sha") {
					list.push(card);
					if (list.length >= num) {
						break;
					}
				}
			}
			if (list.length) {
				await target.gain({ cards: list, animate: "gain2" });
			}
		},
		ai: {
			order(item, player) {
				player ??= get.player();
				if (player.hasSkill("ciju") && player.hasSkill("jiechou") && get.info("jiechou").clearMind(player)) return get.order({ name: "sha" }, player) - 0.1;
				return get.order({ name: "sha" }, player) + 0.1;
			},
			result: {
				target(player, target) {
					if (player.hasSkill("ciju_use")) return target == player;
					return get.effect(target, { name: "guohe_copy" }, player, player);
				},
			},
		},
	}
```

## two_yj_hanbing 名字:牢寒冰剑少女 势力:qun

### chegu 名字:彻骨
描述: 你于回合内使用非装备牌指定目标时，可以取消此牌的全部目标并选择一项：1.弃置一名角色至多[2]张牌；2.弃置至多[2]名角色各一张牌。然后若以此法弃置的牌颜色或类型均相同，本回合此技能[]中的数值均+1。
```js
chegu: {
		audio: 2,
		onremove(player, skill) {
			player.removeSkill("chegu_effect");
		},
		trigger: {
			player: "useCardToPlayer",
		},
		filter(event, player) {
			if (player !== _status.currentPhase || get.type(event.card) == "equip") {
				return false;
			}
			return event.targets?.length && event.isFirstTarget;
		},
		check(event, player) {
			const getV = current => get.effect(current, { name: "guohe_copy2" }, player, player),
				targets = game.filterPlayer(current => current.countDiscardableCards(player, "he") > 0).sort((a, b) => getV(b) - getV(a));
			const getAllV = (num, numx) => {
				let index = 0,
					eff = 0;
				while (index < num) {
					const target = targets[index];
					if (!target) {
						break;
					}
					index++;
					const count = Math.min(numx, target.countDiscardableCards(player, "he"));
					eff += count * getV(target);
				}
				return eff;
			};
			const list = [1, 2 + player.countMark("chegu_effect")];
			let val = Math.max(getAllV(...list), getAllV(...list.reverse()));
			return (
				event.targets.reduce((val, current) => {
					return val - get.effect(current, event.card, player, player);
				}, val) > 0
			);
		},
		async content(event, trigger, player) {
			const evt = trigger.getParent();
			if (evt) {
				evt.targets.length = 0;
				evt.all_excluded = true;
			}
			const getPrompt = list => {
					const [num, numx] = list;
					return `弃置${num > 1 ? "至多" : ""}${get.cnNumber(num)}名角色${num > 1 ? "各" : ""}${numx > 1 ? "至多" : ""}${get.cnNumber(numx)}张牌`;
				},
				list1 = [1, 2 + player.countMark("chegu_effect")],
				list2 = [2 + player.countMark("chegu_effect"), 1];
			const result = await player
				.chooseButton(
					[
						"彻骨：选择一项",
						[
							[
								[list1, getPrompt(list1)],
								[list2, getPrompt(list2)],
							],
							"textbutton",
						],
					],
					true
				)
				.set("ai", button => {
					const list = button.link,
						player = get.player();
					const getV = current => get.effect(current, { name: "guohe_copy2" }, player, player),
						targets = game.filterPlayer(current => current.countDiscardableCards(player, "he") > 0).sort((a, b) => getV(b) - getV(a));
					const getAllV = (num, numx) => {
						let index = 0,
							eff = 0;
						while (index < num) {
							const target = targets[index];
							if (!target) {
								break;
							}
							index++;
							const count = Math.min(numx, target.countDiscardableCards(player, "he"));
							eff += count * getV(target);
						}
						return eff;
					};
					return getAllV(...list);
				})
				.forResult();
			if (result?.bool && result.links?.length) {
				const [num, numx] = result.links[0],
					targets = game.filterPlayer(current => current.countDiscardableCards(player, "he") > 0);
				if (!targets?.length) {
					return;
				}
				const result2 =
					targets.length === 1
						? {
								bool: true,
								targets: targets,
							}
						: await player
								.chooseTarget("彻骨：选择要弃牌的目标角色", [1, num], true, (card, player, target) => {
									return target.countDiscardableCards(player, "he");
								})
								.set("maxNum", numx)
								.set("ai", target => {
									const { player, maxNum } = get.event();
									return get.effect(target, { name: "guohe_copy2" }, player, player) * Math.min(maxNum, target.countDiscardableCards(player, "he"));
								})
								.forResult();
				if (result2?.bool && result2.targets?.length) {
					const func = async target => {
						const discard = Math.min(numx, target.countDiscardableCards(player, "he"));
						if (discard > 0) {
							await player.discardPlayerCard(target, [1, discard], true, "he");
						}
					};
					player.line(result2.targets, "green");
					await game.doAsyncInOrder(result2.targets, func);
					const colors = [],
						types = [];
					game.getGlobalHistory("everything", evt => {
						if (evt.name != "lose" || evt.type != "discard") {
							return false;
						}
						if (evt.getParent(3) === event && evt.cards?.length) {
							evt.cards.forEach(card => {
								colors.add(get.color(card, false));
								types.add(get.type2(card, false));
							});
						}
					});
					if (colors.length === 1 || types.length === 1) {
						player.addTempSkill("chegu_effect");
						player.addMark("chegu_effect", 1, false);
					}
				}
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				intro: {
					content: "本回合【彻骨】数值+#",
				},
			},
		},
	}
```

### jianrou 名字:剑柔
描述: 每轮限一次，你受到伤害时，可以弃置两张牌并防止此伤害。若你以此法弃置的牌颜色或类型相同，你摸一张牌并令此技能视为未发动过。
```js
jianrou: {
		audio: 2,
		round: 1,
		trigger: {
			player: "damageBegin3",
		},
		filter(event, player) {
			return player.countDiscardableCards(player, "he") >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(get.prompt2(event.skill), 2, "he")
				.set("eff", get.damageEffect(player, trigger.source ?? player, player))
				.set("ai", card => {
					const { player, eff } = get.event();
					if (eff >= 0) {
						return 0;
					}
					if (ui.selected.cards.length) {
						const cardx = ui.selected.cards[0];
						if (get.color(cardx, false) == get.color(card, false) || get.type2(cardx, false) == get.type2(card, false)) {
							return 16 - get.value(card);
						}
						return 4 - get.value(card);
					}
					return 7 - get.value(card);
				})
				.set("chooseonly", true)
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards, name } = event;
			await player.modedDiscard(cards);
			trigger.cancel();
			const check = key => cards.map(card => get[key](card, false)).toUniqued().length === 1;
			if (check("color") || check("type2")) {
				await player.draw();
				const limit = `${name}_roundcount`;
				if (player.storage[limit]) {
					delete player.storage[limit];
					player.unmarkSkill(limit);
					game.log(player, "令", "#g【剑柔】", "视为未发动过");
				}
			}
		},
	}
```

## two_yj_tengjia 名字:牢藤甲男孩 势力:qun

### renjia
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### yj_yanyu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## two_yj_puyuan 名字:牢SP蒲元 势力:shu

### pyhuanling
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### pyshenduan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## x_dc_zhangqiying 名字:新杀牢张琪瑛 势力:qun

### x_dc_falu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### x_dc_zhenyi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### x_dc_dianhua
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## x_yao_yuanshu 名字:牢爻袁术 势力:qun

### yao_yaoyi 名字:爻疑
描述: 锁定技。①你的起始手牌背置。②每回合每种牌名限一次，你可以将一张背置的牌当作任意基本牌或普通锦囊牌使用或打出。
```js
yao_yaoyi: {
		audio: 2,
		init(player, skill) {
			game.broadcastAll(
				(player, skill) => {
					const observer = new MutationObserver(mutationsList => {
						for (const mutation of mutationsList) {
							if (mutation.type === "childList") {
								const cards = player._start_cards ?? [];
								if (player.node.handcards1.cardMod[skill] && !_status.gameDrawed) {
									for (const card of mutation.addedNodes) {
										if (cards.includes(card)) {
											game.broadcastAll(
												(card, player, skill) => {
													card.addGaintag(`${skill}_tag`);
													game.addVideo("addGaintag", player, [[get.cardInfo(card)], `${skill}_tag`]);
													card.classList.add(skill);
													game.addVideo("skill", player, [skill, [true, [get.cardInfo(card)]]]);
												},
												card,
												player,
												skill
											);
										}
									}
								}
								for (const card of mutation.removedNodes) {
									if (cards.includes(card) && !card.hasGaintag(`${skill}_tag`)) {
										game.broadcastAll(
											(card, player, skill) => {
												card.classList.remove(skill);
												game.addVideo("skill", player, [skill, [false, [get.cardInfo(card)]]]);
											},
											card,
											player,
											skill
										);
									}
								}
							}
						}
					});
					const config = { childList: true };
					observer.observe(player.node.handcards1, config);
					observer.observe(player.node.handcards2, config);
					player.node.handcards1.cardMod ??= {};
					player.node.handcards2.cardMod ??= {};
					const cardMod = card => {
						if (card.classList.contains(skill)) {
							return ["爻疑", "此牌对你不可见"];
						}
					};
					player.node.handcards1.cardMod[skill] = cardMod;
					player.node.handcards2.cardMod[skill] = cardMod;
					player.node.handcards1.classList.add(skill);
					player.node.handcards2.classList.add(skill);
					if (_status.gameDrawed) {
						const cards = player._start_cards ?? [];
						player.getCards("h").forEach(card => {
							if (cards.includes(card)) {
								game.broadcastAll(
									(card, player, skill) => {
										card.addGaintag(`${skill}_tag`);
										game.addVideo("addGaintag", player, [[get.cardInfo(card)], `${skill}_tag`]);
										card.classList.add(skill);
										game.addVideo("skill", player, [skill, [true, [get.cardInfo(card)]]]);
									},
									card,
									player,
									skill
								);
							}
						});
					}
					const { card, blank, ...others } = ui.create.buttonPresets;
					ui.create.buttonPresets = {
						...others,
						card(item, ...args) {
							if (item.classList.contains(skill) && args[args.length - 1] !== skill) {
								return blank(item, ...args, skill);
							}
							return card(item, ...args);
						},
						blank(item, ...args) {
							if (item.classList.contains(skill) && args[args.length - 1] !== skill) {
								return card(item, ...args, skill);
							}
							return blank(item, ...args);
						},
					};
				},
				player,
				skill
			);
		},
		onremove(player, skill) {
			player.removeGaintag(`${skill}_tag`);
			game.broadcastAll(
				(player, skill) => {
					player.node.handcards1.classList.remove(skill);
					player.node.handcards2.classList.remove(skill);
					delete player.node.handcards1.cardMod[skill];
					delete player.node.handcards2.cardMod[skill];
					player.getCards("h").forEach(card => {
						if (card.classList.contains(skill)) {
							card.classList.remove(skill);
							game.addVideo("skill", player, [skill, [false, [get.cardInfo(card)]]]);
						}
					});
				},
				player,
				skill
			);
		},
		video(player, info) {
			for (const cardid of info[1]) {
				for (const card of player.getCards("h")) {
					if (card.cardid === cardid[4]) {
						card.classList[info[0] ? "add" : "remove"]("yao_yaoyi");
					}
				}
			}
		},
		enable: "chooseToUse",
		filter(event, player) {
			return get
				.inpileVCardList(info => lib.skill.yao_yaoyi.hiddenCard(player, info[2]))
				.some(info => {
					const card = { name: info[2], nature: info[3] };
					return player.hasCard(cardx => cardx.classList.contains("yao_yaoyi") && event.filterCard({ ...card, cards: [cardx] }, player, event), "h");
				});
		},
		chooseButton: {
			dialog(event, player) {
				const list = get
					.inpileVCardList(info => lib.skill.yao_yaoyi.hiddenCard(player, info[2]))
					.filter(info => {
						const card = { name: info[2], nature: info[3] };
						return player.hasCard(cardx => cardx.classList.contains("yao_yaoyi") && event.filterCard({ ...card, cards: [cardx] }, player, event), "h");
					});
				return ui.create.dialog("爻疑", [list, "vcard"]);
			},
			filter(button, player) {
				const event = get.event().getParent(),
					info = button.link,
					card = { name: info[2], nature: info[3] };
				return player.hasCard(cardx => cardx.classList.contains("yao_yaoyi") && event.filterCard({ ...card, cards: [cardx] }, player, event), "h");
			},
			check(button) {
				const event = get.event().getParent();
				if (event.type !== "phase") {
					return 1;
				}
				return get.player().getUseValue({ name: button.link[2], nature: button.link[3] });
			},
			prompt(links) {
				const event = get.event().getParent();
				return "将一张背置牌当作" + (get.translation(links[0][3]) || "") + "【" + get.translation(links[0][2]) + "】" + (event.name === "chooseToRespond" ? "打出" : "使用");
			},
			backup(links, player) {
				return {
					audio: "yao_yaoyi",
					filterCard(card) {
						return get.itemtype(card) == "card" && card.classList.contains("yao_yaoyi");
					},
					popname: true,
					check(card) {
						return 1 + Math.random();
					},
					position: "hse",
					viewAs: { name: links[0][2], nature: links[0][3] },
					async precontent(event, trigger, player) {
						player.addTempSkill("yao_yaoyi_used");
						player.markAuto("yao_yaoyi_used", [event.result.card?.name]);
					},
				};
			},
		},
		hiddenCard(player, name) {
			if (!lib.inpile.includes(name) || player.getStorage("yao_yaoyi_used").includes(name)) {
				return false;
			}
			return ["basic", "trick"].includes(get.type(name)) && player.hasCard(card => _status.connectMode || card.classList.contains("yao_yaoyi"), "h");
		},
		locked: false,
		mod: {
			cardEnabled(card, player) {
				if (!card || get.is.convertedCard(card)) {
					return;
				}
				if (card?.cards?.some(cardx => cardx.classList.contains("yao_yaoyi"))) {
					return false;
				}
			},
			cardRespondable(card, player) {
				return get.info("yao_yaoyi").mod.cardEnabled.apply(this, arguments);
			},
			cardSavable(card, player) {
				return get.info("yao_yaoyi").mod.cardEnabled.apply(this, arguments);
			},
		},
		ai: {
			respondSha: true,
			respondShan: true,
			skillTagFilter(player) {
				if (!player.hasCard(card => _status.connectMode || card.classList.contains("yao_yaoyi"), "h")) {
					return false;
				}
			},
			order(item, player) {
				if (player && _status.event.type == "phase") {
					const list = get.inpileVCardList(info => lib.skill.yao_yaoyi.hiddenCard(player, info[2]));
					let max = 0;
					list.forEach(info => {
						const card = { name: info[2], nature: info[3] };
						if (player.getUseValue(card) > 0) {
							const temp = get.order(card);
							if (temp > max) {
								max = temp;
							}
						}
					});
					if (max > 0) {
						max += 1;
					}
					return max;
				}
				return 1;
			},
			result: {
				player(player) {
					return get.event().dying ? get.attitude(player, get.event().dying) : 1;
				},
			},
		},
		subSkill: {
			backup: {},
			tag: {},
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

### yao_chenwei 名字:谶纬
描述: 转换技。当你使用背置牌时，你可以，阳：令一名角色将你的一张手牌翻面；阴：获得一名其他角色的一张牌并将此牌背置。
```js
yao_chenwei: {
		audio: 2,
		trigger: { player: "useCard" },
		filter(event, player) {
			if (
				!player.hasHistory("lose", evt => {
					if (evt.getParent() !== event) {
						return false;
					}
					return Object.values(evt.gaintag_map).flat().includes("yao_yaoyi_tag");
				})
			) {
				return false;
			}
			if (!player.storage.yao_chenwei) {
				return player.countCards("h") > 0;
			}
			return game.hasPlayer(target => target !== player && target.countGainableCards(player, "he"));
		},
		async cost(event, trigger, player) {
			const next = player.chooseTarget(get.prompt(event.skill));
			if (player.storage[event.skill]) {
				next.prompt2 = "获得一名其他角色的一张牌并将此牌背置";
				next.filterTarget = function (card, player, target) {
					return target !== player && target.countGainableCards(player, "he");
				};
				next.ai = function (target) {
					const player = get.player();
					return get.effect(target, { name: "shunshou_copy2" }, player, player);
				};
			} else {
				next.prompt2 = "令一名角色将你的一张手牌翻面";
				next.ai = function (target) {
					const player = get.player();
					return 1 + Math.sign(get.attitude(player, target)) + Math.random();
				};
			}
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			const storage = player.storage[event.name],
				target = event.targets[0];
			player.changeZhuanhuanji(event.name);
			if (storage) {
				const result = await player.gainPlayerCard(target, "he", true).forResult();
				if (result?.bool && result.cards?.some(i => get.position(i) === "h" && get.owner(i) === player && !i.classList.contains("yao_yaoyi"))) {
					game.broadcastAll(
						cards => {
							for (const card of cards) {
								card.classList.add("yao_yaoyi");
								card.addGaintag("yao_yaoyi_tag");
							}
						},
						result.cards.filter(i => get.position(i) === "h" && get.owner(i) === player && !i.classList.contains("yao_yaoyi"))
					);
				}
			} else {
				const result = await target
					.choosePlayerCard(player, "h", true)
					.set("prompt2", `将${get.translation(player)}的一张手牌翻面`)
					.forResult();
				if (result?.bool && result.cards?.some(i => get.position(i) === "h" && get.owner(i) === player)) {
					game.broadcastAll(
						cards => {
							for (const card of cards) {
								if (card.hasGaintag("yao_yaoyi_tag")) {
									card.removeGaintag("yao_yaoyi_tag");
									game.addVideo("removeGaintag", player, ["yao_yaoyi_tag", [get.cardInfo(card)]]);
									card.classList.remove("yao_yaoyi");
									game.addVideo("skill", player, ["yao_yaoyi", [false, [get.cardInfo(card)]]]);
								} else {
									card.addGaintag("yao_yaoyi_tag");
									game.addVideo("addGaintag", player, [[get.cardsInfo(card)], "yao_yaoyi_tag"]);
									card.classList.add("yao_yaoyi");
									game.addVideo("skill", player, ["yao_yaoyi", [true, [get.cardInfo(card)]]]);
								}
							}
						},
						result.cards.filter(i => get.position(i) === "h" && get.owner(i) === player)
					);
				}
			}
		},
		zhuanhuanji: true,
		marktext: "☯",
		mark: true,
		intro: {
			content(storage) {
				return `当你使用背置牌时，你可以${["获得一名其他角色的一张牌并将此牌背置", "令一名角色将你的一张手牌翻面"][1 - storage]}`;
			},
		},
		ai: {
			combo: "yao_yaoyi",
		},
	}
```

## fx_baosanniang 名字:芳许鲍三娘 势力:shu

### mbfangxu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### mbzhuguan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### mblisuo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## sy_baosanniang 名字:手杀牢鲍三娘 势力:shu

### meiyong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rexushen
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rezhennan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_baosanniang 名字:牢鲍三娘 势力:shu

### olwuniang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### olxushen
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## junk_sunquan 名字:牢神孙权 势力:shen

### dili
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### yuheng
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## new_simayi 名字:牢神司马懿 势力:shen

### jilin
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### yingyou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### yingtian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## hr_wufu 名字:牢伍孚 势力:qun

### dchuairen
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcchizei
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## xj_peixiu 名字:牢裴秀 势力:qun

### xjzhitu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcxiujue
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## cx_majun 名字:传械马钧 势力:wei

### chuanxie
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### yjqiaosi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## qq_majun 名字:奇巧马钧 势力:wei

### yuliao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### qiqiao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### yanxie
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## one_dc_sp_machao 名字:牢SP马超 势力:qun

### onedcspzhuiji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### onedcspshichou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## two_dc_sp_machao 名字:牢SP马超 势力:qun

### zhuiji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dc_olshichou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_wuyi 名字:旧吴懿 势力:shu

### benxi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_shixie 名字:旧士燮 势力:qun

### biluan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### lixia
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## panfeng 名字:旧潘凤 势力:qun

### kuangfu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_guanyinping 名字:旧关银屏 势力:shu

### xueji_old
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### oldhuxiao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### oldwuji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_caocao 名字:旧神曹操 势力:shen

### junkguixin 名字:归心
描述: 回合结束时，你可以选择一项：①获得剩余武将牌堆的所有主公技的其中一个技能；②更改一名其他角色的势力。
```js
junkguixin: {
		audio: "guixin",
		forbid: ["guozhan"],
		init() {
			if (!_status.junkguixin) {
				_status.junkguixin = [];
				if (!_status.characterlist) {
					game.initCharacterList();
				}
				for (const name of _status.characterlist) {
					_status.junkguixin.addArray(
						get.character(name, 3).filter(skill => {
							const info = get.info(skill);
							return info && info.zhuSkill && (!info.ai || !info.ai.combo);
						})
					);
				}
			}
		},
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			return !_status.junkguixin.some(skill => !player.hasSkill(skill, null, false, false)) || game.hasPlayer(current => current != player);
		},
		direct: true,
		async content(event, trigger, player) {
			const controls = ["获得技能", "修改势力"];
			if (!_status.junkguixin.some(skill => !player.hasSkill(skill, null, false, false))) {
				controls.shift();
			}
			if (!game.hasPlayer(current => current != player)) {
				controls.shift();
			}
			if (!controls.length) {
				return;
			}
			controls.push("cancel2");
			const result = await player
				.chooseControl({
					controls,
					prompt: get.prompt2(event.name),
					ai() {
						return _status.event.controls.length === 3 ? "获得技能" : "cancel2";
					},
				})
				.forResult();
			if (result?.control === "cancel2") {
				return;
			}
			const control = result.control;
			if (control === "获得技能") {
				const skills = _status.junkguixin.filter(skill => !player.hasSkill(skill, null, false, false));
				if (skills.length) {
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
					const result = await player
						.chooseButton({
							createDialog: ["归心：选择获得一个主公技", [list, "textbutton"]],
							forced: true,
							ai() {
								return 1 + Math.random();
							},
						})
						.forResult();
					if (result?.bool) {
						player.logSkill(event.name);
						await player.addSkill(result.links);
					}
				}
			} else if (control === "修改势力" && game.hasPlayer(current => current != player)) {
				const result = await player
					.chooseTarget({
						prompt: "请选择【归心】的目标",
						prompt2: "更改一名其他角色的势力",
						filterTarget: lib.filter.notMe,
						forced: true,
						ai() {
							return 1 + Math.random();
						},
					})
					.forResult();
				if (result?.bool) {
					const target = result.targets[0];
					player.logSkill(event.name, target);
					const groups = lib.group.filter(group => group !== "shen" && group !== target.group);
					if (groups.length) {
						const result = await player
							.chooseControl({
								prompt: `请选择${get.translation(target)}要变更的势力`,
								controls: groups,
								ai() {
									return get.event().controls.randomGet();
								},
							})
							.forResult();
						if (result?.control) {
							player.popup(get.translation(result.control + "2"));
							await target.changeGroup(result.control);
						}
					}
				}
			}
		},
	}
```

### feiying
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_chendao 名字:旧陈到 势力:shu

### drlt_wanglie
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_liyan 名字:旧李严 势力:shu

### duliang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### fulin
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_guanzhang 名字:old_guanzhang 势力:shu

### old_fuhun
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## new_caoren 名字:旧曹仁 势力:wei

### moon_jushou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### jiewei
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## huangzhong 名字:huangzhong 势力:shu

### liegong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_dingfeng 名字:旧丁奉 势力:wu

### fenxun
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### duanbing
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_huanghao 名字:旧黄皓 势力:shu

### oldqinqing 名字:寝情
描述: 结束阶段，你可以选择一名攻击范围内含有主公的其他角色，然后你弃置该角色的一张牌（无牌则不弃），并令其摸一张牌。若该角色的手牌数大于主公，你摸一张牌。
```js
oldqinqing: {
		audio: "qinqing",
		mode: ["identity", "versus"],
		available(mode) {
			if (mode == "versus" && _status.mode != "four") {
				return false;
			}
			if (mode == "identity" && _status.mode == "purple") {
				return false;
			}
			return true;
		},
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			var zhu = get.zhu(player);
			if (!zhu || !zhu.isZhu) {
				return false;
			}
			return game.hasPlayer(function (current) {
				return current != zhu && current != player && current.inRange(zhu);
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("dcqinqing"),
					filterTarget(card, player, target) {
						const zhu = get.zhu(player);
						return target !== player && target.inRange(zhu);
					},
					ai(target) {
						const zhu = get.zhu(player);
						const he = target.countCards("he");
						if (get.attitude(_status.event.player, target) > 0) {
							if (target.countCards("h") > zhu.countCards("h") + 1) {
								return 0.1;
							}
						} else {
							if (he > zhu.countCards("h") + 1) {
								return 2;
							}
							if (he > 0) {
								return 1;
							}
						}
						return 0;
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];

			if (target.countDiscardableCards(player, "he")) {
				await player.discardPlayerCard({
					target,
					position: "he",
					forced: true,
				});
			}
			await target.draw();

			const zhu = get.zhu(player);
			if (zhu && zhu.isIn()) {
				if (target.countCards("h") > zhu.countCards("h")) {
					await player.draw();
				}
			}
		},
	}
```

### oldhuisheng 名字:贿生
描述: 每名角色限一次。当你受到其他角色对你造成的伤害时，你可以令其观看你任意数量的牌并令其选择一项：1.获得这些牌中的一张并防止此伤害；2.弃置等量的牌。
```js
oldhuisheng: {
		audio: "huisheng",
		trigger: { player: "damageBegin4" },
		direct: true,
		filter(event, player) {
			if (!player.countCards("he")) {
				return false;
			}
			if (!event.source || event.source == player || !event.source.isIn()) {
				return false;
			}
			if (player.storage.oldhuisheng && player.storage.oldhuisheng.includes(event.source)) {
				return false;
			}
			return true;
		},
		init(player) {
			if (player.storage.oldhuisheng) {
				player.storage.oldhuisheng = [];
			}
		},
		async content(event, trigger, player) {
			if (!player.storage.oldhuisheng) {
				player.storage.oldhuisheng = [];
			}
			player.storage.oldhuisheng.push(trigger.source);

			const att = get.attitude(player, trigger.source) > 0;
			let goon = false;

			if (player.hp === 1) {
				goon = true;
			} else {
				const he = player.getCards("he");
				let num = 0;
				for (const card of he) {
					if (get.value(card) < 8) {
						num++;
						if (num >= 2) {
							goon = true;
							break;
						}
					}
				}
			}

			const result = await player
				.chooseCard({
					prompt: get.prompt2("oldhuisheng", trigger.source),
					position: "he",
					selectCard: [1, player.countCards("he")],
					ai(card) {
						if (_status.event.att) {
							return 10 - get.value(card);
						}
						if (_status.event.goon) {
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

			if (!result.bool) {
				return;
			}

			player.logSkill("oldhuisheng", trigger.source);
			await game.delay();

			const num = result.cards?.length ?? 0;
			const sourceGoon = num > 2 || get.attitude(trigger.source, player) >= 0;

			let forced = false;
			let str = "获得其中一张牌并防止伤害";
			if (trigger.source.countCards("he") < num) {
				forced = true;
			} else {
				str += "，或取消并弃置" + get.cnNumber(num) + "张牌";
			}

			const result2 = await trigger.source
				.chooseButton({
					forced,
					createDialog: [str, result.cards],
					ai(button) {
						if (_status.event.goon) {
							return get.value(button.link);
						}
						return get.value(button.link) - 8;
					},
				})
				.set("goon", sourceGoon)
				.forResult();

			if (result2.bool) {
				const card = result2.links?.[0];
				await trigger.source.gain({
					cards: [card],
					source: player,
					animate: "giveAuto",
					bySelf: true,
				});
				trigger.cancel();
			} else {
				await trigger.source.chooseToDiscard({
					selectCard: num,
					position: "he",
					forced: true,
				});
			}
		},
	}
```

## oldre_liubiao 名字:RE刘表 势力:qun

### zishou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### zongshi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_liubiao 名字:旧刘表 势力:qun

### oldzishou 名字:自守
描述: 摸牌阶段，若你已受伤，你可令额定摸牌数+X（X为你已损失的体力值），然后跳过下一个出牌阶段。
```js
oldzishou: {
		audio: "zishou",
		audioname: ["re_liubiao"],
		trigger: { player: "phaseDrawBegin2" },
		check(event, player) {
			return (player.countCards("h") <= 2 && player.getDamagedHp() >= 2) || player.skipList.includes("phaseUse");
		},
		filter(event, player) {
			return !event.numFixed && player.isDamaged();
		},
		async content(event, trigger, player) {
			trigger.num += player.getDamagedHp();
			player.skip("phaseUse");
		},
		ai: {
			threaten: 1.5,
		},
	}
```

### zongshi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_gaoshun 名字:旧高顺 势力:qun

### xianzhen
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### jinjiu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_caorui 名字:旧曹叡 势力:wei

### huituo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### oldmingjian 名字:明鉴
描述: 出牌阶段开始前，你可以跳过此阶段并将所有手牌交给一名其他角色。若如此做，你结束当前回合，然后其获得一个额外的回合（仅包含出牌阶段）。
```js
oldmingjian: {
		audio: "mingjian",
		trigger: { player: "phaseUseBefore" },
		filter(event, player) {
			return player.countCards("h");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "跳过出牌阶段并将所有手牌交给一名其他角色，你结束此回合，然后其于此回合后获得一个额外的出牌阶段", lib.filter.notMe)
				.set("ai", target => {
					var player = _status.event.player,
						att = get.attitude(player, target);
					if (target.hasSkillTag("nogain")) {
						return 0.01 * att;
					}
					if (player.countCards("h") == player.countCards("h", "du")) {
						return -att;
					}
					if (target.hasJudge("lebu")) {
						att *= 1.25;
					}
					if (get.attitude(player, target) > 3) {
						var basis = get.threaten(target) * att;
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
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.give(player.getCards("h"), target);
			trigger.cancel();
			const evt = trigger.getParent("phase", true);
			if (evt) {
				game.log(player, "结束了回合");
				evt.num = evt.phaseList.length;
				evt.goto(11);
			}
			const next = target.insertPhase();
			next._noTurnOver = true;
			next.phaseList = ["phaseUse"];
			//next.setContent(lib.skill.oldmingjian.phase);
		},
		async phase(event, trigger, player) {
			await player.phaseUse();
			game.broadcastAll(function () {
				if (ui.tempnowuxie) {
					ui.tempnowuxie.close();
					delete ui.tempnowuxie;
				}
			});
		},
	}
```

### xingshuai
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_handang 名字:旧韩当 势力:wu

### oldgongji 名字:弓骑
描述: 你可以将一张装备牌当做无距离限制的【杀】使用或打出。
```js
oldgongji: {
		audio: "gongji",
		enable: ["chooseToUse", "chooseToRespond"],
		locked: false,
		filterCard: { type: "equip" },
		position: "hes",
		viewAs: {
			name: "sha",
			storage: { oldgongji: true },
		},
		viewAsFilter(player) {
			if (!player.countCards("hes", { type: "equip" })) {
				return false;
			}
		},
		prompt: "将一张装备牌当无距离限制的【杀】使用或打出",
		check(card) {
			var val = get.value(card);
			if (_status.event.name == "chooseToRespond") {
				return 1 / Math.max(0.1, val);
			}
			return 5 - val;
		},
		mod: {
			targetInRange(card) {
				if (card.storage && card.storage.oldgongji) {
					return true;
				}
			},
		},
		ai: {
			respondSha: true,
			skillTagFilter(player) {
				if (!player.countCards("hes", { type: "equip" })) {
					return false;
				}
			},
		},
	}
```

### oldjiefan 名字:解烦
描述: 当一名角色A于你的回合外处于濒死状态时，你可以对当前回合角色使用一张【杀】。当此【杀】造成伤害时，你防止此伤害，视为对A使用一张【桃】。
```js
oldjiefan: {
		audio: "jiefan",
		trigger: { player: "chooseToUseBegin" },
		filter(event, player) {
			return event.type == "dying" && _status.currentPhase !== player;
		},
		direct: true,
		clearTime: true,
		async content(event, trigger, player) {
			const list = [event.name, trigger.dying];
			await player
				.chooseToUse({
					filterCard(card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						// @ts-ignore
						return lib.filter.filterCard.apply(this, arguments);
					},
					prompt: get.prompt2(...list),
				})
				.set("targetRequired", true)
				.set("complexSelect", true)
				.set("complexTarget", true)
				.set("filterTarget", function (card, player, target) {
					if (target != _status.currentPhase && !ui.selected.targets.includes(_status.currentPhase)) {
						return false;
					}
					return lib.filter.filterTarget.apply(this, arguments);
				})
				.set("logSkill", list)
				.set("oncard", function () {
					_status.event.player.addTempSkill("oldjiefan_recover");
				})
				.set("custom", {
					add: {},
					replace: {
						window: () => {
							ui.click.cancel();
						},
					},
				});
		},
		ai: {
			save: true,
			order: 3,
			result: { player: 1 },
		},
		subSkill: {
			recover: {
				// audio:'jiefan',
				trigger: { source: "damageBegin2" },
				filter(event, player) {
					return event.getParent(4).name == "oldjiefan";
				},
				forced: true,
				popup: false,
				charlotte: true,
				async content(event, trigger, player) {
					trigger.cancel();
					const evt = event.getParent("_save");
					const card = { name: "tao", isCard: true };
					if (evt && evt.dying && player.canUse(card, evt.dying)) {
						await player.useCard({
							card: get.autoViewAs(card),
							targets: [evt.dying],
							skill: "oldjiefan_recover",
						});
					}
				},
			},
		},
	}
```

## old_yangzhi 名字:旧杨芷 势力:jin

### wanyi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### maihuo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_yangyan 名字:旧杨艳 势力:jin

### xuanbei
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### xianwan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## madai 名字:旧马岱 势力:shu

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### oldqianxi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## xuhuang 名字:xuhuang 势力:wei

### gzduanliang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## junk_simayi 名字:旧晋司马懿 势力:jin

### buchen
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### smyyingshi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### xiongzhi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### quanbian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## fazheng 名字:旧法正 势力:shu

### enyuan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### xuanhuo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_yuanshu 名字:旧袁术 势力:qun

### wangzun
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### tongji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## pangde 名字:pangde 势力:qun

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### mengjin
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_huaxiong 名字:旧华雄 势力:qun

### new_reyaowu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_wangyun 名字:旧王允 势力:qun

### wylianji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### moucheng
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_xiaoqiao 名字:旧小乔 势力:wu

### tianxiang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### hongyan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## weiyan 名字:weiyan 势力:shu

### kuanggu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## xiahouyuan 名字:xiahouyuan 势力:wei

### shensu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_zhangxingcai 名字:旧张星彩 势力:shu

### oldshenxian
```js
oldshenxian: {
		audio: "shenxian",
		inherit: "shenxian",
	}
```

### qiangwu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_fuhuanghou 名字:旧伏寿 势力:qun

### oldzhuikong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### oldqiuyuan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_caochong 名字:旧曹冲 势力:wei

### oldrenxin
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### oldchengxiang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## yuji 名字:旧于吉 势力:qun

### old_guhuo 名字:蛊惑
描述: 你可以扣置一张手牌当做一张基本牌或普通锦囊牌使用或打出，体力值不为0的其他角色依次选择是否质疑。然后，若有质疑的角色，你展示此牌：若为假，此牌作废，这些角色摸一张牌；若为真，这些角色失去1点体力，且若此牌不为♥，此牌作废。
```js
old_guhuo: {
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			return lib.inpile.includes(name) && player.countCards("hs") > 0;
		},
		filter(event, player) {
			if (!player.countCards("hs")) {
				return false;
			}
			for (const i of lib.inpile) {
				const type = get.type(i);
				if ((type == "basic" || type == "trick") && event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) {
					return true;
				}
				if (i == "sha") {
					for (const j of lib.inpile_nature) {
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
				const list = [];
				for (const i of lib.inpile) {
					if (event.type != "phase") {
						if (!event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) {
							continue;
						}
					}
					const type = get.type(i);
					if (type == "basic" || type == "trick") {
						list.push([type, "", i]);
					}
					if (i == "sha") {
						for (const j of lib.inpile_nature) {
							if (event.type != "phase") {
								if (!event.filterCard(get.autoViewAs({ name: i, nature: j }, "unsure"), player, event)) {
									continue;
								}
							}
							list.push(["基本", "", "sha", j]);
						}
					}
				}
				return ui.create.dialog("蛊惑", [list, "vcard"]);
			},
			filter(button, player) {
				const evt = _status.event.getParent();
				return evt.filterCard({ name: button.link[2], nature: button.link[3] }, player, evt);
			},
			check(button) {
				const player = _status.event.player;
				const enemyNum = game.countPlayer(function (current) {
					return current != player && current.hp != 0 && (get.realAttitude || get.attitude)(current, player) < 0;
				});
				const card = { name: button.link[2], nature: button.link[3] };
				const val = _status.event.getParent().type == "phase" ? player.getUseValue(card) : 1;
				if (val <= 0) {
					return 0;
				}
				if (enemyNum) {
					if (
						!player.hasCard(function (cardx) {
							if (card.name == cardx.name) {
								if (card.name != "sha") {
									return true;
								}
								return get.is.sameNature(card, cardx);
							}
							return false;
						}, "hs")
					) {
						if (get.value(card, player, "raw") < 6) {
							return Math.sqrt(val) * (0.25 + Math.random() / 1.5);
						}
						if (enemyNum <= 2) {
							return Math.sqrt(val) / 1.5;
						}
						return 0;
					}
					return 3 * val;
				}
				return val;
			},
			backup(links, player) {
				return {
					filterCard(card, player, target) {
						let result = true;
						const suit = card.suit,
							number = card.number;
						card.suit = "none";
						card.number = null;
						const mod = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
						if (mod != "unchanged") {
							result = mod;
						}
						card.suit = suit;
						card.number = number;
						return result;
					},
					selectCard: 1,
					position: "hs",
					ignoreMod: true,
					aiUse: Math.random(),
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						suit: "none",
						number: null,
					},
					ai1(card) {
						const player = _status.event.player;
						const enemyNum = game.countPlayer(function (current) {
							return current != player && current.hp != 0 && (get.realAttitude || get.attitude)(current, player) < 0;
						});
						const cardx = lib.skill.old_guhuo_backup.viewAs;
						if (enemyNum) {
							if (card.name == cardx.name && (card.name != "sha" || get.is.sameNature(card, cardx))) {
								return 2 + Math.random() * 3;
							} else if (lib.skill.old_guhuo_backup.aiUse < 0.5 && !player.isDying()) {
								return 0;
							}
						}
						return 6 - get.value(card);
					},
					async precontent(event, trigger, player) {
						player.logSkill("old_guhuo");
						player.addTempSkill("old_guhuo_guess");
						const [card] = event.result.cards;
						event.result.card.suit = get.suit(card);
						event.result.card.number = get.number(card);
					},
				};
			},
			prompt(links, player) {
				return "将一张手牌当做" + get.translation(links[0][2]) + (_status.event.name == "chooseToRespond" ? "打出" : "使用");
			},
		},
		ai: {
			save: true,
			respondSha: true,
			respondShan: true,
			fireAttack: true,
			skillTagFilter(player) {
				if (!player.countCards("hs")) {
					return false;
				}
			},
			threaten: 1.2,
			order: 8.1,
			result: {
				player: 1,
			},
		},
		subSkill: {
			guess: {
				trigger: {
					player: ["useCardBefore", "respondBefore"],
				},
				forced: true,
				silent: true,
				popup: false,
				firstDo: true,
				charlotte: true,
				filter(event, player) {
					return event.skill && event.skill.indexOf("old_guhuo_") == 0;
				},
				async content(event, trigger, player) {
					event.fake = false;
					event.betrayer = [];
					const [card] = trigger.cards;
					if (card.name != trigger.card.name || (card.name == "sha" && !get.is.sameNature(trigger.card, card))) {
						event.fake = true;
					}
					player.popup(trigger.card.name, "metal");
					const next = player.lose(card, ui.ordering);
					next.relatedEvent = trigger;
					await next;
					// player.line(trigger.targets,trigger.card.nature);
					trigger.throw = false;
					trigger.skill = "old_guhuo_backup";
					game.log(player, "声明", trigger.targets && trigger.targets.length ? "对" : "", trigger.targets || "", trigger.name == "useCard" ? "使用" : "打出", trigger.card);
					event.prompt = get.translation(player) + "声明" + (trigger.targets && trigger.targets.length ? "对" + get.translation(trigger.targets) : "") + (trigger.name == "useCard" ? "使用" : "打出") + (get.translation(trigger.card.nature) || "") + get.translation(trigger.card.name) + "，是否质疑？";
					event.targets = game
						.filterPlayer(function (current) {
							return current != player && current.hp != 0;
						})
						.sortBySeat(_status.currentPhase);
					game.broadcastAll(
						function (card, player) {
							_status.old_guhuoNode = card.copy("thrown");
							if (lib.config.cardback_style != "default") {
								_status.old_guhuoNode.style.transitionProperty = "none";
								ui.refresh(_status.old_guhuoNode);
								_status.old_guhuoNode.classList.add("infohidden");
								ui.refresh(_status.old_guhuoNode);
								_status.old_guhuoNode.style.transitionProperty = "";
							} else {
								_status.old_guhuoNode.classList.add("infohidden");
							}
							_status.old_guhuoNode.style.transform = "perspective(600px) rotateY(180deg) translateX(0)";
							player.$throwordered2(_status.old_guhuoNode);
						},
						trigger.cards[0],
						player
					);
					event.onEnd01 = function () {
						_status.old_guhuoNode.removeEventListener("webkitTransitionEnd", _status.event.onEnd01);
						setTimeout(function () {
							_status.old_guhuoNode.style.transition = "all ease-in 0.3s";
							_status.old_guhuoNode.style.transform = "perspective(600px) rotateY(270deg)";
							const onEnd = function () {
								_status.old_guhuoNode.classList.remove("infohidden");
								_status.old_guhuoNode.style.transition = "all 0s";
								ui.refresh(_status.old_guhuoNode);
								_status.old_guhuoNode.style.transform = "perspective(600px) rotateY(-90deg)";
								ui.refresh(_status.old_guhuoNode);
								_status.old_guhuoNode.style.transition = "";
								ui.refresh(_status.old_guhuoNode);
								_status.old_guhuoNode.style.transform = "";
								_status.old_guhuoNode.removeEventListener("webkitTransitionEnd", onEnd);
							};
							_status.old_guhuoNode.listenTransition(onEnd);
						}, 300);
					};
					for (const target of event.targets) {
						const { links } = await target
							.chooseButton([event.prompt, [["reguhuo_ally", "reguhuo_betray"], "vcard"]], true)
							.set("ai", function (button) {
								const player = _status.event.player;
								const evt = _status.event.getParent("old_guhuo_guess"),
									evtx = evt.getTrigger();
								if (!evt) {
									return Math.random();
								}
								const card = { name: evtx.card.name, nature: evtx.card.nature, isCard: true };
								const ally = button.link[2] == "reguhuo_ally";
								if (ally && (player.hp <= 1 || get.attitude(player, evt.player) >= 0)) {
									return 1.1;
								}
								if (!ally && get.attitude(player, evt.player) < 0 && evtx.name == "useCard") {
									let eff = 0;
									const targetsx = evtx.targets || [];
									for (const target of targetsx) {
										const isMe = target == evt.player;
										eff += get.effect(target, card, evt.player, player) / (isMe ? 1.5 : 1);
									}
									eff /= 1.5 * targetsx.length || 1;
									if (eff > 0) {
										return 0;
									}
									if (eff < -7) {
										return Math.random() + Math.pow(-(eff + 7) / 8, 2);
									}
									return Math.pow((get.value(card, evt.player, "raw") - 4) / (eff == 0 ? 5 : 10), 2);
								}
								return Math.random();
							})
							.forResult();
						if (links[0][2] == "reguhuo_betray") {
							target.addExpose(0.2);
							game.log(target, "#y质疑");
							target.popup("质疑！", "fire");
							event.betrayer.add(target);
						} else {
							game.log(target, "#g不质疑");
							target.popup("不质疑", "wood");
						}
					}
					await game.delayx();
					game.broadcastAll(function (onEnd) {
						_status.event.onEnd01 = onEnd;
						if (_status.old_guhuoNode) {
							_status.old_guhuoNode.listenTransition(onEnd, 300);
						}
					}, event.onEnd01);
					await game.delay(2);
					if (!event.betrayer.length) {
						return;
					}
					if (event.fake) {
						event.betrayer.forEach(target => target.popup("质疑正确", "wood"));
						await game.asyncDraw(event.betrayer);
						game.log(player, "声明的", trigger.card, "作废了");
						trigger.cancel();
						trigger.getParent().goto(0);
						trigger.line = false;
						event.clearUI = true;
					} else {
						event.betrayer.forEach(target => target.popup("质疑错误", "fire"));
						for (let target of event.betrayer) {
							await target.loseHp();
						}
						if (get.suit(card) != "heart") {
							game.log(player, "声明的", trigger.card, "作废了");
							trigger.cancel();
							trigger.getParent().goto(0);
							trigger.line = false;
							event.clearUI = true;
						}
					}
					await game.delay(2);
					if (event.clearUI) {
						game.broadcastAll(() => ui.clear());
					} // game.broadcastAll(ui.clear); 原来的代码抽象喵
				},
			},
			cheated: {
				trigger: {
					player: "gainAfter",
					global: "loseAsyncAfter",
				},
				charlotte: true,
				forced: true,
				silent: true,
				popup: false,
				firstDo: true,
				onremove: true,
				filter(event, player) {
					if (event.getParent().name == "draw") {
						return true;
					}
					var cards = event.getg(player);
					if (!cards.length) {
						return false;
					}
					return game.hasPlayer(current => {
						if (current == player) {
							return false;
						}
						var evt = event.getl(current);
						if (evt && evt.cards && evt.cards.length) {
							return true;
						}
						return false;
					});
				},
				async content(event, trigger, player) {
					player.removeSkill("old_guhuo_cheated");
				},
			},
		},
	}
```

## zhangjiao 名字:zhangjiao 势力:qun

### leiji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### guidao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### huangtian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_zhangfei 名字:新杀张飞 势力:shu

### new_repaoxiao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### new_tishen
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_zhaoyun 名字:新杀赵云 势力:shu

### longdan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### new_yajiao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_huatuo 名字:OL华佗 势力:qun

### jijiu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### chulao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_guanyu 名字:旧关羽 势力:shu

### wusheng
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### yijue
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_caochun 名字:旧曹纯 势力:wei

### shanjia
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## masu 名字:masu 势力:shu

### xinzhan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### huilei
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## xushu 名字:xushu 势力:shu

### xswuyan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### jujian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## liru 名字:liru 势力:qun

### juece
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### mieji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### fencheng
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## xin_yujin 名字:节钺于禁 势力:wei

### jieyue
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_zhonghui 名字:old_zhonghui 势力:wei

### zzhenggong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### zquanji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### zbaijiang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_xusheng 名字:旧徐盛 势力:wu

### pojun
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_zhuran 名字:旧朱然 势力:wu

### olddanshou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_lingtong 名字:旧凌统 势力:wu

### oldxuanfeng 名字:旋风
描述: 当你失去装备区里的牌后，你可以选择一项：1.视为对一名其他角色使用一张【杀】；2.对一名距离为1的角色造成1点伤害。
```js
oldxuanfeng: {
		audio: "xuanfeng",
		trigger: {
			player: ["loseAfter"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			var evt = event.getl(player);
			return evt && evt.es && evt.es.length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt("oldxuanfeng"),
					filterTarget(card, player, target) {
						if (target == player) {
							return false;
						}
						return get.distance(player, target) <= 1 || player.canUse("sha", target, false);
					},
					ai(target) {
						if (get.distance(player, target) <= 1) {
							return get.damageEffect(target, player, player) * 2;
						} else {
							return get.effect(target, { name: "sha" }, player, player);
						}
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			const distance = get.distance(player, target);
			if (distance <= 1 && player.canUse("sha", target, false)) {
				const result = await player
					.chooseControl({
						controls: ["出杀", "造成伤害"],
						ai() {
							return "造成伤害";
						},
					})
					.forResult();
				if (result.control === "出杀") {
					await player
						.useCard({
							card: get.autoViewAs({ name: "sha", isCard: true }),
							targets: [target],
							addCount: false,
						})
						.set("animate", false);
					await game.delay();
				} else {
					await target.damage();
				}
			} else if (distance <= 1) {
				await target.damage();
			} else {
				await player
					.useCard({
						card: get.autoViewAs({ name: "sha", isCard: true }),
						targets: [target],
						addCount: false,
					})
					.set("animate", false);
				await game.delay();
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (get.type(card) == "equip") {
						return [1, 3];
					}
				},
			},
			reverseEquip: true,
			noe: true,
		},
	}
```

## old_caoxiu 名字:旧曹休 势力:wei

### taoxi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_caozhen 名字:旧曹真 势力:wei

### sidi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_maliang 名字:旧马良 势力:shu

### xiemu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### naman
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_chenqun 名字:旧陈群 势力:wei

### dingpin
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### oldfaen 名字:法恩
描述: 当一名角色翻面或横置后，你可以令其摸一张牌。
```js
oldfaen: {
		audio: "faen",
		trigger: { global: ["turnOverAfter", "linkAfter"] },
		filter(event, player) {
			if (event.name == "link") {
				return event.player.isLinked();
			}
			return true;
		},
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await trigger.player.draw();
		},
		ai: {
			expose: 0.2,
		},
		global: "faen_global",
	}
```

## old_zhuhuan 名字:旧朱桓 势力:wu

### youdi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_zhuzhi 名字:旧朱治 势力:wu

### anguo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_zhugezhan 名字:旧诸葛瞻 势力:shu

### old_zuilun 名字:罪论
描述: 出牌阶段，你可以获得一名其他角色的一张牌（手牌、装备区各一次），然后该角色摸一张牌。
```js
old_zuilun: {
		audio: "xinfu_zuilun",
		subSkill: {
			e: {},
			h: {},
		},
		enable: "phaseUse",
		usable: 2,
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			var pos = "he";
			if (player.hasSkill("old_zuilun_h")) {
				pos = "e";
			}
			if (player.hasSkill("old_zuilun_e")) {
				pos = "h";
			}
			return target.countGainableCards(player, pos) > 0;
		},
		async content(event, trigger, player) {
			const target = event.target ?? event.targets?.[0];
			if (!target) {
				return;
			}

			let pos = "he";
			if (player.hasSkill("old_zuilun_h")) {
				pos = "e";
			}
			if (player.hasSkill("old_zuilun_e")) {
				pos = "h";
			}

			const result = await player
				.gainPlayerCard({
					target,
					position: pos,
					forced: true,
				})
				.forResult();
			if (result.bool && result.cards && result.cards.length) {
				await target.draw();
				// @ts-ignore
				const originalPos = result.cards[0].original;
				if (originalPos === "h" || originalPos === "e") {
					player.addTempSkill("old_zuilun_" + originalPos, "phaseUseAfter");
				}
			}
		},
		ai: {
			order: 7,
			result: {
				target: -1,
			},
		},
	}
```

### old_fuyin 名字:父荫
描述: 锁定技。若你的装备区里没有防具牌，你不能成为手牌数不小于你的其他角色使用【杀】、【决斗】或【火攻】的目标。
```js
old_fuyin: {
		audio: "xinfu_fuyin",
		mod: {
			targetEnabled(card, player, target) {
				if ((card.name == "juedou" || card.name == "sha" || card.name == "huogong") && player != target && player.countCards("h") >= target.countCards("h") && target.hasEmptySlot(2)) {
					return false;
				}
			},
		},
	}
```

## old_guanqiujian 名字:旧毌丘俭 势力:wei

### drlt_zhenrong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### drlt_hongju
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_wanglang 名字:旧王朗 势力:wei

### gushe
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### jici
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_wangyi 名字:旧王异 势力:wei

### oldzhenlie
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### oldmiji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_yujin 名字:毅重于禁 势力:wei

### yizhong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

