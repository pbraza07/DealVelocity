"use client";
import {useEffect,useRef} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {Point,Pin} from "@/lib/pin-distance";
type Props={subject:Pin;comparison:Pin;active:"subject"|"comparison";radius:number;onMove:(kind:"subject"|"comparison",point:Point)=>void};
export default function PropertyPinMap(props:Props){
 const container=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layers=useRef<L.LayerGroup|null>(null),latest=useRef(props);
 latest.current=props;
 useEffect(()=>{
  if(!container.current)return;
  const m=L.map(container.current,{scrollWheelZoom:false}).setView([39,-98],4);map.current=m;
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(m);
  layers.current=L.layerGroup().addTo(m);
  m.on("click",e=>latest.current.onMove(latest.current.active,{lat:e.latlng.lat,lng:e.latlng.lng}));
  const observer=new ResizeObserver(()=>m.invalidateSize());observer.observe(container.current);
  return()=>{observer.disconnect();m.remove();map.current=null;layers.current=null;};
 },[]);
 useEffect(()=>{
  const m=map.current,g=layers.current;if(!m||!g)return;g.clearLayers();
  for(const kind of ["subject","comparison"] as const){const pin=props[kind];if(!pin.point)continue;
   const color=kind==="subject"?"#059669":"#2563eb";
   const icon=L.divIcon({className:"",html:`<span style="display:block;background:${color};border:3px solid white;border-radius:50%;width:30px;height:30px;color:white;text-align:center;font:bold 16px/24px sans-serif;box-shadow:0 2px 6px #0008">${kind==="subject"?"S":"C"}</span>`,iconSize:[30,30],iconAnchor:[15,15]});
   const marker=L.marker([pin.point.lat,pin.point.lng],{icon,draggable:true,title:kind+" property pin",alt:kind+" property pin"}).addTo(g);
   marker.on("dragend",()=>{const p=marker.getLatLng();latest.current.onMove(kind,{lat:p.lat,lng:p.lng});});
   marker.bindTooltip(`${kind=== "subject"?"Subject":"Comparison"}: ${pin.confirmed?"user-confirmed":"unconfirmed"}`);
  }
  const s=props.subject.point,c=props.comparison.point;
  if(s)L.circle([s.lat,s.lng],{radius:props.radius*1609.344,color:"#059669",fillOpacity:0.05,dashArray:props.subject.confirmed?undefined:"6 6"}).addTo(g);
  if(s&&c)L.polyline([[s.lat,s.lng],[c.lat,c.lng]],{color:"#2563eb",dashArray:"6 6"}).addTo(g);
 },[props.subject,props.comparison,props.radius]);
 useEffect(()=>{
  const p=props[props.active].point;
  if(p)map.current?.setView([p.lat,p.lng],17);
 },[props.active,props.subject.point,props.comparison.point]);
 return <div><div ref={container} role="region" aria-label="Property pin placement map" className="relative z-0 h-[420px] rounded-xl border border-slate-600"/><p className="mt-2 text-xs text-slate-400">Click to place the selected pin; drag to adjust. Map starts at a national overview—not a property location. Tiles are best-effort; coordinate entry below works if the map is unavailable. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer" className="underline">Report a map issue</a></p></div>;
}
