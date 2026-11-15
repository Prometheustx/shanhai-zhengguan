(() => {
  'use strict';
  const R=Rules, $=id=>document.getElementById(id);
  const board=$('board'), c=$('map').getContext('2d'), dialog=$('dialog'), body=$('dialogBody');
  const mark=$('dragMark');
  const names=['左关','右关'];
  let game=new Engine.Game(), s=game.state, side=0, session=null, online=[false,false], restart=[false,false];
  let picked=null, from=null, hover=null, targeting=null, drag=null, lastUI='', lastSlots='', last=performance.now(), acc=0;
  const slotButtons=R.board.slots.map(slot=>{
    const btn=document.createElement('button');
    btn.type='button';btn.className='slot';btn.dataset.slot=slot.id;
    btn.style.left=100*slot.x/R.board.W+'%';btn.style.top=100*slot.y/R.board.H+'%';
    $('slots').append(btn);
    btn.addEventListener('click',()=>onSlot(slot.id));
    btn.addEventListener('pointerenter',()=>hover=slot.id);
    btn.addEventListener('pointerleave',()=>{if(hover===slot.id) hover=null;});
    btn.addEventListener('pointerdown',e=>{
      if(targeting || s.towers[slot.id]?.owner!==side) return;
      beginDrag(e,{kind:'merge',slot:slot.id,type:s.towers[slot.id].type});
    });
    return btn;
  });
  for(const [i,name] of names.entries()){
    $('player'+i).innerHTML='<div class="identity"><span class="crest"></span><div><strong>'+name+' · '+(i+1)+'P</strong><small></small></div></div><div class="wealth"><b></b><span>灵气</span></div><div class="hp"><span class="hp-name">关耐</span><div class="meter"><i></i></div><span class="hp-num"></span></div><button type="button" class="ready"></button>';
    $('player'+i).querySelector('.ready').onclick=()=>command({kind:'ready'},i);
    $('side'+i).onclick=()=>setSide(i);
  }
  const cards=Array.from({length:R.shop.size},(_,card)=>{
    const b=document.createElement('button');
    b.type='button';b.className='card';
    b.onclick=()=>{const type=s.players[side].shop[card];if(!type)return;from=null;picked=card;targeting=null;msg('把'+R.towers[type].name+'拖到空阵台，或点选空阵台。');};
    b.onpointerdown=e=>{const p=s.players[side],type=p.shop[card];if(type)beginDrag(e,{kind:'place',type,card,revision:p.shopRevision});};
    $('cards').append(b);
    return b;
  });
  for(const i of [0,1]){
    for(const [id,h] of Object.entries(R.heroes)) $('hero'+i).add(new Option(h.name+' · '+h.skill,id));
    $('hero'+i).onchange=e=>command({kind:'hero',hero:e.target.value},i);
    $('lobbyPlayer'+i).querySelector('.confirm-hero').onclick=()=>command({kind:'confirmHero'},i);
  }
  $('lobbyRoom').onclick=()=>$('room').click();
  $('refresh').onclick=()=>{clearDrag();picked=null;command({kind:'refreshShop'});};
  $('skill').onclick=()=>{
    const p=s.players[side], h=R.heroes[p.hero];
    if(!h.radius) return command({kind:'skill'});
    from=null;targeting=targeting?.kind==='skill'?null:{kind:'skill'};
    msg(targeting?'点选地图施放'+h.skill+'，再点技能可取消。':'已取消施放。');
  };
  const relicOpen=()=>s.wave>=R.relicWave || (s.wave===R.relicWave-1 && s.phase==='prepare');
  $('relic').onclick=()=>{
    const p=s.players[side];
    show('神器 · '+names[side],'<p>每人选定一件。塔上神器可免费换装，合成后随塔升阶，被夺阵时回到原主。女娲石直接守护镇关。</p><div class="choices"></div>');
    for(const [key,a] of Object.entries(R.relics)){
      const b=document.createElement('button');b.type='button';b.className='choice';
      b.innerHTML='<strong>'+a.name+' · '+(p.relic?.kind===key?'已购':'灵气 '+R.relicCost)+'</strong>'+a.desc;
      b.disabled=!!p.relic && (p.relic.kind!==key || a.gate);
      b.onclick=()=>{
        dialog.close();from=null;targeting=null;
        if(a.gate) return command({kind:'relic',relic:key});
        targeting={kind:'relic',relic:key};msg('请选择'+names[side]+'的一座防守单位佩戴'+a.name+'。');
      };
      body.querySelector('.choices').append(b);
    }
  };
  $('spirit').onclick=()=>{
    show('灵兽 · '+names[side],'<p>选定一只灵兽，随后自动助阵。阵区型灵兽可以安置在地图任意阵位。</p><div class="choices"></div>');
    for (const [key,spirit] of Object.entries(R.spirits)) {
      const button=document.createElement('button');
      button.type='button';button.className='choice';
      button.innerHTML='<strong>'+spirit.name+'</strong>'+spirit.desc;
      button.onclick=()=>{
        dialog.close();from=null;targeting=null;
        if(!spirit.anchor) return command({kind:'spirit',spirit:key});
        targeting={kind:'spirit',spirit:key};msg('选择地图上的一个阵位安置'+spirit.name+'。');
      };
      body.querySelector('.choices').append(button);
    }
  };
  function msg(message,error=false){$('msg').textContent=message;$('msg').classList.toggle('error',error);}
  function setSide(i){
    if(session||side===i) return;
    clearDrag();
    side=i;from=null;targeting=null;msg('当前由'+names[i]+'玩家操作。');
  }
  function show(title,html){
    clearDrag();
    $('dialogTitle').textContent=title;body.innerHTML=html;
    if(!dialog.open) dialog.showModal();
  }
  $('closeDialog').onclick=()=>dialog.close();
  $('help').onclick=()=>show('回龙谷 · 对战规则',
    '<ol><li>北面的魔界裂隙涌出妖潮，裂隙外是前沿哨位。左右各有一位守关人，例如精卫。入场前选定，进入战场后锁定。</li><li>商店随机出现四件单位，可免费拖到空阵台。每次刷新消耗灵气，费用逐次增加。</li><li>妖物出生时锁定最终关口，击杀所得灵气归最后一击的塔主。同种同级塔可以合成并夺取对方塔。</li><li>双方就绪迎战。守关人可主动施技，第二波后开放灵兽和神器。六波后关耐多的一方胜出，关耐相同比击杀灵气。</li></ol><p>本地模式点击左右切换玩家。联机房间里各自操作自己的席位。</p>');
  function reset(){
    clearDrag();
    game=new Engine.Game();s=game.state;side=0;picked=null;from=null;targeting=null;lastUI='';lastSlots='';
    msg('拖动单位，修饰空阵台。');
  }
  $('restart').onclick=()=>{
    if(session) return command({kind:'restart'});
    if(s.wave===0 && s.towers.every(t=>!t) || s.phase==='over') return reset();
    show('重开对局','<p>将清空本局阵位和进度。</p><button id="confirmRestart" type="button">开始新一局</button>');
    $('confirmRestart').onclick=()=>{dialog.close();reset();};
  };
  async function post(path,payload){
    const res=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json();
    if(!res.ok) throw Error(data.error||'房间请求失败。');
    return data;
  }
  function disconnect(note){
    session?.source?.close();session=null;online=[false,false];restart=[false,false];reset();msg(note);
    if(dialog.open) dialog.close();
  }
  function connect(info){
    const credentials={room:info.room,token:info.token,side:info.side};
    side=info.side;s=info.state;online=info.online;restart=info.restart;from=null;targeting=null;lastUI='';
    const source=new EventSource('/api/events?'+new URLSearchParams({room:info.room,token:info.token}));
    session={...credentials,source};
    source.onmessage=e=>{
      if(session?.source!==source) return;
      const data=JSON.parse(e.data);
      if(data.state.wave<s.wave){from=null;targeting=null;picked=null;}
      s=data.state;online=data.online;restart=data.restart;
    };
    source.onerror=()=>{
      if(session?.source!==source) return;
      if(source.readyState===EventSource.CLOSED) return disconnect('房间连接已关闭，已返回本地。');
      online=[false,false];msg('连接中断，正在自动重连。',true);
    };
    source.onopen=()=>{if(session?.source===source) msg('房间 '+info.room+' · 你的席位是'+names[side]+'。');};
    source.addEventListener('ended',()=>{if(session?.source===source) disconnect('房间已关闭。');});
    dialog.close();
  }
  $('room').onclick=()=>{
    if(location.protocol==='file:'){
      show('联机房间','<p>在游戏目录内运行 <code>node server.js</code>，再打开 <code>http://localhost:8787</code>。两台电脑对战时，另一位用主机的局域网 IP 和相同端口打开页面。</p>');return;
    }
    if(session){
      show('房间 · '+session.room,'<p>分享房间号，另一位玩家可在本页面选择加入。退出会关闭房间。</p><button type="button" id="leaveRoom">退出房间</button>');
      $('leaveRoom').onclick=async()=>{
        const current=session;
        try{await post('leave',current);if(session===current) disconnect('已退出房间，返回本地。');}catch(e){msg(e.message,true);}
      };
      return;
    }
    show('联机房间','<p>创建一个房间，或输入对方的六位房间号。连接房间会切换到新的对局。</p><label for="roomCode">房间号</label><input id="roomCode" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="例如 325476"><div class="room-controls"><button type="button" id="createRoom">创建房间</button><button type="button" id="joinRoom">加入房间</button></div><p role="status" id="roomStatus"></p>');
    const launch=async create=>{
      const code=$('roomCode').value.trim(), status=$('roomStatus');
      if(!create && !/^\d{6}$/.test(code)){status.textContent='请输入六位房间号。';return;}
      const buttons=[$('createRoom'),$('joinRoom')];
      buttons.forEach(b=>b.disabled=true);
      try{connect(await post(create?'create':'join',create?{}:{room:code}));}
      catch(e){status.textContent=e.message;buttons.forEach(b=>b.disabled=false);}
    };
    $('createRoom').onclick=()=>launch(true);$('joinRoom').onclick=()=>launch(false);
  };
  async function command(action,actor=side){
    if(session && (actor!==side || !online[side])){msg('等待房间连接。',true);return false;}
    const current=session;
    let result;
    try{result=current ? await post('action',{room:current.room,token:current.token,action}) : game.command(actor,action);}
    catch(e){if(session===current) msg(e.message,true);return false;}
    if(session!==current) return false;
    if(!result.ok){msg(result.error,true);return false;}
    if(action.kind==='merge') msg(names[actor]+(result.stolen?'夺下一座阵位，合成塔今后为该方获取灵气。':'完成合成，单位已升阶。'));
    if(action.kind==='place') {picked=null;msg(names[actor]+'已召唤'+R.towers[result.type].name+'。');}
    if(action.kind==='refreshShop') msg('商店已刷新。');
    if(action.kind==='hero') msg(names[actor]+'由'+R.heroes[action.hero].name+'守关。');
    if(action.kind==='skill') msg(names[actor]+'施放守关技。');
    if(action.kind==='relic') msg(names[actor]+'已装备'+R.relics[action.relic].name+'。');
    if(action.kind==='spirit') msg(R.spirits[action.spirit].name+'已为'+names[actor]+'助阵。');
    if(action.kind==='ready') msg('双方就绪即开始下一波。');
    if(action.kind==='restart') msg('双方同意即重开。');
    return true;
  }
  function validMerge(f,t){
    const a=s.towers[f], b=s.towers[t];
    return f!==t && a?.owner===side && b && a.type===b.type && a.level===b.level && a.level<R.maxLevel;
  }
  function onSlot(i){
    if(s.phase==='over') return;
    const t=s.towers[i];
    if(targeting?.kind==='relic'||targeting?.kind==='spirit'){
      const selection=targeting;
      command({...selection,to:i}).then(ok=>{if(ok && targeting===selection) targeting=null;});
      return;
    }
    if(from===i){from=null;return;}
    if(from!=null){
      const f=from;from=null;
      command({kind:'merge',from:f,to:i});return;
    }
    if(t?.owner===side){from=i;msg('选择同种同阶的目标塔，可夺取对手的阵位。');return;}
    if(t){msg('这是对手的塔。先选择自己同种同阶的塔，才能夺阵。',true);return;}
    const p=s.players[side];
    if(picked==null || !p.shop[picked]) return msg('请先选择商店中的单位。',true);
    command({kind:'place',card:picked,revision:p.shopRevision,to:i});
  }
  function position(e){
    const bounds=board.getBoundingClientRect();
    return {x:(e.clientX-bounds.left)/bounds.width*R.board.W,y:(e.clientY-bounds.top)/bounds.height*R.board.H};
  }
  let suppressPointerClick=false;
  document.addEventListener('pointerdown',()=>{suppressPointerClick=false;},true);
  function beginDrag(e,source){
    if(drag || e.button!==0 || !e.isPrimary || s.phase==='over') return;
    drag={...source,side,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,over:null,element:e.currentTarget,session};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function clearDrag(){
    if(!drag) return;
    const {element,id,moved}=drag;
    drag=null;mark.hidden=true;
    if(moved) {from=null;suppressPointerClick=true;}
    if(element.hasPointerCapture(id)) element.releasePointerCapture(id);
  }
  function slotAt(e){
    const button=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');
    return button?Number(button.dataset.slot):null;
  }
  const canPlace=source=>s.phase!=='over' && s.phase!=='lobby' && (!session||online[side]) &&
    s.players[side].shopRevision===source.revision && s.players[side].shop[source.card]===source.type;
  document.addEventListener('pointermove',e=>{
    if(!drag || e.pointerId!==drag.id) return;
    if(!drag.moved && Math.hypot(drag.x-e.clientX,drag.y-e.clientY)<6) return;
    if(!drag.moved){
      drag.moved=true;targeting=null;
      board.classList.remove('aim');
      from=drag.kind==='merge'?drag.slot:null;
      if(drag.kind==='place') picked=drag.card;
      if(drag.kind==='place') {
        const available=canPlace(drag);
        msg(available?'松手修饰亮起的阵台。':'货架已变化，请重新选择。',!available);
      }
      const unit=R.towers[drag.type];
      mark.hidden=false;mark.textContent=unit.glyph;mark.style.color=unit.color;
    }
    drag.over=slotAt(e);
    mark.style.left=e.clientX+'px';mark.style.top=(e.clientY-(e.pointerType==='touch'?18:0))+'px';
  });
  document.addEventListener('click',e=>{
    if(suppressPointerClick && e.detail>0){
      suppressPointerClick=false;e.preventDefault();e.stopImmediatePropagation();
    }
  },true);
  board.addEventListener('click',e=>{
    if(targeting?.kind==='skill'){
      const a=position(e);targeting=null;command({kind:'skill',...a});
    }
  },true);
  for (const name of ['pointerup','pointercancel','lostpointercapture']) document.addEventListener(name,e=>{
    if(!drag || drag.id!==e.pointerId) return;
    const d=drag;
    clearDrag();
    if(!d.moved || name!=='pointerup' || d.side!==side || d.session!==session) return;
    const to=slotAt(e);
    if(to==null) return msg(d.kind==='place'?'已取消修饰。':'拖到同种同阶的塔上才会合成。');
    if(d.kind==='place') command({kind:'place',card:d.card,revision:d.revision,to},d.side);
    else command({kind:'merge',from:d.slot,to},d.side);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open){clearDrag();from=null;targeting=null;}});
  function renderUI(){
    const p=s.players[side], skillWait=Math.max(0,Math.ceil(p.cooldown-s.time)), hero=R.heroes[p.hero], relic=p.relic && R.relics[p.relic.kind];
    const key=JSON.stringify([s.phase,s.wave,s.players.map(x=>[x.hp,x.gold,x.kills,x.bounty,x.steals,x.ready,x.hero,x.heroConfirmed,x.shop,x.shopRevision,x.refreshCount,x.relic,x.spirit]),side,skillWait,picked,targeting?.kind,from,s.result,session?.room,online,restart]);
    if(key!==lastUI){
      lastUI=key;
      $('lobby').hidden=s.phase!=='lobby';
      for(const i of [0,1]){
        const x=s.players[i],select=$('hero'+i),panel=$('lobbyPlayer'+i),allowed=!session||(side===i&&online[i]);
        select.value=x.hero;select.disabled=x.heroConfirmed||!allowed;
        panel.querySelector('.hero-description').textContent=R.heroes[x.hero].desc;
        const confirm=panel.querySelector('.confirm-hero');
        confirm.disabled=x.heroConfirmed||!allowed;
        confirm.textContent=x.heroConfirmed?'已确认':session&&side!==i?'等待对方选择':'确认守关人';
      }
      $('lobbyStatus').textContent=session?('房间 '+session.room+' · '+(!online.every(Boolean)?'等待另一位玩家连接':'各自确认守关人后进入')):'同屏双人 · 两位玩家分别确认';
      const wave=R.waves[Math.max(0,s.phase==='prepare'?s.wave:s.wave-1)];
      $('waveNum').textContent='第 '+(s.phase==='prepare'?s.wave+1:s.wave)+' / '+R.waves.length+' 波';
      $('waveName').textContent=wave.name;
      $('waveHint').textContent=s.phase==='over'?'本局结束':session&&!online.every(Boolean)?(s.phase==='battle'?'暂停 · 等待重连':'等待另一席位'):s.phase==='battle'?'妖潮来袭':'布阵阶段';
      $('mode').textContent=session?'房间 '+session.room:'本地双人';
      $('restart').textContent=session && restart[side]?'已同意重开':'重开';
      for(const [i,x] of s.players.entries()){
        const el=$('player'+i), h=R.heroes[x.hero], ready=el.querySelector('.ready');
        el.querySelector('.crest').textContent=h.glyph;el.querySelector('small').textContent=h.name+' · '+x.kills+' 击杀 · '+x.bounty+' 击杀灵气';
        el.querySelector('.wealth b').textContent=x.gold;el.querySelector('.hp-num').textContent=x.hp+'/'+R.hp;
        el.querySelector('.meter i').style.width=100*x.hp/R.hp+'%';
        ready.disabled=s.phase!=='prepare'||(session&&(side!==i||!online[side]));
        ready.textContent=s.phase==='battle'?'迎战中':s.phase==='over'?'已结算':x.ready?'已就绪':'就绪';
        ready.setAttribute('aria-label',names[i]+ready.textContent);ready.setAttribute('aria-pressed',x.ready);
        $('side'+i).setAttribute('aria-pressed',side===i);$('side'+i).disabled=!!session;
      }
      $('activeSide').textContent=names[side]+' · '+(side+1)+'P';
      $('selectedTitle').textContent=targeting?.kind==='spirit'?'选择灵兽阵区':targeting?.kind==='relic'?'选择佩戴单位':targeting?.kind==='skill'?'选择施法位置':from!=null?'选择合成目标':'灵台商店';
      cards.forEach((btn,i)=>{
        const type=p.shop[i],t=R.towers[type];
        btn.disabled=!t || s.phase==='over' || s.phase==='lobby';
        btn.setAttribute('aria-pressed',i===picked&&from==null&&!targeting&&!!t);
        btn.title=t?.desc||'已取用';
        if(t) btn.style.setProperty('--glyph',t.color);
        btn.innerHTML=t?'<span class="glyph">'+t.glyph+'</span><span><strong>'+t.name+'</strong><small>'+t.role+'</small></span><b>免费</b>':'<span class="empty-card">已取用</span>';
      });
      const cost=R.shop.refreshBase+p.refreshCount*R.shop.refreshStep;
      $('refresh').textContent='换一批 · '+cost+' 灵气';
      $('refresh').disabled=s.phase==='over'||s.phase==='lobby'||p.gold<cost||!!(session&&!online[side]);
      $('skill').textContent=hero.skill+(skillWait?' · '+skillWait+'秒':'');$('skill').title=hero.desc;
      $('skill').disabled=s.phase!=='battle'||skillWait>0;
      $('relic').disabled=!relicOpen()||s.phase==='over';
      $('spirit').disabled=!relicOpen()||s.phase!=='prepare'||!!p.spirit;
      $('spirit').textContent=p.spirit?R.spirits[p.spirit.kind].name:'灵兽';
      $('relicNote').textContent=relic ? relic.name+(relic.gate?' · 镇关':p.relic.slot==null?' · 待佩戴':' · '+R.board.slots[p.relic.slot].label) : relicOpen()?('神器 '+R.relicCost+' 灵气'):'第二波后开启灵兽与神器';
      $('verdict').hidden=!s.result;
      if(s.result){
        const w=s.result.winner;
        $('verdict').innerHTML='<div class="eyebrow">回龙谷 · '+(s.result.reason==='broken'?'镇关失守':'妖潮散尽')+'</div><div class="result">'+(w==null?'双方战平':names[w]+'胜出')+'</div><div class="seal-award">'+(w==null?'双关共同落印':'封印执掌者 · '+names[w]+' '+R.heroes[s.players[w].hero].name)+'</div><div class="result-line">'+s.players.map((x,i)=>names[i]+' '+x.hp+' 关耐 / '+x.bounty+' 击杀灵气 / '+x.steals+' 夺阵').join('　·　')+'</div>';
      }
      board.classList.toggle('aim',targeting?.kind==='skill');
      board.classList.toggle('choosing-spirit',targeting?.kind==='spirit');
    }
    const placement=drag?.moved&&drag.kind==='place'&&canPlace(drag);
    const dropSlot=drag?.moved?drag.over:null;
    const skey=JSON.stringify([s.towers.map(t=>t&&[t.owner,t.type,t.level]),s.players.map(p=>p.relic),from,side,placement,dropSlot]);
    if(skey!==lastSlots){
      lastSlots=skey;
      for(const pos of R.board.slots){
        const i=pos.id, btn=slotButtons[i], t=s.towers[i], a=t&&s.players[t.owner].relic;
        const r=a?.slot===i?R.relics[a.kind]:null;
        const label=pos.label+(t?' · '+names[t.owner]+' '+R.towers[t.type].name+' '+t.level+'级'+(r?' · '+r.name:''):' · 空阵台');
        btn.style.setProperty('--side',t?BoardArt.colors[t.owner]:'#b5aa82');btn.setAttribute('aria-label',label);btn.title=label;
        btn.classList.toggle('occupied',!!t);btn.classList.toggle('on',i===from);btn.classList.toggle('drop',from!=null&&!!validMerge(from,i));
        btn.classList.toggle('place-target',!!placement&&!t);
        btn.classList.toggle('place-hover',!!placement&&!t&&i===dropSlot);
        btn.style.setProperty('--glyph',t?R.towers[t.type].color:'');
        btn.innerHTML=t?'<span class="glyph">'+R.towers[t.type].glyph+'</span><span class="rank" aria-hidden="true">'+
          '<i></i>'.repeat(t.level)+'</span>'+(r?'<span class="rune">'+r.glyph+'</span>':''):'';
      }
    }
  }
  function frame(now){
    const dt=Math.min(.2,(now-last)/1000);last=now;
    if(!session){
      acc+=dt;
      while(acc>=1/60){game.tick(1/60);acc-=1/60;}
    }
    renderUI();
    const pos=drag?.moved?drag.over:from??hover, t=s.towers[pos], chosen=R.towers[s.players[side].shop[picked]], canPreview=pos!=null&&!targeting&&(t||chosen);
    BoardArt.draw(c,s,canPreview?{slot:pos,range:t?R.towers[t.type].range+R.levels[t.level].range:chosen.range}:null);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
