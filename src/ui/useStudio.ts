import { useEffect,useRef,useState } from 'react';
import { invoke,isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { open,save } from '@tauri-apps/plugin-dialog';
import { useHistory } from './history';
import { freshEdit,type ImageInfo,type Preview,type Mode,type Preset,type Edit } from './types';
export function useStudio() {
  const history=useHistory(freshEdit()); const {edit,reset}=history;
  const [image,setImage]=useState<ImageInfo|null>(null),[preview,setPreview]=useState<Preview|null>(null);
  const [mode,setMode]=useState<Mode>('original'),[presets,setPresets]=useState<Preset[]>([]);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
  const [exporting,setExporting]=useState<number|null>(null),[full,setFull]=useState(false);
  const exportActive=useRef(false);
  const rev=useRef(Date.now()*1000),openSequence=useRef(0),imageRef=useRef<ImageInfo|null>(null);
  const calibrated=edit.samples.some(s=>s.enabled)||!!edit.reused_base;
  async function loadPath(path:string) {
    const seq=++openSequence.current; ++rev.current; setLoading(true);setMessage('');
    try {
      const r=await invoke<{info:ImageInfo;edit:Edit|null}>('open_image',{path});
      if(seq!==openSequence.current)return;
      imageRef.current=r.info;setPreview(null);setImage(r.info);reset(r.edit??freshEdit());setFull(false);
      setMode(r.edit&&(r.edit.samples.some(s=>s.enabled)||r.edit.reused_base)?'positive':'original');
    }catch(e){if(seq===openSequence.current)setMessage(String(e));}
    finally{if(seq===openSequence.current)setLoading(false);}
  }
  async function openFile() {
    if(!isTauri()){setMessage('请在桌面应用中打开 DNG；网页仅用于界面开发。');return;}
    try {const p=await open({multiple:false,filters:[{name:'Digital Negative',extensions:['dng']}]});if(p)await loadPath(p);}catch(e){setMessage(String(e));}
  }
  async function refresh() {
    const r=await invoke<{presets:Preset[];last_path:string|null;warnings:string[]}>('startup');
    setPresets(r.presets); if(r.warnings.length)setMessage(r.warnings.join('\n'));return r;
  }
  useEffect(()=>{
    if(!isTauri())return;
    refresh().then(r=>{if(r.last_path)void loadPath(r.last_path);}).catch(e=>setMessage(String(e)));
    const progress=listen<number>('export-progress',e=>{if(exportActive.current)setExporting(e.payload);});
    const drop=getCurrentWebview().onDragDropEvent(e=>{if(e.payload.type==='drop'&&e.payload.paths[0])void loadPath(e.payload.paths[0]);});
    return ()=>{void progress.then(f=>f());void drop.then(f=>f());};
  },[]);
  useEffect(()=>{
    if(!calibrated&&mode!=='original')setMode('original');
  },[calibrated,mode]);
  useEffect(()=>{
    const revision=++rev.current;
    if(!image||!isTauri()||loading)return;
    setBusy(true);
    const timer=setTimeout(async()=>{
      try {
        const r=await invoke<Preview>('preview',{imageId:image.id,revision,edit,mode:calibrated?mode:'original',maxEdge:full?Math.max(image.width,image.height):1600});
        if(revision===rev.current&&r.image_id===imageRef.current?.id){setPreview(r);if(r.mode!==mode)setMode(r.mode);setMessage(r.base===null&&edit.samples.some(p=>p.enabled)?'采样区域没有足够的有效像素，请移动采样点。':'');}
      }catch(e){if(revision===rev.current&&String(e)!=='superseded')setMessage(String(e));}
      finally{if(revision===rev.current)setBusy(false);}
    },100);
    return ()=>clearTimeout(timer);
  },[image,edit,mode,full,loading]);
  useEffect(()=>{
    if(!image||!isTauri())return;
    const t=setTimeout(()=>{void invoke('save_session',{imageId:image.id,edit}).catch(e=>setMessage(String(e)));},500);
    return ()=>clearTimeout(t);
  },[image,edit]);
  async function exportImage(format:'tiff'|'jpg') {
    if(!image||mode==='original')return;
    try {
      const path=await save({defaultPath:`${image.name.replace(/\.dng$/i,'')}-${mode}.${format}`,filters:[{name:format==='tiff'?'16 位 TIFF':'JPEG',extensions:[format]}]});
      if(!path)return;exportActive.current=true;setExporting(0);setMessage('');
      await invoke('export_image',{imageId:image.id,edit,mode,path});setMessage(`已导出至 ${path}`);
    }catch(e){setMessage(String(e));}finally{exportActive.current=false;setExporting(null);}
  }
  async function savePreset(name:string,id:string|null) {
    if(!image)return;
    const p=await invoke<Preset>('save_preset',{imageId:image.id,edit,name,id});await refresh();setMessage(`已保存预设「${p.name}」`);return p;
  }
  async function importPreset() {
    try {const path=await open({multiple:false,filters:[{name:'预设 JSON',extensions:['json']}]});
      if(path){await invoke('import_preset',{path});await refresh();setMessage('预设已导入，选择后可应用。');}
    }catch(e){setMessage(String(e));}
  }
  async function exportPreset(p:Preset) {
    try {const path=await save({defaultPath:`${p.name}.json`,filters:[{name:'预设 JSON',extensions:['json']}]});
      if(path)await invoke('export_preset',{id:p.id,path});
    }catch(e){setMessage(String(e));}
  }
  async function deletePreset(p:Preset) {await invoke('delete_preset',{id:p.id});await refresh();}
  return {...history,image,preview,mode,setMode,presets,busy,loading,message,setMessage,exporting,full,setFull,
    calibrated,openFile,exportImage,savePreset,importPreset,exportPreset,deletePreset};
}
export type Studio=ReturnType<typeof useStudio>;
