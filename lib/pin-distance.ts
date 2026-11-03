export type Point = { lat:number; lng:number };
export function validPoint(p: unknown): p is Point {
  if (!p || typeof p !== "object") return false;
  const q = p as Point;
  return Number.isFinite(q.lat) && Number.isFinite(q.lng) && Math.abs(q.lat)<=90 && Math.abs(q.lng)<=180;
}
// Great-circle distance on the mean-radius Earth; not driving or survey distance.
export function milesBetween(a: Point, b: Point) {
  if (!validPoint(a)||!validPoint(b)) throw new Error("Invalid coordinates");
  const rad = Math.PI/180, dLat=(b.lat-a.lat)*rad, dLng=(b.lng-a.lng)*rad;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
  return 3958.761316 * 2 * Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
export type Pin = { point:Point|null; confirmed:boolean; provenance:string };
export function confirmedMiles(a:Pin,b:Pin) {
  return a.confirmed&&b.confirmed&&a.point&&b.point?milesBetween(a.point,b.point):null;
}
export function movePin(point:Point, provenance="Manually placed") : Pin {
  if(!validPoint(point)) throw new Error("Invalid coordinates");
  return {point,confirmed:false,provenance};
}
