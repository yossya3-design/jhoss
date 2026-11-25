/* Motor de cálculo: convierte los archivos del día (Radar, BEES, Modulación, Geotab, SIC, Bitácora)
   en la data de la página. Misma lógica que el cálculo original en Python. */
(function(G){
'use strict';
const NA=v=>v==null||v===''||(typeof v==='number'&&isNaN(v));
const num=v=>{if(typeof v==='number')return v;if(typeof v==='boolean')return v?1:0;if(v==null)return NaN;const s=String(v).trim();if(s==='')return NaN;const n=Number(s);return isNaN(n)?NaN:n};
const id=v=>{if(NA(v))return '';if(typeof v==='number')return String(Math.round(v));let s=String(v).trim();if(/^\d+\.0+$/.test(s))s=s.replace(/\.0+$/,'');return s};
const str=v=>NA(v)?'nan':String(v);
const bool=v=>{if(NA(v))return null;if(typeof v==='boolean')return v;const s=String(v).trim().toLowerCase();if(s==='true'||s==='1'||s==='si'||s==='sí')return true;if(s==='false'||s==='0'||s==='no')return false;return null};
const r_=(x,d)=>{const p=10**d;return Math.round((x+Number.EPSILON*Math.sign(x))*p)/p};
const pad=n=>String(n).padStart(2,'0');
const title=s=>{let o='',p=false;for(const ch of String(s)){const L=/\p{L}/u.test(ch);o+=L?(p?ch.toLowerCase():ch.toUpperCase()):ch;p=L}return o};
const fx=s=>{s=String(s);if(!/[\u0080-ÿ]/.test(s))return s;const b=[];for(const ch of s){const c=ch.charCodeAt(0);if(c>255)return s;b.push(c)}try{return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(b))}catch(e){return s}};
// fechas: todo se maneja como "ms en hora Lima sin zona" (se formatea con getUTC*)
const XL0=Date.UTC(1899,11,30);
const fromSerial=n=>XL0+Math.round(n*86400000);
function isoUTCtoLima(v){ // BEES viene en UTC
  if(NA(v))return null;
  if(typeof v==='number')return fromSerial(v)-5*3600e3;
  const m=String(v).match(/^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)(?::(\d\d)(?:\.(\d+))?)?(Z|[+-]\d\d:?\d\d)?/);
  if(!m)return null;
  let t=Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0),m[7]?Math.round(Number('0.'+m[7])*1000):0);
  if(m[8]&&m[8]!=='Z'){const s=m[8][0]==='-'?-1:1,h=+m[8].slice(1,3),mi=+m[8].slice(-2);t-=s*(h*60+mi)*60000}
  return t-5*3600e3;
}
const hmT=t=>t==null?null:pad(new Date(t).getUTCHours())+':'+pad(new Date(t).getUTCMinutes());
// hora de Excel o texto -> 'HH:MM' (trunca segundos, como str(time)[:5])
function s5(v){if(NA(v)||String(v)==='NaT')return null;if(typeof v==='number'){const s=Math.round((v%1)*86400);return pad(Math.floor(s/3600)%24)+':'+pad(Math.floor(s%3600/60))}return String(v).slice(0,5)}
function secs(v){if(NA(v))return null;if(typeof v==='number')return Math.round((v%1)*86400);const m=String(v).match(/(\d{1,2}):(\d\d)(?::(\d\d))?/);return m?(+m[1])*3600+(+m[2])*60+(+(m[3]||0)):null}
function mins(v){if(NA(v))return null;if(typeof v==='number'){const s=Math.round(v*86400);return Math.floor(s/3600)*60+Math.floor(s%3600/60)}const p=String(v).split(':');if(p.length!==3)return null;const h=parseInt(p[0]),m=parseInt(p[1]);return isNaN(h)||isNaN(m)?null:h*60+m}
function dateOf(v){ // -> 'YYYY-MM-DD' o null
  if(NA(v))return null;
  if(typeof v==='number'){const d=new Date(fromSerial(v));return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())}
  const s=String(v).trim();let m=s.match(/^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/);if(m)return m[1]+'-'+pad(m[2])+'-'+pad(m[3]);
  m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);if(m)return m[3]+'-'+pad(m[2])+'-'+pad(m[1]);return null;
}
// AOA (primera fila = cabecera) -> objetos
function objs(aoa){if(!aoa||!aoa.length)return [];const h=aoa[0].map(x=>x==null?'':String(x).trim());const o=[];for(let i=1;i<aoa.length;i++){const r=aoa[i];if(!r||r.every(NA))continue;const x={};h.forEach((k,j)=>{if(k&&!(k in x))x[k]=r[j]===undefined?null:r[j]});x.__r=r;o.push(x)}return o}
const firstNN=(rows,k)=>{for(const r of rows)if(!NA(r[k]))return r[k];return null};
const nuniq=(rows,k)=>new Set(rows.map(r=>r[k]).filter(v=>!NA(v)).map(id)).size;
const sumMin1=a=>{let s=0,n=0;for(const v of a)if(!isNaN(v)){s+=v;n++}return n?s:NaN};
const groupBy=(a,f)=>{const m=new Map();for(const x of a){const k=f(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)}return m};

const EDT={'REPARTO ROSALES SOCIEDAD COMERCIAL':'Reparto Rosales','IMPORTACIONES &':'Importaciones &','TRANSPORTES ADRIANCAR SAC':'Adriancar','VARGAS S.R.L.':'Vargas','DISTRIBUCIONES JF PACHECO S.A.C.':'JF Pacheco','CRE MAGDALENA':'CRE Magdalena','HERNANDEZ YDROGO JUAN JOSE':'Hernández Ydrogo'};
const EDTN=Object.assign({},EDT,{'PROYECTO TESLA':'Proyecto Tesla','TRANSPORTES BERTHA CANTURIN EIRL':'Bertha Canturin'});
const KA_RE=/tambo|cadena de comercio|supermercados peruanos|coesti|mayorsa|moustache|tottus|plaza vea|makro|cencosud|hipermercado|primax|repsol|corporacion lindley|oxxo|listo/i;
const CORTES=['08:00','09:30','11:30','13:00','15:00','17:00','19:00'];
const ASIS=[{n:'Maribel',edt:'Reparto Rosales',t:'T1'},{n:'Lorenzo',edt:'Reparto Rosales',t:'T2'},{n:'Dania Rodríguez',edt:'Importaciones &',t:'T1T2'},{n:'Chesca',edt:'Adriancar',t:'T1T2'},{n:'Jean Franco',edt:'JF Pacheco',t:'T1T2'}];
const noPE=p=>{p=p==null?'':String(p);return p.startsWith('PE')?p.slice(2):p};

/* ---------- reconocer el archivo por sus columnas ---------- */
const TIPOS={
  radar:{n:'Radar',need:['Transporte','TpMt','CantEnt','IDCli'],cols:['Transporte','Ruta','Inicio','Viaje','Empresa','Placa','Liquidador','Entrega','TpMt','IDMat','Material','Pedido','IDCli','Cliente','Distrito','Orden','CantEnt','Factor','CantPed','Supervisor','BDR','abre','cierra','Segm.Cliente','FechaPla']},
  bees:{n:'BEES (Foxtrot)',need:['tour_display_id','poc_external_id','status'],cols:['tour_display_id','tour_date','truck_license_plate','poc_external_id','status','tour_status','trip_start_timestamp','arrived_at','finished_at','within_radius','out_of_radius_reason','total_delivered_vol','total_refused_vol','volume_hectoliters_sum']},
  mod:{n:'Modulación',need:['centro','Codigo','mr'],filtro:r=>String(r.centro||'')==='CD Callao',cols:['centro','Ruta','Viaje','Codigo','mr','fechahoraalerta','supervisor','agente','Estado_entrega','Canal','UnidadDeNegocio','telefono_vendedor','retroalimentacion']},
  geo:{n:'Geotab',need:['Placa','Viaje','Secuencia real','Codigo Cliente'],cols:['Placa','Viaje','Codigo Cliente','Secuencia','Secuencia real','Cliente visitado','Tiempo visita Plan','Tiempo visita Real','Latitud','Longitud','Distancia Plan Cliente Ant','Distancia ejec Cliente Ant','Hora plan Llegada cliente','Hora ejec Llegada cliente','Hora plan Salida cliente','Hora ejec Salida cliente','Fecha']},
  sic:{n:'SIC de ruta',need:['Unidad','Hora Ini. Real'],cols:['Unidad','Hora Ini. Real','H. Fin Real','Hora Fin Plan (lim. 10:30)','Tiempo Avance','Tiempo Restante','Dist. (Km)','Tiempo en CD','Ubicación']},
  fox:{n:'Foxtrot (resumen)',need:['Clientes Finalizados'],cols:[]}
};
// sheets: {nombre: AOA}. Devuelve {tipo, filas(slim AOA), info}
function detect(sheets){
  const names=Object.keys(sheets);
  if(names.some(n=>/DESPLANIFICACI/i.test(n)))return {tipo:'bita'};
  for(const n of names){const aoa=sheets[n];if(!aoa||!aoa.length)continue;
    // la cabecera puede no estar en la primera fila: buscar en las 5 primeras
    for(let hi=0;hi<Math.min(5,aoa.length);hi++){const h=(aoa[hi]||[]).map(x=>x==null?'':String(x).trim());
      for(const [k,t] of Object.entries(TIPOS)){if(t.need.every(c=>h.includes(c))){
        if(k==='fox')return {tipo:'fox'};
        const idx=t.cols.map(c=>h.indexOf(c));const rows=[t.cols];
        for(let i=hi+1;i<aoa.length;i++){const r=aoa[i];if(!r||r.every(NA))continue;const o=idx.map(j=>j<0?null:(r[j]===undefined?null:r[j]));
          if(t.filtro){const ob={};t.cols.forEach((c,j)=>ob[c]=o[j]);if(!t.filtro(ob))continue}rows.push(o)}
        return {tipo:k,rows};
      }}}
  }
  return {tipo:null};
}
// fecha del archivo (para avisar si se mezclan días)
function fechaDe(tipo,rows){
  const o=objs(rows);const cnt={};const add=d=>{if(d)cnt[d]=(cnt[d]||0)+1};
  if(tipo==='radar')o.forEach(r=>add(dateOf(r.FechaPla)));
  if(tipo==='bees')o.forEach(r=>add(dateOf(r.tour_date)));
  if(tipo==='mod')o.forEach(r=>{const d=isoUTCtoLima(r.fechahoraalerta);add(typeof r.fechahoraalerta==='string'?String(r.fechahoraalerta).slice(0,10):null)});
  if(tipo==='geo')o.forEach(r=>add(dateOf(r.Fecha)));
  const b=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];return b?b[0]:null;
}

/* ---------- cálculo principal ---------- */
function calc(F,B){ // F: {radar,bees,mod,geo,sic} como AOA slim; B: base fija
  const R=objs(F.radar),Bs=objs(F.bees),MD=objs(F.mod||[]),GE=objs(F.geo||[]),SI=objs(F.sic||[]);
  const vol=B.vol||{},N3=B.n3||{},XY=B.xy||{},PL=B.pl||{};
  // día de operación
  const dc={};R.forEach(r=>{const d=dateOf(r.FechaPla);if(d)dc[d]=(dc[d]||0)+1});
  let dia=(Object.entries(dc).sort((a,b)=>b[1]-a[1])[0]||[])[0];
  if(!dia){const c2={};Bs.forEach(r=>{const d=dateOf(r.tour_date);if(d)c2[d]=(c2[d]||0)+1});dia=(Object.entries(c2).sort((a,b)=>b[1]-a[1])[0]||[])[0]}
  const[Y,M,Dd]=dia.split('-').map(Number);
  R.forEach(r=>{r.tour=id(r.Transporte);r.ic=id(r.IDCli);const v=vol[id(r.IDMat)];r.vol=v==null?NaN:v;
    r.HL=r.TpMt==='FERT'?num(r.CantEnt)*num(r.Factor)*r.vol/1e5:0});
  const f=R.filter(r=>r.TpMt==='FERT');
  // BEES
  Bs.forEach(b=>{const m=String(b.tour_display_id||'').match(/S(\d+)/);b.base=m?m[1]:'';b.poc=id(b.poc_external_id);b.canc=b.tour_status==='CANCELLED';
    b.ts=isoUTCtoLima(b.trip_start_timestamp);b.ar=isoUTCtoLima(b.arrived_at);b.fi=isoUTCtoLima(b.finished_at);
    b.dv=num(b.total_delivered_vol);b.rv=num(b.total_refused_vol);b.hs=num(b.volume_hectoliters_sum)});
  const est=x=>{const s=x.status,d=x.dv>0,rf=x.rv>0;
    if(s==='CONCLUDED')return rf?'PAR':'ENT';if(s==='PARTIAL_DELIVERY')return 'PAR';
    if(s==='WAITING_MODULATION')return (d&&rf)?'PAR':(rf?'REC':'MOD');if(s==='RESCHEDULED')return 'REP';return 'NOV'};
  const seen=new Set(),bs=[];
  [...Bs.filter(b=>!b.canc),...Bs.filter(b=>b.canc)].forEach(b=>{const k=b.base+'|'+b.poc;if(seen.has(k))return;seen.add(k);b.est=est(b);bs.push(b)});
  const bsBy=groupBy(bs,b=>b.base);
  const start={};Bs.forEach(b=>{if(b.ts!=null&&(start[b.base]==null||b.ts<start[b.base]))start[b.base]=b.ts});
  // tours
  const rBy=groupBy(R,r=>r.tour),fBy=groupBy(f,r=>r.tour);
  const tt=[...rBy.keys()].sort((a,b)=>a.length-b.length||a.localeCompare(b)).map(k=>{const g=rBy.get(k),fg=fBy.get(k)||[];const hl=fg.map(r=>r.HL);
    return {tour:k,ruta:str(firstNN(g,'Ruta')),viaje:id(firstNN(g,'Viaje')),emp:firstNN(g,'Empresa'),placa:str(firstNN(g,'Placa')),cond:firstNN(g,'Liquidador'),ini:firstNN(g,'Inicio'),
      pe:nuniq(fg,'Pedido'),cli:nuniq(fg,'IDCli'),ent:nuniq(fg,'Entrega'),hl:sumMin1(hl),na:hl.filter(isNaN).length}});
  const ttRV=new Map();tt.forEach(t=>{const k=t.ruta+'|'+t.viaje;if(!ttRV.has(k))ttRV.set(k,t.tour)});
  // Geotab
  GE.forEach(g=>{const m=String(g.Viaje||'').match(/Trip (\d+)/);g.trip=m?m[1]:'';g.pl=str(g.Placa);g.cc=id(g['Codigo Cliente']);g.sr=num(g['Secuencia real']);g.sp=num(g['Secuencia']);});
  const g1=new Map(),gk=new Map();
  GE.forEach(g=>{const k=g.pl+'|'+g.trip;if(g.sr===1&&!g1.has(k))g1.set(k,g);const k2=k+'|'+g.cc;if(!gk.has(k2))gk.set(k2,g)});
  const geBy=groupBy(GE,g=>g.pl+'|'+g.trip);
  // modulación
  const alert=new Map();MD.filter(a=>String(a.centro)==='CD Callao').forEach(a=>{const t=ttRV.get(str(a.Ruta)+'|'+id(a.Viaje));if(!t)return;const k=t+'|'+id(a.Codigo);if(!alert.has(k))alert.set(k,a)});
  // canal
  const segm={};R.forEach(r=>{if(!(r.ic in segm))segm[r.ic]=r['Segm.Cliente']});
  const canal=(cid,nom,a)=>{const sg=str(segm[cid]),cn=a?str(a.Canal):'',un=a?str(a.UnidadDeNegocio):'';
    if(KA_RE.test(nom)||['SUPERMERCADO','T.C CALLE','T.C. GRIFOS'].includes(sg)||cn==='Off Moderno'||un.startsWith('KA'))return 'KA';
    if(['MAYORISTAS','CASH & CARRY'].includes(sg)||cn==='Mayoristas'||un.includes('May'))return 'MAY';return 'DSD'};
  const dayMs=h=>Date.UTC(Y,M-1,Dd,+h.slice(0,2),+h.slice(3,5));
  const tours=[];
  for(const t of tt){
    const sb=bsBy.get(t.tour)||[];const v=parseInt(t.viaje)||0;const pk=t.placa+'|'+v;
    const fin=sb.filter(b=>['ENT','PAR','REC'].includes(b.est));
    const av=CORTES.map(h=>fin.filter(b=>b.fi!=null&&b.fi<=dayMs(h)).length);
    const g1r=g1.get(pk);const p1=g1r?s5(g1r['Hora ejec Llegada cliente']):null,p1p=g1r?s5(g1r['Hora plan Llegada cliente']):null;
    // clientes
    const fc=groupBy((fBy.get(t.tour)||[]),r=>r.ic);
    const rc=[...fc.entries()].sort((a,b)=>a[0].length-b[0].length||a[0].localeCompare(b[0])).map(([ic,g])=>{const hl=g.map(r=>r.HL);const ords=g.map(r=>num(r.Orden)).filter(x=>!isNaN(x));
      return {ic,nom:firstNN(g,'Cliente'),hl:sumMin1(hl),na:hl.filter(isNaN).length,pe:nuniq(g,'Pedido'),ent:nuniq(g,'Entrega'),ab:firstNN(g,'abre'),ci:firstNN(g,'cierra'),ord:ords.length?Math.min(...ords):NaN,dist:firstNN(g,'Distrito')}});
    rc.sort((a,b)=>(isNaN(a.ord)?1:0)-(isNaN(b.ord)?1:0)||(isNaN(a.ord)?0:a.ord-b.ord));
    const sbP=new Map();sb.forEach(b=>{if(!sbP.has(b.poc))sbP.set(b.poc,b)});
    const cl=rc.map(x=>{
      const q=sbP.get(x.ic),k=pk+'|'+x.ic,gr=gk.get(k),a=alert.get(t.tour+'|'+x.ic)||null;
      const e=q?q.est:'SD';
      const hp=gr?s5(gr['Hora plan Llegada cliente']):null,hr=gr?s5(gr['Hora ejec Llegada cliente']):null;
      const sq=gr&&!isNaN(gr.sr)?Math.round(gr.sr):null,sp=gr&&!isNaN(gr.sp)?Math.round(gr.sp):null;
      const gv=gr?String(gr['Cliente visitado'])==='Si':null;
      const tvr=gr?mins(gr['Tiempo visita Real']):null,tvp=gr?mins(gr['Tiempo visita Plan']):null;
      const ab=s5(x.ab)||'nan',ci=s5(x.ci)||'nan';const vent=!(ab<='06:30'&&ci>='23:00');let vok=null;if(vent&&hr)vok=ab<=hr&&hr<=ci;
      let ll=XY[x.ic],lat=ll?ll[0]:null,lon=ll?ll[1]:null;
      if(lat==null&&gr){const a1=num(gr.Latitud),o1=num(gr.Longitud);lat=isNaN(a1)?null:a1;lon=isNaN(o1)?null:o1}
      const fa=a?str(a.fechahoraalerta):'';const fd=fa.slice(0,10)===dia;
      return {c:Number(x.ic),n:title(str(x.nom)).slice(0,38),d:title(str(x.dist)),hl:isNaN(x.hl)?null:r_(x.hl,2),na:x.na,en:x.ent,pe:x.pe,e,
        hp,hr,sq:sq||null,sp,gv,tvr,tvp,hf:q?hmT(q.fi):null,fa:q?hmT(q.ar):null,
        hlr:q?r_(q.rv||0,2):0,fr:q?bool(q.within_radius):null,fro:q&&!NA(q.out_of_radius_reason)?fx(q.out_of_radius_reason):null,
        hle:q?r_(q.dv||0,2):0,
        al:a?str(a.mr).replace('NEN-',''):null,
        ah:a?(fa.slice(11,16)+(fd?'':' ('+fa.slice(8,10)+'/'+fa.slice(5,7)+')')):null,
        ak:a?(fd?fa.slice(11,16):'98:00'):null,
        sv:a&&!NA(a.supervisor)?title(a.supervisor):null,ag:a&&!NA(a.agente)?title(a.agente):null,
        ee:a?str(a.Estado_entrega):null,ch:canal(x.ic,str(x.nom),a),
        tv:a&&!NA(a.telefono_vendedor)?(typeof a.telefono_vendedor==='number'?String(Math.trunc(a.telefono_vendedor)):String(a.telefono_vendedor).split('.')[0]):null,
        rt:a&&!NA(a.retroalimentacion)?String(a.retroalimentacion).trim().slice(0,140):null,
        n3:N3[x.ic]!=null?N3[x.ic]:null,vw:vent?ab+'-'+ci:null,vok,
        la:lat==null?null:r_(lat,5),lo:lon==null?null:r_(lon,5)};
    });
    // eficiencia Geotab
    const gt=geBy.get(pk)||[];let eff=null;
    if(gt.length){const lp=gt.map(g=>secs(g['Hora plan Llegada cliente'])),spp=gt.map(g=>secs(g['Hora plan Salida cliente'])),le=gt.map(g=>secs(g['Hora ejec Llegada cliente'])),se=gt.map(g=>secs(g['Hora ejec Salida cliente']));
      const mn=a=>{const b=a.filter(x=>x!=null);return b.length?Math.min(...b):null},mx=a=>{const b=a.filter(x=>x!=null);return b.length?Math.max(...b):null};
      const hhmm=s=>s==null?null:pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60));
      const vis=gt.map(g=>String(g['Cliente visitado'])==='Si');
      const dev=gt.filter((g,i)=>vis[i]).map(g=>Math.abs(g.sr-g.sp));
      const sum=(a)=>a.reduce((s,x)=>s+(isNaN(x)?0:x),0);
      eff={kmP:r_(sum(gt.map(g=>num(g['Distancia Plan Cliente Ant']))),1),kmE:r_(sum(gt.filter((g,i)=>vis[i]).map(g=>num(g['Distancia ejec Cliente Ant']))),1),
        hP:mn(lp)!=null&&mx(spp)!=null?r_((mx(spp)-mn(lp))/3600,2):null,hE:mn(le)!=null&&mx(se)!=null?r_((mx(se)-mn(le))/3600,2):null,
        nP:gt.length,nE:vis.filter(Boolean).length,adh:dev.length?Math.round(dev.filter(d=>d<=3).length/dev.length*100):null,
        iP:hhmm(mn(lp)),fP:hhmm(mx(spp)),iE:hhmm(mn(le)),fE:hhmm(mx(se))}}
    const et=PL[t.placa]!=null?PL[t.placa]:t.emp;
    // multiparada
    const tm=h=>!h?null:(+h.slice(0,2))*60+(+h.slice(3,5));
    const arr=cl.filter(z=>z.la!=null&&(z.gv||z.fr));
    for(const z of cl){z.mp=null;if(z.la==null||z.gv||z.fr||['NOV','REP','SD'].includes(z.e))continue;let best=null;
      for(const w of arr){if(w===z)continue;const dd=Math.hypot((z.la-w.la)*111000,(z.lo-w.lo)*108000);if(dd>120)continue;
        const a0=tm(w.hr)||tm(w.fa),fz=tm(z.hf);if(a0==null||fz==null)continue;
        if(a0-15<=fz&&fz<=a0+(w.tvr||0)+45){if(best==null||dd<best)best=dd}}
      if(best!=null)z.mp=Math.round(best)}
    const hlb=Bs.filter(b=>b.base===t.tour&&b.tour_status!=='CANCELLED').reduce((s,b)=>s+(isNaN(b.hs)?0:b.hs),0);
    const sdv=sb.reduce((s,b)=>s+(isNaN(b.dv)?0:b.dv),0),srv=sb.reduce((s,b)=>s+(isNaN(b.rv)?0:b.rv),0);
    const cnt={};sb.forEach(b=>cnt[b.est]=(cnt[b.est]||0)+1);
    tours.push({id:t.tour,ruta:t.ruta,v,edt:EDT[et]||et||'—',placa:t.placa,cond:title(str(t.cond)),ini:s5(t.ini)||'nan',
      cli:t.cli,pe:t.pe,ent:t.ent,hlr0:isNaN(t.hl)?null:r_(t.hl,1),hl:r_(Math.max(isNaN(t.hl)?0:t.hl,hlb,sdv+srv),1),na:t.na,
      sal:start[t.tour]!=null?hmT(start[t.tour]):null,p1,p1p,hle:r_(sdv,1),hlr:r_(srv,1),eff,av,cnt,al:cl.filter(z=>z.al).length,cl});
  }
  // SKU sin volumen y pedidos del Radar
  const naM=new Map();f.filter(r=>isNaN(r.vol)).forEach(r=>{const k=id(r.IDMat);if(!naM.has(k))naM.set(k,{m:str(r.Material),l:0,q:0});const o=naM.get(k);o.l++;o.q+=num(r.CantPed)||0});
  const nasku=[...naM.entries()].map(([k,o])=>[Number(k),o.m,o.l,o.q]);
  const ped=[...groupBy(f,r=>id(r.Pedido)).entries()].map(([p,g])=>{const hl=g.map(r=>num(r.CantEnt)*num(r.Factor)*r.vol/1e5);
    return [Number(p),Number(id(firstNN(g,'IDCli'))),str(firstNN(g,'Cliente')),str(firstNN(g,'Ruta')),NA(firstNN(g,'BDR'))?null:String(firstNN(g,'BDR')),NA(firstNN(g,'Supervisor'))?null:String(firstNN(g,'Supervisor')),Number(id(firstNN(g,'Viaje'))),Number(id(firstNN(g,'Transporte'))),noPE(firstNN(g,'Placa')),g.reduce((s,r)=>s+(num(r.CantPed)||0),0),isNaN(sumMin1(hl))?null:r_(sumMin1(hl),4),hl.filter(isNaN).length]});
  ped.sort((a,b)=>a[3].localeCompare(b[3])||a[6]-b[6]||a[0]-b[0]);
  // SIC
  const byp={};tours.forEach(t=>(byp[t.placa]=byp[t.placa]||[]).push(t));
  const td=v=>NA(v)?null:(typeof v==='number'?r_(v*24,2):(()=>{const s=secs(v);return s==null?null:r_(s/3600,2)})());
  const sic=SI.filter(x=>!NA(x.Unidad)).map(x=>{const pl=str(x.Unidad),ts=byp[pl]||[],et=PL[pl];
    const row={placa:pl,edt:ts.length?ts[0].edt:(typeof et==='string'?(EDT[et]||et):'—'),rutas:[...new Set(ts.map(t=>t.ruta))].sort(),vj:ts.length,
      ini:s5(x['Hora Ini. Real']),fin:s5(x['H. Fin Real']),lim:s5(x['Hora Fin Plan (lim. 10:30)']),av:td(x['Tiempo Avance']),rest:td(x['Tiempo Restante']),
      km:NA(x['Dist. (Km)'])?null:r_(num(x['Dist. (Km)']),1),tcd:s5(x['Tiempo en CD']),ub:NA(x['Ubicación'])?null:String(x['Ubicación'])};
    // salida del viaje 1 = salida de geocerca del SIC; si el SIC no la tiene, la unidad sigue en el CD (no se usa el inicio de BEES)
    ts.forEach(t=>{if(t.v!==1)return;t.salF=t.sal;t.sal=row.ini||null;t.salSrc=row.ini?'SIC':'SIC-CD'});return row});
  if(sic.length)tours.forEach(t=>{if(t.v===1&&!t.salSrc)t.salSrc='BEES'});
  tours.forEach(t=>t.placa=noPE(t.placa));sic.forEach(s=>s.placa=noPE(s.placa));
  return {fecha:pad(Dd)+'/'+pad(M)+'/'+Y,dia,cortes:CORTES,tours,cd:[-12.0335,-77.1065],asis:ASIS,nasku:nasku.map(x=>[x[0],x[1]]),naskuD:nasku,sic,ped};
}

/* ---------- bitácora ---------- */
function bita(S){ // S: hojas como AOA
  const sh=re=>{const k=Object.keys(S).find(n=>re.test(n));return k?S[k]:[]};
  const ok=s=>{s=dateOf(s);if(!s)return null;let y=+s.slice(0,4);if(y<2000)s=(y+1000)+s.slice(4);return s};
  const de=objs(sh(/^DESPLANIFICACI/i)),rec=objs(sh(/^RECLAMOS$/i)),adu=objs(sh(/^ADULTERADO$/i)),be=objs(sh(/^BD EDT$/i)),bcl=objs(sh(/^BD CLIENTE$/i));
  const edt={};be.forEach(r=>{const k=str(r.Ruta);if(!(k in edt))edt[k]=r['E.T']});
  const bc={};bcl.forEach(r=>{const k=id(r['Customer ID']);if(k&&!(k in bc))bc[k]=r});
  const en=r=>{const e=edt[str(r)];return e==null?'Sin EDT':(EDTN[e]||(typeof e==='string'?e:'Sin EDT'))};
  const acc=v=>{v=str(v).toUpperCase();return v.includes('ZT')?'ZT':(v.includes('REPROG')?'REP':'SC')};
  const D=[];
  de.forEach(r=>{const f=ok(r.FECHA);if(!f||NA(r.CODIGO))return;const cs=id(r.CODIGO);const isN=/^\d+$/.test(cs);const c=isN?Number(cs):cs;
    const b=isN?bc[cs]:null;const sv=b?b['Supervisor Name']:null;let ca=num(r.CA);if(isNaN(ca)||ca>3000)ca=0;const hl=num(r.HL);
    const ruta=str(r.RUTA),cli=title(fx(str(r.CLIENTE))).slice(0,40);const vac=v=>['-','nan',''].includes(v.trim().toLowerCase());if(vac(ruta)&&vac(cli))return;
    D.push([f,ruta,noPE(str(r.PLACA)),en(r.RUTA),c,cli,ca,isNaN(hl)?0:hl,acc(r.__r[13]),NA(r.MOTIVO)?'':title(String(r.MOTIVO)),typeof sv==='string'?title(fx(sv)):'Sin supervisor',NA(r.ALERTADO)?'':String(r.ALERTADO),b&&typeof b['Sales Zone']==='string'?b['Sales Zone']:''])});
  const Rr=[];rec.forEach(r=>{const f=ok(r.FECHA);if(!f)return;const x=r.__r;
    Rr.push([f,str(r.ASISTENTE),str(r.RUTA),en(r.RUTA),id(r.CODIGO),title(fx(str(r.CLIENTE))).slice(0,40),str(x[6]),str(r.MEDIO),NA(r.SV)?'':String(r.SV),str(r.STATUS),NA(x[11])?'':(ok(x[11])||''),NA(x[12])?'':fx(String(x[12])).slice(0,160)])});
  const A=[];adu.forEach(r=>{const f=ok(r.FECHA);if(!f)return;const x=r.__r;const q=num(x[5]);
    A.push([f,id(r.CODIGO),title(fx(str(r.CLIENTE))).slice(0,40),str(r.MATERIAL),isNaN(q)?0:q,str(r.RUTA),EDTN[str(r.EDT)]||title(str(r.EDT))])});
  // agendas telefónicas de los EDT
  const ag=sh(/^AGENDAS TEL/i);let agf=null;const AG={};
  if(ag.length){agf=dateOf((ag[2]||[])[1]);
    [[1,'ATLAS','930 439 078','DANIA RODRIGUEZ'],[6,'ADRIAN CAR','927346022','FRANCESCA VIETI'],[11,'REPARTO ROSALES','949134826','MARIBEL PUJADA'],[16,'LOGITRACK','','']].forEach(([c,et,tel,sup])=>{
      AG[et]={tel,sup,rows:[]};for(let i=4;i<ag.length;i++){const r=ag[i]||[];if(NA(r[c]))continue;const tl=r[c+3];
        AG[et].rows.push([String(r[c]).trim(),str(r[c+1]).trim(),str(r[c+2]).trim(),NA(tl)?'':(typeof tl==='number'?String(Math.trunc(tl)):String(tl).trim())])}})}
  const now=new Date(Date.now()-5*3600e3);
  return {act:pad(now.getUTCDate())+'/'+pad(now.getUTCMonth()+1)+'/'+now.getUTCFullYear()+' '+pad(now.getUTCHours())+':'+pad(now.getUTCMinutes()),d:D,r:Rr,a:A,ag:AG,agf};
}

const API={calc,bita,detect,fechaDe,TIPOS,noPE};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else G.MOTOR=API;
})(typeof window!=='undefined'?window:globalThis);
