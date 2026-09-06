import { describe,it,expect } from 'vitest';
import { imagePoint,fitScale } from './geometry';
import { applyPreset,freshEdit,type Preset,type ImageInfo } from './types';
const image:ImageInfo={id:'one',name:'film.dng',camera:'camera-a',width:1000,height:2000,wb:[1,1,1]};
const preset:Preset={id:'test',version:1,algorithm:'density-v1',space:'linear-rec2020',name:'test',source:image,base:[.5,.3,.1],edit:{...freshEdit(),samples:[{id:1,x:.2,y:.4,radius:12,weight:1,enabled:true}]}};
describe('sampling geometry',()=>{
  it('maps screen coordinates after zoom and pan',()=>{
    expect(imagePoint(250,400,{left:150,top:200,width:500,height:1000})).toEqual({x:.2,y:.2});
    expect(imagePoint(600,400,{left:200,top:-400,width:2000,height:4000})).toEqual({x:.2,y:.2});
  });
  it('clamps dragging outside the image',()=>expect(imagePoint(-20,150,{left:0,top:0,width:100,height:100})).toEqual({x:0,y:1}));
  it('fits portrait images without overflow',()=>expect(fitScale(2448,3248,760,430)).toBeCloseTo(350/3248));
});
describe('preset boundaries',()=>{
  it('restores points only for the same original',()=>expect(applyPreset(preset,image,false).samples).toEqual(preset.edit.samples));
  it('reuses calibration without copying coordinates to another image',()=>{
    const edit=applyPreset(preset,{...image,id:'two'},false);expect(edit.samples).toEqual([]);expect(edit.reused_base).toEqual(preset.base);
  });
  it('resampling never silently uses old calibration',()=>{
    const edit=applyPreset(preset,{...image,id:'two'},true);expect(edit.samples).toEqual([]);expect(edit.reused_base).toBeNull();
  });
  it('editing the restored preset does not mutate saved data',()=>{
    const edit=applyPreset(preset,image,false);edit.params.slopes[0]=2;expect(preset.edit.params.slopes[0]).toBe(1);
  });
});
