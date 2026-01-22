
const KEY = "gwl_state_vegas_v1";

export function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{ return null; }
}

export function saveState(s){
  try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch{}
}

export function resetState(){
  try{ localStorage.removeItem(KEY); }catch{}
}
