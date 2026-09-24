// @ts-nocheck

import { lib, game, ui, get, Get, ai, _status } from "noname";
import { showYexingsContent, chooseCharacterContent, chooseCharacterOLContent } from "./content.js";

export class GetGuozhan extends Get {
	/**
	 * > ?.?
	 *
	 * @param {*} source
	 * @param {*} junling
	 * @param {*} performer
	 * @param {*} targets
	 * @param {*} viewer
	 * @returns
	 */
	junlingEffect(source, junling, performer, targets, viewer) {
		var att1 = get.attitude(viewer, source),
			att2 = get.attitude(viewer, performer);
		var eff1 = 0,
			eff2 = 0;
		switch (junling) {
			case "junling1":
				if (
					!targets.length &&
					game.countPlayer(function (current) {
						return get.damageEffect(viewer, current, viewer) > 0;
					})
				) {
					eff1 = 2;
				} else {
					if (get.damageEffect(targets[0], performer, source) >= 0) {
						eff1 = 2;
					} else {
						eff1 = -2;
					}
					if (get.damageEffect(targets[0], source, performer) >= 0) {
						eff2 = 2;
					} else {
						eff2 = -2;
					}
				}
				break;
			case "junling2":
				if (performer.countCards("he")) {
					eff1 = 1;
					eff2 = 0;
				} else {
					eff1 = 2;
					eff2 = -1;
				}
				break;
			case "junling3":
				if (performer.hp == 1 && !performer.hasSkillTag("save", true)) {
					eff2 = -5;
				} else {
					if (performer == viewer) {
						if (performer.hasSkillTag("maihp", true)) {
							eff2 = 3;
						} else {
							eff2 = -2;
						}
					} else {
						if (performer.hasSkillTag("maihp", false)) {
							eff2 = 3;
						} else {
							eff2 = -2;
						}
					}
				}
				break;
			case "junling4":
				eff1 = 0;
				eff2 = -2;
				break;
			case "junling5":
				var td = performer.isTurnedOver();
				if (td) {
					if (performer == viewer) {
						// @ts-expect-error 祖宗之法就是这么写的
						if (_status.currentPhase == performer && performer.hasSkill("jushou")) {
							eff2 = -3;
						} else {
							eff2 = 3;
						}
					} else {
						eff2 = 3;
					}
				} else {
					if (performer == viewer) {
						if (performer.hasSkillTag("noturn", true)) {
							eff2 = 0;
						} else {
							eff2 = -3;
						}
					} else {
						if (performer.hasSkillTag("noturn", false)) {
							eff2 = 0;
						} else {
							eff2 = -3;
						}
					}
				}
				break;
			case "junling6":
				if (performer.countCards("h") > 1) {
					eff2 += 1 - performer.countCards("h");
				}
				if (performer.countCards("e") > 1) {
					eff2 += 1 - performer.countCards("e");
				}
				break;
		}
		return Math.sign(att1) * eff1 + Math.sign(att2) * eff2;
	}

	/**
	 * > ??.?
	 *
	 * @param {string} name1
	 * @param {string} name2
	 * @returns {boolean}
	 */
	guozhanReverse(name1, name2) {
		if (get.is.double(name2)) {
			return false;
		}
		if (["gz_xunyou", "gz_lvfan", "gz_liubei"].includes(name2)) {
			return true;
		}
		if (name1 == "gz_re_xushu") {
			return true;
		}
		if (name2 == "gz_dengai") {
			return lib.character[name1][2] % 2 == 1;
		}
		if (["gz_sunce", "gz_jiangwei"].includes(name1)) {
			return name2 == "gz_zhoutai" || lib.character[name2][2] % 2 == 1;
		}
		return false;
	}

	/**
	 * 获取武将的等级
	 *
	 * @param {string} name
	 * @param {Player} player
	 * @returns
	 */
	guozhanRank(name, player) {
		if (name.indexOf("gz_shibing") == 0) {
			return -1;
		}
		if (name.indexOf("gz_jun_") == 0) {
			return 7;
		}
		if (player) {
			var skills = lib.character[name][3].slice(0);
			for (var i = 0; i < skills.length; i++) {
				if (lib.skill[skills[i]].limited && player.awakenedSkills.includes(skills[i])) {
					return skills.length - 1;
				}
			}
		}
		if (_status._aozhan) {
			for (var i in lib.aozhanRank) {
				if (lib.aozhanRank[i].includes(name)) {
					return parseInt(i);
				}
			}
		}
		for (var i in lib.guozhanRank) {
			if (lib.guozhanRank[i].includes(name)) {
				return parseInt(i);
			}
		}
		return 0;
	}

	/**
	 * 势力判断专用的"有效身份"猜测：已明置的直接用真实identity；未明置的按“会不会被挤野”
	 * 二元猜一个（会挤野就当野心家，不会就当主将势力）。fid/tid 在 realAttitude/rawAttitude
	 * 里各自都要用，抽成共享方法避免两处实现漂移。
	 *
	 * @param {Player} player
	 * @returns {string}
	 */
	_gzIdentity(player) {
		if (player.isUnseen()) {
			if (!player.wontYe()) {
				return "ye";
			}
			return player.getGuozhanGroup(0);
		}
		return player.identity;
	}

	/**
	 * from 未明置时，这名玩家最终揭示出来还可能是哪些势力（用 game.getIdentityList 剔除
	 * 已经满员/被禁用的势力）。找不到就退化成四大常规势力，保证一定有候选，不会返回空数组
	 * 导致后面的概率计算除零。
	 *
	 * @param {Player} player
	 * @returns {string[]}
	 */
	_gzCandidateGroups(player) {
		if (typeof game.getIdentityList == "function") {
			var list = game.getIdentityList(player);
			if (list) {
				var keys = Object.keys(list).filter(function (key) {
					return key != "unknown" && key != "ye";
				});
				if (keys.length) {
					return keys;
				}
			}
		}
		return ["wei", "shu", "wu", "qun"];
	}

	/**
	 * 群雄割据下主副将允许不同势力，真正算哪个势力要等玩家自己选"明置主将"还是
	 * "明置副将"才定下来——在那之前，主将和副将的势力权重应该是一样的，都算"有可能
	 * 是我"，不能像 _gzIdentity 那样默认只认主将。用于判断"这个人有没有可能是我的
	 * 队友"这类场合；已明置/已有 trueIdentity（选将时就锁定真实势力，如三将模式里
	 * 的选择势力角色）的，身份已经唯一确定，直接返回这一个。
	 *
	 * @param {Player} player
	 * @returns {string[]}
	 */
	_gzPossibleGroups(player) {
		if (player.identity != "unknown") {
			return [player.identity];
		}
		if (player.trueIdentity) {
			return [player.trueIdentity];
		}
		var groups = [];
		var g1 = lib.character[player.name1][1];
		var g2 = lib.character[player.name2][1];
		if (g1 != "ye" && !groups.includes(g1)) {
			groups.push(g1);
		}
		if (g2 != "ye" && !groups.includes(g2)) {
			groups.push(g2);
		}
		if (!groups.length) {
			groups.push("ye");
		}
		return groups;
	}

	/**
	 * 每名玩家固定分配一个“打法人格”，只在 from 还未明置（势力信号还没建立起来）时才会
	 * 影响态度评分——对应三将/群雄割据刚开局所有人都暗置、纯粹靠个人博弈行事的阶段。
	 * 人格一旦分配就存进 storage，整局不变。
	 *
	 * @param {Player} player
	 * @returns {string}
	 */
	_gzPersonality(player) {
		if (!player.storage.gzPersonality) {
			var pool = ["bully", "passive", "safe", "balanced"];
			player.storage.gzPersonality = pool[Math.floor(Math.random() * pool.length)];
		}
		return player.storage.gzPersonality;
	}

	/**
	 * 按 from 的人格，在原始态度分上叠加一个小幅修正：恃强凌弱者更想打弱的、放过强的；
	 * 谨慎者更想打没有反击能力/离得远的、放过威胁大的；被动者整体上不那么在乎谁是谁。
	 * 只做小幅加减/缩放，不会反转原有正负号所代表的敌友大方向。
	 *
	 * @param {Player} from
	 * @param {Player} to
	 * @param {number} att
	 * @returns {number}
	 */
	_gzPersonalityAdjust(from, to, att) {
		switch (this._gzPersonality(from)) {
			case "bully":
				if (to.hp < from.hp) {
					return att - 0.5;
				}
				if (to.hp > from.hp) {
					return att + 0.3;
				}
				return att;
			case "passive":
				return att * 0.5;
			case "safe": {
				var threat = to.countCards("he") + (to.hasSkillTag("save", true) ? 1 : 0);
				var dist = get.distance(from, to);
				if (threat <= 1 || dist > 2) {
					return att - 0.3;
				}
				return att + 0.2;
			}
			default:
				return att;
		}
	}

	/**
	 * > ?.??
	 *
	 * @param {Player} from
	 * @param {Player} to
	 * @param {number} difficulty
	 * @param {string} toidentity
	 * @returns
	 */
	realAttitude(from, to, difficulty, toidentity) {
		var fid = this._gzIdentity(from);
		if (from.identity != "unknown") {
			// from 已经明置，身份是确定的，维持原来的强判断
			if (fid == toidentity && toidentity != "ye") {
				return 4 + difficulty;
			}
			return this._gzRealAttitudeCore(from, to, difficulty, toidentity, fid);
		}
		// from 未明置：不再是“猜一个身份就当真/当假”的二元判断，而是按“这个势力目前
		// 轮到我的概率”在“当队友”和下面常规聚类结果之间做连续插值。
		var core = this._gzRealAttitudeCore(from, to, difficulty, toidentity, fid);
		if (toidentity != "ye" && toidentity != "unknown") {
			var candidates = this._gzCandidateGroups(from);
			if (candidates.includes(toidentity)) {
				var chance = 1 / Math.max(1, candidates.length);
				if (fid == toidentity && from.wontYe()) {
					chance = Math.max(chance, 0.6);
				}
				var allyScore = 4 + difficulty;
				return core + (allyScore - core) * chance;
			}
		}
		return core;
	}

	/**
	 * realAttitude 的原有聚类打分主体，抽出来复用（未明置的 from 也要走这套逻辑作为
	 * “插值的另一端”）。在原有逻辑基础上叠加三处修正：
	 * ①势力体量按血量加权，不是单纯数人头，避免“3个残血 vs 2个满血”被错判成更大势力；
	 * ②对野心家不再额外加成“显得像最大势力”，改成对最终结果打折——打死野心家不能巩固
	 *   任何势力局势，性价比本来就低；
	 * ③自己所处势力是全场最弱/唯一势力时，整体收敛敌意（观望），除非对方明显是当前最大
	 *   势力——这时反而额外增加敌意（拉偏架，防止一方独大）。
	 *
	 * @param {Player} from
	 * @param {Player} to
	 * @param {number} difficulty
	 * @param {string} toidentity
	 * @param {string} fid
	 * @returns {number}
	 */
	_gzRealAttitudeCore(from, to, difficulty, toidentity, fid) {
		var pmap = _status.connectMode ? lib.playerOL : game.playerMap,
			map = {},
			sides = [];
		for (var i of game.players) {
			if (i.identity == "unknown") {
				continue;
			}
			var added = false;
			for (var j of sides) {
				if (i.isFriendOf(pmap[j])) {
					added = true;
					map[j].push(i);
					break;
				}
			}
			if (!added) {
				map[i.playerid] = [i];
				sides.push(i.playerid);
			}
		}
		// gz3: 一名玩家的"体量"不能只看体力，还得看武将强度——而且是主将+副将+（三将
		// 模式下的）第三将三个一起算，不能只看主将。guozhanRank 0～8分，数字越大越强，
		// 除以4放缩到跟体力差不多的量级，避免武将强度把体力的权重整个盖过去。副将只有
		// 已明置时才算数（还没亮的副将，公开身份阶段的"体量"判断不该看到看不见的牌）；
		// 三将模式的第三将从一开始就明置，直接算。
		var powerOf = function (p) {
			var power = Math.max(0.5, p.hp);
			power += get.guozhanRank(p.name1, p) / 4;
			if (!p.isUnseen(1)) {
				power += get.guozhanRank(p.name2, p) / 4;
			}
			if (p.name3) {
				power += get.guozhanRank(p.name3, p) / 4;
			}
			return power;
		};
		var strengthOf = function (players) {
			return players.reduce(function (sum, p) {
				return sum + powerOf(p);
			}, 0);
		};
		var groupSizes = [],
			groupStrengths = [];
		for (var i in map) {
			groupSizes.push(map[i].length);
			groupStrengths.push(strengthOf(map[i]));
		}
		var maxSize = groupSizes.length ? Math.max.apply(this, groupSizes) : 0;
		if (maxSize <= 1) {
			return -3;
		}
		var max = groupStrengths.length ? Math.max.apply(this, groupStrengths) : 0;
		var from_p;
		if (from.identity == "unknown") {
			// gz3: 跟 to_p 保持同一套算法（体力+武将强度的体量，不是单纯数人头），
			// 且主副势力权重一样：只要已公开玩家的身份落在 from 的候选势力里，就算
			// from 这边的人。
			var fromGroups = this._gzPossibleGroups(from);
			from_p = strengthOf(
				game.players.filter(function (current) {
					return current.identity != "unknown" && fromGroups.includes(current.identity);
				})
			);
		} else {
			from_p = strengthOf(
				game.players.filter(function (current) {
					return current.identity != "unknown" && current.isFriendOf(from);
				})
			);
		}
		var to_p = strengthOf(
			game.players.filter(function (current) {
				return current.identity != "unknown" && current.isFriendOf(to);
			})
		);

		var result;
		if (to_p >= max) {
			result = -5;
		} else if (from_p >= max) {
			result = -2 - to_p;
		} else if (max >= game.players.length / 2) {
			result = to_p <= from_p ? 0.5 : 0;
		} else if (to_p < max - 1) {
			result = 0;
		} else {
			result = -0.5;
		}

		if (to.identity == "ye") {
			result *= 0.6;
		}

		if (from.identity != "unknown") {
			var fromKey = null;
			for (var j of sides) {
				if (pmap[j] == from || from.isFriendOf(pmap[j])) {
					fromKey = j;
					break;
				}
			}
			if (fromKey != null && groupSizes.length >= 3) {
				var fromGroupStrength = strengthOf(map[fromKey]);
				var minStrength = Math.min.apply(this, groupStrengths);
				if (fromGroupStrength <= minStrength + 0.01) {
					if (to_p >= max * 0.8) {
						result -= 0.5;
					} else {
						result *= 0.5;
					}
				}
			}
		}

		if (to.hasSkillTag && to.hasSkillTag("maixie", true)) {
			var aliveRatio = game.players.length / Math.max(1, game.players.length + game.dead.length);
			if (_status._aozhan || aliveRatio <= 0.6) {
				result -= 1;
			} else if (aliveRatio > 0.8) {
				result += 0.5;
			}
		}

		return result;
	}

	/**
	 * > ??.??
	 *
	 * @param {Player} from
	 * @param {Player} to
	 * @returns
	 */
	rawAttitude(from, to) {
		var result = this._gzRawAttitudeInner(from, to);
		if (from.identity == "unknown" && to.identity != "unknown" && from != to) {
			result = this._gzPersonalityAdjust(from, to, result);
		}
		return result;
	}

	_gzRawAttitudeInner(from, to) {
		var tid = this._gzIdentity(to);
		if (to.identity == "unknown" && game.players.length == 2) {
			return -5;
		}
		if (_status.currentPhase == from && from.ai.tempIgnore && from.ai.tempIgnore.includes(to) && to.identity == "unknown" && (!from.storage.zhibi || !from.storage.zhibi.includes(to))) {
			return 0;
		}
		var difficulty = 0;
		if (to == game.me) {
			difficulty = (2 - get.difficulty()) * 1.5;
		}
		if (from == to) {
			return 5 + difficulty;
		}
		if (from.isFriendOf(to)) {
			return 5 + difficulty;
		}
		// gz3: 只要真实势力本来就有重合，就不该去打——你想打一个人，前提就是不想跟他
		// 同势力；如果真身份已经重合，那不管这次明置安不安全（会不会被挤成野心家），
		// 现在这一刻你们就是队友，不能因为"以后可能不方便公开"就去伤害真队友。所以
		// 这里不再额外要求 wontYe()。
		// 群雄割据下主副将允许不同势力，真正算哪个势力要等玩家自己选"明置主将"还是
		// "明置副将"，在那之前主副两个势力都算"有可能是我"，权重一样，不能只按主将
		// 势力（也就是 fid）去判断——所以这里改成用 _gzPossibleGroups 比较，只要
		// from 的候选势力和 to 的候选势力有交集，就当队友。
		if (from.identity == "unknown" && this._gzPossibleGroups(from).includes(to.identity)) {
			return 4 + difficulty;
		}
		if (from.identity == "unknown" && to.identity == "unknown") {
			var fromGroups = this._gzPossibleGroups(from);
			var toGroups = this._gzPossibleGroups(to);
			if (fromGroups.some(function (g) { return g != "ye" && toGroups.includes(g); })) {
				return 4 + difficulty;
			}
		}
		var att = get.realAttitude(from, to, difficulty, tid);
		// gz3: 结构性的势力体量判断（att）只是"猜的"，但对方实际做过什么（打过我、
		// 弃过我的牌、给我摸过牌/回过血）是打牌过程里公开可见的行为，不该跟结构性
		// 猜测一样被 to.ai.shown 随机打散削弱——所以好感度在下面这些分支算完之后
		// 统一加在最后，不参与随机打散。写入方见 rest.js 里的 _gzGoodwill 系列全局
		// 规则技。
		var goodwill = this._gzGoodwill(from, to);
		if (from.storage.zhibi && from.storage.zhibi.includes(to)) {
			return att + goodwill;
		}
		var result;
		if (to.ai.shown >= 0.5) {
			result = att * to.ai.shown;
		} else {
			var nshown = 0;
			for (var i = 0; i < game.players.length; i++) {
				if (game.players[i] != from && game.players[i].identity == "unknown") {
					nshown++;
				}
			}
			if (to.ai.shown == 0) {
				if (nshown >= game.players.length / 2 && att >= 0) {
					result = 0;
				} else {
					result = Math.min(0, Math.random() - 0.5) + difficulty;
				}
			} else if (to.ai.shown >= 0.2) {
				if (att > 2) {
					result = Math.max(0, Math.random() - 0.5) + difficulty;
				} else if (att >= 0) {
					result = 0;
				} else {
					result = Math.min(0, Math.random() - 0.7) + difficulty;
				}
			} else if (att > 2) {
				result = Math.max(0, Math.random() - 0.7) + difficulty;
			} else if (att >= 0) {
				result = Math.min(0, Math.random() - 0.3) + difficulty;
			} else {
				result = Math.min(0, Math.random() - 0.5) + difficulty;
			}
		}
		return result + goodwill;
	}

	/**
	 * 读取"从 from 的视角看，to 攒下来的好感度"——伤害/弃牌/摸牌/回血这类实际发生过、
	 * 公开可见的行为，由 rest.js 里的 _gzGoodwill 系列全局规则技负责记录和写入
	 * （存在 from.storage.gzGoodwill[to.playerid] 里），这里只是单纯读出来。
	 *
	 * @param {Player} from
	 * @param {Player} to
	 * @returns {number}
	 */
	_gzGoodwill(from, to) {
		var map = from.storage.gzGoodwill;
		if (!map) {
			return 0;
		}
		var value = map[to.playerid];
		return typeof value == "number" ? value : 0;
	}
}
