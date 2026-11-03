const CITY_SOURCE = "https://files.zillowstatic.com/research/public_csvs/zhvi/City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv";
const states = "AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming|PR:Puerto Rico".split("|").map(x=>x.split(":"));
const normalize=(s:string)=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[.']/g,"").replace(/\s+/g," ").trim();
type City={name:string;state:string;metro:string;county:string};
let cached:{rows:City[];at:number}|undefined;
let pending:Promise<City[]>|undefined;
function fields(line:string){const result:string[]=[];let cell="",quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===","&&!quoted){result.push(cell);cell="";if(result.length===8)return result;}else cell+=c;}result.push(cell);return result;}
async function cityRows(){
 if(cached&&Date.now()-cached.at<86400000)return cached.rows;
 if(pending)return pending;
 pending=(async()=>{const response=await fetch(CITY_SOURCE,{cache:"no-store",signal:AbortSignal.timeout(60000)});
 if(!response.ok||!response.body)throw new Error("National city directory is temporarily unavailable. Please retry.");
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer="",header:string[]|null=null;const rows:City[]=[];
 function accept(line:string){const f=fields(line);if(!header){header=f;if(!["RegionName","State","Metro","CountyName"].every(k=>f.includes(k)))throw new Error("City directory format changed.");return;}const get=(key:string)=>f[header!.indexOf(key)]??"";if(get("RegionName")&&get("State"))rows.push({name:get("RegionName"),state:get("State"),metro:get("Metro"),county:get("CountyName")});}
 try{while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let pos;while((pos=buffer.indexOf("\n"))>=0){accept(buffer.slice(0,pos).replace(/\r$/,""));buffer=buffer.slice(pos+1);}}buffer+=decoder.decode();if(buffer.trim())accept(buffer.trim());}finally{reader.releaseLock();}
 if(rows.length<1000)throw new Error("City directory incomplete. Retry later.");
 cached={rows,at:Date.now()};return rows;})().finally(()=>{pending=undefined;});
 return pending;
}
export async function marketLocation(input:string){
 const trimmed=input.trim();const state=states.find(([code,name])=>new RegExp("(?:,\\s*|\\s+)("+code+"|"+name+")$","i").test(trimmed));
 if(!state)throw new Error("Enter a U.S. city and state, for example Alpharetta, Georgia or Alpharetta, GA.");
 const city=trimmed.replace(new RegExp("(?:,\\s*|\\s+)("+state[0]+"|"+state[1]+")$","i"),"").trim();
 if(!city)throw new Error("Enter a city before the state.");
 const rows=await cityRows();
 const matches=rows.filter(r=>r.state===state[0]&&normalize(r.name)===normalize(city));
 const metros=[...new Set(matches.map(r=>r.metro))];
 if(!matches.length){
   const direct=[...new Set(rows.map(r=>r.metro))].find(m=>normalize(m)===normalize(city+", "+state[0]));
   if(direct)return{region:direct,note:"Source metro selected: "+direct+". Regional statistics, not neighborhood comps."};
   const suggestions=[...new Set(rows.filter(r=>r.state===state[0]&&normalize(r.name).startsWith(normalize(city).slice(0,4))).map(r=>r.name))].slice(0,5);
   throw new Error("No exact city match in Zillow's national directory for "+city+", "+state[0]+". "+(suggestions.length?"Check spelling. Possible cities: "+suggestions.join(", ")+".":"This location may not be covered. No unrelated market has been substituted."));
 }
 if(metros.length!==1)throw new Error("This city name spans multiple source markets. Specify a metro directly; no market was selected automatically.");
 if(!metros[0])throw new Error(city+", "+state[0]+" is recognized, but Zillow assigns no metro to it. Metro inventory and sales data are unavailable; no nearby metro has been substituted.");
 return{region:metros[0],note:matches[0].name+", "+state[0]+" → "+metros[0]+" (Zillow city-directory Metro field). Statistics cover the metro, not just the city. Directory checked "+new Date(cached!.at).toISOString().slice(0,10)+"."};
}
