import { useEffect,useLayoutEffect,useRef,useState } from 'react';
import { ScanLine,Plus,Minus,Maximize,Columns2,Move,MousePointer2,Film,ArrowUpRight } from 'lucide-react';
import type { Studio } from './useStudio';
import { clamp,fitScale,imagePoint } from './geometry';
export function Stage({studio:s,picking,setPicking,selected,setSelected}:{studio:Studio;picking:boolean;setPicking:(v:boolean)=>void;selected:number|null;setSelected:(v:number|null)=>void}) {
  const host=useRef<HTMLDivElement>(null),picture=useRef<HTMLDivElement>(null);
  const [size,setSize]=useState({width:800,height:700}),[zoom,setZoom]=useState<number|null>(null);
  const [pan,setPan]=useState({x:0,y:0}),[compare,setCompare]=useState(false),[split,setSplit]=useState(50);
  const drag=useRef<{x:number;y:number;px:number;py:number;point?:number}|null>(null);
  useLayoutEffect(()=>{const el=host.current;if(!el)return;const ob=new ResizeObserver(([e])=>setSize({width:e.contentRect.width,height:e.contentRect.height}));ob.observe(el);return()=>ob.disconnect();},[]);
  useEffect(()=>{setPan({x:0,y:0});setZoom(null);setCompare(false);},[s.image?.id]);
  const info=s.image;
  const fit=info?Math.max(.03,fitScale(info.width,info.height,size.width,size.height)):1;
  const scale=zoom??fit;
  function changeZoom(v:number|null){setZoom(v===null?null:clamp(v,.03,4));s.setFull(v!==null&&v>=.8);if(v===null)setPan({x:0,y:0});}
  function addPoint(e:React.PointerEvent) {
    if(!info||!picture.current||s.edit.samples.length>=64)return;
    const pos=imagePoint(e.clientX,e.clientY,picture.current.getBoundingClientRect());
    const id=Math.max(0,...s.edit.samples.map(p=>p.id))+1;
    s.update(v=>({...v,samples:[...v.samples,{id,...pos,radius:12,weight:1,enabled:true}],reused_base:null}));setSelected(id);
  }
  function start(e:React.PointerEvent,point?:number) {
    if(e.button!==0||!info)return;
    if(point!==undefined){e.stopPropagation();setSelected(point);}
    else if(picking){if(e.target instanceof Element&&e.target.closest('.picture'))addPoint(e);return;}
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y,point};
  }
  function move(e:React.PointerEvent) {
    const d=drag.current;if(!d)return;
    if(d.point!==undefined&&picture.current) {
      const pos=imagePoint(e.clientX,e.clientY,picture.current.getBoundingClientRect());
      s.update(v=>({...v,samples:v.samples.map(p=>p.id===d.point?{...p,...pos}:p)}));
    }else setPan({x:d.px+e.clientX-d.x,y:d.py+e.clientY-d.y});
  }
  return <main className="workspace">
    <div className="workspace-header"><div><span className="eyebrow">LIGHT TABLE</span><h1>{info?'每一帧，从片基开始。':'让底片，回到光里。'}</h1></div><span className="workspace-index">01 <span>/ SINGLE FRAME</span></span></div>
    <div ref={host} className={`stage ${picking?'picking':''}`} onPointerDown={e=>start(e)} onPointerMove={move} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} onWheel={e=>{if(info)changeZoom(scale*(e.deltaY<0?1.12:.89));}}>
      <i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/>
      {s.preview&&info?<>
        <div className="stage-label">{picking?<><ScanLine size={12}/>采样读取原始线性像素</>:<><span className="tiny-dot"/>{s.mode==='original'?'原始负片':s.mode==='unmasked'?'去罩负片':'正片预览'}</>}</div>
        <div ref={picture} className="picture" style={{width:info.width*scale,height:info.height*scale,left:'50%',top:'50%',transform:`translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`}}>
          <img src={s.preview.data} alt="胶片处理预览" draggable={false}/>
          {compare&&s.mode!=='original'&&<><img className="compare-original" src={s.preview.original} alt="原始负片对比" draggable={false} style={{clipPath:`inset(0 ${100-split}% 0 0)`}}/><div className="split-line" style={{left:`${split}%`}}><span>‹ ›</span></div></>}
          {s.edit.samples.map(p=><button key={p.id} title={`拖动采样点 ${p.id}`} aria-label={`画面采样点 ${p.id}`} className={`point ${selected===p.id?'selected':''} ${!p.enabled?'off':''}`} style={{left:`${p.x*100}%`,top:`${p.y*100}%`}} onPointerDown={e=>start(e,p.id)}><i style={{width:p.radius*2*scale,height:p.radius*2*scale}}/><span>{p.id}</span></button>)}
        </div>
        {compare&&s.mode!=='original'&&<div className="compare-control" onPointerDown={e=>e.stopPropagation()}><span>原始</span><input aria-label="对比分割位置" type="range" min="0" max="100" value={split} onChange={e=>setSplit(Number(e.target.value))}/><span>处理后</span></div>}
        <div className="stage-meta"><span>{info.width} × {info.height}</span><span>RAW · FLOAT32</span></div>
      </>:<div className="empty-stage"><div className="film-illustration"><Film size={56} strokeWidth={.8}/><span/></div><span className="eyebrow">A SMALL DIGITAL DARKROOM</span><h2>放入一张底片</h2><p>从一个采样点开始，<br/>亲手找回胶片里的色彩。</p><button className="primary" onPointerDown={e=>e.stopPropagation()} onClick={s.openFile}>打开 DNG 文件<ArrowUpRight size={15}/></button><small>也可以将文件拖入窗口 · 本地处理</small></div>}
      {s.loading&&<div className="loading-overlay"><span className="spinner"/>正在读取 RAW 像素</div>}
    </div>
    <div className="viewer-toolbar"><div className="tool-group"><button className={`icon-button ${!picking?'active':''}`} title="拖动画面" aria-label="拖动画面" onClick={()=>setPicking(false)}><Move size={16}/></button><button className={`icon-button ${picking?'active':''}`} title="添加采样点" aria-label="采样工具" disabled={!info} onClick={()=>setPicking(true)}><MousePointer2 size={16}/></button></div><span className="toolbar-divider"/><div className="tool-group"><button className="icon-button" aria-label="缩小" disabled={!info} onClick={()=>changeZoom(scale/.8>4?4:scale*.8)}><Minus size={16}/></button><button className="zoom-label" onClick={()=>changeZoom(null)}>{Math.round(scale*100)}%</button><button className="icon-button" aria-label="放大" disabled={!info} onClick={()=>changeZoom(scale*1.25)}><Plus size={16}/></button></div><span className="toolbar-divider"/><button className="text-tool" onClick={()=>changeZoom(null)}><Maximize size={14}/>适应</button><button className={`text-tool ${zoom===1?'active':''}`} onClick={()=>changeZoom(1)}>1:1</button><span className="toolbar-divider"/><button className={`text-tool ${compare?'active':''}`} disabled={!s.preview||s.mode==='original'} onClick={()=>setCompare(!compare)}><Columns2 size={15}/>对比</button></div>
    <div className="workspace-footnote"><span>{picking?'点击添加 · 拖动采样点调整位置':'滚轮缩放 · 拖动平移 · Ctrl Z 撤销'}</span><span>以你的采样为准</span></div>
  </main>;
}
