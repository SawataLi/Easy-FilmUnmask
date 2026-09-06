import { useEffect,useState } from 'react';
import { RotateCcw } from 'lucide-react';
export function Slider({label,value,min,max,step=1,unit='',onChange,reset,disabled=false}:{label:string;value:number;min:number;max:number;step?:number;unit?:string;onChange:(v:number)=>void;reset?:()=>void;disabled?:boolean}) {
  const [draft,setDraft]=useState(String(value));useEffect(()=>setDraft(String(value)),[value]);
  function commit(){const v=Number(draft);if(draft.trim()&&Number.isFinite(v))onChange(Math.max(min,Math.min(max,v)));else setDraft(String(value));}
  return <div className={`slider-field ${disabled?'disabled':''}`}>
    <div className="field-line"><label>{label}</label><div className="numeric-wrap">
      {reset&&<button className="reset-button" onClick={reset} disabled={disabled} title={`复位${label}`} aria-label={`复位${label}`}><RotateCcw size={11}/></button>}
      <input aria-label={`${label}数值`} type="number" value={draft} min={min} max={max} step={step} disabled={disabled} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){commit();e.currentTarget.blur();}}}/><span>{unit}</span>
    </div></div>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))}/>
  </div>;
}
export function Toggle({checked,onChange,label}:{checked:boolean;onChange:(v:boolean)=>void;label:string}) {
  return <button type="button" className={`toggle ${checked?'on':''}`} role="switch" aria-checked={checked} aria-label={label} onClick={()=>onChange(!checked)}><span/></button>;
}
