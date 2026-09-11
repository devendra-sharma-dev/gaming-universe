const EARTH_RADIUS_KM = 6371;
const HOT_COLD_THRESHOLDS = [{max:500,label:'Very Close',emoji:'🔥'}, {max:1200,label:'Close',emoji:'🔥'}, {max:2500,label:'Warm',emoji:'🌤️'}, {max:5000,label:'Cold',emoji:'🥶'}, {max:Infinity,label:'Very Cold',emoji:'🧊'}];
const radians = value => value * Math.PI / 180;
const distanceKm = (from, to) => { const dLat=radians(to.lat-from.lat),dLng=radians(to.lng-from.lng),a=Math.sin(dLat/2)**2+Math.cos(radians(from.lat))*Math.cos(radians(to.lat))*Math.sin(dLng/2)**2; return Math.round(EARTH_RADIUS_KM*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))); };
const direction = (from,to) => { const y=Math.sin(radians(to.lng-from.lng))*Math.cos(radians(to.lat)),x=Math.cos(radians(from.lat))*Math.sin(radians(to.lat))-Math.sin(radians(from.lat))*Math.cos(radians(to.lat))*Math.cos(radians(to.lng-from.lng)); const points=['N','NE','E','SE','S','SW','W','NW']; return points[Math.round(((Math.atan2(y,x)*180/Math.PI+360)%360)/45)%8]; };
const heat = distance => HOT_COLD_THRESHOLDS.find(item => distance <= item.max);
const xpFor = (round, attempts=1) => round === 1 ? 525 - attempts * 25 : ({2:400,3:300,4:200,5:100}[round] || 0);
const countryForDate = (countries,date) => { let hash=2166136261; for (const char of date) hash=Math.imul(hash ^ char.charCodeAt(0),16777619); return countries[(hash>>>0)%countries.length]; };
module.exports={HOT_COLD_THRESHOLDS,distanceKm,direction,heat,xpFor,countryForDate};
