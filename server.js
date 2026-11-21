"use strict";
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {randomBytes,randomInt}=require('node:crypto');
const {Game}=require('./engine');
const types={'index.html':'text/html; charset=utf-8','style.css':'text/css; charset=utf-8','ui-jade.css':'text/css; charset=utf-8',
  'rules.js':'text/javascript; charset=utf-8','engine.js':'text/javascript; charset=utf-8',
  'app.js':'text/javascript; charset=utf-8','map.js':'text/javascript; charset=utf-8','battle-effects.js':'text/javascript; charset=utf-8',
  'assets/huilong-open.webp':'image/webp','assets/nuwa-field.webp':'image/webp',
  'assets/guardians-field.webp':'image/webp','assets/jingwei-guard.webp':'image/webp',
  'assets/shop-items.webp':'image/webp',
  'assets/ink-valley.webp':'image/webp','assets/ink-combat.webp':'image/webp','assets/ink-ui.webp':'image/webp',
  'assets/ink-guardians.webp':'image/webp','assets/ink-relics.webp':'image/webp','assets/ink-spirits.webp':'image/webp',
  'assets/battle-weapons.webp':'image/webp','assets/guardians-cast.webp':'image/webp','assets/enemies-stride.webp':'image/webp',
  'assets/refined-guardians.webp':'image/webp','assets/refined-guardians-cast.webp':'image/webp',
  'assets/refined-guardians-faces.webp':'image/webp',
  'assets/ui-cloud.webp':'image/webp','assets/ui-tassel.webp':'image/webp'};
const rooms=new Map();
const newSeat=()=>({token:randomBytes(24).toString('hex'),stream:null,restart:false});
const online=room=>room.seats.map(s=>Boolean(s?.stream));
const state=room=>({state:room.game.state,online:online(room),restart:room.seats.map(s=>Boolean(s?.restart))});
function write(room,stream) {
  if(stream.writableLength>128_000) {stream.destroy();return;}
  stream.write('data: '+JSON.stringify(state(room))+'\n\n');
}
function publish(room) {for(const seat of room.seats) if(seat?.stream) write(room,seat.stream);}
function json(res,code,data) {res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function body(req) {
  return new Promise((resolve,reject)=>{
    let raw='',tooLong=false;
    req.setEncoding('utf8');
    req.on('data',s=>{if(raw.length+s.length<=4096 && !tooLong) raw+=s; else tooLong=true;});
    req.on('end',()=>{try{if(tooLong) throw Error();resolve(JSON.parse(raw||'{}'));}catch(e){reject(e);}});
    req.on('error',reject);
  });
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'), route=url.pathname;
  try {
    if(req.method==='GET' && route==='/api/events') {
      const room=rooms.get(url.searchParams.get('room'));
      const seat=room?.seats.find(s=>s && s.token===url.searchParams.get('token'));
      if(!seat) return json(res,403,{error:'房间或席位无效。'});
      seat.stream?.end();
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});
      res.flushHeaders();
      seat.stream=res;
      res.on('close',()=>{if(seat.stream===res){seat.stream=null;room.touched=Date.now();publish(room);}});
      publish(room);
      return;
    }
    if(req.method==='POST' && route.startsWith('/api/')) {
      const a=await body(req);
      if(!a || typeof a!=='object') return json(res,400,{error:'无效请求。'});
      if(route==='/api/create') {
        if(rooms.size>=100) return json(res,503,{error:'房间已达上限。'});
        let code; do {code=String(randomInt(100000,1000000));} while(rooms.has(code));
        const room={game:new Game(),seats:[newSeat(),null],touched:Date.now()};
        rooms.set(code,room);
        return json(res,200,{room:code,side:0,token:room.seats[0].token,...state(room)});
      }
      const room=rooms.get(a.room);
      if(!room) return json(res,404,{error:'房间不存在或已关闭。'});
      if(route==='/api/join') {
        if(room.seats[1]) return json(res,409,{error:'房间已有两名玩家。'});
        const seat=room.seats[1]=newSeat();room.touched=Date.now();
        return json(res,200,{room:a.room,side:1,token:seat.token,...state(room)});
      }
      const side=room.seats.findIndex(s=>s && s.token===a.token);
      if(side<0) return json(res,403,{error:'席位无效。'});
      if(route==='/api/leave') {
        for(const seat of room.seats) if(seat?.stream) {
          seat.stream.write('event: ended\ndata: {}\n\n');seat.stream.end();seat.stream=null;
        }
        rooms.delete(a.room);
        return json(res,200,{ok:true});
      }
      if(route==='/api/action') {
        if(!room.seats[side].stream) return json(res,409,{error:'你尚未连接到战场。'});
        let result;
        if(a.action?.kind==='restart') {
          room.seats[side].restart=!room.seats[side].restart;
          if(room.seats.every(s=>s?.stream && s.restart)) {
            room.game=new Game();for(const s of room.seats) s.restart=false;
          }
          result={ok:true};
        } else result=room.game.command(side,a.action);
        if(result.ok) publish(room);
        return json(res,result.ok?200:400,result);
      }
      return json(res,404,{error:'接口不存在。'});
    }
    const name=route==='/'?'index.html':route.slice(1);
    if(req.method!=='GET' || !Object.hasOwn(types,name)) return json(res,404,{error:'页面不存在。'});
    res.writeHead(200,{'Content-Type':types[name],'Cache-Control':'no-cache'});
    res.end(fs.readFileSync(path.join(__dirname,name)));
  } catch {
    if(!res.headersSent) json(res,400,{error:'请求格式错误。'});
    else res.end();
  }
});
let next=performance.now(), frame=0;
setInterval(()=>{
  const now=performance.now();
  let catchup=0;
  while(next<=now && catchup++<12) {
    next+=1000/60;
    for(const [code,room] of rooms) {
      if(room.seats.every(s=>s?.stream)) room.game.tick(1/60);
      if(frame%3===0 && room.seats.every(s=>s?.stream)) publish(room);
      if(frame%600===0) {
        if(room.seats.every(s=>!s?.stream) && Date.now()-room.touched>1_800_000) rooms.delete(code);
        else if(!room.seats.every(s=>s?.stream)) publish(room);
      }
    }
    frame++;
  }
  if(next<now) next=now;
},8).unref();
const port=Number(process.env.PORT||8787), host=process.env.HOST||'0.0.0.0';
server.listen(port,host,()=>console.log('山海争关： http://localhost:'+server.address().port+' （监听 '+host+'）'));
