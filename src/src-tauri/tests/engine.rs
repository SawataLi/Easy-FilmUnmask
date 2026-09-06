use film_engine::{model::*,color::RGB_TO_XYZ,process::{self,Pipeline},preset::{self,Preset},export};
fn fixture()->FilmImage {
    FilmImage{info:ImageInfo{id:"one".into(),name:"synthetic.dng".into(),camera:"test".into(),width:16,height:16,wb:[1.;3]},
        pixels:vec![[0.5,0.3,0.2];256],valid:vec![true;256],xyz_to_cam:film_engine::color::inverse(RGB_TO_XYZ).unwrap()}
}
fn edit()->Edit {Edit{params:Params::default(),samples:vec![Sample{id:1,x:0.5,y:0.5,radius:4.,weight:1.,enabled:true}],reused_base:None}}
#[test] fn median_rejects_outliers_and_invalid_pixels() {
    let mut im=fixture(); im.pixels[8*16+8]=[0.99;3];im.valid[8*16+9]=false;
    let (s,b)=process::sample(&im,&edit().samples);assert_eq!(b,Some([0.5,0.3,0.2]));assert!(s[0].valid_ratio<1.);
}
#[test] fn no_sampling_means_no_calibration() {
    let im=fixture();let mut e=edit();e.samples.clear();assert!(!Pipeline::new(&im,&e).unwrap().0.calibrated());
    assert!(export::save(&im,&e,&Mode::Positive,std::path::Path::new("unused.jpg"),|_|{}).is_err());
}
#[test] fn full_render_and_preview_share_pixel_math() {
    let im=fixture();let (p,_,_)=Pipeline::new(&im,&edit()).unwrap();
    let (full,_,_)=process::render(&im,&p,&Mode::Positive,usize::MAX);
    let (small,_,_)=process::render(&im,&p,&Mode::Positive,8);
    assert_eq!(full[0],small[0]);assert!(full.iter().flatten().all(|v|v.is_finite()));
}
#[test] fn preset_roundtrip_and_invalid_version_protection() {
    let im=fixture();let p=Preset{version:1,algorithm:"density-v1".into(),space:"linear-rec2020".into(),id:"test".into(),name:"测试".into(),source:im.info,edit:edit(),base:[0.5,0.3,0.2]};
    let d=tempfile::tempdir().unwrap();let path=d.path().join("p.json");preset::save(&path,&p).unwrap();
    let read=preset::read(&path).unwrap();assert_eq!(read.base,p.base);assert_eq!(read.edit.samples,p.edit.samples);
    let mut invalid=p.clone();invalid.version=99;assert!(preset::save(&path,&invalid).is_err());assert_eq!(preset::read(&path).unwrap().version,1);
}
#[test] fn exported_formats_have_profile_and_expected_depth() {
    let im=fixture();let d=tempfile::tempdir().unwrap();
    for ext in ["tiff","jpg"] {let path=d.path().join(format!("test.{ext}"));
        export::save(&im,&edit(),&Mode::Positive,&path,|_|{}).unwrap();
        export::validate_export(&path,(16,16),ext=="tiff").unwrap_or_else(|e|panic!("{ext}: {e}"));}
}
