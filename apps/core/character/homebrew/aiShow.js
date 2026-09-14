import { lib, game, ui, get, ai, _status } from "noname";

/**
 * gz3: 国战里，暗置的主/副将只要"决定要用"一个属于它的技能，紧跟着就会自动亮出来
 * （见 noname/library/element/player.js 的 checkShow/logSkill，这一步是引擎自带的、
 * 无条件的，不需要也不应该改）。但"要不要冒险用这个技能"这个决策，原版压根没有
 * "我还暗着，值不值得因此暴露"这个概念——663个技能各自的filter/cost互相独立，
 * 跟暗置状态毫无关联。
 *
 * 这个文件是这块的"大脑"：每个技能挂一个粗分类标签（aiShowTag，见下面
 * AiShowTag），标签只影响AI自己的自动决策，不影响人类玩家手动选择（人类想不想
 * 冒险暴露自己，应该由人类自己判断，不应该被这层逻辑拿掉选项）。
 *
 * 用法：在 skill.js 的具体某个技能上，如果需要针对"进攻/防御分支"这种同一个
 * 技能里混着两种用途的情况（比如"龙胆"类：用杀当闪是防御，用闪当杀是进攻），
 * 不要只给 aiShowTag 一个固定值——额外提供 aiShowClassify(event, player)，
 * 让这个技能自己根据当前是哪个分支返回对应的标签，applyAiShowGates 会优先用它。
 *
 * 具体规则（第一版，都是拍脑袋定的粗略权重，以后打牌测试的时候再慢慢调）：
 * - response（响应别人使用/打出的牌，比如"龙胆"用杀当闪那一半）：恒定放行。
 * - defense（自己受到伤害/效果之后触发的保命向技能）：恒定放行。
 * - aoe（群体技能）：放行。
 * - draw（摸牌类为主的技能）：放行。
 * - offense（专门针对单个目标造成伤害/削弱的技能）：默认压制，除非
 *   目标已经明置（伤害一个暗将没意义，伤害一个明置的敌人才值得冒险），
 *   或者这个技能同时还标了 draw（摸牌收益大，愿意冒险）。
 * - control/support/recover：默认放行（这几类不涉及"暴露了才有意义打人"的
 *   进攻性顾虑，先按"愿意用"处理，具体要不要收紧以后再看）。
 * - aiShowCost为true的技能（需要弃牌/其他代价才能发动）：手牌数<4才愿意冒险，
 *   否则压制（不管前面分类结果如何，这条数量线单独生效，是所有类型之上的
 *   一层额外约束）。
 *
 * 如果场上已经有人亮出来了，暗置的AI在权衡"进攻类"技能时，优先偏向能让自己
 * 跟"已经亮出的人里人数最多的那个势力"趋同的时机（抱团），具体在 groupBias
 * 里体现——这条目前只是个方向性加分，不是硬性门槛。
 */

/** @typedef {"response"|"defense"|"aoe"|"draw"|"offense"|"control"|"support"|"recover"} AiShowTag */

/**
 * @param {import("noname").Player} player
 * @param {AiShowTag} tag
 * @param {{ target?: import("noname").Player, hasCost?: boolean }} [opts]
 * @returns {boolean}
 */
export function shouldRiskShow(player, tag, opts = {}) {
	if (opts.hasCost && player.countCards("h") >= 4) {
		return false;
	}
	switch (tag) {
		case "response":
		case "defense":
		case "aoe":
		case "draw":
		case "control":
		case "support":
		case "recover":
			return true;
		case "offense": {
			if (opts.target) {
				// 已经知道具体目标（触发型技能，event/trigger里带target）：
				// 目标已明置才值得冒险，目标还是暗将没意义。
				return !opts.target.isUnseen(0);
			}
			// 主动技能在filter阶段还不知道具体选谁当目标（选目标在filter之后），
			// 退而求其次：场上有没有已经明置的敌人可以打，完全没有就别冒险。
			return game.players.some(p => p != player && !p.isFriendOf(player) && !p.isUnseen(0));
		}
		default:
			return true;
	}
}

/**
 * 抱团方向性判断：暗置角色的势力，跟"已经明置的人里数量最多的势力"是否一致。
 * 只用来在多个可选目标/时机里做倾向性加分，不是放行/压制的硬门槛。
 *
 * @param {import("noname").Player} player
 * @returns {boolean}
 */
export function favorsGroupBias(player) {
	const revealed = game.players.filter(p => p != player && !p.isUnseen(0));
	if (!revealed.length) {
		return true;
	}
	/** @type {Record<string, number>} */
	const count = {};
	for (const p of revealed) {
		const group = p.getGuozhanGroup ? p.getGuozhanGroup(0) : lib.character[p.name1]?.[1];
		if (group) {
			count[group] = (count[group] || 0) + 1;
		}
	}
	let majorGroup = null,
		majorCount = 0;
	for (const group in count) {
		if (count[group] > majorCount) {
			majorGroup = group;
			majorCount = count[group];
		}
	}
	if (!majorGroup) {
		return true;
	}
	const myGroup = player.getGuozhanGroup ? player.getGuozhanGroup(player.isUnseen(0) ? 1 : 0) : null;
	return myGroup == majorGroup;
}

/**
 * 只影响AI自己的自动决策（通过player != game.me识别AI控制的座位——联机模式下
 * 每个人都控制自己的座位，这条判断天然不生效，不会影响联机对局），完全不改变
 * 人类玩家能看到/能手动选择的选项。
 *
 * 覆盖两类技能：
 * - 触发技（有trigger且非forced）：包一层filter。
 * - 主动技（有enable，比如武圣这种把牌当【杀】用的viewAs技能，或者义绝这种
 *   出牌阶段可以主动发动的技能）：优先包viewAsFilter（管"能不能把手上的牌
 *   当这张牌用"），再包filter（管"这个技能本身能不能用"），两个都没有就
 *   补一个filter上去（没有filter等于原本无条件可用，补一个不会改变原有行为，
 *   只是加了我们这一层判断）。
 *
 * 主动技能在filter阶段通常还不知道具体选中的目标（选目标在filter判断"能不能用
 * 这个技能"之后），所以offense标签在这种情况下退化成"场上有没有已明置的敌人"
 * 这个更粗糙的判断，见shouldRiskShow。
 *
 * 在skill.js的skill字典构造完之后调用一次即可。
 *
 * @param {Record<string, any>} skillDict
 */
export function applyAiShowGates(skillDict) {
	for (const name in skillDict) {
		const info = skillDict[name];
		if (!info || typeof info != "object") {
			continue;
		}
		if (!info.aiShowTag && !info.aiShowClassify) {
			continue;
		}

		const gate = (player, event) => {
			if (player == game.me) {
				// 人类玩家：这层判断完全不生效，选项照常出现，暴不暴露自己人类自己决定。
				return true;
			}
			if (!player.isUnseen || (!player.isUnseen(0) && !player.isUnseen(1))) {
				// 已经全部明置了，不涉及"要不要冒险暴露"这件事。
				return true;
			}
			const tag = info.aiShowClassify ? info.aiShowClassify(event, player) : info.aiShowTag;
			return shouldRiskShow(player, tag, {
				target: event?.target,
				hasCost: !!info.aiShowCost,
			});
		};

		if (info.trigger) {
			if (info.forced) {
				// forced触发技没有选择余地，会无条件触发并亮将，这层判断加了也没用。
				continue;
			}
			const originalFilter = info.filter;
			info.filter = function (event, player, ...rest) {
				if (originalFilter && !originalFilter.call(this, event, player, ...rest)) {
					return false;
				}
				return gate(player, event);
			};
		} else if (info.enable) {
			if (typeof info.viewAsFilter == "function") {
				const originalViewAsFilter = info.viewAsFilter;
				info.viewAsFilter = function (player, ...rest) {
					const result = originalViewAsFilter.call(this, player, ...rest);
					if (!result) {
						return result;
					}
					return gate(player) ? result : false;
				};
			}
			const originalFilter = info.filter;
			info.filter = function (event, player, ...rest) {
				if (originalFilter && !originalFilter.call(this, event, player, ...rest)) {
					return false;
				}
				return gate(player, event);
			};
		}
	}
}
