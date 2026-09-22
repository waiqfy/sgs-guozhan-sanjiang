import { lib, game, _status } from "noname";

const STORAGE_KEY = "gz3_ai_battle_log";
const ERROR_STORAGE_KEY = "gz3_ai_error_log";
const HEARTBEAT_KEY = "gz3_ai_heartbeat";
// localStorage 容量有限，超过这个条数就只保留最近的记录，避免写爆
const MAX_RECORDS = 5000;
const MAX_ERRORS = 300;
const HEARTBEAT_INTERVAL = 3000;

/**
 * 记录一局国战 AI 对局的结果（仅在快速自动测试模式下调用）
 *
 * @param {any} winner - 获胜方代表玩家（`checkResult`里解析出的`game.playerMap[game.winner_id]`）
 */
export function recordGuozhanResult(winner) {
	try {
		// @ts-expect-error 祖宗之法就是这么写的
		const roster = game.players.concat(game.dead, game.additionaldead || []);
		const record = {
			time: Date.now(),
			winGroup: winner ? winner.getGuozhanGroup(0) : null,
			players: roster.map(player => ({
				name1: player.name1,
				name2: player.name2,
				group: player.getGuozhanGroup(0),
				// @ts-expect-error 祖宗之法就是这么写的
				dead: game.dead.includes(player),
			})),
		};
		appendRecord(record);
	} catch (e) {
		console.error("[gz3BattleLog] 记录对局结果失败", e);
	}
}

/**
 * @param {object} record
 */
function appendRecord(record) {
	const list = readAll();
	list.push(record);
	if (list.length > MAX_RECORDS) {
		list.splice(0, list.length - MAX_RECORDS);
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * @returns {any[]}
 */
function readAll() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch (e) {
		return [];
	}
}

/**
 * @returns {any[]}
 */
function readAllErrors() {
	try {
		const raw = localStorage.getItem(ERROR_STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch (e) {
		return [];
	}
}

/**
 * 崩溃时把当前在场的武将一并记下来，方便定位是谁的技能出的问题
 */
function currentRoster() {
	try {
		// @ts-expect-error 祖宗之法就是这么写的
		return game.players.map(player => ({ name1: player.name1, name2: player.name2 }));
	} catch (e) {
		return null;
	}
}

/**
 * @param {string} message
 * @param {string} [stack]
 */
function appendError(message, stack) {
	try {
		const list = readAllErrors();
		list.push({
			time: Date.now(),
			mode: lib?.config?.mode,
			message,
			stack,
			roster: currentRoster(),
		});
		if (list.length > MAX_ERRORS) {
			list.splice(0, list.length - MAX_ERRORS);
		}
		localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(list));
	} catch (e) {
		// localStorage 写入本身失败就没办法了，避免在错误处理里再抛错
	}
}

// 仅在快速自动测试模式下挂监听，避免干扰正常游戏时的报错处理逻辑
if (typeof window !== "undefined") {
	window.addEventListener("error", event => {
		if (!lib?.config?.test_game) {
			return;
		}
		appendError(event.message, event.error?.stack);
	});
	window.addEventListener("unhandledrejection", event => {
		if (!lib?.config?.test_game) {
			return;
		}
		const reason = event.reason;
		appendError(reason?.message ?? String(reason), reason?.stack);
	});

	// 心跳：每隔几秒记录一次"当前这局在场的武将"，用来兜底真正卡死、
	// 连 error 事件都没触发的情况——刷新后至少能看到卡在哪一局、卡了多久
	setInterval(() => {
		if (!lib?.config?.test_game) {
			return;
		}
		const roster = currentRoster();
		if (!roster) {
			return;
		}
		try {
			localStorage.setItem(HEARTBEAT_KEY, JSON.stringify({ time: Date.now(), roster }));
		} catch (e) {
			// 忽略写入失败
		}
	}, HEARTBEAT_INTERVAL);
}

/**
 * @returns {{ time: number, roster: any[] } | null}
 */
function readHeartbeat() {
	try {
		const raw = localStorage.getItem(HEARTBEAT_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch (e) {
		return null;
	}
}

/**
 * 挂到 window 上，方便在控制台里查看/导出/清空对局记录
 * - gz3BattleLog.list() 查看全部原始记录
 * - gz3BattleLog.summary() 按“武将+主副将位”统计出场次数与胜率
 * - gz3BattleLog.exportJSON() 生成可复制的 JSON 字符串
 * - gz3BattleLog.clear() 清空记录
 * - gz3BattleLog.errors() 查看自动测试模式下捕获到的报错（含崩溃时在场的武将）
 * - gz3BattleLog.errorsJSON() 导出报错记录
 * - gz3BattleLog.clearErrors() 清空报错记录
 * - gz3BattleLog.heartbeat() 查看最近一次心跳（卡死没报错时用来看卡在哪一局、卡了多久）
 */
if (typeof window !== "undefined") {
	window.gz3BattleLog = {
		list: readAll,
		clear() {
			localStorage.removeItem(STORAGE_KEY);
		},
		exportJSON() {
			return JSON.stringify(readAll());
		},
		errors: readAllErrors,
		clearErrors() {
			localStorage.removeItem(ERROR_STORAGE_KEY);
		},
		errorsJSON() {
			return JSON.stringify(readAllErrors());
		},
		heartbeat() {
			const beat = readHeartbeat();
			if (!beat) {
				return beat;
			}
			return { ...beat, secondsAgo: Math.round((Date.now() - beat.time) / 1000) };
		},
		summary() {
			const stat = {};
			for (const record of readAll()) {
				for (const player of record.players) {
					for (const key of [player.name1, player.name2].filter(Boolean)) {
						if (!stat[key]) {
							stat[key] = { appear: 0, win: 0 };
						}
						stat[key].appear++;
						if (record.winGroup && player.group === record.winGroup) {
							stat[key].win++;
						}
					}
				}
			}
			return Object.fromEntries(
				Object.entries(stat)
					.map(([name, { appear, win }]) => [name, { appear, win, winRate: +(win / appear).toFixed(3) }])
					.sort((a, b) => b[1].appear - a[1].appear)
			);
		},
	};
}
