# standard merged reference

## std_yuejin 名字:标乐进 势力:wei

### stdxiaoguo 名字:骁果
描述: 其他角色的结束阶段开始时，你可以弃置一张基本牌，令该角色选择一项：1.弃置一张装备牌；2.受到你对其造成的1点伤害。
```js
stdxiaoguo: {
		audio: "xiaoguo",
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return (
				event.player.isIn() &&
				event.player !== player &&
				player.hasCards("h", card => {
					if (_status.connectMode) {
						return true;
					}
					return get.type(card) === "basic" && lib.filter.cardDiscardable(card, player);
				})
			);
		},
		async cost(event, trigger, player) {
			const target = trigger.player;

			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt(event.skill),
					filterCard(card, player) {
						return get.type(card) === "basic";
					},
					chooseonly: true,
					ai(card) {
						return get.event().eff - get.useful(card);
					},
				})
				.set(
					"eff",
					(() => {
						if (target.hasSkillTag("noe")) {
							return get.attitude(_status.event.player, target);
						}
						return get.damageEffect(target, player, _status.event.player);
					})()
				)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const target = trigger.player;
			await player.discard({
				cards: event.cards,
				discarder: player,
			});
			const { bool } = await target
				.chooseToDiscard({
					prompt: "弃置一张装备牌，或受到1点伤害",
					filterCard: get.filter({ type: "equip" }),
					position: "he",
					ai(card) {
						if (get.event().damage > 0) {
							return 0;
						}
						if (get.event().noe) {
							return 12 - get.value(card);
						}
						return -get.event().damage - get.value(card);
					}
				})
				.set("damage", get.damageEffect(target, player, target))
				.set("noe", target.hasSkillTag("noe"))
				.forResult();
			if (!bool) {
				await target.damage();
			}
		},
	}
```

## old_re_lidian 名字:李典 势力:wei

### xunxun
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### wangxi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## ganfuren 名字:标甘夫人 势力:shu

### stdshushen 名字:淑慎
描述: 当你回复1点体力时，你可以令一名其他角色摸一张牌（若其没有手牌则改为摸两张牌）。
```js
stdshushen: {
		audio: "shushen",
		trigger: { player: "recoverEnd" },
		getIndex(event) {
			return event.num || 1;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: lib.filter.notMe,
					ai(target) {
						return get.attitude(get.player(), target)
					}
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await target.draw(target.hasCards("h") ? 1 : 2);
		},
		ai: { threaten: 0.8, expose: 0.1 },
	}
```

### shenzhi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## std_panfeng 名字:标潘凤 势力:qun

### stdkuangfu 名字:狂斧
描述: 锁定技。出牌阶段限一次。当你使用【杀】对其他角色造成伤害后，若其体力值：小于你，你摸两张牌；不小于你，你失去1点体力。
```js
stdkuangfu: {
		audio: "xinkuangfu",
		trigger: { source: "damageSource" },
		forced: true,
		filter(event, player) {
			if (player.hasSkill("stdkuangfu_used")) {
				return false;
			}
			return player.isPhaseUsing() && event.card && event.card.name === "sha" && event.player !== player && event.player.isIn();
		},
		async content(event, trigger, player) {
			player.addTempSkill("stdkuangfu_used", "phaseChange");
			if (trigger.player.hp < player.hp) {
				await player.draw(2);
			} else {
				await player.loseHp();
			}
		},
		ai: {
			halfneg: true,
		},
		subSkill: {
			used: {
				charlotte: true,
			},
		},
	}
```

## caocao 名字:曹操 势力:wei

### jianxiong 名字:奸雄
描述: 当你受到伤害后，你可以获得对你造成伤害的牌。
```js
jianxiong: {
		audio: 2,
		audioname2: { caoying: "lingren_jianxiong" },
		preHidden: true,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return get.itemtype(event.cards) === "cards" && get.position(event.cards[0], true) === "o";
		},
		async content(event, trigger, player) {
			player.gain({
				cards: trigger.cards,
				animate: "gain2",
			});
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return [1, -1];
					}
					if (get.tag(card, "damage")) {
						return [1, 0.55];
					}
				},
			},
		},
	}
```

### hujia 名字:护驾
描述: 主公技，当你需要使用或打出一张【闪】时，你可以令其他魏势力角色选择是否打出一张【闪】。若有角色响应，则你视为使用或打出了一张【闪】。
```js
hujia: {
		audio: 2,
		audioname: ["re_caocao"],
		audioname2: {
			pe_jun_caocao: "sbhujia",
		},
		zhuSkill: true,
		trigger: { player: ["chooseToRespondBefore", "chooseToUseBefore"] },
		filter(event, player) {
			if (event.responded) {
				return false;
			}
			if (player.storage.hujiaing) {
				return false;
			}
			if (!player.hasZhuSkill("hujia")) {
				return false;
			}
			if (!event.filterCard({ name: "shan", isCard: true }, player, event)) {
				return false;
			}
			return game.hasPlayer(current => current !== player && current.group === "wei");
		},
		check(event, player) {
			if (get.damageEffect(player, event.player, player) >= 0) {
				return false;
			}
			return true;
		},
		async content(event, trigger, player) {
			let current = player.next;
			while (true) {
				event.current = current;
				if (current === player) {
					return;
				}

				let bool = false;
				if (current.group === "wei") {
					if ((current === game.me && !_status.auto) || get.attitude(current, player) > 2 || current.isOnline()) {
						player.storage.hujiaing = true;
						const next = current.chooseToRespond({
							prompt: `是否替${get.translation(player)}打出一张闪？`,
							filterCard: get.filter({ name: "shan" }),
							ai() {
								const event = get.event();
								return get.attitude(event.player, event.source) - 2;
							}
						});
						next.set("skillwarn", `替${get.translation(player)}打出一张闪`);
						next.autochoose = lib.filter.autoRespondShan;
						next.set("source", player);
						bool = !!(await next.forResult()).bool;
					}
				}
				player.storage.hujiaing = false;
				if (bool) {
					trigger.result = { bool: true, card: { name: "shan", isCard: true } };
					trigger.responded = true;
					trigger.animate = false;
					if (typeof current.ai.shown === "number" && current.ai.shown < 0.95) {
						current.ai.shown += 0.3;
						if (current.ai.shown > 0.95) {
							current.ai.shown = 0.95;
						}
					}
					return;
				} else {
					current = current.next;
				}
			}
		},
		ai: {
			respondShan: true,
			skillTagFilter(player) {
				if (player.storage.hujiaing) {
					return false;
				}
				if (!player.hasZhuSkill("hujia")) {
					return false;
				}
				return game.hasPlayer(current => current != player && current.group == "wei");
			},
		},
	}
```

## simayi 名字:司马懿 势力:wei

### fankui 名字:反馈
描述: 当你受到伤害后，你可以获得伤害来源的一张牌。
```js
fankui: {
		audio: 2,
		trigger: { player: "damageEnd" },
		logTarget: "source",
		preHidden: true,
		filter(event, player) {
			return event.num > 0 && event.source?.hasGainableCards(player, event.source !== player ? "he" : "e");
		},
		async content(event, trigger, player) {
			player.gainPlayerCard({
				target: trigger.source,
				position: trigger.source !== player ? "he" : "e",
				forced: true,
			});
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

### guicai 名字:鬼才
描述: 一名角色的判定牌生效前，你可以打出一张手牌代替之。
```js
guicai: {
		audio: 2,
		audioname2: { new_simayi: "reguicai_new_simayi" },
		trigger: { global: "judge" },
		preHidden: true,
		filter(event, player) {
			return player.hasCards(get.mode() === "guozhan" ? "hes" : "hs");
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
					position: get.mode() === "guozhan" ? "hes" : "hs",
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
					}
				})
				.set("judging", trigger.player.judging[0])
				.setHiddenSkill(event.skill)
				.forResult();
		},
		//技能的logSkill跟着打出牌走 不进行logSkill
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
	}
```

## xiahoudun 名字:夏侯惇 势力:wei

### ganglie 名字:刚烈
描述: 当你受到伤害后，你可以判定。若结果不为红桃，则伤害来源须弃置两张手牌，否则其受到来自你的1点伤害。
```js
ganglie: {
		audio: 2,
		trigger: { player: "damageEnd" },
		check(event, player) {
			if (!event.source?.isIn()) {
				return Math.random() < 0.5;
			}
			return get.attitude(player, event.source) <= 0;
		},
		prompt2(event, player) {
			let str = "你可以判定。";
			if (event.source?.isIn()) {
				str += `若结果不为红桃，则${get.translation(event.source)}须弃置两张手牌，否则其受到来自你的1点伤害。`;
			}
			return str;
		},
		async content(event, trigger, player) {
			const { source } = trigger;
			let result = await player
				.judge({
					judge(card) {
						if (get.suit(card) === "heart") {
							return -2;
						}
						return 2;
					},
					judge2(result) {
						return result.bool;
					},
				})
				.forResult();
			if (!result?.bool || !source?.isIn()) {
				return;
			}
			result =
				source.countDiscardableCards(source, "h") < 2
					? { bool: false }
					: await source
							.chooseToDiscard({
								prompt: `弃置两张手牌，否则${get.translation(player)}对你造成1点伤害`,
								selectCard: 2,
								ai(card) {
									if (card.name === "tao") {
										return -10;
									}
									if (card.name === "jiu" && get.player().hp === 1) {
										return -10;
									}
									return get.unuseful(card) + 2.5 * (5 - (get.owner(card)?.hp ?? 0));
								},
							})
							.forResult();
			if (!result?.bool) {
				await source.damage();
			}
		},
		ai: {
			maixie_defend: true,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return [1, -1];
					}
					return 0.8;
					// if(get.tag(card,'damage')&&get.damageEffect(target,player,player)>0) return [1,0,0,-1.5];
				},
			},
		},
	}
```

## zhangliao 名字:张辽 势力:wei

### tuxi 名字:突袭
描述: 摸牌阶段，你可以改为获得至多两名其他角色的各一张手牌。
```js
tuxi: {
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return !event.numFixed;
		},
		async cost(event, trigger, player) {
			let num = game.countPlayer(current => current !== player && get.attitude(player, current) <= 0 && current.hasCards("h"));
			let check = num >= 2;
			event.result = await player
				.chooseTarget({
					prompt: get.prompt(event.skill),
					prompt2: "获得其他一至两名角色的各一张手牌",
					filterTarget(card, player, target) {
						return player !== target && target.hasCards("h");
					},
					selectTarget: [1, 2],
					ai(target) {
						const { player, aicheck } = get.event();
						if (!aicheck) {
							return 0;
						}
						const att = get.attitude(player, target);
						if (target.hasSkill("tuntian")) {
							return att / 10;
						}
						return 1 - att;
					}
				})
				.set("aicheck", check)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.gainMultiple(event.targets);
			trigger.changeToZero();
			await game.delay();
		},
		ai: {
			threaten: 2,
			expose: 0.3,
		},
	}
```

## xuzhu 名字:许褚 势力:wei

### luoyi 名字:裸衣
描述: 摸牌阶段，你可以少摸一张牌。若如此做，当你本回合内使用【杀】或【决斗】造成伤害时，此伤害+1。
```js
luoyi: {
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		check(event, player) {
			if (player.skipList.includes("phaseUse") || player.countCards("h") < 3) {
				return false;
			}
			if (!player.hasSha()) {
				return false;
			}
			return game.hasPlayer(current => get.attitude(player, current) < 0 && player.canUse("sha", current));
		},
		preHidden: true,
		filter(event, player) {
			return !event.numFixed && event.num > 0;
		},
		async content(event, trigger, player) {
			player.addTempSkill("luoyi2", "phaseJieshuBegin");
			trigger.num--;
		},
	}
```

## guojia 名字:郭嘉 势力:wei

### tiandu 名字:天妒
描述: 当你的判定牌生效后，你可以获得之。
```js
tiandu: {
		audio: 2,
		audioname: ["re_guojia", "xizhicai", "gz_nagisa"],
		trigger: { player: "judgeEnd" },
		preHidden: true,
		frequent(event) {
			//if(get.mode()=='guozhan') return false;
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
	}
```

### yiji 名字:遗计
描述: 当你受到1点伤害后，你可以观看牌堆顶的两张牌，然后将其分配给任意角色。
```js
yiji: {
		audio: 2,
		trigger: { player: "damageEnd" },
		frequent: true,
		filter(event) {
			return event.num > 0;
		},
		getIndex(event, player, triggername) {
			return event.num;
		},
		async content(event, trigger, player) {
			const cards = get.cards(2);
			await game.cardsGotoOrdering(cards);
			if (_status.connectMode) {
				game.broadcastAll(() => {
					_status.noclearcountdown = true;
				});
			}
			event.given_map = {};
			if (!cards.length) {
				return;
			}

			do {
				const { bool, links } =
					cards.length == 1
						? { links: cards.slice(0), bool: true }
						: await player
								.chooseCardButton({
									prompt: "遗计：请选择要分配的牌",
									cards,
									select: [1, cards.length],
									forced: true,
									ai() {
										if (ui.selected.buttons.length === 0) {
											return 1;
										}
										return 0;
									},
								})
								.forResult();
				if (!bool || !links?.length) {
					return;
				}
				cards.removeArray(links);
				event.togive = links.slice(0);
				const { targets } = await player
					.chooseTarget({
						prompt: `选择一名角色获得${get.translation(links)}`,
						forced: true,
						ai(target) {
							const { player, enemy } = get.event();
							const att = get.attitude(player, target);
							if (enemy) {
								return -att;
							} else if (att > 0) {
								return att / (1 + target.countCards("h"));
							} else {
								return att / 100;
							}
						},
					})
					.set("enemy", get.value(event.togive[0], player, "raw") < 0)
					.forResult();
				if (targets?.length) {
					const id = targets[0].playerid;
					const map = event.given_map;
					if (id != null) {
						if (!map[id]) {
							map[id] = [];
						}
						map[id].addArray(event.togive);
					}
				}
			} while (cards.length > 0);
			if (_status.connectMode) {
				game.broadcastAll(() => {
					delete _status.noclearcountdown;
					game.stopCountChoose();
				});
			}
			const list = [];
			for (const i in event.given_map) {
				const source = (_status.connectMode ? lib.playerOL : game.playerMap)[i];
				player.line(source, "green");
				if (player !== source && (get.mode() !== "identity" || player.identity !== "nei")) {
					player.addExpose(0.2);
				}
				list.push([source, event.given_map[i]]);
			}
			await game
				.loseAsync({
					gain_list: list,
					giver: player,
					animate: "draw",
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
		},
	}
```

## zhenji 名字:甄宓 势力:wei

### luoshen 名字:洛神
描述: 准备阶段，你可以判定。若结果为黑色，你获得判定牌。你可重复此流程，直到出现红色的判定结果。
```js
luoshen: {
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
				if (get.mode() !== "guozhan" && !player.hasSkillTag("rejudge")) {
					judgeEvent.set("callback", async event => {
						if (event.judgeResult.color === "black" && get.position(event.card, true) === "o") {
							await player.gain({
								cards: [event.card],
								animate: "gain2",
							});
						}
					});
				} else {
					judgeEvent.set("callback", async event => {
						if (event.judgeResult.color === "black") {
							event.getParent().orderingCards.remove(event.card);
						}
					});
				}
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
	}
```

### qingguo 名字:倾国
描述: 你可以将一张黑色手牌当做【闪】使用或打出。
```js
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
		},
	}
```

## liubei 名字:刘备 势力:shu

### rende 名字:仁德
描述: 出牌阶段，你可以将任意张手牌交给其他角色。当你以此法于一回合内给出第二张牌时，你回复1点体力。
```js
rende: {
		audio: 2,
		enable: "phaseUse",
		filterCard: true,
		selectCard: [1, Infinity],
		allowChooseAll: true,
		discard: false,
		lose: false,
		delay: 0,
		filterTarget(card, player, target) {
			return player != target;
		},
		check(card) {
			if (ui.selected.cards.length > 1) {
				return 0;
			}
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
			// let num = 0;
			const evt2 = _status.event.getParent();
			const num = player
				.iterHistory("lose", evt => evt.getParent()?.skill === "rende" && evt.getParent(3) === evt2)
				.map(evt => evt.cards.length)
				.reduce((a, b) => a + b, 0);
			if (player.hp === player.maxHp || num > 1 || player.countCards("h") <= 1) {
				if (ui.selected.cards.length) {
					return -1;
				}
				const players = game.filterPlayer();
				for (const current of players) {
					if (current.hasSkill("haoshi") && !current.isTurnedOver() && !current.hasJudge("lebu") && get.attitude(player, current) >= 3 && get.attitude(current, player) >= 3) {
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
			const evt2 = event.getParent(3);
			const num = player
				.iterHistory("lose", evt => evt.getParent(2)?.name === "rende" && evt.getParent(5) === evt2)
				.map(evt => evt.cards.length)
				.reduce((a, b) => a + b, 0);
			await player.give(event.cards, event.target);
			if (num < 2 && num + event.cards.length > 1) {
				await player.recover();
			}
		},
		ai: {
			order(skill, player) {
				if (player == null) {
					return 0;
				}
				if (player.hp < player.maxHp && player.storage.rende < 2 && player.countCards("h") > 1) {
					return 10;
				}
				return 1;
			},
			result: {
				target(player, target) {
					if (target.hasSkillTag("nogain")) {
						return 0;
					}
					if (ui.selected.cards.length && ui.selected.cards[0].name == "du") {
						return target.hasSkillTag("nodu") ? 0 : -10;
					}
					if (target.hasJudge("lebu")) {
						return 0;
					}
					const nh = target.countCards("h");
					const np = player.countCards("h");
					if (player.hp == player.maxHp || player.storage.rende < 0 || player.countCards("h") <= 1) {
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
							const players = game.filterPlayer();
							for (let i = 0; i < players.length; i++) {
								if (players[i] != player && get.attitude(player, players[i]) > 0) {
									return 0;
								}
							}
						}
					}
				},
			},
			threaten: 0.8,
		},
	}
```

### jijiang 名字:激将
描述: 主公技，当你需要使用或打出【杀】时，你可以令其他蜀势力角色依次选择是否打出一张【杀】。若有角色响应，则你视为使用或打出了此【杀】。
```js
jijiang: {
		audio: "jijiang1",
		audioname: ["liushan", "re_liubei", "re_liushan", "ol_liushan"],
		audioname2: {
			pe_jun_liubei: "sbjijiang",
		},
		group: ["jijiang1"],
		zhuSkill: true,
		filter(event, player) {
			if (!player.hasZhuSkill("jijiang") || !game.hasPlayer(current => current !== player && current.group === "shu")) {
				return false;
			}
			return !event.jijiang && (event.type !== "phase" || !player.hasSkill("jijiang3"));
		},
		enable: ["chooseToUse", "chooseToRespond"],
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
				if (!player.hasZhuSkill("jijiang") || !game.hasPlayer(current => current != player && current.group == "shu")) {
					return false;
				}
			},
		},
	}
```

## guanyu 名字:关羽 势力:shu

### wusheng 名字:武圣
描述: 你可以将一张红色牌当做【杀】使用或打出。
```js
wusheng: {
		audio: 2,
		audioname2: {
			old_guanzhang: "wusheng_old_guanzhang",
			old_guanyu: "wusheng_re_guanyu",
			guanzhang: "wusheng_guanzhang",
			guansuo: "wusheng_guansuo",
		},
		audioname: ["re_guanyu", "jsp_guanyu", "re_guanzhang", "dc_jsp_guanyu"],
		enable: ["chooseToRespond", "chooseToUse"],
		filterCard(card, player) {
			if (get.zhu(player, "shouyue")) {
				return true;
			}
			return get.color(card) === "red";
		},
		position: "hes",
		viewAs: { name: "sha" },
		viewAsFilter(player) {
			if (get.zhu(player, "shouyue")) {
				if (!player.hasCards("hes")) {
					return false;
				}
			} else {
				if (!player.hasCards("hes", { color: "red" })) {
					return false;
				}
			}
		},
		prompt: "将一张红色牌当杀使用或打出",
		check(card) {
			const val = get.value(card);
			if (get.event().name === "chooseToRespond") {
				return 1 / Math.max(0.1, val);
			}
			return 5 - val;
		},
		ai: {
			skillTagFilter(player) {
				if (get.zhu(player, "shouyue")) {
					if (!player.hasCards("hes")) {
						return false;
					}
				} else {
					if (!player.hasCards("hes", { color: "red" })) {
						return false;
					}
				}
			},
			respondSha: true,
		},
	}
```

## zhangfei 名字:张飞 势力:shu

### paoxiao 名字:咆哮
描述: 锁定技，出牌阶段，你使用【杀】没有数量限制。
```js
paoxiao: {
		audio: 2,
		firstDo: true,
		audioname: ["re_zhangfei", "xiahouba"],
		audioname2: {
			old_guanzhang: "paoxiao_old_guanzhang",
			guanzhang: "paoxiao_guanzhang",
		},
		trigger: { player: "useCard1" },
		forced: true,
		filter(event, player) {
			return !event.audioed && event.card.name === "sha" && player.countUsed("sha", true) > 1 && event.getParent()?.type === "phase";
		},
		async content(event, trigger, player) {
			trigger.audioed = true;
		},
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return Infinity;
				}
			},
		},
		ai: {
			unequip: true,
			skillTagFilter(player, tag, arg) {
				if (!get.zhu(player, "shouyue")) {
					return false;
				}
				if (arg && arg.name == "sha") {
					return true;
				}
				return false;
			},
		},
	}
```

## zhugeliang 名字:诸葛亮 势力:shu

### guanxing 名字:观星
描述: 准备阶段，你可以观看牌堆顶的X张牌，并将其以任意顺序置于牌堆顶或牌堆底。（X为存活角色数且至多为5）
```js
guanxing: {
		audio: 2,
		audioname: ["jiangwei", "re_jiangwei", "re_zhugeliang", "ol_jiangwei"],
		trigger: { player: "phaseZhunbeiBegin" },
		frequent: true,
		preHidden: true,
		async content(event, trigger, player) {
			const num = player.hasSkill("yizhi") && player.hasSkill("guanxing") ? 5 : Math.min(5, game.countPlayer());
			const result = await player.chooseToGuanxing(num).set("prompt", "观星：点击或拖动将牌移动到牌堆顶或牌堆底").forResult();
			if (!result.bool || !result.moved[0].length) {
				player.addTempSkill("guanxing_fail");
			}
		},
		ai: {
			threaten: 1.2,
			guanxing: true,
		},
	}
```

### kongcheng 名字:空城
描述: 锁定技，当你没有手牌时，你不能成为【杀】或【决斗】的目标。
```js
kongcheng: {
		mod: {
			targetEnabled(card, player, target, now) {
				if (!target.hasCards("h")) {
					if (card.name === "sha" || card.name === "juedou") {
						return false;
					}
				}
			},
		},
		group: "kongcheng1",
		audio: "kongcheng1",
		audioname: ["re_zhugeliang"],
		ai: {
			noh: true,
			skillTagFilter(player, tag) {
				if (tag === "noh") {
					if (player.countCards("h") != 1) {
						return false;
					}
				}
			},
		},
	}
```

## zhaoyun 名字:赵云 势力:shu

### longdan 名字:龙胆
描述: 你可以将【杀】当做【闪】，或将【闪】当做【杀】使用或打出。
```js
longdan: {
		audio: "longdan_sha",
		audioname: ["re_zhaoyun"],
		audioname2: { old_zhaoyun: "longdan_sha_re_zhaoyun" },
		group: ["longdan_sha", "longdan_shan", "longdan_draw"],
		subSkill: {
			draw: {
				trigger: { player: ["useCard", "respond"] },
				forced: true,
				popup: false,
				filter(event, player) {
					if (!get.zhu(player, "shouyue")) {
						return false;
					}
					return event.skill === "longdan_sha" || event.skill === "longdan_shan";
				},
				async content(event, trigger, player) {
					await player.draw();
					player.storage.fanghun2++;
				},
			},
			sha: {
				audio: 2,
				audioname: ["re_zhaoyun"],
				audioname2: { old_zhaoyun: "longdan_sha_re_zhaoyun" },
				enable: ["chooseToUse", "chooseToRespond"],
				filterCard: { name: "shan" },
				viewAs: { name: "sha" },
				viewAsFilter(player) {
					if (!player.hasCards("hs", "shan")) {
						return false;
					}
				},
				position: "hs",
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
						if (!player.hasCards("hs", "shan")) {
							return false;
						}
					},
					order() {
						return get.order({ name: "sha" }) + 0.1;
					},
					useful: -1,
					value: -1,
				},
			},
			shan: {
				audio: "longdan_sha",
				audioname: ["re_zhaoyun"],
				audioname2: { old_zhaoyun: "longdan_sha_re_zhaoyun" },
				enable: ["chooseToRespond", "chooseToUse"],
				filterCard: { name: "sha" },
				viewAs: { name: "shan" },
				prompt: "将一张杀当闪使用或打出",
				check() {
					return 1;
				},
				position: "hs",
				viewAsFilter(player) {
					if (!player.hasCards("hs", "sha")) {
						return false;
					}
				},
				ai: {
					respondShan: true,
					skillTagFilter(player) {
						if (!player.hasCards("hs", "sha")) {
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
					order: 4,
					useful: -1,
					value: -1,
				},
			},
		},
	}
```

## machao 名字:马超 势力:shu

### mashu 名字:马术
描述: 锁定技，你计算与其他角色的距离时-1。
```js
mashu: {
		mod: {
			globalFrom(from, to, distance) {
				return distance - 1;
			},
		},
	}
```

### tieji 名字:铁骑
描述: 当你使用【杀】指定目标后，你可以进行判定。若结果为红色，则此【杀】不可被闪避。
```js
tieji: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		check(event, player) {
			return get.attitude(player, event.target) <= 0;
		},
		filter(event, player) {
			return event.card.name === "sha";
		},
		logTarget: "target",
		preHidden: true,
		async content(event, trigger, player) {
			const { bool } = await player
				.judge({
					judge(card) {
						if (get.zhu(get.player(), "shouyue")) {
							if (get.suit(card) !== "spade") {
								return 2;
							}
						} else {
							if (get.color(card) === "red") {
								return 2;
							}
						}
						return -0.5;
					},
					judge2(result) {
						return result.bool;
					},
				})
				.forResult();
			if (bool) {
				trigger.getParent()?.directHit.add(trigger.target);
			}
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (get.attitude(player, arg.target) > 0 || arg.card.name !== "sha" || !ui.cardPile.firstChild || get.color(ui.cardPile.firstChild, player) !== "red") {
					return false;
				}
			},
		},
	}
```

## huangyueying 名字:黄月英 势力:shu

### jizhi 名字:集智
描述: 当你使用普通锦囊牌时，你可以摸一张牌。
```js
jizhi: {
		audio: 2,
		audioname: ["jianyong"],
		audioname2: {
			new_simayi: "rejizhi_new_simayi",
		},
		trigger: { player: "useCard" },
		frequent: true,
		preHidden: true,
		filter(event) {
			return get.type(event.card) === "trick";
		},
		async content(event, trigger, player) {
			await player.draw({ nodelay: true });
		},
		ai: {
			threaten: 1.4,
			noautowuxie: true,
		},
	}
```

### qicai 名字:奇才
描述: 锁定技，你使用锦囊牌无距离限制。
```js
qicai: {
		mod: {
			targetInRange(card, player, target, now) {
				if (["trick", "delay"].includes(get.type(card))) {
					return true;
				}
			},
		},
	}
```

## sunquan 名字:孙权 势力:wu

### zhiheng 名字:制衡
描述: 出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌。
```js
zhiheng: {
		audio: 2,
		audioname: ["gz_jun_sunquan"],
		audioname2: {
			new_simayi: "rezhiheng_new_simayi",
		},
		mod: {
			aiOrder(player, card, num) {
				if (num <= 0 || get.itemtype(card) !== "card" || get.type(card) !== "equip") {
					return num;
				}
				const eq = player.getEquip(get.subtype(card));
				if (eq != null && get.equipValue(card) - get.equipValue(eq) < Math.max(1.2, 6 - player.hp)) {
					return 0;
				}
			},
		},
		locked: false,
		enable: "phaseUse",
		usable: 1,
		position: "he",
		filterCard: true,
		selectCard: [1, Infinity],
		allowChooseAll: true,
		prompt: "弃置任意张牌并摸等量的牌",
		check(card) {
			let player = get.player();
			if (get.position(card) === "e") {
				let subs = get.subtypes(card);
				if (subs.includes("equip2") || subs.includes("equip3")) {
					return player.getHp() - get.value(card);
				}
			}
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			await player.draw(event.cards.length);
		},
		ai: {
			order: 1,
			result: {
				player: 1,
			},
			threaten: 1.5,
		},
	}
```

### jiuyuan 名字:救援
描述: 主公技，锁定技，其他吴势力角色对你使用的【桃】的回复值+1。
```js
jiuyuan: {
		audio: 2,
		trigger: { target: "taoBegin" },
		zhuSkill: true,
		forced: true,
		filter(event, player) {
			if (event.player === player) {
				return false;
			}
			if (!player.hasZhuSkill("jiuyuan")) {
				return false;
			}
			if (event.player.group !== "wu") {
				return false;
			}
			return true;
		},
		async content(event, trigger, player) {
			trigger.baseDamage++;
		},
	}
```

## ganning 名字:甘宁 势力:wu

### qixi 名字:奇袭
描述: 你可以将一张黑色牌当做【过河拆桥】使用。
```js
qixi: {
		audio: 2,
		audioname: ["re_ganning"],
		audioname2: { re_heqi: "duanbing_heqi" },
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
	}
```

## lvmeng 名字:吕蒙 势力:wu

### keji 名字:克己
描述: 弃牌阶段开始时，若你于本回合的出牌阶段内没有使用或打出过【杀】，则你可以跳过此阶段。
```js
keji: {
		audio: 2,
		audioname: ["re_lvmeng", "sp_lvmeng"],
		trigger: { player: "phaseDiscardBefore" },
		frequent(event, player) {
			return player.needsToDiscard();
		},
		filter(event, player) {
			if (player.getHistory("skipped").includes("phaseUse")) {
				return true;
			}
			const history = player.getHistory("useCard").concat(player.getHistory("respond"));
			for (const evt of history) {
				if (evt.card.name === "sha" && evt.isPhaseUsing()) {
					return false;
				}
			}
			return true;
		},
		async content(event, trigger, player) {
			trigger.cancel();
		},
	}
```

## huanggai 名字:黄盖 势力:wu

### kurou 名字:苦肉
描述: 出牌阶段，你可以失去1点体力，然后摸两张牌。
```js
kurou: {
		audio: 2,
		enable: "phaseUse",
		prompt: "失去1点体力并摸两张牌",
		delay: false,
		manualConfirm: true,
		async content(event, trigger, player) {
			player.loseHp(1);
			player.draw(2, "nodelay");
		},
		ai: {
			basic: {
				order: 1,
			},
			result: {
				player(player) {
					if (player.needsToDiscard(3) && !player.hasValueTarget({ name: "sha" }, false)) {
						return -1;
					}
					if (player.countCards("h") >= player.hp - 1) {
						return -1;
					}
					if (player.hp < 3) {
						return -1;
					}
					return 1;
				},
			},
		},
	}
```

## zhouyu 名字:周瑜 势力:wu

### yingzi 名字:英姿
描述: 摸牌阶段，你可以多摸一张牌。
```js
yingzi: {
		audio: 2,
		audioname: ["sp_lvmeng"],
		trigger: { player: "phaseDrawBegin2" },
		frequent: true,
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
		ai: {
			threaten: 1.3,
		},
	}
```

### fanjian 名字:反间
描述: 出牌阶段限一次。你可以令一名角色选择一种花色，然后其获得你的一张手牌。若其以此法选择的花色与其得到的牌花色不同，则你对其造成1点伤害。
```js
fanjian: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasCards("h");
		},
		filterTarget(card, player, target) {
			return player !== target;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const { control } = await target
				.chooseControl({
					controls: ["heart2", "diamond2", "club2", "spade2"],
					ai() {
						switch (Math.floor(Math.random() * 6)) {
							case 0:
								return "heart2";
							case 1:
							case 4:
							case 5:
								return "diamond2";
							case 2:
								return "club2";
							case 3:
								return "spade2";
						}
					}
				})
				.forResult();
			game.log(target, `选择了${get.translation(control)}`);
			event.choice = control;
			target.chat(`我选${get.translation(event.choice)}`);
			const { bool, cards } = await target
				.gainPlayerCard({
					target: player,
					position: "h",
					forced: true,
				})
				.forResult();
			if (bool && cards?.length && get.suit(cards[0], player) + "2" !== event.choice) {
				await target.damage({ nocard: true });
			}
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					const eff = get.damageEffect(target, player);
					if (eff >= 0) {
						return 1 + eff;
					}
					let value = 0,
						i;
					const cards = player.getCards("h");
					for (i = 0; i < cards.length; i++) {
						value += get.value(cards[i]);
					}
					value /= player.countCards("h");
					if (target.hp == 1) {
						return Math.min(0, value - 7);
					}
					return Math.min(0, value - 5);
				},
			},
		},
	}
```

## daqiao 名字:大乔 势力:wu

### guose 名字:国色
描述: 你可以将一张方片牌当做【乐不思蜀】使用。
```js
guose: {
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
	}
```

### liuli 名字:流离
描述: 当你成为【杀】的目标时，你可以弃置一张牌并将此【杀】转移给攻击范围内的一名其他角色（不能是此【杀】的使用者）。
```js
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
				throw new ReferenceError("找不到触发【流离】的使用牌事件")
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
	}
```

## luxun 名字:陆逊 势力:wu

### qianxun 名字:谦逊
描述: 锁定技，你不能成为【顺手牵羊】和【乐不思蜀】的目标。
```js
qianxun: {
		mod: {
			targetEnabled(card, player, target, now) {
				if (card.name === "shunshou" || card.name === "lebu") {
					return false;
				}
			},
		},
		audio: 2,
	}
```

### lianying 名字:连营
描述: 当你失去最后的手牌时，你可以摸一张牌。
```js
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
			skillTagFilter(player, tag) {
				if (player.countCards("h") !== 1) {
					return false;
				}
			},
		},
	}
```

## sunshangxiang 名字:孙尚香 势力:wu

### xiaoji 名字:枭姬
描述: 当你失去一张装备区内的牌后，你可以摸两张牌。
```js
xiaoji: {
		audio: 2,
		audioname: ["sp_sunshangxiang", "re_sunshangxiang"],
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
		ai: {
			noe: true,
			reverseEquip: true,
			effect: {
				target(card, player, target, current) {
					if (get.type(card) == "equip" && !get.cardtag(card, "gifts")) {
						return [1, 3];
					}
				},
			},
		},
	}
```

### jieyin 名字:结姻
描述: 出牌阶段限一次，你可以弃置两张手牌并选择一名已经受伤的男性角色。你与其各回复1点体力。
```js
jieyin: {
		audio: 2,
		enable: "phaseUse",
		filterCard: true,
		usable: 1,
		selectCard: 2,
		check(card) {
			const player = get.owner(card);
			if (player == null) {
				return 0;
			}
			if (player.countCards("h") > player.hp) {
				return 8 - get.value(card);
			}
			if (player.hp < player.maxHp) {
				return 6 - get.value(card);
			}
			return 4 - get.value(card);
		},
		filterTarget(card, player, target) {
			if (!target.hasSex("male")) {
				return false;
			}
			if (target.hp >= target.maxHp) {
				return false;
			}
			if (target === player) {
				return false;
			}
			return true;
		},
		async content(event, trigger, player) {
			await player.recover();
			await event.target.recover();
		},
		ai: {
			order: 5.5,
			result: {
				player(player) {
					if (player.hp < player.maxHp) {
						return 4;
					}
					if (player.countCards("h") > player.hp) {
						return 0;
					}
					return -1;
				},
				target: 4,
			},
			threaten: 2,
		},
	}
```

## huatuo 名字:华佗 势力:qun

### qingnang 名字:青囊
描述: 出牌阶段限一次，你可以弃置一张手牌并令一名角色回复1点体力。
```js
qingnang: {
		audio: 2,
		enable: "phaseUse",
		filterCard: true,
		usable: 1,
		check(card) {
			return 9 - get.value(card);
		},
		filterTarget(card, player, target) {
			if (target.hp >= target.maxHp) {
				return false;
			}
			return true;
		},
		async content(event, trigger, player) {
			await event.target.recover();
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					if (target.hp === 1) {
						return 5;
					}
					if (player === target && player.countCards("h") > player.hp) {
						return 5;
					}
					return 2;
				},
			},
			threaten: 2,
		},
	}
```

### jijiu 名字:急救
描述: 你的回合外，你可以将一张红色牌当做【桃】使用。
```js
jijiu: {
		mod: {
			aiValue(player, card, num) {
				if (get.name(card) !== "tao" && get.color(card) !== "red") {
					return;
				}
				const cards = player.getCards("hs", card => get.name(card) === "tao" || get.color(card) === "red");
				cards.sort((a, b) => (get.name(a) === "tao" ? 1 : 2) - (get.name(b) === "tao" ? 1 : 2));
				const geti = () => {
					if (cards.includes(card)) {
						cards.indexOf(card);
					}
					return cards.length;
				};
				return Math.max(num, [6.5, 4, 3, 2][Math.min(geti(), 2)]);
			},
			aiUseful(...args) {
				return lib.skill.jijiu.mod?.aiValue?.(...args);
			},
		},
		locked: false,
		audio: 2,
		audioname: ["re_huatuo"],
		audioname2: { old_huatuo: "jijiu_re_huatuo" },
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
	}
```

## lvbu 名字:吕布 势力:qun

### wushuang 名字:无双
描述: 锁定技，①当你使用【杀】指定一名角色为目标后，其需使用两张【闪】才能抵消；②当你使用【决斗】指定其他角色为目标后，或成为其他角色使用【决斗】的目标后，其每次响应需打出两张【杀】。
```js
wushuang: {
		audio: 2,
		audioname: ["re_lvbu", "shen_lvbu", "lvlingqi", "mb_shen_lvbu"],
		audioname2: { sb_lvbu: "sbliyu_effect" },
		forced: true,
		locked: true,
		group: ["wushuang1", "wushuang2"],
		preHidden: ["wushuang1", "wushuang2"],
	}
```

## diaochan 名字:貂蝉 势力:qun

### lijian 名字:离间
描述: 出牌阶段限一次，你可以弃置一张牌，视为一名男性角色对另一名男性角色使用一张【决斗】（不可被【无懈可击】响应）。
```js
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
	}
```

### biyue 名字:闭月
描述: 结束阶段，你可以摸一张牌。
```js
biyue: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		preHidden: true,
		async content(event, trigger, player) {
			player.draw();
		},
	}
```

## huaxiong 名字:华雄 势力:qun

### yaowu 名字:耀武
描述: 锁定技，一名角色使用红色【杀】对你造成伤害时，该角色回复1点体力或摸一张牌。
```js
yaowu: {
		trigger: { player: "damageBegin3" },
		audio: 2,
		filter(event, player) {
			return event.card?.name === "sha" && get.color(event.card) === "red" && event.source?.isIn();
		},
		forced: true,
		check() {
			return false;
		},
		async content(event, trigger, player) {
			await trigger.source.chooseDrawRecover({ forced: true });
		},
		ai: {
			neg: true,
			effect: {
				target(card, player, target, current) {
					if (card.name === "sha" && get.color(card) === "red") {
						return [1, -2];
					}
				},
			},
		},
	}
```

## gongsunzan 名字:gongsunzan 势力:qun

### reyicong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## xf_yiji 名字:伊籍 势力:shu

### xinfu_jijie 名字:机捷
描述: 出牌阶段限一次。你可以观看牌堆底的一张牌，然后将其交给一名角色。
```js
xinfu_jijie: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		async content(event, trigger, player) {
			const card = get.bottomCards()[0];
			game.cardsGotoOrdering(card);
			event.card = card;
			const { bool, targets } = await player
				.chooseTarget({
					forced: true,
					ai(target) {
						let att = get.attitude(_status.event.player, target);
						if (_status.event.du) {
							if (target.hasSkillTag("nodu")) {
								return 0.5;
							}
							return -att;
						}
						if (att > 0) {
							if (_status.event.player != target) {
								att += 2;
							}
							return att + Math.max(0, 5 - target.countCards("h"));
						}
						return att;
					}
				})
				.set("du", event.card.name === "du")
				.set("createDialog", ["机捷：选择一名角色获得此牌", [card]])
				.forResult();
			if (bool && targets?.length) {
				const target = targets[0];
				player.line(target, "green");
				const gainEvent = target.gain({
					cards: [card],
					animate: "draw",
				});
				gainEvent.giver = player;
				await gainEvent;
			}
		},
		ai: {
			order: 7.2,
			result: {
				player: 1,
			},
		},
	}
```

### xinfu_jiyuan 名字:急援
描述: 当有角色进入濒死状态时，或你将牌交给一名其他角色后，你可以令该角色摸一张牌。
```js
xinfu_jiyuan: {
		trigger: {
			global: ["dying", "gainAfter", "loseAsyncAfter"],
		},
		audio: 2,
		getIndex(event, player) {
			if (event.name !== "loseAsync") {
				return [event.player];
			} else {
				return game.filterPlayer(current => current !== player && event.getg(current).length > 0).sortBySeat();
			}
		},
		filter(event, player, triggername, target) {
			if (!target?.isIn()) {
				return false;
			}
			if (event.name === "dying") {
				return true;
			}
			if (event.giver !== player) {
				return false;
			}
			if (event.name === "gain") {
				return event.player != player && event.getg(target).length > 0;
			}
			return game.hasPlayer(current => current != player && event.getg(current).length > 0);
		},
		logTarget(event, player, triggername, target) {
			return target;
		},
		check(event, player, triggername, target) {
			return get.attitude(player, target) > 0;
		},
		async content(event, trigger, player) {
			await event.targets[0].draw();
		},
	}
```

## re_yuanshu 名字:袁术 势力:qun

### rewangzun 名字:妄尊
描述: 锁定技，一名其他角色的准备阶段开始时，若其体力值大于你，你摸一张牌。然后若其身份为主公/主帅/君主/地主且明置，则你摸一张牌，且其本回合的手牌上限-1。
```js
rewangzun: {
		trigger: { global: "phaseZhunbeiBegin" },
		forced: true,
		audio: "wangzun",
		filter(event, player) {
			return event.player.hp > player.hp;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.draw();
			let zhu = false;
			const target = trigger.player;
			switch (get.mode()) {
				case "identity": {
					zhu = target.isZhu;
					break;
				}
				case "guozhan": {
					zhu = get.is.jun(target);
					break;
				}
				case "versus": {
					zhu = target.identity == "zhu";
					break;
				}
				case "doudizhu": {
					zhu = target == game.zhu;
					break;
				}
			}
			if (zhu) {
				await player.draw();
				target.addTempSkill("rewangzun2");
				target.addMark("rewangzun2", 1, false);
			}
		},
	}
```

### retongji 名字:同疾
描述: 攻击范围内包含你的角色成为【杀】的目标时，若你不是此【杀】的使用者或目标，其可弃置一张牌，然后将此【杀】转移给你。
```js
retongji: {
		trigger: { global: "useCardToTarget" },
		logTarget: "target",
		audio: "tongji",
		filter(event, player) {
			return event.card.name === "sha" && event.player !== player && !event.targets.includes(player) && event.target.inRange(player) && event.target.hasCards("he");
		},
		async cost(event, trigger, player) {
			event.result = await trigger.target
				.chooseToDiscard({
					prompt: get.prompt("retongji", player),
					prompt2: `弃置一张牌，将${get.translation(trigger.card)}转移给${get.translation(player)}`,
					position: "he",
					chooseonly: true,
					ai(card) {
						if (!_status.event.check) {
							return -1;
						}
						return get.unuseful(card) + 9;
					},
				})
				.set(
					"check",
					(() => {
						if (trigger.target.hasCards("h", "shan")) {
							return -get.attitude(trigger.target, player);
						}
						if (get.attitude(trigger.target, player) < 5) {
							return 6 - get.attitude(trigger.target, player);
						}
						if (trigger.target.hp === 1 && !player.hasCards("h", "shan")) {
							return 10 - get.attitude(trigger.target, player);
						}
						if (trigger.target.hp === 2 && !player.hasCards("h", "shan")) {
							return 8 - get.attitude(trigger.target, player);
						}
						return -1;
					})() > 0
				)
				.forResult();
		},
		async content(event, trigger, player) {
			const evt = trigger.getParent();
			if (evt == null) {
				throw new ReferenceError("找不到触发【同疾】的使用牌事件");
			}
			await trigger.target.discard({
				cards: event.cards,
				discarder: trigger.target,
			});
			evt.triggeredTargets2.remove(trigger.target);
			evt.targets.remove(trigger.target);
			evt.targets.push(player);
		},
		ai: {
			neg: true,
		},
	}
```

