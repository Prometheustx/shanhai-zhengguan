"use strict";
const assert=require('node:assert/strict');
const R=require('./rules'),{Game,routes,at}=require('./engine');
const {W,slots,paths,upper,lower}=R.board;
for (const route of routes.flat()) assert.equal(route.total,routes[0][0].total);
for (const path of paths.flat()) {
  assert.deepEqual(path[0],upper[0]);
  assert.deepEqual(path.slice(upper.length-1,upper.length+1),lower.slice(0,2));
  for(const p of slots) for(let i=1;i<path.length;i++){
    const [x,y]=path[i-1],[ex,ey]=path[i], dx=ex-x,dy=ey-y;
    const u=Math.max(0,Math.min(1,((p.x-x)*dx+(p.y-y)*dy)/(dx*dx+dy*dy)));
    assert.ok(Math.hypot(p.x-x-dx*u,p.y-y-dy*u)>38);
  }
}
for (const p of slots) {
  assert.deepEqual([slots[p.id^1].x,slots[p.id^1].y],[W-p.x,p.y]);
  assert.ok(p.y-22>R.board.demonBoundary,`${p.label}压到魔界边界`);
}
let previousHealthScale=0, previousEnemyHealth=0;
for(let i=0;i<R.waves.length;i++){
  const wave=R.waves[i];
  const g=new Game();g.state.wave=i;g.start();
  let enemyHealth=0;
  for(const enemy of g.queue) {
    g.spawn(enemy);
    const {maxHp}=g.state.enemies.at(-1);
    assert.equal(maxHp,Math.round(Math.round(R.enemies[enemy.type].hp*wave.hp)*wave.healthScale));
    enemyHealth+=maxHp;
  }
  assert.ok(i===0 ? wave.healthScale===2 : wave.healthScale>previousHealthScale);
  assert.ok(enemyHealth>previousEnemyHealth);
  previousHealthScale=wave.healthScale;
  previousEnemyHealth=enemyHealth;
  for(const type of Object.keys(R.enemies)){
    const tally=[0,0,0,0];
    for(const k of g.queue) if(k.type===type) tally[k.branch*2+k.gate]++;
    if(type==='taotie' && tally.some(Boolean)) {
      assert.deepEqual(tally,[1,0,0,1]);
    } else assert.ok(tally.every(n=>n===tally[0]));
  }
}
const enter=g=>{for(const side of [0,1]) assert.ok(g.command(side,{kind:'confirmHero'}).ok);};
const place=(g,side,to,type='sword')=>{
  const p=g.state.players[side];
  p.shop[0]=type;
  return g.command(side,{kind:'place',to,card:0,revision:p.shopRevision});
};
const merge=(g,side,from,to)=>g.command(side,{kind:'merge',from,to});
const g=new Game();
const shared=new Game();
enter(g);enter(shared);
assert.ok(place(shared,0,1).ok);
assert.equal(shared.state.towers[1].owner,0);
assert.ok(place(shared,1,0).ok);
assert.equal(shared.state.towers[0].owner,1);
assert.ok(!place(shared,1,1,'thunder').ok);
shared.state.wave=2;
assert.ok(shared.command(0,{kind:'spirit',spirit:'qilin',to:1}).ok);
assert.ok(!g.command(0,{kind:'place',to:0,card:5,revision:0}).ok);
for(const i of [0,2,1,3]) assert.ok(place(g,i%2,i).ok);
assert.ok(!merge(g,0,1,0).ok);
assert.ok(!merge(g,0,0,10).ok);
assert.ok(merge(g,0,2,0).ok);
assert.ok(!merge(g,0,0,1).ok);
assert.ok(merge(g,1,3,1).ok);
assert.deepEqual(merge(g,0,0,1),{ok:true,stolen:true});
assert.equal(g.state.towers[0],null);
assert.equal(g.state.towers[1].owner,0);
assert.equal(g.state.towers[1].level,3);
assert.equal(g.state.players[0].steals,1);
assert.ok(!g.command(0,{kind:'relic',relic:'cauldron',to:1}).ok);
g.state.wave=2;
g.state.players[0].gold=R.relicCost;
assert.ok(g.command(0,{kind:'relic',relic:'cauldron',to:1}).ok);
const before=g.state.players.map(p=>p.gold);
g.start();
g.spawn({type:'ghost',branch:1,gate:1});
const e=g.state.enemies[0];
e.distance=65;Object.assign(e,at(e.branch,e.gate,e.distance));e.hp=1;
g.tick(1/60);
assert.equal(g.state.enemies.length,0);
assert.deepEqual(g.state.players.map(p=>p.gold),[before[0]+6,before[1]]);
assert.deepEqual(g.state.players.map(p=>p.kills),[1,0]);

const relic=new Game();enter(relic);relic.state.wave=2;
relic.state.players[1].gold=R.relicCost;
assert.ok(place(relic,0,0).ok && place(relic,1,1).ok);
assert.ok(relic.command(1,{kind:'relic',relic:'mirror',to:1}).ok);
assert.ok(merge(relic,0,0,1).stolen);
assert.deepEqual(relic.state.players[1].relic,{kind:'mirror',slot:null});

const pass=new Game();
assert.ok(pass.command(1,{kind:'hero',hero:'nuwa'}).ok);
enter(pass);
for(const side of [0,1]) assert.ok(pass.command(side,{kind:'ready'}).ok);
assert.equal(pass.state.phase,'battle');
assert.ok(!pass.command(1,{kind:'hero',hero:'houyi'}).ok);
const init=pass.state.players.map(p=>p.hp);
for(let i=0;i<5 && pass.state.phase==='battle';i++) pass.tick(1/60);
pass.spawn({type:'demon',branch:0,gate:1});
pass.state.enemies.at(-1).distance=routes[0][1].total-.1;
pass.tick(1/60);
assert.deepEqual(pass.state.players.map(p=>p.hp),[init[0],init[1]-2]);
assert.ok(pass.command(1,{kind:'skill'}).ok);
assert.equal(pass.state.players[1].hp,R.hp);
assert.ok(!pass.command(1,{kind:'skill'}).ok);
assert.ok(pass.command(0,{kind:'skill',x:520,y:200}).ok);
assert.ok(!pass.command(0,{kind:'skill',x:520,y:200}).ok);
for(let i=0;i<4800 && pass.state.phase==='battle';i++) pass.tick(1/60);
assert.equal(pass.state.phase,'prepare');
assert.deepEqual(pass.state.players.map(p=>p.hp),[R.hp-4,R.hp-4]);
assert.deepEqual(pass.state.players.map(p=>p.gold),[R.gold+R.waveGold,R.gold+R.waveGold]);

function mirroredMatch(openingSide){
  const g=new Game(openingSide), layout=[0,5,3,8,4,2,6,10,9,7,11,1];
  enter(g);
  for(let wave=0;wave<R.waves.length;wave++){
    for (const side of [0,1]){
      for (const [i,n] of layout.entries()){
        const slot=n*2+side;
        if (!g.state.towers[slot] && !place(g,side,slot,['sword','thunder','sword','frost','thunder'][i%5]).ok) break;
      }
      if(wave>=2) {
        for(const n of layout) {
          const slot=n*2+side,t=g.state.towers[slot];
          if(t?.level===1) assert.ok(place(g,side,slot,t.type).ok);
        }
      }
      if(wave===2) {
        assert.ok(g.command(side,{kind:'spirit',spirit:'xuanwu'}).ok);
        assert.ok(g.command(side,{kind:'relic',relic:'seal',to:side}).ok);
      }
      if(wave===0) assert.ok(g.command(side,{kind:'ready'}).ok);
    }
    if(wave>0) for(let i=0;i<Math.ceil(R.waveBreak*60)+1 && g.state.phase==='prepare';i++) g.tick(1/60);
    for(let t=0;t<7000 && g.state.phase==='battle';t++) g.tick(1/60);
    assert.equal(g.state.phase,wave===R.waves.length-1?'over':'prepare');
  }
  assert.equal(g.state.result.reason,'cleared');
  return g.state.players.map(p=>[p.hp,p.kills,p.bounty]);
}
assert.deepEqual(mirroredMatch(0).map(p=>p[0]),mirroredMatch(1).reverse().map(p=>p[0]));
const shop=new Game();
assert.deepEqual(shop.state.players[0].shop,shop.state.players[1].shop);
assert.equal(shop.state.players[0].shop.length,4);
assert.ok(!shop.command(0,{kind:'place',card:0,to:0,revision:0}).ok);
enter(shop);
assert.ok(!shop.command(0,{kind:'hero',hero:'nuwa'}).ok);
const p=shop.state.players[0],initial=p.gold,type=p.shop[0];
assert.deepEqual(shop.command(0,{kind:'place',card:0,to:0,revision:0}),{ok:true,type});
assert.equal(p.gold,initial);
assert.equal(p.shop[0],null);
assert.ok(!shop.command(0,{kind:'place',card:0,to:2,revision:0}).ok);
assert.ok(shop.command(0,{kind:'refreshShop'}).ok);
assert.equal(p.gold,initial-R.shop.refreshBase);
assert.equal(p.refreshCount,1);
assert.ok(!shop.command(0,{kind:'place',card:0,to:2,revision:0}).ok);
assert.ok(shop.command(0,{kind:'refreshShop'}).ok);
assert.equal(p.gold,initial-R.shop.refreshBase*2-R.shop.refreshStep);
p.gold=0;
const snapshot=JSON.stringify(p.shop);
assert.ok(!shop.command(0,{kind:'refreshShop'}).ok);
assert.equal(JSON.stringify(p.shop),snapshot);
const npc=new Game(0,{npc:true});
assert.equal(npc.state.players[1].heroConfirmed,true);
assert.ok(!npc.command(1,{kind:'hero',hero:'nuwa'}).ok);
assert.ok(npc.command(0,{kind:'confirmHero'}).ok);
for(let i=0;i<1200;i++) npc.tick(1/60);
assert.equal(npc.state.phase,'battle');
assert.ok(npc.state.towers.some(t=>t?.owner===1));
const shopMerge=new Game(0);enter(shopMerge);
shopMerge.state.players[0].shop=['sword','sword','thunder','frost'];
assert.ok(shopMerge.command(0,{kind:'place',card:0,to:0,revision:0}).ok);
const result=shopMerge.command(0,{kind:'place',card:1,to:0,revision:0});
assert.ok(result.ok && result.merged);
assert.equal(shopMerge.state.towers[0].level,2);
assert.equal(shopMerge.state.players[0].shop[1],null);
const shopSteal=new Game(0);enter(shopSteal);
shopSteal.state.players[1].shop[0]='sword';
assert.ok(shopSteal.command(1,{kind:'place',card:0,to:3,revision:0}).ok);
shopSteal.state.players[0].shop[0]='sword';
assert.ok(shopSteal.command(0,{kind:'place',card:0,to:3,revision:0}).stolen);
assert.equal(shopSteal.state.towers[3].owner,0);
assert.equal(shopSteal.state.towers[3].level,2);
const nextWave=new Game(0);enter(nextWave);
nextWave.state.wave=1;
nextWave.state.phase='prepare';
nextWave.state.preparationLeft=R.waveBreak;
assert.ok(!nextWave.command(0,{kind:'ready'}).ok);
for(let i=0;i<Math.ceil(R.waveBreak*60)+1;i++) nextWave.tick(1/60);
assert.equal(nextWave.state.wave,2);
assert.equal(nextWave.state.phase,'battle');
const controls=new Game(0,{npc:true});
assert.ok(controls.command(0,{kind:'confirmHero'}).ok);
const remaining=controls.state.preparationLeft;
assert.ok(controls.command(0,{kind:'pause'}).ok);
for(let i=0;i<120;i++) controls.tick(1/60);
assert.equal(controls.state.preparationLeft,remaining);
assert.ok(!controls.command(0,{kind:'ready'}).ok);
assert.ok(controls.command(0,{kind:'speed',value:2}).ok);
assert.ok(controls.command(0,{kind:'pause'}).ok);
for(let i=0;i<60;i++) controls.tick(1/60);
assert.ok(Math.abs(controls.state.preparationLeft-(remaining-2))<.001);
assert.ok(!controls.command(0,{kind:'speed',value:8}).ok);
console.log('通过：六波生命阶梯、四路等长、镜像分怪、合成、击杀、神器、漏怪、守关技和整局镜像');
