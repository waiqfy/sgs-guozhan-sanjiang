import { lib, game, ui, get, ai, _status } from "noname";

export class PlayerGuozhan extends lib.element.Player {
	/**
	 * @type {string}
	 */
	trueIdentity;

	/**
	 * gz3: "三将"规则里第三个将（公共池抽到的那个）的名字。跟主将/副将不一样，
	 * 这个从一开始就是常亮的，不走isUnseen/showCharacter那一套隐藏-揭示流程，
	 * 也不参与势力判定。普通国战对局里这个字段一直是undefined，不影响任何东西。
	 * @type {string}
	 */
	name3;

	/**
	 * gz3: 在buildExtra里追加一个跟副将头像(avatar2)同款的小角标节点，用来显示
	 * "三将"规则的第三个将。不开三将时这个节点一直是隐藏状态，没有副作用。
	 *
	 * 注意：这个模式的patch是通过Object.defineProperties直接整个覆盖掉
	 * lib.element.Player.prototype上的同名方法（见noname/library/index.js里应用
	 * mode.element.player那一处），而不是走正常的class继承链。所以这里不能用
	 * `super.buildExtra()`——覆盖生效之后，父类原型上的buildExtra其实就是这个函数自己，
	 * 调用super会变成自己调自己，无限递归。只能把官方原版buildExtra的内容整个抄一遍，
	 * 再加上我们自己要加的东西。
	 */
	buildExtra() {
		const player = this;
		const node = player.node;
		node.link = player.mark(" ", {
			mark: get.linkintro,
		});
		node.link.firstChild.setBackgroundImage("image/card/tiesuo_mark.png");
		node.link.firstChild.style.backgroundSize = "cover";
		ui.create.div(node.identity);

		// gz3: 第三个将的头像角标，跟副将avatar2同款样式，占位在另一个角落
		node.avatar3g = ui.create.div(".avatar2.avatar3g", player).hide();
		// gz3: 第三个将专属的名字标签，不然会跟副将的.name2共用位置挤在一起显示不出来
		node.name3 = ui.create.div(".name.name3", player).hide();
	}

	/**
	 * 获取玩家的势力
	 *
	 * @param { number } [num = 0] - 根据哪张武将牌返回势力，`0`为主将，`1`为副将（默认为0）
	 * @returns { string }
	 */
	getGuozhanGroup(num = 0) {
		// gz3: "三将"规则下势力判定简化为"先亮先定"——只按这次到底亮的是主将还是
		// 副将取对应武将自身的势力，不需要官方版本里"主将为野心家/selectGroup势力
		// 时用副将势力覆盖"这一整套优先级逻辑。
		if (get.config("sanjiang")) {
			if (this.trueIdentity) {
				const group = lib.character[this[num == 1 ? "name2" : "name1"]][1];
				if (lib.selectGroup.includes(group)) {
					return group;
				}
				return this.trueIdentity;
			}
			return lib.character[this[num == 1 ? "name2" : "name1"]].group;
		}
		if (this.trueIdentity) {
			const group = lib.character[this[num == 1 ? "name2" : "name1"]][1];
			if (num != 2 && lib.selectGroup.includes(group)) {
				return group;
			}
			if (lib.character[this.name1][1] != "ye" || num == 1) {
				return this.trueIdentity;
			}
			return "ye";
		}
		if (get.is.double(this.name2)) {
			return lib.character[this.name1].group;
		}
		if (num == 1) {
			return lib.character[this.name2].group;
		}
		if (num == 2 && lib.selectGroup.includes(lib.character[this.name1][1])) {
			return lib.character[this.name2].group;
		}
		return lib.character[this.name1].group;
	}

	/**
	 * 选择军令
	 *
	 * @param { Player } target 执行军令的对象
	 * @returns
	 */
	chooseJunlingFor(target) {
		const next = game.createEvent("chooseJunlingFor");

		// @ts-expect-error 类型就是这么写的
		next.player = this;
		next.target = target;
		next.num = 2;

		// @ts-expect-error 类型就是这么写的
		next.setContent("chooseJunlingFor");

		return next;
	}

	/**
	 * 选择是否执行军令
	 *
	 * @param { Player } source 军令发起者
	 * @param { string } junling 军令内容
	 * @param { Player[] } targets 军令效果的对象
	 * @returns
	 */
	chooseJunlingControl(source, junling, targets) {
		const next = game.createEvent("chooseJunlingControl");
		// @ts-expect-error 类型就是这么写的
		next.player = this;
		next.source = source;
		// @ts-expect-error 类型就是这么写的
		next.junling = junling;
		if (targets.length) {
			next.targets = targets;
		}
		// @ts-expect-error 类型就是这么写的
		next.setContent("chooseJunlingControl");
		return next;
	}

	/**
	 * 执行军令
	 *
	 * @param { Player } source 军令发起者
	 * @param { string } junling 军令内容
	 * @param { Player[] } targets 军令效果的对象
	 * @returns
	 */
	carryOutJunling(source, junling, targets) {
		const next = game.createEvent("carryOutJunling");
		next.source = source;
		// @ts-expect-error 类型就是这么写的
		next.player = this;
		if (targets.length) {
			next.targets = targets;
		}
		// @ts-expect-error 类型就是这么写的
		next.junling = junling;
		// @ts-expect-error 类型就是这么写的
		next.setContent("carryOutJunling");
		return next;
	}

	/**
	 * 选择变更副将
	 *
	 * @param { boolean } [repeat] 是否强制变更，且当前变更副将技能不计入变更记录
	 * @param { "hidden" } [hidden] 是否暗置变更后的副将，若为`"hidden"`则暗置
	 * @returns
	 */
	mayChangeVice(repeat, hidden) {
		if (!this.playerid) {
			return;
		}
		const changedSkills = Reflect.get(_status, "changedSkills") ?? {};
		Reflect.set(_status, "changedSkills", changedSkills);
		const skill = _status.event?.name;
		if (repeat || !changedSkills[this.playerid] || !changedSkills[this.playerid].includes(skill)) {
			var next = game.createEvent("mayChangeVice");
			// @ts-expect-error 类型就是这么写的
			next.setContent("mayChangeVice");
			// @ts-expect-error 类型就是这么写的
			next.player = this;
			next.skill = skill;
			if (repeat || (!_status.connectMode && get.config("changeViceType") == "online")) {
				// @ts-expect-error 类型就是这么写的
				next.repeat = true;
			}
			if (hidden == "hidden") {
				// @ts-expect-error 类型就是这么写的
				next.hidden = true;
			}
			return next;
		}
	}

	// 后面摆了，相信后人的智慧

	/**
	 * 判断是否“不是”队友
	 *
	 * @param { Player } target 判断对象
	 * @param { boolean } [shown] 考虑自身身份已明确的情况
	 * @returns { boolean }
	 */
	differentIdentityFrom(target, shown) {
		// @ts-expect-error 类型就是这么写的
		if (this == target) {
			return false;
		}
		//野心家建国情况
		if (this.getStorage("yexinjia_friend").includes(target)) {
			return false;
		}
		if (target.getStorage("yexinjia_friend").includes(this)) {
			return false;
		}
		if (shown) {
			if (target.identity == "unknown") {
				return false;
			}
			if (target.identity == "ye" || this.identity == "ye") {
				return true;
			}
			if (this.identity == "unknown") {
				var identity = lib.character[this.name1][1];
				if (this.wontYe()) {
					return identity != target.identity;
				}
				return true;
			}
		} else {
			if (this.identity == "unknown" || target.identity == "unknown") {
				return false;
			}
			if (this.identity == "ye" || target.identity == "ye") {
				return true;
			}
		}
		return this.identity != target.identity;
	}

	/**
	 * 判断是否“是”队友
	 *
	 * @param { Player } target 判断对象
	 * @param { boolean } [shown] 考虑自身身份已明确的情况
	 * @returns { boolean }
	 */
	sameIdentityAs(target, shown) {
		if (this.getStorage("yexinjia_friend").includes(target)) {
			return true;
		}
		if (target.getStorage("yexinjia_friend").includes(this)) {
			return true;
		}
		if (shown) {
			if (this.identity == "ye" || this.identity == "unknown") {
				return false;
			}
		} else {
			// @ts-expect-error 类型就是这么写的
			if (this == target) {
				return true;
			}
			if (target.identity == "unknown" || target.identity == "ye" || this.identity == "ye") {
				return false;
			}
			if (this.identity == "unknown") {
				var identity = lib.character[this.name1][1];
				if (this.wontYe()) {
					return identity == target.identity;
				}
				return false;
			}
		}
		return this.identity == target.identity;
	}

	/**
	 * 判断玩家亮将情况
	 *
	 * @returns { object }
	 */
	getModeState() {
		return {
			unseen: this.isUnseen(0),
			unseen2: this.isUnseen(1),
		};
	}

	/**
	 * 设置玩家信息（主副将名称、身份）
	 *
	 * @param { object } info
	 */
	setModeState(info) {
		if (info.mode.unseen) {
			this.classList.add("unseen");
		}
		if (info.mode.unseen2) {
			this.classList.add("unseen2");
		}
		if (!info.name) {
			return;
		}
		// if(info.name.indexOf('unknown')==0){
		// 	if(this==game.me){
		// 		lib.translate[info.name]+='（你）';
		// 	}
		// }
		this.init(info.name1, info.name2, false);
		this.name1 = info.name1;
		this.name = info.name;
		this.node.name_seat = ui.create.div(".name.name_seat", get.verticalStr(lib.translate[this.name].slice(0, 3)), this);
		if (info.identityShown) {
			this.setIdentity(info.identity);
			this.node.identity.classList.remove("guessing");
			// @ts-expect-error 类型就是这么写的
		} else if (this != game.me) {
			// @ts-expect-error 类型就是这么写的
			this.node.identity.firstChild.innerHTML = "猜";
			this.node.identity.dataset.color = "unknown";
			this.node.identity.classList.add("guessing");
		}
	}
	dieAfter2(source) {
		var that = this;
		if (that.hasSkillTag("noDieAfter", null, source)) {
			return;
		}
		if (source && source.hasSkillTag("noDieAfter2", null, that)) {
			return;
		}
		if (source && source.shijun) {
			source.discard(source.getCards("he"));
			delete source.shijun;
		} else if (source && source.identity != "unknown") {
			if (source.identity == "ye" && !source.getStorage("yexinjia_friend").length) {
				source.draw(3);
			} else if (source.shijun2) {
				delete source.shijun2;
				source.draw(
					1 +
						game.countPlayer(function (current) {
							return current.group == that.group;
						})
				);
			} else if (that.identity == "ye") {
				if (that.getStorage("yexinjia_friend").includes(source) || source.getStorage("yexinjia_friend").includes(that)) {
					source.discard(source.getCards("he"));
				} else {
					source.draw(
						1 +
							game.countPlayer(function (current) {
								// @ts-expect-error 类型就是这么写的
								if (current == that) {
									return false;
								}
								if (current.getStorage("yexinjia_friend").includes(that)) {
									return true;
								}
								if (that.getStorage("yexinjia_friend").includes(current)) {
									return true;
								}
								return false;
							})
					);
				}
			} else if (that.identity != source.identity) {
				source.draw(get.population(that.identity) + 1);
			} else {
				source.discard(source.getCards("he"));
			}
		}
	}
	dieAfter(source) {
		this.showCharacter(2);
		if (get.is.jun(this.name1)) {
			if (source && source.identity == this.identity) {
				source.shijun = true;
			} else if (source && source.identity != "ye") {
				source.shijun2 = true;
			}
			var yelist = [];
			for (var i = 0; i < game.players.length; i++) {
				if (game.players[i].identity == this.identity) {
					yelist.push(game.players[i]);
				}
			}
			// @ts-expect-error 类型就是这么写的
			game.broadcastAll(function (list) {
				for (var i = 0; i < list.length; i++) {
					list[i].identity = "ye";
					list[i].setIdentity();
				}
			}, yelist);
			// gz3: 君主死亡后，原本跟随他的整个势力集体转为野心家——这也是identity变成"ye"
			// 的一条路径，跟$showCharacter里两个"判定成野心家"的分支性质一样，但这里之前完全
			// 没有addMark("yexinjia_mark")，导致因为主公战死而集体变成野心家的角色永远拿不到
			// 这个标记
			for (const p of yelist) {
				if (!p._ye) {
					p._ye = true;
					p.addMark("yexinjia_mark", 1);
				}
			}
			// @ts-expect-error 类型就是这么写的
			_status.yeidentity.add(this.identity);
		}
		// @ts-expect-error 类型就是这么写的
		game.tryResult();
	}

	/**
	 * 查看一名角色的主副将
	 *
	 * @param { Player } target 查看对象
	 * @param { number } [num] - 查看哪张武将牌，`0`为主将，`1`为副将，`2`为全部（默认为2）
	 */
	viewCharacter(target, num) {
		if (num != 0 && num != 1) {
			num = 2;
		}
		if (!target.isUnseen(num)) {
			return;
		}
		var next = game.createEvent("viewCharacter");
		// @ts-expect-error 类型就是这么写的
		next.player = this;
		next.target = target;
		next.num = num;
		next.setContent(function () {
			// @ts-expect-error 类型就是这么写的
			if (!player.storage.zhibi) {
				// @ts-expect-error 类型就是这么写的
				player.storage.zhibi = [];
			}
			// @ts-expect-error 类型就是这么写的
			player.storage.zhibi.add(target);
			var content,
				str = get.translation(target) + "的";
			// @ts-expect-error 类型就是这么写的
			if (event.num == 0 || !target.isUnseen(1)) {
				content = [str + "主将", [[target.name1], "character"]];
				// @ts-expect-error 类型就是这么写的
				game.log(player, "观看了", target, "的主将");
				// @ts-expect-error 类型就是这么写的
			} else if (event.num == 1 || !target.isUnseen(0)) {
				content = [str + "副将", [[target.name2], "character"]];
				// @ts-expect-error 类型就是这么写的
				game.log(player, "观看了", target, "的副将");
			} else {
				content = [str + "主将和副将", [[target.name1, target.name2], "character"]];
				// @ts-expect-error 类型就是这么写的
				game.log(player, "观看了", target, "的主将和副将");
			}
			// @ts-expect-error 类型就是这么写的
			player.chooseControl("ok").set("dialog", content);
		});
	}

	/**
	 * 判断副将技是否生效
	 *
	 * @param { string } skill 要判断的技能
	 * @param { false } [disable] 是否失效该技能，若为`false`则失效
	 */
	checkViceSkill(skill, disable) {
		if (game.expandSkills(lib.character[this.name2][3].slice(0)).includes(skill) || this.hasSkillTag("alwaysViceSkill")) {
			return true;
		} else {
			if (disable !== false) {
				this.awakenSkill(skill);
			}
			return false;
		}
	}
	/**
	 * 判断主将技是否生效
	 *
	 * @param { string } skill 要判断的技能
	 * @param { false } [disable] 是否失效该技能，若为`false`则失效
	 */
	checkMainSkill(skill, disable) {
		if (game.expandSkills(lib.character[this.name1][3].slice(0)).includes(skill) || this.hasSkillTag("alwaysMainSkill")) {
			return true;
		} else {
			if (disable !== false) {
				this.awakenSkill(skill);
			}
			return false;
		}
	}

	/**
	 * 减少玩家体力上限，不触发相关时机
	 *
	 * @param { number } [num] 减少的数值，默认为1
	 */
	removeMaxHp(num) {
		if (game.online) {
			return;
		}
		if (!num) {
			num = 1;
		}
		while (num > 0) {
			num--;
			if (typeof this.singleHp == "boolean") {
				if (this.singleHp) {
					this.singleHp = false;
				} else {
					this.singleHp = true;
					if (!_status._isSwitchPos) {
						this.maxHp--;
					}
				}
			} else {
				if (!_status._isSwitchPos) {
					this.maxHp--;
				}
			}
		}
		this.update();
	}

	/**
	 * 暗置武将
	 *
	 * @param { number } num - 暗置哪张武将牌，`0`为主将，`1`为副将
	 * @param { boolean } [log] 是否log信息
	 * @returns
	 */
	hideCharacter(num, log) {
		if (this.isUnseen(2)) {
			return;
		}
		var name = this["name" + (num + 1)];
		var next = game.createEvent("hideCharacter");
		// @ts-expect-error 类型就是这么写的
		next.player = this;
		// @ts-expect-error 类型就是这么写的
		next.toHide = name;
		next.num = num;
		// @ts-expect-error 类型就是这么写的
		next.log = log;
		// @ts-expect-error 类型就是这么写的
		next.setContent("hideCharacter");
		return next;
	}

	/**
	 * 移去武将牌（变成士兵）
	 *
	 * @param { number } num - 移去哪张武将牌，`0`为主将，`1`为副将
	 * @returns
	 */
	removeCharacter(num) {
		var name = this["name" + (num + 1)];
		var next = game.createEvent("removeCharacter");
		// @ts-expect-error 类型就是这么写的
		next.player = this;
		// @ts-expect-error 类型就是这么写的
		next.toRemove = name;
		next.num = num;
		next.setContent("removeCharacter");
		return next;
	}
	$removeCharacter(num) {
		var name = this["name" + (num + 1)];
		var info = lib.character[name];
		if (!info) {
			return;
		}
		var to = "gz_shibing" + (info[0] == "male" ? 1 : 2) + info[1];
		game.log(this, "移除了" + (num ? "副将" : "主将"), "#b" + name);
		if (!lib.character[to]) {
			// @ts-expect-error 类型就是这么写的
			lib.character[to] = [info[0], info[1], 0, [], [`character:${to.slice(3, 11)}`, "unseen"]];
			lib.translate[to] = `${get.translation(info[1])}兵`;
		}
		this.reinit(name, to, false);
		this.showCharacter(num, false);
		// @ts-expect-error 类型就是这么写的
		_status.characterlist.add(name);
	}

	/**
	 * 变更副将
	 *
	 * @param { boolean } [hidden] 是否暗置变更后的副将
	 * @returns
	 */
	changeVice(hidden) {
		var next = game.createEvent("changeVice");
		// @ts-expect-error 类型就是这么写的
		next.player = this;
		// @ts-expect-error 类型就是这么写的
		next.setContent("changeVice");
		next.num = !_status.connectMode && get.config("changeViceType") == "online" ? 1 : 3;
		if (hidden) {
			// @ts-expect-error 类型就是这么写的
			next.hidden = true;
		}
		return next;
	}

	/**
	 * 与一名角色的主副将进行易位
	 *
	 * @param { Player } target 要交换武将的对象
	 * @param { number } [num1=2]  - 自己要易位的武将牌，`1`为主将，`2`为副将（默认为2）
	 * @param { number } [num2=num1] - 交换对象要易位的武将牌，`1`为主将，`2`为副将（默认与前一个参数相同）
	 * @returns
	 */
	transCharacter(target, num1 = 2, num2 = num1) {
		var next = game.createEvent("transCharacter");
		// @ts-expect-error 类型就是这么写的
		next.player = this;
		next.target = target;
		// @ts-expect-error 类型就是这么写的
		next.num1 = num1;
		// @ts-expect-error 类型就是这么写的
		next.num2 = num2;
		// @ts-expect-error 类型就是这么写的
		next.setContent("transCharacter");
		return next;
	}
	/**
	 * 玩家是否有主将（不为士兵）
	 *
	 * @returns { boolean }
	 */
	hasMainCharacter() {
		return this.name1.indexOf("gz_shibing") != 0;
	}
	/**
	 * 玩家是否有副将（不为士兵）
	 *
	 * @returns { boolean }
	 */
	hasViceCharacter() {
		return this.name2.indexOf("gz_shibing") != 0;
	}
	$showCharacter(num, log) {
		var showYe = false;
		if (num == 0 && !this.isUnseen(0)) {
			return;
		}
		if (num == 1 && !this.isUnseen(1)) {
			return;
		}
		if (!this.isUnseen(2)) {
			return;
		}
		// @ts-expect-error 类型就是这么写的
		game.addVideo("showCharacter", this, num);
		// gz3: "三将"规则下势力判定改成"先亮先定，不会再被覆盖"——只有identity还是
		// unknown（这个玩家第一次亮将）才会走下面这段判定逻辑；不再额外触发"主将是
		// 野心家系势力时强制重判"的分支（哪怕已经定过势力）。普通国战保留原有判断。
		if (get.config("sanjiang") ? this.identity == "unknown" : this.identity == "unknown" || ((num == 0 || num == 2) && lib.character[this.name1][1] == "ye")) {
			this.group = this.getGuozhanGroup(num);
			if ((num == 0 || num == 2) && lib.character[this.name1][1] == "ye") {
				this.identity = "ye";
				if (!this._ye) {
					this._ye = true;
					showYe = true;
				}
			} else if (get.is.jun(this.name1) && this.isAlive()) {
				this.identity = this.group;
			} else if (this.wontYe(this.group)) {
				this.identity = this.group;
			} else {
				this.identity = "ye";
				// gz3: 这个分支是"普通角色随机判定成野心家身份"，跟上面"主将本身就是ye系
				// 势力"那个分支一样都是identity=="ye"的结果，之前只有那个分支设了
				// showYe=true，这里漏了，导致随机判成野心家的角色永远拿不到"野心家"标记
				if (!this._ye) {
					this._ye = true;
					showYe = true;
				}
			}
			this.setIdentity(this.identity);
			this.ai.shown = 1;
			this.node.identity.classList.remove("guessing");

			// @ts-expect-error 类型就是这么写的
			if (_status.clickingidentity && _status.clickingidentity[0] == this) {
				// @ts-expect-error 类型就是这么写的
				for (var i = 0; i < _status.clickingidentity[1].length; i++) {
					// @ts-expect-error 类型就是这么写的
					_status.clickingidentity[1][i].delete();
					// @ts-expect-error 类型就是这么写的
					_status.clickingidentity[1][i].style.transform = "";
				}
				// @ts-expect-error 类型就是这么写的
				delete _status.clickingidentity;
			}
			// @ts-expect-error 类型就是这么写的
			game.addVideo("setIdentity", this, this.identity);
		}
		var skills;
		switch (num) {
			case 0:
				if (log !== false) {
					game.log(this, "展示了主将", "#b" + this.name1);
				}
				this.name = this.name1;
				skills = lib.character[this.name][3];
				this.sex = lib.character[this.name][0];
				this.classList.remove("unseen");
				break;
			case 1:
				if (log !== false) {
					game.log(this, "展示了副将", "#b" + this.name2);
				}
				skills = lib.character[this.name2][3];
				if (this.sex == "unknown") {
					this.sex = lib.character[this.name2][0];
				}
				if (this.name.indexOf("unknown") == 0) {
					this.name = this.name2;
				}
				this.classList.remove("unseen2");
				break;
			case 2:
				if (log !== false) {
					game.log(this, "展示了主将", "#b" + this.name1, "、副将", "#b" + this.name2);
				}
				this.name = this.name1;
				skills = lib.character[this.name][3].concat(lib.character[this.name2][3]);
				this.sex = lib.character[this.name][0];
				this.classList.remove("unseen");
				this.classList.remove("unseen2");
				break;
		}
		game.broadcast(
			// @ts-expect-error 类型就是这么写的
			function (player, name, sex, num, identity, group) {
				player.identityShown = true;
				player.group = group;
				player.name = name;
				player.sex = sex;
				player.node.identity.classList.remove("guessing");
				switch (num) {
					case 0:
						player.classList.remove("unseen");
						break;
					case 1:
						player.classList.remove("unseen2");
						break;
					case 2:
						player.classList.remove("unseen");
						player.classList.remove("unseen2");
						break;
				}
				player.ai.shown = 1;
				player.identity = identity;
				player.setIdentity(identity);
				// @ts-expect-error 类型就是这么写的
				if (_status.clickingidentity && _status.clickingidentity[0] == player) {
					// @ts-expect-error 类型就是这么写的
					for (var i = 0; i < _status.clickingidentity[1].length; i++) {
						// @ts-expect-error 类型就是这么写的
						_status.clickingidentity[1][i].delete();
						// @ts-expect-error 类型就是这么写的
						_status.clickingidentity[1][i].style.transform = "";
					}
					// @ts-expect-error 类型就是这么写的
					delete _status.clickingidentity;
				}
			},
			this,
			this.name,
			this.sex,
			num,
			this.identity,
			this.group
		);
		this.identityShown = true;
		// @ts-expect-error 类型就是这么写的
		for (var i = 0; i < skills.length; i++) {
			// @ts-expect-error 类型就是这么写的
			if (!this.hiddenSkills.includes(skills[i])) {
				continue;
			}
			// @ts-expect-error 类型就是这么写的
			this.hiddenSkills.remove(skills[i]);
			// @ts-expect-error 类型就是这么写的
			this.addSkill(skills[i]);
		}
		this.checkConflict();
		// @ts-expect-error 类型就是这么写的
		if (!this.viceChanged) {
			var initdraw = get.config("initshow_draw");
			if (_status.connectMode) {
				initdraw = lib.configOL.initshow_draw;
			}
			// @ts-expect-error 类型就是这么写的
			if (!_status.initshown && !_status.overing && initdraw != "off" && this.isAlive() && _status.mode != "mingjiang") {
				this.popup("首亮");
				if (initdraw == "draw") {
					game.log(this, "首先明置武将，得到奖励");
					game.log(this, "摸了两张牌");
					// @ts-expect-error 类型就是这么写的
					this.draw(2).log = false;
				} else {
					this.addMark("xianqu_mark", 1);
				}
				// @ts-expect-error 类型就是这么写的
				_status.initshown = true;
			}
			if (!this.isUnseen(2) && !this._mingzhied) {
				this._mingzhied = true;
				if (this.singleHp) {
					this.doubleDraw();
				}
				if (this.perfectPair()) {
					var next = game.createEvent("guozhanDraw");
					// @ts-expect-error 类型就是这么写的
					next.player = this;
					// @ts-expect-error 类型就是这么写的
					next.setContent("zhulian");
				}
			}
			if (showYe) {
				this.addMark("yexinjia_mark", 1);
			}
		}
		// @ts-expect-error 类型就是这么写的
		game.tryResult();
	}

	/**
	 * 玩家是否“不会”变成野心家
	 *
	 * @param { string } [group] 判断所处的势力
	 * @param { number } [numOfReadyToShow] 预亮角色数，默认为1（自己）
	 * @returns { boolean }
	 */
	wontYe(group, numOfReadyToShow) {
		if (!group) {
			if (this.trueIdentity) {
				group = this.trueIdentity;
			} else {
				group = lib.character[this.name1][1];
			}
		}
		// @ts-expect-error 类型就是这么写的
		if (_status.yeidentity && _status.yeidentity.includes(group)) {
			return false;
		}
		if (get.zhu(this, null, group)) {
			return true;
		}
		if (!numOfReadyToShow) {
			numOfReadyToShow = 1;
		}
		// gz3: 原来群雄割据模式下阈值是"人数/2 - 1"，5人局算出来是1.5，导致同势力
		// 第二个人（1+1=2 > 1.5）就必野，一个势力永远凑不出两个人。改成
		// "向上取整(人数/2) - 1"：5人局阈值是2（⌈2.5⌉-1=2），6人局也是2
		// （⌈3⌉-1=2），同势力最多能凑到这么多人，多出来的才会被挤去野心家；
		// 保底不低于1，避免人数很少时算出0/负数。正常模式的阈值不受影响。
		// @ts-expect-error 类型就是这么写的
		// return get.totalPopulation(group) + numOfReadyToShow <= (_status.separatism ? Math.max(Math.ceil(get.population() / 2) - 1, 1) : get.population() / 2);
		return get.totalPopulation(group) + numOfReadyToShow <= get.population() / 2;
	}

	/**
	 * 判断主副将是否“珠联璧合”
	 *
	 * @param { object } [choosing] 传入已选主副将（目前无实际用处）
	 * @returns { boolean }
	 */
	perfectPair(choosing) {
		if (_status.connectMode) {
			if (!lib.configOL.zhulian) {
				return false;
			}
		} else {
			if (!get.config("zhulian")) {
				return false;
			}
		}
		const name1 = this.name1;
		const name2 = this.name2;
		if (name1.indexOf("gz_shibing") == 0 || name2.indexOf("gz_shibing") == 0) {
			return false;
		}
		if (choosing && lib.character[name1][1] != "ye" && lib.character[name2][1] != "ye" && lib.character[name1][1] != lib.character[name2][1]) {
			return false;
		}
		// gz3: 珠联璧合改为"主副将势力相同"即可获得，不再依赖官方那套固定配对表
		// （与第三将系统无关，第三将不参与此判定）。选将界面预览提示和gz_limeng
		// 等技能会在只有name1/name2的临时对象上调用这个方法（不是真正的Player
		// 实例，没有getGuozhanGroup），这里做个兜底，直接比较武将牌本身的势力。
		if (typeof this.getGuozhanGroup === "function") {
			return this.getGuozhanGroup(0) == this.getGuozhanGroup(1);
		}
		return lib.character[name1][1] == lib.character[name2][1];
	}

	/**
	 * 判断玩家是否处于“围攻”状态
	 *
	 * @param { Player } [player] 参照对象，是否“围攻”该角色，不填则判断自身上下家
	 * @returns { boolean }
	 */
	siege(player) {
		if (this.identity == "unknown" || this.hasSkill("undist")) {
			return false;
		}
		if (!player) {
			var next = this.getNext();
			if (next && next.sieged()) {
				return true;
			}
			var previous = this.getPrevious();
			if (previous && previous.sieged()) {
				return true;
			}
			return false;
		} else {
			// @ts-expect-error 类型就是这么写的
			return player.sieged() && (player.getNext() == this || player.getPrevious() == this);
		}
	}

	/**
	 * 判断玩家是否处于“被围攻”状态
	 *
	 * @param { Player } [player] 参照对象，是否被该角色“围攻”，不填则判断自身上下家
	 * @returns { boolean }
	 */
	sieged(player) {
		if (this.identity == "unknown") {
			return false;
		}
		if (player) {
			return player.siege(this);
		} else {
			var next = this.getNext();
			var previous = this.getPrevious();
			if (next && previous && next != previous) {
				if (next.identity == "unknown" || next.isFriendOf(this)) {
					return false;
				}
				return next.isFriendOf(previous);
			}
			return false;
		}
	}

	/**
	 * 判断玩家是否处于“队列”
	 *
	 * @returns { boolean }
	 */
	inline() {
		if (this.identity == "unknown" || this.identity == "ye" || this.hasSkill("undist")) {
			return false;
		}
		var next = this,
			previous = this;
		var list = [];
		for (var i = 0; next || previous; i++) {
			if (next) {
				// @ts-expect-error 类型就是这么写的
				next = next.getNext();
				if (!next.isFriendOf(this) || next == this) {
					// @ts-expect-error 类型就是这么写的
					next = null;
				} else {
					list.add(next);
				}
			}
			if (previous) {
				// @ts-expect-error 类型就是这么写的
				previous = previous.getPrevious();
				if (!previous.isFriendOf(this) || previous == this) {
					// @ts-expect-error 类型就是这么写的
					previous = null;
				} else {
					list.add(previous);
				}
			}
		}
		if (!list.length) {
			return false;
		}
		for (var i = 0; i < arguments.length; i++) {
			if (!list.includes(arguments[i]) && arguments[i] != this) {
				return false;
			}
		}
		return true;
	}
	logAi(targets, card) {
		if (this.ai.shown == 1 || this.isMad()) {
			return;
		}
		if (typeof targets == "number") {
			// @ts-expect-error 类型就是这么写的
			this.ai.shown += targets;
		} else {
			var effect = 0,
				c,
				shown;
			var info = get.info(card);
			if (info.ai && info.ai.expose) {
				if (_status.event.name == "_wuxie") {
					if (_status.event.source && _status.event.source.ai.shown) {
						// @ts-expect-error 类型就是这么写的
						this.ai.shown += 0.2;
					}
				} else {
					// @ts-expect-error 类型就是这么写的
					this.ai.shown += info.ai.expose;
				}
			}
			if (targets.length > 0) {
				for (var i = 0; i < targets.length; i++) {
					shown = Math.abs(targets[i].ai.shown);
					if (shown < 0.2 || targets[i].identity == "nei") {
						c = 0;
					} else if (shown < 0.4) {
						c = 0.5;
					} else if (shown < 0.6) {
						c = 0.8;
					} else {
						c = 1;
					}
					effect += get.effect(targets[i], card, this) * c;
				}
			}
			if (effect > 0) {
				if (effect < 1) {
					c = 0.5;
				} else {
					c = 1;
				}
				if (targets.length != 1 || targets[0] != this) {
					if (targets.length == 1) {
						// @ts-expect-error 类型就是这么写的
						this.ai.shown += 0.2 * c;
					} else {
						// @ts-expect-error 类型就是这么写的
						this.ai.shown += 0.1 * c;
					}
				}
			}
		}
		// @ts-expect-error 类型就是这么写的
		if (this.ai.shown > 0.95) {
			this.ai.shown = 0.95;
		}
		// @ts-expect-error 类型就是这么写的
		if (this.ai.shown < -0.5) {
			this.ai.shown = -0.5;
		}
	}

	/**
	 * gz3: 官方原版trySkillAnimate查不到main/vice时统一兜底成"main"（见
	 * checkShow()对name3一无所知，任何第三将动态获得、不在lib.character[name3][3]
	 * 静态数组里的技能——比如换将换来的新技能——都会查不到槽位，一路兜底成"main"，
	 * 导致第三将发动技能特效时头像却显示成了主将。
	 * 这里在官方原版基础上加一层兜底：查不到main/vice时，只要玩家确实有第三将，就
	 * 优先兜底成"third"（而不是"main"），其余逻辑跟官方原版完全一致。
	 * @param {string} name
	 * @param {string} popname
	 * @param {'main' | 'vice' | 'third' | boolean} [checkShow]
	 */
	trySkillAnimate(name, popname, checkShow) {
		game.callHook("checkSkillAnimate", [this, name, popname]);
		if (!game.online && lib.config.skill_animation_type != "off" && lib.skill[name] && lib.skill[name].skillAnimation) {
			if (lib.config.skill_animation_type == "default") {
				checkShow = checkShow || (lib.character[this.name3] ? "third" : "main");
			} else {
				checkShow = false;
			}
			if (lib.skill[name].textAnimation) {
				checkShow = false;
			}
			this.$skill(lib.skill[name].animationStr || lib.translate[name], lib.skill[name].skillAnimation, lib.skill[name].animationColor, checkShow);
			return;
		}
		var player = this;
		game.broadcast(
			function (player, name, popname) {
				player.trySkillAnimate(name, popname);
			},
			player,
			name,
			popname
		);
		if (lib.animate.skill[name]) {
			lib.animate.skill[name].apply(this, arguments);
		} else {
			if (popname != name) {
				this.popup(popname, "water", false);
			} else {
				this.popup(get.skillTranslation(name, this), "water", false);
			}
		}
	}
}
