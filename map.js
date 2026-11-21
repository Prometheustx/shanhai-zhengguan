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

  function sheet(name,columns,rows=2) {
    const src='assets/'+name+'.webp', image=new Image();
    image.src=src;
    return {src,image,columns,rows};
  }
  const surface=sheet('gorge-land',1,1);
  const terrain=sheet('gorge-scenery',3);
  const combat=sheet('gorge-enemies',5);
  const weapons=sheet('gorge-weapons',3);
  const guardians=sheet('refined-guardians',4);
  const castPoses=sheet('refined-guardians-cast',4);
  const guardianFaces=sheet('refined-guardians-faces',4);
  const revisions=sheet('gorge-guardian-revisions',2,3);
  const spirits=sheet('ink-spirits',5);
  const relics=sheet('ink-relics',3);
  const guardianIds=Object.keys(Rules.heroes), spiritIds=Object.keys(Rules.spirits);
  const revisedGuardianIds=['jingwei','kuafu'];
  const weaponIds=Object.keys(Rules.towers), relicIds=Object.keys(Rules.relics);
  const padDepth=[...slots].sort((a,b)=>a.y-b.y);
  const enemyArt={ghost:[0,42],spirit:[1,46],demon:[2,51],lord:[3,56],taotie:[4,78]};
  const loaded=({image})=>image.complete && image.naturalWidth>0;

  function sprite(c,atlas,i,x,y,size,flip=false) {
    const {image,columns}=atlas, cell=(image.naturalWidth||image.width)/columns;
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

  // Separate scenery lets the hand-drawn route and every playable pad stay clear.
  const scenery=[
    [0,19,65,137],[0,110,71,106,true],[0,215,77,126],[0,315,59,119],[0,416,45,84],
    [0,627,38,81,true],[0,720,66,115,true],[0,829,78,132,true],[0,936,57,117],[0,1031,74,133,true],
    [1,520,67,70],[2,520,153,43],[2,520,285,84],[2,161,229,88],[2,893,218,79,true],
    [3,42,166,156],[3,135,149,112],[3,77,254,157],[3,180,276,102],
    [3,971,143,152,true],[3,899,154,104,true],[3,1028,254,158,true],[3,862,274,100,true],
    [4,188,172,62],[4,144,304,68],[4,209,346,57],[4,115,479,88],
    [4,841,178,62,true],[4,926,311,77,true],[4,826,349,56,true],[4,920,477,83,true],
    [5,90,408,148],[5,950,410,152,true],[3,38,508,152],[3,996,522,151,true],
    [4,315,551,69],[4,718,549,71,true],[3,349,562,82],[3,693,569,91,true],
    [5,520,559,130],[4,482,507,48],[4,555,509,47,true]
  ].sort((a,b)=>a[2]-b[2]);

  function distanceToSegment(x,y,[ax,ay],[bx,by]) {
    const dx=bx-ax, dy=by-ay;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    return Math.hypot(x-ax-t*dx,y-ay-t*dy);
  }

  function paintWater(c) {
    for(const flip of [false,true]) {
      c.save();
      if(flip){c.translate(W,0);c.scale(-1,1);}
      c.beginPath();c.moveTo(-10,248);
      c.bezierCurveTo(59,253,33,318,111,338);
      c.bezierCurveTo(164,350,182,383,129,435);
      c.bezierCurveTo(96,465,77,506,-9,521);
      const stream=c.createLinearGradient(0,247,0,524);
      stream.addColorStop(0,'#678e8a');stream.addColorStop(.52,'#88bdb0');stream.addColorStop(1,'#658f87');
      for(const [width,color] of [[31,'#647e6cb3'],[28,'#bac697bf'],[23,stream]]) {
        c.lineWidth=width;c.strokeStyle=color;c.stroke();
      }
      for(const [x,y,span,tilt] of [[37,271,12,10],[55,307,14,8],[104,336,15,4],
        [137,352,13,7],[149,397,9,-12],[113,457,9,-13],[63,494,13,-6],[20,513,16,-4]]) {
        c.beginPath();c.moveTo(x-span*.5,y);c.quadraticCurveTo(x,y+tilt*.18,x+span*.5,y+tilt);
        c.lineWidth=1;c.strokeStyle='#dfecd2aa';c.stroke();
      }
      c.restore();
    }

    const jade=c.createLinearGradient(0,401,0,H);
    jade.addColorStop(0,'#a6cbaf');jade.addColorStop(.46,'#67ac9b');jade.addColorStop(1,'#427f81');
    c.beginPath();c.moveTo(519,408);
    c.bezierCurveTo(541,413,538,429,565,439);
    c.bezierCurveTo(604,462,573,486,563,508);
    c.bezierCurveTo(555,524,570,538,580,H);
    c.lineTo(461,H);
    c.bezierCurveTo(482,517,477,500,465,479);
    c.bezierCurveTo(452,457,477,448,482,432);
    c.quadraticCurveTo(490,412,519,408);c.closePath();
    c.fillStyle=jade;c.fill();c.lineWidth=5;c.strokeStyle='#76927b';c.stroke();
    c.lineWidth=2;c.strokeStyle='#c3d0a4';c.stroke();
    for(const [x,y,width] of [[518,432,28],[528,453,47],[514,485,39],[525,519,34]]) {
      c.beginPath();c.moveTo(x-width/2,y);c.quadraticCurveTo(x,y+8,x+width/2,y+2);
      c.lineWidth=1;c.strokeStyle='#d6ede1aa';c.stroke();
    }
  }

  function paintGround() {
    const c=bg, tint=c.createLinearGradient(0,0,0,H);
    for(const [stop,color] of [[0,'#55445f'],[.17,'#857c89'],[.32,'#a8a792'],
      [.54,'#a5ba87'],[.78,'#92af78'],[1,'#759979']]) tint.addColorStop(stop,color);
    c.fillStyle=tint;c.fillRect(0,0,W,H);
    if(loaded(surface)) {
      c.save();c.globalAlpha=.82;c.drawImage(surface.image,0,0,W,H);c.restore();
    }
    c.lineCap='round';c.lineJoin='round';

    c.beginPath();c.moveTo(0,105);
    c.bezierCurveTo(201,95,294,123,390,109);
    c.bezierCurveTo(461,94,478,115,520,119);
    c.bezierCurveTo(602,123,702,92,807,108);
    c.quadraticCurveTo(967,136,W,110);c.lineTo(W,0);c.lineTo(0,0);c.closePath();
    c.fillStyle='#5543593f';c.fill();

    c.beginPath();c.moveTo(0,372);
    c.bezierCurveTo(161,324,298,339,412,322);
    c.bezierCurveTo(514,302,650,340,793,335);
    c.bezierCurveTo(924,329,955,350,W,349);
    c.lineTo(W,H);c.lineTo(0,H);c.closePath();
    c.fillStyle='#d9e0a237';c.fill();

    const scars=[
      [[330,113],[341,124],[362,126],[372,137],[394,144]],
      [[646,122],[668,116],[681,126],[703,127],[717,140]],
      [[486,261],[499,256],[507,240],[526,242],[537,234]],
      [[510,273],[520,264],[532,268],[551,255]],
      [[270,200],[285,204],[302,195],[318,205]]
    ];
    for(const crack of scars) {
      path(c,crack);c.lineWidth=1.5;c.strokeStyle='#68546197';c.stroke();
      c.strokeStyle='#e2b39b7f';c.lineWidth=.65;c.stroke();
    }

    paintWater(c);

    const segments=roads.flatMap(road=>road.slice(1).map((point,i)=>[road[i],point]));
    let seed=2417;
    const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    for(let i=0;i<480;i++) {
      const x=rand()*W,y=rand()*H;
      if((y>408&&x>446&&x<598) || slots.some(p=>Math.hypot(p.x-x,p.y-y)<19) ||
         segments.some(([a,b])=>distanceToSegment(x,y,a,b)<20)) continue;
      const size=1.2+rand()*3.1, human=y>230;
      if(i%3===0) {
        path(c,[[x-size,y],[x-size*.36,y-size*.58],[x,y],[x+size*.52,y-size*.74]]);
        c.strokeStyle=human?'#67855a98':'#62556368';c.lineWidth=.72;c.stroke();
      } else {
        ellipse(c,x,y,size,size*.31,human?(i%2?'#72976569':'#faf0b899'):'#77687555');
      }
    }

    const roadDust=c.createLinearGradient(0,49,0,H);
    roadDust.addColorStop(0,'#ccb2a4');roadDust.addColorStop(.47,'#edd7a9');roadDust.addColorStop(1,'#f2e3b6');
    for(const [width,color] of [[33,'#4e463b43'],[30,'#735f50'],[27,'#bc9f77'],[23,roadDust],[.85,'#947e5b8e']]) {
      c.strokeStyle=color;c.lineWidth=width;
      if(width<2) c.setLineDash([1.5,8.5]);
      for(const road of roads){path(c,road);c.stroke();}
    }
    c.setLineDash([]);

    if(loaded(terrain)) {
      for(const [id,x,y,size,flip] of scenery) {
        if(id!==1) ellipse(c,x,y-2,size*.26,Math.max(2,size*.035),'#32403832');
        sprite(c,terrain,id,x,y,size,flip);
      }
    } else {
      ellipse(c,520,49,22,16,'#45374d');
      ring(c,520,42,17,'#ab84b8',1.7);
    }
    for(const pos of slots) drawPlatform(c,pos);
  }

  function drawPlatform(c,{x,y}) {
    const shaded=y<225;
    ellipse(c,x,y+4,14,5.6,'#35493650');
    poly(c,[[x-13,y],[x-7,y-4],[x+8,y-4],[x+13,y],[x+10,y+5],[x-10,y+5]],
      shaded?'#686573':'#697965','#42483e');
    poly(c,[[x-13,y],[x-6,y-6],[x+6,y-6],[x+13,y],[x+7,y+2],[x-7,y+2]],
      shaded?'#c4aeac':'#ccd6a7','#4d5647');
    path(c,[[x-6,y],[x,y-3.6],[x+6,y-.1]]);
    c.strokeStyle='#748f77';c.lineWidth=.75;c.stroke();
    ellipse(c,x,y-2,2.8,1.05,'#98d3b5');
  }

  paintGround();
  for(const art of [surface,terrain]) if(!loaded(art)) art.image.addEventListener('load',paintGround,{once:true});

  const wear=[];
  function paintEnemyWear() {
    const {image,columns}=combat;
    for(const tone of ['saturate(.82) brightness(.96)','saturate(.64) brightness(.86)']) {
      const layer=document.createElement('canvas');
      layer.width=image.naturalWidth;layer.height=image.naturalHeight;
      const brush=layer.getContext('2d');
      brush.filter=tone;
      brush.drawImage(image,0,0);
      wear.push({image:layer,columns});
    }
  }
  if(loaded(combat)) paintEnemyWear();
  else combat.image.addEventListener('load',paintEnemyWear,{once:true});

  function drawWear(c,size,dir,level,ghost) {
    if(!level) return;
    const x=dir*size*.03, y=-size*.39, w=size*.11;
    const marks=[[[x-w,y-w*.6],[x-w*.32,y+w*.2],[x+w*.08,y],[x+w*.53,y+w*.6]]];
    if(level===2) marks.push([[x-w*1.35,y+w*.35],[x-w*.61,y+w*.63],[x-w*.52,y+w*1.2]]);
    for(const crack of marks) {
      path(c,crack);c.lineWidth=1.65;c.strokeStyle=ghost?'#33556c':'#3a2a29';c.stroke();
      c.lineWidth=.7;c.strokeStyle=ghost?'#ace3ea':'#edb888';c.stroke();
    }
  }

  function drawEnemy(c,e,time) {
    const {x,y}=e, spec=Rules.enemies[e.type], [i,size]=enemyArt[e.type], r=spec.radius;
    const quiet=reducedMotion.matches, ghost=e.type==='ghost';
    const life=e.hp/e.maxHp, injury=life<=.26?2:life<=.60?1:0;
    c.save();
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
      const alt=!quiet && gait>=.36 && gait<.83 && !(e.devourAt>time);
      const lift=quiet || stopped ? 0 : Math.sin(gait*Math.PI*2)*(ghost?2.4:1.5)*(injury===2 ? .57 : 1);
      const hit=e.hitAt!=null?Math.max(0,1-(time-e.hitAt)*7):0;
      const flip=ahead.x<behind.x, dir=flip?-1:1;
      c.save();
      c.translate(x+(quiet?0:-dir*hit*2.9),y+4-lift-(ghost?4:0));
      if(!quiet) {c.rotate(dir*((injury===2 ? .064 : 0)-hit*.095));c.scale(1+hit*.035,1-hit*.057);}
      sprite(c,wear[injury-1]||combat,i+(alt?5:0),0,0,size,flip);
      drawWear(c,size,dir,injury,ghost);
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
      const action=guardianArt(player.hero,'cast');
      const actionFrame=loaded(action.atlas) && progress>=.12 && progress<.78;
      const {atlas,index}=actionFrame?action:guardianArt(player.hero,'stand');
      const impulse=Math.sin(Math.PI*progress), recoil=leaks[side]?Math.max(0,1-2.8*BattleFX.phase(leaks[side],time)):0;
      const breath=quiet?0:Math.sin(time*2.8+side*1.7);
      const offset=quiet?0:dir*(impulse*(progress<.13?-3:5)-recoil*6);
      ellipse(c,x,y+2,19,5,'#24302b7a');
      if(loaded(atlas)) {
        c.save();c.translate(x+offset,y+5);
        if(!quiet) {
          c.rotate(dir*(recoil*.13+(progress<.13?-.10:.045)*impulse));
          c.scale(1+impulse*.027,1+breath*.022-impulse*(actionFrame ? .015 : .036)-recoil*.055);
        }
        sprite(c,atlas,index,0,0,92,side===1);
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
        const shaft=t.type==='spear'?(move.flip?-1:1)*size*.35:0;
        c.save();c.translate(x+move.dx+shaft,y-1-move.lift);c.rotate(move.turn);c.scale(1,move.scaleY);
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
      const animated=f.kind==='attack'||f.kind==='harvest'||f.kind==='cast'||f.kind==='sealStrike';
      const tracked=f.kind==='attack' && f.type==='seal' ? s.enemies.find(enemy=>enemy.id===f.target) : null;
      if(animated) BattleFX.front(c,f,time,reducedMotion.matches,tracked);
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

  function guardianArt(hero,pose) {
    const revised=revisedGuardianIds.indexOf(hero);
    if(revised>=0) {
      const row=pose==='face'?2:pose==='cast'?1:0;
      return {atlas:revisions,index:row*2+revised};
    }
    const atlas=pose==='face'?guardianFaces:pose==='cast'?castPoses:guardians;
    return {atlas,index:guardianIds.indexOf(hero)};
  }

  function guardianPortrait(element,hero,face=false) {
    const {atlas,index}=guardianArt(hero,face?'face':'stand'), {columns,rows}=atlas;
    const x=(index%columns)/(columns-1)*100, y=Math.floor(index/columns)/(rows-1)*100;
    element.style.backgroundImage='url("'+atlas.src+'")';
    element.style.backgroundSize=(columns*100)+'% '+(rows*100)+'%';
    element.style.backgroundPosition=x+'% '+y+'%';
  }
  globalThis.BoardArt={draw,colors,guardianPortrait};
})();
