export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function imagePoint(clientX:number,clientY:number,rect:{left:number;top:number;width:number;height:number}) {
  return {x:clamp((clientX-rect.left)/rect.width,0,1),y:clamp((clientY-rect.top)/rect.height,0,1)};
}
export function fitScale(width:number,height:number,availableWidth:number,availableHeight:number) {
  return Math.min((availableWidth-80)/width,(availableHeight-80)/height,1);
}
