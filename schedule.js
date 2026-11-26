/* Pulmo – Распоред (смени). Независен од картичките. Податоците се во localStorage + Firestore (pulmo/schedule). */
(function(){
"use strict";
const MON=["ЈАНУАРИ","ФЕВРУАРИ","МАРТ","АПРИЛ","МАЈ","ЈУНИ","ЈУЛИ","АВГУСТ","СЕПТЕМВРИ","ОКТОМВРИ","НОЕМВРИ","ДЕКЕМВРИ"];
const WD2=["НЕ","ПО","ВТ","СР","ЧЕ","ПЕ","СА"], WD3=["НЕД","ПОН","ВТО","СРЕ","ЧЕТ","ПЕТ","САБ"];
const HOL=["01-01","01-07","05-01","05-24","08-02","09-08","10-11","10-23","12-08"];
const GROUPS={
  bol:{title:"Болничари",wd:WD2,spill:true,hours:false,num:false,name:"Болничари"},
  ses:{title:"Сестри",wd:WD3,spill:false,hours:true,num:true,name:"Сестри"},
  hig:{title:"Хигиеничари",wd:WD2,spill:false,hours:true,num:true,name:"Хигиеничари"}
};
const CODES=["1","2","3","ДН","ОД","СЛ","са","не","пр","бол","БРО","БРОХ","ПОР","П1","П2","П3"];
const COL={"1":"00B050","2":"FFFF00","3":"FF0000","ДН":"FFC000","ОД":"7030A0","СЛ":"00B0F0"};
const HRS={"1":8,"2":8,"3":12,"ДН":12,"П1":12,"П2":8,"П3":4};
const KEY="pulmo_sched_v1";
let S=load(), grp="bol", ym=defYM(), code="1", selRow=null, ref=null, unsub=null, pushT=null, hostEl=null;

function defYM(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function blank(){return {t:0,g:{bol:{rows:[],m:{},foot:["","Потпис","ЈЗУ УНИВЕРЗИТЕТСКА КЛИНИКА ЗА ПУЛМОЛОГИЈА И АЛЕРГОЛОГИЈА СКОПЈЕ","","в.д. Директор",""]},
  ses:{rows:[],m:{},foot:["","Потпис","ЈЗУ УНИВЕРЗИТЕТСКА КЛИНИКА ЗА ПУЛМОЛОГИЈА И АЛЕРГОЛОГИЈА СКОПЈЕ","","в.д. Директор",""]},
  hig:{rows:[],m:{},foot:["ЈЗУ УНИВЕРЗИТЕТСКА КЛИНИКА ЗА ПУЛМОЛОГИЈА И АЛЕРГОЛОГИЈА СКОПЈЕ","","в.д. Директор",""]}}};}
function load(){try{const o=JSON.parse(localStorage.getItem(KEY));if(o&&o.g)return o;}catch(e){}return blank();}
function save(){S.t=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}
  clearTimeout(pushT);pushT=setTimeout(push,700);}
function push(){if(!ref)return;try{ref.set({d:JSON.stringify(S),t:S.t}).catch(e=>note("Грешка при синхронизација: "+e.code));}catch(e){}}
function note(m){const s=document.getElementById("syncmsg");if(s)s.textContent=m;}
function parts(s){const a=s.split("-");return [+a[0],+a[1]];}
function mlen(s){const [y,m]=parts(s);return new Date(y,m,0).getDate();}
function ncols(g,s){return GROUPS[g].spill?Math.max(35,mlen(s)):mlen(s);}
function dateOf(s,i){const [y,m]=parts(s);return new Date(y,m-1,i);}
function isHol(d){return HOL.includes(String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"));}
function mname(s){const [y,m]=parts(s);return MON[m-1];}
function cap(t){return t.charAt(0)+t.slice(1).toLowerCase();}
function G(){return S.g[grp];}
function M(create){const g=G();if(!g.m[ym]&&create)g.m[ym]={};return g.m[ym];}
function cell(rid,i){const m=G().m[ym];return (m&&m[rid]&&m[rid][i])||"";}
function setCell(rid,i,v){const m=M(true);(m[rid]=m[rid]||{});if(v)m[rid][i]=v;else delete m[rid][i];}
function uid(){return "r"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);}
function hours(rid,n){let h=0,d=0;for(let i=1;i<=mlen(ym);i++){const c=cell(rid,i).toUpperCase();h+=HRS[c]||0;if(c==="ДН")d++;}return [h,d];}

/* автоматски: викенди (са/не) и празници (пр) во празни полиња */
function autofill(rid){
  const g=G(),n=ncols(grp,ym);const ids=rid?[rid]:g.rows.map(r=>r.id);
  for(const id of ids)for(let i=1;i<=n;i++){
    if(cell(id,i))continue;const d=dateOf(ym,i),w=d.getDay();
    if(w===6)setCell(id,i,"са");else if(w===0)setCell(id,i,"не");else if(isHol(d))setCell(id,i,"пр");
  }
}
function ensureMonth(){const g=G();if(!g.m[ym]){g.m[ym]={};autofill();save();}}

/* ---------- UI ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function css(){
  if(document.getElementById("schcss"))return;
  const st=document.createElement("style");st.id="schcss";st.textContent=`
body.sch .tools,body.sch .bar,body.sch .foot,body.sch #pv{display:none!important}
.sg{display:flex;gap:6px;margin:0 0 8px}.sg button,.sb button,.sp button,.sr button{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:8px;padding:8px 10px}
.sg button{flex:1;font-weight:600}.sg button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.sm{display:flex;align-items:center;gap:8px;margin:0 0 8px}.sm b{flex:1;text-align:center;font-size:16px}.sm button{padding:6px 14px;font-size:18px}
.sp{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 8px}.sp button{min-width:38px;padding:7px 6px;font-weight:700;font-size:13px}.sp button.on{outline:3px solid var(--ink);outline-offset:-1px}
.sb,.sr{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.sr{background:var(--accent-soft);padding:8px;border-radius:10px}
.sw{overflow:auto;border:1px solid var(--line);border-radius:8px;background:var(--card);max-height:70vh}
table.st{border-collapse:separate;border-spacing:0;font-size:12px}
table.st th,table.st td{border-right:1px solid var(--line);border-bottom:1px solid var(--line);text-align:center;padding:0;min-width:32px;height:30px}
table.st thead th{position:sticky;top:0;background:#44546a;color:#fff;z-index:2;font-weight:600}
table.st thead tr.w th{background:#d6dce4;color:#222;top:0}table.st thead tr.d th{top:22px}
table.st th.nm,table.st td.nm{position:sticky;left:0;min-width:130px;max-width:130px;text-align:left;padding:0 6px;background:var(--card);z-index:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
table.st thead th.nm{z-index:3;background:#44546a}table.st tr.sel td.nm{background:var(--accent-soft);font-weight:700}
table.st td.c{cursor:pointer;font-weight:600;user-select:none}table.st td.we{background:rgba(127,127,127,.08)}table.st td.sp2{opacity:.55}
table.st td.h{min-width:44px;font-weight:700;background:var(--card)}
details.sf{margin:10px 0}details.sf textarea{width:100%;min-height:120px;font:inherit;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:8px}
.sh{color:var(--mute);font-size:12px;margin:6px 0}
`;document.head.appendChild(st);}
function chipStyle(c){const k=c.toUpperCase();return COL[k]?`background:#${COL[k]};color:${k==="ОД"||k==="3"?"#fff":"#000"};border-color:transparent`:"";}
function render(){
  css();hostEl=document.getElementById("main");document.body.classList.add("sch");
  const g=G(),cfg=GROUPS[grp];ensureMonth();const n=ncols(grp,ym),[y,mo]=parts(ym),L=mlen(ym);
  document.getElementById("sub").textContent=`Распоред · ${cfg.title} · ${cap(mname(ym))} ${y}`;
  let h=`<div class="sg">${Object.keys(GROUPS).map(k=>`<button data-g="${k}" class="${k===grp?"on":""}">${GROUPS[k].title}</button>`).join("")}</div>`;
  h+=`<div class="sm"><button data-mv="-1">‹</button><b>${cap(mname(ym))} ${y}</b><button data-mv="1">›</button></div>`;
  h+=`<div class="sp">${CODES.concat(["✕"]).map(c=>`<button data-c="${c}" class="${c===code?"on":""}" style="${chipStyle(c)}">${c}</button>`).join("")}</div>`;
  if(!g.rows.length)h+=`<div class="empty">Нема вработени во оваа група.<br>Притиснете <b>Увези .xlsx</b> за да ги вчитате од постоечкиот Excel, или <b>+ Вработен</b>.</div>`;
  else{
    h+=`<div class="sw"><table class="st"><thead><tr class="w"><th class="nm">${y} ${cfg.num?cap(mname(ym)):mname(ym)}</th>`;
    for(let i=1;i<=n;i++)h+=`<th>${cfg.wd[dateOf(ym,i).getDay()]}</th>`;
    if(cfg.hours)h+=`<th>Часови</th><th>Дн.Нед.</th>`;
    h+=`</tr><tr class="d"><th class="nm">ИМЕ И ПРЕЗИМЕ</th>`;
    for(let i=1;i<=n;i++)h+=`<th>${i>L?i-L:i}</th>`;
    if(cfg.hours)h+=`<th></th><th></th>`;h+=`</tr></thead><tbody>`;
    g.rows.forEach((r,ri)=>{
      h+=`<tr data-r="${r.id}" class="${r.id===selRow?"sel":""}"><td class="nm" data-nm="${r.id}">${cfg.num?(ri+1)+". ":""}${esc(r.name)||"—"}</td>`;
      for(let i=1;i<=n;i++){const v=cell(r.id,i),w=dateOf(ym,i).getDay();
        h+=`<td class="c${w===0||w===6?" we":""}${i>L?" sp2":""}" data-i="${i}" style="${chipStyle(v)}">${esc(v)}</td>`;}
      if(cfg.hours){const [hh,dd]=hours(r.id,n);h+=`<td class="h">${hh}</td><td class="h">${dd}</td>`;}
      h+=`</tr>`;});
    h+=`</tbody></table></div>`;
    h+=`<div class="sh">Изберете код горе, па допирајте ги полињата. Исто полје со ист код = бришење. Допрете име за уредување на редот.</div>`;
  }
  if(selRow&&g.rows.find(r=>r.id===selRow))h+=`<div class="sr"><button data-a="ren">Преименувај</button><button data-a="fillwd">Работни денови = ${esc(code)}</button><button data-a="clr">Исчисти ред</button><button data-a="up">↑</button><button data-a="dn">↓</button><button data-a="del">Избриши</button></div>`;
  h+=`<div class="sb"><button data-a="add">+ Вработен</button><button data-a="auto">Викенди/празници</button><button data-a="imp">Увези .xlsx</button><button data-a="expm">Извези месец .xlsx</button><button data-a="expa">Извези сè .xlsx</button></div>`;
  h+=`<details class="sf"><summary>Подножје (потпис, директор) – еден ред по линија</summary><textarea id="sfoot">${esc(g.foot.join("\n"))}</textarea></details>`;
  h+=`<div class="sh">Празници што се додаваат автоматски: фиксните (1.1, 7.1, 1.5, 24.5, 2.8, 8.9, 11.10, 23.10, 8.12). Велигден и Бајрам се внесуваат рачно.</div>`;
  h+=`<input type="file" id="sfile" accept=".xlsx" hidden>`;
  hostEl.innerHTML=h;
}
function unrender(){document.body.classList.remove("sch");}

function bind(){
  const main=document.getElementById("main");
  main.addEventListener("click",e=>{
    if(!document.body.classList.contains("sch"))return;
    const t=e.target.closest("button,td,summary");if(!t)return;const g=G();
    if(t.dataset.g){grp=t.dataset.g;selRow=null;render();return;}
    if(t.dataset.mv){const [y,m]=parts(ym),d=new Date(y,m-1+(+t.dataset.mv),1);ym=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");selRow=null;render();return;}
    if(t.dataset.c){code=t.dataset.c;render();return;}
    if(t.dataset.nm){selRow=selRow===t.dataset.nm?null:t.dataset.nm;render();return;}
    if(t.dataset.i){const rid=t.closest("tr").dataset.r,i=+t.dataset.i,cur=cell(rid,i),nv=code==="✕"?"":(cur===code?"":code);setCell(rid,i,nv);save();
      t.textContent=nv;t.style.cssText=chipStyle(nv);const cfg=GROUPS[grp];if(cfg.hours){const [hh,dd]=hours(rid,0),tds=t.closest("tr").querySelectorAll("td.h");tds[0].textContent=hh;tds[1].textContent=dd;}return;}
    const a=t.dataset.a;if(!a)return;const idx=g.rows.findIndex(r=>r.id===selRow);
    if(a==="add"){const nm=prompt("Име и презиме:");if(nm&&nm.trim()){const r={id:uid(),name:nm.trim()};g.rows.push(r);autofill(r.id);selRow=r.id;save();render();}}
    else if(a==="auto"){autofill();save();render();}
    else if(a==="ren"&&idx>=0){const nm=prompt("Ново име:",g.rows[idx].name);if(nm!==null){g.rows[idx].name=nm.trim();save();render();}}
    else if(a==="fillwd"&&idx>=0){const n=ncols(grp,ym);for(let i=1;i<=n;i++){const w=dateOf(ym,i).getDay(),c=cell(selRow,i);if(w!==0&&w!==6&&!c)setCell(selRow,i,code);}save();render();}
    else if(a==="clr"&&idx>=0){if(confirm("Исчисти го редот за овој месец?")){delete G().m[ym][selRow];autofill(selRow);save();render();}}
    else if((a==="up"&&idx>0)||(a==="dn"&&idx>=0&&idx<g.rows.length-1)){const j=a==="up"?idx-1:idx+1;[g.rows[idx],g.rows[j]]=[g.rows[j],g.rows[idx]];save();render();}
    else if(a==="del"&&idx>=0){if(confirm("Избриши го вработениот од распоредот (сите месеци)?")){const id=selRow;g.rows.splice(idx,1);for(const k in g.m)delete g.m[k][id];selRow=null;save();render();}}
    else if(a==="imp"){document.getElementById("sfile").click();}
    else if(a==="expm"){exportXlsx([ym]);}
    else if(a==="expa"){exportXlsx(Object.keys(g.m).sort());}
  });
  main.addEventListener("change",e=>{if(e.target.id==="sfile"){const f=e.target.files[0];e.target.value="";if(f)importXlsx(f);}});
  main.addEventListener("input",e=>{if(e.target.id==="sfoot"){G().foot=e.target.value.split("\n");save();}});
}

/* ---------- ExcelJS ---------- */
function loadX(){
  if(window.ExcelJS)return Promise.resolve();
  return new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";s.onload=ok;s.onerror=()=>no(new Error("ExcelJS не се вчита (потребен е интернет)"));document.head.appendChild(s);});
}
function colL(n){let s="";while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=Math.floor((n-1)/26);}return s;}
async function exportXlsx(months){
  const g=G(),cfg=GROUPS[grp];
  if(!g.rows.length){alert("Нема вработени.");return;}
  try{await loadX();}catch(e){alert(e.message);return;}
  const wb=new ExcelJS.Workbook();const thin={style:"thin",color:{argb:"FF9A9A9A"}},bd={top:thin,left:thin,bottom:thin,right:thin};
  const saveYM=ym;
  for(const s of months){
    ym=s;const [y,mo]=parts(s),L=mlen(s),n=ncols(grp,s);
    const ws=wb.addWorksheet((cap(mname(s))+" "+y).slice(0,31),{pageSetup:{orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9}});
    const c0=cfg.num?2:1,nameC=c0,d0=c0+1,dEnd=d0+n-1,hC=dEnd+2;
    ws.getColumn(nameC).width=cfg.num?30:29;if(cfg.num)ws.getColumn(1).width=5;
    for(let i=0;i<n;i++)ws.getColumn(d0+i).width=cfg.wd===WD3?6.3:6.6;
    const title=y+" "+(cfg.num||grp==="hig"?(grp==="hig"?cap(mname(s)):mname(s)):mname(s));
    const t=ws.getCell(1,nameC);t.value=title;t.font={bold:true,size:14,color:{argb:"FFFFFFFF"}};t.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF2E75B6"}};
    const h2=ws.getCell(2,nameC);h2.value="ИМЕ И ПРЕЗИМЕ НА ВРАБОТЕН";h2.font={bold:true,size:9,color:{argb:"FFFFFFFF"}};h2.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF808080"}};h2.alignment={wrapText:true,vertical:"middle"};
    for(let i=1;i<=n;i++){
      const a=ws.getCell(1,d0+i-1),b=ws.getCell(2,d0+i-1);
      a.value=cfg.wd[dateOf(s,i).getDay()];a.font={bold:true,size:9,color:{argb:"FF1F2D3D"}};a.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFD6DCE4"}};a.alignment={horizontal:"center"};a.border=bd;
      b.value=i>L?i-L:i;b.font={size:9,color:{argb:"FFFFFFFF"}};b.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF44546A"}};b.alignment={horizontal:"center"};b.border=bd;}
    if(cfg.hours){["Часови","Дн.Нед."].forEach((tx,k)=>{const c=ws.getCell(2,hC+k);c.value=tx;c.font={bold:true,size:9,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF44546A"}};c.alignment={horizontal:"center"};c.border=bd;});ws.getColumn(hC).width=9;ws.getColumn(hC+1).width=9.5;}
    ws.getRow(1).height=20;ws.getRow(2).height=24;
    g.rows.forEach((r,ri)=>{
      const rr=3+ri;ws.getRow(rr).height=16;if(cfg.num){const c=ws.getCell(rr,1);c.value=ri+1;c.font={name:"Times New Roman",size:10};c.alignment={horizontal:"center"};c.border=bd;}
      const nc=ws.getCell(rr,nameC);nc.value=r.name;nc.font={bold:true,size:10,name:"Times New Roman"};nc.border=bd;
      for(let i=1;i<=n;i++){const v=cell(r.id,i),c=ws.getCell(rr,d0+i-1);if(v!==""){c.value=/^\d+$/.test(v)?+v:v;}c.alignment={horizontal:"center",vertical:"middle"};c.font={size:10};c.border=bd;}
      if(cfg.hours){const rg=`${colL(d0)}${rr}:${colL(d0+L-1)}${rr}`;const [hh,dd]=hours(r.id,n);
        const f="COUNTIF("+rg+',"1")*8+COUNTIF('+rg+',"2")*8+COUNTIF('+rg+',"3")*12+COUNTIF('+rg+',"ДН")*12+COUNTIF('+rg+',"П1")*12+COUNTIF('+rg+',"П2")*8+COUNTIF('+rg+',"П3")*4';
        const a=ws.getCell(rr,hC),b=ws.getCell(rr,hC+1);a.value={formula:f,result:hh};b.value={formula:`COUNTIF(${rg},"ДН")`,result:dd};
        [a,b].forEach(c=>{c.alignment={horizontal:"center"};c.font={bold:true,size:10};c.border=bd;});}
    });
    const last=2+g.rows.length,range=`${colL(d0)}3:${colL(dEnd)}${last}`;
    const rules=[["ДН","FFC000"],["ОД","7030A0"],["СЛ","00B0F0"],["3","FF0000"],["1","00B050"],["2","FFFF00"]].map(([k,c],pi)=>({type:"cellIs",operator:"equal",formulae:[/^\d$/.test(k)?k:`"${k}"`],style:{fill:{type:"pattern",pattern:"solid",bgColor:{argb:"FF"+c}},font:k==="ОД"?{color:{argb:"FFFFFFFF"}}:undefined},priority:pi+1}));
    ws.addConditionalFormatting({ref:range,rules});
    const fc=Math.min(dEnd,d0+13),f0=last+3;
    g.foot.forEach((tx,k)=>{if(!tx)return;const c=ws.getCell(f0+k,fc);c.value=tx;c.font={size:10,bold:/УНИВЕРЗ|Директор|Прим|Д-р|др\./i.test(tx)};});
    ws.views=[{state:"frozen",xSplit:nameC,ySplit:2}];
  }
  ym=saveYM;
  const buf=await wb.xlsx.writeBuffer();
  const fn=`Распоред-${cfg.name}-${months.length===1?months[0]:"сите-месеци"}.xlsx`;
  const url=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
  const a=document.createElement("a");a.href=url;a.download=fn;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},4000);
}

/* ---------- увоз од постоечки Excel ---------- */
const cv=v=>{if(v==null)return"";if(typeof v==="object"){if(v.result!==undefined)v=v.result;else if(v.richText)v=v.richText.map(x=>x.text).join("");else if(v.text)v=v.text;else return"";}return String(v==null?"":v).trim();};
const nk=s=>s.replace(/\s+/g," ").trim().toLowerCase();
async function importXlsx(file){
  try{await loadX();}catch(e){alert(e.message);return;}
  const wb=new ExcelJS.Workbook();
  try{await wb.xlsx.load(await file.arrayBuffer());}catch(e){alert("Не може да се прочита датотеката.");return;}
  const found=[];
  wb.eachSheet(ws=>{
    let title="";for(let c=1;c<=4&&!title;c++){const t=cv(ws.getCell(1,c).value);if(/\d{4}/.test(t))title=t;}
    const mm=title.match(/(\d{4})\s+([А-Яа-яЃѓЌќЏџЉљЊњЅѕЈј]+)/);if(!mm)return;
    const mi=MON.indexOf(mm[2].toUpperCase());if(mi<0)return;
    const s=mm[1]+"-"+String(mi+1).padStart(2,"0"),L=mlen(s);
    let nameC=0;for(const c of [1,2]){const t=cv(ws.getCell(3,c).value);if(t&&isNaN(+t)){nameC=c;break;}}
    if(!nameC)return;
    const days=[];let prev=0,off=0;
    for(let c=nameC+1;c<nameC+45;c++){const v=ws.getCell(2,c).value,x=typeof v==="number"?v:(v&&typeof v==="object"&&typeof v.result==="number"?v.result:NaN);if(isNaN(x))break;
      if(prev&&x<prev)off=L;prev=x;days.push([c,x+off]);}
    if(!days.length||days[0][1]!==1)return;
    const rows=[];let r=3,gap=0;
    for(;r<=ws.rowCount&&gap<1;r++){const nm=cv(ws.getCell(r,nameC).value);if(!nm){gap++;continue;}
      const cells={};for(const [c,i] of days){const v=cv(ws.getCell(r,c).value);if(v)cells[i]=v;}rows.push({name:nm,cells});}
    // подножје: текст под табелата (прв ненаместен ред по податоците)
    const foot=[];let fcol=0,fr=r;
    for(let rr=r;rr<=ws.rowCount&&rr<r+14;rr++){for(let c=nameC;c<=nameC+36;c++){const t=cv(ws.getCell(rr,c).value);if(t&&isNaN(+t)){if(!fcol)fcol=c;if(c===fcol){foot[rr-r]=t;}}}}
    let fl=foot.map(x=>x||"");while(fl.length&&!fl[0])fl.shift();
    found.push({s,rows,foot:fl,n:rows.reduce((a,r)=>a+Object.keys(r.cells).length,0)});
  });
  if(!found.length){alert("Не најдов месечни табели во оваа датотека.");return;}
  const g=G();
  const byYm={};found.forEach(f=>{if(!byYm[f.s]||f.n>=byYm[f.s].n)byYm[f.s]=f;}); // за ист месец се зема табелата со повеќе внесени податоци
  const sorted=Object.keys(byYm).filter(k=>byYm[k].n>0).sort();if(!sorted.length){alert("Табелите се празни.");return;}const latest=byYm[sorted[sorted.length-1]];
  if(!confirm(`Најдени ${sorted.length} месеци (${sorted[0]} … ${sorted[sorted.length-1]}).\nСпискот на вработени се зема од последниот месец (${latest.rows.length} вработени). Увези во „${GROUPS[grp].title}“?`))return;
  const idBy={};
  g.rows.forEach(r=>idBy[nk(r.name)]=r.id);
  latest.rows.forEach(r=>{if(!idBy[nk(r.name)]){const id=uid();g.rows.push({id,name:r.name});idBy[nk(r.name)]=id;}});
  for(const s of sorted){const f=byYm[s];g.m[s]={};
    f.rows.forEach(r=>{const id=idBy[nk(r.name)];if(!id)return;g.m[s][id]=Object.assign({},r.cells);});}
  for(let k=sorted.length-1;k>=0;k--){const ff=byYm[sorted[k]].foot;if(ff.some(Boolean)){g.foot=ff.slice();break;}}
  ym=sorted[sorted.length-1];selRow=null;save();render();
  note("Увезени "+sorted.length+" месеци ✓");
}

/* ---------- Firestore ---------- */
function attach(db){
  detach();ref=db.collection("pulmo").doc("schedule");
  unsub=ref.onSnapshot(s=>{
    if(s.metadata.hasPendingWrites)return;
    const d=s.exists&&s.data();
    if(d&&d.d){try{const c=JSON.parse(d.d);if((c.t||0)>(S.t||0)){S=c;try{localStorage.setItem(KEY,d.d);}catch(e){}if(document.body.classList.contains("sch")&&!(document.activeElement&&document.activeElement.id==="sfoot"))render();}else if((c.t||0)<(S.t||0))push();}catch(e){}}
    else if(S.t)push();
  },err=>note("Распоред: "+err.code));
}
function detach(){if(unsub){try{unsub();}catch(e){}}unsub=null;ref=null;}

bind();
window.SCH={render,unrender,attach,detach};
})();
