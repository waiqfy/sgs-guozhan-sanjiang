# tw merged reference

## tw_jushou 名字:TW界沮授 势力:qun

### twjianying 名字:渐营
描述: ①当你使用与你使用的上一张牌点数或花色相同的牌时，你可以摸一张牌。②每回合限一次，你可以将一张牌当做你使用的上一张非装备牌使用且无次数限制。若你于此阶段内使用的上一张牌有花色，则此牌的花色视为上一张牌的花色。
```js
twjianying: {
		audio: "xinjianying",
		subfrequent: ["draw"],
		enable: "chooseToUse",
		usable: 1,
		filter(event, player) {
			const card = event.twjianying_vcard;
			if (!card) return false;
			const suit = event.twjianying_suit || null;
			return player.hasCard(cardx => {
				const vcard = get.autoViewAs({ ...card, suit, cards: [cardx], storage: { twjianying: true } }, [cardx]);
				return event.filterCard(vcard, player, event);
			}, "hes");
		},
		viewAs(cards, player) {
			const event = get.event();
			const card = event.twjianying_vcard;
			const suit = event.twjianying_suit || null;
			return { ...card, suit, storage: { twjianying: true } };
		},
		filterCard: true,
		position: "hes",
		check(card) {
			const player = get.player();
			if (get.event().type !== "phase") return 7 - get.value(card);
			return 7 - player.getUseValue(card, null, true);
		},
		async precontent(event, trigger, player) {
			event.getParent().addCount = false;
		},
		prompt(event, player) {
			return "将一张牌当做" + get.translation(event.twjianying_vcard) + (event.twjianying_suit ? "(" + get.translation(event.twjianying_suit) + ")" : "") + "使用";
		},
		onChooseToUse(event) {
			if (!game.online) {
				const player = event.player;
				const last = player.getLastUsed();
				if (last && lib.phaseName.some(phase => last.getParent(phase) === event.getParent(phase))) {
					const suit = get.suit(last.card, false);
					if (suit != "none") {
						event.set("twjianying_suit", suit);
					}
				}
				const history = player.getAllHistory("useCard");
				if (history.length) {
					for (let num = history.length - 1; num >= 0; num--) {
						const trigger = history[num];
						if (get.type(trigger.card) !== "equip") {
							event.set("twjianying_vcard", { name: trigger.card.name, nature: trigger.card.nature });
							break;
						}
					}
				}
			}
		},
		hiddenCard(player, name) {
			if (!player.hasCards("hes") || player.getStat().skill?.twjianying) return false;
			const history = player.getAllHistory("useCard");
			if (history.length) {
				for (let num = history.length - 1; num >= 0; num--) {
					const trigger = history[num];
					if (get.type(trigger.card) !== "equip") return name === trigger.card.name;
				}
			}
			return false;
		},
		locked: false,
		mod: {
			cardUsable(card, player, num) {
				if (card?.storage?.twjianying) return Infinity;
			},
		},
		ai: {
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (arg === "respond") return false;
				return lib.skill.twjianying.hiddenCard(player, { respondSha: "sha", respondShan: "shan" }[tag]);
			},
			order(item, player) {
				const event = get.event();
				player = player || event.player;
				if (
					player.hasCard(card => {
						return player.getUseValue(card, null, true) > player.getUseValue(event.twjianying_vcard);
					}, "hs")
				)
					return 0;
				return get.order(event.twjianying_vcard, player) - 0.1;
			},
			result: { player: 7 },
		},
		group: ["twjianying_draw", "twjianying_mark"],
		init(player, skill) {
			var history = player.getAllHistory("useCard");
			if (history.length) {
				for (let num = history.length - 1; num >= 0; num--) {
					const trigger = history[num];
					if (num === history.length - 1) {
						if (get.suit(trigger.card, player) !== "none" && typeof get.number(trigger.card, player) === "number") {
							player.setStorage(skill, trigger.card, true);
							game.broadcastAll(
								function (player, suit, skill) {
									if (player.marks[skill]) {
										player.marks[skill].firstChild.innerHTML = get.translation(suit);
									}
								},
								player,
								get.suit(trigger.card, player),
								skill
							);
						} else {
							player.unmarkSkill(skill);
						}
					}
					if (get.type(trigger.card) !== "equip") {
						player.addTip(skill, [skill, { name: trigger.card.name, nature: trigger.card.nature }].map(get.translation).join(" "));
						break;
					}
				}
			}
		},
		onremove(player, skill) {
			player.removeTip(skill);
			delete player.storage[skill];
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
			onunmark(storage, player, skill) {
				delete player.storage[skill];
			},
		},
		subSkill: {
			draw: {
				audio: "twjianying",
				inherit: "dcjianying",
			},
			mark: {
				charlotte: true,
				trigger: { player: "useCard1" },
				silent: true,
				async content(event, trigger, player) {
					const skill = get.sourceSkillFor(event.name);
					lib.skill[skill].init(player, skill);
				},
			},
		},
	}
```

### dcshibei
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## huan_xiaoqiao 名字:幻小乔 势力:wu

### twshuyin 名字:姝音
描述: 你每回合首次使用一种花色的牌后，可选择一项：1.你下次使用的♥️牌（装备牌与延时锦囊牌除外）额外结算一次；2.令一名角色将一张牌作为“芳妍”牌置于你的武将牌上，否则失去1点体力。
```js
twshuyin: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return !player.getStorage("twshuyin_used").includes(get.suit(event.card));
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseButtonTarget({
					createDialog: [
						"姝音：你可选择一项",
						[
							[
								["effect", "你下次使用的♥️牌（装备牌与延时锦囊牌除外）额外结算一次"],
								["gain", "令一名角色将一张牌作为“芳妍”牌置于你的武将牌上，否则失去1点体力。"],
							],
							"textbutton",
						],
					],
					filterTarget(card, player, target) {
						if (!ui.selected.buttons?.length || ui.selected.buttons[0].link == "effect") {
							return false;
						}
						return true;
					},
					selectTarget() {
						if (!ui.selected.buttons?.length || ui.selected.buttons[0].link == "effect") {
							return -1;
						}
						return 1;
					},
					complexSelect: true,
					ai1(button) {
						return 1 + Math.random();
					},
					ai2(target) {
						if (!ui.selected.buttons?.length || ui.selected.buttons[0].link == "effect") {
							return 0;
						}
						return -get.attitude(get.player(), target);
					},
				})
				.forResult();
			if (result?.bool && result.links?.length) {
				event.result = {
					bool: true,
					cost_data: result.links[0],
				};
				if (result.targets?.length) {
					event.result.targets = result.targets;
				}
			}
		},
		async content(event, trigger, player) {
			const { targets, cost_data: link } = event;
			player.addTempSkill(event.name + "_used");
			player.markAuto(event.name + "_used", [get.suit(trigger.card)]);
			if (targets?.length) {
				const target = targets[0];
				const result = target.hasCards("he")
					? await target
							.chooseCard({
								prompt: `将一张牌作为“芳妍”牌置于${get.translation(player)}的武将牌上或失去1点体力`,
								ai(card) {
									const { player, target } = get.event();
									if (get.attitude(target, player) > 0) {
										return 114514 - get.value(card);
									} else if (["tao", "jiu"].includes(card.name)) {
										return 0;
									}
									return 6 - get.value(card);
								},
							})
							.set("target", player)
							.forResult()
					: { bool: false };
				if (result?.bool && result.cards?.length) {
					await player.addToExpansion({ cards: result.cards, source: target, animate: "give", gaintag: ["twfangyan"] });
				} else {
					await target.loseHp();
				}
			} else {
				player.addSkill(event.name + "_effect");
				//player.addMark(event.name + "_effect", 1, false);
			}
		},
		subSkill: {
			effect: {
				audio: "twshuyin",
				charlotte: true,
				mark: true,
				intro: { content: "下次使用红桃牌额外结算一次" },
				forced: true,
				locked: false,
				trigger: { player: "useCard" },
				filter(event, player) {
					return get.suit(event.card) == "heart" && !["equip", "delay"].includes(get.type(event.card));
				},
				async content(event, trigger, player) {
					trigger.effectCount++;
					player.removeSkill(event.name);
				},
			},
			used: { charlotte: true, onremove: true, intro: { content: "本回合已使用：$" } },
		},
	}
```

### twfangyan 名字:芳妍
描述: 锁定技，准备阶段或当你的体力值减少后，你获得武将牌上所有“芳妍”牌并摸等量张牌。除“芳妍”牌包含的花色外，你所有其他牌的花色均视为♥️。
```js
twfangyan: {
		audio: 2,
		forced: true,
		trigger: { player: ["changeHpAfter", "phaseZhunbeiBegin"] },
		filter(event, player) {
			return (event.name == "phaseZhunbei" || event.changedHp < 0) && player.hasExpansions("twfangyan");
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions(event.name);
			if (cards?.length) {
				await player.gain({ cards, animate: "gain2" });
				await player.draw({ num: cards.length });
			}
		},
		mod: {
			suit(card, suit) {
				const player = get.owner(card) || get.player();
				if (!player) {
					return;
				}
				let suits = player
					.getExpansions("twfangyan")
					.map(cardx => cardx.suit)
					.unique();
				suits = lib.suit.slice().removeArray(suits);
				if (suits.includes(suit)) {
					return "heart";
				}
			},
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
		ai: { combo: "twshuyin" },
	}
```

## huan_fazheng 名字:幻法正 势力:wu

### twanshu 名字:暗疏
描述: 出牌阶段限一次，你可弃置一名角色至多两个区域内的各一张牌，然后将这些牌交给另一名角色，该角色使用其中的：①非伤害牌结算后摸一张牌；②伤害类牌无次数限制。
```js
twanshu: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => get.info("twanshu").filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target.hasCards("hej");
		},
		async content(event, trigger, player) {
			const target = event.target;
			if (!target.hasCards("hej")) return;
			let result;
			result = await player
				.discardPlayerCard({
					prompt: `暗疏：请弃置${get.translation(target)}至多两个区域内的各一张牌`,
					target,
					position: "hej",
					filterButton(button, player) {
						if (!ui.selected.buttons?.length) return true;
						return get.position(button.link) != get.position(ui.selected.buttons[0].link);
					},
					forced: true,
					selectButton: [1, 2],
				})
				.set("target", target)
				.forResult();
			if (result?.bool && result.links?.length) {
				const cards = result.links;
				await target.modedDiscard({ cards, discarder: player });
				const bool = game.hasPlayer(current => current != player && current != target);
				result = bool
					? await player
							.chooseTarget({
								prompt: `暗疏：将${get.translation(cards)}交给一名角色`,
								filterTarget(card, player, target) {
									return target != get.event().target;
								},
								forced: true,
								ai(target) {
									return get.attitude(target, get.player());
								},
							})
							.set("target", target)
							.forResult()
					: { bool: true, targets: [player] };
				if (result?.bool && result.targets?.length) {
					const targetx = result.targets[0];
					player.line(targetx);
					await targetx.gain({ cards, animate: "giveAuto", gaintag: ["twanshu_tag"], source: player });
					targetx.addSkill("twanshu_tag");
				}
			}
		},
		subSkill: {
			tag: {
				charlotte: true,
				onremove(player, skill) {
					player.removeGaintag(skill);
				},
				silent: true,
				mod: {
					cardUsable(card) {
						if (get.number(card) === "unsure" || card.cards?.some(card => card.hasGaintag("twanshu_tag"))) {
							return Infinity;
						}
					},
				},
				trigger: {
					player: ["useCardAfter", "useCard"],
				},
				filter(event, player, name) {
					const evtx = name == "useCard" ? event : event.getParent();
					if (
						!player.hasHistory("lose", evt => {
							if (evt.getParent(name == "useCard" ? 1 : 2) !== evtx) {
								return false;
							}
							return Object.values(evt.gaintag_map).flat().includes("twanshu_tag");
						})
					) {
						return false;
					}
					if (name == "useCard") {
						return event.addCount != false && get.is.damageCard(event.card);
					}
					return !get.is.damageCard(event.card);
				},
				async content(event, trigger, player) {
					if (event.triggername == "useCard") {
						trigger.addCount = false;
						const stat = player.getStat().card,
							name = trigger.card.name;
						if (typeof stat[name] === "number") {
							stat[name]--;
						}
					} else {
						await player.draw();
					}
				},
			},
		},
		ai: {
			order: 9,
			result: {
				player: 1,
				target(player, target) {
					return get.effect(target, { name: "guohe_copy" }, player, player) > 0;
				},
			},
		},
	}
```

### twtongce 名字:通策
描述: `游戏开始时，你获得技能${get.poptip("twyishi")}，然后你可令一名其他角色交给你一张牌并获得${get.poptip("twyishi")}。`
```js
twtongce: {
		audio: 2,
		derivation: "twyishi",
		forced: true,
		locked: false,
		trigger: {
			player: "enterGame",
			global: "phaseBefore",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		async content(event, trigger, player) {
			await player.addSkills("twyishi");
			const result = await player
				.chooseTarget({
					prompt: `通策：你可令一名其他角色交给你一张牌并获得${get.poptip("twyishi")}`,
					filterTarget: lib.filter.notMe,
					ai(target) {
						return get.attitude(get.player(), target) > 0;
					},
				})
				.forResult();
			if (result?.bool && result.targets?.length) {
				const target = result.targets[0];
				player.line(target);
				if (target.hasGainableCards(player, "he")) {
					await target.chooseToGive({ forced: true, position: "he", target: player });
				}
				await target.addSkills("twyishi");
			}
		},
	}
```

## tw_baosanniang 名字:TW鲍三娘 势力:shu

### twshuyong 名字:姝勇
描述: 当你使用或打出【杀】时，你可以获得一名其他角色区域里的一张牌，若本轮你以此法获得其区域里的牌数大于2，其摸一张牌。
```js
twshuyong: {
		audio: "xinfu_wuniang",
		trigger: {
			player: ["useCard", "respond"],
		},
		filter(event, player) {
			return event.card.name == "sha" && game.hasPlayer(current => current != player && current.hasCards("he"));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget(card, player, target) {
						return target.hasGainableCards(player, "hej") && target != player;
					},
					ai(target) {
						return get.effect(target, { name: "shunshou_copy" }, get.player(), get.player());
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const [target] = event.targets;
			await player.gainPlayerCard(target, "hej", true);
			if (player.getRoundHistory("gain", evt => evt.getParent(2).name == event.name && evt.getParent(2).targets.includes(target)).length > 2) {
				await target.draw();
			}
		},
	}
```

### twxushen 名字:许身
描述: `限定技，每轮开始时或出牌阶段，你可以摸至多四张牌并失去等量体力；若你因此进入了濒死状态，你脱离濒死状态后，可以将${get.poptip("twwushen")}、${get.poptip("redangxian")}、${get.poptip("rezhiman")}中的任意个分配给本次濒死结算中令你回复过体力的角色（若其已有对应技能则摸三张牌）。`
```js
twxushen: {
		audio: "xinfu_xushen",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		derivation: ["twwushen", "redangxian", "rezhiman"],
		trigger: { global: "roundStart" },
		async cost(event, trigger, player) {
			const controls = [...[1, 2, 3, 4].map(i => get.cnNumber(i) + "点"), "cancel2"];
			const result = await player
				.chooseControl({
					controls,
					prompt: "许身：你可以摸至多四张牌并失去等量体力",
					ai() {
						const { controls, player } = get.event();
						if (!player.hasCards("hs", card => ["tao", "jiu"].includes(card.name))) {
							return "cancel2";
						}
						const num = game
							.filterPlayer(
								target =>
									get.attitude(target, player) > 0 &&
									target.hasCard(card => {
										return lib.filter.cardSavable(card, player);
									}, "hs")
							)
							.reduce((sum, target) => {
								const cards = target.getCards("hs", card => lib.filter.cardSavable(card, player));
								return sum + cards.reduce((sum2, card) => sum2 + (get.tag(card, "recover") || 0), 0);
							}, 0);
						const minHp = player.getHp() + num;
						return minHp <= 1 ? "cancel2" : Math.min(2, Math.max(0, minHp - 1));
					},
				})
				.forResult();
			if (typeof result?.index == "number" && result.control != "cancel2") {
				event.result = {
					bool: true,
					cost_data: result.index,
				};
			}
		},
		async content(event, trigger, player) {
			const num = event.cost_data + 1;
			player.awakenSkill(event.name);
			player.addTempSkill(event.name + "_effect");
			await player.draw({ num });
			await player.loseHp(num);
		},
		enable: "phaseUse",
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("###许身###" + get.skillInfoTranslation("twxushen", null, false));
			},
			chooseControl(event, player) {
				const choices = [...[1, 2, 3, 4].map(i => get.cnNumber(i) + "点"), "cancel2"];
				return choices;
			},
			check() {
				const player = get.player();
				const num = game
					.filterPlayer(
						target =>
							get.attitude(target, player) > 0 &&
							target.hasCard(card => {
								return lib.filter.cardSavable(card, player);
							}, "hs")
					)
					.reduce((sum, target) => {
						const cards = target.getCards("hs", card => lib.filter.cardSavable(card, player));
						return sum + cards.reduce((sum2, card) => sum2 + (get.tag(card, "recover") || 0), 0);
					}, 0);
				const minHp = player.getHp() + num;
				return minHp <= 1 ? "cancel2" : Math.min(2, Math.max(0, minHp - 1));
			},
			backup(result, player) {
				return {
					audio: "twxushen",
					index: result.index,
					skillAnimation: true,
					animationColor: "orange",
					async content(event, trigger, player) {
						const index = get.info(event.name).index;
						player.awakenSkill(event.name.slice(0, -7));
						player.addTempSkill(event.name.slice(0, -7) + "_effect");
						await player.draw(index + 1);
						await player.loseHp(index + 1);
					},
				};
			},
			prompt(result, player) {
				const num = result.index + 1;
				return `摸${get.cnNumber(num)}张牌并失去等量点体力`;
			},
		},
		ai: {
			order: 10,
			result: {
				player(player) {
					if (player.hasUnknown() || player.getHp() > 3) {
						return 0;
					}
					const num = game
						.filterPlayer(
							target =>
								get.attitude(target, player) > 0 &&
								target.hasCard(card => {
									return lib.filter.cardSavable(card, player);
								}, "hs")
						)
						.reduce((sum, target) => {
							const cards = target.getCards("hs", card => lib.filter.cardSavable(card, player));
							return sum + cards.reduce((sum2, card) => sum2 + (get.tag(card, "recover") || 0), 0);
						}, 0);
					const minHp = player.getHp() + num;
					return num > 0 && minHp > 1 ? 1 : 0;
				},
			},
		},
		subSkill: {
			backup: {},
			effect: {
				charlotte: true,
				forced: true,
				trigger: {
					player: "dyingAfter",
				},
				filter(event, player) {
					const evt = event.getParent(2);
					if (!(["twxushen_backup", "twxushen"].includes(evt.name) && evt.player === player)) {
						return false;
					}
					return game.hasGlobalHistory("changeHp", evt => {
						if (evt.player === player) {
							const evt2 = evt.getParent();
							if (evt2.name === "recover") {
								return evt2.getParent("dying") === event && evt2.source?.isIn();
							}
						}
						return false;
					});
				},
				async content(event, trigger, player) {
					let skills = lib.skill.twxushen.derivation.slice();
					let targets = [];
					game.getGlobalHistory("changeHp", evt => {
						if (evt.player === player) {
							const evt3 = evt.getParent();
							if (evt3.name === "recover" && evt3.getParent("dying") === trigger && evt3.source?.isIn()) {
								targets.add(evt3.source);
							}
						}
					});
					targets.sortBySeat();
					while (skills.length) {
						const skill = skills.shift();
						const result = await player
							.chooseTarget()
							.set("createDialog", [`###许身###令一名令你回复过体力的角色获得【${get.translation(skill)}】`, [[skill], "skill"]])
							.set("filterTarget", (card, player, target) => {
								const { targetx } = get.event();
								return targetx?.includes(target);
							})
							.set("ai", target => {
								const { gainSkill: skill, player } = get.event();
								_status.event.skillRankPlayer = target;
								const num = get.skillRank(skill, "inout") * Math.sign(Math.sign(get.attitude(player, target)) - 0.5);
								delete _status.event.skillRankPlayer;
								return num;
							})
							.set("targetx", targets)
							.set("gainSkill", skill)
							.forResult();
						if (result?.bool && result.targets?.length) {
							const [target] = result.targets;
							player.line(target);
							if (target.hasSkill(skill, null, false, false)) {
								await target.draw(3);
							} else {
								await target.addSkills(skill);
							}
						}
					}
				},
			},
		},
	}
```

### twzhennan 名字:镇南
描述: 一名角色使用普通锦囊牌指定第一个目标后，若目标数量大于X且包含你（X为使用者的体力值，至少为1），你可以对一名角色造成1点伤害。
```js
twzhennan: {
		audio: "xinfu_zhennan",
		trigger: { global: "useCardToPlayered" },
		filter(event, player) {
			if (!event.isFirstTarget || get.type(event.card) != "trick") {
				return false;
			}
			const hp = Math.max(1, event.player.hp);
			return event.targets?.length > hp && event.targets.includes(player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt(event.skill),
					prompt2: "对一名角色造成1点伤害",
					ai(target) {
						return get.damageEffect(target, get.player(), get.player());
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await target.damage();
		},
	}
```

## tw_sb_yl_luzhi 名字:TW谋卢植 势力:qun

### twsbmingren 名字:明任
描述: ①游戏开始时，你摸三张牌，然后将一张手牌置于你的武将牌上，称为“任”。②结束阶段，你可以用一张手牌替换“任”。
```js
twsbmingren: {
		inherit: "nzry_mingren",
		drawNum: 3,
		audio: "sbmingren",
	}
```

### twsbzhenliang 名字:贞良
描述: 转换技。阳：出牌阶段限一次，你可以弃置X张与“任”颜色相同的牌并对攻击范围内的一名角色造成1点伤害（X为你与其体力值之差且X至少为1）。阴：你的回合外，一名角色使用或打出牌结算完成后，若此牌与“任”类别相同，则你可以令至多两名角色各摸两张牌。
```js
twsbzhenliang: {
		inherit: "nzry_zhenliang",
		audio: "sbzhenliang",
		drawNum: 2,
		intro: {
			content(storage, player) {
				if (storage) {
					return "你的回合外，一名角色使用或打出牌结算完成后，若此牌与“任”类别相同，则你可以令至多两名角色各摸两张牌。";
				}
				return "出牌阶段限一次，你可以弃置与攻击范围内的一名角色体力值之差张与“任”颜色相同的牌（至少一张），对其造成1点伤害。";
			},
		},
		trigger: { global: ["useCardAfter", "respondAfter"] },
		filter(event, player) {
			const cards = player.getExpansions("nzry_mingren");
			if (!cards.length) {
				return false;
			}
			if (event.name === "chooseToUse") {
				if (player.storage.twsbzhenliang || player.hasSkill("twsbzhenliang_used", null, null, false)) {
					return false;
				}
				const color = get.color(cards[0]);
				if (!player.countCards("he", card => get.color(card) === color)) {
					return false;
				}
				return game.hasPlayer(current => {
					return (
						player.inRange(current) &&
						player.countCards("he", card => {
							return get.color(card) === color;
						}) >= Math.max(1, Math.abs(player.getHp() - current.getHp()))
					);
				});
			} else {
				if (_status.currentPhase === player || !player.storage.twsbzhenliang) {
					return false;
				}
				return get.type2(event.card) === get.type2(cards[0]);
			}
		},
		selectCard: [1, Infinity],
		complexSelect: true,
		complexCard: true,
		filterTarget(card, player, target) {
			return player.inRange(target) && ui.selected.cards.length === Math.max(1, Math.abs(player.getHp() - target.getHp()));
		},
		prompt: "弃置与攻击范围内的一名角色体力值之差张与“任”颜色相同的牌（至少一张），对其造成1点伤害",
		subSkill: { used: { charlotte: true } },
	}
```

## huan_sunce 名字:幻孙策 势力:wu

### twliwu 名字:励伍
描述: `锁定技，有角色的${get.poptip("twguose_tip")}发生变化后，你摸一张牌，若其中有基本牌，你本轮下一次造成伤害+1。`
```js
twliwu: {
		audio: 4,
		logAudio(event, player) {
			if (player == event.player) {
				if (player.isDamaged()) {
					return ["twliwu2.mp3"];
				}
				return ["twliwu3.mp3"];
			}
			return ["twliwu1.mp3"];
		},
		forced: true,
		trigger: {
			global: ["changeHpAfter", "gainMaxHpAfter", "loseMaxHpAfter"],
		},
		filter(event, player) {
			return get.info("twguose").damageStatusChanged(event.player, event);
		},
		async content(event, trigger, player) {
			const result = await player.draw().forResult();
			if (result?.cards?.length) {
				if (result.cards.some(card => get.type(card) == "basic")) {
					player.addTempSkill(event.name + "_dam", "roundStart");
					player.addMark(event.name + "_dam", 1, false);
				}
			}
		},
		subSkill: {
			dam: {
				audio: "twliwu",
				logAudio: () => ["twliwu4.mp3"],
				charlotte: true,
				onremove: true,
				forced: true,
				locked: false,
				intro: { content: "本轮你下次造成伤害+#" },
				trigger: { source: "damageBegin2" },
				filter(event, player) {
					return player.hasMark("twliwu_dam");
				},
				async content(event, trigger, player) {
					trigger.num += player.countMark(event.name);
					player.removeSkill(event.name);
				},
			},
		},
	}
```

### twsaoting 名字:扫庭
描述: 转换技，阳：你可将一张伤害牌当【决斗】使用；阴：你可将一张伤害牌当【酒】使用。若你以此法使用牌指定了已受伤角色为目标，你摸一张牌。
```js
twsaoting: {
		audio: 2,
		logAudio: index => (typeof index == "number" ? `twsaoting${index}.mp3` : 2),
		zhuanhuanji: true,
		marktext: "☯",
		mark: true,
		intro: {
			content(storage, player) {
				if (!storage) {
					return `转换技，你可将一张伤害牌当【决斗】使用。若你以此法使用牌指定了已受伤角色为目标，你摸一张牌`;
				}
				return `转换技，你可将一张伤害牌当【酒】使用。若你以此法使用牌指定了已受伤角色为目标，你摸一张牌`;
			},
		},
		enable: "chooseToUse",
		popup: false,
		filterCard(card) {
			return get.is.damageCard(card);
		},
		filter(event, player) {
			const name = player.storage.twsaoting ? "jiu" : "juedou";
			return player.hasCards("hes", card => get.is.damageCard(card)) && event.filterCard(get.autoViewAs({ name }, "unsure"), player, event);
		},
		position: "hes",
		viewAs(cards, player) {
			const storage = player.storage.twsaoting;
			const name = storage ? "jiu" : "juedou";
			return { name };
		},
		prompt(event, player) {
			return `你可以将一张伤害牌当做${player.storage.twsaoting ? "【酒】" : "【决斗】"}使用`;
		},
		check(card) {
			return 10 - get.value(card);
		},
		async precontent(event, trigger, player) {
			player.logSkill("twsaotao", null, null, null, [event.result.card.name == "jiu" ? 2 : 1]);
			player.changeZhuanhuanji("twsaoting");
			player
				.when({ player: "useCard" })
				.filter(evt => evt.getParent() == event.getParent())
				.step(async (event, trigger, player) => {
					if (trigger.targets?.some(target => target.isDamaged())) {
						await player.draw();
					}
				});
		},
		hiddenCard(player, name) {
			const storage = player.storage.twsaoting;
			const namex = storage ? "jiu" : "juedou";
			return name == namex && player.hasCards("hes", card => get.is.damageCard(card));
		},
		ai: {
			order(item, player) {
				player ??= get.player();
				return get.order({ name: player.storage.twsaoting ? "jiu" : "juedou" }, player) + 0.1;
			},
			result: { player: 1 },
		},
	}
```

### twjianyan 名字:翦魇
描述: `${get.poptip("rule_chihengji")}，游戏开始时，你令所有角色获得${get.poptip("twhuju")}。当有角色进入濒死状态时，你可以选择任意角色（数量可为0），你令这些角色失去${get.poptip("twhuju")}，然后你回复等量体力并获得等量的非伤害牌。将其余角色的${get.poptip("twhuju")}转化为“阴”，然后入幻。`
```js
twjianyan: {
		audio: 3,
		logAudio: () => 1,
		derivation: ["twhuju", "twsuzhen", "twdangjiang", "twjizhi"],
		persevereSkill: true,
		forced: true,
		locked: false,
		trigger: {
			player: "enterGame",
			global: "phaseBefore",
		},
		filter(event, player) {
			return game.hasPlayer(current => !current.hasSkill("twhuju")) && (event.name != "phase" || game.phaseNumber == 0);
		},
		logTarget(event, player) {
			return game.filterPlayer(current => !current.hasSkill("twhuju")).sortBySeat();
		},
		async content(event, trigger, player) {
			const targets = event.targets;
			await game.doAsyncInOrder(targets, async target => {
				await target.addSkills("twhuju");
			});
		},
		group: "twjianyan_dying",
		subSkill: {
			dying: {
				audio: "twjianyan",
				logAudio: () => ["twjianyan2.mp3", "twjianyan3.mp3"],
				skillAnimation: true,
				animationColor: "wood",
				trigger: { global: "dying" },
				prompt2(event, player) {
					return "选择任意角色令其失去【虎踞】（可选择0），然后你回复等量体力，获得等量非伤害牌并入幻";
				},
				async content(event, trigger, player) {
					const targetx = game.filterPlayer(current => current.hasSkill("twhuju"));
					const result = targetx.length
						? await player
								.chooseTarget({
									prompt: "翦魇：选择任意其他角色令其失去【虎踞】，然后你回复等量体力，获得等量非伤害牌并入幻，或点击“取消”直接入幻",
									filterTarget(card, player, target) {
										return target.hasSkill("twhuju");
									},
									selectTarget: [1, Infinity],
									ai(target) {
										const { player, targetx } = get.event();
										if (game.hasPlayer(current => current.isDying() && current.hasSkill("twhuju"))) {
											return target.isDying() && target.hasSkill("twhuju");
										}
										if (player == targetx && ui.selected.targets.length < 1 - player.hp) {
											return Math.abs(get.attitude(player, target)) + 1;
										}
										return 0;
									},
								})
								.set("targetx", trigger.player)
								.forResult()
						: { bool: false };
					if (result?.bool && result.targets?.length) {
						const targets = result.targets.sortBySeat();
						targetx.removeArray(targets);
						await game.doAsyncInOrder(targets, async target => {
							await target.removeSkills("twhuju");
						});
						await player.recover(targets.length);
						const cards = [];
						for (let i = 0; i < targets.length; i++) {
							const card = get.cardPile(card => !get.tag(card, "damage") && !cards.includes(card));
							if (card) {
								cards.push(card);
							} else {
								break;
							}
						}
						if (cards.length) {
							await player.gain({ cards, animate: "gain2" });
						}
					}
					if (targetx.length) {
						await game.doAsyncInOrder(targetx, async target => {
							if (!target.storage.twhuju) {
								target.changeZhuanhuanji("twhuju");
							}
						});
					}
					player.changeSkin({ characterName: "huan_sunce" }, "huan_sunce_shadow");
					await player.changeSkills(["twsuzhen", "twdangjiang", "twjizhi"], ["twliwu", "twsaoting", "twjianyan"]);
				},
			},
		},
	}
```

## tw_pot_huanjie 名字:TW势桓阶 势力:wei

### twpotgongmou 名字:共谋
描述: `准备阶段，你可以与一名其他角色交换手牌，若如此做，你摸一张牌且获得技能${get.poptip("qice")}至本回合结束。`
```js
twpotgongmou: {
		audio: "potgongmou",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(target => {
				if (target == player || target.countCards("h") + player.countCards("h") == 0) {
					return false;
				}
				return true;
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget("你可发动共谋，与1名其他角色交换手牌并获得技能", (card, player, target) => {
					if (target == player || target.countCards("h") + player.countCards("h") == 0) {
						if (target != player) {
							target.prompt("没牌交换", "fire");
						}
						return false;
					}
					return true;
				})
				.set("ai", target => {
					const player = get.player();
					return -get.attitude(player, target) * (target.countCards("h") - player.countCards("h"));
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.swapHandcards(target);
			await player.draw(1);
			await player.addTempSkills(get.info(event.name).derivation[0]);
		},
		derivation: ["qice"],
		ai: {
			threaten: 3,
		},
	}
```

### potzhengshuo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## tw_lingju 名字:TW灵雎 势力:qun

### twjieyuan 名字:竭缘
描述: 当你对体力值大于等于你的其他角色造成伤害时，你可以弃置一张黑色手牌，令此伤害+1。当你受到体力值大于等于你的其他角色造成的伤害时，你可以弃置一张红色手牌，令此伤害-1。
```js
twjieyuan: {
		audio: ["jieyuan_more.mp3", "jieyuan_less.mp3"],
		logAudio: (event, player, name) => (name == "damageBegin2" ? "jieyuan_more.mp3" : "jieyuan_less.mp3"),
		trigger: {
			source: "damageBegin2",
			player: "damageBegin4",
		},
		filter(event, player, name) {
			const target = name == "damageBegin4" ? event.source : event.player;
			if (target == player || !target?.isIn() || target.hp < player.hp) return false;
			const position = player.storage.twfenxin_achieve ? "he" : "h";
			if (event.isOnline() || player.storage.twfenxin_achieve) return player.hasCards(position);
			if (name == "damageBegin2")
				return player.hasCard(card => {
					return get.color(card) == "black" && lib.filter.canBeDiscarded(card, player, player);
				}, position);
			return player.hasCard(card => {
				return get.color(card) == "red" && lib.filter.canBeDiscarded(card, player, player);
			}, position);
		},
		logTarget(event, player, name) {
			return name == "damageBegin4" ? event.source : event.player;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: get.prompt2(event.skill),
					selectCard: 1,
					filterCard(card, player) {
						if (player.storage.twfenxin_achieve) return player.canRecast(card);
						if (event.triggername == "damageBegin2") return get.color(card) == "black" && lib.filter.canBeDiscarded(card, player, player);
						return get.color(card) == "red" && lib.filter.canBeDiscarded(card, player, player);
					},
					ai(card) {
						return 6 - get.value(card);
					},
				})
				.set("position", player.storage.twfenxin_achieve ? "he" : "h")
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			await player[player.storage.twfenxin_achieve ? "recast" : "discard"](cards);
			if (event.triggername == "damageBegin2") {
				trigger.num++;
			} else {
				trigger.num--;
			}
		},
		ai: {
			expose: 0.2,
			threaten: 1.5,
		},
	}
```

### twfenxin 名字:焚心
描述: `使命技，游戏开始时，你选择一名其他角色，你与其互相计算距离视为1。当你或其受到伤害后，你摸一张牌。成功：当你与其累计受到4点以上伤害或其死亡后，你修改${get.poptip("twjieyuan")}为${get.poptip("twjieyuan2")}；失败：当你进入濒死状态时，你将体力回复至1点。`
```js
twfenxin: {
		audio: "fenxin",
		derivation: "twjieyuan2",
		dutySkill: true,
		locked: false,
		forced: true,
		mod: {
			globalFrom(from, to) {
				if (to.hasMark("twfenxin_mark")) {
					return -Infinity;
				}
			},
		},
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return [player].concat(game.findPlayer(current => current.hasMark("twfenxin_mark"))).includes(event.player);
		},
		async content(event, trigger, player) {
			player.draw({ num: 1 });
		},
		group: ["twfenxin_achieve", "twfenxin_fail", "twfenxin_init"],
		subSkill: {
			fail: {
				audio: "fenxin",
				forced: true,
				trigger: {
					player: "dying",
				},
				async content(event, trigger, player) {
					player.awakenSkill("twfenxin");
					game.log(player, "使命失败");
					game.countPlayer(current => current.removeSkill("twfenxin_mark"));
					await player.recoverTo(1);
				},
			},
			achieve: {
				audio: "fenxin",
				forced: true,
				trigger: {
					global: ["damageAfter", "dieAfter"],
				},
				skillAnimation: true,
				animationColor: "metal",
				filter(event, player) {
					if (event.name == "die") {
						return event.player.hasMark("twfenxin_mark");
					}
					let num = 0;
					[player].concat(game.findPlayer(current => current.hasMark("twfenxin_mark"))).forEach(target => {
						target.checkAllHistory("damage", evt => (num += evt.num));
					});
					return num > 3;
				},
				async content(event, trigger, player) {
					player.awakenSkill("twfenxin");
					game.log(player, "使命成功");
					player.setStorage("twfenxin_achieve", true, true);
				},
			},
			mark: {
				charlotte: true,
				mark: true,
				marktext: "缘",
				onremove: true,
				intro: {
					name: "焚心",
					content: "道友我看你和我血婆娑有缘啊",
				},
				mod: {
					globalFrom(from, to) {
						if (to.hasSkill("twfenxin")) {
							return -Infinity;
						}
					},
				},
			},
			init: {
				audio: "fenxin",
				trigger: {
					global: "phaseBefore",
					player: "enterGame",
				},
				filter(event, player) {
					return game.hasPlayer(current => current != player && !current.hasMark("twfenxin_mark")) && (event.name != "phase" || game.phaseNumber == 0);
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget({
							forced: true,
							prompt: "选择一名其他角色为“结缘”角色",
							filterTarget(card, player, target) {
								return player != target && !target.hasMark("twfenxin_mark");
							},
							ai(target) {
								return get.attitude(get.player(), target);
							},
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					target.addSkill("twfenxin_mark");
					target.addMark("twfenxin_mark", 1);
					await game.delayx();
				},
			},
		},
	}
```

### twfucheng 名字:浮沉
描述: `锁定技，回合开始时，若你的手牌均为：黑色，你获得${get.poptip("sbwushuang")}；红色,你获得${get.poptip("sbbiyue")}。`
```js
twfucheng: {
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		forced: true,
		filter(event, player) {
			if (player.hasSkill("sbwushuang") && player.getCards("h").every(card => get.color(card) == "black")) return false;
			if (player.hasSkill("sbbiyue") && player.getCards("h").every(card => get.color(card) == "red")) return false;
			return ["red", "black"].some(i => player.getCards("h").every(card => get.color(card) == i));
		},
		async content(event, trigger, player) {
			if (player.getCards("h").every(card => get.color(card) == "red")) player.addSkills("sbbiyue");
			if (player.getCards("h").every(card => get.color(card) == "black")) player.addSkills("sbwushuang");
		},
	}
```

## tw_sb_xiahoudun 名字:TW谋夏侯惇 势力:wei

### twsbganglie 名字:刚烈
描述: 出牌阶段限一次。你可以选择任意名本局游戏对你造成过伤害且你未以此法选择过的角色，你对其造成2点伤害。
```js
twsbganglie: {
		audio: "sbganglie",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			if (!event.twsbganglie_enabledTargets) {
				return false;
			}
			return game.hasPlayer(current => {
				return lib.skill.twsbganglie.filterTarget(null, player, current);
			});
		},
		onChooseToUse(event) {
			if (game.online || event.type !== "phase") {
				return;
			}
			const player = event.player;
			const chosen = player
				.getAllHistory("useSkill", evt => evt.skill === "twsbganglie")
				.reduce((list, evt) => {
					if (evt.targets) {
						return list.addArray(evt.targets);
					}
				}, []);
			let targets = player
				.getAllHistory("damage", evt => evt.source && evt.source.isIn())
				.map(evt => evt.source)
				.unique();
			targets.removeArray(chosen);
			event.set("twsbganglie_enabledTargets", targets);
		},
		filterTarget(card, player, target) {
			return get.event().twsbganglie_enabledTargets.includes(target);
		},
		selectTarget: [1, Infinity],
		async content(event, trigger, player) {
			await event.target.damage(2);
		},
		ai: {
			order: 6,
			result: {
				target: -2,
			},
		},
	}
```

### twsbqingjian 名字:清俭
描述: 锁定技。①当有一张牌不因使用而进入弃牌堆后，若你的“清俭”数小于X，你将此牌置于你的武将牌上，称为“清俭”（X为你的体力值+1，且至少为1）。②出牌阶段结束时，你将所有“清俭”分配给任意角色。
```js
twsbqingjian: {
		audio: "sbqingjian",
		trigger: {
			global: ["loseAfter", "cardsDiscardAfter", "loseAsyncAfter", "equipAfter"],
		},
		forced: true,
		locked: false,
		filter(event, player) {
			if (player.getExpansions("twsbqingjian").length >= Math.max(1, player.getHp() + 1)) {
				return false;
			}
			if (event.name !== "cardsDiscard") {
				if (event.position !== ui.discardPile) {
					return false;
				}
				if (
					!game.hasPlayer(current => {
						const evt = event.getl(current);
						return evt.cards?.someInD("od");
					})
				) {
					return false;
				}
			} else {
				const evt = event.getParent();
				if (evt.relatedEvent && evt.relatedEvent.name === "useCard") {
					return false;
				}
			}
			return true;
		},
		group: "twsbqingjian_give",
		async content(event, trigger, player) {
			let cards = trigger.cards.filterInD("od").slice();
			const maxNum = Math.max(1, player.getHp() + 1);
			const myLen = player.getExpansions("twsbqingjian").length,
				cardsLen = trigger.cards.length;
			const num = Math.min(cardsLen, maxNum - myLen);
			if (num > 0) {
				cards = cards.randomGets(num);
			}
			const next = player.addToExpansion(cards, "gain2");
			next.gaintag.add("twsbqingjian");
			await next;
		},
		marktext: "俭",
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		subSkill: {
			give: {
				audio: "sbqingjian",
				trigger: { player: "phaseUseEnd" },
				filter(event, player) {
					return player.getExpansions("twsbqingjian").length > 0;
				},
				async cost(event, trigger, player) {
					if (_status.connectMode) {
						game.broadcastAll(() => {
							_status.noclearcountdown = true;
						});
					}
					const given_map = {},
						targets = [],
						expansions = player.getExpansions("twsbqingjian");
					do {
						const result =
							expansions.length > 1
								? await player
										.chooseButtonTarget({
											createDialog: [`清俭：请选择要分配的牌`, expansions],
											selectButton: [1, Infinity],
											filterTarget: true,
											ai1(button) {
												return get.value(button.link);
											},
											canHidden: true,
											complexSelect: true,
											ai2(target) {
												const att = get.attitude(get.player(), target);
												if (get.value(ui.selected.buttons[0]?.link, player, "raw") < 0) {
													return Math.max(0.01, 100 - att);
												} else if (att > 0) {
													return Math.max(0.1, att / Math.sqrt(2 + target.countCards("h")));
												} else {
													return Math.max(0.01, (100 + att) / 200);
												}
											},
										})
										.forResult()
								: await player
										.chooseTarget(`清俭：是否令一名角色获得${get.translation(expansions)}？`)
										.set("ai", target => {
											const att = get.attitude(_status.event.player, target);
											if (_status.event.enemy) {
												return -att;
											} else if (att > 0) {
												return att / (1 + target.countCards("h"));
											} else {
												return att / 100;
											}
										})
										.set("enemy", get.value(expansions[0], player, "raw") < 0)
										.forResult();
						if (result?.bool) {
							if (!result.links?.length) {
								result.links = expansions.slice(0);
							}
							expansions.removeArray(result.links);
							let id = result.targets[0]?.playerid;
							if (!given_map[id]) {
								given_map[id] = [];
							}
							given_map[id].addArray(result.links);
							targets.addArray(result.targets);
						} else {
							break;
						}
					} while (expansions.length > 0);
					if (_status.connectMode) {
						game.broadcastAll(() => {
							delete _status.noclearcountdown;
							game.stopCountChoose();
						});
					}
					event.result = {
						bool: targets.length,
						targets: targets?.sortBySeat(),
						cost_data: given_map,
					};
				},
				async content(event, trigger, player) {
					const gain_list = [],
						given_map = event.cost_data;
					for (const i in given_map) {
						const source = (_status.connectMode ? lib.playerOL : game.playerMap)[i];
						gain_list.push([source, given_map[i]]);
						game.log(source, "获得了", given_map[i]);
					}
					await game
						.loseAsync({
							gain_list,
							giver: player,
							animate: "gain2",
						})
						.setContent("gaincardMultiple");
				},
			},
		},
	}
```

## tw_shen_guanyu 名字:TW神关羽 势力:shen

### twwushen 名字:武神
描述: 锁定技。①你的♥手牌均视为普【杀】。②你于每阶段使用的第一张【杀】不可被响应。③你使用♥【杀】无距离和次数限制。④当你使用♥【杀】选择目标后，你令所有拥有“梦魇”标记的角色均成为此【杀】的目标。
```js
twwushen: {
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
		audio: "wushen",
		audioname2: {
			tw_baosanniang: "wusheng_re_baosanniang",
		},
		trigger: { player: "useCard2" },
		forced: true,
		filter(event, player) {
			return event.card.name == "sha" && (get.suit(event.card) == "heart" || !player.hasSkill("twwushen_phase", null, null, false));
		},
		logTarget(event, player) {
			if (get.suit(event.card) == "heart") {
				var targets = game.filterPlayer(function (current) {
					return !event.targets.includes(current) && current.hasMark("twwuhun") && lib.filter.targetEnabled(event.card, player, current);
				});
				if (targets.length) {
					return targets.sortBySeat();
				}
			}
			return null;
		},
		async content(event, trigger, player) {
			if (!player.hasSkill("twwushen_phase", null, null, false)) {
				trigger.directHit.addArray(game.players);
				player.addTempSkill("twwushen_phase", ["phaseZhunbeiAfter", "phaseJudgeAfter", "phaseDrawAfter", "phaseUseAfter", "phaseDiscardAfter", "phaseJieshuAfter"]);
			}
			if (get.suit(trigger.card) == "heart") {
				if (trigger.addCount !== false) {
					trigger.addCount = false;
					if (player.stat[player.stat.length - 1].card.sha > 0) {
						player.stat[player.stat.length - 1].card.sha--;
					}
				}
				const targets = game.filterPlayer(current => {
					return !trigger.targets.includes(current) && current.hasMark("twwuhun") && (lib.filter.targetEnabled(trigger.card, player, current) ?? false);
				});
				if (targets.length) {
					trigger.targets.addArray(targets.sortBySeat());
					game.log(targets, "也成为了", trigger.card, "的目标");
				}
			}
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				return arg.card.name == "sha" && !player.hasSkill("twwushen_phase", null, null, false);
			},
		},
		subSkill: { phase: { charlotte: true } },
	}
```

### twwuhun 名字:武魂
描述: 锁定技。①当你受到其他角色造成的1点伤害后，你令伤害来源获得1枚“梦魇”标记。②当你对有“梦魇”标记的其他角色造成伤害后，你令其获得一枚“梦魇”标记。③当你死亡时，你可进行判定。若结果不为【桃】或【桃园结义】，则你选择至少一名拥有“梦魇”标记的角色。令这些角色各自失去X点体力（X为其“梦魇”标记数）。
```js
twwuhun: {
		audio: "wuhun",
		trigger: { player: "die" },
		forceDie: true,
		skillAnimation: true,
		animationColor: "soil",
		locked: true,
		check(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && current.hasMark("twwuhun") && get.attitude(player, current) < 0;
			});
		},
		async content(event, trigger, player) {
			const judge = player.judge(card => {
				const name = get.name(card, false);
				return name === " tao" || name === "taoyuan" ? -25 : 15;
			});
			judge.set("forceDie", true);
			judge.set("judge2", result => result.bool);

			const judgeResult = await judge.forResult();
			if (!judgeResult?.bool) {
				return;
			}

			const num = game.countPlayer(current => current !== player && current.hasMark("twwuhun"));
			if (num === 0) {
				return;
			}

			const prompt = "请选择【武魂】的目标";
			const prompt2 = "选择至少一名拥有“梦魇”标记的角色。令这些角色各自失去X点体力（X为其“梦魇”标记数）";
			const next = player.chooseTarget(prompt, prompt2, [1, num], true);
			next.set("filterTarget", (card, _player, target) => target !== player && target.hasMark("twwuhun"));
			next.set("forceDie", true);
			next.set("ai", target => -get.attitude(get.player(), target));

			const result = await next.forResult();
			if (!result.targets?.length) {
				return;
			}

			const targets = result.targets.sortBySeat();
			player.line(targets);

			for (const target of targets) {
				const num = target.countMark("twwuhun");
				if (num > 0) {
					await target.loseHp(num);
				}
			}
		},
		marktext: "魇",
		intro: {
			name: "梦魇",
			content: "mark",
			onunmark: true,
		},
		group: "twwuhun_gain",
		subSkill: {
			gain: {
				audio: "wuhun",
				trigger: {
					player: "damageEnd",
					source: "damageSource",
				},
				forced: true,
				filter(event, player, name) {
					if (event.player == event.source) {
						return false;
					}
					var target = lib.skill.twwuhun_gain.logTarget(event, player);
					if (!target || !target.isIn()) {
						return false;
					}
					return name == "damageEnd" || target.hasMark("twwuhun");
				},
				logTarget(event, player) {
					if (player == event.player) {
						return event.source;
					}
					return event.player;
				},
				async content(event, trigger, player) {
					const target = lib.skill.twwuhun_gain.logTarget(trigger, player);
					target.addMark("twwuhun", player == trigger.source ? 1 : trigger.num);
					await game.delayx();
				},
			},
		},
		ai: {
			notemp: true,
			maixie_defend: true,
			effect: {
				target: (card, player, target) => {
					if (!get.tag(card, "damage") || !target.hasFriend()) {
						return;
					}
					let die = [],
						extra = [null, 0],
						temp;
					game.filterPlayer(i => {
						if (!i.hasMark("twwuhun")) {
							return false;
						}
						temp = get.attitude(target, i);
						if (temp < 0) {
							die.push(i);
						} else {
							temp = Math.sqrt(temp) * i.countMark("twwuhun");
							if (!extra[0] || temp < extra[1]) {
								extra = [i, temp];
							}
						}
					});
					if (extra[0] && !die.length) {
						die.push(extra[0]);
					}
					if (target.hp + target.hujia > 1 && (!die.length || get.attitude(player, target) <= 0)) {
						die.add(player);
					}
					if (die.length) {
						return [
							1,
							0,
							1,
							die.reduce((num, i) => {
								return (num -= 2 * get.sgnAttitude(player, i));
							}, 0),
						];
					}
				},
			},
		},
	}
```

## tw_shen_lvmeng 名字:TW神吕蒙 势力:shen

### twshelie 名字:涉猎
描述: 摸牌阶段，你可以改为亮出牌堆顶的五张牌，然后选择获得其中花色不同的牌各一张。每轮限一次，结束阶段，若你本回合使用的花色数不小于4，你执行一个额外的摸牌阶段或出牌阶段（不能连续选择执行相同项）。
```js
twshelie: {
		audio: "shelie",
		inherit: "shelie",
		prompt2: () => lib.translate.shelie_info,
		group: "twshelie_jingce",
		//什么精策技能啊喂！
		subSkill: {
			round: { charlotte: true },
			count: {
				charlotte: true,
				onremove: true,
				intro: {
					markcount(storage) {
						return storage.length;
					},
					content: "本回合已使用$花色的牌",
				},
			},
			jingce: {
				audio: "shelie",
				trigger: { player: ["phaseJieshuBegin", "useCard1"] },
				filter(event, player) {
					if (player.hasSkill("twshelie_round") || player != _status.currentPhase) {
						return false;
					}
					var list = [];
					player.getHistory("useCard", function (evt) {
						if (lib.suit.includes(get.suit(evt.card)) && !list.includes(get.suit(evt.card))) {
							list.push(get.suit(evt.card));
						}
					});
					if (list.length) {
						player.addTempSkill("twshelie_count");
						player.storage.twshelie_count = list.sort(function (a, b) {
							return lib.suit.indexOf(b) - lib.suit.indexOf(a);
						});
						player.markSkill("twshelie_count");
						player.syncStorage("twshelie_count");
					}
					return event.name != "useCard" && list.length >= 4;
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					player.addTempSkill("twshelie_round", "roundStart");
					let result;
					if (typeof player.storage.twshelie == "number") {
						result = { index: player.storage.twshelie };
					} else {
						result = await player.chooseControl("摸牌阶段", "出牌阶段").set("prompt", "涉猎：请选择要执行的额外阶段").forResult();
					}
					player.setStorage("twshelie", 1 - result.index);
					const evt = trigger.getParent("phase", true, true);
					if (result.index == 0) {
						if (evt?.phaseList) {
							evt.phaseList.splice(evt.num + 1, 0, "phaseDraw|twshelie");
						}
					}
					if (result.index == 1) {
						if (evt?.phaseList) {
							evt.phaseList.splice(evt.num + 1, 0, "phaseUse|twshelie");
						}
					}
				},
			},
		},
	}
```

### twgongxin 名字:攻心
描述: 出牌阶段限一次，你可以观看一名其他角色的手牌，然后你可以展示其中一张牌并选择一项：1.弃置此牌；2.将此牌置于牌堆顶。若该角色手牌中的花色数因此减少，其不能响应你本回合使用的下一张牌。
```js
twgongxin: {
		audio: "gongxin",
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && current.countCards("h");
			});
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0;
		},
		usable: 1,
		async content(event, trigger, player) {
			const { target } = event;
			const cards = target.getCards("h");
			const num = cards.reduce(function (arr, card) {
				arr.add(get.suit(card, player));
				return arr;
			}, []).length;
			const result = await player
				.chooseToMove_new("攻心")
				.set("list", [
					[get.translation(target) + "的手牌", cards],
					[["弃置"], ["置于牌堆顶"]],
				])
				.set("filterOk", moved => {
					return moved[1].slice().concat(moved[2]).length == 1;
				})
				.set("processAI", list => {
					let card = list[0][1].slice().sort((a, b) => {
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
					await target.modedDiscard(result.moved[1]);
				} else {
					await player.showCards(result.moved[2], get.translation(player) + "对" + get.translation(target) + "发动了【攻心】");
					await target.lose(result.moved[2], ui.cardPile, "visible", "insert");
				}
				if (
					num >
					target.getCards("h").reduce(function (arr, card) {
						arr.add(get.suit(card, target));
						return arr;
					}, []).length
				) {
					player.line(target);
					player.addTempSkill("twgongxin3", { player: ["twgongxin3After", "phaseAfter"] });
					player.markAuto("twgongxin3", [target]);
				}
			}
		},
		ai: {
			order: 10,
			expose: 0.25,
			result: {
				target(player, target) {
					return -target.countCards("h");
				},
			},
		},
	}
```

## tw_huangfusong 名字:TW皇甫嵩 势力:qun

### twtaoluan 名字:讨乱
描述: 每回合限一次，当一名角色的判定结果确认时，你可以弃置一张与判定结果花色相同的牌，然后终止导致此判定发生的上级事件。
```js
twtaoluan: {
		audio: "sptaoluan",
		trigger: {
			global: "judgeFixing",
		},
		usable: 1,
		filter(event, player) {
			return event.result && player.countDiscardableCards(player, "he", card => get.suit(card) == event.result.suit) > 0;
		},
		async cost(event, trigger, player) {
			const suit = trigger.result.suit;
			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt(event.skill),
					prompt2: `你可以弃置一张${get.translation(suit)}牌以中止此判定。`,
					chooseonly: true,
					position: "he",
					ai(card) {
						if (get.event().goon) {
							return 6 - get.value(card);
						}
						return 0;
					},
					filterCard(card, player) {
						return get.suit(card) == get.event().suit;
					},
				})
				.set("suit", suit)
				.set("goon", trigger.result.judge * get.attitude(player, trigger.player) <= 0)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discard({ cards: event.cards });
			let evt = trigger.getParent();
			if (evt.name === "phaseJudge") {
				evt.excluded = true;
			} else {
				const stopevt = ev => {
					ev.finish();
					ev._triggered = null;
				};
				stopevt(evt);
				if (evt.name.startsWith("pre_")) {
					stopevt(evt.getParent());
				}
				trigger.next = trigger.next.filter(next => next.name !== "judgeCallback");
				const evts = game.getGlobalHistory("cardMove", e => e.getParent(2) === evt);
				const cards = evts.flatMap(e => e.cards).filter(card => get.position(card, true) === "o");
				trigger.orderingCards.addArray(cards);
			}
			/*const card = trigger.result.card;
			if (get.position(card) == "d") {
				await player.gain(card, "gain2");
			}*/
		},
	}
```

### twshiji 名字:势击
描述: 准备阶段，你从牌堆或弃牌堆中获得两张花色不同的牌，然后你可以弃置一张牌，与弃置牌花色相同的牌于本回合内被展示后，你摸一张牌。你使用【火攻】造成伤害后，可以弃置目标角色的展示牌。
```js
twshiji: {
		group: "twshiji_gain",
		audio: "spshiji",
		trigger: {
			player: ["phaseZhunbeiBegin"], //"damageEnd",
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			/*const result = await player
				.chooseControl(["牌堆", "弃牌堆"])
				.set("ai", () => {
					return ui.discardPile.childElementCount >= ui.cardPile.childElementCount ? 1 : 0
				})
				.set("prompt", `【势击】：请选择获得两张颜色不同的牌的位置`)
				.forResult();
			const pos = result.control.includes("弃") ? "discardPile" : "cardPile";*/
			const cards = [];
			for (let suit of lib.suit.slice().randomSort()) {
				const card = get.cardPile(card => get.suit(card) == suit);
				if (card) {
					cards.push(card);
				}
				if (cards.length >= 2) {
					break;
				}
			}
			if (cards.length) {
				await player.gain({ cards, animate: "gain2" });
			}
			const result2 = await player
				.chooseToDiscard({
					prompt: `势击：你可以弃置一张牌，然后与弃置牌花色相同的牌于本回合内被展示后，你摸一张牌。`,
					position: "he",
					ai(card) {
						return 6 - get.value(card);
					},
				})
				.forResult();
			if (result2?.bool && result2?.cards?.length) {
				const skill = `${event.name}_draw`;
				player.addTempSkill(skill);
				player.markAuto(skill, get.suit(result2.cards[0]));
			}
		},
		subSkill: {
			draw: {
				audio: "mbshiji",
				trigger: {
					global: "showCardsAfter",
				},
				onremove: true,
				charlotte: true,
				forced: true,
				filter(event, player) {
					return event.cards?.some(card => player.getStorage("twshiji_draw").includes(get.suit(card)));
				},
				async content(event, trigger, player) {
					const num = trigger.cards
						.map(card => get.suit(card))
						.unique()
						.filter(i => player.getStorage(event.name).includes(i)).length;
					await player.draw({ num });
				},
			},
			gain: {
				audio: "mbshiji",
				getcard(event, player) {
					const { card } = event;
					if (get.name(card) != "huogong") {
						return [];
					}
					const evt = event.getParent(evt => evt.card == card && evt.name == "huogong" && evt.target == event.player, true);
					if (!evt) {
						return [];
					}
					const cards = evt.showResult?.cards;
					return cards?.filter(card => ["h", "e"].includes(get.position(card)) && get.owner(card) == evt.target && lib.filter.canBeDiscarded(card, player, evt.target));
				},
				trigger: {
					source: "damageSource",
				},
				prompt2(event, player) {
					return `是否弃置${get.translation(get.info("twshiji_gain").getcard(event, player))}？`;
				},
				filter(event, player) {
					if (!event.card) {
						return false;
					}
					return get.info("twshiji_gain").getcard(event, player)?.length;
				},
				check(event, player) {
					return get.attitude(player, event.player) < 0;
				},
				logTarget: "player",
				async content(event, trigger, player) {
					const cards = get.info("twshiji_gain").getcard(trigger, player);
					await event.targets[0].modedDiscard({ cards, discarder: player });
				},
			},
		},
	}
```

### twzhengjun 名字:整军
描述: 当你不因使用或打出失去手牌后，你可以选择一项：1.从牌堆或弃牌堆中获得一张【火攻】；2.将手牌补至体力上限。然后若你本轮因此技能获得的牌数不小于2，此技能本轮失效。
```js
twzhengjun: {
		audio: "spzhengjun",
		trigger: {
			global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			const evt = event.relatedEvent || event.getParent();
			const evtx = event?.getl(player);
			return evtx?.hs?.length && !["useCard", "respond"].includes(evt?.name);
		},
		async cost(event, trigger, player) {
			const num = player.maxHp - player.countCards("h");
			const result = await player
				.chooseControl({
					prompt: get.prompt2(event.skill),
					controls: ["获得【火攻】", `摸${num >= 0 ? num : 0}张牌`, "cancel2"],
					ai() {
						const player = get.player();
						if (player.maxHp - player.countCards("h") > 2) {
							return 1;
						}
						return 0;
					},
				})
				.forResult();
			event.result = {
				bool: result.control != "cancel2",
				cost_data: result.index,
			};
		},
		async content(event, trigger, player) {
			if (event.cost_data == 0) {
				const card = get.cardPile(card => get.name(card) == "huogong");
				if (card) {
					await player.gain({ cards: [card], animate: "gain2" });
				} else {
					player.chat("牌喵？");
				}
			} else {
				const num = player.maxHp - player.countCards("h");
				if (num > 0) {
					await player.drawTo(player.maxHp);
				}
			}
			const check = evt => evt.getParent().name == event.name || (evt.getParent().name == "draw" && evt.getParent(2).name == event.name);
			if (player.getRoundHistory("gain", evt => check(evt) && evt.cards.length > 0).flatMap(evt => evt.cards).length >= 2) {
				player.tempBanSkill(event.name, "roundStart");
			}
		},
	}
```

## tw_jsrg_wangyun 名字:TW起王允 势力:qun

### twshelun 名字:赦论
描述: 出牌阶段限一次，若你有手牌，你可以选择至多两名你攻击范围内的其他角色，然后令除其外所有手牌数不大于你的角色议事。若结果为：红色，你弃置其各两张牌；黑色，你对其各造成1点伤害。
```js
twshelun: {
		audio: "jsrgshelun",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") && game.hasPlayer(current => current != player && player.inRange(current));
		},
		filterTarget(card, player, target) {
			return player != target && player.inRange(target);
		},
		multitarget: true,
		multiline: true,
		selectTarget: [1, 2],
		async content(event, trigger, player) {
			const { targets: targetsx } = event;
			const num = player.countCards("h"),
				targets = game.filterPlayer(target => {
					return target.countCards("h") <= num && !targetsx.includes(target);
				});
			if (!targets?.length) {
				return;
			}
			await player
				.chooseToDebate(targets)
				.set("callback", async function (event, trigger, player) {
					const result = event.debateResult;
					if (result.bool && result.opinion) {
						const opinion = result.opinion;
						const targets = event.getParent().targetsx;
						if (opinion && ["red", "black"].includes(opinion)) {
							player.logSkill("twshelun", targets, null, null, [opinion == "red" ? 3 : 4]);
							if (opinion == "red") {
								await game.doAsyncInOrder(targets, async target => player.discardPlayerCard(target, "he", true, 2));
							} else {
								await game.doAsyncInOrder(targets, async target => target.damage());
							}
						}
					}
				})
				.set("ai", card => {
					const player = get.player();
					const targets = get.event().getParent(2).targetsx;
					const color = player == _status.event.source || targets.reduce((sum, target) => sum + get.damageEffect(target, player, player), 0) > 0 ? "black" : "red";
					let val = 5 - get.value(card);
					if (get.color(card) == color) {
						val += 10;
					}
					return val;
				})
				.set("aiCard", target => {
					const targets = get.event().getParent(2).targetsx;
					const color = target == _status.event.source || targets.reduce((sum, target) => sum + get.damageEffect(target, player, player), 0) > 0 ? "black" : "red";
					let hs = target.getCards("h", { color: color });
					if (!hs.length) {
						hs = target.getCards("h");
					}
					return { bool: true, cards: [hs.randomGet()] };
				})
				.set("targetsx", targetsx);
		},
		ai: {
			order: 8,
			expose: 0.2,
			result: { target: -1 },
		},
	}
```

### twfayi 名字:伐异
描述: 当你参与议事结束后，你可以对两名意见与你不同的角色造成1点伤害。
```js
twfayi: {
		audio: "jsrgfayi",
		trigger: { global: "chooseToDebateAfter" },
		filter(event, player) {
			if (!event.targets.includes(player)) {
				return false;
			}
			if (event.red.map(i => i[0]).includes(player)) {
				return event.black.length;
			}
			if (event.black.map(i => i[0]).includes(player)) {
				return event.red.length;
			}
			return false;
		},
		async cost(event, trigger, player) {
			let targets = [];
			if (trigger.red.map(i => i[0]).includes(player)) {
				targets = trigger.black;
			}
			if (trigger.black.map(i => i[0]).includes(player)) {
				targets = trigger.red;
			}
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), [1, 2], (card, player, target) => {
					return _status.event.targets.includes(target);
				})
				.set(
					"targets",
					targets.map(i => i[0])
				)
				.set("ai", target => {
					const player = _status.event.player;
					return get.damageEffect(target, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const func = async target => await target.damage();
			await game.doAsyncInOrder(event.targets, func);
		},
	}
```

## tw_jsrg_liubei 名字:TW起刘备 势力:qun

### twjishan 名字:积善
描述: 每回合每项各限一次。①当一名角色受到伤害时，你可以失去2点体力并防止此伤害，然后你与其各摸一张牌。②当你造成伤害后，你可以令一名体力值最小且你对其发动过〖积善①〗的角色回复1点体力。
```js
twjishan: {
		audio: "jsrgjishan",
		trigger: {
			source: "damageSource",
			global: "damageBegin4",
		},
		filter(event, player, name) {
			if (player.getStorage("twjishan_used").includes(name)) {
				return false;
			}
			if (name == "damageBegin4") {
				return player.hp > 0;
			}
			return game.hasPlayer(current => current.isMinHp() && player.getStorage("twjishan").includes(current) && current.isDamaged());
		},
		async cost(event, trigger, player) {
			const { triggername, skill } = event,
				{ player: target } = trigger;
			if (triggername == "damageBegin4") {
				const result = await player.chooseBool(get.prompt(skill, target), "失去2点体力并防止此伤害，然后你与其各摸一张牌").set("choice", get.info(skill).check(trigger, player)).forResult();
				event.result = {
					bool: result?.bool,
					targets: [target],
				};
			} else {
				event.result = await player
					.chooseTarget(get.prompt(skill), "令一名体力值最小且你对其发动过〖积善①〗的角色回复1点体力", (card, player, target) => {
						return target.isMinHp() && player.getStorage("twjishan").includes(target) && target.isDamaged();
					})
					.set("ai", target => {
						const player = get.player();
						return get.recoverEffect(target, player, player);
					})
					.forResult();
			}
		},
		async content(event, trigger, player) {
			const {
				triggername,
				name,
				targets: [target],
			} = event;
			player.addTempSkill(name + "_used");
			player.markAuto(name + "_used", [triggername]);
			if (triggername == "damageBegin4") {
				player.markAuto(name, [target]);
				trigger.cancel();
				await player.loseHp(2);
				await game.asyncDraw([player, target].sortBySeat(_status.currentPhase));
			} else {
				await target.recover();
			}
		},
		onremove: true,
		check(event, player) {
			return get.damageEffect(event.player, event.source, _status.event.player, event.nature) * event.num < get.effect(player, { name: "losehp" }, player, _status.event.player) * 1.5 + get.effect(player, { name: "draw" }, player, _status.event.player) + get.effect(event.player, { name: "draw" }, player, _status.event.player) / 2;
		},
		logAudio(event, player, name) {
			if (name == "damageBegin4") {
				return 2;
			}
			return ["jsrgjishan3.mp3", "jsrgjishan4.mp3"];
		},
		intro: { content: "已帮助$抵挡过伤害" },
		ai: { expose: 0.2 },
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

### jsrgzhenqiao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## tw_jsrg_sunjian 名字:TW起孙坚 势力:qun

### jsrgpingtao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### jsrgjuelie
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## tw_jsrg_hejin 名字:TW起何进 势力:qun

### jsrgzhaobing
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twzhuhuan
描述: 准备阶段，你可以展示所有手牌并弃置所有【杀】，然后令一名其他角色选择一项：1.受到1点伤害，然后弃置X+1张牌；2.令你回复1点体力，然后你摸X+1张牌（X为你本次弃置【杀】的数量）。
```js
twzhuhuan: {
		audio: "jsrgzhuhuan",
		inherit: "jsrgzhuhuan",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), lib.filter.notMe)
				.set("ai", target => {
					const player = get.player();
					const num = player.countCards("h", "sha") + 1;
					const eff3 = get.damageEffect(target, target, player) + get.effect(target, { name: "guohe_copy2" }, target, player) * Math.min(num, target.countDiscardableCards(target, "he"));
					if (player.isHealthy()) {
						return eff3;
					}
					const eff1 = [0, get.damageEffect(target, target, target) + get.effect(target, { name: "guohe_copy2" }, target, target) * Math.min(num, target.countDiscardableCards(target, "he"))];
					const eff2 = [1, get.recoverEffect(player, player, target) + get.effect(player, { name: "draw" }, player, target) * num];
					return [eff3, get.recoverEffect(player, player, player) + get.effect(player, { name: "draw" }, player, player) * num][eff1[1] > eff2[1] ? 0 : 1];
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.showHandcards();
			const hs = player.getCards("h", "sha");
			await player.discard(hs);
			const num = hs.length + 1;
			const result = player.isDamaged()
				? await target
						.chooseControl()
						.set("choiceList", [`受到1点伤害，然后弃置${get.cnNumber(num)}张牌`, `令${get.translation(player)}回复1点体力，然后${get.translation(player)}摸${get.cnNumber(num)}张牌`])
						.set("ai", () => {
							const num = get.event().num;
							const {
								targets: [target],
								player,
							} = get.event().getParent();
							const eff1 = get.damageEffect(target, target, target) + get.effect(target, { name: "guohe_copy2" }, target, target) * Math.min(num, target.countDiscardableCards(target, "he"));
							const eff2 = get.recoverEffect(player, player, target) + get.effect(player, { name: "draw" }, player, target) * num;
							return eff1 > eff2 ? 0 : 1;
						})
						.set("num", num)
						.forResult()
				: { index: 0 };
			if (result.index === 0) {
				await target.damage();
				await target.chooseToDiscard("he", num, true);
			} else {
				await player.recover();
				await player.draw(num);
			}
		},
	}
```

### jsrgyanhuo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## tw_jsrg_caocao 名字:TW起曹操 势力:qun

### twzhenglve
描述: 每轮首个回合结束时，你可以摸两张牌，然后令一名没有“猎”标记的角色获得“猎”标记（若其本回合没有造成过伤害则改为至多两名）。你对有“猎”的角色使用牌无距离限制，你于出牌阶段使用的第一张牌对有“猎”的角色无任何次数限制。每回合限一次。当你对有“猎”标记的角色造成伤害后，你可以摸一张牌并获得造成伤害的牌。
```js
twzhenglve: {
		audio: "jsrgzhenglve",
		inherit: "jsrgzhenglve",
		filter(event, player) {
			return !game.hasPlayer(current => {
				let history = current.actionHistory;
				for (let num = history.length - 1; num >= 0; num--) {
					if (history[num].isRound) {
						break;
					}
					if (history[num].isSkipped) {
						continue;
					}
					return true;
				}
				return false;
			});
		},
		prompt2(event, player) {
			const num = Math.min(
				event.player.hasHistory("sourceDamage") ? 1 : 2,
				game.countPlayer(current => !current.hasMark("jsrgzhenglve_mark"))
			);
			let str = `你可以摸两张牌`;
			if (num) {
				str += `并令${get.cnNumber(num)}名角色获得“猎”标记`;
			}
			return str;
		},
		drawNum: 2,
		group: ["twzhenglve_damage", "twzhenglve2", "twzhenglve4"],
		mod: {
			targetInRange(card, player, target) {
				if (target.hasMark("jsrgzhenglve_mark")) {
					return true;
				}
			},
		},
		init(player, skill) {
			const evt = _status.event.getParent("phaseUse");
			if (evt.player === player && player.hasHistory("useCard", evtx => evtx.getParent("phaseUse") === evt)) {
				player.addTempSkill(`${skill}3`, "phaseUseAfter");
			}
		},
	}
```

### jsrghuilie
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## tw_jsrg_huangfusong 名字:TW起皇甫嵩 势力:qun

### jsrgguanhuo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twjuxia 名字:居下
描述: `①每回合限一次，其他角色使用牌指定你为目标后，若其技能数多于你，则你可以令此牌对你无效，然后你摸两张牌。②准备阶段，若你没有${get.poptip("jsrgguanhuo")}，则你可以获得之。`
```js
twjuxia: {
		audio: "jsrgjuxia",
		trigger: {
			player: "phaseZhunbeiBegin",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (event.name === "phaseZhunbei") {
				return !player.hasSkill("jsrgguanhuo", null, false, false);
			} else if (player.hasSkill("twjuxia_used")) {
				return false;
			}
			return event.player !== player && lib.skill.jsrgjuxia.countSkill(event.player) > lib.skill.jsrgjuxia.countSkill(player);
		},
		logTarget: "player",
		derivation: "jsrgguanhuo",
		prompt2(event, player) {
			if (event.name !== "phaseZhunbei") {
				return `令${get.translation(event.card)}对你无效，然后你摸两张牌`;
			}
			return `获得技能〖观火〗`;
		},
		frequent(event, player) {
			return event.name === "phaseZhunbei";
		},
		check(event, player) {
			return event.name === "phaseZhunbei" || get.effect(player, { name: "draw" }, player, player) * 2 - get.effect(player, event.card, event.player, player) > 0;
		},
		async content(event, trigger, player) {
			if (trigger.name === "phaseZhunbei") {
				await player.addSkills("jsrgguanhuo");
			} else {
				player.addTempSkill("twjuxia_used");
				trigger.excluded.add(player);
				game.log(trigger.card, "对", player, "无效");
				await player.draw(2);
			}
		},
		ai: {
			effect: {
				target_use(card, player, target) {
					if (lib.skill.jsrgjuxia.countSkill(target) >= lib.skill.jsrgjuxia.countSkill(player)) {
						return;
					}
					if (card && (card.cards || card.isCard) && !target.hasSkill("twjuxia_used")) {
						return [0, 0.5, 0, 0.5];
					}
				},
			},
		},
		subSkill: {
			used: { charlotte: true },
		},
	}
```

## tw_zhenji 名字:TW甄宓 势力:qun

### mbbojian
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twjiwei 名字:济危
描述: 锁定技。①其他角色的回合结束时，你摸2X张牌（X为本回合满足的项数：1.有角色失去过牌；2.有角色受到过伤害）。②准备阶段，若所有角色均存活且你的手牌数不小于5，你将手牌中颜色较多的牌分配给任意名其他角色。
```js
twjiwei: {
		inherit: "mbjiwei",
		audio: "mbjiwei",
		getNum(event, player) {
			let num = 0;
			if (game.countPlayer2(current => current.hasHistory("lose")) >= 1) {
				num++;
			}
			if (game.countPlayer2(current => current.hasHistory("damage")) >= 1) {
				num++;
			}
			if (event.name == "phase") {
				return num * 2;
			}
			if (game.hasPlayer2(current => !current.isAlive())) {
				return 114514;
			}
			return 5;
		},
		filter(event, player) {
			const num = get.info("twjiwei").getNum(event, player);
			if (event.name == "phaseZhunbei") {
				return player.countCards("h") >= num && game.hasPlayer(current => current != player);
			}
			return event.player != player && num > 0;
		},
	}
```

## tw_zhuzhi 名字:TW朱治 势力:wu

### twanguo 名字:安国
描述: 游戏开始时，你令一名其他角色获得「安国」标记。出牌阶段开始时，你可移动「安国」标记至另一名其他角色。出牌阶段限一次，你可以摸等同于拥有「安国」标记的角色已损失体力值张牌，并交给其等量的牌。当你或有「安国」标记的角色进入濒死状态时，你可永久移除「安国」标记中的一项效果，令濒死角色将体力回复至1点。你令有「安国」标记的角色获得以下效果：1.摸牌阶段额外摸一张牌；2.手牌上限等于其体力上限；3.其脱离濒死状态后，其摸一张牌。
```js
twanguo: {
		audio: "sbanguo",
		trigger: { global: "phaseBefore", player: "enterGame" },
		group: ["twanguo_move", "twanguo_draw", "twanguo_dying"],
		logAudio: () => 2,
		filter(event, player) {
			return game.hasPlayer(current => current != player) && (event.name != "phase" || game.phaseNumber == 0);
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseTarget("安国：令一名其他角色获得“安国”标记", lib.filter.notMe, true).forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			target.markAuto(event.name + "_effect", ["draw", "handcard", "dying"]);
			target.addMark(event.name + "_mark", 1);
			target.addAdditionalSkill(event.name + "_" + player.playerid, event.name + "_mark");
		},
		subSkill: {
			mark: {
				onremove: ["twanguo_mark", "twanguo_effect"],
				marktext: "安",
				charlotte: true,
				intro: {
					name: "安国",
					name2: "安国",
					content(storage, player, skill) {
						let str = "目前拥有的效果：";
						const effect = player.getStorage("twanguo_effect");
						if (!effect?.length) {
							str += "<br>无";
						} else {
							effect.forEach(name => {
								switch (name) {
									case "draw":
										str += "<br><li>摸牌阶段额外摸一张牌";
										break;
									case "handcard":
										str += "<br><li>手牌上限等于其体力上限";
										break;
									case "dying":
										str += "<br><li>脱离濒死状态后，摸一张牌";
										break;
								}
							});
						}
						return str;
					},
				},
				forced: true,
				trigger: { player: ["phaseDrawBegin1", "dyingAfter"] },
				filter(event, player) {
					const storage = player.getStorage("twanguo_effect");
					if (event.name == "phaseDraw") {
						return !event.numFixed && storage.includes("draw");
					}
					return storage.includes("dying");
				},
				async content(event, trigger, player) {
					if (trigger.name == "phaseDraw") {
						trigger.num++;
					} else {
						await player.draw();
					}
				},
				mod: {
					maxHandcardBase(player, num) {
						if (player.getStorage("twanguo_effect").includes("handcard")) {
							return player.maxHp;
						}
						return num;
					},
				},
			},
			move: {
				audio: ["sbanguo1.mp3", "sbanguo2.mp3"],
				trigger: { player: "phaseUseBegin" },
				filter(event, player) {
					return game.hasPlayer(current => current.hasSkill("twanguo_mark")) && game.hasPlayer(current => !current.hasMark("twanguo_mark") && current != player);
				},
				async cost(event, trigger, player) {
					const targets = game.filterPlayer(current => current.hasSkill("twanguo_mark"));
					const prompt2 = targets.length == 1 ? "将" + get.translation(targets[0]) + "的“安国”交给一名其他角色" : "选择一名有“安国”的角色，将该标记交给一名未拥有“安国”的其他角色";
					const result = await player
						.chooseTarget(get.prompt("twanguo"), prompt2, targets.length == 1 ? 1 : 2, (card, player, target) => {
							if (ui.selected.targets.length == 0 && _status.event.targets.length > 1) {
								return target.hasSkill("twanguo_mark");
							}
							return !target.hasMark("twanguo_mark") && target != player;
						})
						.set("ai", target => {
							var player = _status.event.player;
							if (ui.selected.targets.length == 0 && _status.event.targets.length > 1) {
								return -get.attitude(player, target);
							}
							return get.attitude(player, _status.event.targets[0]) < get.attitude(player, target);
						})
						.set("targets", targets)
						.set("animate", false)
						.forResult();
					event.result = {
						bool: result?.bool,
						cost_data: result?.targets,
					};
				},
				async content(event, trigger, player) {
					const targets = event.cost_data;
					let target1, target2;
					if (targets.length == 1) {
						target1 = game.filterPlayer(current => current.hasSkill("twanguo_mark"))[0];
						target2 = targets[0];
					} else {
						target1 = targets[0];
						target2 = targets[1];
					}
					player.line2([target1, target2], "green");
					const map = target1.additionalSkills;
					for (const key in map) {
						if (key.indexOf("twanguo_") != 0) {
							continue;
						}
						const id = parseInt(key.slice(8));
						target2.markAuto("twanguo_effect", target1.getStorage("twanguo_effect"));
						target1.removeAdditionalSkill("twanguo_" + id);
						target2.addMark("twanguo_mark", 1);
						target2.addAdditionalSkill("twanguo_" + id, "twanguo_mark");
					}
				},
			},
			draw: {
				audio: ["sbanguo1.mp3", "sbanguo2.mp3"],
				enable: "phaseUse",
				usable: 1,
				prompt: "摸等同于一名拥有“安国”标记的角色已损失体力值张牌，并交给其等量的牌",
				filter(event, player) {
					return game.hasPlayer(target => target.hasMark("twanguo_mark") && target.isDamaged());
				},
				filterTarget(card, player, target) {
					return target.hasMark("twanguo_mark") && target.isDamaged();
				},
				async content(event, trigger, player) {
					const { target } = event,
						num = target.getDamagedHp();
					await player.draw(num);
					await player.chooseToGive(target, num, "he", true);
				},
				ai: {
					order: 7,
					result: {
						target: 1,
					},
				},
			},
			dying: {
				audio: "sbanguo3.mp3",
				trigger: { global: "dying" },
				filter(event, player) {
					const skill = "twanguo_effect";
					if (event.player == player) {
						return game.hasPlayer(target => target.getStorage(skill).length > 0);
					}
					if (event.player.hasMark("twanguo_mark")) {
						return event.player.getStorage(skill).length > 0;
					}
					return false;
				},
				logTarget: "player",
				async cost(event, trigger, player) {
					const createDialog = [
							`###${get.prompt(event.skill, trigger.player)}###移去一个效果令其将体力回复至1点`,
							[
								[
									["draw", "摸牌阶段额外摸一张牌"],
									["handcard", "手牌上限等于其体力上限"],
									["dying", "脱离濒死状态后，摸一张牌"],
								],
								"textbutton",
							],
						],
						target = trigger.player;
					if (trigger.player == player) {
						const result = await player
							.chooseButtonTarget({
								createDialog: createDialog,
								filterButton(button) {
									return game.hasPlayer(target => target.getStorage("twanguo_effect").includes(button.link));
								},
								complexTarget: true,
								filterTarget(card, player, target) {
									const link = ui.selected.buttons?.[0]?.link;
									if (link) {
										return target.getStorage("twanguo_effect").includes(link);
									}
									return false;
								},
								ai1(button) {
									switch (button.link) {
										case "draw":
											return 4;
										case "handcard":
											return 3;
										case "dying":
											return 5;
									}
								},
								ai2(target) {
									const player = get.player(),
										att = get.attitude(player, target),
										link = ui.selected.buttons?.[0]?.link;
									if (!link) {
										return 0;
									}
									if (att < 0) {
										return -att + 2;
									}
									if (
										player.countCards("h", function (card) {
											const mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
											if (mod2 != "unchanged") {
												return mod2;
											}
											const mod = game.checkMod(card, player, player, "unchanged", "cardSavable", player);
											if (mod != "unchanged") {
												return mod;
											}
											let savable = get.info(card).savable;
											if (typeof savable == "function") {
												savable = savable(card, player, player);
											}
											return savable;
										}) >=
										1 - player.hp
									) {
										return 0;
									}
									return 1;
								},
							})
							.forResult();
						event.result = {
							bool: result?.bool,
							cost_data: {
								link: result?.links?.[0],
								remover: result?.targets?.[0],
							},
						};
					} else {
						const result = await player
							.chooseButton(createDialog)
							.set("filterButton", button => {
								return get.event().targetx.getStorage("twanguo_effect").includes(button.link);
							})
							.set("targetx", target)
							.set("ai", button => {
								const player = get.player(),
									target = get.event().targetx,
									att = get.attitude(player, target);
								if (
									att <= 0 ||
									player.countCards("h", function (card) {
										const mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
										if (mod2 != "unchanged") {
											return mod2;
										}
										const mod = game.checkMod(card, player, target, "unchanged", "cardSavable", player);
										if (mod != "unchanged") {
											return mod;
										}
										let savable = get.info(card).savable;
										if (typeof savable == "function") {
											savable = savable(card, player, target);
										}
										return savable;
									}) >=
										1 - target.hp
								) {
									return 0;
								}
								switch (button.link) {
									case "draw":
										return 4;
									case "handcard":
										return 3;
									case "dying":
										return 5;
								}
							})
							.forResult();
						event.result = {
							bool: result?.bool,
							cost_data: {
								link: result?.links?.[0],
							},
						};
					}
				},
				async content(event, trigger, player) {
					const link = event.cost_data.link;
					let remover;
					if (event.cost_data.remover) {
						remover = event.cost_data.remover;
					} else {
						remover = trigger.player;
					}
					player.line(remover);
					remover.unmarkAuto("twanguo_effect", link);
					await trigger.player.recoverTo(1);
				},
			},
		},
	}
```

## huan_dianwei 名字:幻典韦 势力:wei

### twmiewei 名字:灭围
描述: 出牌阶段开始时，你可令此阶段使用【杀】的次数等同于你攻击范围内的角色数。你使用【杀】对目标角色造成伤害时，此伤害+X（X为本回合被【杀】指定过的角色数且至多为5）。
```js
twmiewei: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		prompt2: (event, player) => `出牌阶段开始时，你可令此阶段使用【杀】的次数等同于你攻击范围内的角色数（当前为${game.countPlayer(current => player.inRange(current))}）。`,
		check(event, player) {
			return game.countPlayer(current => player.inRange(current)) > 0;
		},
		content() {
			player.addTempSkill(event.name + "_effect", "phaseUseAfter");
			player.markSkill(event.name + "_effect");
		},
		group: ["twmiewei_damage"],
		subSkill: {
			damage: {
				audio: "twmiewei",
				forced: true,
				locked: false,
				trigger: { source: "damageBegin1" },
				filter(event, player) {
					return event.notLink() && event?.card?.name == "sha" && event.getParent("useCard").targets?.includes(event.player);
				},
				logTarget: "player",
				content() {
					const num = game
						.getGlobalHistory("everything", evt => {
							return evt.name == "useCard" && evt?.card?.name == "sha" && evt.targets;
						})
						.reduce((list, evt) => {
							return list.addArray(evt.targets);
						}, []).length;
					trigger.num += Math.min(5, num);
				},
			},
			effect: {
				charlotte: true,
				mod: {
					cardUsable: function (card, player, num) {
						if (card.name == "sha") {
							return game.countPlayer(current => player.inRange(current));
						}
					},
				},
				intro: {
					markcount(storage, player) {
						return player.getCardUsable("sha");
					},
					content(storage, player, skill) {
						return `还可使用${player.getCardUsable("sha")}张【杀】`;
					},
				},
			},
		},
	}
```

### twmiyong 名字:弥勇
描述: 限定技，出牌阶段，你可展示并标记手牌中的至多两张【杀】。此【杀】每回合因首次使用、首次打出或首次弃置进入弃牌堆时，你展示并获得之。
```js
twmiyong: {
		audio: 2,
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		enable: "phaseUse",
		filter(event, player) {
			return player.hasCard(card => get.name(card, player) == "sha", "h");
		},
		filterCard: (card, player) => get.name(card, player) == "sha" && !player.getStorage("twmiyong_effect").includes(card),
		check: (card, player) => player.getUseValue(card),
		position: "h",
		selectCard: [1, 2],
		lose: false,
		discard: false,
		delay: false,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const cards = event.cards;
			const skill = "twmiyong_effect";
			await player.showCards(cards);
			player.addGaintag(cards, skill);
			player.addSkill(skill);
			cards.forEach(card => {
				card.storage[skill] = true;
			});
		},
		subSkill: {
			effect: {
				audio: "twmiyong",
				mod: {
					aiOrder(card, player, num) {},
				},
				onremove(player, skill) {
					player.removeGaintag(skill);
					delete player.storage[skill];
				},
				charlotte: true,
				forced: true,
				trigger: {
					global: ["loseAfter", "loseAsyncAfter", "cardsDiscardAfter"],
				},
				getSha(event, player) {
					let gain = []; //考虑到后续可能有重置限定技的技能，需要对每张记录的牌都判断一次是否为首次
					const cards = event.cards.filter(card => card.storage.twmiyong_effect);
					if (!cards.length) {
						return gain;
					}
					let use = [],
						respond = [],
						discard = [];
					//直接获取本回合所有有关的弃牌出牌事件
					game.checkGlobalHistory("cardMove", evt => {
						const cardsx = evt.cards;
						if (!cardsx || !cardsx.some(card => cards.includes(card))) {
							return false;
						}
						if (event.name.indexOf("lose") == 0 && ["lose", "loseAsync"].includes(evt.name)) {
							if (evt.position != ui.discardPile || evt.type != "discard" || evt.getlx === false) {
								return false;
							}
							discard.add(evt);
						} else if (evt.name == "cardsDiscard" && event.name == "cardsDiscard") {
							const evtx = evt.getParent();
							if (evtx.name !== "orderingDiscard") {
								return false;
							}
							const evt2 = evtx.relatedEvent || evtx.getParent();
							if (evt2.name == "useCard") {
								use.add(evt);
							} else if (evt2.name == "respond") {
								respond.add(evt);
							}
						}
					});
					//对每张记录牌分别判断，该事件是不是其首次
					gain.addArray(
						cards.filter(card => {
							return [use, respond, discard].some(list => list.filter(evt => evt.cards.includes(card)).indexOf(event) == 0);
						})
					);
					return gain.filterInD("d");
				},
				filter(event, player) {
					if (event.name.indexOf("lose") == 0) {
						if (event.position != ui.discardPile || event.type != "discard" || event.getlx === false) {
							return false;
						}
					} else {
						const evt = event.getParent();
						if (evt.name !== "orderingDiscard") {
							return false;
						}
						const evt2 = evt.relatedEvent || evt.getParent();
						if (!["useCard", "respond"].includes(evt2.name)) {
							return false;
						}
					}
					const cards = lib.skill.twmiyong_effect.getSha(event, player);
					if (cards.length) {
						event.set("twmiyong_effect", cards);
						return true;
					}
					return false;
				},
				async content(event, trigger, player) {
					const cards = trigger[event.name].filterInD("d");
					if (!cards.length) {
						return;
					}
					await player.showCards(cards);
					await player.gain(cards, "gain2").set("gaintag", [event.name]);
				},
			},
		},
	}
```

## huan_caopi 名字:幻曹丕 势力:wei

### twqianxiong 名字:潜凶
描述: 出牌阶段限一次，你可观看牌堆顶的五张牌，将其中一张正面朝下置于一名角色的武将牌上。有「潜凶」牌的角色的出牌阶段开始时，你选择一项：1.本回合每当其使用或打出与其「潜凶」牌相同牌名的牌时，你对其造成1点伤害，本回合结束你移除与其使用或打出过的相同名牌的「潜凶」牌；2、你依次使用其所有「潜凶」牌。
```js
twqianxiong: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		manualConfirm: true,
		async content(event, trigger, player) {
			const cards = get.cards(5, true);
			const result = await player
				.chooseButton(["潜凶：选择一张要扣置的牌", cards], true)
				.set("ai", button => {
					return get.player().getUseValue(button.link);
				})
				.forResult();
			if (!result?.bool || !result.links?.length) {
				return;
			}
			const card = result.links[0];
			const result2 = await player
				.chooseTarget(`潜凶：将${get.translation(card)}正面向下置于一名角色的武将牌上`, true)
				.set("ai", target => -get.attitude(get.player(), target))
				.forResult();
			if (!result2?.bool || !result2.targets?.length) {
				return;
			}
			const target = result2.targets[0];
			player.line(target);
			game.log(player, "将一张牌正面向下置于", target, "的武将牌上");
			await target.addToExpansion(card, player, "give").set("gaintag", ["twqianxiong"]);
		},
		intro: {
			markcount: "expansion",
			content(storage, player, skill) {
				return `共扣置${player.getExpansions("twqianxiong").length}张牌`;
			},
		},
		ai: {
			order: 5,
			result: { player: 1 },
		},
		group: ["twqianxiong_effect"],
		subSkill: {
			damage: {
				audio: "twqianxiong",
				onremove: true,
				forced: true,
				charlotte: true,
				trigger: { global: ["useCard", "respond"] },
				filter(event, player) {
					const target = event.player;
					if (!player.getStorage("twqianxiong_damage").includes(target)) {
						return false;
					}
					return target.getExpansions("twqianxiong").some(card => card.name == event.card.name);
				},
				logTarget: "player",
				content() {
					trigger.player.damage();
				},
			},
			effect: {
				audio: "twqianxiong",
				trigger: { global: "phaseUseBegin" },
				filter(event, player) {
					return event.player.getExpansions("twqianxiong").length;
				},
				async cost(event, trigger, player) {
					const list = [`本回合每当其使用或打出与其「潜凶」牌相同牌名的牌时，你对其造成1点伤害，本回合结束你移除与其使用或打出过的相同名牌的「潜凶」牌`, `你依次使用其所有「潜凶」牌`],
						target = trigger.player;
					const result = await player
						.chooseControl()
						.set("choiceList", list)
						.set("prompt", `潜凶：为${get.translation(target)}选择一项`)
						.set("ai", () => {
							//ai待完善
							let att = get.attitude(get.player(), get.event().target);
							if (att > 0) {
								return "cancel2";
							}
							return ["选项一", "选项二"].randomGet();
						})
						.set("target", target)
						.forResult();
					if (result.control != "cancel2") {
						event.result = {
							bool: true,
							cost_data: result.control,
						};
					}
				},
				async content(event, trigger, player) {
					const control = event.cost_data,
						target = trigger.player;
					if (control == "选项一") {
						player.addTempSkill("twqianxiong_damage");
						player.markAuto("twqianxiong_damage", [target]);
						target.when("phaseEnd").step(async (event, trigger, player) => {
							const cards = player.getExpansions("twqianxiong").filter(card => {
								return player.hasHistory("useCard", evt => evt.card.name == card.name) || player.hasHistory("respond", evt => evt.card.name == card.name);
							});
							if (!cards.length) {
								return;
							}
							await player.loseToDiscardpile(cards);
						});
					} else if (control == "选项二") {
						const cards = target.getExpansions("twqianxiong").slice(0);
						if (!cards.length) {
							return;
						}
						while (target.isAlive() && cards.some(card => player.hasUseTarget(card))) {
							const str = "潜凶：请使用其中一张牌";
							const result = await player
								.chooseButton(true, [str, cards])
								.set("filterButton", button => {
									return get.player().hasUseTarget(button.link);
								})
								.set("ai", button => {
									return get.order(button.link);
								})
								.forResult();
							const card = result.links[0];
							cards.remove(card);
							player.$gain2(card, false);
							game.delayx();
							await player.chooseUseTarget(card, true);
						}
					}
				},
			},
		},
	}
```

### twzhengshi 名字:争適
描述: 游戏开始时，你令自己和两名其他角色获得〖隽嗣〗。一名拥有〖隽嗣〗的角色死亡后或首轮开始时，若你拥有〖隽嗣〗，你可令一名角色〖隽嗣〗的摸牌数或弃牌数+1或-1。
```js
twzhengshi: {
		audio: 3,
		logAudio: index => (typeof index === "number" ? "twzhengshi" + index + ".mp3" : 1),
		derivation: ["twjunsi"],
		forced: true,
		locked: false,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		async content(event, trigger, player) {
			let targets;
			if (game.countPlayer() <= 3) {
				targets = game.filterPlayer();
			} else {
				const result = await player
					.chooseTarget(`争適：请选择两名其他角色，然后你和这些角色获得〖隽嗣〗`, 2, lib.filter.notMe, true)
					.set("ai", target => -get.attitude(get.player(), target))
					.forResult();
				targets = result.targets.concat([player]).sortBySeat();
			}
			player.line(targets, "thunder");
			for (const target of targets) {
				await target.addSkills(["twjunsi"]);
			}
		},
		group: ["twzhengshi_change"],
		subSkill: {
			change: {
				popup: false,
				trigger: { global: ["roundStart", "dieAfter"] },
				filter(event, player) {
					if (!player.hasSkill("twjunsi")) {
						return false;
					}
					return event.name == "die" ? event.player.hasSkill("twjunsi") : game.roundNumber == 1;
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget(`争適：令一名角色〖隽嗣〗的摸牌数或弃牌数+1或-1`, (card, player, target) => {
							return target.hasSkill("twjunsi");
						})
						.set("ai", target => {
							//ai待完善
							return Math.random();
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					const list = ["摸牌数+1", "摸牌数-1", "弃牌数+1", "弃牌数-1"];
					const result = await player
						.chooseButton(
							[
								`争適：令${get.translation(target)}〖隽嗣〗的摸牌数或弃牌数+1或-1`,
								/*[
									list.map((item, index) => {
										return [index, item];
									}),
									"textbutton",
								],*/
								[list.slice(0, 2).map((item, index) => [index, item]), "tdnodes"],
								[list.slice(2, 4).map((item, index) => [index + 2, item]), "tdnodes"],
							],
							true,
							1
						)
						.set("filterButton", function (button) {
							const num = button.link + 1;
							if (num % 2 == 0) {
								return get.event().target.getStorage("twjunsi")[num / 2 - 1] > 0;
							}
							return true;
						})
						.set("target", target)
						.set("ai", button => {
							const att = get.attitude(get.player(), get.event().target);
							switch (button.link) {
								case 0:
									return att * 1;
								case 1:
									return -att * 1;
								case 2:
									return -att * 1.5;
								case 3:
									return att * 1.5;
								default:
									break;
							}
						})
						.forResult();
					const num = result.links[0] + 1;
					player.logSkill("twzhengshi", [target], null, null, [get.rand(2, 3)]);
					target.popup(list[num - 1]);
					game.log(target, "〖隽嗣〗的", list[num - 1]);
					target.storage.twjunsi[Math.ceil(num / 2) - 1] += num % 2 == 1 ? 1 : -1;
					target.markAuto("twjunsi");
				},
			},
		},
	}
```

## huan_caozhi 名字:幻曹植 势力:wei

### twhanhong 名字:翰鸿
描述: 出牌阶段每种花色限一次，你可指定一种花色并弃置X张牌（X为你手牌中花色最多的牌数），然后观看牌堆顶前等量张你指定花色的牌并获得其中一张。若你以此法弃置的牌中有梅花牌，你摸一张牌。
```js
twhanhong: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			if (player.getStorage("twhanhong_used").length >= 4) {
				return false;
			}
			return player.countDiscardableCards(player, "h") > 0;
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog(get.prompt2("twhanhong"));
			},
			chooseControl(event, player) {
				const choices = lib.suit.filter(s => !player.getStorage("twhanhong_used").includes(s));
				choices.push("cancel2");
				return choices;
			},
			check(event, player) {
				return lib.suit.filter(s => !player.getStorage("twhanhong_used").includes(s)).randomGet();
			},
			backup(result, player) {
				return {
					audio: "twhanhong",
					suit: result.control,
					filterCard: true,
					position: "he",
					selectCard() {
						const player = get.player();
						const nums = lib.suit
							.map(s => {
								return player.countCards("h", { suit: s });
							})
							.sort((a, b) => b - a);
						return nums[0];
					},
					async content(event, trigger, player) {
						const suit = lib.skill.twhanhong_backup.suit;
						const cards = event.cards;
						player.popup(suit);
						player.addTempSkill("twhanhong_used", "phaseUseAfter");
						player.markAuto("twhanhong_used", [suit]);
						let view = [];
						for (let i = 0; i < cards.length; i++) {
							let card = get.cardPile(card => {
								return get.suit(card) == suit && !view.includes(card);
							});
							if (!card) {
								break;
							}
							view.add(card);
						}
						if (!view.length) {
							player.chat(`bro牌堆没有${suit}牌了`);
							return;
						}
						const result = await player
							.chooseCardButton("翰鸿：请选择要获得的牌", view, true)
							.set("ai", button => get.buttonValue(button))
							.forResult();
						const card = result.links[0];
						game.log(player, "从牌堆获得一张牌");
						await player.gain(card, "draw");
						if (cards.some(cardx => get.suit(cardx) == "club")) {
							await player.draw();
						}
					},
				};
			},
			prompt(result, player) {
				const nums = lib.suit
					.map(s => {
						return player.countCards("h", { suit: s });
					})
					.sort((a, b) => b - a);
				return `请弃置${nums[0]}张牌，然后观看牌堆顶前${nums[0]}张${get.translation(result.contrl)}牌并获得其中一张`;
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
				onremove: true,
				charlotte: true,
				intro: {
					content: "已发动过的花色：$",
				},
			},
		},
	}
```

### twhuazhang 名字:华章
描述: 出牌阶段结束时，若你手牌数不小于2，你可重铸所有手牌，这些牌每满足以下中的一项：花色相同、点数连续、牌名相同，你便依次执行一项：1、摸X张牌；2、本回合手牌上限+X；3、摸X张牌且本回合手牌上限+X（X为你以此法重铸的手牌数）。
```js
twhuazhang: {
		audio: 3,
		logAudio: index => (typeof index === "number" ? "twhuazhang" + index + ".mp3" : 2),
		trigger: {
			player: "phaseUseEnd",
		},
		filter(event, player) {
			return player.countCards("h") >= 2 && player.hasCard(card => player.canRecast(card), "h");
		},
		check: () => true,
		async content(event, trigger, player) {
			const cards = player.getCards("h", card => player.canRecast(card)),
				num = cards.length;
			await player.recast(cards);

			let count = 0;
			if (cards.map(card => get.suit(card)).unique().length == 1) {
				count++;
			}
			const nums = cards
				.map(card => get.number(card))
				.unique()
				.sort((a, b) => a - b);
			if (nums.length == cards.length && nums.length > 1) {
				if (nums[nums.length - 1] - nums[0] == nums.length - 1) {
					count++;
				}
			}
			if (cards.map(card => get.name(card, player)).unique().length == 1) {
				count++;
			}

			if (count > 0) {
				player.logSkill("twhuazhang", null, null, null, [3]);
				await player.draw(num);
			}
			if (count > 1) {
				player.addTempSkill("twhuazhang_hs");
				player.addMark("twhuazhang_hs", num, false);
			}
			if (count > 2) {
				await player.draw(num);
				player.addMark("twhuazhang_hs", num, false);
			}
		},
		subSkill: {
			hs: {
				onremove: true,
				charlotte: true,
				markimage: "image/card/handcard.png",
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("twhuazhang_hs");
					},
				},
				intro: {
					content: "本回合手牌上限+#",
				},
			},
		},
	}
```

## tw_zhangyun 名字:TW张允 势力:qun

### twhuiyu 名字:毁誉
描述: 准备阶段，你可以选择两名角色，令其中一名角色代替成为另一名角色下个出牌阶段造成的伤害的来源。
```js
twhuiyu: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return true;
		},
		async cost(event, trigger, player) {
			const targetprompt = Math.random() > 0.25 ? ["代替", "被代替"] : ["替罪羊", "躺赢狗"];
			if (targetprompt[1] == "躺赢狗") {
				trigger.set("twhuiyu_tyg", true);
			}
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), 2)
				.set("ai", target => {
					const selected = ui.selected.targets;
					if (!selected.length) {
						return -get.attitude(get.player(), target);
					}
					return get.attitude(get.player(), target);
				})
				.set("targetprompt", targetprompt)
				.set("multitarget", true)
				.set("multiline", true)
				.set("complexTarget", true)
				.set("complexSelect", true)
				.forResult();
		},
		async content(event, trigger, player) {
			const source = event.targets[0],
				target = event.targets[1],
				skill = event.name + "_effect";
			target.addTempSkill(skill, { player: "phaseUseAfter" });
			//出现放权回合可能会重复指定，干脆直接覆盖掉原来的
			if (target.storage[skill]) {
				delete target.storage[skill];
			}
			target.markAuto(skill, [source]);
			target.addTip(skill, get.translation(skill) + " " + get.translation(source));
			if (trigger.twhuiyu_tyg) {
				player.chat(`${get.translation(target)}的评分是3.0，躺赢狗！`);
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove(player, skill) {
					delete player.storage[skill];
					player.removeTip(skill);
				},
				intro: {
					markcount: () => 0,
					content: "你出牌阶段的替罪羊为：$",
				},
				trigger: {
					source: "damageBefore",
				},
				logTarget(event, player) {
					const source = game.findPlayer(target => player.getStorage("twhuiyu_effect").includes(target));
					return source;
				},
				forced: true,
				filter(event, player) {
					return lib.skill.twhuiyu_effect.logTarget(event, player)?.isIn() && player.isPhaseUsing();
				},
				content() {
					const source = event.targets[0];
					if (source.isIn()) {
						trigger.source = source;
						game.log(source, "代替", player, "成为伤害来源");
						source.line(trigger.player);
					}
				},
			},
		},
	}
```

### twbeixing 名字:狈行
描述: 每轮限一次，其他角色的出牌阶段结束时，若其于此回合没有造成过伤害，你可以展示其所有手牌，然后弃置其中一张牌（此时其手牌对你可见），淩越·体力：你可令一名因〖毁誉〗代替成为过伤害来源的角色获得其中一张牌。
```js
twbeixing: {
		audio: 2,
		round: 1,
		trigger: { global: "phaseUseEnd" },
		filter(event, player) {
			return player != event.player && event.player.countCards("h") && !event.player.hasHistory("sourceDamage");
		},
		check(event, player) {
			return get.attitude(player, event.player) < 0 && event.player.countDiscardableCards(player, "h");
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const target = trigger.player;
			await player.showCards(target.getCards("h"), `${get.translation(player)}发动了〖${get.translation(event.name)}〗`);
			if (target.countDiscardableCards(player, "h") > 0) {
				await player.discardPlayerCard(target, "h", true, "visible");
			}
			const targets = player
				.getAllHistory("useSkill", evt => evt.skill == "twhuiyu")
				.reduce((list, evt) => {
					return list.add(evt.targets[0]);
				}, [])
				.filter(targetx => {
					return targetx.isIn() && target.countGainableCards(targetx, "h") > 0;
				});
			if (targets.length && player.hp > target.hp) {
				//淩越·体力
				const result = await player
					.chooseTarget(`狈行：你可令一名角色获得${get.translation(target)}的一张手牌`, (card, player, target) => {
						return get.event().targets.includes(target) && target != get.event().sourcex;
					})
					.set("ai", target => {
						return get.effect(get.event().sourcex, { name: "shunshou_copy2" }, target, player);
					})
					.set("targets", targets)
					.set("sourcex", target)
					.forResult();
				if (!result?.bool) {
					return;
				}
				const gainer = result.targets[0];
				player.line(gainer);
				await gainer.gainPlayerCard(target, "h", true, "visible");
			}
		},
	}
```

## huan_caochong 名字:幻曹冲 势力:wei

### twfushu 名字:複舒
描述: 每回合限一次，当你需要使用【桃】时，你可与牌堆顶的一张牌拼点：若你赢，你视为使用一张【桃】；若你没赢，你下次受到的伤害值+1。
```js
twfushu: {
		audio: 2,
		enable: "chooseToUse",
		hiddenCard(player, name) {
			return name === "tao" && player.countCards("h") > 0 && !player.hasSkillTag("noCompareSource");
		},
		filter(event, player) {
			if (event.twfushu) {
				return false;
			}
			return event.filterCard({ name: "tao", isCard: true }, player, event) && player.countCards("h") && !player.hasSkillTag("noCompareSource");
		},
		filterCard: () => true,
		selectCard: 1,
		lose: false,
		discard: false,
		delay: false,
		log: false,
		check(card) {
			if (typeof card == "string" && lib.skill[card]) {
				var ais =
					lib.skill[card].check ||
					function () {
						return 0;
					};
				return ais();
			}
			var player = get.owner(card);
			var getn = function (card) {
				return get.number(card);
			};
			var event = _status.event.getParent();
			var addi = get.value(card) >= 8 && get.type(card) != "equip" ? -6 : 0;
			if (card.name == "du") {
				addi -= 5;
			}
			return getn(card) - get.value(card) / 5 + addi;
		},
		prompt: "选择一张手牌与牌堆顶的一张牌拼点：若你赢，你视为使用一张【桃】；若你没赢，你下次受到的伤害值+1",
		async precontent(event, trigger, player) {
			player.logSkill("twfushu");
			player.tempBanSkill("twfushu", null, false);
			const next = player.chooseToCompare().set("target", "cardPile");
			next.fixedResult ??= {};
			next.fixedResult[player.playerid] = event.result.cards[0];
			event.result.card = { name: "tao", isCard: true };
			delete event.result.cards;
			const result = await next.forResult();
			if (!result.bool) {
				player.addSkill("twfushu_damage");
				player.addMark("twfushu_damage", 1, false);
				const evt = event.getParent();
				evt.set("twfushu", true);
				evt.goto(0);
				delete evt.openskilldialog;
				return;
			}
		},
		viewAs: {
			name: "tao",
			isCard: true,
		},
		ai: {
			save: true,
			skillTagFilter(player, tag, arg) {
				return player.countCards("h") > 0 && !player.hasSkillTag("noCompareSource");
			},
			order: 7,
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
			damage: {
				audio: 2,
				onremove: true,
				intro: {
					content: "下次受到的伤害+1",
				},
				charlotte: true,
				forced: true,
				trigger: {
					player: "damageBegin3",
				},
				filter(event, player) {
					return player.hasMark("twfushu_damage");
				},
				content() {
					trigger.num += player.countMark(event.name);
					player.removeSkill(event.name);
				},
			},
		},
	}
```

### twxiumu 名字:修睦
描述: 当你受到伤害后，你可令一名其他角色选择任意张点数之和大于等于13的手牌交换你的所有手牌（若其所有手牌点数之和小于13，则全部交换）。
```js
twxiumu: {
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return game.hasPlayer(current => current.countCards("h") && current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return target.hasCards("h") && target != player;
				})
				.set("ai", target => {
					const player = get.player();
					const num = player.countCards("h") - target.countCards("h");
					return get.attitude(player, target) * (num / 2);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			let cards = [];
			if (
				target.getCards("h").reduce((num, card) => {
					return num + get.number(card, target);
				}, 0) < 13
			) {
				cards = target.getCards("h");
			} else {
				const result = await target
					.chooseCard(`修睦：请选择点数之和大于等于13的手牌与${get.translation(player)}的手牌交换`, [1, Infinity], true, "h")
					.set("filterOk", () => {
						const player = get.player();
						const selected = ui.selected.cards;
						if (!selected?.length) {
							return false;
						}
						return (
							selected.reduce((num, card) => {
								return num + get.number(card, player);
							}, 0) >= 13
						);
					})
					.set("ai", card => {
						const player = get.player();
						const att = get.attitude(player, get.event().sourcex);
						const num = ui.selected.cards.reduce((num, cardx) => {
							return num + get.number(cardx, player);
						}, 0);
						if (num < 13) {
							if (att > 0) {
								return 8 - get.value(card);
							}
							return Math.ceil(get.number(card, player) / 4) * Math.max(1, 6 - get.value(card));
						}
						return 0;
					})
					.set("sourcex", player)
					.forResult();
				cards = result?.cards;
			}
			if (get.itemtype(cards) == "cards") {
				await target.swapHandcards(player, cards, player.getCards("h"));
			}
		},
		ai: {
			//法正恩怨的ai
			maixie_defend: true,
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return [1, -1.5];
					}
					if (!target.hasFriend()) {
						return;
					}
					if (get.tag(card, "damage")) {
						return [1, 0, 0, -0.7];
					}
				},
			},
		},
	}
```

## tw_simashi 名字:TW司马师 势力:wei

### baiyi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twjinglve 名字:景略
描述: 出牌阶段限一次，若场上没有与你对应的「死士」牌，则你可以观看一名角色的手牌，将其中一张牌标记为「死士」。当其使用对应的实体牌中包含「死士」的牌时，你取消此牌的所有目标。其回合结束后，你从牌堆/弃牌堆/一名角色的区域内获得「死士」牌。
```js
twjinglve: {
		audio: "jinglve",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			if (player.hasSkill("twjinglve2")) {
				return false;
			}
			return game.hasPlayer(target => lib.skill.twjinglve.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			return target.hasCards("h");
		},
		async content(event, trigger, player) {
			const target = event.target;
			player.markAuto("jinglve4", [target]);
			const result = await player
				.chooseButton(["选择一张牌作为「死士」", target.getCards("h")], true)
				.set("ai", button => {
					const card = button.link;
					const val = get.event().getParent().target.getUseValue(card);
					return Math.max(val, get.value(card));
				})
				.forResult();
			if (result?.bool && result.links?.length) {
				player.storage.twjinglve2 = target;
				player.storage.twjinglve3 = result.links[0];
				player.addSkill("twjinglve2");
			}
		},
		ai: {
			order: 12,
			result: { target: -1 },
		},
	}
```

### shanli
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## tw_sb_caopi 名字:TW谋曹丕 势力:wei

### twsbxingshang 名字:行殇
描述: 一名角色死亡时，你可以分配其区域里的牌。出牌阶段结束时，你可将一名角色区域里的牌数弃置至与其体力值相等，然后你可使用至多X张其以此法弃置的牌（X为其体力值）。
```js
twsbxingshang: {
		audio: "sbxingshang",
		trigger: {
			global: "die",
			player: "phaseUseEnd",
		},
		filter(event, player) {
			if (event.name == "die") {
				return event.player.countCards("hej") > 0;
			}
			return game.hasPlayer(current => {
				return current.countCards("hej") > current.getHp();
			});
		},
		async cost(event, trigger, player) {
			if (trigger.name != "die") {
				event.result = await player
					.chooseTarget(`###${get.prompt(event.skill)}###将一名角色区域里的牌数弃置至与其体力值相同`, (card, player, target) => {
						return target.countCards("hej") > target.getHp();
					})
					.set("ai", target => {
						const num = target.countCards("hej") - target.getHp(),
							player = get.player();
						return num * get.effect(target, { name: "guohe" }, player, player);
					})
					.forResult();
				return;
			}
			const cards = trigger.player.getCards("hej").slice(0),
				give_map = new Map();
			if (_status.connectMode) {
				game.broadcastAll(function () {
					_status.noclearcountdown = true;
				});
			}
			do {
				const prompt1 = give_map.size > 0 ? "行殇：继续分配剩余牌" : "行殇：是否分配本次弃置的牌？",
					prompt2 = give_map.size > 0 ? `行殇：将${get.translation(cards)}分配给一名角色` : `行殇：是否令一名角色获得${get.translation(cards)}？`;
				const result =
					cards.length > 1
						? await player
								.chooseButtonTarget({
									createDialog: [prompt1, cards],
									selectButton: [1, Infinity],
									cardsx: cards,
									forced: give_map.size > 0,
									source: trigger.player,
									filterTarget(card, player, target) {
										return target != get.event().source;
									},
									ai1(button) {
										return get.value(button.link);
									},
									canHidden: true,
									ai2(target) {
										const player = get.player();
										const card = ui.selected.buttons[0].link;
										if (card) {
											return get.value(card, target) * get.attitude(player, target);
										}
										return 1;
									},
								})
								.set("allowChooseAll", true)
								.forResult()
						: await player
								.chooseTarget(prompt2, (card, player, target) => {
									return target != get.event().source;
								})
								.set("forced", give_map.size > 0)
								.set("ai", target => {
									const att = get.attitude(_status.event.player, target);
									if (_status.event.enemy) {
										return -att;
									} else if (att > 0) {
										return att / (1 + target.countCards("h"));
									} else {
										return att / 100;
									}
								})
								.set("source", trigger.player)
								.set("enemy", get.value(cards[0], player, "raw") < 0)
								.forResult();
				if (result?.bool) {
					if (!result.links?.length) {
						result.links = cards.slice(0);
					}
					cards.removeArray(result.links);
					const target = result.targets[0],
						list = give_map.has(target) ? give_map.get(target) : [];
					give_map.set(target, [...list, ...result.links]);
				} else {
					break;
				}
			} while (cards.length > 0);
			if (_status.connectMode) {
				game.broadcastAll(function () {
					delete _status.noclearcountdown;
					game.stopCountChoose();
				});
			}
			const targets = Array.from(give_map.keys()),
				lose_list = [];
			for (let i of targets) {
				lose_list.add([i, give_map.get(i)]);
			}
			event.result = {
				bool: targets.length > 0,
				targets: targets?.sortBySeat(),
				cost_data: lose_list,
			};
		},
		async content(event, trigger, player) {
			if (trigger.name != "die") {
				const target = event.targets[0];
				const discards = target.getDiscardableCards(player, "hej"),
					num = target.countCards("hej") - target.getHp();
				const result =
					discards.length > num
						? await player.discardPlayerCard(target, num, "hej", true).forResult()
						: {
								bool: true,
								links: discards,
							};
				if (result?.bool && result.links?.length && target.getHp() > 0) {
					const cards = [],
						num = target.getHp();
					while (cards.length < num) {
						const canUse = result.links.filter(card => {
							return get.position(card) == "d" && !cards.includes(card) && player.hasUseTarget(card);
						});
						if (!canUse?.length) {
							break;
						}
						const result2 = await player
							.chooseButton(["行殇：是否使用其中一张牌？", canUse])
							.set("ai", button => {
								const player = get.player();
								return player.getUseValue(button.link);
							})
							.forResult();
						if (result2?.bool) {
							cards.addArray(result2.links);
							const card = result2.links[0];
							if (player.hasUseTarget(card)) {
								await player.chooseUseTarget(card, true, false);
							}
						} else {
							break;
						}
					}
				}
				return;
			}
			await game
				.loseAsync({
					gain_list: event.cost_data,
					giver: trigger.player,
					animate: "gain2",
				})
				.setContent("gaincardMultiple");
		},
	}
```

### twsbfangzhu 名字:放逐
描述: `①你受到伤害后，若为伤害来源本轮首次对你造成伤害，你可选择一项：1.令其非锁定技失效并获得${get.poptip("twyuanbu")}直到其下个回合结束；2.令其不能使用或打出当前手牌直到其下个回合结束。②每轮限一次，一名角色的回合开始时，你可令一名角色与其下家交换座次（不能包含当前回合角色）。`
```js
twsbfangzhu: {
		audio: "sbfangzhu",
		trigger: {
			player: "damageEnd",
		},
		filter(event, player) {
			return (
				event.source?.isIn() &&
				event.source
					.getRoundHistory("sourceDamage", evt => {
						return evt.player == player;
					})
					.indexOf(event) == 0
			);
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseButton([
					get.prompt(event.skill, trigger.source),
					[
						[
							["fengyin", `令其非锁定技失效并获得${get.poptip("twyuanbu")}直到其下个回合结束`],
							["gongsun", "令其不能使用或打出当前手牌直到其下个回合结束"],
						],
						"textbutton",
					],
				])
				.set("att", get.attitude(player, trigger.source))
				.set("ai", button => {
					if (get.event().att > 0) {
						return 0;
					}
					return Math.random();
				})
				.forResult();
			if (result?.bool && result.links?.length) {
				event.result = {
					bool: true,
					cost_data: result.links[0],
				};
			}
		},
		logTarget: "source",
		async content(event, trigger, player) {
			const {
					targets: [target],
					cost_data,
					name,
				} = event,
				skill = `${name}_${cost_data}`,
				phase = trigger.getParent("phase");
			target.addSkill(skill);
			if (cost_data == "fengyin") {
				target.addAdditionalSkills(skill, "twyuanbu");
				target.markAuto(skill, [phase]);
			} else {
				target.markAuto(skill, [[phase, target.getCards("h")]]);
				target.addGaintag(target.getCards("h"), "twsbfangzhu");
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
				},
			},
		},
		group: "twsbfangzhu_liufang",
		subSkill: {
			liufang: {
				audio: "twsbfangzhu",
				trigger: {
					global: "phaseBegin",
				},
				filter(event, player) {
					if (player.hasSkill("twsbfangzhu_used")) {
						return false;
					}
					return game.countPlayer(() => true) >= 3;
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget(get.prompt(event.skill), "每轮限一次，你可令一名角色与其下家交换座次（不能包含当前回合角色）", (card, player, target) => {
							if (!_status.currentPhase) {
								return true;
							}
							const cannot = _status.currentPhase;
							return target != cannot && target != cannot.getPrevious();
						})
						.set("ai", target => {
							const player = get.player(),
								targetx = target.getNext();
							let eff = -get.attitude(player, target);
							if (targetx?.isIn()) {
								eff += get.attitude(player, targetx);
							}
							return eff;
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const target = event.targets[0],
						targetx = target.getNext();
					player.addTempSkill("twsbfangzhu_used", { global: "roundStart" });
					game.broadcastAll(
						function (target1, target2) {
							game.swapSeat(target1, target2);
						},
						target,
						targetx
					);
				},
			},
			used: {
				charlotte: true,
			},
			fengyin: {
				init: function (player, skill) {
					player.addSkillBlocker(skill);
					player.addTip(skill, "放逐 远步");
				},
				onremove: function (player, skill) {
					player.removeSkillBlocker(skill);
					player.removeTip(skill);
					player.setStorage(skill, []);
				},
				trigger: {
					player: "phaseEnd",
				},
				async cost(event, trigger, player) {
					const list = player.getStorage(event.skill);
					if (list.length && list.some(phase => phase == trigger)) {
						player.setStorage(
							event.skill,
							list.filter(phase => phase == trigger)
						);
					} else {
						player.removeSkill(event.skill);
					}
				},
				charlotte: true,
				skillBlocker: function (skill, player) {
					return !lib.skill[skill].persevereSkill && !lib.skill[skill].charlotte && !get.is.locked(skill, player);
				},
				mark: true,
				intro: {
					markcount: () => null,
					content: function (storage, player, skill) {
						var list = player.getSkills(null, false, false).filter(function (i) {
							return lib.skill.fengyin.skillBlocker(i, player);
						});
						if (list.length) {
							return "失效技能：" + get.translation(list);
						}
						return "无失效技能";
					},
				},
			},
			gongsun: {
				init: function (player, skill) {
					player.addTip(skill, "放逐 限牌");
				},
				onremove: function (player, skill) {
					player.removeTip(skill);
					player.setStorage(skill, []);
					player.removeGaintag("twsbfangzhu");
				},
				trigger: {
					player: "phaseEnd",
				},
				async cost(event, trigger, player) {
					const list = player.getStorage(event.skill);
					if (list.length && list.some(list => list[0] == trigger)) {
						player.setStorage(
							event.skill,
							list.filter(list => list[0] == trigger)
						);
						player.removeGaintag("twsbfangzhu");
						const cards = [];
						for (let i of list) {
							if (i[0] !== trigger) {
								continue;
							}
							cards.addArray(i[1]);
						}
						player.addGaintag(cards, "twsbfangzhu");
					} else {
						player.removeSkill(event.skill);
					}
				},
				charlotte: true,
				mod: {
					cardEnabled(card, player) {
						const cards = [card];
						if (Array.isArray(card.cards)) {
							cards.addArray(card.cards);
						}
						const blocks = [],
							list = player.getStorage("twsbfangzhu_gongsun");
						for (let i of list) {
							if (Array.isArray(i) && Array.isArray(i[1])) {
								blocks.addArray(i[1]);
							}
						}
						if (cards.containsSome(...blocks)) {
							return false;
						}
					},
					cardSavable(card, player) {
						const cards = [card];
						if (Array.isArray(card.cards)) {
							cards.addArray(card.cards);
						}
						const blocks = [],
							list = player.getStorage("twsbfangzhu_gongsun");
						for (let i of list) {
							if (Array.isArray(i) && Array.isArray(i[1])) {
								blocks.addArray(i[1]);
							}
						}
						if (cards.containsSome(...blocks)) {
							return false;
						}
					},
					cardRespondable(card, player) {
						const cards = [card];
						if (Array.isArray(card.cards)) {
							cards.addArray(card.cards);
						}
						const blocks = [],
							list = player.getStorage("twsbfangzhu_gongsun");
						for (let i of list) {
							if (Array.isArray(i) && Array.isArray(i[1])) {
								blocks.addArray(i[1]);
							}
						}
						if (cards.containsSome(...blocks)) {
							return false;
						}
					},
				},
			},
		},
		derivation: "twyuanbu",
	}
```

### twsbsongwei 名字:颂威
描述: 主公技，锁定技，其他魏势力角色回合开始时，你摸X张牌（X为本轮未执行过回合的角色且至多为3）。
```js
twsbsongwei: {
		audio: "sbsongwei",
		trigger: {
			global: "phaseBegin",
		},
		forced: true,
		zhuSkill: true,
		getPhases() {
			let evts = game.getAllGlobalHistory("everything", evt => evt.name == "phase");
			const evt = evts
				.slice(0)
				.reverse()
				.find(evt => evt._roundStart);
			if (evt) {
				evts = evts.slice(evts.indexOf(evt));
			}
			return evts.filter(evt => !evt._cancelled && !evt._finished);
		},
		filter(event, player) {
			if (event.player == player || event.player.group != "wei") {
				return false;
			}
			const evts = get.info("twsbsongwei").getPhases();
			return (
				game.countPlayer(current => {
					return evts.every(evt => evt.player != current);
				}) > 0
			);
		},
		async content(event, trigger, player) {
			const evts = get.info(event.name).getPhases();
			const num = Math.min(
				3,
				game.countPlayer(current => evts.every(evt => evt.player != current))
			);
			await player.draw(num);
		},
	}
```

## tw_sb_sp_zhugeliang 名字:TW谋诸葛亮 势力:shu

### sbhuoji
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twkanpo 名字:看破
描述: ①每轮开始时，你清除〖看破①〗记录的牌名，然后你可以依次记录任意个未于上次发动〖看破①〗记录清除过的非装备牌牌名（对其他角色不可见，每局游戏至多记录3个牌名）。②其他角色使用你〖看破①〗记录过的牌名的牌时，你可以移去一个〖看破①〗中的此牌名的记录令此牌无效，然后你摸一张牌。
```js
twkanpo: {
		init(player) {
			if (!player.storage.twkanpo) {
				player.storage.twkanpo = [3, [], []];
				player.markSkill("twkanpo");
			}
		},
		audio: "sbkanpo",
		trigger: { global: "roundStart" },
		filter(event, player) {
			var storage = player.storage.twkanpo;
			return storage[0] || storage[1].length;
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			var storage = player.storage.twkanpo;
			var sum = storage[0];
			storage[1] = [];
			player.markSkill("twkanpo");
			if (!sum) {
				return;
			}
			const list = get.inpileVCardList(info => {
				if (info[2] == "sha" && info[3]) {
					return false;
				}
				return info[0] != "equip";
			});
			const func = () => {
				const event = get.event();
				const controls = [
					link => {
						const evt = get.event();
						if (evt.dialog && evt.dialog.buttons) {
							for (let i = 0; i < evt.dialog.buttons.length; i++) {
								const button = evt.dialog.buttons[i];
								button.classList.remove("selectable");
								button.classList.remove("selected");
								const counterNode = button.querySelector(".caption");
								if (counterNode) {
									counterNode.childNodes[0].innerHTML = ``;
								}
							}
							ui.selected.buttons.length = 0;
							game.check();
						}
						return;
					},
				];
				event.controls = [ui.create.control(controls.concat(["清除选择", "stayleft"]))];
			};
			if (event.isMine()) {
				func();
			} else if (event.isOnline()) {
				event.player.send(func);
			}
			var result = await player
				.chooseButton(["看破：是否记录至多" + get.cnNumber(sum) + "个牌名？", [list, "vcard"]], [1, sum], false)
				.set("ai", function (button) {
					if (ui.selected.buttons.length >= Math.max(3, game.countPlayer() / 2)) {
						return 0;
					}
					switch (button.link[2]) {
						case "wuxie":
							return 5 + Math.random();
						case "sha":
							return 5 + Math.random();
						case "tao":
							return 4 + Math.random();
						case "jiu":
							return 3 + Math.random();
						case "lebu":
							return 3 + Math.random();
						case "shan":
							return 4.5 + Math.random();
						case "wuzhong":
							return 4 + Math.random();
						case "shunshou":
							return 2.7 + Math.random();
						case "nanman":
							return 2 + Math.random();
						case "wanjian":
							return 1.6 + Math.random();
						default:
							return 1.5 + Math.random();
					}
				})
				.set("filterButton", button => {
					return !_status.event.names.includes(button.link[2]);
				})
				.set("names", storage[2])
				.set("custom", {
					add: {
						confirm(bool) {
							if (bool != true) {
								return;
							}
							const event = get.event().parent;
							if (event.controls) {
								event.controls.forEach(i => i.close());
							}
							if (ui.confirm) {
								ui.confirm.close();
							}
							game.uncheck();
						},
						button() {
							if (ui.selected.buttons.length) {
								return;
							}
							const event = get.event();
							if (event.dialog && event.dialog.buttons) {
								for (let i = 0; i < event.dialog.buttons.length; i++) {
									const button = event.dialog.buttons[i];
									const counterNode = button.querySelector(".caption");
									if (counterNode) {
										counterNode.childNodes[0].innerHTML = ``;
									}
								}
							}
							if (!ui.selected.buttons.length) {
								const evt = event.parent;
								if (evt.controls) {
									evt.controls[0].classList.add("disabled");
								}
							}
						},
					},
					replace: {
						button(button) {
							const event = get.event(),
								sum = event.sum;
							if (!event.isMine()) {
								return;
							}
							if (button.classList.contains("selectable") == false) {
								return;
							}
							if (ui.selected.buttons.length >= sum) {
								return false;
							}
							button.classList.add("selected");
							ui.selected.buttons.push(button);
							let counterNode = button.querySelector(".caption");
							const count = ui.selected.buttons.filter(i => i == button).length;
							if (counterNode) {
								counterNode = counterNode.childNodes[0];
								counterNode.innerHTML = `×${count}`;
							} else {
								counterNode = ui.create.caption(`<span style="font-size:24px; font-family:xinwei; text-shadow:#FFF 0 0 4px, #FFF 0 0 4px, rgba(74,29,1,1) 0 0 3px;">×${count}</span>`, button);
								counterNode.style.right = "5px";
								counterNode.style.bottom = "2px";
							}
							const evt = event.parent;
							if (evt.controls) {
								evt.controls[0].classList.remove("disabled");
							}
							game.check();
						},
					},
				})
				.set("sum", sum)
				.forResult();
			if (result.bool) {
				var names = result.links.map(link => link[2]);
				storage[0] -= names.length;
				storage[1] = names;
				storage[2] = names;
			} else {
				storage[2] = [];
			}
			player.markSkill("twkanpo");
		},
		marktext: "破",
		intro: {
			markcount(storage) {
				return storage[1].length;
			},
			mark(dialog, content, player) {
				const storage = player.getStorage("twkanpo");
				const sum = storage[0];
				const names = storage[1];
				dialog.addText("剩余可记录" + sum + "次牌名");
				if (player.isUnderControl(true) && names.length) {
					dialog.addText("当前记录牌名：");
					dialog.addSmall([names, "vcard"]);
				}
			},
		},
		group: "twkanpo_kanpo",
		subSkill: {
			kanpo: {
				audio: "sbkanpo",
				trigger: { global: "useCard" },
				filter(event, player) {
					return event.player != player && player.storage.twkanpo[1].includes(event.card.name);
				},
				prompt2(event, player) {
					return "移除" + get.translation(event.card.name) + "的记录，令" + get.translation(event.card) + "无效";
				},
				check(event, player) {
					var effect = 0;
					if (event.card.name == "wuxie" || event.card.name == "shan") {
						if (get.attitude(player, event.player) < -1) {
							effect = -1;
						}
					} else if (event.targets && event.targets.length) {
						for (var i = 0; i < event.targets.length; i++) {
							effect += get.effect(event.targets[i], event.card, event.player, player);
						}
					}
					if (effect < 0) {
						if (event.card.name == "sha") {
							var target = event.targets[0];
							if (target == player) {
								return !player.countCards("h", "shan");
							} else {
								return target.hp == 1 || (target.countCards("h") <= 2 && target.hp <= 2);
							}
						} else {
							return true;
						}
					}
					return false;
				},
				logTarget: "player",
				content() {
					player.storage.twkanpo[1].remove(trigger.card.name);
					player.markSkill("twkanpo");
					trigger.targets.length = 0;
					trigger.all_excluded = true;
					player.draw();
				},
			},
		},
	}
```

## huan_dingshangwan 名字:幻丁尚涴 势力:wei

### twshiyi 名字:拾忆
描述: 出牌阶段限一次， 你可与一名其他角色观看对方手牌，然后各自展示其中一张牌并从牌堆或弃牌堆中获得一张与此牌相同类型的牌。若你与其展示的牌：类型相同，你与其摸两张牌；类型不同，你与其从牌堆或弃牌堆中额外获得一张与展示牌相同类型的牌。
```js
twshiyi: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			return target.countCards("h") > 0;
		},
		async content({ target }, trigger, player) {
			const result1 = await player.choosePlayerCard("h", target).set("forced", true).set("visible", true).forResult();
			const result2 = await target.choosePlayerCard("h", player).set("forced", true).set("visible", true).forResult();
			if (result1?.bool) {
				await player.showCards(result1.links);
			}
			if (result2?.bool) {
				await target.showCards(result2.links);
			}
			if (result1?.bool) {
				await player.gain(
					get.cardPile(function (card) {
						return get.type(card) === get.type(result1.links[0]);
					}),
					"gain2"
				);
			}
			if (result2?.bool) {
				await target.gain(
					get.cardPile(function (card) {
						return get.type(card) === get.type(result2.links[0]);
					}),
					"gain2"
				);
			}
			if (!result1?.bool || !result2?.bool) {
				return;
			}
			if (get.type(result1.links[0]) === get.type(result2.links[0])) {
				await game.asyncDraw([player, target], 2);
			} else {
				await player.gain(
					get.cardPile(function (card) {
						return get.type(card) === get.type(result1.links[0]);
					}),
					"gain2"
				);
				await target.gain(
					get.cardPile(function (card) {
						return get.type(card) === get.type(result2.links[0]);
					}),
					"gain2"
				);
			}
		},
		ai: {
			order: 7,
			result: {
				player: 1,
				target: 1,
			},
		},
	}
```

### twchunhui 名字:春晖
描述: 每回合限一次，当你距离1以内且体力不大于你的角色成为伤害类普通锦囊的目标后，你可令其观看你的手牌并获得其中一张牌。 此牌结算结束后，若其未受到渠道为此牌的伤害，你摸一张牌。
```js
twchunhui: {
		audio: 2,
		trigger: { global: "useCardToTargeted" },
		usable: 1,
		filter(event, player) {
			if (player.hp < event.target.hp || get.distance(player, event.target) > 1 || !player.countCards("h")) {
				return false;
			}
			return get.tag(event.card, "damage") && get.type(event.card) == "trick";
		},
		check(event, player) {
			return get.attitude(player, event.target) >= 0;
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const { target } = trigger;
			if (player.countCards("h") && player != target) {
				await target.gainPlayerCard(player, "h", true, "visible");
			}
			player
				.when({ global: "useCardAfter" })
				.filter(evt => evt == trigger.getParent())
				.step(async () => {
					if (!target.hasHistory("damage", evt => evt.card == trigger.card)) {
						await player.draw();
					}
				});
		},
	}
```

## huan_huanggai 名字:幻黄盖 势力:wu

### twfenxian 名字:焚险
描述: 出牌阶段限一次， 你可令一名角色选择一项：1、其将你或其场上的一张牌当做【决斗】对一名除你以外的角色使用；2、你视为对其使用一张【火攻】。
```js
twfenxian: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: true,
		async content(event, trigger, player) {
			const { target } = event;
			let bool = false;
			if (
				[player, target].some(i =>
					i.getCards("ej").some(card => {
						const juedou = get.autoViewAs({ name: "juedou" }, [card]);
						return game.hasPlayer(current => current != player && target.canUse(juedou, current));
					})
				)
			) {
				bool = true;
			}
			const { links } = bool
				? await target
						.chooseButton(
							[
								"焚险：请选择一项",
								[
									[
										["juedou", `将${get.translation(player)}或你场上的一张牌当做【决斗】对一名除${get.translation(player)}以外的角色使用`],
										["huogong", `${get.translation(player)}视为对你使用一张【火攻】`],
									],
									"textbutton",
								],
							],
							true
						)
						.forResult()
				: { links: ["huogong"] };
			if (links[0] === "huogong") {
				const huogong = get.autoViewAs({ name: "huogong", isCard: true });
				if (player.canUse(huogong, target, false)) {
					await player.useCard(huogong, target, false);
				}
			} else {
				const dialog = [`将${get.translation(player)}或你场上的一张牌当做【决斗】对一名除${get.translation(player)}以外的角色使用`];
				for (const i of [player, target].unique().sortBySeat()) {
					if (i.countCards("ej") > 0) {
						dialog.addArray([`${get.translation(i)}场上的牌`, i.getCards("ej")]);
					}
				}
				const { links: cards } = await target
					.chooseButton(dialog, true)
					.set("filterButton", button => {
						const { link: card } = button;
						const player = get.player();
						const target = get.event().getParent().player;
						const juedou = get.autoViewAs({ name: "juedou" }, [card]);
						return game.hasPlayer(current => current != target && player.canUse(juedou, current));
					})
					.forResult();
				await target
					.chooseUseTarget({ name: "juedou", isCard: true }, cards, true)
					.set("targetx", player)
					.set("filterTarget", function (card, player, target) {
						var evt = _status.event;
						if (_status.event.name == "chooseTarget") {
							evt = evt.getParent();
						}
						if (target === evt.targetx) {
							return false;
						}
						return lib.filter.filterTarget(card, player, target);
					});
			}
		},
		ai: {
			order: 7,
			result: { target: -1 },
		},
	}
```

### twjuyan 名字:炬湮
描述: 锁定技。当你对一名角色造成火焰伤害后，你摸一张牌，然后令其减1点体力上限。
```js
twjuyan: {
		audio: 2,
		trigger: { source: "damageSource" },
		filter(event, player) {
			return event.hasNature("fire");
		},
		forced: true,
		async content(event, trigger, player) {
			await player.draw();
			await trigger.player.loseMaxHp();
		},
	}
```

## huan_caoang 名字:幻曹昂 势力:wei

### twchihui 名字:炽灰
描述: 其他角色的回合开始时，你可废除一个装备栏并选择一项:1.弃置其区域内的一张牌；2.將牌堆中的一张与此次废除的装备栏相同副类别的装备牌置入其装备区。若如此做，你失去1点体力，然后摸X张牌（X为你已损失的体力值且至多为2）。
```js
twchihui: {
		audio: 2,
		audioname: ["huan_caoang_shadow"],
		trigger: { global: "phaseBegin" },
		filter(event, player) {
			return event.player != player && player.hasEnabledSlot();
		},
		async cost(event, trigger, player) {
			const { player: target } = trigger,
				equips = Array.from({ length: 5 })
					.map((_, i) => [i + 1, get.translation(`equip${i + 1}`)])
					.filter(i => player.hasEnabledSlot(`equip${i[0]}`));
			const { bool, links } = await player
				.chooseButton(2, [
					"炽灰：请选择你要废除的装备栏和相应操作",
					'<div class="text center">即将废除的装备栏</div>',
					[equips, "tdnodes"],
					`<div class="text center">对${get.translation(target)}执行的操作</div>`,
					[
						[
							["discard", `弃置其牌`],
							["equip", `置入装备牌`],
						],
						"tdnodes",
					],
				])
				.set("filterButton", button => {
					const { link } = button,
						{ player, target } = get.event();
					if (Boolean(ui.selected.buttons.length) == (typeof link == "number")) {
						return false;
					}
					if (ui.selected.buttons.length) {
						return link == "equip" || target.countDiscardableCards(player, "hej");
					}
					return true;
				})
				.set("ai", button => {
					const { link } = button,
						{ player, target, list } = get.event();
					let att = get.attitude(player, target);
					if (att < 0) {
						att = -Math.sqrt(-att);
					} else {
						att = Math.sqrt(att);
					}
					const eff = att * lib.card.guohe.ai.result.target(player, target);
					if (!ui.selected.buttons.length) {
						const bool = player.hasSkill("twfuxi");
						const getVal = num => {
							const card = player.getEquip(`equip${num}`);
							if (card) {
								const val = get.value(card);
								if (val > 0) {
									return 0;
								}
								return 5 - val;
							}
							switch (num) {
								case "3":
									return 4.5;
								case "4":
									return 4.4;
								case "5":
									return 4.3;
								case "2":
									return (3 - player.hp) * 1.5;
								case "1": {
									if (game.hasPlayer(current => (get.realAttitude || get.attitude)(player, current) < 0 && get.distance(player, current) > 1) && !bool) {
										return 0;
									}
									return bool ? 4.9 : 3.2;
								}
							}
						};
						list.sort((a, b) => getVal(b) - getVal(a));
						if (link == list[0]) {
							return 1;
						}
						return 0;
					}
					if (link == "discard" && eff < 0) {
						return 0;
					}
					if ((att < 0 || target.isMaxEquip()) && link == "equip") {
						return 0;
					}
					return 1;
				})
				.set("target", target)
				.set(
					"list",
					equips.map(i => i[0])
				)
				.forResult();
			event.result = {
				bool: bool,
				cost_data: links,
			};
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const { player: target } = trigger,
				{ cost_data: links } = event;
			await player.disableEquip(`equip${links[0]}`);
			if (links[1] == "discard") {
				if (target.countDiscardableCards(player, "hej")) {
					await player.discardPlayerCard(target, "hej", true);
				}
			} else {
				const equip = get.cardPile2(card => get.subtype(card) == `equip${links[0]}`);
				if (equip) {
					await target.equip(equip);
					await game.delayx();
				}
			}
			await player.loseHp();
			const num = player.getDamagedHp();
			if (num) {
				await player.draw(Math.min(2, num));
			}
		},
	}
```

### twfuxi 名字:赴曦
描述: `${get.poptip("rule_chihengji")}。当你进入濒死状态时或装备栏均废除后，你可选择依次执行一至两项:1. 保留〖炽灰〗直到下次退幻；2.将手牌数摸至体力上限（至多摸至五张）；3.若你的装备栏均废除，恢复所有装备栏。然后你入幻：将体力值回复至体力上限。`
```js
twfuxi: {
		audio: 2,
		persevereSkill: true,
		trigger: { player: ["dying", "disableEquipAfter"] },
		filter(event, player) {
			return event.name == "dying" || !player.hasEnabledSlot();
		},
		async cost(event, trigger, player) {
			const { bool, links } = await player
				.chooseButton([
					get.prompt(event.name.slice(0, -5)),
					[
						[
							//["phase", "当前回合结束后执行一个额外的回合"],
							["twchihui", `保留〖炽灰〗直到下次退幻`],
							["draw", `摸牌至体力上限`],
							["enable", `恢复所有装备栏`],
						],
						"textbutton",
					],
				])
				.set("filterButton", button => {
					const { link } = button,
						player = get.player();
					if (link == "draw" && player.countCards("h") >= player.maxHp) {
						return false;
					}
					if (link == "enable" && player.hasEnabledSlot()) {
						return false;
					}
					return true;
				})
				.set("ai", button => {
					const { link } = button,
						player = get.player();
					const num = player.getAllHistory("useSkill", evt => evt.skill == "twfuxi")?.lastItem?.twfuxi_num;
					if (num == 2 && player.maxHp <= 2 && ui.selected.buttons.length) {
						return 0;
					}
					if (link == "enable") {
						return 5;
					}
					if (link == "draw") {
						return 5 - player.countCards("h");
					}
					/*if (link == "phase") {
						return Math.max(4, player.countCards("h"));
					}*/
					return 1;
				})
				.set("selectButton", [1, 2])
				.forResult();
			event.result = {
				bool: bool,
				cost_data: links,
			};
		},
		async content(event, trigger, player) {
			const { cost_data: choices } = event,
				num = choices.length,
				history = player.getAllHistory("useSkill", evt => evt.skill == event.name);
			const skills = ["twchihui", "twfuxi"];
			if (history.length) {
				history[history.length - 1][event.name + "_num"] = num;
			}
			/*if (choices.includes("phase")) {
				game.log(player, "选择了", "#y选项一");
				player.addTempSkill(event.name + "_mark");
				player.insertPhase();
			}*/
			if (choices.includes("twchihui")) {
				game.log(player, "选择了", "#y选项一");
				skills.remove("twchihui");
			}
			if (choices.includes("draw")) {
				game.log(player, "选择了", "#y选项二");
				await player.drawTo(Math.min(player.maxHp, 5));
			}
			if (choices.includes("enable")) {
				game.log(player, "选择了", "#y选项三");
				const list = Array.from({ length: 5 })
					.map((_, i) => `equip${i + 1}`)
					.filter(i => player.hasDisabledSlot(i));
				await player.enableEquip(list);
			}
			await player.recoverTo(player.maxHp);
			player.changeSkin({ characterName: "huan_caoang" }, "huan_caoang_shadow");
			await player.changeSkills(["twhuangzhu", "twliyuan", "twjifa"], skills);
		},
		derivation: ["twhuangzhu", "twliyuan", "twjifa"],
		/*subSkill: {
			mark: {
				charlotte: true,
				mark: true,
				intro: {
					content: "本回合结束后执行一个额外回合",
				},
			},
		},*/
	}
```

## huan_liufeng 名字:幻刘封 势力:shu

### twchenxun 名字:沉勋
描述: 每轮开始时，你可以视为对一名其他角色使用一张【决斗】。此牌结算结束后，若此牌对其造成过伤害，你摸一张牌且可以对一名本轮未以此法选择的其他角色发动〖沉勋〗；否则你失去1点体力。
```js
twchenxun: {
		audio: 2,
		trigger: { global: "roundStart" },
		filter(event, player) {
			return game.hasPlayer(current => player.canUse({ name: "juedou", isCard: true }, current));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(
					get.prompt(event.name.slice(0, -5)),
					(card, player, target) => {
						return player.canUse({ name: "juedou", isCard: true }, target);
					},
					"视为对一名角色使用一张【决斗】"
				)
				.set("ai", target => {
					const player = get.player();
					let eff = get.effect(target, { name: "juedou" }, player, player),
						shas = target.mayHaveSha(player, "respond", null, "count") - player.mayHaveSha(player, "respond", null, "count"),
						att = get.attitude(player, target);
					if (shas > 0) {
						eff += get.effect(player, { name: "losehp" }, player, player);
					} else if (att <= 0) {
						eff += get.effect(player, { name: "draw" }, player, player);
					}
					return eff;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0],
				juedou = get.autoViewAs({ name: "juedou", isCard: true, storage: { twchenxun: true } });
			if (!player.canUse(juedou, target)) {
				return;
			}
			await player.useCard(target, juedou);
			if (target.hasHistory("damage", evt => evt.getParent(3) == event)) {
				await player.draw();
				const targetsx = game.filterPlayer(current => {
					if (!player.canUse({ name: "juedou", isCard: true }, current)) {
						return false;
					}
					return !player
						.getRoundHistory("useSkill", evt => evt.skill == "twchenxun")
						.map(evt => evt.targets[0])
						.includes(current);
				});
				if (!targetsx.length) {
					return;
				}
				const { targets } = await player
					.chooseTarget(
						get.prompt("twchenxun"),
						(card, player, target) => {
							return get.event().targetsx.includes(target);
						},
						"视为对一名本轮未以此法选择过的角色使用一张【决斗】"
					)
					.set("ai", target => {
						const player = get.player();
						let eff = get.effect(target, { name: "juedou" }, player, player),
							shas = target.mayHaveSha(player, "respond", null, "count") - player.mayHaveSha(player, "respond", null, "count"),
							att = get.attitude(player, target);
						if (shas > 0) {
							eff += get.effect(player, { name: "losehp" }, player, player);
						} else if (att <= 0) {
							eff += get.effect(player, { name: "draw" }, player, player);
						}
						return eff;
					})
					.set("targetsx", targetsx)
					.forResult();
				if (targets?.length) {
					await player.useSkill("twchenxun", targets);
				}
			} else {
				await player.loseHp();
			}
		},
	}
```

## tw_sunluban 名字:TW孙鲁班 势力:wu

### twzenhui 名字:谮毁
描述: 出牌阶段限一次，当你使用【杀】或黑色普通锦囊牌指定目标时，你可选择另一名能成为此牌目标的其他角色并选择一项：①令其也成为此牌的目标。②获得其区域里的一张牌，然后将此牌的使用者改为该角色。
```js
twzenhui: {
		audio: "xinzenhui",
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			if (event.targets.length != 1) {
				return false;
			}
			var card = event.card;
			if (card.name != "sha" && (get.type(card, null, false) != "trick" || get.color(card, false) != "black")) {
				return false;
			}
			if (!player.isPhaseUsing() || player.hasSkill("twzenhui2")) {
				return false;
			}
			return game.hasPlayer(function (current) {
				return current != player && current != event.target && lib.filter.targetEnabled2(card, player, current) && lib.filter.targetInRange(card, player, current);
			});
		},
		direct: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt2("twzenhui"), function (card, player, target) {
					if (player == target) {
						return false;
					}
					var evt = _status.event.getTrigger();
					return !evt.targets.includes(target) && lib.filter.targetEnabled2(evt.card, player, target) && lib.filter.targetInRange(evt.card, player, target);
				})
				.set("ai", function (target) {
					var trigger = _status.event.getTrigger();
					var player = _status.event.player;
					return Math.max(target.countGainableCards(player, "hej") ? get.effect(target, { name: "shunshou" }, player, player) : 0, get.effect(target, trigger.card, player, player));
				});
			"step 1";
			if (result.bool) {
				player.addTempSkill("twzenhui2", "phaseUseAfter");
				var target = result.targets[0],
					str = get.translation(target);
				event.target = target;
				player.logSkill("twzenhui", target);
				if (!target.countGainableCards(player, "hej")) {
					event._result = { index: 0 };
				} else {
					player
						.chooseControl()
						.set("choiceList", ["令" + str + "也成为" + get.translation(trigger.card) + "的目标", "获得" + str + "区域里的一张牌，然后" + str + "成为" + get.translation(trigger.card) + "的使用者"])
						.set("ai", function () {
							var trigger = _status.event.getTrigger();
							var player = _status.event.player,
								target = _status.event.getParent().target;
							return (target.countGainableCards(player, "hej") ? get.effect(target, { name: "shunshou" }, player, player) : 0) > get.effect(target, trigger.card, player, player) ? 1 : 0;
						});
				}
			} else {
				event.finish();
			}
			"step 2";
			if (result.index == 1) {
				trigger.untrigger();
				trigger.getParent().player = event.target;
				game.log(event.target, "成为了", trigger.card, "的使用者");
				player.gainPlayerCard(target, true, "hej");
			} else {
				game.log(event.target, "成为了", trigger.card, "的额外目标");
				trigger.getParent().targets.push(event.target);
			}
		},
	}
```

### xinjiaojin
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## tw_mazhong 名字:TW马忠 势力:shu

### twfuman 名字:抚蛮
描述: ①出牌阶段每名角色限一次，你可以将一张手牌交给一名其他角色并标记为“抚蛮”且“抚蛮”牌的牌名视为【杀】。②一名角色使用或打出“抚蛮”牌结算结束后，你摸一张牌（若此牌造成过伤害，则改为摸两张牌）。
```js
twfuman: {
		group: "twfuman_draw",
		audio: "fuman",
		inherit: "fuman",
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			return !player.getStorage("twfuman_used").includes(target);
		},
		filter(event, player) {
			return (
				player.countCards("h") > 0 &&
				game.hasPlayer(function (current) {
					return lib.skill.twfuman.filterTarget(null, player, current);
				})
			);
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			player.addTempSkill(`${event.name}_used`, "phaseChange");
			player.markAuto(`${event.name}_used`, target);
			const next = player.give(cards, target);
			next.gaintag.add(event.name);
			await next;
			target.addSkill(`${event.name}2`);
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
				intro: {
					content: `已发动过的目标：$`,
				},
			},
			draw: {
				audio: "fuman",
				trigger: { global: ["useCardAfter", "respondAfter"] },
				filter(event, player) {
					return event.player.getHistory("lose", function (evt) {
						if ((evt.relatedEvent || evt.getParent()) != event) {
							return false;
						}
						for (var i in evt.gaintag_map) {
							if (evt.gaintag_map[i].includes("twfuman")) {
								return true;
							}
						}
						return false;
					}).length;
				},
				forced: true,
				logTarget: "player",
				content() {
					player.draw(
						trigger.player.getHistory("sourceDamage", function (evt) {
							return evt.card == trigger.card;
						}).length
							? 2
							: 1
					);
				},
			},
		},
	}
```

## tw_jsp_guanyu 名字:TW关羽 势力:wei

### wusheng
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twdanji 名字:单骑
描述: 觉醒技，准备阶段，若你的手牌数大于你的体力值且本局游戏的主公不为刘备，你减1点体力上限，然后获得〖马术〗和〖怒斩〗，且本局游戏中你每回合使用的第一张转化【杀】结算完毕后，你摸一张牌。
```js
twdanji: {
		derivation: ["mashu", "nuzhan"],
		audio: "danji",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			var zhu = get.zhu(player);
			if (zhu && zhu.isZhu) {
				if (lib.translate[zhu.name].indexOf("刘备") != -1 || (zhu.name2 && lib.translate[zhu.name2].indexOf("刘备") != -1)) {
					return false;
				}
			}
			return player.countCards("h") > player.hp;
		},
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "water",
		content() {
			"step 0";
			player.awakenSkill(event.name);
			player.loseMaxHp();
			"step 1";
			player.addSkills(["mashu", "nuzhan"]);
			"step 2";
			player.addSkill("twdanji_effect");
		},
		subSkill: {
			effect: {
				charlotte: true,
				mark: true,
				intro: { content: "每回合首次使用转化【杀】结算结束后摸一张牌" },
				audio: "danji",
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return (
						player
							.getHistory("useCard", function (evt) {
								return evt.card.name == "sha" && evt.cards && evt.cards.length && !event.card.isCard;
							})
							.indexOf(event) == 0
					);
				},
				forced: true,
				content() {
					player.draw();
				},
			},
		},
	}
```

## tw_fuhuanghou 名字:TW伏寿 势力:qun

### rezhuikong
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### xinqiuyuan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## tw_qiaozhou 名字:TW谯周 势力:shu

### zhiming
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twxingbu 名字:星卜
描述: 结束阶段，你可以亮出牌堆顶的三张牌，然后可以根据这三张牌中红色牌的数量令一名其他角色获得对应的效果直到其下回合结束：三张，摸牌阶段多摸两张牌，使用【杀】的次数上限+1，跳过弃牌阶段；两张，出牌阶段使用的第一张牌结算完成后，弃置一张牌然后摸两张牌；少于两张，出牌阶段使用【杀】的次数上限-1。
```js
twxingbu: {
		audio: "xingbu",
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		content() {
			"step 0";
			var cards = get.cards(3);
			game.updateRoundNumber();
			event.cards = cards;
			player.showCards(cards, get.translation(player) + "发动了【星卜】");
			"step 1";
			var num = 0,
				list = [
					["荧惑守心", "出牌阶段使用【杀】的次数-1"],
					["扶匡东柱", "出牌阶段使用的第一张牌结算完成后，弃置一张牌并摸两张牌"],
					["五星连珠", "摸牌阶段多摸两张牌，出牌阶段使用【杀】的次数+1，跳过弃牌阶段"],
				];
			for (var i of cards) {
				if (get.color(i, false) == "red") {
					num++;
				}
			}
			if (num == 0) {
				num = 1;
			}
			player.chooseTarget("是否令一名其他角色获得“" + list[num - 1][0] + "”效果？", list[num - 1][1], lib.filter.notMe).set("ai", function (target) {
				var player = _status.event.player,
					num = _status.event.getParent().num;
				var att = get.attitude(player, target);
				switch (num) {
					case 1:
						return -get.sgn(att) * target.countCards("hs", { name: "sha" }) - 1;
					case 2:
						return att;
					case 3:
						return att * (target.hasJudge("lebu") ? 3 : 1);
				}
			});
			event.num = num;
			"step 2";
			if (result.bool) {
				player.addExpose(0.15);
				var skill = "twxingbu_effect" + num;
				var target = result.targets[0];
				player.line(target);
				game.log(player, "选择了", target);
				target.popup(skill);
				target.addTempSkill(skill, { player: "phaseAfter" });
				target.addMark(skill, 1, false);
				game.delayx();
			}
			game.cardsDiscard(cards);
		},
		subSkill: {
			effect1: {
				charlotte: true,
				onremove: true,
				marktext: "惑",
				intro: { content: "出牌阶段使用【杀】的次数-#" },
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num - player.countMark("twxingbu_effect1");
						}
					},
				},
			},
			effect2: {
				charlotte: true,
				onremove: true,
				marktext: "匡",
				intro: { content: "出牌阶段使用的第一张牌结算完成后，弃置#张牌并摸#*2张牌" },
				audio: "xingbu",
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					var evt = event.getParent("phaseUse");
					if (!evt || evt.player != player) {
						return false;
					}
					return (
						player
							.getHistory("useCard", function (evtx) {
								return evtx.getParent("phaseUse") == evt;
							})
							.indexOf(event) < player.countMark("twxingbu_effect2")
					);
				},
				forced: true,
				content() {
					"step 0";
					player.chooseToDiscard(player.countMark("twxingbu_effect2"), "he", true);
					"step 1";
					player.draw(player.countMark("twxingbu_effect2") * 2);
				},
			},
			effect3: {
				charlotte: true,
				onremove: true,
				marktext: "星",
				intro: { content: "摸牌阶段多摸#*2张牌，出牌阶段使用【杀】的次数+#，跳过弃牌阶段" },
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("twxingbu_effect3");
						}
					},
				},
				audio: "xingbu",
				trigger: { player: ["phaseDrawBegin2", "phaseDiscardBefore"] },
				filter(event, player) {
					if (event.name == "phaseDiscard") {
						return true;
					}
					return !event.numFixed;
				},
				forced: true,
				content() {
					if (trigger.name == "phaseDiscard") {
						trigger.cancel();
					} else {
						trigger.num += player.countMark("twxingbu_effect3") * 2;
					}
				},
			},
		},
	}
```

## tw_yj_zhanghe 名字:TW张郃 势力:qun

### zhilve
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## old_jiakui 名字:TW贾逵 势力:wei

### zhongzuo
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### wanlan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## huan_luxun 名字:幻陆逊 势力:wu

### twlifeng 名字:砺锋
描述: 出牌阶段，你可以弃置两张牌，对一名与你距离为X的角色造成1点伤害（X为两牌点数之差），若你以此法弃置了非“逆涡”牌，你摸一张牌。
```js
twlifeng: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.countDiscardableCards(player, "he") > 1;
		},
		filterCard: lib.filter.cardDiscardable,
		selectCard: 2,
		position: "he",
		filterTarget(card, player, target) {
			if (ui.selected.cards.length < 2) {
				return false;
			}
			let cards = ui.selected.cards,
				num = Math.abs(get.number(cards[0], player) - get.number(cards[1], player));
			return get.distance(target, player) == num;
		},
		check(card) {
			return 7 - get.value(card);
		},
		complexSelect: true,
		lose: false,
		discard: false,
		delay: false,
		async content(event, trigger, player) {
			const { cards, target } = event;
			const isDraw = cards.some(card => !card.hasGaintag("twniwo"));
			await player.discard(cards);
			await target.damage();
			if (isDraw) {
				await player.draw();
			}
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					return get.damageEffect(target, player, player);
				},
			},
		},
	}
```

### twniwo 名字:逆涡
描述: 出牌阶段开始时，你可选择一名其他角色，然后选择你与其等量的手牌。若如此做，直到本回合结束，你与其均无法使用或打出你以此法选择的牌。
```js
twniwo: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return (
				player.countCards("h") &&
				game.hasPlayer(current => {
					return current != player && current.countCards("h");
				})
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.name.slice(0, -5)), (card, player, current) => {
					return current != player && current.countCards("h");
				})
				.set("ai", target => {
					return -get.attitude(get.player(), target) / (target.countCards("h") + 1);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if ([player, target].some(current => !current.countCards("h"))) {
				return;
			}
			const dialog = ["选择你与" + get.translation(target) + "的等量张手牌"];
			if (player.countCards("h")) {
				dialog.add("你的手牌");
				dialog.add(player.getCards("h"));
			}
			if (target.countCards("h")) {
				dialog.add(get.translation(target) + "的手牌");
				let hs = target.getCards("h");
				if (player.hasSkillTag("viewHandcard", null, target, true)) {
					dialog.add(hs);
				} else {
					dialog.add([hs, "blank"]);
				}
			}
			const result = await player
				.chooseButton(dialog, true, [2, Infinity])
				.set("filterOk", () => {
					const buttons = ui.selected.buttons;
					return buttons.filter(i => get.owner(i.link) == get.player()).length * 2 == buttons.length;
				})
				.set(
					"cards",
					(() => {
						let cards = player
							.getCards("h")
							.slice(0)
							.sort((a, b) => get.value(a) - get.value(b));
						let result = [];
						while (result.length < target.countCards("h")) {
							let card = cards.shift();
							if (card != null && get.value(card) <= 5) {
								result.push(card);
							} else {
								break;
							}
						}
						return result.concat(target.getCards("h").randomGets(result.length));
					})()
				)
				.set("ai", button => {
					return get.event().cards.includes(button.link);
				})
				.forResult();
			if (!result?.links?.length) {
				return;
			}
			for (const owner of [player, target]) {
				owner.addTempSkill("twniwo_block");
				owner.addGaintag(
					result.links.filter(i => get.owner(i) == owner),
					"twniwo"
				);
			}
		},
		subSkill: {
			block: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("twniwo");
				},
				mod: {
					cardEnabled2(card) {
						if (get.itemtype(card) == "card" && card.hasGaintag("twniwo")) {
							return false;
						}
					},
				},
			},
		},
	}
```

## huan_liushan 名字:幻刘禅 势力:shu

### twguihan 名字:归汉
描述: 出牌阶段限一次，你可以选择至多三名已有手牌的其他角色。你展示牌堆顶的一张牌，然后这些角色依次选择一项：①将一张与此牌类别相同的牌置于牌堆顶；②失去1点体力。然后你选择一项，摸X张牌，获得牌堆顶第X张牌下的两张牌（X为本次选择选项①的角色数）。
```js
twguihan: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(target => lib.skill.twguihan.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h");
		},
		selectTarget: [1, 3],
		usable: 1,
		multiline: true,
		multitarget: true,
		async content(event, trigger, player) {
			const card = get.cards(1, true)[0];
			await player.showCards([card], get.translation(player) + "发动了【归汉】");
			let num = 0;
			for (const target of event.targets.sortBySeat()) {
				const result = await target
					.chooseCard("归汉：将一张" + get.translation(get.type2(card)) + "牌置于牌堆顶，或失去1点体力", (card, player) => {
						return get.type2(card) == get.event().type;
					})
					.set("type", get.type2(card))
					.set("ai", card => {
						const player = get.player();
						if (get.effect(player, { name: "losehp" }, player, player) > 0) {
							return 0;
						}
						return 7 - get.value(card);
					})
					.forResult();
				if (!result.bool) {
					await target.loseHp();
				} else {
					num++;
					target.$throw(1, 1000);
					await target.lose(result.cards, ui.cardPile, "insert");
					game.log(target, "将一张牌置于了牌堆顶");
				}
				await game.delayx();
			}
			const { index } = await player
				.chooseControl()
				.set("choiceList", ["摸" + get.cnNumber(num) + "张牌", "获得牌堆顶第" + get.cnNumber(num) + "张牌下的两张牌"])
				.set("prompt", "归汉：请选择一项")
				.set("ai", () => {
					const player = get.player(),
						index = num >= 3 - num ? 0 : 1;
					return player.hasSkillTag("nogain") ? 1 - index : index;
				})
				.set("num", num)
				.forResult();
			if (index == 0 && num > 0) {
				await player.draw(num);
			} else if (ui.cardPile.childElementCount > num) {
				const gains = Array.from(ui.cardPile.childNodes).slice(num, num + 2);
				if (gains.length > 0) {
					await player.gain(gains, "gain2");
				}
			}
		},
		ai: {
			order: 1,
			threaten: 4.5,
			result: { target: -1 },
		},
	}
```

### twrenxian 名字:任贤
描述: 出牌阶段限一次，你可以将手牌中的所有不为【闪】的基本牌交给一名其他角色，然后令其于本回合结束后执行一个只有出牌阶段的额外回合（只能使用你交给其的牌，且使用【杀】无次数限制）。
```js
twrenxian: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("h", card => get.name(card) !== "shan" && get.type(card) === "basic");
		},
		usable: 1,
		filterTarget: lib.filter.notMe,
		filterCard: card => get.name(card) !== "shan" && get.type(card) === "basic",
		selectCard: -1,
		lose: false,
		discard: false,
		delay: false,
		position: "h",
		async content(event, trigger, player) {
			const target = event.target;
			await player.give(event.cards, target);
			target.addTempSkill("twrenxian_phase", { player: "twrenxian_phaseAfter" });
			target.markAuto("twrenxian_phase", event.cards);
		},
		ai: {
			order: 0.01,
			threaten: 4.5,
			result: { target: 1 },
		},
		locked: false,
		mod: {
			aiOrder(player, card, num) {
				const cards = player.getCards("h", { type: "basic" });
				if (cards.length === 1 && cards.includes(card) && game.hasPlayer(target => target != player && get.attitude(player, target) > 0)) {
					return 0;
				}
			},
		},
		subSkill: {
			phase: {
				charlotte: true,
				onremove: true,
				trigger: { global: "phaseAfter" },
				forced: true,
				popup: false,
				content() {
					const next = player.insertPhase();
					next.set("phaseList", ["phaseUse"]);
					const cardsx = player.getStorage("twrenxian_phase");
					player
						.when({ global: "phaseBegin" }, false)
						.assign({ firstDo: true })
						.filter(evt => evt.skill == "twrenxian_phase")
						.step(async () => {
							player.addTempSkill("twrenxian_mark", "phaseAfter");
							player.markAuto("twrenxian_mark", cardsx);
						})
						.finish();
				},
			},
			mark: {
				mark: true,
				charlotte: true,
				onremove: true,
				marktext: "令",
				intro: {
					markcount: () => 0,
					content: "执行一个仅有出牌阶段的额外回合",
				},
				mod: {
					cardEnabled(card, player) {
						if ([card].concat(card.cards || []).some(c => get.itemtype(c) === "card" && !player.getStorage("twrenxian_mark").includes(c))) {
							return false;
						}
					},
					cardSavable(card, player) {
						if ([card].concat(card.cards || []).some(c => get.itemtype(c) === "card" && !player.getStorage("twrenxian_mark").includes(c))) {
							return false;
						}
					},
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return Infinity;
						}
					},
				},
			},
		},
	}
```

### twyanzuo 名字:延祚
描述: 主公技，锁定技。每回合限两次，其他蜀势力角色于〖任贤〗回合造成伤害后，你摸两张牌。
```js
twyanzuo: {
		audio: 2,
		trigger: { global: "damageSource" },
		filter(event, player) {
			if (event.getParent("phase").skill !== "twrenxian_phase") {
				return false;
			}
			const source = event.source;
			return source && source != player && source.group == "shu";
		},
		usable: 2,
		zhuSkill: true,
		forced: true,
		logTarget: "source",
		content() {
			player.draw(2);
		},
	}
```

## licuilianzhaoquanding 名字:李翠莲赵全定 势力:shu

### twciyin 名字:慈荫
描述: `①你或${get.poptip("rule_tongxin")}角色的准备阶段，你可以亮出牌堆顶X张牌，然后将其中任意张♠或♥牌置于武将牌上，称为“荫”，然后将其余牌放回牌堆顶（X为当前回合角色的体力值的两倍，且至多为10）。②你每获得三张“荫”后，你选择本局游戏未选择的一项：1.增加1点体力上限并回复1点体力；2.将手牌补至体力上限。`
```js
twciyin: {
		audio: 2,
		global: "beOfOneHeart",
		oneHeart: true,
		trigger: {
			global: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			const target = event.player;
			return player == target || player.getStorage("beOfOneHeartWith").includes(target);
		},
		async content(event, trigger, player) {
			const num = Math.min(trigger.player.getHp() * 2, 10);
			const cards = get.cards(num, true);
			await player.showCards(cards);
			const gain = cards.filter(card => ["heart", "spade"].includes(get.suit(card)));
			if (!gain.length) {
				return;
			}
			const { links } = await player.chooseButton(["慈荫：你可以将其中任意张黑桃/红桃牌置于武将牌上", gain], [1, Infinity], "allowChooseAll").set("ai", get.buttonValue).forResult();
			if (!links || !links.length) {
				return;
			}
			const next = player.addToExpansion(links);
			next.gaintag.add("twciyin");
			await next;
		},
		marktext: "荫",
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
		group: "twciyin_heart",
		subSkill: {
			heart: {
				audio: "twciyin",
				trigger: {
					player: "addToExpansionAfter",
				},
				filter(event, player) {
					if (!event.gaintag.includes("twciyin")) {
						return false;
					}
					const history = game.getAllGlobalHistory("everything", evt => evt.name == "twciyin_heart" && evt.player == player);
					const limit = history.map(evt => evt.cost_data).flat();
					return !limit.includes("选项一") || (!limit.includes("选项二") && player.countCards("h") < player.maxHp);
				},
				getIndex(event, player) {
					const history = game.getAllGlobalHistory("everything", evt => evt.name == "twciyin_heart" && evt.player == player);
					const limit = history.map(evt => evt.cost_data).flat();
					return Math.floor(player.getExpansions("twciyin").length / 3) - limit.length;
				},
				async cost(event, trigger, player) {
					const history = game.getAllGlobalHistory("everything", evt => evt.name == "twciyin_heart" && evt.player == player);
					const limit = history.map(evt => evt.cost_data).flat();
					const choices = [];
					const choiceList = ["增加1点体力上限并回复1点体力", "将手牌摸至体力上限"];
					if (!limit.includes("选项一")) {
						choices.push("选项一");
					} else {
						choiceList[0] = '<span style="opacity:0.5;">' + choiceList[0] + "</span>";
					}
					if (!limit.includes("选项二") && player.countCards("h") < player.maxHp) {
						choices.push("选项二");
					} else {
						choiceList[1] = '<span style="opacity:0.5;">' + choiceList[1] + "</span>";
					}
					const control =
						choices.length == 1
							? choices[0]
							: (
									await player
										.chooseControl(choices)
										.set("prompt", get.prompt(event.skill))
										.set("choiceList", choiceList)
										.set("ai", () => {
											const player = get.player(),
												num = player.maxHp - player.countCards("h");
											return get.recoverEffect(player, player, player) > get.effect(player, { name: "draw" }, player, player) * num ? "选项一" : "选项二";
										})
										.forResult()
								).control;
					event.result = {
						bool: true,
						cost_data: [control],
					};
				},
				async content(event, trigger, player) {
					if (event.cost_data.includes("选项一")) {
						await player.gainMaxHp();
						await player.recover();
					}
					if (event.cost_data.includes("选项二")) {
						await player.drawTo(player.maxHp);
					}
				},
			},
		},
	}
```

### twchenglong 名字:成龙
描述: 觉醒技，一名角色的结束阶段，若你已经执行过〖慈荫〗所有选项，你获得武将牌上的所有“荫”并失去〖慈荫〗，然后你从四张蜀势力或群势力武将牌中选择至多两个技能描述中含【杀】或【闪】的技能获得之。
```js
twchenglong: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "gray",
		filter(event, player) {
			return (
				game
					.getAllGlobalHistory("everything", evt => evt.name == "twciyin_heart" && evt.player == player)
					.map(evt => evt.cost_data)
					.flat().length == 2
			);
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const cards = player.getExpansions("twciyin");
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
			await player.removeSkills("twciyin");
			let list = [];
			if (_status.characterlist) {
				for (const name of _status.characterlist) {
					if (["shu", "qun"].includes(lib.character[name][1])) {
						list.push(name);
					}
				}
			} else if (_status.connectMode) {
				list = get.charactersOL(name => !["shu", "qun"].includes(lib.character[name][1]));
			} else {
				list = get.gainableCharacters(info => ["shu", "qun"].includes(info[1]));
			}
			for (const current of game.players.concat(game.dead)) {
				list.removeArray(get.nameList(current));
			}
			const filter = skill => {
				const translation = get.skillInfoTranslation(skill, player);
				if (!translation.length) {
					return false;
				}
				const info = get.info(skill);
				return info && !info.zhuSkill && !info.limited && !info.juexingji && !info.hiddenSkill && !info.charlotte && !info.dutySkill && ["【杀】", "【闪】"].some(str => get.plainText(translation).includes(str));
			};
			list = list.filter(name => (lib.character[name][3] || []).some(filter));
			if (!list.length) {
				return;
			}
			const skillList = {};
			list = list.randomGets(4);
			for (const name of list) {
				skillList[name] = (lib.character[name][3] || []).filter(filter).flat();
			}
			if (Object.values(skillList).length) {
				const result = await player
					.chooseButton({
						createDialog: [
							[
								[[`成龙：获得其中至多两个技能`], "addNewRow"],
								[
									list,
									(item, type, position, noclick, node) => {
										node = ui.create.button(item, "character", position, true);
										lib.setIntro(node);
										return node;
									},
								],
								[
									[
										Object.values(skillList)
											.flat()
											.map(skill => [skill, get.translation(skill)]),
										"tdnodes",
									],
								],
								[
									dialog => {
										dialog.style.setProperty("top", get.is.phoneLayout() ? "20%" : "25%", "important");
									},
									"handle",
								],
							],
						],
						forced: true,
						selectButton: [1, 2],
						ai(button) {
							const { link } = button;
							const info = get.info(link);
							if (info?.ai?.neg || info?.ai?.halfneg) {
								return 0;
							}
							return 1 + Math.random();
						},
					})
					.forResult();
				if (result?.links?.length) {
					await player.addSkills(result.links);
				}
			}
		},
		ai: { combo: "twciyin" },
	}
```

## huan_zhugeliang 名字:幻诸葛亮 势力:shu

### twbeiding 名字:北定
描述: 每名角色的准备阶段，你可以声明并记录至多X个未记录的基本牌或普通锦囊牌牌名（X为你的体力值）。当前回合角色弃牌阶段结束时，你视为依次使用本回合声明的牌（无距离限制），若此牌的目标不包含其，其摸一张牌。
```js
twbeiding: {
		audio: 2,
		audioname: ["huan_zhugeliang_shadow"],
		intro: {
			content: "已记录牌名：$",
		},
		mod: {
			targetInRange(card, player, target) {
				if (!player.storage.isInHuan) {
					return;
				}
				if (
					player
						.getStorage("twbeiding")
						.map(i => i[0].name)
						.includes(card.name)
				) {
					return true;
				}
			},
		},
		locked: false,
		onremove: true,
		derivation: "twbeidingx",
		group: ["twbeiding_record", "twbeiding_use", "twbeiding_huan"],
		subSkill: {
			record: {
				audio: "twbeiding",
				trigger: {
					global: "phaseZhunbeiBegin",
				},
				filter(event, player) {
					if (player.storage.isInHuan) {
						return false;
					}
					return (
						player.getHp() > 0 &&
						get.inpileVCardList(info => {
							if (!["basic", "trick"].includes(info[0])) {
								return false;
							}
							return !player
								.getStorage("twbeiding")
								.map(i => i[0].name)
								.includes(info[2]);
						}).length
					);
				},
				async cost(event, trigger, player) {
					const num = player.getHp(),
						vcards = get.inpileVCardList(info => {
							if (!["basic", "trick"].includes(info[0])) {
								return false;
							}
							return !player
								.getStorage("twbeiding")
								.map(i => i[0].name)
								.includes(info[2]);
						});
					const { bool, links } = await player
						.chooseButton([`${get.translation(event.name.slice(0, -5))}：你可以声明并记录至多${get.cnNumber(num)}个未以此法记录的牌名`, [vcards, "vcard"]], [1, num])
						.set("filterButton", button => {
							return !ui.selected.buttons.some(buttonx => buttonx.link[2] == "sha") || button.link[2] != "sha";
						})
						.set("ai", button => {
							const player = get.player();
							return player.getUseValue({ name: button.link[2], nature: button.link[3] });
						})
						.forResult();
					event.result = {
						bool: bool,
						cost_data: links,
					};
				},
				async content(event, trigger, player) {
					const names = event.cost_data.map(link => [{ name: link[2], nature: link[3] }]);
					game.log(player, "声明了", "#g" + get.translation(names));
					player.markAuto("twbeiding", names);
					player.markAuto("twbeiding_use", names);
				},
			},
			use: {
				audio: "twbeiding",
				trigger: {
					global: "phaseDiscardEnd",
				},
				filter(event, player) {
					if (player.storage.isInHuan) {
						return false;
					}
					const target = _status.currentPhase;
					if (!target || !target.isIn() || event.player != target) {
						return false;
					}
					return player.getStorage("twbeiding_use").length;
				},
				forced: true,
				async content(event, trigger, player) {
					const target = _status.currentPhase,
						storage = player.getStorage(event.name);
					while (storage.length) {
						const name = storage.shift(),
							card = get.autoViewAs({ name: name[0].name, nature: name[0].nature, isCard: true });
						if ((!get.info(card).notarget || !lib.filter.cardEnabled(card, player)) && !player.hasUseTarget(card, false)) {
							continue;
						}
						const { targets } = await player.chooseUseTarget(`请选择${get.translation(card)}的目标，若此牌的目标不包含${get.translation(target)}，则其摸一张牌`, card, true, false, "nodistance").forResult();
						if (!targets.includes(target) && target.isIn()) {
							await target.draw();
						}
					}
					player.storage[event.name] = [];
					player.unmarkSkill(event.name);
				},
				intro: {
					content: "本回合新增牌名：$",
				},
			},
			huan: {
				audio: "twbeiding",
				trigger: {
					player: ["useCard1", "useCardAfter"],
				},
				filter(event, player, name) {
					if (!player.storage.isInHuan) {
						return false;
					}
					if (
						!player
							.getStorage("twbeiding")
							.map(i => i[0].name)
							.includes(event.card.name)
					) {
						return false;
					}
					return name == "useCardAfter" || (name == "useCard1" && event.addCount !== false);
				},
				forced: true,
				async content(event, trigger, player) {
					if (event.triggername == "useCard1") {
						trigger.addCount = false;
						const stat = player.getStat().card,
							name = trigger.card.name;
						if (typeof stat[name] == "number") {
							stat[name]--;
						}
					} else {
						await player.draw();
						player.unmarkAuto(
							"twbeiding",
							player.getStorage("twbeiding").filter(i => i[0].name == trigger.card.name)
						);
					}
				},
			},
		},
	}
```

### twjielv 名字:竭虑
描述: 锁定技。①每名角色回合结束时，若你未对其使用牌，你失去1点体力。②当你失去1点体力或受到1点伤害后，若你的体力上限小于7，你增加1点体力上限。
```js
twjielv: {
		audio: 2,
		audioname: ["huan_zhugeliang_shadow"],
		derivation: "twjielvx",
		group: ["twjielv_lose", "twjielv_buff", "twjielv_huan"],
		locked: true,
		ai: { halfneg: true },
		subSkill: {
			lose: {
				audio: "twjielv",
				trigger: { global: "phaseEnd" },
				filter(event, player) {
					if (player.storage.isInHuan) {
						return false;
					}
					return !player.hasHistory("useCard", evt => evt.targets?.some(i => i == event.player));
				},
				forced: true,
				async content(event, trigger, player) {
					await player.loseHp();
				},
			},
			buff: {
				audio: "twjielv",
				trigger: { player: ["loseHpEnd", "damageEnd"] },
				filter(event, player) {
					if (player.storage.isInHuan) {
						return false;
					}
					return player.maxHp < 7 && event.num > 0;
				},
				forced: true,
				getIndex: event => event.num,
				async content(event, trigger, player) {
					await player.gainMaxHp();
				},
			},
			huan: {
				audio: "twjielv",
				trigger: { player: "loseMaxHpEnd" },
				filter(event, player) {
					if (!player.storage.isInHuan) {
						return false;
					}
					return event.num > 0 && player.isDamaged();
				},
				forced: true,
				getIndex: event => event.num,
				async content(event, trigger, player) {
					await player.recover();
				},
			},
		},
	}
```

### twhunyou 名字:魂游
描述: 限定技，当你处于濒死状态时，你可以将体力值回复至1点，若如此做，本回合当你受到伤害时或失去体力时，取消之；当前回合结束后，你入幻：进行一个额外的回合。
```js
twhunyou: {
		audio: 2,
		limited: true,
		enable: "chooseToUse",
		filter(event, player) {
			return event.type == "dying" && event.dying == player;
		},
		skillAnimation: true,
		animationColor: "orange",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.recoverTo(1);
			player.addTempSkill(event.name + "_buff");
			if (!_status.currentPhase) {
				return;
			}
			player.when({ global: "phaseAfter" }).step(async (event, trigger, player) => {
				player.insertPhase("twhunyou");
				player.storage.isInHuan = true;
				player.changeSkin({ characterName: "huan_zhugeliang" }, "huan_zhugeliang_shadow");
				player.changeSkills(get.info("twhunyou").derivation, ["twhunyou"]);
			});
		},
		derivation: ["twhuanji", "twchanggui"],
		subSkill: {
			buff: {
				audio: "twhunyou",
				trigger: { player: ["damageBefore", "loseHpBefore"] },
				forced: true,
				charlotte: true,
				async content(event, trigger, player) {
					trigger.cancel();
					game.log(player, "防止此次了" + (trigger.name == "damage" ? "伤害" : "失去体力"));
				},
				ai: {
					nofire: true,
					nothunder: true,
					nodamage: true,
					effect: {
						target(card, player, target, current) {
							if (get.tag(card, "damage")) {
								return "zeroplayertarget";
							}
						},
					},
				},
				mark: true,
				intro: { content: "我是无敌的" },
			},
		},
		ai: {
			order: 1,
			save: true,
			skillTagFilter(player, tag, target) {
				if (player != target || player.storage.twhunyou) {
					return false;
				}
			},
			result: { player: 1 },
		},
	}
```

## huan_jiangwei 名字:幻姜维 势力:shu

### twqinghan 名字:擎汉
描述: 出牌阶段限一次，你可使用一张装备牌与一名其他角色拼点，若你赢，你可视为对其使用一张以其为唯一目标的普通锦囊牌；若你没赢，你获得所有拼点牌。
```js
twqinghan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		//trigger: { player: "useCardAfter" },
		filter(event, player) {
			if (event.name == "useCard" && event.card?.name != "shan") {
				return false;
			}
			return player.countCards("he", { type: "equip" }) && game.hasPlayer(current => player.canCompare(current, true));
		},
		filterTarget(card, player, target) {
			return player.canCompare(target, true);
		},
		filterCard: { type: "equip" },
		position: "he",
		discard: false,
		lose: false,
		delay: 0,
		check(card) {
			if (get.position(card) != "e") {
				return 10;
			}
			return Math.min(13, get.number(card) + 2) / Math.pow(Math.min(2, get.value(card)), 0.25);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					filterCard: { type: "equip" },
					position: "he",
					filterTarget(card, player, target) {
						return player.canCompare(target, true);
					},
					prompt: get.prompt2(event.skill),
					ai1(card) {
						if (get.position(card) != "e") {
							return 10;
						}
						return Math.min(13, get.number(card) + 2) / Math.pow(Math.min(2, get.value(card)), 0.25);
					},
					ai2(target) {
						const player = get.player(),
							att = get.attitude(player, target);
						const hs = player.getCards("he", { type: "equip" }).sort(function (a, b) {
							return a.number - b.number;
						});
						const ts = target.getCards("h").sort(function (a, b) {
							return a.number - b.number;
						});
						if (!hs.length || !ts.length) {
							return 0;
						}
						if (hs[0].number <= ts[0].number) {
							return -3 * att;
						}
						if (player.countCards("h") >= target.countCards("h")) {
							return -10 * att;
						}
						return -1 * att;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const card = event.cards[0],
				target = event.targets[0];
			const result = await player
				.chooseToCompare(target)
				.set("fixedResult", { [player.playerid]: card })
				.forResult();
			const cards = get.inpileVCardList(info => {
				if (info[0] != "trick") {
					return false;
				}
				return player.canUse({ name: info[2] }, target, false);
			});
			if (result.bool && cards.length) {
				const { links } = await player
					.chooseButton([`请选择你要对${get.translation(target)}使用的牌`, [cards, "vcard"]])
					.set("ai", button => {
						const player = get.player(),
							target = get.event().target;
						return get.effect(target, { name: button.link[2] }, player, player);
					})
					.set("target", target)
					.forResult();
				if (links && links.length) {
					const card = new lib.element.VCard({ name: links[0][2], isCard: true });
					await player.useCard(card, target, false);
				}
			}
			if (!result.bool) {
				const card1 = result.player,
					card2 = result.target;
				await player.gain([card1, card2].filterInD("d"), "gain2");
				//player.tempBanSkill(event.name);
			}
		},
		ai: {
			order: 4,
			result: {
				target(player, target) {
					const hs = player.getCards("he", { type: "equip" }).sort(function (a, b) {
						return a.number - b.number;
					});
					const ts = target.getCards("h").sort(function (a, b) {
						return a.number - b.number;
					});
					if (!hs.length || !ts.length) {
						return 0;
					}
					if (hs[0].number <= ts[0].number) {
						return -3;
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

### twzhihuan 名字:治宦
描述: ①每个回合结束时，若你本回合失去过至少两种类型的牌，则你可以选择一项：1.获得当前回合角色装备区里的一张牌；2.获得并使用一张牌堆或弃牌堆中你空置装备栏对应类别的装备牌。②你的拼点牌点数+X(X为你已损失的体力值)。
```js
twzhihuan: {
		audio: 2,
		/*trigger: {
			source: "damageBegin2",
		},
		filter(event, player) {
			return (
				event.card &&
				event.card.name == "sha" &&
				event.getParent().type == "card" &&
				(event.player.countGainableCards(player, "e") ||
					Array.from({ length: 5 })
						.map((_, i) => i + 1)
						.some(i => player.hasEmptySlot(i)))
			);
		},
		logTarget: "player",*/
		trigger: {
			global: "phaseEnd",
		},
		filter(event, player) {
			return (
				player
					.getHistory("lose", evt => evt.cards2?.length)
					.map(evt => evt.cards2.map(card => get.type2(card)))
					.flat()
					.unique().length > 1
			);
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			const choices = [];
			const choiceList = [`获得${get.translation(target)}装备区一张牌`, `获得并使用一张牌堆或弃牌堆中空置装备栏对应类别的装备牌`];
			if (trigger.player.countGainableCards(player, "e")) {
				choices.push("选项一");
			} else {
				choiceList[0] = '<span style="opacity:0.5;">' + choiceList[0] + "</span>";
			}
			if (
				Array.from({ length: 5 })
					.map((_, i) => i + 1)
					.some(i => player.hasEmptySlot(i))
			) {
				choices.push("选项二");
			} else {
				choiceList[1] = '<span style="opacity:0.5;">' + choiceList[1] + "</span>";
			}
			const { control } = await player
				.chooseControl(choices, "cancel2")
				.set("prompt", get.prompt(event.skill))
				.set("choiceList", choiceList)
				.set("ai", () => {
					const choices = get.event().controls.slice();
					const player = get.player(),
						evt = get.event().getTrigger(),
						target = evt.player;
					const eff = get.damageEffect(target, player, player, evt.nature),
						att = get.attitude(player, target);
					if (att > 0) {
						if (eff >= 0) {
							return "cancel2";
						}
						return "选项二";
					}
					if (eff <= 0) {
						if (choices.includes("选项一")) {
							return "选项一";
						}
						return "选项二";
					}
					if ((target.hp == 1 && att < 0) || evt.num > 1 || player.hasSkill("tianxianjiu") || player.hasSkill("luoyi2") || player.hasSkill("reluoyi2")) {
						return "cancel2";
					}
					if (
						choices.includes("选项一") &&
						target.countCards("e", card => {
							return get.effect(player, card, player, player) > 0;
						})
					) {
						return "选项一";
					}
					return "选项二";
				})
				.forResult();
			event.result = {
				bool: control != "cancel2",
				cost_data: control,
			};
		},
		async content(event, trigger, player) {
			//trigger.cancel();
			if (event.cost_data == "选项一") {
				await player.gainPlayerCard(trigger.player, "e", true);
			} else {
				for (let i = 1; i < 7; i++) {
					if (player.hasEmptySlot(i)) {
						const sub = "equip" + i,
							equip = get.cardPile(card => get.subtype(card, false) == sub && player.hasUseTarget(card));
						if (equip) {
							player.$gain2(equip);
							await game.delayx();
							await player.chooseUseTarget(equip, "nothrow", "nopopup", true);
							break;
						}
					}
				}
			}
		},
		group: "twzhihuan_compare",
		subSkill: {
			compare: {
				trigger: {
					player: "compare",
					target: "compare",
				},
				filter(event, player) {
					//if (!player.hasAllHistory("useCard", evt => get.type(evt.card) == "equip")) {
					if (!player.getDamagedHp()) {
						return false;
					}
					if (event.player == player) {
						return !event.iwhile;
					}
					return true;
				},
				forced: true,
				async content(event, trigger, player) {
					//const num = player.getAllHistory("useCard", evt => get.type(evt.card) == "equip").length * 2;
					const num = player.getDamagedHp();
					if (player == trigger.player) {
						trigger.num1 += num;
						if (trigger.num1 > 13) {
							trigger.num1 = 13;
						}
					} else {
						trigger.num2 += num;
						if (trigger.num2 > 13) {
							trigger.num2 = 13;
						}
					}
					game.log(player, "的拼点牌点数+", "#g", num);
				},
			},
		},
	}
```

## huan_zhugeguo 名字:幻诸葛果 势力:shu

### rexianyuan 名字:仙援
描述: ①每轮开始时，你获得2枚“仙援”标记（一名角色至多拥有3枚“仙援”标记）。②出牌阶段，你可以将“仙援”标记分配给其他角色。③拥有“仙援”标记的角色的出牌阶段开始时，你选择一项：⒈观看其手牌，将其中至多X张牌置于牌堆顶；⒉令其摸X张牌（X为其拥有的“仙援”标记数）。然后若当前回合角色不为你，则移去其所有“仙援”标记。
```js
rexianyuan: {
		audio: "twxianyuan",
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return event.player.hasMark("rexianyuan");
		},
		forced: true,
		locked: false,
		logTarget: "player",
		async content(event, trigger, player) {
			const target = trigger.player,
				str = get.translation(target);
			const num = target.countMark("rexianyuan");
			let choice;
			if (!target.countCards("h")) {
				choice = 1;
			} else {
				choice = (
					await player
						.chooseControl()
						.set("choiceList", ["观看" + str + "的手牌并将其中至多" + get.cnNumber(num) + "张牌置于牌堆顶", "令" + str + "摸" + get.cnNumber(num) + "张牌"])
						.set("ai", () => (get.attitude(get.player(), get.event().getTrigger().player) > 0 ? 1 : 0))
						.forResult()
				).index;
			}
			if (typeof choice != "number") {
				return;
			}
			if (choice == 0) {
				const result = await player.choosePlayerCard(target, "h", "visible", [1, num], true, '###仙援###<div class="text center">将其中至多' + get.cnNumber(num) + "张牌置于牌堆顶（先选择的在上）</div>").forResult();
				if (result.bool && result.cards?.length) {
					const cards = result.cards.slice();
					target.$throw(cards.length, 1000);
					await target.lose(cards, ui.cardPile, "insert");
				}
			} else {
				await target.draw(num);
			}
			if (_status.currentPhase !== player) {
				target.clearMark("rexianyuan");
			}
		},
		limit: 3,
		intro: { content: "mark" },
		group: ["rexianyuan_give", "rexianyuan_gain"],
		subSkill: {
			give: {
				audio: "twxianyuan",
				enable: "phaseUse",
				filter(event, player) {
					return player.hasMark("rexianyuan") && game.hasPlayer(i => lib.skill.rexianyuan.subSkill.give.filterTarget(null, player, i));
				},
				filterTarget(card, player, target) {
					return target != player && target.countMark("rexianyuan") < lib.skill.rexianyuan.limit;
				},
				prompt: "将“仙援”标记分配给其他角色",
				async content(event, trigger, player) {
					const target = event.target;
					const gives = Array.from({ length: player.countMark("rexianyuan") }).map((_, i) => get.cnNumber(i + 1) + "枚");
					let give;
					if (gives.length == 1) {
						give = 0;
					} else {
						give = (
							await player
								.chooseControl(gives)
								.set("ai", () => 0)
								.set("prompt", "仙援：将任意枚“仙援”标记分配给" + get.translation(target))
								.forResult()
						).index;
					}
					if (typeof give != "number") {
						return;
					}
					give++;
					player.removeMark("rexianyuan", give);
					target.addMark("rexianyuan", give);
				},
				ai: {
					order: 1,
					result: {
						player: 1,
						target(player, target) {
							const sgn = get.sgn(get.attitude(player, target));
							return sgn == 0 ? 0.5 : sgn * (2 - sgn);
						},
					},
				},
			},
			gain: {
				audio: "twxianyuan",
				trigger: { global: "roundStart" },
				filter(event, player) {
					return player.countMark("rexianyuan") < lib.skill.rexianyuan.limit;
				},
				forced: true,
				locked: false,
				content() {
					player.addMark("rexianyuan", Math.min(2, lib.skill.rexianyuan.limit - player.countMark("rexianyuan")));
				},
			},
		},
	}
```

### twlingyin 名字:灵隐
描述: 当你成为普通锦囊牌的目标时，你可以展示牌堆顶的一张牌，若此牌与使用的牌的：颜色相同，你获得此牌；花色相同，你令此牌对你无效；颜色不同，你将此牌置入弃牌堆。
```js
twlingyin: {
		audio: 2,
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			return get.type(event.card) == "trick";
		},
		async content(event, trigger, player) {
			const cards = get.cards(1, true),
				card = cards[0];
			await player.showCards(cards, get.translation(player) + "发动了【灵隐】");
			if (get.color(card, false) == get.color(trigger.card)) {
				await player.gain(cards, "gain2");
			}
			if (get.suit(card, false) == get.suit(trigger.card)) {
				trigger.getParent().excluded.add(player);
				game.log(trigger.card, "对", player, "无效");
			}
			if (get.color(card, false) != get.color(trigger.card)) {
				await game.cardsDiscard(cards);
				player.$throw(cards);
				game.log(cards, "被置入了弃牌堆");
			}
		},
	}
```

## huan_zhanghe 名字:幻张郃 势力:wei

### twkuiduan 名字:溃端
描述: 锁定技。①当你使用【杀】指定唯一目标后，你与其的随机两张手牌获得“溃端”标记，这些牌视为普通【杀】。②你的“溃端”牌不计入手牌上限。③结束阶段，你视为对一名其他角色使用一张【决斗】，此牌造成伤害后，伤害来源摸X张牌（X为你手牌中【杀】和“溃端”牌的数量且至多为5）。
```js
twkuiduan: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (event.card.name != "sha" || event.targets.length != 1) {
				return false;
			}
			return player.countCards("h") + event.target.countCards("h") > 0;
		},
		forced: true,
		logTarget: "target",
		async content(event, trigger, player) {
			const targets = [player, trigger.target];
			for (const target of targets) {
				if (!target.countCards("h")) {
					continue;
				}
				target.addSkill("twkuiduan_card");
				target.addGaintag(target.getCards("h").randomGets(2), "twkuiduan_card");
			}
		},
		mod: {
			ignoredHandcard(card, player) {
				if (card.hasGaintag("twkuiduan_card")) {
					return true;
				}
			},
			cardDiscardable(card, player, name) {
				if (name == "phaseDiscard" && card.hasGaintag("twkuiduan_card")) {
					return false;
				}
			},
		},
		group: "twkuiduan_damage",
		subSkill: {
			draw: {
				charlotte: true,
				audio: "twkuiduan",
				forced: true,
				trigger: { global: "damageSource" },
				filter(event, player) {
					return event.card?.storage?.twkuiduan && event.source?.isIn();
				},
				logTarget: "source",
				async content(event, trigger, player) {
					const target = trigger.source;
					if (target?.isIn()) {
						const num = Math.min(
							5,
							player.countCards("h", card => card.hasGaintag("twkuiduan_card") || get.name(card, player) == "sha")
						);
						if (num > 0) {
							await target.draw(num);
						}
					}
				},
			},
			damage: {
				audio: "twkuiduan",
				trigger: { player: "phaseJieshuBegin" },
				filter(event, player) {
					return player.hasUseTarget(get.autoViewAs({ name: "juedou", isCard: true }), false, false);
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget("溃端：视为对一名其他角色使用一张【决斗】", true, (card, player, target) => {
							return player.canUse(get.autoViewAs({ name: "juedou", isCard: true }), target, false, false);
						})
						.set("ai", target => get.effect(target, { name: "juedou" }, get.player(), get.player()))
						.forResult();
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					player.addTempSkill("twkuiduan_draw");
					await player.useCard(get.autoViewAs({ name: "juedou", isCard: true, storage: { twkuiduan: true } }), target, false);
				},
				/*trigger: { global: "damageBegin1" },
				filter(event, player) {
					if (!event.source) {
						return false;
					}
					const evtx = event.getParent(2);
					if (
						!evtx ||
						evtx.name != "useCard" ||
						!event.source.hasHistory("lose", evt => {
							if (evt.getParent() != evtx) {
								return false;
							}
							for (var i in evt.gaintag_map) {
								if (evt.gaintag_map[i].includes("twkuiduan_card")) {
									return true;
								}
							}
						})
					) {
						return false;
					}
					return event.source.countCards("h", card => card.hasGaintag("twkuiduan_card")) > event.player.countCards("h", card => card.hasGaintag("twkuiduan_card"));
				},
				forced: true,
				logTarget: "source",
				content() {
					trigger.num++;
				},*/
			},
			card: {
				charlotte: true,
				mod: {
					aiOrder(player, card, num) {
						if (get.itemtype(card) == "card" && card.hasGaintag("twkuiduan_card")) {
							return num + 1;
						}
					},
					cardname(card, player) {
						if (get.itemtype(card) == "card" && card.hasGaintag("twkuiduan_card")) {
							return "sha";
						}
					},
					cardnature(card, player) {
						if (get.itemtype(card) == "card" && card.hasGaintag("twkuiduan_card")) {
							return false;
						}
					},
				},
			},
		},
	}
```

## huan_zhaoyun 名字:幻赵云 势力:shu

### twjiezhan 名字:竭战
描述: 其他角色的出牌阶段开始时，若其在你攻击范围内，你可以摸一张牌，然后其视为对你使用一张无距离限制的普通【杀】（计入【杀】的使用次数）。
```js
twjiezhan: {
		audio: 2,
		trigger: {
			global: "phaseUseBegin",
		},
		filter(event, player) {
			return event.player != player && player.inRange(event.player);
		},
		check(event, player) {
			if (get.attitude(player, event.player) > 0) {
				return false;
			}
			if (player.getEquip("bagua") || player.getEquip("rw_bagua")) {
				return true;
			}
			if (player.hasSkill("twlongjin", null, null, false) && !player.awakenedSkills.includes("twlongjin")) {
				return true;
			}
			if (player.countCards("hs", "shan") || (player.countCards("hs", "sha") && player.hasSkill("ollongdan", null, null, false))) {
				return true;
			}
			return get.effect(player, { name: "draw" }, player, player) + get.effect(event.player, { name: "sha" }, event.player, player);
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.draw();
			const target = trigger.player,
				sha = get.autoViewAs({ name: "sha", isCard: true });
			if (target.canUse(sha, player, false, true)) {
				await target.useCard(sha, player);
			}
		},
	}
```

### twlongjin 名字:龙烬
描述: 觉醒技，当你进入濒死状态时，你将体力值回复至2点，此后的五个回合，你视为拥有技能〖龙胆〗和〖冲阵〗，且你计算与其他角色的距离视为1。
```js
twlongjin: {
		audio: 2,
		trigger: {
			player: "dying",
		},
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "fire",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await player.recoverTo(2);
			const skill = event.name + "_buff";
			player.addSkill(skill);
			await player.addAdditionalSkills(skill, get.info(event.name).derivation);
			player.addMark(skill, 5, false);
		},
		subSkill: {
			buff: {
				mod: {
					globalFrom(from, to) {
						return -Infinity;
					},
				},
				charlotte: true,
				intro: {
					content: "剩余#回合失去〖龙胆〗和〖冲阵〗",
				},
				trigger: {
					global: ["phaseBefore", "phaseAfter"],
				},
				filter(event, player, name) {
					return name == "phaseBefore" || (name == "phaseAfter" && !player.countMark("twlongjin_buff"));
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					if (event.triggername == "phaseBefore") {
						player.removeMark(event.name, 1, false);
					}
					if (event.triggername == "phaseAfter" && !player.countMark(event.name)) {
						await player.removeAdditionalSkills(event.name);
					}
				},
			},
		},
		derivation: ["ollongdan", "chongzhen"],
	}
```

## huan_daqiao 名字:幻大乔 势力:wu

### twguose 名字:帼色
描述: `有角色${get.poptip({
		id: "twguose_tip",
		name: "受伤状态",
		type: "character",
		info: "即未受伤/受伤的状态，受伤状态变化后即体力值/上限变化后，若该状态发生变化。",
	})}变化后，若其判定区未废除且没有【乐不思蜀】，你可将你或其的一张牌当作【乐不思蜀】置入其判定区中，然后你摸两张牌。有【乐不思蜀】判定生效后，你可将此【乐不思蜀】的效果改为跳过弃牌阶段。`
```js
twguose: {
		audio: 2,
		trigger: { global: ["changeHpAfter", "gainMaxHpAfter", "loseMaxHpAfter"] },
		filter(event, player) {
			if ((!event.player || !event.player.isDisabledJudge()) && event.player?.hasJudge("lebu")) {
				return false;
			}
			if (!player.hasCards("he") && (!event.player || !event.player.hasCards("he"))) {
				return false;
			}
			return get.info("twguose").damageStatusChanged(event.player, event);
		},
		damageStatusChanged(player, evt) {
			if (!evt.changedMaxHp) {
				if (evt.changedHp > 0) {
					return !player.isDamaged();
				}
				if (evt.changedHp < 0) {
					return player.hp - evt.changedHp === player.maxHp;
				}
			}
			if (evt.changedMaxHp > 0) {
				return player.maxHp - evt.changedMaxHp === player.getHp();
			}
			if (evt.changedMaxHp < 0) {
				return !player.isDamaged() && evt.changedHp !== evt.changedMaxHp;
			}
			return false;
		},
		async skipDiscard(event, trigger, player) {
			if (event._result.bool === false) {
				player.skip("phaseDiscard");
			}
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			if (target?.hasJudge("lebu")) {
				return;
			}
			event.result = await player
				.chooseTarget({
					prompt: get.prompt(event.skill, target),
					prompt2: `选择一名角色，将其一张牌当【乐不思蜀】置入${get.translation(target)}的判定区，然后摸两张牌`,
					filterTarget(card, player, target) {
						const targetx = get.event().targetx;
						if (![player, targetx].includes(target)) {
							return false;
						}
						return target.hasCards("he", cardx => targetx.canAddJudge(get.autoViewAs({ name: "lebu" }, [cardx])));
					},
					ai(target) {
						// 如果是队友就随机盖一方的牌（若残血盖自己的）
						// 如果是敌人且贴乐收益为正则选对方的牌
						const player = get.player();
						const targetx = get.event().targetx;
						const att = get.attitude(player, targetx);
						if (target === player && att >= 0) {
							return Math.random();
						}
						if (att <= 0) {
							return 20 + get.effect(targetx, { name: "lebu" }, player, player);
						} else if (targetx.hp <= 1) {
							return 0;
						}
						return Math.random();
					},
				})
				.set("targetx", target)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target.hasCards("he", card => trigger.player.canAddJudge(get.autoViewAs({ name: "lebu" }, [card])))) {
				return;
			}
			const result = await player
				.choosePlayerCard({
					prompt: `选择一张牌当作【乐不思蜀】置入${get.translation(trigger.player)}的判定区`,
					filterButton(button) {
						const targetx = get.event().targetx;
						return targetx.canAddJudge(get.autoViewAs({ name: "lebu" }, [button.link]));
					},
					target,
					targetx: trigger.player,
					position: "he",
					forced: true,
					ai(button) {
						const player = get.player();
						// 如果不是自己就随机选，否则若变化角色为队友就优先红
						if (get.event().target !== player) {
							return Math.random();
						} else {
							const bool = get.color(button.link) === "red" && get.event().att > 0 ? 2 : 0;
							return 6 + bool - get.value(button.link);
						}
					},
					att: get.attitude(player, trigger.player),
				})
				.forResult();
			if (result?.bool) {
				const card = result.cards[0];
				target.$give(card, trigger.player, false);
				await trigger.player.addJudge({ name: "lebu" }, [card]);
				await player.draw(2);
			}
		},
		group: "twguose_effect",
		global: "twguose_ai",
		subSkill: {
			effect: {
				audio: "twguose",
				trigger: { global: "judgeEnd" },
				filter(event, player) {
					return event.card?.name === "lebu" && !event.result?.bool;
				},
				prompt2(event, player) {
					return `帼色：是否将${get.translation(event.player)}的${get.translation(event.card)}的效果改为跳过弃牌阶段？`;
				},
				check(event, player) {
					return get.attitude(player, event.player) > 0;
				},
				logTarget: "player",
				async content(event, trigger, player) {
					const target = event.targets[0];
					const card = trigger.card;
					target
						.when("lebuBegin")
						.filter(evt => evt.getParent() == trigger.getParent())
						.then(async (event, trigger, player) => {
							trigger.setContent(get.info("twguose").skipDiscard);
						});
					game.log(player, "将", get.translation(card), "改为跳过弃牌阶段");
				},
			},
			ai: {
				ai: {
					effect: {
						target(card, player, target, result2) {
							if (card.name != "lebu") {
								return;
							}
							if (game.hasPlayer(current => current.hasSkill("twguose") && get.attitude(current, target) > 1)) {
								if (result2 < 0) {
									return [-1, 0];
								}
							}
						},
					},
				},
			},
		},
	}
```

### twliuli 名字:流俪
描述: `有角色成为伤害牌的目标后，你可弃置其场上一张红色牌，令此牌对其无效，然后若其${get.poptip("twguose_tip")}与你相同，你摸两张牌。`
```js
twliuli: {
		audio: 2,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			const card = event.card;
			const target = event.target;
			if (!get.is.damageCard(card)) {
				return false;
			}
			return target?.hasCards("ej", card => lib.filter.cardDiscardable(card, player, "twliuli") && get.color(card) === "red");
		},
		async cost(event, trigger, player) {
			const target = trigger.target;
			event.result = await player
				.discardPlayerCard({
					target,
					position: "ej",
					prompt: `流俪：是否弃置${get.translation(target)}场上的一张红色牌，令${get.translation(trigger.card)}对其无效？`,
					filterButton(button) {
						return get.color(button.link) === "red" && lib.filter.cardDiscardable(button.link, get.player(), "twliuli");
					},
					ai(button) {
						return 6 - get.value(button.link);
					},
				})
				.set("chooseonly", true)
				.forResult();
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const target = trigger.target;
			await target.discard(event.cards).set("discarder", player);
			trigger.getParent().excluded.add(target);
			game.log(trigger.card, "对", target, "无效");
			if (player.isDamaged() === target.isDamaged()) {
				await player.draw(2);
			}
		},
	}
```

## huan_simayi 名字:幻司马懿 势力:wei

### twzongquan 名字:纵权
描述: 准备阶段或结束阶段，你可以选择一名角色，然后你进行判定：若为红色：你令其摸一张牌；若为黑色：你令其弃置一张牌。 若你本次选择的目标与上次相同但判定结果不同，则摸或弃置的牌数改为三。然后你令一名角色获得判定牌。
```js
twzongquan: {
		audio: 2,
		trigger: {
			player: ["phaseZhunbeiBegin", "phaseJieshuBegin"],
		},
		async cost(event, trigger, player) {
			const history = player.getAllHistory("useSkill", evt => evt.skill == "twzongquan"),
				judgeEvent = game.getAllGlobalHistory("everything", evt => evt.name == "judge" && evt.player == player && evt.getParent().name == "twzongquan");
			event.result = await player
				.chooseTarget(get.prompt(event.skill), `选择一名角色，然后你进行判定，并令其执行相应效果` + (history.length > 0 ? `（上次选择的目标：${get.translation(history.at(-1).targets[0])}` : ``) + (judgeEvent.length > 0 ? `；上次判定的结果：${get.translation(judgeEvent.at(-1).result.color)}）` : ``))
				.set("ai", target => {
					const player = get.player(),
						att = get.attitude(player, target);
					if (player.getAllHistory("useSkill", evt => evt.skill == "twzongquan").length) {
						const history = game.getAllGlobalHistory("everything", evt => {
							if (evt.name != "judge") {
								return false;
							}
							const evtx = evt.getParent();
							return evtx.name == "twguimou" && evtx.player == player && evtx != trigger.getParent();
						});
						const evt = history[history.length - 1];
						if (evt && evt.getParent().targets[0] == target) {
							const color = evt.color;
							if (color == "black" && att > 0) {
								return 1919810;
							}
							if (color == "red" && att < 0) {
								return 114514;
							}
						}
					}
					return Math.abs(att);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const next = player.judge(card => {
				return get.color(card) == "black" ? -2 : 2;
			});
			next.judge2 = result => result.bool;
			const result = await next.forResult();
			const history = player.getAllHistory("useSkill", evt => evt.skill == "twzongquan"),
				judgeEvent = game.getAllGlobalHistory("everything", evt => evt.name == "judge" && evt.player == player && evt.getParent().name == "twzongquan");
			let num;
			if (history.length > 1 && judgeEvent.length > 1 && target == history.at(-2).targets[0] && result.color != judgeEvent.at(-2).result.color) {
				num = 3;
			} else {
				num = 1;
			}
			if (result.color == "red") {
				await target.draw(num);
			} else if (result.color == "black" && target.countCards("he")) {
				await target.chooseToDiscard("he", num, true);
			}
			const card = result.card;
			if (get.position(card) != "d") {
				return;
			}
			const { targets } = await player
				.chooseTarget(`令一名角色获得${get.translation(card)}`)
				.set("ai", target => {
					const player = get.player();
					let att = get.attitude(player, target);
					if (target.hasSkillTag("nogain")) {
						att /= 10;
					}
					return att;
				})
				.forResult();
			if (!targets || !targets.length) {
				return;
			}
			await targets[0].gain(card, "gain2");
		},
	}
```

### twguimou 名字:鬼谋
描述: 每回合限两次，当一名角色的判定牌生效前，你可以观看牌堆底的四张牌，打出其中一张牌代替之，然后将其余牌以任意顺序置于牌堆顶。
```js
twguimou: {
		audio: 2,
		trigger: {
			global: "judge",
		},
		usable: 2,
		popup: false,
		async content(event, trigger, player) {
			const cards = get.bottomCards(4, true);
			const { links } = await player
				.chooseButton([get.translation(trigger.player) + "的" + (trigger.judgestr || "") + "判定为" + get.translation(trigger.player.judging[0]) + "，" + get.prompt("twguimou"), cards], true)
				.set("filterButton", button => {
					const player = get.player(),
						card = button.link;
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
				.set("ai", button => {
					const card = button.link,
						trigger = get.event().getTrigger();
					const player = get.player(),
						judging = get.event().judging;
					const result = trigger.judge(card) - trigger.judge(judging) + 0.00001;
					const attitude = get.attitude(player, trigger.player);
					const name = trigger.getParent().name;
					if (name == "twzongquan") {
						const target = trigger.getParent().targets[0];
						const history = game.getAllGlobalHistory("everything", evt => {
							if (evt.name != "judge") {
								return false;
							}
							const evtx = evt.getParent();
							return evtx.name == "twzongquan" && evtx.player == player && evtx != trigger.getParent();
						});
						const evt = history[history.length - 1];
						if (evt && evt.getParent().targets[0] == target) {
							if (get.color(card) != evt.color) {
								return 114514 * result * attitude;
							}
						}
					}
					return result * attitude;
				})
				.set("judging", trigger.player.judging[0])
				.forResult();
			if (!links || !links.length) {
				return;
			}
			cards.removeArray(links);
			await player.respond(links, "twguimou", "highlight", "noOrdering");
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
			trigger.player.judging[0] = links[0];
			trigger.orderingCards.addArray(links);
			game.log(trigger.player, "的判定牌改为", links[0]);
			await game.delay(2);
			const next = player.chooseToMove("鬼谋：将卡牌以任意顺序置于牌堆顶");
			next.set("list", [["牌堆顶", cards]]);
			next.set("processAI", function (list) {
				const player = get.player(),
					target = get.event().getTrigger().name == "phaseZhunbei" ? player : player.next;
				const att = get.sgn(get.attitude(player, target));
				const check = function (card) {
					const judge = player.getCards("j")[cards.length];
					if (judge) {
						return get.judge(judge)(card) * att;
					}
					return player.getUseValue(card) * att;
				};
				const cards = list[0][1].slice(0);
				cards.sort(function (a, b) {
					return check(b) * att - check(a) * att;
				});
				return [cards];
			});
			next.set("namex", event.triggername);
			const { moved } = await next.forResult();
			const top = moved[0].reverse();
			await game.cardsGotoPile(top, ["top_cards", top], (event, card) => {
				if (event.top_cards.includes(card)) {
					return ui.cardPile.firstChild;
				}
				return null;
			});
		},
	}
```

## huan_weiyan 名字:幻魏延 势力:shu

### twqiji 名字:奇击
描述: 出牌阶段开始时，你可以视为对一名其他角色使用X张无距离限制且不计入次数的【杀】，此【杀】指定目标时，其可以选择一名本回合未以此法选择的其他角色，被选择的角色摸一张牌，然后其可以将此【杀】的目标转移给自己（X为出牌阶段开始时你手牌的类型数）。
```js
twqiji: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countCards("h") && game.hasPlayer(current => player.canUse({ name: "sha", isCard: true }, current, false));
		},
		async cost(event, trigger, player) {
			const num = player
				.getCards("h")
				.map(card => get.type2(card))
				.toUniqued().length;
			event.result = await player
				.chooseTarget(get.prompt(event.skill), `选择一名角色其他角色视为对其使用${get.cnNumber(num)}张无距离限制且不计入次数的【杀】`, (card, player, target) => {
					return player.canUse({ name: "sha", isCard: true }, target, false);
				})
				.set("ai", target => {
					const player = get.player();
					const eff = get.effect(target, { name: "sha", isCard: true }, player, player);
					if (target.hasSkill("bagua_skill") || target.hasSkill("rw_bagua_skill") || target.hasSkill("bazhen")) {
						return 0;
					}
					return eff;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0],
				sha = get.autoViewAs({ name: "sha", isCard: true, storage: { twqiji: true } });
			let num = player
				.getCards("h")
				.map(card => get.type2(card))
				.toUniqued().length;
			target.addTempSkill("twqiji_buff", "phaseUseAfter");
			while (target.isIn() && num--) {
				await player.useCard(sha, target, false);
			}
		},
		subSkill: {
			buff: {
				charlotte: true,
				trigger: { global: "useCardToPlayer" },
				filter(event, player) {
					if (!event.card.storage?.twqiji || !event.targets.includes(player)) {
						return false;
					}
					return event.isFirstTarget && game.hasPlayer(current => current != player && !player.getStorage("twqiji_used").includes(current) && lib.filter.targetEnabled2(event.card, event.player, current));
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget("令一名本回合未以此法选择的角色摸一张牌，然后其可以将此杀转移给自己", (card, player, target) => {
							const event = get.event().getTrigger();
							return target != player && !player.getStorage("twqiji_used").includes(target) && lib.filter.targetEnabled2(event.card, event.player, target);
						})
						.set("ai", target => {
							const player = get.player(),
								trigger = get.event().getTrigger();
							if (get.attitude(player, target) <= 0 || get.effect(player, trigger.card, trigger.player, player) > 0) {
								return 0;
							}
							if (target.countCards("h", "shan") || target.getEquip(2) || target.hp > player.hp + 1) {
								return 10;
							}
							return get.effect(target, { name: "draw" }, player, player);
						})
						.forResult();
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					player.addTempSkill("twqiji_used");
					player.markAuto("twqiji_used", target);
					await target.draw();
					const result = await target
						.chooseBool(`是否将${get.translation(trigger.card)}转移给自己`)
						.set("choice", () => {
							let save = false;
							if (target.countCards("h", "shan") || target.getEquip(2) || player.hp == 1 || target.hp > player.hp + 1) {
								if (!player.countCards("h", "shan") || target.countCards("h") < player.countCards("h")) {
									save = true;
								}
							}
							return save;
						})
						.forResult();
					if (!result?.bool) {
						return;
					}
					const evt = trigger.getParent();
					evt.triggeredTargets1.remove(player);
					evt.targets.remove(player);
					evt.targets.push(target);
				},
			},
			used: {
				charlotte: true,
				onremove: true,
				intro: { content: "已选择过$" },
			},
		},
	}
```

### twpiankuang 名字:偏狂
描述: 锁定技。①当你使用【杀】造成伤害时，若你本回合使用【杀】造成过伤害，此伤害+1。②你的回合内，当你使用【杀】结算结束后，若此【杀】未造成伤害，本回合你的手牌上限-1。
```js
twpiankuang: {
		audio: 2,
		trigger: {
			player: "useCardAfter",
			source: "damageBegin1",
		},
		filter(event, player) {
			if (event.name == "useCard") {
				return event.card.name == "sha" && player == _status.currentPhase && !player.hasHistory("sourceDamage", evt => evt.card == event.card);
			}
			return event.card?.name == "sha" && event.getParent().type == "card" && player.hasHistory("sourceDamage", evt => evt.card?.name == "sha");
		},
		forced: true,
		async content(event, trigger, player) {
			if (trigger.name == "useCard") {
				player.addTempSkill(event.name + "_effect");
				player.addMark(event.name + "_effect", 1, false);
			} else {
				trigger.num++;
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				markimage: "image/card/handcard.png",
				intro: { content: "手牌上限-#" },
				mod: {
					maxHandcard(player, num) {
						return num - player.countMark("twpiankuang_effect");
					},
				},
			},
		},
	}
```

## tw_zhugejun 名字:诸葛均 势力:qun

### twshouzhu 名字:受嘱
描述: `出牌阶段开始时，你的${get.poptip("rule_tongxin")}角色可交给你至多四张牌。若你以此法得到的牌数X不小于2，其摸两张牌，然后执行${get.poptip("rule_tongxin")}：观看牌堆顶X张牌，然后将其中任意张牌以任意顺序置于牌堆底，将其余的牌置入弃牌堆。`
```js
twshouzhu: {
		audio: 2,
		global: "beOfOneHeart",
		oneHeart: true,
		trigger: {
			player: "phaseUseBegin",
		},
		filter(event, player) {
			return player.getStorage("beOfOneHeartWith").some(target => {
				return target.isIn();
			});
		},
		logTarget(event, player) {
			return player.getStorage("beOfOneHeartWith").filter(target => {
				return target.isIn();
			});
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			const targets = player.getStorage("beOfOneHeartWith").filter(target => {
				return target.isIn();
			});
			let count = 0;
			for (const current of targets) {
				if (!current.isIn()) {
					continue;
				}
				const { cards } = await current
					.chooseToGive(`${get.translation(player)}对你发动了【受嘱】`, "作为其的同心角色，是否交给其至多四张牌？", player, "he", [1, 4], "allowChooseAll")
					.set("ai", card => {
						if (!get.event().goon) {
							return -get.value(card);
						}
						if (ui.selected.cards.length < 2) {
							return 4.5 + ui.selected.cards.length - get.value(card) + get.player().getUseValue(card) / 5;
						}
						return 0;
					})
					.set("goon", get.attitude(current, player) > 0)
					.forResult();
				if (cards && cards.length) {
					count += cards.length;
				}
			}
			if (count < 2) {
				return;
			}
			await game.asyncDraw(targets, 2);
			await game.delay();
			targets.unshift(player);
			for (const current of targets) {
				const cards = get.cards(count);
				await game.cardsGotoOrdering(cards);
				const next = current.chooseToMove("allowChooseAll");
				next.set("list", [["牌堆底", cards], ["弃牌堆"]]);
				next.set("prompt", "受嘱：点击排列牌置于牌堆底的顺序，或置入弃牌堆");
				next.set("processAI", list => {
					const cards = list[0][1],
						player = get.player();
					let bottom = [],
						discard = [];
					cards.sort((a, b) => get.value(b, player) - get.value(a, player));
					while (cards.length) {
						if (get.value(cards[0], player) <= 5) {
							break;
						}
						bottom.unshift(cards.shift());
					}
					discard = cards;
					return [bottom, discard];
				});
				const { moved } = await next.forResult();
				const bottom = moved[0];
				const discard = moved[1];
				if (bottom.length) {
					await game.cardsGotoPile(bottom);
				}
				current.popup(get.cnNumber(bottom.length) + "下");
				game.log(current, "将" + get.cnNumber(bottom.length) + "张牌置于牌堆底");
				if (discard.length) {
					await game.cardsDiscard(discard);
					game.log(current, "将", discard, "置入了弃牌堆");
				}
				await game.delayx();
			}
		},
	}
```

### twdaigui 名字:待归
描述: 出牌阶段结束时，若你手牌的颜色均相同，你可以选择至多Y名角色并亮出牌堆底等量的牌，然后这些角色依次选择并获得其中一张（Y为你的手牌数）。
```js
twdaigui: {
		audio: 2,
		trigger: { player: "phaseUseEnd" },
		filter(event, player) {
			if (!player.countCards("h")) {
				return false;
			}
			const color = get.color(player.getCards("h")[0]);
			return player.getCards("h").every(card => {
				return get.color(card) === color;
			});
		},
		async cost(event, trigger, player) {
			const maxLimit = player.countCards("h");
			event.result = await player
				.chooseTarget(get.prompt(event.skill), `选择至多${get.cnNumber(maxLimit)}名角色并亮出牌堆底等量的牌，令这些角色依次选择并获得其中一张。`, [1, maxLimit])
				.set("ai", target => {
					const player = get.player();
					return get.attitude(player, target) * (player === target && player.needsToDiscard(1) ? 0.4 : 1);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { targets } = event;
			const cards = get.bottomCards(targets.length);
			await game.cardsGotoOrdering(cards);
			const videoId = lib.status.videoId++;
			game.addVideo("cardDialog", null, ["待归", get.cardsInfo(cards), videoId]);
			game.broadcastAll(
				function (cards, videoId) {
					const dialog = ui.create.dialog("待归", cards, true);
					_status.dieClose.push(dialog);
					dialog.videoId = videoId;
				},
				cards,
				videoId
			);
			await game.delay();
			const chooseableCards = cards.slice();
			for (const current of targets) {
				if (!current.isIn() || !chooseableCards.length) {
					continue;
				}
				const result = await current
					.chooseButton(true)
					.set("dialog", videoId)
					.set("closeDialog", false)
					.set("dialogdisplay", true)
					.set("cardFilter", chooseableCards.slice())
					.set("filterButton", button => {
						return get.event().cardFilter.includes(button.link);
					})
					.set("ai", button => {
						return get.value(button.link, _status.event.player);
					})
					.forResult();
				if (!result?.links?.length) {
					continue;
				}
				const [card] = result.links;
				if (card) {
					current.gain(card, "gain2");
					chooseableCards.remove(card);
				}
				const capt = `${get.translation(current)}选择了${get.translation(card)}`;
				game.broadcastAll(
					function (card, id, name, capt) {
						const dialog = get.idDialog(id);
						if (dialog) {
							dialog.content.firstChild.innerHTML = capt;
							for (let i = 0; i < dialog.buttons.length; i++) {
								if (dialog.buttons[i].link == card) {
									game.createButtonCardsetion(name, dialog.buttons[i]);
									break;
								}
							}
							game.addVideo("dialogCapt", null, [dialog.videoId, dialog.content.firstChild.innerHTML]);
						}
					},
					card,
					videoId,
					current.getName(true),
					capt
				);
			}
			if (chooseableCards.length) {
				await game.cardsDiscard(chooseableCards);
			}
			game.broadcastAll(function (id) {
				const dialog = get.idDialog(id);
				if (dialog) {
					dialog.close();
					_status.dieClose.remove(dialog);
				}
			}, videoId);
			game.addVideo("cardDialog", null, videoId);
		},
	}
```

### twcairu 名字:才濡
描述: 每回合每种牌名限两次。你可以将两张颜色不同的牌当【火攻】、【铁索连环】或【无中生有】使用。
```js
twcairu: {
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		filter(event, player) {
			return ["huogong", "tiesuo", "wuzhong"].some(name => {
				if (player.getStorage("twcairu_used").filter(namex => namex == name).length > 1) {
					return false;
				}
				return event.filterCard({ name }, player, event);
			});
		},
		chooseButton: {
			dialog(event, player) {
				const list = ["huogong", "tiesuo", "wuzhong"]
					.filter(name => {
						if (player.getStorage("twcairu_used").filter(namex => namex == name).length > 1) {
							return false;
						}
						return event.filterCard({ name }, player, event);
					})
					.map(name => [get.translation(get.type(name)), "", name]);
				return ui.create.dialog("才濡", [list, "vcard"]);
			},
			check(button) {
				return get.player().getUseValue({ name: button.link[2] });
			},
			backup(links, player) {
				return {
					audio: "twcairu",
					filterCard(card, player) {
						const color = get.color(card, player);
						return !ui.selected.cards.length || get.color(ui.selected.cards[0]) != color;
					},
					selectCard: 2,
					complexCard: true,
					popname: true,
					check(card) {
						return 5 - get.value(card);
					},
					position: "hes",
					viewAs: { name: links[0][2] },
					log: false,
					precontent() {
						player.logSkill("twcairu");
						if (!player.storage.twcairu_used) {
							player.storage.twcairu_used = [];
							player.when({ global: "phaseAfter" }).step(async () => {
								delete player.storage.twcairu_used;
							});
						}
						player.storage.twcairu_used.push(event.result.card.name);
					},
				};
			},
			prompt(links, player) {
				return "将两张颜色不同的牌当【" + get.translation(links[0][2]) + "】使用";
			},
		},
		subSkill: { backup: {} },
		ai: {
			order(item, player) {
				if (!player || _status.event.type != "phase") {
					return 0.001;
				}
				let max = 0,
					names = ["huogong", "tiesuo", "wuzhong"].filter(name => {
						if (player.getStorage("twcairu_used").includes(name)) {
							return false;
						}
						return player.hasValueTarget(name, true, true);
					});
				if (!names.length) {
					return 0;
				}
				names = names.map(namex => ({ name: namex }));
				names.forEach(card => {
					if (player.getUseValue(card) > 0) {
						let temp = get.order(card);
						if (temp > max) {
							max = temp;
						}
					}
				});
				if (max > 0) {
					max += 0.3;
				}
				return max;
			},
			result: { player: 1 },
		},
	}
```

## simafu 名字:TW司马孚 势力:wei

### xunde 名字:勋德
描述: 一名角色受到伤害后，若你至其的距离不大于1，则你可判定。若判定结果：大于5，你令该角色获得判定牌；小于7，你令伤害来源弃置一张手牌。
```js
xunde: {
		audio: 2,
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return event.player.isIn() && get.distance(player, event.player) <= 1;
		},
		logTarget: "player",
		check(event, player) {
			return get.attitude(player, event.player) > 0 && (!event.source || get.attitude(player, event.source) < 0);
		},
		content() {
			"step 0";
			player.judge().set("callback", function () {
				if (event.judgeResult.number > 5) {
					var player = event.getParent(2)._trigger.player;
					if (get.position(card, true) == "o") {
						player.gain(card, "gain2");
					}
				}
			});
			"step 1";
			if (result.number < 7) {
				var source = trigger.source;
				if (source && source.isIn() && source.countCards("h") > 0) {
					player.line(source);
					source.chooseToDiscard("h", true);
				}
			}
		},
	}
```

### chenjie 名字:臣节
描述: 一名角色的判定牌生效前，你可打出一张花色相同的牌。系统将你打出的牌作为新判定牌，将原判定牌置入弃牌堆。然后你摸两张牌。
```js
chenjie: {
		audio: 2,
		trigger: { global: "judge" },
		filter(event, player) {
			var suit = get.suit(event.player.judging[0], event.player);
			return (
				player.countCards("hes", function (card) {
					if (_status.connectMode && get.position(card) != "e") {
						return true;
					}
					return get.suit(card) == suit;
				}) > 0
			);
		},
		popup: false,
		preHidden: true,
		async cost(event, trigger, player) {
			const suit = get.suit(trigger.player.judging[0], trigger.player);
			event.result = await player
				.chooseCard(`${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt(event.skill)}`, "hes", card => {
					const { player, suit } = get.event();
					if (get.suit(card) != suit) {
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
						return 0.1;
					}
					if (attitude > 0) {
						return result + 0.01;
					} else {
						return 0.01 - result;
					}
				})
				.set("judging", trigger.player.judging[0])
				.set("suit", suit)
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
				await player.draw(2);
			}
		},
		ai: {
			rejudge: true,
			tag: { rejudge: 0.1 },
		},
	}
```

## tw_yanliang 名字:颜良 势力:qun

### twduwang 名字:独往
描述: `使命技。①出牌阶段开始时，你可以选择至多三名有牌的其他角色，摸X张牌（X为选择角色数+1），然后这些角色依次将一张牌当【决斗】对你使用。②当你处于濒死状态时，其他角色不能对你使用【桃】。③使命：使用【决斗】或成为【决斗】目标的次数之和不小于4（若游戏总人数小于4则改为3）。④成功：准备阶段，若你于你的上回合完成了〖独往③〗的使命，则你重置〖独往〗并将〖独往〗修改至只保留〖独往①〗的效果，选择一项：⒈获得〖狭勇〗；⒉重置〖延势〗并令其获得${get.poptip("rule_lizhan")}效果（重置〖延势〗）。⑤失败：当你死亡时，使命失败。`
```js
twduwang: {
		audio: 2,
		dutySkill: true,
		derivation: ["twxiayong", "twylyanshix"],
		global: "twduwang_global",
		group: ["twduwang_effect", "twduwang_achieve", "twduwang_fail"],
		onremove: ["twduwang", "twduwang_fail"],
		subSkill: {
			effect: {
				audio: "twduwang1.mp3",
				trigger: { player: "phaseUseBegin" },
				filter(event, player) {
					return game.hasPlayer(target => {
						return (
							target != player &&
							target.hasCard(card => {
								if (get.position(card) == "h") {
									return true;
								}
								return target.canUse(get.autoViewAs({ name: "juedou" }, [card]), player, false);
							}, "he")
						);
					});
				},
				async cost(event, trigger, player) {
					let result = await player
						.chooseTarget([1, 3], (_, player, target) => {
							return (
								target != player &&
								target.hasCard(card => {
									if (get.position(card) == "h") {
										return true;
									}
									return target.canUse(get.autoViewAs({ name: "juedou" }, [card]), player, false);
								}, "he")
							);
						})
						.set("prompt", get.prompt(event.skill))
						.set("ai", target => {
							const player = get.event().player;
							const num = game.countPlayer(current => {
								return (
									current != player &&
									current.hasCard(card => {
										if (get.position(card) == "h") {
											return true;
										}
										return current.canUse(get.autoViewAs({ name: "juedou" }, [card]), player, false);
									}, "he") &&
									get.effect(current, { name: "guohe_copy2" }, current, player) + get.effect(player, { name: "juedou" }, current, player) > 0
								);
							});
							return (Math.min(num, 3) + 1) * get.effect(player, { name: "draw" }, player, player) + get.effect(target, { name: "guohe_copy2" }, target, player) + get.effect(player, { name: "juedou" }, target, player);
						})
						.set("prompt2", "选择至多三名其他角色并摸选择角色数+1的牌，然后这些角色须将一张牌当作【决斗】对你使用")
						.forResult();
					if (result.bool) {
						result.targets.sortBySeat();
					}
					event.result = result;
				},
				async content(event, trigger, player) {
					const targets = event.targets;
					await player.draw(targets.length + 1);
					await game.delayx();
					for (const target of targets) {
						if (
							!target.hasCard(card => {
								return target.canUse(get.autoViewAs({ name: "juedou" }, [card]), player, false);
							}, "he")
						) {
							continue;
						}
						await target
							.chooseToUse()
							.set("forced", true)
							.set("openskilldialog", "独往：将一张牌当作【决斗】对" + get.translation(player) + "使用")
							.set("norestore", true)
							.set("_backupevent", "twduwang_backup")
							.set("targetRequired", true)
							.set("complexTarget", true)
							.set("complexSelect", true)
							.set("custom", {
								add: {},
								replace: { window() {} },
							})
							.backup("twduwang_backup")
							.set("filterTarget", function (card, player, target) {
								if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
									return false;
								}
								return lib.filter.targetEnabled.apply(this, arguments);
							})
							.set("sourcex", player)
							.set("addCount", false);
						await game.delayx();
					}
				},
			},
			backup: {
				viewAs: { name: "juedou" },
				position: "he",
				filterCard(card, player) {
					const cardx = get.autoViewAs({ name: "juedou" }, [card]);
					return lib.filter.targetEnabledx(cardx, player, get.event().sourcex);
				},
				check(card) {
					if (get.name(card) == "sha") {
						return 5 - get.value(card);
					}
					return 8 - get.value(card);
				},
				log: false,
			},
			achieve: {
				audio: "twduwang2.mp3",
				trigger: { player: "phaseZhunbeiBegin" },
				filter(event, player) {
					if (player.storage.twduwang_fail) {
						return false;
					}
					const history = player.actionHistory;
					if (history.length < 2) {
						return false;
					}
					for (let i = history.length - 2; i >= 0; i--) {
						if (history[i].isMe && !history[i].isSkipped) {
							let num = history[i].useCard.filter(evt => {
									return evt.card.name == "juedou";
								}).length,
								targets = game.players.slice().concat(game.dead.slice());
							for (const target of targets) {
								const historyx = target.actionHistory[target.actionHistory.length - (player.actionHistory.length - i)];
								if (!historyx) {
									continue;
								}
								num += historyx.useCard.filter(evt => {
									return evt.card.name == "juedou" && evt.targets && evt.targets.includes(player);
								}).length;
							}
							return num >= (targets.length < 4 ? 3 : 4);
						}
					}
					return false;
				},
				forced: true,
				skillAnimation: true,
				animationColor: "metal",
				async content(event, trigger, player) {
					player.awakenSkill("twduwang");
					game.log(player, "完成使命");
					if (player.awakenedSkills.includes("twduwang")) {
						player.restoreSkill("twduwang");
						game.log(player, "重置了技能", "#g【独往】");
					}
					if (!player.storage.twduwang_fail) {
						player.storage.twduwang_fail = true;
						game.log(player, "修改了技能", "#g【独往】");
					}
					let result,
						bool1 = player.hasSkill("twxiayong", null, false, false),
						bool2 = !player.awakenedSkills.includes("twylyanshi") && player.storage.twduwang_ylyanshi;
					if (bool1 && bool2) {
						result = { index: 2 };
					} else if (bool1) {
						result = { index: 1 };
					} else if (bool2) {
						result = { index: 0 };
					} else {
						result = await player
							.chooseControl()
							.set("choiceList", ["获得〖狭勇〗", "重置〖延势〗并为其添加历战效果"])
							.set("prompt", "独往：请选择一项")
							.set("ai", () => {
								const player = get.event().player,
									num = game.countPlayer(current => {
										return (
											current != player &&
											current.hasCard(card => {
												if (get.position(card) == "h") {
													return true;
												}
												return current.canUse(get.autoViewAs({ name: "juedou" }, [card]), player, false);
											}, "he") &&
											get.effect(current, { name: "guohe_copy2" }, current, player) / 2.5 + get.effect(player, { name: "juedou" }, current, player) > 0
										);
									});
								return num >= 2 ? 0 : 1;
							})
							.forResult();
					}
					if (result.index == 0) {
						await player.addSkills("twxiayong");
					}
					if (result.index == 1) {
						player.popup("twylyanshi");
						if (player.awakenedSkills.includes("twylyanshi")) {
							player.restoreSkill("twylyanshi");
							game.log(player, "重置了技能", "#g【延势】");
						}
						if (!player.storage.twduwang_ylyanshi) {
							player.storage.twduwang_ylyanshi = true;
							game.log(player, "修改了技能", "#g【延势】");
						}
					}
				},
			},
			fail: {
				audio: "twduwang3.mp3",
				trigger: { player: "die" },
				forceDie: true,
				filter(event, player) {
					return !player.storage.twduwang_fail;
				},
				forced: true,
				content() {
					player.awakenSkill("twduwang");
					game.log(player, "使命失败");
				},
			},
			global: {
				mod: {
					cardSavable(card, player, target) {
						if (card.name == "tao" && target != player && target.hasSkill("twduwang") && !target.storage.twduwang_fail) {
							return false;
						}
					},
				},
				audio: "twduwang3.mp3",
				trigger: { player: "dying" },
				filter(event, player) {
					return player.hasSkill("twduwang") && !player.storage.twduwang_fail;
				},
				forced: true,
				content() {},
			},
		},
	}
```

### twylyanshi 名字:延势
描述: 限定技。你可以将一张【杀】当作【决斗】、【兵临城下】或任意智囊牌使用或打出。
```js
twylyanshi: {
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		filter(event, player) {
			return ["juedou", "binglinchengxiax"].concat(get.zhinangs()).some(name => {
				const info = { name: name };
				return (
					get.info(info) &&
					player.hasCard(card => {
						return get.name(card) == "sha" && event.filterCard({ name: name, cards: [card] }, player, event);
					}, "hs")
				);
			});
		},
		limited: true,
		skillAnimation: true,
		animationColor: "fire",
		onremove: ["twylyanshi", "twduwang_ylyanshi"],
		chooseButton: {
			dialog(event, player) {
				const list = ["juedou", "binglinchengxiax"]
					.concat(get.zhinangs())
					.filter(name => {
						const info = { name: name };
						return (
							get.info(info) &&
							player.hasCard(card => {
								return get.name(card) == "sha" && event.filterCard({ name: name, cards: [card] }, player, event);
							}, "hs")
						);
					})
					.map(name => [get.translation(get.type(name)), "", name]);
				return ui.create.dialog("延势", [list, "vcard"]);
			},
			check(button) {
				return get.event().player.getUseValue({ name: button.link[2] });
			},
			backup(links, player) {
				return {
					audio: "twylyanshi",
					filterCard(card, player) {
						return get.name(card) == "sha";
					},
					popname: true,
					check(card) {
						return 5 - get.value(card);
					},
					position: "hs",
					viewAs: { name: links[0][2] },
					log: false,
					precontent() {
						player.logSkill("twylyanshi");
						player.awakenSkill("twylyanshi");
						if (player.storage.twduwang_ylyanshi) {
							player.when({ global: "phaseEnd" }).step(async () => {
								if (player.awakenedSkills.includes("twylyanshi")) {
									player.popup("历战");
									player.restoreSkill("twylyanshi");
									game.log(player, "触发了", "#g【延势】", "的", "#y历战", "效果");
								}
							});
						}
					},
				};
			},
			prompt(links, player) {
				return "将一张【杀】当作" + "【" + get.translation(links[0][2]) + "】使用";
			},
		},
		subSkill: { backup: {} },
		hiddenCard(player, name) {
			if (player.awakenedSkills.includes("twylyanshi") || !player.countCards("hs", card => _status.connectMode || get.name(card) == "sha")) {
				return false;
			}
			return ["juedou", "binglinchengxiax"].concat(get.zhinangs()).includes(name);
		},
		ai: {
			order(item, player) {
				if (!player || _status.event.type != "phase") {
					return 0.001;
				}
				let max = 0,
					names = ["juedou", "binglinchengxiax"].concat(get.zhinangs()).filter(name => {
						const info = { name: name };
						return (
							get.info(info) &&
							player.hasCard(card => {
								return get.name(card) == "sha" && player.hasValueTarget(get.autoViewAs(info, [card]), true, true);
							}, "hs")
						);
					});
				if (!names.length) {
					return 0;
				}
				names = names.map(namex => {
					return { name: namex };
				});
				names.forEach(card => {
					if (player.getUseValue(card) > 0) {
						let temp = get.order(card);
						if (temp > max) {
							max = temp;
						}
					}
				});
				if (max > 0) {
					max += 0.3;
				}
				return max;
			},
			result: { player: 1 },
		},
	}
```

## tw_wenchou 名字:文丑 势力:qun

### twjuexing 名字:绝行
描述: `出牌阶段限一次。你可以视为对一名其他角色使用一张【决斗】。此牌对一名角色生效时，你与其将所有手牌扣置于武将牌上，然后各摸等同于当前体力值的牌。此牌结算结束后，你与所有目标角色弃置本次以此法摸的牌，然后获得扣置于武将牌上的牌。${get.poptip("rule_lizhan")}：当你因〖绝行〗摸牌时，摸牌数+1。`
```js
twjuexing: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(target => get.info("twjuexing").filterTarget(null, player, target));
		},
		filterTarget(_, player, target) {
			const card = new lib.element.VCard({ name: "juedou", isCard: true });
			return target != player && player.canUse(card, target);
		},
		usable: 1,
		onremove: "twjuexing_lizhan",
		async content(event, trigger, player) {
			player.when({ global: "phaseEnd" }).step(async () => {
				player.popup("历战");
				player.addSkill("twjuexing_lizhan");
				player.addMark("twjuexing_lizhan", 1, false);
				game.log(player, "触发了", "#g【绝行】", "的", "#y历战", "效果");
			});
			const target = event.target;
			const card = new lib.element.VCard({ name: "juedou", isCard: true });
			player.addTempSkill("twjuexing_effect");
			player
				.when({ global: "useCardAfter" })
				.filter(evtx => evtx.getParent() == event)
				.step(async (event, trigger, player) => {
					let list = [];
					const targets = [player].concat(trigger.targets);
					for (const i of targets) {
						if (i.isIn() && i.hasCard(card => card.hasGaintag("twjuexing"), "h")) {
							list.push([i, i.getCards("h", card => card.hasGaintag("twjuexing"))]);
						}
					}
					if (list.length) {
						await game.loseAsync({ lose_list: list }).setContent("discardMultiple");
					}

					let listx = [];
					for (const i of targets) {
						if (i.isIn() && i.getExpansions("twjuexing_buff").length) {
							listx.push([i, i.getExpansions("twjuexing_buff")]);
						}
					}
					if (listx.length) {
						await game.loseAsync({ gain_list: listx, animate: "draw" }).setContent("gaincardMultiple");
					}

					targets.forEach(current => {
						current.removeSkill("twjuexing_buff");
					});
					await game.delay();
				});
			await player.useCard(card, target, false);
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					return get.sgn(get.attitude(player, target)) * get.effect(target, { name: "juedou" }, player, player) * ((player.getHp() + 1) / (target.getHp() + 1));
				},
			},
		},
		subSkill: {
			effect: {
				trigger: { global: "useCardToBegin" },
				forced: true,
				popup: false,
				charlotte: true,
				filter(event, player) {
					return event.getParent(2).name === "twjuexing";
				},
				async content(event, trigger, player) {
					const target = trigger.target;
					player.addSkill("twjuexing_buff");
					target.addSkill("twjuexing_buff");
					let list = [];
					for (const i of [player, target]) {
						if (i.isIn() && i.countCards("h")) {
							list.push([i, i.getCards("h")]);
						}
					}
					if (list.length) {
						await game
							.loseAsync({
								lose_list: list,
								log: true,
								animate: "giveAuto",
								gaintag: ["twjuexing_buff"],
							})
							.setContent("addToExpansionMultiple");
					}
					if (player.getHp() > 0) {
						await player.draw(player.getHp(), target.getHp() > 0 ? "nodelay" : "").set("gaintag", ["twjuexing"]);
					}
					if (target.getHp() > 0) {
						await target.draw(target.getHp()).set("gaintag", ["twjuexing"]);
					}
					await game.delay();
				},
			},
			lizhan: {
				charlotte: true,
				onremove: true,
				marktext: "战",
				intro: { content: "因【绝行】摸牌时，摸牌数+#" },
				trigger: { player: "drawBegin" },
				filter(event, player) {
					if (!player.hasMark("twjuexing_lizhan")) {
						return false;
					}
					return (event.gaintag || []).includes("twjuexing");
				},
				forced: true,
				popup: false,
				content() {
					player.popup("历战");
					game.log(player, "触发了", "#g【绝行】", "的", "#y历战", "效果");
					trigger.num += player.countMark("twjuexing_lizhan");
				},
			},
			buff: {
				charlotte: true,
				onremove(player, skill) {
					const cards = player.getExpansions(skill);
					if (cards.length) {
						player.gain(cards, "gain2");
					}
				},
				intro: {
					markcount: "expansion",
					mark(dialog, _, player) {
						var cards = player.getExpansions("twjuexing_buff");
						if (player.isUnderControl(true)) {
							dialog.addAuto(cards);
						} else {
							return "共有" + get.cnNumber(cards.length) + "张牌";
						}
					},
				},
			},
		},
	}
```

### twxiayong 名字:狭勇
描述: 锁定技。当你使用的【决斗】或目标角色包括你的【决斗】造成伤害时，若受伤角色为你，则你随机弃置一张手牌；否则你令此伤害+1。
```js
twxiayong: {
		audio: 2,
		audioname: ["tw_yanliang"],
		trigger: { global: "damageBegin1" },
		filter(event, player) {
			if (event.getParent().type != "card" || event.card.name != "juedou" || !event.player.isIn()) {
				return false;
			}
			const evt = event.getParent();
			if (evt && evt.targets && (event.player != player || player.countCards("h") > 0)) {
				return evt.player === player || evt.targets.includes(player);
			}
			return false;
		},
		logTarget: "player",
		logAudio(event, player) {
			return "twxiayong" + (lib.skill.twxiayong.audioname.includes(player.name) ? "_" + player.name : "") + (event.player === player ? 1 : 2) + ".mp3";
		},
		locked: true,
		forced: true,
		async content(event, trigger, player) {
			if (trigger.player === player) {
				const cards = player.getCards("h", card => {
					return lib.filter.cardDiscardable(card, player, "twxiayong");
				});
				if (cards.length > 0) {
					player.discard(cards.randomGet());
				}
			} else {
				trigger.num++;
			}
		},
	}
```

## tw_yuantan 名字:袁谭 势力:qun

### twqiaosi 名字:峭嗣
描述: 结束阶段，你可以获得由其他角色区域直接置入或经由处理区置入弃牌堆的所有牌，然后若你以此法获得的牌数小于你的体力值，则你失去1点体力。
```js
twqiaosi: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return get.info("twqiaosi").getCards(player).length;
		},
		check(event, player) {
			const cards = get.info("twqiaosi").getCards(player);
			if (cards.reduce((sum, card) => sum + get.value(card), 0)) {
				return false;
			}
			if (cards.length >= player.getHp() || cards.some(card => get.name(card, player) == "tao" || get.name(card, player) == "jiu")) {
				return true;
			}
			return player.getHp() > 2 && cards.length > 1;
		},
		prompt2(event, player) {
			const cards = get.info("twqiaosi").getCards(player);
			let str = "获得" + get.translation(cards);
			if (cards.length < player.getHp()) {
				str += "，然后你失去1点体力";
			}
			return str;
		},
		async content(event, trigger, player) {
			const cards = get.info("twqiaosi").getCards(player);
			await player.gain(cards, "gain2");
			if (cards.length < player.getHp()) {
				await player.loseHp();
			}
		},
		getCards(player) {
			let cards = [],
				targets = game.players.slice().concat(game.dead.slice());
			for (const target of targets) {
				if (target == player) {
					continue;
				}
				const history = target.getHistory("lose", evt => evt.position == ui.discardPile);
				if (history.length) {
					for (const evt of history) {
						cards.addArray(evt.cards2.filterInD("d"));
					}
				}
			}
			const historyx = game.getGlobalHistory("cardMove", evt => {
				if (evt.name != "cardsDiscard") {
					return false;
				}
				const evtx = evt.getParent();
				if (evtx.name != "orderingDiscard") {
					return false;
				}
				const evt2 = evtx.relatedEvent || evtx.getParent();
				const current = evt2.player;
				if (evt2.name == "phaseJudge" || current == player) {
					return false;
				}
				return current.hasHistory("lose", evtx3 => {
					const evtx4 = evtx3.relatedEvent || evtx3.getParent();
					if (evt2 != evtx4) {
						return false;
					}
					return evtx3.getl(current).cards2.length > 0;
				});
			});
			if (historyx.length) {
				for (const evtx of historyx) {
					cards.addArray(evtx.cards.filterInD("d"));
				}
			}
			return cards;
		},
	}
```

### twbaizu 名字:败族
描述: `锁定技。结束阶段，若你已受伤且你有手牌，则你须选择X名有手牌的其他角色（X为你的体力值），你与这些角色同时弃置一张手牌，然后你对与你弃置牌类别相同的所有其他角色各造成1点伤害。${get.poptip("rule_lizhan")}：〖败族〗目标选择数+1。`
```js
twbaizu: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return (
				player.isDamaged() &&
				player.countCards("h") &&
				game.hasPlayer(target => {
					return target != player && target.countCards("h");
				}) &&
				player.getHp() + player.countMark("twbaizu_lizhan")
			);
		},
		locked: true,
		async cost(event, trigger, player) {
			const sum = player.getHp() + player.countMark("twbaizu_lizhan"),
				filterTarget = (_, player, target) => {
					return target != player && target.countCards("h");
				};
			let targets = game.filterPlayer(target => filterTarget(null, player, target));
			if (targets.length > sum) {
				targets = (
					await player
						.chooseTarget("请选择【败族】的目标", "令你和这些角色同时弃置一张手牌，然后你对与你弃置牌类别相同的其他角色各造成1点伤害", filterTarget, sum, true)
						.set("ai", target => {
							const player = get.event().player;
							return get.effect(target, { name: "guohe_copy2" }, target, player) + get.damageEffect(target, player, player);
						})
						.forResult()
				).targets;
			}
			event.result = { bool: true, targets };
		},
		async content(event, trigger, player) {
			const targets = event.targets.slice().sortBySeat();
			player.line(targets);
			let list = [player].concat(targets).filter(target => target.countDiscardableCards(target, "h"));
			if (list.length) {
				let discards = [];
				const result = await player
					.chooseCardOL(
						list,
						"败族：请弃置一张手牌",
						(card, player) => {
							return lib.filter.cardDiscardable(card, player);
						},
						true
					)
					.set("ai", get.unuseful)
					.forResult();
				if (result) {
					for (let i = 0; i < result.length; i++) {
						discards.push([list[i], result[i].cards]);
					}
					await game.loseAsync({ lose_list: discards }).setContent("discardMultiple");
					list = list.filter(i => get.type2(result[0].cards[0]) == get.type2(result[list.indexOf(i)].cards[0]));
					if (list.length) {
						for (const i of list) {
							if (i === player) {
								continue;
							}
							player.line(i);
							await i.damage();
						}
					}
				}
			}
			player.when({ global: "phaseEnd" }).step(async () => {
				player.popup("历战");
				player.addMark("twbaizu_lizhan", 1, false);
				game.log(player, "触发了", "#g【败族】", "的", "#y历战", "效果");
			});
		},
		subSkill: {
			lizhan: {
				charlotte: true,
				onremove: true,
				marktext: "战",
				intro: { content: "【败族】目标选择数+#" },
			},
		},
	}
```

## xia_yuzhenzi 名字:玉真子 势力:qun

### twhuajing 名字:化境
描述: ①游戏开始时，你获得6个效果各不相同的无效果“武”标记。②一名拥有“武”标记的角色的攻击范围+X（X为其拥有的“武”标记数）。③出牌阶段限一次，你可以展示至多四张手牌，然后根据这些牌含有的花色数于本回合获得等量你拥有的“武”标记的效果。④拥有“武”标记效果的角色的武器牌失效（武器牌不提供攻击范围且武器技能失效）。
```js
twhuajing: {
		audio: 2,
		getSkills(player) {
			return player
				.getCards("e", card => get.subtype(card) == "equip1")
				.reduce((list, card) => {
					const info = get.info(card);
					if (info && info.skills) {
						return list.addArray(info.skills);
					}
					return list;
				}, []);
		},
		trigger: { global: "phaseBefore", player: "enterGame" },
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			const skills = lib.skill.twhuajing.derivation;
			for (const eff of skills) {
				player.addMark(eff, 1);
				player.unmarkSkill(eff);
			}
			player.markSkill("twhuajing");
		},
		global: "twhuajing_global",
		group: "twhuajing_use",
		derivation: ["twhuajing_jian", "twhuajing_dao", "twhuajing_fu", "twhuajing_qiang", "twhuajing_ji", "twhuajing_gong"],
		marktext: "武",
		intro: {
			markcount(storage, player) {
				return lib.skill.twhuajing.derivation.filter(skill => player.hasMark(skill)).length;
			},
			content(storage, player) {
				const skills = lib.skill.twhuajing.derivation.filter(skill => player.hasMark(skill));
				if (!skills.length) {
					return "功力已消耗殆尽";
				}
				let str = "当前武功：";
				for (const eff of skills) {
					str += "<br><li>";
					str += lib.translate[eff];
					str += "：";
					str += lib.translate[eff + "_info"];
				}
				return str;
			},
		},
		subSkill: {
			global: {
				mod: {
					attackRange(player, num) {
						const skills = lib.skill.twhuajing.derivation.filter(skill => player.hasMark(skill) || player.hasSkill(skill));
						if (skills.length) {
							return num + skills.length * game.countPlayer(target => target.hasSkill("twhuajing"));
						}
					},
				},
			},
			use: {
				audio: "twhuajing",
				enable: "phaseUse",
				filter(event, player) {
					return lib.skill.twhuajing.derivation.some(skill => player.hasMark(skill));
				},
				filterCard: true,
				selectCard: [1, 4],
				position: "h",
				complexCard: true,
				discard: false,
				lose: false,
				delay: false,
				check(card) {
					const player = get.event().player,
						skills = lib.skill.twhuajing.derivation.filter(skill => player.hasMark(skill));
					if (ui.selected.cards.some(cardx => get.suit(cardx, player) == get.suit(card, player))) {
						return 0;
					}
					return skills.length - ui.selected.cards.length;
				},
				usable: 1,
				prompt: "展示至多四张手牌，然后根据这些牌含有的花色数于本回合获得等量你拥有的“武”标记的效果",
				async content(event, trigger, player) {
					await player.showCards(event.cards, get.translation(player) + "发动了【化境】");
					const skills = lib.skill.twhuajing.derivation.filter(skill => player.hasMark(skill));
					const gainSkills = skills.randomGets(Math.min(skills.length, event.cards.reduce((list, cardx) => list.add(get.suit(cardx, player)), []).length));
					for (const eff of gainSkills) {
						player.popup(eff);
					}
					player.addTempSkill(gainSkills);
					player.addTempSkill("twhuajing_blocker");
					player.getHistory("custom").push({ twhuajing_skills: gainSkills });
				},
				ai: {
					order: 12,
					result: {
						player(player) {
							return player.countCards("hs", card => {
								return get.name(card) == "sha" && player.hasValueTarget(card, false, true);
							});
						},
					},
				},
			},
			jian: {
				charlotte: true,
				mark: true,
				marktext: "剑",
				intro: {
					name: "化境·剑",
					name2: "剑",
					markcount: () => 0,
					content: () => lib.translate.twhuajing_jian_info,
				},
				nopop: true,
				trigger: { player: "useCardToPlayered" },
				filter(event, player) {
					return event.card.name == "sha" && event.target.countCards("he");
				},
				forced: true,
				logTarget: "target",
				async content(event, trigger, player) {
					const target = trigger.target;
					target.randomDiscard(2, player);
				},
			},
			dao: {
				charlotte: true,
				mark: true,
				marktext: "刀",
				intro: {
					name: "化境·刀",
					name2: "刀",
					markcount: () => 0,
					content: () => lib.translate.twhuajing_dao_info,
				},
				nopop: true,
				inherit: "guding_skill",
				equipSkill: false,
			},
			fu: {
				charlotte: true,
				mark: true,
				marktext: "斧",
				intro: {
					name: "化境·斧",
					name2: "斧",
					markcount: () => 0,
					content: () => lib.translate.twhuajing_fu_info,
				},
				nopop: true,
				trigger: { player: "shaMiss" },
				forced: true,
				logTarget: "target",
				async content(event, trigger, player) {
					trigger.target.damage();
				},
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						if (!arg || !arg.card || arg.card.name != "sha" || !arg.baseDamage || arg.baseDamage <= 1) {
							return false;
						}
						return true;
					},
				},
			},
			qiang: {
				charlotte: true,
				mark: true,
				marktext: "枪",
				intro: {
					name: "化境·枪",
					name2: "枪",
					markcount: () => 0,
					content: () => lib.translate.twhuajing_qiang_info,
				},
				nopop: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return event.card.name == "sha" && get.color(event.card) == "black";
				},
				forced: true,
				async content(event, trigger, player) {
					const card = get.cardPile(card => card.name == "shan");
					if (card) {
						player.gain(card, "gain2");
					}
				},
			},
			ji: {
				charlotte: true,
				mark: true,
				marktext: "戟",
				intro: {
					name: "化境·戟",
					name2: "戟",
					markcount: () => 0,
					content: () => lib.translate.twhuajing_ji_info,
				},
				nopop: true,
				trigger: { source: "damageBegin3" },
				filter(event, player) {
					return event.card && event.card.name == "sha";
				},
				forced: true,
				async content(event, trigger, player) {
					player.draw(trigger.num);
				},
			},
			gong: {
				charlotte: true,
				mark: true,
				marktext: "弓",
				intro: {
					name: "化境·弓",
					name2: "弓",
					markcount: () => 0,
					content: () => lib.translate.twhuajing_gong_info,
				},
				nopop: true,
				trigger: { source: "damageSource" },
				filter(event, player) {
					return event.card && event.card.name == "sha" && event.player.countDiscardableCards(player, "e");
				},
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					trigger.player.randomDiscard("e", player);
				},
			},
			blocker: {
				charlotte: true,
				init(player, skill) {
					player.disableSkill(skill, lib.skill.twhuajing.getSkills(player));
				},
				onremove(player, skill) {
					player.enableSkill(skill);
				},
				mod: {
					attackRange(player, num) {
						return num - player.getEquipRange();
					},
				},
				trigger: {
					player: "loseAfter",
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter", "phaseBefore"],
				},
				filter(event, player) {
					if (event.name == "phase") {
						return true;
					}
					if (event.name == "equip" && event.player == player && get.subtype(event.card) == "equip1") {
						return true;
					}
					const evt = event.getl(player);
					return evt && evt.player == player && evt.es && evt.es.some(card => get.subtype(card) == "equip1");
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					player.enableSkill("twhuajing_blocker");
					player.disableSkill("twhuajing_blocker", lib.skill.twhuajing.getSkills(player));
				},
				ai: { unequip_equip1: true },
			},
		},
	}
```

### twtianshou 名字:天授
描述: 锁定技，回合结束时，若你本回合使用【杀】造成过伤害，且你拥有本回合获得过效果的“武”标记，则你须将其中一个“武”标记交给一名其他角色并令其获得此标记的效果直到其回合结束，然后你摸两张牌。
```js
twtianshou: {
		audio: 2,
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			return (
				player.getHistory("sourceDamage", evt => {
					return evt.card && evt.card.name == "sha";
				}).length &&
				player
					.getHistory("custom", evt => {
						return evt.twhuajing_skills;
					})
					.reduce((list, evt) => list.addArray(evt.twhuajing_skills), [])
					.some(skill => player.hasMark(skill))
			);
		},
		forced: true,
		async content(event, trigger, player) {
			const { bool, targets } = await player
				.chooseTarget(lib.filter.notMe, true)
				.set("prompt", "天授：令一名其他角色获得1枚“武”并获得此标记的效果")
				.set("ai", target => {
					const player = get.event().player,
						att = get.attitude(player, target);
					const card = new lib.element.VCard({ name: "sha", isCard: true });
					if (att > 0) {
						return (
							game.countPlayer(aim => {
								return target.canUse(card, target) && get.effect(aim, card, target, player) > 0 && get.effect(aim, card, target, target) > 0;
							}) + 10
						);
					}
					if (att == 0) {
						return 1.5 + Math.random();
					}
					return 0.1 + Math.random();
				})
				.forResult();
			if (bool) {
				const target = targets[0];
				const skills = player
					.getHistory("custom", evt => {
						return evt.twhuajing_skills;
					})
					.reduce((list, evt) => list.addArray(evt.twhuajing_skills), [])
					.filter(skill => player.hasMark(skill));
				let choiceList = skills.map(i => {
					return '<div class="skill">【' + get.translation(lib.translate[i + "_ab"] || get.translation(i).slice(0, 2)) + "】</div>" + "<div>" + get.skillInfoTranslation(i, player, false) + "</div>";
				});
				const { control } = await player
					.chooseControl(skills)
					.set("prompt", "选择令" + get.translation(target) + "获得的“武”")
					.set("choiceList", choiceList)
					.set("displayIndex", false)
					.set("ai", () => get.event().controls.randomGet())
					.forResult();
				if (control) {
					player.removeMark(control, 1);
					player.markSkill("twhuajing");
					player.popup(control, "metal");
					target.addTempSkill(control, { player: "phaseAfter" });
					target.addTempSkill("twhuajing_blocker", { player: "phaseAfter" });
					target.getHistory("custom").push({ twhuajing_skills: [control] });
					await player.draw(2);
				}
			}
		},
		ai: { combo: "twhuajing" },
	}
```

## xia_shie 名字:史阿 势力:wei

### twdengjian 名字:登剑
描述: ①其他角色的弃牌阶段结束时，你可以随机获得本回合所有造成伤害的牌对应的实体牌的其中一张与你本轮以此法获得的牌的颜色均不同的【杀】，称为“剑法”。②你使用“剑法”牌不计入次数限制。
```js
twdengjian: {
		audio: 2,
		trigger: { global: "phaseDiscardEnd" },
		filter(event, player) {
			return event.player != player && lib.skill.twdengjian.getCards(player, event.player).length;
		},
		getCards(player, target) {
			let cards = target
				.getHistory("useCard", evt => {
					return (
						evt.cards &&
						evt.cards.filterInD("d").some(card => get.name(card, false) == "sha") &&
						target.getHistory("sourceDamage", evtx => {
							return evtx.card && evtx.card == evt.card;
						}).length
					);
				})
				.reduce((list, evt) => list.addArray(evt.cards.filterInD("d").filter(card => get.name(card, false) == "sha")), []);
			if (cards.length) {
				const history = player.actionHistory;
				for (let i = history.length - 1; i >= 0; i--) {
					for (let evt of history[i].gain) {
						if (evt.getParent().name == "twdengjian") {
							const card = evt.cards[0];
							cards = cards.filter(cardx => get.color(cardx) != get.color(card));
							if (!cards.length) {
								break;
							}
						}
					}
					if (history[i].isRound) {
						break;
					}
				}
			}
			return cards;
		},
		//direct:true,
		frequent: true,
		async content(event, trigger, player) {
			const cards = lib.skill.twdengjian.getCards(player, trigger.player);
			/*const {bool}=await player.chooseToDiscard(get.prompt('twdengjian'),'he')
			.set('prompt2','弃置一张牌并随机获得本回合所有造成伤害的牌对应的实体牌的其中一张与你本轮以此法获得的牌的颜色均不同的【杀】')
			.set('ai',card=>7-get.value(card))
			.set('logSkill','twdengjian')
			.forResult();
			if(bool) */ await player.gain(cards.randomGet(), "gain2").gaintag.add("twdengjianx");
		},
		group: "twdengjian_buff",
		subSkill: {
			buff: {
				mod: {
					aiOrder(player, card, num) {
						if (get.itemtype(card) == "card" && card.hasGaintag("twdengjianx")) {
							return num + 0.1;
						}
					},
				},
				audio: "twdengjian",
				trigger: { player: "useCard1" },
				filter(event, player) {
					return (
						event.cards &&
						event.cards.length == 1 &&
						player.getHistory("lose", evt => {
							if ((evt.relatedEvent || evt.getParent()) != event) {
								return false;
							}
							for (var i in evt.gaintag_map) {
								if (evt.gaintag_map[i].includes("twdengjianx")) {
									return true;
								}
							}
							return false;
						}).length &&
						event.addCount !== false
					);
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					trigger.addCount = false;
					if (player.stat[player.stat.length - 1].card.sha > 0) {
						player.stat[player.stat.length - 1].card.sha--;
					}
					game.log(trigger.card, "不计入次数限制");
				},
			},
		},
	}
```

### twxinshou 名字:心授
描述: ①当你于出牌阶段使用【杀】时，若此【杀】与你本回合使用的所有其他【杀】的颜色均不相同，则你可以选择执行以下一项本回合未执行过的项：⒈摸一张牌；⒉交给一名其他角色一张牌。②当你使用【杀】时，若〖心授①〗的两项本回合均已被你选择过，则你可以令〖登剑①〗失效并令一名其他角色获得〖登剑〗，你的下个回合开始时，其失去〖登剑〗，若其这期间使用【杀】造成过伤害，则你结束〖登剑①〗的失效状态。
```js
twxinshou: {
		audio: 2,
		trigger: { player: "useCard" },
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			const goon =
				!player.getHistory("useCard", evt => {
					return evt != event && evt.card.name == "sha" && get.color(evt.card) == get.color(event.card);
				}).length && player.isPhaseUsing();
			if (!player.hasSkill("twxinshou_0")) {
				return goon;
			}
			if (!player.hasSkill("twxinshou_1")) {
				return goon && game.hasPlayer(target => target != player);
			}
			return (
				game.hasPlayer(target => {
					if (target == player) {
						return false;
					}
					return !target.hasSkill("twdengjian", null, null, false);
				}) && player.hasSkill("twdengjian", null, null, false)
			);
		},
		direct: true,
		async content(event, trigger, player) {
			if (player.hasSkill("twxinshou_0") && player.hasSkill("twxinshou_1")) {
				const { bool, targets } = await player
					.chooseTarget((card, player, target) => {
						return target != player && !target.hasSkill("twdengjian", null, null, false);
					})
					.set("ai", target => {
						const player = get.event().player;
						if (get.attitude(player, target) > 0) {
							if (target.isTurnedOver()) {
								return 0;
							}
							const card = new lib.element.VCard({ name: "sha", isCard: true });
							if (
								game.hasPlayer(aim => {
									return target.canUse(card, target) && get.effect(aim, card, target, player) > 0 && get.effect(aim, card, target, target) > 0;
								})
							) {
								return target.countCards("h") - 3;
							}
							return 0;
						}
						return 0;
					})
					.set("prompt", get.prompt("twxinshou"))
					.set("prompt2", "令【登剑】失效并令一名其他角色获得【登剑】，你的下个回合开始时，其失去【登剑】，若其这期间使用【杀】造成过伤害，则你结束【登剑】的失效状态")
					.forResult();
				if (bool) {
					const target = targets[0];
					player.logSkill("twxinshou", target);
					player.tempBanSkill("twdengjian", "forever");
					target.addAdditionalSkills("twxinshou_" + player.playerid, "twdengjian");
					player.popup("登剑");
					target.popup("登剑");
					game.log(player, "将", "#g【登剑】", "传授给了", target);
					const evtx = event;
					player.when("phaseBegin").step(async (event, trigger, player) => {
						await target.removeAdditionalSkills("twxinshou_" + player.playerid);
						const history = game.getAllGlobalHistory("everything");
						for (let i = history.length - 1; i >= 0; i--) {
							const evt = history[i];
							if (evt.name == "damage" && evt.card && evt.source && evt.card.name == "sha" && evt.source == target) {
								player.popup("洗具");
								delete player.storage[`temp_ban_twdengjian`];
								game.log(player, "结束了", "#g【登剑】", "的失效状态");
								return;
							}
							if (evt == evtx) {
								break;
							}
						}
						player.popup("杯具");
						player.chat("剑法废掉了...");
					});
				}
			} else {
				let choice = [],
					choiceList = ["摸一张牌", "交给一名其他角色一张牌"];
				if (!player.hasSkill("twxinshou_0")) {
					choice.push("摸牌");
				} else {
					choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
				}
				if (!player.hasSkill("twxinshou_1") && game.hasPlayer(target => target != player)) {
					choice.push("给牌");
				} else {
					choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
				}
				const { control } = await player
					.chooseControl(choice, "cancel2")
					.set("prompt", get.prompt("twxinshou"))
					.set("choiceList", choiceList)
					.set("ai", () => {
						if (get.event().controls.includes("摸牌")) {
							return "摸牌";
						}
						const player = get.event().player;
						return game.hasPlayer(target => {
							if (target == player) {
								return false;
							}
							if (player.countCards("he", card => card.name == "du") && get.attitude(player, target) <= 0) {
								return true;
							}
							if (player.countCards("he", card => get.value(card, player) < 0 && get.attitude(player, target) * get.value(card, target) > 0)) {
								return true;
							}
							return get.attitude(player, target) > 0;
						}) && get.event().controls.includes("给牌")
							? "给牌"
							: "cancel2";
					})
					.forResult();
				if (control == "cancel2") {
					return;
				}
				player.logSkill("twxinshou");
				if (control == "摸牌") {
					player.addTempSkill("twxinshou_0");
					await player.draw();
				}
				if (control == "给牌") {
					player.addTempSkill("twxinshou_1");
					const { bool, targets } = await player
						.chooseTarget("交给一名其他角色一张牌", lib.filter.notMe, true)
						.set("ai", target => {
							const player = get.event().player,
								att = get.attitude(player, target);
							if (player.countCards("he", card => card.name == "du")) {
								return -att;
							}
							let cards = player.getCards("he", card => get.value(card, player) < 0);
							if (cards.length) {
								cards.sort((a, b) => get.value(a, player) - get.value(b, player));
								return get.value(cards[0], target) * att;
							}
							return att;
						})
						.forResult();
					if (bool) {
						const target = targets[0];
						player.line(target);
						await player.chooseToGive(target, "he", true);
					}
				}
			}
		},
		derivation: "twdengjian",
		subSkill: {
			0: { charlotte: true },
			1: { charlotte: true },
		},
	}
```

## xia_shitao 名字:石韬 势力:qun

### twjieqiu 名字:劫囚
描述: 出牌阶段限一次，你可以选择一名装备区没有废除栏的其他角色，废除其所有装备栏，然后其摸X张牌（X为其废除装备栏前的装备区牌数），直到其恢复所有装备栏前：其弃牌阶段结束时，其恢复等同于其弃置牌数的装备栏；其回合结束时，若其仍有已废除的装备栏，则你可以执行一个额外回合（每轮限一次）。
```js
twjieqiu: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(target => lib.skill.twjieqiu.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			return target != player && !target.hasDisabledSlot();
		},
		usable: 1,
		async content(event, trigger, player) {
			const target = event.target,
				num = target.countCards("e");
			let disables = [];
			for (let i = 1; i <= 5; i++) {
				for (let j = 0; j < target.countEnabledSlot(i); j++) {
					disables.push(i);
				}
			}
			target.disableEquip(disables);
			if (num) {
				await target.draw(num);
			}
			target.addSkill("twjieqiu_buff");
			target.markAuto("twjieqiu_buff", [player]);
			target
				.when("enableEquipEnd")
				.filter((e, p) => !p.hasDisabledSlot())
				.step(async () => target.removeSkill("twjieqiu_buff"));
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					return -target.countCards("e") - (get.attitude(player, target) < 0 ? 1 : 0);
				},
			},
		},
		frequent: true,
		subSkill: {
			used: { charlotte: true },
			buff: {
				charlotte: true,
				onremove: true,
				trigger: { player: "phaseDiscardEnd" },
				filter(event, player) {
					return player.hasDisabledSlot() && event.cards && event.cards.length;
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const num = trigger.cards.length;
					let list = [],
						map = {};
					for (let i = 1; i < 6; i++) {
						map[get.translation("equip" + i)] = "equip" + i;
						if (player.hasDisabledSlot(i)) {
							for (let j = 0; j < player.countDisabledSlot(i); j++) {
								list.push("equip" + i);
							}
						}
					}
					let result;
					const transList = list.map(i => get.translation(i));
					if (transList.length <= num) {
						result = { bool: true, links: transList };
					} else {
						result = await player
							.chooseButton(["劫囚：请选择你要恢复的装备栏", [transList, "tdnodes"]], Math.min(transList.length, num), true)
							.set("map", map)
							.set("ai", button => ["equip5", "equip4", "equip1", "equip3", "equip2"].indexOf(get.event().map[button.link]) + 2)
							.forResult();
					}
					if (result.bool) {
						await player.enableEquip(result.links.slice().map(i => map[i]));
					}
				},
				group: ["twjieqiu_end"],
			},
			end: {
				charlotte: true,
				trigger: { player: "phaseEnd" },
				filter(event, player) {
					return (
						player.hasDisabledSlot() &&
						player.getStorage("twjieqiu_buff").some(target => {
							return target.isIn() && !target.hasSkill("twjieqiu_used");
						})
					);
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const targets = player
						.getStorage("twjieqiu_buff")
						.filter(target => {
							return target.isIn() && !target.hasSkill("twjieqiu_used");
						})
						.sortBySeat();
					for (const target of targets) {
						const result = await target.chooseBool("劫囚：是否执行一个额外回合？").set("frequentSkill", "twjieqiu").forResult();
						if (result.bool) {
							target.popup("劫囚");
							target.addTempSkill("twjieqiu_used", "roundStart");
							target.insertPhase();
						}
					}
				},
			},
		},
	}
```

### twenchou 名字:恩仇
描述: 出牌阶段限一次，你可以观看一名存在废除装备栏的其他角色的手牌并获得其中一张牌，然后你恢复其一个装备栏。
```js
twenchou: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(current => lib.skill.twenchou.filterTarget(null, player, current));
		},
		position: "he",
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") && target.hasDisabledSlot();
		},
		usable: 1,
		async content(event, trigger, player) {
			const target = event.target;
			await player.gainPlayerCard(target, "h", true, "visible");
			let list = [],
				map = {};
			for (let i = 1; i < 6; i++) {
				map[get.translation("equip" + i)] = "equip" + i;
				if (target.hasDisabledSlot(i)) {
					list.push("equip" + i);
				}
			}
			let result;
			const transList = list.map(i => get.translation(i));
			if (transList.length == 1) {
				result = { bool: true, links: transList };
			} else {
				result = await player
					.chooseButton(["恩仇：请选择" + get.translation(target) + "要恢复的装备栏", [transList, "tdnodes"]], true)
					.set("map", map)
					.set("ai", button => 1 / (["equip5", "equip4", "equip1", "equip3", "equip2"].indexOf(get.event().map[button.link]) + 2))
					.forResult();
			}
			if (result.bool) {
				await target.enableEquip(result.links.slice().map(i => map[i]));
			}
		},
		ai: {
			order: 9,
			result: { target: -1 },
			combo: "twjieqiu",
		},
	}
```

## xia_guanyu 名字:侠关羽 势力:qun

### twzhongyi 名字:忠义
描述: `锁定技。①你使用【杀】无距离限制。②当你使用【杀】结算完毕后，你选择一项：⒈摸X张牌；⒉回复X点体力；⒊${get.poptip("rule_beishui")}：失去Y点体力（X为受到此牌造成的伤害的角色数，Y为你本局游戏选择此项的次数）。`
```js
twzhongyi: {
		mod: {
			targetInRange(card) {
				if (card.name == "sha") {
					return true;
				}
			},
		},
		audio: 2,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			return player.getHistory("sourceDamage", evt => evt.card && evt.card == event.card).length;
		},
		forced: true,
		async content(event, trigger, player) {
			//const num=player.getHistory('sourceDamage',evt=>evt.card&&evt.card==trigger.card).reduce((sum,evt)=>sum+evt.num,0);
			const num = game.countPlayer2(target => {
				return target.hasHistory("damage", evt => {
					return evt.card && evt.card == trigger.card;
				});
			});
			const num2 = 1 + player.getAllHistory("custom", evt => evt.twzhongyi).length;
			let choice = ["摸牌"],
				choiceList = ["摸" + get.cnNumber(num) + "张牌"];
			if (player.isDamaged()) {
				choice.addArray(["回血", "背水！"]);
				choiceList.addArray(["回复" + num + "点体力", "失去" + num2 + "点体力，依次执行以上所有项"]);
			}
			const { control } = await player
				.chooseControl(choice)
				.set("prompt", "忠义：请选择一项")
				.set("choiceList", choiceList)
				.set("ai", () => {
					const player = get.event().player;
					const num = get.event().num,
						num2 = get.event().num2;
					if (player.isHealthy()) {
						return "摸牌";
					}
					return player.hp + player.countCards("hs", card => player.canSaveCard(card, player)) - num2 > 0 && num > num2 ? "背水！" : "回血";
				})
				.set("num", num)
				.set("num2", num2)
				.forResult();
			if (control != "cancel2") {
				if (control != "回血") {
					await player.draw(num);
				}
				if (control != "摸牌") {
					await player.recover(num);
				}
				if (control == "背水！") {
					await player.loseHp(num2);
					player.getHistory("custom").push({ twzhongyi: true });
				}
			}
		},
	}
```

### twchue 名字:除恶
描述: ①当你使用【杀】指定唯一目标时，若场上存在可成为此【杀】目标的非目标角色，则你可以失去1点体力，为此牌额外指定Z个目标。②当你受到伤害或失去体力后，你摸一张牌并获得1个“勇”标记。③回合结束时，若你的“勇”标记数大于等于Z，则你可以失去Z个“勇”标记，视为使用一张伤害+1且可以额外指定Z个目标的【杀】。（Z为你的体力值）
```js
twchue: {
		audio: 2,
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			return event.card.name == "sha" && event.isFirstTarget && event.targets.length == 1 && game.hasPlayer(target => !event.targets.includes(target) && player.canUse(event.card, target));
		},
		prompt2: "失去1点体力，额外指定至多等同于你体力值的目标",
		check(event, player) {
			return player.hp + player.countCards("hs", card => player.canSaveCard(card, player)) - 1 > 0;
		},
		async content(event, trigger, player) {
			await player.loseHp();
			const targetx = trigger.targets.slice(),
				num = player.getHp();
			if (!num) {
				return;
			}
			const { bool, targets } = await player
				.chooseTarget("额外指定至多" + get.cnNumber(num) + "名目标", [1, num], (card, player, target) => {
					const trigger = _status.event.getTrigger();
					return !trigger.targets.includes(target) && player.canUse(trigger.card, target);
				})
				.set("ai", target => {
					const player = get.event().player,
						trigger = _status.event.getTrigger();
					return get.effect(target, trigger.card, player, player);
				})
				.forResult();
			if (!bool) {
				return;
			}
			player.line(targets);
			trigger.targets.addArray(targets);
		},
		group: ["twchue_gain", "twchue_effect"],
		marktext: "勇",
		intro: {
			name: "勇",
			content: "mark",
		},
		subSkill: {
			gain: {
				audio: "twchue",
				trigger: { player: ["damageEnd", "loseHpEnd"] },
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					await player.draw();
					player.addMark("twchue", 1);
				},
			},
			effect: {
				audio: "twchue",
				trigger: { global: "phaseEnd" },
				filter(event, player) {
					const card = new lib.element.VCard({ name: "sha", isCard: true });
					return (
						player.hasUseTarget(card) &&
						/*player.getHistory('useSkill',evt=>{
						return evt.skill=='twchue_gain';
					}).length&&player.getHp()&&*/ player.countMark("twchue") >= player.getHp()
					);
				},
				check(event, player) {
					return player.hasValueTarget(new lib.element.VCard({ name: "sha", isCard: true }));
				},
				prompt2(event, player) {
					const num = player.getHp();
					return "失去" + num + "个“勇”标记，视为使用一张造成的伤害+1且可以额外指定" + num + "个目标的【杀】";
				},
				async content(event, trigger, player) {
					const num = player.getHp();
					player.removeMark("twchue", num);
					const card = new lib.element.VCard({ name: "sha", isCard: true });
					player
						.when("useCard2", false)
						.filter(evt => evt.getParent(2) == event)
						.assign({
							firstDo: true,
						})
						.step(async (event, trigger, player) => {
							trigger.baseDamage++;
							if (
								!game.hasPlayer(target => {
									return !trigger.targets.includes(target) && player.canUse(trigger.card, target);
								})
							) {
								return;
							}
							const result = await player
								.chooseTarget("额外指定至多" + get.cnNumber(num) + "名目标", [1, num], (card, player, target) => {
									const trigger = _status.event.getTrigger();
									return !trigger.targets.includes(target) && player.canUse(trigger.card, target);
								})
								.set("ai", target => {
									const player = get.event().player,
										trigger = _status.event.getTrigger();
									return get.effect(target, trigger.card, player, player);
								})
								.forResult();
							if (result.bool) {
								const targets = result.targets;
								player.line(targets);
								trigger.targets.addArray(targets);
							}
						})
						.finish();
					player.chooseUseTarget("视为使用造成的伤害+1且可以额外指定" + num + "个目标的【杀】", card, false, true);
				},
			},
		},
	}
```

## xia_liubei 名字:侠刘备 势力:shu

### twshenyi 名字:伸义
描述: 每回合限一次，当你或你攻击范围内的一名角色于一回合内首次受到伤害后，你可以声明一种基本牌或锦囊牌（每种牌名限一次），然后从牌堆中将一张同名牌（若没有同名牌则改为同类型的牌）称为“侠义”置于武将牌上。若受伤角色不为你，则你可以将任意张手牌交给其，且当其失去一张你以此法交给其的牌后，你摸一张牌。
```js
twshenyi: {
		audio: 2,
		trigger: { global: "damageEnd" },
		filter(event, player) {
			if (!event.player.isIn()) {
				return false;
			}
			if (event.player.getHistory("damage").indexOf(event) != 0) {
				return false;
			}
			return event.player == player || player.inRange(event.player);
		},
		usable: 1,
		async cost(event, trigger, player) {
			const { player: target } = trigger;
			const list = get.inpileVCardList(info => {
				return ["basic", "trick", "delay"].includes(info[0]) && !player.getStorage(event.skill).includes(info[2]);
			});
			const dialog = [`###${get.prompt(event.skill, target)}###<div class="text center">从牌堆中将一张牌作为“侠义”置于武将牌上${player != target && player.countCards("h") ? "，然后将任意张手牌交给其" : ""}</div>`, [list, "vcard"]];
			const { bool, links } = await player
				.chooseButton(dialog)
				.set("ai", button => {
					const trigger = _status.event.getTrigger();
					const player = get.player(),
						name = button.link[2];
					if (!get.cardPile2(card => card.name == name)) {
						return 0;
					}
					const value = get.value({ name: name });
					if (["tao", "jiu", "caochuan", "wuxie"].includes(name) && get.event().getRand() > 0.4) {
						return value * 2;
					}
					return value;
				})
				.forResult();
			event.result = {
				bool: bool,
				cost_data: links,
				targets: [target],
			};
		},
		async content(event, trigger, player) {
			const {
				cost_data: links,
				targets: [target],
				name: skillName,
			} = event;
			const name = links[0][2],
				nature = links[0][3];
			const cardx = { name: name, nature: nature };
			player.popup(cardx);
			player.markAuto(skillName, [name]);
			game.log(player, "声明了", `#y${get.translation(cardx)}`);
			const card = get.cardPile2(card => get.name(card, false) == name && get.nature(card, false) == nature);
			if (card) {
				const next = player.addToExpansion([card], "gain2");
				next.gaintag.add(skillName);
				await next;
			} else {
				const card = get.cardPile2(card => get.type2(card) == get.type2(name));
				if (card) {
					const next = player.addToExpansion([card], "gain2");
					next.gaintag.add(skillName);
					await next;
				} else {
					player.chat("无牌可得？！");
				}
			}
			if (target != player && player.countCards("h")) {
				game.delayex();
				const skill = `${skillName}_${player.playerid}`;
				game.addTempTag(skill, `义·${get.translation(player.name)}`);
				player.addSkill(skillName + "_draw");
				const next = player
					.chooseToGive(target, `伸义：是否将任意张手牌交给${get.translation(target)}？`, [1, player.countCards("h")], "allowChooseAll")
					.set("ai", card => {
						if (!_status.event.goon) {
							return 0;
						}
						return 7 - get.value(card);
					})
					.set("goon", get.attitude(player, target) > 0);
				next.gaintag.add(skill);
				await next;
			}
		},
		marktext: "义",
		intro: {
			name: "侠义",
			content: "expansion",
			markcount: "expansion",
		},
		onremove(player, skill) {
			delete player.storage[skill];
			//var cards=player.getExpansions(skill);
			//if(cards.length) player.loseToDiscardpile(cards);
		},
		subSkill: {
			draw: {
				charlotte: true,
				audio: "twshenyi",
				trigger: { global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"] },
				filter(event, player, name, target) {
					return target?.isIn();
				},
				forced: true,
				getIndex(event, player) {
					return game
						.filterPlayer(target => {
							const evt = event.getl(target);
							if (!evt?.hs?.length) {
								return false;
							}
							return Object.values(evt.gaintag_map).flat().includes(`twshenyi_${player.playerid}`);
						})
						.sortBySeat();
				},
				logTarget: (event, player, triggername, target) => target,
				async content(event, trigger, player) {
					const evt = trigger.getl(event.targets[0]);
					const num = Object.values(evt.gaintag_map)
						.flat()
						.reduce((numx, tag) => numx + (tag.includes(`twshenyi_${player.playerid}`) ? 1 : 0), 0);
					if (num) {
						await player.draw(num);
					}
				},
			},
		},
	}
```

### twxinghan 名字:兴汉
描述: ①你的回合外或你处于濒死状态时，你可以如手牌般使用或打出“侠义”牌。②准备阶段，若“侠义”牌数大于存活角色数，则你可以依次使用其中所有可以使用的牌。然后你获得如下效果：回合结束时，你弃置所有手牌并失去X点体力（X为你的体力值-1且X至少为1）。
```js
twxinghan: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.getExpansions("twshenyi").length > game.countPlayer();
		},
		check(event, player) {
			if (player.hp >= 3 || (player.countCards("h") >= 4 && player.getExpansions("twshenyi").every(card => !player.hasValueTarget(card) || !get.tag(card, "damage") || !lib.skill.xunshi.isXunshi(card)))) {
				return false;
			}
			return player.getExpansions("twshenyi").some(card => player.hasValueTarget(card));
		},
		direct: true,
		async content(event, trigger, player) {
			var result = await player
				.chooseBool()
				.set("createDialog", [
					get.prompt("twxinghan"),
					`<div class="text center">按顺序使用以下“侠义”牌。但是回合结束时你须弃置所有手牌并失去X点体力（X为你的体力值-1且X至少为1）</div>`,
					player
						.getExpansions("twshenyi")
						.filter(card => player.hasUseTarget(card))
						.reverse(),
					"hidden",
				])
				.set("choice", lib.skill.twxinghan.check(null, player))
				.forResult();
			if (!result.bool) {
				event.finish();
				return;
			}
			while (true) {
				var cards = player
					.getExpansions("twshenyi")
					.filter(card => player.hasUseTarget(card))
					.reverse();
				if (!cards.length) {
					break;
				}
				await player.chooseUseTarget(true, cards[0], false);
			}
			player.when("phaseEnd").step(async () => {
				if (player.countCards("h")) {
					await player.chooseToDiscard(player.countCards("h"), true);
				}
				var num = Math.max(1, player.getHp() - 1);
				await player.loseHp(num);
			});
		},
		group: "twxinghan_init",
		subSkill: {
			init: {
				audio: "twxinghan",
				trigger: {
					player: ["loseEnd", "dying", "phaseBefore", "phaseAfter", "dyingAfter", "die"],
					global: ["equipEnd", "addJudgeEnd", "gainEnd", "loseAsyncEnd", "addToExpansionEnd"],
				},
				filter(event, player) {
					return (player.getExpansions("twshenyi").length && event.name != "die" && (_status.currentPhase != player || player.isDying())) ^ player.hasSkill("twxinghan_in");
				},
				forced: true,
				firstDo: true,
				silent: true,
				forceDie: true,
				content() {
					if (player.getExpansions("twshenyi").length && trigger.name != "die" && (_status.currentPhase != player || player.isDying())) {
						var cards = player.getExpansions("twshenyi");
						var cardsx = cards.map(card => {
							var cardx = ui.create.card();
							cardx.init(get.cardInfo(card));
							cardx._cardid = card.cardid;
							return cardx;
						});
						player.directgains(cardsx, null, "twxinghan_tag");
						player.addSkill("twxinghan_in");
					} else {
						player.removeSkill("twxinghan_in");
					}
				},
			},
			in: {
				charlotte: true,
				audio: "twxinghan",
				trigger: { player: "addToExpansionEnd" },
				filter(event, player) {
					return event.gaintag.includes("twshenyi");
				},
				forced: true,
				locked: false,
				silent: true,
				content() {
					"step 0";
					var cards2 = player.getCards("s", card => card.hasGaintag("twxinghan_tag"));
					if (player.isOnline2()) {
						player.send(
							function (cards, player) {
								cards.forEach(i => i.delete());
								if (player == game.me) {
									ui.updatehl();
								}
							},
							cards2,
							player
						);
					}
					cards2.forEach(i => i.delete());
					if (player == game.me) {
						ui.updatehl();
					}
					"step 1";
					var cards = player.getExpansions("twshenyi");
					var cardsx = cards.map(card => {
						var cardx = ui.create.card();
						cardx.init(get.cardInfo(card));
						cardx._cardid = card.cardid;
						return cardx;
					});
					player.directgains(cardsx, null, "twxinghan_tag");
				},
				onremove(player) {
					var cards2 = player.getCards("s", card => card.hasGaintag("twxinghan_tag"));
					if (player.isOnline2()) {
						player.send(
							function (cards, player) {
								cards.forEach(i => i.delete());
								if (player == game.me) {
									ui.updatehl();
								}
							},
							cards2,
							player
						);
					}
					cards2.forEach(i => i.delete());
					if (player == game.me) {
						ui.updatehl();
					}
				},
				group: "twxinghan_use",
			},
			use: {
				charlotte: true,
				trigger: { player: ["useCardBefore", "respondBefore"] },
				filter(event, player) {
					var cards = player.getCards("s", card => card.hasGaintag("twxinghan_tag") && card._cardid);
					return (
						event.cards &&
						event.cards.some(card => {
							return cards.includes(card);
						})
					);
				},
				forced: true,
				popup: false,
				firstDo: true,
				content() {
					var idList = player.getCards("s", card => card.hasGaintag("twxinghan_tag")).map(i => i._cardid);
					var cards = player.getExpansions("twshenyi");
					var cards2 = [];
					for (var card of trigger.cards) {
						var cardx = cards.find(cardx => cardx.cardid == card._cardid);
						if (cardx) {
							cards2.push(cardx);
						}
					}
					var cards3 = trigger.cards.slice();
					trigger.cards = cards2;
					trigger.card.cards = cards2;
					if (player.isOnline2()) {
						player.send(
							function (cards, player) {
								cards.forEach(i => i.delete());
								if (player == game.me) {
									ui.updatehl();
								}
							},
							cards3,
							player
						);
					}
					cards3.forEach(i => i.delete());
					if (player == game.me) {
						ui.updatehl();
					}
				},
			},
		},
		ai: {
			combo: "twshenyi",
		},
	}
```

## xia_xiahousone 名字:夏侯子萼 势力:qun

### twchengxi 名字:承袭
描述: 出牌阶段每名角色限一次，你可以摸一张牌并与一名其他角色拼点。若你赢，你使用的下一张基本牌或普通锦囊牌额外结算一次；若你没赢，其视为对你使用一张无距离限制的普通【杀】，然后你使用的下一张基本牌或普通锦囊牌可额外指定其为目标。
```js
twchengxi: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(target => lib.skill.twchengxi.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			if (player.getStorage("twchengxi_used").includes(target) || target == player) {
				return false;
			}
			return player.canCompare(target, true);
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (!player.storage.twchengxi_used) {
				player.when("phaseUseAfter").step(async () => delete player.storage.twchengxi_used);
			}
			player.markAuto("twchengxi_used", [target]);
			await player.draw();
			if (player.canCompare(target)) {
				const result = await player.chooseToCompare(target).forResult();
				if (!result) {
					return;
				}
				if (result.bool) {
					player.addSkill("twchengxi_effect");
				} else {
					const card = { name: "sha", isCard: true };
					if (target.canUse(card, player, false)) {
						await target.useCard(card, player, false);
					}
					player.addSkill("twchengxi_add");
					player.markAuto("twchengxi_add", [target]);
				}
			}
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					if (player.hasSkill("twchengxi_effect")) {
						return 0;
					}
					var hs = player.getCards("h").sort((a, b) => b.number - a.number);
					var ts = target.getCards("h").sort((a, b) => b.number - a.number);
					if (!hs.length || !ts.length) {
						return 0;
					}
					if (hs[0].number > ts[0].number) {
						return -3;
					}
					if (!target.canUse({ name: "sha", isCard: true }, player, false)) {
						return -1;
					}
					return 0;
				},
			},
		},
		subSkill: {
			add: {
				popup: false,
				charlotte: true,
				onremove: true,
				trigger: { player: "useCard2" },
				filter(event, player) {
					if (!["basic", "trick"].includes(get.type(event.card))) {
						return false;
					}
					if (!Array.isArray(event.targets)) {
						return false;
					}
					return game.hasPlayer(target => {
						if (!player.getStorage("twchengxi_add").includes(target)) {
							return false;
						}
						return !event.targets.includes(target) && lib.filter.targetEnabled2(event.card, player, target);
					});
				},
				async cost(event, trigger, player) {
					const targets = game.filterPlayer(target => {
						if (!player.getStorage("twchengxi_add").includes(target)) {
							return false;
						}
						return !trigger.targets.includes(target) && lib.filter.targetEnabled2(trigger.card, player, target);
					});
					if (targets.length == 1) {
						const target = targets[0];
						const { bool } = await player.chooseBool(get.prompt(event.skill, target), "令" + get.translation(target) + "也成为" + get.translation(trigger.card) + "的目标").forResult();
						event.result = { bool: bool, targets: targets };
					} else {
						event.result = await player
							.chooseTarget(
								get.prompt(event.skill),
								"令任意名【承袭】的目标角色也成为" + get.translation(trigger.card) + "的目标",
								(card, player, target) => {
									const trigger = get.event().getTrigger();
									if (!player.getStorage("twchengxi_add").includes(target)) {
										return false;
									}
									return !trigger.targets.includes(target) && lib.filter.targetEnabled2(trigger.card, player, target);
								},
								[1, player.getStorage("twchengxi_add").length]
							)
							.set("ai", target => {
								const player = get.player(),
									trigger = get.event().getTrigger();
								return get.effect(target, trigger.card, player, player);
							})
							.forResult();
					}
				},
				async content(event, trigger, player) {
					player.removeSkill(event.name);
					player.line(event.targets);
					trigger.targets.addArray(event.targets);
					game.log(event.targets, "成为了", trigger.card, "的额外目标");
				},
				intro: {
					content: "你使用的下一张基本牌和普通锦囊牌可以额外指定 $ 为目标",
				},
			},
			effect: {
				charlotte: true,
				trigger: { player: "useCard1" },
				filter(event, player) {
					return get.type(event.card) == "basic" || get.type(event.card) == "trick";
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.removeSkill(event.name);
					trigger.effectCount++;
				},
				mark: true,
				marktext: "袭",
				intro: {
					content: "使用的下一张基本牌或普通锦囊牌额外结算一次",
				},
			},
		},
	}
```

## xia_xiahoudun 名字:侠夏侯惇 势力:qun

### twdanlie 名字:胆烈
描述: `①出牌阶段限一次。你可以与至多三名其他角色${get.poptip("rule_gongtongpindian")}。若你赢，你对没赢的角色依次造成1点伤害；若你没赢，你失去1点体力。②你的拼点牌点数+X（X为你已损失的体力值）。`
```js
twdanlie: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(target => player.canCompare(target));
		},
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		usable: 1,
		selectTarget: [1, 3],
		multitarget: true,
		multiline: true,
		group: "twdanlie_add",
		content() {
			"step 0";
			player.chooseToCompare(targets).setContent("chooseToCompareMeanwhile");
			"step 1";
			if (result.winner && result.winner == player) {
				player.line(targets);
				targets.forEach(target => target.damage());
			} else {
				player.loseHp();
			}
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					var att = get.attitude(player, target);
					if (att >= 0) {
						return 0;
					}
					if (player.getHp() > 2) {
						return -get.damageEffect(target, player, player) - 10 / target.countCards("h");
					}
					var hs = player.getCards("h").sort((a, b) => b.number - a.number);
					var ts = target.getCards("h").sort((a, b) => b.number - a.number);
					if (!hs.length || !ts.length) {
						return 0;
					}
					if (Math.min(13, hs[0].number + player.getDamagedHp()) > ts[0].number) {
						return -get.damageEffect(target, player, player);
					}
					return 0;
				},
			},
		},
		subSkill: {
			add: {
				audio: "twdanlie",
				trigger: { player: "compare", target: "compare" },
				filter(event, player) {
					if (!player.isDamaged()) {
						return false;
					}
					if (player != event.target && event.iwhile) {
						return false;
					}
					return true;
				},
				forced: true,
				locked: false,
				content() {
					var num = player.getDamagedHp();
					if (player == trigger.player) {
						trigger.num1 += num;
						if (trigger.num1 > 13) {
							trigger.num1 = 13;
						}
					} else {
						trigger.num2 += num;
						if (trigger.num2 > 13) {
							trigger.num2 = 13;
						}
					}
					game.log(player, "的拼点牌点数+", num);
				},
			},
		},
	}
```

## xia_zhangwei 名字:张葳 势力:qun

### twhuzhong 名字:护众
描述: 当你于出牌阶段使用无属性【杀】指定唯一目标角色时，你可以摸一张牌并选择一项：①为此牌额外选择一个目标；②弃置其一张手牌，此牌结算完毕后，若此牌造成过伤害，则你本阶段可以额外使用一张【杀】。
```js
twhuzhong: {
		audio: 2,
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			return event.card.name == "sha" && !game.hasNature(event.card, "linked") && event.targets.length == 1 && player.isPhaseUsing() && (game.hasPlayer(target => !event.targets.includes(target) && player.canUse(event.card, target)) || event.target.countCards("h") > 0);
		},
		direct: true,
		content() {
			"step 0";
			var target = trigger.target;
			event.target = target;
			var list = ["cancel2"];
			var choiceList = ["令此【杀】可以额外指定一个目标", "弃置" + get.translation(target) + "一张手牌，若此【杀】造成伤害，则你本阶段可以额外使用一张【杀】"];
			if (target.countCards("h")) {
				list.unshift("其弃置");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			if (game.hasPlayer(targetx => !trigger.targets.includes(targetx) && player.canUse(trigger.card, targetx))) {
				list.unshift("多指");
			} else {
				choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
			}
			player
				.chooseControl(list)
				.set("choiceList", choiceList)
				.set("ai", () => {
					var controls = _status.event.controls;
					var trigger = _status.event.getTrigger();
					var player = trigger.player;
					var target = trigger.target;
					if (controls.includes("其弃置") && _status.event.goon) {
						return "其弃置";
					}
					if (controls.includes("多指")) {
						if (game.hasPlayer(targetx => !trigger.targets.includes(targetx) && player.canUse(trigger.card, targetx) && get.effect(targetx, trigger.card, player, player) > 0)) {
							return "你弃置";
						}
					}
					return "cancel2";
				})
				.set(
					"goon",
					(function () {
						var d1 = false;
						if (
							!target.mayHaveShan(player, "use") ||
							player.hasSkillTag(
								"directHit_ai",
								true,
								{
									target: target,
									card: trigger.card,
								},
								true
							)
						) {
							if (get.attitude(player, target) < 0 && !player.hasSkillTag("jueqing", false, target)) {
								return true;
							}
						}
						if (d1) {
							return get.damageEffect(player, player, player) > 0;
						}
						return false;
					})()
				)
				.set("prompt", "护众：是否摸一张牌并执行其中一项？");
			"step 1";
			if (result.control != "cancel2") {
				player.logSkill("twhuzhong", target);
				player.draw();
				if (result.control == "其弃置") {
					player.discardPlayerCard(target, "h", true);
					player
						.when("useCardAfter")
						.filter(evt => evt == trigger.getParent())
						.step(async (event, trigger, player) => {
							if (player.getHistory("sourceDamage", evt => evt.card == trigger.card).length) {
								player.addTempSkill("twhuzhong_sha", "phaseUseAfter");
								player.addMark("twhuzhong_sha", 1, false);
							}
						});
					event.finish();
				}
			} else {
				event.finish();
			}
			"step 2";
			player
				.chooseTarget("请选择" + get.translation(trigger.card) + "的额外目标", function (card, player, target) {
					var trigger = _status.event.getTrigger();
					return !trigger.targets.includes(target) && player.canUse(trigger.card, target);
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					var trigger = _status.event.getTrigger();
					return get.effect(target, trigger.card, player, player);
				});
			"step 3";
			if (result.bool) {
				player.line(result.targets);
				trigger.getParent().targets.addArray(result.targets);
				game.log(result.targets, "成为了", trigger.card, "的额外目标");
			}
		},
		subSkill: {
			sha: {
				charlotte: true,
				onremove: true,
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("twhuzhong_sha");
						}
					},
				},
			},
		},
	}
```

### twfenwang 名字:焚亡
描述: 锁定技。①当你受到属性伤害时，你须弃置一张手牌或令此伤害+1。②当你对其他角色造成非属性伤害时，若你的手牌数大于等于其，则此伤害+1。
```js
twfenwang: {
		audio: 2,
		trigger: { source: "damageBegin2", player: "damageBegin4" },
		filter(event, player, name) {
			if (name == "damageBegin2") {
				if (event.hasNature() || event.player == player) {
					return false;
				}
				return player.countCards("h") >= event.player.countCards("h");
			}
			return event.hasNature();
		},
		forced: true,
		logAudio(event, player, name) {
			return name == "damageBegin2" ? "twfenwang2.mp3" : "twfenwang1.mp3";
		},
		content() {
			"step 0";
			if (event.triggername == "damageBegin2") {
				player.line(trigger.player);
				trigger.num++;
				event.finish();
			} else {
				player.chooseToDiscard("h", "弃置一张手牌，或令此伤害+1").set("ai", function (card) {
					return 8 - get.value(card);
				});
			}
			"step 1";
			if (!result.bool) {
				trigger.num++;
			}
		},
	}
```

## tw_zhanghong 名字:张纮 势力:wu

### twquanqian 名字:劝迁
描述: `昂扬技，其他角色的摸牌阶段结束时，你可摸至手牌全场最多（至多摸五张），然后交给当前回合角色任意张牌。你以此法交出的牌：每包含一种类型，你摸一张牌；每包含一种花色，其本回合使用【杀】的次数+1。<br>${get.poptip("rule_jiang")}：累计X次有角色成为非延时伤害牌的目标且未受到此牌造成的伤害（X你上次以此法交出的牌数且至少为1）。`
```js
twquanqian: {
		audio: 2,
		trigger: { global: "phaseDrawEnd" },
		sunbenSkill: true,
		filter(event, player) {
			return event.player != player && game.hasPlayer(current => current.countCards("h") > 0);
		},
		check(event, player) {
			if (get.attitude(player, event.player) > 0) {
				return true;
			}
			return !player.isMaxHandcard();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.addSkill("twquanqian_sunben");
			const max = game.findPlayer(current => current.isMaxHandcard());
			if (max) {
				const num = Math.min(5, max.countCards("h") - player.countCards("h"));
				if (num > 0) {
					await player.draw(num);
				}
			}
			if (!player.countCards("he")) {
				player.addMark("twquanqian_sunben", 1, false);
				return;
			}
			const target = trigger.player;
			const result = await player
				.chooseToGive("he", target, [1, Infinity], "allowChooseAll", `是否交给${get.translation(target)}任意张牌？`)
				.set("complexCard", true)
				.set("ai", card => {
					if (get.event().att <= 0) {
						return 0;
					}
					if (ui.selected.cards.every(cardx => get.type2(cardx) != get.type2(card))) {
						return 9 - get.value(card);
					}
					return 2 - get.value(card);
				})
				.set("att", get.attitude(player, trigger.player))
				.forResult();
			if (!result?.bool || !result.cards?.length) {
				player.addMark("twquanqian_sunben", 1, false);
				return;
			}
			const types = result.cards.map(card => get.type2(card)).toUniqued();
			if (types.length) {
				await player.draw(types.length);
			}
			const suits = result.cards.map(card => get.suit(card)).toUniqued();
			if (suits.length) {
				target.addTempSkill("twquanqian_effect");
				target.addMark("twquanqian_effect", suits.length, false);
			}
			player.addMark("twquanqian_sunben", result.cards.length, false);
		},
		subSkill: {
			sunben: {
				charlotte: true,
				init(player, skill) {
					player.clearMark(skill, false);
				},
				onremove: true,
				intro: { content: "还需#次有角色成为非延时伤害牌的目标且未受到该牌伤害" },
				trigger: { global: "useCardAfter" },
				getIndex(event) {
					return event.targets;
				},
				filter(event, player, name, target) {
					if (!event.targets?.length) {
						return false;
					}
					if (!get.is.damageCard(event.card)) {
						return false;
					}
					return !target?.hasHistory("damage", evt => evt.card == event.card);
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					player.removeMark(event.name, 1, false);
					if (!player.countMark(event.name)) {
						player.removeSkill(event.name);
						if (player.hasSkill("twquanqian", null, null, false) && !player.hasSkill("twquanqian")) {
							player.popup("劝迁");
							player.restoreSkill("twquanqian");
							game.log(player, "恢复了技能", "#g【劝迁】");
						}
					}
				},
			},
			effect: {
				charlotte: true,
				onremove: true,
				intro: {
					content: "出杀次数+#",
				},
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("twquanqian_effect");
						}
					},
				},
			},
		},
	}
```

### twrouke 名字:柔克
描述: 你成为其他角色使用非延时伤害牌的目标时，若其本回合已造成过伤害，你可令此牌无效并与其各摸一张牌；若本轮其因此摸牌数大于你的体力值，此技能与其所有非锁定技失效至多下轮游戏开始。
```js
twrouke: {
		audio: 2,
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			if (event.player == player) {
				return false;
			}
			if (!get.is.damageCard(event.card)) {
				return false;
			}
			return event.player.hasHistory("sourceDamage");
		},
		logTarget: "player",
		check(event, player) {
			const getD = current => get.effect(current, { name: "draw" }, player, player);
			let eff = getD(player) + getD(event.player);
			return (
				event.targets.reduce((sum, target) => {
					return sum - get.effect(target, event.card, event.player, player);
				}, eff) >= 0
			);
		},
		async content(event, trigger, player) {
			const evt = trigger.getParent();
			evt.excluded.addArray(evt.targets);
			await game.asyncDraw([player, trigger.player]);
			let num = 0;
			trigger.player.getRoundHistory("gain", evt => {
				if (evt.getParent(2).name != event.name) {
					return false;
				}
				if (evt.cards?.length) {
					num += evt.cards.length;
				}
			});
			if (num > player.hp) {
				player.tempBanSkill(event.name, { global: "roundStart" });
				trigger.player.addTempSkill("fengyin", { global: "roundStart" });
			}
		},
	}
```

## tw_zhangzhao 名字:张昭 势力:wu

### twlijian 名字:力谏
描述: `昂扬技。其他角色的弃牌阶段结束时，你可以令其获得任意本阶段进入弃牌堆的牌（可不选），然后你获得其余的牌，若其得到的牌数大于你，你可以对其造成1点伤害。<br>${get.poptip("rule_jiang")}：X张牌进入弃牌堆（X为本局游戏人数）。`
```js
twlijian: {
		getCards(event) {
			var cards = [];
			game.countPlayer2(function (current) {
				current.checkHistory("lose", function (evt) {
					if (evt.position == ui.discardPile && evt.getParent("phaseDiscard") == event) {
						cards.addArray(evt.cards);
					}
				});
			});
			game.checkGlobalHistory("cardMove", function (evt) {
				if (evt.name == "cardsDiscard" && evt.getParent("phaseDiscard") == event) {
					cards.addArray(evt.cards);
				}
			});
			return cards.filterInD("d");
		},
		audio: 2,
		sunbenSkill: true,
		trigger: { global: "phaseDiscardEnd" },
		filter(event, player) {
			if (event.player != player && event.player.isIn()) {
				return lib.skill.twlijian.getCards(event).length;
			}
			return false;
		},
		prompt2: () => "选择任意张本阶段进入弃牌堆的牌令其获得，然后你获得剩余的牌，若其获得的牌数大于你，则你可以对其造成1点伤害",
		logTarget: "player",
		async content(event, trigger, player) {
			player.removeSkill("twlijian_sunben");
			player.awakenSkill(event.name);
			player.addSkill("twlijian_sunben");
			const cards = lib.skill.twlijian.getCards(trigger),
				target = trigger.player;
			const result = await player
				.chooseToMove("力谏：请分配" + get.translation(target) + "和你获得的牌", true, "allowChooseAll")
				.set("list", [[get.translation(target) + "获得的牌", cards], ["你获得的牌"]])
				.set("processAI", function (list) {
					var player = _status.event.player;
					var target = _status.event.getTrigger().player;
					var att = get.attitude(player, target);
					var cards = _status.event.cards;
					var cardx = cards.filter(card => card.name == "du");
					var cardy = cards.removeArray(cardx);
					switch (get.sgn(att)) {
						case 1:
							return [cards, []];
						case 0:
							return [cardx, cardy];
						case -1:
							var num = Math.ceil(cards.length / 2) + (cards.length % 2 == 0 ? 1 : 0);
							if (num > 1 && player.hasSkill("twchungang")) {
								num--;
							}
							if (get.damageEffect(target, player, player) <= 0 || num > 2 || cardx.length > cardy.length) {
								return [cardx, cardy];
							}
							var num2 = cardy.length - cardx.length;
							num2 = Math.ceil(num2 / 2) + (num2 % 2 == 0 ? 1 : 0);
							cardy.sort((a, b) => get.value(b) - get.value(a));
							cardx.addArray(cardy.slice(num, cardy.length));
							return [cardx, cardy.slice(0, num)];
					}
				})
				.set("cards", cards)
				.forResult();
			if (result?.bool) {
				await target.gain(result.moved[0], "gain2");
				await player.gain(result.moved[1], "gain2");
				if (result.moved[0].length > result.moved[1].length) {
					const result2 = await player
						.chooseBool("是否对" + get.translation(target) + "造成1点伤害？")
						.set("choice", get.damageEffect(target, player, player) > 0)
						.forResult();
					if (result2?.bool) {
						player.line(target);
						await target.damage();
					}
				}
			}
		},
		subSkill: {
			sunben: {
				charlotte: true,
				init(player, skill) {
					player.setStorage(`${skill}_limit`, game.players.length + game.dead.length);
					player.setStorage(skill, 0, true);
				},
				onremove(player, skill) {
					player.setStorage(`${skill}_limit`, null);
					player.setStorage(skill, null, true);
				},
				mark: true,
				intro: {
					markcount(num) {
						return (num || 0).toString();
					},
					content(storage, player) {
						const num1 = storage || 0,
							num2 = player.countMark("twlijian_sunben_limit");
						return `弃牌堆进入牌进度：${num1}/${num2}`;
					},
				},
				trigger: {
					global: ["loseAfter", "cardsDiscardAfter", "loseAsyncAfter", "equipAfter"],
				},
				filter(event, player) {
					var cards = event.getd();
					if (!cards.length) {
						return false;
					}
					var list = cards.slice();
					game.checkGlobalHistory(
						"cardMove",
						function (evt) {
							if (evt == event || evt.getParent() == event || (evt.name != "lose" && evt.name != "cardsDiscard")) {
								return false;
							}
							if (evt.name == "lose" && evt.position != ui.discardPile) {
								return false;
							}
							list.removeArray(evt.cards);
						},
						event
					);
					return list.length > 0;
				},
				forced: true,
				popup: false,
				firstDo: true,
				content() {
					"step 0";
					var cards = trigger.getd().slice();
					game.checkGlobalHistory(
						"cardMove",
						function (evt) {
							if (evt == trigger || evt.getParent() == trigger || (evt.name != "lose" && evt.name != "cardsDiscard")) {
								return false;
							}
							if (evt.name == "lose" && evt.position != ui.discardPile) {
								return false;
							}
							cards.removeArray(evt.cards);
						},
						trigger
					);
					player.addMark("twlijian_sunben", cards.length, false);
					"step 1";
					if (player.countMark("twlijian_sunben") >= player.countMark("twlijian_sunben_limit")) {
						player.removeSkill("twlijian_sunben");
						if (player.hasSkill("twlijian", null, null, false) && !player.hasSkill("twlijian")) {
							player.popup("力谏");
							player.restoreSkill("twlijian");
							game.log(player, "恢复了技能", "#g【力谏】");
						}
					}
				},
			},
		},
	}
```

### twchungang 名字:纯刚
描述: 游戏开始时或出牌阶段限一次，你可以令至多两名角色各摸一张牌，其他角色使用以此法获得的牌时，弃置一张牌。
```js
twchungang: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		enable: "phaseUse",
		filter(event, player, name) {
			if (!name) {
				return !player.hasSkill("twchungang_used");
			}
			return event.name != "phase" || game.phaseNumber == 0;
		},
		filterTarget: true,
		selectTarget: [1, 2],
		multiline: true,
		multitarget: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), [1, 2])
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "draw" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			if (!event.triggername) {
				player.addTempSkill("twchungang_used", { global: "phaseChange" });
			}
			const skill = `${event.name}_${player.playerid}`;
			game.addTempTag(skill, `纯刚·${get.translation(player.name)}`);
			const draw = async target => {
				target.addSkill("twchungang_effect");
				const next = target.draw("nodelay");
				next.gaintag.add(skill);
				await next;
			};
			await game.doAsyncInOrder(event.targets, draw);
		},
		ai: {
			order: 9,
			result: {
				target: 1,
			},
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
			effect: {
				charlotte: true,
				trigger: {
					player: "useCard",
				},
				getIndex(event, player) {
					return event.cards ?? [];
				},
				filter(event, player, name, card) {
					if (!card?.cardid) {
						return false;
					}
					return player.hasHistory("lose", evt => {
						const evtx = evt.relatedEvent || evt.getParent();
						if (evtx != event) {
							return false;
						}
						const tags = evt.gaintag_map[card.cardid];
						return tags?.some(tag => {
							return tag.startsWith("twchungang_") && tag.slice(11) !== player.playerid;
						});
					});
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					await player.chooseToDiscard("he", true);
				},
			},
		},
	}
```

## tw_gongsunfan 名字:公孙范 势力:qun

### twhuiyuan 名字:回援
描述: `当你于出牌阶段使用牌结算结束后，若你未于此阶段获得过此类型的牌，你可以展示一名角色的一张手牌，若此牌与你使用的牌类型相同，你获得此牌，否则你弃置此牌，然后其摸一张牌。${get.poptip("rule_youji")}：对其造成1点伤害。`
```js
twhuiyuan: {
		audio: 2,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			var evt = event.getParent("phaseUse");
			if (!evt || evt.player != player) {
				return false;
			}
			var type = get.type2(event.card);
			return !player.hasHistory("gain", evtx => {
				if (evtx.getParent("phaseUse") != evt) {
					return false;
				}
				return evtx.cards.some(card => get.type2(card) == type);
			});
		},
		direct: true,
		content() {
			"step 0";
			var prompt2 = "展示一名角色的一张手牌。若展示牌为" + get.translation(get.type2(trigger.card)) + "牌，则你获得之，否则其弃置之并摸一张牌。然后若其在你的攻击范围内，且你不在其攻击范围内，你对其造成1点伤害";
			player
				.chooseTarget(get.prompt("twhuiyuan"), prompt2, (card, player, target) => {
					return target.countCards("h");
				})
				.set("ai", target => {
					var player = _status.event.player;
					var att = get.attitude(player, target);
					return -att + (player.inRange(target) && !target.inRange(player) ? get.damageEffect(target, player, player) / 3 : 0);
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twhuiyuan", target);
				player.choosePlayerCard(target, "h", true, "回援：展示" + get.translation(target) + "一张手牌");
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				var card = result.cards[0];
				target.showCards([card], get.translation(target) + "【回援】展示");
				if (get.type2(card) == get.type2(trigger.card)) {
					if (lib.filter.canBeGained(card, target, player)) {
						player.gain(card, target, "giveAuto", "bySelf");
					}
				} else {
					if (lib.filter.canBeDiscarded(card, target, player)) {
						target.discard(card, player);
						target.draw();
					}
				}
			} else {
				event.finish();
			}
			"step 3";
			if (player.inRange(target) && !target.inRange(player)) {
				game.log(player, "触发了", "#y搏击", "效果");
				player.line(target);
				target.damage();
			}
		},
		ai: {
			expose: 0.2,
			threaten: 3,
		},
	}
```

### twshoushou 名字:收绶
描述: ①当你获得其他角色的牌时，若你在任意角色的攻击范围内，其他角色至你的距离+1。②当你造成或受到伤害后，若你不在任意其他角色的攻击范围内，其他角色至你的距离-1。
```js
twshoushou: {
		audio: 2,
		trigger: {
			player: "gainAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			var cards = event.getg(player);
			if (!cards.length) {
				return false;
			}
			return (
				game.hasPlayer(current => {
					return event.getl(current).cards2.length;
				}) &&
				game.hasPlayer(current => {
					return current.inRange(player);
				})
			);
		},
		forced: true,
		locked: false,
		group: "twshoushou_damage",
		onremove(player) {
			if (player.countMark("twshoushou_plus") - player.countMark("twshoushou_minus") == 0) {
				player.removeSkill("twshoushou_distance");
			}
		},
		content() {
			player.addSkill("twshoushou_distance");
			player.addMark("twshoushou_plus", 1, false);
		},
		ai: {
			neg: true,
		},
		subSkill: {
			damage: {
				audio: "twshoushou",
				trigger: {
					player: "damageEnd",
					source: "damageSource",
				},
				filter(event, player) {
					return game.hasPlayer(current => {
						return current != player && !current.inRange(player);
					});
				},
				forced: true,
				locked: false,
				content() {
					player.addSkill("twshoushou_distance");
					player.addMark("twshoushou_minus", 1, false);
				},
			},
			distance: {
				mark: true,
				marktext: "绶",
				intro: {
					markcount(storage, player) {
						return player.countMark("twshoushou_plus") - player.countMark("twshoushou_minus");
					},
					content(storage, player) {
						var dis = player.countMark("twshoushou_plus") - player.countMark("twshoushou_minus");
						return "其他角色至你的距离" + (dis >= 0 ? "+" : "") + dis;
					},
				},
				mod: {
					globalTo(from, to, distance) {
						return distance + to.countMark("twshoushou_plus") - to.countMark("twshoushou_minus");
					},
				},
			},
		},
	}
```

## tw_yangang 名字:严纲 势力:qun

### twzhiqu 名字:直取
描述: `结束阶段，你可以选择一名其他角色并依次使用牌堆顶X张牌中的【杀】。${get.poptip("rule_boji")}：依次使用牌堆顶X张牌中的锦囊牌（X为你距离不大于1内的角色数，且你或其以外的角色不是你以此法使用牌的合法目标）。`
```js
twzhiqu: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		content() {
			"step 0";
			var count = get.cnNumber(
				game.countPlayer(current => {
					return get.distance(player, current) <= 1;
				})
			);
			player.chooseTarget(get.prompt("twzhiqu"), "选择一名其他角色并视为使用牌堆顶" + count + "张牌中的【杀】。若你与其均在对方的攻击范围内，你改为依次对其使用牌堆顶" + count + "张牌中的【杀】或锦囊牌。", lib.filter.notMe).set("ai", target => {
				var player = _status.event.player;
				return get.effect(target, { name: "sha" }, player, player) * (get.distance(player, target) == 1 ? 2 : 1);
			});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twzhiqu", target);
				event.fight = player.inRange(target) && target.inRange(player);
				if (event.fight) {
					game.log(player, "触发了", "#y搏击", "效果");
				}
				event.cards = game
					.cardsGotoOrdering(
						get.cards(
							game.countPlayer(current => {
								return get.distance(player, current) <= 1;
							})
						)
					)
					.cards.slice();
			} else {
				event.finish();
			}
			"step 2";
			if (player.isIn() && target.isIn() && cards.length) {
				do {
					var card = cards.shift();
				} while (get.name(card) != "sha" && (!event.fight || get.type2(card) != "trick") && cards.length);
				if (get.name(card) != "sha" && (!event.fight || get.type2(card) != "trick")) {
					return;
				}
				player.showCards([card], get.translation(player) + "发动了【直取】");
				player
					.chooseUseTarget(card, true, false, "nodistance")
					.set("filterTarget", function (card, player, target) {
						var evt = _status.event;
						if (_status.event.name == "chooseTarget") {
							evt = evt.getParent();
						}
						if (target != player && target != evt.twzhiqu_target) {
							return false;
						}
						return lib.filter.targetEnabledx(card, player, target);
					})
					.set("twzhiqu_target", target);
				event.redo();
			}
		},
	}
```

### twxianfeng 名字:先锋
描述: 当你于出牌阶段使用【杀】或伤害类锦囊牌对其他角色造成伤害后，你可以令受伤角色选择一项：1.其摸一张牌，然后直到你下个回合开始时，你至其他角色的距离-1；2.你摸一张牌，然后直到你下个回合开始时，其至你的距离-1。
```js
twxianfeng: {
		audio: 2,
		trigger: { source: "damageSource" },
		filter(event, player) {
			if (!player.isPhaseUsing()) {
				return false;
			}
			if (player == event.player) {
				return false;
			}
			if (!event.player.isIn()) {
				return false;
			}
			if (!event.card) {
				return false;
			}
			return event.card.name == "sha" || (get.type(event.card) == "trick" && get.tag(event.card, "damage"));
		},
		logTarget: "player",
		check(event, player) {
			let att = get.attitude(player, event.player);
			if (att > 0) {
				return true;
			}
			if (!player.hasSkill("twzhiqu")) {
				return false;
			}
			let cnt = game.countPlayer(current => get.distance(player, current) === 2);
			if (cnt > 2 || (cnt === 2 && Math.abs(att) < 2) || (cnt && Math.abs(att) < 1)) {
				return true;
			}
			return false;
		},
		content() {
			"step 0";
			var target = trigger.player;
			event.target = target;
			target
				.chooseControl()
				.set("choiceList", ["你摸一张牌，然后直到" + get.translation(player) + "下个回合开始时，其至其他角色的距离-1", get.translation(player) + "摸一张牌，然后直到其下个回合开始时，你至其的距离-1"])
				.set("prompt", "先锋：请选择一项")
				.set("ai", () => {
					return _status.event.choice;
				})
				.set(
					"choice",
					(function () {
						var att = get.attitude(target, player);
						if (att === 0) {
							return 0;
						}
						if (player.hasSkill("twzhiqu")) {
							var cnt = game.countPlayer(current => get.distance(player, current) === 2);
							if (att > 0) {
								if (cnt || player.needsToDiscard(1)) {
									return 0;
								}
								return 1;
							}
							if (!cnt) {
								return 0;
							}
							if (cnt >= 2 || get.distance(target, player, "attack") === 2 || get.distance(target, player) === 2) {
								return 1;
							}
							return 0;
						}
						if (
							att < 0 ||
							(player.needsToDiscard(1) &&
								game.hasPlayer(function (current) {
									return current !== player && current !== target && !player.inRange(current);
								}))
						) {
							return 0;
						}
						return [0, 1].randomGet();
					})()
				);
			"step 1";
			if (result.index == 0) {
				target.draw();
				player.addTempSkill("twxianfeng_me", { player: "phaseBegin" });
				player.addMark("twxianfeng_me", 1, false);
			} else {
				player.draw();
				target.addSkill("twxianfeng_others");
				game.broadcastAll(
					(target, id) => {
						if (!target.storage.twxianfeng_others) {
							target.storage.twxianfeng_others = {};
						}
						if (typeof target.storage.twxianfeng_others[id] !== "number") {
							target.storage.twxianfeng_others[id] = 1;
						} else {
							target.storage.twxianfeng_others[id]++;
						}
					},
					target,
					player.playerid
				);
			}
		},
		subSkill: {
			me: {
				charlotte: true,
				mark: true,
				intro: { content: "至其他角色的距离-#" },
				mod: {
					globalFrom(from, to, distance) {
						return distance - from.countMark("twxianfeng_me");
					},
				},
			},
			others: {
				trigger: { global: ["phaseBegin", "die"] },
				filter(event, player) {
					return player.storage.twxianfeng_others && player.storage.twxianfeng_others[event.player.playerid];
				},
				charlotte: true,
				mark: true,
				forced: true,
				intro: {
					markcount(storage, player) {
						var max = 0;
						for (var id in storage) {
							if (storage[id] > max) {
								max = storage[id];
							}
						}
						return max;
					},
					content(storage, player) {
						if (!storage) {
							return "";
						}
						var str = "";
						var map = _status.connectMode ? lib.playerOL : game.playerMap;
						for (var id in storage) {
							str += "至" + get.translation(map[id]) + "的距离-" + storage[id] + "、";
						}
						return str.slice(0, -1);
					},
				},
				content() {
					delete player.storage.twxianfeng_others[trigger.player.playerid];
					if (get.is.empty(player.storage.twxianfeng_others)) {
						player.removeSkill("twxianfeng_others");
					}
				},
				mod: {
					globalFrom(from, to, distance) {
						if (from.storage.twxianfeng_others && typeof from.storage.twxianfeng_others[to.playerid] == "number") {
							return distance - from.storage.twxianfeng_others[to.playerid];
						}
					},
				},
			},
		},
	}
```

## xia_xiahouzie 名字:夏侯紫萼 势力:qun

### twxuechang 名字:血偿
描述: 出牌阶段限两次，你可以摸一张牌并与一名其他角色拼点。若你赢，你获得其至多两张牌，若其中有装备牌，则你视为对其使用一张无距离和次数限制且不计入次数的【杀】。若你没赢，你受到其造成的1点伤害，然后你下次对其造成的伤害+1。
```js
twxuechang: {
		audio: 2,
		enable: "phaseUse",
		usable: 2,
		filterTarget(card, player, target) {
			return player.canCompare(target, true);
		},
		async content(event, trigger, player) {
			const { target } = event;
			await player.draw();
			if (!player.canCompare(target)) {
				return;
			}
			const result = await player.chooseToCompare(target).forResult();
			if (result?.bool) {
				if (!target.countGainableCards(player, "he")) {
					return;
				} else {
					const result2 = await player.gainPlayerCard(target, "he", [1, 2], true).forResult();
					if (result2?.cards?.length) {
						if (result2.cards.some(card => get.type(card) == "equip")) {
							const card = { name: "sha", isCard: true };
							if (player.canUse(card, target, false, false)) {
								await player.useCard(card, target, "noai", false);
							}
						}
					}
				}
			} else {
				await player.damage(target);
				player.addSkill("twxuechang_add");
				if (!player.storage.twxuechang_add) {
					player.storage.twxuechang_add = {};
				}
				if (!player.storage.twxuechang_add[target.playerid]) {
					player.storage.twxuechang_add[target.playerid] = 0;
				}
				player.storage.twxuechang_add[target.playerid]++;
				player.markSkill("twxuechang_add");
			}
		},
		ai: {
			order: 6.5,
			result: {
				target(player, target) {
					var hs = player.getCards("h").sort(function (a, b) {
						return get.number(b) - get.number(a);
					});
					var ts = target.getCards("h").sort(function (a, b) {
						return get.number(b) - get.number(a);
					});
					if (!hs.length || !ts.length) {
						return 0;
					}
					if (get.attitude(player, target) < 0 && (get.number(hs[0]) > get.number(ts[0]) || get.number(hs[0]) - ts.length >= 9 + Math.min(2, player.hp / 2))) {
						return get.sgnAttitude(player, target) * get.effect(target, { name: "shunshou_copy2" }, player, player);
					}
					return 0;
				},
			},
		},
		subSkill: {
			add: {
				audio: "twxuechang",
				trigger: { source: "damageBegin1" },
				filter(event, player) {
					return player.storage.twxuechang_add && player.storage.twxuechang_add[event.player.playerid];
				},
				forced: true,
				charlotte: true,
				async content(event, trigger, player) {
					trigger.num += player.storage.twxuechang_add[trigger.player.playerid];
					delete player.storage.twxuechang_add[trigger.player.playerid];
					if (get.is.empty(player.storage.twxuechang_add)) {
						player.removeSkill("twxuechang_add");
					} else {
						player.markSkill("twxuechang_add");
					}
				},
				marktext: "偿",
				intro: {
					content(storage, player) {
						if (!storage) {
							return "";
						}
						var str = "";
						var map = _status.connectMode ? lib.playerOL : game.playerMap;
						for (var i in storage) {
							str += "<li>下次对" + get.translation(map[i]) + "造成的伤害+" + storage[i];
						}
						return str;
					},
				},
			},
		},
	}
```

### twduoren 名字:夺刃
描述: 一名其他角色死亡后，若你对其造成过伤害或其对你造成过伤害，则你可以失去所有非自己武将牌上的技能，然后获得其武将牌上所有技能（主公技、隐匿技除外）。
```js
twduoren: {
		audio: 2,
		trigger: { global: "dieAfter" },
		check(event, player) {
			const skills = event.player.getStockSkills(true, true).filter(skill => {
				if (player.hasSkill(skill, null, false, false)) {
					return false;
				}
				const info = get.info(skill);
				return info && !info.hiddenSkill && !info.zhuSkill && !info.charlotte;
			});
			return skills.length > 0;
		},
		//group: "twduoren_remove",
		prompt2(event, player) {
			const skills = event.player.getStockSkills(true, true).filter(skill => {
				/*if (player.hasSkill(skill, null, false, false)) {
					return false;
				}*/
				const info = get.info(skill);
				return info && !info.hiddenSkill && !info.zhuSkill && !info.charlotte;
			});
			let str1 = "";
			for (const i of skills) {
				str1 += "〖" + get.translation(i) + "〗、";
			}
			str1 = str1.slice(0, str1.length - 1);
			let str2 = "";
			for (const i of player.getSkills(null, false, false).filter(skill => {
				const info = get.info(skill);
				return info && !info.charlotte && !player.getStockSkills(true, true).includes(skill);
			})) {
				str2 += "〖" + get.translation(i) + "〗、";
			}
			str2 = str2.slice(0, str2.length - 1);
			return `${str2.length ? `失去${str2}，然后` : ""}${str1.length ? "获得" + str1 : "听一句技能配音"}`;
		},
		filter(event, player) {
			return event.player != player && (player.hasAllHistory("sourceDamage", evt => evt.player == event.player) || player.hasAllHistory("damage", evt => evt.source == event.player)) && !event.reserveOut;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.changeSkills(
				trigger.player.getStockSkills(true, true).filter(skill => {
					const info = get.info(skill);
					return info && !info.hiddenSkill && !info.zhuSkill && !info.charlotte;
				}),
				player.getSkills(null, false, false).filter(skill => {
					const info = get.info(skill);
					return info && !info.charlotte && !player.getStockSkills(true, true).includes(skill);
				})
			);
		},
		/*content() {
			"step 0";
			player.loseMaxHp();
			"step 1";
			var skills = trigger.player.getSkills(null, false, false).filter(skill => {
				if (player.hasSkill(skill, null, false, false)) {
					return false;
				}
				var info = get.info(skill);
				return info && !info.hiddenSkill && !info.zhuSkill && !info.charlotte;
			});
			if (skills.length) {
				//for(var i of skills) player.addSkillLog(i);
				player.addSkills(skills);
				player.markAuto("twduoren", skills);
				game.broadcastAll(function (list) {
					game.expandSkills(list);
					for (var i of list) {
						var info = lib.skill[i];
						if (!info) {
							continue;
						}
						if (!info.audioname2) {
							info.audioname2 = {};
						}
						info.audioname2.xia_xiahouzie = "twduoren";
					}
				}, skills);
			}
		},
		subSkill: {
			remove: {
				audio: "twduoren",
				trigger: { source: "dying" },
				filter(event, player) {
					return (
						event.player != player &&
						player.getStorage("twduoren").some(skill => {
							return player.hasSkill(skill, null, false, false);
						})
					);
				},
				forced: true,
				locked: false,
				content() {
					player.removeSkills(player.getStorage("twduoren"));
					delete player.storage.twduoren;
				},
			},
		},*/
	}
```

## xia_zhaoe 名字:赵娥 势力:qun

### twyanshi 名字:言誓
描述: ①游戏开始时，你选择一名其他角色，称为“言誓”角色。②当你或“言誓”角色每回合首次受到伤害后，你摸三张牌并令伤害来源获得1枚“誓”标记（至多3枚）。③出牌阶段，你可以将一张手牌当作单目标伤害牌对一名有“誓”的角色使用，此牌结算后移除其一个“誓”。
```js
twyanshi: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			const cards = event.twyanshi;
			return cards?.length > 0 && player.countCards("hs") > 0;
		},
		onChooseToUse(event) {
			if (game.online || event.twyanshi) {
				return;
			}
			const targets = game.filterPlayer(current => {
					return current.hasMark("twyanshi_mark");
				}),
				player = event.player;
			if (!targets?.length) {
				event.set("twyanshi", []);
				return;
			}
			const list = get.inpileVCardList(list => {
				const info = lib.card[list[2]];
				if (!info || info.notarget || (info.selectTarget && info.selectTarget != 1)) {
					return false;
				}
				if (!get.tag({ name: list[2] }, "damage")) {
					return false;
				}
				return targets?.some(target => player.canUse(list[2], target));
			});
			event.set("twyanshi", list);
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("言誓", [event.twyanshi, "vcard"], "hidden");
			},
			check(button) {
				var player = _status.event.player,
					card = { name: button.link[2] };
				return player.getUseValue(card);
			},
			backup(links, player) {
				return {
					audio: "twyanshi",
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						storage: {
							twyanshi: true,
						},
					},
					ai1: card => 7 - get.value(card),
					async precontent(event, trigger, player) {
						player.addTempSkill("twyanshi_remove");
					},
					filterCard: true,
					position: "hs",
					popname: true,
				};
			},
			prompt(links, player) {
				return `将一张手牌当做${get.translation(links[0][3]) || ""}${get.translation(links[0][2])}对有“誓”的角色使用`;
			},
		},
		ai: {
			order: 6,
			result: { player: 1 },
		},
		locked: false,
		mod: {
			playerEnabled(card, player, target) {
				if (card?.storage?.twyanshi && !target?.hasMark("twyanshi_mark")) {
					return false;
				}
			},
			/*targetInRange(card, player, target) {
				if (target.hasMark("twyanshi_mark")) {
					return true;
				}
			},*/
		},
		onremove: true,
		intro: {
			content: "players",
		},
		group: ["twyanshi_hurt", "twyanshi_init"],
		subSkill: {
			hurt: {
				audio: "twyanshi",
				trigger: {
					global: "damageEnd",
				},
				forced: true,
				locked: false,
				filter(event, player) {
					if (!player.getStorage("twyanshi").includes(event.player) && player != event.player) {
						return false;
					}
					return event.player.getHistory("damage").indexOf(event) == 0;
				},
				async content(event, trigger, player) {
					await player.draw(3);
					if (trigger.source?.isIn() && trigger.source.countMark("twyanshi_mark") < 3) {
						const target = trigger.source;
						player.line(target, "green");
						target.addMark("twyanshi_mark", 1);
					}
				},
			},
			init: {
				audio: "twyanshi",
				trigger: { global: "phaseBefore", player: "enterGame" },
				locked: true,
				filter(event, player) {
					return game.hasPlayer(current => current != player) && (event.name != "phase" || game.phaseNumber == 0);
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget("言誓：选择一名其他角色", lib.filter.notMe, true)
						.set("ai", target => get.attitude(_status.event.player, target))
						.forResult();
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					player.markAuto("twyanshi", [target]);
				},
			},
			remove: {
				trigger: {
					player: "useCardAfter",
				},
				filter(event, player) {
					return (
						event.card?.storage?.twyanshi &&
						event.targets?.some(target => {
							return target.isIn() && target.countMark("twyanshi_mark");
						})
					);
				},
				charlotte: true,
				async cost(event, trigger, player) {
					const targets = trigger.targets.filter(target => {
						return target.isIn() && target.countMark("twyanshi_mark");
					});
					player.line(targets, "fire");
					targets.forEach(target => {
						target.removeMark("twyanshi_mark", 1);
					});
				},
			},
			backup: {},
			mark: {
				marktext: "誓",
				intro: {
					name: "誓",
					name2: "誓",
					content: "mark",
				},
			},
		},
	}
```

### twrenchou 名字:刃仇
描述: 锁定技。当你死亡时，你令“言誓”角色获得〖言誓〗；当“言誓”角色死亡后，拥有“誓”的角色不能响应你使用的牌。
```js
twrenchou: {
		audio: 2,
		trigger: { global: ["die", "dieAfter"] },
		forced: true,
		forceDie: true,
		filter(event, player, name) {
			if (name == "die") {
				return event.player == player && player.getStorage("twyanshi").some(i => i.isIn());
			}
			return player.getStorage("twyanshi").includes(event.player);
		},
		skillAnimation: true,
		animationColor: "water",
		async content(event, trigger, player) {
			if (trigger.player == player) {
				for (const current of player.getStorage("twyanshi").sortBySeat(_status.currentPhase)) {
					if (current.isIn()) {
						player.line(current, "green");
						await current.addSkills("twyanshi");
					}
				}
			} else {
				player.addSkill("twrenchou_fuqi");
			}
		},
		ai: {
			combo: "twyanshi",
		},
		subSkill: {
			fuqi: {
				trigger: {
					player: "useCard",
				},
				charlotte: true,
				filter(event, player) {
					const targets = get.info("twrenchou_fuqi")?.logTarget(event, player);
					return targets?.length;
				},
				logTarget(event, player) {
					return game.filterPlayer(current => {
						return current.countMark("twyanshi_mark");
					});
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					trigger.directHit.addArray(event.targets);
				},
			},
			ai: {
				ai: {
					effect: {
						target(card, player, target) {
							if (!get.tag(card, "damage")) {
								return;
							}
							if (target.hp > 1) {
								return;
							}
							var num = 0;
							game.filterPlayer(current => {
								if (current.getStorage("twyanshi").some(i => target == i)) {
									num += current.hp;
								}
							});
							var targets = target.getStorage("twyanshi").filter(i => i.isIn());
							for (var targetx of targets) {
								num += targetx.hp;
							}
							if (num >= player.hp) {
								return 0;
							}
							if (num > 0) {
								return [1, 0, 0, 0.5 - 1.5 * num];
							}
						},
					},
				},
			},
		},
	}
```

## xia_lusu 名字:侠鲁肃 势力:qun

### twkaizeng 名字:慨赠
描述: 其他角色的出牌阶段限一次。其可以选择一种基本牌的牌名或非基本牌的类型，然后令你选择是否交给其任意张手牌。若你以此法：交给其至少两张牌，你摸一张牌；交给其的牌中包含其选择的牌名或类型的牌，你获得一张与此牌名或类型不同的牌。
```js
twkaizeng: {
		audio: 2,
		global: "twkaizeng_want",
		refuseInfo: ["不给", "拒绝"],
		subSkill: {
			want: {
				audio: "twkaizeng",
				forceaudio: true,
				enable: "phaseUse",
				charlotte: true,
				prompt: "点击“确定”来寻求施舍",
				filter(event, player) {
					if (player.hasSkill("twkaizeng_used")) {
						return false;
					}
					return game.hasPlayer(current => current != player && current.hasSkill("twkaizeng") && current.countCards("h"));
				},
				chooseButton: {
					dialog(event, player) {
						const targets = game.filterPlayer(current => current != player && current.hasSkill("twkaizeng") && current.countCards("h"));
						return ui.create.dialog("###慨赠###" + "选择一种基本牌的牌名或非基本牌的类型，然后令" + get.translation(targets) + (targets.length > 1 ? "中的一人" : "") + "选择是否交给你任意张手牌");
					},
					chooseControl() {
						const list = [];
						const basic = [];
						for (let i = 0; i < lib.inpile.length; i++) {
							const name = lib.inpile[i];
							const type = get.type2(name);
							if (type == "basic") {
								list.push(name);
								basic.push(name);
							} else {
								list.add(type);
							}
						}
						list.push("cancel2");
						return list;
					},
					check(event, player) {
						if (Math.random() < 0.4) {
							const list = get.event().controls.slice();
							list.remove("du");
							return list.randomGet();
						}
						const targets = game.filterPlayer(current => current != player && current.hasSkill("twkaizeng") && current.countCards("h"));
						targets.sort((a, b) => get.attitude(player, b) - get.attitude(player, a));
						const cards = targets[0].getCards("h");
						const list = [];
						for (const card of cards) {
							const type = get.type2(card);
							if (type == "basic") {
								list.add(get.name(card));
							} else {
								list.add(type);
							}
						}
						const need = ["trick", "equip"].randomSort();
						need.addArray(["sha", "jiu"].randomSort());
						for (const type of need) {
							if (list.includes(type)) {
								return type;
							}
						}
						return list.randomGet();
					},
					backup(result, player) {
						return {
							audio: "twkaizeng",
							type: result.control,
							log: false,
							delay: false,
							filterTarget(card, player, target) {
								return target.hasSkill("twkaizeng");
							},
							selectTarget() {
								const player = get.player();
								const targets = game.filterPlayer(current => current != player && current.hasSkill("twkaizeng") && current.countCards("h"));
								return targets.length > 1 ? 1 : -1;
							},
							prepare(cards, player, targets) {
								targets[0].logSkill("twkaizeng_want", player);
							},
							async content(event, trigger, player) {
								player.addTempSkill("twkaizeng_used", "phaseUseAfter");
								const { target, name } = event;
								const type = lib.skill[name].type;
								const isbasic = lib.card[type];
								const { bool, cards } = await target
									.chooseToGive(player, `慨赠：是否交给${get.translation(player)}任意张手牌？`, `若你以此法：交给其至少两张牌，你摸一张牌；交给其的牌包含${get.translation(type)}${isbasic ? "" : "牌"}，你获得一张不为此牌名或类型的牌`, [1, Infinity])
									.set("allowChooseAll", true)
									.set("ai", card => {
										const { player, target, goon, type } = get.event();
										if (!goon) {
											return -get.value(card);
										}
										if (ui.selected.cards.length > player.countCards("h") / 2 && ui.selected.cards.length >= 2) {
											return 0;
										}
										const isbasic = lib.card[type];
										let add = 0;
										if (!ui.selected.cards.some(i => get[isbasic ? "name" : "type2"](i, target) == type)) {
											add += 3;
										}
										if (ui.selected.cards.length < 2) {
											add += 3;
										}
										return get.value(card, target) - get.value(card, player) + add;
									})
									.set("type", type)
									.set("goon", get.attitude(target, player) > 0)
									.forResult();
								if (bool) {
									if (cards.length > 1) {
										await target.draw();
									}
									const fn = isbasic ? "name" : "type2";
									if (cards.some(card => get[fn](card, player) == type)) {
										const card = get.cardPile(cardx => get[fn](cardx, target) != type);
										if (card) {
											await target.gain(card, "gain2");
										}
									}
									await game.delayx();
								} else {
									const refuseInfo = lib.skill.twkaizeng.refuseInfo.slice();
									if (get.attitude(target, player) < 0) {
										refuseInfo.push("没门");
									}
									target.chat(refuseInfo.randomGet());
								}
							},
							ai: { result: { target: 1 } },
						};
					},
					prompt: () => "请选择一名有【慨赠】的角色",
				},
				ai: {
					order: 10,
					result: {
						player(player) {
							if (game.hasPlayer(current => current != player && current.hasSkill("twkaizeng") && current.countCards("h") && get.attitude(player, current) > 0)) {
								return 1;
							}
							return 0;
						},
					},
				},
			},
			want_backup: {},
			used: { charlotte: true },
		},
		ai: { threaten: 3 },
	}
```

### twyangming 名字:扬名
描述: 出牌阶段结束时，你可以摸X张牌，且令本回合的手牌上限+X（X为你本阶段使用过的牌的类型数）。
```js
twyangming: {
		audio: 2,
		trigger: { player: "phaseUseEnd" },
		getNum: (event, player) =>
			player
				.getHistory("useCard", evt => evt.getParent("phaseUse") == event)
				.map(evt => get.type2(evt.card))
				.toUniqued().length,
		frequent: true,
		filter(event, player) {
			return get.info("twyangming").getNum(event, player);
		},
		async content(event, trigger, player) {
			const num = get.info(event.name).getNum(trigger, player);
			await player.draw(num);
			player.addTempSkill(event.name + "_limit");
			player.addMark(event.name + "_limit", num, false);
			game.log(player, "本回合的手牌上限", "#g+" + num);
		},
		subSkill: {
			limit: {
				charlotte: true,
				onremove: true,
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("twyangming_limit");
					},
				},
				intro: { content: "本回合手牌上限+#" },
			},
		},
	}
```

## xia_dianwei 名字:侠典韦 势力:qun

### twliexi 名字:烈袭
描述: 准备阶段，你可以弃置任意张牌并选择一名其他角色。若你以此法弃置的牌数大于其体力值，你对其造成1点伤害；否则其对你造成1点伤害。然后若你弃置的牌中有武器牌，你对其造成1点伤害。
```js
twliexi: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("he");
		},
		direct: true,
		chooseAi: (event, player) => {
			let cards = [],
				wq = []; //把武器牌和其他能弃置的牌分别按value从小到大排序
			player.getCards("he", card => {
				//[价值, id, 是否为武器牌]
				if (!lib.filter.cardDiscardable(card, player)) {
					return false;
				}
				if (get.subtype(card) == "equip1") {
					wq.push([get.value(card, player), card.cardid, true]);
				} else {
					cards.push([get.value(card, player), card.cardid]);
				}
			});
			cards.sort((a, b) => {
				return a[0] - b[0];
			});
			wq.sort((a, b) => {
				return a[0] - b[0];
			});
			let targets = [], //适合目标：[目标, 收益, 牌组]
				damage = get.damageEffect(player, player, event.player);
			game.countPlayer(cur => {
				if (player === cur) {
					return false;
				}
				let eff = get.damageEffect(cur, player, event.player);
				let dui = eff + damage - 2 * (wq.length ? wq[0][0] : cards[0][0]); //对砸
				if (eff <= 0) {
					if (dui > 0) {
						targets.push([cur, dui, [wq.length ? wq[0][1] : cards[0][1]]]);
					} //这都能卖血？！
					return false;
				}
				if (
					cards.length + wq.length <= cur.hp && //牌不够弃且没有武器可砸或者有但是太亏的不选
					(!wq.length || dui <= 0)
				) {
					return false;
				}
				let allcards = cards.concat(wq).sort((a, b) => {
						return a[0] - b[0];
					}),
					can; //所有可弃牌再从小到大排序
				if (allcards.length <= cur.hp) {
					//牌不够弃拿一张武器崩血的
					targets.push([cur, dui, [wq[0][1]]]);
					return false;
				}
				can = eff - allcards.slice(0, cur.hp + 1).reduce((acc, val) => acc + val[0], 0);
				if (!wq.length) {
					//没武器只能凑数砸的
					if (can > 0) {
						targets.push([cur, can, allcards.slice(0, cur.hp + 1).map(i => i[1])]);
					}
					return false;
				}
				let other = [wq[0]]; //拿最便宜的武器补刀
				for (let card of allcards) {
					if (other.length > cur.hp) {
						break;
					}
					if (wq[0][1] === card[1]) {
						continue;
					}
					other.push(card);
				}
				if (can < 2 * eff - other.reduce((acc, val) => acc + val[0], 0)) {
					//换一张武器牌的收益
					can = 2 * eff - other.reduce((acc, val) => acc + val[0], 0);
					allcards = other.map(i => i[1]);
				}
				if (dui > can) {
					can = dui;
					allcards = [wq[0][1]];
				}
				if (can > 0) {
					targets.push([cur, can, allcards]);
				} //这个时候can应该都是正的了，懒得再测了
			});
			if (targets.length) {
				return targets.sort((a, b) => {
					return b[1] - a[1];
				})[0];
			}
			return [null, 0, []];
		},
		content() {
			"step 0";
			player.chooseCardTarget({
				filterCard: lib.filter.cardDiscardable,
				selectCard: [1, Infinity],
				position: "he",
				filterTarget: lib.filter.notMe,
				prompt: get.prompt2("twliexi"),
				aiSelected: lib.skill.twliexi.chooseAi(_status.event, player),
				ai1(card) {
					if (get.event().aiSelected[2].includes(card.cardid)) {
						return 30 - get.value(card);
					}
					return 0;
				},
				ai2(target) {
					if (get.event().aiSelected[0] === target) {
						return 10;
					}
					return 0;
				},
				allowChooseAll: true,
			});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				var cards = result.cards;
				player.logSkill("twliexi", target);
				player.discard(cards);
				if (cards.length > target.hp) {
					target.damage();
				} else {
					player.damage(target);
				}
				var goon = false;
				for (var card of cards) {
					if (get.subtype(card) == "equip1") {
						goon = true;
						break;
					}
				}
				if (!goon) {
					event.finish();
				}
			} else {
				event.finish();
			}
			"step 2";
			game.delayx();
			target.damage();
		},
	}
```

### twshezhong 名字:慑众
描述: 结束阶段，若你：本回合对其他角色造成过伤害，你可以令至多X名其他角色下个摸牌阶段的额定摸牌数-1（X为你本回合造成的伤害值）；本回合受到过伤害，你可以将手牌摸至与其中一名伤害来源的体力值相同（至多摸至5）。
```js
twshezhong: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		content() {
			"step 0";
			var damage = player.getHistory("sourceDamage").length;
			if (damage) {
				player.chooseTarget(get.prompt("twshezhong"), "令至多" + get.cnNumber(damage) + "名其他角色下个摸牌阶段的摸牌数-1", [1, damage], lib.filter.notMe).set("ai", target => {
					return -get.attitude(_status.event.player, target);
				});
			} else {
				event.goto(2);
			}
			"step 1";
			if (result.bool) {
				var targets = result.targets;
				player.logSkill("twshezhong", targets);
				for (var target of targets) {
					target.addSkill("twshezhong_minus");
					target.addMark("twshezhong_minus", 1, false);
				}
			}
			"step 2";
			var targets = [];
			for (var evt of player.getHistory("damage")) {
				if (evt.source && evt.source.isIn()) {
					targets.add(evt.source);
				}
			}
			if (targets.length) {
				player
					.chooseTarget(get.prompt("twshezhong"), "将手牌摸至一名与一名本回合对你造成过伤害的角色的体力值相同，且至多摸至五张", (card, player, target) => {
						return _status.event.targets.includes(target);
					})
					.set("ai", target => {
						return Math.max(0.1, target.hp - _status.event.player.countCards("h"));
					})
					.set("targets", targets);
			} else {
				event.finish();
			}
			"step 3";
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("twshezhong", target);
				var num = Math.min(target.hp, 5) - player.countCards("h");
				if (num > 0) {
					player.draw(num);
				}
			}
		},
		subSkill: {
			minus: {
				trigger: { player: "phaseDrawBegin" },
				forced: true,
				onremove: true,
				content() {
					var num = player.countMark("twshezhong_minus");
					trigger.num -= num;
					game.log(player, "的额定摸牌数", "#g-" + num);
					player.removeSkill("twshezhong_minus");
				},
				mark: true,
				intro: {
					content: "额定摸牌数-#",
				},
			},
		},
	}
```

## tw_bingyuan 名字:邴原 势力:qun

### twbingde 名字:秉德
描述: 出牌阶段限一次。你可以选择一个本阶段未选择过的花色并弃置一张牌，你摸等同于本阶段你使用此花色的牌数，然后若你以此法弃置的牌的花色与你选择的花色相同，你令你〖秉德〗于此阶段发动的次数上限+1。
```js
twbingde: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("he") && player.getStorage("twbingde_clear").length < 4;
		},
		onChooseToUse(event) {
			if (event.type == "phase" && !game.online) {
				const map = {};
				event.player.getHistory("useCard", evt => {
					const evtx = evt.getParent("phaseUse"),
						suit = get.suit(evt.card);
					if (!lib.suit.includes(suit)) {
						return;
					}
					if (evtx != event.getParent("phaseUse")) {
						return;
					}
					if (typeof map[suit] != "number") {
						map[suit] = 0;
					}
					map[suit]++;
				});
				event.set("twbingde_map", map);
			}
		},
		chooseButton: {
			dialog(event, player) {
				let str = get.translation("twbingde_info"),
					str2 = "";
				if (event.twbingde_map) {
					str2 = '<div class="text center">本回合使用牌对应花色数：</div>';
					str2 += '<div class="text center">';
					for (const suit of lib.suit) {
						str2 += get.translation(suit) + "：" + get.cnNumber(event.twbingde_map[suit] || 0) + "张；";
					}
					str2 = str2.slice(0, str2.length - 1) + "</div>";
				}
				return ui.create.dialog("###秉德###" + str, str2);
			},
			chooseControl(event, player) {
				const list = lib.suit.slice();
				list.removeArray(player.getStorage("twbingde_clear"));
				list.push("cancel2");
				return list;
			},
			check(event, player) {
				const map = event.twbingde_map;
				const suit = lib.suit
					.filter(suit => !player.getStorage("twbingde_clear").includes(suit) && player.hasCard(card => get.suit(card) == suit, "he"))
					.sort((a, b) => {
						return map[b] - map[a];
					})[0];
				if (map[suit] == 0) {
					return "cancel2";
				}
				return suit;
			},
			backup(result, player) {
				return {
					audio: "twbingde",
					filterCard: lib.filter.cardDiscardable,
					position: "he",
					suit: result.control,
					check(card) {
						const suit = lib.skill.twbingde_backup.suit;
						if (get.suit(card) == suit) {
							return 10 - get.value(card);
						}
						return 6 - get.value(card);
					},
					async content(event, trigger, player) {
						const { suit } = get.info(event.name);
						let num = 0;
						player.popup(suit + 2);
						game.log(player, "选择了", "#y" + suit + 2);
						player.addTempSkill("twbingde_clear", "phaseUseAfter");
						player.markAuto("twbingde_clear", [suit]);
						player.getHistory("useCard", evt => {
							var evtx = evt.getParent("phaseUse"),
								suitx = get.suit(evt.card);
							if (!evtx || evtx != event.getParent("phaseUse") || suit != suitx) {
								return false;
							}
							num++;
						});
						if (num > 0) {
							await player.draw(num);
						}
						if (get.suit(event.cards[0], player) == suit && player.getStat("skill").twbingde) {
							delete player.getStat("skill").twbingde;
							game.log(player, "重置了", "#g【秉德】");
						}
					},
					ai: { result: { player: 1 } },
				};
			},
			prompt: () => "秉德：弃置一张牌",
		},
		ai: {
			order: 2,
			result: { player: 1 },
		},
		subSkill: {
			backup: {},
			clear: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

### twqingtao 名字:清滔
描述: ①摸牌阶段结束时，你可以重铸一张牌。若此牌为【酒】或非基本牌，你摸一张牌。②结束阶段，若你本回合未发动〖清滔①〗，你可以发动〖清滔①〗。
```js
twqingtao: {
		audio: 2,
		trigger: { player: ["phaseDrawEnd", "phaseJieshuBegin"] },
		filter(event, player) {
			if (!player.countCards("he")) {
				return false;
			}
			return event.name == "phaseDraw" || !player.hasHistory("custom", evt => evt.twqingtao);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(get.prompt2(event.skill), "he", lib.filter.cardRecastable)
				.set("ai", function (card) {
					if (card.name == "jiu" || get.type(card) != "basic") {
						return 10 - get.value(card);
					}
					return 6 - get.value(card);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { cards } = event;
			await player.recast(cards);
			if (trigger.name == "phaseDraw") {
				player.getHistory("custom").push({ [event.name]: true });
			}
			if (get.name(cards[0]) == "jiu" || get.type(cards[0], false, player) != "basic") {
				await player.draw();
			}
		},
	}
```

## tw_niufudongxie 名字:牛辅董翓 势力:qun

### twjuntun 名字:军屯
描述: ①游戏开始时或当其他角色死亡后，你可令一名角色获得〖凶军〗。②当其他角色造成伤害后，若其拥有〖凶军〗，你获得等同于此次伤害值的暴虐值。
```js
twjuntun: {
		audio: 2,
		trigger: {
			global: ["phaseBefore", "dieAfter"],
			player: "enterGame",
		},
		init(player) {
			lib.skill.baonvezhi.change(player, 0);
		},
		direct: true,
		derivation: ["twxiongjun", "baonvezhi_faq"],
		group: "twjuntun_extra",
		filter(event, player) {
			return (
				(event.name != "phase" || game.phaseNumber == 0) &&
				game.hasPlayer(current => {
					return !current.hasSkill("twxiongjun");
				})
			);
		},
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt("twjuntun"), "令一名角色获得〖凶军〗", (card, player, target) => {
					return !target.hasSkill("twxiongjun");
				})
				.set("ai", target => get.attitude(player, target) - 2);
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("twjuntun", target);
				target.addSkills("twxiongjun");
				if (target != player) {
					player.addExpose(0.25);
				}
			}
		},
		subSkill: {
			extra: {
				audio: 2,
				trigger: { global: "damageSource" },
				forced: true,
				locked: false,
				filter(event, player) {
					return event.source && event.source.hasSkill("twxiongjun") && event.source != player;
				},
				logTarget: "source",
				content() {
					lib.skill.baonvezhi.change(player, trigger.num);
				},
			},
		},
	}
```

### twxiongxi 名字:凶袭
描述: 出牌阶段限一次。你可以弃置X张牌对一名其他角色造成1点伤害（X为你的暴虐值与暴虐值上限之差）。
```js
twxiongxi: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		init(player) {
			lib.skill.baonvezhi.change(player, 0);
		},
		filterCard: () => true,
		selectCard() {
			return (lib.skill.baonvezhi.baonvezhi_max || 5) - _status.event.player.countMark("baonvezhi");
		},
		check(card) {
			return 8 - get.value(card);
		},
		position: "he",
		filterTarget(card, player, target) {
			return target != player;
		},
		content() {
			target.damage();
		},
		ai: {
			combo: "twjuntun",
			expose: 0.25,
			order: 1,
			result: {
				player(player, target) {
					let num = -ui.selected.cards.length;
					if (player.hasSkill("twxiongjun") && !player.storage.counttrigger?.twxiongjun) {
						num += game.countPlayer(current => {
							if (current.hasSkill("twxiongjun")) {
								return get.sgnAttitude(player, current);
							}
						});
					}
					return num * get.effect(player, { name: "draw" }, player, player);
				},
				target(player, target) {
					return get.damageEffect(target, player, target);
				},
			},
		},
	}
```

### twxiafeng 名字:黠凤
描述: 出牌阶段开始时，你可消耗至多3点暴虐值并获得如下效果直到回合结束：你使用的前X张牌没有距离和次数限制且不可被响应，你的手牌上限+X（X为你以此法消耗的暴虐值）。
```js
twxiafeng: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.countMark("baonvezhi") > 0;
		},
		init(player) {
			lib.skill.baonvezhi.change(player, 0);
		},
		direct: true,
		content() {
			"step 0";
			player
				.chooseButton(["黠凤：选择要消耗的暴虐值", [["tw_bn_1", "tw_bn_2", "tw_bn_3"], "vcard"]], button => {
					var num = player.countCards("hs", card => get.tag(card, "damage") && game.hasPlayer(current => get.effect(current, card, player, player) > 0));
					if (num <= 0) {
						return 0;
					}
					if (num >= 3) {
						num = 3;
					}
					if (button.link[2] == "tw_bn_" + num) {
						return 10;
					}
					return 1;
				})
				.set("filterButton", button => {
					var player = _status.event.player;
					var link = button.link[2];
					if (link[link.length - 1] * 1 > player.storage.baonvezhi) {
						return false;
					}
					return true;
				});
			"step 1";
			if (result.bool) {
				player.logSkill("twxiafeng");
				var link = result.links[0][2],
					num = link[link.length - 1] * 1;
				player.addTempSkill("twxiafeng_effect");
				player.storage.twxiafeng_effect = num;
				lib.skill.baonvezhi.change(player, -num);
			}
		},
		subSkill: {
			effect: {
				audio: "twxiafeng",
				trigger: { player: "useCard" },
				filter(event, player) {
					return !player.storage.twxiafeng_effect2;
				},
				forced: true,
				content() {
					var count = player.getHistory("useCard", evt => evt.getParent("phaseUse").player == player).length;
					if (count == player.storage.twxiafeng_effect) {
						player.storage.twxiafeng_effect2 = true;
					}
					if (count <= player.storage.twxiafeng_effect) {
						trigger.directHit.addArray(game.players);
						if (trigger.addCount !== false) {
							trigger.addCount = false;
							var stat = player.getStat().card,
								name = trigger.card.name;
							if (typeof stat[name] == "number") {
								stat[name]--;
							}
						}
					}
				},
				onremove(player) {
					delete player.storage.twxiafeng_effect;
					delete player.storage.twxiafeng_effect2;
				},
				mod: {
					targetInRange(card, player, target, now) {
						if (!player.storage.twxiafeng_effect2) {
							return true;
						}
					},
					cardUsableTarget(card, player, target) {
						if (!player.storage.twxiafeng_effect2) {
							return true;
						}
					},
					maxHandcard(player, num) {
						return num + (player.storage.twxiafeng_effect || 0);
					},
				},
			},
		},
		ai: {
			combo: "twjuntun",
		},
	}
```

## tw_jianshuo 名字:蹇硕 势力:qun

### twkunsi 名字:困兕
描述: `出牌阶段，你可以视为对一名未以此法选择过的其他角色使用一张【杀】。若此【杀】未造成伤害，其获得${get.poptip("twlinglu")}直到你下回合开始，且当你成为其〖令戮〗的目标后，其可令你于〖令戮〗失败时进行两次结算。`
```js
twkunsi: {
		audio: 2,
		enable: "phaseUse",
		onremove: true,
		derivation: "twlinglu",
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return player.canUse({ name: "sha", isCard: true }, current, false) && current != player && !player.getStorage("twkunsi").includes(current);
			});
		},
		filterTarget(card, player, target) {
			return player.canUse({ name: "sha", isCard: true }, target, false) && target != player && !player.getStorage("twkunsi").includes(target);
		},
		content() {
			"step 0";
			player.markAuto("twkunsi", [target]);
			player.storage.twkunsi.sortBySeat();
			player.markSkill("twkunsi");
			player.useCard({ name: "sha", isCard: true }, target, false).animate = false;
			"step 1";
			if (
				!player.hasHistory("sourceDamage", function (evt) {
					var card = evt.card;
					if (!card || card.name != "sha") {
						return false;
					}
					var evtx = evt.getParent("useCard");
					return evtx.card == card && evtx.getParent() == event;
				})
			) {
				player.line(target);
				target.markAuto("twlinglu", [player]);
				target.addAdditionalSkills("twkunsi_temp", "twlinglu");
				player.markAuto("twkunsi_clear", [target]);
				player.addTempSkill("twkunsi_clear", { player: "phaseBegin" });
			}
		},
		intro: { content: "已对$发动过〖困兕〗" },
		ai: {
			order() {
				return get.order({ name: "sha" }) - 0.1;
			},
			expose: 0.2,
			result: {
				target(player, target) {
					if (target.countCards("h") <= target.hp && !target.mayHaveShan(player, "use") && get.effect(target, { name: "sha", isCard: true }, player, player) > 0) {
						return -1;
					} else if (target.countCards("h") > target.hp && target.hp > 2 && target.hasShan()) {
						return 1;
					}
					return 0;
				},
			},
		},
		subSkill: {
			clear: {
				forced: true,
				onremove(player, skill) {
					var targets = player.getStorage(skill);
					for (var target of targets) {
						if (target.isIn()) {
							target.removeAdditionalSkill("twkunsi_temp");
						}
					}
				},
			},
		},
	}
```

## tw_jiangji 名字:TW蒋济 势力:wei

### twjichou 名字:急筹
描述: ①每回合限一次。你可以视为使用一张未被〖急筹①〗记录过的普通锦囊牌并记录此牌。②你无法响应或{使用对应实体牌包含你的手牌的}〖急筹①〗记录过的锦囊牌。③出牌阶段限一次。你可将手牌中任意张〖急筹①〗记录过的锦囊牌交给一名其他角色。
```js
twjichou: {
		audio: 3,
		enable: "chooseToUse",
		group: ["twjichou_ban", "twjichou_give"],
		filter(event, player) {
			if (player.hasSkill("twjichou_used") && player.hasSkill("twjichou_given")) {
				return false;
			}
			if (!player.hasSkill("twjichou_used")) {
				var record = player.getStorage("twjichou");
				for (var i of lib.inpile) {
					var type = get.type(i);
					if (type == "trick" && !record.includes(i) && event.filterCard({ name: i, isCard: true }, player, event)) {
						return true;
					}
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				var dialog = ui.create.dialog("急筹");
				if (
					!player.hasSkill("twjichou_used") &&
					!player.hasSkill("twjichou_given") &&
					event.type == "phase" &&
					player.countCards("h", card => {
						return player.getStorage("twjichou").includes(get.name(card));
					})
				) {
					dialog._chosenOpt = [];
					var table = document.createElement("div");
					table.classList.add("add-setting");
					table.style.margin = "0";
					table.style.width = "100%";
					table.style.position = "relative";
					var list = ["视为使用牌", "交出锦囊牌"];
					for (var i of list) {
						var td = ui.create.div(".shadowed.reduce_radius.pointerdiv.tdnode");
						td.innerHTML = "<span>" + i + "</span>";
						td.link = i;
						if (i == list[0]) {
							td.classList.add("bluebg");
							dialog._chosenOpt.add(td);
						}
						td.addEventListener(lib.config.touchscreen ? "touchend" : "click", function () {
							if (_status.dragged) {
								return;
							}
							if (_status.clicked) {
								return;
							}
							if (_status.justdragged) {
								return;
							}
							_status.tempNoButton = true;
							_status.clicked = true;
							setTimeout(function () {
								_status.tempNoButton = false;
							}, 500);
							var link = this.link;
							if (link == "交出锦囊牌") {
								game.uncheck();
							}
							var current = this.parentNode.querySelector(".bluebg");
							if (current) {
								current.classList.remove("bluebg");
								dialog._chosenOpt.remove(current);
							}
							dialog._chosenOpt.add(this);
							this.classList.add("bluebg");
							game.check();
						});
						table.appendChild(td);
						dialog.buttons.add(td);
					}
					dialog.content.appendChild(table);
				}
				var list = [],
					record = player.getStorage("twjichou");
				for (var name of lib.inpile) {
					if (get.type(name) == "trick" && !record.includes(name) && event.filterCard({ name: name, isCard: true }, player, event)) {
						list.push(["锦囊", "", name]);
					}
				}
				dialog.add([list, "vcard"]);
				return dialog;
			},
			filter(button) {
				if (_status.event.dialog) {
					var opts = _status.event.dialog._chosenOpt;
					if (opts && opts.length && opts[0].link == "交出锦囊牌" && typeof button.link != typeof opts[0].link) {
						return false;
					}
					return true;
				}
				return false;
			},
			select() {
				if (_status.event.dialog) {
					var opts = _status.event.dialog._chosenOpt;
					return opts && opts.length && opts[0].link == "交出锦囊牌" ? 0 : 1;
				}
				return 0;
			},
			check(button) {
				if (_status.event.getParent().type != "phase") {
					return 1;
				}
				var player = _status.event.player;
				if (["wugu", "zhulu_card", "yiyi", "lulitongxin", "lianjunshengyan", "diaohulishan"].includes(button.link[2])) {
					return 0.1;
				}
				return player.getUseValue({ name: button.link[2] });
			},
			backup(links, player) {
				var isUse = links.length == 1;
				var backup = get.copy(lib.skill["twjichou_" + (isUse ? "use" : "give")]);
				if (isUse) {
					backup.viewAs = { name: links[0][2], isCard: true };
				}
				return backup;
			},
			prompt(links, player) {
				var isUse = links.length == 1;
				return "急筹：" + (isUse ? "视为使用" + get.translation(links[0][2]) + "" : "选择要交出的牌和要交给的目标");
			},
		},
		hiddenCard(player, name) {
			if (player.hasSkill("twjichou_used")) {
				return false;
			}
			var type = get.type(name);
			return type == "trick" && !player.getStorage("twjichou").includes(name);
		},
		marktext: "筹",
		intro: {
			markcount(storage, player) {
				if (storage && storage.length) {
					return storage.length;
				}
				return 0;
			},
			content: "已记录牌名：$",
		},
		ai: {
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
		subSkill: {
			backup: {},
			used: { charlotte: true },
			given: { charlotte: true },
			ban: {
				trigger: { global: "useCard1" },
				filter(event, player) {
					return player.getStorage("twjichou").includes(event.card.name);
				},
				forced: true,
				locked: false,
				silent: true,
				content() {
					trigger.directHit.add(player);
				},
				mod: {
					cardEnabled(card, player) {
						if (player.getStorage("twjichou").includes(card.name) && (get.position(card) == "h" || (card.cards && card.cards.some(i => get.position(i) == "h")))) {
							return false;
						}
					},
					cardSavable(card, player) {
						if (player.getStorage("twjichou").includes(card.name) && (get.position(card) == "h" || (card.cards && card.cards.some(i => get.position(i) == "h")))) {
							return false;
						}
					},
					aiValue(player, card) {
						if (get.type(card) != "trick" || _status.twjichou_give_aiCheck) {
							return;
						}
						if (!player.getFriends().length && player.getStorage("twjichou").includes(get.name(card))) {
							return 0;
						}
					},
					aiUseful() {
						return lib.skill.twjichou_ban.mod.aiValue.apply(this, arguments);
					},
				},
			},
			use: {
				filterCard: () => false,
				selectCard: -1,
				audio: "twjichou",
				popname: true,
				onuse(links, player) {
					player.markAuto("twjichou", [links.card.name]);
					player.syncStorage("twjichou");
					player.addTempSkill("twjichou_used");
				},
			},
			give: {
				audio: "twjichou",
				enable: "phaseUse",
				filter(event, player) {
					return player.hasSkill("twjichou_used") && !player.hasSkill("twjichou_given") && player.countCards("h", i => player.getStorage("twjichou").includes(get.name(i)));
				},
				filterTarget(card, player, target) {
					return target != player;
				},
				filterCard(card, player) {
					return player.getStorage("twjichou").includes(get.name(card));
				},
				check(card) {
					_status.twjichou_give_aiCheck = true;
					var val = get.value(card);
					delete _status.twjichou_give_aiCheck;
					return val;
				},
				prompt: () => "选择要交出的牌和要交给的目标",
				selectCard: [1, Infinity],
				discard: false,
				lose: false,
				delay: false,
				allowChooseAll: true,
				content() {
					player.give(cards, target);
					player.addTempSkill("twjichou_given", "phaseUseAfter");
				},
				ai: {
					order: 0.9,
					result: {
						target(player, target) {
							if (target.hasSkillTag("nogain")) {
								return 0;
							}
							if (target.hasJudge("lebu")) {
								return 0;
							}
							return target.getCards("h", card => player.getStorage("twjichou").includes(get.name(card))).reduce((p, c) => p + (target.getUseValue(c) || 1), 0);
						},
					},
				},
			},
		},
	}
```

### twjilun 名字:机论
描述: 当你受到伤害后，你可以摸X张牌（X为〖急筹①〗记录数且至少为1，至多为5），或视为使用一张〖急筹①〗记录过且未被〖机论〗记录过的普通锦囊牌并记录此牌。
```js
twjilun: {
		audio: 2,
		trigger: { player: "damageEnd" },
		async cost(event, trigger, player) {
			const num = Math.min(Math.max(1, player.getStorage("twjichou").length), 5);
			const list = player
				.getStorage("twjichou")
				.filter(name => !player.getStorage(event.skill).includes(name))
				.map(name => ["锦囊", "", name]);
			if (list.length) {
				const result = await player
					.chooseButton([`###${get.prompt(event.skill)}###摸${get.cnNumber(num)}张牌或者视为使用一张牌`, [[[num, `摸${get.cnNumber(num)}张牌`]], "tdnodes"], [list, "vcard"]])
					.set("filterButton", button => {
						const { player, numx } = get.event();
						const { link } = button;
						if (!Array.isArray(link)) {
							return true;
						}
						return player.hasUseTarget({ name: link[2], nature: link[3] });
					})
					.set("ai", button => {
						const { player, numx } = get.event();
						const { link } = button;
						const val = numx > 3 ? Math.min(1.5, 1 + (numx - 3) * 0.1) : 1;
						if (Array.isArray(link)) {
							if (player.getUseValue({ name: link[2], nature: link[3] }) > 4 * val) {
								return 1;
							}
						}
						if (typeof link == "number") {
							return 1;
						}
						return 0;
					})
					.set("numx", num)
					.forResult();
				event.result = {
					bool: result?.bool,
					cost_data: result?.links,
				};
			} else {
				event.result = await player.chooseBool(get.prompt(event.skill), `摸${get.cnNumber(num)}张牌`).forResult();
				if (event.result?.bool) {
					event.result.cost_data = [num];
				}
			}
		},
		async content(event, trigger, player) {
			const { cost_data: links } = event;
			if (typeof links[0] == "number") {
				await player.draw(links[0]);
			} else {
				const card = get.autoViewAs({ name: links[0][2], nature: links[0][3], isCard: true });
				player.markAuto(event.name, [card.name]);
				await player.chooseUseTarget(card, true);
			}
		},
		marktext: "论",
		intro: { content: "已记录牌名：$" },
		onremove: true,
		ai: {
			maixie: true,
			maixie_defend: true,
			threaten: 0.7,
		},
	}
```

## tw_mateng 名字:TW马腾 势力:qun

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twxiongzheng 名字:雄争
描述: 每轮开始时，你可以选择一名未以此法选择过的角色，称为“雄争”角色。若如此做，本轮结束时，你可以选择一项：1.视为对任意名本轮内未对“雄争”角色造成过伤害的角色依次使用一张【杀】；2.令任意名本轮对“雄争”角色造成过伤害的角色摸两张牌。
```js
twxiongzheng: {
		audio: 2,
		onremove: true,
		trigger: { global: "roundStart" },
		filter(event, player) {
			return game.hasPlayer(target => !player.getStorage("twxiongzheng").includes(target));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "选择一名未选择过的角色，称为“雄争”角色", (card, player, target) => {
					return !player.getStorage("twxiongzheng").includes(target);
				})
				.set("ai", target => {
					var player = _status.event.player,
						att = get.attitude(player, target);
					if (game.roundNumber <= 1 && player.hasUnknown()) {
						return 0;
					}
					return -att;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			var target = event.targets[0];
			player.markAuto("twxiongzheng", [target]);
			player.storage.twxiongzheng_target = target;
			player.addTempSkill("twxiongzheng_mark", "roundStart");
			target.addTempSkill("twxiongzheng_threaten", "roundStart");
			await game.delayx();
		},
		subSkill: {
			mark: {
				charlotte: true,
				onremove(player, skill) {
					delete player.storage[skill];
					delete player.storage.twxiongzheng_target;
				},
				intro: { content: "$参与了〖雄争〗的争斗" },
				trigger: { global: "damage" },
				filter(event, player) {
					return event.player == player.storage.twxiongzheng_target && get.itemtype(event.source) == "player";
				},
				direct: true,
				firstDo: true,
				content() {
					player.markAuto("twxiongzheng_mark", [trigger.source]);
				},
				group: "twxiongzheng_effect",
			},
			threaten: {
				charlotte: true,
				mark: true,
				intro: { content: "本轮〖雄争〗目标" },
				ai: { threaten: 10 },
			},
			effect: {
				charlotte: true,
				audio: "twxiongzheng",
				trigger: { global: "roundEnd" },
				filter(event, player) {
					const sha = new lib.element.VCard({ name: "sha", isCard: true });
					return game.hasPlayer(target => player.getStorage("twxiongzheng_mark").includes(target) || player.canUse(sha, target, false));
				},
				async cost(event, trigger, player) {
					const target = player.storage.twxiongzheng_target;
					if (!target) {
						return;
					}
					const sha = new lib.element.VCard({ name: "sha", isCard: true });
					const list = game.filterPlayer(target => player.getStorage("twxiongzheng_mark").includes(target));
					const list2 = game.filterPlayer(target => !list.includes(target) && player.canUse(sha, target, false));
					let choiceList = [
						["sha", `视为对任意名本轮未对${get.translation(target)}造成过伤害的角色依次使用一张【杀】`],
						["draw", `令任意名本轮对${get.translation(target)}造成过伤害的角色摸两张牌`],
					];
					if (list2.length) {
						choiceList[0][1] += `（${get.translation(list2)}）`;
					}
					if (list.length) {
						choiceList[1][1] += `（${get.translation(list)}）`;
					}
					const result = await player
						.chooseButtonTarget({
							createDialog: ["雄争：你可以选择一项", [choiceList, "textbutton"]],
							list2,
							list,
							filterButton(button) {
								const link = button.link;
								const { list, list2 } = get.event();
								if (link == "sha") {
									return list2.length > 0;
								}
								return list.length > 0;
							},
							filterTarget(card, player, target) {
								if (!ui.selected.buttons.length) {
									return false;
								}
								const link = ui.selected.buttons[0].link;
								const { list, list2 } = get.event();
								if (link == "sha") {
									return list2.includes(target);
								}
								return list.includes(target);
							},
							selectTarget: [1, Infinity],
							complexSelect: true,
							ai1(button) {
								const { player, list, list2 } = get.event();
								const link = button.link;
								const eff1 = list2.reduce((acc, target) => {
										const eff = get.effect(target, { name: "sha" }, player, player);
										if (eff > 0) {
											return acc + eff;
										}
										return acc;
									}, 0),
									eff2 = list.reduce((acc, target) => {
										const eff = get.effect(target, { name: "draw" }, player, player);
										if (eff > 0) {
											return acc + eff;
										}
										return acc;
									}, 0);
								if (eff2 > eff1 && link == "draw") {
									return 2;
								}
								if (eff1 > 0 && link == "sha") {
									return 1;
								}
								return 0;
							},
							ai2(target) {
								const link = ui.selected.buttons[0]?.link,
									player = get.player(),
									att = get.attitude(player, target);
								if (!link) {
									return 0;
								}
								return get.effect(target, { name: link }, player, player);
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
					const goon = event.cost_data[0] === "sha";
					const targets = event.targets.sortBySeat();
					player.line(targets);
					if (goon) {
						const sha = new lib.element.VCard({ name: "sha", isCard: true });
						for (const target of targets) {
							if (!target.isIn() || !player.canUse(sha, target, false)) {
								continue;
							}
							await player.useCard(sha, target, false);
						}
					} else {
						await game.asyncDraw(targets, 2);
						await game.delayx();
					}
				},
			},
		},
	}
```

### twluannian 名字:乱年
描述: 主公技。其他群势力角色的出牌阶段限一次。其可以弃置X张牌并对“雄争”角色造成1点伤害（X为所有角色于本轮发动〖乱年〗的次数+1）。
```js
twluannian: {
		audio: 2,
		global: "twluannian_global",
		zhuSkill: true,
		subSkill: {
			global: {
				audio: "twluannian",
				enable: "phaseUse",
				usable: 1,
				forceaudio: true,
				onChooseToUse(event) {
					if (!game.online) {
						var num = 1;
						game.countPlayer2(current => {
							var history = current.actionHistory;
							for (var i = history.length - 1; i >= 0; i--) {
								for (var evt of history[i].useSkill) {
									if (evt.skill == "twluannian_global") {
										num++;
									}
								}
								if (history[i].isRound) {
									break;
								}
							}
						});
						event.set("twluannian_num", num);
					}
				},
				filter(event, player) {
					if (!event.twluannian_num) {
						return false;
					}
					return (
						player.group == "qun" &&
						player.countCards("he") >= event.twluannian_num &&
						game.hasPlayer(function (current) {
							var target = current.storage.twxiongzheng_target;
							return target && target.isIn() && current != player && current.hasZhuSkill("twluannian", player);
						})
					);
				},
				filterCard: true,
				position: "he",
				prompt() {
					var player = _status.event.player;
					var num = _status.event.twluannian_num;
					var list = game
						.filterPlayer(function (current) {
							return current.hasZhuSkill("twluannian", player);
						})
						.map(i => i.storage.twxiongzheng_target)
						.sortBySeat();
					return "弃置" + get.cnNumber(num) + "张牌，对" + get.translation(list) + (list.length > 1 ? "中的一人" : "") + "造成1点伤害";
				},
				selectCard() {
					return _status.event.twluannian_num;
				},
				complexSelect: true,
				complexCard: true,
				filterTarget(card, player, target) {
					return game
						.filterPlayer(function (current) {
							return current.hasZhuSkill("twluannian", player);
						})
						.map(i => i.storage.twxiongzheng_target)
						.includes(target);
				},
				selectTarget() {
					return game
						.filterPlayer(function (current) {
							return current.hasZhuSkill("twluannian", _status.event.player);
						})
						.map(i => i.storage.twxiongzheng_target)
						.filter(i => i && i.isIn()).length > 1
						? 1
						: -1;
				},
				check(card) {
					return 6 - get.value(card);
				},
				content() {
					target.damage();
				},
				ai: {
					order: 7,
					result: {
						target(player, target) {
							return get.damageEffect(target, player, target);
						},
					},
					expose: 0.25,
				},
			},
		},
		ai: {
			combo: "twxiongzheng",
		},
	}
```

## tw_baoxin 名字:TW鲍信 势力:qun

### twmutao 名字:募讨
描述: 出牌阶段限一次。你可以选择一名其他角色，令其将手牌中所有的【杀】依次交给其下家开始的每一名角色。然后其对最后一名以此法获得【杀】的角色A造成X点伤害（X为A手牌中【杀】的数量且至多为2）。
```js
twmutao: {
		audio: 2,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return target.countCards("h") && target !== player;
		},
		usable: 1,
		async content(event, trigger, player) {
			let source = event.target;
			let cards = source.getCards("h", { name: "sha" });
			if (!cards.length) {
				game.log("但", source, "没有", "#y杀", "！");
				return;
			}
			let togive = source.getNext();
			let gained;
			while (true) {
				let card = source.getCards("h", { name: "sha" }).randomGet();
				if (togive == gained) {
					break;
				}
				if (togive.isIn()) {
					await source.give(card, togive);
					gained = togive;
				}
				let num = togive == source ? 1 : 0;
				if (source.countCards("h", { name: "sha" }) > num) {
					togive = togive.getNext();
				} else {
					break;
				}
			}
			source.line(togive);
			let num = togive.countCards("h", { name: "sha" });
			if (num) {
				await togive.damage(Math.min(2, num), source);
			}
		},
		ai: {
			order: 10,
			result: {
				player(player, target) {
					var numx = target.countCards("h", { name: "sha" }),
						targetx = target,
						map = {};
					for (var i = 0; i < numx; i++) {
						targetx = targetx.getNext();
						map[targetx.playerid] ??= 0;
						map[targetx.playerid]++;
					}
					var att = get.damageEffect(targetx, player, player);
					return att * numx * Math.min(2, targetx.countCards("h", { name: "sha" }) + map[targetx.playerid]);
				},
			},
		},
	}
```

### twyimou 名字:毅谋
描述: `当与你距离1以内的其他角色受到伤害后，你可以选择一项：1.令其从牌堆中获得一张【杀】；2.令其将一张手牌交给另一名角色并摸两张牌；3.${get.poptip("rule_beishui")}：将所有手牌交给其。`
```js
twyimou: {
		audio: 2,
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return event.player.isIn() && event.player !== player && get.distance(event.player, player) <= 1;
		},
		logTarget: "player",
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		async content(event, trigger, player) {
			const target = trigger.player,
				name = get.translation(target);
			if (trigger.player != player) {
				player.addExpose(0.3);
			}
			let choiceList = [`令${name}获得牌堆里的一张【杀】`, `令${name}将一张手牌交给另一名角色，然后${name}摸两张牌`, `背水！${target != player ? "将所有手牌交给" + name + "，然后" : ""}依次执行以上所有选项`];
			let list = ["选项一"];
			if (target.countCards("h") && game.hasPlayer(t => t !== target)) {
				list.push("选项二");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			if (player.countCards("h") && player !== target) {
				list.push("背水！");
			} else {
				choiceList[2] = '<span style="opacity:0.5">' + choiceList[2] + "</span>";
			}
			const { control } = await player
				.chooseControl(list)
				.set("prompt", "毅谋：请选择一项")
				.set("choiceList", choiceList)
				.set("ai", function () {
					var evt = _status.event.getTrigger(),
						list = _status.event.list;
					var player = _status.event.player;
					var target = evt.player;
					if ((target.hp >= target.countCards("h") + 2 || target == player) && list.includes("背水！")) {
						return "背水！";
					}
					if (target.countCards("h") && list.includes("选项二")) {
						return "选项二";
					}
					return "选项一";
				})
				.set("list", list)
				.forResult();
			if (control != "选项二") {
				let card = get.cardPile2(function (card) {
					return card.name == "sha";
				});
				if (card) {
					await target.gain(card, "gain2");
				} else {
					game.log("但牌堆里已经没有", "#y杀", "了！");
				}
			}
			if (control != "选项一") {
				if (target.countCards("h") && game.hasPlayer(t => t !== target)) {
					const result = await target
						.chooseCardTarget({
							prompt: "将一张手牌交给另一名其他角色并摸两张牌",
							filterCard: true,
							forced: true,
							filterTarget: lib.filter.notMe,
							ai1(card) {
								return 1 / Math.max(0.1, get.value(card));
							},
							ai2(target) {
								var player = _status.event.player,
									att = get.attitude(player, target);
								if (target.hasSkillTag("nogain")) {
									att /= 9;
								}
								return 4 + att;
							},
						})
						.forResult();
					if (result?.bool && result?.cards?.length && result?.targets?.length) {
						const targetx = result.targets[0];
						target.line(targetx);
						await target.give(result.cards, targetx);
						await target.draw(2);
					}
				}
			}
			if (control == "背水！" && player != target && player.countCards("h")) {
				await player.give(player.getCards("h"), target);
			}
		},
		ai: {
			threaten: 2.5,
		},
	}
```

## tw_liufuren 名字:TW刘懿君 势力:qun

### twzhuidu 名字:追妒
描述: `出牌阶段限一次。你可以选择一名已受伤的其他角色并选择一项：1.对其造成1点伤害；2.弃置其装备区里的一张牌；3.${get.poptip("rule_beishui")}：若该角色为女性，弃置一张牌。`
```js
twzhuidu: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && current.isDamaged();
			});
		},
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			return target.isDamaged();
		},
		chooseButton: {
			dialog(event, player) {
				var name = get.translation(event.result.targets[0]);
				var dialog = ui.create.dialog("追妒：选择一项", "hidden");
				dialog.add([
					[
						["damage", "对" + name + "造成1点伤害"],
						["discard", "弃置" + name + "装备区里的一张牌"],
						["both", "背水！若该角色为女性，弃置一张牌，然后依次执行以上所有选项"],
					],
					"textbutton",
				]);
				return dialog;
			},
			filter(button, player) {
				var target = _status.event.getParent().result.targets[0];
				var link = button.link;
				if (link == "damage") {
					return true;
				}
				if (link == "discard") {
					return target.countCards("e");
				}
				return target.hasSex("female") && player.countDiscardableCards(player, "he") > 0;
			},
			check(button) {
				switch (button.link) {
					case "damage":
						return 10;
					case "discard":
						return 1;
					case "both":
						return 15;
				}
			},
			backup(links) {
				var backup = {
					audio: "twzhuidu",
					target: _status.event.result.targets[0],
					choice: links[0],
					filterTarget(card, player, target) {
						return target == lib.skill.twzhuidu_backup.target;
					},
					selectTarget: -1,
					async content(event, trigger, player) {
						const { target, choice } = lib.skill.twzhuidu_backup;
						if (choice != "discard") {
							await target.damage();
						}
						if (choice != "damage") {
							await player.discardPlayerCard(target, "e", true);
						}
						if (choice == "both") {
							await player.chooseToDiscard("he", true);
						}
					},
				};
				return backup;
			},
			prompt(links) {
				var name = get.translation(_status.event.result.targets[0]);
				switch (links[0]) {
					case "damage":
						return "对" + name + "造成1点伤害";
					case "discard":
						return "弃置" + name + "装备区里的一张牌";
					case "both":
						return "背水！弃置一张牌，然后对" + name + "造成1点伤害并弃置其装备区里的一张牌";
				}
			},
		},
		subSkill: {
			backup: {},
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					if (target.hasSex("female") && target.countCards("e") && player.countCards("he")) {
						return -2;
					}
					return -1;
				},
			},
		},
	}
```

### twshigong 名字:示恭
描述: 限定技。当你于回合外进入濒死状态时，你可以令当前回合角色选择一项：1.加1点体力上限并回复1点体力，摸一张牌，然后令你将体力回复至体力上限；2.弃置X张手牌，然后令你将体力回复至1点（X为其体力值）。
```js
twshigong: {
		audio: 2,
		trigger: { player: "dying" },
		filter(event, player) {
			var target = _status.currentPhase;
			return player.hp <= 0 && target && target.isIn() && target != player;
		},
		skillAnimation: true,
		animationColor: "gray",
		limited: true,
		logTarget(event, player) {
			return _status.currentPhase;
		},
		content() {
			"step 0";
			player.awakenSkill(event.name);
			var target = _status.currentPhase;
			if (target.hp <= 0) {
				event._result = { bool: false };
			} else {
				target
					.chooseToDiscard("h", target.hp, get.translation(player) + "对你发动了【示恭】，是否弃置" + get.cnNumber(target.hp) + "张手牌？", "若如此做，其将体力回复至1点；或者点击“取消”加1点体力上限并回复1点体力，摸一张牌，然后其将体力回复至体力上限")
					.set("ai", card => {
						if (!_status.event.goon) {
							return 0;
						}
						return 7 - get.value(card);
					})
					.set("goon", get.attitude(target, player) >= 0);
			}
			"step 1";
			var target = _status.currentPhase;
			if (result.bool) {
				var num = 1 - player.hp;
				if (num > 0) {
					player.recover(num);
				}
				event.finish();
			} else {
				target.gainMaxHp();
				target.recover();
				target.draw();
			}
			"step 2";
			var num = player.maxHp - player.hp;
			if (num > 0) {
				player.recover(num);
			}
		},
	}
```

## tw_yufuluo 名字:于夫罗 势力:qun

### twjiekuang 名字:竭匡
描述: 每回合限一次。当一名体力值小于你的角色成为其他角色使用基本牌或普通锦囊牌的唯一目标后，若没有角色处于濒死状态，你可以失去1点体力或减1点体力上限，将此牌的目标转移给你。然后此牌结算结束后，若此牌未造成伤害且此牌的使用者是你使用此牌名的牌的合法目标，你视为对此牌的使用者使用一张同名牌。
```js
twjiekuang: {
		audio: 2,
		trigger: { global: "useCardToTargeted" },
		filter(event, player) {
			if (!event.target || event.targets.length > 1) {
				return false;
			}
			if (_status.dying.length) {
				return false;
			}
			if (player == event.player) {
				return false;
			}
			if (event.target.hp >= player.hp) {
				return false;
			}
			if (!["basic", "trick"].includes(get.type(event.card))) {
				return false;
			}
			return true;
		},
		usable: 1,
		async cost(event, trigger, player) {
			const { target } = trigger;
			const { control } = await player
				.chooseControl("失去体力", "减体力上限", "cancel2")
				.set("prompt", get.prompt2(event.name.slice(0, -5), target))
				.set("ai", () => {
					if (_status.event.aisave) {
						if (player.isDamaged()) {
							return "减体力上限";
						}
						return "失去体力";
					}
					return "cancel2";
				})
				.set(
					"aisave",
					(() => {
						var save = false;
						if (get.attitude(player, trigger.target) > 2) {
							if (trigger.card.name == "sha") {
								if (player.countCards("h", "shan") || player.getEquip(2) || trigger.target.hp == 1 || player.hp > trigger.target.hp + 1) {
									if (!trigger.target.countCards("h", "shan") || trigger.target.countCards("h") < player.countCards("h")) {
										save = true;
									}
								}
							} else if (trigger.card.name == "juedou" && trigger.target.hp == 1) {
								save = true;
							} else if (trigger.card.name == "shunshou" && get.attitude(player, trigger.player) < 0 && get.attitude(trigger.player, trigger.target) < 0) {
								save = true;
							}
						}
						return save;
					})()
				)
				.forResult();
			event.result = {
				bool: control != "cancel2",
				targets: [target],
				cost_data: control,
			};
		},
		async content(event, trigger, player) {
			await player[event.cost_data == "失去体力" ? "loseHp" : "loseMaxHp"]();
			player.addTempSkill("twjiekuang_after");
			const evt = trigger.getParent();
			evt.twjiekuang = true;
			evt.targets.remove(trigger.target);
			evt.triggeredTargets4.remove(trigger.target);
			evt.targets.push(player);
			trigger.untrigger();
			await game.delayx();
			trigger.player.line(player);
		},
		subSkill: {
			after: {
				charlotte: true,
				trigger: { global: "useCardAfter" },
				filter(event, player) {
					return event.twjiekuang;
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					player.removeSkill(event.name);
					const card = get.autoViewAs({
						name: trigger.card.name,
						nature: trigger.card.nature,
						isCard: true,
					});
					if (!game.countPlayer2(current => current.hasHistory("damage", evt => evt.card == trigger.card)) && player.canUse(card, trigger.player)) {
						await player.useCard(card, trigger.player);
					}
				},
			},
		},
	}
```

### twneirao 名字:内扰
描述: `觉醒技。准备阶段，若你的体力值与体力上限之和不大于9，你失去${get.poptip("twjiekuang")}，弃置所有牌并从牌堆或弃牌堆中获得等量的【杀】，然后获得${get.poptip("twluanlve")}。`
```js
twneirao: {
		audio: 2,
		derivation: "twluanlve",
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "gray",
		filter(event, player) {
			return Math.max(0, player.hp) + player.maxHp <= 9;
		},
		content() {
			"step 0";
			player.awakenSkill(event.name);
			player.removeSkills("twjiekuang");
			"step 1";
			var num = player.countCards("he"),
				cards = [];
			player.discard(player.getCards("he"));
			for (var i = 0; i < num; i++) {
				var card = get.cardPile(function (card) {
					return card.name == "sha" && !cards.includes(card);
				});
				if (card) {
					cards.push(card);
				}
			}
			if (cards.length) {
				player.gain(cards, "gain2");
			}
			"step 2";
			player.addSkills("twluanlve");
		},
	}
```

## tw_fengxí 名字:冯习 势力:shu

### twqingkou 名字:轻寇
描述: 准备阶段，你可以视为对一名其他角色使用一张【决斗】。然后此牌的伤害来源摸一张牌，若伤害来源包括你，你跳过本回合的判定阶段和弃牌阶段。
```js
twqingkou: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return player.canUse("juedou", current, false);
			});
		},
		direct: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt("twqingkou"), "视为对一名其他角色使用一张【决斗】", function (card, player, target) {
					return player.canUse("juedou", target, false);
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					return get.effect(target, { name: "juedou" }, player, player);
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twqingkou", target);
				player.useCard({ name: "juedou", isCard: true, storage: { twqingkou: true } }, target, false);
				player.addTempSkill("twqingkou_after");
			}
		},
		subSkill: {
			after: {
				trigger: { global: "useCardAfter" },
				filter(event, player) {
					return event.card.storage && event.card.storage.twqingkou;
				},
				charlotte: true,
				direct: true,
				content() {
					var targets = game
						.filterPlayer(current => {
							return current.hasHistory("sourceDamage", function (evt) {
								return evt.card == trigger.card;
							});
						})
						.sortBySeat();
					for (var target of targets) {
						target.draw();
						if (target == player) {
							player.skip("phaseJudge");
							game.log(player, "跳过了", "#y判定阶段");
							player.skip("phaseDiscard");
							game.log(player, "跳过了", "#y弃牌阶段");
						}
					}
				},
			},
		},
	}
```

## tw_zhangji 名字:TW张既 势力:wei

### twdingzhen 名字:定镇
描述: 每轮开始时，你可以选择任意名你至其距离不大于X的角色（X为你的体力值），这些角色选择一项：1.弃置一张【杀】；2.本轮其于回合内使用的第一张牌不能指定你为目标。
```js
twdingzhen: {
		audio: 2,
		trigger: { global: "roundStart" },
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return get.distance(player, current) <= player.getHp();
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					selectTarget: [1, Infinity],
					filterTarget(card, player, target) {
						return get.distance(player, target) <= player.getHp();
					},
					ai(target) {
						const player = get.player();
						if (target == player) {
							return 0;
						}
						return Math.max(-get.attitude(player, target), 1);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { targets } = event;
			await game.doAsyncInOrder(targets, async target => {
				const result = await target
					.chooseToDiscard({
						position: "h",
						filterCard(card, player) {
							return get.name(card) == "sha";
						},
						prompt: "定镇：弃置一张【杀】，或本轮你于回合内使用的第一张牌不能指定" + get.translation(player) + "为目标",
						ai(card) {
							if (_status.event.goon) {
								return 1;
							}
							return 0;
						},
					})
					.set(
						"goon",
						get.attitude(target, player) < 0 &&
							player.countCards("hs") <= 3 &&
							target.countCards("hs", card => {
								return target.hasValueTarget(card);
							}) > 1
					)
					.forResult();
				if (result.bool) {
					target.addExpose(0.1);
				} else {
					target.addSkill(`${event.name}_target`);
					target.markAuto(`${event.name}_target`, [player]);
				}
			});
		},
		subSkill: {
			target: {
				charlotte: true,
				onremove: true,
				mark: true,
				silent: true,
				trigger: { global: "roundStart" },
				firstDo: true,
				async content(event, trigger, player) {
					player.removeSkill(event.name);
				},
				intro: {
					markcount: () => 0,
					content: "回合内使用的第一张牌不能指定$为目标",
				},
				mod: {
					playerEnabled(card, player, target) {
						if (_status.currentPhase == player && !player.countUsed() && player.getStorage("twdingzhen_target").includes(target)) {
							return false;
						}
					},
				},
			},
		},
	}
```

### twyouye 名字:攸业
描述: 锁定技。①其他角色的结束阶段，若其本回合未对你造成过伤害且“蓄”数小于5，你将牌堆顶的牌置于武将牌上，称为“蓄”。②当你造成或受到伤害后，若你有“蓄”，你将所有“蓄”分配给任意角色（若当前回合角色存活，则你至少为当前回合角色分配一张）。
```js
twyouye: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			return event.player != player && !event.player.hasHistory("sourceDamage", evt => evt.player == player) && player.getExpansions("twyouye").length < 5;
		},
		forced: true,
		group: "twyouye_give",
		async content(event, trigger, player) {
			await player.addToExpansion({
				cards: get.cards(1, true),
				animate: "gain2",
				gaintag: [event.name],
			});
		},
		marktext: "蓄",
		intro: {
			name: "蓄(攸业)",
			content: "expansion",
			markcount: "expansion",
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		subSkill: {
			give: {
				audio: "twyouye",
				trigger: { source: "damageSource", player: "damageEnd" },
				filter(event, player) {
					return player.getExpansions("twyouye").length;
				},
				forced: true,
				async content(event, trigger, player) {
					let boolx = _status.currentPhase?.isIn();
					const cards = player.getExpansions("twyouye");
					if (_status.connectMode) {
						game.broadcastAll(function () {
							_status.noclearcountdown = true;
						});
					}
					const given_map = new Map();
					while (cards.length > 0) {
						const result =
							cards.length > 1
								? await player
										.chooseButtonTarget({
											createDialog: [`攸业：请选择要分配的牌${boolx ? `（至少分给${get.translation(_status.currentPhase)}一张）` : ""}`, cards],
											selectButton: [1, Infinity],
											forced: true,
											filterTarget(card, player, target) {
												if (!get.event().boolx) {
													return true;
												}
												return target == _status.currentPhase;
											},
											ai1(button) {
												if (!get.event().boolx) {
													return get.value(button.link);
												}
												const att = get.attitude(get.player(), _status.currentPhase);
												if (att <= 0) {
													if (ui.selected.buttons.length) {
														return 0;
													}
													return -get.value(button.link);
												}
												return get.value(button.link);
											},
											canHidden: true,
											ai2(target) {
												const { player, boolx } = get.event();
												if (!boolx) {
													return 1;
												}
												const card = ui.selected.buttons[0].link;
												if (card) {
													return get.value(card, target) * get.attitude(player, target);
												}
												return 1;
											},
										})
										.set("allowChooseAll", true)
										.set("boolx", boolx)
										.forResult()
								: await player
										.chooseTarget(
											`攸业：令一名角色获得${get.translation(cards)}`,
											(card, player, target) => {
												if (!get.event().boolx) {
													return true;
												}
												return target == _status.currentPhase;
											},
											true
										)
										.set("ai", target => {
											const { player, enemy } = get.event();
											const att = get.attitude(player, target);
											if (enemy) {
												return -att;
											} else if (att > 0) {
												return att / (1 + target.countCards("h"));
											} else {
												return att / 100;
											}
										})
										.set("enemy", get.value(cards[0], player, "raw") < 0)
										.forResult();
						if (result?.bool) {
							let links;
							if (!result.links?.length) {
								links = cards.slice();
							} else {
								links = result.links;
							}
							cards.removeArray(links);
							const [target] = result.targets;
							if (target == _status.currentPhase) {
								boolx = false;
							}
							if (!given_map.has(target)) {
								given_map.set(target, links);
							} else {
								given_map.get(target).addArray(links);
							}
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
					if (given_map.size) {
						await game
							.loseAsync({
								gain_list: Array.from(given_map),
								player,
								cards: Object.values(given_map).slice().flat(),
								giver: player,
								animate: "gain2",
							})
							.setContent("gaincardMultiple");
					}
				},
			},
		},
	}
```

## tw_zhangnan 名字:张南 势力:shu

### twfenwu 名字:奋武
描述: 结束阶段，你可以失去1点体力并视为使用一张无距离限制的【杀】。若本回合你使用过的基本牌种数大于1，此【杀】伤害基数+1。
```js
twfenwu: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && player.canUse("sha", current, false, false);
			});
		},
		direct: true,
		content() {
			"step 0";
			var list = [];
			player.getHistory("useCard", function (evt) {
				if (get.type(evt.card) != "basic") {
					return;
				}
				var name = evt.card.name,
					nature = game.hasNature(evt.card) ? get.nature(evt.card) : "";
				if (!list.includes(name + nature)) {
					list.push(name + nature);
				}
			});
			event.addDamage = list.length > 1;
			player
				.chooseTarget(get.prompt("twfenwu"), "失去1点体力并视为使用一张无距离限制的【杀】" + (event.addDamage ? "（伤害基数+1）" : ""), function (card, player, target) {
					return target != player && player.canUse("sha", target, false, false);
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					if (player.hp + player.countCards("hs", { name: ["tao", "jiu"] }) <= 1) {
						return -1;
					}
					var num = 1;
					if (
						(!target.mayHaveShan(player, "use") ||
							player.hasSkillTag(
								"directHit_ai",
								true,
								{
									target: target,
									card: { name: "sha" },
								},
								true
							)) &&
						!target.hasSkillTag("filterDamage", null, {
							player: player,
							card: { name: "sha" },
						})
					) {
						num = 1.3;
					}
					return get.effect(target, { name: "sha" }, player, player) * num;
				});
			"step 1";
			if (result.bool) {
				var num = 1;
				var target = result.targets[0];
				player.logSkill("twfenwu", target);
				player.loseHp();
				if (event.addDamage) {
					num = 2;
					game.log("#y杀", "的伤害基数+1");
				}
				player.useCard({ name: "sha", isCard: true }, target, false).baseDamage = num;
			}
		},
	}
```

## tw_huchuquan 名字:呼厨泉 势力:qun

### twfupan 名字:复叛
描述: 当你造成或受到伤害后，你可以摸X张牌并将一张牌交给一名其他角色（X为伤害值）。若你此前：未以此法交给过该角色牌，你摸两张牌；以此法交给过该角色牌，你可{对其造成1点伤害，然后你不能再以此法交给其牌}。
```js
twfupan: {
		audio: 3,
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		onremove: true,
		async content(event, trigger, player) {
			player.storage.twfupan ??= {};
			await player.draw(trigger.num);
			if (
				!player.countCards("he") ||
				!game.hasPlayer(current => {
					return !(player.storage.twfupan[current.playerid] >= 2) && player != current;
				})
			) {
				return;
			}
			const next = player.chooseCardTarget({
				filterCard: true,
				position: "he",
				forced: true,
				filterTarget(card, player, target) {
					return !(player.storage.twfupan[target.playerid] >= 2) && player != target;
				},
				ai1(card) {
					const player = get.player();
					if (get.value(card, false, "raw") < 0) {
						return 20 * get.value(card);
					}
					if (player == _status.currentPhase) {
						return 20 - player.getUseValue(card);
					}
					return 20 - get.value(card);
				},
				ai2(target) {
					const player = get.player();
					const att = get.attitude(player, target);
					if (ui.selected.cards.length && get.value(ui.selected.cards[0], false, "raw") < 0) {
						return -0.1 - att;
					}
					if (player.storage.twfupan[target.playerid] === undefined) {
						return 5;
					} else if (player.storage.twfupan[target.playerid] === 1) {
						return get.damageEffect(target, player, player);
					}
					return 1;
				},
				prompt: "请选择要交出的卡牌和目标角色",
			});
			next.set(
				"targetprompt2",
				next.targetprompt2.concat([
					target => {
						const evt = get.event();
						if (!target.isIn() || !evt.filterTarget(null, evt.player, target)) {
							return;
						}
						return !evt.player.storage.twfupan[target.playerid] ? "你摸两张牌" : "可对其<br>造成伤害";
					},
				])
			);
			const result = await next.forResult();
			if (result?.cards?.length && result.targets?.length) {
				const {
					cards,
					targets: [target],
				} = result;
				player.line(target, "green");
				await player.give(cards, target);
				if (!player.storage.twfupan[target.playerid]) {
					player.storage.twfupan[target.playerid] = 1;
					await player.draw(2);
				} else {
					const result = await player
						.chooseBool(`复叛：是否对${get.translation(target)}造成1点伤害？`, "然后你不能再因此技能交给其牌")
						.set("ai", () => _status.event.bool)
						.set("bool", get.damageEffect(target, player, player) > 0)
						.forResult();
					if (result?.bool) {
						player.storage.twfupan[target.playerid]++;
						player.line(target, "fire");
						await target.damage();
					}
				}
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			threaten: 0.9,
		},
	}
```

## tw_liwei 名字:TW李遗 势力:shu

### twjiaohua 名字:教化
描述: 当你或体力值最小的其他角色因摸牌而得到牌后，你可以令该角色从牌堆或弃牌堆中获得一张本次未获得的类别的牌（每种类别每回合限一次）。
```js
twjiaohua: {
		audio: 2,
		trigger: { global: "gainAfter" },
		filter(event, player) {
			if (event.getParent().name != "draw") {
				return false;
			}
			if (event.player != player && !event.player.isMinHp()) {
				return false;
			}
			var cards = event.cards,
				list = ["basic", "trick", "equip"];
			for (var card of cards) {
				if (list.includes(get.type2(card))) {
					list.remove(get.type2(card));
				}
			}
			for (var type of event.player.getStorage("twjiaohua_gained")) {
				if (list.includes(type)) {
					list.remove(type);
				}
			}
			return list.length > 0;
		},
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		prompt2(event, player) {
			var cards = event.cards,
				list = ["basic", "trick", "equip"];
			for (var card of cards) {
				if (list.includes(get.type2(card))) {
					list.remove(get.type2(card));
				}
			}
			for (var type of event.player.getStorage("twjiaohua_gained")) {
				if (list.includes(type)) {
					list.remove(type);
				}
			}
			var name = event.player == player ? "你" : get.translation(event.player);
			return (
				"令" +
				name +
				"从牌堆或弃牌堆中获得一张" +
				(event.player.isUnderControl(true)
					? list
							.map(i => get.translation(i) + "牌")
							.join("、")
							.replace(/(.*)、/, "$1或")
					: "本次未获得的类别的牌")
			);
		},
		logTarget: "player",
		content() {
			trigger.player.addTempSkill("twjiaohua_gained");
			var cards = trigger.cards,
				list = ["basic", "trick", "equip"];
			for (var card of cards) {
				if (list.includes(get.type2(card))) {
					list.remove(get.type2(card));
				}
			}
			for (var type of trigger.player.getStorage("twjiaohua_gained")) {
				if (list.includes(type)) {
					list.remove(type);
				}
			}
			list.randomSort();
			var card = get.cardPile(function (card) {
				return list.includes(get.type2(card));
			});
			if (card) {
				trigger.player.gain(card, "gain2");
				trigger.player.markAuto("twjiaohua_gained", [get.type2(card)]);
			}
		},
		subSkill: {
			gained: { onremove: true, charlotte: true },
		},
	}
```

## tw_yanxiang 名字:TW阎象 势力:qun

### twkujian 名字:苦谏
描述: 出牌阶段限一次。你可以将至多三张手牌交给一名其他角色，称为“谏”，你获得以下效果：当其他角色使用或打出“谏”牌后，你与其各摸一张牌；当其他角色不因使用或打出而失去“谏”牌后，你与其各弃置一张牌。
```js
twkujian: {
		audio: 3,
		enable: "phaseUse",
		filterCard: true,
		selectCard: [1, 3],
		usable: 1,
		discard: false,
		lose: false,
		delay: false,
		filterTarget: lib.filter.notMe,
		global: "twkujian_ai",
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
			if (player.hp == player.maxHp || player.storage.jsprende < 0 || player.countCards("h") <= 1) {
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
		logAudio: () => 1,
		content() {
			player.give(cards, target).gaintag.add("twkujianx");
			player.addSkill("twkujian_draw");
			player.addSkill("twkujian_discard");
		},
		ai: {
			expose: 0.2,
			order: 7,
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
					if (player.hp == player.maxHp || player.storage.jsprende < 0 || player.countCards("h") <= 1) {
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
							if (
								game.hasPlayer(function (current) {
									return current != player && get.attitude(player, current) > 0;
								})
							) {
								return 0;
							}
						}
					}
				},
			},
		},
		subSkill: {
			draw: {
				audio: "twkujian2.mp3",
				trigger: { global: ["useCardAfter", "respondAfter"] },
				forced: true,
				logTarget: "player",
				charlotte: true,
				filter(event, player) {
					return player !== event.player;
					/*event.player.hasHistory("lose", evt => {
							const evtx = evt.relatedEvent || evt.getParent();
							if (event != evtx) {
								return false;
							}
							for (var i in evt.gaintag_map) {
								if (evt.gaintag_map[i].includes("twkujianx")) {
									return true;
								}
							}
						})*/
				},
				getIndex(event, player) {
					let num = 0;
					event.player.getHistory("lose", evt => {
						const evtx = evt.relatedEvent || evt.getParent();
						if (event != evtx) {
							return false;
						}
						for (let i in evt.gaintag_map) {
							if (evt.gaintag_map[i].includes("twkujianx")) {
								num++;
							}
						}
					});
					return num;
				},
				async content(event, trigger, player) {
					await game.asyncDraw([player, trigger.player]);
					await game.delayx();
				},
			},
			discard: {
				audio: "twkujian3.mp3",
				trigger: {
					global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				forced: true,
				charlotte: true,
				filter(event, player, name, target) {
					return target.isIn();
				},
				getIndex(event, player) {
					let targets = [];
					game.filterPlayer(current => {
						if (player === current) {
							return false;
						}
						let evt = event.getl(current);
						if (!evt || !evt.hs || !evt.hs.length) {
							return false;
						}
						if (event.name == "lose") {
							let name = event.getParent().name;
							if (name == "useCard" || name == "respond") {
								return false;
							}
							for (let i in event.gaintag_map) {
								if (event.gaintag_map[i].includes("twkujianx")) {
									targets.push(current);
								}
							}
							return false;
						}
						return current.hasHistory("lose", function (evt) {
							if (event != evt.getParent()) {
								return false;
							}
							let name = evt.relatedEvent?.name;
							if (name == "useCard" || name == "respond") {
								return false;
							}
							for (let i in evt.gaintag_map) {
								if (evt.gaintag_map[i].includes("twkujianx")) {
									targets.push(current);
								}
							}
							return false;
						});
					});
					return targets.sortBySeat();
				},
				logTarget(event, player, triggername, target) {
					return target;
				},
				async content(event, trigger, player) {
					let targets = [player, event.indexedData].sortBySeat();
					for (let tar of targets) {
						if (tar.countCards("he") > 0) {
							await tar.chooseToDiscard("he", true);
						}
					}
				},
			},
			ai: {
				charlotte: true,
				ai: {
					effect: {
						player_use(card, player, target) {
							if (
								card.cards &&
								card.cards.some(i => i.hasGaintag("twkujianx")) &&
								game.hasPlayer(current => {
									return get.attitude(player, current) > 0;
								})
							) {
								return [1, 1];
							}
						},
					},
				},
				mod: {
					aiOrder(player, card, num) {
						if (
							get.itemtype(card) == "card" &&
							card.hasGaintag("twkujianx") &&
							game.hasPlayer(current => {
								return get.attitude(player, current) > 0;
							})
						) {
							return num + 0.5;
						}
					},
					aiValue(player, card, num) {
						if (
							get.itemtype(card) == "card" &&
							card.hasGaintag("twkujianx") &&
							game.hasPlayer(current => {
								return get.attitude(player, current) > 0;
							})
						) {
							return num + 0.5;
						}
					},
				},
			},
		},
	}
```

### twruilian 名字:睿敛
描述: 每轮开始时，你可以选择一名角色。其下回合结束时，若其本回合弃置过至少两张牌，你可以选择其本回合弃置过的一种类别，你与其各从弃牌堆中获得一张此类别的牌。
```js
twruilian: {
		audio: 2,
		trigger: { global: "roundStart" },
		direct: true,
		content() {
			"step 0";
			player.chooseTarget(get.prompt2("twruilian")).set("ai", function (target) {
				var player = _status.event.player,
					att = get.attitude(player, target),
					eff = att / (player == target ? 2 : 1) + 1;
				if (att >= 0) {
					if (target.hasSkill("yongsi")) {
						return eff * 5;
					}
					if (target.hasSkill("zhiheng") || target.hasSkill("rezhiheng")) {
						return eff * 4;
					}
					if (target.hasSkill("rekurou")) {
						return eff * 3;
					}
					if (target.hasSkill("xinlianji") || target.hasSkill("dclianji")) {
						return eff * 2;
					}
					if (target.needsToDiscard()) {
						return eff * 1.5;
					}
					return eff;
				}
				return 0;
			});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("twruilian", target);
				player.markAuto("twruilian2", [target]);
				player.addSkill("twruilian2");
			}
		},
	}
```

## tw_xiahouen 名字:夏侯恩 势力:wei

### twfujian 名字:负剑
描述: 锁定技。①游戏开始时或准备阶段，若你的装备区里没有武器牌，你随机将牌堆中的一张武器牌置入装备区。②当你于回合外失去武器牌后，你失去1点体力。
```js
twfujian: {
		audio: 2,
		group: "twfujian_lose",
		trigger: {
			global: "phaseBefore",
			player: ["enterGame", "phaseZhunbeiBegin"],
		},
		filter(event, player) {
			if (player.getEquips(1).length) {
				return false;
			}
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		content() {
			var card = get.cardPile2(function (card) {
				return get.type(card) == "equip" && get.subtype(card) == "equip1";
			}, "random");
			event.card = card;
			if (card) {
				player.equip(card);
			} else {
				game.log("但是牌堆中没有武器牌了！");
				event.finish();
			}
		},
		subSkill: {
			lose: {
				audio: "twfujian",
				trigger: {
					player: "loseAfter",
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				filter(event, player) {
					if (player == _status.currentPhase) {
						return false;
					}
					if (event.name == "gain" && event.player == player) {
						return false;
					}
					var evt = event.getl(player);
					if (evt && evt.cards2 && evt.cards2.some(i => get.subtype(i) == "equip1")) {
						return true;
					}
					return false;
				},
				forced: true,
				content() {
					player.loseHp();
				},
			},
		},
	}
```

### twjianwei 名字:剑威
描述: ①若你的装备区里有武器牌，你使用【杀】无视防具且拼点牌点数+X（X为你的攻击范围）。②{其他角色的准备阶段，其可以与你拼点}/{准备阶段，你可以与攻击范围内的一名角色拼点}。若你赢，你获得其每个区域内的各一张牌；若其赢，其获得你装备区里的武器牌。
```js
twjianwei: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			if (!player.getEquips(1).length) {
				return false;
			}
			return game.hasPlayer(function (current) {
				return player.inRange(current) && player.canCompare(current);
			});
		},
		pindianCheck(player, target) {
			var hs = player.getCards("h").sort(function (a, b) {
				return b.number - a.number;
			});
			var ts = target.getCards("h").sort(function (a, b) {
				return b.number - a.number;
			});
			if (!hs.length || !ts.length) {
				return 0;
			}
			if (Math.min(13, hs[0].number + player.getAttackRange()) > ts[0].number || (ts[0].number > 9 && get.value(ts[0]) <= 5) || target.countCards("j")) {
				return true;
			}
			return false;
		},
		direct: true,
		locked: false,
		group: ["twjianwei_pindian", "twjianwei_zhaocha"],
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt("twjianwei"), "与攻击范围内的一名角色拼点。若你赢，你获得其每个区域里的一张牌；若其赢，其获得你装备区里的武器牌", function (card, player, target) {
					return player.inRange(target) && player.canCompare(target);
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					if (lib.skill.twjianwei.pindianCheck(player, target)) {
						return -5 * get.attitude(player, target);
					}
					return -get.attitude(player, target);
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twjianwei", target);
				player.chooseToCompare(target);
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				var num = 0;
				if (target.countCards("h")) {
					num++;
				}
				if (target.countCards("e")) {
					num++;
				}
				if (target.countCards("j")) {
					num++;
				}
				if (num) {
					player.gainPlayerCard(target, num, "hej", true).set("filterButton", function (button) {
						for (var i = 0; i < ui.selected.buttons.length; i++) {
							if (get.position(button.link) == get.position(ui.selected.buttons[i].link)) {
								return false;
							}
						}
						return true;
					});
				}
			} else if (!result.tie) {
				var card = player.getEquips(1);
				if (card.length) {
					target.gain(card, player, "give");
				}
			}
		},
		mod: {
			aiValue(player, card, num) {
				if (card.name == "qinggang" || card.name == "qibaodao") {
					return num / 5;
				}
			},
		},
		ai: {
			unequip: true,
			unequip_ai: true,
			skillTagFilter(player, tag, arg) {
				if (!arg || !arg.card || arg.card.name != "sha" || !player.getEquip(1)) {
					return false;
				}
			},
		},
		subSkill: {
			pindian: {
				audio: "twjianwei",
				trigger: { player: "compare", target: "compare" },
				filter(event, player) {
					if (!player.getEquips(1).length || player.getAttackRange() <= 0) {
						return false;
					}
					if (event.player == player) {
						return !event.iwhile;
					}
					return true;
				},
				forced: true,
				locked: false,
				content() {
					var num = player.getAttackRange();
					if (player == trigger.player) {
						trigger.num1 += num;
						if (trigger.num1 > 13) {
							trigger.num1 = 13;
						}
					} else {
						trigger.num2 += num;
						if (trigger.num2 > 13) {
							trigger.num2 = 13;
						}
					}
					game.log(player, "的拼点牌点数+" + num);
				},
			},
			//你是故意找茬是不是
			zhaocha: {
				trigger: { global: "phaseZhunbeiBegin" },
				filter(event, player) {
					if (event.player == player) {
						return false;
					}
					return event.player.canCompare(player);
				},
				direct: true,
				content() {
					"step 0";
					trigger.player
						.chooseBool("剑威：是否与" + get.translation(player) + "拼点？", "若你赢，你获得其装备区里的武器牌；若其赢，其获得你每个区域里的一张牌")
						.set("ai", () => _status.event.choice)
						.set("choice", get.attitude(trigger.player, player) < 0 && !lib.skill.twjianwei.pindianCheck(player, trigger.player));
					"step 1";
					if (result.bool) {
						trigger.player.logSkill("twjianwei", player);
						trigger.player.chooseToCompare(player);
					} else {
						event.finish();
					}
					"step 2";
					if (!result.tie) {
						if (result.bool) {
							var card = player.getEquips(1);
							if (card.length) {
								trigger.player.gain(card, player, "give");
							}
						} else {
							var num = 0;
							if (trigger.player.countCards("h")) {
								num++;
							}
							if (trigger.player.countCards("e")) {
								num++;
							}
							if (trigger.player.countCards("j")) {
								num++;
							}
							if (num) {
								player.gainPlayerCard(trigger.player, num, "hej", true).set("filterButton", function (button) {
									for (var i = 0; i < ui.selected.buttons.length; i++) {
										if (get.position(button.link) == get.position(ui.selected.buttons[i].link)) {
											return false;
										}
									}
									return true;
								});
							}
						}
					}
				},
			},
		},
	}
```

## tw_xiahoushang 名字:夏侯尚 势力:wei

### twtanfeng 名字:探锋
描述: 准备阶段，你可以弃置一名其他角色区域内的一张牌，然后其选择一项：1.受到你造成的1点火焰伤害，然后令你跳过本回合的一个阶段（准备阶段和结束阶段除外）；2.将一张牌当做【杀】对你使用（有距离限制）。
```js
twtanfeng: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && current.countDiscardableCards(player, "hej") > 0;
			});
		},
		direct: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt2("twtanfeng"), function (card, player, target) {
					return target != player && target.countDiscardableCards(player, "hej") > 0;
				})
				.set("ai", function (target) {
					var player = _status.event.player,
						num = 1;
					if (get.attitude(player, target) > 0) {
						num = 3;
					} else if (!target.countCards("he") || !target.canUse("sha", player)) {
						if (target.hp + target.countCards("hs", { name: ["tao", "jiu"] }) <= 1) {
							num = 2;
						} else {
							num = 1.2;
						}
					}
					return get.effect(target, { name: "guohe" }, player, player) * num * (player.hp <= 1 && get.attitude(player, target) <= 0 ? 0 : 1);
				})
				.setHiddenSkill(event.name);
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twtanfeng", target);
				player.discardPlayerCard(target, "hej", true);
			} else {
				event.finish();
			}
			"step 2";
			target.chooseCardTarget({
				position: "hes",
				prompt: "选择一张牌当做【杀】对" + get.translation(player) + "使用",
				prompt2: "或点击“取消”，受到其造成的1点火焰伤害，并令其跳过本回合的一个阶段（准备阶段和结束阶段除外）",
				filterCard(card, player) {
					return player.canUse(get.autoViewAs({ name: "sha" }, [card]), _status.event.getParent().player, false);
				},
				filterTarget(card, player, target) {
					var source = _status.event.getParent().player;
					if (target != source && !ui.selected.targets.includes(source)) {
						return false;
					}
					card = get.autoViewAs({ name: "sha" }, [card]);
					return lib.filter.filterTarget.apply(this, arguments);
				},
				selectTarget() {
					var card = get.card(),
						player = get.player();
					if (!card) {
						return;
					}
					card = get.autoViewAs({ name: "sha" }, [card]);
					var range = [1, 1];
					game.checkMod(card, player, range, "selectTarget", player);
					return range;
				},
				ai1(card) {
					var player = _status.event.player,
						target = _status.event.getParent().player;
					var eff = get.effect(target, get.autoViewAs({ name: "sha" }, [card]), player, player);
					var eff2 = get.damageEffect(player, target, player, "fire");
					if (eff < 0 || eff2 > 0 || eff2 > eff || get.tag(card, "recover")) {
						return 0;
					}
					return (player.hp == 1 ? 10 : 6) - get.value(card);
				},
				ai2(target) {
					if (target == _status.event.getParent().player) {
						return 100;
					}
					return get.effect(target, { name: "sha" }, _status.event.player);
				},
			});
			"step 3";
			if (result.bool) {
				var cards = result.cards,
					targets = result.targets;
				var cardx = get.autoViewAs({ name: "sha" }, cards);
				target.useCard(cardx, cards, targets, false);
				event.finish();
			} else {
				player.line(target, "fire");
				target.damage(1, "fire");
			}
			"step 4";
			if (!target.isIn()) {
				event.finish();
				return;
			}
			var list = [];
			var list2 = [];
			event.map = {
				phaseJudge: "判定阶段",
				phaseDraw: "摸牌阶段",
				phaseUse: "出牌阶段",
				phaseDiscard: "弃牌阶段",
			};
			for (var i of ["phaseJudge", "phaseDraw", "phaseUse", "phaseDiscard"]) {
				if (!player.skipList.includes(i)) {
					i = event.map[i];
					list.push(i);
					if (i != "判定阶段" && i != "弃牌阶段") {
						list2.push(i);
					}
				}
			}
			target
				.chooseControl(list)
				.set("prompt", "探锋：令" + get.translation(player) + "跳过一个阶段")
				.set("ai", function () {
					return _status.event.choice;
				})
				.set(
					"choice",
					(function () {
						var att = get.attitude(target, player);
						var num = player.countCards("j");
						if (att > 0) {
							if (list.includes("判定阶段") && num > 0) {
								return "判定阶段";
							}
							return "弃牌阶段";
						}
						if (list.includes("摸牌阶段") && player.hasJudge("lebu")) {
							return "摸牌阶段";
						}
						if ((list.includes("出牌阶段") && player.hasJudge("bingliang")) || player.needsToDiscard() > 0) {
							return "出牌阶段";
						}
						return list2.randomGet();
					})()
				);
			"step 5";
			for (var i in event.map) {
				if (event.map[i] == result.control) {
					player.skip(i);
				}
			}
			target.popup(result.control);
			target.line(player);
			game.log(player, "跳过了", "#y" + result.control);
		},
	}
```

## tw_qiaorui 名字:TW桥蕤 势力:qun

### twxiawei 名字:狭威
描述: `①游戏开始时，你将牌堆中的两张基本牌置于武将牌上，称为“威”。②回合开始时，你将所有“威”置入弃牌堆。③你可以将“威”如手牌般使用或打出。④${get.poptip("rule_wangxing")}：准备阶段，你可以将牌堆顶的X+1张牌置于武将牌上，称为“威”。`
```js
twxiawei: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		direct: true,
		locked: false,
		group: ["twxiawei_init", "twxiawei_lose", "twxiawei_unmark"],
		content() {
			"step 0";
			player
				.chooseControl("1", "2", "3", "4", "cancel2")
				.set("prompt", get.prompt("twxiawei"))
				.set("prompt2", "妄行：将X+1张牌置于武将牌上，称为“威”")
				.set("ai", function () {
					var player = _status.event.player;
					if (player.maxHp > 3) {
						return 3;
					}
					return Math.min(3, player.countCards("he") + 1);
				});
			"step 1";
			if (result.control != "cancel2") {
				var num = result.index + 1,
					cards = get.cards(num + 1);
				player.logSkill("twxiawei");
				player.addTempSkill("wangxing");
				player.addMark("wangxing", num, false);
				player.$gain2(cards, false);
				game.log(player, "将", cards, "作为“威”置于了武将牌上");
				player.loseToSpecial(cards, "twxiawei").visible = true;
			} else {
				event.finish();
			}
			"step 2";
			player.markSkill("twxiawei");
			game.delayx();
		},
		marktext: "威",
		intro: {
			mark(dialog, storage, player) {
				var cards = player.getCards("s", function (card) {
					return card.hasGaintag("twxiawei");
				});
				if (!cards || !cards.length) {
					return;
				}
				dialog.addAuto(cards);
			},
			markcount(storage, player) {
				return player.countCards("s", function (card) {
					return card.hasGaintag("twxiawei");
				});
			},
			onunmark(storage, player) {
				var cards = player.getCards("s", function (card) {
					return card.hasGaintag("twxiawei");
				});
				if (cards.length) {
					player.loseToDiscardpile(cards);
				}
			},
		},
		mod: {
			aiOrder(player, card, num) {
				if (get.itemtype(card) == "card" && card.hasGaintag("twxiawei")) {
					return num + 0.5;
				}
			},
		},
		subSkill: {
			init: {
				audio: "twxiawei",
				trigger: { global: "phaseBefore", player: "enterGame" },
				filter(event, player) {
					return event.name != "phase" || game.phaseNumber == 0;
				},
				forced: true,
				locked: false,
				content() {
					"step 0";
					var cards = [];
					for (var i = 1; i <= 2; i++) {
						var card = get.cardPile2(function (card) {
							return !cards.includes(card) && get.type(card) == "basic";
						});
						if (card) {
							cards.push(card);
						}
					}
					if (cards.length) {
						player.$gain2(cards, false);
						game.log(player, "将", cards, "作为“威”置于了武将牌上");
						player.loseToSpecial(cards, "twxiawei").visible = true;
					} else {
						event.finish();
					}
					"step 1";
					player.markSkill("twxiawei");
					game.delayx();
				},
			},
			lose: {
				audio: "twxiawei",
				trigger: { player: "phaseBegin" },
				filter(event, player) {
					return player.countCards("s", function (card) {
						return card.hasGaintag("twxiawei");
					});
				},
				forced: true,
				locked: false,
				content() {
					var cards = player.getCards("s", function (card) {
						return card.hasGaintag("twxiawei");
					});
					player.loseToDiscardpile(cards);
				},
			},
			unmark: {
				trigger: { player: "loseAfter" },
				filter(event, player) {
					if (!event.ss || !event.ss.length) {
						return false;
					}
					return !player.countCards("s", function (card) {
						return card.hasGaintag("twxiawei");
					});
				},
				charlotte: true,
				forced: true,
				silent: true,
				content() {
					player.unmarkSkill("twxiawei");
				},
			},
		},
	}
```

### twqiongji 名字:穷技
描述: 锁定技。①每回合限一次。当你使用或打出“威”后，你摸一张牌。②当你受到伤害时，若你没有“威”，此伤害+1。
```js
twqiongji: {
		audio: 2,
		trigger: { player: ["useCardAfter", "respondAfter", "damageBegin3"] },
		filter(event, player) {
			if (event.name == "damage") {
				return !player.countCards("s", function (card) {
					return card.hasGaintag("twxiawei");
				});
			}
			return (
				!player.hasSkill("twqiongji_silent") &&
				player.getHistory("lose", function (evt) {
					if ((evt.relatedEvent || evt.getParent()) != event) {
						return false;
					}
					for (var i in evt.gaintag_map) {
						if (evt.gaintag_map[i].includes("twxiawei")) {
							return true;
						}
					}
					return false;
				}).length > 0
			);
		},
		forced: true,
		content() {
			if (trigger.name == "damage") {
				trigger.num++;
			} else {
				player.draw();
				player.addTempSkill("twqiongji_silent");
			}
		},
		ai: {
			combo: "twxiawei",
			halfneg: true,
		},
		subSkill: { silent: { charlotte: true } },
	}
```

## tw_haomeng 名字:TW郝萌 势力:qun

### twgongge 名字:攻阁
描述: `${get.poptip("rule_cuijian")}：你可以选择一项：1.摸X+1张牌。其响应此牌后，跳过你的下一个摸牌阶段；2.弃置其X+1张牌。此牌结算结束后，若其体力值不小于你，你交给其X张牌；3.此牌对其造成的伤害+X。此牌结算结束后，其回复X点体力。`
```js
twgongge: {
		audio: 3,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!event.isFirstTarget || !event.targets) {
				return false;
			}
			return get.tag(event.card, "damage");
		},
		usable: 1,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.name.slice(0, -5)), (card, player, target) => {
					const trigger = _status.event.getTrigger();
					return trigger.targets.includes(target);
				})
				.set("ai", target => {
					var player = _status.event.player;
					var trigger = _status.event.getTrigger();
					var att = get.attitude(player, target);
					var damageNum = trigger.getParent().baseDamage;
					var map = trigger.getParent().customArgs,
						id = target.playerid;
					if (map[id]) {
						if (typeof map[id].baseDamage == "number") {
							damageNum = map[id].baseDamage;
						}
						if (typeof map[id].extraDamage == "number") {
							damageNum += map[id].extraDamage;
						}
					}
					if (
						target.hasSkillTag("filterDamage", null, {
							player: trigger.player,
							card: trigger.card,
						})
					) {
						damageNum = 1;
					}
					var num =
						target.getSkills(null, false, false).filter(function (skill) {
							var info = get.info(skill);
							return info && !info.charlotte;
						}).length + 1;
					var list = [0, 0, 0];
					var player = _status.event.player;
					list[0] = num;
					list[1] = get.effect(target, { name: "guohe_copy2" }, player, player) > 0 ? (target.hp - damageNum < player.hp ? num : num - Math.min(player.getCards("he"), num - 1)) : 0;
					if (_status.event.yimie(trigger, player, target, damageNum)) {
						list[2] = (get.recoverEffect(target, player, player) > get.damageEffect(target, player, player) ? Math.min(num - 1, target.getDamagedHp()) : num - 1) * 2;
					}
					return Math.max.apply(Math, list);
				})
				.set("yimie", (trigger, player, target, damageNum) => {
					var hit = true;
					var att = get.attitude(player, target);
					if (get.type(trigger.card) == "trick" && trigger.player.countCards("hs", { name: "wuxie" })) {
						hit = false;
					}
					if (
						trigger.card.name == "huogong" &&
						trigger.player.countCards("h", card => {
							var list = [];
							for (var i of player.getCards("h")) {
								list.push(get.suit(i));
							}
							return !list.includes(get.suit(card));
						})
					) {
						hit = false;
					}
					var key;
					switch (trigger.card.name) {
						case "sha":
						case "wanjian":
							key = ["shan"];
							break;
						case "juedou":
						case "nanman":
						case "jiedao":
							key = ["sha"];
							break;
						default:
							key = [];
							break;
					}
					if (get.type(trigger.card) == "trick") {
						key.push("wuxie");
					}
					key.push("caochuan");
					var bool1 = get.recoverEffect(target, player, player) > 0 ? 1 : -1;
					var bool2 = (att > 0 && !hit) || (target.countCards("hs", { name: key }) && !trigger.getParent().directHit.includes(target)) ? 1 : -1;
					if (att <= 0 && target.hp - damageNum > 0) {
						return false;
					}
					return (bool1 = bool2 && att != 0);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const num =
				target.getSkills(null, false, false).filter(skill => {
					const info = get.info(skill);
					return info && !info.charlotte;
				}).length + 1;
			event.num = num;
			const list = [];
			const choiceList = [`摸${get.cnNumber(num)}张牌，若${get.translation(target)}响应此牌，则你跳过下个摸牌阶段`, `弃置${get.translation(target)}${get.cnNumber(num)}张牌，此牌结算完毕后，若${get.translation(target)}的体力值不小于你，你交给其${get.cnNumber(num - 1)}张牌`, `令此牌对${get.translation(target)}造成的伤害+${num - 1}，此伤害结算完成后，其回复等量的体力值`];
			list.push("摸牌");
			if (target.countDiscardableCards(player, "he")) {
				list.push("拆牌");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			list.push("加伤");
			const { control } = await player
				.chooseControl(list)
				.set("prompt", "攻阁：请选择一项（" + get.translation(target) + "对应X值：" + (num - 1) + "）")
				.set("ai", () => _status.event.choice)
				.set(
					"choice",
					(function () {
						var att = get.attitude(player, target);
						var damageNum = trigger.getParent().baseDamage;
						var map = trigger.getParent().customArgs,
							id = target.playerid;
						if (map[id]) {
							if (typeof map[id].baseDamage == "number") {
								damageNum = map[id].baseDamage;
							}
							if (typeof map[id].extraDamage == "number") {
								damageNum += map[id].extraDamage;
							}
						}
						if (
							target.hasSkillTag("filterDamage", null, {
								player: trigger.player,
								card: trigger.card,
							})
						) {
							damageNum = 1;
						}
						var yimie = function () {
							if (damageNum == 1) {
								return false;
							}
							var hit = true;
							if (get.type(trigger.card) == "trick" && trigger.player.countCards("hs", { name: "wuxie" })) {
								hit = false;
							}
							if (
								trigger.card.name == "huogong" &&
								trigger.player.countCards("h", function (card) {
									var list = [];
									for (var i of player.getCards("h")) {
										list.push(get.suit(i));
									}
									return !list.includes(get.suit(card));
								})
							) {
								hit = false;
							}
							var key;
							switch (trigger.card.name) {
								case "sha":
								case "wanjian":
									key = ["shan"];
									break;
								case "juedou":
								case "nanman":
								case "jiedao":
									key = ["sha"];
									break;
								default:
									key = [];
									break;
							}
							key.push("caochuan");
							var bool1 = get.recoverEffect(target, player, player) > 0 ? 1 : -1;
							var bool2 = (att > 0 && !hit) || (target.countCards("hs", { name: key }) && !trigger.getParent().directHit.includes(target)) ? 1 : -1;
							if (att <= 0 && target.hp - damageNum > 0) {
								return false;
							}
							return (bool1 = bool2 && att != 0);
						};
						if (yimie()) {
							return "加伤";
						}
						if (list.includes("拆牌") && get.effect(target, { name: "guohe_copy2" }, player, player) > 0 && target.hp - damageNum < player.hp) {
							return "拆牌";
						}
						return "摸牌";
					})()
				)
				.set("choiceList", choiceList)
				.forResult();
			game.log(player, "选择了", "#y" + control);
			switch (control) {
				case "摸牌": {
					await player.draw(num);
					player.addTempSkill("twgongge_buff1");
					const evt = {
						card: trigger.card,
						target: target,
					};
					player.storage.twgongge_buff1 = evt;
					break;
				}
				case "拆牌": {
					await player.discardPlayerCard(num, target, "he", true);
					player.addTempSkill("twgongge_buff2");
					const evt = {
						card: trigger.card,
						target: target,
						num: num - 1,
					};
					player.storage.twgongge_buff2 = evt;
					break;
				}

				case "加伤": {
					player.addTempSkill("twgongge_buff3");
					const evt = {
						card: trigger.card,
						target: target,
						num: num - 1,
					};
					player.storage.twgongge_buff3 = evt;
					break;
				}
			}
		},
		subSkill: {
			//摸牌后续
			buff1: {
				charlotte: true,
				onremove: true,
				trigger: { global: ["useCard", "respond"] },
				filter(event, player) {
					if (player.skipList.includes("phaseDraw")) {
						return false;
					}
					if (!Array.isArray(event.respondTo) || player != event.respondTo[0]) {
						return false;
					}
					var evt = player.storage.twgongge_buff1;
					if (evt.target == event.player && evt.card == event.respondTo[1]) {
						return true;
					}
					return false;
				},
				direct: true,
				popup: false,
				content() {
					player.skip("phaseDraw");
					game.log(player, "跳过了下个", "#g摸牌阶段");
					player.addTempSkill("twgongge_buff1_mark", "phaseDrawSkipped");
				},
			},
			//拆牌后续
			buff2: {
				charlotte: true,
				onremove: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					if (!player.countCards("he")) {
						return false;
					}
					const evt = player.storage.twgongge_buff2;
					return evt.card == event.card && evt.target.isIn() && evt.target.hp >= player.hp;
				},
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					const evt = player.storage.twgongge_buff2;
					const { target } = evt;
					const num = Math.min(evt.num, player.countCards("he"));
					await player.chooseToGive("he", target, `攻阁：交给${get.translation(target)}${get.cnNumber(num)}张牌`, num, true);
				},
			},
			//加伤后续
			buff3: {
				charlotte: true,
				onremove: true,
				trigger: { source: "damageBegin1", player: "useCardAfter" },
				filter(event, player) {
					if (!event.card) {
						return false;
					}
					var evt = player.storage.twgongge_buff3;
					if (evt.card == event.card && evt.target.isIn() && (event.name == "useCard" || event.player == evt.target)) {
						return true;
					}
					return false;
				},
				direct: true,
				popup: false,
				content() {
					var evt = player.storage.twgongge_buff3;
					if (trigger.name == "damage") {
						trigger.num += evt.num;
					} else if (evt.target.isIn()) {
						evt.target.recover(evt.num);
					}
				},
			},
			buff1_mark: {
				mark: true,
				charlotte: true,
				intro: { content: "跳过下一个摸牌阶段" },
			},
		},
	}
```

## tw_weixu 名字:魏续 势力:qun

### twsuizheng 名字:随征
描述: 锁定技。游戏开始时，你选择一名其他角色，称为“随征”角色。你获得以下效果：当“随征”角色造成伤害后，你摸一张牌；当“随征”角色受到伤害后，你选择一项：1.失去1点体力，令其从牌堆或弃牌堆中获得一张【杀】或【决斗】；2.弃置两张基本牌，令其回复1点体力。
```js
twsuizheng: {
		audio: 3,
		trigger: { global: "phaseBefore", player: "enterGame" },
		filter(event, player) {
			return game.hasPlayer(current => current != player) && (event.name != "phase" || game.phaseNumber == 0);
		},
		forced: true,
		logAudio: () => 1,
		content() {
			"step 0";
			player.chooseTarget("请选择【随征】的目标", lib.translate.twsuizheng_info, lib.filter.notMe, true).set("ai", function (target) {
				var player = _status.event.player;
				return Math.max(1 + get.attitude(player, target) * get.threaten(target), Math.random());
			});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.line(target);
				game.log(player, "选择了", target, "作为", "“随征”角色");
				player.markAuto("twsuizheng", [target]);
				player.addSkill("twsuizheng_draw");
				player.addSkill("twsuizheng_xianfu");
			}
		},
		ai: { expose: 0.3 },
		intro: { content: "已选择$为“随征”角色" },
		subSkill: {
			draw: {
				charlotte: true,
				audio: "twsuizheng3.mp3",
				trigger: { global: "damageSource" },
				filter(event, player) {
					return player.getStorage("twsuizheng").includes(event.source);
				},
				forced: true,
				logTarget: "source",
				content() {
					player.draw();
				},
			},
			xianfu: {
				audio: "twsuizheng2.mp3",
				trigger: { global: "damageEnd" },
				filter(event, player) {
					return player.getStorage("twsuizheng").includes(event.player) && event.player.isIn();
				},
				forced: true,
				charlotte: true,
				logTarget: "player",
				content() {
					"step 0";
					player
						.chooseToDiscard(2, "随征：弃置两张基本牌", "若你弃牌，你令" + get.translation(trigger.player) + "回复1点体力；或点击“取消”失去1点体力，令" + get.translation(trigger.player) + "获得一张【杀】或【决斗】", { type: "basic" })
						.set("ai", function (card) {
							if (_status.event.refuse) {
								return -1;
							}
							return 6 - get.value(card);
						})
						.set("refuse", get.attitude(player, trigger.player) <= 0 || get.effect(player, { name: "losehp" }) >= 0);
					"step 1";
					if (result.bool) {
						trigger.player.recover();
					} else {
						player.loseHp();
						var card = get.cardPile(function (card) {
							return card.name == "sha" || card.name == "juedou";
						});
						if (card) {
							trigger.player.gain(card, "gain2");
						}
					}
				},
			},
		},
	}
```

### twtuidao 名字:颓盗
描述: 限定技。准备阶段，若“随征”角色的体力值不大于2或“随征”角色已死亡，你可以废除你与其的一个坐骑栏并选择一个类别，然后若“随征”角色存活，你获得其所有此类别的牌，否则你从牌堆中获得两张此类别的牌。然后你将“随征”角色改为另一名角色。
```js
twtuidao: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			var targets = player.getStorage("twsuizheng");
			if (!targets.length) {
				return false;
			}
			return targets.some(target => target.hp <= 2 || !target.isIn());
		},
		check(event, player) {
			var targets = player.getStorage("twsuizheng");
			var val = 0;
			for (var target of targets) {
				if (target.hp <= 2 && target.isIn()) {
					val -= get.attitude(player, target);
				} else if (!target.isIn()) {
					val += 6;
				}
			}
			return val > 0;
		},
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		content() {
			"step 0";
			player.awakenSkill(event.name);
			var list1 = ["equip3", "equip4"].map(i => get.translation(i)),
				list2 = ["basic", "trick", "equip"].map(i => get.translation(i));
			var targets = player.getStorage("twsuizheng"),
				str = get.translation(targets);
			if (targets.length) {
				str = "与" + str;
			}
			player
				.chooseButton(2, true, ["颓盗：废除你" + str + "的一个坐骑栏废除并选择一个类别", "坐骑栏", [list1, "tdnodes"], "类别", [list2, "tdnodes"]])
				.set("filterButton", function (button) {
					var list = _status.event.list,
						link = button.link;
					if (ui.selected.buttons.length) {
						if (list.includes(ui.selected.buttons[0].link) && list.includes(link)) {
							return false;
						}
						if (!list.includes(ui.selected.buttons[0].link) && !list.includes(link)) {
							return false;
						}
					}
					return true;
				})
				.set("ai", function (button) {
					var player = _status.event.player;
					var list = _status.event.list,
						link = button.link;
					if (list.includes(link)) {
						if (player.hasDisabledSlot(4)) {
							return "攻击马";
						}
						if (player.hasDisabledSlot(3)) {
							return "防御马";
						}
						return "攻击马";
					}
					if (!list.includes(link)) {
						var player = _status.event.player;
						var targets = player.getStorage("twsuizheng");
						for (var target of targets) {
							if (target.isIn()) {
								var listx = [0, 0, 0],
									list2 = ["basic", "trick", "equip"].map(i => get.translation(i));
								for (var i of target.getCards("he")) {
									listx[list2.indexOf(get.translation(get.type2(i)))]++;
								}
								return list2[listx.indexOf(Math.max.apply(Math, listx))];
							}
						}
						return 1 + Math.random();
					}
				})
				.set("list", list1);
			"step 1";
			if (result.links[0].indexOf("马") == -1) {
				result.links.reverse();
			}
			var subtype = result.links[0] == "防御马" ? "equip3" : "equip4",
				type = { 基本: "basic", 锦囊: "trick", 装备: "equip" }[result.links[1]];
			player.disableEquip(subtype);
			var targets = player.getStorage("twsuizheng");
			for (var target of targets) {
				if (target && target.isIn()) {
					target.disableEquip(subtype);
					var cards = target.getCards("he", card => get.type2(card) == type);
					player.gain(cards, target, "give");
					event.gainners = cards;
				} else {
					var cards = [];
					for (var i = 1; i <= 2; i++) {
						var card = get.cardPile2(function (card) {
							return !cards.includes(card) && get.type2(card) == type;
						});
						if (card) {
							cards.push(card);
						} else {
							break;
						}
					}
					player.gain(cards, "gain2");
					event.gainners = cards;
				}
			}
			"step 2";
			player
				.chooseTarget("请重新选择【随征】目标", true, function (card, player, target) {
					return !player.getStorage("twsuizheng").includes(target);
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					return Math.max(1 + get.attitude(player, target) * get.threaten(target), Math.random());
				});
			"step 3";
			if (result.bool) {
				var target = result.targets[0];
				player.line(target);
				game.log(player, "选择了", target, "作为", "“随征”角色");
				delete player.storage.twsuizheng;
				player.markAuto("twsuizheng", [target]);
			}
		},
		ai: { combo: "twsuizheng" },
	}
```

## xia_xushu 名字:侠徐庶 势力:qun

### twjiange 名字:剑歌
描述: 每回合限一次。你可以将一张非基本牌当做【杀】使用或打出（无距离和次数限制，且不计入次数）。若此时不为你的回合，你摸一张牌。
```js
twjiange: {
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard(card, player) {
			return get.type(card) != "basic";
		},
		usable: 1,
		locked: false,
		viewAs: { name: "sha", storage: { twjiange: true } },
		viewAsFilter(player) {
			if (!player.countCards("hes", card => get.type(card) != "basic")) {
				return false;
			}
		},
		position: "hes",
		selectCard() {
			return _status.event.skill == "twjiange" ? 1 : Infinity;
		},
		precontent() {
			if (player != _status.currentPhase) {
				player
					.when({ player: ["useCard", "respond"] })
					.filter(evt => evt.skill == "twjiange")
					.step(async () => await player.draw());
			}
			event.getParent().addCount = false;
		},
		prompt: "将一张非基本牌当杀使用或打出",
		check(card) {
			var val = get.value(card);
			if (_status.event.name == "chooseToRespond") {
				return 1 / Math.max(0.1, val);
			}
			return 6 - val;
		},
		ai: {
			order(item, player) {
				var target = _status.currentPhase;
				if (!target || target != player) {
					return 7;
				}
				return 1;
			},
			respondSha: true,
			skillTagFilter(player) {
				if (!player.countCards("hes", card => get.type(card) != "basic")) {
					return false;
				}
			},
		},
		mod: {
			targetInRange(card) {
				if (card.storage?.twjiange) {
					return true;
				}
			},
			cardUsable(card, player, num) {
				if (card.storage?.twjiange) {
					return Infinity;
				}
			},
		},
	}
```

### twxiawang 名字:侠望
描述: 当一名角色受到伤害后，若你至其的距离不大于1，你可以对伤害来源使用一张【杀】。当此【杀】结算结束后，若你造成过渠道为此牌的伤害，结束当前阶段。
```js
twxiawang: {
		audio: 2,
		trigger: { global: "damageEnd" },
		filter(event, player) {
			if (!event.source || get.distance(player, event.player) > 1 || !player.canUse("sha", event.source, false, false)) {
				return false;
			}
			return player.hasUsableCard("sha", "use");
		},
		direct: true,
		clearTime: true,
		content() {
			player
				.chooseToUse(
					function (card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					},
					"侠望：是否对" + get.translation(trigger.source) + "使用一张杀？"
				)
				.set("logSkill", "twxiawang")
				.set("complexSelect", true)
				.set("filterTarget", function (card, player, target) {
					if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
						return false;
					}
					return lib.filter.filterTarget.apply(this, arguments);
				})
				.set("sourcex", trigger.source);
			player.addTempSkill("twxiawang_damage");
		},
		subSkill: {
			damage: {
				trigger: { player: "useCardAfter" },
				forced: true,
				popup: false,
				charlotte: true,
				filter(event, player) {
					if (event.card.name != "sha") {
						return false;
					}
					if (event.getParent(2).name != "twxiawang") {
						return false;
					}
					if (!player.hasHistory("sourceDamage", evt => evt.card == event.card)) {
						return false;
					}
					return lib.phaseName.some(phase => {
						const evt = event.getParent(phase);
						return evt?.name === phase;
					});
				},
				content() {
					player.removeSkill(event.name);
					for (const phase of lib.phaseName) {
						const evt = event.getParent(phase);
						if (evt?.name === phase) {
							const name = get.translation(phase);
							game.log(player, "令", _status.currentPhase, "结束了" + name);
							player.line(_status.currentPhase, "thunder");
							evt.skipped = true;
						}
					}
				},
			},
		},
	}
```

## xia_wangyue 名字:侠王越 势力:qun

### twyulong 名字:驭龙
描述: 当你使用【杀】指定第一个目标后，你可以与一名目标角色拼点。若你此次的拼点牌为：黑色，此【杀】伤害+1；红色，此【杀】不可被响应。此【杀】结算完成后，若你赢且此【杀】造成过伤害，你令此【杀】不计入次数；若你没赢且此【杀】未造成伤害，你获得此【杀】。
```js
twyulong: {
		audio: 2,
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!event.isFirstTarget) {
				return false;
			}
			if (event.card.name != "sha") {
				return false;
			}
			return event.targets.some(target => player.canCompare(target));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return _status.event.getTrigger().targets.includes(target) && player.canCompare(target);
				})
				.set("ai", target => {
					const player = get.player();
					if (player.hasCard(card => get.value(card) < 6, "h")) {
						return -get.attitude(player, target);
					}
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!player.canCompare(target)) {
				return;
			}
			const result = await player.chooseToCompare(target).forResult();
			const color = get.color(result.player, false);
			if (color == "black") {
				trigger.getParent().baseDamage++;
				game.log(trigger.card, "的伤害+1");
			} else if (color == "red") {
				trigger.directHit.addArray(game.players);
				game.log(trigger.card, "不可被响应");
			}
			player
				.when("useCardAfter")
				.filter(evt => evt == trigger.getParent())
				.step(async (event, trigger, player) => {
					const bool = game.hasPlayer2(current => current.hasHistory("damage", evt => evt.card == trigger.card), true);
					if (bool !== result.bool) {
						return;
					}
					player.logSkill("twyulong");
					if (bool) {
						if (trigger.addCount !== false) {
							trigger.addCount = false;
							const stat = player.getStat("card"),
								name = trigger.card.name;
							if (typeof stat[name] == "number" && stat[name] > 0) {
								stat[name]--;
							}
							game.log(trigger.card, "不计入次数限制");
						}
					} else {
						if (trigger.cards?.someInD()) {
							await player.gain(trigger.cards.filterInD(), "gain2");
						}
					}
				});
		},
	}
```

### twjianming 名字:剑鸣
描述: 锁定技。每回合每种花色限一次，当你使用或打出【杀】时，或你因拼点而失去牌时，你摸一张牌。
```js
twjianming: {
		audio: 2,
		trigger: {
			player: ["useCard", "respond"],
			global: "loseAsyncAfter",
		},
		getIndex(event, player) {
			if (event.name == "loseAsync") {
				if (!event.getParent()?.name?.startsWith("chooseToCompare")) {
					return [];
				}
				if (!event.getl?.(player)?.cards2?.length) {
					return [];
				}
				return event.getl(player).cards2;
			} else {
				if (event.card.name != "sha") {
					return [];
				}
				return [event.card];
			}
		},
		filter(event, player, name, card) {
			const suit = get.suit(card);
			if (!lib.suit.includes(suit)) {
				return false;
			}
			return !player.getStorage("twjianming_used").includes(suit);
		},
		forced: true,
		async content(event, trigger, player) {
			const skill = "twjianming_used";
			player.addTempSkill(skill);
			player.markAuto(skill, get.suit(event.indexedData));
			player.addTip(
				skill,
				`剑鸣${player
					.getStorage(skill)
					.sort((a, b) => lib.suit.indexOf(b) - lib.suit.indexOf(a))
					.map(suit => get.translation(suit))
					.join("")}`
			);
			await player.draw();
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove(player, skill) {
					player.removeTip(skill);
					player.setStorage(skill, []);
				},
			},
		},
	}
```

## xia_liyàn 名字:李彦 势力:qun

### twzhenhu 名字:震虎
描述: `当你使用伤害牌指定第一个目标时，你可以摸一张牌并与至多三名其他角色${get.poptip("rule_gongtongpindian")}。若你赢，此牌对所有本次拼点没赢的角色造成的伤害+1；若你没赢，你失去1点体力。`
```js
twzhenhu: {
		audio: 2,
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			if (!event.isFirstTarget || !get.is.damageCard(event.card)) {
				return false;
			}
			return (
				!player.hasSkillTag("noCompareSource") &&
				game.hasPlayer(target => {
					return player.canCompare(target, true);
				})
			);
		},
		direct: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt2("twzhenhu"), [1, 3], function (card, player, target) {
					return player.canCompare(target, true);
				})
				.set("ai", function (target) {
					var player = _status.event.player,
						targets = _status.event.getTrigger().targets;
					var num = 0;
					if (player.hasSkill("twlvren")) {
						num += 2 * (ui.selected.targets.length + 1);
					}
					if (player.hasSkill("twchuanshu_effect")) {
						num += 3;
					}
					var hs = player.getCards("h").sort((a, b) => get.number(b) - get.number(a));
					if (hs.length == 0) {
						return -1;
					}
					var ts = target.getCards("h").sort((a, b) => get.number(b) - get.number(a));
					if (Math.min(13, get.number(hs[0]) + num) <= get.number(ts[0])) {
						return -1;
					}
					return get.effect(target, { name: "guohe_copy2" }, player, player) / 2 + (targets.includes(target) ? get.damageEffect(target, player, player) : 0);
				});
			"step 1";
			if (result.bool) {
				var targets = result.targets.sortBySeat();
				event.targets = targets;
				player.logSkill("twzhenhu", targets);
				player.draw();
			} else {
				event.finish();
			}
			"step 2";
			player
				.chooseToCompare(targets, function (card) {
					return get.number(card);
				})
				.setContent("chooseToCompareMeanwhile");
			"step 3";
			if (result.winner && result.winner == player) {
				event.targets.remove(result.winner);
				player.line(event.targets, trigger.card.nature);
				player.addTempSkill("twzhenhu_add");
				if (!trigger.card.storage) {
					trigger.card.storage = {};
				}
				trigger.card.storage.twzhenhu = event.targets;
			} else {
				player.loseHp();
			}
		},
		subSkill: {
			add: {
				charlotte: true,
				onremove: true,
				forced: true,
				popup: false,
				trigger: { global: "damageBegin1" },
				filter(event, player) {
					if (!event.card || !event.card.storage) {
						return false;
					}
					var targets = event.card.storage.twzhenhu;
					return targets && targets.includes(event.player);
				},
				content() {
					trigger.num++;
				},
			},
		},
	}
```

### twlvren 名字:履刃
描述: ①当你对其他角色造成伤害时，你令其获得1枚“刃”标记。②当你使用伤害牌时，你可以额外指定一名有“刃”的角色并移去其所有“刃”。③你的拼点牌点数+2X（X为参与此次拼点的角色数）。
```js
twlvren: {
		audio: 2,
		trigger: { source: "damageBegin3" },
		filter(event, player) {
			return event.player != player && event.player.isIn() && !event.player.hasMark("twlvren");
		},
		logTarget: "player",
		forced: true,
		locked: false,
		group: ["twlvren_more", "twlvren_add"],
		content() {
			trigger.player.addMark("twlvren", 1);
		},
		ai: {
			effect: {
				player(card, player, target) {
					if (target && target.hasMark("twlvren")) {
						return 0.33;
					}
				},
			},
		},
		marktext: "刃",
		intro: { name2: "刃", content: "mark" },
		subSkill: {
			more: {
				audio: "twlvren",
				trigger: { player: "useCard2" },
				filter(event, player) {
					var card = event.card,
						info = get.info(card);
					if (info.allowMultiple == false) {
						return false;
					}
					if (event.targets && !info.multitarget) {
						return (
							get.is.damageCard(event.card) &&
							event.targets &&
							game.hasPlayer(function (target) {
								return target.hasMark("twlvren") && !event.targets.includes(target) && lib.filter.targetEnabled2(card, player, target);
							})
						);
					}
					return false;
				},
				direct: true,
				content() {
					"step 0";
					player
						.chooseTarget(get.prompt("twlvren"), "为" + get.translation(trigger.card) + "额外指定一个有“刃”的角色为目标", function (card, player, target) {
							var evt = _status.event.getTrigger();
							return target.hasMark("twlvren") && !evt.targets.includes(target) && lib.filter.targetEnabled2(evt.card, player, target);
						})
						.set("ai", function (target) {
							return get.effect(target, _status.event.getTrigger().card, _status.event.player);
						});
					"step 1";
					if (result.bool) {
						var targets = result.targets;
						player.logSkill("twlvren", targets);
						player.line(targets, trigger.card.nature);
						trigger.targets.addArray(targets);
						for (var i of targets) {
							i.removeMark("twlvren", i.countMark("twlvren"), false);
						}
					}
				},
			},
			add: {
				audio: "twlvren",
				trigger: { player: "compare", target: "compare" },
				filter(event, player) {
					if (player != event.target && event.iwhile) {
						return false;
					}
					return true;
				},
				forced: true,
				locked: false,
				content() {
					var num = 2 * trigger.lose_list.length;
					if (player == trigger.player) {
						trigger.num1 += num;
						if (trigger.num1 > 13) {
							trigger.num1 = 13;
						}
					} else {
						trigger.num2 += num;
						if (trigger.num2 > 13) {
							trigger.num2 = 13;
						}
					}
					game.log(player, "的拼点牌点数+", num);
				},
			},
		},
	}
```

## xia_tongyuan 名字:侠童渊 势力:qun

### twchaofeng 名字:朝凤
描述: ①你可以将一张【杀】当做【闪】、【闪】当做任意一种【杀】使用或打出。②每回合限两次，当你以此法使用的牌结算结束后，你可以与至多三名角色进行拼点，赢的角色视为对所有没赢的角色使用一张无距离和次数限制且不计入次数的火【杀】。
```js
twchaofeng: {
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			if (!["sha", "shan"].includes(name)) {
				return false;
			}
			return player.hasCard(function (card) {
				const name2 = get.name(card);
				return (name2 == "sha" || name2 == "shan") && name != name2;
			}, "hs");
		},
		filter(event, player) {
			const names = [];
			if (event.filterCard(get.autoViewAs({ name: "sha" }, "unsure"), player, event)) {
				names.push("shan");
			}
			if (event.filterCard(get.autoViewAs({ name: "shan" }, "unsure"), player, event)) {
				names.push("sha");
			}
			return (
				names.length > 0 &&
				player.hasCard(function (card) {
					return names.includes(get.name(card));
				}, "hs")
			);
			//return false;
		},
		group: "twchaofeng_compare",
		chooseButton: {
			dialog(event, player) {
				var list = [];
				if (event.filterCard({ name: "sha" }, player, event)) {
					list.push(["基本", "", "sha"]);
					for (var j of lib.inpile_nature) {
						list.push(["基本", "", "sha", j]);
					}
				}
				if (event.filterCard({ name: "shan" }, player, event)) {
					list.push(["基本", "", "shan"]);
				}
				var dialog = ui.create.dialog("朝凤", [list, "vcard"], "hidden");
				dialog.direct = true;
				return dialog;
			},
			check(button) {
				var player = _status.event.player;
				var card = { name: button.link[2], nature: button.link[3] };
				if (
					_status.event.getParent().type != "phase" ||
					game.hasPlayer(function (current) {
						return player.canUse(card, current) && get.effect(current, card, player, player) > 0;
					})
				) {
					switch (button.link[2]) {
						case "shan":
							return 5;
						case "sha":
							if (button.link[3] == "fire") {
								return 2.95;
							} else if (button.link[3] == "thunder" || button.link[3] == "ice") {
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
					audio: "twchaofeng",
					name: links[0][2],
					filterCard(card, player, target) {
						if (lib.skill.twchaofeng_backup.name == "sha") {
							return get.name(card) == "shan";
						} else {
							return get.name(card) == "sha";
						}
					},
					selectCard: 1,
					check(card, player, target) {
						return 6 - get.value(card);
					},
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						storage: {
							twchaofeng: true,
						},
					},
					position: "hs",
					popname: true,
				};
			},
			prompt(links, player) {
				var view, use;
				if (links[0][2] == "sha") {
					use = "【闪】";
					view = get.translation(links[0][3] || "") + "【" + get.translation(links[0][2]) + "】";
				} else {
					use = "【杀】";
					view = "【闪】";
				}
				return "将一张" + use + "当做" + view + (_status.event.name == "chooseToUse" ? "使用" : "打出");
			},
		},
		ai: {
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
					if (player.countCards("hs", "shan") > 0 && lib.inpile_nature.some(i => player.getUseValue({ name: "sha", nature: i }) > 0)) {
						var temp = get.order({ name: "sha" });
						if (temp > max) {
							max = temp;
						}
					}
					if (max > 0) {
						max += 0.3;
					}
					return max;
				}
				return 4;
			},
			result: {
				player: 1,
			},
			respondSha: true,
			respondShan: true,
			fireAttack: true,
		},
		subSkill: {
			compare: {
				audio: "twchaofeng",
				trigger: { player: "useCardAfter" },
				usable: 2,
				filter(event, player) {
					return event.card?.storage?.twchaofeng;
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget(get.prompt("twchaofeng"), "选择至多三名角色进行拼点，赢的角色视为对所有没赢的角色使用一张无距离和次数限制且不计入次数的火【杀】", [1, 3], (card, player, target) => {
							return player.canCompare(target);
						})
						.set("ai", function (target) {
							const player = _status.event.player,
								targets = ui.selected.targets.concat([target]),
								hs = get.event().max;
							let card = { name: "sha", nature: "fire", isCard: true },
								cache = ai.guessTargetPoints(target, player, null, "10"),
								max = cache.max,
								tar = target,
								eff = -get.attitude(player, target);
							if (target.hasSkill("twlvren")) {
								max += 2 * (ui.selected.targets.length + 1);
							}
							if (target.hasSkill("twchuanshu_effect")) {
								max += 3;
							}
							max = Math.min(13, max);
							cache.max = max;
							for (const cur of ui.selected.targets) {
								const temp = ai.guessTargetPoints(cur, player);
								if (temp.max > max) {
									max = temp.max;
									tar = cur;
								}
							}
							if (hs > max) {
								return (
									(player.canUse(card, target, false) ? get.effect(target, card, player, player) : 0) +
									eff -
									5 +
									ui.selected.targets.reduce((acc, p) => {
										return acc + (player.canUse(card, p, false) ? get.effect(p, card, player, player) : 0) - get.attitude(player, p);
									}, 0)
								);
							}
							return (
								(tar.canUse(card, player, false) ? get.effect(player, card, tar, player) : 0) +
								eff -
								5 +
								ui.selected.targets.reduce((acc, p) => {
									return acc + (tar.canUse(card, p, false) ? get.effect(p, card, tar, player) : 0) - get.attitude(player, p);
								}, 0)
							);
						})
						.set(
							"max",
							(() => {
								const max = player.getCards("h").reduce((res, card) => {
									const number = get.number(card);
									return Math.max(res, number);
								}, 0);
								if (player.hasSkill("twchuanshu_effect")) {
									return Math.min(13, max + 3);
								}
								return max;
							})()
						)
						.forResult();
				},
				async content(event, trigger, player) {
					const result = await player.chooseToCompare(event.targets).setContent("chooseToCompareMeanwhile").forResult();
					if (result.winner) {
						var targets = [player].addArray(event.targets).sortBySeat(player);
						targets.remove(result.winner);
						const card = { name: "sha", nature: "fire", isCard: true };
						const targetsx = targets.filter(function (target) {
							return result.winner.canUse(card, target, false, false);
						});
						if (targetsx.length) {
							await result.winner.useCard(card, targetsx, "noai").set("addCount", false);
						}
					}
				},
			},
		},
	}
```

### twchuanshu 名字:传术
描述: 出牌阶段限一次，你可以令一名角色直到你的下回合开始拼点点数+5，且其使用的下一张【杀】：对其他角色造成伤害+1；造成伤害时你摸X张牌（X为此杀造成伤害值+1）。
```js
twchuanshu: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: true,
		//limited: true,
		skillAnimation: true,
		animationColor: "qun",
		/*async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill))
				.set("ai", target => {
					if (!get.event().bool) {
						return 0;
					}
					let val = get.attitude(_status.event.player, target);
					if (target.hasSkill("twchaofeng")) {
						val += ai.guessTargetPoints(target).max;
					}
					return val * get.threaten(target);
				})
				.set(
					"bool",
					(() => {
						const fs =
							game.findPlayer(cur => {
								return get.attitude(player, cur) > 2 && (cur.hasSkill("twchaofwng") || get.threaten(cur) > player.getHp());
							}) || player;
						return (
							game.countPlayer(cur => {
								let eff = 0;
								if (get.attitude(player, cur) < 0) {
									eff = get.effect(cur, { name: "sha", nature: "fire", isCard: true }, player, player);
								}
								if (fs.hasSkill("twchaofeng")) {
									eff *= 2 - 1 / ai.guessTargetPoints(fs, player).max;
								}
								return Math.max(0, eff);
							}) >
							10 * player.getHp()
						);
					})()
				)
				.forResult();
		},*/
		async content(event, trigger, player) {
			const target = event.targets[0];
			target.addMark("twchuanshu_mark", 1, false);
			target.addSkill("twchuanshu_effect");
			target.markAuto("twchuanshu_effect", [player]);
			player.addSkill("twchuanshu_clear");
			player.markAuto("twchuanshu_clear", [target]);
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					let val = 0;
					if (target.hasSkill("twchaofeng")) {
						val += ai.guessTargetPoints(target).max;
					}
					return val * get.threaten(target);
				},
			},
		},
		subSkill: {
			mark: {
				charlotte: true,
			},
			effect: {
				audio: "twchuanshu",
				trigger: {
					player: "compare",
					target: "compare",
				},
				forced: true,
				popup: false,
				charlotte: true,
				mark: true,
				onremove(player, skill) {
					delete player.storage[skill];
					player.clearMark("twchuanshu_mark", false);
				},
				intro: {
					content(storage, player) {
						var shisyou = player.getStorage("twchuanshu_effect").filter(i => i.isIn());
						var str = "<li>拼点牌点数+5；";
						if (player.hasMark("twchuanshu_mark")) {
							str += "<li>使用的下一张【杀】对除" + get.translation(shisyou) + "外的角色造成伤害时，此伤害+" + player.countMark("twchuanshu_mark") + "；";
							str += "<li>使用的下一张【杀】造成伤害时，" + get.translation(shisyou) + "摸等同于伤害值+1的牌；";
						}
						str = str.slice(0, -1) + "。";
						return str;
					},
				},
				filter(event, player, name) {
					if (event.player == player && event.iwhile > 0) {
						return false;
					}
					return (player == event.player ? event.num1 : event.num2) < 13;
				},
				async content(event, trigger, player) {
					game.log(player, "的拼点牌点数+5");
					if (player == trigger.player) {
						trigger.num1 = Math.min(13, trigger.num1 + 5);
					} else {
						trigger.num2 = Math.min(13, trigger.num2 + 5);
					}
				},
				group: "twchuanshu_damage",
			},
			damage: {
				charlotte: true,
				trigger: { player: ["useCard"], source: ["damageBegin1", "damageBegin4"] }, //, "useCardAfter"
				filter(event, player, name) {
					if (name == "useCard") {
						return event.card.name == "sha" && player.hasMark("twchuanshu_mark");
					}
					if (name == "damageBegin1") {
						return event.card?.twchuanshu_mark && !player.getStorage("twchuanshu_effect").includes(event.player);
					}
					return (
						event.card?.twchuanshu_mark &&
						player.getStorage("twchuanshu_effect").some(function (target) {
							return target.isIn(); // && target != player
						})
					);
					/*return (
						event.card.twchuanshu_mark &&
						player.hasHistory("sourceDamage", function (evt) {
							return evt.card == event.card;
						}) &&
						player.getStorage("twchuanshu_effect").filter(function (target) {
							return target.isIn() && target != player;
						}).length
					);*/
				},
				forced: true,
				async content(event, trigger, player) {
					const name = event.triggername;
					if (name == "useCard") {
						const num = player.countMark("twchuanshu_mark");
						trigger.card.twchuanshu_mark = num;
						player.removeMark("twchuanshu_mark", num, false);
					} else if (name == "damageBegin1") {
						trigger.num += trigger.card.twchuanshu_mark;
					} else {
						const num1 = trigger.card.twchuanshu_mark;
						/*let num2 = 0;
						player.getHistory("sourceDamage", function (evt) {
							if (evt.card == trigger.card) {
								num2 += evt.num;
							}
						});*/
						const targets = player.getStorage("twchuanshu_effect").filter(function (target) {
							return target.isIn(); // && target != player
						});
						if (!targets.length) {
							return;
						}
						if (targets.length == 1) {
							await targets[0].draw(num1 * (trigger.num + 1));
						} else {
							await game.asyncDraw(targets, num1 * (trigger.num + 1));
						}
					}
				},
			},
			clear: {
				charlotte: true,
				onremove: true,
				trigger: { player: "phaseBegin" },
				filter(event, player) {
					return player.getStorage("twchuanshu_clear").length;
				},
				forced: true,
				silent: true,
				async content(event, trigger, player) {
					const targets = player.getStorage("twchuanshu_clear");
					for (const target of targets) {
						target.unmarkAuto("twchuanshu_effect", [player]);
						if (!target.getStorage("twchuanshu_effect").length) {
							target.removeSkill("twchuanshu_effect");
						}
					}
					player.removeSkill("twchuanshu_clear");
				},
			},
		},
	}
```

## tw_zhangning 名字:TW张宁 势力:qun

### twxingzhui 名字:星坠
描述: `出牌阶段限一次。你可以失去1点体力并${get.poptip("rule_shifa")}：亮出牌堆顶2X张牌，若其中有黑色牌，则你可令一名其他角色获得这些黑色牌。若黑色牌的数量不小于X，则你对其造成X点雷电伤害。`
```js
twxingzhui: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		mahouSkill: true,
		filter(event, player) {
			return !player.hasSkill("twxingzhui_mahou");
		},
		content() {
			"step 0";
			player.loseHp();
			player
				.chooseControl("1回合", "2回合", "3回合")
				.set("prompt", "请选择施法时长")
				.set("ai", function () {
					return 2;
				});
			"step 1";
			player.storage.twxingzhui_mahou = [result.index + 1, result.index + 1];
			player.addTempSkill("twxingzhui_mahou", { player: "die" });
		},
		ai: {
			order: 2,
			result: {
				player(player, target) {
					if (!player.hasFriend()) {
						return 0;
					}
					if (player.hp > 1) {
						return 1;
					}
					return 0;
				},
			},
		},
		subSkill: {
			mahou: {
				trigger: { global: "phaseEnd" },
				forced: true,
				popup: false,
				charlotte: true,
				content() {
					"step 0";
					var list = player.storage.twxingzhui_mahou;
					list[1]--;
					if (list[1] == 0) {
						game.log(player, "的", "#g星坠", "魔法生效");
						player.logSkill("twxingzhui");
						var num = list[0];
						event.num = num;
						var cards = game.cardsGotoOrdering(get.cards(num * 2)).cards;
						event.cards = cards;
						player.showCards(cards, get.translation(player) + "发动了【星坠】");
						player.removeSkill("twxingzhui_mahou");
					} else {
						game.log(player, "的", "#g星坠", "魔法剩余", "#g" + list[1] + "回合");
						player.markSkill("twxingzhui_mahou");
						event.finish();
					}
					"step 1";
					var cards2 = [];
					for (var card of event.cards) {
						if (get.color(card, false) == "black") {
							cards2.push(card);
						}
					}
					if (!cards2.length) {
						event.finish();
					} else {
						event.cards2 = cards2;
						var str = "令一名其他角色获得其中的黑色牌（" + get.translation(cards2) + "）";
						if (cards2.length >= event.num) {
							str += "，然后对其造成" + get.cnNumber(event.num) + "点伤害";
						}
						player.chooseTarget("请选择〖星坠〗的目标", str, lib.filter.notMe).set("ai", function (target) {
							var player = _status.event.player;
							if (_status.event.getParent().cards2.length >= _status.event.getParent().num) {
								return get.damageEffect(target, player, player, "thunder");
							}
							return get.attitude(player, target);
						});
					}
					"step 2";
					if (result.bool) {
						var target = result.targets[0];
						player.line(target);
						target.gain(event.cards2, "gain2");
						if (event.cards2.length >= num) {
							target.damage(event.num, "thunder");
						}
					}
				},
				mark: true,
				onremove: true,
				marktext: "♗",
				intro: {
					name: "施法：星坠",
					markcount(storage) {
						if (storage) {
							return storage[1];
						}
						return 0;
					},
					content(storage) {
						if (storage) {
							return "经过" + storage[1] + "个“回合结束时”后，亮出牌堆顶的" + get.cnNumber(storage[0] * 2) + "张牌并执行后续效果";
						}
						return "未指定施法效果";
					},
				},
			},
		},
	}
```

### twjuchen 名字:聚尘
描述: 结束阶段，若你的手牌数和体力值均不为全场最多，则你可以令所有角色弃置一张牌，然后你获得其中的红色牌。
```js
twjuchen: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return (
				game.hasPlayer(function (current) {
					return current != player && current.countCards("h") > player.countCards("h");
				}) &&
				game.hasPlayer(function (current) {
					return current != player && current.hp > player.hp;
				})
			);
		},
		logTarget(event, player) {
			return game.players.sortBySeat(player);
		},
		content() {
			"step 0";
			event.num = 0;
			event.cards = [];
			event.targets = game.players.sortBySeat(player);
			"step 1";
			var target = targets[num];
			if (target.countCards("he")) {
				target.chooseToDiscard("he", true);
			} else {
				event._result = { bool: false };
			}
			"step 2";
			if (result.bool && Array.isArray(result.cards)) {
				event.cards.addArray(result.cards);
			}
			event.num++;
			if (event.num < targets.length) {
				event.goto(1);
			} else {
				game.delayx();
			}
			"step 3";
			var cards = cards.filter(function (i) {
				return get.position(i, true) == "d" && get.color(i, false) == "red";
			});
			if (cards.length) {
				player.gain(cards, "gain2");
			}
		},
	}
```

## tw_yangyi 名字:TW杨仪 势力:shu

### duoduan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twgongsun 名字:共损
描述: 锁定技。出牌阶段开始时，你选择攻击范围内的一名其他角色并选择一种花色，直至你的下个回合开始前或你死亡时，你与其均无法使用、打出或弃置该花色的手牌。
```js
twgongsun: {
		audio: "gongsun",
		trigger: { player: "phaseUseBegin" },
		locked: true,
		filter(event, player) {
			return game.hasPlayer(current => player.inRange(current));
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseButtonTarget({
					createDialog: [
						"共损：选择一名攻击范围内的其他角色，封印一种花色",
						[
							lib.suit.map(suit => {
								return ["", "", `lukai_${suit}`];
							}),
							"vcard",
						],
					],
					filterTarget(card, player, target) {
						return player != target && player.inRange(target);
					},
					forced: true,
					ai1(button) {
						return Math.random();
					},
					ai2(target) {
						const player = get.player();
						return -get.attitude(player, target) * (1 + target.countCards("h"));
					},
				})
				.forResult();
			if (!result?.bool || !result.links?.length || !result.targets?.length) {
				return;
			}
			event.result = {
				bool: true,
				targets: result.targets,
				cost_data: result.links[0][2],
			};
		},
		async content(event, trigger, player) {
			const target = event.targets[0],
				suit = event.cost_data.slice(6),
				skill = `${event.name}_shadow`;
			player.popup(suit + 2, "soil");
			game.log(player, "选择了", suit + 2);
			player.addTempSkill(skill, { player: ["phaseBegin", "die"] });
			player.markAuto(skill, [[target, suit]]);
		},
		subSkill: {
			shadow: {
				marktext: "损",
				onremove: true,
				intro: {
					content(shadow) {
						if (!shadow?.length) {
							return "无效果";
						}
						return shadow.map(list => `${get.translation(list[0])}：${get.translation(list[1])}`).join("<br>");
					},
				},
				global: "twgongsun_shadow2",
			},
			shadow2: {
				mod: {
					cardEnabled(card, player) {
						const suits = [];
						game.countPlayer(current => {
							const list = current.getStorage("twgongsun_shadow");
							if (!list?.length) {
								return false;
							}
							list.forEach(info => {
								if (info[0] == player || current == player) {
									suits.add(info[1]);
								}
							});
						});
						const hs = player.getCards("h", card => suits.includes(get.suit(card, player))),
							cards = [card];
						if (card.cards && Array.isArray(card.cards)) {
							cards.addArray(card.cards);
						}
						if (cards.containsSome(...hs)) {
							return false;
						}
					},
					cardRespondable(card, player) {
						return lib.skill.twgongsun_shadow2.mod.cardEnabled.apply(this, arguments);
					},
					cardSavable(card, player) {
						return lib.skill.twgongsun_shadow2.mod.cardEnabled.apply(this, arguments);
					},
					cardDiscardable(card, player) {
						const suits = [];
						game.countPlayer(current => {
							const list = current.getStorage("twgongsun_shadow");
							if (!list?.length) {
								return false;
							}
							list.forEach(info => {
								if (info[0] == player || current == player) {
									suits.add(info[1]);
								}
							});
						});
						if (suits.includes(get.suit(card, player))) {
							return false;
						}
					},
				},
			},
		},
	}
```

## tw_dengzhi 名字:TW邓芝 势力:shu

### twjimeng 名字:急盟
描述: 出牌阶段限一次。你可以获得一名其他角色区域内的一张牌，然后交给其一张牌。若其体力值不小于你，你摸一张牌。
```js
twjimeng: {
		audio: "jimeng",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.countGainableCards(player, "he") > 0;
			});
		},
		filterTarget(card, player, target) {
			return target != player && target.countGainableCards(player, "hej") > 0;
		},
		content() {
			"step 0";
			player.gainPlayerCard(target, "hej", true);
			"step 1";
			var hs = player.getCards("he");
			if (hs.length) {
				if (hs.length == 1) {
					event._result = { bool: true, cards: hs };
				} else {
					player.chooseCard(true, "交给" + get.translation(target) + "一张牌", "he", true);
				}
			} else {
				event.finish();
			}
			"step 2";
			player.give(result.cards, target);
			"step 3";
			if (target.hp >= player.hp) {
				player.draw();
			}
		},
		ai: {
			order: 8,
			result: {
				player(player, target) {
					if (target.hp >= player.hp) {
						return 1;
					}
					return 0;
				},
				target(player, target) {
					return get.effect(target, { name: "shunshou" }, player, target) / 10;
				},
			},
		},
	}
```

### shuaiyan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## tw_wangling 名字:TW王凌 势力:wei

### twmibei 名字:秘备
描述: 使命技。①使命：使用每种类型且牌名不同的牌各两张。②成功：当你使用牌后，若你于本次事件完成了〖秘备①〗的使命，你获得〖谋立〗。③失败：出牌阶段结束时，若你本回合未使用过牌，你本回合手牌上限-1并重置〖秘备〗。
```js
twmibei: {
		audio: "mibei",
		trigger: { player: "useCardAfter" },
		group: ["twmibei_mark", "twmibei_fail"],
		forced: true,
		locked: false,
		direct: true,
		dutySkill: true,
		derivation: "twmouli",
		filter(event, player) {
			var map = { basic: 0, trick: 0, equip: 0 };
			for (var name of player.getStorage("twmibei")) {
				var type = get.type2(name);
				if (typeof map[type] == "number") {
					map[type]++;
				}
			}
			for (var i in map) {
				if (map[i] < 2) {
					return false;
				}
			}
			return true;
		},
		logAudio: () => "mibei1.mp3",
		skillAnimation: true,
		animationColor: "water",
		content() {
			player.awakenSkill("twmibei");
			game.log(player, "成功完成使命");
			player.addSkills("twmouli");
		},
		intro: { content: "已使用牌名：$" },
		subSkill: {
			mark: {
				trigger: { player: "useCard1" },
				filter(event, player) {
					return !player.getStorage("twmibei").includes(event.card.name);
				},
				charlotte: true,
				forced: true,
				silent: true,
				dutySkill: true,
				content() {
					player.markAuto("twmibei", [trigger.card.name]);
				},
			},
			fail: {
				audio: "mibei2.mp3",
				trigger: { player: "phaseUseEnd" },
				forced: true,
				filter(event, player) {
					return !player.getHistory("useCard").length;
				},
				content() {
					game.log(player, "使命失败");
					delete player.storage.twmibei;
					player.addTempSkill("twmibei_less");
					player.addMark("twmibei_less", 1, false);
				},
			},
			less: {
				charlotte: true,
				marktext: "缚",
				intro: { content: "本回合手牌上限-#" },
				mod: {
					maxHandcard(player, num) {
						return num - player.countMark("twmibei_less");
					},
				},
			},
		},
	}
```

### twxingqi 名字:星启
描述: 觉醒技。准备阶段，若场上的牌数大于你的体力值，你回复1点体力，然后若〖秘备〗：未完成，你从牌堆中获得每种类型的牌各一张；已完成，本局游戏你使用牌无距离限制。
```js
twxingqi: {
		audio: "xingqi",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			var num = 0;
			game.countPlayer(function (current) {
				num += current.countCards("ej");
			});
			return num > player.hp;
		},
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "thunder",
		content() {
			player.awakenSkill(event.name);
			player.recover();
			if (!player.awakenedSkills.includes("twmibei")) {
				var list = ["basic", "equip", "trick"],
					cards = [];
				for (var i of list) {
					var card = get.cardPile2(function (card) {
						return get.type(card) == i;
					});
					if (card) {
						cards.push(card);
					}
				}
				if (cards.length) {
					player.gain(cards, "gain2");
				}
			} else {
				player.addSkill("twxingqi_range");
			}
		},
		subSkill: {
			range: {
				charlotte: true,
				mark: true,
				marktext: "启",
				mod: {
					targetInRange: () => true,
				},
				intro: { content: "使用牌无距离限制" },
			},
		},
	}
```

## tw_zhugeguo 名字:TW诸葛果 势力:shu

### twqirang 名字:祈禳
描述: 当有装备牌进入你的装备区时，你可以从牌堆中获得一张锦囊牌，你本阶段使用此牌无距离限制且不可被响应，且当你使用此牌时，你可以为这张牌增加或减少一个目标。
```js
twqirang: {
		audio: "qirang",
		trigger: { player: "equipEnd" },
		frequent: true,
		content() {
			var card = get.cardPile(function (card) {
				return get.type2(card) == "trick";
			});
			if (card) {
				player.gain(card, "gain2").gaintag.add("twqirang");
				player.addTempSkill("twqirang_use");
				player.addTempSkill("twqirang_clear", ["phaseZhunbeiAfter", "phaseDrawAfter", "phaseUseAfter", "phaseDiscardAfter", "phaseJieshuAfter", "phaseAfter"]);
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (get.type(card) == "equip" && !get.cardtag(card, "gifts")) {
						return [1, 3];
					}
				},
			},
		},
		subSkill: {
			clear: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("twqirang");
				},
			},
			use: {
				audio: "qirang",
				trigger: { player: "useCard2" },
				forced: true,
				filter(event, player) {
					if (get.type2(event.card) != "trick") {
						return false;
					}
					if (
						!player.hasHistory("lose", function (evt) {
							if ((evt.relatedEvent || evt.getParent()) != event) {
								return false;
							}
							for (var i in evt.gaintag_map) {
								if (evt.gaintag_map[i].includes("twqirang")) {
									return true;
								}
							}
							return false;
						})
					) {
						return false;
					}
					return true;
				},
				content() {
					"step 0";
					game.log(trigger.card, "不可被响应");
					trigger.directHit.addArray(game.players);
					var info = get.info(trigger.card);
					if (info.allowMultiple == false) {
						event.finish();
					} else if (trigger.targets) {
						if (
							!info.multitarget &&
							!game.hasPlayer(function (current) {
								return !trigger.targets.includes(current) && lib.filter.targetEnabled2(trigger.card, player, current);
							})
						) {
							event.finish();
						}
					} else {
						event.finish();
					}
					"step 1";
					var prompt2 = "为" + get.translation(trigger.card) + "增加或减少一个目标";
					player
						.chooseTarget(get.prompt("twqirang"), function (card, player, target) {
							var player = _status.event.player;
							if (_status.event.targets.includes(target)) {
								return true;
							}
							return lib.filter.targetEnabled2(_status.event.card, player, target);
						})
						.set("prompt2", prompt2)
						.set("ai", function (target) {
							var trigger = _status.event.getTrigger();
							var player = _status.event.player;
							return get.effect(target, trigger.card, player, player) * (_status.event.targets.includes(target) ? -1 : 1);
						})
						.set("targets", trigger.targets)
						.set("card", trigger.card);
					"step 2";
					if (result.bool) {
						if (!event.isMine() && !event.isOnline()) {
							game.delayx();
						}
						event.targets = result.targets;
					} else {
						event.finish();
					}
					"step 3";
					if (event.targets) {
						player.line(event.targets);
						if (trigger.targets.includes(event.targets[0])) {
							trigger.targets.removeArray(event.targets);
						} else {
							trigger.targets.addArray(event.targets);
						}
					}
				},
				mod: {
					targetInRange(card, player, target) {
						if (!card.cards) {
							return;
						}
						for (var i of card.cards) {
							if (i.hasGaintag("twqirang")) {
								return true;
							}
						}
					},
				},
			},
		},
	}
```

### twyuhua 名字:羽化
描述: 锁定技。①你的非基本牌不计入手牌上限。②当你于回合外失去牌后，若其中有非基本牌，你可以卜算X，然后你可以摸X张牌（X为其中非基本牌数且至多为5）。
```js
twyuhua: {
		audio: "yuhua",
		frequent: true,
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			if (player == _status.currentPhase) {
				return false;
			}
			if (event.name == "gain" && player == event.player) {
				return false;
			}
			var evt = event.getl(player);
			if (!evt || !evt.cards2 || !evt.cards2.length) {
				return false;
			}
			for (var i of evt.cards2) {
				if (get.type(i, null, player) != "basic") {
					return true;
				}
			}
			return false;
		},
		async content(event, trigger, player) {
			let num = 0,
				evt = trigger.getl(player);
			for (let i of evt.cards2) {
				if (get.type(i, null, player) != "basic" && num < 5) {
					num++;
				}
			}
			await player.chooseToGuanxing(num);
			const result = await player
				.chooseBool("羽化：是否摸" + get.cnNumber(num) + "张牌？")
				.set("frequentSkill", "twyuhua")
				.forResult();
			if (result.bool) {
				await player.draw(num);
			}
		},
		mod: {
			ignoredHandcard(card, player) {
				if (get.type(card) != "basic") {
					return true;
				}
			},
			cardDiscardable(card, player, name) {
				if (name == "phaseDiscard" && get.type(card) != "basic") {
					return false;
				}
			},
		},
	}
```

## tw_fanchou 名字:TW樊稠 势力:qun

### twxingluan 名字:兴乱
描述: 结束阶段，你可以亮出牌堆顶的六张牌，然后你可以选择一种类型的牌并分配给任意角色（每名角色至多三张）。然后所有以此法得到过牌且得到的牌数不少于你的角色失去1点体力。
```js
twxingluan: {
		audio: "xinfu_xingluan",
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		content() {
			"step 0";
			event.cards = game.cardsGotoOrdering(get.cards(6)).cards;
			event.list = [];
			event.videoId = lib.status.videoId++;
			game.broadcastAll(
				function (player, id, cards) {
					var str;
					if (player == game.me && !_status.auto) {
						str = "兴乱：选择分配一种类别的牌";
					} else {
						str = "兴乱";
					}
					var dialog = ui.create.dialog(str, cards);
					dialog.videoId = id;
				},
				player,
				event.videoId,
				event.cards
			);
			event.time = get.utc();
			game.addVideo("showCards", player, ["兴乱", get.cardsInfo(event.cards)]);
			game.addVideo("delay", null, 2);
			"step 1";
			var list = ["basic", "trick", "equip"].filter(type => cards.some(card => get.type2(card) == type));
			let fs = game
					.filterPlayer(i => get.attitude(_status.event.player, i) > 0)
					.sort((a, b) => {
						if (a === player) {
							//尽量把player往前放
							if (a.hp < b.hp) {
								return 1;
							}
							return -1;
						}
						if (b === player) {
							if (b.hp < a.hp) {
								return -1;
							}
							return 1;
						}
						return b.hp - a.hp;
					}),
				es = game.filterPlayer(i => get.attitude(_status.event.player, i) < 0).sort((a, b) => a.hp - b.hp),
				types = list
					.map(type => {
						let num = 0;
						for (let i of event.cards) {
							if (get.type2(i) == type) {
								num++;
							}
						}
						return [type, num];
					})
					.sort((a, b) => b[1] - a[1]);
			event.tempCache = {
				max: -Infinity,
				tars: [],
			};
			for (let idx = 0; idx < types.length; idx++) {
				let f,
					e,
					temp = 0,
					tars = [],
					type = types[idx][1];
				if (es.length * 3 >= type) {
					//都分给敌人
					e = -type;
					while (temp < es.length && temp < type) {
						e += 10 / (2 + es[temp].hp);
						tars.push(es[temp]);
						temp++;
					}
					if (e > event.tempCache.max) {
						event.tempCache.type = types[idx][0];
						event.tempCache.max = e;
						event.tempCache.tars = tars.slice(0);
						delete event.tempCache.more;
					}
				}
				if (fs.length * 3 >= type) {
					//都分给队友
					tars = [];
					f = type - 10 / (2 + fs[0].hp);
					temp = type - Math.max(3, type); //让血厚的尽可能多拿
					if (temp) {
						if (fs.length < 3) {
							tars.push(fs[1]);
							if (temp >= 3) {
								f -= 10 / (2 + fs[1].hp);
							}
						} else {
							if (player !== fs[0]) {
								tars.push(player);
								temp -= Math.max(2, temp);
							}
							if (temp) {
								tars.addArray(
									fs
										.filter(i => fs[0] !== i && player !== i)
										.sort((a, b) => {
											return get.attitude(_status.event.player, b) - get.attitude(_status.event.player, a);
										})
										.slice(temp < 3 ? -1 : -2)
								);
							}
						}
					}
					if (f > event.tempCache.max) {
						event.tempCache.type = types[idx][0];
						event.tempCache.max = f;
						event.tempCache.more = fs[0];
						event.tempCache.tars = tars.slice(0);
					}
				}
			}
			player
				.chooseControl(list)
				.set("ai", function () {
					return _status.event.type;
				})
				.set("type", event.tempCache.type);
			"step 2";
			game.broadcastAll("closeDialog", event.videoId);
			event.cardsx = [];
			var type = result.control;
			for (var j of cards) {
				if (type == get.type2(j)) {
					event.cardsx.push(j);
				}
			}
			var time = 1000 - (get.utc() - event.time);
			if (time > 0) {
				game.delay(0, time);
			}
			player.$gain2(event.cardsx, false);
			game.delayx();
			if (_status.connectMode) {
				game.broadcastAll(function () {
					_status.noclearcountdown = true;
				});
			}
			event.given_map = {};
			event.num = 0;
			"step 3";
			if (event.cardsx.length > 1) {
				player.chooseCardButton("兴乱：请选择要分配的牌", true, event.cardsx, [1, Math.min(3, event.cardsx.length)]).set("ai", function (button) {
					if (ui.selected.buttons.length == 0) {
						return get.buttonValue(button);
					}
					return 0;
				});
			} else if (event.cardsx.length == 1) {
				event._result = { links: event.cardsx.slice(0), bool: true };
			} else {
				event.goto(6);
			}
			"step 4";
			if (result.bool) {
				var cards = result.links;
				event.togive = cards.slice(0);
				player
					.chooseTarget("选择获得" + get.translation(cards) + "的角色", event.cardsx.length == 1, (card, player, target) => {
						var map = _status.event.getParent().given_map;
						var togive = _status.event.getParent().togive;
						return (map[target.playerid] || []).length + togive.length <= 3;
					})
					.set("ai", function (target) {
						let targets = _status.event.targets,
							att = get.attitude(_status.event.player, target);
						if (targets.length) {
							if (targets.includes(target)) {
								return Math.max(1, att * _status.event.value);
							}
							return 0;
						}
						return att * _status.event.value;
					})
					.set(
						"value",
						cards.reduce((p, c) => p + get.value(c, player, "raw"), 0)
					)
					.set("more", event.tempCache.more)
					.set(
						"targets",
						(function () {
							let arr = [],
								arr2 = [];
							if (event.tempCache.more && (event.given_map[event.tempCache.more.playerid] || []).length + cards.length <= 3) {
								return [event.tempCache.more];
							}
							for (let cur of event.tempCache.tars) {
								let map = (event.given_map[cur.playerid] || []).length;
								if (map + cards.length <= 3) {
									if (map) {
										arr2.push(cur);
									} else {
										arr.push(cur);
									}
								}
							}
							if (arr.length) {
								return arr;
							}
							return arr2;
						})()
					);
			}
			"step 5";
			if (result.bool) {
				event.cardsx.removeArray(event.togive);
				if (result.targets.length) {
					var id = result.targets[0].playerid,
						map = event.given_map;
					if (!map[id]) {
						map[id] = [];
					}
					map[id].addArray(event.togive);
				}
				if (event.cardsx.length > 0) {
					event.goto(3);
				}
			} else {
				event.goto(3);
			}
			"step 6";
			if (_status.connectMode) {
				game.broadcastAll(function () {
					delete _status.noclearcountdown;
					game.stopCountChoose();
				});
			}
			var list = [];
			for (var i in event.given_map) {
				var source = (_status.connectMode ? lib.playerOL : game.playerMap)[i];
				if (player == source) {
					event.num += event.given_map[i].length;
				}
				player.line(source, "green");
				game.log(source, "获得了", event.given_map[i]);
				list.push([source, event.given_map[i]]);
			}
			game.loseAsync({
				gain_list: list,
				giver: player,
				animate: "gain2",
			}).setContent("gaincardMultiple");
			"step 7";
			var list = [];
			for (var i in event.given_map) {
				var source = (_status.connectMode ? lib.playerOL : game.playerMap)[i];
				if (event.given_map[i].length >= num) {
					list.push(source);
				}
			}
			list.sortBySeat();
			player.line(list);
			for (var i of list) {
				i.loseHp();
			}
		},
	}
```

## tw_xujing 名字:TW许靖 势力:shu

### twboming 名字:博名
描述: ①出牌阶段限两次。你可以将一张牌交给一名其他角色。②结束阶段，若所有其他角色于此回合得到的牌数之和大于1，你摸两张牌。
```js
twboming: {
		audio: "boming",
		enable: "phaseUse",
		usable: 2,
		filter(event, player) {
			return player.countCards("he");
		},
		filterCard: true,
		position: "he",
		filterTarget: lib.filter.notMe,
		discard: false,
		lose: false,
		delay: false,
		content() {
			player.give(cards, target);
		},
		check(card) {
			return 5 - get.value(card);
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					var card = ui.selected.cards[0];
					if (get.attitude(player, target) < 0 && player.hasSkill("twejian")) {
						var dam = get.damageEffect(target, player, target);
						if (dam > 0) {
							return dam;
						}
						var type = get.type2(card, target),
							ts = target.getCards("he", function (card) {
								return get.type(card) == type;
							});
						if (ts.length) {
							var val = get.value(ts, target);
							if (val > get.value(card)) {
								return -Math.max(1, val);
							}
							return 0;
						}
					}
					return get.value(card, target) / 1.5;
				},
			},
		},
		group: "twboming_draw",
		subSkill: {
			draw: {
				audio: "boming",
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				locked: false,
				filter(event, player) {
					var num = 0;
					for (var target of game.filterPlayer(i => i != player)) {
						target.getHistory("gain", evt => (num += evt.cards.length));
						if (num > 1) {
							return true;
						}
					}
					return false;
				},
				content() {
					player.draw(2);
				},
			},
		},
	}
```

### twejian 名字:恶荐
描述: 当其他角色得到你的牌后，若其有其他与此牌类型相同的牌，你可以令其选择一项：1.受到你造成的1点伤害；2.弃置这些牌。
```js
twejian: {
		audio: "ejian",
		trigger: {
			global: ["gainAfter", "loseAsyncAfter"],
		},
		filter(event, player) {
			if (event.name == "gain") {
				var cards = event.getg(event.player);
				if (!cards.length) {
					return false;
				}
				var cards2 = event.getl(player).cards2;
				for (var i of cards2) {
					if (
						cards.includes(i) &&
						event.player.countCards("he", card => {
							return card != i && get.type2(card) == get.type2(i);
						})
					) {
						return true;
					}
				}
				return false;
			} else {
				if (event.type != "gain") {
					return false;
				}
				var cards = event.getl(player).cards2;
				if (!cards.length) {
					return false;
				}
				return game.hasPlayer(current => {
					if (current == player) {
						return false;
					}
					var cardsx = event.getg(current);
					for (var i of cardsx) {
						if (
							cards.includes(i) &&
							current.countCards("he", card => {
								return card != i && get.type2(card) == get.type2(i);
							})
						) {
							return true;
						}
					}
					return false;
				});
			}
		},
		logTarget(event, player) {
			if (event.name == "gain") {
				return event.player;
			} else {
				var cards = event.getl(player).cards2;
				return game.filterPlayer(current => {
					if (current == player) {
						return false;
					}
					var cardsx = event.getg(current);
					for (var i of cardsx) {
						if (
							cards.includes(i) &&
							current.countCards("he", card => {
								return card != i && get.type2(card) == get.type2(i);
							})
						) {
							return true;
						}
					}
					return false;
				});
			}
		},
		direct: true,
		content() {
			"step 0";
			if (trigger.name == "gain") {
				event.targets = [trigger.player];
			} else {
				var cards = trigger.getl(player).cards2;
				event.targets = game.filterPlayer(current => {
					if (current == player) {
						return false;
					}
					var cardsx = trigger.getg(current);
					for (var i of cardsx) {
						if (
							cards.includes(i) &&
							current.countCards("he", card => {
								return card != i && get.type2(card) == get.type2(i);
							})
						) {
							return true;
						}
					}
					return false;
				});
			}
			"step 1";
			var target = event.targets.shift();
			event.target = target;
			player.chooseBool(get.prompt("twejian", target), "当其他角色得到你的牌后，若其有其他与此牌类型相同的牌，你可以令其选择一项：1.受到你造成的1点伤害；2.弃置这些牌").set("ai", () => {
				return get.attitude(player, _status.event.getParent().target) < 0;
			});
			"step 2";
			if (result.bool) {
				player.logSkill("twejian", target);
				var cards = trigger.getg(target);
				event.cards = cards;
				event.cardType = [];
				for (var card of cards) {
					event.cardType.add(get.type(card, "trick", target));
				}
				var list = ["选项一", "选项二"];
				target
					.chooseControl(list)
					.set("prompt", "恶荐：请选择一项")
					.set("choiceList", ["受到1点伤害", "弃置所有除" + get.translation(cards) + "外的" + get.translation(event.cardType) + "牌"])
					.set("ai", function () {
						var player = _status.event.player;
						var types = _status.event.cardType,
							cards = player.getCards("he", function (card) {
								return types.includes(get.type2(card));
							});
						if (cards.length == 1) {
							return "选项二";
						}
						if (cards.length >= 2) {
							for (var i = 0; i < cards.length; i++) {
								if (get.tag(cards[i], "save")) {
									return "选项一";
								}
							}
						}
						if (player.hp == 1) {
							return "选项二";
						}
						for (var i = 0; i < cards.length; i++) {
							if (get.value(cards[i]) >= 8) {
								return "选项一";
							}
						}
						if (cards.length > 2 && player.hp > 2) {
							return "选项一";
						}
						if (cards.length > 3) {
							return "选项一";
						}
						return "选项二";
					})
					.set("cardType", event.cardType);
			} else {
				event.goto(4);
			}
			"step 3";
			if (result.control == "选项一") {
				target.damage();
			} else {
				target.discard(
					target.getCards("he", card => {
						return event.cardType.includes(get.type2(card)) && !cards.includes(card);
					})
				);
			}
			"step 4";
			if (event.targets.length > 0) {
				event.goto(1);
			} else {
				event.finish();
			}
		},
		ai: {
			expose: 0.3,
		},
	}
```

## tw_zhangfei 名字:TW张飞 势力:shu

### new_repaoxiao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twxuhe 名字:虚吓
描述: 当你使用的【杀】被【闪】抵消时，你可以令其选择一项：1.受到你造成的1点伤害；2.本回合你使用的下一张牌对其造成伤害时，此伤害+2。
```js
twxuhe: {
		audio: "retishen",
		trigger: { player: "shaMiss" },
		check(event, player) {
			return get.attitude(player, event.target) < 0;
		},
		logTarget: "target",
		content() {
			"step 0";
			trigger.target
				.chooseControl()
				.set("choiceList", ["受到" + get.translation(player) + "对你造成的1点伤害", "令" + get.translation(player) + "使用的下一张牌对你造成的伤害+2"])
				.set("ai", function () {
					var target = _status.event.player,
						player = _status.event.getParent().player;
					if (
						target.hp <= 3 &&
						target.hp > 1 &&
						player.countCards("hs", function (card) {
							return get.tag(card, "damage") && player.canUse(card, target);
						}) > 0
					) {
						return 0;
					}
					return 1;
				});
			"step 1";
			var target = trigger.target;
			switch (result.index) {
				case 0:
					player.line(target, "fire");
					target.damage();
					break;
				case 1:
					target.line(player, "fire");
					player.storage.twxuhe_damage = target;
					trigger.getParent().twxuhe = true;
					player.addTempSkill("twxuhe_damage");
					break;
			}
		},
		subSkill: {
			damage: {
				charlotte: true,
				onremove: true,
				mark: true,
				intro: { content: "本回合使用的下一张牌对$造成伤害时，此伤害+2" },
				trigger: {
					source: "damageBegin1",
					player: "useCardAfter",
				},
				direct: true,
				filter(event, player) {
					if (event.name == "useCard") {
						return !event.twxuhe;
					}
					if (!event.card) {
						return false;
					}
					var evt = event.getParent(2);
					var history = player.getHistory("useCard");
					return evt.name == "useCard" && history[history.indexOf(evt) - 1].twxuhe;
				},
				content() {
					if (trigger.name != "useCard") {
						trigger.num += 2;
					}
					player.removeSkill("twxuhe_damage");
				},
			},
		},
	}
```

## tw_xuezong 名字:TW薛综 势力:wu

### funan
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twjiexun 名字:诫训
描述: 结束阶段，你可以选择一个花色并令一名其他角色摸等同于场上此花色牌数张牌，然后其弃置X张牌。若其以此法弃置了所有牌，你选择一项：1.摸X张牌，然后将X归零；2.修改〖复难〗和〖诫训〗（X为此前〖诫训〗的发动次数）。
```js
twjiexun: {
		intro: { content: "已发动#次" },
		audio: "jiexun",
		trigger: { player: "phaseJieshuBegin" },
		onremove: true,
		direct: true,
		derivation: ["twfunanx", "twjiexunx"],
		content() {
			"step 0";
			var suits = {};
			game.countPlayer(current => {
				for (var card of current.getCards("ej")) {
					if (typeof suits[get.suit(card)] != "number") {
						suits[get.suit(card)] = 0;
					}
					suits[get.suit(card)]++;
				}
			});
			var choices = lib.suit.slice();
			choices.push("cancel2");
			var str = lib.suit
				.map(suit => {
					return get.translation(suit) + "：" + get.cnNumber(suits[suit] || 0) + "张";
				})
				.join("；");
			player
				.chooseControl(choices)
				.set("prompt", get.prompt("twjiexun") + "（已发动过" + get.cnNumber(player.countMark("twjiexun")) + "次）")
				.set("ai", function () {
					var player = _status.event.player;
					var map = {};
					game.countPlayer(current => {
						for (var card of current.getCards("ej")) {
							if (typeof map[get.suit(card)] != "number") {
								map[get.suit(card)] = 0;
							}
							map[get.suit(card)]++;
						}
					});
					for (var suit in map) {
						map[suit] = Math.abs(map[suit]);
					}
					var bool = game.hasPlayer(current => get.attitude(player, current) > 0 && player != current);
					var list = lib.suit.slice().sort((a, b) => (bool ? 1 : -1) * ((map[b] || 0) - (map[a] || 0)));
					if ((bool && map[list[0]] > 0) || !bool || player.hasMark("twjiexun")) {
						return list[0];
					}
					return "cancel2";
				})
				.set("prompt2", get.skillInfoTranslation("twjiexun", player, false) + "<br>" + str);
			"step 1";
			if (result.control != "cancel2") {
				var suit = result.control;
				event.suit = suit;
				var num1 = game.countPlayer(function (current) {
					return current.countCards("ej", { suit: suit });
				});
				var num2 = player.countMark("twjiexun");
				event.num1 = num1;
				event.num2 = num2;
				var str = "令一名其他角色摸" + get.cnNumber(num1) + "张牌";
				if (num2) {
					str += "，然后弃置" + get.cnNumber(num2) + "张牌";
				}
				player
					.chooseTarget("请选择【诫训】的目标", str, lib.filter.notMe)
					.set("ai", function (target) {
						var player = _status.event.player,
							att = get.attitude(player, target);
						return _status.event.eff * get.sgn(att) + att / 114514;
					})
					.set("eff", num1 >= num2 && num1 > 0 ? 1 : -1);
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twjiexun", target);
				if (player.hasMark("twjiexun") || event.num1) {
					player.addExpose(0.2);
				}
				player.popup(event.suit);
				game.log(player, "选择了", "#y" + get.translation(event.suit));
				player.addMark("twjiexun", 1, false);
				if (event.num1) {
					target.draw(event.num1);
				}
			} else {
				event.finish();
			}
			"step 3";
			if (event.num2) {
				target.chooseToDiscard(event.num2, true, "he");
			} else {
				event.finish();
			}
			"step 4";
			if (result?.cards?.length > 0 && result.autochoose && result.cards?.length === result.rawcards?.length && !player.hasSkill("funan_jiexun")) {
				player
					.chooseControl()
					.set("choiceList", ["摸" + get.cnNumber(event.num2) + "张牌，将【诫训】的发动次数归零", "修改【复难】和【诫训】"])
					.set("ai", () => _status.event.choice)
					.set("prompt", "诫训：选择一项")
					.set("choice", event.num2 >= 4 ? 0 : event.num2 <= 1 ? 1 : [0, 1].randomGet());
			} else {
				event.finish();
			}
			"step 5";
			if (result.index == 0) {
				player.draw(event.num2);
				player.removeMark("twjiexun", player.countMark("twjiexun"), false);
				game.log(player, "归零了", "#g【诫训】", "的发动次数");
			} else {
				game.log(player, "修改了", "#g【复难】", "和", "#g【诫训】");
				player.addSkill("funan_jiexun");
			}
		},
	}
```

## tw_xunchen 名字:TW荀谌 势力:qun

### twweipo 名字:危迫
描述: 出牌阶段限一次。你可以令一名角色弃置一张牌，然后令其获得一张【兵临城下】或一张由你选择的智囊牌。
```js
twweipo: {
		audio: "mjweipo",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.countCards("he");
			});
		},
		filterTarget(card, player, target) {
			return target.countCards("he");
		},
		content() {
			"step 0";
			target.chooseToDiscard("he", true);
			"step 1";
			var list = ["binglinchengxiax"];
			list.addArray(get.zhinangs());
			player.chooseButton(["危迫：令其获得一张智囊牌或【兵临城下】", [list, "vcard"]], true).set("ai", function (button) {
				return _status.event.getParent().target.getUseValue({ name: button.link[2] });
			});
			"step 2";
			if (result.bool) {
				var name = result.links[0][2],
					card = false;
				game.log(player, "选择了", "#y" + get.translation(name));
				if (name == "binglinchengxiax") {
					if (!_status.binglinchengxiax) {
						_status.binglinchengxiax = [
							["spade", 7],
							["club", 7],
							["club", 13],
						];
						game.broadcastAll(function () {
							lib.inpile.add("binglinchengxiax");
						});
					}
					if (_status.binglinchengxiax.length) {
						var info = _status.binglinchengxiax.randomRemove();
						card = game.createCard2("binglinchengxiax", info[0], info[1]);
					}
				}
				if (!card) {
					card = get.cardPile(name);
				}
				if (card) {
					target.gain(card, "gain2");
				}
			}
		},
		ai: {
			order: 7.1,
			result: {
				target(player, target) {
					if (target == player) {
						return player.countCards("he") ? 10 : 0.01;
					}
					return (target.countCards("he") + 0.5) * Math.sqrt(Math.max(1, target.hp));
				},
			},
		},
	}
```

### mjchenshi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twmouzhi 名字:谋识
描述: 锁定技。当你受到伤害时，若伤害渠道对应的牌和你上次受到的伤害渠道对应的牌颜色相同，则你防止此伤害。
```js
twmouzhi: {
		audio: "mjmouzhi",
		intro: { content: "上次受到伤害的颜色：$" },
		trigger: { player: "damageBegin4" },
		forced: true,
		group: "twmouzhi_mark",
		filter(event, player) {
			if (!event.card || get.color(event.card) == "none") {
				return false;
			}
			var all = player.getAllHistory("damage");
			if (!all.length) {
				return false;
			}
			return all[all.length - 1].card && get.color(all[all.length - 1].card) == get.color(event.card);
		},
		content() {
			trigger.cancel();
		},
		ai: {
			effect: {
				target: (card, player, target) => {
					if (typeof card === "object" && get.tag(card, "damage")) {
						let color = get.color(card);
						if (color === "none") {
							return;
						}
						let all = target.getAllHistory("damage");
						if (!all.length || !all[all.length - 1].card) {
							return;
						}
						if (get.color(all[all.length - 1].card) === color) {
							return "zeroplayertarget";
						}
					}
				},
			},
		},
		subSkill: {
			mark: {
				trigger: { player: "damage" },
				silent: true,
				firstDo: true,
				content() {
					if (!trigger.card || get.color(trigger.card) == "none") {
						player.unmarkSkill("twmouzhi");
					} else {
						player.markSkill("twmouzhi");
						player.storage.twmouzhi = get.color(trigger.card);
						game.broadcastAll(
							function (player, color) {
								if (player.marks.twmouzhi) {
									player.marks.twmouzhi.firstChild.innerHTML = "<font color=" + color + ">谋</font>";
								}
								player.storage.twmouzhi = color;
							},
							player,
							player.storage.twmouzhi
						);
					}
				},
			},
		},
	}
```

## tw_jiangqing 名字:TW蒋钦 势力:wu

### twshangyi 名字:尚义
描述: 出牌阶段限一次。你可以弃置一张牌并选择一名有手牌的其他角色，你令其观看你的手牌，然后你观看其手牌并选择一项：1.弃置其中一张牌；2.与其交换一张手牌。若你以此法弃置了其的黑色牌，或你与其交换的两张牌均为红色，你摸一张牌。
```js
twshangyi: {
		audio: "spshangyi",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return (
				player.countCards("he") &&
				game.hasPlayer(function (current) {
					return current != player && current.countCards("h");
				})
			);
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h");
		},
		filterCard: true,
		position: "he",
		async content(event, trigger, player) {
			const { target } = event;
			await target.viewHandcards(player);
			var chooseButton;
			if (player.countCards("h")) {
				chooseButton = player.chooseButton([1, 2], ['###尚义###<div class="text center">选择' + get.translation(target) + "的一张手牌以弃置，或选择你与其的各一张牌以交换</div>", '<div class="text center">' + get.translation(target) + "的手牌</div>", target.getCards("h"), '<div class="text center">你的手牌</div>', player.getCards("h")], true);
			} else {
				chooseButton = player.chooseButton(['###尚义###<div class="text center">弃置' + get.translation(target) + "的一张手牌</div>", '<div class="text center">' + get.translation(target) + "的手牌</div>", target.getCards("h")], true);
			}
			chooseButton.set("target", target);
			chooseButton.set("ai", function (button) {
				var player = _status.event.player,
					owner = get.owner(button.link),
					color = get.color(button.link, owner),
					value = get.value(button.link, owner);
				if (player.countCards("h")) {
					if (!ui.selected.buttons.length) {
						if (
							player.countCards("h", function (card) {
								return get.color(card, player) == "red" && get.value(card) < 6;
							}) &&
							color == "red" &&
							value > 7
						) {
							return value * 3;
						}
						return value;
					} else {
						if (get.value(ui.selected.buttons[0].link) < 4) {
							return 0;
						}
						return 4 + (get.color(ui.selected.buttons[0].link, get.owner(ui.selected.buttons[0].link)) == "red" ? 3 : 1) - value;
					}
				} else {
					if (color == "black") {
						return value * 1.5;
					}
					return value;
				}
			});
			chooseButton.set("filterButton", function (button) {
				if (get.itemtype(button.link) != "card") {
					return false;
				}
				if (!ui.selected.buttons.length && get.owner(button.link) != _status.event.target) {
					return false;
				}
				if (ui.selected.buttons.length && get.owner(ui.selected.buttons[0].link) == get.owner(button.link)) {
					return false;
				}
				return true;
			});
			const result = await chooseButton.forResult();
			if (result.bool) {
				if (result.links.length == 1) {
					const cards = (await target.modedDiscard(result.links, player).forResult()).cards;
					if (get.color(cards[0], target) === "black") {
						await player.draw();
					}
				} else {
					var links = result.links.slice();
					if (get.owner(links[0]) != player) {
						links.reverse();
					}
					var card1 = links[0],
						card2 = links[1];
					await player.swapHandcards(target, [card1], [card2]);
					if (get.color(card1, player) === "red" && get.color(card2, target) === "red") {
						await player.draw();
					}
				}
			}
		},
		ai: {
			order: 10,
			result: { target: -1 },
		},
	}
```

### twxiangyu 名字:翔羽
描述: 锁定技。①你于回合内的攻击范围+X（X为本回合失去过牌的角色数且至多为5）。②当你使用【杀】指定目标后，若你至目标角色的距离小于你的攻击范围，你令此目标角色抵消此【杀】所需使用的【闪】数+1。
```js
twxiangyu: {
		group: "twxiangyu_lose",
		audio: "zniaoxiang",
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return event.card.name == "sha" && get.distance(player, event.player) < player.getAttackRange();
		},
		forced: true,
		logTarget: "target",
		init(player) {
			var target = _status.currentPhase;
			if (!target || !target != player) {
				return;
			}
			if (!player.getStorage("twxiangyu_range").length) {
				var targets = game.filterPlayer(current => {
					return current.getHistory("lose").length;
				});
				if (targets.length) {
					player.addTempSkill("twxiangyu_range");
					player.markAuto("twxiangyu_range", targets);
				}
			}
		},
		content() {
			var id = trigger.target.playerid;
			var map = trigger.getParent().customArgs;
			if (!map[id]) {
				map[id] = {};
			}
			if (typeof map[id].shanRequired == "number") {
				map[id].shanRequired++;
			} else {
				map[id].shanRequired = 2;
			}
		},
		mod: {
			attackRange(player, num) {
				return num + Math.min(5, player.getStorage("twxiangyu_range").length);
			},
		},
		subSkill: {
			lose: {
				trigger: {
					global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				filter(event, player) {
					return (
						player == _status.currentPhase &&
						game.hasPlayer(function (current) {
							if (player.getStorage("twxiangyu_range").includes(current)) {
								return false;
							}
							var evt = event.getl(current);
							return evt && evt.cards2 && evt.cards2.length > 0;
						})
					);
				},
				silent: true,
				charlotte: true,
				content() {
					player.addTempSkill("twxiangyu_range");
					player.markAuto(
						"twxiangyu_range",
						game.filterPlayer(function (current) {
							if (player.getStorage("twxiangyu_range").includes(current)) {
								return false;
							}
							var evt = trigger.getl(current);
							return evt && evt.cards2 && evt.cards2.length > 0;
						})
					);
					player.syncStorage("twxiangyu_range");
				},
			},
			range: {
				marktext: "羽",
				intro: {
					content(storage, player) {
						var num = Math.min(5, storage ? storage.length : 0);
						return "攻击范围+" + num;
					},
				},
				charlotte: true,
				onremove: true,
			},
		},
	}
```

## tw_guyong 名字:TW顾雍 势力:wu

### twgyshenxing 名字:慎行
描述: 出牌阶段，你可以弃置X张牌，然后摸一张牌并获得1枚“慎”标记（X为你的“慎”数且至多为2）。
```js
twgyshenxing: {
		audio: "xinshenxing",
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("he") >= Math.min(2, player.countMark("twgyshenxing_used"));
		},
		selectCard() {
			return Math.min(2, _status.event.player.countMark("twgyshenxing_used"));
		},
		prompt() {
			return "弃置" + get.cnNumber(Math.min(2, _status.event.player.countMark("twgyshenxing_used"))) + "张牌并摸一张牌";
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
		content() {
			player.draw();
			player.addTempSkill("twgyshenxing_used", "phaseUseAfter");
			player.addMark("twgyshenxing_used", 1, false);
		},
		ai: {
			order(item, player) {
				if (!player.hasMark("twgyshenxing_used")) {
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
				marktext: "慎",
				intro: { content: "已发动过#次" },
			},
		},
	}
```

### twbingyi 名字:秉壹
描述: 结束阶段，你可以展示所有手牌，若这些牌的颜色均相同或类别均相同，你可以令至多Y名角色各摸一张牌（Y为你的手牌数）。若你以此法展示的牌数大于1且这些牌的颜色均相同且类别均相同，你移去所有“慎”。
```js
twbingyi: {
		audio: "bingyi_xin_guyong",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.countCards("h");
		},
		filterx(event, player) {
			var cards = player.getCards("h");
			if (cards.length == 1) {
				return true;
			}
			var color = get.color(cards[0], player),
				type = get.type2(cards[0], player);
			for (var i = 1; i < cards.length; i++) {
				if (color && get.color(cards[i], player) != color) {
					color = false;
				}
				if (type && get.type2(cards[i], player) != type) {
					type = false;
				}
				if (!color && !type) {
					return false;
				}
			}
			return true;
		},
		filtery(event, player) {
			var cards = player.getCards("h");
			if (player.countCards("h") <= 1) {
				return false;
			}
			var color = get.color(cards[0], player),
				type = get.type2(cards[0], player);
			var colorx = true,
				typex = true;
			for (var i = 1; i < cards.length; i++) {
				if (color && get.color(cards[i], player) != color) {
					colorx = false;
				}
				if (type && get.type2(cards[i], player) != type) {
					typex = false;
				}
			}
			return colorx && typex;
		},
		direct: true,
		content() {
			"step 0";
			event.boolx = false;
			if (lib.skill.twbingyi.filtery(trigger, player)) {
				event.boolx = true;
			}
			if (lib.skill.twbingyi.filterx(trigger, player)) {
				player.chooseTarget(get.prompt("twbingyi"), "选择至多" + get.cnNumber(player.countCards("h")) + "名角色，你展示所有手牌，这些角色各摸一张牌" + (event.boolx ? "，然后你移去所有“慎”" : ""), [0, player.countCards("h")]).set("ai", function (target) {
					return get.attitude(_status.event.player, target);
				}).animate = false;
			} else {
				player.chooseBool(get.prompt("twbingyi"), "展示所有手牌").ai = function () {
					return false;
				};
			}
			"step 1";
			if (result.bool) {
				player.logSkill("twbingyi");
				player.showHandcards(get.translation(player) + "发动了【秉壹】");
				event.targets = result.targets;
			} else {
				event.finish();
			}
			"step 2";
			if (targets && targets.length) {
				player.line(targets, "green");
				targets.sortBySeat();
				game.asyncDraw(targets);
			}
			"step 3";
			if (event.boolx) {
				player.removeMark("twgyshenxing", player.countMark("twgyshenxing"));
			}
		},
		ai: { expose: 0.1 },
	}
```

## tw_chendong 名字:TW陈武董袭 势力:wu

### twyilie 名字:毅烈
描述: `出牌阶段开始时，你可以选择一项：1.本阶段内使用【杀】的次数上限+1；2.本回合内使用【杀】指定处于连环状态的目标后，或使用【杀】被【闪】抵消时，摸一张牌；3.${get.poptip("rule_beishui")}：失去1点体力。`
```js
twyilie: {
		audio: "duanxie",
		trigger: { player: "phaseUseBegin" },
		direct: true,
		content() {
			"step 0";
			player
				.chooseControl("选项一", "选项二", "背水！", "cancel2")
				.set("choiceList", ["本阶段内使用【杀】的次数上限+1", "本回合内使用【杀】指定处于连环状态的目标后，或使用【杀】被【闪】抵消时，摸一张牌", "背水！失去1点体力并依次执行上述所有选项"])
				.set("ai", function () {
					if (
						player.countCards("hs", function (card) {
							return get.name(card) == "sha" && player.hasValueTarget(card);
						}) > player.getCardUsable({ name: "sha" })
					) {
						return player.hp > 2 ? 2 : 0;
					}
					return 1;
				})
				.set("prompt", get.prompt("twyilie"));
			"step 1";
			if (result.control != "cancel2") {
				player.logSkill("twyilie");
				game.log(player, "选择了", "#g【毅烈】", "的", "#y" + result.control);
				if (result.index % 2 == 0) {
					player.addTempSkill("twyilie_add", "phaseUseEnd");
				}
				if (result.index > 0) {
					player.addTempSkill("twyilie_miss");
				}
				if (result.index == 2) {
					player.loseHp();
				}
			}
		},
		subSkill: {
			add: {
				charlotte: true,
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + 1;
						}
					},
				},
				mark: true,
				intro: { content: "本阶段使用【杀】的次数上限+1" },
			},
			miss: {
				charlotte: true,
				audio: "duanxie",
				trigger: { player: ["useCardToTargeted", "shaMiss"] },
				filter(event, player, name) {
					if (name == "useCardToTargeted") {
						return event.card.name == "sha" && event.target.isLinked();
					}
					return true;
				},
				forced: true,
				content() {
					player.draw();
				},
			},
		},
	}
```

### twfenming 名字:奋命
描述: `准备阶段，你可以选择一名其他角色并选择一项：1.令其弃置一张牌；2.令其横置；3.${get.poptip("rule_beishui")}：你横置。`
```js
twfenming: {
		audio: "fenming",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(function (target) {
				return target != player && (target.countCards("he") || !target.isLinked());
			});
		},
		direct: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt2("twfenming"), function (card, player, target) {
					return target != player && (target.countCards("he") || !target.isLinked());
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					return get.damageEffect(target, player, player);
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twfenming", target);
				var list = [],
					choiceList = ["令" + get.translation(target) + "弃置一张牌", "令" + get.translation(target) + "横置", "背水！横置并依次令" + get.translation(target) + "执行上述所有选项"];
				if (target.countCards("he")) {
					list.push("选项一");
				} else {
					choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
				}
				if (!target.isLinked()) {
					list.push("选项二");
				} else {
					choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
				}
				if (target.countCards("he") && !target.isLinked() && !player.isLinked()) {
					list.push("背水！");
				} else {
					choiceList[2] = '<span style="opacity:0.5">' + choiceList[2] + "</span>";
				}
				if (list.length == 1) {
					event._result = { control: list[0] };
				} else {
					player
						.chooseControl(list)
						.set("choiceList", choiceList)
						.set("ai", function () {
							var list = _status.event.controls;
							if (list.includes("背水！")) {
								return "背水！";
							}
							if (list.includes("选项一")) {
								return "选项一";
							}
							return "选项二";
						})
						.set("prompt", "奋命：请选择一项");
				}
			} else {
				event.finish();
			}
			"step 2";
			game.log(player, "选择了", "#y" + result.control);
			if (result.control != "选项二") {
				target.chooseToDiscard("he", true);
			}
			if (result.control != "选项一" && !target.isLinked()) {
				target.link(true);
			}
			if (result.control == "背水！" && !player.isLinked()) {
				player.link(true);
			}
		},
	}
```

## tw_handang 名字:TW韩当 势力:wu

### twgongji 名字:弓骑
描述: ①你的攻击范围无限。②出牌阶段限一次，你可以弃置一张牌，然后你使用与此牌花色相同的【杀】无任何次数限制直到回合结束。若你以此法弃置的牌为装备牌，则你可以弃置一名其他角色的一张牌。
```js
twgongji: {
		audio: "gongji",
		enable: "phaseUse",
		usable: 1,
		position: "he",
		filterCard: true,
		locked: false,
		filter(event, player) {
			return player.countCards("he");
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
		content() {
			"step 0";
			player.addTempSkill("twgongji2");
			player.markAuto("twgongji2", [get.suit(cards[0], player)]);
			"step 1";
			if (get.type(cards[0], null, cards[0].original == "h" ? player : false) == "equip") {
				player
					.chooseTarget("是否弃置一名角色的一张牌？", function (card, player, target) {
						return player != target && target.countCards("he");
					})
					.set("ai", function (target) {
						var player = _status.event.player;
						return get.effect(target, { name: "guohe_copy2" }, player, player);
					});
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				player.line(result.targets, "green");
				player.discardPlayerCard(result.targets[0], "he", true);
			}
		},
		mod: {
			attackRangeBase() {
				return Infinity;
			},
		},
		ai: {
			order: 4.5,
			result: { player: 1 },
		},
	}
```

### twjiefan 名字:解烦
描述: 限定技。出牌阶段，你可以选择一名角色，令攻击范围内含有其的所有角色依次选择一项：1.弃置一张武器牌；2.令其摸一张牌。然后当其第一次进入濒死状态后，你重置〖解烦〗。
```js
twjiefan: {
		skillAnimation: true,
		animationColor: "wood",
		audio: "jiefan",
		limited: true,
		enable: "phaseUse",
		filterTarget: true,
		content() {
			"step 0";
			player.awakenSkill(event.name);
			event.players = game.filterPlayer(function (current) {
				return current != target && current.inRange(target);
			});
			event.players.sortBySeat();
			"step 1";
			if (event.players.length) {
				event.current = event.players.shift();
				event.current.addTempClass("target");
				player.line(event.current, "green");
				if (!event.current.countCards("he") || !target.isIn()) {
					event._result = { bool: false };
				} else {
					event.current
						.chooseToDiscard({ subtype: "equip1" }, "he", "解烦：弃置一张武器牌，或令" + get.translation(target) + "摸一张牌")
						.set("ai", function (card) {
							if (!_status.event.target.isIn()) {
								return 0;
							}
							if (get.attitude(_status.event.player, _status.event.target) < 0) {
								return 7 - get.value(card);
							}
							return -1;
						})
						.set("target", target);
				}
			} else {
				player.addSkill("twjiefan2");
				player.markAuto("twjiefan2", [target]);
				event.finish();
			}
			"step 2";
			if (!result.bool && target.isIn()) {
				target.draw();
			}
			event.goto(1);
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					if (player.hp > 2 && game.phaseNumber < game.players.length * 2) {
						return 0;
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

## tw_jiling 名字:TW纪灵 势力:qun

### twshuangren 名字:双刃
描述: ①出牌阶段开始时，你可以与一名角色拼点。若你：赢，你可以视为对至多两名至其的距离不大于1的角色依次使用一张【杀】；没赢，其可以视为对你使用一张【杀】。②出牌阶段结束时，若你本回合未发动过〖双刃①〗且未造成过渠道为【杀】的伤害，你可以弃置一张牌发动〖双刃①〗。
```js
twshuangren: {
		audio: "shuangren",
		trigger: { player: "phaseUseBegin" },
		filter(event, player, name) {
			if (!player.countCards("h")) {
				return false;
			}
			if (name == "phaseUseEnd") {
				return !player.hasHistory("sourceDamage", function (evt) {
					return evt.card.name == "sha" && event.getParent("phaseUse") == evt;
				});
			}
			return true;
		},
		direct: true,
		group: "twshuangren_end",
		preHidden: true,
		content() {
			"step 0";
			var forced =
				event.getParent(2).name == "twshuangren_end" &&
				game.hasPlayer(current => {
					return player.canCompare(current);
				});
			var str = "与一名角色拼点，若你：赢，你可以视为对至多两名至其的距离不大于1的角色使用一张【杀】；没赢，其可以视为对你使用一张【杀】";
			player
				.chooseTarget(forced ? "双刃：选择一名角色" : get.prompt("twshuangren"), str, forced, (card, player, target) => {
					return player.canCompare(target);
				})
				.set("ai", target => {
					if (_status.event.goon) {
						return get.effect(target, { name: "sha" }, _status.event.player);
					}
					return 0;
				})
				.set("goon", event.triggername != "phaseUseBegin" || (player.countCards("hs", "sha") > 0 && player.hasValueTarget({ name: "sha" })));
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twshuangren", target);
				if (player.canCompare(target)) {
					player.chooseToCompare(target);
				} else {
					event.finish();
				}
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				event.sha = true;
				player
					.chooseTarget([1, 2], "请选择【杀】的目标", true, function (card, player, target) {
						if (!player.canUse("sha", target, false, false)) {
							return false;
						}
						return get.distance(target, _status.event.targetx) <= 1;
					})
					.set("ai", function (target) {
						var player = _status.event.player;
						return get.effect(target, { name: "sha" }, player, player);
					})
					.set("targetx", target);
			} else {
				target.chooseBool("双刃：是否视为对" + get.translation(player) + "使用一张杀？").set("choice", get.effect(player, { name: "sha" }, target, target) > 0);
			}
			"step 3";
			if (result.bool) {
				if (event.sha == true) {
					result.targets.sortBySeat();
					for (var i of result.targets) {
						player.useCard({ name: "sha", isCard: true }, i, false);
					}
				} else {
					target.useCard({ name: "sha", isCard: true }, player, false);
				}
			}
		},
		subSkill: {
			end: {
				audio: "shuangren",
				trigger: { player: "phaseUseEnd" },
				filter(event, player, name) {
					if (!player.countCards("h")) {
						return false;
					}
					return (
						!player.hasHistory("useSkill", function (evt) {
							return evt.skill == "twshuangren";
						}) &&
						!player.hasHistory("sourceDamage", function (evt) {
							return evt.card && evt.card.name == "sha";
						})
					);
				},
				direct: true,
				preHidden: true,
				content() {
					"step 0";
					player
						.chooseToDiscard(get.prompt("twshuangren"), "弃置一张牌发动〖双刃〗", "he")
						.set("ai", function (card) {
							if (_status.event.goon) {
								return 5 - get.value(card);
							}
							return 0;
						})
						.set(
							"goon",
							(function () {
								return player.hasCard(function (card) {
									if (player.needsToDiscard() > 1) {
										return card.number > 10 && get.value(card) <= 5;
									}
									return (card.number >= 9 && get.value(card) <= 5) || get.value(card) <= 3;
								});
							})()
						)
						.setHiddenSkill("twshuangren")
						.set("logSkill", "twshuangren");
					"step 1";
					if (result.bool) {
						player.useSkill("twshuangren");
					}
				},
			},
		},
	}
```

## tw_re_fazheng 名字:TW法正 势力:shu

### twxuanhuo 名字:眩惑
描述: 摸牌阶段结束时，你可以交给一名其他角色两张牌，然后其选择一项：1.视为对你选择的另一名其他角色使用一张【杀】或【决斗】，2.令你获得其两张牌。
```js
twxuanhuo: {
		audio: "xuanhuo",
		trigger: { player: "phaseDrawEnd" },
		filter(event, player) {
			return player.countCards("he") > 1 && game.countPlayer() > 2;
		},
		direct: true,
		content() {
			"step 0";
			var ai2 = function (target) {
				var player = _status.event.player;
				if (get.attitude(player, target) <= 0) {
					return 0;
				}
				var list = ["sha", "juedou"];
				var num = Math.max.apply(
					Math,
					list.map(function (i) {
						return target.getUseValue({ name: i, isCard: true }, false);
					})
				);
				if (target.hasSkillTag("nogain")) {
					num /= 4;
				}
				return num;
			};
			player.chooseCardTarget({
				prompt: get.prompt2("twxuanhuo"),
				filterCard: true,
				selectCard: 2,
				position: "he",
				filterTarget: lib.filter.notMe,
				goon: game.hasPlayer(function (current) {
					return current != player && ai2(player, current) > 0;
				}),
				ai1(card) {
					if (!_status.event.goon) {
						return 0;
					}
					return 7 - get.value(card);
				},
				ai2: ai2,
			});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twxuanhuo", target);
				player.give(result.cards, target);
			} else {
				event.finish();
			}
			"step 2";
			if (
				game.hasPlayer(function (current) {
					return current != player && current != target;
				})
			) {
				player
					.chooseTarget(
						function (card, player, target) {
							return target != player && target != _status.event.target;
						},
						"选择" + get.translation(target) + "使用【杀】或【决斗】的目标",
						true
					)
					.set("target", target)
					.set("ai", function (target) {
						var evt = _status.event;
						var list = ["sha", "juedou"];
						return Math.max.apply(
							Math,
							list.map(function (i) {
								var card = { name: i, isCard: true };
								if (!evt.target.canUse(card, target, false)) {
									return 0;
								}
								return get.effect(target, card, evt.target, evt.player);
							})
						);
					});
			} else {
				event.finish();
			}
			"step 3";
			var target2 = result.targets[0];
			event.target2 = target2;
			player.line(target2);
			var vcards = [];
			if (target.canUse({ name: "sha", isCard: true }, target2, false)) {
				vcards.push(["基本", "", "sha"]);
			}
			if (target.canUse({ name: "juedou", isCard: true }, target2, false)) {
				vcards.push(["锦囊", "", "juedou"]);
			}
			if (!vcards.length) {
				if (!target.countCards("h")) {
					event.finish();
				} else {
					event._result = { index: 1 };
				}
			} else if (!target.countCards("h")) {
				event.vcards = vcards;
				event._result = { index: 0 };
			} else {
				event.vcards = vcards;
				target.chooseControl().set("choiceList", ["视为对" + get.translation(target2) + "使用一张【杀】或【决斗】", "令" + get.translation(player) + "获得你的两张牌"]);
			}
			"step 4";
			if (result.index == 0) {
				if (event.vcards.length == 1) {
					event._result = { links: event.vcards, bool: true };
				} else {
					target.chooseButton(["请选择要对" + get.translation(event.target2) + "使用的牌", [event.vcards, "vcard"]], true).set("ai", function (button) {
						var player = _status.event.player;
						return get.effect(_status.event.getParent().target2, { name: button.link[2], isCard: true }, player, player);
					});
				}
			} else {
				player.gainPlayerCard(target, 2, "he", true);
				event.finish();
			}
			"step 5";
			if (result.bool) {
				target.useCard({ name: result.links[0][2], isCard: true }, false, event.target2);
			}
		},
		ai: {
			expose: 0.15,
		},
	}
```

### twenyuan 名字:恩怨
描述: ①当你获得一名其他角色的至少两张牌后，你可以令其摸一张牌，若其手牌区或装备区没有牌，则你可以改为令其回复1点体力。②当你受到1点伤害后，你可令伤害来源选择一项：1.失去1点体力；2.交给你一张手牌，若此牌的花色不为♥，你摸一张牌。
```js
twenyuan: {
		audio: "enyuan",
		group: ["twenyuan1", "twenyuan2"],
	}
```

## tw_madai 名字:TW马岱 势力:shu

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twqianxi 名字:潜袭
描述: 准备阶段，你可以摸一张牌并弃置一张牌，令一名距离为1的角色本回合不能使用或打出与你弃置的牌颜色相同的手牌。然后本回合的结束阶段，若你本回合对其造成过渠道为【杀】的伤害，你令其不能使用或打出与你以此法弃置的牌颜色不同的牌直到其下回合结束。
```js
twqianxi: {
		audio: "qianxi",
		trigger: { player: "phaseZhunbeiBegin" },
		preHidden: true,
		async content(event, trigger, player) {
			await player.draw();
			if (
				!player.hasCard(card => {
					return lib.filter.cardDiscardable(card, player, "tweqianxi");
				}, "he")
			) {
				return;
			}
			const { cards } = await player
				.chooseToDiscard("he", true)
				.set("ai", card => {
					let player = get.event().player;
					if (get.color(card, player)) {
						return 7 - get.value(card, player);
					}
					return 4 - get.value(card, player);
				})
				.forResult();
			if (
				!cards ||
				!game.hasPlayer(target => {
					return player != target && get.distance(player, target) <= 1;
				})
			) {
				return;
			}
			const color = get.color(cards[0], player);
			const { targets } = await player
				.chooseTarget(function (card, player, target) {
					return player != target && get.distance(player, target) <= 1;
				}, true)
				.set("ai", function (target) {
					return get.effect(target, { name: "sha" }, _status.event.player, _status.event.player) + 5;
				})
				.forResult();
			if (targets) {
				const target = targets[0];
				player.line(target);
				target.addTempSkill("twqianxi2");
				target.markAuto("twqianxi2", color);
				player.addTempSkill("twqianxi_self");
				player.markAuto("twqianxi_self", [target]);
			}
		},
		subSkill: {
			self: {
				audio: "qianxi",
				charlotte: true,
				onremove: true,
				forced: true,
				trigger: { player: "phaseJieshuBegin" },
				filter(event, player) {
					return player.hasHistory("sourceDamage", evt => {
						if (!evt.card || evt.card.name != "sha" || !evt.player.isIn()) {
							return false;
						}
						if (player.getStorage("twqianxi_self").includes(evt.player)) {
							return true;
						}
						return false;
					});
				},
				async content(event, trigger, player) {
					let targets = [];
					player.getHistory("sourceDamage", evt => {
						if (!evt.card || evt.card.name != "sha") {
							return false;
						}
						if (player.getStorage("twqianxi_self").includes(evt.player)) {
							targets.add(evt.player);
						}
						return false;
					});
					player.line(targets);
					for (const target of targets) {
						target.addTempSkill("twqianxi3", { player: "phaseAfter" });
						target.markAuto("twqianxi3", target.storage.twqianxi2);
					}
				},
			},
		},
	}
```

## tw_niujin 名字:TW牛金 势力:wei

### twcuorui 名字:挫锐
描述: 限定技。准备阶段，你可以将手牌摸至X张（X为场上角色手牌数最多的角色的手牌数，且至多摸五张）。然后若你的判定区：未废除，你废除判定区；已废除，你可以对一名其他角色造成1点伤害。
```js
twcuorui: {
		audio: "cuorui",
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.countCards("h") > player.countCards("h");
			});
		},
		check(event, player) {
			var num = 0;
			for (var target of game.players) {
				if (target != player && target.countCards("h") > num) {
					num = target.countCards("h");
				}
			}
			num = Math.min(num, 5 + player.countCards("h"));
			return num - player.countCards("h") >= 2;
		},
		prompt(event, player) {
			var num = 0;
			for (var target of game.players) {
				if (target != player && target.countCards("h") > num) {
					num = target.countCards("h");
				}
			}
			num = Math.min(num, 5 + player.countCards("h"));
			return get.prompt("twcuorui") + "（可摸" + get.cnNumber(num - player.countCards("h")) + "张牌）";
		},
		content() {
			"step 0";
			player.awakenSkill(event.name);
			var num = 0;
			for (var target of game.players) {
				if (target != player && target.countCards("h") > num) {
					num = target.countCards("h");
				}
			}
			num = Math.min(num, 5 + player.countCards("h"));
			player.drawTo(num);
			if (!player.isDisabledJudge()) {
				player.disableJudge();
				event.finish();
			} else {
				player.chooseTarget("挫锐：是否对一名其他角色造成1点伤害？", lib.filter.notMe).set("ai", function (target) {
					var player = _status.event.player;
					return get.damageEffect(target, player, player);
				});
			}
			"step 1";
			if (result.bool) {
				player.line(result.targets[0]);
				result.targets[0].damage();
			}
		},
	}
```

### twliewei 名字:裂围
描述: 锁定技。当你杀死一名角色后，你选择一项：1.摸两张牌；2.若你拥有〖挫锐〗且〖挫锐〗已发动过，重置〖挫锐〗。
```js
twliewei: {
		audio: "liewei",
		trigger: { source: "dieAfter" },
		forced: true,
		content() {
			"step 0";
			if (!player.hasSkill("twcuorui", null, null, false) || !player.awakenedSkills.includes("twcuorui")) {
				event._result = { index: 0 };
			} else {
				player
					.chooseControl()
					.set("prompt", "裂围：请选择一项")
					.set("choiceList", ["摸两张牌", "重置〖挫锐〗"])
					.set("ai", function () {
						return 1;
					});
			}
			"step 1";
			if (result.index == 0) {
				player.draw(2);
			} else {
				player.restoreSkill("twcuorui");
			}
		},
	}
```

## tw_guanqiujian 名字:TW毌丘俭 势力:wei

### twzhengrong 名字:征荣
描述: 当你于出牌阶段使用牌结算结束后，若此牌为你于本局游戏你的出牌阶段内使用的第偶数张指定了其他角色为目标的牌，或你于出牌阶段第一次造成伤害后，你可以将一名其他角色的一张牌置于你的武将牌上，称为“荣”。
```js
twzhengrong: {
		audio: "drlt_zhenrong",
		trigger: { player: "useCardAfter", source: "damageSource" },
		filter(event, player) {
			if (!event.isPhaseUsing(player)) {
				return false;
			}
			if (event.name == "damage") {
				return (
					player
						.getHistory("sourceDamage", evt => {
							return evt.getParent("phaseUse") == event.getParent("phaseUse");
						})
						.indexOf(event) == 0
				);
			}
			if (!event.targets || event.targets.every(target => target == player)) {
				return false;
			}
			return (
				player
					.getAllHistory("useCard", function (evt) {
						if (!evt.isPhaseUsing(player)) {
							return false;
						}
						if (evt.targets.every(target => target == player)) {
							return false;
						}
						return true;
					})
					.indexOf(event) %
					2 ==
				1
			);
		},
		direct: true,
		content() {
			"step 0";
			if (
				!game.hasPlayer(function (target) {
					return target != player && target.countCards("he");
				})
			) {
				event.finish();
				return;
			}
			player
				.chooseTarget(get.prompt("twzhengrong"), "将一名其他角色的一张牌置于武将牌上，称为“荣”", function (card, player, target) {
					return target != player && target.countCards("he");
				})
				.set("ai", function (target) {
					return get.effect(target, { name: "guohe_copy2" }, _status.event.player, _status.event.player);
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = result.targets[0];
				player.logSkill("twzhengrong", target);
				player.choosePlayerCard(target, "he", true);
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				player.addToExpansion(result.links, target, "give").gaintag.add("twzhengrong");
			}
		},
		marktext: "荣",
		onremove(player, skill) {
			var cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
	}
```

### twhongju 名字:鸿举
描述: 觉醒技。准备阶段，若你的“荣”数不小于3，你摸等同于“荣”数的牌，且可以用任意手牌交换等量的“荣”，获得〖清侧〗，然后可以减1点体力上限并获得〖扫讨〗。
```js
twhongju: {
		derivation: ["twqingce", "twsaotao"],
		audio: "drlt_hongju",
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		juexingji: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			return player.getExpansions("twzhengrong").length >= 3;
		},
		content() {
			"step 0";
			player.awakenSkill(event.name);
			player.draw(player.getExpansions("twzhengrong").length);
			"step 1";
			if (player.countCards("h") == 0) {
				event.goto(3);
			} else {
				var next = player.chooseToMove("鸿举：请选择要交换的手牌和“荣”");
				next.set("list", [
					[get.translation(player) + "（你）的“荣”", player.getExpansions("twzhengrong"), "twzhengrong_tag"],
					["手牌区", player.getCards("h")],
				]);
				next.set("filterMove", function (from, to) {
					return typeof to != "number";
				});
				next.set("processAI", function (list) {
					var player = _status.event.player,
						cards = list[0][1].concat(list[1][1]).sort(function (a, b) {
							return player.getUseValue(a) - player.getUseValue(b);
						}),
						cards2 = cards.splice(0, player.getExpansions("twzhengrong").length);
					return [cards2, cards];
				});
			}
			"step 2";
			if (result.bool) {
				var pushs = result.moved[0],
					gains = result.moved[1];
				pushs.removeArray(player.getExpansions("twzhengrong"));
				gains.removeArray(player.getCards("h"));
				if (!pushs.length || pushs.length != gains.length) {
					return;
				}
				player.addToExpansion(pushs, player, "giveAuto").gaintag.add("twzhengrong");
				game.log(player, "将", pushs, "作为“荣”置于武将牌上");
				player.gain(gains, "gain2");
			}
			"step 3";
			player.addSkills("twqingce");
			player
				.chooseBool("是否减1点体力上限并获得〖扫讨〗？")
				.set("ai", () => _status.event.bool)
				.set("bool", player.isDamaged() && player.countCards("h") >= 3 ? (Math.random() < 0.5 ? true : false) : false);
			"step 4";
			if (result.bool) {
				player.loseMaxHp();
				player.addSkills("twsaotao");
				game.delayx();
			}
		},
		ai: {
			combo: "twzhengrong",
		},
	}
```

## tw_daxiaoqiao 名字:TW大乔小乔 势力:wu

### twxingwu 名字:星舞
描述: 弃牌阶段开始时，你可以将一张牌置于武将牌上，称为“星舞”。然后你可移去三张“星舞”，弃置一名其他角色装备区里的所有牌，然后对其造成2点伤害（若其性别包含女性则改为1点伤害）。
```js
twxingwu: {
		audio: "xingwu",
		trigger: { player: "phaseDiscardBegin" },
		filter(event, player) {
			return player.countCards("he");
		},
		direct: true,
		content() {
			"step 0";
			player
				.chooseCard("he", get.prompt("twxingwu"), "将一张牌置于武将牌上作为“星舞”")
				.set("ai", function (card) {
					if (_status.event.goon) {
						return 20 - get.value(card);
					}
					return 7 - get.value(card);
				})
				.set("goon", player.needsToDiscard() || player.getExpansions("twxingwu").length > 1);
			"step 1";
			if (result.bool) {
				player.logSkill("twxingwu");
				var cards = result.cards;
				player.addToExpansion(cards, player, "give").gaintag.add("twxingwu");
			} else {
				event.finish();
			}
			"step 2";
			game.delayx();
			if (player.getExpansions("twxingwu").length < 3 || !game.hasPlayer(current => current != player)) {
				event.finish();
			}
			"step 3";
			player
				.chooseButton(["是否移去三张“星舞”牌并发射核弹？", player.getExpansions("twxingwu")], 3)
				.set("ai", function (button) {
					if (_status.event.goon) {
						return 1;
					}
					return 0;
				})
				.set(
					"goon",
					game.hasPlayer(current => get.damageEffect(current, player, player) < 0)
				);
			"step 4";
			if (result.bool) {
				player.loseToDiscardpile(result.links);
			} else {
				event.finish();
			}
			"step 5";
			player.chooseTarget("星舞：选择一名其他角色", "弃置其装备区内的所有牌。然后对其造成2点伤害（若其性别包含女性则改为1点）", true, lib.filter.notMe).set("ai", function (target) {
				return (
					get.damageEffect(target, player, player) *
					Math.sqrt(
						4 +
							target.countCards("e", function (card) {
								return get.value(card, target) > 0;
							})
					) *
					(target.hasSex("female") ? 1 : 2)
				);
			});
			"step 6";
			if (result.bool && result.targets && result.targets.length) {
				var target = result.targets[0];
				player.line(target, "green");
				var num = target.countCards("e");
				if (num) {
					player.discardPlayerCard(target, "e", num, true);
				}
				target.damage(target.hasSex("female") ? 1 : 2);
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
			onunmark(storage, player) {
				if (player.hasSkill("twpingting")) {
					return;
				}
				player.removeAdditionalSkill("twpingting");
			},
		},
		onremove(player, skill) {
			if (player.hasSkill("twpingting")) {
				return;
			}
			var cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
	}
```

### twpingting 名字:娉婷
描述: 锁定技。①每轮开始时或其他角色于你的回合内进入濒死状态时，你摸一张牌并将一张牌置于武将牌上，称为“星舞”。②若你有“星舞”，你视为拥有〖天香〗和〖流离〗。
```js
twpingting: {
		trigger: { global: ["roundStart", "dying"] },
		init(player, skill) {
			if (player.getExpansions("twxingwu").length) {
				player.addAdditionalSkill(skill, ["tianxiang", "liuli"]);
			} else {
				player.removeAdditionalSkill(skill);
			}
		},
		filter(event, player) {
			if (event.name == "dying") {
				return player == _status.currentPhase && event.player != player;
			}
			return true;
		},
		forced: true,
		group: "twpingting_update",
		derivation: ["tianxiang", "liuli"],
		content() {
			"step 0";
			player.draw();
			player.chooseCard("he", "娉婷：将一张牌置于武将牌上，称为“星舞”", true).set("ai", function (card) {
				return -get.value(card);
			});
			"step 1";
			if (result.bool) {
				var cards = result.cards;
				player.addToExpansion(cards, player, "give").gaintag.add("twxingwu");
			}
		},
		onremove(player, skill) {
			if (player.hasSkill("twxingwu")) {
				return;
			}
			var cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		subSkill: {
			update: {
				trigger: { player: ["loseAfter", "loseAsyncAfter", "addToExpansionAfter"] },
				filter(event, player) {
					var cards = player.getExpansions("twxingwu"),
						skills = player.additionalSkills.twpingting;
					return !((cards.length && skills && skills.length) || (!cards.length && (!skills || !skills.length)));
				},
				forced: true,
				silent: true,
				content() {
					lib.skill.twpingting.init(player, "twpingting");
				},
			},
		},
	}
```

## tw_furong 名字:TW傅肜 势力:shu

### twxuewei 名字:血卫
描述: 每轮限一次。一名其他角色A的出牌阶段开始时，你可以选择另一名其他角色B，然后你令A选择一项：1.本回合不能对B使用【杀】且手牌上限-2；2.你视为对A使用一张【决斗】。
```js
twxuewei: {
		audio: "xuewei",
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			return event.player != player && game.players.length > 2 && !player.hasSkill("twxuewei_round");
		},
		direct: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt2("twxuewei"), function (card, player, target) {
					return target != player && target != _status.event.getTrigger().player;
				})
				.set("ai", function (target) {
					if (get.attitude(player, _status.event.getTrigger().player) >= 0) {
						return 0;
					}
					return get.attitude(player, target);
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twxuewei", trigger.player, false);
				player.addTempSkill("twxuewei_round", "roundStart");
				player.line2([trigger.player, target]);
				trigger.player
					.chooseControl("选项一", "选项二")
					.set("choiceList", ["本回合不能对" + get.translation(target) + "使用【杀】且手牌上限-2", "令" + get.translation(player) + "视为对你使用一张【决斗】"])
					.set("ai", function () {
						var player = _status.event.player,
							source = _status.event.getParent().player;
						if (get.effect(player, { name: "juedou" }, source, player) > 0) {
							return 1;
						}
						if (player.hp - player.countCards("h") > 2 || player.hp <= 2) {
							return 0;
						}
						return 1;
					});
			} else {
				event.finish();
			}
			"step 2";
			game.log(trigger.player, "选择了", "#g【血卫】", "的", "#y" + result.control);
			if (result.control == "选项一") {
				trigger.player.markAuto("twxuewei_block", [target]);
				trigger.player.addTempSkill("twxuewei_block");
			} else {
				player.useCard({ name: "juedou", isCard: true }, trigger.player, false);
			}
		},
		subSkill: {
			round: { charlotte: true },
			block: {
				charlotte: true,
				onremove: true,
				locked: true,
				mark: true,
				marktext: "卫",
				intro: {
					content(storage, player) {
						if (!storage || !storage.length) {
							return;
						}
						return "不能对" + get.translation(storage) + "使用【杀】；手牌上限-" + 2 * storage.length;
					},
				},
				mod: {
					maxHandcard(player, num) {
						return num - 2 * player.getStorage("twxuewei_block").length;
					},
					playerEnabled(card, player, target) {
						if (card.name == "sha" && player.getStorage("twxuewei_block").includes(target)) {
							return false;
						}
					},
				},
			},
		},
	}
```

### twliechi 名字:烈斥
描述: `当你受到伤害后，若伤害来源的体力值不小于你，你可以选择一项：1.令其将手牌数弃置至与你的手牌数相同；2.弃置其一张牌；3.若你本回合进入过濒死状态，可${get.poptip("rule_beishui")}：弃置一张装备牌。`
```js
twliechi: {
		audio: "liechi",
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.source && event.source.hp >= player.hp && (event.source.countCards("h") > player.countCards("h") || event.source.countCards("he"));
		},
		direct: true,
		content() {
			"step 0";
			var num = trigger.source.countCards("h") - player.countCards("h");
			event.num = num;
			var list = [],
				choiceList = ["令" + get.translation(trigger.source) + "弃置" + get.cnNumber(num) + "张手牌", "弃置" + get.translation(trigger.source) + "一张牌", "背水！弃置一张装备牌，然后依次执行以上所有选项"];
			if (trigger.source.countCards("h") > player.countCards("h")) {
				list.push("选项一");
			} else {
				choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
			}
			if (trigger.source.countCards("he")) {
				list.push("选项二");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			if (
				trigger.source.countCards("h") > player.countCards("h") &&
				trigger.source.countCards("he") &&
				player.countCards("he", { type: "equip" }) &&
				game.getGlobalHistory("changeHp", evt => {
					return evt.player == player && evt.getParent()._dyinged;
				}).length
			) {
				list.push("背水！");
			} else {
				choiceList[2] = '<span style="opacity:0.5">' + choiceList[2] + "（未进入过濒死状态）</span>";
			}
			player
				.chooseControl(list, "cancel2")
				.set("prompt", get.prompt("twliechi", trigger.source))
				.set("choiceList", choiceList)
				.set("ai", () => _status.event.choice)
				.set(
					"choice",
					(function () {
						if (get.attitude(player, trigger.source) > 0) {
							return "cancel2";
						}
						if (list.includes("背水！")) {
							return "背水！";
						}
						if (num > 1) {
							return "选项一";
						}
						return "选项二";
					})()
				);
			"step 1";
			if (result.control != "cancel2") {
				player.logSkill("twliechi", trigger.source);
				game.log(player, "选择了", "#g【烈斥】", "的", "#y" + result.control);
				if (result.control != "选项二") {
					trigger.source.chooseToDiscard("h", num, true, "allowChooseAll");
				}
				if (result.control != "选项一") {
					player.discardPlayerCard(trigger.source, "he", true);
				}
				if (result.control == "背水！") {
					player.chooseToDiscard("he", { type: "equip" }, true);
				}
			}
		},
	}
```

## tw_yl_luzhi 名字:TW卢植 势力:qun

### twmingren 名字:明任
描述: ①游戏开始时，你摸一张牌，然后将一张手牌置于武将牌上，称为“任”。②出牌阶段开始时或出牌阶段结束时，你可以用一张牌替换“任”。
```js
twmingren: {
		marktext: "任",
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
		group: "twmingren_change",
		audio: "nzry_mingren_1",
		trigger: { global: "phaseBefore", player: "enterGame" },
		forced: true,
		locked: false,
		filter(event, player) {
			return (event.name != "phase" || game.phaseNumber == 0) && !player.getExpansions("twmingren").length;
		},
		async content(event, trigger, player) {
			await player.draw();
			if (!player.countCards("h")) {
				return;
			}
			const result = await player
				.chooseCard("h", "明任：将一张手牌置于武将牌上，称为“任”", true)
				.set("ai", function (card) {
					return 6 - get.value(card);
				})
				.forResult();
			if (result.bool) {
				const next = player.addToExpansion(result.cards[0], player, "give", "log");
				next.gaintag.add(event.name);
				await next;
			}
		},
		subSkill: {
			change: {
				audio: "nzry_mingren_1",
				trigger: { player: ["phaseUseBegin", "phaseUseEnd"] },
				filter(event, player) {
					return player.countCards("he") && player.getExpansions("twmingren").length;
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseCard("he", get.prompt(event.skill), "选择一张牌替换“任”（" + get.translation(player.getExpansions("twmingren")[0]) + "）")
						.set("ai", card => {
							const player = _status.event.player;
							const color = get.color(card);
							if (color == get.color(player.getExpansions("twmingren")[0])) {
								return false;
							}
							let num = 0;
							const list = [];
							player.countCards("he", function (cardx) {
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
					const card = player.getExpansions("twmingren")[0];
					const next = player.addToExpansion(event.cards[0], "log", "give", player);
					next.gaintag.add("twmingren");
					await next;
					if (card) {
						await player.gain(card, "gain2");
					}
				},
			},
		},
		ai: { combo: "twzhenliang" },
	}
```

### twzhenliang 名字:贞良
描述: 转换技。阳：出牌阶段限一次。你可以弃置一张牌并对攻击范围内的一名角色造成1点伤害。阴：当你或你攻击范围内的一名角色于你的回合外受到伤害时，你可以弃置一张牌令此伤害-1。然后若你以此法弃置的牌颜色与“任”的颜色相同，你摸一张牌。
```js
twzhenliang: {
		inherit: "nzry_zhenliang",
		intro: {
			content(storage, player, skill) {
				if (storage) {
					return "当你或你攻击范围内的一名角色于你的回合外受到伤害时，你可以弃置一张牌令此伤害-1。然后若你以此法弃置的牌颜色与“任”的颜色相同，你摸一张牌。";
				}
				return "出牌阶段限一次。你可以弃置一张牌并对攻击范围内的一名角色造成1点伤害。然后若你以此法弃置的牌颜色与“任”的颜色相同，你摸一张牌。";
			},
		},
		trigger: { global: "damageBegin4" },
		filter(event, player) {
			if (!player.countCards("he")) {
				return false;
			}
			if (event.name == "chooseToUse") {
				if (player.storage.twzhenliang || player.hasSkill("twzhenliang_used", null, null, false)) {
					return false;
				}
				return game.hasPlayer(current => player.inRange(current));
			} else {
				if (_status.currentPhase == player || !player.storage.twzhenliang) {
					return false;
				}
				return (event.num > 0 && event.player == player) || player.inRange(event.player);
			}
		},
		async cost(event, trigger, player) {
			const { player: target } = trigger;
			const { bool, cards } = await player
				.chooseToDiscard("he", get.prompt(event.name.slice(0, -5), target), "弃置一张牌令此伤害-1")
				.set("ai", card => {
					const { player, goon } = get.event();
					if (goon) {
						const cardx = player.getExpansions("twmingren")[0];
						if (cardx && get.color(cardx) == get.color(card, player)) {
							return 10 - get.value(card);
						}
						return 6 - get.value(card);
					}
					return 0;
				})
				.set("goon", get.attitude(player, target) > 0)
				.forResult();
			event.result = {
				bool: bool,
				cards: cards,
				targets: [target],
			};
		},
		filterCard: true,
		check(card) {
			const player = get.player(),
				cardx = player.getExpansions("twmingren")[0];
			if (cardx && get.color(cardx, player) == get.color(card, player)) {
				return 10 - get.value(card);
			}
			return 7 - get.value(card);
		},
		prompt: "弃置一张牌并对攻击范围内的一名角色造成1点伤害",
		async content(event, trigger, player) {
			const {
				targets: [target],
				name: skill,
				cards,
			} = event;
			player.changeZhuanhuanji(skill);
			const cardx = player.getExpansions("twmingren")[0];
			if (!trigger) {
				player.addTempSkill(skill + "_used", "phaseUseAfter");
				await target.damage("nocard");
			} else {
				trigger.num--;
			}
			if (cardx && get.color(cards[0], player) == get.color(cardx, player)) {
				await player.draw();
			}
		},
		ai: {
			order: 5,
			result: {
				player(player, target) {
					return get.damageEffect(target, player, player);
				},
			},
		},
		subSkill: { used: { charlotte: true } },
	}
```

## tw_liuzhang 名字:TW刘璋 势力:qun

### jutu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twyaohu 名字:邀虎
描述: 每轮限一次。回合开始时，你须选择场上的一个势力。该势力的其他角色的出牌阶段开始时，其获得你的一张“生”，然后其须选择一项：1.对你指定的另一名的其他角色使用一张【杀】（无距离限制）；2.本回合其使用伤害牌指定你为目标时须交给你两张牌，否则取消此目标。
```js
twyaohu: {
		audio: "yinlang",
		trigger: { player: "phaseBegin" },
		direct: true,
		filter(event, player) {
			return (
				!player.hasSkill("twyaohu_round") &&
				game.hasPlayer(function (current) {
					return current.group && current.group != "unknown";
				})
			);
		},
		content() {
			"step 0";
			var list = [];
			game.countPlayer(function (current) {
				if (current.group && current.group != "unknown") {
					list.add(current.group);
				}
			});
			list.sort(function (a, b) {
				return lib.group.indexOf(a) - lib.group.indexOf(b);
			});
			if (!player.hasSkill("twyaohu")) {
				list.push("cancel2");
			}
			player
				.chooseControl(list)
				.set("prompt", "邀虎：请选择一个势力")
				.set("ai", function () {
					return _status.event.choice;
				})
				.set(
					"choice",
					(function () {
						var getn = function (group) {
							return game.countPlayer(function (current) {
								if (current.group != group) {
									return false;
								}
								if (player == current) {
									return 2;
								}
								if (get.attitude(current, player) > 0) {
									return 1;
								}
								return 1.3;
							});
						};
						list.sort(function (a, b) {
							return getn(b) - getn(a);
						});
						return list[0];
					})()
				);
			"step 1";
			if (result.control != "cancel2") {
				player.logSkill(
					"twyaohu",
					game.filterPlayer(function (current) {
						return current.group == result.control;
					})
				);
				game.log(player, "选择了", "#y" + get.translation(result.control + 2));
				player.storage.yaohu = result.control;
				player.storage.twyaohu = result.control;
				player.markSkill("twyaohu");
			}
		},
		ai: { combo: "jutu" },
		intro: { content: "已选择了$势力" },
		group: "twyaohu_gain",
		subSkill: {
			round: {},
			gain: {
				audio: "yinlang",
				trigger: { global: "phaseUseBegin" },
				filter(event, player) {
					return player !== event.player && event.player.group === player.storage.yaohu && event.player.isIn() && player.getExpansions("jutu").length > 0;
				},
				forced: true,
				locked: false,
				logTarget: "player",
				content() {
					"step 0";
					var target = trigger.player;
					event.target = target;
					target.chooseButton(["选择获得一张“生”", player.getExpansions("jutu")], true).set("ai", function (button) {
						return get.value(button.link, player);
					});
					"step 1";
					if (result.bool) {
						target.gain(result.links, "give", player);
					}
					"step 2";
					if (
						game.hasPlayer(function (current) {
							return current != player && current != target;
						})
					) {
						player
							.chooseTarget(true, "选择" + get.translation(target) + "使用【杀】的目标", function (card, player, target) {
								return target != player && target != _status.event.source;
							})
							.set("source", target)
							.set("ai", function (target) {
								var evt = _status.event;
								return get.effect(target, { name: "sha" }, evt.source, evt.player);
							});
					} else {
						event._result = { bool: false };
						event.goto(4);
					}
					"step 3";
					var target2 = result.targets[0];
					player.line(target2, "green");
					target
						.chooseToUse(
							function (card, player, event) {
								if (get.name(card) != "sha") {
									return false;
								}
								return lib.filter.filterCard.apply(this, arguments);
							},
							"对" + get.translation(target2) + "使用一张杀，否则本回合使用伤害牌指定" + get.translation(player) + "为目标时须交给" + get.translation(player) + "两张牌，否则此牌对" + get.translation(player) + "无效"
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
						.set("sourcex", target2)
						.set("addCount", false);
					"step 4";
					if (!result.bool) {
						player.addTempSkill("twyaohu_effect");
					}
				},
			},
			effect: {
				audio: "yinlang",
				trigger: { target: "useCardToTarget" },
				charlotte: true,
				forced: true,
				filter(event, player) {
					return event.player == _status.currentPhase && get.is.damageCard(event.card);
				},
				logTarget: "player",
				content() {
					"step 0";
					var hs = trigger.player.getCards("he");
					if (hs.length < 2) {
						event._result = { bool: false };
					} else {
						trigger.player
							.chooseCard(2, "交给" + get.translation(player) + "两张牌，否则取消" + get.translation(trigger.card) + "对其的目标", "he")
							.set("ai", card => {
								if (_status.event.goon) {
									return 5 - get.value(card);
								}
								return 0;
							})
							.set("goon", get.effect(player, trigger.card, trigger.player, trigger.player) > 0);
					}
					"step 1";
					if (result.bool) {
						trigger.player.give(result.cards, player);
					} else {
						trigger.untrigger();
						trigger.targets.remove(player);
						trigger.getParent().triggeredTargets1.remove(player);
					}
				},
			},
		},
	}
```

### rehuaibi
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## tw_zongyu 名字:TW宗预 势力:shu

### twzhibian 名字:直辩
描述: `出牌阶段开始时，你可以与一名其他角色拼点。若你赢，你可以选择一项：{1.将其区域里的一张牌移动到你的对应区域；2.回复1点体力；3.${get.poptip("rule_beishui")}：弃置一张非基本牌}；若你没赢，你失去1点体力。`
```js
twzhibian: {
		audio: "zhibian",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player && player.canCompare(current));
		},
		direct: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt("twzhibian"), "与一名其他角色拼点", function (card, player, target) {
					return target != player && player.canCompare(target);
				})
				.set("ai", function (target) {
					if (!_status.event.goon) {
						return false;
					}
					var att = get.attitude(player, target);
					if (
						att < 0 &&
						(target.countCards("h") > 1 ||
							target.countCards("e", function (card) {
								return player.canEquip(card) && get.effect(player, card, target, player) > 0;
							}))
					) {
						return -att / Math.sqrt(target.countCards("h"));
					}
					if (!player.isDamaged()) {
						return false;
					}
					if (att <= 0) {
						return (1 - att) / Math.sqrt(target.countCards("h"));
					}
					return Math.sqrt((2 / att) * Math.sqrt(target.countCards("h")));
				})
				.set(
					"goon",
					(function () {
						if (
							!player.hasCard(function (card) {
								return card.number >= 14 - player.hp && get.value(card) <= 5;
							})
						) {
							return false;
						}
						return true;
					})()
				);
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twzhibian", target);
				player.chooseToCompare(target);
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				var list = [],
					list2 = ["将" + get.translation(target) + "区域中的一张牌移动到你的区域内", "回复1点体力", "背水！弃置一张非基本牌，并依次执行上述所有选项"];
				if (
					target.countCards("h") ||
					target.hasCard(function (card) {
						return player.canEquip(card);
					}, "e") ||
					target.hasCard(function (card) {
						return player.canAddJudge(card);
					}, "j")
				) {
					list.push("选项一");
				} else {
					list2[0] = '<span style="opacity:0.5">' + list2[0] + "</span>";
				}
				if (player.isDamaged()) {
					list.push("选项二");
				} else {
					list2[1] = '<span style="opacity:0.5">' + list2[1] + "</span>";
				}
				if (!list.length) {
					event.finish();
					return;
				}
				if (player.countCards("he", card => get.type(card) != "basic")) {
					list.push("背水！");
				} else {
					list2[2] = '<span style="opacity:0.5">' + list2[2] + "</span>";
				}
				list.push("cancel2");
				player
					.chooseControl(list)
					.set("prompt", "直辩：选择一项")
					.set("choiceList", list2)
					.set("ai", function () {
						var target = _status.event.getParent().target;
						if (
							_status.event.controls.includes("背水！") &&
							player.isDamaged() &&
							(target.countCards("h") ||
								target.countCards("e", function (card) {
									return player.canEquip(card) && get.value(card, target) >= 4 + player.getDamagedHp();
								}))
						) {
							return 2;
						}
						if (
							player.isDamaged() &&
							(player.hp <= 2 ||
								(!target.countCards("h") &&
									!target.countCards("e", function (card) {
										return player.canEquip(card) && get.value(card, target) >= 4 + player.getDamagedHp();
									})))
						) {
							return 1;
						}
						return 0;
					});
			} else {
				player.loseHp();
				event.finish();
			}
			"step 3";
			if (result.control != "cancel2") {
				event.control = result.control;
				if (
					result.control == "背水！" &&
					player.countCards("he", function (card) {
						return get.type(card) != "basic";
					})
				) {
					player.chooseToDiscard("he", true, function (card) {
						return get.type(card) != "basic";
					});
				}
			} else {
				event.finish();
			}
			"step 4";
			if (event.control == "选项一" || event.control == "背水！") {
				player.choosePlayerCard(target, "hej", true).set("ai", get.buttonValue);
			} else {
				event.goto(6);
			}
			"step 5";
			if (result.bool) {
				var card = result.cards[0];
				switch (get.position(card)) {
					case "h":
						player.gain(card, target, "giveAuto");
						break;
					case "e":
						target.$give(card, player, false);
						player.equip(card);
						break;
					case "j":
						target.$give(card, player, false);
						player.addJudge(card);
						break;
				}
			}
			"step 6";
			if (event.control == "选项二" || event.control == "背水！") {
				player.recover();
			}
		},
	}
```

### twyuyan 名字:御严
描述: 锁定技。当你成为体力值大于你的角色使用的【杀】的目标时，你令使用者选择一项：1.交给你一张点数大于此【杀】的牌（若此【杀】无点数则改为非基本牌）。2.取消此目标。
```js
twyuyan: {
		audio: "yuyan",
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			return event.card.name == "sha" && event.card.isCard && player.hp < event.player.hp;
		},
		forced: true,
		logTarget: "player",
		content() {
			"step 0";
			var num = get.number(trigger.card),
				str = "";
			if (typeof num == "number") {
				str = "点数大于" + get.cnNumber(num) + "的";
			} else {
				str = "非基本";
			}
			if (
				(typeof num == "number" &&
					(num >= 13 ||
						!trigger.player.hasCard(function (card) {
							if (_status.connectMode && get.position(card) == "h") {
								return true;
							}
							return get.number(card) > num;
						}, "he"))) ||
				(typeof num != "number" &&
					!trigger.player.hasCard(function (card) {
						if (_status.connectMode && get.position(card) == "h") {
							return true;
						}
						return get.type(card) != "basic";
					}, "he"))
			) {
				event._result = { bool: false };
			} else {
				trigger.player
					.chooseCard(
						"he",
						function (card) {
							if (typeof _status.event.number == "number") {
								return get.number(card) > _status.event.number;
							}
							return get.type(card) != "basic";
						},
						"交给" + get.translation(player) + "一张" + str + "牌，或取消" + get.translation(trigger.card) + "对其的目标"
					)
					.set("number", num)
					.set("ai", function (card) {
						if (card.name == "shan" || card.name == "tao" || card.name == "jiu") {
							return false;
						}
						return 6 - get.value(card);
					});
			}
			"step 1";
			if (result.bool) {
				trigger.player.give(result.cards, player);
			} else {
				trigger.targets.remove(player);
				trigger.getParent().triggeredTargets2.remove(player);
				trigger.untrigger();
			}
		},
		ai: {
			effect: {
				target_use(card, player, target, current) {
					if (card.name == "sha" && player.hp > target.hp && get.attitude(player, target) < 0) {
						var num = get.number(card);
						var bs = player.getCards("h", function (cardx) {
							return (typeof num == "number" ? get.number(cardx) > num : get.type(cardx) != "basic") && !["", "", ""].includes(cardx.name);
						});
						if (bs.length < 2) {
							return 0;
						}
						if (player.hasSkill("jiu") || player.hasSkill("tianxianjiu")) {
							return;
						}
						if (bs.length <= 2) {
							for (var i = 0; i < bs.length; i++) {
								if (get.value(bs[i]) < 6) {
									return [1, 0, 1, -0.5];
								}
							}
							return 0;
						}
						return [1, 0, 1, -0.5];
					}
				},
			},
		},
	}
```

## tw_zhouchu 名字:TW周处 势力:wu

### twguoyi 名字:果毅
描述: 当你不因〖果毅〗使用【杀】或普通锦囊牌指定一名其他角色为目标后，若其体力值或手牌数最大，或你的手牌数不大于X（X为你已损失的体力值+1），你可令其选择一项：1.本回合不能使用或打出手牌；2.弃置X张牌。若条件均满足，或其于本回合两个选项均已选择过，则你于此牌结算结束后依次视为对此牌的所有目标使用一张名称和属性相同的牌。
```js
twguoyi: {
		audio: "zhangming",
		trigger: { player: "useCardToTargeted" },
		filter(event, player) {
			if (event.target == player || (event.card.storage && event.card.storage.twguoyi)) {
				return false;
			}
			return (event.card.name == "sha" || get.type(event.card) == "trick") && (event.target.isMaxHp() || event.target.isMaxHandcard() || player.countCards("h") <= player.getDamagedHp() + 1);
		},
		check(event, player) {
			return get.attitude(player, event.target) <= 0;
		},
		logTarget: "target",
		group: "twguoyi_reuse",
		content() {
			"step 0";
			event.bool1 = false;
			event.bool2 = false;
			if (trigger.target.isMaxHp() || trigger.target.isMaxHandcard()) {
				event.bool1 = true;
			}
			if (player.countCards("h") <= player.getDamagedHp() + 1) {
				event.bool2 = true;
			}
			if (!trigger.target.countCards("he")) {
				event._result = { index: 0 };
			} else {
				trigger.target
					.chooseControl()
					.set("choiceList", ["本回合不能使用或打出手牌", "弃置" + get.cnNumber(player.getDamagedHp() + 1) + "张牌"])
					.set("ai", function () {
						var player = _status.event.player;
						if (player.countCards("h") <= player.getHandcardLimit()) {
							return 0;
						}
						return 1;
					});
			}
			"step 1";
			player.addTempSkill("twguoyi_" + result.index);
			if (result.index == 0) {
				trigger.target.addTempSkill("twguoyi_hand");
			} else {
				trigger.target.chooseToDiscard("he", player.getDamagedHp() + 1, true);
			}
			"step 2";
			if ((event.bool1 && event.bool2) || (player.hasSkill("twguoyi_0") && player.hasSkill("twguoyi_1"))) {
				if (!trigger.getParent().twguoyi_reuse) {
					trigger.getParent().twguoyi_reuse = {
						name: trigger.card.name,
						nature: trigger.card.nature,
						isCard: true,
						storage: { twguoyi: true },
					};
				}
			}
		},
		subSkill: {
			0: { charlotte: true },
			1: { charlotte: true },
			hand: {
				charlotte: true,
				mark: true,
				intro: { content: "不能使用或打出手牌" },
				mod: {
					cardEnabled2(card) {
						if (get.position(card) == "h") {
							return false;
						}
					},
				},
			},
			reuse: {
				charlotte: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return event.twguoyi_reuse;
				},
				direct: true,
				content() {
					var card = trigger.twguoyi_reuse;
					for (var i of trigger.targets) {
						if (!i.isIn() || !player.canUse(card, i, false)) {
							return;
						}
					}
					if (trigger.addedTarget && !trigger.addedTarget.isIn()) {
						return;
					}
					if (trigger.addedTargets && trigger.addedTargets.length) {
						for (var i of trigger.addedTargets) {
							if (!i.isIn()) {
								return;
							}
						}
					}
					var next = player.useCard(get.copy(card), trigger.targets, false);
					if (trigger.addedTarget) {
						next.addedTarget = trigger.addedTarget;
					}
					if (trigger.addedTargets && trigger.addedTargets.length) {
						next.addedTargets = trigger.addedTargets.slice(0);
					}
				},
			},
		},
	}
```

### twchuhai 名字:除害
描述: 使命技。①使命：令至少两名其他角色进入濒死状态。②成功：一名角色的回合结束时，若你于本回合完成了〖除害①〗的使命，你废除判定区，然后每名其他角色依次交给你一张牌。③当你获得其他角色的牌后，你须将其中的一张牌置入弃牌堆。
```js
twchuhai: {
		audio: ["xianghai1.mp3", "xianghai2.mp3", "chuhai1.mp3", "chuhai2.mp3", "chuhai3.mp3"],
		trigger: { global: "phaseEnd" },
		logAudio: () => 4,
		filter(event, player) {
			var targets = [];
			player.getHistory("sourceDamage", evt => {
				if (player != evt.player && evt._dyinged) {
					targets.add(evt.player);
				}
			});
			return targets.length >= 2;
		},
		forced: true,
		locked: false,
		dutySkill: true,
		skillAnimation: true,
		animationColor: "wood",
		group: "twchuhai_lose",
		content() {
			"step 0";
			game.log(player, "成功完成使命");
			player.awakenSkill("twchuhai");
			if (!player.isDisabledJudge()) {
				player.disableJudge();
			}
			event.current = player.next;
			"step 1";
			if (!event.current.countCards("he")) {
				event.goto(3);
			} else {
				event.current.chooseCard("交给" + get.translation(player) + "一张牌", "he", true).set("ai", get.disvalue2);
			}
			"step 2";
			if (result.bool && result.cards && result.cards.length) {
				event.current.give(result.cards, player);
			}
			"step 3";
			event.current = event.current.next;
			if (event.current != player) {
				event.goto(1);
			}
		},
		subSkill: {
			lose: {
				audio: "chuhai3.mp3",
				trigger: {
					global: ["gainAfter", "loseAsyncAfter"],
				},
				forced: true,
				dutySkill: true,
				filter(event, player) {
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
				content() {
					"step 0";
					var cards = trigger.getg(player);
					if (!cards.length) {
						event.finish();
						return;
					}
					player
						.chooseCard("h", "除害：将其中一张得到的牌置入弃牌堆", true, function (card) {
							return _status.event.cards?.includes(card);
						})
						.set("ai", function (card) {
							return -get.value(card);
						})
						.set("cards", cards);
					"step 1";
					if (result.bool) {
						player.loseToDiscardpile(result.cards);
					}
				},
			},
		},
	}
```

## tw_qiaogong 名字:TW桥公 势力:wu

### twyizhu 名字:遗珠
描述: ①游戏开始时与结束阶段，你摸X张牌，然后将两张牌随机插入牌堆前2X张牌的位置中，称为“遗珠”（X为场上角色数且至多为4，选择牌的牌名对其他角色可见）。②当有其他角色使用“遗珠”指定唯一目标时，你可以选择一项：1.增加一个目标；2.取消此目标，增加一个目标。然后移除此牌对应的“遗珠”记录并摸一张牌。
```js
twyizhu: {
		audio: "yizhu",
		group: ["twyizhu_use", "twyizhu_discard"],
		trigger: {
			player: ["phaseJieshuBegin", "enterGame"],
			global: "phaseBefore",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			const num = Math.min(4, game.countPlayer());
			await player.draw(num);
			const hs = player.getCards("he");
			if (!hs.length) {
				return;
			}
			const result =
				hs.length > 2
					? await player.chooseCard("he", true, 2, "选择两张牌洗入牌堆").forResult()
					: {
							bool: true,
							cards: hs,
						};
			if (result?.bool) {
				player.$throw(result.cards.length, 1000);
				const next = player.lose(result.cards, ui.cardPile);
				next.insert_index = function () {
					return ui.cardPile.childNodes[get.rand(0, Math.min(4, game.countPlayer()) * 2 - 2)];
				};
				player.markAuto("twyizhu", result.cards);
				await next;
				game.updateRoundNumber();
				await game.delayx();
			}
		},
		intro: {
			mark(dialog, content, player) {
				if (player == game.me || player.isUnderControl()) {
					dialog.addAuto(content);
				} else {
					var names = [];
					for (var i of content) {
						names.add(i.name);
					}
					return get.translation(names);
				}
			},
		},
		subSkill: {
			use: {
				audio: "yizhu",
				trigger: { global: "useCardToPlayer" },
				filter(event, player) {
					return (
						player.getStorage("twyizhu").length &&
						event.player != player &&
						event.targets.length == 1 &&
						event.cards.filter(function (i) {
							return player.getStorage("twyizhu").includes(i);
						}).length > 0
					);
				},
				logTarget: "player",
				forced: true,
				locked: false,
				content() {
					"step 0";
					var list = [];
					if (
						!game.hasPlayer(function (current) {
							return current != trigger.target && lib.filter.targetEnabled2(trigger.card, trigger.player, current);
						})
					) {
						event.goto(3);
					}
					var filter = function (event, player) {
						var card = event.card,
							info = get.info(card);
						if (info.allowMultiple == false) {
							return false;
						}
						if (!info.multitarget) {
							return game.hasPlayer(current => lib.filter.targetEnabled2(card, player, current));
						}
						return false;
					};
					var enable = filter(trigger.getParent(), trigger.player);
					var prompt2 = "操作提示：";
					if (enable) {
						prompt2 += "选择一名合法的其他角色，以增加其为目标；或";
					}
					prompt2 += "选择目标角色（" + get.translation(trigger.target) + "）和另一名合法的角色，以取消前者为目标并增加后者为目标";
					player
						.chooseTarget("遗珠：是否" + (enable ? "增加或" : "") + "修改目标？", prompt2, [enable ? 1 : 2, 2], (card, player, target) => {
							var evt = _status.event.getTrigger(),
								card = evt.card;
							if (target == evt.target) {
								return true;
							}
							if (ui.selected.targets.length && ui.selected.targets[0] != evt.target) {
								return false;
							}
							return lib.filter.targetEnabled2(card, evt.player, target);
						})
						.set("targetprompt", target => {
							return target == _status.event.targetx ? "取消目标" : "增加目标";
						})
						.set("filterOk", () => {
							if (ui.selected.targets.length == 1 && ui.selected.targets[0] == _status.event.targetx) {
								return false;
							}
							return true;
						})
						.set("ai", target => {
							var evt = _status.event.getTrigger(),
								card = evt.card,
								player = _status.event.player;
							if (target == evt.target && get.effect(evt.target, card, evt.player, player) < 0) {
								return 100;
							}
							if (target == evt.target) {
								return -100;
							}
							return get.effect(target, card, evt.player, player);
						})
						.set("targetx", trigger.target)
						.set("card", trigger.card);
					"step 1";
					if (result.bool) {
						var target = result.targets[result.targets[0] == trigger.target ? 1 : 0];
						if (result.targets.length > 1) {
							player.line2([trigger.target, target]);
							trigger.targets.remove(trigger.target);
							trigger.getParent().triggeredTargets1.remove(trigger.target);
							trigger.untrigger();
						} else {
							player.line(target);
						}
						trigger.targets.push(target);
					}
					"step 2";
					var list = trigger.cards.filter(function (i) {
						return player.getStorage("twyizhu").includes(i);
					});
					player.unmarkAuto("twyizhu", list);
					player.draw();
					game.delayx();
				},
			},
			discard: {
				trigger: {
					global: ["loseAfter", "cardsDiscardAfter", "loseAsyncAfter", "equipAfter"],
				},
				silent: true,
				forced: true,
				locked: false,
				filter(event, player) {
					return (
						player.getStorage("twyizhu").length &&
						event.getd().filter(function (i) {
							return player.getStorage("twyizhu").includes(i);
						}).length > 0
					);
				},
				content() {
					var list = trigger.getd().filter(function (i) {
						return player.getStorage("twyizhu").includes(i);
					});
					player.unmarkAuto("twyizhu", list);
				},
			},
		},
	}
```

### twluanchou 名字:鸾俦
描述: 出牌阶段限一次。你可以令两名角色获得〖共患〗直到你下次发动此技能。
```js
twluanchou: {
		audio: "luanchou",
		enable: "phaseUse",
		usable: 1,
		selectTarget: 2,
		filterTarget: true,
		multitarget: true,
		multiline: true,
		content() {
			"step 0";
			game.filterPlayer()
				.sortBySeat()
				.forEach(function (current) {
					current.removeSkills("twgonghuan");
				});
			"step 1";
			targets.sortBySeat();
			for (var i of targets) {
				i.addSkills("twgonghuan");
			}
		},
		derivation: "twgonghuan",
		ai: {
			order: 10,
			expose: 0.2,
			result: {
				target(player, target) {
					return Math.max(0.1, target.hp) * (get.attitude(player, target) + 20);
				},
			},
		},
	}
```

## tw_feiyi 名字:TW费祎 势力:shu

### twshengxi 名字:生息
描述: ①准备阶段，你可以获得一张【调剂盐梅】。②结束阶段，若你本回合使用过牌且未造成伤害，则你可以获得一张智囊并摸一张牌。
```js
twshengxi: {
		audio: "shengxi_feiyi",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.getHistory("useCard").length > 0 && player.getHistory("sourceDamage").length == 0;
		},
		direct: true,
		content() {
			"step 0";
			var list = get.zhinangs();
			player.chooseButton(["###" + get.prompt("twshengxi") + "###获得一张智囊并摸一张牌", [list, "vcard"]]).set("ai", function (card) {
				return (Math.random() + 0.5) * get.value({ name: card.link[2] }, _status.event.player);
			});
			"step 1";
			if (result.bool) {
				player.logSkill("twshengxi");
				var card = get.cardPile2(function (card) {
					return card.name == result.links[0][2];
				});
				if (card) {
					player.gain(card, "gain2");
				}
				player.draw();
			}
		},
		group: "twshengxi_zhunbei",
		subfrequent: ["zhunbei"],
		subSkill: {
			zhunbei: {
				audio: "shengxi_feiyi",
				trigger: { player: "phaseZhunbeiBegin" },
				frequent: true,
				prompt2: "从游戏外或牌堆中获得一张【调剂盐梅】",
				content() {
					if (!_status.tiaojiyanmei_suits || _status.tiaojiyanmei_suits.length > 0) {
						if (!lib.inpile.includes("tiaojiyanmei")) {
							game.broadcastAll(function () {
								lib.inpile.add("tiaojiyanmei");
							});
						}
						if (!_status.tiaojiyanmei_suits) {
							_status.tiaojiyanmei_suits = lib.suit.slice(0);
						}
						player.gain(game.createCard2("tiaojiyanmei", _status.tiaojiyanmei_suits.randomRemove(), 6), "gain2");
					} else {
						var card = get.cardPile2(function (card) {
							return card.name == "tiaojiyanmei";
						});
						if (card) {
							player.gain(card, "gain2");
						}
					}
				},
			},
		},
	}
```

### twkuanji 名字:宽济
描述: 每回合限一次。当你的牌不因使用而进入弃牌堆后，你可以令一名其他角色获得其中的一张牌。
```js
twkuanji: {
		audio: "fyjianyu",
		trigger: {
			player: "loseAfter",
			global: ["cardsDiscardAfter", "loseAsyncAfter", "equipAfter"],
		},
		filter(event, player) {
			if (event.name != "cardsDiscard") {
				return event.getd(player, "cards2").length > 0;
			} else {
				if (event.cards.filterInD("d").length <= 0) {
					return false;
				}
				const evt = event.getParent();
				if (evt.name != "orderingDiscard") {
					return false;
				}
				const evtx = evt.relatedEvent || evt.getParent();
				if (evtx.player != player) {
					return false;
				}
				if (evtx.name == "useCard") {
					return false;
				}
				return player.hasHistory("lose", evtxx => {
					return evtx == (evtxx.relatedEvent || evtxx.getParent());
				});
			}
		},
		usable: 1,
		async cost(event, trigger, player) {
			const cards = trigger.name != "cardsDiscard" ? trigger.getd(player, "cards2") : trigger.cards.filterInD("d");
			const result = await player
				.chooseButtonTarget({
					createDialog: [get.prompt2(event.skill), cards],
					filterTarget: lib.filter.notMe,
					ai1(button) {
						const player = get.player();
						if (
							game.hasPlayer(current => {
								return current != player && get.attitude(player, current) > 0;
							})
						) {
							return Math.abs(get.value(button.link, "raw")) + 1;
						}
						return -get.value(button.link, "raw");
					},
					ai2(target) {
						const player = get.player();
						return get.attitude(player, target) * get.value(ui.selected.buttons[0].link, target) * (target.hasSkillTag("nogain") ? 0.1 : 1);
					},
				})
				.forResult();
			event.result = {
				bool: result?.bool,
				targets: result?.targets,
				cost_data: result?.links,
			};
		},
		async content(event, trigger, player) {
			await event.targets[0].gain(event.cost_data, "gain2");
		},
	}
```

## tw_bianfuren 名字:TW卞夫人 势力:wei

### twwanwei 名字:挽危
描述: 每回合限一次。当一名体力值最小的角色受到伤害时：若该角色不为你，你可以防止此伤害，然后失去1点体力；若该角色为你，或你的体力上限最大，你可以于当前回合的结束阶段获得牌堆顶的牌并亮出牌堆底的牌，若展示的牌能被使用，你使用之。
```js
twwanwei: {
		audio: "spwanwei",
		trigger: { global: "damageBegin4" },
		filter(event, player) {
			return event.player.isMinHp();
		},
		check(event, player) {
			return get.attitude(player, event.player) > 0 && event.player.hp < player.hp;
		},
		usable: 1,
		logTarget: "player",
		prompt2(event, player) {
			if (player != event.player) {
				return "防止" + get.translation(event.player) + "即将受到的" + event.num + "点伤害，然后你失去1点体力";
			} else if (
				event.player == player ||
				!game.hasPlayer(function (current) {
					return current != player && current.maxHp > player.maxHp;
				})
			) {
				return "于当前回合的结束阶段获得牌堆顶的牌并亮出牌堆底的牌，若展示的牌能被使用，你使用之";
			}
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			if (target != player) {
				trigger.cancel();
				await player.loseHp();
			}
			if (target == player || player.isMaxMaxHp()) {
				player.addTempSkill("twwanwei_effect");
			}
		},
		subSkill: {
			effect: {
				audio: "spwanwei",
				charlotte: true,
				trigger: { global: "phaseJieshuBegin" },
				prompt2: "获得牌堆顶的牌并亮出牌堆底的牌，若展示的牌能被使用，你使用之",
				async content(event, trigger, player) {
					await player.gain(get.cards(1, true), "gain2");
					const card = get.bottomCards(1, true)[0];
					await player.showCards(card, get.translation(player) + "挽危：牌堆底的牌", true);
					if (player.hasUseTarget(card)) {
						await player.chooseUseTarget(card, true);
					}
				},
			},
		},
	}
```

### twyuejian 名字:约俭
描述: 出牌阶段限一次。你可以将至多X张牌置于牌堆顶或牌堆底（X为你的手牌数减你的手牌上限且至少为1）。若你以此法失去的牌数：不小于3，你的体力上限+1；不小于2，你回复1点体力；不小于1，你的手牌上限+1。
```js
twyuejian: {
		audio: "spyuejian",
		enable: "phaseUse",
		filterCard: true,
		selectCard() {
			var player = _status.event.player;
			var num = Math.max(1, player.countCards("h") - player.getHandcardLimit());
			return [1, num];
		},
		complexCard: true,
		discard: false,
		/*loseTo: "cardPile",
		insert: true,
		visible: true,*/
		lose: false,
		delay: false,
		position: "he",
		usable: 1,
		check(card) {
			if (ui.selected.cards.length >= 3) {
				return 0;
			}
			var player = _status.event.player;
			var num = Math.max(1, player.countCards("h") - player.getHandcardLimit());
			if (num >= 3) {
				return 5 - get.value(card);
			}
			if (num >= 2 && player.isDamaged() && ui.selected.cards.length < 1) {
				return 7 - get.value(card);
			}
			if (num >= 1 && player.isDamaged() && !ui.selected.cards.length) {
				return 6 - get.value(card);
			}
			return 0;
		},
		async content(event, trigger, player) {
			const { cards } = event;
			const next = player.chooseToMove();
			next.set("list", [["牌堆顶", cards], ["牌堆底"]]);
			next.set("prompt", "约俭：将这些牌置于牌堆顶或牌堆底");
			next.set("processAI", function (list) {
				var cards = list[0][1].slice(0),
					player = _status.event.player;
				var target = player.next;
				var att = get.sgn(get.attitude(player, target));
				var top = [];
				var judges = target.getCards("j");
				var stopped = false;
				if (player != target || !target.hasWuxie()) {
					for (var i = 0; i < judges.length; i++) {
						var judge = get.judge(judges[i]);
						cards.sort(function (a, b) {
							return (judge(b) - judge(a)) * att;
						});
						if (judge(cards[0]) * att < 0) {
							stopped = true;
							break;
						} else {
							top.unshift(cards.shift());
						}
					}
				}
				var bottom;
				if (!stopped) {
					cards.sort(function (a, b) {
						return (get.value(b, player) - get.value(a, player)) * att;
					});
					while (cards.length) {
						if (get.value(cards[0], player) <= 5 == att > 0) {
							break;
						}
						top.unshift(cards.shift());
					}
				}
				bottom = cards.sort(function (a, b) {
					return player.getUseValue(a) - player.getUseValue(b);
				});
				return [top, bottom];
			});
			const result = await next.forResult();
			if (result.moved?.length) {
				const {
					moved: [top, bottom],
				} = result;
				top.reverse();
				player.$throw(cards.length, 1000);
				player.popup(get.cnNumber(top.length) + "上" + get.cnNumber(bottom.length) + "下");
				game.log(player, `将${get.cnNumber(top.length)}张牌置于牌堆顶`);
				game.log(player, `将${get.cnNumber(bottom.length)}张牌置于牌堆底`);
				await player
					.lose(top.concat(bottom), ui.cardPile)
					.set("top_cards", top)
					.set("insert_index", (event, card) => {
						if (event.top_cards.includes(card)) {
							return ui.cardPile.firstChild;
						}
						return null;
					});
				await game.delayx();
			}
			if (cards.length >= 3) {
				await player.gainMaxHp();
			}
			if (cards.length >= 2) {
				await player.recover();
			}
			if (cards.length >= 1) {
				player.addSkill("twyuejian_effect");
				player.addMark("twyuejian_effect", 1, false);
			}
		},
		ai: {
			order: 5,
			result: { player: 1 },
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				marktext: "俭",
				intro: {
					content: "手牌上限+#",
				},
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("twyuejian_effect");
					},
				},
			},
		},
	}
```

## tw_chenzhen 名字:TW陈震 势力:shu

### twmuyue 名字:睦约
描述: 出牌阶段限一次。你可以弃置一张牌并选择一个基本牌或普通锦囊牌的牌名，然后令一名角色从牌堆中获得一张此牌名的牌。若你以此法弃置的牌的牌名与你选择的牌名相同，你下次发动〖睦约〗无需弃牌。
```js
twmuyue: {
		audio: "shameng1.mp3",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("he") || player.hasSkill("twmuyue_effect");
		},
		chooseButton: {
			dialog() {
				var list = [];
				for (var i of lib.inpile) {
					var type = get.type(i);
					if (type == "basic" || type == "trick") {
						list.push([type, "", i]);
					}
				}
				return ui.create.dialog("睦约", [list, "vcard"]);
			},
			check(button) {
				if (
					!get.cardPile2(function (cardx) {
						return cardx.name == button.link[2];
					})
				) {
					return 0;
				}
				return get.value({ name: button.link[2] });
			},
			backup(links, player) {
				return {
					audio: "twmuyue",
					filterCard(card, player, target) {
						return !player.hasSkill("twmuyue_effect");
					},
					selectCard() {
						var player = _status.event.player;
						return player.hasSkill("twmuyue_effect") ? -1 : 1;
					},
					check(card) {
						return 7 - get.value(card);
					},
					position: "he",
					card: links[0],
					filterTarget: true,
					content() {
						"step 0";
						var card = lib.skill.twmuyue_backup.card;
						event.card = card;
						player.removeSkill("twmuyue_effect");
						var cardx = get.cardPile2(function (cardx) {
							return cardx.name == card[2];
						});
						player.line(target, "green");
						if (cardx) {
							target.gain(cardx, "gain2");
						} else {
							player.chat("无牌可得了吗？！");
							game.log("但是牌堆中已经没有", "#g【" + get.translation(card[2]) + "】", "了！");
						}
						"step 1";
						if (cards && cards.length && get.name(cards[0], player) == card[2]) {
							player.addSkill("twmuyue_effect");
						}
					},
					ai: {
						result: {
							target(player, target) {
								var att = Math.abs(get.attitude(player, target));
								if (target.hasSkill("nogain")) {
									att /= 10;
								}
								return att / Math.sqrt(get.distance(player, target, "absolute"));
							},
						},
					},
				};
			},
			prompt(links, player) {
				return (player.hasSkill("twmuyue_effect") ? "" : "弃置一张牌，") + "令一名角色从牌堆中获得一张【" + get.translation(links[0][2]) + "】";
			},
		},
		ai: {
			order: 3,
			result: { player: 1 },
		},
		subSkill: {
			effect: {
				charlotte: true,
				mark: true,
				intro: { content: "下一次发动【睦约】无需弃牌" },
			},
			backup: {},
		},
	}
```

### twchayi 名字:察异
描述: 结束阶段，你可以选择一名其他角色，令其选择一项：1.展示所有手牌；2.下次使用牌时弃置一张牌。该角色的下个回合结束时，若其手牌数与其上一次成为〖察异〗目标后的手牌数不相同，其执行另一项。
```js
twchayi: {
		audio: "shameng2.mp3",
		trigger: { player: "phaseJieshuBegin" },
		direct: true,
		content() {
			"step 0";
			player.chooseTarget(get.prompt2("twchayi"), lib.filter.notMe).set("ai", function (target) {
				var player = _status.event.player;
				return -get.attitude(player, target);
			});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twchayi", target);
				if (!target.countCards("h")) {
					event._result = { index: 1 };
				} else {
					target.chooseControl().set("choiceList", ["展示手牌", "下一次使用牌时候弃一张牌"]);
				}
			} else {
				event.finish();
			}
			"step 2";
			target.storage.twchayi_re = [result.index, target.countCards("h")];
			target.addSkill("twchayi_re");
			target.markSkill("twchayi_re");
			if (result.index == 0) {
				target.showCards(target.getCards("h"), get.translation(target) + "的手牌");
			} else {
				target.addMark("twchayi_effect", 1, false);
				target.addSkill("twchayi_effect");
			}
		},
		subSkill: {
			effect: {
				intro: { content: "使用下一张牌时弃置&张牌" },
				charlotte: true,
				onremove: true,
				audio: "twchayi",
				trigger: { player: "useCard" },
				forced: true,
				content() {
					player.chooseToDiscard("he", true, player.countMark("twchayi_effect"));
					player.removeSkill("twchayi_effect");
				},
			},
			re: {
				charlotte: true,
				onremove: true,
				audio: "twchayi",
				trigger: { player: "phaseEnd" },
				direct: true,
				filter(event, player) {
					return player.storage.twchayi_re;
				},
				content() {
					if (player.countCards("h") != player.storage.twchayi_re[1]) {
						player.popup("察异");
						if (player.storage.twchayi_re[0] == 0) {
							player.addMark("twchayi_effect", 1, false);
							player.addSkill("twchayi_effect");
						} else {
							player.showCards(player.getCards("h"), get.translation(player) + "的手牌");
						}
					}
					player.removeSkill("twchayi_re");
				},
				marktext: "异",
				intro: {
					markcount(storage, player) {
						if (!storage || !storage.length) {
							return 0;
						}
						return storage[1];
					},
					content(storage, player) {
						if (!storage || !storage.length) {
							return;
						}
						return "下个回合结束时，若你的手牌数不为" + storage[1] + "，你" + (storage[0] == 0 ? "下次使用牌时弃置一张牌" : "展示所有手牌");
					},
				},
			},
		},
	}
```

## tw_caoxiu 名字:TW曹休 势力:wei

### twqianju 名字:千驹
描述: 锁定技。①你计算与其他角色的距离-X（X为你装备区的牌数）。②每回合限一次。当你对距离为1以内的角色造成伤害后，若你的装备区存在空置装备栏，你从牌堆或弃牌堆中将一张你空置装备栏对应副类别的装备牌置于你的装备区。
```js
twqianju: {
		audio: "xinqingxi1.mp3",
		trigger: { source: "damageSource" },
		filter(event, player) {
			return get.distance(player, event.player) <= 1 && player.countCards("e") < 5;
		},
		forced: true,
		usable: 1,
		content() {
			var card = get.cardPile(function (card) {
				return get.type(card) == "equip" && player.canEquip(card);
			});
			if (card) {
				player.$gain2(card);
				game.delayx();
				player.equip(card);
			}
		},
		mod: {
			globalFrom(from, to, distance) {
				return distance - from.countCards("e");
			},
		},
	}
```

### twqingxi 名字:倾袭
描述: 当你使用一张【杀】指定目标后，若此牌为你于本回合使用的第一张【杀】，你可以令目标角色选择一项：1.令你摸Y张牌，此【杀】不可被其响应（Y为你装备区的牌数且至少为1）；2.若其装备区里有牌，弃置装备区里的所有牌，然后弃置你装备区里的等量张牌，令此【杀】对其造成的伤害+1。
```js
twqingxi: {
		audio: "xinqingxi2.mp3",
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return event.card.name == "sha" && player.getHistory("useCard", evt => evt.card.name == "sha").indexOf(event.getParent()) == 0;
		},
		check(event, player) {
			return true;
		},
		logTarget: "target",
		content() {
			"step 0";
			var target = trigger.target;
			event.target = target;
			if (!target.countCards("e")) {
				event._result = { index: 0 };
			} else {
				target
					.chooseControl()
					.set("ai", function () {
						if (_status.event.goon || player.hp > 2) {
							return 0;
						}
						return 1;
					})
					.set("choiceList", ["令" + get.translation(player) + "摸" + get.cnNumber(Math.max(1, player.countCards("e"))) + "张牌，且此【杀】不可被响应", "弃置装备区中的所有牌并弃置" + get.translation(player) + "装备区等量的牌，此【杀】造成的伤害+1"])
					.set("goon", get.attitude(target, player) > 0);
			}
			"step 1";
			if (result.index == 0) {
				player.draw(Math.max(1, player.countCards("e")));
				trigger.getParent().directHit.add(target);
				game.log(trigger.card, "不可被", target, "响应");
				event.finish();
			} else {
				var num = target.countCards("e");
				target.discard(target.getCards("e"));
				target.discardPlayerCard(player, "e", num, true);
			}
			"step 2";
			var map = trigger.customArgs;
			var id = target.playerid;
			if (!map[id]) {
				map[id] = {};
			}
			if (!map[id].extraDamage) {
				map[id].extraDamage = 0;
			}
			map[id].extraDamage++;
			game.log(trigger.card, "对", target, "造成的伤害+1");
			game.delayx();
		},
	}
```

## tw_sunyi 名字:TW孙翊 势力:wu

### twzaoli 名字:躁厉
描述: 锁定技。①出牌阶段，你只能使用或打出你本回合得到的手牌。②出牌阶段开始时，你须弃置你区域内的所有装备牌并弃置任意张非装备手牌，你摸等量的牌，从牌堆中将你此次弃置的装备牌对应副类别的装备牌置入装备区。若你以此法置入了超过两张装备牌，你失去1点体力。
```js
twzaoli: {
		audio: "zaoli",
		trigger: { player: "phaseUseBegin" },
		init(player) {
			if (player.isPhaseUsing()) {
				var hs = player.getCards("h");
				player.getHistory("gain", function (evt) {
					hs.removeArray(evt.cards);
				});
				if (hs.length) {
					player.addGaintag(hs, "twzaoli");
				}
			}
		},
		filter(event, player) {
			return player.countCards("he");
		},
		forced: true,
		group: "twzaoli_mark",
		content() {
			"step 0";
			if (player.countCards("h", card => get.type(card) != "equip")) {
				player
					.chooseCard(
						"h",
						[1, Infinity],
						true,
						"躁厉：请选择至少一张非装备手牌，你弃置这些牌和所有装备牌",
						(card, player) => {
							return get.type(card) != "equip" && lib.filter.cardDiscardable(card, player, "twzaoli");
						},
						"allowChooseAll"
					)
					.set("ai", function (card) {
						if (!card.hasGaintag("twzaoli_temp")) {
							return 5 - get.value(card);
						}
						return 1;
					});
			}
			"step 1";
			var cards = player.getCards("he", { type: "equip" });
			var subtype = [];
			event.subtype = subtype.addArray(cards.map(card => get.subtype(card)));
			cards.addArray(result.cards || []);
			if (cards.length) {
				player.discard(cards);
			}
			event.cards = cards;
			"step 2";
			player.draw(cards.length);
			"step 3";
			var num = 0;
			if (event.subtype.length) {
				for (var i of event.subtype) {
					var card = get.cardPile2(function (card) {
						return get.type(card) == "equip" && get.subtype(card) == i;
					});
					if (card) {
						num++;
						player.$gain2(card);
						game.delayx();
						player.equip(card);
					}
				}
			}
			if (num <= 2) {
				event.finish();
			}
			"step 4";
			player.loseHp();
		},
		onremove(player) {
			player.removeGaintag("twzaoli");
		},
		mod: {
			cardEnabled2(card, player) {
				if (player.isPhaseUsing() && get.itemtype(card) == "card" && card.hasGaintag("twzaoli")) {
					return false;
				}
			},
		},
		subSkill: {
			mark: {
				trigger: { player: ["phaseUseBegin", "phaseUseAfter", "phaseAfter"] },
				filter(event, player) {
					return player.countCards("h");
				},
				direct: true,
				firstDo: true,
				content() {
					if (event.triggername == "phaseUseBegin") {
						var hs = player.getCards("h");
						player.getHistory("gain", function (evt) {
							hs.removeArray(evt.cards);
						});
						if (hs.length) {
							player.addGaintag(hs, "twzaoli");
						}
					} else {
						player.removeGaintag("twzaoli");
					}
				},
			},
		},
	}
```

## tw_puyangxing 名字:濮阳兴 势力:wu

### twzhengjian 名字:征建
描述: 游戏开始时，你选择获得一项效果：⒈其他角色的出牌阶段结束时，若其本阶段内未使用过非基本牌，则其须交给你一张牌，然后你可失去此效果并获得〖征建〗的效果二。⒉其他角色的出牌阶段结束时，若其本阶段内未得到过牌，则其须交给你一张牌，然后你可失去此效果并获得〖征建〗的效果一。
```js
twzhengjian: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		locked: false,
		filter(event, player) {
			if (event.name == "phase" && game.phaseNumber != 0) {
				return false;
			}
			return !player.hasSkill("twzhengjian_eff0") && !player.hasSkill("twzhengjian_eff1");
		},
		content() {
			"step 0";
			player
				.chooseControl()
				.set("prompt", "征建：请选择一种效果")
				.set("choiceList", ["令“出牌阶段内未使用过非基本牌”的其他角色受到惩罚", "令“出牌阶段内未得到过牌”的其他角色受到惩罚"])
				.set("ai", () => (Math.random() <= 0.5 ? 0 : 1));
			"step 1";
			player.addSkill("twzhengjian_eff" + result.index);
			game.log(player, "获得了", "#g【征建】", "的", "#y效果" + get.cnNumber(result.index + 1, true));
			game.delayx();
		},
		onremove: true,
		subSkill: {
			eff0: {
				audio: "twzhengjian",
				trigger: { global: "phaseUseEnd" },
				forced: true,
				charlotte: true,
				marktext: "建",
				mark: true,
				filter(event, player) {
					if (event.player == player || event._twzhengjian || !event.player.isIn()) {
						return false;
					}
					if (
						event.player.hasHistory("useCard", function (evt) {
							return evt.getParent("phaseUse") == event && get.type(evt.card) != "basic";
						})
					) {
						return false;
					}
					return player.storage.twzhengjian || event.player.countCards("he") > 0;
				},
				logTarget: "player",
				content() {
					"step 0";
					trigger._twzhengjian = true;
					var target = trigger.player;
					event.target = target;
					if (player.storage.twzhengjian) {
						player
							.chooseBool("征建：是否对" + get.translation(target) + "造成1点伤害？")
							.set("ai", () => _status.event.goon)
							.set("goon", get.damageEffect(target, player, _status.event.player) > 0);
					} else {
						target.chooseCard("he", true, "交给" + get.translation(player) + "一张牌");
					}
					"step 1";
					if (result.bool) {
						if (result.cards && result.cards.length) {
							target.give(result.cards, player).type = "twzhengjian";
						} else {
							target.damage();
						}
					}
					player.chooseBool("是否变更【征建】的效果？").set("ai", () => Math.random() > 0.5);
					"step 2";
					if (result.bool) {
						player.removeSkill("twzhengjian_eff0");
						player.addSkill("twzhengjian_eff1");
						game.log(player, "将", "#g【征建】", "的效果变更为", "#y效果二");
					}
				},
				intro: {
					content(storage, player) {
						if (player.storage.twzhengjian) {
							return "其他角色的出牌阶段结束时，若其本阶段内未使用过非基本牌，则你可对其造成1点伤害，然后你可失去此效果并获得〖征建〗的效果二。";
						}
						return "其他角色的出牌阶段结束时，若其本阶段内未使用过非基本牌，则其须交给你一张牌，然后你可失去此效果并获得〖征建〗的效果二。";
					},
				},
			},
			eff1: {
				audio: "twzhengjian",
				trigger: { global: "phaseUseEnd" },
				forced: true,
				charlotte: true,
				marktext: "征",
				mark: true,
				filter(event, player) {
					if (event.player == player || event._twzhengjian || !event.player.isIn()) {
						return false;
					}
					if (
						event.player.hasHistory("gain", function (evt) {
							return evt.getParent("phaseUse") == event;
						})
					) {
						return false;
					}
					return player.storage.twzhengjian || event.player.countCards("he") > 0;
				},
				logTarget: "player",
				content() {
					"step 0";
					trigger._twzhengjian = true;
					var target = trigger.player;
					event.target = target;
					if (player.storage.twzhengjian) {
						player
							.chooseBool("征建：是否对" + get.translation(target) + "造成1点伤害？")
							.set("ai", () => _status.event.goon)
							.set("goon", get.damageEffect(target, player, _status.event.player) > 0);
					} else {
						target.chooseCard("he", true, "交给" + get.translation(player) + "一张牌");
					}
					"step 1";
					if (result.bool) {
						if (result.cards && result.cards.length) {
							target.give(result.cards, player).type = "twzhengjian";
						} else {
							target.damage();
						}
					}
					player.chooseBool("是否变更【征建】的效果？").set("ai", () => Math.random() > 0.5);
					"step 2";
					if (result.bool) {
						player.removeSkill("twzhengjian_eff1");
						player.addSkill("twzhengjian_eff0");
						game.log(player, "将", "#g【征建】", "的效果变更为", "#y效果一");
					}
				},
				intro: {
					content(storage, player) {
						if (player.storage.twzhengjian) {
							return "其他角色的出牌阶段结束时，若其本阶段内未得到过牌，则你可对其造成1点伤害，然后你可失去此效果并获得〖征建〗的效果一。";
						}
						return "其他角色的出牌阶段结束时，若其本阶段内未得到过牌，则其须交给你一张牌，然后你可失去此效果并获得〖征建〗的效果一。";
					},
				},
			},
		},
	}
```

### twzhongchi 名字:众斥
描述: 锁定技，限定技。当你因〖征建〗而得到牌后，若已经有至少X名角色因〖征建〗而交给你过牌（X为游戏人数的一半且向上取整），则你回复2点体力，且于本局游戏内受到渠道为【杀】的伤害+1，且你将〖征建〗中的“其须交给你一张牌”改为“你可对其造成1点伤害”。
```js
twzhongchi: {
		audio: 2,
		trigger: {
			player: "gainAfter",
			global: "loseAsyncAfter",
		},
		forced: true,
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		filter(event, player) {
			if (player.storage.twzhengjian || !player.hasSkill("twzhengjian", null, null, false) || !event.getg(player).length) {
				return false;
			}
			var num1 = game.countPlayer2();
			var list = [];
			player.getAllHistory("gain", function (evt) {
				if (evt.type == "twzhengjian") {
					list.add(evt.source);
				}
			});
			return list.length >= Math.ceil(num1 / 2);
		},
		content() {
			"step 0";
			player.awakenSkill(event.name);
			"step 1";
			player.recover(2);
			player.addSkill("twzhongchi_effect");
			player.storage.twzhengjian = true;
			"step 2";
			game.delayx();
		},
		subSkill: {
			effect: {
				audio: "twzhongchi",
				mark: true,
				marktext: "斥",
				intro: { content: "受到渠道为【杀】的伤害+1" },
				trigger: { player: "damageBegin1" },
				forced: true,
				filter(event, player) {
					return event.card && event.card.name == "sha";
				},
				content() {
					trigger.num++;
				},
			},
		},
		ai: {
			combo: "twzhengjian",
		},
	}
```

## tw_tianyu 名字:TW田豫 势力:wei

### twzhenxi 名字:震袭
描述: `每回合限一次，当你使用【杀】指定其他角色为目标后，你可选择一项：1.弃置其至多X张手牌（X为你与其的距离）；2.移动其场上的一张牌。若其的体力值大于你或者其为全场体力值最高的角色，则你可以${get.poptip("rule_beishui")}。`
```js
twzhenxi: {
		audio: 2,
		trigger: {
			player: "useCardToPlayered",
		},
		filter(event, player) {
			const { target } = event;
			return (
				event.card.name == "sha" &&
				(target.countDiscardableCards(player, "h") ||
					player.canMoveCard(
						null,
						true,
						target,
						game.filterPlayer(i => i != target)
					))
			);
		},
		usable: 1,
		async cost(event, trigger, player) {
			const { target } = trigger;
			const str = get.translation(target);
			const list = [`弃置${str}${get.cnNumber(get.distance(player, target))}张手牌`, `将${str}装备区或判定区内的一张牌移动到另一名角色的对应区域内`];
			const choices = [];
			if (target.countDiscardableCards(player, "h")) {
				choices.push("选项一");
			} else {
				list[0] = '<span style="opacity:0.5">' + list[0] + "</span>";
			}
			if (
				player.canMoveCard(
					null,
					true,
					target,
					game.filterPlayer(i => i != target)
				)
			) {
				choices.push("选项二");
			} else {
				list[1] = '<span style="opacity:0.5">' + list[1] + "</span>";
			}
			if (choices.length == 2 && (target.hp > player.hp || target.isMaxHp())) {
				list.push("背水！依次执行以上两项");
				choices.push("背水！");
			}
			choices.push("cancel2");
			const { control } = await player
				.chooseControl(choices)
				.set("choiceList", list)
				.set("prompt", get.prompt(event.skill, target))
				.set("ai", () => {
					const player = _status.event.player,
						target = _status.event.getTrigger().target;
					let eff1 = 0,
						eff2 = 0;
					var choices = _status.event.controls.slice(0);
					if (choices.includes("选项一")) {
						eff1 = -get.distance(player, target) * get.attitude(player, target);
					}
					if (choices.includes("选项二")) {
						var equip = 0,
							judge = 0,
							att = get.attitude(player, target);
						var es = target.getCards("e"),
							js = target.getCards("j");
						for (var i of es) {
							var val = get.value(i);
							if (att > 0) {
								if (
									val <= Math.min(0, equip) &&
									game.hasPlayer(function (current) {
										return current != target && current.canEquip(i) && get.effect(current, i, player, player) > 0;
									})
								) {
									equip = val;
								}
							} else {
								if (
									val > Math.max(0, equip) &&
									game.hasPlayer(function (current) {
										return current != target && current.canEquip(i) && get.effect(current, i, player, player) > 0;
									})
								) {
									equip = val;
								}
							}
						}
						for (var i of js) {
							var card = { name: i.viewAs || i.name };
							var effect = get.effect(target, card, player, player);
							if (effect < 0) {
								game.countPlayer(function (current) {
									if (current != target && current.canAddJudge(i)) {
										var eff = get.effect(current, card, player, player);
										judge = Math.max(eff, judge);
									}
								});
							}
						}
						eff2 = Math.max(-equip * att, judge);
					}
					if (eff1 > 0) {
						if (eff2 > 0) {
							if (choices.includes("背水！")) {
								return "背水！";
							} else if (eff2 >= eff1) {
								return "选项二";
							}
						}
						return "选项一";
					} else if (eff2 > 0) {
						return "选项二";
					}
					return "cancel2";
				})
				.forResult();
			event.result = {
				bool: control !== "cancel2",
				cost_data: control,
			};
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const { target } = trigger,
				{ cost_data: control } = event;
			if (control != "选项二" && target.countDiscardableCards(player, "h")) {
				await player.discardPlayerCard(target, true, "h", get.distance(player, target));
			}
			if (control == "选项一") {
				return;
			}
			if (
				control != "选项一" &&
				player.canMoveCard(
					null,
					true,
					target,
					game.filterPlayer(i => i != target)
				)
			) {
				await player.moveCard(
					true,
					target,
					game.filterPlayer(i => i != target)
				);
			}
		},
		ai: {
			unequip_ai: true,
			skillTagFilter(player, tag, arg) {
				if (!arg || !arg.name || arg.name != "sha") {
					return false;
				}
				if (player.storage.counttrigger?.twzhenxi) {
					return false;
				}
				if (!arg.target) {
					return false;
				}
				const card = arg.target.getEquip(2);
				return card && get.value(card) > 0 && game.hasPlayer(current => current != arg.target && current.canEquip(card) && get.effect(current, card, player, player) > 0);
			},
		},
	}
```

### twyangshi 名字:扬师
描述: 锁定技，当你受到伤害后，若你的攻击范围内包含所有其他角色，则你从牌堆中获得一张【杀】；否则，你的攻击范围+1。
```js
twyangshi: {
		audio: 2,
		trigger: { player: "damageEnd" },
		forced: true,
		async content(event, trigger, player) {
			if (game.hasPlayer(current => current != player && !player.inRange(current))) {
				player.addSkill(event.name + "_distance");
				player.addMark(event.name + "_distance", 1, false);
			} else {
				const card = get.cardPile2(card => card.name == "sha");
				if (card) {
					await player.gain(card, "gain2");
				} else {
					game.log("但是牌堆里已经没有杀了！");
				}
			}
		},
		subSkill: {
			distance: {
				charlotte: true,
				onremove: true,
				mod: {
					attackRange(player, num) {
						return num + player.countMark("twyangshi_distance");
					},
				},
				markimage: "image/card/attackRange.png",
				intro: { content: "攻击范围+#" },
			},
		},
	}
```

## old_quancong 名字:TW全琮 势力:wu

### zhenshan 名字:振赡
描述: 每回合限一次，当你需要使用或打出一张基本牌时，你可以与一名手牌数少于你的角色交换手牌，视为使用或打出此牌。
```js
zhenshan: {
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		filter(event, player) {
			if (event.type == "wuxie" || player.hasSkill("zhenshan_used")) {
				return false;
			}
			const nh = player.countCards("h");
			if (
				!game.hasPlayer(function (current) {
					return current != player && current.countCards("h") < nh;
				})
			) {
				return false;
			}
			for (const i of lib.inpile) {
				if (get.type(i) != "basic") {
					continue;
				}
				const card = { name: i, isCard: true };
				if (event.filterCard(card, player, event)) {
					return true;
				}
				if (i == "sha") {
					for (const j of lib.inpile_nature) {
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
				const list = [];
				for (const i of lib.inpile) {
					if (get.type(i) != "basic") {
						continue;
					}
					const card = { name: i, isCard: true };
					if (event.filterCard(card, player, event)) {
						list.push(["基本", "", i]);
					}
					if (i == "sha") {
						for (const j of lib.inpile_nature) {
							card.nature = j;
							if (event.filterCard(card, player, event)) {
								list.push(["基本", "", i, j]);
							}
						}
					}
				}
				return ui.create.dialog("振赡", [list, "vcard"], "hidden");
			},
			check(button) {
				const player = _status.event.player;
				const card = { name: button.link[2], nature: button.link[3] };
				if (card.name == "jiu") {
					return 0;
				}
				if (
					game.hasPlayer(function (current) {
						return get.effect(current, card, player, player) > 0;
					})
				) {
					if (card.name == "sha") {
						const eff = player.getUseValue(card);
						if (eff > 0) {
							return 2.9 + eff / 10;
						}
						return 0;
					} else if (card.name == "tao" || card.name == "shan") {
						return 4;
					}
				}
				return 0;
			},
			backup(links, player) {
				return {
					filterCard: () => false,
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						isCard: true,
					},
					selectCard: -1,
					log: false,
					async precontent(event, trigger, player) {
						const result = await player
							.chooseTarget({
								prompt: "赈赡：选择一名手牌数小于你的角色交换手牌",
								filterTarget(card, player, target) {
									return target != player && target.countCards("h") < player.countCards("h");
								},
								forced: true,
								ai(target) {
									return get.attitude(get.player(), target) * Math.sqrt(target.countCards("h") + 1);
								},
							})
							.forResult();
						if (result?.bool) {
							player.logSkill("zhenshan", result.targets);
							player.addTempSkill("zhenshan_used");
							await player.swapHandcards(result.targets[0]);
						} else {
							event.result.cancel = true;
						}
						await game.delayx();
					},
				};
			},
			prompt(links, player) {
				return "选择" + get.translation(links[0][3] || "") + "【" + get.translation(links[0][2]) + "】的目标";
			},
		},
		ai: {
			order() {
				const player = _status.event.player;
				const event = _status.event;
				const nh = player.countCards("h");
				if (
					game.hasPlayer(function (current) {
						return get.attitude(player, current) > 0 && current.countCards("h") < nh;
					})
				) {
					if (event.type == "dying") {
						if (event.filterCard({ name: "tao" }, player, event)) {
							return 0.5;
						}
					} else {
						if (event.filterCard({ name: "tao" }, player, event) || event.filterCard({ name: "shan" }, player, event)) {
							return 4;
						}
						if (event.filterCard({ name: "sha" }, player, event)) {
							return 2.9;
						}
					}
				}
				return 0;
			},
			save: true,
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (player.getStat().skill.olzhenshan > 0) {
					return false;
				}
				const nh = player.countCards("h");
				return game.hasPlayer(function (current) {
					return current != player && current.countCards("h") < nh;
				});
			},
			result: {
				player(player) {
					if (_status.event.type == "dying") {
						return get.attitude(player, _status.event.dying);
					}
					return 1;
				},
			},
		},
	}
```

## tw_wujing 名字:TW吴景 势力:wu

### twfenghan 名字:锋捍
描述: 每回合限一次。当你使用【杀】或伤害类锦囊牌指定第一个目标后，你可令至多X名角色各摸一张牌（X为此牌的目标数）。
```js
twfenghan: {
		audio: "liubing",
		trigger: { player: "useCardToPlayered" },
		usable: 1,
		filter(event, player) {
			return event.isFirstTarget && event.targets.length > 0 && (event.card.name == "sha" || (get.type(event.card, null, false) == "trick" && get.tag(event.card, "damage") > 0));
		},
		async cost(event, trigger, player) {
			const num = trigger.targets.length;
			event.result = await player
				.chooseTarget([1, num], get.prompt(event.name.slice(0, -5)), `令至多${get.cnNumber(num)}名角色各摸一张牌`)
				.set("ai", target => {
					return Math.sqrt(5 - Math.min(4, target.countCards("h"))) * get.attitude(get.player(), target) * (target.hasSkillTag("nogain") ? 0.1 : 1);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await game.asyncDraw(event.targets.sortBySeat());
			await game.delayx();
		},
	}
```

### twcongji 名字:从击
描述: 当你的红色牌于回合外因弃置而进入弃牌堆后，你可令一名其他角色获得这些牌。
```js
twcongji: {
		audio: "heji",
		trigger: {
			player: "loseAfter",
			global: "loseAsyncAfter",
		},
		direct: true,
		filter(event, player) {
			if (player == _status.currentPhase || event.type != "discard" || event.getlx === false || !game.hasPlayer(current => current != player)) {
				return false;
			}
			var evt = event.getl(player);
			for (var i of evt.cards2) {
				if (get.color(i, player) == "red" && get.position(i, true) == "d") {
					return true;
				}
			}
			return false;
		},
		content() {
			"step 0";
			var cards = [],
				cards2 = trigger.getl(player).cards2;
			for (var i of cards2) {
				if (get.color(i, player) == "red" && get.position(i, true) == "d") {
					cards.push(i);
				}
			}
			player
				.chooseButton(["从击：选择任意张牌交给其他角色", cards], [1, cards.length])
				.set(
					"goon",
					game.hasPlayer(function (current) {
						return current != player && get.attitude(player, current) > 0;
					})
				)
				.set("ai", function (button) {
					if (_status.event.goon) {
						return get.value(button.link);
					}
					return button.link.name == "du" ? 1 : 0;
				});
			"step 1";
			if (result.bool) {
				event.cards = result.links;
				player.chooseTarget("选择一名角色获得以下牌：", get.translation(cards), true, lib.filter.notMe).set("ai", function (target) {
					var player = _status.event.player,
						cards = _status.event.getParent().cards;
					if (cards[0].name == "du") {
						return -get.attitude(player, target);
					}
					var att = get.attitude(player, target);
					if (att <= 0) {
						return 0;
					}
					if (target.hasSkillTag("nogain")) {
						att /= 10;
					}
					if (target.hasJudge("lebu")) {
						att /= 4;
					}
					return get.value(cards, target) * att;
				});
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("twcongji", target);
				target.gain(cards, "gain2");
			}
		},
	}
```

## tw_wangcan 名字:TW王粲 势力:wei

### twdianyi 名字:典仪
描述: 锁定技。你的回合结束时，若你本回合内：造成过伤害，你弃置所有手牌；未造成过伤害，你将手牌数调整至四张。
```js
twdianyi: {
		audio: 2,
		trigger: { player: "phaseEnd" },
		forced: true,
		filter(event, player) {
			if (!player.getHistory("sourceDamage").length) {
				return player.countCards("h") != 4;
			}
			return player.countCards("h") > 0;
		},
		content() {
			var num = player.countCards("h");
			if (player.getHistory("sourceDamage").length) {
				player.chooseToDiscard("h", true, num);
			} else if (num > 4) {
				player.chooseToDiscard("h", true, num - 4, "allowChooseAll");
			} else {
				player.drawTo(4);
			}
		},
	}
```

### twyingji 名字:应机
描述: 当你于回合外需要使用或打出一张基本牌或普通锦囊牌时，若你没有手牌，则你可摸一张牌，然后视为使用或打出此牌。
```js
twyingji: {
		audio: 2,
		enable: ["chooseToUse", "chooseToRespond"],
		hiddenCard(player, name) {
			return player != _status.currentPhase && lib.inpile.includes(name) && player.countCards("h") == 0;
		},
		filter(event, player) {
			if (player == _status.currentPhase || player.countCards("h") > 0) {
				return false;
			}
			for (var i of lib.inpile) {
				if (i == "wuxie") {
					continue;
				}
				var type = get.type(i);
				if ((type == "basic" || type == "trick") && event.filterCard({ name: i, isCard: true }, player, event)) {
					return true;
				}
				if (i == "sha") {
					for (var j of lib.inpile_nature) {
						if (event.filterCard({ name: i, nature: j, isCard: true }, player, event)) {
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
				for (var i of lib.inpile) {
					if (i == "wuxie") {
						continue;
					}
					var type = get.type(i);
					if (type == "basic" || type == "trick") {
						var card = { name: i, isCard: true };
						if (event.filterCard(card, player, event)) {
							list.push([type, "", i]);
						}
						if (i == "sha") {
							for (var j of lib.inpile_nature) {
								card.nature = j;
								if (event.filterCard(card, player, event)) {
									list.push(["基本", "", "sha", j]);
								}
							}
						}
					}
				}
				return ui.create.dialog("应机", [list, "vcard"]);
			},
			check(button) {
				var player = _status.event.player;
				var card = { name: button.link[2], nature: button.link[3] };
				var val = _status.event.getParent().type == "phase" ? player.getUseValue(card) : 1;
				return val;
			},
			backup(links, player) {
				return {
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						isCard: true,
					},
					filterCard: () => false,
					selectCard: -1,
					log: false,
					precontent() {
						player.logSkill("twyingji");
						player.draw("nodelay");
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
				if (player == _status.currentPhase || player.countCards("h") > 0) {
					return false;
				}
			},
			order: 10,
			result: {
				player(player) {
					if (_status.event.dying) {
						return get.attitude(player, _status.event.dying) > 0;
					}
					return 1;
				},
			},
		},
		group: ["twyingji_wuxie"],
	}
```

### twshanghe 名字:觞贺
描述: 限定技。当你进入濒死状态时，你可令所有其他角色依次交给你一张牌；若这些牌中没有【酒】，则你将体力回复至1点。
```js
twshanghe: {
		trigger: { player: "dying" },
		limited: true,
		audio: 2,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && current.countCards("he") > 0;
			});
		},
		prompt: "是否发动【觞贺】？",
		skillAnimation: true,
		animationColor: "soil",
		logTarget: (event, player) => game.filterPlayer(current => current != player),
		content() {
			"step 0";
			player.awakenSkill(event.name);
			event.targets = game.filterPlayer(current => current != player);
			event.num = 0;
			event.jiu = false;
			"step 1";
			event.current = targets[num];
			if (!event.current.countCards("he")) {
				event.goto(3);
			} else {
				event.current.chooseCard("交给" + get.translation(player) + "一张牌", "he", true).set("ai", function (card) {
					var evt = _status.event.getParent();
					return 100 - get.value(card);
				});
			}
			"step 2";
			if (result.bool && result.cards && result.cards.length) {
				event.current.give(result.cards, player);
				if (!event.jiu && get.name(result.cards[0], player) == "jiu") {
					event.jiu = true;
				}
			}
			"step 3";
			event.num++;
			if (event.num < targets.length) {
				event.goto(1);
			} else if (!event.jiu && player.hp < 1) {
				player.recover(1 - player.hp);
			}
		},
	}
```

## tw_wangchang 名字:TW王昶 势力:wei

### twkaiji 名字:开济
描述: 准备阶段，你可令至多X名角色各摸一张牌（X为本局游戏内进入过濒死状态的角色数+1）。若有角色以此法获得了非基本牌，则你摸一张牌。
```js
twkaiji: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			const skillName = event.name.slice(0, -5);
			const num =
				1 +
				game
					.getAllGlobalHistory("everything", evt => evt.name === "dying")
					.map(evt => evt.player)
					.unique().length;
			event.result = await player
				.chooseTarget([1, num], get.prompt(skillName), `令至多${get.cnNumber(num)}名角色各摸一张牌`)
				.set("ai", target => {
					return Math.sqrt(5 - Math.min(4, target.countCards("h"))) * get.attitude(get.player(), target) * (target.hasSkillTag("nogain") ? 0.1 : 1);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const { targets } = event;
			await game.asyncDraw(targets.sortBySeat());
			if (targets.length > 1) {
				await game.delayx();
			}
			if (targets.some(current => current.hasHistory("gain", evt => evt.getParent(2) == event && get.type(evt.cards[0], current) != "basic"))) {
				await player.draw();
			}
		},
	}
```

### twshepan 名字:慑叛
描述: 每回合限一次。当你成为其他角色使用牌的目标后，你可选择一项：⒈摸一张牌。⒉将其区域内的一张牌置于牌堆顶。然后若你的手牌数与其相等，则你将此技能的发动次数归零，且可以令此牌对你无效。
```js
twshepan: {
		audio: 2,
		trigger: { target: "useCardToTargeted" },
		usable: 1,
		filter(event, player) {
			return player != event.player;
		},
		async cost(event, trigger, player) {
			const { player: target } = trigger;
			const choiceList = ["摸一张牌", `将${get.translation(target)}区域内的一张牌置于牌堆顶`];
			const choices = ["选项一"];
			if (target.countCards("hej") > 0) {
				choices.push("选项二");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			choices.push("cancel2");
			const result = await player
				.chooseControl(choices)
				.set("choiceList", choiceList)
				.set(
					"choice",
					(() => {
						if (choices.length > 2 && get.effect(target, { name: "guohe_copy" }, player, player) > 0) {
							return 1;
						}
						return 0;
					})()
				)
				.forResult();
			event.result = {
				bool: result?.control !== "cancel2",
				targets: [target],
				cost_data: result?.control,
			};
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cost_data,
			} = event;
			if (cost_data == "选项一") {
				await player.draw();
			} else {
				const result = await player.choosePlayerCard(target, "hej", true).forResult();
				if (result?.links?.length) {
					const card = result.links[0];
					target.$throw(get.position(card) == "h" ? 1 : card, 1000);
					await target.lose(card, ui.cardPile, "insert");
				}
			}
			await game.delayx();
			if (player.countCards("h") !== target.countCards("h")) {
				return;
			}
			const num = player.storage.counttrigger?.[event.name];
			if (typeof num == "number" && num > 0) {
				player.storage.counttrigger[event.name]--;
			}
			const result = await player
				.chooseBool(`是否令${get.translation(trigger.card)}对自己无效？`)
				.set("ai", () => {
					const evt = _status.event.getTrigger();
					return get.effect(evt.target, evt.card, evt.player, evt.target) < 0;
				})
				.forResult();
			if (result?.bool) {
				trigger.excluded.add(player);
			}
		},
	}
```

## tw_caozhao 名字:曹肇 势力:wei

### twfuzuan 名字:复纂
描述: 出牌阶段限一次/当你受到伤害后/当你对其他角色造成伤害后，你可选择一名拥有转换技的角色，变更其的一个转换技的状态。
```js
twfuzuan: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return (
					current.getSkills(null, false, false).filter(function (i) {
						return get.is.zhuanhuanji(i, current);
					}).length > 0
				);
			});
		},
		filterTarget(card, player, target) {
			return (
				target.getSkills(null, false, false).filter(function (i) {
					return get.is.zhuanhuanji(i, target);
				}).length > 0
			);
		},
		content() {
			"step 0";
			var list = target.getSkills(null, false, false).filter(function (i) {
				return get.is.zhuanhuanji(i, target);
			});
			if (list.length == 1) {
				event._result = { control: list[0] };
			} else {
				player
					.chooseControl(list)
					.set("prompt", "选择变更" + get.translation(target) + "一个技能的状态")
					.set("choice", list.includes("twfeifu") ? "twfeifu" : 0)
					.set("ai", () => _status.event.choice);
			}
			"step 1";
			var skill = result.control;
			target.changeZhuanhuanji(skill);
			target.popup(skill, "wood");
			game.log(target, "的", "#g【" + get.translation(skill) + "】", "发生了状态变更");
			game.delayx();
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					if (!target.hasSkill("twfeifu")) {
						return 0;
					}
					return target.storage.twfeifu ? -1 : 1;
				},
			},
		},
		group: "twfuzuan_damage",
		subSkill: {
			damage: {
				audio: "twfuzuan",
				trigger: {
					player: "damageEnd",
					source: "damageSource",
				},
				direct: true,
				filter(event, player) {
					return game.hasPlayer(function (current) {
						return (
							current.getSkills(null, false, false).filter(function (i) {
								return get.is.zhuanhuanji(i, current);
							}).length > 0
						);
					});
				},
				content() {
					"step 0";
					player.chooseTarget(lib.skill.twfuzuan.filterTarget, get.prompt("twfuzuan"), "变更一名角色的一个转换技的状态").set("ai", function (target) {
						var player = _status.event.player;
						return get.effect(target, "twfuzuan", player, player);
					});
					"step 1";
					if (result.bool) {
						var target = result.targets[0];
						player.logSkill("twfuzuan", target);
						var next = game.createEvent("twfuzuan");
						next.player = player;
						next.target = target;
						next.setContent(lib.skill.twfuzuan.content);
					}
				},
			},
		},
	}
```

### twchongqi 名字:宠齐
描述: 锁定技。游戏开始时，你令所有角色获得〖非服〗。然后你可减1点体力上限，令一名其他角色获得〖复纂〗。
```js
twchongqi: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		logTarget: () => game.filterPlayer().sortBySeat(),
		content() {
			"step 0";
			game.filterPlayer()
				.sortBySeat()
				.forEach(function (current) {
					current.addSkills("twfeifu");
				});
			//game.log(player,'令所有其他角色获得了技能','#g【非服】')
			game.delayx();
			"step 1";
			player.chooseTarget("是否减1点体力上限，并令一名其他角色获得技能【复纂】？", lib.filter.notMe).set("ai", function (target) {
				var player = _status.event.player;
				if (player.hasUnknown() && !target.isZhu) {
					return 0;
				}
				if (player.getEnemies().includes(target)) {
					return 0;
				}
				return get.attitude(player, target);
			});
			"step 2";
			if (result.bool) {
				player.loseMaxHp();
				var target = result.targets[0];
				player.line(target, "fire");
				target.addSkills("twfuzuan");
				game.delayx();
			}
		},
		derivation: ["twfeifu", "twfuzuan"],
	}
```

### twfeifu 名字:非服
描述: 锁定技，转换技。阳：当你成为【杀】的唯一目标后；阴：当你使用【杀】指定唯一目标后；目标角色须交给使用者一张牌。若此牌为装备牌，则使用者可使用此牌。
```js
twfeifu: {
		audio: 2,
		trigger: {
			player: "useCardToPlayered",
			target: "useCardToTargeted",
		},
		zhuanhuanji: true,
		forced: true,
		mark: true,
		marktext: "☯",
		intro: {
			content(storage, player) {
				return (storage ? "当你使用【杀】指定唯一目标后" : "当你成为【杀】的唯一目标后") + "目标角色须交给使用者一张牌。若此牌为装备牌，则使用者可使用此牌。";
			},
		},
		filter(event, player, name) {
			return event.card.name == "sha" && event.targets.length == 1 && event.player.isIn() && event.target.countCards("he") > 0 && (name == "useCardToPlayered") == Boolean(player.storage.twfeifu);
		},
		logTarget(event, player) {
			return player.storage.twfeifu ? event.target : event.player;
		},
		content() {
			"step 0";
			player.changeZhuanhuanji("twfeifu");
			trigger.target.chooseCard("he", true, "非服：交给" + get.translation(trigger.player) + "一张牌", "若选择装备牌，则其可以使用此牌");
			"step 1";
			if (result.bool) {
				var card = result.cards[0];
				event.card = card;
				trigger.target.give(card, trigger.player);
			} else {
				event.finish();
			}
			"step 2";
			var target = trigger.player;
			if (target.getCards("h").includes(card) && get.type(card, null, target) == "equip" && target.hasUseTarget(card)) {
				target.chooseUseTarget(card, "nopopup");
			}
		},
	}
```

## tw_guohuai 名字:TW郭淮 势力:wei

### twjingce 名字:精策
描述: 当你于出牌阶段使用第X张牌结算完毕后，你可以摸两张牌（X为你的体力值）。若此阶段你此前已摸过牌或本回合造成过伤害，你获得一枚“策”标记。
```js
twjingce: {
		marktext: "策",
		intro: {
			name: "策",
			content: "mark",
		},
		audio: 2,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			var evt = event.getParent("phaseUse");
			if (!evt || evt.player != player) {
				return false;
			}
			var history = player.getHistory("useCard", function (evtx) {
				return evtx.getParent("phaseUse") == evt;
			});
			return history && history.indexOf(event) == player.hp - 1;
		},
		frequent: true,
		content() {
			"step 0";
			player.draw(2);
			"step 1";
			if (
				player.getHistory("sourceDamage").length ||
				player.getHistory("gain", function (evt) {
					return evt.getParent("phaseUse") == trigger.getParent("phaseUse") && evt.getParent().name == "draw";
				}).length > 1
			) {
				player.addMark("twjingce", 1);
			}
		},
	}
```

### yuzhang 名字:御嶂
描述: 你可以弃置一枚“策”标记，然后跳过一个阶段。当你受到伤害后，你可弃置一枚“策”标记，然后选择一项：⒈令伤害来源弃置两张牌；⒉令伤害来源本回合不能再使用或打出牌。
```js
yuzhang: {
		audio: 2,
		trigger: {
			player: "damageEnd",
		},
		filter(event, player) {
			return event.source && player.hasMark("twjingce");
		},
		direct: true,
		content() {
			"step 0";
			var choiceList = ["令" + get.translation(trigger.source) + "本回合不能再使用或打出牌"];
			if (trigger.source.countCards("he")) {
				choiceList.push("令" + get.translation(trigger.source) + "弃置两张牌");
			}
			player
				.chooseControl("cancel2")
				.set("prompt2", get.prompt2("yuzhang"))
				.set("choiceList", choiceList)
				.set("ai", function () {
					var player = _status.event.player,
						source = _status.event.source;
					if (get.attitude(player, source) >= 0) {
						return "cancel2";
					}
					if (source.hasSkillTag("noh") || source.hasSkillTag("noe") || source.countCards("h") >= 4) {
						return 0;
					}
					if (source.hp > 1 && source.countCards("he") > 1) {
						return 1;
					}
					return [0, 1].randomGet();
				})
				.set("source", trigger.source);
			"step 1";
			if (result.control != "cancel2") {
				player.logSkill("yuzhang", trigger.source);
				player.removeMark("twjingce", 1);
				if (result.index == 0) {
					trigger.source.addTempSkill("yuzhang_dontuse");
				} else {
					trigger.source.chooseToDiscard("he", 2, true);
				}
			}
		},
		group: "yuzhang_skip",
		subSkill: {
			skip: {
				audio: "yuzhang",
				trigger: {
					player: ["phaseZhunbeiBefore", "phaseJudgeBefore", "phaseDrawBefore", "phaseUseBefore", "phaseDiscardBefore", "phaseJieshuBefore"],
				},
				filter(event, player) {
					return player.hasMark("twjingce");
				},
				prompt2(event, player) {
					var str = "弃置一枚“策”并跳过";
					var list = lib.skill.yuzhang.subSkill.skip.trigger.player.slice();
					list = list.map(i => i.slice(0, -6));
					str += ["准备", "判定", "摸牌", "出牌", "弃牌", "结束"][list.indexOf(event.name)];
					str += "阶段";
					return str;
				},
				check(event, player) {
					if (event.name == "phaseDiscard") {
						return player.needsToDiscard();
					}
					if (event.name == "phaseJudge") {
						return player.countCards("j");
					}
					return false;
				},
				content() {
					player.removeMark("twjingce", 1);
					trigger.cancel();
				},
			},
			dontuse: {
				charlotte: true,
				mark: true,
				mod: {
					cardEnabled(card) {
						return false;
					},
					cardRespondable(card) {
						return false;
					},
					cardSavable(card) {
						return false;
					},
				},
				intro: {
					content: "不能使用或打出牌",
				},
			},
		},
		ai: {
			combo: "twjingce",
		},
	}
```

## tw_chengpu 名字:TW程普 势力:wu

### twlihuo 名字:疠火
描述: ①当你声明使用普【杀】后，你可以将此【杀】改为火【杀】。此牌使用结算结束后，若有角色因此【杀】造成的伤害进入过濒死状态，则你失去1点体力。②当你使用火【杀】选择目标后，你可为此牌增加一个目标。
```js
twlihuo: {
		trigger: { player: "useCard1" },
		filter(event, player) {
			if (event.card.name == "sha" && !game.hasNature(event.card)) {
				return true;
			}
			return false;
		},
		audio: "lihuo",
		prompt2(event) {
			return "将" + get.translation(event.card) + "改为火属性";
		},
		audioname: ["re_chengpu"],
		check(event, player) {
			return game.hasPlayer(function (current) {
				return !event.targets.includes(current) && player.canUse(event.card, current) && get.effect(current, { name: "sha", nature: "fire", cards: event.cards.slice(0) }, player, player) > 0;
			});
		},
		content() {
			game.setNature(trigger.card, "fire");
			trigger.card.twlihuo_buffed = true;
		},
		group: ["twlihuo2", "twlihuo3"],
		ai: {
			fireAttack: true,
		},
	}
```

### twchunlao 名字:醇醪
描述: ①准备阶段，若场上没有“醇”，则你可将一名角色区域内的一张牌置于其武将牌上，称为“醇”。②一名角色使用【杀】时，若其有“醇”，则其可以交给你一张牌，令此【杀】的伤害值基数+1。③一名角色进入濒死状态时，若其有“醇”，则你可以移去“醇”并摸一张牌，然后令其回复1点体力。
```js
twchunlao: {
		audio: "chunlao",
		trigger: { player: "phaseZhunbeiBegin" },
		direct: true,
		filter(event, player) {
			return (
				game.hasPlayer(function (current) {
					return current.countCards("hej") > 0;
				}) &&
				!game.hasPlayer(function (current) {
					return current.getExpansions("twchunlao").length > 0;
				})
			);
		},
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt("twchunlao"), "将一名角色区域内的一张牌作为“醇”置于其武将牌上", function (card, player, target) {
					return target.countCards("hej") > 0;
				})
				.set("ai", function (target) {
					return get.attitude(_status.event.player, target) * (player == target ? 1 : 2);
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("twchunlao", target);
				player.choosePlayerCard(target, "hej", true);
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				target.addToExpansion(result.cards, target, "give").gaintag.add("twchunlao");
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		group: ["twchunlao_sha", "twchunlao_dying"],
		subSkill: {
			sha: {
				trigger: { global: "useCard" },
				direct: true,
				filter(event, player) {
					return event.card.name == "sha" && event.player.countCards("he") > 0 && event.player.getExpansions("twchunlao").length > 0;
				},
				content() {
					"step 0";
					event.target = trigger.player;
					event.target
						.chooseCard("he", "醇醪：是否交给" + get.translation(player) + "一张牌，令" + get.translation(trigger.card) + "的伤害值基数+1？")
						.set("ai", function (card) {
							if (!_status.event.goon) {
								return 3.5 - get.value(card);
							}
							return 7 - get.value(card);
						})
						.set(
							"goon",
							(function () {
								if (get.attitude(target, player) < 0) {
									return false;
								}
								for (var target of trigger.targets) {
									if (
										!target.mayHaveShan(player, "use") ||
										trigger.player.hasSkillTag(
											"directHit_ai",
											true,
											{
												target: target,
												card: trigger.card,
											},
											true
										)
									) {
										if (
											get.attitude(player, target) < 0 &&
											!trigger.player.hasSkillTag("jueqing", false, target) &&
											!target.hasSkillTag("filterDamage", null, {
												player: trigger.player,
												card: trigger.card,
											})
										) {
											return true;
										}
									}
								}
								return false;
							})()
						);
					if (!event.target.isUnderControl(true) && !event.target.isOnline()) {
						game.delayx();
					}
					"step 1";
					if (result.bool) {
						target.logSkill("twchunlao", player);
						if (!target.hasSkill("twchunlao")) {
							game.trySkillAudio("twchunlao", player);
						}
						if (player != target) {
							target.give(result.cards, player, "giveAuto");
						}
						trigger.baseDamage++;
					}
				},
			},
			dying: {
				audio: "chunlao",
				trigger: { global: "dying" },
				logTarget: "player",
				filter(event, player) {
					return event.player.getExpansions("twchunlao").length > 0;
				},
				prompt2: (event, player) => "移去" + get.translation(event.player) + "武将牌上的“醇”并摸一张牌，然后令其回复1点体力",
				check(event, player) {
					return get.attitude(player, event.player) > 0;
				},
				content() {
					var target = trigger.player,
						cards = target.getExpansions("twchunlao");
					if (cards.length) {
						target.loseToDiscardpile(cards);
					}
					player.draw();
					target.recover();
				},
			},
		},
	}
```

## tw_zhangmancheng 名字:TW张曼成 势力:qun

### twfengji 名字:蜂集
描述: `出牌阶段开始时，若你没有“示”，则你可以将一张牌作为“示”置于武将牌上并${get.poptip("rule_shifa")}：从牌堆中获得X张与“示”牌名相同的牌，然后移去“示”。`
```js
twfengji: {
		audio: 2,
		mahouSkill: true,
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return !player.getExpansions("twfengji").length && !player.hasSkill("twfengji_mahou") && player.countCards("he");
		},
		direct: true,
		content() {
			"step 0";
			player.chooseCard("he", get.prompt2("twfengji")).set("ai", function (card) {
				var name = card.name,
					num = 0;
				for (var i = 0; i < ui.cardPile.childNodes.length; i++) {
					if (ui.cardPile.childNodes[i].name == name) {
						num++;
					}
				}
				if (num < 2) {
					return false;
				}
				return 8 - get.value(card);
			});
			"step 1";
			if (result.bool) {
				player.logSkill("twfengji");
				player.addToExpansion(result.cards, player, "giveAuto").gaintag.add("twfengji");
				player
					.chooseControl("1回合", "2回合", "3回合")
					.set("prompt", "请选择施法时长")
					.set("ai", function () {
						var player = _status.event.player;
						var safe = Math.min(player.getHandcardLimit(), player.countCards("h", "shan"));
						if (safe < Math.min(3, game.countPlayer())) {
							var next = player.next;
							while (next != player && get.attitude(next, player) > 0) {
								safe++;
								next = next.next;
							}
						}
						return Math.max(2, Math.min(safe, 3, game.countPlayer())) - 1;
					});
			} else {
				event.finish();
			}
			"step 2";
			player.storage.twfengji_mahou = [result.index + 1, result.index + 1];
			player.addTempSkill("twfengji_mahou", { player: "die" });
		},
		marktext: "示",
		onremove(player, skill) {
			var cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		subSkill: {
			mahou: {
				trigger: { global: "phaseEnd" },
				forced: true,
				popup: false,
				charlotte: true,
				content() {
					var list = player.storage.twfengji_mahou;
					list[1]--;
					if (list[1] == 0) {
						game.log(player, "的“蜂集”魔法生效");
						player.logSkill("twfengji");
						var cards = player.getExpansions("twfengji");
						if (cards.length) {
							var cards2 = [],
								num = list[0];
							for (var card of cards) {
								for (var i = 0; i < num; i++) {
									var card2 = get.cardPile2(function (cardx) {
										return cardx.name == card.name && !cards2.includes(cardx);
									});
									if (card2) {
										cards2.push(card2);
									} else {
										break;
									}
								}
							}
							game.delayx();
							if (cards2.length) {
								player.gain(cards2, "gain2");
							}
							player.loseToDiscardpile(cards);
						}
						player.removeSkill("twfengji_mahou");
					} else {
						game.log(player, "的“蜂集”魔法剩余", "#g" + list[1] + "回合");
						player.markSkill("twfengji_mahou");
					}
				},
				ai: { threaten: 2.5 },
				mark: true,
				onremove: true,
				//该图标为灵魂宝石
				marktext: "♗",
				intro: {
					name: "施法：蜂集",
					markcount(storage) {
						if (storage) {
							return storage[1];
						}
						return 0;
					},
					content(storage) {
						if (storage) {
							return "经过" + storage[1] + "个“回合结束时”后，若有“示”，则从牌堆中获得" + storage[0] + "张和“示”名称相同的牌";
						}
						return "未指定施法效果";
					},
				},
			},
		},
	}
```

### twyiju 名字:蚁聚
描述: 若你的武将牌上有“示”，则：①你使用【杀】的次数上限和攻击范围的基数改为你的体力值。②当你受到伤害时，你移去“示”，且令此伤害+1。
```js
twyiju: {
		audio: 2,
		locked: false,
		mod: {
			attackRangeBase(player, num) {
				if (player.getExpansions("twfengji").length) {
					return player.hp;
				}
			},
			cardUsable(card, player, num) {
				if (card.name == "sha" && player.getExpansions("twfengji").length) {
					return num - 1 + player.hp;
				}
			},
		},
		trigger: { player: "damageBegin3" },
		filter(event, player) {
			return player.getExpansions("twfengji").length > 0;
		},
		forced: true,
		content() {
			trigger.num++;
			var cards = player.getExpansions("twfengji");
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		ai: {
			halfneg: true,
			combo: "twfengji",
		},
	}
```

### twbudao 名字:布道
描述: 限定技。准备阶段，你可减1点体力上限，回复1点体力并选择获得一个〖布道〗技能池里的技能（三选一）。然后你可以令一名其他角色也获得此技能并交给你一张牌。
```js
twbudao: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		derivation: ["twzhouhu", "twharvestinori", "twzuhuo", "twzhouzu", "twhuangjin", "twguimen", "twdidao"],
		limited: true,
		skillAnimation: true,
		animationColor: "metal",
		check(event, player) {
			return !player.hasUnknown() || !player.hasFriend();
		},
		skillValue: {
			twzhouhu: target => (Math.random() < 0.6 ? 0.1 : 1),
			twzuhuo: (target, player) => (get.damageEffect(target, player, player) > 0 ? 0.1 : 1),
			twharvestinori: target => 0.9 + Math.random() / 5,
			twhuangjin: target => Math.random() / 5,
			twguimen: target => Math.sqrt(Math.min(3, target.countCards("he", { suit: "spade" }))) * 0.09,
			twzhouzu: target => {
				var rand = Math.random();
				if (rand < 0.8) {
					return 1 - Math.sqrt(0.8 - rand);
				}
				return 1;
			},
			twdidao: (target, player) => {
				if (
					[target, player].some(current =>
						current.getSkills().some(skill => {
							var info = get.info(skill);
							if (!info || !info.ai || !info.ai.rejudge) {
								return false;
							}
							return true;
						})
					)
				) {
					return 0.05;
				}
				return 0.85 + Math.random() / 5;
			},
		},
		content() {
			"step 0";
			player.awakenSkill(event.name);
			player.loseMaxHp();
			player.recover();
			var skills = lib.skill.twbudao.derivation,
				map = lib.skill.twbudao.skillValue;
			skills = skills.randomGets(3);
			var target = game.filterPlayer().sort((a, b) => get.attitude(player, b) - get.attitude(player, a))[0];
			if (player.identity == "nei" || get.attitude(player, target) < 6) {
				target = player;
			}
			player
				.chooseControl(skills)
				.set(
					"choiceList",
					skills.map(function (i) {
						return '<div class="skill">【' + get.translation(lib.translate[i + "_ab"] || get.translation(i).slice(0, 2)) + "】</div><div>" + get.skillInfoTranslation(i, player, false) + "</div>";
					})
				)
				.set("displayIndex", false)
				.set("prompt", "布道：选择获得一个技能")
				.set("ai", () => {
					return _status.event.choice;
				})
				.set("choice", skills.sort((a, b) => (map[b](target, player) || 0.5) - (map[a](target, player) || 0.5))[0]);
			"step 1";
			var skill = result.control;
			player.addSkills(skill);
			event.twbudao_skill = skill;
			player.chooseTarget(lib.filter.notMe, "是否令一名其他角色也获得【" + get.translation(skill) + "】？").set("ai", function (target) {
				var player = _status.event.player;
				if (player.identity == "nei") {
					return 0;
				}
				return get.attitude(player, target);
			});
			"step 2";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.line(target, "green");
				target.addSkills(event.twbudao_skill);
				var cards = target.getCards("he");
				if (!cards.length) {
					event.finish();
				} else if (cards.length == 1) {
					event._result = { bool: true, cards: cards };
				} else {
					target.chooseCard("he", true, "交给" + get.translation(player) + "一张牌作为学费");
				}
			} else {
				event.finish();
			}
			"step 3";
			if (result.bool) {
				target.give(result.cards, player);
			}
		},
	}
```

## tw_liuhong 名字:TW刘宏 势力:qun

### twyujue 名字:鬻爵
描述: ①其他角色的出牌阶段内，可以交给你任意张牌（每阶段上限为两张）。②当你于回合外获得其他角色的一张牌后，你可令其选择本回合内未选择过的一项：⒈弃置攻击范围内一名角色的一张牌。⒉下一次使用牌时，从牌堆中获得一张同类别的牌。
```js
twyujue: {
		audio: 2,
		global: "twyujue_give",
		trigger: {
			player: "gainAfter",
			global: "loseAsyncAfter",
		},
		direct: true,
		filter(event, player) {
			if (player == _status.currentPhase) {
				return false;
			}
			var cards = event.getg(player);
			if (!cards.length) {
				return false;
			}
			return game.hasPlayer(function (current) {
				if (current == player) {
					return false;
				}
				var evt = event.getl(current);
				if (!evt || !evt.cards2 || !evt.cards2.filter(card => cards.includes(card)).length) {
					return false;
				}
				return !current.hasSkill("twyujue_effect0") || !current.hasSkill("twyujue_effect1");
			});
		},
		content() {
			"step 0";
			var cards = trigger.getg(player);
			var list = game
				.filterPlayer(function (current) {
					if (current == player) {
						return false;
					}
					var evt = trigger.getl(current);
					if (!evt || !evt.cards2 || !evt.cards2.filter(card => cards.includes(card)).length) {
						return false;
					}
					return !current.hasSkill("twyujue_effect0") || !current.hasSkill("twyujue_effect1");
				})
				.sortBySeat();
			event.targets = list;
			"step 1";
			var target = event.targets.shift();
			if (target.isIn()) {
				event.target = target;
				var num = 2;
				if (target.hasSkill("twyujue_effect0")) {
					num--;
				}
				if (target.hasSkill("twyujue_effect1")) {
					num--;
				}
				var cards = trigger.getg(player);
				num = Math.min(num, trigger.getl(target).cards2.filter(i => cards.includes(i)).length);
				if (num > 0) {
					event.count = num;
				} else if (targets.length > 0) {
					event.redo();
				} else {
					event.finish();
				}
			} else if (targets.length > 0) {
				event.redo();
			} else {
				event.finish();
			}
			"step 2";
			event.count--;
			player.chooseBool(get.prompt("twyujue", target), "可令其选择本回合内未选择过的一项：⒈弃置攻击范围内一名角色的一张牌。⒉下一次使用牌时，从牌堆中获得一张同类别的牌。").set("ai", function () {
				var evt = _status.event.getParent();
				return get.attitude(evt.player, evt.target) > 0;
			});
			"step 3";
			if (result.bool) {
				player.logSkill("twyujue", target);
				var list = [0, 1];
				if (target.hasSkill("twyujue_effect0")) {
					list.remove(0);
				}
				if (target.hasSkill("twyujue_effect1")) {
					list.remove(1);
				}
				if (!list.length) {
					event.goto(6);
				} else if (list.length == 1) {
					event._result = { index: list[0] };
				} else {
					target
						.chooseControl()
						.set("choiceList", ["弃置攻击范围内一名角色的一张牌", "下一次使用牌时，从牌堆中获得一张同类别的牌"])
						.set("ai", function () {
							var player = _status.event.player;
							if (
								game.hasPlayer(function (current) {
									return player.inRange(current) && current.countDiscardableCards(player, "he") > 0 && get.effect(current, { name: "guohe_copy2" }, player, player) > 0;
								})
							) {
								return 0;
							}
							return 1;
						});
				}
			} else {
				event.goto(6);
			}
			"step 4";
			target.addTempSkill("twyujue_effect" + result.index);
			if (result.index == 0) {
				if (
					game.hasPlayer(function (current) {
						return target.inRange(current) && current.countDiscardableCards(target, "he") > 0;
					})
				) {
					target
						.chooseTarget("弃置攻击范围内一名角色的一张牌", true, function (card, player, target) {
							return player.inRange(target) && target.countDiscardableCards(player, "he") > 0;
						})
						.set("ai", function (target) {
							var player = _status.event.player;
							return get.effect(target, { name: "guohe_copy2" }, player, player);
						});
				} else {
					event.goto(6);
				}
			} else {
				event.goto(6);
			}
			"step 5";
			if (result.bool) {
				var target2 = result.targets[0];
				target.line(target2, "green");
				target.discardPlayerCard(target2, "he", true);
			}
			"step 6";
			game.delayx();
			if (event.count > 0) {
				event.goto(2);
			} else if (targets.length) {
				event.goto(1);
			}
		},
		subSkill: {
			clear: {
				onremove: true,
			},
			effect0: { charlotte: true },
			effect1: {
				charlotte: true,
				trigger: { player: "useCard" },
				usable: 1,
				forced: true,
				popup: false,
				content() {
					player.unmarkSkill("twyujue_effect1");
					var type2 = get.type2(trigger.card, false);
					var card = get.cardPile2(function (card) {
						return get.type2(card, false) == type2;
					});
					if (card) {
						trigger.player.gain(card, "gain2");
					}
				},
				mark: true,
				marktext: "爵",
				intro: { content: "使用下一张牌时，从牌堆中获得一张类型相同的牌" },
			},
		},
	}
```

### twgezhi 名字:革制
描述: ①当你于出牌阶段内首次使用某种类别的牌时，你可以重铸一张手牌。②出牌阶段结束时，若你本阶段内因〖革制①〗失去过至少两张牌，则你可以令一名角色选择获得一个其未获得过的效果：⒈攻击范围+2；⒉手牌上限+2；⒊加1点体力上限。
```js
twgezhi: {
		audio: 2,
		trigger: { player: "useCard" },
		direct: true,
		filter(event, player) {
			if (!player.countCards("h")) {
				return false;
			}
			var evt = event.getParent("phaseUse");
			if (!evt || evt.player != player) {
				return false;
			}
			var type = get.type2(event.card, false);
			return !player.hasHistory(
				"useCard",
				function (evtx) {
					return evtx != event && get.type2(evtx.card, false) == type && evtx.getParent("phaseUse") == evt;
				},
				event
			);
		},
		content() {
			"step 0";
			if (!event.isMine() && !event.isOnline()) {
				game.delayx();
			}
			player.chooseCard("是否发动【革制】重铸一张牌？", lib.filter.cardRecastable).set("ai", function (card) {
				return 5.5 - get.value(card);
			});
			"step 1";
			if (result.bool) {
				player.logSkill("twgezhi");
				player.recast(result.cards);
			}
		},
		group: "twgezhi_buff",
		subSkill: {
			buff: {
				audio: "twgezhi",
				trigger: { player: "phaseUseEnd" },
				direct: true,
				filter(event, player) {
					return (
						player.getHistory("lose", function (evt) {
							return evt.getParent(3).name == "twgezhi" && evt.getParent("phaseUse") == event;
						}).length > 1
					);
				},
				content() {
					"step 0";
					player
						.chooseTarget(get.prompt("twgezhi"), "你可以令一名角色选择获得一个其未获得过的效果：⒈攻击范围+2；⒉手牌上限+2；⒊加1点体力上限。", function (card, player, target) {
							return !target.hasSkill("twgezhi_选项一") || !target.hasSkill("twgezhi_选项二") || !target.hasSkill("twgezhi_选项三");
						})
						.set("ai", function (target) {
							return get.attitude(_status.event.player, target);
						});
					"step 1";
					if (result.bool) {
						var target = result.targets[0];
						event.target = target;
						player.logSkill("twgezhi", target);
						var list = [];
						for (var i = 1; i <= 3; i++) {
							var str = "选项" + get.cnNumber(i, true);
							if (!target.hasSkill("twgezhi_" + str)) {
								list.push(str);
							}
						}
						if (list.length == 1) {
							event._result = { control: list[0] };
						} else {
							target
								.chooseControl(list)
								.set("choiceList", ["令自己的攻击范围+2", "令自己的手牌上限+2", "令自己的体力上限+1"])
								.set("ai", function () {
									var player = _status.event.player,
										controls = _status.event.controls;
									if (
										controls.includes("选项一") &&
										game.hasPlayer(function (current) {
											return (get.realAttitude || get.attitude)(player, current) < 0 && get.distance(player, current, "attack") > 1;
										})
									) {
										return "选项一";
									}
									if (controls.includes("选项二") && player.needsToDiscard()) {
										return "选项二";
									}
									if (controls.includes("选项三")) {
										return "选项三";
									}
									return controls.randomGet();
								});
						}
					} else {
						event._triggered = null;
						event.finish();
					}
					"step 2";
					target.addSkill("twgezhi_" + result.control);
					if (result.control == "选项三") {
						target.gainMaxHp();
					}
					"step 3";
					game.delayx();
				},
			},
			选项一: {
				charlotte: true,
				mod: {
					attackFrom(from, to, distance) {
						return distance - 2;
					},
				},
				mark: true,
				marktext: " +2 ",
				intro: { content: "攻击范围+2" },
			},
			选项二: {
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						return num + 2;
					},
				},
				mark: true,
				marktext: " +2 ",
				intro: { content: "手牌上限+2" },
			},
			选项三: {
				charlotte: true,
				mark: true,
				marktext: " +1 ",
				intro: { content: "体力上限+1" },
			},
		},
	}
```

### twfengqi 名字:烽起
描述: 主公技，锁定技。①其他群势力角色发动〖鬻爵①〗时，将每阶段上限改为四张。②以其他角色为目标的〖革制②〗结算结束后，目标角色可以获得其武将牌上的主公技。
```js
twfengqi: {
		locked: true,
		zhuSkill: true,
		trigger: { player: "twgezhi_buffAfter" },
		direct: true,
		filter(event, player) {
			if (!event.target || !event.target.isIn() || !player.hasZhuSkill("twfengqi", event.target)) {
				return false;
			}
			var target = event.target;
			return target.getStockSkills(true, true).some(skill => {
				if (target.hasSkill(skill)) {
					return false;
				}
				var info = get.info(skill);
				return info && info.zhuSkill;
			});
		},
		skillAnimation: true,
		animationColor: "thunder",
		content() {
			"step 0";
			event.target = trigger.target;
			event.target.chooseBool(get.prompt("twfengqi"), "获得武将牌上的所有主公技");
			"step 1";
			if (result.bool) {
				target.logSkill("twfengqi", player);
				var skills = target.getStockSkills(true, true).filter(skill => {
					if (target.hasSkill(skill)) {
						return false;
					}
					var info = get.info(skill);
					return info && info.zhuSkill;
				});
				target.addSkills(skills);
				//for(var i of skills) target.addSkillLog(i);
			}
		},
		ai: {
			combo: "twyujue",
		},
	}
```

## tw_huojun 名字:TW霍峻 势力:shu

### twsidai 名字:伺怠
描述: 限定技。出牌阶段，你可以将手牌区内的所有基本牌当做【杀】使用（无距离和次数限制）。若此牌对应的实体牌中：包含【闪】，则目标角色成为此牌的目标后，需弃置一张基本牌，否则不可响应此牌；包含【桃】，则当目标角色受到此牌的伤害后，其减1点体力上限；包含【酒】，则当目标角色受到此牌的伤害时，此伤害×2。
```js
twsidai: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		locked: false,
		limited: true,
		skillAnimation: true,
		animationColor: "fire",
		filter(event, player) {
			var cards = player.getCards("h", { type: "basic" });
			if (!cards.length) {
				return false;
			}
			for (var i of cards) {
				if (!game.checkMod(i, player, "unchanged", "cardEnabled2", player)) {
					return false;
				}
			}
			return event.filterCard(get.autoViewAs({ name: "sha", storage: { twsidai: true } }, cards), player, event);
		},
		viewAs: { name: "sha", storage: { twsidai: true } },
		filterCard: { type: "basic" },
		selectCard: -1,
		check: () => 1,
		onuse(result, player) {
			player.awakenSkill("twsidai");
			player.addTempSkill("twsidai_effect");
		},
		ai: {
			order: 2.9,
			result: {
				target(player, target) {
					if (get.attitude(player, target) >= 0) {
						return -20;
					}
					var cards = ui.selected.cards.slice(0);
					var names = [];
					for (var i of cards) {
						names.add(i.name);
					}
					if (names.length < player.hp) {
						return 0;
					}
					if (player.hasUnknown() && (player.identity != "fan" || !target.isZhu)) {
						return 0;
					}
					return lib.card.sha.ai.result.target.apply(this, arguments);
				},
			},
		},
		mod: {
			cardUsable(card) {
				if (card.storage && card.storage.twsidai) {
					return Infinity;
				}
			},
			targetInRange(card) {
				if (card.storage && card.storage.twsidai) {
					return true;
				}
			},
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { source: "damageBegin1" },
				filter(event, player) {
					if (!event.card || !event.card.storage || !event.card.storage.twsidai || event.getParent().type != "card") {
						return false;
					}
					for (var i of event.cards) {
						if (i.name == "jiu") {
							return true;
						}
					}
					return false;
				},
				forced: true,
				popup: false,
				content() {
					trigger.num *= 2;
					game.log(trigger.card, "的伤害值", "#y×2");
				},
				group: ["twsidai_tao", "twsidai_shan"],
			},
			tao: {
				trigger: { source: "damageSource" },
				filter(event, player) {
					if (!event.card || !event.card.storage || !event.card.storage.twsidai || !event.player.isIn()) {
						return false;
					}
					for (var i of event.cards) {
						if (i.name == "tao") {
							return true;
						}
					}
					return false;
				},
				forced: true,
				popup: false,
				content() {
					trigger.player.loseMaxHp();
				},
			},
			shan: {
				trigger: { player: "useCardToPlayered" },
				filter(event, player) {
					if (!event.card || !event.card.storage || !event.card.storage.twsidai || !event.target.isIn()) {
						return false;
					}
					for (var i of event.cards) {
						if (i.name == "shan") {
							return true;
						}
					}
					return false;
				},
				forced: true,
				popup: false,
				content() {
					"step 0";
					trigger.target.chooseToDiscard("h", { type: "basic" }, "弃置一张基本牌，否则不能响应" + get.translation(trigger.card)).set("ai", function (card) {
						var player = _status.event.player;
						if (
							player.hasCard("hs", function (cardx) {
								return cardx != card && get.name(cardx, player) == "shan";
							})
						) {
							return 12 - get.value(card);
						}
						return 0;
					});
					"step 1";
					if (!result.bool) {
						trigger.directHit.add(trigger.target);
					}
				},
			},
		},
	}
```

### twjieyu 名字:竭御
描述: 每轮限一次。结束阶段开始时，或当你于一轮内第一次受到伤害后，你可以弃置所有手牌，然后从弃牌堆中获得不同牌名的基本牌各一张。
```js
twjieyu: {
		audio: 2,
		trigger: { player: ["phaseJieshuBegin", "damageEnd"] },
		round: 1,
		filter(event, player) {
			if (event.name != "phaseJieshu") {
				var history = player.getHistory("damage");
				for (var i of history) {
					if (i == event) {
						break;
					}
					return false;
				}
				var all = player.actionHistory;
				for (var i = all.length - 2; i >= 0; i--) {
					if (all[i].damage.length) {
						return false;
					}
					if (all[i].isRound) {
						break;
					}
				}
			}
			return (
				player.countCards("h") > 0 &&
				!player.hasCard(function (card) {
					return !lib.filter.cardDiscardable(card, player, "twjieyu");
				}, "h")
			);
		},
		check(event, player) {
			var cards = [],
				names = [];
			for (var i = 0; i < ui.discardPile.childNodes.length; i++) {
				var card = ui.discardPile.childNodes[i];
				if (get.type(card, null, false) == "basic" && !names.includes(card.name)) {
					cards.push(card);
					names.push(card.name);
				}
			}
			if (!names.includes("shan") || !names.includes("tao")) {
				return false;
			}
			if (player.countCards("h", "shan") < 2 && player.countCards("h", "tao") < 1) {
				return true;
			}
			return false;
		},
		content() {
			"step 0";
			player.discard(player.getCards("h"));
			"step 1";
			var cards = [],
				names = [];
			for (var i = 0; i < ui.discardPile.childNodes.length; i++) {
				var card = ui.discardPile.childNodes[i];
				if (get.type(card, null, false) == "basic" && !names.includes(card.name)) {
					cards.push(card);
					names.push(card.name);
				}
			}
			if (cards.length) {
				player.gain(cards, "gain2");
			}
		},
	}
```

## tw_zangba 名字:TW臧霸 势力:wei

### twhanyu 名字:捍御
描述: 锁定技。游戏开始时，你获得牌堆中的基本牌，锦囊牌，装备牌各一张。
```js
twhanyu: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		content() {
			var cards = [],
				types = ["basic", "trick", "equip"];
			for (var i of types) {
				var card = get.cardPile2(function (card) {
					return get.type2(card, false) == i;
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

### twhengjiang 名字:横江
描述: 出牌阶段限一次，当你使用基本牌或普通锦囊牌指定唯一目标后，你可将此牌的目标改为攻击范围内的所有合法目标，然后你于此牌结算结束后摸X张牌（X为因响应此牌而使用或打出过牌的角色数）。
```js
twhengjiang: {
		audio: "hengjiang",
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			return (
				!player.hasSkill("twhengjiang2") &&
				event.targets.length == 1 &&
				["basic", "trick"].includes(get.type(event.card, null, false)) &&
				player.isPhaseUsing() &&
				game.hasPlayer(function (current) {
					return player.inRange(current) && lib.filter.targetEnabled2(event.card, player, current);
				})
			);
		},
		prompt: "是否发动【横江】？",
		prompt2(event, player) {
			return "将" + get.translation(event.card) + "的目标改为" + get.translation(lib.skill.twhengjiang.logTarget(event, player));
		},
		logTarget(event, player) {
			return game
				.filterPlayer(function (current) {
					return player.inRange(current) && lib.filter.targetEnabled2(event.card, player, current);
				})
				.sortBySeat();
		},
		check(event, player) {
			var effect1 = get.effect(event.target, event.card, player, player);
			var effect2 = 0,
				targets = lib.skill.twhengjiang.logTarget(event, player);
			for (var i of targets) {
				effect2 += get.effect(i, event.card, player, player);
			}
			return effect2 > effect1;
		},
		content() {
			var targets = lib.skill.twhengjiang.logTarget(trigger, player);
			trigger.targets.length = 0;
			trigger.targets.addArray(targets);
			trigger.getParent().triggeredTargets1.length = 0;
			trigger.getParent().twhengjiang_buffed = true;
			player.addTempSkill("twhengjiang2", "phaseUseAfter");
		},
	}
```

## tw_re_caohong 名字:TW曹洪 势力:wei

### twyuanhu 名字:援护
描述: 出牌阶段限一次。你可将一张装备牌置入一名角色的装备区内。若此牌为：武器牌，你弃置与其距离为1的另一名角色区域的一张牌；防具牌，其摸一张牌；坐骑牌或宝物牌，其回复1点体力。然后若其体力值或手牌数不大于你，则你摸一张牌，且你可以于本回合的结束阶段发动一次〖援护〗。
```js
twyuanhu: {
		audio: "yuanhu",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasCard({ type: "equip" }, "eh");
		},
		filterCard: { type: "equip" },
		filterTarget(card, player, target) {
			var card = ui.selected.cards[0];
			return target.canEquip(card);
		},
		discard: false,
		lose: false,
		prepare: "give",
		position: "he",
		check(card) {
			if (get.position(card) == "h") {
				return 9 - get.value(card);
			}
			return 7 - get.value(card);
		},
		logAudio(event, player) {
			const num = Math.min(get.equipNum(event.cards[0]), 3);
			return "yuanhu" + num + ".mp3";
		},
		async content(event, trigger, player) {
			const {
				target,
				cards: [card],
			} = event;
			await target.equip(card);
			switch (get.subtype(card)) {
				case "equip1":
					if (
						game.hasPlayer(function (current) {
							return current != target && get.distance(target, current) == 1 && current.countCards("hej") > 0;
						})
					) {
						const result = await player
							.chooseTarget(true, "弃置一名距离" + get.translation(target) + "为1的角色区域内的一张牌", function (card, player, target) {
								var current = _status.event.current;
								return current != target && get.distance(current, target) == 1 && current.countCards("hej") > 0;
							})
							.set("current", target)
							.set("ai", function (target) {
								var player = _status.event.player;
								return get.effect(target, { name: "guohe_copy" }, player, player);
							})
							.forResult();
						if (result?.bool) {
							const targetx = result.targets[0];
							player.line(targetx);
							await player.discardPlayerCard(targetx, true, "hej");
						}
					}
					break;
				case "equip2":
					await target.draw();
					break;
				case "equip3":
				case "equip4":
				case "equip5":
				case "equip6":
					await target.recover();
					break;
			}
			if (target.hp <= player.hp || target.countCards("h") <= player.countCards("h")) {
				await player.draw();
				player.addTempSkill("twyuanhu_end");
			}
		},
		ai: {
			order: 10,
			result: {
				player(player, target) {
					if (get.attitude(player, target) == 0) {
						return 0;
					}
					if (!ui.selected.cards.length) {
						return;
					}
					var eff = get.effect(target, ui.selected.cards[0], player, player),
						sub = get.subtype(ui.selected.cards[0], false);
					if (target == player) {
						eff += 4;
					} else {
						var hp = player.hp,
							hs = player.countCards("h", card => card != ui.selected.cards[0]);
						var tp = target.hp,
							ts = target.countCards("h");
						if (sub == "equip2") {
							ts++;
						}
						if (tp < target.maxHp && (sub == "equip3" || sub == "equip4" || sub == "equip5" || sub == "equip6")) {
							tp++;
						}
						if (tp <= hp || ts <= hs) {
							eff += 2;
						}
					}
					if (sub == "equip1") {
						var list = game
							.filterPlayer(function (current) {
								return current != target && get.distance(target, current) == 1 && current.countCards("hej") < 0;
							})
							.map(function (i) {
								return get.effect(i, { name: "guohe_copy" }, player, player);
							})
							.sort((a, b) => b - a);
						if (list.length) {
							eff += list[0];
						}
					}
					return eff;
				},
				target(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					var sub = get.subtype(ui.selected.cards[0], false);
					var eff = get.effect(target, ui.selected.cards[0], player, target);
					if (sub == "equip2") {
						eff += get.effect(target, { name: "draw" }, target, target);
					}
					if (target.isDamaged() && (sub == "equip3" || sub == "equip4" || sub == "equip5" || sub == "equip6")) {
						eff += get.recoverEffect(target, player, player);
					}
					return eff;
				},
			},
		},
		subSkill: {
			end: {
				trigger: { player: "phaseJieshuBegin" },
				charlotte: true,
				filter(event, player) {
					return player.hasSkill("twyuanhu") && player.hasCard({ type: "equip" }, "eh");
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseCardTarget({
							prompt: get.prompt("twyuanhu"),
							prompt2: "将一张装备牌置入一名角色的装备区内。若此牌为：武器牌，你弃置与其距离为1的另一名角色区域的一张牌；防具牌，其摸一张牌；坐骑牌，其回复1点体力；宝物牌，你选择基本牌或普通锦囊牌从牌堆中获得一张，其获得另一类型的一张牌。然后若其体力值或手牌数不大于你，则你可摸一张牌。",
							filterCard: lib.skill.twyuanhu.filterCard,
							filterTarget: lib.skill.twyuanhu.filterTarget,
							position: "he",
							ai1: lib.skill.twyuanhu.check,
							ai2(target) {
								var player = _status.event.player;
								return get.effect(target, "twyuanhu", player, player);
							},
						})
						.forResult();
					event.result.skill_popup = false;
				},
				async content(event, trigger, player) {
					const { cards, targets } = event;
					const result = {
						cards: cards,
						targets: targets,
						skill: "twyuanhu",
					};
					await player.useResult(result, event);
				},
			},
		},
	}
```

### twjuezhu 名字:决助
描述: `限定技。准备阶段，你可废除一个坐骑栏，令一名角色获得${get.poptip("feiying")}并废除判定区。该角色死亡后，你恢复以此法废除的装备栏。`
```js
twjuezhu: {
		audio: 2,
		limited: true,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.hasEnabledSlot(3) || player.hasEnabledSlot(4);
		},
		skillAnimation: true,
		animationColor: "water",
		async cost(event, trigger, player) {
			let list = [3, 4].filter(num => player.hasEmptySlot(num)).map(num => `equip${num}`);
			if (list.length > 1) {
				const prompt = `###${get.prompt(event.skill)}###废除一个装备栏并选择一名角色，令其获得〖飞影〗并废除判定区`;
				const { bool, targets, links } = await player
					.chooseButtonTarget({
						createDialog: [prompt, [list.map(i => [i, get.translation(i)]), "tdnodes"]],
						filterTarget(card, player, target) {
							return !target.hasSkill("feiying");
						},
						ai1(button) {
							return Math.random();
						},
						ai2(target) {
							if (player.hasUnknown()) {
								return 0;
							}
							return get.attitude(player, target);
						},
					})
					.forResult();
				if (bool) {
					event.result = {
						bool: true,
						targets: targets,
						cost_data: links[0],
					};
				}
			} else {
				const prompt = `###${get.prompt(event.skill)}###废除${get.translation(list[0])}栏并选择一名角色，令其获得〖飞影〗并废除判定区`;
				event.result = await player
					.chooseTarget(prompt, [1, 2], function (card, player, target) {
						return !ui.selected.targets.length && !target.hasSkill("feiying");
					})
					.set("multitarget", true)
					.set("promptbar", "none")
					.set("ai", function (target) {
						if (player.hasUnknown()) {
							return 0;
						}
						return get.attitude(player, target);
					})
					.forResult();
				event.result.cost_data = list[0];
			}
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cost_data: equip,
			} = event;
			player.awakenSkill(event.name);
			await player.disableEquip(equip);
			await target.disableJudge();
			player.addSkill(`${event.name}_restore`);
			player.markAuto(`${event.name}_restore`, [[target, equip]]);
			target.addSkills("feiying");
		},
		subSkill: {
			restore: {
				audio: "twjuezhu",
				trigger: { global: "die" },
				forced: true,
				charlotte: true,
				filter(event, player) {
					for (let i of player.getStorage("twjuezhu_restore")) {
						if (i[0] == event.player && player.hasDisabledSlot(i[1])) {
							return true;
						}
					}
					return false;
				},
				async content(event, trigger, player) {
					let list = [];
					for (let i of player.getStorage("twjuezhu_restore")) {
						if (i[0] == trigger.player && player.hasDisabledSlot(i[1])) {
							list.push(i[1]);
						}
					}
					await player.enableEquip(list);
				},
			},
		},
		derivation: "feiying",
	}
```

## tw_mayunlu 名字:TW马云騄 势力:shu

### mashu
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twfengpo 名字:凤魄
描述: ①当你使用【杀】或【决斗】指定唯一目标后，你可观看目标角色的手牌并选择一项：⒈摸X张牌。⒉令此牌的伤害值基数+X（X为其手牌中的♦数）。②当你杀死一名角色后，你将〖凤魄①〗中的“♦数”改为“红色牌数”。
```js
twfengpo: {
		audio: "fengpo",
		trigger: { player: "useCardToPlayered" },
		logTarget: "target",
		filter(event, player) {
			return (event.card.name == "sha" || event.card.name == "juedou") && event.targets.length == 1 && event.target.countCards("h") > 0;
		},
		onremove: true,
		content() {
			"step 0";
			event.target = trigger.target;
			player.viewHandcards(trigger.target);
			"step 1";
			var num = target.countCards("h", player.storage.twfengpo ? { color: "red" } : { suit: "diamond" });
			if (!num) {
				event.finish();
				return;
			}
			event.num = num;
			player.chooseControl().set("choiceList", ["摸" + num + "张牌", "令" + get.translation(trigger.card) + "的伤害值基数+" + num]);
			"step 2";
			if (result.index == 0) {
				player.draw(num);
			} else {
				trigger.getParent().baseDamage += num;
			}
		},
		group: "twfengpo_kill",
		subSkill: {
			kill: {
				audio: "fengpo",
				trigger: { source: "die" },
				forced: true,
				filter: (event, player) => !player.storage.twfengpo,
				skillAnimation: true,
				animationColor: "fire",
				content() {
					player.storage.twfengpo = true;
					player.popup("凤魄");
					game.log(player, "恢复了技能", "#g【凤魄】");
				},
			},
		},
	}
```

## tw_hejin 名字:TW何进 势力:qun

### twmouzhu 名字:谋诛
描述: 出牌阶段限一次，你可以选择一名其他角色A。你令除A外所有体力值小于等于你的其他角色依次选择是否交给你一张牌。若你以此法得到的牌数X：等于0，你和所有进行选择的角色依次失去1点体力。大于0，你令A选择由你视为对其使用一张伤害值基数为X的【杀】或【决斗】。
```js
twmouzhu: {
		audio: "mouzhu",
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		async contentBefore(event, trigger, player) {
			const target = event.targets[0],
				evt = event.getParent();
			evt._target = target;
			evt.given_map = new Map();
			const list = game.filterPlayer(function (current) {
				return current != player && current != target && current.hp <= player.hp;
			});
			if (!list.length) {
				await player.loseHp();
				evt.finish();
			} else {
				evt.targets = list.sortBySeat();
				player.line(list);
			}
		},
		async content(event, trigger, player) {
			const target = event.target;
			if (!player.isIn() || !target.countGainableCards(player, "h")) {
				return;
			}
			const result = await target
				.chooseToGive(player, "h")
				.set("ai", card => {
					const { player, target } = get.event();
					const att = get.attitude(player, target);
					if (att > 0) {
						return 7 - get.value(card);
					}
					return 0;
				})
				.forResult();
			if (!result?.bool || !result.cards?.length) {
				game.log(target, "拒绝给牌");
			} else {
				target.addExpose(0.1);
				event.getParent().given_map ??= new Map();
				event.getParent().given_map.set(target, result.cards);
			}
		},
		async contentAfter(event, trigger, player) {
			event.getParent().given_map ??= new Map();
			let num = Array.from(event.getParent().given_map.values()).flat().length;
			if (!num) {
				await player.loseHp();
				await game.doAsyncInOrder(event.targets, async target => {
					await target.loseHp();
				});
			} else {
				const target = event.getParent()._target;
				let list = ["sha", "juedou"].filter(name => player.canUse(get.autoViewAs({ name }, []), target, false)),
					result;
				if (!list.length) {
					return;
				} else if (list.length == 1) {
					result = { control: list[0] };
				} else {
					result = await target
						.chooseControl(list)
						.set("prompt", "谋诛：视为被" + get.translation(player) + "使用一张…")
						.set("prompt2", "（伤害值基数：" + num + "）")
						.set("ai", function (event, target) {
							const player = event.player;
							if (target.hasShan() || get.effect(target, { name: "sha" }, player, target) > 0) {
								return "sha";
							}
							if (get.effect(target, { name: "juedou" }, player, target) > 0) {
								return "juedou";
							}
							return "sha";
						})
						.forResult();
				}
				if (result?.control && lib.card[result.control]) {
					await player
						.useCard(
							{
								name: result.control,
								isCard: true,
							},
							false,
							target
						)
						.set("baseDamage", num);
				}
			}
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					if (get.attitude(player, target) >= 0) {
						return 0;
					}
					var list = game.filterPlayer(function (current) {
						return current != player && current != target && current.hp <= player.hp;
					});
					if (!list.length) {
						return 0;
					}
					return (
						-Math.min(-get.effect(target, { name: "sha" }, player, target), -get.effect(target, { name: "juedou" }, player, target)) *
						list.reduce(function (num, current) {
							return num + (2 + get.sgn(get.attitude(current, player)));
						}, 0)
					);
				},
			},
		},
	}
```

### twyanhuo 名字:延祸
描述: 当你死亡时，你可以选择一项：①令一名其他角色弃置X张牌。②令X名其他角色依次弃置一张牌。（X为你的牌数）
```js
twyanhuo: {
		audio: "yanhuo",
		trigger: { player: "die" },
		direct: true,
		forceDie: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			return (
				player.countCards("he") > 0 &&
				game.hasPlayer(function (current) {
					return current != player && current.countCards("h") > 0;
				})
			);
		},
		content() {
			"step 0";
			var num = player.countCards("he"),
				str = get.cnNumber(num);
			event.num1 = num;
			event.num2 = 1;
			var list = ["令一名其他角色弃置" + str + "张牌"];
			if (num > 1) {
				list.push("令至多" + str + "名其他角色各弃置一张牌");
			}
			player.chooseControl("cancel2").set("choiceList", list).set("prompt", get.prompt("twyanhuo")).set("forceDie", true);
			"step 1";
			if (result.control != "cancel2") {
				if (result.index == 0) {
					event.num2 = event.num1;
					event.num1 = 1;
				}
				player
					.chooseTarget([1, event.num1], true, "请选择【延祸】的目标", function (card, player, target) {
						return target != player && target.countCards("he") > 0;
					})
					.set("forceDie", true)
					.set("ai", function (target) {
						return -get.attitude(_status.event.player, target);
					});
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				var targets = result.targets.sortBySeat();
				player.logSkill("twyanhuo", targets);
				for (var i of targets) {
					i.chooseToDiscard(true, "he", event.num2);
				}
			}
		},
	}
```

## tw_hucheer 名字:TW胡车儿 势力:qun

### twshenxing 名字:神行
描述: 锁定技。若你的装备区内没有坐骑牌，则你至其他角色的距离-1且手牌上限+1。
```js
twshenxing: {
		mod: {
			globalFrom(player, target, distance) {
				var es = player.getCards("e", function (card) {
					return !ui.selected.cards.includes(card);
				});
				for (var i of es) {
					var type = get.subtype(i);
					if (type == "equip3" || type == "equip4" || type == "equip6") {
						return distance;
					}
				}
				return distance - 1;
			},
			maxHandcard(player, distance) {
				var es = player.getCards("e", function (card) {
					return !ui.selected.cards.includes(card);
				});
				for (var i of es) {
					var type = get.subtype(i);
					if (type == "equip3" || type == "equip4" || type == "equip6") {
						return distance;
					}
				}
				return distance + 1;
			},
		},
	}
```

### twdaoji 名字:盗戟
描述: 出牌阶段限一次，你可以弃置一张非基本牌并选择一名攻击范围内的角色，获得其一张牌。若你以此法得到的牌为：基本牌，你摸一张牌；装备牌，你使用此牌并对其造成1点伤害。
```js
twdaoji: {
		audio: "daoji",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasCard(lib.skill.twdaoji.filterCard, "he");
		},
		filterCard(card) {
			return get.type(card) != "basic";
		},
		position: "he",
		filterTarget(card, player, target) {
			return target != player && player.inRange(target) && target.hasCard(card => lib.filter.canBeGained(card, target, player), "he");
		},
		check(card) {
			return 8 - get.value(card);
		},
		content() {
			"step 0";
			player.gainPlayerCard(target, "he", true);
			"step 1";
			if (result.bool && result.cards && result.cards.length == 1) {
				var card = result.cards[0];
				if (player.getCards("h").includes(card)) {
					var type = get.type(card);
					if (type == "basic") {
						player.draw();
					} else if (type == "equip") {
						if (player.hasUseTarget(card)) {
							player.chooseUseTarget(card, "nopopup", true);
						}
						target.damage("nocard");
					}
				}
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					var eff = get.effect(target, { name: "shunshou_copy2" }, player, target);
					if (target.countCards("e") > 0) {
						eff += get.damageEffect(target, player, target);
					}
					return eff;
				},
			},
		},
	}
```

## tw_yujin 名字:SP于禁 势力:qun

### xinzhenjun 名字:镇军
描述: 出牌阶段开始时，你可以将一张牌交给一名其他角色，令其选择是否使用一张不为黑色的【杀】。若其选择是，则你于此【杀】结算完成后摸X+1张牌（X为此【杀】造成的伤害总点数）。若其选择否，则你可以对其或其攻击范围内的一名其他角色造成1点伤害。
```js
xinzhenjun: {
		audio: 2,
		trigger: {
			player: "phaseUseBegin",
		},
		direct: true,
		filter(event, player) {
			return player.hasCards("he");
		},
		content() {
			"step 0";
			player.chooseCardTarget({
				filterCard: true,
				filterTarget: lib.filter.notMe,
				position: "he",
				prompt: get.prompt2("xinzhenjun"),
				ai1(card) {
					var player = _status.event.player;
					if (card.name == "sha" && get.color(card) == "red") {
						for (var i = 0; i < game.players.length; i++) {
							var current = game.players[i];
							if (current != player && get.attitude(player, current) > 0 && current.hasValueTarget(card)) {
								return 7;
							}
						}
						return 0;
					}
					return 7 - get.value(card);
				},
				ai2(target) {
					var player = _status.event.player;
					var card = ui.selected.cards[0];
					var att = get.attitude(player, target);
					if (get.value(card) < 0) {
						return -att * 2;
					}
					if (target.countCards("h", { name: "sha", color: "red" }) || target.hasSkill("wusheng") || target.hasSkill("new_rewusheng") || target.hasSkill("wushen") || (card.name == "sha" && get.color(card) == "red" && target.hasValueTarget(card))) {
						return att * 2;
					}
					var eff = 0;
					game.countPlayer(function (current) {
						if (target != current && get.distance(target, current, "attack") > 1) {
							return;
						}
						var eff2 = get.damageEffect(current, player, player);
						if (eff2 > eff) {
							eff = eff2;
						}
					});
					if (att > 0 && eff > 0) {
						eff += 2 * att;
					}
					return eff;
				},
			});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("xinzhenjun", target);
				player.give(result.cards, target);
			} else {
				event.finish();
			}
			"step 2";
			target.chooseToUse({
				filterCard(card) {
					return get.name(card) == "sha" && get.color(card) != "black" && lib.filter.cardEnabled.apply(this, arguments);
				},
				prompt: "请使用一张不为黑色的【杀】，否则" + get.translation(player) + "可以对你或你攻击范围内的一名其他角色造成1点伤害",
			});
			"step 3";
			if (result.bool) {
				var num = 1;
				game.countPlayer2(function (current) {
					current.getHistory("damage", function (evt) {
						if (evt.getParent(evt.notLink() ? 4 : 8) == event) {
							num += evt.num;
						}
					});
				});
				player.draw(num);
				event.finish();
			} else {
				player
					.chooseTarget("是否对" + get.translation(target) + "或其攻击范围内的一名角色造成1点伤害？", function (card, player, target) {
						return target == _status.event.targetx || _status.event.targetx.inRange(target);
					})
					.set("targetx", event.target).ai = function (target) {
					var player = _status.event.player;
					return get.damageEffect(target, player, player);
				};
			}
			"step 4";
			if (result.bool) {
				player.line(result.targets);
				result.targets[0].damage("nocard");
			}
		},
	}
```

## tw_fuwan 名字:TW伏完 势力:qun

### twmoukui 名字:谋溃
描述: `当你使用【杀】指定目标后，你可以选择一项：①摸一张牌；②弃置该角色的一张牌；③${get.poptip("rule_beishui")}：若此【杀】未因造成伤害而令该角色进入过濒死状态，则该角色弃置你的一张牌。`
```js
twmoukui: {
		audio: "moukui",
		trigger: { player: "useCardToPlayered" },
		direct: true,
		preHidden: true,
		filter(event, player) {
			return event.card && event.card.name == "sha";
		},
		content() {
			"step 0";
			var list = ["选项一"];
			if (trigger.target.countDiscardableCards(player, "he") > 0) {
				list.push("选项二");
			}
			list.push("背水！");
			list.push("cancel2");
			player
				.chooseControl(list)
				.set("choiceList", ["摸一张牌", "弃置" + get.translation(trigger.target) + "的一张牌", "背水！依次执行以上两项。然后若此【杀】未令其进入濒死状态，则其弃置你的一张牌。"])
				.set("prompt", get.prompt("twmoukui", trigger.target))
				.setHiddenSkill("twmoukui");
			"step 1";
			if (result.control != "cancel2") {
				var target = trigger.target;
				player.logSkill("twmoukui", target);
				if (result.control == "选项一" || result.control == "背水！") {
					player.draw();
				}
				if (result.control == "选项二" || result.control == "背水！") {
					player.discardPlayerCard(target, true, "he");
				}
				if (result.control == "背水！") {
					player.addTempSkill("twmoukui_effect");
					var evt = trigger.getParent();
					if (!evt.twmoukui_effect) {
						evt.twmoukui_effect = [];
					}
					evt.twmoukui_effect.add(target);
				}
			}
		},
		subSkill: {
			effect: {
				trigger: { player: "useCardAfter" },
				charlotte: true,
				forced: true,
				filter(event, player) {
					return (
						event.twmoukui_effect &&
						event.twmoukui_effect.filter(function (current) {
							return (
								current.isIn() &&
								!current.hasHistory("damage", function (evt) {
									return evt._dyinged && evt.card == event.card;
								})
							);
						}).length > 0
					);
				},
				content() {
					var list = trigger.twmoukui_effect
						.filter(function (current) {
							return (
								current.isIn() &&
								!current.hasHistory("damage", function (evt) {
									return evt._dyinged && evt.card == trigger.card;
								})
							);
						})
						.sortBySeat();
					for (var i of list) {
						i.discardPlayerCard(player, true, "he").boolline = true;
					}
				},
			},
		},
	}
```

## tw_zhaoxiang 名字:TW赵襄 势力:shu

### refanghun
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### twfuhan 名字:扶汉
描述: 限定技。准备阶段开始时，你可以移去所有"梅影"标记，然后从五张未登场的蜀势力武将牌中选择一名获得其所有技能，将体力上限数调整为以此技能移去所有“梅影”标记的数量（最少为2，最多为8）并回复1点体力，然后从牌堆/弃牌堆/场上获得【梅影枪】。
```js
twfuhan: {
		audio: "fuhan",
		trigger: { player: "phaseZhunbeiBegin" },
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		filter(event, player) {
			return player.countMark("fanghun") > 0;
		},
		prompt(event, player) {
			var num = Math.max(2, player.storage.fanghun);
			num = Math.min(num, 8);
			return get.prompt("twfuhan") + "（体力上限：" + num + "）";
		},
		check(event, player) {
			if (player.storage.fanghun >= Math.min(4, player.maxHp)) {
				return true;
			}
			if (player.hp <= 2 && player.storage.fanghun >= 3) {
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			let num = Math.max(2, player.storage.fanghun);
			num = Math.min(num, 8);
			player.removeMark("fanghun", player.storage.fanghun);
			player.awakenSkill(event.name);
			let list = [];
			if (_status.characterlist) {
				for (let i = 0; i < _status.characterlist.length; i++) {
					var name = _status.characterlist[i];
					if (lib.character[name][1] == "shu") {
						list.push(name);
					}
				}
			} else if (_status.connectMode) {
				list = get.charactersOL(function (i) {
					return lib.character[i][1] != "shu";
				});
			} else {
				list = get.gainableCharacters(function (info) {
					return info[1] == "shu";
				});
			}
			var players = game.players.concat(game.dead);
			for (var i = 0; i < players.length; i++) {
				list.remove(players[i].name);
				list.remove(players[i].name1);
				list.remove(players[i].name2);
			}
			list.remove("zhaoxiang");
			const result = await player.chooseButton(["扶汉：选择获得一张武将牌上的所有技能", [list.randomGets(5), "character"]], true).forResult();
			if (result?.links) {
				var name = result.links[0];
				player.flashAvatar("twhuashen", name);
				game.log(player, "获得了", "#y" + get.translation(name), "的所有技能");
				await player.addSkills(lib.character[name][3]);
			}
			num = num - player.maxHp;
			if (num > 0) {
				await player.gainMaxHp(num);
			} else {
				await player.loseMaxHp(-num);
			}
			await player.recover();
			var card = get.cardPile("meiyingqiang", "field");
			if (card) {
				await player.gain(card, "gain2", "log");
			}
		},
		ai: { combo: "refanghun" },
	}
```

### twqueshi 名字:鹊拾
描述: 游戏开始时，你将【梅影枪】置于你的装备区。
```js
twqueshi: {
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		forced: true,
		locked: false,
		filter(event, player) {
			return (event.name != "phase" || game.phaseNumber == 0) && player.hasEquipableSlot(1);
		},
		content() {
			if (!lib.inpile.includes("meiyingqiang")) {
				lib.inpile.push("meiyingqiang");
				player.equip(game.createCard("meiyingqiang", "diamond", 12));
			} else {
				const card = get.cardPile(function (card) {
					return card.name == "meiyingqiang" && !player.getEquips(1).includes(card);
				}, "field");
				if (card) {
					player.equip(card);
				}
			}
		},
	}
```

## yuejiu 名字:TW乐就 势力:qun

### cuijin 名字:催进
描述: 当你或你攻击范围内的角色使用【杀】时，你可以弃置一张牌并获得如下效果：此【杀】的伤害值基数+1，且当此【杀】结算结束后，若未造成过伤害，则你摸一张牌并对使用者造成1点伤害。
```js
cuijin: {
		audio: 2,
		trigger: { global: "useCard" },
		filter(event, player) {
			return event.card.name === "sha" && (event.player === player || player.inRange(event.player)) && player.hasCards("he");
		},
		checkx(event, player) {
			const nature = get.nature(event.card);
			const userDamage = get.damageEffect(event.player, player, player);
			let damageBonus = 0,
				mayDamage = 0,
				odds = -1;
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
					odds = Math.max(odds, hitOdds);
					mayDamage += hitOdds * get.damageEffect(tar, event.player, player, nature);
				}
			}
			if (damageBonus) {
				return damageBonus;
			}
			if (!mayDamage || odds < 0) {
				return get.damageEffect(event.player, player, player);
			}
			return mayDamage + (1 - odds) * get.damageEffect(event.player, player, player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("chooseonly", "he", get.prompt(event.skill, trigger.player), `弃置一张牌并令${get.translation(trigger.player)}使用的${get.translation(trigger.card)}伤害+1，但若其未造成伤害，则你对其造成1点伤害。`)
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
						const num = (lib.skill.cuijin.checkx(trigger, player) * player.countCards("he")) / 10;
						return num;
					})()
				)
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.discard(event.cards);
			if (typeof trigger.baseDamage !== "number") {
				trigger.baseDamage = 1;
			}
			trigger.baseDamage++;
			player.addTempSkill("cuijin_damage");
			player.markAuto("cuijin_damage", [trigger.card]);
		},
		subSkill: {
			damage: {
				trigger: { global: "useCardAfter" },
				forced: true,
				popup: false,
				charlotte: true,
				onremove: true,
				filter(event, player) {
					return player.getStorage("cuijin_damage").includes(event.card);
				},
				async content(event, trigger, player) {
					player.unmarkAuto(event.name, [trigger.card]);
					if (!player.getStorage(event.name).length) {
						player.removeSkill(event.name);
					}
					if (
						trigger.player.isIn() &&
						!game.hasPlayer2(function (current) {
							return current.hasHistory("damage", function (evt) {
								return evt.card === trigger.card;
							});
						})
					) {
						player.line(trigger.player, "green");
						await player.draw();
						await trigger.player.damage();
					}
				},
			},
		},
	}
```

## wuban 名字:TW吴班 势力:shu

### jintao 名字:进讨
描述: 锁定技，你使用【杀】无距离限制且次数上限+1。你于出牌阶段内使用的第一张【杀】伤害+1，第二张【杀】不可被响应。
```js
jintao: {
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
		audio: 2,
		trigger: { player: "useCard" },
		forced: true,
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			var evt = event.getParent("phaseUse");
			if (!evt || evt.player != player) {
				return false;
			}
			var index = player
				.getHistory("useCard", function (evtx) {
					return evtx.card.name == "sha" && evtx.getParent("phaseUse") == evt;
				})
				.indexOf(event);
			return index == 0 || index == 1;
		},
		content() {
			var evt = trigger.getParent("phaseUse");
			var index = player
				.getHistory("useCard", function (evtx) {
					return evtx.card.name == "sha" && evtx.getParent("phaseUse") == evt;
				})
				.indexOf(trigger);
			if (index == 0) {
				game.log(trigger.card, "伤害+1");
				if (typeof trigger.baseDamage != "number") {
					trigger.baseDamage = 1;
				}
				trigger.baseDamage++;
			} else {
				game.log(trigger.card, "不可被响应");
				trigger.directHit.addArray(game.players);
			}
		},
	}
```

## duosidawang 名字:朵思大王 势力:qun

### equan 名字:恶泉
描述: 锁定技。①当有角色于你的回合内受到伤害后，其获得X枚“毒”（X为伤害值）。②准备阶段，你令所有拥有“毒”标记的角色移去所有“毒”标记并失去等量的体力。③当有角色因〖恶泉②〗进入濒死状态时，你令其所有技能失效直到回合结束。
```js
equan: {
		audio: 2,
		trigger: { global: "damageEnd" },
		forced: true,
		filter(event, player) {
			return player == _status.currentPhase && event.player.isIn();
		},
		logTarget: "player",
		content() {
			trigger.player.addMark("equan", trigger.num, false);
		},
		group: ["equan_block", "equan_lose"],
		marktext: "毒",
		intro: {
			name: "恶泉(毒)",
			name2: "毒",
		},
		subSkill: {
			lose: {
				audio: "equan",
				trigger: { player: "phaseZhunbeiBegin" },
				forced: true,
				filter() {
					return game.hasPlayer(function (current) {
						return current.hasMark("equan");
					});
				},
				logTarget() {
					return game.filterPlayer(function (current) {
						return current.hasMark("equan");
					});
				},
				content() {
					game.countPlayer(function (current) {
						var num = current.countMark("equan");
						if (num) {
							current.removeMark("equan", num);
							current.loseHp(num);
						}
					});
				},
			},
			block: {
				trigger: { global: "dyingBegin" },
				forced: true,
				logTarget: "player",
				filter(event, player) {
					var evt = event.getParent(2);
					return evt.name == "equan_lose" && evt.player == player;
				},
				content() {
					trigger.player.addTempSkill("baiban");
				},
			},
		},
	}
```

### manji 名字:蛮汲
描述: 锁定技。其他角色失去体力后，若你的体力值：不大于该角色，你回复1点体力；不小于该角色，你摸一张牌。
```js
manji: {
		audio: 2,
		trigger: { global: "loseHpAfter" },
		forced: true,
		filter(event, player) {
			return player != event.player && (player.hp >= event.player.hp || player.isDamaged());
		},
		logTarget: "player",
		content() {
			if (player.hp <= trigger.player.hp) {
				player.recover();
			}
			if (player.hp >= trigger.player.hp) {
				player.draw();
			}
		},
		ai: {
			combo: "equan",
		},
	}
```

## jiachong 名字:TW贾充 势力:qun

### beini 名字:悖逆
描述: 出牌阶段限一次，你可以选择一名体力值不小于你的角色，令你或其摸两张牌，然后未摸牌的角色视为对摸牌的角色使用一张【杀】。
```js
beini: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target.hp >= player.hp;
		},
		content() {
			"step 0";
			var str = get.translation(target);
			player
				.chooseControl()
				.set("choiceList", ["摸两张牌，然后令" + str + "视为对自己使用【杀】", "令" + str + "摸两张牌，然后视为对其使用【杀】"])
				.set("ai", function () {
					var evt = _status.event.getParent(),
						player = evt.player,
						target = evt.target;
					var card = { name: "sha", isCard: true },
						att = get.attitude(player, target) > 0;
					if (!target.canUse(card, player, false) || get.effect(player, card, target, player) >= 0) {
						return 0;
					}
					if (att && (!player.canUse(card, target, false) || get.effect(target, card, player, player) >= 0)) {
						return 1;
					}
					if (target.hasSkill("nogain") && player.canUse(card, target, false) && get.effect(target, card, player, player) > 0) {
						return 1;
					}
					if (player.hasShan()) {
						return 0;
					}
					if (att && target.hasShan()) {
						return 1;
					}
					return 0;
				});
			"step 1";
			var list = [player, target];
			if (result.index == 1) {
				list.reverse();
			}
			event.list = list;
			list[0].draw(2);
			"step 2";
			var list = event.list;
			if (list[1].isIn() && list[0].isIn() && list[1].canUse("sha", list[0], false)) {
				list[1].useCard({ name: "sha", isCard: true }, list[0], false, "noai");
			}
		},
		ai: {
			order: 5,
			expose: 0,
			result: {
				player(player, target) {
					var card = { name: "sha", isCard: true },
						att = get.attitude(player, target) > 0;
					if (!target.canUse(card, player, false) || get.effect(player, card, target, player) >= 0) {
						return 2;
					}
					if (att && (!player.canUse(card, target, false) || get.effect(target, card, player, player) >= 0)) {
						return 2;
					}
					if (target.hasSkill("nogain") && player.canUse(card, target, false)) {
						return get.effect(target, card, player, player);
					}
					if (player.hasShan()) {
						return 1;
					}
					if (att && target.hasShan()) {
						return 1;
					}
					return 0;
				},
			},
		},
	}
```

### dingfa 名字:定法
描述: 弃牌阶段结束时，若本回合你失去的牌数不小于你的体力值，你可以选择一项：1、回复1点体力；2、对一名其他角色造成1点伤害。
```js
dingfa: {
		audio: 2,
		trigger: { player: "phaseDiscardAfter" },
		filter(event, player) {
			let num = 0;
			player.getHistory("lose", evt => {
				num += evt.cards2.length;
			});
			return num >= player.hp;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.name.slice(0, -5)), "操作提示：选择自己以回复体力，或选择其他角色以造成伤害", (card, player, target) => {
					return target == player ? player.isDamaged() : true;
				})
				.set("ai", target => {
					const player = get.player();
					return target != player ? get.damageEffect(target, player, player) : get.recoverEffect(player, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (target == player) {
				await player.recover();
			} else {
				await target.damage();
			}
		},
	}
```

## tw_dongzhao 名字:TW董昭 势力:wei

### twmiaolve 名字:妙略
描述: `游戏开始时，你获得两张${get.poptip("dz_mantianguohai")}。当你受到1点伤害后，你可选择：①获得一张${get.poptip("dz_mantianguohai")}并摸一张牌。②获得一张智囊。`
```js
twmiaolve: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: ["enterGame", "damageEnd"],
		},
		filter(event, player) {
			if (event.name == "damage") {
				return event.num > 0;
			}
			return event.name != "phase" || game.phaseNumber == 0;
		},
		getIndex(event, player) {
			return event.num || 1;
		},
		async cost(event, trigger, player) {
			if (trigger.name == "damage") {
				const list = ["dz_mantianguohai"];
				list.addArray(get.zhinangs());
				const result = await player
					.chooseButton([get.prompt(event.skill), [list, "vcard"]])
					.set("ai", button => {
						const player = get.player();
						if (button.link[2] == "dz_mantianguohai" && player.countCards("hs", "dz_mantianguohai") < 2) {
							return 10;
						} else if (player.countCards("hs", button.link[2]) == 1) {
							return 4 + get.value({ name: button.link[2] });
						}
						return get.value({ name: button.link[2] });
					})
					.forResult();
				event.result = {
					bool: result?.bool,
					cost_data: result?.links,
				};
			} else {
				event.result = { bool: true };
			}
		},
		async content(event, trigger, player) {
			if (trigger.name == "damage") {
				const name = event.cost_data[0][2];
				if (name == "dz_mantianguohai") {
					if (!lib.inpile.includes("dz_mantianguohai")) {
						lib.inpile.add("dz_mantianguohai");
					}
					if (!_status.dz_mantianguohai_suits) {
						_status.dz_mantianguohai_suits = lib.suit.slice(0);
					}
					if (_status.dz_mantianguohai_suits.length) {
						await player.gain(game.createCard2("dz_mantianguohai", _status.dz_mantianguohai_suits.randomRemove(), 5), "gain2");
					} else {
						const card = get.cardPile(card => card.name == name);
						if (card) {
							await player.gain(card, "gain2");
						}
					}
					await player.draw();
				} else {
					const card = get.cardPile(card => card.name == name);
					if (card) {
						await player.gain(card, "gain2");
					}
				}
			} else {
				if (!lib.inpile.includes("dz_mantianguohai")) {
					lib.inpile.add("dz_mantianguohai");
				}
				if (!_status.dz_mantianguohai_suits) {
					_status.dz_mantianguohai_suits = lib.suit.slice(0);
				}
				const list = _status.dz_mantianguohai_suits.randomRemove(2).map(i => game.createCard2("dz_mantianguohai", i, 5));
				if (list.length) {
					await player.gain(list, "gain2", "log");
				}
			}
		},
	}
```

### twyingjia 名字:迎驾
描述: 一名角色的回合结束时，若你本回合内使用过两张或更多的同名锦囊牌，则你可弃置一张手牌并令一名角色进行一个额外回合。
```js
twyingjia: {
		audio: 2,
		trigger: { global: "phaseEnd" },
		skillAnimation: true,
		animationColor: "wood",
		init(player, skill) {
			player.addSkill(skill + "_mark");
		},
		onremove(player, skill) {
			player.removeSkill(skill + "_mark");
		},
		filter(event, player) {
			if (
				!player.countCards("h", card => {
					if (_status.connectMode) {
						return true;
					}
					return lib.filter.cardDiscardable(card, player);
				})
			) {
				return false;
			}
			let bool = false;
			const history = player.getHistory("useCard"),
				map = {};
			for (const evt of history) {
				if (get.type2(evt.card) == "trick") {
					if (!map[evt.card.name]) {
						map[evt.card.name] = true;
					} else {
						bool = true;
						break;
					}
				}
			}
			return bool;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt(event.skill),
					prompt2: "弃置一张手牌并令一名角色进行一个额外回合",
					filterCard: lib.filter.cardDiscardable,
					filterTarget: true,
					ai1(card) {
						if (card.name == "dz_mantianguohai") return 0.1;
						return 10 - get.value(card);
					},
					ai2(target) {
						if (target.hasJudge("lebu")) {
							return -1;
						}
						const player = get.player();
						if (get.attitude(player, target) > 4) {
							return get.threaten(target) / Math.sqrt(target.hp + 1) / Math.sqrt(target.countCards("h") + 1);
						}
						return -1;
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cards,
			} = event;
			await player.discard({ cards });
			target.insertPhase();
		},
		ai: {
			effect: {
				player(card, player, target) {
					let bool = false;
					const history = player.getHistory("useCard"),
						map = {};
					if (history.length) {
						for (const evt of history) {
							if (get.type2(evt.card) == "trick") {
								if (!map[evt.card.name]) {
									map[evt.card.name] = true;
								} else {
									bool = true;
									break;
								}
							}
						}
						if (bool && get.type(card) == "trick" && player == _status.currentPhase) {
							if (!player.needsToDiscard() || card.name == "dz_mantianguohai") {
								return "zeroplayertarget";
							}
						}
					}
				},
			},
		},
		subSkill: {
			mark: {
				charlotte: true,
				init(player, skill) {
					const history = player.getHistory("useCard"),
						map = {};
					if (!history.length) {
						return;
					}
					let num = 0;
					for (const i of history) {
						if (get.type2(i.card) == "trick") {
							if (!map[i.card.name]) {
								if (num == 0) {
									num = 1;
								}
								map[i.card.name] = true;
							} else {
								num = 2;
							}
						}
					}
					if (num > 0) {
						player.addTip(skill, `${get.translation(skill)} ${num}`, "phaseAfter");
					}
				},
				onremove(player, skill) {
					player.removeTip(skill);
				},
				silent: true,
				popup: false,
				firstDo: true,
				trigger: { player: "useCard" },
				filter(event, player) {
					return get.type2(event.card) == "trick";
				},
				async content(event, trigger, player) {
					const history = player.getHistory("useCard"),
						map = {};
					let num = 0;
					for (const i of history) {
						if (get.type2(i.card) == "trick") {
							if (!map[i.card.name]) {
								map[i.card.name] = true;
								if (num == 0) {
									num = 1;
								}
							} else {
								num = 2;
							}
						}
					}
					player.addTip(event.name, `${get.translation(event.name)} ${num}`, "phaseAfter");
				},
			},
		},
	}
```

## tw_gexuan 名字:TW葛玄 势力:qun

### twdanfa 名字:丹法
描述: 当你使用或打出的牌结算结束后，若此牌花色与你拥有的「丹」均不相同，你可以将此牌置于你的武将牌上，称为「丹」。
```js
twdanfa: {
		audio: 2,
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
		check: () => true,
		trigger: { player: ["useCardAfter", "respondAfter"] },
		filter(event, player) {
			return event.cards?.some(card => get.owner(card) == player || !get.owner(card)) && !player.getExpansions("twdanfa").some(card => get.suit(card) == get.suit(event.card));
		},
		async content(event, trigger, player) {
			await player
				.addToExpansion(
					trigger.cards.filter(card => get.owner(card) == player || !get.owner(card)),
					"gain2"
				)
				.set("gaintag", [event.name]);
			//await player.draw();
		},
	}
```

### twlingbao 名字:灵宝
描述: 出牌阶段，你可以弃置两张花色不同的「丹」并摸两张牌，然后根据其情况执行如下效果：均为红色，你令一名角色从牌堆中获得两张基本牌；均为黑色，你弃置一名角色至多两个不同区域的共计至多两张牌；颜色不同，你令一名角色摸两张牌，另一名角色弃一张牌。然后若你于本回合弃置过两张相同花色的「丹」，则此技能失效直到回合结束。
```js
twlingbao: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			return (
				player
					.getExpansions("twdanfa")
					.map(card => get.suit(card))
					.unique().length > 1
			);
		},
		chooseButton: {
			dialog(event, player) {
				return ui.create.dialog("灵宝", player.getExpansions("twdanfa"));
			},
			filter(button) {
				const buttons = ui.selected.buttons;
				if (!buttons.length) {
					return true;
				}
				return get.suit(buttons[0].link) != get.suit(button.link);
			},
			complexSelect: true,
			check(button) {
				const card = button.link;
				const suits = get
					.player()
					.getHistory("lose", evt => {
						return evt.getParent().name == "discard" && evt.getParent(2).skill == "twlingbao_backup";
					})
					.map(evt => evt.cards.map(card => get.suit(card)))
					.flat();
				if (!suits.includes(get.suit(card))) {
					return 2;
				}
				return 1;
			},
			select: 2,
			backup(links, player) {
				return {
					audio: "twlingbao",
					cards: links,
					filterCard(card) {
						return get.info("twlingbao_backup").cards.includes(card);
					},
					selectCard: -1,
					position: "x",
					async content(event, trigger, player) {
						const cards = get.info("twlingbao_backup").cards,
							colors = cards.map(card => get.color(card)).unique();
						await player.draw(2);
						if (colors.length == 1 && colors[0] == "red") {
							const result = await player
								.chooseTarget(`灵宝：令一名角色从牌堆中获得两张基本牌`, true)
								.set("ai", target => get.effect(target, { name: "wuzhong" }, get.player(), get.player()))
								.forResult();
							if (result?.targets?.length) {
								const target = result.targets[0];
								player.line(target);
								const gain = [];
								while (gain.length < 2) {
									const card = get.cardPile(cardx => get.type(cardx) == "basic" && !gain.includes(cardx));
									if (card) {
										gain.push(card);
									} else {
										break;
									}
								}
								if (gain.length) {
									await target.gain(gain, "gain2");
								}
							}
						}
						if (colors.length == 1 && colors[0] == "black" && game.hasPlayer(target => target.countDiscardableCards(player, "hej"))) {
							const result = await player
								.chooseTarget(`灵宝：你弃置一名角色至多两个不同区域的共计至多两张牌`, true, (card, player, target) => {
									return target.countDiscardableCards(player, "hej");
								})
								.set("ai", target => get.effect(target, { name: "guohe_copy" }, get.player(), get.player()))
								.forResult();
							if (result?.targets?.length) {
								const target = result.targets[0];
								player.line(target);
								await player.discardPlayerCard(target, "hej", [1, 2], true);
							}
						}
						if (colors.length > 1) {
							const canDiscard = game.hasPlayer(target => target.countDiscardableCards(target, "hej"));
							const result = await player
								.chooseTarget(`灵宝：你令一名角色摸两张牌` + (canDiscard ? `，另一名角色弃置一张牌` : ``), true, (card, player, target) => {
									if (!ui.selected.targets.length) {
										return true;
									}
									return target.countDiscardableCards(target, "hej");
								})
								.set("selectTarget", canDiscard ? 2 : 1)
								.set("ai", target => {
									const player = get.player();
									if (!ui.selected.targets.length) {
										return get.effect(target, { name: "wuzhong" }, player, player);
									}
									return get.effect(target, { name: "guohe_copy" }, player, player);
								})
								.set("complexTarget", true)
								.set("complexSelect", true)
								.set("targetprompt", ["摸牌", "弃牌"])
								.forResult();
							if (result?.targets?.length) {
								const draw = result.targets[0],
									discard = result.targets[1];
								player.line(result.targets);
								await draw.draw(2);
								if (discard) {
									await discard.chooseToDiscard("he", true);
								}
							}
						}
						const suits = player
							.getHistory("lose", evt => {
								return evt.getParent().name == "discard" && evt.getParent(2).skill == "twlingbao_backup";
							})
							.map(evt => evt.cards.map(card => get.suit(card)))
							.flat();
						if (suits.length != suits.unique().length) {
							player.tempBanSkill("twlingbao");
						}
					},
				};
			},
		},
		ai: {
			order: 7,
			result: {
				player: 1,
			},
		},
		subSkill: {
			backup: {},
		},
	}
```

### twsidao 名字:司道
描述: `游戏开始时，你从${get.poptip("gx_lingbaoxianhu")}、${get.poptip("gx_taijifuchen")}和${get.poptip("gx_chongyingshenfu")}中选择一张“法宝”置入装备区。准备阶段，若你以此法选择的法宝在牌堆/弃牌堆中，则你使用之。`
```js
twsidao: {
		audio: 2,
		trigger: {
			global: "phaseBefore",
			player: ["enterGame", "phaseZhunbei"],
		},
		filter(event, player) {
			if (event.name == "phaseZhunbei") {
				const card = player.storage.twsidao;
				return card?.isInPile() && player.hasUseTarget(card);
			}
			return (event.name != "phase" || game.phaseNumber == 0) && !player.storage.twsidao;
		},
		async cost(event, trigger, player) {
			if (trigger.name == "phaseZhunbei") {
				event.result = { bool: true };
			} else {
				const result = await player
					.chooseButton(["请选择你的初始法宝", [["gx_lingbaoxianhu", "gx_taijifuchen", "gx_chongyingshenfu"], "vcard"]], true)
					.set("ai", button => {
						return button.link[2] == "gx_chongyingshenfu" ? 2 : 1;
					})
					.forResult();
				event.result = {
					bool: result?.bool,
					cost_data: result?.links,
				};
			}
		},
		async content(event, trigger, player) {
			if (trigger.name == "phaseZhunbei") {
				await player.chooseUseTarget(player.storage.twsidao, "nopopup", true);
			} else {
				const name = event.cost_data[0][2];
				const card = game.createCard2(name, "heart", 1);
				game.broadcastAll(name => lib.inpile.add(name), name);
				player.storage.twsidao = card;
				await player.chooseUseTarget(card, "nopopup", true);
			}
		},
	}
```

## tw_beimihu 名字:TW卑弥呼 势力:qun

### zongkui
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### guju
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### baijia
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

### bingzhao
(未在本包skill代码文件中找到该技能定义，可能是全局共享技能或跨包引用)

## nashime 名字:难升米 势力:qun

### chijie 名字:持节
描述: 游戏开始时，你可以选择一个现存势力，你的势力视为该势力。
```js
chijie: {
		audio: true,
		getGroups(player) {
			return lib.group.filter(group => {
				return group != player.group && game.hasPlayer(current => current.group == group);
			});
		},
		trigger: {
			global: "phaseBefore",
			player: "enterGame",
		},
		filter(event, player) {
			return (event.name != "phase" || game.phaseNumber == 0) && get.info("chijie").getGroups(player).length;
		},
		async cost(event, trigger, player) {
			const list = get.info("chijie").getGroups(player);
			const { control } = await player
				.chooseControl(list, "cancel2")
				.set("prompt", get.prompt(event.name.slice(0, -5)))
				.set("prompt2", "将自己的势力变更为场上存在的一个势力")
				.set("ai", () => {
					return get.event().controls.randomGet();
				})
				.forResult();
			event.result = {
				bool: control != "cancel2",
				cost_data: control,
			};
		},
		async content(event, trigger, player) {
			await player.changeGroup(event.cost_data);
		},
		ai: {
			combo: "waishi",
		},
	}
```

### waishi 名字:外使
描述: 出牌阶段限一次，你可以用至多X张牌交换一名其他角色等量的手牌（X为现存势力数），然后若其与你势力相同或手牌多于你，你摸一张牌。
```js
waishi: {
		audio: 2,
		enable: "phaseUse",
		usable(skill, player) {
			return 1 + player.countMark("waishi_add");
		},
		filter(event, player) {
			return player.countCards("he") > 0 && game.hasPlayer(target => target != player && target.countCards("h") > 0);
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") >= ui.selected.cards.length;
		},
		filterCard: true,
		position: "he",
		check(card) {
			if (!game.hasPlayer(current => current != get.player() && current.countCards("h") > ui.selected.cards.length)) {
				return 0;
			}
			return 6 - get.value(card);
		},
		selectCard() {
			if (!ui.selected.targets.length) {
				return [1, game.countGroup()];
			}
			return [1, Math.min(ui.selected.targets[0].countCards("h"), game.countGroup())];
		},
		discard: false,
		lose: false,
		delay: 0,
		async content(event, trigger, player) {
			const { cards, target } = event;
			const { links } = await player.choosePlayerCard(target, true, "h", cards.length).forResult();
			if (!links || !links.length) {
				return;
			}
			await player.swapHandcards(target, cards, links);
			await game.delayex();
			if (target.countCards("h") > player.countCards("h") || player.group == target.group) {
				await player.draw();
			}
		},
		ai: {
			order: 7,
			result: {
				player(player, target) {
					if (player.countCards("h") < target.countCards("h") || player.group == target.group) {
						return 1;
					}
					return 0.1;
				},
			},
		},
		subSkill: {
			add: {
				charlotte: true,
				onremove: true,
				intro: { content: "〖外使〗的发动次数+#" },
			},
		},
	}
```

### renshe 名字:忍涉
描述: 当你受到伤害后，你可以选择一项：将势力改为现存的另一个势力；或可以额外发动一次“外使”直到你的下个出牌阶段结束；或与另一名其他角色各摸一张牌。
```js
renshe: {
		audio: 2,
		trigger: { player: "damageEnd" },
		async cost(event, trigger, player) {
			const choices = [];
			const choiceList = ["将势力变更为场上现存的一个其他势力", "令〖外使〗的发动次数+1直到下个出牌阶段结束", "与另一名其他角色各摸一张牌"];
			if (get.info("chijie").getGroups(player).length) {
				choices.push("选项一");
			} else {
				choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
			}
			choices.push("选项二");
			if (game.hasPlayer(current => player != current)) {
				choices.push("选项三");
			} else {
				choiceList[2] = '<span style="opacity:0.5">' + choiceList[2] + "</span>";
			}
			const { control } = await player
				.chooseControl(choices, "cancel2")
				.set("prompt", get.prompt(event.name.slice(0, -5)))
				.set("choiceList", choiceList)
				.set("ai", () => {
					if (
						game.hasPlayer(current => {
							if (player == current) {
								return false;
							}
							return get.attitude(player, current) > 0 || current.hasSkillTag("nogain");
						})
					) {
						return "选项三";
					}
					return "选项二";
				})
				.forResult();
			event.result = {
				bool: control != "cancel2",
				cost_data: control,
			};
		},
		async content(event, trigger, player) {
			const { cost_data: control } = event;
			if (control == "选项一") {
				const list = get.info("chijie").getGroups(player);
				if (!list.length) {
					return;
				}
				const result = await player
					.chooseControl(list)
					.set("prompt", get.prompt(event.name))
					.set("prompt2", "将自己的势力变更为场上存在的一个势力")
					.set("ai", () => {
						return get.event().controls.randomGet();
					})
					.forResult();
				await player.changeGroup(result.control);
			} else if (control == "选项二") {
				player.addTempSkill("waishi_add", { player: "phaseUseAfter" });
				player.addMark("waishi_add", 1, false);
			} else {
				if (!game.hasPlayer(current => player != current)) {
					return;
				}
				const result = await player
					.chooseTarget("请选择一名角色，与其各摸一张牌", lib.filter.notMe, true)
					.set("ai", target => {
						const player = get.player();
						if (target.hasSkillTag("nogain")) {
							return 0.1;
						}
						return get.effect(target, { name: "draw" }, player, player);
					})
					.forResult();
				if (result.bool) {
					const target = result.targets[0];
					player.line(target, "green");
					await game.asyncDraw([player, target].sortBySeat());
				}
			}
		},
	}
```

## tw_yj_fazheng 名字:TW☆法正 势力:qun

### cangjia 名字:藏铗
描述: 锁定技，你于出牌阶段外获得牌时，记录此牌花色；当你成为其他角色使用未记录花色牌的目标后，除非其弃置一张牌，否则此牌对你无效。
```js
cangjia: {
		audio: "youtan",
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
			return cards?.length && cards.some(card => !player.getStorage("cangjia").includes(get.suit(card)));
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
		group: "cangjia_defend",
		subSkill: {
			defend: {
				forced: true,
				trigger: {
					target: "useCardToTargeted",
				},
				filter(event, player) {
					if (!event.player || event.player === player) {
						return false;
					}
					return !player.getStorage("cangjia").includes(get.suit(event.card));
				},
				async content(event, trigger, player) {
					const source = trigger.player;
					if (!source?.isIn() || !source.hasDiscardableCards(source, "he")) {
						trigger.getParent()?.excluded.add(player);
						return;
					}
					const result = await source
						.chooseToDiscard({
							prompt: `藏铗：弃置一张牌，否则${get.translation(trigger.card)}对${get.translation(player)}无效`,
							position: "he",
							ai(card) {
								return 10 - get.value(card);
							},
						})
						.forResult();
					if (!result?.bool || !result.cards?.length) trigger.getParent()?.excluded.add(player);
				},
			},
		},
	}
```

### duohui 名字:堕洄
描述: 其他角色的准备阶段，其可以交给你一张牌，然后你须选择一项：1.交给其另一张同花色牌；2.令其摸一张牌。
```js
duohui: {
		audio: "ciren",
		global: "duohui_global",
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
						return current != player && current.hasSkill("duohui");
					});
				},
				async cost(event, trigger, player) {
					const targets = game.filterPlayer(current => current != player && current.hasSkill("duohui"));
					event.result = await player
						.chooseCardTarget({
							prompt: get.prompt("duohui"),
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
					await target.logSkill("duohui", player);
					await player.give(cards, target);
					const result = await target
						.chooseToGive(player, `堕洄：交给${get.translation(player)}另一张${get.translation(suit)}牌，否则其摸一张牌`, "he")
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

### yueyuan 名字:跃渊
描述: `出牌阶段限四次，你可以摸${get.poptip("cangjia")}记录花色数张牌，然后清除一个花色记录。`
```js
yueyuan: {
		audio: "zhancai",
		enable: "phaseUse",
		usable: 4,
		filter(event, player) {
			return player.getStorage("cangjia").length;
		},
		prompt() {
			const num = get.player().getStorage("cangjia").length;
			return `摸${get.cnNumber(num)}张牌，然后移去一个记录的花色`;
		},
		manualConfirm: true,
		async content(event, trigger, player) {
			const skill = "cangjia";
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
			combo: "cangjia",
			result: {
				player(player) {
					return player.getStorage("cangjia").filter(suit => {
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

## tw_xiahouba 名字:TW夏侯霸 势力:shu

### twyanqin 名字:姻亲
描述: 准备阶段，你可以将势力变更为魏或蜀。
```js
twyanqin: {
		trigger: { player: "phaseBegin" },
		direct: true,
		content() {
			"step 0";
			var list = [];
			if (player.group != "wei") {
				list.push("wei2");
			}
			if (player.group != "shu") {
				list.push("shu2");
			}
			list.push("cancel2");
			player
				.chooseControl(list)
				.set("ai", function () {
					return list.randomGet();
				})
				.set("prompt", get.prompt2("twyanqin"));
			"step 1";
			if (result.control != "cancel2") {
				player.logSkill("twyanqin");
				var group = result.control.slice(0, 3);
				player.changeGroup(group);
			}
		},
		ai: {
			combo: "twbaobian",
		},
	}
```

### twbaobian 名字:豹变
描述: 当你使用【杀】或【决斗】造成伤害时，若目标角色的势力与你相同，则你可以防止此伤害，然后其将手牌数补充至与体力值相同。若不同且其手牌数大于体力值，则你可以将其手牌弃置至与其体力值相同。
```js
twbaobian: {
		trigger: { source: "damageBegin2" },
		filter(event, player) {
			var card = event.card;
			if (!card || (card.name != "sha" && card.name != "juedou")) {
				return false;
			}
			return event.player.group == player.group || event.player.countCards("h") > event.player.hp;
		},
		check(event, player) {
			var att = get.attitude(player, event.player);
			if (event.player.group == player.group) {
				return att > 0;
			}
			return att < 0;
		},
		logTarget: "player",
		content() {
			var target = trigger.player;
			if (target.group == player.group) {
				trigger.cancel();
				var num = target.maxHp - target.countCards("h");
				if (num) {
					target.draw(num);
				}
			} else {
				player.discardPlayerCard(target, "h", true, target.countCards("h") - target.hp, "allowChooseAll");
			}
		},
	}
```

## tw_zumao 名字:TW祖茂 势力:wu

### twtijin 名字:替巾
描述: 当你攻击范围内的一名其他角色使用【杀】指定另一名其他角色为目标时，你可以将此【杀】的目标改为你。若如此做，此【杀】结算完成后，你弃置该角色的一张牌。
```js
twtijin: {
		trigger: { global: "useCardToPlayer" },
		filter(event, player) {
			return event.card?.name == "sha" && event.player != player && event.target != player && event.targets.length == 1 && player.inRange(event.player);
		},
		logTarget: "target",
		check(event, player) {
			return get.effect(event.targets[0], event.card, event.player, player) <= get.effect(player, event.card, event.player, player);
		},
		content() {
			"step 0";
			trigger.targets.length = 0;
			trigger.getParent().triggeredTargets1.length = 0;
			trigger.targets.push(player);
			var next = game.createEvent("twtijin_discard", null, trigger.getParent(2));
			next.player = player;
			next.target = trigger.player;
			next.setContent(function () {
				if (target.isDead() || !target.countCards("he")) {
					return;
				}
				player.line(target, "green");
				player.discardPlayerCard(target, true, "he");
			});
		},
	}
```

## tw_caoang 名字:TW曹昂 势力:wei

### twxiaolian 名字:孝廉
描述: 当一名其他角色使用【杀】指定另一名其他角色为目标时，你可以将此【杀】的目标改为你。若如此做，当你受到此【杀】的伤害后，你可以将一张牌置于此【杀】原目标的武将牌旁，称为“马”，且令其获得如下效果：其他角色计算至其的距离+X（X为其武将牌旁的“马”数）。
```js
twxiaolian: {
		trigger: { global: "useCardToTarget" },
		logTarget: "target",
		filter(event, player) {
			return event.card && event.card.name == "sha" && event.player != player && event.targets.length == 1 && event.targets[0] != player;
		},
		check(event, player) {
			return get.effect(event.targets[0], event.card, event.player, player) <= get.effect(player, event.card, event.player, player);
		},
		content() {
			trigger.getParent().twxiaolian = trigger.targets[0];
			trigger.targets.length = 0;
			trigger.getParent().triggeredTargets2.length = 0;
			trigger.targets.push(player);
		},
		group: "twxiaolian_damage",
		subSkill: {
			distance: {
				sub: true,
				charlotte: true,
				init(player, skill) {
					if (!player.storage[skill]) {
						player.storage[skill] = [];
					}
				},
				mark: true,
				marktext: "马",
				intro: {
					content: "cards",
					onunmark: "throw",
				},
				mod: {
					globalTo(from, to, distance) {
						if (from != to && to.storage.twxiaolian_distance) {
							return distance + to.storage.twxiaolian_distance.length;
						}
					},
				},
			},
			damage: {
				sub: true,
				trigger: { player: "damageEnd" },
				direct: true,
				filter(event, player) {
					return event.getParent(2).twxiaolian != undefined;
				},
				content() {
					"step 0";
					var target = trigger.getParent(2).twxiaolian;
					event.target = target;
					player.chooseCard("是否将一张牌当做【马】置于" + get.translation(target) + "的武将牌旁？", "he").ai = function (card) {
						if (get.attitude(_status.event.player, _status.event.getParent("twxiaolian_damage").target) > 2) {
							return 7 - get.value(card);
						}
						return 0;
					};
					"step 1";
					if (result.bool) {
						player.logSkill("twxiaolian", target);
						player.lose(result.cards, ui.special, "toStorage");
						target.addSkill("twxiaolian_distance");
						target.storage.twxiaolian_distance.addArray(result.cards);
						target.markSkill("twxiaolian_distance");
					}
				},
			},
		},
	}
```

## tw_dingfeng 名字:TW丁奉 势力:wu

### twqijia 名字:弃甲
描述: 出牌阶段，你可以弃置一张装备区内的牌（每种类型的装备牌限一次），然后视为对攻击范围内的一名其他角色使用了一张【杀】。
```js
twqijia: {
		//group:'twqijia_alka',
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("e", function (card) {
				return !player.getStorage("twqijia_alka").includes(get.subtype(card));
			});
		},
		filterTarget(card, player, target) {
			return target != player && player.canUse({ name: "sha" }, target);
		},
		position: "e",
		filterCard(card, player) {
			return !player.getStorage("twqijia_alka").includes(get.subtype(card));
		},
		content() {
			"step 0";
			player.addTempSkill("twqijia_alka");
			player.storage.twqijia_alka.push(get.subtype(cards[0]));
			player.useCard({ name: "sha" }, target, false);
		},
		subSkill: {
			alka: {
				charlotte: true,
				onremove(player) {
					delete player.storage.twqijia_alka;
					delete player.storage.twzhuchen;
					player.unmarkSkill("twzhuchen");
				},
				init(player, skill) {
					if (!player.storage[skill]) {
						player.storage[skill] = [];
					}
					if (!player.storage.twzhuchen) {
						player.storage.twzhuchen = [];
					}
				},
				mod: {
					globalFrom(from, to, distance) {
						if (from.storage.twzhuchen && from.storage.twzhuchen.includes(to)) {
							return -Infinity;
						}
					},
				},
			},
		},
		check(card) {
			return 7 - get.value(card);
		},
		ai: {
			order() {
				return get.order({ name: "sha" }) - 0.2;
			},
			result: {
				target(player, target) {
					return get.effect(target, { name: "sha" }, player, player);
				},
			},
		},
	}
```

### twzhuchen 名字:诛綝
描述: 出牌阶段，你可以弃置一张【桃】或【酒】并选择一名其他角色。你与其的距离视为1直到此阶段结束。
```js
twzhuchen: {
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("h", lib.skill.twzhuchen.filterCard) > 0;
		},
		filterCard(card, player) {
			var name = get.name(card, player);
			return name == "tao" || name == "jiu";
		},
		filterTarget: lib.filter.notMe,
		content() {
			player.addTempSkill("twqijia_alka");
			player.storage.twzhuchen.add(target);
			player.markSkill("twzhuchen");
		},
		intro: {
			content(content, player) {
				return "至" + get.translation(content) + "的距离视为1";
			},
		},
	}
```

## tw_caohong 名字:TW将曹洪 势力:wei

### twhuzhu 名字:护主
描述: 出牌阶段限一次，若你的装备区内有牌，则你可以令一名其他角色交给你一张手牌，然后获得你装备区内的一张牌。若其体力值不大于你，则你可以令其回复1点体力。
```js
twhuzhu: {
		enable: "phaseUse",
		usable: 1,
		filter(e, player) {
			return player.countCards("e") > 0;
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0;
		},
		content() {
			"step 0";
			target.chooseCard("交给" + get.translation(player) + "一张手牌", "h", true);
			"step 1";
			target.give(result.cards, player);
			"step 2";
			if (player.countGainableCards(player, "e")) {
				target.gainPlayerCard(player, "e", true);
			}
			"step 3";
			if (target.isDamaged() && target.hp <= player.hp) {
				player.chooseBool("是否令" + get.translation(target) + "回复1点体力？").set("ai", function () {
					return get.recoverEffect(target, player, player);
				});
			}
			"step 4";
			if (result.bool) {
				target.recover();
			}
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					var eff = target.isDamaged() && target.hp <= player.hp ? get.recoverEffect(target, player, target) : 0;
					if (eff <= 0 && !player.countGainableCards(target, "e")) {
						return -1;
					}
					return eff;
				},
			},
		},
	}
```

### twliancai 名字:敛财
描述: 结束阶段，你可以将武将牌翻面，然后获得一名其他角色装备区内的一张牌。当你的武将牌翻面时，你可以将手牌补至与体力值相同。
```js
twliancai: {
		trigger: { player: ["turnOverEnd", "phaseJieshuBegin"] },
		filter(card, player, target) {
			return target == "phaseJieshuBegin" || player.countCards("h") < player.hp;
		},
		filterTarget(card, player, target) {
			return target != player && target.countGainableCards(player, "e") > 0;
		},
		check(card, player) {
			if (card.name == "turnOver") {
				return true;
			}
			if (player.isTurnedOver()) {
				return true;
			}
			if (player.hp - player.countCards("h") > 1) {
				return true;
			}
			return game.hasPlayer(function (current) {
				return lib.skill.twliancai.filterTarget(null, player, current) && lib.skill.twliancai.filterAI(current);
			});
		},
		filterAI(target) {
			var player = _status.event.player;
			var att = get.attitude(player, target);
			if (target.isDamaged() && target.countCards("e", "baiyin") && att > 0) {
				return 2 * att;
			}
			return -att;
		},
		prompt2(card, player, target) {
			return card.name == "phaseJieshu" ? "将武将牌翻面，然后获得一名其他角色装备区内的一张牌" : "将手牌摸至与体力值相同";
		},
		content() {
			"step 0";
			if (event.triggername == "phaseJieshuBegin") {
				player.turnOver();
			} else {
				player.draw(player.hp - player.countCards("h"));
				event.finish();
			}
			"step 1";
			player.chooseTarget("获得一名角色装备区内的一张牌", lib.skill.twliancai.filterTarget).ai = lib.skill.twliancai.filterAI;
			"step 2";
			if (result.bool) {
				player.line(result.targets, "thunder");
				player.gainPlayerCard("e", true, result.targets[0]);
			}
		},
	}
```

## tw_maliang 名字:TW马良 势力:shu

### twrangyi 名字:攘夷
描述: 出牌阶段限一次，你可以将所有手牌交给一名其他角色，然后令其选择一项：1.使用其中的一张牌，并于此牌被使用时将其余的牌交还给你。2.受到来自你的1点伤害。
```js
twrangyi: {
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		filterTarget: lib.filter.notMe,
		delay: 0,
		content() {
			"step 0";
			event.cards = player.getCards("h");
			player.give(event.cards, target).gaintag.add("twrangyi");
			target.addTempSkill("twrangyi2");
			"step 1";
			target.chooseToUse({
				prompt: "请使用得到的一张牌，或者受到来自" + get.translation(player) + "的1点伤害",
				filterCard(card, player) {
					if (get.itemtype(card) != "card" || !card.hasGaintag("twrangyi")) {
						return false;
					}
					return lib.filter.filterCard(card, player, event);
				},
				cards: cards,
			});
			"step 2";
			target.removeSkill("twrangyi2");
			if (!result.bool) {
				target.damage("nocard");
			}
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					var hs = player.getCards("h");
					for (var i = 0; i < hs.length; i++) {
						var hi = hs[i];
						if (hi.name == "tao" || target.hasValueTarget(hi, null, true)) {
							return 1;
						}
					}
					return get.damageEffect(target, player, target);
				},
			},
		},
	}
```

### twbaimei 名字:白眉
描述: 锁定技，若你没有手牌，则防止你受到的所有属性伤害和锦囊牌造成的伤害。
```js
twbaimei: {
		trigger: {
			player: "damageBegin4",
		},
		forced: true,
		filter(event, player) {
			if (player.countCards("h")) {
				return false;
			}
			if (event.hasNature()) {
				return true;
			}
			return get.type(event.card, "trick") == "trick";
		},
		content() {
			trigger.cancel();
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (target.countCards("h")) {
						return;
					}
					if (get.tag(card, "natureDamage")) {
						return "zeroplayertarget";
					}
					if (get.type(card) == "trick" && get.tag(card, "damage")) {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

## kaisa 名字:凯撒 势力:western

### zhengfu 名字:征服
描述: 当你使用【杀】指定目标时，你可以选择一种牌的类别，然后除非目标角色交给你一种该类别的牌，否则其不能闪避此【杀】。
```js
zhengfu: {
		trigger: {
			player: "useCardToPlayered",
		},
		check(event, player) {
			return get.attitude(player, event.target) < 0;
		},
		filter(event, player) {
			return event.card.name == "sha";
		},
		logTarget: "target",
		async cost(event, trigger, player) {
			const list = ["basic", "trick", "equip"].map(type => ["", "", `caoying_${type}`]);
			const result = await player
				.chooseButton([get.prompt2(event.skill, trigger.target), [list, "vcard"]])
				.set("ai", button => {
					const type = button.link[2].slice(8),
						{ player, target } = get.event();
					if (get.attitude(player, target) > 0) {
						return 0;
					}
					if (target.hasKnownCards(player, card => get.type2(card) == type)) {
						return Math.random();
					}
					return ["basic", "equip", "trick"].indexOf(type) + Math.random();
				})
				.set("target", trigger.target)
				.set("forceAuto", true)
				.forResult();
			if (result.bool) {
				event.result = {
					bool: true,
					targets: [trigger.target],
					cost_data: result.links[0][2].slice(8),
				};
			}
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
				cost_data: type,
			} = event;
			const result = await target
				.chooseCard("he", `交给${get.translation(player)}一张${get.translation(type)}牌，否则此【杀】不可被闪避`, card => {
					return get.type2(card) == get.event().type;
				})
				.set("ai", card => {
					const num = get.event().num;
					if (num == 0) {
						return 0;
					}
					if (card.name == "shan") {
						return num > 1 ? 2 : 0;
					}
					return 8 - get.value(card);
				})
				.set("num", target.countCards("h", "shan"))
				.set("type", type)
				.forResult();
			if (result.bool) {
				await target.give(result.cards, player);
			} else {
				trigger.getParent().directHit.add(target);
				await game.delayx();
			}
		},
	}
```

## tw_sxrm_huatuo 名字:TW疑华佗 势力:qun

### twmiehai 名字:灭害
描述: 每回合限三次，你可以将两张牌当作无距离次数限制的刺【杀】使用。此【杀】结算完成后，此过程中正面失去♠牌的角色各回复1点体力，你可以令其中任意名角色摸两张牌。
```js
twmiehai: {
		audio: "sxrmmiehai",
		enable: "chooseToUse",
		filterCard: true,
		selectCard: 2,
		position: "hes",
		usable: 3,
		viewAs: {
			name: "sha",
			nature: "stab",
			storage: {
				twmiehai: true,
			},
		},
		complexCard: true,
		filter(event, player) {
			return player.countCards("hes") >= 2;
		},
		prompt: "将两张牌当刺【杀】使用",
		async precontent(event, trigger, player) {
			event.getParent().addCount = false;
			player
				.when("useCardAfter")
				.filter(evt => evt.getParent() === event.getParent())
				.step(async (event2, trigger2, player2) => {
					const targets = game.filterPlayer(current => {
						return current.getHistory("lose", evt => {
							const cards2 = evt.cards2;
							if (!evt.getParent(evt2 => evt2 === trigger2, true, true) || !cards2.some(card => get.suit(card) === "spade")) {
								return false;
							}
							return evt.visible;
						}).length;
					});
					if (!targets?.length) return;
					for (const target of targets) {
						await target.recover();
					}
					const drawTargets = await player2
						.chooseTarget({
							selectTarget: [1, targets.length],
							prompt: "【灭害】选择令任意名角色摸两张牌",
							filterTarget(card, player, target) {
								return get.event().targets.includes(target);
							},
							multitarget: true,
						})
						.set("targets", targets)
						.forResult();
					if (drawTargets?.bool && drawTargets.targets?.length) {
						await game.asyncDraw(drawTargets.targets, 2);
					}
				});
		},
		check(card) {
			const player = get.player();
			const val = get.value(card);
			if (get.suit(card) === "spade") {
				return 5 - val;
			}
			return Math.max(5, 8 - 0.7 * player.getHp()) - val;
		},
		ai: {
			order(item, player) {
				return get.order({ name: "sha" }) + 0.1;
			},
		},
		locked: false,
		mod: {
			targetInRange(card) {
				if (card?.storage?.twmiehai) return true;
			},
			cardUsable(card, player, num) {
				if (card?.storage?.twmiehai) return Infinity;
			},
		},
	}
```

## tw_sxrm_liubei 名字:TW疑刘备 势力:qun

### twchengbian 名字:乘变
描述: 准备阶段和结束阶段，你可以摸一张牌并与一名角色延时拼点，然后视为对其使用一张【决斗】，直到此【决斗】结算结束，此【决斗】结算过程中各限X次（X为各自手牌数的一半，向下取整），当你或目标角色需要打出【杀】响应此【决斗】时，可以将一张手牌当【杀】打出。结算后公开结果，拼点赢的角色将手牌摸至体力上限。你的拼点牌点数+X（X为当前游戏轮数且至多为4）。
```js
twchengbian: {
		audio: "sxrmchengbian",
		trigger: {
			player: ["phaseZhunbeiBegin", "phaseJieshuBegin"],
		},
		filter(event, player) {
			return game.hasPlayer(current => player.canCompare(current));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player2, target) => {
					return player2.canCompare(target);
				})
				.set("ai", target => {
					const player2 = get.player();
					return get.effect(target, { name: "juedou" }, player2, player2);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw(1);
			const target = event.targets[0];
			const next = player.chooseToCompare(target).set("isDelay", true);
			await next;
			await game.delay();
			const card = new lib.element.VCard({ name: "juedou", isCard: true });
			if (player.canUse(card, target)) {
				const next2 = player.useCard(card, target);
				player
					.when({
						player: "useCardAfter",
					})
					.filter(evt => evt === next2)
					.step(async (event2, trigger2, player2) => {
						player2.removeSkill("twchengbian_sha");
						target.removeSkill("twchengbian_sha");
						const result = await game.createEvent("chooseToCompare", false).set("player", player2).set("parentEvent", next).setContent("chooseToCompareEffect").forResult();
						if (result?.winner) {
							await result.winner.drawTo(result.winner.maxHp);
						}
					});
				player.storage.twchengbian_sha_max = Math.floor(player.countCards("h") / 2);
				player.storage.twchengbian_sha_used = 0;
				target.storage.twchengbian_sha_max = Math.floor(target.countCards("h") / 2);
				target.storage.twchengbian_sha_used = 0;
				player.addTempSkill("twchengbian_sha");
				target.addTempSkill("twchengbian_sha");
				await next2;
				player.removeSkill("twchengbian_sha");
				target.removeSkill("twchengbian_sha");
			}
		},
		group: "twchengbian_compare",
		subSkill: {
			compare: {
				audio: "twchengbian",
				trigger: {
					player: "compare",
					target: "compare",
				},
				filter(event, player) {
					return !event.iwhile;
				},
				forced: true,
				async content(event, trigger, player) {
					const bonus = Math.min(game.roundNumber || 0, 4);
					if (bonus > 0) {
						if (trigger.player === player) {
							trigger.num1 = Math.min(13, trigger.num1 + bonus);
						} else {
							trigger.num2 = Math.min(13, trigger.num2 + bonus);
						}
						game.log(player, "的拼点牌点数+", "#g", bonus);
					}
				},
			},
			sha: {
				audio: "twchengbian",
				enable: "chooseToRespond",
				filterCard: true,
				selectCard: 1,
				position: "h",
				viewAs: { name: "sha" },
				viewAsFilter(player) {
					const max = player.storage.twchengbian_sha_max || 0;
					const used = player.storage.twchengbian_sha_used || 0;
					return player.hasCards("h") && used < max;
				},
				prompt: "将一张手牌当【杀】打出",
				async precontent(event, trigger, player) {
					player.storage.twchengbian_sha_used = (player.storage.twchengbian_sha_used || 0) + 1;
				},
				check(card) {
					return 1 / Math.max(0.1, get.value(card));
				},
				ai: {
					skillTagFilter(player) {
						const max = player.storage.twchengbian_sha_max || 0;
						const used = player.storage.twchengbian_sha_used || 0;
						return used < max && player.hasCards("h");
					},
					respondSha: true,
				},
			},
		},
	}
```

## tw_sxrm_caocao 名字:TW疑曹操 势力:wei

### twkuxin 名字:枯心
描述: 你受到伤害后，可以令所有其他角色依次选择展示任意张手牌，然后你获得所有角色展示的牌或一名角色未展示的手牌并展示之，若你未以此法获得♥牌，你弃置这些牌。
```js
twkuxin: {
		audio: "sxrmkuxin",
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return game.hasPlayer(current => current !== player && current.countCards("h") > 0);
		},
		check(event, player) {
			if (player.isTurnedOver()) return true;
			if (
				game.countPlayer(current => {
					if (current === player) return 0;
					if (get.attitude(player, current) > 0) return current.countCards("h") >= 4;
					return current.countCards("h");
				}) <
				4 / (1 + player.getHp())
			)
				return false;
			return true;
		},
		logTarget(event, player) {
			return game.filterPlayer(current => current !== player).sortBySeat(_status.currentPhase);
		},
		async content(event, trigger, player) {
			const { targets } = event;
			const list = [];
			for (const target of targets) {
				if (!target.countCards("h")) continue;
				const result2 = await target
					.chooseCard("枯心：展示任意张手牌", "h", [1, Infinity], true, "allowChooseAll")
					.set("targetx", player)
					.set("ai", card => {
						const { player: player2, targetx } = get.event();
						const att = get.attitude(player2, targetx);
						const val = get.value(card);
						if (get.suit(card, false) === "heart") return att * 10086 - val;
						if (att < 0) return -val;
						if (att > 0) return get.value(card, targetx) - val;
						return val;
					})
					.forResult();
				if (!result2?.cards?.length) continue;
				list.push([result2.cards, target]);
				await target.showCards(result2.cards);
				await game.delay();
			}
			let result;
			let gains = [];
			if (list.length) {
				result = await player
					.chooseButtonTarget({
						createDialog: [
							"枯心：请选择一项执行",
							[
								list.flatMap(([cards2, target]) => cards2.map(card => [card, target])),
								(item, type, position, noclick, node) => {
									node = ui.create.buttonPresets.card(item[0], type, position, noclick);
									game.createButtonCardsetion(item[1].getName(true), node);
									return node;
								},
							],
							[["获得所有角色的展示牌", "获得一名角色的未展示牌"].map((item, i) => [i, item]), "tdnodes"],
							[
								dialog => {
									dialog.css({ top: get.is.phoneLayout() ? "20%" : "40%" });
									dialog.buttons.forEach(button => {
										if (typeof button.link === "number") {
											button.style.setProperty("width", "200px", "important");
											button.style.setProperty("text-align", "left", "important");
										} else {
											button.style.setProperty("opacity", "1", "important");
										}
									});
									dialog.buttons = dialog.buttons.filter(button => typeof button.link === "number");
								},
								"handle",
							],
						],
						forced: true,
						filterTarget: lib.filter.notMe,
						selectTarget() {
							if (ui.selected.buttons.length) {
								const { link: link2 } = ui.selected.buttons[0];
								if (link2 === 1) return 1;
								return 0;
							}
							return 0;
						},
						filterOk() {
							if (ui.selected.buttons.length) {
								const { link: link2 } = ui.selected.buttons[0];
								if (link2 === 1) return ui.selected.targets.length === 1;
								return link2 === 0;
							}
							return false;
						},
						list,
						ai1(button) {
							const player2 = get.player();
							const cards2 =
								get
									.event()
									.list?.map(i => i[0])
									.flat() || [];
							const { num } = get.event().getTrigger();
							const { link: link2 } = button;
							if (typeof link2 !== "number") return 0;
							if (link2 === 1) {
								if (player2.isTurnedOver() && cards2.some(card => get.suit(card, false) === "heart")) return 2;
								if (cards2.length <= num * 2 && game.hasPlayer(current => current !== player2 && current.countCards("h", cardx => !cards2?.includes(cardx)) > cards2.length && get.attitude(player2, current) < 0)) return 2;
							}
							if (link2 === 0 && cards2.some(card => get.suit(card, false) === "heart")) return 1;
							return 1;
						},
						ai2(target) {
							if (ui.selected.buttons[0].link === 0) return 1;
							const player2 = get.player();
							const cards2 =
								get
									.event()
									.list?.map(i => i[0])
									.flat() || [];
							return -get.attitude(player2, target) * target.countCards("h", cardx => !cards2?.includes(cardx));
						},
					})
					.forResult();
				if (!result?.links?.length) return;
				const [link] = result.links;
				if (link === 0) {
					game.log(player, "选择了", "#g【枯心】", "的", "#y选项一");
					gains = list.flatMap(([cards2, target]) => cards2.filter(card => lib.filter.canBeGained(card, target, player)));
				} else if (link === 1 && result?.targets?.length) {
					game.log(player, "选择了", "#g【枯心】", "的", "#y选项二");
					const [target] = result.targets;
					player.line(target);
					gains = target.getCards("h", card => !list.flatMap(i => i[0]).includes(card) && lib.filter.canBeGained(card, target, player));
				}
			} else if (game.hasPlayer(target => target !== player)) {
				const targets2 = game.filterPlayer(target => target !== player);
				result =
					targets2.length === 1
						? { bool: true, targets: targets2 }
						: await player
								.chooseTarget("枯心：选择一名其他角色获得其未展示的手牌", true, lib.filter.notMe)
								.set("ai", target => {
									const player2 = get.player();
									return -get.attitude(player2, target) * target.countCards("h");
								})
								.forResult();
				if (result?.targets?.length) {
					game.log(player, "选择了", "#g【枯心】", "的", "#y选项二");
					const [target] = result.targets;
					player.line(target);
					gains = target.getCards("h", card => lib.filter.canBeGained(card, target, player));
				}
			}
			if (gains.length) {
				await player.gain(gains, "gain2");
				await player.showCards(gains);
			}
			if (!gains.some(card => get.suit(card, false) === "heart")) {
				if (gains.length) await player.discard(gains);
			}
		},
		ai: {
			maixie: true,
			maixie_hp: true,
			threaten(player, target) {
				if (target.getHp() === 1) return 2.5;
				return 0.5;
			},
			effect: {
				target(card, player, target) {
					if (!target._dekuxin_eff && get.tag(card, "damage") && target.getHp() > (player.hasSkillTag("damageBonus", true, { card, target }) ? 2 : 1)) {
						if (player.hasSkillTag("jueqing", false, target)) return [1, -2];
						target._dekuxin_eff = true;
						let gain = game.countPlayer(current => {
							if (target === current) return 0;
							if (get.attitude(target, current) > 0) return 0;
							if (current.hasCard(cardx => lib.filter.canBeGained(cardx, target, current, "twkuxin"), "h")) return 0.9;
							return 0;
						});
						delete target._dekuxin_eff;
						return [1, Math.max(0, gain)];
					}
				},
			},
		},
	}
```

### twsigu 名字:似故
描述: `出牌阶段限一次，你可令一名其他角色进行判定，令其获得${["zhichi", "reganglie", "refankui", "new_reyiji", "oljieming", "fangzhu", "shibei", "rechengxiang", "zhiyu", "jilei", "benyu", "chouce", "new_wuhun"].map(skill => get.poptip(skill)).join("")}中的第X个技能（X为判定点数）。若如此做，你对其造成两次1点伤害，然后其失去以此法获得的技能。`
```js
twsigu: {
		audio: "sxrmsigu",
		enable: "phaseUse",
		filter(event, player) {
			return game.hasPlayer(current => player !== current);
		},
		usable: 1,
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await target
				.judge(card => {
					if ([4, 5, 6, 8].includes(get.number(card))) {
						return 2;
					}
					if ([9, 12].includes(get.number(card))) {
						return 1;
					}
					return -1;
				})
				.forResult();
			if (!result?.number || result.number < 1 || result.number > 13) {
				return;
			}
			const name = get.info(event.name).pasts[result.number - 1];
			const skill = get.info(event.name).derivation[result.number - 1];
			const mark = `twsigu_${player.playerid}`;
			if (name && skill) {
				game.broadcastAll((player, name) => player.tempname.add(name), target, "tw_sxrm_caocao");
				await target.addAdditionalSkills(mark, [skill], true);
				target.addTip(mark, `似故 ${get.translation(skill)}`);
				target.setAvatar(target.name, name);
			} else {
				player.chat("孩子你是谁？");
			}
			await target.damage();
			await target.damage();
			if (name && skill) {
				if (Array.isArray(target.tempname)) {
					game.broadcastAll((player, name) => player.tempname.remove(name), target, "tw_sxrm_caocao");
				}
				target.removeAdditionalSkills(mark);
				target.removeTip(mark);
				target.setAvatar(target.name, target.name);
			}
		},
		ai: {
			order(item, player) {
				return get.order({ name: "sha" }) - 0.1;
			},
			result: {
				target(player, target) {
					const eff = get.damageEffect(target, player, player);
					const att = get.attitude(player, target);
					if (eff <= 0) {
						const numbers = [4, 5, 6, 8, 9, 12];
						if (att > 0 && player.hasSkillTag("rejudge") && target.getHp() + target.hujia >= 5 && eff >= -2 && player.hasCards("he", card => numbers.includes(get.number(card)))) return 0.1;
						if (eff === 0 && att < 0) return -0.1;
						return 0;
					}
					return (-eff * get.threaten(target)) / Math.sqrt(target.getHp() + target.hujia + 1) / Math.sqrt(target.countCards("h") + 1);
				},
			},
			tag: {
				damage: 1,
			},
		},
		pasts: ["chengong", "re_xiahoudun", "re_simayi", "re_guojia", "ol_xunyu", "sb_caopi", "jushou", "re_caochong", "re_xunyou", "yangxiu", "chengyu", "xizhicai", "shen_guanyu"],
		derivation: ["zhichi", "reganglie", "refankui", "new_reyiji", "oljieming", "fangzhu", "shibei", "rechengxiang", "zhiyu", "jilei", "benyu", "chouce", "new_wuhun"],
	}
```

### twkuimu 名字:窥目
描述: 每轮限一次，当一名角色的判定牌生效前，你可观看其所有手牌并选择一张代替之。若花色不同，你受到其造成的1点伤害。
```js
twkuimu: {
		audio: 2,
		trigger: { global: "judge" },
		filter(event, player) {
			return event.player.hasCards("h");
		},
		round: 1,
		prompt2(event, player) {
			return `观看${get.translation(event.player)}所有手牌并选择一张代替之。若花色不为${get.translation(get.suit(event.player.judging[0]))}，你受到其造成的1点伤害`;
		},
		check(event, player) {
			const target = event.player;
			const cards = event.player.getCards("h");
			const judging = target.judging[0];
			const attitude = get.attitude(player, target);
			const better = cards.some(card => {
				const diff = event.judge(card) - event.judge(judging);
				if (attitude > 0) {
					return diff > 0;
				}
				if (attitude < 0) {
					return diff < 0;
				}
				return false;
			});
			return better;
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			const judging = target.judging[0];
			if (!target.hasCards("h")) {
				return;
			}
			const result = await player
				.chooseCardButton(target.getCards("h"), 1, `窥目：选择${get.translation(target)}的一张手牌代替判定牌，若花色不为${get.translation(get.suit(judging))}，则你受到其造成的1点伤害`, true)
				.set("forced", true)
				.set("ai", button => {
					const card = button.link;
					const trigger2 = get.event().getTrigger();
					const judging = trigger2.player.judging[0];
					const result2 = trigger2.judge(card) - trigger2.judge(judging);
					const attitude = get.attitude(get.player(), trigger2.player);
					const val = get.value(card) / 4;
					if (attitude === 0 || result2 === 0) return 0;
					if (attitude > 0) return result2 - val;
					return -result2 - val;
				})
				.forResult();
			if (result?.links?.length) {
				game.broadcastAll(
					(card, player) => {
						const node = player.$throwordered(card.copy(), true);
						node.classList.add("thrownhighlight");
						ui.arena.classList.add("thrownhighlight");
					},
					result.links[0],
					player
				);
				if (target.judging[0].clone) {
					target.judging[0].clone.classList.remove("thrownhighlight");
					game.broadcast(card => {
						if (card.clone) {
							card.clone.classList.remove("thrownhighlight");
						}
					}, target.judging[0]);
					game.addVideo("deletenode", player, get.cardsInfo([target.judging[0].clone]));
				}
				await game.cardsDiscard(target.judging[0]);
				await target.lose(result.links).set("noOdering", true);
				trigger.player.judging[0] = result.links[0];
				trigger.orderingCards.addArray(result.links);
				game.log(trigger.player, "的判定牌改为", result.links[0]);
				await game.delay(2);
				if (get.suit(result.links[0]) != get.suit(judging)) {
					await player.damage(target);
				}
			}
		},
		ai: {
			rejudge: true,
			threaten: 1.5,
			tag: { rejudge: 1 },
		},
	}
```

## tw_sxrm_fuhuanghou 名字:TW疑伏寿 势力:qun

### twmitu 名字:密图
描述: 准备阶段，你可以令至多三名角色各摸两张牌并展示之，然后令这些角色依次选择是否与你指定的另一名角色拼点，拼点赢的角色视为对没赢的角色使用一张【杀】。每有一名角色未用以此法展示的牌进行拼点，你减少1点体力上限。
```js
twmitu: {
		audio: "sxrmmitu",
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), [1, 3])
				.set("ai", target => {
					return get.attitude(get.player(), target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			event.targets.sortBySeat();
			for (const target of event.targets) {
				const next = target.draw(2);
				next.gaintag.add("twmitu");
				const result = (await next.forResult()).cards;
				if (result?.length) {
					await target.showCards(result, "密图");
					event[target.playerid] = result[0];
				}
				target.addTempSkill("twmitu_ai", "phaseChange");
			}
			for (const target of event.targets) {
				if (!game.hasPlayer(current => target.canCompare(current))) {
					continue;
				}
				const result = await player
					.chooseTarget(
						`为${get.translation(target)}指定拼点目标`,
						(card, player, target) => {
							return get.event().comparer.canCompare(target);
						},
						true
					)
					.set("comparer", target)
					.set("ai", target => {
						const { player, comparer } = get.event();
						return get.effect(target, { name: "sha" }, comparer, player);
					})
					.forResult();
				if (result.bool) {
					const targetx = result.targets[0],
						card = target.getCards("h").find(card => card.hasGaintag("twmitu"));
					let bool = get.attitude(target, player) >= 0 ? get.effect(targetx, { name: "sha" }, target, target) > 0 : false;
					if (card && get.number(card) < 7 && get.attitude(target, player) > 0) {
						bool = false;
					}
					const result2 = await target
						.chooseBool(`是否与${get.translation(targetx)}进行拼点？`, "赢的角色视为对没赢的角色使用一张【杀】")
						.set("choice", bool)
						.forResult();
					if (result2.bool) {
						const result3 = await target.chooseToCompare(targetx).forResult();
						if (result3.winner) {
							const loser = [target, targetx].find(i => i != result3.winner),
								sha = new lib.element.VCard({ name: "sha", isCard: true });
							if (loser && result3.winner.canUse(sha, loser, false)) {
								await result3.winner.useCard(sha, loser, false);
							}
						}
					}
				}
			}
		},
		group: "twmitu_benghuai",
		subSkill: {
			ai: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("twmitu");
				},
				mod: {
					aiValue: (player, card, num) => {
						let evt = _status.event.getParent("twmitu", true);
						if (!evt || !evt.player || get.attitude(player, evt.player) <= 0) {
							return;
						}
						if (num > 0 && get.itemtype(card) === "card" && card.hasGaintag("twmitu")) {
							return -666;
						}
					},
				},
			},
			benghuai: {
				trigger: {
					global: "compare",
				},
				getIndex(event, player) {
					const evt = event.getParent("twmitu", true);
					if (!evt) {
						return [];
					}
					return [event.player, event.target].filter(current => {
						if (!evt.targets.includes(current)) {
							return false;
						}
						const card = event[event.player == current ? "card1" : "card2"],
							showed = evt[current.playerid];
						return showed && get.itemtype(showed) == "card" && showed != card;
					});
				},
				logTarget(event, player, name, index) {
					return index;
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					await player.loseMaxHp();
				},
			},
		},
	}
```

### twqianliu 名字:潜流
描述: 与你距离1以内的角色成为【杀】的目标后，你可以观看牌堆底三张牌并以任意顺序置于牌堆顶或牌堆底；若这些牌花色均相同或均不相同，你可以展示并获得这些牌。
```js
twqianliu: {
		audio: "sxrmqianliu",
		trigger: {
			global: "useCardToTargeted",
		},
		filter(event, player) {
			return get.distance(player, event.target) <= 1 && event.card?.name == "sha";
		},
		frequent: true,
		logTarget: "target",
		async content(event, trigger, player) {
			const cards = get.bottomCards(3);
			await game.cardsGotoOrdering(cards);
			const suits = cards.map(i => get.suit(i)).toUniqued();
			if (suits.length === 1 || suits.length === cards.length) {
				const result = await player
					.chooseBool(`是否展示并获得${get.translation(cards)}？`)
					.set("frequentSkill", event.name)
					.forResult();
				if (result.bool) {
					await player.showCards(cards);
					await player.gain(cards, "gain2");
					return;
				}
			}
			const result = await player
				.chooseToMove()
				.set("list", [["牌堆顶"], ["牌堆底", cards]])
				.set("prompt", "点击或拖动将牌移动到牌堆顶或牌堆底")
				.set("processAI", list => {
					let cards = list[1][1],
						player = _status.event.player,
						target = _status.currentPhase || player,
						name = _status.event.getTrigger()?.name,
						countWuxie = current => {
							let num = current.getKnownCards(player, card => {
								return get.name(card, current) === "wuxie";
							});
							if (num && current !== player) {
								return num;
							}
							let skills = current.getSkills("invisible").concat(lib.skill.global);
							game.expandSkills(skills);
							for (let i = 0; i < skills.length; i++) {
								let ifo = get.info(skills[i]);
								if (!ifo) {
									continue;
								}
								if (ifo.viewAs && typeof ifo.viewAs != "function" && ifo.viewAs.name == "wuxie") {
									if (!ifo.viewAsFilter || ifo.viewAsFilter(current)) {
										num++;
										break;
									}
								} else {
									let hiddenCard = ifo.hiddenCard;
									if (typeof hiddenCard == "function" && hiddenCard(current, "wuxie")) {
										num++;
										break;
									}
								}
							}
							return num;
						},
						top = [];
					switch (name) {
						case "phaseJieshu": {
							target = target.next;
							cards.sort((a, b) => {
								return get.value(b, target) - get.value(a, target);
							});
							while (cards.length) {
								if (get.value(cards[0], target) > 6) {
									top.push(cards.shift());
								} else {
									break;
								}
							}
							return [top, cards];
						}
						case "phaseZhunbei": {
							let att = get.sgn(get.attitude(player, target)),
								judges = target.getCards("j"),
								needs = 0,
								wuxie = countWuxie(target);
							for (let i = Math.min(cards.length, judges.length) - 1; i >= 0; i--) {
								let j = judges[i],
									cardj = j.viewAs ? { name: j.viewAs, cards: j.cards || [j] } : j;
								if (wuxie > 0 && get.effect(target, j, target, target) < 0) {
									wuxie--;
									continue;
								}
								let judge = get.judge(j);
								cards.sort((a, b) => {
									return (judge(b) - judge(a)) * att;
								});
								if (judge(cards[0]) * att < 0) {
									needs++;
									continue;
								} else {
									top.unshift(cards.shift());
								}
							}
							if (needs > 0 && needs >= judges.length) {
								return [top, cards];
							}
							cards.sort((a, b) => {
								return (get.value(b, target) - get.value(a, target)) * att;
							});
							while (needs--) {
								top.unshift(cards.shift());
							}
							while (cards.length) {
								if (get.value(cards[0], target) > 6 == att > 0) {
									top.push(cards.shift());
								} else {
									break;
								}
							}
							return [top, cards];
						}
						default:
							cards.sort((a, b) => {
								return get.value(b, target) - get.value(a, target);
							});
							while (cards.length) {
								if (get.value(cards[0], target) > 6) {
									top.push(cards.shift());
								} else {
									break;
								}
							}
							return [top, cards];
					}
				})
				.forResult();
			let top = result.moved[0],
				bottom = result.moved[1];
			top.reverse();
			for (let i = 0; i < top.length; i++) {
				ui.cardPile.insertBefore(top[i], ui.cardPile.firstChild);
			}
			for (let i = 0; i < bottom.length; i++) {
				ui.cardPile.appendChild(bottom[i]);
			}
			game.addCardKnower(top, player);
			game.addCardKnower(bottom, player);
			player.popup(get.cnNumber(top.length) + "上" + get.cnNumber(bottom.length) + "下");
			game.log(player, "将" + get.cnNumber(top.length) + "张牌置于牌堆顶");
			game.updateRoundNumber();
			await game.delayx();
		},
	}
```

