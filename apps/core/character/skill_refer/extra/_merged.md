# extra merged reference

## shen_guanyu 名字:神关羽 势力:shen

### wushen 名字:武神
描述: 锁定技。①你的红桃手牌均视为【杀】。②你使用红桃【杀】无距离和次数限制且不可被响应。
```js
wushen: {
		mod: {
			cardname(card, player, name) {
				if (get.suit(card) == "heart") {
					return "sha";
				}
			},
			cardnature(card, player) {
				if (get.suit(card) == "heart") {
					return false;
				}
			},
			targetInRange(card) {
				if (card.name === "sha") {
					const suit = get.suit(card);
					if (suit === "heart" || suit === "unsure") {
						return true;
					}
				}
			},
			cardUsable(card) {
				if (card.name === "sha") {
					const suit = get.suit(card);
					if (suit === "heart" || suit === "unsure") {
						return Infinity;
					}
				}
			},
		},
		audio: 2,
		trigger: { player: "useCard" },
		forced: true,
		filter(event, player) {
			return event.card.name == "sha" && get.suit(event.card) == "heart";
		},
		async content(event, trigger, player) {
			trigger.directHit.addArray(game.players);
			if (trigger.addCount !== false) {
				trigger.addCount = false;
				if (player.stat[player.stat.length - 1].card.sha > 0) {
					player.stat[player.stat.length - 1].card.sha--;
				}
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (get.tag(card, "respondSha") && current < 0) {
						return 0.6;
					}
				},
			},
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				return arg.card.name == "sha" && get.suit(arg.card) == "heart";
			},
		},
	}
```

### new_wuhun 名字:武魂
描述: 锁定技，当你受到伤害后，伤害来源获得X个“梦魇”标记（X为伤害点数）。当你死亡时，你选择一名“梦魇”标记数量最多的其他角色。该角色进行判定：若判定结果不为【桃】或【桃园结义】，则该角色死亡。
```js
new_wuhun: {
		audio: "wuhun2",
		audioname2: { sxrm_caocao: "wuhun_sxrm_caocao", tw_sxrm_caocao: "wuhun_sxrm_caocao" },
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.source && event.source.isIn();
		},
		forced: true,
		logTarget: "source",
		async content(event, trigger, player) {
			trigger.source.addMark("new_wuhun", trigger.num);
		},
		group: "new_wuhun_die",
		ai: {
			notemp: true,
			effect: {
				target: (card, player, target) => {
					if (!target.hasFriend()) {
						return;
					}
					let rec = get.tag(card, "recover"),
						damage = get.tag(card, "damage");
					if (!rec && !damage) {
						return;
					}
					if (damage && player.hasSkillTag("jueqing", false, target)) {
						return 1.7;
					}
					let die = [null, 1],
						temp;
					game.filterPlayer(i => {
						temp = i.countMark("new_wuhun");
						if (i === player && target.hp + target.hujia > 1) {
							temp++;
						}
						if (temp > die[1]) {
							die = [i, temp];
						} else if (temp === die[1]) {
							if (!die[0]) {
								die = [i, temp];
							} else if (get.attitude(target, i) < get.attitude(target, die[0])) {
								die = [i, temp];
							}
						}
					});
					if (die[0]) {
						if (damage) {
							return [1, 0, 1, (-6 * get.sgnAttitude(player, die[0])) / Math.max(1, target.hp)];
						}
						return [1, (6 * get.sgnAttitude(player, die[0])) / Math.max(1, target.hp)];
					}
				},
			},
		},
		marktext: "魇",
		intro: {
			name: "梦魇",
			content: "mark",
			onunmark: true,
		},
		subSkill: {
			die: {
				audio: "wuhun2",
				trigger: { player: "die" },
				filter(event, player) {
					return game.hasPlayer(function (current) {
						return current != player && current.hasMark("new_wuhun");
					});
				},
				forced: true,
				direct: true,
				forceDie: true,
				skillAnimation: true,
				animationColor: "soil",
				async content(event, trigger, player) {
					let maxNum = 0;
					for (const current of game.players) {
						if (current === player) {
							continue;
						}

						const markNum = current.countMark("new_wuhun");
						maxNum = Math.max(maxNum, markNum);
					}
					const num = maxNum;
					let result = await player
						.chooseTarget(true, "请选择【武魂】的目标", "令其进行判定，若判定结果不为【桃】或【桃园结义】，则其死亡", (card, player, target) => {
							return target != player && target.countMark("new_wuhun") == _status.event.num;
						})
						.set("ai", target => -get.attitude(_status.event.player, target))
						.set("forceDie", true)
						.set("num", num)
						.forResult();
					if (!result.bool) {
						return;
					}

					const target = result.targets[0];
					event.target = target;
					player.logSkill("new_wuhun_die", target);
					player.line(target, { color: [255, 255, 0] });
					await game.delay(2);
					result = await target
						.judge(card => (["tao", "taoyuan"].includes(card.name) ? 10 : -10))
						.set("judge2", result => !result.bool)
						.forResult();
					if (!result.bool) {
						await target.die();
					}
				},
			},
		},
	}
```

## shen_zhaoyun 名字:神赵云 势力:shen

### xinjuejing 名字:绝境
描述: 锁定技。①你的手牌上限+2。②当你进入或脱离濒死状态时，你摸一张牌。
```js
xinjuejing: {
		mod: {
			maxHandcard(player, num) {
				return 2 + num;
			},
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
		audio: 2,
		trigger: { player: ["dying", "dyingAfter"] },
		forced: true,
		async content(event, trigger, player) {
			await player.draw();
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (target.getHp() > 1) {
						return;
					}
					if (get.tag(card, "damage") || get.tag(card, "loseHp")) {
						return [1, 1];
					}
				},
			},
		},
	}
```

### relonghun 名字:龙魂
描述: 你可以将同花色的一至两张牌按下列规则使用或打出：红桃当【桃】，方块当火【杀】，梅花当【闪】，黑桃当【无懈可击】。若你以此法转化了两张：红色牌，则此牌回复值或伤害值+1；黑色牌，则你弃置当前回合角色一张牌。
```js
relonghun: {
		audio: 2,
		mod: {
			aiOrder(player, card, num) {
				if (num <= 0 || !player.isPhaseUsing() || player.needsToDiscard() < 2) {
					return num;
				}
				let suit = get.suit(card, player);
				if (suit === "heart") {
					return num - 3.6;
				}
			},
			aiValue(player, card, num) {
				if (num <= 0) {
					return num;
				}
				let suit = get.suit(card, player);
				if (suit === "heart") {
					return num + 3.6;
				}
				if (suit === "club") {
					return num + 1;
				}
				if (suit === "spade") {
					return num + 1.8;
				}
			},
			aiUseful(player, card, num) {
				if (num <= 0) {
					return num;
				}
				let suit = get.suit(card, player);
				if (suit === "heart") {
					return num + 3;
				}
				if (suit === "club") {
					return num + 1;
				}
				if (suit === "spade") {
					return num + 1;
				}
			},
		},
		locked: false,
		//技能发动时机
		enable: ["chooseToUse", "chooseToRespond"],
		//发动时提示的技能描述
		prompt: "将♦牌当做杀，♥牌当做桃，♣牌当做闪，♠牌当做无懈可击使用或打出",
		//动态的viewAs
		viewAs(cards, player) {
			if (cards.length) {
				var name = false,
					nature = null;
				//根据选择的卡牌的花色 判断要转化出的卡牌是闪还是火【杀】还是无懈还是桃
				switch (get.suit(cards[0], player)) {
					case "club":
						name = "shan";
						break;
					case "diamond":
						name = "sha";
						nature = "fire";
						break;
					case "spade":
						name = "wuxie";
						break;
					case "heart":
						name = "tao";
						break;
				}
				//返回判断结果
				if (name) {
					return { name: name, nature: nature };
				}
			}
			return null;
		},
		//AI选牌思路
		check(card) {
			if (ui.selected.cards.length) {
				return 0;
			}
			var player = _status.event.player;
			if (_status.event.type == "phase") {
				var max = 0;
				var name2;
				var list = ["sha", "tao"];
				var map = { sha: "diamond", tao: "heart" };
				for (var i = 0; i < list.length; i++) {
					var name = list[i];
					if (
						player.countCards("hes", function (card) {
							return (name != "sha" || get.value(card) < 5) && get.suit(card, player) == map[name];
						}) > 0 &&
						player.getUseValue({ name: name, nature: name == "sha" ? "fire" : null }) > 0
					) {
						var temp = get.order({ name: name, nature: name == "sha" ? "fire" : null });
						if (temp > max) {
							max = temp;
							name2 = map[name];
						}
					}
				}
				if (name2 == get.suit(card, player)) {
					return name2 == "diamond" ? 5 - get.value(card) : 20 - get.value(card);
				}
				return 0;
			}
			return 1;
		},
		//选牌数量
		selectCard: [1, 2],
		//确保选择第一张牌后 重新检测第二张牌的合法性 避免选择两张花色不同的牌
		complexCard: true,
		//选牌范围：手牌区和装备区和木马
		position: "hes",
		//选牌合法性判断
		filterCard(card, player, event) {
			//如果已经选了一张牌 那么第二张牌和第一张花色相同即可
			if (ui.selected.cards.length) {
				return get.suit(card, player) == get.suit(ui.selected.cards[0], player);
			}
			event = event || _status.event;
			//获取当前时机的卡牌选择限制
			var filter = event._backup.filterCard;
			//获取卡牌花色
			var name = get.suit(card, player);
			//如果这张牌是梅花并且当前时机能够使用/打出闪 那么这张牌可以选择
			if (name == "club" && filter(get.autoViewAs({ name: "shan" }, "unsure"), player, event)) {
				return true;
			}
			//如果这张牌是方片并且当前时机能够使用/打出火【杀】 那么这张牌可以选择
			if (name == "diamond" && filter(get.autoViewAs({ name: "sha", nature: "fire" }, "unsure"), player, event)) {
				return true;
			}
			//如果这张牌是黑桃并且当前时机能够使用/打出无懈 那么这张牌可以选择
			if (name == "spade" && filter(get.autoViewAs({ name: "wuxie" }, "unsure"), player, event)) {
				return true;
			}
			//如果这张牌是红桃并且当前时机能够使用/打出桃 那么这张牌可以选择
			if (name == "heart" && filter(get.autoViewAs({ name: "tao" }, "unsure"), player, event)) {
				return true;
			}
			//上述条件都不满足 那么就不能选择这张牌
			return false;
		},
		//判断当前时机能否发动技能
		filter(event, player) {
			//获取当前时机的卡牌选择限制
			var filter = event.filterCard;
			//如果当前时机能够使用/打出火【杀】并且角色有方片 那么可以发动技能
			if (filter(get.autoViewAs({ name: "sha", nature: "fire" }, "unsure"), player, event) && player.countCards("hes", { suit: "diamond" })) {
				return true;
			}
			//如果当前时机能够使用/打出闪并且角色有梅花 那么可以发动技能
			if (filter(get.autoViewAs({ name: "shan" }, "unsure"), player, event) && player.countCards("hes", { suit: "club" })) {
				return true;
			}
			//如果当前时机能够使用/打出桃并且角色有红桃 那么可以发动技能
			if (filter(get.autoViewAs({ name: "tao" }, "unsure"), player, event) && player.countCards("hes", { suit: "heart" })) {
				return true;
			}
			//如果当前时机能够使用/打出无懈可击并且角色有黑桃 那么可以发动技能
			if (filter(get.autoViewAs({ name: "wuxie" }, "unsure"), player, event) && player.countCards("hes", { suit: "spade" })) {
				return true;
			}
			return false;
		},
		ai: {
			respondSha: true,
			respondShan: true,
			//让系统知道角色“有杀”“有闪”
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
			//AI牌序
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
							}) > 0 &&
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
		//让系统知道玩家“有无懈”“有桃”
		hiddenCard(player, name) {
			if (name == "wuxie" && _status.connectMode && player.countCards("hs") > 0) {
				return true;
			}
			if (name == "wuxie") {
				return player.countCards("hes", { suit: "spade" }) > 0;
			}
			if (name == "tao") {
				return player.countCards("hes", { suit: "heart" }) > 0;
			}
		},
		group: ["relonghun_num", "relonghun_discard"],
		subSkill: {
			num: {
				trigger: { player: "useCard" },
				forced: true,
				popup: false,
				filter(event) {
					var evt = event;
					return ["sha", "tao"].includes(evt.card.name) && evt.skill == "relonghun" && evt.cards && evt.cards.length == 2;
				},
				async content(event, trigger, player) {
					trigger.baseDamage++;
				},
			},
			discard: {
				trigger: { player: ["useCardAfter", "respondAfter"] },
				forced: true,
				popup: false,
				logTarget() {
					return _status.currentPhase;
				},
				autodelay(event) {
					return event.name == "respond" ? 0.5 : false;
				},
				filter(evt, player) {
					return ["shan", "wuxie"].includes(evt.card.name) && evt.skill == "relonghun" && evt.cards && evt.cards.length == 2 && _status.currentPhase && _status.currentPhase != player && _status.currentPhase.countDiscardableCards(player, "he");
				},
				async content(event, trigger, player) {
					//game.log(trigger.card)
					//game.log(trigger.cards)
					player.line(_status.currentPhase, "green");
					await player.discardPlayerCard(_status.currentPhase, "he", true);
				},
			},
		},
	}
```

## shen_zhugeliang 名字:神诸葛亮 势力:shen

### qixing 名字:七星
描述: 游戏开始时，你将牌堆顶的七张牌置于你的武将牌上，称之为“星”。然后/摸牌阶段结束后，你可用任意数量的手牌等量交换这些“星”。
```js
qixing: {
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
			const getStars = player.addToExpansion(get.cards(7), "draw");
			getStars.gaintag.add("qixing");
			await getStars;

			// 下面内容直接复制的qixing2，仅ai做了改变
			const expansions = player.getExpansions("qixing");
			const cards = player.getCards("h");
			if (!expansions.length || !cards.length) {
				return;
			}

			const next = player.chooseToMove("七星：是否交换“星”和手牌？");
			next.set("list", [
				[`${get.translation(player)}（你）的星`, expansions],
				["手牌区", cards],
			]);
			next.set("filterMove", (from, to) => typeof to != "number");
			next.set("processAI", processAI);

			const result = await next.forResult();
			if (result.bool) {
				const pushs = result.moved[0];
				const gains = result.moved[1];
				pushs.removeArray(expansions);
				gains.removeArray(cards);
				if (!pushs.length || pushs.length !== gains.length) {
					return;
				}
				player.logSkill("qixing2");
				const addStars = player.addToExpansion(pushs, player, "giveAuto");
				addStars.gaintag.add("qixing");
				await addStars;
				await player.gain(gains, "draw");
			}

			return;

			/**
			 * @typedef {[string, Card[]]} MoveItem
			 * @typedef {MoveItem[]} MoveList
			 * @param {MoveList} list
			 * @return {[Card[], Card[]]}
			 */
			function processAI(list) {
				const player = get.player();

				const cards = list[0][1].concat(list[1][1]).sort((a, b) => get.useful(a) - get.useful(b));
				const cards2 = cards.splice(0, player.getExpansions("qixing").length);
				return [cards2, cards];
			}
		},
		intro: {
			markcount: "expansion",
			mark(dialog, content, player) {
				var content = player.getExpansions("qixing");
				if (content && content.length) {
					if (player == game.me || player.isUnderControl()) {
						dialog.addAuto(content);
					} else {
						return "共有" + get.cnNumber(content.length) + "张星";
					}
				}
			},
			content(content, player) {
				var content = player.getExpansions("qixing");
				if (content && content.length) {
					if (player == game.me || player.isUnderControl()) {
						return get.translation(content);
					}
					return "共有" + get.cnNumber(content.length) + "张星";
				}
			},
		},
		group: ["qixing2"],
		ai: {
			notemp: true,
		},
	}
```

### kuangfeng 名字:狂风
描述: 结束阶段，你可以弃置一张“星”并指定一名角色：直到你的下回合开始，该角色受到火焰伤害时，此伤害+1。
```js
kuangfeng: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.getExpansions("qixing").length;
		},
		async cost(event, trigger, player) {
			const {
				bool,
				targets,
				links: cost_data,
			} = await player
				.chooseButtonTarget({
					createDialog: [get.prompt2(event.skill), player.getExpansions("qixing")],
					selectButton: 1,
					filterTarget: true,
					ai1(button) {
						const player = get.player();
						if (
							game.hasPlayer(target => {
								return get.attitude(player, target) < 0;
							}) &&
							game.hasPlayer(target => {
								return player != target && get.attitude(player, target) > 0;
							})
						) {
							return 1;
						}
						return 0;
					},
					ai2(target) {
						return -get.attitude(get.player(), target);
					},
				})
				.forResult();
			event.result = {
				bool: bool,
				targets: targets?.sortBySeat(),
				cost_data: cost_data,
			};
		},
		async content(event, trigger, player) {
			const { targets, cost_data: cards } = event;
			targets.forEach(target => {
				target.addAdditionalSkill(`kuangfeng_${player.playerid}`, "kuangfeng2");
				target.markAuto("kuangfeng2", [player]);
			});
			player.addTempSkill("kuangfeng3", { player: "phaseBeginStart" });
			await player.loseToDiscardpile(cards);
		},
		ai: {
			combo: "qixing",
		},
	}
```

### dawu 名字:大雾
描述: 结束阶段，你可以弃置X张“星”并指定等量的角色：直到你的下回合开始，当这些角色受到非雷电伤害时，防止此伤害。
```js
dawu: {
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.getExpansions("qixing").length;
		},
		audio: 2,
		async cost(event, trigger, player) {
			const {
				bool,
				targets,
				links: cost_data,
			} = await player
				.chooseButtonTarget({
					createDialog: [get.prompt2(event.skill), player.getExpansions("qixing")],
					selectButton: [1, game.countPlayer()],
					filterTarget: true,
					selectTarget() {
						return ui.selected.buttons.length;
					},
					complexSelect: true,
					ai1(button) {
						const { player, allUse } = get.event();
						const targets = game.filterPlayer(target => {
							if (target.isMin() || target.hasSkill("biantian2") || target.hasSkill("dawu2")) {
								return false;
							}
							let att = get.attitude(player, target);
							if (att >= 4) {
								if (target.hp > 2 && (target.isHealthy() || target.hasSkillTag("maixie"))) {
									return false;
								}
								if (allUse || target.hp == 1) {
									return true;
								}
								if (target.hp == 2 && target.countCards("he") <= 2) {
									return true;
								}
							}
							return false;
						});
						if (ui.selected.buttons.length < targets.length) {
							return 1;
						}
						return 0;
					},
					ai2(target) {
						const { player, allUse } = get.event();
						if (target.isMin() || target.hasSkill("biantian2") || target.hasSkill("dawu2")) {
							return 0;
						}
						let att = get.attitude(player, target);
						if (att >= 4) {
							if (target.hp > 2 && (target.isHealthy() || target.hasSkillTag("maixie"))) {
								return 0;
							}
							if (allUse || target.hp == 1) {
								return att;
							}
							if (target.hp == 2 && target.countCards("he") <= 2) {
								return att * 0.7;
							}
							return 0;
						}
						return -1;
					},
				})
				.set("allUse", player.getExpansions("qixing").length >= game.countPlayer(current => get.attitude(player, current) > 4) * 2)
				.forResult();
			event.result = {
				bool: bool,
				targets: targets?.sortBySeat(),
				cost_data: cost_data,
			};
		},
		async content(event, trigger, player) {
			const { targets, cost_data: cards } = event;
			targets.forEach(target => {
				target.addAdditionalSkill(`dawu_${player.playerid}`, "dawu2");
				target.markAuto("dawu2", [player]);
			});
			player.addTempSkill("dawu3", { player: "phaseBeginStart" });
			await player.loseToDiscardpile(cards);
		},
		ai: {
			combo: "qixing",
		},
	}
```

## shen_lvmeng 名字:神吕蒙 势力:shen

### shelie 名字:涉猎
描述: 摸牌阶段，你可以改为从牌堆顶亮出五张牌，然后选择获得不同花色的牌各一张。
```js
shelie: {
		audio: 2,
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.changeToZero();
			const cards = get.cards(5, true);
			await player.showCards(cards, `${get.translation(player)}发动了【${get.translation(event.name)}】`, true).set("clearArena", false);
			const list = cards.map(card => get.suit(card)).unique();
			const result = await player
				.chooseCardButton(`涉猎：获取花色各不相同的牌`, cards, list.length, true)
				.set("filterButton", function (button) {
					for (let i = 0; i < ui.selected.buttons.length; i++) {
						if (get.suit(ui.selected.buttons[i].link) == get.suit(button.link)) {
							return false;
						}
					}
					return true;
				})
				.set("ai", function (button) {
					return get.value(button.link, _status.event.player);
				})
				.forResult();
			game.broadcastAll(ui.clear);
			if (result?.links?.length) {
				await player.gain(result.links, "gain2");
			}
		},
		ai: {
			threaten: 1.2,
		},
	}
```

### gongxin 名字:攻心
描述: 出牌阶段限一次，你可以观看一名其他角色的手牌，并可以展示其中一张红桃牌，然后将其弃置或置于牌堆顶。
```js
gongxin: {
		audio: 2,
		audioname: ["re_lvmeng"],
		audioname2: { gexuan: "gongxin_gexuan" },
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countCards("h");
		},
		async content(event, trigger, player) {
			const { target } = event;
			const cards = target.getCards("h");
			const result = await player
				.chooseToMove_new("攻心")
				.set("list", [
					[get.translation(target) + "的手牌", cards],
					[["弃置"], ["置于牌堆顶"]],
				])
				.set("filterOk", moved => {
					return (
						moved[1]
							.slice()
							.concat(moved[2])
							.filter(card => get.suit(card) == "heart").length == 1
					);
				})
				.set("filterMove", (from, to, moved) => {
					if (moved[0].includes(from.link) && moved[1].length + moved[2].length >= 1 && [1, 2].includes(to)) {
						return false;
					}
					return get.suit(from) == "heart";
				})
				.set("processAI", list => {
					let card = list[0][1]
						.slice()
						.filter(card => {
							return get.suit(card) == "heart";
						})
						.sort((a, b) => {
							return get.value(b) - get.value(a);
						})[0];
					if (!card) {
						return false;
					}
					return [list[0][1].slice().remove(card), [card], []];
				})
				.forResult();
			if (result.bool) {
				if (result.moved[1].length) {
					await target.discard(result.moved[1]);
				} else {
					await player.showCards(result.moved[2], get.translation(player) + "对" + get.translation(target) + "发动了【攻心】");
					await target.lose(result.moved[2], ui.cardPile, "visible", "insert");
				}
			}
		},
		ai: {
			threaten: 1.5,
			result: {
				target(player, target) {
					return -target.countCards("h");
				},
			},
			order: 10,
			expose: 0.4,
		},
	}
```

## shen_zhouyu 名字:神周瑜 势力:shen

### yeyan 名字:业炎
描述: 限定技，出牌阶段，你可以对一至三名角色造成至多共3点火焰伤害（你可以任意分配每名目标角色受到的伤害点数），若你将对一名角色分配2点或更多的火焰伤害，你须先弃置四张不同花色的手牌再失去3点体力。
```js
yeyan: {
		limited: true,
		audio: 2,
		enable: "phaseUse",
		filterCard(card, player) {
			return !ui.selected.cards.some(cardx => get.suit(cardx, player) == get.suit(card, player));
		},
		selectCard: [0, 4],
		filterTarget(card, player, target) {
			var length = ui.selected.cards.length;
			return length == 0 || length == 4;
		},
		selectTarget() {
			if (ui.selected.cards.length == 4) {
				return [1, 2];
			}
			if (ui.selected.cards.length == 0) {
				return [1, 3];
			}
			game.uncheck("target");
			return [1, 3];
		},
		complexCard: true,
		complexSelect: true,
		line: "fire",
		forceDie: true,
		animationColor: "metal",
		skillAnimation: "legend",
		check(card) {
			if (!lib.skill.yeyan.getBigFire(get.event().player)) {
				return -1;
			}
			return 1 / (get.value(card) || 0.5);
		},
		multitarget: true,
		multiline: true,
		async contentBefore(event, trigger, player) {
			player.awakenSkill(event.skill);
		},
		async content(event, trigger, player) {
			const { cards, targets } = event;

			if (cards.length !== 4) {
				await game.doAsyncInOrder(targets, target =>
					target.damage({
						num: 1,
						nature: "fire",
						nocard: true,
					})
				);
				return;
			}

			await player.loseHp(3);

			if (targets.length === 1) {
				const result = await player
					.chooseControl("2点", "3点")
					.set("prompt", "请选择伤害点数")
					.set("ai", () => "3点")
					.set("forceDie", true)
					.forResult();

				await targets[0].damage({
					num: result.control === "2点" ? 2 : 3,
					nature: "fire",
					nocard: true,
				});
			} else {
				const result = await player
					.chooseTarget("请选择受到2点伤害的角色", true, (card, player, target) => {
						return get.event().targets.includes(target);
					})
					.set("ai", () => 1)
					.set("forceDie", true)
					.set("targets", targets)
					.forResult();

				const target2 = result.targets[0];
				targets.sortBySeat();
				for (const target of targets) {
					let damageNum = 1;
					if (target === target2) {
						damageNum = 2;
					}
					await target.damage({
						num: damageNum,
						nature: "fire",
						nocard: true,
					});
				}
			}
		},
		ai: {
			order(item, player) {
				return lib.skill.yeyan.getBigFire(player) ? 10 : 1;
			},
			fireAttack: true,
			result: {
				target(player, target) {
					if (player.hasUnknown()) {
						return 0;
					}
					const att = get.sgn(get.attitude(player, target));
					const targets = game.filterPlayer(target => get.damageEffect(target, player, player, "fire") && (!lib.skill.yeyan.getBigFire(player) || (target.hp <= 3 && !target.hasSkillTag("filterDamage", null, { player: player }))));
					if (!targets.includes(target)) {
						return 0;
					}
					if (lib.skill.yeyan.getBigFire(player)) {
						if (ui.selected.targets.length) {
							return 0;
						}
						if (!(targets.length == 1 || (att < 0 && target.identity && target.identity.indexOf("zhu") != -1))) {
							return 0;
						}
					}
					return att * get.damageEffect(target, player, player, "fire");
				},
			},
		},
		getBigFire(player) {
			if (player.getDiscardableCards(player, "h").reduce((list, card) => list.add(get.suit(card, player)), []).length < 4) {
				return false;
			}
			const targets = game.filterPlayer(target => get.damageEffect(target, player, player, "fire") && target.hp <= 3 && !target.hasSkillTag("filterDamage", null, { player: player }));
			if (!targets.length) {
				return false;
			}
			if (targets.length == 1 || targets.some(target => get.attitude(player, target) < 0 && target.identity && target.identity.indexOf("zhu") != -1)) {
				let suits = player.getDiscardableCards(player, "h").reduce((map, card) => {
						const suit = get.suit(card, player);
						if (!map[suit]) {
							map[suit] = [];
						}
						return map;
					}, {}),
					cards = [];
				Object.keys(suits).forEach(i => {
					suits[i].addArray(player.getDiscardableCards(player, "h").filter(card => get.suit(card) == i));
					cards.add(suits[i].sort((a, b) => get.value(a) - get.value(b))[0]);
				});
				return player.hp + player.countCards("h", card => !cards.includes(card) && player.canSaveCard(card, player)) - 3 > 0;
			}
			return false;
		},
	}
```

### qinyin 名字:琴音
描述: 弃牌阶段结束时，若你于此阶段内弃置过两张或更多的牌，则你可以选择一项：1. 令所有角色各回复1点体力；2. 令所有角色各失去1点体力。
```js
qinyin: {
		audio: 2,
		audioname: ["mb_zhouyu"],
		trigger: { player: "phaseDiscardEnd" },
		direct: true,
		logAudio: index => (typeof index === "number" ? "qinyin" + index + ".mp3" : 2),
		logAudio2: {
			mb_zhouyu: index => (typeof index === "number" ? `qinyin_mb_zhouyu${index}.mp3` : 2),
		},
		filter(event, player) {
			var cards = [];
			player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard") == event) {
					cards.addArray(evt.cards2);
				}
			});
			return cards.length > 1;
		},
		async content(event, trigger, player) {
			event.forceDie = true;
			if (typeof event.count !== "number") {
				event.count = 1;
			}

			for (let time = event.count; time > 0; time--) {
				let recover = 0;
				let lose = 0;
				const players = game.filterPlayer();
				for (const current of players) {
					if (current.hp < current.maxHp) {
						if (get.attitude(player, current) > 0) {
							if (current.hp < 2) {
								lose--;
								recover += 0.5;
							}
							lose--;
							recover++;
						} else if (get.attitude(player, current) < 0) {
							if (current.hp < 2) {
								lose++;
								recover -= 0.5;
							}
							lose++;
							recover--;
						}
					} else {
						if (get.attitude(player, current) > 0) {
							lose--;
						} else if (get.attitude(player, current) < 0) {
							lose++;
						}
					}
				}

				const prompt = get.prompt("qinyin") + "（剩余" + get.cnNumber(time) + "次）";
				const next = player.chooseControl("失去体力", "回复体力", "cancel2", ui.create.dialog(get.prompt("qinyin"), "hidden"));
				next.set("ai", () => {
					if (lose > recover && lose > 0) {
						return 0;
					}
					if (lose < recover && recover > 0) {
						return 1;
					}
					return 2;
				});

				const result = await next.forResult();
				if (result.control === "cancel2") {
					return;
				}

				player.logSkill("qinyin", null, null, null, [result.control == "回复体力" ? 2 : 1]);
				const bool = result.control === "回复体力";
				await game.doAsyncInOrder(game.filterPlayer(), async target => {
					if (bool) {
						await target.recover();
					} else {
						await target.loseHp();
					}
				});
			}
		},
		ai: {
			expose: 0.1,
			threaten: 2,
		},
	}
```

## shen_simayi 名字:神司马懿 势力:shen

### renjie 名字:忍戒
描述: 锁定技，当你受到1点伤害后，你获得一枚“忍”标记；当你于弃牌阶段内弃置牌后，你获得等同于失去的牌数量的“忍”标记。
```js
renjie: {
		audio: "renjie2",
		trigger: { player: "damageEnd" },
		forced: true,
		group: "renjie2",
		filter(event) {
			return event.num > 0;
		},
		async content(event, trigger, player) {
			player.addMark("renjie", trigger.num);
		},
		intro: {
			name2: "忍",
			content: "mark",
		},
		marktext: "忍",
		ai: {
			maixie: true,
			maixie_hp: true,
			combo: "jilue",
			effect: {
				target(card, player, target) {
					if ((!target.hasSkill("sbaiyin") && !target.hasSkill("jilue")) || !target.hasFriend()) {
						return;
					}
					if (player.hasSkillTag("jueqing", false, target)) {
						return [1, -2];
					}
					if (get.tag(card, "damage")) {
						if (target.isHealthy() && target.getHp() > 2) {
							if (!target.hasSkill("jilue")) {
								return [0, 1];
							}
							return [0.7, 1];
						}
						return 0.7;
					}
				},
			},
		},
	}
```

### sbaiyin 名字:拜印
描述: `觉醒技，准备阶段开始时，若你的“忍”标记数不小于4，你减1点体力上限，然后获得${get.poptip("jilue")}。`
```js
sbaiyin: {
		skillAnimation: "epic",
		animationColor: "thunder",
		juexingji: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		audio: 2,
		filter(event, player) {
			return player.countMark("renjie") >= 4;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.loseMaxHp();
			await player.addSkills("jilue");
		},
		derivation: ["jilue", "jilue_guicai", "jilue_fangzhu", "jilue_jizhi", "jilue_zhiheng", "jilue_wansha"],
		ai: { combo: "renjie" },
	}
```

### lianpo 名字:连破
描述: 一名角色的回合结束时，若你本回合内杀死过角色，则你可以进行一个额外的回合。
```js
lianpo: {
		audio: 2,
		audioname: ["new_simayi"],
		trigger: { global: "phaseAfter" },
		frequent: true,
		filter(event, player) {
			return player.getStat("kill") > 0;
		},
		async content(event, trigger, player) {
			player.insertPhase();
		},
	}
```

## shen_caocao 名字:神曹操 势力:shen

### new_guixin 名字:归心
描述: 当你受到1点伤害后，你可以按照你选择的区域优先度随机获得每名其他角色区域里的一张牌，然后你翻面。
```js
new_guixin: {
		audio: "guixin",
		trigger: {
			player: "damageEnd",
		},
		filter(event, player) {
			return game.hasPlayer(cur => {
				return cur !== player && cur.countCards("hej") > 0;
			});
		},
		check(event, player) {
			if (player.isTurnedOver() || event.num > 1) {
				return true;
			}
			var num = game.countPlayer(function (current) {
				if (current.countCards("he") && current != player && get.attitude(player, current) <= 0) {
					return true;
				}
				if (current.countCards("j") && current != player && get.attitude(player, current) > 0) {
					return true;
				}
			});
			return num >= 2;
		},
		getIndex(event, player) {
			return event.num;
		},
		async content(event, trigger, player) {
			let targets = game.filterPlayer();
			targets.remove(player);
			targets.sort(lib.sort.seat);
			player.line(targets, "green");
			const control = await player
				.chooseControl("手牌区", "装备区", "判定区")
				.set("ai", function () {
					if (
						game.hasPlayer(function (current) {
							return current.countCards("j") && current != player && get.attitude(player, current) > 0;
						})
					) {
						return 2;
					}
					return Math.floor(Math.random() * 3);
				})
				.set("prompt", "请选择优先获得的区域")
				.forResult();
			const range = {
				手牌区: ["h", "e", "j"],
				装备区: ["e", "h", "j"],
				判定区: ["j", "h", "e"],
			}[control.control || "手牌区"];
			while (targets.length > 0) {
				const target = targets.shift();
				for (var i = 0; i < range.length; i++) {
					var cards = target.getCards(range[i]);
					if (cards.length) {
						var card = cards.randomGet();
						await player.gain(card, target, "giveAuto", "bySelf");
						break;
					}
				}
			}
			await player.turnOver();
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			threaten(player, target) {
				if (target.hp == 1) {
					return 2.5;
				}
				return 1;
			},
			effect: {
				target(card, player, target) {
					if (
						!target._new_guixin_eff &&
						get.tag(card, "damage") &&
						target.hp >
							(player.hasSkillTag("damageBonus", true, {
								card: card,
								target: target,
							})
								? 2
								: 1)
					) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						target._new_guixin_eff = true;
						let gain = game.countPlayer(function (current) {
							if (target == current) {
								return 0;
							}
							if (get.attitude(target, current) > 0) {
								if (current.hasCard(cardx => lib.filter.canBeGained(cardx, target, current, "new_guixin") && get.effect(current, cardx, current, current) < 0, "j")) {
									return 1.3;
								}
								return 0;
							}
							if (current.hasCard(cardx => lib.filter.canBeGained(cardx, target, current, "new_guixin") && get.effect(current, cardx, current, current) > 0, "e")) {
								return 1.1;
							}
							if (current.hasCard(cardx => lib.filter.canBeGained(cardx, target, current, "new_guixin"), "h")) {
								return 0.9;
							}
							return 0;
						});
						if (target.isTurnedOver()) {
							gain += 2.3;
						} else {
							gain -= 2.3;
						}
						delete target._new_guixin_eff;
						return [1, Math.max(0, gain)];
					}
				},
			},
		},
	}
```

### feiying
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## shen_lvbu 名字:神吕布 势力:shen

### baonu 名字:狂暴
描述: 锁定技，游戏开始时，你获得两枚“暴怒”标记；当你造成/受到1点伤害后，你获得1枚“暴怒”标记。
```js
baonu: {
		audio: 2,
		marktext: "暴",
		trigger: {
			source: "damageSource",
			player: ["damageEnd", "enterGame"],
			global: "phaseBefore",
		},
		forced: true,
		filter(event) {
			return (event.name != "damage" && (event.name != "phase" || game.phaseNumber == 0)) || event.num > 0;
		},
		async content(event, trigger, player) {
			player.addMark("baonu", trigger.name == "damage" ? trigger.num : 2);
		},
		intro: {
			name: "暴怒",
			content: "mark",
		},
		ai: {
			combo: "ol_shenfen",
			maixie: true,
			maixie_hp: true,
		},
	}
```

### wumou 名字:无谋
描述: 锁定技，当你使用普通锦囊牌时，你选择一项：1.弃置1枚“暴怒”标记；2.失去1点体力。
```js
wumou: {
		audio: 2,
		trigger: { player: "useCard" },
		forced: true,
		filter(event) {
			return get.type(event.card) == "trick";
		},
		async content(event, trigger, player) {
			if (!player.hasMark("baonu")) {
				await player.loseHp();
				return;
			}

			const result = await player
				.chooseControlList(["移去一枚【暴怒】标记", "失去1点体力"], true)
				.set("ai", (event, player) => {
					if (get.effect(player, { name: "losehp" }, player, player) >= 0) {
						return 1;
					}
					if (player.countMark("baonu") > 6) {
						return 0;
					}
					if (player.hp + player.countCards("h", "tao") > 3) {
						return 1;
					}
					return 0;
				})
				.forResult();

			if (result.index == 0) {
				player.removeMark("baonu", 1);
			} else {
				await player.loseHp();
			}
		},
		ai: {
			effect: {
				player_use(card, player) {
					if (get.type(card) == "trick" && get.value(card) < 6) {
						return [0, -2];
					}
				},
			},
			neg: true,
		},
	}
```

### ol_wuqian 名字:无前
描述: `出牌阶段，你可以弃置2枚“暴怒”标记并选择一名本回合内未选择过的其他角色，你获得技能${get.poptip("wushuang")}并令其防具无效直到回合结束。`
```js
ol_wuqian: {
		audio: 2,
		enable: "phaseUse",
		derivation: "wushuang",
		filter(event, player) {
			return player.countMark("baonu") >= 2 && game.hasPlayer(target => lib.skill.ol_wuqian.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			return target != player && !target.hasSkill("ol_wuqian_targeted");
		},
		async content(event, trigger, player) {
			const { target } = event;
			player.removeMark("baonu", 2);
			await player.addTempSkills("wushuang");
			player.popup("无双");
			// game.log(player,'获得了技能','#g【无双】');
			target.addTempSkill("ol_wuqian_targeted");
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					if (
						player.countCards("hs", card => {
							if (!player.getCardUsable({ name: card.name })) {
								return false;
							}
							if (!player.canUse(card, target)) {
								return false;
							}
							var eff1 = get.effect(target, card, player, player);
							_status.baonuCheck = true;
							var eff2 = get.effect(target, card, player, player);
							delete _status.baonuCheck;
							return eff2 > Math.max(0, eff1);
						})
					) {
						return -1;
					}
					return 0;
				},
			},
			combo: "baonu",
		},
		global: "ol_wuqian_ai",
		subSkill: {
			targeted: {
				charlotte: true,
				ai: { unequip2: true },
			},
			ai: {
				ai: {
					unequip2: true,
					skillTagFilter(player) {
						if (!_status.baonuCheck) {
							return false;
						}
					},
				},
			},
		},
	}
```

### ol_shenfen 名字:神愤
描述: 出牌阶段限一次，你可以弃置6枚“暴怒”标记并选择所有其他角色，对这些角色各造成1点伤害。然后这些角色先各弃置其装备区里的牌，再各弃置四张手牌。最后你将你的武将牌翻面。
```js
ol_shenfen: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.countMark("baonu") >= 6;
		},
		usable: 1,
		skillAnimation: true,
		animationColor: "metal",
		async content(event, trigger, player) {
			player.removeMark("baonu", 6);
			const targets = game.filterPlayer(target => target !== player);
			player.line(targets, "green");

			await game.doAsyncInOrder(targets, target => target.damage("nocard"));
			await game.doAsyncInOrder(targets, async target => {
				const cards = target.getCards("e");
				await target.discard(cards).set("delay", false);
				if (cards.length) {
					await game.delay(0.5);
				}
			});
			await game.doAsyncInOrder(targets, async target => {
				const num = target.countCards("h");
				await target.chooseToDiscard(4, "h", true).set("delay", false);
				if (num > 0) {
					await game.delay(0.5);
				}
			});
			await player.turnOver();
		},
		ai: {
			combo: "baonu",
			order: 10,
			result: {
				player(player) {
					return game.countPlayer(function (current) {
						if (current != player) {
							return get.sgn(get.damageEffect(current, player, player));
						}
					});
				},
			},
		},
	}
```

## shen_liubei 名字:神刘备 势力:shen

### nzry_longnu 名字:龙怒
描述: 转换技，锁定技，出牌阶段开始时，阳：你失去1点体力并摸等同于你损失体力值张牌，然后本回合你的红色手牌均视为火【杀】（无距离限制）；阴：你减1点体力上限并摸等同于你体力值张牌，然后本回合你的锦囊牌均视为雷【杀】（无次数限制且不计入次数限制）。
```js
nzry_longnu: {
		audio: 2,
		zhuanhuanji: true,
		mark: true,
		marktext: "☯",
		intro: {
			content(storage, player, skill) {
				if (storage) {
					return "锁定技，出牌阶段开始时，你减1点体力上限并摸体力值张牌，然后本阶段内你的锦囊牌均视为雷【杀】（无次数限制且不计入次数限制）";
				}
				return "锁定技，出牌阶段开始时，你失去1点体力并摸已损失体力值张牌，然后本阶段内你的红色手牌均视为火【杀】（无距离限制）";
			},
		},
		trigger: {
			player: "phaseUseBegin",
		},
		forced: true,
		async content(event, trigger, player) {
			const storage = player.getStorage(event.name, false);
			player.changeZhuanhuanji(event.name);
			let num;
			if (storage) {
				await player.loseMaxHp();
				num = player.getHp();
			} else {
				await player.loseHp();
				num = player.getDamagedHp();
			}
			if (num > 0) {
				await player.draw({ num });
			}
			if (storage) {
				player.addTempSkill("nzry_longnu_2", "phaseUseAfter");
			} else {
				player.addTempSkill("nzry_longnu_1", "phaseUseAfter");
			}
		},
		subSkill: {
			1: {
				charlotte: true,
				mod: {
					cardname(card, player) {
						if (get.color(card) === "red") {
							return "sha";
						}
					},
					cardnature(card, player) {
						if (get.color(card) === "red") {
							return "fire";
						}
					},
					targetInRange(card) {
						if (get.color(card) === "red") {
							return true;
						}
					},
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
				},
			},
			2: {
				charlotte: true,
				mod: {
					cardname(card, player) {
						if (["trick", "delay"].includes(lib.card[card.name].type)) {
							return "sha";
						}
					},
					cardnature(card, player) {
						if (["trick", "delay"].includes(lib.card[card.name].type)) {
							return "thunder";
						}
					},
					cardUsable(card, player) {
						if (card.name == "sha" && game.hasNature(card, "thunder")) {
							return Infinity;
						}
					},
				},
				trigger: {
					player: "useCard",
				},
				filter(event, player) {
					return event.card.name === "sha" && game.hasNature(event.card, "thunder") && event.addCount !== false;
				},
				forced: true,
				silent: true,
				async content(event, trigger, player) {
					trigger.addCount = false;
					if (player.stat[player.stat.length - 1].card.sha > 0) {
						player.stat[player.stat.length - 1].card.sha--;
					}
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
				},
			},
		},
		ai: {
			fireAttack: true,
			halfneg: true,
			threaten: 1.05,
		},
	}
```

### nzry_jieying 名字:结营
描述: 锁定技，你始终处于横置状态；已横置的角色手牌上限+2；结束阶段，你横置一名其他角色，然后令任意已横置的角色各摸一张牌。
```js
nzry_jieying: {
		audio: 2,
		trigger: {
			player: ["linkBefore", "enterGame"],
			global: "phaseBefore",
		},
		forced: true,
		filter(event, player) {
			if (event.name === "link") {
				return player.isLinked();
			}
			return (event.name != "phase" || game.phaseNumber === 0) && !player.isLinked();
		},
		async content(event, trigger, player) {
			if (trigger.name != "link") {
				await player.link(true);
			} else {
				trigger.cancel();
			}
		},
		group: "nzry_jieying_phaseJieshu",
		global: "nzry_jieying_global",
		subSkill: {
			phaseJieshu: {
				audio: "nzry_jieying",
				trigger: {
					player: "phaseJieshuBegin",
				},
				filter(event, player) {
					return game.hasPlayer(function (current) {
						return current != player && !current.isLinked();
					});
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget({
							prompt: "结营：请选择横置的目标",
							forced: true,
							filterTarget(card, player, target) {
								return target != player && !target.isLinked();
							},
							ai(target) {
								return get.effect(target, { name: "tiesuo" }, player, player);
							},
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const { targets } = event;
					await targets[0].link(true);
					const result = await player
						.chooseTarget({
							prompt: "结营：请选择摸牌的目标",
							forced: true,
							selectTarget: [1, Infinity],
							filterTarget(card, player, target) {
								return target.isLinked();
							},
							ai(target) {
								return get.effect(target, { name: "draw" }, player, player);
							},
						})
						.forResult();
					if (result?.bool && result.targets?.length) {
						result.targets.sortBySeat(player);
						player.logSkill(event.name, result.targets);
						player.line(result.targets);
						await game.asyncDraw(result.targets);
					}
				},
			},
			global: {
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						if (
							game.hasPlayer(function (current) {
								return current.hasSkill("nzry_jieying");
							}) &&
							player.isLinked()
						) {
							return num + 2;
						}
					},
				},
			},
		},
		ai: {
			noLink: true,
			effect: {
				target(card) {
					if (card.name === "tiesuo") {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

## shen_luxun 名字:神陆逊 势力:shen

### nzry_junlve 名字:军略
描述: 锁定技，当你受到或造成伤害后，你获得X个“军略”标记(X为伤害点数)。
```js
nzry_junlve: {
		audio: 2,
		intro: { content: "当前有#个标记" },
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		filter(event, player) {
			return event.num > 0;
		},
		forced: true,
		async content(event, trigger, player) {
			player.addMark(event.name, trigger.num);
		},
		ai: { combo: "nzry_cuike" },
	}
```

### nzry_cuike 名字:摧克
描述: 出牌阶段开始时，若“军略”标记的数量为奇数，你可以对一名角色造成1点伤害；若“军略”标记的数量为偶数，你可以横置一名角色并弃置其区域内的一张牌。然后，若“军略”标记的数量超过7个，你可以移去全部“军略”标记并对所有其他角色造成1点伤害。
```js
nzry_cuike: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		async cost(event, trigger, player) {
			const str = player.countMark("nzry_junlve") % 2 == 1 ? "对一名角色造成1点伤害" : "横置一名角色并弃置其区域内的一张牌";
			event.result = await player
				.chooseTarget(get.prompt(event.skill), str)
				.set("ai", target => {
					const player = get.player();
					const num = player.countMark("nzry_junlve") % 2;
					if (num == 1) {
						return get.damageEffect(target, player, player);
					}
					return get.effect(target, { name: "guohe_copy" }, player, player) + (!target.isLinked() ? 2 : 0);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { targets } = event;
			const [target] = targets;
			if (player.countMark("nzry_junlve") % 2 == 1) {
				await target.damage();
			} else {
				await target.link(true);
				await player.discardPlayerCard(target, 1, "hej", true);
			}
			if (player.countMark("nzry_junlve") <= 7) {
				return;
			}
			const targetsx = game.filterPlayer(target => target !== player);
			const result = await player
				.chooseBool(`是否弃置所有“军略”标记${targetsx.length ? `并对${get.translation(targetsx)}造成1点伤害` : ""}？`)
				.set("choice", targetsx.reduce((num, target) => num + get.damageEffect(target, player, player), 0) > 0)
				.forResult();
			if (result?.bool) {
				player.line(targetsx);
				player.clearMark("nzry_junlve");
				await game.doAsyncInOrder(targetsx, target => target.damage());
			}
		},
		ai: {
			notemp: true,
		},
	}
```

### nzry_dinghuo 名字:绽火
描述: 限定技，出牌阶段，你可以移去全部“军略”标记，令至多等量的已横置角色弃置所有装备区内的牌。然后，你对其中一名角色造成1点火焰伤害。
```js
nzry_dinghuo: {
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "metal",
		enable: "phaseUse",
		filter(event, player) {
			return player.countMark("nzry_junlve") > 0 && game.hasPlayer(current => current.isLinked());
		},
		check(event, player) {
			const targets = game.filterPlayer(current => get.attitude(player, current) < 0 && current.isLinked());
			const num = targets.length;
			return player.countMark("nzry_junlve") >= num && (num == game.countPlayer(current => get.attitude(player, current) < 0) || (num <= 2 && targets.filter(current => current.countCards("e") > 0).length > 0));
		},
		filterTarget(card, player, target) {
			return target.isLinked();
		},
		selectTarget() {
			return [1, _status.event.player.countMark("nzry_junlve")];
		},
		multiline: true,
		multitarget: true,
		async content(event, trigger, player) {
			let { targets } = event;
			player.awakenSkill(event.name);
			player.clearMark("nzry_junlve");
			for (const target of targets.sortBySeat()) {
				await target.discard(target.getCards("e"));
			}
			targets = targets.filter(current => current.isIn());
			if (!targets.length) {
				return;
			}
			const result = await player
				.chooseTarget(true, "对一名目标角色造成1点火焰伤害", (card, player, target) => {
					return _status.event.targets.includes(target);
				})
				.set("targets", targets)
				.set("ai", target => {
					const player = get.player();
					return get.damageEffect(target, player, player, "fire");
				})
				.forResult();
			if (result?.bool) {
				await result.targets[0].damage("fire");
			}
		},
		ai: {
			order: 1,
			fireAttack: true,
			combo: "nzry_junlve",
			result: {
				target(player, target) {
					if (target.hasSkillTag("nofire")) {
						return 0;
					}
					if (lib.config.mode == "versus") {
						return -1;
					}
					if (player.hasUnknown()) {
						return 0;
					}
					return get.damageEffect(target, player) - target.countCards("e");
				},
			},
		},
	}
```

## shen_zhangliao 名字:神张辽 势力:shen

### drlt_duorui 名字:夺锐
描述: 当你于出牌阶段内对一名其他角色造成伤害后，你可以废除你装备区内的一个装备栏（若已全部废除则可以跳过此步骤），然后获得该角色的一个技能直到其的下回合结束或其死亡(觉醒技，限定技，主公技，隐匿技，使命技等特殊技能除外)。若如此做，该角色该技能失效且你不能再发动〖夺锐〗直到你失去以此法获得的技能。
```js
drlt_duorui: {
		audio: 2,
		init(player, skill) {
			if (!player.storage.drlt_duorui) {
				player.storage.drlt_duorui = [];
			}
		},
		trigger: {
			source: "damageSource",
		},
		filter(event, player) {
			if (player.storage.drlt_duorui.length || event.player === player) {
				return false;
			}
			return event.player.isIn() && _status.currentPhase == player;
		},
		check(event, player) {
			if (get.attitude(_status.event.player, event.player) >= 0) {
				return false;
			}
			if (player.hasEnabledSlot() && !player.hasEnabledSlot(5)) {
				return false;
			}
			return true;
		},
		bannedList: ["bifa", "buqu", "gzbuqu", "songci", "funan", "xinfu_guhuo", "reguhuo", "huashen", "rehuashen", "old_guhuo", "shouxi", "xinpojun", "taoluan", "xintaoluan", "xinfu_yingshi", "zhenwei", "zhengnan", "xinzhengnan"],
		logTarget: "player",
		async content(event, trigger, player) {
			const skills = getFilteredSkills(trigger.player);
			event.skills = skills;

			if (player.hasEnabledSlot()) {
				const next = player.chooseToDisable();
				next.set("ai", (event, player, list) => {
					if (list.includes("equip5")) {
						return "equip5";
					}
					return list.randomGet();
				});
				await next;
			}

			if (!skills.length) {
				return;
			}

			const result = await player
				.chooseButton(["请选择要获得的技能", [skills, "skill"]], true)
				.set("ai", () => Math.random())
				.forResult();

			player.addTempSkills(result.links, { player: "dieAfter" });
			player.storage.drlt_duorui = result.links;
			player.storage.drlt_duorui_player = trigger.player;
			trigger.player.storage.drlt_duorui = result.links;
			trigger.player.addTempSkill("drlt_duorui1", { player: "phaseAfter" });

			return;

			/**
			 * 获取能获得的技能列表
			 *
			 * @param {Player} player - 角色对象
			 * @returns {string[]} 技能列表
			 */
			function getFilteredSkills(player) {
				const result = [];

				if (player.name1 != null) {
					result.push(...lib.character[player.name1][3]);
				} else {
					result.push(...lib.character[player.name][3]);
				}

				if (player.name2 != null) {
					result.push(...lib.character[player.name2][3]);
				}

				return result.filter(skill => {
					const info = get.info(skill);
					return info && !info.charlotte && !info.persevereSkill && !info.hiddenSkill && !info.zhuSkill && !info.juexingji && !info.limited && !info.dutySkill && !(info.unique && !info.gainable) && !lib.skill.drlt_duorui.bannedList.includes(skill);
				});
			}
		},
		group: ["duorui_clear"],
	}
```

### drlt_zhiti 名字:止啼
描述: 锁定技。①你攻击范围内已受伤的其他角色手牌上限-1；②当你和已受伤的角色拼点或【决斗】胜利/受到已受伤角色造成的伤害后，若对方/伤害来源在你的攻击范围内，则你恢复一个装备栏。
```js
drlt_zhiti: {
		audio: 2,
		trigger: {
			global: ["juedouAfter", "chooseToCompareAfter", "compareMultipleAfter"],
			player: "damageEnd",
		},
		filter(event, player) {
			if (!player.hasDisabledSlot()) {
				return false;
			}
			if (event.name == "juedou") {
				if (![event.player, event.target].includes(player)) {
					return false;
				}
				if (!event.turn || event.turn === player) {
					return false;
				}
				const opposite = event.player === player ? event.target : event.player;
				return opposite?.isIn() && opposite.inRangeOf(player) && opposite.isDamaged();
			} else if (event.name == "damage") {
				const opposite = event.source;
				return opposite?.isIn() && opposite.inRangeOf(player) && opposite.isDamaged();
			} else {
				if (![event.player, event.target].includes(player)) {
					return false;
				}
				if (event.preserve) {
					return false;
				}
				let opposite;
				if (player === event.player) {
					if (event.num1 > event.num2) {
						opposite = event.target;
					} else {
						return false;
					}
				} else {
					if (event.num1 < event.num2) {
						opposite = event.player;
					} else {
						return false;
					}
				}
				return opposite?.isIn() && opposite.inRangeOf(player) && opposite.isDamaged();
			}
		},
		forced: true,
		async content(event, trigger, player) {
			await player.chooseToEnable();
		},
		global: "g_drlt_zhiti",
	}
```

## shen_ganning 名字:神甘宁 势力:shen

### drlt_poxi 名字:魄袭
描述: 出牌阶段限一次，你可以观看一名其他角色的手牌，然后你可以弃置你与其手牌中的四张花色不同的牌。若如此做，根据此次弃置你的牌的数量执行以下效果：零张，扣减1点体力上限；一张，你结束出牌阶段且本回合手牌上限-1；三张，你回复1点体力；四张，你摸四张牌。
```js
drlt_poxi: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0;
			//return target!=player;
		},
		async content(event, trigger, player) {
			const { target } = event;
			const playerCards = player.getCards("h");
			const targetCards = target.getCards("h");
			const playerDiscarding = [];
			const targetDiscarding = [];
			event.list1 = playerDiscarding;
			event.list2 = targetDiscarding;

			/** @type {GameEvent} */
			let next;
			if (playerCards.length > 0) {
				next = player.chooseButton(4, ["你的手牌", playerCards, `${get.translation(target.name)}的手牌`, targetCards]);
			} else {
				next = player.chooseButton(4, [`${get.translation(target.name)}的手牌`, target.getCards("h")]);
			}
			next.set("target", target);
			next.set("filterButton", filterButton);
			next.set("ai", processAI);

			const result = await next.forResult();
			if (!result.bool) {
				return;
			}

			// 弃牌
			const cards = result.links;
			for (const card of cards) {
				if (get.owner(card) === player) {
					playerDiscarding.push(card);
				} else {
					targetDiscarding.push(card);
				}
			}
			await discardMultiples([
				[player, playerDiscarding],
				[target, targetDiscarding],
			]);

			switch (playerDiscarding.length) {
				case 0:
					await player.loseMaxHp();
					break;
				case 1: {
					let evt = get.event();
					const records = new Set();
					while (true) {
						if (records.has(evt)) {
							break;
						}
						if (evt && evt.getParent) {
							records.add(evt);
							evt = evt.getParent();
						}
						if (evt.name === "phaseUse") {
							evt.skipped = true;
							break;
						}
					}
					player.addTempSkill("drlt_poxi1", { player: "phaseAfter" });
					break;
				}
				case 3:
					await player.recover();
					break;
				case 4:
					await player.draw(4);
					break;
			}

			return;

			/**
			 * @param {Button} button
			 * @returns {boolean}
			 */
			function filterButton(button) {
				const player = get.player();

				if (get.owner(button.link) && !lib.filter.canBeDiscarded(button.link, get.owner(button.link), player)) {
					return false;
				}

				return ui.selected.buttons.every(other => get.suit(button.link) !== get.suit(other.link));
			}

			/**
			 * @param {Button} button
			 * @returns {number}
			 */
			function processAI(button) {
				const { player, target } = get.event();

				const targetCards = target.getCards("h");
				/** @type {Card[]} */
				const chosenCards = ui.selected.buttons.map(buttonx => buttonx.link);
				const targetChosen = chosenCards.filter(card => targetCards.includes(card));

				const card = button.link;
				const owner = get.owner(card);
				const val = get.value(card) || 1;

				if (owner == target) {
					if (targetChosen.length > 1) {
						return 0;
					}
					if (targetChosen.length == 0 || player.hp > 3) {
						return val;
					}
					return 2 * val;
				}

				return 7 - val;
			}

			/**
			 * @param {[Player, Card[]][]} items
			 * @returns {GameEvent?}
			 */
			async function discardMultiples(items) {
				const losingList = items.filter(([_, cards]) => cards.length);
				if (losingList.length > 1) {
					return game
						.loseAsync({
							lose_list: losingList,
							discarder: losingList[0][0],
						})
						.setContent("discardMultiple");
				} else if (losingList.length === 1) {
					const [loser, cards] = losingList[0];
					return loser.discard(cards);
				} else {
					return null;
				}
			}
		},
		ai: {
			order: 6,
			result: {
				target(target, player) {
					return -1;
				},
			},
		},
	}
```

### drlt_jieying 名字:劫营
描述: 回合开始时，若场上没有拥有“营”标记的角色，你获得1个“营”标记；结束阶段，你可以将你的一个“营”标记交给一名角色；有“营”标记的角色摸牌阶段多摸一张牌，出牌阶段使用【杀】的次数上限+1，手牌上限+1。有“营”的其他角色回合结束时，其移去“营”标记，然后你获得其所有手牌。
```js
drlt_jieying: {
		audio: 2,
		trigger: { global: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed && event.player.hasMark("drlt_jieying_mark");
		},
		forced: true,
		locked: false,
		logTarget: "player",
		async content(event, trigger, player) {
			trigger.num++;
		},
		global: "drlt_jieying_mark",
		group: ["drlt_jieying_1", "drlt_jieying_2", "drlt_jieying_3"],
		subSkill: {
			1: {
				audio: "drlt_jieying",
				trigger: { player: "phaseBegin" },
				filter(event, player) {
					return !game.hasPlayer(current => current.hasMark("drlt_jieying_mark"));
				},
				forced: true,
				async content(event, trigger, player) {
					player.addMark("drlt_jieying_mark", 1);
				},
			},
			2: {
				audio: "drlt_jieying",
				trigger: { player: "phaseJieshuBegin" },
				filter(event, player) {
					return (
						player.hasMark("drlt_jieying_mark") &&
						game.hasPlayer(target => {
							return target != player && !target.hasMark("drlt_jieying_mark");
						})
					);
				},
				async cost(event, trigger, player) {
					const prompt = get.prompt("drlt_jieying");
					const prompt2 = "将“营”交给一名角色；其摸牌阶段多摸一张牌，出牌阶段使用【杀】的次数上限+1且手牌上限+1。该角色回合结束后，其移去“营”标记，然后你获得其所有手牌。";
					const filterTarget = (card, player, target) => target !== player && !target.hasMark("drlt_jieying_mark");
					const next = player.chooseTarget(prompt, prompt2, filterTarget);
					next.set("ai", processAI);

					event.result = await next.forResult();

					return;

					/**
					 * @param {Player} target
					 * @returns {number}
					 */
					function processAI(target) {
						const th = target.countCards("h");
						const att = get.attitude(_status.event.player, target);
						for (const skill in target.skills) {
							const info = get.info(skill);
							if (!info) {
								continue;
							}
							if (get.skillInfoTranslation(skill, target).includes("【杀】")) {
								return Math.abs(att);
							}
						}
						if (att > 0) {
							if (th > 3 && target.hp > 2) {
								return 0.6 * th;
							}
						}
						if (att < 1) {
							if (target.countCards("j", { name: "lebu" })) {
								return 1 + Math.min((1.5 + th) * 0.8, target.getHandcardLimit() * 0.7);
							}
							if (!th || target.getEquip("zhangba") || target.getEquip("guanshi")) {
								return 0;
							}
							if (!target.inRange(player) || player.countCards("hs", { name: "shan" }) > 1) {
								return Math.min((1 + th) * 0.3, target.getHandcardLimit() * 0.2);
							}
						}
						return 0;
					}
				},
				async content(event, trigger, player) {
					const { targets } = event;
					const [target] = targets;

					const mark = player.countMark("drlt_jieying_mark");
					player.removeMark("drlt_jieying_mark", mark);
					target.addMark("drlt_jieying_mark", mark);
				},
				ai: {
					effect: {
						player(card, player, target) {
							if (get.name(card) === "lebu" && get.attitude(player, target) < 0) {
								return 1 + Math.min((target.countCards("h") + 1.5) * 0.8, target.getHandcardLimit() * 0.7);
							}
						},
					},
				},
			},
			3: {
				audio: "drlt_jieying",
				trigger: { global: "phaseEnd" },
				filter(event, player) {
					return player != event.player && event.player.hasMark("drlt_jieying_mark") && event.player.isIn();
				},
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					let next = null;
					if (trigger.player.countCards("h") > 0) {
						next = trigger.player.give(trigger.player.getCards("h"), player);
					}
					trigger.player.clearMark("drlt_jieying_mark");
					if (next) {
						await next;
					}
				},
			},
			mark: {
				marktext: "营",
				intro: {
					name2: "营",
					content: "mark",
				},
				mod: {
					cardUsable(card, player, num) {
						if (player.hasMark("drlt_jieying_mark") && card.name == "sha") {
							return (
								num +
								game.countPlayer(function (current) {
									return current.hasSkill("drlt_jieying");
								})
							);
						}
					},
					maxHandcard(player, num) {
						if (player.hasMark("drlt_jieying_mark")) {
							return (
								num +
								game.countPlayer(function (current) {
									return current.hasSkill("drlt_jieying");
								})
							);
						}
					},
					aiOrder(player, card, num) {
						if (
							player.hasMark("drlt_jieying_mark") &&
							game.hasPlayer(current => {
								return current.hasSkill("drlt_jieying") && current != player && get.attitude(player, current) <= 0;
							})
						) {
							return Math.max(num, 0) + 1;
						}
					},
				},
				ai: {
					nokeep: true,
					skillTagFilter(player) {
						return (
							player.hasMark("drlt_jieying_mark") &&
							game.hasPlayer(current => {
								return current.hasSkill("drlt_jieying") && current != player;
							})
						);
					},
				},
			},
		},
	}
```

