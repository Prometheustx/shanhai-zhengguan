(function (root) {
  "use strict";
  const R = typeof module === 'object' ? require('./rules') : root.Rules;
  const routes = R.board.paths.map(branch => branch.map(points => {
    const pieces = []; let total = 0;
    for (let i=1;i<points.length;i++) {
      const [x,y]=points[i-1], [ex,ey]=points[i], len=Math.hypot(ex-x,ey-y);
      pieces.push({x,y,dx:ex-x,dy:ey-y,len,start:total});
      total+=len;
    }
    return {pieces,total};
  }));
  function at(branch,gate,distance) {
    const route=routes[branch][gate];
    const p=route.pieces.find(p=>distance<=p.start+p.len) || route.pieces.at(-1);
    const t=Math.max(0,Math.min(1,(distance-p.start)/p.len));
    return {x:p.x+p.dx*t,y:p.y+p.dy*t};
  }
  const sq=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
  const fail=error=>({ok:false,error});
  const has=(set,key)=>typeof key==='string' && Object.hasOwn(set,key);
  const player=()=>({gold:R.gold,hp:R.hp,kills:0,bounty:0,steals:0,hero:R.defaultHero,heroConfirmed:false,shop:[],shopRevision:0,refreshCount:0,cooldown:0,
    buff:0,shield:0,shieldUntil:0,relic:null,spirit:null,spiritUsed:false,ready:false});
  class Game {
    constructor(openingSide=Math.random()<.5?0:1,options={}) {
      this.state={phase:'lobby',wave:0,time:0,players:[player(),player()],
        towers:R.board.slots.map(()=>null),enemies:[],effects:[],result:null,preparationLeft:null};
      this.npc=!!options.npc;
      this.npcWait=0;
      if(this.npc) {
        this.state.players[1].hero='houyi';
        this.state.players[1].heroConfirmed=true;
      }
      this.queue=[]; this.spawnIn=0; this.seq=0; this.step=openingSide;this.openingSide=openingSide;
      const opening=this.rollShop();
      for(const p of this.state.players) p.shop=opening.slice();
    }
    rollShop() {
      const types=Object.keys(R.towers);
      return Array.from({length:R.shop.size},()=>types[Math.floor(Math.random()*types.length)]);
    }
    command(side,action,fromNpc=false) {
      const s=this.state;
      if ((side!==0 && side!==1) || !action || typeof action!=='object') return fail('无效操作。');
      if (this.npc && side===1 && !fromNpc) return fail('右关由 NPC 操控。');
      if (s.phase==='over') return fail('本局已结束。');
      const p=s.players[side], a=action, slot=i=>Number.isInteger(i) ? R.board.slots[i] : null;
      const ok={ok:true};
      if (a.kind==='hero') {
        if (s.phase!=='lobby' || p.heroConfirmed) return fail('守关人已确定。');
        if (!has(R.heroes,a.hero)) return fail('守关角色不存在。');
        p.hero=a.hero;return ok;
      }
      if (a.kind==='confirmHero') {
        if (s.phase!=='lobby' || p.heroConfirmed) return fail('守关人已确定。');
        p.heroConfirmed=true;
        if(s.players.every(x=>x.heroConfirmed)) {
          s.phase='prepare';s.preparationLeft=R.firstPreparation;
        }
        return ok;
      }
      if(s.phase==='lobby') return fail('双方先确定守关人。');
      if (a.kind==='refreshShop') {
        const price=R.shop.refreshBase+p.refreshCount*R.shop.refreshStep;
        if(p.gold<price) return fail('灵气不足，无法刷新。');
        p.gold-=price;p.refreshCount++;p.shop=this.rollShop();p.shopRevision++;
        return ok;
      }
      if (a.kind==='ready') {
        if (s.phase!=='prepare' || s.wave!==0) return fail('只有首波可以提前就绪。');
        p.ready=!p.ready;
        if ((this.npc && s.players[0].ready) || s.players.every(x=>x.ready)) this.start();
        return ok;
      }
      if (a.kind==='place') {
        const pos=slot(a.to);
        if (!pos) return fail('请选择地图上的空阵位。');
        if (!Number.isInteger(a.card) || a.card<0 || a.card>=R.shop.size ||
            a.revision!==p.shopRevision || !p.shop[a.card]) return fail('货架已变化，请重新选择。');
        const type=p.shop[a.card];
        const target=s.towers[a.to];
        if(target) {
          if(target.type!==type || target.level!==1) return fail('商店单位只能合成同种一级单位。');
          const stolen=target.owner!==side;
          if(stolen) {
            p.steals++;
            const other=s.players[target.owner];
            if(other.relic?.slot===a.to) other.relic.slot=null;
          }
          target.level=2;target.owner=side;target.shots=0;target.spiritShots=0;
          p.shop[a.card]=null;
          this.effect('merge',pos,{side,text:stolen?'夺阵 · 贰':'升阶 · 贰'});
          return {ok:true,type,merged:true,stolen};
        }
        p.shop[a.card]=null;
        s.towers[a.to]={type,level:1,owner:side,cd:0,shots:0,spiritShots:0};
        this.effect('summon',pos,{side});
        return {ok:true,type};
      }
      if (a.kind==='merge') {
        if (!slot(a.from) || !slot(a.to) || a.from===a.to) return fail('请选择另一个阵位。');
        const from=s.towers[a.from], dest=s.towers[a.to];
        if (!from || from.owner!==side) return fail('只能拖动自己的单位。');
        if (!dest || from.type!==dest.type || from.level!==dest.level || from.level>=R.maxLevel) {
          return fail('只能与同种、同级的单位合成，最高叁阶。');
        }
        const stolen=dest.owner!==side;
        if (stolen) {
          p.steals++;
          const other=s.players[dest.owner];
          if (other.relic?.slot===a.to) other.relic.slot=null;
        }
        if (p.relic?.slot===a.from) p.relic.slot=a.to;
        s.towers[a.from]=null;
        s.towers[a.to]={...dest,owner:side,level:dest.level+1,cd:Math.max(from.cd,dest.cd),shots:0,spiritShots:0};
        this.effect('merge',slot(a.to),{side,text:(stolen?'夺阵 · ':'升阶 · ')+('贰叁'[dest.level-1])});
        return {ok:true,stolen};
      }
      const supportOpen=s.wave>=R.relicWave || (s.wave===R.relicWave-1 && s.phase==='prepare');
      if (a.kind==='spirit') {
        if (!supportOpen || s.phase!=='prepare') return fail('第二波结束后可在布阵阶段选择灵兽。');
        if (p.spirit || !has(R.spirits,a.spirit)) return fail('每局只能选定一只灵兽。');
        const spirit=R.spirits[a.spirit], pos=slot(a.to);
        if (spirit.anchor && !pos) return fail('请选择地图上的阵位安置灵兽。');
        p.spirit={kind:a.spirit,slot:spirit.anchor?a.to:null};
        p.ready=false;
        const [x,y]=R.board.gates[side];
        this.effect('summon',spirit.anchor?pos:{x,y},{side,text:spirit.name});
        return ok;
      }
      if (a.kind==='relic') {
        if (!supportOpen) return fail('第二波结束后才开启神器。');
        if (!has(R.relics,a.relic)) return fail('请选择神器。');
        const relic=R.relics[a.relic];
        if (!relic.gate && (!slot(a.to) || s.towers[a.to]?.owner!==side)) return fail('请选择己方单位佩戴神器。');
        if (p.relic && (p.relic.kind!==a.relic || relic.gate)) return fail('每人一局只能选定一件神器。');
        if (!p.relic && p.gold<R.relicCost) return fail('灵气不足。');
        if (!p.relic) p.gold-=R.relicCost;
        if (p.relic?.slot!=null) s.towers[p.relic.slot].shots=0;
        if (!relic.gate) s.towers[a.to].shots=0;
        p.relic={kind:a.relic,slot:relic.gate?null:a.to};
        const [x,y]=R.board.gates[side];
        this.effect('summon',relic.gate?{x,y}:slot(a.to),{side,text:relic.name});
        return ok;
      }
      if (a.kind==='skill') {
        if (s.phase!=='battle') return fail('妖潮开始后才能施放守关技。');
        if (p.cooldown>s.time) return fail('守关技正在回息。');
        const hero=R.heroes[p.hero];
        const [x,y]=R.board.gates[side], gate={x,y};
        const pos={x:a.x,y:a.y};
        if (hero.radius && (!Number.isFinite(a.x)||!Number.isFinite(a.y)||a.x<0||a.y<0||a.x>R.board.W||a.y>R.board.H)) return fail('请选择战场上的位置。');
        if (hero.heal) {
          if (p.hp===R.hp) return fail('镇关关耐已满。');
          const healed=Math.min(hero.heal,R.hp-p.hp);
          p.hp=Math.min(R.hp,p.hp+hero.heal);
          this.effect('summon',gate,{side,text:'补天 +' + healed});
        } else if (hero.shield) {
          p.shield=hero.shield;p.shieldUntil=s.time+hero.duration;
        } else if (hero.haste) {
          p.buff=s.time+hero.duration;
        } else if (hero.mark || hero.push) {
          const targets=s.enemies.filter(e=>e.hp>0 && sq(e,pos)<=hero.radius**2);
          if (!targets.length) return fail('施法范围内没有妖物。');
          if (hero.mark) {
            const target=targets.reduce((a,b)=>a.maxHp>=b.maxHp?a:b);
            target.mark ??= [0,0];
            target.mark[side]=s.time+hero.duration;
            this.effect('mark',target,{side,duration:.85,text:hero.skill});
          } else {
            for(const e of targets) {
              e.distance=Math.max(0,e.distance-hero.push*(R.enemies[e.type].devour ? .3 : 1));
              Object.assign(e,at(e.branch,e.gate,e.distance));
            }
            this.effect('burst',pos,{side,radius:hero.radius,text:hero.skill});
          }
        } else {
          this.effect('field',pos,{side,radius:hero.radius,duration:hero.duration,hero:p.hero});
        }
        if (!hero.radius && !hero.heal) this.effect('summon',gate,{side,text:hero.skill});
        p.cooldown=s.time+hero.cooldown;
        return ok;
      }
      return fail('未知操作。');
    }
    effect(kind,pos,params={}) {
      this.state.effects.push({kind,x:pos.x,y:pos.y,at:this.state.time,duration:.48,...params});
    }
    start() {
      const s=this.state;
      s.wave++;s.phase='battle';s.preparationLeft=null;
      for(const p of s.players) {p.ready=false;p.spiritUsed=false;}
      const wave=R.waves[s.wave-1];
      this.queue=wave.groups.flatMap(([type,n],group)=>{
        const flip=(s.wave+group+this.openingSide)%2;
        if(n===2) return [flip,1-flip].map(side=>({type,branch:side,gate:side}));
        // Each block of four is one copy for each combination of upper branch and gate.
        return Array.from({length:n},(_,i)=>({
          type,branch:((i+(i>>1))&1)^flip,gate:(i&1)^(flip^((i>>2)&1))
        }));
      });
      this.spawnIn=.35;
    }
    spawn({type,branch,gate}) {
      const s=this.state,d=R.enemies[type], wave=R.waves[s.wave-1], hp=Math.round(d.hp*wave.hp);
      s.enemies.push({id:++this.seq,type,branch,gate,distance:0,...at(branch,gate,0),hp,maxHp:hp,slow:1,slowUntil:0});
    }
    hit(e, damage, owner, relic, spirit, fields) {
      if (e.hp<=0) return;
      const d=R.enemies[e.type];
      const time=this.state.time;
      const armorBreak=Math.max(e.shredUntil>time?R.relics.bell.shred:0,
        fields.some(f=>R.heroes[f.hero].shred && sq(e,f)<=f.radius**2)?R.heroes.lei.shred:0);
      const armor=Math.max(0,(d.armor||0)-armorBreak-(spirit?.shred||0));
      const marked=e.mark?.[owner]>time?R.heroes.houyi.mark:1;
      const spiritBoost=(spirit===R.spirits.fox && e.type==='spirit') || (spirit===R.spirits.whiteTiger && d.elite);
      e.hp-=damage*(1-armor)*marked*(spiritBoost?spirit.damage:1);
      if(e.hp>0) return;
      const p=this.state.players[owner], reward=d.reward+(relic?.bonus||0);
      p.gold+=reward;p.bounty+=reward;p.kills++;
      this.effect('bounty',e,{side:owner,text:'+'+reward+' 灵气',duration:.68});
    }
    tick(dt) {
      const s=this.state;
      s.time+=dt;
      s.effects=s.effects.filter(f=>s.time-f.at<f.duration);
      if(s.phase==='lobby' || s.phase==='over') return;
      if(this.npc) {
        this.npcWait-=dt;
        if(this.npcWait<=0) {this.npcWait=R.npcInterval;this.playNpc();}
      }
      if(s.phase==='prepare') {
        s.preparationLeft=Math.max(0,s.preparationLeft-dt);
        if(s.preparationLeft<=0) this.start();
        return;
      }
      this.spawnIn-=dt;
      if (this.queue.length && this.spawnIn<=0) {
        this.spawn(this.queue.shift());this.spawnIn+=R.waves[s.wave-1].gap;
      }
      const fields=s.effects.filter(f=>f.kind==='field');
      const step=this.step++;
      // Alternate initiative and traversal across the mirrored board.
      for(let k=0;k<s.towers.length;k++) {
        const i=(step&1) ? s.towers.length-1-k : k;
        const t=s.towers[i];
        if (!t) continue;
        const p=R.board.slots[i], spec=R.towers[t.type], lv=R.levels[t.level], owner=s.players[t.owner];
        const localFields=fields.filter(f=>f.side===t.owner && sq(p,f)<=f.radius**2).map(f=>R.heroes[f.hero]);
        const selectedSpirit=owner.spirit && R.spirits[owner.spirit.kind];
        const spirit=selectedSpirit?.anchor && sq(p,R.board.slots[owner.spirit.slot])<=selectedSpirit.radius**2?selectedSpirit:null;
        const relic=owner.relic?.slot===i ? R.relics[owner.relic.kind] : null;
        const haste=(owner.buff>s.time ? R.heroes.changxi.haste : 1)*(spirit?.haste||1);
        t.cd=Math.max(0,t.cd-dt*haste);
        if(t.cd>0) continue;
        const ranged=localFields.reduce((total,h)=>total+(h.range||0),0);
        const limit=(spec.range+lv.range+ranged+(relic?.range||0)+(spirit?.range||0))**2;
        let target=null;
        for(const e of s.enemies) {
          if(e.hp>0 && sq(e,p)<=limit && (!target || e.distance>target.distance)) target=e;
        }
        if (!target) continue;
        const relicProc=relic?.every && ++t.shots%relic.every===0;
        const phoenix=spirit?.burst && ++t.spiritShots%spirit.every===0;
        const boost=localFields.reduce((mul,h)=>mul*(h.damage||1),1);
        const dmg=spec.damage*lv.damage*boost*(relicProc?(relic.damage||1):1);
        const splash=spec.splash && spec.splash+(spirit?.splash||0)+localFields.reduce((total,h)=>total+(h.splash||0),0);
        t.cd=spec.interval;
        this.effect('shot',p,{tx:target.x,ty:target.y,side:t.owner,type:t.type,duration:.19});
        if(spec.slow) {
          target.slow=spec.slow;target.slowUntil=s.time+spec.slowTime;
        }
        if(relicProc && relic.shred) target.shredUntil=s.time+relic.duration;
        if(relic?.slow && target.type==='spirit' && !((target.qinSides||0)&(1<<t.owner))) {
          target.qinSides=(target.qinSides||0)|(1<<t.owner);
          target.qinUntil=s.time+relic.duration;
        }
        this.hit(target,dmg,t.owner,relic,spirit,fields);
        if(splash || phoenix) {
          this.effect('burst',target,{side:t.owner,radius:Math.max(splash||0,phoenix?spirit.burst:0),type:phoenix?'phoenix':t.type});
          for(const e of s.enemies) {
            if(e===target) continue;
            const d=sq(e,target), extra=(splash&&d<=splash**2?spec.splashRatio:0)+(phoenix&&d<=spirit.burst**2?spirit.ratio:0);
            if(extra>0) this.hit(e,dmg*extra,t.owner,relic,spirit,fields);
          }
        }
      }
      this.updateBosses();
      const live=[];
      for(const e of s.enemies) {
        if(e.hp<=0) continue;
        const d=R.enemies[e.type];
        const inField=fields.some(f=>R.heroes[f.hero].slow && sq(e,f)<=f.radius**2);
        const slow=Math.max(d.minSlow||0,Math.min(e.slowUntil>s.time?e.slow:1,
          e.qinUntil>s.time?R.relics.qin.slow:1,inField?R.heroes.jingwei.slow:1));
        if (!(e.devourAt>s.time)) e.distance+=d.speed*slow*dt;
        Object.assign(e,at(e.branch,e.gate,e.distance));
        if(e.distance>=routes[e.branch][e.gate].total) {
          this.leak(e,d.leak);
        } else live.push(e);
      }
      s.enemies=live;
      if (s.players.some(p=>p.hp===0)) this.finish('broken');
      else if (!this.queue.length && !live.length) {
        if (s.wave===R.waves.length) this.finish('cleared');
        else {
          for(const p of s.players) {
            const spirit=p.spirit && R.spirits[p.spirit.kind];
            p.gold+=R.waveGold+(spirit?.gold||0);
            p.hp=Math.min(R.hp,p.hp+(spirit?.heal||0));
          }
          s.phase='prepare';s.preparationLeft=R.waveBreak;
        }
      }
    }
    playNpc() {
      const s=this.state,p=s.players[1];
      if(s.phase!=='prepare' && s.phase!=='battle') return;
      if(s.phase==='prepare' && s.wave>=2 && !p.spirit) {
        this.command(1,{kind:'spirit',spirit:'xuanwu'},true);
        return;
      }
      if(s.phase==='battle' && p.cooldown<=s.time) {
        const target=s.enemies.filter(e=>e.hp>0 && R.enemies[e.type].elite)
          .sort((a,b)=>b.maxHp-a.maxHp)[0];
        if(target) {
          this.command(1,{kind:'skill',x:target.x,y:target.y},true);
          return;
        }
      }
      const candidates=p.shop.map((type,card)=>({type,card})).filter(c=>c.type);
      const steal=candidates.flatMap(c=>s.towers.map((t,to)=>({c,t,to})))
        .find(x=>x.t && x.t.owner===0 && x.t.level===1 && x.t.type===x.c.type);
      if(steal) {
        this.command(1,{kind:'place',card:steal.c.card,revision:p.shopRevision,to:steal.to},true);
        return;
      }
      const owned=s.towers.map((t,i)=>({t,i})).filter(x=>x.t?.owner===1);
      for(const from of owned) {
        const target=owned.find(x=>x.i!==from.i && x.t.level===from.t.level &&
          x.t.type===from.t.type && x.t.level<R.maxLevel);
        if(target && owned.length>=6) {
          this.command(1,{kind:'merge',from:from.i,to:target.i},true);return;
        }
      }
      if(candidates.length) {
        const positions=R.board.slots.filter(pos=>!s.towers[pos.id]);
        positions.sort((a,b)=>{
          const score=pos=>Math.min(...routes.flatMap(branch=>branch.map(route=>
            Math.min(...route.pieces.map(piece=>Math.hypot(pos.x-piece.x,pos.y-piece.y))))))
            +(pos.side===1?0:22)+(pos.y<300?-12:0);
          return score(a)-score(b);
        });
        if(positions.length) this.command(1,{kind:'place',card:candidates[0].card,revision:p.shopRevision,to:positions[0].id},true);
      } else if(p.gold>=R.shop.refreshBase+p.refreshCount*R.shop.refreshStep) {
        this.command(1,{kind:'refreshShop'},true);
      }
    }
    leak(e,damage) {
      const {time,players}=this.state, p=players[e.gate];
      if (p.spirit?.kind==='xuanwu' && !p.spiritUsed) {
        p.spiritUsed=true;
        damage=Math.max(0,damage-R.spirits.xuanwu.block);
      }
      if(p.shieldUntil>time && damage>0) {
        const blocked=Math.min(p.shield,damage);
        p.shield-=blocked;damage-=blocked;
      }
      const stone=R.relics.stone;
      if (damage>0 && p.relic?.kind==='stone' && !p.relic.used && p.hp-damage<=stone.threshold) {
        p.relic.used=true;
        damage=Math.max(0,damage-stone.shield);
      }
      p.hp=Math.max(0,p.hp-damage);
      this.effect('leak',e,{side:e.gate,text:damage?'−'+damage:'抵挡',duration:.8});
    }
    updateBosses() {
      const {enemies,time}=this.state;
      for(const boss of enemies) {
        const ability=R.enemies[boss.type].devour;
        if(!ability || boss.hp<=0 || boss.devoured) continue;
        if(!boss.devourAt && boss.hp<=boss.maxHp*ability.threshold) {
          boss.devourAt=time+ability.charge;
          this.effect('devour',boss,{side:boss.gate,radius:ability.radius,duration:ability.charge,text:'饕餮 · 吞食'});
        }
        if(boss.devourAt && time>=boss.devourAt) {
          boss.devoured=true;
          const prey=enemies.filter(e=>e.hp>0 && !R.enemies[e.type].elite && e.gate===boss.gate && sq(e,boss)<=ability.radius**2)
            .sort((a,b)=>sq(a,boss)-sq(b,boss)).slice(0,ability.max);
          for (const e of prey) e.hp=0;
          boss.hp=Math.min(boss.maxHp,boss.hp+boss.maxHp*ability.heal*prey.length);
          if(prey.length) this.effect('burst',boss,{side:boss.gate,radius:ability.radius,text:'吞食回血'});
        }
      }
    }
    finish(reason) {
      const s=this.state,[a,b]=s.players;
      const delta=(a.hp-b.hp) || (reason==='cleared' ? a.bounty-b.bounty : 0);
      s.result={winner:delta>0?0:delta<0?1:null,reason};
      s.phase='over';
    }
  }
  const api={Game,at,routes};
  if (typeof module==='object') module.exports=api;
  else root.Engine=api;
})(globalThis);
