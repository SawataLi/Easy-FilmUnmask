use crate::{decode,model::*,process,preset,export,io_commands};
use std::{sync::{Arc,Mutex,atomic::{AtomicU64,Ordering}},path::PathBuf};
use tauri::{Manager,State,Emitter};
use base64::{Engine,engine::general_purpose::STANDARD};
pub struct AppState {
    pub image:Mutex<Option<Arc<FilmImage>>>, pub latest:AtomicU64, pub folder:PathBuf,
    pub open_generation:AtomicU64,
}
impl AppState {
    pub fn get(&self,id:&str)->Result<Arc<FilmImage>,String> {
        self.image.lock().map_err(|_|"图像状态不可用")?.as_ref()
            .filter(|i|i.info.id==id).cloned().ok_or("图像已关闭或替换".into())
    }
}
#[derive(serde::Serialize)] pub struct OpenResult {pub info:ImageInfo,pub edit:Option<Edit>}
#[tauri::command]
pub async fn open_image(path:String,state:State<'_,AppState>)->Result<OpenResult,String> {
    let generation=state.open_generation.fetch_add(1,Ordering::SeqCst)+1;
    let decode_path=path.clone();
    let image=tauri::async_runtime::spawn_blocking(move||decode::open(std::path::Path::new(&decode_path)))
        .await.map_err(|e|format!("解码任务失败：{e}"))??;
    if generation!=state.open_generation.load(Ordering::SeqCst) {return Err("已被新的文件打开请求替代".into());}
    let info=image.info.clone();
    let edit=std::fs::read(state.folder.join(format!("session-{}.json",info.id))).ok()
        .and_then(|b|serde_json::from_slice::<Edit>(&b).ok()).filter(|e|e.validate().is_ok());
    *state.image.lock().map_err(|_|"图像状态不可用")?=Some(Arc::new(image));
    preset::atomic_write(&state.folder.join("last-path.json"),&serde_json::to_vec(&path).unwrap())?;
    Ok(OpenResult{info,edit})
}
#[tauri::command]
pub async fn preview(image_id:String,revision:u64,edit:Edit,mode:Mode,max_edge:usize,state:State<'_,AppState>)->Result<Preview,String> {
    state.latest.fetch_max(revision,Ordering::SeqCst);
    let image=state.get(&image_id)?;
    let result=tauri::async_runtime::spawn_blocking(move|| -> Result<Preview,String> {
        let start=std::time::Instant::now();
        let (pipe,stats,base)=process::Pipeline::new(&image,&edit)?;
        let mode=if pipe.calibrated(){mode}else{Mode::Original};
        let edge=max_edge.clamp(400,24000);
        let (pixels,w,h)=process::render(&image,&pipe,&mode,edge);
        let histogram=process::histogram(&pixels);
        let data=format!("data:image/png;base64,{}",STANDARD.encode(export::png(&pixels,w,h)?));
        let original=if mode==Mode::Original {data.clone()}else {
            let (p,_,_)=process::render(&image,&pipe,&Mode::Original,edge);
            format!("data:image/png;base64,{}",STANDARD.encode(export::png(&p,w,h)?))
        };
        Ok(Preview{revision,image_id:image.info.id.clone(),mode,data,original,histogram,stats,base,width:w,height:h,elapsed_ms:start.elapsed().as_millis()})
    }).await.map_err(|e|e.to_string())??;
    if revision!=state.latest.load(Ordering::SeqCst) {return Err("superseded".into());}
    state.get(&image_id)?;
    Ok(result)
}
#[tauri::command]
pub fn save_session(image_id:String,edit:Edit,state:State<'_,AppState>)->Result<(),String> {
    state.get(&image_id)?; edit.validate()?;
    preset::atomic_write(&state.folder.join(format!("session-{image_id}.json")),&serde_json::to_vec(&edit).map_err(|e|e.to_string())?)
}
#[tauri::command]
pub async fn export_image(image_id:String,edit:Edit,mode:Mode,path:String,app:tauri::AppHandle,state:State<'_,AppState>)->Result<(),String> {
    let image=state.get(&image_id)?;
    tauri::async_runtime::spawn_blocking(move||export::save(&image,&edit,&mode,std::path::Path::new(&path),|p| {let _=app.emit("export-progress",p);})).await.map_err(|e|e.to_string())?
}
pub fn run() {
    tauri::Builder::default().plugin(tauri_plugin_dialog::init()).setup(|app| {
        let folder=std::env::var_os("FILM_BASE_DATA_DIR").map(PathBuf::from).unwrap_or(app.path().app_data_dir()?);
        std::fs::create_dir_all(folder.join("presets"))?;
        app.manage(AppState{image:Mutex::new(None),latest:AtomicU64::new(0),folder,open_generation:AtomicU64::new(0)});
        Ok(())
    }).invoke_handler(tauri::generate_handler![open_image,preview,save_session,export_image,
        io_commands::startup,io_commands::save_preset,io_commands::delete_preset,
        io_commands::import_preset,io_commands::export_preset])
    .run(tauri::generate_context!()).expect("无法启动片基工作台");
}
