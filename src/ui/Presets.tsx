import { Bookmark,Plus,Import,PanelLeftClose,SlidersHorizontal,ArrowUpRight } from 'lucide-react';
import type { Preset } from './types';
import type { Studio } from './useStudio';
export function Presets({studio:s,selected,onSelect,onSave,onClose}:{studio:Studio;selected:Preset|null;onSelect:(p:Preset)=>void;onSave:()=>void;onClose:()=>void}) {
  return <aside className="presets-panel"><div className="sidebar-heading"><span>预设库</span><button className="icon-button" aria-label="收起预设库" onClick={onClose}><PanelLeftClose size={16}/></button></div>
    <button className="new-preset" onClick={onSave} disabled={!s.preview?.base}><Plus size={16}/>保存当前校准</button>
    <div className="preset-category">我的预设 <span>{String(s.presets.length).padStart(2,'0')}</span></div>
    <div className="preset-items">{s.presets.length?s.presets.map(p=><button className={`preset-card ${selected?.id===p.id?'selected':''}`} onClick={()=>onSelect(p)} key={p.id}><div className="preset-swatch" style={{background:`linear-gradient(135deg, rgb(${p.base.map(v=>Math.pow(v,1/2.2)*255).join(' ')}), #34302c)`}}><SlidersHorizontal size={19}/></div><strong>{p.name}</strong><small>{p.edit.params.film_temp} K <span>·</span> {p.edit.samples.length} 个采样点</small><ArrowUpRight size={13} className="preset-arrow"/></button>):<div className="empty-library"><Bookmark size={23} strokeWidth={1}/><p>还没有预设</p><small>一次细致的校准，<br/>留给下一张底片。</small></div>}</div>
    <button className="import-preset" onClick={s.importPreset}><Import size={15}/>导入 JSON 预设</button>
    <div className="sidebar-bottom"><span className="tiny-dot"/>本地预设 · 随时可导出</div>
  </aside>;
}
