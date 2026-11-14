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
for(let i=0;i<R.waves.length;i++){
  const g=new Game();g.state.wave=i;g.start();
  for(const type of Object.keys(R.enemies)){
    const tally=[0,0,0,0];
    for(const k of g.queue) if(k.type===type) tally[k.branch*2+k.gate]++;
    if(type==='taotie' && tally.some(Boolean)) {
      assert.deepEqual(tally,[1,0,0,1]);
    } else assert.ok(tally.every(n=>n===tally[0]));
  }
}
const place=(g,side,to,type='sword')=>g.command(side,{kind:'place',to,type});
const merge=(g,side,from,to)=>g.command(side,{kind:'merge',from,to});
const g=new Game();
assert.ok(!place(g,0,1).ok);
assert.ok(!place(g,0,0,'__proto__').ok);
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

const relic=new Game();relic.state.wave=2;
assert.ok(place(relic,0,0).ok && place(relic,1,1).ok);
assert.ok(relic.command(1,{kind:'relic',relic:'mirror',to:1}).ok);
assert.ok(merge(relic,0,0,1).stolen);
assert.deepEqual(relic.state.players[1].relic,{kind:'mirror',slot:null});

const pass=new Game();
assert.ok(pass.command(1,{kind:'hero',hero:'nuwa'}).ok);
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
  for(let wave=0;wave<R.waves.length;wave++){
    for (const side of [0,1]){
      for (const [i,n] of layout.entries()){
        const slot=n*2+side;
        if (!g.state.towers[slot] && !place(g,side,slot,['sword','thunder','sword','frost','thunder'][i%5]).ok) break;
      }
      assert.ok(g.command(side,{kind:'ready'}).ok);
    }
    for(let t=0;t<7000 && g.state.phase==='battle';t++) g.tick(1/60);
    assert.equal(g.state.phase,wave===R.waves.length-1?'over':'prepare');
  }
  return g.state.players.map(p=>[p.hp,p.kills,p.bounty]);
}
assert.deepEqual(mirroredMatch(0),mirroredMatch(1).reverse());
console.log('通过：四条路等长、成对阵位、逐怪种均分、双向合成、击杀结算、法器归属、漏怪、守关技和整局镜像');
