import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve('..'),out=resolve(root,'output/verification');
const source=resolve(root,'../../胶片.dng');
await mkdir(out,{recursive:true});
const runData=resolve(out,'app-data',String(Date.now()));
const launch=()=>spawn(process.env.FILM_BASE_TEST_EXE??resolve(root,'output/build/release/film-unmask.exe'),[],{
  windowsHide:true,env:{...process.env,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9222',FILM_BASE_DATA_DIR:runData}
});
let child=launch();
let browser;
const results=[];
async function record(name,fn){await fn();results.push({name,status:'passed'});console.log(`PASS ${name}`);}
try {
  for(let i=0;i<60;i++){
    try{browser=await chromium.connectOverCDP('http://127.0.0.1:9222');break;}catch{await new Promise(r=>setTimeout(r,500));}
  }
  if(!browser)throw Error('WebView2 调试端口未就绪');
  const context=browser.contexts()[0];
  let page=context.pages()[0];
  if(!page)page=await context.waitForEvent('page');
  await page.waitForSelector('.app-shell',{timeout:30000});
  await page.setViewportSize({width:1280,height:800});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  async function installDialogPaths(){
    await page.evaluate(({source,out})=>{
      const original=window.fetch.bind(window);
      window.testCalls=[];window.allCalls=[];window.testOpen=source;window.testSave=`${out}/desktop-export.tiff`;
      window.fetch=async(input,options)=>{
        const command=decodeURIComponent(new URL(String(input)).pathname.slice(1));
        const args=typeof options?.body==='string'?JSON.parse(options.body):{};
        window.allCalls.push(command);
        if(command==='plugin:dialog|open'||command==='plugin:dialog|save')return new Response(JSON.stringify(command.endsWith('|open')?window.testOpen:window.testSave),{headers:{'Content-Type':'application/json','Tauri-Response':'ok'}});
        if(command==='preview')window.testCalls.push({command,args});
        const response=await original(input,options);
        if(command==='preview'&&response.headers.get('Tauri-Response')==='ok'){
          const result=await response.clone().json();window.testPreview={revision:result.revision,base:result.base,mode:result.mode};
        }
        return response;
      };
    },{source,out:out.replaceAll('\\','/')});
  }
  await installDialogPaths();
  await record('真实 RAW 打开与初始状态',async()=>{
    await page.getByRole('button',{name:'打开底片',exact:true}).click();
    await page.getByAltText('胶片处理预览',{exact:true}).waitFor({timeout:30000});
    await expect(page.getByRole('button',{name:'正片',exact:true})).toBeDisabled();
    await expect(page.locator('.point')).toHaveCount(0);
    await page.screenshot({path:resolve(out,'desktop-original.png')});
  });
  await record('手动采样、有效像素统计与正片',async()=>{
    await page.getByRole('button',{name:'添加片基采样点',exact:true}).click();
    const box=await page.locator('.picture').boundingBox();
    await page.mouse.click(box.x+box.width*.86,box.y+box.height*.245);
    await expect(page.locator('.point')).toHaveCount(1);
    await expect(page.locator('.sample-values')).not.toHaveText('—',{timeout:15000});
    await page.getByRole('button',{name:'正片',exact:true}).click();
    await page.waitForFunction(()=>window.testPreview?.mode==='positive');
    await expect(page.locator('.calibration-state')).toContainText('片基已校准');
  });
  await record('分割对比、100% 与采样点拖动',async()=>{
    await page.getByRole('button',{name:'对比',exact:true}).click();
    await expect(page.getByRole('slider',{name:'对比分割位置'})).toBeVisible();
    await page.getByRole('slider',{name:'对比分割位置'}).fill('37');
    await page.getByRole('button',{name:'1:1',exact:true}).click();
    await expect(page.locator('.zoom-label')).toHaveText('100%');
    await page.getByRole('button',{name:'适应',exact:true}).click();
    const point=page.getByRole('button',{name:'画面采样点 1'});const b=await point.boundingBox();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
    await page.mouse.move(b.x+b.width/2-2,b.y+b.height/2+2,{steps:4});await page.mouse.up();
    await page.waitForTimeout(600);
    const p=await page.evaluate(()=>window.testCalls.at(-1).args.edit.samples[0]);
    expect(p.x).toBeLessThan(.86);expect(p.y).toBeGreaterThan(.245);
  });
  await record('色温参数、最新修订与撤销',async()=>{
    await page.getByRole('button',{name:'手动光源',exact:true}).click();
    const temp=page.getByRole('slider',{name:'翻拍光源',exact:true});
    await temp.fill('4000');await temp.fill('6500');await temp.fill('5200');
    await page.waitForFunction(()=>window.testCalls.at(-1)?.args.edit.params.capture_temp===5200&&window.testPreview?.revision===window.testCalls.at(-1)?.args.revision);
    expect(await page.evaluate(()=>window.testCalls.at(-1).args.edit.params.capture_temp)).toBe(5200);
    await page.getByRole('switch',{name:'原场景光源补偿',exact:true}).click();
    await page.getByRole('slider',{name:'原拍摄光源',exact:true}).fill('4500');
    await page.getByRole('button',{name:'撤销',exact:true}).click();
    await page.getByRole('button',{name:'重做',exact:true}).click();
    await page.getByRole('button',{name:'文件白平衡',exact:true}).click();
    await page.getByRole('switch',{name:'原场景光源补偿',exact:true}).click();
  });
  await record('保存、覆盖与导出预设',async()=>{
    await page.locator('.statusbar').getByText('工作台就绪',{exact:true}).waitFor({timeout:20000});
    await page.getByRole('button',{name:'保存预设',exact:true}).click();
    await page.getByRole('textbox',{name:'预设名称'}).fill('参考胶片 · 手动校准');
    await page.getByRole('dialog').getByRole('button',{name:'保存预设',exact:true}).click();
    await expect(page.locator('.preset-card')).toHaveCount(1);
    await page.getByRole('button',{name:'保存预设',exact:true}).click();
    await page.getByRole('button',{name:'覆盖当前预设',exact:true}).click();
    await expect(page.locator('.preset-card')).toHaveCount(1);
    await page.locator('.preset-card').click();
    await page.evaluate(out=>window.testSave=`${out}/desktop-preset.json`,out.replaceAll('\\','/'));
    await page.getByRole('button',{name:'导出 JSON'}).click();
    await page.getByRole('button',{name:'应用校准',exact:true}).click();
    await expect(page.locator('.point')).toHaveCount(1);
  });
  await record('真实桌面 TIFF 和 JPEG 导出',async()=>{
    for(const ext of ['tiff','jpg']){
      await page.getByRole('combobox',{name:'导出格式'}).selectOption(ext);
      await page.evaluate(({out,ext})=>window.testSave=`${out}/desktop-export.${ext}`,{out:out.replaceAll('\\','/'),ext});
      const button=page.getByRole('button',{name:'导出成片',exact:true});await expect(button).toBeEnabled({timeout:30000});
      await button.click();await expect(page.getByRole('status')).toContainText(`desktop-export.${ext}`,{timeout:60000});
      await expect(page.getByRole('button',{name:'导出成片',exact:true})).toBeEnabled({timeout:30000});
    }
  });
  await record('1280×800、高 DPI 与面板收起',async()=>{
    await page.getByRole('button',{name:'收起预设库'}).click();await expect(page.locator('.presets-panel')).toHaveCount(0);
    await page.getByRole('button',{name:'展开预设库'}).click();
    await page.locator('.adjustments-scroll').evaluate(e=>e.scrollTop=0);
    await page.getByRole('button',{name:'关闭提示'}).click().catch(()=>{});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(1280);
    await page.screenshot({path:resolve(out,'desktop-positive.png')});
    const cdp=await context.newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1.5,mobile:false});
    await page.screenshot({path:resolve(out,'desktop-high-dpi.png')});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(1280);
  });
  await record('重新加载恢复工作参数与预设',async()=>{
    await page.waitForTimeout(700);await page.reload();await page.waitForSelector('.picture',{timeout:30000});
    await expect(page.locator('.point')).toHaveCount(1);await expect(page.locator('.preset-card')).toHaveCount(1);
    await expect(page.locator('.calibration-state')).toContainText('片基已校准',{timeout:20000});
  });
  await record('关闭进程后重新启动恢复',async()=>{
    await browser.close();child.kill();await new Promise(r=>setTimeout(r,800));child=launch();browser=null;
    for(let i=0;i<60;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9222');break;}catch{await new Promise(r=>setTimeout(r,500));}}
    if(!browser)throw Error('重启后调试端口未就绪');
    const restored=browser.contexts()[0].pages()[0]??await browser.contexts()[0].waitForEvent('page');
    await restored.waitForSelector('.picture',{timeout:30000});
    await expect(restored.locator('.point')).toHaveCount(1);await expect(restored.locator('.preset-card')).toHaveCount(1);
    await expect(restored.locator('.calibration-state')).toContainText('片基已校准',{timeout:20000});
  });
  expect(errors).toEqual([]);
  await writeFile(resolve(out,'desktop-test-results.json'),JSON.stringify({results,errors},null,2));
}catch(e){
  if(browser){const p=browser.contexts()[0]?.pages()[0];if(p)await p.screenshot({path:resolve(out,'desktop-failure.png')}).catch(()=>{});}
  throw e;
}finally{if(browser)await browser.close();child.kill();}
