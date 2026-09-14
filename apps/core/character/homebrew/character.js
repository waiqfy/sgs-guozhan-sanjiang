// homebrew: 自制/魔改武将包。这里的武将用跟官方同样的id直接覆盖官方定义
// （靠package.js/characters列表里homebrew排在被覆盖的官方包之后生效），
// 技能名字沿用官方版本，但数值/判定条件按自己的卡牌重新设计。
export default {
	zhangxingcai: {
		sex: "female",
		group: "shu",
		hp: 3,
		skills: ["shenxian", "qiangwu"],
	},

	// 张苞（原型：sixiang 包 std_zhangbao，"标张苞"——同名同技能的重铸版，直接沿用其id/技能id）
	std_zhangbao: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["stdjuezhu", "stdchengji"],
	},
	// 刘琦（原型：sp2 包 sp_liuqi）。原势力为群，本批次统一按 shu 处理。
	sp_liuqi: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["rewenji", "sptunjiang"],
	},
	// 彭羕（原型：sp 包 ol_pengyang，"彭羕"）
	ol_pengyang: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["tongling", "jinxian"],
	},
	// 夏侯霸（原型：sp 包 xiahouba）
	xiahouba: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["baolie"],
	},
	// 傅士仁：未找到以此为名的官方角色（仅有"糜芳傅士仁"合体卡），视为全新角色。
	hb_fushiren: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["fengshi"],
	},
	// 刘备
	liubei: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["rende", "zhenqiao"],
		isZhugong: true,
	},
	// 关羽
	guanyu: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["wuhun", "wusheng", "yijue"],
	},
	// 张飞
	zhangfei: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["paoxiao"],
	},
	// 诸葛亮
	zhugeliang: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["wentian", "kongcheng"],
	},
	// 赵云
	zhaoyun: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["longdan", "chongzhen"],
	},

	machao: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["mashu", "zhuiming"],
	},
	huangyueying: {
		sex: "female",
		group: "shu",
		hp: 3,
		skills: ["jizhi", "qicai"],
	},
	re_huangzhong: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["xinliegong", "cuifeng"],
	},
	re_weiyan: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["xinkuanggu", "wusi"],
	},
	pangtong: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["lianhuan", "oldniepan"],
	},
	jiangwei: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["tiaoxin", "yizhi"],
	},
	liushan: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["fangquan", "xiangle"],
		isZhugong: true,
	},
	menghuo: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["huoshou", "zaiqixx"],
		isZhugong: true,
	},
	zhurong: {
		sex: "female",
		group: "shu",
		hp: 4,
		skills: ["juxiang", "lieren"],
	},
	ganfuren: {
		sex: "female",
		group: "shu",
		hp: 3,
		skills: ["shenzhi", "stdshushen"],
		names: "甘|null",
	},

	// 国战UI.SHU017 持节不语 徐庶 —— 对应"一将成名"包的 xin_xushu（技能名"无言/举荐"与本地一致）
	xin_xushu: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["xinwuyan", "xinjujian"],
	},
	// 国战UI.SHU018 群策谋策 蒋琬&费祎 —— 未找到同名官方合体武将（仅有蒋琬/费祎的单独或组合语音提示），视为全新合体武将
	hb_jiangwanfeiyi: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["shengxi", "shoucheng"],
		names: "蒋|琬-费|祎",
	},
	// 国战UI.SHU019 平北将军 马岱 —— 对应"一将成名"包的 old_madai（技能名"潜袭/马术"与本地一致）
	old_madai: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["qianxi", "mashu"],
	},
	// 国战UI.SHU020 骁勇金衔 沙摩柯 —— 对应SP包的 shamoke（技能名"蒺藜"与本地gzjili一致）
	shamoke: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["gzjili"],
	},
	// 国战UI.SHU021 乱世沉香 糜夫人 —— 对应SP包的 mifuren（标题"乱世沉香"、技能名"闺秀/存嗣"与本地一致）
	mifuren: {
		sex: "female",
		group: "shu",
		hp: 3,
		skills: ["guixiu", "cunsi"],
	},
	// 国战UI.SHU022 军略才器 马谡 —— 对应"一将成名"包的 xin_masu（技能名"散谣/制蛮"与本地olsanyao/rezhiman一致）
	xin_masu: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["olsanyao", "zhiman"],
	},
	// 国战UI.SHU023 镇北柱国 王平 —— 对应神话再临包的 wangping（技能"将略"为全新技能，与原技能无关）
	wangping: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["jianglve"],
	},
	// 国战UI.SHU024 陈筹画策 法正 —— 对应"一将成名"包的 xin_fazheng（技能名"眩惑/恩怨"与本地一致）
	xin_fazheng: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["fzxuanhuo", "fzenyuan"],
	},
	// 国战UI.SHU026A 同心并力 关兴 —— 官方均为"关兴张苞"合体武将，无单独关兴，视为全新单人武将
	hb_guanxing: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["wuyou", "qinglong"],
	},
	// 国战UI.SHU027 御敌屏障 廖化 —— 对应"一将成名"包的 liaohua（技能"争先"为全新技能，替换原技能）
	liaohua: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["zhengxian"],
	},

	guanping: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["longyin"],
	},
	jianyong: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["qiaoshui", "jyzongshi"],
	},
	// 寇封：官方无同名武将，全新设计
	hb_koufeng: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["huaibing"],
	},
	wuyi: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["olbenxi", "zhuanzheng"],
	},
	zhangsong: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["qiangzhi", "xiantu"],
	},
	zhoucang: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["xinzhongyong"],
	},
	liuchen: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["zhanjue", "qinwang"],
	},
	huanghao: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["huisheng", "cunwei"],
	},
	guanyinping: {
		sex: "female",
		group: "shu",
		hp: 3,
		skills: ["xueji", "huxiao"],
	},
	maliang: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["xiemu", "naman"],
	},

	mizhu: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["ziyuan", "jugu"],
	},
	dongyun: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["bingzheng", "sheyan"],
	},
	zhangyi: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["rezhiyi"],
	},
	dc_lifeng: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["liangcang", "dcshuliang"],
	},
	// 赵统&赵广：官方无同名（合体）武将，参考赵统/赵广二人共有的"翊赞"设计为全新合体武将
	hb_zhaotongguang: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["zj_yizan"],
		names: "赵|统-赵|广",
	},
	qinmi: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["zhuandui", "tianbian"],
	},
	yanyan: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["jujiang"],
	},
	chendao: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["dcwanglie"],
	},
	zhugezhan: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["xinfu_zuilun", "xinfu_fuyin"],
	},

	hb_meifang: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["hb_huoe", "hb_tanlin"],
	},
	re_dengzhi: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["jianliang", "weimeng"],
	},
	zongyu: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["zyqiao", "chengshang"],
	},
	dc_liuba: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["dctongdu", "dcguiyin"],
	},
	yangwan: {
		sex: "female",
		group: "shu",
		hp: 3,
		skills: ["youyan", "zhuihuan"],
	},
	yangyi: {
		sex: "male",
		group: "shu",
		hp: 3,
		skills: ["duzhan", "gongsun"],
	},
	longyufei: {
		sex: "female",
		group: "shu",
		hp: 3,
		skills: ["longyi", "zhenjue"],
	},
	pe_mengda: {
		sex: "male",
		group: "shu",
		hp: 4,
		skills: ["qiuan", "liangfan"],
	},

	// 郝昭（原型：shenhua包 haozhao。技能"镇骨"与原技能drlt_zhengu同名同效，沿用其id）
	haozhao: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["drlt_zhengu"],
	},
	// 司马昭（原型：mobile包 simazhao。技能"昭然/筹伐"与yingbian包jin_simazhao的zhaoran/xinchoufa同名同效，沿用技能id）
	simazhao: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["zhaoran", "xinchoufa"],
	},
	// 司马师（原型：mobile包 simashi。卡面技能名与原版技能不同，视为全新技能）
	simashi: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["yimie", "tairan"],
	},
	// 贾充（原型：huicui包 dc_jiachong。卡面技能名与原版技能不同，视为全新技能）
	dc_jiachong: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["xiongshu", "jianhui"],
	},
	// 夏侯惇（原型：standard包 xiahoudun。技能"刚烈"沿用其id但重新设计判定效果；"清俭"为全新技能）
	xiahoudun: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["ganglie", "qingjian"],
	},
	// 甄姬（原型：standard包 zhenji。技能"倾国/洛神"与原版同名同效，沿用其id；"神赋"为全新技能）
	zhenji: {
		sex: "female",
		group: "wei",
		hp: 3,
		skills: ["qingguo", "luoshen", "shenfu"],
	},
	// 夏侯渊（原型：old包 xiahouyuan。技能"神速"沿用其id；"设变"为全新技能）
	xiahouyuan: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["shensu", "shebian"],
	},
	// 张郃（原型：shenhua包 zhanghe。技能"巧变"沿用其id，效果基本一致）
	zhanghe: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["qiaobian"],
	},
	// 曹仁（原型：shenhua包 old_caoren。技能"据守"沿用其id但完全重新设计；"严整"为全新技能）
	old_caoren: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["jushou", "yanzheng"],
	},
	// 典韦（原型：shenhua包 dianwei。技能"强袭"沿用其id，改为对每名角色限一次）
	dianwei: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["qiangxix"],
	},

	// 国战UI.WEI013 驱虎吞狼 荀彧 —— 对应神话再临包的 xunyu（技能名"驱虎/节命"与本地一致）
	xunyu: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["quhu", "jieming"],
	},
	// 国战UI.WEI014 魏王称帝 曹丕 —— 对应神话再临包的 caopi（保留主公位；技能"行殒"与官方"行殇"(xingshang)非同字，视为新技能；"放逐"沿用同名技能id）
	caopi: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["xingyun", "fangzhu"],
		isZhugong: true,
	},
	// 国战UI.WEI015 五谷蕃盛 邓艾 —— 对应神话再临包的 dengai（技能名"屯田"与本地一致；"急袭"沿用同包 jixi 的技能名及"田"当【顺手牵羊】使用的设定）
	dengai: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["tuntian", "jixi"],
	},
	// 国战UI.WEI017 儒雅之风 李典 —— 对应标准包的 old_re_lidian（技能名"恂恂/忘隙"与本地一致）
	old_re_lidian: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["xunxun", "wangxi"],
	},
	// 国战UI.WEI018 奉令西迎 曹洪 —— 对应SP包的 caohong（技能"飞影"沿用标准包同名锁定技；"护援""鹤翼"为全新技能）
	caohong: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["huyuan", "heyi", "feiying"],
	},
	// 国战UI.WEI019 镇卫江夏 文聘 —— 对应SP包的 wenpin（技能名"镇卫"与本地一致）
	wenpin: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["zhenwei"],
	},
	// 国战UI.WEI020 扭转乾坤 荀攸 —— 对应"一将成名"包的 xunyou（技能名"奇策/智愚"与本地一致；"奇策"略去国战专属的"变更副将"效果，因本包不使用主副将机制）
	xunyou: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["qice", "zhiyu"],
	},
	// 国战UI.WEI021 直言劝谏 崔琰&毛玠 —— 对应"先登"(xianding)包的 cuimao（技能名"征辟/奉迎"与本地一致；"征辟"原效果涉及国战"未定势力"身份机制，本包改写为通用效果）
	cuimao: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["zhengbi", "fengying"],
		names: "崔|琰-毛|玠",
	},
	// 国战UI.WEI023 节度青徐 臧霸 —— 对应"绘萃"(huicui)包的 zangba（技能名"横江"沿用同角色技能id rehengjiang，效果按本卡重新设计）
	zangba: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["rehengjiang"],
	},
	// 国战UI.WEI024 驰援襄樊 于禁 —— 对应"一将成名"包的 yujin（技能名"节钺/毅重"沿用"旧版"(old)包 xin_yujin/re_yujin 二将各自的技能id jieyue/yizhong，合并为一将双技能）
	yujin: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["jieyue", "yizhong"],
	},

	// 牛金（原型：sp 包 niujin，"牛金"——同名同技能沿用其id/技能id）
	niujin: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["olcuorui", "liewei"],
	},
	// 张春华（原型：一将成名 包 zhangchunhua，技能名"绝情/伤逝"与本地一致）
	zhangchunhua: {
		sex: "female",
		group: "wei",
		hp: 3,
		skills: ["jueqing", "shangshi"],
	},
	// 王异（原型：一将成名 包 wangyi，技能名"贞烈/秘计"与本地一致）
	wangyi: {
		sex: "female",
		group: "wei",
		hp: 3,
		skills: ["zhenlie", "miji"],
	},
	// 曹冲（原型：一将成名 包 caochong，技能名"稱象/仁心"与本地一致）
	caochong: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["chengxiang", "renxin"],
	},
	// 郭淮（原型：一将成名 包 guohuai，技能名"精策"与本地一致）
	guohuai: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["rejingce"],
	},
	// 满宠（原型：一将成名 包 manchong，技能名"峻刑/御策"与本地一致）
	manchong: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["junxing", "yuce"],
	},
	// 曹真（原型：一将成名 包 caozhen，技能名"司敌"与本地一致，效果全新设计）
	caozhen: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["xinsidi"],
	},
	// 韩浩&史涣（原型：一将成名 包 hanhaoshihuan，技能名"慎断/勇略"与本地一致）
	hanhaoshihuan: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["shenduan", "yonglve"],
		names: "韩|浩-史|涣",
	},
	// 曹叡（原型：一将成名 包 caorui，技能名"恢拓/明鉴"与本地一致；卡面未展示主公技"兴衰"，故不沿用isZhugong）
	caorui: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["huituo", "mingjian"],
	},
	// 杨修（原型：sp 包 yangxiu，技能名"啖酪/鸡肋"与本地一致）
	yangxiu: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["danlao", "jilei"],
	},

	// 程昱（原型：sp包 chengyu。技能"设伏"沿用其id但重新设计；卡面第二技能"益兵"与原技能"贲育"不同名，视为全新技能）
	chengyu: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["shefu", "yibing"],
	},
	// 曹昂（原型：sp包 caoang。技能"慷愾"沿用其id"kaikang"（与原"慷忾"同音同义），改为同势力判定；"孝廉"为全新技能）
	caoang: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["kaikang", "xiaolian"],
	},
	// 诸葛诞（原型：sp包 zhugedan。技能"功獒""举义"沿用其id并重新设计；"威重"沿用原版"举义"觉醒后获得的同名技能id）
	zhugedan: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["gongao", "weizhong", "juyi"],
	},
	// 戏志才（原型：sp包 xizhicai。技能"天妒""先辅""筹策"均沿用其id，与卡面同名同效）
	xizhicai: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["tiandu", "xianfu", "chouce"],
	},
	// 王朗（原型：xianding包 wanglang，非ol_wanglang——译名"王朗"精确匹配。技能"鼓舌""激词"沿用其id regushe/rejici，重新设计效果）
	wanglang: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["regushe", "rejici"],
	},
	// 辛宪英（原型：yijiang包 xinxianying——与xianding包re_xinxianying、diy包ns_xinxianying同名"辛宪英"的候选中，
	// 技能名"忠鉴/才识"与yijiang版一致，选用其id。卡面技能效果均为全新设计）
	xinxianying: {
		sex: "female",
		group: "wei",
		hp: 3,
		skills: ["zhongjian", "caishi"],
	},
	// 毌丘俭（原型：shenhua包 guanqiujian。技能"征荣""鸿举"沿用其id，重新设计效果）
	guanqiujian: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["zhengrong", "hongju"],
	},
	// 鲁芝（原型：sp包 luzhi。技能"清忠""卫境"沿用其id，效果基本一致并按卡面微调）
	luzhi: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["qingzhong", "weijing"],
	},
	// 文鸯（原型：xianding包 wenyang——与diy包 diy_wenyang同名"文鸯"的候选中选用译名精简的一支。
	// 卡面仅一个全新技能"覆阵"，与jsrg包"兴文鸯"的同名技能jsrgfuzhen无关，另建id）
	wenyang: {
		sex: "male",
		group: "wei",
		hp: 5,
		skills: ["fuzhen"],
	},
	// 蒋干（原型：sp包 jianggan。技能"伪诚""盗书"沿用其id weicheng/daoshu，效果基本一致并按卡面微调）
	jianggan: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["weicheng", "daoshu"],
	},

	// 曹爽（原型：sp 包 caoshuang，"曹爽"——技能名"擅专/托孤"与本地一致，但均为全新触发方式）
	caoshuang: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["shanzhuan", "retuogu"],
	},
	// 华歆（原型：荟萃 包 huaxin，"华歆"——技能名"望归/息兵"与本地一致）
	huaxin: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["spwanggui", "xibing"],
	},
	// 田豫（原型：sp 包 tianyu，"田豫"——技能名"扫狄"与本地一致，未沿用"追讨"）
	tianyu: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["saodi"],
	},
	// 董昭（原型：荟萃 包 dc_dongzhao，"董昭"——技能"劝进/凿运"为全新设计，与原技能"移驾/定基"无关）
	dc_dongzhao: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["quanjin", "zaoyun"],
	},
	// 羊祜（原型：荟萃 包 dc_yanghu，"羊祜"——技能名"德劭/明伐"与本地一致）
	dc_yanghu: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["dcdeshao", "dcmingfa"],
	},
	// 曹髦（原型：轩辕 包 caomao，"曹髦"——技能名"决讨/潜龙/忿肆"与本地一致，未沿用主公技"助势"）
	caomao: {
		sex: "male",
		group: "wei",
		hp: 3,
		maxHp: 4,
		skills: ["juetao", "qianlong", "fensi"],
	},
	// 曹芳（原型：轩辕 包 caofang，"曹芳"——技能"诏图/惊惧"取自集换 包"合曹芳"jsrg_caofang 的同名技能，
	// 未沿用 caofang 自身的"置民/拒谏"）
	caofang: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["jsrgzhaotu", "jsrgjingju"],
	},
	// 司马懿（原型：标准 包 simayi，"司马懿"——技能名"反馈/鬼才"与本地一致）
	simayi: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["fankui", "guicai"],
	},

	// 曹操（原型：standard 包 caocao）
	caocao: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["jianxiong", "huibian"],
		isZhugong: true,
	},
	// 张辽（原型：standard 包 zhangliao，技能名"突袭"与官方一致，沿用其技能id）
	zhangliao: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["tuxi"],
	},
	// 许褚（原型：standard 包 xuzhu，技能名"裸衣"与官方一致，沿用其技能id）
	xuzhu: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["luoyi"],
	},
	// 郭嘉（原型：standard 包 guojia，技能名"天妒/遗计"与官方一致，沿用其技能id）
	guojia: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["gjtiandu", "yiji"],
	},
	// 徐晃（原型：shenhua 包 re_xuhuang，技能"治严"为全新设计，替换原技能）
	re_xuhuang: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["zhiyan"],
	},
	// 乐进（原型：sp 包 yuejin，技能名"骁果"与官方一致，沿用其技能id）
	yuejin: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["xiaoguo"],
	},
	// 卞夫人（原型：sp 包 ol_bianfuren；"约俭"与官方一致沿用id，"挽危"为新名新技能）
	ol_bianfuren: {
		sex: "female",
		group: "wei",
		hp: 3,
		skills: ["wanwei", "yuejian"],
		names: "卞|null",
	},
	// 曹植（原型：yijiang 包 caozhi；两个技能均为新名，全新设计）
	caozhi: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["shijiu", "zongjiang"],
	},
	// 钟会（原型：yijiang 包 zhonghui；"权计"与官方一致沿用id，"排异""邀叛"为新技能，
	// 卡面为三技能设计，"邀叛"含国战"副将易位"机制，已用 transCharacter 实现：指定的同势力
	// 角色可与钟会交换"邀叛"所在的武将牌，之后控制该牌的角色获得"权"并执行额外出牌阶段）
	zhonghui: {
		sex: "male",
		group: "wei",
		hp: 4,
		skills: ["quanji", "paiyi", "yaopan"],
	},
	// 王基（原型：shenhua 包 wangji，技能名"奇制/进趋"与官方一致，沿用其技能id）
	wangji: {
		sex: "male",
		group: "wei",
		hp: 3,
		skills: ["qizhi", "jinqu"],
	},

	dingfeng: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["reduanbing", "refenxun"],
	},
	lvfan: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["diaodu", "diancai"],
	},
	jin_zhouchu: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["xiongxia"],
	},
	panjun: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["congcha", "xinfu_gongqing"],
	},
	sunquan: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["zhiheng", "jiahe"],
	},
	luxun: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["qianxun", "lxdushi"],
	},
	ganning: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["qixi", "gnfenwei"],
	},
	lvmeng: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["keji", "duojing"],
	},
	huanggai: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["kurou", "hgzhaxiang"],
	},
	zhouyu: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["yingzi", "fanjian", "yanhui"],
	},

	daqiao: {
		sex: "female",
		group: "wu",
		hp: 3,
		skills: ["guose", "guose2", "liuli"],
		names: "桥|null",
	},
	sunshangxiang: {
		sex: "female",
		group: "wu",
		hp: 3,
		skills: ["xiaoji", "jieyin"],
	},
	sunjian: {
		sex: "male",
		group: "wu",
		hp: 5,
		skills: ["gzyinghun", "yipo"],
	},
	sunce: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["scjiang", "scjiang_pd", "scyingyang"],
	},
	xiaoqiao: {
		sex: "female",
		group: "wu",
		hp: 3,
		skills: ["retianxiang", "hongyan"],
		names: "桥|null",
	},
	taishici: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["tianyi", "hanzhan"],
		names: "太史|慈",
	},
	old_zhoutai: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["buqu", "fenji"],
	},
	re_lusu: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["haoshi", "dimeng"],
	},
	zhangzhang: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["zhijian", "guzheng"],
		names: "张|昭-张|纮",
	},
	dc_jiangqing: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["dcshangyi", "dcniaoxiang"],
	},

	zhugejin: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["huanshi", "olhongyuan", "olmingzhe"],
	},
	lukang: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["shenwei", "keshou"],
	},
	xusheng: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["yicheng", "xinpojun"],
	},
	lingtong: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["xuanlve", "yongjin"],
	},
	chendong: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["dcduanxie", "fenming"],
		names: "陈|武-董|袭",
	},
	wuguotai: {
		sex: "female",
		group: "wu",
		hp: 3,
		skills: ["buyi", "ganlu"],
		names: "丁|null",
	},
	re_sunyi: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["zaolix"],
	},
	bulianshi: {
		sex: "female",
		group: "wu",
		hp: 3,
		skills: ["old_anxu", "zhuiyi"],
	},
	chengpu: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["daohuo", "chunlao"],
	},
	handang: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["gongji", "jiefan"],
	},

	panzhangmazhong: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["duodao", "anjian"],
		names: "潘|璋-马|忠",
	},
	zhuran: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["danshou", "jielu"],
	},
	sunluban: {
		sex: "female",
		group: "wu",
		hp: 3,
		skills: ["chanhui", "chuyi"],
	},
	quancong: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["yaoming", "zhenshan"],
	},
	sunxiu: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["yanzhu", "xingxue"],
	},
	zhuzhi: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["xinanguo"],
	},
	sundeng: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["kuangbi"],
	},
	zumao: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["yinbing", "juedi"],
	},
	zhugeke: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["aocai", "duwu"],
		names: "诸葛|恪",
	},
	re_sunluyu: {
		sex: "female",
		group: "wu",
		hp: 3,
		skills: ["remumu", "zhixi"],
		dieAudios: ["sunluyu"],
	},

	// 步骘（原型：sp 包 buzhi，技能名"弘德/定叛"与本地一致，沿用其id）
	buzhi: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["hongde", "dingpan"],
	},
	// 孙皓（原型：sp 包 sunhao，技能名"残蚀/仇海/归命"与本地一致，沿用其id；
	// 卡面未展示主公技，故不沿用isZhugong）
	sunhao: {
		sex: "male",
		group: "wu",
		hp: 5,
		skills: ["recanshi", "rechouhai", "guiming"],
	},
	// 阚泽（原型：sp 包 kanze，技能名"下书/宽释"与本地一致，沿用其id）
	kanze: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["xiashu", "kuanshi"],
	},
	// 吕岱（原型：sp2 包 lvdai，技能名"勤国"与本地一致，沿用其id/技能id xinfu_qinguo）
	lvdai: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["xinfu_qinguo"],
	},
	// 周鲂（原型：sp 包 zhoufang，技能名"断发/诱敌"与本地一致，沿用其id/技能id xinfu_duanfa/xinfu_youdi）
	zhoufang: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["xinfu_duanfa", "xinfu_youdi"],
	},
	// 孙茹（原型：mobile 包 sunru，技能"影箭"与本地一致沿用其id；卡面第二技能与原技能"释衅"不同名，
	// 视为全新技能）
	sunru: {
		sex: "female",
		group: "wu",
		hp: 3,
		skills: ["yingjian", "shijue"],
	},
	// 留赞（原型：xianding 包 re_liuzan，技能名"奋音/力激"与本地一致，沿用其id/技能id refenyin/liji）
	re_liuzan: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["refenyin", "liji"],
	},
	// 薛综（原型：yijiang 包 xuezong，技能名"复难/诫训"与本地一致，沿用其id/技能id funan/xinjiexun）
	xuezong: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["funan", "xinjiexun"],
	},
	// 陆绩（原型：shenhua 包 luji，技能名"怀橘/遗礼"与本地一致，沿用其id/技能id nzry_huaiju/nzry_yili；
	// 未沿用官方第三技能"箴论"，因本卡面仅展示两个技能）
	luji: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["nzry_huaiju", "nzry_yili"],
	},
	// 孙亮（原型：shenhua 包 sunliang，技能名"溃诛/立军"与本地一致，沿用其id/技能id
	// nzry_kuizhu/nzry_lijun，效果均为全新设计；未沿用官方第三技能"制政"及isZhugong，
	// 因本卡面仅展示两个非主公技能）
	sunliang: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["nzry_kuizhu", "nzry_lijun"],
	},

	xugong: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["biaozhao", "yechou"],
	},
	luyusheng: {
		sex: "female",
		group: "wu",
		hp: 3,
		skills: ["zhente", "zhiwei"],
	},
	wujing: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["diaogui", "fengyang"],
	},
	zhouyi: {
		sex: "female",
		group: "wu",
		hp: 3,
		skills: ["zhukou", "duannian", "lianyou", "xinghuo"],
	},
	fengxi: {
		sex: "male",
		group: "wu",
		hp: 3,
		skills: ["yusui", "boyan"],
	},
	sunhuan: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["dcniji"],
	},
	dc_sunchen: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["zigu", "zuowei"],
	},
	hb_sunjun: {
		sex: "male",
		group: "wu",
		hp: 4,
		skills: ["yaoyan", "bazheng"],
	},

	// 国战UI.QUN&WEI028 一战而就 陈宫（原型：yijiang 包 chengong。技能"智迟"与本地一致，沿用其id；
	// "引叛"为全新技能，卡面未展示官方"明策"，故不沿用）
	chengong: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["yinpan", "zhichi"],
	},
	// 国战UI.QUN&WEI066 毕方矫翼 许攸（原型：shenhua 包 xuyou。技能"成略"与本地一致沿用其id；
	// "侍才"与官方"恃才"同音，视为同一技能沿用其id；卡面未展示官方第三技能"寸目"，故不沿用）
	xuyou: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["nzry_shicai", "nzry_chenglve"],
	},
	// 国战UI.QUN&WU051 笳箫鼓吹 士燮（原型：sp 包 shixie。技能"避乱""礼下"与本地一致，沿用其id）
	shixie: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["olbiluan", "relixia"],
	},
	// 国战UI.QUN001 悬壶济世 华佗（原型：standard 包 huatuo。技能"急救"与本地一致沿用其id；
	// "除瘟"为全新技能，替换官方"青囊"）
	huatuo: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["jijiu", "chuwen"],
	},
	// 国战UI.QUN002 太虚幻魇 吕布（原型：standard 包 lvbu。技能"无双"与本地一致沿用其id并沿用官方
	// 实现；卡面额外的"决斗/空杀可指定至多三目标"效果新增为 wushuang_ext）
	lvbu: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["wushuang", "wushuang_ext"],
	},
	// 国战UI.QUN003 幻惑欲影 貂蝉（原型：standard 包 diaochan。技能"离间""闭月"与本地一致，沿用其id）
	diaochan: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["lijian", "biyue"],
		names: "null|null",
	},
	// 国战UI.QUN004 号令天下 袁绍（原型：shenhua 包 re_yuanshao。技能"乱击""血裔"与本地一致，沿用其id；
	// 卡面未展示主公标识，故不沿用isZhugong）
	re_yuanshao: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["luanji", "xueyi"],
	},
	// 国战UI.QUN005 土鸡瓦犬 颜良&文丑：官方无同名合体武将（diy/tw 包均为颜良、文丑单独角色），
	// 视为全新合体武将
	hb_yanliangwenchou: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["shuangxiong"],
		names: "颜|良-文|丑",
	},
	// 国战UI.QUN006 天魔乱舞 董卓（原型：shenhua 包 dongzhuo。技能"酒池""崩坏"与本地一致，沿用其id；
	// "横征""暴凌"为全新/重写技能；卡面"暴凌"写明"获得'崩坏'"，故"崩坏"不作为初始技能，
	// 改为在"暴凌"觉醒时通过player.addSkill("benghuai")授予，见skill.js内注释）
	dongzhuo: {
		sex: "male",
		group: "qun",
		hp: 8,
		skills: ["jiuchi", "hengzheng", "baoling"],
	},
	// 国战UI.QUN007 山海异兽 贾诩（原型：shenhua 包 jiaxu。技能"完杀""乱武""帷幕"与本地一致，沿用其id，
	// 效果按卡面重新设计）
	jiaxu: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["wansha", "luanwu", "weimu"],
	},

	pangde: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["mashu", "bianchu"],
	},
	zuoci: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["yigui", "jihun"],
	},
	zhangjiao: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["leiji", "guidao", "huangtian"],
		isZhugong: true,
	},
	yuji: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["qianhuan"],
	},
	caiwenji: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["beige", "duanchang"],
	},
	mateng: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["mashu", "xiongyi"],
	},
	kongrong: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["zymingshi", "lirang"],
	},
	jiling: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["shuangren"],
	},
	tianfeng: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["sijian", "gzsuishi"],
	},
	panfeng: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["kuangfu"],
	},

	re_zoushi: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["rehuoshui", "reqingcheng"],
		names: "邹|null",
	},
	huaxiong: {
		sex: "male",
		group: "qun",
		hp: 6,
		skills: ["yaowu", "hwyangwei"],
	},
	hetaihou: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["zhendu", "qiluan"],
		names: "何|null",
	},
	yuanshu: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["weidi", "yongsi"],
	},
	liqueguosi: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["xiongsuan"],
		names: "李|傕-郭|汜",
	},
	scl_zhangxiu: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["sclfudi", "sclcongjian"],
	},
	zhangren: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["chuanxin", "zfengshi"],
	},
	jsrg_hejin: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["jsrgzhaobing", "jsrgyanhuo"],
	},
	re_hansui: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["spniluan", "spweiwu"],
	},
	gaoshun: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["gsxunxi", "gsshejia", "jinjiu"],
	},

	jsrg_liubiao: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["jsrgyansha", "gzzishou"],
	},
	fuhuanghou: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["zhuikong", "qiuyuan"],
	},
	hb_liru: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["hb_liru_juece", "hb_liru_mieji", "hb_liru_fencheng"],
	},
	caifuren: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["qieting", "xianzhou"],
		names: "蔡|null",
	},
	yj_jushou: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["jianying", "shibei"],
	},
	liuxie: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["tianming", "mizhao"],
	},
	zhanglu: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["yishe", "bushi", "midao"],
	},
	yanbaihu: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["zhidao", "jili"],
	},
	std_huangfusong: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["guanhuo"],
		names: "皇甫|嵩",
	},
	taoqian: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["zhaohuo", "yixiang", "yirang"],
	},

	// 麹义（原型：sp 包 quyi，技能名"伏骑/骄恣"与本地一致，沿用其id/技能id fuqi/jiaozi）
	quyi: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["fuqi", "jiaozi"],
	},
	// 卑弥呼（原型：sp2 包 beimihu，仅名字沿用，原技能"纵鬼/蛊咒/拜甲"与卡面不同，视为全新技能）
	beimihu: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["guishu", "yuancheng"],
	},
	// 许劭（原型：jsrg 包 jsrg_xushao，技能名"盈门/评鉴"与本地一致，沿用其id/技能id sbyingmen/sbpingjian）
	jsrg_xushao: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["sbyingmen", "sbpingjian"],
	},
	// 祢衡（原型：huicui 包 re_miheng，技能名"狂才/舌剑"与本地一致，沿用其id/技能id rekuangcai/reshejian）
	re_miheng: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["rekuangcai", "reshejian"],
	},
	// 卢植（原型：shenhua 包 yl_luzhi，仅名字沿用，原技能"明任/贞良"与卡面不同，视为全新技能）
	yl_luzhi: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["ruzong", "daoren"],
	},
	// 刘焉（原型：sp 包 liuyan，技能名"图射/立牧"与本地一致，沿用其id/技能id xinfu_tushe/xinfu_limu）
	liuyan: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["xinfu_tushe", "xinfu_limu"],
	},
	// 荀谌（原型：huicui 包 re_xunchen，技能名"锋略/暗涌"与本地一致，沿用其id/技能id refenglve/anyong）
	re_xunchen: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["refenglve", "anyong"],
	},
	// 徐荣（原型：xianding 包 xurong，技能"凶镶"与原技能"凶镬"(xinfu_xionghuo)机制一致，沿用其id；
	// 未沿用原第二技能"杀绝"，因本卡面仅展示一个技能）
	xurong: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["xinfu_xionghuo"],
	},
	// 黄祖（原型：xianding 包 dc_huangzu，仅名字沿用，原技能"精攻/骁眷"与卡面不同，视为全新技能）
	dc_huangzu: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["xishe"],
	},
	// 吕玲绮（原型：huicui 包 lvlingqi，技能名"帼武/妆戎/神威"与本地一致，沿用其id/技能id guowu/zhuangrong/llqshenwei）
	lvlingqi: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["guowu", "zhuangrong", "llqshenwei"],
	},

	// QUN094 据土筹谋 刘璋 —— 对应"史迹"包的 liuzhang（同名同势力同体力，沿用其id；
	// 技能"引戈/施仁/据益"与原技能"据土/邀虎/怀璧"不同名，视为全新技能）
	liuzhang: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["lz_yinge", "lz_shiren", "lz_juyi"],
	},
	// QUN0xx 稳镇风云 司马亮 —— 未找到同名官方角色，视为全新角色（卡面"稳镇风云"标题与
	// QUN054皇甫嵩相同，疑为占位复用文本，与皇甫嵩并非同一角色，技能亦完全不同）
	hb_simaliang: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["sml_sheju", "sml_zuwang"],
	},
	// QUN0xx 稳镇风云 王允 —— 对应SP包的 wangyun（同名同势力，体力沿用其4点；技能
	// "赦论/伐异"与原技能"连计/谋逞"不同名，视为全新技能）
	wangyun: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["wy_shelun", "wy_fayi"],
	},
	// QUN0xx 稳镇风云 贾南风 —— 未找到同名官方角色，视为全新角色
	hb_jiananfeng: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["jnf_shanzheng", "jnf_xiongbao", "jnf_liedu"],
	},
	// QUN101 轧庭焚礼 刘宏 —— 对应SP2包的 liuhong（同名同势力，体力沿用其4点；技能
	// "朝争/甚宠"与原技能"鬻爵/图兴"不同名，视为全新技能；卡面未展示主公技，故不沿用isZhugong）
	liuhong: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["lh_chaozheng", "lh_shenchong"],
	},
	// QUN102 从龙之仪 刘辩 —— 对应"先登"包的 liubian（同名同势力，体力沿用其3点；
	// 技能名"诗怨/毒逝"与本地一致，沿用其id，但效果按卡面数值重新设计；卡面未展示主公技
	// "余威"，故不沿用isZhugong）
	liubian: {
		sex: "male",
		group: "qun",
		hp: 3,
		skills: ["shiyuan", "dushi"],
	},
	// QUN110 驭麟辟浪 杜预 —— 对应"应变"包的 duyu（原属晋势力，本批次按任务要求统一
	// 改为群势力；体力沿用其4点；技能"武库/灭吴"与原技能"三陈/昭讨"不同名，视为全新技能）
	duyu: {
		sex: "male",
		group: "qun",
		hp: 4,
		skills: ["dy_wuku", "dy_miewu"],
	},
	// QUN133 悲戚疏香 严夫人 —— 对应SP2包的 yanfuren（同名同势力，体力沿用其3点；
	// 技能名"谗逆/匿伏"与本地一致，沿用其id，效果按卡面数值重新设计）
	yanfuren: {
		sex: "female",
		group: "qun",
		hp: 3,
		skills: ["channi", "nifu"],
		names: "严|null",
	},
};
