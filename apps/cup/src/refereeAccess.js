const PREFIX='spraoi_cup_ref_';

export function createRefAccess(eventId,pitches=[],label='Referee') {
  const id=crypto?.randomUUID?.().replaceAll('-','')||`${Date.now()}${Math.random().toString(36).slice(2)}`;
  return { id,eventId,pitches,label,code:String(Math.floor(100000+Math.random()*900000)),active:true,version:1,createdAt:new Date().toISOString() };
}

export function refereeLink(eventId,id,base=location.origin) {
  return `${base}/?event=${encodeURIComponent(eventId)}&ref=${encodeURIComponent(id)}`;
}

const deviceKey=(eventId,access)=>`${PREFIX}${eventId}_${access.id}_${access.version||1}`;

export function rememberReferee(eventId,access,name) {
  try { localStorage.setItem(deviceKey(eventId,access),JSON.stringify({name,verifiedAt:new Date().toISOString()})); } catch {}
}

export function rememberedReferee(eventId,access) {
  if (!access) return null;
  try { const raw=localStorage.getItem(deviceKey(eventId,access)); return raw?JSON.parse(raw):null; } catch { return null; }
}

export function regenerateRefCode(access) {
  return { ...access, code:String(Math.floor(100000+Math.random()*900000)), version:(access.version||1)+1, updatedAt:new Date().toISOString() };
}

export function resetAllRefAccess(list=[]) {
  return list.map((r)=>({...r,active:false,version:(r.version||1)+1,updatedAt:new Date().toISOString()}));
}
