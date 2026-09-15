// quick node reproduction of describe() recursion using shared regex
function escapeRegExp(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
function buildRegex(chars){const syms=chars.map(c=>c.designation).sort((a,b)=>b.length-a.length).map(escapeRegExp);return new RegExp(`(?<![\\w-])(${syms.join("|")})(?![\\w-])`,"g");}
function canonical(sym,alias={}){const seen=new Set();while(alias[sym]&&!seen.has(sym)){seen.add(sym);sym=alias[sym];}return sym;}
function describe(sym,map,regex,alias,seen){
  const canon=canonical(sym,alias);
  const desc=map[canon]||canon;
  if(seen.has(canon))return desc;
  const nextSeen=new Set(seen);nextSeen.add(canon);
  let out="",last=0,m,guard=0;
  regex.lastIndex=0;
  while((m=regex.exec(desc))!==null){
    if(++guard>50){console.log("!! LOOP DETECTED in describe for",sym,"partial:",out.slice(0,200));return "LOOP";}
    out+=desc.slice(last,m.index);
    out+="the "+describe(m[1],map,regex,alias,nextSeen);
    last=m.index+m[1].length;
  }
  out+=desc.slice(last);
  return out;
}
const chars=[{designation:"A",description:"male protagonist"},{designation:"B",description:"female protagonist"},{designation:"F-A",description:"father of A"},{designation:"BX",description:"a woman unknown to A"}];
const map={};chars.forEach(c=>map[c.designation]=c.description);
const rx=buildRegex(chars);
console.log("F-A =>",describe("F-A",map,rx,{},new Set()));
console.log("BX =>",describe("BX",map,rx,{},new Set()));
