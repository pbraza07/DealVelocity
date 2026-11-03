import {NextResponse} from 'next/server';
import {csvRows,numberValue} from '@/lib/comp-analysis';
type Row={id:string;name:string;month:string;active:number|null;pending:number|null;dom:number|null;reductions:number|null;quality:boolean;signals:(number|null)[]};
const cached=new Map<string,{at:number;rows:Map<string,Row>}>(),pending=new Map<string,Promise<Map<string,Row>>>();
async function directory(kind:string){
 const old=cached.get(kind);if(old&&Date.now()-old.at<21600000)return old.rows;if(pending.has(kind))return pending.get(kind)!;
 const work=(async()=>{const url=`https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_${kind==='zip'?'Zip':'County'}.csv`;
 const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Source unavailable');
 const parsed=csvRows(await r.text()),h=parsed[0],rows=new Map<string,Row>();
 const idKey=kind==='zip'?'postal_code':'county_fips';if(!h?.includes(idKey)||!h.includes('median_days_on_market'))throw Error('Source format changed');
 for(const cells of parsed.slice(1)){const get=(key:string)=>cells[h.indexOf(key)]??'',num=(key:string)=>numberValue(get(key)),signed=(key:string)=>{const s=get(key);return s.trim()&&Number.isFinite(Number(s))?Number(s):null;};
 const id=get(idKey).padStart(5,'0');if(!/^\d{5}$/.test(id))continue;
 rows.set(id,{id,name:get(kind==='zip'?'zip_name':'county_name'),month:get('month_date_yyyymm'),active:num('active_listing_count'),pending:num('pending_listing_count'),dom:num('median_days_on_market'),reductions:num('price_reduced_count'),quality:get('quality_flag')!=='0.0'&&get('quality_flag')!=='0',signals:[signed('median_days_on_market_mm'),signed('active_listing_count_mm'),signed('pending_ratio_mm'),signed('price_reduced_share_mm')]});}
 if(rows.size<100)throw Error('Incomplete source response');cached.set(kind,{at:Date.now(),rows});return rows;})().finally(()=>pending.delete(kind));pending.set(kind,work);return work;
}
export async function GET(request:Request){const q=new URL(request.url).searchParams,kind=q.get('kind')??'zip',id=q.get('id')??'';
 if(!['zip','county'].includes(kind)||!/^\d{5}$/.test(id))return NextResponse.json({error:'Enter a five-digit ZIP code or county FIPS code.'},{status:400});
 try{const row=(await directory(kind)).get(id);if(!row)return NextResponse.json({error:'No published match for this geography. No substitute geography was used.'},{status:404});
 const monthDate=/^\d{6}$/.test(row.month)?Date.UTC(Number(row.month.slice(0,4)),Number(row.month.slice(4,6)),0):NaN;
 const stale=!Number.isFinite(monthDate)||Date.now()-monthDate>100*86400000;
 const votes=row.signals.map((v,i)=>v===null?null:Math.abs(v)<.02?0:Math.sign(v)*(i===2?1:-1)).filter((v):v is number=>v!==null);
 const score=votes.reduce((a,b)=>a+b,0),direction=row.quality||stale||votes.length<3?'Insufficient reliable evidence':score>=2?'Improving signals':score<=-2?'Weakening signals':'Mixed / stable signals';
 return NextResponse.json({...row,kind,stale,direction,source:'Realtor.com Economic Research',sourceUrl:'https://www.realtor.com/research/data/',retrievedAt:new Date().toISOString(),note:'Local-market benchmark: all residential properties in this geography, not subject-specific or filtered to ARV. Direction is a heuristic using month-over-month DOM, inventory, pending ratio and price-reduction share; seasonality may affect it.'},{headers:{'Cache-Control':'public, max-age=3600'}});
 }catch{return NextResponse.json({error:'The public benchmark source is temporarily unavailable. Comp analysis remains usable.'},{status:503});}}
