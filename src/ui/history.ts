import { useRef,useState } from 'react';
import type { Edit } from './types';
export function useHistory(initial:Edit) {
  const [edit,set]=useState(initial); const current=useRef(initial);
  const past=useRef<Edit[]>([]); const future=useRef<Edit[]>([]); const last=useRef(0);const group=useRef('');
  function update(next:Edit|((e:Edit)=>Edit)) {
    const value=typeof next==='function'?next(current.current):next;
    if(JSON.stringify(value)===JSON.stringify(current.current))return;
    const old=current.current;
    const key=JSON.stringify({params:Object.keys(value.params).filter(k=>JSON.stringify(value.params[k as keyof typeof value.params])!==JSON.stringify(old.params[k as keyof typeof old.params])),samples:value.samples.map((p,i)=>({id:p.id,fields:Object.keys(p).filter(k=>p[k as keyof typeof p]!==old.samples[i]?.[k as keyof typeof p])})),count:old.samples.length});
    const now=Date.now(); if(now-last.current>350||key!==group.current||!past.current.length)past.current.push(current.current);group.current=key;
    if(past.current.length>80)past.current.shift(); last.current=now; future.current=[];
    current.current=value;set(value);
  }
  function reset(value:Edit) {past.current=[];future.current=[];current.current=value;last.current=0;set(value);}
  function undo() {const v=past.current.pop();if(v){future.current.push(current.current);current.current=v;last.current=0;set(v);}}
  function redo() {const v=future.current.pop();if(v){past.current.push(current.current);current.current=v;last.current=0;set(v);}}
  return {edit,update,reset,undo,redo,canUndo:past.current.length>0,canRedo:future.current.length>0};
}
