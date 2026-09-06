export function Histogram({bins}:{bins:number[][]|undefined}) {
  const max=Math.max(1,...(bins?.flat()??[]).filter((_,i)=>i%256>1&&i%256<254));
  return <div className="histogram"><div className="eyebrow">RGB HISTOGRAM <span>显示输出 · sRGB</span></div>
    <svg viewBox="0 0 256 64" preserveAspectRatio="none" aria-label="RGB 直方图" role="img">
      {[16,32,48].map(y=><line key={y} x1="0" x2="256" y1={y} y2={y} stroke="#ffffff09"/>)}
      {bins?.map((b,c)=><path key={c} d={`M 0 64 ${b.map((n,x)=>`L ${x} ${64-Math.min(1,n/max)*59}`).join(' ')} L 255 64 Z`} fill={['#d47a6a','#7caf97','#719dd0'][c]} fillOpacity=".22" stroke={['#d47a6a','#7caf97','#719dd0'][c]} strokeWidth=".65"/>)}
    </svg><div className="histogram-axis"><span>0</span><span>128</span><span>255</span></div>
  </div>;
}
