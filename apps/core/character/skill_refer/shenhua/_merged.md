# shenhua merged reference

## re_huangzhong 名字:黄忠 势力:shu

### xinliegong 名字:烈弓
描述: ①你使用【杀】可以选择你距离不大于此【杀】点数的角色为目标。②当你使用【杀】指定一个目标后，你可以根据下列条件执行相应的效果：1.其手牌数小于等于你的手牌数，此【杀】不可被响应，2.其体力值大于等于你的体力值，此【杀】伤害+1。
```js
xinliegong: {
		mod: {
			aiOrder(player, card, num) {
				if (num > 0 && (card.name === "sha" || get.tag(card, "draw"))) {
					return num + 6;
				}
			},
			targetInRange(card, player, target) {
				if (card.name == "sha" && typeof get.number(card) == "number") {
					if (get.distance(player, target) <= get.number(card)) {
						return true;
					}
				}
			},
		},
		targetprompt2: target => {
			const player = get.player(),
				card = get.card(),
				list = [];
			if (card?.name != "sha" || !target.classList.contains("selectable")) {
				return list;
			}
			const num = card.cards?.length ?? 0;
			if (target.countCards("h") <= player.countCards("h") - num) {
				list.add("不可响应");
			}
			if (target.hp >= player.hp) {
				list.add("加伤");
			}
			return list;
		},
		onChooseToUse(event) {
			event.targetprompt2.add(lib.skill.xinliegong.targetprompt2);
		},
		onChooseTarget(event) {
			event.targetprompt2.add(lib.skill.xinliegong.targetprompt2);
		},
		audio: "liegong",
		audioname: ["re_huangzhong", "ol_huangzhong"],
		trigger: { player: "useCardToTargeted" },
		logTarget: "target",
		locked: false,
		check(event, player) {
			return get.attitude(player, event.target) <= 0;
		},
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			if (event.target.countCards("h") <= player.countCards("h")) {
				return true;
			}
			if (event.target.hp >= player.hp) {
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			if (trigger.target.countCards("h") <= player.countCards("h")) {
				trigger.getParent().directHit.push(trigger.target);
			}
			if (trigger.target.hp >= player.hp) {
				const id = trigger.target.playerid;
				const map = trigger.getParent().customArgs;
				if (!map[id]) {
					map[id] = {};
				}
				if (typeof map[id].extraDamage != "number") {
					map[id].extraDamage = 0;
				}
				map[id].extraDamage++;
			}
		},
		ai: {
			threaten: 0.5,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (
					arg?.target &&
					arg?.card &&
					get.attitude(player, arg.target) <= 0 &&
					arg.card.name == "sha" &&
					player.countCards("h", function (card) {
						return card != arg.card && (!arg.card.cards || !arg.card.cards.includes(card));
					}) >= arg.target.countCards("h")
				) {
					return true;
				}
				return false;
			},
		},
	}
```

## old_zhoutai 名字:周泰 势力:wu

### gzbuqu 名字:不屈
描述: ①当你扣减1点体力时，若你的体力值小于1，你可以将牌堆顶的一张牌置于你的武将牌上，称为“创”。②当你回复1点体力时，你移去一张“创”。③若你有“创”且点数均不相同，则你不结算濒死流程。
```js
gzbuqu: {
		audio: 2,
		trigger: { player: "changeHp" },
		filter(event, player) {
			return player.hp <= 0 && event.num < 0;
		},
		marktext: "创",
		intro: {
			markcount: "expansion",
			content: "expansion",
		},
		group: "gzbuqu_recover",
		frequent: true,
		ondisable: true,
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				//delete player.nodying;
				player.loseToDiscardpile(cards);
				if (player.hp <= 0) {
					player.dying({});
				}
			}
		},
		process(player) {
			//delete player.nodying;
			const nums = [];
			const cards = player.getExpansions("gzbuqu");
			for (let i = 0; i < cards.length; i++) {
				if (nums.includes(get.number(cards[i]))) {
					return false;
				} else {
					nums.push(get.number(cards[i]));
				}
			}
			return true;
			//player.nodying=true;
		},
		subSkill: {
			recover: {
				trigger: { player: "recoverAfter" },
				filter(event, player) {
					return player.getExpansions("gzbuqu").length > 0 && event.num > 0;
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					for (let i = trigger.num; i > 0; i--) {
						let cards = player.getExpansions("gzbuqu");
						const count = cards.length;
						if (count <= 0 || player.hp + count <= 1) {
							return;
						}
						if (count > 1) {
							cards = (
								await player
									.chooseCardButton("不屈：移去一张“创”", true, cards)
									.set("ai", function (button) {
										const buttons = get.selectableButtons();
										for (let i = 0; i < buttons.length; i++) {
											if (buttons[i] != button && get.number(buttons[i].link) == get.number(button.link) && !ui.selected.buttons.includes(buttons[i])) {
												return 1;
											}
										}
										return 0;
									})
									.forResult()
							).links;
						}
						await player.loseToDiscardpile(cards);
					}
					if (lib.skill.gzbuqu.process(player)) {
						if (player.isDying()) {
							const histories = [event];
							let evt = event;
							while (true) {
								evt = event.getParent("dying");
								if (!evt || evt.name != "dying" || histories.includes(evt)) {
									break;
								}
								histories.push(evt);
								if (evt.player == player) {
									evt.nodying = true;
								}
							}
						}
					}
				},
			},
		},
		async content(event, trigger, player) {
			const num = -trigger.num - Math.max(player.hp - trigger.num, 1) + 1;
			const next = player.addToExpansion(get.cards(num), "gain2");
			next.gaintag.add("gzbuqu");
			await next;
			await player.showCards(get.translation(player) + "的不屈牌", player.getExpansions("gzbuqu"));
			if (lib.skill.gzbuqu.process(player)) {
				const evt = trigger.getParent();
				if (evt.name == "damage" || evt.name == "loseHp") {
					evt.nodying = true;
				}
			}
		},
		ai: {
			mingzhi: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage") || get.tag(card, "loseHp")) {
						let num = target.getExpansions("gzbuqu").length || target.getHp();
						return (num + 1) / 5;
					}
				},
			},
		},
	}
```

## old_caoren 名字:曹仁 势力:wei

### jushou 名字:据守
描述: 结束阶段，你可以摸三张牌并翻面。
```js
jushou: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		check(event, player) {
			return event.player.hp + player.countCards("h") < 4;
		},
		async content(event, trigger, player) {
			await player.draw(3);
			await player.turnOver();
		},
	}
```

## re_xuhuang 名字:徐晃 势力:wei

### duanliang 名字:断粮
描述: 你可以将一张黑色基本牌或装备牌当做【兵粮寸断】使用；若一名角色的手牌数大于或等于你的手牌数，则你对其使用【兵粮寸断】没有距离限制。
```js
duanliang: {
		audio: "duanliang1",
		audioname: ["re_xuhuang"],
		group: ["duanliang1", "duanliang3"],
		ai: {
			threaten: 1.2,
		},
	}
```

### jiezi 名字:截辎
描述: 锁定技，其他角色跳过摸牌阶段后，你摸一张牌。
```js
jiezi: {
		trigger: { global: ["phaseDrawSkipped", "phaseDrawCancelled"] },
		audio: 2,
		forced: true,
		filter(event, player) {
			return event.player != player;
		},
		async content(event, trigger, player) {
			await player.draw();
		},
	}
```

## re_pangde 名字:庞德 势力:qun

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### jianchu 名字:鞬出
描述: 当你使用【杀】指定一名角色为目标后，你可以弃置其一张牌，若以此法弃置的牌为装备牌，此【杀】不可被【闪】响应，若不为装备牌，该角色获得此【杀】。
```js
jianchu: {
		audio: 2,
		audioname: ["re_pangde"],
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return event.card.name == "sha" && event.target.countDiscardableCards(player, "he") > 0;
		},
		preHidden: true,
		check(event, player) {
			return get.attitude(player, event.target) <= 0;
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const result = await player
				.discardPlayerCard(trigger.target, get.prompt("jianchu", trigger.target), true)
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
				.set("att", get.attitude(player, trigger.target) <= 0)
				.forResult();
			if (result.bool && result.links && result.links.length) {
				if (get.type(result.links[0], null, result.links[0].original == "h" ? player : false) == "equip") {
					trigger.getParent().directHit.add(trigger.target);
				} else if (trigger.cards) {
					const list = [];
					for (let i = 0; i < trigger.cards.length; i++) {
						if (get.position(trigger.cards[i], true) == "o") {
							list.push(trigger.cards[i]);
						}
					}
					if (list.length) {
						trigger.target.gain(list, "gain2", "log");
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

## re_xiahouyuan 名字:夏侯渊 势力:wei

### xinshensu 名字:神速
描述: 你可以选择一至三项：1. 跳过判定阶段和摸牌阶段；2. 跳过出牌阶段并弃置一张装备牌；3. 跳过弃牌阶段并将你的武将牌翻面。你每选择一项，视为你对一名其他角色使用一张没有距离限制的【杀】。
```js
xinshensu: {
		audio: "shensu1",
		audioname: ["xiahouba", "re_xiahouyuan", "ol_xiahouyuan"],
		group: ["xinshensu_1", "xinshensu_2", "shensu4"],
		preHidden: ["xinshensu_1", "xinshensu_2", "shensu4"],
		subSkill: {
			1: {
				audio: "shensu1",
				inherit: "shensu1",
				sourceSkill: "xinshensu",
			},
			2: {
				inherit: "shensu2",
				sourceSkill: "xinshensu",
			},
		},
	}
```

## re_weiyan 名字:魏延 势力:shu

### xinkuanggu 名字:狂骨
描述: 当你造成1点伤害后，若受伤角色受到此伤害时你与其的距离不大于1，则你可以回复1点体力或摸一张牌。
```js
xinkuanggu: {
		audio: "kuanggu",
		audioname: ["re_weiyan", "ol_weiyan"],
		trigger: { source: "damageSource" },
		filter(event, player) {
			return event.checkKuanggu && event.num > 0;
		},
		getIndex(event, player, triggername) {
			return event.num;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			let choice;
			if (
				player.isDamaged() &&
				get.recoverEffect(player) > 0 &&
				player.countCards("hs", function (card) {
					return card.name == "sha" && player.hasValueTarget(card);
				}) >= player.getCardUsable("sha")
			) {
				choice = "recover_hp";
			} else {
				choice = "draw_card";
			}
			const next = player.chooseDrawRecover("###" + get.prompt(event.skill) + "###摸一张牌或回复1点体力");
			next.set("choice", choice);
			next.set("ai", function () {
				return _status.event.getParent().choice;
			});
			next.set("logSkill", event.skill);
			next.setHiddenSkill(event.skill);
			const { control } = await next.forResult();
			if (control == "cancel2") {
				return;
			}
			event.result = { bool: true, skill_popup: false }; // 好像在content里面不能中断getIndex喵
		},
		async content(event, trigger, player) {},
	}
```

### qimou 名字:奇谋
描述: 限定技，出牌阶段，你可以失去任意点体力，然后直到回合结束，你计算与其他角色的距离时-X，且你可以多使用X张【杀】（X为你失去的体力值）。
```js
qimou: {
		limited: true,
		audio: 2,
		enable: "phaseUse",
		skillAnimation: true,
		animationColor: "orange",
		async content(event, trigger, player) {
			const shas = player.getCards("h", "sha");
			let num;
			if (player.hp >= 4 && shas.length >= 3) {
				num = 3;
			} else if (player.hp >= 3 && shas.length >= 2) {
				num = 2;
			} else {
				num = 1;
			}
			const map = {};
			const list = [];
			for (let i = 1; i <= player.hp; i++) {
				const cn = get.cnNumber(i, true);
				map[cn] = i;
				list.push(cn);
			}
			player.awakenSkill(event.name);
			player.storage.qimou = true;
			const result = await player
				.chooseControl(list, function () {
					return get.cnNumber(_status.event.goon, true);
				})
				.set("prompt", "失去任意点体力")
				.set("goon", num)
				.forResult();
			num = map[result.control] || 1;
			player.storage.qimou2 = num;
			player.addTempSkill("qimou2");
			await player.loseHp(num);
		},
		ai: {
			order: 2,
			result: {
				player(player) {
					if (player.hp == 1) {
						return 0;
					}
					const shas = player.getCards("h", "sha");
					if (!shas.length) {
						return 0;
					}
					const card = shas[0];
					if (!lib.filter.cardEnabled(card, player)) {
						return 0;
					}
					if (lib.filter.cardUsable(card, player)) {
						return 0;
					}
					let mindist;
					if (player.hp >= 4 && shas.length >= 3) {
						mindist = 4;
					} else if (player.hp >= 3 && shas.length >= 2) {
						mindist = 3;
					} else {
						mindist = 2;
					}
					if (
						game.hasPlayer(function (current) {
							return current.hp <= mindist - 1 && get.distance(player, current, "attack") <= mindist && player.canUse(card, current, false) && get.effect(current, card, player, player) > 0;
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

## xiaoqiao 名字:小乔 势力:wu

### retianxiang 名字:天香
描述: 当你受到伤害时，你可以弃置一张红桃手牌，防止此次伤害并选择一名其他角色，然后你选择一项：1.令其受到伤害来源对其造成的1点伤害，然后摸X张牌（X为其已损失体力值且至多为5）；2.令其失去1点体力，然后获得你弃置的牌。
```js
retianxiang: {
		audio: "tianxiang",
		audioname: ["daxiaoqiao", "re_xiaoqiao", "ol_xiaoqiao"],
		trigger: { player: "damageBegin4" },
		preHidden: true,
		filter(event, player) {
			return (
				player.countCards("h", function (card) {
					return _status.connectMode || get.suit(card, player) == "heart";
				}) > 0 && event.num > 0
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					filterCard(card, player) {
						return get.suit(card) == "heart" && lib.filter.cardDiscardable(card, player);
					},
					filterTarget(card, player, target) {
						return player != target;
					},
					ai1(card) {
						return 10 - get.value(card);
					},
					ai2(target) {
						const att = get.attitude(_status.event.player, target);
						const trigger = _status.event.getTrigger();
						let da = 0;
						if (_status.event.player.hp == 1) {
							da = 10;
						}
						const eff = get.damageEffect(target, trigger.source, target);
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
					prompt: get.prompt(event.skill),
					prompt2: lib.translate[`${event.skill}_info`],
				})
				.setHiddenSkill(event.name.slice(0, -5))
				.forResult();
		},
		async content(event, trigger, player) {
			const [target] = event.targets;
			const [card] = event.cards;
			trigger.cancel();
			await player.discard(event.cards);
			const result = await player
				.chooseControlList(
					true,
					function (event, player) {
						const target = _status.event.target;
						let att = get.attitude(player, target);
						if (target.hasSkillTag("maihp")) {
							att = -att;
						}
						if (att > 0) {
							return 0;
						} else {
							return 1;
						}
					},
					["令" + get.translation(target) + "受到伤害来源对其造成的1点伤害，然后摸X张牌（X为其已损失体力值且至多为5）", "令" + get.translation(target) + "失去1点体力，然后获得" + get.translation(event.cards)]
				)
				.set("target", target)
				.forResult();
			if (typeof result.index != "number") {
				return;
			}
			if (result.index) {
				event.related = target.loseHp();
			} else {
				event.related = target.damage(trigger.source || "nosource", "nocard");
			}
			await event.related;
			//if(event.related.cancelled||target.isDead()) return;
			if (result.index && card.isInPile()) {
				await target.gain(card, "gain2");
			} else if (target.getDamagedHp()) {
				await target.draw(Math.min(5, target.getDamagedHp()));
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

### hongyan 名字:红颜
描述: 锁定技，你区域内的黑桃牌和黑桃判定牌均视为红桃。
```js
hongyan: {
		audio: true,
		mod: {
			suit(card, suit) {
				if (suit == "spade") {
					return "heart";
				}
			},
		},
	}
```

## sp_zhangjiao 名字:张角 势力:qun

### releiji 名字:雷击
描述: 当你使用或打出一张【闪】时，你可令一名其他角色进行一次判定：若结果为梅花，你回复1点体力，并对其造成1点雷电伤害；若结果为黑桃，你对其造成2点雷电伤害。
```js
releiji: {
		audio: 2,
		audioname: ["boss_qinglong"],
		trigger: { player: ["useCard", "respond"] },
		filter(event, player) {
			return event.card.name == "shan";
		},
		line: "thunder",
		async cost(event, trigger, player) {
			const next = player.chooseTarget(get.prompt2(event.skill), function (card, player, target) {
				return target != player;
			});
			next.ai = function (target) {
				if (target.hasSkill("hongyan")) {
					return 0;
				}
				return get.damageEffect(target, _status.event.player, _status.event.player, "thunder");
			};
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			const [target] = event.targets;
			const next = target.judge(function (card) {
				const suit = get.suit(card);
				if (suit == "spade") {
					return -4;
				}
				if (suit == "club") {
					return -2;
				}
				return 0;
			});
			next.judge2 = function (result) {
				return result.bool == false; // ? true : false; 喵？
			};
			const { suit } = await next.forResult();
			if (suit == "club") {
				await player.recover();
				await target.damage("thunder");
			} else if (suit == "spade") {
				await target.damage(2, "thunder");
			}
		},
		ai: {
			useShan: true,
			effect: {
				target_use(card, player, target, current) {
					if (
						get.tag(card, "respondShan") &&
						!player.hasSkillTag(
							"directHit_ai",
							true,
							{
								target: target,
								card: card,
							},
							true
						)
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
						if (card.name === "sha") {
							if (!target.mayHaveShan(player, "use")) {
								return;
							}
						} else if (!target.mayHaveShan(player)) {
							return 1 - 0.1 * Math.min(5, target.countCards("hs"));
						}
						if (!target.hasSkillTag("rejudge")) {
							return [1, (club + spade) / 4];
						}
						let pos = player.hasSkillTag("viewHandcard", null, target, true) ? "hes" : "e",
							better = club > spade ? "club" : "spade",
							max = 0;
						target.hasCard(function (cardx) {
							if (get.suit(cardx) === better) {
								max = 2;
								return true;
							}
							if (spade && get.color(cardx) === "black") {
								max = 1;
							}
						}, pos);
						if (max === 2) {
							return [1, Math.max(club, spade)];
						}
						if (max === 1) {
							return [1, Math.min(club, spade)];
						}
						if (pos === "e") {
							return [1, Math.min((Math.max(1, target.countCards("hs")) * (club + spade)) / 4, Math.max(club, spade))];
						}
						return [1, (club + spade) / 4];
					}
				},
			},
		},
	}
```

### guidao 名字:鬼道
描述: 一名角色的判定牌生效前，你可以打出一张黑色牌替换之。
```js
guidao: {
		audio: 2,
		audioname: ["sp_zhangjiao"],
		trigger: { global: "judge" },
		filter(event, player) {
			return player.countCards("hes", { color: "black" }) > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(`${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt(event.skill)}`, "hes", card => {
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

### huangtian 名字:黄天
描述: 主公技，其他群势力角色的出牌阶段限一次，其可以交给你一张【闪】或【闪电】。
```js
huangtian: {
		audio: "huangtian2",
		audioname: ["zhangjiao", "re_zhangjiao"],
		audioname2: {
			pe_jun_zhangjiao: ["xinhuangtian2_re_zhangjiao1.mp3", "xinhuangtian2_re_zhangjiao2.mp3"],
		},
		global: "huangtian2",
		zhuSkill: true,
	}
```

## re_yuji 名字:于吉 势力:qun

### xinfu_guhuo 名字:蛊惑
描述: `每回合限一次。你可以扣置一张手牌当做一张基本牌或普通锦囊牌使用或打出，其他角色依次选择是否质疑。当有角色质疑时，你终止质疑流程并展示此牌：若为假，此牌作废；若为真，该角色获得${get.poptip("chanyuan")}。`
```js
xinfu_guhuo: {
		audio: "guhuo_guess",
		derivation: ["chanyuan"],
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			return lib.inpile.includes(name) && player.countCards("hs") > 0 && !player.hasSkill("guhuo_phase");
		},
		filter(event, player) {
			if (player.hasSkill("guhuo_phase")) {
				return false;
			}
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
					return current != player && !current.hasSkill("chanyuan") && (get.realAttitude || get.attitude)(current, player) < 0;
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
							return current != player && !current.hasSkill("chanyuan") && (get.realAttitude || get.attitude)(current, player) < 0;
						});
						const cardx = lib.skill.xinfu_guhuo_backup.viewAs;
						if (enemyNum) {
							if (card.name == cardx.name && (card.name != "sha" || get.is.sameNature(card, cardx))) {
								return 2 + Math.random() * 3;
							} else if (lib.skill.xinfu_guhuo_backup.aiUse < 0.5 && !player.isDying()) {
								return 0;
							}
						}
						return 6 - get.value(card);
					},
					async precontent(event, trigger, player) {
						player.logSkill("xinfu_guhuo");
						player.addTempSkill("guhuo_guess");
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
				if (!player.countCards("hs") || player.hasSkill("guhuo_phase")) {
					return false;
				}
			},
			threaten: 1.2,
			order: 8.1,
			result: { player: 1 },
		},
	}
```

## sp_zhugeliang 名字:卧龙 势力:shu

### bazhen 名字:八阵
描述: 锁定技，若你的防具栏内没有牌且没有被废除，则你视为装备着【八卦阵】。
```js
bazhen: {
		audio: 2,
		audioname: ["re_sp_zhugeliang", "ol_sp_zhugeliang", "ol_pangtong"],
		group: "bazhen_bagua",
		locked: true,
		init(player, skill) {
			player.addExtraEquip(skill, "bagua", true, player => player.hasEmptySlot(2) && lib.card.bagua);
		},
		onremove(player, skill) {
			player.removeExtraEquip(skill);
		},
	}
```

### huoji 名字:火计
描述: 你可以将一张红色手牌当作【火攻】使用。
```js
huoji: {
		audio: 2,
		enable: "chooseToUse",
		filterCard(card) {
			return get.color(card) == "red";
		},
		viewAs: { name: "huogong" },
		viewAsFilter(player) {
			if (!player.countCards("hs", { color: "red" })) {
				return false;
			}
		},
		position: "hs",
		prompt: "将一张红色牌当火攻使用",
		check(card) {
			const player = get.player();
			if (player.countCards("h") > player.hp) {
				return 6 - get.value(card);
			}
			return 3 - get.value(card);
		},
		ai: {
			fireAttack: true,
		},
	}
```

### kanpo 名字:看破
描述: 你可以将你的任意一张黑色手牌当做【无懈可击】使用。
```js
kanpo: {
		mod: {
			aiValue(player, card, num) {
				if (get.name(card) != "wuxie" && get.color(card) != "black") {
					return;
				}
				const cards = player.getCards("hs", function (card) {
					return get.name(card) == "wuxie" || get.color(card) == "black";
				});
				cards.sort(function (a, b) {
					return (get.name(b) == "wuxie" ? 1 : 2) - (get.name(a) == "wuxie" ? 1 : 2);
				});
				const geti = function () {
					if (cards.includes(card)) {
						return cards.indexOf(card);
					}
					return cards.length;
				};
				if (get.name(card) == "wuxie") {
					return Math.min(num, [6, 4, 3][Math.min(geti(), 2)]) * 0.6;
				}
				return Math.max(num, [6, 4, 3][Math.min(geti(), 2)]);
			},
			aiUseful() {
				return lib.skill.kanpo.mod.aiValue.apply(this, arguments);
			},
		},
		locked: false,
		audio: 2,
		enable: "chooseToUse",
		filterCard(card) {
			return get.color(card) == "black";
		},
		viewAsFilter(player) {
			return player.countCards("hs", { color: "black" }) > 0;
		},
		viewAs: { name: "wuxie" },
		position: "hs",
		prompt: "将一张黑色手牌当无懈可击使用",
		check(card) {
			const tri = _status.event.getTrigger();
			if (tri && tri.card && tri.card.name == "chiling") {
				return -1;
			}
			return 8 - get.value(card);
		},
		threaten: 1.2,
	}
```

## pangtong 名字:庞统 势力:shu

### lianhuan 名字:连环
描述: 你可以将♣手牌当作【铁索连环】使用或重铸。
```js
lianhuan: {
		audio: 2,
		hiddenCard(player, name) {
			return name == "tiesuo" && player.hasCard(card => get.suit(card) == "club", "sh");
		},
		enable: "chooseToUse",
		filter(event, player) {
			if (!player.hasCard(card => get.suit(card) == "club", "sh")) {
				return false;
			}
			return event.type == "phase" || event.filterCard(get.autoViewAs({ name: "tiesuo" }, "unsure"), player, event);
		},
		position: "hs",
		filterCard(card, player, event) {
			if (!event) {
				event = _status.event;
			}
			if (get.suit(card) != "club") {
				return false;
			}
			if (event.type == "phase" && get.position(card) != "s" && player.canRecast(card)) {
				return true;
			} else {
				if (game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false) {
					return false;
				}
				const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
				return event._backup.filterCard(cardx, player, event);
			}
		},
		filterTarget(fuck, player, target) {
			const card = ui.selected.cards[0],
				event = _status.event,
				backup = event._backup;
			if (!card || game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false) {
				return false;
			}
			const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
			return backup.filterCard(cardx, player, event) && backup.filterTarget(cardx, player, target);
		},
		selectTarget() {
			const card = ui.selected.cards[0],
				event = _status.event,
				player = event.player,
				backup = event._backup;
			let recast = false,
				use = false;
			const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
			if (event.type == "phase" && player.canRecast(card)) {
				recast = true;
			}
			if (card && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false) {
				if (backup.filterCard(cardx, player, event)) {
					use = true;
				}
			}
			if (!use) {
				return [0, 0];
			} else {
				const select = backup.selectTarget(cardx, player);
				if (recast && select[0] > 0) {
					select[0] = 0;
				}
				return select;
			}
		},
		filterOk() {
			const card = ui.selected.cards[0],
				event = _status.event,
				player = event.player,
				backup = event._backup;
			const selected = ui.selected.targets.length;
			let recast = false,
				use = false;
			const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
			if (event.type == "phase" && player.canRecast(card)) {
				recast = true;
			}
			if (card && game.checkMod(card, player, "unchanged", "cardEnabled2", player) !== false) {
				if (backup.filterCard(cardx, player, event)) {
					use = true;
				}
			}
			if (recast && selected == 0) {
				return true;
			} else if (use) {
				const select = backup.selectTarget(cardx, player);
				if (select[0] <= -1) {
					return true;
				}
				return selected >= select[0] && selected <= select[1];
			}
		},
		ai1(card) {
			return 6 - get.value(card);
		},
		ai2(target) {
			const player = get.player();
			const card = ui.selected.cards[0],
				event = _status.event,
				backup = event._backup;
			if (!card || game.checkMod(card, player, "unchanged", "cardEnabled2", player) === false) {
				return 0;
			}
			const cardx = get.autoViewAs({ name: "tiesuo" }, [card]);
			if (backup.filterCard(cardx, player, event) && backup.filterTarget(cardx, player, target)) {
				return get.effect(target, { name: "tiesuo" }, player, player);
			}
			return 0;
		},
		discard: false,
		lose: false,
		delay: false,
		viewAs(cards, player) {
			return {
				name: "tiesuo",
			};
		},
		prepare: () => true,
		async precontent(event, trigger, player) {
			const result = event.result;
			if (!result?.targets?.length) {
				delete result.card;
			}
		},
		async content(event, trigger, player) {
			await player.recast(event.cards);
		},
		ai: {
			order(item, player) {
				if (game.hasPlayer(current => get.effect(current, { name: "tiesuo" }, player, player) > 0) || player.hasCard(card => get.suit(card) == "club" && player.canRecast(card), "h")) {
					return 8;
				}
				return 1;
			},
			result: { player: 1 },
		},
	}
```

### oldniepan 名字:涅槃
描述: 限定技，当你处于濒死状态时，你可以弃置你区域内的所有牌并复原你的武将牌，然后摸三张牌并将体力回复至3点。
```js
oldniepan: {
		audio: "niepan",
		audioname2: { sb_pangtong: "sbniepan" },
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
			player.awakenSkill(event.name);
			player.storage.oldniepan = true;
			await player.discard(player.getCards("hej"));
			await player.link(false);
			await player.turnOver(false);
			await player.draw(3);
			if (player.hp < 3) {
				await player.recover(3 - player.hp);
			}
		},
		ai: {
			order: 1,
			skillTagFilter(player, arg, target) {
				if (player != target || player.storage.oldniepan) {
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
				if (!target.storage.oldniepan) {
					return 0.6;
				}
			},
		},
	}
```

## xunyu 名字:荀彧 势力:wei

### quhu 名字:驱虎
描述: 出牌阶段限一次，你可以与一名体力值大于你的角色拼点，若你赢，则该角色对其攻击范围内另一名由你指定的角色造成1点伤害。若你没赢，该角色对你造成1点伤害。
```js
quhu: {
		audio: 2,
		audioname: ["re_xunyu", "ol_xunyu"],
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			if (player.countCards("h") == 0) {
				return false;
			}
			return game.hasPlayer(function (current) {
				return current.hp > player.hp && player.canCompare(current);
			});
		},
		filterTarget(card, player, target) {
			return target.hp > player.hp && player.canCompare(target);
		},
		async content(event, trigger, player) {
			const target = event.target;
			const { bool } = await player.chooseToCompare(target).forResult();
			if (!bool) {
				return void (await player.damage(target));
			}
			if (
				!game.hasPlayer(function (player) {
					return player != target && target.inRange(player);
				})
			) {
				return;
			}
			const result = await player
				.chooseTarget(function (card, player, target) {
					const source = _status.event.source;
					return target != source && source.inRange(target);
				}, true)
				.set("ai", function (target) {
					return get.damageEffect(target, _status.event.source, player);
				})
				.set("source", target)
				.forResult();
			if (!result.bool || !result.targets || !result.targets.length) {
				return;
			}
			target.line(result.targets[0], "green");
			await result.targets[0].damage(target);
		},
		ai: {
			order: 0.5,
			result: {
				target(player, target) {
					const att = get.attitude(player, target);
					const oc = target.countCards("h") == 1;
					if (att > 0 && oc) {
						return 0;
					}
					const players = game.filterPlayer();
					for (let i = 0; i < players.length; i++) {
						if (players[i] != target && players[i] != player && target.inRange(players[i])) {
							if (get.damageEffect(players[i], target, player) > 0) {
								return att > 0 ? att / 2 : att - (oc ? 5 : 0);
							}
						}
					}
					return 0;
				},
				player(player, target) {
					if (target.hasSkillTag("jueqing", false, target)) {
						return -10;
					}
					const hs = player.getCards("h");
					let mn = 1;
					for (let i = 0; i < hs.length; i++) {
						mn = Math.max(mn, get.number(hs[i]));
					}
					if (mn <= 11 && player.hp < 2) {
						return -20;
					}
					let max = player.maxHp - hs.length;
					const players = game.filterPlayer();
					for (let i = 0; i < players.length; i++) {
						if (get.attitude(player, players[i]) > 2) {
							max = Math.max(Math.min(5, players[i].hp) - players[i].countCards("h"), max);
						}
					}
					switch (max) {
						case 0:
							return mn == 13 ? 0 : -20;
						case 1:
							return mn >= 12 ? 0 : -15;
						case 2:
							return 0;
						case 3:
							return 1;
						default:
							return max;
					}
				},
			},
			expose: 0.2,
		},
	}
```

### jieming 名字:节命
描述: 当你受到1点伤害后，你可令一名角色将手牌摸至X张（X为其体力上限且至多为5）。
```js
jieming: {
		audio: 2,
		trigger: { player: "damageEnd" },
		getIndex(event) {
			return event.num;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), function (card, player, target) {
					return true; //target.countCards('h')<Math.min(target.maxHp,5); // 没有卷入格式化大劫的上古代码碎片喵
				})
				.set("ai", function (target) {
					let att = get.attitude(_status.event.player, target);
					if (target.hasSkillTag("nogain")) {
						att /= 6;
					}
					if (att > 2) {
						return Math.max(0, Math.min(5, target.maxHp) - target.countCards("h"));
					}
					return att / 3;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			for (const target of event.targets) {
				await target.drawTo(Math.min(5, target.maxHp));
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "damage") && target.hp > 1) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						const players = game.filterPlayer();
						let max = 0;
						for (let i = 0; i < players.length; i++) {
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

## dianwei 名字:典韦 势力:wei

### qiangxix 名字:强袭
描述: 出牌阶段限两次，你可以失去1点体力或弃置一张武器牌，然后对一名本阶段内未成为过〖强袭〗的目标的其他角色造成1点伤害。
```js
qiangxix: {
		audio: "qiangxi",
		audioname: ["boss_lvbu3"],
		mod: {
			aiOrder(player, card, num) {
				if (player.getEquips(1).length || get.subtype(card, player) !== "equip1" || !player.hasSkillTag("noe")) {
					return num;
				}
				return 10;
			},
		},
		enable: "phaseUse",
		usable: 2,
		locked: false,
		filter(event, player) {
			if (player.hp < 1 && !player.hasCard(card => lib.skill.qiangxix.filterCard(card), "he")) {
				return false;
			}
			return game.hasPlayer(current => lib.skill.qiangxix.filterTarget(null, player, current));
		},
		filterCard(card) {
			return get.subtype(card) == "equip1";
		},
		position: "he",
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			var stat = player.getStat()._qiangxix;
			return !stat || !stat.includes(target);
		},
		selectCard() {
			if (_status.event.player.hp < 1) {
				return 1;
			}
			return [0, 1];
		},
		async content(event, trigger, player) {
			const { target, cards } = event;
			const stat = player.getStat();
			stat._qiangxix ??= [];
			stat._qiangxix.push(target);

			if (!cards?.length) {
				await player.loseHp();
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
					return get.effect(player, { name: "losehp" }, player, player);
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

## taishici 名字:太史慈 势力:wu

### tianyi 名字:天义
描述: 出牌阶段限一次，你可以和一名其他角色拼点。若你赢，你获得以下技能效果直到回合结束：你使用【杀】没有距离限制；可额外使用一张【杀】；使用【杀】时可额外指定一个目标。若你没赢，你不能使用【杀】直到回合结束。
```js
tianyi: {
		audio: 2,
		audioname: ["re_taishici"],
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const { bool } = await player.chooseToCompare(event.target).forResult();
			if (bool) {
				player.addTempSkill("tianyi2");
			} else {
				player.addTempSkill("tianyi3");
			}
		},
		ai: {
			order(name, player) {
				const cards = player.getCards("h");
				if (player.countCards("h", "sha") == 0) {
					return 1;
				}
				for (let i = 0; i < cards.length; i++) {
					if (cards[i].name != "sha" && get.number(cards[i]) > 11 && get.value(cards[i]) < 7) {
						return 9;
					}
				}
				return get.order({ name: "sha" }) - 1;
			},
			result: {
				player(player) {
					if (player.countCards("h", "sha") > 0) {
						return 0.6;
					}
					const num = player.countCards("h");
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
					const num = target.countCards("h");
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

## yanwen 名字:颜良文丑 势力:qun

### shuangxiong 名字:双雄
描述: 摸牌阶段，你可以改为进行一次判定：你获得此判定牌，且你可以于此回合内将任意一张与此判定牌不同颜色的手牌当做【决斗】使用。
```js
shuangxiong: {
		audio: 2,
		audioname: ["re_yanwen"],
		group: "shuangxiong_judge",
		subSkill: {
			judge: {
				audio: "shuangxiong",
				logAudio: () => 1,
				trigger: { player: "phaseDrawBegin1" },
				check(event, player) {
					if (player.countCards("h") > player.hp) {
						return true;
					}
					if (player.countCards("h") > 3) {
						return true;
					}
					return false;
				},
				filter(event, player) {
					return !event.numFixed;
				},
				preHidden: true,
				prompt2: () => "进行一次判定，本回合可以将一张与此牌颜色不同的手牌当作【决斗】使用",
				async content(event, trigger, player) {
					trigger.changeToZero();
					await player.judge().set("callback", lib.skill.shuangxiong_judge.callback);
				},
				async callback(event, trigger, player) {
					await player.gain(event.card, "gain2");
					player.addTempSkill("shuangxiong_viewas");
					player.markAuto("shuangxiong_viewas", [event.judgeResult.color]);
				},
			},
			viewas: {
				charlotte: true,
				onremove: true,
				audio: "shuangxiong",
				logAudio: () => "shuangxiong2.mp3",
				enable: "chooseToUse",
				viewAs: { name: "juedou" },
				position: "hs",
				viewAsFilter(player) {
					return player.hasCard(card => lib.skill.shuangxiong_viewas.filterCard(card, player), "hs");
				},
				filterCard(card, player) {
					const color = get.color(card),
						colors = player.getStorage("shuangxiong_viewas");
					for (const i of colors) {
						if (color != i) {
							return true;
						}
					}
					return false;
				},
				prompt() {
					const colors = _status.event.player.getStorage("shuangxiong_viewas");
					let str = "将一张颜色";
					for (let i = 0; i < colors.length; i++) {
						if (i > 0) {
							str += "或";
						}
						str += "不为";
						str += get.translation(colors[i]);
					}
					str += "的手牌当做【决斗】使用";
					return str;
				},
				check(card) {
					const player = _status.event.player;
					const raw = player.getUseValue(card, null, true);
					const eff = player.getUseValue(get.autoViewAs({ name: "juedou" }, [card]));
					return eff - raw;
				},
				ai: { order: 7 },
			},
			re_yanwen1: { audio: true },
			re_yanwen2: { audio: true },
		},
	}
```

## re_yuanshao 名字:袁绍 势力:qun

### luanji 名字:乱击
描述: 出牌阶段，你可以将任意两张相同花色的手牌当做【万箭齐发】使用。
```js
luanji: {
		audio: 2,
		enable: "phaseUse",
		position: "hs",
		viewAs: { name: "wanjian" },
		filterCard(card, player) {
			if (ui.selected.cards.length) {
				return get.suit(card) == get.suit(ui.selected.cards[0]);
			}
			const cards = player.getCards("hs");
			for (let i = 0; i < cards.length; i++) {
				if (card != cards[i]) {
					if (get.suit(card) == get.suit(cards[i])) {
						return true;
					}
				}
			}
			return false;
		},
		selectCard: 2,
		complexCard: true,
		check(card) {
			const player = _status.event.player;
			const targets = game.filterPlayer(function (current) {
				return player.canUse("wanjian", current);
			});
			let num = 0;
			for (let i = 0; i < targets.length; i++) {
				let eff = get.sgn(get.effect(targets[i], { name: "wanjian" }, player, player));
				if (targets[i].hp == 1) {
					eff *= 1.5;
				}
				num += eff;
			}
			if (!player.needsToDiscard(-1)) {
				if (targets.length >= 7) {
					if (num < 2) {
						return 0;
					}
				} else if (targets.length >= 5) {
					if (num < 1.5) {
						return 0;
					}
				}
			}
			return 6 - get.value(card);
		},
		ai: {
			basic: {
				order: 8.5,
			},
		},
	}
```

### xueyi 名字:血裔
描述: 主公技，锁定技，场上每有一名其他群雄角色存活，你的手牌上限便+2。
```js
xueyi: {
		trigger: { player: "phaseDiscardBefore" },
		audio: 2,
		audioname: ["re_yuanshao"],
		audioname2: {
			pe_jun_yuanshao: ["xueyi_re_yuanshao1.mp3", "xueyi_re_yuanshao2.mp3"],
		},
		forced: true,
		firstDo: true,
		filter(event, player) {
			return (
				player.hasZhuSkill("xueyi") &&
				game.hasPlayer(function (current) {
					return current != player && current.group == "qun";
				}) &&
				player.countCards("h") > player.hp
			);
		},
		async content() {},
		mod: {
			maxHandcard(player, num) {
				if (player.hasZhuSkill("xueyi")) {
					return (
						num +
						game.countPlayer(function (current) {
							if (player != current && current.group == "qun") {
								return 2;
							}
						})
					);
				}
				return num;
			},
		},
		zhuSkill: true,
	}
```

## menghuo 名字:孟获 势力:shu

### huoshou 名字:祸首
描述: 锁定技，【南蛮入侵】对你无效；你视为所有【南蛮入侵】的伤害来源。
```js
huoshou: {
		audio: "huoshou1",
		audioname: ["re_menghuo"],
		locked: true,
		group: ["huoshou1", "huoshou2"],
		preHidden: ["huoshou1", "huoshou2"],
		ai: {
			halfneg: true,
			effect: {
				target(card, player, target) {
					if (card.name == "nanman") {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

### zaiqixx 名字:再起
描述: 摸牌阶段，若你已受伤，则你可以改为亮出牌堆顶的X张牌（X为你已损失的体力值+1），并回复X点体力（X为其中♥牌的数目）。然后你将这些♥牌置入弃牌堆，并获得其余的牌。
```js
zaiqixx: {
		audio: "zaiqi",
		inherit: "zaiqi",
	}
```

### twqiushou
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## zhurong 名字:祝融 势力:shu

### juxiang 名字:巨象
描述: 锁定技。①【南蛮入侵】对你无效。②其他角色使用的【南蛮入侵】结算结束后，你获得此牌对应的所有实体牌。
```js
juxiang: {
		//unique:true,
		locked: true,
		audio: "juxiang1",
		audioname: ["re_zhurong", "ol_zhurong"],
		group: ["juxiang1", "juxiang2"],
		preHidden: ["juxiang1", "juxiang2"],
		ai: {
			effect: {
				target(card) {
					if (card.name == "nanman") {
						return [0, 1, 0, 0];
					}
				},
			},
		},
	}
```

### lieren 名字:烈刃
描述: 当你使用【杀】造成伤害后，可与受到该伤害的角色进行拼点；若你赢，你获得对方的一张牌。
```js
lieren: {
		audio: 2,
		audioname: ["boss_lvbu3", "ol_zhurong"],
		trigger: { source: "damageSource" },
		filter(event, player) {
			if (event._notrigger.includes(event.player)) {
				return false;
			}
			return event.card && event.card.name == "sha" && event.getParent().name == "sha" && event.player.isIn() && player.canCompare(event.player);
		},
		check(event, player) {
			return get.attitude(player, event.player) < 0 && player.countCards("h") > 1;
		},
		//priority:5,
		async content(event, trigger, player) {
			const result = await player.chooseToCompare(trigger.player).forResult();
			if (result.bool && trigger.player.countGainableCards(player, "he")) {
				await player.gainPlayerCard(trigger.player, true, "he");
			}
		},
	}
```

## caopi 名字:曹丕 势力:wei

### xingshang 名字:行殇
描述: 当有角色死亡后，你可以获得该角色的所有牌。
```js
xingshang: {
		audio: 2,
		audioname2: { caoying: "lingren_xingshang" },
		trigger: { global: "die" },
		preHidden: true,
		filter(event) {
			return event.player.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			event.togain = trigger.player.getCards("he");
			await player.gain(event.togain, trigger.player, "giveAuto", "bySelf");
		},
	}
```

### fangzhu 名字:放逐
描述: 当你受到伤害后，你可令一名其他角色摸X张牌（X为你已损失的体力值），然后该角色将武将牌翻面。
```js
fangzhu: {
		audio: 2,
		audioname2: { new_simayi: "fangzhu_new_simayi", sxrm_caocao: "fangzhu_sxrm_caocao", tw_sxrm_caocao: "fangzhu_sxrm_caocao" },
		trigger: { player: "damageEnd" },
		preHidden: true,
		async cost(event, trigger, player) {
			const draw = player.getDamagedHp();
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "令一名其他角色翻面" + (draw > 0 ? "并摸" + get.cnNumber(draw) + "张牌" : ""), function (card, player, target) {
					return player != target;
				})
				.setHiddenSkill(event.skill)
				.set("ai", target => {
					if (target.hasSkillTag("noturn")) {
						return 0;
					}
					const player = _status.event.player;
					const current = _status.currentPhase;
					const dis = current ? get.distance(current, target, "absolute") : 1;
					const draw = player.getDamagedHp();
					const att = get.attitude(player, target);
					if (att == 0) {
						return target.hasJudge("lebu") ? Math.random() / 3 : Math.sqrt(get.threaten(target)) / 5 + Math.random() / 2;
					}
					if (att > 0) {
						if (target.isTurnedOver()) {
							return att + draw;
						}
						if (draw < 4) {
							return -1;
						}
						if (current && target.getSeatNum() > current.getSeatNum()) {
							return att + draw / 3;
						}
						return (10 * Math.sqrt(Math.max(0.01, get.threaten(target)))) / (3.5 - draw) + dis / (2 * game.countPlayer());
					} else {
						if (target.isTurnedOver()) {
							return att - draw;
						}
						if (draw >= 5) {
							return -1;
						}
						if (current && target.getSeatNum() <= current.getSeatNum()) {
							return -att + draw / 3;
						}
						return (4.25 - draw) * 10 * Math.sqrt(Math.max(0.01, get.threaten(target))) + (2 * game.countPlayer()) / dis;
					}
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const draw = player.getDamagedHp();
			if (draw > 0) {
				await event.targets[0].draw(draw);
			}
			await event.targets[0].turnOver();
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
						if (target.hp <= 1) {
							return;
						}
						if (!target.hasFriend()) {
							return;
						}
						let hastarget = false;
						let turnfriend = false;
						const players = game.filterPlayer();
						for (let i = 0; i < players.length; i++) {
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

### songwei 名字:颂威
描述: 主公技，其他魏势力的角色的判定牌结果为黑色且生效后，其可以令你摸一张牌。
```js
songwei: {
		group: "songwei2",
		audioname: ["re_caopi"],
		audio: "songwei2",
		zhuSkill: true,
	}
```

## re_lusu 名字:鲁肃 势力:wu

### haoshi 名字:好施
描述: 摸牌阶段，你可以额外摸两张牌。若此时你的手牌数多于五张，你须将一半(向下取整)的手牌交给场上除你外手牌数最少的一名角色。
```js
haoshi: {
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed;
		},
		preHidden: true,
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
			player.addSkill("haoshi2");
		},
		ai: {
			threaten: 2,
			noh: true,
			skillTagFilter(player, tag) {
				if (tag == "noh") {
					if (player.countCards("h") != 2) {
						return false;
					}
				}
			},
		},
	}
```

### dimeng 名字:缔盟
描述: 出牌阶段限一次，你可以选择其他两名角色，你弃置等同于这两名角色手牌数量之差的牌，然后交换他们的手牌。
```js
dimeng: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		position: "he",
		filterCard() {
			const targets = ui.selected.targets;
			if (targets.length == 2) {
				if (Math.abs(targets[0].countCards("h") - targets[1].countCards("h")) <= ui.selected.cards.length) {
					return false;
				}
			}
			return true;
		},
		selectCard: [0, Infinity],
		selectTarget: 2,
		complexCard: true,
		complexTarget: true,
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			const targets = ui.selected.targets;
			if (!targets?.length) {
				return true;
			} else if (targets.concat([target]).every(target => !target.countCards("h"))) {
				return false;
			}
			return Math.abs(targets[0].countCards("h") - target.countCards("h")) == ui.selected.cards.length;
		},
		/*filterOk() {
			if (targets.length != 2) {
				return false;
			}
			return Math.abs(targets[0].countCards("h") - targets[1].countCards("h")) == ui.selected.cards.length;
		},*/
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			event.targets[0].swapHandcards(event.targets[1]);
		},
		check(card) {
			const list = [],
				player = _status.event.player;
			const num = player.countCards("he");
			const players = game.filterPlayer();
			let count;
			for (let i = 0; i < players.length; i++) {
				if (players[i] != player && get.attitude(player, players[i]) > 3) {
					list.push(players[i]);
				}
			}
			list.sort(function (a, b) {
				return a.countCards("h") - b.countCards("h");
			});
			if (list.length == 0) {
				return -1;
			}
			const from = list[0];
			list.length = 0;
			for (let i = 0; i < players.length; i++) {
				if (players[i] != player && get.attitude(player, players[i]) < 1) {
					list.push(players[i]);
				}
			}
			if (list.length == 0) {
				return -1;
			}
			list.sort(function (a, b) {
				return b.countCards("h") - a.countCards("h");
			});
			if (from.countCards("h") >= list[0].countCards("h")) {
				return -1;
			}
			for (let i = 0; i < list.length && from.countCards("h") < list[i].countCards("h"); i++) {
				if (list[i].countCards("h") - from.countCards("h") <= num) {
					count = list[i].countCards("h") - from.countCards("h");
					break;
				}
			}
			if (count < 2 && from.countCards("h") >= 2) {
				return -1;
			}
			if (ui.selected.cards.length < count) {
				return 11 - get.value(card);
			}
			return -1;
		},
		ai: {
			order: 6,
			threaten: 3,
			expose: 0.9,
			result: {
				target(player, target) {
					const list = [];
					const num = player.countCards("he");
					const players = game.filterPlayer();
					if (ui.selected.targets.length == 0) {
						for (let i = 0; i < players.length; i++) {
							if (players[i] != player && get.attitude(player, players[i]) > 3) {
								list.push(players[i]);
							}
						}
						list.sort(function (a, b) {
							return a.countCards("h") - b.countCards("h");
						});
						if (target == list[0]) {
							return get.attitude(player, target);
						}
						return -get.attitude(player, target);
					} else {
						const from = ui.selected.targets[0];
						for (let i = 0; i < players.length; i++) {
							if (players[i] != player && get.attitude(player, players[i]) < 1) {
								list.push(players[i]);
							}
						}
						list.sort(function (a, b) {
							return b.countCards("h") - a.countCards("h");
						});
						if (from.countCards("h") >= list[0].countCards("h")) {
							return -get.attitude(player, target);
						}
						for (let i = 0; i < list.length && from.countCards("h") < list[i].countCards("h"); i++) {
							if (list[i].countCards("h") - from.countCards("h") <= num) {
								const count = list[i].countCards("h") - from.countCards("h");
								if (count < 2 && from.countCards("h") >= 2) {
									return -get.attitude(player, target);
								}
								if (target == list[i]) {
									return get.attitude(player, target);
								}
								return -get.attitude(player, target);
							}
						}
					}
				},
			},
		},
	}
```

## sunjian 名字:孙坚 势力:wu

### gzyinghun 名字:英魂
描述: 准备阶段开始时，若你已受伤，你可令一名其他角色执行一项：摸X张牌，然后弃置一张牌；或摸一张牌，然后弃置X张牌（X为你已损失的体力值）。
```js
gzyinghun: {
		audio: "yinghun",
		audioname: ["re_sunjian", "sunce", "re_sunben", "re_sunce", "ol_sunjian", "sb_sunce"],
		audioname2: {
			re_sunyi: "gzyinghun_re_sunyi",
		},
		mod: {
			aiOrder(player, card, num) {
				if (num > 0 && _status.event && _status.event.type == "phase" && get.tag(card, "recover")) {
					if (player.needsToDiscard()) {
						return num / 3;
					}
					return 0;
				}
			},
		},
		locked: false,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.getDamagedHp() > 0;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), function (card, player, target) {
					return player != target;
				})
				.set("ai", function (target) {
					const player = _status.event.player;
					if (player.getDamagedHp() == 1 && target.countCards("he") == 0) {
						return 0;
					}
					if (get.attitude(_status.event.player, target) > 0) {
						return 10 + get.attitude(_status.event.player, target);
					}
					if (player.getDamagedHp() == 1) {
						return -1;
					}
					return 1;
				})
				.setHiddenSkill(event.name.slice(0, -5))
				.forResult();
		},
		async content(event, trigger, player) {
			const num = player.getDamagedHp();
			const [target] = event.targets;
			let directcontrol = num == 1;
			if (!directcontrol) {
				const str1 = "摸" + get.cnNumber(num, true) + "弃一";
				const str2 = "摸一弃" + get.cnNumber(num, true);
				directcontrol =
					str1 ==
					(
						await player
							.chooseControl(str1, str2, function (event, player) {
								return _status.event.choice;
							})
							.set("choice", get.attitude(player, target) > 0 ? str1 : str2)
							.forResult()
					).control;
			}
			if (directcontrol) {
				await target.draw(num);
				await target.chooseToDiscard(true, "he");
			} else {
				await target.draw();
				await target.chooseToDiscard(num, true, "he");
			}
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (
						get.tag(card, "damage") &&
						get.itemtype(player) === "player" &&
						target.hp >
							(player.hasSkillTag("damageBonus", true, {
								target: target,
								card: card,
							})
								? 2
								: 1)
					) {
						return [1, 0.5];
					}
				},
			},
			threaten(player, target) {
				return Math.max(0.5, target.getDamagedHp() / 2);
			},
			maixie: true,
		},
	}
```

## dongzhuo 名字:董卓 势力:qun

### jiuchi 名字:酒池
描述: 你可以将一张♠手牌当作【酒】使用。
```js
jiuchi: {
		audio: 2,
		audioname: ["re_dongzhuo"],
		enable: "chooseToUse",
		filterCard(card) {
			return get.suit(card) == "spade";
		},
		viewAs: { name: "jiu" },
		viewAsFilter(player) {
			if (!player.countCards("hs", { suit: "spade" })) {
				return false;
			}
			return true;
		},
		prompt: "将一张黑桃手牌当酒使用",
		check(card) {
			if (_status.event.type == "dying") {
				return 1 / Math.max(0.1, get.value(card));
			}
			return 4 - get.value(card);
		},
		ai: {
			threaten: 1.5,
		},
	}
```

### roulin 名字:肉林
描述: 锁定技。你对女性角色、女性角色对你使用【杀】时，都需连续使用两张【闪】才能抵消。
```js
roulin: {
		audio: 2,
		audioname: ["re_dongzhuo", "ol_dongzhuo"],
		trigger: { player: "useCardToPlayered", target: "useCardToTargeted" },
		forced: true,
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			if (player == event.player) {
				return event.target.hasSex("female");
			}
			return event.player.hasSex("female");
		},
		check(event, player) {
			return player == event.player;
		},
		async content(event, trigger, player) {
			const id = (player == trigger.player ? trigger.target : player).playerid;
			const map = trigger.getParent().customArgs;
			if (!map[id]) {
				map[id] = {};
			}
			if (typeof map[id].shanRequired == "number") {
				map[id].shanRequired++;
			} else {
				map[id].shanRequired = 2;
			}
		},
		ai: {
			halfneg: true,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "directHit_ai") {
					return;
				}
				if (arg.card.name != "sha" || !arg.target.hasSex("female") || arg.target.countCards("h", "shan") > 1) {
					return false;
				}
			},
		},
	}
```

### benghuai 名字:崩坏
描述: 锁定技。结束阶段，若你的体力不为全场最少，你失去1点体力或减1点体力上限。
```js
benghuai: {
		audio: 2,
		audioname: ["re_dongzhuo", "ol_dongzhuo"],
		audioname2: {
			zhugedan: "benghuai_zhugedan",
			re_zhugedan: "benghuai_re_zhugedan",
		},
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		check() {
			return false;
		},
		filter(event, player) {
			return !player.isMinHp();
		},
		async content(event, trigger, player) {
			const { control } = await player
				.chooseControl("baonue_hp", "baonue_maxHp", function (event, player) {
					if (player.hp == player.maxHp) {
						return "baonue_hp";
					}
					if (player.hp < player.maxHp - 1 || player.hp <= 2) {
						return "baonue_maxHp";
					}
					return "baonue_hp";
				})
				.set("prompt", "崩坏：失去1点体力或减1点体力上限")
				.forResult();
			if (control == "baonue_hp") {
				await player.loseHp();
			} else {
				await player.loseMaxHp(true);
			}
		},
		ai: {
			threaten: 0.5,
			neg: true,
		},
	}
```

### baonue 名字:暴虐
描述: 主公技，其他群雄角色造成伤害后，可进行一次判定，若为♠，你回复1点体力。
```js
baonue: {
		group: "baonue2",
		audioname: ["re_dongzhuo"],
		audio: "baonue2",
		zhuSkill: true,
	}
```

## jiaxu 名字:贾诩 势力:qun

### luanwu 名字:乱武
描述: 限定技，出牌阶段，你可令除你外的所有角色依次对与其距离最近的另一名角色使用一张【杀】，否则失去1点体力。
```js
luanwu: {
		audio: 2,
		audioname: ["re_jiaxu"],
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(current => player != current);
		},
		limited: true,
		skillAnimation: "epic",
		animationColor: "thunder",
		filterTarget: lib.filter.notMe,
		selectTarget: -1,
		multiline: true,
		async contentBefore(event, trigger, player) {
			player.awakenSkill(event.skill);
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await target
				.chooseToUse(
					"乱武：使用一张【杀】或失去1点体力",
					function (card) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					},
					function (card, player, target) {
						if (player == target) {
							return false;
						}
						var dist = get.distance(player, target);
						if (dist > 1) {
							if (
								game.hasPlayer(function (current) {
									return current != player && get.distance(player, current) < dist;
								})
							) {
								return false;
							}
						}
						return lib.filter.filterTarget.apply(this, arguments);
					}
				)
				.set("ai2", function () {
					return get.effect_use.apply(this, arguments) - get.event().effect;
				})
				.set("effect", get.effect(target, { name: "losehp" }, target, target))
				.set("addCount", false)
				.forResult();
			if (!result?.bool) {
				await target.loseHp();
			}
		},
		ai: {
			order: 1,
			result: {
				player(player) {
					if (lib.config.mode == "identity" && game.zhu.isZhu && player.identity == "fan") {
						if (game.zhu.hp == 1 && game.zhu.countCards("h") <= 2) {
							return 1;
						}
					}
					const players = game.filterPlayer();
					let num = 0;
					for (let i = 0; i < players.length; i++) {
						let att = get.attitude(player, players[i]);
						if (att > 0) {
							att = 1;
						}
						if (att < 0) {
							att = -1;
						}
						if (players[i] != player && players[i].hp <= 3) {
							const hs = players[i].countCards("hs");
							if (hs === 0) {
								num += att / players[i].hp;
							} else if (hs === 1) {
								num += att / 2 / players[i].hp;
							} else if (hs === 2) {
								num += att / 4 / players[i].hp;
							}
						}
						if (players[i].hp == 1) {
							num += att * 1.5;
						}
					}
					if (player.hp == 1) {
						return -num;
					}
					if (player.hp == 2) {
						return -game.players.length / 4 - num;
					}
					return -game.players.length / 3 - num;
				},
			},
		},
	}
```

### wansha 名字:完杀
描述: 锁定技，你的回合内，除你以外，不处于濒死状态的角色不能使用【桃】。
```js
wansha: {
		locked: true,
		audio: 2,
		audioname: ["re_jiaxu", "boss_lvbu3", "new_simayi"],
		audioname2: { shen_simayi: "jilue_wansha" },
		global: "wansha2",
		trigger: { global: "dying" },
		priority: 15,
		forced: true,
		preHidden: true,
		filter(event, player, name) {
			return _status.currentPhase == player && event.player != player;
		},
		async content() {},
	}
```

### weimu 名字:帷幕
描述: 锁定技，你不能成为黑色锦囊牌的目标。
```js
weimu: {
		trigger: { global: "useCard1" },
		audio: 2,
		audioname2: {
			wangyuanji: "qc_weimu",
			boss_chujiangwang: "boss_chujiangwang_weimu",
		},
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
		async content(event, trigger, player) {},
		mod: {
			targetEnabled(card) {
				if ((get.type(card) == "trick" || get.type(card) == "delay") && get.color(card) == "black") {
					return false;
				}
			},
		},
	}
```

## jiangwei 名字:姜维 势力:shu

### tiaoxin 名字:挑衅
描述: 出牌阶段限一次，你可以指定一名攻击范围内包含你的角色，该角色需对你使用一张【杀】，否则你弃置其一张牌。
```js
tiaoxin: {
		audio: 2,
		audioname: ["sp_jiangwei", "xiahouba", "re_jiangwei", "gz_jiangwei", "ol_jiangwei"],
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.inRange(player) && target.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			const target = event.target;
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
			if (result.bool == false && target.countCards("he") > 0) {
				player.discardPlayerCard(target, "he", true);
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
	}
```

### zhiji 名字:志继
描述: `觉醒技，准备阶段，若你没有手牌，你须回复1点体力或摸两张牌，然后减1点体力上限，并获得技能${get.poptip("reguanxing")}。`
```js
zhiji: {
		skillAnimation: true,
		animationColor: "fire",
		audio: 2,
		audioname: ["re_jiangwei"],
		juexingji: true,
		derivation: "reguanxing",
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			if (player.storage.zhiji) {
				return false;
			}
			return player.countCards("h") == 0;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.chooseDrawRecover(2, true);
			await player.loseMaxHp();
			await player.addSkills("reguanxing");
		},
	}
```

## liushan 名字:刘禅 势力:shu

### xiangle 名字:享乐
描述: 锁定技，当你成为一名角色使用【杀】的目标后，该角色需弃置一张基本牌，否则此【杀】对你无效。
```js
xiangle: {
		audio: 2,
		audioname: ["re_liushan", "ol_liushan"],
		trigger: { target: "useCardToTargeted" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return event.card.name == "sha";
		},
		async content(event, trigger, player) {
			const eff = get.effect(player, trigger.card, trigger.player, trigger.player);
			const result = await trigger.player
				.chooseToDiscard("享乐：弃置一张基本牌，否则杀对" + get.translation(player) + "无效", function (card) {
					return get.type(card) == "basic";
				})
				.set("ai", function (card) {
					if (_status.event.eff > 0) {
						return 10 - get.value(card);
					}
					return 0;
				})
				.set("eff", eff)
				.forResult();
			if (!result?.bool) {
				trigger.getParent().excluded.add(player);
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (card.name == "sha" && get.attitude(player, target) < 0) {
						if (_status.event.name == "xiangle") {
							return;
						}
						if (get.attitude(player, target) > 0 && current < 0) {
							return "zerotarget";
						}
						const bs = player.getCards("h", { type: "basic" });
						bs.remove(card);
						if (card.cards) {
							bs.removeArray(card.cards);
						} else {
							bs.removeArray(ui.selected.cards);
						}
						if (!bs.length) {
							return "zerotarget";
						}
						if (player.hasSkill("jiu") || player.hasSkill("tianxianjiu")) {
							return;
						}
						if (bs.length <= 2) {
							for (let i = 0; i < bs.length; i++) {
								if (get.value(bs[i]) < 7) {
									return [1, 0, 1, -0.5];
								}
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

### fangquan 名字:放权
描述: 你可跳过你的出牌阶段，若如此做，回合结束时，你可以弃置一张手牌并令一名其他角色进行一个额外的回合。
```js
fangquan: {
		audio: 2,
		trigger: { player: "phaseUseBefore" },
		filter(event, player) {
			return player.countCards("h") > 0 && !player.hasSkill("fangquan3");
		},
		preHidden: true,
		async cost(event, trigger, player) {
			const fang = player.countMark("fangquan2") == 0 && player.hp >= 2 && player.countCards("h") <= player.hp + 1;
			event.result = await player
				.chooseBool(get.prompt2(event.skill))
				.set("ai", function () {
					const player = get.player();
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
				.setHiddenSkill(event.name.slice(0, -5))
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.addTempSkill("fangquan2");
			player.addMark("fangquan2", 1, false);
			//player.storage.fangquan=result.targets[0];
		},
	}
```

### ruoyu 名字:若愚
描述: `主公技，觉醒技，准备阶段，若你的体力是全场最少的(或之一)，你须增加1点体力上限并回复1点体力，然后获得技能${get.poptip("rejijiang")}。`
```js
ruoyu: {
		skillAnimation: true,
		animationColor: "fire",
		audio: 2,
		audioname: ["re_liushan"],
		juexingji: true,
		zhuSkill: true,
		keepSkill: true,
		derivation: "rejijiang",
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return player.isMinHp();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.gainMaxHp();
			await player.recover();
			await player.addSkills("rejijiang");
		},
	}
```

## zhanghe 名字:张郃 势力:wei

### qiaobian 名字:巧变
描述: 你可以弃置一张手牌并跳过自己的一个阶段（准备阶段和结束阶段除外）。若你以此法跳过了摸牌阶段，则你可以获得至多两名其他角色的各一张手牌；若你以此法跳过了出牌阶段，则你可以移动场上的一张牌。
```js
qiaobian: {
		audio: 2,
		audioname2: { gz_jun_caocao: "jianan_qiaobian" },
		trigger: {
			player: ["phaseJudgeBefore", "phaseDrawBefore", "phaseUseBefore", "phaseDiscardBefore"],
		},
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			let check,
				str = "弃置一张手牌并跳过";
			str += ["判定", "摸牌", "出牌", "弃牌"][lib.skill.qiaobian.trigger.player.indexOf(event.triggername)];
			str += "阶段";
			if (trigger.name == "phaseDraw") {
				str += "，然后可以获得至多两名角色各一张手牌";
			}
			if (trigger.name == "phaseUse") {
				str += "，然后可以移动场上的一张牌";
			}
			switch (trigger.name) {
				case "phaseJudge":
					check = player.countCards("j");
					break;
				case "phaseDraw": {
					let i,
						num = 0,
						num2 = 0;
					const players = game.filterPlayer();
					for (i = 0; i < players.length; i++) {
						if (player != players[i] && players[i].countCards("h")) {
							const att = get.attitude(player, players[i]);
							if (att <= 0) {
								num++;
							}
							if (att < 0) {
								num2++;
							}
						}
					}
					check = num >= 2 && num2 > 0;
					break;
				}
				case "phaseUse":
					if (!player.canMoveCard(true)) {
						check = false;
					} else {
						check = game.hasPlayer(function (current) {
							return get.attitude(player, current) > 0 && current.countCards("j");
						});
						if (!check) {
							if (player.countCards("h") > player.hp + 1) {
								check = false;
							} else if (player.countCards("h", { name: "wuzhong" })) {
								check = false;
							} else {
								check = true;
							}
						}
					}
					break;
				case "phaseDiscard":
					check = player.needsToDiscard();
					break;
			}
			event.result = await player
				.chooseToDiscard(get.prompt(event.skill), str, lib.filter.cardDiscardable)
				.set("ai", card => {
					if (!_status.event.check) {
						return -1;
					}
					return 7 - get.value(card);
				})
				.set("check", check)
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			game.log(player, "跳过了", "#y" + ["判定", "摸牌", "出牌", "弃牌"][lib.skill.qiaobian.trigger.player.indexOf(event.triggername)] + "阶段");
			if (trigger.name == "phaseUse") {
				if (player.canMoveCard()) {
					await player.moveCard();
				}
			} else if (trigger.name == "phaseDraw") {
				const result = await player
					.chooseTarget([1, 2], "获得至多两名角色各一张手牌", function (card, player, target) {
						return target != player && target.countCards("h");
					})
					.set("ai", function (target) {
						return 1 - get.attitude(_status.event.player, target);
					})
					.forResult();
				if (!result.bool) {
					return;
				}
				result.targets.sortBySeat();
				player.line(result.targets, "green");
				if (!result.targets.length) {
					return;
				}
				await player.gainMultiple(result.targets);
				await game.delay();
			}
		},
		ai: { threaten: 3 },
	}
```

## dengai 名字:邓艾 势力:wei

### tuntian 名字:屯田
描述: ①当你于回合外失去牌后，你可以判定。若判定结果不为♥，则你将此牌置于你的武将牌上，称为“田”。②你计算与其他角色的距离时-X（X为你武将牌上“田”的数目）。
```js
tuntian: {
		audio: 2,
		audioname: ["gz_dengai"],
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		frequent: true,
		preHidden: true,
		filter(event, player) {
			if (player == _status.currentPhase) {
				return false;
			}
			if (event.name == "gain" && event.player == player) {
				return false;
			}
			const evt = event.getl(player);
			return evt && evt.cards2 && evt.cards2.length > 0;
		},
		async content(event, trigger, player) {
			const judge = player.judge(function (card) {
				if (get.suit(card) == "heart") {
					return -1;
				}
				return 1;
			});
			judge.judge2 = function (result) {
				return result.bool;
			};
			if (get.mode() != "guozhan") {
				judge.callback = lib.skill.tuntian.callback;
				return void (await judge);
			}
			const result = await judge.forResult();
			if (!result.bool || get.position(result.card) != "d") {
				//game.cardsDiscard(card);
				return;
			}
			const card = result.card;
			const chooseBool = player.chooseBool("是否将" + get.translation(card) + "作为“田”置于武将牌上？");
			chooseBool.ai = function () {
				return true;
			};
			const { bool } = await chooseBool.forResult();
			if (!bool) {
				return;
			}
			const addToExpansion = player.addToExpansion(card, "gain2");
			addToExpansion.gaintag.add("tuntian");
			await addToExpansion;
		},
		async callback(event, trigger, player) {
			if (!event.judgeResult.bool) {
				return;
			}
			const next = player.addToExpansion(event.judgeResult.card, "gain2");
			next.gaintag.add("tuntian");
			await next;
		},
		marktext: "田",
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
		group: "tuntian_dist",
		locked: false,
		subSkill: {
			dist: {
				locked: false,
				mod: {
					globalFrom(from, to, distance) {
						let num = distance - from.getExpansions("tuntian").length;
						if (_status.event.skill == "jixi_backup" || _status.event.skill == "gz_jixi_backup") {
							num++;
						}
						return num;
					},
				},
			},
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (typeof card === "object" && get.name(card) === "sha" && target.mayHaveShan(player, "use")) {
						return [0.6, 0.75];
					}
					if (!target.hasFriend() && !player.hasUnknown()) {
						return;
					}
					if (_status.currentPhase == target || get.type(card) === "delay") {
						return;
					}
					if (card.name != "shuiyanqijunx" && get.tag(card, "loseCard") && target.countCards("he")) {
						if (target.hasSkill("ziliang")) {
							return 0.7;
						}
						return [0.5, Math.max(2, target.countCards("h"))];
					}
					if (target.isUnderControl(true, player)) {
						if ((get.tag(card, "respondSha") && target.countCards("h", "sha")) || (get.tag(card, "respondShan") && target.countCards("h", "shan"))) {
							if (target.hasSkill("ziliang")) {
								return 0.7;
							}
							return [0.5, 1];
						}
					} else if (get.tag(card, "respondSha") || get.tag(card, "respondShan")) {
						if (get.attitude(player, target) > 0 && card.name == "juedou") {
							return;
						}
						if (get.tag(card, "damage") && target.hasSkillTag("maixie")) {
							return;
						}
						if (target.countCards("h") == 0) {
							return 2;
						}
						if (target.hasSkill("ziliang")) {
							return 0.7;
						}
						if (get.mode() == "guozhan") {
							return 0.5;
						}
						return [0.5, Math.max(target.countCards("h") / 4, target.countCards("h", "sha") + target.countCards("h", "shan"))];
					}
				},
			},
			threaten(player, target) {
				if (target.countCards("h") == 0) {
					return 2;
				}
				return 0.5;
			},
			nodiscard: true,
			nolose: true,
			notemp: true,
		},
	}
```

### zaoxian 名字:凿险
描述: `觉醒技，准备阶段，若你武将牌上至少拥有三张“田”，则你减1点体力上限，并获得技能${get.poptip("jixi")}。`
```js
zaoxian: {
		skillAnimation: true,
		animationColor: "thunder",
		audio: 2,
		audioname: ["re_dengai"],
		juexingji: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		filter(event, player) {
			return player.getExpansions("tuntian").length >= 3;
		},
		derivation: "jixi",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			await player.addSkills("jixi");
		},
		ai: {
			combo: "tuntian",
		},
	}
```

## sunce 名字:孙策 势力:wu

### jiang 名字:激昂
描述: 每当你使用（指定目标后）或被使用（成为目标后）一张【决斗】或红色的【杀】时，你可以摸一张牌。
```js
jiang: {
		audio: 2,
		preHidden: true,
		audioname: ["sp_lvmeng", "re_sunben", "re_sunce"],
		mod: {
			aiOrder(player, card, num) {
				if (get.color(card) === "red" && get.name(card) === "sha") {
					return get.order({ name: "sha" }) + 0.15;
				}
			},
		},
		trigger: {
			player: "useCardToPlayered",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (!(event.card.name == "juedou" || (event.card.name == "sha" && get.color(event.card) == "red"))) {
				return false;
			}
			return player == event.target || event.getParent().triggeredTargets3.length == 1;
		},
		locked: false,
		frequent: true,
		async content(event, trigger, player) {
			player.draw();
		},
		ai: {
			effect: {
				target_use(card, player, target) {
					if (card.name == "sha" && get.color(card) == "red") {
						return [1, 0.6];
					}
				},
				player_use(card, player, target) {
					if (card.name == "sha" && get.color(card) == "red") {
						return [1, 1];
					}
				},
			},
		},
	}
```

### hunzi 名字:魂姿
描述: `觉醒技，准备阶段，若你的体力值为1，你减1点体力上限，并获得技能${get.poptip("reyingzi")}和${get.poptip("gzyinghun")}。`
```js
hunzi: {
		//audioname:['re_sunben'],
		skillAnimation: true,
		animationColor: "wood",
		audio: 2,
		juexingji: true,
		derivation: ["reyingzi", "gzyinghun"],
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.hp <= 1 && !player.storage.hunzi;
		},
		forced: true,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			await player.addSkills(["reyingzi", "gzyinghun"]);
		},
		ai: {
			threaten(player, target) {
				if (target.hp == 1) {
					return 2;
				}
				return 0.5;
			},
			maixie: true,
			effect: {
				target(card, player, target) {
					if (!target.hasFriend()) {
						return;
					}
					if (target.hp === 2 && get.tag(card, "damage") == 1 && !target.isTurnedOver() && _status.currentPhase !== target && get.distance(_status.currentPhase, target, "absolute") <= 3) {
						return [0.5, 1];
					}
					if (target.hp === 1 && get.tag(card, "recover") && !target.isTurnedOver() && _status.currentPhase !== target && get.distance(_status.currentPhase, target, "absolute") <= 3) {
						return [1, -3];
					}
				},
			},
		},
	}
```

### zhiba 名字:制霸
描述: 主公技，其他吴势力角色的出牌阶段限一次，其可与你进行一次拼点。若该角色没赢，你可以获得双方拼点的牌。若你已发动过〖魂姿〗，你可以拒绝此拼点。
```js
zhiba: {
		global: "zhiba_global",
		audioname: ["re_sunben"],
		audioname2: {
			pe_jun_sunce: "olzhiba",
		},
		audio: 2,
		zhuSkill: true,
		subSkill: {
			global: {
				enable: "phaseUse",
				prompt() {
					const player = get.player();
					const list = game.filterPlayer(target => target.hasZhuSkill("zhiba", player) && player.canCompare(target));
					let str = "和" + get.translation(list);
					if (list.length > 1) {
						str += "中的一人";
					}
					str += "进行拼点。若你没赢，其可以获得两张拼点牌。";
					return str;
				},
				filter(event, player) {
					if (player.group != "wu") {
						return false;
					}
					return game.hasPlayer(target => target.hasZhuSkill("zhiba", player) && player.canCompare(target));
				},
				filterTarget(card, player, target) {
					return target.hasZhuSkill("zhiba", player) && player.canCompare(target);
				},
				log: false,
				prepare(cards, player, targets) {
					targets[0].logSkill("zhiba");
				},
				usable: 1,
				async content(event, trigger, player) {
					const { target } = event;
					if (["hunzi", "rehunzi"].some(skill => target.storage[skill])) {
						const { bool } = await target
							.chooseBool("是否拒绝〖制霸〗拼点？")
							.set("choice", get.attitude(target, player) <= 0)
							.forResult();
						if (bool) {
							game.log(target, "拒绝了拼点");
							target.chat("拒绝");
							return;
						}
					}
					if (!player.canCompare(target)) {
						return;
					}
					const result = await player
						.chooseToCompare(target, card => {
							if (card.name == "du") {
								return 20;
							}
							const player = get.owner(card);
							const target = get.event().getParent().target;
							if (player != target && get.attitude(player, target) > 0) {
								return -get.number(card);
							}
							return get.number(card);
						})
						.set("preserve", "lose")
						.forResult();
					if (result.bool == false) {
						const list = [result.player, result.target].filterInD("d");
						if (!list.length) {
							return;
						}
						const next = target.chooseBool("是否获得" + get.translation(list) + "？").set("ai", () => get.value(list) > 0);
						if ((await next.forResult()).bool) {
							await target.gain(list, "gain2");
						}
					}
				},
				ai: {
					basic: {
						order: 1,
					},
					expose: 0.2,
					result: {
						target(player, target) {
							if (player.countCards("h", "du") && get.attitude(player, target) < 0) {
								return -1;
							}
							if (player.countCards("h") <= player.hp) {
								return 0;
							}
							let maxnum = 0;
							const cards2 = target.getCards("h");
							for (let i = 0; i < cards2.length; i++) {
								if (get.number(cards2[i]) > maxnum) {
									maxnum = get.number(cards2[i]);
								}
							}
							if (maxnum > 10) {
								maxnum = 10;
							}
							if (maxnum < 5 && cards2.length > 1) {
								maxnum = 5;
							}
							const cards = player.getCards("h");
							for (let i = 0; i < cards.length; i++) {
								if (get.number(cards[i]) < maxnum) {
									return 1;
								}
							}
							return 0;
						},
					},
				},
			},
		},
	}
```

## zhangzhang 名字:张昭张纮 势力:wu

### zhijian 名字:直谏
描述: 出牌阶段，你可以将手牌中的一张装备牌置于一名其他角色装备区里（不得替换原装备），然后摸一张牌。
```js
zhijian: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("h", { type: "equip" }) > 0;
		},
		filterCard(card) {
			return get.type(card) == "equip";
		},
		check(card) {
			const player = _status.currentPhase;
			if (player.countCards("he", { subtype: get.subtype(card) }) > 1) {
				return 11 - get.equipValue(card);
			}
			return 6 - get.value(card);
		},
		filterTarget(card, player, target) {
			if (target.isMin()) {
				return false;
			}
			return player != target && target.canEquip(card);
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
					const card = ui.selected.cards[0];
					if (card) {
						return get.effect(target, card, target, target);
					}
					return 0;
				},
			},
			threaten: 1.3,
		},
	}
```

### guzheng 名字:固政
描述: 其他角色的弃牌阶段结束时，你可以令其获得本阶段内进入弃牌堆的牌中的一张，然后你获得其余的牌。
```js
guzheng: {
		audio: 2,
		audioname: ["re_zhangzhang"],
		trigger: { global: "phaseDiscardAfter" },
		filter(event, player) {
			if (event.player != player && event.player.isIn()) {
				return (
					event.player.getHistory("lose", function (evt) {
						return evt.type == "discard" && evt.getParent("phaseDiscard") == event && evt.hs.someInD("d");
					}).length > 0
				);
			}
			return false;
		},
		checkx(event, player, cards, cards2) {
			if (cards.length > 2 || get.attitude(player, event.player) > 0) {
				return true;
			}
			for (let i = 0; i < cards2.length; i++) {
				if (get.value(cards2[i], event.player, "raw") < 0) {
					return true;
				}
			}
			return false;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			const cards = [],
				cards2 = [];
			const target = trigger.player;
			game.getGlobalHistory("cardMove", function (evt) {
				if (evt.name == "cardsDiscard") {
					if (evt.getParent("phaseDiscard") == trigger) {
						const moves = evt.cards.filterInD("d");
						cards.addArray(moves);
						cards2.removeArray(moves);
					}
				}
				if (evt.name == "lose") {
					if (evt.type != "discard" || evt.position != ui.discardPile || evt.getParent("phaseDiscard") != trigger) {
						return;
					}
					const moves = evt.cards.filterInD("d");
					cards.addArray(moves);
					if (evt.player == target) {
						cards2.addArray(moves);
					} else {
						cards2.removeArray(moves);
					}
				}
			});
			if (!cards2.length) {
				return;
			}
			if (cards.length == 1) {
				event.card = cards[0];
				event.result = await player
					.chooseBool()
					.set("createDialog", [get.prompt(event.skill, target), '<span class="text center">点击“确认”以令其收回此牌</span>', cards])
					.set("choice", lib.skill.guzheng.checkx(trigger, player, cards, cards2))
					.set("ai", function () {
						return _status.event.choice;
					})
					.setHiddenSkill(event.skill)
					.forResult();
				event.result.cost_data = {
					action: "single",
					cards: cards,
				};
			} else {
				event.result = await player
					.chooseButton(2, [get.prompt(event.skill, target), '<span class="text center">被选择的牌将成为对方收回的牌</span>', cards, [["获得剩余的牌", "放弃剩余的牌"], "tdnodes"]])
					.set("filterButton", function (button) {
						const type = typeof button.link;
						if (ui.selected.buttons.length && type == typeof ui.selected.buttons[0].link) {
							return false;
						}
						return type == "string" || _status.event.allowed.includes(button.link);
					})
					.set("allowed", cards2)
					.set("check", lib.skill.guzheng.checkx(trigger, player, cards, cards2))
					.set("ai", function (button) {
						if (typeof button.link == "string") {
							return button.link == "获得剩余的牌" ? 1 : 0;
						}
						if (_status.event.check) {
							return 20 - get.value(button.link, _status.event.getTrigger().player);
						}
						return 0;
					})
					.setHiddenSkill(event.skill)
					.forResult();
				event.result.cost_data = {
					action: "multiple",
					cards: event.result.links,
				};
			}
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const target = trigger.player;
			const action = event.cost_data.action;
			const cards = event.cost_data.cards;
			if (action != "multiple") {
				const gain = target.gain(cards[0], "gain2");
				gain.giver = player;
				await gain;
			} else {
				if (typeof cards[0] != "string") {
					cards.reverse();
				}
				const [, card] = cards;
				const gain = target.gain(card, "gain2");
				gain.giver = player;
				await gain;
				if (cards[0] != "获得剩余的牌") {
					return;
				}
			}
			//避免插入结算改变弃牌堆 重新判断一次
			cards.length = 0;
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
			if (cards.length > 0) {
				await player.gain(cards, "gain2");
			}
		},
		ai: {
			threaten: 1.3,
			expose: 0.2,
		},
	}
```

## caiwenji 名字:蔡琰 势力:qun

### beige 名字:悲歌
描述: 当有角色受到【杀】造成的伤害后，你可以弃一张牌，并令其进行一次判定，若判定结果为：♥该角色回复1点体力；♦︎该角色摸两张牌；♣伤害来源弃两张牌；♠伤害来源将其武将牌翻面。
```js
beige: {
		audio: 2,
		audioname: ["re_caiwenji", "ol_caiwenji"],
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return event.card && event.card.name == "sha" && event.source && event.player.isIn() && player.countCards("he");
		},
		checkx(event, player) {
			const att1 = get.attitude(player, event.player);
			const att2 = get.attitude(player, event.source);
			return att1 > 0 && att2 <= 0;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			const next = player.chooseToDiscard("he", get.prompt2(event.skill, trigger.player));
			const check = lib.skill.beige.checkx(trigger, player);
			next.set("ai", function (card) {
				if (_status.event.goon) {
					return 8 - get.value(card);
				}
				return 0;
			});
			next.set("goon", check);
			next.setHiddenSkill(event.skill);
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			const result = await trigger.player.judge().forResult();
			switch (result.suit) {
				case "heart":
					await trigger.player.recover();
					break;
				case "diamond":
					await trigger.player.draw(2);
					break;
				case "club":
					await trigger.source.chooseToDiscard("he", 2, true);
					break;
				case "spade":
					await trigger.source.turnOver();
					break;
			}
		},
		ai: {
			expose: 0.3,
		},
	}
```

### duanchang 名字:断肠
描述: 锁定技，杀死你的角色失去当前的所有技能。
```js
duanchang: {
		audio: 2,
		audioname: ["re_caiwenji", "ol_caiwenji"],
		forbid: ["boss"],
		trigger: { player: "die" },
		forced: true,
		forceDie: true,
		skillAnimation: true,
		animationColor: "gray",
		filter(event) {
			return event.source && event.source.isIn();
		},
		async content(event, trigger, player) {
			trigger.source.clearSkills();
		},
		logTarget: "source",
		ai: {
			maixie_defend: true,
			threaten(player, target) {
				if (target.hp == 1) {
					return 0.2;
				}
				return 1.5;
			},
			effect: {
				target(card, player, target, current) {
					if (!target.hasFriend()) {
						return;
					}
					if (target.hp <= 1 && get.tag(card, "damage")) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return 3;
						}
						return [1, 0, 0, -3 * get.threaten(player)];
					}
				},
			},
		},
	}
```

## zuoci 名字:左慈 势力:qun

### huashen 名字:化身
描述: ①游戏开始时，你随机将武将牌堆中的两张牌扣置于武将牌上（均称为“化身牌”），选择并亮出一张“化身牌”并声明该武将牌上的一个技能，你拥有该技能且同时将性别和势力属性变成与该武将相同直到该化身被替换（你不可声明限定技、觉醒技、隐匿技、使命技、主公技等特殊技能）。②回合开始时或回合结束时，你重新可以选择一张“化身牌”并声明该武将牌上的一个技能。
```js
huashen: {
		audio: "huashen2",
		unique: true,
		init(player) {
			if (!player.storage.huashen) {
				player.storage.huashen = { owned: {}, choosed: [] };
			}
		},
		intro: {
			content(storage, player) {
				let str = "";
				const list = Object.keys(storage.owned);
				if (list.length) {
					str += get.translation(list[0]);
					for (let i = 1; i < list.length; i++) {
						str += "、" + get.translation(list[i]);
					}
				}
				const skill = player.storage.huashen.current2;
				if (skill) {
					str += "<p>当前技能：" + get.translation(skill);
				}
				return str;
			},
			onunmark(storage, player) {
				_status.characterlist.addArray(Object.keys(storage.owned));
				storage.owned = [];
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
			mark(dialog, content, player) {
				const list = Object.keys(content.owned);
				if (list.length) {
					const skill = player.storage.huashen.current2;
					const character = player.storage.huashen.current;
					if (skill && character) {
						dialog.addSmall([[character], (item, type, position, noclick, node) => lib.skill.rehuashen.$createButton(item, type, position, noclick, node)]);
						dialog.add('<div><div class="skill">【' + get.translation(lib.translate[skill + "_ab"] || get.translation(skill).slice(0, 2)) + "】</div>" + "<div>" + get.skillInfoTranslation(skill, player, false) + "</div></div>");
					}
					if (player.isUnderControl(true)) {
						dialog.addSmall([list, (item, type, position, noclick, node) => lib.skill.rehuashen.$createButton(item, type, position, noclick, node)]);
					} else {
						dialog.addText("共有" + get.cnNumber(list.length) + "张“化身”");
					}
				} else {
					return "没有化身";
				}
			},
			markcount(storage = {}) {
				return Object.keys(storage.owned).length;
			},
		},
		addHuashen(player) {
			if (!player.storage.huashen) {
				return;
			}
			if (!_status.characterlist) {
				game.initCharacterList();
			}
			_status.characterlist.randomSort();
			for (let i = 0; i < _status.characterlist.length; i++) {
				let name = _status.characterlist[i];
				if (name.indexOf("zuoci") != -1 || name.indexOf("key_") == 0 || name.indexOf("sp_key_") == 0 || lib.skill.rehuashen.banned.includes(name) || player.storage.huashen.owned[name]) {
					continue;
				}
				let skills = lib.character[name][3].filter(skill => {
					const categories = get.skillCategoriesOf(skill, player);
					return !categories.some(type => lib.skill.rehuashen.bannedType.includes(type));
				});
				if (skills.length) {
					player.storage.huashen.owned[name] = skills;
					_status.characterlist.remove(name);
					return name;
				}
			}
		},
		addHuashens(player, num) {
			const list = [];
			for (let i = 0; i < num; i++) {
				const name = lib.skill.huashen.addHuashen(player);
				if (name) {
					list.push(name);
				}
			}
			if (list.length) {
				player.syncStorage("huashen");
				player.markSkill("huashen");
				game.log(player, "获得了", get.cnNumber(list.length) + "张", "#g化身");
				lib.skill.rehuashen.drawCharacter(player, list);
			}
		},
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
			return !get.is.empty(player.storage.huashen.owned);
		},
		log: false,
		async cost(event, trigger, player) {
			const name = event.triggername;
			if (trigger.name != "phase" || (name == "phaseBefore" && game.phaseNumber == 0)) {
				player.logSkill("huashen");
				lib.skill.huashen.addHuashens(player, 2);
				event.logged = true;
			}
			await Promise.all(event.next); // await logSkill 防止被 paused
			// 因为化身内置了一个 chooseButtonControl 需要特殊处理一下
			const cards = [];
			const skills = [];
			for (const i in player.storage.huashen.owned) {
				cards.push(i);
				skills.addArray(player.storage.huashen.owned[i]);
			}
			const cond = event.triggername == "phaseBegin" ? "in" : "out";
			skills.randomSort();
			skills.sort(function (a, b) {
				return get.skillRank(b, cond) - get.skillRank(a, cond);
			});
			if (player.isUnderControl()) {
				game.swapPlayerAuto(player);
			}
			const switchToAuto = function () {
				_status.imchoosing = false;
				let skill = skills[0],
					character;
				for (const i in player.storage.huashen.owned) {
					if (player.storage.huashen.owned[i].includes(skill)) {
						character = i;
						break;
					}
				}
				if (event.dialog) {
					event.dialog.close();
				}
				if (event.control) {
					event.control.close();
				}
				return Promise.resolve({
					bool: true,
					skill: skill,
					character: character,
				});
			};
			const chooseButton = function (player, list, forced) {
				const { promise, resolve } = Promise.withResolvers();
				const event = _status.event;
				player = player || event.player;
				if (!event._result) {
					event._result = {};
				}
				const prompt = forced ? "化身：选择获得一项技能" : get.prompt("huashen");
				const dialog = ui.create.dialog(prompt, [list, (item, type, position, noclick, node) => lib.skill.rehuashen.$createButton(item, type, position, noclick, node)]);
				event.dialog = dialog;
				event.forceMine = true;
				event.button = null;
				for (let i = 0; i < event.dialog.buttons.length; i++) {
					event.dialog.buttons[i].classList.add("pointerdiv");
					event.dialog.buttons[i].classList.add("selectable");
				}
				const buttons = dialog.content.querySelector(".buttons");
				const array = dialog.buttons.filter(item => !item.classList.contains("nodisplay") && item.style.display !== "none");
				const choosed = player.storage.huashen.choosed;
				const groups = array
					.map(i => get.character(i.link).group)
					.unique()
					.sort((a, b) => {
						const getNum = g => (lib.group.includes(g) ? lib.group.indexOf(g) : lib.group.length);
						return getNum(a) - getNum(b);
					});
				if (choosed.length > 0 || groups.length > 1) {
					event.dialog.style.bottom = (parseInt(event.dialog.style.top || "0", 10) + get.is.phoneLayout() ? 230 : 220) + "px";
					event.dialog.addPagination({
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
				event.dialog.open();
				event.custom.replace.button = function (button) {
					const paginationInstance = event.dialog.paginationMap?.get(event.dialog.content.querySelector(".buttons"));
					if (!event.dialog.contains(button.parentNode)) {
						return;
					}
					if (event.control) {
						event.control.style.opacity = 1;
					}
					if (button.classList.contains("selectedx")) {
						//二次选择已选择的武将牌解禁更换操作
						if (paginationInstance?.state) {
							paginationInstance.state.pageRefuseChanged = false;
						}
						event.button = null;
						button.classList.remove("selectedx");
						if (event.control) {
							event.control.replacex(["cancel2"]);
						}
					} else {
						//否则禁止更换操作
						if (paginationInstance?.state) {
							paginationInstance.state.pageRefuseChanged = true;
						}
						if (event.button) {
							event.button.classList.remove("selectedx");
						}
						button.classList.add("selectedx");
						event.button = button;
						if (event.control && button.link) {
							event.control.replacex(player.storage.huashen.owned[button.link]);
						}
					}
					game.check();
				};
				event.custom.replace.window = function () {
					//解禁更换操作
					const paginationInstance = event.dialog.paginationMap?.get(event.dialog.content.querySelector(".buttons"));
					if (paginationInstance?.state) {
						paginationInstance.state.pageRefuseChanged = false;
					}
					if (event.button) {
						event.button.classList.remove("selectedx");
						event.button = null;
					}
					if (event.control) {
						event.control.replacex(["cancel2"]);
					}
				};
				event.switchToAuto = function () {
					const cards = [];
					const skills = [];
					for (const i in player.storage.huashen.owned) {
						cards.push(i);
						skills.addArray(player.storage.huashen.owned[i]);
					}
					const cond = event.triggername == "phaseBegin" ? "in" : "out";
					skills.randomSort();
					skills.sort(function (a, b) {
						return get.skillRank(b, cond) - get.skillRank(a, cond);
					});
					_status.imchoosing = false;
					let skill = skills[0],
						character;
					for (const i in player.storage.huashen.owned) {
						if (player.storage.huashen.owned[i].includes(skill)) {
							character = i;
							break;
						}
					}
					resolve({
						bool: true,
						skill: skill,
						character: character,
					});
					if (event.dialog) {
						event.dialog.close();
					}
					if (event.control) {
						event.control.close();
					}
				};
				const controls = [];
				event.control = ui.create.control();
				event.control.replacex = function () {
					const args = Array.from(arguments)[0];
					if (args.includes("cancel2") && forced) {
						args.remove("cancel2");
						this.style.opacity = "";
					}
					args.push(function (link) {
						const result = event._result;
						if (link == "cancel2") {
							result.bool = false;
						} else {
							if (!event.button) {
								return;
							}
							result.bool = true;
							result.skill = link;
							result.character = event.button.link;
						}
						event.dialog.close();
						event.control.close();
						game.resume(); // 不再 game.resume 防止 game.loop 被重复执行
						_status.imchoosing = false;
						resolve(result);
					});
					return this.replace.apply(this, args);
				};
				if (!forced) {
					controls.push("cancel2");
					event.control.style.opacity = 1;
				}
				event.control.replacex(controls);
				game.pause(); // 暂停 game.loop 防止 game.resume2
				game.countChoose();
				return promise;
			};
			let next;
			if (event.isMine()) {
				next = chooseButton(player, cards, event.logged);
			} else if (event.isOnline()) {
				const { promise, resolve } = Promise.withResolvers();
				event.player.send(chooseButton, event.player, cards, event.logged);
				event.player.wait(async result => {
					if (result == "ai") {
						result = await switchToAuto();
					}

					resolve(result);
				}); // 不再 game.resume 防止 game.loop 被重复执行
				game.pause(); // 暂停 game.loop 防止 game.resume2
				next = promise;
			} else {
				next = switchToAuto();
			}
			const result = await next;
			// _status.paused = false; // 恢复 game.loop 但不立刻执行
			game.resume();
			result.logged = event.logged;
			event.result = {
				bool: result.bool,
				cost_data: result,
			};
		},
		async content(event, trigger, player) {
			const map = event.cost_data;
			if (!map.logged) {
				player.logSkill("huashen");
			}
			const skill = map.skill,
				character = map.character;
			player.storage.huashen.choosed.add(character);
			if (character != player.storage.huashen.current) {
				const old = player.storage.huashen.current;
				player.storage.huashen.current = character;
				player.markSkill("huashen");
				game.broadcastAll(
					function (player, character, old) {
						player.tempname.remove(old);
						player.tempname.add(character);
						player.sex = lib.character[character].sex;
						//player.group=lib.character[character][1];
						//player.node.name.dataset.nature=get.groupnature(player.group);
						/*
						const mark = player.marks.huashen;
						if (!mark) return;
						mark.style.transition = "all 0.3s";
						setTimeout(function () {
							mark.style.transition = "all 0s";
							ui.refresh(mark);
							mark.setBackground(character, "character");
							if (mark.firstChild) {
								mark.firstChild.remove();
							}
							setTimeout(function () {
								mark.style.transition = "";
								mark.show();
							}, 50);
						}, 200);
						*/
					},
					player,
					character,
					old
				);
				get.character().group;
				game.log(player, "将性别变为了", "#y" + get.translation(get.character(character).sex) + "性");
				await player.changeGroup(get.character(character).group);
			}
			player.storage.huashen.current2 = skill;
			if (!player.additionalSkills.huashen || !player.additionalSkills.huashen.includes(skill)) {
				player.flashAvatar("huashen", character);
				player.syncStorage("huashen");
				player.updateMarks("huashen");
				await player.addAdditionalSkills("huashen", skill);
				// lib.skill.rehuashen.createAudio(character,skill,'zuoci');
			}
		},
	}
```

### xinsheng 名字:新生
描述: 当你受到1点伤害后，你可以获得一张“化身牌”。
```js
xinsheng: {
		audio: 2,
		unique: true,
		trigger: { player: "damageEnd" },
		frequent: true,
		getIndex: event => event.num,
		filter(event) {
			return event.num;
		},
		async content(event, trigger, player) {
			lib.skill.huashen.addHuashens(player, 1);
		},
		ai: { combo: "huashen" },
	}
```

## wangji 名字:王基 势力:wei

### qizhi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### jinqu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## yanyan 名字:严颜 势力:shu

### nzry_juzhan 名字:拒战
描述: 转换技，阳：当你成为其他角色【杀】的目标后，你可以与其各摸一张牌，然后其本回合内不能再对你使用牌。阴：当你使用【杀】指定一名角色为目标后，你可以获得其一张牌，然后你本回合内不能再对其使用牌。
```js
nzry_juzhan: {
		audio: ["nzry_juzhan_11.mp3", "nzry_juzhan_12.mp3"],
		mark: true,
		zhuanhuanji: true,
		marktext: "☯",
		intro: {
			content(storage, player, skill) {
				if (storage) {
					return "当你使用【杀】指定一名角色为目标后，你可以获得其一张牌，然后你本回合内不能再对其使用牌";
				}
				return "当你成为其他角色【杀】的目标后，你可以与其各摸一张牌，然后其本回合内不能再对你使用牌";
			},
		},
		trigger: {
			player: "useCardToPlayered",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			if (!player.storage.nzry_juzhan) {
				return player != event.player;
			}
			return player == event.player && event.target.countGainableCards(player, "he");
		},
		logTarget(event, player) {
			return player.storage.nzry_juzhan ? event.target : event.player;
		},
		check(event, player) {
			const target = get.info("nzry_juzhan").logTarget(event, player);
			return get.attitude(player, target) < 0;
		},
		prompt2(event, player) {
			const target = get.info("nzry_juzhan").logTarget(event, player);
			return player.storage.nzry_juzhan ? `获得${get.translation(target)}一张牌，然后你本回合内不能再对其使用牌` : `与${get.translation(target)}各摸一张牌，然后其本回合内不能再对你使用牌`;
		},
		async content(event, trigger, player) {
			const { name: skill } = event,
				target = get.info(skill).logTarget(trigger, player);
			player.changeZhuanhuanji(skill);
			const storage = player.storage[skill];
			const list = [player, target];
			if (storage) {
				await game.asyncDraw([player, target].sortBySeat());
				await game.delayx();
				list.reverse();
			} else {
				await player.gainPlayerCard(target, "he", true);
			}
			list[0].addTempSkill(skill + "_effect");
			list[0].markAuto(skill + "_effect", [list[1]]);
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				mod: {
					playerEnabled(card, player, target) {
						if (player.getStorage("nzry_juzhan_effect").includes(target)) {
							return false;
						}
					},
				},
				intro: { content: "本回合不能对$使用牌" },
			},
		},
	}
```

## wangping 名字:王平 势力:shu

### nzry_feijun 名字:飞军
描述: 出牌阶段限一次。你可以弃置一张牌，然后选择一项：⒈令一名手牌数大于你的角色交给你一张牌；⒉令一名装备区里牌数大于你的角色弃置一张装备牌。
```js
nzry_feijun: {
		init: player => {
			if (!Array.isArray(player.storage.nzry_feijun)) {
				player.storage.nzry_feijun = [];
			}
		},
		intro: {
			content(storage) {
				if (!storage || !storage.length) {
					return "尚未发动";
				}
				const str = get.translation(storage);
				return "已对" + str + "发动过〖飞军〗";
			},
		},
		mark: true,
		enable: "phaseUse",
		usable: 1,
		position: "he",
		audio: 2,
		filter(event, player) {
			return (
				game.hasPlayer(function (current) {
					return current.countCards("h") >= player.countCards("h");
				}) ||
				game.hasPlayer(function (current) {
					return current.countCards("e") >= player.countCards("e");
				}) > 0
			);
		},
		filterCard: true,
		check(card) {
			return 5 - get.value(card);
		},
		async content(event, trigger, player) {
			const list = [];
			if (
				game.hasPlayer(function (current) {
					return current.countCards("h") > player.countCards("h");
				})
			) {
				list.push("令一名手牌数大于你的角色交给你一张牌");
			}
			if (
				game.hasPlayer(function (current) {
					return current.countCards("e") > player.countCards("e");
				}) > 0
			) {
				list.push("令一名装备区内牌数大于你的角色弃置一张装备牌");
			}
			if (list.length == 0) {
				return;
			}
			let index;
			if (list.length < 2) {
				if (
					game.hasPlayer(function (current) {
						return current.countCards("h") > player.countCards("h");
					})
				) {
					index = 0;
				} else {
					index = 1;
				}
			} else {
				({ index } = await player
					.chooseControl()
					.set("ai", function () {
						if (
							game.hasPlayer(function (current) {
								return current.countCards("h") > player.countCards("h") && get.attitude(player, current) < 0;
							})
						) {
							return 0;
						}
						return 1;
					})
					.set("choiceList", list)
					.forResult());
			}
			let result;
			if (index == 0) {
				result = await player
					.chooseTarget(function (card, player, target) {
						return target != player && target.countCards("h") > player.countCards("h");
					}, "选择一名手牌数大于你的角色")
					.set("ai", function (target) {
						return -get.attitude(player, target);
					})
					.forResult();
			} else {
				const next = player.chooseTarget(function (card, player, target) {
					return target.countCards("e") > player.countCards("e") && target != player;
				}, "选择一名装备区里牌数大于你的角色");
				next.ai = function (target) {
					return -get.attitude(player, target);
				};
				result = await next.forResult();
			}
			if (!result.bool) {
				return;
			}
			const target = result.targets[0];
			const list2 = player.getStorage("nzry_feijun");
			if (!list2.includes(target)) {
				event._nzry_binglve = true;
				player.markAuto("nzry_feijun", [target]);
			}
			player.line(target, "green");
			if (index == 0) {
				const result = await target
					.chooseCard("he", true, "选择一张牌交给" + get.translation(player))
					.set("ai", function (card) {
						return 6 - get.value(card);
					})
					.forResult();
				if (result.bool) {
					target.give(result.cards, player);
				}
			} else {
				await target.chooseToDiscard("he", true, { type: "equip" }, "请弃置一张装备牌");
			}
		},
		ai: {
			order: 11,
			result: {
				player(player) {
					if (
						game.hasPlayer(function (current) {
							return (current.countCards("h") > player.countCards("h") || current.countCards("e") > player.countCards("e")) && get.attitude(player, current) < 0 && player.getStorage("nzry_feijun").includes(current);
						}) ||
						game.hasPlayer(function (current) {
							return current.countCards("h") > player.countCards("h") && get.attitude(player, current) < 0;
						}) ||
						(player.countCards("h") >= 2 &&
							game.hasPlayer(function (current) {
								return current.countCards("e") > player.countCards("e") && get.attitude(player, current) < 0;
							}))
					) {
						return 1;
					}
				},
			},
		},
	}
```

### nzry_binglve 名字:兵略
描述: 锁定技，当你发动“飞军”时，若目标与你之前指定的目标均不相同，则你摸两张牌。
```js
nzry_binglve: {
		audio: 2,
		trigger: { player: "nzry_feijunAfter" },
		forced: true,
		filter(event, player) {
			return event._nzry_binglve == true;
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
		ai: { combo: "nzry_feijun" },
	}
```

## luji 名字:陆绩 势力:wu

### nzry_huaiju 名字:怀橘
描述: 锁定技，游戏开始时，你获得3个“橘”标记。（有“橘”的角色受到伤害时，防止此伤害，然后移去一个“橘”；有“橘”的角色摸牌阶段额外摸一张牌）
```js
nzry_huaiju: {
		onremove: true,
		marktext: "橘",
		intro: {
			name: "怀橘",
			name2: "橘",
			content: "当前有#个“橘”",
		},
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
			player.addMark("nzry_huaiju", 3);
			player.addSkill("nzry_huaiju_ai");
		},
		group: ["tachibana_effect"],
	}
```

### nzry_yili 名字:遗礼
描述: 出牌阶段开始时，你可以失去1点体力或移去一个“橘”，然后令一名其他角色获得一个“橘”。
```js
nzry_yili: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		async cost(event, trigger, player) {
			const next = player.chooseTarget(get.prompt(event.skill), "移去一个【橘】或失去1点体力，然后令一名其他角色获得一个【橘】", function (card, player, target) {
				return target != player;
			});
			next.ai = function (target) {
				const player = _status.event.player;
				if (player.storage.nzry_huaiju > 2 || player.hp > 2) {
					return get.attitude(player, target);
				}
				return -1;
			};
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			let index = 0;
			if (player.hasMark("nzry_huaiju")) {
				({ index } = await player
					.chooseControl()
					.set("choiceList", ["失去1点体力", "移去一个“橘”"])
					.set("ai", function () {
						if (player.hp > 2) {
							return 0;
						}
						return 1;
					})
					.forResult());
			}
			if (index == 1) {
				player.removeMark("nzry_huaiju", 1);
			} else {
				await player.loseHp();
			}
			target.addMark("nzry_huaiju", 1);
			target.addSkill("nzry_huaiju_ai");
		},
		ai: {
			combo: "nzry_huaiju",
		},
	}
```

### nzry_zhenglun 名字:整论
描述: 若你没有“橘”，你可以跳过摸牌阶段然后获得一个“橘”。
```js
nzry_zhenglun: {
		audio: 2,
		trigger: {
			player: "phaseDrawBefore",
		},
		filter(event, player) {
			return !player.hasMark("nzry_huaiju");
		},
		check(event, player) {
			return player.countCards("h") >= 2 || player.skipList.includes("phaseUse");
		},
		async content(event, trigger, player) {
			trigger.cancel();
			player.addMark("nzry_huaiju", 1);
		},
		ai: {
			combo: "nzry_huaiju",
		},
	}
```

## sunliang 名字:孙亮 势力:wu

### nzry_kuizhu 名字:溃诛
描述: 弃牌阶段结束后，你可以选择一项：①令至多X名角色各摸一张牌。②对任意名体力值之和为X的角色造成1点伤害。（X为你此阶段弃置的牌数）
```js
nzry_kuizhu: {
		audio: 2,
		trigger: {
			player: "phaseDiscardAfter",
		},
		filter(event, player) {
			const cards = [];
			player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard") == event) {
					cards.addArray(evt.cards2);
				}
			});
			return cards.length > 0;
		},
		async cost(event, trigger, player) {
			const cards = [];
			player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard") == trigger) {
					cards.addArray(evt.cards2);
				}
			});
			event.num = cards.length;
			event.str1 = "令至多" + event.num + "名角色摸一张牌";
			event.str2 = "对任意名体力值之和为" + event.num + "的角色造成1点伤害";
			const result = await player
				.chooseControl("cancel2")
				.set("ai", function () {
					const player = get.player();
					const { num } = get.event().getParent();
					if (
						game.countPlayer(function (current) {
							return get.attitude(player, current) < 0 && current.hp == num;
						}) > 0 &&
						num <= 3
					) {
						return 1;
					}
					return 0;
				})
				.set("choiceList", [event.str1, event.str2])
				.set("prompt", "是否发动【溃诛】？")
				.forResult();
			if (result.control == "cancel2") {
				return;
			}
			if (result.index == 1) {
				event.result = await player
					.chooseTarget("请选择〖溃诛〗造成伤害的目标", function (card, player, target) {
						const num = ui.selected.targets.map(t => t.hp).reduce((a, b) => a + b, 0);
						return num + target.hp <= _status.event.num;
					})
					.set("filterOk", function () {
						const num = ui.selected.targets.map(t => t.hp).reduce((a, b) => a + b);
						return num == _status.event.num;
					})
					.set("ai", function (target) {
						const player = get.player();
						if (ui.selected.targets[0] != undefined) {
							return -1;
						}
						return get.attitude(player, target) < 0;
					})
					.set("complexTarget", true)
					.set("promptbar", "none")
					.set("num", event.num)
					.set("selectTarget", [1, Infinity])
					.forResult();
				event.result.cost_data = "damage";
			} else {
				const next = player.chooseTarget("请选择〖溃诛〗摸牌的目标", [1, event.num]);
				next.ai = function (target) {
					const player = get.player();
					return get.attitude(player, target);
				};
				event.result = await next.forResult();
			}
		},
		async content(event, trigger, player) {
			const targets = event.targets.sortBySeat();
			if (event.cost_data == "damage") {
				await Promise.all(targets.map(target => target.damage()));
			} else {
				game.asyncDraw(targets);
			}
		},
	}
```

### nzry_zhizheng 名字:掣政
描述: 锁定技，你的出牌阶段内，当你对攻击范围内不包含你的角色造成伤害时，防止此伤害。出牌阶段结束时，若你本阶段内使用的牌数小于这些角色的数量，则你弃置其中一名角色的一张牌。
```js
nzry_zhizheng: {
		audio: 2,
		//mod:{
		//	playerEnabled:function(card,player,target){
		//		const info=get.info(card);
		//		if(target!=player&&(!info||!info.singleCard||!ui.selected.targets.length)&&player.isPhaseUsing()&&!target.inRange(player)) return false;
		//	},
		//},
		trigger: {
			player: "phaseUseEnd",
		},
		forced: true,
		filter(event, player) {
			return (
				player.getHistory("useCard", function (evt) {
					return evt.getParent("phaseUse") == event;
				}).length <
					game.countPlayer(function (current) {
						return current != player && !current.inRange(player);
					}) &&
				game.hasPlayer(function (target) {
					return target != player && !target.inRange(player) && target.countDiscardableCards(player, "he");
				})
			);
		},
		async content(event, trigger, player) {
			const next = player.chooseTarget("请选择〖掣政〗的目标", "弃置一名攻击范围内不包含你的角色的一张牌", true, function (card, player, target) {
				return target != player && !target.inRange(player) && target.countDiscardableCards(player, "he");
			});
			next.ai = function (target) {
				return -get.attitude(player, target);
			};
			const result = await next.forResult();
			if (result.bool) {
				player.line(result.targets);
				player.discardPlayerCard(result.targets[0], "he", 1, true);
			}
		},
		group: "rechezheng",
	}
```

### nzry_lijun 名字:立军
描述: 主公技，其他吴势力角色的出牌阶段限一次，其使用【杀】结算后，可以将此【杀】对应的实体牌交给你，然后你可以令其摸一张牌且本阶段内使用【杀】的次数上限+1。
```js
nzry_lijun: {
		global: "nzry_lijun1",
		audio: "nzry_lijun1",
		zhuSkill: true,
	}
```

## xuyou 名字:许攸 势力:qun

### nzry_chenglve 名字:成略
描述: 转换技，出牌阶段限一次，阳：你可以摸一张牌，然后弃置两张手牌。阴：你可以摸两张牌，然后弃置一张手牌。若如此做，直到本回合结束，你使用与弃置牌花色相同的牌无距离和次数限制。
```js
nzry_chenglve: {
		audio: 2,
		mark: true,
		zhuanhuanji: true,
		marktext: "☯",
		intro: {
			content(storage, player, skill) {
				const num = storage ? 2 : 1;
				return `出牌阶段限一次，你可以摸${get.cnNumber(num)}张牌，然后弃置${get.cnNumber(3 - num)}张手牌。若如此做，直到本回合结束，你使用与弃置牌花色相同的牌无距离和次数限制`;
			},
		},
		enable: "phaseUse",
		usable: 1,
		async content(event, trigger, player) {
			player.changeZhuanhuanji("nzry_chenglve");
			const num = player.storage.nzry_chenglve ? 1 : 2;
			await player.draw(num);
			if (!player.hasCard(card => lib.filter.cardDiscardable(card, player, "nzry_chenglve"), "h")) {
				return;
			}
			await game.delayx();
			const { bool, cards } = await player
				.chooseToDiscard(true, "h", 3 - num)
				.set("ai", card => {
					const player = get.player(),
						effect = player.getStorage("nzry_chenglve_effect");
					const cards = player.getCards("h").filter(i => get.tag(i, "damage") && get.type(i) != "delay" && player.hasValueTarget(i, true, false)),
						map = {};
					for (const cardx of cards) {
						const suit = get.suit(cardx, player);
						if (typeof map[suit] != "number") {
							map[suit] = 0;
						}
						map[suit]++;
					}
					const list = [];
					for (let i in map) {
						if (map[i] > 0) {
							list.push([i, map[i]]);
						}
					}
					list.sort((a, b) => b[1] - a[1]);
					if (effect.includes(get.suit(card, player))) {
						return 0;
					}
					if (list.some(i => i[0] == get.suit(card, player)) && !player.hasUseTarget(card, false)) {
						return 10;
					}
					if (player.storage.nzry_chenglve && ui.selected.cards.length && !ui.selected.cards.some(i => get.suit(i) == get.suit(card, player))) {
						return 2;
					}
					return 6 - get.value(card);
				})
				.forResult();
			if (bool) {
				const effect = "nzry_chenglve_effect";
				player.addTempSkill(effect);
				player.markAuto(effect, cards.map(card => get.suit(card, player)).unique());
				player.storage[effect].sort((a, b) => lib.suits.indexOf(b) - lib.suits.indexOf(a));
				player.addTip(effect, get.translation(effect) + player.getStorage(effect).reduce((str, suit) => str + get.translation(suit), ""));
			}
		},
		ai: {
			order(item, player) {
				if (player.countCards("h", card => get.tag(card, "damage") && get.type(card) != "delay" && player.hasValueTarget(card, true, false)) > 2) {
					return get.order({ name: "sha" }) + 0.14;
				}
				return 2.7;
			},
			result: {
				player(player) {
					if (!player.storage.nzry_chenglve && player.countCards("h") < 3) {
						return 0;
					}
					return 1;
				},
			},
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove(player, skill) {
					delete player.storage[skill];
					player.removeTip(skill);
				},
				mod: {
					cardUsable(card, player) {
						const suit = get.suit(card);
						if (suit == "unsure" || player.getStorage("nzry_chenglve_effect").includes(suit)) {
							return Infinity;
						}
					},
					targetInRange(card, player) {
						const suit = get.suit(card);
						if (suit == "unsure" || player.getStorage("nzry_chenglve_effect").includes(suit)) {
							return true;
						}
					},
				},
				marktext: "略",
				intro: { content: `本回合使用$花色的牌无距离和次数限制` },
			},
		},
	}
```

### nzry_shicai 名字:恃才
描述: 当你使用非装备牌结算结束后，或成为自己使用装备牌的目标后，若此牌为你本回合使用的首张该类型牌，则你可以将此牌置于牌堆顶，然后摸一张牌。
```js
nzry_shicai: {
		audio: "nzry_shicai_2",
		locked: false,
		mod: {
			aiOrder(player, card, num) {
				if (num <= 0 || player.nzry_shicai_aiOrder || get.itemtype(card) !== "card" || player.hasSkillTag("abnormalDraw")) {
					return num;
				}
				let type = get.type2(card, false);
				if (
					player.hasHistory("useCard", evt => {
						return get.type2(evt.card, false) == type;
					})
				) {
					return num;
				}
				player.nzry_shicai_aiOrder = true;
				let val = player.getUseValue(card, true, true);
				delete player.nzry_shicai_aiOrder;
				return 20 * val;
			},
		},
		trigger: { player: ["useCardAfter", "useCardToTargeted"] },
		prompt2(event, player) {
			const cards = event.cards.filterInD("oe");
			return "你可以将" + get.translation(cards) + (cards.length > 1 ? "以任意顺序" : "") + "置于牌堆顶，然后摸一张牌";
		},
		filter(event, player) {
			if (!event.cards.someInD()) {
				return false;
			}
			let evt = event,
				type = get.type2(evt.card, false);
			if (event.name == "useCardToTargeted") {
				if (type != "equip" || player != event.target) {
					return false;
				}
				evt = evt.getParent();
			} else {
				if (type == "equip") {
					return false;
				}
			}
			return !player.hasHistory(
				"useCard",
				evtx => {
					return evtx != evt && get.type2(evtx.card, false) == type;
				},
				evt
			);
		},
		check(event, player) {
			if (get.type(event.card) == "equip") {
				if (get.subtype(event.card) == "equip6") {
					return true;
				}
				if (get.equipResult(player, player, event.card) <= 0) {
					return true;
				}
				const eff1 = player.getUseValue(event.card);
				const subtype = get.subtype(event.card);
				return (
					player.countCards("h", function (card) {
						return get.subtype(card) == subtype && player.getUseValue(card) >= eff1;
					}) > 0
				);
			}
			return true;
		},
		async content(event, trigger, player) {
			let cards = trigger.cards.filterInD();
			if (cards.length > 1) {
				const result = await player
					.chooseToMove("恃才：将牌按顺序置于牌堆顶", true)
					.set("list", [["牌堆顶", cards]])
					.set("reverse", _status.currentPhase?.next && get.attitude(player, _status.currentPhase.next) > 0)
					.set("processAI", function (list) {
						const cards = list[0][1].slice(0);
						cards.sort(function (a, b) {
							return (_status.event.reverse ? 1 : -1) * (get.value(b) - get.value(a));
						});
						return [cards];
					})
					.forResult();
				if (!result.bool) {
					return;
				}
				cards = result.moved[0];
			}
			cards.reverse();
			await game.cardsGotoPile(cards, "insert");
			game.log(player, "将", cards, "置于了牌堆顶");
			await player.draw();
		},
		subSkill: { 2: { audio: 2 } },
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
			effect: {
				target_use(card, player, target) {
					if (
						player == target &&
						get.type(card) == "equip" &&
						!player.getHistory("useCard", function (evt) {
							return get.type(evt.card) == "equip";
						}).length
					) {
						return [1, 3];
					}
				},
			},
		},
	}
```

### nzry_cunmu 名字:寸目
描述: 锁定技，当你摸牌时，改为从牌堆底摸牌。
```js
nzry_cunmu: {
		audio: 2,
		audioname: ["ol_pengyang"],
		trigger: {
			player: "drawBegin",
		},
		forced: true,
		async content(event, trigger, player) {
			trigger.bottom = true;
		},
		ai: {
			abnormalDraw: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "abnormalDraw") {
					return !arg || arg === "bottom";
				}
			},
		},
	}
```

## yl_luzhi 名字:卢植 势力:qun

### nzry_mingren 名字:明任
描述: ①游戏开始时，你摸两张牌，然后将一张手牌置于你的武将牌上，称为“任”。②结束阶段，你可以用一张手牌替换“任”。
```js
nzry_mingren: {
		audio: "nzry_mingren_1",
		drawNum: 2,
		audioname: ["sb_yl_luzhi"],
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		locked: false,
		filter(event, player) {
			return (event.name != "phase" || game.phaseNumber == 0) && !player.getExpansions("nzry_mingren").length;
		},
		async content(event, trigger, player) {
			await player.draw(get.info(event.name).drawNum || 2);
			if (!player.countCards("h")) {
				return;
			}
			const result = await player
				.chooseCard("h", "将一张手牌置于武将牌上，称为“任”", true)
				.set("ai", function (card) {
					return 6 - get.value(card);
				})
				.forResult();
			if (result.bool) {
				const next = player.addToExpansion(result.cards[0], player, "give", "log");
				next.gaintag.add("nzry_mingren");
				await next;
			}
		},
		marktext: "任",
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
		group: ["nzry_mingren_1"],
		ai: { notemp: true },
		subSkill: {
			1: {
				audio: 2,
				audioname: ["sb_yl_luzhi"],
				trigger: { player: "phaseJieshuBegin" },
				filter(event, player) {
					return player.countCards("h") > 0 && player.getExpansions("nzry_mingren").length > 0;
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseCard("h", get.prompt(event.skill), "选择一张手牌替换“任”（" + get.translation(player.getExpansions("nzry_mingren")[0]) + "）")
						.set("ai", function (card) {
							const player = _status.event.player;
							const color = get.color(card);
							if (color == get.color(player.getExpansions("nzry_mingren")[0])) {
								return false;
							}
							let num = 0;
							const list = [];
							player.countCards("h", function (cardx) {
								if (cardx != card || get.color(cardx) != color) {
									return false;
								}
								if (list.includes(cardx.name)) {
									return false;
								}
								list.push(cardx.name);
								switch (cardx.name) {
									case "wuxie":
										num += game.countPlayer() / 2.2;
										break;
									case "caochuan":
										num += 1.1;
										break;
									case "shan":
										num += 1;
										break;
								}
							});
							return num * (30 - get.value(card));
						})
						.forResult();
				},
				async content(event, trigger, player) {
					// 考虑到getExpansions的实际执行在addToExpansion之前喵，此处调换顺序
					const card = player.getExpansions("nzry_mingren")[0];
					const next = player.addToExpansion(event.cards[0], "log", "give", player);
					next.gaintag.add("nzry_mingren");
					await next;
					if (card) {
						await player.gain(card, "gain2");
					}
				},
			},
		},
	}
```

### nzry_zhenliang 名字:贞良
描述: 转换技，阳：出牌阶段限一次，你可以弃置一张与“任”颜色相同的牌并对攻击范围内的一名角色造成1点伤害。阴：当你于回合外使用或打出的牌结算完成后，若此牌与“任”颜色相同，则你可以令一名角色摸一张牌。
```js
nzry_zhenliang: {
		audio: ["nzry_zhenliang_11.mp3", "nzry_zhenliang_12.mp3"],
		drawNum: 1,
		mark: true,
		zhuanhuanji: true,
		marktext: "☯",
		intro: {
			content(storage) {
				if (storage) {
					return "当你于回合外使用或打出的牌结算完成后，若此牌与“任”颜色相同，则你可以令一名角色摸一张牌。";
				}
				return "出牌阶段限一次，你可以弃置一张与“任”颜色相同的牌并对攻击范围内的一名角色造成1点伤害。";
			},
		},
		enable: "phaseUse",
		trigger: {
			player: ["useCardAfter", "respondAfter"],
		},
		filter(event, player) {
			const cards = player.getExpansions("nzry_mingren");
			if (!cards.length) {
				return false;
			}
			if (event.name == "chooseToUse") {
				if (player.storage.nzry_zhenliang || player.hasSkill("nzry_zhenliang_used", null, null, false)) {
					return false;
				}
				const color = get.color(cards[0]);
				if (!player.countCards("he", card => get.color(card) == color)) {
					return false;
				}
				return game.hasPlayer(current => player.inRange(current));
			} else {
				if (_status.currentPhase == player || !player.storage.nzry_zhenliang) {
					return false;
				}
				return get.color(event.card) == get.color(cards[0]);
			}
		},
		position: "he",
		filterCard(card, player) {
			return get.color(card) == get.color(player.getExpansions("nzry_mingren")[0]);
		},
		filterTarget(card, player, target) {
			return player.inRange(target);
		},
		check(card) {
			return 6.5 - get.value(card);
		},
		prompt: "弃置一张与“任”颜色相同的牌，并对攻击范围内的一名角色造成1点伤害。",
		async cost(event, trigger, player) {
			const skillName = event.name.slice(0, -5),
				num = get.info(skillName).drawNum;
			event.result = await player
				.chooseTarget(get.prompt(skillName), `令${(num > 1 ? "至多" : "") + get.cnNumber(num)}名角色${num > 1 ? "各" : ""}摸${get.cnNumber(num)}张牌`)
				.set("selectTarget", [1, num])
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "draw" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const skill = event.name;
			player.changeZhuanhuanji(skill);
			if (!trigger) {
				const target = event.target;
				player.addTempSkill(skill + "_used", "phaseUseAfter");
				await target.damage("nocard");
			} else {
				const targets = event.targets;
				if (targets.length === 1) {
					await targets[0].draw(get.info(skill).drawNum);
				} else {
					await game.asyncDraw(targets, get.info(skill).drawNum);
					await game.delayx();
				}
			}
		},
		ai: {
			order: 5,
			result: {
				player(player, target) {
					return get.damageEffect(target, player, player);
				},
			},
			combo: "nzry_mingren",
		},
		subSkill: { used: { charlotte: true } },
	}
```

## kuailiangkuaiyue 名字:蒯良蒯越 势力:wei

### nzry_jianxiang 名字:荐降
描述: 当你成为其他角色使用牌的目标时，你可令手牌数最少的一名角色摸一张牌。
```js
nzry_jianxiang: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.player != player && game.hasPlayer(current => current.isMinHandcard());
		},
		async cost(event, trigger, player) {
			const next = player.chooseTarget(get.prompt(event.skill), "令场上手牌数最少的一名角色摸一张牌", function (card, player, target) {
				return target.isMinHandcard();
			});
			next.ai = function (target) {
				const player = get.player();
				return get.attitude(player, target);
			};
			event.result = await next.forResult();
		},
		async content(event, trigger, player) {
			await event.targets[0].draw();
		},
	}
```

### nzry_shenshi 名字:审时
描述: 转换技，阳：出牌阶段限一次，你可以将一张牌交给一名除你外手牌数最多的角色，然后对其造成1点伤害，若该角色因此死亡，则你可以令一名角色将手牌摸至四张。阴：其他角色对你造成伤害后，你可以观看该角色的手牌，然后交给其一张牌，当前角色回合结束时，若此牌仍在该角色的手牌区或装备区，你将手牌摸至四张。
```js
nzry_shenshi: {
		audio: ["nzry_shenshi_11.mp3", "nzry_shenshi_12.mp3"],
		mark: true,
		locked: false,
		zhuanhuanji: true,
		marktext: "☯",
		intro: {
			content(storage, player, skill) {
				if (storage) {
					return "其他角色对你造成伤害后，你可以观看该角色的手牌，然后交给其一张牌，当前角色回合结束时，若此牌仍在该角色的手牌区或装备区，你将手牌摸至四张";
				}
				return "出牌阶段限一次，你可以将一张牌交给一名手牌数最多的角色，然后对其造成1点伤害，若该角色因此死亡，则你可以令一名角色将手牌摸至四张";
			},
		},
		enable: "phaseUse",
		trigger: { global: "damageSource" },
		filter(event, player) {
			if (!player.countCards("he")) {
				return false;
			}
			if (event.name == "chooseToUse") {
				return !player.storage.nzry_shenshi && !player.hasSkill("nzry_shenshi_used", null, null, false) && game.hasPlayer(current => get.info("nzry_shenshi").filterTarget(null, player, current));
			}
			return event.source?.isIn() && event.source != player && event.player == player && player.storage.nzry_shenshi;
		},
		discard: false,
		line: true,
		lose: false,
		delay: false,
		position: "he",
		filterCard: true,
		filterTarget(card, player, target) {
			return target != player && !game.hasPlayer(current => current != player && current.countCards("h") > target.countCards("h"));
		},
		check(card) {
			if (get.position(card) == "h") {
				return 1;
			}
			return 5 - get.value(card);
		},
		async cost(event, trigger, player) {
			const { source } = trigger;
			const { bool } = await player
				.chooseBool(get.prompt(event.name.slice(0, -5), source))
				.set("choice", (source.countCards("h") <= source.getHp() && player.countCards("h") < 4 && !source.hasSkillTag("nogain")) || get.attitude(player, source) > 0)
				.set("prompt2", "其他角色对你造成伤害后，你可以观看该角色的手牌，然后交给其一张牌，当前角色回合结束时，若此牌仍在该角色的手牌区或装备区，你将手牌摸至四张")
				.forResult();
			event.result = {
				bool: bool,
				targets: [source],
			};
		},
		prompt: "出牌阶段限一次，你可以将一张牌交给一名手牌数最多的角色，然后对其造成1点伤害，若该角色因此死亡，则你可以令一名角色将手牌摸至四张",
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.changeZhuanhuanji(event.name);
			if (!trigger) {
				player.addTempSkill(event.name + "_used", "phaseUseAfter");
				await player.give(event.cards, target);
				await target.damage("nocard");
				if (
					!game.getGlobalHistory("everything", evt => {
						if (evt.name != "die" || evt.player != target) {
							return false;
						}
						return evt.reason?.getParent() == event;
					}).length ||
					!game.hasPlayer(current => current.countCards("h") < 4)
				) {
					return;
				}
				const result = await player
					.chooseTarget("令一名角色将手牌摸至四张", (card, player, target) => {
						return target.countCards("h") < 4;
					})
					.set("ai", target => {
						return get.attitude(player, target);
					})
					.forResult();
				if (result.bool) {
					player.line(result.targets);
					await result.targets[0].drawTo(4);
				}
			} else {
				await player.viewHandcards(target);
				const result = await player
					.chooseToGive(target, "he", true, `交给${get.translation(target)}一张牌`)
					.set("ai", card => {
						return 5 - get.value(card);
					})
					.forResult();
				if (result.bool) {
					const card = result.cards[0];
					target.addGaintag(result.cards, event.name);
					player
						.when({ global: "phaseJieshuBegin" })
						.filter(evt => evt.getParent() == trigger.getParent("phase", true) && target.getCards("he").includes(card) && player.countCards("h") < 4)
						.step(async () => {
							target.removeGaintag(event.name);
							await player.drawTo(4);
						});
				}
			}
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					return get.damageEffect(target, player, target);
				},
			},
		},
		subSkill: { used: { charlotte: true } },
	}
```

## guanqiujian 名字:毌丘俭 势力:wei

### zhengrong 名字:征荣
描述: 当你使用带有「伤害」标签的基本牌或锦囊牌指定目标后，你可以将一名手牌数不小于你的目标角色的一张牌置于你的武将牌上，称为「荣」。
```js
zhengrong: {
		trigger: { player: "useCardToPlayered" },
		audio: "drlt_zhenrong",
		filter(event, player) {
			if (!event.isFirstTarget) {
				return false;
			}
			if (!["basic", "trick"].includes(get.type(event.card))) {
				return false;
			}
			if (get.tag(event.card, "damage")) {
				return game.hasPlayer(function (current) {
					return event.targets.includes(current) && current.countCards("h") >= player.countCards("h") && current.countCards("he") > 0;
				});
			}
			return false;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "将一名手牌数不小于你的目标角色的一张牌置于你的武将牌上，成为「荣」", function (card, player, target) {
					return _status.event.targets.includes(target) && target.countCards("h") >= player.countCards("h") && target.countCards("he") > 0;
				})
				.set("ai", function (target) {
					return (1 - get.attitude(_status.event.player, target)) / target.countCards("he");
				})
				.set("targets", trigger.targets)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const next = player.choosePlayerCard(target, "he", true);
			next.ai = get.buttonValue;
			const result = await next.forResult();
			if (result.bool) {
				const card = result.links[0];
				const next = player.addToExpansion(card, "give", "log", target);
				next.gaintag.add("zhengrong");
				await next;
			}
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		marktext: "荣",
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
	}
```

### hongju 名字:鸿举
描述: `觉醒技，准备阶段，若你武将牌上「荣」的数量不小于3，则你触发此技能。你可以用任意数量的手牌交换等量的「荣」。你减1点体力上限并获得技能${get.poptip("qingce")}。`
```js
hongju: {
		trigger: { player: "phaseZhunbeiBegin" },
		audio: "drlt_hongju",
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "thunder",
		derivation: "qingce",
		filter(event, player) {
			return player.getExpansions("zhengrong").length >= 3;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const cards = player.getExpansions("zhengrong");
			if (cards.length && player.countCards("h")) {
				const next = player.chooseToMove("征荣：是否交换“荣”和手牌？");
				next.set("list", [
					[get.translation(player) + "（你）的“荣”", cards],
					["手牌区", player.getCards("h")],
				]);
				next.set("filterMove", function (from, to) {
					return typeof to != "number";
				});
				next.set("processAI", function (list) {
					const player = _status.event.player,
						cards = list[0][1].concat(list[1][1]).sort(function (a, b) {
							return get.value(a) - get.value(b);
						}),
						cards2 = cards.splice(0, player.getExpansions("zhengrong").length);
					return [cards2, cards];
				});
				const result = await next.forResult();
				if (result.bool) {
					const pushs = result.moved[0],
						gains = result.moved[1];
					pushs.removeArray(player.getExpansions("zhengrong"));
					gains.removeArray(player.getCards("h"));
					if (pushs.length && pushs.length == gains.length) {
						const next = player.addToExpansion(pushs);
						next.gaintag.add("zhengrong");
						await next;
						await player.gain(gains, "gain2", "log");
					}
				}
			}
			await player.addSkills("qingce");
			game.log(player, "获得了技能", "#g【清侧】");
			await player.loseMaxHp();
		},
		ai: { combo: "zhengrong" },
	}
```

## haozhao 名字:郝昭 势力:wei

### drlt_zhengu 名字:镇骨
描述: 结束阶段，你可以选择一名其他角色，你的回合结束时和该角色的下个回合结束时，其将手牌摸至或弃至X张。（X为你的手牌数且至多为5）
```js
drlt_zhengu: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), lib.filter.notMe)
				.set("ai", target => {
					const player = get.player();
					const num = Math.min(5, player.countCards("h")) - target.countCards("h");
					const att = get.attitude(player, target);
					return num * att;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.addSkill("drlt_zhengu_mark");
			player.markAuto("drlt_zhengu_mark", [target]);
		},
		async sync(player, target) {
			const num = player.countCards("h");
			const num2 = target.countCards("h");
			if (num < num2) {
				await target.chooseToDiscard(num2 - num, true, "h", "allowChooseAll");
			} else {
				await target.drawTo(Math.min(5, num));
			}
		},
		subSkill: {
			mark: {
				charlotte: true,
				onremove: true,
				intro: { content: "你的回合结束时和$的下个回合结束时，其将手牌摸至或弃置至与你手牌数相同（至多摸至五张）" },
				audio: "drlt_zhengu",
				trigger: { global: "phaseEnd" },
				filter(event, player) {
					if (player == event.player) {
						return player.getStorage("drlt_zhengu_mark").some(current => current.isIn());
					}
					return player.getStorage("drlt_zhengu_mark").includes(event.player);
				},
				forced: true,
				logTarget(event, player) {
					return player == event.player
						? player
								.getStorage("drlt_zhengu_mark")
								.filter(current => current.isIn())
								.sortBySeat()
						: event.player;
				},
				async content(event, trigger, player) {
					if (player == trigger.player) {
						for (const target of event.targets.sortBySeat()) {
							if (!target.isIn()) {
								continue;
							}
							await lib.skill.drlt_zhengu.sync(player, target);
						}
					} else {
						const target = event.targets[0];
						player.unmarkAuto(event.name, [target]);
						if (!player.getStorage(event.name).length) {
							player.removeSkill(event.name);
						}
						await lib.skill.drlt_zhengu.sync(player, target);
					}
				},
			},
		},
	}
```

## zhugezhan 名字:诸葛瞻 势力:shu

### xinfu_zuilun 名字:罪论
描述: 结束阶段，你可以观看牌堆顶三张牌，你每满足以下一项便保留一张，然后以任意顺序放回其余的牌：1.你于此回合内造成过伤害；2.你于此回合内未弃置过牌；3.手牌数为全场最少。若均不满足，你与一名其他角色失去1点体力。
```js
xinfu_zuilun: {
		audio: 2,
		trigger: {
			player: "phaseJieshuBegin",
		},
		check(event, player) {
			let num = 0;
			if (
				player.hasHistory("lose", function (evt) {
					return evt.type == "discard";
				})
			) {
				num++;
			}
			if (!player.isMinHandcard()) {
				num++;
			}
			if (!player.getStat("damage")) {
				num++;
			}
			if (num == 3) {
				return player.hp >= 2;
			}
			return true;
		},
		prompt(event, player) {
			let num = 3;
			if (
				player.hasHistory("lose", function (evt) {
					return evt.type == "discard";
				})
			) {
				num--;
			}
			if (!player.isMinHandcard()) {
				num--;
			}
			if (!player.getStat("damage")) {
				num--;
			}
			return get.prompt("xinfu_zuilun") + "（可获得" + get.cnNumber(num) + "张牌）";
		},
		async content(event, trigger, player) {
			let num = 0;
			const cards = get.cards(3);
			await game.cardsGotoOrdering(cards);
			if (
				player.hasHistory("lose", function (evt) {
					return evt.type == "discard";
				})
			) {
				num++;
			}
			if (!player.isMinHandcard()) {
				num++;
			}
			if (!player.getStat("damage")) {
				num++;
			}
			if (num == 0) {
				await player.gain(cards, "draw");
				return;
			}
			let prompt = "罪论：将" + get.cnNumber(num) + "张牌置于牌堆顶";
			if (num < 3) {
				prompt += "并获得其余的牌";
			}
			const chooseToMove = player.chooseToMove(prompt, true);
			if (num < 3) {
				chooseToMove.set("list", [["牌堆顶", cards], ["获得"]]);
				chooseToMove.set("filterMove", function (from, to, moved) {
					if (to == 1 && moved[0].length <= _status.event.num) {
						return false;
					}
					return true;
				});
				chooseToMove.set("filterOk", function (moved) {
					return moved[0].length == _status.event.num;
				});
			} else {
				chooseToMove.set("list", [["牌堆顶", cards]]);
			}
			chooseToMove.set("num", num);
			chooseToMove.set("processAI", function (list) {
				const check = function (card) {
					const player = _status.event.player;
					const next = player.next;
					const att = get.attitude(player, next);
					const judge = next.getCards("j")[tops.length];
					if (judge) {
						return get.judge(judge)(card) * att;
					}
					return next.getUseValue(card) * att;
				};
				const cards = list[0][1].slice(0),
					tops = [];
				while (tops.length < _status.event.num) {
					list.sort(function (a, b) {
						return check(b) - check(a);
					});
					tops.push(cards.shift());
				}
				return [tops, cards];
			});
			let result = await chooseToMove.forResult();
			if (result.bool) {
				const list = result.moved[0];
				cards.removeArray(list);
				await game.cardsGotoPile(list.reverse(), "insert");
			}
			game.updateRoundNumber();
			if (cards.length) {
				await player.gain(cards, "draw");
				return;
			}
			const chooseTarget = player.chooseTarget("请选择一名角色，与其一同失去1点体力", true, function (card, player, target) {
				return target != player;
			});
			chooseTarget.ai = function (target) {
				return -get.attitude(_status.event.player, target);
			};
			result = await chooseTarget.forResult();
			player.line(result.targets[0], "fire");
			await player.loseHp();
			await result.targets[0].loseHp();
		},
	}
```

### xinfu_fuyin 名字:父荫
描述: 锁定技，你每回合第一次成为【杀】或【决斗】的目标后，若你的手牌数小于等于该角色，此牌对你无效。
```js
xinfu_fuyin: {
		trigger: {
			target: "useCardToTargeted",
		},
		forced: true,
		audio: 2,
		filter(event, player) {
			if (event.player.countCards("h") < player.countCards("h")) {
				return false;
			}
			if (event.card.name != "sha" && event.card.name != "juedou") {
				return false;
			}
			return !game.hasPlayer2(function (current) {
				return (
					current.getHistory("useCard", function (evt) {
						return evt != event.getParent() && evt.card && ["sha", "juedou"].includes(evt.card.name) && evt.targets.includes(player);
					}).length > 0
				);
			});
		},
		async content(event, trigger, player) {
			trigger.getParent().excluded.add(player);
		},
		ai: {
			effect: {
				target(card, player, target) {
					let hs = player.getCards("h", i => i !== card && (!card.cards || !card.cards.includes(i))),
						num = player.getCardUsable("sha");
					if ((card.name !== "sha" && card.name !== "juedou") || hs.length < target.countCards("h")) {
						return 1;
					}
					if (
						game.hasPlayer2(function (current) {
							return (
								current.getHistory("useCard", function (evt) {
									return evt.card && ["sha", "juedou"].includes(evt.card.name) && evt.targets.includes(player);
								}).length > 0
							);
						})
					) {
						return 1;
					}
					if (card.name === "sha") {
						num--;
					}
					hs = hs.filter(i => {
						if (!player.canUse(i, target)) {
							return false;
						}
						if (i.name === "juedou") {
							return true;
						}
						if (num && i.name === "sha") {
							num--;
							return true;
						}
						return false;
					});
					if (!hs.length) {
						return "zeroplayertarget";
					}
					num = 1 - 2 / 3 / hs.length;
					return [num, 0, num, 0];
				},
			},
		},
	}
```

## lukang 名字:陆抗 势力:wu

### drlt_qianjie 名字:谦节
描述: 锁定技，当你横置时，取消之。你不能成为延时类锦囊的目标。你不能成为其他角色拼点的目标。
```js
drlt_qianjie: {
		audio: 2,
		group: ["drlt_qianjie_1", "drlt_qianjie_2", "drlt_qianjie_3"],
		locked: true,
		ai: {
			effect: {
				target(card) {
					if (card.name == "tiesuo") {
						return "zeroplayertarget";
					}
				},
			},
		},
		subSkill: {
			1: {
				audio: "drlt_qianjie",
				trigger: {
					player: "linkBegin",
				},
				forced: true,
				filter(event, player) {
					return !player.isLinked();
				},
				async content(event, trigger, player) {
					trigger.cancel();
				},
				ai: {
					noLink: true,
				},
			},
			2: {
				mod: {
					targetEnabled(card, player, target) {
						if (get.type(card) == "delay") {
							return false;
						}
					},
				},
			},
			3: {
				ai: { noCompareTarget: true },
			},
		},
	}
```

### drlt_jueyan 名字:决堰
描述: `出牌阶段限一次，你可以废除一种装备栏，然后执行对应一项：武器栏，你本回合内使用【杀】的次数上限+3且本局游戏使用【杀】的次数上限+1；防具栏，你摸三张牌，且本局游戏手牌上限+3；坐骑栏，你本局游戏使用牌无距离限制；宝物栏，你获得${get.poptip("rejizhi")}。然后修改〖决堰〗。`
```js
drlt_jueyan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasEnabledSlot(1) || player.hasEnabledSlot(2) || player.hasEnabledSlot(5) || player.hasEnabledSlot("horse");
		},
		async content(event, trigger, player) {
			const { control } = await player
				.chooseToDisable(true)
				.set("ai", function (event, player, list) {
					if (list.includes("equip5") && !player.hasSkill("drlt_jueyan_effect")) {
						return "equip5";
					}
					if (list.includes("equip2")) {
						return "equip2";
					}
					if (
						list.includes("equip1") &&
						player.countCards("h", function (card) {
							return get.name(card, player) == "sha" && player.hasUseTarget(card);
						}) -
							player.getCardUsable("sha") >
							1
					) {
						return "equip1";
					}
					if (
						list.includes("equip5") &&
						player.countCards("h", function (card) {
							return get.type2(card, player) == "trick" && player.hasUseTarget(card);
						}) > 1
					) {
						return "equip5";
					}
				})
				.forResult();
			const bool = !player.hasSkill("drlt_jueyan_effect");
			switch (control) {
				case "equip1":
					player.addTempSkill("drlt_jueyan1");
					if (bool) {
						player.addSkill("drlt_jueyan_sha");
					}
					break;
				case "equip2":
					await player.draw(3);
					player[bool ? "addSkill" : "addTempSkill"]("drlt_jueyan3");
					break;
				case "equip3_4":
					player[bool ? "addSkill" : "addTempSkill"]("drlt_jueyan2");
					break;
				case "equip5":
					await player[bool ? "addSkills" : "addTempSkills"]("rejizhi");
					break;
			}
			if (bool) {
				player.addSkill("drlt_jueyan_effect");
			}
		},
		ai: {
			order: 13,
			result: {
				player(player) {
					if (player.hasEnabledSlot("equip2")) {
						return 1;
					}
					if (
						player.hasEnabledSlot("equip1") &&
						player.countCards("h", function (card) {
							return get.name(card, player) == "sha" && player.hasValueTarget(card);
						}) -
							player.getCardUsable("sha") >
							1
					) {
						return 1;
					}
					if (
						player.hasEnabledSlot("equip5") &&
						player.countCards("h", function (card) {
							return get.type2(card, player) == "trick" && player.hasUseTarget(card);
						}) > 1
					) {
						return 1;
					}
					return -1;
				},
			},
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
			},
			sha: {
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + 1;
						}
					},
				},
				mark: true,
				marktext: "决",
				charlotte: true,
				locked: false,
				intro: { name: "决堰 - 武器", content: "本局游戏可以多使用一张【杀】" },
			},
		},
		derivation: ["drlt_jueyan_rewrite", "rejizhi"],
	}
```

### drlt_poshi 名字:破势
描述: `觉醒技，准备阶段开始时，若你的装备栏均已被废除或体力值为1，则你减1点体力上限，将手牌摸至体力上限，失去〖决堰〗并获得${get.poptip("drlt_huairou")}。`
```js
drlt_poshi: {
		audio: 2,
		skillAnimation: true,
		animationColor: "wood",
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		juexingji: true,
		derivation: ["drlt_huairou"],
		filter(event, player) {
			return !player.hasEnabledSlot() || player.hp == 1;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			const num = player.maxHp - player.countCards("h");
			if (num > 0) {
				await player.draw(num);
			}
			await player.changeSkills(["drlt_huairou"], ["drlt_jueyan"]);
		},
	}
```

## yl_yuanshu 名字:新杀袁术 势力:qun

### drlt_yongsi 名字:庸肆
描述: 锁定技，摸牌阶段，你改为摸X张牌（X为存活势力数）；出牌阶段结束时，若你本回合：1.没有造成伤害，将手牌摸至当前体力值；2.造成的伤害超过1点，本回合手牌上限改为已损失体力值。
```js
drlt_yongsi: {
		audio: 2,
		group: ["drlt_yongsi_1", "drlt_yongsi_2"],
		locked: true,
		subSkill: {
			1: {
				audio: "drlt_yongsi",
				trigger: {
					player: "phaseDrawBegin2",
				},
				forced: true,
				filter(event, player) {
					return !event.numFixed;
				},
				async content(event, trigger, player) {
					trigger.num = game.countGroup();
				},
			},
			2: {
				audio: "drlt_yongsi",
				trigger: {
					player: "phaseUseEnd",
				},
				forced: true,
				filter(event, player) {
					let num = 0;
					player.getHistory("sourceDamage", function (evt) {
						if (evt.getParent("phaseUse") == event) {
							num += evt.num;
						}
					});
					return !num || num > 1;
				},
				async content(event, trigger, player) {
					let numx = 0;
					player.getHistory("sourceDamage", function (evt) {
						if (evt.getParent("phaseUse") == trigger) {
							numx += evt.num;
						}
					});
					if (!numx) {
						const num = player.hp - player.countCards("h");
						if (num > 0) {
							await player.draw(num);
						}
					} else {
						player.addTempSkill("drlt_yongsi1", { player: "phaseDiscardAfter" });
					}
				},
			},
		},
	}
```

### drlt_weidi 名字:伪帝
描述: 主公技，弃牌阶段开始时，若你的手牌数大于手牌上限，则你可以将至多X张手牌分别交给等量的其他群雄角色（X为你的手牌数与手牌上限之差）。
```js
drlt_weidi: {
		audio: 2,
		forceaudio: true,
		zhuSkill: true,
		trigger: { player: "phaseDiscardBegin" },
		filter(event, player) {
			if (!player.hasZhuSkill("drlt_weidi")) {
				return false;
			}
			return (
				player.needsToDiscard() > 0 &&
				game.countPlayer(function (current) {
					return current != player && current.group == "qun";
				}) > 0
			);
		},
		async cost(event, trigger, player) {
			const num = Math.min(
				player.needsToDiscard(),
				game.countPlayer(function (target) {
					return target != player && target.group == "qun";
				})
			);
			if (!num) {
				return;
			}
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt(event.skill),
					prompt2: "你可以将" + (num > 1 ? "至多" : "") + get.cnNumber(num) + "张手牌交给等量的其他群势力角色。先按顺序选中所有要给出的手牌，然后再按顺序选择等量的目标角色",
					selectCard: [1, num],
					selectTarget() {
						return ui.selected.cards.length;
					},
					filterTarget(card, player, target) {
						return target != player && target.group == "qun";
					},
					complexSelect: true,
					filterOk() {
						return ui.selected.cards.length == ui.selected.targets.length;
					},
					ai1(card) {
						const player = _status.event.player;
						const value = get.value(card, player, "raw");
						if (
							game.hasPlayer(function (target) {
								return target != player && target.group == "qun" && !ui.selected.targets.includes(target) && get.sgn(value) == get.sgn(get.attitude(player, target));
							})
						) {
							return 1 / Math.max(1, get.useful(card));
						}
						return -1;
					},
					ai2(target) {
						const player = _status.event.player;
						const card = ui.selected.cards[ui.selected.targets.length];
						if (card && get.value(card, player, "raw") < 0) {
							return -get.attitude(player, target);
						}
						return get.attitude(player, target);
					},
				})
				.forResult();
			if (event.result.bool) {
				event.result.bool = event.result.cards.length > 0;
			}
		},
		async content(event, trigger, player) {
			const list = [];
			for (let i = 0; i < event.targets.length; i++) {
				const target = event.targets[i];
				const card = event.cards[i];
				list.push([target, card]);
			}
			await game
				.loseAsync({
					gain_list: list,
					player: player,
					cards: event.cards,
					giver: player,
					animate: "giveAuto",
				})
				.setContent("gaincardMultiple");
		},
	}
```

## zhangxiu 名字:张绣 势力:qun

### drlt_xiongluan 名字:雄乱
描述: 限定技，出牌阶段，你可以废除你的判定区和装备区，然后指定一名其他角色。直到回合结束，你对其使用牌无距离和次数限制，其不能使用和打出手牌。
```js
drlt_xiongluan: {
		audio: 2,
		mod: {
			aiOrder(player, card, num) {
				if (num <= 0 || !player.isPhaseUsing() || player.needsToDiscard() || !get.tag(card, "damage")) {
					return;
				}
				return 0;
			},
			aiUseful(player, card, num) {
				if (num <= 0 || !get.tag(card, "damage")) {
					return;
				}
				return num * player.getHp();
			},
		},
		locked: false,
		enable: "phaseUse",
		skillAnimation: true,
		animationColor: "gray",
		limited: true,
		filter(event, player) {
			return !player.isDisabledJudge() || player.hasEnabledSlot();
		},
		filterTarget(card, player, target) {
			return target != player;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const disables = [];
			for (let i = 1; i <= 5; i++) {
				for (let j = 0; j < player.countEnabledSlot(i); j++) {
					disables.push(i);
				}
			}
			if (disables.length > 0) {
				await player.disableEquip(disables);
			}
			await player.disableJudge();
			const { target } = event;
			player.addTempSkill(event.name + "_effect");
			player.markAuto(event.name + "_effect", [target]);
			target.addTempSkill(event.name + "_ban");
		},
		ai: {
			order: 13,
			result: {
				target: (player, target) => {
					let hs = player.countCards("h", card => {
							if (!get.tag(card, "damage") || get.effect(target, card, player, player) <= 0) {
								return 0;
							}
							if (get.name(card, player) === "sha") {
								if (target.getEquip("bagua")) {
									return 0.5;
								}
								if (target.getEquip("rewrite_bagua")) {
									return 0.25;
								}
							}
							return 1;
						}),
						ts =
							target.hp +
							target.hujia +
							game.countPlayer(current => {
								if (get.attitude(current, target) > 0) {
									return current.countCards("hs") / 8;
								}
								return 0;
							});
					if (hs >= ts) {
						return -hs;
					}
					return 0;
				},
			},
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				mod: {
					targetInRange(card, player, target) {
						if (player.getStorage("drlt_xiongluan_effect").includes(target)) {
							return true;
						}
					},
					cardUsableTarget(card, player, target) {
						if (player.getStorage("drlt_xiongluan_effect").includes(target)) {
							return true;
						}
					},
				},
				intro: { content: "本回合对$使用牌无距离和次数限制且其不能使用和打出手牌" },
			},
			ban: {
				charlotte: true,
				mark: true,
				mod: {
					cardEnabled2(card, player) {
						if (get.position(card) == "h") {
							return false;
						}
					},
				},
				intro: { content: "本回合不能使用或打出手牌" },
				ai: {
					effect: {
						target(card, player, target) {
							if (!target._drlt_xiongluan2_effect && get.tag(card, "damage")) {
								target._drlt_xiongluan2_effect = true;
								const eff = get.effect(target, card, player, target);
								delete target._drlt_xiongluan2_effect;
								if (eff > 0) {
									return [1, -999999];
								}
								if (eff < 0) {
									return 114514;
								}
							}
						},
					},
				},
			},
		},
	}
```

### drlt_congjian 名字:从谏
描述: 当你成为锦囊牌的目标时，若此牌的目标数大于1，则你可以交给其中一名其他目标角色一张牌，然后摸一张牌，若你给出的是装备牌，改为摸两张牌。
```js
drlt_congjian: {
		audio: 2,
		audioname2: { tongyuan: "ocongjian_tongyuan" },
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return get.type(event.card) == "trick" && event.targets.length > 1 && player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					filterCard: true,
					position: "he",
					filterTarget(card, player, target) {
						return player != target && _status.event.targets.includes(target);
					},
					ai1(card) {
						const player = get.player();
						if (card.name == "du") {
							return 20;
						}
						if (player.storage.drlt_xiongluan && get.type(card) == "equip") {
							return 15;
						}
						return 6 - get.value(card);
					},
					ai2(target) {
						const player = get.player();
						const att = get.attitude(player, target);
						if (ui.selected.cards.length && ui.selected.cards[0].name == "du") {
							if (target.hasSkillTag("nodu")) {
								return 0.1;
							}
							return 1 - att;
						}
						return att - 3;
					},
					prompt: get.prompt2(event.skill),
					targets: trigger.targets,
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.give(event.cards, target, "give");
			const num = get.type(event.cards[0]) == "equip" ? 2 : 1;
			await player.draw(num);
		},
	}
```

### twjuxiang
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## chendao 名字:陈到 势力:shu

### dcwanglie 名字:往烈
描述: ①出牌阶段，你对其他角色使用的前两张牌无距离限制。②当你于出牌阶段内使用牌时，你可以令此牌不能被响应，然后你于本阶段内不能使用牌指定其他角色为目标。
```js
dcwanglie: {
		audio: "drlt_wanglie",
		locked: false,
		mod: {
			targetInRange(card, player, target) {
				if (player.hasSkill("dcwanglie_effect", null, null, false)) {
					return true;
				}
			},
		},
		trigger: {
			player: "useCard",
		},
		filter(event, player) {
			return player.isPhaseUsing() && (event.card.name == "sha" || get.type(event.card) == "trick");
		},
		preHidden: true,
		check(event, player) {
			if (player.hasSkill("dcwanglie2", null, null, false)) {
				return true;
			}
			if (["wuzhong", "kaihua", "dongzhuxianji"].includes(event.card.name)) {
				return false;
			}
			player._wanglie_temp = true;
			let eff = 0;
			for (const i of event.targets) {
				eff += get.effect(i, event.card, player, player);
			}
			delete player._wanglie_temp;
			if (eff < 0) {
				return true;
			}
			if (
				!player.countCards("h", function (card) {
					return player.hasValueTarget(card, null, true);
				})
			) {
				return true;
			}
			if (
				get.tag(event.card, "damage") &&
				!player.needsToDiscard() &&
				!player.countCards("h", function (card) {
					return get.tag(card, "damage") && player.hasValueTarget(card, null, true);
				})
			) {
				return true;
			}
			return false;
		},
		prompt2(event) {
			return "令" + get.translation(event.card) + "不能被响应，然后本阶段你使用牌只能指定自己为目标";
		},
		group: "dcwanglie_startup",
		async content(event, trigger, player) {
			trigger.nowuxie = true;
			trigger.directHit.addArray(game.players);
			player.addTempSkill("dcwanglie2", "phaseUseAfter");
		},
		subSkill: {
			startup: {
				trigger: { player: "phaseUseBegin" },
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.addTempSkill("dcwanglie_effect", "phaseUseAfter");
				},
			},
			effect: {
				forced: true,
				charlotte: true,
				firstDo: true,
				popup: false,
				trigger: { player: "useCard1" },
				filter(event, player) {
					return event.targets.some(target => target != player);
				},
				async content(event, trigger, player) {
					player.addMark("dcwanglie_effect", 1, false);
					if (player.countMark("dcwanglie_effect") >= 2) {
						player.removeSkill("dcwanglie_effect");
					}
				},
				onremove: true,
			},
		},
		ai: {
			//pretao:true,
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				//if(tag=='pretao') return true;
				if (player._wanglie_temp) {
					return false;
				}
				player._wanglie_temp = true;
				const bool = (function () {
					if (["wuzhong", "kaihua", "dongzhuxianji"].includes(arg.card.name)) {
						return false;
					}
					if (get.attitude(player, arg.target) > 0 || !player.isPhaseUsing()) {
						return false;
					}
					let cards = player.getCards("h", function (card) {
						return card != arg.card && (!arg.card.cards || !arg.card.cards.includes(card));
					});
					let sha = player.getCardUsable("sha");
					if (arg.card.name == "sha") {
						sha--;
					}
					cards = cards.filter(function (card) {
						if (card.name == "sha" && sha <= 0) {
							return false;
						}
						return player.hasValueTarget(card, null, true);
					});
					if (!cards.length) {
						return true;
					}
					if (!get.tag(arg.card, "damage")) {
						return false;
					}
					if (
						!player.needsToDiscard() &&
						!cards.filter(function (card) {
							return get.tag(card, "damage");
						}).length
					) {
						return true;
					}
					return false;
				})();
				delete player._wanglie_temp;
				return bool;
			},
		},
	}
```

## zhoufei 名字:周妃 势力:wu

### olliangyin 名字:良姻
描述: 当有牌发生移动后，若此移动事件是本回合内你拥有〖良姻〗期间的首个有牌移出游戏/移入游戏的事件，则你可以选择一名其他角色。你与其各摸一张牌/弃置一张牌，然后你可以选择你或其中的一名手牌数为X的角色，该角色回复1点体力（X为你的“箜”数）。
```js
olliangyin: {
		audio: "liangyin",
		trigger: {
			global: ["loseAfter", "addToExpansionAfter", "cardsGotoSpecialAfter", "loseAsyncAfter"],
		},
		filter(event, player, name) {
			if (event.name == "lose" || event.name == "loseAsync") {
				return event.getlx !== false && event.toStorage == true;
			}
			if (event.name == "cardsGotoSpecial") {
				return !event.notrigger;
			}
			return true;
		},
		usable: 1,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "选择一名其他角色，你与其各摸一张牌", lib.filter.notMe)
				.set("ai", function (target) {
					const player = _status.event.player,
						num = player.getExpansions("olkongsheng").length - 1;
					const att = get.attitude(player, target);
					if (att <= 0) {
						return 0;
					}
					if (target.countCards("h") == num && target.isDamaged() && get.recoverEffect(target, player, player) > 0) {
						return 3 * att;
					}
					return att;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await game.asyncDraw([player, target].sortBySeat());
			await game.delayx();
			let num = player.getExpansions("olkongsheng").length;
			let check = player => {
				if (!player.isIn() || player.isHealthy()) {
					return false;
				}
				return player.countCards("h") == num;
			};
			if (check(player) || check(target)) {
				const choiceList = ["令自己回复1点体力", "令" + get.translation(target) + "回复1点体力"];
				const choices = [];
				if (check(player)) {
					choices.push("选项一");
				} else {
					choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
				}
				if (check(target)) {
					choices.push("选项二");
				} else {
					choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
				}
				choices.push("cancel2");
				const { control } = await player
					.chooseControl(choices)
					.set("choiceList", choiceList)
					.set("prompt", "良姻：是否令一名角色回复体力？")
					.set("ai", function () {
						const player = _status.event.player,
							target = _status.event.getParent().targets[0];
						let list = _status.event.controls.slice(0),
							eff1 = 0,
							eff2 = 0;
						if (list.includes("选项一")) {
							eff1 = get.recoverEffect(player, player, player);
						}
						if (list.includes("选项二")) {
							eff2 = get.recoverEffect(target, player, player);
						}
						if (eff1 > Math.max(0, eff2)) {
							return "选项一";
						}
						if (eff2 > 0) {
							return "选项二";
						}
						return "cancel2";
					})
					.forResult();
				if (control == "选项一") {
					await player.recover();
				} else if (control == "选项二") {
					await target.recover();
				}
			}
		},
		group: "olliangyin_gain",
		subSkill: {
			gain: {
				audio: "liangyin",
				trigger: {
					global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				filter(event, player) {
					return game.hasPlayer(function (current) {
						const evt = event.getl(current);
						return evt && (evt.xs.length > 0 || evt.ss.length > 0);
					});
				},
				usable: 1,
				async cost(event, trigger, player) {
					if (!player.countCards("he") || !game.hasPlayer(current => current != player && current.countCards("he") > 0)) {
						return;
					}
					event.result = await player
						.chooseCardTarget({
							prompt: get.prompt("olliangyin"),
							prompt2: "弃置一张牌，并令一名其他角色也弃置一张牌",
							position: "he",
							filterCard: lib.filter.cardDiscardable,
							filterTarget(card, player, target) {
								return target != player && target.countCards("he") > 0;
							},
							ai1(card) {
								let player = _status.event.player;
								if (_status.event.me) {
									if (get.position(card) === _status.event.me) {
										return 12 - player.hp - get.value(card);
									}
									return 0;
								}
								return 5 - get.value(card);
							},
							ai2(target) {
								let player = _status.event.player,
									att = get.attitude(player, target);
								if (att > 0 && (_status.event.me || target.isHealthy())) {
									return -att;
								}
								if (
									att > 0 &&
									(target.countCards("he") > target.hp ||
										target.hasCard(function (card) {
											return get.value(card, target) <= 0;
										}, "e"))
								) {
									return att;
								}
								return -att;
							},
							me: (() => {
								if (player.isHealthy() || get.recoverEffect(player, player, _status.event.player) <= 0) {
									return false;
								}
								let ph = player.countCards("h"),
									num = player.getExpansions("olkongsheng").length;
								if (ph === num) {
									if (player.hasSkillTag("noh")) {
										return "h";
									}
									return "e";
								}
								if (ph - 1 === num) {
									return "h";
								}
								return false;
							})(),
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					await player.discard(event.cards);
					await target.chooseToDiscard("he", true);
					await game.delayx();
					const num = player.getExpansions("olkongsheng").length;
					const check = player => {
						if (!player.isIn() || player.isHealthy()) {
							return false;
						}
						return player.countCards("h") == num;
					};
					if (check(player) || check(target)) {
						const choiceList = ["令自己回复1点体力", "令" + get.translation(target) + "回复1点体力"];
						const choices = [];
						if (check(player)) {
							choices.push("选项一");
						} else {
							choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
						}
						if (check(target)) {
							choices.push("选项二");
						} else {
							choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
						}
						choices.push("cancel2");
						const { control } = await player
							.chooseControl(choices)
							.set("choiceList", choiceList)
							.set("prompt", "良姻：是否令一名角色回复体力？")
							.set("ai", function () {
								const player = _status.event.player,
									target = _status.event.getParent().targets[0];
								let list = _status.event.controls.slice(0),
									eff1 = 0,
									eff2 = 0;
								if (list.includes("选项一")) {
									eff1 = get.recoverEffect(player, player, player);
								}
								if (list.includes("选项二")) {
									eff2 = get.recoverEffect(target, player, player);
								}
								if (eff1 > Math.max(0, eff2)) {
									return "选项一";
								}
								if (eff2 > 0) {
									return "选项二";
								}
								return "cancel2";
							})
							.forResult();
						if (control == "选项一") {
							await player.recover();
						} else if (control == "选项二") {
							await target.recover();
						}
					}
				},
			},
		},
	}
```

### olkongsheng 名字:箜声
描述: ①准备阶段开始时，你可以将任意张牌置于你的武将牌上，称为“箜”。②结束阶段开始时，若你有不为装备牌的“箜”，则你获得“箜”中的非装备牌，然后令一名角色依次使用“箜”中的装备牌并失去1点体力。
```js
olkongsheng: {
		audio: "kongsheng",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard("he", [1, player.countCards("he")], get.prompt(event.skill), "将任意张牌作为“箜”置于武将牌上", "allowChooseAll")
				.set("ai", function (card) {
					const player = _status.event.player,
						num = player.getExpansions("olkongsheng") + ui.selected.cards.length;
					if (
						ui.selected.cards.length > 0 &&
						game.hasPlayer(function (current) {
							if (current.isHealthy() || get.recoverEffect(current, player, player) <= 0) {
								return false;
							}
							const num2 =
								current.countCards("h", function (card) {
									if (current != player) {
										return true;
									}
									return !ui.selected.cards.includes(card);
								}) + 1;
							return num == num2;
						})
					) {
						return 0;
					}
					if (get.type(card, null, false) == "equip") {
						for (const i of ui.selected.cards) {
							if (get.type(i, null, false) == "equip") {
								return 0;
							}
						}
						return 5 - get.value(card);
					}
					if (!player.hasValueTarget(card)) {
						return 1;
					}
					return 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const next = player.addToExpansion(event.cards, player, "give");
			next.gaintag.add("olkongsheng");
			await next;
		},
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
		group: "olkongsheng_kessoku",
		subSkill: {
			kessoku: {
				audio: "kongsheng",
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				locked: false,
				filter(event, player) {
					return (
						player.getExpansions("olkongsheng").filter(function (card) {
							return get.type(card, null, false) != "equip";
						}).length > 0
					);
				},
				async content(event, trigger, player) {
					let cards = player.getExpansions("olkongsheng").filter(function (card) {
						return get.type(card, null, false) != "equip";
					});
					if (cards.length) {
						await player.gain(cards, "gain2");
					}
					cards = player.getExpansions("olkongsheng");
					if (cards.length <= 0) {
						return;
					}
					const result = await player
						.chooseTarget(true, "令一名角色使用以下装备牌", get.translation(cards))
						.set("ai", function (target) {
							const player = _status.event.player;
							return get.effect(target, { name: "losehp" }, player, player);
						})
						.forResult();
					const target = result.targets[0];
					player.line(target, "green");
					while (true) {
						const cards = player.getExpansions("olkongsheng").filter(function (i) {
							return target.hasUseTarget(i);
						});
						if (cards.length) {
							let card = cards[0];
							if (cards.length > 1) {
								const result = await target
									.chooseButton(true, ["选择要使用的装备牌", cards])
									.set("ai", function (button) {
										return get.order(button.link);
									})
									.forResult();
								if (!result.bool) {
									break;
								}
								card = result.links[0];
							}
							await target.chooseUseTarget(card, true);
						} else {
							break;
						}
					}
					await target.loseHp();
				},
			},
		},
	}
```

