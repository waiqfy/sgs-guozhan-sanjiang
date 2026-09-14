window.noname_package = {
	// gz3: 所有官方武将包已删除，homebrew为唯一武将包。homebrew的技能实现完全自包含
	// （不再依赖任何官方包的skill.js），仅有的例外是法正的眩惑/恩怨，直接引用
	// mode/guozhan模式本体自带的gzxuanhuo/gzenyuan——这是模式规则的一部分，永远存在，
	// 不受武将包增删影响。
	character: {
		homebrew: "自制武将",
	},
	card: {
		// gz3 lite: guozhan.js只是在standard.js基础上追加国战专属卡牌（如"诏书"），
		// 杀/闪/桃等基础卡牌定义在standard.js里，不能只留guozhan不留standard，
		// 否则lib.card里没有这些基础卡牌定义，牌堆里对应的牌会被静默跳过不生成。
		standard: "标准",
		// gz3 lite: lib.config.cards默认启用standard+extra，
		// 引擎里像白银/铁索/酒/藤甲/兵粮/木牛/火攻/朱雀等牌是extra.js里定义的，
		// 不加进available列表(package.js)的话即使默认启用也不会被导入。
		extra: "军争",
		guozhan: "国战",
	},
	// gz3 lite: 不需要boss/牌堆补充/富甲天下这些额外玩法扩展
	play: {},
	mode: {
		guozhan: "国战",
		connect: "联机",
	},
	submode: {
		guozhan: {
			normal: "国战模式",
			mingjiang: "明将国战",
		},
	},
	background: {
		ol_bg: "龙纹",
		planetarian_bg: "星梦",
		heaven_bg: "红烧",
		kyoani_bg: "京都",
		key_bg: "键社",
		xiaowu_bg: "小无",
		noname_bg: "璀璨",
		wuming_bg: "无名",
		zhulin_bg: "竹林",
		shengshi_bg: "盛世",
		taoyuan_bg: "桃园",
		zhanhuo_bg: "战火",
		huangtian_bg: "黄天",
		september_bg: "九月",
		yinxiang_bg: "印象",
		zhanyun_bg: "战云",
		beipan_bg: "背叛",
		lanting_bg: "兰亭",
		lingju_bg: "灵雎",
		sanying_bg: "三英",
		wangshi_bg: "往事",
		xiongxin_bg: "雄心",
		xinsha_bg: "新杀",
	},
	music: {
		music_phliosophy: "Philosophy of ours",
		music_diaochan: "貂蝉",
		music_shezhan: "舌战群儒",
		music_danji: "千里走单骑",
		music_jifeng: "祭风",
		music_jilve: "极略",
		effect_caomaoBJM: "向死存魏",
		effect_yinzhanBGM: "势魏延饮战",
		effect_tuishouBGM: "势魏延退守",
	},
	font: {
		xiaozhuan: "方正小篆体",
		xinwei: "华文新魏_GBK",
		huangcao: "方正黄草_GBK",
		yuanli: "方正北魏楷书_GBK",
		xingkai: "方正行楷_GBK",
		shousha: "方正隶变_GBK",
	},
	theme: {
		woodden: "木纹",
		music: "音乐",
		simple: "简约",
	},
};
