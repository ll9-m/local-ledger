/* 本地记账本 · 公共层：数据 + 类别 + 格式化 + 主题
   首页 index.html 与记一笔 add.html 共用，两个页面靠 localStorage 同步。 */
'use strict';

var KEY='local_ledger_v1';
var CATKEY='local_ledger_cats_v1';
var DEFAULT_CATS={
  expense:[
    {id:'food',n:'餐饮',c:'食',color:'#E8434F',weak:'#FDEAEC'},
    {id:'shop',n:'购物',c:'购',color:'#F0813C',weak:'#FFF0E4'},
    {id:'traffic',n:'交通',c:'行',color:'#2A6BFF',weak:'#E7EEFF'},
    {id:'fun',n:'娱乐',c:'乐',color:'#8B5CF6',weak:'#F1EBFE'},
    {id:'live',n:'居住',c:'住',color:'#0E9AA7',weak:'#E0F5F7'},
    {id:'med',n:'医疗',c:'医',color:'#12B886',weak:'#DFF7EE'},
    {id:'edu',n:'教育',c:'育',color:'#E8A33D',weak:'#FFF4E2'},
    {id:'tel',n:'通讯',c:'话',color:'#6B7BF7',weak:'#EAEDFE'},
    {id:'cloth',n:'服饰',c:'衣',color:'#DB5CA5',weak:'#FDE9F4'},
    {id:'social',n:'人情',c:'情',color:'#D0565F',weak:'#FCE7E8'},
    {id:'pet',n:'宠物',c:'宠',color:'#3D8BE0',weak:'#E5F0FC'},
    {id:'other_e',n:'其他',c:'他',color:'#8C8C8C',weak:'#F0F0F0'}
  ],
  income:[
    {id:'salary',n:'工资',c:'薪',color:'#00A06B',weak:'#DFF7EC'},
    {id:'bonus',n:'奖金',c:'奖',color:'#0E9AA7',weak:'#E0F5F7'},
    {id:'parttime',n:'兼职',c:'兼',color:'#3D8BE0',weak:'#E5F0FC'},
    {id:'invest',n:'理财',c:'理',color:'#F0813C',weak:'#FFF0E4'},
    {id:'redpkt',n:'红包',c:'包',color:'#D0565F',weak:'#FCE7E8'},
    {id:'other_i',n:'其他',c:'他',color:'#8C8C8C',weak:'#F0F0F0'}
  ]
};
/* 类别：内置 + 自定义，存本机，可增删改与排序 */
var CATS={expense:[],income:[]};
function defaultCats(){
  var o={expense:[],income:[]};
  ['expense','income'].forEach(function(t){
    DEFAULT_CATS[t].forEach(function(c){ o[t].push({id:c.id,n:c.n,c:c.c,color:c.color,weak:c.weak,builtin:true}); });
  });
  return o;
}
function loadCats(){
  CATS=defaultCats();
  try{
    var s=localStorage.getItem(CATKEY);
    if(s){
      var o=JSON.parse(s);
      ['expense','income'].forEach(function(t){
        if(Array.isArray(o[t]) && o[t].length) CATS[t]=o[t].map(function(c){
          return {id:c.id,n:c.n,c:c.c,color:c.color,weak:c.weak||weakOf(c.color),builtin:!!c.builtin};
        });
      });
    }
  }catch(e){}
}
function saveCats(){ try{ localStorage.setItem(CATKEY,JSON.stringify(CATS)); }catch(e){} }
function weakOf(hex){
  var h=hex.replace('#','');
  var r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
  var f=function(v){ return Math.round(v+(255-v)*0.86); };
  return '#'+[f(r),f(g),f(b)].map(function(v){return ('0'+v.toString(16)).slice(-2);}).join('');
}
function catArr(type){ return (CATS[type]&&CATS[type].length)? CATS[type] : CATS.expense; }
function catOf(type,id){
  var arr=catArr(type);
  for(var i=0;i<arr.length;i++){ if(arr[i].id===id) return arr[i]; }
  return arr[arr.length-1];
}

/* ---------- storage ---------- */
var data=[];
var demoPurged=0;   // 本次启动自动清理掉的演示数据条数（>0 时提示一次）
/* 演示数据（旧版首次打开会自动塞进来）用到的备注全集。
   只有「库里每一条备注都在这个集合里」才判定为演示数据——
   只要用户自己记过一笔就命中不了，不会误删真实记录。 */
var DEMO_NOTES=['午餐 · 公司楼下','地铁通勤','设计外包结算','超市日用品','晚餐 · 火锅',
  '房租分摊','电影票 ×2','9月薪资','房租','话费充值','月薪','月度开销','餐饮合计'];

function load(){
  try{ var s=localStorage.getItem(KEY); if(s){ data=JSON.parse(s)||[]; } }catch(e){ data=[]; }
  if(!Array.isArray(data)) data=[];
  purgeDemoOnce();
}
/* 一次性迁移：旧版首次打开会自动写入演示数据，现在改为「首次打开就是空的」。
   已装过的手机上这些演示数据还在，这里把「整库都是演示数据」的情况清掉。 */
function purgeDemoOnce(){
  try{
    if(localStorage.getItem(KEY+'_demo_purged')) return;
    localStorage.setItem(KEY+'_demo_purged','1');
    localStorage.removeItem(KEY+'_seen');   // 旧版「已初始化」标记，作废
    var n=data.length;
    if(n>=8 && data.every(function(r){ return DEMO_NOTES.indexOf(r && r.note)>=0; })){
      data=[]; demoPurged=n; save();
      setTimeout(function(){ toast('已清除 '+n+' 笔示例数据'); },600);
    }
  }catch(e){}
}
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(data)); }catch(e){} }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function pad(n){ return String(n).padStart(2,'0'); }
function isoOf(dt){ return dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate()); }
function todayISO(){ return isoOf(new Date()); }
/* 示例数据：只在用户主动点「载入示例数据」时才写入，首次打开永远是空的 */
function demoData(){
  var out=[], now=new Date(), y=now.getFullYear(), m=now.getMonth();
  var today=now.getDate();
  function d(day){ return new Date(y,m,day); }
  function push(day,amt,cat,note,type){
    out.push({id:uid(),type:type,amount:Math.abs(amt),cat:cat,note:note,date:isoOf(d(day)),ts:Date.now()});
  }
  push(today,38.5,'food','午餐 · 公司楼下','expense');
  push(today,8,'traffic','地铁通勤','expense');
  push(today,200,'parttime','设计外包结算','income');
  if(today>1){ push(today-1,128,'shop','超市日用品','expense'); push(today-1,108,'food','晚餐 · 火锅','expense'); }
  if(today>2){ push(today-2,424,'live','房租分摊','expense'); push(today-2,96,'fun','电影票 ×2','expense'); }
  push(Math.max(1,today-3),8000,'salary','9月薪资','income');
  push(Math.max(1,today-4),1200,'live','房租','expense');
  push(Math.max(1,today-6),380,'tel','话费充值','expense');
  // 前几个月数据，让趋势图/年视图有内容
  for(var back=1;back<=5;back++){
    var pm=new Date(y,m-back,1);
    var dd=Math.min(15,new Date(pm.getFullYear(),pm.getMonth()+1,0).getDate());
    out.push({id:uid(),type:'income',amount:8000,cat:'salary',note:'月薪',date:isoOf(new Date(pm.getFullYear(),pm.getMonth(),dd)),ts:Date.now()});
    out.push({id:uid(),type:'expense',amount:3200+back*260,cat:'live',note:'月度开销',date:isoOf(new Date(pm.getFullYear(),pm.getMonth(),Math.min(20,dd))),ts:Date.now()});
    out.push({id:uid(),type:'expense',amount:900+back*120,cat:'food',note:'餐饮合计',date:isoOf(new Date(pm.getFullYear(),pm.getMonth(),Math.min(25,dd))),ts:Date.now()});
  }
  return out;
}
/* ---------- 筛选（首页列表与批量清理页共用同一份条件） ---------- */
var FKEY='local_ledger_filter';
var EMPTY_FILTER={type:'all',cat:'',from:'',to:'',kw:''};
var filter=cloneObj(EMPTY_FILTER);
function cloneObj(o){ var r={},k; for(k in o){ if(Object.prototype.hasOwnProperty.call(o,k)) r[k]=o[k]; } return r; }
function loadFilter(){
  var f=cloneObj(EMPTY_FILTER);
  try{
    var s=localStorage.getItem(FKEY);
    var o=s? JSON.parse(s) : null;
    if(o && typeof o==='object'){
      Object.keys(EMPTY_FILTER).forEach(function(k){ if(o[k]) f[k]=o[k]; });
    }
  }catch(e){}
  filter=f;
  return filter;
}
function saveFilter(f){
  filter=f? cloneObj(f) : cloneObj(EMPTY_FILTER);
  try{ localStorage.setItem(FKEY,JSON.stringify(filter)); }catch(e){}
}
function clearFilter(){ saveFilter(null); }
function filterOn(f){
  f=f||filter;
  return !!(f.type && f.type!=='all') || !!f.cat || !!f.from || !!f.to || !!(f.kw && String(f.kw).trim());
}
function matchFilter(r,f){
  f=f||filter;
  if(f.type && f.type!=='all' && r.type!==f.type) return false;
  if(f.cat && r.cat!==f.cat) return false;
  if(f.from && r.date<f.from) return false;
  if(f.to && r.date>f.to) return false;
  var kw=String(f.kw||'').trim();
  if(kw){
    var c=catOf(r.type,r.cat);
    if(String(r.note||'').indexOf(kw)<0 && String(c.n).indexOf(kw)<0) return false;
  }
  return true;
}
function filterLabel(f){
  f=f||filter;
  var p=[];
  if(f.type && f.type!=='all') p.push(f.type==='income'?'收入':'支出');
  if(f.cat) p.push(catOf((f.type&&f.type!=='all')?f.type:'expense',f.cat).n);
  if(f.from||f.to) p.push((f.from||'起')+'→'+(f.to||'今'));
  var kw=String(f.kw||'').trim();
  if(kw) p.push('“'+kw+'”');
  return p.join(' · ');
}

/* ---------- 类别编辑用的色板与图标（首页与类别页共用） ---------- */
var PALETTE=['#E8434F','#F0813C','#E8A33D','#00A06B','#0E9AA7','#2A6BFF',
             '#6B7BF7','#8B5CF6','#DB5CA5','#D0565F','#3D8BE0','#8C8C8C'];
var ICONS=['食','购','行','乐','住','医','育','话','衣','情','宠','他',
           '薪','奖','兼','理','包','☕','🍜','🛍️','🚗','🎮','🏠','💊','📚','📱','🐱','💰','✈️','🎁'];

/* 手动载入示例数据（「我的」页入口），返回新增条数 */
function loadDemo(){
  var d=demoData();
  data=data.concat(d);
  save();
  return d.length;
}

/* ---------- helpers ---------- */
function money(n){
  var neg=n<0; n=Math.abs(n);
  var s=(Math.round(n*100)/100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  return (neg?'-':'')+'¥'+s;
}
function moneyShort(n){
  var neg=n<0; n=Math.abs(n);
  var s=(Math.round(n*100)/100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  return (neg?'-':'')+'¥'+s;
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
var WEEK=['周日','周一','周二','周三','周四','周五','周六'];
function dayLabel(iso){
  var now=new Date(); now.setHours(0,0,0,0);
  var p=iso.split('-'); var dt=new Date(+p[0],+p[1]-1,+p[2]);
  var diff=Math.round((now-dt)/86400000);
  var pre = diff===0?'今天 · ':diff===1?'昨天 · ':diff===2?'前天 · ':diff===-1?'明天 · ':'';
  return pre+iso.slice(5)+' '+WEEK[dt.getDay()];
}
function toast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._tm); t._tm=setTimeout(function(){t.classList.remove('show');},1600);
}

/* ---------- state ---------- */

var THEMES={
  light:{n:'浅色',  c:'#F2F4F8'},
  dark: {n:'深色',  c:'#0B0D11'},
  glass:{n:'毛玻璃',c:'#EDF1F9'}
};
var THEME_KEY='local_ledger_theme';
var curTheme='glass';
function applyTheme(t,persist){
  if(!THEMES[t]) t='glass';
  curTheme=t;
  document.documentElement.setAttribute('data-theme',t);
  var mt=document.querySelector('meta[name="theme-color"]');
  if(mt) mt.setAttribute('content',THEMES[t].c);
  var tv=document.getElementById('themeVal');
  if(tv) tv.textContent=THEMES[t].n;
  Array.prototype.forEach.call(document.querySelectorAll('.thcard'),function(b){
    b.classList.toggle('on', b.getAttribute('data-th')===t);
  });
  if(persist!==false){ try{ localStorage.setItem(THEME_KEY,t); }catch(e){} }
}
