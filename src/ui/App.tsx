import { useEffect,useState } from 'react';
import { Aperture,FolderOpen,ArrowDownToLine,Undo2,Redo2,PanelLeft,Save,ChevronDown,X,Check,Trash2,Download } from 'lucide-react';
import { useStudio } from './useStudio';
import { Stage } from './Stage';
import { Samples } from './Samples';
import { Parameters } from './Parameters';
import { Presets } from './Presets';
import { Histogram } from './Histogram';
import { Dialog } from './Dialog';
import { applyPreset,type Preset,type Mode } from './types';
export default function App() {
  const s=useStudio();
  const [sidebar,setSidebar]=useState(true),[picking,setPicking]=useState(false),[selected,setSelected]=useState<number|null>(null);
  const [chosen,setChosen]=useState<Preset|null>(null),[modal,setModal]=useState<'save'|'preset'|'delete'|null>(null);
  const [name,setName]=useState(''),[modalError,setModalError]=useState(''),[saving,setSaving]=useState(false);
  const [format,setFormat]=useState<'tiff'|'jpg'>('tiff');
  useEffect(()=>{setSelected(null);setChosen(null);setPicking(false);},[s.image?.id]);
  useEffect(()=>{
    function key(e:KeyboardEvent){
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?s.redo():s.undo();}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='o'){e.preventDefault();void s.openFile();}
      if(e.key==='Escape')setPicking(false);
    }
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[s]);
  function showSave(){setName(chosen?.name??'我的片基校准');setModalError('');setModal('save');}
  async function save(overwrite:boolean){setSaving(true);setModalError('');try{const p=await s.savePreset(name,overwrite?chosen?.id??null:null);if(p)setChosen(p);setModal(null);}catch(e){setModalError(String(e));}finally{setSaving(false);}}
  function apply(resample:boolean){if(chosen&&s.image){s.update(applyPreset(chosen,s.image,resample));s.setMode(resample?'original':'positive');setPicking(resample);setSelected(null);setModal(null);s.setMessage(resample?'请为当前图像重新采样片基。':'已应用预设；片基参数可继续调整。');}}
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Aperture size={24} strokeWidth={1.4}/></div><span>片基<small>FILM BASE</small></span><span className="version-tag">BETA 01</span></div>
      <div className="file-context"><span className="file-dot"/><span>{s.image?.name??'尚未打开底片'}</span>{s.image&&<small>DNG</small>}</div>
      <div className="header-actions"><button className="secondary" onClick={s.openFile} disabled={s.loading}><FolderOpen size={15}/>打开底片</button><div className="export-combo"><select aria-label="导出格式" value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option value="tiff">TIFF 16-bit</option><option value="jpg">JPEG</option></select><button className="primary" disabled={!s.preview?.base||s.mode==='original'||s.exporting!==null||s.loading||s.busy} onClick={()=>void s.exportImage(format)}><ArrowDownToLine size={15}/>{s.exporting!==null?`${s.exporting}%`:'导出成片'}</button></div></div>
    </header>
    <div className="main-layout">
      {sidebar&&<Presets studio={s} selected={chosen} onSelect={p=>{setChosen(p);setModal('preset');setModalError('');}} onSave={showSave} onClose={()=>setSidebar(false)}/>}
      <div className="center-column"><div className="modebar">{!sidebar&&<button className="icon-button" aria-label="展开预设库" onClick={()=>setSidebar(true)}><PanelLeft size={16}/></button>}
        <div className="segmented modes">{([['original','原始负片'],['unmasked','去罩负片'],['positive','正片']] as [Mode,string][]).map(([mode,label])=><button key={mode} className={s.mode===mode?'active':''} disabled={mode!=='original'&&!s.calibrated} onClick={()=>s.setMode(mode)}>{label}{mode==='positive'&&<span className="mode-dot"/>}</button>)}</div>
        <div className="undo-actions"><button className="icon-button" title="撤销 Ctrl Z" aria-label="撤销" disabled={!s.canUndo} onClick={s.undo}><Undo2 size={16}/></button><button className="icon-button" title="重做 Ctrl Shift Z" aria-label="重做" disabled={!s.canRedo} onClick={s.redo}><Redo2 size={16}/></button></div>
      </div><Stage studio={s} picking={picking} setPicking={setPicking} selected={selected} setSelected={setSelected}/></div>
      <aside className="adjustments"><div className="adjustments-heading"><div><span className="eyebrow">DEVELOP</span><h2>显影参数</h2></div><button className="icon-button" title="保存预设" aria-label="保存预设" disabled={!s.preview?.base} onClick={showSave}><Save size={17}/></button></div>
        <Histogram bins={s.preview?.histogram}/><div className="adjustments-scroll"><Samples studio={s} picking={picking} setPicking={setPicking} selected={selected} setSelected={setSelected}/><Parameters studio={s}/></div>
        <div className="calibration-state"><span className={`tiny-dot ${s.preview?.base?'ready':''}`}/>{s.preview?.base?'片基已校准':'尚未建立片基校准'}<span>{s.edit.samples.filter(p=>p.enabled).length} 点</span></div>
      </aside>
    </div>
    <footer className="statusbar"><span><span className={`tiny-dot ${s.busy?'working':''}`}/>{s.loading?'正在解码 DNG':s.busy?'正在计算预览':s.image?'工作台就绪':'等待打开文件'}</span><span>{s.image?.camera??'手动采样 · 无内置色罩'}{s.preview&&<><i/>预览 {s.preview.width} × {s.preview.height}<i/>{s.preview.elapsed_ms} ms</>}</span><span>LOCAL PROCESSING<Check size={11}/></span></footer>
    {s.message&&<div className="toast" role="status"><span>{s.message}</span><button className="icon-button" aria-label="关闭提示" onClick={()=>s.setMessage('')}><X size={14}/></button></div>}
    {modal==='save'&&<Dialog title="保存片基预设" onClose={()=>setModal(null)}><p className="dialog-copy">保留你的采样、色温与转正参数，供下一张底片复用。</p><label className="input-label">预设名称<input autoFocus maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>{modalError&&<p className="warning-inline">{modalError}</p>}<div className="dialog-actions">{chosen&&<button className="secondary" disabled={saving||!name.trim()} onClick={()=>void save(true)}>覆盖当前预设</button>}<button className="primary" disabled={saving||!name.trim()} onClick={()=>void save(false)}>{saving?'保存中…':chosen?'另存为新预设':'保存预设'}</button></div></Dialog>}
    {modal==='preset'&&chosen&&<Dialog title={chosen.name} onClose={()=>setModal(null)}><div className="preset-summary"><span>来源相机</span><strong>{chosen.source.camera}</strong><span>胶片平衡色温</span><strong>{chosen.edit.params.film_temp} K</strong><span>线性片基 RGB</span><code>{chosen.base.map(v=>v.toFixed(4)).join(' / ')}</code></div>
      {s.image&&chosen.source.camera!==s.image.camera&&<p className="warning-inline">当前相机与预设来源不同，建议重新采样。</p>}
      <p className="dialog-copy">{s.image?.id===chosen.source.id?'同一原图将恢复已保存的采样位置。':'复用仅使用校准值，不会在新图的旧坐标自动取样。'}</p>
      <div className="dialog-tools"><button className="text-tool" onClick={()=>void s.exportPreset(chosen)}><Download size={14}/>导出 JSON</button><button className="text-tool danger-hover" onClick={()=>setModal('delete')}><Trash2 size={14}/>删除</button></div><div className="dialog-actions"><button className="secondary" disabled={!s.image} onClick={()=>apply(true)}>重新采样</button><button className="primary" disabled={!s.image} onClick={()=>apply(false)}>应用校准</button></div></Dialog>}
    {modal==='delete'&&chosen&&<Dialog title="删除这个预设？" onClose={()=>setModal(null)}><p className="dialog-copy">「{chosen.name}」将从本地预设库删除，已导出的 JSON 文件会保留。</p>{modalError&&<p className="warning-inline">{modalError}</p>}<div className="dialog-actions"><button className="secondary" onClick={()=>setModal('preset')}>取消</button><button className="primary" onClick={()=>{void s.deletePreset(chosen).then(()=>{setChosen(null);setModal(null);}).catch(e=>setModalError(String(e)));}}>删除预设</button></div></Dialog>}
  </div>;
}
