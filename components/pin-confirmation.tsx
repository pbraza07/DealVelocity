"use client";
import {useEffect,useRef,useState} from "react";
import dynamic from "next/dynamic";
import {confirmedMiles,movePin,validPoint,type Pin,type Point} from "@/lib/pin-distance";
const Map=dynamic(()=>import("./property-pin-map"),{ssr:false,loading:()=> <p className="p-8">Loading pin map…</p>});
const empty=():Pin=>({point:null,confirmed:false,provenance:"Not located"});
export type PinSeed={point:Point;quality:string};
export default function PinConfirmation({subjectAddress,seed}:{subjectAddress:string;seed:PinSeed|null}){
 const [subject,setSubject]=useState<Pin>(empty),[comparison,setComparison]=useState<Pin>(empty);
 const [comparisonAddress,setComparisonAddress]=useState(""),[active,setActive]=useState<"subject"|"comparison">("subject");
 const [lat,setLat]=useState(""),[lng,setLng]=useState(""),[radius,setRadius]=useState(1),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const generation=useRef(0);
 useEffect(()=>()=>{generation.current++;},[]);
 useEffect(()=>{if(seed&&validPoint(seed.point))setSubject(movePin(seed.point,seed.quality));},[seed]);
 const selected=active==="subject"?subject:comparison, address=active==="subject"?subjectAddress:comparisonAddress;
 useEffect(()=>{setLat(selected.point?.lat.toFixed(7)??"");setLng(selected.point?.lng.toFixed(7)??"");},[selected.point,active]);
 function update(kind:"subject"|"comparison",pin:Pin){(kind==="subject"?setSubject:setComparison)(pin);}
 function move(kind:"subject"|"comparison",point:Point){generation.current++;setBusy(false);update(kind,movePin(point));setMessage("Pin moved. Confirm the location again before using mileage.");}
 async function locate(){
  if(!address.trim())return;const token=++generation.current,kind=active;
  setBusy(true);setMessage("");update(kind,empty());
  try{const r=await fetch("/api/resolve-address",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({address,city:"",geocodeOnly:true})});const data=await r.json();if(token!==generation.current)return;
   if(!r.ok)throw new Error(data.error??"Lookup failed");
   const p={lat:data.coordinates?.y,lng:data.coordinates?.x};
   if(!validPoint(p))throw new Error("Address found without coordinates. Place a pin manually or enter coordinates.");
   update(kind,movePin(p,data.coordinateQuality??"Census approximate street-range location"));setMessage(`Suggested location: ${data.address}. Check and confirm the pin; this is not rooftop verification.`);
  }catch(e){if(token===generation.current)setMessage((e instanceof Error?e.message:"Lookup unavailable")+" You can still place a pin manually.");}
  finally{if(token===generation.current)setBusy(false);}
 }
 const miles=confirmedMiles(subject,comparison);
 const button="rounded-lg border border-slate-600 px-4 py-2 disabled:opacity-40 hover:border-emerald-400";
 return <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 space-y-5">
  <div><p className="text-xs tracking-widest text-emerald-400">PROPERTY LOCATION WORKSPACE</p><h2 className="text-xl font-semibold mt-2">Confirm pins & measure distance</h2><p className="mt-2 text-sm text-slate-400">1. Locate the subject. 2. Enter a comparison address. 3. Confirm both pins. Works with manual coordinates throughout the U.S., including Alaska and Hawaii. Automatic lookup coverage is not guaranteed.</p></div>
  <div className="grid md:grid-cols-2 gap-4">
   <div className="rounded-lg border border-slate-700 p-4"><strong>S · Subject</strong><p className="text-sm mt-2">{subjectAddress||"Enter the subject address in the sidebar first."}</p><p className="text-xs mt-2 text-emerald-300">{subject.confirmed?"User-confirmed":subject.point?"Unconfirmed suggestion":"Pin not placed"}</p><p className="text-xs text-slate-400">{subject.provenance}</p></div>
   <div className="rounded-lg border border-slate-700 p-4"><label htmlFor="comparison-address" className="font-semibold">C · Comparison address</label><input id="comparison-address" maxLength={250} value={comparisonAddress} onChange={e=>{generation.current++;setBusy(false);setComparisonAddress(e.target.value);setComparison(empty());setMessage("");}} placeholder="Full street, city and state or ZIP" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3"/><p className="text-xs mt-2 text-blue-300">{comparison.confirmed?"User-confirmed":comparison.point?"Unconfirmed suggestion":"Pin not placed"}</p><p className="text-xs text-slate-400">{comparison.provenance}</p></div>
  </div>
  <div className="flex flex-wrap items-center gap-3"><label htmlFor="active-pin">Editing pin</label><select id="active-pin" value={active} onChange={e=>{generation.current++;setBusy(false);setActive(e.target.value as typeof active);setMessage("");}} className="rounded-lg bg-slate-950 border border-slate-600 p-2"><option value="subject">S · Subject</option><option value="comparison">C · Comparison</option></select><button type="button" className={button} disabled={busy||!address.trim()} onClick={()=>void locate()}>{busy?"Looking up…":"Look up approximate pin"}</button><label htmlFor="pin-radius">Radius</label><select id="pin-radius" value={radius} onChange={e=>setRadius(Number(e.target.value))} className="rounded-lg bg-slate-950 border border-slate-600 p-2">{[1,1.5,2].map(v=><option key={v} value={v}>{v} mile{v===1?"":"s"}</option>)}</select></div>
  <Map subject={subject} comparison={comparison} active={active} radius={radius} onMove={(kind,p)=>{if((kind==="subject"?subjectAddress:comparisonAddress).trim())move(kind,p);else setMessage("Enter this property's address before placing its pin.");}}/>
  <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();const p={lat:Number(lat),lng:Number(lng)};if(!lat.trim()||!lng.trim()||!validPoint(p)){setMessage("Enter a valid latitude (−90 to 90) and longitude (−180 to 180).");return;}move(active,p);}}>
   <label className="text-sm">Latitude<input aria-label="Pin latitude" type="number" disabled={busy} step="any" min="-90" max="90" required value={lat} onChange={e=>{setLat(e.target.value);update(active,{...selected,confirmed:false});}} className="block w-44 mt-1 p-2 rounded-lg border border-slate-600 bg-slate-950"/></label>
   <label className="text-sm">Longitude<input aria-label="Pin longitude" type="number" disabled={busy} step="any" min="-180" max="180" required value={lng} onChange={e=>{setLng(e.target.value);update(active,{...selected,confirmed:false});}} className="block w-44 mt-1 p-2 rounded-lg border border-slate-600 bg-slate-950"/></label><button className={button} disabled={!address.trim()}>Apply coordinates</button>
   <button type="button" className="rounded-lg bg-emerald-400 text-slate-950 font-semibold px-4 py-2 disabled:opacity-40" disabled={!address.trim()||!lat.trim()||!lng.trim()||!selected.point||busy||Number(lat)!==Number(selected.point.lat.toFixed(7))||Number(lng)!==Number(selected.point.lng.toFixed(7))} onClick={()=>{update(active,{...selected,confirmed:true});setMessage("Location confirmed by you—not independently verified.");}}>Confirm {active} pin</button>
  </form>
  <p role="status" className="text-sm text-amber-200">{message}</p>
  <div className="rounded-xl bg-slate-950 border border-slate-700 p-5"><p className="text-sm text-slate-400">Straight-line distance between user-confirmed pins</p><strong className="block text-3xl text-emerald-300 mt-2">{miles===null?"Confirm both pins":`${miles.toFixed(2)} miles`}</strong>{miles!==null&&<p className="mt-2">{miles<=radius?"Inside":"Outside"} the selected {radius}-mile radius (based on unrounded distance).</p>}<p className="text-xs text-slate-400 mt-3">Great-circle calculation using mean Earth radius; not driving distance or survey-grade measurement. Positional accuracy depends on your pin placement. A radius circle does not retrieve or count listings. No automatic radius expansion. Pins are kept only while this page is open; changing the subject clears this workspace.</p></div>
 </article>;
}
