use crate::{model::*,process::{Pipeline,render}};
use image::{ImageEncoder,ExtendedColorType,codecs::{jpeg::JpegEncoder,tiff::TiffEncoder,png::PngEncoder}};
use std::{path::Path,io::{Cursor,Write}};
const ICC:&[u8]=include_bytes!("../icons/srgb.icc");
pub fn png(pixels:&[Rgb],w:u32,h:u32)->Result<Vec<u8>,String> {
    let bytes:Vec<u8>=pixels.iter().flat_map(|p|p.map(|v|(v.clamp(0.,1.)*255.).round() as u8)).collect();
    let mut out=Vec::new(); PngEncoder::new(&mut out).write_image(&bytes,w,h,ExtendedColorType::Rgb8).map_err(|e|e.to_string())?;
    Ok(out)
}
pub fn save(image:&FilmImage,edit:&Edit,mode:&Mode,path:&Path,progress:impl Fn(u8))->Result<(),String> {
    if *mode==Mode::Original {return Err("请选择去罩负片或正片后导出".into());}
    let ext=path.extension().and_then(|v|v.to_str()).unwrap_or("").to_lowercase();
    if !["jpg","jpeg","tif","tiff"].contains(&ext.as_str()) {return Err("导出格式应为 TIFF 或 JPEG".into());}
    let (pipe,_,_)=Pipeline::new(image,edit)?;
    if !pipe.calibrated(){return Err("请先采样片基或应用有效预设".into());}
    progress(10);
    let (pixels,w,h)=render(image,&pipe,mode,usize::MAX); progress(60);
    let parent=path.parent().ok_or("无效导出路径")?;
    let mut temp=tempfile::NamedTempFile::new_in(parent).map_err(|e|e.to_string())?;
    if ext=="jpg"||ext=="jpeg" {
        let bytes:Vec<u8>=pixels.iter().flat_map(|p|p.map(|v|(v*255.).round() as u8)).collect();
        let mut encoder=JpegEncoder::new_with_quality(temp.as_file_mut(),95);
        encoder.set_icc_profile(ICC.to_vec()).map_err(|e|e.to_string())?;
        encoder.encode(&bytes,w,h,ExtendedColorType::Rgb8).map_err(|e|e.to_string())?;
    } else {
        let bytes:Vec<u8>=pixels.iter().flat_map(|p|p.iter().flat_map(|v|((*v*65535.).round() as u16).to_ne_bytes())).collect();
        let mut encoder=TiffEncoder::new(temp.as_file_mut());
        encoder.set_icc_profile(ICC.to_vec()).map_err(|e|e.to_string())?;
        encoder.write_image(&bytes,w,h,ExtendedColorType::Rgb16).map_err(|e|e.to_string())?;
    }
    progress(90); temp.flush().map_err(|e|e.to_string())?; temp.as_file().sync_all().map_err(|e|e.to_string())?;
    temp.persist(path).map_err(|e|e.to_string())?; progress(100); Ok(())
}
pub fn validate_export(path:&Path,expected:(u32,u32),sixteen:bool)->Result<(),String> {
    let b=std::fs::read(path).map_err(|e|e.to_string())?;
    use image::ImageDecoder;
    // ImageReader's pixel-sized TIFF allocation limit can hide ICC tags on tiny images.
    let mut decoder:Box<dyn ImageDecoder>=if sixteen {
        Box::new(image::codecs::tiff::TiffDecoder::new(Cursor::new(&b)).map_err(|e|e.to_string())?)
    }else {Box::new(image::codecs::jpeg::JpegDecoder::new(Cursor::new(&b)).map_err(|e|e.to_string())?)};
    if decoder.dimensions()!=expected {return Err("导出尺寸不符".into());}
    if sixteen && decoder.color_type()!=image::ColorType::Rgb16 {return Err("TIFF 不是 RGB 16 位".into());}
    if decoder.icc_profile().map_err(|e|e.to_string())?.is_none(){return Err("导出缺少 ICC".into());} Ok(())
}
