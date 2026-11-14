(function (root) {
  "use strict";
  const W = 1040, H = 550, cx = W / 2;
  const mirror = ([x,y]) => [W-x,y];
  const upper = [[cx,52],[cx,116],[500,132],[418,142],[375,153],[327,175],
    [313,191],[326,204],[389,221],[429,244],[483,255],[510,267],[cx,279]];
  const lower = [[cx,279],[cx,363],[508,385],[480,398],[400,420],[319,450],[252,473],[231,488]];
  const paths = [upper, upper.map(mirror)].map(branch =>
    [lower,lower.map(mirror)].map(tail => branch.concat(tail.slice(1))));
  const demonBoundary = 70;
  const slots = [[458,94],[327,102],[435,197],[260,213],[421,284],[472,324],
    [332,260],[229,366],[382,364],[348,482],[467,452],[266,422]].flatMap((p,i) =>
    [p,mirror(p)].map(([x,y],side) => ({ id:i*2+side, x,y, side, label:(side ? '右' : '左') + (i+1) })));
  const config = {
    board:{W,H,upper,lower,paths,slots,gates:[lower.at(-1),mirror(lower.at(-1))],mirror,demonBoundary},
    gold:90, waveGold:19, hp:12, maxLevel:3, relicWave:3, relicCost:34, defaultHero:'jingwei',
    levels:[null,{damage:1,range:0},{damage:1.72,range:10},{damage:2.9,range:22}],
    towers:{
      sword:{name:'御剑徒', glyph:'剑', color:'#91e0d3', cost:22, damage:25, range:114, interval:.86, role:'单体收割', desc:'飞剑锁定最接近关口的敌人，适合抢尾刀。'},
      thunder:{name:'雷符师', glyph:'雷', color:'#f6ca7e', cost:28, damage:33, range:109, interval:1.52, splash:37, splashRatio:.58, role:'范围清潮', desc:'雷符命中时波及周围妖物。'},
      frost:{name:'寒灯使', glyph:'灯', color:'#b5c8fc', cost:24, damage:14, range:125, interval:1.06, slow:.68, slowTime:1.7, role:'减速控场', desc:'为命中的妖物挂上寒印，延长它在火力区停留的时间。'}
    },
    heroes:{
      jingwei:{name:'精卫',glyph:'卫',skill:'衔石',cooldown:20,radius:86,duration:4,slow:.52,desc:'指定区域，碎石带让其中的妖物减速 4 秒。'},
      houyi:{name:'后羿',glyph:'羿',skill:'射日',cooldown:22,radius:100,duration:6,mark:1.52,desc:'标记选区内最强的一只妖物，己方塔对它伤害提高 52%。'},
      nuwa:{name:'女娲',glyph:'娲',skill:'补天',cooldown:23,heal:3,desc:'为己方镇关恢复最多 3 点关耐。'},
      kuafu:{name:'夸父',glyph:'夸',skill:'逐日',cooldown:20,radius:108,duration:6,range:42,desc:'选区内的己方塔在 6 秒内增加 42 射程。'},
      fuxi:{name:'伏羲',glyph:'羲',skill:'八卦开阵',cooldown:22,radius:104,duration:7,splash:25,desc:'选区内己方雷符师的溅射半径增加 25，持续 7 秒。'},
      shennong:{name:'神农',glyph:'农',skill:'百草护生',cooldown:22,shield:2,duration:9,desc:'给己方镇关加一层 9 秒的护盾，最多吸收 2 点漏怪伤害。'},
      dayu:{name:'大禹',glyph:'禹',skill:'疏洪',cooldown:24,radius:89,push:47,desc:'击退选区内的妖物；凶兽只后退约三成。'},
      lei:{name:'雷公',glyph:'公',skill:'召雷',cooldown:23,radius:78,duration:6,shred:.25,desc:'击散选区内妖物的护甲，持续 6 秒。'},
      changxi:{name:'常羲',glyph:'月',skill:'照月',cooldown:23,haste:1.45,duration:5,desc:'己方全阵攻速提高 45%，持续 5 秒。'},
      xuannv:{name:'九天玄女',glyph:'玄',skill:'授兵',cooldown:21,radius:100,duration:6,damage:1.3,desc:'选区内己方塔伤害提高 30%，持续 6 秒。'}
    },
    relics:{
      qin:{name:'伏羲琴',glyph:'琴',slow:.56,duration:2,desc:'佩戴塔首次命中山魈时减速 2 秒。'},
      stone:{name:'女娲石',glyph:'石',gate:true,threshold:5,shield:3,desc:'关耐首次降到 5 或以下时先抵消最多 3 点伤害。'},
      bell:{name:'敦煌钟',glyph:'钟',every:3,shred:.23,duration:5,desc:'佩戴塔每第三击削弱目标护甲 5 秒。'},
      mirror:{name:'昆仑镜',glyph:'镜',range:26,desc:'使佩戴塔的射程增加 26。'},
      cauldron:{name:'神农鼎',glyph:'鼎',bonus:2,desc:'佩戴塔每次尾刀额外获得 2 灵石。'},
      seal:{name:'崆峒印',glyph:'印',every:4,damage:1.65,desc:'佩戴塔每第四次攻击的伤害提高 65%。'}
    },
    spirits:{
      xuanwu:{name:'玄武',glyph:'武',block:2,desc:'每波抵消己方首次漏怪造成的最多 2 点伤害。'},
      qilin:{name:'麒麟',glyph:'麒',anchor:true,radius:95,haste:1.18,desc:'指定阵区，附近己方塔攻速提升 18%。'},
      phoenix:{name:'凤凰',glyph:'凤',anchor:true,radius:88,every:4,burst:42,ratio:.43,desc:'附近己方塔每第四击引发一次余焰。'},
      fox:{name:'九尾狐',glyph:'狐',anchor:true,radius:100,damage:1.2,desc:'附近己方塔对山魈伤害提高 20%。'},
      baize:{name:'白泽',glyph:'泽',anchor:true,radius:100,shred:.12,desc:'附近己方塔攻击时忽略目标最多 12 个百分点护甲。'},
      whiteTiger:{name:'白虎',glyph:'虎',anchor:true,radius:95,damage:1.20,desc:'附近己方塔对凶兽和精英伤害提高 20%。'},
      azureDragon:{name:'青龙',glyph:'龙',anchor:true,radius:95,range:18,desc:'附近己方塔射程增加 18。'},
      bixie:{name:'辟邪',glyph:'辟',anchor:true,radius:95,splash:15,desc:'附近己方雷符师溅射半径增加 15。'},
      chenghuang:{name:'乘黄',glyph:'乘',gold:6,desc:'每次过波时额外获得 6 灵石。'},
      luwu:{name:'陆吾',glyph:'陆',heal:1,desc:'过波后修复己方镇关 1 点关耐。'}
    },
    enemies:{
      ghost:{name:'游魂', glyph:'鬼', hp:62, speed:54, leak:1, reward:4, color:'#b3d4c9', radius:10, desc:'凡鬼 · 基础敌人'},
      spirit:{name:'山魈', glyph:'精', hp:64, speed:82, leak:1, reward:5, color:'#e5c573', radius:10, desc:'山精 · 快速穿阵'},
      demon:{name:'甲妖', glyph:'妖', hp:153, speed:49, leak:2, reward:8, color:'#ed9b74', radius:13, armor:.23, desc:'大妖 · 减免 23% 伤害'},
      lord:{name:'蚀月妖将', glyph:'将', hp:450, speed:48, leak:3, reward:16, color:'#e889aa', radius:15, minSlow:.74, elite:true, desc:'精英 · 抗减速'},
      taotie:{name:'饕餮',glyph:'餮',hp:980,speed:44,leak:5,reward:28,color:'#ffad73',radius:21,minSlow:.8,armor:.18,elite:true,
        devour:{threshold:.45,charge:1.65,radius:110,max:2,heal:.14},desc:'凶兽 · 低血蓄力吞食同路小妖回血'}
    },
    waves:[
      {name:'鬼灯离谷',groups:[['ghost',8]], hp:1, gap:.86},
      {name:'山魈踏雾',groups:[['spirit',8],['ghost',4]], hp:1.12, gap:.77},
      {name:'铁甲出山',groups:[['demon',8],['spirit',8]], hp:1.14, gap:.68},
      {name:'百妖夜渡',groups:[['spirit',8],['demon',8],['ghost',4]], hp:1.38, gap:.60},
      {name:'妖将叩关',groups:[['demon',8],['spirit',8],['lord',4]], hp:1.45, gap:.57},
      {name:'饕餮破封',groups:[['demon',8],['spirit',8],['taotie',2],['demon',8]], hp:1.62, gap:.55}
    ]
  };
  if (typeof module === 'object') module.exports = config;
  else root.Rules = config;
})(globalThis);
