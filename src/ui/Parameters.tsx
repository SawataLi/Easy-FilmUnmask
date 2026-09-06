import { ChevronDown,Info } from 'lucide-react';
import { Slider,Toggle } from './controls';
import { defaults,type Params } from './types';
import type { Studio } from './useStudio';
export function Parameters({studio:s}:{studio:Studio}) {
  const p=s.edit.params;
  const set=<K extends keyof Params>(key:K,value:Params[K])=>s.update(e=>({...e,params:{...e.params,[key]:value}}));
  function field(key:keyof Params,label:string,min:number,max:number,step=1,unit='') {
    return <Slider label={label} value={p[key] as number} min={min} max={max} step={step} unit={unit} onChange={v=>set(key,v as never)} reset={()=>set(key,defaults[key] as never)}/>;
  }
  return <>
    <details className="section" open><summary><span className="section-number">02</span>翻拍校准<ChevronDown size={14}/></summary>
      <div className="segmented small"><button className={p.wb_mode==='file'?'active':''} onClick={()=>set('wb_mode','file')}>文件白平衡</button><button className={p.wb_mode==='manual'?'active':''} onClick={()=>set('wb_mode','manual')}>手动光源</button></div>
      {p.wb_mode==='file'?<div className="metadata-note"><span className="tiny-dot"/>来自 DNG · As Shot Neutral<br/><code>RGB 增益 {s.image?.wb.map(v=>v.toFixed(3)).join(' / ')??'—'}</code></div>:<>
        {field('capture_temp','翻拍光源',2000,12000,50,'K')}{field('capture_tint','绿 / 洋红',-100,100)}
      </>}
    </details>
    <details className="section" open><summary><span className="section-number">03</span>胶片校准<ChevronDown size={14}/></summary>
      {field('film_temp','胶片平衡色温',2000,12000,50,'K')}
      <div className="quick-values"><button onClick={()=>set('film_temp',5500)}>日光型 5500 K</button><button onClick={()=>set('film_temp',3200)}>灯光型 3200 K</button></div>
      <div className="switch-line"><span>原场景光源补偿</span><Toggle checked={p.scene_enabled} label="原场景光源补偿" onChange={v=>set('scene_enabled',v)}/></div>
      {p.scene_enabled?<>{field('scene_temp','原拍摄光源',2000,12000,50,'K')}{field('adaptation','补偿强度',0,1,.01)}</>:<p className="hint">未开启时，假设原光源与胶片平衡色温一致。</p>}
      {field('film_tint','转正色偏',-100,100)}
      <p className="hint note"><Info size={12}/>色温补偿为色度近似，不模拟胶片染料或灯具光谱。</p>
    </details>
    <details className="section" open><summary><span className="section-number">04</span>转正调整<ChevronDown size={14}/></summary>
      {field('density','密度范围',.1,5,.01,'D')}{field('black','黑点',-.5,.5,.005)}
      {field('exposure','曝光',-5,5,.05,'EV')}{field('contrast','对比度',.2,3,.01)}{field('saturation','饱和度',0,2,.01)}
      <details className="advanced"><summary>RGB 密度斜率<ChevronDown size={12}/></summary>
        {(['红','绿','蓝'] as const).map((label,c)=><Slider key={c} label={`${label}通道`} min={.2} max={3} step={.01} value={p.slopes[c]} onChange={v=>{const slopes=[...p.slopes] as typeof p.slopes;slopes[c]=v;set('slopes',slopes);}} reset={()=>{const slopes=[...p.slopes] as typeof p.slopes;slopes[c]=1;set('slopes',slopes);}}/>)}
      </details>
    </details>
  </>;
}
