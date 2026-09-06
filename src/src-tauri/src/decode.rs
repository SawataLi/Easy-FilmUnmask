use crate::model::*;
use rawler::{decoders::Orientation, imgop::{develop::{RawDevelop,ProcessingStep,Intermediate},xyz::Illuminant}};
use sha2::{Digest,Sha256};
use std::path::Path;
pub fn open(path: &Path) -> Result<FilmImage,String> {
    if path.extension().and_then(|x|x.to_str()).unwrap_or("").to_lowercase()!="dng" { return Err("首版支持 DNG 文件".into()); }
    let bytes=std::fs::read(path).map_err(|e|e.to_string())?;
    let id=format!("{:x}",Sha256::digest(&bytes)); drop(bytes);
    let mut raw=rawler::decode_file(path).map_err(|e|format!("DNG 解码失败：{e}"))?;
    let matrix=raw.color_matrix.get(&Illuminant::D65).or_else(||raw.color_matrix.get(&Illuminant::D50))
        .or_else(||raw.color_matrix.get(&Illuminant::A)).ok_or("DNG 缺少可用颜色矩阵")?;
    if matrix.len()!=9 {return Err("首版仅支持三通道 RGB 相机矩阵".into());}
    let xyz_to_cam=std::array::from_fn(|i|std::array::from_fn(|j|matrix[i*3+j]));
    crate::color::inverse(xyz_to_cam)?;
    let wb=[raw.wb_coeffs[0],raw.wb_coeffs[1],raw.wb_coeffs[2]];
    if wb.iter().any(|x|!x.is_finite()||*x<=0.) {return Err("DNG 缺少有效白平衡数据".into());}
    if raw.width<16 || raw.height<16 || raw.width.checked_mul(raw.height).unwrap_or(usize::MAX)>120_000_000 {
        return Err("不支持该图像尺寸（上限 1.2 亿像素）".into());
    }
    raw.apply_scaling().map_err(|e|e.to_string())?;
    let source_valid: Vec<bool>=raw.data.as_f32().chunks(raw.cpp)
        .map(|p|p.iter().all(|v|v.is_finite() && *v>0.0005 && *v<0.995)).collect();
    let dev=RawDevelop{steps:vec![ProcessingStep::Demosaic]};
    let Intermediate::ThreeColor(rgb)=dev.develop_intermediate(&raw).map_err(|e|e.to_string())?
        else {return Err("暂不支持此 DNG 的传感器排列".into());};
    let (w,h)=(raw.width,raw.height);
    let orientation=raw.orientation;
    let swapped=matches!(orientation,Orientation::Transpose|Orientation::Rotate90|Orientation::Transverse|Orientation::Rotate270);
    let (width,height)=if swapped {(h,w)}else{(w,h)};
    let mut pixels=vec![[0.;3];w*h]; let mut valid=vec![false;w*h];
    for y in 0..h { for x in 0..w {
        let (dx,dy)=match orientation {
            Orientation::HorizontalFlip=>(w-1-x,y), Orientation::Rotate180=>(w-1-x,h-1-y),
            Orientation::VerticalFlip=>(x,h-1-y), Orientation::Transpose=>(y,x),
            Orientation::Rotate90=>(h-1-y,x), Orientation::Transverse=>(h-1-y,w-1-x),
            Orientation::Rotate270=>(y,w-1-x), _=>(x,y),
        };
        let dest=dy*width+dx; pixels[dest]=rgb.data[y*w+x];
        valid[dest]=(y.saturating_sub(1)..=(y+1).min(h-1)).all(|yy|
            (x.saturating_sub(1)..=(x+1).min(w-1)).all(|xx|source_valid[yy*w+xx]))
            && pixels[dest].iter().all(|v|v.is_finite()&&*v>0.0005&&*v<0.995);
    }}
    Ok(FilmImage{info:ImageInfo{id,name:path.file_name().unwrap_or_default().to_string_lossy().into(),
        camera:format!("{} {}",raw.make,raw.model),width,height,wb},pixels,valid,xyz_to_cam})
}
