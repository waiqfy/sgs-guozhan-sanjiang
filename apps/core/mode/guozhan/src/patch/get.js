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
		var strengthOf = function (players) {
			return players.reduce(function (sum, p) {
				return sum + Math.max(0.5, p.hp);
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
		if (from.identity == "unknown" && from.wontYe()) {
			from_p = get.population(fid);
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
		var fid = this._gzIdentity(from),
			tid = this._gzIdentity(to);
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
		if (from.identity == "unknown" && fid == to.identity) {
			if (from.wontYe()) {
				return 4 + difficulty;
			}
		}
		// gz3: 双方都暗置，但各自的真实势力（fid/tid，不是猜测）本来就相同时，不能只把
		// 它当成"猜出来的队友"按 realAttitude 里的概率插值处理——那套插值后面还会被
		// to.ai.shown（对方看起来像不像已知身份）进一步按 Math.random() 打散，导致
		// 明明是真队友，AI 还是会去打，等打完才明置发现打了自己人。这里跟上面"对方已
		// 明置"的分支对齐，真身份确定相同且双方都不会被挤成野心家时，直接判定为队友。
		if (from.identity == "unknown" && to.identity == "unknown" && fid == tid && tid != "ye" && from.wontYe() && to.wontYe()) {
			return 4 + difficulty;
		}
		var att = get.realAttitude(from, to, difficulty, tid);
		if (from.storage.zhibi && from.storage.zhibi.includes(to)) {
			return att;
		}
		if (to.ai.shown >= 0.5) {
			return att * to.ai.shown;
		}

		var nshown = 0;
		for (var i = 0; i < game.players.length; i++) {
			if (game.players[i] != from && game.players[i].identity == "unknown") {
				nshown++;
			}
		}
		if (to.ai.shown == 0) {
			if (nshown >= game.players.length / 2 && att >= 0) {
				return 0;
			}
			return Math.min(0, Math.random() - 0.5) + difficulty;
		}
		if (to.ai.shown >= 0.2) {
			if (att > 2) {
				return Math.max(0, Math.random() - 0.5) + difficulty;
			}
			if (att >= 0) {
				return 0;
			}
			return Math.min(0, Math.random() - 0.7) + difficulty;
		}
		if (att > 2) {
			return Math.max(0, Math.random() - 0.7) + difficulty;
		}
		if (att >= 0) {
			return Math.min(0, Math.random() - 0.3) + difficulty;
		}
		return Math.min(0, Math.random() - 0.5) + difficulty;
	}
}
