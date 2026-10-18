import {CAM5} from '../src/events';
console.log(CAM5.map((k) => `${Math.round(k.t * 30)}:${k.lon},${k.lat},${k.scale}`).join(' '));
