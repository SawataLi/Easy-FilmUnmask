export type Rgb = [number, number, number];
export interface ImageInfo { id:string; name:string; camera:string; width:number; height:number; wb:Rgb }
export interface Sample { id:number; x:number; y:number; radius:number; weight:number; enabled:boolean }
export interface SampleStat { id:number; rgb:Rgb; valid_ratio:number; count:number }
export interface Params {
  wb_mode:'file'|'manual'; capture_temp:number; capture_tint:number; film_temp:number;
  scene_enabled:boolean; scene_temp:number; adaptation:number; film_tint:number;
  density:number; black:number; exposure:number; contrast:number; saturation:number; slopes:Rgb;
}
export interface Edit { params:Params; samples:Sample[]; reused_base:Rgb|null }
export type Mode = 'original'|'unmasked'|'positive';
export interface Preview { revision:number; image_id:string; mode:Mode; data:string; original:string; histogram:number[][]; stats:SampleStat[]; base:Rgb|null; width:number; height:number; elapsed_ms:number }
export interface Preset { version:number; algorithm:string; space:string; id:string; name:string; source:ImageInfo; edit:Edit; base:Rgb }
export const defaults:Params = { wb_mode:'file',capture_temp:5500,capture_tint:0,film_temp:5500,scene_enabled:false,scene_temp:5500,adaptation:1,film_tint:0,density:2,black:0,exposure:0,contrast:1,saturation:1,slopes:[1,1,1] };
export const freshEdit = ():Edit => ({params:{...defaults,slopes:[1,1,1]},samples:[],reused_base:null});
export function applyPreset(p:Preset,image:ImageInfo,resample:boolean):Edit {
  if (resample) return {params:structuredClone(p.edit.params),samples:[],reused_base:null};
  if (p.source.id===image.id) return structuredClone(p.edit);
  return {params:structuredClone(p.edit.params),samples:[],reused_base:[...p.base]};
}
