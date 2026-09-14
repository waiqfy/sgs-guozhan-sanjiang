# yingbian merged reference

## chengjichengcui 名字:成济成倅 势力:wei

### oltousui 名字:透髓
描述: 你可以将任意张牌置于牌堆底，视为使用一张需使用等量张【闪】抵消的【杀】。
```js
oltousui: {
		audio: 2,
		enable: "chooseToUse",
		viewAsFilter(player) {
			return player.countCards("he") > 0;
		},
		viewAs: {
			name: "sha",
			/*suit: "none",
			number: null,*/
			cards: [],
			isCard: true,
		},
		filterCard: true,
		selectCard: [1, Infinity],
		position: "he",
		check(card) {
			const player = get.player();
			return 4.5 + (player.hasSkill("olchuming") ? 1 : 0) - 1.5 * ui.selected.cards.length - get.value(card);
		},
		popname: true,
		ignoreMod: true,
		log: false,
		allowChooseAll: true,
		async precontent(event, trigger, player) {
			var evt = event.getParent();
			if (evt.dialog && typeof evt.dialog == "object") {
				evt.dialog.close();
			}
			player.logSkill("oltousui");
			var cards = event.result.cards;
			await player.loseToDiscardpile(cards, ui.cardPile, false, "blank").set("log", false);
			var shownCards = cards.filter(i => get.position(i) == "e"),
				handcardsLength = cards.length - shownCards.length;
			if (shownCards.length) {
				player.$throw(shownCards, null);
				game.log(player, "将", shownCards, "置于了牌堆底");
			}
			if (handcardsLength > 0) {
				player.$throw(handcardsLength, null);
				game.log(player, "将", get.cnNumber(handcardsLength), "张牌置于了牌堆底");
			}
			await game.delayex();
			var viewAs = new lib.element.VCard({ name: event.result.card.name, isCard: true });
			event.result.card = viewAs;
			event.result.cards = [];
			event.result._apply_args = {
				shanReq: cards.length,
				oncard: () => {
					var evt = get.event();
					for (var target of game.filterPlayer(null, null, true)) {
						var id = target.playerid;
						var map = evt.customArgs;
						if (!map[id]) {
							map[id] = {};
						}
						map[id].shanRequired = evt.shanReq;
					}
				},
			};
		},
		ai: {
			order(item, player) {
				return get.order({ name: "sha" }) + 0.1;
			},
			result: { player: 1 },
			keepdu: true,
			respondSha: true,
			skillTagFilter: (player, tag, arg) => {
				if (tag == "respondSha" && arg === "respond") {
					return false;
				}
			},
		},
	}
```

### olchuming 名字:畜鸣
描述: 锁定技。当你对其他角色造成伤害时，或当你受到其他角色造成的伤害时，若此伤害的渠道不为牌或没有对应的实体牌，此伤害+1，否则其于本回合结束时将所有以此法造成伤害的牌当【借刀杀人】或【过河拆桥】对你使用。
```js
olchuming: {
		audio: 2,
		trigger: {
			source: "damageBegin1",
			player: "damageBegin3",
		},
		filter(event, player) {
			if (event.source === event.player) {
				return false;
			}
			if (!event.card || !event.cards || !event.cards.length) {
				return true;
			}
			let target = event[player === event.source ? "player" : "source"];
			return target && target.isIn();
		},
		forced: true,
		async content(event, trigger, player) {
			if (!trigger.card || !trigger.cards || !trigger.cards.length) {
				trigger.num++;
				event.finish();
				return;
			} else {
				var target = trigger[trigger.source == player ? "player" : "source"];
				trigger._olchuming = true;
				target.addTempSkill("olchuming_effect");
			}
		},
		ai: {
			effect: {
				player(card, player, target) {
					if (!get.tag(card, "damage")) {
						return;
					}
					if (!lib.card[card.name] || !card.cards || !card.cards.length) {
						return [1, 0, 2, 0];
					}
					return [1, -1];
				},
				target(card, player, target) {
					if (!get.tag(card, "damage")) {
						return;
					}
					if (!lib.card[card.name] || !card.cards || !card.cards.length) {
						return 2;
					}
					return [1, -1];
				},
			},
			combo: "oltousui",
			halfneg: true,
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { global: "phaseEnd" },
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					var mapx = {};
					var history = player.getHistory("damage").concat(player.getHistory("sourceDamage"));
					history.forEach(evt => {
						if (!evt._olchuming) {
							return;
						}
						var target = evt[evt.source == player ? "player" : "source"];
						if (!target.isIn()) {
							return;
						}
						var cards = evt.cards.filterInD("d");
						if (!cards.length) {
							return;
						}
						if (!mapx[target.playerid]) {
							mapx[target.playerid] = [];
						}
						mapx[target.playerid].addArray(cards);
					});
					var entries = Object.entries(mapx).map(entry => {
						return [(_status.connectMode ? lib.playerOL : game.playerMap)[entry[0]], entry[1]];
					});
					if (!entries.length) {
						event.finish();
						return;
					}
					player.logSkill(
						"olchuming_effect",
						entries.map(i => i[0])
					);
					entries.sort((a, b) => lib.sort.seat(a[0], b[0]));
					for (var entry of entries) {
						var current = entry[0],
							cards = entry[1];
						var list = ["jiedao", "guohe"].filter(i => player.canUse(new lib.element.VCard({ name: i, cards: cards }), current, false));
						if (!list.length) {
							return;
						}
						var result = {};
						if (list.length == 1) {
							result = { bool: true, links: [["", "", list[0]]] };
						} else {
							result = await player
								.chooseButton([`畜鸣：请选择要对${get.translation(current)}使用的牌`, [list, "vcard"]], true)
								.set("ai", button => {
									var player = get.player();
									return get.effect(get.event().currentTarget, { name: button.link[2] }, player, player);
								})
								.set("currentTarget", current)
								.forResult();
						}
						if (result.bool) {
							var card = get.autoViewAs({ name: result.links[0][2] }, cards);
							if (player.canUse(card, current, false)) {
								player.useCard(card, cards, current, false);
							}
						}
					}
				},
			},
		},
	}
```

## wangxiang 名字:王祥 势力:jin

### bingxin 名字:冰心
描述: 每种牌名每回合限一次。当你需要使用基本牌时，若你的手牌数等于体力值且这些牌的颜色均相同，则你可以摸一张牌，视为使用一张基本牌。
```js
bingxin: {
		audio: 2,
		enable: "chooseToUse",
		hiddenCard(player, name) {
			if (get.type(name) == "basic" && lib.inpile.includes(name) && !player.getStorage("bingxin_count").includes(name)) {
				return true;
			}
		},
		filter(event, player) {
			if (event.type == "wuxie") {
				return false;
			}
			var hs = player.getCards("h");
			if (hs.length != Math.max(0, player.hp)) {
				return false;
			}
			if (hs.length > 1) {
				var color = get.color(hs[0], player);
				for (var i = 1; i < hs.length; i++) {
					if (get.color(hs[i], player) != color) {
						return false;
					}
				}
			}
			var storage = player.storage.bingxin_count;
			for (var i of lib.inpile) {
				if (get.type(i) != "basic") {
					continue;
				}
				if (storage && storage.includes(i)) {
					continue;
				}
				var card = { name: i, isCard: true };
				if (event.filterCard(card, player, event)) {
					return true;
				}
				if (i == "sha") {
					for (var j of lib.inpile_nature) {
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
				var list = [];
				var storage = player.storage.bingxin_count;
				for (var i of lib.inpile) {
					if (get.type(i) != "basic") {
						continue;
					}
					if (storage && storage.includes(i)) {
						continue;
					}
					var card = { name: i, isCard: true };
					if (event.filterCard(card, player, event)) {
						list.push(["基本", "", i]);
					}
					if (i == "sha") {
						for (var j of lib.inpile_nature) {
							card.nature = j;
							if (event.filterCard(card, player, event)) {
								list.push(["基本", "", i, j]);
							}
						}
					}
				}
				return ui.create.dialog("冰心", [list, "vcard"], "hidden");
			},
			check(button) {
				if (button.link[2] == "shan") {
					return 3;
				}
				var player = _status.event.player;
				if (button.link[2] == "jiu") {
					if (player.getUseValue({ name: "jiu" }) <= 0) {
						return 0;
					}
					if (player.countCards("h", "sha")) {
						return player.getUseValue({ name: "jiu" });
					}
					return 0;
				}
				return player.getUseValue({ name: button.link[2], nature: button.link[3] }) / 4;
			},
			backup(links, player) {
				return {
					selectCard: -1,
					filterCard: () => false,
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						isCard: true,
					},
					log: false,
					async precontent(event, trigger, player) {
						player.logSkill("bingxin");
						await player.draw();
						const name = event.result.card?.name;
						player.addTempSkill("bingxin_count");
						player.markAuto("bingxin_count", [name]);
					},
				};
			},
			prompt(links, player) {
				var name = links[0][2];
				var nature = links[0][3];
				return "摸一张并视为使用" + (get.translation(nature) || "") + get.translation(name);
			},
		},
		ai: {
			order: 10,
			respondShan: true,
			respondSha: true,
			skillTagFilter(player, tag, arg) {
				if (arg == "respond") {
					return false;
				}
				var hs = player.getCards("h");
				if (hs.length != Math.max(0, hs.length)) {
					return false;
				}
				if (hs.length > 1) {
					var color = get.color(hs[0], player);
					for (var i = 1; i < hs.length; i++) {
						if (get.color(hs[i], player) != color) {
							return false;
						}
					}
				}
				var storage = player.storage.bingxin_count;
				if (storage && storage.includes("s" + tag.slice(8))) {
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
		subSkill: { count: { charlotte: true, onremove: true } },
	}
```

## jin_jiachong 名字:晋贾充 势力:jin

### xiongshu 名字:凶竖
描述: 其他角色的出牌阶段开始时，你可弃置X张牌（X为你本轮内此前已发动过此技能的次数，为0则不弃）并展示其一张手牌，然后你预测“其本阶段内是否会使用与展示牌牌名相同的牌”。此阶段结束时，若你的预测正确，则你对其造成1点伤害；否则你获得展示牌。
```js
xiongshu: {
		audio: 2,
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return player != event.player && event.player.countCards("h") > 0 && player.countCards("he") >= player.countMark("xiongshu_count");
		},
		logTarget: "player",
		async cost(event, trigger, player) {
			const { player: target } = trigger;
			const num = player.countMark("xiongshu_count");
			const goon = get.attitude(player, target) < 0;
			let next;
			if (num > 0) {
				next = player
					.chooseToDiscard("he", num, get.prompt(event.skill, target), `弃置${get.cnNumber(num)}张牌并展示其一张手牌`, "chooseonly")
					.set("goon", goon)
					.set("ai", card => {
						const { player, goon } = get.event();
						if (!goon) {
							return 0;
						}
						return 6 - player.countMark("xiongshu_count") - get.value(card);
					});
			} else {
				next = player
					.chooseBool(get.prompt(event.skill, target), "展示其一张牌")
					.set("goon", goon)
					.set("ai", () => {
						return get.event().goon;
					});
			}
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cards,
				name: skillName,
			} = event;
			player.addTempSkill(skillName + "_count", "roundStart");
			player.addMark(skillName + "_count", 1, false);
			if (get.itemtype(cards) == "cards") {
				await player.discard(cards);
			}
			if (!target.countCards("h")) {
				return;
			}
			let result = await player.choosePlayerCard(target, true, "h").forResult();
			if (!result?.cards?.length) {
				return;
			}
			const [card] = result.cards,
				name = get.name(card),
				str = get.translation(target);
			await player.showCards(card, get.translation(player) + "对" + str + "发动了【凶竖】");
			result = await player
				.chooseControl("会使用", "不会使用")
				.set("prompt", "预测：" + str + "是否会使用" + get.translation(name) + "？")
				.set(
					"choice",
					(() => {
						if (!target.hasValueTarget(card)) {
							return 1;
						}
						return Math.random() < 0.5 ? 0 : 1;
					})()
				)
				.set("ai", () => get.event().choice)
				.forResult();
			if (typeof result?.index != "number") {
				return;
			}
			const { index } = result;
			if (Math.random() < 0.5) {
				target.storage.xiongshu_ai = name;
				target.addTempSkill("xiongshu_ai", "phaseUseAfter");
			}
			player
				.when({ global: "phaseUseEnd" })
				.filter(evt => evt == trigger)
				.step(async () => {
					if (target.hasHistory("useCard", evt => evt.card.name == name && evt.getParent("phaseUse") == trigger) == (index == 0)) {
						if (target.isIn()) {
							await target.damage();
						}
					} else {
						if (target.getCards("hej").includes(card)) {
							await player.gain(card, target, "give");
						} else if (get.position(card, true) == "d") {
							await player.gain(card, "gain2");
						}
					}
				})
				.assign({ audio: "xiongshu", popup: true })
				.translation("凶竖");
		},
		ai: { expose: 0.35 },
		subSkill: {
			ai: {
				charlotte: true,
				onremove: true,
				ai: {
					effect: {
						player_use(card, player, target) {
							if (card.name == player.storage.xiongshu_ai) {
								return "zeroplayertarget";
							}
						},
					},
				},
			},
			count: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

### jianhui 名字:奸回
描述: 锁定技。你记录上次对你造成伤害的其他角色。当你对其造成伤害后，你摸一张牌；当你受到其造成的伤害后，其弃置一张牌。
```js
jianhui: {
		init(player, skill) {
			player.addSkill(skill + "_record");
			const source = player.getAllHistory("damage", evt => evt.source && evt.source != player).lastItem?.source;
			if (source) {
				player.storage[skill] = source;
				player.markSkillCharacter(skill, source, "奸回", "这仇我记下了");
				player.addTip(skill, `${get.translation(skill)} ${get.translation(source)}`);
			}
		},
		onremove(player, skill) {
			delete player.storage[skill];
			player.removeSkill(skill + "_record");
			player.removeTip(skill);
		},
		audio: 2,
		getLastPlayer(evt, player) {
			var history = player.getAllHistory("damage");
			if (!history.length) {
				return null;
			}
			var i = history.indexOf(evt);
			if (i == -1) {
				i = history.length - 1;
			} else {
				i--;
			}
			for (i; i >= 0; i--) {
				if (history[i].source && history[i].source != player) {
					return history[i].source;
				}
			}
			return null;
		},
		trigger: { player: "damageEnd" },
		forced: true,
		filter(event, player) {
			return event.source?.isIn() && event.source == lib.skill.jianhui.getLastPlayer(event, player) && event.source.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			await trigger.source.chooseToDiscard("he", true);
		},
		group: "jianhui_draw",
		subSkill: {
			draw: {
				audio: "jianhui",
				trigger: { source: "damageSource" },
				forced: true,
				logTarget: "player",
				filter(event, player) {
					return event.player == lib.skill.jianhui.getLastPlayer(event, player);
				},
				async content(event, trigger, player) {
					await player.draw();
				},
			},
			record: {
				charlotte: true,
				trigger: { player: "damageEnd" },
				filter(event, player) {
					return event.source && event.source !== player.storage.jianhui && (player.getAllHistory("damage", evt => evt.source && evt.source != player).indexOf(event) == 0 || event.source == lib.skill.jianhui.getLastPlayer(event, player));
				},
				firstDo: true,
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const { source } = trigger;
					player.storage.jianhui = source;
					player.markSkillCharacter("jianhui", source, "奸回", "这仇我记下了");
					player.addTip("jianhui", `${get.translation("jianhui")} ${get.translation(source)}`);
				},
			},
		},
	}
```

## xuangongzhu 名字:晋宣公主 势力:jin

### gaoling 名字:高陵
描述: 隐匿技。当你于回合外明置此武将牌时，你可以令一名角色回复1点体力。
```js
gaoling: {
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		hiddenSkill: true,
		filter(event, player) {
			return event.toShow?.some(i => get.character(i).skills?.includes("gaoling")) && player !== _status.currentPhase && game.hasPlayer(current => current.isDamaged());
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return target.isDamaged();
				})
				.set("ai", target => {
					const player = get.player();
					return get.recoverEffect(target, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await event.targets[0].recover();
		},
	}
```

### qimei 名字:齐眉
描述: 准备阶段，你可以选择一名其他角色。你获得如下效果直到下回合开始：①每回合限一次，当你或其获得牌/失去手牌后，若你与其手牌数相等，则另一名角色摸一张牌。②每回合限一次，当你或其的体力值变化后，若你与其体力值相等，则另一名角色摸一张牌。
```js
qimei: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "选择一名其他角色并获得“齐眉”效果", lib.filter.notMe)
				.set("ai", target => {
					const player = get.player();
					return get.attitude(player, target) / (Math.abs(player.countCards("h") + 2 - target.countCards("h")) + 1);
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.storage.qimei_draw = target;
			player.addTempSkill("qimei_draw", { player: "phaseBegin" });
			await game.delayx();
		},
		subSkill: {
			draw: {
				audio: "qimei",
				charlotte: true,
				forced: true,
				popup: false,
				trigger: { global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "loseAfter", "addToExpansionAfter"] },
				usable: 1,
				filter(event, player) {
					const target = player.storage.qimei_draw;
					if (!target || !target.isIn()) {
						return false;
					}
					if (player.countCards("h") != target.countCards("h")) {
						return false;
					}
					const hasChange = function (event, player) {
						let gain = 0,
							lose = 0;
						if (event.getg) {
							gain = event.getg(player).length;
						}
						if (event.getl) {
							lose = event.getl(player).hs.length;
						}
						return gain != lose;
					};
					return hasChange(event, player) || hasChange(event, target);
				},
				logTarget(event, player) {
					return player.storage.qimei_draw;
				},
				async content(event, trigger, player) {
					if (trigger.delay === false) {
						await game.delayx();
					}
					const target = event.targets[0];
					const drawer = [];
					const hasChange = function (event, player) {
						let gain = 0,
							lose = 0;
						if (event.getg) {
							gain = event.getg(player).length;
						}
						if (event.getl) {
							lose = event.getl(player).hs.length;
						}
						return gain != lose;
					};
					if (hasChange(trigger, player)) {
						drawer.push(target);
					}
					if (hasChange(trigger, target)) {
						drawer.push(player);
					}
					if (drawer.length == 1) {
						await drawer[0].draw();
					} else {
						await game.asyncDraw(drawer.sortBySeat());
						await game.delayex();
					}
				},
				group: "qimei_hp",
				onremove: true,
				mark: "character",
				intro: { content: "已和$组成齐眉组合" },
			},
			hp: {
				audio: "qimei",
				trigger: { global: "changeHpAfter" },
				charlotte: true,
				forced: true,
				logTarget(event, player) {
					return player.storage.qimei_draw;
				},
				usable: 1,
				filter(event, player) {
					if (event.changedHp == 0) {
						return false;
					}
					const target = player.storage.qimei_draw;
					if (!target || !target.isIn()) {
						return false;
					}
					if (player != event.player && target != event.player) {
						return false;
					}
					return player.hp == target.hp;
				},
				async content(event, trigger, player) {
					const current = player == trigger.player ? player.storage.qimei_draw : player;
					const next = current.draw();
					await game.delayx();
					await next;
				},
			},
		},
	}
```

### ybzhuiji 名字:追姬
描述: 出牌阶段开始时，你可选择一项：①摸两张牌，并于出牌阶段结束时失去1点体力；②回复1点体力，并于出牌阶段结束时弃置两张牌。
```js
ybzhuiji: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		direct: true,
		preHidden: true,
		async content(event, trigger, player) {
			const list = ["摸两张牌，并于出牌阶段结束时失去1点体力"];
			if (player.isDamaged()) {
				list.push("回复1点体力，并于出牌阶段结束时弃置两张牌");
			}
			const result = await player
				.chooseControl({ controls: ["cancel2"] })
				.set("choiceList", list)
				.set("prompt", get.prompt("ybzhuiji"))
				.set("ai", () => {
					const currentPlayer = _status.event.player;
					if (currentPlayer.isDamaged() && currentPlayer.countCards("h", "tao") < currentPlayer.getDamagedHp()) {
						return 1;
					}
					return "cancel2";
				})
				.setHiddenSkill("ybzhuiji")
				.forResult();
			if (result.control === "cancel2") {
				return;
			}
			player.logSkill("ybzhuiji");
			if (result.index === 0) {
				await player.draw(2);
			} else {
				await player.recover();
			}
			player.addTempSkill(`ybzhuiji_${result.index}`, "phaseUseAfter");
		},
		subSkill: {
			0: {
				audio: "ybzhuiji",
				trigger: { player: "phaseUseEnd" },
				forced: true,
				charlotte: true,
				async content(event, trigger, player) {
					await player.loseHp();
				},
			},
			1: {
				audio: "ybzhuiji",
				trigger: { player: "phaseUseEnd" },
				forced: true,
				charlotte: true,
				async content(event, trigger, player) {
					await player.chooseToDiscard({
						selectCard: 2,
						position: "he",
						forced: true,
					});
				},
			},
		},
	}
```

## xinchang 名字:辛敞 势力:jin

### canmou 名字:参谋
描述: 一名角色使用普通锦囊牌指定第一个目标时，若其手牌数为全场唯一最多，则你可以为此牌增加一个额外目标。
```js
canmou: {
		audio: 2,
		trigger: { global: "useCardToPlayer" },
		filter(event, player) {
			if (!event.player.isMaxHandcard(true) || !event.isFirstTarget || get.type(event.card, null, false) !== "trick") {
				return false;
			}
			const info = get.info(event.card);
			if (info.allowMultiple === false) {
				return false;
			}
			if (event.targets && !info.multitarget) {
				if (game.hasPlayer(current => !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, event.player, current))) {
					return true;
				}
			}
			return false;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt("canmou"),
					prompt2: `为${get.translation(trigger.card)}增加一个目标`,
					filterTarget(_card, player, target) {
						const { card, source, targets } = get.event();
						return !targets.includes(target) && lib.filter.targetEnabled2(card, source, target);
					},
					ai(target) {
						const { card, source, player } = get.event();
						return get.effect(target, card, source, player);
					},
				})
				.set("targets", trigger.targets)
				.set("card", trigger.card)
				.set("source", trigger.player)
				.setHiddenSkill(event.name)
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			if (!event.isMine() && !event.isOnline()) {
				await game.delayx();
			}
			trigger.targets.addArray(event.targets);
			game.log(event.targets, "也成为了", trigger.card, "的目标");
		},
	}
```

### congjian 名字:从鉴
描述: 一名其他角色成为普通锦囊牌的唯一目标时，若其体力值为全场唯一最多，则你也可以成为此牌的目标。此牌结算结束后，若你受到过渠道为此牌的伤害，则你摸两张牌。
```js
congjian: {
		audio: 2,
		trigger: { global: "useCardToTarget" },
		logTarget: "target",
		filter(event, player) {
			return event.target !== player && event.targets.length === 1 && get.type(event.card, null, false) === "trick" && event.target.isMaxHp(true) && lib.filter.targetEnabled2(event.card, event.player, player);
		},
		check(event, player) {
			return get.effect(player, event.card, event.player, player) > 0;
		},
		preHidden: true,
		async content(event, trigger, player) {
			trigger.targets.push(player);
			game.log(player, "也成为了", trigger.card, "的目标");
			const next = game.createEvent("congjian_draw", false);
			next.player = player;
			event.next.remove(next);
			trigger.getParent()?.after.push(next);
			next.setContent(async (event, _trigger, player) => {
				if (!player.hasHistory("damage", evt => evt.card === event.parent.card)) {
					return;
				}
				await player.draw(2);
			});
		},
	}
```

## yangzhi 名字:杨芷 势力:jin

### xinwanyi 名字:婉嫕
描述: ①当你使用【杀】或普通锦囊牌指定其他角色为唯一目标后，你可将其的一张牌置于你的武将牌上作为“嫕”。②你不能使用/打出/弃置与“嫕”花色相同的牌。③结束阶段或当你受到伤害后，你令一名角色获得你的一张“嫕”。
```js
xinwanyi: {
		audio: "wanyi",
		trigger: { player: "useCardToTargeted" },
		filter(event, player) {
			return player !== event.target && event.targets.length === 1 && (event.card.name === "sha" || get.type(event.card, null, false) === "trick") && event.target.countCards("he") > 0;
		},
		locked: false,
		logTarget: "target",
		check(event, player) {
			return get.effect(event.target, { name: "guohe_copy2" }, player, player) > 0;
		},
		prompt2: "将该角色的一张牌置于武将牌上作为“嫕”",
		async content(event, trigger, player) {
			const target = trigger.target;
			const result = await player
				.choosePlayerCard({
					target,
					position: "he",
					forced: true,
				})
				.forResult();
			if (!result.bool || !result.cards?.length) {
				return;
			}
			await player.addToExpansion({
				cards: result.cards,
				source: target,
				animate: "give",
				gaintag: ["xinwanyi"],
			});
		},
		mod: {
			cardEnabled(card, player) {
				const cards = player.getExpansions("xinwanyi");
				if (cards.length) {
					const suit = get.suit(card);
					if (suit === "none") {
						return;
					}
					for (const expansionCard of cards) {
						if (get.suit(expansionCard, player) === suit) {
							return false;
						}
					}
				}
			},
			cardRespondable(card, player) {
				const cards = player.getExpansions("xinwanyi");
				if (cards.length) {
					const suit = get.suit(card);
					if (suit === "none") {
						return;
					}
					for (const expansionCard of cards) {
						if (get.suit(expansionCard, player) === suit) {
							return false;
						}
					}
				}
			},
			cardSavable(card, player) {
				const cards = player.getExpansions("xinwanyi");
				if (cards.length) {
					const suit = get.suit(card);
					if (suit === "none") {
						return;
					}
					for (const expansionCard of cards) {
						if (get.suit(expansionCard, player) === suit) {
							return false;
						}
					}
				}
			},
			cardDiscardable(card, player) {
				const cards = player.getExpansions("xinwanyi");
				if (cards.length) {
					const suit = get.suit(card);
					if (suit === "none") {
						return;
					}
					for (const expansionCard of cards) {
						if (get.suit(expansionCard, player) === suit) {
							return false;
						}
					}
				}
			},
		},
		marktext: "嫕",
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
		group: "xinwanyi_give",
		subSkill: {
			give: {
				audio: "wanyi",
				trigger: { player: ["phaseJieshuBegin", "damageEnd"] },
				forced: true,
				locked: false,
				filter(event, player) {
					return player.hasExpansions("xinwanyi");
				},
				async content(event, trigger, player) {
					const result = await player
						.chooseTarget({
							prompt: "婉嫕：令一名角色获得一张“嫕”",
							forced: true,
							ai(target) {
								const player = get.player();
								return get.attitude(player, target);
							},
						})
						.forResult();
					if (!result.bool || !result.targets?.length) {
						return;
					}
					const [target] = result.targets;
					player.line(target, "green");
					const cards = player.getExpansions("xinwanyi");
					if (cards.length === 1) {
						await player.give(cards, target, true);
						return;
					}
					const result2 = await player
						.chooseButton({
							createDialog: [`令${get.translation(target)}获得一张“嫕”`, cards],
							forced: true,
						})
						.forResult();
					if (!result2.bool || !result2.links?.length) {
						return;
					}
					await player.give(result2.links, target, true);
				},
			},
		},
	}
```

### maihuo 名字:埋祸
描述: ①当你成为其他角色使用【杀】的目标后，若此【杀】不为转化牌且有对应的实体牌且其武将牌上没有“祸”且你是此牌的唯一目标，则你可以令此牌对你无效，并将此【杀】置于其武将牌上，称为“祸”。②一名其他角色的出牌阶段开始时，若其武将牌上有“祸”，则其对你使用此“祸”（有距离限制且计入次数限制，若你不是此牌的合法目标，则改为将此“祸”置入弃牌堆）。③当你对有“祸”的其他角色造成伤害后，你移去其“祸”。
```js
maihuo: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		logTarget: "player",
		filter(event, player) {
			const evt2 = event.getParent(2);
			if (evt2 == null) {
				return false;
			}
			return event.card.name === "sha" && event.card.isCard && evt2.name !== "maihuo_effect" && event.cards.filterInD().length > 0 && event.targets.length === 1 && event.player.isIn() && !event.player.hasExpansions("maihuo_effect");
		},
		prompt2(event) {
			return `令${get.translation(event.card)}暂时对你无效`;
		},
		check(event, player) {
			return get.effect(player, event.card, event.player, player) < 0;
		},
		async content(event, trigger, player) {
			trigger.excluded.add(player);
			const target = trigger.player;
			const cards = trigger.cards.filterInD();
			target.storage.maihuo_target = player;
			target.addSkill("maihuo_effect");
			await target.addToExpansion({
				cards,
				animate: "gain2",
				gaintag: ["maihuo_effect"],
			});
		},
		group: "maihuo_damage",
		subSkill: {
			effect: {
				trigger: { player: "phaseUseBegin" },
				forced: true,
				charlotte: true,
				filter(event, player) {
					return player.getExpansions("maihuo_effect").length > 0;
				},
				async content(event, trigger, player) {
					const cards = player.getExpansions("maihuo_effect");
					let card = cards[0];
					if (card.name !== "sha") {
						card = get.autoViewAs(
							{
								name: "sha",
								isCard: true,
							},
							cards
						);
					}
					const target = player.storage.maihuo_target;
					player.removeSkill("maihuo_effect");
					if (target.isIn() && player.canUse(card, target, null, true)) {
						await player.useCard({
							card,
							cards,
							targets: [target],
						});
					}
				},
				marktext: "祸",
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
				ai: { threaten: 1.05 },
			},
			damage: {
				trigger: { source: "damageSource" },
				forced: true,
				locked: false,
				filter(event, player) {
					return event.player.hasSkill("maihuo_effect") && event.player.getExpansions("maihuo_effect").length > 0;
				},
				async content(event, trigger, player) {
					trigger.player.removeSkill("maihuo_effect");
				},
			},
		},
	}
```

## yangyan 名字:杨艳 势力:jin

### xinxuanbei 名字:选备
描述: 出牌阶段限一次。你可选择一名其他角色区域内的一张牌。然后其对你使用对应实体牌为此牌的【杀】。然后若此【杀】，未对你造成过伤害，你摸一张牌；对你造成过伤害，你摸两张牌。
```js
xinxuanbei: {
		audio: "xuanbei",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.xinxuanbei.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target !== player && target.hasCards("hej");
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player
				.choosePlayerCard({
					target,
					position: "hej",
					forced: true,
				})
				.forResult();
			if (!result.bool || !result.cards?.length) {
				return;
			}
			const card = result.cards[0];
			const cardx = get.autoViewAs({ name: "sha" }, [card]);
			if ((get.position(card) !== "j" && !game.checkMod(card, target, "unchanged", "cardEnabled2", target)) || !target.canUse(cardx, player, false)) {
				return;
			}
			const next = target.useCard({
				card: cardx,
				cards: [card],
				targets: [player],
				addCount: false,
			});
			await next;
			const num = player.hasHistory("damage", evt => evt.card === next.card) ? 2 : 1;
			await player.draw(num);
		},
		ai: {
			order: 7,
			result: {
				player(player, target) {
					return get.effect(target, { name: "guohe_copy" }, player, player) + get.effect(player, { name: "sha" }, target, player);
				},
			},
		},
	}
```

### xianwan 名字:娴婉
描述: ①当你需要使用【闪】时，若你的武将牌未横置，则你可以横置武将牌并视为使用【闪】。②当你需要使用【杀】时，若你的武将牌横置，则你可以重置武将牌并视为使用【杀】。
```js
xianwan: {
		audio: 2,
		enable: "chooseToUse",
		filter(event, player) {
			return (
				event.filterCard &&
				event.filterCard(
					{
						name: "sha" + (player.isLinked() ? "" : "n"),
						isCard: true,
					},
					player,
					event
				)
			);
		},
		viewAs(cards, player) {
			return {
				name: "sha" + (player.isLinked() ? "" : "n"),
				isCard: true,
			};
		},
		filterCard: () => false,
		selectCard: -1,
		prompt: "将武将牌重置并视为使用【杀】",
		log: false,
		check: () => 1,
		async precontent(event, trigger, player) {
			player.logSkill("xianwan");
			await player.link();
		},
		ai: {
			order: 3.4,
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag) {
				return tag == "respondSha" + (player.isLinked() ? "" : "n");
			},
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "respondShan") && current < 0 && !player.isLinked()) {
						return 0.4;
					}
				},
			},
		},
	}
```

## ol_huaxin 名字:OL华歆 势力:wei

### caozhao 名字:草诏
描述: 出牌阶段限一次，你可展示一张手牌并声明一种未以此法声明过的基本牌或普通锦囊牌，令一名体力不大于你的其他角色选择一项：令此牌视为你声明的牌，或其失去1点体力。然后若此牌声明成功，然后你可将其交给一名其他角色。
```js
caozhao: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			if (!player.hasCards() || !game.hasPlayer(current => current !== player && current.hp <= player.hp)) {
				return false;
			}
			const cardNames = player.getStorage("caozhao");
			for (const name of lib.inpile) {
				if (!cardNames.includes(name) && ["basic", "trick"].includes(get.type(name))) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				const cardNames = player.getStorage("caozhao");
				const vcards = [];
				for (const name of lib.inpile) {
					if (!cardNames.includes(name)) {
						const type = get.type(name);
						if (type == "basic" || type == "trick") {
							vcards.push([type, "", name]);
						}
					}
				}
				return ui.create.dialog("草诏", [vcards, "vcard"]);
			},
			check(button) {
				return _status.event.player.getUseValue({ name: button.link[2], isCard: true }, undefined, true);
			},
			backup(links, player) {
				return {
					audio: "caozhao",
					cardname: links[0][2],
					filterCard: true,
					position: "h",
					check(card) {
						return player.getUseValue({ name: lib.skill.caozhao_backup.cardname }) - (player.getUseValue(card, undefined, true) + 0.1) / (get.value(card) / 6);
					},
					filterTarget(card, player, target) {
						return target != player && target.hp <= player.hp;
					},
					discard: false,
					lose: false,
					async content(event, trigger, player) {
						const { cards, target } = event;
						if (cards[0].cardid == null) {
							return;
						}
						await player.showCards(cards, `${get.translation(player)}发动【草诏】，声明${get.translation(lib.skill.caozhao_backup.cardname)}`);
						player.storage.caozhao ??= [];
						player.storage.caozhao.push(lib.skill.caozhao_backup.cardname);
						const controlResult = await target
							.chooseControl({
								choiceList: [`令${get.translation(player)}将${get.translation(cards[0])}的牌名改为${get.translation(lib.skill.caozhao_backup.cardname)}`, "失去1点体力"],
								ai(event, player) {
									const evt = get.event().getParent();
									if (evt == null) {
										return 0;
									}
									const target = evt.player;
									if (get.attitude(player, target) > 0) {
										return 0;
									}
									if (player.hp > 3 || (player.hp > 1 && player.hasSkill("zhaxiang"))) {
										return 1;
									}
									if (player.hp > 2) {
										return [0, 1].randomGet();
									}
									return 0;
								},
							})
							.forResult();
						if (controlResult.index == 1) {
							target.addExpose(0.2);
							await target.loseHp();
							return;
						}
						const targetResult = await player
							.chooseTarget({
								prompt: `是否将${get.translation(lib.skill.caozhao_backup.cardname)}（${get.translation(cards[0])}）交给一名其他角色？`,
								filterTarget: lib.filter.notMe,
								ai() {
									return -1;
								},
							})
							.forResult();
						if (targetResult.bool && targetResult.targets?.length) {
							const target = targetResult.targets[0];
							player.line(target, "green");
							target.storage.caozhao_info ??= {};
							target.storage.caozhao_info[cards[0].cardid] = lib.skill.caozhao_backup.cardname;
							target.addSkill("caozhao_info");
							const next = player.give(cards, target, true);
							next.gaintag.add("caozhao");
							await next;
						} else {
							player.storage.caozhao_info ??= {};
							player.storage.caozhao_info[cards[0].cardid] = lib.skill.caozhao_backup.cardname;
							player.addGaintag(cards, "caozhao");
							player.addSkill("caozhao_info");
						}
					},
					ai: {
						result: {
							player: 2,
							target: 0.1,
						},
					},
				};
			},
			prompt(links, player) {
				return `将一张手牌声明为${get.translation(links[0][2])}`;
			},
		},
		ai: {
			order: 1,
			result: {
				player: 1,
			},
		},
	}
```

### olxibing 名字:息兵
描述: 当你受到其他角色造成的伤害后，你可弃置你或该角色两张牌，然后你们中手牌少的角色摸两张牌，以此法摸牌的角色不能使用牌指定你为目标直到回合结束。
```js
olxibing: {
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.player && event.source && event.player !== event.source && event.player.isAlive() && event.source.isAlive() && (event.player.countCards("he") > 0 || event.source.countCards("he") > 0);
		},
		async cost(event, trigger, player) {
			const source = trigger.source;
			event.result = await player
				.chooseTarget({
					prompt: get.prompt("olxibing"),
					prompt2: `弃置自己或${get.translation(source)}的两张牌，然后手牌数较少的角色摸两张牌且不能对你使用牌直到回合结束`,
					filterTarget(card, player, target) {
						const source = get.event().source;
						if (target !== player && target !== source) {
							return false;
						}
						return target.hasCards("he");
					},
					ai(target) {
						const { player, source } = get.event();
						if (source === target) {
							if (get.attitude(player, source) > 0) {
								return 0;
							}
							const cards = source
								.iterableGetCards("he", card => lib.filter.canBeDiscarded(card, player, source))
								.map(card => ({ link: card }))
								.toArray()
								.sort((a, b) => get.buttonValue(b) - get.buttonValue(a))
								.map(button => button.link);
							if (
								source.countCards("h") - player.countCards("h") >=
								Math.max(
									0,
									Math.min(2, cards.length) -
										source.countCards("e", card => {
											const index = cards.indexOf(card);
											return index !== -1 && index < 2;
										})
								)
							) {
								return 1;
							}
							return 0;
						}
						const cards = player.getCards("he", card => lib.filter.cardDiscardable(card, player, "olxibing")).sort((a, b) => get.useful(a) - get.useful(b));
						if (
							player.countCards("h") - source.countCards("h") <
								Math.max(
									0,
									Math.min(cards.length, 2) -
										player.countCards("e", card => {
											const index = cards.indexOf(card);
											return index !== -1 && index < 2;
										})
								) &&
							(cards.length < 2 || get.value(cards[1]) < 5.5)
						) {
							return 0.8;
						}
						return 0;
					},
				})
				.set("source", source)
				.forResult();
		},
		logTarget: "source",
		async content(event, trigger, player) {
			const source = trigger.source;
			const target = event.targets[0];
			if (target === player) {
				await player.chooseToDiscard({
					selectCard: 2,
					position: "he",
					forced: true,
				});
			} else {
				await player.discardPlayerCard({
					target,
					selectButton: 2,
					position: "he",
					forced: true,
				});
			}
			if (!player.isIn() || !source.isIn()) {
				return;
			}
			const playerHandCount = player.countCards("h");
			const sourceHandCount = source.countCards("h");
			if (playerHandCount === sourceHandCount) {
				return;
			}
			const drawer = playerHandCount > sourceHandCount ? source : player;
			await drawer.draw(2);
			player.addTempSkill("olxibing2");
			player.markAuto("olxibing2", [drawer]);
		},
	}
```

## zhongyan 名字:钟琰 势力:jin

### bolan 名字:博览
描述: ①出牌阶段开始时，你可从三个描述中带有“出牌阶段限一次”的技能中选择一个，令当前回合角色获得直至此阶段结束。②其他角色出牌阶段限一次，其可以失去1点体力，令你发动一次〖博览①〗。
```js
bolan: {
		audio: 2,
		banned: ["kotomi_chuanxiang"],
		global: "bolan_g",
		initList(player) {
			let list;
			const skills = [];
			if (get.mode() === "guozhan") {
				list = [];
				for (const characterName in lib.characterPack.mode_guozhan) {
					if (lib.character[characterName]) {
						list.push(characterName);
					}
				}
			} else if (_status.connectMode) {
				list = get.charactersOL();
			} else {
				list = [];
				for (const characterName in lib.character) {
					if (lib.filter.characterDisabled2(characterName) || lib.filter.characterDisabled(characterName)) {
						continue;
					}
					list.push(characterName);
				}
			}
			for (const characterName of list) {
				if (characterName.indexOf("gz_jun") === 0) {
					continue;
				}
				for (const skillName of lib.character[characterName][3]) {
					if (skillName === "bolan") {
						continue;
					}
					const skill = lib.skill[skillName];
					if (!skill || skill.juexingji || skill.hiddenSkill || skill.zhuSkill || skill.dutySkill || skill.chargeSkill || lib.skill.bolan.banned.includes(skillName)) {
						continue;
					}
					if (skill.init || (skill.ai && (skill.ai.combo || skill.ai.notemp || skill.ai.neg))) {
						continue;
					}
					const info = lib.translate[`${skillName}_info`];
					if (info && get.plainText(info).indexOf("出牌阶段限一次") !== -1) {
						skills.add(skillName);
					}
				}
			}
			player.storage.bolan = skills;
		},
		check(event, player) {
			return true;
		},
		trigger: { player: "phaseUseBegin" },
		frequent: true,
		preHidden: true,
		async content(event, trigger, player) {
			if (!player.isIn()) {
				return;
			}
			if (!player.storage.bolan) {
				lib.skill.bolan.initList(player);
			}
			const list = player.storage.bolan.randomGets(3);
			if (!list.length) {
				return;
			}
			const result = await player
				.chooseControl(list)
				.set(
					"choiceList",
					list.map(skillName => {
						return `<div class="skill">【${get.translation(lib.translate[`${skillName}_ab`] || get.translation(skillName).slice(0, 2))}】</div><div>${get.skillInfoTranslation(skillName, player, false)}</div>`;
					})
				)
				.set("displayIndex", false)
				.set("prompt", "博览：请选择你要获得的技能")
				.set("ai", () => {
					const controls = _status.event.controls.slice();
					return controls.sort((a, b) => {
						return get.skillRank(b, "in") - get.skillRank(a, "in");
					})[0];
				})
				.forResult();
			if (!result.control) {
				return;
			}
			player.addTempSkills(result.control, "phaseUseEnd");
			player.popup(result.control);
			// game.log(player,'获得了','#g【'+get.translation(result.control)+'】');
		},
		ai: { threaten: 0.9 },
		subSkill: {
			g: {
				audio: "bolan",
				forceaudio: true,
				enable: "phaseUse",
				usable: 1,
				prompt: "出牌阶段限一次。你可以令一名有〖博览〗的角色从三个描述中包含“出牌阶段限一次”的技能中选择一个，你获得此技能直到此阶段结束。",
				chessForceAll: true,
				filter(event, player) {
					return game.hasPlayer(current => current !== player && current.hasSkill("bolan"));
				},
				filterTarget(card, player, target) {
					return player !== target && target.hasSkill("bolan");
				},
				selectTarget() {
					if (game.countPlayer(current => lib.skill.bolan_g.filterTarget(null, _status.event.player, current)) === 1) {
						return -1;
					}
					return 1;
				},
				async content(event, trigger, player) {
					await player.loseHp();
					const target = event.targets[0];
					if (!target.isIn() || !player.isIn()) {
						return;
					}
					if (!target.storage.bolan) {
						lib.skill.bolan.initList(target);
					}
					const list = target.storage.bolan.randomGets(3);
					if (!list.length) {
						return;
					}
					const result = await target
						.chooseControl(list)
						.set(
							"choiceList",
							list.map(skillName => {
								return `<div class="skill">【${get.translation(lib.translate[`${skillName}_ab`] || get.translation(skillName).slice(0, 2))}】</div><div>${get.skillInfoTranslation(skillName, player, false)}</div>`;
							})
						)
						.set("displayIndex", false)
						.set("prompt", `博览：请选择令${get.translation(player)}获得的技能`)
						.set("ai", () => {
							const controls = _status.event.controls.slice();
							return controls.sort((a, b) => {
								return (get.skillRank(b, "in") - get.skillRank(a, "in")) * get.attitude(_status.event.player, _status.event.getParent().player);
							})[0];
						})
						.forResult();
					if (!result.control) {
						return;
					}
					target.line(player);
					player.addTempSkills(result.control, "phaseUseEnd");
				},
				ai: {
					order(item, player) {
						if (player.hp >= 5 || player.countCards("h") >= 10) {
							return 10;
						}
						const list = game.filterPlayer(current => lib.skill.bolan_g.filterTarget(null, player, current));
						for (const target of list) {
							if (get.attitude(target, player) > 0) {
								return 10;
							}
						}
						return 4;
					},
					result: {
						player(player, target) {
							if (player.hasUnknown()) {
								return player.hp + player.countCards("h") / 4 - 5 > 0 ? 1 : 0;
							}
							const tao = player.countCards("h", "tao");
							if (player.hp + tao > 4) {
								return 4 + get.attitude(player, target);
							}
							if (player.hp + tao > 3) {
								return get.attitude(player, target) - 2;
							}
							return 0;
						},
					},
				},
			},
		},
	}
```

### yifa 名字:仪法
描述: 锁定技，其他角色使用【杀】或黑色普通锦囊牌指定你为目标后，其手牌上限-1直到其回合结束。
```js
yifa: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		forced: true,
		logTarget: "player",
		filter(event, player) {
			return player != event.player && (event.card.name == "sha" || (get.color(event.card) == "black" && get.type(event.card) == "trick"));
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			target.addTempSkill("yifa2", { player: "phaseEnd" });
			target.addMark("yifa2", 1, false);
		},
		ai: { threaten: 0.8 },
	}
```

## weiguan 名字:卫瓘 势力:jin

### zhongyun 名字:忠允
描述: 锁定技。每名角色的回合限一次，你受伤/回复体力后，若你的体力值与手牌数相等，你回复1点体力或对你攻击范围内的一名角色造成1点伤害；每名角色的回合限一次，你获得手牌或失去手牌后，若你的体力值与手牌数相等，你摸一张牌或弃置一名其他角色一张牌。
```js
zhongyun: {
		audio: 2,
		trigger: { player: ["damageEnd", "recoverEnd"] },
		forced: true,
		filter(event, player) {
			return player.hp === player.countCards("h") && (player.isDamaged() || game.hasPlayer(current => player.inRange(current)));
		},
		usable: 1,
		preHidden: ["zhongyun2"],
		async content(event, trigger, player) {
			const filterTarget = (card, player, target) => player.inRange(target);
			if (!game.hasPlayer(current => filterTarget("L∞pers", player, current))) {
				await player.recover();
				return;
			}
			const bool = player.isHealthy();
			const result = await player
				.chooseTarget({
					prompt: `忠允：对攻击范围内的一名角色造成1点伤害${bool ? "" : "，或点取消回复1点体力"}`,
					filterTarget,
					forced: bool,
					ai(target) {
						const player = get.player();
						return get.damageEffect(target, player, player);
					},
				})
				.forResult();
			if (!result.bool || !result.targets?.length) {
				await player.recover();
				return;
			}
			const target = result.targets[0];
			player.line(target, "green");
			await target.damage();
		},
		group: "zhongyun2",
	}
```

### shenpin 名字:神品
描述: 当一名角色的判定牌生效前，你可以打出一张与判定牌颜色不同的牌代替之。
```js
shenpin: {
		audio: 2,
		trigger: { global: "judge" },
		filter(event, player) {
			var color = get.color(event.player.judging[0], event.player);
			return (
				player.countCards("hes", function (card) {
					if (_status.connectMode && get.position(card) != "e") {
						return true;
					}
					return get.color(card) != color;
				}) > 0
			);
		},
		popup: false,
		preHidden: true,
		async cost(event, trigger, player) {
			const color = get.color(trigger.player.judging[0], trigger.player);
			event.result = await player
				.chooseCard(`${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt(event.skill)}`, "hes", card => {
					const { player, color } = get.event();
					if (get.color(card) == color) {
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
					if (attitude == 0 || result == 0) {
						return 0;
					}
					if (attitude > 0) {
						return result;
					} else {
						return -result;
					}
				})
				.set("judging", trigger.player.judging[0])
				.set("color", color)
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
		},
	}
```

## cheliji 名字:彻里吉 势力:qun

### chexuan 名字:车悬
描述: 出牌阶段，若你的装备区里没有宝物牌，你可弃置一张黑色牌，选择一张【舆】置入你的装备区；当你失去装备区里的宝物牌后，你可进行判定，若结果为黑色，将一张随机的【舆】置入你的装备区。
```js
chexuan: {
		audio: 2,
		enable: "phaseUse",
		derivation: ["cheliji_sichengliangyu", "cheliji_tiejixuanyu", "cheliji_feilunzhanyu"],
		filter(event, player) {
			return !player.getEquips(5).length && player.countCards("he", { color: "black" }) > 0;
		},
		filterCard: { color: "black" },
		position: "he",
		check(card) {
			return 5 - get.value(card);
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseButton({
					createDialog: ["请选择要装备的宝物", [lib.skill.chexuan.derivation?.map(skillName => ["宝物", "", skillName]), "vcard"]],
					forced: true,
					ai(button) {
						if (button.link[2] === "cheliji_sichengliangyu" && player.countCards("h") < player.hp) {
							return 1;
						}
						return Math.random();
					},
				})
				.forResult();
			if (!result.bool || !result.links?.length) {
				return;
			}
			const name = result.links[0][2];
			const card = game.createCard(name, lib.card[name].cardcolor, 5);
			player.$gain2(card);
			await player.equip(card);
			await game.delay();
		},
		group: "chexuan_lose",
		subfrequent: ["lose"],
		ai: {
			order: 6,
			result: {
				player: 1,
			},
		},
		subSkill: {
			lose: {
				audio: "chexuan",
				trigger: {
					player: "loseAfter",
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				frequent: true,
				filter(event, player) {
					const evt = event.getl(player);
					if (!evt || !evt.es || !evt.es.length) {
						return false;
					}
					if (event.name === "equip" && event.player === player) {
						return false;
					}
					for (const card of evt.es) {
						if (get.subtype(card, false) === "equip5") {
							return true;
						}
					}
					return false;
				},
				async content(event, trigger, player) {
					const result = await player
						.judge(card => {
							if (get.color(card) === "black") {
								return 3;
							}
							return 0;
						})
						.forResult();
					if (!result.bool) {
						return;
					}
					const name = lib.skill.chexuan.derivation?.randomGet();
					const card = game.createCard(name, lib.card[name].cardcolor, 5);
					player.$gain2(card);
					await player.equip(card);
					await game.delay();
				},
			},
		},
	}
```

### qiangshou 名字:羌首
描述: 锁定技，若你的装备区内有宝物牌，你与其他角色的距离-1。
```js
qiangshou: {
		mod: {
			globalFrom(player, target, distance) {
				if (player.getEquips(5).length) {
					return distance - 1;
				}
			},
		},
		ai: {
			combo: "chexuan",
		},
	}
```

## simazhou 名字:司马伷 势力:jin

### recaiwang 名字:才望
描述: ①当你使用或打出牌响应其他角色使用的牌，或其他角色使用或打出牌响应你使用的牌后，若这两张牌颜色相同，则你可以弃置对方的一张牌。②若你的手牌数为1，则你可以将该手牌当做【闪】使用或打出。③若你的装备区牌数为1，则你可以将该装备当做【无懈可击】使用或打出。④若你的判定区牌数为1，则你可以将该延时锦囊牌当做【杀】使用或打出。
```js
recaiwang: {
		audio: "caiwang",
		inherit: "caiwang",
		group: ["recaiwang_hand", "recaiwang_equip", "recaiwang_judge"],
	}
```

### naxiang 名字:纳降
描述: 锁定技，当你受到其他角色造成的伤害后，或你对其他角色造成伤害后，你对其发动〖才望①〗时的“弃置”改为“获得”直到你的下回合开始。
```js
naxiang: {
		audio: 2,
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		forced: true,
		preHidden: true,
		filter(event, player) {
			const target = lib.skill.naxiang.logTarget(event, player);
			return target && target !== player && target.isAlive();
		},
		logTarget(event, player) {
			if (event == null) {
				return;
			}
			return player === event.player ? event.source : event.player;
		},
		async content(_event, trigger, player) {
			player.addTempSkill("naxiang2", { player: "phaseBegin" });
			if (!player.storage.naxiang2) {
				player.storage.naxiang2 = [];
			}
			player.storage.naxiang2.add(lib.skill.naxiang.logTarget(trigger, player));
			player.markSkill("naxiang2");
		},
		ai: {
			combo: "caiwang",
		},
	}
```

## ol_lisu 名字:OL李肃 势力:qun

### qiaoyan 名字:巧言
描述: 锁定技，当你于回合外受到其他角色造成的伤害时，若你：有“珠”，则你令伤害来源获得“珠”；没有“珠”，则你防止此伤害，然后摸一张牌，并将一张牌正面朝上置于武将牌上，称为“珠”。
```js
qiaoyan: {
		audio: 2,
		trigger: { player: "damageBegin2" },
		forced: true,
		filter(event, player) {
			return player !== _status.currentPhase && event.source && event.source !== player;
		},
		logTarget: "source",
		async content(event, trigger, player) {
			const expansionCards = player.getExpansions("qiaoyan");
			if (expansionCards.length) {
				const source = trigger.source;
				await source.gain({
					cards: expansionCards,
					source: player,
					animate: "give",
					bySelf: true,
				});
				return;
			}
			trigger.cancel();
			await player.draw();
			const handCards = player.getCards("he");
			if (!handCards.length) {
				return;
			}
			const result =
				handCards.length === 1
					? { bool: true, cards: handCards }
					: await player
							.chooseCard({
								prompt: "将一张牌作为“珠”置于武将牌上",
								position: "he",
								forced: true,
							})
							.forResult();
			if (!result.bool || !result.cards?.length) {
				return;
			}
			await player.addToExpansion({
				cards: result.cards,
				source: player,
				animate: "give",
				gaintag: ["qiaoyan"],
			});
		},
		marktext: "珠",
		intro: { content: "expansion", markcount: "expansion" },
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile({ cards });
			}
		},
		ai: {
			filterDamage: true,
			skillTagFilter(player, tag, arg) {
				if (!player.getExpansions("qiaoyan").length) {
					return false;
				}
				if (arg && arg.player) {
					if (arg.player.hasSkillTag("jueqing", false, player)) {
						return false;
					}
				}
			},
		},
	}
```

### xianzhu 名字:献珠
描述: 锁定技，出牌阶段开始时，你令一名角色A获得“珠”。若A不为你自己，则你选择你攻击范围内的一名角色B，视为A对B使用一张【杀】。
```js
xianzhu: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		locked: true,
		filter(event, player) {
			return player.getExpansions("qiaoyan").length > 0;
		},
		async cost(event, trigger, player) {
			event.cards = player.getExpansions("qiaoyan");
			event.result = await player
				.chooseTarget({
					prompt: "请选择【献珠】的目标",
					prompt2: `将${get.translation(event.cards)}交给一名角色。若该角色不为你自己，则你令其视为对其攻击范围内的另一名角色使用【杀】`,
					forced: true,
					ai(target) {
						const player = get.player();
						const evt = get.event().getParent();
						if (evt == null) {
							return 0;
						}

						let eff = get.sgn(get.attitude(player, target)) * get.value(evt.cards[0], target);
						if (player !== target) {
							eff += Math.max(...game.filterPlayer(current => current !== target && player.inRange(current) && target.canUse("sha", current, false)).map(current => get.effect(current, { name: "sha" }, target, player)));
						}
						return eff;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions("qiaoyan");
			const target = event.targets[0];
			await player.give(cards, target, true);
			if (player === target || !target.isIn() || !player.isIn()) {
				return;
			}
			if (!game.hasPlayer(current => current !== target && player.inRange(current) && target.canUse("sha", current, false))) {
				return;
			}
			const str = get.translation(target);
			const result = await player
				.chooseTarget({
					prompt: `选择攻击范围内的一名角色，视为${str}对其使用【杀】`,
					filterTarget(card, player, current) {
						return player.inRange(current) && get.event().target.canUse("sha", current, false);
					},
					forced: true,
					ai(current) {
						const { player, target } = get.event();
						return get.effect(current, { name: "sha" }, target, player);
					},
				})
				.set("target", target)
				.forResult();
			if (!result.bool || !result.targets?.length) {
				return;
			}
			const card = get.autoViewAs({ name: "sha", isCard: true });
			await target.useCard({
				card,
				targets: result.targets,
				addCount: false,
			});
		},
		ai: { combo: "qiaoyan" },
	}
```

## jin_yanghuiyu 名字:晋羊徽瑜 势力:jin

### huirong 名字:慧容
描述: 隐匿技，锁定技。当你登场后，你令一名角色将手牌数摸至/弃至与体力值相同（至多摸至五张）。
```js
huirong: {
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			return (
				event.toShow?.some(i => get.character(i).skills?.includes("huirong")) &&
				game.hasPlayer(target => {
					const num = target.countCards("h");
					return num > target.hp || num < Math.min(5, target.hp);
				})
			);
		},
		hiddenSkill: true,
		locked: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(
					"请选择【慧容】的目标",
					"令一名角色将手牌数摸至/弃置至与其体力值相同（至多摸至五张）",
					(card, player, target) => {
						const num = target.countCards("h");
						return num > target.hp || num < Math.min(5, target.hp);
					},
					true
				)
				.set("ai", target => {
					const att = get.attitude(get.player(), target);
					const num = target.countCards("h");
					if (num > target.hp) {
						return -att * (num - target.hp);
					}
					return att * Math.max(0, Math.min(5, target.hp) - target.countCards("h"));
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			if (target.countCards("h") < target.hp) {
				await target.drawTo(Math.min(5, target.hp));
			} else if (target.countCards("h") > target.hp) {
				await target.chooseToDiscard("h", true, target.countCards("h") - target.hp, "allowChooseAll");
			}
		},
	}
```

### ciwei 名字:慈威
描述: 一名角色于其回合内使用第二张牌时，若此牌为基本牌或普通锦囊牌，则你可以弃置一张牌，取消此牌的所有目标。
```js
ciwei: {
		init: () => {
			game.addGlobalSkill("ciwei_ai");
		},
		onremove: () => {
			if (!game.hasPlayer(i => i.hasSkill("ciwei", null, null, false), true)) {
				game.removeGlobalSkill("ciwei_ai");
			}
		},
		audio: 2,
		trigger: { global: "useCard" },
		direct: true,
		preHidden: true,
		filter(event, player) {
			if (event.all_excluded || event.player === player || event.player !== _status.currentPhase || !player.hasCards("he")) {
				return false;
			}
			return event.player.getHistory("useCard").indexOf(event) === 1 && ["basic", "trick"].includes(get.type(event.card));
		},
		async content(event, trigger, player) {
			if (player !== game.me && !player.isOnline()) {
				await game.delayx();
			}
			const next = player
				.chooseToDiscard({
					prompt: get.prompt("ciwei", trigger.player),
					prompt2: `弃置一张牌，取消${get.translation(trigger.card)}的所有目标`,
					position: "he",
				})
				.set("ai", card => _status.event.goon / 1.4 - get.value(card))
				.set(
					"goon",
					(() => {
						if (!trigger.targets.length) {
							return -get.attitude(player, trigger.player);
						}
						let num = 0;
						for (const target of trigger.targets) {
							num -= get.effect(target, trigger.card, trigger.player, player);
						}
						return num;
					})()
				)
				.setHiddenSkill(event.name);
			next.logSkill = ["ciwei", trigger.player];
			const result = await next.forResult();
			if (!result.bool) {
				return;
			}
			trigger.targets.length = 0;
			trigger.all_excluded = true;
		},
	}
```

### caiyuan 名字:才媛
描述: 锁定技。结束阶段，若你于你的上一个回合结束后未扣减过体力，则你摸两张牌。
```js
caiyuan: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			if (player.phaseNumber <= 1) {
				return false;
			}
			const history1 = _status.globalHistory,
				history2 = player.actionHistory;
			for (let i = 0; i < Math.min(history1.length, history2.length); i++) {
				let i1 = history1.length - 1 - i,
					i2 = history2.length - 1 - i;
				if (i > 0 && history2[i2].isMe) {
					break;
				}
				if (history1[i1].changeHp.some(evt => evt.player == player && evt.num < 0)) {
					return false;
				}
			}
			return true;
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
	}
```

## shibao 名字:石苞 势力:jin

### zhuosheng 名字:擢升
描述: 出牌阶段，①你使用本轮内得到的基本牌时无次数和距离限制。②你使用本轮内获得的普通锦囊牌选择目标后，可令此牌的目标数+1或-1。③你使用本轮内得到的装备牌时可以摸一张牌（以此法得到的牌不能触发〖擢升〗）。
```js
zhuosheng: {
		audio: 2,
		trigger: { player: "useCard2" },
		locked: false,
		init(player) {
			player.addSkill("zhuosheng_count");
			if (game.phaseNumber > 0) {
				const handCards = player.getCards("h");
				const allHistory = player.getAllHistory();
				let cards = [];
				for (let i = allHistory.length - 1; i >= 0; i--) {
					for (const gainEvent of allHistory[i].gain) {
						cards.addArray(gainEvent.cards);
					}
					if (allHistory[i].isRound) {
						break;
					}
				}
				cards = cards.filter(card => handCards.includes(card));
				if (cards.length) {
					player.addGaintag(cards, "zhuosheng");
				}
			}
		},
		onremove(player) {
			player.removeSkill("zhuosheng_count");
			player.removeGaintag("zhuosheng");
		},
		mod: {
			targetInRange(card, player) {
				if (get.type(card) !== "basic") {
					return;
				}
				if (!(game.online ? player === _status.currentPhase : player.isPhaseUsing())) {
					return;
				}
				if (get.number(card) === "unsure" || card.cards?.every(card => card.hasGaintag("zhuosheng"))) {
					return true;
				}
			},
			cardUsable(card, player) {
				if (get.mode() === "guozhan" || get.type(card) !== "basic") {
					return;
				}
				if (!(game.online ? player === _status.currentPhase : player.isPhaseUsing())) {
					return;
				}
				if (get.number(card) === "unsure" || card.cards?.every(card => card.hasGaintag("zhuosheng"))) {
					return Infinity;
				}
			},
			aiOrder(player, card, num) {
				if (get.itemtype(card) === "card" && card.hasGaintag("zhuosheng") && get.type(card) === "basic") {
					return num - 0.1;
				}
			},
		},
		filter(event, player) {
			if (!lib.skill.zhuosheng.filterx(event, player)) {
				return false;
			}
			if (get.type(event.card) !== "trick") {
				return false;
			}
			if (event.targets && event.targets.length > 0) {
				return true;
			}
			const info = get.info(event.card);
			if (info.allowMultiple === false) {
				return false;
			}
			if (event.targets && !info.multitarget) {
				if (game.hasPlayer(current => !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, player, current) && lib.filter.targetInRange(event.card, player, current))) {
					return true;
				}
			}
			return false;
		},
		filterx(event, player) {
			if (!player.isPhaseUsing()) {
				return false;
			}
			return player.hasHistory("lose", evt => {
				if ((evt.relatedEvent || evt.getParent()) !== event) {
					return false;
				}
				return Object.values(evt.gaintag_map).flat().includes("zhuosheng");
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt("zhuosheng"),
					prompt2: `为${get.translation(trigger.card)}增加或减少一个目标`,
					filterTarget(_card, _player, target) {
						const { player, card, targets } = get.event();
						if (targets.includes(target) && targets.length > 1) {
							return true;
						}
						return !targets.includes(target) && lib.filter.targetEnabled2(card, player, target);
					},
					ai(target) {
						const event = get.event();
						const { player, card, targets } = event;
						return get.effect(target, card, player, player) * (targets.includes(target) ? -1 : 1);
					},
				})
				.set("card", trigger.card)
				.set("targets", trigger.targets)
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			if (!event.isMine() && !event.isOnline()) {
				await game.delayx();
			}
			if (trigger.targets.includes(event.targets[0])) {
				trigger.targets.removeArray(event.targets);
			} else {
				trigger.targets.addArray(event.targets);
			}
		},
		group: ["zhuosheng_equip", "zhuosheng_silent"],
		subfrequent: ["equip"],
		subSkill: {
			equip: {
				audio: "zhuosheng",
				trigger: { player: "useCard" },
				filter(event, player) {
					return get.type(event.card) === "equip" && lib.skill.zhuosheng.filterx(event, player);
				},
				frequent: true,
				prompt2: "你可以摸一张牌",
				async content(event, trigger, player) {
					await player.draw();
				},
			},
			silent: {
				trigger: { player: "useCard1" },
				silent: true,
				firstDo: true,
				filter(event, player) {
					return get.mode() !== "guozhan" && get.type(event.card) === "basic" && lib.skill.zhuosheng.filterx(event, player) && event.addCount !== false;
				},
				async content(event, trigger, player) {
					if (trigger.addCount !== false) {
						trigger.addCount = false;
						const stat = trigger.player.getStat().card;
						const name = trigger.card.name;
						if (typeof stat[name] === "number") {
							stat[name]--;
						}
					}
				},
			},
			count: {
				trigger: {
					player: "gainBegin",
					global: "roundStart",
				},
				silent: true,
				filter(event, player) {
					if (event.name === "gain") {
						return event.getParent(2).name !== "zhuosheng_equip";
					}
					return game.roundNumber > 1;
				},
				async content(event, trigger, player) {
					if (trigger.name == "gain") {
						trigger.gaintag.add("zhuosheng");
					} else {
						player.removeGaintag("zhuosheng");
					}
				},
			},
		},
	}
```

## jin_zhangchunhua 名字:晋张春华 势力:jin

### huishi 名字:慧识
描述: 摸牌阶段，你可以放弃摸牌，改为观看牌堆顶的X张牌，获得其中的一半（向下取整），然后将其余牌置入牌堆底。（X为牌堆数量的个位数）
```js
huishi: {
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return ui.cardPile.childElementCount % 10 > 0 && !event.numFixed;
		},
		preHidden: true,
		prompt() {
			return get.prompt("huishi") + "（当前牌堆尾数：" + (ui.cardPile.childElementCount % 10) + "）";
		},
		check(event, player) {
			return ui.cardPile.childElementCount % 10 > 3;
		},
		async content(event, trigger, player) {
			trigger.changeToZero();
			const cards = get.cards(ui.cardPile.childElementCount % 10, true);
			await game.cardsGotoOrdering(cards);
			const num = Math.ceil(cards.length / 2);
			const next = player.chooseToMove("慧识：将" + get.cnNumber(num) + "张牌置于牌堆底并获得其余的牌", true);
			next.set("list", [["牌堆顶的展示牌", cards], ["牌堆底"]]);
			next.set("filterMove", function (from, to, moved) {
				if (moved[0].includes(from) && to == 1) {
					return moved[1].length < _status.event.num;
				}
				return true;
			});
			next.set("filterOk", function (moved) {
				return moved[1].length == _status.event.num;
			});
			next.set("num", num);
			next.set("processAI", function (list) {
				var cards = list[0][1].slice(0).sort(function (a, b) {
					return get.value(b) - get.useful(a);
				});
				return [cards, cards.splice(cards.length - _status.event.num)];
			});
			const result = await next.forResult();
			if (result.moved?.length) {
				const {
					moved: [gain, bottom],
				} = result;
				if (gain.length) {
					await player.gain(gain, "gain2");
				}
				if (bottom.length) {
					await game.cardsGotoPile(bottom);
				}
			}
		},
	}
```

### qingleng 名字:清冷
描述: 一名角色的结束阶段，若其体力值与手牌数之和不小于X，则你可将一张牌当无距离限制的冰【杀】对其使用（X为牌堆数量的个位数）。若这是你本局游戏内首次对其发动此技能，则你摸一张牌。
```js
qingleng: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			const target = event.player;
			return target != player && target.isIn() && !target.storage.nohp && target.hp + target.countCards("h") >= ui.cardPile.childElementCount % 10 && player.countCards("he") > 0 && player.canUse({ name: "sha", nature: "ice" }, target, false);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard("he", get.prompt(event.skill, trigger.player), "将一张牌当做冰【杀】对其使用", (card, player, target) => {
					return player.canUse(get.autoViewAs({ name: "sha", nature: "ice" }, [card]), _status.event.target, false);
				})
				.set("target", trigger.player)
				.set("ai", card => {
					if (get.effect(_status.event.target, get.autoViewAs({ name: "sha", nature: "ice" }, [card]), player) <= 0) {
						return false;
					}
					return 6 - get.value(card);
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		popup: false,
		preHidden: true,
		async content(event, trigger, player) {
			await player.useCard(get.autoViewAs({ name: "sha", nature: "ice" }, event.cards), event.cards, false, trigger.player, event.name);
			if (!player.getStorage(event.name).includes(trigger.player)) {
				player.markAuto(event.name, [trigger.player]);
				await player.draw();
			}
		},
		intro: { content: "已对$发动过此技能" },
	}
```

### xuanmu 名字:宣穆
描述: 锁定技，隐匿技。你于其他角色的回合登场时，防止你受到的伤害直到回合结束。
```js
xuanmu: {
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		forced: true,
		hiddenSkill: true,
		filter(event, player) {
			return event.toShow?.some(i => get.character(i).skills?.includes("xuanmu")) && player != _status.currentPhase;
		},
		async content(event, trigger, player) {
			player.addTempSkill("xuanmu2");
		},
	}
```

## jin_simayi 名字:晋司马懿 势力:jin

### buchen
```js
buchen: {
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		hiddenSkill: true,
		filter(event, player) {
			var target = _status.currentPhase;
			return event.toShow?.some(i => get.character(i).skills?.includes("buchen")) && target?.isIn() && target != player && target.countGainableCards(player, "he") > 0;
		},
		direct: true,
		async content(event, trigger, player) {
			const target = _status.currentPhase;
			player.gainPlayerCard(target, "he", get.prompt("buchen", target)).set("logSkill", ["buchen", target]);
		},
	}
```

### smyyingshi
```js
smyyingshi: {
		audio: 2,
		locked: true,
		clickableFilter(player) {
			//return player.isPhaseUsing();
			return player.hasSkill("smyyingshi") && player.hasSkill("smyyingshi_viewTop");
		},
		init(player, skill) {
			if (player.isPhaseUsing()) {
				player.addTempSkill(`${skill}_viewTop`, { global: ["phaseChange", "phaseAfter", "phaseBeforeStart"] });
			}
		},
		forced: true,
		trigger: { player: "phaseUseBegin" },
		async content(event, trigger, player) {
			player.addTempSkill(`${event.name}_viewTop`, { global: ["phaseChange", "phaseAfter", "phaseBeforeStart"] });
		},
		clickable(player) {
			if (player.isUnderControl(true)) {
				const cards = lib.skill.smyyingshi.getCards(player);
				function createDialogWithControl(result) {
					const dialog = ui.create.dialog("鹰视", "peaceDialog");
					result.length > 0 ? dialog.add(result, true) : dialog.addText("牌堆顶无牌");
					const control = ui.create.control("确定", () => dialog.close());
					dialog._close = dialog.close;
					dialog.hide = dialog.close = function (...args) {
						control.close();
						return dialog._close(...args);
					};
					if (_status.smyyingshi_clickable) {
						_status.smyyingshi_clickable.close();
					}
					_status.smyyingshi_clickable = dialog;
					dialog.open();
				}
				if (cards instanceof Promise) {
					cards.then(([ok, result]) => createDialogWithControl(result));
				} else {
					createDialogWithControl(cards);
				}
			}
		},
		getCards(player) {
			const num = player.maxHp;
			if (num > 0) {
				if (game.online) {
					return game.requestSkillData("smyyingshi", "getTopCards", 10000);
				} else {
					if (ui.cardPile.hasChildNodes !== false) {
						return Array.from(ui.cardPile.childNodes).slice(0, num);
					}
				}
			}
			return [];
		},
		sync: {
			getTopCards(client) {
				if (ui.cardPile.hasChildNodes !== false) {
					return Array.from(ui.cardPile.childNodes).slice(0, client.maxHp);
				}
				return [];
			},
		},
		mark: true,
		marktext: "牌",
		intro: {
			mark(dialog, content, player, event, skill) {
				const intronode = ui.create.div(".menubutton.pointerdiv", "点击发动", function () {
					if (!this.classList.contains("disabled")) {
						this.classList.add("disabled");
						this.style.opacity = 0.5;
						lib.skill[skill].clickable(player);
					}
				});
				if (!_status.gameStarted || !player.isUnderControl(true) || !lib.skill[skill].clickableFilter(player)) {
					intronode.classList.add("disabled");
					intronode.style.opacity = 0.5;
				}
				dialog.add(intronode);
			},
		},
		subSkill: {
			viewTop: {
				charlotte: true,
			},
		},
	}
```

### xiongzhi
```js
xiongzhi: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			while (true) {
				const card = get.cards()[0];
				const content = ["牌堆顶", [card]];
				game.log(player, "观看了牌堆顶的一张牌");
				await player.chooseControl("ok").set("dialog", content);
				if (player.hasUseTarget(card, null, card.name === "sha") || (get.info(card).notarget && lib.filter.cardEnabled(card, player))) {
					const result = await player.chooseUseTarget(card, true).forResult();
					if (result?.bool) {
						continue;
					}
				}
				break;
			}
		},
		ai: {
			order: 1,
			result: {
				player(player) {
					if (!player.hasSkill("smyyingshi")) {
						return 1;
					}
					for (var i = 0; i < Math.min(2, player.maxHp); i++) {
						var card = ui.cardPile.childNodes[i];
						if (card) {
							if (!player.hasValueTarget(card)) {
								return 0;
							}
						} else {
							break;
						}
					}
					return 1;
				},
			},
		},
	}
```

### xinquanbian 名字:权变
描述: 出牌阶段，每当你首次使用/打出一种花色的手牌时，你可以从牌堆顶的X张牌中获得一张与此牌花色不同的牌，并将其余牌以任意顺序置于牌堆顶。出牌阶段，你至多可使用X张非装备手牌。（X为你的体力上限）
```js
xinquanbian: {
		audio: "quanbian",
		preHidden: true,
		trigger: { player: ["useCard", "respond"] },
		filter(event, player) {
			var phase = event.getParent("phaseUse");
			if (!phase || phase.player != player) {
				return false;
			}
			var suit = get.suit(event.card);
			if (!lib.suit.includes(suit) || !lib.skill.quanbian.hasHand(event)) {
				return false;
			}
			return (
				player.getHistory("useCard", function (evt) {
					return evt != event && get.suit(evt.card) == suit && lib.skill.quanbian.hasHand(evt) && evt.getParent("phaseUse") == phase;
				}).length +
					player.getHistory("respond", function (evt) {
						return evt != event && get.suit(evt.card) == suit && lib.skill.quanbian.hasHand(evt) && evt.getParent("phaseUse") == phase;
					}).length ==
				0
			);
		},
		async content(event, trigger, player) {
			const cards = get.cards(Math.min(5, player.maxHp), true);
			await game.cardsGotoOrdering(cards);
			const suit = get.suit(trigger.card);
			const result = await player
				.chooseToMove("权变：获得一张不为" + get.translation(suit) + "花色的牌并排列其他牌")
				.set("suit", suit)
				.set("list", [["牌堆顶", cards], ["获得"]])
				.set("filterMove", function (from, to, moved) {
					var suit = _status.event.suit;
					if (moved[0].includes(from.link)) {
						if (typeof to == "number") {
							if (to == 1) {
								if (moved[1].length) {
									return false;
								}
								return get.suit(from.link, false) != suit;
							}
							return true;
						}
						if (moved[1].includes(to.link)) {
							return get.suit(from.link, false) != suit;
						}
						return true;
					} else {
						if (typeof to == "number") {
							return true;
						}
						return get.suit(to.link, false) != suit;
					}
				})
				.set("processAI", function (list) {
					var cards = list[0][1].slice(0).sort(function (a, b) {
							return get.value(b) - get.value(a);
						}),
						gains = [];
					for (var i of cards) {
						if (get.suit(i, false) != _status.event.suit) {
							cards.remove(i);
							gains.push(i);
							break;
						}
					}
					return [cards, gains];
				})
				.forResult();
			if (result.bool) {
				const list = result.moved;
				if (list[1].length) {
					await player.gain(list[1], "gain2");
				}
				if (list[0].length) {
					await game.cardsGotoPile(list[0].reverse(), "insert");
				}
			}
		},
		//group:'xinquanbian_count',
		init: (player, skill) => player.addSkill("xinquanbian_count"),
		onremove: (player, skill) => player.removeSkill("xinquanbian_count"),
	}
```

## jin_wangyuanji 名字:晋王元姬 势力:jin

### shiren 名字:识人
描述: 隐匿技。你于其他角色的回合内登场时，若其有手牌，则你可对其发动〖宴戏〗。
```js
shiren: {
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		hiddenSkill: true,
		logTarget() {
			return _status.currentPhase;
		},
		filter(event, player) {
			if (!event.toShow?.some(i => get.character(i).skills?.includes("shiren"))) {
				return false;
			}
			var target = _status.currentPhase;
			return target && target != player && target.isAlive() && target.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const next = game.createEvent("yanxi", false);
			next.player = player;
			next.target = _status.currentPhase;
			next.setContent(lib.skill.yanxi.content);
			await next;
		},
	}
```

### yanxi 名字:宴戏
描述: 出牌阶段限一次，你可选择一名有手牌的其他角色。你将该角色的一张随机手牌与牌堆顶的两张牌混合后展示，并选择其中一张。若你以此法选择的是该角色的手牌，则你获得这三张牌。否则你获得选择的牌。你通过〖宴戏〗得到的牌，不计入当前回合的手牌上限。
```js
yanxi: {
		audio: 2,
		usable: 1,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(current => current !== player && current.hasCards());
		},
		filterTarget(card, player, target) {
			return target !== player && target.hasCards();
		},
		async content(event, trigger, player) {
			const target = event.target;
			const card = target.getCards("h").randomGet();
			let pileCards = get.cards(2);
			let cards = pileCards.concat(card);
			while (pileCards.length > 0) {
				ui.cardPile.insertBefore(pileCards.pop().fix(), ui.cardPile.firstChild);
			}
			if (get.mode() == "guozhan") {
				const num = ui.cardPile.childElementCount;
				let num1 = get.rand(1, num - 1);
				let num2 = get.rand(1, num - 1);
				if (num1 == num2) {
					if (num1 == 0) {
						num2++;
					} else {
						num1--;
					}
				}
				cards = [card, ui.cardPile.childNodes[num1], ui.cardPile.childNodes[num2]];
			}
			game.updateRoundNumber();
			cards.randomSort();
			game.log(player, "展示了", cards);
			const videoId = lib.status.videoId++;
			const str = `${get.translation(player)}对${get.translation(target)}发动了【宴戏】`;
			game.broadcastAll(
				(str, id, cards) => {
					const dialog = ui.create.dialog(str, cards);
					dialog.videoId = id;
				},
				str,
				videoId,
				cards
			);
			game.addVideo("showCards", player, [str, get.cardsInfo(cards)]);
			await game.delay(2);
			const updateDialog = (id, target) => {
				const dialog = get.idDialog(id);
				if (dialog) {
					dialog.content.firstChild.innerHTML = "猜猜哪张是" + get.translation(target) + "的手牌？";
				}
			};
			if (player == game.me) {
				updateDialog(videoId, target);
			} else if (player.isOnline()) {
				player.send(updateDialog, videoId, target);
			}
			const next = player.chooseButton({
				forced: true,
				ai(button) {
					const evt = get.event();
					if (evt.answer) {
						return button.link == evt.answer ? 1 : 0;
					}
					return get.value(button.link, evt.player);
				},
			});
			next.set("dialog", videoId);
			if (card.isKnownBy(player) || player.hasSkillTag("viewHandcard", null, target, true)) {
				next.set("answer", card);
			}
			const result = await next.forResult();
			game.broadcastAll("closeDialog", videoId);
			player.addTempSkill("yanxi2");
			const card2 = result.links[0];
			if (card2 !== card) {
				player.popup("杯具");
				await player.gain({
					cards: [card2],
					animate: "gain2",
					gaintag: ["yanxi"],
				});
				return;
			}
			player.popup("洗具");
			cards.remove(card2);
			player.$gain2(cards);
			await player.gain({
				cards,
				log: true,
				gaintag: ["yanxi"],
			});
			await player.gain({
				cards: [card],
				source: target,
				bySelf: true,
				animate: "give",
				gaintag: ["yanxi"],
			});
		},
		ai: {
			order: 6,
			result: {
				player: 1,
				target: -0.6,
			},
		},
	}
```

## jin_simazhao 名字:晋司马昭 势力:jin

### tuishi 名字:推弑
描述: 隐匿技，你于其他角色A的回合内登场时，可于此回合结束时选择其攻击范围内的一名角色B。A选择一项：①对B使用一张【杀】。②你对A造成1点伤害。
```js
tuishi: {
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		forced: true,
		locked: false,
		hiddenSkill: true,
		filter(event, player) {
			const target = _status.currentPhase;
			return player !== target && target && target.isAlive() && event.toShow?.some(i => get.character(i).skills?.includes("tuishi"));
		},
		async content(_event, _trigger, player) {
			player.addTempSkill("tuishi2");
		},
	}
```

### xinchoufa 名字:筹伐
描述: 出牌阶段限一次，你可展示一名其他角色的一张手牌A。你令其当前所有类型与A不同的手牌的牌名均视为【杀】且均视为无属性，直到其回合结束。
```js
xinchoufa: {
		audio: "choufa",
		inherit: "choufa",
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
			await player.showCards(result.cards, `${get.translation(player)}对${get.translation(target)}发动了【筹伐】`);
			const type = get.type2(result.cards[0], target);
			const hs = target.getCards("h", card => card !== result.cards?.[0] && get.type2(card, target) !== type);
			if (!hs.length) {
				return;
			}
			target.addGaintag(hs, "xinchoufa");
			target.addTempSkill("xinchoufa2", { player: "phaseAfter" });
		},
	}
```

### zhaoran 名字:昭然
描述: 出牌阶段开始时，你可令你的手牌对其他角色可见直到出牌阶段结束。若如此做，当你于此阶段内失去一张手牌后，若你的手牌里没有与此牌花色相同的牌且你本回合内未因该花色的牌触发过此效果，则你选择一项：①摸一张牌。②弃置一名其他角色的一张牌。
```js
zhaoran: {
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
	}
```

### chengwu 名字:成务
描述: 主公技，锁定技，其他晋势力角色攻击范围内的角色视为在你的攻击范围内。
```js
chengwu: {
		audio: 2,
		zhuSkill: true,
		mod: {
			inRange(from, to) {
				if (!from.hasZhuSkill("chengwu") || from._chengwu) {
					return;
				}
				from._chengwu = true;
				const bool = game.hasPlayer(current => current !== from && current !== to && current.group === "jin" && from.hasZhuSkill("chengwu", current) && current.inRange(to));
				delete from._chengwu;
				if (bool) {
					return true;
				}
			},
		},
	}
```

## jin_xiahouhui 名字:晋夏侯徽 势力:jin

### baoqie 名字:宝箧
描述: 隐匿技，锁定技。你登场后，从牌堆或弃牌堆中获得一张不为赠物的宝物牌。若此牌在你的手牌区内为宝物牌，则你可以使用此牌。
```js
baoqie: {
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		forced: true,
		hiddenSkill: true,
		filter(event, player) {
			return event.toShow?.some(i => get.character(i).skills?.includes("baoqie"));
		},
		async content(event, _trigger, player) {
			const card = get.cardPile(card => get.subtype(card, false) === "equip5" && !get.cardtag(card, "gifts"));
			if (!card) {
				return;
			}
			await player.gain({
				cards: [card],
				animate: "gain2",
			});
			if (!player.hasCards("h", cardx => cardx === card) || get.subtype(card) !== "equip5") {
				return;
			}
			const next = player.chooseUseTarget({ card });
			next.nopopup = true;
			await next;
		},
	}
```

### jyishi 名字:宜室
描述: 每回合限一次，当有其他角色于其出牌阶段内因弃置而失去手牌后，你可令其获得这些牌中位于弃牌堆的一张，然后你获得其余位于弃牌堆的牌。
```js
jyishi: {
		audio: 2,
		trigger: { global: ["loseAfter", "loseAsyncAfter"] },
		usable: 1,
		preHidden: true,
		filter(event, player) {
			const target = _status.currentPhase;
			if (!target || !target.isIn() || event.type != "discard" || !target.isPhaseUsing()) {
				return false;
			}
			if (target == player) {
				return false;
			}
			const evt = event.getl(target);
			return evt?.hs?.someInD("d");
		},
		async cost(event, trigger, player) {
			const target = _status.currentPhase,
				cards = trigger.getl(target).hs.filterInD("d");
			event.cards = cards;
			let str = "是否发动【宜室】令" + get.translation(target) + "获得其中一张牌";
			if (cards.length > 1) {
				str += "，然后获得其余的牌";
			}
			str += "？";
			const { bool, links } = await player
				.chooseButton([str, cards])
				.set("ai", button => {
					const card = button.link;
					const { player, source } = get.event();
					if (get.attitude(player, source) > 0) {
						return Math.max(1, source.getUseValue(card, null, true));
					}
					const cards = get.event().getParent().cards.slice(0);
					if (cards.length == 1) {
						return -get.value(card);
					}
					cards.remove(card);
					return get.value(cards) - get.value(card) - 2;
				})
				.set("source", target)
				.setHiddenSkill(event.skill)
				.forResult();
			event.result = {
				bool: bool,
				targets: [target],
				cost_data: links,
			};
		},
		async content(event, trigger, player) {
			const {
					targets: [target],
					cost_data: links,
				} = event,
				cards = trigger.getl(target).hs.filterInD("d");
			await target.gain(links, "gain2");
			cards.remove(links[0]);
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
	}
```

### shiduo 名字:识度
描述: 出牌阶段限一次，你可以与一名其他角色拼点。若你赢，你获得其所有手牌。然后你交给其X张手牌（X为你手牌数的一半，向下取整）。
```js
shiduo: {
		audio: 2,
		usable: 1,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(target => player !== target && player.canCompare(target));
		},
		filterTarget(card, player, target) {
			return player !== target && player.canCompare(target);
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const { bool } = await player.chooseToCompare(target).forResult();
			if (!bool || !target.isAlive()) {
				return;
			}
			const targetHands = target.getCards("h");
			if (targetHands.length) {
				// await player.gainPlayerCard(target, true, "h", handcardCount);
				await player.gain({
					cards: targetHands,
					source: target,
					animate: "giveAuto",
					bySelf: true,
				});
			}
			const giveCount = Math.floor(player.countCards("h") / 2);
			if (!giveCount || !target.isAlive()) {
				return;
			}
			await player.chooseToGive({
				prompt: `交给${get.translation(target)}${get.cnNumber(giveCount)}张牌`,
				target,
				selectCard: giveCount,
				position: "h",
				forced: true,
			});
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					const delta = target.countCards("h") - player.countCards("h");
					if (delta < 0) {
						return 0;
					}
					return -1 - delta;
				},
			},
		},
	}
```

## jin_simashi 名字:晋司马师 势力:jin

### taoyin 名字:韬隐
描述: 隐匿技，当你登场后，若当前回合角色存在且不是你，则你可令该角色本回合的手牌上限-2。
```js
taoyin: {
		audio: 2,
		trigger: { player: "showCharacterAfter" },
		hiddenSkill: true,
		logTarget() {
			return _status.currentPhase;
		},
		filter(event, player) {
			const target = _status.currentPhase;
			return player != target && target?.isAlive() && event.toShow?.some(i => get.character(i).skills?.includes("taoyin"));
		},
		check(event, player) {
			return get.attitude(player, _status.currentPhase) < 0;
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			target.addTempSkill(event.name + "_effect");
			target.addMark(event.name + "_effect", 2, false);
		},
		ai: { expose: 0.2 },
		subSkill: {
			effect: {
				onremove: true,
				charlotte: true,
				intro: { content: "本回合手牌上限-#" },
				mod: {
					maxHandcard(player, num) {
						return num - player.countMark("taoyin_effect");
					},
				},
			},
		},
	}
```

### yimie 名字:夷灭
描述: 每回合限一次，当你对其他角色造成伤害时，若伤害值X小于Y，则你可失去1点体力，将伤害值改为Y。此伤害结算结束后，其回复(Y-X)点体力（Y为其体力值）。
```js
yimie: {
		audio: 2,
		usable: 1,
		preHidden: true,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return player != event.player && event.num < event.player.hp;
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
		},
	}
```

### ruilve 名字:睿略
描述: 主公技，其他晋势力角色的出牌阶段限一次，该角色可以将一张带有伤害标签的基本牌或锦囊牌交给你。
```js
ruilve: {
		audio: 2,
		global: "ruilve2",
		zhuSkill: true,
	}
```

### tairan 名字:泰然
描述: 锁定技，结束阶段，你将体力回复至体力上限，并将手牌摸至体力上限（称为“泰然”牌）。然后你的下一个出牌阶段开始时，你失去上一次以此法回复的体力值的体力，弃置所有“泰然”牌。
```js
tairan: {
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
	}
```

## zhanghuyuechen 名字:张虎乐綝 势力:jin

### xijue 名字:袭爵
描述: 锁定技，游戏开始时，你获得4枚“爵”。结束阶段，你获得X枚“爵”（X为你本回合内造成的伤害数）。你可弃置一枚“爵”并在合适的时机发动〖突袭〗和〖骁果〗。
```js
xijue: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: ["enterGame", "showCharacterAfter"],
		},
		forced: true,
		filter(event, player) {
			if (get.mode() === "guozhan") {
				return game.getAllGlobalHistory("everything", evt => evt.name === "showCharacter" && evt.toShow?.some(i => get.character(i).skills?.includes("xijue"))).indexOf(event) === 0;
			}
			return event.name !== "showCharacter" && (event.name !== "phase" || game.phaseNumber === 0);
		},
		async content(event, trigger, player) {
			player.addMark("xijue", 4);
		},
		intro: {
			name2: "爵",
			content: "mark",
		},
		derivation: ["xijue_tuxi", "xijue_xiaoguo"],
		group: ["xijue_gain", "xijue_tuxi", "xijue_xiaoguo"],
		subSkill: {
			gain: {
				audio: "xijue",
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				filter(event, player) {
					const stat = player.getStat();
					return stat.damage != null && stat.damage > 0;
				},
				async content(event, trigger, player) {
					player.addMark("xijue", player.getStat().damage);
				},
			},
			tuxi: {
				audio: 2,
				trigger: {
					player: "phaseDrawBegin2",
				},
				filter(event, player) {
					return event.num > 0 && !event.numFixed && player.hasMark("xijue") && game.hasPlayer(target => player !== target && target.hasCards("h"));
				},
				async cost(event, trigger, player) {
					const num = get.mode() === "guozhan" ? Math.min(trigger.num, 2) : trigger.num;
					event.result = await player
						.chooseTarget({
							prompt: "是否弃置一枚“爵”发动【突袭】？",
							prompt2: `获得至多${get.translation(num)}名角色的各一张手牌，然后少摸等量的牌`,
							filterTarget(card, player, target) {
								return target !== player && target.hasCards("h");
							},
							selectTarget: [1, num],
							ai(target) {
								const attitude = get.attitude(get.player(), target);
								if (target.hasSkill("tuntian")) {
									return attitude / 10;
								}
								return 1 - attitude;
							},
						})
						.forResult();
				},
				logTarget: "targets",
				async content(event, trigger, player) {
					event.targets.sortBySeat();
					player.removeMark("xijue", 1);
					await player.gainMultiple(event.targets);
					trigger.num -= event.targets.length;
					if (trigger.num <= 0) {
						await game.delay();
					}
				},
				ai: { expose: 0.2 },
			},
			xiaoguo: {
				audio: 2,
				trigger: { global: "phaseJieshuBegin" },
				filter(event, player) {
					return player.hasMark("xijue") && event.player.isAlive() && event.player !== player && player.hasCards("h", card => _status.connectMode || get.mode() !== "guozhan" || get.type(card) === "basic");
				},
				async cost(event, trigger, player) {
					const target = trigger.player;
					let nono = true;
					if (get.damageEffect(target, player, player) > 0) {
						nono = Math.abs(get.attitude(player, target)) < 3 || target.hp > player.countMark("xijue") * 1.5 || target.hasCards("e", card => get.value(card, trigger.player) <= 0);
					}
					event.result = await player
						.chooseToDiscard({
							prompt: `是否弃置一枚“爵”和一张${get.mode() === "guozhan" ? "基本" : "手"}牌，对${get.translation(target)}发动【骁果】？`,
							filterCard(card, player) {
								return get.mode() !== "guozhan" || get.type2(card, player) === "basic";
							},
							position: "h",
							chooseonly: true,
							ai(card) {
								const { nono } = get.event();
								return nono ? 0 : 8 - get.useful(card);
							},
						})
						.set("nono", nono)
						.forResult();
					event.result.targets = [target];
				},
				logTarget: "targets",
				async content(event, trigger, player) {
					const { cards, targets } = event;
					const target = targets[0];
					player.removeMark("xijue", 1);
					await player.discard({ cards: event.cards });
					const result = await target
						.chooseToDiscard({
							prompt: `弃置一张装备牌并令${get.translation(player)}摸一张牌，或受到1点伤害`,
							filterCard: get.filter({ type: "equip" }),
							position: "he",
							ai(card) {
								const { player, nono } = get.event();
								if (nono) {
									return 0;
								}
								if (player.hp === 1) {
									return 10 - get.value(card);
								}
								return 9 - get.value(card);
							},
						})
						.set("nono", get.damageEffect(target, player, target) >= 0)
						.forResult();
					if (result.bool) {
						if (get.mode() !== "guozhan") {
							await player.draw();
						}
						return;
					}
					await target.damage();
				},
				ai: {
					expose: 0.3,
					threaten: 1.3,
				},
			},
		},
	}
```

## duyu 名字:晋杜预 势力:jin

### sanchen 名字:三陈
描述: 出牌阶段限一次。你可选择一名本回合内未选择过的角色。其摸三张牌，然后弃置三张牌。若其未以此法弃置牌或以此法弃置的牌的类别均不相同，则其摸一张牌且〖三陈〗于此阶段内使用次数上限+1。
```js
sanchen: {
		audio: 2,
		usable(skill, player) {
			return 1 + player.countMark("sanchen_add");
		},
		enable: "phaseUse",
		filter(event, player) {
			const stat = player.getStat("sanchen");
			return game.hasPlayer(current => !stat?.includes(current));
		},
		filterTarget(card, player, target) {
			const stat = player.getStat("sanchen");
			return !stat?.includes(target);
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const stat = player.getStat();
			const grantBonus = async () => {
				await target.draw();
				player.addTempSkill(`${event.name}_add`, "phaseUseAfter");
				player.addMark(`${event.name}_add`, 1, false);
				if (get.mode() === "guozhan") {
					player.addTempSkills("pozhu");
				}
			};
			stat.sanchen ??= [];
			stat.sanchen.push(target);
			if (get.mode() !== "guozhan") {
				player.addMark("sanchen", 1, false);
			}
			await target.draw(3);
			if (!target.countCards("he")) {
				await grantBonus();
				return;
			}
			const result = await target
				.chooseToDiscard({
					selectCard: 3,
					position: "he",
					forced: true,
					ai(card) {
						const list = ui.selected.cards.map(card => get.type2(card));
						if (!list.includes(get.type2(card))) {
							return 7 - get.value(card);
						}
						return -get.value(card);
					},
				})
				.forResult();
			if (!result.bool || !result.cards?.length) {
				await grantBonus();
				return;
			}
			const list = [];
			for (const card of result.cards) {
				list.add(get.type2(card));
			}
			if (list.length === result.cards.length) {
				await grantBonus();
			}
		},
		ai: {
			order: 9,
			threaten: 1.7,
			result: {
				target(player, target) {
					if (target.hasSkillTag("nogain")) {
						return 0.1;
					}
					return Math.sqrt(target.countCards("he"));
				},
			},
		},
		intro: {
			content: "已发动过#次技能",
		},
		marktext: "陈",
		subSkill: {
			add: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

### zhaotao 名字:昭讨
描述: 觉醒技，准备阶段，若你本局游戏内发动〖三陈〗的次数大于2，则你减1点体力上限并获得〖破竹〗。
```js
zhaotao: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		juexingji: true,
		forbid: ["guozhan"],
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			return player.countMark("sanchen") > 2;
		},
		async content(event, _trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			await player.addSkills("pozhu");
		},
		derivation: "pozhu",
		ai: {
			combo: "sanchen",
		},
	}
```

