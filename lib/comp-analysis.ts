export function csvRows(text:string):string[][] {
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell="";}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,""));if(row.some(v=>v.trim()))rows.push(row);row=[];cell="";}else cell+=c;}
 if(quoted)throw Error("Unclosed quote in CSV.");if(cell||row.length){row.push(cell.replace(/\r$/,""));rows.push(row);}return rows;
}
export const fields=['address','status','propertyType','price','soldDate','dom','sqft','beds','baths','pool','garage','yearBuilt','condition','distanceMiles','distanceConfirmed','originalListPrice','reductions','armsLength','source','asOf'] as const;
export type Comp=Record<typeof fields[number],string>&{id:string;reviewed:boolean};
export function numberValue(v:string):number|null {if(!v?.trim())return null;const clean=v.replace(/[$,\s]/g,"");if(!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean))return null;const n=Number(clean);return Number.isFinite(n)&&n>=0?n:null;}
export function dateValue(s:string):number|null {if(!s.trim())return null;const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})$/),us=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!iso&&!us)return null;const y=Number(iso?iso[1]:us![3]),m=Number(iso?iso[2]:us![1]),d=Number(iso?iso[3]:us![2]);const t=Date.UTC(y,m-1,d),v=new Date(t);return v.getUTCFullYear()===y&&v.getUTCMonth()===m-1&&v.getUTCDate()===d?t:null;}
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
export function propertyType(s:string){const n=norm(s);return ['singlefamily','singlefamilyresidential','singlefamilyhome','sfr'].includes(n)?'singlefamily':n;}
export function status(s:string){const n=norm(s);return ['sold','closed'].includes(n)?'Sold':['active','forsale'].includes(n)?'Active':['pending','activeundercontract','undercontract','contingent'].includes(n)?'Pending':s.trim();}
const yes=(s:string)=>['yes','true','1'].includes(s.toLowerCase().trim());
const no=(s:string)=>['no','false','0'].includes(s.toLowerCase().trim());
export function importComps(text:string,source:string,asOf:string,fallbackStatus=""):Comp[]{
 const rows=csvRows(text.replace(/^\uFEFF/,""));if(rows.length<2)throw Error("CSV needs a header and at least one property row.");if(rows.length>1001)throw Error("Maximum 1,000 properties per import.");
 const headers=rows[0].map(norm);const aliases:Record<string,string[]>={propertyType:['propertytype'],price:['price','soldprice','saleprice','listprice'],soldDate:['solddate','saledate'],sqft:['sqft','squarefeet','livingsquarefeet'],dom:['dom','daysonmarket'],originalListPrice:['originallistprice'],distanceMiles:['distancemiles'],asOf:['asof','recorddate']};
 if(!headers.includes('address'))throw Error("An ADDRESS column is required. Download the template for supported columns.");
 return rows.slice(1).map((r,i)=>{const c={id:crypto.randomUUID(),reviewed:false} as Comp;for(const f of fields){const keys=aliases[f]??[norm(f)],col=keys.map(k=>headers.indexOf(k)).find(i=>i>=0)??-1;c[f]=col<0?'':(r[col]??'').trim();}if(!c.address)throw Error(`Row ${i+2}: address is required.`);
  const extra=['city','stateorprovince','zipcode'].map(k=>{const p=headers.indexOf(k);return p<0?'':r[p];}).filter(Boolean);if(extra.length)c.address=c.address+", "+extra.join(', ');
  c.status=status(c.status||(c.soldDate?'Sold':fallbackStatus));
  const priceKeys=c.status==='Sold'?['soldprice','saleprice','price']:['listprice','price'];
  const priceIndex=priceKeys.map(k=>headers.indexOf(k)).find(i=>i>=0)??-1;
  c.price=priceIndex<0?'':(r[priceIndex]??'').trim();
  c.source=c.source||source;c.asOf=c.asOf||asOf;return c;});
}
export type Subject={address:string;arv:number;sqft:number;beds:number;baths:number;propertyType:string;pool:string;garage:number|null;yearBuilt:number|null;radius:number;band:number};
export function quantile(values:number[],q:number){if(!values.length)return null;const a=[...values].sort((a,b)=>a-b),i=(a.length-1)*q,l=Math.floor(i);return a[l]+(a[Math.ceil(i)]-a[l])*(i-l);}
function weighted(values:{value:number;weight:number}[],q:number){const sorted=[...values].sort((a,b)=>a.value-b.value),total=sorted.reduce((s,x)=>s+x.weight,0);let sum=0;for(const x of sorted){sum+=x.weight;if(sum>=q*total)return x.value;}return sorted.at(-1)?.value??null;}
export function analyze(comps:Comp[],s:Subject,now=Date.now()){
 const day=86400000,today=Math.floor(now/day)*day,seen=new Set<string>();
 const validSubject=!!s.address.trim()&&[s.arv,s.sqft,s.beds,s.baths,s.radius,s.band].every(Number.isFinite)&&s.arv>0&&s.sqft>0&&s.beds>=0&&s.baths>=0&&s.radius>0&&s.band>0&&s.band<=.5;
 const evaluated=comps.map(c=>{const reasons:string[]=[],age=c.soldDate&&dateValue(c.soldDate)!==null?(today-dateValue(c.soldDate)!)/day:null;
  const key=norm(c.address);if(seen.has(key))reasons.push('Duplicate address; review listing history');else seen.add(key);
  if(key===norm(s.address))reasons.push('Subject property');if(!validSubject)reasons.push('Complete subject criteria');if(!c.reviewed)reasons.push('Review required');if(!c.source.trim())reasons.push('Source required');
  const asOf=dateValue(c.asOf);if(asOf===null||asOf>today)reasons.push('Valid observation date required');
  if(status(c.status)==='Sold'&&asOf!==null&&dateValue(c.soldDate)!==null&&asOf<dateValue(c.soldDate)!)reasons.push('Observation precedes sale date');
  if(!['Sold','Active','Pending'].includes(status(c.status)))reasons.push('Status unknown/not supported');
  if(status(c.status)!=='Sold'&&(asOf===null||today-asOf>14*day))reasons.push('Active/pending observation older than 14 days');
  if(status(c.status)==='Sold'&&(age===null||age<0||age>270))reasons.push('Sale must be within 270 days');
  if(propertyType(c.propertyType)!==propertyType(s.propertyType))reasons.push('Property type mismatch/unknown');
  const area=numberValue(c.sqft),beds=numberValue(c.beds),baths=numberValue(c.baths),distance=numberValue(c.distanceMiles),price=numberValue(c.price);
  if(area===null||Math.abs(area-s.sqft)>s.sqft*.2)reasons.push('Living area outside ±20%/unknown');
  if(beds===null||Math.abs(beds-s.beds)>1)reasons.push('Beds outside ±1/unknown');if(baths===null||Math.abs(baths-s.baths)>1)reasons.push('Baths outside ±1/unknown');
  if(distance===null||!yes(c.distanceConfirmed)||distance>s.radius)reasons.push('Distance missing, unconfirmed or outside radius');
  if(s.pool==='Yes'&&!yes(c.pool)||s.pool==='No'&&!no(c.pool))reasons.push('Pool mismatch/unknown');
  if(no(c.armsLength))reasons.push('Non-arm’s-length transaction');if(!price)reasons.push('Positive price required');
  let weight=1/(1+(distance??10));weight*=1-Math.min(.5,Math.abs((area??0)-s.sqft)/Math.max(s.sqft,1));if(age!==null)weight*=1-age/540;
  const year=numberValue(c.yearBuilt),garage=numberValue(c.garage);if(year!==null&&s.yearBuilt!==null)weight*=1/(1+Math.abs(year-s.yearBuilt)/50);else weight*=.8;
  if(garage!==null&&s.garage!==null)weight*=1/(1+Math.abs(garage-s.garage)*.25);else weight*=.8;
  if(!yes(c.armsLength))weight*=.7;
  return {c,reasons,age,weight,price:price??0,area:area??0,dom:numberValue(c.dom)};
 });
 const eligible=evaluated.filter(x=>!x.reasons.length),sold=eligible.filter(x=>status(x.c.status)==='Sold');
 const near=(p:number,arv=s.arv)=>p>=arv*(1-s.band)&&p<=arv*(1+s.band);
 const values=sold.filter(x=>norm(x.c.condition)==='renovated'),valuePoints=values.map(x=>({value:x.price/x.area*s.sqft,weight:x.weight}));
 const arv=values.length>=3?{low:weighted(valuePoints,.25)!,median:weighted(valuePoints,.5)!,high:weighted(valuePoints,.75)!,n:values.length,confidence:values.length>=6?'Moderate':'Low'}:null;
 const nearSold=sold.filter(x=>near(x.price)),active=eligible.filter(x=>status(x.c.status)==='Active'&&near(x.price)),pending=eligible.filter(x=>status(x.c.status)==='Pending'&&near(x.price));
 const doms=nearSold.filter(x=>norm(x.c.condition)==='renovated'&&x.dom!==null).map(x=>x.dom!);
 const dom=doms.length>=3?{low:Math.floor(quantile(doms,.25)!),median:Math.round(quantile(doms,.5)!),high:Math.ceil(quantile(doms,.75)!),n:doms.length}:null;
 const periods=[3,6,9].map(months=>{const records=nearSold.filter(x=>x.age!==null&&x.age<=months*30),rate=records.length/months;return{months,count:records.length,rate,inventory:rate>0?active.length/rate:null,medianDom:quantile(records.filter(x=>x.dom!==null).map(x=>x.dom!),.5)};});
 const prices=[.95,1,1.05,1.1].map(f=>{const price=Math.round(s.arv*f),matches=sold.filter(x=>near(x.price,price)),d=matches.filter(x=>norm(x.c.condition)==='renovated'&&x.dom!==null).map(x=>x.dom!);return{price,active:eligible.filter(x=>status(x.c.status)==='Active'&&near(x.price,price)).length,sales:matches.length,dom:d.length>=3?[quantile(d,.25)!,quantile(d,.75)!]:null};});
 return {evaluated,eligible,sold:nearSold,arv,dom,active,pending,periods,prices};
}
