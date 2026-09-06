use crate::{color::*, model::*};
use rayon::prelude::*;
pub fn sample(image:&FilmImage,points:&[Sample])->(Vec<SampleStat>,Option<Rgb>) {
    let (w,h)=(image.info.width,image.info.height); let mut base=[0.;3]; let mut total_weight=0.;
    let stats=points.iter().map(|s| {
        let (cx,cy)=(s.x*(w-1) as f32,s.y*(h-1) as f32); let r=s.radius;
        let mut values:[Vec<f32>;3]=std::array::from_fn(|_|Vec::new()); let mut total=0;
        for y in ((cy-r).floor().max(0.) as usize)..=((cy+r).ceil() as usize).min(h-1) {
            for x in ((cx-r).floor().max(0.) as usize)..=((cx+r).ceil() as usize).min(w-1) {
                if (x as f32-cx).powi(2)+(y as f32-cy).powi(2)>r*r {continue;}
                total+=1; let i=y*w+x;
                if image.valid[i] {for c in 0..3 {values[c].push(image.pixels[i][c]);}}
            }
        }
        let count=values[0].len(); let mut rgb=[0.;3];
        if count>=3 { for c in 0..3 {values[c].sort_unstable_by(f32::total_cmp); let n=count;
            rgb[c]=(values[c][(n-1)/2]+values[c][n/2])*0.5; }
            if s.enabled {for c in 0..3 {base[c]+=rgb[c]*s.weight;} total_weight+=s.weight;}
        }
        SampleStat{id:s.id,rgb,valid_ratio:count as f32/total.max(1) as f32,count}
    }).collect();
    (stats,if total_weight>0. {Some(base.map(|v|v/total_weight))}else{None})
}
pub struct Pipeline { matrix:Mat3, scene:Mat3, base:Option<Rgb>, p:Params }
impl Pipeline {
    pub fn new(image:&FilmImage,edit:&Edit)->Result<(Self,Vec<SampleStat>,Option<Rgb>),String> {
        edit.validate()?;
        let (stats,sampled)=sample(image,&edit.samples); let raw_base=sampled.or(edit.reused_base);
        let p=&edit.params;
        let wb=if p.wb_mode=="file" {image.info.wb} else {
            let mut neutral=mv(image.xyz_to_cam,white(p.capture_temp));
            neutral[1]*=2_f32.powf(p.capture_tint/200.);
            if neutral.iter().any(|v|*v<=0.) {return Err("该色温超出相机矩阵的可用范围".into());}
            neutral.map(|v|neutral[1]/v)
        };
        let matrix=camera_matrix(image.xyz_to_cam,wb)?;
        let base=raw_base.map(|b|mv(matrix,b));
        if base.is_some_and(|b| b.iter().any(|v|!v.is_finite()||*v<=1e-7)) {return Err("片基变换后存在非正通道，请调整光源或重新采样".into());}
        let scene=if p.scene_enabled {mm(XYZ_TO_RGB,mm(adapt(white(p.scene_temp),white(p.film_temp)),RGB_TO_XYZ))}else{ID};
        Ok((Self{matrix,scene,base,p:p.clone()},stats,raw_base))
    }
    pub fn pixel(&self,raw:Rgb,mode:&Mode)->Rgb {
        let rgb=mv(self.matrix,raw);
        if *mode==Mode::Original {return encode(rgb);}
        let b=self.base.unwrap_or([1.;3]);
        let t=std::array::from_fn::<_,3,_>(|c|rgb[c]/b[c]);
        if *mode==Mode::Unmasked {return encode(t);}
        let p=&self.p;
        let mut v=std::array::from_fn(|c|(-t[c].max(1e-7).log10()*p.slopes[c]/p.density+p.black).max(0.));
        let adjusted=mv(self.scene,v);
        for c in 0..3 {v[c]+=p.adaptation*(adjusted[c]-v[c]);}
        v[1]*=2_f32.powf(-p.film_tint/200.);
        v=v.map(|x|(x*2_f32.powf(p.exposure)).max(0.).powf(p.contrast));
        let l=0.2627*v[0]+0.678*v[1]+0.0593*v[2];
        encode(v.map(|x|l+(x-l)*p.saturation))
    }
    pub fn calibrated(&self)->bool {self.base.is_some()}
}
pub fn render(image:&FilmImage,pipe:&Pipeline,mode:&Mode,max_edge:usize)->(Vec<Rgb>,u32,u32) {
    let scale=(image.info.width.max(image.info.height) as f32/max_edge as f32).max(1.);
    let w=(image.info.width as f32/scale).round() as usize;
    let h=(image.info.height as f32/scale).round() as usize;
    let out=(0..w*h).into_par_iter().map(|i| {
        let x=((i%w) as f32*scale) as usize; let y=((i/w) as f32*scale) as usize;
        pipe.pixel(image.pixels[y*image.info.width+x],mode)
    }).collect(); (out,w as u32,h as u32)
}
pub fn histogram(pixels:&[Rgb])->Vec<Vec<u32>> {
    let mut bins=vec![vec![0;256];3];
    for p in pixels {for c in 0..3 {bins[c][(p[c].clamp(0.,1.)*255.).round() as usize]+=1;}}
    bins
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn density_is_finite_monotonic_and_base_neutral() {
        let p=Pipeline{matrix:ID,scene:ID,base:Some([0.7,0.3,0.2]),p:Params::default()};
        let white=p.pixel([0.7,0.3,0.2],&Mode::Unmasked);
        assert!((white[0]-white[1]).abs()<0.001);
        let mut previous=2.;
        for i in 0..100 {let t=i as f32/100.;let v=p.pixel([0.7*t,0.3*t,0.2*t],&Mode::Positive);
            assert!(v.iter().all(|c|c.is_finite())); assert!(v[0]<=previous+1e-5); previous=v[0];}
    }
}
