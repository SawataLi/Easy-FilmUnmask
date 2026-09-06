use film_engine::{decode,model::*,process,export,preset};
use std::path::Path;
fn main()->Result<(),String> {
    let args:Vec<String>=std::env::args().collect();
    let path=Path::new(args.get(1).ok_or("verify-film <file.dng> <output-directory> [x y]")?);
    let out=Path::new(args.get(2).ok_or("缺少输出目录")?); std::fs::create_dir_all(out).map_err(|e|e.to_string())?;
    let start=std::time::Instant::now(); let image=decode::open(path)?;
    println!("{}",serde_json::to_string_pretty(&image.info).unwrap());
    println!("Decoded {} pixels in {:?}",image.pixels.len(),start.elapsed());
    let mut edit=Edit{params:Params::default(),samples:vec![],reused_base:None};
    if args.len()>=5 { edit.samples.push(Sample{id:1,x:args[3].parse().map_err(|_|"x")?,y:args[4].parse().map_err(|_|"y")?,radius:12.,weight:1.,enabled:true}); }
    let (pipe,stats,base)=process::Pipeline::new(&image,&edit)?;
    let (pixels,w,h)=process::render(&image,&pipe,&Mode::Original,1600);
    std::fs::write(out.join("reference-original.png"),export::png(&pixels,w,h)?).map_err(|e|e.to_string())?;
    if let Some(base)=base {
        println!("Samples: {}",serde_json::to_string(&stats).unwrap());
        let (pixels,w,h)=process::render(&image,&pipe,&Mode::Positive,1600);
        std::fs::write(out.join("reference-positive.png"),export::png(&pixels,w,h)?).map_err(|e|e.to_string())?;
        let p=preset::Preset{version:1,algorithm:"density-v1".into(),space:"linear-rec2020".into(),id:"verification".into(),name:"验收采样（非内置预设）".into(),source:image.info.clone(),edit:edit.clone(),base};
        preset::save(&out.join("verification-preset.json"),&p)?;
        let loaded=preset::read(&out.join("verification-preset.json"))?;
        assert_eq!(loaded.base,base);
        for ext in ["tiff","jpg"] {
            let target=out.join(format!("reference-positive.{ext}"));
            export::save(&image,&edit,&Mode::Positive,&target,|p|println!("{ext}: {p}%"))?;
            export::validate_export(&target,(image.info.width as u32,image.info.height as u32),ext=="tiff")?;
        }
        println!("Full resolution, ICC, bit depth and preset round-trip verified.");
    } Ok(())
}
