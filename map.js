(function () {
  'use strict';
  const {W,H,upper,lower,mirror,gates,slots}=Rules.board, colors=['#91e0d3','#f2c090'];
  const land=document.createElement('canvas');land.width=W;land.height=H;
  const bg=land.getContext('2d');
  const path=(c,line)=>{c.beginPath();line.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));};
  const ellipse=(c,x,y,a,b,color)=>{c.beginPath();c.ellipse(x,y,a,b,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
  const ring=(c,x,y,r,color,width=1)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  const poly=(c,pts,fill)=>{path(c,pts);c.closePath();c.fillStyle=fill;c.fill();};
  const text=(c,t,x,y,color,size=13)=>{c.textAlign='center';c.font=size+'px "Microsoft YaHei", sans-serif';c.fillStyle=color;c.fillText(t,x,y);};
  let seed=4452;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const roads=[upper,upper.map(mirror),lower,lower.map(mirror)];
  const backdrop=bg.createLinearGradient(0,0,0,H);backdrop.addColorStop(0,'#43584b');backdrop.addColorStop(.50,'#31483e');backdrop.addColorStop(1,'#1b332e');
  bg.fillStyle=backdrop;bg.fillRect(0,0,W,H);
  for(let i=0;i<3000;i++){
    const x=rand()*W,y=rand()*H,a=rand()*2.4;
    ellipse(bg,x,y,a,a*.65,i&1?'#e3ddaf12':'#101e1850');
  }
  for(let side=0;side<2;side++){
    bg.save();if(side){bg.translate(W,0);bg.scale(-1,1);}
    bg.fillStyle=side?'#b1805520':'#84bcb217';bg.fillRect(0,0,W/2,H);
    for(let i=0;i<11;i++){
      const j=i*20;
      bg.strokeStyle=i%3?'#a7baa020':'#a9c0a035';bg.lineWidth=1;
      bg.beginPath();bg.moveTo(-20,8+j);
      bg.bezierCurveTo(93+j,-43+j,104+j,173+j*.33,152+j*.28,222+j*.44);
      bg.bezierCurveTo(207+j*.44,299+j*.5,37+j*.21,330+j*.66,-20,407+j*.33);
      bg.stroke();
    }
    for(let i=0;i<27;i++){
      const t=i/26, x=t*360-28,y=28+43*t+rand()*24,h=18+rand()*52,w=11+rand()*24;
      poly(bg,[[x-w,y],[x-4,y-h],[x+4,y-h-8],[x+w,y]],i&1?'#253b32':'#30463b');
      poly(bg,[[x-4,y-h],[x+4,y-h-8],[x+w,y],[x+4,y-10]],'#81917a29');
    }
    for(let j=0;j<24;j++){
      const t=j/23,x=16+40*Math.sin(t*5)+j*4,y=92+t*408,h=12+rand()*25;
      path(bg,[[x,y],[x,y-h*.81]]);bg.lineWidth=2;bg.strokeStyle='#27332a';bg.stroke();
      for(let k=0;k<3;k++) poly(bg,[[x-h*.32+k*1.5,y-h*(.16+k*.22)],[x,y-h*(.53+k*.235)],[x+h*.37-k*1.4,y-h*(.15+k*.22)]],k%2?'#385247':'#263c33');
    }
    bg.restore();
  }
  for(const [x,y,rx,ry] of [[520,189,104,56],[520,471,72,33],[151,298,83,24],[889,298,83,24]]){
    ellipse(bg,x,y,rx,ry,'#213c37');
    for(let i=0;i<4;i++) {bg.beginPath();bg.ellipse(x,y,rx-i*9,ry-i*4,0,Math.PI*.12,Math.PI*1.76);bg.strokeStyle='#99c0aa29';bg.lineWidth=1;bg.stroke();}
  }
  function grove(x,y,scale,palette) {
    ellipse(bg,x+4*scale,y+1,24*scale,8*scale,'#16292390');
    path(bg,[[x,y],[x-2*scale,y-21*scale],[x+1*scale,y-38*scale]]);
    bg.strokeStyle='#78654b';bg.lineWidth=2.8*scale;bg.stroke();
    for(const [dx,dy,rx,ry,i] of [[-10,-19,13,7,0],[8,-23,14,8,1],[-8,-30,13,7,1],[3,-37,12,6,2]]) {
      ellipse(bg,x+dx*scale,y+dy*scale,rx*scale,ry*scale,palette[i]);
    }
  }
  for(let side=0;side<2;side++) {
    const palette=side?['#614f37','#8b6e47','#b08150']:['#294942','#456b57','#71927a'];
    for(const [x,y,scale] of [[205,117,1],[173,167,.86],[188,228,1.18],[132,257,.93],[252,288,.95],
      [265,315,.72],[178,354,1.22],[171,406,1.1],[121,442,.79],[283,467,.72],[377,517,.87],[484,518,.59]]) {
      grove(side ? W-x : x,y,scale,palette);
    }
    for(const [x,y] of [[265,84],[270,168],[280,255],[200,334],[320,375],[424,510]]) {
      const px=side?W-x:x;
      ellipse(bg,px+3,y+3,9,4,'#152a238f');
      poly(bg,[[px-8,y+4],[px-6,y-5],[px,y-9],[px+7,y-3],[px+9,y+4]],'#686d5a');
      poly(bg,[[px-6,y-5],[px,y-9],[px+7,y-3],[px,y]],'#aaa88a7a');
    }
  }
  bg.lineCap='round';bg.lineJoin='round';
  for(const [width,color,pattern] of [[33,'#192f2b',[]],[26,'#687465',[]],[21,'#a4a18a',[]],[14,'#858674',[]],[1.4,'#d5d3ab93',[3,9]]]){
    bg.strokeStyle=color;bg.lineWidth=width;bg.setLineDash(pattern);
    for(const road of roads){path(bg,road);bg.stroke();}
  }
  bg.setLineDash([]);
  for(const p of [[520,106],[520,270],[520,399]]){ellipse(bg,...p,11,11,'#b3b193');ring(bg,...p,7,'#465c50',2);ellipse(bg,...p,2,2,'#435c50');}
  for(const [x,y,s,angle] of [[383,106,0,Math.PI],[657,106,1,0],[424,270,0,0],[616,270,1,Math.PI],[412,399,0,Math.PI],[628,399,1,0]]){
    bg.save();bg.translate(x,y);bg.rotate(angle);poly(bg,[[-5,-4],[4,0],[-5,4],[-3,0]],colors[s]);bg.restore();
  }
  for(const [x,y,label] of [[520,84,'雙岔'],[520,295,'匯流'],[520,426,'分關']]){
    bg.fillStyle='#223b34e0';bg.fillRect(x-27,y-16,54,20);text(bg,label,x,y-1,'#ddd8b6',13);
  }
  function gate(c,x,y,color,name,isEntrance=false){
    ellipse(c,x,y+2,31,25,'#162d27');ellipse(c,x,y,25,19,'#596154');
    ring(c,x,y,21,color+'a0',1.2);ring(c,x,y,16,color+'80',1);
    poly(c,[[x-14,y+7],[x-14,y-7],[x,y-18],[x+14,y-7],[x+14,y+7]],'#20382e');
    poly(c,[[x-17,y-5],[x,y-21],[x+17,y-5],[x+9,y-7],[x,y-15],[x-9,y-7]],color);
    c.fillStyle=color;c.fillRect(x-3,y-6,6,13);
    text(c,name,isEntrance?x+49:x,isEntrance?y+5:y+40,color,14);
  }
  gate(bg,...upper[0],'#cba6f0','鬼門',true);
  const load = source => {
    const image = new Image();
    image.src = source;
    return image;
  };
  const battlefield=load('assets/huilong-open.webp');
  const nuwa=load('assets/nuwa-field.webp');
  const roster=load('assets/guardians-field.webp');
  const atlasIds=['jingwei','houyi','kuafu','fuxi','shennong','dayu','lei','changxi','xuannv'];
  const loaded=image=>image.complete && image.naturalWidth>0;
  function zone(c,label,x,y,color) {
    c.fillStyle='#17221ed9';c.fillRect(x-31,y-16,62,23);
    text(c,label,x,y,color,13);
  }
  function drawTerrain(c) {
    c.drawImage(loaded(battlefield)?battlefield:land,0,0,W,H);
    c.save();
    c.lineCap='round';c.lineJoin='round';
    c.strokeStyle='#715a4656';c.lineWidth=1.6;c.setLineDash([4,9]);
    for (const line of roads) {path(c,line);c.stroke();}
    c.setLineDash([]);
    for (const pos of slots) {
      const {x,y}=pos;
      ellipse(c,x,y+3,16,7,'#4b4a3473');
      poly(c,[[x-14,y],[x-8,y-5],[x+8,y-6],[x+15,y-1],[x+11,y+5],[x-6,y+6]],'#9f987c');
      poly(c,[[x-14,y],[x-8,y-5],[x+8,y-6],[x+15,y-1],[x-1,y-1]],'#bfb194');
      path(c,[[x-2,y-5],[x-1,y-1],[x+3,y+1],[x+2,y+4]]);
      c.strokeStyle='#655d48';c.lineWidth=1;c.stroke();
      ellipse(c,x-12,y+6,3,1.4,'#c2b28a');
      ellipse(c,x+14,y+5,2.7,1.3,'#887d5f');
    }
    zone(c,'魔界裂隙',622,34,'#e8c5ff');
    zone(c,'前沿哨位',392,92,'#ffe2b0');
    c.restore();
  }
  function drawGuardians(c,state) {
    for (const [side,player] of state.players.entries()) {
      const [x,y]=gates[side];
      const size=97;
      ellipse(c,x,y+1,17,5,'#211f19a0');
      c.save();
      c.translate(x,y+5);
      if (player.hero==='nuwa'?side===0:side===1) c.scale(-1,1);
      if (player.hero==='nuwa' && loaded(nuwa)) {
        const width=size*nuwa.naturalWidth/nuwa.naturalHeight;
        c.drawImage(nuwa,-width/2,-size,width,size);
      } else if (loaded(roster) && atlasIds.includes(player.hero)) {
        const i=atlasIds.indexOf(player.hero), w=roster.naturalWidth/3, h=roster.naturalHeight/3;
        c.drawImage(roster,i%3*w,Math.floor(i/3)*h,w,h,-size*.49,-size*1.015,size*.98,size*1.12);
      } else {
        poly(c,[[-13,-4],[-8,-27],[-4,-33],[4,-33],[10,-27],[14,-4]],'#414a3d');
        ellipse(c,0,-36,6,7,'#eadbc1');
        text(c,Rules.heroes[player.hero].glyph,0,-13,colors[side],12);
      }
      c.restore();
      c.font='bold 12px "Microsoft YaHei", sans-serif';c.textAlign='center';
      const label=Rules.heroes[player.hero].name;
      c.lineWidth=3;c.strokeStyle='#232c21';c.strokeText(label,x,y+17);
      c.fillStyle=colors[side];c.fillText(label,x,y+17);
    }
  }
  function draw(c,s,aim) {
    drawTerrain(c);
    for (const [side,player] of s.players.entries()) {
      if (!player.spirit) continue;
      const spirit=Rules.spirits[player.spirit.kind], anchor=Rules.board.slots[player.spirit.slot];
      if (anchor) {
        ellipse(c,anchor.x,anchor.y,spirit.radius,spirit.radius,colors[side]+'12');
        ring(c,anchor.x,anchor.y,spirit.radius,colors[side]+'70',1.25);
        text(c,spirit.name,anchor.x,anchor.y-29,colors[side],13);
      } else {
        const [x,y]=gates[side];
        text(c,spirit.name,x+(side===0?-40:40),y-13,colors[side],13);
      }
    }
    if(aim?.slot!=null){
      const pos=Rules.board.slots[aim.slot];ellipse(c,pos.x,pos.y,aim.range,aim.range,'#d1f9d215');
      ring(c,pos.x,pos.y,aim.range,'#e4f5c78f');
    }
    for(const f of s.effects) if(f.kind==='field') {
      ellipse(c,f.x,f.y,f.radius,f.radius,colors[f.side]+'36');
      for(let i=0;i<2;i++)ring(c,f.x,f.y,f.radius-i*8,colors[f.side]+'d0',i+1);
      c.save();c.translate(f.x,f.y);c.rotate(s.time/2);
      const oct=Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*f.radius*.79,Math.sin(i*Math.PI/4)*f.radius*.79]);
      path(c,[...oct,oct[0]]);c.stroke();c.restore();
    }
    for(const e of s.enemies) {
      const m=Rules.enemies[e.type], r=m.radius;
      if(m.devour) ring(c,e.x,e.y,r+4,'#ed9b74',1.6);
      ellipse(c,e.x,e.y+4,r+3,r*.7,'#142b23ae');
      ellipse(c,e.x,e.y,r,r,m.color);ring(c,e.x,e.y,r,'#2c392e',1.5);
      text(c,m.glyph,e.x,e.y+r*.35,'#2a3229',Math.round(r*1.28));
      if(e.hp<e.maxHp) {
        c.fillStyle='#172520';c.fillRect(e.x-r,e.y-r-5,2*r,3);
        c.fillStyle=m.color;c.fillRect(e.x-r,e.y-r-5,2*r*e.hp/e.maxHp,3);
      }
      poly(c,[[e.x-3,e.y+r+4],[e.x+3,e.y+r+4],[e.x,e.y+r+8]],colors[e.gate]);
    }
    drawGuardians(c,s);
    for(const f of s.effects){
      const p=Math.max(0,Math.min(1,(s.time-f.at)/f.duration)), color=colors[f.side];
      c.save();c.globalAlpha=1-p;
      if(f.kind==='shot'){
        path(c,[[f.x,f.y],[f.tx,f.ty]]);c.strokeStyle=Rules.towers[f.type].color;c.lineWidth=f.type==='thunder'?3:1.5;c.stroke();
        ellipse(c,f.tx,f.ty,4+p*12,4+p*12,Rules.towers[f.type].color+'72');
      }else if(f.kind!=='field'){
        if(f.kind!=='bounty') ring(c,f.x,f.y,(f.radius||29)*(.4+.65*p),f.type==='phoenix'?'#ffd084':color,2);
        if(f.text){c.font='bold 15px "Microsoft YaHei",sans-serif';c.textAlign='center';c.strokeStyle='#11231d';c.lineWidth=3;c.strokeText(f.text,f.x,f.y-14-p*17);c.fillStyle=color;c.fillText(f.text,f.x,f.y-14-p*17);}
      }
      c.restore();
    }
  }
  globalThis.BoardArt={draw,colors};
})();
