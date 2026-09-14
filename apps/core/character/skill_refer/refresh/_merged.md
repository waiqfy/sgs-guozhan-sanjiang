# refresh merged reference

## re_xushu 名字:界徐庶 势力:shu

### zhuhai 名字:诛害
描述: 其他角色的结束阶段开始时，若该角色本回合造成过伤害，你可以对其使用一张【杀】。
```js
zhuhai: {
		audio: 2,
		audioname: ["gz_re_xushu"],
		trigger: { global: "phaseJieshuBegin" },
		direct: true,
		filter(event, player) {
			return event.player.isIn() && event.player.getStat("damage") && lib.filter.targetEnabled({ name: "sha" }, player, event.player) && (player.hasSha() || (_status.connectMode && player.countCards("h") > 0));
		},
		clearTime: true,
		async content(event, trigger, player) {
			await player
				.chooseToUse(
					function (card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					},
					"诛害：是否对" + get.translation(trigger.player) + "使用一张杀？"
				)
				.set("logSkill", "zhuhai")
				.set("complexSelect", true)
				.set("complexTarget", true)
				.set("filterTarget", function (card, player, target) {
					if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
						return false;
					}
					return lib.filter.targetEnabled.apply(this, arguments);
				})
				.set("sourcex", trigger.player);
		},
	}
```

### qianxin 名字:潜心
描述: 觉醒技，当你造成一次伤害后，若你已受伤，你须减1点体力上限，并获得技能〖荐言〗。
```js
qianxin: {
		skillAnimation: true,
		animationColor: "orange",
		audio: 2,
		juexingji: true,
		trigger: { source: "damageSource" },
		forced: true,
		derivation: "jianyan",
		filter(event, player) {
			return player.hp < player.maxHp;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.addSkills("jianyan");
			await player.loseMaxHp();
		},
	}
```

## re_lidian 名字:界李典 势力:wei

### xunxun 名字:恂恂
描述: 摸牌阶段，你可以观看牌堆顶的四张牌，然后将其中的两张牌置于牌堆顶，并将其余的牌以任意顺序置于牌堆底。
```js
xunxun: {
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
	}
```

### xinwangxi 名字:忘隙
描述: 当你对其他角色造成1点伤害后，或受到其他角色造成的1点伤害后，你可以摸两张牌，然后交给其一张牌。
```js
xinwangxi: {
		audio: "wangxi",
		inherit: "wangxi",
		async content(event, trigger, player) {
			const target = get.info(event.name).logTarget(trigger, player);
			await player.draw(2);
			if (player.countCards("he") && target.isIn()) {
				await player.chooseToGive(target, "he", true);
			}
		},
	}
```

## re_zhongyao 名字:界钟繇 势力:wei

### rehuomo 名字:活墨
描述: 每种牌名每回合限一次。当你需要使用一张基本牌时，你可以将一张黑色非基本牌置于牌堆顶，视为使用此基本牌。
```js
rehuomo: {
		audio: "huomo",
		audioname: ["huzhao", "re_zhongyao"],
		enable: "chooseToUse",
		hiddenCard(player, name) {
			if (get.type(name) != "basic") {
				return false;
			}
			const list = player.getStorage("rehuomo");
			if (list.includes(name)) {
				return false;
			}
			return player.hasCard(function (card) {
				return get.color(card) == "black" && get.type(card) != "basic";
			}, "eh");
		},
		filter(event, player) {
			if (
				event.type == "wuxie" ||
				!player.hasCard(function (card) {
					return get.color(card) == "black" && get.type(card) != "basic";
				}, "eh")
			) {
				return false;
			}
			const list = player.getStorage("rehuomo");
			for (let name of lib.inpile) {
				if (get.type(name) != "basic" || list.includes(name)) {
					continue;
				}
				let card = { name: name, isCard: true };
				if (event.filterCard(card, player, event)) {
					return true;
				}
				if (name == "sha") {
					for (let nature of lib.inpile_nature) {
						card.nature = nature;
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
				const vcards = [];
				const list = player.getStorage("rehuomo");
				for (let name of lib.inpile) {
					if (get.type(name) != "basic" || list.includes(name)) {
						continue;
					}
					let card = { name: name, isCard: true };
					if (event.filterCard(card, player, event)) {
						vcards.push(["基本", "", name]);
					}
					if (name == "sha") {
						for (let nature of lib.inpile_nature) {
							card.nature = nature;
							if (event.filterCard(card, player, event)) {
								vcards.push(["基本", "", name, nature]);
							}
						}
					}
				}
				return ui.create.dialog("活墨", [vcards, "vcard"], "hidden");
			},
			check(button) {
				const player = _status.event.player;
				const card = { name: button.link[2], nature: button.link[3] };
				if (game.hasPlayer(current => player.canUse(card, current) && get.effect(current, card, player, player) > 0)) {
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
						case "shan":
							return 1;
					}
				}
				return 0;
			},
			backup(links, player) {
				return {
					check(card) {
						return 1 / Math.max(0.1, get.value(card));
					},
					filterCard(card) {
						return get.type(card) != "basic" && get.color(card) == "black";
					},
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						suit: "none",
						number: undefined,
						isCard: true,
					},
					position: "he",
					popname: true,
					ignoreMod: true,
					async precontent(event, trigger, player) {
						if (!event.result?.bool || !event.result.card || !event.result.cards?.length) {
							return;
						}
						player.logSkill("rehuomo");
						const card = event.result.cards[0];
						game.log(player, "将", card, "置于牌堆顶");
						await player
							.loseToDiscardpile({
								cards: [card],
								position: ui.cardPile,
								insert_card: true,
							})
							.set("log", false);
						const viewAs = {
							name: event.result.card.name,
							nature: event.result.card.nature,
							isCard: true,
						};
						event.result.card = viewAs;
						event.result.cards = [];
						if (!player.storage.rehuomo) {
							player.when({ global: "phaseAfter" }).step(async (event, trigger, player) => {
								player.unmarkSkill("rehuomo");
							});
						}
						player.markAuto("rehuomo", viewAs.name);
					},
				};
			},
			prompt(links, player) {
				return "将一张黑色非基本牌置于牌堆顶并视为使用一张" + get.translation(links[0][3] || "") + get.translation(links[0][2]);
			},
		},
		marktext: "墨",
		intro: {
			content: "本回合已因〖活墨〗使用过$",
			onunmark: true,
		},
		ai: {
			order() {
				var player = _status.event.player;
				var event = _status.event;
				var list = player.getStorage("rehuomo");
				if (!list.includes("jiu") && event.filterCard({ name: "jiu" }, player, event) && get.effect(player, { name: "jiu" }) > 0) {
					return 3.1;
				}
				return 2.9;
			},
			respondSha: true,
			fireAttack: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (tag == "fireAttack") {
					return true;
				}
				if (
					player.hasCard(function (card) {
						return get.color(card) == "black" && get.type(card) != "basic";
					}, "he")
				) {
					if (arg === "respond") {
						return false;
					}
					var list = player.getStorage("rehuomo");
					if (tag == "respondSha") {
						if (list.includes("sha")) {
							return false;
						}
					} else if (tag == "respondShan") {
						if (list.includes("shan")) {
							return false;
						}
					}
				} else {
					return false;
				}
			},
			result: {
				player: 1,
			},
		},
	}
```

### zuoding
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## xin_zhangliang 名字:界张梁 势力:qun

### rejijun 名字:集军
描述: 当你使用目标角色含有自己的牌结算完毕后，你可以进行一次判定并将判定牌置于武将牌上，称为“方”。
```js
rejijun: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return event.targets && event.targets.includes(player);
		},
		frequent: true,
		async content(event, trigger, player) {
			const judgeEvent = player.judge({
				judge(card) {
					return 1;
				},
			});
			judgeEvent.callback = lib.skill.rejijun.callback;
			await judgeEvent;
		},
		async callback(event, trigger, player) {
			const { card } = event;
			if (typeof card?.number == "number") {
				const next = player.addToExpansion(card, "gain2");
				next.gaintag.add("rejijun");
				await next;
			}
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile({
					cards,
				});
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		marktext: "方",
		ai: { combo: "refangtong" },
	}
```

### refangtong 名字:方统
描述: 结束阶段，你可以将一张手牌置于武将牌上，称为“方”。若如此做，你可以移去任意张“方”并对一名其他角色造成1点雷属性伤害（若你移去的“方”的点数和大于36，则改为造成3点雷属性伤害）。
```js
refangtong: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: get.prompt2("refangtong"),
					filterCard(card) {
						return typeof card.number === "number";
					},
				})
				.set("ai", card => {
					var player = _status.event.player;
					if (!game.hasPlayer(target => target != player && get.damageEffect(target, player, player, "thunder") > 0)) {
						return 0;
					}
					if (
						player.getExpansions("rejijun").reduce(function (num, card) {
							const number = get.number(card, false);
							return num + (typeof number === "number" ? number : 0);
						}, 0) > 36
					) {
						return 1 / (get.value(card) || 0.5);
					} else {
						if (lib.skill.refangtong.thunderEffect(card, player)) {
							return 10 - get.value(card);
						}
						return 5 - get.value(card);
					}
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = event.cards;
			await player.addToExpansion({
				cards,
				source: player,
				animate: "give",
				gaintag: ["rejijun"],
			});
			const result = await player
				.chooseButton({
					selectButton: [1, player.getExpansions("rejijun").length],
					createDialog: ["###是否移去任意张“方”，对一名其他角色造成1点雷属性伤害？###若你移去的“方”的点数和大于36，则改为造成3点雷属性伤害", player.getExpansions("rejijun")],
					allowChooseAll: true,
					ai(button) {
						var player = _status.event.player;
						var cards = player.getExpansions("rejijun");
						if (
							cards.reduce((num, card) => {
								const number = get.number(card, false);
								return num + (typeof number === "number" ? number : 0);
							}, 0) <= 36
						) {
							if (!ui.selected.buttons.length) {
								const number = get.number(button.link, false);
								if (typeof number !== "number") {
									return 0;
								}
								return 1 / number;
							}
							return 0;
						} else {
							var num = 0,
								list = [];
							cards.sort((a, b) => {
								const numberA = get.number(a, false);
								const numberB = get.number(b, false);

								if (typeof numberA !== "number") {
									return 1;
								}
								if (typeof numberB !== "number") {
									return -1;
								}
								return numberB - numberA;
							});
							for (const card of cards) {
								list.push(card);
								const number = get.number(card, false);
								if (typeof number !== "number") {
									continue;
								}
								num += number;
								if (num > 36) {
									break;
								}
							}
							return list.includes(button.link) ? 1 : 0;
						}
					},
				})
				.forResult();
			if (result?.bool && result.links?.length) {
				const bool =
					result.links.reduce((num, card) => {
						const number = get.number(card, false);
						return num + (typeof number === "number" ? number : 0);
					}, 0) > 36;
				await player.loseToDiscardpile({ cards: result.links });
				const result2 = await player
					.chooseTarget({
						prompt: "请选择一名其他角色",
						prompt2: `对其造成${bool ? 3 : 1}点雷属性伤害`,
						filterTarget: lib.filter.notMe,
						ai(target) {
							return get.damageEffect(target, _status.event.player, _status.event.player, "thunder");
						},
					})
					.forResult();
				if (result2?.bool && result2.targets?.length) {
					const target = result2.targets[0];
					player.line(target, "thunder");
					await target.damage({
						num: bool ? 3 : 1,
						nature: "thunder",
					});
				}
			}
		},
		thunderEffect(card, player) {
			let cards = player.getExpansions("rejijun"),
				num = 0;
			cards.push(card);
			if (
				cards.reduce(function (num, card) {
					return num + get.number(card, false);
				}, 0) <= 36
			) {
				return false;
			}
			// @ts-ignore
			cards.sort((a, b) => get.number(b, false) - get.number(a, false));
			let bool = false;
			for (let i = 0; i < cards.length; i++) {
				if (cards[i] == card) {
					bool = true;
				}
				// @ts-ignore
				num += get.number(cards[i], false);
				if (num > 36) {
					break;
				}
			}
			return bool;
		},
	}
```

## re_simalang 名字:界司马朗 势力:wei

### requji 名字:去疾
描述: 出牌阶段限一次，你可以弃置X张牌（X为你已损失的体力值）并令至多X名角色回复1点体力，然后仍处于受伤状态的目标角色摸一张牌。若你以此法弃置了黑色牌，你失去1点体力。
```js
requji: {
		inherit: "quji",
		async content(event, trigger, player) {
			const { target, targets, cards } = event;
			await target.recover();
			if (target.isDamaged()) {
				await target.draw();
			}
			if (target == targets[targets.length - 1] && cards.some(card => get.color(card, player) == "black")) {
				await player.loseHp();
			}
		},
	}
```

### rejunbing 名字:郡兵
描述: 一名角色的结束阶段，若其手牌数小于其体力值，其可以摸一张牌并将所有手牌交给你，然后你可以交给其等量的牌。
```js
rejunbing: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return event.player.countCards("h") < event.player.getHp();
		},
		async cost(event, trigger, player) {
			event.result = await trigger.player
				.chooseBool({
					prompt: player === trigger.player ? get.prompt(event.skill) : `是否响应${get.translation(player)}的【郡兵】？`,
					prompt2: "摸一张牌" + (player === trigger.player ? "" : "，将所有手牌交给" + get.translation(player) + "，然后其可以交给你等量张牌"),
					ai() {
						return get.event().choice;
					},
				})
				.set("choice", get.attitude(trigger.player, player) > 0)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			if (target != player) {
				game.log(target, "响应了", player, "的", "#g【郡兵】");
			}
			await target.draw();
			let cards = target.getCards("h");
			if (target == player || !cards.length) {
				return;
			}
			await target.give(cards, player);
			const num = cards.length;
			if (player.countCards("he") >= num) {
				const result = await player
					.chooseCard({
						prompt: "郡兵：是否还给" + get.translation(target) + get.translation(num) + "张牌？",
						selectCard: num,
						position: "he",
						ai(card) {
							const player = _status.event.player;
							const target = get.event().target;
							if (get.attitude(player, target) <= 0) {
								if (card.name === "du") {
									return 114514_1919810;
								}
								return -get.value(card);
							}
							return 8 - Math.sqrt(target.hp) - get.value(card);
						},
					})
					.set("target", target)
					.forResult();
				if (result.bool && result.cards?.length) {
					await player.give(result.cards, target);
				}
			}
		},
	}
```

## re_zhugedan 名字:界诸葛诞 势力:wei

### regongao 名字:功獒
描述: 锁定技。一名其他角色首次进入濒死状态时，你增加1点体力上限，然后回复1点体力。
```js
regongao: {
		audio: 2,
		trigger: { global: "dying" },
		filter(event, player) {
			if (player == event.player) {
				return false;
			}
			return !player.getAllHistory("useSkill", evt => evt.skill == "regongao" && evt.targets[0] == event.player).length;
		},
		forced: true,
		logTarget: "player",
		async content(event, trigger, player) {
			await player.gainMaxHp();
			await player.recover();
		},
	}
```

### rejuyi 名字:举义
描述: 觉醒技。准备阶段，若你已受伤，且你的体力上限大于场上的存活角色数，你将手牌数摸至体力上限，然后获得技能〖崩坏〗和〖威重〗。
```js
rejuyi: {
		audio: 2,
		derivation: ["benghuai", "reweizhong"],
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.maxHp > game.countPlayer() && player.isDamaged();
		},
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "thunder",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.drawTo(player.maxHp);
			await player.addSkills(["benghuai", "reweizhong"]);
		},
	}
```

## re_caorui 名字:界曹叡 势力:wei

### huituo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### remingjian 名字:明鉴
描述: `出牌阶段限一次。你可以将所有手牌交给一名其他角色，然后该角色于其下个回合获得如下效果：1.手牌上限与使用【杀】的次数上限+1；2.当该角色首次造成伤害后，你发动一次${get.poptip("huituo")}。`
```js
remingjian: {
		inherit: "mingjian",
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.give(cards, target);
			target.addTempSkill("remingjian_buff", { player: "phaseAfter" });
			if (!target.storage.remingjian_buff) {
				target.storage.remingjian_buff = [];
			}
			target.storage.remingjian_buff.push(player);
			target.markSkill("remingjian_buff");
		},
		derivation: "huituo",
		subSkill: {
			buff: {
				charlotte: true,
				mark: true,
				marktext: "鉴",
				intro: {
					content: (storage, player) => {
						const num = storage.length;
						return `<li>被${get.translation(storage.toUniqued())}鉴识<li>手牌上限+${num}，出杀次数+${num}`;
					},
				},
				onremove: true,
				trigger: { source: "damageSource" },
				filter(event, player) {
					// @ts-ignore
					if (_status.currentPhase !== player) {
						return false;
					}
					return player.getHistory("sourceDamage").indexOf(event) == 0 && player.getStorage("remingjian_buff").some(current => current.isIn());
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const masters = player
						.getStorage(event.name)
						.filter(current => current.isIn())
						.toUniqued()
						// @ts-ignore
						.sortBySeat(_status.currentPhase);
					while (masters.length) {
						const master = masters.shift();
						if (!master.isIn()) {
							continue;
						}
						const next = game.createEvent("huituo");
						// @ts-ignore
						next.setContent(lib.skill.huituo.content);
						next.player = master;
						next.forced = true;
						next._trigger = trigger;
						await next;
					}
				},
				mod: {
					maxHandcard(player, num) {
						return num + player.getStorage("remingjian_buff").length;
					},
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.getStorage("remingjian_buff").length;
						}
					},
				},
			},
		},
	}
```

### xingshuai
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_caochong 名字:界曹冲 势力:wei

### rechengxiang 名字:称象
描述: 当你受到伤害后，你可以亮出牌堆顶的四张牌。然后获得其中任意数量点数之和不大于13的牌。若你得到的牌点数之和为13，你复原武将牌。
```js
rechengxiang: {
		audio: 2,
		audioname2: { sxrm_caocao: "rechengxiang_sxrm_caocao", tw_sxrm_caocao: "rechengxiang_sxrm_caocao" },
		inherit: "chengxiang",
		async callback(event, trigger, player) {
			if (
				event.cards2?.length &&
				event.cards2
					.map(card => {
						return get.number(card);
					})
					.reduce((sum, num) => {
						return (sum += num);
					}, 0) == 13
			) {
				await player.link(false);
				await player.turnOver(false);
			}
		},
	}
```

### renxin
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_zhangzhang 名字:界张昭张纮 势力:wu

### olzhijian 名字:直谏
描述: 出牌阶段，你可以将一张装备牌置于其他角色的装备区（可替换原装备），然后摸一张牌。
```js
olzhijian: {
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
	}
```

### olguzheng 名字:固政
描述: 每阶段限一次。当其他角色的至少两张牌因弃置而进入弃牌堆后，你可以令其获得其中一张牌，然后你可以获得剩余的牌。
```js
olguzheng: {
		audio: 2,
		trigger: {
			global: ["loseAfter", "loseAsyncAfter"],
		},
		filter(event, player) {
			if (event.type != "discard") {
				return false;
			}
			if (player.hasSkill("olguzheng_used")) {
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
				if (current == player) {
					return false;
				}
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
				if (current == player) {
					continue;
				}
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
				let cards = cardsList.shift();
				const result = await player
					.chooseButton(2, [get.prompt("olguzheng", target), '<span class="text center">被选择的牌将成为对方收回的牌</span>', cards, [["获得剩余的牌", "放弃剩余的牌"], "tdnodes"]])
					.set("filterButton", function (button) {
						const type = typeof button.link;
						if (ui.selected.buttons.length && type == typeof ui.selected.buttons[0].link) {
							return false;
						}
						return true;
					})
					.set("check", lib.skill.olguzheng.checkx(trigger, player, cards))
					.set("ai", function (button) {
						if (typeof button.link == "string") {
							return button.link == "获得剩余的牌" ? 1 : 0;
						}
						if (_status.event.check) {
							return 20 - get.value(button.link, _status.event.getTrigger().player);
						}
						return 0;
					})
					.setHiddenSkill("olguzheng")
					.forResult();
				if (result?.links) {
					player.logSkill("olguzheng", target);
					const links = result.links;
					player.addTempSkill("olguzheng_used", ["phaseZhunbeiAfter", "phaseDrawAfter", "phaseJudgeAfter", "phaseUseAfter", "phaseDiscardAfter", "phaseJieshuAfter"]);
					if (typeof links[0] != "string") {
						links.reverse();
					}
					const card = links[1];
					await target.gain(card, "gain2");
					cards.remove(card);
					cards = cards.filterInD("d");
					if (cards.length > 0 && links[0] == "获得剩余的牌") {
						await player.gain(cards, "gain2");
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
	}
```

## re_jsp_huangyueying 名字:界SP黄月英 势力:qun

### rejiqiao 名字:机巧
描述: 出牌阶段开始时，你可以弃置任意张牌，然后亮出牌堆顶X张牌（X为你以此法弃置的牌数与其中装备牌数之和），你获得其中所有非装备牌。
```js
rejiqiao: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(get.prompt2("rejiqiao"), [1, player.countCards("he")], "he", "chooseonly", "allowChooseAll")
				.set("ai", function (card) {
					if (card.name == "bagua") {
						return 10;
					}
					return 7 - get.value(card);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			await player.modedDiscard(cards);
			const num = cards.length + cards.filter(card => get.type(card) == "equip").length;
			const showCards = get.cards(num);
			await game.cardsGotoOrdering(showCards);
			await player.showCards(showCards);
			await player.gain(
				showCards.filter(card => get.type(card) != "equip"),
				"gain2"
			);
		},
		ai: {
			threaten: 1.6,
		},
	}
```

### relinglong 名字:玲珑
描述: 锁定技。若你的装备区：有空置的防具栏，你视为拥有〖八卦阵〗；有空置的两种坐骑栏，你的手牌上限+2；有空置的宝物栏，你视为拥有〖奇才〗；以上均满足：你使用的【杀】或普通锦囊牌不可被响应。
```js
relinglong: {
		audio: 2,
		trigger: {
			player: ["loseAfter", "disableEquipAfter", "enableEquipAfter"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter", "phaseBefore"],
		},
		init(player, skill) {
			player.addExtraEquip(skill, "bagua", true, player => player.hasEmptySlot(2) && lib.card.bagua);
		},
		onremove(player, skill) {
			delete player.storage[skill];
			player.removeExtraEquip(skill);
		},
		forced: true,
		derivation: "reqicai",
		filter(event, player) {
			if (event.name == "disableEquip" || event.name == "enableEquip") {
				if (!event.slots.includes("equip5")) {
					return false;
				}
			} else if (event.name != "phase" && (event.name != "equip" || event.player != player)) {
				var evt = event.getl(player);
				if (!evt || !evt.es || !evt.es.some(i => get.subtypes(i).includes("equip5"))) {
					return false;
				}
			}
			var skills = player.additionalSkills["relinglong"];
			return (skills && skills.length > 0) != player.hasEmptySlot(5);
		},
		direct: true,
		async content(event, trigger, player) {
			player.removeAdditionalSkill("relinglong");
			if (player.hasEmptySlot(5)) {
				player.addAdditionalSkill("relinglong", ["reqicai"]);
			}
		},
		group: ["linglong_bagua", "relinglong_directhit"],
		mod: {
			maxHandcard(player, num) {
				if (!player.hasEmptySlot(3) || !player.hasEmptySlot(4)) {
					return;
				}
				return num + 2;
			},
		},
		subSkill: {
			directhit: {
				audio: "relinglong",
				trigger: { player: "useCard" },
				forced: true,
				filter(event, player) {
					if (event.card.name != "sha" && get.type(event.card, null, false) != "trick") {
						return false;
					}
					for (var i = 2; i < 6; i++) {
						if (!player.hasEmptySlot(i)) {
							return false;
						}
					}
					return true;
				},
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.players);
					game.log(trigger.card, "不可被响应");
				},
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						if (!arg || !arg.card || !arg.target || (arg.card.name != "sha" && get.type(arg.card, null, false) != "trick")) {
							return false;
						}
						for (var i = 2; i < 6; i++) {
							if (!player.hasEmptySlot(i)) {
								return false;
							}
						}
						return true;
					},
				},
			},
		},
	}
```

## re_zhangsong 名字:界张松 势力:shu

### qiangzhi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rexiantu 名字:献图
描述: 其他角色的出牌阶段开始时，你可以摸两张牌，然后将两张牌交给该角色。然后此阶段结束时，若其于此阶段没有造成过伤害，你失去1点体力。
```js
rexiantu: {
		audio: 2,
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return event.player != player;
		},
		logTarget: "player",
		check(event, player) {
			if (get.attitude(_status.event.player, event.player) < 1) {
				return false;
			}
			return player.hp > 1 || player.hasCard(card => (get.name(card) === "tao" || get.name(card) === "jiu") && lib.filter.cardEnabled(card, player), "hs");
		},
		async content(event, trigger, player) {
			if (get.mode() !== "identity" || player.identity !== "nei") {
				player.addExpose(0.2);
			}
			await player.draw(2);
			if (!player.countCards("he")) {
				return;
			}
			const result = await player
				.chooseCard(2, "he", true, "交给" + get.translation(trigger.player) + "两张牌")
				.set("ai", function (card) {
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
			if (result?.cards?.length) {
				const target = trigger.player;
				await player.give(result.cards, target);
				target.addTempSkill("rexiantu_check", "phaseUseAfter");
				target.markAuto("rexiantu_check", [player]);
			}
		},
		ai: {
			threaten(player, target) {
				return (
					1 +
					game.countPlayer(current => {
						if (current != target && get.attitude(target, current) > 0) {
							return 0.5;
						}
						return 0;
					})
				);
			},
			expose: 0.3,
		},
		subSkill: {
			check: {
				charlotte: true,
				trigger: { player: "phaseUseEnd" },
				forced: true,
				popup: false,
				onremove: true,
				filter(event, player) {
					return !player.getHistory("sourceDamage", evt => {
						return evt.getParent("phaseUse") == event;
					}).length;
				},
				async content(event, trigger, player) {
					var targets = player.getStorage("rexiantu_check");
					targets.sortBySeat();
					for (var i of targets) {
						if (i.isIn()) {
							await i.loseHp();
						}
					}
					player.removeSkill("rexiantu_check");
				},
			},
		},
	}
```

## re_zhuzhi 名字:界朱治 势力:wu

### reanguo 名字:安国
描述: 出牌阶段限一次。你可以选择一名其他角色，若其：手牌数为全场最少，其摸一张牌；体力值为全场最低，其回复1点体力；装备区内牌数为全场最少，其随机使用一张装备牌。然后若该角色有未执行的效果且你满足条件，你执行之。若你与其执行了全部分支，你可以重铸任意张牌。
```js
reanguo: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			const { target } = event;
			let draw, recover, equip;
			if (target.isMinHandcard()) {
				await target.draw();
				draw = true;
			}
			if (target.isMinHp() && target.isDamaged()) {
				await target.recover();
				recover = true;
			}
			if (target.isMinEquip()) {
				const cardx = get.cardPile(
					function (card) {
						return get.type(card) == "equip" && target.hasUseTarget(card);
					},
					false,
					"random"
				);
				if (cardx) {
					await target.chooseUseTarget(cardx, "nothrow", "nopopup", true);
					equip = true;
				}
			}
			game.updateRoundNumber();

			if (!draw && player.isMinHandcard()) {
				await player.draw();
				draw = true;
			}
			if (!recover && player.isMinHp() && player.isDamaged()) {
				await player.recover();
				recover = true;
			}
			if (!equip && player.isMinEquip()) {
				const cardx = get.cardPile(function (card) {
					return get.type(card) == "equip" && player.hasUseTarget(card);
				});
				if (cardx) {
					await player.chooseUseTarget(cardx, "nothrow", "nopopup", true);
					equip = true;
				}
			}

			if (draw && recover && equip) {
				const result = await player
					.chooseCard("安国：是否重铸任意张牌？", [1, Infinity], lib.filter.cardRecastable, "he", "allowChooseAll")
					.set("ai", card => {
						return 6 - get.value(card);
					})
					.forResult();
				if (result?.bool) {
					await player.recast(result.cards);
				}
			}
		},
		ai: {
			threaten: 1.65,
			order: 9,
			result: {
				player(player, target) {
					if (get.attitude(player, target) <= 0) {
						if (target.isMinHandcard() || target.isMinEquip() || target.isMinHp()) {
							return -1;
						}
					}
					let num = 0;
					if (player.isMinHandcard() || target.isMinHandcard()) {
						num++;
					}
					if (player.isMinEquip() || target.isMinEquip()) {
						num++;
					}
					if ((player.isMinHp() && player.isDamaged()) || (target.isMinHp() && target.isDamaged())) {
						num += 2.1;
					}
					return num;
				},
			},
		},
	}
```

## dc_caozhi 名字:界曹植 势力:wei

### reluoying 名字:落英
描述: 当其他角色的梅花牌因弃置或判定而进入弃牌堆后，你可以获得之。
```js
reluoying: {
		audio: 2,
		audioname: ["dc_caozhi", "ol_caozhi"],
		group: ["reluoying_discard", "reluoying_judge"],
		subfrequent: ["judge"],
		subSkill: {
			discard: {
				audio: "reluoying",
				audioname: ["dc_caozhi", "ol_caozhi"],
				trigger: { global: ["loseAfter", "loseAsyncAfter"] },
				filter(event, player) {
					if (event.type != "discard" || event.getlx === false) {
						return false;
					}
					var cards = event.cards.slice(0);
					var evt = event.getl(player);
					if (evt && evt.cards) {
						cards.removeArray(evt.cards);
					}
					for (var i = 0; i < cards.length; i++) {
						if (cards[i].original != "j" && get.suit(cards[i], event.player) == "club" && get.position(cards[i], true) == "d") {
							return true;
						}
					}
					return false;
				},
				direct: true,
				async content(event, trigger, player) {
					// step 0
					if (trigger.delay == false) {
						await game.delay();
					}
					// step 1
					var cards = [],
						cards2 = trigger.cards.slice(0),
						evt = trigger.getl(player);
					if (evt && evt.cards) {
						cards2.removeArray(evt.cards);
					}
					for (var i = 0; i < cards2.length; i++) {
						if (cards2[i].original != "j" && get.suit(cards2[i], trigger.player) == "club" && get.position(cards2[i], true) == "d") {
							cards.push(cards2[i]);
						}
					}
					let result;
					if (cards.length) {
						result = await player
							.chooseButton(["落英：选择要获得的牌", cards], [1, cards.length])
							.set("ai", function (button) {
								return get.value(button.link, _status.event.player, "raw");
							})
							.forResult();
					}
					// step 2
					if (result && result.bool) {
						player.logSkill(event.name);
						await player.gain(result.links, "gain2", "log");
					}
				},
			},
			judge: {
				audio: "reluoying",
				audioname: ["dc_caozhi", "ol_caozhi"],
				trigger: { global: "cardsDiscardAfter" },
				direct: true,
				filter(event, player) {
					var evt = event.getParent().relatedEvent;
					if (!evt || evt.name != "judge") {
						return;
					}
					if (evt.player == player) {
						return false;
					}
					if (get.position(event.cards[0], true) != "d") {
						return false;
					}
					return get.suit(event.cards[0]) == "club";
				},
				async content(event, trigger, player) {
					// step 0
					const result = await player
						.chooseButton(["落英：选择要获得的牌", trigger.cards], [1, trigger.cards.length])
						.set("ai", function (button) {
							return get.value(button.link, _status.event.player, "raw");
						})
						.forResult();
					// step 1
					if (result.bool) {
						player.logSkill(event.name);
						await player.gain(result.links, "gain2", "log");
					}
				},
			},
		},
	}
```

### dcjiushi 名字:酒诗
描述: ①当你需要使用【酒】时，若你的武将牌正面向上，你可以翻面，视为使用一张【酒】。②当你受到伤害后，若你的武将牌于受到伤害时背面向上，你可以翻面。③当你使用【酒】后，你使用【杀】的次数上限+1直到你的下个回合结束。
```js
dcjiushi: {
		audio: 2,
		trigger: {
			player: "useCardAfter",
		},
		filter(event, player) {
			return event.card.name == "jiu";
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			player.addTempSkill("dcjiushi_sha", { player: "phaseEnd" });
			player.addMark("dcjiushi_sha", 1, false);
		},
		group: ["dcjiushi_use", "dcjiushi_damage"],
		subSkill: {
			use: {
				audio: "dcjiushi",
				enable: "chooseToUse",
				hiddenCard(player, name) {
					if (name == "jiu") {
						return !player.isTurnedOver();
					}
					return false;
				},
				filter(event, player) {
					if (player.isTurnedOver()) {
						return false;
					}
					return event.filterCard({ name: "jiu", isCard: true }, player, event);
				},
				async content(event, trigger, player) {
					if (_status.event.getParent(2).type == "dying") {
						event.dying = player;
						event.type = "dying";
					}
					await player.turnOver();
					await player.useCard({ name: "jiu", isCard: true }, player);
				},
				ai: {
					save: true,
					skillTagFilter(player, tag, arg) {
						return !player.isTurnedOver() && _status.event?.dying == player;
					},
					order: 5,
					result: {
						player(player) {
							if (_status.event.parent.name == "phaseUse") {
								if (player.countCards("h", "jiu") > 0) {
									return 0;
								}
								if (player.getEquip("zhuge") && player.countCards("h", "sha") > 1) {
									return 0;
								}
								if (!player.countCards("h", "sha")) {
									return 0;
								}
								var targets = [];
								var target;
								var players = game.filterPlayer();
								for (var i = 0; i < players.length; i++) {
									if (get.attitude(player, players[i]) < 0) {
										if (player.canUse("sha", players[i], true, true)) {
											targets.push(players[i]);
										}
									}
								}
								if (targets.length) {
									target = targets[0];
								} else {
									return 0;
								}
								var num = get.effect(target, { name: "sha" }, player, player);
								for (var i = 1; i < targets.length; i++) {
									var num2 = get.effect(targets[i], { name: "sha" }, player, player);
									if (num2 > num) {
										target = targets[i];
										num = num2;
									}
								}
								if (num <= 0) {
									return 0;
								}
								var e2 = target.getEquip(2);
								if (e2) {
									if (e2.name == "tengjia") {
										if (
											!player.countCards("h", {
												name: "sha",
												nature: "fire",
											}) &&
											!player.getEquip("zhuque")
										) {
											return 0;
										}
									}
									if (e2.name == "renwang") {
										if (!player.countCards("h", { name: "sha", color: "red" })) {
											return 0;
										}
									}
									if (e2.name == "baiyin") {
										return 0;
									}
								}
								if (player.getEquip("guanshi") && player.countCards("he") > 2) {
									return 1;
								}
								return target.countCards("h") > 3 ? 0 : 1;
							}
							if (player == _status.event.dying || player.isTurnedOver()) {
								return 3;
							}
						},
					},
					effect: {
						target(card, player, target) {
							if (target.isTurnedOver()) {
								if (get.tag(card, "damage")) {
									if (player.hasSkillTag("jueqing", false, target)) {
										return [1, -2];
									}
									if (target.hp == 1) {
										return;
									}
									return [1, target.countCards("h") / 2];
								}
							}
						},
					},
				},
			},
			damage: {
				audio: "dcjiushi",
				trigger: { player: "damageEnd" },
				check(event, player) {
					return player.isTurnedOver();
				},
				prompt: "是否发动【酒诗】，将武将牌翻面？",
				filter(event, player) {
					if (event.checkJiushi) {
						return true;
					}
					return false;
				},
				async content(event, trigger, player) {
					await player.turnOver();
				},
			},
			sha: {
				charlotte: true,
				onremove: true,
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("dcjiushi_sha");
						}
					},
				},
			},
		},
	}
```

## ol_huangzhong 名字:界黄忠 势力:shu

### xinliegong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### remoshi 名字:没矢
描述: 锁定技。①当你使用【杀】对目标角色造成伤害后，若其装备区里有防具牌或坐骑牌，你将此【杀】对应的实体牌置于其武将牌上。②当有“没矢”牌的角色失去防具牌或坐骑牌后，你获得其“没矢”牌。
```js
remoshi: {
		trigger: { source: "damageSource" },
		forced: true,
		filter(event, player) {
			return event.player.isIn() && event.card && event.card.name == "sha" && event.cards.filterInD("od").length && event.notLink() && [2, 3, 4].some(i => event.player.getEquips(i).length > 0);
		},
		group: "remoshi_retrieve",
		async content(event, trigger, player) {
			trigger.player.addSkill("remoshi_stuck");
			const next = trigger.player.addToExpansion(trigger.cards.filterInD("od"), "gain2");
			next.gaintag.add("remoshi_stuck");
			await next;
		},
		subSkill: {
			retrieve: {
				audio: "remoshi",
				trigger: {
					global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				filter(event, player, name, target) {
					return target.isIn() && target.countExpansions("remoshi_stuck");
				},
				getIndex(event, player) {
					const keys = ["equip2", "equip3", "equip4"];
					return game
						.filterPlayer(current => {
							if (event.name == "gain" && current == player) {
								return false;
							}
							const cards = current.getExpansions("remoshi_stuck");
							if (!cards.length) {
								return false;
							}
							const evt = event.getl(current);
							if (evt && evt.cards2 && evt.cards2.some(i => get.subtypes(i).some(slot => keys.includes(slot)))) {
								return true;
							}
						})
						.sortBySeat();
				},
				forced: true,
				logTarget: (event, player, name, target) => target,
				async content(event, trigger, player) {
					const target = event.indexedData;
					const cards = target.getExpansions("remoshi_stuck");
					await player.gain(cards, target, "give", "bySelf");
				},
			},
			stuck: {
				marktext: "矢",
				charlotte: true,
				intro: {
					name: "没矢",
					name2: "矢",
					content: "expansion",
					markcount: "expansion",
				},
				onremove(player, skill) {
					var cards = player.getExpansions(skill);
					if (cards.length) {
						player.loseToDiscardpile(cards);
					}
				},
			},
		},
	}
```

## re_wenpin 名字:界文聘 势力:wei

### rezhenwei 名字:镇卫
描述: 当一名其他角色成为【杀】或黑色锦囊牌的目标时（使用者不为你），若该角色的体力值不大于你且此牌的目标角色数为1，你可以弃置一张牌并选择一项：1.摸一张牌，然后将此【杀】或黑色锦囊牌的目标转移给你；2.令此【杀】或黑色锦囊牌无效且将此【杀】或黑色锦囊牌置于使用者的武将牌上，然后当前回合结束后，使用者获得这些牌。
```js
rezhenwei: {
		audio: "zhenwei",
		inherit: "zhenwei",
		filter(event, player) {
			if (player == event.target || player == event.player) {
				return false;
			}
			if (!player.countCards("he")) {
				return false;
			}
			if (event.targets.length > 1) {
				return false;
			}
			if (!event.target) {
				return false;
			}
			if (event.target.hp > player.hp) {
				return false;
			}
			var card = event.card;
			if (card.name == "sha") {
				return true;
			}
			if (get.color(card) == "black" && get.type(card, "trick") == "trick") {
				return true;
			}
			return false;
		},
	}
```

## re_guanzhang 名字:界关兴张苞 势力:shu

### fuhun
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### retongxin 名字:同心
描述: 锁定技。你的攻击范围+2。
```js
retongxin: {
		mod: {
			attackRange: (player, num) => num + 2,
		},
	}
```

## re_mazhong 名字:界马忠 势力:shu

### refuman 名字:抚蛮
描述: 出牌阶段每名角色限一次。你可以弃置一张牌，令一名角色从弃牌堆中获得一张【杀】。然后其于其下个回合结束前失去此牌后，其摸一张牌；若其因使用或打出失去此牌，则改为你与其各摸一张牌。
```js
refuman: {
		audio: 2,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return !player.getStorage("refuman_used").includes(target);
		},
		filter(event, player) {
			return player.countCards("he") > 0 && game.hasPlayer(current => lib.skill.refuman.filterTarget(null, player, current));
		},
		filterCard: lib.filter.cardDiscardable,
		position: "he",
		async content(event, trigger, player) {
			const card = get.discardPile(card => card.name == "sha"),
				{ target } = event;
			if (card) {
				target.addTempSkill("refuman2", { player: "phaseAfter" });
				player.addSkill("refuman_draw");
				const next = target.gain(card, "gain2");
				next.gaintag.add("refuman");
				await next;
			}
			player.addTempSkill(event.name + "_used", "phaseChange");
			player.markAuto(event.name + "_used", target);
		},
		check(card) {
			return get.discardPile(card => card.name == "sha") ? 6 - get.value(card) : 0;
		},
		ai: {
			order: 2,
			result: {
				target(player, target) {
					if (!target.hasSha()) {
						return 1.2;
					}
					return 1;
				},
			},
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
				intro: {
					content: "已发动过角色：$",
				},
			},
			draw: {
				charlotte: true,
				audio: "refuman",
				trigger: { global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"] },
				getIndex(event, player) {
					return game
						.filterPlayer2(target => {
							const evt = event.getParent();
							if (!["useCard", "respond"].includes(evt?.name) && !target.isIn()) {
								return false;
							}
							if (event.name == "lose") {
								if (target !== event.player || event.refuman_active) {
									return false;
								}
								return Object.values(event.gaintag_map).flat().includes("refuman");
							}
							return target.hasHistory("lose", evt => {
								if (event !== evt.getParent() || evt.refuman_active) {
									return false;
								}
								return Object.values(evt.gaintag_map).flat().includes("refuman");
							});
						})
						.sortBySeat();
				},
				forced: true,
				filter: (event, player, name, target) => target,
				logTarget: (event, player, name, target) => target,
				async content(event, trigger, player) {
					const [target] = event.targets,
						evt = trigger.getParent();
					if (["useCard", "respond"].includes(evt?.name)) {
						await game.asyncDraw([target, player]);
					} else {
						await target.draw();
					}
					trigger.refuman_active = true;
				},
			},
		},
	}
```

## dc_chenqun 名字:界陈群 势力:wei

### repindi 名字:品第
描述: 出牌阶段每名角色限一次。你可以弃置一张本阶段未以此法弃置过的类型的牌并选择一名角色，你选择一项：1.其摸X张牌；2.其弃置X张牌（X为你本回合发动〖品第〗的次数）。然后若其已受伤，你横置或重置。
```js
repindi: {
		audio: 2,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return !player.getStorage("repindi_target").includes(target);
		},
		filterCard(card, player) {
			return !player.getStorage("repindi_type").includes(get.type2(card));
		},
		check(card) {
			var num = _status.event.player.getStat("skill").repindi || 0;
			return 6 + num - get.value(card);
		},
		position: "he",
		async content(event, trigger, player) {
			const { target, cards } = event,
				num = player.getStat("skill").repindi;
			player.addTempSkill("repindi_clear", ["phaseUseAfter", "phaseAfter"]);
			player.markAuto("repindi_target", [target]);
			player.markAuto("repindi_type", [get.type2(cards[0], cards[0].original == "h" ? player : false)]);
			player.syncStorage();
			let result;
			if (target.countCards("he") == 0) {
				result = { index: 0 };
			} else {
				result = await player
					.chooseControlList(true, ["令" + get.translation(target) + "摸" + get.cnNumber(num) + "张牌", "令" + get.translation(target) + "弃置" + get.cnNumber(num) + "张牌"], function () {
						return _status.event.choice;
					})
					.set("choice", get.attitude(player, target) > 0 ? 0 : 1)
					.forResult();
			}
			if (result?.index == 0) {
				await target.draw(num);
			} else {
				await target.chooseToDiscard(num, "he", true);
			}
			if (target.isDamaged()) {
				await player.link();
			}
		},
		subSkill: {
			clear: {
				trigger: { player: "phaseAfter" },
				charlotte: true,
				silent: true,
				onremove(player) {
					delete player.storage.repindi_target;
					delete player.storage.repindi_type;
				},
			},
		},
		ai: {
			order: 8,
			threaten: 1.9,
			result: {
				target(player, target) {
					var att = get.attitude(player, target);
					var num = (player.getStat("skill").repindi || 0) + 1;
					if (att <= 0 && target.countCards("he") < num) {
						return 0;
					}
					return get.sgn(att);
				},
			},
		},
	}
```

### dcfaen 名字:法恩
描述: 一名角色翻至正面或横置后，你可令其摸一张牌。
```js
dcfaen: {
		audio: "refaen",
		audioname: ["dc_chenqun"],
		trigger: { global: ["turnOverAfter", "linkAfter"] },
		logTarget: "player",
		filter(event, player) {
			if (event.name == "link") {
				return event.player.isLinked();
			}
			return !event.player.isTurnedOver();
		},
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		async content(event, trigger, player) {
			await trigger.player.draw();
		},
		global: "faen_global",
	}
```

## re_sundeng 名字:界孙登 势力:wu

### rekuangbi 名字:匡弼
描述: 出牌阶段开始时，你可以令一名其他角色将至多三张牌置于你的武将牌上直到此阶段结束。然后当你使用牌时，若你：有与此牌花色相同的“匡弼”牌，你移去其中一张并与其各摸一张牌；没有与此牌花色相同的“匡弼”牌，你随机移去一张“匡弼”牌并摸一张牌。
```js
rekuangbi: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("rekuangbi"), (card, player, target) => {
					return target.countCards("he") > 0 && target != player;
				})
				.set("ai", target => {
					var player = _status.event.player,
						att = get.attitude(player, target);
					if (_status.event.goon) {
						if (att > 0) {
							return att * Math.sqrt(target.countCards("he"));
						}
						return (1 - att) / (target.countCards("he") + 1);
					}
					return (-10 * att) / (target.countCards("he") + 1);
				})
				.set("goon", player.countCards("hs", card => player.hasValueTarget(card)) >= 2)
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const result = await target
				.chooseCard("匡弼：将至多三张牌置于" + get.translation(player) + "的武将牌上", "he", [1, 3], true)
				.set("ai", card => {
					if (get.attitude(_status.event.player, _status.event.getParent().player) > 0) {
						return 7 - get.value(card);
					}
					return -get.value(card);
				})
				.forResult();
			if (result?.bool) {
				await player.addToExpansion(result.cards, target, "give").set("gaintag", ["rekuangbi_effect"]);
				player.addTempSkill("rekuangbi_effect", "phaseUseEnd");
				player.markAuto("rekuangbi_effect", [target]);
			}
		},
		subSkill: {
			effect: {
				audio: "rekuangbi",
				mod: {
					aiOrder(player, card, num) {
						if (num <= 0 || !player.getExpansions("rekuangbi_effect").length) {
							return;
						}
						let suit = get.suit(card);
						if (player.getExpansions("rekuangbi_effect").some(i => get.suit(i) == suit)) {
							return num + 10;
						}
						return num / 4;
					},
				},
				trigger: { player: "useCard" },
				charlotte: true,
				forced: true,
				filter(event, player) {
					return player.getExpansions("rekuangbi_effect").length > 0;
				},
				async content(event, trigger, player) {
					const cards = player.getExpansions("rekuangbi_effect");
					const suit = get.suit(trigger.card),
						cardsx = cards.filter(card => get.suit(card) == suit);
					const len = cardsx.length;
					let result;
					if (len > 1) {
						result = await player
							.chooseButton(["匡弼：移去一张同花色的“匡弼”牌", cards], true)
							.set("filterButton", button => {
								return get.suit(button.link) == _status.event.suit;
							})
							.set("suit", suit)
							.forResult();
					} else if (len == 1) {
						result = { bool: true, links: cardsx };
					} else {
						result = { bool: false, links: [cards.randomGet()] };
					}
					if (result?.links?.length) {
						await player.loseToDiscardpile(result.links);
						await game.delayx();
					}
					if (result?.bool) {
						await player.draw("nodelay");
						const target = player.getStorage("rekuangbi_effect")[0];
						if (target?.isIn()) {
							await target.draw();
						}
					} else {
						await player.draw();
					}
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
					delete player.storage[skill];
				},
			},
		},
	}
```

## re_caiyong 名字:界蔡邕 势力:qun

### rebizhuan 名字:辟撰
描述: ①当你使用♠牌时，或成为其他角色使用♠牌的目标后，你可以将牌堆顶的一张牌置于武将牌上，称为“书”（你至多拥有四张“书”）。②你的手牌上限+X（X为“书”数）。
```js
rebizhuan: {
		audio: 2,
		trigger: {
			player: "useCard",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (event.name != "useCard" && event.player == event.target) {
				return false;
			}
			var num = 4 + Math.min(player.countMark("retongbo"), game.countPlayer());
			if (player.getExpansions("rebizhuan").length >= num) {
				return false;
			}
			return get.suit(event.card) == "spade";
		},
		marktext: "书",
		intro: {
			name: "辟撰(书)",
			name2: "书",
			content: "expansion",
			markcount: "expansion",
		},
		frequent: true,
		locked: false,
		async content(event, trigger, player) {
			const next = player.addToExpansion(get.cards(), "gain2");
			next.gaintag.add("rebizhuan");
			await next;
		},
		mod: {
			maxHandcard(player, num) {
				return num + player.getExpansions("rebizhuan").length;
			},
		},
		ai: {
			notemp: true,
		},
	}
```

### retongbo 名字:通博
描述: 摸牌阶段结束时，你可以用任意手牌交换等量“书”。然后若“书”数至少为4，你可以将四张“书”任意交给其他角色。若你交出的牌花色各不相同，你回复1点体力且“书”的上限+1（至多增加等同存活角色数的上限）。
```js
retongbo: {
		audio: 2,
		trigger: { player: "phaseDrawAfter" },
		direct: true,
		filter(event, player) {
			return player.getExpansions("rebizhuan").length > 0 && player.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			const next = player.chooseToMove("通博：是否交换“书”和手牌？");
			next.set("list", [
				[get.translation(player) + "（你）的“书”", player.getExpansions("rebizhuan")],
				["你的牌", player.getCards("he")],
			]);
			next.set("filterMove", function (from, to) {
				return typeof to != "number";
			});
			next.set("processAI", function (list) {
				const player = _status.event.player;
				let cards = list[0][1].concat(list[1][1]),
					cards2 = [];
				cards.sort((a, b) => {
					return get.useful(a) - get.useful(b);
				});
				cards2 = cards.splice(0, player.getExpansions("rebizhuan").length);
				return [cards2, cards];
			});
			const result = await next.forResult();
			if (result?.bool) {
				const pushs = result.moved[0],
					gains = result.moved[1];
				pushs.removeArray(player.getExpansions("rebizhuan"));
				gains.removeArray(player.getCards("he"));
				if (!pushs.length || pushs.length != gains.length) {
					return;
				}
				player.logSkill("retongbo");
				await player.addToExpansion(pushs, "give", player).set("gaintag", ["rebizhuan"]);
				await player.gain(gains, "gain2");
				const cards = player.getExpansions("rebizhuan").slice(0);
				if (cards.length < 4) {
					return;
				}
				event.given = [];
				const list = cards.map(card => get.suit(card)).unique();
				if (list.length >= 4 && player.hp <= 2) {
					event.four = true;
				}
				while (event.given.length < 4) {
					const resultx = await player
						.chooseCardButton("是否将" + get.cnNumber(4 - event.given.length) + "张“书”交给任意名其他角色？", cards, [1, 4 - event.given.length], event.given.length > 0)
						.set("ai", function (button) {
							if (!_status.event.goon) {
								return 0;
							}
							var four = _status.event.getParent().four,
								given = _status.event.getParent().given;
							if (four) {
								return get.value(button.link) + (given.map(i => get.suit(i)).includes(get.suit(button.link)) ? 0 : 10);
							}
							if (ui.selected.buttons.length == 0) {
								return get.value(button.link);
							}
							return 0;
						})
						.set(
							"goon",
							game.hasPlayer(current => current != player && get.attitude(player, current) > 0)
						)
						.forResult();
					if (resultx?.bool) {
						for (var i = 0; i < resultx.links.length; i++) {
							cards.remove(resultx.links[i]);
						}
						const togive = resultx.links.slice(0);
						event.given.addArray(togive);
						const resulty = await player
							.chooseTarget("将" + get.translation(resultx.links) + "交给一名其他角色", true, function (card, player, target) {
								return target != player;
							})
							.set("ai", function (target) {
								var att = get.attitude(_status.event.player, target);
								if (_status.event.enemy) {
									return -att;
								} else if (att > 0) {
									return att / (1 + target.countCards("h"));
								} else {
									return att / 100;
								}
							})
							.set("enemy", get.value(togive[0], player, "raw") < 0)
							.forResult();
						if (resulty?.targets?.length) {
							const target = resulty.targets[0];
							player.line(target, "green");
							game.log(target, "获得了" + get.cnNumber(togive.length) + "张", "#g“书”");
							await target.gain(togive, "draw").set("giver", player);
						}
					} else {
						return;
					}
				}
				if (event.given.length == 4) {
					const suits = lib.suit.slice(0);
					event.given.forEach(i => suits.remove(get.suit(i, player)));
					if (suits.length == 0) {
						await player.recover();
						player.addMark("retongbo", 1, false);
					}
				}
			}
		},
		marktext: "博",
		intro: {
			content(storage, player) {
				var num = 4 + Math.min(storage, game.countPlayer());
				return "“书”的上限+" + num;
			},
		},
		ai: {
			combo: "rebizhuan",
		},
	}
```

## re_chengong 名字:界陈宫 势力:qun

### remingce 名字:明策
描述: 出牌阶段限一次。你可以将一张【杀】或装备牌交给一名其他角色，其选择一项：1.视为对你选择的另一名角色使用一张【杀】，且若此牌造成伤害，则执行选项2；2.你与其各摸一张牌。
```js
remingce: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		position: "he",
		filterCard(card) {
			return get.name(card) == "sha" || get.type(card) == "equip";
		},
		filter(event, player) {
			return player.countCards("h", "sha") > 0 || player.countCards("he", { type: "equip" }) > 0;
		},
		check(card) {
			return 8 - get.value(card);
		},
		selectTarget: 2,
		multitarget: true,
		discard: false,
		lose: false,
		targetprompt: ["得到牌", "出杀目标"],
		filterTarget(card, player, target) {
			if (ui.selected.targets.length == 0) {
				return player != target;
			}
			return true;
		},
		delay: false,
		async content(event, trigger, player) {
			const { cards, targets } = event;
			await player.give(cards, targets[0], "visible");
			let result;
			if (!targets[0].canUse({ name: "sha", isCard: true }, targets[1], false, false)) {
				result = { control: "选项二" };
			} else {
				result = await targets[0]
					.chooseControl()
					.set("ai", function () {
						var player = _status.event.player,
							target = _status.event.target;
						return get.effect(target, { name: "sha", isCard: true }, player, player) > 0 ? 0 : 1;
					})
					.set("choiceList", ["视为对" + get.translation(targets[1]) + "使用一张【杀】，若此杀造成伤害则执行选项二", "你与" + get.translation(player) + "各摸一张牌"])
					.set("target", targets[1])
					.set("prompt", "对" + get.translation(targets[1]) + "使用一张杀，或摸一张牌")
					.forResult();
			}
			if (result?.control == "选项二") {
				await game.asyncDraw([player, targets[0]]);
				return;
			} else {
				await targets[0].useCard({ name: "sha", isCard: true }, targets[1]);
				if (
					targets[0].hasHistory("useCard", evt => {
						return evt.getParent() == event && targets[0].hasHistory("sourceDamage", evtx => evt.card == evtx.card);
					})
				) {
					await game.asyncDraw([player, targets[0]]);
				}
			}
		},
		ai: {
			result: {
				player(player) {
					var players = game.filterPlayer();
					for (var i = 0; i < players.length; i++) {
						if (players[i] != player && get.attitude(player, players[i]) > 1 && get.attitude(players[i], player) > 1) {
							return 1;
						}
					}
					return 0;
				},
				target(player, target) {
					if (ui.selected.targets.length) {
						return -0.1;
					}
					return 1;
				},
			},
			order: 8.5,
			expose: 0.2,
		},
	}
```

### zhichi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_xunyou 名字:界荀攸 势力:wei

### reqice 名字:奇策
描述: 出牌阶段限X次（X为你的“奇策”数+1），你可以将所有手牌当做任意一张普通锦囊牌使用。
```js
reqice: {
		audio: 2,
		enable: "phaseUse",
		usable(skill, player) {
			return player.countMark("reqice_mark") + 1;
		},
		filter(event, player) {
			const hs = player.getCards("h");
			if (!hs.length) {
				return false;
			}
			if (
				hs.some(card => {
					const mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
					return mod2 === false;
				})
			) {
				return false;
			}
			return lib.inpile.some(name => {
				if (get.type(name) != "trick") {
					return false;
				}
				const card = get.autoViewAs({ name }, hs);
				return event.filterCard(card, player, event);
			});
		},
		chooseButton: {
			dialog(event, player) {
				var list = [];
				for (var i = 0; i < lib.inpile.length; i++) {
					if (get.type(lib.inpile[i]) == "trick") {
						list.push(["锦囊", "", lib.inpile[i]]);
					}
				}
				return ui.create.dialog(get.translation("reqice"), [list, "vcard"]);
			},
			filter(button, player) {
				const event = _status.event.getParent(),
					card = get.autoViewAs(
						{
							name: button.link[2],
						},
						player.getCards("h")
					);
				return event.filterCard(card, player, event);
			},
			check(button) {
				var player = _status.event.player;
				var effect = player.getUseValue(button.link[2]);
				if (player.countCards("hs", button.link[2]) > 0) {
					return 0;
				}
				if ((player.getStat("skill").reqice || 0) < player.countMark("reqice_mark") + 1) {
					if (["draw", "gain"].some(i => get.tag(button.link[2], i) >= 1)) {
						return effect * 5;
					}
				}
				if (effect > 0) {
					return effect;
				}
				return 0;
			},
			backup(links, player) {
				return {
					filterCard: true,
					selectCard: -1,
					position: "h",
					audio: "reqice",
					popname: true,
					viewAs: { name: links[0][2] },
				};
			},
			prompt(links, player) {
				return "将所有手牌当【" + get.translation(links[0][2]) + "】使用";
			},
		},
		ai: {
			order: 1,
			result: {
				player(player) {
					var num = 0;
					var cards = player.getCards("h");
					if (cards.length >= 3 && player.hp >= 3 && player.countMark("reqice_mark") < 2) {
						return 0;
					}
					for (var i = 0; i < cards.length; i++) {
						num += Math.max(0, get.value(cards[i], player, "raw"));
					}
					num /= cards.length;
					num /= (player.countMark("reqice_mark") + 1) * 1.3;
					num *= Math.min(cards.length, player.hp);
					return 13 - num;
				},
			},
			nokeep: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "nokeep") {
					return (!arg || (arg.card && get.name(arg.card) === "tao")) && player.isPhaseUsing() && !player.getStat("skill").reqice && player.hasCard(card => get.name(card) != "tao", "h");
				}
			},
			threaten: 1.7,
		},
		subSkill: {
			backup: {},
			mark: {
				charlotte: true,
				onremove: true,
				intro: {
					name2: "奇策",
					content: "mark",
				},
			},
		},
	}
```

### rezhiyu 名字:智愚
描述: 当你受到伤害后，你可以摸一张牌，然后展示所有手牌，令伤害来源弃置一张手牌。若你展示的牌颜色均相同，你获得1枚“奇策”直到下回合结束且获得来源弃置的牌。
```js
rezhiyu: {
		audio: 2,
		trigger: { player: "damageEnd" },
		async content(event, trigger, player) {
			await player.draw();
			if (!player.countCards("h")) {
				return;
			} else {
				await player.showHandcards();
			}
			let result;
			if (!trigger.source?.isIn()) {
				result = { bool: false, cards: [] };
			} else {
				result = await trigger.source.chooseToDiscard("智愚：请弃置一张手牌", true).forResult();
			}
			let cards = player.getCards("h");
			const bool = cards.map(card => get.color(card, player)).unique().length == 1;
			if (bool) {
				cards = result.cards.filterInD("d");
				if (cards.length) {
					await player.gain(cards, "gain2");
				}
				player.addMark("reqice_mark", 1);
				player.addTempSkill("reqice_mark", { player: "phaseAfter" });
			}
		},
		ai: {
			maixie_defend: true,
			threaten: 0.85,
		},
	}
```

## dc_liru 名字:界李儒 势力:qun

### xinjuece
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### dcmieji 名字:灭计
描述: 出牌阶段限一次，你可以展示一张武器牌或黑色锦囊牌。你将此牌置于牌堆顶，然后令一名有手牌的其他角色选择一项：⒈弃置一张锦囊牌；⒉依次弃置两张非锦囊牌。
```js
dcmieji: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasCard(lib.skill.dcmieji.filterCard, "eh");
		},
		position: "he",
		filterCard(card) {
			if (get.subtype(card) == "equip1") {
				return true;
			}
			return get.color(card) == "black" && get.type(card, "trick") == "trick";
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0;
		},
		discard: false,
		delay: false,
		check(card) {
			return 8 - get.value(card);
		},
		loseTo: "cardPile",
		insert: true,
		visible: true,
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.showCards(cards);
			const result = await target.chooseToDiscard("he", true).set("prompt", "请弃置一张锦囊牌，或依次弃置两张非锦囊牌。").forResult();
			if (
				(!result.cards || get.type(result.cards[0], "trick", result.cards[0].original == "h" ? target : false) != "trick") &&
				target.countCards("he", function (card) {
					return get.type(card, "trick") != "trick";
				})
			) {
				await target
					.chooseToDiscard("he", true, function (card) {
						return get.type(card, "trick") != "trick";
					})
					.set("prompt", "请弃置第二张非锦囊牌");
			}
		},
		ai: {
			order: 9,
			result: {
				target: -1,
			},
		},
	}
```

### dcfencheng 名字:焚城
描述: 限定技。出牌阶段，你可以指定一名其他角色，令从其开始的其他角色依次选择一项：⒈弃置至少X张牌（X为上一名角色弃置的牌数+1）。⒉你对其造成2点火焰伤害。
```js
dcfencheng: {
		audio: 2,
		audioname: ["ol_liru"],
		audioname2: {
			ol_sb_dongzhuo: "dcfencheng_ol_sb_dongzhuo",
		},
		enable: "phaseUse",
		filterTarget: lib.filter.notMe,
		limited: true,
		line: "fire",
		skillAnimation: "epic",
		animationColor: "fire",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			let targets = game.filterPlayer(current => current != player);
			targets.sortBySeat(event.target);
			let num = 1;
			if (targets.length) {
				for (const target of targets) {
					if (target.isIn()) {
						player.line(target, "fire");
						const result = await target
							.chooseToDiscard("he", "焚城：弃置至少" + get.cnNumber(num) + "张牌，或受到2点火焰伤害", [num, Infinity], "allowChooseAll")
							.set("ai", card => {
								if (ui.selected.cards.length >= get.event().num) {
									return -1;
								}
								if (get.player().hasSkillTag("nofire")) {
									return -1;
								}
								if (get.event().res >= 0) {
									return 6 - get.value(card);
								}
								if (get.type(card) != "basic") {
									return 10 - get.value(card);
								}
								return 8 - get.value(card);
							})
							.set("num", num)
							.set("res", get.damageEffect(target, player, target, "fire"))
							.forResult();

						if (!result?.bool) {
							await target.damage(2, "fire");
							num = 1;
						} else {
							num = result.cards.length + 1;
						}
					}
				}
			}
		},
		subSkill: { ol_sb_dongzhuo: { audio: 1 } },
		ai: {
			order: 1,
			result: {
				player(player, target) {
					if (player.hasUnknown(2)) {
						return 0;
					}
					let num = 0,
						eff = 0,
						players = game
							.filterPlayer(current => {
								return current != player;
							})
							.sortBySeat(target);
					for (const target of players) {
						if (get.damageEffect(target, player, target, "fire") >= 0) {
							num = 0;
							continue;
						}
						let shao = false;
						num++;
						if (
							target.countCards("he", card => {
								if (get.type(card) != "basic") {
									return get.value(card) < 10;
								}
								return get.value(card) < 8;
							}) < num
						) {
							shao = true;
						}
						if (shao) {
							eff -= 4 * (get.realAttitude || get.attitude)(player, target);
							num = 0;
						} else {
							eff -= (num * (get.realAttitude || get.attitude)(player, target)) / 4;
						}
					}
					if (eff < 4) {
						return 0;
					}
					return eff;
				},
			},
		},
	}
```

## re_zhuhuan 名字:界朱桓 势力:wu

### refenli 名字:奋励
描述: 若你的手牌数为全场最多，你可以跳过判定阶段和摸牌阶段；若你的体力值为全场最多，你可以跳过出牌阶段；若你的装备区里有牌且数量为全场最多，你可以跳过弃牌阶段。
```js
refenli: {
		audio: 2,
		group: ["refenli_draw", "refenli_use", "refenli_discard"],
		subfrequent: ["discard"],
		subSkill: {
			draw: {
				audio: "refenli",
				trigger: { player: "phaseJudgeBefore" },
				prompt: "是否发动【奋励】跳过判定和摸牌阶段？",
				filter(event, player) {
					return player.isMaxHandcard();
				},
				check(event, player) {
					if (player.hasJudge("lebu") || player.hasJudge("bingliang")) {
						return true;
					}
					if (!player.hasSkill("repingkou") || player.getHistory("skipped").length > 0) {
						return false;
					}
					return game.hasPlayer(function (current) {
						return get.attitude(player, current) < 0 && current.hp == 1 && get.damageEffect(current, player, player) > 0;
					});
				},
				async content(event, trigger, player) {
					trigger.cancel();
					player.skip("phaseDraw");
				},
			},
			use: {
				audio: "refenli",
				trigger: { player: "phaseUseBefore" },
				prompt: "是否发动【奋励】跳过出牌阶段？",
				filter(event, player) {
					return player.isMaxHp();
				},
				check(event, player) {
					if (!player.hasSkill("repingkou")) {
						return false;
					}
					if (!player.needsToDiscard() || (player.countCards("e") && player.isMaxEquip())) {
						return true;
					}
					if (player.getHistory("skipped").length > 0) {
						return false;
					}
					return game.hasPlayer(function (current) {
						return get.attitude(player, current) < 0 && current.hp == 1 && get.damageEffect(current, player, player) > 0;
					});
				},
				async content(event, trigger, player) {
					trigger.cancel();
				},
			},
			discard: {
				audio: "refenli",
				trigger: { player: "phaseDiscardBefore" },
				prompt: "是否发动【奋励】跳过弃牌阶段？",
				frequent: true,
				filter(event, player) {
					return player.isMaxEquip() && player.countCards("e");
				},
				async content(event, trigger, player) {
					trigger.cancel();
				},
			},
		},
		ai: {
			combo: "repingkou",
		},
	}
```

### repingkou 名字:平寇
描述: 回合结束时，你可以对至多X名其他角色各造成1点伤害（X为你本回合跳过的阶段数）。若你选择的角色数小于X，则你可以令其中一名角色随机弃置装备区里的一张牌。
```js
repingkou: {
		audio: 2,
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			return player.getHistory("skipped").length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget([1, player.getHistory("skipped").length], get.prompt2("repingkou"), "对至多" + get.cnNumber(player.getHistory("skipped").length) + "名其他角色各造成1点伤害。若你选择的角色数小于最大角色数，则你可以弃置其中一名目标角色装备区内的一张牌", function (card, player, target) {
					return target != player;
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					return get.damageEffect(target, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const targets = event.targets.slice(0).sortBySeat();
			for (const target of targets) {
				if (target.isIn()) {
					await target.damage();
				}
			}
			if (targets.length >= player.getHistory("skipped").length) {
				return;
			}
			const targets2 = targets.filter(function (target) {
				return target.countDiscardableCards(player, "e") > 0;
			});
			if (targets2.length > 0) {
				const result = await player
					.chooseTarget("是否弃置一名目标角色的一张装备牌？", function (card, player, target) {
						return _status.event.targets.includes(target);
					})
					.set("targets", targets2)
					.set("ai", function (target) {
						var att = get.attitude(player, target),
							eff = 0;
						target.getCards("e", function (card) {
							var val = get.value(card, target);
							eff = Math.max(eff, -val * att);
						});
						return eff;
					})
					.forResult();
				if (result.bool) {
					const target = result.targets[0];
					player.line(target, "green");
					const card = target.getDiscardableCards(player, "e").randomGet();
					if (card) {
						await target.discard(card);
					}
				}
			}
		},
		ai: {
			effect: {
				target(card) {
					if (card.name == "lebu" || card.name == "bingliang") {
						return 0.5;
					}
				},
			},
			combo: "refenli",
		},
	}
```

## ol_dianwei 名字:界典韦 势力:wei

### olqiangxi 名字:强袭
描述: 出牌阶段限两次。你可以弃置一张武器牌或受到1点无来源伤害，然后对一名本回合内未成为过〖强袭〗目标的其他角色造成1点伤害。
```js
olqiangxi: {
		audio: "qiangxi",
		audioname: ["ol_dianwei", "boss_lvbu3"],
		enable: "phaseUse",
		usable: 2,
		filter(event, player) {
			if (player.hp < 1 && !player.hasCard(card => lib.skill.olqiangxi.filterCard(card), "he")) {
				return false;
			}
			return game.hasPlayer(current => lib.skill.olqiangxi.filterTarget(null, player, current));
		},
		filterCard(card) {
			return get.subtype(card) == "equip1";
		},
		position: "he",
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			var stat = player.getStat()._olqiangxi;
			return !stat || !stat.includes(target);
		},
		selectCard() {
			if (_status.event.player.hp < 1) {
				return 1;
			}
			return [0, 1];
		},
		async content(event, trigger, player) {
			const { cards, target } = event;

			var stat = player.getStat();
			if (!stat._olqiangxi) {
				stat._olqiangxi = [];
			}
			stat._olqiangxi.push(target);
			if (!cards.length) {
				await player.damage("nosource", "nocard");
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
					return get.damageEffect(player, player, player);
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
	}
```

### olninge 名字:狞恶
描述: 锁定技。当一名角色A于一回合内第二次受到伤害后，若A或伤害来源为你，则你摸一张牌，然后弃置其装备区或判定区内的一张牌。
```js
olninge: {
		audio: 2,
		trigger: { global: "damageEnd" },
		filter(event, player) {
			if (player != event.player && player != event.source) {
				return false;
			}
			return event.player.getHistory("damage").indexOf(event) == 1;
		},
		logTarget: "player",
		forced: true,
		async content(event, trigger, player) {
			await player.draw();
			await player.discardPlayerCard(trigger.player, true, "ej");
		},
	}
```

## re_sp_taishici 名字:界SP太史慈 势力:qun

### rejixu 名字:击虚
描述: 出牌阶段限一次。若你有手牌，则你可以选择至多X名角色，令这些角色猜测你的手牌区中是否有【杀】。若你：有【杀】，则你本阶段使用【杀】的次数上限+Y，且当你于本阶段内使用【杀】指定目标后，你可以令这Y名角色也成为此【杀】的目标；没有【杀】，则你弃置这Y名角色的各一张牌。然后你摸Y张牌（X为你的体力值，Y为这些角色中猜错的角色数）。
```js
rejixu: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hp > 0 && player.countCards("h") > 0;
		},
		filterTarget: lib.filter.notMe,
		selectTarget() {
			return [1, _status.event.player.hp];
		},
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			const { targets } = event;
			if (!event.caicuolist) {
				event.caicuolist = [];
			}
			for (const target of targets) {
				const result = await target
					.chooseBool("是否押杀？")
					.set("ai", function () {
						const evt = _status.event.getParent(),
							player = get.player();
						if (get.attitude(player, evt.player) > 0) {
							return evt.player.countCards("h", "sha") ? false : true;
						}
						if (
							evt.player.hasKnownCards(target, c => {
								return c.name == "sha";
							})
						) {
							return true;
						}
						return Math.random() < evt.player.countCards("h") / 4;
					})
					.forResult();
				if (!result) {
					continue;
				}
				if (result.bool) {
					target.chat("有杀");
					game.log(target, "认为", player, "#g有杀");
					if (!player.countCards("h", "sha")) {
						event.caicuolist.add(target);
					}
				} else {
					target.chat("没杀");
					game.log(target, "认为", player, "#y没有杀");
					if (player.countCards("h", "sha")) {
						event.caicuolist.add(target);
					}
				}
			}
			player.popup(player.countCards("h", "sha") ? "有杀" : "没杀");
			game.log(player, player.countCards("h", "sha") ? "有杀" : "没杀");
			if (event.caicuolist.length > 0) {
				if (player.countCards("h", "sha")) {
					player.markAuto("rejixu_sha", event.caicuolist);
					player.addTempSkill("rejixu_sha", "phaseUseAfter");
				} else {
					for (const target of event.caicuolist) {
						if (target.countDiscardableCards(player, "he") > 0) {
							player.line(target);
							await player.discardPlayerCard(true, "he", target);
						}
					}
				}
				await player.draw(event.caicuolist.length);
			}
		},
		ai: {
			order() {
				return get.order({ name: "sha" }) + 0.6;
			},
			result: {
				target(player, target) {
					if (player.countCards("h", "sha")) {
						return get.effect(target, { name: "sha" }, player, target);
					} else {
						return get.effect(target, { name: "guohe_copy2" }, player, target);
					}
				},
			},
			expose: 0.4,
		},
		subSkill: {
			sha: {
				audio: "rejixu",
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.getStorage("rejixu_sha").length;
						}
					},
				},
				charlotte: true,
				onremove: true,
				trigger: { player: "useCard2" },
				filter(event, player) {
					if (event.card.name != "sha") {
						return false;
					}
					for (var target of player.getStorage("rejixu_sha")) {
						if (event.targets.includes(target) || !target.isIn()) {
							return false;
						}
						if (lib.filter.targetEnabled2(event.card, player, target)) {
							return true;
						}
					}
					return false;
				},
				prompt: "是否发动【击虚】？",
				prompt2(event, player) {
					var list = player.getStorage("rejixu_sha").filter(function (target) {
						if (event.targets.includes(target) || !target.isIn()) {
							return false;
						}
						return lib.filter.targetEnabled2(event.card, player, target);
					});
					return "令" + get.translation(list) + "也成为" + get.translation(event.card) + "的目标";
				},
				logTarget(event, player) {
					return player.getStorage("rejixu_sha").filter(function (target) {
						if (event.targets.includes(target) || !target.isIn()) {
							return false;
						}
						return lib.filter.targetEnabled2(event.card, player, target);
					});
				},
				check(event, player) {
					var eff = 0;
					var list = player.getStorage("rejixu_sha").filter(function (target) {
						if (event.targets.includes(target) || !target.isIn()) {
							return false;
						}
						return lib.filter.targetEnabled2(event.card, player, target);
					});
					for (var i of list) {
						eff += get.effect(i, event.card, player, player);
					}
					return eff > 0;
				},
				async content(event, trigger, player) {
					const list = player.getStorage("rejixu_sha").filter(target => {
						if (trigger.targets.includes(target) || !target.isIn()) {
							return false;
						}
						return lib.filter.targetEnabled2(trigger.card, player, target);
					});
					if (list.length > 0) {
						trigger.targets.addArray(list);
						game.log(list, "也成为了", trigger.card, "的目标");
					}
				},
			},
		},
	}
```

## re_liufeng 名字:界刘封 势力:shu

### rexiansi 名字:陷嗣
描述: ①准备阶段开始时，你可以将一至两名角色的各一张牌置于你的武将牌上，称为“逆”。②当一名角色需要对你使用【杀】时，其可以移去两张“逆”，然后视为对你使用一张【杀】。③若你的“逆”数大于体力值，则你可以移去一张“逆”并视为使用一张【杀】。
```js
rexiansi: {
		inherit: "xiansi",
		audio: "xiansi",
		audioname: ["re_liufeng"],
		group: ["rexiansi2", "xiansix"],
	}
```

## ol_xunyu 名字:界荀彧 势力:wei

### quhu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### oljieming 名字:节命
描述: 当你受到1点伤害后或死亡时，你可令一名角色摸X张牌。然后若其手牌数大于X，则其将手牌弃置至X张（X为其体力上限且至多为5）。
```js
oljieming: {
		audio: 2,
		audioname2: { sxrm_caocao: "oljieming_sxrm_caocao", tw_sxrm_caocao: "oljieming_sxrm_caocao" },
		trigger: { player: ["damageEnd", "die"] },
		forceDie: true,
		filter(event, player) {
			if (event.name == "die") {
				return true;
			}
			return player.isIn() && event.num > 0;
		},
		getIndex(event) {
			return event.num || 1;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return target.maxHp > 0;
				})
				.set("ai", target => {
					const player = get.player();
					let att = get.attitude(player, target);
					let draw = Math.min(5, target.maxHp) - target.countCards("h");
					if (draw >= 0) {
						if (target.hasSkillTag("nogain")) {
							att /= 6;
						}
						if (att > 2) {
							return Math.sqrt(draw + 1) * att;
						}
						return att / 3;
					}
					if (draw < -1) {
						if (target.hasSkillTag("nogain")) {
							att *= 6;
						}
						if (att < -2) {
							return -Math.sqrt(1 - draw) * att;
						}
					}
					return 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			await target.draw(Math.min(5, target.maxHp));
			let num = target.countCards("h") - Math.min(5, target.maxHp);
			if (num > 0) {
				await target.chooseToDiscard("h", true, num, "allowChooseAll");
			}
		},
		ai: {
			expose: 0.2,
			maixie: true,
			maixie_hp: true,
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "damage") && target.hp > 1) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						var max = 0;
						var players = game.filterPlayer();
						for (var i = 0; i < players.length; i++) {
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
					if ((card.name == "tao" || card.name == "caoyao") && target.hp > 1 && target.countCards("h") <= target.hp) {
						return [0, 0];
					}
				},
			},
		},
	}
```

## re_liuchen 名字:界刘谌 势力:shu

### rezhanjue 名字:战绝
描述: 出牌阶段，若你本阶段内因〖战绝〗得到过的牌数小于3，则你可以将所有不具有“勤王”标记的手牌当做【决斗】使用。此【决斗】使用结算结束后，你摸一张牌。然后所有因此【决斗】受到过伤害的角色也各摸一张牌。
```js
rezhanjue: {
		audio: 2,
		enable: "phaseUse",
		filterCard(card) {
			return !card.hasGaintag("reqinwang");
		},
		selectCard: -1,
		position: "h",
		filter(event, player) {
			var stat = player.getStat().skill;
			if (stat.rezhanjue_draw && stat.rezhanjue_draw >= 3) {
				return false;
			}
			var hs = player.getCards("h", function (card) {
				return !card.hasGaintag("reqinwang");
			});
			if (!hs.length) {
				return false;
			}
			for (var i = 0; i < hs.length; i++) {
				var mod2 = game.checkMod(hs[i], player, "unchanged", "cardEnabled2", player);
				if (mod2 === false) {
					return false;
				}
			}
			return event.filterCard(get.autoViewAs({ name: "juedou" }, hs));
		},
		viewAs: { name: "juedou" },
		onuse(links, player) {
			player.addTempSkill("rezhanjue_effect", "phaseUseEnd");
		},
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
						get.skillCount("rezhanjue_draw", player) < 3 &&
						player.hasCard(card => {
							return get.name(card) !== "tao" && !card.hasGaintag("reqinwang");
						}, "h")
					);
				}
			},
		},
	}
```

### reqinwang 名字:勤王
描述: 主公技。出牌阶段限一次，你可以令所有其他蜀势力角色依次选择是否交给你一张【杀】，然后你可以令选择是的角色摸一张牌。
```js
reqinwang: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		zhuSkill: true,
		filter(event, player) {
			if (!player.hasZhuSkill("reqinwang")) {
				return false;
			}
			return game.hasPlayer(function (current) {
				return current != player && current.group == "shu" && player.hasZhuSkill("reqinwang", current);
			});
		},
		selectTarget: -1,
		filterTarget(card, player, current) {
			return current != player && current.group == "shu" && player.hasZhuSkill("reqinwang", current);
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (
				target.hasCard(function (card) {
					return _status.connectMode || get.name(card, target) == "sha";
				}, "h")
			) {
				const result = await target
					.chooseCard(
						"是否交给" + get.translation(player) + "一张【杀】？",
						function (card, player) {
							return get.name(card, player) == "sha";
						},
						"h"
					)
					.set("goon", get.attitude(target, player) > 0)
					.set("ai", function (card) {
						return _status.event.goon ? 1 : 0;
					})
					.forResult();
				if (result?.bool) {
					const card = result.cards[0];
					await target.give(card, player).set("gaintag", ["reqinwang"]);
					player.addTempSkill("reqinwang_clear");
					const result2 = await player.chooseBool("是否令" + get.translation(target) + "摸一张牌？").forResult();
					if (result2?.bool) {
						await target.draw();
					}
				}
			}
		},
		ai: {
			order: 5,
			result: { player: 1 },
		},
		subSkill: {
			clear: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("reqinwang");
				},
			},
		},
	}
```

## dc_gongsunzan 名字:新杀公孙瓒 势力:qun

### dcyicong 名字:义从
描述: 锁定技。①你至其他角色的距离-1。②若你已损失的体力值不小于2，则其他角色至你的距离+1。
```js
dcyicong: {
		trigger: {
			player: ["changeHp"],
		},
		audio: 2,
		forced: true,
		filter(event, player) {
			return get.sgn(player.getDamagedHp() - 1.5) != get.sgn(player.getDamagedHp() - 1.5 + event.num);
		},
		async content(_) {},
		mod: {
			globalFrom(from, to, current) {
				return current - 1;
			},
			globalTo(from, to, current) {
				if (to.getDamagedHp() >= 2) {
					return current + 1;
				}
			},
		},
		ai: {
			threaten: 0.8,
		},
	}
```

### dcqiaomeng 名字:趫猛
描述: 当你使用黑色牌指定第一个目标后，你可以弃置目标角色中一名其他角色的一张牌。若你以此法弃置的牌为：装备牌，你获得此牌；锦囊牌，你令此牌不可被响应。
```js
dcqiaomeng: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!event.isFirstTarget || get.color(event.card) != "black") {
				return false;
			}
			for (var i of event.targets) {
				if (
					i != player &&
					i.hasCard(function (card) {
						return lib.filter.canBeDiscarded(card, player, i);
					}, "he")
				) {
					return true;
				}
			}
			return false;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("dcqiaomeng"), "选择一名不为自己的目标角色，然后弃置其一张牌。若以此法弃置的牌为：装备牌，你获得此牌；锦囊牌，你令" + get.translation(trigger.card) + "不可被响应。", function (card, player, target) {
					return (
						target != player &&
						_status.event.getTrigger().targets.includes(target) &&
						target.hasCard(function (card) {
							return lib.filter.canBeDiscarded(card, player, target);
						}, "he")
					);
				})
				.set("ai", function (target) {
					const player = _status.event.player;
					return get.effect(target, { name: "guohe_copy2" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const result = await player.discardPlayerCard(target, true, "he").forResult();
			if (result?.bool && result.cards?.length) {
				//为了体现白马义从野性纯真的美 直接获取卡牌原类型 不考虑维系区域
				const card = result.cards[0],
					type = get.type2(card, false);
				if (type == "trick") {
					trigger.directHit.addArray(game.filterPlayer(current => current != player));
				}
				if (type == "equip" && get.position(card, true) == "d") {
					await player.gain(card, "gain2");
				}
			}
		},
	}
```

## re_duji 名字:界杜畿 势力:wei

### reandong 名字:安东
描述: 当你受到其他角色造成的伤害时，你可以令伤害来源选择一项：⒈防止此伤害。然后其♥牌不计入本回合的手牌上限；⒉你观看其手牌并获得其中的所有♥牌，若其没有手牌，则你下次发动〖安东〗时改为自行选择。
```js
reandong: {
		audio: 2,
		trigger: { player: "damageBegin2" },
		filter(event, player) {
			return event.source && event.source.isIn() && event.source != player;
		},
		logTarget: "source",
		async content(event, trigger, player) {
			const target = trigger.source,
				bool = player.storage.reandong;
			let str = get.translation(player),
				result;
			if (bool) {
				str = "自己";
			}
			let choiceList = ["防止" + str + "即将受到的伤害，且本回合内红桃牌不计入" + (bool ? get.translation(target) : "自己") + "的手牌上限。"];
			if (!target.countCards("h")) {
				choiceList.push("令" + str + "下次发动〖安东〗时改为自行选择");
			} else {
				choiceList.push("令" + str + "观看你的手牌并获得所有红桃牌");
			}
			if (bool) {
				delete player.storage.reandong;
				result = await player.chooseControl().set("choiceList", choiceList).set("prompt", "安东：请选择一项").forResult();
			} else {
				result = await target
					.chooseControl()
					.set("choiceList", choiceList)
					.set("prompt", "安东：请选择一项")
					.set("ai", function (event, target) {
						const player = event.player;
						const trigger = event.getTrigger();
						if (get.attitude(target, player) > 0) {
							return 0;
						}
						const hs = target.getGainableCards(player, "h", card => get.suit(card) == "heart");
						if (hs.length) {
							const recover = hs.filter(card => get.tag(card, "save") || get.tag(card, "recover")).length;
							if (trigger.num <= recover) {
								return 0;
							}
						}
						return 1;
					})
					.forResult();
			}
			if (result?.index == 0) {
				target.addTempSkill("reandong_ignore");
				trigger.cancel();
				await game.delayx();
			} else {
				if (!target.countCards("h")) {
					player.storage.reandong = true;
					await game.delayx();
				} else {
					await player.viewHandcards(target);
					const cards = target.getCards("h", function (card) {
						return get.suit(card, target) == "heart";
					});
					if (cards.length > 0) {
						await player.gain(cards, target, "give", "bySelf");
					}
				}
			}
		},
		ai: {
			maixie: true,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return [1, -1];
					}
					if (get.tag(card, "damage") && player != target && get.attitude(player, target) < 0) {
						let cards = player.getCards("h", function (cardx) {
							return card != cardx && (!card.cards || !card.cards.includes(cardx)) && get.suit(cardx) == "heart";
						});
						if (!cards.length) {
							return;
						}
						const recover = cards.filter(card => get.tag(card, "save") || get.tag(card, "recover")).length;
						if (recover >= target.getDamagedHp()) {
							let eff = player.needsToDiscard(0, (card, player) => get.suit(card) != "heart" || !player.canIgnoreHandcard(card));
							return [0, 0, 0, eff / 10];
						}
						const val = get.value(cards, target);
						if (val >= 6 + target.getDamagedHp()) {
							return [1, val / 10, 1, -val / 10];
						}
						return [1, 0.6];
					}
				},
			},
		},
		subSkill: {
			ignore: {
				mod: {
					ignoredHandcard(card, player) {
						if (get.suit(card) == "heart") {
							return true;
						}
					},
					cardDiscardable(card, player, name) {
						if (name == "phaseDiscard" && get.suit(card) == "heart") {
							return false;
						}
					},
				},
				charlotte: true,
				marktext: "♥",
				intro: "红桃牌于本回合内不计入手牌上限",
			},
		},
	}
```

### reyingshi 名字:应势
描述: 出牌阶段开始时，你可以展示一张手牌，选择一名角色A和一名其他角色B，展示牌堆中与展示牌花色点数均相同的所有牌。A可以对B使用一张【杀】，然后获得你展示的牌。若A因此【杀】造成过伤害，则A获得牌堆中的展示牌。
```js
reyingshi: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		direct: true,
		filter(event, player) {
			return player.countCards("h") > 0 && game.countPlayer() > 1;
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseCardTarget({
					prompt: get.prompt("reyingshi"),
					prompt2: "操作提示：选择一张作为赏金的手牌，然后选择作为赏金猎人的角色A和作为出杀目标的其他角色B",
					filterCard: true,
					selectTarget: 2,
					position: "h",
					filterTarget(card, player, target) {
						if (!ui.selected.targets.length) {
							return true;
						}
						return target != player;
					},
					complexTarget: true,
					targetprompt: ["出杀", "被杀"],
					complexSelect: true,
					ai1(card) {
						return 1 / Math.max(1, get.value(card));
					},
					ai2(target) {
						var player = _status.event.player;
						if (!ui.selected.targets.length) {
							var att = get.attitude(player, target);
							if (att < 0) {
								return 0;
							}
							if (target.hasSha()) {
								return Math.pow(target.countCards("h") + 1, 1.1) * (player == target ? 3 : 1);
							}
							return Math.sqrt(1 + target.countCards("h"));
						}
						return get.effect(target, { name: "sha" }, ui.selected.targets[0], player);
					},
				})
				.forResult();
			if (result?.bool && result.cards?.length && result.targets?.length) {
				const targets = result.targets;
				player.logSkill("reyingshi", targets[1]);
				const card = result.cards[0];
				player.showCards(card, get.translation(player) + "对" + get.translation(targets[1]) + "发动了【应势】");
				player.line(targets[0], "fire");
				const suit = get.suit(card),
					number = get.number(card);
				const cardx = Array.from(ui.cardPile.childNodes).filter(card => {
					if (card.suit == suit && card.number == number) {
						return true;
					}
				});
				if (cardx.length) {
					await player.showCards(cardx, `${get.translation(player)}发动了【应势】`);
				}
				await game.delayx(2);
				const next = targets[0].chooseToUse(
					function (card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.cardEnabled.apply(this, arguments) && lib.filter.targetEnabled(card, player, (event || _status.event).sourcex);
					},
					"###是否对" + get.translation(targets[1]) + "使用一张【杀】？###若选择使用，则获得赏金（" + get.translation(card) + "）。若造成伤害，则再从牌堆中获得与此牌花色点数相同的牌作为额外赏金。"
				);
				next.set("addCount", false);
				next.set("complexSelect", true);
				next.set("filterTarget", function (card, player, target) {
					if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
						return false;
					}
					return lib.filter.targetEnabled.apply(this, arguments);
				});
				next.set("sourcex", targets[1]);
				const result2 = await next.forResult();

				const target = targets[0];
				if (result2?.bool && target.isIn()) {
					let cards = [],
						slice = 0;
					if (player != target && player.getCards("h").includes(card)) {
						cards.push(card);
						slice++;
					}
					if (
						target.hasHistory("useCard", function (evt) {
							if (evt.getParent(2) != event) {
								return false;
							}
							return target.hasHistory("sourceDamage", function (evtx) {
								return evtx.card == evt.card;
							});
						})
					) {
						cards.addArray(
							Array.from(ui.cardPile.childNodes).filter(cardx => {
								if (cardx.suit == suit && cardx.number == number) {
									return true;
								}
							})
						);
						if (cards.length > 0) {
							if (!slice) {
								await target.gain(cards, "gain2");
							} else {
								setTimeout(
									function () {
										target.$gain2(cards.slice(slice), true);
									},
									get.delayx(200, 200)
								);
								await target.gain(cards, player, "give");
							}
						}
					} else {
						if (cards.length > 0) {
							await target.gain(cards, player, "give");
						}
					}
				}
			}
		},
	}
```

## re_jushou 名字:界沮授 势力:qun

### dcjianying 名字:渐营
描述: 当你使用与你使用的上一张牌点数或花色相同的牌时，你可以摸一张牌。
```js
dcjianying: {
		audio: 2,
		locked: false,
		mod: {
			aiOrder(player, card, num) {
				if (typeof card == "object" && player.isPhaseUsing()) {
					var evt = lib.skill.dcjianying.getLastUsed(player);
					if (evt && evt.card && ((get.suit(evt.card) && get.suit(evt.card) == get.suit(card)) || (evt.card.number && evt.card.number == get.number(card)))) {
						return num + 10;
					}
				}
			},
		},
		trigger: { player: "useCard" },
		frequent: true,
		getLastUsed(player, event) {
			var history = player.getAllHistory("useCard");
			var index;
			if (event) {
				index = history.indexOf(event) - 1;
			} else {
				index = history.length - 1;
			}
			if (index >= 0) {
				return history[index];
			}
			return false;
		},
		filter(event, player) {
			var evt = lib.skill.dcjianying.getLastUsed(player, event);
			if (!evt || !evt.card) {
				return false;
			}
			return (lib.suit.includes(get.suit(evt.card)) && get.suit(evt.card) == get.suit(event.card)) || (typeof get.number(evt.card, false) == "number" && get.number(evt.card, false) == get.number(event.card));
		},
		async content(event, trigger, player) {
			await player.draw("nodelay");
		},
		group: "dcjianying_mark",
		init(player) {
			var history = player.getAllHistory("useCard");
			if (history.length) {
				var trigger = history[history.length - 1];
				if (get.suit(trigger.card, player) == "none" || typeof get.number(trigger.card, player) != "number") {
					return;
				}
				player.storage.dcjianying_mark = trigger.card;
				player.markSkill("dcjianying_mark");
				game.broadcastAll(
					function (player, suit) {
						if (player.marks.dcjianying_mark) {
							player.marks.dcjianying_mark.firstChild.innerHTML = get.translation(suit);
						}
					},
					player,
					get.suit(trigger.card, player)
				);
			}
		},
		onremove(player) {
			player.unmarkSkill("dcjianying_mark");
			delete player.storage.dcjianying_mark;
		},
		subSkill: {
			mark: {
				charlotte: true,
				trigger: { player: "useCard1" },
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					if (get.suit(trigger.card, player) == "none" || typeof get.number(trigger.card, player) != "number") {
						player.unmarkSkill("dcjianying_mark");
					} else {
						player.storage.dcjianying_mark = trigger.card;
						player.markSkill("dcjianying_mark");
						game.broadcastAll(
							function (player, suit) {
								if (player.marks.dcjianying_mark) {
									player.marks.dcjianying_mark.firstChild.innerHTML = get.translation(suit);
								}
							},
							player,
							get.suit(trigger.card, player)
						);
					}
				},
				intro: {
					markcount(card, player) {
						return get.strNumber(get.number(card, player));
					},
					content(card, player) {
						var suit = get.suit(card, player);
						var num = get.number(card, player);
						var str = "<li>上一张牌的花色：" + get.translation(suit);
						str += "<br><li>上一张牌的点数：" + get.strNumber(num);
						return str;
					},
				},
			},
		},
	}
```

### dcshibei 名字:矢北
描述: 锁定技，当你于一回合内第一次受到伤害后，你回复1点体力；当你于一回合内第二次受到伤害后，你失去1点体力。
```js
dcshibei: {
		audio: 2,
		audioname2: { tw_jushou: "shibei_xin_jushou" },
		trigger: { player: "damageEnd" },
		check(event, player) {
			return player.getHistory("damage").indexOf(event) == 0;
		},
		filter(event, player) {
			var index = player.getHistory("damage").indexOf(event);
			return index == 0 || index == 1;
		},
		forced: true,
		async content(event, trigger, player) {
			if (player.getHistory("damage").indexOf(trigger) > 0) {
				await player.loseHp();
			} else {
				await player.recover();
			}
		},
		subSkill: {
			damaged: {},
			ai: {},
		},
		ai: {
			maixie_defend: true,
			threaten: 0.9,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return;
					}
					if (target.hujia) {
						return;
					}
					if (player._shibei_tmp) {
						return;
					}
					if (target.hasSkill("shibei_ai")) {
						return;
					}
					if (_status.event.getParent("useCard", true) || _status.event.getParent("_wuxie", true)) {
						return;
					}
					if (get.tag(card, "damage")) {
						if (target.getHistory("damage").length > 0) {
							return [1, -2];
						} else {
							if (get.attitude(player, target) > 0 && target.hp > 1) {
								return 0;
							}
							if (
								get.attitude(player, target) < 0 &&
								!player.hasSkillTag("damageBonus", "e", {
									target: target,
									card: card,
								})
							) {
								if (card.name == "sha") {
									return;
								}
								var sha = false;
								player._shibei_tmp = true;
								var num = player.countCards("h", function (card) {
									if (card.name == "sha") {
										if (sha) {
											return false;
										} else {
											sha = true;
										}
									}
									return get.tag(card, "damage") && player.canUse(card, target) && get.effect(target, card, player, player) > 0;
								});
								delete player._shibei_tmp;
								if (player.hasSkillTag("damage")) {
									num++;
								}
								if (num < 2) {
									var enemies = player.getEnemies();
									if (enemies.length == 1 && enemies[0] == target && player.needsToDiscard()) {
										return;
									}
									return 0;
								}
							}
						}
					}
				},
			},
		},
	}
```

## re_zhanghe 名字:界张郃 势力:wei

### reqiaobian 名字:巧变
描述: ①游戏开始时，你获得两枚“变”。②判定阶段开始时，你可弃置一张牌或一枚“变”并跳过此阶段。③摸牌阶段开始时，你可弃置一张牌或一枚“变”并跳过此阶段，然后可以获得至多两名其他角色的各一张手牌。④出牌阶段开始时，你可弃置一张牌或一枚“变”并跳过此阶段，然后你可以移动场上的一张牌。⑤弃牌阶段开始时，你可弃置一张牌或一枚“变”并跳过此阶段。⑥结束阶段，若你的〖巧变⑥〗记录中不包含你的手牌数，则你获得一枚“变”并记录你的手牌数。
```js
reqiaobian: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		locked: false,
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		async content(event, trigger, player) {
			player.addMark("reqiaobian", 2);
			await game.delayx();
		},
		marktext: "变",
		intro: {
			name2: "变",
			content(storage, player) {
				var str = "共有" + (storage || 0) + "个标记";
				if (player.storage.reqiaobian_jieshu) {
					str = "<li>" + str + "<br><li>已记录手牌数：" + get.translation(player.storage.reqiaobian_jieshu);
				}
				return str;
			},
		},
		group: ["reqiaobian_judge", "reqiaobian_draw", "reqiaobian_use", "reqiaobian_discard", "reqiaobian_jieshu"],
		subSkill: {
			judge: {
				audio: "reqiaobian",
				trigger: { player: "phaseJudgeBefore" },
				direct: true,
				filter(event, player) {
					return player.hasMark("reqiaobian") || player.hasCard(card => lib.filter.cardDiscardable(card, player, "reqiaobian_judge"), "he");
				},
				check(event, player) {
					return player.hasCard(function (card) {
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
				},
				async content(event, trigger, player) {
					let result;

					// step 0
					var choices = [];
					if (player.hasMark("reqiaobian")) {
						choices.push("弃置标记");
					}
					if (player.hasCard(card => lib.filter.cardDiscardable(card, player, "reqiaobian_judge"), "he")) {
						choices.push("弃置牌");
					}
					choices.push("cancel2");
					result = await player
						.chooseControl(choices)
						.set("prompt", "巧变：是否跳过判定阶段？")
						.set("ai", function () {
							var evt = _status.event;
							if (lib.skill[evt.getParent().name].check(evt.getTrigger(), evt.player)) {
								return 0;
							}
							return "cancel2";
						})
						.forResult();

					// step 1
					if (result.control != "cancel2") {
						if (result.control == "弃置牌") {
							const discardResult = await player.chooseToDiscard("he", true).forResult();
							discardResult.logSkill = event.name;
						} else {
							player.logSkill(event.name);
							player.removeMark("reqiaobian", 1);
						}

						// step 2
						trigger.cancel();
					}
				},
			},
			draw: {
				audio: "reqiaobian",
				trigger: { player: "phaseDrawBefore" },
				direct: true,
				filter(event, player) {
					return player.hasMark("reqiaobian") || player.hasCard(card => lib.filter.cardDiscardable(card, player, "reqiaobian_judge"), "he");
				},
				check(event, player) {
					return (
						game.countPlayer(function (current) {
							if (current == player || current.countGainableCards(player, "h") == 0) {
								return false;
							}
							var att = get.attitude(player, current);
							if (current.hasSkill("tuntian")) {
								return att > 0;
							}
							return att < 1;
						}) > 1
					);
				},
				async content(event, trigger, player) {
					let result;

					// step 0
					var choices = [];
					if (player.hasMark("reqiaobian")) {
						choices.push("弃置标记");
					}
					if (player.hasCard(card => lib.filter.cardDiscardable(card, player, "reqiaobian_draw"), "he")) {
						choices.push("弃置牌");
					}
					choices.push("cancel2");
					result = await player
						.chooseControl(choices)
						.set("prompt", "巧变：是否跳过摸牌阶段？")
						.set("ai", function () {
							var evt = _status.event;
							if (lib.skill[evt.getParent().name].check(evt.getTrigger(), evt.player)) {
								return 0;
							}
							return "cancel2";
						})
						.forResult();

					// step 1
					if (result.control != "cancel2") {
						if (result.control == "弃置牌") {
							const discardResult = await player.chooseToDiscard("he", true).forResult();
							discardResult.logSkill = event.name;
						} else {
							player.logSkill(event.name);
							player.removeMark("reqiaobian", 1);
						}

						// step 2
						trigger.cancel();
						if (game.hasPlayer(current => current.countGainableCards(player, "h") > 0)) {
							result = await player
								.chooseTarget("是否获得至多两名其他角色的各一张手牌？", [1, 2], function (card, player, target) {
									return target != player && target.countGainableCards(player, "h") > 0;
								})
								.set("ai", function (target) {
									var att = get.attitude(_status.event.player, target);
									if (target.hasSkill("tuntian")) {
										return att / 10;
									}
									return 1 - att;
								})
								.forResult();

							// step 3
							if (result.bool) {
								var targets = result.targets.sortBySeat();
								player.line(targets, "green");
								await player.gainMultiple(targets).forResult();
							}
						}
					}
				},
			},
			use: {
				audio: "reqiaobian",
				trigger: { player: "phaseUseBefore" },
				direct: true,
				filter(event, player) {
					return player.hasMark("reqiaobian") || player.hasCard(card => lib.filter.cardDiscardable(card, player, "reqiaobian_judge"), "he");
				},
				check(event, player) {
					if (
						player.countCards("h", function (card) {
							return player.hasValueTarget(card, null, true);
						}) > 1
					) {
						return false;
					}
					return game.hasPlayer(function (current) {
						var att = get.sgn(get.attitude(player, current));
						if (att != 0) {
							var es = current.getCards("e");
							for (var i = 0; i < es.length; i++) {
								if (
									game.hasPlayer(function (current2) {
										if (get.sgn(get.value(es[i], current)) != -att || get.value(es[i], current) < 5) {
											return false;
										}
										var att2 = get.sgn(get.attitude(player, current2));
										if (att == att2 || att2 != get.sgn(get.effect(current2, es[i], player, current2))) {
											return false;
										}
										return current != current2 && !current2.isMin() && current2.canEquip(es[i]);
									})
								) {
									return true;
								}
							}
						}
						if (att > 0) {
							var js = current.getCards("j", function (card) {
								return (
									get.effect(
										current,
										{
											name: card.viewAs || card.name,
											cards: [card],
										},
										current,
										current
									) < -2
								);
							});
							for (var i = 0; i < js.length; i++) {
								if (
									game.hasPlayer(function (current2) {
										var att2 = get.attitude(player, current2);
										if (att2 >= 0) {
											return false;
										}
										return current != current2 && current2.canAddJudge(js[i]);
									})
								) {
									return true;
								}
							}
						}
					});
				},
				async content(event, trigger, player) {
					let result;

					// step 0
					var choices = [];
					if (player.hasMark("reqiaobian")) {
						choices.push("弃置标记");
					}
					if (player.hasCard(card => lib.filter.cardDiscardable(card, player, "reqiaobian_use"), "he")) {
						choices.push("弃置牌");
					}
					choices.push("cancel2");
					result = await player
						.chooseControl(choices)
						.set("prompt", "巧变：是否跳过出牌阶段？")
						.set("ai", function () {
							var evt = _status.event;
							if (lib.skill[evt.getParent().name].check(evt.getTrigger(), evt.player)) {
								return 0;
							}
							return "cancel2";
						})
						.forResult();

					// step 1
					if (result.control != "cancel2") {
						if (result.control == "弃置牌") {
							const discardResult = await player.chooseToDiscard("he", true).forResult();
							discardResult.logSkill = event.name;
						} else {
							player.logSkill(event.name);
							player.removeMark("reqiaobian", 1);
						}

						// step 2
						trigger.cancel();
						await player.moveCard().forResult();
					}
				},
			},
			discard: {
				audio: "reqiaobian",
				trigger: { player: "phaseDiscardBefore" },
				direct: true,
				filter(event, player) {
					return player.hasMark("reqiaobian") || player.hasCard(card => lib.filter.cardDiscardable(card, player, "reqiaobian_judge"), "he");
				},
				check(event, player) {
					return player.needsToDiscard();
				},
				async content(event, trigger, player) {
					let result;

					// step 0
					var choices = [];
					if (player.hasMark("reqiaobian")) {
						choices.push("弃置标记");
					}
					if (player.hasCard(card => lib.filter.cardDiscardable(card, player, "reqiaobian_discard"), "he")) {
						choices.push("弃置牌");
					}
					choices.push("cancel2");
					result = await player
						.chooseControl(choices)
						.set("prompt", "巧变：是否跳过弃牌阶段？")
						.set("ai", function () {
							var evt = _status.event;
							if (lib.skill[evt.getParent().name].check(evt.getTrigger(), evt.player)) {
								return 0;
							}
							return "cancel2";
						})
						.forResult();

					// step 1
					if (result.control != "cancel2") {
						if (result.control == "弃置牌") {
							const discardResult = await player.chooseToDiscard("he", true).forResult();
							discardResult.logSkill = event.name;
						} else {
							player.logSkill(event.name);
							player.removeMark("reqiaobian", 1);
						}

						// step 2
						trigger.cancel();
					}
				},
			},
			jieshu: {
				audio: "reqiaobian",
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				filter(event, player) {
					return !player.getStorage("reqiaobian_jieshu").includes(player.countCards("h"));
				},
				async content(event, trigger, player) {
					player.addMark("reqiaobian", 1);
					player.markAuto("reqiaobian_jieshu", [player.countCards("h")]);
					player.storage.reqiaobian_jieshu.sort();
				},
			},
		},
	}
```

## dc_xushu 名字:新杀徐庶 势力:shu

### rezhuhai 名字:诛害
描述: 其他角色的结束阶段开始时，若其本回合内造成过伤害，则你可以选择一项：⒈将一张手牌当做【杀】对其使用。⒉视为对其使用一张【过河拆桥】。
```js
rezhuhai: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		direct: true,
		filter(event, player) {
			return player != event.player && event.player.getHistory("sourceDamage").length > 0 && event.player.isIn() && (player.countCards("h") > 0 || player.canUse("guohe", event.player));
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			let result;

			// step 0
			var choiceList = ["将一张手牌当做【杀】对其使用", "视为对其使用一张【过河拆桥】"];
			var bool = false,
				hs = player.getCards("h");
			for (var i of hs) {
				if (game.checkMod(i, player, "unchanged", "cardEnabled2", player) !== false && player.canUse(get.autoViewAs({ name: "sha" }, [i]), target, false)) {
					bool = true;
					break;
				}
			}
			var choices = [];
			if (bool) {
				choices.push("选项一");
			} else {
				choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
			}
			if (player.canUse("guohe", target)) {
				choices.push("选项二");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			choices.push("cancel2");
			result = await player
				.chooseControl(choices)
				.set("choiceList", choiceList)
				.set("prompt", get.prompt("rezhuhai", target))
				.set("ai", function () {
					var choices = _status.event.controls;
					var eff1 = 0,
						eff2 = 0;
					var player = _status.event.player,
						target = _status.event.getTrigger().player;
					if (choices.includes("选项一")) {
						eff1 = get.effect(target, { name: "sha" }, player, player);
					}
					if (choices.includes("选项二")) {
						eff2 = get.effect(target, { name: "guohe" }, player, player);
					}
					if (eff1 > 0 && ((player.hasSkill("xsqianxin") && player.isDamaged()) || eff1 > eff2)) {
						return "选项一";
					}
					if (eff2 > 0) {
						return "选项二";
					}
					return "cancel2";
				})
				.forResult();

			// step 1
			if (result.control != "cancel2") {
				if (result.control == "选项一") {
					result = await player
						.chooseCard(
							"h",
							true,
							function (card, player) {
								if (!game.checkMod(card, player, "unchanged", "cardEnabled2", player)) {
									return false;
								}
								return player.canUse(get.autoViewAs({ name: "sha" }, [card]), _status.event.getTrigger().player, false);
							},
							"选择一张手牌当做【杀】对" + get.translation(trigger.player) + "使用"
						)
						.set("ai", function (card) {
							var player = _status.event.player;
							return get.effect(_status.event.getTrigger().player, get.autoViewAs({ name: "sha" }, [card]), player, player) / Math.max(1, get.value(card));
						})
						.forResult();

					// step 2
					if (result.bool) {
						await player.useCard({ name: "sha" }, result.cards, "rezhuhai", trigger.player, false).forResult();
					}
				} else {
					await player.useCard({ name: "guohe", isCard: true }, trigger.player, "rezhuhai").forResult();
				}
			}
		},
	}
```

### xsqianxin 名字:潜心
描述: 觉醒技。当你造成伤害后，若你已受伤，则你减1点体力上限并获得〖荐言〗。
```js
xsqianxin: {
		audio: 2,
		trigger: { source: "damageSource" },
		juexingji: true,
		forced: true,
		skillAnimation: true,
		animationColor: "orange",
		filter(event, player) {
			return player.isDamaged();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			await player.addSkills("rejianyan");
		},
		derivation: "rejianyan",
	}
```

## xin_gaoshun 名字:界高顺 势力:qun

### decadexianzhen 名字:陷阵
描述: 每回合限一次。出牌阶段，你可以和一名其他角色拼点。若你赢：本回合你无视该角色的防具，且对其使用牌没有次数和距离限制，且本回合对其使用牌造成伤害时，此伤害+1（每种牌名每回合限一次）；若你没赢：你本回合内不能使用【杀】，且【杀】不计入手牌上限。
```js
decadexianzhen: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		filter(event, player) {
			return player.countCards("h") > 0 && !player.hasSkill("decadexianzhen2") && !player.hasSkill("decadexianzhen3");
		},
		async content(event, trigger, player) {
			const target = event.target;
			let result;

			// step 0
			result = await player.chooseToCompare(target).forResult();

			// step 1
			if (result.bool) {
				player.storage.decadexianzhen2 = target;
				player.addTempSkill("decadexianzhen2");
			} else {
				player.addTempSkill("decadexianzhen3");
			}
		},
		ai: {
			order(name, player) {
				var cards = player.getCards("h");
				if (player.countCards("h", "sha") == 0) {
					return 1;
				}
				for (var i = 0; i < cards.length; i++) {
					if (cards[i].name != "sha" && get.number(cards[i]) > 11 && get.value(cards[i]) < 7) {
						return 9;
					}
				}
				return get.order({ name: "sha" }) - 1;
			},
			result: {
				player(player) {
					if (player.countCards("h", "sha") > 0) {
						return 0;
					}
					var num = player.countCards("h");
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
					var num = target.countCards("h");
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
	}
```

### decadejinjiu 名字:禁酒
描述: 锁定技。你的【酒】的牌名均视为【杀】且点数视为K；你的回合内，其他角色不能使用【酒】。
```js
decadejinjiu: {
		global: "decadejinjiu_global",
		mod: {
			cardname(card) {
				if (card.name == "jiu") {
					return "sha";
				}
			},
			cardnumber(card) {
				if (card.name == "jiu") {
					return 13;
				}
			},
		},
		audio: 2,
		audioname2: {
			ol_gaoshun: "rejinjiu",
		},
		trigger: { player: ["useCard1", "respond"] },
		filter(event, player) {
			return event.card.name == "sha" && !event.skill && event.cards && event.cards.length == 1 && event.cards[0].name == "jiu";
		},
		forced: true,
		firstDo: true,
		async content(_) {},
		subSkill: {
			global: {
				mod: {
					cardEnabled(card, player) {
						if (card.name == "jiu") {
							var source = _status.currentPhase;
							if (source && source != player && source.hasSkill("decadejinjiu")) {
								return false;
							}
						}
					},
					cardSavable(card, player) {
						if (card.name == "jiu") {
							var source = _status.currentPhase;
							if (source && source != player && source.hasSkill("decadejinjiu")) {
								return false;
							}
						}
					},
				},
			},
		},
	}
```

## re_guohuanghou 名字:界郭皇后 势力:wei

### rejiaozhao 名字:矫诏
描述: 出牌阶段限一次。你可以展示一张手牌，并令一名距离你最近的其他角色选择一种基本牌或普通锦囊牌的牌名。你可将此牌当做其声明的牌使用直到此阶段结束（你不是此牌的合法目标）。
```js
rejiaozhao: {
		audio: 2,
		enable: "phaseUse",
		group: "rejiaozhao_base",
		locked: false,
		mod: {
			targetEnabled(card, player, target) {
				if (player == target && card.storage && card.storage.rejiaozhao) {
					return false;
				}
			},
		},
		filter(event, player) {
			return player.hasMark("redanxin") && player.countCards("h") && player.getStorage("rejiaozhao_clear").length < player.countMark("redanxin");
		},
		chooseButton: {
			dialog(event, player) {
				var list = [],
					storage = player.getStorage("rejiaozhao_clear");
				for (var name of lib.inpile) {
					var type = get.type(name);
					if ((type == "basic" || type == "trick") && !storage.includes(type)) {
						list.push([type, "", name]);
						if (name == "sha") {
							for (var nature of lib.inpile_nature) {
								list.push([type, "", name, nature]);
							}
						}
					}
				}
				return ui.create.dialog("矫诏", [list, "vcard"]);
			},
			filter(button, player) {
				var card = { name: button.link[2], nature: button.link[3] };
				if (player.countMark("redanxin") < 2) {
					card.storage = { rejiaozhao: true };
				}
				var evt = _status.event.getParent();
				return evt.filterCard(card, player, evt);
			},
			check(button) {
				var card = { name: button.link[2], nature: button.link[3] },
					player = _status.event.player;
				if (player.countMark("redanxin") < 2) {
					card.storage = { rejiaozhao: true };
				}
				return player.getUseValue(card, null, true);
			},
			backup(links, player) {
				var next = {
					audio: "redanxin",
					viewAs: { name: links[0][2], nature: links[0][3] },
					filterCard: true,
					position: "h",
					popname: true,
					ai1: card => 8 - get.value(card),
					onuse(result, player) {
						player.addTempSkill("rejiaozhao_clear", "phaseUseAfter");
						player.markAuto("rejiaozhao_clear", [get.type(result.card)]);
					},
				};
				if (player.countMark("redanxin") < 2) {
					next.viewAs.storage = { rejiaozhao: true };
				}
				return next;
			},
			prompt(links) {
				return "将一张手牌当做" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
			},
		},
		ai: {
			order: 6,
			result: {
				player: 1,
			},
		},
		derivation: ["rejiaozhao_lv2", "rejiaozhao_lv3"],
		subSkill: {
			clear: { onremove: true },
			base: {
				audio: "rejiaozhao",
				enable: "phaseUse",
				usable: 1,
				filter(event, player) {
					if (player.hasMark("redanxin")) {
						return false;
					}
					return player.countCards("h") > 0 && game.hasPlayer(current => current != player);
				},
				filterCard: true,
				position: "h",
				discard: false,
				lose: false,
				check(card) {
					return 1 / Math.max(1, _status.event.player.getUseValue(card));
				},
				prompt: "出牌阶段限一次。你可以展示一张手牌，并令一名距离你最近的角色选择一种基本牌或普通锦囊牌的牌名。你可将此牌当做其声明的牌使用直到此阶段结束（你不是此牌的合法目标）。",
				async content(event, trigger, player) {
					const cards = event.cards;
					let result;

					// step 0
					player.showCards(cards);

					// step 1
					var targets = game.filterPlayer();
					targets.remove(player);
					targets.sort(function (a, b) {
						return Math.max(1, get.distance(player, a)) - Math.max(1, get.distance(player, b));
					});
					var distance = Math.max(1, get.distance(player, targets[0]));
					for (var i = 1; i < targets.length; i++) {
						if (Math.max(1, get.distance(player, targets[i])) > distance) {
							targets.splice(i);
							break;
						}
					}
					result = await player
						.chooseTarget("请选择【矫诏】的目标", true, function (card, player, target) {
							return _status.event.targets.includes(target);
						})
						.set("ai", function (target) {
							return get.attitude(_status.event.player, target);
						})
						.set("targets", targets)
						.forResult();

					// step 2
					if (!result.bool) {
						return;
					}
					var target = result.targets[0];
					event.target = target;
					var list = [];
					for (var i = 0; i < lib.inpile.length; i++) {
						var name = lib.inpile[i];
						if (name == "sha") {
							list.push(["基本", "", "sha"]);
							for (var j of lib.inpile_nature) {
								list.push(["基本", "", "sha", j]);
							}
						} else if (get.type(name) == "basic") {
							list.push(["基本", "", name]);
						} else if (get.type(name) == "trick") {
							list.push(["锦囊", "", name]);
						}
					}
					result = await target
						.chooseButton(["矫诏", [list, "vcard"]], true)
						.set("ai", function (button) {
							var player = _status.event.getParent().player,
								card = {
									name: button.link[2],
									nature: button.link[3],
									storage: {
										rejiaozhao: true,
									},
								};
							return player.getUseValue(card, null, true) * _status.event.att;
						})
						.set("att", get.attitude(event.target, player) > 0 ? 1 : -1)
						.forResult();

					// step 3
					var chosen = result.links[0][2];
					var nature = result.links[0][3];
					var fakecard = {
						name: chosen,
						storage: { rejiaozhao: true },
					};
					if (nature) {
						fakecard.nature = nature;
					}
					event.target.showCards(
						game.createCard({
							name: chosen,
							nature: nature,
							suit: cards[0].suit,
							number: cards[0].number,
						}),
						get.translation(event.target) + "声明了" + get.translation(chosen)
					);
					game.broadcastAll(
						(player, fakecard) => {
							player.storage.rejiaozhao_viewas = fakecard;
						},
						player,
						fakecard
					);
					cards[0].addGaintag("rejiaozhao");
					player.addTempSkill("rejiaozhao_viewas", "phaseUseEnd");
				},
				ai: {
					order: 9,
					result: {
						player: 1,
					},
				},
			},
			backup: { audio: "rejiaozhao" },
			viewas: {
				enable: "phaseUse",
				mod: {
					targetEnabled(card, player, target) {
						if (player == target && card.storage && card.storage.rejiaozhao) {
							return false;
						}
					},
				},
				filter(event, player) {
					if (!player.storage.rejiaozhao_viewas) {
						return false;
					}
					var cards = player.getCards("h", function (card) {
						return card.hasGaintag("rejiaozhao");
					});
					if (!cards.length) {
						return false;
					}
					if (!game.checkMod(cards[0], player, "unchanged", "cardEnabled2", player)) {
						return false;
					}
					var card = get.autoViewAs(player.storage.rejiaozhao_viewas, cards);
					return event.filterCard(card, player, event);
				},
				viewAs(cards, player) {
					return player.storage.rejiaozhao_viewas;
				},
				filterCard(card) {
					return card.hasGaintag("rejiaozhao");
				},
				selectCard: -1,
				position: "h",
				popname: true,
				prompt() {
					return "将“矫诏”牌当做" + get.translation(_status.event.player.storage.rejiaozhao_viewas) + "使用";
				},
				onremove(player) {
					player.removeGaintag("rejiaozhao");
					delete player.storage.rejiaozhao_viewas;
				},
				ai: { order: 8 },
			},
		},
	}
```

### redanxin 名字:殚心
描述: 当你受到伤害后，你可以摸一张牌并升级〖矫诏〗。
```js
redanxin: {
		audio: 2,
		trigger: { player: "damageEnd" },
		frequent: true,
		async content(event, trigger, player) {
			await player.draw();
			if (player.countMark("redanxin") < 2) {
				player.addMark("redanxin", 1, false);
			}
		},
		intro: { content: "当前升级等级：Lv#" },
		ai: {
			maixie: true,
			effect: {
				target: (card, player, target) => {
					if (!get.tag(card, "damage")) {
						return;
					}
					if (target.hp + target.hujia < 2 || player.hasSkillTag("jueqing", false, target)) {
						return 2;
					}
					if (!target.hasSkill("rejiaozhao") || target.countMark("redanxin") > 1) {
						return [1, 1];
					}
					return [1, 0.8 * target.hp - 0.4];
				},
			},
		},
	}
```

## re_xiahoushi 名字:界夏侯氏 势力:shu

### reqiaoshi 名字:樵拾
描述: 其他角色的结束阶段开始时，若你的手牌数与其相等，则你可以与其各摸一张牌。若这两张牌花色相同，则你可以重复此步骤。
```js
reqiaoshi: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return event.player != player && event.player.countCards("h") == player.countCards("h") && event.player.isIn();
		},
		check(event, player) {
			return get.attitude(player, event.player) >= 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			while (player.isIn() && target.isIn()) {
				const list1 = (await player.draw("nodelay").forResult()).cards;
				const list2 = (await target.draw().forResult()).cards;
				await game.delayx();
				if (
					[list1, list2].every(cards => get.itemtype(cards) == "cards") &&
					list1.length == list2.length &&
					list1
						.map(card => get.suit(card, player))
						.toUniqued()
						.every(suit => list2.some(card => get.suit(card, target) == suit))
				) {
					const result = await player.chooseBool("是否继续发动【樵拾】？", `和${get.translation(target)}各摸一张牌`).forResult();
					if (!result?.bool) {
						break;
					}
				} else {
					break;
				}
			}
		},
		ai: { expose: 0.1 },
	}
```

### reyanyu 名字:燕语
描述: ①出牌阶段，你可以重铸【杀】。②出牌阶段结束时，你可以令一名其他男性角色摸X张牌（X为你本阶段内发动过〖燕语①〗的次数且至多为3）。
```js
reyanyu: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.hasCard(card => lib.skill.reyanyu.filterCard(card, player), "h");
		},
		filterCard: (card, player) => get.name(card) == "sha" && player.canRecast(card),
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const { cards } = event;
			await player.recast(cards);
		},
		ai: {
			basic: {
				order: 1,
			},
			result: {
				player: 1,
			},
		},
		group: "reyanyu2",
	}
```

## ol_lusu 名字:界鲁肃 势力:wu

### olhaoshi 名字:好施
描述: 摸牌阶段开始时，你可以多摸两张牌。然后摸牌阶段结束时，若你的手牌数大于5，则你将手牌数的一半（向下取整）交给一名手牌最少其他角色并获得如下效果直到你下回合开始：当你成为【杀】或普通锦囊牌的目标后，其可以交给你一张手牌。
```js
olhaoshi: {
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed;
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
		async content(event, trigger, player) {
			trigger.num += 2;
			player.addTempSkill("olhaoshi_give", "phaseDrawAfter");
		},
		subSkill: {
			give: {
				trigger: { player: "phaseDrawEnd" },
				forced: true,
				charlotte: true,
				popup: false,
				filter(event, player) {
					return player.countCards("h") > 5;
				},
				async content(event, trigger, player) {
					let result;

					// step 0
					var targets = game.filterPlayer(function (target) {
							return (
								target != player &&
								!game.hasPlayer(function (current) {
									return current != player && current != target && current.countCards("h") < target.countCards("h");
								})
							);
						}),
						num = Math.floor(player.countCards("h") / 2);
					result = await player
						.chooseCardTarget({
							position: "h",
							filterCard: true,
							filterTarget(card, player, target) {
								return _status.event.targets.includes(target);
							},
							targets: targets,
							selectTarget: targets.length == 1 ? -1 : 1,
							selectCard: num,
							prompt: "将" + get.cnNumber(num) + "张手牌交给一名手牌数最少的其他角色",
							forced: true,
							ai1(card) {
								var goon = false,
									player = _status.event.player;
								for (var i of _status.event.targets) {
									if (get.attitude(i, player) > 0 && get.attitude(player, i) > 0) {
										goon = true;
									}
									break;
								}
								if (goon) {
									if (
										!player.hasValueTarget(card) ||
										(card.name == "sha" &&
											player.countCards("h", function (cardx) {
												return cardx.name == "sha" && !ui.selected.cards.includes(cardx);
											}) > player.getCardUsable("sha"))
									) {
										return 2;
									}
									return Math.max(2, get.value(card) / 4);
								}
								return 1 / Math.max(1, get.value(card));
							},
							ai2(target) {
								return get.attitude(_status.event.player, target);
							},
						})
						.forResult();

					// step 1
					if (result.bool) {
						var target = result.targets[0];
						player.line(target, "green");
						player.give(result.cards, target);
						player.markAuto("olhaoshi_help", [target]);
						player.addTempSkill("olhaoshi_help", { player: "phaseBeginStart" });
					}
				},
			},
			help: {
				trigger: { target: "useCardToTargeted" },
				direct: true,
				charlotte: true,
				onremove: true,
				filter(event, player) {
					if (!player.storage.olhaoshi_help || !player.storage.olhaoshi_help.length) {
						return false;
					}
					if (event.card.name != "sha" && get.type(event.card) != "trick") {
						return false;
					}
					for (var i of player.storage.olhaoshi_help) {
						if (i.countCards("h") > 0) {
							return true;
						}
					}
					return false;
				},
				async content(event, trigger, player) {
					let result;
					let targets = event.targets;
					let target = event.target;

					while (true) {
						// step 0
						if (!targets) {
							targets = player.storage.olhaoshi_help.slice(0).sortBySeat();
						}
						if (!targets.length) break;

						target = targets.shift();
						result = await target
							.chooseCard("h", "好施：是否将一张手牌交给" + get.translation(player) + "？")
							.set("ai", function (card) {
								var player = _status.event.player,
									target = _status.event.getTrigger().player;
								if (!_status.event.goon) {
									if (get.value(card, player) < 0 || get.value(card, target) < 0) {
										return 1;
									}
									return 0;
								}
								var cardx = _status.event.getTrigger().card;
								if (card.name == "shan" && get.tag(cardx, "respondShan") && target.countCards("h", "shan") < player.countCards("h", "shan")) {
									return 2;
								}
								if (card.name == "sha" && (cardx.name == "juedou" || (get.tag(card, "respondSha") && target.countCards("h", "sha") < player.countCards("h", "sha")))) {
									return 2;
								}
								if (get.value(card, target) > get.value(card, player) || target.getUseValue(card) > player.getUseValue(card)) {
									return 1;
								}
								if (player.hasSkillTag("noh")) {
									return 0.5 / Math.max(1, get.value(card, player));
								}
								return 0;
							})
							.set("goon", get.attitude(target, player) > 0)
							.forResult();

						// step 1
						if (result.bool) {
							target.logSkill("olhaoshi_help", player);
							target.give(result.cards, player);
						}
					}
				},
			},
		},
	}
```

### oldimeng 名字:缔盟
描述: 出牌阶段限一次，你可令两名手牌数之差不大于你牌数的其他角色交换手牌。若如此做，此阶段结束时，你弃置X张牌（X为这两名角色手牌数之差）。
```js
oldimeng: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.oldimeng.filterTarget(null, player, current));
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
			player.addTempSkill("oldimeng_discard", "phaseUseAfter");
			player.markAuto("oldimeng_discard", [targets]);
		},
		ai: {
			threaten: 4.5,
			pretao: true,
			nokeep: true,
			order: 1,
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
				audio: "oldimeng",
				trigger: { player: "phaseUseEnd" },
				forced: true,
				charlotte: true,
				onremove: true,
				filter(event, player) {
					return player.countCards("he") > 0;
				},
				async content(event, trigger, player) {
					for (let targets of player.getStorage("oldimeng_discard")) {
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
	}
```

## re_jiaxu 名字:界贾诩 势力:qun

### rewansha 名字:完杀
描述: 锁定技。①你的回合内，不处于濒死状态的其他角色不能使用【桃】。②当有角色于你的回合内进入濒死状态时，你令其以外的所有其他角色的非锁定技失效直到此濒死状态结算结束。
```js
rewansha: {
		audio: "wansha",
		audioname: ["re_jiaxu", "boss_lvbu3", "new_simayi"],
		audioname2: { shen_simayi: "jilue_wansha" },
		global: "rewansha_global",
		trigger: { global: "dyingBegin" },
		forced: true,
		logTarget: "player",
		filter(event, player) {
			return player == _status.currentPhase;
		},
		async content(event, trigger, player) {
			const targets = game.filterPlayer();
			for (const current of targets) {
				if (current != player && current != trigger.player) {
					current.addSkillBlocker("rewansha_fengyin");
				}
			}
			player.addTempSkill("rewansha_clear");
		},
		subSkill: {
			global: {
				mod: {
					cardEnabled(card, player) {
						var source = _status.currentPhase;
						if (card.name == "tao" && source && source != player && source.hasSkill("rewansha") && !player.isDying()) {
							return false;
						}
					},
					cardSavable(card, player) {
						var source = _status.currentPhase;
						if (card.name == "tao" && source && source != player && source.hasSkill("rewansha") && !player.isDying()) {
							return false;
						}
					},
				},
			},
			fengyin: {
				inherit: "fengyin",
			},
			clear: {
				trigger: { global: "dyingAfter" },
				forced: true,
				charlotte: true,
				popup: false,
				filter(event, player) {
					return !_status.dying.length;
				},
				async content(event, trigger, player) {
					player.removeSkill("rewansha_clear");
				},
				onremove() {
					game.countPlayer2(function (current) {
						current.removeSkillBlocker("rewansha_fengyin");
					});
				},
			},
		},
	}
```

### reluanwu 名字:乱武
描述: 限定技，出牌阶段，你可令所有其他角色依次选择一项：①对距离最近（或之一）的角色使用一张【杀】；②失去1点体力。结算完成后，你可视为使用一张【杀】（无距离限制）。
```js
reluanwu: {
		audio: "luanwu",
		inherit: "luanwu",
		async contentAfter(event, trigger, player) {
			await player.chooseUseTarget("sha", "是否使用一张【杀】？", false, "nodistance");
		},
	}
```

### reweimu 名字:帷幕
描述: 锁定技。①你不能成为黑色锦囊牌的目标。②当你于回合内受到伤害时，你防止此伤害并摸2X张牌（X为伤害值）。
```js
reweimu: {
		audio: 2,
		mod: {
			targetEnabled(card) {
				if (get.type2(card) == "trick" && get.color(card) == "black") {
					return false;
				}
			},
		},
		trigger: { player: "damageBegin4" },
		forced: true,
		filter(event, player) {
			return player == _status.currentPhase;
		},
		async content(event, trigger, player) {
			trigger.cancel();
			const num = trigger.num;
			await player.draw(2 * num);
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (target == _status.currentPhase && get.tag(card, "damage")) {
						return [0, 2, 0, 0];
					}
				},
			},
		},
		group: "reweimu_log",
		subSkill: {
			log: {
				audio: "reweimu",
				trigger: { global: "useCard1" },
				forced: true,
				firstDo: true,
				filter(event, player) {
					if (event.player == player) {
						return false;
					}
					if (get.color(event.card) != "black" || get.type(event.card) != "trick") {
						return false;
					}
					var info = lib.card[event.card.name];
					return info && info.selectTarget && info.selectTarget == -1 && !info.toself;
				},
				async content(_) {},
			},
		},
	}
```

## re_guyong 名字:界顾雍 势力:wu

### reshenxing 名字:慎行
描述: 出牌阶段，你可以弃置X张牌（X为你本阶段内发动过〖慎行〗的次数且至少为0，至多为2），然后摸一张牌。
```js
reshenxing: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("he") >= Math.min(2, player.countMark("reshenxing_used"));
		},
		selectCard() {
			return Math.min(2, _status.event.player.countMark("reshenxing_used"));
		},
		prompt() {
			return "弃置" + get.cnNumber(Math.min(2, _status.event.player.countMark("reshenxing_used"))) + "张牌并摸一张牌";
		},
		check(card) {
			var num = _status.event.player.countCards("h", { color: get.color(card) });
			if (get.position(card) == "e") {
				num++;
			}
			return (Math.max(4, 7.1 - num) - get.value(card)) / num;
		},
		filterCard: lib.filter.cardDiscardable,
		position: "he",
		async content(event, trigger, player) {
			await player.draw();
			player.addTempSkill(event.name + "_used", "phaseUseAfter");
			player.addMark(event.name + "_used", 1, false);
		},
		ai: {
			order(item, player) {
				if (!player.hasMark("reshenxing_used")) {
					return 10;
				}
				return 1;
			},
			result: { player: 1 },
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
				intro: {
					content: "已发动过#次",
				},
			},
		},
	}
```

### rebingyi 名字:秉壹
描述: 结束阶段，你可展示所有手牌。若这些牌：颜色均相同，则你可以令至多X名角色各摸一张牌（X为你的手牌数）；颜色点数均相同，则你摸一张牌。
```js
rebingyi: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		filterx(player) {
			var cards = player.getCards("h");
			if (cards.length == 1) {
				return true;
			}
			var color = get.color(cards[0], player);
			for (var i = 1; i < cards.length; i++) {
				if (get.color(cards[i], player) != color) {
					return false;
				}
			}
			return true;
		},
		filtery(player) {
			var cards = player.getCards("h");
			if (cards.length == 1) {
				return true;
			}
			var color = get.number(cards[0], player);
			for (var i = 1; i < cards.length; i++) {
				if (get.number(cards[i], player) != color) {
					return false;
				}
			}
			return true;
		},
		async cost(event, trigger, player) {
			const selfDraw = get.info(event.skill).filterx(player) && get.info(event.skill).filtery(player),
				asyncDraw = get.info(event.skill).filterx(player);
			if (asyncDraw) {
				const num = player.countCards("h");
				const result = await player
					.chooseTarget(get.prompt(event.skill), `展示所有手牌，并选择至多${get.cnNumber(num)}名角色各摸一张牌${selfDraw ? "，然后你摸一张牌" : ""}`, [0, num])
					.set("ai", function (target) {
						return get.attitude(get.player(), target);
					})
					.forResult();
				if (result.bool) {
					event.result = {
						bool: result.bool,
						cost_data: {
							asyncDraw,
							selfDraw,
							targets: result.targets,
						},
					};
				}
			} else {
				event.result = await player
					.chooseBool(get.prompt(event.skill), `展示所有手牌${selfDraw ? "，然后你摸一张牌" : ""}`)
					.set("choice", selfDraw)
					.set("ai", () => get.event().choice)
					.forResult();
				event.result.cost_data = { selfDraw };
			}
		},
		async content(event, trigger, player) {
			await player.showHandcards(get.translation(player) + "发动了【秉壹】");
			const data = event.cost_data;
			if (data.asyncDraw && data.targets && data.targets.length) {
				const targets = data.targets.sortBySeat();
				await game.asyncDraw(targets);
			}
			if (data.selfDraw) {
				player.draw();
			}
		},
	}
```

## xin_zhonghui 名字:界钟会 势力:wei

### xinquanji 名字:权计
描述: ①当你受到1点伤害后，或其他角色不因你的赠予或交给而得到你的牌后，你可以摸一张牌，然后将一张手牌置于武将牌上，称为“权”。②你的手牌上限+X（X为“权”的数量）。
```js
xinquanji: {
		audio: 2,
		trigger: {
			player: ["damageEnd"],
			global: ["gainAfter", "loseAsyncAfter"],
		},
		getIndex(event, player, triggername) {
			return event.name == "damage" ? event.num : 1;
		},
		filter(event, player) {
			if (event.name == "damage") {
				return event.num > 0;
			}
			if (event.name == "loseAsync") {
				if (event.type != "gain" || event.giver) {
					return false;
				}
				return game.hasPlayer(current => {
					if (current == player) {
						return false;
					}
					return event.getg?.(current).some(card => event.getl?.(player)?.cards2?.includes(card));
				});
			}
			if (player == event.player) {
				return false;
			}
			if (event.giver || event.getParent().name == "gift") {
				return false;
			}
			return event.getl?.(player)?.cards2?.length;
		},
		frequent: true,
		async content(event, trigger, player) {
			await player.draw();
			const hs = player.getCards("h");
			if (!hs.length) {
				return;
			}
			const result = hs.length == 1 ? { bool: true, cards: hs } : await player.chooseCard("h", true, "选择一张手牌作为“权”").forResult();
			if (result?.bool && result?.cards?.length) {
				const next = player.addToExpansion(result.cards, player, "give");
				next.gaintag.add(event.name);
				await next;
			}
		},
		locked: false,
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
		mod: {
			maxHandcard(player, num) {
				return num + player.getExpansions("xinquanji").length;
			},
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			notemp: true,
			threaten: 0.8,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage") && !target.storage.xinzili) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						if (!target.hasFriend()) {
							return;
						}
						if (target.hp >= 4) {
							return [0.5, get.tag(card, "damage") * 2];
						}
						if (!target.hasSkill("xinpaiyi") && target.hp > 1) {
							return [0.5, get.tag(card, "damage") * 1.5];
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
	}
```

### xinzili 名字:自立
描述: 觉醒技。准备阶段，若你的“权”数大于2，则你回复1点体力并摸两张牌，减1点体力上限并获得〖排异〗。
```js
xinzili: {
		derivation: "xinpaiyi",
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			return player.getExpansions("xinquanji").length > 2;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.recover();
			await player.draw(2);
			await player.loseMaxHp();
			await player.addSkills("xinpaiyi");
		},
		ai: {
			combo: "xinquanji",
		},
	}
```

## re_caifuren 名字:界蔡夫人 势力:qun

### reqieting 名字:窃听
描述: 其他角色的回合结束时，若其本回合内未造成过伤害，则你可将其装备区内的一张牌置于你的装备区内；若其本回合内未对其他角色使用过牌，则你可摸一张牌。
```js
reqieting: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		direct: true,
		filter(event, player) {
			var target = event.player;
			if (player == target) {
				return false;
			}
			if (!target.getHistory("sourceDamage").length) {
				var cards = target.getCards("e");
				for (var i of cards) {
					if (player.canEquip(i)) {
						return true;
					}
				}
			}
			return (
				target.getHistory("useCard", function (evt) {
					return (
						evt.targets &&
						evt.targets.filter(function (i) {
							return i != target;
						}).length > 0
					);
				}).length == 0
			);
		},
		frequent: true,
		async content(event, trigger, player) {
			const target = trigger.player;
			let logged = false;
			let result;

			// step 0
			var list = [];
			if (!target.getHistory("sourceDamage").length) {
				var cards = target.getCards("e");
				for (var i of cards) {
					if (player.canEquip(i)) {
						list.push(i);
					}
				}
			}
			if (list.length) {
				result = await player
					.choosePlayerCard(target, "e", get.prompt("reqieting", target))
					.set("list", list)
					.set("filterButton", function (button) {
						return _status.event.list.includes(button.link);
					})
					.set("ai", function (button) {
						var evt = _status.event,
							val = get.value(button.link);
						if (evt.target.hasSkillTag("noe")) {
							val -= 4;
						}
						if (evt.att > 0 == val > 0) {
							return 0;
						}
						return get.effect(evt.player, button.link, evt.player, evt.player);
					})
					.set("att", get.attitude(player, target))
					.forResult();

				// step 1
				if (result.bool) {
					player.logSkill("reqieting", target);
					logged = true;
					var card = result.links[0];
					target.$give(card, player, false);
					await game.delay(0.5);
					player.equip(card);
				}
			}

			if (
				target.getHistory("useCard", function (evt) {
					return (
						evt.targets &&
						evt.targets.filter(function (i) {
							return i != target;
						}).length > 0
					);
				}).length != 0
			) {
				return;
			}

			// step 2
			result = await player.chooseBool("是否发动【窃听】摸一张牌？").set("frequentSkill", "reqieting").forResult();

			// step 3
			if (result.bool) {
				if (!logged) {
					player.logSkill("reqieting", target);
				}
				await player.draw().forResult();
			}
		},
	}
```

### rexianzhou 名字:献州
描述: 限定技。出牌阶段，你可将装备区内的所有牌交给一名其他角色。你回复X点体力，然后对其攻击范围内的至多X名角色各造成1点伤害（X为你以此法给出的牌数）。
```js
rexianzhou: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "gray",
		filter(event, player) {
			return player.countCards("e") > 0;
		},
		filterCard: true,
		position: "e",
		selectCard: -1,
		filterTarget: lib.filter.notMe,
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const { cards, target } = event;
			player.awakenSkill(event.name);
			player.give(cards, target);
			player.recover(cards.length);
			const list = game.filterPlayer(function (current) {
				return target.inRange(current);
			});
			if (list.length) {
				const max = Math.min(list.length, cards.length);
				const result = await target
					.chooseTarget(true, [1, max], "对至多" + get.cnNumber(max) + "名范围内的角色各造成1点伤害", function (card, player, target) {
						return _status.event.list.includes(target);
					})
					.set("list", list)
					.set("ai", function (target) {
						var player = _status.event.player;
						return get.damageEffect(target, player, player);
					})
					.forResult();
				if (result.bool) {
					const targets = result.targets.sortBySeat();
					player.line(targets, "green");
					for (const i of targets) {
						i.damage("nocard");
					}
				}
			} else {
				return;
			}
		},
		ai: {
			order: 1,
			result: {
				target: 1,
				player(player) {
					var bool = true,
						players = game.filterPlayer();
					for (var i = 0; i < players.length; i++) {
						if (players[i] != player && get.attitude(player, players[i]) > 2 && get.attitude(players[i], player) > 2) {
							bool = false;
							break;
						}
					}
					if (bool) {
						return -10;
					}
					if (player.hp == 1) {
						return 1;
					}
					if (game.phaseNumber < game.players.length) {
						return -10;
					}
					if (player.countCards("e") + player.hp <= player.maxHp) {
						return 1;
					}
					return -10;
				},
			},
		},
	}
```

## re_guanping 名字:界关平 势力:shu

### relongyin 名字:龙吟
描述: 当一名角色于其出牌阶段内使用【杀】时，你可弃置一张牌令此【杀】不计入出牌阶段使用次数。若此【杀】为红色，则你摸一张牌；若你以此法弃置的牌与此【杀】点数相同，则你重置“竭忠”。
```js
relongyin: {
		audio: 2,
		init: player => {
			game.addGlobalSkill("relongyin_order");
		},
		onremove: player => {
			if (!game.hasPlayer(current => current.hasSkill("relongyin", null, null, false), true)) {
				game.removeGlobalSkill("relongyin_order");
			}
		},
		trigger: { global: "useCard" },
		direct: true,
		filter(event, player) {
			return event.card.name == "sha" && player.countCards("he") > 0 && event.player.isPhaseUsing();
		},
		async content(event, trigger, player) {
			let go = false;
			if (get.attitude(player, trigger.player) > 0) {
				if (get.color(trigger.card) == "red") {
					go = true;
				} else if (trigger.addCount === false || !trigger.player.isPhaseUsing()) {
					go = false;
				} else if (!trigger.player.hasSkill("paoxiao") && !trigger.player.hasSkill("tanlin3") && !trigger.player.hasSkill("zhaxiang2") && !trigger.player.hasSkill("fengnu") && !trigger.player.getEquip("zhuge")) {
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
					} else if (nh >= 3) {
						if (nh == 3) {
							go = Math.random() < 0.5;
						} else if (nh == 2) {
							go = Math.random() < 0.2;
						}
					}
				}
			}
			//AI停顿
			if (
				go &&
				!event.isMine() &&
				!event.isOnline() &&
				player.hasCard(function (card) {
					return get.value(card) < 6 && lib.filter.cardDiscardable(card, player, event.name);
				}, "he")
			) {
				game.delayx();
			}
			const result = await player
				.chooseToDiscard(get.prompt("longyin"), "弃置一张牌" + (get.color(trigger.card) == "red" ? "并摸一张牌" : "") + "，令" + get.translation(trigger.player) + "本次使用的【杀】不计入使用次数", "he")
				.set("logSkill", ["relongyin", trigger.player])
				.set("ai", function (card) {
					if (_status.event.go) {
						return 6 - get.value(card);
					}
					return 0;
				})
				.set("go", go)
				.forResult();
			if (result.bool) {
				if (trigger.addCount !== false) {
					trigger.addCount = false;
					const stat = trigger.player.getStat().card,
						name = trigger.card.name;
					if (typeof stat[name] === "number") {
						stat[name]--;
					}
				}
				if (get.color(trigger.card) == "red") {
					player.draw();
				}
				if (get.number(result.cards[0], player) == get.number(trigger.card)) {
					player.restoreSkill("jiezhong");
				}
			}
		},
		ai: {
			expose: 0.2,
		},
		subSkill: {
			order: {
				mod: {
					aiOrder: (player, card, num) => {
						if (num && card.name === "sha" && get.color(card) === "red") {
							let gp = game.findPlayer(current => {
								return current.hasSkill("relongyin") && current.hasCard(i => true, "he");
							});
							if (gp) {
								return num + 0.15 * Math.sign(get.attitude(player, gp));
							}
						}
					},
				},
				trigger: { player: "dieAfter" },
				filter: (event, player) => {
					return !game.hasPlayer(current => current.hasSkill("relongyin", null, null, false), true);
				},
				silent: true,
				forceDie: true,
				charlotte: true,
				content: () => {
					game.removeGlobalSkill("relongyin_order");
				},
			},
		},
	}
```

### jiezhong 名字:竭忠
描述: 限定技，出牌阶段开始时，你可以将手牌补至体力上限。
```js
jiezhong: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		filter(event, player) {
			return player.countCards("h") < player.maxHp;
		},
		async content(event, trigger, player) {
			const { name } = event;
			player.awakenSkill(name);
			await player.drawTo(player.maxHp);
		},
	}
```

## re_guotufengji 名字:界郭图逢纪 势力:qun

### rejigong 名字:急攻
描述: 出牌阶段开始时，你可以摸至多三张牌。若如此做，你本回合的手牌上限基数改为X，且此阶段结束时，若X不小于Y，则你回复1点体力。（X为你本回合内造成的伤害值之和，Y为你本回合内因〖急攻〗摸牌而得到的牌的数量总和）
```js
rejigong: {
		audio: 2,
		direct: true,
		trigger: { player: "phaseUseBegin" },
		async content(event, trigger, player) {
			const result = await player
				.chooseControl("一张", "两张", "三张", "cancel2")
				.set("prompt", get.prompt2("rejigong"))
				.set("ai", () => "三张")
				.forResult();
			if (result.control != "cancel2") {
				player.logSkill("rejigong");
				player.addTempSkill("rejigong2");
				player.draw(1 + result.index);
			}
		},
	}
```

### shifei
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_zhoucang 名字:界周仓 势力:shu

### rezhongyong 名字:忠勇
描述: 当你使用【杀】后，你可以将此【杀】以及目标角色使用的【闪】交给另一名其他角色，若其获得的牌中有红色，则其可以对你攻击范围内的角色使用一张【杀】。若其获得的牌中有黑色，其摸一张牌。
```js
rezhongyong: {
		trigger: { player: "useCardAfter" },
		audio: 2,
		direct: true,
		filter(event, player) {
			return event.card.name == "sha";
		},
		async content(event, trigger, player) {
			const { cards } = event;
			const usedCards = trigger.cards.filterInD();
			let allCards = usedCards.slice();
			game.countPlayer2(function (current) {
				current.getHistory("useCard", function (evt) {
					if (evt.card.name == "shan" && evt.getParent(3) == trigger) {
						allCards.addArray(evt.cards.filterInD("od"));
					}
				});
			});
			if (!allCards.length) {
				return;
			}
			const targetResult = await player
				.chooseTarget(get.prompt2("rezhongyong"), "令一名其他角色获得" + get.translation(allCards), function (card, player, target) {
					return !_status.event.source.includes(target) && target != player;
				})
				.set("ai", function (target) {
					return get.attitude(_status.event.player, target);
				})
				.set("source", trigger.targets)
				.forResult();
			if (targetResult.bool) {
				const target = targetResult.targets[0];
				player.logSkill("rezhongyong", target);
				target.gain(allCards, "gain2");
				let red = false,
					black = false;
				for (const i of allCards) {
					const color = get.color(i, false);
					if (color == "red") {
						red = true;
					}
					if (color == "black") {
						black = true;
					}
					if (red && black) {
						break;
					}
				}
				if (red) {
					target
						.chooseToUse("是否使用一张杀？", { name: "sha" })
						.set("filterTarget", function (card, player, target) {
							return target != _status.event.sourcex && _status.event.sourcex.inRange(target) && lib.filter.targetEnabled.apply(this, arguments);
						})
						.set("sourcex", player)
						.set("addCount", false);
				}
				if (black) {
					target.draw();
				}
			}
		},
	}
```

## ol_zhurong 名字:界祝融 势力:shu

### juxiang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### lieren
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### changbiao 名字:长标
描述: 出牌阶段限一次，你可以将任意张手牌当做【杀】使用（无距离限制）。若你因此【杀】对目标角色造成过伤害，则你于出牌阶段结束时摸X张牌（X为此【杀】对应的实体牌数量）。
```js
changbiao: {
		audio: 2,
		mod: {
			targetInRange(card, player, target) {
				if (card.changbiao) {
					return true;
				}
			},
		},
		enable: "phaseUse",
		usable: 1,
		viewAs: {
			name: "sha",
			changbiao: true,
		},
		locked: false,
		filter(event, player) {
			return player.countCards("hs") > 0;
		},
		filterCard: true,
		selectCard: [1, Infinity],
		allowChooseAll: true,
		position: "hs",
		check(card) {
			let player = _status.event.player;
			if (ui.selected.cards.length) {
				let list = game
					.filterPlayer(function (current) {
						return current !== player && player.canUse("sha", current, false) && get.effect(current, { name: "sha" }, player, player) > 0;
					})
					.sort(function (a, b) {
						return get.effect(b, { name: "sha" }, player, player) - get.effect(a, { name: "sha" }, player, player);
					});
				if (!list.length) {
					return 0;
				}
				let target = list[0],
					cards = ui.selected.cards.concat([card]),
					color = [];
				for (let i of cards) {
					if (!color.includes(get.color(i, player))) {
						color.add(get.color(i, player));
					}
				}
				if (color.length !== 1) {
					color[0] = "none";
				}
				if (
					player.hasSkillTag(
						"directHit_ai",
						true,
						{
							target: target,
							card: {
								name: "sha",
								suit: "none",
								color: color[0],
								cards: cards,
								isCard: true,
							},
						},
						true
					)
				) {
					return 6.5 - get.value(card, player);
				}
				if (
					Math.random() * target.countCards("hs") < 1 ||
					player.needsToDiscard(0, (i, player) => {
						return !ui.selected.cards.includes(i) && !player.canIgnoreHandcard(i);
					})
				) {
					return 6 - get.value(card, player);
				}
				return 0;
			}
			return 6.3 - get.value(card);
		},
		onuse(result, player) {
			player.addTempSkill("changbiao_draw");
		},
		subSkill: {
			draw: {
				audio: "changbiao",
				trigger: { player: "phaseUseEnd" },
				forced: true,
				charlotte: true,
				filter(event, player) {
					return player.hasHistory("sourceDamage", function (evxt) {
						var evt = evxt.getParent();
						return evt && evt.name == "sha" && evt.skill == "changbiao" && evt.getParent("phaseUse") == event;
					});
				},
				async content(event, trigger, player) {
					const cards = [];
					for (const evxt of player.getHistory("sourceDamage")) {
						const evt = evxt.getParent();
						if (evt && evt.name === "sha" && evt.skill === "changbiao" && evt.getParent("phaseUse") === trigger) {
							cards.addArray(evt.cards);
						}
					}
					if (cards.length) {
						await player.draw(cards.length);
					}
				},
			},
		},
		ai: {
			order(item, player) {
				return (
					get.order({ name: "sha" }, player) +
					0.3 *
						(Math.min(
							player.getCardUsable("sha"),
							player.countCards("hs", "sha") +
								player.hasCard(function (card) {
									return card.name != "sha" && get.value(card, player) < 6.3;
								}, "hs")
								? 1
								: 0
						) > 1
							? -1
							: 1)
				);
			},
			nokeep: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "nokeep") {
					let num = 0;
					if (arg && (!arg.card || get.name(arg.card) !== "tao")) {
						return false;
					}
					player.getHistory("sourceDamage", function (evxt) {
						let evt = evxt.getParent();
						if (evt && evt.name == "sha" && evt.skill == "changbiao") {
							num += evt.cards.length;
						}
					});
					return player.needsToDiscard(num) > 0;
				}
			},
		},
	}
```

## re_zhangchunhua 名字:界张春华 势力:wei

### rejueqing
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### shangshi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_gongsunyuan 名字:界公孙渊 势力:qun

### rehuaiyi 名字:怀异
描述: 出牌阶段限一次，你可以展示所有手牌，若这些牌的颜色：全部相同，你摸一张牌，并将此技能于本阶段内改为“限两次”，然后终止此技能的结算流程；不全部相同，则你选择一种颜色并弃置该颜色的所有手牌，然后你可以获得至多X名其他角色的各一张牌（X为你以此法弃置的手牌数）。若你以此法得到的牌不少于两张，则你失去1点体力。
```js
rehuaiyi: {
		audio: 2,
		enable: "phaseUse",
		usable(skill, player) {
			return 1 + (player.hasSkill(skill + "_rewrite", null, null, false) ? 1 : 0);
		},
		delay: false,
		filter(event, player) {
			return player.countCards("h");
		},
		async content(event, trigger, player) {
			await player.showHandcards();
			const hs = player.getCards("h"),
				color = get.color(hs[0], player);
			if (
				hs.length === 1 ||
				!hs.some((card, index) => {
					return index > 0 && get.color(card) !== color;
				})
			) {
				await player.draw();
				player.addTempSkill(event.name + "_rewrite", "phaseUseEnd");
			} else {
				const list = [],
					bannedList = [],
					indexs = Object.keys(lib.color);
				player.getCards("h").forEach(card => {
					const color = get.color(card, player);
					list.add(color);
					if (!lib.filter.cardDiscardable(card, player, "rehuaiyi")) {
						bannedList.add(color);
					}
				});
				list.removeArray(bannedList);
				list.sort((a, b) => indexs.indexOf(a) - indexs.indexOf(b));
				let result;
				if (!list.length) {
					return;
				} else if (list.length === 1) {
					result = { control: list[0] };
				} else {
					result = await player
						.chooseControl(list.map(i => `${i}2`))
						.set("ai", () => {
							const player = get.player();
							if (player.countCards("h", { color: "red" }) == 1 && player.countCards("h", { color: "black" }) > 1) {
								return 1;
							}
							return 0;
						})
						.set("prompt", "请选择弃置一种颜色的所有手牌")
						.forResult();
				}
				const control = result.control.slice(0, -1);
				const cards = player.getCards("h", { color: control }),
					num = cards.length;
				await player.discard(cards);
				const { targets } = await player
					.chooseTarget(`请选择至多${get.cnNumber(num)}名有牌的其他角色，获得这些角色的各一张牌。`, [1, num], (card, player, target) => {
						return target != player && target.countGainableCards(player, "he");
					})
					.set("ai", target => {
						return -get.attitude(get.player(), target) + 0.5;
					})
					.forResult();
				if (!targets || !targets.length) {
					return;
				}
				player.line(targets, "green");
				for (const target of targets.sortBySeat()) {
					if (target.isIn() && target.countGainableCards(player, "he")) {
						await player.gainPlayerCard(target, "he", true);
					}
				}
				if (player.getHistory("gain", evt => evt.getParent(2) == event).reduce((sum, evt) => sum + evt.cards.length, 0) > 1) {
					await player.loseHp();
				}
			}
		},
		ai: {
			order(item, player) {
				if (player.countCards("h", { color: "red" }) == 0) {
					return 10;
				}
				if (player.countCards("h", { color: "black" }) == 0) {
					return 10;
				}
				return 1;
			},
			result: {
				player: 1,
			},
		},
		subSkill: { rewrite: { charlotte: true } },
	}
```

## re_caozhen 名字:界曹真 势力:wei

### residi 名字:司敌
描述: 结束阶段，你可以将一张非基本牌置于武将牌上，称为“司”。其他角色的出牌阶段开始时，你可以移去一张“司”。若如此做，其本阶段内不能使用或打出与“司”颜色相同的牌。此阶段结束时，若其于此阶段内未使用过：【杀】，你视为对其使用一张【杀】。锦囊牌，你摸两张牌。
```js
residi: {
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		audio: 2,
		filter(event, player) {
			return (
				player.countCards("he", function (card) {
					if (_status.connectMode) {
						return true;
					}
					return get.type(card) != "basic";
				}) > 0
			);
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			result = await player
				.chooseCard("he", get.prompt("residi"), "将一张非基本牌置于武将牌上作为“司”", function (card, player) {
					return get.type(card) != "basic";
				})
				.set("ai", function (card) {
					if (get.position(card) == "e") {
						return 5 + player.hp - get.value(card);
					}
					return 7 - get.value(card);
				})
				.forResult();

			// step 1
			if (result.bool) {
				player.logSkill("residi");
				player.addToExpansion(result.cards, "give", player).gaintag.add("residi");
			}
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
		},
		group: "residi_push",
		ai: {
			notemp: true,
		},
	}
```

## re_fuhuanghou 名字:界伏寿 势力:qun

### rezhuikong 名字:惴恐
描述: 其他角色的准备阶段开始时，若你已受伤，你可与其拼点：若你赢，本回合该角色只能对自己使用牌；若你没赢，你获得其拼点的牌，然后其视为对你使用一张【杀】。
```js
rezhuikong: {
		audio: 2,
		audioname: ["ol_fuhuanghou"],
		audioname2: { tw_fuhuanghou: "xinzhuikong" },
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
					if (get.number(cards[i]) > 7 && useful < 7) {
						return true;
					}
				}
			}
			return false;
		},
		logTarget: "player",
		filter(event, player) {
			return player.hp < player.maxHp && player.canCompare(event.player);
		},
		async content(event, trigger, player) {
			const { player: target } = trigger;
			const result = await player
				.chooseToCompare(target)
				.set("small", player.hp > 1 && get.effect(player, { name: "sha" }, target, player) > 0 && Math.random() < 0.9)
				.forResult();
			if (result.bool) {
				target.addTempSkill("zishou2");
			} else {
				if (result.target && get.position(result.target) == "d") {
					await player.gain(result.target, "gain2", "log");
				}
				const card = { name: "sha", isCard: true };
				if (target.canUse(card, player, false)) {
					await target.useCard(card, player, false);
				}
			}
		},
	}
```

### reqiuyuan 名字:求援
描述: 当你成为【杀】的目标时，你可选择另一名其他角色。除非该角色交给你一张除【杀】以外的基本牌，否则其也成为此【杀】的目标且该角色不能响应此【杀】。
```js
reqiuyuan: {
		inherit: "qiuyuan",
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const { card } = trigger;
			const result = await target
				.chooseToGive(
					(card, player) => {
						const name = get.name(card, player);
						return name != "sha" && get.type(name) == "basic";
					},
					`交给${get.translation(player)}一张不为【杀】的基本牌，或成为${get.translation(card)}的额外目标且不可响应此牌`,
					player
				)
				.set("ai", card => {
					const { player, target } = get.event();
					return get.attitude(player, target) >= 0 ? 1 : -1;
				})
				.forResult();
			if (!result?.bool) {
				trigger.getParent().targets.push(target);
				trigger.getParent().triggeredTargets2.push(target);
				trigger.directHit.push(target);
				game.log(target, "成为了", card, "的额外目标");
			}
		},
	}
```

## re_fazheng 名字:界法正 势力:shu

### reenyuan 名字:恩怨
描述: 当你获得一名其他角色的至少两张牌后，你可以令其摸一张牌。当你受到1点伤害后，你可令伤害来源选择一项：①失去1点体力。②交给你一张手牌。若此牌不为♥，则你摸一张牌。
```js
reenyuan: {
		audio: 2,
		group: ["reenyuan1", "reenyuan2"],
	}
```

### rexuanhuo 名字:眩惑
描述: 摸牌阶段结束时，你可以交给一名其他角色两张手牌，然后该角色选择一项：1. 视为对你选择的另一名角色使用任意一种【杀】或【决斗】，2. 交给你所有手牌。
```js
rexuanhuo: {
		audio: 2,
		trigger: { player: "phaseDrawEnd" },
		filter(event, player) {
			return player.countCards("h") > 1 && game.countPlayer() > 2;
		},
		async cost(event, trigger, player) {
			const ai2 = function (target) {
				const player = get.player();
				if (get.attitude(player, target) <= 0) {
					return 0;
				}
				const list = [null, "juedou"].concat(lib.inpile_nature);
				if (target.hasSkill("ayato_zenshen")) {
					list.push("kami");
				}
				let num = Math.max.apply(
					Math,
					list.map(function (i) {
						if (i == "juedou") {
							return target.getUseValue({ name: "juedou", isCard: true }, false);
						}
						const card = { name: "sha", nature: i, isCard: true };
						return target.getUseValue(card, false);
					})
				);
				if (target.hasSkillTag("nogain")) {
					num /= 4;
				}
				return num;
			};
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt2(event.skill),
					filterCard: true,
					selectCard: 2,
					position: "h",
					filterTarget: lib.filter.notMe,
					goon: game.hasPlayer(current => {
						return current != player && ai2(current) > 0;
					}),
					ai1(card) {
						if (!_status.event.goon) {
							return 0;
						}
						return 7 - get.value(card);
					},
					ai2,
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.give(event.cards, target);
			let result;
			const targets = game.filterPlayer(current => {
				return current != player && current != target;
			});
			if (!targets.length) {
				return;
			}
			result =
				targets.length == 1
					? { bool: true, targets }
					: await player
							.chooseTarget(
								(card, player, target) => {
									return _status.event.targets?.includes(target);
								},
								`选择${get.translation(target)}使用【杀】或【决斗】的目标`,
								true
							)
							.set("target", target)
							.set("ai", target => {
								const evt = _status.event;
								const list = [null, "juedou"].concat(lib.inpile_nature);
								if (evt.target.hasSkill("ayato_zenshen")) {
									list.push("kami");
								}
								return Math.max.apply(
									Math,
									list.map(item => {
										const card = { name: "sha", isCard: true };
										if (item == "juedou") {
											card.name = "juedou";
										} else if (item) {
											card.nature = item;
										}
										if (!evt.target.canUse(card, target, false)) {
											return 0;
										}
										return get.effect(target, card, evt.target, evt.player);
									})
								);
							})
							.set("targets", targets)
							.forResult();
			if (!result?.bool) {
				return;
			}
			const target2 = result.targets[0];
			event.target2 = target2;
			player.line(target2);
			game.log(player, "选择了", target2);
			const list = lib.inpile_nature.slice(0);
			list.unshift(null);
			let vcards = [];
			if (target.hasSkill("ayato_zenshen")) {
				list.add("kami");
			}
			vcards = list
				.filter(nature => target.canUse({ name: "sha", isCard: true, nature }, target2, false))
				.map(nature => {
					return ["基本", "", "sha", nature];
				});
			if (target.canUse({ name: "juedou", isCard: true }, target2, false)) {
				vcards.push(["基本", "", "juedou"]);
			}
			if (!vcards.length) {
				if (!target.countCards("h")) {
					return;
				} else {
					result = { index: 1 };
				}
			} else if (!target.countCards("h")) {
				result = { index: 0 };
			} else {
				result = await target
					.chooseControl()
					.set("choiceList", [`视为对${get.translation(target2)}使用任意一种【杀】或【决斗】`, `将所有手牌交给${get.translation(player)}`])
					.forResult();
			}
			if (result?.index == 0) {
				result = await target
					.chooseButton([`眩惑：请选择要对${get.translation(target2)}使用的牌`, [vcards, "vcard"]], true)
					.set("target", target2)
					.set("direct", true)
					.set("ai", button => {
						const { player, target } = get.event();
						return get.effect(target, { name: button.link[2], isCard: true, nature: button.link[3] }, player, player);
					})
					.forResult();
				if (result?.bool) {
					await target.useCard({ name: result.links[0][2], isCard: true, nature: result.links[0][3] }, false, target2);
				}
			} else if (result?.index == 1) {
				await target.give(target.getCards("h"), player, "giveAuto");
			}
		},
		ai: {
			expose: 0.17,
			fireAttack: true,
			skillTagFilter(player) {
				return player.hasFriend();
			},
		},
	}
```

## xin_lingtong 名字:界凌统 势力:wu

### decadexuanfeng 名字:旋风
描述: 当你于弃牌阶段弃置过至少两张牌，或当你失去装备区里的牌后，若场上没有处于濒死状态的角色，则你可以弃置至多两名其他角色的共计两张牌。若此时处于你的回合内，你可以对其中一名目标角色造成1点伤害。
```js
decadexuanfeng: {
		audio: "xuanfeng",
		audioname: ["boss_lvbu3", "re_heqi", "xin_lingtong"],
		mod: {
			aiOrder(player, card, num) {
				if (
					num <= 0 ||
					!player.isPhaseUsing() ||
					player.needsToDiscard() !== 2 ||
					!card.cards ||
					!card.cards.some(i => {
						return get.position(i) === "h";
					}) ||
					get.tag(card, "draw") ||
					get.tag(card, "gain")
				) {
					return;
				}
				if (get.type(card) == "equip" && player.hasCard(cardx => card != cardx && (!card.cards || !card.cards.includes(cardx)) && (player.hasSkill("yongjin") || get.subtype(card) == get.subtype(cardx)) && (get.position(cardx) == "e" || player.canUse(cardx, player)), "hes")) {
					return;
				}
				if (!game.hasPlayer(current => get.attitude(player, current) < 0 && current.countDiscardableCards(player, "he") > 0 && get.damageEffect(current, player, player) > 0)) {
					return;
				}
				return 0;
			},
		},
		trigger: {
			player: ["loseAfter", "phaseDiscardEnd"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			if (_status.dying.length) {
				return false;
			}
			if (event.name == "phaseDiscard") {
				var cards = [];
				player.getHistory("lose", function (evt) {
					if (evt && evt.type == "discard" && evt.getParent("phaseDiscard") == event && evt.hs) {
						cards.addArray(evt.hs);
					}
				});
				return cards.length > 1;
			} else {
				var evt = event.getl(player);
				return evt && evt.es && evt.es.length > 0;
			}
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(
					get.prompt2(event.skill),
					(card, player, target) => {
						if (player == target) {
							return false;
						}
						return target.countDiscardableCards(player, "he");
					},
					[1, 2]
				)
				.set("ai", target => {
					let player = get.event().player,
						att = get.attitude(player, target),
						hs = target.countCards("h"),
						es = target.countCards("e");
					if ((hs && target.hasSkillTag("noh")) || (es && target.hasSkillTag("noe"))) {
						att *= 0.8;
					} else {
						att = -att;
					}
					if (ui.selected.targets.length) {
						let pre = ui.selected.targets[0],
							damage = get.event().damage;
						if (get.attitude(player, pre) < 0 && (damage ? get.damageEffect(pre, player, player) > 0 : true) && pre.countCards("he") >= 2) {
							return 0;
						}
						if (damage) {
							return att + get.damageEffect(target, player, player);
						}
					}
					return att;
				})
				.set("damage", player == _status.currentPhase)
				.set("complexTarget", true)
				.forResult();
		},
		locked: false,
		async content(event, trigger, player) {
			const targets = event.targets;
			for (const target of targets) {
				let num = targets.length > 1 ? 1 : 2;
				if (get.mode() !== "identity" || player.identity !== "nei") {
					player.addExpose(0.2);
				}
				for (let i = 0; i < num; i++) {
					if (!target.countDiscardableCards(player, "he")) {
						break;
					}
					const next = player.discardPlayerCard(target, "he");
					if (i > 0) {
						next.set("prompt", `旋风：是否继续弃置${get.translation(target)}一张牌？`);
					} else {
						next.set("forced", true);
					}
				}
			}
			if (player !== _status.currentPhase) {
				return;
			}
			const result = await player
				.chooseTarget("是否对一名目标角色造成1点伤害？", (card, player, target) => {
					return _status.event.targets.includes(target);
				})
				.set("targets", targets)
				.set("ai", target => {
					const player = get.event().player;
					return get.damageEffect(target, player, player);
				})
				.forResult();
			if (result.bool) {
				player.line(result.targets[0], "thunder");
				await result.targets[0].damage();
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (get.type(card) == "equip" && !get.cardtag(card, "gifts")) {
						return [1, 3];
					}
					if (get.tag(card, "damage") && target.hp > 2) {
						var num1 = target.countCards("h"),
							num2 = target.getHandcardLimit();
						if (num1 > num2) {
							return [1, 1];
						}
						if (num1 == num2) {
							return [1.1, _status.event.player == target ? 3 : 0.5];
						}
						if (num1 == num2 - 1) {
							return [0.1, _status.event.player == target ? 4.5 : 0.1];
						}
					}
					if (typeof card !== "object") {
						return;
					}
					if ((get.tag(card, "discard") || get.tag(card, "loseCard")) && target.countCards("h") > 0 && get.attitude(player, target) < 0) {
						return [1, -1];
					}
				},
			},
			reverseEquip: true,
			noe: true,
			threaten(player, target) {
				return target.countCards("e") + target.countCards("h") / 3;
			},
		},
	}
```

### yongjin 名字:勇进
描述: 限定技，出牌阶段，你可以依次移动场上的至多三张不同的装备牌。
```js
yongjin: {
		audio: 2,
		audioname: ["xin_lingtong"],
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
			});
		},
		async content(event, trigger, player) {
			// step 0
			player.awakenSkill(event.name);
			event.count = 3;
			event.cards = [];

			while (event.count > 0) {
				// step 1
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
						} else {
							return (
								target.countCards("e", function (card) {
									return !_status.event.cards.includes(card);
								}) > 0
							);
						}
					})
					.set("ai", function (target) {
						var player = _status.event.player;
						var att = get.attitude(player, target);
						var sgnatt = get.sgn(att);
						if (ui.selected.targets.length == 0) {
							if (target == player && player.hasSkill("decadexuanfeng")) {
								if (
									player.countCards("e", function (card) {
										return (
											!_status.event.cards.includes(card) &&
											game.hasPlayer(function (current) {
												return current != target && current.canEquip(card) && get.effect(current, card, player, player) < 0;
											})
										);
									}) > 0
								) {
									return 18;
								}
								return 7;
							} else if (att > 0) {
								if (
									target.countCards("e", function (card) {
										return (
											get.value(card, target) < 0 &&
											!_status.event.cards.includes(card) &&
											game.hasPlayer(function (current) {
												return current != target && current.canEquip(card) && get.effect(current, card, player, player) < 0;
											})
										);
									}) > 0
								) {
									return 9;
								}
							} else if (att < 0) {
								if (
									game.hasPlayer(function (current) {
										if (current != target && get.attitude(player, current) > 0) {
											var es = target.getCards("e", function (card) {
												return !_status.event.cards.includes(card);
											});
											for (var i = 0; i < es.length; i++) {
												if (get.value(es[i], target) > 0 && current.canEquip(es[i]) && get.effect(current, es[i], player, current) > 0) {
													return true;
												}
											}
										}
									})
								) {
									return -att;
								}
							}
							return 0;
						}
						var es = ui.selected.targets[0].getCards("e", function (card) {
							return !_status.event.cards.includes(card);
						});
						var i;
						var att2 = get.sgn(get.attitude(player, ui.selected.targets[0]));
						for (i = 0; i < es.length; i++) {
							if (ui.selected.targets[0] == player && player.hasSkill("decadexuanfeng")) {
								var bool = game.hasPlayer(function (current) {
									return get.attitude(player, current) < 0 && current.countDiscardableCards(player, "he") > 0 && get.damageEffect(current, player, player) > 0;
								});
								if (
									bool &&
									player.countCards("e", function (card) {
										return !_status.event.cards.includes(card) && target.canEquip(card) && get.effect(target, card, player, player) > 0;
									})
								) {
									return 2.5 * Math.abs(att);
								} else if (bool) {
									return 1 / Math.max(1, Math.abs(att));
								} else {
									return get.damageEffect(target, player, player);
								}
							}
							if (sgnatt != 0 && att2 != 0 && sgnatt != att2 && get.sgn(get.value(es[i], ui.selected.targets[0])) == -att2 && get.sgn(get.effect(target, es[i], player, target)) == sgnatt && target.canEquip(es[i])) {
								return Math.abs(att);
							}
						}
						if (i == es.length) {
							return 0;
						}
						return -att * get.attitude(player, ui.selected.targets[0]);
					})
					.set("multitarget", true)
					.set("cards", event.cards)
					.set("targetprompt", ["被移走", "移动目标"])
					.set("prompt", "移动场上的一张装备牌")
					.forResult();

				// step 2
				if (chooseTargetResult.bool) {
					player.line2(chooseTargetResult.targets, "green");
					event.targets = chooseTargetResult.targets;
				} else {
					break;
				}

				// step 3
				await game.delay();

				// step 4
				if (event.targets.length == 2) {
					const chooseCardResult = await player
						.choosePlayerCard(
							"e",
							true,
							function (button) {
								var player = _status.event.player;
								var targets0 = _status.event.targets0;
								var targets1 = _status.event.targets1;
								if (get.attitude(player, targets0) > 0 && get.attitude(player, targets1) < 0) {
									if (get.value(button.link, targets0) < 0 && get.effect(targets1, button.link, player, targets1) > 0) {
										return 10;
									}
									return 0;
								} else {
									return get.value(button.link) * get.effect(targets1, button.link, player, player);
								}
							},
							event.targets[0]
						)
						.set("nojudge", event.nojudge || false)
						.set("targets0", event.targets[0])
						.set("targets1", event.targets[1])
						.set("filterButton", function (button) {
							if (_status.event.cards.includes(button.link)) {
								return false;
							}
							var targets1 = _status.event.targets1;
							return targets1.canEquip(button.link);
						})
						.set("cards", event.cards)
						.forResult();

					// step 5
					if (chooseCardResult.bool && chooseCardResult.links.length) {
						var link = chooseCardResult.links[0];
						event.cards.add(link);
						await event.targets[1].equip(link);
						event.targets[0].$give(link, event.targets[1]);
						await game.delay();
					} else {
						break;
					}
				} else {
					break;
				}
				// step 6 handled by while loop condition
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
	}
```

## xin_liubiao 名字:界刘表 势力:qun

### decadezishou 名字:自守
描述: 摸牌阶段，你可以多摸X张牌（X为存活势力数）；然后本回合你对其他角色造成伤害时，防止此伤害。结束阶段，若你本回合没有使用牌指定其他角色为目标，你可以弃置任意张花色不同的手牌，然后摸等量的牌。
```js
decadezishou: {
		audio: 2,
		inherit: "rezishou",
		group: "decadezishou_zhiheng",
		ai: {
			threaten: 1.8,
		},
	}
```

### decadezongshi 名字:宗室
描述: 锁定技，你的手牌上限+X（X为存活势力数）。你的回合外，若你的手牌数大于等于手牌上限，则当你成为延时类锦囊牌或无颜色的牌的目标后，你令此牌对你无效。
```js
decadezongshi: {
		audio: 2,
		mod: {
			maxHandcard(player, num) {
				return num + game.countGroup();
			},
		},
		trigger: { target: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			return player != _status.currentPhase && player.countCards("h") >= player.getHandcardLimit() && (get.type(event.card) == "delay" || get.color(event.card) == "none");
		},
		async content(event, trigger, player) {
			trigger.excluded.add(player);
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (target != _status.currentPhase && target.countCards("h") >= target.getHandcardLimit() && (get.type(card) == "delay" || get.color(card) == "none")) {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

## re_caoxiu 名字:界曹休 势力:wei

### qianju
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### reqingxi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_sunxiu 名字:界孙休 势力:wu

### reyanzhu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rexingxue
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### zhaofu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_dengai 名字:界邓艾 势力:wei

### oltuntian 名字:屯田
描述: ①当你于回合外失去牌后，或于回合内因弃置而失去【杀】后，你可以判定。若判定结果不为♥，则你将此牌置于你的武将牌上，称为“田”。②你计算与其他角色的距离时-X（X为你武将牌上“田”的数目）。
```js
oltuntian: {
		inherit: "tuntian",
		filter(event, player) {
			if (player == _status.currentPhase) {
				if (event.type != "discard") {
					return false;
				}
				var evt = event.getl(player);
				return (
					evt &&
					evt.cards2 &&
					evt.cards2.filter(function (i) {
						return get.name(i, evt.hs.includes(i) ? player : false) == "sha";
					}).length > 0
				);
			}
			if (event.name == "gain" && event.player == player) {
				return false;
			}
			var evt = event.getl(player);
			return evt && evt.cards2 && evt.cards2.length > 0;
		},
	}
```

### olzaoxian 名字:凿险
描述: 觉醒技，准备阶段，若你武将牌上至少拥有三张“田”，则你减1点体力上限，并获得技能〖急袭〗。你于当前回合结束后进行一个额外的回合。
```js
olzaoxian: {
		inherit: "zaoxian",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			player.addSkills("jixi");
			player.insertPhase();
		},
		ai: {
			combo: "oltuntian",
		},
	}
```

## re_gongsunzan 名字:界公孙瓒 势力:qun

### reqiaomeng 名字:趫猛
描述: 当你使用【杀】对一名角色造成伤害后，你可以弃置该角色区域内的一张牌。若此牌为坐骑牌，则你于此弃置事件结算结束后获得此牌。
```js
reqiaomeng: {
		audio: "qiaomeng",
		trigger: { source: "damageSource" },
		direct: true,
		filter(event, player) {
			if (event._notrigger.includes(event.player)) {
				return false;
			}
			return event.card && event.card.name == "sha" && event.player.countDiscardableCards(player, "hej");
		},
		async content(event, trigger, player) {
			// step 0
			const result = await player.discardPlayerCard(get.prompt("reqiaomeng", trigger.player), "hej", trigger.player).set("logSkill", ["reqiaomeng", trigger.player]).forResult();

			// step 1
			if (result?.bool) {
				const card = result.cards[0];
				if (get.position(card) == "d") {
					const subtype = get.subtype(card);
					if (subtype == "equip3" || subtype == "equip4" || subtype == "equip6") {
						await player.gain(card, player, "gain2");
					}
				}
			}
		},
	}
```

### reyicong 名字:义从
描述: 锁定技，你计算与其他角色的距离时-1。若你的体力值不大于2，则其他角色计算与你的距离时+1。
```js
reyicong: {
		trigger: {
			player: ["changeHp"],
		},
		audio: 2,
		audioname2: { gongsunzan: "yicong" },
		forced: true,
		filter(event, player) {
			return get.sgn(player.hp - 2.5) != get.sgn(player.hp - 2.5 - event.num);
		},
		async content(event, trigger, player) {},
		mod: {
			globalFrom(from, to, current) {
				return current - 1;
			},
			globalTo(from, to, current) {
				if (to.hp <= 2) {
					return current + 1;
				}
			},
		},
		ai: {
			threaten: 0.8,
		},
	}
```

## re_manchong 名字:界满宠 势力:wei

### rejunxing 名字:峻刑
描述: 出牌阶段限一次，你可以弃置任意张手牌并选择一名其他角色。该角色选择一项：1.弃置X张牌并失去1点体力。2.翻面并摸X张牌。（X为你弃置的牌数）
```js
rejunxing: {
		enable: "phaseUse",
		audio: 2,
		usable: 1,
		filterCard: lib.filter.cardDiscardable,
		selectCard: [1, Infinity],
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		check(card) {
			if (ui.selected.cards.length) {
				return -1;
			}
			return 6 - get.value(card);
		},
		filterTarget(card, player, target) {
			return player != target;
		},
		allowChooseAll: true,
		async content(event, trigger, player) {
			const { target, cards } = event;
			// step 0
			const result = await target
				.chooseToDiscard(cards.length, "弃置" + get.cnNumber(cards.length) + "张牌并失去1点体力，或点取消将武将牌翻面并摸" + get.cnNumber(cards.length) + "张牌", "he")
				.set("ai", function (card) {
					const player = get.event().player;
					if (get.event().cardsx?.length > 3 || player.hasSkillTag("noturn") || player.isTurnedOver() || ((get.name(card) == "tao" || get.name(card) == "jiu") && lib.filter.cardSavable(card, player, player))) {
						return -1;
					}
					if (player.hp <= 1) {
						if (
							cards.length < player.getEnemies().length &&
							player.hasCard(cardx => {
								return (get.name(cardx) == "tao" || get.name(cardx) == "jiu") && lib.filter.cardSavable(cardx, player, player);
							}, "hs")
						) {
							return 7 - get.value(card);
						}
						return -1;
					}
					return 24 - 5 * cards.length - 2 * Math.min(4, player.hp) - get.value(card);
				})
				.set("cardsx", cards)
				.forResult();
			// step 1
			if (!result.bool) {
				await target.turnOver();
				await target.draw(cards.length);
			} else {
				await target.loseHp();
			}
		},
		ai: {
			order: 2,
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
	}
```

### yuce
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## xin_yufan 名字:界虞翻 势力:wu

### xinzhiyan 名字:直言
描述: 结束阶段开始时，你可令一名角色摸一张牌（正面朝上移动）。若此牌为基本牌，则你摸一张牌。若此牌为装备牌，则其回复1点体力并使用此装备牌。
```js
xinzhiyan: {
		audio: "zhiyan",
		audioname: ["re_yufan", "xin_yufan"],
		audioname2: { gexuan: "zhiyan_gexuan" },
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		async content(event, trigger, player) {
			let result = await player
				.chooseTarget(get.prompt("zhiyan"), "令一名角色摸一张牌并展示之。若为基本牌则你摸一张牌；若为装备牌，则其回复1点体力")
				.set("ai", function (target) {
					return get.attitude(_status.event.player, target) * (target.isDamaged() ? 2 : 1);
				})
				.forResult();
			if (!result.bool) {
				return;
			}

			var target = result.targets[0];
			player.logSkill("xinzhiyan", result.targets);
			var needRecover = false;
			result = await target.draw("visible").forResult();

			var card = result?.cards?.[0];
			if (get.type(card) == "basic") {
				player.draw();
			}

			if (get.type(card) == "equip") {
				if (target.getCards("h").includes(card) && target.hasUseTarget(card)) {
					target.chooseUseTarget(card, true, "nopopup");
					game.delay();
				}
				needRecover = true;
			}

			if (needRecover) {
				target.recover();
			}
		},
		ai: {
			expose: 0.2,
			threaten: 1.2,
		},
	}
```

### xinzongxuan 名字:纵玄
描述: 当你的牌因弃置而进入弃牌堆后，你可将其中的任意张牌置于牌堆顶。若剩余的牌中有锦囊牌，则你可以令一名其他角色获得其中的一张。
```js
xinzongxuan: {
		audio: 2,
		trigger: {
			player: "loseAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			if (event.type != "discard") {
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
		check(trigger, player) {
			if (trigger.getParent(3).name == "phaseDiscard") {
				return true;
			}
			if (
				!game.hasPlayer(function (current) {
					return current != player && get.attitude(player, current) > 0 && !current.hasSkillTag("nogain");
				})
			) {
				return false;
			}
			var cards = trigger.getl(player).cards2;
			for (var i = 0; i < cards.length; i++) {
				if (get.position(cards[i], true) == "d" && get.type2(cards[i], false) == "trick") {
					return true;
				}
			}
			return false;
		},
		async content(event, trigger, player) {
			const cards = [],
				cards2 = trigger.getl(player).cards2;
			cards.push(...cards2.filter(card => get.position(card, true) == "d"));
			const result = await player
				.chooseToMove("纵玄：将任意张牌置于牌堆顶（左边的牌更接近牌堆顶）", true, "allowChooseAll")
				.set("list", [["本次弃置的牌（请将要给出的锦囊牌留在这里）", cards], ["牌堆顶"]])
				.set("filterOk", function (moved) {
					if (moved[0].length == 1 && get.type2(moved[0][0], false) == "trick") {
						return true;
					}
					return moved[1].length > 0;
				})
				.set("processAI", function (list) {
					const cards = list[0][1].slice(0),
						player = _status.event.player;
					let result = [[], []];
					if (
						game.hasPlayer(function (current) {
							return current != player && get.attitude(player, current) > 0 && !current.hasSkillTag("nogain");
						})
					) {
						var max_val = 0;
						var max_card = false;
						for (var i of cards) {
							if (get.type2(i, false) == "trick") {
								var val = get.value(i, "raw");
								if (val > max_val) {
									max_card = i;
									max_val = val;
								}
							}
						}
						if (max_card) {
							result[0].push(max_card);
							cards.remove(max_card);
						}
					}
					if (cards.length) {
						var max_val = 0;
						var max_card = false;
						var equip = game.hasPlayer(function (current) {
							return current.isDamaged() && get.recoverEffect(current, player, player) > 0;
						});
						for (var i of cards) {
							var val = get.value(i);
							var type = get.type2(i, false);
							if (type == "basic") {
								val += 3;
							}
							if (type == "equip" && equip) {
								val += 9;
							}
							if (max_val == 0 || val > max_val) {
								max_card = i;
								max_val = val;
							}
						}
						if (max_card) {
							result[1].push(max_card);
							cards.remove(max_card);
						}
						result[0].addArray(cards);
					}
					return result;
				})
				.forResult();
			if (result.bool) {
				const cards = result.moved[1].slice(0);
				if (cards?.length) {
					cards.reverse();
					game.log(player, "将", cards, "置于牌堆顶");
					await game.cardsGotoPile(cards, "insert");
				}
				const list = result.moved[0].filter(function (i) {
					return get.type2(i, false) == "trick";
				});
				if (!list.length || !game.hasPlayer(current => current != player)) {
					return;
				}
				const result2 = await player
					.chooseButtonTarget({
						createDialog: ["纵玄：是否将一张锦囊牌交给一名其他角色？", list],
						filterButton: true,
						filterTarget: lib.filter.notMe,
						ai1(button) {
							if (_status.event.goon) {
								return Math.max(0.1, get.value(button.link, "raw"));
							}
							return 0;
						},
						forced: !result.moved[1].length,
						goon: game.hasPlayer(function (current) {
							return current != player && get.attitude(player, current) > 0 && !current.hasSkillTag("nogain");
						}),
						ai2(target) {
							const card = ui.selected.buttons[0].link,
								player = get.player();
							let eff = Math.max(0.1, get.value(card, target)) * get.attitude(player, target);
							if (target.hasSkill("nogain")) {
								eff /= 10;
							}
							return eff;
						},
					})
					.forResult();
				if (result2.bool && result2.links?.length && result2.targets?.length) {
					const {
						links: cards,
						targets: [target],
					} = result2;
					player.line(target, "green");
					await target.gain(cards, "gain2");
				}
			}
		},
	}
```

## dc_bulianshi 名字:界步练师 势力:wu

### dcanxu 名字:安恤
描述: 出牌阶段限一次，你可以选择两名手牌数不同的其他角色，令其中手牌少的角色获得手牌多的角色的一张手牌并展示之。然后若此牌不为黑桃，则你摸一张牌；若这两名角色手牌数相等，则你回复1点体力。
```js
dcanxu: {
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
	}
```

### dczhuiyi 名字:追忆
描述: 当你死亡时，你可以令一名不为击杀者的其他角色摸X张牌（X为存活角色数），然后其回复1点体力。
```js
dczhuiyi: {
		audio: 2,
		trigger: { player: "die" },
		skillAnimation: true,
		animationColor: "wood",
		forceDie: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("dczhuiyi"), function (card, player, target) {
					return player != target && _status.event.sourcex != target;
				})
				.set("forceDie", true)
				.set("ai", function (target) {
					var num = get.attitude(_status.event.player, target);
					if (num > 0) {
						if (target.hp == 1) {
							num += 2;
						}
						if (target.hp < target.maxHp) {
							num += 2;
						}
					}
					return num;
				})
				.set("sourcex", trigger.source)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await target.recover();
			await target.draw(game.countPlayer());
		},
		ai: {
			expose: 0.5,
		},
	}
```

## re_hanhaoshihuan 名字:界韩浩史涣 势力:wei

### reshenduan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### reyonglve
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_panzhangmazhong 名字:界潘璋马忠 势力:wu

### reduodao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### reanjian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_wangyi 名字:界王异 势力:wei

### zhenlie
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### miji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_madai 名字:界马岱 势力:shu

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### reqianxi 名字:潜袭
描述: 准备阶段开始时，你可摸一张牌，然后弃置一张牌并选择一名距离为1的其他角色。该角色于本回合内：{不能使用或打出与此牌颜色相同的手牌，且其装备区内与此牌颜色相同的防具牌无效，且当其回复体力时，你摸两张牌。}
```js
reqianxi: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		frequent: true,
		async content(event, trigger, player) {
			let result;
			await player.draw();
			if (
				player.hasCard(card => {
					return lib.filter.cardDiscardable(card, player, "reqianxi");
				}, "he")
			) {
				result = await player
					.chooseToDiscard("he", true)
					.set("ai", card => {
						let player = get.event().player;
						if (get.color(card, player)) {
							return 7 - get.value(card, player);
						}
						return 4 - get.value(card, player);
					})
					.forResult();
			} else {
				return;
			}
			if (result.bool && game.hasPlayer(current => current != player && get.distance(player, current) <= 1)) {
				var selectedColor = get.color(result.cards[0], player);
				var color = get.translation(selectedColor);
				result = await player
					.chooseTarget(true, "选择【潜袭】的目标", "令其本回合不能使用或打出" + color + "牌，且" + color + "防具失效，且回复体力时，你摸两张牌", function (card, player, target) {
						return target != player && get.distance(player, target) <= 1;
					})
					.set("ai", function (target) {
						return -get.attitude(_status.event.player, target) * Math.sqrt(1 + target.countCards("he"));
					})
					.forResult();
			} else {
				return;
			}
			if (result.bool) {
				var target = result.targets[0];
				player.line(target, "green");
				target.storage.reqianxi_effect = [selectedColor, player];
				target.addTempSkill("reqianxi_effect");
				target.markSkill("reqianxi_effect");
			}
		},
		subSkill: {
			effect: {
				mark: true,
				intro: {
					markcount: () => 0,
					content(storage, player) {
						var color = get.translation(storage[0]),
							source = get.translation(storage[1]);
						return "本回合不能使用或打出" + color + "牌，且" + color + "防具失效，且回复体力时，" + source + "摸两张牌";
					},
				},
				charlotte: true,
				onremove: true,
				mod: {
					cardEnabled2(card, player) {
						if (get.itemtype(card) == "card" && get.color(card) == player.getStorage("reqianxi_effect")[0]) {
							return false;
						}
					},
				},
				trigger: { player: "recoverEnd" },
				forced: true,
				popup: false,
				filter(event, player) {
					return player.storage.reqianxi_effect && player.storage.reqianxi_effect[1].isIn();
				},
				async content(event, trigger, player) {
					const target = player.storage.reqianxi_effect[1];
					target.logSkill("reqianxi", player);
					await target.draw(2);
				},
				ai: {
					unequip2: true,
					skillTagFilter(player) {
						var evt = _status.event,
							color = player.getStorage("reqianxi_effect")[0];
						if (evt.name == "lose" && evt.loseEquip) {
							var card = evt.cards[evt.num];
							if (card && get.subtype(card, false) == "equip2" && get.color(card) == color) {
								return true;
							}
							return false;
						} else {
							var equip = player.getEquip(2);
							if (equip && get.color(equip) == color) {
								return true;
							}
							return false;
						}
					},
				},
			},
		},
	}
```

## xin_xusheng 名字:界徐盛 势力:wu

### decadepojun 名字:破军
描述: 当你使用【杀】指定目标后，你可以将其的至多X张牌置于其武将牌上（X为其体力值）。若这些牌中：有装备牌，你将这些装备牌中的一张置于弃牌堆；有锦囊牌，你摸一张牌。其于回合结束时获得其武将牌上的这些牌。
```js
decadepojun: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		direct: true,
		filter(event, player) {
			return event.card.name == "sha" && event.target.hp > 0 && event.target.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			// step 0
			const next = player.choosePlayerCard(trigger.target, "he", [1, Math.min(trigger.target.hp, trigger.target.countCards("he"))], get.prompt("decadepojun", trigger.target), "allowChooseAll");
			next.set("ai", function (button) {
				if (!_status.event.goon) {
					return 0;
				}
				const val = get.value(button.link);
				if (button.link == _status.event.target.getEquip(2)) {
					return 2 * (val + 3);
				}
				return val;
			});
			next.set("goon", get.attitude(player, trigger.target) <= 0);
			next.set("forceAuto", true);
			const result = await next.forResult();
			// step 1
			if (result.bool) {
				event.cards = result.cards;
				const target = trigger.target;
				player.logSkill("decadepojun", trigger.target);
				target.addSkill("decadepojun2");
				const next = target.addToExpansion(result.cards, "giveAuto", target);
				next.gaintag.add("decadepojun2");
				await next;
			} else {
				return;
			}
			// step 2
			let discard = false,
				draw = false;
			for (const i of event.cards) {
				const type = get.type2(i);
				if (type == "equip") {
					discard = true;
				}
				if (type == "trick") {
					draw = true;
				}
			}
			let result2;
			if (discard) {
				event.equip = true;
				result2 = await player
					.chooseButton(
						[
							"选择一张牌置入弃牌堆",
							event.cards.filter(function (card) {
								return get.type(card) == "equip";
							}),
						],
						true
					)
					.set("ai", function (button) {
						return get.value(button.link, _status.event.getTrigger().target);
					})
					.forResult();
			}
			if (draw) {
				event.draw = true;
			}
			// step 3
			if (event.equip && result2 && result2.links && result2.links.length) {
				await trigger.target.loseToDiscardpile(result2.links);
			}
			if (event.draw) {
				await player.draw();
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
				if (arg && arg.name == "sha" && arg.target.getEquip(2)) {
					return true;
				}
				return false;
			},
		},
	}
```

## re_taishici 名字:界太史慈 势力:wu

### tianyi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### hanzhan 名字:酣战
描述: ①当你发起拼点时，或成为拼点的目标时，你可以令对方选择拼点牌的方式改为随机选择一张手牌。②当你拼点结束后，你可以获得本次拼点的拼点牌中点数最大的【杀】。
```js
hanzhan: {
		audio: 2,
		trigger: {
			global: "chooseToCompareBegin",
		},
		filter(event, player) {
			if (player == event.player) {
				return true;
			}
			if (event.targets) {
				return event.targets.includes(player);
			}
			return player == event.target;
		},
		logTarget(event, player) {
			if (player != event.player) {
				return event.player;
			}
			return event.targets || event.target;
		},
		prompt2(event, player) {
			return "令其改为使用随机的手牌进行拼点";
		},
		check(trigger, player) {
			var num = 0;
			var targets = player == trigger.player ? (trigger.targets ? trigger.targets.slice(0) : [trigger.target]) : [trigger.player];
			while (targets.length) {
				var target = targets.shift();
				if (target.getCards("h").length > 1) {
					num -= get.attitude(player, target);
				}
			}
			return num > 0;
		},
		async content(event, trigger, player) {
			const targets = player == trigger.player ? (trigger.targets ? trigger.targets.slice(0) : [trigger.target]) : [trigger.player];
			if (!trigger.fixedResult) {
				trigger.fixedResult = {};
			}
			for (const target of targets) {
				const hs = target.getCards("h");
				if (hs.length) {
					trigger.fixedResult[target.playerid] = hs.randomGet();
				}
			}
		},
		group: "hanzhan_gain",
		subfrequent: ["gain"],
	}
```

## re_masu 名字:界马谡 势力:shu

### resanyao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rezhiman
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_sunluban 名字:界孙鲁班 势力:wu

### rechanhui
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rejiaojin
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## xin_handang 名字:界韩当 势力:wu

### xingongji 名字:弓骑
描述: 出牌阶段限一次，你可以弃置一张牌，然后你的攻击范围视为无限且使用与此牌花色相同的【杀】无次数限制直到回合结束。若你以此法弃置的牌为装备牌，则你可以弃置一名其他角色的一张牌。
```js
xingongji: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		position: "he",
		filterCard: true,
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		check(card) {
			var base = 0,
				player = _status.event.player,
				suit = get.suit(card, player),
				added = false,
				added2 = false,
				added3;
			if (
				get.type(card) == "equip" &&
				game.hasPlayer(function (target) {
					var att = get.attitude(player, target);
					if (att >= 0) {
						return 0;
					}
					if (
						target.countCards("he", function (card) {
							return get.value(card) > 5;
						})
					) {
						return -att;
					}
				})
			) {
				base += 6;
			}
			var hs = player.getCards("h");
			var muniu = player.getEquip("muniu");
			if (muniu && card != muniu && muniu.cards) {
				hs = hs.concat(muniu.cards);
			}
			for (var i of hs) {
				if (i != card && get.name(i) == "sha") {
					if (get.suit(i, player) == suit) {
						if (player.hasValueTarget(i, false)) {
							added3 = true;
							base += 5.5;
						}
					} else {
						if (player.hasValueTarget(i, false)) {
							added2 = true;
						}
						if (!added && !player.hasValueTarget(i, null, true) && player.hasValueTarget(i, false, true)) {
							base += 4;
							added = true;
						}
					}
				}
			}
			if (added3 && !added2) {
				base -= 4.5;
			}
			return base - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards } = event;
			if (!player.storage.xingongji2) {
				player.storage.xingongji2 = [];
			}
			player.storage.xingongji2.add(get.suit(cards[0], player));
			player.addTempSkill("xingongji2");
			if (get.type(cards[0], null, cards[0].original == "h" ? player : false) == "equip") {
				const targetResult = await player
					.chooseTarget("是否弃置一名角色的一张牌？", function (card, player, target) {
						return player != target && target.countCards("he") > 0;
					})
					.set("ai", function (target) {
						var att = get.attitude(player, target);
						if (att >= 0) {
							return 0;
						}
						if (
							target.countCards("he", function (card) {
								return get.value(card) > 5;
							})
						) {
							return -att;
						}
						return -att * 0.8;
					})
					.forResult();
				if (targetResult.bool) {
					player.line(targetResult.targets, "green");
					player.discardPlayerCard(targetResult.targets[0], "he", true);
				}
			}
		},
		ai: {
			order: 4.5,
			result: {
				player: 1,
			},
		},
	}
```

### xinjiefan 名字:解烦
描述: 限定技，出牌阶段，你可以选择一名角色，令攻击范围内含有该角色的所有角色依次选择一项：1.弃置一张武器牌；2.令其摸一张牌。然后若游戏轮数为1，则你于此回合结束时恢复此技能。
```js
xinjiefan: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		limited: true,
		enable: "phaseUse",
		filterTarget: true,
		async content(event, trigger, player) {
			const { target } = event;
			let result;

			// step 0
			player.awakenSkill(event.name);
			event.players = game.filterPlayer(function (current) {
				return current != target && current.inRange(target);
			});
			event.players.sortBySeat();

			// step 1
			while (event.players.length) {
				event.current = event.players.shift();
				event.current.addTempClass("target");
				player.line(event.current, "green");
				if (event.current.countCards("he") && target.isIn()) {
					result = await event.current
						.chooseToDiscard({ subtype: "equip1" }, "he", "弃置一张武器牌或让" + get.translation(target) + "摸一张牌")
						.set("ai", function (card) {
							if (get.attitude(_status.event.player, _status.event.target) < 0) {
								return 7 - get.value(card);
							}
							return -1;
						})
						.set("target", target)
						.forResult();
					event.tempbool = false;
				} else {
					event.tempbool = true;
				}

				// step 2
				if (event.tempbool || result.bool == false) {
					await target.draw();
				}
			}

			if (game.roundNumber <= 1) {
				player.addTempSkill("xinjiefan2");
			}
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					if (player.hp > 2 && game.roundNumber > 1) {
						if (game.phaseNumber < game.players.length * 2) {
							return 0;
						}
					}
					var num = 0,
						players = game.filterPlayer();
					for (var i = 0; i < players.length; i++) {
						if (players[i] != target && players[i].inRange(target)) {
							num++;
						}
					}
					return num;
				},
			},
		},
	}
```

## yujin_yujin 名字:界于禁 势力:wei

### decadezhenjun 名字:镇军
描述: 准备阶段或结束阶段，你可以弃置一名角色X张牌（X为其手牌数减体力值且至少为1），若其中没有装备牌，你选择一项：1.你弃一张牌；2.该角色摸等量的牌。
```js
decadezhenjun: {
		audio: 2,
		trigger: {
			player: ["phaseZhunbeiBegin", "phaseJieshuBegin"],
		},
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.countDiscardableCards(player, "he") > 0;
			});
		},
		direct: true,
		async content(event, trigger, player) {
			const chooseResult = await player
				.chooseTarget(get.prompt2("decadezhenjun"), function (card, player, target) {
					return target.countDiscardableCards(player, "he") > 0;
				})
				.set("ai", function (target) {
					const player = get.player();
					return -get.attitude(player, target) * (target.countDiscardableCards(player, "e") + 1);
				})
				.forResult();
			if (!chooseResult.bool) return;
			const target = chooseResult.targets[0];
			const num = Math.min(Math.max(target.countCards("h") - target.hp, 1), target.countDiscardableCards(player, "he"));
			player.logSkill("decadezhenjun", target);
			const discardResult = await player.discardPlayerCard(num, target, true, "allowChooseAll").forResult();
			if (discardResult.cards && discardResult.cards.length) {
				for (let i = 0; i < discardResult.cards.length; i++) {
					if (get.type(discardResult.cards[i]) == "equip") {
						return;
					}
				}
				const cardNum = discardResult.cards.length;
				if (cardNum > 0) {
					const prompt = "弃置一张牌，或令" + get.translation(target) + "摸" + get.cnNumber(cardNum) + "张牌";
					const result = await player
						.chooseToDiscard(prompt, "he")
						.set("ai", function (card) {
							return 7 - get.value(card);
						})
						.forResult();
					if (!result.bool) {
						target.draw(cardNum);
					}
				}
			}
		},
	}
```

## re_caozhang 名字:界曹彰 势力:wei

### xinjiangchi 名字:将驰
描述: 出牌阶段开始时，你可选择：①摸一张牌。②摸两张牌，然后本回合内不能使用或打出【杀】。③弃置一张牌，然后本回合内可以多使用一张【杀】，且使用【杀】无距离限制。
```js
xinjiangchi: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		direct: true,
		async content(event, trigger, player) {
			const list = ["摸一张牌", "摸两张牌，本回合内不能使用或打出【杀】"];
			if (
				player.countCards("he", function (card) {
					return lib.filter.cardDiscardable(card, player, "xinjiangchi") > 0;
				}) > 0
			) {
				list.push("弃置一张牌，本回合可以多使用一张【杀】且无距离限制");
			}
			const result = await player
				.chooseControl("cancel2")
				.set("prompt", get.prompt("xinjiangchi"))
				.set("choiceList", list)
				.set("ai", function () {
					var player = _status.event.player;
					if (
						!player.countCards("hs", function (card) {
							return get.name(card) == "sha" && player.hasValueTarget(card, false);
						})
					) {
						return 1;
					}
					return 0;
				})
				.forResult();
			if (result.control != "cancel2") {
				player.logSkill("xinjiangchi");
				switch (result.index) {
					case 0: {
						player.draw();
						break;
					}
					case 1: {
						await player.draw(2);
						player.addTempSkill("xinjiangchi_less");
						break;
					}
					case 2: {
						await player.chooseToDiscard("he", true);
						player.addTempSkill("xinjiangchi_more");
						break;
					}
				}
			}
		},
		subSkill: {
			less: {
				mod: {
					cardEnabled(card) {
						if (card.name == "sha") {
							return false;
						}
					},
					cardRespondable(card) {
						if (card.name == "sha") {
							return false;
						}
					},
				},
				charlotte: true,
			},
			more: {
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
				charlotte: true,
			},
		},
	}
```

## re_chengpu 名字:界程普 势力:wu

### ollihuo 名字:疠火
描述: 你使用普通的【杀】可以改为火【杀】，若此【杀】造成过伤害，你失去1点体力；你使用火【杀】可以多选择一个目标。你每回合使用的第一张牌如果是【杀】，则此【杀】结算完毕后可置于你的武将牌上。
```js
ollihuo: {
		mod: {
			aiOrder(player, card, num) {
				if (card.name == "sha" && !player.getHistory("useCard").length) {
					return num + 7;
				}
			},
		},
		trigger: { player: "useCard1" },
		filter(event, player) {
			if (event.card.name == "sha" && !game.hasNature(event.card)) {
				return true;
			}
			return false;
		},
		audio: "lihuo",
		locked: false,
		prompt2(event) {
			return "将" + get.translation(event.card) + "改为火属性";
		},
		audioname: ["re_chengpu"],
		check(event, player) {
			return (
				(event.baseDamage > 1 || player.getHistory("useCard").indexOf(event) == 0) &&
				(player.hp > 1 || player.getExpansions("rechunlao").length) &&
				game.hasPlayer(function (current) {
					return !event.targets.includes(current) && player.canUse(event.card, current) && get.attitude(player, current) < 0 && !current.hasShan() && get.effect(current, { name: "sha", nature: "fire" }, player, player) > 0;
				})
			);
		},
		async content(event, trigger, player) {
			game.setNature(trigger.card, "fire");
			trigger.lihuo_changed = true;
		},
		group: ["ollihuo2", "ollihuo3", "ollihuo4"],
		ai: {
			fireAttack: true,
		},
	}
```

### rechunlao 名字:醇醪
描述: 出牌阶段结束时，若你没有“醇”，你可以将至少一张【杀】置于你的武将牌上，称为“醇”。当一名角色处于濒死状态时，你可以移去一张“醇”，视为该角色使用一张【酒】，然后若此“醇”的属性为：火，你回复1点体力、雷，你摸两张牌。
```js
rechunlao: {
		trigger: { player: "phaseUseEnd" },
		audio: 2,
		filter(event, player) {
			return player.countCards("h") > 0 && (_status.connectMode || player.countCards("h", "sha") > 0) && !player.hasExpansions("rechunlao");
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
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					selectCard: [1, Math.max(1, player.countCards("h", "sha"))],
					prompt: get.prompt(event.skill),
					prompt2: '将任意张【杀】置于武将牌上作为"醇"',
					filterCard(card) {
						return get.name(card) == "sha";
					},
					allowChooseAll: true,
				})
				.set("ai", function () {
					return 1;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			await player.addToExpansion({ cards, animate: "giveAuto", gaintag: [event.name] });
		},
		ai: {
			threaten: 1.4,
		},
		group: "rechunlao2",
	}
```

## re_quancong 名字:界全琮 势力:wu

### xinyaoming
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_liaohua 名字:界廖化 势力:shu

### xindangxian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### xinfuli
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_guohuai 名字:界郭淮 势力:wei

### decadejingce 名字:精策
描述: 结束阶段，若你本回合使用过的牌数不小于你的体力值，则你可执行一个摸牌阶段或出牌阶段；若这些牌包含的花色数也不小于你的体力值，则你将“或”改为“和”。
```js
decadejingce: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		filter(event, player) {
			return player.getHistory("useCard").length >= player.hp;
		},
		async content(event, trigger, player) {
			const list = [],
				history = player.getHistory("useCard");
			for (const i of history) {
				let suit = get.suit(i.card);
				if (lib.suit.includes(suit)) {
					list.add(suit);
				}
				if (list.length >= player.hp) {
					break;
				}
			}
			let result;
			let goon = false;
			if (list.length >= player.hp) {
				goon = true;
			} else {
				result = await player.chooseControl("摸牌阶段", "出牌阶段").set("prompt", "精策：选择要执行的额外阶段").forResult();
			}
			//插入阶段，后来的先插
			const evt = trigger.getParent("phase", true, true);
			if (goon || (result && result.index == 1)) {
				if (evt?.phaseList) {
					evt.phaseList.splice(evt.num + 1, 0, `phaseUse|${event.name}`);
				}
			}
			if (goon || (result && result.index == 0)) {
				if (evt?.phaseList) {
					evt.phaseList.splice(evt.num + 1, 0, `phaseDraw|${event.name}`);
				}
			}
		},
	}
```

## re_wuyi 名字:界吴懿 势力:shu

### xinbenxi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_zhuran 名字:界朱然 势力:wu

### xindanshou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_pangtong 名字:界庞统 势力:shu

### ollianhuan 名字:连环
描述: 你可以将一张♣牌当【铁索连环】使用或重铸。你使用【铁索连环】选择目标后，可以给此牌增加一个目标。
```js
ollianhuan: {
		audio: "xinlianhuan",
		audioname: ["ol_pangtong"],
		hiddenCard: (player, name) => {
			return name == "tiesuo" && player.hasCard(card => get.suit(card) == "club", "she");
		},
		filter(event, player) {
			if (!player.hasCard(card => get.suit(card) == "club", "she")) {
				return false;
			}
			return event.type == "phase" || event.filterCard({ name: "tiesuo" }, player, event);
		},
		position: "hes",
		inherit: "lianhuan",
		group: "ollianhuan_add",
		subSkill: {
			add: {
				audio: "xinlianhuan",
				audioname: ["ol_pangtong"],
				trigger: { player: "useCard2" },
				filter(event, player) {
					if (event.card.name != "tiesuo") {
						return false;
					}
					var info = get.info(event.card);
					if (info.allowMultiple == false) {
						return false;
					}
					if (event.targets && !info.multitarget) {
						if (
							game.hasPlayer(current => {
								return !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, player, current);
							})
						) {
							return true;
						}
					}
					return false;
				},
				charlotte: true,
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const result = await player
						.chooseTarget({
							prompt: get.prompt("ollianhuan"),
							filterTarget(card, player, target) {
								const event = get.event();
								return !event.sourcex.includes(target) && lib.filter.targetEnabled2(event.card, player, target);
							},
						})
						.set("prompt2", `为${get.translation(trigger.card)}额外指定一个目标`)
						.set("sourcex", trigger.targets)
						.set("ai", function (target) {
							var player = _status.event.player;
							return get.effect(target, _status.event.card, player, player);
						})
						.set("card", trigger.card)
						.forResult();
					if (result?.bool && result.targets) {
						if (!event.isMine() && !event.isOnline()) {
							await game.delayex();
						}
						const targets = result.targets;
						player.logSkill("ollianhuan_add", targets);
						trigger.targets.addArray(targets);
						game.log(targets, "也成为了", trigger.card, "的目标");
					}
				},
			},
		},
	}
```

### olniepan 名字:涅槃
描述: 限定技，当你处于濒死状态时，你可以弃置你区域内的所有牌并复原你的武将牌，然后摸三张牌并将体力回复至3点。然后你选择获得以下技能中的一个：〖八阵〗/〖火计〗/〖看破〗。
```js
olniepan: {
		audio: 2,
		enable: "chooseToUse",
		skillAnimation: true,
		limited: true,
		animationColor: "orange",
		filter(event, player) {
			if (event.type == "dying") {
				if (player != event.dying) {
					return false;
				}
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			// step 0
			player.awakenSkill(event.name);
			player.storage.olniepan = true;
			await player.discard(player.getCards("hej"));
			// step 1
			await player.link(false);
			// step 2
			await player.turnOver(false);
			// step 3
			await player.draw(3);
			// step 4
			if (player.hp < 3) {
				await player.recover(3 - player.hp);
			}
			// step 5
			const result = await player
				.chooseControl("bazhen", "olhuoji", "olkanpo")
				.set("prompt", "选择获得一个技能")
				.set("ai", () => {
					let player = get.event().player,
						threaten = get.threaten(player);
					if (!player.hasEmptySlot(2)) {
						return "olhuoji";
					}
					if (threaten < 0.8) {
						return "olkanpo";
					}
					if (threaten < 1.6) {
						return "bazhen";
					}
					return ["olhuoji", "bazhen"].randomGet();
				})
				.forResult();
			// step 6
			player.addSkills(result.control);
		},
		derivation: ["bazhen", "olhuoji", "olkanpo"],
		ai: {
			order: 1,
			skillTagFilter(player, tag, target) {
				if (player != target || player.storage.olniepan) {
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
			threaten(player, target) {
				if (!target.storage.olniepan) {
					return 0.6;
				}
			},
		},
	}
```

## re_zhangyi 名字:界张嶷 势力:shu

### rewurong 名字:怃戎
描述: 出牌阶段限一次，你可以令一名其他角色与你同时展示一张手牌：若你展示的是【杀】且该角色展示的不是【闪】，则你对其造成1点伤害；若你展示的不是【杀】且该角色展示的是【闪】，则你获得其一张牌。
```js
rewurong: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const { target } = event;

			// step 0
			if (target.countCards("h") == 0 || player.countCards("h") == 0) {
				return;
			}

			// step 1
			const sendback = function () {
				if (_status.event != event) {
					return function () {
						event.resultOL = _status.event.resultOL;
					};
				}
			};

			if (player.isOnline()) {
				player.wait(sendback);
				event.ol = true;
				player.send(function () {
					game.me.chooseCard(true).set("glow_result", true).ai = function () {
						return Math.random();
					};
					game.resume();
				});
			} else {
				event.localPlayer = true;
				const hasShan = !target.countCards("h", "shan");
				player.chooseCard(true).set("glow_result", true).ai = function (card) {
					if (hasShan && get.name(card) == "sha") {
						return 1;
					}
					return Math.random();
				};
			}

			if (target.isOnline()) {
				target.wait(sendback);
				event.ol = true;
				target.send(function () {
					const rand = Math.random() < 0.4;
					game.me
						.chooseCard(true)
						.set("glow_result", true)
						.set("ai", function (card) {
							if (rand) {
								return card.name == "shan" ? 1 : 0;
							}
							return card.name == "shan" ? 0 : 1;
						});
					game.resume();
				});
			} else {
				event.localTarget = true;
			}

			// step 2
			let result;
			if (event.localPlayer) {
				result = await player
					.chooseCard(true)
					.set("glow_result", true)
					.set("ai", function (card) {
						if (!target.countCards("h", "shan") && get.name(card) == "sha") {
							return 1;
						}
						return Math.random();
					})
					.forResult();
				event.card1 = result.cards[0];
			}

			if (event.localTarget) {
				const rand = Math.random() < 0.4;
				result = await target
					.chooseCard(true)
					.set("glow_result", true)
					.set("ai", function (card) {
						if (rand) {
							return card.name == "shan" ? 1 : 0;
						}
						return card.name == "shan" ? 0 : 1;
					})
					.forResult();
				event.card2 = result.cards[0];
			}

			// step 3
			if (!event.resultOL && event.ol) {
				game.pause();
			}

			// step 4
			try {
				if (!event.card1) {
					event.card1 = event.resultOL[player.playerid].cards[0];
				}
				if (!event.card2) {
					event.card2 = event.resultOL[target.playerid].cards[0];
				}
				if (!event.card1 || !event.card2) {
					throw new Error("err");
				}
			} catch (e) {
				console.log(e);
				return;
			}

			game.broadcastAll(
				function (card1, card2) {
					card1.classList.remove("glow");
					card2.classList.remove("glow");
				},
				event.card1,
				event.card2
			);

			// step 5
			game.broadcastAll(function () {
				ui.arena.classList.add("thrownhighlight");
			});
			game.addVideo("thrownhighlight1");
			player.$compare(event.card1, target, event.card2);
			game.delay(4);

			// step 6
			let next = game.createEvent("showCards");
			next.player = player;
			next.cards = [event.card1];
			next.setContent("emptyEvent");
			game.log(player, "展示了", event.card1);

			// step 7
			next = game.createEvent("showCards");
			next.player = target;
			next.cards = [event.card2];
			next.setContent("emptyEvent");
			game.log(target, "展示了", event.card2);

			// step 8
			const name1 = get.name(event.card1);
			const name2 = get.name(event.card2);

			if (name1 == "sha" && name2 != "shan") {
				target.$gain2(event.card2);
				const clone = event.card1.clone;
				if (clone) {
					clone.style.transition = "all 0.5s";
					clone.style.transform = "scale(1.2)";
					clone.delete();
					game.addVideo("deletenode", player, get.cardsInfo([clone]));
				}
				game.broadcast(function (card) {
					const clone = card.clone;
					if (clone) {
						clone.style.transition = "all 0.5s";
						clone.style.transform = "scale(1.2)";
						clone.delete();
					}
				}, event.card1);
				await target.damage("nocard");
			} else if (name1 != "sha" && name2 == "shan") {
				target.$gain2(event.card2);
				const clone = event.card1.clone;
				if (clone) {
					clone.style.transition = "all 0.5s";
					clone.style.transform = "scale(1.2)";
					clone.delete();
					game.addVideo("deletenode", player, get.cardsInfo([clone]));
				}
				game.broadcast(function (card) {
					const clone = card.clone;
					if (clone) {
						clone.style.transition = "all 0.5s";
						clone.style.transform = "scale(1.2)";
						clone.delete();
					}
				}, event.card1);
				await player.gainPlayerCard(target, true, "he");
			} else {
				player.$gain2(event.card1);
				target.$gain2(event.card2);
			}

			game.broadcastAll(function () {
				ui.arena.classList.remove("thrownhighlight");
			});
			game.addVideo("thrownhighlight2");
		},
		ai: {
			order: 6,
			result: {
				target: -1,
			},
		},
	}
```

### reshizhi 名字:矢志
描述: 锁定技，若你的体力值为1，则你的【闪】视为【杀】，且当你使用对应的实体牌为一张【闪】的非转化普通【杀】造成伤害后，你回复1点体力。
```js
reshizhi: {
		audio: 2,
		mod: {
			cardname(card, player) {
				if (card.name == "shan" && player.hp == 1) {
					return "sha";
				}
			},
		},
		trigger: { source: "damageEnd" },
		forced: true,
		filter(event, player) {
			return event.card && event.card.name == "sha" && player.hp == 1 && event.cards && event.cards.length == 1 && event.cards[0].name == "shan";
		},
		async content(event, trigger, player) {
			await player.recover();
		},
		ai: {
			halfneg: true,
		},
	}
```

## xin_wuguotai 名字:界吴国太 势力:wu

### xinganlu 名字:甘露
描述: 出牌阶段限一次。你可以令两名角色交换装备区内的牌，然后若这两名角色装备区内牌数差的绝对值大于你已损失的体力值，则你弃置两张手牌。
```js
xinganlu: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		selectTarget: 2,
		delay: 0,
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
			return true;
		},
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			const targets = event.targets;

			// step 0
			await targets[0].swapEquip(targets[1]).forResult();

			// step 1
			await game.delayex().forResult();
			var num = Math.abs(targets[0].countCards("e") - targets[1].countCards("e"));
			if (num > player.getDamagedHp()) {
				await player.chooseToDiscard("h", 2, true).forResult();
			}
		},
		ai: {
			order: 10,
			expose: 0.2,
			threaten(player, target) {
				return 0.8 * Math.max(1 + target.maxHp - target.hp);
			},
			result: {
				target(player, target) {
					if (!ui.selected.targets.length) {
						return -get.value(target.getCards("e"), target);
					}
					var target2 = ui.selected.targets[0];
					var eff_target = get.value(target2.getCards("e"), target) - get.value(target.getCards("e"), target);
					if (get.sgn(eff_target) == get.sgn(-get.value(target2.getCards("e"), target2))) {
						return 0;
					}
					return eff_target;
				},
			},
		},
	}
```

### xinbuyi 名字:补益
描述: 一名角色进入濒死状态时，你可展示其一张手牌。若此牌不为基本牌，则其弃置此牌并回复1点体力。若其以此法弃置的牌移动前为其的唯一一张手牌，则其摸一张牌。
```js
xinbuyi: {
		audio: 2,
		trigger: { global: "dying" },
		filter(event, player) {
			return event.player.countCards("h") > 0;
		},
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		async content(event, trigger, player) {
			let result;
			if (player == trigger.player) {
				result = await player
					.chooseCard("h", true)
					.set("ai", function (card) {
						if (get.type(card) != "basic") {
							return 100 - get.value(card);
						}
						return 0;
					})
					.forResult();
			} else {
				result = await player.choosePlayerCard("h", trigger.player, true).forResult();
			}
			var card = result.cards[0],
				target = trigger.player;
			player.showCards(card, get.translation(player) + "对" + (player == target ? "自己" : get.translation(target)) + "发动了【补益】");
			if (get.type(card, null, target) != "basic") {
				target.discard(card);
				target.recover();
				if (target.countCards("h") == 1) {
					target.draw();
				}
			}
		},
		logTarget: "player",
	}
```

## re_caocao 名字:界曹操 势力:wei

### new_rejianxiong 名字:奸雄
描述: 当你受到伤害后，你可以获得对你造成伤害的牌并摸一张牌。
```js
new_rejianxiong: {
		audio: "rejianxiong",
		audioname: ["shen_caopi", "mb_caocao"],
		audioname2: { caoying: "lingren_jianxiong" },
		trigger: { player: "damageEnd" },
		async content(event, trigger, player) {
			if (get.itemtype(trigger.cards) == "cards" && get.position(trigger.cards[0], true) == "o") {
				await player.gain(trigger.cards, "gain2");
			}
			await player.draw("nodelay");
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
						var cards = card.cards,
							evt = _status.event;
						if (evt.player == target && card.name == "damage" && evt.getParent().type == "card") {
							cards = evt.getParent().cards.filterInD();
						}
						if (target.hp <= 1) {
							return;
						}
						if (get.itemtype(cards) != "cards") {
							return;
						}
						for (var i of cards) {
							if (get.name(i, target) == "tao") {
								return [1, 4.5];
							}
						}
						if (get.value(cards, target) >= 7 + target.getDamagedHp()) {
							return [1, 2.5];
						}
						return [1, 0.6];
					}
				},
			},
		},
	}
```

### rehujia 名字:护驾
描述: 主公技。①当你需要使用或打出一张【闪】时，你可以令其他魏势力角色选择是否打出一张【闪】。若有角色响应，则你视为使用或打出了一张【闪】。②每回合限一次。当有魏势力角色于回合外使用或打出【闪】时，其可以令你摸一张牌。
```js
rehujia: {
		audio: "hujia",
		inherit: "hujia",
		filter(event, player) {
			if (event.responded) {
				return false;
			}
			if (player.storage.hujiaing) {
				return false;
			}
			if (!player.hasZhuSkill("rehujia")) {
				return false;
			}
			if (!event.filterCard({ name: "shan" }, player, event)) {
				return false;
			}
			return game.hasPlayer(current => current != player && current.group == "wei");
		},
		ai: {
			respondShan: true,
			skillTagFilter(player) {
				if (player.storage.hujiaing) {
					return false;
				}
				if (!player.hasZhuSkill("rehujia")) {
					return false;
				}
				return game.hasPlayer(current => current != player && current.group == "wei");
			},
		},
		group: "rehujia_draw",
		subSkill: {
			draw: {
				trigger: { global: ["useCard", "respond"] },
				usable: 1,
				filter(event, player) {
					return event.card.name == "shan" && event.player != player && event.player.group == "wei" && event.player.isIn() && event.player != _status.currentPhase && player.hasZhuSkill("rehujia");
				},
				async cost(event, trigger, player) {
					event.result = await trigger.player
						.chooseBool(`护驾：是否令${get.translation(player)}摸一张牌？`)
						.set("ai", () => {
							const evt = _status.event;
							return get.attitude(evt.player, evt.getParent().player) > 0;
						})
						.forResult();
				},
				async content(event, trigger, player) {
					trigger.player.line(player, "fire");
					await player.draw();
				},
			},
		},
	}
```

## re_simayi 名字:界司马懿 势力:wei

### refankui 名字:反馈
描述: 每当你受到1点伤害后，你可以获得伤害来源的一张牌。
```js
refankui: {
		audio: 2,
		audioname2: { boss_chujiangwang: "boss_chujiangwang_fankui", sxrm_caocao: "refankui_sxrm_caocao", tw_sxrm_caocao: "refankui_sxrm_caocao" },
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.source && event.source.countGainableCards(player, event.source != player ? "he" : "e") && event.num > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.choosePlayerCard(get.prompt(event.skill, trigger.source), trigger.source, trigger.source != player ? "he" : "e")
				.set("ai", button => {
					let val = get.buttonValue(button);
					if (get.event().att > 0) {
						return 1 - val;
					}
					return val;
				})
				.set("att", get.attitude(player, trigger.source))
				.forResult();
		},
		logTarget: "source",
		getIndex(event, player) {
			return event.num;
		},
		async content(event, trigger, player) {
			await player.gain(event.cards, trigger.source, "giveAuto", "bySelf");
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
	}
```

### reguicai 名字:鬼才
描述: 在任意角色的判定牌生效前，你可以打出一张牌代替之。
```js
reguicai: {
		audio: 2,
		audioname2: { new_simayi: "reguicai_new_simayi" },
		trigger: { global: "judge" },
		filter(event, player) {
			return player.countCards("hes") > 0;
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
				.setHiddenSkill(event.skill)
				.forResult();
		},
		preHidden: true,
		popup: false,
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
		subSkill: { new_simayi: { audio: 2 } },
	}
```

## re_guojia 名字:界郭嘉 势力:wei

### tiandu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### new_reyiji 名字:遗计
描述: 当你受到1点伤害后，你可以摸两张牌，然后可以将至多两张手牌交给其他角色。
```js
new_reyiji: {
		audio: "reyiji",
		audioname: ["yj_sb_guojia", "yj_sb_guojia_shadow"],
		audioname2: { sxrm_caocao: "reyiji_sxrm_caocao", tw_sxrm_caocao: "reyiji_sxrm_caocao" },
		trigger: {
			player: "damageEnd",
		},
		frequent: true,
		filter(event) {
			return event.num > 0;
		},
		getIndex(event, player, triggername) {
			return event.num;
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			result = await player.draw(2).forResult();
			if (_status.connectMode) {
				game.broadcastAll(() => {
					_status.noclearcountdown = true;
				});
			}
			event.given_map = {};
			event.num = 2;

			// step 1..2 (loop until all cards assigned or player cancels)
			while (event.num > 0) {
				result = await player
					.chooseCardTarget({
						filterCard(card) {
							return get.itemtype(card) == "card" && !card.hasGaintag("reyiji_tag");
						},
						filterTarget: lib.filter.notMe,
						selectCard: [1, event.num],
						prompt: "请选择要分配的卡牌和目标",
						ai1(card) {
							return ui.selected.cards.length ? 0 : 1;
						},
						ai2(target) {
							const player = _status.event.player;
							const card = ui.selected.cards[0];
							const val = target.getUseValue(card);
							if (val > 0) return val * get.attitude(player, target) * 2;
							return get.value(card, target) * get.attitude(player, target);
						},
					})
					.forResult();

				if (result.bool) {
					const res = result.cards;
					const targetId = result.targets[0].playerid;
					player.addGaintag(res, "reyiji_tag");
					event.num -= res.length;
					if (!event.given_map[targetId]) event.given_map[targetId] = [];
					event.given_map[targetId].addArray(res);
					// continue loop if still cards to give
					continue;
				}

				// player cancelled at the very first choice -> cleanup and exit
				if (event.num === 2) {
					if (_status.connectMode) {
						game.broadcastAll(() => {
							delete _status.noclearcountdown;
							game.stopCountChoose();
						});
					}
					return;
				}
				// otherwise break and proceed to distribution
				break;
			}

			// step 3 cleanup for connect mode
			if (_status.connectMode) {
				game.broadcastAll(() => {
					delete _status.noclearcountdown;
					game.stopCountChoose();
				});
			}

			// prepare gain map & cards list
			const map = [];
			const cards = [];
			for (const id of Object.keys(event.given_map)) {
				const source = (_status.connectMode ? lib.playerOL : game.playerMap)[id];
				player.line(source, "green");
				if (player !== source && (get.mode() !== "identity" || player.identity !== "nei")) {
					player.addExpose(0.18);
				}
				map.push([source, event.given_map[id]]);
				cards.addArray(event.given_map[id]);
			}

			// perform the async give
			await game
				.loseAsync({
					gain_list: map,
					player,
					cards,
					giver: player,
					animate: "giveAuto",
				})
				.setContent("gaincardMultiple");
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
						let num = 1;
						if (get.attitude(player, target) > 0) {
							if (player.needsToDiscard()) {
								num = 0.7;
							} else {
								num = 0.5;
							}
						}
						if (target.hp >= 4) {
							return [1, num * 2];
						}
						if (target.hp == 3) {
							return [1, num * 1.5];
						}
						if (target.hp == 2) {
							return [1, num * 0.5];
						}
					}
				},
			},
			threaten: 0.6,
		},
	}
```

## re_zhangliao 名字:界张辽 势力:wei

### new_retuxi 名字:突袭
描述: 摸牌阶段摸牌时，你可以少摸任意张牌，然后获得等量的角色的各一张手牌。
```js
new_retuxi: {
		audio: "retuxi",
		audioname2: { gz_jun_caocao: "jianan_tuxi" },
		trigger: {
			player: "phaseDrawBegin2",
		},
		direct: true,
		preHidden: true,
		filter(event, player) {
			return (
				event.num > 0 &&
				!event.numFixed &&
				game.hasPlayer(function (target) {
					return target.countCards("h") > 0 && player != target;
				})
			);
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			let num = get.copy(trigger.num);
			if (get.mode() == "guozhan" && num > 2) {
				num = 2;
			}
			result = await player
				.chooseTarget(get.prompt("new_retuxi"), "获得至多" + get.translation(num) + "名角色的各一张手牌，然后少摸等量的牌", [1, num], (card, player, target) => target.countCards("h") > 0 && player != target)
				.set("ai", target => {
					let att = get.attitude(_status.event.player, target);
					if (target.hasSkill("tuntian")) {
						return att / 10;
					}
					return 1 - att;
				})
				.setHiddenSkill("new_retuxi")
				.forResult();

			// step 1
			if (result.bool) {
				result.targets.sortBySeat();
				player.logSkill("new_retuxi", result.targets);
				await player.gainMultiple(result.targets);
				trigger.num -= result.targets.length;
			} else {
				return;
			}

			// step 2
			if (trigger.num <= 0) {
				await game.delay();
			}
		},
		ai: {
			threaten: 1.6,
			expose: 0.2,
		},
	}
```

## re_xuzhu 名字:界许褚 势力:wei

### new_reluoyi 名字:裸衣
描述: 摸牌阶段开始时，你亮出牌堆顶的三张牌。然后，你可以放弃摸牌。若如此做，你获得其中的基本牌、武器牌和【决斗】，且直到你的下回合开始，你使用的【杀】或【决斗】造成伤害时，此伤害+1。否则，你将这些牌置入弃牌堆。
```js
new_reluoyi: {
		audio: "reluoyi",
		trigger: {
			player: "phaseDrawBegin1",
		},
		forced: true,
		locked: false,
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			const cards = get.cards(3, true);
			await player.showCards(cards, "裸衣", true);

			const cardsx = [];
			for (const c of cards) {
				const type = get.type(c);
				if (type == "basic" || c.name == "juedou" || (type == "equip" && get.subtype(c) == "equip1")) {
					cardsx.push(c);
				}
			}

			event.cards = cardsx;
			const prompt = "是否放弃摸牌" + (cardsx.length ? "，改为获得" + get.translation(cardsx) : "") + "？";
			const result = await player
				.chooseBool(prompt)
				.set("choice", cardsx.length >= trigger.num)
				.forResult();

			if (result.bool) {
				if (cardsx.length) {
					await player.gain(cardsx, "gain2");
				}
				player.addTempSkill("new_reluoyi_buff", { player: "phaseBeforeStart" });
				trigger.changeToZero();
			}
		},
		subSkill: { buff: { inherit: "reluoyi2", sourceSkill: "new_reluoyi" } },
	}
```

## re_xiahoudun 名字:界夏侯惇 势力:wei

### reganglie 名字:刚烈
描述: 当你受到1点伤害后，你可进行判定，若结果为：红色，你对伤害来源造成1点伤害；黑色，你弃置伤害来源一张牌。
```js
reganglie: {
		audio: 2,
		audioname2: { sxrm_caocao: "reganglie_sxrm_caocao", tw_sxrm_caocao: "reganglie_sxrm_caocao" },
		trigger: { player: "damageEnd" },
		getIndex(event, player, triggername) {
			if (get.mode() == "guozhan") {
				return 1;
			}
			return event.num;
		},
		filter(event) {
			return event.num > 0;
		},
		check(event, player) {
			if (!event.source?.isIn()) {
				return Math.random() < 0.5;
			}
			return get.attitude(player, event.source) <= 0;
		},
		prompt2(event, player) {
			let str = "你可以判定";
			if (event.source?.isIn()) {
				str += `，若结果为：红色，你对${get.translation(event.source)}造成1点伤害；黑色，你弃置${get.translation(event.source)}一张牌。`;
			} else {
				str += "。";
			}
			return str;
		},
		preHidden: true,
		async content(event, trigger, player) {
			const { source } = trigger;
			const result = await player
				.judge(card => {
					if (get.color(card) == "red") {
						return 1;
					}
					return 0;
				})
				.forResult();
			if (!source?.isIn()) {
				return;
			}
			switch (result?.color) {
				case "black":
					if (source.countDiscardableCards(player, "he")) {
						await player.discardPlayerCard(source, "he", true);
					}
					break;

				case "red":
					await source.damage();
					break;
				default:
					break;
			}
		},
		ai: {
			maixie_defend: true,
			expose: 0.4,
		},
	}
```

### new_qingjian 名字:清俭
描述: 每回合限一次。当你于摸牌阶段外得到牌后，你可以展示任意张牌并交给一名其他角色。然后，当前回合角色本回合的手牌上限+X（X为你给出的牌中包含的类别数）。
```js
new_qingjian: {
		audio: "qingjian",
		trigger: {
			player: "gainAfter",
			global: "loseAsyncAfter",
		},
		usable: 1,
		filter(event, player) {
			const evt = event.getParent("phaseDraw");
			if (evt?.player == player) {
				return false;
			}
			return event.getg(player).length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					position: "he",
					filterCard: true,
					selectCard: [1, Infinity],
					filterTarget: lib.filter.notMe,
					ai1(card) {
						const player = get.player();
						if (card.name != "du" && get.attitude(player, _status.currentPhase) < 0 && _status.currentPhase?.needsToDiscard()) {
							return -1;
						}
						for (var i = 0; i < ui.selected.cards.length; i++) {
							if (get.type(ui.selected.cards[i]) == get.type(card) || (ui.selected.cards[i].name == "du" && card.name != "du")) {
								return -1;
							}
						}
						if (card.name == "du") {
							return 20;
						}
						return player.countCards("h") - player.hp;
					},
					allowChooseAll: true,
					ai2(target) {
						const player = get.player();
						if (get.attitude(player, _status.currentPhase) < 0) {
							return -1;
						}
						const att = get.attitude(player, target);
						if (ui.selected.cards.length && ui.selected.cards[0].name == "du") {
							if (target.hasSkillTag("nodu")) {
								return 0;
							}
							return 1 - att;
						}
						if (target.countCards("h") > player.countCards("h")) {
							return 0;
						}
						return att - 4;
					},
					prompt: get.prompt2(event.name.slice(0, -5)),
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cards,
			} = event;
			await player.showCards(cards);
			await player.give(cards, target);
			const current = _status.currentPhase;
			if (current?.isIn()) {
				current.addTempSkill("qingjian_add");
				current.addMark("qingjian_add", cards.map(card => get.type2(card)).toUniqued().length, false);
			}
		},
		ai: { expose: 0.3 },
	}
```

## re_zhangfei 名字:界张飞 势力:shu

### olpaoxiao 名字:咆哮
描述: ①锁定技，你使用【杀】无次数限制。②锁定技，当你使用的【杀】被【闪】抵消时，你获得一枚“咆”（→）当你因【杀】造成伤害时，你弃置所有“咆”并令伤害值+X（X为“咆”数）。回合结束后，你弃置所有“咆”。
```js
olpaoxiao: {
		audio: "paoxiao",
		audioname: ["re_zhangfei", "xiahouba", "re_guanzhang"],
		audioname2: { guanzhang: "paoxiao_guanzhang", ol_guanzhang: "paoxiao_ol_guanzhang" },
		trigger: { player: "shaMiss" },
		forced: true,
		async content(event, trigger, player) {
			player.addTempSkill("olpaoxiao2");
			player.addMark("olpaoxiao2", 1, false);
		},
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return Infinity;
				}
			},
		},
	}
```

### oltishen 名字:替身
描述: 限定技，准备阶段，你可以将体力回复至上限，然后摸X张牌（X为你回复的体力值）。
```js
oltishen: {
		audio: "retishen",
		skillAnimation: true,
		animationColor: "soil",
		limited: true,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.isDamaged();
		},
		check(event, player) {
			if (player.hp <= 2 || player.getDamagedHp() > 2) {
				return true;
			}
			if (player.getDamagedHp() <= 1) {
				return false;
			}
			return player.getDamagedHp() < game.roundNumber;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const num = player.getDamagedHp(true);
			await player.recover(num);
			await player.draw(num);
		},
	}
```

## re_zhaoyun 名字:界赵云 势力:shu

### ollongdan 名字:龙胆
描述: 你可以将一张【杀】当做【闪】、【闪】当做【杀】、【酒】当做【桃】、【桃】当做【酒】使用或打出。
```js
ollongdan: {
		mod: {
			aiValue(player, card, num) {
				if (card.name != "sha" && card.name != "shan") {
					return;
				}
				var geti = function () {
					var cards = player.getCards("hs", function (card) {
						return card.name == "sha" || card.name == "shan";
					});
					if (cards.includes(card)) {
						return cards.indexOf(card);
					}
					return cards.length;
				};
				return Math.max(num, [7, 5, 5, 3][Math.min(geti(), 3)]);
			},
			aiUseful() {
				return lib.skill.ollongdan.mod.aiValue.apply(this, arguments);
			},
		},
		locked: false,
		audio: "longdan_sha",
		audioname: ["re_zhaoyun", "huan_zhaoyun", "sp_zhaoyun"],
		audioname2: { tongyuan: "longdan_tongyuan" },
		hiddenCard(player, name) {
			if (name == "tao") {
				return player.countCards("hs", "jiu") > 0;
			}
			if (name == "jiu") {
				return player.countCards("hs", "tao") > 0;
			}
			return false;
		},
		enable: ["chooseToUse", "chooseToRespond"],
		position: "hs",
		prompt: "将杀当做闪，或将闪当做杀，或将桃当做酒，或将酒当做桃使用或打出",
		viewAs(cards, player) {
			if (cards.length) {
				var name = false;
				switch (get.name(cards[0], player)) {
					case "sha":
						name = "shan";
						break;
					case "shan":
						name = "sha";
						break;
					case "tao":
						name = "jiu";
						break;
					case "jiu":
						name = "tao";
						break;
				}
				if (name) {
					return { name: name };
				}
			}
			return null;
		},
		check(card) {
			var player = _status.event.player;
			if (_status.event.type == "phase") {
				var max = 0;
				var name2;
				var list = ["sha", "tao", "jiu"];
				var map = { sha: "shan", tao: "jiu", jiu: "tao" };
				for (var i = 0; i < list.length; i++) {
					var name = list[i];
					if (player.countCards("hs", map[name]) > (name == "jiu" ? 1 : 0) && player.getUseValue({ name: name }) > 0) {
						var temp = get.order({ name: name });
						if (temp > max) {
							max = temp;
							name2 = map[name];
						}
					}
				}
				if (name2 == get.name(card, player)) {
					return 1;
				}
				return 0;
			}
			return 1;
		},
		filterCard(card, player, event) {
			event = event || _status.event;
			var filter = event._backup.filterCard;
			var name = get.name(card, player);
			if (name == "sha" && filter({ name: "shan", cards: [card] }, player, event)) {
				return true;
			}
			if (name == "shan" && filter({ name: "sha", cards: [card] }, player, event)) {
				return true;
			}
			if (name == "tao" && filter({ name: "jiu", cards: [card] }, player, event)) {
				return true;
			}
			if (name == "jiu" && filter({ name: "tao", cards: [card] }, player, event)) {
				return true;
			}
			return false;
		},
		filter(event, player) {
			var filter = event.filterCard;
			if (filter(get.autoViewAs({ name: "sha" }, "unsure"), player, event) && player.countCards("hs", "shan")) {
				return true;
			}
			if (filter(get.autoViewAs({ name: "shan" }, "unsure"), player, event) && player.countCards("hs", "sha")) {
				return true;
			}
			if (filter(get.autoViewAs({ name: "tao" }, "unsure"), player, event) && player.countCards("hs", "jiu")) {
				return true;
			}
			if (filter(get.autoViewAs({ name: "jiu" }, "unsure"), player, event) && player.countCards("hs", "tao")) {
				return true;
			}
			return false;
		},
		ai: {
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag) {
				var name;
				switch (tag) {
					case "respondSha":
						name = "shan";
						break;
					case "respondShan":
						name = "sha";
						break;
				}
				if (!player.countCards("hs", name)) {
					return false;
				}
			},
			order(item, player) {
				if (player && _status.event.type == "phase") {
					var max = 0;
					var list = ["sha", "tao", "jiu"];
					var map = { sha: "shan", tao: "jiu", jiu: "tao" };
					for (var i = 0; i < list.length; i++) {
						var name = list[i];
						if (player.countCards("hs", map[name]) > (name == "jiu" ? 1 : 0) && player.getUseValue({ name: name }) > 0) {
							var temp = get.order({ name: name });
							if (temp > max) {
								max = temp;
							}
						}
					}
					if (max > 0) {
						max += 0.3;
					}
					return max;
				}
				return 4;
			},
		},
	}
```

### olyajiao 名字:涯角
描述: 当你于回合外因使用或打出而失去手牌后，你可以亮出牌堆顶的一张牌。若这两张牌的类别相同，你可以将展示的牌交给一名角色；若类别不同，你可弃置攻击范围内包含你的角色区域里的一张牌。
```js
olyajiao: {
		audio: "reyajiao",
		trigger: {
			player: "loseAfter",
			global: "loseAsyncAfter",
		},
		frequent: true,
		filter(event, player) {
			if (player == _status.currentPhase) {
				return false;
			}
			return ["useCard", "respond"].includes(event.getParent().name) && event.getl(player)?.hs?.length;
		},
		async content(event, trigger, player) {
			const cards = get.cards(1, true);
			await player
				.showCards(cards, get.translation(player) + "发动了【涯角】", true)
				.set("type", get.type2(trigger.getParent().card))
				.set("clearArena", false)
				.set("removeHighlight", false)
				.set("callback", async (event, trigger, player) => {
					const { cards } = event;
					const [card] = cards;
					const evt = event.getParent();
					const { type, videoId, highlightRemove } = evt;
					if (get.type2(card) == type) {
						const result = await player
							.chooseTarget("涯角：选择获得此牌的角色")
							.set("ai", function (target) {
								var att = get.attitude(_status.event.player, target);
								if (_status.event.du) {
									if (target.hasSkillTag("nodu")) {
										return 0;
									}
									return -att;
								}
								if (att > 0) {
									return att + Math.max(0, 5 - target.countCards("h"));
								}
								return att;
							})
							.set("du", get.name(card) == "du")
							.forResult();
						highlightRemove();
						if (result?.bool && result.targets?.length) {
							const {
								targets: [target],
							} = result;
							player.line(target, "green");
							await target.gain(cards, "gain2");
						}
					} else {
						const result = await player
							.chooseTarget("涯角：是否弃置攻击范围内包含你的一名角色区域内的一张牌？", function (card, player, target) {
								return target.inRange(player) && target.countDiscardableCards(player, "hej") > 0;
							})
							.set("ai", function (target) {
								var player = _status.event.player;
								return get.effect(target, { name: "guohe" }, player, player);
							})
							.forResult();
						highlightRemove();
						if (result?.bool && result.targets?.length) {
							const {
								targets: [target],
							} = result;
							player.line(target, "green");
							await player.discardPlayerCard(target, "hej", true);
						}
					}
					//清楚残留的动画
					game.broadcastAll(ui.clear);
					game.addVideo("judge2", null, videoId);
					if (cards.someInD()) {
						await game.cardsGotoPile(cards.filterInD(), "insert");
					}
				});
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (get.tag(card, "respond") && target.countCards("h") > 1) {
						return [1, 0.2];
					}
				},
			},
		},
	}
```

## re_guanyu 名字:界关羽 势力:shu

### new_rewusheng 名字:武圣
描述: 你可以将一张红色牌当做【杀】使用或打出。你使用的方片【杀】没有距离限制。
```js
new_rewusheng: {
		mod: {
			targetInRange(card) {
				if (get.suit(card) == "diamond" && card.name == "sha") {
					return true;
				}
			},
		},
		locked: false,
		audio: "wusheng",
		audioname: ["re_guanyu", "jsp_guanyu", "re_guanzhang", "dc_jsp_guanyu"],
		audioname2: {
			dc_guansuo: "wusheng_guansuo",
			guanzhang: "wusheng_guanzhang",
			guansuo: "wusheng_guansuo",
			gz_jun_liubei: "shouyue_wusheng",
			std_guanxing: "wusheng_guanzhang",
			ty_guanxing: "wusheng_guanzhang",
			ol_guanzhang: "wusheng_ol_guanzhang",
			re_baosanniang: "wusheng_re_baosanniang",
		},
		enable: ["chooseToRespond", "chooseToUse"],
		filterCard(card, player) {
			if (get.zhu(player, "shouyue")) {
				return true;
			}
			return get.color(card) == "red";
		},
		position: "hes",
		viewAs: {
			name: "sha",
		},
		viewAsFilter(player) {
			if (get.zhu(player, "shouyue")) {
				if (!player.countCards("hes")) {
					return false;
				}
			} else {
				if (!player.countCards("hes", { color: "red" })) {
					return false;
				}
			}
		},
		prompt: "将一张红色牌当杀使用或打出",
		check(card) {
			var val = get.value(card);
			if (_status.event.name == "chooseToRespond") {
				return 1 / Math.max(0.1, val);
			}
			return 5 - val;
		},
		ai: {
			respondSha: true,
			skillTagFilter(player) {
				if (get.zhu(player, "shouyue")) {
					if (!player.countCards("hes")) {
						return false;
					}
				} else {
					if (!player.countCards("hes", { color: "red" })) {
						return false;
					}
				}
			},
		},
	}
```

### new_yijue 名字:义绝
描述: 出牌阶段限一次，你可以弃置一张牌并令一名有手牌的其他角色展示一张手牌。若此牌为黑色，则该角色不能使用或打出手牌，非锁定技失效且受到来自你的红桃【杀】的伤害+1直到回合结束。若此牌为红色，则你可以获得此牌，并可以令其回复1点体力。
```js
new_yijue: {
		initSkill(skill) {
			if (!lib.skill[skill]) {
				lib.skill[skill] = {
					charlotte: true,
					onremove: true,
					mark: true,
					marktext: "绝",
					intro: {
						markcount: () => 0,
						content: storage => `本回合不能使用或打出手牌、非锁定技失效且受到${get.translation(storage[1])}红桃【杀】的伤害+1`,
					},
					group: "new_yijue_ban",
				};
				lib.translate[skill] = "义绝";
				lib.translate[skill + "_bg"] = "绝";
			}
		},
		audio: "yijue",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player != target && target.countCards("h");
		},
		filterCard: lib.filter.cardDiscardable,
		position: "he",
		check(card) {
			return 8 - get.value(card);
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (!target.countCards("h")) {
				return;
			}
			const result = await target
				.chooseCard(true, "h")
				.set("ai", card => {
					const player = get.player();
					if (get.color(card) == "black") {
						return 18 - get.event().black - get.value(card);
					}
					return 18 - get.value(card);
				})
				.set(
					"black",
					(() => {
						if (get.attitude(target, player) > 0) {
							return 18;
						}
						if (
							target.hasCard(card => {
								const name = get.name(card, target);
								return name === "shan" || name === "tao" || (name === "jiu" && target.hp < 3);
							})
						) {
							return 18 / target.hp;
						}
						if (target.hp < 3) {
							return 12 / target.hp;
						}
						return 0;
					})()
				)
				.forResult();
			if (result?.bool && result?.cards?.length) {
				const { cards } = result;
				await target.showCards(cards);
				const [card] = cards;
				if (get.color(card) == "black") {
					if (!target.hasSkill("fengyin")) {
						target.addTempSkill("fengyin");
					}
					const skill = "new_yijue_" + player.playerid;
					game.broadcastAll(lib.skill.new_yijue.initSkill, skill);
					target.addTempSkill(skill);
					target.storage[skill] ??= [0, player];
					target.storage[skill][0]++;
					target.markSkill(skill);
					player.addTempSkill("new_yijue_effect");
				} else if (get.color(card) == "red") {
					await player.gain(card, target, "give", "bySelf");
					if (target.isDamaged()) {
						const result = await player
							.chooseBool(`是否让${get.translation(target)}回复1点体力？`)
							.set("choice", get.recoverEffect(target, player, player) > 0)
							.forResult();
						if (result?.bool) {
							await target.recover();
						}
					}
				}
			}
		},
		ai: {
			result: {
				target(player, target) {
					var hs = player.getCards("h");
					if (hs.length < 3) {
						return 0;
					}
					if (target.countCards("h") > target.hp + 1 && get.recoverEffect(target) > 0) {
						return 1;
					}
					if (player.canUse("sha", target) && (player.countCards("h", "sha") || player.countCards("he", { color: "red" }))) {
						return -2;
					}
					return -0.5;
				},
			},
			order: 9,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (!arg?.target?.hasSkill("new_yijue_" + player.playerid)) {
					return false;
				}
			},
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { source: "damageBegin1" },
				filter(event, player) {
					return event.card?.name == "sha" && get.suit(event.card) == "heart" && event.notLink() && event.player.storage["new_yijue_" + player.playerid]?.[1] == player;
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					trigger.num += trigger.player.storage["new_yijue_" + player.playerid][0];
				},
			},
			ban: {
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
	}
```

## re_machao 名字:界马超 势力:shu

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### retieji 名字:铁骑
描述: 当你使用【杀】指定一名角色为目标后，你可以进行一次判定并令该角色的非锁定技失效直到回合结束，除非该角色交给你一张与判定结果花色相同的牌，否则不能使用【闪】抵消此【杀】且此【杀】伤害+1。
```js
retieji: {
		audio: 2,
		audioname: ["boss_lvbu3", "tw_dm_quyi"],
		trigger: { player: "useCardToPlayered" },
		check(event, player) {
			return get.attitude(player, event.target) <= 0;
		},
		filter(event, player) {
			return event.card.name == "sha";
		},
		logTarget: "target",
		async content(event, trigger, player) {
			let result;
			result = await player
				.judge(function () {
					return 0;
				})
				.forResult();
			if (!trigger.target.hasSkill("fengyin")) {
				trigger.target.addTempSkill("fengyin");
			}
			const suit = result.suit;
			const target = trigger.target;
			const num = target.countCards("h", "shan");
			result = await target
				.chooseToGive({
					target: player,
					filterCard(card) {
						return get.suit(card) === get.event().suit;
					},
					position: "he",
					prompt: `请交给${get.translation(player)}一张${get.translation(suit)}牌，否则不能使用闪抵消此杀且此杀伤害+1`,
					ai(card) {
						const num = get.event().num;
						if (num == 0) {
							return 0;
						}
						if (card.name == "shan") {
							return num > 1 ? 2 : 0;
						}
						return 8 - get.value(card);
					},
				})
				.set("num", num)
				.set("suit", suit)
				.forResult();
			if (!result.bool) {
				trigger.getParent().directHit.add(trigger.target);
				if (typeof trigger.getParent().baseDamage !== "number") {
					trigger.getParent().baseDamage = 1;
				}
				trigger.getParent().baseDamage++;
			}
		},
		ai: {
			ignoreSkill: true,
			skillTagFilter(player, tag, arg) {
				if (tag == "directHit_ai") {
					return arg?.target && get.attitude(player, arg.target) <= 0;
				}
				if (!arg || arg.isLink || !arg.card || arg.card.name != "sha") {
					return false;
				}
				if (!arg.target || get.attitude(player, arg.target) >= 0) {
					return false;
				}
				if (!arg.skill || !lib.skill[arg.skill] || lib.skill[arg.skill].charlotte || lib.skill[arg.skill].persevereSkill || get.is.locked(arg.skill) || !arg.target.getSkills(true, false).includes(arg.skill)) {
					return false;
				}
			},
			directHit_ai: true,
		},
	}
```

## re_zhouyu 名字:界周瑜 势力:wu

### reyingzi 名字:英姿
描述: 锁定技，摸牌阶段摸牌时，你额外摸一张牌；你的手牌上限为你的体力上限。
```js
reyingzi: {
		audio: 2,
		audioname: ["sunce", "re_sunben", "re_sunce"],
		audioname2: {
			gexuan: "reyingzi_gexuan",
			re_sunyi: "reyingzi_re_sunyi",
			heqi: "reyingzi_heqi",
			re_heqi: "reyingzi_heqi",
			boss_sunce: "reyingzi_sunce",
		},
		trigger: { player: "phaseDrawBegin2" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
		ai: {
			threaten: 1.5,
		},
		mod: {
			maxHandcardBase(player, num) {
				return player.maxHp;
			},
		},
	}
```

### refanjian 名字:反间
描述: 出牌阶段限一次，你可以展示一张手牌并将此牌交给一名其他角色。然后该角色选择一项：展示其手牌并弃置所有与此牌花色相同的牌，或失去1点体力。
```js
refanjian: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		filterTarget(card, player, target) {
			return player != target;
		},
		filterCard: true,
		check(card) {
			return 8 - get.value(card);
		},
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const { cards, target } = event;
			let result;

			// step 0
			target.storage.refanjian = cards[0];
			await player.give(cards[0], target);

			// step 1
			if (!target.countCards("h")) {
				result = { control: "refanjian_hp" };
			} else {
				result = await target
					.chooseControl("refanjian_card", "refanjian_hp")
					.set("ai", function (event, player) {
						var cards = player.getCards("he", { suit: get.suit(player.storage.refanjian) });
						if (cards.length == 1) {
							return 0;
						}
						if (cards.length >= 2) {
							for (var i = 0; i < cards.length; i++) {
								if (get.tag(cards[i], "save")) {
									return 1;
								}
							}
						}
						if (player.hp == 1) {
							return 0;
						}
						for (var i = 0; i < cards.length; i++) {
							if (get.value(cards[i]) >= 8) {
								return 1;
							}
						}
						if (cards.length > 2 && player.hp > 2) {
							return 1;
						}
						if (cards.length > 3) {
							return 1;
						}
						return 0;
					})
					.forResult();
			}

			// step 2
			if (result.control == "refanjian_card") {
				await target.showHandcards();
			} else {
				await target.loseHp();
				return;
			}

			// step 3
			const suit = get.suit(target.storage.refanjian);
			await target.discard(
				target.getCards("he", function (i) {
					return get.suit(i) == suit && lib.filter.cardDiscardable(i, target, "refanjian");
				})
			);
			delete target.storage.refanjian;
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					return -target.countCards("he") - (player.countCards("h", "du") ? 1 : 0);
				},
			},
			threaten: 2,
		},
	}
```

## re_lvmeng 名字:界吕蒙 势力:wu

### keji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### qinxue 名字:勤学
描述: 觉醒技。准备阶段或结束阶段开始时，若你的手牌数减体力值大于1，则你减1点体力上限，回复1点体力或摸两张牌，获得技能〖攻心〗。
```js
qinxue: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		juexingji: true,
		derivation: "gongxin",
		trigger: { player: ["phaseZhunbeiBegin", "phaseJieshuBegin"] },
		forced: true,
		filter(event, player) {
			if (player.countCards("h") >= player.hp + 2) {
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			const { name } = event;
			player.awakenSkill(name);
			await player.loseMaxHp();
			await player.chooseDrawRecover(2, true);
			await player.addSkills("gongxin");
		},
	}
```

### rebotu 名字:博图
描述: 每轮限X次。回合结束时，若本回合内置入弃牌堆的牌中包含至少四种花色，则你可获得一个额外的回合。（X为存活角色数且至多为3）
```js
rebotu: {
		audio: "botu",
		trigger: { player: "phaseEnd" },
		frequent: true,
		filter(event, player) {
			if (player.countMark("rebotu_used") >= Math.min(3, game.countPlayer())) {
				return false;
			}
			var suits = [];
			game.getGlobalHistory("cardMove", function (evt) {
				if (suits.length >= 4) {
					return;
				}
				if (evt.name == "lose") {
					if (evt.position == ui.discardPile) {
						for (var i of evt.cards) {
							suits.add(get.suit(i, false));
						}
					}
				} else {
					if (evt.name == "cardsDiscard") {
						for (var i of evt.cards) {
							suits.add(get.suit(i, false));
						}
					}
				}
			});
			return suits.length >= 4;
		},
		async content(event, trigger, player) {
			player.addTempSkill("rebotu_used", "roundStart");
			player.addMark("rebotu_used", 1, false);
			player.insertPhase();
		},
		group: "rebotu_mark",
		subSkill: {
			used: {
				onremove: true,
				charlotte: true,
			},
			mark: {
				trigger: {
					global: ["loseAfter", "cardsDiscardAfter"],
					player: "phaseAfter",
				},
				forced: true,
				firstDo: true,
				silent: true,
				filter(event, player) {
					if (event.name == "phase") {
						return true;
					}
					if (player != _status.currentPhase) {
						return false;
					}
					if (event.name == "lose") {
						return event.position == ui.discardPile;
					}
					return true;
				},
				async content(event, trigger, player) {
					if (trigger.name == "phase") {
						player.unmarkSkill("rebotu_mark");
						return;
					}
					const suits = [];
					game.getGlobalHistory("cardMove", evt => {
						if (suits.length >= 4) {
							return false;
						}
						if (evt.name == "lose") {
							if (evt.position == ui.discardPile) {
								for (const c of evt.cards) {
									suits.add(get.suit(c, false));
								}
							}
						} else if (evt.name == "cardsDiscard") {
							for (const c of evt.cards) {
								suits.add(get.suit(c, false));
							}
						}
						return false;
					});
					player.storage.rebotu_mark = suits;
					player.markSkill("rebotu_mark");
				},
				intro: {
					onunmark: true,
					content: "本回合已有$花色的牌进入过弃牌堆",
				},
			},
		},
	}
```

## re_ganning 名字:界甘宁 势力:wu

### qixi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### fenwei 名字:奋威
描述: 限定技，当一名角色使用的锦囊牌指定了至少两名角色为目标时，你可以令此牌对其中任意名角色无效。
```js
fenwei: {
		audio: 2,
		audioname2: { heqi: "fenwei_heqi" },
		limited: true,
		trigger: { global: "useCardToPlayered" },
		filter(event, player) {
			if (event.getParent().triggeredTargets3.length > 1) {
				return false;
			}
			if (get.type(event.card) != "trick") {
				return false;
			}
			if (get.info(event.card).multitarget) {
				return false;
			}
			if (event.targets.length < 2) {
				return false;
			}
			return true;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), `令${get.translation(trigger.card)}对任意名角色无效`, [1, trigger.targets.length], (card, player, target) => {
					return get.event().targets.includes(target);
				})
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
			player.awakenSkill(event.name);
			trigger.getParent().excluded.addArray(event.targets);
			await game.delayx();
		},
	}
```

## re_luxun 名字:界陆逊 势力:wu

### reqianxun 名字:谦逊
描述: 每当一张延时类锦囊牌或其他角色使用的普通锦囊牌生效时，若你是此牌的唯一目标，你可以将所有手牌置于你的武将牌上，若如此做，此回合结束时，你获得你武将牌上的所有牌。
```js
reqianxun: {
		audio: 2,
		trigger: {
			target: "useCardToBegin",
			player: "judgeBefore",
		},
		filter(event, player) {
			if (player.countCards("h") == 0) {
				return false;
			}
			if (event.getParent().name == "phaseJudge") {
				return true;
			}
			if (event.name == "judge") {
				return false;
			}
			if (event.targets && event.targets.length > 1) {
				return false;
			}
			if (event.card && get.type(event.card) == "trick" && event.player != player) {
				return true;
			}
		},
		async content(event, trigger, player) {
			const cards = player.getCards("h");
			if (!cards.length) {
				return;
			}
			const next = player.addToExpansion(cards, "giveAuto", player);
			next.gaintag.add("reqianxun2");
			await next;
			player.addSkill("reqianxun2");
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (player == target || !target.hasFriend()) {
						return;
					}
					var type = get.type(card);
					var nh = Math.min(
						target.countCards(),
						game.countPlayer(i => get.attitude(target, i) > 0)
					);
					if (type == "trick") {
						if (!get.tag(card, "multitarget") || get.info(card).singleCard) {
							if (get.tag(card, "damage")) {
								return [1.5, nh - 1];
							}
							return [1, nh];
						}
					} else if (type == "delay") {
						return [0.5, 0.5];
					}
				},
			},
		},
	}
```

### relianying 名字:连营
描述: 当你失去最后的手牌时，你可以令至多X名角色各摸一张牌（X为你此次失去的手牌数）。
```js
relianying: {
		audio: 2,
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		direct: true,
		filter(event, player) {
			if (player.countCards("h")) {
				return false;
			}
			var evt = event.getl(player);
			return evt && evt.hs && evt.hs.length;
		},
		async content(event, trigger, player) {
			const num = trigger.getl(player).hs.length;
			const result = await player
				.chooseTarget(get.prompt("relianying"), "令至多" + get.cnNumber(num) + "名角色各摸一张牌", [1, num])
				.set("ai", function (target) {
					const player = _status.event.player;
					if (player == target) {
						return get.attitude(player, target) + 10;
					}
					return get.attitude(player, target);
				})
				.forResult();
			if (!result?.bool) return;
			player.logSkill("relianying", result.targets);
			await game.asyncDraw(result.targets);
			await game.delay();
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
			skillTagFilter(player) {
				return player.countCards("h") === 1;
			},
		},
	}
```

## re_daqiao 名字:界大乔 势力:wu

### reguose 名字:国色
描述: 出牌阶段限一次，你可以选择一项：将一张方片花色牌当做【乐不思蜀】使用；或弃置一张方片花色牌并弃置场上的一张【乐不思蜀】。选择完成后，你摸一张牌。
```js
reguose: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		discard: false,
		lose: false,
		delay: false,
		filter(event, player) {
			return player.countCards("hes", { suit: "diamond" }) > 0;
		},
		position: "hes",
		filterCard: { suit: "diamond" },
		filterTarget(card, player, target) {
			if (get.position(ui.selected.cards[0]) != "s" && lib.filter.cardDiscardable(ui.selected.cards[0], player, "reguose") && target.hasJudge("lebu")) {
				return true;
			}
			if (player == target) {
				return false;
			}
			if (!game.checkMod(ui.selected.cards[0], player, "unchanged", "cardEnabled2", player)) {
				return false;
			}
			return player.canUse({ name: "lebu", cards: ui.selected.cards }, target);
		},
		check(card) {
			return 7 - get.value(card);
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (event.target.hasJudge("lebu")) {
				await player.discard(event.cards);
				await target.discard(event.target.getJudge("lebu"));
			} else {
				await player.useCard({ name: "lebu" }, event.target, event.cards).set("audio", false);
			}
			await player.draw();
		},
		ai: {
			result: {
				target(player, target) {
					if (target.hasJudge("lebu")) {
						return -get.effect(target, { name: "lebu" }, player, target);
					}
					return get.effect(target, { name: "lebu" }, player, target);
				},
			},
			order: 9,
		},
	}
```

### liuli
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_huanggai 名字:界黄盖 势力:wu

### rekurou 名字:苦肉
描述: 出牌阶段限一次，你可以弃置一张牌，然后失去1点体力。
```js
rekurou: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard: lib.filter.cardDiscardable,
		check(card) {
			return 8 - get.value(card);
		},
		position: "he",
		async content(event, trigger, player) {
			await player.loseHp();
		},
		ai: {
			order: 8,
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
	}
```

### zhaxiang 名字:诈降
描述: 锁定技。当你失去1点体力后，你摸三张牌。然后若此时是你的出牌阶段，则你本回合获得此下效果：使用【杀】的次数上限+1，使用红色【杀】无距离限制且不能被【闪】响应。
```js
zhaxiang: {
		audio: 2,
		audioname2: { ol_sb_jiangwei: "zhaxiang_ol_sb_jiangwei" },
		trigger: { player: "loseHpEnd" },
		filter(event, player) {
			return player.isIn() && event.num > 0;
		},
		getIndex: event => event.num,
		forced: true,
		async content(event, trigger, player) {
			await player.draw(3);
			if (player.isPhaseUsing()) {
				player.addTempSkill(event.name + "_effect");
				player.addMark(event.name + "_effect", 1, false);
			}
		},
		subSkill: {
			effect: {
				mod: {
					targetInRange(card, player, target, now) {
						if (card.name == "sha" && get.color(card) == "red") {
							return true;
						}
					},
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("zhaxiang_effect");
						}
					},
				},
				charlotte: true,
				onremove: true,
				audio: "zhaxiang",
				audioname2: { ol_sb_jiangwei: "zhaxiang_ol_sb_jiangwei" },
				trigger: { player: "useCard" },
				sourceSkill: "zhaxiang",
				filter(event, player) {
					return event.card?.name == "sha" && get.color(event.card) == "red";
				},
				forced: true,
				async content(event, trigger, player) {
					trigger.directHit.addArray(game.players);
				},
				intro: { content: "<li>使用【杀】的次数上限+#<br><li>使用红色【杀】无距离限制且不能被【闪】响应" },
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						return arg?.card?.name == "sha" && get.color(arg.card) == "red";
					},
				},
			},
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
	}
```

## re_lvbu 名字:界吕布 势力:qun

### wushuang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### new_liyu 名字:利驭
描述: 当你使用【杀】对一名其他角色造成伤害后，你可以获得其区域内的一张牌。若此牌不为装备牌，则其摸一张牌。若此牌为装备牌，则视为你对其选择的另一名角色使用一张【决斗】。
```js
new_liyu: {
		audio: "liyu",
		trigger: {
			source: "damageSource",
		},
		filter(event, player) {
			if (event._notrigger.includes(event.player)) {
				return false;
			}
			return event.card && event.card.name == "sha" && event.player != player && event.player.isIn() && event.player.countGainableCards(player, "hej") > 0;
		},
		direct: true,
		async content(event, trigger, player) {
			const gainResult = await player
				.gainPlayerCard(get.prompt("new_liyu", trigger.player), trigger.player, "hej", "visibleMove")
				.set("ai", function (button) {
					const player = _status.event.player;
					const target = _status.event.target;
					if (get.attitude(player, target) > 0 && get.position(button.link) === "j") {
						return 4 + get.value(button.link);
					}
					if (get.type(button.link) === "equip") {
						return _status.event.juedou;
					}
					return 3;
				})
				.set(
					"juedou",
					(() => {
						if (
							get.attitude(player, trigger.player) > 0 &&
							game.hasPlayer(current => {
								return player.canUse({ name: "juedou" }, current) && current != trigger.player && current != player && get.effect(current, { name: "juedou" }, player, player) > 2;
							})
						) {
							return 5;
						}
						if (
							game.hasPlayer(current => {
								return player.canUse({ name: "juedou" }, current) && current != trigger.player && current != player && get.effect(current, { name: "juedou" }, player, player) < 0;
							})
						) {
							return 1;
						}
						return 4;
					})()
				)
				.set("logSkill", ["new_liyu", trigger.player])
				.forResult();

			if (!gainResult?.bool) return;

			const gained = gainResult.cards?.[0];
			if (!gained) return;

			if (get.type(gained) !== "equip") {
				await trigger.player.draw();
				return;
			}

			if (!game.hasPlayer(current => current != player && current != trigger.player && player.canUse("juedou", current))) {
				return;
			}

			const chooseRes = await trigger.player
				.chooseTarget(
					true,
					(card, player2, target) => {
						const evt = _status.event.getParent();
						return evt.player.canUse({ name: "juedou" }, target) && target != _status.event.player;
					},
					"请选择一名角色，视为" + get.translation(player) + "对其使用【决斗】"
				)
				.set("ai", target => {
					const evt = _status.event.getParent();
					return get.effect(target, { name: "juedou" }, evt.player, _status.event.player) - 2;
				})
				.forResult();

			if (chooseRes?.targets?.length) {
				await player.useCard({ name: "juedou", isCard: true }, chooseRes.targets[0], "noai");
			}
		},
		ai: {
			halfneg: true,
		},
	}
```

## re_huatuo 名字:界华佗 势力:qun

### jijiu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### new_reqingnang 名字:青囊
描述: 出牌阶段，你可以弃置一张手牌，令一名本回合内未成为过〖青囊〗的目标的角色回复1点体力。若你弃置的是黑色牌，则你本回合内不能再发动〖青囊〗。
```js
new_reqingnang: {
		subSkill: {
			off: {
				sub: true,
			},
		},
		audio: 2,
		enable: "phaseUse",
		filterCard: true,
		check(card) {
			var player = _status.event.player;
			if (
				game.countPlayer(function (current) {
					return get.recoverEffect(current, player, player) > 0 && get.attitude(player, current) > 2;
				}) > 1 &&
				get.color(card) == "black" &&
				player.countCards("h", { color: "red" }) > 0
			) {
				return 3 - get.value(card);
			}
			return 9 - get.value(card);
		},
		filterTarget(card, player, target) {
			if (target.hp >= target.maxHp || target.hasSkill("new_reqingnang_off")) {
				return false;
			}
			return true;
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			target.addTempSkill("new_reqingnang_off");
			if (get.color(cards[0]) == "black") {
				player.tempBanSkill("new_reqingnang");
			}
			await target.recover();
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					if (target.hp == 1) {
						return 5;
					}
					if (player == target && player.countCards("h") > player.hp) {
						return 5;
					}
					return 2;
				},
			},
			threaten: 2,
		},
	}
```

## re_liubei 名字:界刘备 势力:shu

### rerende 名字:仁德
描述: 出牌阶段，你可以将至少一张手牌交给其他角色，然后你于此阶段内不能再以此法交给该角色牌；若你于此阶段内给出的牌首次达到两张，你可以视为使用一张基本牌。
```js
rerende: {
		audio: 2,
		audioname: ["gz_jun_liubei"],
		audioname2: { shen_caopi: "rerende_shen_caopi" },
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("h") && game.hasPlayer(current => get.info("rerende").filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			return !player.getStorage("rerende_targeted").includes(target);
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
			var player = get.owner(card);
			if (ui.selected.cards.length >= Math.max(2, player.countCards("h") - player.hp)) {
				return 0;
			}
			if (player.hp == player.maxHp || player.countMark("rerende") < 0 || player.countCards("h") <= 1) {
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
		async content(event, trigger, player) {
			const { target, cards, name } = event;
			player.addTempSkill(name + "_targeted", "phaseUseAfter");
			player.markAuto(name + "_targeted", [target]);
			let num = 0;
			player.getHistory("lose", evt => {
				if (evt.getParent(2).name == name && evt.getParent("phaseUse") == event.getParent(3)) {
					num += evt.cards.length;
				}
			});
			if (!player.storage[event.name]) {
				player.when({ player: "phaseUseEnd" }).step(async () => {
					player.clearMark(event.name, false);
				});
			}
			player.addMark(event.name, num + cards.length, false);
			await player.give(cards, target);
			const list = get.inpileVCardList(info => {
				return info[0] == "basic" && player.hasUseTarget(new lib.element.VCard({ name: info[2], nature: info[3], isCard: true }), null, true);
			});
			if (num < 2 && num + cards.length > 1 && list.length) {
				const result = await player
					.chooseButton(["是否视为使用一张基本牌？", [list, "vcard"]])
					.set("ai", button => {
						return get.player().getUseValue({ name: button.link[2], nature: button.link[3], isCard: true });
					})
					.forResult();
				if (!result?.links?.length) {
					return;
				}
				await player.chooseUseTarget(get.autoViewAs({ name: result.links[0][2], nature: result.links[0][3], isCard: true }), true);
			}
		},
		ai: {
			fireAttack: true,
			order(skill, player) {
				if (player.hp < player.maxHp && player.countMark("rerende") < 2 && player.countCards("h") > 1) {
					return 10;
				}
				return 4;
			},
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
					if (player.hp == player.maxHp || player.countMark("rerende") < 0 || player.countCards("h") <= 1) {
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
							if (game.hasPlayer(current => current != player && get.attitude(player, current) > 0)) {
								return 0;
							}
						}
					}
				},
			},
			threaten: 0.8,
		},
		marktext: "仁",
		onremove: true,
		intro: {
			content: "本阶段已仁德牌数：#",
			onunmark: true,
		},
		subSkill: {
			targeted: {
				onremove: true,
				charlotte: true,
			},
		},
	}
```

### rejijiang 名字:激将
描述: 主公技。①当你需要使用或打出【杀】时，你可以令其他蜀势力角色依次选择是否打出一张【杀】。若有角色响应，则你视为使用或打出了此【杀】。②每回合限一次。当有蜀势力角色于回合外使用或打出【杀】时，其可以令你摸一张牌。
```js
rejijiang: {
		audio: "jijiang1",
		audioname: ["liushan", "re_liubei", "re_liushan", "ol_liushan"],
		group: ["rejijiang1", "rejijiang3"],
		zhuSkill: true,
		filter(event, player) {
			if (
				!player.hasZhuSkill("rejijiang") ||
				!game.hasPlayer(function (current) {
					return current != player && current.group == "shu";
				})
			) {
				return false;
			}
			return !event.jijiang && (event.type != "phase" || !player.hasSkill("jijiang3"));
		},
		enable: ["chooseToUse", "chooseToRespond"],
		viewAs: { name: "sha" },
		filterCard: () => false,
		selectCard: -1,
		ai: {
			order() {
				return get.order({ name: "sha" }) + 0.3;
			},
			respondSha: true,
			skillTagFilter(player) {
				if (
					!player.hasZhuSkill("rejijiang") ||
					!game.hasPlayer(function (current) {
						return current != player && current.group == "shu";
					})
				) {
					return false;
				}
			},
		},
	}
```

## re_diaochan 名字:界貂蝉 势力:qun

### lijian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rebiyue 名字:闭月
描述: 结束阶段，你可以摸一张牌，若你没有手牌，则改为摸两张牌。
```js
rebiyue: {
		audio: 2,
		audioname2: { sp_diaochan: "biyue" },
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		async content(event, trigger, player) {
			await player.draw(player.countCards("h") ? 1 : 2);
		},
	}
```

## re_huangyueying 名字:界黄月英 势力:shu

### rejizhi 名字:集智
描述: 当你使用锦囊牌时，你可以摸一张牌。若此牌为基本牌，则你可以弃置之，然后令本回合手牌上限+1。
```js
rejizhi: {
		audio: 2,
		audioname2: {
			lukang: "rejizhi_lukang",
			zj_lukang: "rejizhi_lukang",
			new_simayi: "rejizhi_new_simayi",
		},
		locked: false,
		trigger: { player: "useCard" },
		frequent: true,
		filter(event) {
			return get.type(event.card, "trick") == "trick" && event.card.isCard;
		},
		init(player) {
			player.storage.rejizhi = 0;
		},
		async content(event, trigger, player) {
			const result = await player.draw("nodelay").forResult();
			event.card = result.cards[0];
			if (get.type(event.card) !== "basic") {
				return;
			}

			const result2 = await player
				.chooseBool(`是否弃置${get.translation(event.card)}并令本回合手牌上限+1？`)
				.set("ai", (evt, player) => _status.currentPhase === player && player.needsToDiscard(-3) && _status.event.value < 6)
				.set("value", get.value(event.card, player))
				.forResult();

			if (result2.bool) {
				await player.discard(event.card);
				player.storage.rejizhi++;
				if (_status.currentPhase === player) {
					player.markSkill("rejizhi");
				}
			}
		},
		ai: {
			threaten: 1.4,
			noautowuxie: true,
		},
		mod: {
			maxHandcard(player, num) {
				return num + player.storage.rejizhi;
			},
		},
		intro: {
			content: "本回合手牌上限+#",
		},
		group: "rejizhi_clear",
		subSkill: {
			clear: {
				trigger: { global: "phaseAfter" },
				silent: true,
				async content(event, trigger, player) {
					player.storage.rejizhi = 0;
					player.unmarkSkill("rejizhi");
				},
			},
		},
	}
```

### reqicai 名字:奇才
描述: 锁定技，你使用锦囊牌无距离限制，你装备区内的防具牌和宝物牌不能被其他角色弃置。
```js
reqicai: {
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
	}
```

## re_sunquan 名字:界孙权 势力:wu

### rezhiheng 名字:制衡
描述: 出牌阶段限一次，你可以弃置任意张牌并摸等量的牌，若你在发动〖制衡〗时弃置了所有手牌，则你多摸一张牌。
```js
rezhiheng: {
		audio: 2,
		audioname2: { shen_caopi: "rezhiheng_shen_caopi", new_simayi: "rezhiheng_new_simayi" },
		mod: {
			aiOrder(player, card, num) {
				if (num <= 0 || get.itemtype(card) !== "card" || get.type(card) !== "equip") {
					return num;
				}
				let eq = player.getEquip(get.subtype(card));
				if (eq && get.equipValue(card) - get.equipValue(eq) < Math.max(1.2, 6 - player.hp)) {
					return 0;
				}
			},
		},
		locked: false,
		enable: "phaseUse",
		usable: 1,
		position: "he",
		filterCard: lib.filter.cardDiscardable,
		discard: false,
		lose: false,
		delay: false,
		selectCard: [1, Infinity],
		allowChooseAll: true,
		check(card) {
			let player = _status.event.player;
			if (
				get.position(card) == "h" &&
				!player.countCards("h", "du") &&
				(player.hp > 2 ||
					!player.countCards("h", i => {
						return get.value(i) >= 8;
					}))
			) {
				return 1;
			}
			if (get.position(card) == "e") {
				let subs = get.subtypes(card);
				if (subs.includes("equip2") || subs.includes("equip3")) {
					return player.getHp() - get.value(card);
				}
			}
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const { cards } = event;
			event.num = 1;
			const hs = player.getCards("h");
			if (!hs.length) {
				event.num = 0;
			}
			for (let i = 0; i < hs.length; i++) {
				if (!cards.includes(hs[i])) {
					event.num = 0;
					break;
				}
			}
			await player.discard(cards);
			await player.draw(event.num + cards.length);
		},
		//group:'rezhiheng_draw',
		subSkill: {
			draw: {
				trigger: { player: "loseEnd" },
				silent: true,
				filter(event, player) {
					if (event.getParent(2).skill != "rezhiheng" && event.getParent(2).skill != "jilue_zhiheng") {
						return false;
					}
					if (player.countCards("h")) {
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
					player.addTempSkill("rezhiheng_delay", trigger.getParent(2).skill + "After");
				},
			},
			delay: {},
		},
		ai: {
			order(item, player) {
				if (player.hasCard(i => get.value(i) > Math.max(6, 9 - player.hp), "he")) {
					return 1;
				}
				return 10;
			},
			result: {
				player: 1,
			},
			nokeep: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "nokeep") {
					return (!arg || (arg && arg.card && get.name(arg.card) === "tao")) && player.isPhaseUsing() && !player.getStat().skill.rezhiheng && player.hasCard(card => get.name(card) !== "tao", "h");
				}
			},
			threaten: 1.55,
		},
	}
```

### rejiuyuan 名字:救援
描述: 主公技，其他吴势力角色于其回合内回复体力时，若其体力值大于等于你，则该角色可以改为令你回复1点体力，然后其摸一张牌。
```js
rejiuyuan: {
		audio: 2,
		zhuSkill: true,
		trigger: { global: "recoverBefore" },
		direct: true,
		filter(event, player) {
			return player != event.player && event.player.group == "wu" && player.hp <= event.player.hp && event.getParent().name != "rejiuyuan" && player.hasZhuSkill("rejiuyuan", event.player) && event.player === _status.currentPhase;
		},
		async content(event, trigger, player) {
			// step 0
			const result = await trigger.player
				.chooseBool("是否对" + get.translation(player) + "发动【救援】？", "改为令其回复1点体力，然后你摸一张牌")
				.set("ai", function () {
					const evt = _status.event;
					return get.attitude(evt.player, evt.getParent().player) > 0;
				})
				.forResult();

			// step 1
			if (result.bool) {
				player.logSkill("rejiuyuan");
				trigger.player.line(player, "green");
				trigger.cancel();
				await player.recover(trigger.player);
				await trigger.player.draw();
			}
		},
	}
```

## re_sunshangxiang 名字:界孙尚香 势力:wu

### xiaoji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rejieyin 名字:结姻
描述: 出牌阶段限一次，你可以选择一名男性角色并弃置一张手牌或将装备区内的一张装备牌置于其装备区，你与其体力较高的角色摸一张牌，体力值较低的角色回复1点体力。
```js
rejieyin: {
		audio: 2,
		enable: "phaseUse",
		filterCard: true,
		usable: 1,
		position: "he",
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		check(card) {
			var player = _status.event.player;
			if (get.position(card) == "e") {
				var subtype = get.subtype(card);
				if (
					!game.hasPlayer(function (current) {
						return current != player && get.attitude(player, current) > 0 && !current.countCards("e", { subtype: subtype });
					})
				) {
					return 0;
				}
				if (player.countCards("h", { subtype: subtype })) {
					return 20 - get.value(card);
				}
				return 10 - get.value(card);
			} else {
				if (player.countCards("e")) {
					return 0;
				}
				if (player.countCards("h", { type: "equip" })) {
					return 0;
				}
				return 8 - get.value(card);
			}
		},
		filterTarget(card, player, target) {
			if (!target.hasSex("male")) {
				return false;
			}
			var card = ui.selected.cards[0];
			if (!card) {
				return false;
			}
			if (get.position(card) == "e" && !target.canEquip(card)) {
				return false;
			}
			return true;
		},
		discard: false,
		delay: false,
		lose: false,
		async content(event, trigger, player) {
			const { cards, target } = event;
			let result;

			// step 0
			if (get.position(cards[0]) == "e") {
				result = { index: 0 };
			} else if (get.type(cards[0]) != "equip" || !target.canEquip(cards[0])) {
				result = { index: 1 };
			} else {
				result = await player
					.chooseControl()
					.set("choiceList", ["将" + get.translation(cards[0]) + "置入" + get.translation(target) + "的装备区", "弃置" + get.translation(cards[0])])
					.set("ai", () => 1)
					.forResult();
			}

			// step 1
			if (result.index == 0) {
				player.$give(cards, target, false);
				await target.equip(cards[0]);
			} else {
				await player.discard(cards);
			}

			// step 2
			if (player.hp > target.hp) {
				await player.draw();
				if (target.isDamaged()) {
					await target.recover();
				}
			} else if (player.hp < target.hp) {
				await target.draw();
				if (player.isDamaged()) {
					await player.recover();
				}
			}
		},
		ai: {
			order() {
				var player = _status.event.player;
				var es = player.getCards("e");
				for (var i = 0; i < es.length; i++) {
					if (player.countCards("h", { subtype: get.subtype(es[i]) })) {
						return 10;
					}
				}
				return 2;
			},
			result: {
				player(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					let card = ui.selected.cards[0],
						val = -get.value(card, player) / 6;
					if (get.position(card) == "e") {
						val += 2;
					}
					if (player.hp > target.hp) {
						val++;
					} else if (player.hp < target.hp && player.isDamaged()) {
						val += get.recoverEffect(player, player, player) / get.attitude(player, player);
					}
					return val;
				},
				target(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					let card = ui.selected.cards[0],
						val = get.position(card) == "e" ? get.value(card, target) / 6 : 0;
					if (target.hp > player.hp) {
						val++;
					} else if (target.hp < player.hp && target.isDamaged()) {
						val += get.recoverEffect(target, target, target) / get.attitude(target, target);
					}
					return val;
				},
			},
		},
	}
```

## re_zhenji 名字:界甄宓 势力:wei

### reluoshen 名字:洛神
描述: 准备阶段，你可以进行判定，若结果为黑色则获得此判定牌，且可重复此流程直到出现红色的判定结果。你通过〖洛神〗得到的牌不计入当前回合的手牌上限。
```js
reluoshen: {
		audio: 2,
		locked: false,
		trigger: { player: "phaseZhunbeiBegin" },
		frequent: true,
		async content(event, trigger, player) {
			player.addTempSkill("reluoshen_add");

			const cards = new Set();
			let continuing = false;
			do {
				const next = player.judge({
					judge(card) {
						return get.color(card) === "black" ? 1.5 : -1.5;
					},
					judge2(result) {
						return result.bool;
					},
				});

				if (get.mode() !== "guozhan" && !player.hasSkillTag("rejudge")) {
					next.set("callback", async (event, trigger, player) => {
						if (event.judgeResult.color === "black" && get.position(event.card, true) === "o") {
							await player.gain({
								cards: [event.card],
								gaintag: ["reluoshen"],
							});
						}
					});
				} else {
					next.set("callback", async (event, trigger, player) => {
						if (event.judgeResult.color === "black") {
							event.getParent().orderingCards.remove(event.card);
						}
					});
				}

				const result = await next.forResult();

				if (!result.bool) {
					break;
				}

				cards.add(result.card);
				const continueResult = await player.chooseBool({ prompt: "是否继续进行判定？" }).set("frequentSkill", "reluoshen").forResult();
				continuing = continueResult.bool;
			} while (continuing);

			const gainning = [...cards].filter(card => get.position(card, true) === "o");
			if (gainning.length) {
				await player.gain({
					cards: gainning,
					animate: "gain2",
					gaintag: ["reluoshen"],
				});
			}
		},
		subSkill: {
			add: {
				mod: {
					ignoredHandcard(card, player) {
						if (card.hasGaintag("reluoshen")) {
							return true;
						}
					},
					cardDiscardable(card, player, name) {
						if (name == "phaseDiscard" && card.hasGaintag("reluoshen")) {
							return false;
						}
					},
				},
				onremove(player) {
					player.removeGaintag("reluoshen");
				},
			},
		},
	}
```

### qingguo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_zhugeliang 名字:界诸葛亮 势力:shu

### reguanxing 名字:观星
描述: 准备阶段，你可以观看牌堆顶的五张牌（存活角色小于4时改为三张），并将其以任意顺序置于牌堆顶或牌堆底，若你将〖观星〗的牌都放在了牌堆底，则你可以在结束阶段再次发动〖观星〗。
```js
reguanxing: {
		audio: "guanxing",
		audioname: ["jiangwei", "re_jiangwei", "re_zhugeliang", "ol_jiangwei"],
		audioname2: { gexuan: "guanxing_gexuan" },
		trigger: { player: ["phaseZhunbeiBegin", "phaseJieshuBegin"] },
		frequent: true,
		filter(event, player, name) {
			if (name == "phaseJieshuBegin") {
				return player.hasSkill("reguanxing_on");
			}
			return true;
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseToGuanxing(game.countPlayer() < 4 ? 3 : 5)
				.set("prompt", "观星：点击或拖动将牌移动到牌堆顶或牌堆底")
				.forResult();
			if ((!result.bool || !result.moved[0].length) && event.triggername == "phaseZhunbeiBegin") {
				player.addTempSkill(["reguanxing_on", "guanxing_fail"]);
			}
		},
		subSkill: {
			on: { charlotte: true },
		},
		ai: {
			guanxing: true,
		},
	}
```

### kongcheng
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_huaxiong 名字:界华雄 势力:qun

### reyaowu 名字:耀武
描述: 锁定技，当你受到牌造成的伤害时，若此牌为红色，则伤害来源摸一张牌；否则你摸一张牌。
```js
reyaowu: {
		trigger: { player: "damageBegin3" },
		audio: "new_reyaowu",
		forced: true,
		filter(event) {
			return event.card && (get.color(event.card) != "red" || (event.source && event.source.isIn()));
		},
		async content(event, trigger, player) {
			if (get.color(trigger.card) == "red") {
				await trigger.source.draw();
			} else {
				await trigger.player.draw();
			}
		},
		ai: {
			effect: {
				target: (card, player, target) => {
					if (typeof card !== "object" || !get.tag(card, "damage")) {
						return;
					}
					if (player.hasSkillTag("jueqing", false, target)) {
						return;
					}
					if (get.color(card) === "red") {
						return [1, 0, 1, 0.6];
					}
					return [1, 0.6];
				},
			},
		},
	}
```

### shizhan 名字:势斩
描述: 出牌阶段限两次，你可以选择一名其他角色。该角色视为对你使用一张【决斗】。
```js
shizhan: {
		audio: 2,
		enable: "phaseUse",
		usable: 2,
		filterTarget(card, player, target) {
			return target != player && target.canUse("juedou", player);
		},
		async content(event, trigger, player) {
			await event.target.useCard({ name: "juedou", isCard: true }, player, "noai");
		},
		ai: {
			order: 2,
			result: {
				player(player, target) {
					return get.effect(player, { name: "juedou", isCard: true }, target, player);
				},
			},
		},
	}
```

## re_zhangjiao 名字:界张角 势力:qun

### xinleiji 名字:雷击
描述: ①当你使用【闪】或【闪电】，或打出【闪】时，你可以进行判定。②当你的判定的判定牌生效后，若结果为：黑桃，你可对一名角色造成2点雷电伤害；梅花：你回复1点体力并可对一名角色造成1点雷电伤害。
```js
xinleiji: {
		group: "xinleiji_misa",
		audio: 2,
		derivation: "xinleiji_faq",
		audioname: ["boss_qinglong"],
		trigger: { player: ["useCard", "respond"] },
		filter(event, player) {
			return event.card.name == "shan" || (event.name == "useCard" && event.card.name == "shandian");
		},
		judgeCheck(card, bool) {
			var suit = get.suit(card);
			if (suit == "spade") {
				if (bool && get.number(card) > 1 && get.number(card) < 10) {
					return 5;
				}
				return 4;
			}
			if (suit == "club") {
				return 2;
			}
			return 0;
		},
		async content(event, trigger, player) {
			const judgeEvent = player.judge(lib.skill.xinleiji.judgeCheck);
			judgeEvent.judge2 = result => !!result.bool;
			await judgeEvent;
		},
		ai: {
			useShan: true,
			effect: {
				target_use(card, player, target, current) {
					let name;
					if (typeof card == "object") {
						if (card.viewAs) {
							name = card.viewAs;
						} else {
							name = get.name(card);
						}
					}
					if (
						name == "shandian" ||
						(get.tag(card, "respondShan") &&
							!player.hasSkillTag(
								"directHit_ai",
								true,
								{
									target: target,
									card: card,
								},
								true
							))
					) {
						let club = 0,
							spade = 0;
						if (
							game.hasPlayer(function (current) {
								return get.attitude(target, current) < 0 && get.damageEffect(current, target, target, "thunder") > 0;
							})
						) {
							club = 2;
							spade = 4;
						}
						if (!target.isHealthy()) {
							club += 2;
						}
						if (!club && !spade) {
							return 1;
						}
						if (name === "sha") {
							if (!target.mayHaveShan(player, "use")) {
								return;
							}
						} else if (!target.mayHaveShan(player)) {
							return 1 - 0.1 * Math.min(5, target.countCards("hs"));
						}
						if (!target.hasSkillTag("rejudge")) {
							return [1, (club + spade) / 4];
						}
						let pos = player == target || player.hasSkillTag("viewHandcard", null, target, true) ? "hes" : "e",
							better = club > spade ? "club" : "spade",
							max = 0;
						target.hasCard(function (cardx) {
							if (get.suit(cardx) == better) {
								max = 2;
								return true;
							}
							if (spade && get.color(cardx) == "black") {
								max = 1;
							}
						}, pos);
						if (max == 2) {
							return [1, Math.max(club, spade)];
						}
						if (max == 1) {
							return [1, Math.min(club, spade)];
						}
						if (pos == "e") {
							return [1, Math.min((Math.max(1, target.countCards("hs")) * (club + spade)) / 4, Math.max(club, spade))];
						}
						return [1, (club + spade) / 4];
					}
				},
				target(card, player, target) {
					let name;
					if (typeof card == "object") {
						if (card.viewAs) {
							name = card.viewAs;
						} else {
							name = get.name(card);
						}
					}
					if (name == "lebu" || name == "bingliang") {
						return [target.hasSkillTag("rejudge") ? 0.4 : 1, 2, target.hasSkillTag("rejudge") ? 0.4 : 1, 0];
					}
				},
			},
		},
	}
```

### xinguidao 名字:鬼道
描述: 一名角色的判定牌生效前，你可以打出一张黑色牌作为判定牌并获得原判定牌。若你以此法打出的牌为黑桃2-9，则你摸一张牌。
```js
xinguidao: {
		audio: 2,
		mod: {
			aiOrder(player, card, num) {
				if (num > 0 && get.itemtype(card) == "card" && get.color(card) == "black" && get.type(card) == "equip") {
					num * 1.35;
				}
			},
			aiValue(player, card, num) {
				if (num > 0 && get.itemtype(card) == "card" && get.color(card) == "black") {
					return num * 1.15;
				}
			},
			aiUseful(player, card, num) {
				if (num > 0 && get.itemtype(card) == "card" && get.color(card) == "black") {
					return num * 1.35;
				}
			},
		},
		locked: false,
		trigger: { global: "judge" },
		filter(event, player) {
			return player.hasCards("hes", { color: "black" });
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: `${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt(event.skill)}`,
					filterCard(card) {
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
					},
					position: "hes",
					ai(card) {
						const trigger = get.event().getTrigger();
						const { player, judging } = get.event();
						const result = trigger.judge(card) - trigger.judge(judging);
						const attitude = get.attitude(player, trigger.player);
						if (attitude == 0 || result == 0) {
							if (trigger.player != player) {
								return 0;
							}
							if (game.hasPlayer(current => get.attitude(player, current) < 0)) {
								const checkx = lib.skill.xinleiji.judgeCheck(card, true) - lib.skill.xinleiji.judgeCheck(judging);
								if (checkx > 0) {
									return checkx;
								}
							}
							return 0;
						}
						let val = get.value(card);
						if (get.subtype(card) == "equip2") {
							val /= 2;
						} else {
							val /= 7;
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
				player.$gain2(trigger.player.judging[0]);
				await player.gain(trigger.player.judging[0]);
				const card = cards[0];
				if (get.suit(card) == "spade" && get.number(card) > 1 && get.number(card) < 10) {
					await player.draw("nodelay");
				}
				trigger.player.judging[0] = card;
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

### xinhuangtian 名字:黄天
描述: 主公技。其他群势力角色的出牌阶段限一次，该角色可以交给你一张【闪】或黑桃手牌。
```js
xinhuangtian: {
		audio: "xinhuangtian2",
		audioname: ["zhangjiao", "re_zhangjiao"],
		global: "xinhuangtian2",
		zhuSkill: true,
	}
```

## xin_yuji 名字:界于吉 势力:qun

### reguhuo 名字:蛊惑
描述: 每名角色的回合限一次，你可以扣置一张手牌当作一张基本牌或普通锦囊牌使用或打出。其他角色同时选择是否质疑。然后，你展示此牌。若有质疑的角色：若此牌为假，则此牌作废，且所有质疑者各摸一张牌；为真，则所有质疑角色于此牌结算完成后依次弃置一张牌或失去1点体力，并获得技能〖缠怨〗。
```js
reguhuo: {
		audio: 2,
		derivation: "rechanyuan",
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			return lib.inpile.includes(name) && player.countCards("h") > 0 && !player.hasSkill("reguhuo_used");
		},
		filter(event, player) {
			if (!player.countCards("hs") || player.hasSkill("reguhuo_used")) {
				return false;
			}
			for (var i of lib.inpile) {
				var type = get.type(i);
				if ((type == "basic" || type == "trick") && event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) {
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
			dialog() {
				var list = [];
				for (var i of lib.inpile) {
					var type = get.type(i);
					if (type == "basic" || type == "trick") {
						list.push([type, "", i]);
					}
					if (i == "sha") {
						for (var j of lib.inpile_nature) {
							list.push(["基本", "", "sha", j]);
						}
					}
				}
				return ui.create.dialog("蛊惑", [list, "vcard"]);
			},
			filter(button, player) {
				var evt = _status.event.getParent();
				return evt.filterCard(get.autoViewAs({ name: button.link[2], nature: button.link[3] }, "unsure"), player, evt);
			},
			check(button) {
				var player = _status.event.player;
				var rand = _status.event.getParent().getRand("reguhuo");
				var hasEnemy = game.hasPlayer(function (current) {
					return current != player && !current.hasSkill("rechanyuan") && (get.realAttitude || get.attitude)(current, player) < 0;
				});
				var card = { name: button.link[2], nature: button.link[3] };
				var val = _status.event.getParent().type == "phase" ? player.getUseValue(card) : 1;
				if (val <= 0) {
					return 0;
				}
				if (hasEnemy && rand > 0.3) {
					if (
						!player.countCards("h", function (cardx) {
							if (card.name == cardx.name) {
								if (card.name != "sha") {
									return true;
								}
								return get.is.sameNature(card, cardx);
							}
							return false;
						})
					) {
						return 0;
					}
					return 3 * val;
				}
				return val;
			},
			backup(links, player) {
				return {
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						suit: "none",
						number: null,
					},
					filterCard(card, player, target) {
						var result = true;
						var suit = card.suit,
							number = card.number;
						card.suit = "none";
						card.number = null;
						var mod = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
						if (mod != "unchanged") {
							result = mod;
						}
						card.suit = suit;
						card.number = number;
						return result;
					},
					position: "hs",
					ignoreMod: true,
					ai1(card) {
						var player = _status.event.player;
						var hasEnemy = game.hasPlayer(function (current) {
							return current != player && !current.hasSkill("rechanyuan") && (get.realAttitude || get.attitude)(current, player) < 0;
						});
						var rand = _status.event.getRand("reguhuo");
						var cardx = lib.skill.reguhuo_backup.viewAs;
						if (hasEnemy && rand > 0.3) {
							if (card.name == cardx.name && (card.name != "sha" || get.is.sameNature(card, cardx))) {
								return 10;
							}
							return 0;
						}
						return 6 - get.value(card);
					},
					async precontent(event, trigger, player) {
						const { result } = event;
						player.logSkill("reguhuo");
						player.addTempSkill("reguhuo_guess");
						const card = result.cards[0];
						result.card.suit = get.suit(card);
						result.card.number = get.number(card);
					},
				};
			},
			prompt(links) {
				return "将一张手牌当做" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
			},
		},
		ai: {
			fireAttack: true,
			respondShan: true,
			respondSha: true,
			skillTagFilter(player) {
				if (!player.countCards("hs") || player.hasSkill("reguhuo_used")) {
					return false;
				}
			},
			order: 10,
			result: {
				player: 1,
			},
			threaten: 1.3,
		},
		subSkill: {
			backup: {},
			used: { charlotte: true },
			guess: {
				trigger: {
					player: ["useCardBefore", "respondBefore"],
				},
				forced: true,
				silent: true,
				popup: false,
				charlotte: true,
				firstDo: true,
				sourceSkill: "reguhuo",
				filter(event, player) {
					return event.skill && event.skill.indexOf("reguhuo_") == 0;
				},
				async content(event, trigger, player) {
					// step 0
					player.addTempSkill("reguhuo_used");
					event.fake = false;
					const card = trigger.cards[0];
					if (card.name != trigger.card.name || (card.name == "sha" && !get.is.sameNature(trigger.card, card))) {
						event.fake = true;
					}
					player.line(trigger.targets, get.nature(trigger.card));
					event.cardTranslate = get.translation(trigger.card.name);
					trigger.card.number = get.number(card);
					trigger.card.suit = get.suit(card);
					trigger.skill = "reguhuo_backup";
					if (trigger.card.name == "sha" && get.natureList(trigger.card).length) {
						event.cardTranslate = get.translation(trigger.card.nature) + event.cardTranslate;
					}
					player.popup(event.cardTranslate, trigger.name == "useCard" ? "metal" : "wood");
					event.prompt = "是否质疑" + get.translation(player) + "声明的" + event.cardTranslate + "？";
					game.log(player, "声明了", "#y" + event.cardTranslate);
					event.targets = game
						.filterPlayer(function (current) {
							return current != player && !current.hasSkill("rechanyuan");
						})
						.sortBySeat();
					event.targets2 = event.targets.slice(0);
					player.lose(card, ui.ordering).relatedEvent = trigger;
					if (!event.targets.length) {
						event.betrays = [];
						// Skip to step 3
						for (const i of event.targets2) {
							i.popup("不质疑", "wood");
							game.log(i, "#g不质疑");
						}
						game.delay();
						player.showCards(trigger.cards);
						return;
					}
					event.betrays = [];

					// step 1
					let list = event.targets.map(function (target) {
						return [target, [event.prompt, [["reguhuo_ally", "reguhuo_betray"], "vcard"]], true];
					});
					const result = await player
						.chooseButtonOL(list)
						.set("switchToAuto", function () {
							_status.event.result = "ai";
						})
						.set("processAI", function () {
							let choice = Math.random() > 0.5 ? "reguhuo_ally" : "reguhuo_betray";
							const playerx = _status.event.player;
							const evt = _status.event.getParent("reguhuo_guess");
							if (playerx.hp <= 1 || (evt && (get.realAttitude || get.attitude)(playerx, evt.player) >= 0)) {
								choice = "reguhuo_ally";
							}
							return {
								bool: true,
								links: [["", "", choice]],
							};
						})
						.forResult();

					// step 2
					for (const i in result) {
						if (result[i].links[0][2] == "reguhuo_betray") {
							const current = (_status.connectMode ? lib.playerOL : game.playerMap)[i];
							event.betrays.push(current);
							current.addExpose(0.2);
						}
					}

					// step 3
					for (const i of event.targets2) {
						const b = event.betrays.includes(i);
						i.popup(b ? "质疑" : "不质疑", b ? "fire" : "wood");
						game.log(i, b ? "#y质疑" : "#g不质疑");
					}
					game.delay();

					// step 4
					player.showCards(trigger.cards);
					if (event.betrays.length) {
						event.betrays.sortBySeat();
						if (event.fake) {
							game.asyncDraw(event.betrays);
							trigger.cancel();
							trigger.getParent().goto(0);
							game.log(player, "声明的", "#y" + event.cardTranslate, "作废了");
						} else {
							const next = game.createEvent("reguhuo_final", false);
							event.next.remove(next);
							trigger.after.push(next);
							next.targets = event.betrays;
							next.setContent(lib.skill.reguhuo_guess.contentx);
						}
					}

					// step 5
					game.delayx();
				},
				async contentx(event, trigger, player) {
					// process a copy of targets to mimic original step-goto loop
					const targets = (event.targets || []).slice(0);
					let result;
					while (targets.length) {
						const target = targets.shift();
						event.target = target;

						// step 0 -> await the choice
						result = await target
							.chooseToDiscard("弃置一张牌或失去1点体力")
							.set("ai", card => 9 - get.value(card))
							.forResult();

						// step 1
						if (!result.bool) {
							await target.loseHp();
						}

						// step 2
						await target.addSkills("rechanyuan");
					}
				},
			},
		},
	}
```

## re_zuoci 名字:界左慈 势力:qun

### rehuashen 名字:化身
描述: 游戏开始时，你随机获得三张未加入游戏的武将牌，选一张置于你面前并声明该武将牌的一项技能，你拥有该技能且同时将性别和势力属性变成与该武将相同直到该化身被替换。回合开始时或回合结束时，你可以选择一项：①弃置至多两张未展示的化身牌并重新获得等量化身牌；②更换所展示的化身牌或技能。（你不可声明限定技、觉醒技、隐匿技、使命技、主公技等特殊技能）。
```js
rehuashen: {
		unique: true,
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: ["enterGame", "phaseBegin", "phaseEnd"],
		},
		filter(event, player, name) {
			if (event.name != "phase") {
				return true;
			}
			if (name == "phaseBefore") {
				return game.phaseNumber == 0;
			}
			return player.storage.rehuashen?.character?.length > 0;
		},
		async cost(event, trigger, player) {
			if (trigger.name !== "phase" || event.triggername === "phaseBefore") {
				event.result = { bool: true, cost_data: ["替换当前化身"] };
				return;
			}
			const prompt = "###" + get.prompt(event.skill) + '###<div class="text center">替换当前化身牌或制衡至多两张其他化身牌</div>';
			const result = await player
				.chooseControl("替换当前化身", "制衡其他化身", "cancel2")
				.set("ai", () => {
					const { player, cond } = get.event();
					let skills = player.storage.rehuashen.character.map(i => get.character(i).skills).flat();
					skills.randomSort();
					skills.sort((a, b) => get.skillRank(b, cond) - get.skillRank(a, cond));
					if (skills[0] === player.storage.rehuashen.current2 || get.skillRank(skills[0], cond) < 1) {
						return "制衡其他化身";
					}
					return "替换当前化身";
				})
				.set("cond", event.triggername)
				.set("prompt", prompt)
				.forResult();
			const control = result.control;
			event.result = { bool: typeof control === "string" && control !== "cancel2", cost_data: control };
		},
		async content(event, trigger, player) {
			let choice = event.cost_data;
			if (Array.isArray(choice)) {
				lib.skill.rehuashen.addHuashens(player, 3);
				[choice] = choice;
			}
			_status.noclearcountdown = true;
			const id = lib.status.videoId++,
				prompt = choice === "替换当前化身" ? "化身：请选择你要更换的武将牌" : "化身：选择制衡至多两张武将牌";
			const cards = player.storage.rehuashen.character;
			if (player.isOnline2()) {
				player.send(
					(cards, prompt, id) => {
						const dialog = ui.create.dialog(prompt, [cards, lib.skill.rehuashen.$createButton]);
						dialog.videoId = id;
					},
					cards,
					prompt,
					id
				);
			}
			const dialog = ui.create.dialog(prompt, [cards, lib.skill.rehuashen.$createButton]);
			dialog.videoId = id;
			if (!event.isMine()) {
				dialog.style.display = "none";
			}
			if (choice === "替换当前化身") {
				const buttons = dialog.content.querySelector(".buttons");
				const array = dialog.buttons.filter(item => !item.classList.contains("nodisplay") && item.style.display !== "none");
				const choosed = player.storage.rehuashen.choosed;
				const groups = array
					.map(i => get.character(i.link).group)
					.unique()
					.sort((a, b) => {
						const getNum = g => (lib.group.includes(g) ? lib.group.indexOf(g) : lib.group.length);
						return getNum(a) - getNum(b);
					});
				if (choosed.length > 0 || groups.length > 1) {
					dialog.style.bottom = (parseInt(dialog.style.top || "0", 10) + get.is.phoneLayout() ? 230 : 220) + "px";
					dialog.addPagination({
						data: array,
						totalPageCount: groups.length + Math.sign(choosed.length),
						container: dialog.content,
						insertAfter: buttons,
						onPageChange(state) {
							const { pageNumber, data, pageElement } = state;
							const { groups, choosed } = pageElement;
							data.forEach(item => {
								item.classList[
									(() => {
										const name = item.link,
											goon = choosed.length > 0;
										if (goon && pageNumber === 1) {
											return choosed.includes(name);
										}
										const group = get.character(name).group;
										return groups.indexOf(group) + (1 + goon) === pageNumber;
									})()
										? "remove"
										: "add"
								]("nodisplay");
							});
							ui.update();
						},
						pageLimitForCN: ["←", "→"],
						pageNumberForCN: (choosed.length > 0 ? ["常用"] : []).concat(
							groups.map(i => {
								const isChineseChar = char => {
									const regex = /[\u4e00-\u9fff\u3400-\u4dbf\ud840-\ud86f\udc00-\udfff\ud870-\ud87f\udc00-\udfff\ud880-\ud88f\udc00-\udfff\ud890-\ud8af\udc00-\udfff\ud8b0-\ud8bf\udc00-\udfff\ud8c0-\ud8df\udc00-\udfff\ud8e0-\ud8ff\udc00-\udfff\ud900-\ud91f\udc00-\udfff\ud920-\ud93f\udc00-\udfff\ud940-\ud97f\udc00-\udfff\ud980-\ud9bf\udc00-\udfff\ud9c0-\ud9ff\udc00-\udfff]/u;
									return regex.test(char);
								}; //友情提醒：regex为基本汉字区间到扩展G区的Unicode范围的正则表达式，非加密/混淆
								const str = get.plainText(lib.translate[i + "2"] || lib.translate[i] || "无");
								return isChineseChar(str.slice(0, 1)) ? str.slice(0, 1) : str;
							})
						),
						changePageEvent: "click",
						pageElement: {
							groups: groups,
							choosed: choosed,
						},
					});
				}
			}
			const finish = () => {
				if (player.isOnline2()) {
					player.send("closeDialog", id);
				}
				dialog.close();
				delete _status.noclearcountdown;
				if (!_status.noclearcountdown) {
					game.stopCountChoose();
				}
			};
			while (true) {
				const next = player.chooseButton(true).set("dialog", id);
				if (choice === "制衡其他化身") {
					next.set("selectButton", [1, 2]);
					next.set("filterButton", button => button.link !== get.event().current);
					next.set("current", player.storage.rehuashen.current);
				} else {
					next.set("ai", button => {
						const { player, cond } = get.event();
						let skills = player.storage.rehuashen.character.map(i => get.character(i).skills).flat();
						skills.randomSort();
						skills.sort((a, b) => get.skillRank(b, cond) - get.skillRank(a, cond));
						return player.storage.rehuashen.map[button.link].includes(skills[0]) ? 2.5 : 1 + Math.random();
					});
					next.set("cond", event.triggername);
				}
				const result = await next.forResult();
				if (choice === "制衡其他化身") {
					finish();
					lib.skill.rehuashen.removeHuashen(player, result.links);
					lib.skill.rehuashen.addHuashens(player, result.links.length);
					return;
				} else {
					const card = result.links[0];
					const func = function (card, id) {
						const dialog = get.idDialog(id);
						if (dialog) {
							//禁止翻页
							const paginationInstance = dialog.paginationMap?.get(dialog.content.querySelector(".buttons"));
							if (paginationInstance?.state) {
								paginationInstance.state.pageRefuseChanged = true;
							}
							for (let i = 0; i < dialog.buttons.length; i++) {
								if (dialog.buttons[i].link == card) {
									dialog.buttons[i].classList.add("selectedx");
								} else {
									dialog.buttons[i].classList.add("unselectable");
								}
							}
						}
					};
					if (player.isOnline2()) {
						player.send(func, card, id);
					} else if (event.isMine()) {
						func(card, id);
					}
					const result2 = await player
						.chooseControl(player.storage.rehuashen.map[card], "返回")
						.set("ai", () => {
							const { player, cond, controls } = get.event();
							let skills = controls.slice();
							skills.randomSort();
							skills.sort((a, b) => get.skillRank(b, cond) - get.skillRank(a, cond));
							return skills[0];
						})
						.set("cond", event.triggername)
						.forResult();
					const control = result2.control;
					if (control === "返回") {
						const func2 = function (card, id) {
							const dialog = get.idDialog(id);
							if (dialog) {
								//允许翻页
								const paginationInstance = dialog.paginationMap?.get(dialog.content.querySelector(".buttons"));
								if (paginationInstance?.state) {
									paginationInstance.state.pageRefuseChanged = false;
								}
								for (let i = 0; i < dialog.buttons.length; i++) {
									dialog.buttons[i].classList.remove("selectedx");
									dialog.buttons[i].classList.remove("unselectable");
								}
							}
						};
						if (player.isOnline2()) {
							player.send(func2, card, id);
						} else if (event.isMine()) {
							func2(card, id);
						}
					} else {
						finish();
						player.storage.rehuashen.choosed.add(card);
						if (player.storage.rehuashen.current != card) {
							const old = player.storage.rehuashen.current;
							player.storage.rehuashen.current = card;
							game.broadcastAll(
								(player, character, old) => {
									player.tempname.remove(old);
									player.tempname.add(character);
									player.sex = lib.character[character][0];
								},
								player,
								card,
								old
							);
							game.log(player, "将性别变为了", "#y" + get.translation(get.character(card).sex) + "性");
							player.changeGroup(get.character(card).group);
						}
						player.storage.rehuashen.current2 = control;
						if (!player.additionalSkills.rehuashen?.includes(control)) {
							player.flashAvatar("rehuashen", card);
							player.syncStorage("rehuashen");
							player.updateMarks("rehuashen");
							await player.addAdditionalSkills("rehuashen", control);
							// lib.skill.rehuashen.createAudio(card,link,'re_zuoci');
						}
						return;
					}
				}
			}
		},
		init(player, skill) {
			if (!player.storage[skill]) {
				player.storage[skill] = {
					character: [],
					choosed: [],
					map: {},
				};
			}
		},
		banned: ["lisu", "sp_xiahoudun", "xushao", "jsrg_xushao", "zhoutai", "old_zhoutai", "shixie", "xin_zhoutai", "dc_shixie", "old_shixie"],
		bannedType: ["Charlotte", "主公技", "觉醒技", "限定技", "隐匿技", "使命技"],
		addHuashen(player) {
			if (!player.storage.rehuashen) {
				return;
			}
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			_status.characterlist.randomSort();
			for (let i = 0; i < _status.characterlist.length; i++) {
				let name = _status.characterlist[i];
				if (name.indexOf("zuoci") != -1 || name.indexOf("key_") == 0 || name.indexOf("sp_key_") == 0 || get.is.double(name) || lib.skill.rehuashen.banned.includes(name) || player.storage.rehuashen.character.includes(name)) {
					continue;
				}
				let skills = lib.character[name][3].filter(skill => {
					const categories = get.skillCategoriesOf(skill, player);
					return !categories.some(type => lib.skill.rehuashen.bannedType.includes(type));
				});
				if (skills.length) {
					player.storage.rehuashen.character.push(name);
					player.storage.rehuashen.map[name] = skills;
					_status.characterlist.remove(name);
					return name;
				}
			}
		},
		addHuashens(player, num) {
			var list = [];
			for (var i = 0; i < num; i++) {
				var name = lib.skill.rehuashen.addHuashen(player);
				if (name) {
					list.push(name);
				}
			}
			if (list.length) {
				player.syncStorage("rehuashen");
				player.updateMarks("rehuashen");
				game.log(player, "获得了", get.cnNumber(list.length) + "张", "#g化身");
				lib.skill.rehuashen.drawCharacter(player, list);
			}
		},
		removeHuashen(player, links) {
			player.storage.rehuashen.character.removeArray(links);
			_status.characterlist.addArray(links);
			game.log(player, "移去了", get.cnNumber(links.length) + "张", "#g化身");
		},
		drawCharacter(player, list) {
			game.broadcastAll(
				function (player, list) {
					if (player.isUnderControl(true)) {
						var cards = [];
						for (var i = 0; i < list.length; i++) {
							var cardname = "huashen_card_" + list[i];
							lib.card[cardname] = {
								fullimage: true,
								image: "character:" + list[i],
							};
							lib.translate[cardname] = get.rawName2(list[i]);
							cards.push(game.createCard(cardname, "", ""));
						}
						player.$draw(cards, "nobroadcast");
					}
				},
				player,
				list
			);
		},
		$createButton(item, type, position, noclick, node) {
			node = ui.create.buttonPresets.character(item, "character", position, noclick);
			const info = lib.character[item];
			const skills = info[3].filter(function (skill) {
				const categories = get.skillCategoriesOf(skill, get.player());
				return !categories.some(type => lib.skill.rehuashen.bannedType.includes(type));
			});
			if (skills.length) {
				const skillstr = skills.map(i => `[${get.translation(i)}]`).join("<br>");
				const skillnode = ui.create.caption(`<div class="text" data-nature=${get.groupnature(info[1], "raw")}m style="font-family: ${lib.config.name_font || "xinwei"},xinwei">${skillstr}</div>`, node);
				skillnode.style.left = "2px";
				skillnode.style.bottom = "2px";
			}
			node._customintro = function (uiintro, evt) {
				const character = node.link,
					characterInfo = get.character(node.link);
				let capt = get.translation(character);
				if (characterInfo) {
					capt += `&nbsp;&nbsp;${get.translation(characterInfo.sex)}`;
					let charactergroup;
					const charactergroups = get.is.double(character, true);
					if (charactergroups) {
						charactergroup = charactergroups.map(i => get.translation(i)).join("/");
					} else {
						charactergroup = get.translation(characterInfo.group);
					}
					capt += `&nbsp;&nbsp;${charactergroup}`;
				}
				uiintro.add(capt);

				if (lib.characterTitle[node.link]) {
					uiintro.addText(get.colorspan(lib.characterTitle[node.link]));
				}
				for (let i = 0; i < skills.length; i++) {
					if (lib.translate[skills[i] + "_info"]) {
						let translation = lib.translate[skills[i] + "_ab"] || get.translation(skills[i]).slice(0, 2);
						if (lib.skill[skills[i]] && lib.skill[skills[i]].nobracket) {
							uiintro.add('<div><div class="skilln">' + get.translation(skills[i]) + "</div><div>" + get.skillInfoTranslation(skills[i], null, false) + "</div></div>");
						} else {
							uiintro.add('<div><div class="skill">【' + translation + "】</div><div>" + get.skillInfoTranslation(skills[i], null, false) + "</div></div>");
						}
						if (lib.translate[skills[i] + "_append"]) {
							uiintro._place_text = uiintro.add('<div class="text">' + lib.translate[skills[i] + "_append"] + "</div>");
						}
					}
				}
			};
			return node;
		},
		// createAudio:(character,skillx,name)=>{
		// 	var skills=game.expandSkills([skillx]);
		// 	skills=skills.filter(skill=>get.info(skill));
		// 	if(!skills.length) return;
		// 	var skillss=skills.filter(skill=>get.info(skill).derivation);
		// 	if(skillss.length){
		// 		skillss.forEach(skill=>{
		// 			var derivationSkill=get.info(skill).derivation;
		// 			skills[Array.isArray(derivationSkill)?'addArray':'add'](derivationSkill);
		// 		});
		// 	}
		// 	skills.forEach(skill=>{
		// 		var info=lib.skill[skill];
		// 		if(info){
		// 			if(!info.audioname2) info.audioname2={};
		// 			if(info.audioname&&info.audioname.includes(character)){
		// 				if(info.audio){
		// 					if(typeof info.audio=='string') skill=info.audio;
		// 					if(Array.isArray(info.audio)) skill=info.audio[0];
		// 				}
		// 				if(!lib.skill[skill+'_'+character]) lib.skill[skill+'_'+character]={audio:2};
		// 				info.audioname2[name]=(skill+'_'+character);
		// 			}
		// 			else if(info.audioname2[character]){
		// 				info.audioname2[name]=info.audioname2[character];
		// 			}
		// 			else{
		// 				if(info.audio){
		// 					if(typeof info.audio=='string') skill=info.audio;
		// 					if(Array.isArray(info.audio)) skill=info.audio[0];
		// 				}
		// 				info.audioname2[name]=skill;
		// 			}
		// 		}
		// 	});
		// },
		mark: true,
		intro: {
			onunmark(storage, player) {
				_status.characterlist.addArray(storage.character);
				storage.character = [];
				const name = player.name ? player.name : player.name1;
				if (name) {
					const sex = get.character(name).sex;
					const group = get.character(name).group;
					if (player.sex !== sex) {
						game.broadcastAll(
							(player, sex) => {
								player.sex = sex;
							},
							player,
							sex
						);
						game.log(player, "将性别变为了", "#y" + get.translation(sex) + "性");
					}
					if (player.group !== group) {
						game.broadcastAll(
							(player, group) => {
								player.group = group;
								player.node.name.dataset.nature = get.groupnature(group);
							},
							player,
							group
						);
						game.log(player, "将势力变为了", "#y" + get.translation(group + 2));
					}
				}
			},
			mark(dialog, storage, player) {
				if (storage && storage.current) {
					dialog.addSmall([[storage.current], (item, type, position, noclick, node) => lib.skill.rehuashen.$createButton(item, type, position, noclick, node)]);
				}
				if (storage && storage.current2) {
					dialog.add('<div><div class="skill">【' + get.translation(lib.translate[storage.current2 + "_ab"] || get.translation(storage.current2).slice(0, 2)) + "】</div><div>" + get.skillInfoTranslation(storage.current2, player, false) + "</div></div>");
				}
				if (storage && storage.character.length) {
					if (player.isUnderControl(true)) {
						dialog.addSmall([storage.character, (item, type, position, noclick, node) => lib.skill.rehuashen.$createButton(item, type, position, noclick, node)]);
					} else {
						dialog.addText("共有" + get.cnNumber(storage.character.length) + "张“化身”");
					}
				} else {
					return "没有化身";
				}
			},
			content(storage, player) {
				return "共有" + get.cnNumber(storage.character.length) + "张“化身”";
			},
			markcount(storage, player) {
				if (storage && storage.character) {
					return storage.character.length;
				}
				return 0;
			},
		},
	}
```

### rexinsheng 名字:新生
描述: 当你受到1点伤害后，你可以获得一张新的化身牌。
```js
rexinsheng: {
		inherit: "xinsheng",
		async content(event, trigger, player) {
			lib.skill.rehuashen.addHuashens(player, 1);
		},
		ai: { combo: "rehuashen" },
	}
```

## ol_xiahouyuan 名字:界夏侯渊 势力:wei

### xinshensu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### shebian 名字:设变
描述: 当你的武将牌翻面后，你可以移动场上的一张装备牌。
```js
shebian: {
		audio: 2,
		trigger: { player: "turnOverEnd" },
		check(event, player) {
			return player.canMoveCard(true, true);
		},
		filter(event, player) {
			return player.canMoveCard(null, true);
		},
		async content(event, trigger, player) {
			await player.moveCard().set("nojudge", true);
		},
	}
```

## caoren 名字:界曹仁 势力:wei

### xinjushou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### xinjiewei
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_weiyan 名字:界魏延 势力:shu

### xinkuanggu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### reqimou 名字:奇谋
描述: 限定技，出牌阶段，你可以失去任意点体力并摸等量的牌，然后直到回合结束，你计算与其他角色的距离时-X，且你可以多使用X张【杀】（X为你失去的体力值）。
```js
reqimou: {
		limited: true,
		audio: 2,
		enable: "phaseUse",
		skillAnimation: true,
		animationColor: "orange",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const result = await player
				.chooseNumbers(get.prompt(event.name), [{ prompt: "请选择你要失去的体力值", min: 1, max: player.getHp() }], true)
				.set("processAI", () => {
					const player = get.player();
					let num = player.getHp() - 1;
					if (player.countCards("hs", { name: ["tao", "jiu"] })) {
						num = player.getHp();
					}
					return [num];
				})
				.forResult();
			const number = result.numbers[0];
			player.storage.reqimou2 = number;
			await player.loseHp(number);
			await player.draw(number);
			player.addTempSkill("reqimou2");
		},
		ai: {
			order: 14,
			result: {
				player(player) {
					if (player.hp < 3) {
						return false;
					}
					var mindist = player.hp;
					if (player.countCards("hs", card => player.canSaveCard(card, player))) {
						mindist++;
					}
					if (
						game.hasPlayer(function (current) {
							return get.distance(player, current) <= mindist && player.canUse("sha", current, false) && get.effect(current, { name: "sha" }, player, player) > 0;
						})
					) {
						return 1;
					}
					return 0;
				},
			},
		},
	}
```

## ol_xiaoqiao 名字:界小乔 势力:wu

### oltianxiang 名字:天香
描述: 当你受到伤害时，你可以弃置一张红桃牌，防止此伤害并选择一名其他角色，然后你选择一项：1.令其受到伤害来源对其造成的1点伤害，然后摸X张牌（X为其已损失体力值且至多为5）；2.令其失去1点体力，然后获得你弃置的牌。
```js
oltianxiang: {
		audio: "tianxiang",
		audioname: ["daxiaoqiao", "re_xiaoqiao", "ol_xiaoqiao"],
		trigger: { player: "damageBegin4" },
		direct: true,
		filter(event, player) {
			return (
				player.countCards("he", function (card) {
					if (_status.connectMode && get.position(card) == "h") {
						return true;
					}
					return get.suit(card, player) == "heart";
				}) > 0 && event.num > 0
			);
		},
		async content(event, trigger, player) {
			// step 0
			const result = await player
				.chooseCardTarget({
					filterCard(card, player) {
						return get.suit(card) == "heart" && lib.filter.cardDiscardable(card, player);
					},
					filterTarget(card, player, target) {
						return player != target;
					},
					position: "he",
					ai1(card) {
						return 10 - get.value(card);
					},
					ai2(target) {
						var att = get.attitude(_status.event.player, target);
						var trigger = _status.event.getTrigger();
						var da = 0;
						if (_status.event.player.hp == 1) {
							da = 10;
						}
						var eff = get.damageEffect(target, trigger.source, target);
						if (att == 0) {
							return 0.1 + da;
						}
						if (eff >= 0 && att > 0) {
							return att + da;
						}
						if (att > 0 && target.hp > 1) {
							if (target.maxHp - target.hp >= 3) {
								return att * 1.1 + da;
							}
							if (target.maxHp - target.hp >= 2) {
								return att * 0.9 + da;
							}
						}
						return -att + da;
					},
					prompt: get.prompt("oltianxiang"),
					prompt2: lib.translate.oltianxiang_info,
				})
				.forResult();
			// step 1
			if (result.bool) {
				await player.discard(result.cards);
				var target = result.targets[0];
				const result2 = await player
					.chooseControlList(
						true,
						function (event, player) {
							var target = _status.event.target;
							var att = get.attitude(player, target);
							if (target.hasSkillTag("maihp")) {
								att = -att;
							}
							if (att > 0) {
								return 0;
							} else {
								return 1;
							}
						},
						["令" + get.translation(target) + "受到伤害来源对其造成的1点伤害，然后摸X张牌（X为其已损失体力值且至多为5）", "令" + get.translation(target) + "失去1点体力，然后获得" + get.translation(result.cards)]
					)
					.set("target", target)
					.forResult();
				player.logSkill(event.name, target);
				trigger.cancel();
				event.target = target;
				event.card = result.cards[0];
				// step 2
				if (typeof result2.index == "number") {
					event.index = result2.index;
					if (result2.index) {
						event.related = event.target.loseHp();
					} else {
						const param = trigger.source ? { source: trigger.source, nocard: true } : { nosource: true, nocard: true };
						event.related = event.target.damage(param);
					}
					await event.related;
				} else {
					return;
				}
				// step 3
				if (event.related.cancelled || target.isDead()) {
					return;
				}
				if (event.index && event.card.isInPile()) {
					await target.gain(event.card, "gain2");
				} else if (target.getDamagedHp()) {
					await target.draw({ num: Math.min(5, target.getDamagedHp()) });
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
	}
```

### olhongyan 名字:红颜
描述: 锁定技，你的黑桃牌的花色视为红桃。若你的装备区内有红桃牌，则你的手牌上限基数视为体力上限。
```js
olhongyan: {
		audio: "rehongyan",
		mod: {
			suit(card, suit) {
				if (suit == "spade") {
					return "heart";
				}
			},
			maxHandcardBase(player, num) {
				if (
					player.countCards("e", function (card) {
						return get.suit(card, player) == "heart";
					})
				) {
					return player.maxHp;
				}
			},
		},
	}
```

### piaoling 名字:飘零
描述: 结束阶段，你可以进行判定。若判定结果为红桃，则你选择一项：1.将此牌交给一名角色。若你交给了自己，则你弃置一张牌。2.将此牌置于牌堆顶。
```js
piaoling: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		async content(event, trigger, player) {
			const result = await player
				.judge(function (card) {
					return get.suit(card) == "heart" ? 2 : 0;
				})
				.set("judge2", function (result) {
					return result.bool ? true : false;
				})
				.forResult();
			if (result?.card && result.suit == "heart") {
				const { card } = result;
				if (get.position(card, true) == "d") {
					const result2 = await player
						.chooseTarget("飘零：令一名角色获得" + get.translation(card) + "，或点【取消】将其置于牌堆顶")
						.set("ai", function (target) {
							var player = _status.event.player;
							var att = get.attitude(player, target);
							if (player == target) {
								att /= 2;
							}
							return att;
						})
						.forResult();
					if (result2.bool && result2.targets?.length) {
						const {
							targets: [target],
						} = result2;
						player.line(target, "green");
						await target.gain(card, "gain2");
						if (player == target) {
							await player.chooseToDiscard("he", true);
						}
					} else {
						game.log(player, "将", card, "置于牌堆顶");
						await game.cardsGotoPile(card, "insert");
					}
				}
			}
		},
	}
```

## zhoutai 名字:界周泰 势力:wu

### buqu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### fenji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_pangde 名字:界庞德 势力:qun

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rejianchu 名字:鞬出
描述: 当你使用【杀】指定一名角色为目标后，你可以弃置其一张牌，若以此法弃置的牌不为基本牌，此【杀】不可被【闪】响应且你本回合使用【杀】的次数上限+1，为基本牌，该角色获得此【杀】。
```js
rejianchu: {
		audio: 2,
		audioname: ["re_pangde"],
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return event.card.name == "sha" && event.target.countDiscardableCards(player, "he") > 0;
		},
		direct: true,
		async content(event, trigger, player) {
			// step 0
			const result = await player
				.discardPlayerCard(trigger.target, get.prompt("rejianchu", trigger.target))
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
				.set("logSkill", ["rejianchu", trigger.target])
				.set("att", get.attitude(player, trigger.target) <= 0)
				.forResult();
			// step 1
			if (result.bool && result.links && result.links.length) {
				if (get.type(result.links[0], null, result.links[0].original == "h" ? player : false) != "basic") {
					trigger.getParent().directHit.add(trigger.target);
					player.addTempSkill("rejianchu2");
					player.addMark("rejianchu2", 1, false);
				} else if (trigger.cards) {
					var list = [];
					for (var i = 0; i < trigger.cards.length; i++) {
						if (get.position(trigger.cards[i], true) == "o") {
							list.push(trigger.cards[i]);
						}
					}
					if (list.length) {
						await trigger.target.gain(list, "gain2", "log");
					}
				}
			}
		},
		ai: {
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
	}
```

## ol_xuhuang 名字:界徐晃 势力:wei

### olduanliang 名字:断粮
描述: 你可以将一张黑色非锦囊牌当做【兵粮寸断】使用。若你于当前回合内未造成过伤害，则你使用【兵粮寸断】无距离限制。
```js
olduanliang: {
		audio: 2,
		locked: false,
		enable: "chooseToUse",
		filterCard(card) {
			return get.type2(card) != "trick" && get.color(card) == "black";
		},
		filter(event, player) {
			return player.hasCard(card => get.type2(card) != "trick" && get.color(card) == "black", "hes");
		},
		position: "hes",
		viewAs: { name: "bingliang" },
		prompt: "将一张黑色非锦囊牌当做兵粮寸断使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: {
			order: 9,
		},
		mod: {
			targetInRange(card, player, target) {
				if (card.name == "bingliang" && !player.getStat("damage")) {
					return true;
				}
			},
		},
	}
```

### oljiezi 名字:截辎
描述: ①当有角色跳过摸牌阶段后，你可选择一名角色。若该角色：手牌数为全场最少且没有“辎”，则其获得一枚“辎”。否则其摸一张牌。②一名角色的摸牌阶段结束时，若其有“辎”，则你移去其“辎”，然后令其获得一个额外的摸牌阶段。
```js
oljiezi: {
		audio: 2,
		trigger: { global: ["phaseDrawSkipped", "phaseDrawCancelled"] },
		direct: true,
		async content(event, trigger, player) {
			let result = await player
				.chooseTarget(get.prompt("oljiezi"), "你可选择一名角色。若该角色：手牌数为全场最少且没有“辎”，则其获得一枚“辎”。否则其摸一张牌。")
				.set("ai", function (target) {
					var att = get.attitude(_status.event.player, target);
					if (!target.hasMark("oljiezi") && target.isMinHandcard()) {
						att *= 2;
					}
					return att;
				})
				.forResult();
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("oljiezi", target);
				if (!target.hasMark("oljiezi") && target.isMinHandcard()) {
					target.addMark("oljiezi", 1);
				} else {
					target.draw();
				}
			}
		},
		marktext: "辎",
		intro: {
			name2: "辎",
			content: "mark",
			onunmark: true,
		},
		group: "oljiezi_extra",
		subSkill: {
			extra: {
				audio: "oljiezi",
				trigger: { global: "phaseDrawAfter" },
				forced: true,
				filter(event, player) {
					return event.player.hasMark("oljiezi");
				},
				logTarget: "player",
				async content(event, trigger, player) {
					const evt = trigger.getParent("phase", true, true);
					if (evt?.phaseList) {
						evt.phaseList.splice(evt.num + 1, 0, "phaseDraw|oljiezi");
					}
					trigger.player.removeMark("oljiezi", trigger.player.countMark("oljiezi"));
				},
			},
		},
	}
```

## ol_sp_zhugeliang 名字:界卧龙 势力:shu

### bazhen
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### olhuoji 名字:火计
描述: ①你可以将一张红色牌当【火攻】使用。②你使用【火攻】的作用效果改为“目标角色随机展示一张手牌A，然后你可以弃置一张与A颜色相同的手牌，对目标造成1点火属性伤害”。
```js
olhuoji: {
		audio: "rehuoji",
		audioname: ["ol_sp_zhugeliang", "ol_pangtong"],
		trigger: { player: "huogongBegin" },
		forced: true,
		locked: false,
		popup: false,
		group: "olhuoji_viewAs",
		async content(event, trigger, player) {
			trigger.set("chooseToShow", async (event, player, target) => {
				const { showPosition = "h" } = event;
				const cards = target.getCards(showPosition).randomGets(1);
				return { bool: true, cards: cards };
			});
			trigger.set("filterDiscard", card => {
				const { cards2 } = get.event().getParent("huogong", true);
				return get.color(card) == get.color(cards2[0]);
			});
		},
		async huogongContent(event, trigger, player) {
			const { target } = event;
			if (target.countCards("h") == 0) {
				return;
			}
			const cards = target.getCards("h").randomGets(1),
				card = cards[0];
			await target.showCards(cards).setContent(function () {});
			event.dialog = ui.create.dialog(get.translation(target) + "展示的手牌", cards);
			event.videoId = lib.status.videoId++;

			game.broadcast("createDialog", event.videoId, get.translation(target) + "展示的手牌", cards);
			game.addVideo("cardDialog", null, [get.translation(target) + "展示的手牌", get.cardsInfo(cards), event.videoId]);
			game.log(target, "展示了", card);
			const result = await player
				.chooseToDiscard({ color: get.color(card) }, "h", function (card) {
					var evt = _status.event.getParent();
					if (get.damageEffect(evt.target, evt.player, evt.player, "fire") > 0) {
						return 7 - get.value(card, evt.player);
					}
					return -1;
				})
				.set("prompt", false)
				.forResult();
			//game.delay(2);
			if (result?.bool) {
				await target.damage("fire");
			} else {
				target.addTempSkill("huogong2");
			}
			event.dialog.close();
			game.addVideo("cardDialog", null, event.videoId);
			game.broadcast("closeDialog", event.videoId);
		},
		subSkill: { viewAs: { inherit: "rehuoji", audio: "rehuoji" } },
	}
```

### olkanpo 名字:看破
描述: ①你可以将一张黑色牌当【无懈可击】使用。②你使用的【无懈可击】不可被响应。
```js
olkanpo: {
		audio: "rekanpo",
		audioname: ["ol_sp_zhugeliang", "ol_pangtong"],
		trigger: { player: "useCard" },
		forced: true,
		locked: false,
		popup: false,
		group: "olkanpo_viewAs",
		filter(event, player) {
			return event.card.name == "wuxie";
		},
		async content(event, trigger, player) {
			trigger.directHit.addArray(game.players);
		},
		subSkill: { viewAs: { inherit: "rekanpo", audio: "rekanpo" } },
	}
```

### cangzhuo 名字:藏拙
描述: 弃牌阶段开始时，若你本回合内没有使用过锦囊牌，则你的锦囊牌不计入手牌上限。
```js
cangzhuo: {
		trigger: { player: "phaseDiscardBegin" },
		frequent: true,
		audio: 2,
		filter(event, player) {
			return (
				player.getHistory("useCard", function (card) {
					return get.type(card.card, "trick") == "trick";
				}).length == 0
			);
		},
		async content(event, trigger, player) {
			player.addTempSkill("cangzhuo2");
		},
	}
```

## ol_yanwen 名字:界颜良文丑 势力:qun

### olshuangxiong 名字:双雄
描述: ①摸牌阶段结束时，你可以弃置一张牌。若如此做，你本回合内可以将一张与此牌颜色不同的牌当做【决斗】使用。②结束阶段，你从弃牌堆中获得本回合内对你造成伤害的所有牌。
```js
olshuangxiong: {
		audio: 2,
		trigger: { player: "phaseDrawEnd" },
		filter: (event, player) => player.countCards("he") > 0,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("he", get.prompt("olshuangxiong"), "弃置一张牌，然后你本回合内可以将一张与此牌颜色不同的牌当做【决斗】使用", "chooseonly")
				.set("ai", function (card) {
					let player = _status.event.player;
					if (!_status.event.goon || player.skipList.includes("phaseUse")) {
						return -get.value(card);
					}
					let color = get.color(card),
						effect = 0,
						cards = player.getCards("hes"),
						sha = false;
					for (const cardx of cards) {
						if (cardx == card || get.color(cardx) == color) {
							continue;
						}
						const cardy = get.autoViewAs({ name: "juedou" }, [cardx]),
							eff1 = player.getUseValue(cardy);
						if (get.position(cardx) == "e") {
							let eff2 = get.value(cardx);
							if (eff1 > eff2) {
								effect += eff1 - eff2;
							}
							continue;
						} else if (get.name(cardx) == "sha") {
							if (sha) {
								effect += eff1;
								continue;
							} else {
								sha = true;
							}
						}
						let eff2 = player.getUseValue(cardx, null, true);
						if (eff1 > eff2) {
							effect += eff1 - eff2;
						}
					}
					return effect - get.value(card);
				})
				.set("goon", player.hasValueTarget({ name: "juedou" }) && !player.hasSkill("olshuangxiong_effect"))
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event,
				color = get.color(cards[0], player);
			await player.modedDiscard(cards);
			player.markAuto("olshuangxiong_effect", [color]);
			player.addTempSkill("olshuangxiong_effect");
		},
		group: "olshuangxiong_jianxiong",
		subSkill: {
			effect: {
				audio: "olshuangxiong",
				enable: "chooseToUse",
				viewAs: { name: "juedou" },
				position: "hes",
				viewAsFilter(player) {
					return player.hasCard(card => lib.skill.olshuangxiong_effect.filterCard(card, player), "hes");
				},
				filterCard(card, player) {
					const color = get.color(card),
						colors = player.getStorage("olshuangxiong_effect");
					for (const i of colors) {
						if (color != i) {
							return true;
						}
					}
					return false;
				},
				prompt() {
					const colors = _status.event.player.getStorage("olshuangxiong_effect");
					let str = "将一张颜色";
					for (let i = 0; i < colors.length; i++) {
						if (i > 0) {
							str += "或";
						}
						str += "不为";
						str += get.translation(colors[i]);
					}
					str += "的牌当做【决斗】使用";
					return str;
				},
				check(card) {
					const player = _status.event.player;
					if (get.position(card) == "e") {
						const raw = get.value(card);
						const eff = player.getUseValue(get.autoViewAs({ name: "juedou" }, [card]));
						return eff - raw;
					}
					const raw = player.getUseValue(card, null, true);
					const eff = player.getUseValue(get.autoViewAs({ name: "juedou" }, [card]));
					return eff - raw;
				},
				onremove: true,
				charlotte: true,
				ai: { order: 7 },
			},
			jianxiong: {
				audio: "olshuangxiong",
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				locked: false,
				filter(event, player) {
					return player.hasHistory("damage", function (evt) {
						//Disable Umi Kato's chaofan
						return evt.card && evt.cards && evt.cards.some(card => get.position(card, true));
					});
				},
				async content(event, trigger, player) {
					const cards = [];
					player.getHistory("damage", function (evt) {
						if (evt.card && evt.cards) {
							cards.addArray(evt.cards.filterInD("d"));
						}
					});
					if (cards.length) {
						await player.gain(cards, "gain2");
					}
				},
			},
		},
	}
```

## ol_yuanshao 名字:界袁绍 势力:qun

### olluanji 名字:乱击
描述: 你可以将两张花色相同的手牌当做【万箭齐发】使用。当你使用【万箭齐发】选择目标后，你可以为此牌减少一个目标。
```js
olluanji: {
		inherit: "luanji",
		audioname2: { shen_caopi: "olluanji_shen_caopi" },
		audio: 2,
		line: false,
		group: "olluanji_remove",
		check(card) {
			return 7 - get.value(card);
		},
	}
```

### olxueyi 名字:血裔
描述: 主公技，锁定技。①游戏开始时，你获得2X个“裔”标记（X为场上群势力角色的数目）。②出牌阶段开始时，你可以移去一个“裔”标记，然后摸一张牌。③你的手牌上限+Y（Y为“裔”标记数）。
```js
olxueyi: {
		audio: 2,
		trigger: { global: "phaseBefore", player: "enterGame" },
		forced: true,
		zhuSkill: true,
		filter(event, player) {
			return (event.name != "phase" || game.phaseNumber == 0) && player.hasZhuSkill("olxueyi");
		},
		async content(event, trigger, player) {
			const num = game.countPlayer(current => current.group == "qun");
			if (num) {
				player.addMark("olxueyi", num * 2);
			}
		},
		marktext: "裔",
		intro: {
			name2: "裔",
			content: "mark",
		},
		mod: {
			maxHandcard(player, num) {
				if (player.hasZhuSkill("olxueyi")) {
					return num + player.countMark("olxueyi");
				}
			},
		},
		group: "olxueyi_draw",
		subSkill: {
			draw: {
				audio: "olxueyi",
				trigger: { player: "phaseUseBegin" },
				prompt2: "弃置一枚「裔」标记，然后摸一张牌",
				check(event, player) {
					return player.getUseValue("wanjian") > 0 || !player.needsToDiscard();
				},
				filter(event, player) {
					return player.hasZhuSkill("olxueyi") && player.hasMark("olxueyi");
				},
				async content(event, trigger, player) {
					player.removeMark("olxueyi", 1);
					await player.draw();
				},
			},
		},
	}
```

## re_menghuo 名字:界孟获 势力:shu

### huoshou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### rezaiqi 名字:再起
描述: 结束阶段，你可以令至多X名角色选择一项：1.摸一张牌，2.令你回复1点体力（X为本回合进入过弃牌堆的红色牌数）。
```js
rezaiqi: {
		audio: 2,
		direct: true,
		filter(event, player) {
			return lib.skill.rezaiqi.count() > 0;
		},
		trigger: {
			player: "phaseJieshuBegin",
		},
		async content(event, trigger, player) {
			let result;

			// step 0
			result = await player
				.chooseTarget([1, lib.skill.rezaiqi.count()], get.prompt2("rezaiqi"))
				.set("ai", function (target) {
					return get.attitude(_status.event.player, target);
				})
				.forResult();

			// step 1
			if (result.bool) {
				var targets = result.targets;
				targets.sortBySeat();
				player.line(targets, "fire");
				player.logSkill("rezaiqi", targets);
				event.targets = targets;
			} else {
				return;
			}

			// step 2 & 3 (loop through targets)
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
	}
```

### twqiushou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_dongzhuo 名字:界董卓 势力:qun

### oljiuchi 名字:酒池
描述: 你可以将一张黑桃手牌当做【酒】使用。你使用【酒】无次数限制，且当你于回合内使用带有【酒】效果的【杀】造成伤害后，你令你的〖崩坏〗失效直到回合结束。
```js
oljiuchi: {
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "jiu") {
					return Infinity;
				}
			},
		},
		audio: 2,
		enable: "chooseToUse",
		filterCard(card) {
			return get.suit(card) == "spade";
		},
		viewAs: { name: "jiu" },
		position: "hs",
		viewAsFilter(player) {
			return player.hasCard(card => get.suit(card) == "spade", "hs");
		},
		prompt: "将一张黑桃手牌当酒使用",
		check(cardx, player) {
			if (player && player == cardx.player) {
				return true;
			}
			if (_status.event.type == "dying") {
				return 1;
			}
			var player = _status.event.player;
			var shas = player.getCards("hs", function (card) {
				return card != cardx && get.name(card, player) == "sha";
			});
			if (!shas.length) {
				return -1;
			}
			if (shas.length > 1 && (player.getCardUsable("sha") > 1 || player.countCards("hs", "zhuge"))) {
				return 0;
			}
			shas.sort(function (a, b) {
				return get.order(b) - get.order(a);
			});
			var card = false;
			if (shas.length) {
				for (var i = 0; i < shas.length; i++) {
					if (shas[i] != cardx && lib.filter.filterCard(shas[i], player)) {
						card = shas[i];
						break;
					}
				}
			}
			if (card) {
				if (
					game.hasPlayer(function (current) {
						return (
							get.attitude(player, current) < 0 &&
							!current.hasShan() &&
							current.hp + current.countCards("h", { name: ["tao", "jiu"] }) > 1 + (player.storage.jiu || 0) &&
							player.canUse(card, current, true, true) &&
							!current.hasSkillTag("filterDamage", null, {
								player: player,
								card: card,
								jiu: true,
							}) &&
							get.effect(current, card, player) > 0
						);
					})
				) {
					return 4 - get.value(cardx);
				}
			}
			return -1;
		},
		ai: {
			threaten: 1.5,
		},
		trigger: { source: "damageEnd" },
		locked: false,
		forced: true,
		filter(event, player) {
			if (event.name == "chooseToUse") {
				return player.hasCard(card => get.suit(card) == "spade", "hs");
			}
			return event.card && event.card.name == "sha" && event.getParent(2).jiu == true && !player.isTempBanned("benghuai");
		},
		async content(event, trigger, player) {
			player.logSkill("oljiuchi");
			player.tempBanSkill("benghuai");
		},
	}
```

### roulin
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### benghuai
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### olbaonue 名字:暴虐
描述: 主公技，其他群雄角色造成1点伤害后，你可进行判定，若为♠，你回复1点体力并获得判定牌。
```js
olbaonue: {
		audio: 2,
		zhuSkill: true,
		trigger: { global: "damageSource" },
		filter(event, player) {
			if (player == event.source || !event.source || event.source.group != "qun") {
				return false;
			}
			return player.hasZhuSkill("olbaonue", event.source);
		},
		getIndex: event => event.num,
		logTarget: "source",
		async content(event, trigger, player) {
			const next = player.judge(card => {
				if (get.suit(card) == "spade") {
					return 4;
				}
				return 0;
			});
			next.set("callback", async event => {
				if (event.judgeResult.suit == "spade") {
					await player.recover();
					if (get.position(event.judgeResult.card, true) == "o") {
						await player.gain(event.judgeResult.card, "gain2", "log");
					}
				}
			});
			next.judge2 = result => result.bool;
			await next;
		},
	}
```

## ol_sunjian 名字:界孙坚 势力:wu

### gzyinghun
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### wulie 名字:武烈
描述: 限定技，结束阶段，你可以失去任意点体力并指定等量的其他角色。这些角色各获得一枚「烈」。有「烈」的角色受到伤害时，其移去一枚「烈」，然后防止此伤害。
```js
wulie: {
		trigger: { player: "phaseJieshuBegin" },
		audio: 2,
		direct: true,
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		filter(event, player) {
			return player.hp > 0;
		},
		async content(event, trigger, player) {
			// step 0
			const result = await player
				.chooseTarget([1, player.hp], get.prompt2("wulie"), lib.filter.notMe)
				.set("ai", function (target) {
					var player = _status.event.player;
					if (player.hasUnknown()) {
						return 0;
					}
					if (player.hp - ui.selected.targets.length > 1 + player.countCards("hs", card => player.canSaveCard(card, player))) {
						return get.attitude(player, target);
					}
					return 0;
				})
				.forResult();
			// step 1
			if (result.bool) {
				var targets = result.targets.sortBySeat();
				player.logSkill("wulie", targets);
				player.awakenSkill(event.name);
				await player.loseHp(targets.length);
				while (targets.length) {
					targets[0].addSkill("wulie2");
					targets.shift().addMark("wulie2");
				}
			}
		},
	}
```

### twpolu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## re_caopi 名字:界曹丕 势力:wei

### rexingshang 名字:行殇
描述: 当其他角色死亡后，你可以选择一项：回复1点体力，或获得其所有牌。
```js
rexingshang: {
		audio: 2,
		audioname: ["v_caopi"],
		audioname2: { caoying: "lingren_xingshang" },
		trigger: { global: "die" },
		filter(event, player) {
			return player.isDamaged() || event.player.countCards("he") > 0;
		},
		direct: true,
		async content(event, trigger, player) {
			let result;

			// step 0
			const choice = [];
			if (player.isDamaged()) {
				choice.push("回复体力");
			}
			if (trigger.player.countCards("he")) {
				choice.push("获得牌");
			}
			choice.push("cancel2");

			result = await player
				.chooseControl(choice)
				.set("prompt", get.prompt2("rexingshang"))
				.set("ai", function () {
					if (choice.length == 2) {
						return 0;
					}
					if (get.value(trigger.player.getCards("he")) > 8) {
						return 1;
					}
					return 0;
				})
				.forResult();

			// step 1
			if (result.control != "cancel2") {
				player.logSkill(event.name, trigger.player);
				if (result.control == "获得牌") {
					const togain = trigger.player.getCards("he");
					await player.gain(togain, trigger.player, "giveAuto", "bySelf");
				} else {
					await player.recover();
				}
			}
		},
	}
```

### refangzhu 名字:放逐
描述: 当你受到伤害后，你可以令一名其他角色选择一项：摸X张牌并将武将牌翻面，或弃置X张牌并失去1点体力。（X为你已损失的体力值）
```js
refangzhu: {
		audio: 2,
		trigger: {
			player: "damageEnd",
		},
		direct: true,
		async content(event, trigger, player) {
			let result;
			// step 0
			let next = player.chooseTarget(get.prompt2("refangzhu"), function (card, player, target) {
				return player != target;
			});
			next.ai = function (target) {
				if (target.hasSkillTag("noturn")) {
					return 0;
				}
				var player = _status.event.player;
				if (get.attitude(_status.event.player, target) == 0) {
					return 0;
				}
				if (get.attitude(_status.event.player, target) > 0) {
					if (target.classList.contains("turnedover")) {
						return 1000 - target.countCards("h");
					}
					if (player.getDamagedHp() < 3) {
						return -1;
					}
					return 100 - target.countCards("h");
				} else {
					if (target.classList.contains("turnedover")) {
						return -1;
					}
					if (player.getDamagedHp() >= 3) {
						return -1;
					}
					return 1 + target.countCards("h");
				}
			};
			result = await next.forResult();

			// step 1
			if (result.bool) {
				player.logSkill("refangzhu", result.targets);
				event.target = result.targets[0];
				if (player.isHealthy()) {
					result = { bool: false };
				} else {
					let next2 = event.target.chooseToDiscard("he", player.getDamagedHp());
					next2.set("ai", function (card) {
						var player = _status.event.player;
						if (player.isTurnedOver() || _status.event.getTrigger().player.getDamagedHp() > 2) {
							return -1;
						}
						return player.hp * player.hp - get.value(card);
					});
					next2.set("prompt", "弃置" + get.cnNumber(player.getDamagedHp()) + "张牌并失去1点体力；或选择不弃置，将武将牌翻面并摸" + get.cnNumber(player.getDamagedHp()) + "张牌。");
					result = await next2.forResult();
				}
			} else {
				return;
			}

			// step 2
			if (result.bool) {
				await event.target.loseHp();
			} else {
				if (player.isDamaged()) {
					await event.target.draw(player.getDamagedHp()).forResult();
				}
				await event.target.turnOver().forResult();
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -1.5];
						}
						if (target.hp <= 1) {
							return;
						}
						if (!target.hasFriend()) {
							return;
						}
						var hastarget = false;
						var turnfriend = false;
						var players = game.filterPlayer();
						for (var i = 0; i < players.length; i++) {
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
	}
```

### songwei
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_jiangwei 名字:界姜维 势力:shu

### oltiaoxin 名字:挑衅
描述: 出牌阶段限一次，你可以选择一名攻击范围内包含你的角色。然后除非该角色对你使用一张【杀】且此【杀】对你造成伤害，否则你弃置其一张牌，然后将此技能于此出牌阶段内修改为出牌阶段限两次。
```js
oltiaoxin: {
		audio: "tiaoxin",
		audioname: ["sp_jiangwei", "xiahouba", "re_jiangwei", "gz_jiangwei", "ol_jiangwei"],
		enable: "phaseUse",
		usable(skill, player) {
			return 1 + (player.hasSkill(skill + "_rewrite", null, null, false) ? 1 : 0);
		},
		filter(event, player) {
			return game.hasPlayer(target => lib.skill.oltiaoxin.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			return target != player && target.inRange(player) && target.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await target
				.chooseToUse(
					function (card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					},
					"挑衅：对" + get.translation(player) + "使用一张杀，或令其弃置你的一张牌"
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
			if (
				!result.bool ||
				!player.hasHistory("damage", evt => {
					return evt.getParent().type == "card" && evt.getParent(4) == event;
				})
			) {
				if (target.countDiscardableCards(player, "he") > 0) {
					await player.discardPlayerCard(target, "he", true).set("boolline", true);
				}
				player.addTempSkill(event.name + "_rewrite", "phaseUseEnd");
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
		subSkill: { rewrite: { charlotte: true } },
	}
```

### olzhiji 名字:志继
描述: 觉醒技，准备阶段或结束阶段，若你没有手牌，你回复1点体力或摸两张牌，然后减1点体力上限，获得〖观星〗。
```js
olzhiji: {
		skillAnimation: true,
		animationColor: "fire",
		audio: 2,
		juexingji: true,
		//priority:-10,
		derivation: "reguanxing",
		trigger: { player: ["phaseZhunbeiBegin", "phaseJieshuBegin"] },
		forced: true,
		filter(event, player) {
			return player.countCards("h") == 0;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.chooseDrawRecover(2, true);
			player.loseMaxHp();
			player.addSkills("reguanxing");
		},
	}
```

## ol_caiwenji 名字:界蔡琰 势力:qun

### olbeige 名字:悲歌
描述: 当有角色受到渠道为【杀】的伤害后，若你有牌，你可令其进行判定。然后你可弃置一张牌，根据判定结果执行以下的一个选项：♥，其回复1点体力；♦，其摸两张牌；♣，伤害来源弃置两张牌️；♠，伤害来源将武将牌翻面。若你弃置的牌与判定结果：点数相同，则你获得你弃置的牌；花色相同，则你获得判定牌。
```js
olbeige: {
		audio: "beige",
		audioname: ["ol_caiwenji"],
		trigger: { global: "damageEnd" },
		logTarget: "player",
		filter(event, player) {
			return event.card && event.card.name == "sha" && event.player.isIn() && player.countCards("he") > 0;
		},
		check(event, player) {
			let att = get.attitude(player, event.player);
			if (event.player.hasSkill("xinleiji")) {
				return att > 0;
			}
			if (att > 0 || event.player.isHealthy()) {
				return true;
			}
			if (!event.source) {
				return true;
			}
			att = get.attitude(player, event.source);
			return att <= 0 || event.source.isTurnedOver();
		},
		prompt2: "令其进行判定，然后你可根据判定结果，弃置一张牌并令其执行对应效果。",
		async content(event, trigger, player) {
			const target = trigger.player;
			const source = trigger.source;
			let result;

			// step 0
			result = await trigger.player.judge().forResult();

			// step 1
			const judgeResult = get.copy(result);
			let str = "是否弃置一张牌",
				strt = get.translation(target),
				strs = get.translation(source),
				goon = 0;
			switch (result.suit) {
				case "heart":
					if (target.isIn() && target.isDamaged()) {
						str += "，令" + strt + "回复1点体力";
						goon = get.recoverEffect(target, player, player);
					}
					break;
				case "diamond":
					if (target.isIn()) {
						str += "，令" + strt + "摸两张牌";
						goon = 2 * get.effect(target, { name: "draw" }, player, player);
					}
					break;
				case "spade":
					if (source && source.isIn()) {
						str += "，令" + strs + "翻" + (source.isTurnedOver() ? "回正" : "") + "面";
						goon = get.attitude(player, source) * (source.isTurnedOver() ? 2 : -2);
					}
					break;
				case "club":
					if (source && source.isIn()) {
						str += "，令" + strs + "弃置两张牌";
						var cards = source
							.getCards("he")
							.sort(function (a, b) {
								return get.value(a, source) - get.value(b, source);
							})
							.slice(0, 2);
						for (var i of cards) {
							goon += get.value(i, source);
						}
						goon *= -get.sgn(get.attitude(player, source));
					}
					break;
			}
			str += "？";
			var str2 = "若弃置点数为" + get.strNumber(result.number) + "的牌则收回自己弃置的牌";
			if (get.position(result.card, true) == "d") {
				str2 += "；若弃置花色为" + get.translation(result.suit) + "的牌则获得" + get.translation(result.card);
			}
			result = await player
				.chooseToDiscard({
					position: "he",
					prompt: str,
					prompt2: str2,
				})
				.set("goon", goon)
				.set("ai", function (card) {
					const { result, goon, player } = get.event();
					let eff = Math.min(7, goon);
					if (eff <= 0) {
						return 0;
					}
					if (get.suit(card, player) == result.suit) {
						eff += get.value(result.card, player);
					}
					if (get.number(card, player) == result.number) {
						return eff;
					}
					return eff - get.value(card);
				})
				.set("result", judgeResult)
				.forResult();

			// step 2
			if (result.bool) {
				const card = result.cards[0];
				switch (judgeResult.suit) {
					case "heart":
						if (target.isIn() && target.isDamaged()) {
							await target.recover().forResult();
						}
						break;
					case "diamond":
						if (target.isIn()) {
							await target.draw(2).forResult();
						}
						break;
					case "spade":
						if (source && source.isIn()) {
							await source.turnOver().forResult();
						}
						player.addExpose(0.1);
						break;
					case "club":
						if (source && source.isIn() && source.countCards("he") > 0) {
							await source.chooseToDiscard(2, "he", true).forResult();
						}
						player.addExpose(0.1);
						break;
				}

				// step 3
				var gains = [];
				if (get.position(judgeResult.card, true) == "d" && get.suit(card, player) == judgeResult.suit) {
					gains.push(judgeResult.card);
				}
				if (get.position(card, true) == "d" && get.number(card, player) == judgeResult.number) {
					gains.push(card);
				}
				if (gains.length) {
					player.gain(gains, "gain2");
				}
			}
		},
	}
```

### duanchang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ol_liushan 名字:界刘禅 势力:shu

### xiangle
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### olfangquan 名字:放权
描述: 出牌阶段开始前，你可以跳过此阶段。若如此做，弃牌阶段开始时，你可以弃置一张手牌，令一名其他角色进行一个额外回合。
```js
olfangquan: {
		audio: 2,
		audioname2: { shen_caopi: "olfangquan_shen_caopi" },
		trigger: { player: "phaseUseBefore" },
		filter(event, player) {
			return player.countCards("h") > 0 && !player.hasSkill("olfangquan3");
		},
		direct: true,
		async content(event, trigger, player) {
			// step 0
			var fang = player.countMark("olfangquan2") == 0 && player.hp >= 2 && player.countCards("h") <= player.hp + 2;
			const result = await player
				.chooseBool(get.prompt2("olfangquan"))
				.set("ai", function () {
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
				.forResult();
			// step 1
			if (result.bool) {
				player.logSkill("olfangquan");
				trigger.cancel();
				player.addTempSkill("olfangquan2");
				player.addMark("olfangquan2", 1, false);
			}
		},
	}
```

### olruoyu 名字:若愚
描述: 主公技，觉醒技，准备阶段，若你的体力值为全场最少，则你加1点体力上限，将体力回复至3点，然后获得技能〖思蜀〗和〖激将〗。
```js
olruoyu: {
		skillAnimation: true,
		animationColor: "fire",
		audio: 2,
		juexingji: true,
		zhuSkill: true,
		keepSkill: true,
		derivation: ["rejijiang", "sishu"],
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			if (!player.hasZhuSkill("olruoyu")) {
				return false;
			}
			return player.isMinHp();
		},
		async content(event, trigger, player) {
			// step 0
			player.awakenSkill(event.name);
			await player.gainMaxHp();
			// step 1
			if (player.hp < 3) {
				await player.recover(3 - player.hp);
			}
			player.addSkills(["sishu", "rejijiang"]);
		},
	}
```

## re_sunce 名字:界孙策 势力:wu

### oljiang 名字:激昂
描述: ①当你使用【决斗】或红色【杀】指定第一个目标后，或成为【决斗】或红色【杀】的目标后，你可以摸一张牌。②当有【决斗】或红色【杀】于每回合内首次因弃置而进入弃牌堆后，你可以失去1点体力并获得这些牌。
```js
oljiang: {
		audio: "jiang",
		inherit: "jiang",
		group: "oljiang_gain",
		subSkill: {
			gain: {
				audio: "jiang",
				audioname: ["sp_lvmeng", "re_sunben", "re_sunce"],
				trigger: { global: ["loseAfter", "loseAsyncAfter"] },
				usable: 1,
				filter(event, player) {
					if (player.hp < 1 || event.type != "discard" || event.position != ui.discardPile) {
						return false;
					}
					var filter = card => card.name == "juedou" || (card.name == "sha" && get.color(card, false) == "red");
					var cards = event.getd().filter(filter);
					if (!cards.filter(card => get.position(card, true) == "d").length) {
						return false;
					}
					var searched = false;
					if (
						game.getGlobalHistory("cardMove", function (evt) {
							if (searched || evt.type != "discard" || evt.position != ui.discardPile) {
								return false;
							}
							var evtx = evt;
							if (evtx.getlx === false) {
								evtx = evt.getParent();
							}
							var cards = evtx.getd().filter(filter);
							if (!cards.length) {
								return false;
							}
							searched = true;
							return evtx != event;
						}).length > 0
					) {
						return false;
					}
					return true;
				},
				prompt2(event, player) {
					var cards = event.getd().filter(function (card) {
						return (card.name == "juedou" || (card.name == "sha" && get.color(card, false) == "red")) && get.position(card, true) == "d";
					});
					return "失去1点体力并获得" + get.translation(cards);
				},
				check(event, player) {
					return player.hp > 1 && !player.storage.olhunzi;
				},
				async content(event, trigger, player) {
					await player.loseHp();
					const cards = trigger.getd().filter(card => {
						return (card.name == "juedou" || (card.name == "sha" && get.color(card, false) == "red")) && get.position(card, true) == "d";
					});
					if (cards.length > 0) {
						await player.gain(cards, "gain2");
					}
				},
			},
		},
	}
```

### olhunzi 名字:魂姿
描述: 觉醒技，准备阶段，若你的体力值为1，你减1点体力上限并获得技能〖英姿〗和〖英魂〗；本回合的结束阶段，你摸两张牌或回复1点体力。
```js
olhunzi: {
		audio: 2,
		audioname: ["re_sunyi"],
		inherit: "hunzi",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			//player.recover();
			await player.addSkills(["reyingzi", "gzyinghun"]);
			player.addTempSkill("olhunzi_effect");
		},
		subSkill: {
			effect: {
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				popup: false,
				charlotte: true,
				async content(event, trigger, player) {
					await player.chooseDrawRecover(2, true);
				},
			},
		},
	}
```

### olzhiba 名字:制霸
描述: 主公技，其他吴势力的角色的出牌阶段限一次，其可以与你拼点（你可拒绝此拼点）；你的出牌阶段限一次，你可以和一名吴势力角色拼点：若其没赢，你获得两张拼点牌。
```js
olzhiba: {
		audio: 2,
		zhuSkill: true,
		global: "olzhiba2",
	}
```

## re_jianyong 名字:界简雍 势力:shu

### reqiaoshui
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### jyzongshi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

