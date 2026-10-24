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
		if (["xunyou", "lvfan", "liubei"].includes(name2)) {
			return true;
		}
		if (name1 == "re_xushu") {
			return true;
		}
		if (name2 == "dengai") {
			return lib.character[name1][2] % 2 == 1;
		}
		if (["sunce", "jiangwei"].includes(name1)) {
			return name2 == "zhoutai" || lib.character[name2][2] % 2 == 1;
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
	 * 获取武将的国战定位（防御/爆发/过牌），跟 guozhanRank（强弱）是两套独立的表，
	 * 数据来自 info/type.js。没被收录的武将统一算 "mixed"（不偏不倚，不影响判断）。
	 *
	 * @param {string} name
	 * @returns {"fangyu"|"baofa"|"guopai"|"mixed"}
	 */
	guozhanType(name) {
		for (var i in lib.guozhanType) {
			if (lib.guozhanType[i].includes(name)) {
				return i;
			}
		}
		return "mixed";
	}

	/**
	 * 根据武将定位调整"要不要冒险明置组队"的意愿：过牌型更该藏着攒资源，
	 * 爆发型更值得为了一个机会去搏一把，防御型略保守，mixed/没分类的不受影响。
	 * 用法：把原来写死的随机阈值（比如 0.05）乘上这个系数。
	 *
	 * @param {string} name
	 * @returns {number}
	 */
	revealBias(name) {
		var t = get.guozhanType(name);
		if (t == "guopai") return 0.5;
		if (t == "baofa") return 1.5;
		if (t == "fangyu") return 0.8;
		return 1;
	}

	/**
	 * 势力判断专用的"公开身份"：已明置的是他亮出来的势力，未明置的就是 "unknown"，
	 * 不再去读暗置者的主将势力（见下面函数体里的说明）。
	 *
	 * @param {Player} player
	 * @returns {string}
	 */
	_gzIdentity(player) {
		// gz3: 只用公开信息，跟真人当面玩一样：已明置的看他亮出来的势力；没明置的就是
		// "unknown"，不能去读他暗着的主将/副将是哪个势力（原版这里会读主将势力，等于
		// AI 能看见别人的暗将牌）。自己的暗将是自己的信息，由调用方单独用 _gzPossibleGroups(自己)。
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
	 * from 通过【知己知彼】亲眼看过的、to 暗着的将牌所属势力（不含野心家）。没看过、或者
	 * to 已经明置，返回空数组。这是 from 合法得到的信息，不是偷看。
	 *
	 * @param {Player} from
	 * @param {Player} to
	 * @returns {string[]}
	 */
	_gzKnownGroups(from, to) {
		if (to.identity != "unknown") {
			return [];
		}
		var seen = from.storage.zhibi_seen && from.storage.zhibi_seen[to.playerid];
		if (!seen) {
			return [];
		}
		return seen.filter(function (g) {
			return g != "ye";
		});
	}

	/**
	 * 自己出手帮过（救人/给牌/回血）、还没亮将、且候选势力里有 group 的潜在队友人数。
	 * 亮将选主将还是副将时要算进这个势力的"队友数"，不然会出现救了人、转头亮另一个
	 * 势力反手去打对方。记录见 rest.js 的 _gzGoodwillCard。
	 *
	 * @param {Player} player
	 * @param {string} group
	 * @returns {number}
	 */
	_gzFavoredAllies(player, group) {
		// gz3: 原来这里用 _gzPossibleGroups(别人) 偷看暗置者真实势力来数"潜在队友"，是开天眼，
		// 已停用，恒返回 0。保留函数是因为 rest.js 里有几处调用。
		return 0;
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
		// gz3: 只用公开信息。"同势力就是队友"这类判断在 _gzRawAttitudeInner 里已经按
		// "双方公开身份相同"或"对方亮出的势力跟我自己任意一张暗将的势力相同(主副一样权重)"
		// 处理过了，走到这里说明没有这种明确关系，直接按公开的势力体量格局打分。
		// 原来这里按"to 暗着的主将势力"和"from 候选势力的概率"做插值，读的是别人暗将，已删除。
		var core = this._gzRealAttitudeCore(from, to, difficulty, toidentity, null);
		if (to.identity != "unknown") {
			return core;
		}
		// 对方还暗着：真人没法知道他是哪国，只能猜——还有名额的势力里，他落进跟我同一个
		// 势力的概率有多大，就在"当敌人"(core)和"当队友"之间按这个概率插值。
		var chance = this._gzFriendChance(from);
		if (chance <= 0) {
			return core;
		}
		return core + (4 + difficulty - core) * chance;
	}

	/**
	 * 一个还没亮的陌生人，最终跟 from 是同一势力的概率——只用公开信息（各势力现在的人数、
	 * 名额上限）去猜：每个还有名额的势力，按剩余名额数当权重，假设他落进哪个势力是
	 * "按剩余名额成比例"的。from 自己还暗着时，自己任意一张将牌的势力都算"我的势力"（主副
	 * 权重一样）；已亮时就是自己亮出的势力，这个势力已经满员则概率为 0。
	 *
	 * @param {Player} from
	 * @returns {number} 0~1
	 */
	_gzFriendChance(from) {
		var mine = from.identity == "unknown" ? this._gzPossibleGroups(from) : [from.identity];
		mine = mine.filter(function (g) {
			return g != "ye" && g != "unknown";
		});
		if (!mine.length) {
			return 0;
		}
		var maxPlayer = get.population() / 2;
		var groups = ["wei", "shu", "wu", "qun"];
		for (var i = 0; i < game.players.length; i++) {
			var id = game.players[i].identity;
			if (id != "unknown" && id != "ye" && !groups.includes(id)) {
				groups.push(id);
			}
		}
		for (var j = 0; j < mine.length; j++) {
			if (!groups.includes(mine[j])) {
				groups.push(mine[j]);
			}
		}
		var banned = _status.bannedGroup ? _status.bannedGroup.slice(6) : null;
		var total = 0,
			mineWeight = 0;
		for (var k = 0; k < groups.length; k++) {
			var g = groups[k];
			if (g == banned) {
				continue;
			}
			var room = maxPlayer - get.totalPopulation(g);
			if (room <= 0) {
				continue;
			}
			total += room;
			if (mine.includes(g)) {
				mineWeight += room;
			}
		}
		return total > 0 ? Math.min(1, mineWeight / total) : 0;
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
			// gz3: 只有某张将牌已经明置，才能把它的强度算进体量——只亮了副将的人，暗着的
			// 主将强度别人是不知道的。
			if (!p.isUnseen(0)) {
				power += get.guozhanRank(p.name1, p) / 4;
			}
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

		if (to.identity != "unknown" && to.hasSkillTag && to.hasSkillTag("maixie", true)) {
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
		// gz3: 用【知己知彼】等亲眼看过 to 暗将牌的情况——这是 from 正当得到的信息（真人看过
		// 也会记住）。看过的将牌里只要有一张的势力对得上，就按潜在队友处理，看的是主将还是
		// 副将、对得上自己的哪张牌都一样权重。from 已亮时还要看 to 亮这个势力还有没有名额。
		var knownGroups = this._gzKnownGroups(from, to);
		if (knownGroups.length) {
			if (from.identity == "unknown") {
				var ownGroups = this._gzPossibleGroups(from);
				if (knownGroups.some(function (g) { return ownGroups.includes(g); })) {
					return 4 + difficulty;
				}
			} else if (from.identity != "ye" && knownGroups.includes(from.identity) && to.wontYe(from.identity)) {
				return 4 + difficulty;
			}
		}
		// gz3: 这里原来有两条"to 还没亮时，偷看 to 真实主副将的势力来判断是不是队友"的
		// 分支（from 已亮/to 暗；from 暗/to 也暗），相当于 AI 开天眼——别人暗着的将牌
		// 本来是看不到的。已经删掉。from 自己的候选势力是自己的信息，可以用（上面那条
		// 保留）；对暗置的别人只能靠公开信息和行为（好感度）推断，走下面的常规判断。
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
