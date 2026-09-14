# yijiang merged reference

## xin_fazheng 名字:法正 势力:shu

### xinxuanhuo 名字:眩惑
描述: 摸牌阶段开始时，你可以改为令一名其他角色摸两张牌，然后该角色需对其攻击范围内你选择的另一名角色使用一张【杀】，否则你获得其两张牌。
```js
xinxuanhuo: {
		audio: 2,
		trigger: {
			player: "phaseDrawBegin1",
		},
		filter(event, player) {
			return !event.numFixed;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("xinxuanhuo"),
					filterTarget(card, player, target) {
						return player != target;
					},
					ai(target) {
						const event = get.event();
						const player = get.player();

						let att = get.attitude(player, target);
						const count = target.countCards("h");
						if (att > 0) {
							if (count < target.hp) {
								att += 2;
							}
							return att - count / 3;
						} else {
							return -1;
						}
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			trigger.changeToZero();

			const target = event.targets[0];
			await target.draw(2);

			let noSha = true;
			if (game.hasPlayer(current => target.canUse("sha", current))) {
				let result = await player
					.chooseTarget({
						prompt: "选择出杀的目标",
						filterTarget(card, player, target) {
							const event = get.event();
							return event.target.canUse("sha", target);
						},
						forced: true,
						ai(target) {
							const event = get.event();
							return get.effect(target, { name: "sha" }, event.target, event.player);
						},
					})
					.set("target", target)
					.forResult();

				if (result.bool && result.targets?.length) {
					game.log(player, "指定的出杀目标为", result.targets);
					const target2 = result.targets[0];
					target.line(target2);
					result = await target
						.chooseToUse({
							prompt: `对${get.translation(result.targets)}使用一张杀，或令${get.translation(player)}获得你的两张牌`,
							filterTarget(card, player, target) {
								return target === target2;
							},
							selectTarget: -1,
							filterCard(card) {
								return card.name === "sha";
							},
						})
						.forResult();
					noSha = !result.bool;
				}
			}

			if (noSha) {
				await player.gainPlayerCard({
					target,
					selectButton: Math.min(2, target.countCards("he")),
					position: "he",
					forced: true,
				});
			}
		},
		ai: {
			expose: 0.2,
		},
	}
```

### xinenyuan 名字:恩怨
描述: 当你获得一名其他角色两张或更多的牌后，你可以令其摸一张牌；当你受到1点伤害后，你可以令伤害来源选择一项：1、将一张手牌交给你；2、失去1点体力。
```js
xinenyuan: {
		audio: 2,
		group: ["xinenyuan1", "xinenyuan2"],
	}
```

## guanzhang 名字:guanzhang 势力:shu

### fuhun 名字:父魂
描述: `你可以将两张手牌当做【杀】使用或打出；当你于出牌阶段以此法使用的【杀】造成伤害后，你获得${get.poptip("new_rewusheng")}和${get.poptip("olpaoxiao")}直到回合结束。`
```js
fuhun: {
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard: true,
		selectCard: 2,
		position: "hs",
		audio: 2,
		audioname: ["re_guanzhang"],
		derivation: ["new_rewusheng", "olpaoxiao"],
		viewAs: { name: "sha" },
		prompt: "将两张手牌当杀使用或打出",
		viewAsFilter(player) {
			return player.countCards("hs") > 1;
		},
		check(card) {
			if (_status.event.player.hasSkill("new_rewusheng") && get.color(card) == "red") {
				return 0;
			}
			if (_status.event.name == "chooseToRespond") {
				if (card.name == "sha") {
					return 0;
				}
				return 6 - get.useful(card);
			}
			if (_status.event.player.countCards("hs") < 4) {
				return 6 - get.useful(card);
			}
			return 7 - get.useful(card);
		},
		ai: {
			respondSha: true,
			skillTagFilter(player) {
				if (player.countCards("hs") < 2) {
					return false;
				}
			},
			order(item, player) {
				if (player.hasSkill("new_rewusheng") && player.hasSkill("olpaoxiao")) {
					return 1;
				}
				if (player.countCards("hs") < 4) {
					return 1;
				}
				return 4;
			},
		},
		group: "fuhun_effect",
		subSkill: {
			effect: {
				audio: "fuhun",
				audioname: ["re_guanzhang"],
				trigger: { source: "damageSource" },
				forced: true,
				sourceSkill: "fuhun",
				filter(event, player) {
					if (["new_rewusheng", "olpaoxiao"].every(skill => player.hasSkill(skill, null, false, false))) {
						return false;
					}
					return event.getParent().skill == "fuhun";
				},
				async content(event, trigger, player) {
					await player.addTempSkills(["new_rewusheng", "olpaoxiao"]);
				},
			},
		},
	}
```

## wangyi 名字:王异 势力:wei

### zhenlie 名字:贞烈
描述: 当你成为其他角色使用【杀】或普通锦囊牌的目标后，你可以失去1点体力并令此牌对你无效，然后弃置对方一张牌。
```js
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
		trigger: { target: "useCardToTargeted" },
		async content(event, trigger, player) {
			if (get.attitude(player, trigger.player) < 0 && trigger.player.countDiscardableCards(player, "he")) {
				player.addTempSkill("zhenlie_lose");
			}
			await player.loseHp();
			player.removeSkill("zhenlie_lose");
			trigger.getParent().excluded.add(player);
			if (trigger.player.countCards("he")) {
				if (get.mode() !== "identity" || player.identity !== "nei") {
					player.addExpose(0.12);
				}
				await player.discardPlayerCard({
					target: trigger.player,
					position: "he",
					forced: true,
				});
			}
		},
		subSkill: {
			lose: {
				charlotte: true,
			},
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
	}
```

### miji 名字:秘计
描述: 结束阶段，若你已受伤，则可以摸X张牌，然后可以将等量的手牌交给其他角色（X为你已损失的体力值）。
```js
miji: {
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
			const num = player.getDamagedHp();
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
	}
```

## caozhang 名字:caozhang 势力:wei

### new_jiangchi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## guohuai 名字:郭淮 势力:wei

### rejingce 名字:精策
描述: 当你于回合内首次使用某种花色的手牌时，你的手牌上限+1。出牌阶段结束时，你可以摸X张牌（X为你本阶段内使用过的牌的类型数）。
```js
rejingce: {
		getNum(event, player) {
			const list = [];
			player.getHistory("useCard", evt => {
				if (evt.getParent("phaseUse") == event) {
					list.add(get.type2(evt.card));
				}
			});
			return list.length;
		},
		audio: "jingce",
		trigger: { player: "phaseUseEnd" },
		frequent: true,
		filter(event, player) {
			return player.hasHistory("useCard", evt => evt.getParent("phaseUse") == event);
		},
		async content(event, trigger, player) {
			const num = get.info(event.name).getNum(trigger, player);
			await player.draw(num);
		},
		group: "rejingce_add",
		subSkill: {
			add: {
				trigger: { player: "loseEnd" },
				silent: true,
				firstDo: true,
				filter(event, player) {
					if (_status.currentPhase !== player) {
						return false;
					}
					if (event.getParent().name != "useCard") {
						return false;
					}
					const list = player.getStorage("rejingce_effect");
					return event.cards.some(card => !list.includes(get.suit(card, player)));
				},
				async content(event, trigger, player) {
					const effect = "rejingce_effect";
					player.addTempSkill(effect);
					player.markAuto(
						effect,
						trigger.cards.map(card => get.suit(card, player))
					);
					player.storage[effect].sort((a, b) => lib.suit.indexOf(b) - lib.suit.indexOf(a));
					player.addTip(effect, get.translation(effect) + player.getStorage(effect).reduce((str, suit) => str + get.translation(suit), ""));
				},
			},
			effect: {
				charlotte: true,
				onremove(player, skill) {
					delete player.storage[skill];
					player.removeTip(skill);
				},
				intro: { content: "当前已使用花色：$" },
				mod: {
					maxHandcard(player, num) {
						return num + player.getStorage("rejingce_effect").length;
					},
				},
			},
		},
	}
```

## zhangchunhua 名字:张春华 势力:wei

### jueqing 名字:绝情
描述: 锁定技，你即将造成的伤害均视为失去体力。
```js
jueqing: {
		audio: 2,
		audioname: ["ol_zhangchunhua"],
		trigger: { source: "damageBefore" },
		forced: true,
		async content(event, trigger, player) {
			trigger.cancel();
			trigger.player.loseHp(trigger.num);
		},
		ai: {
			jueqing: true,
		},
	}
```

### shangshi 名字:伤逝
描述: 当你的手牌数小于X时，你可以将手牌摸至X张（X为你已损失的体力值）。
```js
shangshi: {
		audio: 2,
		audioname: ["ol_zhangchunhua"],
		audioname2: {
			re_zhangchunhua: "reshangshi",
		},
		trigger: {
			player: ["loseAfter", "changeHp", "gainMaxHpAfter", "loseMaxHpAfter"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		frequent: true,
		filter(event, player) {
			if (event.getl && !event.getl(player)) {
				return false;
			}
			return player.countCards("h") < player.getDamagedHp();
		},
		async content(event, trigger, player) {
			player.draw(player.getDamagedHp() - player.countCards("h"));
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
	}
```

## caozhi 名字:曹植 势力:wei

### luoying 名字:落英
描述: 当其他角色的梅花牌因弃置或判定而进入弃牌堆后，你可以获得之。
```js
luoying: {
		//unique:true,
		//gainable:true,
		audio: 2,
		group: ["luoying_discard", "luoying_judge"],
		subfrequent: ["judge"],
		subSkill: {
			discard: {
				audio: "luoying",
				trigger: { global: "loseAfter" },
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
				async cost(event, trigger, player) {
					if (trigger.delay == false) {
						await game.delay();
					}
					const cards2 = trigger.cards.slice(0);
					const evt = trigger.getl(player);
					if (evt && evt.cards) {
						cards2.removeArray(evt.cards);
					}
					const cards = cards2.filter(card => card.original !== "j" && get.suit(card, trigger.player) === "club" && get.position(card, true) === "d");
					if (!cards.length) {
						return;
					}

					event.result = await player
						.chooseButton({
							createDialog: ["落英：选择要获得的牌", cards],
							selectButton: [1, cards.length],
							ai(button) {
								return get.value(button.link, _status.event.player, "raw");
							},
						})
						.forResult();
					event.result.cards = event.result.links;
				},
				async content(event, trigger, player) {
					await player.gain({
						cards: event.cards,
						animate: "gain2",
						log: true,
					});
				},
			},
			judge: {
				audio: "luoying",
				trigger: { global: "cardsDiscardAfter" },
				//frequent:'check',
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
				async cost(event, trigger, player) {
					const result = await player
						.chooseButton({
							createDialog: ["落英：选择要获得的牌", trigger.cards],
							selectButton: [1, trigger.cards.length],
							ai(button) {
								return get.value(button.link, _status.event.player, "raw");
							},
						})
						.forResult();

					event.result = {
						bool: result.bool,
						cards: result.links,
					};
				},
				async content(event, trigger, player) {
					await player.gain({
						cards: event.cards,
						animate: "gain2",
						log: true,
					});
				},
			},
		},
	}
```

### jiushi 名字:酒诗
描述: 当你需要使用一张【酒】时，若你的武将牌正面朝上，则你可以将武将牌翻面并视为使用了一张【酒】；当你受到伤害后，若你的武将牌于受到伤害时背面向上，你可以翻面。
```js
jiushi: {
		audio: "jiushi1",
		group: ["jiushi1", "jiushi3"],
	}
```

## caochong 名字:曹冲 势力:wei

### chengxiang 名字:称象
描述: 当你受到伤害后，你可以亮出牌堆顶的四张牌。然后获得其中任意数量点数之和不大于13的牌。
```js
chengxiang: {
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.num > 0;
		},
		//模版继承会用到，别问，问就是四个称象合一起，全靠event.name分效果
		//能拿的牌的点数和
		maxNum: 13,
		//亮出牌的数量
		getNum(player, num) {
			return num;
		},
		//拿完牌之后的回调
		async callback(event, trigger, player) {
			return;
		},
		frequent: true,
		async content(event, trigger, player) {
			const num = get.info(event.name).getNum(player, 4);
			event.showCards ??= [];
			const cards = [];
			event.cards = cards;
			//给肌肉曹冲用的，修改称象亮出的牌
			await event.trigger("chengxiangShowBegin");
			cards.addArray(event.showCards);
			if (num > cards.length) {
				cards.addArray(get.cards(num - cards.length));
			}
			await player.showCards(cards, `${get.translation(player)}发动了〖${get.translation(event.name)}〗`, true).set("clearArena", false);
			const maxNum = get.info(event.name).maxNum;
			const result = await player
				.chooseCardButton(cards, `称象：选择任意张点数不大于${maxNum}的牌`, [1, Infinity], true)
				.set("filterButton", function (button) {
					let num = 0;
					for (const selectedButton of ui.selected.buttons) {
						num += get.number(selectedButton.link);
					}
					return num + get.number(button.link) <= _status.event.maxNum;
				})
				.set("maxNum", maxNum)
				.set("ai", function (button) {
					let player = _status.event.player,
						name = get.name(button.link),
						val = get.value(button.link, player);
					if (name === "tao") {
						return val + 2 * Math.min(3, 1 + player.getDamagedHp());
					}
					if (name === "jiu" && player.hp < 3) {
						return val + 2 * (2.8 - player.hp);
					}
					if (name === "wuxie" && player.countCards("j") && !player.hasWuxie()) {
						return val + 5;
					}
					if (player.hp > 1 && (player.hasSkill("renxin") || player.hasSkill("olrenxin")) && player.hasFriend() && get.type(button.link) === "equip") {
						return val + 4;
					}
					return val;
				})
				.forResult();
			game.broadcastAll(ui.clear);
			if (result.links?.length) {
				const { links } = result;
				event.cards2 = links;
				await player.gain(links, "gain2");
				await get.info(event.name).callback(event, trigger, player);
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
	}
```

### renxin 名字:仁心
描述: 当体力值为1的一名其他角色受到伤害时，你可以将武将牌翻面并弃置一张装备牌，然后防止此伤害。
```js
renxin: {
		trigger: { global: "damageBegin4" },
		audio: 2,
		audioname: ["re_caochong"],
		//priority:6,
		filter(event, player) {
			return event.player != player && event.player.hp == 1 && player.countCards("he", { type: "equip" }) > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt("renxin", trigger.player),
					prompt2: "弃置一张装备牌并将武将牌翻面，然后防止" + get.translation(trigger.player) + "受到的伤害",
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
			trigger.cancel();
		},
		ai: {
			expose: 0.5,
		},
	}
```

## xunyou 名字:荀攸 势力:wei

### qice 名字:奇策
描述: 出牌阶段限一次，你可以将所有的手牌（至少一张）当做任意一张普通锦囊牌使用。
```js
qice: {
		audio: 2,
		audioname: ["clan_xunyou", "pot_huanjie"],
		enable: "phaseUse",
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
		usable: 1,
		chooseButton: {
			dialog(player) {
				var list = [];
				for (var i = 0; i < lib.inpile.length; i++) {
					if (get.type(lib.inpile[i]) == "trick") {
						list.push(["锦囊", "", lib.inpile[i]]);
					}
				}
				return ui.create.dialog(get.translation("qice"), [list, "vcard"]);
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
				var recover = 0,
					lose = 1,
					players = game.filterPlayer();
				for (var i = 0; i < players.length; i++) {
					if (players[i].hp == 1 && get.damageEffect(players[i], player, player) > 0 && !players[i].hasSha()) {
						return button.link[2] == "juedou" ? 2 : -1;
					}
					if (!players[i].isOut()) {
						if (players[i].hp < players[i].maxHp) {
							if (get.attitude(player, players[i]) > 0) {
								if (players[i].hp < 2) {
									lose--;
									recover += 0.5;
								}
								lose--;
								recover++;
							} else if (get.attitude(player, players[i]) < 0) {
								if (players[i].hp < 2) {
									lose++;
									recover -= 0.5;
								}
								lose++;
								recover--;
							}
						} else {
							if (get.attitude(player, players[i]) > 0) {
								lose--;
							} else if (get.attitude(player, players[i]) < 0) {
								lose++;
							}
						}
					}
				}
				if (lose > recover && lose > 0) {
					return button.link[2] == "nanman" ? 1 : -1;
				}
				if (lose < recover && recover > 0) {
					return button.link[2] == "taoyuan" ? 1 : -1;
				}
				return button.link[2] == "wuzhong" ? 1 : -1;
			},
			backup(links, player) {
				return {
					audio: "qice",
					audioname: ["clan_xunyou"],
					filterCard: true,
					selectCard: -1,
					position: "h",
					popname: true,
					viewAs: { name: links[0][2] },
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
					num /= cards.length;
					num *= Math.min(cards.length, player.hp);
					return 12 - num;
				},
			},
			nokeep: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "nokeep") {
					return (!arg || (arg.card && get.name(arg.card) === "tao")) && player.isPhaseUsing() && !player.getStat("skill").qice && player.hasCard(card => get.name(card) != "tao", "h");
				}
			},
			threaten: 1.6,
		},
	}
```

### zhiyu 名字:智愚
描述: 当你受到伤害后，你可以摸一张牌，然后展示所有手牌。若颜色均相同，你令伤害来源弃置一张手牌。
```js
zhiyu: {
		audio: 2,
		audioname2: { sxrm_caocao: "zhiyu_sxrm_caocao", tw_sxrm_caocao: "zhiyu_sxrm_caocao" },
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
	}
```

## xin_xushu 名字:徐庶 势力:shu

### xinwuyan 名字:无言
描述: 锁定技，当你使用锦囊牌造成伤害时，你防止此伤害；锁定技，当你受到锦囊牌对你造成的伤害时，你防止此伤害。
```js
xinwuyan: {
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
		},
	}
```

### xinjujian 名字:举荐
描述: 结束阶段开始时，你可以弃置一张非基本牌并选择一名其他角色，令其选择一项：1.摸两张牌；2.回复1点体力；3.将其武将牌翻转至正面朝上并重置之。
```js
xinjujian: {
		trigger: { player: "phaseJieshuBegin" },
		audio: 2,
		filter(event, player) {
			return player.countCards("he") > player.countCards("he", { type: "basic" });
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					filterTarget(card, player, target) {
						return player != target;
					},
					filterCard(card, player) {
						return get.type(card) != "basic" && lib.filter.cardDiscardable(card, player);
					},
					ai1(card) {
						if (get.tag(card, "damage") && get.type(card) == "trick") {
							return 20;
						}
						return 9 - get.value(card);
					},
					ai2(target) {
						var att = get.attitude(_status.event.player, target);
						if (att > 0) {
							if (target.isTurnedOver()) {
								att += 3;
							}
							if (target.hp == 1) {
								att += 3;
							}
						}
						return att;
					},
					position: "he",
					prompt: get.prompt2("xinjujian"),
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];

			await player.discard(event.cards);

			const controls = ["draw_card"];
			if (target.hp < target.maxHp) {
				controls.push("recover_hp");
			}
			if (target.isLinked() || target.isTurnedOver()) {
				controls.push("reset_character");
			}

			let result;
			if (controls.length === 1) {
				result = { control: controls[0] };
			} else {
				result = await target
					.chooseControl({
						controls,
						ai() {
							const target = get.event().target;
							if (target.isTurnedOver()) {
								return "reset_character";
							} else if (target.hp == 1 && target.maxHp > 2) {
								return "recover_hp";
							} else if (target.hp == 2 && target.maxHp > 2 && target.countCards("h") > 1) {
								return "recover_hp";
							} else {
								return "draw_card";
							}
						},
					})
					.set("target", target)
					.forResult();
			}

			switch (result.control) {
				case "recover_hp":
					await target.recover();
					break;
				case "draw_card":
					await target.draw(2);
					break;
				case "reset_character":
					if (target.isTurnedOver()) {
						await target.turnOver();
					}
					if (target.isLinked()) {
						await target.link();
					}
					break;
			}
		},
		ai: {
			expose: 0.2,
			threaten: 1.4,
		},
	}
```

## xin_masu 名字:马谡 势力:shu

### olsanyao 名字:散谣
描述: 出牌阶段每项各限一次，你可以弃置一张牌并指定一名体力值或手牌数最多(或之一)的角色，并对其造成1点伤害。
```js
olsanyao: {
		enable: "phaseUse",
		audio: "sanyao",
		filter(event, player) {
			return player.countCards("he") > 0 && player.getStorage("olsanyao_used").length < 2;
		},
		chooseButton: {
			dialog(event, player) {
				var list = ["选择手牌数最多的一名角色", "选择体力值最大的一名角色"];
				var choiceList = ui.create.dialog("散谣：请选择一项", "forcebutton", "hidden");
				choiceList.add([
					list.map((item, i) => {
						return [i, item];
					}),
					"textbutton",
				]);
				return choiceList;
			},
			filter(button, player) {
				return !player.getStorage("olsanyao_used").includes(button.link);
			},
			check(button) {
				var player = _status.event.player;
				if (
					game.hasPlayer(
						[
							function (target) {
								var num = target.countCards("h");
								return (
									!game.hasPlayer(function (current) {
										return current != target && current.countCards("h") > num;
									}) && get.effect(target, "sanyao", player, player) > 0
								);
							},
							function (target) {
								var num = target.hp;
								return (
									!game.hasPlayer(function (current) {
										return current != target && current.hp > num;
									}) && get.effect(target, "sanyao", player, player) > 0
								);
							},
						][button.link]
					)
				) {
					return 1 + button.link;
				}
				return 0;
			},
			backup(links) {
				return {
					audio: "sanyao",
					filterTarget: [
						function (card, player, target) {
							var num = target.countCards("h");
							return !game.hasPlayer(function (current) {
								return current != target && current.countCards("h") > num;
							});
						},
						function (card, player, target) {
							return !game.hasPlayer(function (current) {
								return current != target && current.hp > target.hp;
							});
						},
					][links[0]],
					index: links[0],
					filterCard: true,
					check(card) {
						return 7 - get.value(card);
					},
					position: "he",
					async content(event, trigger, player) {
						const { target } = event;
						player.addTempSkill("olsanyao_used", "phaseUseAfter");
						player.markAuto("olsanyao_used", lib.skill[event.name].index);
						target.damage("nocard");
					},
					ai: lib.skill.sanyao.ai,
				};
			},
			prompt() {
				return "请选择【散谣】的目标";
			},
		},
		ai: {
			order: 7,
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
	}
```

### rezhiman 名字:制蛮
描述: 当你对一名其他角色造成伤害时，你可以防止此伤害，然后获得其区域内的一张牌。
```js
rezhiman: {
		audio: "zhiman",
		audioname: ["re_masu"],
		audioname2: {
			dc_guansuo: "zhiman_guansuo",
			guansuo: "zhiman_guansuo",
			re_baosanniang: "zhiman_re_baosanniang",
			tw_baosanniang: "zhiman_re_baosanniang",
		},
		trigger: { source: "damageBegin2" },
		filter(event, player) {
			return player != event.player;
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
			var cards = event.player.getGainableCards(player, "he");
			for (var i = 0; i < cards.length; i++) {
				if (get.equipValue(cards[i]) >= 6) {
					return true;
				}
			}
			return false;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			if (trigger.player.countGainableCards(player, "hej")) {
				player.gainPlayerCard(trigger.player, "hej", true);
			}
			trigger.cancel();
		},
	}
```

## zhuran 名字:朱然 势力:wu

### danshou 名字:胆守
描述: 出牌阶段，你可以选择你攻击范围内的一名其他角色，然后弃置X张牌（X为此前你于此阶段你发动“胆守”的次数+1）。若X：为1，你弃置该角色的一张牌；为2，令该角色交给你一张牌；为3，你对该角色造成1点伤害；不小于4，你与该角色各摸两张牌。
```js
danshou: {
		enable: "phaseUse",
		filterCard: true,
		position: "he",
		audio: 2,
		filter(event, player) {
			var num = player.getStat().skill.danshou;
			if (num) {
				num++;
			} else {
				num = 1;
			}
			return player.countCards("he") >= num;
		},
		check(card) {
			if (ui.selected.cards.length >= 2) {
				return 4 - get.value(card);
			}
			return 6 - get.value(card);
		},
		selectCard(card) {
			var num = _status.event.player.getStat().skill.danshou;
			if (num) {
				return num + 1;
			}
			return 1;
		},
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			var num = player.getStat().skill.danshou;
			if (num) {
				num++;
			} else {
				num = 1;
			}
			if (num <= 2 && !target.countCards("he")) {
				return false;
			}
			return player.inRange(target);
		},
		async content(event, trigger, player) {
			const { target } = event;
			const num = player.getStat().skill.danshou;
			switch (num) {
				case 1:
					await player.discardPlayerCard({
						target,
						forced: true,
					});
					return;
				case 2: {
					const result = await target
						.chooseCard({
							prompt: "选择一张牌交给" + get.translation(player),
							position: "he",
							forced: true,
						})
						.forResult();
					if (result.cards) {
						await target.give(result.cards, player);
					}
					return;
				}
				case 3:
					await target.damage({
						nocard: true,
					});
					return;
				default:
					await game.asyncDraw([player, target], 2);
			}
		},
		ai: {
			order: 8.6,
			result: {
				target(player, target) {
					var num = player.getStat().skill.danshou;
					if (num) {
						num++;
					} else {
						num = 1;
					}
					if (num > 3) {
						return 0;
					}
					if (num == 3) {
						return get.damageEffect(target, player, target);
					}
					return -1;
				},
			},
		},
	}
```

## xusheng 名字:徐盛 势力:wu

### xinpojun 名字:破军
描述: 当你于出牌阶段内使用【杀】指定一个目标后，你可以将其至多X张牌扣置于该角色的武将牌旁（X为其体力值）。若如此做，当前回合结束后，该角色获得其武将牌旁的所有牌。
```js
xinpojun: {
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return event.card.name == "sha" && player.isPhaseUsing() && event.target.hp > 0 && event.target.countCards("he") > 0;
		},
		audio: "pojun",
		async cost(event, trigger, player) {
			event.result = await player
				.choosePlayerCard({
					prompt: get.prompt("xinpojun", trigger.target),
					target: trigger.target,
					selectButton: [1, Math.min(trigger.target.countCards("he"), trigger.target.hp)],
					allowChooseAll: true,
				})
				.set("forceAuto", true)
				.forResult();

			event.result.cards = event.result.links;
		},
		logTarget(event) {
			return event?.target;
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			await target.addToExpansion({
				cards: event.cards,
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
	}
```

## wuguotai 名字:吴国太 势力:wu

### ganlu 名字:甘露
描述: 出牌阶段限一次，你可以选择两名装备区内装备数之差不大于X的角色，令其交换装备区内的牌（X为你已损失的体力值）。
```js
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
		},
		ai: {
			order: 10,
			threaten(player, target) {
				return 0.8 * Math.max(1 + target.maxHp - target.hp);
			},
			result: {
				target(player, target) {
					var list1 = [];
					var list2 = [];
					var num = player.maxHp - player.hp;
					var players = game.filterPlayer();
					for (var i = 0; i < players.length; i++) {
						if (get.attitude(player, players[i]) > 0) {
							list1.push(players[i]);
						} else if (get.attitude(player, players[i]) < 0) {
							list2.push(players[i]);
						}
					}
					list1.sort(function (a, b) {
						return a.countCards("e") - b.countCards("e");
					});
					list2.sort(function (a, b) {
						return b.countCards("e") - a.countCards("e");
					});
					var delta;
					for (var i = 0; i < list1.length; i++) {
						for (var j = 0; j < list2.length; j++) {
							delta = list2[j].countCards("e") - list1[i].countCards("e");
							if (delta <= 0) {
								continue;
							}
							if (delta <= num) {
								if (target == list1[i] || target == list2[j]) {
									return get.attitude(player, target);
								}
								return 0;
							}
						}
					}
					return 0;
				},
			},
			effect: {
				target(card, player, target) {
					if (target.hp == target.maxHp && get.tag(card, "damage")) {
						return 0.2;
					}
				},
			},
		},
	}
```

### buyi 名字:补益
描述: 当有角色进入濒死状态时，你可以展示该角色的一张手牌：若此牌不为基本牌，则该角色弃置此牌并回复1点体力。
```js
buyi: {
		trigger: { global: "dying" },
		//priority:6,
		audio: 2,
		audioname: ["re_wuguotai"],
		filter(event, player) {
			return event.player.hp <= 0 && event.player.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			let check;
			if (trigger.player.isUnderControl(true, player)) {
				check = player.hasCard(function (card) {
					return get.type(card) != "basic";
				});
			} else {
				check = get.attitude(player, trigger.player) > 0;
			}

			event.result = await player
				.choosePlayerCard({
					prompt: get.prompt("buyi", trigger.player),
					target: trigger.player,
					filterButton(button) {
						if (_status.event.player == _status.event.target) {
							return lib.filter.cardDiscardable(button.link, _status.event.player);
						}
						return true;
					},
					position: "h",
					ai(button) {
						if (!_status.event.check) {
							return 0;
						}
						if (_status.event.target.isUnderControl(true, _status.event.player)) {
							if (get.type(button.link) != "basic") {
								return 10 - get.value(button.link);
							}
							return 0;
						}
						return Math.random();
					},
				})
				.set("check", check)
				.forResult();

			event.result.cards = event.result.links;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const card = event.cards[0];
			await player.showCards([card], get.translation(player) + "展示的手牌");
			if (get.type(card) !== "basic") {
				await trigger.player.discard(card);
				await trigger.player.recover();
			}
		},
		ai: {
			threaten: 1.4,
		},
	}
```

## lingtong 名字:凌统 势力:wu

### xuanfeng 名字:旋风
描述: 当你失去装备区内的牌时，或于弃牌阶段弃置了两张或更多的手牌后，你可以依次弃置一至两名其他角色的共计两张牌。
```js
xuanfeng: {
		audio: 2,
		audioname: ["boss_lvbu3"],
		audioname2: {
			re_heqi: "fenwei_heqi",
		},
		trigger: {
			player: ["loseAfter", "phaseDiscardEnd"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
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
				.chooseTarget({
					prompt: get.prompt2("xuanfeng"),
					filterTarget(event, player, target) {
						return player !== target && target.countDiscardableCards(player, "he") > 0;
					},
					ai(target) {
						const player = get.player();
						return -get.attitude(player, target);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target1 = event.targets[0];
			player.line(target1, "green");
			await player.discardPlayerCard({
				target: target1,
				position: "he",
				forced: true,
			});

			const result = await player
				.chooseTarget({
					prompt: "旋风：弃置一名其他角色的一张牌",
					filterTarget(event, player, target) {
						return player !== target && target.countDiscardableCards(player, "he") > 0;
					},
					ai(target) {
						const player = get.player();
						return -get.attitude(player, target);
					},
				})
				.forResult();
			if (!result.bool || !result.targets?.length) {
				return;
			}

			const target2 = result.targets[0];
			player.line(target2, "green");
			await player.discardPlayerCard({
				target: target2,
				position: "he",
				forced: true,
			});
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (get.type(card) == "equip" && !get.cardtag(card, "gifts")) {
						return [1, 3];
					}
				},
			},
			reverseEquip: true,
			noe: true,
		},
	}
```

## liubiao 名字:刘表 势力:qun

### rezishou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### zongshi 名字:宗室
描述: 锁定技，你的手牌上限+X（X为场上现存势力数）。
```js
zongshi: {
		audio: 2,
		mod: {
			maxHandcard(player, num) {
				return num + game.countGroup();
			},
		},
	}
```

## yufan 名字:虞翻 势力:wu

### zhiyan 名字:直言
描述: 结束阶段，你可以令一名角色摸一张牌并展示之，若为装备牌，其使用此牌并回复1点体力。
```js
zhiyan: {
		audio: 2,
		audioname: ["gexuan", "re_yufan"],
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt("zhiyan"),
					prompt2: "令一名角色摸一张牌并展示之。若为装备牌，则其回复1点体力",
					ai(target) {
						return get.attitude(_status.event.player, target);
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			let shouldRecover = false;
			const result = await target.draw({ visible: true }).forResult();
			const card = result.cards[0];
			if (get.type(card) == "equip") {
				if (target.getCards("h").includes(card) && target.hasUseTarget(card)) {
					await target.chooseUseTarget(card, true, "nopopup");
					await game.delay();
				}
				shouldRecover = true;
			}
			if (shouldRecover) {
				await target.recover();
			}
		},
		ai: {
			expose: 0.2,
			threaten: 1.2,
		},
	}
```

### zongxuan 名字:纵玄
描述: 当你的牌因弃置而进入弃牌堆后，你可以将其中任意张牌按任意顺序置于牌堆顶。
```js
zongxuan: {
		audio: 2,
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
				if (get.position(evt.cards2[i]) == "d") {
					return true;
				}
			}
			return false;
		},
		check(trigger, player) {
			if (
				trigger.getParent(3).name != "phaseDiscard" ||
				!game.hasPlayer(function (current) {
					return current.isDamaged() && get.recoverEffect(current, player, player) > 0;
				})
			) {
				return false;
			}
			var evt = trigger.getl(player);
			for (var i = 0; i < evt.cards2.length; i++) {
				if (get.position(evt.cards2[i], true) == "d" && get.type(evt.cards2[i], false) == "equip") {
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
				.set("list", [["本次弃置的牌", cards], ["牌堆顶"]])
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
						let max_val = 0;
						let max_card = false;
						for (const i of cards) {
							if (get.type2(i, false) == "trick") {
								const val = get.value(i, "raw");
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
						let max_val = 0;
						let max_card = false;
						const equip = game.hasPlayer(function (current) {
							return current.isDamaged() && get.recoverEffect(current, player, player) > 0;
						});
						for (const i of cards) {
							let val = get.value(i);
							const type = get.type2(i, false);
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
			}
		},
	}
```

## chengong 名字:陈宫 势力:qun

### mingce 名字:明策
描述: 出牌阶段，你可以交给一名其他角色一张装备牌或【杀】，然后令该角色选择一项：1. 视为对其攻击范围内的另一名由你指定的角色使用一张【杀】。2. 摸一张牌。每回合限一次。
```js
mingce: {
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
			} else {
				return ui.selected.targets[0].inRange(target);
			}
		},
		delay: false,
		async content(event, trigger, player) {
			const { cards, targets } = event;
			await player.give(cards, targets[0], true);
			let result;
			if (!lib.filter.filterTarget({ name: "sha", isCard: true }, targets[0], targets[1])) {
				result = { control: "draw_card" };
			} else {
				result = await targets[0]
					.chooseControl({
						prompt: "对" + get.translation(targets[1]) + "使用一张杀，或摸一张牌",
						controls: ["draw_card", "出杀"],
						ai() {
							const { player, target } = get.event();
							if (get.effect(_status.event.target, { name: "sha" }, player, player) > 0) {
								return 1;
							}
							return 0;
						},
					})
					.set("target", targets[1])
					.forResult();
			}
			if (result.control == "draw_card") {
				await targets[0].draw();
			} else {
				await targets[0].useCard({
					card: get.autoViewAs({ name: "sha", isCard: true }),
					targets: [targets[1]],
				});
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

### zhichi 名字:智迟
描述: 锁定技，当你于回合外受到伤害后，所有【杀】或普通锦囊牌对你无效直到回合结束。
```js
zhichi: {
		audio: 2,
		trigger: { player: "damageEnd" },
		audioname: ["re_chengong"],
		audioname2: { sxrm_caocao: "zhichi_sxrm_caocao", tw_sxrm_caocao: "zhichi_sxrm_caocao" },
		forced: true,
		filter(event, player) {
			return _status.currentPhase != player;
		},
		async content(event, trigger, player) {
			player.addTempSkill("zhichi2", ["phaseAfter", "phaseBefore"]);
		},
	}
```

## bulianshi 名字:步练师 势力:wu

### old_anxu 名字:安恤
描述: 出牌阶段限一次，你可以选择两名手牌数不同的其他角色，令其中手牌少的角色获得手牌多的角色的一张手牌并展示之。然后若此牌不为黑桃，则你摸一张牌。
```js
old_anxu: {
		enable: "phaseUse",
		usable: 1,
		multitarget: true,
		audio: "anxu",
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
			const { targets } = event;
			let gainner;
			let giver;
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
			if (!result.cards?.length) {
				return;
			}
			const card = result.cards[0];
			if (get.suit(card) == "spade") {
				return;
			}
			await player.draw();
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

### zhuiyi 名字:追忆
描述: 当你死亡时，你可以令一名其他角色（杀死你的角色除外）摸三张牌，然后其回复1点体力。
```js
zhuiyi: {
		audio: 2,
		audioname: ["re_bulianshi"],
		trigger: { player: "die" },
		skillAnimation: true,
		animationColor: "wood",
		forceDie: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("zhuiyi"),
					filterTarget(card, player, target) {
						return player !== target && _status.event.sourcex !== target;
					},
					ai(target) {
						let num = get.attitude(_status.event.player, target);
						if (num > 0) {
							if (target.hp == 1) {
								num += 2;
							}
							if (target.hp < target.maxHp) {
								num += 2;
							}
						}
						return num;
					},
				})
				.set("forceDie", true)
				.set("sourcex", trigger.source)
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.line(target, "green");
			await target.recover();
			await target.draw(3);
		},
		ai: {
			expose: 0.5,
		},
	}
```

## handang 名字:韩当 势力:wu

### gongji 名字:弓骑
描述: 出牌阶段限一次，你可以弃置一张牌，然后你的攻击范围视为无限直到回合结束。若你以此法弃置的牌为装备牌，则你可以弃置一名其他角色的一张牌。
```js
gongji: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		position: "he",
		filterCard: true,
		check(card) {
			if (get.type(card) != "equip") {
				return 0;
			}
			var player = _status.currentPhase;
			if (player.countCards("he", { subtype: get.subtype(card) }) > 1) {
				return 11 - get.equipValue(card);
			}
			return 6 - get.equipValue(card);
		},
		async content(event, trigger, player) {
			const { cards } = event;
			player.addTempSkill("gongji2");
			if (get.type(cards[0], null, cards[0].original == "h" ? player : false) != "equip") {
				return;
			}
			const result = await player
				.chooseTarget({
					prompt: "是否弃置一名角色的一张牌？",
					filterTarget(card, player, target) {
						return player != target && target.countCards("he") > 0;
					},
					ai(target) {
						const player = _status.event.player;
						if (get.attitude(player, target) < 0) {
							return Math.max(0.5, get.effect(target, { name: "sha" }, player, player));
						}
						return 0;
					},
				})
				.forResult();
			if (!result.bool || !result.targets?.length) {
				return;
			}
			player.line(result.targets, "green");
			const target = result.targets[0];
			await player.discardPlayerCard({
				target,
				position: "he",
				forced: true,
				ai: get.buttonValue,
			});
		},
		ai: {
			order: 9,
			result: {
				player: 1,
			},
		},
	}
```

### jiefan 名字:解烦
描述: 限定技，出牌阶段，你可以选择一名角色，令攻击范围内含有该角色的所有角色依次选择一项：1.弃置一张武器牌；2.令其摸一张牌。
```js
jiefan: {
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		audioname: ["re_handang"],
		limited: true,
		enable: "phaseUse",
		filterTarget: true,
		async content(event, trigger, player) {
			const { target } = event;
			player.awakenSkill(event.name);
			const players = game.filterPlayer(current => current !== target && current.inRange(target));
			players.sortBySeat(target);
			for (const current of players) {
				current.addTempClass("target");
				player.line(current, "green");
				let shouldDraw = true;
				if (current.countCards("he") && target.isIn()) {
					const result = await current
						.chooseToDiscard({
							prompt: "弃置一张武器牌或让" + get.translation(target) + "摸一张牌",
							filterCard: get.filter({ subtype: "equip1" }),
							position: "he",
							ai(card) {
								if (get.attitude(_status.event.player, _status.event.target) < 0) {
									return 7 - get.value(card);
								}
								return -1;
							},
						})
						.set("target", target)
						.forResult();
					shouldDraw = !result.bool;
				}
				if (shouldDraw) {
					await target.draw();
				}
			}
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					if (player.hp > 2) {
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

## fuhuanghou 名字:伏寿 势力:qun

### qiuyuan 名字:求援
描述: 当你成为【杀】的目标时，你可以令另一名其他角色选择一项：①、交给你一张【闪】；②、成为此【杀】的额外目标。
```js
qiuyuan: {
		audio: 2,
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			return (
				event.card.name == "sha" &&
				game.hasPlayer(current => {
					return current != player && !event.targets.includes(current) && lib.filter.targetEnabled(event.card, event.player, current);
				})
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					const evt = get.event().getTrigger();
					return target != player && !evt.targets.includes(target) && lib.filter.targetEnabled(evt.card, evt.player, target);
				})
				.set("ai", target => {
					const evt = get.event().getTrigger();
					const player = get.player();
					return get.effect(target, evt.card, evt.player, player) + 0.1;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const { card } = trigger;
			const { bool } = await target
				.chooseToGive({ name: "shan" }, `交给${get.translation(player)}一张【闪】，或成为${get.translation(card)}的额外目标`, player)
				.set("ai", card => {
					const { player, target } = get.event();
					return get.attitude(player, target) >= 0 ? 1 : -1;
				})
				.forResult();
			if (!bool) {
				trigger.getParent().targets.push(target);
				trigger.getParent().triggeredTargets2.push(target);
				game.log(target, "成为了", card, "的额外目标");
			}
		},
		ai: {
			expose: 0.2,
			effect: {
				target_use(card, player, target) {
					if (card.name != "sha") {
						return;
					}
					var players = game.filterPlayer();
					if (get.attitude(player, target) <= 0) {
						for (var i = 0; i < players.length; i++) {
							var target2 = players[i];
							if (player != target2 && target != target2 && player.canUse(card, target2, false) && get.effect(target2, { name: "shacopy", nature: card.nature, suit: card.suit }, player, target) > 0 && get.effect(target2, { name: "shacopy", nature: card.nature, suit: card.suit }, player, player) < 0) {
								if (target.hp == target.maxHp) {
									return 0.3;
								}
								return 0.6;
							}
						}
					} else {
						for (var i = 0; i < players.length; i++) {
							var target2 = players[i];
							if (player != target2 && target != target2 && player.canUse(card, target2, false) && get.effect(target2, { name: "shacopy", nature: card.nature, suit: card.suit }, player, player) > 0) {
								if (player.canUse(card, target2)) {
									return;
								}
								if (target.hp == target.maxHp) {
									return [0, 1];
								}
								return [0, 0];
							}
						}
					}
				},
			},
		},
	}
```

### zhuikong 名字:惴恐
描述: 其他角色的准备阶段，若你已受伤，你可以与该角色拼点。若你赢，该角色本回合使用的牌不能指定除该角色外的角色为目标。若你没赢，其本回合至你的距离视为1。
```js
zhuikong: {
		audio: 2,
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
		logTarget: "player",
		filter(event, player) {
			return player.hp < player.maxHp && player.canCompare(event.player);
		},
		async content(event, trigger, player) {
			const result = await player.chooseToCompare(trigger.player).forResult();
			if (result.bool) {
				if (event.name == "zhuikong") {
					trigger.player.addTempSkill("zishou2");
				} else {
					trigger.player.skip("phaseUse");
				}
			} else {
				trigger.player.storage.zhuikong_distance = player;
				trigger.player.addTempSkill("zhuikong_distance");
			}
		},
		subSkill: {
			distance: {
				sub: true,
				onremove: true,
				mod: {
					globalFrom(from, to, distance) {
						if (from.storage.zhuikong_distance == to) {
							return -Infinity;
						}
					},
				},
			},
		},
	}
```

## zhonghui 名字:钟会 势力:wei

### quanji 名字:权计
描述: 当你受到1点伤害后，你可以摸一张牌，然后将一张手牌置于武将牌上，称为“权”；你的手牌上限+X（X为“权”的数量）。
```js
quanji: {
		audio: 2,
		trigger: { player: "damageEnd" },
		frequent: true,
		locked: false,
		filter(event) {
			return event.num > 0;
		},
		getIndex: event => event.num,
		async content(event, trigger, player) {
			await player.draw();
			const hs = player.getCards("h");
			if (!hs.length) {
				return;
			}
			const result = hs.length == 1 ? { bool: true, cards: hs } : await player.chooseCard("h", true, "选择一张牌作为“权”").forResult();
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
		mod: {
			maxHandcard(player, num) {
				return num + player.getExpansions("quanji").length;
			},
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			notemp: true,
			threaten: 0.8,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage") && (player.hasSkill("paiyi") || player.hasSkill("zili"))) {
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

### zili 名字:自立
描述: `觉醒技，准备阶段开始时，若“权”的数量不小于3，你选择一项：1、回复1点体力；2、摸两张牌。然后减1点体力上限并获得技能${get.poptip("paiyi")}。`
```js
zili: {
		skillAnimation: true,
		animationColor: "thunder",
		audio: 2,
		audioname: ["re_zhonghui"],
		juexingji: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		derivation: "paiyi",
		filter(event, player) {
			return player.countExpansions("quanji") >= 3;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.chooseDrawRecover(2, true, (event, player) => {
				if (player.hp == 1 && player.getDamagedHp() > 1) {
					return "recover_hp";
				}
				return "draw_card";
			});
			await player.loseMaxHp();
			await player.addSkills("paiyi");
		},
		ai: { combo: "quanji" },
	}
```

## jianyong 名字:简雍 势力:shu

### qiaoshui 名字:巧说
描述: 出牌阶段开始时，你可与一名其他角色拼点。若你赢，你本回合使用下一张基本牌或普通锦囊牌时，可以为此牌增加或减少一个目标；若你没赢，你不能使用锦囊牌直到回合结束。
```js
qiaoshui: {
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
		},
	}
```

### jyzongshi 名字:纵适
描述: 当你拼点赢时，你可以获得对方此次拼点的牌；当你拼点没赢时，你可以收回你此次拼点的牌。
```js
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
	}
```

## old_madai 名字:马岱 势力:shu

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### qianxi 名字:潜袭
描述: 准备阶段，你可以摸一张牌，并弃置一张牌，然后令一名距离为1的角色不能使用或打出与你弃置的牌颜色相同的手牌直到回合结束。
```js
qianxi: {
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
				result.targets[0].storage.qianxi2 = color;
				player.line(result.targets, "green");
				result.targets[0].addTempSkill("qianxi2");
				result.targets[0].markSkill("qianxi2");
			}
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
		},
	}
```

## liufeng 名字:刘封 势力:shu

### xiansi 名字:陷嗣
描述: 准备阶段开始时，你可以将一至两名角色的各一张牌置于你的武将牌上，称为“逆”；当一名角色需要对你使用【杀】时，其可以移去两张“逆”，然后视为对你使用了一张【杀】。
```js
xiansi: {
		audio: 2,
		audioname: ["re_liufeng"],
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		onremove(player) {
			const cards = player.getExpansions("xiansi");
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("xiansi"),
					filterTarget(card, player, target) {
						return target.countCards("he") > 0;
					},
					selectTarget: [1, 2],
					ai(target) {
						const player = get.player();
						return -get.attitude(player, target);
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			for (const target of event.targets) {
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
					gaintag: ["xiansi"],
				});
			}
		},
		group: "xiansix",
		global: "xiansi2",
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		ai: {
			threaten: 2,
		},
	}
```

## manchong 名字:满宠 势力:wei

### junxing 名字:峻刑
描述: 出牌阶段限一次，你可以弃置至少一张手牌并选择一名其他角色，该角色需弃置一张与你弃置的牌类别均不同的手牌，否则其先将其武将牌翻面再摸X张牌（X为你以此法弃置的手牌数量）。
```js
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
			var val = get.value(card);
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
						if (_status.event.player.isTurnedOver()) {
							return -1;
						}
						return 8 - get.value(card);
					},
				})
				.set("types", types)
				.set("dialog", ["弃置一张与" + get.translation(player) + "弃置的牌类别均不同的牌，或将武将牌翻面", "hidden", cards])
				.forResult();
			if (!result.bool) {
				await target.turnOver();
				await target.draw(cards.length);
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
	}
```

### yuce 名字:御策
描述: 当你受到伤害后，你可以展示一张手牌，并令伤害来源选择一项：弃置一张与此牌类型不同的手牌，或令你回复1点体力。
```js
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
			const {
				cards: [card],
				targets,
			} = event;
			await player.showCards(card, get.translation(player) + "发动了【御策】");
			const type = get.type2(card);
			let result;
			if (targets?.length && targets[0]?.isIn()) {
				result = await targets[0]
					.chooseToDiscard({
						prompt: "弃置一张不为" + get.translation(type) + "牌的手牌或令" + get.translation(player) + "回复1点体力",
						filterCard(card) {
							return get.type(card, "trick") != _status.event.type;
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
			} else {
				result = { bool: false };
			}
			if (!result.bool) {
				await player.recover({ source: targets?.[0] });
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
	}
```

## chenqun 名字:陈群 势力:wei

### pindi 名字:品第
描述: 出牌阶段，你可以弃置一张牌并选择一名其他角色（不能弃置相同类型牌且不能指定相同的角色），然后令其执行一项：摸X张牌；弃置X张牌（X为本回合此技能发动次数）。若其已受伤，你横置。
```js
pindi: {
		audio: 2,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			if (player.storage.pindi_target && player.storage.pindi_target.includes(target)) {
				return false;
			}
			return true;
		},
		filterCard(card, player) {
			if (player.storage.pindi_type && player.storage.pindi_type.includes(get.type2(card))) {
				return false;
			}
			return true;
		},
		subSkill: {
			clear: {
				trigger: { player: "phaseAfter" },
				silent: true,
				async content(event, trigger, player) {
					delete player.storage.pindi_target;
					delete player.storage.pindi_type;
				},
			},
		},
		//group:'pindi_clear',
		check(card) {
			var num = _status.event.player.getStat("skill").pindi || 0;
			return 6 + num - get.value(card);
		},
		position: "he",
		async content(event, trigger, player) {
			const { target, cards } = event;
			if (!player.storage.pindi_target) {
				player.storage.pindi_target = [];
			}
			if (!player.storage.pindi_type) {
				player.storage.pindi_type = [];
			}
			player.storage.pindi_target.push(target);
			player.storage.pindi_type.push(get.type2(cards[0], cards[0].original == "h" ? player : false));
			const num = player.getStat("skill").pindi;
			const evt = _status.event.getParent("phase");
			if (evt && evt.name == "phase" && !evt.pindi) {
				const next = game.createEvent("rerende_clear");
				_status.event.next.remove(next);
				evt.after.push(next);
				evt.pindi = true;
				next.player = player;
				next.setContent(lib.skill.pindi_clear.content);
			}
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
			if (result.index == 0) {
				await target.draw(num);
			} else {
				await target.chooseToDiscard(num, "he", true);
			}
			if (target.isDamaged()) {
				await player.link(true);
			}
		},
		ai: {
			order: 8,
			threaten: 1.8,
			result: {
				target(player, target) {
					var att = get.attitude(player, target);
					var num = (player.getStat("skill").pindi || 0) + 1;
					if (att <= 0 && target.countCards("he") < num) {
						return 0;
					}
					return get.sgn(att);
				},
			},
		},
	}
```

### faen 名字:法恩
描述: 当一名角色翻至正面或横置后，你可以令其摸一张牌。
```js
faen: {
		audio: 2,
		trigger: { global: ["turnOverAfter", "linkAfter"] },
		filter(event, player) {
			if (event.name == "link") {
				return event.player.isLinked();
			}
			return !event.player.isTurnedOver();
		},
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			trigger.player.draw();
		},
		ai: {
			expose: 0.2,
		},
		global: "faen_global",
		subSkill: {
			global: {
				ai: {
					effect: {
						target(card, player, target) {
							if (card.name == "tiesuo" && !target.isLinked()) {
								return [
									1,
									0.6 *
										game.countPlayer(cur => {
											return (cur.hasSkill("faen") || cur.hasSkill("oldfaen") || cur.hasSkill("refaen") || cur.hasSkill("dcfaen")) && get.attitude(target, cur) > 0;
										}),
								];
							}
						},
					},
				},
			},
		},
	}
```

## sunluban 名字:孙鲁班 势力:wu

### chanhui 名字:谮毁
描述: 出牌阶段限一次，当你使用【杀】或黑色普通锦囊牌指定唯一目标时，你可令可以成为此牌目标的另一名其他角色选择一项：交给你一张牌并成为此牌的使用者；或成为此牌的额外目标。
```js
chanhui: {
		audio: 2,
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			if (_status.currentPhase != player) {
				return false;
			}
			if (player.hasSkill("chanhui2")) {
				return false;
			}
			if (event.targets.length > 1) {
				return false;
			}
			var card = event.card;
			if (card.name == "sha") {
				return true;
			}
			if (get.color(card) == "black" && get.type(card) == "trick") {
				return true;
			}
			return false;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("chanhui"),
					filterTarget(card, player, target) {
						if (player === target) {
							return false;
						}
						const evt = _status.event.getTrigger();
						return !evt.targets.includes(target) && lib.filter.targetEnabled2(evt.card, player, target) && lib.filter.targetInRange(evt.card, player, target);
					},
					ai(target) {
						const event = get.event();
						const trigger = event.getTrigger();
						const player = get.player();
						return get.effect(target, trigger.card, player, player) + 0.01;
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.addTempSkill("chanhui2");
			const result = await target
				.chooseCard({
					prompt: `交给${get.translation(player)}一张手牌，或成为${get.translation(trigger.card)}的额外目标`,
					ai(card) {
						return 5 - get.value(card);
					},
				})
				.forResult();
			if (result.bool) {
				await target.give(result.cards, player);
				trigger.untrigger();
				trigger.getParent().player = target;
				game.log(target, "成为了", trigger.card, "的使用者");
			} else {
				game.log(target, "成为了", trigger.card, "的额外目标");
				trigger.getParent().targets.push(target);
			}
		},
	}
```

### jiaojin 名字:骄矜
描述: 当你受到男性角色造成的伤害时，你可以弃置一张装备牌，令此伤害-1。
```js
jiaojin: {
		audio: 2,
		trigger: { player: "damageBegin3" },
		filter(event, player) {
			return player.countCards("he", { type: "equip" }) > 0 && event.source && event.source.hasSex("male");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard({
					prompt: "骄矜：是否弃置一张装备牌令伤害-1？",
					filterCard(card, player) {
						return get.type(card) === "equip";
					},
					position: "he",
					ai(card) {
						const event = get.event();
						const player = event.player;
						if (player.hp === 1 || event.getTrigger().num > 1) {
							return 9 - get.value(card);
						}
						if (player.hp === 2) {
							return 8 - get.value(card);
						}
						return 7 - get.value(card);
					},
				})
				.set("chooseonly", true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discard({
				cards: event.cards,
				discarder: player,
			});
			--trigger.num;
		},
	}
```

## guyong 名字:顾雍 势力:wu

### shenxing 名字:慎行
描述: 出牌阶段，你可以弃置两张牌，然后摸一张牌。
```js
shenxing: {
		audio: 2,
		enable: "phaseUse",
		position: "he",
		filterCard: lib.filter.cardDiscardable,
		selectCard: 2,
		prompt: "弃置两张牌并摸一张牌",
		check(card) {
			var player = _status.event.player;
			if (!player.hasSkill("olbingyi") || player.hasSkill("olbingyi_blocker", null, null, false)) {
				return 4 - get.value(card);
			}
			var red = 0,
				black = 0,
				hs = player.getCards("h");
			for (var i of hs) {
				if (ui.selected.cards.includes(i)) {
					continue;
				}
				var color = get.color(i, player);
				if (color == "red") {
					red++;
				}
				if (color == "black") {
					black++;
				}
			}
			if (red > 2 && black > 2) {
				return 4 - get.value(card);
			}
			if (red == 0 || black == 0) {
				return 8 - get.value(card);
			}
			var color = get.color(card);
			if (black <= red) {
				return (color == "black" && get.position(card) == "h" ? 8 : 4) - get.value(card);
			}
			return (color == "red" && get.position(card) == "h" ? 8 : 4) - get.value(card);
		},
		async content(event, trigger, player) {
			await player.draw();
		},
		ai: {
			order: 9,
			result: {
				player(player, target) {
					if (!ui.selected.cards.length) {
						return 1;
					}
					if (!player.hasSkill("olbingyi") || player.hasSkill("olbingyi_blocker", null, null, false)) {
						return 1;
					}
					var red = 0,
						black = 0,
						hs = player.getCards("h");
					for (var i of hs) {
						if (ui.selected.cards.includes(i)) {
							continue;
						}
						var color = get.color(i);
						if (color == "red") {
							red++;
						}
						if (color == "black") {
							black++;
						}
					}
					var val = 0;
					for (var i of ui.selected.cards) {
						val += get.value(i, player);
					}
					if (red == 0 || black == 0) {
						if (red + black == 0) {
							return 0;
						}
						var num =
							Math.min(
								red + black,
								game.countPlayer(function (current) {
									return current != player && get.attitude(player, current) > 0 && !current.hasSkillTag("nogain");
								})
							) + 1;
						if (num * 7 > val) {
							return 1;
						}
					}
					if (val < 8) {
						return 1;
					}
					return 0;
				},
			},
		},
	}
```

### olbingyi 名字:秉壹
描述: 每阶段限一次。当你因弃置而失去牌后，你可以展示所有手牌。若这些牌的颜色均相同，则你可以与至多X名其他角色各摸一张牌（X为你的手牌数）。
```js
olbingyi: {
		audio: "bingyi",
		trigger: {
			player: "loseAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			return event.type == "discard" && event.getl(player).cards2.length > 0 && player.hasCards("h") && !player.hasSkill("olbingyi_blocker", null, null, false);
		},
		prompt2(event, player) {
			let str = "展示所有手牌，然后";
			const hs = player.getCards("h");
			const colors = hs.map(card => get.color(card)).toUniqued();
			if (colors.length != 1) {
				return str + "无事发生";
			}
			str += "令至多" + get.cnNumber(hs.length) + "名其他角色和自己各摸一张牌";
			return str;
		},
		check(event, player) {
			const colors = player
				.getCards("h")
				.map(card => get.color(card))
				.toUniqued();
			return colors.length == 1;
		},
		async content(event, trigger, player) {
			player.addTempSkill("olbingyi_blocker", ["phaseZhunbeiAfter", "phaseJudgeAfter", "phaseDrawAfter", "phaseUseAfter", "phaseDiscardAfter", "phaseJieshuAfter"]);

			const cards = player.getCards("h");
			await player.showCards(cards, `${get.translation(player)}发动了【秉壹】`);

			const colors = cards.map(card => get.color(card)).toUniqued();
			if (colors.length != 1) {
				return;
			}

			const num = cards.length;
			const result = !game.hasPlayer(current => current !== player)
				? { bool: false }
				: await player
						.chooseTarget({
							prompt: `秉壹：令至多${get.cnNumber(num)}名其他角色也各摸一张牌`,
							filterTarget(card, player, target) {
								return player !== target;
							},
							selectTarget: [1, num],
							ai(target) {
								const player = get.player();
								let att = get.attitude(player, target) / Math.sqrt(1 + target.countCards("h"));
								if (target.hasSkillTag("nogain")) {
									att /= 10;
								}
								return att;
							},
						})
						.forResult();

			if (!result?.bool || !result.targets?.length) {
				await player.draw();
				return;
			}

			const targets = result.targets;
			player.line(targets, "green");
			targets.push(player);
			await game.asyncDraw(targets.sortBySeat());
			await game.delayx();
		},
		subSkill: {
			blocker: {
				charlotte: true,
			},
		},
	}
```

## caifuren 名字:蔡夫人 势力:qun

### qieting 名字:窃听
描述: 其他角色的回合结束时，若其未于此回合内使用过指定其他角色为目标的牌，你可以选择一项：将其装备区里的一张牌移动至你装备区里的相应位置；或摸一张牌。
```js
qieting: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			if (event.player == player || !event.player.isIn()) {
				return false;
			}
			var history = event.player.getHistory("useCard");
			for (var i = 0; i < history.length; i++) {
				if (!history[i].targets) {
					continue;
				}
				for (var j = 0; j < history[i].targets.length; j++) {
					if (history[i].targets[j] != event.player) {
						return false;
					}
				}
			}
			return true;
		},
		direct: true,
		async content(event, trigger, player) {
			let result;
			if (trigger.player.hasCard(card => player.canEquip(card), "e")) {
				result = await player
					.chooseControl({
						prompt: get.prompt("qieting", trigger.player),
						controls: ["移动装备", "draw_card", "cancel2"],
						ai(event, player) {
							const source = _status.event.sourcex;
							const att = get.attitude(player, source);
							if (source.hasSkillTag("noe")) {
								if (att > 0) {
									return "移动装备";
								}
							} else {
								if (att <= 0 && source.countCards("e", card => get.value(card, source) > 0 && get.effect(player, card, player, player) > 0)) {
									return "移动装备";
								}
							}
							return "draw_card";
						},
					})
					.set("sourcex", trigger.player)
					.forResult();
			} else {
				result = await player
					.chooseControl({
						prompt: get.prompt("qieting", trigger.player),
						controls: ["draw_card", "cancel2"],
						ai() {
							return "draw_card";
						},
					})
					.forResult();
			}
			if (result.control != "移动装备") {
				if (result.control == "draw_card") {
					player.logSkill("qieting");
					await player.draw();
				}
				return;
			}
			player.logSkill("qieting", trigger.player);
			result = await player
				.choosePlayerCard({
					prompt: "将一张装备牌移至你的装备区",
					target: trigger.player,
					filterButton(button) {
						return _status.event.player.canEquip(button.link);
					},
					position: "e",
					forced: true,
					ai(button) {
						return get.effect(player, button.link, player, player);
					},
				})
				.forResult();
			if (!result || !result.links || !result.links.length) {
				return;
			}
			await game.delay(2);
			trigger.player.$give(result.links[0], player, false);
			await player.equip(result.links[0]);
			player.addExpose(0.2);
		},
	}
```

### xianzhou 名字:献州
描述: 限定技。出牌阶段，你可以将装备区内的所有牌交给一名其他角色，然后该角色选择一项：令你回复X点体力；或对其攻击范围内的至多X名角色各造成1点伤害(X为你以此法交给该角色的牌的数量)。
```js
xianzhou: {
		skillAnimation: true,
		animationColor: "gray",
		audio: 2,
		audioname: ["xin_caifuren", "ol_caifuren"],
		limited: true,
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("e") > 0;
		},
		filterTarget(card, player, target) {
			return player != target;
		},
		delay: false,
		async content(event, trigger, player) {
			const cards = player.getCards("e");
			const target = event.target;
			const num = cards.length;
			player.awakenSkill(event.name);
			await player.give(cards, target);
			await game.delay();

			const result = await target
				.chooseTarget({
					prompt: "令" + get.translation(player) + "回复" + num + "点体力，或对攻击范围内的" + num + "名角色造成1点伤害",
					filterTarget(card, player, target2) {
						return _status.event.player.inRange(target2);
					},
					selectTarget: [1, num],
					ai(target2) {
						const target = _status.event.player;
						const player = _status.event.getParent().player;
						if (get.attitude(target, player) > 0) {
							if (player.hp + num <= player.maxHp || player.hp == 1) {
								return -1;
							}
						}
						return get.damageEffect(target2, target, target);
					},
				})
				.forResult();
			if (!result.bool) {
				await player.recover({
					num,
					source: target,
				});
				return;
			}
			target.line(result.targets, "green");
			for (const targetx of result.targets) {
				await targetx.damage({ source: target });
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

## yj_jushou 名字:沮授 势力:qun

### jianying 名字:渐营
描述: 当你于出牌阶段内使用与此阶段你使用的上一张牌点数或花色相同的牌时，你可以摸一张牌。
```js
jianying: {
		audio: 2,
		locked: false,
		mod: {
			aiOrder(player, card, num) {
				if (typeof card == "object" && player.isPhaseUsing()) {
					var evt = player.getLastUsed();
					if (!evt || !evt.card || evt.getParent("phaseUse") !== _status.event.getParent("phaseUse")) {
						return num;
					}
					if ((get.suit(evt.card) && get.suit(evt.card) == get.suit(card)) || (evt.card.number && evt.card.number == get.number(card))) {
						return num + 10;
					}
				}
			},
		},
		trigger: { player: "useCard" },
		frequent: true,
		filter(event, player) {
			if (!player.isPhaseUsing()) {
				return false;
			}
			player.addTip("jianying", "渐营 " + get.translation(get.suit(event.card, player)) + get.translation(get.strNumber(get.number(event.card, player))), true);
			var evt = player.getLastUsed(1);
			if (!evt || !evt.card) {
				return false;
			}
			var evt2 = evt.getParent("phaseUse");
			if (!evt2 || evt2.name != "phaseUse" || evt2 !== event.getParent("phaseUse")) {
				return false;
			}
			return (get.suit(evt.card) != "none" && get.suit(evt.card) == get.suit(event.card)) || (typeof get.number(evt.card, false) == "number" && get.number(evt.card, false) == get.number(event.card));
		},
		async content(event, trigger, player) {
			player.draw("nodelay");
		},
		group: "jianying_mark",
		init(player) {
			if (player.isPhaseUsing()) {
				var evt = _status.event.getParent("phaseUse");
				var history = player.getHistory("useCard", function (evt2) {
					return evt2.getParent("phaseUse") == evt;
				});
				if (history.length) {
					var trigger = history[history.length - 1];
					if (get.suit(trigger.card, player) == "none" || typeof get.number(trigger.card, player) != "number") {
						return;
					}
					player.storage.jianying_mark = trigger.card;
					player.markSkill("jianying_mark");
					game.broadcastAll(
						function (player, suit) {
							if (player.marks.jianying_mark) {
								player.marks.jianying_mark.firstChild.innerHTML = get.translation(suit);
							}
						},
						player,
						get.suit(trigger.card, player)
					);
					player.when("phaseUseAfter").step(async () => {
						player.unmarkSkill("jianying_mark");
						delete player.storage.jianying_mark;
					});
				}
			}
		},
		onremove(player) {
			player.unmarkSkill("jianying_mark");
			delete player.storage.jianying_mark;
		},
		subSkill: {
			mark: {
				charlotte: true,
				trigger: { player: "useCard1" },
				filter(event, player) {
					return player.isPhaseUsing();
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					if (get.suit(trigger.card, player) == "none" || typeof get.number(trigger.card, player) != "number") {
						player.unmarkSkill("jianying_mark");
					} else {
						player.storage.jianying_mark = trigger.card;
						player.markSkill("jianying_mark");
						game.broadcastAll(
							function (player, suit) {
								if (player.marks.jianying_mark) {
									player.marks.jianying_mark.firstChild.innerHTML = get.translation(suit);
								}
							},
							player,
							get.suit(trigger.card, player)
						);
						player.when("phaseUseAfter").step(async () => {
							player.unmarkSkill("jianying_mark");
							delete player.storage.jianying_mark;
						});
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

### shibei 名字:矢北
描述: 锁定技，当你受到伤害后：若此伤害是你本回合第一次受到的伤害，则你回复1点体力；否则你失去1点体力。
```js
shibei: {
		trigger: { player: "damageEnd" },
		forced: true,
		audio: 2,
		audioname: ["xin_jushou"],
		audioname2: { sxrm_caocao: "shibei_sxrm_caocao", tw_sxrm_caocao: "shibei_sxrm_caocao" },
		check(event, player) {
			return player.getHistory("damage").indexOf(event) == 0;
		},
		async content(event, trigger, player) {
			if (player.getHistory("damage").indexOf(trigger) > 0) {
				player.loseHp();
			} else {
				player.recover();
			}
		},
		subSkill: {
			damaged: {},
			ai: {},
			xin_jushou: { audio: 2 },
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
							if (get.attitude(player, target) < 0 && !player.hasSkillTag("damageBonus")) {
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

## zhangsong 名字:张松 势力:shu

### qiangzhi 名字:强识
描述: 出牌阶段开始时，你可以展示一名其他角色的一张手牌。若如此做，当你于此阶段内使用与此牌类别相同的牌时，你可以摸一张牌。
```js
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
	}
```

### xiantu 名字:献图
描述: 一名其他角色的出牌阶段开始时，你可以摸两张牌，然后交给其两张牌。若如此做，此阶段结束时，若该角色未于此阶段内杀死过角色，则你失去1点体力。
```js
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
		prompt2: "摸两张牌，然后交给其两张牌。若该角色于本回合阶段时未杀死过角色，则你失去1点体力。",
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
				player
					.when({
						global: "phaseAnyEnd",
					})
					.filter(evt => evt == event.getParent(evt.name, true, true))
					.step(async (event, trigger, player) => {
						if (
							game.hasGlobalHistory("everything", evt => {
								if (evt.name != "die" || evt.source != target) {
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
	}
```

## zhuhuan 名字:朱桓 势力:wu

### fenli 名字:奋励
描述: 若你的手牌数为全场最多，你可以跳过摸牌阶段；若你的体力值为全场最多，你可以跳过出牌阶段；若你的装备区里有牌且数量为全场最多，你可以跳过弃牌阶段。
```js
fenli: {
		audio: 2,
		audioname: ["xin_zhuhuan"],
		group: ["fenli_draw", "fenli_use", "fenli_discard"],
		subfrequent: ["discard"],
		subSkill: {
			draw: {
				audio: "fenli",
				audioname: ["xin_zhuhuan"],
				trigger: { player: "phaseDrawBefore" },
				prompt: "是否发动【奋励】跳过摸牌阶段？",
				filter(event, player) {
					return player.isMaxHandcard();
				},
				check(event, player) {
					if ((!player.hasSkill("pingkou") && !player.hasSkill("xinpingkou")) || player.getHistory("skipped").length > 0) {
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
			use: {
				audio: "fenli",
				audioname: ["xin_zhuhuan"],
				trigger: { player: "phaseUseBefore" },
				prompt: "是否发动【奋励】跳过出牌阶段？",
				filter(event, player) {
					return player.isMaxHp();
				},
				check(event, player) {
					if (!player.hasSkill("pingkou") && !player.hasSkill("xinpingkou")) {
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
				audio: "fenli",
				audioname: ["xin_zhuhuan"],
				trigger: { player: "phaseDiscardBefore" },
				prompt: "是否发动【奋励】跳过弃牌阶段？",
				frequent: true,
				filter(event, player) {
					return player.isMaxEquip() && player.countCards("e") > 0;
				},
				async content(event, trigger, player) {
					trigger.cancel();
				},
			},
		},
		ai: {
			combo: "pingkou",
		},
	}
```

### pingkou 名字:平寇
描述: 回合结束时，你可以对至多X名其他角色各造成1点伤害（X为你本回合跳过的阶段数）。
```js
pingkou: {
		audio: 2,
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			return player.getHistory("skipped").length > 0;
		},
		async cost(event, trigger, player) {
			const skippedCount = player.getHistory("skipped").length;
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("pingkou"),
					filterTarget(card, player, target) {
						return target !== player;
					},
					selectTarget: [1, skippedCount],
					ai(target) {
						return get.damageEffect(target, get.player(), get.player());
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			// @ts-ignore
			await game.doAsyncInOrder(event.targets, target => target.damage());
		},
		ai: {
			effect: {
				target(card) {
					if (card.name == "lebu" || card.name == "bingliang") {
						return 0.5;
					}
				},
			},
			combo: "fenli",
		},
	}
```

## xiahoushi 名字:夏侯氏 势力:shu

### qiaoshi 名字:樵拾
描述: 其他角色的结束阶段开始时，若你的手牌数与其相等，则你可以与其各摸一张牌。
```js
qiaoshi: {
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
			game.asyncDraw([trigger.player, player]);
		},
	}
```

### yanyu 名字:燕语
描述: 出牌阶段，你可以重铸【杀】。出牌阶段结束时，若你于此阶段以此法重铸了至少两张【杀】，则你可以令一名男性角色摸两张牌。
```js
yanyu: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.hasCard(card => lib.skill.yanyu.filterCard(card, player), "h");
		},
		filterCard: (card, player) => get.name(card) == "sha" && player.canRecast(card),
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const { cards } = event;
			player.recast(cards);
		},
		ai: {
			basic: {
				order: 1,
			},
			result: {
				player: 1,
			},
		},
		group: "yanyu2",
	}
```

## panzhangmazhong 名字:潘璋马忠 势力:wu

### duodao 名字:夺刀
描述: 当你受到【杀】造成的伤害后，你可以弃置一张牌，然后获得伤害来源装备区里的武器牌。
```js
duodao: {
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return player.countCards("he") > 0 && event.source && event.card && event.card.name == "sha";
		},
		async cost(event, trigger, player) {
			let prompt = "弃置一张牌，然后",
				cards = trigger.source.getEquips(1).filter(card => {
					return lib.filter.canBeGained(card, player, trigger.source);
				});
			if (cards.length) {
				prompt += "获得" + get.translation(trigger.source) + "装备区中的" + get.translation(cards);
			} else {
				prompt += "无事发生";
			}
			event.result = await player
				.chooseToDiscard("he", get.prompt(event.skill, trigger.source), prompt)
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
						let es = trigger.source.getEquips(1).filter(card => {
							return lib.filter.canBeGained(card, player, trigger.source);
						});
						if (!es.length) {
							return false;
						}
						if (get.attitude(player, trigger.source) > 0) {
							return (
								-2 *
								es.reduce((acc, card) => {
									return acc + get.value(card, trigger.source);
								}, 0)
							);
						}
						return es.reduce((acc, card) => {
							return acc + get.value(card, player);
						}, 0);
					})()
				)
				.forResult();
		},
		logTarget: "source",
		async content(event, trigger, player) {
			const cards = trigger.source.getEquips(1).filter(card => {
				return lib.filter.canBeGained(card, player, trigger.source);
			});
			if (cards.length) {
				player.gain(cards, trigger.source, "give", "bySelf");
			}
		},
		ai: {
			maixie_defend: true,
		},
	}
```

### anjian 名字:暗箭
描述: 锁定技，当你使用【杀】对目标角色造成伤害时，若你不在其攻击范围内，则此【杀】伤害+1。
```js
anjian: {
		audio: 2,
		trigger: { source: "damageBegin1" },
		check(event, player) {
			return get.attitude(player, event.player) <= 0;
		},
		forced: true,
		filter(event, player) {
			return event.getParent().name == "sha" && !event.player.inRange(player);
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	}
```

## zhoucang 名字:周仓 势力:shu

### xinzhongyong 名字:忠勇
描述: 当你使用的【杀】结算完毕后，你可以将此【杀】或目标角色使用的【闪】交给一名该角色以外的其他角色，以此法得到红色牌的角色可以对你攻击范围内的角色使用一张【杀】。
```js
xinzhongyong: {
		audio: "zhongyong",
		trigger: {
			player: "useCardAfter",
		},
		filter(event, player) {
			return event.card.name == "sha";
		},
		async cost(event, trigger, player) {
			const sha = trigger.cards.slice(0).filterInD();
			const shan = [];
			for (const current of game.filterPlayer2()) {
				for (const evt of current.getHistory("useCard", evt => evt.card.name === "shan" && evt.getParent(3) == trigger)) {
					shan.addArray(evt.cards);
				}
			}
			shan.filterInD();

			if (!sha.length && !shan.length) {
				return;
			}

			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("xinzhongyong"),
					filterTarget(card, player, target) {
						return !_status.event.source.includes(target) && target !== player;
					},
					ai(target) {
						return get.attitude(_status.event.player, target);
					},
				})
				.set("source", trigger.targets)
				.forResult();

			event.result.cost_data = {
				sha,
				shan,
			};
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			const { sha, shan } = event.cost_data;

			let result;
			if (sha.length && shan.length) {
				result = await player
					.chooseControl({
						choiceList: ["将" + get.translation(event.sha) + "交给" + get.translation(target), "将" + get.translation(event.shan) + "交给" + get.translation(target)],
						ai() {
							return _status.event.choice;
						},
					})
					.set(
						"choice",
						(function () {
							if (get.color(event.sha) != "black") {
								return 0;
							}
							return 1;
						})()
					)
					.forResult();
			} else {
				result = { index: sha.length ? 0 : 1 };
			}

			const cards = result.index == 0 ? sha : shan;
			await target.gain({
				cards,
				animate: "gain2",
			});
			if (cards.some(card => get.color(card) === "red")) {
				await target
					.chooseToUse({
						prompt: "是否使用一张杀？",
						filterCard: get.filter({ name: "sha" }),
						filterTarget(card, player, target) {
							return target != _status.event.sourcex && _status.event.sourcex.inRange(target) && lib.filter.targetEnabled.apply(this, arguments);
						},
					})
					.set("sourcex", player)
					.set("addCount", false);
			}
		},
	}
```

## guanping 名字:关平 势力:shu

### longyin 名字:龙吟
描述: 当一名角色于其出牌阶段内使用【杀】时，你可弃置一张牌令此【杀】不计入出牌阶段使用次数，若此【杀】为红色，你摸一张牌。
```js
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
	}
```

## liaohua 名字:廖化 势力:shu

### dangxian 名字:当先
描述: 锁定技，回合开始时，你执行一个额外的出牌阶段。
```js
dangxian: {
		trigger: { player: "phaseBegin" },
		forced: true,
		audio: 2,
		audioname2: { guansuo: "dangxian_guansuo" },
		async content(event, trigger, player) {
			trigger.phaseList.splice(trigger.num, 0, `phaseUse|${event.name}`);
		},
	}
```

### fuli 名字:伏枥
描述: 限定技，当你处于濒死状态时，你可以将体力回复至与场上势力数相同，然后翻面。
```js
fuli: {
		skillAnimation: true,
		animationColor: "soil",
		audio: 2,
		limited: true,
		enable: "chooseToUse",
		filter(event, player) {
			if (event.type != "dying") {
				return false;
			}
			if (player != event.dying) {
				return false;
			}
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.recoverTo(game.countGroup());
			await player.turnOver();
		},
		ai: {
			save: true,
			skillTagFilter(player, arg, target) {
				return player == target && player.storage.fuli != true;
			},
			result: {
				player: 10,
			},
			threaten(player, target) {
				if (!target.storage.fuli) {
					return 0.9;
				}
			},
		},
	}
```

## chengpu 名字:程普 势力:wu

### lihuo 名字:疠火
描述: 当你声明使用普通【杀】后，你可以将此【杀】改为火【杀】。若以此法使用的【杀】造成了伤害，则此【杀】结算后你失去1点体力；你使用火【杀】选择目标后，可以额外指定一个目标。
```js
lihuo: {
		trigger: { player: "useCard1" },
		filter(event, player) {
			if (event.card.name == "sha" && !game.hasNature(event.card)) {
				return true;
			}
			return false;
		},
		audio: 2,
		audioname: ["re_chengpu"],
		check(event, player) {
			return false;
		},
		async content(event, trigger, player) {
			const { card } = event;
			game.setNature(trigger.card, "fire");
			const next = game.createEvent("lihuo_clear");
			next.player = player;
			next.card = trigger.card;
			event.next.remove(next);
			next.forceDie = true;
			trigger.after.push(next);
			next.setContent(function () {
				if (
					player.isIn() &&
					player.getHistory("sourceDamage", function (evt) {
						return evt.getParent(2) == event.parent;
					}).length > 0
				) {
					player.loseHp();
				}
				game.setNature(card, [], true);
			});
		},
		group: "lihuo2",
	}
```

### chunlao 名字:醇醪
描述: 结束阶段开始时，若你没有“醇”，你可以将至少一张【杀】置于你的武将牌上，称为“醇”。当一名角色处于濒死状态时，你可以移去一张“醇”，视为该角色使用一张【酒】。
```js
chunlao: {
		trigger: { player: "phaseJieshuBegin" },
		audio: 2,
		audioname: ["xin_chengpu"],
		filter(event, player) {
			return player.countCards("h") > 0 && (_status.connectMode || player.countCards("h", "sha") > 0) && !player.getExpansions("chunlao").length;
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: get.prompt("chunlao"),
					filterCard: get.filter({ name: "sha" }),
					selectCard: [1, Math.max(1, player.countCards("h", "sha"))],
					allowChooseAll: true,
					ai() {
						return 1;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await player.addToExpansion({
				cards: event.cards,
				source: player,
				animate: "giveAuto",
				gaintag: ["chunlao"],
			});
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					if (_status.currentPhase != player) {
						return;
					}
					if (card.name == "sha" && !player.needsToDiscard() && !player.getExpansions("chunlao").length && target.hp > 1) {
						return "zeroplayertarget";
					}
				},
			},
			threaten: 1.4,
		},
		group: "chunlao2",
	}
```

## gaoshun 名字:高顺 势力:qun

### xinxianzhen 名字:陷阵
描述: 出牌阶段限一次，你可以与一名角色拼点。若你赢，你获得以下效果直到回合结束：无视该角色的防具且对其使用牌没有次数和距离限制，且当你使用【杀】或普通锦囊牌指定唯一目标时，可以令该角色也成为此牌的目标。若你没赢，你不能使用【杀】且你的【杀】不计入手牌上限直到回合结束。
```js
xinxianzhen: {
		audio: "xianzhen",
		inherit: "xianzhen",
	}
```

### jinjiu 名字:禁酒
描述: 锁定技，你的【酒】均视为【杀】。
```js
jinjiu: {
		mod: {
			cardname(card, player) {
				if (card.name == "jiu") {
					return "sha";
				}
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
		audio: 2,
		trigger: { player: ["useCard1", "respond"] },
		firstDo: true,
		forced: true,
		filter(event, player) {
			return event.card.name == "sha" && !event.skill && event.cards.length == 1 && event.cards[0].name == "jiu";
		},
		async content(event, trigger, player) {},
	}
```

## caozhen 名字:曹真 势力:wei

### xinsidi 名字:司敌
描述: 其他角色出牌阶段开始时，你可以弃置一张与你装备区里的牌颜色相同的非基本牌，然后该角色于此阶段内不能使用和打出与此牌颜色相同的牌。此阶段结束时，若其此阶段没有使用【杀】，视为你对其使用了【杀】。
```js
xinsidi: {
		audio: "sidi",
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			if (event.player == player || event.player.isDead()) {
				return false;
			}
			return player.countCards("e") > 0;
		},
		async cost(event, trigger, player) {
			const attitude = get.attitude(player, trigger.player) >= -0.8;
			const ocards = trigger.player.countCards("h") <= 3;
			const scards = player.countCards("h", "shan") === 0;

			const goon = !(attitude && ocards && scards);
			const es = player.getCards("e");
			// AI给出的神秘去重代码
			const colors = es.map(card => get.color(card)).filter((color, index, self) => self.indexOf(color) === index);

			const color = colors.length === 2 ? "all" : colors[0];

			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt2("xinsidi", trigger.player),
					filterCard(card) {
						if (get.type(card) === "basic") {
							return false;
						}
						const { color } = get.event();
						if (color === "all") {
							return true;
						}
						return get.color(card) === color;
					},
					ai(card) {
						return get.event().goon ? 6 - get.value(card) : 0;
					},
				})
				.set("goon", goon)
				.set("color", color)
				.set("chooseonly", true)
				.forResult();

			event.result.targets = [trigger.player];
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const { cards } = event;
			await player.discard({
				cards,
				discarder: player,
			});
			trigger.player.addSkill("xinsidi2");
			trigger.player.markAuto("xinsidi2", [get.color(cards[0], cards[0].original === "h" ? player : false)]);
			trigger.player.storage.xinsidi4 = player;
			trigger.player.syncStorage("xinsidi2");
		},
		ai: {
			threaten: 1.5,
		},
	}
```

## wuyi 名字:吴懿 势力:shu

### olbenxi 名字:奔袭
描述: 锁定技。①当你于回合内使用牌时，你本回合计算与其他角色的距离-1。②当你于回合内使用指定唯一目标【杀】或普通锦囊牌时，若你至场上所有其他角色的距离均不大于1，则你选择至多两项：1.为此牌额外指定一个目标；2.令此牌无视防具；3.令此牌不可被抵消；4.此牌造成伤害后，你摸一张牌。
```js
olbenxi: {
		audio: "benxi",
		trigger: { player: "useCard2" },
		filter(trigger, player) {
			return _status.currentPhase === player && trigger.targets?.length === 1 && (trigger.card.name === "sha" || get.type(trigger.card) === "trick") && !game.hasPlayer(current => get.distance(player, current) > 1);
		},
		filterx(event, player) {
			const info = get.info(event.card);
			if (!event.targets?.length || info.multitarget || info.allowMultiple === false) {
				return false;
			}
			return game.hasPlayer(current => {
				return lib.filter.targetEnabled2(event.card, player, current) && !event.targets.includes(current);
			});
		},
		forced: true,
		async content(event, trigger, player) {
			const str = get.translation(trigger.card);
			const list = ["为" + str + "多选择一个目标", "　令" + str + "无视防具牌　", "　令" + str + "不可被抵消　", "令" + str + "造成伤害后摸牌"].map((item, i) => [i, item]);
			const next = player.chooseButton({
				createDialog: ["奔袭：请选择一至两项", [list.slice(0, 2), "tdnodes"], [list.slice(2, 4), "tdnodes"]],
				filterButton(button) {
					return button.link !== 0 || get.event().bool1;
				},
				selectButton: [1, 2],
				forced: true,
				ai(button) {
					const player = get.player();
					const event = get.event().getTrigger();
					switch (button.link) {
						case 0: {
							if (
								game.hasPlayer(current => {
									return lib.filter.targetEnabled2(event.card, player, current) && !event.targets.includes(current) && get.effect(current, event.card, player, player) > 0;
								})
							) {
								return 1.6 + Math.random();
							}
							return 0;
						}
						case 1: {
							if (
								event.targets.filter(current => {
									const eff1 = get.effect(current, event.card, player, player);
									player._olbenxi_ai = true;
									const eff2 = get.effect(current, event.card, player, player);
									delete player._olbenxi_ai;
									return eff1 > eff2;
								}).length
							) {
								return 1.9 + Math.random();
							}
							return Math.random();
						}
						case 2: {
							let num = 1.3;
							if (
								event.card.name === "sha" &&
								event.targets.filter(current => {
									if (current.mayHaveShan(player, "use") && get.attitude(player, current) <= 0) {
										if (current.hasSkillTag("useShan", null, "use")) {
											num = 1.9;
										}
										return true;
									}
									return false;
								}).length
							) {
								return num + Math.random();
							}
							return 0.5 + Math.random();
						}
						case 3: {
							return (get.tag(event.card, "damage") || 0) + Math.random();
						}
					}
				},
			});
			next.set("bool1", get.info("olbenxi").filterx(trigger, player));

			const { bool, links } = await next.forResult();
			if (!bool || !links?.length) {
				return;
			}
			for (const num of links.sort((a, b) => a - b)) {
				switch (num) {
					case 0: {
						const result2 = await player
							.chooseTarget("请选择" + get.translation(trigger.card) + "的额外目标", true, (card, player, target) => {
								const event = get.event().getTrigger();
								if (event.targets.includes(target)) {
									return false;
								}
								return lib.filter.targetEnabled2(event.card, player, target) && lib.filter.targetInRange(event.card, player, target);
							})
							.set("ai", target => {
								const player = get.player();
								const event = get.event().getTrigger();
								return get.effect(target, event.card, player, player);
							})
							.forResult();
						if (result2?.targets?.length) {
							player.line(result2.targets);
							trigger.targets.addArray(result2.targets);
							game.log(result2.targets, "成为了", trigger.card, "的额外目标");
						}
						break;
					}
					case 2:
						trigger.nowuxie = true;
						trigger.customArgs.default.directHit2 = true;
					// [falls through]
					default:
						player.addTempSkill("olbenxi_effect");
						player.storage.olbenxi_effect[num - 1].add(trigger.card);
						break;
				}
			}
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
		group: "olbenxi_summer",
		subSkill: {
			effect: {
				charlotte: true,
				init(player, skill) {
					if (!player.storage[skill]) {
						player.storage[skill] = [[], [], []];
					}
				},
				audio: "benxi",
				trigger: { global: "damageSource" },
				filter(event, player) {
					return event.card && player.storage.olbenxi_effect[2].includes(event.card);
				},
				forced: true,
				async content(event, trigger, player) {
					await player.draw();
				},
				ai: {
					unequip: true,
					unequip_ai: true,
					skillTagFilter(player, tag, arg) {
						return player.storage.olbenxi_effect[0].includes(arg?.card);
					},
				},
				mod: {
					wuxieRespondable(card, player) {
						if (player.storage.olbenxi_effect[1].includes(card)) {
							return false;
						}
					},
				},
			},
			summer: {
				//audio: "benxi",
				trigger: { player: "useCard" },
				filter(event, player) {
					return player === _status.currentPhase;
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.addTempSkill("olbenxi_dist");
					player.addMark("olbenxi_dist", 1, false);
				},
			},
			dist: {
				charlotte: true,
				onremove: true,
				mod: {
					globalFrom(from, to, distance) {
						return distance - from.countMark("olbenxi_dist");
					},
				},
				intro: { content: "距离与其他角色的距离-#" },
			},
		},
	}
```

## hanhaoshihuan 名字:韩浩史涣 势力:wei

### shenduan 名字:慎断
描述: 当你的黑色基本牌因弃置而进入弃牌堆后，你可以将其当做【兵粮寸断】使用（无距离限制）。
```js
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
				if (get.color(evt.cards2[i], evt.hs.includes(evt.cards2[i]) ? evt.player : false) == "black" && get.type(evt.cards2[i]) == "basic" && get.position(evt.cards2[i], evt.hs.includes(evt.cards2[i]) ? evt.player : false) == "d") {
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
				if (get.color(evt.cards2[i], evt.hs.includes(evt.cards2[i]) ? evt.player : false) == "black" && get.type(evt.cards2[i], evt.hs.includes(evt.cards2[i]) ? evt.player : false) == "basic" && get.position(evt.cards2[i]) == "d") {
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
						return player.canUse({ name: "bingliang", cards: [card] }, target, false);
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
							return player.canUse({ name: "bingliang", cards: [card] }, target, false);
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
	}
```

### yonglve 名字:勇略
描述: 一名其他角色的判定阶段开始时，若其在你攻击范围内，则你可以弃置其判定区里的一张牌，视为对该角色使用一张【杀】。若此【杀】未造成伤害，你摸一张牌。
```js
yonglve: {
		trigger: { global: "phaseJudgeBegin" },
		audio: 2,
		filter(event, player) {
			return event.player != player && event.player.countCards("j") > 0 && player.inRange(event.player);
		},
		async cost(event, trigger, player) {
			const att = get.attitude(player, trigger.player);
			const nh = trigger.player.countCards("h");
			let eff = get.effect(trigger.player, { name: "sha", isCard: true }, player, player);
			if (!player.canUse({ name: "sha", isCard: true }, trigger.player)) {
				eff = 0;
			}
			event.result = await player
				.discardPlayerCard({
					prompt: get.prompt("yonglve", trigger.player),
					target: trigger.player,
					position: "j",
					ai(button) {
						const name = button.link.viewAs || button.link.name;
						const { att, nh, eff } = get.event();
						const trigger = get.event().getTrigger();
						if (att > 0 && eff >= 0) {
							return 1;
						}
						if (att >= 0 && eff > 0) {
							return 1;
						}
						if (
							att > 0 &&
							(trigger.player.hp >= 3 ||
								trigger.player.hasSkillTag("freeShan", false, {
									player: _status.event.player,
									card: new lib.element.VCard({ name: "sha", isCard: true }),
									type: "use",
								}) ||
								trigger.player.countCards("h", "shan"))
						) {
							if (name == "lebu" && nh > trigger.player.hp) {
								return 1;
							}
							if (name == "bingliang" && nh < trigger.player.hp) {
								return 1;
							}
						}
						return 0;
					},
				})
				.set("att", att)
				.set("nh", nh)
				.set("eff", eff)
				.set("chooseonly", true)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await trigger.player.discard({
				cards: event.cards,
				discarder: player,
			});
			let related;
			let used = false;
			if (player.canUse({ name: "sha", isCard: true }, trigger.player)) {
				used = true;
				related = await player.useCard({
					card: get.autoViewAs({ name: "sha", isCard: true }),
					targets: [trigger.player],
				});
			}
			if (!used || !game.hasPlayer2(current => current.hasHistory("damage", evt => evt.getParent(2) == related))) {
				await player.draw();
			}
		},
		//group:'yonglve2'
	}
```

## caorui 名字:曹叡 势力:wei

### huituo 名字:恢拓
描述: 当你受到伤害后，你可以令一名角色进行一次判定，若结果为红色，该角色回复1点体力；若结果为黑色，该角色摸X张牌（X为此次伤害的伤害点数）。
```js
huituo: {
		audio: 2,
		audioname: ["re_caorui"],
		trigger: { player: "damageEnd" },
		direct: true,
		async content(event, trigger, player) {
			const forced = event.forced === undefined ? false : event.forced;
			const info = get.skillInfoTranslation("huituo", player, false);
			const str = `###${forced ? "恢拓：请选择一名角色" : get.prompt("huituo")}###令一名角色判定。若结果为红色，其回复1点体力；若结果为黑色，其摸${get.cnNumber(trigger.num)}张牌`;
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
				result = await target
					.judge(card => {
						if (target.isDamaged()) {
							if (get.color(card) == "red") {
								return -1;
							}
						}
						if (get.color(card) == "red") {
							return 1;
						}
						return 0;
					})
					.forResult();
				switch (result?.color) {
					case "red":
						await event.target.recover();
						break;

					case "black":
						await event.target.draw(trigger.num);
						break;

					default:
						break;
				}
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
		},
	}
```

### mingjian 名字:明鉴
描述: 出牌阶段限一次。你可以将所有手牌交给一名其他角色，然后该角色于其下个回合的手牌上限+1，且使用【杀】的次数上限+1。
```js
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
		filterCard: true,
		selectCard: -1,
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const { cards, target } = event;
			player.give(cards, target);
			target.addTempSkill("mingjian2", { player: "phaseAfter" });
			target.storage.mingjian2++;
			target.updateMarks("mingjian2");
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
	}
```

### xingshuai 名字:兴衰
描述: 主公技，限定技，当你进入濒死状态时，其他魏势力角色可依次令你回复1点体力，然后这些角色依次受到1点伤害。
```js
xingshuai: {
		skillAnimation: true,
		animationColor: "thunder",
		audio: 2,
		audioname2: {
			re_caorui: "rexingshuai",
		},
		trigger: { player: "dying" },
		zhuSkill: true,
		filter(event, player) {
			if (player.hp > 0) {
				return false;
			}
			if (!player.hasZhuSkill("xingshuai")) {
				return false;
			}
			return game.hasPlayer(function (current) {
				return current != player && current.group == "wei";
			});
		},
		limited: true,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const phaseTargets = game.filterPlayer(current => current !== player && current.group === "wei");
			const damages = [];
			for (const current of phaseTargets) {
				if (current.group != "wei") {
					continue;
				}
				const result = await current
					.chooseBool({
						prompt: `是否令${get.translation(player)}回复1点体力？`,
						ai() {
							const { player, target } = get.event();
							return get.attitude(player, target) > 2;
						},
					})
					.set("target", player)
					.forResult();

				if (result.bool) {
					damages.push(current);
					current.line(player, "green");
					game.log(current, "令", player, "回复1点体力");
					await player.recover({ source: current });
				}
			}
			if (damages.length) {
				const next = game.createEvent("xingshuai_next");
				event.next.remove(next);
				trigger.after.push(next);
				next.targets = damages;
				next.setContent(async event => {
					for (const target of event.targets) {
						await target.damage();
					}
				});
			}
		},
	}
```

## caoxiu 名字:曹休 势力:wei

### qianju 名字:千驹
描述: 锁定技，若你已受伤，你计算与其他角色的距离时-X（X为你已损失的体力值）。
```js
qianju: {
		mod: {
			globalFrom(from, to, distance) {
				return distance - from.getDamagedHp();
			},
		},
	}
```

### qingxi 名字:倾袭
描述: 当你使用【杀】对目标角色造成伤害时，若你的装备区里有武器牌，你可以令其选择一项：1、弃置X张手牌（X为此武器牌的攻击范围），若如此做，其弃置你的此武器牌；2、令伤害值+1。
```js
qingxi: {
		audio: 2,
		trigger: { source: "damageBegin1" },
		check(event, player) {
			return get.attitude(player, event.player) < 0;
		},
		filter(event, player) {
			return event.getParent()?.name === "sha" && player.getEquips(1).length > 0;
		},
		async content(event, trigger, player) {
			const num = player.getEquipRange();

			/** @type {Partial<Result>} */
			let result = { bool: false };
			if (trigger.player.countCards("h") >= num) {
				result = await trigger.player
					.chooseToDiscard({
						prompt: "弃置" + get.cnNumber(num) + "张手牌，或令杀的伤害+1",
						selectCard: num,
						ai(card) {
							const player = _status.event.player;
							if (player.hp == 1) {
								if (get.type(card) == "basic") {
									return 8 - get.value(card);
								}
								return 10 - get.value(card);
							}
							if (num > 2) {
								return 0;
							}
							return 8 - get.value(card);
						},
					})
					.forResult();
			}
			if (result.bool) {
				const e1 = player.getEquips(1);
				if (e1.length) {
					await player.modedDiscard({
						cards: e1,
						discarder: trigger.player,
					});
				}
			} else {
				trigger.num++;
			}
		},
	}
```

## zhongyao 名字:钟繇 势力:wei

### huomo 名字:活墨
描述: 当你需要使用一张本回合内未使用过的基本牌时，你可以将一张黑色非基本牌置于牌堆顶，视为使用此基本牌。
```js
huomo: {
		audio: 2,
		audioname: ["huzhao", "re_zhongyao"],
		enable: "chooseToUse",
		onChooseToUse(event) {
			if (game.online || event.huomo_list) {
				return;
			}
			var list = lib.skill.huomo.getUsed(event.player);
			event.set("huomo_list", list);
		},
		getUsed(player) {
			var list = [];
			player.getHistory("useCard", function (evt) {
				if (get.type(evt.card, null, false) == "basic") {
					list.add(evt.card.name);
				}
			});
			return list;
		},
		hiddenCard(player, name) {
			if (get.type(name) != "basic") {
				return false;
			}
			var list = lib.skill.huomo.getUsed(player);
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
			var list = event.huomo_list || lib.skill.huomo.getUsed(player);
			for (var name of lib.inpile) {
				if (get.type(name) != "basic" || list.includes(name)) {
					continue;
				}
				var card = { name: name, isCard: true };
				if (event.filterCard(card, player, event)) {
					return true;
				}
				if (name == "sha") {
					for (var nature of lib.inpile_nature) {
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
				var vcards = [];
				var list = event.huomo_list || lib.skill.huomo.getUsed(player);
				for (var name of lib.inpile) {
					if (get.type(name) != "basic" || list.includes(name)) {
						continue;
					}
					var card = { name: name, isCard: true };
					if (event.filterCard(card, player, event)) {
						vcards.push(["基本", "", name]);
					}
					if (name == "sha") {
						for (var nature of lib.inpile_nature) {
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
				var player = _status.event.player;
				var card = { name: button.link[2], nature: button.link[3] };
				if (
					game.hasPlayer(function (current) {
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
						number: null,
						isCard: true,
					},
					position: "he",
					popname: true,
					ignoreMod: true,
					async precontent(event, trigger, player) {
						player.logSkill("huomo");
						const card = event.result.cards[0];
						game.log(player, "将", card, "置于牌堆顶");
						await player.loseToDiscardpile(card, ui.cardPile, "visible", "insert").set("log", false);
						const viewAs = {
							name: event.result.card.name,
							nature: event.result.card.nature,
							isCard: true,
						};
						event.result.card = viewAs;
						event.result.cards = [];
					},
				};
			},
			prompt(links, player) {
				return "将一张黑色非基本牌置于牌堆顶并视为使用一张" + get.translation(links[0][3] || "") + get.translation(links[0][2]);
			},
		},
		ai: {
			order() {
				var player = _status.event.player;
				var event = _status.event;
				var list = lib.skill.huomo.getUsed(player);
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
					var list = lib.skill.huomo.getUsed(player);
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

### zuoding 名字:佐定
描述: 当其他角色于其出牌阶段内使用♠牌指定目标后，若本回合内没有角色受到过伤害，则你可以令其中一名目标角色摸一张牌。
```js
zuoding: {
		audio: 2,
		audioname: ["re_zhongyao"],
		trigger: { global: "useCardToPlayered" },
		filter(event, player) {
			if (event.getParent().triggeredTargets3.length > 1) {
				return false;
			}
			return (
				get.suit(event.card) == "spade" &&
				_status.currentPhase == event.player &&
				event.targets &&
				event.player.isPhaseUsing() &&
				event.targets.length &&
				event.player != player &&
				game.countPlayer2(function (current) {
					return current.getHistory("damage").length > 0;
				}) == 0
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt("zuoding"),
					prompt2: "令一名目标角色摸一张牌",
					filterTarget(card, player, target) {
						return get.event().targets.includes(target);
					},
					ai(target) {
						return get.attitude(get.event().player, target);
					},
				})
				.set("targets", trigger.targets)
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			await event.targets[0].draw();
		},
		ai: {
			expose: 0.2,
		},
		//group:'zuoding3'
	}
```

## liuchen 名字:刘谌 势力:shu

### zhanjue 名字:战绝
描述: 出牌阶段，你可以将所有手牌当作【决斗】使用。此【决斗】结算后，你与以此法受到伤害的角色各摸一张牌。若你在同一阶段内以此法摸了两张或更多的牌，则此技能失效直到回合结束。
```js
zhanjue: {
		audio: 2,
		enable: "phaseUse",
		filterCard: true,
		selectCard: -1,
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
			effect: {
				player_use(card, player, target) {
					if (_status.event.skill == "zhanjue") {
						if (
							player.hasSkillTag(
								"directHit_ai",
								true,
								{
									target: target,
									card: card,
								},
								true
							)
						) {
							return;
						}
						if (player.countCards("h") >= 3 || target.countCards("h") >= 3) {
							return "zeroplayertarget";
						}
						if (player.countCards("h", "tao")) {
							return "zeroplayertarget";
						}
						if (target.countCards("h", "sha") > 1) {
							return "zeroplayertarget";
						}
					}
				},
			},
			nokeep: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "nokeep") {
					return (!arg || (arg.card && get.name(arg.card) === "tao")) && player.isPhaseUsing() && get.skillCount("zhanjue_draw") < 2 && player.hasCard(card => get.name(card) != "tao", "h");
				}
			},
		},
	}
```

### qinwang 名字:勤王
描述: 主公技，当你需要使用或打出一张【杀】时，你可以弃置一张牌，然后视为你发动了〖激将①〗。若有角色响应，则该角色打出【杀】时摸一张牌。
```js
qinwang: {
		audio: "qinwang1",
		group: ["qinwang1"],
		zhuSkill: true,
		filter(event, player) {
			if (
				!player.hasZhuSkill("qinwang") ||
				!game.hasPlayer(function (current) {
					return current != player && current.group == "shu";
				}) ||
				!player.countCards("he")
			) {
				return false;
			}
			return !event.jijiang && (event.type != "phase" || !player.hasSkill("jijiang3"));
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
			var player = _status.event.player,
				players = game.filterPlayer();
			if (player.hasSkill("qinwang_ai")) {
				return false;
			}
			for (var i = 0; i < players.length; i++) {
				var nh = players[i].countCards("h");
				if (players[i] != player && players[i].group == "shu" && get.attitude(players[i], player) > 2 && nh >= 3 && players[i].countCards("h", "sha")) {
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
				if (
					!player.hasZhuSkill("qinwang") ||
					!game.hasPlayer(function (current) {
						return current != player && current.group == "shu";
					}) ||
					!player.countCards("he")
				) {
					return false;
				}
			},
		},
	}
```

## zhangyi 名字:张嶷 势力:shu

### wurong 名字:怃戎
描述: 出牌阶段限一次，你可以令一名其他角色与你同时展示一张手牌：若你展示的是【杀】且该角色展示的不是【闪】，则你弃置此【杀】并对其造成1点伤害；若你展示的不是【杀】且该角色展示的是【闪】，则你弃置你展示的牌并获得其一张牌。
```js
wurong: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		filterTarget(card, player, target) {
			return target.countCards("h") > 0 && target != player;
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (target.countCards("h") == 0 || player.countCards("h") == 0) {
				return;
			}

			const sendback = () => {
				if (_status.event !== event) {
					return () => {
						event.resultOL = _status.event.resultOL;
					};
				}
			};
			if (player.isOnline()) {
				player.wait(sendback);
				event.ol = true;
				player.send(() => {
					game.me
						.chooseCard(true)
						.set("glow_result", true)
						.set("ai", () => Math.random());
					game.resume();
				});
			} else {
				event.localPlayer = true;
				const result = await player
					.chooseCard(true)
					.set("glow_result", true)
					.set("ai", () => Math.random())
					.forResult();
				event.card1 = result.cards[0];
			}
			if (target.isOnline()) {
				target.wait(sendback);
				event.ol = true;
				target.send(() => {
					const rand = Math.random() < 0.4;
					game.me
						.chooseCard(true)
						.set("glow_result", true)
						.set("ai", card => {
							if (rand) {
								return card.name == "shan" ? 1 : 0;
							}
							return card.name == "shan" ? 0 : 1;
						});
					game.resume();
				});
			} else {
				event.localTarget = true;
				const rand = Math.random() < 0.4;
				const result = await target
					.chooseCard(true)
					.set("glow_result", true)
					.set("ai", card => {
						if (rand) {
							return card.name == "shan" ? 1 : 0;
						}
						return card.name == "shan" ? 0 : 1;
					})
					.forResult();
				event.card2 = result.cards[0];
			}

			if (!event.resultOL && event.ol) {
				await game.pause();
			}
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
				(card1, card2) => {
					card1.classList.remove("glow");
					card2.classList.remove("glow");
				},
				event.card1,
				event.card2
			);

			game.broadcastAll(() => {
				ui.arena.classList.add("thrownhighlight");
			});
			game.addVideo("thrownhighlight1");
			player.$compare(event.card1, target, event.card2);
			await game.delay(4);

			let next = game.createEvent("showCards");
			next.player = player;
			next.cards = [event.card1];
			next.setContent("emptyEvent");
			game.log(player, "展示了", event.card1);
			await next;

			next = game.createEvent("showCards");
			next.player = target;
			next.cards = [event.card2];
			next.setContent("emptyEvent");
			game.log(target, "展示了", event.card2);
			await next;

			const name1 = get.name(event.card1);
			const name2 = get.name(event.card2);
			if (name1 == "sha" && name2 != "shan") {
				await player.discard(event.card1).set("animate", false);
				target.$gain2(event.card2);
				const clone = event.card1.clone;
				if (clone) {
					clone.style.transition = "all 0.5s";
					clone.style.transform = "scale(1.2)";
					clone.delete();
					game.addVideo("deletenode", player, get.cardsInfo([clone]));
				}
				game.broadcast(card => {
					const clone = card.clone;
					if (clone) {
						clone.style.transition = "all 0.5s";
						clone.style.transform = "scale(1.2)";
						clone.delete();
					}
				}, event.card1);
				await target.damage("nocard");
			} else if (name1 != "sha" && name2 == "shan") {
				await player.discard(event.card1).set("animate", false);
				target.$gain2(event.card2);
				const clone = event.card1.clone;
				if (clone) {
					clone.style.transition = "all 0.5s";
					clone.style.transform = "scale(1.2)";
					clone.delete();
					game.addVideo("deletenode", player, get.cardsInfo([clone]));
				}
				game.broadcast(card => {
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
			game.broadcastAll(() => {
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

### shizhi 名字:矢志
描述: 锁定技，当你的体力值为1时，你的【闪】均视为【杀】。
```js
shizhi: {
		mod: {
			cardname(card, player, name) {
				if (card.name == "shan" && player.hp == 1) {
					return "sha";
				}
			},
		},
		ai: {
			skillTagFilter(player) {
				if (!player.countCards("h", "shan")) {
					return false;
				}
				if (player.hp != 1) {
					return false;
				}
			},
			respondSha: true,
			neg: true,
		},
		audio: 2,
		trigger: { player: ["useCard1", "respond"] },
		firstDo: true,
		forced: true,
		filter(event, player) {
			return event.card.name == "sha" && !event.skill && event.cards.length == 1 && event.cards[0].name == "shan";
		},
		async content(event, trigger, player) {},
	}
```

## sunxiu 名字:孙休 势力:wu

### yanzhu 名字:宴诛
描述: 出牌阶段限一次，你可以令一名有牌的其他角色选择一项：令你获得其装备区里所有的牌，然后你失去技能〖宴诛〗；或弃置一张牌。
```js
yanzhu: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target.countCards("he") > 0 && target != player;
		},
		async content(event, trigger, player) {
			const { target } = event;
			let result;
			if (target.countCards("e")) {
				result = await target
					.chooseBool({
						prompt: "是否将装备区内的所有牌交给" + get.translation(player) + "？",
						ai() {
							if (_status.event.player.countCards("e") >= 3) {
								return false;
							}
							return true;
						},
					})
					.forResult();
			} else {
				await target.chooseToDiscard({
					position: "he",
					forced: true,
				});
				return;
			}
			if (result.bool) {
				const es = target.getCards("e");
				await target.give(es, player, true);
				player.removeSkills("yanzhu");
			} else {
				await target.chooseToDiscard({
					position: "he",
					forced: true,
				});
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					var ne = target.countCards("e");
					if (!ne) {
						return -2;
					}
					if (ne >= 2) {
						return -ne;
					}
					return 0;
				},
			},
		},
	}
```

### xingxue 名字:兴学
描述: 结束阶段开始时，你可以令至多X名角色依次摸一张牌并将一张牌置于牌堆顶（X为你的体力值，若你已失去技能〖宴诛〗，则将X改为你的体力上限）。
```js
xingxue: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		async content(event, trigger, player) {
			let num = player.hp;
			if (!player.hasSkill("yanzhu")) {
				num = player.maxHp;
			}
			const { targets, bool } = await player
				.chooseTarget([1, num], get.prompt2("xingxue"))
				.set("ai", function (target) {
					const att = get.attitude(_status.event.player, target);
					if (target.countCards("he")) {
						return att;
					}
					return att / 10;
				})
				.forResult();
			if (bool) {
				player.logSkill("xingxue", targets);
				const chooseToPutCard = async function (target) {
					await target.draw();
					if (target.countCards("he")) {
						const { cards, bool } = await target.chooseCard("选择一张牌置于牌堆顶", "he", true).forResult();
						if (bool) {
							await target.lose(cards, ui.cardPile, "insert");
						}
						game.broadcastAll(function (player) {
							const cardx = ui.create.card();
							cardx.classList.add("infohidden");
							cardx.classList.add("infoflip");
							player.$throw(cardx, 1000, "nobroadcast");
						}, target);
						if (player == game.me) {
							await game.delay(0.5);
						}
					}
				};
				await game.doAsyncInOrder(targets, chooseToPutCard);
			}
		},
	}
```

### xinzhaofu 名字:诏缚
描述: 主公技，限定技。出牌阶段，你可选择至多两名其他角色。这两名角色视为在所有其他吴势力角色的攻击范围内。
```js
xinzhaofu: {
		audio: "zhaofu",
		audioname: ["ol_sunxiu"],
		enable: "phaseUse",
		usable: 1,
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		selectTarget: [1, 2],
		filterTarget: lib.filter.notMe,
		zhuSkill: true,
		async contentBefore(event, trigger, player) {
			player.awakenSkill(event.skill);
		},
		async content(event, trigger, player) {
			const { target } = event;
			target.addSkill("xinzhaofu_effect");
			target.markAuto("xinzhaofu_effect", [player]);
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					var targets = game.filterPlayer(function (current) {
						return current.group == "wu" && get.attitude(player, current) > 0;
					});
					if (targets.length) {
						for (var targetx of targets) {
							if (!targetx.inRange(target)) {
								return -1;
							}
						}
						return -0.5;
					}
					return 0;
				},
			},
		},
		subSkill: {
			effect: {
				charlotte: true,
				mark: true,
				intro: { content: "已视为在其他吴势力角色的攻击范围内" },
				mod: {
					inRangeOf(from, to) {
						if (from.group != "wu") {
							return;
						}
						var list = to.getStorage("xinzhaofu_effect");
						for (var i of list) {
							if (i != from) {
								return true;
							}
						}
					},
				},
			},
		},
	}
```

## zhuzhi 名字:朱治 势力:wu

### xinanguo 名字:安国
描述: 出牌阶段限一次，你可以选择一名其他角色，若其手牌数为全场最少，其摸一张牌；体力值为全场最低，回复1点体力；装备区内牌数为全场最少，随机使用一张装备牌。然后若该角色有未执行的效果且你满足条件，你执行之。
```js
xinanguo: {
		audio: "anguo",
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			const { target } = event;

			const drawing = [current => current.isMinHandcard(), current => current.draw()];
			const recovering = [current => current.isMinHp() && current.isDamaged(), current => current.recover()];
			const equipping = [
				current => current.isMinEquip(),
				async current => {
					const equip = get.cardPile(card => get.type(card) == "equip" && current.hasUseTarget(card), false, "random");
					if (equip) {
						await current.chooseUseTarget({
							card: equip,
							throw: false,
							nopopup: true,
							forced: true,
						});
					}
				},
			];

			const todo = [drawing, recovering, equipping];

			for (let i = 0; i < todo.length; ++i) {
				const [condition, action] = todo[i];
				if (condition(target)) {
					await action(target);
					todo.splice(i, 1);
					--i;
				}
			}

			game.updateRoundNumber();
			if (!todo.length) {
				return;
			}

			for (const [condition, action] of todo) {
				if (condition(player)) {
					await action(player);
				}
			}
			game.updateRoundNumber();
		},
		ai: {
			threaten: 1.6,
			order: 9,
			result: {
				player(player, target) {
					if (get.attitude(player, target) <= 0) {
						if (target.isMinHandcard() || target.isMinEquip() || target.isMinHp()) {
							return -1;
						}
					}
					var num = 0;
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

## quancong 名字:全琮 势力:wu

### yaoming 名字:邀名
描述: 每回合限一次，当你造成或受到伤害后，你可以选择一项：1. 弃置手牌数大于你的一名角色的一张手牌；2. 令手牌数小于你的一名角色摸一张牌。
```js
yaoming: {
		audio: 2,
		trigger: { player: "damageEnd", source: "damageSource" },
		filter(event, player) {
			if (player.hasSkill("yaoming2")) {
				return false;
			}
			var nh = player.countCards("h");
			return game.hasPlayer(function (current) {
				return current.countCards("h") != nh;
			});
		},
		async cost(event, trigger, player) {
			const nh = player.countCards("h");
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("yaoming"),
					filterTarget(card, player, target) {
						return _status.event.nh != target.countCards("h");
					},
					ai(target) {
						const att = get.attitude(_status.event.player, target);
						if (target.countCards("h") > _status.event.nh) {
							return -att;
						}
						return att;
					},
				})
				.set("nh", nh)
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			player.addTempSkill("yaoming2");
			const target = event.targets[0];
			if (target.countCards("h") < player.countCards("h")) {
				await target.draw();
			} else {
				await target.discard({
					cards: [target.getCards("h").randomGet()],
				});
			}
		},
		ai: {
			expose: 0.2,
		},
	}
```

## gongsunyuan 名字:公孙渊 势力:qun

### huaiyi 名字:怀异
描述: 出牌阶段限一次，你可以展示所有手牌，若这些牌的颜色不全部相同，则你选择一种颜色并弃置该颜色的所有手牌，然后你可以获得至多X名其他角色的各一张牌（X为你以此法弃置的手牌数）。若你以此法得到的牌不少于两张，则你失去1点体力。
```js
huaiyi: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		delay: false,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			await player.showHandcards();

			const hs = player.getCards("h");
			const color = get.color(hs[0], player);
			if (hs.length === 1 || !hs.some((card, index) => index > 0 && get.color(card) !== color)) {
				return;
			}

			const colors = [];
			const bannedList = [];
			const indexs = Object.keys(lib.color);
			for (const card of player.getCards("h")) {
				const color = get.color(card, player);
				colors.add(color);
				if (!lib.filter.cardDiscardable(card, player, "huaiyi")) {
					bannedList.add(color);
				}
			}
			colors.removeArray(bannedList);
			colors.sort((a, b) => indexs.indexOf(a) - indexs.indexOf(b));

			let result;
			if (!colors.length) {
				return;
			}
			if (colors.length === 1) {
				result = { control: colors[0] };
			} else {
				result = await player
					.chooseControl({
						controls: colors.map(color => `${color}2`),
						prompt: "请选择弃置一种颜色的所有手牌",
						ai() {
							const player = get.player();
							if (player.countCards("h", { color: "red" }) == 1 && player.countCards("h", { color: "black" }) > 1) {
								return 1;
							}
							return 0;
						},
					})
					.forResult();
			}

			const control = result.control.slice(0, result.control.length - 1);
			const cards = player.getCards("h", { color: control });
			const num = cards.length;
			await player.discard({ cards });

			result = await player
				.chooseTarget({
					prompt: `请选择至多${get.cnNumber(num)}名有牌的其他角色，获得这些角色的各一张牌。`,
					filterTarget(card, player, target) {
						return target !== player && target.countCards("he") > 0;
					},
					selectTarget: [1, num],
					ai(target) {
						return -get.attitude(get.player(), target) + 0.5;
					},
				})
				.forResult();
			if (!result.bool || !result.targets?.length) {
				return;
			}
			const targets = result.targets;
			player.line(targets, "green");
			let gained = 0;
			for (const target of targets.sortBySeat()) {
				if (!player.isIn() || !target.countCards("he")) {
					continue;
				}
				const result = await player
					.gainPlayerCard({
						target,
						position: "he",
						forced: true,
					})
					.forResult();
				if (result.bool && result.cards?.length) {
					gained += result.cards.length;
				}
			}

			if (gained > 1) {
				await player.loseHp();
			}
		},
		ai: {
			order(item, player) {
				if (player.countCards("h", { color: "red" }) == 1) {
					return 10;
				}
				if (player.countCards("h", { color: "black" }) == 1) {
					return 10;
				}
				return 1;
			},
			result: {
				player: player => {
					if (get.color(player.getCards("h")) != "none") {
						return 0;
					}
					return 1;
				},
			},
		},
	}
```

## guotufengji 名字:郭图逢纪 势力:qun

### jigong 名字:急攻
描述: 出牌阶段开始时，你可以摸两张牌。若如此做，你本回合的手牌上限改为X（X为你此阶段造成的伤害点数之和）。
```js
jigong: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		check(event, player) {
			var nh = player.countCards("h") - player.countCards("h", { type: "equip" });
			if (nh <= 1) {
				return true;
			}
			if (player.countCards("h", "tao")) {
				return false;
			}
			if (nh <= 2) {
				return Math.random() < 0.7;
			}
			if (nh <= 3) {
				return Math.random() < 0.4;
			}
			return false;
		},
		async content(event, trigger, player) {
			player.draw(2);
			player.addTempSkill("jigong2");
		},
	}
```

### shifei 名字:饰非
描述: 当你需要使用或打出【闪】时，你可以令当前回合角色摸一张牌。然后若其手牌数不为全场唯一最多，则你弃置全场手牌数最多（或之一）角色的一张牌，视为你使用或打出了一张【闪】。
```js
shifei: {
		audio: 2,
		audioname: ["re_guotufengji"],
		enable: ["chooseToRespond", "chooseToUse"],
		filter(event, player) {
			if (!_status.currentPhase || event.shifei) {
				return false;
			}
			if (!event.filterCard({ name: "shan", isCard: true }, player, event)) {
				return false;
			}
			if (event.name != "chooseToUse" && !lib.filter.cardRespondable({ name: "shan", isCard: true }, player, event)) {
				return false;
			}
			return true;
		},
		delay: false,
		checkx(player) {
			if (get.attitude(player, _status.currentPhase) > 0) {
				return true;
			}
			var nh = _status.currentPhase.countCards("h") + 1;
			var players = game.filterPlayer();
			for (var i = 0; i < players.length; i++) {
				if (players[i].countCards("h") >= nh) {
					if (!player.countCards("h", "shan") || get.attitude(player, players[i]) <= 0) {
						return true;
					}
				}
			}
			return false;
		},
		async content(event, trigger, player) {
			player.line(_status.currentPhase, "green");
			await _status.currentPhase.draw();
			const evt = event.getParent(2);
			if (evt == null) {
				return;
			}
			if (_status.currentPhase.isMaxHandcard(true)) {
				evt.set("shifei", true);
				evt.goto(0);
				return;
			}
			const targets = game.filterPlayer(current => current.isMaxHandcard());
			let target;
			if (targets.length == 1) {
				target = targets[0];
			} else if (targets.length) {
				const result = await player
					.chooseTarget({
						prompt: "选择一名角色弃置其一张牌",
						filterTarget(card, player, target) {
							return get.event().targets.includes(target);
						},
						forced: true,
						ai(target) {
							return -get.attitude(_status.event.player, target);
						},
					})
					.set("targets", targets)
					.forResult();
				if (result.targets?.length) {
					target = result.targets[0];
				}
			}
			if (target) {
				player.line(target, "green");
				await player.discardPlayerCard({
					target,
					position: "he",
					forced: true,
				});
				evt.result = { bool: true, card: { name: "shan", isCard: true }, cards: [] };
				evt.redo();
				return;
			}
			evt.set("shifei", true);
			evt.goto(0);
		},
		ai: {
			respondShan: true,
			effect: {
				target_use(card, player, target, current) {
					if (get.tag(card, "respondShan") && current < 0) {
						var nh = player.countCards("h");
						var players = game.filterPlayer();
						for (var i = 0; i < players.length; i++) {
							if (players[i].countCards("h") > nh) {
								return 0.4;
							}
						}
					}
				},
			},
			order: 8,
			result: {
				player(player) {
					return lib.skill.shifei.checkx(player) ? 1 : 0;
				},
			},
		},
	}
```

## xin_liru 名字:李儒 势力:qun

### xinjuece 名字:绝策
描述: 结束阶段，你可以对一名没有手牌的角色造成1点伤害。
```js
xinjuece: {
		audio: "juece",
		audioname: ["dc_liru", "ol_liru"],
		trigger: {
			player: "phaseJieshuBegin",
		},
		filter(event, player) {
			return game.hasPlayer(current => current.countCards("h") === 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt("xinjuece"),
					prompt2: "对一名没有手牌的角色造成1点伤害",
					filterTarget(card, player, target) {
						return target.countCards("h") === 0;
					},
					ai(target) {
						const player = get.player();
						return get.damageEffect(target, player, player);
					},
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			await target.damage();
		},
	}
```

### xinmieji 名字:灭计
描述: 出牌阶段限一次，你可以展示一张黑色锦囊牌并将之置于牌堆顶，然后令有手牌的一名其他角色选择一项：弃置一张锦囊牌；或依次弃置两张非锦囊牌。
```js
xinmieji: {
		audio: "mieji",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h", { type: ["trick", "delay"], color: "black" });
		},
		filterCard(card) {
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
			const { target, cards } = event;
			await player.showCards(cards, `${get.translation(player)}对${get.translation(target)}发动了【${get.translation(event.name)}】`);
			const result = await target.chooseToDiscard("he", true).set("prompt", "灭计：请弃置一张锦囊牌，或依次弃置两张非锦囊牌。").forResult();
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
					.set("prompt", "灭计：请弃置第二张非锦囊牌");
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

### xinfencheng 名字:焚城
描述: 限定技。出牌阶段，你可以令所有其他角色各选择一项：弃置至少X张牌(X为该角色的上家以此法弃置牌的数量+1)；或受到你对其造成的2点火焰伤害。
```js
xinfencheng: {
		skillAnimation: "epic",
		animationColor: "gray",
		audio: 2,
		audioname: ["re_liru"],
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return player != target;
		},
		limited: true,
		selectTarget: -1,
		multitarget: true,
		multiline: true,
		line: "fire",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);

			const targets = event.targets.toSorted(lib.sort.seat);

			let num = 1;
			for (const target of targets) {
				if (!target.isIn()) {
					continue;
				}
				const res = get.damageEffect(target, player, target, "fire");
				const result = await target
					.chooseToDiscard({
						prompt: `弃置至少${get.cnNumber(num)}张牌或受到2点火焰伤害`,
						selectCard: [num, Infinity],
						position: "he",
						allowChooseAll: true,
						ai(card) {
							if (ui.selected.cards.length >= get.event().num) {
								return -1;
							}
							if (_status.event.player.hasSkillTag("nofire")) {
								return -1;
							}
							if (_status.event.res >= 0) {
								return 6 - get.value(card);
							}
							if (get.type(card) != "basic") {
								return 10 - get.value(card);
							}
							return 8 - get.value(card);
						},
					})
					.set("res", res)
					.set("num", num)
					.forResult();
				if (result?.bool && result.cards?.length) {
					num = result.cards.length + 1;
				} else {
					await target.damage({
						num: 2,
						nature: "fire",
					});
					num = 1;
				}
			}
		},
		ai: {
			order: 1,
			result: {
				player(player) {
					var num = 0,
						eff = 0,
						players = game
							.filterPlayer(function (current) {
								return current != player;
							})
							.sortBySeat(player);
					for (var target of players) {
						if (get.damageEffect(target, player, target, "fire") >= 0) {
							num = 0;
							continue;
						}
						var shao = false;
						num++;
						if (
							target.countCards("he", function (card) {
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

## guohuanghou 名字:郭皇后 势力:wei

### jiaozhao 名字:矫诏
描述: 出牌阶段限一次，你可以展示一张手牌，然后选择距离最近的一名其他角色，该角色声明一张基本牌的牌名。在此出牌阶段内，你可以将此手牌当声明的牌使用（你不能对自己使用此牌）。
```js
jiaozhao: {
		audio: 2,
		usable: 1,
		enable: "phaseUse",
		filter(event, player) {
			return player.countMark("xindanxin") < 2 && player.countCards("h") > 0;
		},
		filterCard: true,
		check(card) {
			return 8 - get.value(card);
		},
		locked: false,
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const { cards } = event;
			await player.showCards(cards);
			let jiaozhaoTarget = player;
			if (player.countMark("xindanxin") <= 1) {
				const targets = game.filterPlayer();
				targets.remove(player);
				targets.sort((a, b) => Math.max(1, get.distance(player, a)) - Math.max(1, get.distance(player, b)));
				const distance = Math.max(1, get.distance(player, targets[0]));
				for (const [i, target] of targets.entries()) {
					if (i == 0) {
						continue;
					}
					if (Math.max(1, get.distance(player, target)) > distance) {
						targets.splice(i);
						break;
					}
				}
				const result = await player
					.chooseTarget({
						prompt: "请选择【矫诏】的目标",
						filterTarget(card, player, target) {
							return get.event().targets.includes(target);
						},
						forced: true,
						ai(target) {
							return get.attitude(get.player(), target);
						},
					})
					.set("targets", targets)
					.forResult();
				jiaozhaoTarget = result.targets[0];
				player.line(result.targets, "green");
			}
			if (!jiaozhaoTarget) {
				return;
			}
			const list = [];
			for (const name of lib.inpile) {
				if (name == "sha") {
					list.push(["基本", "", "sha"]);
					for (const nature of lib.inpile_nature) {
						list.push(["基本", "", "sha", nature]);
					}
				} else if (get.type(name) == "basic") {
					list.push(["基本", "", name]);
				} else if (player.countMark("xindanxin") > 0 && get.type(name) == "trick") {
					list.push(["锦囊", "", name]);
				}
			}
			const result = await jiaozhaoTarget
				.chooseButton({
					createDialog: ["矫诏", [list, "vcard"]],
					forced: true,
					ai(button) {
						const player = get.event(0).getParent().player;
						const card = {
							name: button.link[2],
							nature: button.link[3],
							storage: {
								jiaozhao: player,
							},
						};
						return player.getUseValue(card, null, true) * get.event().att;
					},
				})
				.set("att", get.attitude(jiaozhaoTarget, player) > 0 ? 1 : -1)
				.forResult();
			const chosen = result.links[0][2];
			const nature = result.links[0][3];
			const fakecard = {
				name: chosen,
				storage: { jiaozhao: player },
			};
			if (nature) {
				fakecard.nature = nature;
			}
			await jiaozhaoTarget.showCards(
				game.createCard({
					name: chosen,
					nature: nature,
					suit: cards[0].suit,
					number: cards[0].number,
				}),
				get.translation(jiaozhaoTarget) + "声明了" + get.translation(chosen)
			);
			player.storage.jiaozhao = cards[0];
			player.storage.jiaozhao_card = fakecard;
			game.broadcastAll(
				function (name, card) {
					lib.skill.jiaozhao2.viewAs = name;
					card.addGaintag("jiaozhao");
				},
				fakecard,
				cards[0]
			);
			player.addTempSkill("jiaozhao2", "phaseUseEnd");
		},
		group: "jiaozhao3",
		mod: {
			targetEnabled(card, player, target) {
				if (card.storage && card.storage.jiaozhao && card.storage.jiaozhao == target) {
					return false;
				}
			},
		},
		ai: {
			order: 9,
			result: {
				player: 1,
			},
		},
	}
```

### danxin 名字:殚心
描述: 当你受到伤害后，你可以摸一张牌，或对“矫诏”的描述依次执行下列一项修改：1.将“基本牌”改为“基本牌或普通锦囊牌”；2.将“选择距离最近的一名其他角色，该角色”改为“你”。
```js
danxin: {
		trigger: { player: "damageEnd" },
		frequent: true,
		audio: 2,
		async content(event, trigger, player) {
			let result;
			if (player.countMark("xindanxin") >= 2) {
				await player.draw();
				return;
			}
			const list = ["draw_card", "更改描述"];
			let prompt;
			if (player.countMark("xindanxin") == 0) {
				prompt = '摸一张牌或更改矫诏的描述<br><br><div class="text">更改描述：将“选择距离最近的一名其他角色，该角色”改为“你”';
			} else {
				prompt = '摸一张牌或更改矫诏的描述<br><br><div class="text">更改描述：将“基本牌”改为“基本牌或普通锦囊牌”';
			}
			result = await player
				.chooseControl({
					prompt,
					controls: list,
					ai() {
						if (!_status.event.player.hasSkill("jiaozhao")) {
							return "draw_card";
						}
						return "更改描述";
					},
				})
				.forResult();
			if (result.control == "draw_card") {
				await player.draw();
			} else {
				game.log(player, "更改了", "【矫诏】", "的描述");
				player.popup("更改描述");
				player.addMark("xindanxin", 1, false);
			}
		},
		ai: {
			maixie: true,
			effect: {
				target: (card, player, target) => {
					if (!get.tag(card, "damage")) {
						return;
					}
					if (target.hp < 2 || player.hasSkillTag("jueqing", false, target)) {
						return 1.5;
					}
					return [1, 0.8];
				},
			},
		},
	}
```

## liuyu 名字:刘虞 势力:qun

### zhige 名字:止戈
描述: 出牌阶段限一次，若你的手牌数大于你的体力值，你可以选择攻击范围内含有你的一名其他角色，其选择一项：1.使用一张【杀】；2.将装备区里的一张牌交给你。
```js
zhige: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		filter(event, player) {
			return player.countCards("h") > player.hp;
		},
		filterTarget(card, player, target) {
			return player !== target && target.inRange(player);
		},
		async content(event, trigger, player) {
			const { target } = event;
			let result;
			result = await target
				.chooseToUse({
					prompt: `止戈：使用一张杀，或将装备区里的一张牌交给${get.translation(player)}`,
					filterCard: get.filter({ name: "sha" }),
				})
				.forResult();
			if (result.bool || !target.countCards("e")) {
				return;
			}

			result = await target
				.chooseCard({
					prompt: `将装备区里的一张牌交给${get.translation(player)}`,
					position: "e",
					forced: true,
				})
				.forResult();
			if (result.bool && result.cards?.length) {
				await target.give(result.cards, player);
			}
		},
		ai: {
			expose: 0.2,
			order: 5,
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
		},
	}
```

### zongzuo 名字:宗祚
描述: 锁定技，游戏的第一个回合开始前，你加X点体力上限并回复X点体力（X为全场势力数）；当一名角色死亡后，若没有与其势力相同的角色，你减1点体力上限。
```js
zongzuo: {
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		audio: 2,
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		async content(event, trigger, player) {
			const num = game.countGroup();
			await player.gainMaxHp({ num });
			await player.recover({ num });
			//player.update();
		},
		group: "zongzuo_lose",
		subSkill: {
			lose: {
				trigger: { global: "dieAfter" },
				forced: true,
				audio: "zongzuo",
				filter(event, player) {
					if (!lib.group.includes(event.player.group)) {
						return false;
					}
					if (
						game.hasPlayer(function (current) {
							return current.group == event.player.group;
						})
					) {
						return false;
					}
					return true;
				},
				async content(event, trigger, player) {
					await player.loseMaxHp();
				},
			},
		},
	}
```

### twchongwang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## liyan 名字:李严 势力:shu

### dcduliang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### fulin 名字:腹鳞
描述: 锁定技，你于回合内得到的牌不计入你本回合的手牌上限。
```js
fulin: {
		trigger: { player: "phaseDiscardBegin" },
		audio: 2,
		forced: true,
		async content(event, trigger, player) {
			player.addTempSkill("fulin2", "phaseDiscardAfter");
		},
		group: ["fulin_count", "fulin_reset"],
		subSkill: {
			reset: {
				trigger: { player: ["phaseBefore", "phaseAfter"] },
				silent: true,
				priority: 10,
				async content(event, trigger, player) {
					player.removeGaintag("fulin");
				},
			},
			count: {
				trigger: { player: "gainBegin" },
				audio: "fulin",
				forced: true,
				silent: true,
				filter(event, player) {
					return _status.currentPhase == player;
				},
				async content(event, trigger, player) {
					trigger.gaintag.add("fulin");
				},
			},
		},
		onremove(player) {
			player.removeGaintag("fulin");
		},
	}
```

## sundeng 名字:孙登 势力:wu

### kuangbi 名字:匡弼
描述: 出牌阶段限一次，你可以选择一名有牌的其他角色，该角色将其的一至三张牌置于你的武将牌上。若如此做，你的下个准备阶段，你获得武将牌上的所有牌，然后其摸等量的牌。
```js
kuangbi: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		filterTarget(card, player, target) {
			return target != player && target.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			const { target } = event;
			let result;
			result = await target
				.chooseCard({
					prompt: `匡弼：将至多三张牌置于${get.translation(player)}的武将牌上`,
					selectCard: [1, 3],
					position: "he",
					forced: true,
					ai(card) {
						if (get.attitude(_status.event.player, _status.event.getParent().player) > 0) {
							return 7 - get.value(card);
						}
						return -get.value(card);
					},
				})
				.forResult();
			if (result.bool && result.cards?.length) {
				await player.addToExpansion({
					cards: result.cards,
					source: target,
					animate: "give",
					gaintag: ["kuangbi"],
				});
				if (!player.storage.kuangbi_draw) {
					player.storage.kuangbi_draw = [[], []];
				}
				player.storage.kuangbi_draw[0].push(target);
				player.storage.kuangbi_draw[1].push(result.cards.length);
				player.addSkill("kuangbi_draw");
				player.syncStorage("kuangbi_draw");
				player.updateMarks("kuangbi_draw");
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
			draw: {
				trigger: { player: "phaseZhunbeiBegin" },
				forced: true,
				mark: true,
				charlotte: true,
				audio: "kuangbi",
				onremove: true,
				filter(event, player) {
					return player.getExpansions("kuangbi").length > 0;
				},
				async content(event, trigger, player) {
					await player.gain(player.getExpansions("kuangbi"), "gain2");
					const storage = player.storage.kuangbi_draw;
					if (storage.length) {
						for (const [index, target] of storage[0].entries()) {
							const num = storage[1][index];
							if (target && target.isIn()) {
								player.line(target);
								target.draw(num);
							}
						}
					}
					player.removeSkill("kuangbi_draw");
				},
			},
		},
	}
```

## cenhun 名字:岑昏 势力:wu

### jishe 名字:极奢
描述: ①出牌阶段限20次，若你的手牌上限大于0，你可以摸一张牌，然后你本回合的手牌上限-1。②结束阶段开始时，若你没有手牌，则你可以横置至多X名角色的武将牌（X为你的体力值）。
```js
jishe: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.getHandcardLimit() > 0;
		},
		usable: 20,
		locked: false,
		delay: false,
		async content(event, trigger, player) {
			await player.draw({ nodelay: true });
			player.addTempSkill("jishe2");
			player.addMark("jishe2", 1, false);
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
		group: ["jishe3"],
	}
```

### lianhuo 名字:链祸
描述: 锁定技，当你受到火焰伤害时，若你的武将牌处于横置状态且此伤害不为连环伤害，则此伤害+1。
```js
lianhuo: {
		audio: 2,
		trigger: { player: "damageBegin3" },
		forced: true,
		filter(event, player) {
			return player.isLinked() && event.notLink() && event.hasNature("fire");
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
		ai: {
			neg: true,
		},
	}
```

## huanghao 名字:黄皓 势力:shu

### qinqing 名字:寝情
描述: 结束阶段，你可以选择任意名攻击范围内含有主公的角色，然后弃置这些角色各一张牌并令其摸一张牌（无牌则不弃），若如此做，你摸X张牌（X为其中手牌比主公多的角色数）。
```js
qinqing: {
		audio: 2,
		mode: ["identity", "versus", "doudizhu"],
		available(mode) {
			if (mode == "versus" && _status.mode != "four") {
				return false;
			}
			if (mode == "identity" && _status.mode == "purple") {
				return false;
			}
			return true;
		},
		getZhu(player) {
			if (get.mode() === "doudizhu") {
				return game.findPlayer(i => i.identity === "zhu");
			}
			return get.zhu(player);
		},
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			const zhu = get.info("qinqing").getZhu(player);
			if (!zhu || (get.mode() !== "doudizhu" && !zhu.isZhu)) {
				return false;
			}
			return game.hasPlayer(current => current !== zhu && current.inRange(zhu));
		},
		async cost(event, trigger, player) {
			const zhu = get.info("qinqing").getZhu(player);

			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("qinqing"),
					filterTarget(card, player, target) {
						const zhu = get.event().zhu;
						return target !== zhu && target.inRange(zhu);
					},
					selectTarget: [1, Infinity],
					ai(target) {
						const player = get.player();
						const he = target.countCards("he");
						const zhu = get.event().zhu;
						if (get.attitude(player, target) > 0) {
							if (he == 0) {
								return 1;
							}
							if (target.countCards("h") > zhu.countCards("h")) {
								return 1;
							}
						} else {
							if (he > 0) {
								return 1;
							}
						}
						return 0;
					},
				})
				.set("zhu", zhu)
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const zhu = get.info("qinqing").getZhu(player);
			const targets = event.targets.toSorted(lib.sort.seat);

			for (const target of targets) {
				if (target.countCards("he") > 0) {
					await player.discardPlayerCard({
						target,
						position: "he",
						forced: true,
					});
				}
				await target.draw();
			}

			if (!zhu) {
				return;
			}
			let num = 0;
			const nh = zhu.countCards("h");
			for (const target of targets) {
				if (target.countCards("h") > nh) {
					++num;
				}
			}
			if (num) {
				await player.draw(num);
			}
		},
		ai: {
			threaten: 1.2,
		},
	}
```

### huisheng 名字:贿生
描述: 当你受到其他角色对你造成的伤害时，你可以令其观看你任意数量的牌并令其选择一项：1.获得这些牌中的一张，防止此伤害，然后你不能再对其发动〖贿生〗；2.弃置等量的牌。
```js
huisheng: {
		audio: 2,
		audioname: ["dc_huanghao"],
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			if (!player.countCards("he")) {
				return false;
			}
			if (!event.source || event.source == player || !event.source.isIn()) {
				return false;
			}
			if (player.storage.huisheng && player.storage.huisheng.includes(event.source)) {
				return false;
			}
			return true;
		},
		init(player) {
			player.storage.huisheng ??= [];
		},
		async cost(event, trigger, player) {
			const att = get.attitude(player, trigger.source) > 0;
			let goon = false;
			if (player.hp === 1) {
				goon = true;
			} else {
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
		logTarget(event) {
			return event?.source;
		},
		async content(event, trigger, player) {
			await game.delay();
			const cards = event.cards;
			const num = cards.length;
			const goon = num > 2 || get.attitude(trigger.source, player) >= 0;
			let forced = false;
			let str = "获得其中一张牌并防止伤害";
			if (trigger.source.countCards("he") < num) {
				forced = true;
			} else {
				str += `，或取消并弃置${get.cnNumber(cards.length)}张牌`;
			}
			const result = await trigger.source
				.chooseButton({
					createDialog: [str, cards],
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
				const cards = result.links;
				await trigger.source.gain({
					cards,
					source: player,
					animate: "giveAuto",
					bySelf: true,
				});
				trigger.cancel();
				player.storage.huisheng ??= [];
				player.storage.huisheng.push(trigger.source);
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

## zhangrang 名字:张让 势力:qun

### taoluan 名字:滔乱
描述: 你可以将一张牌当做任意一张基本牌或普通锦囊牌使用（此牌不得是本局游戏你以此法使用过的牌），然后你令一名其他角色选择一项：1.交给你一张与你以此法使用的牌类别不同的牌；2.你失去1点体力且〖滔乱〗无效直到回合结束。
```js
taoluan: {
		hiddenCard(player, name) {
			return !player.getStorage("taoluan").includes(name) && player.countCards("hes") > 0 && lib.inpile.includes(name);
		},
		audio: 2,
		enable: "chooseToUse",
		filter(event, player) {
			return player.hasCard(
				card =>
					lib.inpile.some(name => {
						if (player.getStorage("taoluan").includes(name)) {
							return false;
						}
						if (get.type(name) != "basic" && get.type(name) != "trick") {
							return false;
						}
						if (event.filterCard({ name: name, isCard: true, cards: [card] }, player, event)) {
							return true;
						}
						if (name == "sha") {
							for (var nature of lib.inpile_nature) {
								if (event.filterCard({ name: name, nature: nature, isCard: true, cards: [card] }, player, event)) {
									return true;
								}
							}
						}
						return false;
					}),
				"hes"
			);
		},
		onremove: true,
		chooseButton: {
			dialog(event, player) {
				var list = [];
				for (var name of lib.inpile) {
					if (get.type(name) == "basic" || get.type(name) == "trick") {
						if (player.getStorage("taoluan").includes(name)) {
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
				var card = { name: button.link[2], nature: button.link[3] };
				if (player.countCards("hes", cardx => cardx.name == card.name)) {
					return 0;
				}
				return _status.event.getParent().type == "phase" ? player.getUseValue(card) : 1;
			},
			backup(links, player) {
				return {
					audio: "taoluan",
					filterCard: true,
					popname: true,
					check(card) {
						return 7 - get.value(card);
					},
					position: "hes",
					viewAs: { name: links[0][2], nature: links[0][3] },
					onuse(result, player) {
						player.markAuto("taoluan", [result.card.name]);
					},
				};
			},
			prompt(links, player) {
				return "将一张牌当做" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
			},
		},
		ai: {
			save: true,
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (!player.countCards("hes") || player.isTempBanned("taoluan")) {
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
			order: 4,
			result: {
				player(player) {
					var allshown = true,
						players = game.filterPlayer();
					for (var i = 0; i < players.length; i++) {
						if (players[i].ai.shown == 0) {
							allshown = false;
						}
						if (players[i] != player && players[i].countCards("h") && get.attitude(player, players[i]) > 0) {
							return 1;
						}
					}
					if (allshown) {
						return 1;
					}
					return 0;
				},
			},
			threaten: 1.9,
		},
		group: "taoluan2",
	}
```

## sunziliufang 名字:孙资刘放 势力:wei

### guizao 名字:瑰藻
描述: 弃牌阶段结束时，若你于此阶段弃置牌的数量不小于2且它们的花色各不相同，你可以回复1点体力或摸一张牌。
```js
guizao: {
		audio: 2,
		trigger: { player: "phaseDiscardEnd" },
		direct: true,
		filter(event, player) {
			if (event.cards && event.cards.length > 1) {
				var suits = [];
				for (var i = 0; i < event.cards.length; i++) {
					var suit = get.suit(event.cards[i]);
					if (suits.includes(suit)) {
						return false;
					} else {
						suits.push(suit);
					}
				}
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			player.chooseDrawRecover({
				prompt: get.prompt("guizao"),
				prompt2: "摸一张牌或回复1点体力",
			}).logSkill = "guizao";
		},
	}
```

### jiyu 名字:讥谀
描述: 出牌阶段限一次，你可以令一名角色弃置一张手牌。若如此做，你不能使用与之相同花色的牌，直到回合结束。若其以此法弃置的牌为黑桃，你翻面并令其失去1点体力。若你有未被〖讥谀〗限制的手牌，则你可以继续发动此技能，但不能选择本回合已经选择过的目标。
```js
jiyu: {
		audio: 2,
		enable: "phaseUse",
		locked: false,
		filter(event, player) {
			if (!player.getStat().skill.jiyu || !player.storage.jiyu2) {
				return true;
			}
			var hs = player.getCards("h");
			for (var i = 0; i < hs.length; i++) {
				if (!player.storage.jiyu2.includes(get.suit(hs[i]))) {
					return true;
				}
			}
			return false;
		},
		filterTarget(card, player, target) {
			return target.countCards("h") > 0 && (!player.storage.jiyu || !player.storage.jiyu.includes(target));
		},
		async content(event, trigger, player) {
			const { target } = event;
			let result;
			const evt = event.getParent("phaseUse");
			if (evt && evt.name == "phaseUse" && !evt.jiyu) {
				evt.jiyu = true;
				const next = game.createEvent("jiyu_clear");
				_status.event.next.remove(next);
				evt.after.push(next);
				next.player = player;
				next.setContent(() => {
					game.broadcastAll(player => {
						delete player.storage.jiyu;
						delete player.storage.jiyu2;
					}, player);
				});
			}
			player.storage.jiyu ??= [];
			player.storage.jiyu.push(target);
			let spade = true;
			if (player.isTurnedOver() || get.attitude(target, player) > 0 || target.hp <= 2) {
				spade = false;
			}
			result = await target
				.chooseToDiscard({
					position: "h",
					forced: true,
					ai(card) {
						if (get.suit(card) == "spade") {
							if (_status.event.spade) {
								return 10 - get.value(card);
							}
							return -10 - get.value(card);
						}
						if (_status.event.getParent().player.storage.jiyu2 && _status.event.getParent().player.storage.jiyu2.includes(get.suit(card))) {
							return -3 - get.value(card);
						}
						return -get.value(card);
					},
				})
				.set("spade", spade)
				.forResult();
			if (!result.cards || !result.cards.length) {
				return;
			}
			const card = result.cards[0];
			if (get.suit(card, target) === "spade") {
				await player.turnOver();
				await target.loseHp();
			}
			player.storage.jiyu2 ??= [];
			player.storage.jiyu2.add(get.suit(card));
		},
		onremove: ["jiyu", "jiyu2"],
		ai: {
			order: 9,
			result: {
				target(player, target) {
					if (player.isTurnedOver() || target.countCards("h") <= 3) {
						return -1;
					}
					return 0;
				},
			},
		},
		mod: {
			cardEnabled(card, player) {
				if (player.storage.jiyu2 && player.storage.jiyu2.includes(get.suit(card))) {
					return false;
				}
			},
			cardSavable(card, player) {
				if (player.storage.jiyu2 && player.storage.jiyu2.includes(get.suit(card))) {
					return false;
				}
			},
		},
	}
```

## xinxianying 名字:辛宪英 势力:wei

### zhongjian 名字:忠鉴
描述: 出牌阶段限一次，你可以展示一张手牌，然后展示一名其他角色的X张手牌（X为其体力值）。若以此法展示的牌与你展示的牌：有颜色相同的，你选择：①摸一张牌。②弃置一名其他角色的一张牌；有点数相同的，本回合此技能改为“出牌阶段限两次”；均不同，你的手牌上限-1。
```js
zhongjian: {
		audio: 2,
		enable: "phaseUse",
		usable(skill, player) {
			return 1 + (player.hasSkill(skill + "_rewrite", null, null, false) ? 1 : 0);
		},
		filter(event, player) {
			if (!player.countCards("h")) {
				return false;
			}
			return game.hasPlayer(current => current != player && Math.min(current.hp, current.countCards("h")) > 0);
		},
		filterCard: true,
		check() {
			return Math.random();
		},
		discard: false,
		lose: false,
		delay: false,
		filterTarget(card, player, target) {
			return target != player && target.hp > 0 && target.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.showCards(cards);
			if (Math.min(target.hp, target.countCards("h")) <= 0) {
				return;
			}
			const result = await player.choosePlayerCard(target, "h", Math.min(target.countCards("h"), target.hp), true).forResult();
			if (!result?.cards?.length) {
				return;
			}
			const hs = result.cards;
			await target.showCards(hs);
			const bool1 = cards.some(card => hs.some(cardx => get.color(cardx) == get.color(card)));
			const bool2 = cards.some(card => hs.some(cardx => get.number(cardx) == get.number(card)));
			if (bool1) {
				const result = !game.hasPlayer(current => current != player && current.countDiscardableCards(player, "he"))
					? { bool: false }
					: await player
							.chooseTarget((card, player, target) => {
								return target != player && target.countDiscardableCards(player, "he");
							}, "弃置一名其他角色的一张牌或摸一张牌")
							.set("ai", target => {
								const player = get.player();
								const att = get.attitude(player, target);
								if (att >= 0) {
									return 0;
								}
								if (target.countCards("he", card => get.value(card) > 5)) {
									return -att;
								}
								return 0;
							})
							.forResult();
				if (result?.targets?.length) {
					const [target] = result.targets;
					player.line(target, "green");
					await player.discardPlayerCard(target, true, "he");
				} else {
					await player.draw();
				}
			}
			if (bool2) {
				player.addTempSkill(event.name + "_rewrite", "phaseUseEnd");
			}
			if (!bool1 && !bool2) {
				player.addSkill(event.name + "_effect");
				player.addMark(event.name + "_effect", 1, false);
				player.popup("杯具");
			}
		},
		ai: {
			order: 8,
			result: {
				player(player, target) {
					return Math.min(target.hp, target.countCards("h"));
				},
			},
		},
		subSkill: {
			rewrite: { charlotte: true },
			effect: {
				charlotte: true,
				onremove: true,
				markimage: "image/card/handcard.png",
				intro: { content: "手牌上限-#" },
				mod: {
					maxHandcard(player, num) {
						return num - player.countMark("zhongjian_effect");
					},
				},
			},
		},
	}
```

### caishi 名字:才识
描述: 摸牌阶段开始时，你可以选择一项：1.令手牌上限+1；2.回复1点体力，本回合内不能对自己使用牌。
```js
caishi: {
		audio: 2,
		trigger: { player: "phaseDrawBegin" },
		async cost(event, trigger, player) {
			const choices = [];
			const choiceList = ["令自己的手牌上限+1", "回复1点体力，然后本回合你不能对自己使用牌"];
			choices.push("选项一");
			if (player.isDamaged()) {
				choices.push("选项二");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			const result = await player
				.chooseControl(choices, "cancel2")
				.set("choiceList", choiceList)
				.set("prompt", get.prompt(event.skill))
				.set("ai", () => {
					return get.event().choice;
				})
				.set(
					"choice",
					(() => {
						if (player.isDamaged()) {
							if (player.countCards("h", "tao")) {
								return 0;
							}
							if (player.hp < 2) {
								return 1;
							}
							if (
								player.countCards("h", card => {
									const info = get.info(card);
									return info && (info.toself || info.selectTarget == -1) && player.canUse(card, player) && player.getUseValue(card) > 0;
								}) == 0
							) {
								return 1;
							}
						}
						return 0;
					})()
				)
				.forResult();
			event.result = {
				bool: result?.control !== "cancel2",
				cost_data: result?.index,
			};
		},
		async content(event, trigger, player) {
			const index = event.cost_data;
			if (index == 0) {
				player.addSkill(event.name + "_effect");
				player.addMark(event.name + "_effect", 1, false);
			} else if (index == 1) {
				await player.recover();
				player.addTempSkill(event.name + "_buff");
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				markimage: "image/card/handcard.png",
				intro: { content: "手牌上限+#" },
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("caishi_effect");
					},
				},
			},
			buff: {
				charlotte: true,
				mark: true,
				intro: { content: "本回合内不能对自己使用牌" },
				mod: {
					playerEnabled(card, player, target) {
						if (player == target) {
							return false;
						}
					},
				},
			},
		},
	}
```

## wuxian 名字:吴苋 势力:shu

### fumian 名字:福绵
描述: 准备阶段，你可以选择一项：1.摸牌阶段多摸一张牌；2.使用红色牌可以多选择一个目标（限一次）。若与你上回合选择的选项不同，则该选项数值+1并复原此技能。
```js
fumian: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			const choices = ["摸牌阶段多摸一张牌", "使用红色牌可以多选择一个目标（限一次）"];
			let ai = (event, player) => {
				if (player.hp == 1 || player.countCards("h") < player.hp) {
					return 0;
				}
				return 1;
			};
			switch (player.storage.fumian_choice) {
				case "red":
					choices[0] = "摸牌阶段多摸两张牌";
					ai = () => 0;
					break;
				case "draw":
					choices[1] = "使用红色牌可以多选择两个目标（限一次）";
					ai = (event, player) => {
						if (player.hp == 1 || player.countCards("h") <= 1) {
							return 0;
						}
						return 1;
					};
					break;
			}

			const result = await player
				.chooseControlList({
					prompt: get.prompt("fumian"),
					list: choices,
					ai,
				})
				.forResult();

			event.result = {
				bool: result.control !== "cancel2",
				cost_data: {
					index: result.index,
					choice: result.index === 0 ? "draw" : "red",
				},
			};
		},
		async content(event, trigger, player) {
			const { index, choice } = event.cost_data;

			let draw = 1;
			let red = 2;
			if (player.storage.fumian_choice !== choice) {
				const last = player.storage.fumian_choice;
				delete player.storage.fumian_choice;
				switch (last) {
					case "draw":
						red = 2;
						break;
					case "red":
						draw = 2;
						break;
					default:
						player.storage.fumian_choice = choice;
						break;
				}
			}

			if (index === 0) {
				player.storage.fumian_draw = draw;
				player.addTempSkill("fumian_draw");
			} else {
				player.storage.fumian_red = red;
				player.addTempSkill("fumian_red");
			}
		},
		ai: {
			threaten: 1.3,
		},
		subSkill: {
			draw: {
				trigger: { player: "phaseDrawBegin2" },
				forced: true,
				popup: false,
				onremove: true,
				filter(event, player) {
					return !event.numFixed && typeof player.storage.fumian_draw == "number";
				},
				async content(event, trigger, player) {
					trigger.num += player.storage.fumian_draw;
				},
			},
			red2: {},
			red: {
				trigger: { player: "useCard2" },
				mark: true,
				onremove: true,
				intro: {
					content: "你使用红色牌可以多选择#个目标（限一次）",
				},
				filter(event, player) {
					if (get.color(event.card) != "red") {
						return false;
					}
					if (player.hasSkill("fumian_red2")) {
						return false;
					}
					var info = get.info(event.card);
					if (info.allowMultiple == false) {
						return false;
					}
					if (event.targets && !info.multitarget) {
						if (
							game.hasPlayer(function (current) {
								return lib.filter.targetEnabled2(event.card, player, current) && !event.targets.includes(current);
							})
						) {
							return true;
						}
					}
					return false;
				},
				async cost(event, trigger, player) {
					const prompt2 = `额外指定${player.storage.fumian_red === 2 ? "至多两" : "一"}名${get.translation(trigger.card)}的目标`;
					event.result = await player
						.chooseTarget({
							prompt: get.prompt("fumian"),
							prompt2,
							filterTarget(card, player, target) {
								const event = get.event();
								if (event.targets.includes(target)) {
									return false;
								}
								return lib.filter.targetEnabled2(event.card, player, target);
							},
							selectTarget: [1, player.storage.fumian_red],
							ai(target) {
								const event = get.event();
								const trigger = event.getTrigger();
								const player = event.player;
								return get.effect(target, trigger.card, player, player);
							},
						})
						.set("targets", trigger.targets)
						.set("card", trigger.card)
						.forResult();
				},
				logTarget: "targets",
				async content(event, trigger, player) {
					if (!event.isMine()) {
						await game.delayx();
					}
					const targets = event.targets;
					if (targets) {
						trigger.targets.addArray(targets);
						player.addTempSkill("fumian_red2");
					}
				},
			},
		},
	}
```

### daiyan 名字:怠宴
描述: 结束阶段，你可以令一名其他角色从牌堆中获得一张红桃基本牌，然后若其于上回合成为过该技能目标，则其失去1点体力。
```js
daiyan: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		init() {
			lib.onwash.push(() => void Reflect.deleteProperty(_status, "daiyan_notao"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("daiyan"),
					filterTarget: lib.filter.notMe,
					ai(target) {
						const player = _status.event.player;
						const att = get.attitude(player, target);
						if (att > 0) {
							if (Reflect.has(_status, "daiyan_notao")) {
								return 0;
							}
							if (target === player.storage.daiyan) {
								return 0;
							}
							return (2 * att) / Math.sqrt(1 + target.hp);
						}
						if (Reflect.has(_status, "daiyan_notao")) {
							if (target === player.storage.daiyan) {
								return -3 * att;
							}
							return -att;
						}
						return 0;
					},
				})
				.forResult();

			if (!event.result.bool) {
				delete player.storage.daiyan;
			}
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			const tao = get.cardPile2(card => get.suit(card) === "heart" && get.type(card) === "basic");
			if (tao) {
				await target.gain({
					cards: [tao],
					animate: "gain2",
				});
			} else {
				Reflect.set(_status, "daiyan_notao", true);
			}
			if (target === player.storage.daiyan) {
				await target.loseHp();
			}
			player.storage.daiyan = target;
		},
		ai: {
			threaten: 1.5,
			expose: 0.2,
		},
	}
```

## xushi 名字:徐氏 势力:wu

### wengua 名字:问卦
描述: 其他角色/你的出牌阶段限一次，其可以交给你一张牌，(若当前回合角色为你，则跳过此步骤)，你可以将此牌/一张牌置于牌堆顶或牌堆底，然后你与其/你从另一端摸一张牌。
```js
wengua: {
		global: "wengua2",
		audio: 2,
	}
```

### fuzhu 名字:伏诛
描述: 一名男性角色的结束阶段，若牌堆剩余牌数不大于你体力值的十倍，则你可以依次对其使用牌堆中所有的【杀】（不能超过游戏人数），然后洗牌。
```js
fuzhu: {
		audio: 2,
		trigger: {
			global: "phaseJieshuBegin",
		},
		filter(event, player) {
			return event.player !== player && event.player.hasSex("male") && ui.cardPile.childElementCount <= player.hp * 10;
		},
		check(event, player) {
			return get.attitude(player, event.player) < 0 && get.effect(event.player, { name: "sha" }, player, player) > 0;
		},
		logTarget: "player",
		skillAnimation: true,
		animationColor: "wood",
		onWash() {
			_status.event.getParent("fuzhu").washed = true;
			return "remove";
		},
		async content(event, trigger, player) {
			event.washed = false;
			lib.onwash.push(lib.skill.fuzhu.onWash);
			let total = game.players.length + game.dead.length;
			while (true) {
				total--;
				const card = get.cardPile2(card => {
					return card.name == "sha" && player.canUse(card, trigger.player, false);
				});
				if (card) {
					await player.useCard({
						card,
						targets: [trigger.player],
						addCount: false,
					});
				}
				if (!(total > 0 && !event.washed && ui.cardPile.childElementCount <= player.hp * 10 && trigger.player.isIn())) {
					break;
				}
			}
			lib.onwash.remove(lib.skill.fuzhu.onWash);
			game.washCard();
		},
		ai: {
			threaten: 1.5,
		},
	}
```

## caojie 名字:曹节 势力:qun

### shouxi 名字:守玺
描述: 当你成为【杀】的目标后，你可声明一种未以此法声明过的基本牌或锦囊牌的牌名。若使用者弃置一张你声明的牌，其获得你的一张牌；若否，则此【杀】对你无效。
```js
shouxi: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		init(player) {
			player.storage.shouxi ??= [];
		},
		filter(event, player) {
			return event.card.name === "sha" && event.player.isIn();
		},
		async cost(event, trigger, player) {
			const cards = lib.inpile.filter(card => {
				if (player.storage.shouxi.includes(card)) {
					return false;
				}
				const type = get.type2(card);
				return type === "basic" || type === "trick";
			});
			if (cards.length === 0) {
				event.result = { bool: false };
				return;
			}

			const list = cards.map(card => [get.type(card), "", card]);
			const result = await player
				.chooseButton({
					createDialog: [get.prompt("shouxi", trigger.player), [list, "vcard"]],
					ai() {
						return Math.random();
					},
				})
				.forResult();

			event.result = {
				bool: result.bool,
				cost_data: {
					vcard: result.links,
					name: result.links?.[0]?.[2],
				},
			};
		},
		async content(event, trigger, player) {
			const { vcard, name } = event.cost_data;
			player.storage.shouxi.add(name);
			player.popup(name);
			game.log(player, "声明了", `#y${get.translation(name)}`);

			const result = await trigger.player
				.chooseToDiscard({
					filterCard(card) {
						return card.name === get.event().cardname;
					},
					ai(card) {
						return get.event().att < 0 ? 10 - get.value(card) : 0;
					},
				})
				.set("att", get.attitude(trigger.player, player))
				.set("cardname", name)
				.set("dialog", ["守玺：请弃置一张【" + get.translation(name) + "】，否则此【杀】对" + get.translation(player) + "无效", [vcard, "vcard"]])
				.forResult();

			if (result.bool) {
				await trigger.player.gainPlayerCard({ target: player });
			} else {
				trigger.excluded.push(player);
			}
		},
		ai: {
			effect: {
				target_use(card, player, target, current) {
					if (card.name == "sha" && get.attitude(player, target) < 0) {
						return 0.3;
					}
				},
			},
		},
	}
```

### huimin 名字:惠民
描述: 结束阶段，你可以摸X张牌并展示等量手牌（X为手牌数小于其体力值的角色数），然后从你指定的一名角色开始这些角色依次选择并获得其中一张。
```js
huimin: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		check(event, player) {
			return (
				game.countPlayer(function (current) {
					if (current.countCards("h") < current.hp) {
						return get.sgn(get.attitude(player, current));
					}
				}) >= 0
			);
		},
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.countCards("h") < current.hp;
			});
		},
		async content(event, trigger, player) {
			const list = game
				.filterPlayer(function (current) {
					return current.countCards("h") < current.hp;
				})
				.sortBySeat();
			await player.draw(list.length);
			const result = await player
				.chooseCardTarget({
					prompt: "惠民",
					prompt2: "选择要分配的牌和分牌起点",
					selectCard: Math.min(list.length, player.countCards("h")),
					forced: true,
					list: list,
					filterTarget(card, player, target) {
						return get.event().list.includes(target);
					},
					ai1(card) {
						return 6 - get.value(card);
					},
					ai2(target) {
						const { player, list } = get.event();
						const att = get.attitude(player, target),
							index = list.indexOf(target);
						if (att <= 0) {
							return att;
						}
						let prev = list[(index ? index : list.length) - 1];
						if (get.attitude(player, prev) < 0) {
							return att;
						}
						return 0;
					},
				})
				.forResult();
			if (!result?.bool || !result.cards?.length) {
				return;
			}
			const { cards, targets } = result;
			await player.showCards(cards).setContent(() => {});
			list.sortBySeat(targets[0]);
			player.line(list, "green");
			await player.lose(cards, ui.ordering);
			const dialog = ui.create.dialog("惠民", cards, true);
			_status.dieClose.push(dialog);
			dialog.videoId = lib.status.videoId++;
			game.addVideo("cardDialog", null, ["惠民", get.cardsInfo(cards), dialog.videoId]);
			game.broadcast(
				function (cards, id) {
					const dialog = ui.create.dialog("惠民", cards, true);
					_status.dieClose.push(dialog);
					dialog.videoId = id;
				},
				cards,
				dialog.videoId
			);
			await game.delay();
			while (list.length && cards.length) {
				const current = list.shift();
				const next = current.chooseButton(true, function (button) {
					return get.value(button.link, _status.event.player);
				});
				next.set("dialog", dialog.videoId);
				next.set("closeDialog", false);
				next.set("dialogdisplay", true);
				next.set("cardFilter", cards.slice(0));
				next.set("filterButton", function (button) {
					return _status.event.cardFilter.includes(button.link);
				});
				const result2 = await next.forResult();
				if (!result2.bool || !result2.links?.length) {
					continue;
				}
				await current.gain(result2.links, "gain2");
				cards.removeArray(result2.links);
				let capt = get.translation(current) + "选择了" + get.translation(result2.links);
				game.broadcastAll(
					function (card, id, name, capt) {
						const dialog = get.idDialog(id);
						if (dialog) {
							dialog.content.firstChild.innerHTML = capt;
							for (const button of dialog.buttons) {
								if (button.link == card) {
									game.createButtonCardsetion(name, button);
									break;
								}
							}
							game.addVideo("dialogCapt", null, [dialog.videoId, dialog.content.firstChild.innerHTML]);
						}
					},
					result2.links[0],
					dialog.videoId,
					current.getName(true),
					capt
				);
			}
			game.broadcastAll("closeDialog", dialog.videoId);
			game.broadcastAll(dialog => {
				_status.dieClose.remove(dialog);
			}, dialog);
			if (cards.length) {
				await game.cardsDiscard(cards);
			}
		},
	}
```

## caiyong 名字:蔡邕 势力:qun

### bizhuan 名字:辟撰
描述: 当你使用黑桃牌后，或你成为其他角色使用黑桃牌的目标后，你可以将牌堆顶的一张牌置于武将牌上，称为“书”；你至多拥有四张“书”，你每有一张“书” ，手牌上限+1。
```js
bizhuan: {
		audio: 2,
		trigger: {
			player: "useCard",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (event.name != "useCard" && event.player == event.target) {
				return false;
			}
			if (player.getExpansions("bizhuan").length >= 4) {
				return false;
			}
			return get.suit(event.card) == "spade";
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		frequent: true,
		locked: false,
		async content(event, trigger, player) {
			await player.addToExpansion({
				cards: get.cards(),
				animate: "gain2",
				gaintag: ["bizhuan"],
			});
		},
		mod: {
			maxHandcard(player, num) {
				return num + player.getExpansions("bizhuan").length;
			},
		},
		ai: {
			notemp: true,
		},
	}
```

### tongbo 名字:通博
描述: 摸牌阶段摸牌后，你可以用任意张牌替换等量的“书”，然后若你的“书”包含四种花色，你将所有“书”交给任意名其他角色。
```js
tongbo: {
		audio: 2,
		trigger: { player: "phaseDrawAfter" },
		direct: true,
		filter(event, player) {
			return player.getExpansions("bizhuan").length > 0 && player.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			let result;
			let four = false;
			const nofour = !player.hasFriend();
			const expansions = player.getExpansions("bizhuan");
			if (expansions.length == 4) {
				const suits = new Set(["club", "spade", "heart", "diamond"]);
				const list = player.getCards("he").concat(expansions);
				for (const card of list) {
					suits.delete(get.suit(card));
					if (suits.size == 0) {
						four = true;
						break;
					}
				}
			}
			const chooseMoveEvent = player.chooseToMove({ prompt: "通博：是否交换“书”和手牌？" }).set("four", four).set("nofour", nofour);
			chooseMoveEvent.set("list", [
				[get.translation(player) + "（你）的“书”", expansions],
				["你的牌", player.getCards("he")],
			]);
			chooseMoveEvent.set("filterMove", (from, to) => typeof to != "number");
			chooseMoveEvent.set("processAI", list => {
				const player = _status.event.player;
				const cards = list[0][1].concat(list[1][1]);
				let cards2 = [];
				if (_status.event.four) {
					const sorted = [[], [], [], []];
					for (const card of cards) {
						const index = lib.suit.indexOf(get.suit(card, false));
						if (sorted[index]) {
							sorted[index].push(card);
						}
					}
					if (_status.event.nofour) {
						sorted.sort((a, b) => a.length - b.length);
						const cards3 = cards.slice(0).sort((a, b) => get.useful(a) - get.useful(b));
						cards3.removeArray(sorted[0]);
						cards2 = cards3.slice(0, 4);
						cards.removeArray(cards2);
					} else {
						for (const i of sorted) {
							cards2.push(i.randomGet());
							cards.remove(cards2);
						}
					}
				} else {
					cards.sort((a, b) => get.useful(a) - get.useful(b));
					cards2 = cards.splice(0, player.getExpansions("bizhuan").length);
				}
				return [cards2, cards];
			});
			result = await chooseMoveEvent.forResult();

			if (result.bool) {
				const pushs = result.moved[0];
				const gains = result.moved[1];
				pushs.removeArray(player.getExpansions("bizhuan"));
				gains.removeArray(player.getCards("he"));
				if (!pushs.length || pushs.length != gains.length) {
					return;
				}
				player.logSkill("tongbo");
				await player.addToExpansion({
					cards: pushs,
					animate: "give",
					source: player,
					gaintag: ["bizhuan"],
				});
				await player.gain({
					cards: gains,
					animate: "gain2",
				});
			}

			const suits2 = new Set(["club", "spade", "heart", "diamond"]);
			const expansions2 = player.getExpansions("bizhuan");
			for (const expansion of expansions2) {
				suits2.delete(get.suit(expansion));
			}
			if (suits2.size > 0) {
				return;
			}

			const cards = player.getExpansions("bizhuan").slice(0);
			while (cards.length) {
				if (cards.length > 1) {
					result = await player
						.chooseCardButton({
							prompt: "将所有“书”交给任意名其他角色",
							forced: true,
							cards,
							select: [1, cards.length],
							ai(button) {
								if (ui.selected.buttons.length == 0) {
									return 1;
								}
								return 0;
							},
						})
						.forResult();
				} else {
					result = { links: cards.slice(0), bool: true };
				}
				if (!result.bool) {
					return;
				}

				for (const link of result.links) {
					cards.remove(link);
				}
				const togive = result.links.slice(0);
				result = await player
					.chooseTarget({
						prompt: `将${get.translation(result.links)}交给一名其他角色`,
						filterTarget(card, player, target) {
							return target !== player;
						},
						forced: true,
						ai(target) {
							const att = get.attitude(_status.event.player, target);
							if (_status.event.enemy) {
								return -att;
							}
							if (att > 0) {
								return att / (1 + target.countCards("h"));
							}
							return att / 100;
						},
					})
					.set("enemy", get.value(togive[0], player, "raw") < 0)
					.forResult();

				if (!result.targets?.length) {
					return;
				}

				const gainEvent = result.targets[0].gain({ cards: togive, animate: "draw" });
				gainEvent.giver = player;
				await gainEvent;
				player.line(result.targets[0], "green");
				game.log(result.targets[0], "获得了" + get.cnNumber(togive.length) + "张", "#g“书”");
			}
		},
		ai: {
			combo: "bizhuan",
		},
	}
```

## jikang 名字:嵇康 势力:wei

### qingxian 名字:清弦
描述: 当你受到伤害/回复体力后，若没有角色处于濒死状态，你可以令伤害来源/一名其他角色执行一项：1.失去1点体力，随机使用一张装备牌；2.回复1点体力，弃置一张装备牌。若其以此法使用或弃置的牌为梅花，你摸一张牌。
```js
qingxian: {
		audio: 2,
		group: ["qingxian_jilie", "qingxian_rouhe", "qingxian_dying"],
		ai: {
			threaten: 0.8,
			maixie: true,
			maixie_hp: true,
			maixie_defend: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage")) {
						if (target.hp > 1 && target.hasFriend()) {
							return 0.4;
						}
					}
				},
			},
		},
		subSkill: {
			rouhe: {
				audio: "qingxian",
				trigger: { player: "recoverEnd" },
				filter(event, player) {
					return !_status.dying.length;
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget({
							prompt: get.prompt("qingxian"),
							prompt2: "当你回复体力后，你可以令一名其他角色执行一项：失去1点体力，随机使用一张装备牌；回复1点体力，弃置一张装备牌。若其以此法使用或弃置的牌为梅花，你回复1点体力",
							filterTarget(card, player, target) {
								return target !== player;
							},
							ai(target) {
								const att = get.attitude(_status.event.player, target);
								if (target.isHealthy() && att > 0) {
									return 0;
								}
								if (target.hp == 1 && att != 0) {
									if (att > 0) {
										return 9;
									} else {
										return 10;
									}
								} else {
									return Math.sqrt(Math.abs(att));
								}
							},
						})
						.forResult();
				},
				logTarget: "targets",
				async content(event, trigger, player) {
					await lib.skill.qingxian.content_choose(event, trigger, player);
				},
			},
			jilie: {
				audio: "qingxian",
				trigger: { player: "damageEnd" },
				filter(event, player) {
					return event.source?.isIn() && !_status.dying.length;
				},
				check(event, player) {
					if (get.attitude(player, event.source) > 0 && event.source.isHealthy()) {
						return false;
					}
					return true;
				},
				logTarget: "source",
				prompt2: "当你受到伤害后，你可以令伤害来源执行一项：失去1点体力，随机使用一张装备牌；回复1点体力，弃置一张装备牌。若其以此法使用或弃置的牌为梅花，你回复1点体力",
				async content(event, trigger, player) {
					await lib.skill.qingxian.content_choose(event, trigger, player);
				},
			},
		},
		/**
		 * @type {ContentFuncByAll}
		 */
		async content_choose(event, trigger, player) {
			const {
				targets: [target],
			} = event;

			let resultIndex;
			if (target.isHealthy()) {
				resultIndex = 0;
			} else {
				let index;
				if (get.attitude(player, target) > 0) {
					index = 1;
				} else {
					index = 0;
				}

				const chooseResult = await player
					.chooseControlList({
						list: ["令" + get.translation(target) + "失去1点体力，随机使用一张装备牌", "令" + get.translation(target) + "回复1点体力，弃置一张装备牌"],
						forced: true,
						ai(event, player) {
							return get.event().index;
						},
					})
					.set("index", index)
					.forResult();
				resultIndex = chooseResult?.index || index;
			}
			let card = null;
			if (resultIndex == 0) {
				await target.loseHp();
				card = get.cardPile(card => get.type(card) == "equip" && target.canUse(card, target), false, "random");
				if (card) {
					await target.chooseUseTarget({
						card,
						throw: false,
						nopopup: true,
						forced: true,
					});
				}
			} else {
				await target.recover();
				if (target.countCards("he", { type: "equip" })) {
					const discardResult = await target
						.chooseToDiscard({
							prompt: "弃置一张装备牌",
							filterCard(card) {
								return get.type(card) === "equip";
							},
							position: "he",
							forced: true,
							ai(card) {
								let val = -get.value(card);
								if (get.suit(card) === "club") {
									val += get.event().att * 10;
								}
								return val;
							},
						})
						.set("att", get.sgnAttitude(target, player))
						.forResult();
					if (discardResult && discardResult.cards) {
						card = discardResult.cards[0];
					}
				}
			}
			if (card && get.suit(card) === "club") {
				await player.draw();
			}
		},
	}
```

### juexiang 名字:绝响
描述: 当你死亡后，你可以令一名角色随机获得“清弦残谱”其中一个技能，然后直到其下回合开始，其不能被选择为其他角色使用梅花牌的目标。
```js
juexiang: {
		audio: 2,
		trigger: { player: "die" },
		forceDie: true,
		skillAnimation: true,
		animationColor: "thunder",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2("juexiang"),
					filterTarget: lib.filter.notMe,
					ai(target) {
						const player = get.player();
						return get.attitude(player, target) / Math.sqrt(target.hp + 1);
					},
				})
				.set("forceDie", true)
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			target.addSkills(lib.skill.juexiang.derivation.randomGet());
			target.addTempSkill("juexiang_club", { player: "phaseZhunbeiBegin" });
		},
		derivation: ["juexiang_ji", "juexiang_lie", "juexiang_rou", "juexiang_he"],
		subSkill: {
			ji: {
				audio: 1,
				mark: true,
				nopop: true,
				intro: {
					content: "info",
				},
				trigger: { player: "damageEnd" },
				filter(event, player) {
					return event.source && event.source.isIn() && event.source != player && !_status.dying.length;
				},
				check(event, player) {
					return get.attitude(player, event.source) < 0;
				},
				logTarget: "source",
				async content(event, trigger, player) {
					await trigger.source.loseHp();
					const card = get.cardPile(card => get.type(card) == "equip" && trigger.source.canUse(card, trigger.source), false, "random");
					if (card) {
						await trigger.source.chooseUseTarget({
							card,
							throw: false,
							nopopup: true,
							forced: true,
						});
					}
				},
				ai: {
					maixie_defend: true,
				},
			},
			lie: {
				audio: 1,
				mark: true,
				nopop: true,
				intro: {
					content: "info",
				},
				trigger: {
					player: "recoverEnd",
					global: "dyingAfter",
				},
				getIndex(event, player, triggername) {
					if (_status.dying.length) {
						if (triggername == "recoverEnd") {
							player.storage.juexiang_lie ??= 0;
							++player.storage.juexiang_lie;
						}
						return 0;
					}

					return triggername === "dyingAfter" ? player.storage.juexiang_lie : 1;
				},
				filter(event, player) {
					return !_status.dying.length;
				},
				async cost(event, trigger, player) {
					if (event.triggername == "dyingAfter") {
						if (!player.countMark("juexiang_lie")) {
							return;
						}
						player.storage.juexiang_lie--;
					}
					event.result = await player
						.chooseTarget({
							prompt: get.prompt2("juexiang_lie"),
							filterTarget: lib.filter.notMe,
							ai(target) {
								return -get.attitude(player, target) / (1 + target.hp);
							},
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					await target.loseHp();
					const card = get.cardPile(card => get.type(card) == "equip" && target.canUse(card, target), false, "random");
					if (card) {
						await target.chooseUseTarget({
							card,
							throw: false,
							nopopup: true,
							forced: true,
						});
					}
				},
			},
			rou: {
				audio: 1,
				mark: true,
				nopop: true,
				intro: {
					content: "info",
				},
				trigger: { player: "damageEnd" },
				filter(event, player) {
					return event.source && event.source.isIn() && event.source != player && !_status.dying.length;
				},
				check(event, player) {
					var att = get.attitude(player, event.source);
					if (player.isHealthy()) {
						return att < 0;
					} else {
						return att > 0;
					}
				},
				logTarget: "source",
				async content(event, trigger, player) {
					await trigger.source.recover();
					if (trigger.source.countCards("he", { type: "equip" })) {
						await trigger.source.chooseToDiscard({
							prompt: "弃置一张装备牌",
							filterCard(card) {
								return get.type(card) === "equip";
							},
							position: "he",
							forced: true,
						});
					}
				},
				ai: {
					maixie_defend: true,
				},
			},
			he: {
				audio: 1,
				mark: true,
				nopop: true,
				intro: {
					content: "info",
				},
				trigger: { player: "recoverEnd" },
				filter(event, player) {
					return !_status.dying.length;
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget({
							prompt: get.prompt2("juexiang_he"),
							filterTarget: lib.filter.notMe,
							ai(target) {
								const att = get.attitude(get.event().player, target);
								if (target.isHealthy() && target.countCards("he")) {
									return -att;
								}
								return (10 * att) / (1 + target.hp);
							},
						})
						.forResult();
				},
				logTarget: "targets",
				async content(event, trigger, player) {
					const target = event.targets[0];
					await target.recover();
					if (target.countCards("he", { type: "equip" })) {
						await target.chooseToDiscard({
							prompt: "弃置一张装备牌",
							filterCard(card) {
								return get.type(card) === "equip";
							},
							position: "he",
							forced: true,
						});
					}
				},
			},
			club: {
				mark: true,
				nopop: true,
				intro: {
					content: "info",
				},
				mod: {
					targetEnabled(card, player, target) {
						if (get.suit(card) == "club" && player != target) {
							return false;
						}
					},
				},
			},
		},
	}
```

## qinmi 名字:秦宓 势力:shu

### jianzheng 名字:谏征
描述: 当一名其他角色使用【杀】指定目标时，若你在其攻击范围内且你不是目标，则你可以将一张手牌置于牌堆顶，取消所有目标，然后若此【杀】不为黑色，你成为目标。
```js
jianzheng: {
		audio: 2,
		trigger: { global: "useCardToPlayer" },
		filter(event, player) {
			if (!player.countCards("h")) {
				return false;
			}
			return event.player != player && event.card.name == "sha" && !event.targets.includes(player) && event.player.inRange(player);
		},
		async cost(event, trigger, player) {
			const { targets, player: playerx, card } = trigger;
			let effect = 0;
			for (let i = 0; i < targets.length; i++) {
				effect -= get.effect(targets[i], card, playerx, player);
			}
			if (effect > 0) {
				if (get.color(card) != "black") {
					effect = 0;
				} else {
					effect = 1;
				}
				if (targets.length == 1) {
					if (targets[0].hp == 1) {
						effect++;
					}
					if (effect > 0 && targets[0].countCards("h") < player.countCards("h")) {
						effect++;
					}
				}
				if (effect > 0) {
					effect += 6;
				}
			}
			event.result = await player
				.chooseCard("h", get.prompt2(event.skill, playerx))
				.set("ai", function (card) {
					if (_status.event.effect >= 0) {
						const val = get.value(card);
						if (val < 0) {
							return 10 - val;
						}
						return _status.event.effect - val;
					}
					return 0;
				})
				.set("effect", effect)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const {
				cards: [card],
			} = event;
			game.log(player, "将", card, "置于牌堆顶");
			player.$throw(card, 1000);
			await player.lose(card, ui.cardPile, "visible", "insert");
			trigger.targets.length = 0;
			trigger.getParent().triggeredTargets1.length = 0;
			if (get.color(trigger.card) != "black") {
				trigger.getParent().targets.push(player);
				trigger.player.line(player);
				await game.delay();
			}
		},
		ai: {
			threaten: 1.1,
			expose: 0.25,
		},
	}
```

### zhuandui 名字:专对
描述: 当你使用【杀】指定目标/成为【杀】的目标后，你可以与目标角色/此【杀】使用者拼点，若你赢，此【杀】不能被【闪】响应/对你无效。
```js
zhuandui: {
		audio: 2,
		group: ["zhuandui_respond", "zhuandui_use"],
		subSkill: {
			use: {
				audio: "zhuandui",
				trigger: { player: "useCardToPlayered" },
				check(event, player) {
					return get.attitude(player, event.target) < 0;
				},
				filter(event, player) {
					return event.card.name == "sha" && player.canCompare(event.target);
				},
				logTarget: "target",
				async content(event, trigger, player) {
					const result = await player.chooseToCompare(trigger.target).forResult();
					if (result.bool) {
						trigger.getParent().directHit.add(trigger.target);
					}
				},
			},
			respond: {
				audio: "zhuandui",
				trigger: { target: "useCardToTargeted" },
				check(event, player) {
					return get.effect(player, event.card, event.player, player) < 0;
				},
				filter(event, player) {
					return event.card.name == "sha" && player.canCompare(event.player);
				},
				logTarget: "player",
				async content(event, trigger, player) {
					const result = await player.chooseToCompare(trigger.player).forResult();
					if (result.bool) {
						trigger.getParent().excluded.add(player);
					}
				},
			},
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (player._zhuandui_temp || tag !== "directHit_ai") {
					return false;
				}
				player._zhuandui_temp = true;
				var bool = (function () {
					if (arg.card.name != "sha" || get.attitude(player, arg.target) >= 0 || !arg.target.countCards("h")) {
						return false;
					}
					if (
						arg.target.countCards("h") == 1 &&
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
					) {
						return true;
					}
					return (
						player.countCards("h", function (card) {
							return card != arg.card && (!arg.card.cards || !arg.card.cards.includes(card)) && get.value(card) <= 4 && (get.number(card) >= 11 + arg.target.countCards("h") / 2 || get.suit(card, player) == "heart");
						}) > 0
					);
				})();
				delete player._zhuandui_temp;
				return bool;
			},
			effect: {
				target_use(card, player, target, current) {
					if (card.name == "sha" && current < 0) {
						return 0.7;
					}
				},
			},
		},
	}
```

### tianbian 名字:天辩
描述: 你拼点时，可以改为用牌堆顶的一张牌进行拼点；当你拼点的牌亮出后，若此牌花色为红桃，则此牌的点数视为K。
```js
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
						return !event.iwhile && get.suit(event.card1) == "heart"; //&&event.card1.vanishtag.includes('tianbian');
					} else {
						return get.suit(event.card2) == "heart"; //&&event.card2.vanishtag.includes('tianbian');
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
	}
```

## xuezong 名字:薛综 势力:wu

### funan 名字:复难
描述: 其他角色使用或打出牌响应你使用的牌时，你可令其获得你使用的牌（其本回合不能使用或打出这些牌），然后你获得其使用或打出的牌。
```js
funan: {
		audio: 2,
		trigger: { global: ["respond", "useCard"] },
		filter(event, player) {
			if (!event.respondTo) {
				return false;
			}
			if (event.player == player) {
				return false;
			}
			if (player != event.respondTo[0]) {
				return false;
			}
			if (!player.hasSkill("funan_jiexun")) {
				const cards = [];
				if (get.itemtype(event.respondTo[1]) == "card") {
					cards.push(event.respondTo[1]);
				} else if (event.respondTo[1].cards) {
					cards.addArray(event.respondTo[1].cards);
				}
				return cards.filterInD("od").length > 0;
			} else {
				return event.cards.filterInD("od").length > 0;
			}
		},
		check(event, player) {
			if (player.hasSkill("funan_jiexun") || get.attitude(player, event.player) > 0) {
				return true;
			}
			let cards = [];
			if (get.itemtype(event.respondTo[1]) == "card") {
				cards.push(event.respondTo[1]);
			} else if (event.respondTo[1].cards) {
				cards.addArray(event.respondTo[1].cards);
			}
			return (
				event.cards.filterInD("od").reduce((acc, card) => {
					return acc + get.value(card);
				}, 0) -
				cards.filterInD("od").reduce((acc, card) => {
					return acc + get.value(card);
				})
			);
		},
		logTarget: "player",
		async content(event, trigger, player) {
			if (!player.hasSkill("funan_jiexun")) {
				let cards = [];
				if (get.itemtype(trigger.respondTo[1]) == "card") {
					cards.push(trigger.respondTo[1]);
				} else if (trigger.respondTo[1].cards) {
					cards.addArray(trigger.respondTo[1].cards);
				}
				cards = cards.filterInD("od");
				trigger.player.addTempSkill("funan_use");
				await trigger.player.gain({
					cards,
					animate: "gain2",
					log: true,
					gaintag: ["funan"],
				});
			}

			const cards = trigger.cards.filterInD("od");
			await player.gain({
				cards,
				animate: "gain2",
				log: true,
			});
		},
		subSkill: {
			jiexun: {
				charlotte: true,
				mark: true,
				marktext: "复",
				intro: {
					content: "你发动“复难”时，无须令其他角色获得你使用的牌",
				},
			},
			use: {
				onremove(player) {
					player.removeGaintag("funan");
				},
				charlotte: true,
				mod: {
					cardEnabled2(card, player) {
						if (get.itemtype(card) == "card" && card.hasGaintag("funan")) {
							return false;
						}
					},
				},
			},
		},
	}
```

### xinjiexun 名字:诫训
描述: 结束阶段，你可令一名其他角色摸等同于场上方块牌数的牌，然后弃置X张牌（X为此前该技能发动过的次数）。若有角色因此法弃置了所有牌，则你将X归零，然后你发动〖复难〗时，无须令对方获得你使用的牌。
```js
xinjiexun: {
		audio: "jiexun",
		trigger: { player: "phaseJieshuBegin" },
		onremove: true,
		async cost(event, trigger, player) {
			const num1 = game
				.filterPlayer()
				.map(current => current.countCards("ej", { suit: "diamond" }))
				.reduce((a, b) => a + b, 0);
			const num2 = player.countMark("xinjiexun");

			let prompt = `令目标摸${get.cnNumber(num1)}张牌`;
			if (num2 > 0) {
				prompt = `${prompt}，然后弃置${get.cnNumber(num2)}张牌`;
			}

			event.result = await player
				.chooseTarget({
					prompt: get.prompt("xinjiexun"),
					prompt2: prompt,
					filterTarget(card, player, target) {
						return target !== player;
					},
					ai(target) {
						const { player, coeff } = get.event();
						return coeff * get.attitude(player, target);
					},
				})
				.set("coeff", num1 >= num2 ? 1 : -1)
				.forResult();

			event.result.cost_data = {
				num1,
				num2,
			};
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			const { num1, num2 } = event.cost_data;
			if (num1) {
				await target.draw(num1);
			}
			player.addMark("xinjiexun", 1, false);

			if (num2) {
				const result = await target
					.chooseToDiscard({
						selectCard: num2,
						position: "he",
						forced: true,
					})
					.forResult();

				if (result?.cards?.length > 0 && result.autochoose && result.cards?.length === result.rawcards?.length) {
					player.clearMark("xinjiexun", false);
					player.addSkill("funan_jiexun");
				}
			}
		},
		intro: { content: "已经发动过了#次" },
	}
```

## old_huaxiong 名字:将华雄 势力:qun

### shiyong 名字:恃勇
描述: 锁定技，当你受到一次红色【杀】或【酒】【杀】造成的伤害后，须减1点体力上限。
```js
shiyong: {
		audio: 2,
		trigger: { player: "damageEnd" },
		forced: true,
		check() {
			return false;
		},
		filter(event, player) {
			return event.card && event.card.name == "sha" && (get.color(event.card) == "red" || event.getParent(2).jiu == true);
		},
		async content(event, trigger, player) {
			await player.loseMaxHp();
		},
		ai: {
			neg: true,
		},
	}
```

## yujin 名字:于禁 势力:wei

### rezhenjun 名字:镇军
描述: 准备阶段，你可以弃置一名角色的X张牌（X为其手牌数和体力值之差且至少为1），然后选择一项：1.你弃置X张牌；2.其摸X张牌。（X为其弃置的牌中非装备牌的数量）
```js
rezhenjun: {
		audio: ["jieyue", 2],
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.countCards("h") > 0;
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("rezhenjun"), (card, player, target) => {
					return target.countCards("he");
				})
				.set("ai", target => {
					const player = get.player();
					return -get.attitude(player, target) * (target.countCards("e") + 1);
				})
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			const num = Math.max(target.countCards("h") - target.hp, 1);

			let result = await player
				.discardPlayerCard({
					target,
					selectButton: num,
					forced: true,
					allowChooseAll: true,
				})
				.forResult();
			if (!result.bool || !result.cards?.length) {
				return;
			}

			let num2 = 0;
			for (const card of result.cards) {
				if (get.type(card) !== "equip") {
					num2++;
				}
			}

			if (num2 <= 0) {
				return;
			}

			const prompt = `弃置${get.cnNumber(num2)}张牌，或令${get.translation(target)}摸${get.cnNumber(num2)}张牌`;
			result = await player
				.chooseToDiscard({
					prompt,
					selectCard: num2,
					position: "he",
					allowChooseAll: true,
					ai(card) {
						return 5 - get.value(card);
					},
				})
				.forResult();
			if (!result.bool) {
				await target.draw(num2);
			}
		},
	}
```

