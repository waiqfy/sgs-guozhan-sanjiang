# huicui merged reference

## dc_feiyi 名字:新杀费祎 势力:shu

### dcqiansu 名字:谦素
描述: 其他角色的结束阶段，若其手牌数比你多，你可以摸三张牌，然后交给该角色其中一张。
```js
dcqiansu: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return player != event.player && event.player.countCards("h") > player.countCards("h");
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const result = await player.draw({ num: 3 }).forResult();
			const target = trigger.player;
			if (result?.cards?.length) {
				const cards = result.cards.filter(card => player.getCards("h").includes(card));
				if (!cards?.length) {
					return;
				}
				await player.chooseToGive({
					target,
					position: "h",
					forced: true,
					filterCard(card) {
						return get.event().cards.includes(card);
					},
					cards,
				});
			}
		},
	}
```

### dcxingbang 名字:兴邦
描述: 出牌阶段限一次，你可以摸一张牌并交给一名其他角色一张牌。然后你获得其一张手牌，若此牌：是你交给该角色的牌，视为对其使用一张【杀】；不是你交给该角色的牌，重复获得牌的流程（至多获得三张）。
```js
dcxingbang: {
		audio: 2,
		enable: "phaseUse",
		usable(skill, player) {
			return player.hasSkill("dcfanhuo_mark") ? 3 : 1;
		},
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.draw();
			if (!target?.isIn() || !player.hasGainableCards(target, "he")) {
				return;
			}
			let result;
			result = await player.chooseToGive({ forced: true, position: "he", target }).forResult();
			if (result?.bool && result.cards?.length) {
				const card = result.cards[0];
				for (let i = 0; i < 3; i++) {
					if (!target?.isIn() || !target.hasGainableCards(player, "h")) {
						return;
					}
					result = await player.gainPlayerCard({ target, forced: true, position: "h" }).forResult();
					if (result?.bool && result.links?.length) {
						const cardx = result.links[0];
						const sha = get.autoViewAs({ name: "sha", isCard: true }, "unsure");
						if (card == cardx) {
							if (player.canUse(sha, target, false, false)) {
								await player.useCard({ card: sha, targets: [target], addCount: false });
								return;
							}
						}
					}
				}
			}
		},
		ai: {
			order: 5,
			result: {
				player: 1,
				target: -1,
			},
		},
	}
```

### dcfanhuo 名字:泛祸
描述: `限定技，出牌阶段，你可令${get.poptip("dcxingbang")}改为“出牌阶段限三次”直到回合结束，然后你于此回合结束时失去3点体力。`
```js
dcfanhuo: {
		audio: 2,
		enable: "phaseUse",
		manualConfirm: true,
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		filter(event, player) {
			return player.hasSkill("dcxingbang", null, false, false);
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.addTempSkill(event.name + "_mark");
		},
		subSkill: {
			mark: {
				mark: true,
				charlotte: true,
				intro: {
					content: "本回合兴邦改为出牌阶段限三次，然后此回合结束时你失去3点体力",
				},
				forced: true,
				trigger: { global: "phaseEnd" },
				async content(event, trigger, player) {
					await player.loseHp(3);
				},
			},
		},
		ai: {
			combo: "dcxingbang",
			order: 13,
			result: {
				player(player) {
					if (!player.hasSkill("dcxingbang") || (player.getStat().skill?.dcxingbang ?? 0) >= 3) return 0;
					if (player.hp + player.countCards("hs", card => player.canSaveCard(card, player)) < 3) return 0;
					return !player.hasUnknown() && game.hasPlayer(target => target !== player && get.effect(target, "dcxingbang", player, player) > 0) ? 1 : -1;
				},
			},
		},
	}
```

## yue_caozhi 名字:乐曹植 势力:wei

### dcfuyue 名字:赋乐
描述: 锁定技。①游戏开始时，你将手牌标记为“赋”。②你的“赋”牌不计入手牌上限。③当你标记手牌为“赋”时，你令其随机获得另一种非装备牌牌名。④你使用“赋”牌时可选择使用该牌所拥有的任意一种牌名。
```js
dcfuyue: {
		mod: {
			ignoredHandcard(card, player) {
				if (get.info("dcfuyue").hasFuyueTag(card)) {
					return true;
				}
			},
			cardDiscardable(card, player, name) {
				if (name === "phaseDiscard" && get.info("dcfuyue").hasFuyueTag(card)) {
					return false;
				}
			},
		},
		audio: 2,
		hiddenCard(player, name) {
			return player.hasCards("hs", card => card.hasGaintag(`eternal_dcfuyue_${name}`));
		},
		enable: ["chooseToUse"],
		filter(event, player) {
			return player.hasCards("hs", card => {
				const name = get.info("dcfuyue").getFuyueName(card);
				if (!name) {
					return false;
				}
				const vcard = get.autoViewAs({ name }, "unsure");
				return event.filterCard(vcard, player, event);
			});
		},
		viewAs(cards, player) {
			if (cards.length) {
				var name = get.info("dcfuyue").getFuyueName(cards[0]),
					nature = null;
				//返回判断结果
				if (name) {
					return { name: name, nature: nature };
				}
			}
			return null;
		},
		prompt(event, player) {
			return `将“赋”牌当该牌所拥有的任意一种牌名使用`;
		},
		position: "hs",
		filterCard(card, player, event) {
			event = event || _status.event;
			const filter = event._backup.filterCard;
			const name = get.info("dcfuyue").getFuyueName(card);
			if (!name) {
				return false;
			}
			return filter(get.autoViewAs({ name }, "unsure"), player, event);
		},
		check(card) {
			const player = get.player(),
				name = get.info("dcfuyue").getFuyueName(card);
			if (!name) {
				return 0;
			}
			if (_status.event.type != "phase") {
				return 1;
			}
			return player.getUseValue({ name }) + 0.1;
		},
		getFuyueName(card) {
			const skill = `eternal_dcfuyue_`;
			let tag = card.gaintag?.find(tag => tag.startsWith(skill));
			if (tag) {
				return tag.slice(skill.length);
			}
			return null;
		},
		hasFuyueTag(card) {
			return card.gaintag?.some(tag => tag.startsWith(`eternal_dcfuyue_`));
		},
		markAsFu(card, player) {
			const name = lib.inpile.filter(name => get.type(name) != "equip" && card.name != name).randomGet();
			// 清标记
			const skill = `eternal_dcfuyue_`;
			let tag = card.gaintag?.find(tag => tag.startsWith(skill));
			if (tag) {
				player.removeGaintag(tag, card);
			}
			if (name) {
				// 加标记
				tag = `${skill}${name}`;
				// 添加临时标记翻译，着重用于重连显示
				game.addTempTag(`dcfuyue_${name}`, `赋(${get.translation(name)})`);
				player.addGaintag(card, tag);
			}
		},
		group: ["dcfuyue_start"],
		subSkill: {
			start: {
				audio: "dcfuyue",
				trigger: {
					global: "phaseBefore",
					player: "enterGame",
				},
				filter(event, player) {
					return event.name !== "phase" || game.phaseNumber === 0;
				},
				forced: true,
				locked: true,
				async content(event, trigger, player) {
					const { markAsFu, hasFuyueTag } = get.info("dcfuyue");
					const cards = player.getCards("h").filter(card => !hasFuyueTag(card));
					cards.forEach(card => {
						markAsFu(card, player);
					});
				},
			},
		},
		ai: {
			threaten: 1.5,
			order: 11,
			result: { player: 1 },
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag) {
				const fuCards = player.getCards("hs", card => get.info("dcfuyue").hasFuyueTag(card));
				let name;
				if (tag === "respondSha") {
					name = "sha";
				} else if (tag === "respondShan") {
					name = "shan";
				} else {
					return false;
				}
				return fuCards.some(card => get.info("dcfuyue").getFuyueName(card) === name);
			},
		},
	}
```

### dcwenlan 名字:文澜
描述: 当你每使用或打出两张牌结算结束后，若这两张牌均为“赋”且包含相同牌名，则你从牌堆中获得这两张“赋”包含牌名的牌各一张并标记为“赋”；否则你选择任意张手牌，随机变更其中的“赋”获得的牌名并将其余牌标记为“赋”。
```js
dcwenlan: {
		init(player, skill) {
			player.addSkill(skill + "_mark");
		},
		onremove(player, skill) {
			player.removeSkill(skill + "_mark");
		},
		audio: 2,
		trigger: { player: ["useCardAfter", "respondAfter"] },
		filter(event, player) {
			const evts = game.getAllGlobalHistory("everything", evt => ["useCard", "respond"].includes(evt.name) && evt.player == player && get.type(evt.card) != "delay", event);
			if (evts.length < 2) {
				return false;
			}
			if (evts.indexOf(event) % 2 !== 1) {
				return false;
			}
			const { isFuyueCard, getNames } = get.info("dcwenlan");
			const bool1 = isFuyueCard(event, player);
			const lastEvt = evts.at(-2);
			const bool2 = isFuyueCard(lastEvt, player);
			const names1 = getNames(event, player);
			const names2 = getNames(lastEvt, player);
			return (bool1 && bool2 && names1.containsSome(...names2)) || player.hasCards("h");
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			const evts = game.getAllGlobalHistory("everything", evt => ["useCard", "respond"].includes(evt.name) && evt.player == player && get.type(evt.card) != "delay", trigger);
			const { markAsFu } = get.info("dcfuyue");
			const { isFuyueCard, getNames } = get.info(event.name);
			// 本次是否为“赋”
			const bool1 = isFuyueCard(trigger, player);
			const lastEvt = evts.at(-2);
			const bool2 = isFuyueCard(lastEvt, player);
			const names1 = getNames(trigger, player);
			const names2 = getNames(lastEvt, player);
			if (bool1 && bool2 && names1.containsSome(...names2)) {
				const num = names1.length + names2.length;
				const cards = [];
				const names = [];
				for (let i = 0; i < num; i++) {
					const card = get.cardPile2(cardx => {
						return !cards.includes(cardx) && !names.includes(cardx.name) && (names1.includes(cardx.name) || names2.includes(cardx.name));
					});
					if (card) {
						cards.push(card);
						names.push(card.name);
					} else {
						continue;
					}
				}
				if (cards.length > 0) {
					await player.gain({
						cards,
						animate: "draw",
					});
					player.getCards("h", card => cards.includes(card)).forEach(card => markAsFu(card, player));
				}
			} else if (player.hasCards("h")) {
				const result = await player
					.chooseCard({
						prompt: `文澜：选择任意张手牌标记为“赋”或替换“赋”牌名`,
						position: "h",
						selectCard: [1, Infinity],
						allowChooseAll: true,
						forced: true,
					})
					.set("ai", card => 5 - get.value(card))
					.forResult();
				if (result?.bool && result.cards?.length) {
					for (const card of result.cards) {
						markAsFu(card, player);
					}
				}
			}
		},
		ai: {
			combo: "dcfuyue",
			threaten: 1.2,
		},
		getNames(event, player) {
			const skill = `eternal_dcfuyue_`;
			const evtx = player.getAllHistory(
				"lose",
				evtx =>
					evtx.getParent() === event &&
					Object.keys(evtx.gaintag_map).some(i => {
						return evtx.gaintag_map[i].some(tag => tag.startsWith(skill));
					})
			)?.[0];
			if (!evtx) {
				return [];
			}
			const list = Object.keys(evtx.gaintag_map).reduce((sum, i) => {
				const tag = evtx.gaintag_map[i].find(tag => tag.startsWith(skill));
				if (tag) {
					// @ts-ignore
					sum.add(tag.slice(skill.length));
				}
				return sum;
			}, []);
			return list.addArray([event.card.name, event.cards[0].name]);
		},
		isFuyueCard(event, player) {
			const skill = `eternal_dcfuyue_`;
			return player.hasAllHistory(
				"lose",
				evtx =>
					evtx.getParent() === event &&
					event.cards.length == 1 &&
					Object.keys(evtx.gaintag_map).some(i => {
						return evtx.gaintag_map[i].some(tag => tag.startsWith(skill));
					})
			);
		},
		subSkill: {
			mark: {
				charlotte: true,
				init(player, skill) {
					const evts = game.getAllGlobalHistory("everything", evt => ["useCard", "respond"].includes(evt.name) && evt.player == player && get.type(evt.card) != "delay");
					if (evts.length) {
						const evt = evts.at(-1);
						const { isFuyueCard, getNames } = get.info("dcwenlan");
						const bool = isFuyueCard(evt, player);
						const names = getNames(evt, player);
						player.setStorage(skill, { bool, names }, true);
					}
				},
				onremove(player, skill) {
					delete player.storage[skill];
					player.removeTip(skill);
				},
				trigger: { player: ["useCard1", "respond"] },
				forced: true,
				popup: false,
				firstDo: true,
				filter(event, player) {
					return get.type(event.card) != "delay";
				},
				async content(event, trigger, player) {
					const { isFuyueCard, getNames } = get.info("dcwenlan");
					const bool = isFuyueCard(trigger, player);
					const names = getNames(trigger, player);
					player.setStorage(event.name, { bool, names }, true);
					if (bool) {
						player.addTip(
							event.name,
							`${get.translation(event.name)} ${player
								.getStorage(event.name, { bool: false, names: [] })
								.names.map(name => get.translation(name))
								.join("、")}`
						);
					} else {
						player.removeTip(event.name);
					}
				},
				intro: {
					content(storage = { bool: false, names: [] }, player) {
						if (storage?.bool) {
							return `<br><li>使用的上一张牌为“赋”<li>牌名：${storage.names.map(name => get.translation(name)).join("、")}`;
						}
						return "寥落纸上数言";
					},
				},
			},
		},
	}
```

## dc_muludawang 名字:新杀木鹿大王 势力:qun

### dczhoufa 名字:咒法
描述: 出牌阶段限一次，你可以将一张非基本牌当伤害牌使用，此牌造成的伤害为雷电伤害。
```js
dczhoufa: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			if (!player.hasCards("hes", card => get.type(card) != "basic")) {
				return false;
			}
			const list = get.inpileVCardList(([type, _, name, nature]) => get.is.damageCard(get.autoViewAs({ name, nature }, "unsure")));
			return list.some(([type, _, name, nature]) => {
				const vcard = get.autoViewAs({ name, nature }, "unsure");
				return event.filterCard(vcard, player, event);
			});
		},
		chooseButton: {
			dialog(event, player) {
				const list = get.inpileVCardList(([type, _, name, nature]) => {
					let vcard = get.autoViewAs({ name, nature }, "unsure");
					if (!get.is.damageCard(vcard)) {
						return false;
					}
					return event.filterCard(vcard, player, event);
				});
				return ui.create.dialog("咒法", [list, "vcard"]);
			},
			check({ link: [type, _, name, nature] }) {
				return get.player().getUseValue(get.autoViewAs({ name, nature }, "unsure"));
			},
			backup(links, player) {
				return {
					audio: "dczhoufa",
					position: "hse",
					filterCard: card => get.type(card) != "basic",
					check(card) {
						return 8 - get.value(card);
					},
					viewAs: { name: links[0][2], nature: links[0][3], storage: { dczhoufa: true } },
					popname: true,
				};
			},
			prompt(links, player) {
				return "将一张非基本牌当做" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
			},
		},
		group: "dczhoufa_thunder",
		subSkill: {
			thunder: {
				charlotte: true,
				trigger: {
					source: "damageBegin1",
				},
				filter(event, player) {
					return event.card?.storage?.dczhoufa && !event.hasNature("thunder");
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					game.setNature(trigger, "thunder");
				},
			},
			backup: {},
		},
		ai: {
			order: 1,
			result: {
				player: 1,
			},
		},
	}
```

### dcshouqun 名字:兽群
描述: `摸牌阶段，你可以改为展示牌堆顶X张牌（X为你的体力上限），并选择一项：1.获得其中的坐骑牌、锦囊牌、【杀】和【酒】，然后你体力上限+1（不能超过初始上限）；2.获得所有展示牌，然后直到你的下回合开始，你获得${get.poptip("dcyuxiang")}且每次受到火焰伤害后，体力上限-1。`
```js
dcshouqun: {
		init(player, skill) {
			player.setStorage(skill, player.maxHp, true);
		},
		onremove: true,
		derivation: "dcyuxiang",
		frequent: true,
		audio: 2,
		trigger: {
			player: "phaseDrawBegin1",
		},
		filter(event) {
			return !event.numFixed;
		},
		check(event, player) {
			return player.maxHp > 0;
		},
		async content(event, trigger, player) {
			trigger.changeToZero();
			const cards = get.cards(player.maxHp, true);
			await player
				.showCards(cards, `${get.translation(player)}发动了【${get.translation(event.name)}】`, true)
				.set("isFlash", false)
				.set("clearArena", false)
				.set("callback", async function (event, trigger, player) {
					const list = event.cards.filter(card => {
						if (["equip3", "equip4", "equip3_4"].includes(get.subtype(card))) {
							return true;
						} else if (get.type2(card) == "trick") {
							return true;
						}
						return ["sha", "jiu"].includes(get.name(card));
					});
					const result = await player
						.chooseControl({
							choiceList: [`获得其中的坐骑牌、锦囊牌、【杀】和【酒】，然后你体力上限+1（不能超过初始上限）`, `获得所有展示牌，然后直到你的下回合开始，你获得“驭象”且每次受到火焰伤害后，体力上限-1`],
							ai(event, player) {
								const { list } = get.event();
								if (player.maxHp < 4) {
									return 0;
								}
								return 1;
							},
							list,
						})
						.forResult();
					if (result?.control && result.control != "cancel2") {
						if (result.index == 0) {
							const next = player.gain(list, "gain2");
							await next;
							const { cards } = next;
							if (player.maxHp < player.getStorage("dcshouqun", 6)) {
								await player.gainMaxHp();
							}
						} else {
							await player.gain({ cards: event.cards, animate: "gain2" });
							await player.addTempSkills("dcyuxiang", { player: "phaseBegin" });
							player.addTempSkill("dcshouqun_debuff", { player: "phaseBegin" });
						}
					}
					game.broadcastAll(ui.clear);
				});
		},
		subSkill: {
			debuff: {
				charlotte: true,
				audio: "dcshouqun",
				trigger: {
					player: "damageEnd",
				},
				filter(event, player) {
					return event.hasNature("fire");
				},
				forced: true,
				async content(event, trigger, player) {
					await player.loseMaxHp();
				},
				ai: {
					neg: true,
					effect: {
						target(card, player, target) {
							if (get.tag(card, "fireDamage")) {
								return [1, -2];
							}
						},
					},
				},
			},
		},
	}
```

## dc_zhangshiping 名字:新杀张世平 势力:qun

### dcbinji 名字:镔济
描述: 每轮开始时，你可以摸三张牌，然后交给至多三名其他角色各一张牌。当这些角色失去这些牌后，其从牌堆或弃牌堆中随机获得一张武器牌，然后你摸一张牌。
```js
dcbinji: {
		audio: 2,
		trigger: { global: "roundStart" },
		filter(event, player) {
			return true;
		},
		check: () => true,
		async content(event, trigger, player) {
			await player.draw(3);
			if (!player.hasCards("he") || !game.hasPlayer(current => current != player)) {
				return;
			}
			const result = await player
				.chooseCardTarget({
					prompt: `镔济：交给至多三名其他角色各一张牌`,
					filterTarget: lib.filter.notMe,
					selectTarget: [1, 3],
					filterCard: true,
					forced: true,
					selectCard: [1, 3],
					position: "he",
					complexSelect: true,
					targetprompt() {
						const links = ui.selected.cards;
						return ["获得", get.translation(links[ui.selected.targets.length - 1])].join("<br>");
					},
					filterOk() {
						return ui.selected.cards.length == ui.selected.targets.length;
					},
					ai1(card) {
						const player = get.player();
						const num = game.countPlayer(current => current != player && get.attitude(player, current) > 0);
						if (ui.selected.cards.length >= num) {
							return 0;
						}
						return 1 / Math.max(0.1, get.value(card));
					},
					ai2(target) {
						const player = get.player();
						if (ui.selected.targets.length >= ui.selected.cards.length) {
							return 0;
						}
						let att = get.attitude(player, target);
						if (target.hasSkillTag("nogain")) {
							att /= 9;
						}
						return Math.max(4 + att, 1);
					},
				})
				.forResult();
			if (result?.bool) {
				const { cards, targets } = result;
				player.addSkill(`${event.name}_gain`);
				await game
					.loseAsync({
						gain_list: targets.map((target, i) => [target, cards[i]]),
						giver: player,
						player: player,
						cards: cards,
						gaintag: [event.name],
						animate: "giveAuto",
					})
					.setContent("gaincardMultiple");
			}
		},
		subSkill: {
			gain: {
				audio: "dcbinji",
				charlotte: true,
				forced: true,
				trigger: { global: ["loseAfter", "loseAsyncAfter", "addToExpansionAfter", "equipAfter", "addJudgeAfter", "gainAfter"] },
				getIndex(event, player) {
					return game
						.filterPlayer(target => {
							const evt = event.getl?.(target);
							return evt?.hs?.length > 0 && Object.values(evt.gaintag_map).flat().includes("dcbinji");
						})
						.sortBySeat();
				},
				filter(event, player, name, target) {
					return true;
				},
				logTarget(event, player, name, target) {
					return target;
				},
				async content(event, trigger, player) {
					const {
						targets: [target],
					} = event;
					const card = get.cardPile(card => get.subtype(card) == "equip1", void 0, "random");
					if (card) {
						await target.gain(card, "gain2");
					} else {
						target.chat("匹夫之勇，愚蠢之至！");
					}
					await player.draw();
				},
			},
		},
	}
```

### dczangmao 名字:驵贸
描述: 出牌阶段限三次，你可以：1.弃置任意张方块牌，然后从牌堆或弃牌堆随机获得等量张坐骑牌；2、交给一名其他角色一张方块牌，然后获得其装备区一张坐骑牌；3、将一张坐骑牌置入一名其他角色装备区， 然后其交给你两张手牌。
```js
dczangmao: {
		audio: 2,
		enable: "phaseUse",
		usable: 3,
		map: {
			discard: ["弃置任意张方块牌，然后从牌堆或弃牌堆随机获得等量张坐骑牌", () => get.player().countDiscardableCards(get.player(), "he", { suit: "diamond" })],
			give: ["交给一名其他角色一张方块牌，然后获得其装备区一张坐骑牌", () => get.player().countCards("he", { suit: "diamond" })],
			equip: ["将一张坐骑牌置入一名其他角色装备区， 然后其交给你两张手牌", () => get.player().countCards("he", card => ["equip3", "equip4", "equip3_4"].includes(get.subtype(card)))],
		},
		chooseButton: {
			dialog(event, player) {
				const map = get.info("dczangmao").map;
				const keys = Object.keys(map);
				return ui.create.dialog("驵贸：请选择一项", [keys.map(key => [key, map[key][0]]), "textbutton"], "hidden");
			},
			filter(button) {
				const map = get.info("dczangmao").map;
				return map[button.link][1]();
			},
			check(button) {
				return Math.random();
			},
			backup(links, player) {
				return {
					audio: "dczangmao",
					position: "he",
					...(links[0] == "discard" ? {} : { lose: false, discard: false, delay: false }),
					check(card) {
						return 6 - get.value(card);
					},
					...{
						discard: {
							filterCard(card, player) {
								return get.suit(card) == "diamond" && lib.filter.cardDiscardable(card, player, "dczangmao");
							},
							selectCard: [1, Infinity],
							async content(event, trigger, player) {
								const { cards } = event;
								const gain = [];
								while (gain.length < cards.length) {
									const card = get.cardPile(card => ["equip3", "equip4", "equip3_4"].includes(get.subtype(card)) && !gain.includes(card), void 0, "random");
									if (card) {
										gain.push(card);
									} else {
										break;
									}
								}
								if (gain.length) {
									await player.gain(gain, "gain2");
								} else {
									player.chat("塞翁失马，焉知非福");
								}
							},
						},
						give: {
							filterCard: { suit: "diamond" },
							filterTarget: lib.filter.notMe,
							async content(event, trigger, player) {
								const { cards, target } = event;
								await player.give(cards, target);
								if (target.countGainableCards(player, "e", card => ["equip3", "equip4", "equip3_4"].includes(get.subtype(card)))) {
									await player.gainPlayerCard(target, "e", true).set("filterButton", button => ["equip3", "equip4", "equip3_4"].includes(get.subtype(button.link)));
								} else {
									player.chat("其真无马邪？");
								}
							},
							ai: {
								result: {
									target: 1,
								},
							},
						},
						equip: {
							filterCard(card, player) {
								return ["equip3", "equip4", "equip3_4"].includes(get.subtype(card));
							},
							filterTarget(card, player, target) {
								return target != player && target.canEquip(ui.selected.cards[0], true);
							},
							async content(event, trigger, player) {
								const { cards, target } = event;
								player.$giveAuto(cards, target, false);
								await target.equip(cards[0]);
								const cardsx = target.getGainableCards(player, "h");
								if (cardsx?.length) {
									await target.chooseToGive({
										target: player,
										position: "h",
										selectCard: 2,
										forced: true,
									});
								} else {
									player.chat("其真不知马也！");
								}
							},
							ai: {
								result: {
									target: -1,
								},
							},
						},
					}[links[0]],
				};
			},
			prompt(links, player) {
				return `驵贸：${get.info("dczangmao").map[links[0]][0]}`;
			},
		},
		subSkill: {
			backup: {},
		},
		ai: {
			order: 6,
			result: {
				player: 1,
			},
		},
	}
```

## dc_weifeng 名字:新杀魏讽 势力:wei

### dchuozhong 名字:惑众
描述: 出牌阶段限两次，你可以展示一张手牌并选择攻击范围内任意名其他角色，这些角色依次选择一项：1.获得另一名其他角色的一张牌；2.交给你一张牌。全部结算后，手牌数最多的其他角色展示手牌并将所有与你展示牌类型相同的牌置于牌堆顶。
```js
dchuozhong: {
		audio: 2,
		enable: "phaseUse",
		usable: 2,
		filterCard: true,
		position: "h",
		check(card) {
			return 9 - get.value(card);
		},
		filter(event, player) {
			return player.hasCards("h") && game.hasPlayer(p => p !== player && p.hasCards("he"));
		},
		filterTarget(card, player, target) {
			return player.inRange(target) && target !== player;
		},
		selectTarget: [1, Infinity],
		multiline: true,
		multitarget: true,
		lose: false,
		discard: false,
		delay: false,
		async content(event, trigger, player) {
			const {
				cards: [card],
				targets,
			} = event;
			const type = get.type2(card);
			await player.showCards(card, `${get.translation(player)}发动了〖惑众〗`);
			await game.doAsyncInOrder(targets, async target => {
				if (!game.hasPlayer(target2 => target2.hasCards("he"))) {
					return;
				}
				const result = await target
					.chooseCardTarget({
						prompt: `惑众：选择一项：1.获得另一名其他角色的一张牌；2.交给${get.translation(player)}一张牌（不选择卡牌即视为进行获得牌操作）`,
						filterCard: true,
						position: "he",
						selectCard: [0, 1],
						complexSelect: true,
						filterTarget(card2, player2, target2) {
							if (target2 === player2) return false;
							if (!ui.selected.cards?.length) {
								if (target2 === get.event().sourcex) {
									return false;
								}
								return target2.hasCards("he");
							}
							return target2 === get.event().sourcex;
						},
						forced: true,
						type,
						sourcex: player,
						ai1(card2) {
							const player2 = get.player();
							if (player2.countCards("he") < 3) {
								return 0;
							}
							if (get.type2(card2) === get.event().type) {
								return 6.5 - get.value(card2);
							}
							return 5 - get.value(card2);
						},
						ai2(target2) {
							const player2 = get.player();
							let att = get.attitude(player2, target2);
							if (ui.selected.cards?.length) {
								if (att < 0 && target2 === get.event().sourcex) {
									return 0;
								}
								if (target2.hasSkillTag("nogain")) {
									att /= 9;
								}
								return 4 - att;
							}
							return -att;
						},
					})
					.forResult();
				if (result?.targets?.length) {
					const { cards: cards2, targets: targets2 } = result;
					target.line(targets2);
					if (!cards2?.length) {
						await target.gainPlayerCard({
							target: targets2[0],
							position: "he",
							forced: true,
						});
					} else {
						await target.give(cards2, targets2[0]);
					}
				}
			});
			const otherPlayers = game.filterPlayer(p => p !== player);

			// 计算这些角色的最大手牌数（只计算手牌数，用于判断哪些角色需要弃牌）
			let maxHandCount = -1;
			const playersToDiscard = [];
			for (const p of otherPlayers) {
				let handNum = p.countCards("h"); // 只计算手牌数量（决定谁弃牌）
				if (handNum > maxHandCount) {
					maxHandCount = handNum;
					playersToDiscard.length = 1;
					playersToDiscard[0] = p;
				} else if (handNum === maxHandCount) {
					playersToDiscard.push(p);
				}
			}

			// 让这些角色依次弃置与展示牌类型相同的所有牌（包括手牌和装备区）
			await game.doAsyncInOrder(playersToDiscard, async target => {
				await target.showHandcards();
				const hs = target.getCards("he", card2 => get.type2(card2) === type);

				if (hs.length) {
					target.$throw(hs.length, 1e3);
					game.log(target, "将", `#y${get.cnNumber(hs.length)}张牌`, "置于牌堆顶");
					await target.lose({
						cards: hs,
						position: ui.cardPile,
						insert_card: true,
					});
				}
			});
		},
		ai: {
			order: 9,
			result: {
				player: 1,
				target: -1,
			},
		},
	}
```

### dczhuguo 名字:蛀国
描述: 锁定技，每回合限三次，牌堆牌数量增加后，你从牌堆底摸两张牌。
```js
dczhuguo: {
		audio: 2,
		forced: true,
		trigger: {
			global: ["loseAfter", "loseAsyncAfter", "cardsGotoPileAfter"],
		},
		usable: 3,
		filter(event, player, name, target) {
			if (event.name === "cardsGotoPile") {
				return true;
			}
			if (event.name === "lose") {
				if (event.position === ui.cardPile && event.getlx !== false && event.cards2.length) {
					return true;
				}
			}
			return game.hasPlayer(target2 => {
				return target2.hasHistory("lose", evt => evt.getParent() === event && evt.position === ui.cardPile && evt.cards2?.length);
			});
		},
		async content(event, trigger, player) {
			await player.draw(2, "bottom");
		},
	}
```

## mamiao 名字:马邈 势力:shu

### dczhangguan 名字:仗关
描述: 每回合开始时，你可将手牌数调整至体力值，然后若你的手牌数没有因此变多，你回复1点体力，然后获得当前回合角色一张牌。
```js
dczhangguan: {
		audio: 2,
		trigger: {
			global: "phaseBegin",
		},
		async cost(event, trigger, player) {
			const num = player.countCards("h") - player.hp;
			if (num > 0) {
				event.result = await player
					.chooseToDiscard(get.prompt2(event.skill), "h", num)
					.set("ai", card => {
						if (get.event().eff) {
							return 10 - get.value(card);
						}
						return 0;
					})
					.set(
						"eff",
						(() => {
							const target = _status.currentPhase;
							if (!target?.countGainableCards(player, "he")) {
								return false;
							}
							const eff = get.effect(target, { name: "shunshou_copy2" }, player, player);
							if (eff < 0 || get.attitude(player, target) > 0) {
								return false;
							}
							const bonos = player.hasSkill("dccongfeng") ? 3 : 6;
							return eff > Math.sqrt(num) * bonos;
						})()
					)
					.set("chooseonly", true)
					.forResult();
			} else {
				event.result = await player
					.chooseBool({
						prompt: get.prompt2(event.skill),
						ai() {
							const player = get.player(),
								target = _status.currentPhase;
							if (player.isDamaged()) return true;
							if (target?.isIn() && get.attitude(player, target) < 0) return true;
							return false;
						},
					})
					.forResult();
			}
		},
		async content(event, trigger, player) {
			const count = player.countCards("h");
			if (count < player.hp) {
				await player.drawTo(player.hp);
			}
			if (event.cards?.length) {
				await player.modedDiscard(event.cards);
			}
			const num = player.countCards("h") - count;
			if (num <= 0) {
				await player.recover();
				const target = _status.currentPhase;
				const position = player == target ? "e" : "he";
				if (target?.isIn() && target.hasGainableCards(player, position)) {
					await player.gainPlayerCard({ target, position, forced: true });
				}
			}
			//player.addTempSkill("dczhangguan_effect");
		},
		subSkill: {
			effect: {
				trigger: {
					global: "useCard",
				},
				charlotte: true,
				filter(event, player) {
					if (event.player == player) {
						return false;
					}
					const evts = game.getGlobalHistory("useCard", evt => evt.player != player);
					return evts?.length > 0 && get.color(event.card) == get.color(evts[0].card);
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					trigger.directHit.add(player);
				},
			},
		},
	}
```

### dccongfeng 名字:从风
描述: 你/其他角色不因此技能获得其他角色/你的牌后，可额外随机获得一张。
```js
dccongfeng: {
		audio: 2,
		trigger: {
			global: ["gainAfter", "loseAsyncAfter"],
		},
		getIndex(event, player) {
			if (!event.getl || !event.getg) {
				return [];
			}
			const list = [],
				gains = event.getg(player),
				loses = event.getl(player).cards2;
			game.filterPlayer(current => {
				const gains2 = event.getg(current),
					loses2 = event.getl(current).cards2;
				if (current == player) {
					return false;
				}
				if (gains2.length && loses.length && gains2.containsSome(...loses)) {
					list.add([current, player]);
				}
				if (gains.length && loses2.length && loses2.containsSome(...gains)) {
					list.add([player, current]);
				}
				return true;
			});
			return list;
		},
		filter(event, player, name, list) {
			if (event.getParent().name == "dccongfeng") {
				return false;
			}
			const [gain, lose] = list;
			return lose.countGainableCards(gain, "he");
		},
		async cost(event, trigger, player) {
			const [gain, lose] = event.indexedData;
			event.result = await gain
				.chooseBool(get.prompt(event.skill, lose, gain), "随机获得其一张牌")
				.set("choice", get.effect(lose, { name: "shunshou_copy2" }, gain, gain) > 0)
				.forResult();
		},
		logTarget(event, player, name, list) {
			return list.find(current => current != player);
		},
		async content(event, trigger, player) {
			const [gain, lose] = event.indexedData;
			const cards = lose.getGainableCards(gain, "he");
			if (cards?.length) {
				await gain.gain(cards.randomGets(1), "giveAuto");
			}
		},
	}
```

## jimiaojimu 名字:吉邈吉穆 势力:qun

### dczouyi 名字:诹议
描述: 出牌阶段限一次，你可执行至多两项：1.你摸两张牌并可弃置一名其他角色一张牌；2.你弃置一张牌并可令一名其他角色摸两张牌。结算后〖掩袭〗使用次数增加X，你回复X点体力（X为手牌数与你相同的角色数）。
```js
dczouyi: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		selectTargetAI(event, player) {
			let cache = _status.event.getTempCache("dczouyi", "results");
			if (Array.isArray(cache)) {
				return cache;
			}
			let allPlayers = game.filterPlayer(current => current != player),
				startNums = allPlayers.map(current => current.countCards("h")),
				num = player.countCards("h");
			let draw = 0,
				discard = 0,
				all = 0;
			allPlayers.forEach((current, index) => {
				let countA = 1,
					countB = 1;
				for (let i = 0; i < startNums.length; i++) {
					let numx = startNums[i];
					if (((i != index || current.countCards("e")) && numx == num + 2) || (i == index && num + 3 == numx)) {
						countA++;
					}
					if ((i != index && numx == num - 1) || (i == index && num - 3 == numx)) {
						countB++;
					}
				}
				allPlayers.forEach((current2, index2) => {
					let nums = startNums.slice(0),
						numx = num + 1,
						countC = 1;
					nums[index] -= 1;
					nums[index2] += 2;
					nums.forEach(value => {
						if (value == numx) {
							countC++;
						}
					});
					if (countC > all) {
						all = countC;
					}
				});
				if (countA > draw) {
					draw = countA;
				}
				if (countB > discard) {
					discard = countB;
				}
			});
			event.putTempCache("dczouyi", "results", [draw, discard, all]);
			return [draw, discard, all];
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog(`###诹议###${get.translation("dczouyi_info")}`, [
					[
						["draw", "你摸两张牌并可弃置一名其他角色一张牌"],
						["discard", "你弃置一张牌并可令一名其他角色摸两张牌"],
					],
					"textbutton",
				]);
			},
			filter(button, player) {
				if (button.link == "discard") {
					return player.countDiscardableCards(player, "he");
				}
				return true;
			},
			check(button) {
				const player = get.player(),
					results = get.info("dczouyi").selectTargetAI(get.event(), player);
				if (results.minBy(i => i) == results[["draw", "discard"].indexOf(button.link)]) {
					return 0;
				}
				return 1;
			},
			select: [1, 2],
			backup(links, player) {
				return {
					audio: "dczouyi",
					links: links,
					async content(event, trigger, player) {
						const { links } = get.info(event.name);
						if (links.includes("draw")) {
							await player.draw(2);
							if (game.hasPlayer(target => target.countDiscardableCards(player, "he") && target != player)) {
								const result = await player
									.chooseTarget(`诹议：弃置一名其他角色一张牌`, (card, player, target) => {
										return target.countDiscardableCards(player, "he") && target != player;
									})
									.set("ai", target => {
										const { player, readyToDiscard: bool } = get.event(),
											num = player.countCards("h") - (bool ? 1 : 0),
											numx = target.countCards("h");
										let eff = get.effect(target, { name: "guohe_copy2" }, player, player);
										if ((numx == num && target.countCards("e")) || numx == num + 1) {
											eff *= 3;
										}
										return eff;
									})
									.set("readyToDiscard", links.includes("discard"))
									.forResult();
								if (result?.targets?.length) {
									const target = result.targets[0];
									player.line(target, "yellow");
									await player.discardPlayerCard(target, "he", true);
								}
							}
						}
						if (links.includes("discard")) {
							await player.chooseToDiscard("he", true);
							const result = await player
								.chooseTarget(`诹议：令一名其他角色摸两张牌`, lib.filter.notMe)
								.set("ai", target => {
									const player = get.player(),
										num = player.countCards("h"),
										numx = target.countCards("h") + 2;
									let eff = get.effect(target, { name: "wuzhong" }, player, player);
									if (num == numx) {
										eff *= 3;
									}
									return eff;
								})
								.forResult();
							if (result?.targets?.length) {
								const target = result.targets[0];
								player.line(target, "green");
								await target.draw(2);
							}
						}
						const num = game.countPlayer(target => target.countCards("h") == player.countCards("h"));
						if (num <= 0) {
							return;
						}
						player.addMark("dcyanxi", num, false);
						if (player.isDamaged()) {
							await player.recover(num);
						}
					},
				};
			},
			prompt(links, player) {
				const map = {
					draw: "你摸两张牌并可弃置一名其他角色一张牌",
					discard: "你弃置一张牌并可令一名其他角色摸两张牌",
				};
				return `###诹议：是否执行下列选项？###${links.map(type => map[type]).join("<br>")}`;
			},
		},
		ai: {
			order(item, player) {
				if (!player) {
					return 1;
				}
				let results = lib.skill.dczouyi.selectTargetAI(get.event(), player);
				return results.maxBy(i => i) * 3;
			},
			result: {
				player: 1,
			},
		},
		subSkill: {
			backup: {},
		},
	}
```

### dcyanxi 名字:掩袭
描述: 每局游戏限零次，其他角色回合结束时，你可视为对其使用一张【杀】（此杀造成的伤害改为失去体力），结算后若此技能可使用次数不为0，再次发动直至此技能无使用次数或其阵亡。
```js
dcyanxi: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			const card = get.autoViewAs({ name: "sha", isCard: true, storage: { dcyanxi: true } });
			return event.player != player && player.countMark("dcyanxi") > 0 && player.canUse(card, event.player, false, false);
		},
		logTarget: "player",
		check(event, player) {
			const card = get.autoViewAs({ name: "sha", isCard: true, storage: { dcyanxi: true } });
			return get.effect(event.player, card, player, player) > 0;
		},
		async content(event, trigger, player) {
			const target = trigger.player,
				card = get.autoViewAs({ name: "sha", isCard: true, storage: { dcyanxi: true } });
			let isFirst = true;
			player.addTempSkill("dcyanxi_jueqing");
			while (player.countMark(event.name) > 0 && player.canUse(card, target, false, false) && target.isIn()) {
				if (isFirst) {
					isFirst = false;
				} else {
					player.logSkill(event.name, target);
				}
				player.removeMark(event.name, 1, false);
				await player.useCard(card, target, false);
			}
			player.removeSkill("dcyanxi_jueqing");
		},
		intro: {
			content: "还可以发动#次",
		},
		ai: {
			combo: "dczouyi",
		},
		subSkill: {
			jueqing: {
				trigger: {
					source: "damageBefore",
				},
				charlotte: true,
				filter(event, player) {
					return event.card?.storage?.dcyanxi;
				},
				direct: true,
				async content(event, trigger, player) {
					trigger.cancel();
					trigger.player.loseHp(trigger.num);
				},
				ai: {
					jueqing: true,
				},
			},
		},
	}
```

## dc_zhugejun 名字:新杀诸葛均 势力:shu

### dcgengdu 名字:耕读
描述: 出牌阶段开始时，你可以亮出牌堆顶四张牌，并选择一种颜色的所有牌获得。若你选择的颜色为：黑色，本阶段限X次，你使用黑色牌后摸两张牌，这些牌本回合无法使用或打出且不计入手牌上限；红色，本阶段限X次，你可以将一张红色牌当作本回合未被使用过的普通锦囊牌使用。（X为本次你未获得的亮出牌数）
```js
dcgengdu: {
		audio: 2,
		trigger: {
			player: "phaseUseBegin",
		},
		frequent: true,
		async content(event, trigger, player) {
			const cards = get.cards(4);
			await game.cardsGotoOrdering(cards);
			await player.showCards(cards, `${get.translation(player)}发动了【耕读】`);
			const list = ["red", "black"];
			const result = await player
				.chooseControl(list)
				.set("prompt", "耕读：选择一种颜色的牌获得")
				.set(
					"choiceList",
					list.map(i => {
						const colors = cards.filter(card => get.color(card) == i);
						return `${get.translation(i)}：${colors.length ? get.translation(colors) : "空气"}`;
					})
				)
				.set("ai", () => {
					return get.event().results;
				})
				.set(
					"results",
					(() => {
						let count = color => cards.filter(card => get.color(card) == color);
						let results = list.sort((a, b) => count(b) - count(a));
						return results[0];
					})()
				)
				.forResult();
			const color = result.control,
				gains = cards.filter(card => get.color(card) == color);
			if (gains?.length) {
				await player.gain(gains, "gain2");
			}
			if (["red", "black"].includes(color)) {
				player.addTempSkill(`dcgengdu_${color}`, "phaseChange");
				player.setStorage(`dcgengdu_${color}`, cards.length - gains.length, true);
			}
		},
		subSkill: {
			red: {
				enable: "chooseToUse",
				charlotte: true,
				filter(event, player) {
					const list = event.dcgengduList;
					return list.length && player.countCards("hes", { color: "red" });
				},
				usable(skill, player) {
					return player.getStorage(skill, 0);
				},
				onChooseToUse(event) {
					if (game.online || event.dcgengduList) {
						return;
					}
					const player = event.player;
					let list = lib.inpile.filter(i => {
						if (get.type(i) != "trick") {
							return false;
						}
						if (event && !event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) {
							return false;
						}
						return true;
					});
					game.checkGlobalHistory("useCard", evt => {
						if (list.includes(evt.card.name)) {
							list.remove(evt.card.name);
						}
					});
					event.set("dcgengduList", list);
				},
				chooseButton: {
					dialog(event, player) {
						const list = event.dcgengduList;
						return ui.create.dialog("耕读", [list, "vcard"]);
					},
					check(button) {
						if (get.event().getParent().type != "phase") {
							return 1;
						}
						return get.player().getUseValue({ name: button.link[2] });
					},
					prompt(links, player) {
						return "将一张红色牌当作" + "【" + get.translation(links[0][2]) + "】使用";
					},
					backup(links, player) {
						return {
							audio: "dcgengdu",
							filterCard(card, player) {
								return get.color(card) === "red";
							},
							popname: true,
							check(card) {
								return 6 - get.value(card);
							},
							position: "hes",
							viewAs: { name: links[0][2] },
						};
					},
				},
				hiddenCard(player, name) {
					const skill = "dcgengdu_red";
					const count = player.stat[player.stat.length - 1].skill[skill] || 0;
					if (count >= get.info(skill).usable(skill, player)) {
						return false;
					}
					return player.hasCard(card => {
						if (_status.connectMode && get.position(card) === "h") {
							return true;
						}
						return get.color(card) === "red";
					}, "hes");
				},
				ai: {
					fireAttack: true,
					skillTagFilter(player) {
						if (!player.countCards("hse", { color: "red" })) {
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
				intro: {
					content: "本阶段限$次，你可以将一张红色牌当作本回合未被使用过的普通锦囊牌使用",
				},
				onremove: true,
			},
			black: {
				audio: "dcgengdu",
				trigger: {
					player: "useCardAfter",
				},
				usable(skill, player) {
					return player.getStorage(skill, 0);
				},
				filter(event, player) {
					if (!player.getStorage("dcgengdu_black", 0)) {
						return false;
					}
					return get.color(event.card) == "black";
				},
				forced: true,
				locked: false,
				charlotte: true,
				async content(event, trigger, player) {
					const next = player.draw(2);
					next.gaintag.add("dcgengdu");
					await next;
					player.addTempSkill("dcgengdu_mark");
				},
				intro: {
					content: "本阶段限$次，你使用黑色牌后摸两张牌，这些牌本回合无法使用或打出且不计入手牌上限",
				},
				onremove: true,
			},
			mark: {
				charlotte: true,
				locked: true,
				onremove(player) {
					player.removeGaintag("dcgengdu");
				},
				mod: {
					ignoredHandcard(card, player) {
						if (card.hasGaintag("dcgengdu")) {
							return true;
						}
					},
					cardDiscardable(card, player, name) {
						if (name == "phaseDiscard" && card.hasGaintag("dcgengdu")) {
							return false;
						}
					},
					cardEnabled(card, player) {
						if (card.cards?.some(i => i.hasGaintag("dcgengdu"))) {
							return false;
						}
					},
					cardRespondable(card, player) {
						if (card.cards?.some(i => i.hasGaintag("dcgengdu"))) {
							return false;
						}
					},
					cardSavable(card, player) {
						if (card.cards?.some(i => i.hasGaintag("dcgengdu"))) {
							return false;
						}
					},
				},
			},
			red_backup: {},
		},
	}
```

### dcgumai 名字:孤脉
描述: 每轮限一次，你造成或受到伤害时，若你有手牌，你可以展示所有手牌并令此伤害+1/-1。若展示的牌花色均相同，你可以弃置一张手牌令此技能视为未发动过。
```js
dcgumai: {
		audio: 2,
		trigger: {
			player: "damageBegin3",
			source: "damageBegin1",
		},
		round: 1,
		filter(event, player) {
			return player.countCards("h");
		},
		check(event, player, name) {
			const { card } = event;
			if (name == "damageBegin3") {
				const effect = get.damageEffect(player, event.source, player, event.nature);
				const canFilterDamage = player.hasSkillTag("filterDamage", null, {
					player: event.source,
					card: event.card,
				});
				if (canFilterDamage) return false;
				return effect < 0;
			}
			const effect = get.damageEffect(event.player, player, player, event.nature);
			const canFilterDamage = event.player.hasSkillTag("filterDamage", null, {
				player,
				card,
			});
			if (canFilterDamage) return false;
			return effect > 0;
		},
		prompt2(event, player, name) {
			const target = event.player;
			const { source } = event;
			return `${player == target ? "你" : get.translation(target)}即将受到${source ? `来自${player == source ? "你" : get.translation(source)}` : "无来源"}的${event.num}点伤害，你可以展示所有手牌，令此伤害${name == "damageBegin1" ? "+" : "-"}1`;
		},
		async content(event, trigger, player) {
			const suit = get.suit(player.getCards("h")[0], player),
				bool = player.getCards("h").every(card => get.suit(card, player) == suit);
			await player.showHandcards(`${get.translation(player)}发动了【孤脉】`);
			if (event.triggername == "damageBegin1") {
				trigger.num++;
				player.popup(" +1 ", "fire");
				game.log(player, "令此伤害+1");
			} else {
				trigger.num--;
				player.popup(" -1 ", "water");
				game.log(player, "令此伤害-1");
			}
			if (bool) {
				const result = await player
					.chooseToDiscard("h", "孤脉：你可以弃置一张手牌并重置【孤脉】")
					.set("ai", card => {
						const { goon } = get.event();
						if (!goon) {
							return 0;
						}
						return 7 - get.value(card);
					})
					.set("goon", player.storage[`${event.name}_roundcount`])
					.forResult();
				if (result?.bool) {
					player.refreshSkill(event.name);
				}
			}
		},
	}
```

## dc_xiangchong 名字:新杀向宠 势力:shu

### dcguying 名字:固营
描述: 结束阶段，你可以选择一名角色，其获得以下效果直到你的下个结束阶段开始前：下次受到伤害后，摸体力上限张牌（至多摸五张），然后将X张手牌交给你（X为其手牌数减体力上限）。若在此期间此效果未触发，你下次发动〖固营〗可以多选择一名角色。
```js
dcguying: {
		getNum(player) {
			const history = player.getAllHistory("useSkill", evt => evt.skill == "dcguying");
			let count = 1;
			for (let i = history.length - 1; i >= 0; i--) {
				const record = history[i];
				if (record["dcguying_mark"] === true) {
					count++;
				} else {
					break;
				}
			}
			return count;
		},
		init(player, skill) {
			const num = get.info(skill).getNum(player);
			player.setStorage(skill, num, true);
			player.addTip(skill, `${get.translation(skill)} ${player.getStorage(skill)}`);
		},
		onremove(player, skill) {
			delete player.storage[skill];
			player.removeTip(skill);
		},
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			const num = get.info(event.skill).getNum(player);
			player.setStorage(event.skill, num, true);
			player.addTip(event.skill, `${get.translation(event.skill)} ${player.getStorage(event.skill)}`);
			event.result = await player
				.chooseTarget(get.prompt(event.skill), [1, num], `令至多${get.cnNumber(num)}名角色获得以下效果直到你的下个结束阶段开始前：下次受到伤害后，摸体力上限张牌（至多摸五张），然后将X张手牌交给你（X为其手牌数减体力上限）。若在此期间此效果未触发，你下次发动〖固营〗可以多选择一名角色。`)
				.set("ai", target => get.attitude(get.player(), target) / target.hp)
				.forResult();
		},
		async content(event, trigger, player) {
			const history = player.getAllHistory("useSkill", evt => evt.skill == event.name);
			if (history.length) {
				history[history.length - 1][event.name + "_mark"] = true;
			}
			const targets = event.targets,
				skill = event.name + "_effect";
			player.addTempSkill(skill, { player: "phaseJieshuBegin" });
			player.markAuto(skill, targets);
		},
		intro: { content: "当前【固营】角色数上限：#" },
		subSkill: {
			effect: {
				charlotte: true,
				onremove(player, skill) {
					delete player.storage[skill];
					lib.skill.dcguying.init(player, "dcguying");
				},
				marktext: "营",
				intro: { content: "$下次受到伤害后，摸体力上限张牌（至多摸五张），然后将超出体力上限的手牌交给你" },
				audio: "dcguying",
				trigger: { global: "damageEnd" },
				filter(event, player) {
					return event.num > 0 && player.getStorage("dcguying_effect").includes(event.player);
				},
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					const history = player.getAllHistory("useSkill", evt => evt.skill == "dcguying");
					if (history.length) {
						history[history.length - 1]["dcguying_mark"] = false;
					}
					lib.skill.dcguying.init(player, "dcguying");
					const target = trigger.player;
					player.unmarkAuto(event.name, target);
					if (!player.getStorage(event.name).length) {
						player.removeSkill(event.name);
					}
					await target.draw(Math.min(5, target.maxHp));
					const num = target.countCards("h") - target.maxHp;
					if (num > 0 && target != player) {
						await target
							.chooseToGive(`固营：将${get.cnNumber(num)}张手牌交给${get.translation(player)}`, player, num, true)
							.set("ai", card => {
								return (get.event().goon > 0 ? 8 : 6) - get.value(card);
							})
							.set("goon", get.attitude(target, player));
					}
				},
			},
		},
	}
```

### dcmuzhen 名字:睦阵
描述: 出牌阶段，你可以将一种类型的X张牌交给一名其他角色(X为本阶段此技能发动次数，每种类型限一次），然后选择一项:1.令其弃置等量其他类型的牌， 不足则全弃并展示手牌；2、获得其场上等量的牌；3、令其展示牌堆顶等量的牌，并获得其中类型相同的牌。
```js
dcmuzhen: {
		audio: 2,
		enable: "phaseUse",
		onChooseToUse(event) {
			if (game.online) {
				return;
			}
			const count = event.player.getHistory("useSkill", evt => evt.skill == "dcmuzhen" && evt.event.getParent("phaseUse") === event.getParent()).length + 1;
			event.set("dcmuzhen_count", count);
		},
		filter(event, player) {
			const types = player
					.getCards("he")
					.map(card => get.type2(card))
					.unique(),
				count = event.dcmuzhen_count;
			return types.length > 0 && types.some(type => !player.getStorage("dcmuzhen_used").includes(type) && player.countCards("he", card => get.type2(card, player) == type) >= count);
		},
		filterTarget: lib.filter.notMe,
		filterCard(card, player) {
			const selected = ui.selected.cards,
				type = get.type2(card, player),
				bool = !player.getStorage("dcmuzhen_used").includes(type);
			if (!selected.length) {
				return bool;
			}
			return get.type2(selected[0], player) == type && bool;
		},
		selectCard() {
			const count = get.event().dcmuzhen_count;
			return count;
		},
		position: "he",
		complexCard: true,
		lose: false,
		discard: false,
		delay: false,
		async content(event, trigger, player) {
			const cards = event.cards,
				num = cards.length,
				type = get.type2(cards[0], player),
				target = event.targets[0],
				str = get.translation(target);
			player.addTempSkill(event.name + "_used", ["phaseChange", "phaseAfter"]);
			player.markAuto(event.name + "_used", type);
			await player.give(cards, target);
			const list = [`令${str}弃置等量其他类型的牌`, `获得${str}场上等量的牌`, `令${str}展示牌堆顶等量的牌，并获得其中类型相同的牌`],
				controls = [1, 2, 3].map(num => "选项" + (num == 2 ? "二" : get.cnNumber(num)));
			if (!target.countGainableCards(player, "ej")) {
				list[1] = `<span style="opacity:0.5; ">${list[1]}</span>`;
				controls.remove(controls[1]);
			}
			const result = await player
				.chooseControl(controls)
				.set("choiceList", list)
				.set("prompt", `睦阵：令${str}执行一项`)
				.set("ai", () => {})
				.forResult();
			if (!result?.control) {
				return;
			}
			if (result.control == "选项一") {
				const resultx = await target
					.chooseToDiscard(`睦阵：请弃置${num}张类型不为${get.translation(type)}的牌`, "he", num, true, card => get.event().cardsx?.includes(card))
					.set(
						"cardsx",
						target.getCards("he", card => get.type2(card, target) != type)
					)
					.forResult();
				if (resultx?.cards?.length < num) {
					await target.showHandcards();
				}
			} else if (result.control == "选项二") {
				await player.gainPlayerCard(target, "ej", num, true);
			} else if (result.control == "选项三") {
				const cardsx = get.cards(num, true);
				await target.showCards(cardsx);
				const gain = cardsx.filter(card => get.type(card, false) === type);
				if (gain.length) {
					await target.gain(gain, "gain2");
				}
			}
		},
		subSkill: {
			used: {
				onremove: true,
				charlotte: true,
				intro: {
					content: "已交出过<span class=thundertext>$</span>",
				},
			},
		},
	}
```

## dc_xiahouxuan 名字:新杀夏侯玄 势力:wei

### dcboxuan 名字:博玄
描述: 你使用手牌结算完毕后，若此牌目标包含其他角色，你可展示牌堆底的三张牌，若其中有牌与你使用的牌：1.牌名字数相同，你摸一张牌；2.花色相同，你可弃置一名其他角色一张牌；3.类型相同，你可使用一张展示牌。
```js
dcboxuan: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			if (!event.targets?.length || !event.cards?.length) {
				return false;
			}
			if (!event.targets?.some(target => target != player) && !player.storage.dcboxuan) {
				return false;
			}
			return player.hasHistory("lose", evt => {
				const evtx = evt.relatedEvent || evt.getParent();
				if (evtx != event) {
					return false;
				}
				return evt.getl(player)?.hs?.length;
			});
		},
		frequent: true,
		check: () => true,
		async content(event, trigger, player) {
			const cards = get.bottomCards(3, true);
			await player.showCards(cards, `${get.translation(player)}发动了【博玄】`).set("log", (cards, player) => [player, "展示了牌堆底的", cards]);
			const list = ["cardNameLength", "suit", "type2"].map(attri => cards.some(card => get[attri](trigger.card) == get[attri](card)));
			if (list[0]) {
				await player.draw();
			}
			if (
				list[1] &&
				game.hasPlayer(target => {
					return target.countDiscardableCards(player, "he") && target != player;
				})
			) {
				const result = await player
					.chooseTarget(`博玄：你可弃置一名其他角色一张牌`, (card, player, target) => {
						return target.countDiscardableCards(player, "he") && target != player;
					})
					.set("ai", target => get.effect(target, { name: "guohe_copy2" }, get.player(), get.player()))
					.forResult();
				if (result?.targets) {
					player.line(result.targets);
					await player.discardPlayerCard(result.targets[0], "he", true);
				}
			}
			if (list[2] && cards.some(card => player.hasUseTarget(card, true, true))) {
				const result = await player
					.chooseCardButton(`博玄：你可以使用一张展示牌`, cards)
					.set("filterButton", button => get.player().hasUseTarget(button.link, true, true))
					.set("ai", button => get.player().getUseValue(button.link))
					.forResult();
				if (result?.links) {
					const card = result.links[0];
					if (player.hasUseTarget(card, true, true)) {
						await player.chooseUseTarget(card);
					}
				}
			}
			/*if (player.storage.dcboxuan) {
				const put = trigger.cards.filterInD("od");
				if (!put.length) return;
				const result = await player
					.chooseBool()
					.set("createDialog", [`博玄：是否将这些牌置于牌堆底`, put])
					.set("ai", () => Math.random() > 0.5)
					.forResult();
				if (result?.bool) {
					game.log(player, "将", put, "置于牌堆底");
					await game.cardsGotoPile(put);
				}
			}*/
		},
	}
```

### dcyizheng 名字:议政
描述: 你的回合开始时，你可与任意名其他角色各展示一张手牌，若展示的牌类型均相同，你可将这些牌交给一名角色，否则，你弃置这些牌。
```js
dcyizheng: {
		audio: 2,
		trigger: { player: ["phaseBegin"] },
		filter(event, player) {
			return (
				player.hasCards("h") &&
				game.hasPlayer(target => {
					return target != player && target.hasCards("h");
				})
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), [1, Infinity], (card, player, target) => {
					return target != player && target.hasCards("h");
				})
				.set("ai", target => {
					if (player.hp == 1) {
						return 0;
					}
					return -get.attitude(get.player(), target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const targets = [player].concat(event.targets).sortBySeat();
			//先选牌
			let showEvent = player
				.chooseCardOL(targets, "议政：请选择要展示的牌", true)
				.set("ai", function (card) {
					return -get.value(card);
				})
				.set("source", player);
			showEvent.aiCard = function (target) {
				const hs = target.getCards("h");
				return { bool: true, cards: [hs.randomGet()] };
			};
			showEvent._args.remove("glow_result");
			const result = await showEvent.forResult();
			const cards = [];
			for (var i = 0; i < targets.length; i++) {
				cards.push(result[i].cards[0]);
			}
			await player
				.showCards(cards, `${get.translation(player)} 发动了【${get.translation(event.name)}】`, false)
				.set("multipleShow", true)
				.set("customButton", button => {
					const target = get.owner(button.link);
					if (target) {
						button.node.gaintag.innerHTML = target.getName();
					}
				})
				.set("delay_time", targets.length * 1.5);
			if (cards.map(card => get.type2(card)).unique().length == 1) {
				player.popup("洗具");
				const result = await player
					.chooseTarget(true)
					.set("createDialog", [`议政：令一名角色获得这些牌`, cards])
					.set("ai", target => get.attitude(get.player(), target))
					.forResult();
				if (result?.targets) {
					const target = result.targets[0];
					player.line(target);
					let gainEvent = target.gain(cards);
					gainEvent.set(
						"givers",
						targets.filter(i => i != target)
					);
					gainEvent.set("animate", function (event) {
						const player = event.player,
							cards = event.cards,
							givers = event.givers;
						for (let i = 0; i < givers.length; i++) {
							givers[i].$give(cards[i], player);
						}
						return 500;
					});
					await gainEvent;
				}
			} else {
				player.popup("杯具");
				await game
					.loseAsync({
						lose_list: targets.map((target, index) => {
							return [target, [cards[index]]];
						}),
						discarder: player,
					})
					.setContent("discardMultiple");
			}
		},
	}
```

### dcguilin 名字:归林
描述: `限定技，出牌阶段或你进入濒死状态时，你可以将体力回复至体力上限，然后失去${get.poptip("dcyizheng")}并修改${get.poptip("dcboxuan")}。`
```js
dcguilin: {
		audio: 2,
		derivation: ["dcboxuan_rewrite"],
		limited: true,
		unique: true,
		skillAnimation: true,
		animationColor: "thunder",
		enable: "phaseUse",
		trigger: { player: "dying" },
		filter(event, player) {
			if (event.name == "dying") {
				return player.isDying();
			}
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.recoverTo(player.maxHp);
			await player.removeSkills("dcyizheng");
			if (player.hasSkill("dcboxuan", null, null, false)) {
				player.storage.dcboxuan = true;
			}
			game.log(player, "修改了", "#g【博玄】");
		},
		ai: {
			order: 10,
			result: {
				player: player => get.recoverEffect(player, player, player),
			},
		},
	}
```

## houcheng 名字:侯成 势力:qun

### dcxianniang 名字:献酿
描述: 每轮每项限一次，当你的牌被其他角色弃置或受到伤害后，你可以获得一名手牌数不小于你的角色至多两张牌，并可以交给另一名其他角色至多等量张牌；因此获得或交出的基本牌只能当【酒】使用。若你本轮因此技能获得其他角色的牌超过两张，则你失去1点体力。
```js
dcxianniang: {
		audio: 2,
		trigger: {
			player: ["loseAfter", "damageEnd"],
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			if (player.getStorage("dcxianniang_used").includes(event.name === "damage" ? "damage" : "lose")) {
				return false;
			}
			if (!game.hasPlayer(current => player.countCards("h") <= current.countCards("h") && current.hasCards(current == player ? "e" : "he"))) {
				return false;
			}
			if (event.name === "damage") {
				return true;
			}
			if (event.type !== "discard" || (event.discarder || event.getParent(2).player) === player) {
				return false;
			}
			return (event.getl?.(player)?.cards2 ?? []).length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return player.countCards("h") <= target.countCards("h") && target.hasCards(target == player ? "e" : "he");
				})
				.set("ai", target => {
					let att = get.attitude(get.player(), target) * -1;
					if (target.getHp() < target.countCards("h")) {
						return att * 2;
					}
					return att;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			player.addTempSkill(event.name + "_used", "roundStart");
			player.markAuto(event.name + "_used", trigger.name == "damage" ? "damage" : "lose");
			const {
				targets: [target],
			} = event;
			const tag = event.name + "_tag";
			const position = target != player ? "he" : "e";
			if (!target.hasGainableCards(player, position)) {
				return;
			}
			const next = player.gainPlayerCard(target, [1, 2], position, true);
			next.gaintag.add(tag);
			const { links } = await next.forResult();
			if (!links?.length) {
				return;
			}
			player.addSkill(tag);
			const num = links.length;
			const targetsx = game.filterPlayer(current => current != player && current != target);
			if (player.countCards("h") && targetsx.length) {
				const { bool, cards, targets } = await player
					.chooseCardTarget({
						prompt: "献酿：你可将至多" + get.cnNumber(num) + "张牌交给另一名其他角色",
						filterCard: true,
						position: "he",
						selectCard: [1, num],
						filterTarget: (card, player, target) => get.event().targetsx.includes(target),
						ai1(card) {
							if (card.name == "du") {
								return 10;
							}
							const player = get.player();
							if (
								!game.hasPlayer(current => {
									return get.attitude(player, current) > 0 && !current.hasSkillTag("nogain");
								})
							) {
								return 0;
							}
							return 1 / Math.max(0.1, get.value(card));
						},
						ai2(target) {
							let player = get.player(),
								att = get.attitude(player, target);
							if (ui.selected.cards[0].name == "du") {
								return -att;
							}
							if (target.hasSkillTag("nogain")) {
								att /= 6;
							}
							return att;
						},
						targetsx: targetsx,
					})
					.forResult();
				if (bool) {
					player.line(targets[0]);
					targets[0].addSkill(tag);
					const next = targets[0].gain(cards, player, "giveAuto");
					next.gaintag.add(tag);
					await next;
				}
			}
			if (player.getRoundHistory("gain", evt => evt.getParent(2).name == event.name && evt.source != player).reduce((num, evt) => num + evt.cards.length, 0) > 2) {
				await player.loseHp();
			}
		},
		subSkill: {
			tag: {
				charlotte: true,
				mod: {
					cardname(card) {
						const evt = get.event();
						if (evt.name !== "chooseToUse") {
							return;
						}
						if (get.type(card, null, false) == "basic" && card.hasGaintag("dcxianniang_tag")) {
							return "jiu";
						}
					},
					cardnature(card) {
						const evt = get.event();
						if (evt.name !== "chooseToUse") {
							return;
						}
						if (get.type(card, null, false) == "basic" && card.hasGaintag("dcxianniang_tag")) {
							return false;
						}
					},
				},
				ai: {
					save: true,
					skillTagFilter(player, tag, arg) {
						if (
							!player.countCards("h", card => {
								return get.type(card, null, false) == "basic" && card.hasGaintag("dcxianniang_tag");
							})
						) {
							return false;
						}
					},
				},
			},
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

## dc_zhangyì 名字:新杀张翼 势力:shu

### dcmurui 名字:暮锐
描述: 你可于以下时机点使用一张牌：1、每轮开始时；2、有角色死亡的回合结束后；3、你的回合开始时。若此牌造成了伤害，则你摸两张牌并删除对应选项。
```js
dcmurui: {
		//direct打赢复活赛力
		audio: 2,
		trigger: {
			global: ["roundStart", "phaseAfter"],
			player: "phaseBegin",
		},
		filter(event, player, name) {
			if (player.getStorage("dcmurui_filter").includes(name)) {
				return false;
			}
			return (name === "phaseAfter" && game.getGlobalHistory("everything", evt => evt.name == "die").length) || ["phaseBegin", "roundStart"].includes(name);
		},
		direct: true,
		clearTime: true,
		async content(event, trigger, player) {
			let name = event.triggername;
			player
				.when({ player: ["useCardAfter", "dcmurui"] }, false)
				.filter((evt, player, namex) => {
					return namex === "dcmurui" || (player.getStorage("dcmurui").includes(evt.card) && ["sourceDamage", "damage"].some(type => game.hasPlayer2(current => current.hasHistory(type, evtx => evt.card === evtx.card))));
				})
				.assign({ firstDo: true })
				.step(async (event, trigger, player) => {
					if (event.triggername === "dcmurui") {
						return;
					}
					await player.draw(2);
					player.markAuto("dcmurui_filter", name);
					player.markSkill("dcaoren");
				})
				.finish();
			const result = await player
				.chooseToUse("使用一张牌，若造成伤害则不能再于此时用牌")
				.set("oncard", () => {
					const event = get.event(),
						{ card, player } = event;
					player.markAuto("dcmurui", [card]);
				})
				.set("addCount", false)
				.set("logSkill", event.name)
				.forResult();
			await event.trigger("dcmurui");
		},
	}
```

### dcaoren 名字:鏖刃
描述: 每轮限X次（X为“暮锐”中已删除选项数），你使用的基本牌结算完毕后，可将之收回手牌。
```js
dcaoren: {
		audio: 2,
		intro: {
			markcount: (_, player) => player.getStorage("dcmurui_filter").length - player.countMark("dcaoren_used"),
			content: (_, player) => "当前剩余发动次数：" + (player.getStorage("dcmurui_filter").length - player.countMark("dcaoren_used")),
		},
		trigger: {
			player: "useCardAfter",
		},
		filter: (event, player) => player.countMark("dcaoren_used") < player.getStorage("dcmurui_filter").length && get.type(event.card) === "basic" && event.cards.filterInD().length,
		async content(event, trigger, player) {
			await player.gain(trigger.cards.filterInD(), "gain2");
			player.addMark("dcaoren_used", 1, false);
			player.addTempSkill("dcaoren_used", "roundStart");
		},
		ai: {
			combo: "dcmurui",
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

## panghong 名字:庞宏 势力:shu

### dcpingzhi 名字:评骘
描述: 转换技。出牌阶段限一次，你可观看一名角色的手牌并展示其中一张牌，阳：你弃置此牌，然后其视为对你使用一张【火攻】，若其未因此造成伤害则此技能视为未发动过；阴：然后其使用此牌，若此牌造成伤害则此技能视为未发动过。
```js
dcpingzhi: {
		audio: 2,
		mark: true,
		zhuanhuanji: true,
		marktext: "☯",
		usable: 1,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return target.countCards("h");
		},
		intro: {
			content(storage) {
				return "转换技，出牌阶段限一次，你可观看一名角色的手牌并展示其中一张牌，" + (storage ? "然后其使用此牌，若此牌造成伤害" : "你弃置此牌，然后其视为对你使用一张【火攻】，若其未因此造成伤害") + "则此技能视为未发动过。";
			},
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.changeZhuanhuanji(event.name);
			const result = await player
				.choosePlayerCard(target, true, `请选择${get.translation(target)}一张手牌展示`, "visible", "h")
				.set("ai", button => {
					const { player, target } = get.event(),
						{ link } = button;
					const att = get.attitude(player, target),
						storage = player.storage.dcpingzhi,
						huogong = get.autoViewAs({ name: "huogong", isCard: true });
					if (att > 0) {
						return storage ? 6 - get.value(link) : player.getUseValue(link);
					}
					return storage ? (get.value(link) + get.effect(player, huogong, target, player) < 0 && !player.hasCard(card => get.suit(card) == get.suit(link)) ? 2 : 0) : -target.getUseValue(link);
				})
				.forResult();
			if (!result?.cards?.length) {
				return;
			}
			const { cards } = result;
			player.addTempSkill(event.name + "_check", "phaseUseAfter");
			await player.showCards(cards, `${get.translation(player)}对${get.translation(target)}发动了【评骘】`);
			if (player.storage[event.name]) {
				await target.modedDiscard(cards, player);
				const huogong = get.autoViewAs({ name: "huogong", isCard: true });
				if (target.canUse(huogong, player, false)) {
					await target.useCard(huogong, player, false);
				} else if (player.getStat("skill")[event.name]) {
					delete player.getStat("skill")[event.name];
					game.log(player, "重置了", "#g【评骘】");
				}
			} else if (target.hasUseTarget(cards[0])) {
				await target.chooseUseTarget(cards[0], true, false);
			}
		},
		ai: {
			order(item, player) {
				const storage = player.storage.dcpingzhi;
				if (!storage) {
					return game.hasPlayer(current => get.effect(current, { name: "guohe_copy2" }, player, player) + get.effect(player, { name: "huogong" }, current, player) > 0) ? 10 : 1;
				}
				return game.hasPlayer(current => get.effect(current, { name: "guohe_copy2" }, player, player) > 0 || (current.hasCard(card => current.hasValueTarget(card) > 0, "h") && get.attitude(player, current) > 0)) ? 10 : 1;
			},
			result: {
				target(player, target) {
					const storage = player.storage.dcpingzhi;
					if (!storage) {
						return !player.countCards("h") || get.effect(target, { name: "guohe_copy2" }, player, player) + get.effect(player, { name: "huogong" }, target, player) > 0 ? -1 : 0;
					}
					return get.attitude(player, target) > 0 && target.hasCard(card => target.hasValueTarget(card) > 0, "h") ? 1 : get.effect(target, { name: "guohe_copy2" }, player, player);
				},
			},
		},
		subSkill: {
			check: {
				trigger: { global: "useCardAfter" },
				filter(event, player) {
					if (!player.getStat().skill.dcpingzhi) {
						return false;
					}
					if (player.storage.dcpingzhi) {
						return event.getParent().name == "dcpingzhi" && !game.hasPlayer2(current => current.hasHistory("damage", evtx => evtx.card === event.card));
					} else {
						return event.getParent(2).name == "dcpingzhi" && game.hasPlayer2(current => current.hasHistory("damage", evtx => evtx.card === event.card));
					}
				},
				charlotte: true,
				silent: true,
				async content(event, trigger, player) {
					delete player.getStat("skill").dcpingzhi;
					game.log(player, "重置了", "#g【评骘】");
				},
			},
		},
	}
```

### dcgangjian 名字:刚简
描述: 锁定技。每个回合结束时，若你本回合未受到过伤害，你摸X张牌（X为本回合展示过的牌数至多为5）。
```js
dcgangjian: {
		audio: 2,
		trigger: {
			global: "phaseAfter",
		},
		forced: true,
		filter(event, player) {
			if (player.getHistory("damage").length) {
				return false;
			}
			let num = 0;
			game.getGlobalHistory("everything", evt => {
				return evt.name == "showCards" && evt.cards.length;
			}).forEach(evt => {
				num += evt.cards.length;
			});
			return num > 0;
		},
		async content(event, trigger, player) {
			let num = 0;
			game.getGlobalHistory("everything", evt => {
				return evt.name == "showCards" && evt.cards.length;
			}).forEach(evt => {
				num += evt.cards.length;
			});
			await player.draw(Math.min(num, 5));
		},
	}
```

## yue_zhouyu 名字:乐周瑜 势力:wu

### dcguyin 名字:顾音
描述: 锁定技。①你的初始手牌数为0，其他角色的初始手牌数+1。②其他角色的初始手牌因使用或弃置进入弃牌堆后，你摸一张牌。
```js
dcguyin: {
		audio: 2,
		trigger: { global: ["loseAfter", "cardsDiscardAfter", "loseAsyncAfter", "gameDrawBegin"] },
		filter(event, player) {
			if (event.name == "gameDraw") {
				return true;
			} else if (event.name.indexOf("lose") === 0) {
				if (event.type != "discard" || event.getlx === false || event.position !== ui.discardPile) {
					return false;
				}
			} else {
				const evtx = event.getParent();
				if (evtx.name !== "orderingDiscard") {
					return false;
				}
				const evt2 = evtx.relatedEvent || evtx.getParent();
				if (evt2.name != "useCard") {
					return false;
				}
			}
			const list = game
				.filterPlayer2(current => player != current)
				.reduce((listx, i) => {
					if (i._start_cards) {
						listx.addArray(i._start_cards);
					}
					return listx;
				}, []);
			return game.hasPlayer(current => {
				const cards = event.name == "cardsDiscard" ? event.cards.filterInD("d") : event.getl(current)?.cards2 || [];
				return cards.some(card => list.includes(card));
			});
		},
		forced: true,
		async content(event, trigger, player) {
			if (trigger.name == "gameDraw") {
				const me = player;
				const numx = trigger.num;
				trigger.num = function (player) {
					return player == me ? 0 : 1 + (typeof numx == "function" ? numx(player) : numx);
				};
			} else {
				await player.draw();
			}
		},
	}
```

### dcpinglu 名字:平虏
描述: 出牌阶段，你可以获得攻击范围内所有其他角色各随机一张手牌。若如此做，直到这些牌离开你的手牌区，本技能此阶段失效。
```js
dcpinglu: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			if (player.hasCard(card => card.hasGaintag("dcpinglu_mark"), "h")) {
				return false;
			}
			return game.hasPlayer(current => get.info("dcpinglu").filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return player.inRange(target) && target.countGainableCards(player, "h");
		},
		selectTarget: -1,
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			const gains = [];
			for (const target of event.targets.sortBySeat()) {
				const cards = target.getCards("h", card => lib.filter.canBeGained(card, target, player));
				if (cards.length) {
					gains.push(cards.randomGet());
				}
			}
			if (!gains.length) {
				return;
			}
			player.addTempSkill(event.name + "_mark", "phaseUseAfter");
			const next = player.gain(gains, "giveAuto");
			next.gaintag.add(event.name + "_mark");
			await next;
		},
		ai: {
			order: 10,
			result: {
				player: 1,
			},
		},
		subSkill: {
			mark: {
				mod: {
					aiOrder(player, card, num) {
						if (
							get.itemtype(card) == "card" &&
							card.hasGaintag("dcpinglu_mark") &&
							game.hasPlayer(current => {
								return player.inRange(current) && current.countGainableCards(player, "h") && get.attitude(player, current) < 0;
							})
						) {
							return num + 0.1;
						}
					},
				},
				charlotte: true,
				onremove: (player, skill) => player.removeGaintag(skill),
			},
		},
	}
```

## yue_diaochan 名字:乐貂蝉 势力:qun

### dctanban 名字:檀板
描述: ①游戏开始时，你将手牌标记为“檀板”。②你的“檀板”牌不计入手牌上限。③摸牌阶段结束时，你可以交换两种牌的“檀板”标记。
```js
dctanban: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			const cards = player.getCards("h");
			player.addGaintag(cards, "dctanban");
		},
		mod: {
			ignoredHandcard(card) {
				if (card.hasGaintag("dctanban")) {
					return true;
				}
			},
			cardDiscardable(card, _, name) {
				if (name == "phaseDiscard" && card.hasGaintag("dctanban")) {
					return false;
				}
			},
		},
		group: "dctanban_change",
		subSkill: {
			change: {
				audio: "dctanban",
				trigger: { player: "phaseDrawEnd" },
				filter(event, player) {
					return player.countCards("h");
				},
				prompt2: () => "交换手牌中的“檀板”牌",
				check(event, player) {
					return player.countCards("h", card => !card.hasGaintag("dctanban")) * 2 < player.countCards("h");
				},
				async content(event, trigger, player) {
					const cards = player.getCards("h", card => !card.hasGaintag("dctanban"));
					player.removeGaintag("dctanban");
					player.addGaintag(cards, "dctanban");
				},
			},
		},
	}
```

### dcdiou 名字:低讴
描述: 当你使用实体牌含“檀板”牌结算完毕后，你可以展示一张非“檀板”手牌，然后视为使用之，若此牌为本回合首次被展示或牌名与你本次使用的牌名相同，则你摸两张牌。
```js
dcdiou: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			if (!player.hasCard(card => _status.connectMode || !card.hasGaintag("dctanban"), "h")) {
				return false;
			}
			return player.hasHistory("lose", evt => {
				const evtx = evt.relatedEvent || evt.getParent();
				if (evtx != event) {
					return false;
				}
				return Object.keys(evt.gaintag_map).some(i => evt.gaintag_map[i].includes("dctanban"));
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(get.prompt2(event.skill), (card, player) => {
					return !card.hasGaintag("dctanban");
				})
				.set("ai", card => {
					const player = get.player();
					const shown = game
						.getGlobalHistory("everything", evt => {
							return evt.name === "showCards";
						})
						.reduce((list, evt) => list.addArray(evt.cards), []);
					const cardx = {
						name: get.name(card, player),
						nature: get.nature(card, player),
						isCard: true,
					};
					return player.getUseValue(cardx) + (shown.includes(card) && get.event().getTrigger().card.name !== cardx.name) ? 0 : get.effect(player, { name: "draw" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const next = player.showCards(event.cards, get.translation(player) + "发动了【低讴】");
			await next;
			const cardx = {
				name: get.name(event.cards[0], player),
				nature: get.nature(event.cards[0], player),
				isCard: true,
			};
			if (get.type(cardx) !== "equip" && get.type(cardx) !== "delay" && player.hasUseTarget(cardx)) {
				await player.chooseUseTarget(cardx, true, false);
			}
			if (
				!game.getGlobalHistory(
					"everything",
					evt => {
						return evt.name === "showCards" && evt !== next && evt.cards.includes(event.cards[0]);
					},
					next
				).length ||
				trigger.card.name === cardx.name
			) {
				await player.draw(2);
			}
		},
		ai: {
			combo: "dctanban",
		},
	}
```

## dc_huangwudie 名字:黄舞蝶 势力:shu

### dcshuangrui 名字:双锐
描述: 准备阶段，你可以选择一名其他角色，视为对其使用一张【杀】；若该角色不在你攻击范围内，你令此【杀】不可被响应且本回合获得〖狩星〗，否则你令此【杀】伤害+1且本回合获得〖铩雪〗。
```js
dcshuangrui: {
		onChooseTarget(event, player) {
			event.targetprompt2.add(target => {
				if (event.getParent().skill !== "dcshuangrui" || !target.classList.contains("selectable")) {
					return;
				}
				if (player.inRange(target)) {
					return "加伤";
				} else {
					return "不可响应";
				}
			});
		},
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => {
				return current != player && player.canUse({ name: "sha", isCard: true }, current, false);
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), function (card, player, target) {
					return target != player && player.canUse({ name: "sha", isCard: true }, target, false);
				})
				.set("ai", target => {
					const player = get.player(),
						card = { name: "sha", isCard: true };
					return get.effect(target, card, player, player);
				})
				.set("_get_card", { name: "sha", isCard: true })
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			let directHit = [],
				baseDamage = 1;
			if (player.inRange(target)) {
				baseDamage++;
				await player.addTempSkills("dcshaxue");
			} else {
				directHit.addArray(game.players);
				await player.addTempSkills("dcshouxing");
			}
			await player.useCard({ name: "sha", isCard: true }, target, false).set("directHit", directHit).set("baseDamage", baseDamage);
		},
		ai: {
			skillTagFilter(player, tag, arg) {
				if (!_status.event.getParent("dcshuangrui_cost", true, true)) {
					return false;
				}
				return !player.inRange(arg.target);
			},
			directHit_ai: true,
		},
		derivation: ["dcshouxing", "dcshaxue"],
	}
```

### dcfuxie 名字:伏械
描述: 出牌阶段，你可以弃置一张武器牌或失去一个技能，令一名其他角色弃置两张牌。
```js
dcfuxie: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.countCards("he"));
		},
		chooseButton: {
			dialog(event, player) {
				const skills = player.getSkills(null, false, false).filter(skill => {
					let info = get.info(skill);
					if (!info || info.charlotte || get.skillInfoTranslation(skill, player).length == 0) {
						return false;
					}
					return true;
				});
				const dialog = ui.create.dialog("伏械：弃置一张武器牌或失去1个技能");
				dialog.direct = true;
				dialog.add([
					[["discardEquip1", "弃置武器牌"]],
					(item, type, position, noclick, node) => {
						node = ui.create.buttonPresets.tdnodes(item, type, position, noclick);
						node.link = ["discard", "equip1"];
						return node;
					},
				]);
				dialog.add([skills, "skill"]);
				return dialog;
			},
			filter(button, player) {
				if (Array.isArray(button.link)) {
					return player.countDiscardableCards(player, "he", card => get.subtype(card) == button.link[1]);
				}
				return true;
			},
			check(button) {
				const player = get.player();
				if (Array.isArray(button.link)) {
					if (player.countDiscardableCards(player, "he", card => get.subtype(card) == button.link[1] && get.value(card) < 10)) {
						return 3;
					}
					return 1;
				}
				if (["dcshouxing", "dcshaxue"].includes(button.link)) {
					return 4;
				}
				return 2;
			},
			backup(links, player) {
				return {
					audio: "dcfuxie",
					choice: links[0],
					filterCard(card) {
						const { choice } = get.info("dcfuxie_backup");
						if (Array.isArray(choice)) {
							return get.subtype(card) == "equip1" && lib.filter.cardDiscardable(card, player, "dcfuxie");
						}
						return false;
					},
					position: "he",
					selectCard() {
						const { choice } = get.info("dcfuxie_backup");
						if (Array.isArray(choice)) {
							return 1;
						}
						return -1;
					},
					filterTarget(card, player, target) {
						return target != player && target.countCards("he");
					},
					async content(event, trigger, player) {
						const { choice } = get.info("dcfuxie_backup");
						if (Array.isArray(choice)) {
							await player.modedDiscard(event.cards);
						} else {
							await player.removeSkills(choice);
						}
						const target = event.target;
						await target.chooseToDiscard(2, true, "he");
					},
					ai1(card) {
						return 10 - get.value(card);
					},
					ai2(target) {
						const player = get.player();
						return get.effect(target, { name: "guohe_copy2" }, player, player);
					},
				};
			},
			prompt(links, player) {
				let prompt = Array.isArray(links[0]) ? "弃置一张武器牌" : `失去【${get.translation(links[0])}】`;
				return `${prompt}，令一名角色弃置两张牌`;
			},
		},
		subSkill: {
			backup: {},
		},
		ai: {
			order: 3,
			result: {
				player(player, target) {
					if (["dcshouxing", "dcshaxue"].some(skill => player.hasSkill(skill))) {
						return 1;
					}
					if (player.countCards("he", card => get.subtype(card) == "equip1")) {
						return 1;
					}
					return 0;
				},
			},
		},
	}
```

## dc_mateng 名字:新杀马腾 势力:qun

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcxiongyi 名字:雄异
描述: 限定技，出牌阶段，你可以与一名其他角色各摸三张牌，然后若你体力值为全场唯一最少，你回复1点体力。当你脱离濒死状态后，你复原此技能并删去回复体力的效果。
```js
dcxiongyi: {
		skillAnimation: true,
		animationColor: "gray",
		unique: true,
		enable: "phaseUse",
		audio: "xiongyi",
		limited: true,
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await game.asyncDraw([event.target, player], 3);
			if (
				game
					.getAllGlobalHistory("everything", evt => {
						return evt.name == event.name && evt.player == player;
					})
					.indexOf(event) == 0 &&
				player.isMinHp(true)
			) {
				if (player.isDamaged()) {
					await player.recover();
				}
			}
			player.addAdditionalSkill(event.name, "dcxiongyi_restore");
		},
		ai: {
			order: 1,
			result: {
				target: 1,
			},
		},
		subSkill: {
			restore: {
				trigger: {
					player: "dyingAfter",
				},
				charlotte: true,
				direct: true,
				filter(event, player) {
					return player.isIn();
				},
				async content(event, trigger, player) {
					game.log(player, "重置了", "#g【雄异】");
					player.restoreSkill("dcxiongyi");
					player.addAdditionalSkill("dcxiongyi", []);
				},
			},
		},
	}
```

## dc_sp_zhurong 名字:新杀SP祝融 势力:qun

### dcremanhou 名字:蛮后
描述: `出牌阶段限一次，你可以摸至多四张牌并根据摸牌数依次执行以下等量项：①失去${get.poptip("dcretanluan")}；②弃置一张手牌；③弃置场上的一张牌；④失去1点体力，获得${get.poptip("dcretanluan")}。`
```js
dcremanhou: {
		audio: "dcmanhou",
		enable: "phaseUse",
		usable: 1,
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("###蛮后###摸至多四张牌并执行等量项");
			},
			chooseControl(event, player) {
				var list = Array.from({
					length: 4,
				}).map((_, i) => get.cnNumber(i + 1) + "张");
				list.push("cancel2");
				return list;
			},
			check(event, player) {
				if (get.effect(player, { name: "losehp" }, player, player) > 4 || player.countCards("hs", card => player.canSaveCard(card, player)) > 0 || player.hp > 2) {
					return "四张";
				}
				return "两张";
			},
			backup(result, player) {
				return {
					num: result.control,
					audio: "dcmanhou",
					filterCard: () => false,
					selectCard: -1,
					async content(event, trigger, player) {
						var num =
							Array.from({
								length: 4,
							})
								.map((_, i) => get.cnNumber(i + 1) + "张")
								.indexOf(lib.skill.dcremanhou_backup.num) + 1;
						await player.draw(num);
						if (num >= 1) {
							await player.removeSkills("dcretanluan");
						}
						if (num >= 2 && player.countCards("h")) {
							await player.chooseToDiscard("h", true);
						}
						if (num >= 3) {
							//await player.loseHp();
							if (game.hasPlayer(target => target.countDiscardableCards(player, "ej"))) {
								const [target] =
									(
										await player
											.chooseTarget(
												"弃置场上的一张牌",
												(card, player, target) => {
													return target.countDiscardableCards(player, "ej");
												},
												true
											)
											.set("ai", target => {
												const player = get.player();
												return get.effect(target, { name: "guohe_copy", position: "ej" }, player, player);
											})
											.forResult()
									).targets ?? [];
								if (target) {
									player.line(target);
									await player.discardPlayerCard(target, "ej", true);
								}
							}
						}
						if (num >= 4) {
							await player.loseHp();
							/*if (player.countCards("h")) {
								await player.chooseToDiscard("he", true);
							}*/
							await player.addSkills("dcretanluan");
						}
					},
				};
			},
		},
		ai: {
			order: 8,
			result: { player: 1 },
		},
		subSkill: { backup: {} },
		derivation: "dcretanluan",
	}
```

### dcretanluan 名字:探乱
描述: `出牌阶段限一次，你可以使用本回合弃牌堆中因弃置进入弃牌堆的一张牌，若你因此使用的牌被【无懈可击】抵消或对其他角色造成了伤害，则你重置${get.poptip("dcremanhou")}。`
```js
dcretanluan: {
		init(player, skill) {
			if (typeof player.getStat("skill")?.[skill] === "number") {
				delete player.getStat("skill")[skill];
			}
		},
		onChooseToUse(event) {
			if (!game.online && !event.dcretanluan) {
				event.set(
					"dcretanluan",
					game.filterPlayer2().reduce((list, target) => {
						return list.addArray(
							target
								.getHistory("lose", evt => {
									return evt.type === "discard";
								})
								.map(evt => evt.cards.filterInD("d"))
								.flat()
								.unique()
						);
					}, [])
				);
			}
		},
		audio: "dctanluan",
		enable: "phaseUse",
		filter(event, player) {
			return event.dcretanluan?.some(card => player.hasUseTarget(card));
		},
		usable: 1,
		chooseButton: {
			dialog(event, player) {
				const dialog = ui.create.dialog('###探乱###<div class="text center">' + lib.translate.dcretanluan_info + "</div>");
				dialog.add(event.dcretanluan);
				return dialog;
			},
			filter(button, player) {
				return player.hasUseTarget(button.link);
			},
			check(button) {
				const card = button.link;
				return get.player().getUseValue(card) * (get.tag(card, "damage") >= 1 ? 3 : 1);
			},
			prompt(links) {
				return '###探乱###<div class="text center">使用' + get.translation(links) + "，若此牌被【无懈可击】抵消或你因此对其他角色造成伤害，则重置〖蛮后〗</div>";
			},
			backup(links, player) {
				return {
					audio: "dctanluan",
					filterCard: () => false,
					selectCard: -1,
					popname: true,
					viewAs: links[0],
					card: links[0],
					async precontent(event, trigger, player) {
						player.addTempSkill("dcretanluan_effect");
						const card = get.info("dcretanluan_backup").card;
						event.result.cards = [card];
						event.result.card = get.autoViewAs(card, [card]);
						event.result.card.dcretanluan = true;
					},
				};
			},
		},
		subSkill: {
			backup: {},
			effect: {
				charlotte: true,
				audio: "dctanluan",
				trigger: {
					source: "damageSource",
					player: "eventNeutralized",
				},
				filter(event, player) {
					if (typeof player.getStat("skill")["dcremanhou"] !== "number") {
						return false;
					}
					if (event.name == "damage") {
						return event.card?.dcretanluan === true && event.player != player;
					}
					if (event.type != "card" && event.name != "_wuxie") {
						return false;
					}
					return event.card?.dcretanluan === true; // && !player.getStorage("dcremanhou_record").includes(event.player)
				},
				forced: true,
				async content(event, trigger, player) {
					delete player.getStat("skill")["dcremanhou"];
					player.popup("dcremanhou");
					game.log(player, "重置了技能", "【" + get.translation("dcremanhou") + "】");
					/*player.addTempSkill("dcremanhou_record");
					player.markAuto("dcremanhou_record", [trigger.player]);*/
				},
			},
			record: {
				charlotte: true,
				onremove: true,
				intro: { content: "【探乱】已记录角色：$" },
			},
		},
	}
```

## yue_zhugeguo 名字:乐诸葛果 势力:shu

### dcxidi 名字:羲笛
描述: 锁定技。①游戏开始时，你将手牌标记为“笛”。②你的“笛”牌不计入手牌上限。③准备阶段或结束阶段，你观看牌堆顶X张牌，然后将这些牌以任意顺序置于牌堆顶和牌堆底（X为你手牌中的“笛”数且至少为1）。
```js
dcxidi: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		async content(event, trigger, player) {
			const cards = player.getCards("h");
			player.addGaintag(cards, "dcxidi_tag");
		},
		mod: {
			ignoredHandcard(card) {
				if (card.hasGaintag("dcxidi_tag")) {
					return true;
				}
			},
			cardDiscardable(card, _, name) {
				if (name == "phaseDiscard" && card.hasGaintag("dcxidi_tag")) {
					return false;
				}
			},
		},
		group: "dcxidi_guanxing",
		subSkill: {
			guanxing: {
				audio: "dcxidi",
				trigger: { player: ["phaseZhunbeiBegin", "phaseJieshuBegin"] },
				forced: true,
				locked: false,
				preHidden: true,
				async content(event, trigger, player) {
					const num = Math.max(
						1,
						player.countCards("h", card => card.hasGaintag("dcxidi_tag"))
					);
					const result = player.chooseToGuanxing(num).set("prompt", "羲笛：点击或拖动将牌移动到牌堆顶或牌堆底").forResult();
					if (!result.bool || !result.moved[0].length) {
						player.addTempSkill("guanxing_fail");
					}
				},
				ai: {
					guanxing: true,
					skillTagFilter(player, tag, arg) {
						if (tag === "guanxing") {
							return true;
						}
					},
				},
			},
		},
	}
```

### dcchengyan 名字:乘烟
描述: 当你使用【杀】或普通锦囊牌指定其他角色为目标后，你可以摸一张牌并展示之，若展示牌为【杀】或可指定目标的普通锦囊牌，你将使用牌对其的结算方式改为展示牌牌名的结算方式；否则，你摸一张牌并标记为“笛”。
```js
dcchengyan: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (event.card.name != "sha" && get.type(event.card) != "trick") {
				return false;
			}
			if (!event.isFirstTarget) {
				return false;
			}
			return event.target != player;
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const target = trigger.target;
			const cards = (await player.draw().forResult()).cards;
			if (get.itemtype(cards) != "cards") {
				return;
			}
			await player.showCards(cards, get.translation(player) + "发动了【乘烟】");
			const card = cards[0];
			if (card.name == "sha" || (get.type(card, false) == "trick" && get.info(card, false).filterTarget)) {
				player.addTempSkill("dcchengyan_effect");
				player.markAuto("dcchengyan_effect", [[trigger.card, card, target]]);
			} else {
				await player.draw().set("gaintag", ["dcxidi_tag"]);
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				trigger: { player: "useCardToBegin" },
				filter(event, player) {
					const storage = player.getStorage("dcchengyan_effect");
					return storage.some(list => list[0] == event.card && list[2] == event.target);
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					const list = player.getStorage("dcchengyan_effect").find(list => list[0] == trigger.card && list[2] == trigger.target);
					trigger.setContent(lib.card[list[1].name].content);
				},
			},
		},
	}
```

## yue_zoushi 名字:乐邹氏 势力:qun

### dcyunzheng 名字:韵筝
描述: 锁定技。①游戏开始时，你将手牌标记为“筝”。②你的“筝”牌不计入手牌上限。③手牌中有“筝”的其他角色的非锁定技失效。
```js
dcyunzheng: {
		audio: 2,
		init() {
			game.addGlobalSkill("dcyunzheng_global");
		},
		onremove() {
			if (!game.hasPlayer(i => i.hasSkill("dcyunzheng", null, null, false), true)) {
				game.removeGlobalSkill("dcyunzheng_global");
			}
		},
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		async content(event, trigger, player) {
			const cards = player.getCards("h");
			player.addGaintag(cards, "eternal_dcyunzheng_tag");
		},
		mod: {
			ignoredHandcard(card) {
				if (card.hasGaintag("eternal_dcyunzheng_tag")) {
					return true;
				}
			},
			cardDiscardable(card, _, name) {
				if (name == "phaseDiscard" && card.hasGaintag("eternal_dcyunzheng_tag")) {
					return false;
				}
			},
		},
		group: "dcyunzheng_fengyin",
		subSkill: {
			fengyin: {
				audio: "dcyunzheng",
				trigger: {
					global: ["phaseBefore", "loseAfter", "loseAsyncAfter", "gainAfter", "equipAfter", "addJudgeAfter", "addToExpansionAfter"],
					player: ["dchuoxin_update", "enterGame"],
				},
				filter(event, player) {
					if (
						["lose", "loseAsync", "equip", "addJudge", "addToExpansion"].includes(event.name) &&
						!game.hasPlayer(target => {
							const evt = event.getl(target);
							return evt && (evt.hs || []).length;
						})
					) {
						return false;
					}
					return game.hasPlayer(target => {
						if (player === target) {
							return false;
						}
						return target.hasCard(card => card.hasGaintag("eternal_dcyunzheng_tag"), "h") == !target.hasSkill("dcyunzheng_block");
					});
				},
				logTarget(event, player) {
					return game
						.filterPlayer(target => {
							if (player === target) {
								return false;
							}
							return target.hasCard(card => card.hasGaintag("eternal_dcyunzheng_tag"), "h") == !target.hasSkill("dcyunzheng_block");
						})
						.sortBySeat();
				},
				forced: true,
				async content(event, trigger, player) {
					const targets = game
						.filterPlayer(target => {
							if (player === target) {
								return false;
							}
							return target.hasCard(card => card.hasGaintag("eternal_dcyunzheng_tag"), "h") == !target.hasSkill("dcyunzheng_block");
						})
						.sortBySeat();
					for (const target of targets) {
						target[target.hasSkill("dcyunzheng_block") ? "removeSkill" : "addSkill"]("dcyunzheng_block");
					}
				},
			},
			global: {
				mod: {
					aiValue(player, card, num) {
						if (num <= 0 || get.itemtype(card) !== "card" || !card.hasGaintag("eternal_dcyunzheng_tag")) {
							return;
						}
						if (player.hasSkill("dcyunzheng")) {
							return num * 1.2;
						}
						return num / 10;
					},
					aiUseful(player, card, num) {
						if (num <= 0 || get.itemtype(card) !== "card" || !card.hasGaintag("eternal_dcyunzheng_tag")) {
							return;
						}
						if (player.hasSkill("dcyunzheng")) {
							return num * 1.2;
						}
						return num / 10;
					},
					aiOrder(player, card, num) {
						if (num <= 0 || get.itemtype(card) !== "card" || !card.hasGaintag("eternal_dcyunzheng_tag")) {
							return;
						}
						if (player.hasSkill("dcyunzheng")) {
							return num * 0.8;
						}
						return num * 10;
					},
				},
				trigger: {
					player: ["dieAfter", "loseAfter"],
					global: ["loseAsyncAfter", "cardsDiscardAfter", "equipAfter", "addJudgeAfter", "addToExpansionAfter"],
				},
				filter(event, player) {
					if (event.name == "die") {
						return !game.hasPlayer(cur => cur.hasSkill("dcyunzheng", null, null, false), true);
					}
					return event.getd?.(player, "cards2")?.some(card => card.hasGaintag("eternal_dcyunzheng_tag"));
				},
				silent: true,
				forceDie: true,
				async content(event, trigger, player) {
					if (trigger.name == "die") {
						game.removeGlobalSkill("dcyunzheng_gloabl");
						game.countPlayer(cur => cur.removeSkill("dcyunzheng_block"));
					} else {
						for (const card of trigger.getd(player, "cards2")) {
							if (card.hasGaintag("eternal_dcyunzheng_tag")) {
								game.broadcastAll(card => {
									card.removeGaintag("eternal_dcyunzheng_tag");
								}, card);
							}
						}
					}
				},
			},
			block: {
				inherit: "fengyin",
			},
		},
	}
```

### dchuoxin 名字:惑心
描述: 当你使用非装备牌时，你可以展示一名其他角色的一张手牌并将此牌标记为“筝”。若此牌已为“筝”牌或与你使用牌花色相同，你可以获得之。
```js
dchuoxin: {
		audio: 2,
		trigger: { player: "useCard" },
		filter(event, player) {
			return (
				get.type(event.card) !== "equip" &&
				game.hasPlayer(current => {
					return player !== current && current.countCards("h");
				})
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget(card, player, target) {
						return player !== target && target.countCards("h") > 0;
					},
					ai(target) {
						let att = get.attitude(get.player(), target);
						if (att > 0) {
							return 0;
						}
						if (!target.hasSkill("dcyunzheng_block")) {
							att *=
								target.getSkills(null, false, false).filter(i => {
									return lib.skill.dcyunzheng_block.skillBlocker(i, target);
								}).length + 1;
						}
						return 1 - att;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player
				.choosePlayerCard({
					prompt: "惑心：展示" + get.translation(target) + "的一张手牌",
					position: "h",
					target,
					forced: true,
				})
				.forResult();
			const tag = "eternal_dcyunzheng_tag";
			if (result.bool) {
				let cards = result.cards.slice();
				await player.showCards(cards, get.translation(player) + "发动了【惑心】");
				const cardx = cards.filter(card => card.hasGaintag(tag) || get.suit(card) == get.suit(trigger.card));
				if (cards.some(card => !card.hasGaintag(tag))) {
					target.addGaintag(
						cards.filter(card => !card.hasGaintag(tag)),
						"eternal_dcyunzheng_tag"
					);
					await event.trigger("dchuoxin_update");
				}
				if (cardx.length) {
					const result2 = await player
						.chooseBool({
							prompt: "惑心：是否获得" + get.translation(cardx) + "？",
							choice: get.value(cardx, player) > 7,
						})
						.forResult();
					if (result2.bool) {
						await player.gain({
							cards: cardx,
							source: target,
							animate: "give",
						});
						/*if (cardx[0].hasGaintag("eternal_dcyunzheng_tag")) {
							next.gaintag.add("eternal_dcyunzheng_tag");
						}*/
						//await event.trigger("dchuoxin_update");
					}
					cards.removeArray(cardx);
				}
			}
		},
	}
```

## yue_miheng 名字:乐祢衡 势力:qun

### dcjigu 名字:激鼓
描述: 锁定技。①游戏开始时，你将手牌标记为“激鼓”。②你的“激鼓”牌不计入手牌上限。③当你造成或受到伤害后，若你的“激鼓”牌数等于你的装备区牌数，你摸X张牌（X为你的空缺装备栏数）。然后若你本轮〖激鼓〗发动次数不小于已进行过回合的角色数，此效果本轮失效。
```js
dcjigu: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		async content(event, trigger, player) {
			const cards = player.getCards("h");
			player.addGaintag(cards, "dcjigu");
		},
		mod: {
			ignoredHandcard(card) {
				if (card.hasGaintag("dcjigu")) {
					return true;
				}
			},
			cardDiscardable(card, _, name) {
				if (name == "phaseDiscard" && card.hasGaintag("dcjigu")) {
					return false;
				}
			},
		},
		group: "dcjigu_temp",
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
			temp: {
				audio: "dcjigu",
				trigger: {
					player: "damageEnd",
					source: "damageSource",
				},
				filter(event, player) {
					return player.countCards("e") == player.countCards("h", card => card.hasGaintag("dcjigu"));
				},
				forced: true,
				prompt2(event, player) {
					return (
						"摸" +
						get.cnNumber(
							Array.from({ length: 5 })
								.map((_, i) => i + 1)
								.reduce((sum, i) => sum + player.countEmptySlot(i), 0)
						) +
						"张牌"
					);
				},
				async content(event, trigger, player) {
					player.addTempSkill("dcjigu_used", { global: "roundStart" });
					player.addMark("dcjigu_used", 1, false);
					await player.draw(
						Array.from({ length: 5 })
							.map((_, i) => i + 1)
							.reduce((sum, i) => sum + player.countEmptySlot(i), 0)
					);
					let num1 = player.countMark("dcjigu_used");
					let num2 = game.countPlayer2(current => {
						return current.actionHistory.some(i => i.isMe && !i.isSkipped);
					});
					if (num1 >= num2) {
						player.tempBanSkill(event.name, "roundStart");
					}
				},
			},
		},
	}
```

### dcsirui 名字:思锐
描述: 出牌阶段限一次，你可以将一张牌当作与其字数相同的一张无距离和次数限制的基本牌或普通锦囊牌使用。
```js
dcsirui: {
		audio: 2,
		mod: {
			targetInRange(card) {
				if (card.storage && card.storage.dcsirui) {
					return true;
				}
			},
			cardUsable(card, player, num) {
				if (card.storage && card.storage.dcsirui) {
					return Infinity;
				}
			},
		},
		enable: "phaseUse",
		filter(event, player) {
			if (!player.countCards("hes")) {
				return false;
			}
			return get
				.inpileVCardList(info => {
					const name = info[2];
					if (get.type(name) != "basic" && get.type(name) != "trick") {
						return false;
					}
					return true;
				})
				.some(card => player.hasCard(cardx => get.cardNameLength(cardx) == get.cardNameLength(card[2]) && player.hasUseTarget(get.autoViewAs({ name: card[2], nature: card[3], storage: { dcsirui: true } }, [cardx]), false, false), "hes"));
		},
		usable: 1,
		locked: false,
		chooseButton: {
			dialog(event, player) {
				const list = get
					.inpileVCardList(info => {
						const name = info[2];
						if (get.type(name) != "basic" && get.type(name) != "trick") {
							return false;
						}
						return true;
					})
					.filter(card => player.hasCard(cardx => get.cardNameLength(cardx) == get.cardNameLength(card[2]) && player.hasUseTarget(get.autoViewAs({ name: card[2], nature: card[3], storage: { dcsirui: true } }, [cardx]), false, false), "hes"));
				return ui.create.dialog("思锐", [list, "vcard"]);
			},
			check(button) {
				return get.event().player.getUseValue({
					name: button.link[2],
					nature: button.link[3],
					storage: { dcsirui: true },
				});
			},
			backup(links, player) {
				return {
					audio: "dcsirui",
					filterCard(card, player) {
						return get.cardNameLength(card) == get.cardNameLength(lib.skill.dcsirui_backup.viewAs.name);
					},
					popname: true,
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						storage: { dcsirui: true },
					},
					check(card) {
						return 7 - get.value(card);
					},
					position: "hes",
					async precontent(event, trigger, player) {
						event.getParent().addCount = false;
					},
				};
			},
			prompt(links, player) {
				return "将一张字数为" + get.cardNameLength(links[0][2]) + "的牌当作" + get.translation(links[0][3] || "") + "【" + get.translation(links[0][2]) + "】使用";
			},
		},
		ai: {
			order(item, player) {
				let list = get
					.inpileVCardList(info => {
						const name = info[2];
						if (get.type(name) != "basic" && get.type(name) != "trick") {
							return false;
						}
						return true;
					})
					.filter(card => player.hasCard(cardx => get.cardNameLength(cardx) == get.cardNameLength(card[2]) && player.hasUseTarget(get.autoViewAs({ name: card[2], nature: card[3] }, [cardx]), false, false), "hes"))
					.map(card => {
						return { name: card[2], nature: card[3] };
					})
					.filter(card => player.getUseValue(card, true, true) > 0);
				if (!list.length) {
					return 0;
				}
				list.sort((a, b) => (player.getUseValue(b, true, true) || 0) - (player.getUseValue(a, true, true) || 0));
				return get.order(list[0], player) * 0.99;
			},
			result: { player: 1 },
		},
		subSkill: {
			backup: { audio: "dcsirui" },
		},
	}
```

## dc_lifeng 名字:李丰 势力:shu

### dctunchu 名字:囤储
描述: 锁定技。①你的初始手牌数为游戏人数的四倍。②你的手牌不能被弃置。③准备阶段，若你的手牌数大于你的体力值，则你本回合至多使用三张牌。
```js
dctunchu: {
		audio: 2,
		trigger: { global: "gameDrawBegin" },
		forced: true,
		async content(event, trigger, player) {
			const me = player;
			const numx = trigger.num;
			const sum = game.players.slice().concat(game.dead).length * 4;
			trigger.num = player => (player == me ? sum : typeof numx == "function" ? numx(player) : numx);
		},
		mod: {
			cardDiscardable(card, player) {
				if (get.position(card) == "h") {
					return false;
				}
			},
			canBeDiscarded(card, player) {
				if (get.position(card) == "h") {
					return false;
				}
			},
			aiOrder(player, card, num) {
				if (num > 0 && get.name(card, player) == "huogong") {
					return 0;
				}
			},
			aiValue(player, card, num) {
				if (num > 0 && get.name(card, player) == "huogong") {
					return 0.01;
				}
			},
			aiUseful(player, card, num) {
				if (num > 0 && get.name(card, player) == "huogong") {
					return 0;
				}
			},
		},
		group: "dctunchu_limit",
		subSkill: {
			limit: {
				audio: "dctunchu",
				trigger: { player: "phaseZhunbeiBegin" },
				filter(event, player) {
					return player.countCards("h") > player.getHp();
				},
				forced: true,
				async content(event, trigger, player) {
					player.addTempSkill("dctunchu_debuff");
					player.addMark("dctunchu_debuff", 3, false);
				},
			},
			debuff: {
				mark: true,
				intro: {
					markcount(storage) {
						return (storage || 0).toString();
					},
					content(storage) {
						return "还可使用" + (storage || 0).toString() + "张牌";
					},
				},
				charlotte: true,
				onremove: true,
				trigger: { player: "useCard0" },
				filter(event, player) {
					return player.hasMark("dctunchu_debuff");
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					player.removeMark("dctunchu_debuff", 1, false);
				},
				mod: {
					cardEnabled(card, player) {
						if (player.hasMark("dctunchu_debuff")) {
							return;
						}
						if (get.itemtype(card) == "card" && get.position(card) == "h") {
							return false;
						}
						if (card.cards && (card.cards || []).some(i => get.position(i) == "h")) {
							return false;
						}
					},
					cardSavable() {
						return lib.skill.dctunchu.subSkill.debuff.mod.cardEnabled.apply(this, arguments);
					},
				},
			},
		},
	}
```

### dcshuliang 名字:输粮
描述: 一名角色的回合结束时，你可以将任意张牌交给任意名没有手牌的角色各一张，然后本次获得可以指定自己为目标的牌的角色可以依次选择是否使用本次获得的牌。
```js
dcshuliang: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			return player.countCards("he") && game.hasPlayer(target => !target.countCards("h"));
		},
		async cost(event, trigger, player) {
			const num = Math.min(
				player.countCards("he"),
				game.countPlayer(target => !target.countCards("h"))
			);
			let list = [];
			while (num - list.length > 0) {
				const { bool, targets, cards } = await player
					.chooseCardTarget({
						prompt: list.length ? "是否继续发动【输粮】？" : get.prompt(event.skill),
						prompt2: lib.translate.dcshuliang_info,
						position: "he",
						animate: false,
						filterCard(card, player) {
							return !get.event().list.some(list => list[1] == card);
						},
						filterTarget(card, player, target) {
							return !target.countCards("h") && !get.event().list.some(list => list[0] == target);
						},
						ai1(card) {
							if (card.name == "du") {
								return 200;
							}
							let info = get.info(card);
							if (info && info.toself) {
								return 10;
							}
							return get.unuseful(card);
						},
						ai2(target) {
							const player = get.event().player,
								att = get.attitude(player, target);
							if (
								player.hasCard(card => {
									return card.name == "du" && !get.event().list.some(list => list[1] == card);
								}, "h") &&
								!target.countCards("h") &&
								!get.event().list.some(list => list[0] == target) &&
								!target.hasSkillTag("nodu")
							) {
								return -200 * att;
							}
							return att;
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
			event.result = {
				bool: Boolean(list.length),
				targets: list.slice().map(list => list[0]),
				cards: list.slice().flatMap(list => list[1]),
				cost_data: list,
			};
		},
		async content(event, trigger, player) {
			const list = event.cost_data;
			await game
				.loseAsync({
					gain_list: list,
					player: player,
					cards: event.cards,
					giver: player,
					animate: "giveAuto",
				})
				.setContent("gaincardMultiple");
			for (let i = 0; i < list.length; i++) {
				const target = event.targets[i],
					card = event.cards[i];
				if (get.owner(card) == target && get.position(card) == "h" && target.canUse(card, target)) {
					await target.chooseUseTarget(card);
				}
			}
		},
	}
```

## wupu 名字:吴普 势力:qun

### dcduanti 名字:锻体
描述: 锁定技。当你使用或打出牌结算结束后，若此牌是你本局游戏使用或打出过的牌中的第5X张牌（X∈N⁺），你回复1点体力，然后若你以此法增加的上限小于5，你加1点体力上限。
```js
dcduanti: {
		audio: 2,
		trigger: {
			player: ["useCardAfter", "respondAfter"],
		},
		forced: true,
		filter(event, player) {
			return event._copdcduanti;
		},
		onremove: ["dcduanti", "dcduanti_counter"],
		group: "dcduanti_counter",
		async content(event, trigger, player) {
			await player.recover();
			if (player.countMark("dcduanti") >= 5) {
				return;
			}
			player.addMark("dcduanti", 1, false);
			await player.gainMaxHp();
		},
		subSkill: {
			counter: {
				trigger: {
					player: ["useCard1", "respond"],
				},
				forced: true,
				charlotte: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					if (!player.countMark("dcduanti_counter")) {
						const num = game.getAllGlobalHistory("everything", evt => {
							return evt.player === player && ["useCard", "respond"].includes(evt.name) && evt !== trigger;
						}).length;
						if (num) {
							player.addMark("dcduanti_counter", num, false);
						}
					}
					player.addMark("dcduanti_counter", 1, false);
					if (player.countMark("dcduanti_counter") % 5 === 0) {
						trigger._copdcduanti = true;
					}
					player.markSkill("dcduanti");
				},
			},
		},
		intro: {
			markcount(storage, player) {
				return player.countMark("dcduanti_counter");
			},
			content(storage, player) {
				return `<li>已使用过${get.cnNumber(player.countMark("dcduanti_counter"))}张牌<br><li>已以此法增加${player.countMark("dcduanti")}点体力上限`;
			},
		},
	}
```

### dcshicao 名字:识草
描述: 出牌阶段，你可以声明一种类型，然后选择从牌堆顶或牌堆底摸一张牌。若此牌类型与你声明的类型不同，你观看牌堆另一端的两张牌，此技能本回合失效。
```js
dcshicao: {
		audio: 2,
		enable: "phaseUse",
		onremove: ["dcshicao_aiRecord"],
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("###识草###选择一种类型与要摸牌的来源", [["caoying_basic", "caoying_trick", "caoying_equip"], "vcard"], [["牌堆顶", "牌堆底"], "tdnodes"]);
			},
			check(button) {
				const player = get.player();
				const bottom = player.storage.dcshicao_bottom,
					aiStorage = player.getStorage("dcshicao_aiRecord");
				if (bottom && aiStorage.length > 0 && ui.cardPile.lastChild && get.name(ui.cardPile.lastChild, false) === get.name(aiStorage.lastItem, false)) {
					if (button.link === "牌堆底" || button.link[2].slice(8) === get.type2(aiStorage.lastItem, false)) {
						return 20;
					}
				}
				if (button.link === "牌堆顶" || button.link[2].slice(8) === "basic") {
					return 10;
				}
				return 5 + Math.random();
			},
			filter(button, player) {
				if (!ui.selected.buttons.length) {
					return true;
				}
				return ui.selected.buttons[0].parentNode != button.parentNode;
			},
			select: 2,
			backup(links, player) {
				if (links[0].includes("牌堆")) {
					links.reverse();
				}
				return {
					audio: "dcshicao",
					type: links[0][2].slice(8),
					pos: links[1],
					filterCard: () => false,
					selectCard: -1,
					async content(event, trigger, player) {
						let { type, pos } = lib.skill.dcshicao_backup;
						game.log(player, "声明了", `#y${get.translation(type)}牌`);
						const next = player.draw();
						const bottom = pos === "牌堆底";
						if (bottom) {
							next.set("bottom", true);
							if (player.getStorage("dcshicao_aiRecord").length > 0) {
								player.storage.dcshicao_aiRecord.pop();
							}
						}
						const drawnCards = (await next.forResult()).cards;
						if (get.type2(drawnCards[0], player) === type) {
							return;
						}
						let cards;
						if (!bottom) {
							cards = get.bottomCards(2);
							cards.reverse();
						} else {
							cards = get.cards(2);
						}
						await game.cardsGotoOrdering(cards);
						await player.viewCards(`${bottom ? "牌堆顶" : "牌堆底"}的两张牌(靠左的在牌堆更靠上)`, cards);
						player.storage.dcshicao_record = cards.slice();
						player.storage.dcshicao_aiRecord = cards.slice();
						player.storage.dcshicao_bottom = !bottom;
						const skill = "dcshicao";
						player.localMarkSkill(skill, player, event);
						if (bottom) {
							cards.reverse();
						}
						await game.cardsGotoPile(cards, bottom ? "insert" : null);
						player.tempBanSkill(skill);
					},
					ai: {
						result: { player: 1 },
					},
				};
			},
			prompt(links, player) {
				return `点击“确定”，从${links[1]}摸一张牌`;
			},
		},
		intro: {
			mark(dialog, content, player) {
				var cards = player.getStorage("dcshicao_record");
				if (cards && cards.length) {
					if (player.isUnderControl(true)) {
						dialog.addText(`上一次观看的${player.storage.dcshicao_bottom ? "牌堆底" : "牌堆顶"}的牌：`);
						dialog.addAuto(cards);
						dialog.addText("（牌堆顶——牌堆底）");
					} else {
						return "不给看";
					}
				}
			},
		},
		subSkill: {
			backup: {},
		},
		ai: {
			order: 8,
			result: {
				player: 1,
			},
		},
	}
```

## zangba 名字:zangba 势力:wei

### rehengjiang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## gongsunxiu 名字:公孙修 势力:qun

### dcgangu 名字:干蛊
描述: 锁定技。每回合限一次。当其他角色失去体力后，你摸三张牌，然后若你的体力不为全场最小，你失去1点体力。
```js
dcgangu: {
		audio: 2,
		trigger: { global: "loseHpAfter" },
		filter(event, player) {
			return event.player !== player;
		},
		usable: 1,
		forced: true,
		async content(event, trigger, player) {
			await player.draw(3);
			if (!player.isMinHp()) {
				await player.loseHp();
			}
		},
		ai: {
			combo: "dckuizhen",
			halfneg: true,
		},
	}
```

### dckuizhen 名字:溃阵
描述: 出牌阶段限一次，你可以交给一名其他角色任意张手牌并随机获得其等量张手牌，以此法留在其手牌的牌成为“溃阵”牌。其他角色使用“溃阵”牌时，你摸一张牌。其失去全部“溃阵”牌的回合结束时，失去1点体力。
```js
dckuizhen: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.hasCards("h", card => game.hasPlayer(current => current != player && lib.filter.canBeGained(card, player, current)));
		},
		filterTarget(card, player, target) {
			if (target == player || !ui.selected.cards?.length) {
				return false;
			}
			return ui.selected.cards.every(cardx => lib.filter.canBeGained(cardx, player, target));
		},
		filterCard: true,
		selectCard: [1, Infinity],
		allowChooseAll: true,
		position: "h",
		check(card) {
			return 8 - get.value(card);
		},
		discard: false,
		lose: false,
		delay: 0,
		usable: 1,
		async content(event, trigger, player) {
			const {
				targets: [target],
				cards,
			} = event;
			const num = cards.length;
			const next = player.give(cards, target);
			next.gaintag.add(event.name);
			await next;
			await player.randomGain({ num, position: "h", target });
		},
		ai: {
			order: 1,
			result: {
				player: 1,
				target: -1,
			},
		},
		group: ["dckuizhen_effect"],
		subSkill: {
			effect: {
				audio: "dckuizhen",
				forced: true,
				locked: false,
				trigger: { global: ["useCard", "phaseEnd"] },
				filter(event, player) {
					const target = event.player;
					if (event.name == "phase") {
						return game.hasPlayer(current => {
							return (
								!current.hasCards("h", card => card.hasGaintag("dckuizhen")) &&
								current.hasHistory("lose", evt => {
									for (const i in evt.gaintag_map) {
										if (evt.gaintag_map[i].includes("dckuizhen")) {
											return true;
										}
									}
									return false;
								})
							);
						});
					}
					return target.hasHistory("lose", evt => {
						if (evt.getParent() != event) {
							return false;
						}
						for (const i in evt.gaintag_map) {
							if (evt.gaintag_map[i].includes("dckuizhen")) {
								return true;
							}
						}
						return false;
					});
				},
				logTarget(event, player) {
					if (event.name == "useCard") {
						return event.player;
					}
					return game
						.filterPlayer(current => {
							return (
								!current.hasCards("h", card => card.hasGaintag("dckuizhen")) &&
								current.hasHistory("lose", evt => {
									for (const i in evt.gaintag_map) {
										if (evt.gaintag_map[i].includes("dckuizhen")) {
											return true;
										}
									}
									return false;
								})
							);
						})
						.sortBySeat();
				},
				async content(event, trigger, player) {
					const targets = event.targets;
					if (trigger.name == "useCard") {
						await player.draw({ num: 1 });
					} else {
						await game.doAsyncInOrder(targets, async target => {
							await target.loseHp();
						});
					}
				},
			},
		},
	}
```

## dc_liuli 名字:刘理 势力:shu

### dcfuli 名字:抚黎
描述: 出牌阶段限一次，你可以展示手牌并弃置一种类别的所有手牌，然后摸X张牌（X为这些牌的牌名字数和且X至多为场上手牌数最多的角色的手牌数）。然后你可以选择一名角色，令其攻击范围-Y直到你的下个回合开始（Y为1，若你因此弃置了伤害类卡牌，则Y改为减其攻击范围）。
```js
dcfuli: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.countDiscardableCards(player, "h");
		},
		usable: 1,
		async content(event, trigger, player) {
			await player.showHandcards(get.translation(player) + "发动了【抚黎】");
			const getNum = type => {
				let num = ["basic", "trick", "equip"].indexOf(type);
				if (num === -1) {
					num = 3;
				}
				return num;
			};
			const types = player
				.getDiscardableCards(player, "h")
				.reduce((list, card) => {
					return list.add(get.type2(card));
				}, [])
				.sort((a, b) => getNum(a) - getNum(b));
			if (types.length) {
				const { control } = await player
					.chooseControl(types)
					.set("ai", () => {
						const player = get.event().player,
							types = get.event().controls.slice();
						const getNum = type => {
							const cards = player.getDiscardableCards(player, "h").filter(card => get.type2(card) == type);
							const countCards = (target, player, cards) => {
								return target.countCards("h") - (target == player ? cards.length : 0);
							};
							const max = game
								.findPlayer(target => {
									return !game.hasPlayer(target2 => {
										return countCards(target2, player, cards) > countCards(target, player, cards);
									});
								})
								.countCards("h");
							return (
								Math.min(
									max,
									cards.reduce((sum, card) => sum + get.cardNameLength(card), 0)
								) / cards.length
							);
						};
						return types.sort((a, b) => {
							return getNum(b) - getNum(a);
						})[0];
					})
					.set("prompt", "弃置一种类别的所有手牌，然后摸这些牌的名字字数之和的牌")
					.forResult();
				if (control) {
					const cards = player.getDiscardableCards(player, "h").filter(card => get.type2(card) == control);
					await player.discard(cards);
					const max = game.findPlayer(target => target.isMaxHandcard()).countCards("h");
					const num = Math.min(
						max,
						cards.reduce((sum, card) => sum + get.cardNameLength(card), 0)
					);
					if (num) {
						await player.draw(num);
					}
					const goon = cards.some(card => get.is.damageCard(card));
					const { bool, targets } = await player
						.chooseTarget("抚黎：是否令一名角色的攻击范围" + (goon ? "减至0" : "-1") + "直到你的下个回合开始？", (card, player, target) => {
							return !get.event().goon || target.getAttackRange() > 0;
						})
						.set("ai", target => {
							const player = get.event().player,
								num = target.getAttackRange();
							if (get.attitude(player, target) > 0) {
								return -1;
							}
							if (get.event().goon) {
								return num;
							}
							if (num < 1) {
								return 1 / (1 - num);
							}
							return 5 / num;
						})
						.set("goon", goon)
						.forResult();
					if (bool) {
						const target = targets[0];
						player.line(target);
						target.addSkill("dcfuli_range");
						target.addMark("dcfuli_range", goon ? target.getAttackRange() : 1, false);
						player.when(["phaseBegin", "dieBegin"]).step(async () => {
							target.removeMark("dcfuli_range", target.countMark("dcfuli_range"), false);
							if (!target.hasMark("dcfuli_range")) {
								target.removeSkill("dcfuli_range");
							}
						});
					}
				}
			}
		},
		ai: {
			order: 1,
			result: {
				player(player) {
					const types = player.getDiscardableCards(player, "h").reduce((list, card) => {
						return list.add(get.type2(card));
					}, []);
					if (
						!types.some(type => {
							const cards = player.getDiscardableCards(player, "h").filter(card => get.type2(card) == type);
							const countCards = (target, player, cards) => {
								return target.countCards("h") - (target == player ? cards.length : 0);
							};
							return !game
								.filterPlayer(target => {
									return !game.hasPlayer(target2 => {
										return countCards(target2, player, cards) > countCards(target, player, cards);
									});
								})
								.includes(player);
						})
					) {
						return 0;
					}
					return 1;
				},
			},
		},
		subSkill: {
			range: {
				charlotte: true,
				onremove: true,
				mod: {
					attackRange(player, num) {
						return num - player.countMark("dcfuli_range");
					},
				},
				marktext: " - ",
				intro: { content: "攻击范围-#" },
			},
		},
	}
```

### dcdehua 名字:德化
描述: 锁定技。①每轮开始时，若有你可以未以此法选择过且可以使用的非延时类伤害牌的牌名，你选择其中一个并视为使用之，然后你不能使用手牌中此牌名的牌。若你已选择过所有的伤害牌牌名，你失去〖德化〗，本局游戏你的伤害牌不计入手牌数。②你的手牌上限+Y（Y为你〖德化①〗选择过的牌名数）。
```js
dcdehua: {
		audio: 2,
		trigger: { global: "roundStart" },
		forced: true,
		async content(event, trigger, player) {
			const list = lib.inpile.filter(name => {
				if (get.type(name) === "delay" || player.getStorage("dcdehua").includes(name)) {
					return false;
				}
				const card = new lib.element.VCard({ name: name, isCard: true });
				return get.tag(card, "damage") && player.hasUseTarget(card);
			});
			if (list.length) {
				const { bool, links } = await player
					.chooseButton(['###德化###<div class="text center">视为使用一张未以此法选择过且可以使用的伤害类卡牌</div>', [list, "vcard"]], true)
					.set("ai", button => {
						const name = button.link[2],
							player = get.player();
						let value = player.getUseValue({ name, isCard: true }, null, true);
						if (player.countCards("h", card => get.name(card) === name && player.hasUseTarget(card))) {
							value /= 3;
						}
						if (name === "sha") {
							value /= 2;
						}
						return value;
					})
					.forResult();
				if (bool) {
					const name = links[0][2],
						card = new lib.element.VCard({ name: name, isCard: true });
					await player.chooseUseTarget(card, true);
					player.markAuto("dcdehua", [name]);
				}
			}
			if (
				!lib.inpile.some(name => {
					if (get.type(name) === "delay") {
						return false;
					}
					const card = new lib.element.VCard({ name: name });
					return get.tag(card, "damage") && !player.getStorage("dcdehua").includes(name);
				})
			) {
				await player.removeSkills("dcdehua");
				player.addSkill("dcdehua_hand");
			}
		},
		mod: {
			maxHandcard(player, num) {
				return num + player.getStorage("dcdehua").length;
			},
			cardEnabled(card, player) {
				if (player.getStorage("dcdehua").includes(card.name) && (get.position(card) == "h" || (card.cards && card.cards.some(i => get.position(i) == "h")))) {
					return false;
				}
			},
			cardSavable(card, player) {
				if (player.getStorage("dcdehua").includes(card.name) && (get.position(card) == "h" || (card.cards && card.cards.some(i => get.position(i) == "h")))) {
					return false;
				}
			},
			aiValue(player, card) {
				if (player.getStorage("dcdehua").includes(get.name(card))) {
					return 0;
				}
			},
			aiUseful() {
				return lib.skill.dcdehua.mod.aiValue.apply(this, arguments);
			},
		},
		intro: {
			content(storage) {
				return "<li>手牌上限+" + storage.length + "<br><li>不能使用手牌中的" + get.translation(storage);
			},
		},
		subSkill: {
			hand: {
				charlotte: true,
				mark: true,
				intro: { content: "伤害牌不计入手牌上限" },
				mod: {
					ignoredHandcard(card) {
						if (get.is.damageCard(card)) {
							return true;
						}
					},
					cardDiscardable(card, _, name) {
						if (name == "phaseDiscard" && get.is.damageCard(card)) {
							return false;
						}
					},
				},
			},
		},
	}
```

## yue_daqiao 名字:乐大乔 势力:wu

### dcqiqin 名字:绮琴
描述: 锁定技。①游戏开始时，你将手牌标记为“琴”。②你的“琴”牌不计入手牌上限。③准备阶段，你获得位于弃牌堆的所有“琴”。
```js
dcqiqin: {
		audio: 2,
		audioname: ["yue_daqiao"],
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		async content(event, trigger, player) {
			const cards = player.getCards("h"); //
			player.addGaintag(cards, "eternal_dcqiqin_tag");
		},
		group: "dcqiqin_restore",
		subSkill: {
			tag: {},
			restore: {
				audio: "dcqiqin",
				audioname: ["yue_daqiao"],
				trigger: { player: "phaseZhunbeiBegin" },
				filter(event, player) {
					return Array.from(ui.discardPile.childNodes).some(card => card.hasGaintag("eternal_dcqiqin_tag"));
					/*const targets = game.players.slice().concat(game.dead);
					return targets.some(target => target.getStorage("dcqiqin").filterInD("d").length);*/
				},
				forced: true,
				async content(event, trigger, player) {
					const cards = Array.from(ui.discardPile.childNodes).filter(card => card.hasGaintag("eternal_dcqiqin_tag"));
					await player.gain({
						cards,
						animate: "gain2",
					});
				},
			},
		},
		mod: {
			ignoredHandcard(card, player) {
				if (card.hasGaintag("eternal_dcqiqin_tag")) {
					return true;
				}
			},
			cardDiscardable(card, player, name) {
				if (name == "phaseDiscard" && card.hasGaintag("eternal_dcqiqin_tag")) {
					return false;
				}
			},
		},
	}
```

### dczixi 名字:姊希
描述: ①出牌阶段开始和结束时，你可以将至多两张“琴”各当做一张无效果的【乐不思蜀】、【兵粮寸断】或【闪电】置于一名角色的判定区。②当你使用基本牌或普通锦囊牌指定唯一目标后，你可根据其判定区内的牌数执行对应项：1.令此牌对其额外结算一次；2.摸两张牌；3.获得其装备区与判定区所有牌，并对其造成3点伤害。
```js
dczixi: {
		init() {
			game.addGlobalSkill("dczixi_judge");
			game.broadcastAll(() => lib.skill.dczixi.video());
		},
		video() {
			const list = lib.skill.dczixi.zixiList;
			for (const name of list) {
				const namex = "dczixi_" + name;
				if (!lib.card[namex]) {
					lib.card[namex] = {
						type: "special_delay",
						fullskin: true,
						noEffect: true,
						wuxieable: false,
						judgeSlots: [name],
					};
					lib.card[namex].cardimage = name;
					lib.translate[namex] = lib.translate[name] + "·姊希";
					lib.translate[namex + "_info"] = "由【姊希】技能创造的无效果【" + lib.translate[name] + "】";
				}
			}
		},
		audio: 2,
		trigger: { player: ["phaseUseBegin", "phaseUseEnd"] },
		filter(event, player) {
			return player.hasCards("he", card => {
				return (
					card.hasGaintag("eternal_dcqiqin_tag") &&
					lib.skill.dczixi.zixiList.some(name => {
						return game.hasPlayer(target => target.canAddJudge(get.autoViewAs({ name: "dczixi_" + name }, [card])));
					})
				);
			});
		},
		zixiList: ["lebu", "bingliang", "shandian"],
		selectAi(player, names) {
			const maxMap = new Map();
			const cards = player.getCards("he", card => {
				return card.hasGaintag("eternal_dcqiqin_tag") && get.value(card) < 7;
			});
			if (!cards.length) {
				return maxMap;
			}
			const targets = game.filterPlayer();
			const attitudeMap = new Map();
			targets.forEach(target => {
				attitudeMap.set(target, get.attitude(player, target));
			});
			for (const name of names) {
				let max = [0, null, null];
				let res = [null, null, 0];
				for (const card of cards) {
					const card1 = get.autoViewAs({ name: `dczixi_${name}` }, [card]);
					const card2 = get.autoViewAs({ name }, [card]);
					for (const target of targets.filter(current => current.canAddJudge(card1))) {
						const eff = get.effect(target, card2, player, player);
						const attitude = attitudeMap.get(target);
						if (attitude > 0) {
							if (-eff > res[2]) {
								res = [target, card, -eff / 16];
							}
							//避免人机一直贴队友
						} else {
							if (eff > res[2]) {
								res = [target, card, eff];
							}
						}
						if (res[0] && res[2] > max[0]) {
							max = [res[2], res[1], res[0]];
						}
					}
				}
				maxMap.set(get.translation(name), max);
			}
			return maxMap;
		},
		async cost(event, trigger, player) {
			game.addVideo("skill", player, ["dczixi", []]);
			const dialog = [];
			dialog.push(`###${get.prompt("dczixi")}###<div class="text center">将至多两张“琴”以你选择的牌名置于一名角色的判定区</div>`);
			const hs = player.getCards("h", card => card.hasGaintag("eternal_dcqiqin_tag"));
			const es = player.getCards("e", card => card.hasGaintag("eternal_dcqiqin_tag"));
			if (hs.length) {
				dialog.addArray(['<div class="text center">你的手牌</div>', hs]);
			}
			if (es.length) {
				dialog.addArray(['<div class="text center">你的装备</div>', es]);
			}
			const names = lib.skill.dczixi.zixiList.filter(name => {
				return player.hasCards("he", card => {
					return card.hasGaintag("eternal_dcqiqin_tag") && game.hasPlayer(target => target.canAddJudge(get.autoViewAs({ name: "dczixi_" + name }, [card])));
				});
			});
			let map = {};
			for (const name of names) {
				map[get.translation(name)] = name;
			}
			const maxMap = lib.skill.dczixi.selectAi(player, Object.values(map));
			dialog.push([Object.keys(map), "tdnodes"]);
			const result = await player
				.chooseButtonTarget({
					createDialog: dialog,
					filterButton(button) {
						const type = typeof button.link,
							card = button.link;
						const { player, map } = get.event();
						if (type == "string") {
							if (ui.selected.buttons.filter(button => typeof button.link == "string").length < 2) {
								const name = map[card];
								return game.hasPlayer(target => {
									return player.hasCards("he", cardx => {
										return cardx.hasGaintag("eternal_dcqiqin_tag") && target.canAddJudge(get.autoViewAs({ name: "dczixi_" + name }, [cardx]));
									});
								});
							}
						} else {
							if (ui.selected.buttons.filter(button => typeof button.link != "string").length < 2) {
								const names = ui.selected.buttons.filter(button => typeof button.link == "string").map(button => map[button.link]);
								if (names.length) {
									return game.hasPlayer(target => {
										return names.some(name => card.hasGaintag("eternal_dcqiqin_tag") && target.canAddJudge(get.autoViewAs({ name: "dczixi_" + name }, [card])));
									});
								}
							}
						}
						return false;
					},
					selectButton: [1, 4],
					filterTarget(card, player, target) {
						const links = ui.selected.buttons.map(button => button.link);
						const map = get.event().map;
						const namex = links.filter(link => typeof link == "string"),
							cards = links.filter(link => !namex.includes(link));
						for (let i = 0; i < namex.length; i++) {
							const name = map[namex[i]],
								card = cards[i];
							if (!target.canAddJudge(get.autoViewAs({ name: "dczixi_" + name }, [card]))) {
								return false;
							}
						}
						return true;
					},
					filterOk() {
						if (![2, 4].includes(ui.selected.buttons.length)) {
							return false;
						}
						return ui.selected.buttons.filter(button => typeof button.link == "string").length == ui.selected.buttons.filter(button => typeof button.link != "string").length;
					},
					ai1(button) {
						const { maxMap } = get.event();
						const size = maxMap.size;
						if (!size) {
							return 0;
						}
						if (ui.selected.buttons.length > 1) {
							return 0;
						}
						if (!ui.selected.buttons.length) {
							if (typeof button.link !== "string") {
								return 0;
							}
							const val = maxMap.get(button.link);
							if (!val) {
								return 0;
							}
							return val[0];
						} else {
							if (typeof button.link == "string") {
								return 0;
							}
							if (ui.selected.buttons.some(btn => typeof btn.link == "string" && maxMap.get(btn.link)?.[1] == button.link)) {
								return 1;
							}
							return 0;
						}
					},
					ai2(target) {
						const { maxMap } = get.event();
						if (ui.selected.buttons.some(btn => typeof btn.link == "string" && maxMap.get(btn.link)?.[2] == target)) {
							return 1;
						}
						return 0;
					},
					complexSelect: true,
					complexTarget: true,
				})
				.set("map", map)
				.set("maxMap", maxMap)
				.forResult();
			if (result?.bool && result.links?.length && result.targets?.length) {
				event.result = {
					bool: true,
					cost_data: result.links,
					targets: result.targets,
				};
			}
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cost_data: links,
			} = event;
			const namex = links.filter(link => typeof link == "string"),
				cards = links.filter(link => !namex.includes(link));
			const names = lib.skill.dczixi.zixiList.filter(name => {
				return player.hasCards("he", card => {
					return card.hasGaintag("eternal_dcqiqin_tag") && game.hasPlayer(target => target.canAddJudge(get.autoViewAs({ name: "dczixi_" + name }, [card])));
				});
			});
			let map = {};
			for (const name of names) {
				map[get.translation(name)] = name;
			}
			player.$give(cards, target, false);
			await game.delay(0.5);
			for (let i = 0; i < namex.length; i++) {
				const name = map[namex[i]],
					card = cards[i];
				await target.addJudge({ name: "dczixi_" + name }, [card]);
			}
		},
		ai: { combo: "dcqiqin" },
		group: "dczixi_effect",
		subSkill: {
			judge: {
				ai: {
					threaten(player, target) {
						if (!player.hasSkill("dczixi") || ![1, 2, 3].includes(target.countCards("j"))) {
							return;
						}
						return 3 + target.countCards("j");
					},
				},
			},
			effect: {
				audio: "dczixi",
				trigger: { player: "useCardToTargeted" },
				filter(event, player) {
					return event.isFirstTarget && event.targets.length == 1 && [1, 2, 3].includes(event.target.countCards("j")) && (get.type(event.card) == "basic" || get.type(event.card) == "trick");
				},
				prompt2(event, player) {
					const target = event.target,
						str = get.translation(target);
					return ["令" + get.translation(event.card) + "对" + str + "额外结算一次", "摸两张牌", "获得" + str + "判定区和装备区里的所有牌，并对其造成3点伤害"][target.countCards("j") - 1];
				},
				check(event, player) {
					const target = event.target,
						num = target.countCards("j");
					if (num == 2) {
						return true;
					}
					if (num == 1) {
						return get.effect(target, event.card, player, player) > 0;
					}
					return get.attitude(player, target) < 0 && get.damageEffect(target, player, player) > 0;
				},
				logTarget: "target",
				async content(event, trigger, player) {
					const target = trigger.target,
						num = target.countCards("j");
					switch (num) {
						case 1:
							trigger.getParent().effectCount++;
							game.log(trigger.card, "额外结算一次");
							break;
						case 2:
							await player.draw(2);
							break;
						case 3:
							const cards = target.getGainableCards(player, "ej");
							if (cards.length) {
								await player.gain({ cards, source: target, animate: "giveAuto", bySelf: true });
							}
							await target.damage(3);
							break;
					}
				},
				ai: {
					effect: {
						player_use(card, player, target) {
							if (!target || player._dczixi_effect_use || get.tag(card, "multitarget")) {
								return;
							}
							let js = target.countCards("j");
							if (js == 1) {
								return [2, 0, 2, 0];
							} else if (js == 2) {
								return [1, 2];
							} else if (js == 3 && get.attitude(player, target) < 0) {
								player._dczixi_effect_use = true;
								let eff = get.damageEffect(target, player, player);
								delete player._dczixi_effect_use;
								if (eff > 0) {
									return [1, 0, 1, -6];
								}
							}
						},
					},
				},
			},
		},
	}
```

## dc_kongrong 名字:孔融 势力:qun

### dckrmingshi 名字:名士
描述: 锁定技，当你受到其他角色造成的伤害时，若其手牌数大于你，则其需弃置一张手牌，否则此伤害-1。
```js
dckrmingshi: {
		audio: "mingshi",
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			return event.source && event.source.countCards("h") > player.countCards("h");
		},
		forced: true,
		logTarget: "source",
		async content(event, trigger, player) {
			const target = trigger.source;
			const { bool } = await target
				.chooseToDiscard("名士：弃置一张手牌，或令对" + get.translation(player) + "造成的伤害-1")
				.set("ai", card => {
					if (get.event().goon) {
						return 0;
					}
					return 6 - get.value(card);
				})
				.set("goon", get.damageEffect(player, target, target) <= 0)
				.forResult();
			if (!bool) {
				trigger.num--;
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "damage") && target != player) {
						if (_status.event.name == "dckrmingshi") {
							return;
						}
						if (get.attitude(player, target) > 0 && current < 0) {
							return "zeroplayertarget";
						}
						var bs = player.getCards("h");
						bs.remove(card);
						if (card.cards) {
							bs.removeArray(card.cards);
						} else {
							bs.removeArray(ui.selected.cards);
						}
						if (bs.length > target.countCards("h")) {
							if (bs.some(bsi => get.value(bsi) < 7)) {
								return [1, 0, 1, -0.5];
							}
							return [1, 0, 0.3, 0];
						}
						return [1, 0, 1, -0.5];
					}
				},
			},
		},
	}
```

### lirang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## dc_sp_menghuo 名字:新杀SP孟获 势力:qun

### dcmanwang 名字:蛮王
描述: `出牌阶段，你可以弃置任意张牌。然后你依次执行以下选项中的前等量项：⒈获得${get.poptip("dcpanqin")}。⒉摸一张牌。⒊回复1点体力。⒋摸两张牌并失去${get.poptip("dcpanqin")}。`
```js
dcmanwang: {
		audio: "spmanwang",
		inherit: "spmanwang",
		check(card) {
			var player = _status.event.player;
			var max = Math.min(player.isDamaged() ? 3 : 2, 4 - player.countMark("dcmanwang"));
			if (!max && !player.hasSkill("dcpanqin")) {
				return 0;
			}
			if (max == 0 && ui.selected.length > 0) {
				return 0;
			}
			return 7 - ui.selected.cards.length - get.value(card);
		},
		async content(event, trigger, player) {
			const num = Math.min(event.cards.length, 4 - player.countMark("dcmanwang"));
			if (num >= 1) {
				await player.addSkills("dcpanqin");
			}
			if (num >= 2) {
				await player.draw();
			}
			if (num >= 3) {
				await player.recover();
			}
			if (num >= 4) {
				await player.draw({ num: 2 });
				await player.removeSkills("dcpanqin");
			}
		},
		ai: {
			order: 2,
			result: {
				player(player, target) {
					if (player.getUseValue({ name: "nanman" }) <= 0) {
						return 0;
					}
					if (player.getStat("skill").spmanwang && player.hasSkill("dcpanqin")) {
						return 0;
					}
					return 1;
				},
			},
		},
		derivation: "dcpanqin",
	}
```

## yue_xiaoqiao 名字:乐小乔 势力:wu

### dcqiqin 名字:绮琴
描述: 锁定技。①游戏开始时，你将手牌标记为“琴”。②你的“琴”牌不计入手牌上限。③准备阶段，你获得位于弃牌堆的所有“琴”。
```js
dcqiqin: {
		audio: 2,
		audioname: ["yue_daqiao"],
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		async content(event, trigger, player) {
			const cards = player.getCards("h"); //
			player.addGaintag(cards, "eternal_dcqiqin_tag");
		},
		group: "dcqiqin_restore",
		subSkill: {
			tag: {},
			restore: {
				audio: "dcqiqin",
				audioname: ["yue_daqiao"],
				trigger: { player: "phaseZhunbeiBegin" },
				filter(event, player) {
					return Array.from(ui.discardPile.childNodes).some(card => card.hasGaintag("eternal_dcqiqin_tag"));
					/*const targets = game.players.slice().concat(game.dead);
					return targets.some(target => target.getStorage("dcqiqin").filterInD("d").length);*/
				},
				forced: true,
				async content(event, trigger, player) {
					const cards = Array.from(ui.discardPile.childNodes).filter(card => card.hasGaintag("eternal_dcqiqin_tag"));
					await player.gain({
						cards,
						animate: "gain2",
					});
				},
			},
		},
		mod: {
			ignoredHandcard(card, player) {
				if (card.hasGaintag("eternal_dcqiqin_tag")) {
					return true;
				}
			},
			cardDiscardable(card, player, name) {
				if (name == "phaseDiscard" && card.hasGaintag("eternal_dcqiqin_tag")) {
					return false;
				}
			},
		},
	}
```

### dcweiwan 名字:媦婉
描述: 出牌阶段限一次，你可以弃置一张“琴”并随机获得一名其他角色区域内花色与此牌不相同的牌各一张，若你获得了：一张牌，其失去1点体力；两张牌，本回合你对其使用牌无距离和次数限制；三张牌，本回合你不能对其使用牌。
```js
dcweiwan: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return (
				player.hasCards(lib.skill.dcweiwan.position, card => {
					return lib.skill.dcweiwan.filterCard(card, player);
				}) &&
				game.hasPlayer(target => {
					return lib.skill.dcweiwan.filterTarget(null, player, target);
				})
			);
		},
		filterCard(card, player) {
			return card.hasGaintag("eternal_dcqiqin_tag") && lib.filter.cardDiscardable(card, player);
		},
		filterTarget(card, player, target) {
			return target != player && target.hasCards("hej");
		},
		position: "he",
		check(card) {
			const player = _status.event.player;
			const target = game.players.reduce(
				(result, current) => {
					if (current === player) {
						return result;
					}
					const effect = Math.abs(lib.skill.dcweiwan.ai.result.target(player, current));
					return effect > result[1] ? [current, effect] : result;
				},
				[null, 0]
			)[0];
			return target ? lib.skill.dcweiwan.getWeiWanEffect(player, card, target) : 0;
		},
		usable: 1,
		async content(event, trigger, player) {
			const target = event.target;
			let suit = get.suit(event.cards[0], player);
			let cards = target.getCards("hej", card => get.suit(card, target) != suit && lib.filter.canBeGained(card, player, target));
			if (!cards.length) {
				player.chat("无牌可得！！");
				return;
			}
			let suits = lib.suit.slice();
			suits.reverse();
			suits.add("none");
			suits.forEach(suit2 => {
				let cards2 = cards.filter(card => get.suit(card, target) == suit2);
				if (cards2.length) {
					cards2.randomRemove();
					cards.removeArray(cards2);
				}
			});
			if (!cards.length) {
				player.chat("无牌可得！！");
				return;
			}
			await player.gain(cards, target, "give");
			switch (cards.length) {
				case 1:
					await target.loseHp();
					break;
				case 2:
					player.addTempSkill("dcweiwan_buff");
					player.markAuto("dcweiwan_buff", [target]);
					break;
				case 3:
					player.addTempSkill("dcweiwan_debuff");
					player.markAuto("dcweiwan_debuff", [target]);
					break;
			}
		},
		ai: {
			order: 9,
			result: {
				target: (player, target) => {
					const att = get.sgn(get.attitude(player, target)) - 1;
					const cards = player.getCards(lib.skill.dcweiwan.position, card => lib.skill.dcweiwan.filterCard(card, player));
					return (
						att *
						cards.reduce((result, card) => {
							const effect = lib.skill.dcweiwan.getWeiWanEffect(player, card, target);
							return effect > result ? effect : result;
						}, 0)
					);
				},
			},
			combo: "dcqiqin",
		},
		getWeiWanEffect(player, cardx, target) {
			const suit = get.suit(cardx, player);
			const cards = target.getCards("hej", card => get.suit(card, target) !== suit && lib.filter.canBeGained(card, player, target));
			const num = lib.suits.filter(suit => cards.some(card => get.suit(card, target) === suit)).length;
			switch (num) {
				case 1:
					return num + Math.max(0, get.sgn(get.effect(target, { name: "losehp" }, player, player)));
				case 2:
					return num + player.countCards("he", card => player.canUse(card, target, false) && get.effect(target, card, player, player) > 0);
				case 3:
					return Math.ceil(num / 2);
				default:
					return num;
			}
		},
		subSkill: {
			buff: {
				charlotte: true,
				onremove: true,
				intro: { content: "本回合对$使用牌无距离和次数限制" },
				mod: {
					targetInRange(card, player, target) {
						if (player.getStorage("dcweiwan_buff").includes(target)) {
							return true;
						}
					},
					cardUsableTarget(card, player, target) {
						if (player.getStorage("dcweiwan_buff").includes(target)) {
							return true;
						}
					},
				},
			},
			debuff: {
				charlotte: true,
				onremove: true,
				intro: { content: "本回合不能对$使用牌" },
				mod: {
					playerEnabled(card, player, target) {
						if (player.getStorage("dcweiwan_debuff").includes(target)) {
							return false;
						}
					},
				},
			},
		},
	}
```

## dc_dongzhao 名字:董昭 势力:wei

### dcyijia 名字:移驾
描述: 一名角色受到伤害后，若你至其的距离不大于1，你可以将场上一张装备牌移动至其对应装备栏（替换原装备）。若其因此脱离了一名角色的攻击范围，你摸一张牌。
```js
dcyijia: {
		audio: 2,
		trigger: { global: "damageEnd" },
		filter(event, player) {
			if (!event.player.isIn()) {
				return false;
			}
			if (get.distance(player, event.player) > 1) {
				return false;
			}
			return player.canMoveCard(
				null,
				true,
				game.filterPlayer(i => i != event.player),
				event.player,
				"canReplace"
			);
		},
		check(event, player) {
			return player.canMoveCard(
				true,
				true,
				game.filterPlayer(i => i != event.player),
				event.player,
				"canReplace"
			);
		},
		prompt2(event, player) {
			return `将场上一张装备牌移动至${get.translation(event.player)}的装备区内（替换原装备）。然后若其因此脱离了一名角色的攻击范围，你摸一张牌。`;
		},
		logTarget: "player",
		line: false,
		async content(event, trigger, player) {
			const target = trigger.player;
			const inRangeList = game.filterPlayer(current => current.inRange(target));
			await player
				.moveCard(
					true,
					game.filterPlayer(i => i != target),
					target,
					"canReplace"
				)
				.set("nojudge", true);
			const leaveSomeone = inRangeList.some(current => !current.inRange(target));
			if (leaveSomeone) {
				player.draw();
			}
		},
		ai: {
			maixie: true,
			expose: 0.2,
			threaten: 3.3,
		},
	}
```

### dcdingji 名字:定基
描述: 准备阶段，你可以令一名角色将手牌摸或弃置至五张，然后其展示手牌。若牌名均不同，则其可以视为使用其中一张基本或普通锦囊牌。
```js
dcdingji: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		direct: true,
		async content(event, trigger, player) {
			let result;
			result = await player
				.chooseTarget(get.prompt2("dcdingji"))
				.set("ai", target => {
					let att = get.attitude(get.player(), target) / 2;
					const delta = 5 - target.countCards("h");
					let fix = 1;
					const hs = target.getCards("h");
					outer: for (let i = 0; i < hs.length - 1; i++) {
						const name1 = get.name(hs[i]);
						for (let j = i + 1; j < hs.length; j++) {
							const name2 = get.name(hs[j]);
							if (name1 == name2) {
								fix = 0.5;
								break outer;
							}
						}
					}
					if (delta > 0) {
						if (target.hasSkillTag("nogain")) {
							att /= 3;
						}
						return Math.sqrt(delta) * att * fix;
					}
					if (delta > -2 && att > 0) {
						return fix == 0.5 ? 0.1 : -1;
					}
					return (-Math.sqrt(-delta) * att) / 2;
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			const target = result.targets[0];
			player.logSkill("dcdingji", target);
			if (target != player) {
				player.addExpose(0.3);
			}
			const delta = 5 - target.countCards("h");
			if (delta != 0) {
				await target[delta > 0 ? "draw" : "chooseToDiscard"](Math.abs(delta), true, "allowChooseAll");
			}
			await target.showHandcards();
			const hs = target.getCards("h");
			let hasSame = false;
			outer: for (let i = 0; i < hs.length - 1; i++) {
				const name1 = get.name(hs[i]);
				for (let j = i + 1; j < hs.length; j++) {
					const name2 = get.name(hs[j]);
					if (name1 == name2) {
						hasSame = true;
						break outer;
					}
				}
			}
			await game.delayex();
			if (hasSame) {
				return;
			}
			const list = get.inpileVCardList(info => {
				if (!["basic", "trick"].includes(info[0])) {
					return false;
				}
				if (!target.hasUseTarget(new lib.element.VCard({ name: info[2], nature: info[3], isCard: true }))) {
					return false;
				}
				return hs.some(card => {
					return get.name(card) == info[2] && get.is.sameNature([card, info[3]], true);
				});
			});
			if (!list.length) {
				return;
			}
			result = await target
				.chooseButton(["是否视为使用其中一张牌？", [list, "vcard"]])
				.set("ai", button => {
					return get.player().getUseValue({ name: button.link[2] });
				})
				.forResult();
			if (result.bool) {
				target.chooseUseTarget(
					new lib.element.VCard({
						name: result.links[0][2],
						nature: result.links[0][3],
						isCard: true,
					}),
					true,
					false
				);
			}
		},
	}
```

## kuaiqi 名字:蒯祺 势力:wei

### dcliangxiu 名字:良秀
描述: 出牌阶段，你可以弃置两张不同类型的牌，然后将牌堆/弃牌堆中两张与你弃置或本阶段以此法分配的牌类型均不同的牌分配给任意角色。
```js
dcliangxiu: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.hasCard(card => {
				const type = get.type2(card, player);
				return player.hasCard(cardx => {
					if (card == cardx) {
						return false;
					}
					return get.type2(cardx, player) != type;
				}, "he");
			}, "he");
		},
		filterCard(card, player) {
			if (!ui.selected.cards.length) {
				return true;
			}
			return get.type2(ui.selected.cards[0], player) != get.type2(card, player);
		},
		selectCard: 2,
		check(card) {
			const player = get.player();
			const bannedTypes = [];
			bannedTypes.addArray(player.getStorage("dcliangxiu"));
			if (!ui.selected.cards.length) {
				let val = get.value(card);
				if (val > 5.5) {
					return 0;
				}
				if (bannedTypes.includes(get.type2(card, player))) {
					return 7.5 - val;
				}
				return 5.5 - val;
			}
			bannedTypes.addArray(ui.selected.cards.map(card => get.type2(card, player)));
			bannedTypes.add(get.type2(card, player));
			const filter = card => !bannedTypes.includes(get.type2(card, player));
			if (!get.cardPile(filter)) {
				return 0;
			}
			return 6 - get.value(card);
		},
		position: "he",
		complexCard: true,
		onremove: true,
		async content(event, trigger, player) {
			let cards = [];
			const bannedTypes = [];
			bannedTypes.addArray(event.cards.map(card => get.type2(card, player)));
			bannedTypes.addArray(player.getStorage("dcliangxiu"));

			const filter = card => !bannedTypes.includes(get.type2(card, player));
			const piles = ["cardPile", "discardPile"];
			for (const pile of piles) {
				for (let i = 0; i < ui[pile].childNodes.length; i++) {
					const card = ui[pile].childNodes[i];
					if (filter(card)) {
						cards.add(card);
						if (cards.length >= 2) {
							break;
						}
					}
				}
				if (cards.length >= 2) {
					break;
				}
			}
			if (!cards.length) {
				player.chat("没牌了…");
				game.log("但是哪里都找不到没有符合条件的牌！");
				return;
			}
			player.markAuto("dcliangxiu", cards.map(card => get.type2(card, false)).toUniqued());
			player.when({ global: "phaseChange" }).step(async () => {
				player.unmarkSkill("dcliangxiu");
			});
			if (_status.connectMode) {
				game.broadcastAll(() => (_status.noclearcountdown = true));
			}
			let given_map = {};
			while (cards.length) {
				let result;
				if (cards.length == 1) {
					result = { bool: true, links: cards.slice() };
				} else {
					result = await player
						.chooseCardButton("良秀：请选择要分配的牌", cards, [1, cards.length], true)
						.set("ai", button => {
							if (!ui.selected.buttons.length) {
								return get.buttonValue(button);
							}
							return 0;
						})
						.forResult();
				}
				const gives = result.links;
				const result2 = await player
					.chooseTarget("选择获得" + get.translation(gives) + "的角色", cards.length == 1)
					.set("ai", target => {
						return get.attitude(get.event().player, target) * get.sgn(get.sgn(get.event().goon) + 0.5);
					})
					.set(
						"goon",
						gives.reduce((sum, card) => sum + get.value(card), 0)
					)
					.forResult();
				if (result2.bool) {
					cards.removeArray(gives);
					const id = result2.targets[0].playerid;
					if (!given_map[id]) {
						given_map[id] = [];
					}
					given_map[id].addArray(gives);
				}
			}
			if (_status.connectMode) {
				game.broadcastAll(() => delete _status.noclearcountdown);
			}
			let list = [];
			for (const i in given_map) {
				const source = (_status.connectMode ? lib.playerOL : game.playerMap)[i];
				player.line(source, "green");
				game.log(source, "获得了", given_map[i]);
				list.push([source, given_map[i]]);
			}
			await game
				.loseAsync({
					gain_list: list,
					giver: player,
					animate: "gain2",
				})
				.setContent("gaincardMultiple");
			game.delayx();
		},
		intro: {
			content: "已因此技能获得过$牌",
			onunmark: true,
		},
		ai: {
			order: 2,
			result: { player: 1 },
		},
	}
```

### dcxunjie 名字:殉节
描述: 每轮每项限一次。一名角色的回合结束时，若你本回合于摸牌阶段外得到过牌，你可以选择一项：1.令一名角色将手牌数摸或弃置至与其体力值相同；2.令一名角色将体力回复或失去至与其手牌数相同。
```js
dcxunjie: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			if (["handcard", "hp"].every(i => player.isTempBanned(`dcxunjie_${i}`))) {
				return false;
			}
			return player.hasHistory("gain", evt => {
				return !evt.getParent("phaseDraw", true);
			});
		},
		direct: true,
		async content(event, trigger, player) {
			const choices = [];
			const choiceList = ["令一名角色将手牌数摸或弃置至与其体力值相同", "令一名角色将体力回复或失去至与其手牌数相同"];
			if (!player.isTempBanned("dcxunjie_handcard")) {
				choices.push("选项一");
			} else {
				choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "（已被选择过）</span>";
			}
			if (!player.isTempBanned("dcxunjie_hp")) {
				choices.push("选项二");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "（已被选择过）</span>";
			}
			let result;
			if (_status.connectMode) {
				game.broadcastAll(() => {
					_status.noclearcountdown = true;
				});
			}
			if (choices.length == 1) {
				result = { control: choices[0] };
			} else {
				result = await player
					.chooseControl(choices, "cancel2")
					.set("choiceList", choiceList)
					.set("prompt", get.prompt("dcxunjie"))
					.set("ai", () => {
						return get.event().choice;
					})
					.set(
						"choice",
						(() => {
							const getValue = (index, target) => {
								let att = get.attitude(player, target);
								att = Math.sign(att) * Math.sqrt(Math.abs(att));
								let delt = target.getHp(true) - target.countCards("h");
								if (index == 1 && delt < 0) {
									delt = 0;
								}
								return (1 - 3 * index) * att * delt;
							};
							const list = game
								.filterPlayer()
								.map(current => {
									const val0 = getValue(0, current),
										val1 = getValue(1, current);
									return [val0, val1, Math.max(val0, val1)];
								})
								.sort((a, b) => {
									return b[2] - a[2];
								});
							const toChoose = list[0];
							if (toChoose[2] <= 0) {
								return "cancel2";
							}
							return toChoose[0] > toChoose[1] ? 0 : 1;
						})()
					)
					.forResult();
			}
			if (result.control == "cancel2") {
				if (_status.connectMode) {
					game.broadcastAll(() => {
						delete _status.noclearcountdown;
						game.stopCountChoose();
					});
				}
				return;
			}
			let prompt = "";
			const choice = result.control,
				index = choice == "选项一" ? 0 : 1;
			if (choices.length == 1) {
				prompt = `###${get.prompt("dcxunjie")}###<div class="text center">${choiceList[index]}</div>`;
			} else {
				prompt = `###殉节：请选择一名角色###<div class="text center">${choiceList[index].replace("一名", "该")}</div>`;
			}
			result = await player
				.chooseTarget(prompt)
				.set("ai", target => {
					const player = get.player(),
						index = get.event().index;
					let att = get.attitude(player, target);
					att = Math.sign(att) * Math.sqrt(Math.abs(att));
					let delt = target.getHp(true) - target.countCards("h");
					if (index == 1 && delt < 0) {
						delt = 0;
					}
					return (1 - 2 * index) * att * delt;
				})
				.set("index", index)
				.forResult();
			if (_status.connectMode) {
				game.broadcastAll(() => {
					delete _status.noclearcountdown;
					game.stopCountChoose();
				});
			}
			if (!result.bool) {
				return;
			}
			const target = result.targets[0];
			player.logSkill("dcxunjie", target);
			player.tempBanSkill(`dcxunjie_${index == 0 ? "handcard" : "hp"}`, "roundStart", false);
			const delt = (target.getHp(true) - target.countCards("h")) * (1 - 2 * index);
			if (delt == 0) {
				return;
			} else if (index == 0) {
				target[delt > 0 ? "draw" : "chooseToDiscard"](Math.abs(delt), true, "allowChooseAll");
			} else {
				target[delt > 0 ? "recover" : "loseHp"](Math.abs(delt));
			}
		},
	}
```

## yue_caiyong 名字:乐蔡邕 势力:qun

### dcjiaowei 名字:焦尾
描述: 锁定技。①游戏开始时，你将手牌标记为“弦”。②你的“弦”牌不计入手牌上限。③当你失去“弦”后，防止你本回合下次受到的伤害。
```js
dcjiaowei: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		group: "dcjiaowei_prevent",
		async content(event, trigger, player) {
			const cards = player.getCards("h");
			player.addGaintag(cards, "dcjiaowei_tag");
		},
		mod: {
			ignoredHandcard(card, player) {
				if (card.hasGaintag("dcjiaowei_tag")) {
					return true;
				}
			},
			cardDiscardable(card, player, name) {
				if (name == "phaseDiscard" && card.hasGaintag("dcjiaowei_tag")) {
					return false;
				}
			},
		},
		subSkill: {
			prevent: {
				audio: "dcjiaowei",
				trigger: {
					player: "loseAfter",
					global: ["loseAsyncAfter", "addJudgeAfter", "equipAfter", "gainAfter", "addToExpansionAfter"],
				},
				filter(event, player) {
					if (player.hasSkill("dcjiaowei_effect")) {
						return false;
					}
					if (!event.getl?.(player)?.hs?.length) {
						return false;
					}
					if (event.name === "lose") {
						return Object.values(event.gaintag_map).flat().includes("dcjiaowei_tag");
					}
					return player.hasHistory("lose", evt => {
						if (event !== evt.getParent()) {
							return false;
						}
						return Object.values(evt.gaintag_map).flat().includes("dcjiaowei_tag");
					});
				},
				forced: true,
				async content(event, trigger, player) {
					player.addTempSkill("dcjiaowei_effect");
				},
			},
			effect: {
				audio: "dcjiaowei",
				trigger: { player: "damageBegin4" },
				forced: true,
				async content(event, trigger, player) {
					player.removeSkill(event.name);
					trigger.cancel();
				},
				mark: true,
				intro: { content: "防止本回合下次受到的伤害" },
			},
		},
	}
```

### dcfeibai 名字:飞白
描述: 当你使用牌结算完毕后，你可以从随机两张字数为X的牌选择一张获得（X为此牌与你本回合使用的上一张牌的字数之和）。若牌堆和弃牌堆中没有字数为X的牌，则你摸两张牌并标记为“弦”，然后〖飞白〗于本回合失效。
```js
dcfeibai: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		locked: false,
		prompt(event, player) {
			const history = player.getHistory("useCard");
			const ind = history.indexOf(event) - 1,
				evt = history[ind];
			const len = get.cardNameLength(event.card) + (evt ? get.cardNameLength(evt.card) : 0);
			return `${get.prompt("dcfeibai")}（字数之和为${len}）`;
		},
		async content(event, trigger, player) {
			const history = player.getHistory("useCard");
			const ind = history.indexOf(trigger) - 1,
				evt = history[ind],
				cards = [];
			const len = get.cardNameLength(trigger.card) + (evt ? get.cardNameLength(evt.card) : 0);
			while (cards.length < 2) {
				const card = get.cardPile(cardx => get.cardNameLength(cardx, false) === len && !cards.includes(cardx));
				if (!card) {
					break;
				}
				cards.add(card);
			}
			if (cards.length) {
				const result = await player
					.chooseCardButton(`飞白：获得一张牌`, cards, true)
					.set("ai", button => get.value(button.link, player))
					.forResult();
				if (result?.links?.length) {
					await player.gain(result.links, "gain");
				}
			} else {
				await player.draw(2).gaintag.add("dcjiaowei_tag");
				player.tempBanSkill(event.name);
			}
		},
		mod: {
			aiOrder(player, card, num) {
				const evt = player.getLastUsed();
				const len = get.cardNameLength(card) + (evt ? get.cardNameLength(evt.card) : 0);
				const cardx = get.cardPile(card => get.cardNameLength(card, false) === len);
				if (cardx) {
					return num + 8 + (len == 2 || len == 4 ? 2 : 0);
				}
			},
		},
	}
```

## pangshanmin 名字:庞山民 势力:wei

### dccaisi 名字:才思
描述: 当你于回合内/回合外使用基本牌结算结束后，你可以从牌堆/弃牌堆随机获得一张非基本牌，然后若你本回合发动此技能的次数：小于等于你的体力上限，本回合你发动此技能获得的牌数翻倍；大于你的体力上限，本回合此技能失效。
```js
dccaisi: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return get.type(event.card) === "basic" && _status.currentPhase;
		},
		prompt2(event, player) {
			const num = Math.pow(2, player.countMark("dccaisi_more"));
			return `从${player == _status.currentPhase ? "" : "弃"}牌堆中随机获得${get.cnNumber(num)}张非基本牌`;
		},
		async content(event, trigger, player) {
			const position = player == _status.currentPhase ? "cardPile2" : "discardPile";
			let cards = [],
				num = Math.pow(2, player.countMark("dccaisi_more"));
			while (num > 0) {
				num--;
				let card = get[position](card => get.type(card) != "basic" && !cards.includes(card), "random");
				if (card) {
					cards.add(card);
				} else {
					break;
				}
			}
			if (cards.length) {
				await player.gain(cards, "gain2");
			} else {
				player.chat("没有非基本牌…");
				game.log(`但是${position == "discardPile" ? "弃" : ""}牌堆里没有非基本牌！`);
			}
			const sum = player.getHistory("useSkill", evt => evt.skill == "dccaisi").length;
			if (sum <= player.maxHp) {
				player.addTempSkill("dccaisi_more");
				player.setStorage("dccaisi_more", player.getStorage("dccaisi_more", 0) + 1);
			} else {
				player.tempBanSkill("dccaisi");
			}
		},
		subSkill: { more: { charlotte: true, onremove: true } },
	}
```

### dczhuoli 名字:擢吏
描述: 锁定技。一名角色的回合结束时，若你本回合使用或获得的牌数大于体力值，你加1点体力上限（若你的体力上限不小于本局游戏人数，跳过此步），回复1点体力。
```js
dczhuoli: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		forced: true,
		filter(event, player) {
			return player.getHistory("useCard").length > player.getHp() || player.getHistory("gain").reduce((sum, evt) => sum + evt.cards.length, 0) > player.getHp();
		},
		async content(event, trigger, player) {
			if (player.maxHp < game.countPlayer2()) {
				await player.gainMaxHp();
			}
			await player.recover();
		},
	}
```

## dc_jiachong 名字:贾充 势力:wei

### dcbeini 名字:悖逆
描述: 出牌阶段限一次。你可以将手牌调整至体力上限，然后令一名角色视为对另一名角色使用一张【杀】，且这些角色的非锁定技失效直到回合结束。
```js
dcbeini: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard(card, player) {
			const delt = player.countCards("h") - player.maxHp;
			return delt > 0;
		},
		selectCard() {
			const player = get.player();
			const delt = player.countCards("h") - player.maxHp;
			return delt > 0 ? delt : -1;
		},
		promptfunc: () => {
			const player = get.player();
			const delt = player.countCards("h") - player.maxHp;
			let str = "";
			if (delt > 0) {
				str += `弃置${get.cnNumber(delt)}张牌`;
			} else if (delt == 0) {
				str += `点击“确定”`;
			} else {
				str += `摸${get.cnNumber(-delt)}张牌`;
			}
			return `${str}，然后选择两名角色，前者视为对后者使用一张【杀】，且这两者的非锁定技失效。`;
		},
		allowChooseAll: true,
		async content(event, trigger, player) {
			if (player.countCards("h") < player.maxHp) {
				await player.drawTo(player.maxHp);
			}
			if (game.countPlayer() < 2) {
				return;
			}
			var result = await player
				.chooseTarget("悖逆：请选择两名角色", "前者视为对后者使用一张【杀】，且这两名角色的非锁定技失效直到回合结束。", true, 2, (card, player, target) => {
					var sha = new lib.element.VCard({ name: "sha", isCard: true });
					if (ui.selected.targets.length) {
						var targetx = ui.selected.targets[0];
						return targetx.canUse(sha, target, false);
					}
					return lib.filter.cardEnabled(sha, target);
				})
				.set("targetprompt", ["打人", "被打"])
				.set("multitarget", true)
				.set("ai", target => {
					var aiTargets = get.event().aiTargets;
					if (aiTargets) {
						return aiTargets[ui.selected.targets.length] == target ? 10 : 0;
					}
					return 0;
				})
				.set(
					"aiTargets",
					(() => {
						var targets = [],
							eff = 0;
						var sha = new lib.element.VCard({ name: "sha", isCard: true });
						for (var user of game.filterPlayer()) {
							for (var target of game.filterPlayer()) {
								if (user == target) {
									continue;
								}
								var targetsx = [user, target];
								targetsx.forEach(i => i.addSkill("dcbeini_fengyin2"));
								var effx = get.effect(target, sha, user, player);
								targetsx.forEach(i => i.removeSkill("dcbeini_fengyin2"));
								if (user == player) {
									effx += 1;
								}
								if (get.attitude(player, user) > 0) {
									effx -= 0.1;
								}
								if (effx > eff) {
									eff = effx;
									targets = targetsx;
								}
							}
						}
						if (targets.length) {
							return targets;
						}
						return null;
					})()
				)
				.forResult();
			if (result.bool) {
				var user = result.targets[0],
					target = result.targets[1];
				result.targets.forEach(i => i.addTempSkill("dcbeini_fengyin"));
				var sha = new lib.element.VCard({ name: "sha", isCard: true });
				if (user.canUse(sha, target, false)) {
					user.useCard(sha, target, false, "noai");
				}
			}
		},
		ai: {
			order: 0.1,
			result: {
				player(player) {
					if (player.countCards("h") - player.maxHp >= 3) {
						return 1;
					}
					return game.hasPlayer(current => get.attitude(player, current) <= 0) ? 1 : 0;
				},
			},
		},
		subSkill: {
			fengyin: {
				inherit: "fengyin",
			},
			fengyin2: {
				inherit: "fengyin",
			},
		},
	}
```

### dcshizong 名字:恃纵
描述: 当你需要使用一张基本牌时，你可以交给一名其他角色X张牌，然后其可以将一张牌置于牌堆底，视为你使用之。若其不为当前回合角色或其此次未放置牌，此技能失效直到回合结束（X为你本回合发动〖恃纵〗的次数）。
```js
dcshizong: {
		audio: 2,
		enable: "chooseToUse",
		hiddenCard(player, name) {
			if (get.type(name) != "basic") {
				return false;
			}
			return player.countCards("he") >= player.countMark("dcshizong_used") + 1;
		},
		filter(event, player) {
			if (event.type == "wuxie" || event.dcshizong) {
				return false;
			}
			if (player.countCards("he") < player.countMark("dcshizong_used") + 1) {
				return false;
			}
			return get
				.inpileVCardList(info => {
					return info[0] == "basic";
				})
				.some(info => event.filterCard(get.autoViewAs({ name: info[2], nature: info[3] }, "unsure"), player, event));
		},
		chooseButton: {
			dialog(event, player) {
				const vcards = get.inpileVCardList(info => {
					if (info[0] != "basic") {
						return false;
					}
					const card = { name: info[2], nature: info[3], isCard: true };
					return event.filterCard(card, player, event);
				});
				return ui.create.dialog("恃纵", [vcards, "vcard"], "hidden");
			},
			check(button) {
				if (get.event().getParent().type != "phase") {
					return 1;
				}
				const player = get.player();
				const card = { name: button.link[2], nature: button.link[3] };
				if (
					game.hasPlayer(current => {
						return player.canUse(card, current) && get.effect(current, card, player, player) > 0;
					})
				) {
					switch (button.link[2]) {
						case "tao":
							return 5;
						case "jiu":
							return 3.01;
						case "sha":
							if (button.link[3] == "fire") {
								return 2.95;
							} else if (button.link[3] == "thunder") {
								return 2.92;
							} else {
								return 2.9;
							}
					}
				}
				return 0;
			},
			backup(links, player) {
				return {
					filterCard: true,
					filterTarget: lib.filter.notMe,
					selectTarget: 1,
					selectCard: () => get.player().countMark("dcshizong_used") + 1,
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						suit: "none",
						number: null,
						isCard: true,
					},
					position: "he",
					popname: true,
					ignoreMod: true,
					ai1(card) {
						return 1 / (1.1 + Math.max(-1, get.value(card)));
					},
					ai2(target) {
						return get.attitude(get.player(), target);
					},
					async precontent(event, trigger, player) {
						const target = event.result.targets[0];
						player.addTempSkill("dcshizong_used");
						player.addMark("dcshizong_used", 1, false);
						player.logSkill("dcshizong", target);
						await player.give(event.result.cards.slice(), target);
						const viewAs = new lib.element.VCard({
							name: event.result.card.name,
							nature: event.result.card.nature,
							isCard: true,
						});
						let result = await target
							.chooseCard("恃纵：是否将一张牌置于牌堆底？", `若如此做，${get.translation(player)}视为使用一张${get.translation(viewAs.nature)}【${get.translation(viewAs.name)}】`, "he")
							.set("ai", card => {
								if (get.event().goon) {
									return 7 - get.value(card);
								}
								return 0;
							})
							.set("goon", get.attitude(target, player) * (player.getUseValue(viewAs) || 1) >= 1)
							.forResult();
						if (result?.bool) {
							const card = result.cards[0];
							await game.delayex();
							const next = target.loseToDiscardpile(card, ui.cardPile);
							next.log = false;
							if (get.position(card) == "e") {
								game.log(target, "将", card, "置于了牌堆底");
							} else {
								next.blank = true;
								game.log(target, "将一张牌置于了牌堆底");
							}
							await next;
							game.broadcastAll(viewAs => {
								lib.skill.dcshizong_backup2.viewAs = viewAs;
							}, lib.skill.dcshizong_backup.viewAs);
							const evt = event.getParent();
							evt.set("_backupevent", "dcshizong_backup2");
							evt.set("openskilldialog", `请选择${get.translation(viewAs.nature)}${get.translation(viewAs.name)}的目标`);
							evt.backup("dcshizong_backup2");
							evt.set("norestore", true);
							evt.set("custom", {
								add: {},
								replace: { window() {} },
							});
							evt.goto(0);
							if (target != _status.currentPhase) {
								player.tempBanSkill("dcshizong");
							}
						} else {
							target.chat("不放！");
							game.log(target, "选择不将牌置于牌堆底");
							var evt = event.getParent();
							evt.set("dcshizong", true);
							evt.goto(0);
							player.tempBanSkill("dcshizong");
						}
						await game.delayx();
					},
					ai: { order: 10 },
				};
			},
			prompt(links, player) {
				return `###恃纵：选择要交出的牌和目标角色###将${get.cnNumber(player.countMark("dcshizong_used") + 1)}张牌交给一名其他角色，其可以选择将一张牌置于牌堆底，视为你使用一张${get.translation(links[0][3] || "")}${get.translation(links[0][2])}。`;
			},
		},
		ai: {
			order() {
				const player = get.player(),
					event = get.event();
				if (event.filterCard({ name: "jiu" }, player, event) && get.effect(player, { name: "jiu" }) > 0) {
					return get.order({ name: "jiu" }) + 0.1;
				}
				return get.order({ name: "sha" }) + 0.1;
			},
			respondSha: true,
			fireAttack: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (arg === "respond" || tag == "fireAttack") {
					return true;
				}
				if (player.countCards("he") < player.countMark("dcshizong_used") + 1) {
					return false;
				}
				if (tag == "respondSha") {
					return false;
				}
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
			backup2: {
				filterCard: () => false,
				selectCard: -1,
				log: false,
			},
			used: {
				charlotte: true,
				onremove: true,
				intro: { content: "本回合已发动#次【恃纵】" },
			},
		},
	}
```

## dc_sunchen 名字:孙綝 势力:wu

### dczigu 名字:自固
描述: 出牌阶段限一次。你可以弃置一张牌，然后获得场上的一张装备牌。若你没有因此获得其他角色的牌，你摸一张牌。
```js
dczigu: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		position: "he",
		selectCard: 1,
		check(card) {
			var player = _status.event.player;
			if (!player.hasSkill("dczuowei")) {
				return 6 - get.value(card);
			}
			if (player.countCards("h") == player.countCards("e") + 1 && !player.hasCard(card => player.hasValueTarget(card), "h")) {
				if (get.position(card) == "e") {
					return 0;
				}
				return 8 - get.value(card);
			}
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			const targets = game.filterPlayer(current => {
				return current.countGainableCards(player, "e");
			});
			if (targets.length == 0) {
				result = { bool: false };
			} else if (targets.length == 1) {
				result = { bool: true, targets: targets };
			} else {
				result = await player
					.chooseTarget("自固：获得一名角色装备区里的一张牌", true, (card, player, target) => {
						return target.countGainableCards(player, "e");
					})
					.set("ai", target => {
						if (target == _status.event.player) {
							return 10;
						}
						if (get.attitude(_status.event.player, target) < 0) {
							if (
								target.hasCard(card => {
									return get.value(card, player) >= 6;
								})
							) {
								return 12;
							}
							return 8;
						}
						return 0;
					})
					.forResult();
			}
			// step 1
			let target;
			if (result.bool) {
				target = result.targets[0];
				event.target = target;
				result = await player.gainPlayerCard("e", target, true).forResult();
			}
			// step 2
			if (!result.bool || target == player || !result.cards || !result.cards.some(i => get.owner(i) == player)) {
				await player.draw();
			}
		},
		ai: {
			order(item, player) {
				if (!player.hasSkill("dczuowei")) {
					return 9;
				}
				if (player.countCards("h") == player.countCards("e") + 1 && !player.hasCard(card => player.hasValueTarget(card), "h")) {
					return 9;
				}
				return 1;
			},
			result: {
				player: 1,
			},
		},
	}
```

### dczuowei 名字:作威
描述: 当你于回合内使用牌时，你可以根据你的手牌数执行对应效果：大于X，令此牌不可被响应；等于X，对一名其他角色造成1点伤害；小于X，摸两张牌且不能于本回合再触发该选项（X为你装备区里牌的数量且至少为1）。
```js
dczuowei: {
		audio: 2,
		trigger: { player: "useCard" },
		frequent: true,
		filter(event, player) {
			if (_status.currentPhase != player) {
				return false;
			}
			if (!player.hasSkill("dczuowei_ban")) {
				return true;
			}
			return Math.sign(player.countCards("h") - Math.max(1, player.countCards("e"))) >= 0;
		},
		direct: true,
		locked: false,
		async content(event, trigger, player) {
			let result;
			const hs = player.countCards("h");
			const es = Math.max(1, player.countCards("e"));
			const sign = Math.sign(hs - es);
			if (sign > 0) {
				result = await player
					.chooseBool(get.prompt("dczuowei"), "令" + get.translation(trigger.card) + "不可被响应")
					.set("frequentSkill", event.name)
					.set("ai", () => 1)
					.forResult();
			} else if (sign == 0) {
				result = await player
					.chooseTarget(get.prompt("dczuowei"), "对一名其他角色造成1点伤害", lib.filter.notMe)
					.set("ai", target => {
						return get.damageEffect(target, _status.event.player, _status.event.player);
					})
					.forResult();
			} else {
				result = await player
					.chooseBool(get.prompt("dczuowei"), "摸两张牌，然后本回合你不能再触发该分支")
					.set("ai", () => 1)
					.forResult();
			}
			if (!result.bool) {
				return;
			}
			if (sign <= 0 && !event.isMine() && !event.isOnline()) {
				await game.delayx();
			}
			if (sign > 0) {
				player.logSkill("dczuowei");
				trigger.directHit.addArray(game.players);
				return;
			}
			if (sign == 0) {
				const target = result.targets[0];
				player.logSkill("dczuowei", target);
				await target.damage();
				return;
			}
			player.logSkill("dczuowei");
			await player.draw(2);
			player.addTempSkill("dczuowei_ban");
		},
		subSkill: {
			ban: { charlotte: true },
		},
		mod: {
			aiValue(player, card, num) {
				if (_status.currentPhase != player) {
					return;
				}
				const event = get.event();
				if (!player.isPhaseUsing()) {
					return;
				}
				if (event.type != "phase") {
					return;
				}
				const cardsh = [],
					cardse = [];
				for (const cardx of ui.selected.cards) {
					const pos = get.position(cardx);
					if (pos == "h") {
						cardsh.add(cardx);
					} else if (pos == "e") {
						cardse.add(cardx);
					}
				}
				const hs = player.countCards("h") - cardsh.length,
					es = Math.max(1, player.countCards("e") - cardse.length);
				const delt = hs - es;
				if (delt <= 0) {
					return;
				}
				if (get.position(card) == "h" && delt == 1) {
					return num / 1.25;
				}
			},
			aiUseful() {
				return lib.skill.dczuowei.mod.aiValue.apply(this, arguments);
			},
			aiOrder(player, card, num) {
				if (player.hasSkill("dczuowei_ban") || _status.currentPhase != player) {
					return;
				}
				const cardsh = [],
					cardse = [];
				const pos = get.position(card);
				if (pos == "h") {
					cardsh.add(card);
				} else if (pos == "e") {
					cardse.add(card);
				}
				if (get.tag(card, "draw") || get.tag(card, "gain")) {
					const hs = player.countCards("h") - cardsh.length,
						es = Math.max(1, player.countCards("e") - cardse.length + (get.type(card) == "equip"));
					if ((player.hasSkill("dczuowei_ban") && hs < es) || hs == es) {
						return num + 10;
					}
					return num / 5;
				}
			},
		},
		ai: {
			threaten: 3,
			reverseEquip: true,
			effect: {
				player_use(card, player, target, current) {
					if (_status.currentPhase != player) {
						return;
					}
					let cha = player.countCards("h") - Math.max(1, player.countCards("e"));
					if (cha == 0 || (cha < 0 && !player.hasSkill("dczuowei_ban"))) {
						return [1, 2];
					}
				},
			},
		},
	}
```

## dc_zhangmancheng 名字:张曼成 势力:qun

### dclvecheng 名字:掠城
描述: 出牌阶段限一次。你可以选择一名其他角色，你于本回合对其使用当前手牌中的【杀】无任何次数限制。然后回合结束时，其展示所有手牌，若其中有【杀】，其可以选择对你依次使用其中所有的【杀】。
```js
dclvecheng: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			const { target } = event;
			player.addTempSkill("dclvecheng_xiongluan");
			player.markAuto("dclvecheng_xiongluan", [target]);
			var cards = player.getCards("h", "sha");
			if (cards.length) {
				player.addGaintag(cards, "dclvecheng_xiongluan");
			}
		},
		ai: {
			threaten: 3.1,
			order: 3.5,
			expose: 0.2,
			result: {
				target(player, target) {
					if (player.getStorage("dclvecheng_xiongluan").includes(target)) {
						return 0;
					}
					if (
						target.hasSkillTag(
							"freeShan",
							false,
							{
								player: player,
								type: "use",
							},
							true
						)
					) {
						return -0.6;
					}
					var hs = player.countCards("h", card => {
						if (!player.canUse(card, target)) {
							return false;
						}
						return get.name(card) == "sha" && get.effect(target, card, player, player) > 0;
					});
					var ts = target.hp;
					if (hs >= ts && ts > 1) {
						return -2;
					}
					return -1;
				},
			},
		},
		subSkill: {
			xiongluan: {
				trigger: { player: ["phaseEnd", "useCard1"] },
				charlotte: true,
				forced: true,
				popup: false,
				onremove(player, skill) {
					player.removeGaintag(skill);
					delete player.storage[skill];
				},
				filter(event, player) {
					if (event.name == "useCard") {
						if (event.addCount === false || !event.targets?.some(target => player.getStorage("dclvecheng_xiongluan").includes(target))) {
							return false;
						}
						return player.hasHistory("lose", evt => {
							const evtx = evt.relatedEvent || evt.getParent();
							if (evtx != event) {
								return false;
							}
							return Object.values(evt.gaintag_map).flat().includes("dclvecheng_xiongluan");
						});
					}
					return player.getStorage("dclvecheng_xiongluan").some(i => i.isIn());
				},
				async content(event, trigger, player) {
					if (trigger.name == "useCard") {
						trigger.addCount = false;
						const stat = player.getStat().card,
							name = trigger.card.name;
						if (typeof stat[name] == "number") {
							stat[name]--;
						}
						return;
					}
					const targets = player.getStorage(event.name).slice().sortBySeat();
					if (!targets.length) {
						return;
					}
					while (targets.length && player.isIn()) {
						const target = targets.shift();
						await target.showHandcards();
						let cards = target.getCards("h", card => {
							return get.name(card) === "sha" && target.canUse(card, player, false);
						});
						if (!cards.length) {
							continue;
						}
						let forced = false;
						while (cards.length && player.isIn()) {
							const prompt2 = forced ? `掠城：选择对${get.translation(player)}使用的【杀】` : `掠城：是否依次对${get.translation(player)}使用所有的【杀】？`;
							const result = await target
								.chooseToUse(
									forced,
									function (card, player, event) {
										if (get.itemtype(card) != "card" || get.name(card) != "sha") {
											return false;
										}
										return lib.filter.filterCard.apply(this, arguments);
									},
									prompt2
								)
								.set("targetRequired", true)
								.set("complexTarget", true)
								.set("complexSelect", true)
								.set("filterTarget", function (card, player, target) {
									if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
										return false;
									}
									return lib.filter.targetEnabled.apply(this, arguments);
								})
								.set("sourcex", player)
								.forResult();
							if (result.bool) {
								cards = target.getCards("h", card => {
									return get.name(card) === "sha" && target.canUse(card, player, false);
								});
								forced = true;
							} else {
								break;
							}
						}
					}
				},
				intro: { content: "对$使用“掠城”【杀】无任何次数限制" },
				mod: {
					cardUsableTarget(card, player, target) {
						if (!card.cards || card.cards.length != 1) {
							return;
						}
						if (card.name == "sha" && card.cards[0].hasGaintag("dclvecheng_xiongluan") && player.getStorage("dclvecheng_xiongluan").includes(target)) {
							return true;
						}
					},
				},
			},
		},
	}
```

### dczhongji 名字:螽集
描述: 当你使用牌时，若此牌无花色或你手牌区里没有与此牌花色相同的手牌，你可以将手牌摸至体力上限并弃置X张牌（X为本回合发动〖螽集〗的次数）。
```js
dczhongji: {
		audio: 2,
		trigger: { player: "useCard" },
		filter(event, player) {
			if (player.countCards("h") >= player.maxHp) {
				return false;
			}
			var suit = get.suit(event.card);
			return !lib.suit.includes(suit) || !player.countCards("h", { suit: suit });
		},
		check(event, player) {
			var num = Math.min(20, player.maxHp - player.countCards("h"));
			if (num <= 0) {
				return false;
			}
			var numx =
				player.getHistory("useSkill", evt => {
					return evt.skill == "dczhongji";
				}).length + 1;
			if (numx > num) {
				return false;
			}
			if (_status.currentPhase != player) {
				return true;
			}
			if (
				player.hasCard(card => {
					var suit = get.suit(card);
					return (
						player.hasValueTarget(card) &&
						!player.hasCard(cardx => {
							return cardx != card && get.suit(cardx) == suit;
						})
					);
				})
			) {
				return false;
			}
			return true;
		},
		prompt2(event, player) {
			var num = Math.min(20, player.maxHp - player.countCards("h"));
			var str = num > 0 ? "摸" + get.cnNumber(num) + "张牌，然后" : "";
			return (
				str +
				"弃置" +
				get.cnNumber(
					1 +
						player.getHistory("useSkill", evt => {
							return evt.skill == "dczhongji";
						}).length
				) +
				"张牌"
			);
		},
		async content(event, trigger, player) {
			const drawNum = Math.min(20, player.maxHp - player.countCards("h"));
			if (drawNum > 0) {
				await player.draw({
					num: drawNum,
				});
			}
			const discardNum = player.getHistory("useSkill", evt => evt.skill == "dczhongji").length;
			await player.chooseToDiscard({
				prompt: "螽集：请弃置" + get.cnNumber(discardNum) + "张牌",
				position: "he",
				forced: true,
				selectCard: discardNum,
				ai: get.unuseful,
			});
		},
		ai: {
			threaten: 3.2,
		},
	}
```

## yue_zhoufei 名字:乐周妃 势力:wu

### dclingkong 名字:灵箜
描述: 锁定技。①游戏开始时，你将手牌标记为“箜篌”。②你的“箜篌”牌不计入手牌上限。③当你于一回合内首次于摸牌阶段外得到牌后，你将这些牌标记为“箜篌”。
```js
dclingkong: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		filter(event, player) {
			return (event.name != "phase" || game.phaseNumber == 0) && player.countCards("h");
		},
		async content(event, trigger, player) {
			const cards = player.getCards("h");
			if (cards.length) {
				player.addGaintag(cards, "dclingkong_tag");
			}
		},
		mod: {
			ignoredHandcard(card, player) {
				if (card.hasGaintag("dclingkong_tag")) {
					return true;
				}
			},
			cardDiscardable(card, player, name) {
				if (name == "phaseDiscard" && card.hasGaintag("dclingkong_tag")) {
					return false;
				}
			},
		},
		group: "dclingkong_marker",
		subSkill: {
			marker: {
				audio: "dclingkong",
				trigger: {
					player: "gainAfter",
					global: "loseAsyncAfter",
				},
				forced: true,
				filter: (event, player) => {
					const phaseDraw = event.getParent("phaseDraw");
					if (phaseDraw?.player === player) {
						return false;
					}
					const history = player.getHistory("gain", evt => {
						const phaseDraw = evt.getParent("phaseDraw");
						return !phaseDraw || phaseDraw.player !== player;
					});
					const evt = event.name == "loseAsync" ? event.childEvents?.find(evtx => evtx.name == "gain" && evtx.player == player) : event;
					if (history.indexOf(evt) !== 0) {
						return false;
					}
					const hs = player.getCards("h");
					if (!hs.length) {
						return false;
					}
					const cards = event.getg?.(player);
					return cards?.some(card => hs.includes(card));
				},
				async content(event, trigger, player) {
					let hs = player.getCards("h"),
						cards = trigger.getg(player);
					cards = cards.filter(card => hs.includes(card));
					if (cards.length) {
						player.addGaintag(cards, "dclingkong_tag");
					}
					await game.delayx();
				},
			},
		},
	}
```

### dcxianshu 名字:贤淑
描述: 出牌阶段，你可以将一张“箜篌”正面向上交给一名其他角色，然后你摸X张牌（X为你与其的体力值之差且至多为5）。若此牌为红色，且该角色的体力值不大于你，则其回复1点体力；若此牌为黑色，且该角色的体力值不小于你，则其失去1点体力。
```js
dcxianshu: {
		audio: 2,
		enable: "phaseUse",
		filter: (event, player) => {
			return game.hasPlayer(current => current != player) && player.hasCard(card => card.hasGaintag("dclingkong_tag"), "h");
		},
		filterCard: card => card.hasGaintag("dclingkong_tag"),
		filterTarget: lib.filter.notMe,
		discard: false,
		lose: false,
		delay: false,
		position: "h",
		check: card => {
			const player = _status.event.player,
				event = _status.event,
				color = get.color(card);
			if (color == "red") {
				return (event.getTempCache("dcxianshu", "red") ||
					event.putTempCache(
						"dcxianshu",
						"red",
						game
							.hasPlayer(current => {
								return current != player && current.hp <= player.hp && current.isDamaged() && get.recoverEffect(current, player, player) > 0;
							})
							.toString()
					)) == "true"
					? 7 - get.value(card)
					: 0;
			} else if (color == "black") {
				return (event.getTempCache("dcxianshu", "black") ||
					event.putTempCache(
						"dcxianshu",
						"black",
						game
							.hasPlayer(current => {
								return current != player && current.hp >= player.hp && get.effect(current, { name: "losehp" }, player, player) > 0;
							})
							.toString()
					)) == "true"
					? 7 - get.value(card)
					: 0;
			}
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.give(cards, target, true);
			const color = get.color(cards[0], player);
			if (target.isIn()) {
				const num = Math.min(Math.abs(target.getHp() - player.getHp()), 5);
				if (num > 0) {
					await player.draw({ num });
				}
			}
			if (color == "red") {
				if (target.getHp() <= player.getHp() && target.isDamaged()) {
					await target.recover();
				}
			} else if (color == "black") {
				if (target.getHp() >= player.getHp()) {
					await target.loseHp();
				}
			}
		},
		ai: {
			combo: "dclingkong",
			order: 10,
			result: {
				player(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					let num = target.getHp() - player.getHp();
					const card = ui.selected.cards[0],
						color = get.color(card);
					if (color == "red" && target.getHp() <= player.getHp() && target.isDamaged()) {
						num++;
					} else if (color == "black" && target.getHp() >= player.getHp()) {
						num--;
					}
					return Math.min(Math.abs(num), 5) * 1.1;
				},
				target(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					const card = ui.selected.cards[0],
						color = get.color(card),
						val = get.value(card, target);
					if (color == "red" && target.getHp() <= player.getHp() && target.isDamaged()) {
						return get.recoverEffect(target, player, target) + val / 1.4;
					} else if (color == "black" && target.getHp() >= player.getHp()) {
						return get.effect(target, { name: "losehp" }, player, target) + val / 1.4;
					}
					return val / 1.4;
				},
			},
		},
	}
```

## dc_wuban 名字:吴班 势力:shu

### dcyouzhan 名字:诱战
描述: 锁定技。当其他角色于你的回合内失去牌后，你摸一张牌（不计入本回合的手牌上限），且其获得如下效果：1.其于此回合下一次受到的伤害+1；2.结束阶段，若其于此回合未受到过伤害，其摸X张牌（X为其此回合失去过牌的次数且至多为3）。
```js
dcyouzhan: {
		audio: 2,
		trigger: { global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"] },
		forced: true,
		getIndex(event, player) {
			if (player != _status.currentPhase) {
				return false;
			}
			return game
				.filterPlayer(current => {
					if (current == player) {
						return false;
					}
					const evt = event.getl(current);
					return evt?.cards2?.length;
				})
				.sortBySeat();
		},
		logTarget: (event, player, triggername, target) => target,
		async content(event, trigger, player) {
			const target = event.targets[0];
			const next = player.draw();
			next.gaintag = [event.name];
			await next;
			player.addTempSkill(event.name + "_limit");
			target.addTempSkill(event.name + "_effect");
			target.addMark(event.name + "_effect", 1, false);
			target.addTempSkill(event.name + "_draw");
		},
		ai: {
			damageBonus: true,
			skillTagFilter(player, tag, arg) {
				if (!arg || !arg.target || !arg.target.hasSkill("dcyouzhan_effect")) {
					return false;
				}
			},
		},
		subSkill: {
			effect: {
				audio: "dcyouzhan",
				trigger: { player: "damageBegin3" },
				filter(event, player) {
					return player.hasMark("dcyouzhan_effect");
				},
				forced: true,
				charlotte: true,
				onremove: true,
				async content(event, trigger, player) {
					trigger.num += player.countMark(event.name);
					player.removeSkill(event.name);
				},
				mark: true,
				intro: { content: "本回合下一次受到的伤害+#" },
				ai: {
					effect: {
						target(card, player, target) {
							if (get.tag(card, "damage")) {
								return 1 + 0.5 * target.countMark("dcyouzhan_effect");
							}
						},
					},
				},
			},
			draw: {
				trigger: { global: "phaseJieshuBegin" },
				forced: true,
				charlotte: true,
				filter(event, player) {
					return !player.getHistory("damage").length;
				},
				async content(event, trigger, player) {
					await player.draw({ num: Math.min(3, player.getHistory("lose").length) });
				},
			},
			limit: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("dcyouzhan");
				},
				mod: {
					ignoredHandcard(card, player) {
						if (card.hasGaintag("dcyouzhan")) {
							return true;
						}
					},
					cardDiscardable(card, player, name) {
						if (name == "phaseDiscard" && card.hasGaintag("dcyouzhan")) {
							return false;
						}
					},
				},
			},
		},
	}
```

## yue_caiwenji 名字:乐蔡琰 势力:qun

### dcshuangjia 名字:霜笳
描述: 锁定技。①游戏开始，你将初始手牌标记为“胡笳”。②你的“胡笳”牌不计入手牌上限。③其他角色至你的距离+X（X为你的“胡笳”数且至多为5）。
```js
dcshuangjia: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		async content(event, trigger, player) {
			const cards = player.getCards("h");
			player.addGaintag(cards, "dcshuangjia_tag");
		},
		mod: {
			ignoredHandcard(card, player) {
				if (card.hasGaintag("dcshuangjia_tag")) {
					return true;
				}
			},
			cardDiscardable(card, player, name) {
				if (name == "phaseDiscard" && card.hasGaintag("dcshuangjia_tag")) {
					return false;
				}
			},
			globalTo(from, to, distance) {
				return (
					distance +
					Math.min(
						5,
						to.countCards("h", card => card.hasGaintag("dcshuangjia_tag"))
					)
				);
			},
		},
		mark: true,
		marktext: "笳",
		intro: {
			name: "胡笳",
			content(storage, player) {
				const num = player.countCards("h", card => card.hasGaintag("dcshuangjia_tag"));
				return `当前拥有${get.cnNumber(num)}张“胡笳”手牌`;
			},
			markcount(storage, player, skill) {
				return player.countCards("h", card => card.hasGaintag("dcshuangjia_tag"));
			},
		},
	}
```

### dcbeifen 名字:悲愤
描述: 锁定技。①当你失去牌后，若这些牌中有“胡笳”牌，你获得与你手牌中“胡笳”牌花色均不同的每种花色的牌各一张。②若你手牌中“胡笳”牌数小于不为“胡笳”牌的牌数，你使用牌无距离和次数限制。
```js
dcbeifen: {
		audio: 2,
		trigger: {
			player: ["loseAfter"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			const evt = event.getl(player);
			if (!evt?.hs?.length) {
				return false;
			}
			if (event.name == "lose") {
				return Object.values(event.gaintag_map).flat().includes("dcshuangjia_tag");
			}
			return player.hasHistory("lose", evt => {
				if (event != evt.getParent()) {
					return false;
				}
				return Object.values(evt.gaintag_map).flat().includes("dcshuangjia_tag");
			});
		},
		forced: true,
		async content(event, trigger, player) {
			const suits = new Set(lib.suit);
			for (const card of player.iterableGetCards("h", card => card.hasGaintag("dcshuangjia_tag"))) {
				suits.delete(get.suit(card));
			}
			const cards = [];
			for (const suit of suits) {
				const card = get.cardPile(cardx => get.suit(cardx, false) == suit);
				if (card) {
					cards.push(card);
				}
			}
			if (cards.length) {
				await player.gain({
					cards,
					animate: "draw",
				});
			}
		},
		mod: {
			cardUsable(card, player) {
				var len = player.countCards("h");
				var cnt = player.countCards("h", card => card.hasGaintag("dcshuangjia_tag"));
				if (2 * cnt < len) {
					return Infinity;
				}
			},
			targetInRange(card, player) {
				var len = player.countCards("h");
				var cnt = player.countCards("h", card => card.hasGaintag("dcshuangjia_tag"));
				if (2 * cnt < len) {
					return true;
				}
			},
			aiOrder(player, card, num) {
				if (get.itemtype(card) == "card" && card.hasGaintag("dcshuangjia_tag")) {
					var suits = lib.suit.slice();
					player.countCards("h", cardx => {
						if (!cardx.hasGaintag("dcshuangjia_tag")) {
							return false;
						}
						if (card == cardx) {
							return false;
						}
						suits.remove(get.suit(cardx));
					});
					if (suits.length) {
						return num + suits.length * 2.5;
					}
				}
			},
		},
	}
```

## liuchongluojun 名字:刘宠骆俊 势力:qun

### dcminze 名字:悯泽
描述: ①出牌阶段每名角色限一次。你可以将至多两张牌名不同的牌交给一名手牌数小于你的角色。②结束阶段，你将手牌摸至X张（X为你本回合因〖悯泽①〗失去过的牌的牌名数且至多为5）。
```js
dcminze: {
		audio: 2,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			if (player.getStorage("dcminze_targeted").includes(target)) {
				return false;
			}
			return target.countCards("h") < player.countCards("h");
		},
		filterCard(card, player) {
			if (!ui.selected.cards.length) {
				return true;
			}
			return get.name(ui.selected.cards[0]) != get.name(card);
		},
		selectCard: [1, 2],
		complexCard: true,
		position: "he",
		discard: false,
		lose: false,
		delay: false,
		group: "dcminze_draw",
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.give(cards, target);
			player.addTempSkill("dcminze_targeted", "phaseUseAfter");
			player.markAuto("dcminze_targeted", [target]);
			player.addTempSkill("dcminze_given");
			player.markAuto(
				"dcminze_given",
				cards.map(card => get.name(card, player))
			);
		},
		ai: {
			order: 6.5,
			expose: 0.2,
		},
		subSkill: {
			targeted: { onremove: true, charlotte: true },
			given: {
				charlotte: true,
				onremove: true,
				intro: {
					content: "本回合以此法交出的牌名：$",
				},
			},
			draw: {
				trigger: { player: "phaseJieshuBegin" },
				filter(event, player) {
					return player.getStorage("dcminze_given").length;
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					const num = Math.min(5, player.getStorage("dcminze_given").length) - player.countCards("h");
					if (num > 0) {
						player.draw(num);
					}
				},
			},
		},
	}
```

### dcjini 名字:击逆
描述: 当你受到伤害后，你可以重铸至多Y张手牌（Y为你的体力上限减本回合你以此法重铸过的牌数）。若你以此法获得了【杀】，你可以对伤害来源使用一张无视距离且不可被响应的【杀】。
```js
dcjini: {
		audio: 2,
		trigger: { player: "damageEnd" },
		direct: true,
		filter(event, player) {
			return player.maxHp - player.countMark("dcjini_counted") > 0;
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			result = await player
				.chooseCard(get.prompt2("dcjini"), [1, player.maxHp - player.countMark("dcjini_counted")], lib.filter.cardRecastable)
				.set("ai", card => {
					return 6 - get.value(card);
				})
				.forResult();
			// step 1
			if (result.bool) {
				const cards = result.cards;
				player.logSkill("dcjini");
				player.addTempSkill("dcjini_counted");
				player.addMark("dcjini_counted", cards.length, false);
				event.recast = player.recast(cards);
				await event.recast;
			} else {
				return;
			}
			// step 2
			if (trigger.source && trigger.source.isIn() && player.hasHistory("gain", evt => evt.getParent(2) == event.recast && evt.cards.some(value => get.name(value) == "sha"))) {
				await player
					.chooseToUse(
						function (card) {
							if (get.name(card) != "sha") {
								return false;
							}
							return lib.filter.filterCard.apply(this, arguments);
						},
						"击逆：是否对" + get.translation(trigger.source) + "使用一张不可被响应的杀？"
					)
					.set("complexSelect", true)
					.set("filterTarget", function (card, player, target) {
						if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
							return false;
						}
						return lib.filter.targetEnabled.apply(this, arguments);
					})
					.set("sourcex", trigger.source)
					.set("oncard", () => {
						_status.event.directHit.addArray(game.players);
					});
			}
		},
		subSkill: {
			counted: {
				onremove: true,
				charlotte: true,
			},
		},
	}
```

## yuechen 名字:乐綝 势力:wei

### dcporui 名字:破锐
描述: 每轮限一次。其他角色的结束阶段，你可以弃置一张牌并选择另一名于此回合内失去过牌的其他角色，你视为对其依次使用X+1张【杀】，然后你交给其X张手牌（X为其本回合失去的牌数且至多为5）。
```js
dcporui: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			if (player == event.player) {
				return false;
			}
			if (player.countMark("dcporui_round") >= (player.hasMark("dcgonghu_basic") ? 2 : 1) || player.countCards("h") == 0) {
				return false;
			}
			return (
				game.hasPlayer(current => {
					if (current == player || current == event.player) {
						return false;
					}
					return current.hasHistory("lose", evt => evt.cards2.length);
				}) && player.countCards("he") > 0
			);
		},
		async cost(event, trigger, player) {
			const map = new Map();
			game.countPlayer(current => {
				if (current == player || current == trigger.player) {
					return false;
				}
				if (current.hasHistory("lose", evt => evt.cards2.length)) {
					map.set(
						current,
						Math.min(
							5,
							current.getHistory("lose").reduce((num, evt) => num + evt.cards2.length, 0)
						) + 1
					);
				}
			});
			const next = player
				.chooseCardTarget({
					prompt: get.prompt(event.skill),
					prompt2: get.skillInfoTranslation(event.skill, player, false),
					filterCard: lib.filter.cardDiscardable,
					position: "he",
					filterTarget(card, player, target) {
						return get.event().map.has(target);
					},
					ai1(card) {
						return 7 - get.value(card);
					},
					ai2(target) {
						let player = get.event().player,
							num = get.event().map.get(target),
							eff = get.effect(target, { name: "sha" }, player, player);
						if (num > 1 && eff !== 0) {
							eff -= (10 / target.getHp()) * Math.pow(2, num);
						}
						return eff * num;
					},
				})
				.set("map", map);
			next.set(
				"targetprompt2",
				next.targetprompt2.concat([
					target => {
						if (!target.isIn() || !get.event().filterTarget(null, get.player(), target)) {
							return false;
						}
						return `破锐${get.event().map.get(target)}`;
					},
				])
			);
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cards,
			} = event;
			player.addTempSkill(event.name + "_round", "roundStart");
			player.addMark(event.name + "_round", 1, false);
			await player.discard(cards);
			const num = Math.min(
				5,
				target.getHistory("lose").reduce((num, evt) => num + evt.cards2.length, 0)
			);
			let count = num + 1;
			const card = get.autoViewAs({ name: "sha", isCard: true, storage: { [event.name]: true } });
			while (count-- && player.canUse(card, target, false) && target.isIn()) {
				await player.useCard(card, target);
			}
			if (!player.hasMark("dcgonghu_damage") && target.isIn() && player.countCards("h") && num) {
				const numx = Math.min(num, player.countCards("h"));
				await player.chooseToGive(target, "h", numx, true, `破锐：交给${get.translation(target)}${get.cnNumber(numx)}张手牌`);
			}
		},
		subSkill: { round: { charlotte: true, onremove: true } },
		ai: {
			expose: 0.4,
			threaten: 3.8,
		},
	}
```

### dcgonghu 名字:共护
描述: 锁定技。①当你于回合外失去基本牌后，若你本回合内失去基本牌的数量大于1，你将〖破锐〗改为每轮限两次。②当你造成或受到伤害后，若你本回合内造成或受到的总伤害大于1，你删除〖破锐〗中的“，然后你交给其X张手牌”。③当你使用红色基本牌/红色普通锦囊牌时，若你已发动过〖共护①〗和〖共护②〗，则此牌不可被响应/可额外增加一个目标。
```js
dcgonghu: {
		audio: 2,
		trigger: {
			player: ["loseAfter", "damageEnd"],
			source: "damageSource",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		forced: true,
		filter(event, player) {
			if (event.name == "damage") {
				if (player.hasMark("dcgonghu_damage")) {
					return false;
				}
				let num1 = 0,
					num2 = 0;
				player.getHistory("damage", evt => (num1 += evt.num));
				player.getHistory("sourceDamage", evt => (num2 += evt.num));
				return num1 > 1 || num2 > 1;
			}
			if (!_status.currentPhase || _status.currentPhase == player) {
				return false;
			}
			if (player.hasMark("dcgonghu_basic")) {
				return false;
			}
			if (_status.currentPhase && _status.currentPhase == player) {
				return false;
			}
			var evt = event.getl(player);
			if (!evt || !evt.cards2 || !evt.cards2.some(i => get.type2(i, player) == "basic")) {
				return false;
			}
			var num = 0;
			player.getHistory("lose", function (evtx) {
				if (num < 2) {
					if (evtx && evtx.cards2) {
						num += evtx.cards2.filter(i => get.type2(i, player) == "basic").length;
					}
				}
			});
			return num >= 2;
		},
		group: ["dcgonghu_basic", "dcgonghu_trick"],
		async content(event, trigger, player) {
			player.addMark("dcgonghu_" + (trigger.name == "damage" ? "damage" : "basic"), 1, false);
			game.log(player, "修改了技能", "#g【破锐】");
		},
		ai: {
			combo: "dcporui",
		},
		subSkill: {
			trick: {
				audio: "dcgonghu",
				trigger: { player: "useCard2" },
				direct: true,
				locked: true,
				filter(event, player) {
					if (!player.hasMark("dcgonghu_basic") || !player.hasMark("dcgonghu_damage")) {
						return false;
					}
					var card = event.card;
					if (get.color(card, false) != "red" || get.type(card, null, false) != "trick") {
						return false;
					}
					var info = get.info(card);
					if (info.allowMultiple == false) {
						return false;
					}
					if (event.targets && !info.multitarget) {
						if (
							game.hasPlayer(function (current) {
								return !event.targets.includes(current) && lib.filter.targetEnabled2(card, player, current);
							})
						) {
							return true;
						}
					}
					return false;
				},
				async content(event, trigger, player) {
					let result;

					// step 0
					const prompt2 = "为" + get.translation(trigger.card) + "增加一个目标";
					result = await player
						.chooseTarget(get.prompt("dcgonghu_trick"), function (card, player, target) {
							player = _status.event.player;
							return !_status.event.targets.includes(target) && lib.filter.targetEnabled2(_status.event.card, player, target);
						})
						.set("prompt2", prompt2)
						.set("ai", function (target) {
							const trigger = _status.event.getTrigger();
							const player = _status.event.player;
							return get.effect(target, trigger.card, player, player);
						})
						.set("card", trigger.card)
						.set("targets", trigger.targets)
						.forResult();
					// step 1
					if (result.bool) {
						if (!event.isMine() && !event.isOnline()) {
							game.delayx();
						}
						event.targets = result.targets;
					} else {
						return;
					}
					// step 2
					if (event.targets) {
						player.logSkill("dcgonghu_trick", event.targets);
						trigger.targets.addArray(event.targets);
					}
				},
			},
			basic: {
				audio: "dcgonghu",
				trigger: { player: "useCard" },
				forced: true,
				filter(event, player) {
					if (!player.hasMark("dcgonghu_basic") || !player.hasMark("dcgonghu_damage")) {
						return false;
					}
					var card = event.card;
					return get.color(card, false) == "red" && get.type(card, null, false) == "basic";
				},
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.filterPlayer());
					game.log(trigger.card, "不可被响应");
				},
			},
		},
	}
```

## zhangkai 名字:张闿 势力:qun

### dcxiangshu 名字:相鼠
描述: 其他角色的出牌阶段开始时，若其手牌数不小于其体力值，你可以选择一个不大于5的非负整数，然后你弃置一张手牌或声明此数字。若如此做，此阶段结束时，若其手牌数与你选择的数字：差值不大于1，你获得其一张牌；相等，你对其造成1点伤害。
```js
dcxiangshu: {
		audio: 2,
		trigger: { global: "phaseUseBegin" },
		direct: true,
		filter(event, player) {
			return event.player != player && event.player.countCards("h") >= event.player.hp;
		},
		async content(event, trigger, player) {
			let result;
			const list = [0, 1, 2, 3, 4, 5, "cancel2"];
			result = await player
				.chooseControl(list)
				.set("prompt", get.prompt2("dcxiangshu"))
				.set("ai", () => {
					return _status.event.choice;
				})
				.set(
					"choice",
					(function () {
						if (get.attitude(player, trigger.player) > 0) {
							return "cancel2";
						}
						const cards = trigger.player.getCards("h");
						let num = 0;
						for (const card of cards) {
							if (!trigger.player.hasValueTarget(card)) {
								num++;
								if (num >= 5) {
									break;
								}
							}
						}
						if (cards.length >= 3 && Math.random() < 0.5) {
							num = Math.max(0, num - 1);
						}
						return num;
					})()
				)
				.forResult();
			if (result?.control == "cancel2") {
				return;
			}
			player.logSkill("dcxiangshu", trigger.player);
			const num = result.index;
			player.storage.dcxiangshu_lottery = num;
			player.addTempSkill("dcxiangshu_lottery", "phaseUseAfter");
			result = await player
				.chooseToDiscard("相鼠：是否弃置一张手牌不公布此数字？", "h")
				.set("ai", card => 2 - get.value(card))
				.forResult();
			if (!result?.bool) {
				const lotteryNum = player.storage.dcxiangshu_lottery;
				player.markSkill("dcxiangshu_lottery");
				player.popup(lotteryNum);
				game.log(player, "选择了数字", "#g" + lotteryNum);
			}
		},
		subSkill: {
			lottery: {
				audio: "dcxiangshu",
				trigger: { global: "phaseUseEnd" },
				charlotte: true,
				forced: true,
				onremove: true,
				logTarget: "player",
				filter(event, player) {
					return typeof player.storage.dcxiangshu_lottery == "number" && Math.abs(event.player.countCards("h") - player.storage.dcxiangshu_lottery) <= 1;
				},
				async content(event, trigger, player) {
					const delt = Math.abs(trigger.player.countCards("h") - player.storage.dcxiangshu_lottery);
					if (delt <= 1 && trigger.player.countGainableCards("he", player) > 0) {
						await player.gainPlayerCard(trigger.player, "he", true);
					}
					if (delt == 0) {
						await trigger.player.damage(player);
					}
				},
				intro: { content: "猜测的数字为#" },
			},
		},
	}
```

## gaoxiang 名字:高翔 势力:shu

### dcchiying 名字:驰应
描述: 出牌阶段限一次。你可以选择一名体力不大于你的角色，令其可以弃置其攻击范围内的任意名其他角色各一张牌。然后若该角色不为你，其获得以此法弃置的牌中所有的基本牌。
```js
dcchiying: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target.hp <= player.hp;
		},
		async content(event, tirgger, player) {
			const target = event.target,
				targets = [player];
			while (game.hasPlayer(current => target.inRange(current) && !targets.includes(current))) {
				const result = await target
					.chooseTarget("驰应：是否弃置攻击范围内一名角色一张牌？", function (card, player, target) {
						return _status.event.player.inRange(target) && !_status.event.targets.includes(target);
					})
					.set("targets", targets)
					.set("ai", function (target) {
						return get.effect(target, { name: "guohe_copy2" }, _status.event.player, _status.event.player);
					})
					.forResult();
				if (result.bool) {
					target.line(result.targets, "green");
					await target.discardPlayerCard(result.targets[0], true, "he");
					targets.addArray(result.targets);
				} else {
					break;
				}
			}
			if (target != player) {
				let cards = [];
				game.getGlobalHistory("cardMove", evt => {
					if (evt.getParent(3) == event) {
						cards.addArray(evt.cards.filter(card => get.type(card) == "basic"));
					}
				});
				cards = cards.filterInD("d");
				if (cards.length) {
					target.gain(cards, "gain2");
				}
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					var targets = game.filterPlayer(current => target.inRange(current) && current != player);
					var eff = 0;
					for (var targetx of targets) {
						var effx = get.effect(targetx, { name: "guohe_copy2" }, player, target);
						if (get.attitude(player, targetx) < 0) {
							effx /= 2;
						}
						eff += effx;
					}
					return (target == player ? 0.5 : 1) * eff * (get.attitude(player, target) <= 0 ? 0.75 : 1);
				},
			},
		},
	}
```

## yuanyin 名字:袁胤 势力:qun

### dcmoshou 名字:墨守
描述: 当你成为一名角色使用的黑色牌的目标后，你可以摸体力上限张牌，然后若你以此法摸的牌数：大于1，你令下次以此法摸的牌数-1；为1，将此技能摸牌数重置为你的体力上限。
```js
dcmoshou: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return get.color(event.card) == "black" && player.maxHp > player.countMark("dcmoshou");
		},
		frequent: true,
		prompt2(event, player) {
			const num = player.maxHp - player.countMark("dcmoshou");
			let info = "摸" + get.cnNumber(num) + "张牌";
			if (num === 1) {
				info += "，然后重置【墨守】摸牌数";
			} else if (num > 1) {
				info += "，然后令你下次以此法摸的牌数-1";
			}
			return info;
		},
		async content(event, trigger, player) {
			const { name: mark } = event;
			let num = player.maxHp - player.countMark(mark);
			if (num > 0) {
				await player.draw(num);
			}
			if (num > 1) {
				player.addMark(mark, 1, false);
			} else if (num === 1) {
				player.clearMark(mark, false);
			}
		},
		ai: {
			effect: {
				target_use(card, player, target) {
					if (typeof card === "object" && get.color(card) === "black") {
						const num = target.maxHp - target.countMark("dcmoshou");
						return [1, 0.6 * num];
					}
				},
			},
		},
		onremove: true,
		mark: true,
		intro: {
			markcount: (storage, player) => player.maxHp - player.countMark("dcmoshou"),
			content: (storage, player) => `下次【墨守】摸牌数：${player.maxHp - player.countMark("dcmoshou")}`,
		},
	}
```

### dcyunjiu 名字:运柩
描述: 一名角色死亡后，你可以将其此次弃置的一张牌交给一名其他角色。然后你加1点体力上限并回复1点体力。
```js
dcyunjiu: {
		audio: 2,
		trigger: { global: "dieAfter" },
		getCards(event, player) {
			const cards = [];
			const evt = player.getHistory("lose", evtx => evtx.getParent(2) == event)[0];
			return evt ? cards.addArray(evt.hs).addArray(evt.es).filterInD("d") : [];
		},
		filter(event, player) {
			return get.info("dcyunjiu").getCards(event, event.player).length;
		},
		async cost(event, trigger, player) {
			const { player: target } = trigger,
				cards = get.info(event.skill).getCards(trigger, target);
			let result;
			if (cards.length > 1) {
				result = await player
					.chooseCardButton("运柩：请选择要分配的牌", cards)
					.set("ai", button => {
						const player = get.player(),
							{ link } = button;
						if (!game.hasPlayer(current => player != current && get.attitude(player, current)) > 0) {
							return 6.5 - get.value(link);
						}
						return get.value(link);
					})
					.forResult();
			} else if (cards.length === 1) {
				result = { bool: true, links: cards.slice(0) };
			} else {
				return;
			}
			if (!result.bool) {
				return;
			}
			const toGive = result.links.slice(0);
			result = await player
				.chooseTarget("选择一名其他角色获得" + get.translation(toGive), lib.filter.notMe)
				.set("ai", target => {
					const { player, enemy } = get.event();
					const att = get.attitude(player, target);
					if (enemy) {
						return -att;
					} else if (att > 0) {
						return att / (1 + target.countCards("h"));
					} else {
						return Math.max(0.1, att) / 100;
					}
				})
				.set("enemy", get.value(toGive[0], player, "raw") < 0)
				.forResult();
			event.result = {
				bool: result.bool,
				targets: result.targets,
				cost_data: toGive,
			};
		},
		async content(event, trigger, player) {
			const {
				cost_data: cards,
				targets: [target],
			} = event;
			player.line(target, "green");
			await target.gain(cards, "gain2").set("giver", player);
			await player.gainMaxHp();
			await player.recover();
		},
	}
```

## dongwan 名字:董绾 势力:qun

### dcshengdu 名字:生妒
描述: 回合开始时，你可以选择一名其他角色，令其获得1枚“生妒”标记。有“生妒”标记的角色于摸牌阶段得到牌后，你摸X张牌，然后其移去所有“生妒”标记（X为摸牌数乘以其拥有的“生妒”标记数）。
```js
dcshengdu: {
		audio: 2,
		trigger: { player: "phaseBegin" },
		direct: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2("dcshengdu"), lib.filter.notMe)
				.set("ai", target => {
					const player = _status.event.player;
					const att = get.attitude(player, target);
					const eff = get.effect(
						target,
						{
							name: "sha",
							storage: { dcjieling: true },
						},
						player,
						player
					);
					let value = att / 5;
					if (value < 0) {
						value = -value / 1.3;
					}
					value = Math.max(value - eff / 20, 0.01);
					return value;
				})
				.forResult();
			if (result.bool) {
				const target = result.targets[0];
				player.logSkill("dcshengdu", target);
				target.addMark("dcshengdu", 1);
			}
		},
		intro: { content: "mark" },
		group: "dcshengdu_effect",
		subSkill: {
			effect: {
				audio: "dcshengdu",
				trigger: { global: "gainAfter" },
				filter(event, player) {
					return event.getParent(2).name == "phaseDraw" && event.player.hasMark("dcshengdu");
				},
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					var num = trigger.player.countMark("dcshengdu");
					player.draw(num * trigger.cards.length);
					trigger.player.removeMark("dcshengdu", num);
				},
			},
		},
	}
```

### dcjieling 名字:介绫
描述: 出牌阶段每种花色限一次，你可以将两张花色不同的手牌当无距离限制且无任何次数限制的【杀】使用。然后若此【杀】：造成了伤害，所有目标角色失去1点体力；未造成伤害，所有目标角色依次获得1枚“生妒”标记。
```js
dcjieling: {
		audio: 2,
		enable: "phaseUse",
		position: "hs",
		viewAs: {
			name: "sha",
			storage: { dcjieling: true },
		},
		filterCard(card, player) {
			if (player.getStorage("dcjieling_count").includes(get.suit(card))) {
				return false;
			}
			if (ui.selected.cards.length) {
				return get.suit(card) != get.suit(ui.selected.cards[0]);
			}
			return true;
		},
		selectCard: 2,
		complexCard: true,
		check(card) {
			return 6 - get.value(card);
		},
		async precontent(event, trigger, player) {
			player.addTempSkill("dcjieling_after");
			event.getParent().addCount = false;
			player.addTempSkill("dcjieling_count", "phaseUseAfter");
			player.markAuto(
				"dcjieling_count",
				event.result.cards.reduce((list, card) => list.add(get.suit(card, player)), [])
			);
		},
		ai: {
			order(item, player) {
				return get.order({ name: "sha" }) + 0.1;
			},
		},
		locked: false,
		mod: {
			targetInRange(card) {
				if (card.storage && card.storage.dcjieling) {
					return true;
				}
			},
			cardUsable(card, player, num) {
				if (card.storage && card.storage.dcjieling) {
					return Infinity;
				}
			},
		},
		subSkill: {
			after: {
				charlotte: true,
				audio: "dcjieling",
				trigger: { global: "useCardAfter" },
				filter(event, player) {
					return event.card.name == "sha" && event.card.storage && event.card.storage.dcjieling;
				},
				direct: true,
				async content(event, trigger, player) {
					const damaged = game.hasPlayer2(current => {
						return current.hasHistory("damage", evt => evt.card == trigger.card);
					});
					const targets = trigger.targets.filter(i => i.isIn());
					player.logSkill("dcjieling_after", targets);
					if (damaged) {
						for (const target of targets) {
							target.loseHp();
						}
					} else {
						for (const target of targets) {
							target.addMark("dcshengdu", 1);
						}
					}
				},
			},
			count: {
				intro: {
					content(s, p) {
						let str = "此阶段已转化过的卡牌花色：";
						for (let i = 0; i < s.length; i++) {
							str += get.translation(s[i]);
						}
						return str;
					},
				},
				charlotte: true,
				onremove: true,
			},
		},
	}
```

## zhangchu 名字:张楚 势力:qun

### dcjizhong 名字:集众
描述: 出牌阶段限一次。你可以令一名其他角色摸两张牌，然后其选择一项：1.若其没有“信众”标记，其获得“信众”标记；2.你获得其三张牌。
```js
dcjizhong: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		selectTarget: 1,
		async content(event, trigger, player) {
			const target = event.target;
			await target.draw(2);
			if (!target.hasMark("dcjizhong")) {
				const result = await target
					.chooseBool(`集众：令${get.translation(player)}获得你三张牌，或点击“取消”获得“信众”标记`)
					.set("ai", () => false)
					.forResult();
				if (!result.bool) {
					target.addMark("dcjizhong", 1);
					return;
				}
			}
			let num = Math.min(target.countCards("he"), 3);
			if (num > 0) {
				await player.gainPlayerCard(target, "he", num, true);
			}
		},
		marktext: "信",
		intro: {
			name: "信众",
			name2: "信众",
			markcount: () => 0,
			content: "已成为信徒",
		},
		ai: {
			order: 9.5,
			result: {
				target(player, target) {
					var num = target.countCards("h");
					if (num <= 1) {
						return -num;
					}
					if (get.attitude(player, target) > 0 && !target.hasMark("dcjizhong")) {
						return 1;
					}
					return -1 / (num / 2 + 1);
				},
			},
		},
	}
```

### dcrihui 名字:日彗
描述: 每回合限一次。当你使用普通锦囊牌或黑色基本牌结算结束后，若此牌的目标数为1且目标不为你，且其：没有“信众”，则你可以令所有有“信众”的角色依次视为对其使用一张与此牌牌名和属性相同的牌；有“信众”，则你可以获得其区域里的一张牌。
```js
dcrihui: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		usable: 1,
		filter(event, player) {
			if (!event.targets || event.targets.length != 1 || event.targets[0] == player) {
				return false;
			}
			const card = event.card;
			const target = event.targets[0];
			const marked = target.hasMark("dcjizhong");
			return (get.type(card) == "trick" || (get.color(card) == "black" && get.type(card) == "basic")) && ((marked && target.countGainableCards(player, "hej")) || (!marked && game.hasPlayer(current => current.hasMark("dcjizhong"))));
		},
		logTarget: event => event.targets[0],
		prompt2(event, player) {
			const target = event.targets[0];
			if (target.hasMark("dcjizhong")) {
				return "获得该角色区域内的一张牌";
			} else {
				const targets = game.filterPlayer(current => current.hasMark("dcjizhong"));
				const card = { name: event.card.name, nature: event.card.nature, isCard: true };
				return `令所有有“信众”的角色（${get.translation(targets)}）依次视为对其使用一张${get.translation(card)}`;
			}
		},
		check(event, player) {
			const target = event.targets[0];
			if (target.hasMark("dcjizhong")) {
				return get.effect(target, { name: "shunshou_copy" }, player, player) > 0;
			} else {
				const card = { name: event.card.name, nature: event.card.nature, isCard: true };
				let eff = 0;
				game.countPlayer(current => {
					if (!current.hasMark("dcjizhong") || !current.canUse(card, player, false)) {
						return;
					}
					eff += get.effect(target, card, current, player);
				});
				return eff > 0;
			}
		},
		async content(event, trigger, player) {
			const target = trigger.targets[0];
			if (target.hasMark("dcjizhong")) {
				await player.gainPlayerCard(target, "hej", true);
			} else {
				const card = { name: trigger.card.name, nature: trigger.card.nature, isCard: true };
				const targets = game.filterPlayer(current => current.hasMark("dcjizhong")).sortBySeat(_status.currentPhase);
				for (const current of targets) {
					if (target.isIn() && current.isIn() && current.canUse(card, target, false)) {
						await current.useCard(card, target, false);
					}
				}
			}
		},
		ai: { combo: "dcjizhong" },
	}
```

### dcguangshi 名字:光噬
描述: 锁定技。准备阶段，若所有其他角色均有“信众”，你摸X张牌并失去1点体力（X为全场“信众”数）。
```js
dcguangshi: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return !game.hasPlayer(current => current != player && !current.hasMark("dcjizhong"));
		},
		forced: true,
		async content(event, trigger, player) {
			await player.draw(game.filterPlayer().reduce((sum, current) => sum + current.countMark("dcjizhong"), 0));
			await player.loseHp();
		},
		ai: {
			combo: "dcjizhong",
			halfneg: true,
		},
	}
```

## peiyuanshao 名字:裴元绍 势力:qun

### dcmoyu 名字:没欲
描述: 出牌阶段每名角色限一次。你可以获得一名其他角色区域里的一张牌，然后其可以对你使用一张无距离限制的【杀】。若此【杀】：未对你造成过伤害，你将此技能于此阶段下次获得的牌数改为两张；对你造成过伤害，你令此技能于本回合失效。
```js
dcmoyu: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.dcmoyu.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return player != target && !player.getStorage("dcmoyu_clear").includes(target) && target.countGainableCards(player, "hej");
		},
		async content(event, trigger, player) {
			const target = event.target;
			player.addTempSkill("dcmoyu_clear", "phaseUseAfter");
			player.markAuto("dcmoyu_clear", [target]);
			await player.gainPlayerCard(target, "hej", true, 1 + player.hasSkill("dcmoyu_add"));
			player.removeSkill("dcmoyu_add");
			const num = player.getStorage("dcmoyu_clear").length;
			const result = await target
				.chooseToUse(
					function (card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					},
					"是否对" + get.translation(player) + "使用一张无距离限制的【杀】？"
				)
				.set("targetRequired", true)
				.set("complexTarget", true)
				.set("complexSelect", true)
				.set("filterTarget", function (card, player, target) {
					if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
						return false;
					}
					return lib.filter.targetEnabled.apply(this, arguments);
				})
				.set("sourcex", player)
				.forResult();
			if (result.bool) {
				if (
					player.hasHistory("damage", evt => {
						return evt.card && evt.card.name == "sha" && evt.getParent(4) == event;
					})
				) {
					player.tempBanSkill("dcmoyu");
					player.addTempSkill("dcmoyu_ban");
				} else {
					player.addTempSkill("dcmoyu_add", "phaseChange");
				}
			}
		},
		global: "dcmoyu_ai",
		subSkill: {
			clear: {
				charlotte: true,
				onremove: true,
			},
			ban: {
				charlotte: true,
				mark: true,
				marktext: '<span style="text-decoration: line-through;">欲</span>',
				intro: { content: "偷马贼被反打了！" },
			},
			add: {
				charlotte: true,
				mark: true,
				marktext: "欲",
				intro: { content: "欲望加速，下次抢两张！" },
			},
			ai: {
				ai: {
					effect: {
						target(card, player, target, current) {
							if (get.type(card) == "delay" && current < 0) {
								var currentx = _status.currentPhase;
								if (!currentx || !currentx.isIn()) {
									return;
								}
								var list = game.filterPlayer(current => {
									if (current == target) {
										return true;
									}
									if (!current.hasSkill("dcmoyu")) {
										return false;
									}
									if (current.hasJudge("lebu")) {
										return false;
									}
									return get.attitude(current, target) > 0;
								});
								list.sortBySeat(currentx);
								if (list.indexOf(target) != 0) {
									return "zerotarget";
								}
							}
						},
					},
				},
			},
		},
		ai: {
			order: 9,
			threaten: 2.4,
			result: {
				target(player, target) {
					var num = get.sgn(get.attitude(player, target));
					var eff = get.effect(target, { name: "shunshou" }, player, player) * num;
					if (eff * num > 0) {
						return eff / 10;
					}
					if (
						player.hasShan() &&
						!target.hasSkillTag(
							"directHit_ai",
							true,
							{
								target: player,
								card: { name: "sha" },
							},
							true
						)
					) {
						return eff;
					}
					if (
						target.hasSha() &&
						player.hp +
							player.countCards("hs", function (card) {
								var mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
								if (mod2 != "unchanged") {
									return mod2;
								}
								var mod = game.checkMod(card, player, player, "unchanged", "cardSavable", player);
								if (mod != "unchanged") {
									return mod;
								}
								var savable = get.info(card).savable;
								if (typeof savable == "function") {
									savable = savable(card, player, player);
								}
								return savable;
							}) <=
							1
					) {
						return 0;
					}
					return eff;
				},
			},
		},
	}
```

## mengjie 名字:孟节 势力:qun

### dcyinlu 名字:引路
描述: `①游戏开始时，你令三名角色依次分别获得${get.poptip("dcyinlu_lequan")}、${get.poptip("dcyinlu_huoxi")}、${get.poptip("dcyinlu_zhangqi")}标记（若场上角色数为2则改为令这两名角色依次获得“乐泉”和“藿溪”，之后随机一名角色获得“瘴气”），然后你获得${get.poptip("dcyinlu_yunxiang")}标记并获得1点“芸香”值。②准备阶段/有〖引路〗标记的角色死亡时，你可以移动一名角色的1枚/其的所有〖引路〗标记。`
```js
dcyinlu: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		locked: false,
		derivation: ["dcyinlu_lequan", "dcyinlu_huoxi", "dcyinlu_zhangqi", "dcyinlu_yunxiang"],
		global: ["dcyinlu_lequan", "dcyinlu_huoxi", "dcyinlu_zhangqi", "dcyinlu_yunxiang"],
		group: "dcyinlu_move",
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		hasMark(target) {
			return lib.skill.dcyinlu.derivation.some(i => target.hasMark(i));
		},
		async content(event, trigger, player) {
			const marks = lib.skill.dcyinlu.derivation.slice(0, 3);
			const num = Math.min(3, game.countPlayer());
			const result = await player
				.chooseTarget({
					prompt: `引路：令${get.cnNumber(num)}名角色分别获得〖引路〗标记`,
					forced: true,
					selectTarget: num,
					complexTarget: true,
					targetprompt: () => {
						return get.translation(lib.skill.dcyinlu.derivation[ui.selected.targets.length - 1]);
					},
					ai(target) {
						const player = get.player();
						if (ui.selected.targets?.length == 2) {
							return get.effect(target, { name: "losehp" }, player, player);
						}
						return get.attitude(player, target);
					},
				})
				.forResult();
			if (result?.bool && result.targets?.length) {
				const targets = result.targets;
				player.line(targets);
				for (let i = 0; i < targets.length; i++) {
					targets[i].addMark(marks[i]);
					if (player != targets[i] && targets[i].identityShown) {
						if (get.mode() != "identity" || player.identity != "nei") {
							player.addExpose(0.3);
						}
					}
				}
				const target = targets.randomGet();
				if (num < 3) {
					target.addMark(marks[2]);
				}
				if (num < 2) {
					target.addMark(marks[1]);
				}
			}
			player.addMark("dcyinlu_yunxiang", 1);
			player.addMark("dcyinlu_xiang", 1);
			game.log(player, "获得了1点芸香值");
		},
		subSkill: {
			move: {
				audio: "dcyinlu",
				trigger: {
					player: "phaseZhunbeiBegin",
					global: "die",
				},
				direct: true,
				filter(event, player) {
					if (event.name == "die") {
						return lib.skill.dcyinlu.hasMark(event.player);
					}
					return game.hasPlayer(current => {
						return lib.skill.dcyinlu.hasMark(current);
					});
				},
				async content(event, trigger, player) {
					if (trigger.name != "die") {
						if (_status.connectMode) {
							game.broadcastAll(function () {
								_status.noclearcountdown = true;
							});
						}
						try {
							const targetResult = await player
								.chooseTarget(get.prompt("dcyinlu_move"), "移动一名角色的〖引路〗标记", 2, (card, player, target) => {
									if (ui.selected.targets.length == 0) {
										return lib.skill.dcyinlu.hasMark(target);
									}
									return true;
								})
								.set("ai", target => {
									const player = _status.event.player;
									if (ui.selected.targets.length == 0) {
										const owned = lib.skill.dcyinlu.derivation.filter(i => target.hasMark(i));
										const att = get.attitude(player, target);
										if (att > 0) {
											if (owned.includes("dcyinlu_zhangqi")) {
												return target.hasCard({ suit: "spade" }, "he") ? 5 : 10;
											}
											if (
												owned.includes("dcyinlu_lequan") &&
												target.isHealthy() &&
												game.hasPlayer(current => {
													return current != target && get.recoverEffect(current, player, player) > 0;
												})
											) {
												return 2;
											}
											return 0;
										}
										if (att < 0) {
											if (owned.some(i => i != "dcyinlu_zhangqi")) {
												return 8;
											}
											return 0;
										}
										if (
											owned.includes("dcyinlu_zhangqi") &&
											game.hasPlayer(current => {
												return current != target && get.effect(current, { name: "losehp" }, player, player) > 0;
											})
										) {
											return 3;
										}
										return 1;
									} else {
										const targetx = ui.selected.targets[0];
										const att = get.attitude(player, targetx),
											att2 = get.attitude(player, target);
										const owned = lib.skill.dcyinlu.derivation.filter(i => targetx.hasMark(i));
										if (att > 0) {
											if (owned.includes("dcyinlu_zhangqi")) {
												return -att2;
											}
											if (owned.includes("dcyinlu_lequan")) {
												return get.recoverEffect(target, player, player);
											}
										} else if (att < 0) {
											if (owned.some(i => i != "dcyinlu_zhangqi")) {
												return att2;
											}
										} else {
											if (owned.includes("dcyinlu_zhangqi")) {
												return get.effect(target, { name: "losehp" }, player, player);
											}
											return att2;
										}
									}
									return Math.random();
								})
								.set("complexTarget", true)
								.forResult();
							if (!targetResult?.bool || !targetResult.targets?.length) {
								return;
							}
							const marks = lib.skill.dcyinlu.derivation;
							const targets = targetResult.targets;
							const owned = marks.filter(mark => targets[0].hasMark(mark));
							let mark;
							if (owned.length == 1) {
								mark = owned[0];
							} else {
								const controlResult = await player
									.chooseControl(owned)
									.set("prompt", "引路：选择要移动" + get.translation(targets[0]) + "的标记")
									.set(
										"choiceList",
										owned.map(mark => {
											return '<div class="skill">【' + get.translation(mark) + "】</div><div>" + lib.translate[mark + "_info"] + "</div>";
										})
									)
									.set("displayIndex", false)
									.set("ai", () => {
										return _status.event.choice;
									})
									.set(
										"choice",
										(function () {
											const att = get.attitude(player, targets[0]),
												att2 = get.attitude(player, targets[1]);
											if (att > 0) {
												if (owned.includes("dcyinlu_zhangqi") && att2 < 0) {
													return "dcyinlu_zhangqi";
												}
												if (owned.includes("dcyinlu_lequan") && att2 > 0) {
													return "dcyinlu_lequan";
												}
											} else if (att < 0) {
												const marksx = owned.filter(i => i != "dcyinlu_zhangqi");
												if (marksx.length && att2 > 0) {
													return marksx[0];
												}
												return owned[0];
											} else {
												if (owned.includes("dcyinlu_zhangqi")) {
													return "dcyinlu_zhangqi";
												}
											}
											if (owned.length > 1) {
												owned.remove("dcyinlu_zhangqi");
											}
											return owned[0];
										})()
									)
									.forResult();
								mark = controlResult.control;
							}
							const count = targets[0].countMark(mark);
							player.logSkill("dcyinlu_move", targets, false);
							player.line2(targets, mark == "dcyinlu_zhangqi" ? "fire" : "green");
							targets[1].addMark(mark, count);
							if (mark == "dcyinlu_yunxiang") {
								targets[1].addMark("dcyinlu_xiang", targets[0].countMark("dcyinlu_xiang"));
							}
							targets[0].removeMark(mark, count);
							if (player != targets[1] && targets[1].identityShown) {
								if (get.mode() != "identity" || player.identity != "nei") {
									player.addExpose(0.3);
								}
							}
							return;
						} finally {
							if (_status.connectMode) {
								game.broadcastAll(function () {
									delete _status.noclearcountdown;
									game.stopCountChoose();
								});
							}
						}
					}

					event.marks = lib.skill.dcyinlu.derivation.filter(mark => trigger.player.hasMark(mark));
					while (event.marks.length) {
						const mark = event.marks[0];
						const result = await player
							.chooseTarget("引路：是否转移“" + get.translation(mark) + "”标记？")
							.set("ai", target => {
								const player = _status.event.player,
									mark = _status.event.mark;
								if (mark == "dcyinlu_zhangqi") {
									return get.effect(target, { name: "losehp" }, player, player) + 0.1;
								}
								if (mark == "dcyinlu_lequan") {
									return get.recoverEffect(target, player, player) + get.attitude(player, target) / 5;
								}
								return get.attitude(player, target);
							})
							.set("mark", mark)
							.forResult();
						if (result.bool) {
							const target = result.targets[0];
							player.logSkill("dcyinlu_move", target);
							const count = trigger.player.countMark(mark);
							target.addMark(mark, count);
							if (mark == "dcyinlu_yunxiang") {
								target.addMark("dcyinlu_xiang", trigger.player.countMark("dcyinlu_xiang"));
							}
							trigger.player.removeMark(mark, count, false);
							if (player != target && target.identityShown) {
								if (get.mode() != "identity" || player.identity != "nei") {
									player.addExpose(0.3);
								}
							}
						}
						event.marks.shift();
					}
				},
			},
			lequan: {
				trigger: { player: "phaseJieshuBegin" },
				direct: true,
				charlotte: true,
				filter(event, player) {
					return player.hasMark("dcyinlu_lequan") && game.hasPlayer(current => current.hasSkill("dcyinlu"));
				},
				marktext: "乐",
				intro: {
					name: "乐泉",
					name2: "乐泉",
					markcount: () => 0,
					content: "结束阶段，你可以弃置一张♦牌，然后回复1点体力。",
				},
				async content(event, trigger, player) {
					const result = await player
						.chooseToDiscard("乐泉：是否弃置一张♦牌，然后回复1点体力？", { suit: "diamond" }, "he")
						.set("ai", card => {
							if (_status.event.goon) {
								return 7 - get.value(card);
							}
							return 0;
						})
						.set("logSkill", "dcyinlu_lequan")
						.set("goon", get.recoverEffect(player, player))
						.forResult();
					if (result.bool) {
						await player.recover();
					}
				},
			},
			huoxi: {
				trigger: { player: "phaseJieshuBegin" },
				direct: true,
				charlotte: true,
				filter(event, player) {
					return player.hasMark("dcyinlu_huoxi") && game.hasPlayer(current => current.hasSkill("dcyinlu"));
				},
				marktext: "藿",
				intro: {
					name: "藿溪",
					name2: "藿溪",
					markcount: () => 0,
					content: "结束阶段，你可以弃置一张♥牌，然后摸两张牌。",
				},
				async content(event, trigger, player) {
					const result = await player
						.chooseToDiscard("藿溪：是否弃置一张♥牌，然后摸两张牌？", { suit: "heart" }, "he")
						.set("ai", card => {
							return 6 - get.value(card);
						})
						.set("logSkill", "dcyinlu_huoxi")
						.forResult();
					if (result.bool) {
						await player.draw(2);
					}
				},
			},
			zhangqi: {
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				direct: true,
				charlotte: true,
				filter(event, player) {
					return player.hasMark("dcyinlu_zhangqi") && game.hasPlayer(current => current.hasSkill("dcyinlu"));
				},
				marktext: "瘴",
				intro: {
					name: "瘴气",
					name2: "瘴气",
					markcount: () => 0,
					content: "锁定技。结束阶段，你须弃置一张♠牌，否则失去1点体力。",
				},
				async content(event, trigger, player) {
					const result = await player
						.chooseToDiscard("瘴气：弃置一张♠牌，或失去1点体力", { suit: "spade" }, "he")
						.set("ai", card => {
							if (_status.event.goon) {
								return 7 - get.value(card);
							}
							return 0;
						})
						.set("logSkill", "dcyinlu_zhangqi")
						.set("goon", get.effect(player, { name: "losehp" }, player) < 0)
						.forResult();
					if (!result.bool) {
						player.logSkill("dcyinlu_zhangqi");
						await player.loseHp();
					}
				},
			},
			yunxiang: {
				trigger: { player: ["phaseJieshuBegin", "damageBegin4"] },
				direct: true,
				charlotte: true,
				filter(event, player) {
					if (!game.hasPlayer(current => current.hasSkill("dcyinlu"))) {
						return false;
					}
					if (event.name == "phaseJieshu") {
						return player.hasMark("dcyinlu_yunxiang");
					}
					return player.hasMark("dcyinlu_yunxiang") && player.hasMark("dcyinlu_xiang");
				},
				onremove(player) {
					delete player.storage.dcyinlu_xiang;
				},
				marktext: "芸",
				intro: {
					name: "芸香",
					name2: "芸香",
					markcount(storage, player) {
						return player.countMark("dcyinlu_xiang");
					},
					content(storage, player) {
						return "①结束阶段，你可以弃置一张♣牌，获得1点“芸香”值。②当你受到伤害时，你可以扣减所有“芸香”值，减少等量的伤害。<li>当前芸香值：" + player.countMark("dcyinlu_xiang");
					},
				},
				async content(event, trigger, player) {
					let result;
					if (trigger.name == "phaseJieshu") {
						result = await player
							.chooseToDiscard("芸香：是否弃置一张♣牌，获得1枚“香”？", { suit: "club" }, "he")
							.set("ai", card => {
								return 6 - get.value(card) + 2.5 * _status.event.player.countMark("dcyinlu_xiang");
							})
							.set("logSkill", "dcyinlu_yunxiang")
							.forResult();
					} else {
						result = await player
							.chooseBool("芸香：是否移去所有“香”，令此伤害-" + player.countMark("dcyinlu_xiang") + "？")
							.set("ai", () => {
								return _status.event.bool;
							})
							.set("bool", get.damageEffect(player, trigger.source, player) < 0)
							.forResult();
					}
					if (result.bool) {
						if (trigger.name == "phaseJieshu") {
							player.addMark("dcyinlu_xiang", 1, false);
							game.log(player, "获得了1点芸香值");
						} else {
							player.logSkill("dcyinlu_yunxiang");
							var num = player.countMark("dcyinlu_xiang");
							player.removeMark("dcyinlu_xiang", num, false);
							game.log(player, "扣减了", num, "点芸香值");
							trigger.num = Math.max(0, trigger.num - num);
						}
					}
				},
			},
		},
	}
```

### dcyouqi 名字:幽栖
描述: 锁定技。当其他角色因〖引路〗标记弃置牌后，你有一定概率获得此牌。
```js
dcyouqi: {
		audio: 2,
		trigger: { global: "loseAfter" },
		filter(event, player) {
			if (event.getParent(3).name.indexOf("dcyinlu_") != 0 || player == event.player) {
				return false;
			}
			return true;
		},
		derivation: "dcyouqi_faq",
		direct: true,
		forced: true,
		async content(event, trigger, player) {
			if (Math.random() < 1.25 - 0.25 * get.distance(player, trigger.player) || get.isLuckyStar(player)) {
				player.logSkill("dcyouqi");
				player.gain(trigger.cards.filterInD("d"), "gain2");
			}
		},
		ai: {
			combo: "dcyinlu",
		},
	}
```

## dc_huojun 名字:霍峻 势力:shu

### dcgue 名字:孤扼
描述: 每回合限一次。当你需要于回合外使用或打出【杀】或【闪】时，你可以发动此技能：你展示所有手牌，若其中【杀】和【闪】的数量之和不超过1，你视为使用或打出此牌。
```js
dcgue: {
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			if (player.hasSkill("dcgue_blocker", null, null, false)) {
				return false;
			}
			return name == "sha" || name == "shan";
		},
		filter(event, player) {
			if (event.dcgue || event.type == "wuxie" || player == _status.currentPhase) {
				return false;
			}
			if (player.hasSkill("dcgue_blocker", null, null, false)) {
				return false;
			}
			for (var name of ["sha", "shan"]) {
				if (event.filterCard({ name: name, isCard: true }, player, event)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				var vcards = [];
				for (var name of ["sha", "shan"]) {
					var card = { name: name, isCard: true };
					if (event.filterCard(card, player, event)) {
						vcards.push(["基本", "", name]);
					}
				}
				return ui.create.dialog("孤扼", [vcards, "vcard"], "hidden");
			},
			check(button) {
				if (_status.event.player.countCards("h", { name: ["sha", "shan"] }) > 1) {
					return 0;
				}
				return 1;
			},
			backup(links, player) {
				return {
					filterCard: () => false,
					selectCard: -1,
					viewAs: {
						name: links[0][2],
						isCard: true,
					},
					log: false,
					popname: true,
					async precontent(event, trigger, player) {
						player.logSkill("dcgue");
						player.addTempSkill("dcgue_blocker");
						await player.showHandcards();
						if (player.countCards("h", { name: ["sha", "shan"] }) > 1) {
							const evt = event.getParent();
							evt.set("dcgue", true);
							evt.goto(0);
							delete evt.openskilldialog;
							return;
						}
						await game.delayx();
					},
				};
			},
			prompt(links, player) {
				return (player.countCards ? "展示所有手牌" : "") + (player.countCards("h", { name: ["sha", "shan"] }) <= 1 ? "，然后视为使用【" + get.translation(links[0][2]) + "】" : "");
			},
		},
		subSkill: { blocker: { charlotte: true } },
		ai: {
			order: 1,
			respondSha: true,
			respondShan: true,
			skillTagFilter(player) {
				if (player.hasSkill("dcgue_blocker", null, null, false)) {
					return false;
				}
			},
			result: {
				player(player) {
					if (player.countCards("h", { name: ["sha", "shan"] }) > 1) {
						return 0;
					}
					return 1;
				},
			},
		},
	}
```

### dcsigong 名字:伺攻
描述: 其他角色的回合结束时，若其于本回合内使用牌被响应过，你可以将手牌摸至或弃置至1，视为对其使用一张需使用X张【闪】抵消的【杀】，且此【杀】的伤害基数+1（X为你以此法弃置的牌数且至少为1）。当你以此法造成伤害后，该技能于本轮失效。
```js
dcsigong: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			if (event.player === player || !event.player.isIn()) {
				return false;
			}
			if (!player.canUse("sha", event.player, false)) {
				return false;
			}
			let respondEvts = [];
			for (const current of game.filterPlayer2()) {
				respondEvts.addArray(current.getHistory("useCard"));
				respondEvts.addArray(current.getHistory("respond"));
			}
			respondEvts = respondEvts.filter(i => i.respondTo).map(evt => evt.respondTo);
			return event.player.hasHistory("useCard", evt => {
				return respondEvts.some(list => list[1] == evt.card);
			});
		},
		direct: true,
		async content(event, trigger, player) {
			const num = 1 - player.countCards("h");
			event.num = num;
			let prompt2 = "";
			let next;
			if (num >= 0) {
				next = player.chooseBool().set("ai", () => _status.event.goon);
				prompt2 += (num > 0 ? "摸一张牌，" : "") + "视为对" + get.translation(trigger.player) + "使用一张【杀】（伤害基数+1）";
			} else {
				next = player
					.chooseToDiscard(-num, "allowChooseAll")
					.set("ai", card => {
						if (_status.event.goon) {
							return 5.2 - get.value(card);
						}
						return 0;
					})
					.set("logSkill", ["dcsigong", trigger.player]);
				prompt2 += "将手牌数弃置至1，视为对" + get.translation(trigger.player) + "使用一张【杀】（伤害基数+1）";
			}
			next.set("prompt", get.prompt("dcsigong", trigger.player));
			next.set("prompt2", prompt2);
			next.set("goon", get.effect(trigger.player, { name: "sha" }, player, player) > 0);
			const result = await next.forResult();
			if (!result.bool) {
				return;
			}
			if (num >= 0) {
				player.logSkill("dcsigong", trigger.player);
			}
			if (num > 0) {
				await player.draw(num, "nodelay");
			}
			event.num = Math.max(1, Math.abs(num));
			if (player.canUse("sha", trigger.player, false)) {
				player.addTempSkill("dcsigong_check");
				await player
					.useCard({ name: "sha", isCard: true }, trigger.player, false)
					.set("shanReq", event.num)
					.set("oncard", card => {
						const evt = _status.event;
						evt.baseDamage++;
						for (const target of game.filterPlayer(null, null, true)) {
							const id = target.playerid;
							const map = evt.customArgs;
							if (!map[id]) {
								map[id] = {};
							}
							map[id].shanRequired = evt.shanReq;
						}
					});
			}
		},
		subSkill: {
			check: {
				charlotte: true,
				forced: true,
				popup: false,
				trigger: { source: "damageSource" },
				filter(event, player) {
					return event.card && event.card.name == "sha" && event.getParent(3).name == "dcsigong";
				},
				async content(event, trigger, player) {
					player.tempBanSkill("dcsigong", "roundStart");
				},
			},
		},
	}
```

## dc_sunhanhua 名字:孙寒华 势力:wu

### dchuiling 名字:汇灵
描述: 锁定技。当你使用牌时，若此牌颜色为弃牌堆中数量较少的颜色，你获得1枚“灵”标记。若弃牌堆中：红色牌数大于黑色牌数，你回复1点体力；黑色牌数大于红色牌数，你可以弃置一名其他角色的一张牌。
```js
dchuiling: {
		audio: 2,
		trigger: { player: "useCard" },
		forced: true,
		direct: true,
		filter() {
			return ui.discardPile.childNodes.length > 0;
		},
		onremove: true,
		mark: true,
		marktext: "灵",
		intro: {
			name2: "灵",
			mark(dialog, storage, player) {
				dialog.addText("共有" + (storage || 0) + "个标记");
				dialog.addText("注：图标的颜色代表弃牌堆中较多的颜色");
			},
		},
		global: "dchuiling_hint",
		async content(event, trigger, player) {
			let mark = false;
			let red = 0,
				black = 0;
			for (let i = 0; i < ui.discardPile.childNodes.length; i++) {
				const color = get.color(ui.discardPile.childNodes[i]);
				if (color == "red") {
					red++;
				}
				if (color == "black") {
					black++;
				}
			}
			if (red == black) {
				return;
			} else if (red > black) {
				player.logSkill("dchuiling");
				await player.recover();
				if (get.color(trigger.card) == "black") {
					mark = true;
				}
				event.logged = true;
			} else {
				if (!event.isMine() && !event.isOnline()) {
					game.delayx();
				}
				if (get.color(trigger.card) == "red") {
					mark = true;
				}
				if (game.hasPlayer(current => current != player && current.hasDiscardableCards(player, "he"))) {
					const result = await player
						.chooseTarget(get.prompt("dchuiling"), "你可以弃置一名其他角色的一张牌", (card, player, target) => {
							return target != player && target.hasDiscardableCards(player, "he");
						})
						.set("ai", target => {
							return get.effect(target, { name: "guohe_copy2" }, _status.event.player);
						})
						.forResult();

					if (result?.bool) {
						const target = result.targets[0];
						if (!event.logged) {
							player.logSkill("dchuiling", target);
						} else {
							player.line(target);
						}
						await player.discardPlayerCard(target, "he", true);
					}
				}
			}
			if (mark) {
				if (!event.logged) {
					player.logSkill("dchuiling");
				}
				player.addMark("dchuiling", 1);
				event.logged = true;
			}
		},
		subSkill: {
			hint: {
				trigger: {
					global: ["loseAfter", "loseAsyncAfter", "cardsDiscardAfter", "equipAfter"],
				},
				forced: true,
				popup: false,
				lastDo: true,
				forceDie: true,
				forceOut: true,
				filter(event, player) {
					if (event._dchuiling_checked) {
						return false;
					}
					event._dchuiling_checked = true;
					var cards = event.getd();
					if (!cards.filterInD("d").length) {
						return false;
					}
					return true;
				},
				markColor: [
					["rgba(241, 42, 42, 0.75)", "black"],
					["", ""],
					["rgba(18, 4, 4, 0.75)", "rgb(200, 200, 200)"],
				],
				async content(event, trigger, player) {
					let red = 0,
						black = 0;
					for (let i = 0; i < ui.discardPile.childNodes.length; i++) {
						const color = get.color(ui.discardPile.childNodes[i]);
						if (color == "red") {
							red++;
						}
						if (color == "black") {
							black++;
						}
					}
					if (trigger.name.indexOf("lose") == 0) {
						const cards = trigger.getd().filterInD("d");
						for (let i = 0; i < cards.length; i++) {
							const color = get.color(cards[i]);
							if (color == "red") {
								red++;
							}
							if (color == "black") {
								black++;
							}
						}
					}
					game.broadcastAll(
						function (ind) {
							var bgColor = lib.skill.dchuiling_hint.markColor[ind][0],
								text = '<span style="color: ' + lib.skill.dchuiling_hint.markColor[ind][1] + '">灵</span>';
							for (var player of game.players) {
								if (player.marks.dchuiling) {
									player.marks.dchuiling.firstChild.style.backgroundColor = bgColor;
									player.marks.dchuiling.firstChild.innerHTML = text;
								}
							}
						},
						Math.sign(black - red) + 1
					);
				},
			},
		},
		mod: {
			aiOrder(player, card, num) {
				if (get.itemtype(card) != "card") {
					return;
				}
				var len = ui.discardPile.childNodes.length;
				if (!len) {
					var type = get.type(card);
					if (type == "basic" || type == "trick") {
						if (player.getDamagedHp() > 0) {
							return num + (get.color(card) == "red" ? 15 : 10);
						}
						return num + 10;
					}
					return;
				}
				if (len > 40) {
					return;
				}
				var red = 0,
					black = 0;
				for (var i = 0; i < ui.discardPile.childNodes.length; i++) {
					var color = get.color(ui.discardPile.childNodes[i]);
					if (color == "red") {
						red++;
					}
					if (color == "black") {
						black++;
					}
				}
				if (red == black) {
					var type = get.type(card);
					if (type == "basic" || type == "trick") {
						if (player.getDamagedHp() > 0) {
							return num + (get.color(card) == "red" ? 15 : 10);
						}
						return num + 10;
					}
					return;
				} else {
					var color = get.color(card);
					if ((color == "red" && red < black) || (color == "black" && red > black)) {
						return num + 10;
					}
				}
			},
		},
	}
```

### dcchongxu 名字:冲虚
描述: `限定技。出牌阶段，若“灵”数不小于4，你可以失去${get.poptip("dchuiling")}，增加X点体力上限（X为你的“灵”数且至多为游戏人数），然后获得${get.poptip("dctaji")}和${get.poptip("dcqinghuang")}。`
```js
dcchongxu: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		derivation: ["dctaji", "dcqinghuang"],
		manualConfirm: true,
		prompt() {
			return "限定技。你可以失去〖汇灵〗，增加" + Math.min(game.players.length, _status.event.player.countMark("dchuiling")) + "点体力上限，然后获得〖踏寂〗和〖青荒〗。";
		},
		filter(event, player) {
			return player.countMark("dchuiling") >= 4;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const num = Math.min(game.players.length, player.countMark("dchuiling"));
			await player.removeSkills("dchuiling");
			await player.gainMaxHp(num);
			await player.addSkills(["dctaji", "dcqinghuang"]);
		},
		ai: {
			combo: "dchuiling",
			order(itemp, player) {
				if (
					player.hasCard(card => {
						return get.type(card) != "equip" && player.getUseValue(card) > 1;
					}, "h")
				) {
					return 12;
				}
				return 0.1;
			},
			result: {
				player(player) {
					var count = player.countMark("dchuiling");
					if (count >= game.countPlayer() - 1) {
						return 1;
					}
					return count >= 6 || player.hp <= 2 ? 1 : 0;
				},
			},
		},
	}
```

## dc_sunziliufang 名字:新杀孙资刘放 势力:wei

### dcqinshen 名字:勤慎
描述: 弃牌阶段结束时，你可以摸X张牌（X为本回合未进入过弃牌堆的花色数）。
```js
dcqinshen: {
		audio: 2,
		trigger: { player: "phaseDiscardEnd" },
		frequent: true,
		prompt2() {
			return "摸" + get.cnNumber(lib.skill.dcqinshen.getNum()) + "张牌";
		},
		getNum() {
			const list = lib.suit.slice();
			const suit = get.discarded().map(c => get.suit(c, false));
			list.removeArray(suit);
			return list.length;
		},
		filter(event, player) {
			return lib.skill.dcqinshen.getNum() > 0;
		},
		async content(event, trigger, player) {
			await player.draw(lib.skill.dcqinshen.getNum());
		},
	}
```

### dcweidang 名字:伪谠
描述: 其他角色的结束阶段，你可以将一张字数为X的牌置于牌堆底，然后获得牌堆里一张字数为X的牌（X为本回合未进入过弃牌堆的花色数）。若你能使用此牌，你使用之。
```js
dcweidang: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		/**
		 * @deprecated
		 */
		getLength: card => get.cardNameLength(card),
		filter(event, player) {
			const num = lib.skill.dcqinshen.getNum();
			return event.player != player && (_status.connectMode ? player.countCards("he") : player.hasCard(card => get.cardNameLength(card) == num, "he"));
		},
		async cost(event, trigger, player) {
			const num = lib.skill.dcqinshen.getNum();
			event.result = await player
				.chooseCard(get.prompt(event.skill), "将一张字数为" + num + "的牌置于牌堆底，然后获得一张字数为" + num + "的牌。若你能使用此牌，你使用之。", "he", (card, player, target) => {
					return get.cardNameLength(card) == _status.event.num;
				})
				.set("num", num)
				.set("ai", card => {
					return 5 - get.value(card);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			const num = lib.skill.dcqinshen.getNum();
			game.broadcastAll(function (player) {
				const cardx = ui.create.card();
				cardx.classList.add("infohidden");
				cardx.classList.add("infoflip");
				player.$throw(cardx, 1000, "nobroadcast");
			}, player);
			await player.lose(cards, ui.cardPile);
			await game.delayx();
			const card = get.cardPile(cardx => get.cardNameLength(cardx) == num);
			if (card) {
				await player.gain(card, "gain2");
				if (player.hasUseTarget(card)) {
					await player.chooseUseTarget(card, true);
				}
			}
		},
	}
```

## yuantanyuanxiyuanshang 名字:袁谭袁尚袁熙 势力:qun

### dcneifa 名字:内伐
描述: 出牌阶段开始时，你可以摸三张牌，然后弃置一张牌。若你弃置的牌类型为：基本牌，本阶段你不能使用锦囊牌，且【杀】的使用次数上限+X且可以额外指定一名目标；锦囊牌，本阶段你不能使用基本牌，且使用普通锦囊牌选择目标时可以增加或减少一个目标（X为你发动〖内伐〗弃牌后手牌中因〖内伐〗而不能使用的牌的数量且最多为5。你以此法选择的额外目标均无距离限制）。
```js
dcneifa: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		async content(event, trigger, player) {
			await player.draw(3);
			const result = await player
				.chooseToDiscard(true, "he")
				.set("ai", function (cardx) {
					const player = _status.event.player;
					let num = 0;
					let hs = player.getCards("h");
					const muniu = player.getEquip("muniu");
					if (muniu && muniu.cards) {
						hs = hs.concat(muniu.cards);
					}
					if (get.type(cardx) == "basic") {
						const shas = hs.filter(function (card) {
							return card != cardx && get.name(card, player) == "sha" && player.hasValueTarget(card, false);
						});
						const numx = player.countCards("h", function (card) {
							return get.type2(card, player) == "trick";
						});
						num += Math.min(numx, Math.max(0, shas.length - player.getCardUsable("sha"))) * 0.65;
						num +=
							Math.min(
								player.getCardUsable("sha") + numx,
								shas.filter(function (card) {
									return (
										game.countPlayer(function (current) {
											return player.canUse(card, current) && get.effect(current, card, player, player) > 0;
										}) > 1
									);
								}).length
							) * 1.1;
						const taos = Math.min(
							player.maxHp - player.hp,
							hs.filter(function (card) {
								return cardx != card && get.name(card, player) == "tao";
							}).length
						);
						num += taos * player.getDamagedHp() * 1.2;
					} else if (get.type2(cardx) == "trick") {
						const numx = Math.sqrt(
							Math.min(
								5,
								player.countCards("h", function (card) {
									return get.type(card, null, player) == "basic";
								})
							)
						);
						num +=
							hs.filter(function (card) {
								return card != cardx && get.type2(card) == "trick" && player.hasValueTarget(card);
							}).length * 0.65;
					} else {
						num = 4;
					}
					return num * 1.5 - get.value(cardx);
				})
				.forResult();
			if (result.bool && result.cards && result.cards.length && get.type(result.cards[0]) != "equip") {
				const name = get.type(result.cards[0]) == "basic" ? "dcneifa_basic" : "dcneifa_trick";
				player.addTempSkill(name, "phaseUseAfter");
				const num = Math.min(
					5,
					player.countCards("h", function (cardx) {
						const type = get.type(cardx, null, player);
						return (name == "dcneifa_basic") != (type == "basic") && type != "equip";
					})
				);
				if (num > 0) {
					player.addMark(name, num, false);
				} else {
					player.storage[name] = 0;
				}
			}
		},
		ai: {
			threaten: 2.33,
		},
	}
```

## qiaorui 名字:桥蕤 势力:qun

### dcaishou 名字:隘守
描述: ①结束阶段，你可以摸X张牌，称为“隘”（X为你的体力上限）。②准备阶段，你弃置所有“隘”，若你以此法弃置的牌数大于体力值且你的体力上限小于9，你加1点体力上限。③当你于回合外失去最后一张“隘”后，你减1点体力上限。
```js
dcaishou: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.hasCard(card => card.hasGaintag("dcaishou_tag"), "h");
		},
		forced: true,
		locked: false,
		group: ["dcaishou_draw", "dcaishou_lose"],
		subfrequent: ["draw"],
		async content(event, trigger, player) {
			await player.discard(player.getCards("h", card => card.hasGaintag("dcaishou_tag")));

			let len = 0;
			for (const evt of player.getHistory("lose", evt => evt.getParent(2) === event)) {
				len += evt.cards.length;
			}
			if (len > Math.max(0, player.hp) && player.maxHp < 9) {
				await player.gainMaxHp();
			}
		},
		subSkill: {
			draw: {
				audio: "dcaishou",
				trigger: { player: "phaseJieshuBegin" },
				frequent(event, player) {
					return player.maxHp > 1;
				},
				prompt2(event, player) {
					return "摸" + get.cnNumber(player.maxHp) + "张牌，称为“隘”";
				},
				check(event, player) {
					return player.maxHp > 1;
				},
				async content(event, trigger, player) {
					const next = player.draw(player.maxHp);
					next.gaintag.add("dcaishou_tag");
					await next;
				},
			},
			lose: {
				audio: "dcaishou",
				trigger: {
					player: "loseAfter",
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				forced: true,
				locked: false,
				filter(event, player) {
					if (player == _status.currentPhase) {
						return false;
					}
					var evt = event.getl(player);
					if (!evt || !evt.hs || !evt.hs.length || player.hasCard(card => card.hasGaintag("dcaishou_tag"), "h")) {
						return false;
					}
					if (event.name == "lose") {
						for (var i in event.gaintag_map) {
							if (event.gaintag_map[i].includes("dcaishou_tag")) {
								return true;
							}
						}
						return false;
					}
					return player.hasHistory("lose", function (evt) {
						if (event != evt.getParent()) {
							return false;
						}
						for (var i in evt.gaintag_map) {
							if (evt.gaintag_map[i].includes("dcaishou_tag")) {
								return true;
							}
						}
						return false;
					});
				},
				async content(event, trigger, player) {
					player.loseMaxHp();
				},
			},
		},
	}
```

### dcsaowei 名字:扫围
描述: 当一名其他角色使用【杀】结算结束后，若此牌的目标角色不包含你且均在你的攻击范围内，你可以将一张“隘”当做【杀】对所有目标角色使用。以此法转化的【杀】结算完毕后，若此【杀】造成过伤害，你获得此【杀】对应的实体牌。
```js
dcsaowei: {
		audio: 2,
		trigger: { global: "useCardAfter" },
		filter(event, player) {
			return event.player != player && event.card.name == "sha" && event.targets.length && !event.targets.includes(player) && event.targets.every(current => player.inRange(current) && current.isIn()) && player.hasCard(card => card.hasGaintag("dcaishou_tag"), "h");
		},
		direct: true,
		clearTime: true,
		async content(event, trigger, player) {
			player.addTempSkill("dcsaowei_gain");
			const next = player.chooseToUse();
			next.set("openskilldialog", "扫围：是否将一张“隘”当做【杀】对" + get.translation(trigger.targets) + "使用？");
			next.set("norestore", true);
			next.set("_backupevent", `${event.name}_backup`);
			next.set("custom", {
				add: {},
				replace: { window() {} },
			});
			next.backup(`${event.name}_backup`);
			next.set("targetRequired", true);
			next.set("complexTarget", true);
			next.set("complexSelect", true);
			next.set("filterTarget", function (card, player, target) {
				if (!_status.event.targets.includes(target)) {
					return false;
				}
				return lib.filter.filterTarget.apply(this, arguments);
			});
			next.set("selectTarget", -1);
			next.set("targets", trigger.targets);
			next.set("addCount", false);
			next.set("logSkill", event.name);
			await next;
		},
		ai: { combo: "dcaishou" },
		subSkill: {
			backup: {
				viewAs: { name: "sha" },
				filterCard(card, player) {
					return get.itemtype(card) == "card" && card.hasGaintag("dcaishou_tag");
				},
				position: "h",
				selectCard: 1,
				ai1(card) {
					const player = get.player();
					if (player.isHealthy() && player.hasSkill("dcaishou") && player.countCards("h", card => card.hasGaintag("dcaishou_tag")) == 1) {
						return 0;
					}
					let eff = 0;
					for (const target of get.event().targets || []) {
						eff += get.effect(target, get.autoViewAs({ name: "sha" }, [card]), player, player);
					}
					if (eff > 0) {
						return 6.5 + eff / 10 - get.value(card);
					}
					return 0;
				},
				log: false,
				manualConfirm: true,
			},
			gain: {
				audio: "dcsaowei",
				charlotte: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return event.skill == "dcsaowei_backup" && player.hasHistory("sourceDamage", evt => evt.card == event.card);
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const cards = trigger.cards.filterInD();
					if (cards.length > 0) {
						await player.gain(cards, "gain2");
					}
				},
			},
		},
	}
```

## xianglang 名字:向朗 势力:shu

### dckanji 名字:勘集
描述: 出牌阶段限两次。你可以展示所有手牌，若花色均不同，你摸两张牌。然后若你的手牌因此包含了四种花色，你跳过下一个弃牌阶段。
```js
dckanji: {
		audio: 2,
		enable: "phaseUse",
		usable: 2,
		filter(event, player) {
			return player.countCards("h");
		},
		async content(event, trigger, player) {
			await player.showHandcards();
			const suits = new Set();
			const cards = player.getCards("h");
			for (const card of cards) {
				suits.add(get.suit(card));
			}
			if (suits.size === cards.length) {
				player.draw(2);
				event.suitsLength = suits.size;
				player.addTempSkill("dckanji_check");
			}
		},
		subSkill: {
			check: {
				trigger: { player: "gainAfter" },
				filter(event, player) {
					if (event.getParent(2).name != "dckanji") {
						return false;
					}
					var len = event.getParent(2).suitsLength;
					var suits = [];
					player.getCards("h", card => suits.add(get.suit(card)));
					return suits.length >= 4 && len < 4;
				},
				charlotte: true,
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.skip("phaseDiscard");
					game.log(player, "跳过了", "#y弃牌阶段");
				},
			},
		},
		ai: {
			order: 9,
			result: {
				player(player, target) {
					var count = player.countCards("h");
					if (count > 4) {
						return false;
					}
					var suits = [];
					player.getCards("h", card => suits.add(get.suit(card)));
					return suits.length == count ? 1 : 0;
				},
			},
		},
	}
```

### dcqianzheng 名字:愆正
描述: 每回合限两次。当你成为其他角色使用【杀】或普通锦囊牌的目标后，你可以重铸两张牌。若你以此法重铸的牌中没有与指定你为目标的牌类别相同的牌，你于此牌对应的实体牌进入弃牌堆后获得此牌对应的所有实体牌。
```js
dcqianzheng: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		usable: 2,
		filter(event, player) {
			return event.player != player && (get.type(event.card) == "trick" || event.card.name == "sha") && player.countCards("he") > 1;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			const str = "，若重铸的牌中没有" + get.translation(get.type2(trigger.card)) + "牌，你于" + get.translation(trigger.cards) + "进入弃牌堆后获得之";
			event.result = await player
				.chooseCard(get.prompt(event.skill), "重铸两张牌" + (trigger.cards.length ? str : "") + "。", 2, "he", lib.filter.cardRecastable)
				.set("ai", card => {
					var val = get.value(card);
					if (get.type2(card) == _status.event.type) {
						val += 0.5;
					}
					return 6 - val;
				})
				.setHiddenSkill(event.skill)
				.set("type", get.type2(trigger.card))
				.forResult();
		},
		async content(event, trigger, player) {
			if (event.cards.every(card => get.type2(card) != get.type2(trigger.card))) {
				trigger.getParent().dcqianzheng = true;
				player.addTempSkill("dcqianzheng_gain");
			}
			await player.recast(event.cards);
		},
		subSkill: {
			gain: {
				trigger: { global: "cardsDiscardAfter" },
				filter(event, player) {
					var evt = event.getParent();
					if (evt.name != "orderingDiscard") {
						return false;
					}
					return evt.relatedEvent.dcqianzheng && evt.relatedEvent.cards.filterInD("d").length;
				},
				charlotte: true,
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const evt = trigger.getParent().relatedEvent;
					player.gain(evt.cards.filterInD("d"), "gain2");
				},
			},
		},
	}
```

## qinlang 名字:秦朗 势力:wei

### dchaochong 名字:昊宠
描述: 当你使用牌后，你可以将手牌摸至或弃置至你的手牌上限数（至多摸五张）。然后若你以此法：得到牌，你的手牌上限-1；失去牌，你的手牌上限+1。
```js
dchaochong: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return player.getHandcardLimit() != player.countCards("h");
		},
		direct: true,
		locked: false,
		async content(event, trigger, player) {
			var del = player.getHandcardLimit() - player.countCards("h");
			event.delta = del;
			if (del > 0) {
				const result = await player
					.chooseBool(get.prompt("dchaochong"), "摸" + get.cnNumber(Math.min(5, del)) + "张牌，然后令你的手牌上限-1")
					.set("ai", () => {
						var player = _status.event.player;
						if (player.isPhaseUsing() && player.hasCard(cardx => player.hasUseTarget(cardx) && player.hasValueTarget(cardx), "hs")) {
							return false;
						}
						return true;
					})
					.forResult();
				if (result.bool) {
					player.logSkill("dchaochong");
					player.draw(Math.min(5, event.delta));
					lib.skill.dchaochong.change(player, -1);
				}
			} else if (del < 0) {
				const result = await player
					.chooseToDiscard(get.prompt("dchaochong"), "弃置" + get.cnNumber(-del) + "张手牌，然后令你的手牌上限+1", -del, "allowChooseAll")
					.set("ai", card => {
						var player = _status.event.player;
						if (player.isPhaseUsing() && player.hasCard(cardx => player.hasValueTarget(cardx), "hs")) {
							return 6 - player.getUseValue(card);
						}
						return 5 - get.value(card);
					})
					.set("logSkill", "dchaochong")
					.forResult();
				if (result.bool) {
					lib.skill.dchaochong.change(player, 1);
				}
			}
		},
		change(player, num) {
			if (typeof player.storage.dchaochong !== "number") {
				player.storage.dchaochong = 0;
			}
			if (!num) {
				return;
			}
			player.storage.dchaochong += num;
			player.markSkill("dchaochong");
			game.log(player, "的手牌上限", "#g" + (num > 0 ? "+" : "") + num);
		},
		markimage: "image/card/handcard.png",
		intro: {
			content(storage, player) {
				var num = player.storage.dchaochong;
				return "手牌上限" + (num >= 0 ? "+" : "") + num;
			},
		},
		mod: {
			maxHandcard(player, num) {
				return num + player.countMark("dchaochong");
			},
		},
		ai: { threaten: 2.2 },
	}
```

### dcjinjin 名字:矜谨
描述: 每回合限两次。当你造成或受到伤害后，你可以重置因〖昊宠〗增加或减少的手牌上限，令伤害来源弃置至多X张牌，然后你摸Y张牌（X为你以此法变化的手牌上限且至少为1，Y为X减其以此法弃置的牌数）。
```js
dcjinjin: {
		audio: 2,
		trigger: {
			source: "damageSource",
			player: "damageEnd",
		},
		usable: 2,
		logTarget: "source",
		check(event, player) {
			if (typeof player.storage.dchaochong != "number" || player.storage.dchaochong == 0) {
				return true;
			}
			var evt = event.getParent("useCard");
			if (evt && evt.player == player && event.source == player) {
				return false;
			}
			if (player.isPhaseUsing() && player.storage.dchaochong == -1) {
				return true;
			}
			return Math.abs(player.storage.dchaochong) >= 2;
		},
		prompt2(event, player) {
			var str = "";
			if (typeof player.storage.dchaochong == "number" && player.storage.dchaochong != 0) {
				str += "重置因〖佞宠〗增加或减少的手牌上限，";
			}
			var num = Math.abs(player.countMark("dchaochong")) || 1;
			if (event.source && event.source.isIn()) {
				str += "令伤害来源弃置至多" + get.cnNumber(num) + "张牌，然后你摸" + num + "-X张牌（X为其弃置的牌数）";
			} else {
				str += "你摸" + get.cnNumber(num) + "张牌";
			}
			return str;
		},
		async content(event, trigger, player) {
			const del = Math.abs(player.countMark("dchaochong")) || 1;
			event.delta = del;
			player.storage.dchaochong = 0;
			if (player.hasSkill("dchaochong", null, false, false)) {
				player.markSkill("dchaochong");
			}
			game.log(player, "重置了手牌上限");

			let result = { bool: false };
			if (trigger.source && trigger.source.isIn()) {
				result = await trigger.source
					.chooseToDiscard(get.translation(player) + "对你发动了【矜谨】", "弃置至多" + get.cnNumber(del) + "张牌，然后" + get.translation(player) + "摸" + del + "-X张牌（X为你弃置的牌数）。", [1, del], "he", "allowChooseAll")
					.set("ai", card => {
						if (_status.event.goon) {
							return 5.5 - get.value(card);
						}
						return 0;
					})
					.set("goon", get.attitude(trigger.source, player) < 0)
					.forResult();
			}
			let num = event.delta;
			if (result.bool) {
				num -= result.cards.length;
			}
			if (num > 0) {
				await player.draw(num);
			}
		},
		ai: {
			combo: "dchaochong",
			maixie: true,
			maixie_hp: true,
			threaten: 0.85,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						if (!target.hasFriend()) {
							return;
						}
						var num = 0;
						if (typeof target.storage.dcninchong == "number") {
							num = Math.abs(target.storage.dcninchong);
						}
						if (num <= 0) {
							return;
						}
						return [1, Math.min(1, num / 3)];
					}
				},
			},
		},
	}
```

## furongfuqian 名字:傅肜傅佥 势力:shu

### dcxuewei 名字:血卫
描述: 结束阶段，你可以选择一名体力值不大于你的角色，然后你获得如下效果直到你的下回合开始时：当其受到伤害时，防止此伤害，然后你失去1点体力，你与其各摸一张牌（若该角色为你，则改为你摸一张牌）。
```js
dcxuewei: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2("dcxuewei"), (card, player, target) => {
					return target.hp <= player.hp;
				})
				.set("ai", target => {
					var player = _status.event.player;
					return get.effect(target, { name: "tao" }, player, player) + 0.1;
				})
				.forResult();
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("dcxuewei", target);
				player.addTempSkill("dcxuewei_shelter", { player: "phaseBegin" });
				player.markAuto("dcxuewei_shelter", [target]);
			}
		},
		ai: { threaten: 1.1 },
		subSkill: {
			shelter: {
				audio: "dcxuewei",
				trigger: { global: "damageBegin4" },
				filter(event, player) {
					return player.getStorage("dcxuewei_shelter").includes(event.player);
				},
				charlotte: true,
				forced: true,
				onremove: true,
				logTarget: "player",
				marktext: "卫",
				intro: { content: "保护对象：$" },
				async content(event, trigger, player) {
					trigger.cancel();
					await player.loseHp();
					if (trigger.player != player) {
						await game.asyncDraw([player, trigger.player]);
					} else {
						await player.draw("nodelay");
					}
					await game.delayx();
				},
				ai: {
					filterDamage: true,
					skillTagFilter(player, tag, arg) {
						if (arg && arg.player && arg.player.hasSkillTag("jueqing", false, player)) {
							return false;
						}
						return true;
					},
				},
			},
		},
	}
```

### dcyuguan 名字:御关
描述: 一名角色的回合结束时，若你已损失的体力值为全场最多，你可以减1点体力上限，然后令至多X名角色将手牌摸至体力上限（X为你已损失的体力值）。
```js
dcyuguan: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			var num = player.getDamagedHp();
			if (num == 0) {
				return false;
			}
			return !game.hasPlayer(current => {
				return current.getDamagedHp() > num;
			});
		},
		check(event, player) {
			var num = player.getDamagedHp() - 1;
			if (num <= 0) {
				return false;
			}
			return (
				game.countPlayer(target => {
					if (player === target) {
						return player.maxHp - player.countCards("h") - 1;
					}
					if (get.attitude(player, target) > 0) {
						return target.maxHp - target.countCards("h");
					}
					return 0;
				}) > 1
			);
		},
		async content(event, trigger, player) {
			await player.loseMaxHp();
			const num = player.getDamagedHp();
			if (!player.isIn() || !num) {
				return;
			}
			const result = await player
				.chooseTarget("御关：令至多" + get.cnNumber(num) + "名角色将手牌摸至体力上限", [1, Math.min(game.countPlayer(), num)], true)
				.set("ai", target => {
					return get.attitude(_status.event.player, target) * Math.max(0.1, target.maxHp - target.countCards("h"));
				})
				.forResult();
			if (result.bool) {
				const targets = result.targets.sortBySeat(_status.currentPhase);
				player.line(targets);
				for (const target of targets) {
					target.drawTo(target.maxHp);
				}
			}
		},
	}
```

## zhenghun 名字:郑浑 势力:wei

### dcqiangzhi 名字:强峙
描述: 出牌阶段限一次。你可以弃置你和一名其他角色的共计三张牌。然后若你与其之中有角色因此失去了三张牌，该角色对另一名角色造成1点伤害。
```js
dcqiangzhi: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			return target.countDiscardableCards(player, "he") + player.countDiscardableCards(player, "he") >= 3;
		},
		async content(event, trigger, player) {
			const target = event.target;
			if (target.countDiscardableCards(player, "he") + player.countDiscardableCards(player, "he") < 3) {
				return;
			}
			const dialog = [];
			dialog.push("强峙：弃置你与" + get.translation(target) + "的共计三张牌");
			if (player.countCards("h")) {
				dialog.addArray(['<div class="text center">你的手牌</div>', player.getCards("h")]);
			}
			if (player.countCards("e")) {
				dialog.addArray(['<div class="text center">你的装备</div>', player.getCards("e")]);
			}
			if (target.countCards("h")) {
				dialog.add('<div class="text center">' + get.translation(target) + "的手牌</div>");
				if (player.hasSkillTag("viewHandcard", null, target, true)) {
					dialog.push(target.getCards("h"));
				} else {
					dialog.push([target.getCards("h"), "blank"]);
				}
			}
			if (target.countCards("e")) {
				dialog.addArray(['<div class="text center">' + get.translation(target) + "的装备</div>", target.getCards("e")]);
			}
			const result = await player
				.chooseButton(3, true)
				.set("createDialog", dialog)
				.set("filterButton", button => {
					if (!lib.filter.canBeDiscarded(button.link, _status.event.player, get.owner(button.link))) {
						return false;
					}
					return true;
				})
				.set("filterOk", () => {
					return ui.selected.buttons.length == 3;
				})
				.set("ai", button => {
					const player = _status.event.player;
					const target = _status.event.getParent().target;
					const card = button.link;
					if (get.owner(card) == player) {
						if (_status.event.damage) {
							return 15 - get.value(card);
						}
						if (player.hp >= 3 || get.damageEffect(player, target, player) >= 0 || (player.hasSkill("dcpitian") && player.getHandcardLimit() - player.countCards("h") >= 1 && player.hp > 1)) {
							return 0;
						}
						if (ui.selected.buttons.length == 0) {
							return 10 - get.value(card);
						}
						return 0;
					} else {
						if (_status.event.damage) {
							return 0;
						}
						return -(get.sgnAttitude(player, target) || 1) * get.value(card);
					}
				})
				.set(
					"damage",
					get.damageEffect(target, player, player) > 10 &&
						player.countCards("he", card => {
							return lib.filter.canBeDiscarded(card, player, player) && get.value(card) < 5;
						}) >= 3
				)
				.forResult();
			if (!result?.bool) {
				return;
			}
			const links = result.links;
			const list1 = [];
			const list2 = [];
			const players = [player, target];
			for (const card of links) {
				if (get.owner(card) == player) {
					list1.push(card);
				} else {
					list2.push(card);
				}
			}
			if (list1.length && list2.length) {
				await game
					.loseAsync({
						lose_list: [
							[player, list1],
							[target, list2],
						],
						discarder: player,
					})
					.setContent("discardMultiple");
			} else if (list2.length) {
				await target.discard(list2);
			} else {
				await player.discard(list1);
			}
			if (list1.length >= 3 || list2.length >= 3) {
				if (list2.length >= 3) {
					players.reverse();
				}
				players[0].line(players[1]);
				await players[1].damage(players[0]);
			}
		},
		ai: {
			expose: 0.2,
			order: 4,
			result: {
				target(player, target) {
					return (get.effect(target, { name: "guohe_copy2" }, player, target) / 2) * (target.countDiscardableCards(player, "he") >= 2 ? 1.25 : 1) + get.damageEffect(target, player, target) / 3;
				},
			},
		},
	}
```

### dcpitian 名字:辟田
描述: ①当你的牌被弃置后，或当你受到伤害后，你的手牌上限+1。②结束阶段，若你的手牌数小于手牌上限，你可以摸至手牌上限（至多摸五张），然后重置因〖辟田①〗增加的手牌上限。
```js
dcpitian: {
		audio: 2,
		trigger: {
			player: ["loseAfter", "damageEnd"],
			global: "loseAsyncAfter",
		},
		forced: true,
		locked: false,
		group: "dcpitian_draw",
		filter(event, player) {
			if (event.name == "damage") {
				return true;
			}
			return event.type == "discard" && event.getl(player).cards2.length > 0;
		},
		async content(event, trigger, player) {
			player.addMark("dcpitian_handcard", 1, false);
			player.addSkill("dcpitian_handcard");
			game.log(player, "的手牌上限", "#y+1");
		},
		subSkill: {
			draw: {
				audio: "dcpitian",
				trigger: { player: "phaseJieshuBegin" },
				filter(event, player) {
					return player.countCards("h") < player.getHandcardLimit();
				},
				prompt2(event, player) {
					return "摸" + get.cnNumber(Math.min(5, player.getHandcardLimit() - player.countCards("h"))) + "张牌，重置因〖辟田〗增加的手牌上限";
				},
				check(event, player) {
					return player.getHandcardLimit() - player.countCards("h") > Math.min(2, player.hp - 1);
				},
				async content(event, trigger, player) {
					const num = Math.min(5, player.getHandcardLimit() - player.countCards("h"));
					if (num > 0) {
						await player.draw(num);
					}
					player.removeMark("dcpitian_handcard", player.countMark("dcpitian_handcard"), false);
					game.log(player, "重置了", "#g【辟田】", "增加的手牌上限");
				},
			},
			handcard: {
				markimage: "image/card/handcard.png",
				intro: {
					content(storage, player) {
						return "手牌上限+" + storage;
					},
				},
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("dcpitian_handcard");
					},
				},
			},
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (get.tag(card, "discard")) {
						return 0.9;
					}
					if (get.tag(card, "damage")) {
						return 0.95;
					}
				},
			},
		},
	}
```

## dc_zhaotongzhaoguang 名字:赵统赵广 势力:shu

### yizan_use
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcqingren 名字:青刃
描述: 结束阶段，你可以摸X张牌（X为你本回合发动〖翊赞〗的次数）。
```js
dcqingren: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		filter(event, player) {
			return player.hasHistory("useSkill", evt => ["yizan_use", "yizan_use_backup"].includes(get.sourceSkillFor(evt)));
		},
		async content(event, trigger, player) {
			player.draw(player.getHistory("useSkill", evt => ["yizan_use", "yizan_use_backup"].includes(get.sourceSkillFor(evt))).length);
		},
		ai: {
			combo: "yizan_use",
		},
	}
```

### dclongyuan 名字:龙渊
描述: 觉醒技。一名角色的回合结束时，若你本局游戏已发动过至少三次〖翊赞〗，你摸两张牌并回复1点体力，将〖翊赞〗修改为“你可以将一张基本牌当任意基本牌使用或打出”。
```js
dclongyuan: {
		audio: "xinfu_longyuan",
		forced: true,
		juexingji: true,
		trigger: { global: "phaseEnd" },
		skillAnimation: true,
		animationColor: "orange",
		filter(event, player) {
			return player.countMark("yizan_use") >= 3;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.draw(2);
			player.recover();
			player.storage.yizan = true;
		},
		derivation: "yizan_rewrite",
		ai: { combo: "yizan_use" },
	}
```

## dc_huanghao 名字:新杀黄皓 势力:shu

### dcqinqing 名字:寝情
描述: 结束阶段，你可以弃置一名攻击范围内包含一号位的其他角色一张牌。然后若其手牌数大于一号位，你摸一张牌。
```js
dcqinqing: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		filter(event, player) {
			var zhu = game.filterPlayer(current => current.getSeatNum() == 1)[0];
			if (!zhu || !zhu.isIn()) {
				return false;
			}
			return game.hasPlayer(current => {
				return current != player && current.inRange(zhu);
			});
		},
		seatRelated: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2("dcqinqing"), function (card, player, target) {
					const zhu = game.filterPlayer(current => current.getSeatNum() == 1)[0];
					return target != player && target.inRange(zhu) && target.countDiscardableCards(player, "he") > 0;
				})
				.set("ai", function (target) {
					const zhu = game.filterPlayer(current => current.getSeatNum() == 1)[0];
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
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			const target = result.targets[0];
			event.target = target;
			player.logSkill("dcqinqing", target);
			if (target.countCards("he")) {
				await player.discardPlayerCard(target, "he", true);
			}
			const zhu = game.filterPlayer(current => current.getSeatNum() == 1)[0];
			if (zhu && zhu.isIn()) {
				if (target.countCards("h") > zhu.countCards("h")) {
					await player.draw();
				}
			}
		},
	}
```

### huisheng
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dccunwei 名字:存畏
描述: 锁定技。当你成为锦囊牌的目标后，若你是唯一目标，你摸一张牌；否则你弃置一张牌。
```js
dccunwei: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			return get.type2(event.card) == "trick" && (event.targets.length == 1 || player.countCards("he") > 0);
		},
		async content(event, trigger, player) {
			if (trigger.targets.length == 1) {
				player.draw();
			} else if (player.countCards("he") > 0) {
				player.chooseToDiscard("he", true, "存畏：请弃置一张牌");
			}
		},
		ai: { halfneg: true },
	}
```

## liupi 名字:新杀刘辟 势力:qun

### dcjuying 名字:踞营
描述: 出牌阶段结束时，若你于此阶段内使用【杀】或【酒】的次数未达到上限，你可以选择任意项：1.下回合使用【杀】的次数上限+1；2.本回合手牌上限+2；3.摸三张牌。若你选择的项数超过了你的体力值，你弃置一张牌。
```js
dcjuying: {
		audio: 2,
		trigger: { player: "phaseUseEnd" },
		filter(event, player) {
			return ["sha", "jiu"].some(name => {
				return (
					player.getCardUsable(name, true) >
					player.getHistory("useCard", evt => {
						return evt.getParent("phaseUse") == event && evt.card.name == name && evt.addCount !== false;
					}).length
				);
			});
		},
		direct: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseButton([
					get.prompt("dcjuying"),
					[
						[
							["sha", "你于下回合使用【杀】的次数上限+1"],
							["hand", "本回合手牌上限+2"],
							["draw", "摸三张牌"],
						],
						"textbutton",
					],
				])
				.set("ai", function (button) {
					const player = _status.event.player;
					const choice = button.link;
					if (choice == "draw") {
						return 10;
					}
					if (choice == "sha") {
						return 9;
					}
					const del = 3 - player.hp;
					if (choice == "hand") {
						if (del <= 0 || player.needsToDiscard()) {
							return 8;
						}
					}
					return 0;
				})
				.set("selectButton", [1, 3])
				.forResult();
			if (!result.bool) {
				return;
			}
			player.logSkill("dcjuying");
			const choices = result.links;
			if (choices.includes("sha")) {
				player.addMark("dcjuying_sha", 1, false);
				player.addSkill("dcjuying_sha");
			}
			if (choices.includes("hand")) {
				player.addMark("dcjuying_hand", 1, false);
				player.addTempSkill("dcjuying_hand");
			}
			if (choices.includes("draw")) {
				await player.draw(3);
			}
			const num = choices.length - Math.max(0, player.hp);
			if (num > 0) {
				await player.chooseToDiscard(true, "he");
			}
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					if (
						typeof card == "object" &&
						player.isPhaseUsing() &&
						["sha", "jiu"].some(name => {
							return card.name == name && player.getCardUsable(name) == 1 && !player.getCardUsable(name == "sha" ? "jiu" : "sha");
						})
					) {
						return "zeroplayertarget";
					}
				},
				target_use(card, player, target) {
					if (card.name == "jiu" && player.getCardUsable("sha") == 2) {
						return [1, 1];
					}
				},
			},
		},
		subSkill: {
			sha: {
				trigger: { player: "phaseBegin" },
				filter(event, player) {
					return player.countMark("dcjuying_sha") > 0;
				},
				silent: true,
				firstDo: true,
				charlotte: true,
				onremove: true,
				async content(event, trigger, player) {
					player.addMark("dcjuying_effect", player.countMark("dcjuying_sha"), false);
					player.addTempSkill("dcjuying_effect");
					player.removeSkill("dcjuying_sha");
				},
				intro: { content: "下回合使用【杀】的次数上限+#" },
			},
			effect: {
				onremove: true,
				charlotte: true,
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("dcjuying_effect");
						}
					},
				},
				intro: { content: "本回合使用【杀】的次数上限+#" },
			},
			hand: {
				onremove: true,
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						return num + 2 * player.countMark("dcjuying_hand");
					},
				},
			},
		},
	}
```

## dc_sp_jiaxu 名字:新杀SP贾诩 势力:wei

### zhenlue
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcjianshu 名字:间书
描述: 出牌阶段限一次。你可以将一张黑色手牌交给一名其他角色，并选择另一名其他角色，你令前者与后者拼点。赢的角色随机弃置一张牌，没赢的角色失去1点体力。若有角色因此死亡，你令你〖间书〗于此阶段发动的次数上限+1。
```js
dcjianshu: {
		audio: "jianshu",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h", { color: "black" }) > 0;
		},
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			if (ui.selected.targets.length) {
				return ui.selected.targets[0] != target && !ui.selected.targets[0].hasSkillTag("noCompareSource") && target.countCards("h") && !target.hasSkillTag("noCompareTarget");
			}
			return true;
		},
		targetprompt: ["发起者", "拼点目标"],
		filterCard: { color: "black" },
		discard: false,
		lose: false,
		delay: false,
		check(card) {
			if (_status.event.player.hp == 1) {
				return 8 - get.value(card);
			}
			return 6 - get.value(card);
		},
		selectTarget: 2,
		multitarget: true,
		async content(event, trigger, player) {
			const { cards, targets } = event;
			await player.give(cards, targets[0], "give");
			if (!targets[0].canCompare(targets[1])) {
				return;
			}
			const result = await targets[0].chooseToCompare(targets[1]).forResult();
			player.addTempSkill("dcjianshu_check", "phaseUseAfter");
			if (result.bool) {
				const cards1 = targets[0].getCards("he", function (card) {
					return lib.filter.cardDiscardable(card, targets[0], "dcjianshu");
				});
				if (cards1.length > 0) {
					await targets[0].discard(cards1.randomGet());
				}
				await targets[1].loseHp();
			} else if (result.tie) {
				await targets[0].loseHp();
				await targets[1].loseHp();
			} else {
				const cards2 = targets[1].getCards("he", function (card) {
					return lib.filter.cardDiscardable(card, targets[1], "dcjianshu");
				});
				if (cards2.length > 0) {
					await targets[1].discard(cards2.randomGet());
				}
				await targets[0].loseHp();
			}
		},
		subSkill: {
			check: {
				trigger: { global: "dieAfter" },
				charlotte: true,
				forced: true,
				popup: false,
				filter(event, player) {
					return event.getParent(3).name == "dcjianshu";
				},
				async content(event, trigger, player) {
					delete player.getStat("skill").dcjianshu;
				},
			},
		},
		ai: {
			expose: 0.4,
			order: 4,
			result: {
				target(player, target) {
					if (ui.selected.targets.length) {
						return -1;
					}
					return -0.5;
				},
			},
		},
	}
```

### dcyongdi 名字:拥嫡
描述: 限定技。出牌阶段，你可以选择一名男性角色，若其：体力上限或体力值最少，其加1点体力上限并回复1点体力；手牌数最少，其摸X张牌（X为其体力上限且至多为5）。
```js
dcyongdi: {
		audio: "yongdi",
		audioname: ["xinping"],
		limited: true,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return target.hasSex("male");
		},
		animationColor: "thunder",
		skillAnimation: "legend",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const target = event.target;
			if (target.isMinMaxHp() || target.isMinHp()) {
				await target.gainMaxHp();
				await target.recover();
			}
			if (target.isMinHandcard()) {
				await target.draw(Math.min(5, target.maxHp));
			}
			await game.delayx();
		},
		ai: {
			expose: 0.3,
			order: 1,
			result: {
				target(player, target) {
					var val = 0;
					var bool1 = !game.hasPlayer(current => current.maxHp < target.maxHp),
						bool2 = target.isMinHp(),
						bool3 = target.isMinHandcard();
					if (bool1) {
						val += 6.5;
					}
					if (bool2) {
						if (bool1) {
							target.maxHp++;
						}
						val += Math.max(0, get.recoverEffect(target, player, player));
						if (bool1) {
							target.maxHp--;
						}
					}
					if (bool3) {
						var num = Math.max(0, Math.min(5, target.maxHp + (bool1 ? 1 : 0)));
						val += 5 * num;
					}
					return val;
				},
			},
		},
	}
```

## leibo 名字:雷薄 势力:qun

### dcsilve 名字:私掠
描述: 游戏开始时，你选择一名其他角色（对其他角色不可见），称为“私掠”角色。然后你获得以下效果：①当“私掠”角色对其他角色造成伤害后，若你本回合未因此效果得到过受伤角色的牌，你可以获得受伤角色一张牌；②当“私掠”角色受到其他角色造成的伤害后，若伤害来源存活，你须对伤害来源使用一张【杀】（无距离限制），否则你弃置一张手牌。
```js
dcsilve: {
		audio: 2,
		trigger: {
			player: "enterGame",
			global: "phaseBefore",
		},
		onremove: ["dcsilve", "dcsilve_self"],
		filter(event, player) {
			return game.hasPlayer(current => current != player && !player.getStorage("dcsilve").includes(current)) && (event.name != "phase" || game.phaseNumber == 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget("私掠：请选择一名其他角色", "选择一名其他角色（暂时仅你可见），称为“私掠”角色，且你获得后续效果", true, (card, player, target) => {
					return target != player && !player.getStorage("dcsilve").includes(target);
				})
				.set("ai", target => {
					const att = get.attitude(get.player(), target);
					if (att > 0) {
						return att + 1;
					}
					if (att == 0) {
						return Math.random();
					}
					return att;
				})
				.set("animate", false)
				.forResult();
		},
		logLine: false,
		async content(event, trigger, player) {
			const [target] = event.targets;
			player.markAuto(event.name, [target]);
			player.addSkill(event.name + "_rob");
			player.addSkill(event.name + "_revenge");
			target.addSkill(event.name + "_target");
			target.storage[event.name + "_target"] ??= [];
			target.storage[event.name + "_target"].push(player);
		},
		subSkill: {
			rob: {
				audio: "dcsilve",
				trigger: { global: "damageSource" },
				filter(event, player) {
					if (!player.getStorage("dcsilve").includes(event.source)) {
						return false;
					}
					if (!event.player.isIn() || event.player == player || event.source == event.player) {
						return false;
					}
					if (player.getStorage("dcsilve_robbed").includes(event.player)) {
						return false;
					}
					return event.player.countCards("he") > 0;
				},
				charlotte: true,
				prompt2(event, player) {
					return "获得" + get.translation(event.player) + "一张牌";
				},
				logTarget: "player",
				async content(event, trigger, player) {
					const [target] = event.targets;
					player.addTempSkill("dcsilve_robbed");
					player.markAuto("dcsilve_self", [target]);
					if (target.countGainableCards(player, "he") > 0) {
						player.markAuto("dcsilve_robbed", [target]);
						await player.gainPlayerCard(target, "he", true);
					}
					if (trigger.source && trigger.source != player) {
						trigger.source.markSkill("dcsilve_target");
					}
				},
			},
			revenge: {
				audio: "dcsilve",
				trigger: { global: "damageEnd" },
				filter(event, player) {
					if (!player.getStorage("dcsilve").includes(event.player)) {
						return false;
					}
					if (!event.player.isIn() || !event.source?.isIn() || event.source == player) {
						return false;
					}
					return true;
				},
				charlotte: true,
				direct: true,
				clearTime: true,
				async content(event, trigger, player) {
					if (trigger.player && trigger.player != player) {
						trigger.player.markSkill("dcsilve_target");
					}
					player.markAuto("dcsilve_self", [trigger.player]);
					const result = await player
						.chooseToUse("私掠：对" + get.translation(trigger.source) + "使用一张【杀】，或弃置一张手牌", function (card, player, event) {
							if (get.name(card) != "sha") {
								return false;
							}
							return lib.filter.filterCard.apply(this, arguments);
						})
						.set("targetRequired", true)
						.set("complexTarget", true)
						.set("complexSelect", true)
						.set("filterTarget", function (card, player, target) {
							if (target != _status.event.source && !ui.selected.targets.includes(_status.event.source)) {
								return false;
							}
							return lib.filter.targetEnabled.apply(this, arguments);
						})
						.set("source", trigger.source)
						.set("logSkill", event.name)
						.forResult();
					if (!result?.bool) {
						if (player.countCards("h") > 0) {
							await player.chooseToDiscard("h", true).set("logSkill", event.name);
						}
					}
				},
			},
			self: {
				marktext: "私",
				intro: {
					name: "私掠",
					content(storage, player) {
						if (!storage?.length) {
							return "没有打劫对象";
						}
						if (storage[0] == player) {
							return "已绑定" + get.translation(player) + "自己";
						}
						return "打劫对象：" + get.translation(storage);
					},
				},
			},
			target: {
				marktext: "掠",
				intro: {
					name: "私掠",
					content(storage, player) {
						return "被" + get.translation(storage) + "盯上了！";
					},
				},
			},
			robbed: { onremove: true, charlotte: true },
		},
	}
```

### dcshuaijie 名字:衰劫
描述: 限定技。出牌阶段，若你的体力值与装备区里的牌数均大于“私掠”角色，或没有角色有“私掠”，你可以减1点体力上限，然后选择一项：1.获得“私掠”角色至多三张牌；2.从牌堆随机获得三张类型各不同的牌。最后将你的“私掠”角色改为你。
```js
dcshuaijie: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			var targets = player.getStorage("dcsilve").filter(i => i.isIn());
			if (!targets.length) {
				return true;
			}
			return (
				targets.filter(target => {
					return player.hp > target.hp && player.countCards("e") > target.countCards("e");
				}).length == targets.length
			);
		},
		async content(event, trigger, player) {
			await player.awakenSkill(event.name);
			await player.loseMaxHp();
			const choices = [];
			const choiceList = ["获得“私掠”角色至多三张牌", "从牌堆随机获得三张类型各不相同的牌"];
			const targets = player.getStorage("dcsilve").filter(i => i.isIn());
			event.targets = targets;
			if (targets.length) {
				choices.push("选项一");
			} else {
				choiceList[0] = '<span style="opacity:0.5; ">' + choiceList[0] + "</span>";
			}
			choices.push("选项二");
			const result = await player
				.chooseControl(choices)
				.set("prompt", "衰劫：选择一项")
				.set("choiceList", choiceList)
				.set("ai", () => _status.event.choice)
				.set(
					"choice",
					(function () {
						let eff = 0;
						for (const target of targets) {
							eff += get.effect(target, { name: "shunshou_copy2" }, player, player) * 2;
						}
						eff -= get.effect(player, { name: "dongzhuxianji" }, player, player);
						return eff > 0 && choices.includes("选项一") ? "选项一" : "选项二";
					})()
				)
				.forResult();
			if (result.control == "选项一") {
				if (targets.length) {
					for (const target of targets) {
						if (target.countGainableCards(player, "he") > 0) {
							player.line(target);
							await player.gainPlayerCard(target, "he", true, [1, 3]);
						}
					}
				}
			} else {
				const cards = [];
				for (let i = 0; i < 3; i++) {
					const card = get.cardPile2(cardx => {
						return cards.filter(cardxx => get.type2(cardxx) == get.type2(cardx)).length == 0;
					}, "random");
					if (card) {
						cards.push(card);
					}
				}
				if (cards.length) {
					await player.gain(cards, "gain2");
				}
			}
			const currentTargets = player.getStorage("dcsilve").filter(i => i.isIn());
			for (const target of currentTargets) {
				target.unmarkAuto("dcsilve_target", [player]);
			}
			delete player.storage.dcsilve;
			delete player.storage.dcsilve_self;
			player.markAuto("dcsilve", [player]);
			player.markAuto("dcsilve_self", [player]);
		},
		ai: {
			combo: "dcsilve",
			order: 8,
			result: {
				player(player) {
					var targets = player.getStorage("dcsilve").filter(i => i.isIn());
					if (!targets.length) {
						return 1;
					}
					var att = 0;
					targets.forEach(i => (att += get.attitude(player, i)));
					if (att < 0) {
						return 1;
					}
					return 0;
				},
			},
		},
	}
```

## gongsundu 名字:公孙度 势力:qun

### dczhenze 名字:震泽
描述: 弃牌阶段开始时，你可以选择一项：1.令所有手牌数与体力值大小关系与你不同的角色失去1点体力；2.令所有手牌数和体力值关系与你相同的角色回复1点体力。
```js
dczhenze: {
		audio: 2,
		trigger: { player: "phaseDiscardBegin" },
		direct: true,
		async content(event, trigger, player) {
			const getCond = player => Math.sign(player.countCards("h") - Math.max(0, player.hp));
			const me = getCond(player);
			const recovers = game.filterPlayer(current => getCond(current) == me);
			const loses = game.filterPlayer().removeArray(recovers);
			const list = [];
			if (loses.length) {
				list.push("选项一");
			}
			if (recovers.length) {
				list.push("选项二");
			}
			list.push("cancel2");
			const sign = [
				["≥", "＜"],
				["≠", "＝"],
				["≤", "＞"],
			];
			const choiceList = ["令所有手牌数" + sign[me + 1][0] + "体力值的角色失去1点体力" + (loses.length ? "（" + get.translation(loses) + "）" : ""), "令所有手牌数" + sign[me + 1][1] + "体力值的角色回复1点体力" + (recovers.length ? "（" + get.translation(recovers) + "）" : "")];
			if (!loses.length) {
				choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
			}
			if (!recovers.length) {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			const result = await player
				.chooseControl(list)
				.set("choiceList", choiceList)
				.set("prompt", get.prompt("dczhenze"))
				.set("ai", () => _status.event.choice)
				.set(
					"choice",
					(() => {
						let eff1 = loses.reduce((prev, i) => prev + get.effect(i, { name: "losehp" }, player, player), 0),
							eff2 = recovers.reduce((prev, i) => prev + get.recoverEffect(i, player, player), 0),
							max = Math.max(0, eff1, eff2);
						if (max === 0) {
							return "cancel2";
						}
						if (eff1 > eff2) {
							return "选项一";
						}
						return "选项二";
					})()
				)
				.forResult();
			if (result.control == "cancel2") {
				return;
			}
			const lose = result.control == "选项一";
			const targets = lose ? loses : recovers;
			player.logSkill("dczhenze", targets);
			for (const i of targets) {
				await i[lose ? "loseHp" : "recover"]();
			}
		},
	}
```

### dcanliao 名字:安辽
描述: 出牌阶段限X次（X为群势力角色数）。你可以重铸一名角色的一张牌。
```js
dcanliao: {
		audio: 2,
		enable: "phaseUse",
		usable(skill, player) {
			return game.countPlayer(current => current.group == "qun");
		},
		filter(event, player) {
			return game.hasPlayer(target => lib.skill.dcanliao.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			return target.countCards("he");
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await player
				.choosePlayerCard(target, "he", true)
				.set("filterButton", button => {
					const card = button.link;
					const owner = get.owner(card);
					return !owner || owner.canRecast(card, _status.event.player);
				})
				.set("ai", card => {
					if (get.attitude(_status.event.player, _status.event.getParent().target) >= 0) {
						return -get.buttonValue(card);
					}
					return get.buttonValue(card);
				})
				.forResult();
			if (result.bool) {
				target.recast(result.links);
			}
		},
		ai: {
			expose: 0.1,
			result: {
				target(player, target) {
					if (target.hasCard(card => get.value(card) >= 6, "e") && get.attitude(player, target) < 0) {
						return -1;
					}
					return 1;
				},
			},
		},
	}
```

## panghui 名字:庞会 势力:wei

### dcyiyong 名字:异勇
描述: 当你对其他角色造成伤害时，若你有牌，你可以与其同时弃置至少一张牌。若你以此法弃置的牌的点数之和：不大于其，你摸X+1张牌；不小于其，此伤害+1（X为其以此法弃置的牌数）。
```js
dcyiyong: {
		audio: 2,
		trigger: {
			source: "damageBegin1",
		},
		//usable:2,
		filter(event, player) {
			return player.countDiscardableCards(player, "he") > 0 && player != event.player;
		},
		check(event, player) {
			return get.attitude(player, event.player) < 0 && player.countCards("he", card => lib.filter.cardDiscardable(card, player, "dcyiyong") && get.value(card, player) < 7) > 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const list = [player];
			if (trigger.player.countDiscardableCards(trigger.player, "he") > 0) {
				list.push(trigger.player);
			}
			if (!event.isMine() && !event.isOnline()) {
				await game.delayx();
			}
			const result = await player
				.chooseCardOL(list, "he", true, [1, Infinity], "异勇：弃置任意张牌", (card, player, target) => {
					return lib.filter.cardDiscardable(card, player, "dcyiyong");
				})
				.set("allowChooseAll", true)
				.set("ai", card => {
					const evt = _status.event.getParent(2);
					const evtx = _status.event.getParent();
					const source = evt.player,
						player = _status.event.player,
						target = evtx.list[1];
					if (!target) {
						return get.unuseful(card);
					}
					if (player == source) {
						let total = 0,
							need = 0;
						target.countCards("he", card => {
							if (lib.filter.cardDiscardable(card, target, "dcyiyong") && get.value(card) < 5) {
								need += get.number(card);
							}
						});
						for (const i of ui.selected.cards) {
							total += get.number(i);
						}
						if (total >= need + 5) {
							return 0;
						}
						let val = 6;
						if (
							target.hp <= 2 &&
							!target.hasSkillTag("filterDamage", null, {
								player: player,
								card: evt.getTrigger().card,
							})
						) {
							val += 2 + get.number(card) / 5;
						}
						if (target.countCards("he", card => get.value(card) < 5) >= 3) {
							val -= 3 + get.number(card) / 5;
						}
						return val - get.value(card);
					}
					if (ui.selected.cards.length > 1 && ui.selected.cards.length + 2 >= source.countCards("he")) {
						return 0;
					}
					if (
						player.hp <= 2 &&
						!target.hasSkillTag("filterDamage", null, {
							player: player,
							card: evt.getTrigger().card,
						})
					) {
						return 10 - get.value(card);
					}
					return 5 - get.value(card);
				})
				.forResult();
			const lose_list = [];
			for (let i = 0; i < result.length; i++) {
				const current = list[i],
					cards2 = result[i].cards;
				lose_list.push([current, cards2]);
			}
			await game.loseAsync({ lose_list: lose_list }).setContent("discardMultiple");
			const getn = function (cards) {
				return cards.map(i => get.number(i, false)).reduce((p, c) => p + c, 0);
			};
			const cards0 = result[0]?.cards || [];
			const cards1 = result[1]?.cards || [];
			const num0 = getn(cards0),
				num1 = getn(cards1);
			if (num0 <= num1) {
				await player.draw(cards1.length + 1);
			}
			if (num0 >= num1) {
				trigger.num++;
			}
		},
	}
```

### dcsuchou 名字:夙仇
描述: 锁定技，出牌阶段开始时，你选择一项：①失去1点体力或减1点体力上限，本阶段使用牌不可被响应；②失去〖夙仇〗。
```js
dcsuchou: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		forced: true,
		async content(event, trigger, player) {
			const { index } = await player
				.chooseControl()
				.set("prompt", "夙仇：请选择一项")
				.set("choiceList", ["失去1点体力，本阶段使用牌不可被响应", "减1点体力上限，本阶段使用牌不可被响应", "失去〖夙仇〗"])
				.set("ai", () => {
					const player = get.event().player;
					if (player.isHealthy()) {
						return player.maxHp <= 2 ? 2 : 0;
					}
					return 1;
				})
				.forResult();
			switch (index) {
				case 0:
					await player.loseHp();
					player.addTempSkill("dcsuchou_effect", "phaseUseAfter");
					break;
				case 1:
					await player.loseMaxHp();
					player.addTempSkill("dcsuchou_effect", "phaseUseAfter");
					break;
				case 2:
					await player.removeSkills("dcsuchou");
					break;
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				mark: true,
				marktext: "仇",
				intro: { content: "使用牌不可被响应" },
				audio: "dcsuchou",
				trigger: { player: "useCard" },
				filter(event, player) {
					return event.card.name == "sha" || get.type(event.card) == "trick";
				},
				forced: true,
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.players);
					game.log(trigger.card, "不可被响应");
				},
				ai: { directHit_ai: true },
			},
		},
	}
```

## dc_yuejiu 名字:乐就 势力:qun

### dccuijin 名字:催进
描述: 当你或你攻击范围内的角色使用【杀】或【决斗】时，你可以弃置一张牌，令此牌的伤害基数+1。然后当此牌被目标角色抵消或无效或防止伤害后，你摸两张牌并对使用者造成1点伤害。
```js
dccuijin: {
		audio: 2,
		trigger: { global: "useCard" },
		filter(event, player) {
			return (event.card.name == "sha" || event.card.name == "juedou") && (event.player == player || player.inRange(event.player)) && player.countCards("he") > 0;
		},
		checkx(event, player) {
			const userDamage = get.damageEffect(event.player, player, player);
			let damageBonus = 0,
				mayDamage = 0,
				odds = 2;
			if (event.card.name === "sha") {
				const nature = get.nature(event.card);
				for (let tar of event.targets) {
					if (
						event.player.hasSkillTag("jueqing", false, tar) ||
						tar.hasSkillTag("filterDamage", null, {
							player: event.player,
							card: event.card,
						})
					) {
						continue;
					}
					const hitOdds = 1 - tar.mayHaveShan(player, "use", true, "odds");
					if (
						hitOdds >= 1 ||
						event.player.hasSkillTag(
							"directHit_ai",
							true,
							{
								target: tar,
								card: event.card,
							},
							true
						)
					) {
						damageBonus += get.damageEffect(tar, event.player, player, nature);
					} else {
						odds = Math.min(odds, hitOdds);
						mayDamage += hitOdds * get.damageEffect(tar, event.player, player, nature);
					}
				}
			} else if (event.card.name === "juedou") {
				const targets = event.targets.sortBySeat(_status.currentPhase);
				let userSha = event.player.mayHaveSha(player, "respond", null, "count");
				for (let tar of event.targets) {
					if (
						event.player.hasSkillTag("jueqing", false, tar) ||
						tar.hasSkillTag("filterDamage", null, {
							player: event.player,
							card: event.card,
						})
					) {
						continue;
					}
					// 检查使用者能否强命目标或者剩余【杀】够不够决斗
					if (
						event.player.hasSkillTag(
							"directHit_ai",
							true,
							{
								target: tar,
								card: event.card,
							},
							true
						) ||
						(userSha -= tar.mayHaveSha(player, "respond", null, "count")) >= 0
					) {
						damageBonus += get.damageEffect(tar, event.player, player);
					} else {
						damageBonus += get.damageEffect(event.player, tar, player);
					}
				}
			}
			if (damageBonus) {
				return damageBonus;
			}
			if (!mayDamage || odds > 1) {
				return get.damageEffect(event.player, player, player) + 2 * get.effect(player, "draw", player, player);
			}
			return mayDamage + (1 - odds) * (get.damageEffect(event.player, player, player) + 2 * get.effect(player, "draw", player, player));
		},
		async cost(event, trigger, player) {
			const skillName = event.name.slice(0, -5);
			event.result = await player
				.chooseToDiscard("he", get.prompt(skillName, trigger.player), "弃置一张牌并令" + get.translation(trigger.player) + "使用的" + get.translation(trigger.card) + "伤害+1，但若其未造成伤害，则你摸两张牌并对其造成1点伤害。")
				.set("ai", function (card) {
					const goon = get.event().goon;
					if (goon) {
						return goon - get.value(card);
					}
					return 0;
				})
				.set(
					"goon",
					(() => {
						const num = (lib.skill.dccuijin.checkx(trigger, player) * player.countCards("he")) / 10;
						// game.log(trigger.player, "对", trigger.targets, "使用", trigger.card, "，乐就发动技能的收益为", num);
						return num;
					})()
				)
				.set("chooseonly", true)
				.set("logSkill", [skillName, trigger.player])
				.forResult();
			event.result.skill_popup = false;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.discard(event.cards);
			if (typeof trigger.baseDamage !== "number") {
				trigger.baseDamage = 1;
			}
			trigger.baseDamage++;
			player.addSkill("dccuijin_damage");
			player.markAuto("dccuijin_damage", [trigger.card]);
			if (!player.storage.dccuijin_map) {
				player.storage.dccuijin_map = { cards: [], targets: [] };
			}
			player.storage.dccuijin_map.cards.push(trigger.card);
			player.storage.dccuijin_map.targets.push(trigger.targets.slice());
		},
		subSkill: {
			damage: {
				trigger: {
					global: ["damage", "damageCancelled", "damageZero", "shaMiss", "useCardToExcluded", "useCardToEnd", "eventNeutralized", "useCardAfter", "shaCancelled"],
				},
				forced: true,
				silent: true,
				firstDo: true,
				charlotte: true,
				onremove: true,
				filter(event, player, name) {
					if (!event.card) {
						return false;
					}
					var cards = player.getStorage("dccuijin_damage");
					if (!cards.includes(event.card)) {
						return false;
					}
					return true;
				},
				async content(event, trigger, player) {
					const card = trigger.card;
					const idx = player.storage.dccuijin_map.cards.indexOf(card);
					if (event.triggername == "useCardAfter") {
						let cards = player.getStorage("dccuijin_damage");
						cards = cards.remove(card);
						if (!cards.length) {
							player.removeSkill("dccuijin_damage");
							delete player.storage.dccuijin_map;
						} else if (idx !== -1) {
							player.storage.dccuijin_map.cards.splice(idx, 1);
							player.storage.dccuijin_map.targets.splice(idx, 1);
						}
						return;
					}
					if (idx !== -1) {
						let target, source;
						if (trigger.name.indexOf("damage") == 0) {
							target = trigger.player;
							source = trigger.source;
						} else {
							target = trigger.target;
							source = trigger.player;
						}
						if (
							player.storage.dccuijin_map.targets[idx].includes(target) &&
							!target.hasHistory("damage", evt => {
								return evt.card == card;
							})
						) {
							player.logSkill("dccuijin_damage", source);
							player.storage.dccuijin_map.targets[idx].remove(target);
							await player.draw(2);
							if (source && source.isIn()) {
								player.line(source, "green");
								await source.damage();
							}
						}
					}
					await game.delayx();
				},
			},
		},
	}
```

## chenjiao 名字:陈矫 势力:wei

### dcxieshou 名字:协守
描述: 每回合限一次。当一名角色受到伤害后，若你至其的距离不大于2，你可以令你的手牌上限-1，然后其选择一项：1.回复1点体力；2.复原，摸两张牌。
```js
dcxieshou: {
		audio: 2,
		trigger: {
			global: "damageEnd",
		},
		usable: 1,
		filter(event, player) {
			return get.distance(player, event.player) <= 2 && event.player.isIn();
		},
		check(event, player) {
			return get.attitude(player, event.player) > 4;
		},
		locked: false,
		logTarget: "player",
		onremove: true,
		change(player, num) {
			player.addSkill("dcxieshoux");
			if (typeof player.storage.dcxieshoux !== "number") {
				player.storage.dcxieshoux = 0;
			}
			if (!num) {
				return;
			}
			player.storage.dcxieshoux += num;
			if (player.storage.dcxieshoux != 0) {
				player.markSkill("dcxieshoux");
			} else {
				player.unmarkSkill("dcxieshoux");
			}
			game.log(player, "的手牌上限", (num > 0 ? "+" : "") + num);
		},
		async content(event, trigger, player) {
			let result;
			let target = trigger.player;
			event.target = target;

			// step 0
			lib.skill.dcxieshou.change(player, -1);
			// step 1
			const choiceList = ["回复1点体力", "复原，摸两张牌"];
			const list = [];
			if (target.getDamagedHp() == 0) {
				choiceList[0] = '<span style="opacity:0.5; ">' + choiceList[0] + "</span>";
			} else {
				list.push("选项一");
			}
			list.push("选项二");
			result = await target
				.chooseControl(list)
				.set("choiceList", choiceList)
				.set("prompt", get.translation(player) + "对你发动了【协守】，请选择一项")
				.forResult();
			// step 2
			if (result.control == "选项一") {
				target.recover();
			} else {
				target.link(false);
				await target.draw(2);
			}
		},
		ai: {
			expose: 0.3,
		},
	}
```

### dcqingyan 名字:清严
描述: 每回合限两次。当你成为其他角色使用黑色牌的目标后，若你的手牌数：小于体力值，你可以将手牌补至体力上限；不小于体力值，你可以弃置一张手牌令你的手牌上限+1。
```js
dcqingyan: {
		audio: 2,
		trigger: {
			target: "useCardToTargeted",
		},
		filter(event, player) {
			return event.player != player && get.color(event.card) == "black";
		},
		usable: 2,
		async cost(event, trigger, player) {
			if (player.countCards("h") < player.hp) {
				event.result = await player
					.chooseBool(get.prompt(event.skill), "将手牌摸至体力上限（摸" + get.cnNumber(player.maxHp - player.countCards("h")) + "张牌）")
					.set("ai", () => 1)
					.forResult();
			} else {
				event.result = await player
					.chooseToDiscard(get.prompt(event.skill), "弃置一张手牌令你的手牌上限+1", "chooseonly")
					.set("ai", card => 6 - get.value(card))
					.forResult();
			}
		},
		async content(event, trigger, player) {
			if (event.cards && event.cards.length) {
				await player.discard(event.cards);
				lib.skill.dcxieshou.change(player, 1);
			} else {
				player.drawTo(player.maxHp);
			}
		},
	}
```

### dcqizi 名字:弃子
描述: 锁定技。你不能对至其的距离大于2且正在进行濒死流程的角色使用【桃】。
```js
dcqizi: {
		mod: {
			cardSavable(card, player, target) {
				if (get.distance(player, target) > 2 && card.name == "tao" && target == _status.event.dying) {
					return false;
				}
			},
		},
		ai: {
			neg: true,
		},
	}
```

## wanglie 名字:王烈 势力:qun

### dcchongwang 名字:崇望
描述: 其他角色使用基本牌或普通锦囊牌时，若你是本局游戏内上一张被使用的牌的使用者，则你可以选择一项：⒈令其于此牌结算结束后收回此牌对应的所有实体牌；⒉令此牌无效。
```js
dcchongwang: {
		audio: 2,
		trigger: { global: "useCard" },
		filter(event, player) {
			if (player == event.player) {
				return false;
			}
			const type = get.type(event.card);
			if (!["basic", "trick"].includes(type)) {
				return false;
			}
			const history = game.getAllGlobalHistory("useCard");
			const index = history.indexOf(event);
			if (index > 0) {
				return history[index - 1].player == player;
			}
			return false;
		},
		async cost(event, trigger, player) {
			const source = trigger.player;
			const list = [["exclude", `令${get.translation(trigger.card)}无效`]];
			const cards = trigger.cards.filterInD();
			if (source.isIn() && cards.length > 0) {
				list.push(["gain", `令${get.translation(source)}收回${get.translation(cards)}`]);
			}
			const result = await player
				.chooseButton([get.prompt(event.skill, source), [list, "textbutton"], "noforcebutton"])
				.set("ai", button => {
					const player = get.player();
					const choice = button.link;
					const evt = _status.event.getTrigger();
					if (choice == "exclude") {
						let effect = 0;
						if (!evt.targets.length && get.info(evt.card, false).notarget) {
							effect -= get.effect(evt.player, evt.card, evt.player, player);
						}
						for (const i of evt.targets) {
							effect -= get.effect(i, evt.card, evt.player, player);
						}
						return effect;
					} else {
						const cards = evt.cards.filterInD();
						return get.value(cards, evt.player) * get.attitude(player, evt.player);
					}
				})
				.forResult();
			event.result = {
				bool: result.bool,
				cost_data: result.links,
			};
		},
		logTarget: "player",
		async content(event, trigger, player) {
			if (!event.isMine() && !event.isOnline()) {
				await game.delayx();
			}
			if (event.cost_data[0] == "gain") {
				player.addTempSkill("dcchongwang_gain");
				trigger._dcchongwang = true;
			} else {
				trigger.targets.length = 0;
				trigger.all_excluded = true;
				game.log(trigger.card, "被无效了");
			}
		},
		ai: {
			threaten: 3.5,
			directHit_ai: true,
		},
		subSkill: {
			gain: {
				trigger: { global: "useCardAfter" },
				charlotte: true,
				forced: true,
				popup: false,
				filter(event, player) {
					return event._dcchongwang;
				},
				async content(event, trigger, player) {
					trigger.player.gain(trigger.cards.filterInD(), "gain2");
				},
			},
		},
	}
```

### dchuagui 名字:化归
描述: 出牌阶段开始时，你可以选择至多X名有牌的其他角色（X为存活角色数最多阵营的存活角色数且你选择的角色其他角色不可见）。这些角色同时选择一项：⒈交给你一张牌，⒉展示一张牌。若这些角色均选择选项二，则你获得所有展示牌。
```js
dchuagui: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		async cost(event, trigger, player) {
			const min = Math.max.apply(
				Math,
				game.filterPlayer().map(current => 1 + current.getFriends().length)
			);
			const max = Math.min(
				min,
				game.countPlayer(current => current != player && current.countCards("he") > 0)
			);
			event.result = await player
				.chooseTarget(get.prompt(event.skill), `令至多${get.cnNumber(max)}名角色进行囚徒困境选择`, [1, max], (card, player, target) => {
					return target != player && target.countCards("he") > 0;
				})
				.set("animate", false)
				.set("ai", target => {
					return -get.attitude(get.player(), target);
				})
				.forResult();
		},
		logLine: false,
		async content(event, trigger, player) {
			const targets = event.targets.sortBySeat();
			const shown = [],
				given = [];
			const map = await game.chooseAnyOL(targets, get.info(event.name).chooseButton, [player]).forResult();
			for (const target of targets) {
				target.addExpose(0.05);
				const { links } = map.get(target);
				let choice;
				if (links[0] == 0) {
					choice = "仅展示牌";
					shown.push([links[1], target, choice]);
				} else {
					choice = "交给牌";
					given.push([links[1], target, choice]);
				}
				target.popup(choice);
				game.log(target, "选择了", "#y" + choice);
			}
			if (shown.length) {
				await player
					.showCards(
						shown.flatMap(item => item[0]),
						get.translation(player) + "发动了【化归】"
					)
					.set("customButton", button => {
						const target = get.owner(button.link);
						if (target) {
							game.createButtonCardsetion(target.getName(true), button);
						}
					})
					.set("delay_time", 4)
					.set("multipleShow", true);
			}
			event.videoId = lib.status.videoId++;
			game.broadcastAll(
				(name, id, results) => {
					const dialog = ui.create.dialog(name + "发动了【化归】", "hidden", "forcebutton");
					dialog.videoId = id;
					dialog.classList.add("scroll1");
					dialog.classList.add("scroll2");
					dialog.classList.add("fullwidth");
					dialog.classList.add("fullheight");
					dialog.buttonss = [];

					const list = ["仅展示牌的玩家", "交出牌的玩家"];
					for (let i = 0; i < list.length; i++) {
						dialog.add('<div class="text center">' + list[i] + "</div>");
						const buttons = ui.create.div(".buttons", dialog.content);
						dialog.buttonss.push(buttons);
						buttons.classList.add("popup");
						buttons.classList.add("guanxing");
					}
					dialog.open();

					const getx = function () {
						const item = results.shift();
						const card = item[0],
							index = item[2] == "仅展示牌" ? 0 : 1;
						const button = ui.create.button(card, "card", dialog.buttonss[index]);
						game.createButtonCardsetion(item[1].getName(true), button);
						if (results.length > 0) {
							setTimeout(getx, 500);
						}
					};
					setTimeout(getx, 500);
				},
				get.translation(player),
				event.videoId,
				shown.concat(given)
			);
			await game.delay(0, 2000 + (shown.length + given.length) * 500);
			game.broadcastAll("closeDialog", event.videoId);
			const list = given.length > 0 ? given : shown;
			const cards = list.flatMap(item => item[0]);
			player.line(list.map(item => item[1]));
			await player.gain(cards, "give");
		},
		chooseButton(player, source, eventId) {
			const str = get.translation(source);
			return player
				.chooseButton(
					2,
					[
						`###${str}对你发动了【化归】，选择展示或交给其一张牌###<div class="text center">若所有人都选择了仅展示，则${str}获得这张牌</div>`,
						player.getCards("he"),
						[
							["仅展示一张牌", `将一张牌交给${str}`].map((item, i) => {
								return [i, item];
							}),
							"textbutton",
						],
					],
					true
				)
				.set("filterButton", button => {
					const { link } = button;
					if (!ui.selected.buttons.length) {
						return typeof link == "number";
					}
					return get.itemtype(link) == "card";
				})
				.set("source", source)
				.set("id", eventId)
				.set("_global_waiting", true)
				.set("ai", button => {
					const { player, source } = get.event();
					const { link } = button;
					const att = get.attitude(player, source),
						hs = player.getCards("he");
					hs.sort((b, a) => get.value(b, player) - get.value(a, player));
					if (!ui.selected.buttons.length) {
						if (att < -2 && Math.random() > (get.value(hs[0], player) - 3) / 5 && link == 1) {
							return 2;
						}
						if (link == 0) {
							return 1;
						}
					} else {
						const choice = ui.selected.buttons[0].link;
						if (choice == 0) {
							return 6 - get.value(link);
						}
						return 6 + (att > 0 ? 1.5 : 0) - get.value(link);
					}
				});
		},
	}
```

## chengui 名字:陈珪 势力:qun

### dcyingtu 名字:营图
描述: 每回合限一次。当你的上家/下家于摸牌阶段外得到牌后，你可以获得其一张牌，然后将一张牌交给你的下家/上家。若你给出的牌为装备牌，则其使用之。
```js
dcyingtu: {
		audio: 2,
		trigger: {
			global: ["gainAfter", "loseAsyncAfter"],
		},
		usable: 1,
		getIndex(event, player) {
			var targets = [];
			if (lib.skill.dcyingtu.filterx(event, player, player.getNext())) {
				targets.add(player.getNext());
			}
			if (lib.skill.dcyingtu.filterx(event, player, player.getPrevious())) {
				targets.add(player.getPrevious());
			}
			return targets.sortBySeat(_status.currentPhase);
		},
		filterx(event, player, target) {
			var evt = event.getParent("phaseDraw");
			if (evt && target == evt.player) {
				return false;
			}
			return (
				event.getg(target).length > 0 &&
				target.hasCard(function (card) {
					return lib.filter.canBeGained(card, target, player);
				}, "he")
			);
		},
		logTarget(event, player, triggername, target) {
			return target;
		},
		check(event, player, triggername, source) {
			var target = source == player.getNext() ? player.getPrevious() : player.getNext();
			return Math.min(0, get.attitude(player, target)) >= get.attitude(player, source);
		},
		prompt2: "获得该角色的一张牌，然后将一张牌交给该角色的对位角色。若你给出的是装备牌，则其使用其得到的牌。",
		async content(event, trigger, player) {
			let result;
			const target0 = event.targets[0];
			event.target = target0;
			const side = target0 == player.getPrevious() ? "getNext" : "getPrevious";
			event.side = side;
			await player.gainPlayerCard(target0, true, "he");

			const he = player.getCards("he");
			if (!he.length) {
				return;
			}

			const target = player[side]();
			event.target = target;
			if (he.length == 1) {
				result = { bool: true, cards: he };
			} else {
				result = await player.chooseCard("he", true, "交给" + get.translation(target) + "一张牌").forResult();
			}
			if (!result.bool) {
				return;
			}

			const card = result.cards[0];
			event.card = card;
			player.line(target);
			await player.give(card, target);

			if (target.getCards("h").includes(card) && get.type(card, null, target) == "equip" && target.canUse(card, target)) {
				await target.chooseUseTarget(card, true, "nopopup");
			}
		},
	}
```

### dccongshi 名字:从势
描述: 锁定技。一名角色使用的装备牌结算结束后，若其装备区内的牌数为全场最多，则你摸一张牌。
```js
dccongshi: {
		audio: 2,
		trigger: { global: "useCardAfter" },
		forced: true,
		filter(event, player) {
			return get.type(event.card, null, false) == "equip" && event.player.isMaxEquip();
		},
		async content(event, trigger, player) {
			player.draw();
		},
	}
```

## dc_huangquan 名字:黄权 势力:shu

### dcquanjian 名字:劝谏
描述: 出牌阶段每项各限一次。你可以选择一项流程并选择一名其他角色A：⒈令A对其攻击范围内的另一名角色B造成1点伤害。⒉令A将手牌数调整至手牌上限（至多摸至五张），且其本回合内不能使用手牌。然后A选择一项：⒈执行此流程。⒉本回合下次受到的伤害+1。
```js
dcquanjian: {
		audio: 2,
		enable: "phaseUse",
		usable: 2,
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		chooseButton: {
			dialog(event, player) {
				var dialog = ui.create.dialog("劝谏：令一名其他角色…", "hidden");
				dialog.add([
					[
						["damage", "对其攻击范围内的一名角色造成1点伤害"],
						["draw", "将其手牌数调整至手牌上限（至多摸至五张），且其本回合内不能使用手牌"],
					],
					"textbutton",
				]);
				return dialog;
			},
			filter(button, player) {
				return !player.getStorage("dcquanjian_used").includes(button.link);
			},
			check: () => 1 + Math.random(),
			backup(links) {
				return get.copy(lib.skill["dcquanjian_" + links[0]]);
			},
			prompt(links) {
				if (links[0] == "damage") {
					return "令一名其他角色对攻击范围内的另一名角色造成1点伤害";
				}
				return "令一名其他角色将手牌数调整至手牌上限（至多摸至五张）且本回合内不能使用手牌";
			},
		},
		ai: {
			order: 2,
			result: { player: 1 },
		},
		subSkill: {
			backup: { audio: "dcquanjian" },
			used: {
				charlotte: true,
				onremove: true,
			},
			damage: {
				audio: "dcquanjian",
				selectTarget: 2,
				filterTarget(card, player, target) {
					if (!ui.selected.targets.length) {
						return target != player;
					}
					return ui.selected.targets[0].inRange(target);
				},
				complexTarget: true,
				complexSelect: true,
				filterCard: () => false,
				selectCard: -1,
				targetprompt: ["造成伤害", "受到伤害"],
				multitarget: true,
				async content(event, trigger, player) {
					const { target, targets } = event;
					player.addTempSkill("dcquanjian_used", "phaseUseAfter");
					player.markAuto("dcquanjian_used", "damage");
					const result = await targets[0]
						.chooseControl()
						.set("choiceList", ["对" + get.translation(targets[1]) + "造成1点伤害", "本回合下次受到的伤害+1"])
						.set("ai", () => (_status.event.eff >= 0 ? 0 : 1))
						.set("eff", get.damageEffect(targets[1], targets[0], targets[0]))
						.forResult();
					if (result.index == 0) {
						await targets[1].damage(targets[0]);
					} else {
						target.addMark("dcquanjian_effect", 1, false);
						target.addTempSkill("dcquanjian_effect");
					}
				},
				ai: {
					result: {
						player(player, target) {
							if (ui.selected.targets.length == 0) {
								if (!game.hasPlayer(current => current.inRangeOf(target) && get.damageEffect(current, target, player) > 0)) {
									return 0;
								}
								if (get.attitude(player, target) > 0) {
									return 2;
								}
								return 1;
							}
							return get.damageEffect(target, ui.selected.targets[0], player, player);
						},
					},
				},
			},
			draw: {
				audio: "dcquanjian",
				filterTarget: lib.filter.notMe,
				filterCard: () => false,
				selectCard: -1,
				async content(event, trigger, player) {
					const { target } = event;
					let result;
					player.addTempSkill("dcquanjian_used", "phaseUseAfter");
					player.markAuto("dcquanjian_used", "draw");
					const num1 = target.countCards("h");
					const num2 = target.getHandcardLimit();
					let num = 0;
					if (num1 > num2) {
						event.index = 0;
						num = num1 - num2;
						result = await target
							.chooseControl()
							.set("choiceList", ["弃置" + get.cnNumber(num) + "张手牌，且本回合内不能使用或打出手牌", "本回合下次受到的伤害+1"])
							.set("ai", () => {
								const event = get.event();
								const player = get.player();
								if (event.number === 1 && player.hasCard(card => lib.filter.cardDiscardable(card, player, "dcquanjian_draw") && get.value(card) < 5, "h")) {
									return 0;
								}
								return 1;
							})
							.set("number", num)
							.forResult();
					} else {
						event.index = 1;
						num = Math.min(num2, 5) - num1;
						result = await target
							.chooseControl()
							.set("choiceList", [(num > 0 ? "摸" + get.cnNumber(num) + "张牌且" : "") + "本回合内不能使用或打出手牌", "本回合下次受到的伤害+1"])
							.set("ai", () => get.event().idx)
							.set("idx", num > 0 ? 0 : get.damageEffect(target, player, target) > 20 ? 0 : 1)
							.forResult();
					}
					event.num = num;
					if (result.index == 0) {
						if (event.index == 0) {
							await target.chooseToDiscard("h", true, num, "allowChooseAll");
						} else {
							await target.draw(num);
						}
						target.addTempSkill("dcquanjian_disable");
					} else {
						target.addMark("dcquanjian_effect", 1, false);
						target.addTempSkill("dcquanjian_effect");
					}
				},
				ai: {
					result: {
						target(player, target) {
							var num1 = target.countCards("h"),
								num2 = target.getHandcardLimit();
							if (num1 > num2) {
								return -1;
							}
							return Math.min(5, num2) - num1;
						},
					},
				},
			},
			effect: {
				charlotte: true,
				trigger: { player: "damageBegin3" },
				forced: true,
				onremove: true,
				marktext: "谏",
				async content(event, trigger, player) {
					trigger.num += player.countMark(event.name);
					player.removeSkill(event.name);
				},
				intro: { content: "下次受到的伤害+#" },
				ai: { threaten: 2.5 },
			},
			disable: {
				charlotte: true,
				mod: {
					cardEnabled2(card, player) {
						if (get.position(card) == "h") {
							return false;
						}
					},
				},
				mark: true,
				marktext: "禁",
				intro: { content: "不能使用或打出手牌" },
				ai: { threaten: 2.5 },
			},
		},
	}
```

### dctujue 名字:途绝
描述: 限定技。当你进入濒死状态时，你可以将所有牌交给一名其他角色。然后你回复X点体力并摸X张牌（X为你以此法交给其牌的数量，且至少为5）。
```js
dctujue: {
		audio: 2,
		trigger: { player: "dying" },
		limited: true,
		skillAnimation: true,
		animationColor: "gray",
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(lib.filter.notMe, get.prompt2(event.skill))
				.set("ai", target => {
					const { skip, player } = get.event();
					if (skip) {
						return 0;
					}
					return 200 + get.attitude(player, target);
				})
				.set("skip", player.countCards("hs", { name: ["tao", "jiu"] }) + player.hp > 0)
				.forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const {
				targets: [target],
			} = event;
			const cards = player.getCards("he");
			if (!cards.length) {
				return;
			}
			const num = Math.max(5, cards.length);
			await player.give(cards, target);
			await player.recover(num);
			await player.draw(num);
		},
	}
```

## yinfuren 名字:尹夫人 势力:wei

### dcyingyu 名字:媵予
描述: 准备阶段开始时，你可以展示两名角色的各一张手牌。若这两张牌的花色不同，则你可以令一名角色获得另一名角色的展示牌。
```js
dcyingyu: {
		audio: 2,
		trigger: { player: ["phaseZhunbeiBegin", "phaseJieshuBegin"] },
		direct: true,
		filter(event, player) {
			if (event.name == "phaseJieshu" && !player.storage.dcyingyu) {
				return false;
			}
			return (
				game.countPlayer(function (current) {
					return current.countCards("h") > 0;
				}) > 1
			);
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(2, get.prompt("dcyingyu"), "展示两名角色的各一张手牌。若这两张牌花色不同，则你可以令其中一名角色获得另一名角色的展示牌。", function (card, player, target) {
					return target.countCards("h") > 0;
				})
				.set("ai", function (target) {
					let currentPlayer = _status.event.player;
					if (!ui.selected.targets.length) {
						return get.attitude(currentPlayer, target);
					}
					return 1 - get.attitude(currentPlayer, target);
				})
				.forResult();
			if (!result.bool) {
				return;
			}

			const targets = result.targets.sortBySeat();
			const cards = [];
			player.logSkill("dcyingyu", targets);

			let cardResult = await player.choosePlayerCard(targets[0], true, "h").forResult();
			let card = cardResult.cards[0];
			player.line(targets[0]);
			await player.showCards(card, get.translation(player) + "对" + get.translation(targets[0]) + "发动了【媵予】");
			cards.push(card);

			cardResult = await player.choosePlayerCard(targets[1], true, "h").forResult();
			card = cardResult.cards[0];
			player.line(targets[1]);
			await player.showCards(card, get.translation(player) + "对" + get.translation(targets[1]) + "发动了【媵予】");
			cards.push(card);
			if (get.suit(cards[0], targets[0]) == get.suit(cards[1], targets[1])) {
				return;
			}

			const str1 = get.translation(targets[0]),
				str2 = get.translation(targets[1]);
			const controlResult = await player
				.chooseControl("cancel2")
				.set("choiceList", ["令" + str1 + "获得" + str2 + "的" + get.translation(cards[1]), "令" + str2 + "获得" + str1 + "的" + get.translation(cards[0])])
				.set("goon", get.attitude(player, targets[0]) > 0 ? 0 : 1)
				.set("ai", () => _status.event.goon)
				.forResult();
			if (controlResult.control != "cancel2") {
				const i = controlResult.index;
				await targets[1 - i].give(cards[1 - i], targets[i], "give");
			}
		},
		onremove: true,
	}
```

### dcyongbi 名字:拥嬖
描述: 限定技。出牌阶段，你可以将所有手牌展示并交给一名其他男性角色。你将〖媵予〗的发动时机改为“准备阶段和结束阶段开始时”。然后若这些牌中包含的花色数：大于1，则你与其本局游戏的手牌上限+2；大于2，则当你或其于本局游戏内受到大于1的伤害时，此伤害-1。
```js
dcyongbi: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(current => lib.skill.dcyongbi.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target != player && target.hasSex("male");
		},
		selectCard: -1,
		filterCard: true,
		position: "h",
		limited: true,
		skillAnimation: true,
		animationColor: "fire",
		discard: false,
		lose: false,
		async content(event, trigger, player) {
			const cards = event.cards;
			const target = event.target;
			player.awakenSkill(event.name);
			await player.showCards(cards, `${get.translation(player)}发动了〖${get.translation(event.name)}〗`);
			if (player.hasSkill("dcyingyu", null, null, false)) {
				player.storage.dcyingyu = true;
			}
			await player.give(cards, target);
			const list = [];
			for (const card of cards) {
				list.add(get.suit(card, player));
				if (list.length >= 3) {
					break;
				}
			}
			if (list.length >= 2) {
				player.addMark("dcyongbi_eff1", 2, false);
				player.addSkill("dcyongbi_eff1");
				target.addMark("dcyongbi_eff1", 2, false);
				target.addSkill("dcyongbi_eff1");
			}
			if (list.length >= 3) {
				player.addMark("dcyongbi_eff2", 1, false);
				player.addSkill("dcyongbi_eff2");
				target.addMark("dcyongbi_eff2", 1, false);
				target.addSkill("dcyongbi_eff2");
			}
		},
		ai: {
			order(item, player) {
				if (player.hasUnknown()) {
					return 0;
				}
				let list = [];
				for (let i of player.getCards("h")) {
					list.add(get.suit(i, player));
					if (list.length >= 3) {
						return 10;
					}
				}
				return 0;
			},
			result: {
				player: 1.8,
				target(player, target) {
					let zhu = get.zhu(player);
					if (zhu && get.attitude(player, zhu) > 0) {
						if (target == zhu) {
							return 4;
						}
					}
					return 1.8;
				},
			},
		},
		subSkill: {
			eff1: {
				mod: {
					maxHandcard: (player, num) => num + player.countMark("dcyongbi_eff1"),
				},
				charlotte: true,
				onremove: true,
				marktext: "拥",
				intro: { content: "手牌上限+#" },
			},
			eff2: {
				audio: "dcyongbi",
				trigger: { player: "damageBegin4" },
				forced: true,
				filter(event, player) {
					return event.num > 1;
				},
				async content(event, trigger, player) {
					trigger.num -= player.countMark("dcyongbi_eff2");
				},
				charlotte: true,
				onremove: true,
				marktext: "嬖",
				intro: { content: "受到大于1的伤害时，此伤害-#" },
			},
		},
	}
```

## dc_lvkuanglvxiang 名字:吕旷吕翔 势力:wei

### dcshuhe 名字:数合
描述: 出牌阶段限一次，你可以展示一张手牌并获得一枚“爵”。若场上有与此牌点数相同的牌，则你获得这些牌；否则你将此牌交给一名其他角色。
```js
dcshuhe: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		filterCard: true,
		position: "h",
		discard: false,
		lose: false,
		delay: false,
		check(cardx) {
			var player = _status.event.player;
			var num1 = get.number(cardx),
				players = game.filterPlayer();
			var goon = false,
				effect = 0;
			for (var current of players) {
				var cards = current.getCards("ej", function (card) {
					var num = get.number(card);
					return num == num1;
				});
				if (cards.length) {
					goon = true;
					var att = get.attitude(player, current);
					for (var card of cards) {
						if (get.position(card) == "e") {
							var val = get.value(card, current);
							if (att <= 0) {
								effect += val;
							} else {
								effect -= val / 2;
							}
						} else {
							var eff = get.effect(current, { name: card.viewAs || card.name }, player, player);
							effect -= get.sgn(att) * eff;
						}
					}
				}
			}
			if (goon) {
				if (effect > 0) {
					return 6 + effect - get.value(cardx);
				}
				return 0;
			}
			return game.hasPlayer(function (current) {
				return current != player && get.attitude(player, current) > 0;
			})
				? 6 - get.value(cardx)
				: 0;
		},
		async content(event, trigger, player) {
			const { cards } = event;
			let result;

			await player.showCards(cards, get.translation(player) + "发动了【数合】");
			player.addMark("dcliehou", 1);

			const cards2 = [];
			const num1 = get.number(cards[0], player);
			const lose_list = [];
			const players = game.filterPlayer();

			for (const current of players) {
				const matched = current.getCards("ej", card => {
					const num = get.number(card);
					return num == num1;
				});
				if (matched.length > 0) {
					player.line(current, "thunder");
					current.$throw(matched);
					lose_list.push([current, matched]);
					cards2.addArray(matched);
				}
			}

			if (lose_list.length > 0) {
				await game
					.loseAsync({
						lose_list,
					})
					.setContent("chooseToCompareLose");

				if (cards2.length > 0) {
					await game.delayx();
					await player.gain(cards2, "gain2");
				}
				return;
			}

			result = await player
				.chooseTarget(true, lib.filter.notMe, "将" + get.translation(cards[0]) + "交给一名其他角色")
				.set("ai", target => {
					return get.attitude(_status.event.player, target);
				})
				.forResult();

			if (result.bool) {
				const target = result.targets[0];
				player.line(target, "green");
				await player.give(cards, target);
			}
		},
		ai: {
			order: 2,
			result: {
				player: 1,
			},
		},
	}
```

### dcliehou 名字:列侯
描述: 锁定技。摸牌阶段开始时，你令额定摸牌数+X；然后此摸牌阶段结束时，你选择一项：⒈弃置X张牌。⒉失去1点体力（X为你的“爵”数+1且至多为6）。
```js
dcliehou: {
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		forced: true,
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			var num = Math.min(6, 1 + player.countMark("dcliehou"));
			trigger.num += num;
			trigger._dcliehou = num;
		},
		group: "dcliehou_discard",
		subSkill: {
			discard: {
				audio: "dcliehou",
				trigger: { player: "phaseDrawEnd" },
				forced: true,
				filter(event, player) {
					return typeof event._dcliehou == "number";
				},
				async content(event, trigger, player) {
					const num = trigger._dcliehou;
					const result = await player
						.chooseToDiscard(num, "he", "弃置" + get.cnNumber(num) + "张牌，或失去1点体力")
						.set("ai", card => {
							if (_status.event.goon) {
								return 6 - get.value(card);
							}
							return 26 - get.value(card);
						})
						.set("goon", player.hp > Math.max(1, 4 - num) || get.effect(player, { name: "losehp" }, player, player) > 0)
						.forResult();
					if (!result.bool) {
						player.loseHp();
					}
				},
			},
		},
		marktext: "爵",
		intro: {
			name: "列侯(爵)",
			name2: "爵",
			content: "〖列侯〗的摸牌数+#",
		},
	}
```

## guanhai 名字:管亥 势力:qun

### suoliang 名字:索粮
描述: 每回合限一次。当你对其他角色造成伤害后，你可以选择并展示其的至多X张牌（X为其体力上限且至多为5）。若这些牌中有♥或♣牌，则你获得这些牌；否则你弃置这些牌。
```js
suoliang: {
		audio: 2,
		trigger: { source: "damageSource" },
		logTarget: "player",
		usable: 1,
		filter(event, player) {
			return event.player != player && event.player.maxHp > 0 && event.player.countCards("he") > 0;
		},
		check(event, player) {
			return get.attitude(player, event.player) <= 0;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const result = await player.choosePlayerCard(target, true, "he", [1, target.maxHp], "选择" + get.translation(target) + "的至多" + get.cnNumber(target.maxHp) + "张牌").forResult();
			if (result.bool) {
				await player.showCards(result.cards, get.translation(player) + "对" + get.translation(target) + "发动了【索粮】");
				const cards = result.cards.filter(card => {
					const suit = get.suit(card, target);
					if (suit != "heart" && suit != "club") {
						return false;
					}
					return lib.filter.canBeGained(card, target, player);
				});
				if (cards.length) {
					await player.gain(cards, target, "giveAuto", "bySelf");
				} else {
					await target.modedDiscard(result.cards, player);
				}
			}
		},
	}
```

### qinbao 名字:侵暴
描述: 锁定技。当你使用【杀】或普通锦囊牌时，你令所有手牌数不小于你的其他角色不能响应此牌。
```js
qinbao: {
		audio: 2,
		trigger: { player: "useCard" },
		forced: true,
		filter(event, player) {
			return (
				(event.card.name == "sha" || get.type(event.card, null, false) == "trick") &&
				game.hasPlayer(function (current) {
					return current != player && current.countCards("h") >= player.countCards("h");
				})
			);
		},
		async content(event, trigger, player) {
			var hs = player.countCards("h");
			trigger.directHit.addArray(
				game.filterPlayer(function (current) {
					return current != player && current.countCards("h") >= hs;
				})
			);
		},
		ai: {
			threaten: 1.4,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (!arg?.target) {
					return false;
				}
				return (
					player.countCards("h", function (card) {
						return !ui.selected.cards.includes(card);
					}) <= arg.target.countCards("h")
				);
			},
		},
	}
```

## huzhao 名字:胡昭 势力:qun

### midu 名字:弥笃
描述: 出牌阶段限一次。你可以选择一项：⒈废除任意个装备栏或判定区，并令一名角色摸等量的牌。⒉恢复一个已经被废除的装备栏或判定区，然后你获得〖活墨〗直到下回合开始。
```js
midu: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		chooseButton: {
			dialog(event, player) {
				var dialog = ui.create.dialog("弥笃：选择要废除或恢复的装备栏或判定区", "hidden");
				dialog.classList.add("withbg");
				dialog.noforcebutton = true;
				var list1 = [],
					list2 = [];
				for (var i = 1; i < 6; i++) {
					for (var j = 0; j < player.countEnabledSlot(i); j++) {
						list1.push(i);
					}
					if (player.hasDisabledSlot(i)) {
						list2.push(i);
					}
				}
				(player.isDisabledJudge() ? list2 : list1).push(-1);
				var addTable = function (list, bool) {
					const adds = [];
					for (var i of list) {
						adds.push([[i, bool], i > 0 ? get.translation("equip" + i) + "栏" : "判定区"]);
					}
					dialog.add([adds, "tdnodes"]);
				};
				if (list1.length) {
					dialog.addText("未废除");
					addTable(list1, true);
				}
				if (list2.length) {
					dialog.addText("已废除");
					addTable(list2, false);
				}
				return dialog;
			},
			filter(button, player) {
				if (!ui.selected.buttons.length) {
					return true;
				}
				if (!ui.selected.buttons[0].link[1]) {
					return false;
				}
				return button.link[1];
			},
			check(button) {
				var player = _status.event.player;
				if (!button.link[1]) {
					if (button.link[0] <= 0) {
						return -10;
					}
					if (
						player.hasCard(function (card) {
							return get.subtype(card) == "equip" + button.link[0];
						}, "hs")
					) {
						return 15;
					}
					return 10;
				}
				if (
					button.link[0] <= 0 ||
					(player.hasEmptySlot(button.link[0]) &&
						!player.hasCard(function (card) {
							return get.subtype(card) == "equip" + button.link[0] && player.canUse(card, player) && get.effect(player, card, player, player) > 0;
						}, "hs"))
				) {
					return 5;
				}
				return 0;
			},
			select: [1, Infinity],
			backup(links, player) {
				if (!links[0][1]) {
					return {
						audio: "midu",
						selectCard: -1,
						selectTarget: -1,
						filterCard: () => false,
						filterTarget: () => false,
						equip: links[0][0],
						async content(event, trigger, player) {
							var pos = lib.skill.midu_backup.equip;
							if (pos <= 0) {
								player.enableJudge();
							} else {
								player.enableEquip(pos);
							}
							player.addTempSkills("rehuomo", { player: "phaseBegin" });
						},
					};
				} else {
					return {
						audio: "midu",
						selectCard: -1,
						filterCard: () => false,
						filterTarget: true,
						equip: links.map(i => i[0]).sort(),
						async content(event, trigger, player) {
							const list = lib.skill.midu_backup.equip;
							const num = list.length;
							let bool = false;
							if (list.includes(-1)) {
								list.remove(-1);
								bool = true;
							}
							if (list.length > 0) {
								player.disableEquip(list);
							}
							if (bool) {
								player.disableJudge();
							}
							event.target.draw(num);
						},
						ai: {
							tag: {
								draw: 1,
							},
							result: {
								target: 2,
							},
						},
					};
				}
			},
			prompt(links, player) {
				if (!links[0][1]) {
					return "恢复一个装备栏或判定区并获得〖活墨〗";
				}
				var numc = get.cnNumber(links.length);
				return "废除" + numc + "个区域并令一名角色摸" + numc + "张牌";
			},
		},
		derivation: "rehuomo",
		ai: {
			order: 8,
			result: { player: 1 },
		},
		subSkill: { backup: {} },
	}
```

### xianwang 名字:贤望
描述: 锁定技。若你有被废除的装备栏，则其他角色至你的距离+1，你至其他角色的距离-1；若废除的装备栏数大于2，则改为距离+2/-2。
```js
xianwang: {
		audio: 2,
		mod: {
			globalTo(source, player, distance) {
				var num = player.countDisabledSlot();
				if (num > 0) {
					return distance + (num > 2 ? 2 : 1);
				}
			},
			globalFrom(source, player, distance) {
				var num = source.countDisabledSlot();
				if (num > 0) {
					return distance - (num > 2 ? 2 : 1);
				}
			},
		},
		ai: {
			combo: "midu",
		},
	}
```

## dc_liuba 名字:刘巴 势力:shu

### dczhubi 名字:铸币
描述: 当有♦牌因弃置而进入弃牌堆后，你可以令系统从牌堆/弃牌堆中检索一张【无中生有】，并将此牌置于牌堆顶。
```js
dczhubi: {
		audio: 2,
		trigger: {
			global: ["loseAfter", "loseAsyncAfter"],
		},
		filter(event, player) {
			if (event.type != "discard" || event.getlx === false) {
				return false;
			}
			for (var i of event.cards) {
				if (get.suit(i, event.player) == "diamond" && get.position(i) === "d") {
					return true;
				}
			}
			return false;
		},
		prompt2: "检索一张【无中生有】并置于牌堆顶",
		async content(event, trigger, player) {
			const card = get.cardPile(function (card) {
				return card.name == "wuzhong" && get.suit(card) != "diamond";
			});
			if (card) {
				game.log(player, "将", card, "置于牌堆顶");
				await game.cardsGotoPile(card, "insert");
				await game.delayx();
			}
		},
	}
```

### dcliuzhuan 名字:流转
描述: 锁定技。①其他角色于其回合内不于摸牌阶段而得到的牌称为“转”。②你不能成为实体牌中包含“转”的牌的目标。③当有“转”直接进入弃牌堆或经由处理区进入弃牌堆后，你获得之。
```js
dcliuzhuan: {
		audio: 2,
		group: ["dcliuzhuan_mark", "dcliuzhuan_gain"],
		mod: {
			targetEnabled(card) {
				if (card.cards) {
					for (var i of card.cards) {
						if (i.hasGaintag("dcliuzhuan_tag")) {
							return false;
						}
					}
				} else if (get.itemtype(card) == "card") {
					if (card.hasGaintag("dcliuzhuan_tag")) {
						return false;
					}
				}
			},
		},
		subSkill: {
			gain: {
				audio: "dcliuzhuan",
				trigger: { global: ["loseAfter", "loseAsyncAfter", "cardsDiscardAfter"] },
				forced: true,
				logTarget: () => _status.currentPhase,
				filter(event, player) {
					var current = _status.currentPhase;
					if (!current) {
						return false;
					}
					if (event.name == "cardsDiscard") {
						var evtx = event.getParent();
						if (evtx.name != "orderingDiscard") {
							return false;
						}
						var evtx2 = evtx.relatedEvent || evtx.getParent();
						return current.hasHistory("lose", function (evtx3) {
							var evtx4 = evtx3.relatedEvent || evtx3.getParent();
							if (evtx2 != evtx4) {
								return false;
							}
							for (var i in evtx3.gaintag_map) {
								if (evtx3.gaintag_map[i].includes("dcliuzhuan_tag")) {
									return true;
								}
							}
						});
						//return false;
					} else if (event.name == "lose") {
						if (event.player != current || event.position != ui.discardPile) {
							return false;
						}
						for (var i in event.gaintag_map) {
							if (event.gaintag_map[i].includes("dcliuzhuan_tag")) {
								return true;
							}
						}
						return false;
					}
					return current.hasHistory("lose", function (evt) {
						if (evt.getParent() != event || evt.position != ui.discardPile) {
							return false;
						}
						for (var i in evt.gaintag_map) {
							if (evt.gaintag_map[i].includes("dcliuzhuan_tag")) {
								return true;
							}
						}
					});
				},
				async content(event, trigger, player) {
					let cards;
					const current = _status.currentPhase;
					if (trigger.name == "lose") {
						cards = trigger.hs.filter(function (i) {
							return trigger.gaintag_map[i.cardid] && trigger.gaintag_map[i.cardid].includes("dcliuzhuan_tag") && get.position(i, true) == "d";
						});
					} else if (trigger.name == "cardsDiscard") {
						const evtx = trigger.getParent();
						const evtx2 = evtx.relatedEvent || evtx.getParent();
						let bool = false;
						const history = current.getHistory("lose", function (evtx3) {
							const evtx4 = evtx3.relatedEvent || evtx3.getParent();
							if (evtx2 != evtx4) {
								return false;
							}
							for (const i in evtx3.gaintag_map) {
								if (evtx3.gaintag_map[i].includes("dcliuzhuan_tag")) {
									return true;
								}
							}
						});
						cards = trigger.cards.filter(function (i) {
							for (const evt of history) {
								if (evt.gaintag_map[i.cardid] && evt.gaintag_map[i.cardid].includes("dcliuzhuan_tag") && get.position(i, true) == "d") {
									return true;
								}
							}
							return false;
						});
					} else {
						cards = [];
						current.getHistory("lose", function (evt) {
							if (evt.getParent() != trigger || evt.position != ui.discardPile) {
								return false;
							}
							for (const card of evt.hs) {
								if (get.position(card, true) != "d") {
									continue;
								}
								const i = card.cardid;
								if (evt.gaintag_map[i] && evt.gaintag_map[i].includes("dcliuzhuan_tag")) {
									cards.push(card);
								}
							}
						});
					}
					if (cards && cards.length > 0) {
						await player.gain(cards, "gain2");
					}
				},
			},
			mark: {
				trigger: { global: "gainBegin" },
				forced: true,
				popup: false,
				silent: true,
				lastDo: true,
				filter(event, player) {
					if (player == event.player || event.player != _status.currentPhase) {
						return false;
					}
					var evt = event.getParent("phaseDraw");
					if (evt && evt.name == "phaseDraw") {
						return false;
					}
					return true;
				},
				async content(event, trigger, player) {
					trigger.gaintag.add("dcliuzhuan_tag");
					trigger.player.addTempSkill("dcliuzhuan_tag");
				},
			},
			tag: {
				charlotte: true,
				onremove: (player, skill) => player.removeGaintag(skill),
			},
		},
	}
```

## zhangxun 名字:张勋 势力:qun

### suizheng 名字:随征
描述: 结束阶段，你可以选择一名角色Ａ，获得如下效果直到其下回合结束：①Ａ于下回合出牌阶段内使用【杀】的次数上限+2且无距离限制；②Ａ下回合的出牌阶段结束时，你可以选择一名此阶段内受到过Ａ造成的伤害的角色Ｂ，视为对Ｂ使用一张【杀】。
```js
suizheng: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "令一名角色下回合内获得〖随征〗效果")
				.set("", target => {
					const player = get.player();
					const attitude = get.attitude(player, target);
					if (target.hasJudge("lebu")) {
						return attitude / 2;
					}
					return attitude * get.threaten(target) * Math.sqrt(2 + (player === target ? player.countCards("h", "sha") * 2 : target.countCards("h")));
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			target.addMark("suizheng_effect", 2, false);
			target.markAuto("suizheng_source", [player]);
			target.addTempSkill("suizheng_effect", {
				player: player === target ? "phaseJieshuBefore" : "phaseAfter",
			});
		},
		subSkill: {
			effect: {
				audio: "suizheng",
				charlotte: true,
				mod: {
					targetInRange(card) {
						if (card.name == "sha") {
							return true;
						}
					},
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("suizheng_effect");
						}
					},
				},
				trigger: { player: "phaseUseEnd" },
				forced: true,
				popup: false,
				filter(event, player) {
					const list = player.getStorage("suizheng_source");
					if (!list.some(current => current.isIn())) {
						return false;
					}
					return player.hasHistory("sourceDamage", evt => {
						return evt.player.isIn() && evt.getParent("phaseUse") == event;
					});
				},
				async content(event, trigger, player) {
					const targets = player.getStorage("suizheng_source").slice(0).sortBySeat();
					event.targets = targets;
					for (const target of targets) {
						if (!target.isIn()) {
							continue;
						}
						const list = player
							.getHistory("sourceDamage", evt => {
								return evt.player.isIn() && evt.getParent("phaseUse") == trigger && target.canUse({ name: "sha", isCard: true }, evt.player, false);
							})
							.map(evt => evt.player)
							.toUniqued();
						if (!list.length) {
							continue;
						}
						const result = await target
							.chooseTarget("随征：是否对一名角色使用【杀】？", (card, player, target) => {
								return get.event().targets.includes(target);
							})
							.set("targets", list)
							.set("ai", target => {
								const player = get.player();
								return get.effect(target, { name: "sha" }, player, player);
							})
							.forResult();
						if (result?.bool) {
							await target.useCard({ name: "sha", isCard: true }, result.targets[0], false);
						}
					}
				},
				onremove(player) {
					delete player.storage.suizheng_effect;
					delete player.storage.suizheng_source;
				},
				intro: { content: `使用【杀】无距离限制且次数上限+#` },
			},
		},
	}
```

## zongyu 名字:zongyu 势力:shu

### zyqiao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### chengshang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## dc_jiling 名字:纪灵 势力:qun

### dcshuangren 名字:双刃
描述: 出牌阶段开始时，你可以和一名其他角色A进行拼点。若你赢，你选择一名角色B，或选择包含A在内的两名角色A和B（B的势力需与A相同），然后视为对被选择的角色使用一张【杀】（不计入次数限制）；若你没赢，则你本阶段内不能使用【杀】。
```js
dcshuangren: {
		audio: "shuangren",
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
			var goon;
			if (player.needsToDiscard() > 1) {
				goon = player.hasCard(function (card) {
					return card.number > 10 && get.value(card) <= 5;
				});
			} else if (player.hasSha()) {
				goon = player.hasCard(function (card) {
					return (card.number >= 9 && get.value(card) <= 5) || get.value(card) <= 3;
				});
			} else {
				goon = player.hasCard(function (card) {
					return get.value(card) <= 5;
				});
			}
			const compareTargetResult = await player
				.chooseTarget(get.prompt2("dcshuangren"), function (card, player, target) {
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
				.setHiddenSkill(event.name)
				.forResult();
			if (!compareTargetResult.bool) {
				return;
			}
			const target = compareTargetResult.targets[0];
			player.logSkill("dcshuangren", target);
			const compareResult = await player.chooseToCompare(target).forResult();
			if (!compareResult.bool) {
				player.addTempSkill("dcshuangren_debuff", "phaseUseAfter");
				return;
			}
			if (
				game.hasPlayer(function (current) {
					if (target == current || target.group != current.group) {
						return false;
					}
					return player.canUse("sha", current, false);
				})
			) {
				var str = "请选择视为使用【杀】的目标";
				var str2 = "操作提示：选择一名角色B，或选择包含A（" + get.translation(target) + "）在内的两名角色A和B（B的势力需为" + get.translation(target.group) + "势力）";
				const useResult = await player
					.chooseTarget([1, 2], str, str2, true, function (card, player, target) {
						if (!player.canUse("sha", target, false)) {
							return false;
						}
						var current = _status.event.target;
						if (target == current) {
							return true;
						}
						if (target.group != current.group) {
							return false;
						}
						if (!ui.selected.targets.length) {
							return true;
						}
						return ui.selected.targets[0] == current;
						//return current==target;
					})
					.set("ai", function (target) {
						var player = _status.event.player;
						return get.effect(target, { name: "sha" }, player, player);
					})
					.set("target", target)
					.set("complexTarget", true)
					.forResult();
				if (useResult.bool && useResult.targets && useResult.targets.length) {
					await player.useCard({ name: "sha", isCard: true }, useResult.targets, false);
				}
			} else {
				await player.useCard({ name: "sha", isCard: true }, target, false);
			}
		},
		subSkill: {
			debuff: {
				charlotte: true,
				mod: {
					cardEnabled(card) {
						if (card.name == "sha") {
							return false;
						}
					},
				},
			},
		},
	}
```

## dc_yanghu 名字:羊祜 势力:wei

### dcdeshao 名字:德劭
描述: 每回合限两次。当你成为其他角色使用的黑色牌的目标后，你可以摸一张牌，然后若其手牌数不小于你，则你弃置其一张牌。
```js
dcdeshao: {
		audio: 2,
		usable: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return player != event.player && get.color(event.card) == "black";
		},
		logTarget: "player",
		check(event, player) {
			var eff = get.effect(player, { name: "draw" }, player, player);
			if (player.countCards("h") + 1 <= event.player.countCards("h") && event.player.countCards("he") > 0) {
				eff += get.effect(event.player, { name: "guohe_copy2" }, player, player);
			}
			return eff;
		},
		async content(event, trigger, player) {
			await player.draw();
			var target = trigger.player;
			if (player.countCards("h") <= target.countCards("h") && target.countCards("he") > 0) {
				await player.discardPlayerCard(target, true, "he");
				player.addExpose(0.2);
			}
		},
	}
```

### dcmingfa 名字:明伐
描述: ①出牌阶段限一次。当你使用【杀】或普通锦囊牌结算结束后，若你的武将牌上没有“明伐”牌，则你可以将此牌作为“明伐”牌置于武将牌上并选择一名其他角色，记录该角色和此牌的名称。②一名角色的回合结束时，若其是你〖明伐①〗记录的角色，则你视为对其依次使用X张〖明伐①〗记录的牌，然后移去“明伐”牌（X为其手牌数且至少为1，至多为5）。③一名角色死亡时，若其是你〖明伐①〗记录的角色，则你移去“明伐”牌。
```js
dcmingfa: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		direct: true,
		filter(event, player) {
			return player.isPhaseUsing() && (event.card.name == "sha" || get.type(event.card) == "trick") && event.cards.filterInD().length > 0 && !player.getExpansions("dcmingfa").length;
		},
		async content(event, trigger, player) {
			var str,
				cards = trigger.cards.filterInD(),
				card = trigger.card;
			if (cards.length == 1 && card.name == cards[0].name && (card.nature || false) == (cards[0].nature || false)) {
				str = get.translation(cards[0]);
			} else {
				str = get.translation(trigger.card) + "（" + get.translation(cards) + "）";
			}
			var cardx = {
				name: trigger.card.name,
				nature: trigger.card.nature,
				isCard: true,
			};
			const result = await player
				.chooseTarget(lib.filter.notMe, get.prompt("dcmingfa"), "将" + str + "作为“明伐”牌置于武将牌上，并选择一名其他角色。该角色下回合结束时对其执行〖明伐〗的后续效果。")
				.set("card", cardx)
				.set(
					"goon",
					(function () {
						var getMax = function (card) {
							return Math.max.apply(
								Math,
								game
									.filterPlayer(function (current) {
										return current != player && lib.filter.targetEnabled2(card, player, current);
									})
									.map(function (i) {
										return get.effect(i, card, player, player) * Math.sqrt(Math.min(i.getHandcardLimit(), 1 + i.countCards("h")));
									})
									.concat([0])
							);
						};
						var eff1 = getMax(cardx);
						if (
							player.hasCard(function (card) {
								if ((card.name != "sha" && get.type(card) != "trick") || !player.hasValueTarget(card, null, true)) {
									return false;
								}
								return (
									getMax({
										name: get.name(card),
										nature: get.nature(card),
										isCard: true,
									}) >= eff1
								);
							}, "hs")
						) {
							return false;
						}
						return true;
					})()
				)
				.set("ai", function (target) {
					if (!_status.event.goon) {
						return 0;
					}
					var player = _status.event.player,
						card = _status.event.card;
					if (!lib.filter.targetEnabled2(card, player, target)) {
						return 0;
					}
					return get.effect(target, card, player, player) * Math.sqrt(Math.min(target.getHandcardLimit(), 1 + target.countCards("h")));
				})
				.forResult();
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("dcmingfa", target);
				var card = {
					name: trigger.card.name,
					nature: trigger.card.nature,
					isCard: true,
				};
				player.storage.dcmingfa_info = [card, target];
				player.addToExpansion(trigger.cards.filterInD(), "gain2").gaintag.add("dcmingfa");
			}
		},
		group: "dcmingfa_use",
		ai: { expose: 0.2 },
		intro: {
			mark(dialog, storage, player) {
				var cards = player.getExpansions("dcmingfa");
				if (!cards.length) {
					return "没有“明伐”牌";
				} else {
					dialog.add(cards);
				}
				var info = player.storage.dcmingfa_info;
				if (info) {
					dialog.addText("记录牌：" + get.translation(info[0]) + "<br>记录目标：" + get.translation(info[1]));
				}
			},
			content: "expansion",
		},
		onremove(player, skill) {
			var cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
			delete player.storage.dcmingfa_info;
		},
		subSkill: {
			use: {
				audio: "dcmingfa",
				trigger: { global: ["phaseEnd", "die"] },
				forced: true,
				filter(event, player) {
					if (!player.storage.dcmingfa_info || !player.getExpansions("dcmingfa").length) {
						return false;
					}
					return event.player == player.storage.dcmingfa_info[1];
				},
				async content(event, trigger, player) {
					const target = trigger.player;
					event.target = target;
					const card = player.storage.dcmingfa_info[0];
					delete player.storage.dcmingfa_info;
					event.card = card;
					const count = Math.max(1, Math.min(5, target.countCards("h")));
					if (event.player.isIn()) {
						for (let i = 0; i < count; i++) {
							if (target.isIn() && lib.filter.targetEnabled2(card, player, target)) {
								await player.useCard(get.copy(card), target);
							}
						}
					}
					const cards = player.getExpansions("dcmingfa");
					if (cards.length > 0) {
						await player.loseToDiscardpile(cards);
					}
				},
			},
		},
	}
```

## caimaozhangyun 名字:蔡瑁张允 势力:wei

### lianzhou 名字:连舟
描述: 锁定技。准备阶段，你横置你的武将牌。然后你可横置任意名体力值等于你的角色。
```js
lianzhou: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			if (!player.isLinked()) {
				return true;
			}
			return game.hasPlayer(function (current) {
				return current != player && current.hp == player.hp && !current.isLinked();
			});
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			if (!player.isLinked()) {
				await player.link();
			}
			// step 1
			const num = game.countPlayer(current => {
				return current != player && current.hp == player.hp && !current.isLinked();
			});
			if (num <= 0) {
				return;
			}
			result = await player
				.chooseTarget([1, num], "选择横置任意名体力值等于你的角色", function (card, player, current) {
					return current != player && current.hp == player.hp && !current.isLinked();
				})
				.set("ai", function (target) {
					const player = _status.event.player;
					return get.effect(target, { name: "tiesuo" }, player, player);
				})
				.forResult();
			// step 2
			if (result.bool) {
				const targets = result.targets.sortBySeat();
				player.line(targets, "green");
				for (const i of targets) {
					i.link();
				}
			}
		},
		ai: { halfneg: true },
	}
```

### jinglan 名字:惊澜
描述: 锁定技。当你造成伤害后，若你的手牌数：大于体力值，你弃置四张手牌；等于体力值，你弃置一张牌并回复1点体力；小于体力值，你受到1点无来源火焰伤害并摸五张牌。
```js
jinglan: {
		audio: 2,
		trigger: { source: "damageSource" },
		forced: true,
		async content(event, trigger, player) {
			var delta = player.countCards("h") - player.hp;
			if (delta > 0) {
				player.chooseToDiscard("h", 4, true);
			} else if (delta == 0) {
				player.chooseToDiscard("he", true);
				player.recover();
			} else {
				player.damage("fire", "nosource");
				player.draw(5);
			}
		},
		ai: { halfneg: true },
	}
```

## tenggongzhu 名字:滕公主 势力:wu

### xingchong 名字:幸宠
描述: 每轮开始时，你可声明两个自然数X和Y，且(X+Y)≤min(5, 你的体力上限)。你摸X张牌并展示Y张手牌。若如此做，当你于本轮内失去一张以此法展示的牌后，你摸两张牌。
```js
xingchong: {
		audio: 2,
		trigger: { global: "roundStart" },
		direct: true,
		filter(event, player) {
			return player.maxHp > 0;
		},
		async content(event, trigger, player) {
			var list = [];
			for (var i = 0; i <= Math.min(5, player.maxHp); i++) {
				list.push(get.cnNumber(i) + "张");
			}
			list.push("cancel2");
			const controlResult = await player
				.chooseControl(list)
				.set("prompt", get.prompt("xingchong"))
				.set("prompt2", "请首先选择摸牌的张数")
				.set("ai", function () {
					var player = _status.event.player,
						num1 = player.maxHp,
						num2 = player.countCards("h");
					if (num1 <= num2) {
						return 0;
					}
					return Math.ceil((num1 - num2) / 2);
				})
				.forResult();
			if (controlResult.control == "cancel2") {
				return;
			}
			player.logSkill("xingchong");
			const num2 = controlResult.index;
			if (num2 > 0) {
				await player.draw(num2);
			}
			const num = Math.min(5, player.maxHp) - num2;
			if (num == 0) {
				return;
			}
			if (player.countCards("h") <= 0) {
				return;
			}
			const cardResult = await player
				.chooseCard("h", [1, Math.min(player.countCards("h"), num)], "请选择要展示的牌")
				.set("ai", () => 1 + Math.random())
				.forResult();
			if (cardResult.bool) {
				var cards = cardResult.cards;
				player.showCards(cards, get.translation(player) + "发动了【幸宠】");
				player.addGaintag(cards, "xingchong");
				player.addTempSkill("xingchong_effect", "roundStart");
			}
		},
		subSkill: {
			effect: {
				audio: "xingchong",
				trigger: {
					player: ["loseAfter"],
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				filter(event, player) {
					var evt = event.getl(player);
					if (!evt || !evt.cards2 || !evt.cards2.length) {
						return false;
					}
					if (event.name == "lose") {
						for (var i in event.gaintag_map) {
							if (event.gaintag_map[i].includes("xingchong")) {
								return true;
							}
						}
						return false;
					}
					return player.hasHistory("lose", function (evt) {
						if (event != evt.getParent()) {
							return false;
						}
						for (var i in evt.gaintag_map) {
							if (evt.gaintag_map[i].includes("xingchong")) {
								return true;
							}
						}
						return false;
					});
				},
				forced: true,
				popup: false,
				charlotte: true,
				onremove(player) {
					player.removeGaintag("xingchong");
				},
				async content(event, trigger, player) {
					if (trigger.delay === false) {
						await game.delayx();
					}
					player.logSkill("xingchong_effect");
					let num = 0;
					if (trigger.name === "lose") {
						for (const i in trigger.gaintag_map) {
							if (trigger.gaintag_map[i].includes("xingchong")) {
								num++;
							}
						}
					} else {
						player.getHistory("lose", evt => {
							if (trigger !== evt.getParent()) {
								return false;
							}
							for (const i in evt.gaintag_map) {
								if (evt.gaintag_map[i].includes("xingchong")) {
									num++;
								}
							}
						});
					}
					await player.draw(2 * num);
				},
			},
		},
	}
```

### liunian 名字:流年
描述: 锁定技。一名角色的回合结束时，若本回合内进行了本次游戏的第一次洗牌，则你加1点体力上限；若本回合内进行了本次游戏的第二次洗牌，则你于本回合结束时回复1点体力，且本局游戏内的手牌上限+10。
```js
liunian: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		forced: true,
		filter(event, player) {
			return game.hasGlobalHistory("cardMove", function (evt) {
				return evt.washCard && (evt.shuffleNumber == 1 || evt.shuffleNumber == 2);
			});
		},
		async content(event, trigger, player) {
			// step 0
			if (
				game.hasGlobalHistory("cardMove", function (evt) {
					return evt.washCard && evt.shuffleNumber == 1;
				})
			) {
				player.gainMaxHp();
				await game.delayx();
			}
			// step 1
			if (
				game.hasGlobalHistory("cardMove", function (evt) {
					return evt.washCard && evt.shuffleNumber == 2;
				})
			) {
				player.recover();
				await game.delayx();
			} else {
				return;
			}
			// step 2
			player.addSkill("liunian_effect");
			player.addMark("liunian_effect", 10, false);
		},
		subSkill: {
			effect: {
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("liunian_effect");
					},
				},
				marktext: "年",
				intro: {
					content: "手牌上限+#",
				},
			},
		},
	}
```

## dc_huangchengyan 名字:黄承彦 势力:qun

### dcjiezhen 名字:解阵
描述: 出牌阶段限一次，你可选择一名其他角色。该角色获得〖八阵〗，且其所有不为{锁定技、限定技、觉醒技、主公技、带有Charlotte标签}的技能失效。你的下回合开始时，或其因【八卦阵】发起的判定结算结束后，你令其恢复其以此法失效的所有技能并失去以此法获得的〖八阵〗，然后获得其区域内的一张牌。
```js
dcjiezhen: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const { target } = event;
			const skills = target.getSkills(null, false, false).filter(skill => {
				if (skill == "bazhen") {
					return;
				}
				var info = get.info(skill);
				return info && !get.is.locked(skill) && !info.limited && !info.juexingji && !info.zhuSkill && !info.charlotte && !info.persevereSkill;
			});
			target.addAdditionalSkills("dcjiezhen_blocker", "bazhen");
			target.addSkill("dcjiezhen_blocker");
			target.markAuto("dcjiezhen_blocker", skills);
			player.addSkill("dcjiezhen_clear");
			player.markAuto("dcjiezhen_clear", [target]);
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					var skills = target.getSkills(null, false, false).filter(function (i) {
						if (i == "bazhen") {
							return;
						}
						var info = get.info(i);
						return info && !get.is.locked(i) && !info.limited && !info.juexingji && !info.zhuSkill && !info.charlotte && !info.persevereSkill;
					});
					if (!skills.length && target.hasEmptySlot(2)) {
						return 1;
					}
					return -0.5 * skills.length;
				},
			},
		},
		subSkill: {
			blocker: {
				init(player, skill) {
					player.addSkillBlocker(skill);
				},
				onremove(player, skill) {
					player.removeSkillBlocker(skill);
					player.removeAdditionalSkill(skill);
					delete player.storage.dcjiezhen_blocker;
				},
				charlotte: true,
				locked: true,
				skillBlocker(skill, player) {
					return skill != "bazhen" && skill != "dcjiezhen_blocker" && !lib.skill[skill].charlotte && !lib.skill[skill].persevereSkill && player.getStorage("dcjiezhen_blocker").includes(skill);
				},
				mark: true,
				marktext: "阵",
				intro: {
					markcount: () => 0,
					content(storage, player, skill) {
						if (storage.length) {
							return "失效技能：" + get.translation(storage);
						}
						return "无失效技能";
					},
				},
			},
			clear: {
				audio: "dcjiezhen",
				charlotte: true,
				trigger: {
					global: ["judgeAfter", "die"],
					player: "phaseBegin",
				},
				forced: true,
				forceDie: true,
				onremove: true,
				filter(event, player) {
					if (event.name == "die") {
						return player == event.player || player.getStorage("dcjiezhen_clear").includes(event.player);
					} else if (event.name == "judge") {
						return event.skill == "bagua" && player.getStorage("dcjiezhen_clear").includes(event.player);
					}
					return player.getStorage("dcjiezhen_clear").length > 0;
				},
				logTarget(event, player) {
					if (event.name != "phase") {
						return event.player;
					}
					return player.getStorage("dcjiezhen_clear");
				},
				async content(event, trigger, player) {
					const targets = player.getStorage("dcjiezhen_clear");
					if (trigger.name == "die" && player == trigger.player) {
						for (const target of targets) {
							target.removeSkill("dcjiezhen_blocker");
						}
						player.removeSkill("dcjiezhen_clear");
						return;
					}
					const list = trigger.name == "phase" ? targets.slice(0).sortBySeat() : [trigger.player];
					for (const target of list) {
						const storage = player.getStorage("dcjiezhen_clear");
						if (storage.includes(target)) {
							storage.remove(target);
							target.removeSkill("dcjiezhen_blocker");
							if (target.isIn() && target.countGainableCards(player, "hej") > 0) {
								await player.gainPlayerCard(target, "hej", true);
							}
						}
					}
					player.removeSkill("dcjiezhen_clear");
				},
			},
		},
		derivation: "bazhen",
	}
```

### dczecai 名字:择才
描述: 限定技。每轮结束时，你可令一名其他角色获得〖集智〗直到下一轮结束；若其是本轮内使用过锦囊牌数量唯一最多的角色，则其执行一个额外回合。
```js
dczecai: {
		audio: 2,
		trigger: { global: "roundEnd" },
		limited: true,
		skillAnimation: true,
		animationColor: "soil",
		getMax() {
			const getNum = function (current) {
				var history = current.actionHistory;
				var num = 0;
				for (var i = history.length - 1; i >= 0; i--) {
					for (var j = 0; j < history[i].useCard.length; j++) {
						if (get.type2(history[i].useCard[j].card, false) == "trick") {
							num++;
						}
					}
					if (history[i].isRound) {
						break;
					}
				}
				return num;
			};
			let max = 0,
				current = false,
				targets = game.filterPlayer();
			for (const target of targets) {
				const num = getNum(target);
				if (num > max) {
					max = num;
					current = target;
				} else if (num == max) {
					current = false;
				}
			}
			return current;
		},
		async cost(event, trigger, player) {
			const target = lib.skill.dczecai.getMax();
			let str = "令一名其他角色获得〖集智〗直到下一轮结束";
			if (target && target != player) {
				str += "；若选择的目标为" + get.translation(target) + "，则其获得一个额外的回合";
			}
			event.result = await player
				.chooseTarget(lib.filter.notMe, get.prompt(event.skill), str)
				.set("maximum", event.target)
				.set("ai", function (target) {
					if (target != _status.event.maximum) {
						return 0;
					}
					return get.attitude(_status.event.player, target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const target = event.targets[0];
			await target.addAdditionalSkills("dczecai_effect", "rejizhi");
			target.addTempSkill("dczecai_effect", "roundEnd");
			if (target == lib.skill.dczecai.getMax()) {
				target.insertPhase();
			}
		},
		derivation: "rejizhi",
		subSkill: {
			effect: {
				charlotte: true,
				mark: true,
				marktext: "才",
				intro: { content: "已拥有技能〖集智〗" },
			},
		},
	}
```

### dcyinshi 名字:隐世
描述: 锁定技。①每回合限一次，当你受到伤害时，若此伤害的渠道不为有颜色的牌，则你防止此伤害。②当有因【八卦阵】发起的判定的判定牌生效时，你获得此判定牌。
```js
dcyinshi: {
		audio: 2,
		trigger: { player: "damageBegin" },
		usable: 1,
		filter(event, player) {
			return !event.card || get.color(event.card) == "none";
		},
		forced: true,
		async content(event, trigger, player) {
			trigger.cancel();
		},
		group: "dcyinshi_gain",
		subSkill: {
			gain: {
				audio: "dcyinshi",
				trigger: { global: "judgeEnd" },
				forced: true,
				filter(event, player) {
					return event.skill == "bagua" && event.result.card && get.position(event.result.card, true) == "o";
				},
				async content(event, trigger, player) {
					player.gain(trigger.result.card, "gain2");
				},
			},
		},
	}
```

## dc_gaolan 名字:高览 势力:qun

### xizhen 名字:袭阵
描述: 出牌阶段开始时，你可选择一名其他角色，视为对其使用【杀】或【决斗】。然后当有角色于本阶段内使用或打出牌响应你时，该角色回复1点体力，你摸一张牌（若其满体力，改为两张）。
```js
xizhen: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		direct: true,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && (player.canUse("sha", current, false) || player.canUse("juedou", current, false));
			});
		},
		async content(event, trigger, player) {
			const targetResult = await player
				.chooseTarget(get.prompt("xizhen"), "视为对一名角色使用【杀】或【决斗】", function (card, player, target) {
					return target != player && (player.canUse("sha", target, false) || player.canUse("juedou", target, false));
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					var eff1 = 0,
						eff2 = 0;
					if (player.canUse("sha", target, false)) {
						eff1 = get.effect(target, { name: "sha" }, player, player);
					}
					if (player.canUse("juedou", target, false)) {
						eff2 = get.effect(target, { name: "juedou" }, player, player);
					}
					var effx = Math.max(eff1, eff2);
					if (effx <= 0) {
						return 0;
					}
					if (target.isHealthy()) {
						effx *= 3;
					}
					if (get.attitude(player, target) > 0) {
						effx *= 1.6;
					}
					return effx;
				})
				.forResult();
			if (!targetResult.bool) {
				return;
			}
			const target = targetResult.targets[0];
			player.logSkill("xizhen", target);
			const list = [];
			if (player.canUse("sha", target, false)) {
				list.push("sha");
			}
			if (player.canUse("juedou", target, false)) {
				list.push("juedou");
			}
			let control;
			if (list.length == 1) {
				control = list[0];
			} else {
				const controlResult = await player
					.chooseControl(list)
					.set("prompt", "视为对" + get.translation(target) + "使用…")
					.set("target", target)
					.set("ai", function () {
						var player = _status.event.player,
							target = _status.event.target;
						var eff1 = get.effect(target, { name: "sha" }, player, player),
							eff2 = get.effect(target, { name: "juedou" }, player, player);
						return eff1 > eff2 ? 0 : 1;
					})
					.forResult();
				control = controlResult.control;
			}
			await player.useCard({ name: control, isCard: true }, target, false);
			if (target.isIn()) {
				player.storage.xizhen_effect = target;
				player.addTempSkill("xizhen_effect", "phaseUseAfter");
			}
		},
		subSkill: {
			effect: {
				audio: "xizhen",
				charlotte: true,
				onremove: true,
				trigger: { global: ["useCard", "respond"] },
				logTarget(event, player) {
					return player.storage.xizhen_effect;
				},
				forced: true,
				filter(event, player) {
					return Array.isArray(event.respondTo) && event.respondTo[0] == player && player.storage.xizhen_effect && player.storage.xizhen_effect.isIn();
				},
				async content(event, trigger, player) {
					const target = player.storage.xizhen_effect;
					await target.recover();
					await player.draw(target.isHealthy() ? 2 : 1);
				},
				mark: "character",
				intro: { content: "已指定$为目标" },
			},
		},
	}
```

## guanning 名字:管宁 势力:qun

### dunshi 名字:遁世
描述: 每回合限一次。你可以视为使用或打出一张【杀】/【闪】/【桃】/【酒】，然后当前回合角色于本回合内下一次造成伤害时，你选择两项：⒈防止此伤害。系统从技能名中包含“仁/义/礼/智/信”字样的技能中随机选择三个其未拥有的技能，然后你令当前回合角色获得其中一个技能。⒉从〖遁世〗中删除你本次使用或打出的牌并获得一个“席”。⒊减1点体力上限并摸X张牌（X为你的“席”数）。
```js
dunshi: {
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		usable: 1,
		init(player, skill) {
			if (!player.storage[skill]) {
				player.storage[skill] = [["sha", "shan", "tao", "jiu"], 0];
			}
		},
		hiddenCard(player, name) {
			if (player.storage.dunshi && player.storage.dunshi[0].includes(name) && !player.getStat("skill").dunshi) {
				return true;
			}
			return false;
		},
		marktext: "席",
		mark: true,
		intro: {
			markcount(storage) {
				return storage[1];
			},
			content(storage, player) {
				if (!storage) {
					return;
				}
				var str = "<li>";
				if (!storage[0].length) {
					str += "已无可用牌";
				} else {
					str += "剩余可用牌：";
					str += get.translation(storage[0]);
				}
				str += "<br><li>“席”标记数量：";
				str += storage[1];
				return str;
			},
		},
		filter(event, player) {
			if (event.type == "wuxie") {
				return false;
			}
			var storage = player.storage.dunshi;
			if (!storage || !storage[0].length) {
				return false;
			}
			for (var i of storage[0]) {
				var card = { name: i, isCard: true };
				if (event.filterCard(card, player, event)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				var list = [];
				var storage = player.storage.dunshi;
				for (var i of storage[0]) {
					list.push(["基本", "", i]);
				}
				return ui.create.dialog("遁世", [list, "vcard"], "hidden");
			},
			filter(button, player) {
				var evt = _status.event.getParent();
				return evt.filterCard({ name: button.link[2], isCard: true }, player, evt);
			},
			check(button) {
				var card = { name: button.link[2] },
					player = _status.event.player;
				if (_status.event.getParent().type != "phase") {
					return 1;
				}
				if (card.name == "jiu") {
					return 0;
				}
				if (card.name == "sha" && player.hasSkill("jiu")) {
					return 0;
				}
				return player.getUseValue(card, null, true);
			},
			backup(links, player) {
				return {
					audio: "dunshi",
					filterCard() {
						return false;
					},
					popname: true,
					viewAs: {
						name: links[0][2],
						isCard: true,
					},
					selectCard: -1,
					async precontent(event, trigger, player) {
						player.addTempSkill("dunshi_damage");
						player.storage.dunshi_damage = event.result.card.name;
					},
				};
			},
			prompt(links, player) {
				return "选择【" + get.translation(links[0][2]) + "】的目标";
			},
		},
		ai: {
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				var storage = player.storage.dunshi;
				if (!storage || !storage[0].length) {
					return false;
				}
				if (player.getStat("skill").dunshi) {
					return false;
				}
				switch (tag) {
					case "respondSha":
						return (_status.event.type != "phase" || player == game.me || player.isUnderControl() || player.isOnline()) && storage[0].includes("sha");
					case "respondShan":
						return storage[0].includes("shan");
					case "save":
						if (arg == player && storage[0].includes("jiu")) {
							return true;
						}
						return storage[0].includes("tao");
				}
			},
			order: 2,
			result: {
				player(player) {
					if (_status.event.type == "dying") {
						return get.attitude(player, _status.event.dying);
					}
					return 1;
				},
			},
		},
		initList() {
			var list,
				skills = [],
				banned = [],
				bannedInfo = ["游戏开始时"];
			if (get.mode() == "guozhan") {
				list = [];
				for (var i in lib.characterPack.mode_guozhan) {
					list.push(i);
				}
			} else if (_status.connectMode) {
				list = get.charactersOL();
			} else {
				list = [];
				for (var i in lib.character) {
					if (lib.filter.characterDisabled2(i) || lib.filter.characterDisabled(i)) {
						continue;
					}
					list.push(i);
				}
			}
			for (var i of list) {
				if (i.indexOf("gz_jun") == 0) {
					continue;
				}
				for (var j of lib.character[i][3]) {
					var skill = lib.skill[j];
					if (!skill || skill.zhuSkill || banned.includes(j)) {
						continue;
					}
					if (skill.ai && (skill.ai.combo || skill.ai.neg)) {
						continue;
					}
					const infox = get.skillInfoTranslation(j);
					if (bannedInfo.some(item => infox.includes(item))) {
						continue;
					}
					const info = get.plainText(get.translation(j));
					if ("仁/义/礼/智/信".split("/").some(item => info.includes(item))) {
						skills.add(j);
					}
				}
			}
			_status.dunshi_list = skills;
		},
		subSkill: {
			backup: { audio: "dunshi" },
			damage: {
				audio: "dunshi",
				trigger: { global: "damageBegin2" },
				forced: true,
				charlotte: true,
				filter(event, player) {
					return event.source == _status.currentPhase;
				},
				onremove: true,
				logTarget: "source",
				async content(event, trigger, player) {
					const cardname = player.storage.dunshi_damage;
					player.removeSkill("dunshi_damage");
					const target = trigger.source;
					const card = get.translation(trigger.source),
						card2 = get.translation(cardname),
						card3 = get.translation(trigger.player);
					const list = ["防止即将对" + card3 + "造成的伤害，并令" + card + "获得一个技能名中包含“仁/义/礼/智/信”的技能", "从〖遁世〗中删除【" + card2 + "】并获得一枚“席”", "减1点体力上限，然后摸等同于“席”数的牌"];
					const result = await player
						.chooseButton([
							"遁世：请选择两项",
							[
								list.map((item, i) => {
									return [i, item];
								}),
								"textbutton",
							],
						])
						.set("forced", true)
						.set("selectButton", 2)
						.set("ai", function (button) {
							var player = _status.event.player;
							switch (button.link) {
								case 0:
									if (get.attitude(player, _status.currentPhase) > 0) {
										return 3;
									}
									return 0;
								case 1:
									return 1;
								case 2:
									var num = player.storage.dunshi[1];
									for (var i of ui.selected.buttons) {
										if (i.link == 1) {
											num++;
										}
									}
									if (num > 0 && player.isDamaged()) {
										return 2;
									}
									return 0;
							}
						})
						.forResult();
					const links = result.links.sort();
					for (var i of links) {
						game.log(player, "选择了", "#g【遁世】", "的", "#y选项" + get.cnNumber(i + 1, true));
					}
					if (links.includes(0)) {
						trigger.cancel();
						if (!_status.dunshi_list) {
							lib.skill.dunshi.initList();
						}
						var skills = _status.dunshi_list
							.filter(function (i) {
								return !target.hasSkill(i, null, null, false);
							})
							.randomGets(3);
						if (skills.length) {
							const videoId = lib.status.videoId++;
							var func = function (skills, id, target) {
								var dialog = ui.create.dialog("forcebutton");
								dialog.videoId = id;
								dialog.add("令" + get.translation(target) + "获得一个技能");
								for (var i = 0; i < skills.length; i++) {
									dialog.add('<div class="popup pointerdiv" style="width:80%;display:inline-block"><div class="skill">【' + get.translation(skills[i]) + "】</div><div>" + lib.translate[skills[i] + "_info"] + "</div></div>");
								}
								dialog.addText(" <br> ");
							};
							if (player.isOnline()) {
								player.send(func, skills, videoId, target);
							} else if (player == game.me) {
								func(skills, videoId, target);
							}
							const controlResult = await player
								.chooseControl(skills)
								.set("ai", function () {
									var controls = _status.event.controls;
									if (controls.includes("cslilu")) {
										return "cslilu";
									}
									if (controls.includes("zhichi")) {
										return "zhichi";
									}
									return controls[0];
								})
								.forResult();
							game.broadcastAll("closeDialog", videoId);
							target.addSkills(controlResult.control);
						}
					}
					var storage = player.storage.dunshi;
					if (links.includes(1)) {
						storage[0].remove(cardname);
						storage[1]++;
						player.markSkill("dunshi");
					}
					if (links.includes(2)) {
						player.loseMaxHp();
						if (storage[1] > 0) {
							await player.draw(storage[1]);
						}
					}
				},
			},
		},
	}
```

## dc_jiben 名字:吉本 势力:qun

### xunli 名字:询疠
描述: `锁定技。①当有黑色牌不于${get.poptip("lieyi")}的结算中因弃置而进入弃牌堆后，若X大于0，则你将其中的随机X张牌置于武将牌上作为“疠”（X=min(这些牌的数量，9-Y)，Y=你的“疠”数）。②出牌阶段开始时，你可以用任意张黑色手牌交换等量的“疠”。`
```js
xunli: {
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter"] },
		forced: true,
		filter(event, player) {
			if (event.getParent("lieyi", true)) {
				return false;
			}
			if (event.type != "discard" || event.getlx === false || player.getExpansions("xunli").length >= 9) {
				return false;
			}
			return event.cards.some(card => get.position(card, true) === "d" && get.color(card, event.cards2?.includes(card) ? event.player : false) === "black");
		},
		async content(event, trigger, player) {
			const num = 9 - player.getExpansions("xunli").length;
			if (num <= 0) {
				return;
			}
			const cards = trigger.cards.filter(card => get.position(card, true) == "d" && get.color(card, trigger.cards2?.includes(card) ? trigger.player : false) == "black").randomGets(num);
			const next = player.addToExpansion("gain2", cards);
			next.gaintag.add("xunli");
			await next;
		},
		marktext: "疠",
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		group: "xunli_exchange",
		subSkill: {
			exchange: {
				audio: "xunli",
				trigger: { player: "phaseUseBegin" },
				filter(event, player) {
					return player.hasExpansions("xunli") && player.hasCards("h", card => get.color(card, player) == "black");
				},
				async cost(event, trigger, player) {
					const cards = player.getExpansions("xunli");
					if (!cards.length || !player.countCards("h")) {
						return;
					}
					const next = player.chooseToMove("寻疠：是否交换“疠”和黑色手牌？");
					next.set("list", [
						[get.translation(player) + "（你）的疠", cards],
						["手牌区", player.getCards("h", card => get.color(card, player) == "black")],
					]);
					next.set("filterMove", (from, to) => typeof to != "number");
					next.set("processAI", list => {
						const player = _status.event.player;
						const getv = card => {
							if (get.info(card).toself) {
								return 0;
							}
							return player.getUseValue(card, false);
						};
						const cards = list[0][1].concat(list[1][1]).sort((a, b) => getv(b) - getv(a));
						const cards2 = cards.splice(0, player.getExpansions("xunli").length);
						return [cards2, cards];
					});
					const result = await next.forResult();
					event.result = {
						bool: result?.moved?.length > 0,
						cost_data: result?.moved,
					};
				},
				async content(event, trigger, player) {
					const pushs = event.cost_data[0];
					const gains = event.cost_data[1];
					pushs.removeArray(player.getExpansions("xunli"));
					gains.removeArray(player.getCards("h"));
					if (!pushs.length || pushs.length != gains.length) {
						return;
					}
					const gain = player.addToExpansion(pushs, player, "giveAuto");
					gain.gaintag.add("xunli");
					await gain;
					game.log(player, "将", pushs, "作为“疠”置于武将牌上");
					await player.gain(gains, "gain2");
				},
			},
		},
		ai: { notemp: true },
	}
```

### zhishi 名字:指誓
描述: 结束阶段，你可选择一名角色。当该角色于你的下回合开始前{成为【杀】的目标后或进入濒死状态时}，你可移去任意张“疠”，然后其摸等量的牌。
```js
zhishi: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill))
				.set("ai", target => {
					const player = get.player();
					let att = get.attitude(player, target);
					if (att <= 4) {
						return 0;
					}
					if (target.hasSkillTag("nogain")) {
						att /= 10;
					}
					return att;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.addTempSkill("zhishi_mark", { player: "phaseBegin" });
			player.markAuto("zhishi_mark", [target]);
		},
		ai: {
			combo: "xunli",
			expose: 0.3,
		},
		subSkill: {
			mark: {
				charlotte: true,
				onremove: true,
				mark: "characters",
				intro: { content: "决定帮助$，具体帮不帮另说" },
				trigger: { global: ["dying", "useCardToTargeted"] },
				filter(event, player) {
					if (!player.hasExpansions("xunli")) {
						return false;
					}
					const storage = player.getStorage("zhishi_mark");
					if (event.name == "dying") {
						return storage.includes(event.player);
					}
					return event.card.name == "sha" && storage.includes(event.target);
				},
				async cost(event, trigger, player) {
					const target = get.info(event.skill).logTarget(trigger, player);
					const result = await player
						.chooseButton([get.prompt(event.skill, target), '<div class="text center">弃置任意张“疠”并令其摸等量的牌</div>', player.getExpansions("xunli")], [1, Infinity], "allowChooseAll")
						.set("ai", button => {
							const { player, target } = get.event();
							const att = get.attitude(player, target);
							const card = button.link;
							if (att <= 0) {
								return 0;
							}
							if (target.hp < 1 && target != get.zhu(player)) {
								return 0;
							}
							if (target.hasSkillTag("nogain")) {
								return 0;
							}
							return target.getUseValue(card, false);
						})
						.forResult();
					event.result = {
						bool: result.bool,
						cost_data: result.links,
					};
				},
				logTarget(event, player) {
					return event.name == "dying" ? event.player : event.target;
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					const links = event.cost_data;
					await player.loseToDiscardpile(links);
					await target.draw(links.length);
				},
			},
		},
	}
```

### lieyi 名字:烈医
描述: 出牌阶段限一次。你可以展示所有“疠”并选择一名其他角色，对其使用其中的一张可对其使用的牌（无距离和次数限制）并重复此流程，并将其余的牌置于弃牌堆。然后若其未于此流程中因受到伤害而进入过濒死状态，则你失去1点体力。
```js
lieyi: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasExpansions("xunli") && game.hasPlayer(current => current != player);
		},
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			const { target } = event;
			const cards = player.getExpansions("xunli");
			await player.showCards(cards, `${get.translation(player)}对${get.translation(target)}发动了【烈医】`);
			let bool = false;
			while (true) {
				const cards = player.getExpansions("xunli");
				const cards2 = cards.filter(card => target.isIn() && player.canUse(card, target, false));
				if (cards2.length) {
					const result = await player
						.chooseButton([`请选择你要对${get.translation(target)}使用的一张牌`, cards2])
						.set("ai", button => {
							const { player, target } = get.event();
							return get.effect(target, button.link, player, player);
						})
						.set("target", target)
						.forResult();
					if (result?.bool) {
						const next = player.useCard(result.links[0], target, false);
						await next;
						if (!bool && target.hasHistory("damage", evt => evt.getParent("lieyi") == next.getParent() && evt._dyinged)) {
							bool = true;
						}
						continue;
					}
				}
				if (cards.length) {
					await player.loseToDiscardpile(cards);
				}
				if (!bool) {
					await player.loseHp();
				}
				return;
			}
		},
		ai: {
			order(item, player) {
				return Math.max(get.order({ name: "sha" }), 2) - 0.2;
			},
			result: {
				target(player, target) {
					var cards = player.getExpansions("xunli");
					var effect = 0,
						damage = 0;
					for (var i of cards) {
						if (player.canUse(i, target, false)) {
							effect += get.effect(target, i, player, target);
							damage += get.tag(i, "damage");
						}
					}
					if (damage >= target.hp) {
						return effect;
					}
					if (player.hp > 2 && cards.length > 3) {
						return effect / 3;
					}
					return 0;
				},
			},
			combo: "xunli",
		},
	}
```

## mamidi 名字:马日磾 势力:qun

### bingjie 名字:秉节
描述: 出牌阶段开始时，你可减1点体力上限，然后当你本回合使用【杀】或普通锦囊牌指定其他角色为目标后，其弃置一张牌。若其弃置的牌与你使用的牌颜色相同，其无法响应此牌。
```js
bingjie: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		check(event, player) {
			return (
				player.maxHp > 3 &&
				player.isDamaged() &&
				player.hasCard(function (card) {
					return (
						game.hasPlayer(function (current) {
							return current != player && get.attitude(player, current) < 0 && player.canUse(card, current, null, true) && get.effect(current, card, player, player) > 0;
						}) && player.hasValueTarget(card)
					);
				}, "hs")
			);
		},
		async content(event, trigger, player) {
			await player.loseMaxHp();
			player.addTempSkill("bingjie_effect");
			game.delayx();
		},
		subSkill: {
			effect: {
				audio: "bingjie",
				trigger: { player: "useCardToPlayered" },
				forced: true,
				charlotte: true,
				logTarget: "target",
				filter(event, player) {
					return event.target != player && (event.card.name == "sha" || get.type(event.card, null, false) == "trick") && event.target.countCards("he") > 0;
				},
				async content(event, trigger, player) {
					const result = await trigger.target.chooseToDiscard("he", true).forResult();
					if (result.bool && result.cards.length && get.color(result.cards[0], trigger.target) == get.color(trigger.card)) {
						game.log(trigger.target, "不能响应", trigger.card);
						trigger.directHit.push(trigger.target);
					}
				},
				ai: {
					effect: {
						player_use(card, player, target) {
							if (player !== target && get.itemtype(target) === "player" && (card.name === "sha" || get.type(card, null, false) === "trick") && target.countCards("he") && !target.hasSkillTag("noh")) {
								return [1, 0, 1, -1];
							}
						},
					},
				},
			},
		},
	}
```

### zhengding 名字:正订
描述: 锁定技。当你于回合外使用或打出牌响应其他角色使用的牌时，若这两张牌颜色相同，则你加1点体力上限并回复1点体力。
```js
zhengding: {
		audio: 2,
		trigger: { player: ["useCard", "respond"] },
		forced: true,
		filter(event, player) {
			if (player == _status.currentPhase) {
				return false;
			}
			if (!Array.isArray(event.respondTo)) {
				return false;
			}
			if (player == event.respondTo[0]) {
				return false;
			}
			var color = get.color(event.card);
			if (color == "none") {
				return false;
			}
			return color == get.color(event.respondTo[1]);
		},
		async content(event, trigger, player) {
			player.gainMaxHp();
			await player.recover();
		},
	}
```

## re_dengzhi 名字:邓芝 势力:shu

### jianliang 名字:简亮
描述: 摸牌阶段开始时，若你的手牌数不为全场最多，则你可以令至多两名角色各摸一张牌。
```js
jianliang: {
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !player.isMaxHandcard();
		},
		direct: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt("jianliang"), "令至多两名角色各摸一张牌", [1, 2])
				.set("ai", target => {
					return Math.sqrt(5 - Math.min(4, target.countCards("h"))) * get.attitude(_status.event.player, target);
				})
				.forResult();
			if (result.bool) {
				const targets = result.targets.sortBySeat();
				player.logSkill("jianliang", targets);
				if (targets.length == 1) {
					await targets[0].draw();
				} else {
					await game.asyncDraw(targets);
				}
			}
			game.delayx();
		},
	}
```

### weimeng 名字:危盟
描述: 出牌阶段限一次，你可以获得一名其他角色的至多X张手牌，然后交给其等量的牌（X为你的体力值）。若你给出的牌点数之和：大于得到的牌，则你摸一张牌；小于得到的牌，弃置该角色区域内的一张牌。
```js
weimeng: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => get.info("weimeng").filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return player.hp > 0 && target != player && target.countGainableCards(player, "h") > 0;
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (!target.countGainableCards(player, "h") || player.hp <= 0) {
				return;
			}
			let result = await player.gainPlayerCard(target, "h", true, [1, player.hp]).forResult();
			if (result?.bool && target.isIn()) {
				const num = result.cards.length;
				const number1 = result.cards.reduce((num, card) => (num += get.number(card, player)), 0);
				event.number1 = number1;
				result = await player.chooseToGive(target, "he", true, `危盟：选择交给${get.translation(target)}${get.cnNumber(num)}张牌`, `（已得到牌的点数和：${number1}）`, num).forResult();
				if (result?.bool) {
					const number2 = result.cards.reduce((num, card) => (num += get.number(card, player)), 0);
					event.number2 = number2;
					if (number1 < number2) {
						await player.draw();
					} else if (number1 > number2) {
						await player.discardPlayerCard(target, true, "hej");
					}
				}
			}
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
					return -Math.pow(Math.min(player.hp, target.countCards("h")), 2) / 4;
				},
			},
		},
	}
```

## fengxi 名字:冯熙 势力:wu

### yusui 名字:玉碎
描述: 每回合限一次，当你成为其他角色使用黑色牌的目标后，你可以失去1点体力，然后选择一项：⒈令其将手牌数弃置至与你相同；⒉令其失去Y点体力（Y为其的体力值减去你的体力值，不为正时不可选择）。
```js
yusui: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.player != player && event.player.isIn() && get.color(event.card) == "black";
		},
		logTarget: "player",
		check(event, player) {
			var target = event.player;
			if (player.hp < 3 || get.attitude(player, target) > -3) {
				return false;
			}
			if (player.hp < target.hp) {
				return true;
			}
			if (Math.min(target.countCards("h") - player.countCards("h"), target.countCards("h")) > 3) {
				return true;
			}
			return false;
		},
		usable: 1,
		preHidden: true,
		async content(event, trigger, player) {
			let result;

			// step 0
			await player.loseHp();
			event.target = trigger.player;
			// step 1
			const target = event.target;
			let addIndex = 0;
			const list = [];
			const num = target.countCards("h") - player.countCards("h");
			if (num > 0 && target.countCards("h") > 0) {
				list.push("令其弃置" + get.cnNumber(num) + "张手牌");
			} else {
				addIndex++;
			}
			if (target.hp > player.hp) {
				list.push("令其失去" + get.cnNumber(target.hp - player.hp) + "点体力");
			}
			if (!list.length) {
				return;
			} else if (list.length == 1) {
				result = { index: 0 };
			} else {
				result = await player
					.chooseControl()
					.set("choiceList", list)
					.set("prompt", "令" + get.translation(target) + "执行一项")
					.set("ai", function () {
						const player = _status.event.player;
						const target = _status.event.getParent().target;
						return target.hp - player.hp > Math.min(_status.event.getParent().num, target.countCards("h")) / 2 ? 1 : 0;
					})
					.forResult();
			}
			// step 2
			if (result.index + addIndex == 0) {
				await target.chooseToDiscard(num, true, "h", "allowChooseAll");
			} else {
				await target.loseHp(target.hp - player.hp);
			}
		},
	}
```

### boyan 名字:驳言
描述: 出牌阶段限一次，你可选择一名其他角色。其将手牌摸至体力上限（至多摸至五张），然后其本回合不能使用或打出手牌。
```js
boyan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			await target.drawTo(Math.min(5, target.maxHp));
			target.addTempSkill("boyan_block");
		},
		subSkill: {
			block: {
				mark: true,
				intro: { content: "不能使用或打出手牌" },
				charlotte: true,
				mod: {
					cardEnabled2(card) {
						if (get.position(card) == "h") {
							return false;
						}
					},
				},
			},
		},
		ai: {
			order: (item, player) => {
				if (
					game.hasPlayer(cur => {
						if (player === cur || get.attitude(player, cur) <= 0) {
							return false;
						}
						return Math.min(5, cur.maxHp) - cur.countCards("h") > 2;
					})
				) {
					return get.order({ name: "nanman" }, player) - 0.1;
				}
				return 10;
			},
			result: {
				target(player, target) {
					if (get.attitude(player, target) > 0) {
						return Math.max(0, Math.min(5, target.maxHp) - target.countCards("h"));
					}
					if (
						Math.max(0, Math.min(5, target.maxHp) - target.countCards("h")) <= 1 &&
						target.countCards("h", "shan") &&
						!target.hasSkillTag("respondShan", true, null, true) &&
						player.countCards("h", function (card) {
							return get.tag(card, "respondShan") && player.getUseValue(card, null, true) > 0 && get.effect(target, card, player, player) > 0;
						})
					) {
						return -2;
					}
				},
			},
		},
	}
```

## re_miheng 名字:祢衡 势力:qun

### rekuangcai 名字:狂才
描述: 锁定技。①你于回合内使用牌无距离和次数限制。②弃牌阶段开始时，若你本回合内：未使用过牌，则你本局游戏的手牌上限+1；使用过牌但未造成过伤害，则你本局游戏的手牌上限-1。③结束阶段开始时，你摸X张牌（X为你本回合内造成的伤害且至多为5）。
```js
rekuangcai: {
		audio: 2,
		forced: true,
		trigger: { player: "phaseDiscardBegin" },
		filter(event, player) {
			return !player.getHistory("useCard").length || !player.getHistory("sourceDamage").length;
		},
		async content(event, trigger, player) {
			lib.skill.rekuangcai.change(player, player.getHistory("useCard").length ? -1 : 1);
		},
		mod: {
			targetInRange(card, player) {
				if (player == _status.currentPhase) {
					return true;
				}
			},
			cardUsable(card, player) {
				if (player == _status.currentPhase) {
					return Infinity;
				}
			},
		},
		change(player, num) {
			if (typeof player.storage.rekuangcai_change != "number") {
				player.storage.rekuangcai_change = 0;
			}
			player.storage.rekuangcai_change += num;
			player.addSkill("rekuangcai_change");
		},
		group: "rekuangcai_draw",
		subSkill: {
			draw: {
				audio: "rekuangcai",
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				filter(event, player) {
					return player.getHistory("sourceDamage").length > 0;
				},
				async content(event, trigger, player) {
					player.draw(Math.min(5, player.getStat("damage")));
				},
			},
			change: {
				mod: {
					maxHandcard(player, num) {
						if (typeof player.storage.rekuangcai_change == "number") {
							return num + player.storage.rekuangcai_change;
						}
					},
				},
				charlotte: true,
				mark: true,
				intro: {
					content: num => "手牌上限" + (num < 0 ? "" : "+") + num,
				},
			},
		},
	}
```

### reshejian 名字:舌剑
描述: 每回合限两次。当你成为其他角色使用牌的唯一目标后，你可以弃置至少两张手牌。若如此做，你选择一项：⒈弃置其等量的牌。⒉对其造成1点伤害。
```js
reshejian: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			if (player == event.player || event.targets.length != 1) {
				return false;
			}
			return event.player.isIn() && player.countCards("h") >= 2;
		},
		usable: 2,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("h", [2, Infinity], get.prompt(event.skill, trigger.player), '<div class="text center">弃置至少两张手牌，然后选择一项：<br>⒈弃置其等量的牌。⒉对其造成1点伤害。</div>', "allowChooseAll")
				.set("ai", function (card) {
					if (_status.event.goon && ui.selected.cards.length < 2) {
						return 5.6 - get.value(card);
					}
					return 0;
				})
				.set(
					"goon",
					(function () {
						var target = trigger.player;
						if (get.attitude(player, target) >= 0) {
							return false;
						}
						if (get.damageEffect(target, player, player) > 0) {
							return true;
						}
						if (
							target.countCards("he", function (card) {
								return get.value(card, target) > 6;
							}) >= 2
						) {
							return true;
						}
						return false;
					})()
				)
				.set("chooseonly", true)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const {
				cards,
				targets: [target],
			} = event;
			await player.discard(cards);
			const num = cards.length;
			let result;
			if (!target.isIn()) {
				return;
			} else if (!target.countDiscardableCards(player, "he")) {
				result = { index: 1 };
			} else {
				result = await player
					.chooseControl()
					.set("choiceList", ["弃置" + get.translation(target) + "的" + get.cnNumber(num) + "张牌", "对" + get.translation(target) + "造成1点伤害"])
					.set("ai", function () {
						const player = _status.event.player;
						const eff0 = get.effect(target, { name: "guohe_copy2" }, player, player) * Math.min(1.7, target.countCards("he"));
						const eff1 = get.damageEffect(target, player, player);
						return eff0 > eff1 ? 0 : 1;
					})
					.forResult();
			}
			if (result?.index == 0) {
				await player.discardPlayerCard(target, num, true, "he", "allowChooseAll");
			} else if (result?.index == 1) {
				await target.damage();
			}
		},
	}
```

## re_chendeng 名字:陈登 势力:qun

### refuyuan 名字:扶援
描述: 一名角色成为【杀】的目标后，若其本回合内没有成为过其他红色牌的目标，则你可以令其摸一张牌。
```js
refuyuan: {
		audio: 2,
		trigger: { global: "useCardToTargeted" },
		logTarget: "target",
		filter(event, player) {
			return (
				event.card.name == "sha" &&
				event.target.isIn() &&
				!game.hasPlayer2(function (current) {
					return current.hasHistory("useCard", function (evt) {
						return evt.card != event.card && get.color(evt.card, false) == "red" && evt.targets && evt.targets.includes(event.target);
					});
				})
			);
		},
		check(event, player) {
			return get.attitude(player, event.target) > 0;
		},
		async content(event, trigger, player) {
			trigger.target.draw();
		},
	}
```

### reyingshui 名字:营说
描述: 出牌阶段限一次，你可将一张牌交给攻击范围内的一名其他角色，然后其选择一项：①交给你至少两张装备牌。②受到你对其造成的1点伤害。
```js
reyingshui: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("he") > 0 && game.hasPlayer(current => player.inRange(current));
		},
		position: "he",
		filterCard: true,
		filterTarget(card, player, target) {
			return player.inRange(target);
		},
		discard: false,
		lose: false,
		delay: false,
		check(card) {
			if (get.type(card) == "equip") {
				return 3 - get.value(card);
			}
			return 6.5 - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.give(cards, target);
			const next = target.chooseCard("he", [2, Infinity], "交给" + get.translation(player) + "至少两张装备牌，否则受到1点伤害", { type: "equip" }, "allowChooseAll");
			if (get.damageEffect(target, player, target) >= 0) {
				next.set("ai", () => -1);
			} else {
				next.set("ai", card => (ui.selected.cards.length < 2 ? 6 - get.value(card) : 0));
			}
			const result = await next.forResult();
			if (result.bool) {
				await target.give(result.cards, player);
			} else {
				await target.damage("nocard");
			}
		},
		ai: {
			order: 5,
			tag: {
				damage: 0.5,
			},
			result: {
				target: -1.5,
			},
		},
	}
```

### rewangzu 名字:望族
描述: 每回合限一次。当你受到其他角色造成的伤害时，你可随机弃置一张手牌，令此伤害-1。若你所在阵营的存活角色数是全场最多的，则你可以自行选择弃置的牌。
```js
rewangzu: {
		audio: 2,
		trigger: { player: "damageBegin1" },
		filter(event, player) {
			return event.source && player != event.source && player.hasCard(card => lib.filter.cardDiscardable(card, player, "rewangzu"), "h");
		},
		usable: 1,
		async cost(event, trigger, player) {
			var num = player.getFriends().length;
			if (
				!game.hasPlayer(function (current) {
					return current != player && current.getFriends().length > num;
				})
			) {
				event.result = await player
					.chooseToDiscard("h", get.prompt(event.skill), "弃置一张手牌并令伤害-1", "chooseonly")
					.set("ai", function (card) {
						return 7 - get.value(card);
					})
					.forResult();
			} else {
				event.result = await player.chooseBool(get.prompt(event.skill), "随机弃置一张手牌并令伤害-1").forResult();
			}
		},
		async content(event, trigger, player) {
			if (!event.cards || !event.cards.length) {
				const cards = player.getCards("h", card => lib.filter.cardDiscardable(card, player, "rewangzu"));
				if (cards.length) {
					await player.discard(cards.randomGet());
				}
			} else {
				await player.discard(event.cards);
			}
			trigger.num--;
		},
	}
```

## wanniangongzhu 名字:万年公主 势力:qun

### zhenge 名字:枕戈
描述: 准备阶段，你可以选择一名角色。该角色本局游戏的攻击范围+1（至多+5）。然后若除其外的所有角色都在该角色的攻击范围内，则你可以令其视为对另一名角色使用一张【杀】。
```js
zhenge: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		direct: true,
		async content(event, trigger, player) {
			const targetResult = await player
				.chooseTarget(get.prompt("zhenge"), "令一名角色的攻击范围+1")
				.set("ai", function (target) {
					var player = _status.event.player,
						att = get.attitude(player, target);
					if (att > 0) {
						if (!target.hasMark("zhenge_effect")) {
							att *= 1.5;
						}
						if (
							!game.hasPlayer(function (current) {
								return get.distance(target, current, "attack") > 2;
							})
						) {
							const usf = Math.max(
								...game.filterPlayer().map(current => {
									if (target.canUse("sha", current, false)) {
										return get.effect(current, { name: "sha" }, target, player);
									}
									return 0;
								})
							);
							return att + usf;
						}
						return att;
					}
					return 0;
				})
				.forResult();
			if (!targetResult.bool) return;
			const target = targetResult.targets[0];
			player.logSkill("zhenge", target);
			target.addSkill("zhenge_effect");
			if (target.countMark("zhenge_effect") < 5) {
				target.addMark("zhenge_effect", 1, false);
			}
			if (
				!game.hasPlayer(current => {
					return current != target && !target.inRange(current);
				})
			) {
				const shaTargetResult = await player
					.chooseTarget("是否令" + get.translation(target) + "视为对另一名角色使用【杀】？", function (card, player, target) {
						return _status.event.source.canUse("sha", target);
					})
					.set("source", target)
					.set("ai", function (target) {
						var evt = _status.event;
						return get.effect(target, { name: "sha" }, evt.source, evt.player);
					})
					.forResult();
				if (shaTargetResult.bool) {
					await target.useCard({ name: "sha", isCard: true }, shaTargetResult.targets[0], false);
				}
				await game.delayx();
				return;
			}
			await game.delayx();
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				mod: {
					attackRange(player, num) {
						return num + player.countMark("zhenge_effect");
					},
				},
				intro: { content: "攻击范围+#" },
			},
		},
	}
```

### xinghan 名字:兴汉
描述: 锁定技，每回合的第一张【杀】造成伤害后，若此【杀】的使用者成为过〖枕戈〗的目标，则你摸一张牌。若你的手牌数不是全场唯一最多的，则改为摸X张牌（X为该角色的攻击范围且最多为5）。
```js
xinghan: {
		audio: 2,
		init(player) {
			player.addSkill("xinghan_count");
		},
		onremove(player) {
			player.removeSkill("xinghan_count");
		},
		trigger: { global: "damageSource" },
		forced: true,
		filter(event, player) {
			return event.card && event.card == player.storage.xinghan_temp && event.source && event.source.hasMark("zhenge_effect");
		},
		logTarget: "source",
		async content(event, trigger, player) {
			player.draw(player.isMaxHandcard(true) ? 1 : Math.min(5, trigger.source.getAttackRange()));
		},
		subSkill: {
			count: {
				trigger: { global: "useCard1" },
				forced: true,
				charlotte: true,
				popup: false,
				firstDo: true,
				filter(event, player) {
					return (
						event.card.name == "sha" &&
						!game.hasPlayer2(function (current) {
							return current.hasHistory("useCard", function (evt) {
								return evt != event && evt.card.name == "sha";
							});
						})
					);
				},
				async content(event, trigger, player) {
					player.addTempSkill("xinghan_temp");
					player.storage.xinghan_temp = trigger.card;
				},
			},
			temp: { onremove: true },
		},
		ai: { combo: "zhenge" },
	}
```

## re_xunchen 名字:荀谌 势力:qun

### refenglve 名字:锋略
描述: 出牌阶段限一次，你可以和一名其他角色进行拼点。若你赢，你获得其区域里的两张牌；若平局，则你获得你的拼点牌且令此技能于本阶段内的发动次数上限+1；若你输，其获得你的拼点牌。
```js
refenglve: {
		audio: 2,
		enable: "phaseUse",
		usable(skill, player) {
			return 1 + player.countMark("refenglve_add");
		},
		filter(event, player) {
			return (
				player.countCards("h") > 0 &&
				!player.hasSkillTag("noCompareSource") &&
				game.hasPlayer(function (current) {
					return current != player && current.countCards("h") > 0 && !current.hasSkillTag("noCompareTarget");
				})
			);
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0 && !target.hasSkillTag("noCompareTarget");
		},
		async content(event, trigger, player) {
			const { target } = event;
			let result;

			// step 0
			result = await player.chooseToCompare(target).forResult();
			// step 1
			if (result.bool) {
				if (!target.countCards("hej")) {
					return;
				} else {
					await player.gainPlayerCard(target, true, "hej", 2, "获得" + get.translation(target) + "区域里的两张牌");
				}
			} else if (result.tie) {
				player.addTempSkill(event.name + "_add", "phaseUseAfter");
				player.addMark(event.name + "_add", 1, false);
				if (get.position(result.player, true) == "d") {
					await player.gain(result.player, "gain2");
				}
			} else {
				if (get.position(result.player, true) == "d") {
					await target.gain(result.player, "gain2");
				}
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
		subSkill: {
			add: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

### anyong 名字:暗涌
描述: 当一名角色于其回合内第一次造成伤害后，若伤害值为1，则你可弃置一张牌，并对受伤角色造成1点伤害。
```js
anyong: {
		audio: 2,
		trigger: { global: "damageSource" },
		direct: true,
		filter(event, player) {
			return (
				event.source &&
				event.source == _status.currentPhase &&
				event.num == 1 &&
				// event.player != event.source &&
				event.player.isIn() &&
				player.countCards("he") > 0 &&
				event.source
					.getHistory("sourceDamage", function (evt) {
						return evt.player != event.source;
					})
					.indexOf(event) == 0
			);
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseToDiscard("he", get.prompt("anyong", trigger.player), "弃置一张牌并对其造成1点伤害")
				.set("goon", get.damageEffect(trigger.player, player, player) > 0)
				.set("ai", function (card) {
					if (_status.event.goon) {
						return 7 - get.value(card);
					}
					return 0;
				})
				.set("logSkill", ["anyong", trigger.player])
				.forResult();
			if (result.bool) {
				await trigger.player.damage();
			}
		},
	}
```

## re_kanze 名字:阚泽 势力:wu

### xiashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rekuanshi 名字:宽释
描述: 结束阶段，你可以选择一名角色。你获得如下效果直到你下回合开始：每回合限一次，当其于一回合内受到第2点伤害后，其回复1点体力。
```js
rekuanshi: {
		audio: "kuanshi",
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill))
				.set("ai", target => {
					let att = get.attitude(get.player(), target);
					if (target.hp < 3) {
						att /= 1.5;
					}
					return att;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const [target] = event.targets;
			player.addTempSkill(event.name + "_effect", { player: "phaseBegin" });
			player.markAuto(event.name + "_effect", [target]);
			await game.delayx();
		},
		subSkill: {
			effect: {
				charlotte: true,
				audio: "kuanshi",
				onremove: true,
				intro: { content: "每回合限一次，当$于一回合内受到第2点伤害后，其回复1点体力。" },
				trigger: { global: "damageEnd" },
				filter(event, player) {
					if (!player.getStorage("rekuanshi_effect").includes(event.player) || event.player.isHealthy()) {
						return false;
					}
					let history = event.player.getHistory("damage", null, event),
						num = 0;
					for (const evt of history) {
						if (evt.rekuanshi) {
							return false;
						}
						num += evt.num;
					}
					return num > 1 && num - event.num < 2;
				},
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					trigger.rekuanshi = true;
					await trigger.player.recover();
				},
			},
		},
	}
```

## lvlingqi 名字:吕玲绮 势力:qun

### guowu 名字:帼武
描述: 出牌阶段开始时，你可以展示全部手牌，根据你展示的类型数，你获得对应效果：至少一类，从弃牌堆获得一张【杀】；至少两类，此阶段使用牌无距离限制；至少三类，此阶段使用【杀】或普通锦囊牌可以多指定至多两个目标。
```js
guowu: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		preHidden: true,
		async content(event, trigger, player) {
			const hs = player.getCards("h");
			await player.showCards(hs, get.translation(player) + "发动了【帼武】");
			const list = [];
			for (const c of hs) {
				list.add(get.type2(c, player));
				if (list.length >= 3) {
					break;
				}
			}
			if (list.length >= 1) {
				const card = get.discardPile(i => i.name == "sha");
				if (card) {
					await player.gain(card, "gain2");
				}
			}
			if (list.length >= 2) {
				player.addTempSkill("guowu_dist", "phaseUseAfter");
			}
			if (list.length >= 3) {
				player.addTempSkill("guowu_add", "phaseUseAfter");
			}
		},
		subSkill: {
			dist: {
				charlotte: true,
				mod: { targetInRange: () => true },
			},
			used: { charlotte: true },
			add: {
				audio: "guowu",
				charlotte: true,
				trigger: { player: "useCard1" },
				direct: true,
				filter(event, player) {
					var info = get.info(event.card, false);
					if (info.allowMultiple == false) {
						return false;
					}
					if (event.card.name != "sha" && (info.type != "trick" || get.mode() == "guozhan" || player.hasSkill("guowu_used"))) {
						return false;
					}
					if (event.targets && !info.multitarget) {
						if (
							game.hasPlayer(function (current) {
								return !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, player, current) && lib.filter.targetInRange(event.card, player, current);
							})
						) {
							return true;
						}
					}
					return false;
				},
				async content(event, trigger, player) {
					let result;

					// step 0
					const num = game.countPlayer(current => {
						return !trigger.targets.includes(current) && lib.filter.targetEnabled2(trigger.card, player, current) && lib.filter.targetInRange(trigger.card, player, current);
					});
					result = await player
						.chooseTarget("帼武：是否为" + get.translation(trigger.card) + "增加" + (num > 1 ? "至多两个" : "一个") + "目标？", [1, Math.min(2, num)], function (card, player, target) {
							const trigger = _status.event.getTrigger();
							card = trigger.card;
							return !trigger.targets.includes(target) && lib.filter.targetEnabled2(card, player, target) && lib.filter.targetInRange(card, player, target);
						})
						.set("ai", function (target) {
							const player = _status.event.player;
							const card = _status.event.getTrigger().card;
							return get.effect(target, card, player, player);
						})
						.forResult();
					// step 1
					if (!result.bool) {
						return;
					}

					if (player != game.me && !player.isOnline()) {
						await game.delayx();
					}
					// step 2
					const targets = result.targets.sortBySeat();
					player.logSkill("guowu_add", targets);
					trigger.targets.addArray(targets);
					if (get.mode() == "guozhan") {
						player.addTempSkill("guowu_used", "phaseUseAfter");
					}
				},
			},
		},
	}
```

### zhuangrong 名字:妆戎
描述: 觉醒技，一名角色的回合结束时，若你的体力值或手牌数为1，你减1点体力上限并回复体力至上限，将手牌摸至体力上限，然后获得〖神威〗和〖无双〗。
```js
zhuangrong: {
		derivation: ["llqshenwei", "wushuang"],
		audio: 2,
		trigger: { global: "phaseEnd" },
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "gray",
		filter(event, player) {
			return player.hp == 1 || player.countCards("h") == 1;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			if (player.maxHp > player.hp) {
				await player.recover(player.maxHp - player.hp);
			}
			await player.drawTo(Math.min(5, player.maxHp));
			await player.addSkills(["llqshenwei", "wushuang"]);
		},
	}
```

## zhanghu 名字:张虎 势力:wei

### cuijian 名字:摧坚
描述: 出牌阶段限一次，你可以选择一名有手牌的其他角色。若其手牌中有【闪】，则其将所有【闪】和防具牌交给你，然后你交给其等量的牌。
```js
cuijian: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.cuijian.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const { target } = event;
			let result;
			let num;

			// step 0
			const hs = target.getCards("h", "shan");
			if (hs.length) {
				hs.addArray(target.getCards("he", card => get.subtype(card) == "equip2"));
				await player.gain(hs, target, "give", "bySelf");
				if (player.hasMark("zhtongyuan_basic")) {
					return;
				} else {
					num = hs.length;
					event.num = num;
				}
			} else {
				if (player.hasMark("zhtongyuan_trick")) {
					await player.draw(2);
				}
				return;
			}
			// step 1
			const hs2 = player.getCards("he");
			if (!hs2.length || !target.isIn()) {
				return;
			} else if (hs2.length <= num) {
				result = { bool: true, cards: hs2 };
			} else {
				result = await player.chooseCard("he", true, "选择交给" + get.translation(target) + get.cnNumber(num) + "张牌", num).forResult();
			}
			// step 2
			if (result.bool && result.cards && result.cards.length) {
				await player.give(result.cards, target);
			}
		},
		ai: {
			order: 4,
			result: {
				player(player, target) {
					if (!target.countCards("h", "shan")) {
						return player.hasMark("zhtongyuan_trick") ? 2 : 0;
					}
					return 0;
				},
				target(player, target) {
					if (target.countCards("h", "shan")) {
						var num = -target.countCards("h") / 2;
						var card = target.getEquip(2);
						if (card) {
							num -= get.value(card, target) / 2;
						}
						return num;
					}
					return -0.01;
				},
			},
		},
	}
```

### zhtongyuan 名字:同援
描述: 锁定技。①当你使用红色锦囊牌后，你于〖摧坚〗后增加“若其手牌中没有【闪】，则你摸两张牌”；②当你使用或打出红色基本牌后，你删除〖摧坚〗中的“，然后你交给其等量的牌”。③当你使用红色的普通锦囊牌/基本牌时，若你已发动过〖摧坚①〗和〖摧坚②〗，则此牌不可被响应/可额外增加一个目标。
```js
zhtongyuan: {
		audio: "tongyuan",
		trigger: { player: ["useCardAfter", "respondAfter"] },
		forced: true,
		filter(event, player) {
			var type = get.type2(event.card, false);
			return (type == "basic" || type == "trick") && get.color(event.card, false) == "red" && !player.hasMark("zhtongyuan_" + type);
		},
		async content(event, trigger, player) {
			var type = get.type2(trigger.card, false);
			if (!player.hasMark("zhtongyuan_" + type)) {
				player.addMark("zhtongyuan_" + type, 1, false);
				game.log(player, "修改了技能", "#g【摧坚】");
			}
		},
		group: ["zhtongyuan_basic", "zhtongyuan_trick"],
		subSkill: {
			basic: {
				trigger: { player: "useCard2" },
				direct: true,
				locked: true,
				filter(event, player) {
					if (!player.hasMark("zhtongyuan_basic") || !player.hasMark("zhtongyuan_trick")) {
						return false;
					}
					var card = event.card;
					if (get.color(card, false) != "red" || get.type(card, null, false) != "basic") {
						return false;
					}
					var info = get.info(card);
					if (info.allowMultiple == false) {
						return false;
					}
					if (event.targets && !info.multitarget) {
						if (
							game.hasPlayer(function (current) {
								return !event.targets.includes(current) && lib.filter.targetEnabled2(card, player, current);
							})
						) {
							return true;
						}
					}
					return false;
				},
				async content(event, trigger, player) {
					let result;
					const prompt2 = "为" + get.translation(trigger.card) + "增加一个目标";
					result = await player
						.chooseTarget(get.prompt("zhtongyuan"), (card, currentPlayer, target) => {
							return !trigger.targets.includes(target) && lib.filter.targetEnabled2(trigger.card, currentPlayer, target);
						})
						.set("prompt2", prompt2)
						.set("ai", target => get.effect(target, trigger.card, player, player))
						.set("card", trigger.card)
						.set("targets", trigger.targets)
						.forResult();
					if (!result.bool) {
						return;
					}
					if (!event.isMine() && !event.isOnline()) {
						game.delayx();
					}
					event.targets = result.targets;
					if (event.targets) {
						player.logSkill("zhtongyuan", event.targets);
						trigger.targets.addArray(event.targets);
					}
				},
			},
			trick: {
				audio: "zhtongyuan",
				trigger: { player: "useCard" },
				forced: true,
				filter(event, player) {
					if (!player.hasMark("zhtongyuan_basic") || !player.hasMark("zhtongyuan_trick")) {
						return false;
					}
					var card = event.card;
					return get.color(card, false) == "red" && get.type(card, null, false) == "trick";
				},
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.filterPlayer());
					game.log(trigger.card, "不可被响应");
				},
			},
		},
		ai: {
			combo: "zhtongyuan",
		},
	}
```

## luyusheng 名字:陆郁生 势力:wu

### zhente 名字:贞特
描述: 每回合限一次，当你成为其他角色使用基本牌或普通锦囊牌的目标后，你可令使用者选择一项：1.本回合不能再使用与此牌颜色相同的牌；2.此牌对你无效。
```js
zhente: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		logTarget: "player",
		usable: 1,
		preHidden: true,
		filter(event, player) {
			var color = get.color(event.card);
			if (player == event.player || event.player.isDead() || color == "none" || (get.mode() == "guozhan" && color != "black")) {
				return false;
			}
			var type = get.type(event.card);
			return type == "basic" || type == "trick";
		},
		check(event, player) {
			return !event.excluded.includes(player) && get.effect(player, event.card, event.player, player) < 0;
		},
		async content(event, trigger, player) {
			const result = await trigger.player
				.chooseControl()
				.set("choiceList", ["本回合内不能再使用" + get.translation(get.color(trigger.card)) + "牌", "令" + get.translation(trigger.card) + "对" + get.translation(player) + "无效"])
				.set("prompt", get.translation(player) + "发动了【贞特】，请选择一项")
				.set("ai", function () {
					var player = _status.event.player;
					var target = _status.event.getParent().player;
					var card = _status.event.getTrigger().card,
						color = get.color(card);
					if (get.effect(target, card, player, player) <= 0) {
						return 1;
					}
					var hs = player.countCards("h", function (card) {
						return get.color(card, player) == color && player.hasValueTarget(card, null, true);
					});
					if (!hs.length) {
						return 0;
					}
					if (hs > 1) {
						return 1;
					}
					return Math.random() > 0.5 ? 0 : 1;
				})
				.forResult();
			if (result.index == 0) {
				trigger.player.addTempSkill("zhente2");
				trigger.player.storage.zhente2.add(get.color(trigger.card));
				trigger.player.markSkill("zhente2");
			} else {
				trigger.excluded.add(player);
			}
		},
	}
```

### zhiwei 名字:至微
描述: 游戏开始时/准备阶段，若场上没有因此法被选择过的角色存活，则你选择一名其他角色。该角色造成伤害后，你摸一张牌，该角色受到伤害后，你随机弃置一张手牌。你弃牌阶段弃置的牌均被该角色获得。
```js
zhiwei: {
		audio: 2,
		trigger: {
			player: ["enterGame", "showCharacterAfter", "phaseZhunbeiBegin"],
			global: ["phaseBefore"],
		},
		direct: true,
		filter(event, player, name) {
			if (player.hasSkill("zhiwei2")) {
				return false;
			}
			if (!game.hasPlayer(current => current != player)) {
				return false;
			}
			if (get.mode() == "guozhan") {
				return (
					event.name == "showCharacter" &&
					event.toShow.some(name => {
						return get.character(name, 3).includes("zhiwei");
					})
				);
			}
			return event.name != "showCharacter" && (name != "phaseBefore" || game.phaseNumber == 0);
		},
		async content(event, trigger, player) {
			let result;

			result = await player
				.chooseTarget("请选择【至微】的目标", "选择一名其他角色。该角色造成伤害后，你摸一张牌，该角色受到伤害后，你随机弃置一张手牌。你弃牌阶段弃置的牌均被该角色获得。", true, lib.filter.notMe)
				.set("ai", target => {
					const att = get.attitude(_status.event.player, target);
					if (att > 0) {
						return 1 + att;
					}
					return Math.random();
				})
				.forResult();
			if (result.bool) {
				const target = result.targets[0];
				player.logSkill("zhiwei", target);
				player.storage.zhiwei2 = target;
				player.addSkill("zhiwei2");
			}
		},
	}
```

## huaxin 名字:华歆 势力:wei

### spwanggui 名字:望归
描述: ①当你受到伤害后，你可以摸一张牌，或和一名势力相同的其他角色各摸一张牌；②每回合限一次，当你造成伤害后，你可以对一名与你势力不同的角色造成1点伤害。
```js
spwanggui: {
		audio: "wanggui",
		trigger: { source: "damageSource" },
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.group != player.group;
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "对一名势力不同的其他角色造成1点伤害", function (card, player, target) {
					return target.group != player.group;
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					return get.damageEffect(target, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			target.damage();
		},
		group: "spwanggui_draw",
		subSkill: {
			draw: {
				audio: "wanggui",
				trigger: { player: "damageEnd" },
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget(get.prompt("spwanggui"), "令自己摸一张牌，或和一名势力相同的其他角色各摸一张牌", function (card, player, target) {
							return target.group == player.group;
						})
						.set("ai", function (target) {
							var player = _status.event.player,
								att = get.attitude(player, target);
							if (target != player) {
								att *= 2;
							}
							if (target.hasSkillTag("nogain")) {
								att /= 1.7;
							}
							return att;
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					if (player == target) {
						await player.draw();
						return;
					}

					const list = [player, target].sortBySeat();
					await game.asyncDraw(list);
					await game.delayx();
				},
			},
		},
	}
```

### xibing 名字:息兵
描述: 每回合限一次，当其他角色于其出牌阶段内使用黑色【杀】或黑色普通锦囊牌指定唯一角色为目标后，你可令该角色将手牌摸至当前体力值（至多摸至五张）。若其因此摸牌，其本回合不能再使用牌。
```js
xibing: {
		audio: 2,
		trigger: { global: "useCardToPlayered" },
		filter(event, player) {
			if (player == event.player || event.targets.length != 1) {
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
			return true;
		},
		usable: 1,
		logTarget: "player",
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
		preHidden: true,
		async content(event, trigger, player) {
			const num = Math.min(5, trigger.player.hp) - trigger.player.countCards("h");
			if (num > 0) {
				trigger.player.draw(num);
				trigger.player.addTempSkill("xibing_banned");
			}
		},
		subSkill: {
			banned: {
				mod: {
					cardEnabled(card) {
						return false;
					},
					cardSavable(card) {
						return false;
					},
				},
			},
		},
	}
```

## mengyou 名字:孟优 势力:qun

### manyi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcmanzhi 名字:蛮智
描述: ①准备阶段，你可以选择一名其他角色并选择一项：1.令其交给你两张牌，然后其视为使用一张无距离限制的【杀】；2.获得其区域内至多两张牌，然后交给其等量的牌并摸一张牌。②结束阶段，若你的体力值与本回合准备阶段时的体力值相等，你可以执行你未于本回合执行过的〖蛮智①〗的分支。
```js
dcmanzhi: {
		audio: 2,
		trigger: { player: ["phaseZhunbeiBegin", "phaseJieshuBegin"] },
		filter(event, player) {
			if (event.name == "phaseJieshu") {
				var del = 0;
				game.getGlobalHistory("changeHp", evt => {
					if (evt.player != player) {
						return;
					}
					for (var phase of lib.phaseName) {
						var evtx = evt.getParent(phase);
						if (evtx && evtx.name == phase) {
							del += evt.changedHp;
							break;
						}
					}
				});
				if (del != 0) {
					return false;
				}
			}
			return game.hasPlayer(current => {
				if (current == player) {
					return false;
				}
				return (!player.hasSkill("dcmanzhi_1") && current.countCards("he") >= 1) || (!player.hasSkill("dcmanzhi_2") && current.countCards("hej"));
			});
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseButtonTarget({
					createDialog: [
						`###${get.prompt(event.skill)}###<div class='text center'>你可以选择一项并选择一名其他角色…</div>`,
						[
							[
								["give", "令其交给你两张牌，然后其视为使用一张无距离限制的【杀】"],
								["gain", "你获得其区域内的至多两张牌，然后交给其等量的牌并摸一张牌"],
							],
							"textbutton",
						],
					],
					filterButton(button) {
						const player = get.player();
						const trigger = get.event().getTrigger();
						const chosen = [player.hasSkill("dcmanzhi_1"), player.hasSkill("dcmanzhi_2")];
						if (button.link === "give") {
							return game.hasPlayer(current => current != player && current.countCards("he") >= 2 && (!chosen[0] || trigger.name == "phaseZhunbei"));
						}
						return game.hasPlayer(current => current != player && current.hasCards("hej") && (!chosen[1] || trigger.name == "phaseZhunbei"));
					},
					filterTarget(card, player, target) {
						if (!ui.selected.buttons.length || player == target) {
							return false;
						}
						const trigger = get.event().getTrigger();
						const chosen = [player.hasSkill("dcmanzhi_1"), player.hasSkill("dcmanzhi_2")];
						const link = ui.selected.buttons[0].link;
						if (link === "give") {
							return target.countCards("he") >= 2 && (!chosen[0] || trigger.name == "phaseZhunbei");
						}
						return target.hasCards("hej") && (!chosen[1] || trigger.name == "phaseZhunbei");
					},
					ai1(button) {
						const player = get.player();
						const link = button.link;
						const trigger = get.event().getTrigger();
						if (link == "gain") {
							if (trigger.name == "phaseZhunbei" && !player.hasShan() && !game.hasPlayer(current => current != player && current.countCards("he") >= 2 && get.attitude(player, current) > 0)) {
								return 2.5;
							}
							return 1.5;
						} else {
							if (
								game.hasPlayer(current => {
									const att = get.attitude(player, current);
									return att > 0 && current.getUseValue({ name: "sha" }, false) > 5 && current.countCards("he") >= 4;
								})
							) {
								return 2;
							}
							if (player.hasShan() || player.getHp() >= 2) {
								return 1;
							}
							return 0;
						}
					},
					ai2(target) {
						const player = get.player();
						const trigger = get.event().getTrigger();
						const link = ui.selected.buttons[0].link;
						const att = get.attitude(player, target);
						if (link == "give") {
							if (att > 0 && target.getUseValue({ name: "sha" }, false) > 5 && target.countCards("he") >= 4) {
								return 2;
							}
							if (att < 0 && (target.getUseValue({ name: "jiu" }, false) <= 5 || player.getHp() >= 2)) {
								return 1;
							}
						}
						return 1 - att;
					},
				})
				.forResult();
			event.result = {
				bool: result.bool,
				targets: result.targets,
				cost_data: result.links,
			};
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (event.cost_data[0] == "give") {
				player.addTempSkill("dcmanzhi_1");
				const num = Math.min(2, target.countCards("he"));
				if (!num) {
					return;
				}
				const result = await target.chooseToGive(player, "he", true, num, `蛮智：请交给${get.translation(player)}${get.cnNumber(num)}张牌`).forResult();
				if (!result?.bool) {
					return;
				}
				await target.chooseUseTarget("sha", true, "nodistance");
			} else {
				player.addTempSkill("dcmanzhi_2");
				let result = await player.gainPlayerCard(target, "hej", [1, 2], true).forResult();
				if (!result?.bool || !target.isIn()) {
					return;
				}
				const num = result.cards.length;
				const hs = player.getCards("he");
				if (!hs.length) {
					return;
				}
				result = await player.chooseToGive(target, "he", true, num, `交给${get.translation(target)}${get.cnNumber(num)}张牌`).forResult();
				if (result?.bool) {
					await player.draw();
				}
			}
		},
		subSkill: {
			1: { charlotte: true },
			2: { charlotte: true },
		},
	}
```

## liuyong 名字:刘永 势力:shu

### zhuning 名字:诛佞
描述: 出牌阶段限一次。你可将任意张牌交给一名其他角色（称为“隙”），然后可视为使用一张具有伤害标签的基本牌/锦囊牌（不计入次数限制）。若你以此法使用的牌未造成伤害，则你将〖诛佞〗于本阶段内改为“限两次”。
```js
zhuning: {
		audio: 2,
		enable: "phaseUse",
		usable(skill, player) {
			return 1 + (player.hasSkill(skill + "_rewrite", null, null, false) ? 1 : 0);
		},
		filter(event, player) {
			return player.countCards("he") && game.hasPlayer(current => player != current);
		},
		filterCard: true,
		position: "he",
		filterTarget: lib.filter.notMe,
		selectCard: [1, Infinity],
		delay: false,
		lose: false,
		discard: false,
		allowChooseAll: true,
		check(card) {
			if (ui.selected.cards.length && ui.selected.cards[0].name == "du") {
				return 0;
			}
			if (!ui.selected.cards.length && card.name == "du") {
				return 20;
			}
			var player = get.owner(card);
			if (ui.selected.cards.length >= Math.max(1, player.countCards("h") - player.hp)) {
				return 0;
			}
			return 10 - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			const next = player.give(cards, target);
			next.gaintag.add("fengxiang_tag");
			await next;
			const list = get.inpileVCardList(info => {
				const card = { name: info[2], nature: info[3], isCard: true };
				if (!["basic", "trick"].includes(get.type(info[2])) || !get.tag(card, "damage")) {
					return false;
				}
				return player.hasUseTarget(card);
			});
			if (!list.length) {
				return;
			}
			const result = await player
				.chooseButton(["是否视为使用一张伤害牌？", [list, "vcard"]])
				.set("ai", button => {
					return get.player().getUseValue({ name: button.link[2], nature: button.link[3] });
				})
				.forResult();
			if (!result?.links?.length) {
				return;
			}
			await player.chooseUseTarget({ name: result.links[0][2], nature: result.links[0][3], isCard: true }, true, false);
			if (
				!player.hasHistory("sourceDamage", evt => {
					if (!evt.card) {
						return false;
					}
					const evtx = evt.getParent("useCard");
					return evtx.card == evt.card && evtx.getParent(2) == event;
				})
			) {
				player.addTempSkill(event.name + "_rewrite", "phaseAnyAfter");
			}
		},
		subSkill: { rewrite: { charlotte: true } },
		ai: {
			fireAttack: true,
			order: 4,
			result: {
				target(player, target) {
					if (target.hasSkillTag("nogain")) {
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
					var nh = target.countCards("h");
					var np = player.countCards("h");
					if (player.hp == player.maxHp || player.countCards("h") <= 1) {
						if (nh >= np - 1 && np <= player.hp && !target.hasSkill("haoshi")) {
							return 0;
						}
					}
					return Math.max(1, 5 - nh);
				},
			},
		},
	}
```

### fengxiang 名字:封乡
描述: 锁定技。①当你受到伤害后，若场上：存在“隙”唯一最多的角色，则其回复1点体力；不存在，则你摸一张牌。②当有角色的手牌移动后，若场上“隙”唯一最多的角色因此发生变化，则你摸一张牌。
```js
fengxiang: {
		getMax(event) {
			var max = 0,
				max2 = null,
				players = game.filterPlayer();
			for (var current of players) {
				var num = 0,
					cards = current.getCards("h", function (card) {
						return card.hasGaintag("fengxiang_tag");
					});
				if (event) {
					if (event.name == "gain" && event.gaintag.includes("fengxiang_tag")) {
						cards.removeArray(event.cards);
					}
					var evt = event.getl(current);
					if (evt && evt.gaintag_map) {
						for (var i in evt.gaintag_map) {
							if (evt.gaintag_map[i].includes("fengxiang_tag")) {
								num++;
							}
						}
					}
				}
				num += cards.length;
				if (num > max) {
					max = num;
					max2 = current;
				} else if (num == max) {
					max2 = null;
				}
			}
			return max2;
		},
		audio: 2,
		init(player) {
			game.addGlobalSkill("fengxiang_use");
		},
		onremove(player) {
			if (!game.hasPlayer(current => current.hasSkill("fengxiang", null, null, false), true)) {
				game.removeGlobalSkill("fengxiang_use");
			}
		},
		trigger: { player: "damageEnd" },
		forced: true,
		filter(event, player) {
			var target = lib.skill.fengxiang.getMax();
			return !target || target.isDamaged();
		},
		logTarget(event, player) {
			return lib.skill.fengxiang.getMax() || player;
		},
		async content(event, trigger, player) {
			var target = lib.skill.fengxiang.getMax();
			if (target) {
				target.recover();
			} else {
				player.draw();
			}
		},
		group: "fengxiang_draw",
		subSkill: {
			draw: {
				audio: "fengxiang",
				trigger: {
					global: ["equipAfter", "addJudgeAfter", "loseAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				forced: true,
				filter(event, player) {
					if (event.name == "lose" && event.getlx === false) {
						return false;
					}
					return lib.skill.fengxiang.getMax() != lib.skill.fengxiang.getMax(event);
				},
				async content(event, trigger, player) {
					if (trigger.delay === false) {
						game.delayx();
					}
					player.draw();
				},
			},
			use: {
				mod: {
					aiOrder(player, card, num) {
						if (
							num > 0 &&
							get.itemtype(card) === "card" &&
							card.hasGaintag("fengxiang_tag") &&
							game.hasPlayer(current => {
								return current.hasSkill("fengxiang") && get.attitude(player, current) > 0;
							})
						) {
							return num + 10;
						}
					},
				},
				trigger: { player: "dieAfter" },
				filter(event, player) {
					return !game.hasPlayer(current => current.hasSkill("fengxiang", null, null, false), true);
				},
				silent: true,
				forceDie: true,
				charlotte: true,
				async content(event, trigger, player) {
					game.removeGlobalSkill("fengxiang_use");
				},
			},
		},
	}
```

## dc_sunru 名字:孙茹 势力:wu

### xiecui 名字:撷翠
描述: 当有角色于回合内第一次因执行牌的效果而造成伤害时，你可以令此伤害+1。若其势力为吴，则该角色获得此伤害牌对应的实体牌，且其本回合的手牌上限+1。
```js
xiecui: {
		audio: 2,
		trigger: { global: "damageBegin1" },
		filter(event, player) {
			var source = event.source;
			if (!source || source != _status.currentPhase || event.getParent().type != "card") {
				return false;
			}
			return !source.hasHistory("sourceDamage", function (evt) {
				return evt.getParent().type == "card";
			});
		},
		logTarget: "source",
		prompt2(event, player) {
			var str = "令" + get.translation(event.player) + "即将受到的";
			str += "" + event.num + "点";
			if (event.hasNature("linked")) {
				str += get.translation(event.nature) + "属性";
			}
			str += "伤害+1";
			if (event.source.group == "wu") {
				var cards = event.cards.filterInD();
				if (cards.length) {
					str += "；然后" + get.translation(event.source) + "获得" + get.translation(cards) + "，且本回合的手牌上限+1";
				}
			}
			return str;
		},
		check(event, player) {
			var att = get.attitude(player, event.player);
			if (att < 0) {
				if (event.source.group != "wu" || !event.cards.filterInD().length) {
					return true;
				}
				return get.attitude(player, event.source) > 0;
			}
			return false;
		},
		async content(event, trigger, player) {
			trigger.num++;
			var source = trigger.source;
			if (source.group == "wu") {
				var cards = trigger.cards.filterInD();
				if (cards.length > 0) {
					source.gain(cards, "gain2");
					source.addMark("xiecui_effect", 1, false);
					source.addTempSkill("xiecui_effect");
				}
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				mod: {
					maxHandcard: (player, num) => num + player.countMark("xiecui_effect"),
				},
				marktext: "翠",
				onremove: true,
				intro: { content: "手牌上限+#" },
			},
		},
		ai: { threaten: 1.75 },
	}
```

### youxu 名字:忧恤
描述: 一名角色A的回合结束时，若其手牌数大于体力值，则你可以展示A的一张手牌，然后将此牌交给另一名角色B。若B的体力值为全场最少，则B回复1点体力。
```js
youxu: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		logTarget: "player",
		filter(event, player) {
			return event.player.countCards("h") > event.player.hp;
		},
		check(event, player) {
			if (get.attitude(player, event.player) <= 0) {
				return true;
			} else {
				return game.hasPlayer(function (current) {
					return current != event.player && current.isDamaged() && current.isMinHp() && get.attitude(player, current) > 0 && get.recoverEffect(current, player, player) > 0;
				});
			}
		},
		async content(event, trigger, player) {
			const cardResult = player == trigger.player ? await player.chooseCard("h", true, "请展示一张手牌").forResult() : await player.choosePlayerCard(trigger.player, true, "h").forResult();
			if (!cardResult.bool) return;
			const card = cardResult.cards[0];
			var str = get.translation(player);
			if (player != trigger.player) {
				str += "对" + get.translation(trigger.player);
			}
			str += "发动了【忧恤】";
			player.showCards(card, str);
			if (!game.hasPlayer(current => current != trigger.player)) return;
			const targetResult = await player
				.chooseTarget("令一名角色获得" + get.translation(card), "若其体力值为全场最少，则其回复1点体力", true, function (card, player, target) {
					return target != _status.event.getTrigger().player;
				})
				.set("ai", function (target) {
					var player = _status.event.player,
						att = get.attitude(player, target);
					if (att < 0) {
						return 0;
					}
					if (target.isDamaged() && target.isMinHp && get.recoverEffect(target, player, player) > 0) {
						return 4 * att;
					}
					return att;
				})
				.forResult();
			if (!targetResult.bool) return;
			const target = targetResult.targets[0];
			player.line(target, "green");
			target.gain(card, trigger.player, "give").giver = player;
			if (target.isMinHp()) {
				target.recover();
			}
		},
	}
```

## xiahoulingnv 名字:夏侯令女 势力:wei

### fuping 名字:浮萍
描述: ①其他角色对你使用的牌结算结束后，若你未因此技能记录过此牌的名称且你有未废除的装备栏，则你可以废除一个装备栏，记录此牌的名称。②每回合每种牌名限一次。你可以将一张非基本牌当做〖浮萍①〗记录过的基本牌或锦囊牌使用或打出。③若你的所有装备栏均已被废除，则你使用牌无距离限制。
```js
fuping: {
		audio: 2,
		hiddenCard(player, name) {
			var list = player.getStorage("fuping").slice(0);
			list.removeArray(player.getStorage("fuping_round"));
			return list.includes(name) && player.hasCard(card => get.type(card) != "basic", "ehs");
		},
		enable: "chooseToUse",
		locked: false,
		filter(event, player) {
			var list = player.getStorage("fuping").slice(0);
			list.removeArray(player.getStorage("fuping_round"));
			if (!list.length) {
				return false;
			}
			if (!player.hasCard(card => get.type(card) != "basic", "ehs")) {
				return false;
			}
			for (var i of list) {
				var type = get.type2(i, false);
				if ((type == "basic" || type == "trick") && event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				var list = player.getStorage("fuping").slice(0);
				list.removeArray(player.getStorage("fuping_round"));
				var list2 = [];
				for (var i of list) {
					var type = get.type2(i, false);
					if ((type == "basic" || type == "trick") && event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) {
						list2.push([type, "", i]);
					}
				}
				return ui.create.dialog("浮萍", [list2, "vcard"]);
			},
			check(button) {
				if (_status.event.getParent().type != "phase") {
					return 1;
				}
				return _status.event.player.getUseValue({ name: button.link[2] }, null, true);
			},
			backup(links, player) {
				return {
					audio: "fuping",
					filterCard: card => get.type(card) != "basic",
					position: "he",
					popname: true,
					viewAs: {
						name: links[0][2],
					},
					check(card) {
						return 8 - get.value(card);
					},
					async precontent(event, trigger, player) {
						player.addTempSkill("fuping_round");
						player.markAuto("fuping_round", [event.result.card.name]);
					},
				};
			},
			prompt(links, player) {
				return "将一张非基本牌当做【" + get.translation(links[0][2]) + "】使用";
			},
		},
		ai: {
			order: 8,
			result: { player: 1 },
			respondSha: true,
			skillTagFilter(player) {
				var list = player.getStorage("fuping").slice(0);
				list.removeArray(player.getStorage("fuping_round"));
				return list.includes("sha");
			},
		},
		mod: {
			targetInRange(card, player, target) {
				if (!player.hasEnabledSlot()) {
					return true;
				}
			},
		},
		marktext: "萍",
		intro: { content: "已记录$" },
		group: "fuping_mark",
		subSkill: {
			mark: {
				audio: "fuping",
				trigger: { global: "useCardAfter" },
				filter(event, player) {
					return player != event.player && event.targets.includes(player) && player.hasEnabledSlot() && !player.getStorage("fuping").includes(event.card.name);
				},
				logTarget: "player",
				prompt2: event => "废除一个装备栏并记录【" + get.translation(event.card.name) + "】",
				check(event, player) {
					var list = ["tao", "juedou", "guohe", "shunshou", "wuzhong", "xietianzi", "yuanjiao", "wanjian", "nanman", "huoshaolianying", "chuqibuyi", "zhujinqiyuan", "lebu", "bingliang"];
					if (!list.includes(event.card.name)) {
						return false;
					}
					if (["nanman", "wanjian"].includes(event.card.name) && !player.hasValueTarget({ name: event.card.name })) {
						return false;
					}
					var list = [3, 5, 4, 1, 2];
					for (var i of list) {
						if (player.hasEnabledSlot(i)) {
							var card = player.getEquip(i);
							if (!card || player.hasEmptySlot(i)) {
								return true;
							}
							if (get.value(card, player) <= 0) {
								return true;
							}
						}
					}
					return false;
				},
				async content(event, trigger, player) {
					player.markAuto("fuping", [trigger.card.name]);
					game.log(player, "记录了", "#y" + get.translation(trigger.card.name));
					player.chooseToDisable().set("ai", function (event, player, list) {
						var list = [3, 5, 4, 1, 2];
						for (var i of list) {
							if (player.hasEnabledSlot(i)) {
								var card = player.getEquip(i);
								if (!card || player.hasEmptySlot(i)) {
									return "equip" + i;
								}
								if (get.value(card, player) <= 0) {
									return "equip" + i;
								}
							}
						}
						return list.randomGet();
					});
				},
			},
			backup: { audio: "fuping" },
			round: { charlotte: true, onremove: true },
		},
	}
```

### weilie 名字:炜烈
描述: 每局游戏限X次。出牌阶段，你可以弃置一张牌并选择一名已受伤的角色，令该角色回复1点体力。然后若其体力值小于体力上限，则其摸两张牌（X为你〖浮萍①〗中的记录数+2）。
```js
weilie: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.countMark("weilie_used") <= player.getStorage("fuping").length + 1 && player.countCards("he") > 0 && game.hasPlayer(current => current.isDamaged());
		},
		filterCard: true,
		position: "he",
		filterTarget: (card, player, target) => target.isDamaged(),
		check(card) {
			return 8 - get.value(card);
		},
		async content(event, trigger, player) {
			const { target, name } = event;
			player.addSkill(name + "_used");
			player.addMark(name + "_used", 1, false);
			await target.recover();
			if (target.isDamaged()) {
				await target.draw(2);
			}
		},
		onremove: true,
		ai: {
			order: 1,
			result: {
				player(player, target) {
					var eff = get.recoverEffect(target, player, player);
					if (target.getDamagedHp() > 1) {
						eff += get.effect(target, { name: "draw" }, player, player);
					}
					return eff;
				},
			},
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
				intro: { content: "本局游戏已发动#次【炜烈】" },
			},
		},
	}
```

## zhangyao 名字:张媱 势力:wu

### yuanyu 名字:怨语
描述: 出牌阶段限一次。你可以摸两张牌，然后选择一张手牌和一名其他角色。该角色获得如下效果直到你发动〖夕颜〗：{你与该角色的弃牌阶段开始时，或当该角色造成1点伤害后，其须将一张手牌作为“怨”置于你的武将牌上}。然后你将你选择的手牌作为“怨”置于你的武将牌上。
```js
yuanyu: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		async content(event, trigger, player) {
			let result;

			// step 0
			await player.draw(2);
			// step 1
			if (player.countCards("h") > 0 && game.hasPlayer(current => current != player)) {
				const suits = lib.suit.slice(0);
				const cards = player.getExpansions("yuanyu");
				for (const i of cards) {
					suits.remove(get.suit(i, false));
				}
				let str = "选择一张手牌，作为“怨”置于武将牌上；同时选择一名其他角色，令该角色获得〖怨语〗的后续效果。";
				if (suits.length) {
					str += "目前“怨”中未包含的花色：";
					for (const i of suits) {
						str += get.translation(i);
					}
				}
				result = await player
					.chooseCardTarget({
						filterCard: true,
						filterTarget: lib.filter.notMe,
						position: "h",
						prompt: "怨语：选择置于武将牌上的牌和目标",
						prompt2: str,
						suits: suits,
						forced: true,
						ai1(card) {
							const val = get.value(card);
							const evt = _status.event;
							if (evt.suits.includes(get.suit(card, false))) {
								return 8 - val;
							}
							return 5 - val;
						},
						ai2(target) {
							const player = _status.event.player;
							if (player.storage.yuanyu_damage && player.storage.yuanyu_damage.includes(target)) {
								return 0;
							}
							return -get.attitude(player, target);
						},
					})
					.forResult();
			} else {
				return;
			}
			// step 2
			const target = result.targets[0];
			player.addSkill("yuanyu_damage");
			player.markAuto("yuanyu_damage", result.targets);
			player.line(target, "green");
			if (!target.storage.yuanyu_mark) {
				target.storage.yuanyu_mark = player;
				target.markSkillCharacter("yuanyu_mark", player, "怨语", "已获得〖怨语〗效果");
				target.addSkill("yuanyu_mark");
			}
			const next = player.addToExpansion(result.cards, player, "give");
			next.gaintag.add("yuanyu");
			await next;
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		onremove(player, skill) {
			var cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
			player.removeSkill("yuanyu_damage");
		},
		ai: {
			order: 7,
			result: {
				player: 1,
			},
		},
		subSkill: {
			mark: {
				mark: "character",
				charlotte: true,
				intro: {
					content: "已获得〖怨语〗效果",
					onunmark: true,
				},
			},
			damage: {
				trigger: { global: ["damageSource", "phaseDiscardBegin"] },
				forced: true,
				charlotte: true,
				onremove(player, skill) {
					if (player.storage[skill]) {
						for (var i of player.storage[skill]) {
							if (i.storage.yuanyu_mark == player) {
								i.unmarkSkill("yuanyu_mark");
							}
						}
					}
					delete player.storage[skill];
				},
				filter(event, player) {
					if (event.name == "damage") {
						var source = event.source;
						return source && player.getStorage("yuanyu_damage").includes(source) && source.countCards("h") > 0;
					} else {
						if (player == event.player) {
							return player.getStorage("yuanyu_damage").some(function (target) {
								return target.isIn() && target.countCards("h") > 0;
							});
						} else if (player.getStorage("yuanyu_damage").includes(event.player)) {
							return event.player.countCards("h") > 0;
						}
						return false;
					}
				},
				async content(event, trigger, player) {
					let targets;
					if (trigger.name == "phaseDiscard") {
						if (trigger.player == player) {
							targets = player
								.getStorage("yuanyu_damage")
								.filter(function (target) {
									return target.isIn() && target.countCards("h") > 0;
								})
								.sortBySeat();
						} else {
							targets = [trigger.player];
						}
					} else {
						targets = [trigger.source];
					}
					while (targets.length) {
						const target = targets.shift();
						let count = trigger.name == "damage" ? trigger.num : 1;
						while (count > 0 && target.countCards("h") > 0) {
							count--;
							var suits = lib.suit.slice(0),
								cards = player.getExpansions("yuanyu");
							for (var i of cards) {
								suits.remove(get.suit(i, false));
							}
							var next = target.chooseCard("h", true, "将一张手牌置于" + get.translation(player) + "的武将牌上");
							next.set("suits", suits);
							next.set("ai", function (card) {
								var val = get.value(card),
									evt = _status.event;
								if (evt.suits.includes(get.suit(card, false))) {
									return 5 - get.value(card);
								}
								return 8 - get.value(card);
							});
							if (suits.length) {
								var str = "目前未包含的花色：";
								for (var i of suits) {
									str += get.translation(i);
								}
								next.set("prompt2", str);
							}
							const result = await next.forResult();
							player.addToExpansion(result.cards, target, "give").gaintag.add("yuanyu");
							if (!player.hasSkill("yuanyu_damage")) {
								return;
							}
						}
					}
				},
			},
		},
	}
```

### xiyan 名字:夕颜
描述: 当有牌作为“怨”移动到你的武将牌上后，若“怨”中的花色数达到4种，则你可以获得所有“怨”。然后若当前回合角色：是你，你本回合手牌上限+4且使用牌无次数限制且重置你的〖怨语〗于此阶段的发动次数；不是你，你可令当前回合角色本回合手牌上限-4且不能使用基本牌。
```js
xiyan: {
		audio: 2,
		trigger: { player: "addToExpansionAfter" },
		filter(event, player) {
			if (!event.gaintag.includes("yuanyu")) {
				return false;
			}
			var cards = player.getExpansions("yuanyu");
			if (cards.length < lib.suit.length) {
				return false;
			}
			var suits = lib.suit.slice(0);
			for (var i of cards) {
				suits.remove(get.suit(i));
				if (!suits.length) {
					return true;
				}
			}
			return false;
		},
		logTarget: () => _status.currentPhase,
		prompt2: "获得所有“怨”",
		check: () => true,
		async content(event, trigger, player) {
			let result;

			// step 0
			await player.removeSkill("yuanyu_damage");
			const cards = player.getExpansions("yuanyu");
			await player.gain(cards, "gain2");
			// step 1
			const target = _status.currentPhase;
			if (player == target) {
				await player.addMark("xiyan_buff", 4, false);
				await player.addTempSkill("xiyan_buff");
				delete player.getStat("skill").yuanyu;
				return;
			}
			result = await player
				.chooseBool("夕颜：是否令" + get.translation(target) + "本回合的手牌上限-4且不能使用基本牌？")
				.set("ai", () => _status.event.bool)
				.set("bool", get.attitude(player, target) < 0)
				.forResult();
			// step 2
			if (!result.bool) {
				return;
			}
			const target2 = _status.currentPhase;
			await target2.addMark("xiyan_debuff", 4, false);
			await target2.addTempSkill("xiyan_debuff");
		},
		subSkill: {
			buff: {
				charlotte: true,
				mark: true,
				marktext: " + ",
				intro: {
					content: "本回合手牌上限+#且使用牌无次数限制",
				},
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("xiyan_buff");
					},
					cardUsable(card, player) {
						return Infinity;
					},
				},
				sub: true,
			},
			debuff: {
				charlotte: true,
				mark: true,
				marktext: " - ",
				intro: {
					content: "本回合手牌上限-#且不能使用基本牌",
				},
				mod: {
					maxHandcard(player, num) {
						return num - player.countMark("xiyan_debuff");
					},
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
				sub: true,
			},
		},
		ai: {
			combo: "yuanyu",
		},
	}
```

## tengyin 名字:滕胤 势力:wu

### chenjian 名字:陈见
描述: 准备阶段，你可亮出牌堆顶的3+X张牌（X为你“陈见”标记的数量且至多为2），然后执行以下一至两项：⒈弃置一张牌，然后令一名角色获得与你弃置牌花色相同的牌。⒉使用其中剩余的一张牌。若你执行了所有选项，则你获得一枚“陈见”并重铸所有手牌。
```js
chenjian: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		prompt2(event, player) {
			return "亮出牌堆顶的" + get.cnNumber(3 + player.countMark("chenjian")) + "张牌，然后执行以下一至两项：⒈弃置一张牌，然后令一名角色获得与你弃置牌花色相同的牌。⒉使用其中剩余的一张牌。若你执行了所有选项，则你获得一枚“陈见”并重铸所有手牌";
		},
		async content(event, trigger, player) {
			const cards = get.cards(3 + player.countMark("chenjian"));
			event.cards = cards;
			await player.showCards(cards, get.translation(player) + "发动了【陈见】");

			const list = [];
			if (
				player.countCards("he", i => {
					return lib.filter.cardDiscardable(i, player, "chenjian");
				})
			) {
				list.push("选项一");
			}
			if (
				event.cards.some(i => {
					return player.hasUseTarget(i);
				})
			) {
				list.push("选项二");
			}

			let control;
			if (list.length === 1) {
				control = list[0];
			} else if (list.length > 1) {
				const result = await player
					.chooseControl(list)
					.set("choiceList", ["弃置一张牌，然后令一名角色获得与你弃置牌花色相同的牌", "使用" + get.translation(event.cards) + "中的一张牌"])
					.set("prompt", "陈见：请选择一项")
					.set("ai", () => {
						let player = _status.event.player,
							cards = _status.event.getParent().cards;
						if (
							cards.some(i => {
								return player.getUseValue(i) > 0;
							})
						) {
							return "选项二";
						}
						return "选项一";
					})
					.forResult();
				control = result.control;
			} else {
				return;
			}

			let goon = 0;
			const choosed = control;
			if (choosed === "cancel2") {
				return;
			}

			let step = choosed === "选项二" ? 6 : 3;
			let shouldEnd = false;
			while (true) {
				if (step === 3) {
					if (
						player.countCards("he", i => {
							return lib.filter.cardDiscardable(i, player, "chenjian");
						})
					) {
						const result = await player
							.chooseToDiscard("he", !goon)
							.set("ai", function (card) {
								let evt = _status.event.getParent(),
									val = goon && evt.player.countMark("chenjian") < 2 ? 0 : -get.value(card),
									suit = get.suit(card);
								for (let i of evt.cards) {
									if (get.suit(i, false) == suit) {
										val += get.value(i, "raw");
									}
								}
								return val;
							})
							.set("prompt", "陈见：" + (goon ? "是否" : "请") + "弃置一张牌，然后令一名角色获得" + get.translation(event.cards) + "中花色与之相同的牌" + (goon ? "？" : ""))
							.forResult();
						if (!result.bool) {
							return;
						}

						goon++;
						const suit = get.suit(result.cards[0], player);
						const cards2 = event.cards.filter(function (i) {
							return get.suit(i, false) == suit;
						});
						if (cards2.length) {
							const targetResult = await player
								.chooseTarget(true, "选择一名角色获得" + get.translation(cards2))
								.set("ai", function (target) {
									let att = get.attitude(_status.event.player, target);
									if (att > 0) {
										return att + Math.max(0, 5 - target.countCards("h"));
									}
									return att;
								})
								.forResult();
							if (targetResult.bool) {
								const target = targetResult.targets[0];
								player.line(target, "green");
								await target.gain(cards2, "gain2");
								event.cards.removeArray(cards2);
							}
							if (choosed === "选项二") {
								shouldEnd = true;
								break;
							}
							step = 6;
							continue;
						}
						if (choosed === "选项一") {
							step = 6;
							continue;
						}
						shouldEnd = true;
						break;
					}
					if (choosed === "选项一") {
						step = 6;
						continue;
					}
					return;
				}

				const cards2 = cards.filter(function (i) {
					return player.hasUseTarget(i);
				});
				if (cards2.length) {
					const result = await player
						.chooseButton(["陈见：" + (goon ? "是否" : "请") + "使用其中一张牌" + (goon ? "？" : ""), cards2], !goon)
						.set("ai", function (button) {
							return player.getUseValue(button.link);
						})
						.forResult();
					if (!result.bool) {
						return;
					}

					await player.chooseUseTarget(true, result.links[0], false);
					event.cards.removeArray(result.links);
					goon += 2;
					if (choosed === "选项二") {
						step = 3;
						continue;
					}
					shouldEnd = true;
					break;
				}

				if (choosed === "选项二") {
					step = 3;
					continue;
				}
				return;
			}

			if (shouldEnd && goon > 2) {
				if (player.countMark("chenjian") < 2) {
					player.addMark("chenjian", 1, false);
				}
				await player.recast(player.getCards("h", lib.filter.cardRecastable));
			}
		},
		marktext: "见",
		intro: { content: "展示牌数量+#" },
	}
```

### xixiu 名字:皙秀
描述: 锁定技。①当你成为其他角色使用牌的目标时，若你的装备区内有和此牌花色相同的牌，则你摸一张牌。②若你装备区内的牌数为1，则其他角色不能弃置你装备区内的牌。
```js
xixiu: {
		mod: {
			canBeDiscarded(card, player, target) {
				if (player != target && get.position(card) == "e" && target.countCards("e") == 1) {
					return false;
				}
			},
		},
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			if (player == event.player || !player.countCards("e")) {
				return false;
			}
			var suit = get.suit(event.card, false);
			if (suit == "none") {
				return false;
			}
			return player.hasCard(function (card) {
				return get.suit(card, player) == suit;
			}, "e");
		},
		async content(event, trigger, player) {
			player.draw();
		},
		ai: {
			effect: {
				target_use(card, player, target) {
					if (typeof card == "object" && player != target) {
						var suit = get.suit(card);
						if (suit == "none") {
							return;
						}
						if (
							player.hasCard(function (card) {
								return get.suit(card, player) == suit;
							}, "e")
						) {
							return [1, 0.08];
						}
					}
				},
			},
		},
	}
```

## zhangxuan 名字:张嫙 势力:wu

### tongli 名字:同礼
描述: 当你于出牌阶段内使用基本牌或普通锦囊牌指定第一个目标后，若你手牌中的花色数和你于本阶段内使用过的牌数相等，则你可以令此牌额外结算X次（X为你手牌中的花色数）。
```js
tongli: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!event.isFirstTarget || (event.card.storage && event.card.storage.tongli)) {
				return false;
			}
			var type = get.type(event.card);
			if (type != "basic" && type != "trick") {
				return false;
			}
			var hs = player.getCards("h");
			if (!hs.length) {
				return false;
			}
			var evt = event.getParent("phaseUse");
			if (!evt || evt.player != player) {
				return false;
			}
			var num1 = player.getHistory("useCard", function (evtx) {
				if (evtx.getParent("phaseUse") != evt) {
					return false;
				}
				return !evtx.card.storage || !evtx.card.storage.tongli;
			}).length;
			if (hs.length < num1) {
				return false;
			}
			var list = [];
			for (var i of hs) {
				list.add(get.suit(i, player));
			}
			return list.length == num1;
		},
		prompt2(event, player) {
			var evt = event.getParent("phaseUse");
			var num = player.getHistory("useCard", function (evtx) {
				if (evtx.getParent("phaseUse") != evt) {
					return false;
				}
				return !evtx.card.storage || !evtx.card.storage.tongli;
			}).length;
			//var str='视为额外使用'+get.cnNumber(num)+'张'
			var str = "额外结算" + get.cnNumber(num) + "次";
			if (event.card.name == "sha" && game.hasNature(event.card)) {
				str += get.translation(event.card.nature);
			}
			return str + "【" + get.translation(event.card.name) + "】";
		},
		check(event, player) {
			return !get.tag(event.card, "norepeat");
		},
		async content(event, trigger, player) {
			//player.addTempSkill('tongli_effect');
			var evt = trigger.getParent("phaseUse");
			var num = player.getHistory("useCard", function (evtx) {
				if (evtx.getParent("phaseUse") != evt) {
					return false;
				}
				return true;
				//return !evtx.card.storage||!evtx.card.storage.tongli;
			}).length;
			trigger.getParent().effectCount += num;
		},
		/*subSkill:{
			effect:{
				trigger:{player:'useCardAfter'},
				forced:true,
				charlotte:true,
				filter:function(event,player){
					return event.tongli_effect!=undefined;
				},
				content:function(){
					'step 0'
					event.card=trigger.tongli_effect[0];
					event.count=trigger.tongli_effect[1];
					'step 1'
					event.count--;
					for(var i of trigger.targets){
						if(!i.isIn()||!player.canUse(card,i,false)) return;
					}
					if(trigger.addedTarget&&!trigger.addedTarget.isIn()) return;
					if(trigger.addedTargets&&trigger.addedTargets.length){
						for(var i of trigger.addedTargets){
							if(!i.isIn()) return;
						}
					}
					var next=player.useCard(get.copy(card),trigger.targets,false);
					if(trigger.addedTarget) next.addedTarget=trigger.addedTarget;
					if(trigger.addedTargets&&trigger.addedTargets.length) next.addedTargets=trigger.addedTargets.slice(0);
					if(event.count>0) event.redo();
				},
			},
		},*/
	}
```

### shezang 名字:奢葬
描述: 每轮限一次。当你或你回合内的其他角色进入濒死状态时，你可以从牌堆中获得每种花色的牌各一张。
```js
shezang: {
		audio: 2,
		round: 1,
		trigger: { global: "dying" },
		frequent: true,
		filter(event, player) {
			return event.player == player || player == _status.currentPhase;
		},
		async content(event, trigger, player) {
			var cards = [];
			for (var i of lib.suit) {
				var card = get.cardPile2(function (card) {
					return get.suit(card, false) == i;
				});
				if (card) {
					cards.push(card);
				}
			}
			if (cards.length) {
				player.gain(cards, "gain2");
			}
		},
	}
```

## wangtao 名字:王桃 势力:shu

### huguan 名字:护关
描述: 一名角色于出牌阶段内使用第一张牌时，若此牌为红色，则你可以声明一种花色。该花色的牌不计入其本回合的手牌上限。
```js
huguan: {
		audio: 2,
		audioname: ["wangyue"],
		init(player) {
			game.addGlobalSkill("huguan_all");
		},
		trigger: { global: "useCard" },
		direct: true,
		filter(event, player) {
			if (get.color(event.card, false) != "red") {
				return false;
			}
			var evt = event.getParent("phaseUse");
			if (!evt || evt.player != event.player) {
				return false;
			}
			return (
				event.player
					.getHistory("useCard", function (event) {
						return event.getParent("phaseUse") == evt;
					})
					.indexOf(event) === 0
			);
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseControl(lib.suit, "cancel2")
				.set("prompt", get.prompt("huguan", trigger.player))
				.set("prompt2", "令某种花色的手牌不计入其本回合的手牌上限")
				.set("ai", function () {
					var player = _status.event.player,
						target = _status.event.getTrigger().player,
						att = get.attitude(player, target);
					if (att <= 0) {
						if (!player.hasSkill("yaopei") || target.isDamaged() || !player.countCards("he") || target.needsToDiscard() - target.needsToDiscard(-target.countCards("h") / 4) > (att > -2 ? 1.6 : 1)) {
							return "cancel2";
						}
					}
					let list = lib.suit.slice(0);
					if (att <= 0 && target.getStorage("huguan_add")) {
						for (let i of target.getStorage("huguan_add")) {
							if (list.includes(i)) {
								return i;
							}
						}
					}
					list.removeArray(target.getStorage("huguan_add"));
					if (list.length) {
						return list.randomGet();
					}
					return "cancel2";
				})
				.forResult();
			if (result.control != "cancel2") {
				const target = trigger.player;
				player.logSkill("huguan", target);
				game.log(player, "选择了", "#g" + get.translation(result.control), "花色");
				target.addTempSkill("huguan_add");
				target.markAuto("huguan_add", [result.control]);
			}
		},
		subSkill: {
			add: {
				charlotte: true,
				onremove: true,
				mod: {
					ignoredHandcard(card, player) {
						if (player.getStorage("huguan_add").includes(get.suit(card, player))) {
							return true;
						}
					},
					cardDiscardable(card, player, name) {
						if (name == "phaseDiscard" && player.getStorage("huguan_add").includes(get.suit(card, player))) {
							return false;
						}
					},
				},
				intro: { content: "本回合$花色的牌不计入手牌上限" },
			},
			all: {
				mod: {
					aiValue(player, card, num) {
						if (player && player.storage.huguan_all > 0 && get.itemtype(card) == "card" && get.color(card, player) == "red") {
							return num + player.storage.huguan_all;
						}
					},
				},
				trigger: {
					player: ["phaseUseBegin", "useCard"],
				},
				filter(event, player) {
					if (event.name === "useCard") {
						return player.storage.huguan_all;
					}
					return true;
				},
				silent: true,
				charlotte: true,
				async content(event, trigger, player) {
					let num = -157;
					if (trigger.name === "useCard") {
						player.storage.huguan_all = 0;
						return;
					}
					game.countPlayer(current => {
						if (current.hasSkill("huguan")) {
							num = Math.max(num, get.attitude(_status.event.player, current));
						}
					}, true);
					if (num === -157) {
						game.removeGlobalSkill("huguan_all");
					} else if (num === 0) {
						player.storage.huguan_all = 6;
					} else if (num > 0) {
						player.storage.huguan_all = 9;
					}
				},
			},
		},
	}
```

### yaopei 名字:摇佩
描述: 其他角色的弃牌阶段结束时，若你本回合发动过〖护关〗，则你可以弃置一张与其于此阶段弃置的牌花色均不相同的牌。然后你选择一项：①其摸两张牌，你回复1点体力。②其回复1点体力，你摸两张牌。
```js
yaopei: {
		audio: 2,
		trigger: { global: "phaseDiscardEnd" },
		direct: true,
		filter(event, player) {
			if (player == event.player || !event.player.isIn() || !player.countSkill("huguan")) {
				return false;
			}
			var suits = [];
			event.player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard") == event) {
					for (var i of evt.cards2) {
						suits.add(get.suit(i, evt.hs.includes(i) ? evt.player : false));
					}
				}
			});
			if (suits.length >= lib.suit.length) {
				return false;
			}
			if (_status.connectMode && player.countCards("h") > 0) {
				return true;
			}
			return player.hasCard(function (card) {
				return !suits.includes(get.suit(card));
			}, "he");
		},
		async content(event, trigger, player) {
			const suits = [];
			trigger.player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard") == trigger) {
					for (var i of evt.cards2) {
						suits.add(get.suit(i, evt.hs.includes(i) ? evt.player : false));
					}
				}
			});
			const result = await player
				.chooseCardTarget({
					prompt: get.prompt("yaopei", trigger.player),
					prompt2: "操作提示：选择要弃置的牌，并选择执行摸牌选项的角色，另一名角色执行回复体力的选项。",
					suits: suits,
					position: "he",
					filterCard(card, player) {
						return !_status.event.suits.includes(get.suit(card)) && lib.filter.cardDiscardable(card, player, "yaopei");
					},
					filterTarget(card, player, target) {
						return target == player || target == _status.event.getTrigger().player;
					},
					ai1(card) {
						let player = _status.event.player,
							source = _status.event.getTrigger().player;
						if (get.attitude(player, source) > 0 && (get.recoverEffect(player, player, player) > 0 || get.recoverEffect(source, player, player) > 0)) {
							return 12 - get.value(card);
						}
						return 8 - get.value(card);
					},
					ai2(target) {
						let player = _status.event.player,
							source = _status.event.getTrigger().player;
						let recoverer = player === target ? source : player;
						if (recoverer.isHealthy()) {
							return get.attitude(player, target);
						}
						let att = get.attitude(player, recoverer),
							rec = get.recoverEffect(recoverer, player, player);
						if (rec > 0) {
							return Math.abs(att) + get.attitude(player, target);
						}
						return 0;
					},
				})
				.forResult();
			if (result.bool) {
				const target = trigger.player;
				player.logSkill("yaopei", target);
				await player.discard(result.cards);
				if (player == result.targets[0]) {
					if (target.isDamaged() && target.hp < player.hp && (get.mode() != "identity" || player.identity != "nei")) {
						player.addExpose(0.15);
					}
					await target.recover();
					await player.draw(2);
				} else {
					if ((player.isHealthy() || player.hp > target.hp) && (get.mode() != "identity" || player.identity != "nei")) {
						player.addExpose(0.15);
					}
					await target.draw(2);
					await player.recover();
				}
			}
		},
		ai: {
			combo: "huguan",
		},
	}
```

## wangyue 名字:王悦 势力:shu

### huguan 名字:护关
描述: 一名角色于出牌阶段内使用第一张牌时，若此牌为红色，则你可以声明一种花色。该花色的牌不计入其本回合的手牌上限。
```js
huguan: {
		audio: 2,
		audioname: ["wangyue"],
		init(player) {
			game.addGlobalSkill("huguan_all");
		},
		trigger: { global: "useCard" },
		direct: true,
		filter(event, player) {
			if (get.color(event.card, false) != "red") {
				return false;
			}
			var evt = event.getParent("phaseUse");
			if (!evt || evt.player != event.player) {
				return false;
			}
			return (
				event.player
					.getHistory("useCard", function (event) {
						return event.getParent("phaseUse") == evt;
					})
					.indexOf(event) === 0
			);
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseControl(lib.suit, "cancel2")
				.set("prompt", get.prompt("huguan", trigger.player))
				.set("prompt2", "令某种花色的手牌不计入其本回合的手牌上限")
				.set("ai", function () {
					var player = _status.event.player,
						target = _status.event.getTrigger().player,
						att = get.attitude(player, target);
					if (att <= 0) {
						if (!player.hasSkill("yaopei") || target.isDamaged() || !player.countCards("he") || target.needsToDiscard() - target.needsToDiscard(-target.countCards("h") / 4) > (att > -2 ? 1.6 : 1)) {
							return "cancel2";
						}
					}
					let list = lib.suit.slice(0);
					if (att <= 0 && target.getStorage("huguan_add")) {
						for (let i of target.getStorage("huguan_add")) {
							if (list.includes(i)) {
								return i;
							}
						}
					}
					list.removeArray(target.getStorage("huguan_add"));
					if (list.length) {
						return list.randomGet();
					}
					return "cancel2";
				})
				.forResult();
			if (result.control != "cancel2") {
				const target = trigger.player;
				player.logSkill("huguan", target);
				game.log(player, "选择了", "#g" + get.translation(result.control), "花色");
				target.addTempSkill("huguan_add");
				target.markAuto("huguan_add", [result.control]);
			}
		},
		subSkill: {
			add: {
				charlotte: true,
				onremove: true,
				mod: {
					ignoredHandcard(card, player) {
						if (player.getStorage("huguan_add").includes(get.suit(card, player))) {
							return true;
						}
					},
					cardDiscardable(card, player, name) {
						if (name == "phaseDiscard" && player.getStorage("huguan_add").includes(get.suit(card, player))) {
							return false;
						}
					},
				},
				intro: { content: "本回合$花色的牌不计入手牌上限" },
			},
			all: {
				mod: {
					aiValue(player, card, num) {
						if (player && player.storage.huguan_all > 0 && get.itemtype(card) == "card" && get.color(card, player) == "red") {
							return num + player.storage.huguan_all;
						}
					},
				},
				trigger: {
					player: ["phaseUseBegin", "useCard"],
				},
				filter(event, player) {
					if (event.name === "useCard") {
						return player.storage.huguan_all;
					}
					return true;
				},
				silent: true,
				charlotte: true,
				async content(event, trigger, player) {
					let num = -157;
					if (trigger.name === "useCard") {
						player.storage.huguan_all = 0;
						return;
					}
					game.countPlayer(current => {
						if (current.hasSkill("huguan")) {
							num = Math.max(num, get.attitude(_status.event.player, current));
						}
					}, true);
					if (num === -157) {
						game.removeGlobalSkill("huguan_all");
					} else if (num === 0) {
						player.storage.huguan_all = 6;
					} else if (num > 0) {
						player.storage.huguan_all = 9;
					}
				},
			},
		},
	}
```

### mingluan 名字:鸣鸾
描述: 其他角色的结束阶段开始时，若有角色于本回合内回复过体力，则你可以弃置任意张牌，然后摸X张牌（X为当前角色的手牌数，且至多摸至五张）。
```js
mingluan: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		direct: true,
		filter(event, player) {
			const bool = game.getGlobalHistory("changeHp", evt => evt.getParent().name == "recover" && evt.changedHp > 0).length;
			return player != event.player && event.player.isIn() && bool && player.hasCards("he");
		},
		async content(event, trigger, player) {
			let he = player.getCards("he"),
				disval = 0,
				dis = 0,
				spare = 30,
				use = true;
			for (let i of he) {
				let val = get.value(i, player);
				if (val < 6 && get.position(i) == "h") {
					dis++;
					disval += val;
				} else if (val < spare) {
					spare = val;
				}
			}
			if (!dis) {
				dis = 1;
				disval = spare;
				spare = -1;
			}
			let draw = Math.min(trigger.player.countCards("h"), 5 + dis - player.countCards("h"));
			if (6 * draw < disval) {
				use = false;
			}
			const next = player.chooseToDiscard("he", get.prompt("mingluan"), "弃置任意张牌，并摸等同于" + get.translation(trigger.player) + "手牌数的牌（至多摸至五张）", [1, Infinity], "allowChooseAll");
			next.set("ai", function (card) {
				let val = get.value(card, player);
				if (val < 0 && card.name !== "du") {
					return 30;
				}
				if (!_status.event.use) {
					return 0;
				}
				if (ui.selected.cards.length) {
					if (get.position(card) !== "h") {
						return 0;
					}
					return 6 - val;
				}
				if (_status.event.spare < 0 || get.position(card) === "h") {
					return 30 - val;
				}
				return 0;
			})
				.set("spare", spare)
				.set("use", use);
			next.logSkill = ["mingluan", trigger.player];
			const result = await next.forResult();
			if (result.bool) {
				const num = trigger.player.countCards("h"),
					num2 = 5 - player.countCards("h");
				if (num > 0 && num2 > 0) {
					await player.draw(Math.min(num, num2));
				}
			}
		},
	}
```

## zhaoyan 名字:赵嫣 势力:wu

### jinhui 名字:锦绘
描述: 出牌阶段限一次，你可以随机亮出牌堆中的三张不具有“伤害”标签且使用目标范围为“自己”或“一名角色”的牌，然后选择一名其他角色。该角色选择并按如下“锦绘”规则使用其中一张，然后你可以按如下“锦绘”规则使用剩余的任意张牌：若此牌的使用目标为“自己”，则对自己使用该牌，否则对对方使用该牌（无距离限制且不计入次数限制）。
```js
jinhui: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		manualConfirm: true,
		async content(event, trigger, player) {
			/** @type { Card[] } */
			const cards = [];
			while (cards.length < 3) {
				const card = get.cardPile2(card => {
					if (cards.some(cardx => cardx.name == card.name)) {
						return false;
					}
					const info = get.info(card, false);
					if (info.ai && info.ai.tag && info.ai.tag.damage) {
						return false;
					}
					return !info.notarget && (info.toself || info.singleCard || !info.selectTarget || info.selectTarget == 1);
				});
				if (card) {
					cards.push(card);
				} else {
					break;
				}
			}
			if (!cards.length) {
				return;
			}

			await player.showCards(cards, `${get.translation(player)}发动了【锦绘】`);
			await game.cardsGotoOrdering(cards);
			if (!game.hasPlayer(current => current !== player)) {
				return;
			}

			let result = await player
				.chooseTarget({
					prompt: "选择【锦绘】的目标",
					filterTarget: lib.filter.notMe,
					forced: true,
					ai(target) {
						const event = get.event();
						const cards = event.getParent().cards.slice(0);

						let max_effect = 0;
						let max_effect_player = 0;
						for (const card of cards) {
							const targetx = lib.skill.jinhui.getUsableTarget(card, target, player);
							if (targetx) {
								const effect2 = get.effect(targetx, card, target, target);
								const effect3 = get.effect(targetx, card, target, player);
								if (effect2 > max_effect) {
									max_effect = effect2;
									max_effect_player = effect3;
								}
							}
						}
						return max_effect_player;
					},
				})
				.forResult();
			if (!result?.bool || !result.targets?.length) {
				return;
			}

			const target = result.targets[0];
			player.line(target, "green");

			const targetCards = cards.filter(card => lib.skill.jinhui.getUsableTarget(card, target, player));
			if (targetCards.length) {
				if (targetCards.length == 1) {
					result = { bool: true, links: targetCards };
				} else {
					result = await target
						.chooseButton({
							createDialog: ["选择按“锦绘”规则使用一张牌", targetCards],
							forced: true,
							ai(button) {
								const event = get.event();
								const player = get.player();
								const target = event.getParent().player;
								const card = button.link;

								const targetx = lib.skill.jinhui.getUsableTarget(card, player, target);
								const effect = get.effect(targetx, card, player, player);
								const cards = event.getParent().cards.slice(0);
								let effect2 = 0;
								let effect3 = 0;
								cards.remove(button.link);
								for (const card of cards) {
									const targetx2 = lib.skill.jinhui.getUsableTarget(card, target, player);
									if (targetx2) {
										effect2 += get.effect(targetx2, card, target, target);
										effect3 += get.effect(targetx2, card, target, player);
									}
								}
								if (effect2 > 0) {
									effect += effect3;
								}
								return effect;
							},
						})
						.forResult();
				}
				if (result?.bool) {
					const card = result.links[0];
					cards.remove(card);
					const targetx = lib.skill.jinhui.getUsableTarget(card, target, player);
					await target.useCard({
						card,
						targets: [targetx],
						addCount: false,
						noai: true,
					});
				}
			}

			const selfCards = cards.filter(card => lib.skill.jinhui.getUsableTarget(card, player, target));
			while (selfCards.length) {
				result = await player
					.chooseButton({
						createDialog: ["是否按“锦绘”规则使用其中一张牌？", selfCards],
						ai(button) {
							const { player, target } = get.event();
							const card = button.link;
							const targetx = lib.skill.jinhui.getUsableTarget(card, player, target);
							return get.effect(targetx, card, player, player);
						},
					})
					.set("target", target)
					.forResult();

				if (!result?.bool) {
					return;
				}
				const card = result.links[0];
				selfCards.remove(card);
				const targetx = lib.skill.jinhui.getUsableTarget(card, player, target);
				if (targetx) {
					await player.useCard({
						card,
						targets: [targetx],
						addCount: false,
						noai: true,
					});
				}
			}
		},
		getUsableTarget(card, player, target) {
			const info = get.info(card, false);
			if (info.toself) {
				return player.canUse(card, player, false) ? player : false;
			}
			return target?.isIn() && player.canUse(card, target, false) ? target : false;
		},
		ai: {
			order: 5,
			result: { player: 1 },
		},
	}
```

### qingman 名字:轻幔
描述: 锁定技。一名角色的回合结束时，你将手牌摸至X张（X为其装备区中空栏的数量）。
```js
qingman: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		forced: true,
		logTarget: "player",
		filter(event, player) {
			if (!event.player.isIn()) {
				return false;
			}
			var num = player.countCards("h");
			if (num >= 5) {
				return false;
			}
			var num2 = 0;
			for (var i = 1; i <= 5; i++) {
				num2 += event.player.countEmptySlot(i);
			}
			return num < num2;
		},
		async content(event, trigger, player) {
			var num2 = 0;
			for (var i = 1; i <= 5; i++) {
				num2 += trigger.player.countEmptySlot(i);
			}
			player.drawTo(num2);
		},
	}
```

## heyan 名字:何晏 势力:wei

### yachai 名字:崖柴
描述: 当你受到伤害后，你可令伤害来源选择一项：①其本回合不能再使用手牌，然后你摸两张牌；②其展示所有手牌，然后将其手牌中一种花色的所有牌交给你；③弃置一半数量的手牌（向上取整）。
```js
yachai: {
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.source && event.source.isIn();
		},
		logTarget: "source",
		check(event, player) {
			if (get.attitude(player, event.source) <= 0) {
				return true;
			}
			return event.source.countCards("h") < Math.sqrt(event.source.getHp());
		},
		async content(event, trigger, player) {
			const target = trigger.source,
				str = get.translation(player);
			const th = target.countCards("h");
			const num = Math.ceil(th / 2);
			let result;
			if (th > 0) {
				const list = ["本回合不能使用手牌，然后" + str + "摸两张牌", "展示所有手牌，并将其中一种花色的所有牌交给" + str, "弃置" + get.cnNumber(num) + "张手牌"];
				result = await target
					.chooseControl()
					.set("choiceList", list)
					.set("ai", () => get.event().idx)
					.set(
						"idx",
						(function () {
							let att = get.sgn(get.attitude(target, player)),
								use = get.effect(player, { name: "draw" }, player, target) * 1.5,
								give = {},
								discard = [];
							target.countCards("h", i => {
								discard.add(i);
								let suit = get.suit(i, target),
									val = target.getUseValue(i, null, true);
								give[suit] ??= 0;
								give[suit] += get.value(i);
								if (val > 1) {
									use -= Math.sqrt(Math.abs(val));
								}
							});
							discard.sort((a, b) => get.value(a) - get.value(b));
							discard = discard.slice(0, Math.min(num, discard.length)).reduce((sum, card) => sum + get.value(card), 0);
							give = att * Math.min(...Object.values(give));
							const res = [use, give, -discard];
							return res.indexOf(Math.max(...res));
						})()
					)
					.forResult();
			} else {
				result = { index: 0 };
			}
			switch (result?.index) {
				case 0:
					target.addTempSkill("yachai_block");
					await player.draw(2);
					return;
				case 1: {
					await target.showHandcards();
					const map = {},
						hs = target.getCards("h");
					for (const i of hs) {
						map[get.suit(i, target)] ??= [];
						map[get.suit(i, target)].push(i);
					}
					const list = Object.keys(map).filter(i => lib.suit.includes(i));
					let result2;
					if (!list.length) {
						return;
					} else if (list.length == 1) {
						result2 = { control: list[0] };
					} else {
						result2 = await target
							.chooseControl({
								controls: list,
								prompt: "将一种花色的牌交给" + get.translation(player),
								choice: (() => {
									const suit = list.slice().sort((a, b) => {
										return get.value(map[a], target) - get.value(map[b], target);
									})[0];
									return list.indexOf(suit);
								})(),
							})
							.forResult();
					}
					if (result2?.control) {
						const cards = map[result2.control].filter(function (card) {
							return lib.filter.canBeGained(card, player, target, "yachai");
						});
						if (cards.length) {
							await target.give(cards, player, "give");
						}
					}
					return;
				}
				case 2:
					await target.chooseToDiscard("h", true, num);
			}
		},
		subSkill: {
			block: {
				mark: true,
				intro: { content: "不能使用手牌" },
				charlotte: true,
				mod: {
					cardEnabled(card, player) {
						let hs = player.getCards("h"),
							cards = [card];
						if (Array.isArray(card.cards)) {
							cards.addArray(card.cards);
						}
						for (let i of cards) {
							if (hs.includes(i)) {
								return false;
							}
						}
					},
					cardSavable(card, player) {
						let hs = player.getCards("h"),
							cards = [card];
						if (Array.isArray(card.cards)) {
							cards.addArray(card.cards);
						}
						for (let i of cards) {
							if (hs.includes(i)) {
								return false;
							}
						}
					},
				},
			},
		},
	}
```

### qingtan 名字:清谈
描述: 出牌阶段限两次，你可令所有有手牌的角色同时选择一张手牌并同时展示。你可以获得其中一种颜色的牌，然后展示此颜色牌的角色各摸一张牌。若如此做，弃置其他的牌。
```js
qingtan: {
		audio: 2,
		enable: "phaseUse",
		usable: 2,
		filter(event, player) {
			return game.hasPlayer(current => current.countCards("h") > 0);
		},
		filterTarget(card, player, target) {
			return target.countCards("h") > 0;
		},
		selectTarget: -1,
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			const { targets } = event;
			targets.sortBySeat();
			const next = player
				.chooseCardOL(targets, "请选择要展示的牌", true)
				.set("ai", function (card) {
					return -get.value(card);
				})
				.set("source", player);
			next.aiCard = function (target) {
				const hs = target.getCards("h");
				return { bool: true, cards: [hs.randomGet()] };
			};
			next._args.remove("glow_result");
			const result = await next.forResult();
			const listMap = new Map();
			for (let i = 0; i < targets.length; i++) {
				listMap.set(result[i].cards[0], targets[i]);
			}
			const cards = Array.from(listMap.keys()).flat();
			await player
				.showCards(cards, get.translation(player) + "发动了【清谈】")
				.set("customButton", button => {
					const target = get.owner(button.link);
					if (target) {
						game.createButtonCardsetion(`${target.getName(true)}`, button);
					}
				})
				.set("delay_time", 4)
				.set("multipleShow", true);
			const list = [],
				map = {};
			for (const card of cards) {
				const color = get.color(card);
				map[color] ??= [];
				map[color].push(card);
			}
			const dialog = ["清谈：你可以获得一种颜色的所有牌"];
			for (const color of Object.keys(lib.color)) {
				if (map[color]) {
					// @ts-ignore
					dialog.push([
						map[color].map(card => [card, listMap.get(card)]),
						(item, type, position, noclick, node) => {
							node = ui.create.buttonPresets.card(item[0], type, position, noclick);
							game.createButtonCardsetion(`${item[1].getName(true)}`, node);
							return node;
						},
					]);
					list.push(color);
				}
			}
			if (list.length) {
				const result = await player
					.chooseControl(list, "cancel2")
					.set("dialog", dialog)
					.set("list", list)
					.set("map", map)
					.set("listMap", listMap)
					.set("ai", () => {
						let max = 0,
							res = "cancel2";
						const { list, map, player, listMap } = get.event();
						for (let color of list) {
							let temp = 0;
							for (let card of map[color]) {
								temp += get.value(card, player) + get.sgn(get.attitude(player, listMap.get(card))) * (6 - get.value(card, listMap.get(card)));
							}
							for (let colorx in map) {
								if (colorx === color) {
									continue;
								}
								for (let cardx of map[colorx]) {
									temp -= get.sgn(get.attitude(player, listMap.get(cardx))) * get.value(cardx, listMap.get(cardx));
								}
							}
							if (temp > max) {
								res = color;
								max = temp;
							}
						}
						return res;
					})
					.forResult();
				if (result?.control != "cancel2") {
					const color = result.control;
					player.chat(get.translation(color + 2));
					game.log(player, "选择了", "#y" + get.translation(color + 2));
					const cards2 = cards.filter(card => get.color(card) == color);
					await player.gain(cards2, "give");
					const draws = cards2.map(card => listMap.get(card));
					await game.asyncDraw(draws);
					for (let i = 0; i < cards.length; i++) {
						if (!cards2.includes(cards[i])) {
							await targets[i].modedDiscard(cards[i], player);
						}
					}
					await game.delayx();
				}
			}
		},
		ai: {
			order: 7,
			result: {
				player: 0.3,
				target: -1,
			},
		},
	}
```

## re_sunluyu 名字:孙鲁育 势力:wu

### remeibu 名字:魅步
描述: 其他角色的出牌阶段开始时，若你在其攻击范围内，你可以弃置一张牌A，该角色于本阶段内拥有〖止息〗，且当其因〖止息〗弃置与牌A花色相同的牌时，你获得之。
```js
remeibu: {
		audio: "meibu",
		trigger: {
			global: "phaseUseBegin",
		},
		filter(event, player) {
			return event.player != player && event.player.isIn() && event.player.inRange(player) && player.countCards("he") > 0;
		},
		direct: true,
		derivation: ["rezhixi"],
		checkx(event, player) {
			if (get.attitude(player, event.player) >= 0) {
				return false;
			}
			return event.player.countCards("h") > event.player.hp;
		},
		async content(event, trigger, player) {
			const check = lib.skill.new_meibu.checkx(trigger, player);
			const result = await player
				.chooseToDiscard(get.prompt2("remeibu", trigger.player), "he")
				.set("ai", card => {
					if (_status.event.check) {
						return 6 - get.value(card);
					}
					return 0;
				})
				.set("check", check)
				.set("logSkill", ["remeibu", trigger.player])
				.forResult();
			if (result.bool) {
				const target = trigger.player;
				const card = result.cards[0];
				player.line(target, "green");
				player.markAuto("remeibu_gain", [get.suit(card, player)]);
				player.addTempSkill("remeibu_gain");
				target.addTempSkills("rezhixi", "phaseUseEnd");
			}
		},
		ai: {
			expose: 0.2,
		},
		subSkill: {
			gain: {
				trigger: { global: "loseAfter" },
				forced: true,
				charlotte: true,
				popup: false,
				onremove: true,
				filter(event, player) {
					return event.getParent(3).name == "rezhixi" && player.getStorage("remeibu_gain").includes(get.suit(event.cards[0], event.player)) && get.position(event.cards[0]) == "d";
				},
				async content(event, trigger, player) {
					player.gain(trigger.cards[0], "gain2");
				},
			},
		},
	}
```

### remumu 名字:穆穆
描述: 出牌阶段开始时，你可以选择一项：1.弃置一名其他角色装备区里的一张牌，然后你本回合可使用【杀】的次数+1；2.获得其他角色装备区里的一张牌，然后你本回合可使用【杀】的次数-1。
```js
remumu: {
		audio: "mumu",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.countCards("e") > 0;
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), function (card, player, target) {
					return target.countCards("e") > 0;
				})
				.set("ai", function (target) {
					const player = _status.event.player;
					const att = get.attitude(player, target);
					const es = target.getCards("e");
					let val = 0;
					let eff;
					for (const i of es) {
						eff = -(get.value(i, target) - 0.1) * att;
						if (eff > val) {
							val = eff;
						}
					}
					return eff;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			let result;
			if (player == target) {
				result = { index: 0 };
			} else {
				const str = get.translation(target);
				result = await player
					.chooseControl()
					.set("choiceList", ["弃置" + str + "装备区的一张牌且本阶段使用【杀】的次数上限+1", "获得" + str + "装备区的一张牌且本阶段使用【杀】的次数上限-1"])
					.set("ai", function () {
						const player = _status.event.player;
						if (
							player.countCards("hs", function (card) {
								return get.name(card, player) == "sha" && player.hasValueTarget(card);
							}) < Math.max(1, player.getCardUsable("sha"))
						) {
							return 1;
						}
						return 0;
					})
					.forResult();
			}
			if (result?.index == 0) {
				player.addTempSkill(`${event.name}_effect`, "phaseUseAfter");
				await player.discardPlayerCard({ target, position: "e", forced: true });
			} else {
				player.addTempSkill(`${event.name}_debuff`, "phaseUseAfter");
				await player.gainPlayerCard({ target, position: "e", forced: true });
			}
		},
		subSkill: {
			debuff: {
				charlotte: true,
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num - 1;
						}
					},
				},
				mark: true,
				intro: {
					markcount: () => -1,
					content: "出杀次数-1",
				},
			},
			effect: {
				charlotte: true,
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + 1;
						}
					},
				},
				mark: true,
				intro: {
					markcount: () => 1,
					content: "出杀次数+1",
				},
			},
		},
	}
```

## re_dongbai 名字:董白 势力:qun

### relianzhu 名字:连诛
描述: 出牌阶段限一次，你可将一张牌正面朝上交给一名其他角色。若此牌为：红色，你摸一张牌；黑色，对方弃置两张牌或令你摸两张牌。
```js
relianzhu: {
		audio: "lianzhu",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		filterCard: true,
		discard: false,
		lose: false,
		delay: false,
		position: "he",
		filterTarget: lib.filter.notMe,
		check(card) {
			var num = get.value(card);
			if (get.color(card) == "black") {
				if (num >= 6) {
					return 0;
				}
				return 9 - num;
			} else {
				return 7 - num;
			}
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			player.give(cards, target, true);
			if (get.color(cards[0], player) == "red") {
				await player.draw();
				return;
			}
			const result = await target
				.chooseToDiscard("he", 2, "弃置两张牌，或令" + get.translation(player) + "摸两张牌")
				.set("goon", get.attitude(target, player) < 0)
				.set("ai", function (card) {
					if (!_status.event.goon) {
						return -get.value(card);
					}
					return 6 - get.value(card);
				})
				.forResult();
			if (!result.bool) {
				await player.draw(2);
			}
		},
		ai: {
			order: 3,
			expose: 0.2,
			result: {
				target(player, target) {
					if (ui.selected.cards.length && get.color(ui.selected.cards[0]) == "red") {
						if (target.countCards("h") < player.countCards("h")) {
							return 1;
						}
						return 0.5;
					}
					return -1;
				},
			},
		},
	}
```

### rexiahui 名字:黠慧
描述: 锁定技，①你的黑色牌不计入手牌上限。②当有其他角色获得你的黑色牌后，其于下次扣减体力值前不能使用，打出，弃置这些牌。③一名其他角色的回合结束时，若其本回合失去过其所有“黠慧”牌，则其失去1点体力。
```js
rexiahui: {
		audio: "xiahui",
		mod: {
			ignoredHandcard(card, player) {
				if (get.color(card, player) == "black") {
					return true;
				}
			},
			cardDiscardable(card, player, name) {
				if (name == "phaseDiscard" && get.color(card, player) == "black") {
					return false;
				}
			},
		},
		trigger: { global: "phaseEnd" },
		forced: true,
		logTarget: "player",
		filter(event, player) {
			var target = event.player;
			return (
				target != player &&
				target.countCards("h", function (card) {
					return card.hasGaintag("rexiahui");
				}) == 0 &&
				target.getHistory("lose", function (evt) {
					for (var i in evt.gaintag_map) {
						if (evt.gaintag_map[i].includes("rexiahui")) {
							return true;
						}
					}
				}).length > 0
			);
		},
		async content(event, trigger, player) {
			trigger.player.loseHp();
		},
		group: "rexiahui_gain",
		subSkill: {
			gain: {
				trigger: { global: "gainEnd" },
				forced: true,
				popup: false,
				filter(event, player) {
					if (player == event.player) {
						return false;
					}
					var evt = event.getl(player);
					return (
						evt &&
						evt.cards2 &&
						evt.cards2.filter(function (card) {
							return get.color(card, player) == "black";
						}).length > 0
					);
				},
				async content(event, trigger, player) {
					trigger.player.addSkill("rexiahui_block");
					var cards = trigger.getl(player).cards2.filter(function (card) {
						return get.color(card, player) == "black";
					});
					trigger.player.addGaintag(cards, "rexiahui");
				},
			},
			block: {
				mod: {
					cardEnabled2(card) {
						if (get.itemtype(card) == "card" && card.hasGaintag("rexiahui")) {
							return false;
						}
					},
					cardDiscardable(card) {
						if (card.hasGaintag("rexiahui")) {
							return false;
						}
					},
				},
				charlotte: true,
				forced: true,
				popup: false,
				trigger: { player: "changeHp" },
				filter(event, player) {
					return event.changedHp < 0;
				},
				async content(event, trigger, player) {
					player.removeSkill("rexiahui_block");
				},
				onremove(player) {
					player.removeGaintag("rexiahui");
				},
			},
		},
	}
```

## zhoushan 名字:周善 势力:wu

### dcmiyun 名字:密运
描述: 锁定技。①每轮开始时，你正面向上获得一名其他角色的一张牌，称为“安”。②每轮结束时，若你有“安”，你将包括“安”的在内的任意张手牌交给一名其他角色，然后你将手牌补至体力上限。③当你不因〖密运②〗失去“安”后，你失去1点体力。
```js
dcmiyun: {
		audio: 2,
		trigger: { global: ["roundStart", "roundEnd"] },
		filter(event, player, name) {
			if (name === "roundStart") {
				return game.hasPlayer(current => current != player && current.countGainableCards(player, "he"));
			}
			return player.hasCard(card => card.hasGaintag("dcmiyun_tag"), "h") && game.hasPlayer(current => current != player);
		},
		forced: true,
		direct: true,
		group: "dcmiyun_lose",
		async content(event, trigger, player) {
			switch (event.triggername) {
				case "roundStart": {
					const result = await player
						.chooseTarget("密运：获得一名其他角色的一张牌，称为“安”", true, (card, player, target) => {
							return target != player && target.countGainableCards(player, "he");
						})
						.set("ai", target => {
							return get.effect(target, { name: "shunshou_copy2" }, _status.event.player, _status.event.player);
						})
						.forResult();
					if (result?.bool && result.targets?.length) {
						const target = result.targets[0];
						player.logSkill("dcmiyun", target);
						const next = player.gainPlayerCard(target, true, "visibleMove");
						next.gaintag.add("dcmiyun_tag");
						await next;
					}
					break;
				}
				case "roundEnd": {
					const result2 = await player
						.chooseCardTarget({
							prompt: "密运：将包括“安”在内的任意张手牌交给一名其他角色",
							forced: true,
							filterTarget: lib.filter.notMe,
							selectCard: [1, Infinity],
							filterOk() {
								for (var card of ui.selected.cards) {
									if (card.hasGaintag("dcmiyun_tag")) {
										return true;
									}
								}
								return false;
							},
							goon: game.hasPlayer(current => player != current && get.attitude(player, current) > 0),
							allowChooseAll: true,
							ai1(card) {
								if (get.itemtype(card) != "card") {
									return 0;
								}
								if (card.hasGaintag("dcmiyun_tag")) {
									return 100;
								}
								if (_status.event.goon) {
									return 8 - get.value(card);
								}
								return -get.value(card);
							},
							ai2(target) {
								return get.attitude(_status.event.player, target);
							},
						})
						.forResult();
					if (result2?.bool && result2.cards?.length && result2.targets?.length) {
						const {
							targets: [target],
							cards,
						} = result2;
						player.logSkill("dcmiyun", target);
						await player.give(cards, target);
						await player.drawTo(player.maxHp);
					}
					break;
				}
			}
		},
		mod: {
			aiValue(player, card, num) {
				if (get.itemtype(card) == "card" && card.hasGaintag("dcmiyun_tag")) {
					return Math.abs(num) * 10;
				}
			},
			aiUseful() {
				return lib.skill.dcmiyun.mod.aiValue.apply(this, arguments);
			},
			aiOrder(player, card, num) {
				if (get.itemtype(card) == "card" && card.hasGaintag("dcmiyun_tag")) {
					return 0;
				}
			},
		},
		subSkill: {
			lose: {
				audio: "dcmiyun",
				trigger: {
					player: "loseAfter",
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				forced: true,
				filter(event, player) {
					if (event.getParent().name == "dcmiyun") {
						return false;
					}
					var evt = event.getl(player);
					if (!evt || !evt.cards2 || !evt.cards2.length) {
						return false;
					}
					if (event.name == "lose") {
						for (var i in event.gaintag_map) {
							if (event.gaintag_map[i].includes("dcmiyun_tag")) {
								return true;
							}
						}
						return false;
					}
					return player.hasHistory("lose", evt => {
						if (event != evt.getParent()) {
							return false;
						}
						for (var i in evt.gaintag_map) {
							if (evt.gaintag_map[i].includes("dcmiyun_tag")) {
								return true;
							}
						}
						return false;
					});
				},
				async content(event, trigger, player) {
					player.loseHp();
				},
			},
		},
	}
```

### dcdanying 名字:胆迎
描述: 每回合限一次。你可以展示“安”，然后视为使用或打出一张【杀】或【闪】。然后当你于本回合下一次成为牌的目标后，使用者弃置你的一张牌。
```js
dcdanying: {
		audio: 2,
		mod: {
			aiOrder(player, card, num) {
				if (num <= 0 || (card.name !== "sha" && card.name !== "shan") || !player.hasCard(i => i.hasGaintag("dcmiyun_tag"), "h")) {
					return;
				}
				return Math.max(0.12, num / 25);
			},
		},
		locked: false,
		enable: ["chooseToUse", "chooseToRespond"],
		usable: 1,
		hiddenCard(player, name) {
			if (!_status.connectMode && !player.hasCard(card => card.hasGaintag("dcmiyun_tag"), "h")) {
				return false;
			}
			return name == "sha" || name == "shan";
		},
		filter(event, player) {
			if (event.type == "wuxie" || !player.hasCard(card => card.hasGaintag("dcmiyun_tag"), "h")) {
				return false;
			}
			for (var name of ["sha", "shan"]) {
				if (event.filterCard({ name: name, isCard: true }, player, event)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				var vcards = [];
				for (var name of ["sha", "shan"]) {
					var card = { name: name, isCard: true };
					if (event.filterCard(card, player, event)) {
						vcards.push(["基本", "", name]);
					}
				}
				var dialog = ui.create.dialog("胆迎", [vcards, "vcard"], "hidden");
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
						player.logSkill("dcdanying");
						player.showCards(
							player.getCards("h", card => card.hasGaintag("dcmiyun_tag")),
							get.translation(player) + "的“安”"
						);
						player.addTempSkill("dcdanying_discard");
					},
				};
			},
			prompt(links, player) {
				return "展示“安”，然后视为使用【" + get.translation(links[0][2]) + "】";
			},
		},
		ai: {
			order(item, player) {
				var o1 = get.order({ name: "sha" }),
					o2 = get.order({ name: "shan" });
				if (player.countCards("h") > 3 || player == _status.currentPhase) {
					return Math.max(o1, o2) + 0.1;
				}
				return Math.min(o1, o2) - 0.1;
			},
			combo: "dcmiyun",
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (!player.hasCard(card => card.hasGaintag("dcmiyun_tag"), "h")) {
					return false;
				}
			},
			result: {
				player: 1,
			},
		},
		subSkill: {
			discard: {
				audio: "dcdanying",
				trigger: { target: "useCardToTargeted" },
				charlotte: true,
				forced: true,
				filter(event, player) {
					return player.countDiscardableCards(event.player, "he");
				},
				async content(event, trigger, player) {
					trigger.player.discardPlayerCard(player, "he", true);
					player.removeSkill("dcdanying_discard");
				},
				ai: {
					effect: {
						target_use(card, player, target) {
							if (_status._dcdanying_aiChecking) {
								return;
							}
							_status._dcdanying_aiChecking = true;
							let eff = get.effect(target, { name: "guohe_copy2" }, player, player);
							delete _status._dcdanying_aiChecking;
							return [1, get.sgn(eff)];
						},
					},
				},
			},
		},
	}
```

## dc_caiyang 名字:蔡阳 势力:wei

### dcxunji 名字:寻嫉
描述: 出牌阶段限一次，你可以选择一名其他角色。该角色的下个结束阶段开始时，若其此回合使用过黑色牌，则你视为对其使用一张【决斗】，且当此【决斗】对其造成伤害后，其对你造成等量的伤害。
```js
dcxunji: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && !player.getStorage("dcxunji_effect").includes(target);
		},
		async content(event, trigger, player) {
			const { target } = event;
			player.markAuto("dcxunji_effect", [target]);
			player.addTempSkill("dcxunji_effect", { player: "die" });
			target.addTempSkill("dcxunji_mark", { player: "phaseEnd" });
		},
		ai: {
			order: 1,
			result: {
				player(player, target) {
					if (player.hp < 2) {
						return 0;
					}
					return get.effect(target, { name: "juedou" }, player, player);
				},
			},
		},
		subSkill: {
			mark: {
				mark: true,
				marktext: "嫉",
				intro: { content: "你已经被盯上了！" },
			},
			effect: {
				audio: "dcxunji",
				charlotte: true,
				trigger: { global: "phaseJieshuBegin" },
				forced: true,
				popup: false,
				onremove: true,
				filter(event, player) {
					return player.getStorage("dcxunji_effect").includes(event.player);
				},
				async content(event, trigger, player) {
					const target = trigger.player;
					if (target.getHistory("useCard", evt => get.color(evt.card) == "black").length > 0 && player.canUse("juedou", target)) {
						await player.useCard({ name: "juedou", isCard: true }, target, event.name);
					}
					player.unmarkAuto(event.name, [target]);
					if (!player.getStorage(event.name).length) {
						player.removeSkill(event.name);
					}
				},
				group: "dcxunji_loseHp",
			},
			loseHp: {
				trigger: { source: "damageSource" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.card && event.card.name == "juedou" && event.getParent().skill == "dcxunji_effect" && event.player.isIn();
				},
				async content(event, trigger, player) {
					trigger.player.line(player);
					player.damage(trigger.num, trigger.player);
				},
			},
		},
	}
```

### dcjiaofeng 名字:交锋
描述: 锁定技。每回合限一次，当你造成伤害时，若你本回合内未造成过其他伤害且你已损失的体力值：大于0，则你摸一张牌；大于1，则此伤害+1；大于2，则你回复1点体力。
```js
dcjiaofeng: {
		audio: 2,
		trigger: { source: "damageBegin1" },
		forced: true,
		usable: 1,
		filter(event, player) {
			return player.isDamaged() && !player.getHistory("sourceDamage").length;
		},
		async content(event, trigger, player) {
			var num = player.getDamagedHp();
			if (num > 0) {
				player.draw();
			}
			if (num > 1) {
				trigger.num++;
			}
			if (num > 2) {
				player.recover();
			}
		},
	}
```

## xiahoujie 名字:夏侯杰 势力:wei

### liedan 名字:裂胆
描述: 锁定技，其他角色的准备阶段开始时，若X大于0，则你摸X张牌。若X等于3，则你加1点体力上限（至多加到8）。若X为0，则你失去1点体力并获得一枚“裂”（X为你的手牌数，体力值，装备区牌数中大于其的数量）。准备阶段，若“裂”数大于4，则你死亡。
```js
liedan: {
		audio: 2,
		trigger: { global: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return player != event.player || player.countMark("liedan") > 4;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			if (player == trigger.player) {
				player.die();
				return;
			}
			var num = 0;
			if (player.hp > trigger.player.hp) {
				num++;
			}
			if (player.countCards("h") > trigger.player.countCards("h")) {
				num++;
			}
			if (player.countCards("e") > trigger.player.countCards("e")) {
				num++;
			}
			if (num) {
				player.draw(num);
				if (num == 3 && player.maxHp < 8) {
					player.gainMaxHp();
				}
			} else {
				player.addMark("liedan", 1);
				player.loseHp();
			}
		},
		intro: { content: "mark" },
		ai: {
			halfneg: true,
		},
	}
```

### zhuangdan 名字:壮胆
描述: 锁定技，其他角色的回合结束时，若你的手牌数为全场唯一最多，则你令〖裂胆〗失效直到你下回合结束。
```js
zhuangdan: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		forced: true,
		filter(event, player) {
			return player != event.player && player.isMaxHandcard(true);
		},
		async content(event, trigger, player) {
			player.addTempSkill("zhuangdan_mark", { player: "phaseEnd" });
			player.tempBanSkill("liedan", { player: "phaseEnd" });
		},
		ai: { combo: "liedan" },
		subSkill: {
			mark: {
				charlotte: true,
				mark: true,
				marktext: "胆",
				intro: { content: "我超勇的" },
			},
		},
	}
```

## caoxing 名字:曹性 势力:qun

### cxliushi 名字:流矢
描述: 出牌阶段，你可以将一张红桃牌置于牌堆顶，视为对一名角色使用一张【杀】（无距离限制且不计入使用次数）。当此【杀】造成伤害后，受到伤害的角色获得一个“流”。有“流”的角色手牌上限-X（X为其“流”数）。
```js
cxliushi: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("he", { suit: "heart" }) > 0;
		},
		filterCard: { suit: "heart" },
		position: "he",
		filterTarget(card, player, target) {
			return player.canUse("sha", target, false);
		},
		check(card) {
			var player = _status.event.player;
			var next = player.getNext();
			var att = get.attitude(player, next);
			if (att > 0) {
				var js = next.getCards("j");
				if (js.length) {
					return get.judge(js[0]) + 10 - get.value(card);
				}
				return 9 - get.value(card);
			}
			return 6 - get.value(card);
		},
		discard: false,
		prepare: "throw",
		loseTo: "cardPile",
		visible: true,
		insert: true,
		async content(event, trigger, player) {
			const { cards, targets } = event;
			game.log(player, "将", cards, "置于牌堆顶");
			await player.useCard({ name: "sha", isCard: true, storage: { cxliushi: true } }, false, targets);
		},
		group: "cxliushi_damage",
		subSkill: {
			damage: {
				trigger: { source: "damageSource" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.card?.storage?.cxliushi == true && event.player.isIn() && event.getParent(3).name == "cxliushi";
				},
				async content(event, trigger, player) {
					trigger.player.addMark("cxliushi2", 1);
					trigger.player.addSkill("cxliushi2");
				},
			},
		},
		ai: {
			order() {
				return get.order({ name: "sha" }) - 0.4;
			},
			result: {
				target(player, target) {
					var eff = get.effect(target, { name: "sha" }, player, target);
					var damageEff = get.damageEffect(target, player, player);
					if (eff > 0) {
						return damageEff > 0 ? 0 : eff;
					}
					if (target.hasSkill("bagua_skill") || target.hasSkill("rw_bagua_skill") || target.hasSkill("bazhen")) {
						return 0;
					}
					return eff;
				},
			},
		},
	}
```

### zhanwan 名字:斩腕
描述: 锁定技，有“流”的角色于弃牌阶段弃牌后，你摸等量的牌，然后其移去所有的“流”。
```js
zhanwan: {
		audio: 2,
		trigger: { global: "phaseDiscardEnd" },
		forced: true,
		filter(event, player) {
			return (
				event.player.hasSkill("cxliushi2") &&
				event.player.getHistory("lose", function (evt) {
					if (evt.type == "discard" && evt.getParent("phaseDiscard") == event) {
						return true;
					}
				}).length > 0
			);
		},
		logTarget: "player",
		async content(event, trigger, player) {
			trigger.player.removeSkill("cxliushi2");
			let num = 0;
			trigger.player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard") == trigger) {
					num += evt.cards2.length;
				}
			});
			await player.draw(num);
		},
		ai: {
			combo: "cxliushi",
		},
	}
```

## re_chunyuqiong 名字:淳于琼 势力:qun

### recangchu 名字:仓储
描述: 锁定技。①游戏开始时，你获得3个“粮”。你的手牌上限+X（X为“粮”数）。②每回合限一次，当你于回合外得到牌后，你获得一个“粮”。（你的“粮”数不能超过存活角色数）
```js
recangchu: {
		audio: 2,
		trigger: { global: "phaseBefore", player: "enterGame" },
		marktext: "粮",
		forced: true,
		filter(event, player) {
			if (event.name == "phase" && game.phaseNumber != 0) {
				return false;
			}
			return player.countMark("recangchu") < game.countPlayer();
		},
		async content(event, trigger, player) {
			player.addMark("recangchu", Math.min(3, game.countPlayer() - player.countMark("recangchu")));
		},
		ai: {
			notemp: true,
		},
		intro: { content: "mark", name: "粮" },
		mod: {
			maxHandcard(player, num) {
				return num + player.countMark("recangchu");
			},
		},
		group: ["recangchu2", "recangchu3"],
	}
```

### reliangying 名字:粮营
描述: 弃牌阶段开始时，你可以摸至多X张牌，然后交给等量的角色各一张牌。（X为你的“粮”数）
```js
reliangying: {
		audio: 2,
		trigger: { player: "phaseDiscardBegin" },
		filter(event, player) {
			return player.hasMark("recangchu");
		},
		direct: true,
		async content(event, trigger, player) {
			const draws = Array.from({ length: player.countMark("recangchu") }).map((_, i) => get.cnNumber(i + 1) + "张");
			const { control } = await player
				.chooseControl(draws, "cancel2")
				.set("prompt", get.prompt("reliangying"))
				.set("prompt2", "摸至多" + get.cnNumber(player.countMark("recangchu")) + "张牌，然后交给等量的角色各一张牌")
				.set("ai", () => {
					const player = get.event().player;
					const num = Math.min(
						player.countMark("recangchu"),
						game.countPlayer(current => get.attitude(player, current) > 0)
					);
					if (num > 0) {
						return get.cnNumber(num) + "张";
					}
					return "cancel2";
				})
				.forResult();
			if (control != "cancel2") {
				player.logSkill("reliangying");
				const num = draws.indexOf(control) + 1,
					max = Math.min(num, player.countCards("he"), game.countPlayer());
				await player.draw(num);
				let list = [];
				if (_status.connectMode) {
					game.broadcastAll(() => (_status.noclearcountdown = true));
				}
				while (max - list.length > 0) {
					const { bool, cards, targets } = await player
						.chooseCardTarget({
							prompt: "粮营：将" + get.cnNumber(max - 1) + "至" + get.cnNumber(max) + "张牌交给其他角色",
							position: "he",
							animate: false,
							filterCard(card, player) {
								return !get.event().list.some(list => list[1] == card);
							},
							filterTarget(card, player, target) {
								return target != player && !get.event().list.some(list => list[0] == target);
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
						.set("forced", max - list.length > 1)
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
		ai: {
			combo: "recangchu",
		},
	}
```

### reshishou 名字:失守
描述: 锁定技，当你使用【酒】时或受到1点火焰伤害后，你移去一个“粮”。准备阶段，若你没有“粮”，你失去1点体力。
```js
reshishou: {
		audio: 2,
		trigger: { player: ["useCard", "damageEnd"] },
		forced: true,
		filter(event, player) {
			if (!player.countMark("recangchu")) {
				return false;
			}
			return event.name == "damage" ? event.hasNature("fire") : event.card && event.card.name == "jiu";
		},
		async content(event, trigger, player) {
			player.removeMark("recangchu", Math.min(player.countMark("recangchu"), trigger.num || 1));
		},
		ai: {
			combo: "recangchu",
			neg: true,
		},
		group: "reshishou2",
	}
```

## xingdaorong 名字:邢道荣 势力:qun

### xuxie 名字:虚猲
描述: 出牌阶段开始时，你可以减1点体力上限并选择所有距离1以内的角色，弃置这些角色的各一张牌或令这些角色各摸一张牌。出牌阶段结束时，若你的体力上限不为全场最多，则你加1点体力上限，然后回复1点体力或摸两张牌。
```js
xuxie: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		logTarget(event, player) {
			return game
				.filterPlayer(function (current) {
					return get.distance(player, current) <= 1;
				})
				.sortBySeat();
		},
		check(event, player) {
			if (player.isHealthy()) {
				return false;
			}
			var list = game.filterPlayer(function (current) {
				return get.distance(player, current) <= 1;
			});
			var draw = 0;
			var discard = 0;
			var num = 2 / player.getDamagedHp();
			while (list.length) {
				var target = list.shift();
				var att = get.attitude(player, target);
				if (att > 0) {
					draw++;
					if (target.countDiscardableCards(player, "he") > 0) {
						discard--;
					}
				}
				if (att == 0) {
					draw--;
					if (target.countDiscardableCards(player, "he") > 0) {
						discard--;
					}
				}
				if (att < 0) {
					draw--;
					if (target.countDiscardableCards(player, "he") > 0) {
						discard++;
					}
				}
			}
			return draw >= num || discard >= num;
		},
		async content(event, trigger, player) {
			await player.loseMaxHp();
			const targets = game
				.filterPlayer(function (current) {
					return get.distance(player, current) <= 1;
				})
				.sortBySeat();
			if (!targets.length) {
				return;
			}

			event.targets = targets;
			const result = await player
				.chooseControl()
				.set("choiceList", ["弃置" + get.translation(targets) + "的各一张牌", "令" + get.translation(targets) + "各摸一张牌"])
				.set("ai", function () {
					let player = _status.event.player;
					let list = _status.event.getParent().targets.slice(0);
					let draw = 0;
					let discard = 0;
					while (list.length) {
						let target = list.shift();
						let att = get.attitude(player, target);
						if (att > 0) {
							draw++;
							if (target.countDiscardableCards(player, "he") > 0) {
								discard--;
							}
						}
						if (att < 0) {
							draw--;
							if (target.countDiscardableCards(player, "he") > 0) {
								discard++;
							}
						}
					}
					if (draw > discard) {
						return 1;
					}
					return 0;
				})
				.forResult();

			if (result.index == 1) {
				await game.asyncDraw(targets);
				await game.delay();
				return;
			}

			while (targets.length) {
				const target = targets.shift();
				if (target.countDiscardableCards(player, "he") > 0) {
					await player.discardPlayerCard(target, "he", true);
				}
			}
		},
		group: "xuxie_add",
		subSkill: {
			add: {
				audio: "xuxie",
				trigger: { player: "phaseUseEnd" },
				forced: true,
				locked: false,
				filter(event, player) {
					return game.hasPlayer(function (current) {
						return current.maxHp > player.maxHp;
					});
				},
				async content(event, trigger, player) {
					player.gainMaxHp();
					player.chooseDrawRecover(2, true);
				},
			},
		},
	}
```

## dc_xiahouen 名字:新杀夏侯恩 势力:wei

### chijian 名字:持剑
描述: `锁定技。①你于出牌阶段内使用【杀】的次数上限+1。②若你的武器栏为空，视为你装备着${get.poptip("qinggang")}。`
```js
chijian: {
		audio: 2,
		init(player, skill) {
			player.addExtraEquip(skill, "qinggang", true, player => player.hasEmptySlot(1) && lib.card.qinggang);
		},
		onremove(player, skill) {
			player.removeExtraEquip(skill);
		},
		mod: {
			cardUsable(card, player, num) {
				if (card.name === "sha" && player.isPhaseUsing()) return num + 1;
			},
		},
		group: "chijian_qinggang",
		subSkill: {
			qinggang: {
				mod: {
					attackRangeBase(player) {
						const num = lib.card.qinggang.distance.attackFrom;
						if (typeof num != "number" || !player.hasEmptySlot(1)) {
							return;
						}
						return Math.max(player.getEquipRange(player.getCards("e")), 1 - num);
					},
				},
				audio: "chijian",
				inherit: "qinggang_skill",
				filter(event, player) {
					if (!player.hasEmptySlot(1)) return false;
					return event.card.name == "sha";
				},
			},
		},
	}
```

### shiwu 名字:恃武
描述: `①其他角色的回合开始时，你可以视为对其使用【决斗】，若你以此法对其造成伤害，你从牌堆中获得一张伤害牌；若其以此法对你造成伤害，直到其回合结束，其获得${get.poptip("chijian")}且你失去${get.poptip("chijian")}。②一名角色杀死你后，其获得${get.poptip("chijian")}。`
```js
shiwu: {
		audio: 2,
		trigger: { global: "phaseBegin" },
		filter(event, player) {
			if (event.player === player) return false;
			const juedou = new lib.element.VCard({ name: "juedou", isCard: true });
			return player.canUse(juedou, event.player);
		},
		prompt2(event, player) {
			return `视为对${get.translation(event.player)}使用【决斗】，失败则本回合抢走你的剑`;
		},
		check(event, player) {
			const juedou = new lib.element.VCard({ name: "juedou", isCard: true });
			const target = event.player;
			const shas = target.mayHaveSha(player, "respond", null, "count") - player.mayHaveSha(player, "respond", null, "count");
			return get.effect(target, juedou, player, player) > 0 && get.attitude(player, target) <= 0 && shas <= 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const target = trigger.player;
			const next = player.useCard({
				card: new lib.element.VCard({ name: "juedou", isCard: true }),
				targets: [target],
			});
			await next;
			if (player.hasHistory("sourceDamage", evt => evt.getParent(2) == next && evt.player === target)) {
				const card = get.cardPile(card => get.is.damageCard(card), "bottom");
				if (card) await player.gain(card, "draw");
			}
			if (target.hasHistory("sourceDamage", evt => evt.getParent(2) == next && evt.player === player)) {
				await target.addTempSkills("chijian", { player: "phaseEnd" });
				await player.removeSkills("chijian");
				target.when({ player: "phaseEnd" }).step(async () => {
					await player.addSkills("chijian");
				});
			}
		},
		group: "shiwu_lose",
		derivation: "chijian",
		subSkill: {
			lose: {
				audio: "shiwu",
				trigger: { player: "dieAfter" },
				filter(event, player) {
					return event.source?.isIn();
				},
				forced: true,
				locked: false,
				forceDie: true,
				async content(event, trigger, player) {
					await trigger.source.addSkills("chijian");
				},
			},
		},
	}
```

## re_panfeng 名字:潘凤 势力:qun

### xinkuangfu 名字:狂斧
描述: 出牌阶段限一次，你可选择：1，弃置装备区里的一张牌，你使用无对应实体牌的普【杀】。若此【杀】造成伤害，你摸两张牌。2，弃置一名其他角色装备区里的一张牌，你使用无对应实体牌的普【杀】。若此【杀】未造成伤害，你弃置两张手牌。（均无距离和次数限制）
```js
xinkuangfu: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		delay: false,
		filterTarget(card, player, target) {
			if (player == target) {
				return (
					player.countCards("e", function (card) {
						return lib.filter.cardDiscardable(card, player);
					}) > 0
				);
			}
			return target.countDiscardableCards(player, "e") > 0;
		},
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.countCards("e") > 0;
			});
		},
		useShaValue(player) {
			let cache = _status.event.getTempCache("xinkuangfu", "useShaValue");
			if (cache) {
				return cache;
			}
			let eff = -Infinity,
				odds = 0,
				tar = null;
			game.countPlayer(cur => {
				if (!player.canUse("sha", cur, false)) {
					return;
				}
				let eff2 = get.effect(cur, { name: "sha" }, player, player);
				if (eff2 < eff) {
					return;
				}
				let directHit = 1 - cur.mayHaveShan(player, "use", true, "odds");
				if (get.attitude(player, cur) > 0) {
					directHit = 1;
				} else {
					eff2 *= directHit;
				}
				if (eff2 <= eff) {
					return;
				}
				tar = cur;
				eff = eff2;
				odds = directHit;
			});
			_status.event.putTempCache("xinkuangfu", "useShaValue", {
				tar,
				eff,
				odds,
			});
			return { tar, eff, odds };
		},
		async content(event, trigger, player) {
			const target = event.target;
			if (player == target) {
				await player.chooseToDiscard("e", true);
			} else {
				await player.discardPlayerCard(target, "e", true);
			}
			await player.chooseUseTarget("sha", true, false, "nodistance");
			const bool = game.hasPlayer2(current => {
				return current.getHistory("damage", evt => evt.getParent("xinkuangfu") == event).length > 0;
			});
			if (player == target && bool) {
				await player.draw(2);
			} else if (player != target && !bool) {
				await player.chooseToDiscard("h", 2, true);
			}
		},
		ai: {
			order() {
				return get.order({ name: "sha" }) - 0.3;
			},
			result: {
				player(player, target) {
					let cache = lib.skill.xinkuangfu.useShaValue(player),
						eff = cache.eff / 10;
					if (player === target) {
						return 2 * cache.odds + eff;
					}
					return Math.min(2, player.countCards("h")) * (cache.odds - 1) + eff;
				},
				target(player, target) {
					let att = get.attitude(player, target),
						max = 0,
						min = 1;
					target.countCards("e", function (card) {
						var val = get.value(card, target);
						if (val > max) {
							max = val;
						}
						if (val < min) {
							min = val;
						}
					});
					if (att <= 0) {
						if (target.hasSkillTag("noe")) {
							return 2 - max / 3;
						}
						if (min <= 0) {
							return 1;
						}
						return -max / 3;
					}
					if (target.hasSkillTag("noe")) {
						return 2 - min / 4;
					}
					if (min <= 0) {
						return 1;
					}
					if (player === target) {
						let cache = lib.skill.xinkuangfu.useShaValue(player);
						return cache.eff / 10 - 1;
					}
					return 0;
				},
			},
		},
	}
```

## jiangfei 名字:蒋琬费祎 势力:shu

### reshengxi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcshoucheng 名字:守成
描述: 每回合限一次，当一名角色于其回合外失去手牌后，若其没有手牌，你可令其摸两张牌。
```js
dcshoucheng: {
		audio: "shoucheng",
		global: "dcshoucheng_ai",
		trigger: {
			global: ["equipAfter", "addJudgeAfter", "loseAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			const target = _status.currentPhase;
			return game.hasPlayer(current => {
				if (target && current == target) {
					return false;
				}
				let evt = event.getl(current);
				return evt && evt.hs && evt.hs.length && current.countCards("h") == 0;
			});
		},
		async cost(event, trigger, player) {
			const targetx = _status.currentPhase;
			const targets = game
				.filterPlayer(current => {
					if ((targetx && current == targetx) || !current.isIn()) {
						return false;
					}
					let evt = trigger.getl(current);
					return evt && evt.hs && evt.hs.length && current.countCards("h") == 0;
				})
				.sortBySeat(targetx || player);
			event.result = await player
				.chooseTarget("是否对" + (targets.length > 1 ? "其中一名角色" : get.translation(targets[0])) + "发动【守成】？", "令其摸两张牌", (card, player, target) => {
					return get.event().targets.includes(target);
				})
				.set("targets", targets)
				.set("ai", target => get.attitude(get.event().player, target))
				.forResult();
		},
		usable: 1,
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (get.mode() != "identity" || player.identity != "nei") {
				player.addExpose(0.2);
			}
			target.draw(2);
		},
		subSkill: {
			ai: {
				ai: {
					noh: true,
					skillTagFilter(player, tag, arg) {
						if (player === _status.currentPhase || player.countCards("h") != 1) {
							return false;
						}
						return game.hasPlayer(current => {
							return current.hasSkill("dcshoucheng") && get.attitude(current, player) > 0;
						});
					},
				},
			},
		},
	}
```

