use crate::{commands::AppState,model::*,preset::{self,Preset},process::Pipeline};
use tauri::State;
use std::path::Path;
#[derive(serde::Serialize)] pub struct Startup {pub presets:Vec<Preset>,pub last_path:Option<String>,pub warnings:Vec<String>}
#[tauri::command]
pub fn startup(state:State<'_,AppState>)->Result<Startup,String> {
    let mut presets=vec![]; let mut warnings=vec![];
    for item in std::fs::read_dir(state.folder.join("presets")).map_err(|e|e.to_string())? {
        let path=item.map_err(|e|e.to_string())?.path();
        if path.extension().is_some_and(|v|v=="json") {match preset::read(&path) {
            Ok(p)=>presets.push(p),Err(e)=>warnings.push(format!("{}：{e}",path.file_name().unwrap_or_default().to_string_lossy()))
        }}
    }
    presets.sort_by(|a,b|a.name.cmp(&b.name));
    let last_path=std::fs::read(state.folder.join("last-path.json")).ok().and_then(|b|serde_json::from_slice(&b).ok());
    Ok(Startup{presets,last_path,warnings})
}
fn new_id()->String {format!("p-{}",std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos())}
#[tauri::command]
pub fn save_preset(image_id:String,edit:Edit,name:String,id:Option<String>,state:State<'_,AppState>)->Result<Preset,String> {
    let image=state.get(&image_id)?;
    let (_,_,base)=Pipeline::new(&image,&edit)?;
    let p=Preset{version:1,algorithm:"density-v1".into(),space:"linear-rec2020".into(),id:id.unwrap_or_else(new_id),name:name.trim().into(),source:image.info.clone(),edit,base:base.ok_or("请先采样片基")?};
    p.validate()?;
    preset::save(&state.folder.join("presets").join(format!("{}.json",p.id)),&p)?; Ok(p)
}
#[tauri::command]
pub fn delete_preset(id:String,state:State<'_,AppState>)->Result<(),String> {
    if !preset::valid_id(&id){return Err("预设标识无效".into());}
    std::fs::remove_file(state.folder.join("presets").join(format!("{id}.json"))).map_err(|e|e.to_string())
}
#[tauri::command]
pub fn import_preset(path:String,state:State<'_,AppState>)->Result<Preset,String> {
    let mut p=preset::read(Path::new(&path))?; p.id=new_id();
    preset::save(&state.folder.join("presets").join(format!("{}.json",p.id)),&p)?; Ok(p)
}
#[tauri::command]
pub fn export_preset(id:String,path:String,state:State<'_,AppState>)->Result<(),String> {
    if !preset::valid_id(&id){return Err("预设标识无效".into());}
    if Path::new(&path).extension().and_then(|s|s.to_str()).unwrap_or("").to_lowercase()!="json" {return Err("预设应保存为 .json 文件".into());}
    let p=preset::read(&state.folder.join("presets").join(format!("{id}.json")))?;
    preset::save(Path::new(&path),&p)
}
