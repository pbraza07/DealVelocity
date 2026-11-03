import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validPoint,milesBetween,movePin,confirmedMiles} from '../lib/pin-distance.ts';
test('coordinate validation rejects blanks, strings, nonfinite and out-of-range points',()=>{
 for(const p of [null,{}, {lat:'28',lng:-82},{lat:NaN,lng:0},{lat:91,lng:0},{lat:0,lng:-181}])assert.equal(validPoint(p),false);
 assert.equal(validPoint({lat:0,lng:0}),true);
 assert.throws(()=>milesBetween({lat:91,lng:0},{lat:0,lng:0}));
});
test('great-circle distances, symmetry, Alaska, Hawaii and date line',()=>{
 const a={lat:0,lng:0},b={lat:0,lng:1};
 assert.equal(milesBetween(a,a),0);
 assert.ok(Math.abs(milesBetween(a,b)-69.0934)<0.001);
 assert.equal(milesBetween(a,b),milesBetween(b,a));
 assert.ok(milesBetween({lat:0,lng:179.99},{lat:0,lng:-179.99})<1.4);
 assert.ok(milesBetween({lat:61.2181,lng:-149.9003},{lat:21.3099,lng:-157.8581})>2700);
});
test('both confirmations required, including after moving a confirmed pin',()=>{
 const a=movePin({lat:28,lng:-82}),b=movePin({lat:28.01,lng:-82});
 assert.equal(confirmedMiles(a,b),null);
 assert.equal(confirmedMiles({...a,confirmed:true},b),null);
 const ready={...a,confirmed:true},other={...b,confirmed:true};
 assert.ok(confirmedMiles(ready,other)>0);
 assert.equal(confirmedMiles(movePin({lat:29,lng:-82}),other),null);
});
