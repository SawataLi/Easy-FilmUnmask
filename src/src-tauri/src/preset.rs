use crate::model::*;
use serde::{Serialize,Deserialize};
use std::{io::Write,path::Path};
#[derive(Clone,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Preset {
    pub version:u32, pub algorithm:String, pub space:String,
    pub id:String, pub name:String, pub source:ImageInfo,
    pub edit:Edit, pub base:Rgb,
}
impl Preset {
    pub fn validate(&self)->Result<(),String> {
        if self.version!=1 || self.algorithm!="density-v1" || self.space!="linear-rec2020" {
            return Err("不支持此预设版本或工作空间".into());
        }
        if self.name.trim().is_empty()||self.name.chars().count()>80 || !valid_id(&self.id) {return Err("预设名称或标识无效".into());}
        if self.base.iter().any(|v|!v.is_finite()||*v<=0.||*v>1.) {return Err("预设片基数据无效".into());}
        self.edit.validate()
    }
}
pub fn valid_id(s:&str)->bool { !s.is_empty()&&s.len()<=100&&s.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'-') }
pub fn atomic_write(path:&Path,data:&[u8])->Result<(),String> {
    let parent=path.parent().ok_or("无效保存路径")?;
    std::fs::create_dir_all(parent).map_err(|e|e.to_string())?;
    let mut f=tempfile::NamedTempFile::new_in(parent).map_err(|e|e.to_string())?;
    f.write_all(data).map_err(|e|e.to_string())?; f.as_file().sync_all().map_err(|e|e.to_string())?;
    f.persist(path).map_err(|e|e.to_string())?; Ok(())
}
pub fn read(path:&Path)->Result<Preset,String> {
    if std::fs::metadata(path).map_err(|e|e.to_string())?.len()>1_000_000 {return Err("预设文件过大".into());}
    let p:Preset=serde_json::from_slice(&std::fs::read(path).map_err(|e|e.to_string())?).map_err(|e|format!("预设 JSON 无效：{e}"))?;
    p.validate()?; Ok(p)
}
pub fn save(path:&Path,p:&Preset)->Result<(),String> {
    p.validate()?; atomic_write(path,&serde_json::to_vec_pretty(p).map_err(|e|e.to_string())?)
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn invalid_values_and_paths_rejected() {
        assert!(!valid_id("../overwrite"));
        let mut p=Params::default(); p.density=0.; assert!(p.validate().is_err());
        p.density=f32::NAN; assert!(p.validate().is_err());
    }
    #[test] fn atomic_replace() {
        let dir=tempfile::tempdir().unwrap(); let p=dir.path().join("preset.json");
        atomic_write(&p,b"first").unwrap(); atomic_write(&p,b"second").unwrap();
        assert_eq!(std::fs::read(p).unwrap(),b"second");
    }
}
