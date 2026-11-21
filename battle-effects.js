(() => {
  'use strict';

  const TAU=Math.PI*2, ink='#22202d';
  const clamp=n=>Math.max(0,Math.min(1,n));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>1-(1-clamp(t))**3;
  const phase=(f,time)=>clamp((time-f.at)/f.duration);
  const aura={
    jingwei:'#ffb67b',houyi:'#ffda78',nuwa:'#8fffe5',kuafu:'#ffc674',
    shennong:'#bcf77c',dayu:'#80e2ff',lei:'#cab2ff',changxi:'#e0daff'
  };

  function line(c,pts,stroke,width) {
    c.beginPath();
    c.moveTo(...pts[0]);
    for(let i=1;i<pts.length;i++) c.lineTo(...pts[i]);
    c.lineCap='round';c.lineJoin='round';c.strokeStyle=stroke;c.lineWidth=width;c.stroke();
  }
  function oval(c,x,y,rx,ry,color,width=0) {
    if(rx<=0 || ry<=0) return;
    c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);
    if(width){c.strokeStyle=color;c.lineWidth=width;c.stroke();}
    else {c.fillStyle=color;c.fill();}
  }
  function shape(c,points,fill,stroke,width=1) {
    c.beginPath();c.moveTo(...points[0]);
    for(let i=1;i<points.length;i++) c.lineTo(...points[i]);
    c.closePath();c.fillStyle=fill;c.fill();
    if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  function diamond(c,x,y,size,color,outline=ink) {
    shape(c,[[x,y-size],[x+size*.6,y],[x,y+size],[x-size*.6,y]],color,outline,.85);
  }
  function flare(c,x,y,r,color) {
    const points=Array.from({length:8},(_,i)=>{
      const a=i*Math.PI/4, s=i%2?r*.22:r;
      return [x+Math.cos(a)*s,y+Math.sin(a)*s];
    });
    shape(c,points,color);
    oval(c,x,y,r*.14,r*.14,'#fff9db');
  }
  function flecks(c,x,y,p,color,count,spread) {
    for(let i=0;i<count;i++){
      const a=i*2.39996, travel=ease(p)*(14+(i%4)*spread);
      const rise=14*p*(2-p)+(i%3)*p*2;
      diamond(c,x+travel*Math.cos(a),y+travel*.44*Math.sin(a)-rise,
        (2.4+i%3*.55)*(1-.73*p),color);
    }
  }
  function lightning(c,x,y,endX,endY,seed,weight,color='#81dfff') {
    const points=[[x,y]], dx=endX-x, dy=endY-y, length=Math.hypot(dx,dy)||1;
    for(let i=1;i<6;i++){
      const bend=Math.sin(i*5.63+seed*7.1)*(5+weight)*Math.sin(Math.PI*i/6);
      points.push([x+dx*i/6-dy/length*bend,y+dy*i/6+dx/length*bend]);
    }
    points.push([endX,endY]);
    line(c,points,'#2c4e82',weight+4);
    line(c,points,color,weight+1.6);
    line(c,points,'#f5fcff',Math.max(1,weight*.48));
  }

  function bell(c,f,p,quiet) {
    const {x,y,tx,ty}=f, px=tx, py=ty-13;
    const [dx,dy]=[tx-x,ty-y], aim=Math.atan2(dy,dx);
    c.save();
    c.globalAlpha*=1-p*.65;
    for(let i=0;i<3;i++){
      const step=clamp(p*1.9-i*.31);
      if(step<=0 || step===1) continue;
      const r=7+ease(step)*27;
      oval(c,px,py, r,r*(.57+i*.085),i%2?'#fff0a5':'#92ffe0',2.5-step);
      oval(c,px,py, r+3.8,(r+3.8)*(.57+i*.085),'#1f665c70',1);
      if(!quiet) oval(c,x+dx*step,y-19+dy*step,5+step*10,3+step*6,'#defed5a0',1.3);
    }
    c.translate(px,py);c.rotate(aim-Math.PI/8);
    if(p<.44) flare(c,0,0,8+12*Math.sin(p*Math.PI),'#fff4be');
    c.restore();
  }

  function cauldron(c,f,p,quiet) {
    const {x,y}=f;
    c.save();
    c.globalAlpha*=1-p*.76;
    for(let i=0;i<(quiet?5:10);i++){
      const t=clamp(p*1.35-i*.055), a=i*2.39996+t*4.3;
      const span=7+Math.sin(Math.PI*t)*24;
      const px=x+Math.cos(a)*span, py=y-23-66*ease(t)+Math.sin(a)*5;
      if(t>0) diamond(c,px,py,2.6+Math.sin(t*Math.PI)*3.8,i%2?'#eed1ff':'#bd86ff');
    }
    const rise=54*ease(p);
    flare(c,x,y-30-rise,Math.max(3,12*(1-p)),'#f5d4ff');
    c.restore();
  }

  function bow(c,f,p) {
    const dx=f.tx-f.x, fromX=f.x+Math.sign(dx)*13, fromY=f.y-27, toY=f.ty-14;
    const height=24+Math.min(23,Math.hypot(dx,toY-fromY)*.16);
    const point=t=>[lerp(fromX,f.tx,t),lerp(fromY,toY,t)-4*height*t*(1-t)];
    const u=ease(p/.62), tip=point(u);
    c.save();
    c.globalAlpha*=1-p*.67;
    const n=9, back=Math.max(0,u-.37-p*.15);
    const tail=Array.from({length:n},(_,i)=>point(lerp(back,u,i/(n-1))));
    line(c,tail,'#b572287e',7*(1-p)+1);
    line(c,tail,'#ffce53',3.3*(1-p)+.7);
    line(c,tail,'#fff6cb',1.2);
    if(p<.65) {
      const pre=point(Math.max(0,u-.05));
      c.save();c.translate(...tip);c.rotate(Math.atan2(tip[1]-pre[1],tip[0]-pre[0]));
      shape(c,[[-19,0],[-6,-2],[-6,-5],[7,0],[-6,5],[-6,2]],'#ffe37c','#a85829');
      c.restore();
    }
    if(p>.32) {
      const q=clamp((p-.32)/.68);
      flare(c,f.tx,toY,11+7*Math.sin(Math.PI*q),'#fff0a5');
      flecks(c,f.tx,toY,q,'#ffcf59',5,4);
    }
    c.restore();
  }

  function seal(c,f,p,quiet) {
    const r=f.radius, x=f.tx, y=f.ty, seed=Math.floor(p*12);
    c.save();
    c.globalAlpha*=1-p*.86;
    const strikes=quiet?2:5;
    for(let i=0;i<strikes;i++){
      const delay=i*.076;
      if(p<delay || p>delay+.53) continue;
      const a=i*TAU/5-.9, reach=i===0?r*.1:r*.59;
      const tx=x+Math.cos(a)*reach, ty=y+Math.sin(a)*reach;
      lightning(c,tx-11+i*4,ty-63-(i%2)*16,tx,ty,seed+i,2.8);
      flare(c,tx,ty-2,9,'#bdeeff');
    }
    flecks(c,x,y-9,p,'#8bd5ff',quiet?3:7,9);
    c.restore();
  }

  function flame(c,x,y,h,lean,color,inner) {
    c.beginPath();
    c.moveTo(x-h*.27,y);
    c.bezierCurveTo(x-h*.56,y-h*.49,x+lean-h*.12,y-h*.58,x+lean,y-h);
    c.quadraticCurveTo(x+lean+h*.28,y-h*.72,x+lean*.69+h*.07,y-h*.50);
    c.quadraticCurveTo(x+lean+h*.32,y-h*.62,x+h*.32,y-h*.28);
    c.quadraticCurveTo(x+h*.43,y-h*.13,x+h*.25,y);
    c.closePath();c.fillStyle=color;c.fill();c.strokeStyle='#7a3432';c.lineWidth=.9;c.stroke();
    c.beginPath();c.moveTo(x-h*.07,y);
    c.quadraticCurveTo(x-h*.17,y-h*.19,x+lean*.55,y-h*.56);
    c.quadraticCurveTo(x+h*.23,y-h*.20,x+h*.14,y);
    c.closePath();c.fillStyle=inner;c.fill();
  }

  function spear(c,f,p,quiet) {
    const x=f.tx,y=f.ty-13, a=Math.atan2(f.ty-f.y,f.tx-f.x);
    c.save();
    c.globalAlpha*=1-p*.84;
    c.translate(x,y);c.rotate(a-.2);
    const r=9+ease(p)*20, open=1.12+p*.28;
    c.beginPath();
    c.arc(-9,0,r,-open,open);
    c.quadraticCurveTo(r*.30,r*.44,r*.54-8,0);
    c.quadraticCurveTo(r*.32,-r*.42,Math.cos(open)*r-9,-Math.sin(open)*r);
    c.closePath();c.fillStyle='#ff6940';c.fill();c.strokeStyle='#9f382e';c.lineWidth=1.5;c.stroke();
    c.beginPath();c.arc(-9,0,r-3,-open*.73,open*.73);
    c.strokeStyle='#fff096';c.lineWidth=2.1;c.stroke();
    c.restore();
    c.save();
    c.globalAlpha*=1-p;
    for(let i=0;i<(quiet?2:4);i++){
      const lift=17*ease(p)+i*2.3;
      flame(c,x-13+i*8,y+8-lift,10+(i%2)*4,(i-2)*2,'#ff834a','#ffe7a3');
    }
    c.restore();
  }

  function hammer(c,f,p,quiet) {
    const x=f.tx,y=f.ty;
    c.save();c.globalAlpha*=1-p*.88;
    if(p<.55) {
      const a=Math.atan2(f.ty-f.y,f.tx-f.x);
      const length=20+ease(p)*16;
      const tipX=x+Math.cos(a)*length, tipY=y+Math.sin(a)*length;
      lightning(c,x,y-13,tipX,tipY-13,1+Math.floor(p*10),2.2,'#ffcc70');
      flare(c,x,y-12,20*(1-p)+3,'#ffda74');
    }
    for(let i=0;i<(quiet?3:8);i++){
      const a=i*2.39996, span=ease(p)*(11+(i%4)*8);
      const px=x+Math.cos(a)*span, py=y+Math.sin(a)*span*.59-Math.sin(p*Math.PI)*25;
      const size=(3+i%3)*(1-p*.65);
      shape(c,[[px-size,py],[px,py-size],[px+size,py-1],[px+size*.5,py+size*.55]],i%2?'#df9a54':'#ffe0a1',ink);
    }
    c.restore();
  }

  function cast(c,f,p,quiet) {
    const tint=aura[f.hero];
    c.save();
    c.globalAlpha*=.96*(1-p);
    const x=f.x+(f.side===0?1:-1)*(20+8*ease(p)), y=f.y-45-14*p;
    flare(c,x,y,15*Math.sin(Math.PI*p)+3,tint);
    flecks(c,x,y,p,tint,quiet?4:8,6);
    c.restore();
  }

  const attacks={bell,bow,seal,spear,hammer};
  function front(c,f,time,quiet) {
    const p=phase(f,time);
    if(p>=1) return;
    if(f.kind==='harvest') cauldron(c,f,p,quiet);
    else if(f.kind==='cast') cast(c,f,p,quiet);
    else if(f.kind==='attack') attacks[f.type]?.(c,f,p,quiet);
  }

  function ground(c,f,time) {
    const p=phase(f,time);
    if(p>=1) return;
    const a=ease(p);
    c.save();
    c.globalAlpha*=1-p;
    if(f.kind==='attack' && f.type==='seal') {
      const {tx:x,ty:y,radius:r}=f;
      oval(c,x,y,r,r,'#51a2ff34');
      oval(c,x,y,r,r,'#214773',3);
      c.setLineDash([9,5]);
      oval(c,x,y,r-1,r-1,'#a7edff',2);
      c.setLineDash([]);
      oval(c,x,y,Math.max(3,a*r*.93),Math.max(3,a*r*.93),'#99e0ff9c',1.7);
      for(let i=0;i<5;i++){
        const angle=i*TAU/5-Math.PI/2;
        diamond(c,x+Math.cos(angle)*r,y+Math.sin(angle)*r,4.4,'#c4f4ff');
      }
    } else if(f.kind==='attack' && f.type==='hammer') {
      const {tx:x,ty:y,radius:r}=f;
      oval(c,x,y,r*a+1,r*a*.8+1,'#583b37',3);
      oval(c,x,y,r*a+2,r*a*.8+2,'#ffcf73',1.9);
      for(let i=0;i<5;i++){
        const angle=i*TAU/5+.35, rx=Math.cos(angle)*r*a, ry=Math.sin(angle)*r*a*.8;
        const points=[[x,y],[x+rx*.43-ry*.24,y+ry*.44+rx*.13],[x+rx*.68,y+ry*.60],[x+rx,y+ry]];
        line(c,points,'#5c4641',2.3);
        if(p<.7) line(c,points,'#ffdf99',1.0);
      }
    } else if(f.kind==='attack' && f.type==='bell') {
      oval(c,f.tx,f.ty,8+a*20,4+a*11,'#537c66',3);
      oval(c,f.tx,f.ty,8+a*20,4+a*11,'#e1ffbd',1.6);
    } else if(f.kind==='harvest') {
      oval(c,f.x,f.y,9+a*32,4+a*12,'#724ca0',3);
      oval(c,f.x,f.y,9+a*32,4+a*12,'#f0d5ff',1.8);
    } else if(f.kind==='cast') {
      const tint=aura[f.hero];
      oval(c,f.x,f.y,17+a*34,7+a*17,tint+'76');
      oval(c,f.x,f.y,17+a*34,7+a*17,tint,1.75);
    }
    c.restore();
  }

  function ailments(c,e,time,quiet) {
    if(e.burns?.some(b=>b && b.until>=time)){
      for(let i=0;i<(quiet?2:3);i++) {
        const t=quiet?0:Math.floor(time*13+i*2);
        const h=9+(i+(t%3))*2;
        flame(c,e.x+(i-1)*8,e.y+1-i*1.8,h,Math.sin(t+i)*2.5,'#fe693b','#ffe399');
      }
    }
    if(e.stunUntil>time){
      const r=Rules.enemies[e.type].radius;
      oval(c,e.x,e.y+3,r+3,5,'#63caff',1.7);
      const offset=quiet?0:Math.sin(time*20+e.id)*3;
      diamond(c,e.x+r*.7+offset,e.y-r*.55,4,'#b7f5ff','#2d62a4');
      diamond(c,e.x-r*.65,e.y-r*.75+offset,2.9,'#edfaff','#2d62a4');
    }
  }

  function weaponPose(t,f,time,id,quiet) {
    const flip=(t.facing??(id%2?-1:1))<0;
    const dir=flip?-1:1, p=f?phase(f,time):1;
    const active=p<1?Math.sin(Math.PI*p):0, idle=quiet?0:Math.sin(time*2.8+id*.44);
    let lift=0, turn=0, forward=0, scaleY=1;
    switch(t.type) {
      case 'bell': lift=2+idle*1.2;turn=.19*Math.sin(21*p)*(1-p);break;
      case 'cauldron': lift=idle*.8+4*active;scaleY=1+.06*active;break;
      case 'bow': forward=-7*active*(1-p);turn=-.17*active;break;
      case 'seal': lift=4+idle*1.6+6*active;turn=.13*active;break;
      case 'spear': forward=9*(1-p)*Math.sin(Math.PI*clamp(p*1.55));turn=.35*active*(1-p);break;
      case 'hammer': lift=4*Math.sin(Math.PI*clamp(p*2.25));turn=.48*active*Math.cos(p*11);break;
    }
    return {flip,dx:quiet?0:forward*dir,lift,turn:quiet?0:turn*dir,scaleY};
  }

  globalThis.BattleFX={front,ground,ailments,weaponPose,phase};
})();
