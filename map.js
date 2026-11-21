(function () {
  'use strict';

  const {W,H,upper,lower,mirror,gates,slots}=Rules.board;
  const ink='#202028', colors=['#76efd5','#ffc56f'];
  const roads=[upper,upper.map(mirror),lower,lower.map(mirror)];
  const land=document.createElement('canvas');
  land.width=W;
  land.height=H;
  const bg=land.getContext('2d');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');

  function sheet(name,columns) {
    const src='assets/'+name+'.webp', image=new Image();
    image.src=src;
    return {src,image,columns};
  }
  const terrain=sheet('ink-valley',3);
  const combat=sheet('ink-combat',4);
  const weapons=sheet('battle-weapons',3);
  const guardians=sheet('refined-guardians',4);
  const castPoses=sheet('refined-guardians-cast',4);
  const guardianFaces=sheet('refined-guardians-faces',4);
  const walkPoses=sheet('enemies-stride',3);
  const spirits=sheet('ink-spirits',5);
  const relics=sheet('ink-relics',3);
  const guardianIds=Object.keys(Rules.heroes), spiritIds=Object.keys(Rules.spirits);
  const weaponIds=Object.keys(Rules.towers), relicIds=Object.keys(Rules.relics);
  const padDepth=[...slots].sort((a,b)=>a.y-b.y);
  const enemyArt={ghost:[0,42],spirit:[1,46],demon:[2,51],lord:[3,56],taotie:[4,78]};
  const loaded=({image})=>image.complete && image.naturalWidth>0;

  function sprite(c,atlas,i,x,y,size,flip=false) {
    const {image,columns}=atlas, cell=image.naturalWidth/columns;
    c.save();
    c.translate(x,y);
    if(flip) c.scale(-1,1);
    c.drawImage(image,i%columns*cell,Math.floor(i/columns)*cell,cell,cell,-size/2,-size,size,size);
    c.restore();
  }
  function path(c,line) {
    c.beginPath();
    line.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  }
  function ellipse(c,x,y,a,b,color) {
    c.beginPath();c.ellipse(x,y,a,b,0,0,Math.PI*2);
    c.fillStyle=color;c.fill();
  }
  function ring(c,x,y,r,color,width=1) {
    c.beginPath();c.arc(x,y,r,0,Math.PI*2);
    c.strokeStyle=color;c.lineWidth=width;c.stroke();
  }
  function poly(c,points,fill,stroke) {
    path(c,points);c.closePath();c.fillStyle=fill;c.fill();
    if(stroke) {c.strokeStyle=stroke;c.lineWidth=1.6;c.stroke();}
  }

  // Rock, rift, ruin, karst, waterfall and pine are independent cutouts.
  // Their bases sit to the sides of the actual paths and leave the shared pads open.
  const scenery=[
    [0,36,76,156],[0,151,72,150],[0,261,71,165],[0,366,64,128],[0,435,55,84],
    [3,19,172,126],[3,99,151,111],[0,203,123,76],[5,291,121,45],
    [2,175,221,103],[3,12,284,142],[3,82,305,128],[5,195,308,67],[5,270,301,48],
    [4,93,415,139],[5,31,436,93],[3,82,527,160],[5,282,559,88],[3,400,570,72],
    [1,520,65,65],[2,520,216,67],[5,507,547,75],
    [0,611,53,89,true],[0,686,69,133,true],[0,778,65,159,true],
    [0,911,76,187,true],[0,1025,78,146,true],[0,818,126,67,true],[5,738,116,53,true],
    [3,1026,193,145,true],[3,948,157,119,true],[2,874,219,113,true],
    [5,788,306,62,true],[5,861,331,57,true],[3,956,299,143,true],
    [4,957,422,154,true],[5,1014,429,81,true],[3,949,528,170,true],
    [5,756,554,83,true],[3,640,574,87,true]
  ].sort((a,b)=>a[2]-b[2]);

  function distanceToSegment(x,y,[ax,ay],[bx,by]) {
    const dx=bx-ax, dy=by-ay;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    return Math.hypot(x-ax-t*dx,y-ay-t*dy);
  }

  function paintGround(withScenery) {
    const c=bg, landTint=c.createLinearGradient(0,0,0,H);
    for(const [stop,color] of [[0,'#452d68'],[.12,'#766395'],[.25,'#a894ab'],
      [.40,'#b7b68c'],[.57,'#aed18b'],[.79,'#9fd38b'],[1,'#73bb86']]) landTint.addColorStop(stop,color);
    c.fillStyle=landTint;c.fillRect(0,0,W,H);
    c.lineCap='round';c.lineJoin='round';

    c.fillStyle='#e4eed34b';
    c.beginPath();c.moveTo(0,316);
    c.bezierCurveTo(177,310,197,232,326,245);
    c.bezierCurveTo(424,250,443,329,534,315);
    c.bezierCurveTo(627,301,697,234,784,259);
    c.bezierCurveTo(892,289,967,294,1040,259);
    c.lineTo(W,H);c.lineTo(0,H);c.closePath();c.fill();

    c.fillStyle='#c3a1ba91';
    c.beginPath();c.moveTo(0,115);
    c.bezierCurveTo(183,113,212,123,343,107);
    c.bezierCurveTo(470,90,429,155,520,152);
    c.bezierCurveTo(611,155,570,90,697,107);
    c.bezierCurveTo(828,123,857,113,1040,115);
    c.lineTo(W,0);c.lineTo(0,0);c.closePath();c.fill();

    const scars=[
      [[352,196],[365,191],[375,194],[393,181],[411,184],[422,176]],
      [[392,181],[395,172],[408,168]],
      [[629,180],[647,177],[663,192],[694,195]],
      [[664,192],[675,184],[686,182]]
    ];
    c.strokeStyle='#70526e91';c.lineWidth=1.8;
    for(const scar of scars){path(c,scar);c.stroke();}

    for(const flip of [false,true]) {
      c.save();
      if(flip){c.translate(W,0);c.scale(-1,1);}
      c.beginPath();c.moveTo(-21,265);
      c.bezierCurveTo(59,272,16,338,98,353);
      c.bezierCurveTo(173,367,158,406,106,452);
      c.bezierCurveTo(77,482,68,530,-5,540);
      for(const [width,color] of [[30,ink],[26,'#5db4a6'],[19,'#8fe3d7'],[4,'#c9fff0']]) {
        c.lineWidth=width;c.strokeStyle=color;c.stroke();
      }
      c.restore();
    }

    // Scatter marks are flat ground detail. Keep them out of lanes and deployment pads.
    let seed=4452;
    const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const segments=roads.flatMap(road=>road.slice(1).map((point,i)=>[road[i],point]));
    for(let i=0;i<410;i++) {
      const x=rand()*W,y=rand()*H;
      if(slots.some(p=>Math.hypot(p.x-x,p.y-y)<21) ||
         segments.some(([a,b])=>distanceToSegment(x,y,a,b)<21)) continue;
      const size=1.3+rand()*3.1, human=y>220;
      if(i%3===0) {
        path(c,[[x-size,y],[x-size*.32,y-size*.47],[x,y],[x+size*.51,y-size*.74]]);
        c.strokeStyle=human?'#356c55aa':'#4b365e99';c.lineWidth=1.1;c.stroke();
      } else {
        ellipse(c,x,y,size,size*.38,human?(i%2?'#699d6b8c':'#f5e6adbd'):'#4c37634e');
      }
    }

    const sand=c.createLinearGradient(0,55,0,H);
    sand.addColorStop(0,'#e4b1a0');sand.addColorStop(.56,'#f2d796');sand.addColorStop(1,'#fff0b7');
    for(const [width,color] of [[29,'#292630'],[25,'#b18b63'],[20.5,sand],[1.25,'#9b725b83']]) {
      c.strokeStyle=color;c.lineWidth=width;
      if(width<2) c.setLineDash([2,10]);
      for(const line of roads){path(c,line);c.stroke();}
    }
    c.setLineDash([]);

    if(withScenery) {
      for(const [id,x,y,size,flip] of scenery) {
        ellipse(c,x,y-2,size*.31,Math.max(3,size*.055),'#23332b3c');
        sprite(c,terrain,id,x,y,size,flip);
      }
    } else {
      ellipse(c,520,51,27,18,'#372948');
      ring(c,520,42,21,'#c27af5',3);
    }
    for(const pos of slots) drawPlatform(c,pos);
  }

  function drawPlatform(c,{x,y}) {
    const rim=y<225?'#646780':'#647a69';
    ellipse(c,x+1,y+5,15,6,'#26352b47');
    poly(c,[[x-14,y],[x-8,y-4],[x+7,y-4],[x+14,y],[x+12,y+5],[x-11,y+5]],rim,ink);
    poly(c,[[x-14,y],[x-7,y-6],[x+6,y-6],[x+14,y],[x+7,y+2],[x-7,y+2]],
      y<225?'#d4bdba':'#e3dfb3',ink);
    ellipse(c,x,y-2,5,1.9,'#517d68');
    ellipse(c,x,y-2,3.5,1.15,'#a4eed6');
  }
  paintGround(loaded(terrain));
  if(!loaded(terrain)) terrain.image.addEventListener('load',()=>paintGround(true),{once:true});

  function drawEnemy(c,e,time) {
    const {x,y}=e, spec=Rules.enemies[e.type], [i,size]=enemyArt[e.type], r=spec.radius;
    const quiet=reducedMotion.matches, ghost=e.type==='ghost';
    c.save();
    c.globalAlpha=Math.max(.18,Math.min(1,e.hp/e.maxHp));
    ellipse(c,x,y+3,r+2,r*.41,'#221c36a6');
    if(e.devourAt>time) {
      const pulse=reducedMotion.matches?0:Math.sin((e.devourAt-time)*18)*2;
      ring(c,x,y,r+9+pulse,ink,5);
      ring(c,x,y,r+9+pulse,'#ffb363',2.5);
    }
    if(loaded(combat)) {
      const ahead=Engine.at(e.branch,e.gate,e.distance+8);
      const behind=Engine.at(e.branch,e.gate,e.distance-8);
      const stopped=e.stunUntil>time || e.devourAt>time;
      const gait=(e.distance/(ghost?28:23)+e.id*.23)%1;
      const alt=!quiet && loaded(walkPoses) && gait>=.36 && gait<.83 && !(e.devourAt>time);
      const lift=quiet || stopped ? 0 : Math.sin(gait*Math.PI*2)*(ghost?2.4:1.5);
      const hit=e.hitAt!=null?Math.max(0,1-(time-e.hitAt)*7):0;
      const flip=ahead.x<behind.x, dir=flip?-1:1;
      c.save();
      c.translate(x+(quiet?0:-dir*hit*2.9),y+4-lift-(ghost?4:0));
      if(!quiet) {c.rotate(-dir*hit*.095);c.scale(1+hit*.04,1-hit*.065);}
      sprite(c,alt?walkPoses:combat,i,0,0,size,flip);
      c.restore();
    } else {
      ellipse(c,x,y,r+1,r+1,ink);
      ellipse(c,x,y,r-1,r-1,spec.color);
    }
    BattleFX.ailments(c,e,time,quiet);
    c.restore();
    poly(c,[[x-5,y+7],[x+5,y+7],[x,y+13]],colors[e.gate],ink);
  }

  function drawPlatformEnergy(c,state,visualTime) {
    const time=reducedMotion.matches?0:visualTime;
    for(const {x,y,id} of slots) {
      if(state.towers[id]) continue;
      ellipse(c,x,y-2,6,2,'#85f9d3');
      for(let i=0;i<2;i++){
        const rise=(time*.53+id*.26+i/2)%1;
        c.globalAlpha=Math.sin(rise*Math.PI)*.82;
        ellipse(c,x+(i-.5)*6+Math.sin(rise*5+i)*2,y-4-rise*12,1.15,2.05,'#e7fff0');
      }
    }
    c.globalAlpha=1;
  }
  function drawGuardians(c,state,casts,leaks,time) {
    const quiet=reducedMotion.matches;
    for(const [side,player] of state.players.entries()) {
      const [x,y]=gates[side], dir=side===0?1:-1;
      const cast=casts[side], progress=cast?BattleFX.phase(cast,time):1;
      const actionFrame=loaded(castPoses) && progress>=.12 && progress<.78;
      const impulse=Math.sin(Math.PI*progress), recoil=leaks[side]?Math.max(0,1-2.8*BattleFX.phase(leaks[side],time)):0;
      const breath=quiet?0:Math.sin(time*2.8+side*1.7);
      const offset=quiet?0:dir*(impulse*(progress<.13?-3:5)-recoil*6);
      ellipse(c,x,y+2,19,5,'#24302b7a');
      if(loaded(guardians)) {
        c.save();c.translate(x+offset,y+5);
        if(!quiet) {
          c.rotate(dir*(recoil*.13+(progress<.13?-.10:.045)*impulse));
          c.scale(1+impulse*.027,1+breath*.022-impulse*(actionFrame ? .015 : .036)-recoil*.055);
        }
        sprite(c,actionFrame?castPoses:guardians,guardianIds.indexOf(player.hero),0,0,92,side===1);
        c.restore();
      } else {
        poly(c,[[x-12,y],[x-7,y-27],[x-5,y-32],[x+5,y-32],[x+10,y-25],[x+13,y]],colors[side],ink);
        ellipse(c,x,y-36,6,7,'#f7dbad');
      }
    }
  }

  function drawTowers(c,state,actions,time) {
    for(const pos of padDepth) {
      const {id,x,y}=pos, t=state.towers[id];
      if(!t) continue;
      const action=actions[id]?.side===t.owner && actions[id]?.type===t.type ? actions[id] : null;
      const tint=colors[t.owner], move=BattleFX.weaponPose(t,action,time,id,reducedMotion.matches);
      ellipse(c,x,y+1,15,5.1,ink);
      ellipse(c,x,y,13.8,3.9,tint);
      if(loaded(weapons)) {
        const size=53+2.6*t.level;
        c.save();c.translate(x+move.dx,y-1-move.lift);c.rotate(move.turn);c.scale(1,move.scaleY);
        sprite(c,weapons,weaponIds.indexOf(t.type),0,0,size,move.flip);
        c.restore();
      } else {
        ellipse(c,x,y-15,10,10,ink);
        ellipse(c,x,y-15,8,8,Rules.towers[t.type].color);
      }
      for(let i=0;i<t.level;i++){
        const dot=x+(i-(t.level-1)/2)*6;
        ellipse(c,dot,y+8,2.8,2.8,ink);
        ellipse(c,dot,y+8,1.8,1.8,tint);
      }
      const relic=state.players[t.owner].relic;
      if(relic?.slot===id && loaded(relics)) {
        ellipse(c,x+20,y-17,8,8,ink);
        ellipse(c,x+20,y-17,7,7,'#fff1c5');
        sprite(c,relics,relicIds.indexOf(relic.kind),x+20,y-9.5,14);
      }
    }
  }

  function drawSpirits(c,state) {
    for(const [side,player] of state.players.entries()) {
      if(!player.spirit) continue;
      const {kind,slot}=player.spirit, anchor=slots[slot], tint=colors[side];
      const spec=Rules.spirits[kind];
      const [x,y]=anchor?[anchor.x,anchor.y]:gates[side];
      if(anchor) {
        ellipse(c,x,y,spec.radius,spec.radius,tint+'14');
        ring(c,x,y,spec.radius,ink+'65',2.5);
        ring(c,x,y,spec.radius,tint+'a8',1.1);
      }
      const offset=(anchor?18:43)*(side===0?-1:1);
      if(loaded(spirits)) {
        ellipse(c,x+offset,y+2,11,3,'#201e325c');
        sprite(c,spirits,spiritIds.indexOf(kind),x+offset,y+3,anchor?36:43,side===1);
      } else {
        ellipse(c,x+offset,y-6,6,6,tint);
      }
    }
  }

  function draw(c,s,aim,time=s.time) {
    c.drawImage(land,0,0);
    drawPlatformEnergy(c,s,time);
    drawSpirits(c,s);
    if(aim?.slot!=null) {
      const pos=slots[aim.slot];ellipse(c,pos.x,pos.y,aim.range,aim.range,'#f5ffde29');
      ring(c,pos.x,pos.y,aim.range,ink+'8f',2);
      ring(c,pos.x,pos.y,aim.range,'#dbffccdc',1);
    }
    for(const f of s.effects) if(f.kind==='field') {
      ellipse(c,f.x,f.y,f.radius,f.radius,colors[f.side]+'36');
      ring(c,f.x,f.y,f.radius,ink+'a0',3.5);
      for(let i=0;i<2;i++)ring(c,f.x,f.y,f.radius-i*8,colors[f.side]+'d0',i+1);
      c.save();c.translate(f.x,f.y);c.rotate(reducedMotion.matches?0:time/2);
      const oct=Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*f.radius*.79,Math.sin(i*Math.PI/4)*f.radius*.79]);
      path(c,[...oct,oct[0]]);c.stroke();c.restore();
    }
    const towerActions=[], casts=[], leaks=[];
    for(const f of s.effects) {
      BattleFX.ground(c,f,time);
      if(f.kind==='attack' || f.kind==='harvest') towerActions[f.slot]=f;
      else if(f.kind==='cast') casts[f.side]=f;
      else if(f.kind==='leak') leaks[f.side]=f;
    }
    drawTowers(c,s,towerActions,time);
    drawGuardians(c,s,casts,leaks,time);
    // Monsters and their status art always cover the towers, regardless of screen position.
    for(const e of s.enemies.slice().sort((a,b)=>a.y-b.y)) drawEnemy(c,e,time);
    for(const f of s.effects) {
      if(f.kind==='field') continue;
      const animated=f.kind==='attack'||f.kind==='harvest'||f.kind==='cast';
      if(animated) BattleFX.front(c,f,time,reducedMotion.matches);
      const p=BattleFX.phase(f,time), color=f.kind==='harvest'?'#eed1ff':colors[f.side];
      c.save();c.globalAlpha=1-p;
      if(!animated && f.kind!=='bounty') {
        ring(c,f.x,f.y,(f.radius||29)*(.4+.65*p),f.type==='phoenix'?'#ffd084':color,2);
      }
      if(f.text) {
        const rise=f.kind==='harvest'?49+p*38:14+p*17;
        c.font='bold 15px "Microsoft YaHei",sans-serif';c.textAlign='center';
        c.strokeStyle=ink;c.lineWidth=3;c.strokeText(f.text,f.x,f.y-rise);
        c.fillStyle=color;c.fillText(f.text,f.x,f.y-rise);
      }
      c.restore();
    }
  }

  function guardianPortrait(element,hero,face=false) {
    const atlas=face?guardianFaces:guardians, i=guardianIds.indexOf(hero), columns=atlas.columns;
    const x=(i%columns)/(columns-1)*100, y=Math.floor(i/columns)*100;
    element.style.backgroundImage='url("'+atlas.src+'")';
    element.style.backgroundSize=(columns*100)+'% 200%';
    element.style.backgroundPosition=x+'% '+y+'%';
  }
  globalThis.BoardArt={draw,colors,guardianPortrait};
})();
