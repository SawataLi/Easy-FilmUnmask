import { Crosshair,Plus,Trash2 } from 'lucide-react';
import { Slider,Toggle } from './controls';
import type { Studio } from './useStudio';
import type { Sample } from './types';
export function Samples({studio:s,picking,setPicking,selected,setSelected}:{studio:Studio;picking:boolean;setPicking:(v:boolean)=>void;selected:number|null;setSelected:(v:number|null)=>void}) {
  const stats=s.preview?.stats??[];
  const current=s.edit.samples.find(p=>p.id===selected);
  const patch=(id:number,values:Partial<Sample>)=>s.update(e=>({...e,samples:e.samples.map(p=>p.id===id?{...p,...values}:p)}));
  return <section className="section sampling-section"><div className="section-title"><span className="section-number">01</span>片基采样<span className="count">{s.edit.samples.length.toString().padStart(2,'0')}</span></div>
    <p className="hint">在透明、未曝光的胶片边缘取样。<br/>避开齿孔、文字与灰尘。</p>
    <button className={`sample-action ${picking?'armed':''}`} disabled={!s.image||s.loading} onClick={()=>setPicking(!picking)}><Crosshair size={16}/>{picking?'点击画面添加采样点':'添加片基采样点'}<Plus size={14}/></button>
    {s.edit.reused_base&&<div className="reuse-note">正在复用已保存的片基校准<button onClick={()=>s.update(e=>({...e,reused_base:null,samples:[]}))}>重新采样</button></div>}
    <div className="sample-list">{s.edit.samples.map(point=>{
      const stat=stats.find(v=>v.id===point.id);const rgb=stat?.rgb??[0,0,0];
      return <div className={`sample-row ${selected===point.id?'selected':''} ${!point.enabled?'muted':''}`} key={point.id}>
        <button className="sample-select" onClick={()=>setSelected(point.id)}><span className="swatch" style={{background:`rgb(${rgb.map(v=>Math.round(Math.pow(Math.max(v,0),1/2.2)*255)).join(' ')})`}}/><span><strong>采样点 {String(point.id).padStart(2,'0')}</strong><small>{stat?`有效 ${Math.round(stat.valid_ratio*100)}% · ${stat.count} px`:'等待计算'}</small></span></button>
        <Toggle checked={point.enabled} label={`启用采样点 ${point.id}`} onChange={v=>patch(point.id,{enabled:v})}/>
        <button className="icon-button danger-hover" title="删除采样点" aria-label={`删除采样点 ${point.id}`} onClick={()=>s.update(e=>({...e,samples:e.samples.filter(p=>p.id!==point.id)}))}><Trash2 size={13}/></button>
      </div>;
    })}</div>
    {current&&<div className="sample-detail"><div className="eyebrow">采样点 {String(current.id).padStart(2,'0')} · 线性相机 RGB</div>
      <code className="sample-values">{stats.find(v=>v.id===current.id)?.rgb.map(v=>v.toFixed(4)).join(' / ')??'—'}</code>
      {stats.find(v=>v.id===current.id)?.count===0&&<p className="warning-inline">该区域无有效像素，请移动采样点。</p>}
      <Slider label="采样半径" min={1} max={150} unit="px" value={current.radius} onChange={v=>patch(current.id,{radius:v})}/>
      <Slider label="采样权重" min={.1} max={10} step={.1} value={current.weight} onChange={v=>patch(current.id,{weight:v})}/>
    </div>}
    {!s.edit.samples.length&&!s.edit.reused_base&&<div className="empty-samples"><span className="tiny-dot"/>等待你的第一个采样点</div>}
  </section>;
}
