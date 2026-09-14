# guozhan 合并参考

## gz_liqueguosi 名字:李傕郭汜 势力:qun

### gz_xiongsuan 名字:凶算
描述: 限定技，出牌阶段，你可以弃置一张手牌并选择与你势力相同的一名角色，对其造成1点伤害，然后你摸三张牌。若该角色有已发动的限定技，则你选择其中一个限定技，此回合结束后视为该限定技未发动过。
```js
gz_xiongsuan: {
		audio: "xiongsuan",
		enable: "phaseUse",
		filter(_event, player) {
			return player.countCards("h") > 0;
		},
		filterCard: true,
		filterTarget(_card, player, target) {
			return target.isFriendOf(player);
		},
		check(card) {
			return 7 - get.value(card);
		},
		limited: true,
		async content(event, trigger, player) {
			const { target } = event;

			player.awakenSkill("gz_xiongsuan", undefined);
			await target.damage("nocard");
			await player.draw(3);

			const skills = target.getOriginalSkills();
			const list = skills.filter(skill => lib.skill[skill].limited && target.awakenedSkills.includes(skill));

			/** @type {Partial<Result>} */
			let result;
			if (list.length == 1) {
				result = {
					control: list[0],
				};
			} else if (list.length > 1) {
				result = await player.chooseControl(list).set("prompt", "选择一个限定技在回合结束后重置之").forResult();
			} else {
				return;
			}

			target.storage.gz_xiongsuan_restore = result.control;
			target.addTempSkill("gz_xiongsuan_restore");
		},
		subSkill: {
			restore: {
				trigger: {
					global: "phaseEnd",
				},
				forced: true,
				popup: false,
				charlotte: true,
				onremove: true,
				async content(_event, _trigger, player) {
					player.restoreSkill(player.storage.gz_xiongsuan_restore, undefined);
				},
			},
		},
		ai: {
			order: 4,
			damage: true,
			result: {
				target(player, target) {
					if (target.hp > 1) {
						var skills = target.getOriginalSkills();
						for (var i = 0; i < skills.length; i++) {
							if (lib.skill[skills[i]].limited && target.awakenedSkills.includes(skills[i])) {
								return 8;
							}
						}
					}
					if (target != player) {
						return 0;
					}
					if (get.damageEffect(target, player, player) >= 0) {
						return 10;
					}
					if (target.hp >= 4) {
						return 5;
					}
					if (target.hp == 3) {
						if (
							player.countCards("h") <= 2 &&
							game.hasPlayer(function (current) {
								return current.hp <= 1 && get.attitude(player, current) < 0;
							})
						) {
							return 3;
						}
					}
					return 0;
				},
			},
		},
	}
```

## gz_zuoci 名字:gz_zuoci 势力:qun

### fake_yigui 名字:役鬼
描述: ①当你首次明置此武将牌时，你将剩余武将牌堆的两张牌称为“魂”置于武将牌上。②你可以展示一张武将牌上的“魂”并将其置入剩余武将牌堆，视为使用一张本回合内未以此法使用过的类别的基本牌或普通锦囊牌（此牌须指定目标，且目标须为未确定势力的角色或野心家或与此“魂”势力相同的角色）。
```js
fake_yigui: {
		audio: "yigui",
		enable: "chooseToUse",
		filter(event, player) {
			if (event.type == "wuxie" || event.type == "respondShan") {
				return false;
			}
			const storage = player.getStorage("fake_yigui"),
				storage2 = player.getStorage("fake_yigui2");
			if (!storage.length || storage2.length > 1) {
				return false;
			}
			if (event.type == "dying") {
				if (storage2.includes("basic")) {
					return false;
				}
				if (!event.filterCard({ name: "tao" }, player, event) && !event.filterCard({ name: "jiu" }, player, event)) {
					return false;
				}
				// @ts-expect-error 类型系统未来可期
				const target = event.dying;
				return (
					target.identity == "unknown" ||
					target.identity == "ye" ||
					storage.some(i => {
						var group = get.character(i, 1);
						if (group == "ye" || target.identity == group) {
							return true;
						}
						// @ts-expect-error 类型系统未来可期
						var double = get.is.double(i, true);
						// @ts-expect-error 类型系统未来可期
						if (double && double.includes(target.identity)) {
							return true;
						}
					})
				);
			}
			return get
				.inpileVCardList(info => {
					const name = info[2];
					if (storage2.includes(get.type(name))) {
						return false;
					}
					return get.type(name) == "basic" || get.type(name) == "trick";
				})
				.some(cardx => {
					const card = { name: cardx[2], nature: cardx[3] },
						info = get.info(card);
					return storage.some(character => {
						if (!lib.filter.filterCard(card, player, event)) {
							return false;
						}
						if (event.filterCard && !event.filterCard(card, player, event)) {
							return false;
						}
						const group = get.character(character, 1),
							// @ts-expect-error 类型系统未来可期
							double = get.is.double(character, true);
						if (info.changeTarget) {
							// @ts-expect-error 类型系统未来可期
							const list = game.filterPlayer(current => player.canUse(card, current));
							for (let i = 0; i < list.length; i++) {
								let giveup = false,
									targets = [list[i]];
								info.changeTarget(player, targets);
								for (let j = 0; j < targets.length; j++) {
									// @ts-expect-error 类型系统未来可期
									if (group != "ye" && targets[j].identity != "unknown" && targets[j].identity != "ye" && targets[j].identity != group && (!double || !double.includes(targets[j].identity))) {
										giveup = true;
										break;
									}
								}
								if (giveup) {
									continue;
								}
								if (!giveup) {
									return true;
								}
							}
							return false;
						}
						return game.hasPlayer(current => {
							// @ts-expect-error 类型系统未来可期
							return event.filterTarget(card, player, current) && (group == "ye" || current.identity == "unknown" || current.identity == "ye" || current.identity == group || (double && double.includes(current.identity)));
						});
					});
				});
		},
		hiddenCard(player, name) {
			if (["shan", "wuxie"].includes(name) || !["basic", "trick"].includes(get.type(name))) {
				return false;
			}
			return lib.inpile.includes(name) && player.getStorage("fake_yigui").length && !player.getStorage("fake_yigui2").includes(get.type2(name));
		},
		chooseButton: {
			select: 2,
			dialog(event, player) {
				var dialog = ui.create.dialog("役鬼", "hidden");
				dialog.add([player.getStorage("fake_yigui"), "character"]);
				const list = get.inpileVCardList(info => {
					const name = info[2];
					if (player.getStorage("fake_yigui2").includes(get.type(name))) {
						return false;
					}
					return get.type(name) == "basic" || get.type(name) == "trick";
				});
				// @ts-expect-error 类型系统未来可期
				dialog.add([list, "vcard"]);
				return dialog;
			},
			filter(button, player) {
				// @ts-expect-error 类型系统未来可期
				var evt = _status.event.getParent("chooseToUse");
				if (!ui.selected.buttons.length) {
					// @ts-expect-error 类型系统未来可期
					if (typeof button.link != "string") {
						return false;
					}
					// @ts-expect-error 类型系统未来可期
					if (evt.type == "dying") {
						// @ts-expect-error 类型系统未来可期
						if (evt.dying.identity == "unknown" || evt.dying.identity == "ye") {
							return true;
						}
						// @ts-expect-error 类型系统未来可期
						var double = get.is.double(button.link, true);
						// @ts-expect-error 类型系统未来可期
						return evt.dying.identity == lib.character[button.link][1] || lib.character[button.link][1] == "ye" || (double && double.includes(evt.dying.identity));
					}
					return true;
				} else {
					// @ts-expect-error 类型系统未来可期
					if (typeof ui.selected.buttons[0].link != "string") {
						return false;
					}
					// @ts-expect-error 类型系统未来可期
					if (typeof button.link != "object") {
						return false;
					}
					// @ts-expect-error 类型系统未来可期
					var name = button.link[2];
					if (player.getStorage("fake_yigui2").includes(get.type(name))) {
						return false;
					}
					var card = { name: name };
					// @ts-expect-error 类型系统未来可期
					if (button.link[3]) {
						card.nature = button.link[3];
					}
					var info = get.info(card);
					// @ts-expect-error 类型系统未来可期
					var group = lib.character[ui.selected.buttons[0].link][1];
					// @ts-expect-error 类型系统未来可期
					var double = get.is.double(ui.selected.buttons[0].link, true);
					// @ts-expect-error 类型系统未来可期
					if (evt.type == "dying") {
						return evt.filterCard(card, player, evt);
					}
					if (!lib.filter.filterCard(card, player, evt)) {
						return false;
					}
					// @ts-expect-error 类型系统未来可期
					else if (evt.filterCard && !evt.filterCard(card, player, evt)) {
						return false;
					}
					if (info.changeTarget) {
						// @ts-expect-error 类型系统未来可期
						var list = game.filterPlayer(function (current) {
							return player.canUse(card, current);
						});
						for (var i = 0; i < list.length; i++) {
							var giveup = false;
							var targets = [list[i]];
							info.changeTarget(player, targets);
							for (var j = 0; j < targets.length; j++) {
								// @ts-expect-error 类型系统未来可期
								if (group != "ye" && targets[j].identity != "unknown" && targets[j].identity != "ye" && targets[j].identity != group && (!double || !double.includes(targets[j].identity))) {
									giveup = true;
									break;
								}
							}
							if (giveup) {
								continue;
							}
							if (giveup == false) {
								return true;
							}
						}
						return false;
					} else {
						return game.hasPlayer(function (current) {
							// @ts-expect-error 类型系统未来可期
							return evt.filterTarget(card, player, current) && (group == "ye" || current.identity == "unknown" || current.identity == "ye" || current.identity == group || (double && double.includes(current.identity)));
						});
					}
				}
			},
			check(button) {
				if (ui.selected.buttons.length) {
					// @ts-expect-error 类型系统未来可期
					var evt = _status.event.getParent("chooseToUse");
					// @ts-expect-error 类型系统未来可期
					var name = button.link[2];
					// @ts-expect-error 类型系统未来可期
					var group = lib.character[ui.selected.buttons[0].link][1];
					// @ts-expect-error 类型系统未来可期
					var double = get.is.double(ui.selected.buttons[0].link, true);
					// @ts-expect-error 类型系统未来可期
					var player = _status.event.player;
					// @ts-expect-error 类型系统未来可期
					if (evt.type == "dying") {
						// @ts-expect-error 类型系统未来可期
						if (evt.dying != player && get.effect(evt.dying, { name: name }, player, player) <= 0) {
							return 0;
						}
						if (name == "jiu") {
							return 2.1;
						}
						return 2;
					}
					if (!["tao", "juedou", "guohe", "shunshou", "wuzhong", "xietianzi", "yuanjiao", "taoyuan", "wugu", "wanjian", "nanman", "huoshaolianying"].includes(name)) {
						return 0;
					}
					if (["taoyuan", "wugu", "wanjian", "nanman", "huoshaolianying"].includes(name)) {
						var list = game.filterPlayer(function (current) {
							// @ts-expect-error 类型系统未来可期
							return (group == "ye" || current.identity == "unknown" || current.identity == "ye" || current.identity == group || (double && double.includes(current.identity))) && player.canUse({ name: name }, current);
						});
						var num = 0;
						for (var i = 0; i < list.length; i++) {
							num += get.effect(list[i], { name: name }, player, player);
						}
						if (num <= 0) {
							return 0;
						}
						if (list.length > 1) {
							return (1.7 + Math.random()) * Math.max(num, 1);
						}
					}
				}
				return 1 + Math.random();
			},
			backup(links, player) {
				var name = links[1][2],
					nature = links[1][3] || null;
				var character = links[0],
					group = lib.character[character][1];
				var next = {
					character: character,
					group: group,
					filterCard: () => false,
					selectCard: -1,
					popname: true,
					audio: "yigui",
					viewAs: {
						name: name,
						nature: nature,
						isCard: true,
					},
					filterTarget(card, player, target) {
						var xx = lib.skill.fake_yigui_backup;
						var evt = _status.event;
						var group = xx.group;
						// @ts-expect-error 类型系统未来可期
						var double = get.is.double(xx.character, true);
						var info = get.info(card);
						// @ts-expect-error 类型系统未来可期
						if (!(info.singleCard && ui.selected.targets.length) && group != "ye" && target.identity != "unknown" && target.identity != "ye" && target.identity != group && (!double || !double.includes(target.identity))) {
							return false;
						}
						if (info.changeTarget) {
							var targets = [target];
							info.changeTarget(player, targets);
							for (var i = 0; i < targets.length; i++) {
								// @ts-expect-error 类型系统未来可期
								if (group != "ye" && targets[i].identity != "unknown" && targets[i].identity != "ye" && targets[i].identity != group && (!double || !double.includes(targets[i].identity))) {
									return false;
								}
							}
						}
						// @ts-expect-error 类型系统未来可期
						if (evt._backup && evt._backup.filterTarget) {
							return evt._backup.filterTarget(card, player, target);
						}
						return lib.filter.filterTarget(card, player, target);
					},
					onuse(result, player) {
						var character = lib.skill.fake_yigui_backup.character;
						player.flashAvatar("fake_yigui", character);
						player.unmarkAuto("fake_yigui", [character]);
						// @ts-expect-error 类型系统未来可期
						_status.characterlist.add(character);
						game.log(player, "移去了一张", "#g“魂（" + get.translation(character) + "）”");
						if (!player.storage.fake_yigui2) {
							player.when({ global: "phaseBefore" }).step(async () => delete player.storage.fake_yigui2);
						}
						player.markAuto("fake_yigui2", [get.type(result.card.name)]);
					},
				};
				return next;
			},
			prompt(links, player) {
				var name = links[1][2],
					character = links[0],
					nature = links[1][3];
				return "移除「" + get.translation(character) + "」并视为使用" + (get.translation(nature) || "") + get.translation(name);
			},
		},
		ai: {
			order: () => 1 + 10 * Math.random(),
			result: { player: 1 },
		},
		group: "fake_yigui_init",
		marktext: "魂",
		intro: {
			onunmark(storage) {
				// @ts-expect-error 类型系统未来可期
				_status.characterlist.addArray(storage);
				storage = [];
			},
			mark(dialog, storage, player) {
				if (storage && storage.length) {
					// @ts-expect-error 类型系统未来可期
					if (player.isUnderControl(true)) {
						dialog.addSmall([storage, "character"]);
					} else {
						return "共有" + get.cnNumber(storage.length) + "张“魂”";
					}
				} else {
					return "没有“魂”";
				}
			},
			content(storage) {
				return "共有" + get.cnNumber(storage.length) + "张“魂”";
			},
		},
		gainHun(player, num) {
			// @ts-expect-error 类型系统未来可期
			const list = _status.characterlist.randomGets(num);
			if (list.length) {
				// @ts-expect-error 类型系统未来可期
				_status.characterlist.removeArray(list);
				player.markAuto("fake_yigui", list);
				get.info("rehuashen").drawCharacter(player, list);
				game.log(player, "获得了" + get.cnNumber(list.length) + "张", "#g“魂”");
			}
		},
		subSkill: {
			backup: {},
			init: {
				audio: "fake_yigui",
				trigger: { player: "showCharacterAfter" },
				filter(event, player) {
					// @ts-expect-error 类型系统未来可期
					if (!event.toShow.some(i => get.character(i, 3).includes("fake_yigui"))) {
						return false;
					}
					return (
						game
							.getAllGlobalHistory(
								"everything",
								evt => {
									// @ts-expect-error 类型系统未来可期
									return evt.name == "showCharacter" && evt.player == player && evt.toShow.some(i => get.character(i, 3).includes("fake_yigui"));
								},
								event
							)
							.indexOf(event) == 0
					);
				},
				forced: true,
				locked: false,
				async content(_event, _trigger, player) {
					get.info("fake_yigui").gainHun(player, 2);
				},
			},
		},
	}
```

### fake_jihun 名字:汲魂
描述: ①当你受到伤害后，或与你势力不同的角色脱离濒死状态后，你可以将剩余武将牌堆的一张牌称为“魂”置于武将牌上。②准备阶段，你可以将至多两张“魂”置入剩余武将牌堆，然后将剩余武将牌堆的等量张牌称为“魂”置于武将牌上。
```js
fake_jihun: {
		audio: "jihun",
		inherit: "jihun",
		async content(_event, _trigger, player) {
			get.info("fake_yigui").gainHun(player, 1);
		},
		ai: {
			combo: "fake_yigui",
		},
		group: "fake_jihun_zhiheng",
		subSkill: {
			zhiheng: {
				audio: "jihun",
				trigger: {
					player: "phaseZhunbeiBegin",
				},
				filter(_event, player) {
					return player.getStorage("fake_yigui").length;
				},
				async cost(event, trigger, player) {
					const { bool, links } = await player.chooseButton([get.prompt("fake_jihun"), '<div class="text center">弃置至多两张“魂”，然后获得等量的“魂”</div>', [player.getStorage("fake_yigui"), "character"]], [1, 2]).set("ai", button => {
						const getNum = character => {
							return (
								// @ts-expect-error 类型系统未来可期
								game.countPlayer(target => {
									const group = get.character(character, 1);
									if (group == "ye" || target.identity == group) {
										return true;
									}
									// @ts-expect-error 类型系统未来可期
									const double = get.is.double(character, true);
									// @ts-expect-error 类型系统未来可期
									if (double && double.includes(target.identity)) {
										return true;
									}
								}) + 1
							);
						};
						// @ts-expect-error 类型系统未来可期
						return game.countPlayer() - getNum(button.link);
					}).forResult();
					event.result = { bool: bool, cost_data: links };
				},
				async content(event, trigger, player) {
					player.unmarkAuto("fake_yigui", event.cost_data);
					// @ts-expect-error 类型系统未来可期
					_status.characterlist.addArray(event.cost_data);
					game.log(player, "移除了" + get.cnNumber(event.cost_data.length) + "张", "#g“魂”");
					get.info("fake_yigui").gainHun(player, event.cost_data.length);
				},
			},
		},
	}
```

## gz_bianfuren 名字:卞夫人 势力:wei

### wanwei
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_yuejian 名字:约俭
描述: 锁定技，与你势力相同角色的弃牌阶段开始时，若其本回合未使用牌指定过其他势力的角色为目标，则该角色本回合手牌上限+X（X为其已损失的体力值）。
```js
gz_yuejian: {
		audio: "yuejian",
		trigger: {
			global: "phaseDiscardBegin",
		},
		forced: true,
		preHidden: true,
		filter(event, player) {
			if (player.isFriendOf(event.player)) {
				return (
					event.player.getHistory("useCard", function (evt) {
						if (evt.targets) {
							var targets = evt.targets.slice(0);
							while (targets.includes(event.player)) {
								targets.remove(event.player);
							}
							return targets.length != 0;
						}
						return false;
					}).length == 0
				);
			}
			return false;
		},
		logTarget: "player",
		async content(_event, trigger, _player) {
			trigger.player.addTempSkill("gz_yuejian_num");
		},
		subSkill: {
			num: {
				mod: {
					maxHandcardBase(player, _num) {
						return player.maxHp;
					},
				},
			},
		},
	}
```

## gz_xunyou 名字:gz_xunyou 势力:wei

### gz_qice 名字:奇策
描述: 出牌阶段限一次，你可以将所有手牌当做任意一张普通锦囊牌使用（此牌的目标数不能超过你的手牌数）。然后，你可以变更副将。
```js
gz_qice: {
		audio: "qice",
		usable: 1,
		enable: "phaseUse",
		filter(_event, player) {
			var hs = player.getCards("h");
			if (!hs.length) {
				return false;
			}
			for (var i = 0; i < hs.length; i++) {
				// @ts-expect-error 类型系统未来可期
				var mod2 = game.checkMod(hs[i], player, "unchanged", "cardEnabled2", player);
				if (mod2 === false) {
					return false;
				}
			}
			return true;
		},
		chooseButton: {
			dialog() {
				var list = lib.inpile;
				var list2 = [];
				for (var i = 0; i < list.length; i++) {
					if (list[i] != "wuxie" && get.type(list[i]) == "trick") {
						list2.push(["锦囊", "", list[i]]);
					}
				}
				return ui.create.dialog(get.translation("gz_qice"), [list2, "vcard"]);
			},
			filter(button, player) {
				// @ts-expect-error 类型系统未来可期
				var card = { name: button.link[2] };
				var info = get.info(card);
				var num = player.countCards("h");
				//if(get.tag(card,'multitarget')&&get.select(info.selectTarget)[1]==-1){
				if (get.select(info.selectTarget)[1] == -1) {
					if (
						// @ts-expect-error 类型系统未来可期
						game.countPlayer(function (current) {
							return player.canUse(card, current);
						}) > num
					) {
						return false;
					}
				} else if (info.changeTarget) {
					var giveup = true;
					// @ts-expect-error 类型系统未来可期
					var list = game.filterPlayer(function (current) {
						return player.canUse(card, current);
					});
					for (var i = 0; i < list.length; i++) {
						var targets = [list[i]];
						info.changeTarget(player, targets);
						if (targets.length <= num) {
							giveup = false;
							break;
						}
					}
					if (giveup) {
						return false;
					}
				}
				// @ts-expect-error 类型系统未来可期
				return lib.filter.filterCard(card, player, _status.event.getParent());
			},
			check(button) {
				// @ts-expect-error 类型系统未来可期
				if (["chiling", "xietianzi", "tiesuo", "lulitongxin", "diaohulishan", "jiedao"].includes(button.link[2])) {
					return 0;
				}
				// @ts-expect-error 类型系统未来可期
				return _status.event.player.getUseValue(button.link[2]);
			},
			backup(links, player) {
				return {
					filterCard: true,
					audio: "qice",
					selectCard: -1,
					position: "h",
					selectTarget() {
						// @ts-expect-error 类型系统未来可期
						var select = get.select(get.info(get.card()).selectTarget);
						// @ts-expect-error 类型系统未来可期
						var nh = _status.event.player.countCards("h");
						if (select[1] > nh) {
							select[1] = nh;
						}
						return select;
					},
					filterTarget(card, player, target) {
						var info = get.info(card);
						if (info.changeTarget) {
							var targets = [target];
							info.changeTarget(player, targets);
							if (targets.length > player.countCards("h")) {
								return false;
							}
						}
						return lib.filter.filterTarget(card, player, target);
					},
					popname: true,
					viewAs: { name: links[0][2] },
					ai1() {
						return 1;
					},
				};
			},
			prompt(links, player) {
				return "将全部手牌当作" + get.translation(links[0][2]) + "使用";
			},
		},
		group: "gz_qice_change",
		subSkill: {
			change: {
				trigger: {
					player: "useCardAfter",
				},
				filter(event, player) {
					return event.skill == "gz_qice_backup";
				},
				silent: true,
				async content(event, _trigger, player) {
					await player.mayChangeVice(undefined, undefined);
					event.skill = "gz_qice";
					event.trigger("skillAfter");
				},
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
					return 16 - num;
				},
			},
			threaten: 1.6,
		},
	}
```

### zhiyu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_lingtong 名字:gz_lingtong 势力:wu

### xuanlve 名字:旋略
描述: 当你失去装备区里的牌后，你可以弃置一名其他角色的一张牌。
```js
xuanlve: {
		audio: 2,
		trigger: {
			player: "loseAfter",
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		preHidden: true,
		filter(event, player) {
			var evt = event.getl(player);
			return evt && evt.es && evt.es.length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt(event.skill), "弃置一名其他角色的一张牌", (card, player, target) => {
					return target != player && target.countDiscardableCards(player, "he");
				})
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "guohe_copy2" }, player, player);
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discardPlayerCard(event.targets[0], "he", true);
		},
		ai: {
			noe: true,
			reverseEquip: true,
			effect: {
				target(card, player, target, current) {
					if (get.type(card) == "equip") {
						return [1, 1];
					}
				},
			},
		},
	}
```

### yongjin
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_lvfan 名字:吕范 势力:wu

### gz_diaodu_best 名字:调度
描述: ①与你势力相同的角色使用装备牌时，其可以摸一张牌。②出牌阶段开始时，你可以获得一名与你势力相同的角色的装备区里的一张牌，然后你可以将此牌交给另一名与你势力相同的其他角色。
```js
gz_diaodu_best: {
		audio: "diaodu",
		trigger: {
			player: "phaseUseBegin",
		},
		filter(event, player) {
			return game.hasPlayer(current => {
				if (!current.isFriendOf(player)) {
					return false;
				}
				return current.countGainableCards(player, "e") > 0;
			});
		},
		frequent: true,
		preHidden: true,
		async cost(event, trigger, player) {
			const next = player.chooseTarget(get.prompt2("gz_diaodu_best"), (_card, player, current) => current.isFriendOf(player) && current.countGainableCards(player, "e") > 0);

			next.set("ai", target => {
				let num = 0;

				if (target.hasSkill("gz_xiaoji")) {
					num += 2.5;
				}
				if (target.isDamaged() && target.getEquip("baiyin")) {
					num += 2.5;
				}
				if (target.hasSkill("xuanlve")) {
					num += 2;
				}

				return num;
			});

			next.setHiddenSkill("gz_diaodu_best");

			event.result = await next.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player.gainPlayerCard(target, "e", true).forResult();

			if (!result.bool) {
				return;
			}

			const card = result.cards?.[0];
			if (!card || !player.getCards("h").includes(card)) {
				return;
			}

			const next = player.chooseTarget(`是否将${get.translation(card)}交给一名其他角色？`);
			next.set("filterTarget", (_card, player, current) => {
				const event = get.event();
				return current !== player && current !== event.target && player.isFriendOf(current);
			});
			next.set("target", target);

			const result2 = await next.forResult();

			if (result2.bool && result2.targets?.length) {
				const target2 = result2.targets[0];
				player.line(target2, "green");
				await player.give(card, target2);
			}
		},
		group: "gz_diaodu_best_use",
		subSkill: {
			use: {
				audio: "diaodu",
				trigger: {
					global: "useCard",
				},
				filter(event, player) {
					if (get.type(event.card) !== "equip") {
						return false;
					}
					if (!event.player.isIn()) {
						return false;
					}
					if (!event.player.isFriendOf(player)) {
						return false;
					}
					return player === event.player || player.hasSkill("gz_diaodu_best");
				},
				logTarget: "player",
				async cost(event, trigger, player) {
					const next = trigger.player.chooseBool(get.prompt("gz_diaodu_best"), "摸一张牌");

					if (player.hasSkill("gz_diaodu_best")) {
						next.set("frequentSkill", "gz_diaodu_best");
					}
					if (player === trigger.player) {
						next.setHiddenSkill("gz_diaodu_best");
					}

					event.result = await next.forResult();
				},
				async content(event, trigger, player) {
					trigger.player.draw("nodelay");
				},
			},
		},
	}
```

### gz_diancai 名字:典财
描述: 其他角色的出牌阶段结束时，若你于此阶段失去了x张或更多的牌，则你可以将手牌摸至体力上限。若如此做，你可以变更副将（x为你的体力值）。
```js
gz_diancai: {
		audio: "diancai",
		trigger: {
			global: "phaseUseEnd",
		},
		preHidden: true,
		filter(event, player) {
			// @ts-expect-error 类型系统未来可期
			if (_status.currentPhase === player) {
				return false;
			}

			let num = 0;

			player.getHistory("lose", evt => {
				// @ts-expect-error 类型系统未来可期
				if (evt.cards2 && evt.getParent("phaseUse") === event) {
					// @ts-expect-error 类型系统未来可期
					num += evt.cards2.length;
				}
				return false;
			});

			return num >= player.hp;
		},
		async content(event, trigger, player) {
			const num = player.maxHp - player.countCards("h");
			if (num > 0) {
				await player.draw(num);
			}

			await player.mayChangeVice(undefined, undefined);
		},
	}
```

## gz_masu 名字:马谡 势力:shu

### gz_sanyao 名字:散谣
描述: 出牌阶段限一次。你可以弃置一张牌，对一名手牌数或体力值大于你的角色造成1点伤害。
```js
gz_sanyao: {
		audio: "sanyao",
		inherit: "sanyao",
		filterTarget(card, player, target) {
			return target.hp > player.hp || target.countCards("h") > player.countCards("h");
		},
	}
```

### gz_zhiman 名字:制蛮
描述: 当你对其他角色造成伤害时，你可以防止此伤害。若如此做，你获得其装备区或判定区里的一张牌。然后若该角色与你势力相同，该角色可以变更副将。
```js
gz_zhiman: {
		audio: "zhiman",
		inherit: "zhiman",
		preHidden: true,
		async content(_event, trigger, player) {
			if (trigger.player.countGainableCards(player, "ej")) {
				await player.gainPlayerCard(trigger.player, "ej", true);
			}
			trigger.cancel(undefined, undefined, undefined);

			if (player.isFriendOf(trigger.player)) {
				await trigger.player.mayChangeVice();
			}
		},
	}
```

## gz_shamoke 名字:沙摩柯 势力:shu

### gzjili
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_shibing1wei 名字:魏兵 势力:wei

## gz_shibing2wei 名字:魏兵 势力:wei

## gz_shibing1shu 名字:蜀兵 势力:shu

## gz_shibing2shu 名字:蜀兵 势力:shu

## gz_shibing1wu 名字:吴兵 势力:wu

## gz_shibing2wu 名字:吴兵 势力:wu

## gz_shibing1qun 名字:群兵 势力:qun

## gz_shibing2qun 名字:群兵 势力:qun

## gz_shibing1jin 名字:晋兵 势力:jin

## gz_shibing2jin 名字:晋兵 势力:jin

## gz_shibing1ye 名字:士兵 势力:ye

## gz_shibing2ye 名字:士兵 势力:ye

## gz_shibing1key 名字:键兵 势力:key

## gz_shibing2key 名字:键兵 势力:key

## gz_caocao 名字:曹操 势力:wei

### gz_jianxiong 名字:奸雄
描述: 当你受到伤害后，你可以摸一张牌或获得对你造成伤害的牌。
```js
gz_jianxiong: {
		audio: "jianxiong",
		trigger: {
			player: "damageEnd",
		},
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} trigger
		 * @param {PlayerGuozhan} player
		 */
		async cost(event, trigger, player) {
			let list = ["摸牌"];
			if (get.itemtype(trigger.cards) == "cards" && trigger.cards.filterInD().length) {
				list.push("拿牌");
			}
			list.push("cancel2");
			const { control } = await player
				.chooseControl(list)
				.set("prompt", get.prompt2("rejianxiong_old"))
				.set("ai", () => {
					const player = get.event().player,
						trigger = get.event().getTrigger();
					const cards = trigger.cards ? trigger.cards.filterInD() : [];
					// @ts-expect-error 类型就是这么写的
					if (get.event().controls.includes("拿牌")) {
						if (
							cards.reduce((sum, card) => {
								return sum + (card.name == "du" ? -1 : 1);
							}, 0) > 1 ||
							player.getUseValue(cards[0]) > 6
						) {
							return "拿牌";
						}
					}
					return "摸牌";
				}).forResult();
			event.result = { bool: control != "cancel2", cost_data: { result: control } };
		},
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} trigger
		 * @param {PlayerGuozhan} player
		 */
		async content(event, trigger, player) {
			if (event.cost_data.result == "摸牌") {
				await player.draw();
			} else {
				await player.gain(trigger.cards.filterInD(), "gain2");
			}
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
						return [1, 0.6];
					}
				},
			},
		},
	}
```

## gz_simayi 名字:司马懿 势力:wei

### guicai
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### fankui
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_xiahoudun 名字:夏侯惇 势力:wei

### gz_ganglie 名字:刚烈
描述: 当你受到伤害后，你可进行判定，若结果为：红色，你对伤害来源造成1点伤害；黑色，你弃置伤害来源一张牌。
```js
gz_ganglie: {
		audio: "ganglie", // TODO: 改成独立的配音
		trigger: {
			player: "damageEnd",
		},
		/**
		 * @param {GameEvent} event
		 * @param {PlayerGuozhan} _player
		 * @returns {boolean}
		 */
		filter(event, _player) {
			return event.source != undefined && event.num > 0;
		},
		/**
		 * @param {GameEvent} event
		 * @param {PlayerGuozhan} player
		 * @returns {boolean}
		 */
		check(event, player) {
			return get.attitude(player, event.source) <= 0;
		},
		logTarget: "source",
		preHidden: true,
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} trigger
		 * @param {PlayerGuozhan} player
		 */
		async content(event, trigger, player) {
			const result = await player.judge(card => (get.color(card) == "red" ? 1 : 0)).forResult();

			switch (result.color) {
				case "black":
					if (trigger.source.countCards("he")) {
						player.discardPlayerCard(trigger.source, "he", true);
					}
					break;

				case "red":
					if (trigger.source.isIn()) {
						trigger.source.damage();
					}
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

## gz_zhangliao 名字:张辽 势力:wei

### gz_tuxi 名字:突袭
描述: 摸牌阶段摸牌时，你可以少摸至多两张牌，然后获得等量的角色的各一张手牌。
```js
gz_tuxi: {
		audio: "tuxi", // TODO: 改成独立的配音
		audioname2: {
			gz_jun_caocao: "jianan_tuxi",
		},
		trigger: {
			player: "phaseDrawBegin2",
		},
		preHidden: true,
		/**
		 * @param {GameEvent} event
		 * @param {PlayerGuozhan} player
		 * @returns {boolean}
		 */
		filter(event, player) {
			// @ts-expect-error 类型就是这么写的
			return event.num > 0 && !event.numFixed && game.hasPlayer(target => target.countCards("h") > 0 && player != target);
		},
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} trigger
		 * @param {PlayerGuozhan} player
		 */
		async cost(event, trigger, player) {
			const num = Math.min(trigger.num, 2);

			const next = player.chooseTarget(
				get.prompt("gz_tuxi"),
				`获得至多${get.translation(num)}名角色的各一张手牌，然后少摸等量的牌`,
				[1, num],
				(_card, player, target) => target.countCards("h") > 0 && player != target,
				target => {
					const att = get.attitude(_status.event?.player, target);
					if (target.hasSkill("tuntian")) {
						return att / 10;
					}
					return 1 - att;
				}
			);
			next.setHiddenSkill("gz_tuxi");

			event.result = await next.forResult();
		},
		logTarget: "targets",
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} trigger
		 * @param {PlayerGuozhan} player
		 */
		async content(event, trigger, player) {
			const { targets } = event;
			targets.sortBySeat();
			await player.gainMultiple(targets);
			trigger.num -= targets.length;
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

## gz_xuzhu 名字:许褚 势力:wei

### gz_luoyi 名字:裸衣
描述: 摸牌阶段结束时，你可弃置一张牌，然后你于本回合内造成渠道为【杀】或【决斗】的伤害+1。
```js
gz_luoyi: {
		audio: "luoyi",
		trigger: {
			player: "phaseDrawEnd",
		},
		preHidden: true,
		/**
		 * @param {GameEvent} _event
		 * @param {PlayerGuozhan} player
		 * @returns {boolean}
		 */
		filter(_event, player) {
			return player.countCards("he") > 0;
		},
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} _trigger
		 * @param {PlayerGuozhan} player
		 */
		async cost(event, _trigger, player) {
			const next = player.chooseToDiscard("he", get.prompt2("gz_luoyi"));

			next.setHiddenSkill("gz_luoyi");
			next.set("ai", check);

			event.result = await next.forResult();

			return;

			/**
			 * @param {Card} card
			 * @returns {number}
			 */
			function check(card) {
				const player = get.player();

				if (player.hasCard(cardx => cardx != card && (cardx.name == "sha" || cardx.name == "juedou") && player.hasValueTarget(cardx, undefined, true), "hs")) {
					return 5 - get.value(card);
				}

				return -get.value(card);
			}
		},
		/**
		 * @param {GameEvent} _event
		 * @param {GameEvent} _trigger
		 * @param {PlayerGuozhan} player
		 */
		async content(_event, _trigger, player) {
			player.addTempSkill("gz_luoyi_buff");
		},
		subSkill: {
			buff: {
				audio: "luoyi",
				charlotte: true,
				forced: true,
				trigger: {
					source: "damageBegin1",
				},
				/**
				 * @param {GameEvent} event
				 * @param {PlayerGuozhan} _player
				 * @returns {boolean}
				 */
				filter(event, _player) {
					const parent = event.getParent();
					if (parent == null || !("type" in parent)) {
						return false;
					}
					return event.card && (event.card.name == "sha" || event.card.name == "juedou") && parent.type == "card";
				},
				/**
				 * @param {GameEvent} _event
				 * @param {GameEvent} trigger
				 * @param {PlayerGuozhan} _player
				 */
				async content(_event, trigger, _player) {
					trigger.num++;
				},
			},
		},
	}
```

## gz_guojia 名字:郭嘉 势力:wei

### tiandu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_yiji 名字:遗计
描述: 当你受到伤害后，你可以观看牌堆顶的两张牌，并将其交给任意角色。
```js
gz_yiji: {
		audio: "yiji",
		trigger: {
			player: "damageEnd",
		},
		frequent: true,
		preHidden: true,

		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} trigger
		 * @param {PlayerGuozhan} player
		 */
		async content(event, trigger, player) {
			const cards = game.cardsGotoOrdering(get.cards(2)).cards;
			/** @type {Map<string, Card[]>} */
			const givenMap = new Map();

			if (_status.connectMode) {
				broadcastAll(() => {
					Reflect.set(_status, "noclearcountdown", true);
				});
			}

			while (cards.length > 0) {
				/** @type {Partial<Result>} */
				let result;

				if (cards.length > 1) {
					result = await player
						.chooseCardButton("遗计：请选择要分配的牌", true, cards, [1, cards.length])
						.set("ai", () => {
							if (ui.selected.buttons.length == 0) {
								return 1;
							}
							return 0;
						})
						.forResult();
				} else {
					result = { bool: true, links: cards.slice(0) };
				}

				if (!result.bool) {
					break;
				}

				cards.removeArray(result.links);
				const toGive = result.links.slice(0);

				result = await player
					.chooseTarget("选择一名角色获得" + get.translation(result.links), true)
					.set("ai", (/** @type {PlayerGuozhan} */ target) => {
						const event = get.event();
						const att = get.attitude(event.player, target);
						if (event.enemy) {
							return -att;
						} else if (att > 0) {
							return att / (1 + target.countCards("h"));
						} else {
							return att / 100;
						}
					})
					.set("enemy", get.value(toGive[0], player, "raw") < 0)
					.forResult();

				if (!result.bool) {
					break;
				}

				const targets = result.targets;
				if (targets.length) {
					const id = targets[0].playerid ?? "";

					if (!givenMap.has(id)) {
						givenMap.set(id, []);
					}
					const current = givenMap.get(id);
					current?.addArray(toGive);
				}
			}

			if (_status.connectMode) {
				broadcastAll(() => {
					Reflect.deleteProperty(_status, "noclearcountdown");
					game.stopCountChoose();
				});
			}

			const list = [];
			for (const [id, cards] of givenMap) {
				const source = (_status.connectMode ? lib.playerOL : game.playerMap)[id];
				player.line(source, "green");
				list.push([source, cards]);
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

## gz_zhenji 名字:甄宓 势力:wei

### luoshen
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### qingguo
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_xiahouyuan 名字:夏侯渊 势力:wei

### gz_shensu 名字:神速
描述: ①判定阶段开始时，你可跳过此阶段和摸牌阶段，视为使用一张【杀】（无距离限制）。②出牌阶段开始时，你可跳过此阶段并弃置一张装备牌，视为使用一张【杀】（无距离限制）。③弃牌开始时，你可跳过此阶段并失去1点体力，视为使用一张【杀】（无距离限制）。
```js
gz_shensu: {
		audio: "shensu1", // TODO: 独立素材，留给后来人
		audioname: ["xiahouba", "re_xiahouyuan", "ol_xiahouyuan"],
		group: ["gz_shensu_1", "gz_shensu_2"],
		preHidden: ["gz_hensu_1", "gz_shensu_2", "gz_shensu"],
		trigger: {
			player: "phaseDiscardBegin",
		},
		/**
		 * @param {GameEvent} _event
		 * @param {PlayerGuozhan} player
		 * @returns {boolean}
		 */
		filter(_event, player) {
			return player.hp > 0;
		},
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} _trigger
		 * @param {PlayerGuozhan} player
		 */
		async cost(event, _trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("gz_shensu"), "失去1点体力并跳过弃牌阶段，视为对一名其他角色使用一张无距离限制的【杀】", (card, player, target) => player.canUse("sha", target, false))
				.setHiddenSkill("gz_shensu")
				.set("goon", player.needsToDiscard())
				.set("ai", target => {
					const event = get.event();
					const player = get.player();
					if (!event.goon || player.hp <= target.hp) {
						return false;
					}
					return get.effect(target, { name: "sha", isCard: true }, player, player);
				})
				.forResult();
		},
		logTarget: "targets",
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} trigger
		 * @param {PlayerGuozhan} player
		 */
		async content(event, trigger, player) {
			const { targets } = event;
			const target = targets[0];
			await player.loseHp();
			trigger.cancel();
			await player.useCard({ name: "sha", isCard: true }, target, false);
		},
		subSkill: {
			// TODO: 后面或许将不存在shensu1，所以后来人需要重新填写技能信息
			1: {
				audio: "shensu1",
				inherit: "shensu1",
				sourceSkill: "gz_shensu",
			},
			2: {
				inherit: "shensu2",
				sourceSkill: "gz_shensu",
			},
		},
	}
```

## gz_zhanghe 名字:张郃 势力:wei

### gz_qiaobian 名字:巧变
描述: 你可以弃置一张手牌并跳过自己的一个阶段（准备阶段和结束阶段除外）。若你以此法跳过了摸牌阶段，则你可以获得至多两名其他角色的各一张手牌；若你以此法跳过了出牌阶段，则你可以移动场上的一张牌。
```js
gz_qiaobian: {
		audio: "qiaobian", // TODO: 你说得对，未来得拆，未来可期
		audioname2: { gz_jun_caocao: "jianan_qiaobian" },
		trigger: {
			player: ["phaseJudgeBefore", "phaseDrawBefore", "phaseUseBefore", "phaseDiscardBefore"],
		},
		/**
		 * @param {GameEvent} _event
		 * @param {PlayerGuozhan} player
		 * @returns {boolean}
		 */
		filter(_event, player) {
			return player.countCards("h") > 0;
		},
		preHidden: true,
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} trigger
		 * @param {PlayerGuozhan} player
		 */
		async cost(event, trigger, player) {
			let check;
			let str = "弃置一张手牌并跳过";
			str += ["判定", "摸牌", "出牌", "弃牌"][lib.skill.qiaobian?.trigger?.player?.indexOf(event.triggername) ?? 0];
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
					let i;
					let num = 0;
					let num2 = 0;
					const players = game.filterPlayer(lib.filter.all);
					for (i = 0; i < players.length; i++) {
						// @ts-expect-error type be right
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
						check = game.hasPlayer(current => {
							return get.attitude(player, current) > 0 && current.countCards("j") > 0;
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
				.chooseToDiscard(get.prompt("qiaobian"), str, lib.filter.cardDiscardable)
				.set("ai", card => {
					const event = get.event();
					if (!event.check) {
						return -1;
					}
					return 7 - get.value(card);
				})
				.set("check", check)
				.setHiddenSkill("qiaobian")
				.forResult();
		},
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} trigger
		 * @param {PlayerGuozhan} player
		 */
		async content(event, trigger, player) {
			trigger.cancel();
			game.log(player, "跳过了", "#y" + ["判定", "摸牌", "出牌", "弃牌"][lib.skill.qiaobian?.trigger?.player?.indexOf(event.triggername) ?? 0] + "阶段");
			if (trigger.name == "phaseUse") {
				if (player.canMoveCard()) {
					await player.moveCard();
				}
			} else if (trigger.name == "phaseDraw") {
				const result = await player
					.chooseTarget([1, 2], "获得至多两名角色各一张手牌", function (card, player, target) {
						return target != player && target.countCards("h");
					})
					.set("ai", target => {
						return 1 - get.attitude(get.player(), target);
					})
					.forResult();
				if (!result.bool) {
					return;
				}
				result.targets?.sortBySeat();
				player.line(result.targets, "green");
				if (!result.targets?.length) {
					return;
				}
				await player.gainMultiple(result.targets);
				await game.delay();
			}
		},
		ai: {
			threaten: 3,
		},
	}
```

## gz_xuhuang 名字:徐晃 势力:wei

### gz_duanliang 名字:断粮
描述: 出牌阶段，你可以将一张黑色基本牌或黑色装备牌当做【兵粮寸断】使用。你使用【兵粮寸断】没有距离限制。若你对距离超过2的角色发动了〖断粮〗，则本回合不能再发动〖断粮〗。
```js
gz_duanliang: {
		locked: false,
		audio: "duanliang1", // 未来可期未来改
		audioname2: {
			gz_jun_caocao: "jianan_duanliang",
		},
		enable: "chooseToUse",
		/**
		 * @param {Card} card
		 * @returns {boolean}
		 */
		filterCard(card) {
			if (get.type(card) != "basic" && get.type(card) != "equip") {
				return false;
			}
			return get.color(card) == "black";
		},
		/**
		 * @param {GameEvent} _event
		 * @param {PlayerGuozhan} player
		 * @returns {boolean}
		 */
		filter(_event, player) {
			if (player.hasSkill("gz_duanliang_off")) {
				return false;
			}
			return player.countCards("hes", { type: ["basic", "equip"], color: "black" }) > 0;
		},
		position: "hes",
		viewAs: {
			name: "bingliang",
		},
		onuse(result, player) {
			if (get.distance(player, result.targets[0]) > 2) {
				player.addTempSkill("gz_duanliang_off");
			}
		},
		prompt: "将一黑色的基本牌或装备牌当兵粮寸断使用",
		check(card) {
			return 6 - get.value(card);
		},
		mod: {
			targetInRange(card, player, target) {
				if (card.name == "bingliang") {
					return true;
				}
			},
		},
		ai: {
			order: 9,
			basic: {
				order: 1,
				useful: 1,
				value: 4,
			},
			result: {
				target(player, target) {
					if (target.hasJudge("caomu")) {
						return 0;
					}
					return -1.5 / Math.sqrt(target.countCards("h") + 1);
				},
			},
			tag: {
				skip: "phaseDraw",
			},
		},
		subSkill: {
			off: {
				sub: true,
			},
		},
	}
```

## gz_caoren 名字:曹仁 势力:wei

### gz_jushou 名字:据守
描述: 结束阶段，你可以摸X张牌（X为亮明势力数），然后弃置一张手牌。若以此法弃置的牌为装备牌，则改为使用此牌。若X大于2，则你将武将牌叠置。
```js
gz_jushou: {
		audio: "xinjushou", // 你懂我要说什么.png
		trigger: {
			player: "phaseJieshuBegin",
		},
		preHidden: true,
		/**
		 * @param {GameEvent} event
		 * @param {GameEvent} trigger
		 * @param {PlayerGuozhan} player
		 */
		async content(event, trigger, player) {
			"step 0";
			const groups = [];
			const players = game.filterPlayer(lib.filter.all);

			for (const target of players) {
				if (target.isUnseen(-1)) {
					continue;
				}
				let add = true;
				for (const group of groups) {
					if (group.isFriendOf(target)) {
						add = false;
						break;
					}
				}
				if (add) {
					groups.add(target);
				}
			}
			const num = groups.length;
			await player.draw(num);
			if (num > 2) {
				await player.turnOver();
			}

			const result = await player
				.chooseCard("h", true, "弃置一张手牌，若以此法弃置的是装备牌，则你改为使用之")
				.set("ai", (/** @type {Card} */ card) => {
					if (get.type(card) == "equip") {
						return 5 - get.value(card);
					}
					return -get.value(card);
				})
				.set("filterCard", lib.filter.cardDiscardable)
				.forResult();

			if (result.bool && result.cards?.length) {
				if (get.type(result.cards[0]) == "equip" && player.hasUseTarget(result.cards[0])) {
					player.chooseUseTarget(result.cards[0], true, "nopopup");
				} else {
					player.discard(result.cards[0]);
				}
			}
		},
	}
```

## gz_dianwei 名字:典韦 势力:wei

### gz_qiangxi 名字:强袭
描述: 出牌阶段对每名其他角色限一次，你可以选择一项：1. 失去1点体力并对你攻击范围内的一名其他角色造成1点伤害；2. 弃置一张武器牌并对你攻击范围内的一名其他角色造成1点伤害。
```js
gz_qiangxi: {
		audio: "qiangxi", // 已经，没有什么好怕的了（
		enable: "phaseUse",
		filterCard(card) {
			return get.subtype(card) == "equip1";
		},
		selectCard() {
			return [0, 1];
		},
		filterTarget(_card, player, target) {
			if (player == target) {
				return false;
			}
			if (target.hasSkill("gz_qiangxi_off")) {
				return false;
			}
			return player.inRange(target);
		},
		async content(event, _trigger, player) {
			const { cards, target } = event;

			if (cards.length == 0) {
				await player.loseHp();
			}

			target.addTempSkill("gz_qiangxi_off", "phaseUseAfter");
			await target.damage("nocard");
		},
		/**
		 * @param {Card} card
		 * @returns {number}
		 */
		check(card) {
			return 10 - get.value(card);
		},
		position: "he",
		ai: {
			order: 8.5,
			threaten: 1.5,
			result: {
				target(player, target) {
					if (!ui.selected.cards.length) {
						if (player.hp < 2) {
							return 0;
						}
						if (target.hp >= player.hp) {
							return 0;
						}
					}
					return get.damageEffect(target, player);
				},
			},
		},
		subSkill: {
			off: {
				sub: true,
			},
		},
	}
```

## gz_xunyu 名字:荀彧 势力:wei

### gz_quhu 名字:驱虎
描述: 出牌阶段限一次，你可以与一名体力值大于你的角色拼点，若你赢，则该角色对其攻击范围内另一名由你指定的角色造成1点伤害。若你没赢，该角色对你造成1点伤害。
```js
gz_quhu: {
		audio: "quhu",
		audioname: ["re_xunyu", "ol_xunyu"],
		enable: "phaseUse",
		usable: 1,
		filter(_event, player) {
			if (player.countCards("h") == 0) {
				return false;
			}
			return game.hasPlayer(current => current.hp > player.hp && player.canCompare(current));
		},
		filterTarget(_card, player, target) {
			return target.hp > player.hp && player.canCompare(target);
		},
		async content(event, _trigger, player) {
			const target = event.target;
			const { bool } = await player.chooseToCompare(target, void 0).forResult();
			if (!bool) {
				return void (await player.damage(target));
			}
			if (!game.hasPlayer(player => player != target && target.inRange(player))) {
				return;
			}
			const result = await player
				.chooseTarget((card, player, target) => {
					const source = _status.event?.source;
					return target != source && source?.inRange(target);
				}, true)
				.set("ai", target => get.damageEffect(target, _status.event?.source, player))
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
					const players = game.filterPlayer(lib.filter.all);
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
						const num = get.number(hs[i]);
						if (typeof num == "number") {
							mn = Math.max(mn, num);
						}
					}
					if (mn <= 11 && player.hp < 2) {
						return -20;
					}
					let max = player.maxHp - hs.length;
					const players = game.filterPlayer(lib.filter.all);
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

### gz_jieming 名字:节命
描述: 当你受到伤害后，你可以令一名角色将手牌摸至X张（X为其体力上限且最多为5）。
```js
gz_jieming: {
		audio: "jieming",
		trigger: {
			player: "damageEnd",
		},
		preHidden: true,
		async cost(event, _trigger, player) {
			const next = player.chooseTarget(get.prompt("gz_jieming"), "令一名角色将手牌补至X张（X为其体力上限且至多为5）");

			next.set("ai", check);
			next.setHiddenSkill("gz_jieming");

			event.result = await next.forResult();

			/**
			 * @param {PlayerGuozhan} target
			 */
			function check(target) {
				const player = get.player();
				const att = get.attitude(player, target);
				if (att > 2) {
					return Math.max(0, Math.min(5, target.maxHp) - target.countCards("h"));
				}
				return att / 3;
			}
		},
		logTarget: "targets",
		async content(event, _trigger, _player) {
			for (const target of event.targets) {
				const num = Math.min(5, target.maxHp) - target.countCards("h");
				if (num > 0) {
					await target.draw(num);
				}
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
						let max = 0;
						const players = game.filterPlayer(lib.filter.all);
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

## gz_caopi 名字:曹丕 势力:wei

### gz_xingshang 名字:行殇
描述: 当有角色死亡后，你可以获得该角色的所有牌。
```js
gz_xingshang: {
		audio: "xingshang",
		trigger: {
			global: "die",
		},
		preHidden: true,
		target: "player",
		filter(event) {
			return event.player.countCards("he") > 0;
		},
		async content(_event, trigger, player) {
			const toGain = trigger.player.getCards("he");
			await player.gain(toGain, trigger.player, "giveAuto", "bySelf");
		},
	}
```

### gz_fangzhu 名字:放逐
描述: 当你受到伤害后，你可以令一名其他角色选择一项：⒈摸X张牌并将武将牌叠置；⒉弃置X张牌并失去1点体力（X为你已损失的体力值）。
```js
gz_fangzhu: {
		audio: "fangzhu",
		audioname2: {
			new_simayi: "refangzhu_new_simayi",
		},
		trigger: {
			player: "damageEnd",
		},
		preHidden: true,
		async cost(event, _trigger, player) {
			const next = player.chooseTarget(get.prompt2("gz_fangzhu"), (_card, player, target) => player != target);

			next.setHiddenSkill("gz_fangzhu");
			next.set("ai", check);

			event.result = await next.forResult();

			return;

			function check(target) {
				if (target.hasSkillTag("noturn")) {
					return 0;
				}

				const player = get.player();
				const att = get.attitude(player, target);

				if (att == 0) {
					return 0;
				}
				if (att > 0) {
					if (target.isTurnedOver()) {
						return 1000 - target.countCards("h");
					}
					return -1;
				} else {
					if (target.isTurnedOver()) {
						return -1;
					}
					if (player.getDamagedHp() >= 3) {
						return -1;
					}
					return target.countCards("h") + 1;
				}
			}
		},
		logTarget: "targets",
		async content(event, _trigger, player) {
			const { targets } = event;
			const target = targets[0];
			const num = player.getDamagedHp();

			/**
			 * @type {Partial<Result>}
			 */
			let result;

			if (num > 0) {
				const str = [`放逐：弃置${get.cnNumber(num)}张牌并失去1点体力`, `或者点击“取消”不弃牌，改为摸${get.cnNumber(num)}张牌并叠置`];
				const next = target.chooseToDiscard(num, "he", ...str);
				next.set("ai", check);

				result = await next.forResult();
			} else {
				result = {
					bool: false,
					cards: [],
				};
			}

			if (result.bool) {
				await target.loseHp();
			} else {
				if (num > 0) {
					await target.draw(num);
				}
				await target.turnOver(void 0);
			}

			return;

			function check(card) {
				const player = get.player();
				if (player.isTurnedOver()) {
					return -1;
				}
				return player.hp * player.hp - Math.max(1, get.value(card));
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
						if (target.hp <= 1) {
							return;
						}
						if (!target.hasFriend()) {
							return;
						}
						let hastarget = false;
						let turnfriend = false;
						const players = game.filterPlayer(lib.filter.all);
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

## gz_yuejin 名字:乐进 势力:wei

### gz_xiaoguo 名字:骁果
描述: 一名其他角色的准备阶段，你可以弃置任意张基本牌，然后弃置其装备区等量的牌，若其装备区的牌数小于你弃置的牌数，则你对其造成1点伤害。
```js
gz_xiaoguo: {
		audio: "xiaoguo",
		audioname2: {
			gz_jun_caocao: "jianan_xiaoguo",
		},
		trigger: {
			global: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			return (
				event.player != player &&
				player.countCards("h", card => {
					if (_status.connectMode) {
						return true;
					}
					// @ts-expect-error 类型系统未来可期
					return get.type(card) == "basic" && lib.filter.cardDiscardable(card, player);
				}) > 0
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(
					get.prompt2("gz_xiaoguo", trigger.player),
					(card, player) => {
						return get.type(card) == "basic";
					},
					[1, Infinity]
				)
				.set("complexSelect", true)
				.set("ai", card => {
					const player = get.event().player,
						target = get.event().getTrigger().player;
					const effect = get.damageEffect(target, player, player);
					const cards = target.getCards("e", card => get.attitude(player, target) * get.value(card, target) < 0);
					if (effect <= 0 && !cards.length) {
						return 0;
					}
					if (ui.selected.cards.length > cards.length - (effect <= 0 ? 1 : 0)) {
						return 0;
					}
					return 1 / (get.value(card) || 0.5);
				})
				.set("logSkill", ["gz_xiaoguo", trigger.player])
				.setHiddenSkill("gz_xiaoguo")
				.forResult();
		},
		popup: false,
		preHidden: true,
		async content(event, trigger, player) {
			const num = trigger.player.countCards("e");
			const num2 = event.cards.length;
			await player.discardPlayerCard(trigger.player, "e", num2, true, "allowChooseAll");
			if (num2 > num) {
				await trigger.player.damage();
			}
		},
	}
```

## gz_liubei 名字:刘备 势力:shu

### gz_rende 名字:仁德
描述: 出牌阶段，你可以将至少一张手牌交给其他角色，然后你于此阶段内不能再以此法交给该角色牌；若你于此阶段内给出的牌首次达到两张，你可以视为使用一张基本牌。
```js
gz_rende: {
		audio: "rerende",
		audioname: ["gz_jun_liubei"],
		enable: "phaseUse",
		filter(_event, player) {
			// @ts-expect-error 类型系统未来可期
			return player.countCards("h") > 0 && game.hasPlayer(current => get.info("gz_rende").filterTarget?.(null, player, current));
		},
		filterTarget(_card, player, target) {
			if (player == target) {
				return false;
			}
			return !player.getStorage("gz_rende_targeted").includes(target);
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
			const player = get.owner(card);
			if (player == null) {
				return 0;
			}
			if (ui.selected.cards.length >= Math.max(2, player.countCards("h") - player.hp)) {
				return 0;
			}
			if (player.hp == player.maxHp || player.storage.rerende < 0 || player.countCards("h") <= 1) {
				const players = game.filterPlayer(lib.filter.all);
				for (let i = 0; i < players.length; i++) {
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
		async content(event, _trigger, player) {
			const { target, cards, name } = event;
			player.addTempSkill(name + "_targeted", "phaseUseAfter");
			player.markAuto(name + "_targeted", [target]);
			let num = 0;
			player.getHistory("lose", evt => {
				// @ts-expect-error 类型系统未来可期
				if (evt.getParent(2)?.name == name) {
					num += evt.cards.length;
				}
				return true;
			});
			await player.give(cards, target);
			const list = get.inpileVCardList(info => {
				return get.type(info[2]) == "basic" && player.hasUseTarget(new lib.element.VCard({ name: info[2], nature: info[3], isCard: true }), void 0, true);
			});
			if (num < 2 && num + cards.length > 1 && list.length) {
				const { links } = await player
					.chooseButton(["是否视为使用一张基本牌？", [list, "vcard"]])
					.set("ai", button => {
						return get.player().getUseValue({ name: button.link[2], nature: button.link[3], isCard: true });
					})
					.forResult();
				if (!links?.length) {
					return;
				}
				await player.chooseUseTarget(get.autoViewAs({ name: links[0][2], nature: links[0][3], isCard: true }), true);
			}
		},
		ai: {
			fireAttack: true,
			order(skill, player) {
				if (player.hp < player.maxHp && player.storage.rerende < 2 && player.countCards("h") > 1) {
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
					const nh = target.countCards("h");
					const np = player.countCards("h");
					if (player.hp == player.maxHp || player.storage.rerende < 0 || player.countCards("h") <= 1) {
						if (nh >= np - 1 && np <= player.hp && !target.hasSkill("haoshi")) {
							return 0;
						}
					}
					return Math.max(1, 5 - nh);
				},
			},
			effect: {
				// @ts-expect-error 类型系统未来可期
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
			threaten: 0.8,
		},
		subSkill: {
			targeted: {
				onremove: true,
				charlotte: true,
			},
		},
	}
```

## gz_guanyu 名字:关羽 势力:shu

### gz_wusheng 名字:武圣
描述: 你可以将一张红色牌当做【杀】使用或打出。你使用的方片【杀】没有距离限制。
```js
gz_wusheng: {
		audio: "wusheng",
		audioname: ["re_guanyu", "jsp_guanyu", "re_guanzhang", "dc_jsp_guanyu"],
		audioname2: {
			gz_guansuo: "wusheng_guansuo",
			dc_guansuo: "wusheng_guansuo",
			guanzhang: "wusheng_guanzhang",
			guansuo: "wusheng_guansuo",
			gz_jun_liubei: "shouyue_wusheng",
			std_guanxing: "wusheng_guanzhang",
			ty_guanxing: "wusheng_guanzhang",
		},
		enable: ["chooseToRespond", "chooseToUse"],
		filterCard(card, player) {
			if (get.zhu(player, "shouyue")) {
				return true;
			}
			return get.color(card) == "red";
		},
		locked: false,
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
			const val = get.value(card);
			const event = get.event();
			if (event.name == "chooseToRespond") {
				return 1 / Math.max(0.1, val);
			}
			return 5 - val;
		},
		mod: {
			targetInRange(card) {
				if (get.suit(card) == "diamond" && card.name == "sha") {
					return true;
				}
			},
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

## gz_zhangfei 名字:张飞 势力:shu

### gz_paoxiao 名字:咆哮
描述: 锁定技，你使用【杀】无数量限制；当你于一回合内使用第二张【杀】时，摸一张牌。
```js
gz_paoxiao: {
		audio: "paoxiao",
		audioname2: {
			gz_jun_liubei: "shouyue_paoxiao",
		},
		trigger: {
			player: "useCard",
		},
		filter(event, player) {
			// @ts-expect-error 类型系统未来可期
			if (_status.currentPhase != player) {
				return false;
			}
			if (event.card.name != "sha") {
				return false;
			}
			const history = player.getHistory("useCard", evt => {
				return evt.card.name == "sha";
			});
			return history && history.indexOf(event) == 1;
		},
		forced: true,
		preHidden: true,
		async content(_event, _trigger, player) {
			await player.draw();
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

## gz_zhugeliang 名字:诸葛亮 势力:shu

### guanxing
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_kongcheng 名字:空城
描述: 锁定技，若你没有手牌，1.当你成为【杀】或【决斗】的目标时，取消之；2.你的回合外，其他角色交给你牌后，你将这些牌置于你的武将牌上。摸牌阶段开始时，你获得武将牌上的这些牌。
```js
gz_kongcheng: {
		audio: "kongcheng",
		trigger: {
			target: "useCardToTarget",
		},
		locked: true,
		forced: true,
		check(event, player) {
			return get.effect(event.target, event.card, event.player, player) < 0;
		},
		filter(event, player) {
			return player.countCards("h") == 0 && (event.card.name == "sha" || event.card.name == "juedou");
		},
		async content(_event, trigger, player) {
			// @ts-expect-error 类型系统未来可期
			trigger.getParent()?.targets.remove(player);
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		ai: {
			effect: {
				target(card, _player, target, _current) {
					if (target.countCards("h") == 0 && (card.name == "sha" || card.name == "juedou")) {
						return "zeroplayertarget";
					}
				},
			},
		},
		intro: {
			markcount: "expansion",
			mark(dialog, _content, player) {
				const contents = player.getExpansions("gz_kongcheng");
				if (contents?.length) {
					if (player == game.me || player.isUnderControl(void 0, void 0)) {
						dialog.addAuto(contents);
					} else {
						return "共有" + get.cnNumber(contents.length) + "张牌";
					}
				}
			},
			content(_content, player) {
				const contents = player.getExpansions("gz_kongcheng");
				if (contents && contents.length) {
					if (player == game.me || player.isUnderControl(void 0, void 0)) {
						return get.translation(contents);
					}
					return "共有" + get.cnNumber(contents.length) + "张牌";
				}
			},
		},
		group: ["gz_kongcheng_gain", "gz_kongcheng_got"],
		subSkill: {
			gain: {
				audio: "kongcheng",
				trigger: {
					player: "gainBefore",
				},
				filter(event, player) {
					// @ts-expect-error 类型系统未来可期
					return event.source && event.source != player && player != _status.currentPhase && !event.bySelf && player.countCards("h") == 0;
				},
				async content(_event, trigger, _player) {
					trigger.name = "addToExpansion";
					trigger.setContent("addToExpansion");
					// @ts-expect-error 类型系统未来可期
					trigger.gaintag = ["gz_kongcheng"];
					// @ts-expect-error 类型系统未来可期
					trigger.untrigger();
					trigger.trigger("addToExpansionBefore");
				},
				sub: true,
				forced: true,
			},
			got: {
				trigger: {
					player: "phaseDrawBegin1",
				},
				filter(_event, player) {
					return player.getExpansions("gz_kongcheng").length > 0;
				},
				async content(_event, _trigger, player) {
					player.gain(player.getExpansions("gz_kongcheng"), "draw");
				},
				sub: true,
				forced: true,
			},
		},
	}
```

## gz_zhaoyun 名字:赵云 势力:shu

### gz_longdan 名字:龙胆
描述: 你可以将【杀】当【闪】，【闪】当【杀】使用或打出。当你发动〖龙胆〗使用的【杀】被【闪】抵消时，你可以对另一名角色造成1点伤害；当你发动〖龙胆〗使用的【闪】抵消了【杀】时，你可以令一名其他角色回复1点体力（不能是【杀】的使用者）。
```js
gz_longdan: {
		audio: "longdan_sha",
		audioname2: { gz_jun_liubei: "shouyue_longdan" },
		group: ["gz_longdan_sha", "gz_longdan_shan", "gz_longdan_draw", "gz_longdan_shamiss", "gz_longdan_shanafter"],
		subSkill: {
			shanafter: {
				sub: true,
				audio: "longdan_sha",
				audioname2: { gz_jun_liubei: "shouyue_longdan" },
				trigger: {
					player: "useCard",
				},
				//priority:1,
				filter(event, _player) {
					// @ts-expect-error 类型系统未来可期
					return event.skill == "gz_longdan_shan" && event.getParent(2)?.name == "sha";
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget("是否发动【龙胆】令一名其他角色回复1点体力？", function (card, player, target) {
							return target != _status.event?.source && target != player && target.isDamaged();
						})
						.set("ai", function (target) {
							return get.attitude(_status.event?.player, target);
						})
						// @ts-expect-error 类型系统未来可期
						.set("source", trigger.getParent(2)?.player)
						.forResult();
				},
				logTarget: "targets",
				async content(event, _trigger, _player) {
					await event.targets[0].recover();
				},
			},
			shamiss: {
				sub: true,
				audio: "longdan_sha",
				audioname2: { gz_jun_liubei: "shouyue_longdan" },
				trigger: {
					player: "shaMiss",
				},
				filter(event, player) {
					return event.skill == "gz_longdan_sha";
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget("是否发动【龙胆】对一名其他角色造成1点伤害？", function (card, player, target) {
							return target != _status.event?.target && target != player;
						})
						.set("ai", function (target) {
							return -get.attitude(_status.event?.player, target);
						})
						.set("target", trigger.target)
						.forResult();
				},
				logTarget: "targets",
				async content(event, _trigger, _player) {
					await event.targets[0].damage();
				},
			},
			draw: {
				trigger: {
					player: ["useCard", "respond"],
				},
				audio: "longdan_sha",
				audioname2: { gz_jun_liubei: "shouyue_longdan" },
				forced: true,
				locked: false,
				filter(event, player) {
					if (!get.zhu(player, "shouyue")) {
						return false;
					}
					return event.skill == "gz_longdan_sha" || event.skill == "gz_longdan_shan";
				},
				async content(_event, _trigger, player) {
					player.draw();
					//player.storage.fanghun2++;
				},
				sub: true,
			},
			sha: {
				audio: "longdan_sha",
				audioname2: { gz_jun_liubei: "shouyue_longdan" },
				enable: ["chooseToUse", "chooseToRespond"],
				filterCard: {
					name: "shan",
				},
				viewAs: {
					name: "sha",
				},
				position: "hs",
				viewAsFilter(player) {
					if (!player.countCards("hs", "shan")) {
						return false;
					}
				},
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
						if (!player.countCards("hs", "shan")) {
							return false;
						}
					},
					order() {
						return get.order({ name: "sha" }) + 0.1;
					},
				},
				sub: true,
			},
			shan: {
				audio: "longdan_sha",
				audioname2: { gz_jun_liubei: "shouyue_longdan" },
				enable: ["chooseToRespond", "chooseToUse"],
				filterCard: {
					name: "sha",
				},
				viewAs: {
					name: "shan",
				},
				position: "hs",
				prompt: "将一张杀当闪使用或打出",
				check() {
					return 1;
				},
				viewAsFilter(player) {
					if (!player.countCards("hs", "sha")) {
						return false;
					}
				},
				ai: {
					respondShan: true,
					skillTagFilter(player) {
						if (!player.countCards("hs", "sha")) {
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
				sub: true,
			},
		},
	}
```

## gz_machao 名字:马超 势力:shu

### gz_mashu 名字:马术
描述: 锁定技，你计算与其他角色的距离时-1。
```js
gz_mashu: {
		mod: {
			globalFrom(from, to, distance) {
				return distance - 1;
			},
		},
	}
```

### gz_tieji 名字:铁骑
描述: 当你使用【杀】指定目标后，你可以令其一张明置的武将牌上的非锁定技于本回合内失效，然后你进行判定，除非该角色弃置与结果花色相同的一张牌，否则其不能使用【闪】响应此【杀】。
```js
gz_tieji: {
		audio: "retieji",
		audioname2: {
			gz_jun_liubei: "shouyue_tieji",
		},
		trigger: {
			player: "useCardToPlayered",
		},
		check(event, player) {
			return get.attitude(player, event.target) < 0;
		},
		filter(event) {
			return event.card.name == "sha";
		},
		logTarget: "target",
		async content(_event, trigger, player) {
			const { target } = trigger;

			/** @type {string[]} */
			const addingSkills = [];
			const targetMainShowing = !target.isUnseen(0);
			const targetViceShowing = !target.isUnseen(1);
			if (get.zhu(player, "shouyue")) {
				if (targetMainShowing) {
					addingSkills.push("fengyin_main");
				}
				if (targetViceShowing) {
					addingSkills.push("fengyin_vice");
				}
			} else {
				const controls = [];
				if (targetMainShowing && !target.hasSkill("fengyin_main")) {
					controls.push("主将");
				}
				if (targetViceShowing && !target.hasSkill("fengyin_vice")) {
					controls.push("副将");
				}

				/** @type {?Partial<Result>} */
				let result = null;

				if (controls.length == 1) {
					result = { control: controls[0] };
				} else if (controls.length > 1) {
					result = await player
						.chooseControl(controls)
						.set("ai", () => {
							let choice = "主将";
							const skills = lib.character[target.name2][3];
							for (const skill of skills) {
								const info = get.info(skill);
								if (info?.ai?.maixie) {
									choice = "副将";
									break;
								}
							}
							return choice;
						})
						.set("prompt", `请选择一个武将牌，令${get.translation(target)}该武将牌上的非锁定技全部失效。`)
						.forResult();
				}

				if (result?.control) {
					const map = {
						主将: "fengyin_main",
						副将: "fengyin_vice",
					};

					addingSkills.push(map[result.control]);
				}
			}

			addingSkills.forEach(skill => {
				target.addTempSkill(skill);
			});

			const result = await player.judge(() => 0).forResult();

			// @ts-expect-error 类型系统未来可期
			const suit = get.suit(result.card);
			const num = target.countCards("h", "shan");
			const result2 = await target
				.chooseToDiscard("请弃置一张" + get.translation(suit) + "牌，否则不能使用闪抵消此杀", "he", function (card) {
					// @ts-expect-error 类型系统未来可期
					return get.suit(card) == get.event().suit;
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
				.set("num", num)
				.set("suit", suit)
				.forResult();

			if (result2 && !result2.bool) {
				// @ts-expect-error 类型系统未来可期
				trigger.getParent().directHit.add(trigger.target);
			}
		},
	}
```

## gz_huangyueying 名字:黄月英 势力:shu

### gz_jizhi 名字:集智
描述: 当你使用非转化的普通锦囊牌时，你可以摸一张牌。
```js
gz_jizhi: {
		audio: "jizhi",
		trigger: { player: "useCard" },
		frequent: true,
		preHidden: true,
		filter(event) {
			return get.type(event.card) == "trick" && event.card.isCard;
		},
		async content(event, trigger, player) {
			await player.draw("nodelay");
		},
		ai: {
			threaten: 1.4,
			noautowuxie: true,
		},
	}
```

### qicai
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_huangzhong 名字:黄忠 势力:shu

### gz_liegong 名字:烈弓
描述: ①你对手牌数不大于你的角色使用【杀】不受距离关系的限制。②当你使用【杀】指定目标后，若其体力值不小于你，则你可以选择一项：⒈令此【杀】对其的伤害值基数+1。⒉令其不可响应此【杀】。
```js
gz_liegong: {
		audio: "liegong",
		audioname2: {
			gz_jun_liubei: "shouyue_liegong",
		},
		trigger: {
			player: "useCardToPlayered",
		},
		locked: false,
		filter(event, player) {
			return event.card.name == "sha" && player.hp <= event.target.hp;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			const target = get.translation(trigger.target);
			const card = get.translation(trigger.card);

			const next = player.chooseControl("cancel2");

			next.set("prompt", get.prompt("gz_liegong", trigger.target));
			next.set("choiceList", [`令${card}对${target}的伤害+1`, `令${target}不能响应${card}`]);
			next.set("ai", check);
			next.setHiddenSkill("gz_liegong");

			const result = await next.forResult();

			event.result = {
				bool: result.control != "cancel2",
				targets: [trigger.target],
				cost_data: {
					index: result.index,
					control: result.control,
				},
			};

			return;

			function check() {
				const player = get.player();
				const target = get.event().getTrigger().target;

				if (get.attitude(player, target) > 0) {
					return 2;
				}

				return target.mayHaveShan(player, "use") ? 1 : 0;
			}
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const [target] = event.targets;

			const { index } = event.cost_data;

			if (index == 1) {
				game.log(trigger.card, "不可被", target, "响应");
				// @ts-expect-error 类型系统未来可期
				trigger.directHit.add(target);
			} else {
				game.log(trigger.card, "对", target, "的伤害+1");
				// @ts-expect-error 类型系统未来可期
				const map = trigger.getParent()?.customArgs;
				const id = target.playerid;
				map[id] ??= {};
				map[id].extraDamage ??= 0;
				map[id].extraDamage++;
			}
		},
		mod: {
			targetInRange(card, player, target) {
				if (card.name == "sha" && target.countCards("h") < player.countCards("h")) {
					return true;
				}
			},
			attackRange(player, distance) {
				if (get.zhu(player, "shouyue")) {
					return distance + 1;
				}
			},
		},
	}
```

## gz_weiyan 名字:魏延 势力:shu

### gz_kuanggu 名字:狂骨
描述: 当你造成1点伤害后，若受伤角色受到此伤害时你与其的距离不大于1，则你可以回复1点体力或摸一张牌。
```js
gz_kuanggu: {
		audio: "kuanggu",
		audioname: ["re_weiyan", "ol_weiyan"],
		trigger: {
			source: "damageSource",
		},
		filter(event, _player) {
			// @ts-expect-error 类型系统未来可期
			return event.checkKuanggu && event.num > 0;
		},
		getIndex(event, _player, _triggername) {
			return event.num;
		},
		preHidden: true,
		async cost(event, _trigger, player) {
			let choice;
			if (
				player.isDamaged() &&
				get.recoverEffect(player) > 0 &&
				player.countCards("hs", function (card) {
					return card.name == "sha" && player.hasValueTarget(card);
				}) >= player.getCardUsable("sha", void 0)
			) {
				choice = "recover_hp";
			} else {
				choice = "draw_card";
			}
			const next = player.chooseDrawRecover("###" + get.prompt(event.skill) + "###摸一张牌或回复1点体力");
			next.set("choice", choice);
			next.set("ai", function () {
				// @ts-expect-error 类型系统未来可期
				return _status.event.getParent().choice;
			});
			next.set("logSkill", event.skill);
			next.setHiddenSkill(event.skill);
			const { control } = await next.forResult();
			if (control == "cancel2") {
				return;
			}
			event.result = { bool: true, skill_popup: false };
		},
		async content(_event, _trigger, _player) {},
	}
```

## gz_pangtong 名字:庞统 势力:shu

### gz_lianhuan 名字:连环
描述: 你可以将♣手牌当作【铁索连环】使用或重铸。
```js
gz_lianhuan: {
		audio: "lianhuan",
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
			return get.effect(target, { name: "tiesuo" }, player, player);
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

### gz_niepan 名字:涅槃
描述: 限定技，当你处于濒死状态时，你可以弃置你区域内的所有牌并复原你的武将牌，然后摸三张牌并将体力回复至3点。
```js
gz_niepan: {
		audio: "niepan",
		audioname2: {
			sb_pangtong: "sbniepan",
		},
		unique: true,
		enable: "chooseToUse",
		mark: true,
		skillAnimation: true,
		limited: true,
		animationColor: "orange",
		init(player) {
			player.storage.gz_niepan = false;
		},
		filter(event, player) {
			if (player.storage.gz_niepan) {
				return false;
			}
			if (event.type == "dying") {
				// @ts-expect-error 类型系统未来可期
				if (player != event.dying) {
					return false;
				}
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			player.awakenSkill("gz_niepan", void 0);
			player.storage.gz_niepan = true;
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
		intro: {
			content: "limited",
		},
	}
```

## gz_sp_zhugeliang 名字:gz_sp_zhugeliang 势力:shu

### huoji
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### bazhen
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### kanpo
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_liushan 名字:gz_liushan 势力:shu

### xiangle
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### fangquan
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_menghuo 名字:gz_menghuo 势力:shu

### huoshou
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### rezaiqi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_zhurong 名字:gz_zhurong 势力:shu

### juxiang
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### lieren
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_ganfuren 名字:甘夫人 势力:shu

### gz_shushen 名字:淑慎
描述: 当你回复1点体力后，你可令一名其他角色摸一张牌（若其没有手牌则改为摸两张牌）。
```js
gz_shushen: {
		audio: "shushen",
		trigger: {
			player: "recoverEnd",
		},
		getIndex: event => event.num || 1,
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), lib.filter.notMe)
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "draw" }, player, player) * (1 + (target.countCards("h") == 0 ? 1 : 0));
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			event.targets[0].draw(event.targets[0].countCards("h") > 0 ? 1 : 2);
		},
		ai: {
			threaten: 0.8,
			expose: 0.1,
		},
	}
```

### shenzhi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_sunquan 名字:gz_sunquan 势力:wu

### gz_zhiheng 名字:制衡
描述: 出牌阶段限一次，你可以弃置至多X张牌（X为你的体力上限），然后摸等量的牌。
```js
gz_zhiheng: {
		inherit: "zhiheng",
		audio: "zhiheng",
		audioname2: {
			new_simayi: "rezhiheng_new_simayi",
		},
		selectCard() {
			const player = get.player();
			const range1 = [1, player.maxHp];
			if (player.hasSkill("dinglanyemingzhu_skill")) {
				for (let i = 0; i < ui.selected.cards.length; i++) {
					if (ui.selected.cards[i] == player.getEquip("dinglanyemingzhu")) {
						return range1;
					}
				}
				return [1, Infinity];
			}
			return range1;
		},
		filterCard(card, player) {
			if (ui.selected.cards.length < player.maxHp || !player.hasSkill("dinglanyemingzhu_skill")) {
				return true;
			}
			return card != player.getEquip("dinglanyemingzhu");
		},
		complexCard: true,
		complexSelect: true,
		prompt() {
			const player = get.player();
			if (player.hasSkill("dinglanyemingzhu_skill")) {
				return "出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌";
			}
			return "出牌阶段限一次，你可以弃置至多X张牌（X为你的体力上限），然后摸等量的牌";
		},
	}
```

## gz_ganning 名字:gz_ganning 势力:wu

### qixi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_lvmeng 名字:gz_lvmeng 势力:wu

### gz_keji 名字:克己
描述: 锁定技，若你没有在出牌阶段内使用过颜色不同的牌，则你本回合的手牌上限+4。
```js
gz_keji: {
		audio: "keji",
		forced: true,
		trigger: {
			player: "phaseDiscardBegin",
		},
		filter(event, player) {
			const list = [];
			player.getHistory("useCard", function (evt) {
				if (evt.isPhaseUsing(player)) {
					const color = get.color(evt.card);
					if (color != "nocolor") {
						list.add(color);
					}
				}
				return true;
			});
			return list.length <= 1;
		},
		check(event, player) {
			return player.needsToDiscard();
		},
		async content(event, trigger, player) {
			player.addTempSkill("keji_add", "phaseAfter");
		},
	}
```

### gz_mouduan 名字:谋断
描述: 结束阶段，若你于本回合内使用过四种花色或三种类别的牌，则你可以移动场上的一张牌。
```js
gz_mouduan: {
		trigger: {
			player: "phaseJieshuBegin",
		},
		//priority:2,
		audio: "botu",
		filter(event, player) {
			const history = player.getHistory("useCard");
			const suits = [];
			const types = [];
			for (let i = 0; i < history.length; i++) {
				const suit = get.suit(history[i].card);
				if (suit) {
					suits.add(suit);
				}
				types.add(get.type(history[i].card));
			}
			return suits.length >= 4 || types.length >= 3;
		},
		check(event, player) {
			return player.canMoveCard(true, void 0);
		},
		async content(event, trigger, player) {
			await player.moveCard();
		},
	}
```

## gz_huanggai 名字:gz_huanggai 势力:wu

### gz_kurou 名字:苦肉
描述: 出牌阶段限一次，你可以弃置一张牌并失去1点体力，然后摸三张牌并令你本回合出牌阶段使用【杀】的次数+1。
```js
gz_kurou: {
		audio: "rekurou",
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		check(card) {
			return 8 - get.value(card);
		},
		position: "he",
		async content(event, trigger, player) {
			await player.loseHp();
			await player.draw(3);
			player.addTempSkill("kurou_effect", "phaseAfter");
		},
		ai: {
			order: 8,
			result: {
				player(player) {
					if (player.needsToDiscard(3) && !player.hasValueTarget({ name: "sha" })) {
						return -1;
					}
					if (player.hp <= 2) {
						return player.countCards("h") == 0 ? 1 : 0;
					}
					if (player.countCards("h", { name: "sha", color: "red" })) {
						return 1;
					}
					return player.countCards("h") <= player.hp ? 1 : 0;
				},
			},
		},
	}
```

## gz_zhouyu 名字:gz_zhouyu 势力:wu

### reyingzi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### refanjian
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_daqiao 名字:gz_daqiao 势力:wu

### guose
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### liuli
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_luxun 名字:gz_luxun 势力:wu

### gz_qianxun 名字:谦逊
描述: 锁定技，当你成为【顺手牵羊】的目标时，或有【乐不思蜀】进入你的判定区时，取消之。
```js
gz_qianxun: {
		audio: "qianxun",
		trigger: {
			target: "useCardToTarget",
			player: "addJudgeBefore",
		},
		forced: true,
		preHidden: true,
		priority: 15,
		check(event, player) {
			return event.name == "addJudge" || get.effect(event.target, event.card, event.player, player) < 0;
		},
		filter(event, player) {
			return event.card.name == (event.name == "addJudge" ? "lebu" : "shunshou");
		},
		async content(event, trigger, player) {
			if (trigger.name == "addJudge") {
				trigger.cancel(undefined, undefined, undefined);
				const owner = get.owner(trigger.card);
				if (owner && owner.getCards("hej").includes(trigger.card)) {
					owner.lose(trigger.card, ui.discardPile);
				} else {
					game.cardsDiscard(trigger.card);
				}
				game.log(trigger.card, "进入了弃牌堆");
			} else {
				// @ts-expect-error 类型系统未来可期
				trigger.getParent()?.targets?.remove(player);
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (card.name == "shunshou" || card.name == "lebu") {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

### gz_duoshi 名字:度势
描述: 出牌阶段开始时，你可以视为使用【以逸待劳】。
```js
gz_duoshi: {
		audio: "duoshi",
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return player.hasUseTarget(new lib.element.VCard({ name: "yiyi", isCard: true }));
		},
		direct: true,
		preHidden: true,
		async content(event, trigger, player) {
			await player
				.chooseUseTarget(get.prompt2(event.name), new lib.element.VCard({ name: "yiyi", isCard: true }), false)
				.set("hiddenSkill", event.name)
				.set("logSkill", event.name);
		},
	}
```

## gz_sunshangxiang 名字:gz_sunshangxiang 势力:wu

### jieyin
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_xiaoji 名字:枭姬
描述: 当你失去装备区里的牌后，你可以摸一张牌。若你不是当前回合角色，则你改为摸三张牌。
```js
gz_xiaoji: {
		inherit: "xiaoji",
		audio: "xiaoji",
		preHidden: true,
		getIndex(event, player) {
			const evt = event.getl(player);
			if (evt && evt.player === player && evt.es && evt.es.length) {
				return 1;
			}
			return false;
		},
		async content(event, trigger, player) {
			// @ts-expect-error 类型系统未来可期
			await player.draw(player == _status.currentPhase ? 1 : 3);
		},
	}
```

## gz_sunjian 名字:gz_sunjian 势力:wu

### yinghun
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_xiaoqiao 名字:gz_xiaoqiao 势力:wu

### gz_tianxiang 名字:天香
描述: 每回合限一次。当你受到伤害时，你可以弃置一张红桃手牌，防止此次伤害并选择一名其他角色，然后你选择一项：1.令其受到伤害来源对其造成的1点伤害，然后摸X张牌（X为其已损失体力值且至多为5）；2.令其失去1点体力，然后获得你弃置的牌。
```js
gz_tianxiang: {
		audio: "tianxiang",
		audioname: ["daxiaoqiao", "re_xiaoqiao", "ol_xiaoqiao"],
		trigger: { player: "damageBegin4" },
		preHidden: true,
		usable: 1,
		filter(event, player) {
			return (
				player.countCards("h", card => {
					return _status.connectMode || (get.suit(card, player) == "heart" && lib.filter.cardDiscardable(card, player));
				}) > 0 && event.num > 0
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					filterCard(card, player) {
						return get.suit(card) == "heart" && lib.filter.cardDiscardable(card, player);
					},
					filterTarget: lib.filter.notMe,
					ai1(card) {
						return 10 - get.value(card);
					},
					ai2(target) {
						const att = get.attitude(get.player(), target);
						const trigger = get.event().getTrigger();
						let da = 0;
						if (get.player().hp == 1) {
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
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				cards,
				targets: [target],
			} = event;
			trigger.cancel();
			await player.discard(cards);
			const result = await player
				// @ts-expect-error 类型系统未来可期
				.chooseControlList(true, (event, player) => get.event().index, [`令${get.translation(target)}受到伤害来源对其造成的1点伤害，然后摸X张牌（X为其已损失体力值且至多为5）`, `令${get.translation(target)}失去1点体力，然后获得${get.translation(cards)}`])
				.set(
					"index",
					(() => {
						let att = get.attitude(player, target);
						if (target.hasSkillTag("maihp")) {
							att = -att;
						}
						return att > 0 ? 0 : 1;
					})()
				)
				.forResult();
			if (typeof result.index != "number") {
				return;
			}
			if (result.index == 0) {
				await target.damage(trigger.source || "nosource", "nocard");
				if (target.getDamagedHp()) {
					await target.draw(Math.min(5, target.getDamagedHp()));
				}
			} else {
				await target.loseHp();
				if (cards[0].isInPile()) {
					await target.gain(cards, "gain2");
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

### gz_hongyan 名字:红颜
描述: 锁定技。①你区域内的黑桃牌和黑桃判定牌的花色视为红桃。②若你的装备区内有红桃牌，则你的手牌上限+1。
```js
gz_hongyan: {
		mod: {
			suit(card, suit) {
				if (suit == "spade") {
					return "heart";
				}
			},
			maxHandcard(player, num) {
				if (
					player.hasCard(function (card) {
						return get.suit(card, player) == "heart";
					}, "e")
				) {
					return num + 1;
				}
			},
		},
	}
```

## gz_re_taishici 名字:太史慈 势力:wu

### tianyi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_hanzhan 名字:酣战
描述: 有你参与的拼点事件结束后，没赢的角色可以获得对方装备区的一张牌。
```js
gz_hanzhan: {
		audio: "hanzhan",
		trigger: {
			player: ["chooseToCompareAfter", "compareMultipleAfter"],
			target: ["chooseToCompareAfter", "compareMultipleAfter"],
		},
		filter(event, player) {
			if (event.preserve) {
				return false;
			}
			const list = [event.player, event.target];
			const targets = list.slice().filter(i => (event.num1 - event.num2) * get.sgn(0.5 - list.indexOf(i)) <= 0);
			return targets.some(i => {
				const target = list[1 - list.indexOf(i)];
				return target.hasCard(card => {
					return lib.filter.canBeGained(card, i, target);
				}, "e");
			});
		},
		async cost(event, trigger, player) {
			let users = [];
			const list = [trigger.player, trigger.target];
			let targets = list.slice().filter(i => (trigger.num1 - trigger.num2) * get.sgn(0.5 - list.indexOf(i)) <= 0);
			targets = targets
				.filter(i => {
					const target = list[1 - list.indexOf(i)];
					return target.hasCard(card => {
						return lib.filter.canBeGained(card, i, target);
					}, "e");
				})
				.sortBySeat(player);
			for (const i of targets) {
				const aim = list[1 - list.indexOf(i)];
				const { bool } = await i.chooseBool(get.prompt("gz_hanzhan"), "获得" + get.translation(aim) + "装备区的一张牌").set(
					"choice",
					aim.hasCard(card => {
						return get.value(card, aim) * get.attitude(i, aim) < 0;
					}, "e")
				).forResult();
				if (bool) {
					users.push(i);
				}
			}
			event.result = { bool: Boolean(users.length), targets: users };
		},
		logLine: false,
		async content(event, trigger, player) {
			const list = [trigger.player, trigger.target];
			let targets = list.slice().filter(i => (trigger.num1 - trigger.num2) * get.sgn(0.5 - list.indexOf(i)) <= 0);
			targets = targets
				.filter(i => {
					const target = list[1 - list.indexOf(i)];
					return target.hasCard(card => {
						return lib.filter.canBeGained(card, i, target);
					}, "e");
				})
				.sortBySeat(player);
			for (const i of targets) {
				const aim = list[1 - list.indexOf(i)];
				i.line(aim, "green");
				await i.gainPlayerCard(aim, "e", true);
			}
		},
	}
```

## gz_zhoutai 名字:周泰 势力:wu

### buqu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### new_fenji
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_re_lusu 名字:gz_re_lusu 势力:wu

### haoshi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### dimeng
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_zhangzhang 名字:gz_zhangzhang 势力:wu

### zhijian
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### guzheng
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_dingfeng 名字:gz_dingfeng 势力:wu

### gz_duanbing 名字:短兵
描述: ①你使用【杀】可以额外指定一名距离为1或以内的目标。②当你使用【杀】指定唯一目标后，你令目标角色需要额外使用一张【闪】响应此【杀】。
```js
gz_duanbing: {
		audio: "duanbing",
		inherit: "reduanbing",
		preHidden: ["gz_duanbing_sha"],
		group: ["gz_duanbing", "gz_duanbing_sha"],
		subSkill: {
			sha: {
				audio: "duanbing",
				trigger: { player: "useCardToPlayered" },
				filter(event, player) {
					return event.card.name == "sha" && !event.getParent().directHit.includes(event.target) && event.targets.length == 1;
				},
				forced: true,
				logTarget: "target",
				async content(event, trigger, player) {
					const id = trigger.target.playerid;
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
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						if (!arg || !arg.card || !arg.target || arg.card.name != "sha" || arg.target.countCards("h", "shan") > 1 || get.distance(player, arg.target) > 1) {
							return false;
						}
					},
				},
			},
		},
	}
```

### fenxun
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_huatuo 名字:gz_huatuo 势力:qun

### new_chuli 名字:除疠
描述: 出牌阶段限一次，若你有牌，你可以选择至多三名势力各不相同或未确定势力的其他角色，你弃置你和这些角色的各一张牌。然后所有以此法弃置过黑桃牌的角色各摸一张牌。
```js
new_chuli: {
		audio: "chulao",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			if (player == target) {
				return false;
			}
			for (var i = 0; i < ui.selected.targets.length; i++) {
				if (ui.selected.targets[i].isFriendOf(target)) {
					return false;
				}
			}
			return target.countCards("he") > 0;
		},
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		filterCard: true,
		position: "he",
		selectTarget: [1, 3],
		check(card) {
			if (get.suit(card) == "spade") {
				return 8 - get.value(card);
			}
			return 5 - get.value(card);
		},
		async contentBefore(event, trigger, player) {
			const { cards } = event;
			const evt = event.getParent();
			evt.draw = [];
			if (get.suit(cards[0]) == "spade") {
				evt.draw.push(player);
			}
		},
		async content(event, trigger, player) {
			const { target } = event;

			const result = await player.discardPlayerCard(target, "he", true).forResult();

			if (result.bool) {
				if (get.suit(result.cards[0]) == "spade") {
					event.getParent().draw.push(target);
				}
			}
		},
		async contentAfter(event, trigger, player) {
			const list = event.getParent().draw;
			if (!list.length) {
				return;
			} else {
				await game.asyncDraw(list);
			}

			await game.delay();
		},
		ai: {
			result: {
				target: -1,
			},
			tag: {
				discard: 1,
				lose: 1,
				loseCard: 1,
			},
			threaten: 1.2,
			order: 3,
		},
	}
```

### jijiu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_lvbu 名字:gz_lvbu 势力:qun

### gz_wushuang 名字:无双
描述: 锁定技。①当你使用【杀】指定一名角色为目标后，其需使用两张【闪】才能抵消；②当你使用【决斗】指定其他角色为目标后，或成为其他角色使用【决斗】的目标后，其每次响应需打出两张【杀】。③当你使用非转化的【决斗】选择目标后，你可为此【决斗】增加两个目标。
```js
gz_wushuang: {
		audio: "wushuang",
		audioname2: {
			gz_lvlingqi: "wushuang_lvlingqi",
		},
		locked: true,
		group: ["wushuang1", "wushuang2"],
		preHidden: ["wushuang1", "wushuang2", "gz_wushuang"],
		trigger: { player: "useCard1" },
		filter(event, player) {
			if (event.card.name != "juedou" || !event.card.isCard) {
				return false;
			}
			if (event.targets) {
				if (
					game.hasPlayer(function (current) {
						return !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, player, current);
					})
				) {
					return true;
				}
			}
			return false;
		},
		async cost(event, trigger, player) {
			const num = game.countPlayer(current => !trigger.targets.includes(current) && lib.filter.targetEnabled2(trigger.card, player, current));

			event.result = await player
				.chooseTarget("无双：是否为" + get.translation(trigger.card) + "增加" + (num > 1 ? "至多两个" : "一个") + "目标？", [1, Math.min(2, num)], (card, player, target) => {
					const trigger = get.event().getTrigger();
					const cardx = trigger.card;
					return !trigger.targets.includes(target) && lib.filter.targetEnabled2(cardx, player, target);
				})
				.set("ai", target => {
					const player = get.event().player;
					const card = get.event().getTrigger().card;
					return get.effect(target, card, player, player);
				})
				.setHiddenSkill("gzwushuang")
				.forResult();

			if (event.result.bool && player != game.me && !player.isOnline()) {
				await game.delayx();
			}
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const targets = event.targets.sortBySeat();
			trigger.targets.addArray(targets);
		},
	}
```

## gz_diaochan 名字:gz_diaochan 势力:qun

### lijian
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### biyue
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_re_yuanshao 名字:gz_re_yuanshao 势力:qun

### gz_luanji 名字:乱击
描述: 你可以将两张与你本回合以此法转化的花色均不相同的手牌当【万箭齐发】使用。当一名与你势力相同的角色因响应此牌而打出【闪】时，该角色摸一张牌。
```js
gz_luanji: {
		audio: "luanji",
		enable: "phaseUse",
		viewAs: {
			name: "wanjian",
		},
		filterCard(card, player) {
			if (!player.storage.gz_luanji) {
				return true;
			}
			return !player.storage.gz_luanji.includes(get.suit(card));
		},
		selectCard: 2,
		position: "hs",
		filter(event, player) {
			return (
				player.countCards("hs", function (card) {
					return !player.storage.gz_luanji || !player.storage.gz_luanji.includes(get.suit(card));
				}) > 1
			);
		},
		check(card) {
			const player = get.player();
			const targets = game.filterPlayer(current => player.canUse("wanjian", current) ?? false);
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
		group: ["gz_luanji_count", "gz_luanji_reset", "gz_luanji_respond"],
		subSkill: {
			reset: {
				trigger: {
					player: "phaseAfter",
				},
				silent: true,
				filter(event, player) {
					return player.storage.gz_luanji ? true : false;
				},
				async content(event, trigger, player) {
					delete player.storage.gz_luanji;
				},
				sub: true,
				forced: true,
				popup: false,
			},
			count: {
				trigger: {
					player: "useCard",
				},
				silent: true,
				filter(event) {
					return event.skill == "gz_luanji";
				},
				async content(event, trigger, player) {
					if (!player.storage.gz_luanji) {
						player.storage.gz_luanji = [];
					}
					for (let i = 0; i < trigger.cards.length; i++) {
						player.storage.gz_luanji.add(get.suit(trigger.cards[i]));
					}
				},
				sub: true,
				forced: true,
				popup: false,
			},
			respond: {
				trigger: {
					global: "respond",
				},
				silent: true,
				filter(event) {
					if (event.player.isUnseen()) {
						return false;
					}
					// @ts-expect-error 类型系统未来可期
					return event.getParent(2).skill == "gz_luanji" && event.player.isFriendOf(_status.currentPhase);
				},
				async content(event, trigger, player) {
					await trigger.player.draw();
				},
				sub: true,
				forced: true,
				popup: false,
			},
		},
	}
```

## gz_yanwen 名字:gz_yanwen 势力:qun

### gz_shuangxiong 名字:双雄
描述: ①摸牌阶段，你可以放弃摸牌并进行判定，本回合你可以将一张与此牌颜色不同的手牌当作【决斗】使用。②当你的判定牌于回合内生效后，你获得此牌。
```js
gz_shuangxiong: {
		audio: "shuangxiong",
		subfrequent: ["tiandu"],
		group: ["gz_shuangxiong_effect", "gz_shuangxiong_tiandu"],
		subSkill: {
			effect: {
				audio: "shuangxiong1",
				inherit: "shuangxiong1",
				async content(event, trigger, player) {
					player.judge().set("callback", get.info("gz_shuangxiong").subSkill?.effect.callback);
					trigger.changeToZero();
				},
				async callback(event, trigger, player) {
					player.addTempSkill("shuangxiong2");
					player.markAuto("shuangxiong2", [event.judgeResult.color]);
				},
			},
			tiandu: {
				audio: "shuangxiong",
				inherit: "tiandu",
				filter(event, player) {
					// @ts-expect-error 类型系统未来可期
					return _status.currentPhase == player && get.info("tiandu").filter(event, player);
				},
			},
		},
	}
```

## gz_jiaxu 名字:gz_jiaxu 势力:qun

### wansha
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### luanwu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_weimu 名字:帷幕
描述: 锁定技，当你成为黑色普通锦囊牌的目标时，或有黑色延时锦囊牌进入你的判定区时，取消之。
```js
gz_weimu: {
		audio: "weimu",
		trigger: {
			target: "useCardToTarget",
			player: "addJudgeBefore",
		},
		forced: true,
		priority: 15,
		preHidden: true,
		check(event, player) {
			return event.name == "addJudge" || (event.card.name != "chiling" && get.effect(event.target, event.card, event.player, player) < 0);
		},
		filter(event, player) {
			if (event.name == "addJudge") {
				return get.color(event.card) == "black";
			}
			return get.type(event.card, null, false) == "trick" && get.color(event.card) == "black";
		},
		async content(event, trigger, player) {
			if (trigger.name == "addJudge") {
				trigger.cancel(undefined, undefined, undefined);
				const owner = get.owner(trigger.card);
				if (owner?.getCards("hej").includes(trigger.card)) {
					await owner.lose(trigger.card, ui.discardPile);
				} else {
					await game.cardsDiscard(trigger.card);
				}
				game.log(trigger.card, "进入了弃牌堆");
			} else {
				// @ts-expect-error 类型系统未来可期
				trigger.getParent()?.targets.remove(player);
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (get.type(card, "trick") == "trick" && get.color(card) == "black") {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

## gz_pangde 名字:庞德 势力:qun

### gz_pd_mashu
```js
gz_pd_mashu: {
		inherit: "gz_mashu",
	}
```

### jianchu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_zhangjiao 名字:gz_zhangjiao 势力:qun

### leiji
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### guidao
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_caiwenji 名字:gz_caiwenji 势力:qun

### beige
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_duanchang 名字:断肠
描述: 锁定技，当你死亡时，你令杀死你的角色失去一张武将牌上的所有技能。
```js
gz_duanchang: {
		audio: "duanchang",
		trigger: {
			player: "die",
		},
		forced: true,
		forceDie: true,
		filter(event, player) {
			return event.source && event.source.isIn() && event.source != player && (event.source.hasMainCharacter() || event.source.hasViceCharacter());
		},
		logTarget: "source",
		async content(event, trigger, player) {
			const main = trigger.source.hasMainCharacter();
			const vice = trigger.source.hasViceCharacter();

			/** @type {Partial<Result>} */
			let result;
			if (!vice) {
				result = { control: "主将" };
			} else if (!main) {
				result = { control: "副将" };
			} else {
				result = await player
					// @ts-expect-error 类型系统未来可期
					.chooseControl("主将", "副将", () => get.event().choice)
					.set("prompt", "令" + get.translation(trigger.source) + "失去一张武将牌的所有技能")
					.set("forceDie", true)
					.set(
						"choice",
						(() => {
							let rank = get.guozhanRank(trigger.source.name1, trigger.source) - get.guozhanRank(trigger.source.name2, trigger.source);
							if (rank == 0) {
								rank = Math.random() > 0.5 ? 1 : -1;
							}
							return rank * get.attitude(player, trigger.source) > 0 ? "副将" : "主将";
						})()
					)
					.forResult();
			}

			let skills;
			if (result.control == "主将") {
				trigger.source.showCharacter(0);
				broadcastAll(player => {
					player.node.avatar.classList.add("disabled");
				}, trigger.source);
				skills = lib.character[trigger.source.name][3];
				game.log(trigger.source, "失去了主将技能");
			} else {
				trigger.source.showCharacter(1);
				broadcastAll(player => {
					player.node.avatar2.classList.add("disabled");
				}, trigger.source);
				skills = lib.character[trigger.source.name2][3];
				game.log(trigger.source, "失去了副将技能");
			}
			const list = [];
			for (let i = 0; i < skills.length; i++) {
				list.add(skills[i]);
				const info = lib.skill[skills[i]];
				if (info.charlotte) {
					list.splice(i--);
					continue;
				}
				if (typeof info.derivation == "string") {
					list.add(info.derivation);
				} else if (Array.isArray(info.derivation)) {
					list.addArray(info.derivation);
				}
			}
			trigger.source.removeSkill(list);
			trigger.source.syncSkills();
			player.line(trigger.source, "green");
		},
		ai: {
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
						return [1, 0, 0, -2];
					}
				},
			},
		},
	}
```

## gz_mateng 名字:gz_mateng 势力:qun

### gz_mt_mashu
```js
gz_mt_mashu: {
		inherit: "gz_mashu",
	}
```

### xiongyi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_kongrong 名字:gz_kongrong 势力:qun

### gz_mingshi 名字:名士
描述: 锁定技，当你受到伤害时，若伤害来源有暗置的武将牌，此伤害-1。
```js
gz_mingshi: {
		audio: "mingshi",
		trigger: { player: "damageBegin3" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return event.num > 0 && event.source && event.source.isUnseen(2);
		},
		async content(event, trigger, player) {
			trigger.num--;
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return;
					}
					if (!player.isUnseen(2)) {
						return;
					}
					var num = get.tag(card, "damage");
					if (num) {
						if (num > 1) {
							return 0.5;
						}
						return 0;
					}
				},
			},
		},
	}
```

### lirang
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_jiling 名字:gz_jiling 势力:qun

### shuangren
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_tianfeng 名字:gz_tianfeng 势力:qun

### sijian
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_suishi 名字:随势
描述: 锁定技，其他角色进入濒死状态时，若伤害来源与你势力相同，你摸一张牌；其他角色死亡时，若其与你势力相同，你失去1点体力或弃置所有手牌。
```js
gz_suishi: {
		audio: "suishi",
		locked: true,
		forced: true,
		preHidden: ["gz_suishi_draw", "gz_suishi_lose"],
		group: ["gz_suishi_draw", "gz_suishi_lose"],
		/** @type {Record<string, Skill>} */
		subSkill: {
			draw: {
				audio: "suishi1.mp3",
				trigger: {
					global: "dying",
				},
				forced: true,
				filter(event, player) {
					return event.player != player && event.parent?.name == "damage" && event.parent.source && event.parent.source.isFriendOf(player);
				},
				async content(_event, _trigger, player) {
					await player.draw();
				},
			},
			lose: {
				audio: "suishi2.mp3",
				trigger: {
					global: "dieAfter",
				},
				check() {
					return false;
				},
				forced: true,
				filter(event, player) {
					return event.player.isFriendOf(player);
				},
				async content(_event, _trigger, player) {
					const result = player.countDiscardableCards(player, "h") ? await player.chooseBool("随势：弃置所有手牌，或点取消失去1点体力").forResult() : { bool: false };
					if (result.bool) {
						await player.modedDiscard(player.getCards("h"));
					} else {
						await player.loseHp();
					}
				},
			},
		},
	}
```

## gz_panfeng 名字:gz_panfeng 势力:qun

### gz_kuangfu 名字:狂斧
描述: 出牌阶段限一次。当你使用【杀】指定目标后，你可获得目标角色装备区内的一张牌。然后若此【杀】未造成伤害，则你弃置两张手牌。
```js
gz_kuangfu: {
		audio: "kuangfu",
		trigger: {
			player: "useCardToPlayered",
		},
		preHidden: true,
		logTarget: "target",
		filter(event, player) {
			return event.card.name == "sha" && player.isPhaseUsing() && !player.hasSkill("gz_kuangfu_extra") && event.target.countGainableCards(player, "e") > 0;
		},
		check(event, player) {
			if (
				get.attitude(player, event.target) > 0 ||
				!event.target.hasCard(function (card) {
					return lib.filter.canBeGained(card, player, event.target) && get.value(card, event.target) > 0;
				}, "e")
			) {
				return false;
			}
			return true;
		},
		async content(event, trigger, player) {
			// @ts-expect-error 类型系统未来可期
			trigger.getParent()._gz_kuangfued = true;
			await player.gainPlayerCard(trigger.target, "e", true);
			player.addTempSkill("gz_kuangfu_extra", "phaseUseAfter");
		},
		subSkill: {
			extra: {
				trigger: { player: "useCardAfter" },
				charlotte: true,
				forced: true,
				filter(event, player) {
					return (
						// @ts-expect-error 类型系统未来可期
						event._gz_kuangfued && !player.hasHistory("sourceDamage", evt => evt.card && event.card) && player.countCards("h") > 0
					);
				},
				async content(event, trigger, player) {
					await player.chooseToDiscard("h", 2, true);
				},
			},
		},
	}
```

## gz_zoushi 名字:gz_zoushi 势力:qun

### gz_huoshui 名字:祸水
描述: 锁定技。你的回合内，①其他角色不能明置武将牌。②当你使用【杀】或【万箭齐发】指定目标后，若目标角色与你势力不同且有暗置武将牌，则其不能使用或出【闪】直到此牌结算结束。
```js
gz_huoshui: {
		audio: 2,
		forced: true,
		global: "gz_huoshui_mingzhi",
		trigger: { player: "useCardToTargeted" },
		preHidden: true,
		filter(event, player) {
			return (event.card.name == "sha" || event.card.name == "wanjian") && event.target.isUnseen(2) && event.target.isEnemyOf(player);
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const target = trigger.target;
			target.addTempSkill("gz_huoshui_norespond");
			target.markAuto("gz_huoshui_norespond", [trigger.card]);
		},

		subSkill: {
			norespond: {
				charlotte: true,
				trigger: { global: "useCardEnd" },
				onremove: true,
				forced: true,
				popup: false,
				silent: true,
				firstDo: true,
				filter(event, player) {
					return player.getStorage("gz_huoshui_norespond").includes(event.card);
				},
				async content(event, trigger, player) {
					player.unmarkAuto("gz_huoshui_norespond", [trigger.card]);
					if (!player.storage.gz_huoshui_norespond.length) {
						player.removeSkill("gz_huoshui_norespond");
					}
				},
				mod: {
					cardEnabled(card) {
						if (card.name == "shan") {
							return false;
						}
					},
					cardRespondable(card) {
						if (card.name == "shan") {
							return false;
						}
					},
				},
			},
			mingzhi: {
				ai: {
					nomingzhi: true,
					skillTagFilter(player) {
						// @ts-expect-error 类型系统未来可期
						if (_status.currentPhase && _status.currentPhase != player && _status.currentPhase.hasSkill("gz_huoshui")) {
							return true;
						}
						return false;
					},
				},
			},
		},
	}
```

### gz_qingcheng 名字:倾城
描述: 出牌阶段，你可以弃置一张黑色牌并选择一名武将牌均明置的其他角色，然后你暗置其一张武将牌。若你以此法弃置的牌为装备牌，则你可以暗置另一名武将牌均明置的角色的一张武将牌。
```js
gz_qingcheng: {
		audio: "qingcheng",
		enable: "phaseUse",
		filter(event, player) {
			return (
				player.countCards("he", { color: "black" }) > 0 &&
				game.hasPlayer(function (current) {
					return current != player && !current.isUnseen(2);
				})
			);
		},
		filterCard: {
			color: "black",
		},
		position: "he",
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			return !target.isUnseen(2);
		},
		check(card) {
			return 6 - get.value(card, get.event().player);
		},
		async content(event, trigger, player) {
			await chooseToHide(event.target);

			if (get.type(event.cards[0]) != "equip") {
				return;
			}

			const result = await player
				.chooseTarget("是否暗置一名武将牌均为明置的角色的一张武将牌？", (card, player, target) => {
					return target != player && !target.isUnseen(2);
				})
				.set("ai", target => {
					return -get.attitude(_status.event.player, target);
				})
				.forResult();

			if (result.bool && result.targets && result.targets.length) {
				player.line(result.targets[0], "green");
				await chooseToHide(result.targets[0]);
			}

			return;

			/**
			 * @param {PlayerGuozhan} target
			 */
			async function chooseToHide(target) {
				/** @type {Partial<Result>} */
				let result;

				if (get.is.jun(target)) {
					result = { control: "副将" };
				} else {
					let choice = "主将";
					const skills = lib.character[target.name2][3];
					for (var i = 0; i < skills.length; i++) {
						var info = get.info(skills[i]);
						if (info && info.ai && info.ai.maixie) {
							choice = "副将";
							break;
						}
					}
					if (get.character(target.name, 3).includes("buqu")) {
						choice = "主将";
					} else if (get.character(target.name2, 3).includes("buqu")) {
						choice = "副将";
					}
					result = await player
						.chooseControl("主将", "副将", () => {
							// @ts-expect-error 类型系统未来可期
							return _status.event.choice;
						})
						.set("prompt", "暗置" + get.translation(event.target) + "的一张武将牌")
						.set("choice", choice)
						.forResult();
				}

				if (result.control == "主将") {
					target.hideCharacter(0);
				} else {
					target.hideCharacter(1);
				}
				target.addTempSkill("qingcheng_ai");
			}
		},
		ai: {
			order: 8,
			result: {
				target(player, target) {
					if (target.hp <= 0) {
						return -5;
					}
					if (player.getStat().skill.gz_qingcheng) {
						return 0;
					}
					if (!target.hasSkillTag("maixie")) {
						return 0;
					}
					if (get.attitude(player, target) >= 0) {
						return 0;
					}
					if (
						player.hasCard(function (card) {
							// ?????
							return get.tag(card, "damage") && player.canUse(card, target, true, true);
						}, undefined)
					) {
						if (target.maxHp > 3) {
							return -0.5;
						}
						return -1;
					}
					return 0;
				},
			},
		},
	}
```

## gz_cuimao 名字:崔琰毛玠 势力:wei

### gz_zhengbi 名字:征辟
描述: 出牌阶段开始时，你可以选择一项：选择一名未确定势力的角色，此出牌阶段结束时，若其有明置的武将牌，则你获得其每个区域内的各一张牌；或将一张基本牌交给一名有明置武将牌的角色，然后其交给你一张非基本牌或两张基本牌。
```js
gz_zhengbi: {
		audio: "zhengbi",
		trigger: {
			player: "phaseUseBegin",
		},
		preHidden: true,
		filter(_event, player) {
			//if(event.player!=player) return false;
			return game.hasPlayer(current => current != player && current.identity == "unknown") || player.countCards("h", { type: "basic" }) > 0;
		},
		check(event, player) {
			if (player.countCards("h", card => get.value(card) < 7)) {
				if (player.isUnseen()) {
					return Math.random() > 0.7;
				}
				return true;
			}
		},
		async content(event, trigger, player) {
			const choices = [];
			if (game.hasPlayer(current => current.isUnseen())) {
				choices.push("选择一名未确定势力的角色");
			}
			if (game.hasPlayer(current => current != player && !current.isUnseen()) && player.countCards("h", { type: "basic" })) {
				choices.push("将一张基本牌交给一名已确定势力的角色");
			}

			/** @type {Partial<Result>} */
			let result;
			if (choices.length == 1) {
				result = {
					index: choices[0] == "选择一名未确定势力的角色" ? 0 : 1,
				};
			} else {
				const next = player.chooseControl();

				next.set("prompt", "征辟：请选择一项");
				next.set("choiceList", choices);
				next.set("ai", controlCheck);

				result = await next.forResult();
			}

			switch (result.index) {
				case 0: {
					result = await player.chooseTarget("请选择一名未确定势力的角色", (card, player, target) => target != player && target.identity == "unknown", true).forResult();
					break;
				}
				default: {
					result = await player
						.chooseCardTarget({
							prompt: "请将一张基本牌交给一名已确定势力的其他角色",
							position: "h",
							filterCard(card) {
								return get.type(card) == "basic";
							},
							filterTarget(card, player, target) {
								return target != player && target.identity != "unknown";
							},
							ai1(card) {
								return 5 - get.value(card);
							},
							ai2(target) {
								const player = get.player();
								const att = get.attitude(player, target);
								if (att > 0) {
									return 0;
								}
								return -(att - 1) / target.countCards("h");
							},
						})
						.set("forced", true)
						.forResult();
					break;
				}
			}

			if (!result.targets?.length) {
				return;
			}

			const target = result.targets[0];
			player.line(result.targets, "green");
			if (result.cards?.length) {
				await player.give(result.cards, result.targets[0]);
			} else {
				player.storage.gz_zhengbi_eff1 = result.targets[0];
				player.addTempSkill("gz_zhengbi_eff1", "phaseUseAfter");
				return;
			}

			choices.length = 0;
			if (target.countCards("he", { type: ["trick", "delay", "equip"] })) {
				choices.push("一张非基本牌");
			}
			if (target.countCards("h", { type: "basic" }) > 1) {
				choices.push("两张基本牌");
			}

			if (choices.length) {
				result = await target
					.chooseControl(choices)
					.set("ai", (event, player) => {
						if (choices.length > 1) {
							if (player.countCards("he", { type: ["trick", "delay", "equip"] }, card => get.value(card) < 7)) {
								return 0;
							}
							return 1;
						}
						return 0;
					})
					.set("prompt", "征辟：交给" + get.translation(player) + "…</div>")
					.forResult();
			} else {
				if (target.countCards("h")) {
					const cards = target.getCards("h");
					await target.give(cards, player);
				}
				return;
			}

			const check = result.control == "一张非基本牌";
			result = await target.chooseCard("he", check ? 1 : 2, { type: check ? ["trick", "delay", "equip"] : "basic" }, true).forResult();
			if (result.cards?.length) {
				await target.give(result.cards, player);
			}

			return;

			function controlCheck() {
				if (choices.length > 1) {
					const player = get.player();
					let identity = null;
					if (
						!game.hasPlayer(current => {
							return (
								(!current.isUnseen() && current.getEquip("yuxi")) ||
								(current.hasSkill("gzyongsi") &&
									!game.hasPlayer(function (current) {
										return current.getEquips("yuxi").length > 0;
									}))
							);
						}) &&
						game.hasPlayer(current => {
							return current != player && current.isUnseen();
						})
					) {
						identity = game.players.find(item => item.isMajor())?.identity;
					}
					if (!player.isUnseen() && player.identity != identity && get.population(player.identity) + 1 >= get.population(identity)) {
						return 0;
					}
					return 1;
				}
				return 0;
			}
		},
		subSkill: {
			eff1: {
				audio: "zhengbi",
				trigger: {
					player: "phaseUseEnd",
				},
				forced: true,
				charlotte: true,
				onremove: true,
				filter(_event, player) {
					const target = player.storage.gz_zhengbi_eff1;
					return target && !target.isUnseen() && target.countGainableCards(player, "he") > 0;
				},
				logTarget(event, player) {
					return player?.storage.gz_zhengbi_eff1;
				},
				async content(_event, _trigger, player) {
					var num = 0;
					var target = player.storage.gz_zhengbi_eff1;
					if (target.countGainableCards(player, "h")) {
						num++;
					}
					if (target.countGainableCards(player, "e")) {
						num++;
					}
					if (num) {
						player.gainPlayerCard(target, num, "he", true).set("filterButton", button => {
							for (let i = 0; i < ui.selected.buttons.length; i++) {
								// @ts-expect-error 类型系统未来可期
								if (get.position(button.link) == get.position(ui.selected.buttons[i].link)) {
									return false;
								}
							}
							return true;
						});
					}
				},
				sub: true,
			},
		},
	}
```

### gz_fengying 名字:奉迎
描述: 限定技，你可以将所有手牌当【挟天子以令诸侯】使用（无视大势力限制），然后所有与你势力相同的角色将手牌补至体力上限。
```js
gz_fengying: {
		audio: "fengying",
		enable: "phaseUse",
		filterCard: true,
		selectCard: -1,
		position: "h",
		filter(_event, player) {
			return !player.storage.gz_fengying && player.countCards("h") > 0;
		},
		filterTarget(_card, player, target) {
			return target == player;
		},
		selectTarget: -1,
		discard: false,
		lose: false,
		limited: true,
		skillAnimation: "epic",
		animationColor: "gray",
		async content(event, _trigger, player) {
			const { cards, target } = event;
			player.awakenSkill("gz_fengying", undefined);
			player.storage.gz_fengying = true;
			await player.useCard({ name: "xietianzi" }, cards, target);

			const list = game.filterPlayer(current => current.isFriendOf(player) && current.countCards("h") < current.maxHp);
			list.sort(lib.sort.seat);
			player.line(list, "thunder");
			await game.asyncDraw(list, current => current.maxHp - current.countCards("h"));
		},
		ai: {
			order: 0.1,
			result: {
				player(player) {
					let value = 0;
					const cards = player.getCards("h");
					if (cards.length >= 4) {
						return 0;
					}
					for (let i = 0; i < cards.length; i++) {
						value += Math.max(0, get.value(cards[i], player, "raw"));
					}
					const targets = game.filterPlayer(function (current) {
						return current.isFriendOf(player) && current != player;
					});
					let eff = 0;
					for (let i = 0; i < targets.length; i++) {
						var num = targets[i].countCards("h") - targets[i].maxHp;
						if (num <= 0) {
							continue;
						}
						eff += num;
					}
					return 5 * eff - value;
				},
			},
		},
	}
```

## gz_yujin 名字:于禁 势力:wei

### gz_jieyue 名字:节钺
描述: 准备阶段，你可以将一张手牌交给一名非魏势力角色，然后选择一个“军令”并令其选择一项：执行该军令，然后你摸一张牌；或令你于此回合摸牌阶段额外摸三张牌。
```js
gz_jieyue: {
		audio: ["jieyue", 2],
		audioname2: {
			gz_jun_caocao: "jianan_jieyue",
		},
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			return (
				player.countCards("h") > 0 &&
				game.hasPlayer(function (current) {
					return current != player && current.identity != "wei";
				})
			);
		},
		preHidden: true,
		async cost(event, _trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt2("gz_jieyue"),
					position: "h",
					filterCard: true,
					filterTarget(card, player, target) {
						return target.identity != "wei" && target != player;
					},
					ai1(card, player, target) {
						if (get.attitude(player, target) > 0) {
							return 11 - get.value(card);
						}
						return 7 - get.value(card);
					},
					ai2(target) {
						var att = get.attitude(get.event().player, target);
						if (att < 0) {
							return -att;
						}
						return 1;
					},
				})
				.setHiddenSkill("gz_jieyue")
				.forResult();
		},
		logTarget: "targets",
		async content(event, _trigger, player) {
			const { targets, cards } = event;
			const target = targets[0];

			await player.give(cards, target);

			const junlingResult = await player.chooseJunlingFor(target).forResult();
			const { junling, targets: junlingTargets } = junlingResult;

			const choiceList = [];
			choiceList.push(`执行该军令，然后${get.translation(player)}摸一张牌`);
			choiceList.push(`令${get.translation(player)}摸牌阶段额外摸三张牌`);

			const chooseJunlingResult = await target.chooseJunlingControl(player, junling, junlingTargets).set("prompt", "节钺").set("choiceList", choiceList).set("ai", chooseJunlingCheck).forResult();

			if (chooseJunlingResult.index == 0) {
				await target.carryOutJunling(player, junling, junlingTargets);
				await player.draw();
			} else {
				player.addTempSkill("gz_jieyue_eff");
			}

			return;

			function chooseJunlingCheck() {
				if (get.attitude(target, player) > 0) {
					return get.junlingEffect(player, junling, target, junlingTargets, target) > 1 ? 0 : 1;
				}
				return get.junlingEffect(player, junling, target, junlingTargets, target) >= -1 ? 0 : 1;
			}
		},
		ai: {
			threaten: 2,
		},
		subSkill: {
			eff: {
				trigger: {
					player: "phaseDrawBegin2",
				},
				filter(event, _player) {
					return !event.numFixed;
				},
				charlotte: true,
				silent: true,
				async content(_event, trigger, _player) {
					trigger.num += 3;
				},
				sub: true,
			},
		},
	}
```

## gz_wangping 名字:王平 势力:shu

### jianglue 名字:将略
描述: 限定技，出牌阶段，你可以选择一个“军令”，然后与你势力相同的其他角色可以执行该军令（未确定势力角色可以在此时明置一张单势力武将牌）。你与所有执行该军令的角色增加1点体力上限，然后回复1点体力，然后你摸X张牌（X为以此法回复了体力的角色数）。
```js
jianglue: {
		limited: true,
		audio: 2,
		enable: "phaseUse",
		prepare(cards, player) {
			var targets = game.filterPlayer(function (current) {
				return current.isFriendOf(player) || current.isUnseen();
			});
			player.line(targets, "fire");
		},
		content() {
			"step 0";
			player.awakenSkill(event.name);
			player.addTempSkill("jianglue_count");
			player.chooseJunlingFor(player).set("prompt", "选择一张军令牌，令与你势力相同的其他角色选择是否执行");
			"step 1";
			event.junling = result.junling;
			event.targets = result.targets;
			event.players = game
				.filterPlayer(function (current) {
					if (current == player) {
						return false;
					}
					return current.isFriendOf(player) || (player.identity != "ye" && current.isUnseen());
				})
				.sort(lib.sort.seat);
			event.num = 0;
			event.filterName = function (name) {
				return lib.character[name][1] == player.identity && !get.is.double(name);
			};
			"step 2";
			if (num < event.players.length) {
				event.current = event.players[num];
			}
			if (event.current && event.current.isAlive()) {
				event.showCharacter = false;
				var choiceList = ["执行该军令，增加1点体力上限，然后回复1点体力", "不执行该军令"];
				if (event.current.isFriendOf(player)) {
					event.current
						.chooseJunlingControl(player, event.junling, targets)
						.set("prompt", "将略")
						.set("choiceList", choiceList)
						.set("ai", function () {
							if (event.junling == "junling6" && (event.current.countCards("h") > 3 || event.current.countCards("e") > 2)) {
								return 1;
							}
							return event.junling == "junling5" ? 1 : 0;
						});
				} else if ((event.filterName(event.current.name1) || event.filterName(event.current.name2)) && event.current.wontYe(player.identity)) {
					event.showCharacter = true;
					choiceList[0] = "明置一张武将牌以" + choiceList[0];
					choiceList[1] = "不明置武将牌且" + choiceList[1];
					event.current
						.chooseJunlingControl(player, event.junling, targets)
						.set("prompt", "将略")
						.set("choiceList", choiceList)
						.set("ai", function () {
							if (event.junling == "junling6" && (event.current.countCards("h") > 3 || event.current.countCards("e") > 2)) {
								return 1;
							}
							return event.junling == "junling5" ? 1 : 0;
						});
				} else {
					event.current.chooseJunlingControl(player, event.junling, targets).set("prompt", "将略").set("controls", ["ok"]);
				}
			} else {
				event.goto(4);
			}
			"step 3";
			event.carry = false;
			if (result.index == 0 && result.control != "ok") {
				event.carry = true;
				if (event.showCharacter) {
					var list = [];
					if (event.filterName(event.current.name1)) {
						list.push("主将");
					}
					if (event.filterName(event.current.name2)) {
						list.push("副将");
					}
					if (list.length > 1) {
						event.current.chooseControl(["主将", "副将"]).set("ai", function () {
							let player = _status.event.player;
							if (get.character(player.name1, 3).includes("gzxuanhuo")) {
								return 0;
							}
							if (get.character(player.name2, 3).includes("gzxuanhuo")) {
								return 1;
							}
							return Math.random() > 0.5 ? 0 : 1;
						}).prompt = "选择并展示一张武将牌，然后执行军令";
					} else {
						event._result = { index: list[0] == "主将" ? 0 : 1 };
					}
				}
			}
			"step 4";
			if (!event.list) {
				event.list = [player];
			}
			if (event.carry) {
				if (event.showCharacter) {
					event.current.showCharacter(result.index);
				}
				event.current.carryOutJunling(player, event.junling, targets);
				event.list.push(event.current);
			}
			event.num++;
			if (event.num < event.players.length) {
				event.goto(2);
			}
			"step 5";
			event.num = 0;
			player.storage.jianglue_count = 0;
			"step 6";
			if (event.list[num].isAlive()) {
				event.list[num].gainMaxHp(true);
				event.list[num].recover();
			}
			event.num++;
			"step 7";
			if (event.num < event.list.length) {
				event.goto(6);
			} else if (player.storage.jianglue_count > 0) {
				player.draw(player.storage.jianglue_count);
			}
		},
		marktext: "略",
		skillAnimation: "epic",
		animationColor: "soil",
		ai: {
			order: 10,
			result: {
				player(player) {
					if (player.isUnseen() && player.wontYe()) {
						if (get.population(player.group) >= game.players.length / 4) {
							return 1;
						}
						return Math.random() > 0.7 ? 1 : 0;
					} else {
						return 1;
					}
				},
			},
		},
		subSkill: {
			count: {
				sub: true,
				trigger: { global: "recoverAfter" },
				silent: true,
				filter(event) {
					return event.getParent("jianglue");
				},
				content() {
					player.storage.jianglue_count++;
				},
			},
		},
	}
```

## gz_fazheng 名字:法正 势力:shu

### gzxuanhuo 名字:眩惑
描述: `与你势力相同的其他角色的出牌阶段限一次，其可弃置一张手牌，然后选择获得以下一项技能直到回合结束：${get.poptip("fz_wusheng")}${get.poptip("fz_new_paoxiao")}${get.poptip("fz_new_longdan")}${get.poptip("fz_new_tieji")}${get.poptip("fz_liegong")}${get.poptip("fz_xinkuanggu")}。`
```js
gzxuanhuo: {
		audio: "xinxuanhuo",
		global: "gzxuanhuo_others",
		derivation: ["fz_wusheng", "fz_new_paoxiao", "fz_new_longdan", "fz_new_tieji", "fz_liegong", "fz_xinkuanggu"],
		ai: {
			threaten(player, target) {
				if (
					game.hasPlayer(function (current) {
						return current != target && current.isFriendOf(target);
					})
				) {
					return 1.5;
				}
				return 0.5;
			},
		},
		subSkill: {
			others: {
				audio: "xinxuanhuo",
				forceaudio: true,
				enable: "phaseUse",
				usable: 1,
				filter(event, player) {
					return (
						!player.isUnseen() &&
						player.countCards("h") > 0 &&
						game.hasPlayer(function (current) {
							return current != player && current.hasSkill("gzxuanhuo") && player.isFriendOf(current);
						})
					);
				},
				prompt: "弃置一张手牌，然后获得以下技能中的一个：〖武圣〗〖咆哮〗〖龙胆〗〖铁骑〗〖烈弓〗〖狂骨〗",
				position: "h",
				filterCard: true,
				check(card) {
					let player = _status.event.player,
						shas = player.countCards("h", cardx => {
							return cardx != card && cardx.name == "sha" && player.hasUseTarget(cardx);
						}),
						count = player.getCardUsable("sha"),
						val = (get.name(card) == "sha" ? 2 : 1) * get.value(card);
					if (!shas || count - shas > 1) {
						return (player.needsToDiscard() ? 7 : 1) - val;
					}
					return 7 - val;
				},
				content() {
					"step 0";
					var list = ["gz_wusheng", "gz_paoxiao", "gz_longdan", "gz_tieji", "liegong", "xinkuanggu"];
					player
						.chooseControl(list)
						.set("ai", function () {
							let res = get.event().res;
							if (list.includes(res)) {
								return res;
							}
							return 0;
						})
						.set(
							"res",
							(function () {
								let shas = player.mayHaveSha(player, "use", null, "count"),
									count = player.getCardUsable("sha");
								if (shas > count) {
									return "gzpaoxiao";
								}
								if (shas < count) {
									return "new_rewusheng";
								}
								if (!shas) {
									return "xinkuanggu";
								}
								return ["new_longdan", "new_tieji", "liegong"].randomGet(); //脑子不够用了
							})()
						)
						.set("prompt", "选择并获得一项技能直到回合结束");
					"step 1";
					player.popup(result.control);
					var map = {
						gz_wusheng: "fz_wusheng",
						gz_paoxiao: "fz_new_paoxiao",
						gz_longdan: "fz_new_longdan",
						gz_tieji: "fz_new_tieji",
						liegong: "fz_liegong",
						xinkuanggu: "fz_xinkuanggu",
					};
					player.addTempSkill(map[result.control]);
					game.log(player, "获得了技能", "#g【" + get.translation(result.control) + "】");
					game.delay();
				},
				// forceaudio:true,
				// audio:['xuanhuo',2],
				ai: {
					order: 8,
					result: { player: 1 },
				},
			},
			//used:{},
		},
		// audio:['xuanhuo',2],
	}
```

### gzenyuan 名字:恩怨
描述: 锁定技，当其他角色对你使用【桃】时，该角色摸一张牌；当你受到伤害后，伤害来源须交给你一张手牌或失去1点体力。
```js
gzenyuan: {
		locked: true,
		audio: "xinenyuan",
		group: ["gzenyuan_gain", "gzenyuan_damage"],
		preHidden: true,
		ai: {
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
		subSkill: {
			gain: {
				audio: "xinenyuan",
				trigger: { target: "useCardToTargeted" },
				forced: true,
				filter(event, player) {
					return event.card.name == "tao" && event.player != player;
				},
				logTarget: "player",
				content() {
					trigger.player.draw();
				},
			},
			damage: {
				audio: "xinenyuan",
				trigger: { player: "damageEnd" },
				forced: true,
				filter(event, player) {
					return event.source && event.source != player && event.num > 0;
				},
				content() {
					"step 0";
					player.logSkill("enyuan_damage", trigger.source);
					trigger.source.chooseCard("交给" + get.translation(player) + "一张手牌，或失去1点体力", "h").set("ai", function (card) {
						if (get.attitude(_status.event.player, _status.event.getParent().player) > 0) {
							return 11 - get.value(card);
						}
						return 7 - get.value(card);
					});
					"step 1";
					if (result.bool) {
						trigger.source.give(result.cards[0], player, "giveAuto");
					} else {
						trigger.source.loseHp();
					}
				},
			},
		},
	}
```

## gz_wuguotai 名字:gz_wuguotai 势力:wu

### gzbuyi 名字:补益
描述: 每回合限一次，当一名与你势力相同的角色脱离濒死状态后，你可以选择一个“军令”，令伤害来源选择一项：执行该军令，或令该脱离濒死状态的角色回复1点体力。
```js
gzbuyi: {
		trigger: { global: "dyingAfter" },
		usable: 1,
		filter(event, player) {
			if (!(event.player && event.player.isAlive() && event.source && event.source.isAlive())) {
				return false;
			}
			return event.player.isFriendOf(player) && event.reason && event.reason.name == "damage";
		},
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		logTarget: "source",
		preHidden: true,
		content() {
			"step 0";
			player.chooseJunlingFor(trigger.source);
			"step 1";
			event.junling = result.junling;
			event.targets = result.targets;
			var choiceList = [];
			choiceList.push("执行该军令");
			choiceList.push("令" + get.translation(trigger.player) + (trigger.player == trigger.source ? "（你）" : "") + "回复1点体力");
			trigger.source
				.chooseJunlingControl(player, result.junling, result.targets)
				.set("prompt", "补益")
				.set("choiceList", choiceList)
				.set("ai", function () {
					if (get.recoverEffect(trigger.player, player, _status.event.player) > 0) {
						return 1;
					}
					return get.attitude(trigger.source, trigger.player) < 0 && get.junlingEffect(player, result.junling, trigger.source, result.targets, trigger.source) >= -2 ? 1 : 0;
				});
			"step 2";
			if (result.index == 0) {
				trigger.source.carryOutJunling(player, event.junling, targets);
			} else {
				trigger.player.recover(player);
			}
		},
		audio: ["buyi", 2],
	}
```

### ganlu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_lukang 名字:陆抗 势力:wu

### fakejueyan 名字:决堰
描述: `${get.poptip("guozhan_mainSkill")}。①此武将牌计算体力上限时减少半个阴阳鱼。②准备阶段，你可以选择一个区域并于本回合的结束阶段弃置此区域的所有牌，然后你于本回合获得以下对应效果：⒈判定区：跳过判定阶段，获得${get.poptip("fakejizhi")}直到回合结束；⒉装备区：摸三张牌，本回合手牌上限+3；⒊手牌区：本回合使用【杀】的额定次数+3。`
```js
fakejueyan: {
		mainSkill: true,
		init(player) {
			if (player.checkMainSkill("fakejueyan")) {
				player.removeMaxHp();
			}
		},
		audio: "drlt_jueyan",
		derivation: "fakejizhi",
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			const { control } = await player
				.chooseControl("判定区", "装备区", "手牌区", "cancel2")
				.set("prompt", "###" + get.prompt("fakejueyan") + '###<div class="text center">于本回合结束阶段弃置一个区域的所有牌，然后…</div>')
				.set("choiceList", ["判定区：跳过判定阶段，获得〖集智〗直到回合结束", "装备区：摸三张牌，本回合手牌上限+3", "手牌区：本回合使用【杀】的额定次数+3"])
				.set("ai", () => {
					const player = get.event().player;
					if (player.countCards("j", { type: "delay" })) {
						return "判定区";
					}
					if (player.countCards("h") < 3) {
						return "装备区";
					}
					if (
						player.countCards("hs", card => {
							return get.name(card) == "sha" && player.hasUseTarget(card);
						}) > player.getCardUsable("sha")
					) {
						return "手牌区";
					}
					return "判定区";
				})
				.forResult();
			event.result = { bool: control != "cancel2", cost_data: control };
		},
		async content(event, trigger, player) {
			const position = { 判定区: "j", 装备区: "e", 手牌区: "h" }[event.cost_data];
			switch (position) {
				case "j":
					player.skip("phaseJudge");
					player.addTempSkills("fakejizhi");
					break;
				case "e":
					await player.draw(3);
					player.addTempSkill("drlt_jueyan3");
					break;
				case "h":
					player.addTempSkill("drlt_jueyan1");
					break;
			}
			player.when("phaseJieshuBegin").step(async () => {
				if (player.countCards(position)) {
					await player.discard(player.getCards(position));
				}
			});
		},
	}
```

### fakekeshou 名字:恪守
描述: ①当你受到伤害时，你可以弃置两张颜色相同的牌并令此伤害-1。②当你因弃置而一次性失去至少两张牌后，若你的势力已确定且场上没有与你势力相同的其他角色，则你可以进行判定，若结果判定为红色，你摸一张牌。
```js
fakekeshou: {
		audio: "keshou",
		trigger: { player: "damageBegin3" },
		filter(event, player) {
			return event.num > 0;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(get.prompt("fakekeshou"), "弃置两张颜色相同的牌，令即将受到的伤害-1", "he", 2, card => {
					return !ui.selected.cards.length || get.color(card) == get.color(ui.selected.cards[0]);
				})
				.set("logSkill", "fakekeshou")
				.set("complexCard", true)
				.setHiddenSkill("fakekeshou")
				.set("ai", card => {
					if (!_status.event.check) {
						return 0;
					}
					var player = _status.event.player;
					if (player.hp == 1) {
						if (
							!player.countCards("h", function (card) {
								return get.tag(card, "save");
							}) &&
							!player.hasSkillTag("save", true)
						) {
							return 10 - get.value(card);
						}
						return 7 - get.value(card);
					}
					return 6 - get.value(card);
				})
				.set("check", player.countCards("h", { color: "red" }) > 1 || player.countCards("h", { color: "black" }) > 1)
				.forResult();
		},
		popup: false,
		async content(event, trigger, player) {
			trigger.num--;
		},
		group: "fakekeshou_draw",
		subSkill: {
			draw: {
				audio: "keshou",
				trigger: {
					player: "loseAfter",
					global: "loseAsyncAfter",
				},
				filter(event, player) {
					if (event.type != "discard" || event.getlx === false) {
						return false;
					}
					if (
						!(
							!player.isUnseen() &&
							!game.hasPlayer(current => {
								return current != player && current.isFriendOf(player);
							})
						)
					) {
						return false;
					}
					const evt = event.getl(player);
					return evt && evt.cards2 && evt.cards2.length > 1;
				},
				prompt2: "进行一次判定，若为红色，则你摸一张牌",
				async content(event, trigger, player) {
					const result = await player
						.judge(card => {
							return get.color(card) == "red" ? 1 : 0;
						})
						.forResult();
					if (result.judge > 0) {
						await player.draw();
					}
				},
			},
		},
	}
```

## gz_yuanshu 名字:袁术 势力:qun

### gzweidi 名字:伪帝
描述: 出牌阶段限一次，你可以指定一名本回合从牌堆得到过牌的其他角色并选择一个“军令”，令其选择一项：执行该军令；或令你获得其所有手牌，然后交给其等量的牌。
```js
gzweidi: {
		init(player) {
			player.storage.gzweidi = [];
		},
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.storage.gzweidi.length > 0;
		},
		filterTarget(card, player, target) {
			return target != player && player.storage.gzweidi.includes(target);
		},
		content() {
			"step 0";
			player.chooseJunlingFor(target);
			"step 1";
			event.junling = result.junling;
			event.targets = result.targets;
			var choiceList = ["执行该军令"];
			if (target != player) {
				choiceList.push("令" + get.translation(player) + "获得你所有手牌，然后交给你等量的牌");
			} else {
				choiceList.push("不执行该军令");
			}
			target
				.chooseJunlingControl(player, result.junling, result.targets)
				.set("prompt", "伪帝")
				.set("choiceList", choiceList)
				.set("ai", function () {
					if (get.attitude(target, player) >= 0) {
						return get.junlingEffect(player, result.junling, target, result.targets, target) >= 0 ? 0 : 1;
					}
					return get.junlingEffect(player, result.junling, target, result.targets, target) >= -1 ? 0 : 1;
				});
			"step 2";
			if (result.index == 0) {
				target.carryOutJunling(player, event.junling, targets);
			} else if (target != player && target.countCards("h")) {
				event.num = target.countCards("h");
				player.gain(target.getCards("h"), target, "giveAuto");
				player.chooseCard("交给" + get.translation(target) + get.cnNumber(event.num) + "张牌", "he", event.num, true).set("ai", function (card) {
					return -get.value(card);
				});
			} else {
				event.finish();
			}
			"step 3";
			if (result.cards) {
				player.give(result.cards, target);
			}
		},
		group: ["gzweidi_ft", "gzweidi_ftc"],
		ai: {
			order: 3,
			result: {
				player: 1,
			},
		},
		subSkill: {
			ft: {
				sub: true,
				trigger: { global: "gainBefore" },
				silent: true,
				filter(event, player) {
					if (player == event.player || player.storage.gzweidi.includes(event.player) || _status.currentPhase != player) {
						return false;
					}
					if (event.cards.length) {
						if (event.getParent().name == "draw") {
							return true;
						}
						for (var i = 0; i < event.cards.length; i++) {
							if (get.position(event.cards[i]) == "c" || (!get.position(event.cards[i]) && event.cards[i].original == "c")) {
								return true;
							}
						}
					}
					return false;
				},
				content() {
					player.storage.gzweidi.push(trigger.player);
				},
			},
			ftc: {
				sub: true,
				trigger: { global: "phaseAfter" },
				silent: true,
				filter(event, player) {
					return event.player == player;
				},
				content() {
					player.storage.gzweidi = [];
				},
			},
		},
		audio: ["weidi", 2],
	}
```

### gzyongsi 名字:庸肆
描述: 锁定技，若场上没有【玉玺】，则视为你装备了【玉玺】；当你成为【知己知彼】的目标时，你展示你的所有手牌。
```js
gzyongsi: {
		audio: "yongsi1",
		init(player, skill) {
			player.addExtraEquip(skill, "yuxi", true, player => lib.card.yuxi && !game.hasPlayer(current => current.getEquip("yuxi")));
		},
		onremove(player, skill) {
			player.removeExtraEquip(skill);
		},
		group: ["gzyongsi_eff1", "gzyongsi_eff2", "gzyongsi_eff3"],
		preHidden: ["gzyongsi_eff3"],
		ai: {
			threaten(player, target) {
				if (
					game.hasPlayer(function (current) {
						return current != target && current.getEquip("yuxi");
					})
				) {
					return 0.5;
				}
				return 2;
			},
			forceMajor: true,
			skillTagFilter() {
				return !game.hasPlayer(function (current) {
					return current.getEquip("yuxi");
				});
			},
		},
		subSkill: {
			eff1: {
				sub: true,
				equipSkill: true,
				noHidden: true,
				trigger: { player: "phaseDrawBegin2" },
				//priority:8,
				forced: true,
				filter(event, player) {
					if (event.numFixed || player.isDisabled(5)) {
						return false;
					}
					return !game.hasPlayer(function (current) {
						return current.getEquips("yuxi").length > 0;
					});
				},
				content() {
					trigger.num++;
				},
				audio: ["yongsi1", 2],
			},
			eff2: {
				sub: true,
				trigger: { player: "phaseUseBegin" },
				//priority:8,
				forced: true,
				noHidden: true,
				equipSkill: true,
				filter(event, player) {
					if (player.isDisabled(5)) {
						return false;
					}
					return (
						game.hasPlayer(function (current) {
							return player.canUse("zhibi", current);
						}) &&
						!game.hasPlayer(function (current) {
							return current.getEquips("yuxi").length > 0;
						})
					);
				},
				content() {
					player.chooseUseTarget("玉玺（庸肆）：选择知己知彼的目标", { name: "zhibi" });
				},
				audio: ["yongsi1", 2],
			},
			eff3: {
				sub: true,
				trigger: { global: "useCardToTargeted" },
				//priority:16,
				forced: true,
				filter(event, player) {
					return event.target && event.target == player && event.card && event.card.name == "zhibi";
				},
				check() {
					return false;
				},
				content() {
					player.showHandcards();
				},
			},
		},
	}
```

## gz_zhangxiu 名字:张绣 势力:qun

### gzfudi 名字:附敌
描述: 当你受到伤害后，你可以交给伤害来源一张手牌。若如此做，你对其势力中体力值最大且不小于你的一名角色造成1点伤害。
```js
gzfudi: {
		trigger: { global: "damageEnd" },
		direct: true,
		preHidden: true,
		audio: 2,
		filter(event, player) {
			return event.source && event.source.isAlive() && event.source != player && event.player == player && player.countCards("h") && event.num > 0;
		},
		content() {
			"step 0";
			var players = game.filterPlayer(function (current) {
				return (
					current.isFriendOf(trigger.source) &&
					current.hp >= player.hp &&
					!game.hasPlayer(function (current2) {
						return current2.hp > current.hp && current2.isFriendOf(trigger.source);
					})
				);
			});
			var check = true;
			if (!players.length) {
				check = false;
			} else {
				if (get.attitude(player, trigger.source) >= 0) {
					check = false;
				}
			}
			player
				.chooseCard(get.prompt("gzfudi", trigger.source), "交给其一张手牌，然后对其势力中体力值最大且不小于你的一名角色造成1点伤害")
				.set("aicheck", check)
				.set("ai", function (card) {
					if (!_status.event.aicheck) {
						return 0;
					}
					return 9 - get.value(card);
				})
				.setHiddenSkill(event.name);
			"step 1";
			if (result.bool) {
				player.logSkill("gzfudi", trigger.source);
				player.give(result.cards, trigger.source);
			} else {
				event.finish();
			}
			"step 2";
			var list = game.filterPlayer(function (current) {
				return (
					current.hp >= player.hp &&
					current.isFriendOf(trigger.source) &&
					!game.hasPlayer(function (current2) {
						return current2.hp > current.hp && current2.isFriendOf(trigger.source);
					})
				);
			});
			if (list.length) {
				if (list.length == 1) {
					event._result = { bool: true, targets: list };
				} else {
					player
						.chooseTarget(true, "对" + get.translation(trigger.source) + "势力中体力值最大的一名角色造成1点伤害", function (card, player, target) {
							return _status.event.list.includes(target);
						})
						.set("list", list)
						.set("ai", function (target) {
							return get.damageEffect(target, player, player);
						});
				}
			} else {
				event.finish();
			}
			"step 3";
			if (result.bool && result.targets.length) {
				player.line(result.targets[0]);
				result.targets[0].damage();
			}
		},
		ai: {
			maixie: true,
			maixie_defend: true,
			effect: {
				target(card, player, target) {
					if (get.tag(card, "damage") && target.hp > 1) {
						if (player.hasSkillTag("jueqing", false, target)) {
							return [1, -2];
						}
						if (!target.countCards("h")) {
							return [1, -1];
						}
						if (
							game.countPlayer(function (current) {
								return current.isFriendOf(player) && current.hp >= target.hp - 1;
							})
						) {
							return [1, 0, 0, -2];
						}
					}
				},
			},
		},
	}
```

### gzcongjian 名字:从谏
描述: 锁定技，当你于回合外造成伤害，或于回合内受到伤害时，此伤害+1。
```js
gzcongjian: {
		trigger: {
			player: "damageBegin3",
			source: "damageBegin1",
		},
		forced: true,
		preHidden: true,
		audio: "drlt_congjian",
		filter(event, player, name) {
			if (event.num <= 0) {
				return false;
			}
			if (name == "damageBegin1" && _status.currentPhase != player) {
				return true;
			}
			if (name == "damageBegin3" && _status.currentPhase == player) {
				return true;
			}
			return false;
		},
		check(event, player) {
			return _status.currentPhase != player;
		},
		content() {
			trigger.num++;
		},
	}
```

## gz_zhonghui 名字:gz_zhonghui 势力:ye

### fakequanji 名字:权计
描述: ①每回合每项各限一次，当你造成或受到伤害后，你可以摸X张牌，然后将等量的牌称为“权”置于武将牌上。②你的手牌上限+X。（X为你武将牌上的“权”数，至少为1，至多为你的体力上限）
```js
fakequanji: {
		audio: "gzquanji",
		inherit: "gzquanji",
		filter(event, player, name) {
			return !player.hasHistory("useSkill", evt => {
				return evt.skill == "fakequanji" && evt.event.triggername == name;
			});
		},
		async content(event, trigger, player) {
			const num = Math.max(1, Math.min(player.maxHp, player.getExpansions("fakequanji").length));
			await player.draw(num);
			const hs = player.getCards("he");
			let result;
			if (hs.length > 0) {
				if (hs.length <= num) {
					result = { bool: true, cards: hs };
				} else {
					result = await player.chooseCard("he", true, "选择" + get.cnNumber(num) + "张牌作为“权”", num, "allowChooseAll").forResult();
				}
				if (result?.bool) {
					const cards = result.cards;
					const next = player.addToExpansion(cards, player, "give");
					next.gaintag.add("fakequanji");
					await next;
				}
			}
		},
		mod: {
			maxHandcard(player, num) {
				return num + Math.max(1, Math.min(player.maxHp, player.getExpansions("fakequanji").length));
			},
		},
		ai: {
			notemp: true,
		},
	}
```

### fakepaiyi 名字:排异
描述: 出牌阶段限一次，你可以选择一名角色，然后选择一个军令令其选择是否执行。若其执行，则你摸X张牌，然后将一张“权”置入弃牌堆；若其不执行，则你可以对至多X名与其势力相同的角色各造成1点伤害，然后将等量的“权”置入弃牌堆。（X为你武将牌上的“权”数，至少为1，至多为你的体力上限）
```js
fakepaiyi: {
		audio: "gzpaiyi",
		enable: "phaseUse",
		filterTarget: true,
		usable: 1,
		async content(event, trigger, player) {
			const target = event.target;
			const { junling, targets } = await player.chooseJunlingFor(target).forResult();
			if (junling) {
				const str = get.translation(player),
					num = Math.max(1, Math.min(player.maxHp, player.getExpansions("fakequanji").length));
				const cnNum = get.cnNumber(num);
				const { index } = await target
					.chooseJunlingControl(player, junling, targets)
					.set("prompt", "排异")
					.set("choiceList", ["执行此军令，然后" + str + "摸" + cnNum + "张牌并将一张“权”置入弃牌堆", "不执行此军令，然后" + str + "可以对至多" + cnNum + "名与你势力相同的角色各造成1点伤害并移去等量的“权”"])
					.set("ai", () => {
						const all = Math.max(1, Math.min(player.maxHp, player.getExpansions("fakequanji").length));
						const effect = get.junlingEffect(player, junling, target, targets, target);
						const eff1 = effect + get.effect(player, { name: "draw" }, player, target) * all;
						const eff2 = ((source, player, num) => {
							let targets = game
								.filterPlayer(current => {
									return current.isFriendOf(player) && get.damageEffect(current, source, source) > 0 && get.damageEffect(current, source, player) < 0;
								})
								.sort((a, b) => {
									return (get.damageEffect(b, source, source) > 0 - get.damageEffect(b, source, player)) - (get.damageEffect(a, source, source) > 0 - get.damageEffect(a, source, player));
								})
								.slice(0, num);
							return targets.reduce((sum, target) => {
								return sum + (get.damageEffect(target, source, source) - get.damageEffect(target, source, player)) / 2;
							}, 0);
						})(player, target, all);
						return Math.max(0, get.sgn(eff2 - eff1));
					})
					.forResult();
				if (index == 0) {
					await target.carryOutJunling(player, junling, targets);
					await player.draw(num);
					if (player.getExpansions("fakequanji").length) {
						const { bool, links } = await player.chooseButton(["排异：请移去一张“权”", player.getExpansions("fakequanji")], true).forResult();
						if (bool) {
							await player.loseToDiscardpile(links);
						}
					}
				} else {
					const result = await player
						.chooseTarget(
							"排异：是否对至多" + cnNum + "名与" + get.translation(target) + "势力相同的角色各造成1点伤害并移去等量的“权”？",
							(card, player, target) => {
								return target.isFriendOf(get.event().target);
							},
							[1, num]
						)
						.set("target", target)
						.set("ai", target => {
							return get.damageEffect(target, get.event().player, get.event().player);
						})
						.forResult();
					if (result.bool) {
						const targetx = result.targets.sortBySeat();
						player.line(targetx);
						for (const i of targetx) {
							await i.damage();
						}
						if (player.getExpansions("fakequanji").length) {
							const { bool, links } = await player.chooseButton(["排异：请移去" + get.cnNumber(targetx.length) + "张“权”", player.getExpansions("fakequanji")], targetx.length, true).forResult();
							if (bool) {
								await player.loseToDiscardpile(links);
							}
						}
					}
				}
			}
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					return -game.countPlayer(current => {
						return current == target || current.isFriendOf(target);
					});
				},
			},
			combo: "fakequanji",
		},
	}
```

## gz_simazhao 名字:gz_simazhao 势力:ye

### gzzhaoxin 名字:昭心
描述: 当你受到伤害后，你可展示所有手牌，然后与一名手牌数不大于你的其他角色交换手牌。
```js
gzzhaoxin: {
		audio: 2,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		check: () => false,
		preHidden: true,
		content() {
			"step 0";
			player.showHandcards();
			"step 1";
			var hs = player.countCards("h");
			if (
				game.hasPlayer(function (current) {
					return current != player && current.countCards("h") <= hs;
				})
			) {
				player.chooseTarget(true, "请选择要交换手牌的目标角色", function (card, player, target) {
					return target != player && target.countCards("h") <= player.countCards("h");
				});
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				var target = result.targets[0];
				player.line(target, "green");
				player.swapHandcards(target);
			}
		},
	}
```

### gzsuzhi 名字:夙智
描述: `锁定技，每回合累计限三次；①当你于回合内因执行【杀】或【决斗】造成伤害时，此伤害+1；②你于回合内使用非转化的锦囊牌时摸一张牌，且无距离限制；③当有其他角色于你的回合内弃置牌后，你获得该角色的一张牌；④结束阶段，你获得${get.poptip("gzfankui")}直到下回合开始。`
```js
gzsuzhi: {
		audio: 2,
		derivation: "gzfankui",
		mod: {
			targetInRange(card, player, target) {
				if (player == _status.currentPhase && player.countMark("gzsuzhi_count") < 3 && get.type2(card) == "trick") {
					return true;
				}
			},
		},
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			return player.countMark("gzsuzhi_count") < 3;
		},
		content() {
			player.addTempSkills("gzfankui", { player: "phaseBegin" });
		},
		group: ["gzsuzhi_damage", "gzsuzhi_draw", "gzsuzhi_gain"],
		preHidden: ["gzsuzhi_damage", "gzsuzhi_draw", "gzsuzhi_gain"],
		subSkill: {
			damage: {
				audio: "gzsuzhi",
				trigger: { source: "damageBegin1" },
				forced: true,
				filter(event, player) {
					return player == _status.currentPhase && player.countMark("gzsuzhi_count") < 3 && event.card && (event.card.name == "sha" || event.card.name == "juedou") && event.getParent().type == "card";
				},
				content() {
					trigger.num++;
					player.addTempSkill("gzsuzhi_count");
					player.addMark("gzsuzhi_count", 1, false);
				},
			},
			draw: {
				audio: "gzsuzhi",
				trigger: { player: "useCard" },
				forced: true,
				filter(event, player) {
					return player == _status.currentPhase && player.countMark("gzsuzhi_count") < 3 && event.card.isCard && get.type2(event.card) == "trick";
				},
				content() {
					player.draw();
					player.addTempSkill("gzsuzhi_count");
					player.addMark("gzsuzhi_count", 1, false);
				},
			},
			gain: {
				audio: "gzsuzhi",
				trigger: { global: "loseAfter" },
				forced: true,
				filter(event, player) {
					if (player != _status.currentPhase || event.type != "discard" || player == event.player || player.countMark("gzsuzhi_count") >= 3) {
						return false;
					}
					return event.player.countGainableCards(player, "he") > 0;
				},
				logTarget: "player",
				content() {
					"step 0";
					player.addTempSkill("gzsuzhi_count");
					player.addMark("gzsuzhi_count", 1, false);
					if (trigger.delay == false) {
						game.delay();
					}
					"step 1";
					player.gainPlayerCard(trigger.player, "he", true);
				},
			},
			count: {
				onremove: true,
			},
		},
	}
```

## gz_gongsunyuan 名字:gz_gongsunyuan 势力:ye

### fakehuaiyi 名字:怀异
描述: 出牌阶段限一次，你可以移除副将或弃置一个区域的所有牌，然后令所有大势力角色依次交给你至少一张牌，然后若存在多个大势力，则你移除一个此次交给你牌总数唯一最少的势力的其中一名角色的副将。
```js
fakehuaiyi: {
		audio: "gzhuaiyi",
		enable: "phaseUse",
		filter(event, player) {
			if (!game.hasPlayer(target => target.isMajor())) {
				return false;
			}
			return (
				player.hasViceCharacter() ||
				["h", "e", "j"].some(pos => {
					const cards = player.getCards(pos);
					return cards.length && cards.every(card => lib.filter.cardDiscardable(card, player));
				})
			);
		},
		usable: 1,
		chooseButton: {
			dialog() {
				return ui.create.dialog("###怀异###" + get.translation("fakehuaiyi_info"));
			},
			chooseControl(event, player) {
				let list = [],
					map = { h: "手牌区", e: "装备区", j: "判定区" };
				list.addArray(
					["h", "e", "j"]
						.filter(pos => {
							const cards = player.getCards(pos);
							return cards.length && cards.every(card => lib.filter.cardDiscardable(card, player));
						})
						.map(i => map[i])
				);
				if (player.hasViceCharacter()) {
					list.push("移除副将");
				}
				list.push("cancel2");
				return list;
			},
			check() {
				const player = get.event().player,
					count = pos => {
						const cards = player.getCards(pos);
						return cards.length && cards.every(card => lib.filter.cardDiscardable(card, player));
					};
				if (count("j")) {
					return "判定区";
				}
				if (player.hasViceCharacter() && get.guozhanRank(player.name2, player) <= 3) {
					return "移除副将";
				}
				if (count("e") && player.getCards("e") <= 1) {
					return "装备区";
				}
				if (count("h") && player.getCards("h") <= 2) {
					return "手牌区";
				}
				return "cancel2";
			},
			backup(result, player) {
				return {
					audio: "gzhuaiyi",
					filterCard: () => false,
					selectCard: -1,
					info: result.control,
					async content(event, trigger, player) {
						const control = get.info("fakehuaiyi_backup").info;
						if (control == "移除副将") {
							await player.removeCharacter(1);
						} else {
							const map = { 手牌区: "h", 装备区: "e", 判定区: "j" };
							await player.discard(player.getCards(map[control]));
						}
						let num = {};
						const targetx = game.filterPlayer(target => target.isMajor());
						for (const target of targetx) {
							if (typeof num[target.identity] != "number") {
								num[target.identity] = 0;
							}
						}
						let groups = Object.keys(num);
						const competition = groups.length > 1;
						for (const target of targetx) {
							if (target == player) {
								continue;
							}
							const { bool, cards } = await target
								.chooseToGive(player, "he", true, [1, Infinity], "怀异：交给" + get.translation(player) + "至少一张牌")
								.set("ai", card => {
									const player = get.event().player,
										targets = get.event().targetx;
									if (
										!get.event().competition ||
										!game.hasPlayer(target => {
											return target.isFriendOf(player) && target.hasViceCharacter() && get.guozhanRank(target.name2, target) > 4;
										})
									) {
										return -get.value(card);
									}
									if (ui.selected.cards.length >= get.rand(2, 3)) {
										return 0;
									}
									return 7.5 - get.value(card);
								})
								.set("targets", targetx)
								.set("num", num)
								.set("prompt2", competition ? "交牌最少的势力的一名角色的副将会被移除" : "")
								.set("complexCard", true)
								.set("competition", competition)
								.forResult();
							if (bool) {
								num[target.identity] += cards.length;
							}
						}
						groups.sort((a, b) => num[a] - num[b]);
						const group = groups[0];
						if (num[group] < num[groups[groups.length - 1]]) {
							player.line(targetx.filter(target => target.identity == group));
							if (targetx.some(target => target.identity == group && target.hasViceCharacter())) {
								const { bool, targets } = await player
									.chooseTarget(
										"怀异：移除" + get.translation(group) + "势力的其中一名角色的副将",
										(card, player, target) => {
											return target.identity == get.event().group && target.hasViceCharacter();
										},
										true
									)
									.set("group", group)
									.set("ai", target => -get.guozhanRank(target.name2, target))
									.forResult();
								if (bool) {
									const target = targets[0];
									player.line(target);
									game.log(player, "选择了", target);
									await target.removeCharacter(1);
								}
							}
						}
					},
					ai: { result: { player: 1 } },
				};
			},
		},
		ai: {
			order: 10,
			result: {
				player(player, target) {
					if (!game.hasPlayer(i => i.isMajor() && get.attitude(player, i) < 0)) {
						return 0;
					}
					if (player.getCards("j").every(card => lib.filter.cardDiscardable(card, player))) {
						return 1;
					}
					if (player.hasViceCharacter() && get.guozhanRank(player.name2, player) <= 3) {
						return 1;
					}
					if (player.getCards("e").every(card => lib.filter.cardDiscardable(card, player)) && player.getCards("e") <= 1) {
						return 1;
					}
					if (player.getCards("h").every(card => lib.filter.cardDiscardable(card, player)) && player.getCards("h") <= 1) {
						return 1;
					}
					return 0;
				},
			},
		},
		subSkill: { backup: {} },
	}
```

### fakezisui 名字:恣睢
描述: 锁定技。①一名角色被你移除副将后，你将被移除的武将牌称为“异”置于武将牌上。②摸牌阶段，你多摸X张牌。③结束阶段，若X大于你的体力上限，你死亡。（X为你武将牌上的“异”数）
```js
fakezisui: {
		audio: "gzzisui",
		trigger: { global: "removeCharacterEnd" },
		filter(event, player) {
			return event.getParent().player == player;
		},
		forced: true,
		content() {
			const list = [trigger.toRemove];
			player.markAuto("fakezisui", list);
			game.log(player, "将", "#g" + get.translation(list), "置于武将牌上作为", "#y“异”");
			game.broadcastAll(
				(player, list) => {
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
				},
				player,
				list
			);
		},
		marktext: "异",
		intro: {
			content: "character",
			onunmark(storage, player) {
				if (storage && storage.length) {
					_status.characterlist.addArray(storage);
					storage = [];
				}
			},
			mark(dialog, storage, player) {
				if (storage && storage.length) {
					dialog.addSmall([storage, "character"]);
				} else {
					return "没有“异”";
				}
			},
		},
		group: "fakezisui_effect",
		subSkill: {
			effect: {
				audio: "gzzisui",
				trigger: { player: ["phaseDrawBegin2", "phaseJieshuBegin"] },
				filter(event, player) {
					const num = player.getStorage("fakezisui").length;
					if (!num) {
						return false;
					}
					if (event.name == "phaseDraw") {
						return !event.numFixed;
					}
					return num > player.maxHp;
				},
				forced: true,
				content() {
					const num = player.getStorage("fakezisui").length;
					if (trigger.name == "phaseDraw") {
						trigger.num += num;
					} else {
						player.die();
					}
				},
			},
		},
	}
```

## gz_sunchen 名字:gz_sunchen 势力:ye

### fakeshilu 名字:嗜戮
描述: 锁定技，①出牌阶段结束时，若你有副将且本回合未发动过副将武将牌上的非锁定技，则你更换副将至你武将牌上的“戮”未包含的势力并将原副将称为“戮”置于武将牌上。②准备阶段，你弃置X张手牌，然后摸X张牌（X为你武将牌上的“戮”数，少牌全弃，无牌不弃）。
```js
fakeshilu: {
		audio: "zyshilu",
		trigger: { player: ["phaseZhunbeiBegin", "phaseUseEnd"] },
		filter(event, player) {
			if (event.name == "phaseZhunbei") {
				return player.getStorage("fakeshilu").length;
			}
			if (!player.hasViceCharacter()) {
				return false;
			}
			const skills = get.character(player.name2, 3).filter(i => !get.is.locked(i, player));
			return !player.hasHistory("useSkill", evt => skills.includes(evt.sourceSkill || evt.skill));
		},
		forced: true,
		//locked: false,
		async content(event, trigger, player) {
			if (trigger.name == "phaseZhunbei") {
				const num = player.getStorage("fakeshilu").length;
				await player.chooseToDiscard(num, "h", true);
				await player.draw(num);
			} else {
				await player.changeVice().setContent(get.info("fakeshilu").changeVice);
			}
		},
		getGroups(player) {
			return player
				.getStorage("fakeshilu")
				.map(i => {
					const double = get.is.double(i, true);
					return double ? double : [get.character(i, 1)];
				})
				.reduce((all, groups) => {
					all.addArray(groups);
					return all;
				}, []);
		},
		changeVice() {
			"step 0";
			player.showCharacter(2);
			if (!event.num) {
				event.num = 3;
			}
			var group = player.identity;
			if (!lib.group.includes(group)) {
				group = lib.character[player.name1][1];
			}
			_status.characterlist.randomSort();
			event.tochange = [];
			for (var i = 0; i < _status.characterlist.length; i++) {
				if (_status.characterlist[i].indexOf("gz_jun_") == 0) {
					continue;
				}
				var goon = false,
					group2 = lib.character[_status.characterlist[i]][1];
				if (group == "ye") {
					if (group2 != "ye") {
						goon = true;
					}
				} else {
					if (group == group2) {
						goon = true;
					} else {
						var double = get.is.double(_status.characterlist[i], true);
						if (double && double.includes(group)) {
							goon = true;
						}
					}
				}
				if (goon) {
					event.tochange.push(_status.characterlist[i]);
				}
			}
			event.tochange = event.tochange
				.filter(character => {
					const groups = get.info("fakeshilu").getGroups(player);
					const doublex = get.is.double(character, true);
					const group = doublex ? doublex : [get.character(character, 1)];
					return !group.some(j => groups.includes(j));
				})
				.randomGets(event.num);
			if (!event.tochange.length) {
				event.finish();
			} else {
				if (event.tochange.length == 1) {
					event._result = {
						bool: true,
						links: event.tochange,
					};
				} else {
					player.chooseButton(true, ["请选择要变更的武将牌，并将原副将武将牌置于武将牌上", [event.tochange, "character"]]).ai = function (button) {
						return get.guozhanRank(button.link);
					};
				}
			}
			"step 1";
			var name = result.links[0];
			_status.characterlist.remove(name);
			if (player.hasViceCharacter()) {
				event.change = true;
			}
			event.toRemove = player.name2;
			event.toChange = name;
			if (event.change) {
				event.trigger("removeCharacterBefore");
			}
			if (event.hidden) {
				if (!player.isUnseen(1)) {
					player.hideCharacter(1);
				}
			}
			"step 2";
			var name = event.toChange;
			if (event.hidden) {
				game.log(player, "替换了副将", "#g" + get.translation(player.name2));
			} else {
				game.log(player, "将副将从", "#g" + get.translation(player.name2), "变更为", "#g" + get.translation(name));
			}
			player.viceChanged = true;
			player.reinitCharacter(player.name2, name, false);
			"step 3";
			if (event.change && event.toRemove) {
				const list = [event.toRemove];
				player.markAuto("fakeshilu", list);
				game.log(player, "将", "#g" + get.translation(list), "置于武将牌上作为", "#y“戮”");
				game.broadcastAll(
					(player, list) => {
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
					},
					player,
					list
				);
			}
		},
		marktext: "戮",
		intro: {
			content: "character",
			onunmark(storage, player) {
				if (storage && storage.length) {
					_status.characterlist.addArray(storage);
					storage = [];
				}
			},
			mark(dialog, storage, player) {
				if (storage && storage.length) {
					dialog.addSmall([storage, "character"]);
				} else {
					return "没有“戮”";
				}
			},
		},
	}
```

### fakexiongnve 名字:凶虐
描述: 锁定技，①当你使用【杀】造成伤害时或受到【杀】造成的伤害时，若你武将牌上的“戮”包含伤害来源或受伤角色的势力，则你令此伤害+1。②当你受到不为【杀】造成的伤害时，若你武将牌上的“戮”包含伤害来源的势力，则此伤害-1。
```js
fakexiongnve: {
		audio: "zyxiongnve",
		trigger: {
			source: "damageBegin1",
			player: ["damageBegin3", "damageBegin4"],
		},
		filter(event, player, name) {
			if (!event.source) {
				return false;
			}
			const num = parseInt(name.slice("damageBegin".length));
			const groups = get.info("fakeshilu").getGroups(player);
			const goon = event.card && event.card.name == "sha";
			if (num != 4) {
				return goon && (groups.includes(event.source.identity) || groups.includes(event.player.identity));
			}
			return !goon && groups.includes(event.source.identity);
		},
		forced: true,
		//locked: false,
		logTarget(event, player) {
			return event.source == player ? event.player : event.source;
		},
		async content(event, trigger, player) {
			if (parseInt(event.triggername.slice("damageBegin".length)) == 4) {
				trigger.num--;
			} else {
				trigger.num++;
			}
		},
		ai: {
			combo: "fakeshilu",
			effect: {
				target(card, player, target) {
					if (card && card.name == "sha") {
						return;
					}
					if (player.hasSkillTag("jueqing", false, target)) {
						return;
					}
					const groups = get.info("fakeshilu").getGroups(target);
					if (groups.includes(player.identity)) {
						var num = get.tag(card, "damage");
						if (num) {
							if (num > 1) {
								return 0.5;
							}
							return 0;
						}
					}
				},
			},
		},
	}
```

## gz_tangzi 名字:唐咨 势力:wu

### gzxingzhao 名字:兴棹
描述: `锁定技：①摸牌阶段开始时，若X不小于1，则你可以发动${get.poptip("gzxingzhao_xunxun")}的效果。②当你受到伤害后或使用装备牌时，若X不小于2且你的手牌数不为全场最多，则你摸一张牌。③若X不小于3，则你的手牌上限+4。④当你失去装备区的牌后，若X不小于4，则你摸一张牌。（X为场上有受伤角色的势力数）`
```js
gzxingzhao: {
		audio: 2,
		getNum() {
			var list = [],
				players = game.filterPlayer();
			for (var target of players) {
				if (target.isUnseen() || target.isHealthy()) {
					continue;
				}
				var add = true;
				for (var i of list) {
					if (i.isFriendOf(target)) {
						add = false;
						break;
					}
				}
				if (add) {
					list.add(target);
				}
			}
			return list.length;
		},
		mod: {
			maxHandcard(player, num) {
				return num + (lib.skill.gzxingzhao.getNum() > 2 ? 4 : 0);
			},
		},
		group: ["gzxingzhao_xunxun", "gzxingzhao_use", "gzxingzhao_lose"],
		preHidden: ["gzxingzhao_xunxun", "gzxingzhao_use", "gzxingzhao_lose"],
		subfrequent: ["use"],
		subSkill: {
			xunxun: {
				audio: 2,
				name: "恂恂",
				description: "摸牌阶段，你可以观看牌堆顶的四张牌，然后将其中的两张牌置于牌堆顶，并将其余的牌以任意顺序置于牌堆底。",
				trigger: { player: "phaseDrawBegin1" },
				filter(event, player) {
					return lib.skill.gzxingzhao.getNum() > 0;
				},
				content() {
					"step 0";
					var cards = get.cards(4);
					game.cardsGotoOrdering(cards);
					var next = player.chooseToMove("恂恂：将两张牌置于牌堆顶", true);
					next.set("list", [["牌堆顶", cards], ["牌堆底"]]);
					next.set("filterMove", function (from, to, moved) {
						if (to == 1 && moved[1].length >= 2) {
							return false;
						}
						return true;
					});
					next.set("filterOk", function (moved) {
						return moved[1].length == 2;
					});
					next.set("processAI", function (list) {
						var cards = list[0][1].slice(0).sort(function (a, b) {
							return get.value(b) - get.value(a);
						});
						return [cards, cards.splice(2)];
					});
					"step 1";
					var top = result.moved[0];
					var bottom = result.moved[1];
					top.reverse();
					game.cardsGotoPile(top.concat(bottom), ["top_cards", top], (event, card) => {
						if (event.top_cards.includes(card)) {
							return ui.cardPile.firstChild;
						}
						return null;
					});
					game.updateRoundNumber();
					game.delayx();
				},
			},
			use: {
				audio: "gzxingzhao",
				trigger: {
					player: ["useCard", "damageEnd"],
				},
				forced: true,
				filter(event, player) {
					return (event.name == "damage" || get.type(event.card) == "equip") && lib.skill.gzxingzhao.getNum() > 1 && !player.isMaxHandcard();
				},
				frequent: true,
				content() {
					player.draw();
				},
			},
			draw: {
				audio: "gzxingzhao",
				trigger: { player: "damageEnd" },
				forced: true,
				filter(event, player) {
					return lib.skill.gzxingzhao.getNum() > 1 && event.source && event.source.isAlive() && event.source.countCards("h") != player.countCards("h");
				},
				logTarget(event, player) {
					var target = event.source;
					return target.countCards("h") > player.countCards("h") ? player : target;
				},
				check(event, player) {
					return get.attitude(player, lib.skill.gzxingzhao_draw.logTarget(event, player)) > 0;
				},
				content() {
					lib.skill.gzxingzhao_draw.logTarget(trigger, player).draw();
				},
			},
			skip: {
				audio: "gzxingzhao",
				trigger: { player: "phaseDiscardBefore" },
				forced: true,
				filter() {
					return lib.skill.gzxingzhao.getNum() > 2;
				},
				content() {
					trigger.cancel();
					game.log(player, "跳过了", "#y弃牌阶段");
				},
			},
			lose: {
				audio: "gzxingzhao",
				trigger: {
					player: "loseAfter",
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
				},
				filter(event, player) {
					var evt = event.getl(player);
					return evt && evt.player == player && evt.es && evt.es.length > 0 && lib.skill.gzxingzhao.getNum() > 3;
				},
				forced: true,
				content() {
					player.draw();
				},
			},
		},
		ai: {
			threaten: 3,
			effect: {
				target_use(card, player, target, current) {
					if (lib.skill.gzxingzhao.getNum() > 3 && get.type(card) == "equip" && !get.cardtag(card, "gifts")) {
						return [1, 2];
					}
				},
			},
			reverseEquip: true,
			skillTagFilter() {
				return lib.skill.gzxingzhao.getNum() > 3;
			},
		},
	}
```

## gz_mengda 名字:孟达 势力:wei

### qiuan
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### liangfan
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_liuqi 名字:刘琦 势力:qun

### gzwenji 名字:问计
描述: 出牌阶段开始时，你可令一名其他角色交给你一张牌。然后若该角色：未确定势力或势力与你相同，则你于本回合内使用实体牌包含“问计”牌的牌无距离和次数限制，且不可被其他角色响应。与你势力不同，则你交给其一张不为“问计”牌的牌或令其摸一张牌。
```js
gzwenji: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		direct: true,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && current.countCards("he");
			});
		},
		preHidden: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt2("gzwenji"), function (card, player, target) {
					return target != player && target.countCards("he") > 0;
				})
				.set("ai", function (target) {
					var att = get.attitude(_status.event.player, target);
					if (target.identity == "unknown" && att <= 0) {
						return 20;
					}
					if (att > 0) {
						return Math.sqrt(att) / 10;
					}
					return 5 - att;
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("gzwenji", target);
				target.chooseCard("he", true, "问计：将一张牌交给" + get.translation(player));
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				event.card = result.cards[0];
				target.give(result.cards, player).gaintag.add("gzwenji");
			}
			"step 3";
			if (target.identity == "unknown" || target.isFriendOf(player)) {
				player.addTempSkill("gzwenji_respond");
				event.finish();
			} else if (
				target.isIn() &&
				player.countCards("he", function (card) {
					return !card.hasGaintag("gzwenji");
				})
			) {
				player
					.chooseCard("he", "交给" + get.translation(target) + "一张其他牌，或令其摸一张牌", function (card) {
						return !card.hasGaintag("gzwenji");
					})
					.set("ai", function (card) {
						return 5 - get.value(card);
					});
			} else {
				event.finish();
			}
			"step 4";
			if (result.bool) {
				player.give(result.cards, target);
				player.removeGaintag("gzwenji");
			} else {
				target.draw();
			}
		},
		subSkill: {
			respond: {
				onremove(player) {
					player.removeGaintag("gzwenji");
				},
				mod: {
					targetInRange(card, player, target) {
						if (!card.cards) {
							return;
						}
						for (var i of card.cards) {
							if (i.hasGaintag("gzwenji")) {
								return true;
							}
						}
					},
					cardUsable(card, player, target) {
						if (!card.cards) {
							return;
						}
						for (var i of card.cards) {
							if (i.hasGaintag("gzwenji")) {
								return Infinity;
							}
						}
					},
				},
				trigger: { player: "useCard" },
				forced: true,
				charlotte: true,
				audio: "gzwenji",
				filter(event, player) {
					return (
						player.getHistory("lose", function (evt) {
							if ((evt.relatedEvent || evt.getParent()) != event) {
								return false;
							}
							for (var i in evt.gaintag_map) {
								if (evt.gaintag_map[i].includes("gzwenji")) {
									return true;
								}
							}
							return false;
						}).length > 0
					);
				},
				content() {
					trigger.directHit.addArray(
						game.filterPlayer(function (current) {
							return current != player;
						})
					);
					if (trigger.addCount !== false) {
						trigger.addCount = false;
						var stat = player.getStat();
						if (stat && stat.card && stat.card[trigger.card.name]) {
							stat.card[trigger.card.name]--;
						}
					}
				},
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						return arg.card && arg.card.cards && arg.card.cards.filter(card => card.hasGaintag("gzwenji")).length > 0;
					},
				},
			},
		},
	}
```

### gztunjiang 名字:屯江
描述: 结束阶段，若你于本回合的出牌阶段内使用过牌且这些牌均未指定其他角色为目标，则你可摸X张牌（X为势力数）。
```js
gztunjiang: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		frequent: true,
		preHidden: true,
		filter(event, player) {
			if (
				!player.getHistory("useCard", function (evt) {
					return evt.isPhaseUsing();
				}).length
			) {
				return false;
			}
			return (
				player.getHistory("useCard", function (evt) {
					if (evt.targets && evt.targets.length && evt.isPhaseUsing()) {
						var targets = evt.targets.slice(0);
						while (targets.includes(player)) {
							targets.remove(player);
						}
						return targets.length > 0;
					}
					return false;
				}).length == 0
			);
		},
		content() {
			player.draw(game.countGroup());
		},
	}
```

## gz_mifangfushiren 名字:糜芳傅士仁 势力:shu

### mffengshi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_shixie 名字:士燮 势力:qun

### gzbiluan 名字:避乱
描述: 锁定技。其他角色计算至你的距离时+X（X为你装备区内的牌数）。
```js
gzbiluan: {
		audio: 2,
		mod: {
			globalTo(from, to, distance) {
				return distance + to.countCards("e");
			},
		},
	}
```

### gzrelixia 名字:礼下
描述: 锁定技。与你势力不同的角色的准备阶段，若你不在其攻击范围内，则其选择一项：①弃置你装备区内的一张牌并失去1点体力。②令你摸一张牌。
```js
gzrelixia: {
		audio: "gzlixia",
		trigger: { global: "phaseZhunbeiBegin" },
		noHidden: true,
		forced: true,
		filter(event, player) {
			return player != event.player && !event.player.isFriendOf(player) && !player.inRangeOf(event.player);
		},
		logTarget: "player",
		content() {
			"step 0";
			var target = trigger.player;
			event.target = target;
			if (!player.countDiscardableCards(target, "e")) {
				player.draw();
				event.finish();
				return;
			}
			var str = get.translation(player);
			target
				.chooseControl()
				.set("prompt", str + "发动了【礼下】，请选择一项")
				.set("choiceList", ["令" + str + "摸一张牌", "弃置" + str + "装备区内的一张牌并失去1点体力"])
				.set("ai", function () {
					var player = _status.event.player,
						target = _status.event.getParent().player;
					if (player.hp <= 1 || get.attitude(player, target) >= 0) {
						return 0;
					}
					if (
						target.countCards("e", function (card) {
							return get.value(card, target) >= 7 - player.hp;
						}) > 0
					) {
						return 1;
					}
					var dist = get.distance(player, target, "attack");
					if (dist > 1 && dist - target.countCards("e") <= 1) {
						return true;
					}
					return 0;
				});
			"step 1";
			if (result.index == 0) {
				player.draw();
			} else {
				target.discardPlayerCard(player, "e", true);
				target.loseHp();
			}
		},
	}
```

## gz_zhanglu 名字:张鲁 势力:qun

### gzrebushi 名字:布施
描述: ①回合结束后，你获得X个“义舍”标记（X为你的体力值）。②其他角色的准备阶段，你可以失去1个“义舍”标记，交给其一张牌并摸两张牌。③准备阶段，你须弃置Y张牌，然后失去所有“义舍”标记（Y为场上存活人数-你的体力值-2）。
```js
gzrebushi: {
		onremove: true,
		onunmark: true,
		intro: { content: "mark" },
		group: "gzrebushi_give",
		audio: "gzbushi",
		trigger: { player: ["phaseZhunbeiBegin", "phaseAfter"] },
		check(event, player) {
			return event.name == "phase";
		},
		forced: true,
		locked: false,
		content() {
			"step 0";
			if (trigger.name == "phaseZhunbei") {
				var num = game.countPlayer() - player.hp - 2;
				if (num > 0) {
					player.chooseToDiscard(num, "he", true);
				}
			} else {
				player.addMark("gzrebushi", player.hp);
				event.finish();
			}
			"step 1";
			player.removeMark("gzrebushi", player.countMark("gzrebushi"));
			if (!player.hasMark("gzrebushi")) {
				player.unmarkSkill("gzrebushi");
			}
		},
		ai: { mingzhi_no: true },
		subSkill: {
			give: {
				trigger: { global: "phaseZhunbeiBegin" },
				filter(event, player) {
					if (event.player == player) {
						return false;
					}
					return player.hasMark("gzrebushi") && player.countCards("he");
				},
				direct: true,
				content() {
					"step 0";
					player.chooseCard(get.prompt("gzrebushi"), "he", "失去1个“义舍”标记，将一张牌交给" + get.translation(trigger.player) + "并摸两张牌").set("ai", function (card) {
						var player = _status.event.player;
						var trigger = _status.event.getTrigger();
						var target = trigger.player;
						var num = 0,
							current = target;
						while (current != player) {
							if (current.isFriendOf(player) && !current.isTurnedOver()) {
								num++;
							}
							current = current.next;
						}
						if (num >= player.countMark("gzrebushi") && !target.isFriendOf(player)) {
							return -1;
						}
						return 6 - get.value(card);
					});
					"step 1";
					if (result.bool) {
						player.logSkill("gzrebushi", trigger.player);
						player.removeMark("gzrebushi", 1);
						if (!player.hasMark("gzrebushi")) {
							player.unmarkSkill("gzrebushi");
						}
						trigger.player.gain(result.cards, player, "giveAuto");
						player.draw(2);
					}
				},
			},
		},
	}
```

### gzremidao 名字:米道
描述: ①结束阶段，若你的武将牌上没有“米”，则你可以摸两张牌。若如此做，你将两张牌置于武将牌上，称为“米”。②一名角色的判定牌生效前，你可以打出一张“米”作为新的判定牌，然后你获得原判定牌。
```js
gzremidao: {
		group: "gzremidao_change",
		audio: "gzmidao",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return !player.getExpansions("gzremidao").length;
		},
		content() {
			"step 0";
			player.draw(2);
			"step 1";
			var cards = player.getCards("he");
			if (!cards.length) {
				event.finish();
			} else if (cards.length <= 2) {
				event._result = { bool: true, cards: cards };
			} else {
				player.chooseCard(2, "he", true, "选择两张牌作为“米”");
			}
			"step 2";
			if (result.bool) {
				player.addToExpansion(result.cards, player, "give").gaintag.add("gzremidao");
			}
		},
		marktext: "米",
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
		subSkill: {
			change: {
				trigger: { global: "judge" },
				filter(event, player) {
					return player.getExpansions("gzremidao").length && event.player.isAlive();
				},
				direct: true,
				content() {
					"step 0";
					var list = player.getExpansions("gzremidao");
					player
						.chooseButton([get.translation(trigger.player) + "的" + (trigger.judgestr || "") + "判定为" + get.translation(trigger.player.judging[0]) + "，" + get.prompt("gzremidao"), list, "hidden"], function (button) {
							var card = button.link;
							var trigger = _status.event.getTrigger();
							var player = _status.event.player;
							var judging = _status.event.judging;
							var result = trigger.judge(card) - trigger.judge(judging);
							var attitude = get.attitude(player, trigger.player);
							if (result == 0) {
								return 0.5;
							}
							return result * attitude;
						})
						.set("judging", trigger.player.judging[0])
						.set("filterButton", function (button) {
							var player = _status.event.player;
							var card = button.link;
							var mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
							if (mod2 != "unchanged") {
								return mod2;
							}
							var mod = game.checkMod(card, player, "unchanged", "cardRespondable", player);
							if (mod != "unchanged") {
								return mod;
							}
							return true;
						});
					"step 1";
					if (result.bool) {
						event.forceDie = true;
						player.respond(result.links, "gzremidao", "highlight", "noOrdering");
						result.cards = result.links;
						var card = result.cards[0];
						event.card = card;
					} else {
						event.finish();
					}
					"step 2";
					if (result.bool) {
						if (trigger.player.judging[0].clone) {
							trigger.player.judging[0].clone.classList.remove("thrownhighlight");
							game.broadcast(function (card) {
								if (card.clone) {
									card.clone.classList.remove("thrownhighlight");
								}
							}, trigger.player.judging[0]);
							game.addVideo("deletenode", player, get.cardsInfo([trigger.player.judging[0].clone]));
						}
						player.$gain2(trigger.player.judging[0]);
						player.gain(trigger.player.judging[0]);
						trigger.player.judging[0] = result.cards[0];
						trigger.orderingCards.addArray(result.cards);
						game.log(trigger.player, "的判定牌改为", card);
						game.delay(2);
					}
				},
				ai: {
					rejudge: true,
					tag: { rejudge: 0.6 },
				},
			},
		},
	}
```

## gz_db_wenyang 名字:文鸯 势力:wei

### gz_quedi 名字:却敌
描述: ①你使用【杀】或【决斗】指定唯一目标时，可以选择一项：1.获得其一张手牌；2.弃置一张基本牌并令此牌造成伤害+1。②你杀死一名角色后，可以交换主副将。
```js
gz_quedi: {
		audio: ["dbquedi1.mp3", "dbquedi2.mp3", "dbchoujue1.mp3", "dbchoujue2.mp3"],
		logAudio: () => "dbquedi",
		trigger: { player: "useCardToPlayer" },
		filter(event, player) {
			const { card, targets, target } = event;
			return (
				["sha", "juedou"].includes(card.name) &&
				targets.length == 1 &&
				(target.countGainableCards(player, "h") > 0 ||
					player.hasCard(card => {
						return _status.connectMode || (get.type(card, null, player) == "basic" && lib.filter.cardDiscardable(card, player, "gz_quedi"));
					}, "h"))
			);
		},
		async cost(event, trigger, player) {
			const { target } = trigger;
			const list = [];
			if (target.countGainableCards(player, "h") > 0) {
				list.push("选项一");
			}
			if (player.hasCard(card => get.type(card, null, player) == "basic" && lib.filter.cardDiscardable(card, player, "dbquedi"), "h")) {
				list.push("选项二");
			}
			list.push("cancel2");
			const { control } = await player
				.chooseControl(list)
				.set("choiceList", [`获得${get.translation(target)}的一张手牌`, `弃置一张基本牌并令${get.translation(trigger.card)}伤害+1`])
				.set("prompt", get.prompt(event.skill, target))
				.set("ai", () => {
					const evt = _status.event.getTrigger(),
						player = evt.player,
						target = evt.target,
						card = evt.card;
					if (get.attitude(player, target) > 0) {
						return "cancel2";
					}
					const bool1 = target.countGainableCards(player, "h") > 0;
					const bool2 =
						player.hasCard(cardx => {
							return get.type(cardx, null, player) == "basic" && lib.filter.cardDiscardable(cardx, player, "dbquedi") && get.value(card, player) < 5;
						}, "h") &&
						!target.hasSkillTag("filterDamage", null, {
							player: player,
							card: card,
						});
					if (bool1) {
						return "选项一";
					}
					if (bool2) {
						return "选项二";
					}
					return "cancel2";
				})
				.forResult();
			event.result = {
				bool: control != "cancel2",
				cost_data: control,
			};
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const { cost_data: control } = event,
				{ target } = trigger;
			if (["选项一", "背水！"].includes(control) && target.countGainableCards(player, "h") > 0) {
				await player.gainPlayerCard(target, true, "h");
			}
			if (["选项二", "背水！"].includes(control) && player.hasCard(card => get.type(card, null, player) == "basic" && lib.filter.cardDiscardable(card, player, "dbquedi"), "h")) {
				const { bool } = await player.chooseToDiscard("h", "弃置一张基本牌", { type: "basic" }, true).forResult();
				if (bool) {
					trigger.getParent().baseDamage++;
				}
			}
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (tag !== "directHit_ai" || !arg || !arg.card || !arg.target || (arg.card.name != "sha" && arg.card.name != "juedou")) {
					return false;
				}
				if (
					arg.target.countCards("h") == 1 &&
					(arg.card.name != "sha" ||
						!arg.target.hasSkillTag("freeShan", false, {
							player: player,
							card: arg.card,
							type: "use",
						}) ||
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
				return false;
			},
		},
		group: "gz_quedi_choujue",
		subSkill: {
			choujue: {
				logAudio: () => "dbchoujue",
				trigger: { source: "dieAfter" },
				prompt2: "交换主副将",
				async content(event, trigger, player) {
					await player.showCharacter(2);
					game.broadcastAll(
						(player, name1, name2) => {
							player.name = name2;
							player.sex = get.character(name2).sex;

							player.smoothAvatar(false);
							player.name1 = name2;
							player.skin.name = name2;
							player.node.avatar.setBackground(name2, "character");
							player.node.name.innerHTML = get.slimName(name2);

							player.smoothAvatar(true);
							player.name2 = name1;
							player.skin.name2 = name1;
							player.node.avatar2.setBackground(name1, "character");
							player.node.name2.innerHTML = get.slimName(name1);
						},
						player,
						player.name1,
						player.name2
					);
					player.update();
					player.getSkills(null, false, false).forEach(skill => {
						const info = get.info(skill);
						if (info?.viceSkill && player.checkViceSkill(skill)) {
							player.restoreSkill(skill);
						}
						if (info?.mainSkill && player.checkMainSkill(skill)) {
							player.restoreSkill(skill);
						}
					});
					game.log(player, "交换了主副将");
				},
			},
		},
	}
```

### gz_zhuifeng 名字:椎锋
描述: `${get.poptip("guozhan_mainSkill")}，出牌阶段限一次，你可以视为使用一张【决斗】。`
```js
gz_zhuifeng: {
		mainSkill: true,
		init(player, skill) {
			player.checkMainSkill(skill);
		},
		audio: "dbzhuifeng",
		enable: "phaseUse",
		usable: 1,
		viewAs: {
			name: "juedou",
			isCard: true,
		},
		selectCard: -1,
		filterCard: () => false,
	}
```

### gz_chongjian 名字:冲坚
描述: `${get.poptip("guozhan_viceSkill")}，你可以将一张装备牌当作无次数限制的【杀】或【酒】使用或打出。`
```js
gz_chongjian: {
		viceSkill: true,
		init(player, skill) {
			player.checkViceSkill(skill);
		},
		audio: "dbchongjian",
		hiddenCard(player, name) {
			if (
				(name == "sha" || name == "jiu") &&
				player.hasCard(function (card) {
					return get.type(card) == "equip";
				}, "hes")
			) {
				return true;
			}
			return false;
		},
		enable: "chooseToUse",
		filter(event, player) {
			return (
				player.hasCard(function (card) {
					return get.type(card) == "equip";
				}, "hes") &&
				(event.filterCard({ name: "sha", storage: { gzchongjian: true } }, player, event) || event.filterCard({ name: "jiu", storage: { gzchongjian: true } }, player, event))
			);
		},
		locked: false,
		mod: {
			cardUsable(card) {
				if (card?.storage?.gzchongjian) {
					return Infinity;
				}
			},
		},
		chooseButton: {
			dialog() {
				let list = [];
				list.push(["基本", "", "sha"]);
				for (var i of lib.inpile_nature) {
					list.push(["基本", "", "sha", i]);
				}
				list.push(["基本", "", "jiu"]);
				return ui.create.dialog("冲坚", [list, "vcard"]);
			},
			filter(button, player) {
				let evt = _status.event.getParent();
				return evt.filterCard({ name: button.link[2], nature: button.link[3], storage: { gzchongjian: true } }, player, evt);
			},
			check(button) {
				if (_status.event.getParent().type != "phase") {
					return 1;
				}
				let player = _status.event.player;
				if (
					button.link[2] == "jiu" &&
					(player.hasCard(function (card) {
						return get.name(card) == "sha";
					}, "hs") ||
						player.countCards("hes", function (card) {
							if (get.type(card) != "equip") {
								return false;
							}
							if (get.position(card) == "e") {
								if (player.hasSkillTag("noe")) {
									return 10 - get.value(card) > 0;
								}
								var sub = get.subtype(card);
								if (
									player.hasCard(function (card) {
										return get.subtype(card) == sub && player.canUse(card, player) && get.effect(player, card, player, player) > 0;
									}, "hs")
								) {
									return 10 - get.value(card) > 0;
								}
							}
							return 5 - get.value(card) > 0;
						}) > 1)
				) {
					return player.getUseValue({ name: "jiu" }) * 4;
				}
				return player.getUseValue({ name: button.link[2], nature: button.link[3], storage: { gzchongjian: true } }, false);
			},
			backup(links, player) {
				return {
					audio: "gz_chongjian",
					viewAs: {
						name: links[0][2],
						nature: links[0][3],
						storage: { gzchongjian: true },
					},
					filterCard: { type: "equip" },
					position: "hes",
					popname: true,
					async precontent(event, trigger, player) {
						event.getParent().addCount = false;
					},
					check(card) {
						var player = _status.event.player;
						if (get.position(card) == "e") {
							if (player.hasSkillTag("noe")) {
								return 10 - get.value(card);
							}
							var sub = get.subtype(card);
							if (
								player.hasCard(function (card) {
									return get.subtype(card) == sub && player.canUse(card, player) && get.effect(player, card, player, player) > 0;
								}, "hs")
							) {
								return 10 - get.value(card);
							}
						}
						return 5 - get.value(card);
					},
				};
			},
			prompt(links) {
				return "将一张装备牌当做" + (links[0][3] ? get.translation(links[0][3]) : "") + "【" + get.translation(links[0][2]) + "】使用";
			},
		},
		ai: {
			respondSha: true,
			skillTagFilter(player, tag, arg) {
				return player.hasCard({ type: "equip" }, "hes");
			},
			order(item, player) {
				if (_status.event.type != "phase") {
					return 1;
				}
				var player = _status.event.player;
				if (
					player.hasCard(function (card) {
						if (get.value(card, player) < 0) {
							return true;
						}
						var sub = get.subtype(card);
						return (
							player.hasCard(function (card) {
								return get.subtype(card) == sub && player.canUse(card, player) && get.effect(player, card, player, player) > 0;
							}, "hs") > 0
						);
					}, "e")
				) {
					return 10;
				}
				if (
					player.countCards("hs", "sha") ||
					player.countCards("he", function (card) {
						return get.type(card) == "equip" && get.value(card, player) < 5;
					}) > 1
				) {
					return get.order({ name: "jiu" }) - 0.1;
				}
				return get.order({ name: "sha" }) - 0.1;
			},
			result: { player: 1 },
		},
		subSkill: {
			backup: {},
		},
	}
```

## gz_dongzhao 名字:gz_dongzhao 势力:wei

### quanjin 名字:劝进
描述: 出牌阶段限一次，你可将一张手牌交给一名本回合内受到过伤害其他角色，然后令其执行一项“军令”。若其执行，则你摸一张牌。若其不执行，则你将手牌摸至与全场最多相等（至多摸五张）。
```js
quanjin: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		onChooseToUse(event) {
			if (!game.online) {
				event.set(
					"quanjin_list",
					game.filterPlayer(i => i != event.player && i.getHistory("damage").length)
				);
			}
		},
		filter(event, player) {
			return event.quanjin_list && event.quanjin_list.length > 0 && player.countCards("h") > 0;
		},
		filterCard: true,
		filterTarget(card, player, target) {
			return _status.event.quanjin_list.includes(target);
		},
		discard: false,
		lose: false,
		delay: false,
		check(card) {
			var evt = _status.event;
			if (
				evt.quanjin_list.filter(function (target) {
					return get.attitude(evt.player, target) > 0;
				}).length
			) {
				return 8 - get.value(card);
			}
			return 6.5 - get.value(card);
		},
		content() {
			"step 0";
			player.give(cards, target);
			"step 1";
			player.chooseJunlingFor(target);
			"step 2";
			event.junling = result.junling;
			event.targets = result.targets;
			var str = get.translation(player);
			target
				.chooseJunlingControl(player, result.junling, result.targets)
				.set("prompt", "劝进")
				.set("choiceList", ["执行该军令，然后" + str + "摸一张牌", "不执行该军令，然后其将手牌摸至与全场最多相同"])
				.set("ai", function () {
					var evt = _status.event.getParent(2),
						player = evt.target,
						source = evt.player,
						junling = evt.junling,
						targets = evt.targets;
					var num = 0;
					game.countPlayer(function (current) {
						var num2 = current.countCards("h");
						if (num2 > num) {
							num = num2;
						}
					});
					num = Math.max(0, num - source.countCards("h"));
					if (num > 1) {
						if (get.attitude(player, target) > 0) {
							return get.junlingEffect(source, junling, player, targets, player) > num;
						}
						return get.junlingEffect(source, junling, player, targets, player) > -num;
					}
					if (get.attitude(player, target) > 0) {
						return get.junlingEffect(source, junling, player, targets, player) > 0;
					}
					return get.junlingEffect(source, junling, player, targets, player) > 1;
				});
			"step 3";
			if (result.index == 0) {
				target.carryOutJunling(player, event.junling, targets);
				player.draw();
			} else {
				var num = 0;
				game.countPlayer(function (current) {
					var num2 = current.countCards("h");
					if (num2 > num) {
						num = num2;
					}
				});
				num -= player.countCards("h");
				if (num > 0) {
					player.draw(Math.min(num, 5));
				}
			}
		},
		ai: {
			order: 1,
			result: {
				player(player, target) {
					if (get.attitude(player, target) > 0) {
						return 3.3;
					}
					var num = 0;
					game.countPlayer(function (current) {
						var num2 = current.countCards("h");
						if (player == current) {
							num2--;
						}
						if (target == current) {
							num2++;
						}
						if (num2 > num) {
							num = num2;
						}
					});
					num = Math.max(0, num - player.countCards("h"));
					if (!num) {
						return 0;
					}
					if (num > 1) {
						return 2;
					}
					if (ui.selected.cards.length && get.value(ui.selected.cards[0]) > 5) {
						return 0;
					}
					return 1;
				},
			},
		},
	}
```

### zaoyun 名字:凿运
描述: 出牌阶段限一次，你可以弃置X张手牌并选择一名距离为X+1的敌方角色。你对其造成1点伤害且至其的距离视为1至回合结束。
```js
zaoyun: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			var num = player.countCards("h");
			return game.hasPlayer(function (current) {
				if (current.isEnemyOf(player)) {
					var dist = get.distance(player, current);
					return dist > 1 && dist <= num;
				}
			});
		},
		selectCard() {
			var list = [],
				player = _status.event.player;
			if (ui.selected.targets.length) {
				return get.distance(player, ui.selected.targets[0]) - 1;
			}
			game.countPlayer(function (current) {
				if (current.isEnemyOf(player)) {
					var dist = get.distance(player, current);
					if (dist > 1) {
						list.push(dist - 1);
					}
				}
			});
			list.sort();
			return [list[0], list[list.length - 1]];
		},
		filterCard: true,
		filterTarget(card, player, target) {
			return target.isEnemyOf(player) && get.distance(player, target) == ui.selected.cards.length + 1;
		},
		check(card) {
			var player = _status.event.player;
			if (
				ui.selected.cards.length &&
				game.hasPlayer(function (current) {
					return current.isEnemyOf(player) && get.distance(player, current) == ui.selected.cards.length + 1 && get.damageEffect(current, player, player) > 0;
				})
			) {
				return 0;
			}
			return 7 - ui.selected.cards.length * 2 - get.value(card);
		},
		content() {
			target.damage("nocard");
			if (!player.storage.zaoyun2) {
				player.storage.zaoyun2 = [];
			}
			player.storage.zaoyun2.push(target);
			player.addTempSkill("zaoyun2");
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					return get.damageEffect(target, player, target);
				},
			},
		},
	}
```

## gz_re_xushu 名字:gz_re_xushu 势力:shu

### gzzhuhai 名字:诛害
描述: 其他角色的结束阶段，若其本回合内造成过伤害，则你可以对其使用一张【杀】（无距离限制）。若其本回合内对与你势力相同的角色造成过伤害，则此【杀】无视防具，且当其抵消此【杀】后，其须弃置一张牌。
```js
gzzhuhai: {
		audio: "zhuhai",
		audioname: ["gz_re_xushu"],
		trigger: { global: "phaseJieshuBegin" },
		direct: true,
		preHidden: true,
		filter(event, player) {
			return event.player.isAlive() && event.player.getStat("damage") && lib.filter.targetEnabled({ name: "sha" }, player, event.player) && (player.hasSha() || (_status.connectMode && player.countCards("h") > 0));
		},
		content() {
			var next = player
				.chooseToUse(
					function (card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					},
					"诛害：是否对" + get.translation(trigger.player) + "使用一张杀？"
				)
				.set("logSkill", "gzzhuhai")
				.set("complexSelect", true)
				.set("filterTarget", function (card, player, target) {
					if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
						return false;
					}
					return lib.filter.targetEnabled.apply(this, arguments);
				})
				.set("sourcex", trigger.player)
				.setHiddenSkill(event.name);
			player.addTempSkill("gzzhuhai2");
			next.oncard = function (card, player) {
				try {
					if (
						trigger.player.getHistory("sourceDamage", function (evt) {
							return evt.player.isFriendOf(player);
						}).length
					) {
						player.addTempSkill("gzzhuhai2");
						card.gzzhuhai_tag = true;
					}
				} catch (e) {
					alert("发生了一个导致【诛害】无法正常触发无视防具效果的错误。请关闭十周年UI/手杀UI等扩展以解决");
				}
			};
		},
		ai: {
			unequip_ai: true,
			skillTagFilter(player, tag, arg) {
				var evt = _status.event.getParent();
				if (evt.name != "gzzhuhai" || !arg || !arg.target) {
					return false;
				}
				if (
					!arg.target.getHistory("sourceDamage", function (evt) {
						return evt.player.isFriendOf(player);
					}).length
				) {
					return false;
				}
				return true;
			},
		},
	}
```

### gzpozhen 名字:破阵
描述: `限定技，其他角色的回合开始时，你可以令其本回合不可使用、打出或重铸手牌；若其处于${get.poptip("guozhan_duilie")}或${get.poptip("guozhan_weigong")}关系中，你可依次弃置此队列或参与围攻关系的其他角色的一张牌。`
```js
gzpozhen: {
		audio: 2,
		trigger: { global: "phaseBegin" },
		limited: true,
		preHidden: true,
		filter(event, player) {
			return player != event.player;
		},
		logTarget: "player",
		skillAnimation: true,
		animationColor: "orange",
		check(event, player) {
			var target = event.player;
			if (get.attitude(player, target) >= -3) {
				return false;
			}
			if (
				event.player.hasJudge("lebu") &&
				!game.hasPlayer(function (current) {
					return get.attitude(current, target) > 0 && current.hasWuxie();
				})
			) {
				return false;
			}
			var num =
				Math.min(
					target.getCardUsable("sha"),
					target.countCards("h", function (card) {
						return get.name(card, target) == "sha" && target.hasValueTarget(card);
					})
				) +
				target.countCards("h", function (card) {
					return get.name(card, target) != "sha" && target.hasValueTarget(card);
				});
			return num >= Math.max(2, target.hp);
		},
		content() {
			"step 0";
			player.awakenSkill("gzpozhen");
			var target = trigger.player;
			target.addTempSkill("gzpozhen2");
			var list = game.filterPlayer(function (current) {
				return current != target && (current.inline(target) || (current == target.getNext().getNext() && current.siege(target.getNext())) || (current == target.getPrevious().getPrevious() && current.siege(target.getPrevious())));
			});
			if (list.length) {
				list.add(target);
				list.sortBySeat(target);
				event.targets = list;
			} else {
				event.finish();
			}
			"step 1";
			var target = targets.shift();
			if (target.countDiscardableCards(player, "he") > 0) {
				player.discardPlayerCard(target, "he", true).boolline = true;
			}
			if (targets.length) {
				event.redo();
			}
		},
	}
```

### gzjiancai 名字:荐才
描述: `${get.poptip("guozhan_viceSkill")}，此武将牌上单独的阴阳鱼个数-1。与你势力相同的角色即将受到伤害而进入濒死状态时，你可以防止此伤害，若如此做，你须变更副将；与你势力相同的角色变更副将时，其额外获得两张备选武将牌。`
```js
gzjiancai: {
		audio: 2,
		viceSkill: true,
		trigger: { global: "damageBegin4" },
		preHidden: true,
		init(player, skill) {
			if (player.checkViceSkill(skill) && !player.viceChanged) {
				player.removeMaxHp();
			}
		},
		filter(event, player) {
			return event.player.isFriendOf(player) && event.num >= event.player.hp;
		},
		check(event, player) {
			if (get.attitude(player, event.player) < 3) {
				return false;
			}
			if (event.num >= 1 || player.storage.gzpozhen) {
				return true;
			}
			if (
				player.countCards("h", function (card) {
					var mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
					if (mod2 != "unchanged") {
						return mod2;
					}
					var mod = game.checkMod(card, player, event.player, "unchanged", "cardSavable", player);
					if (mod != "unchanged") {
						return mod;
					}
					var savable = get.info(card).savable;
					if (typeof savable == "function") {
						savable = savable(card, player, event.player);
					}
					return savable;
				}) >=
				1 + event.num - event.player.hp
			) {
				return false;
			}
			return true;
		},
		logTarget: "player",
		skillAnimation: true,
		animationColor: "orange",
		content() {
			trigger.cancel();
			player.changeVice();
		},
		group: "gzjiancai_add",
		subSkill: {
			add: {
				trigger: { global: "changeViceBegin" },
				logTarget: "player",
				forced: true,
				locked: false,
				prompt(event, player) {
					return get.translation(event.player) + "即将变更副将，是否发动【荐才】，令其此次变更副将时增加两张可选武将牌？";
				},
				filter(event, player) {
					return event.player.isFriendOf(player);
				},
				content() {
					trigger.num += 2;
				},
			},
		},
	}
```

## gz_wujing 名字:gz_wujing 势力:wu

### donggui 名字:调归
描述: `出牌阶段限一次，你可以暗置武将牌均明置的一名其他角色一张武将牌，视为对其使用【调虎离山】，且其本回合不能明置此武将牌。若因此形成${get.poptip("guozhan_duilie")}，你摸X张牌（X为该队列中的角色数）。`
```js
donggui: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return lib.skill.donggui.filterTarget(null, player, current);
			});
		},
		filterTarget(card, player, target) {
			return target != player && !target.isUnseen(2) && player.canUse("diaohulishan", target);
		},
		content() {
			"step 0";
			player.chooseButton(["暗置" + get.translation(target) + "的一张武将牌", [[target.name1, target.name2], "character"]], true).set("filterButton", function (button) {
				return !get.is.jun(button.link);
			});
			"step 1";
			var target1 = target.getNext();
			var target2 = target.getPrevious();
			if (target1 == target2 || target.inline(target1) || target.inline(target2) || target1.inline(target2)) {
				event.finish();
			} else {
				event.target1 = target1;
				event.target2 = target2;
			}
			target.hideCharacter(result.links[0] == target.name1 ? 0 : 1);
			target.addTempSkill("donggui2");
			player.useCard({ name: "diaohulishan", isCard: true }, target);
			"step 2";
			if (event.target1.inline(event.target2)) {
				player.draw(
					game.countPlayer(function (current) {
						return current.inline(event.target1);
					})
				);
			}
		},
		ai: {
			order: 2,
			result: {
				player(player, target) {
					var target1 = target.getNext();
					var target2 = target.getPrevious();
					if (target1 == target2 || target.inline(target1) || target.inline(target2) || target1.inline(target2) || !target1.isFriendOf(target2)) {
						return 0;
					}
					var num = game.countPlayer(function (current) {
						return current != target1 && current != target2 && (current.inline(target1) || current.inline(target2));
					});
					return 2 + num;
				},
			},
		},
	}
```

### fengyang 名字:风扬
描述: `${get.poptip("guozhan_zhenfa")}，结束阶段，你所在${get.poptip("guozhan_duilie")}的角色可以依次弃置一张装备区里的牌，然后摸两张牌。`
```js
fengyang: {
		audio: 2,
		zhenfa: "inline",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			var bool = player.hasSkill("fengyang");
			return (
				game.hasPlayer(function (current) {
					return current != player && current.inline(player);
				}) &&
				game.hasPlayer(function (current) {
					return (current == player || bool) && current.inline(player) && current.countCards("e") > 0;
				})
			);
		},
		direct: true,
		preHidden: true,
		content() {
			"step 0";
			event.list = game
				.filterPlayer(function (current) {
					return current.inline(player);
				})
				.sortBySeat();
			"step 1";
			var target = event.list.shift();
			if ((target == player || player.hasSkill("fengyang")) && target.countCards("e")) {
				event.target = target;
				var next = target.chooseToDiscard("e", get.prompt("fengyang"), "弃置装备区内的一张牌并摸两张牌").set("ai", function (card) {
					return 5.5 - get.value(card);
				});
				next.logSkill = "fengyang";
				if (player == target) {
					next.setHiddenSkill("fengyang");
				}
			} else {
				event.goto(3);
			}
			"step 2";
			if (result.bool) {
				target.draw(2);
			}
			"step 3";
			if (event.list.length) {
				event.goto(1);
			}
		},
	}
```

## gz_yanbaihu 名字:gz_yanbaihu 势力:qun

### gzzhidao 名字:雉盗
描述: 锁定技，出牌阶段开始时，你选择一名其他角色，然后直到此回合结束，你与其的距离视为1且你不能使用牌指定除你与其外的角色为目标；当你于出牌阶段内首次对其造成伤害后，你获得其区域内的一张牌。
```js
gzzhidao: {
		audio: 2,
		trigger: { player: "phaseUseBegin" },
		forced: true,
		preHidden: true,
		content() {
			"step 0";
			player.chooseTarget("请选择【雉盗】的目标", "本回合内只能对自己和该角色使用牌，且第一次对其造成伤害时摸一张牌", lib.filter.notMe, true).set("ai", function (target) {
				var player = _status.event.player;
				return (1 - get.sgn(get.attitude(player, target))) * Math.max(1, get.distance(player, target));
			});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.line(target, "green");
				game.log(player, "选择了", target);
				player.storage.gzzhidao2 = target;
				player.addTempSkill("gzzhidao2");
			}
		},
	}
```

### gzyjili 名字:寄篱
描述: 锁定技。当你成为红色基本牌或红色普通锦囊牌的唯一目标后，你令此牌的使用者于此牌结算完成后视为对你使用一张牌名和属性相同的牌。当你于一个阶段内第二次受到伤害时，你防止此伤害并移除此武将牌。
```js
gzyjili: {
		audio: 2,
		forced: true,
		preHidden: ["gzyjili_remove"],
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			if (get.color(event.card) != "red" || event.targets.length != 1) {
				return false;
			}
			var type = get.type(event.card);
			return type == "basic" || type == "trick";
		},
		check() {
			return false;
		},
		content() {
			player.addTempSkill("gzyjili2");
			var evt = trigger.getParent();
			if (!evt.gzyjili) {
				evt.gzyjili = [];
			}
			evt.gzyjili.add(player);
		},
		group: "gzyjili_remove",
		subSkill: {
			remove: {
				audio: "gzyjili",
				trigger: { player: "damageBegin2" },
				forced: true,
				filter(event, player) {
					var evt = false;
					for (var i of lib.phaseName) {
						evt = event.getParent(i);
						if (evt && evt.player) {
							break;
						}
					}
					return (
						evt &&
						evt.player &&
						player.getHistory("damage", function (evtx) {
							return evtx.getParent(evt.name) == evt;
						}).length == 1
					);
				},
				content() {
					trigger.cancel();
					player.removeCharacter(get.character(player.name1, 3).includes("gzyjili") ? 0 : 1);
				},
			},
		},
	}
```

## gz_xuyou 名字:gz_xuyou 势力:wei

### gzchenglve 名字:成略
描述: 己方角色使用牌结算结束后，若此牌的目标数大于1，则你可以令其摸一张牌。若你受到过渠道为此牌的伤害，则你可以令一名武将牌均明置过且没有“阴阳鱼”标记的己方角色获得一枚“阴阳鱼”。
```js
gzchenglve: {
		audio: 2,
		trigger: { global: "useCardAfter" },
		filter(event, player) {
			return event.targets.length > 1 && event.player.isIn() && event.player.isFriendOf(player);
		},
		logTarget: "player",
		check(event, player) {
			return get.attitude(player, event.player) > 0;
		},
		preHidden: true,
		content() {
			"step 0";
			trigger.player.draw();
			if (
				player.hasHistory("damage", function (evt) {
					return evt.card == trigger.card;
				}) &&
				game.hasPlayer(function (current) {
					if (current.hasMark("yinyang_mark") || !current.isFriendOf(player)) {
						return false;
					}
					let names = get.nameList(current).filter(i => i.indexOf("gz_shibing") !== 0);
					game.getAllGlobalHistory("everything", evt => {
						if (evt.name !== "showCharacter" || evt.player !== current) {
							return false;
						}
						names.removeArray(evt.toShow);
					});
					return names.length === 0;
				})
			) {
				player
					.chooseTarget("是否令一名武将牌均明置过的己方角色获得“阴阳鱼”标记？", function (card, player, current) {
						if (current.hasMark("yinyang_mark") || !current.isFriendOf(player)) {
							return false;
						}
						let names = get.nameList(current).filter(i => i.indexOf("gz_shibing") !== 0);
						game.getAllGlobalHistory("everything", evt => {
							if (evt.name !== "showCharacter" || evt.player !== current) {
								return false;
							}
							names.removeArray(evt.toShow);
						});
						return names.length === 0;
					})
					.set("ai", function (target) {
						return get.attitude(_status.event.player, target) * Math.sqrt(1 + target.needsToDiscard());
					});
			} else {
				event.finish();
			}
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.line(target, "green");
				target.addMark("yinyang_mark", 1, false);
				game.delayx();
			}
		},
	}
```

### gzshicai 名字:恃才
描述: 锁定技，当你受到的伤害后，若伤害值：为1，你摸一张牌；大于1，你弃置两张牌。
```js
gzshicai: {
		audio: 2,
		trigger: { player: "damageEnd" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return event.num == 1 || player.countCards("he") > 0;
		},
		check(event, player) {
			return event.num == 1;
		},
		content() {
			if (trigger.num == 1) {
				player.draw();
			} else {
				player.chooseToDiscard(true, "he", 2);
			}
		},
	}
```

## gz_xiahouba 名字:gz_xiahouba 势力:shu

### gzbaolie 名字:豹烈
描述: 锁定技，出牌阶段开始时，你令所有攻击范围内包含你的非己方角色依次选择：①对你使用一张【杀】；②令你弃置其一张牌。锁定技，你对体力值不小于你的角色使用【杀】没有距离和次数限制。
```js
gzbaolie: {
		audio: 2,
		mod: {
			targetInRange(card, player, target) {
				if (card.name == "sha" && target.hp >= player.hp) {
					return true;
				}
			},
			cardUsableTarget(card, player, target) {
				if (card.name == "sha" && target.hp >= player.hp) {
					return true;
				}
			},
		},
		trigger: { player: "phaseUseBegin" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current.isEnemyOf(player) && player.inRangeOf(current);
			});
		},
		logTarget(event, player) {
			return game.filterPlayer(function (current) {
				return current.isEnemyOf(player) && player.inRangeOf(current);
			});
		},
		check: () => false,
		content() {
			"step 0";
			event.targets = game
				.filterPlayer(function (current) {
					return current.isEnemyOf(player) && player.inRangeOf(current);
				})
				.sortBySeat();
			"step 1";
			var target = event.targets.shift();
			if (target.isIn()) {
				event.target = target;
				target
					.chooseToUse(
						function (card, player, event) {
							if (get.name(card) != "sha") {
								return false;
							}
							return lib.filter.filterCard.apply(this, arguments);
						},
						"豹烈：对" + get.translation(player) + "使用一张杀，或令其弃置你的一张牌"
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
					.set("sourcex", player);
			} else if (targets.length) {
				event.redo();
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool == false && target.countCards("he") > 0) {
				player.discardPlayerCard(target, "he", true);
			}
			if (targets.length) {
				event.goto(1);
			}
		},
	}
```

## gz_panjun 名字:gz_panjun 势力:wu

### gzcongcha 名字:聪察
描述: ①准备阶段，你可以选择一名未确定势力的其他角色。当其于你的下回合开始前首次明置武将牌后，若其：与你势力相同，则你与其各摸两张牌；与你势力不同，则其失去1点体力。②摸牌阶段开始时，若场上所有角色均有明置的武将牌，则你可以令额定摸牌数+2。
```js
gzcongcha: {
		audio: 2,
		trigger: { player: "phaseZhunbeiBegin" },
		direct: true,
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return current != player && current.isUnseen();
			});
		},
		preHidden: "gzcongcha_draw",
		prompt2: "选择一名武将牌均暗置的其他角色",
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt2("gzcongcha"), function (card, player, target) {
					return target != player && target.isUnseen();
				})
				.set("ai", function (target) {
					if (get.attitude(_status.event.player, target) > 0) {
						return Math.random() + Math.sqrt(target.hp);
					}
					return Math.random() + Math.sqrt(Math.max(1, 4 - target.hp));
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("gzcongcha", target);
				player.storage.gzcongcha2 = target;
				player.addTempSkill("gzcongcha2", { player: "phaseBegin" });
				target.addSkill("gzcongcha_ai");
				game.delayx();
			}
		},
		subfrequent: ["draw"],
		group: "gzcongcha_draw",
		subSkill: {
			draw: {
				audio: "gzcongcha",
				trigger: { player: "phaseDrawBegin2" },
				frequent: true,
				filter(event, player) {
					return (
						!event.numFixed &&
						!game.hasPlayer(function (current) {
							return current.isUnseen();
						})
					);
				},
				prompt: "是否发动【聪察】多摸两张牌？",
				content() {
					trigger.num += 2;
				},
			},
		},
	}
```

### xinfu_gongqing
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_huangzu 名字:gz_huangzu 势力:qun

### gzxishe 名字:袭射
描述: 其他角色的准备阶段，你可将装备区内的一张牌当做【杀】对其使用且可重复此流程。若你的体力值大于该角色，则此【杀】不可被响应。若该角色于此技能的结算流程中死亡，则你可以变更副将（不展示）。
```js
gzxishe: {
		audio: 2,
		trigger: { global: "phaseZhunbeiBegin" },
		direct: true,
		preHidden: true,
		filter(event, player) {
			return event.player != player && event.player.isIn() && player.countCards("e") > 0 && player.canUse("sha", event.player, false);
		},
		content() {
			"step 0";
			player
				.chooseCard("e", get.prompt("gzxishe", trigger.player), "将装备区内的一张牌当做" + (player.hp > trigger.player.hp ? "不可响应的" : "") + "【杀】对其使用", function (card, player) {
					return player.canUse(
						{
							name: "sha",
							cards: [card],
						},
						_status.event.target,
						false
					);
				})
				.set("target", trigger.player)
				.set("ai", function (card) {
					var evt = _status.event,
						eff = get.effect(
							evt.target,
							{
								name: "sha",
								cards: [card],
							},
							evt.player,
							evt.player
						);
					if (eff <= 0) {
						return 0;
					}
					var val = get.value(card);
					if (get.attitude(evt.player, evt.target) < -2 && evt.target.hp <= Math.min(2, evt.player.countCards("e"), evt.player.hp - 1)) {
						return 2 / Math.max(1, val);
					}
					return eff - val;
				})
				.setHiddenSkill(event.name);
			"step 1";
			if (result.bool) {
				var next = player.useCard({ name: "sha" }, result.cards, "gzxishe", trigger.player, false);
				if (player.hp > trigger.player.hp) {
					next.oncard = function () {
						_status.event.directHit.add(trigger.player);
					};
				}
			} else {
				event.finish();
			}
			"step 2";
			if (trigger.player.isDead()) {
				player.mayChangeVice(null, "hidden");
			} else if (lib.skill.gzxishe.filter(trigger, player)) {
				event.goto(0);
			}
		},
		ai: {
			directHit_ai: true,
			skillTagFilter(player, tag, arg) {
				if (_status.event.getParent().name == "gzxishe" && arg.card && arg.card.name == "sha" && arg.target && arg.target == _status.event.target && player.hp > arg.target.hp) {
					return true;
				}
				return false;
			},
		},
	}
```

## gz_zhugeke 名字:gz_zhugeke 势力:wu

### aocai
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gzduwu 名字:黩武
描述: 限定技，出牌阶段，你可以选择一个“军令”。你令攻击范围内所有的非己方角色选择是否执行。若有角色选择否，则你对其造成1点伤害且你摸一张牌。若有角色于此技能结算过程中进入濒死状态且存活，则你失去1点体力。
```js
gzduwu: {
		limited: true,
		audio: 2,
		enable: "phaseUse",
		delay: false,
		filter(event, player) {
			var isEnemy;
			if (player.identity == "unknown") {
				if (!player.wontYe("wu")) {
					isEnemy = function (current) {
						return current != player;
					};
				} else {
					isEnemy = function (current) {
						return current != player && current.identity != "wu";
					};
				}
			} else {
				isEnemy = function (target) {
					return target.isEnemyOf(player);
				};
			}
			return game.hasPlayer(function (current) {
				return isEnemy(current) && player.inRange(current);
			});
		},
		filterTarget(card, player, target) {
			if (player == target || !player.inRange(target)) {
				return false;
			}
			if (player.identity == "unknown") {
				if (!player.wontYe("wu")) {
					return true;
				}
				return target.identity != "wu";
			}
			return target.isEnemyOf(player);
		},
		selectTarget: -1,
		filterCard: () => false,
		selectCard: [0, 1],
		multitarget: true,
		multiline: true,
		content() {
			"step 0";
			player.awakenSkill("gzduwu");
			player.addSkill("gzduwu_count");
			targets.sortBySeat();
			event.players = targets.slice(0);
			game.delayx();
			player.chooseJunlingFor(event.players[0]).set("prompt", "为所有目标角色选择军令牌");
			"step 1";
			event.junling = result.junling;
			event.targets = result.targets;
			event.num = 0;
			"step 2";
			if (num < event.players.length) {
				event.current = event.players[num];
			}
			if (event.current && event.current.isAlive()) {
				event.current
					.chooseJunlingControl(player, event.junling, targets)
					.set("prompt", "黩武")
					.set("choiceList", ["执行该军令", "不执行该军令并受到1点伤害"])
					.set("ai", function () {
						var evt = _status.event.getParent(2);
						var junlingEff = get.junlingEffect(evt.player, evt.junling, evt.current, evt.targets, evt.current);
						var damageEff = get.damageEffect(evt.current, evt.player, evt.current);
						var attitudeSelf = get.attitude(evt.current, evt.current);
						var drawEff = get.effect(evt.player, { name: "draw" }, evt.player, evt.current);

						return junlingEff > damageEff / attitudeSelf + drawEff ? 0 : 1;
					});
			} else {
				event.goto(4);
			}
			"step 3";
			if (result.index == 0) {
				event.current.carryOutJunling(player, event.junling, targets);
			} else {
				player.draw();
				event.current.damage();
			}
			"step 4";
			game.delayx();
			event.num++;
			if (event.num < event.players.length) {
				event.goto(2);
			}
			"step 5";
			var list = player.getStorage("gzduwu_count").filter(function (target) {
				return target.isAlive();
			});
			if (list.length) {
				player.loseHp();
			}
			player.removeSkill("gzduwu_count");
		},
		animationColor: "wood",
		ai: {
			order: 2,
			result: {
				player(player) {
					if (
						game.countPlayer(function (current) {
							return !current.isFriendOf(player) && !player.inRange(current);
						}) <= Math.min(2, Math.max(0, game.roundNumber - 1))
					) {
						return 1;
					}
					if (player.hp == 1) {
						return 1;
					}
					return 0;
				},
			},
		},
		subSkill: {
			count: {
				sub: true,
				trigger: { global: "dyingBegin" },
				silent: true,
				charlotte: true,
				filter(event, player) {
					return event.getParent("gzduwu").player == player;
				},
				content() {
					player.markAuto("gzduwu_count", [trigger.player]);
				},
			},
		},
	}
```

## gz_wenqin 名字:gz_wenqin 势力:wei

### gzjinfa 名字:矜伐
描述: 出牌阶段限一次，你可弃置一张牌并令一名其他角色选择一项：①交给你一张装备牌，若你以此法得到了♠牌，则其视为对你使用一张【杀】。②你获得其一张牌。
```js
gzjinfa: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return (
				player.countCards("he") > 0 &&
				game.hasPlayer(function (current) {
					return current != player && current.countCards("he") > 0;
				})
			);
		},
		filterCard: true,
		position: "he",
		filterTarget(card, player, target) {
			return target != player && target.countCards("he") > 0;
		},
		check(card) {
			return 6 - get.value(card);
		},
		content() {
			"step 0";
			target
				.chooseCard("he", "交给" + get.translation(player) + "一张装备牌，或令其获得你的一张牌", { type: "equip" })
				.set("ai", function (card) {
					if (_status.event.goon && get.suit(card) == "spade") {
						return 8 - get.value(card);
					}
					return 5 - get.value(card);
				})
				.set("goon", target.canUse("sha", player, false) && get.effect(player, { name: "sha" }, target, target) > 0);
			"step 1";
			if (!result.bool) {
				player.gainPlayerCard(target, "he", true);
				event.finish();
			} else {
				target.give(result.cards, player);
			}
			"step 2";
			if (result.bool && result.cards && result.cards.length && target.isIn() && player.isIn() && get.suit(result.cards[0], target) == "spade" && target.canUse("sha", player, false)) {
				target.useCard({ name: "sha", isCard: true }, false, player);
			}
		},
		ai: {
			order: 6,
			result: {
				player(player, target) {
					if (
						target.countCards("e", function (card) {
							return get.suit(card) == "spade" && get.value(card) < 8;
						}) &&
						target.canUse("sha", player, false)
					) {
						return get.effect(player, { name: "sha" }, target, player);
					}
					return 0;
				},
				target(player, target) {
					var es = target.getCards("e").sort(function (a, b) {
						return get.value(b, target) - get.value(a, target);
					});
					if (es.length) {
						return -Math.min(2, get.value(es[0]));
					}
					return -2;
				},
			},
		},
	}
```

## gz_xf_sufei 名字:gz_xf_sufei 势力:wu

### gzlianpian 名字:联翩
描述: ①结束阶段，若你于此回合内弃置过所有角色的牌数之和大于你的体力值，你可令一名与你势力相同的角色将手牌补至X张（X为其体力上限）。②其他角色的结束阶段，若其于此回合内弃置过所有角色的牌数之和大于你的体力值，其可选择：1.弃置你的一张牌；2.令你回复1点体力。
```js
gzlianpian: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		direct: true,
		preHidden: true,
		filter(event, player) {
			if (player != event.player && !player.hasSkill("gzlianpian")) {
				return false;
			}
			var num = 0;
			game.getGlobalHistory("cardMove", function (evt) {
				if (evt.name == "lose" && evt.type == "discard" && evt.getParent(2).player == event.player) {
					num += evt.cards2.length;
				}
			});
			if (num <= player.hp) {
				return false;
			}
			if (player == event.player) {
				return game.hasPlayer(function (current) {
					return current.isFriendOf(player) && current.countCards("h") < current.maxHp;
				});
			}
			return player.countDiscardableCards(event.player, "he") > 0 || player.isDamaged();
		},
		content() {
			"step 0";
			if (player == trigger.player) {
				player
					.chooseTarget(get.prompt("gzlianpian"), "令一名己方角色将手牌摸至手牌上限", function (card, player, target) {
						return target.isFriendOf(player) && target.maxHp > target.countCards("h");
					})
					.set("ai", function (target) {
						var att = get.attitude(_status.event.player, target);
						if (target.hasSkillTag("nogain")) {
							att /= 6;
						}
						if (att > 2) {
							return Math.min(5, target.maxHp) - target.countCards("h");
						}
						return att / 3;
					})
					.setHiddenSkill(event.name);
			} else {
				event.goto(2);
				event.addIndex = 0;
				var list = [],
					target = trigger.player,
					str = get.translation(player);
				event.target = target;
				if (player.countDiscardableCards(target, "he") > 0) {
					list.push("弃置" + str + "的一张牌");
				} else {
					event.addIndex++;
				}
				if (player.isDamaged()) {
					list.push("令" + str + "回复1点体力");
				}
				target
					.chooseControl("cancel2")
					.set("choiceList", list)
					.set("ai", function () {
						var evt = _status.event.getParent();
						if (get.attitude(evt.target, evt.player) > 0) {
							return 1 - evt.addIndex;
						}
						return evt.addIndex;
					})
					.set("prompt", "是否对" + str + "发动【连翩】？");
			}
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("gzlianpian", target);
				target.draw(Math.min(5, target.maxHp - target.countCards("h")));
			}
			event.finish();
			"step 2";
			if (result.control == "cancel2") {
				event.finish();
				return;
			}
			player.logSkill("gzlianpian", target, false);
			target.line(player, "green");
			if (result.index + event.addIndex == 0) {
				target.discardPlayerCard("he", player, true);
				event.finish();
			} else {
				player.recover();
			}
			"step 3";
			game.delayx();
		},
	}
```

## gz_liuba 名字:gz_liuba 势力:shu

### gztongduo 名字:统度
描述: 己方角色的结束阶段，其可以摸X张牌（X为其本回合弃牌阶段弃置的牌数且至多为3）。
```js
gztongduo: {
		audio: 2,
		trigger: { global: "phaseJieshuBegin" },
		direct: true,
		preHidden: true,
		filter(event, player) {
			if ((player != event.player && !player.hasSkill("gztongduo")) || !event.player.isFriendOf(player)) {
				return false;
			}
			return (
				event.player.getHistory("lose", function (evt) {
					return evt.type == "discard" && evt.cards2.length > 0 && evt.getParent("phaseDiscard").player == event.player;
				}).length > 0
			);
		},
		content() {
			"step 0";
			var num = 0;
			trigger.player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard").player == trigger.player) {
					num += evt.cards2.length;
				}
			});
			num = Math.min(3, num);
			event.num = num;
			var next = trigger.player.chooseBool("是否发动【统度】摸" + get.cnNumber(num) + "张牌？");
			if (player == trigger.player) {
				next.setHiddenSkill("gztongduo");
			}
			"step 1";
			if (result.bool) {
				player.logSkill("gztongduo", trigger.player);
				trigger.player.draw(num);
			}
		},
	}
```

### qingyin 名字:清隐
描述: 限定技，出牌阶段，你可令所有己方角色回复所有体力，然后移除此武将牌。
```js
qingyin: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		delay: false,
		filter(event, player) {
			var isFriend;
			if (player.identity == "unknown") {
				var group = "shu";
				if (!player.wontYe("shu")) {
					group = null;
				}
				isFriend = function (current) {
					return current == player || current.identity == group;
				};
			} else {
				isFriend = function (target) {
					return target.isFriendOf(player);
				};
			}
			return game.hasPlayer(function (current) {
				return isFriend(current) && current.isDamaged();
			});
		},
		selectTarget: -1,
		filterTarget(card, player, target) {
			if (player == target) {
				return true;
			}
			if (player.identity == "unknown") {
				var group = "shu";
				if (!player.wontYe("shu")) {
					return false;
				}
				return target.identity == group;
			}
			return target.isFriendOf(player);
		},
		selectCard: [0, 1],
		filterCard: () => false,
		multitarget: true,
		multiline: true,
		skillAnimation: true,
		animationColor: "orange",
		content() {
			"step 0";
			player.awakenSkill("qingyin");
			event.num = 0;
			"step 1";
			if (targets[num].isDamaged()) {
				targets[num].recover(targets[num].maxHp - targets[num].hp);
			}
			event.num++;
			if (event.num < targets.length) {
				event.redo();
			}
			"step 2";
			if (lib.character[player.name1][3].includes("qingyin")) {
				player.removeCharacter(0);
			}
			if (lib.character[player.name2][3].includes("qingyin")) {
				player.removeCharacter(1);
			}
		},
		ai: {
			order(item, player) {
				var isFriend;
				if (player.identity == "unknown") {
					var group = "shu";
					if (!player.wontYe("shu")) {
						group = null;
					}
					isFriend = function (current) {
						return current == player || current.identity == group;
					};
				} else {
					isFriend = function (target) {
						return target.isFriendOf(player);
					};
				}
				var targets = game.filterPlayer(function (current) {
					return isFriend(current);
				});
				var num = 0,
					max = 0;
				for (var i of targets) {
					var dam = i.maxHp - i.hp;
					num += dam;
					max += i.maxHp;
				}
				return num / max >= 1 / Math.max(1.6, game.roundNumber) ? 1 : -1;
			},
			result: {
				player: 1,
			},
		},
	}
```

## gz_pengyang 名字:gz_pengyang 势力:shu

### gztongling 名字:通令
描述: 出牌阶段限一次，当你对一名与你势力不同的角色A造成伤害后，你可以选择一名与你势力相同的角色B，令B选择是否对A使用一张牌。若B选择使用，则此牌结算后，若此牌造成过伤害，你和B各摸两张牌，否则A获得你对其造成伤害的牌。
```js
gztongling: {
		audio: "daming",
		trigger: { source: "damageSource" },
		filter(event, player) {
			if (event.player.isFriendOf(player)) {
				return false;
			}
			return player.isPhaseUsing() && event.player.isIn() && !player.hasSkill("gztongling_used");
		},
		direct: true,
		content() {
			"step 0";
			var str = "";
			if (get.itemtype(trigger.cards) == "cards" && trigger.cards.filterInD().length) {
				str += "；未造成伤害，其获得" + get.translation(trigger.cards.filterInD());
			}
			player
				.chooseTarget(get.prompt("gztongling"), "令一名势力与你相同的角色选择是否对其使用一张牌。若使用且此牌：造成伤害，你与其各摸两张牌" + str, function (card, player, target) {
					return target.isFriendOf(player);
				})
				.set("ai", function (target) {
					var aim = _status.event.aim;
					var cards = target.getCards("hs", function (card) {
						return target.canUse(card, aim, false) && get.effect(aim, card, target, player) > 0 && get.effect(aim, card, target, target) > 0;
					});
					if (cards.length) {
						return cards.some(card => get.tag(card, "damage")) ? 2 : 1;
					}
					return 0;
				})
				.set("aim", trigger.player);
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("gztongling", target);
				player.addTempSkill("gztongling_used", "phaseUseAfter");
				player.line2([target, trigger.player]);
				target
					.chooseToUse(
						function (card, player, event) {
							return lib.filter.filterCard.apply(this, arguments);
						},
						"通令：是否对" + get.translation(trigger.player) + "使用一张牌？"
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
					.set("sourcex", trigger.player)
					.set("addCount", false);
			} else {
				event.finish();
			}
			"step 2";
			if (result.bool) {
				if (target.hasHistory("sourceDamage", evt => evt.getParent(4).name == "gztongling")) {
					player.draw(2, "nodelay");
					target.draw(2);
				} else {
					if (get.itemtype(trigger.cards) == "cards" && trigger.cards.filterInD().length && trigger.player.isIn()) {
						trigger.player.gain(trigger.cards.filterInD(), "gain2");
					}
				}
			}
		},
		subSkill: { used: { charlotte: true } },
	}
```

### gzjinyu 名字:近谀
描述: 当你明置此武将牌后，你令所有与你距离为1以内的角色依次执行以下效果：若其武将牌均明置，则其选择一张武将牌暗置，否则其弃置两张牌。
```js
gzjinyu: {
		audio: "xiaoni",
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			if (
				!game.hasPlayer(function (current) {
					return get.distance(player, current) <= 1;
				})
			) {
				return false;
			}
			return event.toShow.some(name => get.character(name, 3).includes("gzjinyu"));
		},
		logTarget(event, player) {
			return game
				.filterPlayer(function (current) {
					return get.distance(player, current) <= 1;
				})
				.sortBySeat(player);
		},
		forced: true,
		locked: false,
		content() {
			"step 0";
			event.targets = game
				.filterPlayer(function (current) {
					return get.distance(player, current) <= 1;
				})
				.sortBySeat(player);
			"step 1";
			var target = event.targets.shift();
			event.target = target;
			if (!target.isUnseen(2)) {
				if (get.is.jun(target)) {
					event._result = { control: "副将" };
				} else {
					target
						.chooseControl("主将", "副将")
						.set("prompt", "近谀：请暗置一张武将牌")
						.set("ai", function () {
							var target = _status.event.player;
							if (get.character(target.name, 3).includes("gzjinyu")) {
								return "主将";
							}
							if (get.character(target.name2, 3).includes("gzjinyu")) {
								return "副将";
							}
							if (
								lib.character[target.name][3].some(skill => {
									var info = get.info(skill);
									return info && info.ai && info.ai.maixie;
								})
							) {
								return "主将";
							}
							if (target.name == "gz_zhoutai") {
								return "副将";
							}
							if (target.name2 == "gz_zhoutai") {
								return "主将";
							}
							return "副将";
						});
				}
			} else {
				target.chooseToDiscard(2, "he", true);
				event.goto(3);
			}
			"step 2";
			if (result.control) {
				target.hideCharacter(result.control == "主将" ? 0 : 1);
			}
			"step 3";
			if (event.targets.length) {
				event.goto(1);
			}
		},
	}
```

## gz_zhuling 名字:gz_zhuling 势力:wei

### gzjuejue 名字:决绝
描述: ①弃牌阶段开始时，你可失去1点体力。然后若你于此阶段内弃置过你的牌，则你令其他角色各选择一项：1.将X张手牌置入弃牌堆（X为你于此阶段内弃置过的牌数）；2.受到你造成的1点伤害。②你杀死与你势力相同的角色不执行奖惩。
```js
gzjuejue: {
		audio: 2,
		trigger: { player: "phaseDiscardBegin" },
		check(event, player) {
			return (
				player.hp > 2 &&
				player.needsToDiscard() > 0 &&
				game.countPlayer(function (current) {
					return get.attitude(current, player) <= 0;
				}) >
					game.countPlayer() / 2
			);
		},
		preHidden: true,
		content() {
			player.addTempSkill("gzjuejue_effect");
			player.loseHp();
		},
		subSkill: {
			effect: {
				trigger: { player: "phaseDiscardAfter" },
				forced: true,
				charlotte: true,
				popup: false,
				filter(event, player) {
					return (
						player.getHistory("lose", function (evt) {
							return evt.type == "discard" && evt.cards2 && evt.cards2.length > 0 && evt.getParent("phaseDiscard") == event;
						}).length > 0
					);
				},
				content() {
					"step 0";
					var num = 0;
					player.getHistory("lose", function (evt) {
						if (evt.type == "discard" && evt.getParent("phaseDiscard") == trigger) {
							num += evt.cards2.length;
						}
					});
					event.num = num;
					event.targets = game
						.filterPlayer(function (current) {
							return current != player;
						})
						.sortBySeat();
					player.line(event.targets, "green");
					"step 1";
					var target = targets.shift();
					event.target = target;
					if (target.isIn()) {
						target.addTempClass("target");
						target.chooseCard("h", num, "将" + get.cnNumber(num) + "张牌置入弃牌堆，或受到1点伤害").set("ai", function (card) {
							var evt = _status.event.getParent();
							if (get.damageEffect(evt.target, evt.player, evt.target) >= 0) {
								return 0;
							}
							return 8 / Math.sqrt(evt.num) + evt.target.getDamagedHp() - get.value(card);
						});
					} else if (targets.length) {
						event.redo();
					} else {
						event.finish();
					}
					"step 2";
					if (result.bool) {
						target.lose(result.cards, ui.discardPile, "visible");
						target.$throw(result.cards, 1000);
						game.log(target, "将", result.cards, "置入了弃牌堆");
					} else {
						target.damage();
					}
					"step 3";
					game.delayx();
					if (targets.length) {
						event.goto(1);
					}
				},
			},
		},
		ai: {
			noDieAfter2: true,
			skillTagFilter(player, tag, target) {
				return target.isFriendOf(player);
			},
		},
	}
```

### gzfangyuan 名字:方圆
描述: `${get.poptip("guozhan_zhenfa")}，若你在一个${get.poptip("guozhan_weigong")}关系中：①是围攻角色，则所有围攻角色的手牌上限+1且被围攻角色手牌上限-1；②是被围攻角色，则结束阶段，你视为对一名围攻角色使用【杀】。`
```js
gzfangyuan: {
		audio: 2,
		trigger: { player: "phaseJieshuBegin" },
		zhenfa: "siege",
		direct: true,
		locked: false,
		filter(event, player) {
			return (
				game.countPlayer() >= 4 &&
				game.hasPlayer(function (current) {
					return player.sieged(current) && player.canUse("sha", current, false);
				})
			);
		},
		preHidden: true,
		content() {
			"step 0";
			var list = game.filterPlayer(function (current) {
				return player.sieged(current) && player.canUse("sha", current, false);
			});
			if (player.hasSkill("gzfangyuan")) {
				if (list.length == 1) {
					event._result = { bool: true, targets: list };
				} else {
					player
						.chooseTarget(
							"方圆：视为对一名围攻你的角色使用【杀】",
							function (card, player, target) {
								return _status.event.list.includes(target);
							},
							true
						)
						.set("list", list)
						.set("ai", function (target) {
							var player = _status.event.player;
							return get.effect(target, { name: "sha", isCard: true }, player, player);
						})
						.setHiddenSkill("gzfangyuan");
				}
			} else {
				player
					.chooseTarget(get.prompt("gzfangyuan"), "视为对一名围攻你的角色使用【杀】", function (card, player, target) {
						return _status.event.list.includes(target);
					})
					.set("list", list)
					.set("ai", function (target) {
						var player = _status.event.player;
						return get.effect(target, { name: "sha", isCard: true }, player, player);
					});
			}
			"step 1";
			if (result.bool) {
				player.useCard({ name: "sha", isCard: true }, result.targets[0], "gzfangyuan", false);
			}
		},
		global: "gzfangyuan_siege",
		subSkill: {
			siege: {
				mod: {
					maxHandcard(player, num) {
						if (game.countPlayer() < 4) {
							return;
						}
						var next = player.getNext(),
							prev = player.getPrevious(),
							siege = [];
						if (player.siege(next)) {
							siege.push(next.getNext());
						}
						if (player.siege(prev)) {
							siege.push(prev.getPrevious());
						}
						if (siege.length) {
							siege.push(player);
							num += siege.filter(function (source) {
								return source.hasSkill("gzfangyuan");
							}).length;
						}
						if (player.sieged()) {
							if (next.hasSkill("gzfangyuan")) {
								num--;
							}
							if (prev.hasSkill("gzfangyuan")) {
								num--;
							}
						}
						return num;
					},
				},
			},
		},
	}
```

## gz_wangyi 名字:gz_wangyi 势力:wei

### zhenlie
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### miji
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_wangji 名字:gz_wangji 势力:wei

### fakeqizhi 名字:奇制
描述: 当你于回合内声明使用非装备牌A时，你可以弃置不是此牌目标的一名角色的一张牌B，然后其摸一张牌。若A具有应变效果，且A和B的花色相同，则你无视条件触发A的应变效果。
```js
fakeqizhi: {
		audio: "qizhi",
		trigger: { player: "useCard1" },
		filter(event, player) {
			if (!event.targets || !event.targets.length) {
				return false;
			}
			if (_status.currentPhase != player) {
				return false;
			}
			if (get.type(event.card) == "equip") {
				return false;
			}
			return game.hasPlayer(target => !event.targets.includes(target) && target.countCards("he") > 0);
		},
		direct: false,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("fakeqizhi"), (card, player, target) => {
					return !get.event().getTrigger().targets.includes(target) && target.countCards("he") > 0;
				})
				.set("ai", target => {
					const player = get.event().player;
					if (target == player) {
						return 2;
					}
					if (get.attitude(player, target) <= 0) {
						return 1;
					}
					return 0.5;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const { bool, cards } = await player.discardPlayerCard(target, "he", true).forResult();
			if (bool) {
				await target.draw();
				if (cards.some(i => get.suit(i, target) == get.suit(trigger.card))) {
					trigger.forceYingbian = true;
				}
			}
		},
	}
```

### fakejinqu 名字:进趋
描述: 结束阶段，你可以摸两张牌，然后你将手牌弃置至X张（X为你本回合发动过〖奇制〗的次数）。
```js
fakejinqu: {
		audio: "jinqu",
		trigger: { player: "phaseJieshuBegin" },
		check(event, player) {
			return (
				player.getHistory("useSkill", evt => {
					return evt.skill == "fakeqizhi";
				}).length >= player.countCards("h")
			);
		},
		prompt2(event, player) {
			const num = player.getHistory("useSkill", evt => evt.skill == "fakeqizhi").length;
			return "摸两张牌，然后将手牌弃置至" + get.cnNumber(num) + "张";
		},
		content() {
			"step 0";
			player.draw(2);
			"step 1";
			var dh =
				player.countCards("h") -
				player.getHistory("useSkill", evt => {
					return evt.skill == "fakeqizhi";
				}).length;
			if (dh > 0) {
				player.chooseToDiscard(dh, true);
			}
		},
		ai: { combo: "fakeqizhi" },
	}
```

## gz_xurong 名字:gz_xurong 势力:qun

### gzxionghuo 名字:凶镬
描述: 每局游戏限三次，出牌阶段限一次，你可以选择一名角色，然后你获得以下效果：①当你于每回合首次对其使用牌造成伤害时，你令此伤害+1；②其出牌阶段开始时，你移去此效果，然后随机执行以下一项：⒈对其造成1点火属性伤害，其本回合不能对你使用【杀】。⒉令其失去1点体力，其本回合手牌上限-1。⒊获得其装备区一张牌，然后获得其一张手牌。
```js
gzxionghuo: {
		audio: "xinfu_xionghuo",
		enable: "phaseUse",
		filter(event, player) {
			return player.countMark("gzxionghuo_used") < 3;
		},
		filterTarget(card, player, target) {
			return target.isEnemyOf(player);
		},
		usable: 1,
		content() {
			player.addSkill("gzxionghuo_used");
			player.addMark("gzxionghuo_used", 1, false);
			player.addSkill("gzxionghuo_effect");
			const targets = player.getStorage("gzxionghuo_effect").slice().concat([target]);
			player.setStorage("gzxionghuo_effect", targets, true);
		},
		ai: {
			order: 9,
			result: { target: -1 },
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
				intro: { content: "已发动过#次" },
			},
			effect: {
				charlotte: true,
				intro: { content: "已指定$" },
				trigger: {
					source: "damageBegin1",
					global: "phaseUseBegin",
				},
				filter(event, player) {
					if (!player.getStorage("gzxionghuo_effect").includes(event.player)) {
						return false;
					}
					return event.name === "phaseUse" || (event.card && !player.hasHistory("sourceDamage", evt => evt.player === event.player));
				},
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					let num = player.getStorage("gzxionghuo_effect").filter(i => i === trigger.player).length;
					if (trigger.name === "damage") {
						trigger.num += num;
					} else {
						const target = trigger.player;
						while (player.getStorage("gzxionghuo_effect").includes(target)) {
							player.unmarkAuto("gzxionghuo_effect", [target]);
						}
						while (num > 0) {
							num--;
							switch (get.rand(1, 3)) {
								case 1:
									player.line(target, "fire");
									await target.damage(1, "fire");
									target.addTempSkill("xinfu_xionghuo_disable");
									target.markAuto("xinfu_xionghuo_disable", [player]);
									break;
								case 2:
									player.line(target, "water");
									await target.loseHp();
									target.addTempSkill("xinfu_xionghuo_low");
									target.addMark("xinfu_xionghuo_low", 1, false);
									break;
								case 3:
									player.line(target, "green");
									for (const pos of ["e", "h"]) {
										await player.gainPlayerCard(target, pos, true);
									}
									break;
							}
						}
					}
				},
			},
		},
	}
```

## gz_xianglang 名字:gz_xianglang 势力:shu

### gzkanji 名字:勘集
描述: 出牌阶段限一次，你可以展示所有手牌，若花色均不同，你摸两张牌。然后若你的手牌因此包含了四种花色，你本回合手牌上限+4。
```js
gzkanji: {
		audio: "dckanji",
		inherit: "dckanji",
		usable: 1,
		async content(event, trigger, player) {
			await player.showHandcards();
			const suits = player
				.getCards("h")
				.slice()
				.map(card => get.suit(card, player))
				.unique();
			if (suits.length == player.countCards("h")) {
				event.suitsLength = suits.length;
				player.addTempSkill("gzkanji_check");
				await player.draw(2);
			}
		},
		subSkill: {
			check: {
				charlotte: true,
				trigger: { player: "gainAfter" },
				filter(event, player) {
					if (event.getParent(2).name != "gzkanji") {
						return false;
					}
					const len = event.getParent(2).suitsLength;
					const suits = player
						.getCards("h")
						.slice()
						.map(card => get.suit(card, player))
						.unique();
					return suits.length >= 4 && len < 4;
				},
				forced: true,
				popup: false,
				content() {
					player.addTempSkill("gzkanji_hand");
					player.addMark("gzkanji_hand", 4, false);
				},
			},
			hand: {
				charlotte: true,
				onremove: true,
				intro: { content: "手牌上限+#" },
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("gzkanji_hand");
					},
				},
			},
		},
	}
```

### dcqianzheng
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_tengyin 名字:gz_tengyin 势力:wu

### gzchenjian 名字:陈见
描述: 准备阶段，你可亮出牌堆顶的三张牌，然后可以选择执行其中一项：⒈弃置一张牌，然后令一名角色获得其中与你弃置牌花色相同的牌。⒉使用其中一张牌。
```js
gzchenjian: {
		audio: "chenjian",
		trigger: { player: "phaseZhunbeiBegin" },
		content() {
			"step 0";
			var cards = get.cards(3);
			event.cards = cards;
			player.showCards(cards, get.translation(player) + "发动了【陈见】");
			"step 1";
			var list = [];
			if (
				player.countCards("he", i => {
					return lib.filter.cardDiscardable(i, player, "gzchenjian");
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
			if (list.length === 1) {
				event._result = { control: list[0] };
			} else if (list.length > 1) {
				player
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
					});
			} else {
				event.finish();
			}
			"step 2";
			event.choosed = result.control;
			if (result.control === "cancel2") {
				event.finish();
			} else if (result.control === "选项二") {
				event.goto(6);
			}
			"step 3";
			if (
				player.countCards("he", i => {
					return lib.filter.cardDiscardable(i, player, "chenjian");
				})
			) {
				player
					.chooseToDiscard("he", true)
					.set("ai", function (card) {
						let evt = _status.event.getParent(),
							val = evt.player.countMark("chenjian") < 2 ? 0 : -get.value(card),
							suit = get.suit(card);
						for (let i of evt.cards) {
							if (get.suit(i, false) == suit) {
								val += get.value(i, "raw");
							}
						}
						return val;
					})
					.set("prompt", "陈见：请弃置一张牌，然后令一名角色获得" + get.translation(event.cards) + "中花色与之相同的牌" + (event.goon ? "？" : ""));
			} else if (event.choosed === "选项一") {
				event.goto(6);
			} else {
				event.finish();
			}
			"step 4";
			if (result.bool) {
				var suit = get.suit(result.cards[0], player);
				var cards2 = event.cards.filter(function (i) {
					return get.suit(i, false) == suit;
				});
				if (cards2.length) {
					event.cards2 = cards2;
					player.chooseTarget(true, "选择一名角色获得" + get.translation(cards2)).set("ai", function (target) {
						var att = get.attitude(_status.event.player, target);
						if (att > 0) {
							return att + Math.max(0, 5 - target.countCards("h"));
						}
						return att;
					});
				} else {
					event.finish();
				}
			} else {
				event.finish();
			}
			"step 5";
			if (result.bool) {
				var target = result.targets[0];
				player.line(target, "green");
				target.gain(event.cards2, "gain2");
			}
			event.finish();
			"step 6";
			var cards2 = cards.filter(function (i) {
				return player.hasUseTarget(i);
			});
			if (cards2.length) {
				player.chooseButton(["陈见：" + (event.goon ? "是否" : "请") + "使用其中一张牌" + (event.goon ? "？" : ""), cards2], !event.goon).set("ai", function (button) {
					return player.getUseValue(button.link);
				});
			} else {
				event.finish();
			}
			"step 7";
			if (result.bool) {
				player.chooseUseTarget(true, result.links[0], false);
			}
		},
	}
```

### gzxixiu 名字:皙秀
描述: 锁定技。①当你成为其他角色使用牌的目标时，若你的装备区内有和此牌花色相同的牌，则你摸一张牌。②若你装备区内的牌数为1，其他角色弃置此牌时，取消之。
```js
gzxixiu: {
		audio: "xixiu",
		trigger: {
			player: "loseBegin",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (event.name === "lose") {
				if (event.type != "discard" || event.getlx === false) {
					return false;
				}
				if (event.getParent(2).player === player || player.countCards("e") !== 1) {
					return false;
				}
				return event.cards.includes(player.getCards("e")[0]);
			}
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
		forced: true,
		content() {
			if (trigger.name === "lose") {
				trigger.cards.remove(player.getCards("e")[0]);
			} else {
				player.draw();
			}
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

## gz_re_panshu 名字:gz_re_panshu 势力:wu

### zhiren
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gzyaner 名字:燕尔
描述: 每回合限一次，其他角色于其出牌阶段内失去最后的手牌后，你可以与其各摸一张牌。
```js
gzyaner: {
		audio: "yaner",
		inherit: "yaner",
		prompt2: "与该角色各摸一张牌",
		content() {
			game.asyncDraw([_status.currentPhase, player]);
		},
	}
```

## gz_maliang 名字:gz_maliang 势力:shu

### xiemu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### naman
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_caozhen 名字:gz_caozhen 势力:wei

### gzsidi 名字:司敌
描述: ①一名与你势力相同的角色受到伤害后，你可以将一张与武将牌上的“驭”类别均不同的一张牌称为“驭”置于武将牌上。②与你势力不同的角色的回合开始时，你可以移去至多三张“驭”，然后选择执行等量项：⒈选择移去“驭”中的一个类别，令其本回合无法使用此类别的牌。⒉选择其一个已明置武将牌上的一个技能，令此技能于本回合失效。⒊选择一名与你势力相同的已受伤其他角色，令其回复1点体力。
```js
gzsidi: {
		audio: "sidi",
		trigger: { player: "damageEnd" },
		filter(event, player) {
			if (
				!player.hasCard(card => {
					if (get.position(card) === "h" && _status.connectMode) {
						return true;
					}
					return !player.getExpansions("gzsidi").some(cardx => get.type2(cardx) === get.type2(card));
				}, "he")
			) {
				return false;
			}
			return player.isFriendOf(event.player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(
					get.prompt("gzsidi"),
					(card, player) => {
						return !player.getExpansions("gzsidi").some(cardx => get.type2(cardx) === get.type2(card));
					},
					"将一张与武将牌上的“驭”类别均不同的牌置于武将牌上",
					"he"
				)
				.set("ai", card => {
					return 6 - get.value(card);
				})
				.forResult();
		},
		content() {
			player.addToExpansion(event.cards, player, "give").gaintag.add("gzsidi");
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		marktext: "驭",
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		group: "gzsidi_effect",
		subSkill: {
			effect: {
				audio: "sidi",
				trigger: { global: "phaseBegin" },
				filter(event, player) {
					if (!event.player.isEnemyOf(player)) {
						return false;
					}
					return player.getExpansions("gzsidi").length;
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseButton(["###" + get.prompt("sidi", trigger.player) + '###<div class="text center">将至多三张“驭”置入弃牌堆，然后执行等量条效果</div>', player.getExpansions("gzsidi")], [1, 3])
						.set("ai", button => {
							const player = get.player(),
								target = get.event().getTrigger().player;
							if (get.attitude(player, target) >= 0) {
								return 0;
							}
							return ["equip", "trick", "basic"].indexOf(get.type2(button.link)) + 2;
						})
						.forResult();
					if (event.result?.bool && event.result.links?.length) {
						event.result.cards = event.result.links;
					}
				},
				logTarget: "player",
				async content(event, trigger, player) {
					const cards = event.cards,
						target = trigger.player;
					await player.loseToDiscardpile(cards);
					let num = cards.length,
						result;
					let list = cards.slice().map(i => get.type2(i, false));
					if (num !== 3) {
						list.add("cancel2");
					}
					result = await player
						.chooseControl(list)
						.set("ai", () => {
							return get.event().controls.randomGet();
						})
						.set("prompt", (num === 3 ? "" : "是否") + "封禁其本回合一种类别的牌" + (num === 3 ? "" : "？（还可选择" + num + "次）"))
						.forResult();
					if (result.control !== "cancel2") {
						num--;
						player.popup(result.control);
						game.log(player, "选择了", "#g" + get.translation(result.control));
						target.addTempSkill("gzsidi_ban");
						target.markAuto("gzsidi_ban", [result.control]);
						if (!num) {
							return event.finish();
						}
					}
					let skills = target.getStockSkills(null, true);
					if (skills.length) {
						if (num !== 2) {
							skills.add("cancel2");
						}
						result = await player
							.chooseControl(skills)
							.set("ai", () => {
								return get.event().controls.randomGet();
							})
							.set("prompt", (num === 2 ? "" : "是否") + "封禁其明置武将牌上的一个技能" + (num === 3 ? "" : "？（还可选择" + num + "次）"))
							.forResult();
						if (result.control !== "cancel2") {
							num--;
							player.popup(result.control);
							game.log(player, "选择了", "#g" + get.translation(result.control));
							target.addTempSkill("gzsidi_disable");
							target.disableSkill("gzsidi_disable", result.control);
							if (!num) {
								return event.finish();
							}
						}
					}
					if (game.hasPlayer(target => target !== player && target.isDamaged() && target.isFriendOf(player))) {
						result = await player
							.chooseTarget("是否令一名与你势力相同的其他角色回复1点体力？", (card, player, target) => {
								return target !== player && target.isDamaged() && target.isFriendOf(player);
							})
							.set("ai", target => {
								const player = get.player();
								return get.recoverEffect(target, player, player);
							})
							.forResult();
						if (result.bool) {
							player.line(result.targets[0]);
							await result.targets[0].recover();
						}
					}
				},
			},
			ban: {
				charlotte: true,
				onremove: true,
				intro: { content: "不能使用$牌" },
				mod: {
					cardEnabled(card, player) {
						if (player.getStorage("gzsidi_ban").includes(get.type2(card))) {
							var hs = player.getCards("h"),
								cards = [card];
							if (Array.isArray(card.cards)) {
								cards.addArray(card.cards);
							}
							for (var i of cards) {
								if (hs.includes(i)) {
									return false;
								}
							}
						}
					},
					cardSavable(card, player) {
						if (player.getStorage("gzsidi_ban").includes(get.type2(card))) {
							var hs = player.getCards("h"),
								cards = [card];
							if (Array.isArray(card.cards)) {
								cards.addArray(card.cards);
							}
							for (var i of cards) {
								if (hs.includes(i)) {
									return false;
								}
							}
						}
					},
				},
			},
			disable: {
				charlotte: true,
				onremove(player, skill) {
					player.enableSkill(skill);
				},
			},
		},
	}
```

## gz_bulianshi 名字:gz_bulianshi 势力:wu

### old_anxu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### zhuiyi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_mazhong 名字:gz_mazhong 势力:shu

### twfuman
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_ol_lisu 名字:李肃 势力:qun

### qiaoyan
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### xianzhu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_jun_liubei 名字:君刘备 势力:shu

### zhangwu 名字:章武
描述: 锁定技。当【飞龙夺凤】进入弃牌堆或其他角色的装备区后，你获得之。当你不因使用而失去【飞龙夺风】时，你展示此牌，将此牌置于牌堆底并摸两张牌。
```js
zhangwu: {
		audio: 2,
		derivation: "feilongduofeng",
		unique: true,
		forceunique: true,
		ai: {
			threaten: 2,
		},
		trigger: {
			global: ["loseAfter", "cardsDiscardAfter", "equipAfter"],
		},
		forced: true,
		filter(event, player) {
			if (event.name == "equip") {
				if (player == event.player) {
					return false;
				}
				if (event.cards.some(card => card.name == "feilongduofeng" && event.player.getCards("e").includes(card))) {
					return true;
				}
				return event.player.hasHistory("lose", function (evt) {
					if (evt.position != ui.discardPile || evt.getParent().name != "equip") {
						return false;
					}
					if (evt.cards.some(card => card.name == "feilongduofeng" && get.position(card, true) == "d")) {
						return true;
					}
					return false;
				});
			}
			if (event.name == "lose" && (event.position != ui.discardPile || event.getParent().name == "equip")) {
				return false;
			}
			if (event.cards.some(card => card.name == "feilongduofeng" && get.position(card, true) == "d")) {
				return true;
			}
			return false;
		},
		logTarget(event, player) {
			if (event.name == "equip" && event.cards.some(card => card.name == "feilongduofeng" && event.player.getCards("e").includes(card))) {
				return event.player;
			}
			return [];
		},
		async content(event, trigger, player) {
			await game.delayx();
			let cards = [];
			if (trigger.name == "equip") {
				for (const card of trigger.cards) {
					if (card.name == "feilongduofeng" && trigger.player.getCards("e").includes(card)) {
						cards.push(card);
					}
				}
				trigger.player.getHistory("lose", function (evt) {
					if (evt.position != ui.discardPile || evt.getParent() != trigger) {
						return false;
					}
					for (const card of evt.cards) {
						if (card.name == "feilongduofeng" && get.position(card, true) == "d") {
							cards.push(card);
						}
					}
					return false;
				});
			}
			if (["lose", "cardsDiscard"].includes(trigger.name)) {
				for (const card of trigger.cards) {
					if (card.name == "feilongduofeng" && get.position(card, true) == "d") {
						cards.push(card);
					}
				}
			}
			if (!cards.length) {
				return;
			}
			let owner = get.owner(cards[0]);
			if (owner) {
				await player.gain(cards, "give", owner, "bySelf");
			} else {
				await player.gain(cards, "gain2");
			}
		},
		group: "zhangwu_draw",
		subSkill: {
			draw: {
				audio: "zhangwu",
				trigger: {
					player: "loseEnd",
					global: ["equipEnd", "addJudgeEnd", "gainEnd", "loseAsyncEnd", "addToExpansionEnd"],
				},
				filter(event, player) {
					if (event.getParent().name == "useCard") {
						return false;
					}
					const evt = event.getl(player);
					return (
						evt &&
						evt.player == player &&
						evt.cards2.filter(function (i) {
							return i.name == "feilongduofeng" && get.owner(i) != player;
						}).length > 0
					);
				},
				forced: true,
				async content(event, trigger, player) {
					const cards = [],
						evt = trigger.getl(player);
					cards.addArray(
						evt.cards2.filter(function (i) {
							return i.name == "feilongduofeng" && get.owner(i) != player;
						})
					);
					await player.showCards(cards, get.translation(player) + "发动了【章武】");
					for (const i of cards) {
						const owner = get.owner(i);
						if (owner) {
							await owner.lose(i, ui.cardPile).set("_triggered", null);
						} else {
							await game.cardsGotoPile(i);
						}
					}
					await player.draw(2);
				},
			},
		},
	}
```

### jizhao 名字:激诏
描述: `限定技。当你处于濒死状态时，你可以将手牌补至体力上限，体力回复至2点，失去技能〖授钺〗并获得技能${get.poptip("rerende")}。`
```js
jizhao: {
		derivation: "rerende",
		unique: true,
		audio: 2,
		enable: "chooseToUse",
		mark: true,
		skillAnimation: true,
		animationColor: "fire",
		init(player) {
			player.storage.jizhao = false;
		},
		filter(event, player) {
			if (player.storage.jizhao) {
				return false;
			}
			if (event.type == "dying") {
				if (player != event.dying) {
					return false;
				}
				return true;
			}
			return false;
		},
		content() {
			"step 0";
			player.awakenSkill("jizhao");
			player.storage.jizhao = true;
			var num = player.maxHp - player.countCards("h");
			if (num > 0) {
				player.draw(num);
			}
			"step 1";
			if (player.hp < 2) {
				player.recover(2 - player.hp);
			}
			"step 2";
			player.removeSkill("wuhujiangdaqi");
			player.changeSkills(["rerende"], ["shouyue"]);
		},
		ai: {
			order: 1,
			skillTagFilter(player, arg, target) {
				if (player != target || player.storage.jizhao) {
					return false;
				}
			},
			save: true,
			result: {
				player: 10,
			},
		},
		intro: {
			content: "limited",
		},
	}
```

### shouyue 名字:授钺
描述: `君主技。只要此武将牌处于明置状态，你便拥有“${get.poptip({
		id: "shouyue_wuhujiangdaqi",
		name: "五虎将大旗",
		type: "character",
		info: `存活的蜀势力角色的技能按以下规则改动：<br>${get.poptip("gz_wusheng")}：将“红色牌”改为“任意牌”<br>${get.poptip("gz_paoxiao")}：增加描述“你使用的【杀】无视其他角色的防具”<br>${get.poptip("gz_longdan")}：增加描述“你发动〖龙胆〗使用或打出牌时摸一张牌”<br>${get.poptip("gz_tieji")}：将“一张明置的武将牌”改为“所有明置的武将牌”<br>${get.poptip("gz_liegong")}：增加描述“你的攻击范围+1”`,
	})}”。`
```js
shouyue: {
		audio: true,
		unique: true,
		forceunique: true,
		global: "wuhujiangdaqi",
		derivation: ["wuhujiangdaqi", "gz_wusheng", "gz_paoxiao", "gz_longdan", "gz_tieji", "gz_liegong"],
		mark: true,
		lordSkill: true,
		init(player) {
			player.markSkill("wuhujiangdaqi");
		},
	}
```

## gz_jun_zhangjiao 名字:君张角 势力:qun

### wuxin 名字:悟心
描述: 摸牌阶段开始时，你可以观看牌堆顶的X张牌（X为群势力角色的数量），然后将这些牌以任意顺序置于牌堆顶。
```js
wuxin: {
		trigger: { player: "phaseDrawBegin1" },
		audio: 2,
		filter(event, player) {
			return get.population("qun") > 0;
		},
		async content(event, trigger, player) {
			let num = get.population("qun");
			// if (player.hasSkill("hongfa")) {
			// 村规
			if (player.hasSkill("hongfa", null, null, false)) {
				num += player.getExpansions("huangjintianbingfu").length;
			}
			const cards = get.cards(num, true);
			await game.cardsGotoOrdering(cards);
			const next = player.chooseToMove("悟心：将卡牌以任意顺序置于牌堆顶");
			next.set("list", [["牌堆顶", cards]]);
			next.set("processAI", function (list) {
				var cards = list[0][1].slice(0);
				cards.sort(function (a, b) {
					return get.value(b) - get.value(a);
				});
				return [cards];
			});
			const result = await next.forResult();
			if (result.bool) {
				const list = result.moved[0].slice(0);
				await game.cardsGotoPile(list.reverse(), "insert");
				game.updateRoundNumber();
			}
		},
	}
```

### hongfa 名字:弘法
描述: `君主技。①只要此武将牌处于明置状态，你便拥有“${get.poptip({
		id: "hongfa_huangjintianbingfu",
		name: "黄巾天兵符",
		type: "character",
		info: "①锁定技，当你计算群势力角色数时，每一张“天兵”均可视为一名群势力角色。②当你失去体力时，你可改为将一张“天兵”置入弃牌堆。③与你势力相同的角色可将一张“天兵”当作【杀】使用或打出。",
	})}”。②准备阶段，若没有“天兵”，你将牌堆顶的X张牌置于“${get.poptip("hongfa_huangjintianbingfu")}”上，称为“天兵”（X为群势力角色的数量）。`
```js
hongfa: {
		audio: 3,
		locked: false,
		derivation: "huangjintianbingfu",
		unique: true,
		forceunique: true,
		lordSkill: true,
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		init(player) {
			player.markSkill("huangjintianbingfu");
		},
		filter(event, player) {
			return player.getExpansions("huangjintianbingfu").length == 0 && get.population("qun") > 0;
		},
		content() {
			var cards = get.cards(get.population("qun"));
			player.addToExpansion(cards, "gain2").gaintag.add("huangjintianbingfu");
		},
		ai: {
			threaten: 2,
		},
		group: "hongfa_hp",
		global: ["huangjintianbingfu", "hongfa_use", "hongfa_respond"],
		subSkill: {
			hp: {
				audio: "huangjintianbingfu3.mp3",
				trigger: { player: "loseHpBefore" },
				filter(event, player) {
					return player.getExpansions("huangjintianbingfu").length > 0;
				},
				direct: true,
				content() {
					"step 0";
					player.chooseCardButton(get.prompt("hongfa"), player.getExpansions("huangjintianbingfu")).set("ai", function () {
						return 1;
					});
					"step 1";
					if (result.bool) {
						player.logSkill("hongfa_hp");
						player.loseToDiscardpile(result.links);
						trigger.cancel();
					}
				},
			},
		},
	}
```

### wendao 名字:问道
描述: 出牌阶段限一次，你可以弃置一张不为【太平要术】的红色牌，然后获得弃牌堆或场上的一张【太平要术】。
```js
wendao: {
		audio: 2,
		derivation: "taipingyaoshu",
		unique: true,
		forceunique: true,
		enable: "phaseUse",
		usable: 1,
		filterCard(card) {
			return get.name(card) != "taipingyaoshu" && get.color(card) == "red";
		},
		position: "he",
		check(card) {
			return 6 - get.value(card);
		},
		onChooseToUse(event) {
			if (game.online) {
				return;
			}
			event.set(
				"wendao",
				(function () {
					for (var i = 0; i < ui.discardPile.childElementCount; i++) {
						if (ui.discardPile.childNodes[i].name == "taipingyaoshu") {
							return true;
						}
					}
					return game.hasPlayer(function (current) {
						return current.countCards("ej", "taipingyaoshu");
					});
				})()
			);
		},
		filter(event, player) {
			return event.wendao == true;
		},
		content() {
			var list = [];
			for (var i = 0; i < ui.discardPile.childElementCount; i++) {
				if (ui.discardPile.childNodes[i].name == "taipingyaoshu") {
					list.add(ui.discardPile.childNodes[i]);
				}
			}
			game.countPlayer(function (current) {
				var ej = current.getCards("ej", "taipingyaoshu");
				if (ej.length) {
					list.addArray(ej);
				}
			});
			if (list.length) {
				var card = list.randomGet();
				var owner = get.owner(card);
				if (owner) {
					player.gain(card, owner, "give", "bySelf");
					player.line(owner, "green");
				} else {
					player.gain(card, "gain2");
				}
			}
		},
		ai: {
			order: 8.5,
			result: {
				player: 1,
			},
		},
	}
```

## gz_jun_sunquan 名字:君孙权 势力:wu

### jiahe 名字:嘉禾
描述: `君主技，只要此武将牌处于明置状态，你便拥有“${get.poptip({
		id: "jiahe_yuanjiangfenghuotu",
		name: "缘江烽火图",
		type: "character",
		info: `①每名吴势力角色的出牌阶段限一次，该角色可以将一张装备牌置于“缘江烽火图”上，称之为“烽火”。②根据“烽火”的数量，所有吴势力角色可于其准备阶段选择并获得其中一个技能直到回合结束：一张及以上：${get.poptip("jiahe_reyingzi")}；两张及以上：${get.poptip("jiahe_haoshi")}；三张及以上：${get.poptip("jiahe_shelie")}；四张及以上：${get.poptip("jiahe_duoshi")}；五张及以上：可额外选择一项。③锁定技，当你受到【杀】或锦囊牌造成的伤害后，你将一张“烽火”置入弃牌堆。`,
	})}”。`
```js
jiahe: {
		audio: true,
		unique: true,
		forceunique: true,
		lordSkill: true,
		mark: true,
		derivation: ["yuanjiangfenghuotu", "jiahe_reyingzi", "jiahe_haoshi", "jiahe_shelie", "jiahe_duoshi"],
		global: ["yuanjiangfenghuotu", "jiahe_damage", "jiahe_put", "jiahe_skill"],
		init(player) {
			player.markSkill("yuanjiangfenghuotu");
		},
	}
```

### lianzi 名字:敛资
描述: `出牌阶段限一次，你可以弃置一张手牌，然后亮出牌堆顶X张牌（X为吴势力角色装备区里的牌和“烽火”的总和），获得其中所有与你弃置牌类别相同的牌，将其余的牌置入弃牌堆，若你以此法一次获得了三张或更多的牌，则你失去技能〖敛资〗并获得技能${get.poptip("gz_zhiheng")}。`
```js
lianzi: {
		enable: "phaseUse",
		usable: 1,
		audio: 2,
		derivation: "gz_zhiheng",
		filterCard: true,
		check(card) {
			if (get.type(card) == "equip") {
				return 0;
			}
			var player = _status.event.player;
			var num =
				game.countPlayer(function (current) {
					if (current.identity == "wu") {
						return current.countCards("e");
					}
				}) + player.getExpansions("yuanjiangfenghuotu").length;
			if (num >= 5) {
				return 8 - get.value(card);
			}
			if (num >= 3) {
				return 7 - get.value(card);
			}
			if (num >= 2) {
				return 3 - get.value(card);
			}
			return 0;
		},
		content() {
			"step 0";
			var num =
				game.countPlayer(function (current) {
					if (current.identity == "wu") {
						return current.countCards("e");
					}
				}) + player.getExpansions("yuanjiangfenghuotu").length;
			if (num) {
				event.shown = get.cards(num);
				player.showCards(event.shown, get.translation("lianzi"));
			} else {
				event.finish();
				return;
			}
			"step 1";
			var list = [];
			var discards = [];
			var type = get.type(cards[0], "trick");
			for (var i = 0; i < event.shown.length; i++) {
				if (get.type(event.shown[i], "trick") == type) {
					list.push(event.shown[i]);
				} else {
					discards.push(event.shown[i]);
				}
			}
			game.cardsDiscard(discards);
			if (list.length) {
				player.gain(list, "gain2");
				if (list.length >= 3 && player.hasStockSkill("lianzi")) {
					player.changeSkills(["gz_zhiheng"], ["lianzi"]);
				}
			}
		},
		ai: {
			order: 7,
			result: {
				player: 1,
			},
		},
	}
```

### jubao 名字:聚宝
描述: 锁定技，你装备区里的宝物牌不能被其他角色获得。结束阶段，若场上或弃牌堆有【定澜夜明珠】，则你摸一张牌，然后获得装备区里有【定澜夜明珠】角色的一张牌。
```js
jubao: {
		mod: {
			canBeGained(card, source, player) {
				if (source != player && get.position(card) == "e" && get.subtype(card) == "equip5") {
					return false;
				}
			},
		},
		trigger: { player: "phaseJieshuBegin" },
		audio: 2,
		derivation: "dinglanyemingzhu",
		forced: true,
		unique: true,
		filter(event, player) {
			if (
				game.hasPlayer(function (current) {
					return current.countCards("ej", function (card) {
						return card.name == "dinglanyemingzhu";
					});
				})
			) {
				return true;
			}
			for (var i = 0; i < ui.discardPile.childElementCount; i++) {
				if (ui.discardPile.childNodes[i].name == "dinglanyemingzhu") {
					return true;
				}
			}
			return false;
		},
		content() {
			"step 0";
			player.draw();
			"step 1";
			var target = game.findPlayer(function (current) {
				return current != player && current.countCards("e", "dinglanyemingzhu");
			});
			if (target && target.countGainableCards(player, "he")) {
				player.line(target, "green");
				player.gainPlayerCard(target, true);
			}
		},
		ai: {
			threaten: 1.5,
		},
	}
```

## gz_lingcao 名字:gz_lingcao 势力:wu

### gzdujin 名字:独进
描述: ①摸牌阶段，你可以额外摸X+1张牌（X为你装备区的牌数的一半，向下取整）。②当你首次明置此武将牌时，若你为你们势力第一个明置武将牌的角色，则你获得1个“先驱”标记。
```js
gzdujin: {
		audio: "dujin",
		inherit: "dujin",
		filter(event, player) {
			return !event.numFixed;
		},
		content() {
			trigger.num += Math.floor(player.countCards("e") / 2) + 1;
		},
		group: "gzdujin_first",
		subSkill: {
			first: {
				audio: "dujin",
				trigger: { player: "showCharacterEnd" },
				filter(event, player) {
					if (
						game
							.getAllGlobalHistory(
								"everything",
								evt => {
									return evt.name == "showCharacter" && evt.player == player && evt.toShow.some(i => get.character(i, 3).includes("gzdujin"));
								},
								event
							)
							.indexOf(event) != 0
					) {
						return false;
					}
					return (
						game.getAllGlobalHistory("everything", evt => {
							return evt.name == "showCharacter" && evt.player.isFriendOf(player);
						})[0].player == player
					);
				},
				forced: true,
				locked: false,
				content() {
					player.addMark("xianqu_mark", 1);
				},
			},
		},
	}
```

## gz_lifeng 名字:gz_lifeng 势力:shu

### tunchu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### shuliang
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_beimihu 名字:gz_beimihu 势力:qun

### gzguishu 名字:鬼术
描述: 出牌阶段，你可以将一张黑桃手牌当作【知己知彼】或【远交近攻】使用（不能与本回合上次以此法使用的牌名相同）。
```js
gzguishu: {
		audio: "bmcanshi",
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("hs", { suit: "spade" }) > 0;
		},
		chooseButton: {
			dialog(event, player) {
				var list = ["yuanjiao", "zhibi"];
				for (var i = 0; i < list.length; i++) {
					list[i] = ["锦囊", "", list[i]];
				}
				return ui.create.dialog("鬼术", [list, "vcard"]);
			},
			filter(button, player) {
				var name = button.link[2];
				if (player.storage.gzguishu_used == 1 && name == "yuanjiao") {
					return false;
				}
				if (player.storage.gzguishu_used == 2 && name == "zhibi") {
					return false;
				}
				return lib.filter.filterCard({ name: name }, player, _status.event.getParent());
			},
			check(button) {
				var player = _status.event.player;
				if (button.link == "yuanjiao") {
					return 3;
				}
				if (button.link == "zhibi") {
					if (player.countCards("hs", { suit: "spade" }) > 2) {
						return 1;
					}
					return 0;
				}
			},
			backup(links, player) {
				return {
					audio: "bmcanshi",
					filterCard: { suit: "spade" },
					position: "hs",
					popname: true,
					ai(card) {
						return 6 - get.value(card);
					},
					viewAs: { name: links[0][2] },
					precontent() {
						player.addTempSkill("gzguishu_used");
						player.storage.gzguishu_used = ["yuanjiao", "zhibi"].indexOf(event.result.card.name) + 1;
					},
				};
			},
			prompt(links, player) {
				return "###鬼术###将一张黑桃手牌当作【" + get.translation(links[0][2]) + "】使用";
			},
		},
		ai: {
			order: 4,
			result: { player: 1 },
			threaten: 2,
		},
		subSkill: {
			backup: {},
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

### gzyuanyu 名字:远域
描述: 锁定技，当你受到伤害时，若此伤害不存在来源或你不在伤害来源的攻击范围内，则此伤害-1。
```js
gzyuanyu: {
		inherit: "hmkyuanyu",
		filter(event, player) {
			return !event.source?.inRange(player);
		},
		content() {
			trigger.num--;
		},
		ai: {
			effect: {
				target(card, player, target) {
					if (player.hasSkillTag("jueqing", false, target)) {
						return;
					}
					if (player.inRange(target)) {
						return;
					}
					const num = get.tag(card, "damage");
					if (num) {
						if (num > 1) {
							return 0.5;
						}
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

## gz_jianggan 名字:gz_jianggan 势力:wei

### weicheng
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### daoshu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_mb_luxun 名字:手杀陆逊 势力:wu

### gz_mb_qianxun 名字:谦逊
描述: 锁定技，当你成为锦囊牌的唯一目标时，若你的“节”数小于3，取消之并将此牌置于你的武将牌上，称为“节”。
```js
gz_mb_qianxun: {
		audio: "sbqianxun",
		trigger: {
			target: "useCardToTarget",
		},
		filter(event, player) {
			return get.type2(event.card) == "trick" && event.targets?.length == 1 && player.countExpansions("gz_mb_qianxun") < 3;
		},
		forced: true,
		async content(event, trigger, player) {
			trigger.getParent().all_excluded = true;
			trigger.getParent().targets.length = 0;
			trigger.untrigger();
			const cards = trigger.cards?.filterInD("od");
			if (cards?.length) {
				const next = player.addToExpansion(cards, "gain2");
				next.gaintag.add(event.name);
				await next;
			}
		},
		marktext: "节",
		intro: {
			name: "节",
			markcount: "expansion",
			content: "expansion",
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		ai: {
			effect: {
				target(card, player, target, current) {
					if (!card?.name || target.countExpansions("gz_mb_qianxun") >= 3) {
						return;
					}
					const info = lib.card[card.name];
					if (!info || !["trick", "delay"].includes(info.type)) {
						return;
					}
					if (info.notarget) {
						return;
					}
					const select = info.selectTarget;
					let range;
					if (select == undefined) {
						range = [1, 1];
					} else if (typeof select == "number") {
						range = [select, select];
					} else if (get.itemtype(select) == "select") {
						range = select;
					} else if (typeof select == "function") {
						range = select(card, player);
						if (typeof range == "number") {
							range = [range, range];
						}
					}
					game.checkMod(card, player, range, "selectTarget", player);
					if (
						(() => {
							if (range[1] !== -1) {
								return !ui.selected.targets.length;
							}
							return !game.hasPlayer(current => current !== target && player.canUse(card, current));
						})()
					) {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

### gz_mb_duoshi 名字:度势
描述: 出牌阶段限一次，你可以选择一项：1.将一张红色手牌当【以逸待劳】使用；2.将三张“节”置入弃牌堆，视为使用一张能造成火焰伤害的牌。
```js
gz_mb_duoshi: {
		audio: "sblianying",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			if (
				player.countCards("hs", card => {
					if (get.color(card) != "red") {
						return false;
					}
					const viewAs = get.autoViewAs({ name: "yiyi" }, [card]);
					return event.filterCard(viewAs, player, event);
				})
			) {
				return true;
			}
			if (player.countExpansions("gz_mb_qianxun") < 3) {
				return false;
			}
			return (
				get.inpileVCardList(info => {
					if (!["basic", "trick"].includes(info[0])) {
						return false;
					}
					const card = new lib.element.VCard({ name: info[2], nature: info[3], isCard: true });
					return get.tag(card, "fireDamage") && event.filterCard(card, player, event);
				}).length > 0
			);
		},
		chooseButton: {
			dialog(event, player) {
				const list = get.inpileVCardList(info => {
					if (!["basic", "trick"].includes(info[0])) {
						return false;
					}
					if (info[2] == "yiyi") {
						return player.countCards("hs", card => {
							if (get.color(card) != "red") {
								return false;
							}
							const viewAs = get.autoViewAs({ name: "yiyi" }, [card]);
							return event.filterCard(viewAs, player, event);
						});
					}
					if (player.countExpansions("gz_mb_qianxun") < 3) {
						return false;
					}
					const card = new lib.element.VCard({ name: info[2], nature: info[3], isCard: true });
					return get.tag(card, "fireDamage") && event.filterCard(card, player, event);
				});
				const dialog = ui.create.dialog("度势", [list, "vcard"], "hidden");
				if (list.length === 1 && list[0][2] === "yiyi") {
					dialog.direct = true;
				}
				return dialog;
			},
			check(button) {
				const player = get.player(),
					card = get.autoViewAs({ name: button.link[2], nature: button.link[3] }, "unsure");
				return player.getUseValue(card);
			},
			backup(links, player) {
				const [_1, _2, name, nature] = links[0],
					backup = get.copy(get.info(`gz_mb_duoshi_${name === "yiyi" ? "yiyi" : "fire"}`));
				if (name !== "yiyi") {
					backup.viewAs = {
						name: name,
						nature: nature,
						isCard: true,
					};
				}
				return backup;
			},
			prompt(links, player) {
				if (links[0][2] === "yiyi") {
					return "###度势###将一张红色手牌当作【以逸待劳】使用";
				}
				return `###度势###移去三张“节”，视为使用一张${get.translation(links[0][3] || "")}${get.translation(links[0][2])}`;
			},
		},
		ai: {
			order() {
				return get.order({ name: "yiyi" }) + 0.1;
			},
			result: {
				player: 1,
			},
		},
		subSkill: {
			backup: {},
			yiyi: {
				audio: "gz_mb_duoshi",
				logAudio: () => "sblianying2.mp3",
				viewAs: {
					name: "yiyi",
				},
				filterCard: {
					color: "red",
				},
				position: "hs",
				check(card) {
					return 5 - get.value(card);
				},
			},
			fire: {
				audio: "gz_mb_duoshi",
				logAudio: () => "sblianying1.mp3",
				viewAs: {
					name: "sha",
					nature: "fire",
					isCard: true,
				},
				filterCard: () => false,
				selectCard: -1,
				async precontent(event, trigger, player) {
					const cards = player.getExpansions("gz_mb_qianxun"),
						result = cards.length > 3 ? await player.chooseButton(["移去三张“节”", cards], 3, true).forResult() : { bool: true, links: cards };
					if (result?.bool && result.links?.length) {
						await player.loseToDiscardpile(result.links);
					}
				},
			},
		},
	}
```

## gz_huaxin 名字:gz_huaxin 势力:wei

### wanggui
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### fakexibing 名字:息兵
描述: 手牌数小于体力值的其他角色于其出牌阶段内使用第一张黑色【杀】或黑色普通锦囊牌指定唯一角色为目标后，你可令该角色将手牌摸至体力值且本回合不能再使用手牌。若你与其均明置了所有武将牌，则你可以暗置你与其各一张武将牌且本回合不能再明置此武将牌。
```js
fakexibing: {
		audio: "xibing",
		filter(event, player) {
			if (player == event.player || event.targets.length != 1 || event.player.countCards("h") >= event.player.hp) {
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
			return (
				event.player.getHistory("useCard", function (evtx) {
					return bool(evtx.card) && evtx.getParent("phaseUse") == evt;
				})[0] == event.getParent()
			);
		},
		logTarget: "player",
		check(event, player) {
			var target = event.player;
			var att = get.attitude(player, target);
			var num2 = Math.min(5, target.hp) - target.countCards("h");
			if (num2 <= 0) {
				return att <= 0;
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
		content() {
			"step 0";
			var num = trigger.player.hp - trigger.player.countCards("h");
			if (num > 0) {
				trigger.player.draw(num);
			}
			"step 1";
			trigger.player.addTempSkill("fakexibing_banned");
			if (get.mode() != "guozhan" || player.isUnseen(2) || trigger.player.isUnseen(2)) {
				event.finish();
			}
			"step 2";
			var target = trigger.player;
			var players1 = [player.name1, player.name2];
			var players2 = [target.name1, target.name2];
			player
				.chooseButton(2, ["是否暗置自己和" + get.translation(target) + "的各一张武将牌？", '<div class="text center">你的武将牌</div>', [players1, "character"], '<div class="text center">' + get.translation(target) + "的武将牌</div>", [players2, "character"]])
				.set("players", players1)
				.set("complexSelect", true)
				.set("filterButton", function (button) {
					return !get.is.jun(button.link) && (ui.selected.buttons.length == 0) == _status.event.players.includes(button.link);
				});
			"step 3";
			if (result.bool) {
				var target = trigger.player;
				player.hideCharacter(player.name1 == result.links[0] ? 0 : 1);
				target.hideCharacter(target.name1 == result.links[1] ? 0 : 1);
				player.addTempSkill("fakexibing_nomingzhi");
				target.addTempSkill("fakexibing_nomingzhi");
			}
		},
		subSkill: {
			banned: {
				mod: {
					cardEnabled2(card) {
						if (get.position(card) == "h") {
							return false;
						}
					},
				},
			},
			nomingzhi: {
				ai: { nomingzhi: true },
			},
		},
	}
```

## gz_luyusheng 名字:gz_luyusheng 势力:wu

### fakezhente 名字:贞特
描述: 每回合限一次，当你成为其他角色使用普通锦囊牌或黑色基本牌的目标后，你可令使用者选择一项：1.本回合不能再使用与此牌颜色相同的牌；2.令此牌对你无效。
```js
fakezhente: {
		audio: "zhente",
		inherit: "zhente",
		filter(event, player) {
			var color = get.color(event.card),
				type = get.type(event.card);
			if (player == event.player || event.player.isDead() || color == "none") {
				return false;
			}
			return type == "trick" || (type == "basic" && color == "black");
		},
	}
```

### fakezhiwei 名字:至微
描述: 你明置此武将牌时，选择一名其他角色。该角色造成伤害后，你摸一张牌，该角色受到伤害后，你随机弃置一张手牌。你弃牌阶段弃置的牌均被该角色获得。该角色死亡时，若你的两个武将牌均明置，你暗置此武将牌。若该角色未死亡，则此武将牌被暗置前，取消之。
```js
fakezhiwei: {
		unique: true,
		audio: "zhiwei",
		inherit: "zhiwei",
		filter(event, player, name) {
			if (!game.hasPlayer(current => current != player)) {
				return false;
			}
			return (
				event.name == "showCharacter" &&
				event.toShow.some(name => {
					return get.character(name, 3).includes("fakezhiwei");
				})
			);
		},
		content() {
			"step 0";
			player
				.chooseTarget("请选择【至微】的目标", true, lib.filter.notMe)
				.set("ai", target => {
					var att = get.attitude(_status.event.player, target);
					if (att > 0) {
						return 1 + att;
					}
					return Math.random();
				})
				.set("prompt2", lib.translate.fakezhiwei_info);
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("fakezhiwei", target);
				player.storage.fakezhiwei_effect = target;
				player.addSkill("fakezhiwei_effect");
			}
		},
		onremove(player) {
			player.removeSkill("fakezhiwei_effect");
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				audio: "zhiwei",
				trigger: { player: "hideCharacterBefore" },
				filter(event, player) {
					return get.character(event.toHide, 3).includes("fakezhiwei");
				},
				forced: true,
				content() {
					trigger.cancel();
				},
				mark: "character",
				intro: { content: "已选择$" },
				group: ["fakezhiwei_draw", "fakezhiwei_discard", "fakezhiwei_gain", "fakezhiwei_clear"],
			},
			draw: {
				audio: "zhiwei",
				trigger: { global: "damageSource" },
				forced: true,
				filter(event, player) {
					return event.source == player.storage.fakezhiwei_effect;
				},
				logTarget: "source",
				content() {
					player.draw();
				},
			},
			discard: {
				audio: "zhiwei",
				trigger: { global: "damageEnd" },
				forced: true,
				filter(event, player) {
					return (
						event.player == player.storage.fakezhiwei_effect &&
						player.hasCard(card => {
							return _status.connectMode || lib.filter.cardDiscardable(card, player);
						}, "h")
					);
				},
				logTarget: "player",
				content() {
					player.chooseToDiscard("h", true);
				},
			},
			gain: {
				audio: "zhiwei",
				trigger: {
					player: "loseAfter",
					global: "loseAsyncAfter",
				},
				forced: true,
				filter(event, player) {
					if (event.type != "discard" || event.getlx === false || event.getParent("phaseDiscard").player != player || !player.storage.fakezhiwei_effect || !player.storage.fakezhiwei_effect.isIn()) {
						return false;
					}
					var evt = event.getl(player);
					return evt && evt.cards2.filterInD("d").length > 0;
				},
				logTarget(event, player) {
					return player.storage.fakezhiwei_effect;
				},
				content() {
					if (trigger.delay === false) {
						game.delay();
					}
					player.storage.fakezhiwei_effect.gain(trigger.getl(player).cards2.filterInD("d"), "gain2");
				},
			},
			clear: {
				audio: "zhiwei",
				trigger: {
					global: "die",
					player: ["hideCharacterEnd", "removeCharacterEnd"],
				},
				forced: true,
				filter(event, player) {
					if (event.name == "die") {
						return event.player == player.storage.fakezhiwei_effect;
					}
					if (event.name == "removeCharacter") {
						return get.character(event.toRemove, 3).includes("fakezhiwei");
					}
					return get.character(event.toHide, 3).includes("fakezhiwei");
				},
				content() {
					"step 0";
					player.removeSkill("fakezhiwei_effect");
					if (trigger.name != "die") {
						event.finish();
					}
					"step 1";
					if (get.character(player.name1, 3).includes("fakezhiwei")) {
						player.hideCharacter(0);
					}
					if (get.character(player.name2, 3).includes("fakezhiwei")) {
						player.hideCharacter(1);
					}
				},
			},
		},
	}
```

## gz_zongyu 名字:gz_zongyu 势力:shu

### zyqiao
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gzchengshang 名字:承赏
描述: 每回合限一次，当你使用指定了目标的牌结算完毕后，若你未因此牌造成过伤害，则你可以令其中一名目标角色交给你一张牌，若此牌和你使用的牌的花色和点数均相同，则你失去此技能。
```js
gzchengshang: {
		audio: "chengshang",
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			if (player.hasHistory("sourceDamage", evt => evt.card === event.card)) {
				return false;
			}
			return event.targets?.some(i => i.isIn() && i.countCards("he"));
		},
		usable: 1,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("gzchengshang"), (card, player, target) => {
					return get.event().getTrigger().targets.includes(target) && target.countCards("he");
				})
				.set("ai", target => {
					if (_status.event.player === target) {
						return 0;
					}
					var att = get.attitude(_status.event.player, target);
					if (att > 0) {
						return Math.sqrt(att) / 10;
					}
					return 5 - att;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const result = await event.targets[0]
				.chooseToGive(player, "he", true, `承赏：交给${get.translation(player)}一张牌，若为${get.translation(trigger.card.suit)}${get.strNumber(trigger.card.number)}则${get.translation(player)}失去此技能`)
				.set("ai", card => {
					const player = get.player(),
						source = get.event().getParent().player,
						cardx = get.event().getTrigger().card;
					if (get.suit(card) === get.suit(cardx) && get.number(card) === get.number(cardx)) {
						return 1145141919810 * get.sgn(-get.attitude(player, source));
					}
					return -get.value(card);
				})
				.forResult();
			if (result?.bool && result.cards?.length) {
				const card = result.cards[0];
				if (get.suit(card) === get.suit(trigger.card) && get.number(card) === get.number(trigger.card)) {
					await player.removeSkills("gzchengshang");
				}
			}
		},
	}
```

## gz_miheng 名字:祢衡 势力:qun

### fakekuangcai 名字:狂才
描述: 锁定技，你于回合内使用牌无距离和次数限制；弃牌阶段开始时，若你本回合内：未使用过牌，则你本回合手牌上限+1；使用过牌但未造成过伤害，则你本回合手牌上限-1。
```js
fakekuangcai: {
		inherit: "gzrekuangcai",
		content() {
			const goon = Boolean(player.getHistory("useCard").length);
			get.info("rekuangcai").change(player, goon ? -1 : 1);
			player.when({ global: "phaseAfter" }).step(async () => {
				get.info("rekuangcai").change(player, goon ? 1 : -1);
			});
		},
	}
```

### gzshejian 名字:舌箭
描述: 当你成为其他角色使用牌的唯一目标后，你可以弃置所有手牌。若如此做，你选择一项：⒈弃置其等量的牌。⒉若没有角色处于濒死状态，对其造成1点伤害。
```js
gzshejian: {
		audio: 2,
		preHidden: true,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			if (player == event.player || event.targets.length != 1 || !event.player.isIn()) {
				return false;
			}
			if (!event.player.countCards("he") && _status.event.dying) {
				return false;
			}
			var hs = player.getCards("h");
			if (hs.length == 0) {
				return false;
			}
			return hs.every(i => lib.filter.cardDiscardable(i, player, "gzshejian"));
		},
		check(event, player) {
			var target = event.player;
			if (get.damageEffect(target, player, player) <= 0) {
				return false;
			}
			if (
				target.hp <= (player.hasSkill("gzcongjian") ? 2 : 1) &&
				!target.getEquip("huxinjing") &&
				!game.hasPlayer(function (current) {
					return current != target && !current.isFriendOf(player);
				})
			) {
				return true;
			}
			if (player.hasSkill("lirang") && player.hasFriend()) {
				return true;
			}
			if ((event.card.name == "guohe" || event.card.name == "shunshou" || event.card.name == "zhujinqiyuan") && player.countCards("h") == 1) {
				return true;
			}
			if (
				player.countCards("h") < 3 &&
				!player.countCards("h", function (card) {
					return get.value(card, player) > 5;
				})
			) {
				return true;
			}
			if (player.hp <= event.getParent().baseDamage) {
				if (get.tag(event.card, "respondSha")) {
					if (player.countCards("h", { name: "sha" }) == 0) {
						return true;
					}
				} else if (get.tag(event.card, "respondShan")) {
					if (player.countCards("h", { name: "shan" }) == 0) {
						return true;
					}
				} else if (get.tag(event.card, "damage")) {
					if (event.card.name == "shuiyanqijunx") {
						return player.countCards("e") == 0;
					}
					return true;
				}
			}
			return false;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const hs = player.getCards("h"),
				target = trigger.player;
			const { cards } = await player.modedDiscard(hs).forResult();
			if (!target?.isIn()) {
				return;
			}
			let choiceList = [`弃置${get.translation(target)}${get.cnNumber(cards.length)}张牌`, `对${get.translation(target)}造成1点伤害`],
				choice = [0, 1];
			if (_status.event.dying) {
				choice.remove(1);
			}
			if (!cards?.length || target.countCards("he") < cards.length) {
				choice.remove(0);
			}
			if (!choice.length) {
				return;
			}
			const result =
				choice.length > 1
					? await player
							.chooseControl()
							.set("choiceList", choiceList)
							.set("ai", () => 1)
							.forResult()
					: {
							index: choice[0],
						};
			if (result.index == 0) {
				await player.discardPlayerCard(target, cards.length, true, "he");
			} else {
				await target.damage();
			}
		},
	}
```

## gz_fengxi 名字:gz_fengxi 势力:wu

### gzyusui 名字:玉碎
描述: 每回合限一次，当你成为其他势力的角色使用黑色牌的目标后，你可以失去1点体力，然后选择一项：①令其弃置X张手牌（X为其体力上限）；②令其失去Y点体力（Y为其的体力值减去你的体力值，不为正时不可选择）。
```js
gzyusui: {
		audio: "yusui",
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.player != player && event.player.isIn() && event.player.isEnemyOf(player) && get.color(event.card) == "black";
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
			if (Math.min(target.maxHp, target.countCards("h")) > 3) {
				return true;
			}
			return false;
		},
		usable: 1,
		preHidden: true,
		content() {
			"step 0";
			player.loseHp();
			event.target = trigger.player;
			"step 1";
			event.addIndex = 0;
			var list = [];
			if (target.maxHp > 0 && target.countCards("h") > 0) {
				list.push("令其弃置" + get.cnNumber(target.maxHp) + "张手牌");
			} else {
				event.addIndex++;
			}
			if (target.hp > player.hp) {
				list.push("令其失去" + get.cnNumber(target.hp - player.hp) + "点体力");
			}
			if (!list.length) {
				event.finish();
			} else if (list.length == 1) {
				event._result = { index: 0 };
			} else {
				player
					.chooseControl()
					.set("choiceList", list)
					.set("prompt", "令" + get.translation(target) + "执行一项")
					.set("ai", function () {
						var player = _status.event.player,
							target = _status.event.getParent().target;
						return target.hp - player.hp > Math.min(target.maxHp, target.countCards("h")) / 2 ? 1 : 0;
					});
			}
			"step 2";
			if (result.index + event.addIndex == 0) {
				target.chooseToDiscard(target.maxHp, true, "h");
			} else {
				target.loseHp(target.hp - player.hp);
			}
		},
	}
```

### gzboyan 名字:驳言
描述: `出牌阶段限一次，你可令一名其他角色将手牌摸至体力上限（至多摸五张），然后其本回合不能使用或打出手牌。${get.poptip("guozhan_zongheng")}：删去摸牌。`
```js
gzboyan: {
		audio: "boyan",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(target => lib.skill.gzboyan.filterTarget(null, player, target));
		},
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") < target.maxHp;
		},
		content() {
			"step 0";
			target.draw(Math.min(5, target.maxHp - target.countCards("h")));
			"step 1";
			target.addTempSkill("gzboyan_block");
			"step 2";
			if (target.isIn()) {
				player.chooseBool("纵横：是否令" + get.translation(target) + "获得【驳言】？").set("ai", function () {
					var evt = _status.event.getParent();
					return get.attitude(evt.player, evt.target) > 0;
				});
			} else {
				event.finish();
			}
			"step 3";
			if (result.bool) {
				target.addTempSkill("gzboyan_zongheng", { player: "phaseEnd" });
				game.log(player, "发起了", "#y纵横", "，令", target, "获得了技能", "#g【驳言】");
			}
		},
		derivation: "gzboyan_zongheng",
		subSkill: {
			zongheng: {
				enable: "phaseUse",
				usable: 1,
				filterTarget: lib.filter.notMe,
				content() {
					target.addTempSkill("gzboyan_block");
				},
				ai: {
					order: 4,
					result: {
						target(player, target) {
							if (
								target.countCards("h", "shan") &&
								!target.hasSkillTag("respondShan", true, null, true) &&
								player.countCards("h", function (card) {
									return get.tag(card, "respondShan") && get.effect(target, card, player, player) > 0 && player.getUseValue(card) > 0;
								})
							) {
								return -target.countCards("h");
							}
							return -0.5;
						},
					},
				},
			},
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
						return Math.min(5, target.maxHp - target.countCards("h"));
					}
					if (
						target.maxHp - target.countCards("h") == 1 &&
						target.countCards("h", "shan") &&
						!target.hasSkillTag("respondShan", true, null, true) &&
						player.countCards("h", function (card) {
							return get.tag(card, "respondShan") && get.effect(target, card, player, player) > 0 && player.getUseValue(card, null, true) > 0;
						})
					) {
						return -2;
					}
				},
			},
		},
	}
```

## gz_dengzhi 名字:邓芝 势力:shu

### gzjianliang 名字:简亮
描述: 摸牌阶段开始时，若你的手牌数为全场最少，则你可以令所有与你势力相同的角色各摸一张牌。
```js
gzjianliang: {
		audio: 2,
		trigger: { player: "phaseDrawBegin2" },
		frequent: true,
		preHidden: true,
		filter(event, player) {
			return player.isMinHandcard();
		},
		logTarget(event, player) {
			var isFriend;
			if (player.identity == "unknown") {
				var group = "shu";
				if (!player.wontYe("shu")) {
					group = null;
				}
				isFriend = function (current) {
					return current == player || current.identity == group;
				};
			} else {
				isFriend = function (target) {
					return target.isFriendOf(player);
				};
			}
			return game.filterPlayer(isFriend);
		},
		content() {
			"step 0";
			var list = game.filterPlayer(function (current) {
				return current.isFriendOf(player);
			});
			if (list.length == 1) {
				list[0].draw();
				event.finish();
			} else {
				game.asyncDraw(list);
			}
			"step 1";
			game.delayx();
		},
	}
```

### gzweimeng 名字:危盟
描述: `出牌阶段限一次，你可以获得一名其他角色的至多X张手牌，然后交给其等量的牌（X为你的体力值）。${get.poptip("guozhan_zongheng")}：X视为1。`
```js
gzweimeng: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countGainableCards(player, "h") > 0;
		},
		content() {
			"step 0";
			player.gainPlayerCard(target, "h", true, event.name == "gzweimeng" ? [1, player.hp] : 1);
			"step 1";
			if (result.bool && target.isIn()) {
				var num = result.cards.length,
					hs = player.getCards("he");
				if (!hs.length) {
					event.goto(3);
				} else if (hs.length <= num) {
					event._result = { bool: true, cards: hs };
				} else {
					player.chooseCard("he", true, "选择交给" + get.translation(target) + get.cnNumber(num) + "张牌", num);
				}
			} else {
				event.goto(3);
			}
			"step 2";
			player.give(result.cards, target);
			"step 3";
			if (target.isIn() && event.name == "gzweimeng") {
				player.chooseBool("纵横：是否令" + get.translation(target) + "获得【危盟】？").set("ai", function () {
					var evt = _status.event.getParent();
					return get.attitude(evt.player, evt.target) > 0;
				});
			} else {
				event.finish();
			}
			"step 4";
			if (result.bool) {
				target.addTempSkill("gzweimeng_zongheng", { player: "phaseEnd" });
				game.log(player, "发起了", "#y纵横", "，令", target, "获得了技能", "#g【危盟】");
			}
		},
		derivation: "gzweimeng_zongheng",
		subSkill: {
			zongheng: {
				inherit: "gzweimeng",
				ai: {
					order: 6,
					tag: {
						lose: 1,
						loseCard: 1,
						gain: 1,
					},
					result: {
						target: -1,
					},
				},
			},
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

## gz_re_nanhualaoxian 名字:gz_re_nanhualaoxian 势力:qun

### gzgongxiu 名字:共修
描述: 摸牌阶段，你可以少摸一张牌，然后选择一个与上次不同的选项：①令至多X名角色各摸一张牌。②令至多X名角色各弃置一张牌。（X为你的体力上限）
```js
gzgongxiu: {
		audio: "gongxiu",
		trigger: { player: "phaseDrawBegin2" },
		preHidden: true,
		filter(event, player) {
			return !event.numFixed && event.num > 0 && player.maxHp > 0;
		},
		content() {
			trigger.num--;
			player.addTempSkill("gzgongxiu2", "phaseDrawAfter");
		},
	}
```

### gztaidan 名字:太丹
描述: 锁定技，若你的防具栏为空且你的防具栏未被废除且场上没有角色装备【太平要术】，则你视为装备【太平要术】。
```js
gztaidan: {
		derivation: "taipingyaoshu",
		audio: "tianshu",
		init(player, skill) {
			player.addExtraEquip(skill, "taipingyaoshu", true, player => player.hasEmptySlot(2) && lib.card.taipingyaoshu && !game.hasPlayer(current => current.getEquip("taipingyaoshu")));
		},
		onremove(player, skill) {
			player.removeExtraEquip(skill);
		},
		locked: true,
		group: "gztaidan_taipingyaoshu",
	}
```

### gzjinghe_new 名字:经合
描述: 出牌阶段限一次，你可以选择一名角色，令其随机获得“写满技能的天书”中的一个技能直到你的下个回合开始。
```js
gzjinghe_new: {
		inherit: "gzjinghe",
		filter: () => true,
		filterCard: () => false,
		selectCard: -1,
		filterTarget: true,
		selectTarget: 1,
		usable: 1,
		async content(event, trigger, player) {
			const target = event.targets[0];
			const skill = get.info(event.name).derivation?.randomGet();
			if (!skill) {
				return;
			}
			const cardname = "gzrejinghe_" + skill;
			const videoId = lib.status.videoId++;
			lib.card[cardname] = {
				fullimage: true,
				image: "character:re_nanhualaoxian",
			};
			lib.translate[cardname] = get.translation(skill);
			game.broadcastAll(
				function (player, id, card) {
					ui.create.dialog(get.translation(player) + "发动了【经合】", [[card], "card"]).videoId = id;
				},
				player,
				videoId,
				game.createCard(cardname, " ", " ")
			);
			await game.delay(3);
			game.broadcastAll("closeDialog", videoId);
			player.addTempSkill("gzjinghe_new_clear", { player: "phaseBegin" });
			target.addAdditionalSkills("gzjinghe_new_" + player.playerid, skill);
			target.popup(skill);
		},
		subSkill: {
			clear: {
				charlotte: true,
				onremove(player) {
					game.countPlayer(current => current.removeAdditionalSkills("gzjinghe_new_" + player.playerid));
				},
			},
		},
	}
```

## gz_zhouyi 名字:gz_zhouyi 势力:wu

### gzzhukou 名字:逐寇
描述: 当你于一名角色的出牌阶段第一次造成伤害后，你可以摸X张牌（X为本回合你已使用的牌数且至多为5）。
```js
gzzhukou: {
		audio: "zhukou",
		trigger: { source: "damageSource" },
		preHidden: true,
		filter(event, player) {
			if (!player.getHistory("useCard").length) {
				return false;
			}
			var evt = event.getParent("phaseUse");
			if (!evt || !evt.player) {
				return false;
			}
			return (
				player
					.getHistory("sourceDamage", function (evtx) {
						return evtx.getParent("phaseUse") == evt;
					})
					.indexOf(event) == 0
			);
		},
		frequent: true,
		content() {
			player.draw(Math.min(player.getHistory("useCard").length, 5));
		},
	}
```

### gzduannian 名字:断念
描述: 出牌阶段结束时，若你有手牌，你可以弃置所有手牌，然后将手牌摸至体力上限。
```js
gzduannian: {
		audio: 2,
		trigger: { player: "phaseUseEnd" },
		preHidden: true,
		filter(event, player) {
			return (
				player.countCards("h") > 0 &&
				!player.hasCard(function (card) {
					return !lib.filter.cardDiscardable(card, player, "gzduannian");
				}, "h")
			);
		},
		check(event, player) {
			return (
				player.countCards("h", function (card) {
					return get.value(card) >= 6;
				}) <= Math.max(1, player.countCards("h") / 2)
			);
		},
		content() {
			"step 0";
			var cards = player.getCards("h", function (card) {
				return lib.filter.cardDiscardable(card, player, "gzduannian");
			});
			if (cards.length) {
				player.discard(cards);
			} else {
				event.finish();
			}
			"step 1";
			player.drawTo(player.maxHp);
		},
	}
```

### gzlianyou 名字:莲佑
描述: `你死亡时，可以选择一名其他角色。该角色获得技能${get.poptip("gzxinghuo")}。`
```js
gzlianyou: {
		trigger: { player: "die" },
		direct: true,
		forceDie: true,
		skillAnimation: true,
		animationColor: "fire",
		content() {
			"step 0";
			player
				.chooseTarget(lib.filter.notMe, get.prompt("gzlianyou"), "令一名其他角色获得〖兴火〗")
				.set("forceDie", true)
				.set("ai", function (target) {
					return 10 + get.attitude(_status.event.player, target) * (target.hasSkillTag("fireAttack", null, null, true) ? 2 : 1);
				});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("gzlianyou", target);
				target.addSkills("gzxinghuo");
				game.delayx();
			}
		},
		derivation: "gzxinghuo",
	}
```

## gz_re_xunchen 名字:gz_re_xunchen 势力:qun

### gzfenglve 名字:锋略
描述: `出牌阶段限一次，你可以和一名其他角色进行拼点。若你赢，其将区域内的两张牌交给你；若你输，你交给其一张牌。${get.poptip("guozhan_zongheng")}：交换描述中的“一张”和“两张”。`
```js
gzfenglve: {
		audio: "refenglve",
		derivation: "gzfenglve_zongheng",
		enable: "phaseUse",
		usable: 1,
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
		content() {
			"step 0";
			player.chooseToCompare(target);
			"step 1";
			if (result.bool) {
				if (!target.countCards("hej")) {
					event.goto(3);
				} else {
					event.giver = target;
					event.gainner = player;
					target.choosePlayerCard(target, true, "hej", 2, "交给" + get.translation(player) + "两张牌");
				}
			} else if (result.tie) {
				event.goto(3);
			} else {
				if (!player.countCards("he")) {
					event.goto(3);
				} else {
					event.giver = player;
					event.gainner = target;
					player.chooseCard(true, "he", "交给" + get.translation(target) + "一张牌");
				}
			}
			"step 2";
			if (result.bool) {
				event.giver.give(result.cards, event.gainner, "giveAuto");
			}
			"step 3";
			if (target.isIn()) {
				player.chooseBool("纵横：是否令" + get.translation(target) + "获得【锋略】？").set("ai", function () {
					var evt = _status.event.getParent();
					return get.attitude(evt.player, evt.target) > 0;
				});
			} else {
				event.finish();
			}
			"step 4";
			if (result.bool) {
				target.addTempSkill("gzfenglve_zongheng", { player: "phaseEnd" });
				game.log(player, "发起了", "#y纵横", "，令", target, "获得了技能", "#g【锋略】");
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
								return card.number >= 10;
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
	}
```

### gzanyong 名字:暗涌
描述: 每回合限一次。当己方角色对其他角色造成伤害时，你可令伤害值翻倍。然后若受伤角色：武将牌均明置，则你失去1点体力并失去〖暗涌〗；有一张明置的武将牌，则你弃置两张手牌。
```js
gzanyong: {
		audio: "anyong",
		trigger: { global: "damageBegin1" },
		usable: 1,
		filter(event, player) {
			return event.source && event.player != event.source && event.source.isFriendOf(player) && event.player.isIn();
		},
		check(event, player) {
			if (get.attitude(player, event.player) > 0) {
				return false;
			}
			if (
				event.player.hasSkillTag("filterDamage", null, {
					player: event.source,
					card: event.card,
				})
			) {
				return false;
			}
			if (event.player.isUnseen()) {
				return true;
			}
			if (event.player.hp > event.num && event.player.hp <= event.num * 2) {
				return player.hp > 1 || event.player.isUnseen(2);
			}
			return false;
		},
		logTarget: "player",
		preHidden: true,
		content() {
			trigger.num *= 2;
			if (!trigger.player.isUnseen(2)) {
				player.loseHp();
				player.removeSkill("gzanyong");
			} else if (!trigger.player.isUnseen()) {
				player.chooseToDiscard("h", 2, true);
			}
		},
	}
```

## gz_lvlingqi 名字:gz_lvlingqi 势力:qun

### guowu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gzshenwei 名字:神威
描述: `${get.poptip("guozhan_mainSkill")}。①此武将牌减少半个阴阳鱼。②摸牌阶段，若你的手牌数为全场最多，则你额外摸两张牌。③你的手牌上限+2。`
```js
gzshenwei: {
		audio: "llqshenwei",
		mainSkill: true,
		init(player) {
			if (player.checkMainSkill("gzshenwei")) {
				player.removeMaxHp();
			}
		},
		trigger: { player: "phaseDrawBegin2" },
		forced: true,
		locked: false,
		filter: (event, player) => !event.numFixed && player.isMaxHandcard(),
		preHidden: true,
		content() {
			trigger.num += 2;
		},
		mod: {
			maxHandcard: (player, num) => num + 2,
		},
	}
```

### gzzhuangrong 名字:妆戎
描述: `出牌阶段限一次。你可弃置一张锦囊牌并获得${get.poptip("gz_wushuang")}至出牌阶段结束。`
```js
gzzhuangrong: {
		audio: "zhuangrong",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return (
				!player.hasSkill("gz_wushuang") &&
				player.hasCard(function (card) {
					return get.type2(card, player) == "trick";
				}, "h")
			);
		},
		filterCard(card, player) {
			return get.type2(card, player) == "trick";
		},
		content() {
			player.addTempSkills("gz_wushuang", "phaseUseEnd");
		},
		derivation: "gz_wushuang",
	}
```

## gz_dc_yanghu 名字:gz_dc_yanghu 势力:wei

### gzdeshao 名字:德劭
描述: 每回合限X次（X为你的体力值）。其他角色使用黑色牌指定你为唯一目标后，若其暗置的武将牌数大于等于你，则你可以弃置其一张牌。
```js
gzdeshao: {
		audio: "dcdeshao",
		trigger: { target: "useCardToTargeted" },
		usable(skill, player) {
			return player.hp;
		},
		preHidden: true,
		countUnseen(player) {
			let num = 0;
			if (player.isUnseen(0)) {
				num++;
			}
			if (player.isUnseen(1)) {
				num++;
			}
			return num;
		},
		filter(event, player) {
			if (player == event.player || event.targets.length != 1 || get.color(event.card) != "black") {
				return false;
			}
			if (lib.skill.gzdeshao.countUnseen(event.player) < lib.skill.gzdeshao.countUnseen(player)) {
				return false;
			}
			return event.player.countDiscardableCards(player, "he");
		},
		check(event, player) {
			return get.effect(event.player, { name: "guohe_copy2" }, player, player) > 0;
		},
		logTarget: "player",
		content() {
			player.discardPlayerCard(trigger.player, true, "he");
		},
	}
```

### gzmingfa 名字:明伐
描述: 出牌阶段限一次，你可以选择一名敌方角色。该角色的下个回合结束时，若其手牌数：小于你，你对其造成1点伤害并获得其一张手牌；大于你，你摸X张牌（X为你与其的手牌数之差且至多为5）。
```js
gzmingfa: {
		audio: "dcmingfa",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player != target && target.isEnemyOf(player);
		},
		content() {
			player.markAuto("gzmingfa", targets);
			game.delayx();
		},
		onremove: true,
		ai: {
			order: 1,
			result: { target: -1 },
		},
		group: "gzmingfa_effect",
		subSkill: {
			effect: {
				audio: "dcmingfa",
				trigger: { global: "phaseEnd" },
				forced: true,
				filter(event, player) {
					return player.getStorage("gzmingfa").includes(event.player);
				},
				logTarget: "player",
				content() {
					var target = trigger.player;
					player.unmarkAuto("gzmingfa", [target]);
					if (target.isIn()) {
						var num = player.countCards("h") - target.countCards("h");
						if (num > 0) {
							target.damage();
							player.gainPlayerCard(target, true, "h");
						} else if (num < 0) {
							player.draw(Math.min(5, -num));
						}
					}
				},
			},
		},
	}
```

## gz_jun_caocao 名字:君曹操 势力:wei

### jianan 名字:建安
描述: `君主技，只要此武将牌处于明置状态，你便拥有“${get.poptip({
		id: "jianan_wuziliangjiangdao",
		name: "五子良将纛",
		type: "character",
		info: `魏势力角色的准备阶段，其可以弃置一张牌。若如此做，其选择一张暗置的武将牌（若没有，则选择一张暗置），然后获得下列技能中的一项（场上所有角色已有的技能无法选择）且不能明置选择的武将牌直到你的下个回合开始：${get.poptip("new_retuxi")}${get.poptip("qiaobian")}${get.poptip("gz_xiaoguo")}${get.poptip("gz_jieyue")}${get.poptip("gz_duanliang")}。`,
	})}”。`
```js
jianan: {
		audio: 1,
		unique: true,
		forceunique: true,
		derivation: ["wuziliangjiangdao", "new_retuxi", "qiaobian", "gz_xiaoguo", "gz_jieyue", "gz_duanliang"],
		lordSkill: true,
		global: ["wuziliangjiangdao", "g_jianan"],
		init(player) {
			player.markSkill("wuziliangjiangdao");
		},
	}
```

### huibian 名字:挥鞭
描述: 出牌阶段限一次，你可以选择一名魏势力角色和另一名已受伤的魏势力角色。若如此做，你对前者造成1点伤害，然后其摸两张牌，然后后者回复1点体力。
```js
huibian: {
		enable: "phaseUse",
		audio: 2,
		usable: 1,
		filter(event, player) {
			return (
				game.countPlayer(function (current) {
					return current.identity == "wei";
				}) > 1 &&
				game.hasPlayer(function (current) {
					return current.isDamaged() && current.identity == "wei";
				})
			);
		},
		filterTarget(card, player, target) {
			if (ui.selected.targets.length) {
				return target.isDamaged() && target.identity == "wei";
			}
			return target.identity == "wei";
		},
		selectTarget: 2,
		multitarget: true,
		targetprompt: ["受伤摸牌", "回复体力"],
		async content(event, trigger, player) {
			const {
				targets: [target1, target2],
			} = event;
			await target1.damage(player);
			if (target1.isAlive()) {
				await target1.draw(2);
			}
			await target2.recover();
		},
		ai: {
			threaten: 1.2,
			order: 9,
			result: {
				target(player, target) {
					if (ui.selected.targets.length) {
						return 1;
					}
					if (get.damageEffect(target, player, player) > 0) {
						return 2;
					}
					if (target.hp > 2) {
						return 1;
					}
					if (target.hp == 1) {
						return -1;
					}
					return 0.1;
				},
			},
		},
	}
```

### gzzongyu 名字:总御
描述: 当【六龙骖驾】进入其他角色的装备区后，你可以将你装备区内所有坐骑牌（至少一张）与【六龙骖驾】交换位置。锁定技，当你使用坐骑牌后，若场上或弃牌堆中有【六龙骖驾】，则将【六龙骖驾】置入你的装备区。
```js
gzzongyu: {
		audio: 2,
		derivation: "liulongcanjia",
		unique: true,
		forceunique: true,
		group: "gzzongyu_others",
		global: "gzzongyu_player",
		ai: {
			threaten: 1.2,
		},
		subSkill: {
			others: {
				trigger: { global: "equipAfter" },
				filter(event, player) {
					if (event.player == player || !player.countCards("e", { subtype: ["equip3", "equip4"] })) {
						return false;
					}
					return event.card.name == "liulongcanjia";
				},
				async cost(event, trigger, player) {
					const target = trigger.player;
					event.result = await player
						.chooseBool("是否发动【总御】，与" + get.translation(target) + "交换装备区内坐骑牌？")
						.set("ai", () => {
							const { player, target } = get.event();
							if (get.attitude(player, target) <= 0) {
								return player.countCards("e", { subtype: ["equip4", "equip4"] }) < 2;
							}
							return true;
						})
						.set("target", target)
						.setHiddenSkill("gzzongyu")
						.forResult();
					event.result.targets = [target];
				},
				async content(event, trigger, player) {
					const target = trigger.player,
						cards1 = player.getCards("e", { subtype: ["equip3", "equip4"] }),
						cards2 = trigger.player.getCards("e", { name: "liulongcanjia" });
					const next = game.createEvent("swapEquip");
					next.player = player;
					next.target = target;
					next.cards1 = cards1;
					next.cards2 = cards2;
					next.setContent(async (event, trigger, player) => {
						const { target, cards1, cards2 } = event;
						game.log(player, "和", target, "交换了装备区中的坐骑牌");
						await game
							.loseAsync({
								player: player,
								target: target,
								cards1: cards1,
								cards2: cards2,
							})
							.setContent("swapHandcardsx");
						for (let i of cards2) {
							if (get.position(i, true) == "o") {
								await player.equip(i);
							}
						}
						for (let i of cards1) {
							if (get.position(i, true) == "o") {
								await target.equip(i);
							}
						}
					});
					await next;
				},
			},
			player: {
				audio: "gzzongyu",
				forceaudio: true,
				trigger: { player: "equipAfter" },
				forced: true,
				filter(event, player) {
					// if (!player.hasSkill("gzzongyu")) return false;
					// 村规
					if (!player.hasSkill("gzzongyu", null, null, false)) {
						return false;
					}
					if (!["equip3", "equip4"].includes(get.subtype(event.card))) {
						return false;
					}
					for (var i = 0; i < ui.discardPile.childElementCount; i++) {
						if (ui.discardPile.childNodes[i].name == "liulongcanjia") {
							return true;
						}
					}
					return game.hasPlayer(function (current) {
						return current != player && current.countCards("ej", "liulongcanjia");
					});
				},
				content() {
					var list = [];
					for (var i = 0; i < ui.discardPile.childElementCount; i++) {
						if (ui.discardPile.childNodes[i].name == "liulongcanjia") {
							list.add(ui.discardPile.childNodes[i]);
						}
					}
					game.countPlayer(function (current) {
						if (current != player) {
							var ej = current.getCards("ej", "liulongcanjia");
							if (ej.length) {
								list.addArray(ej);
							}
						}
					});
					if (list.length) {
						var card = list.randomGet();
						var owner = get.owner(card);
						if (owner) {
							player.line(owner, "green");
							owner.$give(card, player);
						} else {
							player.$gain(card, "log");
						}
						player.equip(card);
					}
				},
			},
		},
	}
```

## gz_liaohua 名字:gz_liaohua 势力:shu

### gzdangxian 名字:当先
描述: 锁定技，①当你首次明置此武将牌时，你获得一枚“先驱”标记；②同势力角色的回合开始时，若其有“先驱”标记，你令其获得一个额外的出牌阶段。
```js
gzdangxian: {
		trigger: { global: "phaseBegin" },
		forced: true,
		preHidden: true,
		audio: "dangxian",
		audioname2: {
			guansuo: "dangxian_guansuo",
		},
		filter(event, player) {
			return event.player.isFriendOf(player) && event.player.hasMark("xianqu_mark");
		},
		async content(event, trigger, player) {
			trigger.phaseList.splice(trigger.num, 0, `phaseUse|${event.name}`);
		},
		group: "gzdangxian_show",
		global: "gzdangxian_ai",
		subSkill: {
			ai: {
				ai: {
					keepXianqu: true,
					skillTagFilter(player, tag, arg) {
						if (player.countMark("xianqu_mark") > 1) {
							return false;
						}
						if (!game.hasPlayer(current => current.isFriendOf(player) && current.hasSkill("gzdangxian"))) {
							return false;
						}
					},
				},
			},
			show: {
				audio: "dangxian",
				trigger: { player: "showCharacterAfter" },
				forced: true,
				filter(event, player) {
					return (
						event.toShow.some(name => {
							return get.character(name, 3).includes("gzdangxian");
						}) && !player.storage.gzdangxian_draw
					);
				},
				content() {
					player.storage.gzdangxian_draw = true;
					player.addMark("xianqu_mark", 1);
				},
			},
		},
	}
```

## gz_zhugejin 名字:gz_zhugejin 势力:wu

### gzhuanshi 名字:缓释
描述: 一名己方角色的判定牌生效前，你可打出一张牌代替之。
```js
gzhuanshi: {
		audio: "huanshi",
		trigger: { global: "judge" },
		popup: false,
		preHidden: true,
		filter(event, player) {
			return player.countCards("hes") > 0 && event.player.isFriendOf(player);
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
					if (attitude == 0 || result == 0) {
						return 0;
					}
					if (attitude > 0) {
						return result - get.value(card) / 2;
					} else {
						return -result - get.value(card) / 2;
					}
				})
				.set("judging", trigger.player.judging[0])
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

### gzhongyuan 名字:弘援
描述: ①出牌阶段限一次。你可以令一张没有「合纵」标签的卡牌视为拥有「合纵」标签直到本回合结束。②当你即将因合纵效果摸牌时，你可放弃摸牌，并令一名己方角色摸等量的牌。
```js
gzhongyuan: {
		audio: "hongyuan",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.hasCard(function (card) {
				return lib.skill.gzhongyuan.filterCard(card);
			}, "h");
		},
		filterCard(card) {
			return !card.hasTag("lianheng") && !card.hasGaintag("_lianheng");
		},
		position: "h",
		discard: false,
		lose: false,
		content() {
			cards[0].addGaintag("_lianheng");
			player.addTempSkill("gzhongyuan_clear");
		},
		check(card) {
			return 4.5 - get.value(card);
		},
		group: "gzhongyuan_draw",
		preHidden: true,
		ai: { order: 2, result: { player: 1 } },
		subSkill: {
			clear: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("_lianheng");
				},
			},
			draw: {
				audio: "hongyuan",
				trigger: { player: "drawBefore" },
				direct: true,
				filter(event, player) {
					return (
						event.getParent().name == "_lianheng" &&
						game.hasPlayer(function (current) {
							return current != player && current.isFriendOf(player);
						})
					);
				},
				content() {
					"step 0";
					player
						.chooseTarget(get.prompt("gzhongyuan"), "将摸牌（" + get.cnNumber(trigger.num) + "张）转移给一名同势力角色", function (card, player, target) {
							return target != player && target.isFriendOf(player);
						})
						.setHiddenSkill("gzhongyuan")
						.set("ai", () => -1);
					"step 1";
					if (result.bool) {
						var target = result.targets[0];
						player.logSkill("gzhongyuan", target);
						trigger.cancel();
						target.draw(trigger.num);
					}
				},
			},
		},
	}
```

### gzmingzhe 名字:明哲
描述: 你的回合外，当你使用或打出红色手牌，或失去装备区内的红色装备牌时，你可摸一张牌。
```js
gzmingzhe: {
		audio: "mingzhe",
		trigger: {
			player: ["loseAfter", "useCard", "respond"],
			global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
		},
		filter(event, player) {
			if (player == _status.currentPhase) {
				return false;
			}
			if (event.name == "useCard" || event.name == "respond") {
				return (
					get.color(event.card, false) == "red" &&
					player.hasHistory("lose", function (evt) {
						return (evt.relatedEvent || evt.getParent()) == event && evt.hs && evt.hs.length > 0;
					})
				);
			}
			var evt = event.getl(player);
			if (!evt || !evt.es || !evt.es.length) {
				return false;
			}
			for (var i of evt.es) {
				if (get.color(i, player) == "red") {
					return true;
				}
			}
			return false;
		},
		frequent: true,
		preHidden: true,
		content() {
			player.draw();
		},
	}
```

## gz_yangxiu 名字:gz_yangxiu 势力:wei

### gzdanlao
描述: 当你成为锦囊牌的目标后，若此牌的目标数大于1，则你可以摸一张牌，令此牌对你无效。
```js
gzdanlao: {
		audio: "danlao",
		inherit: "danlao",
		preHidden: true,
		filter(event, player) {
			return get.type2(event.card) == "trick" && event.targets?.length > 1;
		},
	}
```

### gzjilei
描述: 当你受到有来源的伤害后，你可以声明一种牌的类别。若如此做，你令伤害来源不能使用、打出或弃置此类别的手牌直到回合结束。
```js
gzjilei: {
		inherit: "jilei",
		preHidden: true,
		content() {
			"step 0";
			player
				.chooseControl("basic", "trick", "equip", "cancel2", function () {
					var source = _status.event.source;
					if (get.attitude(_status.event.player, source) > 0) {
						return "cancel2";
					}
					var list = ["basic", "trick", "equip"].filter(function (name) {
						return !source.storage.jilei2 || !source.storage.jilei2.includes(name);
					});
					if (!list.length) {
						return "cancel2";
					}
					if (
						list.includes("trick") &&
						source.countCards("h", function (card) {
							return get.type(card, null, source) == "trick" && source.hasValueTarget(card);
						}) > 1
					) {
						return "trick";
					}
					return list[0];
				})
				.set("prompt", get.prompt2("jilei", trigger.source))
				.set("source", trigger.source)
				.setHiddenSkill("gzjilei");
			"step 1";
			if (result.control != "cancel2") {
				player.logSkill("gzjilei", trigger.source);
				player.chat(get.translation(result.control) + "牌");
				game.log(player, "声明了", "#y" + get.translation(result.control) + "牌");
				trigger.source.addTempSkill("jilei2");
				trigger.source.storage.jilei2.add(result.control);
				trigger.source.updateMarks("jilei2");
				game.delayx();
			}
		},
	}
```

## gz_zumao 名字:gz_zumao 势力:wu

### yinbing
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### juedi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_fuwan 名字:gz_fuwan 势力:qun

### gzmoukui 名字:谋溃
描述: `当你使用【杀】指定目标后，你可以选择一项：①摸一张牌；②弃置该角色的一张牌；③${get.poptip("rule_beishui")}：若此【杀】未对其造成过伤害，则该角色弃置你的一张牌。`
```js
gzmoukui: {
		audio: "moukui",
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return event.card?.name == "sha";
		},
		direct: true,
		preHidden: true,
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
				.set("choiceList", ["摸一张牌", "弃置" + get.translation(trigger.target) + "的一张牌", "背水！依次执行以上两项。然后若此【杀】未对其造成过伤害，则其弃置你的一张牌。"])
				.set("prompt", get.prompt(event.name, trigger.target))
				.setHiddenSkill(event.name);
			"step 1";
			if (result.control != "cancel2") {
				var target = trigger.target;
				player.logSkill(event.name, target);
				if (result.control == "选项一" || result.control == "背水！") {
					player.draw();
				}
				if (result.control == "选项二" || result.control == "背水！") {
					player.discardPlayerCard(target, true, "he");
				}
				if (result.control == "背水！") {
					player.addTempSkill(event.name + "_effect");
					var evt = trigger.getParent();
					if (!evt[event.name + "_effect"]) {
						evt[event.name + "_effect"] = [];
					}
					evt[event.name + "_effect"].add(target);
				}
			}
		},
		subSkill: {
			effect: {
				charlotte: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return event.gzmoukui_effect?.some(current => {
						return current.isIn() && !current.hasHistory("damage", evt => evt.card == event.card);
					});
				},
				forced: true,
				popup: false,
				content() {
					var list = trigger.gzmoukui_effect
						.filter(current => {
							return current.isIn() && !current.hasHistory("damage", evt => evt.card == trigger.card);
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

## gz_chendao 名字:gz_chendao 势力:shu

### drlt_wanglie
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_tw_tianyu 名字:gz_tw_tianyu 势力:wei

### gzzhenxi 名字:震袭
描述: `当你使用【杀】指定目标后，你可以选择一项：1.弃置目标角色一张牌；2.将一张♦非锦囊牌当做【乐不思蜀】或♣非锦囊牌当做【兵粮寸断】对目标角色使用；3.${get.poptip("rule_beishui")}：若其有暗置的武将牌且你的武将牌均明置，则你可以依次执行这两项。`
```js
gzzhenxi: {
		audio: "twzhenxi",
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			if (
				event.target.countCards("he") ||
				player.hasCard(function (card) {
					return get.suit(card) == "diamond" && get.type2(card) != "trick" && player.canUse(get.autoViewAs({ name: "lebu" }, [card]), event.target);
				}, "he") ||
				player.hasCard(function (card) {
					return get.suit(card) == "club" && get.type2(card) != "trick" && player.canUse(get.autoViewAs({ name: "bingliang" }, [card]), event.target, false);
				}, "he")
			) {
				return true;
			}
			return false;
		},
		check(event, player) {
			return get.attitude(player, event.target) < 0;
		},
		direct: true,
		content() {
			"step 0";
			var target = trigger.target;
			event.target = target;
			var list = [],
				choiceList = ["弃置" + get.translation(target) + "一张牌", "将一张♦非锦囊牌当做【乐不思蜀】或♣非锦囊牌当做【兵粮寸断】对" + get.translation(target) + "使用", "背水！若其有暗置的武将牌且你的武将牌均明置，你依次执行上述两项"];
			if (target.countDiscardableCards(player, "he")) {
				list.push("选项一");
			} else {
				choiceList[0] = '<span style="opacity:0.5">' + choiceList[0] + "</span>";
			}
			if (
				player.countCards("he", function (card) {
					return get.suit(card) == "diamond" && get.type2(card) != "trick" && player.canUse(get.autoViewAs({ name: "lebu" }, [card]), target);
				}) ||
				player.countCards("he", function (card) {
					return get.suit(card) == "club" && get.type2(card) != "trick" && player.canUse(get.autoViewAs({ name: "bingliang" }, [card]), target);
				})
			) {
				list.push("选项二");
			} else {
				choiceList[1] = '<span style="opacity:0.5">' + choiceList[1] + "</span>";
			}
			if (target.isUnseen(2) && !player.isUnseen(2)) {
				list.push("背水！");
			} else {
				choiceList[2] = '<span style="opacity:0.5">' + choiceList[2] + "</span>";
			}
			player
				.chooseControl(list, "cancel2")
				.set("prompt", get.prompt("gzzhenxi", target))
				.set("choiceList", choiceList)
				.set("ai", function () {
					var player = _status.event.player,
						trigger = _status.event.getTrigger(),
						list = _status.event.list;
					if (get.attitude(player, trigger.target) > 0) {
						return "cancel2";
					}
					if (list.includes("背水！")) {
						return "背水！";
					}
					if (list.includes("选项二")) {
						return "选项二";
					}
					return "选项一";
				})
				.set("list", list)
				.setHiddenSkill("gzzhenxi");
			"step 1";
			if (result.control == "cancel2") {
				event.finish();
				return;
			}
			player.logSkill("gzzhenxi", target);
			event.choice = result.control;
			if (event.choice != "选项二" && target.countDiscardableCards(player, "he")) {
				player.discardPlayerCard(target, "he", true);
			}
			"step 2";
			if (
				event.choice != "选项一" &&
				(player.hasCard(function (card) {
					return get.suit(card) == "diamond" && get.type2(card) != "trick" && player.canUse(get.autoViewAs({ name: "lebu" }, [card]), target);
				}, "he") ||
					player.hasCard(function (card) {
						return get.suit(card) == "club" && get.type2(card) != "trick" && player.canUse(get.autoViewAs({ name: "bingliang" }, [card]), target, false);
					}, "he"))
			) {
				var next = game.createEvent("gzzhenxi_use");
				next.player = player;
				next.target = target;
				next.setContent(lib.skill.gzzhenxi.contentx);
			}
		},
		ai: { unequip_ai: true },
		contentx() {
			"step 0";
			player.chooseCard({
				position: "hes",
				forced: true,
				prompt: "震袭",
				prompt2: "将一张♦非锦囊牌当做【乐不思蜀】或♣非锦囊牌当做【兵粮寸断】对" + get.translation(target) + "使用",
				filterCard(card, player) {
					if (get.itemtype(card) != "card" || get.type2(card) == "trick" || !["diamond", "club"].includes(get.suit(card))) {
						return false;
					}
					var cardx = { name: get.suit(card) == "diamond" ? "lebu" : "bingliang" };
					return player.canUse(get.autoViewAs(cardx, [card]), _status.event.getParent().target, false);
				},
			});
			"step 1";
			if (result.bool) {
				player.useCard({ name: get.suit(result.cards[0], player) == "diamond" ? "lebu" : "bingliang" }, target, result.cards);
			}
		},
	}
```

### gzjiansu 名字:俭素
描述: `${get.poptip("guozhan_viceSkill")}。此武将牌减少半个阴阳鱼。①当你于回合外得到牌后，你可以展示这些牌，称为“俭”。②出牌阶段开始时，你可以弃置任意张“俭”，令一名体力值不大于X的角色回复1点体力（X为你以此法弃置的牌数）。`
```js
gzjiansu: {
		init(player) {
			if (player.checkViceSkill("gzjiansu") && !player.viceChanged) {
				player.removeMaxHp();
			}
		},
		viceSkill: true,
		audio: 2,
		trigger: {
			player: "gainAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			if (player == _status.currentPhase) {
				return false;
			}
			return event.getg(player).length;
		},
		frequent: true,
		group: "gzjiansu_use",
		preHidden: ["gzjiansu_use"],
		content() {
			player.showCards(trigger.getg(player), get.translation(player) + "发动了【俭素】");
			player.addGaintag(trigger.getg(player), "gzjiansu_tag");
			player.markSkill("gzjiansu");
		},
		intro: {
			mark(dialog, content, player) {
				var hs = player.getCards("h", function (card) {
					return card.hasGaintag("gzjiansu_tag");
				});
				if (hs.length) {
					dialog.addSmall(hs);
				} else {
					dialog.addText("无已展示手牌");
				}
			},
			content(content, player) {
				var hs = player.getCards("h", function (card) {
					return card.hasGaintag("gzjiansu_tag");
				});
				if (hs.length) {
					return get.translation(hs);
				} else {
					return "无已展示手牌";
				}
			},
		},
		subSkill: {
			use: {
				audio: "gzjiansu",
				trigger: { player: "phaseUseBegin" },
				filter(event, player) {
					var num = player.countCards("h", function (card) {
						return card.hasGaintag("gzjiansu_tag");
					});
					return (
						num > 0 &&
						game.hasPlayer(function (current) {
							return current.isDamaged() && current.getDamagedHp() <= num;
						})
					);
				},
				direct: true,
				content() {
					"step 0";
					player
						.chooseCardTarget({
							prompt: get.prompt("gzjiansu"),
							prompt2: "弃置任意张“俭”，令一名体力值不大于你以此法弃置的牌数的角色回复1点体力",
							filterCard(card) {
								return get.itemtype(card) == "card" && card.hasGaintag("gzjiansu_tag");
							},
							selectCard: [1, Infinity],
							filterTarget(card, player, target) {
								return target.isDamaged();
							},
							filterOk() {
								return ui.selected.targets.length && ui.selected.targets[0].hp <= ui.selected.cards.length;
							},
							ai1(card) {
								if (ui.selected.targets.length && ui.selected.targets[0].hp <= ui.selected.cards.length) {
									return 0;
								}
								return 6 - get.value(card);
							},
							ai2(target) {
								var player = _status.event.player;
								return get.recoverEffect(target, player, player);
							},
							allowChooseAll: true,
						})
						.setHiddenSkill("gzjiansu_use");
					"step 1";
					if (result.bool) {
						var target = result.targets[0],
							cards = result.cards;
						player.logSkill("gzjiansu_use", target);
						player.discard(cards);
						target.recover();
					}
				},
			},
		},
	}
```

## gz_tw_liufuren 名字:gz_tw_liufuren 势力:qun

### gzzhuidu 名字:追妒
描述: 出牌阶段限一次。当你造成伤害时，你可以令受伤角色选择一项：1.此伤害+1；2.弃置装备区里的所有牌。若该角色为女性，则你可以弃置一张牌，改为令其选择两项。
```js
gzzhuidu: {
		audio: "twzhuidu",
		trigger: { source: "damageBegin3" },
		filter(event, player) {
			return player.isPhaseUsing();
		},
		check(event, player) {
			return get.attitude(player, event.player) < 0;
		},
		usable: 1,
		logTarget: "player",
		content() {
			"step 0";
			var target = trigger.player;
			event.target = target;
			if (target.hasSex("female") && target.countCards("e") > 0) {
				player.chooseToDiscard("he", "追妒：是否弃置一张牌并令其执行两项？").set("ai", function (card) {
					return 8 - get.value(card);
				});
			} else {
				event.goto(2);
			}
			"step 1";
			if (result.bool) {
				event._result = { control: "我全都要！" };
				event.goto(3);
			}
			"step 2";
			if (target.countCards("e") > 0) {
				target
					.chooseControl()
					.set("prompt", "追妒：请选择一项")
					.set("choiceList", ["令" + get.translation(player) + "此次对你造成的伤害+1", "弃置装备区里的所有牌"])
					.set("ai", function () {
						var player = _status.event.player,
							cards = player.getCards("e");
						if (player.hp <= 2) {
							return 1;
						}
						if (get.value(cards) <= 7) {
							return 1;
						}
						return 0;
					});
			} else {
				event._result = { control: "选项一" };
			}
			"step 3";
			player.line(target);
			if (result.control != "选项二") {
				trigger.num++;
			}
			if (result.control != "选项一") {
				target.chooseToDiscard(target.countCards("e"), true, "e");
			}
		},
	}
```

### gzshigong 名字:示恭
描述: 限定技。当你于回合外进入濒死状态时，你可以移除副将，然后令当前回合角色选择一项：1.获得你以此法移除的副将武将牌上的一个没有技能标签的技能，然后令你将体力值回复至体力上限；2.令你将体力值回复至1点。
```js
gzshigong: {
		audio: "twshigong",
		trigger: { player: "dying" },
		filter(event, player) {
			return _status.currentPhase && _status.currentPhase != player && _status.currentPhase.isIn() && player.hasViceCharacter() && player.hp <= 0;
		},
		skillAnimation: true,
		animationColor: "gray",
		limited: true,
		logTarget: () => _status.currentPhase,
		check(event, player) {
			if (
				player.countCards("h", function (card) {
					var mod2 = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
					if (mod2 != "unchanged") {
						return mod2;
					}
					var mod = game.checkMod(card, player, event.player, "unchanged", "cardSavable", player);
					if (mod != "unchanged") {
						return mod;
					}
					var savable = get.info(card).savable;
					if (typeof savable == "function") {
						savable = savable(card, player, event.player);
					}
					return savable;
				}) >=
				1 - event.player.hp
			) {
				return false;
			}
			return true;
		},
		content() {
			"step 0";
			var target = _status.currentPhase;
			event.target = target;
			player.awakenSkill("gzshigong");
			var list = lib.character[player.name2][3].filter(function (skill) {
				return get.skillCategoriesOf(skill, player).length == 0;
			});
			if (!list.length) {
				event._result = { control: "cancel2" };
				event.goto(2);
			} else {
				event.list = list;
			}
			player.removeCharacter(1);
			"step 1";
			target
				.chooseControl(event.list, "cancel2")
				.set(
					"choiceList",
					event.list.map(i => {
						return '<div class="skill">【' + get.translation(lib.translate[i + "_ab"] || get.translation(i).slice(0, 2)) + "】</div><div>" + get.skillInfoTranslation(i, _status.currentPhase, false) + "</div>";
					})
				)
				.set("displayIndex", false)
				.set("ai", function () {
					if (get.attitude(_status.event.player, _status.event.getParent().player) > 0) {
						return 0;
					}
					return [0, 1].randomGet();
				})
				.set("prompt", get.translation(player) + "对你发动了【示恭】")
				.set("prompt2", "获得一个技能并令其将体力回复至体力上限；或点击“取消”，令其将体力值回复至1点。");
			"step 2";
			if (result.control == "cancel2") {
				player.recover(1 - player.hp);
				event.finish();
			} else {
				target.addSkills(result.control);
				target.line(player);
				player.recover(player.maxHp - player.hp);
			}
		},
	}
```

## gz_old_huaxiong 名字:华雄 势力:qun

### gzyaowu 名字:耀武
描述: 限定技。当你造成伤害后，你可以明置此武将牌，然后你加2点体力上限并回复2点体力，修改〖恃勇〗，且当你死亡后，所有与你势力相同的角色失去1点体力。
```js
gzyaowu: {
		audio: "new_reyaowu",
		limited: true,
		trigger: { source: "damageSource" },
		filter(event, player) {
			if (player.isUnseen(0) && lib.character[player.name1][3].includes("gzyaowu")) {
				return true;
			}
			if (player.isUnseen(1) && lib.character[player.name2][3].includes("gzyaowu")) {
				return true;
			}
			return false;
		},
		skillAnimation: true,
		animationColor: "fire",
		check(event, player) {
			return player.isDamaged() || player.hp <= 2;
		},
		content() {
			player.awakenSkill("gzyaowu");
			player.gainMaxHp(2);
			player.recover(2);
			player.addSkill("gzyaowu_die");
		},
		ai: { mingzhi_no: true },
		subSkill: {
			die: {
				audio: "new_reyaowu",
				trigger: { player: "dieAfter" },
				filter(event, player) {
					return game.hasPlayer(function (current) {
						return current != player && current.isFriendOf(player);
					});
				},
				forced: true,
				forceDie: true,
				charlotte: true,
				skillAnimation: true,
				animationColor: "fire",
				logTarget(event, player) {
					return game.filterPlayer(function (current) {
						return current != player && current.isFriendOf(player);
					});
				},
				content() {
					for (var target of lib.skill.gzyaowu_die.logTarget(trigger, player)) {
						target.loseHp();
					}
				},
			},
		},
	}
```

### gzshiyong 名字:恃勇
描述: 锁定技。当你受到牌造成的伤害后，若此牌不为红色，你摸一张牌。
```js
gzshiyong: {
		audio: "shiyong",
		derivation: "gzshiyongx",
		trigger: { player: "damageEnd" },
		filter(event, player) {
			if (!event.card) {
				return false;
			}
			if (player.awakenedSkills.includes("gzyaowu")) {
				return event.source && event.source.isIn() && get.color(event.card) != "black";
			}
			return get.color(event.card) != "red";
		},
		forced: true,
		logTarget(event, player) {
			if (player.awakenedSkills.includes("gzyaowu")) {
				return event.source;
			}
			return;
		},
		content() {
			(lib.skill.gzshiyong.logTarget(trigger, player) || player).draw();
		},
	}
```

## gz_tw_xiahoushang 名字:gz_tw_xiahoushang 势力:wei

### gztanfeng 名字:探锋
描述: 准备阶段，你可以弃置与你势力不同的一名角色区域内的一张牌，然后其可以令你对其造成1点火焰伤害，并令你跳过本回合的一个阶段（准备阶段和结束阶段除外）。
```js
gztanfeng: {
		audio: "twtanfeng",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(function (current) {
				return !current.isFriendOf(player) && current.countDiscardableCards(player, "hej") > 0;
			});
		},
		direct: true,
		preHidden: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt2("gztanfeng"), function (card, player, target) {
					return !target.isFriendOf(player) && target.countDiscardableCards(player, "hej") > 0;
				})
				.set("ai", function (target) {
					var player = _status.event.player;
					if (target.hp + target.countCards("hs", { name: ["tao", "jiu"] }) <= 2) {
						return 3 * get.effect(target, { name: "guohe" }, player, player);
					}
					return get.effect(target, { name: "guohe" }, player, player);
				})
				.setHiddenSkill(event.name);
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				event.target = target;
				player.logSkill("gztanfeng", target);
				player.discardPlayerCard(target, "hej", true);
			} else {
				event.finish();
			}
			"step 2";
			target
				.chooseBool("是否受到" + get.translation(player) + "造成的1点火焰伤害，令其跳过一个阶段？")
				.set("ai", () => _status.event.choice)
				.set("choice", get.damageEffect(target, player, target, "fire") >= -5);
			"step 3";
			if (result.bool) {
				player.line(target);
				target.damage(1, "fire");
			} else {
				event.finish();
			}
			"step 4";
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

## gz_xf_huangquan 名字:gz_xf_huangquan 势力:wei

### gzdianhu 名字:点虎
描述: 锁定技。当你首次明置此武将牌时，你选择一名其他角色。与你势力相同的角色对其造成伤害后，伤害来源摸一张牌。
```js
gzdianhu: {
		unique: true,
		audio: "xinfu_dianhu",
		trigger: { player: "showCharacterAfter" },
		forced: true,
		filter(event, player) {
			return (
				event.toShow.some(name => {
					return get.character(name, 3).includes("gzdianhu");
				}) && !player.storage.gzdianhu_effect
			);
		},
		content() {
			"step 0";
			player.chooseTarget("请选择【点虎】的目标", true, "给一名角色标上“虎”标记。当你或你的队友对该角色造成伤害后摸一张牌。", lib.filter.notMe).set("ai", function (target) {
				var player = _status.event.player;
				var distance = game.countPlayer(function (current) {
					if (current.isFriendOf(player)) {
						return Math.pow(get.distance(current, target), 1.2);
					}
				});
				return 10 / distance;
			});
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("gzdianhu", target);
				target.markSkill("gzdianhu_mark");
				player.addSkill("gzdianhu_effect");
				player.markAuto("gzdianhu_effect", [target]);
			}
		},
		subSkill: {
			mark: {
				mark: true,
				marktext: "虎",
				intro: { content: "已成为“点虎”目标" },
			},
			effect: {
				trigger: { global: "damageEnd" },
				forced: true,
				charlotte: true,
				filter(event, player) {
					if (!player.getStorage("gzdianhu_effect").includes(event.player)) {
						return false;
					}
					var source = event.source;
					return source && source.isAlive() && source.isFriendOf(player);
				},
				logTarget: "source",
				content() {
					trigger.source.draw();
				},
			},
		},
	}
```

### gzjianji 名字:谏计
描述: 出牌阶段限一次。你可以令一名角色摸一张牌并展示之，然后其可以使用此牌。
```js
gzjianji: {
		audio: "xinfu_jianji",
		inherit: "xinfu_jianji",
		filterTarget: true,
		content() {
			"step 0";
			target.draw("visible");
			"step 1";
			var card = result?.cards?.[0];
			if (
				card &&
				game.hasPlayer(function (current) {
					return target.canUse(card, current);
				}) &&
				get.owner(card) == target
			) {
				target.chooseToUse({
					prompt: "是否使用" + get.translation(card) + "？",
					filterCard(cardx, player, target) {
						return cardx == _status.event.cardx;
					},
					cardx: card,
				});
			}
		},
		ai: {
			order: 10,
			result: { target: 1 },
		},
	}
```

## gz_guohuai 名字:gz_guohuai 势力:wei

### gzduanshi 名字:断势
描述: `${get.poptip("guozhan_mainSkill")}，锁定技。此武将牌减少半个阴阳鱼。当一名角色因杀死与你势力相同的角色而摸牌时，其少摸一张牌。然后你摸一张牌。`
```js
gzduanshi: {
		audio: "yuzhang",
		trigger: { global: "drawBegin" },
		forced: true,
		mainSkill: true,
		preHidden: true,
		init(player) {
			if (player.checkMainSkill("gzduanshi")) {
				player.removeMaxHp();
			}
		},
		filter(event, player) {
			var evt = event.getParent();
			if (evt.name != "die") {
				return false;
			}
			if (player.identity == "unknown") {
				return player.wontYe("wei") && evt.player.identity == "wei";
			}
			return evt.player.isFriendOf(player);
		},
		logTarget: "player",
		content() {
			trigger.num--;
			if (trigger.num < 1) {
				trigger.cancel();
			}
			if (!trigger.gzduanshi) {
				trigger.gzduanshi = [];
			}
			trigger.gzduanshi.add(player);
			player.addTempSkill("gzduanshi_draw");
		},
		subSkill: {
			draw: {
				trigger: { global: ["drawAfter", "drawCancelled"] },
				forced: true,
				charlotte: true,
				popup: false,
				filter(event, player) {
					return event.gzduanshi && event.gzduanshi.includes(player);
				},
				content() {
					player.draw();
				},
			},
		},
	}
```

### gzjingce 名字:精策
描述: 回合结束时，若于本回合内进入弃牌堆的牌数不小于X，你可以执行一个额外的摸牌阶段；若你本回合使用过的牌数不小于X，你可以执行一个额外的出牌阶段（X为你的体力值）。
```js
gzjingce: {
		audio: "decadejingce",
		getDiscardNum() {
			var cards = [];
			//因为是线下武将 所以同一张牌重复进入只算一张
			game.getGlobalHistory("cardMove", function (evt) {
				if (evt.name == "cardsDiscard" || (evt.name == "lose" && evt.position == ui.discardPile)) {
					cards.addArray(evt.cards);
				}
			});
			return cards.length;
		},
		trigger: { player: "phaseEnd" },
		filter(event, player) {
			if (player.getHistory("useCard").length >= player.hp) {
				return true;
			}
			return lib.skill.gzjingce.getDiscardNum() >= player.hp;
		},
		prompt2(event, player) {
			var num1 = player.getHistory("useCard").length,
				num2 = lib.skill.gzjingce.getDiscardNum();
			if (num1 >= player.hp && num2 >= player.hp) {
				return "执行一套额外的摸牌阶段和出牌阶段";
			}
			return "执行一个额外的" + (num1 > num2 ? "出牌阶段" : "摸牌阶段");
		},
		preHidden: true,
		frequent: true,
		async content(event, trigger, player) {
			let num1 = player.getHistory("useCard").length,
				num2 = lib.skill.gzjingce.getDiscardNum(),
				num3 = player.hp;
			if (num1 >= num3) {
				trigger.phaseList.splice(trigger.num, 0, `phaseUse|${event.name}`);
			}
			if (num2 >= num3) {
				trigger.phaseList.splice(trigger.num, 0, `phaseDraw|${event.name}`);
			}
		},
		ai: { threaten: 2.6 },
	}
```

## gz_guanqiujian 名字:gz_guanqiujian 势力:wei

### gzzhengrong 名字:征荣
描述: 锁定技。①你至大势力角色的距离-1。②当你选择“军令”时，你令可选军令数量+1。③当你造成或受到伤害时，若你没有存活的队友，则此伤害+1。
```js
gzzhengrong: {
		audio: "drlt_zhenrong",
		trigger: {
			source: "damageBegin3",
			player: ["damageBegin1", "chooseJunlingForBegin"],
		},
		forced: true,
		preHidden: true,
		filter(event, player) {
			if (event.name != "damage") {
				return true;
			}
			if (player.identity != "unknown") {
				return !game.hasPlayer(function (current) {
					return current != player && current.isFriendOf(player);
				});
			}
			return !player.wontYe("wei") || !game.hasPlayer(current => current.identity == "wei");
		},
		check(event, player) {
			return (
				!event.player.hasSkillTag("filterDamage", null, {
					player: event.source,
					card: event.card,
				}) && get.damageEffect(event.player, event.source, player, _status.event.player) > 0
			);
		},
		content() {
			trigger.num++;
		},
		mod: {
			globalFrom(player, target, num) {
				if (target.isMajor()) {
					return num - 1;
				}
			},
		},
		ai: { halfneg: true },
	}
```

### gzhongju 名字:鸿举
描述: 限定技。出牌阶段，你可以选择一名其他角色A并选择一个“军令”。你执行该军令，然后令除A以外的所有其他角色依次选择一项：⒈执行该军令。⒉于本回合视为移出游戏。
```js
gzhongju: {
		audio: "drlt_hongju",
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		filterTarget: lib.filter.notMe,
		content() {
			"step 0";
			player.awakenSkill("gzhongju");
			event.players = game
				.filterPlayer(function (current) {
					return current != player && current != target;
				})
				.sortBySeat();
			game.delayx();
			player.chooseJunlingFor(event.players[0]).set("prompt", "请选择一项“军令”");
			"step 1";
			event.junling = result.junling;
			event.targets = result.targets;
			event.num = 0;
			player.carryOutJunling(player, event.junling, event.targets);
			"step 2";
			if (num < event.players.length) {
				event.current = event.players[num];
			}
			if (event.current && event.current.isAlive()) {
				player.line(event.current);
				event.current
					.chooseJunlingControl(player, event.junling, targets)
					.set("prompt", "鸿举")
					.set("choiceList", ["执行该军令", "不执行该军令，且被“调虎离山”化"])
					.set("ai", function () {
						var evt = _status.event.getParent(2);
						return get.junlingEffect(evt.player, evt.junling, evt.current, evt.targets, evt.current) > 0 ? 0 : 1;
					});
			} else {
				event.goto(4);
			}
			"step 3";
			if (result.index == 0) {
				event.current.carryOutJunling(player, event.junling, event.targets);
			} else {
				event.current.addTempSkill("diaohulishan");
			}
			"step 4";
			game.delayx();
			event.num++;
			if (event.num < event.players.length) {
				event.goto(2);
			}
		},
	}
```

## gz_zhujun 名字:gz_zhujun 势力:qun

### gzgongjian 名字:攻坚
描述: ①当其他角色的牌因弃置而进入弃牌堆后，若令其弃置这些牌的角色为你，你获得其中所有的【杀】。②每回合限一次，当一名角色使用【杀】指定目标后，若有目标与本局游戏上一张被使用的【杀】相同，你可以令这些目标弃置两张牌。
```js
gzgongjian: {
		audio: "gongjian",
		trigger: { global: "useCardToPlayered" },
		filter(event, player) {
			if (!event.isFirstTarget || event.card.name != "sha") {
				return false;
			}
			var history = game.getAllGlobalHistory("useCard", function (evt) {
				return evt.card.name == "sha";
			});
			var evt = event.getParent(),
				index = history.indexOf(evt);
			if (index < 1) {
				return false;
			}
			var evt0 = history[index - 1];
			for (var i of evt.targets) {
				if (evt0.targets.includes(i) && i.countCards("he") > 0) {
					return true;
				}
			}
			return false;
		},
		usable: 1,
		prompt2: "弃置这些角色的各两张牌",
		preHidden: ["gzgongjian_gain"],
		subfrequent: ["gain"],
		logTarget(event, player) {
			var history = game.getAllGlobalHistory("useCard", function (evt) {
				return evt.card.name == "sha";
			});
			var evt = event.getParent(),
				index = history.indexOf(evt);
			var evt0 = history[index - 1];
			return evt.targets.filter(function (target) {
				return evt0.targets.includes(target) && target.countCards("he") > 0;
			});
		},
		check(event, player) {
			var targets = lib.skill.gzgongjian.logTarget(event, player),
				att = 0;
			for (var i of targets) {
				att += get.attitude(player, i);
			}
			return att < 0;
		},
		content() {
			var history = game.getAllGlobalHistory("useCard", function (evt) {
				return evt.card.name == "sha";
			});
			var evt = trigger.getParent(),
				index = history.indexOf(evt);
			var evt0 = history[index - 1];
			var targets = evt.targets
				.filter(function (target) {
					return evt0.targets.includes(target);
				})
				.sortBySeat();
			for (var i of targets) {
				i.chooseToDiscard(true, "he", 2);
			}
		},
		group: "gzgongjian_gain",
		subSkill: {
			gain: {
				audio: "gongjian",
				trigger: {
					global: ["loseAfter", "loseAsyncAfter"],
				},
				filter(event, player) {
					if (event.name == "lose") {
						if (event.type != "discard" || event.player == player) {
							return false;
						}
						if ((event.getParent(event.getParent(2).name == "chooseToDiscard" ? 3 : 2).player || event.discarder) != player) {
							return false;
						}
						for (var i of event.cards2) {
							if (i.name == "sha") {
								return true;
							}
						}
					} else if (event.type == "discard") {
						if (!event.discarder || event.discarder != player) {
							return false;
						}
						var cards = event.getd(null, "cards2");
						cards.removeArray(event.getd(player, "cards2"));
						for (var i of cards) {
							if (i.name == "sha") {
								return true;
							}
						}
					}
					return false;
				},
				frequent: true,
				prompt2(event, player) {
					var cards = event.getd(null, "cards2");
					cards.removeArray(event.getd(player, "cards2"));
					cards = cards.filter(card => card.name == "sha");
					return "获得" + get.translation(cards);
				},
				content() {
					var cards = trigger.getd(null, "cards2");
					cards.removeArray(trigger.getd(player, "cards2"));
					cards = cards.filter(card => card.name == "sha");
					if (cards.length) {
						player.gain(cards, "gain2");
					}
				},
			},
		},
	}
```

### gzkuimang 名字:溃蟒
描述: `锁定技。当你杀死与你势力不同且处于${get.poptip("guozhan_duilie")}的角色时，你摸两张牌。`
```js
gzkuimang: {
		audio: "kuimang",
		trigger: { source: "die" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			var target = event.player;
			if (target.isFriendOf(player)) {
				return false;
			}
			var prev = target.getPrevious(),
				next = target.getNext();
			return (prev && prev.isFriendOf(target)) || (next && next.isFriendOf(target));
		},
		content() {
			player.draw(2);
		},
	}
```

## gz_chengong 名字:gz_chengong 势力:qun

### gzyinpan 名字:引叛
描述: 出牌阶段限一次。你可以选择一名其他角色，令所有与其势力不同的角色依次选择是否对其使用一张无距离次数限制的【杀】。然后其下回合使用【杀】的次数上限+X（X为其以此法受到的伤害次数），若其以此法进入过濒死状态，其回复1点体力。
```js
gzyinpan: {
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		content() {
			"step 0";
			event.targets = game
				.filterPlayer(function (current) {
					return current != target && current.isEnemyOf(target);
				})
				.sortBySeat();
			"step 1";
			if (!event.target.isIn()) {
				event.finish();
				return;
			}
			var target = targets.shift();
			if (target.isIn() && (_status.connectMode || !lib.config.skip_shan || target.hasSha())) {
				target
					.chooseToUse(
						function (card, player, event) {
							if (get.name(card) != "sha") {
								return false;
							}
							return lib.filter.filterCard.apply(this, arguments);
						},
						"是否对" + get.translation(event.target) + "使用一张【杀】？"
					)
					.set("targetRequired", true)
					.set("complexSelect", true)
					.set("complexTarget", true)
					.set("addCount", false)
					.set("filterTarget", function (card, player, target) {
						if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
							return false;
						}
						return lib.filter.targetEnabled.apply(this, arguments);
					})
					.set("sourcex", event.target);
			}
			if (targets.length > 0) {
				event.redo();
			}
			"step 2";
			if (target.isIn()) {
				var dying = false;
				var num = target.getHistory("damage", function (evt) {
					if (evt.card && evt.card.name == "sha") {
						var evtx = evt.getParent("useCard");
						if (evt.card == evtx.card && evtx.getParent(2) == event) {
							if (evt._dyinged) {
								dying = true;
							}
							return true;
						}
					}
				}).length;
				if (num > 0) {
					target.addTempSkill("gzyinpan_effect", { player: "phaseAfter" });
					target.addMark("gzyinpan_effect", num, false);
					if (dying) {
						target.recover();
					}
				}
			}
		},
		ai: {
			order: 1,
			result: { target: -1 },
		},
		subSkill: {
			effect: {
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("gzyinpan_effect");
						}
					},
				},
				onremove: true,
				charlotte: true,
				intro: { content: "使用【杀】的次数上限+#" },
			},
		},
	}
```

### gzxingmou 名字:兴谋
描述: 锁定技。①你杀死其他角色或其他角色杀死你均不执行奖惩。②其他角色因执行奖惩而摸牌时，你摸一张牌。
```js
gzxingmou: {
		trigger: { global: "gainAfter" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			return event.getParent().name == "draw" && event.getParent(2).name == "die";
		},
		content() {
			player.draw();
		},
		ai: {
			noDieAfter: true,
			noDieAfter2: true,
		},
	}
```

## gz_re_xugong 名字:gz_re_xugong 势力:wu

### gzbiaozhao 名字:表召
描述: 出牌阶段限一次。你可以选择两名势力不同的其他角色A和B。你视为对A使用一张【知己知彼】，然后将一张牌交给B并摸一张牌。
```js
gzbiaozhao: {
		audio: "biaozhao",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			var players = game.filterPlayer(current => current != player);
			if (players.length < 2) {
				return false;
			}
			for (var i = 0; i < players.length - 1; i++) {
				for (var j = i + 1; j < players.length; j++) {
					if (players[i].isEnemyOf(players[j])) {
						return true;
					}
				}
			}
			return false;
		},
		multitarget: true,
		complexTarget: true,
		complexSelect: true,
		selectTarget: 2,
		filterTarget(card, player, target) {
			if (target == player) {
				return false;
			}
			var targets = ui.selected.targets;
			if (targets.length == 0) {
				return player.canUse("zhibi", target);
			}
			return target.isEnemyOf(targets[0]);
		},
		targetprompt: ["被知己知彼", "获得牌"],
		content() {
			"step 0";
			player.useCard({ name: "zhibi", isCard: true }, targets[0]);
			"step 1";
			if (player.countCards("he") > 0 && targets[1].isAlive()) {
				player.chooseCard("he", true, "交给" + get.translation(targets[1]) + "一张牌");
			} else {
				event.finish();
			}
			"step 2";
			player.give(result.cards, targets[1]);
			player.draw();
		},
		ai: {
			order: 6,
			result: {
				player(player, target) {
					if (ui.selected.targets.length) {
						return 0.1;
					}
					return get.effect(target, { name: "zhibi" }, player, player) + 0.1;
				},
				target(player, target) {
					if (ui.selected.targets.length) {
						return 2;
					}
					return 0;
				},
			},
		},
	}
```

### gzyechou 名字:业仇
描述: 锁定技。当你死亡时，你视为对杀死你的角色依次使用三张【杀】，其中第一张不可被响应，第二张无视防具，第三张对其造成的伤害+1。若其以此法进入濒死状态，则于本次濒死结算中除其外与其势力相同的角色不能对其使用【桃】。
```js
gzyechou: {
		audio: "yechou",
		trigger: { player: "die" },
		forced: true,
		forceDie: true,
		skillAnimation: true,
		animationColor: "gray",
		logTarget: "source",
		filter(event, player) {
			return event.source && event.source.isIn() && player.canUse("sha", event.source, false);
		},
		content() {
			"step 0";
			var target = trigger.source;
			event.target = target;
			target.addTempSkill("gzyechou_unsavable");
			player
				.useCard({ name: "sha", isCard: true }, target)
				.set("forceDie", true)
				.set("oncard", function () {
					_status.event.directHit.addArray(game.filterPlayer());
				});
			"step 1";
			player.addTempSkill("gzyechou_unequip");
			if (!target.isIn() || !player.canUse("sha", target, false)) {
				player.removeSkill("gzyechou_unequip");
				event.goto(3);
			} else {
				player
					.useCard(
						{
							name: "sha",
							isCard: true,
							storage: { gzyechou: true },
						},
						target
					)
					.set("forceDie", true);
			}
			"step 2";
			player.removeSkill("gzyechou_unequip");
			if (!target.isIn() || !player.canUse("sha", target, false)) {
				event.goto(3);
			} else {
				player
					.useCard({ name: "sha", isCard: true }, target)
					.set("forceDie", true)
					.set("oncard", function () {
						_status.event.baseDamage++;
					});
			}
			"step 3";
			target.removeSkill("gzyechou_unsavable");
		},
		ai: {
			threaten: 0.001,
		},
		subSkill: {
			unsavable: {
				charlotte: true,
				mod: {
					targetEnabled(card, player, target) {
						if (card.name == "tao" && target.isDying() && player.isFriendOf(target) && target != player) {
							return false;
						}
					},
				},
			},
			unequip: {
				charlotte: true,
				ai: {
					unequip: true,
					skillTagFilter(player, tag, arg) {
						if (!arg || !arg.card || !arg.card.storage || !arg.card.storage.gzyechou) {
							return false;
						}
					},
				},
			},
		},
	}
```

## gz_key_ushio 名字:冈崎汐 势力:key

### ushio_huanxin 名字:幻心
描述: 当你受到伤害后/使用【杀】造成伤害后/使用装备牌后，你可进行判定。然后你获得判定牌并弃置一张牌。
```js
ushio_huanxin: {
		trigger: {
			player: ["damageEnd", "useCardAfter"],
			source: "damageSource",
		},
		frequent: true,
		preHidden: true,
		filter(event, player, name) {
			if (name == "useCardAfter") {
				return get.type(event.card) == "equip";
			}
			if (name == "damageEnd") {
				return true;
			}
			return event.getParent().name == "sha";
		},
		content() {
			player.judge().set("callback", function () {
				var card = event.judgeResult.card;
				if (card && get.position(card, true) == "o") {
					player.gain(card, "gain2");
					player.chooseToDiscard(true, "he");
				}
			});
		},
	}
```

### ushio_xilv 名字:汐旅
描述: 锁定技，此武将牌可作为任意单势力武将牌的副将。当你进行判定后，你令你的手牌上限+1直至你的下个结束阶段。
```js
ushio_xilv: {
		trigger: { player: "judgeEnd" },
		forced: true,
		preHidden: true,
		content() {
			player.addTempSkill("ushio_xilv2", { player: "phaseJieshu" });
			player.addMark("ushio_xilv2", 1, false);
		},
	}
```

## gz_wangling 名字:王凌 势力:wei

### fakemibei 名字:秘备
描述: ①准备阶段，若你的手牌数不为全场最多，则你须选择一名手牌数为全场最多的角色，令其对你发起军令。②当你执行军令后，你将手牌数摸至与发起者相同（至多摸五张）。③当你拒绝执行军令后，你展示一至三张牌，然后你本回合可以将其中一张牌当作另一张基本牌或非延时锦囊牌使用一次。
```js
fakemibei: {
		audio: "mibei",
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return !player.isMaxHandcard();
		},
		async cost(event, trigger, player) {
			const filterTarget = (card, player, target) => {
					return target != player && target.isMaxHandcard();
				},
				targetx = game.filterPlayer(current => filterTarget(null, player, current));
			if (targetx.length == 1) {
				event.result = { bool: true, targets: targetx };
			} else {
				event.result = await player
					.chooseTarget(filterTarget, true)
					.set("prompt2", lib.translate.fakemibei_info)
					.set("prompt", "请选择【秘备】的目标")
					.set("ai", target => {
						const player = get.event().player;
						return get.attitude(player, target);
					})
					.forResult();
			}
		},
		preHidden: true,
		async content(event, trigger, player) {
			const target = event.targets[0];
			const { junling, targets } = await target.chooseJunlingFor(player).forResult();
			const { index } = await player.chooseJunlingControl(target, junling, targets).set("prompt", "秘备：是否执行军令？").forResult();
			if (index == 0) {
				await player.carryOutJunling(target, junling, targets);
			}
		},
		group: "fakemibei_junling",
		subSkill: {
			junling: {
				audio: "mibei",
				trigger: { player: ["carryOutJunlingEnd", "chooseJunlingControlEnd"] },
				filter(event, player) {
					if (event.name == "carryOutJunling") {
						return event.source.countCards("h") > player.countCards("h");
					}
					return event.result.index == 1 && player.countCards("h");
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					if (trigger.name == "carryOutJunling") {
						const num = Math.min(5, trigger.source.countCards("h") - player.countCards("h"));
						await player.draw(num);
					} else {
						const { bool, cards } = await player
							.chooseCard("秘备：展示一至三张手牌，本回合你可以将其中一张牌当作另一张基本牌或普通锦囊牌使用一次", [1, 3], true)
							.set("ai", card => {
								const player = get.event().player,
									goon = _status.currentPhase == player;
								if (goon) {
									return player.getUseValue(card) / get.value(card);
								}
								return get.value(card);
							})
							.forResult();
						if (bool) {
							await player.showCards(cards, get.translation(player) + "发动了【秘备】");
							player.addGaintag(cards, "fakemibei_effect");
							player.addTempSkill("fakemibei_effect");
						}
					}
				},
			},
			effect: {
				charlotte: true,
				onremove(player) {
					player.removeGaintag("fakemibei_effect");
				},
				hiddenCard(player, name) {
					const cards = player.getCards("h", card => card.hasGaintag("fakemibei_effect"));
					if (cards.length < 2) {
						return false;
					}
					const type = get.type(name);
					if (type != "basic" && type != "trick") {
						return false;
					}
					return cards
						.slice()
						.map(i => i.name)
						.includes(name);
				},
				audio: "mibei",
				enable: "phaseUse",
				chooseButton: {
					dialog(event, player) {
						const list = player
							.getCards("h", card => {
								const type = get.type(card);
								if (type != "basic" && type != "trick") {
									return false;
								}
								return card.hasGaintag("fakemibei_effect");
							})
							.sort((a, b) => {
								return (
									lib.inpile.indexOf(a.name) +
									get.natureList(a, false).reduce((sum, nature) => {
										return sum + lib.inpile_nature.indexOf(nature);
									}, 0) -
									lib.inpile.indexOf(b.name) -
									get.natureList(b, false).reduce((sum, nature) => {
										return sum + lib.inpile_nature.indexOf(nature);
									}, 0)
								);
							})
							.slice()
							.map(card => [get.translation(get.type(card)), "", card.name, card.nature]);
						return ui.create.dialog("秘备", [list, "vcard"]);
					},
					filter(button, player) {
						const event = get.event().getParent();
						return event.filterCard({ name: button.link[2], nature: button.link[3] }, player, event);
					},
					check(button) {
						const player = get.event().player;
						const card = { name: button.link[2], nature: button.link[3] };
						if (player.countCards("hes", cardx => cardx.name == card.name)) {
							return 0;
						}
						return player.getUseValue(card);
					},
					backup(links, player) {
						return {
							audio: "chengshang",
							filterCard(card, player) {
								const cardx = get.info("fakemibei_effect_backup").viewAs;
								if (cardx.name == card.name && cardx.nature == card.nature) {
									return false;
								}
								return card.hasGaintag("fakemibei_effect");
							},
							position: "h",
							popname: true,
							log: false,
							precontent() {
								player.logSkill("fakemibei_effect");
								player.tempBanSkill("fakemibei_effect", null, false);
							},
							viewAs: {
								name: links[0][2],
								nature: links[0][3],
							},
						};
					},
					prompt(links, player) {
						return "将一张“秘备”牌当作" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
					},
				},
			},
		},
	}
```

## gz_yanyan 名字:gz_yanyan 势力:shu

### fakejuzhan 名字:拒战
描述: 转换技。阳：当你成为【杀】的目标后，你可以与使用者各摸X张牌，然后若使用者的武将牌均明置，则你可以暗置其一张武将牌，且其本回合不能明置此武将牌；阴，当你使用【杀】指定目标后，你可以获得目标角色的X张牌，然后若你的武将牌均明置，则其可以暗置此武将牌，且你本回合不能明置此武将牌。（X为使用者已损失的体力值且X至少为1）
```js
fakejuzhan: {
		zhuanhuanji: true,
		locked: false,
		marktext: "☯",
		intro: {
			content(storage) {
				if (storage) {
					return "当你使用【杀】指定目标后，你可以获得其X张牌，然后若你的武将牌均明置，则其可以暗置此武将牌，且你本回合不能明置此武将牌（X为你已损失的体力值且至少为1）";
				}
				return "当你成为【杀】的目标后，你可以与其各摸X张牌，然后其武将牌均明置，则你可以暗置其一张武将牌，且其本回合不能明置此武将牌（X为其已损失的体力值且至少为1）";
			},
		},
		audio: "nzry_juzhan_1",
		trigger: {
			player: "useCardToPlayered",
			target: "useCardToTargeted",
		},
		filter(event, player, name) {
			if (event.card.name != "sha" || player._isInJuzhan == name) {
				return false;
			}
			const storage = player.storage.fakejuzhan;
			if ((event.player == player) != Boolean(storage)) {
				return false;
			}
			if (storage && !event.target.countCards("he")) {
				return false;
			}
			return true;
		},
		async cost(event, trigger, player) {
			const storage = player.storage.fakejuzhan,
				target = trigger[storage ? "target" : "player"];
			event.result = await player.chooseBool(get.prompt2(event.skill, target)).setHiddenSkill("fakejuzhan").forResult();
			if (event.result.bool) {
				player._isInJuzhan = event.triggername;
			}
		},
		async content(event, trigger, player) {
			delete player._isInJuzhan;
			const storage = player.storage.fakejuzhan;
			player.changeZhuanhuanji("fakejuzhan");
			const target = trigger[storage ? "target" : "player"];
			const num = Math.max(target.getDamagedHp(), 1);
			if (!storage) {
				await player.draw(num, "nodelay");
				await target.draw(num);
				if (!target.isUnseen(2)) {
					const { bool, links } = await player
						.chooseButton(["拒战：是否暗置" + get.translation(target) + "的一张武将牌？", '<div class="text center">' + get.translation(target) + "的武将牌</div>", [[target.name1, target.name2], "character"]])
						.set("filterButton", button => !get.is.jun(button.link))
						.forResult();
					if (bool) {
						await target.hideCharacter(target.name1 == links[0] ? 0 : 1);
						target.addTempSkill("donggui2");
					}
				}
			} else {
				await player.gainPlayerCard(target, num, "he", true, "allowChooseAll");
				const names = [player.name1, player.name2].filter(i => {
					return get.character(i, 3).includes("fakejuzhan");
				});
				if (!player.isUnseen(2) && names.length) {
					const { bool, links } = await target.chooseBool("拒战：是否暗置" + get.translation(player) + "的" + (names.includes(player.name1) ? "主将" : "") + (names.length > 1 ? "和" : "") + (names.includes(player.name2) ? "副将" : "") + "?").forResult();
					if (bool) {
						if (names.includes(player.name1)) {
							await player.hideCharacter(0);
						}
						if (names.includes(player.name2)) {
							await player.hideCharacter(1);
						}
						player.addTempSkill("donggui2");
					}
				}
			}
		},
		group: "fakejuzhan_mark",
		subSkill: {
			mark: {
				charlotte: true,
				trigger: { player: ["hideCharacterBegin", "showCharacterEnd"] },
				filter(event, player) {
					if (event.name == "hideCharacter") {
						return get.character(event.toHide, 3).includes("fakejuzhan");
					}
					return event.toShow?.some(name => {
						return get.character(name, 3).includes("fakejuzhan");
					});
				},
				forced: true,
				popup: false,
				firstDo: true,
				content() {
					player[(trigger.name == "hideCharacter" ? "un" : "") + "markSkill"]("fakejuzhan");
				},
			},
		},
	}
```

## gz_xin_zhuran 名字:朱然 势力:wu

### fakedanshou 名字:胆守
描述: 每轮限一次，一名角色的准备阶段，你可以弃置一个区域的所有牌。若如此做，本回合其每个阶段开始时（准备阶段和结束阶段除外），你摸一张牌或令本回合以此法摸牌数+1，然后若你选择了摸牌且你本次至少摸了四张牌，则你可以对其造成1点伤害。
```js
fakedanshou: {
		audio: "mobiledanshou",
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return ["h", "e", "j"].some(pos => {
				const cards = player.getCards(pos);
				return cards.length > 0 && cards.every(card => lib.filter.cardDiscardable(card, player));
			});
		},
		async cost(event, trigger, player) {
			let list = [],
				map = { h: "手牌区", e: "装备区", j: "判定区" };
			list.addArray(
				["h", "e", "j"]
					.filter(pos => {
						const cards = player.getCards(pos);
						return cards.length > 0 && cards.every(card => lib.filter.cardDiscardable(card, player));
					})
					.map(i => map[i])
			);
			list.push("cancel2");
			const { control } = await player
				.chooseControl(list)
				.set("prompt", get.prompt2("fakedanshou", trigger.player))
				.set("ai", () => {
					const player = get.event().player,
						controls = get.event().controls.slice();
					if (controls.includes("判定区")) {
						return "判定区";
					}
					if (controls.includes("装备区") && player.countCards("e") < 3) {
						return "装备区";
					}
					if (controls.includes("手牌区") && player.countCards("e") < 5) {
						return "手牌区";
					}
					return "cancel2";
				})
				.forResult();
			event.result = { bool: control != "cancel2", cost_data: control };
		},
		round: 1,
		logTarget: "player",
		async content(event, trigger, player) {
			player.popup(event.cost_data);
			await player.discard(player.getCards({ 手牌区: "h", 装备区: "e", 判定区: "j" }[event.cost_data]));
			player.addTempSkill("fakedanshou_effect");
			player.addMark("fakedanshou_effect", 1, false);
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove(player) {
					delete player.storage.fakedanshou_effect;
					delete player._fakedanshou_effect;
				},
				audio: "mobiledanshou",
				trigger: {
					global: ["phaseJudgeBegin", "phaseDrawBegin", "phaseUseBegin", "phaseDiscardBegin"],
				},
				async cost(event, trigger, player) {
					const { control } = await player
						.chooseControl("摸牌", "增加摸牌数")
						.set("prompt", `胆守：请选择一项（当前为${get.translation(trigger.name)}）`)
						.set("ai", () => {
							const player = get.event().player,
								trigger = get.event().getTrigger();
							if (trigger.name == "phaseJudge") {
								return "增加摸牌数";
							}
							if (trigger.name == "phaseDiscard") {
								return "摸牌";
							}
							if (trigger.name == "phaseDraw") {
								if (get.damageEffect(trigger.player, player, player) > 0) {
									player._fakedanshou_effect = true;
									return "增加摸牌数";
								}
							}
							return player._fakedanshou_effect ? "增加摸牌数" : "摸牌";
						})
						.forResult();
					event.result = { bool: true, cost_data: control };
				},
				logTarget: "player",
				async content(event, trigger, player) {
					if (event.cost_data == "增加摸牌数") {
						player.addMark("fakedanshou_effect", 1, false);
					} else {
						const num = player.countMark("fakedanshou_effect");
						await player.draw(num);
						if (num >= 4) {
							const { bool } = await player
								.chooseBool("胆守：是否对" + get.translation(trigger.player) + "造成1点伤害？")
								.set("choice", get.damageEffect(trigger.player, player, player) > 0)
								.forResult();
							if (bool) {
								player.line(trigger.player);
								await trigger.player.damage();
							}
						}
					}
				},
			},
		},
	}
```

## gz_gaoshun 名字:gz_gaoshun 势力:qun

### fakexunxi 名字:迅析
描述: 其他角色于回合外明置武将牌时，你可以视为对其使用一张【杀】（无距离限制）。
```js
fakexunxi: {
		trigger: { global: "showCharacterEnd" },
		filter(event, player) {
			const card = new lib.element.VCard({ name: "sha", isCard: true });
			return event.player != player && event.player != _status.currentPhase && player.canUse(card, event.player, false);
		},
		check(event, player) {
			const card = new lib.element.VCard({ name: "sha", isCard: true });
			return get.effect(event.player, card, player, player) > 0;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const card = new lib.element.VCard({ name: "sha", isCard: true });
			await player.useCard(card, trigger.player, false);
		},
	}
```

### fakehuanjia 名字:擐甲
描述: 锁定技，每回合每项各限一次。①当你成为【杀】的目标后，本回合你视为装备此牌使用者的防具，直到你的装备区中有防具。②当你使用【杀】指定唯一目标后，本回合你视为装备目标角色的武器，直到你的装备区中有武器。
```js
fakehuanjia: {
		trigger: {
			player: "useCardToPlayered",
			target: "useCardToTargeted",
		},
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			if (event.target == player) {
				if (player.getStorage("fakehuanjia_used").includes(2)) {
					return false;
				}
				return event.player.getEquips(2).length;
			}
			if (event.targets.length != 1) {
				return false;
			}
			if (player.getStorage("fakehuanjia_used").includes(1)) {
				return false;
			}
			return event.target.getEquips(1).length;
		},
		logTarget(event, player) {
			return event.target == player ? event.player : event.target;
		},
		forced: true,
		async content(event, trigger, player) {
			player.addTempSkill("fakehuanjia_used");
			if (trigger.target == player) {
				player.markAuto("fakehuanjia_used", [2]);
				if (!player.getEquips(2).length && player.hasEmptySlot(2)) {
					player.addSkill("fakehuanjia_equip2");
					player.markAuto("fakehuanjia_equip2", [trigger.player]);
					player
						.when({
							global: "phaseAfter",
							player: ["equipEnd", "disableEquipEnd", "die"],
						})
						.filter((evt, player) => {
							if (evt.name == "phase" || evt.name == "die") {
								return true;
							}
							if (evt.name == "discardEquip") {
								return !player.hasEmptySlot(2);
							}
							return get.type(evt.card) == "equip2";
						})
						.step(async () => player.removeSkill("fakehuanjia_equip2"));
					const cards = trigger.player.getEquips(2);
					if (cards.length) {
						player.addExtraEquip("fakehuanjia_equip2", cards);
						const skills = cards.reduce((list, card) => {
							if (get.info(card) && get.info(card).skills) {
								list.addArray(get.info(card).skills);
							}
							return list;
						}, []);
						if (skills.length) {
							player.addAdditionalSkill("fakehuanjia_equip2", skills);
						}
					}
				}
			} else {
				player.markAuto("fakehuanjia_used", [1]);
				if (!player.getEquips(1).length && player.hasEmptySlot(1)) {
					player.addSkill("fakehuanjia_equip1");
					player.markAuto("fakehuanjia_equip1", [trigger.target]);
					player
						.when({
							global: "phaseAfter",
							player: ["equipEnd", "disableEquipEnd", "die"],
						})
						.filter((evt, player) => {
							if (evt.name == "phase" || evt.name == "die") {
								return true;
							}
							if (evt.name == "discardEquip") {
								return !player.hasEmptySlot(1);
							}
							return get.type(evt.card) == "equip1";
						})
						.step(async () => player.removeSkill("fakehuanjia_equip1"));
					const cards = trigger.target.getEquips(1);
					if (cards.length) {
						player.addExtraEquip("fakehuanjia_equip1", cards);
						const skills = cards.reduce((list, card) => {
							if (get.info(card) && get.info(card).skills) {
								list.addArray(get.info(card).skills);
							}
							return list;
						}, []);
						if (skills.length) {
							player.addAdditionalSkill("fakehuanjia_equip1", skills);
						}
					}
				}
			}
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
			equip1: {
				charlotte: true,
				onremove(player, skill) {
					delete player.storage[skill];
					player.removeExtraEquip(skill);
				},
				mark: true,
				marktext: "攻",
				mod: {
					attackRange(player, num) {
						const targets = player.getStorage("fakehuanjia_equip1").filter(i => i.isIn());
						return (
							num +
							targets.reduce((sum, target) => {
								return sum + target.getEquipRange();
							}, 0)
						);
					},
				},
				intro: { content: "视为装备$的武器" },
				trigger: {
					global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter", "die"],
				},
				filter(event, player) {
					return game.hasPlayer(target => {
						if (!player.getStorage("fakehuanjia_equip1").includes(target)) {
							return false;
						}
						if (event.name == "die" && event.player == target) {
							return true;
						}
						if (event.name == "equip" && event.player == target) {
							return get.subtype(event.card) == "equip1";
						}
						if (event.getl) {
							const evt = event.getl(target);
							return evt && evt.player == target && evt.es && evt.es.some(i => get.subtype(i) == "equip1");
						}
						return false;
					});
				},
				forced: true,
				popup: false,
				content() {
					const targets = player.getStorage("fakehuanjia_equip1").filter(i => i.isIn());
					const list = targets.reduce(
						(list, target) => {
							const cards = target.getEquips(1);
							if (cards.length) {
								list.equips.addArray(cards.map(card => card.name));
								const skills = cards.reduce((listx, card) => {
									if (get.info(card) && get.info(card).skills) {
										listx.addArray(get.info(card).skills);
									}
									return listx;
								}, []);
								if (skills.length) {
									list.skills.addArray(skills);
								}
							}
							return list;
						},
						{ equips: [], skills: [] }
					);
					player.addExtraEquip("fakehuanjia_equip1", list.equips);
					player.addAdditionalSkill("fakehuanjia_equip1", list.skills);
				},
			},
			equip2: {
				charlotte: true,
				onremove(player, skill) {
					delete player.storage[skill];
					player.removeExtraEquip(skill);
				},
				mark: true,
				marktext: "防",
				intro: { content: "视为装备$的防具" },
				trigger: {
					global: ["loseAfter", "equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter", "die"],
				},
				filter(event, player) {
					return game.hasPlayer(target => {
						if (!player.getStorage("fakehuanjia_equip2").includes(target)) {
							return false;
						}
						if (event.name == "die" && event.player == target) {
							return true;
						}
						if (event.name == "equip" && event.player == target) {
							return get.subtype(event.card) == "equip2";
						}
						if (event.getl) {
							const evt = event.getl(target);
							return evt && evt.player == target && evt.es && evt.es.some(i => get.subtype(i) == "equip2");
						}
						return false;
					});
				},
				forced: true,
				popup: false,
				content() {
					const targets = player.getStorage("fakehuanjia_equip2").filter(i => i.isIn());
					const list = targets.reduce(
						(list, target) => {
							const cards = target.getEquips(2);
							if (cards.length) {
								list.equips.addArray(cards.map(card => card.name));
								const skills = cards.reduce((listx, card) => {
									if (get.info(card) && get.info(card).skills) {
										listx.addArray(get.info(card).skills);
									}
									return listx;
								}, []);
								if (skills.length) {
									list.skills.addArray(skills);
								}
							}
							return list;
						},
						{ equips: [], skills: [] }
					);
					player.addExtraEquip("fakehuanjia_equip1", list.equips);
					player.addAdditionalSkill("fakehuanjia_equip1", list.skills);
				},
			},
		},
	}
```

## gz_re_xusheng 名字:界徐盛 势力:wu

### repojun
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_ol_zhonghui 名字:OL钟会 势力:wei

### gz_ol_quanji 名字:权计
描述: 你受到伤害后，可以摸一张牌，然后将一张牌置于武将牌上，称为“权”。
```js
gz_ol_quanji: {
		audio: "quanji",
		trigger: {
			player: "damageEnd",
		},
		frequent: true,
		filter(event, player) {
			return event.num > 0;
		},
		async content(event, trigger, player) {
			await player.draw();
			if (!player.countCards("h")) {
				return;
			}
			const result = await player.chooseCard("将一张牌置于武将牌上作为“权”", "he", true).forResult();
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
		ai: {
			maixie: true,
			maixie_hp: true,
			threaten: 0.8,
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

### gz_ol_paiyi 名字:排异
描述: `${get.poptip("guozhan_mainSkill")}，①此武将牌计算体力上限时减少半个阴阳鱼。②弃牌阶段结束时，若你此阶段弃牌数小于你拥有的“权”数，你可以将任意张“权”交给一名角色，然后若其手牌数大于你，你对其造成1点伤害。`
```js
gz_ol_paiyi: {
		audio: "paiyi",
		mainSkill: true,
		init(player) {
			if (player.checkMainSkill("gz_ol_paiyi")) {
				player.removeMaxHp();
			}
		},
		trigger: {
			player: "phaseDiscardEnd",
		},
		filter(event, player) {
			let cards = [];
			player.getHistory("lose", evt => {
				if (evt.type == "discard" && evt.getParent(event.name) == event) {
					cards.addArray(evt.cards2);
				}
			});
			return cards.length < player.countExpansions("gz_ol_quanji");
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseButtonTarget({
					createDialog: [get.prompt(event.skill), player.getExpansions("gz_ol_quanji")],
					selectButton: [1, Infinity],
					filterTarget: true,
					allowChooseAll: true,
					ai1(card) {
						return get.value(card);
					},
					ai2(target) {
						const cards = ui.selected.cards;
						if (!cards?.length) {
							return 0;
						}
						const vals = cards.reduce((sum, card) => {
							return sum + get.value(card, target);
						}, 0);
						if (target != player && target.countCards("h") + cards.length > player.countCards("h")) {
							return vals + get.damageEffect(target, player, player);
						}
						return vals;
					},
				})
				.forResult();
			if (result.bool) {
				event.result = {
					bool: true,
					cards: result.links,
					targets: result.targets,
				};
			}
		},
		async content(event, trigger, player) {
			const {
				cards,
				targets: [target],
			} = event;
			await target.gain(cards, "give", player);
			if (target.countCards("h") > player.countCards("h")) {
				await target.damage();
			}
		},
	}
```

### gz_yaopan 名字:邀叛
描述: `${get.poptip("guozhan_viceSkill")}，每回合结束后，若你本回合令其他角色进入过濒死状态（每名角色限一次），你可以选择一名同势力角色，其可与你副将${get.poptip("guozhan_transCharacter")}，然后控制此武将牌的角色获得所有“权”并执行一个仅有出牌阶段的额外回合。`
```js
gz_yaopan: {
		audio: 2,
		viceSkill: true,
		init(player) {
			player.checkViceSkill("gz_yaopan");
		},
		trigger: {
			global: "phaseEnd",
		},
		filter(event, player) {
			let targets = game
				.getGlobalHistory("everything", evt => {
					if (evt.name !== "dying" || evt.player === player) {
						return false;
					}
					return (evt.reason ?? {}).source === player;
				})
				.map(evt => evt.player);
			return targets.some(target => !player.getStorage("gz_yaopan_used").includes(target));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return player == target || player.isFriendOf(target);
				})
				.set("ai", target => {
					return get.attitude(get.player(), target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			player.addSkill("gz_yaopan_used");
			player.markAuto(
				"gz_yaopan_used",
				game
					.getGlobalHistory("everything", evt => {
						if (evt.name !== "dying" || evt.player === player) {
							return false;
						}
						return (evt.reason ?? {}).source === player;
					})
					.map(evt => evt.player)
			);
			const target = event.targets[0];
			const result =
				target == player
					? {
							bool: false,
						}
					: await target
							.chooseBool(`是否与${get.translation(player)}交换副将？`)
							.set("choice", Math.random() > 0.5)
							.forResult();
			if (result.bool) {
				// @ts-expect-error 祖宗之法就是这么做的
				await player.transCharacter(target);
			}
			const targetx = result.bool ? target : player,
				cards = targetx?.getExpansions("gz_ol_quanji");
			if (cards.length) {
				if (targetx) {
					await targetx.gain(cards, "give", player);
				} else {
					await player.loseToDiscardpile(cards);
				}
			}
			if (targetx) {
				const next = targetx.insertPhase();
				// @ts-expect-error 祖宗之法就是这么做的
				next.phaseList = ["phaseUse"];
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

## gz_ol_wuyi 名字:OL吴懿 势力:shu

### gz_ol_benxi 名字:奔袭
描述: 锁定技，你于回合内使用牌后，本回合计算与其他角色的距离-1。
```js
gz_ol_benxi: {
		audio: "benxi",
		trigger: {
			player: "useCard",
		},
		filter(event, player) {
			return player == _status.currentPhase;
		},
		forced: true,
		async content(event, trigger, player) {
			const name = `${event.name}_effect`;
			player.addTempSkill(name);
			player.addMark(name, 1, false);
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				intro: {
					markcount(storage, player) {
						return -1 * (storage || 0);
					},
					content: "计算与其他角色距离-#",
				},
				mod: {
					globalFrom(from, to, distance) {
						return distance - from.countMark("gz_ol_benxi_effect");
					},
				},
			},
		},
	}
```

### gz_ol_zhuanzheng 名字:转征
描述: `每轮限一次，出牌阶段，你可以选择一名距离1以内的同势力角色，你摸X张牌，然后其可与你副将${get.poptip("guozhan_transCharacter")}（X为你与其之间的角色数且至少为1）。若控制此武将牌的角色发生变化，则本轮本技能发动次数+1。`
```js
gz_ol_zhuanzheng: {
		audio: 2,
		enable: "phaseUse",
		filter(event, player) {
			if (player.countMark("gz_ol_zhuanzheng_used") >= 1 + player.countMark("gz_ol_zhuanzheng_more")) {
				return false;
			}
			return game.hasPlayer(current => player.isFriendOf(current));
		},
		filterTarget(card, player, target) {
			return player.isFriendOf(target) && get.distance(player, target) <= 1;
		},
		async content(event, trigger, player) {
			const { target } = event,
				name = `${event.name}_used`;
			player.addTempSkill(name, { global: "roundStart" });
			player.addMark(name, 1, false);
			let num = -1,
				left = player,
				right = player;
			while (target?.isIn()) {
				if (left == target || right == target) {
					break;
				}
				left = left.getPrevious();
				right = right.getNext();
				num++;
			}
			await player.draw(Math.max(1, num));
			if (target !== player) {
				const result = await target
					.chooseBool(`是否与${get.translation(player)}交换副将？`)
					.set("choice", Math.random() > 0.5)
					.forResult();
				if (result.bool) {
					player.addTempSkill(`${event.name}_more`, { global: "roundStart" });
					player.addMark(`${event.name}_more`, 1, false);
					// @ts-expect-error 祖宗之法就是这么做的
					await player.transCharacter(target);
				}
			}
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
			more: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

## gz_chengpu 名字:OL程普 势力:wu

### gz_ol_daohuo 名字:蹈火
描述: `出牌阶段限一次，你可将两张不同颜色的牌当火【杀】使用。此【杀】指定唯一目标后，令其选择一项：1.令你将“阴阳鱼”标记补至1；2.令你选择另一名与其同势力的角色，与其副将${get.poptip("guozhan_transCharacter")}。`
```js
gz_ol_daohuo: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterCard(card) {
			return ui.selected.cards.every(cardx => get.color(cardx) != get.color(card));
		},
		complexCard: true,
		selectCard: 2,
		position: "hes",
		viewAs: {
			name: "sha",
			nature: "fire",
		},
		viewAsFilter(player) {
			return (
				player
					.getCards("hes")
					.map(card => get.color(card))
					.toUniqued().length > 1
			);
		},
		prompt: "将两张颜色不同的牌当火杀使用",
		check(card) {
			return 6 - get.value(card);
		},
		async precontent(event, trigger, player) {
			player
				.when("useCardToPlayered")
				.filter(evt => evt.getParent(2) == event.getParent() && evt.getParent().targets.length == 1)
				.step(async (event, trigger, player) => {
					const target = trigger.target;
					const bool1 = !player.hasMark("yinyang_mark"),
						bool2 = game.hasPlayer(current => current != target && current.isFriendOf(target));
					if (!bool1 && !bool2) {
						return;
					}
					const result = await target
						.chooseButton(
							[
								"蹈火：选择一项",
								[
									[
										["yinyang", `令${get.translation(player)}获得1枚“阴阳鱼”标记`],
										["change", `令${get.translation(player)}选择一名与你同势力的其他角色，你与该角色副将易位`],
									],
									"textbutton",
								],
							],
							true
						)
						.set("filterButton", button => {
							const { bool1, bool2 } = get.event();
							if (button.link == "yinyang") {
								return bool1;
							}
							return bool2;
						})
						.set("bool1", bool1)
						.set("bool2", bool2)
						.set("ai", button => {
							return Math.random();
						})
						.forResult();
					if (!result?.bool || !result.links?.length) {
						return;
					}
					if (result.links.includes("yinyang")) {
						if (!player.countMark("yinyang_mark")) {
							player.addMark("yinyang_mark", 1, false);
							game.log(player, "获得了一个", "#g“阴阳鱼”");
						}
					}
					if (result.links.includes("change")) {
						const targets = game.filterPlayer(current => current != target && current.isFriendOf(target));
						if (!targets?.length) {
							return;
						}
						const result2 = await player
							.chooseTarget(
								`选择一名角色，令其与${get.translation(target)}副将易位`,
								(card, player, target) => {
									return get.event().targetx.includes(target);
								},
								true
							)
							.set("targetx", targets)
							.set("ai", () => Math.random())
							.forResult();
						if (result2?.bool && result2.targets?.length) {
							// @ts-expect-error 祖宗之法就是这么做的
							await target.transCharacter(result2.targets[0]);
						}
					}
				});
		},
	}
```

### gz_ol_chunlao 名字:醇醪
描述: 你的同势力角色可以移去一枚“阴阳鱼”标记或一枚“珠联璧合”标记，视为使用一张【酒】。
```js
gz_ol_chunlao: {
		audio: "chunlao",
		global: "gz_ol_chunlao_jiu",
		subSkill: {
			jiu: {
				enable: "chooseToUse",
				filter(event, player) {
					if (!game.hasPlayer(current => current.isFriendOf(player) && current.hasSkill("gz_ol_chunlao"))) {
						return false;
					}
					if (!player.hasMark("yinyang_mark") && !player.hasMark("zhulianbihe_mark")) {
						return false;
					}
					const jiu = new lib.element.VCard({ name: "jiu", isCard: true });
					return event.filterCard(jiu, player, event);
				},
				hiddenCard(player, name) {
					if (name != "jiu" || !game.hasPlayer(current => current.isFriendOf(player) && current.hasSkill("gz_ol_chunlao"))) {
						return false;
					}
					return player.hasMark("yinyang_mark") || player.hasMark("zhulianbihe_mark");
				},
				chooseButton: {
					dialog(event, player) {
						return ui.create.dialog("###醇醪###弃置一枚“阴阳鱼”或“珠联璧合”，视为使用一张【酒】");
					},
					chooseControl(event, player) {
						const list = [];
						if (player.hasMark("zhulianbihe_mark")) {
							list.push("珠联璧合");
						}
						if (player.hasMark("yinyang_mark")) {
							list.push("阴阳鱼");
						}
						list.push("cancel2");
						return list;
					},
					check(button) {
						const player = get.player(),
							card = new lib.element.VCard({ name: "jiu", isCard: true });
						if (!player.getUseValue(card)) {
							return "cancel2";
						}
						if (player.hasMark("yinyang_mark")) {
							return "阴阳鱼";
						}
						if (player.hasMark("zhulianbihe_mark")) {
							if (player.getUseValue("tao") < player.getUseValue("jiu")) {
								return "珠联璧合";
							}
						}
						return "cancel2";
					},
					backup(result, player) {
						return {
							link: result.control,
							filterCard: () => false,
							selectCard: -1,
							viewAs: {
								name: "jiu",
								isCard: true,
							},
							async precontent(event, trigger, player) {
								delete event.result.skill;
								player.logSkill("gz_ol_chunlao");
								const map = {
									阴阳鱼: "yinyang_mark",
									珠联璧合: "zhulianbihe_mark",
								};
								player.removeMark(map[get.info("gz_ol_chunlao_jiu_backup").link], 1, false);
							},
						};
					},
					prompt(result, player) {
						return `移去一个${result.control}标记，视为使用一张【酒】`;
					},
				},
				ai: {
					order(item, player) {
						return get.order({ name: "jiu" }, player) + 0.1;
					},
					result: {
						player: 1,
					},
				},
			},
		},
	}
```

## gz_ol_xuyou 名字:OL许攸 势力:qun

### gz_ol_chenglve 名字:成略
描述: `同势力角色的出牌阶段开始时，你可将一张牌置于牌堆顶，令其选择一项：1.弃置两张牌，本回合其使用这些花色的牌无距离次数限制；2.与你副将${get.poptip("guozhan_transCharacter")}，然后控制此武将牌的角色摸一张牌。`
```js
gz_ol_chenglve: {
		audio: "gzchenglve",
		trigger: {
			global: "phaseUseBegin",
		},
		filter(event, player) {
			if (!player.countCards("he")) {
				return false;
			}
			return event.player.isFriendOf(player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(get.prompt2(event.skill), "he")
				.set("ai", card => {
					const { player, att } = get.event();
					if (att <= 0) {
						return 0;
					}
					return 7 - get.value(card);
				})
				.set("att", get.attitude(player, trigger.player))
				.forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const {
				targets: [target],
				cards,
			} = event;
			await player.lose(cards, ui.cardPile, "insert");
			const result = await target
				.chooseToDiscard("he", 2, `弃置两张牌，你使用同花色的牌无距离次数限制；或点取消选择是否与${get.translation(player)}副将易位`)
				.set(
					"resultx",
					(() => {
						const cards = target.getCards("h").filter(i => {
								return get.tag(i, "damage") && get.type(i) != "delay" && target.hasValueTarget(i, false, false);
							}),
							map = {};
						for (const card of cards) {
							const suit = get.suit(card, target);
							if (typeof map[suit] != "number") {
								map[suit] = 0;
							}
							map[suit]++;
						}
						const list = Object.keys(map)
							.map(suit => [suit, map[suit]])
							.sort((a, b) => b[1] - a[1])
							.slice(0, 2);
						if (!list.length) {
							return false;
						}
						const num = list.reduce((sum, arr) => sum + arr[1], 0);
						if (target.countCards("h") / 2 <= num && num >= 2) {
							return list.map(arr => arr[0]);
						}
						return false;
					})()
				)
				.set("ai", card => {
					const { player, resultx } = get.event();
					if (!resultx) {
						return 0;
					}
					const suit = get.suit(card, player);
					if (resultx.includes(suit)) {
						if (!player.hasValueTarget(card, false, false)) {
							return 16 - get.value(card);
						}
						return 5 - get.value(card);
					}
					return 7 - get.value(card);
				})
				.forResult();
			if (result?.bool && result.cards?.length) {
				const suits = result.cards.map(card => get.suit(card, target)).toUniqued(),
					skill = `${event.name}_effect`;
				target.addTempSkill(skill);
				target.markAuto(skill, suits);
				target.addTip(
					skill,
					`成略${target
						.getStorage(skill)
						.map(suit => get.translation(suit))
						.join("")}`
				);
			} else {
				const result =
					target == player
						? {
								bool: false,
							}
						: await target
								.chooseBool(`是否与${get.translation(player)}交换副将？`)
								.set("choice", Math.random() > 0.5)
								.forResult();
				if (result.bool) {
					await player.transCharacter(target);
				}
				const targetx = result.bool ? target : player;
				if (targetx?.isIn()) {
					await targetx.draw();
				}
			}
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
						if (suit == "unsure" || player.getStorage("gz_ol_chenglve_effect").includes(suit)) {
							return Infinity;
						}
					},
					targetInRange(card, player) {
						const suit = get.suit(card);
						if (suit == "unsure" || player.getStorage("gz_ol_chenglve_effect").includes(suit)) {
							return true;
						}
					},
				},
				marktext: "略",
				intro: {
					content: "本回合使用$花色的牌无距离和次数限制",
				},
			},
		},
	}
```

### gz_ol_fushi 名字:附势
描述: `锁定技，若你的上家为群势力角色，你视为拥有${get.poptip("gz_ol_zezhu")}；若你的下家为魏势力角色，你视为拥有${get.poptip("gz_ol_chenggong")}。`
```js
gz_ol_fushi: {
		trigger: {
			global: ["phaseBegin", "showCharacterEnd", "hideCharacterEnd", "dieAfter", "changeGroupInGuozhan", "diaohulishanAfter"],
		},
		filter(event, player) {
			return player.hasSkill("gz_ol_fushi");
		},
		silent: true,
		forced: true,
		direct: true,
		init(player, skill) {
			const list = [],
				previous = player.getPrevious(),
				next = player.getNext();
			if (previous?.isIn() && previous.identity == "qun") {
				list.add("gz_ol_zezhu");
			}
			if (next?.isIn() && next.identity == "wei") {
				list.add("gz_ol_chenggong");
			}
			if (list.length) {
				player.addAdditionalSkill(skill, list);
			} else {
				player.removeAdditionalSkill(skill);
			}
		},
		onremove(player, skill) {
			player.removeAdditionalSkill(skill);
		},
		async content(event, trigger, player) {
			get.info(event.name).init(player, event.name);
		},
		derivation: ["gz_ol_zezhu", "gz_ol_chenggong"],
	}
```

## gz_luzhi 名字:鲁芝 势力:wei

### gz_qingzhong 名字:清忠
描述: 出牌阶段开始时，你可以摸两张牌；此阶段结束时，你与手牌数最少的一名同势力或未确定势力的其他角色交换手牌。
```js
gz_qingzhong: {
		audio: "qingzhong",
		trigger: { player: "phaseUseBegin" },
		check(event, player) {
			if (
				game.hasPlayer(function (current) {
					return current != player && current.isMinHandcard() && get.attitude(player, current) > 0;
				})
			) {
				return true;
			}
			if (player.countCards("h") <= 2) {
				return true;
			}
			return false;
		},
		preHidden: true,
		async content(event, trigger, player) {
			await player.draw(2);
			player
				.when("phaseUseEnd")
				.filter(evt => evt == trigger)
				.step(async (event, trigger, player) => {
					const targets = game.filterPlayer(current => {
						if (!current.isMinHandcard() || current == player) {
							return false;
						}
						return player.isFriendOf(current) || current.isUnseen();
					});
					if (!targets?.length) {
						return;
					}
					const result =
						targets.length > 1
							? await player
									.chooseTarget("清忠：与一名手牌数最少且和你势力相同或未确定势力的其他角色交换手牌", true, (card, player, current) => {
										if (!current.isMinHandcard() || current == player) {
											return false;
										}
										return player.isFriendOf(current) || current.isUnseen();
									})
									.set("ai", target => {
										return get.attitude(get.player(), target);
									})
									.forResult()
							: {
									bool: true,
									targets: targets,
								};
					if (result?.bool) {
						const [target] = result.targets;
						player.logSkill("gz_qingzhong", [target]);
						await player.swapHandcards(target);
					}
				});
		},
	}
```

### gz_weijing 名字:卫境
描述: 每轮限一次，你可以将一张牌当【杀】或【闪】使用。
```js
gz_weijing: {
		audio: "weijing",
		enable: "chooseToUse",
		filter(event, player) {
			if (event.type == "wuxie" || !player.countCards("hes") || player.hasSkill("gz_weijing_used")) {
				return false;
			}
			for (let name of lib.inpile) {
				if (name != "sha" && name != "shan") {
					continue;
				}
				if (event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				let list = [];
				for (var name of lib.inpile) {
					if (name != "sha" && name != "shan") {
						continue;
					}
					if (event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) {
						list.push(["基本", "", name]);
					}
				}
				const dialog = ui.create.dialog("卫境", [list, "vcard"], "hidden");
				dialog.direct = true;
				return dialog;
			},
			check(button) {
				if (_status.event.getParent().type != "phase") {
					return 1;
				}
				let player = _status.event.player,
					card = { name: button.link[2], nature: button.link[3] };
				return player.getUseValue(card, null, true);
			},
			backup(links, player) {
				return {
					audio: "gz_weijing",
					viewAs: {
						name: links[0][2],
					},
					filterCard: true,
					position: "hes",
					popname: true,
					check(card) {
						return 6 / Math.max(1, get.value(card));
					},
					async precontent(event, trigger, player) {
						player.addTempSkill("gz_weijing_used", "roundEnd");
					},
				};
			},
			prompt(links, player) {
				const card = links[0][2];
				return `将一张牌当做${get.translation(card)}使用`;
			},
		},
		hiddenCard(player, name) {
			if (name != "sha" && name != "shan") {
				return false;
			}
			return player.countCards("hes") && !player.hasSkill("gz_weijing_used");
		},
		ai: {
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (arg === "respond") {
					return false;
				}
				return lib.skill.gz_weijing.hiddenCard(player, tag == "respondSha" ? "sha" : "shan");
			},
			order: 9,
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
			used: {
				charlotte: true,
			},
		},
	}
```

## gz_ol_wangrong 名字:王荣 势力:qun

### olfengzi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### oljizhan
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### olfusong
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_re_lvbu 名字:gz_re_lvbu 势力:qun

### wushuang
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### new_liyu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_mayunlu 名字:gz_mayunlu 势力:shu

### gz_mashu 名字:马术
描述: 锁定技，你计算与其他角色的距离时-1。
```js
gz_mashu: {
		mod: {
			globalFrom(from, to, distance) {
				return distance - 1;
			},
		},
	}
```

### gzfengpo 名字:凤魄
描述: 当你每回合首次使用【杀】或【决斗】指定唯一目标后，你可以选择一项：1.摸X张牌；2.摸一张牌（X为其♦手牌数）。
```js
gzfengpo: {
		audio: "fengpo",
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (event.targets.length != 1 || !["sha", "juedou"].includes(event.card.name)) {
				return false;
			}
			var evtx = event.getParent();
			return !player.hasHistory(
				"useCard",
				evt => {
					return evt != evtx && evt.card.name == event.card.name;
				},
				evtx
			);
		},
		async cost(event, trigger, player) {
			const result = await player.chooseControl("摸牌", "加伤", "cancel2").set("prompt", get.prompt2(event.skill, trigger.target)).forResult();
			if (result.control !== "cancel2") {
				event.result = {
					bool: true,
					cost_data: result.index,
				};
			}
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const {
				cost_data: index,
				targets: [target],
			} = event;
			const nd = target.countCards("h", { suit: "diamond" });
			if (event.cost_data === "摸牌") {
				await player.draw(nd);
			} else {
				const evt = trigger.getParent();
				evt.baseDamage ??= 1;
				evt.baseDamage += nd;
			}
		},
	}
```

## gz_re_lidian 名字:gz_re_lidian 势力:wei

### xunxun
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### wangxi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_zangba 名字:gz_zangba 势力:wei

### gz_hengjiang 名字:横江
描述: 当你受到伤害后，你可以令当前回合角色本回合的手牌上限-X（X为其装备区牌数且至少为1）。然后其本回合弃牌阶段结束时，若其未于此阶段弃牌，则你将手牌摸至体力上限。
```js
gz_hengjiang: {
		audio: "hengjiang",
		trigger: {
			player: "damageEnd",
		},
		preHidden: true,
		check(event, player) {
			// @ts-expect-error 类型系统未来可期
			return get.attitude(player, _status.currentPhase) < 0 || !_status.currentPhase.needsToDiscard(2);
		},
		filter(event) {
			// @ts-expect-error 类型系统未来可期
			return _status.currentPhase && _status.currentPhase.isIn() && event.num > 0;
		},
		logTarget() {
			// @ts-expect-error 类型系统未来可期
			return _status.currentPhase;
		},
		async content(event, trigger, player) {
			// @ts-expect-error 类型系统未来可期
			const source = _status.currentPhase;
			const num = Math.max(source.countVCards("e"), 1);
			if (source.hasSkill("gz_hengjiang_effect")) {
				source.storage.gz_hengjiang_effect += num;
				source.storage.gz_hengjiang3.add(player);
				source.updateMarks();
			} else {
				source.storage.gz_hengjiang3 = [player];
				source.storage.gz_hengjiang_effect = num;
				source.addTempSkill("gz_hengjiang_effect");
			}
		},
		ai: {
			maixie_defend: true,
		},
		subSkill: {
			effect: {
				trigger: {
					player: "phaseDiscardEnd",
				},
				filter(event, player) {
					if (event.cards?.length) {
						return false;
					}
					return player.storage.gz_hengjiang3.some(target => target?.isIn() && target.countCards("h") < target.maxHp);
				},
				onremove(player) {
					delete player.storage.gz_hengjiang_effect;
					delete player.storage.gz_hengjiang3;
				},
				mark: true,
				charlotte: true,
				silent: true,
				async content(event, trigger, player) {
					const players = player.storage.gz_hengjiang3;
					for (var i = 0; i < players.length; i++) {
						const target = players[i];
						if (target.isIn() && target.countCards("h") < target.maxHp) {
							target.logSkill("gz_hengjiang", player);
							await target.drawTo(target.maxHp);
						}
					}
				},
				intro: {
					content: "手牌上限-#",
				},
				mod: {
					maxHandcard(player, num) {
						return num - player.storage.gz_hengjiang_effect;
					},
				},
			},
		},
	}
```

## gz_madai 名字:gz_madai 势力:shu

### gz_md_mashu
```js
gz_md_mashu: {
		inherit: "gz_mashu",
	}
```

### qianxi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_mifuren 名字:gz_mifuren 势力:shu

### gz_guixiu 名字:闺秀
描述: 当你明置此武将牌时，你可以摸两张牌；当你移除此武将牌时，你可以回复1点体力。
```js
gz_guixiu: {
		audio: "guixiu",
		trigger: {
			player: ["showCharacterAfter", "removeCharacterBefore"],
		},
		unique: true,
		filter(event, player) {
			if (event.name == "removeCharacter" || event.name == "changeVice") {
				// @ts-expect-error 类型系统未来可期
				return get.character(event.toRemove, 3).includes("gz_guixiu") && player.isDamaged();
			}
			// @ts-expect-error 类型系统未来可期
			return event.toShow.some(name => get.character(name, 3).includes("gz_guixiu"));
		},
		async content(_event, trigger, player) {
			if (trigger.name == "showCharacter") {
				await player.draw(2);
			} else {
				await player.recover();
			}
		},
	}
```

### gz_cunsi 名字:存嗣
描述: `出牌阶段，你可以移除此武将牌并选择一名角色，然后其获得技能${get.poptip("gzyongjue")}，若你选择的目标角色不是自己，则其摸两张牌。`
```js
gz_cunsi: {
		audio: "cunsi",
		enable: "phaseUse",
		filter(_event, player) {
			return player.checkMainSkill("gz_cunsi", false) || player.checkViceSkill("gz_cunsi", false);
		},
		unique: true,
		forceunique: true,
		filterTarget: true,
		skillAnimation: true,
		animationColor: "orange",
		derivation: "gzyongjue",
		async content(event, _trigger, player) {
			const { target } = event;

			if (player.checkMainSkill("gz_cunsi", false)) {
				await player.removeCharacter(0);
			} else {
				await player.removeCharacter(1);
			}

			target.addSkills("gzyongjue");
			if (target != player) {
				await target.draw(2);
			}
		},
		ai: {
			order: 9,
			result: {
				player(player, target) {
					var num = 0;
					if (player.isDamaged() && target.isFriendOf(player)) {
						num++;
						if (target.hasSkill("kanpo")) {
							num += 0.5;
						}
						if (target.hasSkill("liegong")) {
							num += 0.5;
						}
						if (target.hasSkill("tieji")) {
							num += 0.5;
						}
						if (target.hasSkill("gzrende")) {
							num += 1.2;
						}
						if (target.hasSkill("longdan")) {
							num += 1.2;
						}
						if (target.hasSkill("paoxiao")) {
							num += 1.2;
						}
						if (target.hasSkill("zhangwu")) {
							num += 1.5;
						}
						if (target != player) {
							num += 0.5;
						}
					}
					return num;
				},
			},
		},
	}
```

## gz_sunce 名字:gz_sunce 势力:wu

### jiang
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### yingyang 名字:鹰扬
描述: 当你的拼点牌亮出后，你可以令此牌的点数+3或-3（至多为K，至少为1）。
```js
yingyang: {
		audio: 2,
		trigger: {
			player: "compare",
			target: "compare",
		},
		filter(event) {
			// @ts-expect-error 类型系统未来可期
			return !event.iwhile;
		},
		preHidden: true,
		async cost(event, trigger, player) {
			const next = player.chooseControl("点数+3", "点数-3", "cancel2");

			next.set("prompt", get.prompt2("yingyang"));
			next.set("ai", check);
			next.set("small", Reflect.get(trigger, "small"));

			const result = await next.forResult();
			event.result = {
				bool: result.index != 2,
				cost_data: {
					index: result.index,
				},
			};

			return;

			function check() {
				const event = get.event();
				const small = Reflect.get(event, "small");

				return small ? 1 : 0;
			}
		},
		async content(event, trigger, player) {
			/** @type {number} */
			const index = event.cost_data?.index;

			if (index == 0) {
				game.log(player, "拼点牌点数+3");
				if (player == trigger.player) {
					// @ts-expect-error 类型系统未来可期
					trigger.num1 += 3;
					// @ts-expect-error 类型系统未来可期
					if (trigger.num1 > 13) {
						trigger.num1 = 13;
					}
				} else {
					// @ts-expect-error 类型系统未来可期
					trigger.num2 += 3;
					// @ts-expect-error 类型系统未来可期
					if (trigger.num2 > 13) {
						trigger.num2 = 13;
					}
				}
			} else {
				game.log(player, "拼点牌点数-3");
				if (player == trigger.player) {
					// @ts-expect-error 类型系统未来可期
					trigger.num1 -= 3;
					// @ts-expect-error 类型系统未来可期
					if (trigger.num1 < 1) {
						trigger.num1 = 1;
					}
				} else {
					// @ts-expect-error 类型系统未来可期
					trigger.num2 -= 3;
					// @ts-expect-error 类型系统未来可期
					if (trigger.num2 < 1) {
						trigger.num2 = 1;
					}
				}
			}
		},
	}
```

### baka_hunshang 名字:魂殇
描述: `${get.poptip("guozhan_viceSkill")}，此武将牌减少半个阴阳鱼；准备阶段，若你的体力值不大于1，则你获得${get.poptip("baka_yingzi")}和${get.poptip("baka_yinghun")}直到回合结束。`
```js
baka_hunshang: {
		audio: "hunzi",
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		init(player) {
			if (player.checkViceSkill("baka_hunshang") && !player.viceChanged) {
				player.removeMaxHp();
			}
		},
		filter(_event, player) {
			return player.hp <= 1;
		},
		locked: false,
		forced: true,
		preHidden: true,
		viceSkill: true,
		skillAnimation: true,
		animationColor: "wood",
		derivation: ["baka_yingzi", "baka_yinghun"],
		async content(_event, _trigger, player) {
			await player.addTempSkills(["baka_yingzi", "baka_yinghun"]);
		},
		ai: {
			threaten(_player, target) {
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
					// @ts-expect-error 类型系统未来可期
					if (get.tag(card, "damage") == 1 && target.hp == 2 && !target.isTurnedOver() && _status.currentPhase != target && get.distance(_status.currentPhase, target, "absolute") <= 3) {
						return [0.5, 1];
					}
				},
			},
		},
	}
```

## gz_chendong 名字:gz_chendong 势力:wu

### duanxie
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### fake_fenming 名字:奋命
描述: 出牌阶段限一次，若你处于横置状态，你可以弃置所有处于横置状态的角色的各一张牌。
```js
fake_fenming: {
		audio: "fenming",
		usable: 1,
		enable: "phaseUse",
		filter(event, player) {
			return player.isLinked();
		},
		filterTarget(card, player, target) {
			return target.isLinked();
		},
		selectTarget: -1,
		multiline: true,
		multitarget: true,
		async content(event, trigger, player) {
			for (const target of event.targets) {
				if (player == target) {
					await player.chooseToDiscard(true, "he");
				} else {
					await player.discardPlayerCard(true, "he", target);
				}
			}
		},
		ai: {
			order(item, player) {
				return get.order({ name: "sha" }, player) + 0.1;
			},
			result: {
				target(player, target) {
					return get.sgn(get.attitude(player, target)) * get.effect(target, { name: "guohe_copy2" }, player, player);
				},
			},
		},
	}
```

## gz_sp_dongzhuo 名字:gz_sp_dongzhuo 势力:qun

### hengzheng
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### fake_baoling 名字:暴凌
描述: `${get.poptip("guozhan_mainSkill")}，锁定技，出牌阶段结束时，若你有副将，则你移除副将，加3点体力上限并回复3点体力，然后获得${get.poptip("fake_benghuai")}。`
```js
fake_baoling: {
		audio: "baoling",
		inherit: "baoling",
		init(player) {
			player.checkMainSkill("fake_baoling");
		},
		derivation: "fake_benghuai",
		async content(_event, _trigger, player) {

			await player.removeCharacter(1);

			await player.gainMaxHp(3);
			await player.recover(3);

			await player.addSkills("fake_benghuai");
		},
	}
```

## gz_zhangren 名字:gz_zhangren 势力:qun

### chuanxin
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_fengshi 名字:锋矢
描述: `${get.poptip("guozhan_zhenfa")}，在一个${get.poptip("guozhan_weigong")}关系中，若你是围攻角色，则你或另一名围攻角色使用【杀】指定被围攻角色为目标后，可令该角色弃置装备区内的一张牌。`
```js
gz_fengshi: {
		audio: "zfengshi",
		trigger: {
			global: "useCardToPlayered",
		},
		filter(event, player) {
			// @ts-expect-error 类型系统未来可期
			if (event.card.name != "sha" || game.countPlayer() < 4) {
				return false;
			}
			// @ts-expect-error 类型系统未来可期
			return player.siege(event.target) && event.player.siege(event.target) && event.target.countCards("e");
		},
		zhenfa: "siege",
		logTarget: "target",
		async content(_event, trigger, _player) {
			await trigger.target.chooseToDiscard("e", true);
		},
	}
```

## gz_shen_zhaoyun 名字:神赵云 势力:shen

### gz_juejing 名字:绝境
描述: 锁定技，你的手牌上限+2；你进入濒死时，摸一张牌。
```js
gz_juejing: {
		audio: "juejing",
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
		trigger: { player: "dying" },
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
						return [1, 0.5];
					}
				},
			},
		},
	}
```

### gz_longhun 名字:龙魂
描述: 每回合各限一次，你可以按以下规则转化牌使用或打出：♥当【桃】，♦当火【杀】，♣当【闪】，♠当【无懈可击】。
```js
gz_longhun: {
		audio: "longhun",
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
		enable: ["chooseToUse", "chooseToRespond"],
		prompt: "将♦牌当做杀，♥牌当做桃，♣牌当做闪，♠牌当做无懈可击使用或打出",
		viewAs(cards, player) {
			if (cards.length) {
				let name = false,
					nature = null;
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
				if (name) {
					return { name: name, nature: nature };
				}
			}
			return null;
		},
		async precontent(event, trigger, player) {
			player.addTempSkill("gz_longhun_used");
			player.markAuto("gz_longhun_used", get.suit(event.result.card, player));
		},
		logAudio(event, player) {
			return "longhun" + (4 - lib.suit.indexOf(get.suit(event.cards[0], player))) + ".mp3";
		},
		check(card) {
			let player = _status.event.player;
			if (_status.event.type == "phase") {
				let max = 0;
				let name2;
				let list = ["sha", "tao"];
				let map = { sha: "diamond", tao: "heart" };
				for (let i = 0; i < list.length; i++) {
					let name = list[i];
					if (
						player.countCards("hes", function (card) {
							return (name != "sha" || get.value(card) < 5) && get.suit(card, player) == map[name];
						}) > 0 &&
						player.getUseValue({ name: name, nature: name == "sha" ? "fire" : null }) > 0
					) {
						let temp = get.order({ name: name, nature: name == "sha" ? "fire" : null });
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
		selectCard: 1,
		position: "hes",
		filterCard(card, player, event) {
			event = event || _status.event;
			let filter = event._backup.filterCard;
			let name = get.suit(card, player);
			if (player.getStorage("gz_longhun_used").includes(name)) {
				return false;
			}
			if (name == "club" && filter(get.autoViewAs({ name: "shan" }, "unsure"), player, event)) {
				return true;
			}
			if (name == "diamond" && filter(get.autoViewAs({ name: "sha", nature: "fire" }, "unsure"), player, event)) {
				return true;
			}
			if (name == "spade" && filter(get.autoViewAs({ name: "wuxie" }, "unsure"), player, event)) {
				return true;
			}
			if (name == "heart" && filter(get.autoViewAs({ name: "tao" }, "unsure"), player, event)) {
				return true;
			}
			return false;
		},
		filter(event, player) {
			let filter = event.filterCard;
			if (filter(get.autoViewAs({ name: "sha", nature: "fire" }, "unsure"), player, event) && player.countCards("hes", { suit: "diamond" })) {
				if (!player.getStorage("gz_longhun_used").includes("diamond")) {
					return true;
				}
			}
			if (filter(get.autoViewAs({ name: "shan" }, "unsure"), player, event) && player.countCards("hes", { suit: "club" })) {
				if (!player.getStorage("gz_longhun_used").includes("club")) {
					return true;
				}
			}
			if (filter(get.autoViewAs({ name: "tao" }, "unsure"), player, event) && player.countCards("hes", { suit: "heart" })) {
				if (!player.getStorage("gz_longhun_used").includes("heart")) {
					return true;
				}
			}
			if (filter(get.autoViewAs({ name: "wuxie" }, "unsure"), player, event) && player.countCards("hes", { suit: "spade" })) {
				if (!player.getStorage("gz_longhun_used").includes("spade")) {
					return true;
				}
			}
			return false;
		},
		ai: {
			respondSha: true,
			respondShan: true,
			save: true,
			skillTagFilter(player, tag) {
				let name;
				switch (tag) {
					case "respondSha":
						name = "sha";
						break;
					case "respondShan":
						name = "shan";
						break;
					case "save":
						name = "tao";
						break;
				}
				if (!get.info("gz_longhun").hiddenCard(player, name)) {
					return false;
				}
			},
			order(item, player) {
				if (player && _status.event.type == "phase") {
					let max = 0;
					let list = ["sha", "tao"];
					let map = { sha: "diamond", tao: "heart" };
					for (let i = 0; i < list.length; i++) {
						let name = list[i];
						if (
							player.countCards("hes", function (card) {
								return (name != "sha" || get.value(card) < 5) && get.suit(card, player) == map[name];
							}) > 0 &&
							player.getUseValue({
								name: name,
								nature: name == "sha" ? "fire" : null,
							}) > 0
						) {
							let temp = get.order({
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
		hiddenCard(player, name) {
			const map = {
				wuxie: "spade",
				tao: "heart",
				shan: "club",
				sha: "diamond",
			};
			if (player.getStorage("gz_longhun_used").includes(map[name])) {
				return false;
			}
			if (name == "wuxie" && _status.connectMode && player.countCards("hs") > 0) {
				return true;
			}
			return player.countCards("hes", { suit: map[name] });
		},
		subSkill: {
			used: {
				charlotte: true,
				onremove: true,
			},
		},
	}
```

## gz_shen_guanyu 名字:神关羽 势力:shen

### gz_wushen 名字:武神
描述: 锁定技，你的♥非基本手牌视为【杀】，你使用♥【杀】无距离次数限制。
```js
gz_wushen: {
		audio: "wushen",
		mod: {
			cardname(card, player, name) {
				if (get.suit(card) == "heart" && lib.card[card.name].type != "basic") {
					return "sha";
				}
			},
			cardnature(card, player) {
				if (get.suit(card) == "heart" && lib.card[card.name].type != "basic") {
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
		trigger: {
			player: "useCard",
		},
		forced: true,
		filter(event, player) {
			return event.card.name == "sha" && get.suit(event.card) == "heart";
		},
		content() {
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
		},
	}
```

### gz_wuhun 名字:() {
		return Math.random() > 0.5 ? "武魂" : "冠绝";
	}
描述: 你使用或打出一张牌时，可以令所有其他角色本回合不能使用或打出与此牌花色相同的牌。
```js
gz_wuhun: {
		audio: "wuhun2",
		trigger: {
			player: ["useCard", "respond"],
		},
		filter(event, player) {
			return lib.suit.includes(get.suit(event.card));
		},
		frequent: true,
		async content(event, trigger, player) {
			const targets = game.filterPlayer(current => current != player),
				suit = get.suit(trigger.card);
			for (const target of targets) {
				target.addTempSkill("gz_wuhun_ban");
				target.markAuto("gz_wuhun_ban", [suit]);
			}
		},
		subSkill: {
			ban: {
				onremove: true,
				charlotte: true,
				mod: {
					cardEnabled(card, player) {
						if (player.getStorage("gz_wuhun_ban").includes(get.suit(card))) {
							return false;
						}
					},
					cardRespondable(card, player) {
						if (player.getStorage("gz_wuhun_ban").includes(get.suit(card))) {
							return false;
						}
					},
					cardSavable(card, player) {
						if (player.getStorage("gz_wuhun_ban").includes(get.suit(card))) {
							return false;
						}
					},
				},
				mark: true,
				marktext: "绝",
				intro: {
					content: "本回合内不能使用或打出$的牌",
				},
			},
		},
	}
```

## gz_shen_lvmeng 名字:神吕蒙 势力:shen

### gz_shelie 名字:涉猎
描述: 摸牌阶段，你可以改为亮出牌堆顶五张牌，然后获得其中每种花色的牌各一张。
```js
gz_shelie: {
		audio: "shelie",
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.changeToZero();
			const cards = get.cards(5);
			await game.cardsGotoOrdering(cards);
			const videoId = lib.status.videoId++;
			game.broadcastAll(
				function (player, id, cards) {
					let str;
					if (player == game.me && !_status.auto) {
						str = "涉猎：获取花色各不相同的牌";
					} else {
						str = "涉猎";
					}
					const dialog = ui.create.dialog(str, cards);
					dialog.videoId = id;
				},
				player,
				videoId,
				cards
			);
			let time = get.utc();
			game.addVideo("showCards", player, ["涉猎", get.cardsInfo(cards)]);
			game.addVideo("delay", null, 2);
			const list = [];
			for (const card of cards) {
				list.add(get.suit(card, false));
			}
			const next = player.chooseButton(list.length, true);
			next.set("dialog", event.videoId);
			next.set("filterButton", function (button) {
				for (let i = 0; i < ui.selected.buttons.length; i++) {
					if (get.suit(ui.selected.buttons[i].link) == get.suit(button.link)) {
						return false;
					}
				}
				return true;
			});
			next.set("ai", function (button) {
				return get.value(button.link, _status.event.player);
			});
			const result = await next.forResult();
			if (!result.bool || !result.links?.length) {
				return;
			}
			time = 1000 - (get.utc() - time);
			if (time > 0) {
				await game.delay(0, time);
			}
			game.broadcastAll("closeDialog", videoId);
			await player.gain(result.links, "log", "gain2");
		},
		ai: {
			threaten: 1.2,
		},
	}
```

### gz_gongxin 名字:攻心
描述: 出牌阶段限一次，你可以观看一名其他角色的手牌，然后可以展示其中一张♥牌，将此牌置于牌堆顶或弃置。
```js
gz_gongxin: {
		audio: "gongxin",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countCards("h");
		},
		async content(event, trigger, player) {
			const target = event.target,
				cards = target.getCards("h"),
				next = player.chooseToMove_new("攻心");
			next.set("list", [
				[get.translation(target) + "的手牌", cards],
				[["弃置"], ["置于牌堆顶"]],
			]);
			next.set("filterOk", moved => {
				return (
					moved[1]
						.slice()
						.concat(moved[2])
						.filter(card => get.suit(card) == "heart").length == 1
				);
			});
			next.set("filterMove", (from, to, moved) => {
				if (moved[0].includes(from.link) && moved[1].length + moved[2].length >= 1 && [1, 2].includes(to)) {
					return false;
				}
				return get.suit(from) == "heart";
			});
			next.set("processAI", list => {
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
			});
			const result = await next.forResult();
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

## gz_shen_lvbu 名字:神吕布 势力:shen

### gz_wuqian 名字:无前
描述: `锁定技，你每回合使用的第一张【杀】或【决斗】获得${get.poptip("gz_wushuang")}效果且无视防具。`
```js
gz_wuqian: {
		audio: "ol_wuqian",
		locked: true,
		ai: {
			directHit_ai: true,
			unequip: true,
			unequip_ai: true,
			skillTagFilter(player, tag, arg) {
				if (!arg?.card?.name || !["sha", "juedou"].includes(arg.card.name)) {
					return false;
				}
				const history = player.getHistory("useCard", evt => ["sha", "juedou"].includes(evt.card?.name));
				if (tag == "unequip_ai") {
					return !history.length;
				} else {
					if (tag.startsWith("directHit")) {
						const name = arg.card.name == "juedou" ? "sha" : "shan";
						if (Math.floor(arg.target.countCards("h", name) / 2) > player.countCards("h", name)) {
							return false;
						}
					}
					if (history.length && history[0].card == arg.card) {
						return true;
					}
					return false;
				}
			},
		},
		group: ["gz_wuqian_add", "gz_wuqian_wushuang"],
		derivation: "gz_wushuang",
		subSkill: {
			add: {
				audio: "gz_wuqian",
				trigger: {
					player: "useCard1",
				},
				filter(event, player) {
					if (event.card.name != "juedou" || !event.card.isCard) {
						return false;
					}
					const history = player.getHistory("useCard", evt => ["sha", "juedou"].includes(evt.card?.name));
					if (history.indexOf(event) != 0) {
						return false;
					}
					if (event.targets) {
						if (
							game.hasPlayer(function (current) {
								return !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, player, current);
							})
						) {
							return true;
						}
					}
					return false;
				},
				async cost(event, trigger, player) {
					const num = game.countPlayer(current => !trigger.targets.includes(current) && lib.filter.targetEnabled2(trigger.card, player, current));

					event.result = await player
						.chooseTarget("无双：是否为" + get.translation(trigger.card) + "增加" + (num > 1 ? "至多两个" : "一个") + "目标？", [1, Math.min(2, num)], (card, player, target) => {
							const trigger = get.event().getTrigger();
							const cardx = trigger.card;
							return !trigger.targets.includes(target) && lib.filter.targetEnabled2(cardx, player, target);
						})
						.set("ai", target => {
							const player = get.event().player;
							const card = get.event().getTrigger().card;
							return get.effect(target, card, player, player);
						})
						.setHiddenSkill("gz_wuqian")
						.forResult();

					if (event.result.bool && player != game.me && !player.isOnline()) {
						await game.delayx();
					}
				},
				logTarget: "targets",
				async content(event, trigger, player) {
					const targets = event.targets.sortBySeat();
					trigger.targets.addArray(targets);
				},
			},
			wushuang: {
				audio: "gz_wuqian",
				trigger: {
					player: "useCardToPlayered",
					target: "useCardToTargeted",
				},
				forced: true,
				logTarget(trigger, player) {
					return player == trigger.player ? trigger.target : trigger.player;
				},
				filter(event, player, name) {
					if (name == "useCardToTargeted" && event.card.name == "sha") {
						return false;
					}
					const history = player.getHistory("useCard", evt => ["sha", "juedou"].includes(evt.card?.name));
					return history.indexOf(event.getParent()) == 0;
				},
				async content(event, trigger, player) {
					const id = (player == trigger.player ? trigger.target : trigger.player)["playerid"];
					const idt = trigger.target.playerid;
					const map = trigger.getParent().customArgs;
					if (!map[idt]) {
						map[idt] = {};
					}
					if (trigger.card.name == "sha") {
						if (typeof map[id].shanRequired != "number") {
							map[id].shanRequired = 1;
						}
						map[id].shanRequired++;
					} else {
						if (!map[idt].shaReq) {
							map[idt].shaReq = {};
						}
						if (!map[idt].shaReq[id]) {
							map[idt].shaReq[id] = 1;
						}
						map[idt].shaReq[id]++;
					}
				},
			},
		},
	}
```

### gz_shenfen 名字:神愤
描述: 限定技，出牌阶段，你可以对所有其他角色各造成1点伤害，令这些角色各自弃置装备区里的所有牌，然后依次弃置四张手牌，最后你移除此武将牌。
```js
gz_shenfen: {
		audio: "ol_shenfen",
		enable: "phaseUse",
		skillAnimation: true,
		animationColor: "metal",
		filter(event, player) {
			return player.checkMainSkill("gz_shenfen", false) || player.checkViceSkill("gz_shenfen", false);
		},
		limited: true,
		manualConfirm: true,
		filterTarget: lib.filter.notMe,
		selectTarget: -1,
		multiline: true,
		multitarget: true,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const targets = event.targets.sortBySeat();
			const damage = target => target.damage(),
				equip = target => {
					if (target.countDiscardableCards(target, "e")) {
						target.chooseToDiscard("e", true, target.countDiscardableCards(target, "e"));
					}
				},
				discard = target => {
					if (target.countDiscardableCards(target, "h")) {
						target.chooseToDiscard("h", true, 4);
					}
				};
			await game.doAsyncInOrder(targets, damage);
			await game.doAsyncInOrder(targets, equip);
			await game.doAsyncInOrder(targets, discard);
			if (player.checkMainSkill(event.name, false)) {
				await player.removeCharacter(0);
			} else {
				await player.removeCharacter(1);
			}
		},
		ai: {
			order: 10,
			result: {
				player(player) {
					let num = -10;
					game.countPlayer(current => {
						if (current != player) {
							num += get.damageEffect(current, player, player);
						}
					});
					return num;
				},
			},
		},
	}
```

## gz_shen_caocao 名字:神曹操 势力:shen

### gz_guixin 名字:归心
描述: 你受到伤害后，可以获得所有其他角色区域里的各一张牌，然后此技能失效直到你的下回合开始。
```js
gz_guixin: {
		audio: "guixin",
		trigger: {
			player: "damageEnd",
		},
		filter(event, player) {
			return game.hasPlayer(current => current != player && current.countGainableCards(player, "hej"));
		},
		logTarget(event, player) {
			return game.filterPlayer(current => current != player).sortBySeat(_status.currentPhase);
		},
		async content(event, trigger, player) {
			await player.gainMultiple(event.targets, "hej");
			player.tempBanSkill(event.name, { player: "phaseBegin" });
		},
	}
```

### gz_feiying 名字:飞影
描述: 锁定技，其他角色计算与你的距离+1。
```js
gz_feiying: {
		mod: {
			globalTo(from, to, distance) {
				return distance + 1;
			},
		},
	}
```

## gz_shen_zhouyu 名字:神周瑜 势力:shen

### gz_qinyin 名字:琴音
描述: 弃牌阶段结束时，若你此阶段至少弃置过两张手牌，你可以令所有角色各失去1点体力或回复1点体力。
```js
gz_qinyin: {
		audio: "qinyin",
		trigger: { player: "phaseDiscardEnd" },
		logAudio(event) {
			const num = event.cost_data;
			if (typeof num == "number") {
				return `qinyin${num + 1}.mp3`;
			}
			return 2;
		},
		filter(event, player) {
			const cards = [];
			player.getHistory("lose", function (evt) {
				if (evt.type == "discard" && evt.getParent("phaseDiscard") == event) {
					cards.addArray(evt.cards2);
				}
			});
			return cards.length > 1;
		},
		async cost(event, trigger, player) {
			let recover = 0,
				lose = 0,
				players = game.filterPlayer();
			for (let i = 0; i < players.length; i++) {
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
			const result = await player
				.chooseControl("失去体力", "回复体力", "cancel2")
				.set("prompt", get.prompt2(event.skill))
				.set("ai", function () {
					const { lose, recover } = get.event();
					if (lose > recover && lose > 0) {
						return 0;
					}
					if (lose < recover && recover > 0) {
						return 1;
					}
					return 2;
				})
				.set("lose", lose)
				.set("recover", recover)
				.forResult();
			if (result.control != "cancel2") {
				event.result = {
					bool: true,
					cost_data: result.index,
				};
			}
		},
		async content(event, trigger, player) {
			const doThing = [target => target.loseHp(), target => target.recover()][event.cost_data],
				targets = game.filterPlayer();
			await game.doAsyncInOrder(targets, doThing);
		},
		ai: {
			expose: 0.1,
			threaten: 2,
		},
	}
```

### gz_yeyan 名字:业炎
描述: 限定技，出牌阶段，你可以选择至多三名角色，对这些角色各造成1点伤害。
```js
gz_yeyan: {
		audio: "yeyan",
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "fire",
		filterTarget: true,
		selectTarget: [1, 3],
		line: "fire",
		multiline: true,
		multitarget: true,
		forceDie: true,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const damage = target => target.damage("fire");
			await game.doAsyncInOrder(event.targets.sortBySeat(), damage);
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					return get.damageEffect(target, player, target);
				},
			},
		},
	}
```

## gz_shen_simayi 名字:神司马懿 势力:shen

### gz_jilve 名字:极略
描述: `①你明置此武将牌时，获得${get.poptip("guicai")}。②你确定势力后，若为：蜀，获得${get.poptip("fakejizhi")}；魏，获得${get.poptip("gz_fangzhu")}；吴，获得${get.poptip("gz_zhiheng")}；群，获得${get.poptip("wansha")}；野心家，减少半个阴阳鱼并获得上述全部技能。`
```js
gz_jilve: {
		audio: "jilue",
		trigger: {
			global: "changeGroupInGuozhan",
			player: "showCharacterAfter",
		},
		filter(event, player) {
			const skills = get.info("gz_jilve").getSkills(event, player);
			return skills?.some(skill => !player.hasSkill(skill, null, false, false));
		},
		getSkills(event, player) {
			const skills = [];
			if (
				event.name == "showCharacter" &&
				event.toShow?.some(name => {
					return get.character(name, 3).includes("gz_jilve");
				})
			) {
				skills.add("guicai");
			}
			const groups = ["ye", "wei", "shu", "wu", "qun"];
			if (!groups.includes(player.identity)) {
				return skills;
			}
			if (event.name != "showCharacter") {
				const index = event.targets?.indexOf(player);
				if (index < 0 || event.fromGroups[index] == "shen" || event.fromGroups[index] == event.toGroup) {
					return skills;
				}
			} else {
				if (event.num != 2 && !player.isUnseen(1 - event.num)) {
					return skills;
				}
			}
			const index = groups.indexOf(player.identity);
			if (index == 0) {
				skills.addArray(get.info("gz_jilve").derivation.slice(1));
			} else {
				skills.add(get.info("gz_jilve").derivation[index]);
			}
			return skills;
		},
		async cost(event, trigger, player) {
			const skills = get.info(event.skill).getSkills(trigger, player);
			let prompt = `获得${skills.map(i => `【${get.translation(i)}】`)}`;
			if (player.identity == "ye" && skills.length > 1) {
				prompt = `减少1个阴阳鱼并${prompt}`;
			}
			event.result = {
				bool: true,
				cost_data: skills,
			};
		},
		async content(event, trigger, player) {
			const skills = event.cost_data;
			if (player.identity == "ye" && skills.length > 1) {
				if (typeof player.singleHp == "boolean") {
					if (player.hasMark("yinyang_mark")) {
						player.removeMark("yinyang_mark", 1);
					} else {
						player.addMark("yinyang_mark", 1);
						player.maxHp--;
					}
					player.singleHp = !player.singleHp;
				} else {
					player.maxHp--;
				}
				player.update();
			}
			await player.addSkills(skills);
		},
		derivation: ["guicai", "gz_fangzhu", "fakejizhi", "gz_zhiheng", "wansha"],
	}
```

### gz_lianpo 名字:连破
描述: 一名角色的回合结束后，若你本回合杀死过角色，你可以执行一个额外回合。
```js
gz_lianpo: {
		audio: "lianpo",
		trigger: {
			global: "phaseAfter",
		},
		frequent: true,
		filter(event, player) {
			return player.getStat("kill") > 0;
		},
		async content(event, trigger, player) {
			player.insertPhase();
		},
	}
```

## gz_shen_luxun 名字:神陆逊 势力:shen

### gz_junlve 名字:军略
描述: 锁定技，你造成或受到1点伤害后，获得1枚“军略”。
```js
gz_junlve: {
		audio: "nzry_junlve",
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		forced: true,
		getIndex(event) {
			return event.num;
		},
		intro: {
			content: "mark",
		},
		onremove: true,
		async content(event, trigger, player) {
			player.addMark(event.name, 1);
		},
		ai: {
			combo: "gz_cuike",
		},
	}
```

### gz_cuike 名字:摧克
描述: 出牌阶段开始时，你可以选择一名角色，若你的“军略”数为：奇数，对其造成1点伤害；偶数，令其横置，然后弃置其区域里的一张牌。
```js
gz_cuike: {
		audio: "nzry_cuike",
		trigger: {
			player: "phaseUseBegin",
		},
		async cost(event, trigger, player) {
			const prompt = player.countMark("gz_junlve") % 2 == 1 ? "对一名角色造成1点伤害" : "横置一名角色并弃置其区域里一张牌";
			event.result = await player
				.chooseTarget(get.prompt(event.skill), prompt)
				.set("ai", target => {
					const player = get.player(),
						bool = player.countMark("gz_junlve") % 2 == 1;
					if (bool) {
						return get.damageEffect(target, player, player);
					}
					return get.effect(target, { name: "guohe" }, player, player);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (player.countMark("gz_junlve") % 2 == 1) {
				await target.damage();
			} else {
				await target.link(true);
				await player.discardPlayerCard(target, 1, "hej", true);
			}
		},
	}
```

### gz_zhanhuo 名字:绽火
描述: 限定技，出牌阶段，你可以移去所有“军略”并选择至多等量名横置角色，弃置这些角色装备区里的所有牌，然后对其中一名角色造成1点火焰伤害。
```js
gz_zhanhuo: {
		audio: "nzry_dinghuo",
		limited: true,
		skillAnimation: true,
		animationColor: "metal",
		enable: "phaseUse",
		filter(event, player) {
			return player.countMark("gz_junlve") > 0;
		},
		check(event, player) {
			let num = game.countPlayer(function (current) {
				return get.attitude(player, current) < 0 && current.isLinked();
			});
			return (
				player.countMark("gz_junlve") >= num &&
				num ==
					game.countPlayer(function (current) {
						return get.attitude(player, current) < 0;
					})
			);
		},
		filterTarget(card, player, target) {
			return target.isLinked();
		},
		selectTarget() {
			return [1, _status.event.player.countMark("gz_junlve")];
		},
		multiline: true,
		multitarget: true,
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			player.clearMark("gz_junlve");
			const lose_list = [];
			for (const target of event.targets) {
				if (target.countDiscardableCards(player, "e")) {
					lose_list.add([target, target.getDiscardableCards(player, "e")]);
				}
			}
			if (lose_list?.length) {
				await game
					.loseAsync({
						lose_list: lose_list,
						discarder: player,
					})
					.setContent("discardMultiple");
			}
			const result = await player
				.chooseTarget("绽火：对一名目标角色造成1点火焰伤害", true, (card, player, target) => {
					return get.event().targets.includes(target);
				})
				.set("targets", event.targets)
				.set("ai", target => {
					const player = get.player();
					return get.damageEffect(target, player, player, "fire");
				})
				.forResult();
			if (result?.bool) {
				const target = result.targets[0];
				await target.damage("fire", "nocard");
			}
		},
		ai: {
			order: 1,
			fireAttack: true,
			combo: "gz_junlve",
			result: {
				target(player, target) {
					if (target.hasSkillTag("nofire")) {
						return 0;
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

## gz_shen_ganning 名字:神甘宁 势力:shen

### gz_poxi 名字:魄袭
```js
gz_poxi: {
		inherit: "gz_kuiji",
		audio: "drlt_poxi",
	}
```

### gz_gn_jieying 名字:劫营
描述: ①游戏开始时或回合开始时，若场上没有“营”，你获得一枚“营”。②回合结束时，你可以移动“营”。③有“营”的其他角色的回合结束后，你获得其所有手牌和“营”。④有“营”的角色摸牌阶段额外摸一张牌，出杀次数和手牌上限+1。
```js
gz_gn_jieying: {
		audio: "drlt_jieying",
		trigger: {
			global: "phaseBefore",
			player: ["enterGame", "phaseBegin"],
		},
		filter(event, player, name) {
			if (name == "phaseBefore" && game.phaseNumber != 0) {
				return false;
			}
			return !game.hasPlayer(current => current.hasMark("gz_gn_jieying_mark"));
		},
		forced: true,
		locked: false,
		async content(event, trigger, player) {
			player.addMark("gz_gn_jieying_mark", 1);
		},
		global: "gz_gn_jieying_mark",
		group: ["gz_gn_jieying_effect"],
		subSkill: {
			effect: {
				audio: "gz_gn_jieying",
				trigger: {
					global: ["phaseEnd", "phaseAfter"],
				},
				filter(event, player, name) {
					if ((name == "phaseAfter") === (player == event.player)) {
						return false;
					}
					return event.player?.isIn() && event.player.hasMark("gz_gn_jieying_mark");
				},
				async cost(event, trigger, player) {
					if (event.triggername == "phaseEnd") {
						event.result = await player
							.chooseTarget(get.prompt(event.skill), "将“营”交给一名角色", (card, player, target) => {
								return target != player && !target.hasMark("gz_gn_jieying_mark");
							})
							.set("ai", target => {
								let th = target.countCards("h"),
									att = get.attitude(_status.event.player, target);
								for (let i in target.skills) {
									let info = get.info(i);
									if (!info) {
										continue;
									}
									if (get.skillInfoTranslation(i, target).includes("【杀】")) {
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
							})
							.forResult();
					} else {
						event.result = {
							bool: true,
							targets: [trigger.player],
						};
					}
				},
				async content(event, trigger, player) {
					const target = event.targets[0];
					if (event.triggername == "phaseEnd") {
						const num = player.countMark("gz_gn_jieying_mark");
						player.removeMark("gz_gn_jieying_mark", num, false);
						target.addMark("gz_gn_jieying_mark", num, false);
						game.log(player, "将", "#g“营”", "移动给了", target);
					} else {
						const cards = target.getGainableCards(player, "h");
						if (cards?.length) {
							await target.give(cards, player);
						}
						const num = target.countMark("gz_gn_jieying_mark");
						target.removeMark("gz_gn_jieying_mark", num, false);
						player.addMark("gz_gn_jieying_mark", num, false);
						game.log(player, "收回了", target, "的", "#g“营”");
					}
				},
			},
			mark: {
				marktext: "营",
				intro: {
					name2: "营",
					content: "mark",
				},
				trigger: {
					player: "phaseDrawBegin2",
				},
				filter(event, player) {
					if (!game.hasPlayer(current => current.hasSkill("gz_gn_jieying"))) {
						return false;
					}
					return !event.numFixed && player.hasMark("gz_gn_jieying_mark");
				},
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					const num = game.countPlayer(current => {
						return current.hasSkill("gz_gn_jieying");
					});
					trigger.num += num;
				},
				mod: {
					cardUsable(card, player, num) {
						if (player.hasMark("gz_gn_jieying_mark") && card.name == "sha") {
							return (
								num +
								game.countPlayer(function (current) {
									return current.hasSkill("gz_gn_jieying");
								})
							);
						}
					},
					maxHandcard(player, num) {
						if (player.hasMark("gz_gn_jieying_mark")) {
							return (
								num +
								game.countPlayer(function (current) {
									return current.hasSkill("gz_gn_jieying");
								})
							);
						}
					},
					aiOrder(player, card, num) {
						if (
							player.hasMark("gz_gn_jieying_mark") &&
							game.hasPlayer(current => {
								return current.hasSkill("gz_gn_jieying") && get.attitude(player, current) <= 0;
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
							player.hasMark("gz_gn_jieying_mark") &&
							game.hasPlayer(current => {
								return current.hasSkill("gz_gn_jieying") && get.attitude(player, current) <= 0;
							})
						);
					},
				},
			},
		},
	}
```

## gz_shen_zhangliao 名字:神张辽 势力:shen

### gz_duorui 名字:夺锐
描述: 你于出牌阶段对其他角色造成伤害后，可以获得其区域里各一张牌。然后若你本回合以此法获得的牌大于两张，你可以选择一名本回合受到过伤害的角色，令其一个技能失效直到其回合结束。
```js
gz_duorui: {
		audio: "drlt_duorui",
		trigger: {
			source: "damageSource",
		},
		filter(event, player) {
			if (!player.isPhaseUsing() || player == event.player) {
				return false;
			}
			return event.player?.isIn() && event.player.countGainableCards(player, "hej");
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const pos = trigger.player
				.getGainableCards(player, "hej")
				.map(card => get.position(card))
				.toUniqued();
			if (!pos?.length) {
				return;
			}
			await player
				.gainPlayerCard(trigger.player, "hej", pos.length, true)
				.set("filterButton", button => {
					return !ui.selected.buttons?.some(but => get.position(but.link) == get.position(button.link));
				})
				.set("complexSelect", true);
			const num = player
				.getHistory("gain", evt => {
					return evt.getParent(2)?.name == event.name && evt.getParent(2).player == player;
				})
				.reduce((sum, evt) => sum + evt?.cards?.length, 0);
			if (num <= 2) {
				return;
			}
			const targets = game.filterPlayer(current => {
				if (!current.hasHistory("damage")) {
					return false;
				}
				return (
					current.getSkills(null, false, false).filter(skill => {
						let info = get.info(skill);
						if (!info || info.charlotte || get.skillInfoTranslation(skill, current).length == 0) {
							return false;
						}
						return !current.getStorage("gz_duorui_tieqi").includes(skill);
					}).length > 0
				);
			});
			if (!targets?.length) {
				return;
			}
			const result = await player
				.chooseTarget("夺锐：是否令一名本回合受过伤的角色失效一个技能？", (card, player, target) => {
					return get.event().selectTarget.includes(target);
				})
				.set("selectTarget", targets)
				.set("ai", target => {
					const player = get.player();
					return -get.attitude(player, target) * target.hp;
				})
				.forResult();
			if (!result.bool) {
				return;
			}
			const target = result.targets[0];
			player.line(target, "green");
			const skills = target.getSkills(null, false, false).filter(skill => {
				let info = get.info(skill);
				if (!info || info.charlotte || get.skillInfoTranslation(skill, target).length == 0) {
					return false;
				}
				return !target.getStorage("gz_duorui_tieqi").includes(skill);
			});
			if (!skills?.length) {
				return;
			}
			const result2 =
				skills.length > 1
					? await player.chooseButton([`令${get.translation(target)}失效一个技能直到其回合结束`, [skills, "skill"]], true).forResult()
					: {
							bool: true,
							links: skills,
						};
			if (result2?.bool) {
				const skill = result2.links[0],
					name = "gz_duorui_tieqi";
				target.markAuto(name, skill);
				target.addTempSkill(name, { player: "phaseEnd" });
				get.info(name).init(target, name);
			}
		},
		subSkill: {
			tieqi: {
				init(player, skill) {
					player.addSkillBlocker(skill);
					player.getStorage(skill).forEach(name => {
						player.addTip(`${skill}_${name}`, `夺锐 ${get.translation(name)}失效`);
					});
				},
				onremove(player, skill) {
					player.removeSkillBlocker(skill);
					player.getStorage(skill).forEach(name => {
						player.removeTip(`${skill}_${name}`);
					});
					player.setStorage(skill, [], true);
				},
				charlotte: true,
				skillBlocker(skill, player) {
					if (lib.skill[skill].persevereSkill || lib.skill[skill].charlotte) {
						return false;
					}
					return player.getStorage("gz_duorui_tieqi").includes(skill);
				},
				mark: true,
				intro: {
					content(storage, player, skill) {
						let list = player.getSkills(null, false, false).filter(function (i) {
							return lib.skill.gz_duorui_tieqi.skillBlocker(i, player);
						});
						if (list.length) {
							return "失效技能：" + get.translation(list);
						}
						return "无失效技能";
					},
				},
			},
		},
	}
```

### gz_zhiti 名字:止啼
描述: 锁定技，若存活的已受伤角色数：大于1，你摸牌阶段额外摸一张牌；大于2，你出杀次数+1。
```js
gz_zhiti: {
		audio: "drlt_zhiti",
		trigger: {
			player: "phaseDrawBegin2",
		},
		filter(event, player) {
			return game.countPlayer(current => current.isDamaged()) > 1 && !event.numFixed;
		},
		forced: true,
		async content(event, trigger, player) {
			trigger.num++;
		},
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha" && game.countPlayer(current => current.isDamaged()) > 2) {
					return num + 1;
				}
			},
		},
	}
```

## gz_shen_liubei 名字:神刘备 势力:shen

### gz_longnu 名字:龙怒
描述: 转换技，锁定技，出牌阶段开始时，阳：你摸一张牌并失去1点体力，本回合红色手牌视为无距离限制的火【杀】；阴：你减少1点体力上限并摸一张牌，本回合锦囊手牌视为无次数限制的雷【杀】。
```js
gz_longnu: {
		audio: "nzry_longnu",
		trigger: {
			player: "phaseUseBegin",
		},
		zhuanhuanji: true,
		forced: true,
		marktext: "☯",
		intro: {
			content(storage, player) {
				if (storage === true) {
					return "锁定技，出牌阶段开始时，你减少1点体力上限并摸一张牌，然后本回合你的锦囊手牌均视为无次数限制的雷杀";
				}
				return "锁定技，出牌阶段开始时，你摸一张牌并失去1点体力，然后本回合你的红色手牌均视为无距离限制的火杀";
			},
		},
		async content(event, trigger, player) {
			player.changeZhuanhuanji(event.name);
			if (player.getStorage(event.name, false)) {
				await player.draw();
				await player.loseHp();
				player.addTempSkill("gz_longnu_fire");
			} else {
				await player.loseMaxHp();
				await player.draw();
				player.addTempSkill("gz_longnu_thunder");
			}
		},
		init(player, skill) {
			player.addSkill("gz_longnu_mark");
		},
		subSkill: {
			mark: {
				charlotte: true,
				trigger: { player: ["hideCharacterBegin", "showCharacterEnd"] },
				filter(event, player) {
					if (event.name == "hideCharacter") {
						return get.character(event.toHide, 3).includes("gz_longnu");
					}
					return event.toShow?.some(name => {
						return get.character(name, 3).includes("gz_longnu");
					});
				},
				forced: true,
				popup: false,
				firstDo: true,
				async content(event, trigger, player) {
					player[(trigger.name == "hideCharacter" ? "un" : "") + "markSkill"]("gz_longnu");
				},
			},
			fire: {
				charlotte: true,
				mod: {
					cardname(card, player) {
						if (get.color(card) == "red" && get.position(card) == "h") {
							return "sha";
						}
					},
					cardnature(card, player) {
						if (get.color(card) == "red" && get.position(card) == "h") {
							return "fire";
						}
					},
					targetInRange(card) {
						if (get.color(card) == "red" && get.position(card) == "h") {
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
			thunder: {
				charlotte: true,
				mod: {
					cardname(card, player) {
						if (["trick", "delay"].includes(lib.card[card.name].type) && get.position(card) == "h") {
							return "sha";
						}
					},
					cardnature(card, player) {
						if (["trick", "delay"].includes(lib.card[card.name].type) && get.position(card) == "h") {
							return "thunder";
						}
					},
					cardUsable(card) {
						if (["trick", "delay"].includes(lib.card[card.name].type) && get.position(card) == "h") {
							return Infinity;
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
		},
	}
```

### gz_jieying 名字:结营
描述: 锁定技，①游戏开始时，你横置；当你重置时，防止之。②回合结束时，你横置一名未横置的角色。③所有横置的角色手牌上限+2。
```js
gz_jieying: {
		audio: "nzry_jieying",
		trigger: {
			player: ["linkBefore", "enterGame", "phaseEnd"],
			global: "phaseBefore",
		},
		forced: true,
		filter(event, player, name) {
			if (name == "phaseEnd") {
				return game.hasPlayer(current => !current.isLinked());
			}
			if (event.name == "link") {
				return player.isLinked();
			}
			return event.name != "phase" || game.phaseNumber == 0;
		},
		async content(event, trigger, player) {
			switch (event.triggername) {
				case "phaseEnd": {
					const targets = game.filterPlayer(current => !current.isLinked());
					if (!targets?.length) {
						return;
					}
					const result =
						targets.length > 1
							? await player
									.chooseTarget("结营：横置一名角色", true, (card, player, target) => {
										return !target.isLinked();
									})
									.set("ai", target => {
										const player = get.player();
										return get.effect(target, { name: "tiesuo" }, player, player);
									})
									.forResult()
							: {
									bool: true,
									targets: targets,
								};
					if (result.bool) {
						player.line(result.targets, "green");
						await result.targets[0].link(true);
					}
					break;
				}
				case "linkBefore": {
					trigger.cancel();
					break;
				}
				default: {
					await player.link(true);
					break;
				}
			}
		},
		ai: {
			noLink: true,
			effect: {
				target(card) {
					if (card.name == "tiesuo") {
						return "zeroplayertarget";
					}
				},
			},
		},
		global: "gz_jieying_global",
		subSkill: {
			global: {
				mod: {
					maxHandcard(player, num) {
						const count = game.countPlayer(function (current) {
							return current.hasSkill("gz_jieying");
						});
						if (count > 0 && player.isLinked()) {
							return num + 2 * count;
						}
					},
				},
			},
		},
	}
```

## gz_shen_zhugeliang 名字:神诸葛亮 势力:shen

### gz_qixing 名字:七星
描述: 游戏开始时，你将牌堆顶七张牌扣置于武将牌上，称为“星”，然后/摸牌阶段结束时，你可以用任意张手牌替换等量的“星”。
```js
gz_qixing: {
		audio: "qixing",
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
			const gainEvent = player.addToExpansion(get.cards(7), "draw");
			gainEvent.gaintag.add("gz_qixing");
			await gainEvent;
			const next = game.createEvent("qixingChose", false);
			next.player = player;
			next.setContent(get.info("gz_qixing_draw").cost);
			const { bool, cost_data } = await next.forResult();
			if (bool) {
				const next = game.createEvent("qixingChange", false);
				next.player = player;
				next.cost_data = cost_data;
				next.setContent(get.info("gz_qixing_draw").content);
				await next;
			}
		},
		intro: {
			markcount: "expansion",
			mark(dialog, storage, player) {
				let cards = player.getExpansions("gz_qixing");
				if (cards?.length) {
					if (player == game.me || player.isUnderControl()) {
						dialog.addAuto(cards);
					} else {
						return "共有" + get.cnNumber(cards.length) + "张星";
					}
				}
			},
			content(storage, player) {
				let cards = player.getExpansions("gz_qixing");
				if (cards?.length) {
					if (player == game.me || player.isUnderControl()) {
						return get.translation(cards);
					}
					return "共有" + get.cnNumber(cards.length) + "张星";
				}
			},
		},
		group: ["gz_qixing_draw"],
		ai: {
			mingzhi: true,
			notemp: true,
		},
		subSkill: {
			draw: {
				audio: "gz_qixing",
				trigger: { player: "phaseDrawEnd" },
				filter(event, player) {
					return player.getExpansions("gz_qixing").length > 0 && player.countCards("h") > 0;
				},
				async cost(event, trigger, player) {
					const cards = player.getExpansions("gz_qixing");
					if (!cards?.length || !player.countCards("h")) {
						event.result = {
							bool: false,
						};
						return;
					}
					const { moved } = await player
						.chooseToMove("七星：是否交换“星”和手牌？")
						.set("list", [
							[get.translation(player) + "（你）的星", cards],
							["手牌区", player.getCards("h")],
						])
						.set("filterMove", function (from, to) {
							return typeof to != "number";
						})
						.set("processAI", function (list) {
							let player = _status.event.player,
								cards = list[0][1].concat(list[1][1]).sort(function (a, b) {
									return get.value(a) - get.value(b);
								}),
								cards2 = cards.splice(0, player.getExpansions("gz_qixing").length);
							return [cards2, cards];
						})
						.forResult();
					const [pushs, gains] = moved;
					pushs.removeArray(player.getExpansions("gz_qixing"));
					gains.removeArray(player.getCards("h"));
					if (!pushs.length || pushs.length != gains.length) {
						event.result = {
							bool: false,
						};
						return;
					}
					event.result = {
						bool: true,
						cost_data: [pushs, gains],
					};
				},
				async content(event, trigger, player) {
					const [pushs, gains] = event.cost_data;
					const gainEvent = player.addToExpansion(pushs, player, "giveAuto");
					gainEvent.gaintag.add("gz_qixing");
					await gainEvent;
					await player.gain(gains, "draw");
				},
			},
		},
	}
```

### gz_kuangfeng 名字:狂风
描述: 结束阶段，你可以移去一张“星”并选择一个势力，令该势力的所有角色受到的火焰伤害+1直到你的准备阶段。
```js
gz_kuangfeng: {
		audio: "kuangfeng",
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.getExpansions("gz_qixing").length;
		},
		async cost(event, trigger, player) {
			const groups = ["wei", "shu", "wu", "qun", "jin", "ye"];
			if (_status.bannedGroup) {
				groups.remove(_status.bannedGroup?.slice(6));
			}
			game.filterPlayer(current => {
				if (current.identity != "unknown") {
					groups.add(current.identity);
				}
			});
			const { bool, links } = await player
				.chooseButton([get.prompt2(event.skill), [groups.map(i => [i, get.translation(i)]), "tdnodes"], player.getExpansions("gz_qixing")], 2)
				.set("filterButton", button => {
					const check = button => typeof button.link == "string";
					if (ui.selected.buttons?.length) {
						game.filterPlayer(current => {
							if (current.identity == ui.selected.buttons[0].link) {
								current.prompt("狂风", "fire");
								current.classList.add("selected");
							}
						});
						return check(button) != check(ui.selected.buttons[0]);
					}
					return true;
				})
				.set("complexSelect", true)
				.set("ai", button => {
					if (!ui.selected.buttons?.length) {
						if (typeof button.link != "string") {
							return 0;
						}
						let num = 0;
						game.filterPlayer(current => {
							if (current.identity != button.link) {
								return false;
							}
							num -= get.attitude(get.player(), current);
						});
						return num;
					}
					return 1;
				})
				.forResult();
			if (bool) {
				event.result = {
					bool: true,
					cards: [links[1]],
					cost_data: links[0],
				};
				const targets = game.filterPlayer(current => current.identity == links[0]);
				if (targets?.length) {
					event.result.targets = targets;
				}
			}
		},
		async content(event, trigger, player) {
			const { cost_data: group, cards } = event;
			player.addTempSkill("gz_kuangfeng_effect", { player: "phaseZhunbeiBegin" });
			player.markAuto("gz_kuangfeng_effect", group);
			await player.loseToDiscardpile(cards);
		},
		ai: {
			combo: "gz_qixing",
		},
		global: "gz_kuangfeng_ai",
		subSkill: {
			ai: {
				ai: {
					effect: {
						target(card, player, target, current) {
							if (!game.hasPlayer(owner => owner.getStorage("gz_kuangfeng_effect").includes(target.identity))) {
								return;
							}
							if (get.tag(card, "fireDamage") && current < 0) {
								return 1.5;
							}
						},
					},
				},
			},
			effect: {
				intro: {
					markcount: () => null,
					content: "狂风令<span class = 'firetext'>$</span>势力受到的火焰伤害+1",
				},
				trigger: { global: "damageBegin3" },
				filter(event, player) {
					return event.hasNature("fire") && player.getStorage("gz_kuangfeng_effect").includes(event.player.identity);
				},
				charlotte: true,
				forced: true,
				logTarget: "player",
				async content(event, trigger, player) {
					trigger.num++;
				},
				onremove: true,
			},
		},
	}
```

### gz_dawu 名字:大雾
描述: 结束阶段，你可以移去任意张“星”并选择等量同势力角色，令这些角色受到的非属性伤害-1直到你的回合开始。
```js
gz_dawu: {
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return player.getExpansions("gz_qixing").length;
		},
		audio: "dawu",
		async cost(event, trigger, player) {
			const { bool, targets, links: cost_data } = await player
				.chooseButtonTarget({
					createDialog: [get.prompt2(event.skill), player.getExpansions("gz_qixing")],
					selectButton: [1, game.countPlayer()],
					filterTarget(card, player, target) {
						return player.isFriendOf(target);
					},
					selectTarget() {
						return ui.selected.buttons.length;
					},
					complexSelect: true,
					ai1(button) {
						const { player, allUse } = get.event();
						const targets = game.filterPlayer(target => {
							if (target.isMin() || target.hasSkill("biantian2") || target.hasSkill("gz_dawu_mark")) {
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
						if (target.isMin() || target.hasSkill("biantian2") || target.hasSkill("gz_dawu_mark")) {
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
				.set(
					"allUse",
					player.getExpansions("gz_qixing").length >=
						game.countPlayer(current => {
							return player.isFriendOf(current) && get.attitude(player, current) > 4;
						}) *
							2
				)
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
				target.addAdditionalSkill(`gz_dawu_${player.playerid}`, "gz_dawu_mark");
				target.markAuto("gz_dawu_mark", [player]);
			});
			player.addTempSkill("gz_dawu_effect", { player: "phaseBeginStart" });
			await player.loseToDiscardpile(cards);
		},
		ai: {
			combo: "gz_qixing",
		},
		subSkill: {
			mark: {
				charlotte: true,
				ai: {
					nodamage: true,
					effect: {
						target(card, player, target, current) {
							if (get.tag(card, "damage") && !get.tag(card, "natureDamage")) {
								return "zeroplayertarget";
							}
						},
					},
				},
				intro: {
					content: "<span class = 'thundertext'>$</span>令大雾保护了你",
				},
			},
			effect: {
				trigger: { global: "damageBegin4" },
				filter(event, player) {
					return !event.hasNature() && event.player.getStorage("gz_dawu_mark").includes(player);
				},
				forced: true,
				charlotte: true,
				logTarget: "player",
				async content(event, trigger, player) {
					trigger.num--;
				},
				onremove(player) {
					game.countPlayer2(current => {
						if (current.getStorage("gz_dawu_mark").includes(player)) {
							current.unmarkAuto("gz_dawu_mark", [player]);
							current.removeAdditionalSkill(`gz_dawu_${player.playerid}`);
						}
					}, true);
				},
			},
		},
	}
```

## gz_zhugedan 名字:诸葛诞 势力:ye

### gz_gongao 名字:功獒
描述: 锁定技，其他角色死亡时，你增加1点体力上限并恢复1点体力；准备阶段，你将手牌摸至体力上限。
```js
gz_gongao: {
		audio: "gongao",
		trigger: {
			player: "phaseZhunbeiBegin",
			global: "die",
		},
		forced: true,
		filter(event, player) {
			if (event.name == "die") {
				return event.player != player;
			}
			return player.countCards("h") < player.maxHp;
		},
		async content(event, trigger, player) {
			if (trigger.name == "die") {
				await player.gainMaxHp();
				await player.recover();
			} else {
				await player.drawTo(player.maxHp);
			}
		},
		ai: {
			threaten: 114514,
		},
	}
```

## gz_pot_weiyan 名字:魏延 势力:ye

### gz_new_kuanggu 名字:狂骨
描述: ①当你造成或受到1点伤害后，你可以摸一张牌。②你使用单目标伤害牌可以额外指定至多X个目标（X为你已损失的体力值+1），
```js
gz_new_kuanggu: {
		audio: "potkuanggu_pot_weiyan_achieve",
		trigger: {
			player: "damageEnd",
			source: "damageSource",
		},
		getIndex(event) {
			return event.num || 0;
		},
		frequent: true,
		async content(event, trigger, player) {
			await player.draw();
		},
		locked: false,
		mod: {
			selectTarget(card, player, range) {
				if (range[1] == -1 || !get.is.damageCard(card)) {
					return;
				}
				let info = lib.card[card.name];
				if (!info || info.notarget || info.selectTarget != 1) {
					return;
				}
				let num = player.getDamagedHp() + 1;
				range[1] += num;
			},
		},
	}
```

## gz_sb_lvbu 名字:吕布 势力:ye

### gz_wuchang 名字:无常
描述: 锁定技，①你获得其他角色的牌后，本回合对该势力角色造成的伤害+1。②场上势力数减少后，你摸两张牌或将一张牌当作【出其不意】使用。
```js
gz_wuchang: {
		audio: ["olyuyu", "ollbzhiji"],
		logAudio: () => "olyuyu",
		trigger: {
			player: "gainAfter",
			global: "loseAsyncAfter",
		},
		forced: true,
		getIndex(event, player) {
			if (!event.getg || !event.getl) {
				return [];
			}
			return game.filterPlayer(current => current != player && event.getl(current).cards2?.length);
		},
		filter(event, player, name, target) {
			const cards = event.getg(player);
			if (!cards.length || target.identity == "unknown") {
				return false;
			}
			return event.getl(target).cards2?.containsSome(...cards);
		},
		preHidden: true,
		logTarget(_1, _2, _3, target) {
			return target;
		},
		async content(event, trigger, player) {
			const skill = `${event.name}_effect`,
				map = player.getStorage(skill, new Map()),
				group = event.targets[0].identity;
			player.addTempSkill(skill);
			let num = (map.has(group) ? map.get(group) : 0) + 1;
			map.set(group, num);
			player.setStorage(skill, map, true);
		},
		group: "gz_wuchang_draw",
		subSkill: {
			draw: {
				audio: "gz_wuchang",
				logAudio: () => "ollbzhiji",
				trigger: {
					global: ["dieAfter", "changeGroupInGuozhan", "diaohulishanAfter"],
				},
				filter(event, player, name) {
					if (event.name == "die") {
						return event.player && !game.hasPlayer(current => current.isFriendOf(event.player));
					}
					if (event.name == "diaohulishan") {
						return event.target && !game.hasPlayer(current => current.isFriendOf(event.target));
					}
					let groups = event.fromGroups.reduce((groups, group, index) => {
						if (group === "ye") {
							groups.add(`ye${index}`);
						}
						if (!game.hasPlayer(current => current.identity == group)) {
							groups.add(group);
						}
						return groups;
					}, []);
					return groups.length > 1 || game.hasPlayer(current => !event.targets.includes(current) && current.identity == event.toGroup);
				},
				forced: true,
				async content(event, trigger, player) {
					const result = await player
						.chooseToUse()
						.set("openskilldialog", "###无常###将一张牌当【出其不意】使用，或点取消摸两张牌")
						.set("norestore", true)
						.set("_backupevent", "gz_wuchang_backup")
						.set("custom", {
							add: {},
							replace: { window() {} },
						})
						.backup("gz_wuchang_backup")
						.forResult();
					if (!result?.bool) {
						await player.draw(2);
					}
				},
			},
			backup: {
				audio: "gz_wuchang",
				logAudio: () => "ollbzhiji",
				filterCard(card) {
					return get.itemtype(card) == "card";
				},
				position: "hes",
				viewAs: {
					name: "chuqibuyi",
				},
				popname: true,
				prompt: "将一张牌当出其不意使用",
				check(card) {
					return 7 - get.value(card);
				},
			},
			effect: {
				intro: {
					markcount: () => null,
					content(storage, player) {
						if (!storage) {
							return "未发动过【无常】";
						}
						let list = [];
						storage.forEach((num, group) => {
							if (num > 0) {
								list.push(`对${get.translation(group)}势力造成的伤害+${num}`);
							}
						});
						return list.join("<br>");
					},
				},
				onremove: true,
				charlotte: true,
				trigger: {
					source: "damageBegin1",
				},
				audio: "gz_wuchang",
				logAudio: () => "olyuyu",
				filter(event, player) {
					const map = player.getStorage("gz_wuchang_effect", new Map()),
						group = event.player.identity;
					return group != "unknown" && map.has(group) && typeof map.get(group) == "number";
				},
				forced: true,
				async content(event, trigger, player) {
					const map = player.getStorage("gz_wuchang_effect", new Map()),
						group = trigger.player.identity;
					trigger.num += map.get(group);
				},
			},
		},
	}
```

### gz_liyu 名字:利驭
描述: ①出牌阶段开始时，你可以获得场上一张牌，然后失去牌的角色摸一张牌。②你使用【杀】的次数+X，你的【杀】需使用X张【闪】才能抵消（X为你装备区的牌数）。
```js
gz_liyu: {
		audio: ["sbwushuang", "sbliyu"],
		logAudio: () => ["sbliyu"],
		trigger: {
			player: "phaseUseBegin",
		},
		filter(event, player) {
			return game.hasPlayer(current => current.countGainableCards(player, "ej"));
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(`###${get.prompt(event.skill)}###获得一名角色场上一张牌，然后其摸一张牌`, (card, player, target) => {
					return target.countGainableCards(player, "ej");
				})
				.set("ai", target => {
					const player = get.player();
					const eff = name => get.effect(target, { name: name }, player, player);
					return eff("shunshou") + eff("draw");
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.gainPlayerCard(target, "ej", true);
			await target.draw();
		},
		locked: false,
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha" && player.countCards("e")) {
					return num + player.countCards("e");
				}
			},
		},
		group: "gz_liyu_wushuang",
		subSkill: {
			wushuang: {
				audio: "gz_liyu",
				logAudio: () => ["sbwushuang"],
				trigger: {
					player: "useCardToPlayered",
				},
				forced: true,
				locked: false,
				filter(event, player) {
					if (!player.countCards("e")) {
						return false;
					}
					return event.card.name == "sha" && !event.getParent().directHit.includes(event.target);
				},
				logTarget: "target",
				async content(event, trigger, player) {
					const id = trigger.target.playerid;
					const map = trigger.getParent().customArgs;
					if (!map[id]) {
						map[id] = {};
					}
					if (typeof map[id].shanRequired != "number") {
						map[id].shanRequired = 1;
					}
					const num = Math.max(0, player.countCards("e") - 1);
					map[id].shanRequired += num;
				},
				ai: {
					directHit_ai: true,
					skillTagFilter(player, tag, arg) {
						if (arg.card.name != "sha" || arg.target.countCards("h", "shan") > 1) {
							return false;
						}
					},
				},
			},
		},
	}
```

## gz_yl_yuanshu 名字:袁术 势力:ye

### gz_new_yongsi 名字:庸肆
描述: ①摸牌阶段，你可以多摸X张牌（X为小势力存活角色数）。②出牌阶段限一次，你可以获得两名其他角色各一张牌，然后若你本回合未造成过伤害，你弃置两张牌并失去1点体力。
```js
gz_new_yongsi: {
		audio: "drlt_yongsi",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countGainableCards(player, "he");
		},
		filter(event, player) {
			return game.hasPlayer(target => target != player && target.countGainableCards(player, "he"));
		},
		selectTarget: [1, 2],
		multiline: true,
		async content(event, trigger, player) {
			await player.gainPlayerCard(event.target, "he", true);
		},
		async contentAfter(event, trigger, player) {
			if (!player.getHistory("sourceDamage").length) {
				await player.chooseToDiscard(2, true, "he");
				await player.loseHp();
			}
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					const eff = name => get.effect(target, { name: name }, player, target);
					if (!player.getHistory("sourceDamage").length) {
						return Math.max(0, eff("guohe_copy2") + get.effect(player, { name: "losehp" }, player, player) / 2);
					}
					return eff("shunshou_copy2");
				},
			},
		},
		preHidden: ["yingzi"],
		group: "gz_new_yongsi_yingzi",
		subSkill: {
			yingzi: {
				audio: "drlt_yongsi",
				trigger: {
					player: "phaseDrawBegin2",
				},
				forced: true,
				filter(event, player) {
					if (event.numFixed) {
						return false;
					}
					return game.hasPlayer(current => current.identity != "unknown" && current.isNotMajor());
				},
				async content(event, trigger, player) {
					const num = game.countPlayer(current => current.identity != "unknown" && current.isNotMajor());
					trigger.num += num;
				},
			},
		},
	}
```

### gz_new_weidi 名字:伪帝
描述: 锁定技，若你的宝物栏空置且场上没有【玉玺】，你视为装备了【玉玺】。
```js
gz_new_weidi: {
		audio: "drlt_weidi",
		init(player, skill) {
			player.addExtraEquip(skill, "yuxi", true, player => player.hasEmptySlot(5) && lib.card.yuxi && !game.hasPlayer(current => current.getEquip("yuxi")));
		},
		onremove(player, skill) {
			player.removeExtraEquip(skill);
		},
		group: ["gz_new_weidi_draw", "gz_new_weidi_zhibi"],
		ai: {
			threaten(player, target) {
				if (
					game.hasPlayer(function (current) {
						return current.getEquip("yuxi");
					}) ||
					!target.hasEmptySlot(5)
				) {
					return 0.5;
				}
				return 2;
			},
			forceMajor: true,
			skillTagFilter(player, tag, arg) {
				return (
					!game.hasPlayer(function (current) {
						return current.getEquip("yuxi");
					}) && player.hasEmptySlot(5)
				);
			},
		},
		subSkill: {
			draw: {
				audio: "gz_new_weidi",
				equipSkill: true,
				noHidden: true,
				trigger: {
					player: "phaseDrawBegin2",
				},
				forced: true,
				filter(event, player) {
					if (event.numFixed || !player.hasEmptySlot(5)) {
						return false;
					}
					return !game.hasPlayer(function (current) {
						return current.getEquips("yuxi").length > 0;
					});
				},
				async content(event, trigger, player) {
					trigger.num++;
				},
			},
			zhibi: {
				audio: "gz_new_weidi",
				trigger: {
					player: "phaseUseBegin",
				},
				forced: true,
				noHidden: true,
				equipSkill: true,
				filter(event, player) {
					if (!player.hasEmptySlot(5)) {
						return false;
					}
					return (
						game.hasPlayer(function (current) {
							return player.canUse("zhibi", current);
						}) &&
						!game.hasPlayer(function (current) {
							return current.getEquips("yuxi").length > 0;
						})
					);
				},
				async content(event, trigger, player) {
					await player.chooseUseTarget("玉玺（伪帝）：选择知己知彼的目标", { name: "zhibi" });
				},
			},
		},
	}
```

## gz_jsrg_liuyan 名字:刘焉 势力:ye

### gz_tushe 名字:图射
描述: 你使用牌指定其他角色为目标时，可以摸X张牌（X为大势力角色数）。
```js
gz_tushe: {
		audio: "xinfu_tushe",
		trigger: {
			player: "useCardToPlayer",
		},
		filter(event, player) {
			if (!game.hasPlayer(current => current.isMajor())) {
				return false;
			}
			return event.targets?.some(target => target != player) && event.isFirstTarget;
		},
		frequent: true,
		async content(event, trigger, player) {
			const targets = game.filterPlayer(current => current.isMajor());
			if (targets?.length) {
				await player.draw(targets.length);
			}
		},
	}
```

### gz_limu 名字:立牧
描述: 出牌阶段限一次，你可以将一张♦牌当【乐不思蜀】对你使用，然后回复1点体力，令你本回合可以额外使用此牌点数张杀。
```js
gz_limu: {
		audio: "xinfu_limu",
		enable: "phaseUse",
		discard: false,
		filter(event, player) {
			if (player.hasJudge("lebu")) {
				return false;
			}
			return player.countCards("hes", { suit: "diamond" }) > 0;
		},
		viewAs: { name: "lebu" },
		position: "hes",
		filterCard(card, player, event) {
			const lebu = get.autoViewAs({ name: "lebu", cards: [card] }, [card]);
			return get.suit(card) == "diamond" && lib.filter.judge(lebu, player, player);
		},
		selectTarget: -1,
		filterTarget(card, player, target) {
			return player == target;
		},
		check(card) {
			return 13 - get.number(card);
		},
		onuse(result, player) {
			var next = game.createEvent("limu_recover", false, _status.event.getParent());
			next.player = player;
			next.card = result.card;
			next.setContent(async (event, trigger, player) => {
				await player.recover();
				const num = get.number(event.card);
				player.addTempSkill("gz_limu_effect");
				player.addMark("gz_limu_effect", num, false);
			});
		},
		ai: {
			result: {
				target(player, target) {
					let res = lib.card.lebu.ai.result.target(player, target);
					if (player.countCards("hs", "sha") >= player.hp) {
						res++;
					}
					if (target.isDamaged()) {
						return res + 2 * Math.abs(get.recoverEffect(target, player, target));
					}
					return res;
				},
				ignoreStatus: true,
			},
			order(item, player) {
				if (player.hp > 1 && player.countCards("j")) {
					return 0;
				}
				return 12;
			},
			effect: {
				target(card, player, target) {
					if (target.isPhaseUsing() && typeof card === "object" && get.type(card, null, target) === "delay" && !target.countCards("j")) {
						let shas =
							target.getCards("hs", i => {
								if (card === i || (card.cards && card.cards.includes(i))) {
									return false;
								}
								return get.name(i, target) === "sha" && target.getUseValue(i) > 0;
							}) - target.getCardUsable("sha");
						if (shas > 0) {
							return [1, 1.5 * shas];
						}
					}
				},
			},
		},
		subSkill: {
			effect: {
				intro: {
					content: "本回合可以额外使用$张杀",
				},
				locked: false,
				onremove: true,
				charlotte: true,
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + player.countMark("gz_limu_effect");
						}
					},
				},
			},
		},
	}
```

## gz_yangwan 名字:gz_yangwan 势力:shu

### gzyouyan 名字:诱言
描述: 回合内限一次。当你的牌因弃置而进入弃牌堆后，你可以展示牌堆顶的四张牌，然后获得其中与你此次弃置的牌花色均不同的牌。
```js
gzyouyan: {
		audio: "youyan",
		trigger: {
			player: "loseAfter",
			global: "loseAsyncAfter",
		},
		filter(event, player) {
			if (event.type != "discard" || event.getlx === false || player != _status.currentPhase) {
				return false;
			}
			var evt = event.getl(player);
			if (!evt || !evt.cards2 || !evt.cards2.length) {
				return false;
			}
			var list = [];
			for (var i of evt.cards2) {
				list.add(get.suit(i, player));
				if (list.length >= lib.suit.length) {
					return false;
				}
			}
			return true;
		},
		usable: 1,
		preHidden: true,
		async content(event, trigger, player) {
			let cards = get.cards(4, true);
			await player.showCards(cards, get.translation(player) + "发动了【诱言】");
			var evt = trigger.getl(player);
			var list = [];
			for (var i of evt.cards2) {
				list.add(get.suit(i, player));
			}
			cards = cards.filter(card => !list.includes(get.suit(card, false)));
			if (cards.length) {
				await player.gain(cards, "gain2");
			}
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					if (
						typeof card == "object" &&
						player == _status.currentPhase &&
						(!player.storage.counttrigger || !player.storage.counttrigger.gzyouyan) &&
						player.needsToDiscard() == 1 &&
						card.cards &&
						card.cards.filter(function (i) {
							return get.position(i) == "h";
						}).length > 0 &&
						!get.tag(card, "draw") &&
						!get.tag(card, "gain") &&
						!get.tag(card, "discard")
					) {
						return "zeroplayertarget";
					}
				},
			},
		},
	}
```

### gzzhuihuan 名字:追还
描述: 结束阶段，你可以选择至多两名角色，然后依次为被选择的角色标记A或B（字母不能重复标记）。直到你的下回合开始，当A第一次受到伤害后，其对来源造成1点伤害；当B第一次受到伤害后，来源弃置两张手牌。
```js
gzzhuihuan: {
		audio: "zhuihuan",
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget([1, 2], `###${get.prompt(event.skill)}###选择至多两名角色获得“追还”效果`)
				.setHiddenSkill(event.skill)
				.set("ai", target => {
					return get.attitude(get.player(), target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const prompt2 = "被选择的目标角色下次受到伤害后，其对伤害来源造成1点伤害；未被选择的目标角色下次受到伤害后，伤害来源弃置两张牌。";
			const next = player
				.chooseTarget("选择一名角色获得反伤效果", prompt2, (card, player, target) => {
					return get.event().allTargets.includes(target);
				})
				.set("allTargets", event.targets)
				.set("ai", target => {
					return get.attitude(get.player(), target);
				});
			if (event.targets.length > 1) {
				next.set("forced", true);
			}
			const result = await next.forResult();
			player.addTempSkill("gzzhuihuan_timeout", { player: "phaseZhunbeiBegin" });
			const id = `gzzhuihuan_${player.playerid}`;
			event.targets.forEach(target => {
				if (result?.bool && result.targets?.includes(target)) {
					player.line(target, "fire");
					target.addAdditionalSkill(id, "gzzhuihuan_damage");
				} else {
					player.line(target, "thunder");
					target.addAdditionalSkill(id, "gzzhuihuan_discard");
				}
			});
		},
		subSkill: {
			timeout: {
				charlotte: true,
				onremove(player) {
					var id = "gzzhuihuan_" + player.playerid;
					game.countPlayer(current => current.removeAdditionalSkill(id));
				},
			},
			damage: {
				charlotte: true,
				trigger: { player: "damageEnd" },
				forced: true,
				forceDie: true,
				filter(event, player) {
					return event.source && event.source.isAlive();
				},
				logTarget: "source",
				content() {
					player.removeSkill("gzzhuihuan_damage");
					trigger.source.damage();
				},
				mark: true,
				marktext: "追",
				intro: {
					content: "当你下次受到伤害后，你对伤害来源造成1点伤害。",
				},
				ai: {
					threaten: 0.5,
				},
			},
			discard: {
				charlotte: true,
				trigger: { player: "damageEnd" },
				forced: true,
				forceDie: true,
				filter(event, player) {
					return event.source && event.source.isAlive();
				},
				logTarget: "source",
				content() {
					player.removeSkill("gzzhuihuan_discard");
					trigger.source.chooseToDiscard(2, "he", true);
				},
				mark: true,
				marktext: "还",
				intro: {
					content: "当你下次受到伤害后，你令伤害来源弃置两张牌。",
				},
				ai: {
					threaten: 0.8,
				},
			},
		},
	}
```

## gz_shichangshi 名字:十常侍 势力:qun

### gz_danggu 名字:党锢
描述: 锁定技。①游戏开始时，你获得十张“常侍”牌，然后你亮出一张“常侍”牌。②当你修整结束后，你亮出一张“常侍”牌并摸一张牌。③若你有亮出的“常侍”牌，你视为拥有这些牌的技能。
```js
gz_danggu: {
		trigger: {
			player: "enterGame",
			global: "phaseBefore",
		},
		filter(event, player) {
			return event.name != "phase" || game.phaseNumber == 0;
		},
		derivation: ["gz_taoluan", "gz_chiyan", "gz_zimou", "gz_picai", "gz_yaozhuo", "gz_xiaolu", "gz_kuiji", "gz_chihe", "gz_niqu", "gz_miaoyu"],
		forced: true,
		unique: true,
		onremove(player) {
			delete player.storage.gz_danggu;
			delete player.storage.gz_danggu_current;
			player.changeSkin("gz_mowang", "gz_shichangshi");
		},
		changshi: [
			["gz_scs_zhangrang", "gz_taoluan"],
			["gz_scs_zhaozhong", "gz_chiyan"],
			["gz_scs_sunzhang", "gz_zimou"],
			["gz_scs_bilan", "gz_picai"],
			["gz_scs_xiayun", "gz_yaozhuo"],
			["gz_scs_hankui", "gz_xiaolu"],
			["gz_scs_lisong", "gz_kuiji"],
			["gz_scs_duangui", "gz_chihe"],
			["gz_scs_guosheng", "gz_niqu"],
			["gz_scs_gaowang", "gz_miaoyu"],
		],
		async content(event, trigger, player) {
			const list = lib.skill.gz_danggu.changshi.map(i => i[0]);
			player.markAuto("gz_danggu", list);
			game.broadcastAll(
				function (player, list) {
					const cards = [];
					for (let i = 0; i < list.length; i++) {
						const cardname = "huashen_card_" + list[i];
						lib.card[cardname] = {
							fullimage: true,
							image: "character/" + list[i].slice(3),
						};
						lib.translate[cardname] = get.rawName2(list[i]);
						cards.push(game.createCard(cardname, "", ""));
					}
					player.$draw(cards, "nobroadcast");
				},
				player,
				list
			);
			const next = game.createEvent("gz_danggu_clique");
			next.player = player;
			next.setContent(lib.skill.gz_danggu.contentx);
			await next;
		},
		async contentx(event, trigger, player) {
			let list = player.getStorage("gz_danggu").slice();
			const result =
				list.length == 1
					? {
							bool: true,
							links: list,
						}
					: await player
							.chooseButton(["党锢：请选择亮出常侍", [list, "character"]], true)
							.set("ai", button => Math.random() * 10)
							.forResult();
			if (result?.bool) {
				const changshis = result.links;
				const skills = [];
				const map = get.info("gz_danggu").changshi;
				player.unmarkAuto("gz_danggu", changshis);
				player.storage.gz_danggu_current = changshis;
				for (const changshi of changshis) {
					for (const cs of map) {
						if (changshi == cs[0]) {
							skills.push(cs[1]);
						}
					}
				}
				game.broadcastAll(
					(player, name) => {
						if (player.name1 == "gz_shichangshi") {
							player.node.name.innerHTML = get.slimName(name);
						}
						if (player.name2 == "gz_shichangshi") {
							player.node.name2.innerHTML = get.slimName(name);
						}
					},
					player,
					changshis[0]
				);
				player.changeSkin("gz_mowang", changshis[0]);
				game.log(player, "选择了常侍", "#y" + get.translation(changshis));
				if (skills.length) {
					player.addAdditionalSkill("gz_danggu", skills);
					let str = "";
					for (const i of skills) {
						str += "【" + get.translation(i) + "】、";
						player.popup(i);
					}
					str = str.slice(0, -1);
					game.log(player, "获得了技能", "#g" + str);
				}
			}
		},
		mod: {
			aiValue(player, card, num) {
				if (["shan", "tao", "wuxie", "caochuan"].includes(card.name)) {
					return num / 10;
				}
			},
			aiUseful() {
				return lib.skill.gz_danggu.mod.aiValue.apply(this, arguments);
			},
		},
		ai: {
			combo: "gz_mowang",
			nokeep: true,
			mingzhi: true,
		},
		intro: {
			mark(dialog, storage, player) {
				dialog.addText("剩余常侍");
				dialog.addSmall([storage, "character"]);
				if (player.storage.gz_danggu_current && player.isIn()) {
					dialog.addText("当前常侍");
					dialog.addSmall([player.storage.gz_danggu_current, "character"]);
				}
			},
		},
	}
```

### gz_mowang 名字:殁亡
描述: 锁定技。①当你死亡前，若你有未亮出的“常侍”牌且体力上限大于0，你将死亡改为修整至你的下个回合开始前，然后你复原武将牌，且不于此次死亡事件中进行展示身份牌、检测游戏胜利条件与执行奖惩的流程。②回合结束后，你死亡。
```js
gz_mowang: {
		trigger: {
			player: ["dieBefore", "rest", "dieAfter"],
		},
		filter(event, player, name) {
			if (name == "rest") {
				return true;
			}
			if (name == "dieAfter") {
				return event.reserveOut;
			}
			return event.getParent().name != "giveup" && player.maxHp > 0;
		},
		derivation: "mbmowang_faq",
		forced: true,
		forceDie: true,
		forceOut: true,
		direct: true,
		priority: 15,
		group: ["gz_mowang_die", "gz_mowang_return"],
		async content(event, trigger, player) {
			if (event.triggername == "rest") {
				if (player.name1 == "gz_shichangshi") {
					player.changeSkin("gz_mowang", `${player.skin.name}_dead`);
				}
				if (player.name2 == "gz_shichangshi") {
					player.changeSkin("gz_mowang", `${player.skin.name2}_dead`);
				}
				return;
			} else if (event.triggername == "dieAfter") {
				if (player.getStorage("gz_danggu").length) {
					game.broadcastAll(function () {
						if (lib.config.background_speak) {
							game.playAudio("die", "shichangshiRest");
						}
					});
					await player.rest({ type: "round", count: 1 }); //, audio: "shichangshiRest"
				}
			} else {
				if (player.isRest()) {
					trigger.cancel();
				} else {
					if (player.getStorage("gz_danggu").length) {
						player.logSkill("gz_mowang");
						trigger.excludeMark.add("gz_danggu");
						trigger.noDieAudio = true;
						//trigger.includeOut = true;
						trigger.reserveOut = true;
					} else {
						game.broadcastAll(player => {
							if (player.name1 == "gz_shichangshi") {
								player.node.name.innerHTML = get.slimName(player.name1);
							}
							if (player.name2 == "gz_shichangshi") {
								player.node.name2.innerHTML = get.slimName(player.name2);
							}
						}, player);
						player.changeSkin("gz_mowang", "gz_shichangshi_dead");
					}
				}
			}
		},
		ai: {
			combo: "gz_danggu",
			neg: true,
		},
		subSkill: {
			die: {
				audio: "gz_mowang",
				trigger: { player: "phaseAfter" },
				forced: true,
				forceDie: true,
				async content(event, trigger, player) {
					if (!player.getStorage("gz_danggu").length) {
						game.broadcastAll(player => {
							if (player.name1 == "gz_shichangshi") {
								player.node.name.innerHTML = get.slimName(player.name1);
							}
							if (player.name2 == "gz_shichangshi") {
								player.node.name2.innerHTML = get.slimName(player.name2);
							}
						}, player);
						player.changeSkin("gz_mowang", "gz_shichangshi");
						await game.delay();
					}
					await player.die();
				},
			},
			return: {
				trigger: { player: "restEnd" },
				forced: true,
				charlotte: true,
				silent: true,
				forceDie: true,
				forceOut: true,
				filter(event, player) {
					return event.player == player && player.hasSkill("gz_danggu", null, null, false);
				},
				async content(event, trigger, player) {
					game.broadcastAll(player => {
						if (player.name1 == "gz_shichangshi") {
							player.node.name.innerHTML = get.slimName(player.name1);
						}
						if (player.name2 == "gz_shichangshi") {
							player.node.name2.innerHTML = get.slimName(player.name2);
						}
					}, player);
					player.changeSkin("gz_mowang", "gz_shichangshi");
					delete player.storage.gz_danggu_current;
					const next = game.createEvent("gz_danggu_clique");
					next.player = player;
					next.setContent(lib.skill.gz_danggu.contentx);
					await next;
					await player.draw();
				},
			},
		},
	}
```

## gz_scs_zhangrang 名字:gz_scs_zhangrang 势力:qun

### gz_taoluan 名字:滔乱
描述: 出牌阶段限一次。你可以将一张牌当任意一种基本牌或普通锦囊牌使用。
```js
gz_taoluan: {
		audio: "scstaoluan",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return player.countCards("hes") > 0;
		},
		chooseButton: {
			dialog(event, player) {
				let list = [];
				for (let i = 0; i < lib.inpile.length; i++) {
					let name = lib.inpile[i];
					if (name == "sha") {
						list.push(["基本", "", "sha"]);
						for (let j of lib.inpile_nature) {
							list.push(["基本", "", "sha", j]);
						}
					} else if (get.type(name) == "trick") {
						list.push(["锦囊", "", name]);
					} else if (get.type(name) == "basic") {
						list.push(["基本", "", name]);
					}
				}
				return ui.create.dialog("滔乱", [list, "vcard"]);
			},
			filter(button, player) {
				return _status.event.getParent().filterCard({ name: button.link[2] }, player, _status.event.getParent());
			},
			check(button) {
				let player = _status.event.player;
				if (player.countCards("hs", button.link[2]) > 0) {
					return 0;
				}
				if (button.link[2] == "wugu") {
					return;
				}
				let effect = player.getUseValue(button.link[2]);
				if (effect > 0) {
					return effect;
				}
				return 0;
			},
			backup(links, player) {
				return {
					filterCard: true,
					audio: "gz_taoluan",
					selectCard: 1,
					popname: true,
					check(card) {
						return 6 - get.value(card);
					},
					position: "hes",
					viewAs: { name: links[0][2], nature: links[0][3] },
				};
			},
			prompt(links, player) {
				return "将一张牌当做" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
			},
		},
		ai: {
			order: 4,
			result: {
				player: 1,
			},
			threaten: 1.9,
		},
		subSkill: { backup: {} },
	}
```

## gz_scs_zhaozhong 名字:gz_scs_zhaozhong 势力:qun

### gz_chiyan 名字:鸱咽
描述: 当你使用【杀】指定目标后，你可以依次令目标角色与你将任意张牌置于自己的武将牌上直到当前回合结束。若如此做，手牌数不大于/不小于你的目标角色本回合受到的伤害+1/不能使用手牌。
```js
gz_chiyan: {
		audio: "scschiyan",
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return event.card.name == "sha" && event.target.countCards("he") && player.countCards("he");
		},
		logTarget: "target",
		check(event, player) {
			return get.attitude(player, event.target) <= 0;
		},
		async content(event, trigger, player) {
			for (const target of [player, trigger.target].sortBySeat()) {
				if (!target.isIn() || !target.countCards("he")) {
					continue;
				}
				const result = await target.chooseCard("鸱咽：将任意张牌置于武将牌上直到回合结束", [1, Infinity], true, "he", "allowChooseAll").set("ai", card => {
					const player = get.player();
					if (ui.selected.cards.length) {
						return 0;
					}
					return 6 - get.value(card);
				}).forResult();
				if (result?.bool && result?.cards?.length) {
					target.addSkill(event.name + "_gain");
					const next = target.addToExpansion("giveAuto", result.cards, target);
					next.gaintag.add(event.name + "_gain");
					await next;
				}
			}
			const { target } = trigger;
			if (target.countCards("h") <= player.countCards("h")) {
				target.addTempSkill(event.name + "_damage");
			}
			if (target.countCards("h") >= player.countCards("h")) {
				target.addTempSkill(event.name + "_effect");
			}
		},
		subSkill: {
			gain: {
				trigger: { global: "phaseEnd" },
				forced: true,
				popup: false,
				charlotte: true,
				filter(event, player) {
					return player.countExpansions("gz_chiyan_gain");
				},
				async content(event, trigger, player) {
					const cards = player.getExpansions(event.name);
					await player.gain(cards, "draw");
					game.log(player, "收回了" + get.cnNumber(cards.length) + "张“鸱咽”牌");
					player.removeSkill(event.name);
				},
				intro: {
					markcount: "expansion",
					mark(dialog, storage, player) {
						var cards = player.getExpansions("gz_chiyan_gain");
						if (player.isUnderControl(true)) {
							dialog.addAuto(cards);
						} else {
							return "共有" + get.cnNumber(cards.length) + "张牌";
						}
					},
				},
			},
			damage: {
				charlotte: true,
				trigger: { player: "damageBegin3" },
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					trigger.num++;
				},
				mark: true,
				intro: { content: "本回合受到的伤害+1" },
			},
			effect: {
				charlotte: true,
				mod: {
					cardEnabled(card, player) {
						const hs = player.getCards("h");
						if ([card].concat(card.cards || []).containsSome(...hs)) {
							return false;
						}
					},
					cardSavable(card, player) {
						return lib.skill.gz_chiyan_effect.mod.cardEnabled.apply(this, arguments);
					},
				},
				mark: true,
				intro: { content: "本回合不能使用手牌" },
			},
		},
	}
```

## gz_scs_sunzhang 名字:gz_scs_sunzhang 势力:qun

### gz_zimou 名字:自谋
描述: 锁定技。出牌阶段开始时，你令所有角色选择一项：1.交给你一张牌；2.弃置你一张牌，然后受到你造成的1点伤害。
```js
gz_zimou: {
		audio: "scszimou",
		trigger: { player: "phaseUseBegin" },
		forced: true,
		logTarget: () => game.filterPlayer().sortBySeat(),
		async content(event, trigger, player) {
			for (const target of event.targets) {
				if (!target.isIn()) {
					continue;
				}
				if (target != player) {
					const result = !target.countCards("he")
						? { bool: false }
						: await target
								.chooseToGive(player, "he", `交给${get.translation(player)}一张牌，或弃置其一张牌并受到其造成的1点伤害`)
								.set("ai", card => {
									const { player, target } = get.event();
									if (get.damageEffect(player, target, player) + get.effect(target, { name: "guohe_copy2" }, player, player) > 0) {
										return 0;
									}
									return 6 - get.value(card);
								})
								.forResult();
					if (!result?.bool) {
						if (player.countDiscardableCards(target, "he")) {
							await target.discardPlayerCard(player, "he", true);
							await target.damage();
						}
					}
				} else if (player.countDiscardableCards(player, "he")) {
					await player.chooseToDiscard("he", true);
					await player.damage();
				}
			}
		},
	}
```

## gz_scs_bilan 名字:gz_scs_bilan 势力:qun

### gz_picai 名字:庀材
描述: 出牌阶段限一次。你可令X名角色依次将一张手牌置于牌堆顶，然后你亮出牌堆顶X张牌。其中每有一种类别，你便摸一张牌。若你因此获得三张牌，则因此失去牌的角色依次从亮出的牌中选择一张获得（X为你的体力值）。
```js
gz_picai: {
		audio: "scspicai",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.countPlayer(current => current.countCards("h")) >= player.getHp() && player.getHp() > 0;
		},
		filterTarget(card, player, target) {
			return target.countCards("h");
		},
		selectTarget() {
			return get.player().getHp();
		},
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			const num = event.targets.length;
			const list = [];
			for (const target of event.targets.sortBySeat()) {
				if (target.isIn() && target.countCards("h")) {
					const result = await target.chooseCard("选择一张手牌置于牌堆顶", "h", true).forResult();
					if (result?.bool && result?.cards?.length) {
						list.push(target);
						await target.lose(result.cards, ui.cardPile, "insert");
						game.broadcastAll(player => {
							const cardx = ui.create.card();
							cardx.classList.add("infohidden");
							cardx.classList.add("infoflip");
							player.$throw(cardx, 1000, "nobroadcast");
						}, target);
					}
					if (player == game.me) {
						await game.delay(0.5);
					}
				}
			}
			let cards = get.cards(num);
			await game.cardsGotoOrdering(cards);
			await player.showCards(cards, get.translation(player) + `发动了【${get.translation(event.name)}】`);
			const draw = cards.map(card => get.type2(card)).toUniqued().length;
			await player.draw(draw);
			if (draw == 3 && cards.someInD()) {
				cards = cards.filterInD();
				for (const target of list.sortBySeat()) {
					if (!target.isIn()) {
						continue;
					}
					const result = cards.length == 1 ? { bool: true, links: cards } : await target.chooseButton([`${get.translation(event.name)}：获得其中一张牌`, cards], true).forResult();
					if (result?.bool && result?.links?.length) {
						const { links } = result;
						await target.gain(links, "gain2");
						cards.remove(links[0]);
					}
				}
			}
		},
		ai: {
			order: 10,
			result: { player: 1 },
		},
	}
```

## gz_scs_xiayun 名字:gz_scs_xiayun 势力:qun

### gz_yaozhuo 名字:谣诼
描述: ①出牌阶段限一次，你可以与一名角色拼点：若你赢，其弃置两张牌；若你没赢，你回复1点体力。②你拼点结算完成后，获得对方的拼点牌。
```js
gz_yaozhuo: {
		audio: "scsyaozhuo",
		enable: "phaseUse",
		filter(event, player) {
			if (!game.hasPlayer(current => player.canCompare(current))) {
				return false;
			}
			return true;
		},
		usable: 1,
		filterTarget(card, player, target) {
			return player.canCompare(target);
		},
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			const result = await player.chooseToCompare(target).forResult();
			if (result?.bool) {
				await target.chooseToDiscard(2, true, "h");
			} else {
				await player.recover();
			}
		},
		ai: {
			order(item, player) {
				if (player.isDamaged()) {
					return 10;
				}
				return 1;
			},
			result: {
				target(player, target) {
					var hs = player.getCards("h").sort((a, b) => b.number - a.number);
					var ts = target.getCards("h").sort((a, b) => b.number - a.number);
					if (!hs.length || !ts.length) {
						return 0;
					}
					if ((hs[0].number > ts[0].number - 2 && hs[0].number > 5) || player.isDamaged()) {
						return -1;
					}
					return 0;
				},
			},
		},
		group: "gz_yaozhuo_gain",
		subSkill: {
			gain: {
				audio: "gz_yaozhuo",
				getCards: (event, player) => (player == event.player ? event.card2 : event.card1),
				trigger: { global: ["chooseToCompareAfter", "compareMultipleAfter"] },
				filter(event, player) {
					if (![event.player, event.target].includes(player)) {
						return false;
					}
					if (event.preserve) {
						return false;
					}
					const card = get.info("gz_yaozhuo_gain").getCards(event, player);
					return !get.owner(card);
				},
				check(event, player) {
					const card = get.info("gz_yaozhuo_gain").getCards(event, player);
					return card.name != "du";
				},
				prompt2(event, player) {
					const card = get.info("gz_yaozhuo_gain").getCards(event, player);
					return `获得${get.translation(card)}`;
				},
				async content(event, trigger, player) {
					const card = get.info(event.name).getCards(trigger, player);
					if (!get.owner(card)) {
						await player.gain(card, "gain2");
					}
				},
			},
		},
	}
```

## gz_scs_hankui 名字:gz_scs_hankui 势力:qun

### gz_xiaolu 名字:宵赂
描述: 出牌阶段限一次。你可以摸两张牌，然后选择一项：1.弃置两张手牌；2.将两张手牌交给一名其他角色。
```js
gz_xiaolu: {
		audio: "scsxiaolu",
		enable: "phaseUse",
		usable: 1,
		async content(event, trigger, player) {
			await player.draw(2);
			const num = player.countCards("h");
			if (!num) {
				return;
			}
			const result =
				num >= 2
					? await player
							.chooseControl()
							.set("choiceList", ["将两张手牌交给一名其他角色", "弃置两张手牌"])
							.set("ai", function () {
								if (
									game.hasPlayer(function (current) {
										return current != player && get.attitude(player, current) > 0;
									})
								) {
									return 0;
								}
								return 1;
							})
							.forResult()
					: {
							index: 1,
						};
			if (result.index == 0) {
				const { bool, cards, targets } = await player
					.chooseCardTarget({
						position: "h",
						filterCard: true,
						selectCard: 2,
						filterTarget(card, player, target) {
							return player != target;
						},
						ai1(card) {
							return get.unuseful(card);
						},
						ai2(target) {
							var att = get.attitude(_status.event.player, target);
							if (target.hasSkillTag("nogain")) {
								att /= 10;
							}
							if (target.hasJudge("lebu")) {
								att /= 5;
							}
							return att;
						},
						prompt: "选择两张手牌，交给一名其他角色",
						forced: true,
					})
					.forResult();
				if (bool) {
					await player.give(cards, targets[0]);
				}
			} else {
				await player.chooseToDiscard(2, true, "h");
			}
		},
		ai: {
			order: 9,
			result: { player: 2 },
		},
	}
```

## gz_scs_lisong 名字:gz_scs_lisong 势力:qun

### gz_kuiji 名字:窥机
描述: 出牌阶段限一次。你可以观看一名其他角色的手牌，然后可以弃置你与其的共计四张花色各不相同的手牌。
```js
gz_kuiji: {
		audio: "scskuiji",
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target != player && target.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const list1 = [],
				list2 = [],
				target = event.target;
			let chooseButton;
			if (player.countCards("h") > 0) {
				chooseButton = player.chooseButton(4, ["你的手牌", player.getCards("h"), get.translation(target.name) + "的手牌", target.getCards("h")]);
			} else {
				chooseButton = player.chooseButton(4, [get.translation(target.name) + "的手牌", target.getCards("h")]);
			}
			chooseButton.set("target", target);
			chooseButton.set("ai", function (button) {
				const { player, target } = get.event();
				let ps = [],
					ts = [];
				for (let i = 0; i < ui.selected.buttons.length; i++) {
					let card = ui.selected.buttons[i].link;
					if (target.getCards("h").includes(card)) {
						ts.push(card);
					} else {
						ps.push(card);
					}
				}
				let card = button.link;
				let owner = get.owner(card);
				let val = get.value(card) || 1;
				if (owner == target) {
					return 2 * val;
				}
				return 7 - val;
			});
			chooseButton.set("filterButton", function (button) {
				if (get.owner(button.link) && !lib.filter.canBeDiscarded(button.link, get.owner(button.link), get.player())) {
					return false;
				}
				for (var i = 0; i < ui.selected.buttons.length; i++) {
					if (get.suit(button.link) == get.suit(ui.selected.buttons[i].link)) {
						return false;
					}
				}
				return true;
			});
			const result = await chooseButton.forResult();
			if (result.bool) {
				const list = result.links;
				for (let i = 0; i < list.length; i++) {
					if (get.owner(list[i]) == player) {
						list1.push(list[i]);
					} else {
						list2.push(list[i]);
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
			}
		},
		ai: {
			order: 13,
			result: {
				target: -1,
			},
		},
	}
```

## gz_scs_duangui 名字:gz_scs_duangui 势力:qun

### gz_chihe 名字:叱吓
描述: 当你使用【杀】指定唯一目标后，你可以摸两张牌并展示等量张手牌，然后你与其拼点，若你赢，此【杀】的伤害值基数+1；否则你弃置两张牌。
```js
gz_chihe: {
		audio: "scschihe",
		trigger: {
			player: "useCardToPlayered",
		},
		filter(event, player) {
			return event.targets.length == 1 && event.card.name == "sha";
		},
		logTarget(event, player) {
			return player == event.player ? event.targets[0] : event.player;
		},
		check(event, player) {
			const target = get.info("gz_chihe").logTarget(event, player);
			return get.attitude(player, target) <= 0 || !player.canCompare(target);
		},
		async content(event, trigger, player) {
			await player.draw(2);
			if (!player.countCards("h")) {
				return;
			}
			const result = await player.chooseCard("h", true, 2, "选择两张手牌展示").forResult();
			if (result?.bool && result?.cards?.length) {
				await player.showCards(result.cards, get.translation(player) + "发动了【" + get.translation(event.name) + "】");
			}
			const target = get.info(event.name).logTarget(trigger, player);
			if (player.canCompare(target)) {
				const result = await player.chooseToCompare(target).forResult();
				if (result?.bool) {
					const evt = trigger.getParent();
					if (typeof evt.baseDamage != "number") {
						evt.baseDamage = 1;
					}
					evt.baseDamage++;
				} else if (player.countDiscardableCards(player, "he")) {
					await player.chooseToDiscard("he", 2, true);
				}
			}
		},
	}
```

## gz_scs_guosheng 名字:gz_scs_guosheng 势力:qun

### gz_niqu 名字:逆取
描述: 一名角色于你的出牌阶段使用【闪】后，你可以摸一张牌，然后视为对其使用一张【杀】。
```js
gz_niqu: {
		audio: "scsniqu",
		trigger: { global: "useCardAfter" },
		filter(event, player) {
			return event.card?.name == "shan" && player.isPhaseUsing();
		},
		check(event, player) {
			return get.attitude(player, event.player) <= 0 || player == event.player;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.draw();
			const { player: target } = trigger;
			const sha = get.autoViewAs({ name: "sha", isCard: true });
			if (player.canUse(sha, target, false)) {
				await player.useCard(sha, target, false);
			}
		},
	}
```

## gz_scs_gaowang 名字:gz_scs_gaowang 势力:qun

### gz_miaoyu 名字:妙语
描述: 你可以将♦牌当火【杀】使用；你使用【杀】无次数限制。
```js
gz_miaoyu: {
		audio: "scsmiaoyu",
		enable: "chooseToUse",
		filterCard(card, player) {
			return get.suit(card) == "diamond";
		},
		position: "hes",
		viewAs: { name: "sha", nature: "fire" },
		viewAsFilter(player) {
			if (!player.countCards("hes", { suit: "diamond" })) {
				return false;
			}
		},
		prompt: "将一张♦牌当火杀使用",
		check(card) {
			const val = get.value(card);
			return 5 - val;
		},
		ai: {
			skillTagFilter(player) {
				if (!player.countCards("hes", { suit: "diamond" })) {
					return false;
				}
			},
			respondSha: true,
		},
		locked: false,
		mod: {
			cardUsable(card, player, num) {
				if (card.name == "sha") {
					return Infinity;
				}
			},
		},
	}
```

## gz_gaolan 名字:高览 势力:qun

### gz_jungong 名字:峻攻
描述: 出牌阶段限一次，你可以失去1点体力或弃置一张牌，视为使用一张无距离次数限制的【杀】。
```js
gz_jungong: {
		audio: "spjungong",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			var num = player.countMark("spjungong_used");
			return num < player.hp || num <= player.countCards("he");
		},
		filterTarget(card, player, target) {
			return target != player && player.canUse("sha", target, false);
		},
		filterCard: true,
		position: "he",
		selectCard() {
			var player = _status.event.player,
				num = player.countMark("spjungong_used") + 1;
			if (ui.selected.cards.length || num > player.hp) {
				return num;
			}
			return [0, num];
		},
		check(card) {
			return 6 - get.value(card);
		},
		prompt() {
			var player = _status.event.player,
				num = get.cnNumber(player.countMark("spjungong_used") + 1);
			return "弃置" + num + "张牌或失去" + num + "点体力，视为使用杀";
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			if (!cards.length) {
				await player.loseHp();
			}
			await player.useCard({ name: "sha", isCard: true }, target, false);
		},
		ai: {
			order(item, player) {
				return get.order({ name: "sha" }, player) + 1;
			},
			result: {
				target(player, target) {
					if (!ui.selected.cards.length) {
						return 0;
					}
					return get.effect(target, { name: "sha" }, player, target);
				},
			},
		},
	}
```

### gz_dengli 名字:等力
描述: 你使用【杀】指定其他角色为唯一目标，或成为其他角色使用【杀】的目标后，若你与其体力相等，你可以摸一张牌。
```js
gz_dengli: {
		audio: "spdengli",
		trigger: {
			player: "useCardToPlayered",
			target: "useCardToTargeted",
		},
		frequent: true,
		filter(event, player, name) {
			if (event.card.name != "sha" || (name == "useCardToPlayered" && event.targets?.length != 1)) {
				return false;
			}
			return event.player.hp == event.target.hp;
		},
		async content(event, trigger, player) {
			await player.draw();
		},
		ai: {
			effect: {
				player_use(card, player, target) {
					var hp = player.hp,
						evt = _status.event;
					if (evt.name == "chooseToUse" && evt.player == player && evt.skill == "gz_jungong" && !ui.selected.cards.length) {
						hp--;
					}
					if (card && card.name == "sha" && hp == target.hp) {
						return [1, 0.3];
					}
				},
				target_use(card, player, target) {
					if (card && card.name == "sha" && player.hp == target.hp) {
						return [1, 0.3];
					}
				},
			},
		},
	}
```

## gz_caoang 名字:曹昂 势力:wei

### kaikang
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_zhangxingcai 名字:张星彩 势力:shu

### shenxian
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_qiangwu 名字:枪舞
描述: 出牌阶段限一次，你可以进行判定，本回合你使用的下一张点数大于判定结果的【杀】不计入次数，下一张点数小于判定结果的【杀】无距离限制。
```js
gz_qiangwu: {
		enable: "phaseUse",
		usable: 1,
		audio: "qiangwu",
		async content(event, trigger, player) {
			const result = await player.judge(card => 1 / get.number(card)).forResult();
			if (typeof result.number == "number") {
				for (let eff of ["limit", "distance"]) {
					const skill = `${event.name}_${eff}`;
					player.addTempSkill(skill);
					player.setStorage(skill, result.number);
					player.addTip(skill, `${eff == "limit" ? "不计次数 >" : "无视距离 <"}${result.number}`);
				}
			}
		},
		subSkill: {
			limit: {
				trigger: {
					player: "useCard1",
				},
				onremove(player, skill) {
					player.removeTip(skill);
					player.setStorage(skill);
				},
				filter(event, player) {
					if (event.card?.name != "sha") {
						return false;
					}
					const num = get.number(event.card);
					return typeof num == "number" && num > player.getStorage("gz_qiangwu_limit", 13);
				},
				charlotte: true,
				direct: true,
				async content(event, trigger, player) {
					if (trigger.addCount !== false) {
						trigger.addCount = false;
						player.getStat().card.sha--;
					}
					player.removeSkill(event.name);
				},
				locked: false,
				mod: {
					cardUsable(card, player) {
						if (card.name == "sha") {
							const num = get.number(card);
							if (num == "unsure" || num > player.getStorage("gz_qiangwu_limit", 13)) {
								return true;
							}
						}
					},
				},
			},
			distance: {
				trigger: {
					player: "useCard1",
				},
				onremove(player, skill) {
					player.removeTip(skill);
					player.setStorage(skill);
				},
				filter(event, player) {
					if (event.card?.name != "sha") {
						return false;
					}
					const num = get.number(event.card);
					return typeof num == "number" && num < player.getStorage("gz_qiangwu_distance", 1);
				},
				charlotte: true,
				direct: true,
				async content(event, trigger, player) {
					player.removeSkill(event.name);
				},
				locked: false,
				mod: {
					targetInRange(card, player) {
						if (card.name == "sha") {
							const num = get.number(card);
							if (num == "unsure" || num < player.getStorage("gz_qiangwu_distance", 1)) {
								return true;
							}
						}
					},
				},
			},
		},
		ai: {
			order: 11,
			result: {
				player: 1,
			},
		},
	}
```

## gz_quyi 名字:麴义 势力:qun

### fuqi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### jiaozi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_ws_caoying 名字:曹婴 势力:wei

### gz_lingren 名字:凌人
描述: 每回合限一次，你使用伤害牌指定目标后，若其手牌数不大于你，你可选择一项：1.摸两张牌；2.令此牌对其造成的伤害+1。
```js
gz_lingren: {
		audio: "xinfu_lingren",
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!event.isFirstTarget || !get.is.damageCard(event.card)) {
				return false;
			}
			return event.targets?.some(target => target.countCards("h") <= player.countCards("h"));
		},
		preHidden: true,
		usable: 1,
		async cost(event, trigger, player) {
			const targets = trigger.targets?.filter(target => target.countCards("h") <= player.countCards("h"));
			if (targets.length > 1) {
				event.result = await player
					.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
						return get.event().targetx.includes(target);
					})
					.set("targetx", targets)
					.set("ai", target => {
						return 10 - get.attitude(get.player(), target);
					})
					.setHiddenSkill(event.skill)
					.forResult();
			} else {
				event.result = await player.chooseBool(get.prompt2(event.skill, targets)).setHiddenSkill(event.skill).forResult();
				event.result.targets = targets;
			}
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await player
				.chooseBool(`令${get.translation(trigger.card)}对${get.translation(target)}造成的伤害+1，或点取消摸两张牌`)
				.set(
					"choice",
					(() => {
						if (get.damageEffect(target, player, player) <= 0) {
							return false;
						}
						return Math.random() > 0.6;
					})()
				)
				.forResult();
			if (result.bool) {
				const map = trigger.getParent()?.customArgs;
				const id = target.playerid;
				map[id] ??= {};
				map[id].extraDamage ??= 0;
				map[id].extraDamage++;
			} else {
				await player.draw(2);
			}
		},
	}
```

### gz_fujian 名字:伏间
描述: 准备阶段和结束阶段，你可以视为对一名手牌数不大于你的其他角色使用一张【知己知彼】。
```js
gz_fujian: {
		audio: "xinfu_fujian",
		trigger: {
			player: ["phaseZhunbeiBegin", "phaseJieshuBegin"],
		},
		filter(event, player) {
			const card = new lib.element.VCard({ name: "zhibi", isCard: true });
			return game.hasPlayer(current => current != player && player.canUse(card, current) && current.countCards("h") <= player.countCards("h"));
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (cardx, player, target) => {
					const card = new lib.element.VCard({ name: "zhibi", isCard: true });
					return target != player && player.canUse(card, target) && target.countCards("h") <= player.countCards("h");
				})
				.set("ai", target => {
					const card = new lib.element.VCard({ name: "zhibi", isCard: true }),
						player = get.player();
					return get.effect(target, card, player, player);
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			const card = new lib.element.VCard({ name: "zhibi", isCard: true });
			await player.useCard(card, event.targets);
		},
	}
```

## gz_ws_guansuo 名字:关索 势力:shu

### gz_zhengnan 名字:征南
描述: `其他角色死亡后，你可以摸三张牌并获得以下未拥有的一个技能：${get.poptip("gz_wusheng")}${get.poptip("gzdangxian")}${get.poptip("gz_zhiman")}。`
```js
gz_zhengnan: {
		audio: "zhengnan",
		trigger: { global: "dieAfter" },
		frequent: true,
		async content(event, trigger, player) {
			await player.draw(3);
			const list = lib.skill.gz_zhengnan.derivation.filter(skill => !player.hasSkill(skill, null, false, false));
			if (list.length > 0) {
				const result =
					list.length > 1
						? await player
								.chooseControl(list)
								.set("prompt", "选择获得一项技能")
								.set("ai", function () {
									const controls = get.event().controls;
									if (controls.includes("gzdangxian")) {
										return "gzdangxian";
									}
									return controls[0];
								})
								.forResult()
						: { control: list[0] };
				if (result.control) {
					await player.addSkills(result.control);
				}
			}
		},
		ai: { threaten: 2 },
		derivation: ["gz_wusheng", "gzdangxian", "gz_zhiman"],
	}
```

## gz_zhangxuan 名字:张嫙 势力:wu

### gz_tongli 名字:同礼
描述: 每回合限一次，你使用基本或普通锦囊牌指定目标后，可以展示手牌。若展示牌颜色均相同，此牌额外结算一次。
```js
gz_tongli: {
		audio: "tongli",
		trigger: {
			player: "useCardToPlayered",
		},
		filter(event, player) {
			if (!get.info("gz_tongli")?.filterx(event) || get.tag(event.card, "norepeat")) {
				return false;
			}
			return event.isFirstTarget && player.countCards("h");
		},
		filterx(event) {
			if (event.targets.length == 0) {
				return false;
			}
			var type = get.type(event.card);
			if (type != "basic" && type != "trick") {
				return false;
			}
			return true;
		},
		usable: 1,
		check(event, player) {
			return (
				player
					.getCards("h")
					.map(card => get.color(card))
					?.toUniqued()?.length == 1
			);
		},
		preHidden: true,
		async content(event, trigger, player) {
			await player.showHandcards();
			if (
				player
					.getCards("h")
					.map(card => get.color(card))
					?.toUniqued()?.length != 1
			) {
				return;
			}
			if (!get.info("gz_tongli")?.filterx(trigger)) {
				return;
			}
			trigger.getParent().effectCount++;
			game.log(trigger.card, "额外结算一次");
		},
	}
```

### gz_shezang 名字:奢葬
描述: 你首次进入濒死时，可以摸四张牌。
```js
gz_shezang: {
		audio: "shezang",
		trigger: {
			player: "dying",
		},
		frequent: true,
		filter(event, player) {
			return (
				game
					.getAllGlobalHistory("everything", evt => {
						return evt.name == "dying" && evt.player == player;
					})
					.indexOf(event) == 0
			);
		},
		async content(event, trigger, player) {
			await player.draw(4);
		},
	}
```

## gz_zhangyao 名字:张媱 势力:wu

### gz_yuanyu 名字:怨语
描述: 出牌阶段限一次，你可以摸一张牌并将一张手牌置于武将牌上，称为“怨”。
```js
gz_yuanyu: {
		audio: "yuanyu",
		enable: "phaseUse",
		usable: 1,
		async content(event, trigger, player) {
			await player.draw();
			if (player.countCards("h") > 0) {
				const result = await player
					.chooseCard("怨语：将一张手牌当作“怨”置于武将牌上", "h", true)
					.set("ai", card => {
						const player = get.player(),
							cards = player.getExpansions("gz_yuanyu");
						if (cards?.length && cards.some(cardx => get.color(cardx) == get.color(card))) {
							return 5 - get.value(card);
						}
						return 8 - get.value(card);
					})
					.forResult();
				const gainEvent = player.addToExpansion(result.cards, player, "give");
				gainEvent.gaintag.add("gz_yuanyu");
				await gainEvent;
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
		ai: {
			order: 7,
			result: {
				player: 1,
			},
		},
	}
```

### gz_xiyan 名字:夕颜
描述: 你受到伤害后，若伤害牌和“怨”颜色相同，可以令伤害来源选择一项：1.本回合手牌上限-4；2.本回合不能使用基本牌。
```js
gz_xiyan: {
		audio: "xiyan",
		trigger: {
			player: "damageEnd",
		},
		filter(event, player) {
			if (!event.card || !player.countExpansions("gz_yuanyu")) {
				return false;
			}
			return (
				event.source?.isIn() &&
				player.getExpansions("gz_yuanyu").some(card => {
					return get.color(card) == get.color(event.card);
				})
			);
		},
		logTarget: "source",
		check(event, player) {
			return get.attitude(player, event.source) <= 0;
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const result = await target
				.chooseControl()
				.set("choiceList", ["本回合手牌上限-4", "本回合不能使用基本牌"])
				.set("prompt", "夕颜：请选择一项")
				.set("ai", () => {
					const player = get.player();
					if (player.hasSkill("gz_xiyan_basic")) {
						return 1;
					}
					if (
						player.countCards("h", card => {
							return get.type(card) == "basic" && player.hasValueTarget(card);
						}) >=
						player.countCards("h") / 2
					) {
						return 0;
					}
					return 1;
				})
				.forResult();
			if (result.index == 0) {
				target.addTempSkill("gz_xiyan_limit");
				target.addMark("gz_xiyan_limit", 4, false);
			} else {
				target.addTempSkill("gz_xiyan_basic");
			}
		},
		subSkill: {
			limit: {
				intro: { content: "本回合手牌上限-#" },
				onremove: true,
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						return num - player.countMark("gz_xiyan_limit");
					},
				},
			},
			basic: {
				intro: { content: "本回合不能使用基本牌" },
				mark: true,
				charlotte: true,
				mod: {
					cardEnabled(card, player) {
						if (get.type(card) == "basic") {
							return false;
						}
					},
					cardSavable(card, player) {
						if (get.type(card) == "basic") {
							return false;
						}
					},
				},
			},
		},
	}
```

## gz_guanyinping 名字:关银屏 势力:shu

### xueji
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### gz_huxiao 名字:虎啸
描述: 锁定技，你造成火焰伤害后，令受伤角色摸一张牌，然后你本回合对其使用的下三张牌不计入次数。
```js
gz_huxiao: {
		audio: "huxiao",
		trigger: {
			source: "damageSource",
		},
		forced: true,
		filter(event, player) {
			if (event._notrigger.includes(event.player) || !event.player.isIn()) {
				return false;
			}
			return event.hasNature("fire");
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const target = trigger.player;
			await target.draw();
			player.addTempSkill("gz_huxiao_effect");
			const map = player.getStorage("gz_huxiao_effect", new Map());
			map.set(target, 3);
			player.setStorage("gz_huxiao_effect", map);
		},
		subSkill: {
			effect: {
				onremove: true,
				charlotte: true,
				mark: true,
				intro: {
					markcount: () => null,
					content(storage, player) {
						const map = player.getStorage("gz_huxiao_effect", new Map()),
							list = [];
						for (let i of map) {
							if (i[0]?.isIn?.() && i[1] > 0) {
								list.add(`${get.translation(i[0])} 剩余${i[1]}次`);
							}
						}
						if (!list.length) {
							return "无剩余次数";
						}
						return list.join("<br>");
					},
				},
				trigger: {
					player: "useCardToPlayer",
				},
				filter(event, player) {
					const map = player.getStorage("gz_huxiao_effect", new Map());
					return map.has(event.target);
				},
				async cost(event, trigger, player) {
					const map = player.getStorage(event.skill, new Map());
					map.set(trigger.target, map.get(trigger.target) - 1);
					player.setStorage(event.skill, map);
					if (!map.some((num, current) => num > 0)) {
						player.unmarkSkill(event.skill);
					}
					event.result = {
						bool: true,
						skill_popup: false,
					};
				},
				async content(event, trigger, player) {
					if (trigger.getParent().addCount !== false) {
						trigger.getParent().addCount = false;
						player.getStat().card[trigger.card.name]--;
					}
				},
				mod: {
					cardUsableTarget(card, player, target) {
						const map = player.getStorage("gz_huxiao_effect", new Map());
						if (map.has(target) && map.get(target) > 0) {
							return true;
						}
					},
				},
			},
		},
	}
```

## gz_xinxianying 名字:辛宪英 势力:wei

### gz_caishi 名字:才识
描述: 摸牌阶段结束时，你可以选择一项：1.本回合手牌上限+2；2.回复1点体力，本回合不能对其他角色使用牌。
```js
gz_caishi: {
		audio: "caishi",
		trigger: { player: "phaseDrawEnd" },
		async cost(event, trigger, player) {
			const choices = [];
			const choiceList = ["本回合手牌上限+2", "回复1点体力，然后本回合你不能对其他角色使用牌"];
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
								!game.hasPlayer(current => {
									if (get.attitude(player, current) >= 0) {
										return false;
									}
									return (
										player.countCards("h", card => {
											return player.canUse(card, current) && get.effect(current, card, player, player) > 0;
										}) >= player.getHandcardLimit()
									);
								})
							) {
								return 1;
							}
							return 0;
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
				player.addTempSkill(event.name + "_effect");
				player.addMark(event.name + "_effect", 2, false);
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
						return num + player.countMark("gz_caishi_effect");
					},
				},
			},
			buff: {
				charlotte: true,
				mark: true,
				intro: { content: "本回合内不能对其他角色使用牌" },
				mod: {
					playerEnabled(card, player, target) {
						if (player != target) {
							return false;
						}
					},
				},
			},
		},
	}
```

## gz_yj_zhanghe 名字:张郃 势力:qun

### gz_zhilve 名字:知略
描述: 出牌阶段限一次，你可以失去1点体力并令你本回合的手牌上限+1，然后选择一项：1.移动场上的一张牌；2.摸一张牌并视为使用一张无距离次数限制的【杀】。
```js
gz_zhilve: {
		audio: "zhilve",
		enable: "phaseUse",
		usable: 1,
		chooseButton: {
			dialog(event, player) {
				var list = ["移动场上的一张牌", "摸一张牌并视为使用一张【杀】"];
				var choiceList = ui.create.dialog("知略：失去1点体力并选择一项", "forcebutton", "hidden");
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
				return button.link;
			},
			backup(links) {
				if (links[0] == 1) {
					return {
						audio: "gz_zhilve",
						async content(event, trigger, player) {
							await player.loseHp();
							player.addTempSkill("gz_zhilve_limit");
							player.addMark("gz_zhilve_limit", 1, false);
							await player.draw();
							const card = new lib.element.VCard({ name: "sha", isCard: true });
							if (player.hasUseTarget(card, false)) {
								await player.chooseUseTarget(card, true, false, "nodistance");
							}
						},
					};
				} else {
					return {
						audio: "gz_zhilve",
						async content(event, trigger, player) {
							await player.loseHp();
							player.addTempSkill("gz_zhilve_limit");
							player.addMark("gz_zhilve_limit", 1, false);
							if (player.canMoveCard()) {
								await player.moveCard(true);
							}
						},
					};
				}
			},
			prompt() {
				return "请选择【杀】的目标";
			},
		},
		ai: {
			order(item, player) {
				return get.order({ name: "sha" }) + 0.1;
			},
			result: {
				player(player) {
					if (player.hp > 2 && player.hasValueTarget({ name: "sha" })) {
						return 1;
					}
					return 0;
				},
			},
		},
		subSkill: {
			backup: {},
			limit: {
				intro: { content: "本回合手牌上限+#" },
				onremove: true,
				charlotte: true,
				mod: {
					maxHandcard(player, num) {
						return num + player.countMark("gz_zhilve_limit");
					},
				},
			},
		},
	}
```

## gz_mizhu 名字:糜竺 势力:shu

### gz_ziyuan 名字:资援
描述: 出牌阶段限一次，你可以将任意张点数之和为13的手牌展示并交给一名其他同势力角色，然后该角色回复1点体力。
```js
gz_ziyuan: {
		audio: "ziyuan",
		enable: "phaseUse",
		usable: 1,
		filterCard(card) {
			let num = 0;
			for (let i = 0; i < ui.selected.cards.length; i++) {
				num += get.number(ui.selected.cards[i]);
			}
			return get.number(card) + num <= 13;
		},
		complexCard: true,
		selectCard() {
			let num = 0;
			for (let i = 0; i < ui.selected.cards.length; i++) {
				num += get.number(ui.selected.cards[i]);
			}
			if (num == 13) {
				return ui.selected.cards.length;
			}
			return ui.selected.cards.length + 2;
		},
		discard: false,
		lose: false,
		delay: false,
		filterTarget(card, player, target) {
			return player != target && target.isFriendOf(player);
		},
		check(card) {
			let num = 0;
			for (let i = 0; i < ui.selected.cards.length; i++) {
				num += get.number(ui.selected.cards[i]);
			}
			if (num + get.number(card) == 13) {
				return 9 - get.value(card);
			}
			if (ui.selected.cards.length == 0) {
				let cards = _status.event.player.getCards("h");
				for (let i = 0; i < cards.length; i++) {
					for (let j = i + 1; j < cards.length; j++) {
						if (cards[i].number + cards[j].number == 13) {
							if (cards[i] == card || cards[j] == card) {
								return 8.5 - get.value(card);
							}
						}
					}
				}
			}
			return 0;
		},
		async content(event, trigger, player) {
			const { cards, target } = event;
			await player.showCards(cards, `${get.translation(player)}发动了【资援】`);
			await player.give(cards, target, true);
			await target.recover();
		},
		ai: {
			order(skill, player) {
				if (
					game.hasPlayer(function (current) {
						return current.hp < current.maxHp && current != player && get.recoverEffect(current, player, player) > 0;
					})
				) {
					return 10;
				}
				return 1;
			},
			result: {
				player(player, target) {
					if (get.attitude(player, target) < 0) {
						return -1;
					}
					let eff = get.recoverEffect(target, player, player);
					if (eff < 0) {
						return 0;
					}
					if (eff > 0) {
						if (target.hp == 1) {
							return 3;
						}
						return 2;
					}
					if (player.needsToDiscard()) {
						return 1;
					}
					return 0;
				},
			},
			threaten: 1.3,
		},
	}
```

### gz_jugu 名字:巨贾
描述: 锁定技，此武将牌明置时，你摸X张牌，手牌上限+X（X为你的体力上限）。
```js
gz_jugu: {
		audio: "jugu",
		trigger: {
			player: "showCharacterAfter",
		},
		forced: true,
		filter(event, player) {
			return event.toShow.some(name => {
				return get.character(name, 3).includes("gz_jugu");
			});
		},
		async content(event, trigger, player) {
			await player.draw(player.maxHp);
		},
		mod: {
			maxHandcard(player, num) {
				return num + player.maxHp;
			},
		},
	}
```

## gz_caochun 名字:曹纯 势力:wei

### gz_shanjia 名字:缮甲
描述: 出牌阶段开始时，你可以摸X张牌（X为与你同势力的角色数），然后弃置一张牌。若为装备牌，你视为使用一张【杀】。
```js
gz_shanjia: {
		audio: "shanjia",
		trigger: {
			player: "phaseUseBegin",
		},
		filter(event, player) {
			const num = game.countPlayer(current => current.isFriendOf(player));
			return num > 0;
		},
		frequent: true,
		async content(event, trigger, player) {
			const num = game.countPlayer(current => current.isFriendOf(player));
			await player.draw(num);
			const result = await player
				.chooseToDiscard("he", true)
				.set("ai", card => {
					if (get.type(card) == "equip") {
						return 10 - get.value(card);
					}
					return 7 - get.value(card);
				})
				.forResult();
			if (result.bool && get.type(result.cards[0]) == "equip") {
				const card = new lib.element.VCard({ name: "sha", isCard: true });
				if (player.hasUseTarget(card)) {
					await player.chooseUseTarget(card, true, false);
				}
			}
		},
	}
```

## gz_jun_jin_simayi 名字:君司马懿 势力:jin

### gz_jiaping 名字:嘉平
描述: `君主技，只要此武将牌处于明置状态，你便拥有“${get.poptip({
		id: "jiaping_bahuangsishiling",
		name: "八荒死士令",
		type: "character",
		info: `每轮共计限一次，本轮明置过武将牌的晋势力角色可以于对应时机移除副将并发动一个未以此法发动过的技能：${get.poptip("gz_shunfu")}${get.poptip("luanwu")}${get.poptip("jianglue")}${get.poptip("yongjin")}${get.poptip("gz_fengying")}。`,
	})}”。`
```js
gz_jiaping: {
		audio: 2,
		unique: true,
		forceunique: true,
		derivation: ["bahuangsishiling", "gz_shunfu", "luanwu", "jianglue", "yongjin", "gz_fengying"],
		lordSkill: true,
		global: ["bahuangsishiling", "gz_jiaping_use"],
		init(player) {
			player.markSkill("bahuangsishiling");
		},
		subSkill: {
			use: {
				audio: "gz_jiaping",
				enable: "phaseUse",
				filter(event, player) {
					const target = game.findPlayer(current => {
						return current.hasSkill("gz_jiaping");
					});
					if (target && target.hasSkill("gz_jiaping_round")) {
						return false;
					}
					let list = ["gz_shunfu", "luanwu", "jianglue", "yongjin", "gz_fengying"].filter(i => {
						if (_status.jiapingUsed?.includes(i)) {
							return false;
						}
						const info = get.info(i);
						if (info?.filter) {
							return info.filter(event, player);
						}
						return true;
					});
					return event.jiapingCanUse && player.identity == "jin" && list.length;
				},
				onChooseToUse(event) {
					if (game.online) {
						return;
					}
					const player = event.player,
						history = _status.globalHistory;
					for (let i = history.length - 1; i >= 0; i--) {
						const evts = history[i]?.everything;
						if (evts.some(evt => evt.name == "showCharacter" && evt.player == player)) {
							event.set("jiapingCanUse", true);
						}
						if (history[i].isRound) {
							break;
						}
					}
				},
				chooseButton: {
					dialog(event, player) {
						let list = [
							["gz_shunfu", "gz_new_jin_simayi"],
							["luanwu", "gz_jiaxu"],
							["jianglue", "gz_wangping"],
							["yongjin", "gz_lingtong"],
							["gz_fengying", "gz_cuimao"],
						].filter(i => {
							return !_status.jiapingUsed || !_status.jiapingUsed.includes(i[0]);
						});
						return ui.create.dialog("嘉平", [list, "skill"]);
					},
					check(button) {
						const info = get.info(button.link);
						return info?.ai?.result?.player?.(get.player()) || 0;
					},
					filter(button) {
						const info = get.info(button.link);
						if (info?.filter) {
							return info.filter(get.event().getParent(), get.player());
						}
						return true;
					},
					backup(links, player) {
						const info = get.copy(get.info(links[0]));
						game.broadcastAll(
							(skill, name, info) => {
								lib.translate[skill] = get.translation(name);
								_status.jiapingUsed ??= [];
								info.preName = name;
								info.precontent = async (event, trigger, player) => {
									player.logSkill("bahuangsishiling");
									const skill = get.info("gz_jiaping_use_backup").preName;
									game.broadcastAll(
										list => {
											_status.jiapingUsed = list;
										},
										_status.jiapingUsed.concat([skill])
									);
									const target = game.findPlayer(current => {
										return current.hasSkill("gz_jiaping");
									});
									if (target) {
										target.addTempSkill("gz_jiaping_round", { global: ["roundStart", "roundEnd"] });
									}
									if (player.hasViceCharacter()) {
										await player.removeCharacter(1);
									}
								};
							},
							"gz_jiaping_use_backup",
							links[0],
							info
						);
						return info;
					},
					prompt(links, player) {
						return get.prompt2(links[0]);
					},
				},
				ai: {
					order: 8,
					result: {
						player: 1,
					},
				},
			},
			round: {
				charlotte: true,
			},
		},
	}
```

### gz_guikuang 名字:诡诳
描述: 出牌阶段限一次，你可以令两名势力不相同的角色拼点；拼点牌为红色的角色依次对没赢的角色造成1点伤害。
```js
gz_guikuang: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			if (ui.selected.targets.length) {
				const source = ui.selected.targets[0];
				return !source.isFriendOf(target) && source.canCompare(target);
			}
			return target.countCards("h");
		},
		selectTarget: 2,
		complexTarget: true,
		multitarget: true,
		async content(event, trigger, player) {
			const {
				targets: [target1, target2],
			} = event;
			const result = await target1.chooseToCompare(target2).forResult();
			let bool1 = target1 != result.winner,
				bool2 = target2 != result.winner;
			if (result.player && get.color(result.player) == "red") {
				if (bool1) {
					await target1.damage(target1);
				}
				if (bool2) {
					target1.line(target2, "green");
					await target2.damage(target1);
				}
			}
			if (result.target && get.color(result.target) == "red") {
				if (bool1) {
					target2.line(target1, "green");
					await target1.damage(target2);
				}
				if (bool2) {
					await target2.damage(target2);
				}
			}
		},
		ai: {
			order: 6,
			result: {
				target: -1,
			},
		},
	}
```

### gz_shujuan 名字:舒卷
描述: 锁定技，【戢鳞潜翼】每回合首次进入弃牌堆或其他角色装备区时，你获得并使用之。
```js
gz_shujuan: {
		audio: 2,
		derivation: "jilinqianyi",
		unique: true,
		forceunique: true,
		ai: {
			threaten: 2,
		},
		trigger: {
			global: ["loseAfter", "cardsDiscardAfter", "equipAfter", "loseAsyncAfter"],
		},
		forced: true,
		filter(event, player) {
			const history = _status.globalHistory[_status.globalHistory.length - 1];
			if (event.name == "equip" && event.card.name == "jilinqianyi") {
				if (player == event.player) {
					return false;
				}
				if (
					history?.everything
						?.filter(evt => {
							return evt.name == "equip" && evt.card.name == "jilinqianyi" && evt.player != player;
						})
						.indexOf(event) != 0
				) {
					return false;
				}
				return event.player.getVCards("e").includes(event.card);
			}
			let entered = false;
			game.getGlobalHistory("cardMove", function (evt) {
				if (evt.name != "lose" && evt.name != "cardsDiscard") {
					return false;
				}
				if (evt.name == "lose" && evt.position != ui.discardPile) {
					return false;
				}
				if (evt == event || evt.getParent() == event) {
					return false;
				}
				if (evt.cards?.some(card => card.name == "jilinqianyi")) {
					entered = true;
				}
			});
			return !entered && event.getd().some(card => card.name == "jilinqianyi" && get.position(card) == "d");
		},
		logTarget(event, player) {
			if (event.name == "equip" && event.card.name == "jilinqianyi" && event.player.getVCards("e").includes(event.card)) {
				return event.player;
			}
			return [];
		},
		async content(event, trigger, player) {
			await game.delayx();
			let cards = [];
			if (trigger.name == "equip") {
				if (trigger.card.name == "jilinqianyi" && trigger.player.getVCards("e").includes(trigger.card)) {
					cards.addArray(trigger.player.getCards("e", { name: "jilinqianyi" }));
				}
			}
			cards.addArray(trigger.getd().filter(card => card.name == "jilinqianyi" && get.position(card) == "d"));
			let owner = get.owner(cards[0]);
			if (owner) {
				await player.gain(cards, "give", owner, "bySelf");
			} else {
				await player.gain(cards, "gain2");
			}
			for (let card of cards) {
				if (get.position(card) == "h") {
					await player.equip(card);
				}
			}
		},
	}
```

## gz_simaliang 名字:司马亮 势力:jin

### gz_gongzhi 名字:共执
描述: 你可以跳过摸牌阶段，令与你势力相同的角色依次摸一张牌直到共计摸四张牌。
```js
gz_gongzhi: {
		trigger: {
			player: "phaseDrawBefore",
		},
		async content(event, trigger, player) {
			trigger.cancel();
			let num = 0,
				target = player;
			while (num < 4) {
				await target.draw();
				num++;
				target = target.getNext();
				while (!player.isFriendOf(target)) {
					target = target.getNext();
				}
			}
		},
	}
```

### gz_sheju 名字:慑惧
描述: 锁定技，其他角色明置武将牌后，若与你势力相同，你回复1点体力，然后弃置所有手牌。
```js
gz_sheju: {
		trigger: {
			global: "showCharacterEnd",
		},
		filter(event, player) {
			return event.player != player && event.player.isFriendOf(player) && player.isDamaged();
		},
		forced: true,
		async content(event, trigger, player) {
			await player.recover();
			const cards = player.getDiscardableCards(player, "h");
			if (cards.length) {
				await player.discard(cards);
			}
		},
	}
```

## gz_wangjun 名字:王濬 势力:jin

### gz_chengliu 名字:乘流
描述: 出牌阶段限一次，你可以对一名装备区牌数小于你的角色造成1点伤害，然后你可以与其交换装备区内的牌并重复此流程。
```js
gz_chengliu: {
		audio: "jsrgchengliu",
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return game.hasPlayer(current => {
				return current.countCards("e") < player.countCards("e");
			});
		},
		filterTarget(card, player, target) {
			return target.countCards("e") < player.countCards("e");
		},
		async content(event, trigger, player) {
			let target = event.target;
			while (true) {
				await target.damage();
				if (!target.isIn()) {
					return;
				}
				const result = await player
					.chooseBool(`是否与${get.translation(target)}交换装备区里的牌并重复此流程？`)
					.set("choice", false)
					.forResult();
				if (result.bool) {
					await player.swapEquip(target);
					if (
						!game.hasPlayer(current => {
							return current.countCards("e") < player.countCards("e");
						})
					) {
						break;
					}
					const result2 = await player
						.chooseTarget("乘流：对一名装备区牌数少于你的角色造成1点伤害", (card, player, target) => {
							return target.countCards("e") < player.countCards("e");
						})
						.forResult();
					if (result2.bool) {
						target = result2.targets[0];
						player.line(target, "green");
					} else {
						break;
					}
				} else {
					break;
				}
			}
		},
		ai: {
			order: 7,
			result: {
				target: -2,
			},
		},
	}
```

## gz_malong 名字:马隆 势力:jin

### gz_zhuanzhan 名字:转战
描述: 锁定技，若场上有未确定势力的角色，你使用【杀】无距离限制且不能指定已确定势力的角色为目标。
```js
gz_zhuanzhan: {
		locked: true,
		mod: {
			targetInRange(card, player) {
				if (game.hasPlayer(current => current.isUnseen()) && card.name == "sha") {
					return true;
				}
			},
			playerEnabled(card, player, target) {
				if (game.hasPlayer(current => current.isUnseen()) && card.name == "sha" && !target.isUnseen()) {
					return false;
				}
			},
		},
	}
```

### gz_xunji 名字:勋济
描述: 你使用【杀】可以额外指定两名目标，结算完成后若对所有目标角色均造成伤害，此【杀】不计入次数限制。
```js
gz_xunji: {
		audio: "jsrgxunji",
		trigger: {
			player: ["useCard1", "useCardAfter"],
		},
		forced: true,
		locked: false,
		filter(event, player, name) {
			if (event.card.name != "sha") {
				return false;
			}
			if (name == "useCardAfter") {
				return (
					event.targets?.every(target => {
						return target.hasHistory("damage", evt => evt.card == event.card);
					}) && event.addCount !== false
				);
			}
			let card = event.card;
			let range;
			let select = get.copy(get.info(card).selectTarget);
			if (select == undefined) {
				if (get.info(card).filterTarget == undefined) {
					return false;
				}
				range = [1, 1];
			} else if (typeof select == "number") {
				range = [select, select];
			} else if (get.itemtype(select) == "select") {
				range = select;
			} else if (typeof select == "function") {
				range = select(card, player);
				if (typeof range == "number") {
					range = [range, range];
				}
			}
			player._checkXunji = true;
			game.checkMod(card, player, range, "selectTarget", player);
			delete player._checkXunji;
			return range[1] != -1 && event.targets.length > range[1];
		},
		async content(event, trigger, player) {
			if (event.triggername == "useCardAfter") {
				trigger.addCount = false;
				let stat = player.getStat().card,
					name = trigger.card.name;
				if (typeof stat[name] == "number") {
					stat[name]--;
				}
			}
		},
		mod: {
			selectTarget(card, player, range) {
				if (card.name != "sha" || range[1] == -1 || player._checkXunji) {
					return;
				}
				range[1] += 2;
			},
		},
	}
```

## gz_simalun 名字:司马伦 势力:jin

### gz_zhulan 名字:助澜
描述: 一名其他角色受到伤害时，若伤害来源与其同势力，你可以弃置一张牌令此伤害+1。
```js
gz_zhulan: {
		trigger: {
			global: "damageBegin3",
		},
		filter(event, player) {
			return event.player != player && event.source?.isFriendOf(event.player) && player.countCards("he");
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("he", get.prompt2(event.skill, trigger.player))
				.set("ai", card => {
					if (get.event().eff > 0) {
						return 0;
					}
					return 7 - get.value(card);
				})
				.set("eff", get.attitude(player, trigger.player))
				.set("chooseonly", true)
				.setHiddenSkill(event.skill)
				.forResult();
			event.result.targets = [trigger.player];
		},
		async content(event, trigger, player) {
			await player.discard(event.cards);
			trigger.num++;
		},
	}
```

### gz_luanchang 名字:乱常
描述: 限定技，一名角色的回合结束时，若有本回合受到伤害的角色与你势力相同，你可以令当前回合角色将所有手牌当【万箭齐发】使用。
```js
gz_luanchang: {
		trigger: {
			global: "phaseEnd",
		},
		limited: true,
		skillAnimation: true,
		animationColor: "thunder",
		filter(event, player) {
			const card = new lib.element.VCard({ name: "wanjian" }, event.player.getCards("h"));
			return (
				event.player.countCards("h") &&
				event.player.hasUseTarget(card) &&
				game.hasPlayer2(current => {
					if (!player.isFriendOf(current)) {
						return false;
					}
					return current.getHistory("damage").length;
				})
			);
		},
		logTarget: "player",
		check(event, player) {
			const card = new lib.element.VCard({ name: "wanjian" }, event.player.getCards("h"));
			let eff = event.player.countCards("h");
			game.filterPlayer(current => {
				if (event.player.canUse(card, current)) {
					eff += get.effect(current, card, event.player, player);
				}
			});
			return eff > 0;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const card = new lib.element.VCard({ name: "wanjian" }, trigger.player.getCards("h"));
			await trigger.player.chooseUseTarget(card, trigger.player.getCards("h"), true);
		},
	}
```

## gz_jin_guohuai 名字:郭槐 势力:jin

### gz_zhefu 名字:哲妇
描述: 你于回合外使用或打出基本牌时，可以选择一名与其同势力角色数不小于与你同势力角色数的角色，观看其手牌，然后可以弃置其中一张基本牌。
```js
gz_zhefu: {
		audio: "zhefu",
		trigger: {
			player: ["useCardAfter", "respondAfter"],
		},
		filter(event, player) {
			return (
				player != _status.currentPhase &&
				get.type(event.card) == "basic" &&
				game.hasPlayer(current => {
					const num1 = game.countPlayer(target => target.identity == current.identity),
						num2 = game.countPlayer(target => target.identity == player.identity);
					return num1 >= num2 && current.countCards("h");
				})
			);
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					const num = game.countPlayer(current => target.identity == current.identity),
						num2 = get.event().numx;
					return num >= num2 && target.countCards("h");
				})
				.set(
					"numx",
					game.countPlayer(target => target.identity == player.identity)
				)
				.set("ai", target => {
					const player = get.player();
					return get.effect(target, { name: "guohe_copy2" }, player, player);
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			await player
				.discardPlayerCard(event.targets[0], "h", "visible")
				.set("filterButton", button => {
					return get.type(button.link) == "basic";
				})
				.forResult();
		},
	}
```

### gz_yidu 名字:遗毒
描述: 你使用伤害类牌后，可以展示一名未受到此牌伤害的目标角色至多两张手牌，若颜色相同，你弃置这些牌。
```js
gz_yidu: {
		audio: "yidu",
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return (
				get.is.damageCard(event.card) &&
				event.targets.some(target => {
					return target.countCards("h") > 0 && !target.hasHistory("damage", evt => evt.card == event.card);
				})
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					return get.event().targets.includes(target);
				})
				.set(
					"targets",
					trigger.targets.filter(target => {
						return target.countCards("h") > 0 && !target.hasHistory("damage", evt => evt.card == trigger.card);
					})
				)
				.set("ai", target => {
					const player = get.player();
					if (target.hasSkillTag("noh")) {
						return 0;
					}
					return -get.attitude(player, target);
				})
				.setHiddenSkill(event.skill)
				.forResult();
		},
		preHidden: true,
		async content(event, trigger, player) {
			const {
				targets: [target],
			} = event;
			if (!target.countCards("h")) {
				return;
			}
			const { cards } = await player
				.choosePlayerCard(target, "遗毒：展示" + get.translation(target) + "的至多两张手牌", true, "h", [1, Math.min(2, target.countCards("h"))])
				.set("forceAuto", true)
				.set("ai", button => {
					if (ui.selected.buttons.length) {
						return 0;
					}
					return 1 + Math.random();
				})
				.forResult();
			if (!cards?.length) {
				return;
			}
			await player.showCards(cards, get.translation(player) + "对" + get.translation(target) + "发动了【遗毒】");
			const color = get.color(cards[0], target);
			if (cards.every(card => get.color(card, target) == color)) {
				await target.modedDiscard(cards, player);
			}
		},
	}
```

## gz_wenyang 名字:文鸯 势力:jin

### gz_duanqiu 名字:断虬
描述: 准备阶段，你可以视为对一个势力的所有其他角色使用一张【决斗】。结算后令所有角色本回合仅能合计再使用X张手牌（X为此【决斗】结算过程中打出【杀】的数量）。
```js
gz_duanqiu: {
		audio: "jsrgfuzhen",
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		preHidden: true,
		filter(event, player) {
			const card = new lib.element.VCard({ name: "juedou", isCard: true });
			return game.hasPlayer(current => {
				if (current.isUnseen()) {
					return false;
				}
				return player.isEnemyOf(current) && player.canUse(card, current) && player != current;
			});
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseTarget(get.prompt2(event.skill), (cardx, player, target) => {
					if (target.isUnseen()) {
						return false;
					}
					const card = new lib.element.VCard({ name: "juedou", isCard: true });
					return player.isEnemyOf(target) && player.canUse(card, target) && target != player;
				})
				.set("ai", target => {
					const card = new lib.element.VCard({ name: "juedou", isCard: true });
					let eff = 0,
						limit = player.getHandcardLimit();
					for (let current of game.filterPlayer(i => target.isFriendOf(i))) {
						if (player.canUse(card, current)) {
							limit++;
							eff += get.effect(current, card, player, player);
						}
					}
					if (player.countCards("h") > limit) {
						eff -= 2 * (player.countCards("h") - limit);
					}
					return eff;
				})
				.setHiddenSkill(event.skill)
				.forResult();
			if (result.bool) {
				event.result = {
					bool: true,
					targets: game.filterPlayer(i => result.targets[0].isFriendOf(i) && i != player),
				};
			}
		},
		async content(event, trigger, player) {
			const card = new lib.element.VCard({ name: "juedou", isCard: true }),
				targets = event.targets.filter(target => player.canUse(card, target));
			await player.useCard(card, targets);
			if (!player.isIn()) {
				return;
			}
			let num = 0;
			game.filterPlayer(current => {
				current.checkHistory("respond", evt => {
					if (evt.getParent(4) == event) {
						num++;
					}
				});
			});
			player.addTempSkill("gz_duanqiu_count");
			if (num > 0) {
				player.addMark("gz_duanqiu_count", num, 0);
			}
		},
		global: "gz_duanqiu_zhixi",
		subSkill: {
			count: {
				charlotte: true,
				init(player, skill) {
					player.storage[skill] = 0;
				},
				onremove: true,
				mark: true,
				intro: {
					content: "本回合所有角色合计还可使用#张手牌",
				},
				trigger: {
					global: "useCard",
				},
				firstDo: true,
				filter(event, player) {
					return event.player.hasHistory("lose", evt => {
						return evt.hs.length > 0 && (evt.relatedEvent || evt.getParent()) == event;
					});
				},
				direct: true,
				async content(event, trigger, player) {
					player.removeMark(event.name, 1, false);
				},
				ai: {
					presha: true,
					pretao: true,
				},
			},
			zhixi: {
				mod: {
					cardEnabled(card) {
						if (get.position(card) != "h" || !_status.currentPhase) {
							return;
						}
						const target = _status.currentPhase;
						if (target.hasSkill("gz_duanqiu_count") && !target.hasMark("gz_duanqiu_count")) {
							return false;
						}
					},
					cardSavable(card) {
						if (get.position(card) != "h" || !_status.currentPhase) {
							return;
						}
						const target = _status.currentPhase;
						if (target.hasSkill("gz_duanqiu_count") && !target.hasMark("gz_duanqiu_count")) {
							return false;
						}
					},
				},
			},
		},
	}
```

## gz_bailingyun 名字:柏夫人 势力:jin

### gz_xiace 名字:黠策
描述: 若当前回合角色有出牌阶段剩余出杀次数，你可以将一张牌当【无懈可击】使用并令其本回合出牌阶段出杀次数-1，然后你可以变更副将。
```js
gz_xiace: {
		audio: "dcxiace",
		enable: "chooseToUse",
		filterCard: true,
		viewAsFilter(player) {
			if (!_status.currentPhase || !player.countCards("hes")) {
				return false;
			}
			const target = _status.currentPhase,
				num = target.getCardUsable("sha", true);
			if (num <= 0) {
				return false;
			}
			const event = get.event().getParent("phaseUse", true, true);
			if (event) {
				return (
					num >
					target.getHistory("useCard", evt => {
						return evt.getParent("phaseUse") == event && evt.card.name == "sha" && evt.addCount !== false;
					}).length
				);
			}
			return true;
		},
		viewAs: {
			name: "wuxie",
		},
		async precontent(event, trigger, player) {
			const target = _status.currentPhase;
			if (target) {
				target.addTempSkill("gz_xiace_limit");
				target.addMark("gz_xiace_limit", 1, false);
			}
		},
		position: "hes",
		prompt: "将一张牌当【无懈可击】使用",
		check(card) {
			const tri = _status.event.getTrigger();
			if (tri && tri.card && tri.card.name == "chiling") {
				return -1;
			}
			return 8 - get.value(card);
		},
		group: "gz_xiace_change",
		subSkill: {
			change: {
				trigger: {
					player: "useCardAfter",
				},
				filter(event, player) {
					return event.skill == "gz_xiace";
				},
				silent: true,
				async content(event, _trigger, player) {
					await player.mayChangeVice(undefined, undefined);
					event.skill = "gz_xiace";
					await event.trigger("skillAfter");
				},
			},
			limit: {
				charlotte: true,
				onremove: true,
				intro: {
					markcount(storage) {
						return -(storage || 0);
					},
					content: "出杀次数-#",
				},
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num - player.countMark("gz_xiace_limit");
						}
					},
				},
			},
		},
	}
```

### gz_limeng 名字:离梦
描述: 结束阶段，你可以弃置一张非基本牌并选择两张珠联璧合的武将牌，若不为一名角色的武将牌，这些角色依次对对方造成1点伤害。
```js
gz_limeng: {
		audio: 2,
		trigger: {
			player: "phaseJieshuBegin",
		},
		filter(event, player) {
			if (
				!player.countCards("he", card => {
					if (_status.connectMode) {
						return true;
					}
					return get.type(card) != "basic";
				})
			) {
				return false;
			}
			return game.hasPlayer(current => {
				return game.hasPlayer(current2 => get.info("gz_limeng")?.isPerfectPair?.(current, current2));
			});
		},
		isPerfectPair(player, target) {
			let list1 = [],
				list2 = [];
			for (let i = 0; i < 2; i++) {
				if (!player.isUnseen(i)) {
					list1.push(player[`name${i + 1}`]);
				}
				if (!target.isUnseen(1)) {
					list2.push(target[`name${i + 1}`]);
				}
			}
			if (!list1.length || !list2.length) {
				return false;
			}
			return list1.some(name => {
				return list2.some(name2 => {
					const tempPlayer = {
						name1: name,
						name2: name2,
					};
					return lib.element.player.perfectPair.call(tempPlayer);
				});
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt2(event.skill),
					filterCard(card, player) {
						return get.type(card) != "basic" && lib.filter.cardDiscardable(card, player, "gz_limeng");
					},
					filterTarget(card, player, target) {
						const filter = get.info("gz_limeng")?.isPerfectPair;
						if (ui.selected.targets.length) {
							const targetx = ui.selected.targets[0];
							return filter && filter(target, targetx);
						}
						return game.hasPlayer(current => filter && filter(target, current));
					},
					selectTarget() {
						if (ui.selected.targets.length && ui.selected.targets[0]?.perfectPair()) {
							return [1, 2];
						}
						return 2;
					},
					complexTarget: true,
					complexSelect: true,
					ai1(card) {
						return 7 - get.value(card);
					},
					ai2(target) {
						const filter = get.info("gz_limeng")?.isPerfectPair;
						if (
							!game.hasPlayer(current => {
								return current != target && filter?.(target, current);
							})
						) {
							return 0;
						}
						return get.damageEffect(target, target, player);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const {
				cards,
				targets: [target1, target2],
			} = event;
			await player.discard(cards);
			if (target2) {
				if (target1.isIn() && target2.isIn()) {
					target1.line(target2, "thunder");
					await target2.damage(target1);
				}
				if (target1.isIn() && target2.isIn()) {
					target2.line(target1, "thunder");
					await target1.damage(target2);
				}
			}
		},
	}
```

## gz_sunxiù 名字:孙秀 势力:jin

### gz_xiejian 名字:挟奸
描述: 出牌阶段限一次，你可以对一名其他角色发起一次“军令”，若其不执行，其执行未被你选择的另一项“军令”。
```js
gz_xiejian: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget: lib.filter.notMe,
		async content(event, trigger, player) {
			const target = event.target;
			const { junling, targets: junlingTargets, unchosenJunling: junling2 } = await player.chooseJunlingFor(target).forResult();
			const choiceList = [];
			choiceList.push("执行该军令");
			choiceList.push(`执行未被${get.translation(player)}选择的军令`);

			const result = await target.chooseJunlingControl(player, junling, junlingTargets).set("prompt", "挟奸").set("choiceList", choiceList).set("ai", chooseJunlingCheck).forResult();

			if (result.index == 0) {
				await target.carryOutJunling(player, junling, junlingTargets);
			} else {
				let targets = [];
				if (junling2[0] == "junling1") {
					const result2 = await player
						.chooseTarget("选择一名角色，做为因该军令被执行而受到伤害的角色", true)
						.set("ai", other => get.damageEffect(other, target, player))
						.forResult();
					if (result2.bool) {
						player.line(result2.targets, "green");
						targets = result2.targets;
					}
				}
				await target.carryOutJunling(player, junling2[0], targets);
			}

			function chooseJunlingCheck() {
				return get.junlingEffect(player, junling, target, junlingTargets, target) > 1 ? 0 : 1;
			}
		},
		ai: {
			order: 3,
			result: {
				target: -1,
			},
		},
	}
```

### gz_yinsha 名字:引杀
描述: 你可以将所有手牌当【借刀杀人】使用，目标角色须使用【杀】响应（无【杀】则改为将所有手牌当【杀】使用）。
```js
gz_yinsha: {
		audio: 2,
		enable: "chooseToUse",
		filterCard: true,
		selectCard: -1,
		position: "h",
		viewAs: {
			name: "jiedao",
		},
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		viewAsFilter(player) {
			return player.countCards("h") > 0;
		},
		prompt: "将所有手牌当借刀杀人使用",
		check(card) {
			const val = get.value(card);
			return 5 - val;
		},
		ai: {
			result: {
				player(player, target) {
					if (!target.hasSkillTag("noe") && get.attitude(player, target) > 0) {
						return 0;
					}
					if (player.countCards("h") >= Math.max(3, player.hp)) {
						return 0;
					}
					return (
						(player.hasSkillTag("noe") ? 0.32 : 0.15) *
						target.getEquips(1).reduce((num, i) => {
							return num + get.value(i, player);
						}, 0)
					);
				},
			},
		},
		group: "gz_yinsha_effect",
		subSkill: {
			effect: {
				trigger: {
					global: "chooseToUseBegin",
				},
				filter(event, player) {
					if (event.getParent().name !== "jiedao") {
						return false;
					}
					const evt = event.getParent(2);
					return evt?.name === "useCard" && evt.player === player && evt.skill == "gz_yinsha";
				},
				async cost(event, trigger, player) {
					const target = trigger.player;
					if (target.countCards("h", "sha")) {
						const backup = _status.event;
						_status.event = trigger;
						const bool =
							target.countCards("h", card => {
								return (
									trigger.filterCard(card, player, trigger) &&
									game.hasPlayer(current => {
										return current !== target && trigger.filterTarget(card, target, current);
									})
								);
							}) > 0;
						_status.event = backup;
						trigger.set("forced", bool);
					} else if (target.countCards("h")) {
						const card = get.autoViewAs({ name: "sha" }, target.getCards("h"));
						const backup = _status.event;
						_status.event = trigger;
						const bool = trigger.filterCard(card, player, trigger);
						const targets = game.filterPlayer(current => {
							return current !== target && trigger.filterTarget(card, target, current);
						});
						_status.event = backup;
						if (bool && targets.length) {
							trigger.result = {
								bool: true,
								card: card,
								cards: target.getCards("h"),
								targets: targets,
							};
							trigger.untrigger();
							trigger.set("responded", true);
						}
					}
				},
			},
		},
	}
```

## gz_yangjun 名字:杨骏 势力:jin

### gz_neiji 名字:内忌
描述: 出牌阶段开始时，你可以选择一名与你势力不同或未确定势力的其他角色，与其同时展示两张手牌，然后弃置展示的【杀】。若合计弃置牌数大于1，你与其各摸三张牌；否则未弃置牌的角色视为对弃置了牌的角色使用一张【决斗】。
```js
gz_neiji: {
		audio: 2,
		trigger: {
			player: "phaseUseBegin",
		},
		preHidden: true,
		filter(event, player) {
			return game.hasPlayer(current => {
				if (current == player) {
					return false;
				}
				if (player.isUnseen()) {
					return current.isUnseen();
				}
				return !current.isFriendOf(player);
			});
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), (card, player, target) => {
					if (target == player) {
						return false;
					}
					if (player.isUnseen()) {
						return target.isUnseen();
					}
					return !target.isFriendOf(player);
				})
				.setHiddenSkill(event.skill)
				.set("ai", target => {
					const player = get.player(),
						num = player.countCards("h", "sha");
					if (num >= 2) {
						return get.attitude(player, target);
					}
					if (num == 1) {
						return -get.attitude(player, target);
					}
					return 0;
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const next = player
				.chooseCardOL([player, target], "内忌：请选择要展示的牌", true, 2)
				.set("ai", card => {
					if (card.name == "sha") {
						return 7 - get.value(card);
					}
					return -get.value(card);
				})
				.set("source", player);
			next.aiCard = function (target) {
				let hs = target.getCards("h");
				if (hs.length > 2) {
					hs = hs.randomGets(2);
				}
				return { bool: true, cards: hs };
			};
			next._args.remove("glow_result");
			const result = await next.forResult();
			let cards1 = result[0].cards,
				cards2 = result[1].cards;
			await player.showCards(cards1);
			await target.showCards(cards2);
			player.$throw(cards1, 1000);
			target.$throw(cards2, 1000);
			let lose_list = [],
				num = 0,
				discards = [];
			if (cards1.some(card => card.name == "sha")) {
				const cards = cards1.filter(card => card.name == "sha");
				lose_list.push([player, cards]);
				num += cards.length;
				discards.push(player);
			}
			if (cards2.some(card => card.name == "sha")) {
				const cards = cards2.filter(card => card.name == "sha");
				lose_list.push([target, cards]);
				num += cards.length;
				discards.push(target);
			}
			await game
				.loseAsync({
					lose_list: lose_list,
					discarder: player,
				})
				.setContent("discardMultiple");
			if (num > 1) {
				await game.asyncDraw([player, target], 3);
			} else {
				if (discards.length == 1) {
					const targetx = discards[0],
						user = [player, target].find(i => i != targetx),
						card = new lib.element.VCard({ name: "juedou", isCard: true });
					if (user.canUse(card, targetx)) {
						await user.useCard(card, targetx, "noai");
					}
				}
			}
		},
	}
```

## gz_wangxiang 名字:王祥 势力:jin

### gz_bingxin 名字:冰心
描述: 每种牌名每回合限一次。当你需要使用基本牌时，若你的手牌数等于体力值且这些牌的颜色均相同，则你可以摸一张牌，视为使用一张基本牌。
```js
gz_bingxin: {
		audio: "bingxin",
		enable: "chooseToUse",
		hiddenCard(player, name) {
			if (get.type(name) == "basic" && lib.inpile.includes(name) && !player.getStorage("gz_bingxin_count").includes(name)) {
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
			var storage = player.storage.gz_bingxin_count;
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
				var storage = player.storage.gz_bingxin_count;
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
					precontent() {
						player.logSkill("gz_bingxin");
						player.draw();
						var name = event.result.card.name;
						player.addTempSkill("gz_bingxin_count");
						player.markAuto("gz_bingxin_count", [name]);
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
				var storage = player.storage.gz_bingxin_count;
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

## gz_jin_zhangchunhua 名字:gz_jin_zhangchunhua 势力:jin

### gzhuishi 名字:慧识
描述: 摸牌阶段，你可以放弃摸牌，改为观看牌堆顶的X张牌，获得其中的一半（向下取整），然后将其余牌置入牌堆底。（X为弃牌堆顶的两张牌的名称字数之和）
```js
gzhuishi: {
		audio: "huishi",
		trigger: { player: "phaseDrawBegin1" },
		filter(event, player) {
			return ui.discardPile.childNodes.length > 0;
		},
		preHidden: true,
		prompt() {
			return get.prompt("huishi") + "（可观看牌数：" + lib.skill.gzhuishi.getNum() + "）";
		},
		check(event, player) {
			return lib.skill.gzhuishi.getNum() > 3;
		},
		getNum() {
			var list = [];
			list.push(ui.discardPile.lastChild);
			if (list[0].previousSibling) {
				list.push(list[0].previousSibling);
			}
			var num = 0;
			for (var i of list) {
				var name = get.translation(i.name);
				if (name == "挟令") {
					name = "挟天子以令诸侯";
				}
				num += name.length;
			}
			return num;
		},
		async content(event, trigger, player) {
			trigger.changeToZero();
			var cards = get.cards(lib.skill.gzhuishi.getNum(), true);
			await game.cardsGotoOrdering(cards);
			var num = Math.ceil(cards.length / 2);
			var next = player.chooseToMove("慧识：将" + get.cnNumber(num) + "张牌置于牌堆底并获得其余的牌", true);
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
			if (result.bool) {
				var list = result.moved;
				if (list[0].length) {
					await player.gain(list[0], "gain2");
				}
				if (list[1].length) {
					await game.cardsGotoPile(list[1]);
				}
			}
		},
	}
```

### fakeqingleng 名字:清冷
描述: 其他角色的结束阶段，若其武将牌均明置，则你可以将一张牌当作冰【杀】对其使用（无距离限制）。然后若此牌未对其造成伤害，则你暗置其一张武将牌，且直到其下个回合开始，其明置此武将牌时，你对其造成1点伤害。
```js
fakeqingleng: {
		audio: "qingleng",
		trigger: { global: "phaseEnd" },
		filter(event, player) {
			var target = event.player;
			return target != player && target.isIn() && !target.isUnseen(2) && player.countCards("he") && player.canUse({ name: "sha", nature: "ice" }, target, false);
		},
		direct: true,
		preHidden: true,
		async content(event, trigger, player) {
			const target = trigger.player;
			const { bool } = await player
				.chooseToUse()
				.set("openskilldialog", get.prompt2("fakeqingleng", target))
				.set("norestore", true)
				.set("_backupevent", "fakeqingleng_backup")
				.set("custom", {
					add: {},
					replace: { window() {} },
				})
				.set("targetRequired", true)
				.set("complexSelect", true)
				.set("complexTarget", true)
				.set("filterTarget", function (card, player, target) {
					if (target != _status.event.sourcex && !ui.selected.targets.includes(_status.event.sourcex)) {
						return false;
					}
					return lib.filter.targetEnabled.apply(this, arguments);
				})
				.set("sourcex", target)
				.set("addCount", false)
				.setHiddenSkill("fakeqingleng")
				.backup("fakeqingleng_backup")
				.set("logSkill", ["fakeqingleng", target])
				.forResult();
			if (
				bool &&
				!player.getHistory("sourceDamage", evt => {
					return evt.getParent(4) == event;
				}).length
			) {
				const { bool, links } = await player
					.chooseButton(["清冷：暗置" + get.translation(target) + "的一张武将牌", '<div class="text center">' + get.translation(target) + "的武将牌</div>", [[target.name1, target.name2], "character"]], true)
					.set("filterButton", button => !get.is.jun(button.link))
					.forResult();
				if (bool) {
					player.line(target);
					player.addSkill("fakeqingleng_effect");
					if (player.getStorage("fakeqingleng_effect").some(list => list[0] == target)) {
						player.storage.fakeqingleng_effect.indexOf(player.getStorage("fakeqingleng_effect").find(list => list[0] == target))[1].addArray(links);
					} else {
						player.markAuto("fakeqingleng_effect", [[target, links[0]]]);
					}
					target
						.when(["phaseBegin", "die"])
						.step(async () => {
							const removes = player.getStorage("fakeqingleng_effect").filter(list => list[0] == target);
							player.unmarkAuto("fakeqingleng_effect", removes);
							if (!player.getStorage("fakeqingleng_effect").length) {
								player.removeSkill("fakeqingleng_effect");
							}
						});
					await target.hideCharacter(target.name1 == links[0] ? 0 : 1);
				}
			}
		},
		subSkill: {
			backup: {
				filterCard(card) {
					return get.itemtype(card) == "card";
				},
				check(card) {
					return 7.5 - get.value(card);
				},
				position: "he",
				popname: true,
				viewAs: { name: "sha", nature: "ice" },
				log: false,
			},
			effect: {
				charlotte: true,
				onremove: true,
				intro: {
					content(storage) {
						return (
							"•" +
							storage
								.map(list => {
									return get.translation(list[0]) + "明置" + get.translation(list[1]) + "后，对其造成1点伤害";
								})
								.join("<br>•")
						);
					},
				},
				audio: "qingleng",
				trigger: { global: "showCharacterEnd" },
				filter(event, player) {
					const list = player.getStorage("fakeqingleng_effect").find(list => list[0] == event.player);
					return list && list[1].includes(event.toShow);
				},
				forced: true,
				logTarget: "player",
				content() {
					trigger.player.damage();
				},
			},
		},
	}
```

## gz_new_jin_zhangchunhua 名字:绶张春华 势力:jin

### gz_ejue 名字:扼绝
描述: 锁定技，你使用【杀】对一名角色造成伤害时，若其未确定势力，此伤害+1。
```js
gz_ejue: {
		audio: "oljianmie",
		trigger: {
			source: "damageBegin1",
		},
		filter(event, player) {
			return event?.card?.name == "sha" && event.player.isUnseen();
		},
		preHidden: true,
		forced: true,
		logTarget: "player",
		async content(event, trigger, player) {
			trigger.num++;
		},
	}
```

### gz_shangshi 名字:伤逝
描述: 一名角色的回合结束时，你可以将手牌摸至你的已损失体力值
```js
gz_shangshi: {
		audio: "reshangshi",
		trigger: {
			global: "phaseEnd",
		},
		filter(event, player) {
			return player.countCards("h") < player.getDamagedHp();
		},
		preHidden: true,
		frequent: true,
		async content(event, trigger, player) {
			await player.drawTo(player.getDamagedHp());
		},
	}
```

## gz_jin_simayi 名字:gz_jin_simayi 势力:jin

### fakequanbian 名字:权变
描述: 当你于回合内使用或打出牌时，你可以将一张手牌与牌堆顶X张牌的其中一张进行交换（X为你的体力上限）。
```js
fakequanbian: {
		audio: "quanbian",
		trigger: { player: ["useCard", "respond"] },
		filter(event, player) {
			if (!Array.from(ui.cardPile.childNodes).length) {
				return false;
			}
			return player.countCards("h") && _status.currentPhase == player;
		},
		async cost(event, trigger, player) {
			const cards = Array.from(ui.cardPile.childNodes);
			const { bool, moved } = await player
				.chooseToMove(get.prompt2("fakequanbian"))
				.set("list", [
					["牌堆顶", cards.slice(0, Math.min(player.maxHp, cards.length)), "fakequanbian_tag"],
					["手牌", player.getCards("h")],
				])
				.set("filterOk", moved => moved[1].filter(i => !get.owner(i)).length == 1)
				.set("filterMove", (from, to) => typeof to != "number")
				.set("processAI", list => {
					const player = get.event().player,
						goon = player.hasSkill("fakezhouting");
					let cards1 = list[0][1].slice(),
						cards2 = list[1][1].slice();
					let card1 = cards1.slice().sort((a, b) => get[goon ? "useful" : "value"](goon ? a : b) - get[goon ? "useful" : "value"](goon ? b : a))[0];
					let card2 = cards2.slice().sort((a, b) => get[goon ? "useful" : "value"](goon ? b : a) - get[goon ? "useful" : "value"](goon ? a : b))[0];
					if (get[goon ? "useful" : "value"](card1) * (goon ? -1 : 1) < get[goon ? "useful" : "value"](card2) * (goon ? -1 : 1)) {
						cards1.remove(card1);
						cards2.remove(card2);
						return [cards1.concat(card2), cards2.concat(card1)];
					}
				})
				.forResult();
			if (bool) {
				event.result = {
					bool: true,
					cost_data: [moved[0].filter(i => get.owner(i))[0], moved[1].filter(i => !get.owner(i))[0]],
				};
			} else {
				event.result = { bool: false };
			}
		},
		async content(event, trigger, player) {
			await player
				.lose(event.cost_data[0], ui.cardPile)
				.set("insert_index", () => {
					return ui.cardPile.childNodes[Array.from(ui.cardPile.childNodes).indexOf(get.event().card2)];
				})
				.set("card2", event.cost_data[1]);
			await player.gain(event.cost_data[1], "gain2");
		},
	}
```

### smyyingshi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### fakezhouting 名字:骤霆
描述: 限定技，出牌阶段，你可以依次使用牌堆顶X张牌中所有可以使用的牌，然后获得其中不能使用的牌，然后若有角色因此死亡，则你重置〖骤霆〗（X为你的体力上限）。
```js
fakezhouting: {
		unique: true,
		limited: true,
		audio: "xiongzhi",
		enable: "phaseUse",
		skillAnimation: true,
		animationColor: "thunder",
		async content(event, trigger, player) {
			player.awakenSkill("fakezhouting");
			let gains = [];
			const cards = Array.from(ui.cardPile.childNodes).slice(0, Math.min(player.maxHp, Array.from(ui.cardPile.childNodes).length));
			await game.cardsGotoOrdering(cards);
			for (const card of cards) {
				if (player.hasUseTarget(card, false, false) || (get.info(card).notarget && lib.filter.cardEnabled(card, player))) {
					await player.chooseUseTarget(card, true, false, "nodistance");
				} else {
					gains.push(card);
				}
			}
			if (gains.length) {
				await player.gain(gains, "gain2");
			}
			if (
				game.getGlobalHistory("everything", evt => {
					return evt.name == "die" && evt.getParent(6) == event && evt.getParent(6).player == player;
				}).length
			) {
				player.restoreSkill("fakezhouting");
			}
		},
		ai: {
			order: 1,
			result: {
				player(player) {
					return player.hasUnknown() ? 0 : 1;
				},
			},
		},
	}
```

## gz_new_jin_simayi 名字:绶司马懿 势力:jin

### gz_yingshi 名字:鹰视
描述: 出牌阶段开始时，你可以令一名角色视为对你指定的令一名角色使用一张【知己知彼】，然后若使用者不为你，你摸一张牌。
```js
gz_yingshi: {
		audio: "smyyingshi",
		trigger: {
			player: "phaseUseBegin",
		},
		filter(event, player) {
			const card = new lib.element.VCard({ name: "zhibi", isCard: true });
			return game.hasPlayer(current => current.hasUseTarget(card));
		},
		preHidden: true,
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), 2)
				.set("filterTarget", (cardx, player, target) => {
					const card = new lib.element.VCard({ name: "zhibi", isCard: true });
					if (ui.selected.targets.length) {
						const user = ui.selected.targets[0];
						return user.canUse(card, target);
					}
					return target.hasUseTarget(card);
				})
				.set("ai", target => {
					const att = get.attitude(get.player(), target);
					if (att <= 0) {
						return 0;
					}
					const card = new lib.element.VCard({ name: "zhibi", isCard: true });
					return target != get.player() ? target.getUseValue(card) : 0.2;
				})
				.set("targetprompt", ["使用者", "目标"])
				.set("complexTarget", true)
				.setHiddenSkill(event.skill)
				.forResult();
		},
		async content(event, trigger, player) {
			const card = new lib.element.VCard({ name: "zhibi", isCard: true });
			await event.targets[0].useCard(card, event.targets[1], "noai");
			if (event.targets[0] != player) {
				await player.draw();
			}
		},
	}
```

### gz_shunfu 名字:瞬覆
描述: 限定技，出牌阶段，你可以令至多三名未确定势力的其他角色各摸两张牌，这些角色依次可以使用一张无距离限制且不可被响应的【杀】。
```js
gz_shunfu: {
		skillAnimation: true,
		animationColor: "thunder",
		unique: true,
		enable: "phaseUse",
		audio: "xiongzhi",
		limited: true,
		selectTarget: [1, 3],
		filterTarget(card, player, target) {
			return player != target && target.isUnseen();
		},
		multitarget: true,
		multiline: true,
		async content(event, trigger, player) {
			event.targets.sortBySeat(_status.currentPhase);
			player.awakenSkill(event.name);
			await game.asyncDraw(event.targets, 2);
			for (const target of event.targets) {
				await target
					.chooseToUse(function (card, player, event) {
						if (get.name(card) != "sha") {
							return false;
						}
						return lib.filter.filterCard.apply(this, arguments);
					}, "瞬覆：是否使用一张不可被响应的【杀】？")
					.set("oncard", card => {
						_status.event.directHit.addArray(game.players);
					})
					.set("filterTarget", function (card, player, target) {
						return lib.filter.targetEnabled.apply(this, arguments);
					});
			}
		},
		ai: {
			order: 1,
			result: {
				target: 1,
			},
		},
	}
```

## gz_jin_wangyuanji 名字:gz_jin_wangyuanji 势力:jin

## gz_jin_simazhao 名字:gz_jin_simazhao 势力:jin

## gz_jin_xiahouhui 名字:gz_jin_xiahouhui 势力:jin

### fakebaoqie 名字:宝箧
描述: ①当你受到伤害时，若此武将牌未明置过，则你可以明置此武将牌并防止此伤害。②当你首次明置此武将牌时，你可以获得一名角色装备区里所有的宝物牌，然后你可以使用其中的一张牌。
```js
fakebaoqie: {
		unique: true,
		audio: "baoqie",
		trigger: { player: "showCharacterEnd" },
		filter(event, player) {
			if (
				!game.hasPlayer(target => {
					return target.getGainableCards(player, "e").some(card => get.subtype(card) == "equip5");
				})
			) {
				return false;
			}
			return (
				game
					.getAllGlobalHistory(
						"everything",
						evt => {
							return evt.name == "showCharacter" && evt.player == player && evt.toShow.some(i => get.character(i, 3).includes("fakebaoqie"));
						},
						event
					)
					.indexOf(event) == 0
			);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt("fakebaoqie"), "获得一名角色装备区里所有的宝物牌，然后你可以使用其中的一张牌", (card, player, target) => {
					return target.getGainableCards(player, "e").some(card => get.subtype(card) == "equip5");
				})
				.set("ai", target => {
					const player = get.event().player;
					return (
						-get.sgn(get.attitude(player, target)) *
						target
							.getGainableCards(player, "e")
							.filter(card => {
								return get.subtype(card) == "equip5";
							})
							.reduce((sum, card) => sum + get.value(card, target), 0)
					);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			let cards = target.getGainableCards(player, "e").filter(card => get.subtype(card) == "equip5");
			await player.gain(cards, target, "giveAuto");
			cards = cards.filter(i => get.owner(i) == player && get.position(i) == "h" && player.hasUseTarget(i));
			if (cards.length) {
				const { bool, links } = await player
					.chooseButton(["宝箧：是否使用其中的一张宝物牌？", cards])
					.set("ai", button => {
						return get.equipValue(button.link, get.event().player);
					})
					.forResult();
				if (bool) {
					await player.chooseUseTarget(links[0], true);
				}
			}
		},
		ai: { mingzhi_no: true },
		group: "fakebaoqie_damage",
		subSkill: {
			damage: {
				audio: "baoqie",
				trigger: { player: "damageBegin4" },
				filter(event, player) {
					if (!player.getStockSkills(true, true, true).includes("fakebaoqie")) {
						return false;
					}
					const bool = get.character(player.name1, 3).includes("fakebaoqie") ? player.isUnseen(0) : player.isUnseen(1);
					if (!bool) {
						return false;
					}
					return !game.getAllGlobalHistory("everything", evt => {
						return evt.name == "showCharacter" && evt.player == player && evt.toShow.some(i => get.character(i, 3).includes("fakebaoqie"));
					}).length;
				},
				check(event, player) {
					return !event.source || get.damageEffect(player, event.source, player) < 0;
				},
				prompt: "宝箧：是否明置此武将牌并防止此伤害？",
				content() {
					trigger.cancel();
				},
			},
		},
	}
```

### jyishi
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### shiduo
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_jin_simashi 名字:gz_jin_simashi 势力:jin

## gz_duyu 名字:gz_duyu 势力:jin

## gz_zhanghuyuechen 名字:gz_zhanghuyuechen 势力:jin

## gz_jin_yanghuiyu 名字:gz_jin_yanghuiyu 势力:jin

## gz_simazhou 名字:gz_simazhou 势力:jin

## gz_shibao 名字:gz_shibao 势力:jin

## gz_weiguan 名字:gz_weiguan 势力:jin

## gz_zhongyan 名字:gz_zhongyan 势力:jin

### gzbolan 名字:博览
描述: `每名角色的出牌阶段限一次。其可以随机展示武将牌堆顶的一张武将牌，然后根据此武将牌包含的势力选择获得一个技能直到回合结束：魏:${get.poptip("gz_qice")}；蜀:${get.poptip("tiaoxin")}；吴:${get.poptip("gz_zhiheng")}；群:${get.poptip("new_chuli")}；晋:${get.poptip("gzsanchen")}。若该角色不为你，则其失去1点体力。`
```js
gzbolan: {
		audio: "bolan",
		global: "gzbolan_global",
		enable: "phaseUse",
		usable: 1,
		content() {
			"step 0";
			if ((event.num && event.num > 0) || !_status.characterlist.length) {
				event.finish();
				return;
			}
			var character = _status.characterlist.randomGet();
			var groups,
				double = get.is.double(character, true);
			if (double) {
				groups = double.slice(0);
			} else {
				groups = [lib.character[character][1]];
			}
			event.groups = groups;
			event.videoId = lib.status.videoId++;
			game.broadcastAll(
				function (player, id, character) {
					ui.create.dialog(get.translation(player) + "发动了【博览】", [[character], "character"]).videoId = id;
				},
				player,
				event.videoId,
				character
			);
			game.delay(3);
			"step 1";
			game.broadcastAll("closeDialog", event.videoId);
			var list1 = ["wei", "shu", "wu", "qun", "jin"],
				list2 = ["gz_qice", "tiaoxin", "gz_zhiheng", "new_chuli", "gzsanchen"];
			var skills = [];
			for (var i = 0; i < list1.length; i++) {
				if (event.groups.includes(list1[i])) {
					skills.push(list2[i]);
				}
			}
			if (!skills.length) {
				event.finish();
			} else if (skills.length == 1) {
				event._result = { control: skills[0] };
			} else {
				player.chooseControl(skills).set("prompt", "选择获得一个技能直到回合结束");
			}
			"step 2";
			var skill = result.control;
			player.addTempSkills(skill);
			player.popup(skill);
		},
		derivation: ["gz_qice", "tiaoxin", "gz_zhiheng", "new_chuli", "gzsanchen"],
		ai: {
			order: 10,
			result: { player: 1 },
		},
		subSkill: {
			global: {
				inherit: "gzbolan",
				filter(event, player) {
					return (
						!player.hasSkill("gzbolan", true) &&
						game.hasPlayer(function (current) {
							return current != player && current.hasSkill("gzbolan");
						})
					);
				},
				selectTarget: -1,
				filterTarget(card, player, target) {
					return target != player && target.hasSkill("gzbolan");
				},
				contentAfter() {
					player.loseHp();
				},
				ai: {
					order: 10,
					result: {
						player(player, target) {
							if (get.effect(player, { name: "losehp" }, player, player) > 0) {
								return 3;
							}
							if (player.isHealthy()) {
								return 1;
							}
							return -1;
						},
					},
				},
			},
		},
	}
```

### yifa
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_yangyan 名字:gz_yangyan 势力:jin

### gzxuanbei 名字:选备
描述: ①当你首次明置此武将牌时，你获得两张拥有“应变”或“合纵”标签的牌（不足则摸牌），且你本回合内使用带有“应变”标签的牌时直接强化，使用带有“合纵”标签的牌时摸一张牌。②当你死亡时，你可以令一名其他角色变更副将。
```js
gzxuanbei: {
		audio: "xuanbei",
		trigger: { player: "showCharacterAfter" },
		filter(event, player) {
			return (
				!player.storage.gzxuanbei &&
				event.toShow.some(name => {
					return get.character(name, 3).includes("gzxuanbei");
				})
			);
		},
		forced: true,
		locked: false,
		content() {
			"step 0";
			player.storage.gzxuanbei = true;
			var cards = [];
			while (cards.length < 2) {
				var card = get.cardPile2(function (card) {
					if (cards.includes(card)) {
						return false;
					}
					return card.hasTag("lianheng") || get.is.yingbian(card);
				});
				if (!card) {
					break;
				} else {
					cards.push(card);
				}
			}
			if (cards.length) {
				player.gain(cards, "gain2");
			}
			if (cards.length < 2) {
				player.draw(2 - cards.length);
			}
			"step 1";
			player.addTempSkill("gzxuanbei_effect");
		},
		group: "gzxuanbei_change",
		subSkill: {
			effect: {
				trigger: { player: "useCard" },
				forced: true,
				popup: false,
				charlotte: true,
				filter(event, player) {
					return get.cardtag(event.card, "lianheng");
				},
				content() {
					player.draw();
				},
				ai: { forceYingbian: true },
				mark: true,
				intro: { content: "使用应变牌时直接获得强化，使用合纵牌时摸一张牌。" },
			},
			change: {
				audio: "xuanbei",
				trigger: { player: "die" },
				direct: true,
				forceDie: true,
				skillAnimation: true,
				animationColor: "thunder",
				content() {
					"step 0";
					player
						.chooseTarget(get.prompt("gzxuanbei"), "令一名其他角色变更副将", lib.filter.notMe)
						.set("forceDie", true)
						.set("ai", function (target) {
							var player = _status.event.player;
							var rank = get.guozhanRank(target.name2, target) <= 3;
							var att = get.attitude(player, target);
							if (att > 0) {
								return (4 - rank) * att;
							}
							return -(rank - 6) * att;
						});
					"step 1";
					if (result.bool) {
						var target = result.targets[0];
						player.logSkill("gzxuanbei_change", target);
						game.delayx();
						target.changeVice();
					}
				},
			},
		},
	}
```

### xianwan
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_zuofen 名字:gz_zuofen 势力:jin

### gzzhaosong 名字:诏颂
描述: 每局游戏每项限一次。①一名角色进入濒死状态时，你可以令其回复至2点体力并摸一张牌。②出牌阶段，你可观看一名其他角色的所有暗置武将牌和手牌，然后可以获得其区域内的一张牌。③一名角色使用【杀】选择唯一目标后，你可以为此【杀】增加两个目标。
```js
gzzhaosong: {
		audio: "zhaosong",
		enable: "phaseUse",
		preHidden: ["gzzhaosong_dying", "gzzhaosong_sha"],
		filter(event, player) {
			return !player.getStorage("gzzhaosong").includes("效果②") && game.hasPlayer(current => lib.skill.gzzhaosong.filterTarget(null, player, current));
		},
		filterTarget(card, player, target) {
			return target != player && (target.isUnseen(2) || target.countCards("h") > 0);
		},
		promptfunc: () => "出牌阶段，你可观看一名其他角色的所有暗置武将牌和手牌，然后可以获得其区域内的一张牌。",
		content() {
			player.markAuto("gzzhaosong", ["效果②"]);
			if (target.isUnseen(2)) {
				player.viewCharacter(target, 2);
			}
			if (target.countCards("hej") > 0) {
				player.gainPlayerCard(target, "hej", "visible");
			}
		},
		ai: {
			order: 11,
			result: {
				player(player, target) {
					return get.effect(target, { name: "zhibi" }, player, player) + get.effect(target, { name: "shunshou_copy" }, player, player);
				},
			},
		},
		group: ["gzzhaosong_dying", "gzzhaosong_sha"],
		subSkill: {
			dying: {
				audio: "zhaosong",
				trigger: { global: "dying" },
				logTarget: "player",
				filter(event, player) {
					return !player.getStorage("gzzhaosong").includes("效果①") && event.player.isDying() && event.player.hp <= 0;
				},
				prompt2: "令该角色回复至2点体力并摸一张牌",
				check(event, player) {
					return event.player.isFriendOf(player) && get.attitude(player, event.player) > 0;
				},
				content() {
					player.markAuto("gzzhaosong", ["效果①"]);
					var target = trigger.player,
						num = 2 - target.hp;
					if (num > 0) {
						target.recover(num);
					}
					target.draw();
				},
			},
			sha: {
				audio: "zhaosong",
				trigger: { global: "useCard2" },
				direct: true,
				filter(event, player) {
					if (event.card.name != "sha" || player.getStorage("gzzhaosong").includes("效果③")) {
						return false;
					}
					return game.hasPlayer(function (current) {
						return !event.targets.includes(current) && lib.filter.filterTarget(event.card, event.player, current);
					});
				},
				content() {
					"step 0";
					player
						.chooseTarget([1, 2], get.prompt("gzzhaosong"), "为" + get.translation(trigger.card) + "增加至多两个目标", function (card, player, target) {
							var event = _status.event.getTrigger();
							return !event.targets.includes(target) && lib.filter.filterTarget(event.card, event.player, target);
						})
						.set("ai", function (target) {
							var event = _status.event.getTrigger();
							return get.effect(target, event.card, event.player, _status.event.player);
						})
						.set(
							"goon",
							game.countPlayer(function (current) {
								return !trigger.targets.includes(current) && lib.filter.filterTarget(trigger.card, trigger.player, current) && get.effect(current, trigger.card, trigger.player, player) > 0;
							}) >=
								Math.min(
									2,
									game.countPlayer(function (current) {
										return !trigger.targets.includes(current) && lib.filter.filterTarget(trigger.card, trigger.player, current);
									})
								)
						)
						.setHiddenSkill("gzzhaosong_sha");
					"step 1";
					if (result.bool) {
						if (!event.isMine() && !event.isOnline()) {
							game.delayx();
						}
					} else {
						event.finish();
					}
					"step 2";
					var targets = result.targets;
					player.markAuto("gzzhaosong", ["效果③"]);
					player.logSkill("gzzhaosong_sha", targets);
					trigger.targets.addArray(targets);
				},
			},
		},
	}
```

### gzlisi 名字:离思
描述: 一名己方角色死亡后，你可以选择〖诏颂〗中的一个已发动过的选项，令其视为未发动过。
```js
gzlisi: {
		audio: "lisi",
		trigger: { global: "dieAfter" },
		filter(event, player) {
			return event.player.isFriendOf(player) && player.getStorage("gzzhaosong").length > 0;
		},
		direct: true,
		content() {
			"step 0";
			var list = player.getStorage("gzzhaosong").slice(0);
			list.push("cancel2");
			player.chooseControl(list).set("prompt", get.prompt("gzlisi")).set("prompt2", "恢复〖诏颂〗的一个已发动的选项");
			"step 1";
			if (result.control != "cancel2") {
				player.logSkill("gzlisi");
				player.unmarkAuto("gzzhaosong", [result.control]);
			}
		},
	}
```

## gz_xuangongzhu 名字:gz_xuangongzhu 势力:jin

### fakeqimei 名字:齐眉
描述: 准备阶段，你可以选择一名其他角色。若如此做，直到回合结束：当你或其获得牌/失去手牌后，若你与其手牌数相等，则另一名角色回复1点体力；当你或其的体力值变化后，若你与其体力值相等，则另一名角色摸一张牌。
```js
fakeqimei: {
		audio: "qimei",
		trigger: { player: "phaseZhunbeiBegin" },
		direct: true,
		preHidden: true,
		content() {
			"step 0";
			player
				.chooseTarget(get.prompt("fakeqimei"), "选择一名其他角色并获得“齐眉”效果", lib.filter.notMe)
				.set("ai", target => {
					var player = _status.event.player;
					return get.attitude(player, target) / (Math.abs(player.countCards("h") + 2 - target.countCards("h")) + 1);
				})
				.setHiddenSkill("fakeqimei");
			"step 1";
			if (result.bool) {
				var target = result.targets[0];
				player.logSkill("fakeqimei", target);
				player.addTempSkill("fakeqimei_draw");
				player.storage.fakeqimei_draw = target;
				game.delayx();
			}
		},
		subSkill: {
			draw: {
				audio: "qimei",
				charlotte: true,
				forced: true,
				popup: false,
				trigger: {
					global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "loseAfter", "addToExpansionAfter"],
				},
				filter(event, player) {
					var target = player.storage.fakeqimei_draw;
					if (!target || !target.isIn()) {
						return false;
					}
					if (player.countCards("h") != target.countCards("h")) {
						return false;
					}
					var hasChange = function (event, player) {
						var gain = 0,
							lose = 0;
						if (event.getg) {
							gain = event.getg(player).length;
						}
						if (event.getl) {
							lose = event.getl(player).hs.length;
						}
						return gain != lose;
					};
					return (hasChange(event, player) && target.isDamaged()) || (hasChange(event, target) && player.isDamaged());
				},
				content() {
					"step 0";
					if (trigger.delay === false) {
						game.delayx();
					}
					"step 1";
					var target = player.storage.fakeqimei_draw;
					player.logSkill("fakeqimei_draw", target);
					var drawer = [];
					var hasChange = function (event, player) {
						var gain = 0,
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
					for (const i of drawer) {
						if (i.isDamaged()) {
							i.recover();
						}
					}
				},
				group: "fakeqimei_hp",
				onremove: true,
				mark: true,
				intro: { content: "已和$组成齐眉组合" },
			},
			hp: {
				audio: "qimei",
				trigger: { global: "changeHp" },
				charlotte: true,
				forced: true,
				logTarget(event, player) {
					return player.storage.fakeqimei_draw;
				},
				filter(event, player) {
					if (event.changedHp == 0) {
						return false;
					}
					var target = player.storage.fakeqimei_draw;
					if (!target || !target.isIn()) {
						return false;
					}
					if (player != event.player && target != event.player) {
						return false;
					}
					return player.hp == target.hp;
				},
				async content(event, trigger, player) {
					await game.delayx();
					await (player == trigger.player ? player.storage.fakeqimei_draw : player).draw();
				},
			},
		},
	}
```

### ybzhuiji
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_xinchang 名字:gz_xinchang 势力:jin

### fakecanmou 名字:参谋
描述: 每回合每项限一次，一名角色使用普通锦囊牌指定第一个目标时，若其手牌数为全场唯一最多，则你可以为此牌增加或减少一个目标（目标数至少为1）。
```js
fakecanmou: {
		audio: "canmou",
		trigger: { global: "useCardToPlayer" },
		filter(event, player) {
			if (!event.player.isMaxHandcard(true) || !event.isFirstTarget || get.type(event.card) != "trick") {
				return false;
			}
			if (event.targets.length > 1 && !player.getStorage("fakecanmou_used").includes("-")) {
				return true;
			}
			return get.info("fakecanmou").filter_add(event, player);
		},
		filter_add(event, player) {
			const info = get.info(event.card);
			if (info.allowMultiple == false) {
				return false;
			}
			if (event.targets && !info.multitarget && !player.getStorage("fakecanmou_used").includes("+")) {
				if (
					game.hasPlayer(current => {
						return !event.targets.includes(current) && lib.filter.targetEnabled2(event.card, event.player, current);
					})
				) {
					return true;
				}
			}
			return false;
		},
		async cost(event, trigger, player) {
			let str = "",
				goon = get.info("fakecanmou").filter_add(trigger, player),
				bool = trigger.targets.length > 1 && !player.getStorage("fakecanmou_used").includes("-");
			if (goon) {
				str += "增加";
			}
			if (goon && bool) {
				str = "或";
			}
			if (bool) {
				str += "减少";
			}
			event.result = await player
				.chooseTarget(get.prompt("fakecanmou"), (card, player, target) => {
					const trigger = get.event().getTrigger();
					if (trigger.targets.length > 1 && !player.getStorage("fakecanmou_used").includes("-") && trigger.targets.includes(target)) {
						return true;
					}
					return !player.getStorage("fakecanmou_used").includes("+") && !trigger.targets.includes(target) && lib.filter.targetEnabled2(trigger.card, trigger.player, target);
				})
				.set("prompt2", "为" + get.translation(trigger.card) + str + "一个目标")
				.set("ai", target => {
					const player = get.event().player,
						trigger = get.event().getTrigger();
					return get.effect(target, trigger.card, trigger.player, player) * (trigger.targets.includes(target) ? -1 : 1);
				})
				.setHiddenSkill("fakecanmou")
				.forResult();
		},
		preHidden: true,
		async content(event, trigger, player) {
			const target = event.targets[0],
				goon = trigger.targets.includes(target);
			player.addTempSkill("fakecanmou_used");
			player.markAuto("fakecanmou_used", [goon ? "-" : "+"]);
			if (goon) {
				trigger.targets.remove(target);
				game.log(target, "被", player, "移除了目标");
			} else {
				trigger.targets.add(target);
				game.log(target, "成为了", trigger.card, "的目标");
			}
		},
		subSkill: { used: { charlotte: true, onremove: true } },
	}
```

### congjian
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_yangzhi 名字:gz_yangzhi 势力:jin

### gzwanyi 名字:婉嫕
描述: 出牌阶段每项各限一次。你可以将一张带有“合纵”标签的牌当做【联军盛宴】/【火烧连营】/【挟天子以令诸侯】/【戮力同心】使用。
```js
gzwanyi: {
		audio: "wanyi",
		enable: "phaseUse",
		filter(event, player) {
			if (player.getStorage("gzwanyi2").length >= 4) {
				return false;
			}
			if (_status.mode == "yingbian") {
				return player.hasCard(function (i) {
					return get.is.yingbian(i);
				}, "hs");
			}
			return player.hasCard(function (card) {
				return card.hasTag("lianheng");
			}, "hs");
		},
		chooseButton: {
			dialog(event, player) {
				var list = ["lianjunshengyan", "huoshaolianying", "xietianzi", "lulitongxin"];
				if (_status.mode == "yingbian") {
					list = ["zhujinqiyuan", "chuqibuyi", "shuiyanqijunx", "dongzhuxianji"];
				}
				list.removeArray(player.getStorage("gzwanyi2"));
				return ui.create.dialog("婉嫕", [list, "vcard"], "hidden");
			},
			filter(button, player) {
				return lib.filter.filterCard({ name: button.link[2] }, player, _status.event.getParent());
			},
			check(button) {
				return _status.event.player.getUseValue({ name: button.link[2] });
			},
			backup(links) {
				return {
					audio: "wanyi",
					popname: true,
					viewAs: {
						name: links[0][2],
					},
					filterCard(card) {
						if (_status.mode == "yingbian") {
							return get.is.yingbian(card);
						}
						return card.hasTag("lianheng");
					},
					check(card) {
						return 1 / Math.max(1, get.value(card));
					},
					position: "hs",
					onuse(links, player) {
						if (!player.storage.gzwanyi2) {
							player.storage.gzwanyi2 = [];
						}
						player.storage.gzwanyi2.add(links.card.name);
						player.addTempSkill("gzwanyi2");
					},
				};
			},
			prompt(links) {
				if (_status.mode == "yingbian") {
					return "将一张应变牌当做" + get.translation(links[0][2]) + "使用";
				}
				return "将一张合纵牌当做" + get.translation(links[0][2]) + "使用";
			},
		},
		subSkill: { backup: {} },
		ai: { order: 8, result: { player: 1 } },
	}
```

### gzmaihuo 名字:埋祸
描述: 限定技。当有己方角色成为【杀】的目标时，你可以取消此【杀】的所有目标。然后此【杀】的使用者下回合开始时，其视为对你使用一张【杀】。若此【杀】对你造成伤害，则你防止此伤害，摸两张牌并移除此武将牌（若此武将牌为副将则改为变更副将）。
```js
gzmaihuo: {
		audio: "maihuo",
		limited: true,
		trigger: { global: "useCardToTarget" },
		logTarget: "player",
		filter(event, player) {
			return event.card.name == "sha" && event.target.isIn() && event.target.isFriendOf(player);
		},
		preHidden: true,
		skillAnimation: true,
		animationColor: "thunder",
		check(event, player) {
			var source = event.player,
				targets = event.targets,
				card = event.card;
			for (var target of targets) {
				if (target.hasShan() || get.effect(target, card, source, player) >= 0) {
					continue;
				}
				if (player.hp <= 1 || target.hp <= (event.getParent().baseDamage || 1)) {
					return true;
				}
			}
			return false;
		},
		content() {
			player.awakenSkill("gzmaihuo");
			trigger.targets.length = 0;
			trigger.getParent().triggeredTargets2.length = 0;
			player.addSkill("gzmaihuo_effect");
			player.markAuto("gzmaihuo_effect", [trigger.player]);
			trigger.player.addMark("gzmaihuo_mark", 1, false);
		},
		subSkill: {
			effect: {
				audio: "maihuo",
				trigger: { global: "phaseBegin" },
				forced: true,
				charlotte: true,
				popup: false,
				filter(event, player) {
					return player.getStorage("gzmaihuo_effect").includes(event.player) && event.player.canUse("sha", player, false);
				},
				content() {
					"step 0";
					var target = trigger.player;
					player.unmarkAuto("gzmaihuo_effect", [target]);
					target.removeMark("gzmaihuo_mark", 1, false);
					target.useCard({ name: "sha", isCard: true }, player, "gzmaihuo_effect", false);
					"step 1";
					if (!player.getStorage("gzmaihuo_effect").length) {
						player.removeSkill("gzmaihuo_effect");
					}
				},
				group: "gzmaihuo_remove",
			},
			remove: {
				trigger: { player: "damageBegin2" },
				forced: true,
				filter(event, player) {
					return event.card && event.card.name == "sha" && event.getParent().skill == "gzmaihuo_effect";
				},
				content() {
					trigger.cancel();
					player.draw(2);
					if (player.checkMainSkill("gzmaihuo", false)) {
						player.removeCharacter(0);
					} else if (player.checkViceSkill("gzmaihuo", false)) {
						player.changeVice();
					}
				},
			},
			mark: {
				marktext: "祸",
				intro: {
					content: "mark",
					onunmark: true,
				},
			},
		},
	}
```

## gz_jin_jiachong 名字:贾充 势力:jin

## gz_jin_yanghu 名字:羊祜 势力:jin

## gz_sp_duyu 名字:gz_sp_duyu 势力:qun

### gz_wuku 名字:武库
描述: 锁定技，当一名与你势力不同的角色使用装备牌时，若你的“武库”标记数小于2，你获得1个“武库”标记。
```js
gz_wuku: {
		audio: "spwuku",
		trigger: { global: "useCard" },
		forced: true,
		preHidden: true,
		filter(event, player) {
			if (get.type(event.card) != "equip") {
				return false;
			}
			if (player.isFriendOf(event.player)) {
				return false;
			}
			return player.countMark("gz_wuku") < 2;
		},
		async content(event, trigger, player) {
			player.addMark("gz_wuku", 1);
		},
		marktext: "库",
		intro: {
			content: "mark",
		},
		ai: {
			combo: "gz_miewu",
		},
	}
```

### gz_miewu 名字:灭吴
描述: 每回合限一次，你可以移去1个“武库”标记，将一张牌当任意一张非装备牌使用或打出，然后你摸一张牌。
```js
gz_miewu: {
		audio: "spmiewu",
		enable: ["chooseToUse", "chooseToRespond"],
		filter(event, player) {
			if (!player.countMark("gz_wuku") || !player.countCards("hse") || player.hasSkill("gz_miewu_used")) {
				return false;
			}
			for (let i of lib.inpile) {
				let type = get.type2(i);
				if ((type == "basic" || type == "trick") && event.filterCard(get.autoViewAs({ name: i }, "unsure"), player, event)) {
					return true;
				}
			}
			return false;
		},
		chooseButton: {
			dialog(event, player) {
				let list = [];
				for (let i = 0; i < lib.inpile.length; i++) {
					let name = lib.inpile[i];
					if (name == "sha") {
						if (event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) {
							list.push(["基本", "", "sha"]);
						}
						for (let nature of lib.inpile_nature) {
							if (event.filterCard(get.autoViewAs({ name, nature }, "unsure"), player, event)) {
								list.push(["基本", "", "sha", nature]);
							}
						}
					} else if (get.type2(name) == "trick" && event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) {
						list.push(["锦囊", "", name]);
					} else if (get.type(name) == "basic" && event.filterCard(get.autoViewAs({ name }, "unsure"), player, event)) {
						list.push(["基本", "", name]);
					}
				}
				return ui.create.dialog("灭吴", [list, "vcard"]);
			},
			check(button) {
				if (_status.event.getParent().type != "phase") {
					return 1;
				}
				let player = _status.event.player;
				if (["wugu", "zhulu_card", "yiyi", "lulitongxin", "lianjunshengyan", "diaohulishan"].includes(button.link[2])) {
					return 0;
				}
				return player.getUseValue({
					name: button.link[2],
					nature: button.link[3],
				});
			},
			backup(links, player) {
				return {
					filterCard: true,
					audio: "gz_miewu",
					popname: true,
					check(card) {
						return 8 - get.value(card);
					},
					position: "hse",
					viewAs: { name: links[0][2], nature: links[0][3] },
					onuse(result, player) {
						const next = game.createEvent("miewuDraw", false, _status.event.getParent());
						next.player = player;
						next.setContent(async (event, trigger, player) => {
							await player.draw();
						});
					},
					onrespond(result, player) {
						const next = game.createEvent("miewuDraw", false, _status.event.getParent());
						next.player = player;
						next.setContent(async (event, trigger, player) => {
							await player.draw();
						});
					},
					precontent() {
						player.addTempSkill("gz_miewu_used");
						player.removeMark("gz_wuku", 1);
					},
				};
			},
			prompt(links, player) {
				return "将一张牌当做" + (get.translation(links[0][3]) || "") + get.translation(links[0][2]) + "使用";
			},
		},
		hiddenCard(player, name) {
			if (!lib.inpile.includes(name)) {
				return false;
			}
			var type = get.type2(name);
			return (type == "basic" || type == "trick") && player.countMark("gz_wuku") > 0 && player.countCards("she") > 0 && !player.hasSkill("gz_miewu_used");
		},
		ai: {
			combo: "gz_wuku",
			fireAttack: true,
			respondSha: true,
			respondShan: true,
			skillTagFilter(player) {
				if (!player.countMark("gz_wuku") || !player.countCards("hse") || player.hasSkill("gz_miewu_used")) {
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
		subSkill: {
			used: {
				charlotte: true,
			},
			backup: {
				audio: "gz_miewu",
			},
		},
	}
```

## gz_pk_sp_duyu 名字:杜预 势力:qun

### fakezhufu 名字:注傅
描述: 出牌阶段，你可以弃置一张本阶段未以此法弃置过的花色的牌，然后根据此牌的花色为你使用的下一张牌添加对应的应变效果：红桃，助战、目标+1；方片，富甲、不可被响应；黑桃，残躯、摸一张牌；草花，空巢、伤害+1。
```js
fakezhufu: {
		audio: "spwuku",
		enable: "phaseUse",
		filter(event, player) {
			return player.hasCard(card => {
				return get.info("fakezhufu").filterCard(card, player);
			}, "he");
		},
		filterCard(card, player) {
			if (!lib.suit.includes(get.suit(card))) {
				return false;
			}
			return lib.filter.cardDiscardable(card, player) && !player.getStorage("fakezhufu_effect").includes(get.suit(card));
		},
		position: "he",
		check(card) {
			const player = get.event().player;
			let cards = player.getCards("hs", card => player.hasValueTarget(card, true, true));
			let discards = player.getCards("he", card => get.info("fakezhufu").filterCard(card, player));
			for (let i = 1; i < discards.length; i++) {
				if (discards.slice(0, i).some(card => get.suit(card) == get.suit(discards[i]))) {
					discards.splice(i--, 1);
				}
			}
			cards.removeArray(discards);
			if (!cards.length || !discards.length) {
				return 0;
			}
			cards.sort((a, b) => {
				return (player.getUseValue(b, true, true) > 0 ? get.order(b) : 0) - (player.getUseValue(a, true, true) > 0 ? get.order(a) : 0);
			});
			const cardx = cards[0];
			if (get.order(cardx, player) > 0 && discards.includes(card)) {
				if (
					(get.suit(card) == "heart" &&
						get.type(cardx) != "equip" &&
						(function (card, player) {
							const num = get.info("fakezhufu").getMaxUseTarget(card, player);
							return num != -1 && game.countPlayer(target => player.canUse(card, target, true, true) && get.effect(target, card, player, player) > 0) > num;
						})(cardx, player) &&
						game.hasPlayer(target => {
							return (
								target.isFriendOf(player) &&
								target.hasCard(cardy => {
									return lib.filter.cardDiscardable(cardy, target) && get.type2(cardy) == get.type2(cardx);
								}, "h")
							);
						})) ||
					(get.suit(card) == "diamond" &&
						get.type(cardx) != "equip" &&
						!game.hasPlayer(target => {
							return target.countCards("h") > player.countCards("h") - (get.position(card) == "h" ? 1 : 0) - (get.position(cardx) == "h" ? 1 : 0);
						})) ||
					(get.suit(card) == "spade" && player.getHp() == 1) ||
					(get.suit(card) == "club" && get.tag(cardx, "damage") && player.countCards("h") - (get.position(card) == "h" ? 1 : 0) - (get.position(cardx) == "h" ? 1 : 0) == 0)
				) {
					return 1 / (get.value(card) || 0.5);
				}
			}
			return 0;
		},
		async content(event, trigger, player) {
			const suit = get.suit(event.cards[0], player);
			player.addTempSkill("fakezhufu_effect", "phaseUseAfter");
			player.markAuto("fakezhufu_effect", [[suit, false]]);
		},
		ai: {
			order(item, player) {
				let cards = player.getCards("hs", card => player.hasValueTarget(card, true, true));
				let discards = player.getCards("he", card => get.info("fakezhufu").filterCard(card, player));
				for (let i = 1; i < discards.length; i++) {
					if (discards.slice(0, i).some(card => get.suit(card) == get.suit(discards[i]))) {
						discards.splice(i--, 1);
					}
				}
				cards.removeArray(discards);
				if (!cards.length || !discards.length) {
					return 0;
				}
				cards.sort((a, b) => {
					return (player.getUseValue(b, true, true) > 0 ? get.order(b) : 0) - (player.getUseValue(a, true, true) > 0 ? get.order(a) : 0);
				});
				const cardx = cards[0];
				return get.order(cardx, player) > 0 &&
					((discards.some(card => {
						return get.suit(card) == "heart";
					}) &&
						get.type(cardx) != "equip" &&
						(function (card, player) {
							const num = get.info("fakezhufu").getMaxUseTarget(card, player);
							return num != -1 && game.countPlayer(target => player.canUse(card, target, true, true) && get.effect(target, card, player, player) > 0) > num;
						})(cardx, player) &&
						game.hasPlayer(target => {
							return (
								target.isFriendOf(player) &&
								target.hasCard(cardy => {
									return lib.filter.cardDiscardable(cardy, target) && get.type2(cardy) == get.type2(cardx);
								}, "h")
							);
						})) ||
						(get.type(cardx) != "equip" &&
							discards.some(card => {
								return (
									get.suit(card) == "diamond" &&
									!game.hasPlayer(target => {
										return target.countCards("h") > player.countCards("h") - (get.position(card) == "h" ? 1 : 0) - (get.position(cardx) == "h" ? 1 : 0);
									})
								);
							})) ||
						(discards.some(card => {
							return get.suit(card) == "spade";
						}) &&
							player.getHp() == 1) ||
						(get.tag(cardx, "damage") &&
							discards.some(card => {
								return get.suit(card) == "club" && player.countCards("h") - (get.position(card) == "h" ? 1 : 0) - (get.position(cardx) == "h" ? 1 : 0) == 0;
							})))
					? get.order(cardx, player) + 0.00001
					: 0;
			},
			result: {
				player(player, target) {
					let cards = player.getCards("hs", card => player.hasValueTarget(card, true, true));
					let discards = player.getCards("he", card => get.info("fakezhufu").filterCard(card, player));
					discards = discards.sort((a, b) => get.value(a) - get.value(b));
					for (let i = 1; i < discards.length; i++) {
						if (discards.slice(0, i).some(card => get.suit(card) == get.suit(discards[i]))) {
							discards.splice(i--, 1);
						}
					}
					cards.removeArray(discards);
					if (!cards.length || !discards.length) {
						return 0;
					}
					if (
						(discards.some(card => {
							return get.suit(card) == "heart";
						}) &&
							cards.some(card => {
								return (
									get.type(card) != "equip" &&
									(function (card, player) {
										const num = get.info("fakezhufu").getMaxUseTarget(card, player);
										return num != -1 && game.countPlayer(target => player.canUse(card, target, true, true) && get.effect(target, card, player, player) > 0) > num;
									})(card, player) &&
									game.hasPlayer(target => {
										return (
											target.isFriendOf(player) &&
											target.hasCard(cardx => {
												return lib.filter.cardDiscardable(cardx, target) && get.type2(cardx) == get.type2(card);
											}, "h")
										);
									})
								);
							})) ||
						discards.some(card => {
							return (
								get.suit(card) == "diamond" &&
								cards.some(cardx => {
									return (
										get.type(cardx) != "equip" &&
										!game.hasPlayer(target => {
											return target.countCards("h") > player.countCards("h") - (get.position(card) == "h" ? 1 : 0) - (get.position(cardx) == "h" ? 1 : 0);
										})
									);
								})
							);
						}) ||
						(discards.some(card => {
							return get.suit(card) == "spade";
						}) &&
							player.getHp() == 1) ||
						discards.some(card => {
							return (
								get.suit(card) == "club" &&
								cards.some(cardx => {
									return get.tag(cardx, "damage") && player.countCards("h") - (get.position(card) == "h" ? 1 : 0) - (get.position(cardx) == "h" ? 1 : 0) == 0;
								})
							);
						})
					) {
						return 1;
					}
					return 0;
				},
			},
		},
		subSkill: {
			effect: {
				charlotte: true,
				onremove: true,
				intro: {
					content(storage) {
						const suitStorage = storage.slice().sort((a, b) => lib.suit.indexOf(a[0]) - lib.suit.indexOf(b[0]));
						const suits = suitStorage.reduce((str, list) => str + get.translation(list[0]), "");
						const usedSuits = suitStorage.filter(list => list[1]).reduce((str, list) => str + get.translation(list[0]), "");
						let str = "";
						str += "<li>已弃置过的花色：";
						str += suits;
						if (usedSuits.length) {
							str += "<br><li>已触发过的花色：";
							str += usedSuits;
						}
						return str;
					},
				},
				audio: "spwuku",
				trigger: { player: "yingbian" },
				filter(event, player) {
					return player.getStorage("fakezhufu_effect").some(list => !list[1]);
				},
				forced: true,
				firstDo: true,
				async content(event, trigger, player) {
					const list = player.getStorage("fakezhufu_effect").filter(i => !i[1]);
					const forced = (function (trigger, player) {
						if (trigger.forceYingbian || player.hasSkillTag("forceYingbian")) {
							return true;
						}
						const list = trigger.temporaryYingbian || [];
						return list.includes("force") || get.cardtag(trigger.card, "yingbian_force");
					})(trigger, player);
					if (forced) {
						player.popup("yingbian_force_tag", lib.yingbian.condition.color.get("force"));
						game.log(player, "触发了", "#g【注傅】", "为", trigger.card, "添加的应变条件");
					}
					const hasYingBian = trigger.temporaryYingbian || [],
						map = get.info("fakezhufu").YingBianMap;
					for (const j of list) {
						player.storage.fakezhufu_effect[player.getStorage("fakezhufu_effect").indexOf(j)][1] = true;
						const tag = map[j[0]][0],
							eff = map[j[0]][1];
						if (get.cardtag(trigger.card, `yingbian_${tag}`)) {
							continue;
						}
						if (j[0] == "heart") {
							if (!forced && !hasYingBian.includes("add")) {
								const result = await lib.yingbian.condition.complex.get("zhuzhan")(trigger).forResult();
								if (result.bool) {
									game.log(player, "触发了", "#g【注傅】", "为", trigger.card, "添加的应变条件（", "#g" + get.translation(j[0]), "）");
									trigger.yingbian_addTarget = true;
									player.addTempSkill("yingbian_changeTarget");
								}
							} else {
								if (!forced) {
									game.log(player, "触发了", "#g【注傅】", "为", trigger.card, "添加的应变条件（", "#g" + get.translation(j[0]), "）");
								}
								trigger.yingbian_addTarget = true;
								player.addTempSkill("yingbian_changeTarget");
							}
						} else {
							const goon = hasYingBian.includes(eff) || lib.yingbian.condition.simple.get(tag)(trigger);
							if (!forced && goon) {
								player.popup("yingbian_force_tag", lib.yingbian.condition.color.get(eff));
								game.log(player, "触发了", "#g【注傅】", "为", trigger.card, "添加的应变条件（", "#g" + get.translation(j[0]), "）");
							}
							if (forced || goon) {
								await game.yingbianEffect(trigger, lib.yingbian.effect.get(eff));
							}
						}
					}
				},
			},
		},
		YingBianMap: {
			heart: ["zhuzhan", "add"],
			diamond: ["fujia", "hit"],
			spade: ["canqu", "draw"],
			club: ["kongchao", "damage"],
		},
		getMaxUseTarget(card, player) {
			let range;
			const select = get.copy(get.info(card).selectTarget);
			if (select == undefined) {
				range = [1, 1];
			} else if (typeof select == "number") {
				range = [select, select];
			} else if (get.itemtype(select) == "select") {
				range = select;
			} else if (typeof select == "function") {
				range = select(card, player);
				if (typeof range == "number") {
					range = [range, range];
				}
			}
			game.checkMod(card, player, range, "selectTarget", player);
			return range;
		},
	}
```

## gz_caoying 名字:手杀曹婴 势力:wei

### xinfu_lingren
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### xinfu_fujian
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_guansuo 名字:手杀关索 势力:shu

### zhengnan
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### xiefang
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_dengai 名字:gz_dengai 势力:wei

### tuntian
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### ziliang 名字:资粮
描述: `${get.poptip("guozhan_viceSkill")}，当与你势力相同的一名角色受到伤害后，你可以将一张“田”交给该角色。`
```js
ziliang: {
		audio: 2,
		trigger: {
			global: "damageEnd",
		},
		filter(event, player) {
			return event.player.isIn() && event.player.isFriendOf(player) && player.getExpansions("tuntian").length > 0;
		},
		init(player) {
			player.checkViceSkill("ziliang");
		},
		viceSkill: true,
		async cost(event, trigger, player) {
			const next = player.chooseCardButton(get.prompt("ziliang", trigger.player), player.getExpansions("tuntian"));

			next.set("ai", button => get.value(button.link));

			const result = await next.forResult();
			event.result = {
				bool: result.bool,
				cost_data: {
					links: result.links,
				},
			};
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const card = event.cost_data.links[0];
			await player.give(card, trigger.player);
		},
	}
```

### gz_jixi 名字:急袭
描述: `${get.poptip("guozhan_mainSkill")}，此武将牌减少半个阴阳鱼。你可以将一张“田”当作【顺手牵羊】使用。`
```js
gz_jixi: {
		inherit: "jixi",
		audio: "jixi",
		mainSkill: true,
		init(player) {
			if (player.checkMainSkill("gz_jixi")) {
				player.removeMaxHp();
			}
		},
	}
```

## gz_caohong 名字:gz_caohong 势力:wei

### fake_huyuan 名字:护援
描述: ①你的回合内，当一张装备牌进入一名角色的装备区后，你可以弃置与其距离为1以内的另一名角色区域里的一张牌。②结束阶段，你可以将一张装备牌置入一名角色的装备区。
```js
fake_huyuan: {
		audio: "yuanhu",
		trigger: {
			player: "phaseJieshuBegin",
		},
		filter(_event, player) {
			return (
				player.countCards("he", card => {
					if (get.position(card) == "h" && _status.connectMode) {
						return true;
					}
					return get.type(card) == "equip";
				}) > 0
			);
		},
		async cost(event, _trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: get.prompt2("yuanhu"),
					filterCard(card) {
						return get.type(card) == "equip";
					},
					position: "he",
					filterTarget(card, player, target) {
						return target.canEquip(card);
					},
					ai1(card) {
						return 6 - get.value(card);
					},
					ai2(target) {
						return get.attitude(get.player(), target) - 3;
					},
				})
				.setHiddenSkill("fake_huyuan")
				.forResult();
		},
		preHidden: true,
		async content(event, trigger, player) {
			const card = event.cards[0];
			const target = event.targets[0];
			if (target != player) {
				player.$give(card, target, false, void 0, void 0);
			}
			await target.equip(card, void 0);
		},
		group: "fake_huyuan_discard",
		subSkill: {
			discard: {
				trigger: {
					global: "equipEnd",
				},
				filter(event, player) {
					return (
						// @ts-expect-error 类型系统未来可期
						_status.currentPhase == player &&
						game.hasPlayer(target => {
							return get.distance(event.player, target) <= 1 && target != event.player && target.countCards("hej") > 0;
						})
					);
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseTarget(get.prompt("fake_huyuan"), "弃置一名与" + get.translation(trigger.player) + "距离为1以内的另一名角色区域里的一张牌", (card, player, target) => {
							const trigger = get.event().getTrigger();
							return get.distance(trigger.player, target) <= 1 && target != trigger.player && target.countCards("hej");
						})
						.set("ai", target => {
							const player = get.event().player;
							return get.effect(target, { name: "guohe" }, player, player);
						})
						.setHiddenSkill("fake_huyuan")
						.forResult();
				},
				popup: false,
				async content(event, trigger, player) {
					const target = event.targets[0];
					player.logSkill("fake_huyuan", target, undefined, undefined, undefined);
					await player.discardPlayerCard(target, "hej", true);
				},
			},
		},
	}
```

### heyi 名字:鹤翼
描述: `${get.poptip("guozhan_zhenfa")}。与你处于同一${get.poptip("guozhan_duilie")}的角色视为拥有技能${get.poptip("feiying")}。`
```js
heyi: {
		zhenfa: "inline",
		global: "heyi_distance",
		subSkill: {
			distance: {
				mod: {
					globalTo(from, to, distance) {
						if (
							game.hasPlayer(current => {
								return current.hasSkill("heyi") && current.inline(to);
							})
						) {
							return distance + 1;
						}
					},
				},
			},
		},
	}
```

## gz_jiangfei 名字:gz_jiangfei 势力:shu

### gz_shengxi 名字:生息
描述: 结束阶段，若你本回合未造成过伤害，你可以摸两张牌。
```js
gz_shengxi: {
		audio: "shengxi",
		preHidden: true,
		frequent: true,
		trigger: {
			player: "phaseJieshuBegin",
		},
		filter(event, player) {
			return !player.hasHistory("sourceDamage");
		},
		async content(event, trigger, player) {
			player.draw(2);
		},
	}
```

### gz_shoucheng 名字:守成
描述: 当与你势力相同的一名角色于其回合外失去手牌时，若其没有手牌，则你可以令其摸一张牌。
```js
gz_shoucheng: {
		audio: "shoucheng",
		inherit: "shoucheng",
		preHidden: true,
		filter(event, player) {
			return game.hasPlayer(current => {
				// @ts-expect-error 类型系统未来可期
				if (current == _status.currentPhase || !current.isFriendOf(player)) {
					return false;
				}
				// @ts-expect-error 类型系统未来可期
				const evt = event.getl(current);
				return evt && evt.hs && evt.hs.length && current.countCards("h") == 0;
			});
		},
		async content(event, trigger, player) {
			const list = game
				.filterPlayer(current => {
					// @ts-expect-error 类型系统未来可期
					if (current == _status.currentPhase || !current.isFriendOf(player)) {
						return false;
					}
					// @ts-expect-error 类型系统未来可期
					var evt = trigger.getl(current);
					return evt && evt.hs && evt.hs.length;
				})
				// @ts-expect-error 类型系统未来可期
				.sortBySeat(_status.currentPhase);

			for (const target of list) {
				if (!target.isAlive() || target.countCards("h") > 0) {
					continue;
				}

				const result = await player
					.chooseBool(get.prompt2("gz_shoucheng", target))
					.set("ai", function (event, player) {
						return get.effect(get.event().target, { name: "draw" }, player, player) > 0;
					})
					.set("target", target)
					.setHiddenSkill(event.name)
					.forResult();

				if (result.bool) {
					player.logSkill(event.name, target, void 0, void 0, void 0);
					await target.draw();
				}
			}
		},
	}
```

## gz_jiangwei 名字:gz_jiangwei 势力:shu

### tiaoxin
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### yizhi 名字:遗志
描述: `${get.poptip("guozhan_viceSkill")}，此武将牌减少半个阴阳鱼。若你的主将拥有技能${get.poptip("guanxing")}，则将其描述中的X改为5；若你的主将没有技能${get.poptip("guanxing")}，则你视为拥有技能${get.poptip("guanxing")}。`
```js
yizhi: {
		init(player) {
			if (player.checkViceSkill("yizhi") && !player.viceChanged) {
				player.removeMaxHp();
			}
		},
		viceSkill: true,
		inherit: "guanxing",
		filter(_event, player) {
			return !player.hasSkill("guanxing");
		},
	}
```

### tianfu 名字:天覆
描述: `${get.poptip("guozhan_mainSkill")}，${get.poptip("guozhan_zhenfa")}，若当前回合角色与你处于同一${get.poptip("guozhan_duilie")}，则你视为拥有技能${get.poptip("kanpo")}。`
```js
tianfu: {
		init(player) {
			player.checkMainSkill("tianfu");
		},
		mainSkill: true,
		inherit: "kanpo",
		zhenfa: "inline",
		viewAsFilter(player) {
			// @ts-expect-error 类型系统未来可期
			return _status.currentPhase && _status.currentPhase.inline(player) && !player.hasSkill("kanpo") && player.countCards("h", { color: "black" }) > 0;
		},
	}
```

## gz_xusheng 名字:gz_xusheng 势力:wu

### gz_yicheng_new 名字:疑城
描述: 与你势力相同的角色使用【杀】指定第一个目标后或成为【杀】的目标后，你可以令其摸一张牌，然后其弃置一张牌。
```js
gz_yicheng_new: {
		audio: "yicheng",
		trigger: {
			global: ["useCardToPlayered", "useCardToTargeted"],
		},
		filter(event, player, name) {
			const bool = name === "useCardToPlayered";
			// @ts-expect-error 类型系统未来可期
			if (bool && !event.isFirstTarget) {
				return false;
			}
			return event.card.name == "sha" && event[bool ? "player" : "target"].isFriendOf(player);
		},
		logTarget(event, player, name) {
			return event?.[name === "useCardToPlayered" ? "player" : "target"];
		},
		async content(event, trigger, player) {
			await event.targets[0].draw();
			await event.targets[0].chooseToDiscard("he", true);
		},
	}
```

## gz_jiangqing 名字:gz_jiangqing 势力:wu

### gz_shangyi 名字:尚义
描述: 出牌阶段限一次，你可以令一名其他角色观看你的手牌。若如此做，你选择一项：1.观看其手牌并可以弃置其中的一张黑色牌；2.观看其所有暗置的武将牌。
```js
gz_shangyi: {
		audio: "shangyi",
		usable: 1,
		enable: "phaseUse",
		filter(_event, player) {
			return player.countCards("h") > 0;
		},
		filterTarget(_card, player, target) {
			return player != target && (target.countCards("h") > 0 || target.isUnseen(2));
		},
		async content(event, trigger, player) {
			const target = event.target;

			await target.viewHandcards(player);

			/** @type {Partial<Result>} */
			let result;
			if (!target.countCards("h")) {
				result = { index: 1 };
			} else if (!target.isUnseen(2)) {
				result = { index: 0 };
			} else {
				result = await player
					.chooseControl()
					.set("choiceList", [`观看${get.translation(target)}的手牌并可以弃置其中的一张黑色牌`, `观看${get.translation(target)}的所有暗置的武将牌`])
					.forResult();
			}

			if (result.index == 0) {
				await player
					.discardPlayerCard(target, "h")
					.set("filterButton", function (button) {
						return get.color(button.link) == "black";
					})
					.set("visible", true);
			} else {
				player.viewCharacter(target, 2);
			}
		},
		ai: {
			order: 11,
			result: {
				target(player, target) {
					return -target.countCards("h");
				},
			},
			threaten: 1.1,
		},
	}
```

### niaoxiang 名字:鸟翔
描述: `${get.poptip("guozhan_zhenfa")}，在同一个${get.poptip("guozhan_weigong")}关系中，若你是围攻角色，则你或另一名围攻角色使用【杀】指定被围攻角色为目标后，该角色需依次使用两张【闪】才能抵消。`
```js
niaoxiang: {
		zhenfa: "siege",
		audio: "zniaoxiang",
		global: "niaoxiang_sha", // ?
		preHidden: true,
		trigger: {
			global: "useCardToPlayered",
		},
		filter(event, player) {
			if (event.card.name != "sha") {
				return false;
			}
			// @ts-expect-error 类型系统未来可期
			if (game.countPlayer() < 4) {
				return false;
			}
			// @ts-expect-error 类型系统未来可期
			return player.siege(event.target) && event.player.siege(event.target);
		},
		forced: true,
		locked: false,
		forceaudio: true,
		logTarget: "target",
		async content(_event, trigger, _player) {
			const id = trigger.target.playerid;
			// @ts-expect-error 类型系统未来可期
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
	}
```

## gz_hetaihou 名字:gz_hetaihou 势力:qun

### zhendu
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

### qiluan
(未找到该技能的代码定义，可能是动态生成的fake技能或跨文件引用)

## gz_yuji 名字:于吉 势力:qun

### qianhuan 名字:千幻
描述: 当与你势力相同的一名角色受到伤害后，你可以将一张与你武将牌上花色均不同的牌置于你的武将牌上。当一名与你势力相同的角色成为基本牌或锦囊牌的唯一目标时，你可以移去一张“千幻”牌，取消之。
```js
qianhuan: {
		audio: 2,
		preHidden: true,
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
		group: ["qianhuan_add", "qianhuan_use"],
		ai: {
			threaten: 1.8,
		},
		subSkill: {
			add: {
				audio: "qianhuan",
				trigger: {
					global: "damageEnd",
				},
				filter(event, player) {
					const cards = player.getExpansions("qianhuan");
					const suits = cards.map(card => get.suit(card)).toUniqued();

					if (suits.length >= lib.suit.length) {
						return false;
					}

					return (
						player.isFriendOf(event.player) &&
						player.hasCard(card => {
							if (_status.connectMode && get.position(card) == "h") {
								return true;
							}
							return !suits.includes(get.suit(card));
						}, "he")
					);
				},
				async cost(event, _trigger, player) {
					const cards = player.getExpansions("qianhuan");
					const suits = cards.map(card => get.suit(card)).toUniqued();

					event.result = await player
						.chooseCard("he", get.prompt2("qianhuan"), card => {
							// @ts-expect-error 类型系统未来可期
							return !_status.event.suits.includes(get.suit(card));
						})
						.set("ai", function (card) {
							return 9 - get.value(card);
						})
						.set("suits", suits)
						.setHiddenSkill("qianhuan")
						.forResult();
				},
				async content(event, _trigger, player) {
					const card = event.cards[0];
					const next = player.addToExpansion(card, player, "give");
					// @ts-expect-error 类型系统未来可期
					next.gaintag.add("qianhuan");
					await next;
				},
			},
			use: {
				audio: "qianhuan",
				trigger: {
					global: "useCardToTarget",
				},
				filter(event, player) {
					if (!["basic", "trick"].includes(get.type(event.card, "trick"))) {
						return false;
					}
					return event.target && player.isFriendOf(event.target) && event.targets.length == 1 && player.getExpansions("qianhuan").length > 0;
				},
				async cost(event, trigger, player) {
					let goon = get.effect(trigger.target, trigger.card, trigger.player, player) < 0;

					if (goon) {
						if (["tiesuo", "diaohulishan", "lianjunshengyan", "zhibi", "chiling", "lulitongxin"].includes(trigger.card.name)) {
							goon = false;
						} else if (trigger.card.name == "sha") {
							if (trigger.target.mayHaveShan(player, "use") || trigger.target.hp >= 3) {
								goon = false;
							}
						} else if (trigger.card.name == "guohe") {
							if (trigger.target.countCards("he") >= 3 || !trigger.target.countCards("h")) {
								goon = false;
							}
						} else if (trigger.card.name == "shuiyanqijunx") {
							if (trigger.target.countCards("e") <= 1 || trigger.target.hp >= 3) {
								goon = false;
							}
						} else if (get.tag(trigger.card, "damage") && trigger.target.hp >= 3) {
							goon = false;
						}
					}

					const result = await player
						.chooseButton()
						.set("goon", goon)
						.set("ai", function (button) {
							// @ts-expect-error 类型系统未来可期
							if (_status.event.goon) {
								return 1;
							}
							return 0;
						})
						.set("createDialog", [get.prompt("qianhuan"), '<div class="text center">移去一张“千幻”牌令' + get.translation(trigger.player) + "对" + get.translation(trigger.target) + "的" + get.translation(trigger.card) + "失效</div>", player.getExpansions("qianhuan")])
						.forResult();

					event.result = {
						bool: result.bool,
						cost_data: {
							links: result.links,
						},
					};
				},
				logTarget: "player",
				async content(event, trigger, player) {
					// @ts-expect-error 类型系统未来可期
					trigger.getParent().targets.remove(trigger.target);
					const card = event.cost_data.links[0];
					await player.loseToDiscardpile(card);
				},
			},
		},
	}
```

