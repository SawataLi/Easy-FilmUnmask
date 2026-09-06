use serde::{Deserialize, Serialize};
pub type Rgb = [f32; 3];
pub type Mat3 = [[f32; 3]; 3];
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ImageInfo {
    pub id: String, pub name: String, pub camera: String,
    pub width: usize, pub height: usize, pub wb: Rgb,
}
pub struct FilmImage {
    pub info: ImageInfo, pub pixels: Vec<Rgb>, pub valid: Vec<bool>,
    pub xyz_to_cam: Mat3,
}
#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Sample {
    pub id: u32, pub x: f32, pub y: f32, pub radius: f32,
    pub weight: f32, pub enabled: bool,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SampleStat { pub id: u32, pub rgb: Rgb, pub valid_ratio: f32, pub count: usize }
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct Params {
    pub wb_mode: String, pub capture_temp: f32, pub capture_tint: f32,
    pub film_temp: f32, pub scene_enabled: bool, pub scene_temp: f32,
    pub adaptation: f32, pub film_tint: f32, pub density: f32,
    pub black: f32, pub exposure: f32, pub contrast: f32,
    pub saturation: f32, pub slopes: Rgb,
}
impl Default for Params {
    fn default() -> Self { Self {
        wb_mode: "file".into(), capture_temp: 5500., capture_tint: 0.,
        film_temp: 5500., scene_enabled: false, scene_temp: 5500.,
        adaptation: 1., film_tint: 0., density: 2., black: 0.,
        exposure: 0., contrast: 1., saturation: 1., slopes: [1.;3],
    } }
}
impl Params {
    pub fn validate(&self) -> Result<(), String> {
        if !["file", "manual"].contains(&self.wb_mode.as_str()) { return Err("未知白平衡模式".into()); }
        for (v,lo,hi) in [(self.capture_temp,2000.,12000.),(self.film_temp,2000.,12000.),
            (self.scene_temp,2000.,12000.),(self.capture_tint,-100.,100.),(self.film_tint,-100.,100.),
            (self.adaptation,0.,1.),(self.density,0.1,5.),(self.black,-0.5,0.5),
            (self.exposure,-5.,5.),(self.contrast,0.2,3.),(self.saturation,0.,2.),
            (self.slopes[0],0.2,3.),(self.slopes[1],0.2,3.),(self.slopes[2],0.2,3.)] {
            if !v.is_finite() || v<lo || v>hi { return Err("参数超出支持范围".into()); }
        } Ok(())
    }
}
pub fn validate_samples(samples: &[Sample]) -> Result<(),String> {
    if samples.len()>64 { return Err("最多支持 64 个采样点".into()); }
    let mut ids=std::collections::HashSet::new();
    for s in samples {
        if !ids.insert(s.id) || !s.x.is_finite() || !s.y.is_finite() || !(0.0..=1.).contains(&s.x)
            || !(0.0..=1.).contains(&s.y) || !s.radius.is_finite() || !(1.0..=150.).contains(&s.radius)
            || !s.weight.is_finite() || !(0.1..=10.).contains(&s.weight) { return Err("采样点无效".into()); }
    } Ok(())
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Edit { pub params: Params, pub samples: Vec<Sample>, pub reused_base: Option<Rgb> }
impl Edit {
    pub fn validate(&self) -> Result<(),String> {
        self.params.validate()?; validate_samples(&self.samples)?;
        if let Some(b)=self.reused_base { if b.iter().any(|v| !v.is_finite() || *v<=0. || *v>1.) { return Err("片基值无效".into()); } }
        Ok(())
    }
}
#[derive(Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all="lowercase")]
pub enum Mode { Original, Unmasked, Positive }
#[derive(Serialize)]
pub struct Preview {
    pub revision: u64, pub image_id: String, pub mode: Mode, pub data: String, pub original: String,
    pub histogram: Vec<Vec<u32>>, pub stats: Vec<SampleStat>, pub base: Option<Rgb>,
    pub width: u32, pub height: u32, pub elapsed_ms: u128,
}
