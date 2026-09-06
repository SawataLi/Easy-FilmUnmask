# 片基 · Easy-FilmUnmask

> 产品名 **片基 / Film Base**（程序 `Film Base`，标识 `studio.filmbase.desktop`）。用于数字翻拍负片的本地 Windows 暗房。Tauri 2 桌面容器、React / TypeScript 界面、Rust 浮点图像引擎。**没有内置色罩，也不会自动替用户选取片基** —— 片基由你在画面透明边缘采样决定。

- 当前版本：**v0.1.0**（Apache-2.0）
- 所有图像运算均在本机执行，运行不需要 Node、Rust 或 Python。

## 下载

前往 [Releases](https://github.com/SawataLi/Easy-FilmUnmask/releases/tag/v0.1.0)：

| 文件 | 说明 |
| --- | --- |
| `Film-Base-0.1.0-x64-setup.exe` | Windows 安装向导版 |
| `Film-Base.exe` | 免安装绿色版，双击即用 |
| `Film-Base-0.1.0-source.zip` | 源码包 |
| `SHA256.json` | 上述文件的字节数与 SHA-256，供完整性核对 |

运行环境：Windows 10 / 11 x64，以及 Microsoft Edge WebView2 Runtime（多数系统已自带）。

## 建议操作顺序

1. 打开或拖入 DNG；先查看原始负片。
2. 点击 **添加片基采样点**，在透明、未曝光的片基边缘点击，避开齿孔、印字、灰尘和画面内容。可增加多个点、拖动位置，调整半径和权重，或停用不合适的点。
3. 设置 **翻拍校准**。默认沿用 DNG 白平衡；若知道灯板色温，选择手动光源并调整色温／色偏。这两种模式互斥。
4. 设置胶片平衡色温，例如日光型 5500K 或灯光型 3200K。仅在知道原拍摄光源时开启原场景补偿；未开启时假设光源与胶片平衡匹配。
5. 切换 **去罩负片** 或 **正片**。通过密度范围、黑点、曝光、对比度、饱和度及 RGB 密度斜率微调。片基校准只是起点，并不代替胶片的通道响应调整。
6. 保存预设，或导出当前模式的 TIFF 16 位／JPEG。原始 DNG 不被修改。

滚轮缩放，拖动平移；`适应` 回到完整画面，`1:1` 请求完整像素预览。`对比` 显示原始负片与处理后的分割视图。采样点读取全分辨率线性数据，与显示模式和缩放无关。

快捷键：`Ctrl+O` 打开、`Ctrl+Z` 撤销、`Ctrl+Shift+Z` 重做、`Esc` 退出采样工具。输入框内保留正常的文本编辑快捷键。

## 预设与工作记录

应用数据默认保存在 `%APPDATA%/studio.filmbase.desktop/`：`presets/` 保存预设，`session-<图像SHA256>.json` 保存工作参数，`last-path.json` 保存最近打开路径。工作记录在停止调参后自动保存。

- 同一原图按内容 SHA256 识别，可恢复采样位置。
- 其他原图选择 **应用校准** 时，仅复用片基值和参数，不按旧坐标重新取样。
- **重新采样** 保留参数并清除旧片基依据。
- 跨相机使用会提示重新校准。改变翻拍曝光、光源或胶片种类时，也应重新采样。
- JSON 可导入／导出；导入总是生成新的本地预设标识，不覆盖同名预设。覆盖需在保存界面明确选择。
- 未知版本、非法数值和无效 JSON 会被拒绝。文件写入使用同目录临时文件与原子替换。

## 计算约定

`rawler 0.7.2` 解码 RAW，扣除黑电平并按白电平归一化，使用 PPG 去马赛克。应用 DNG 方向信息；相机矩阵优先采用 D65，其次 D50、A。首版不插值双光源矩阵，不声称覆盖所有厂商的 DNG 扩展和 Opcode。

翻拍白平衡与相机颜色转换合并为一次变换，进入 **线性 Rec.2020**。采样区域剔除接近黑电平／饱和的像素，以各通道中位数减少颗粒和异常值影响，再按用户权重合成片基。预设保存归一化相机 RGB 片基值，因此调整翻拍参数时能重新转换片基，避免使用过期的工作空间数值。

去罩：`T = I / B`。转正：`D = -log10(max(T, 1e-7))`，再由用户控制密度范围、RGB 斜率、黑点和显影参数。负值／超范围中间数据不会提前按显示范围截断；对数计算单独保护，最终输出裁切并转换为 sRGB。

原场景补偿在转正后使用 Bradford 色适应变换，将原场景光源白点适配到胶片平衡白点。两者相等时为恒等变换。Kelvin 参数仅近似色度关系，不能恢复实际胶片染料、曝光和 LED 光谱的全部影响。

TIFF 为全尺寸 RGB 16 位，JPEG 为全尺寸 95 质量 RGB 8 位；两者嵌入由 LittleCMS 生成的 sRGB ICC。预览和导出共用 Rust 像素变换，预览仅减少采样分辨率。首版不含裁切旋转编辑、自动除尘、批量导出或 LUT。

## 仓库结构

```
src/                    React 界面、Vite 配置、前端测试与 npm 锁文件
src/src-tauri/          Rust 图像引擎、Tauri 命令、图标与 Cargo 锁文件
input/README.md         参考素材规格（示例 DNG 不在仓库内分发）
third_party/rawler-0.7.2/  rawler 上游源码只读副本，供离线审计与可复现重编译
licenses/               各第三方组件许可证原文
tools/dev.ps1           开发／构建／验证统一入口
tools/assetgen/         uv 隔离的图标与 ICC 生成脚本
LICENSE / THIRD_PARTY.md  本项目许可（Apache-2.0）与第三方清单
```

构建产物目录 `output/`（安装包、便携版、验收结果）以及本地工具链缓存 `tools/cargo/`、`tools/rustup/` 均通过 `.gitignore` 排除，不随仓库分发；发布产物见 Releases。

## 从源码构建

依赖：

- Rust stable（MSVC 工具链）与 Microsoft C++ Build Tools（含 Windows SDK）
- Node.js（用于前端与 Tauri CLI）
- Microsoft Edge WebView2 Runtime

在 `src/` 执行 `npm ci` 恢复前端依赖，随后在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File tools/dev.ps1 dev      # 开发调试
powershell -ExecutionPolicy Bypass -File tools/dev.ps1 build    # 产出安装包到 output/
powershell -ExecutionPolicy Bypass -File tools/dev.ps1 test     # cargo test + npm test
powershell -ExecutionPolicy Bypass -File tools/dev.ps1 verify   # 端到端验收（见下）
```

`tools/dev.ps1` 若检测到 `tools/cargo/` 与 `tools/rustup/` 存在本地 Rust 工具链，会自动设置 `CARGO_HOME`／`RUSTUP_HOME` 并使用它、且不改系统 PATH；否则回退使用系统已安装的 Cargo／rustup。Rust 依赖由 `Cargo.toml` 与 `Cargo.lock` 管理，前端由 npm 清单与锁文件管理。

图标／ICC 生成工具用 uv 隔离运行，不属于应用运行时依赖：

```powershell
cd tools/assetgen
uv run python generate.py
```

Rust 引擎会按 `Cargo.lock` 从 crates.io 获取 `rawler 0.7.2`；`third_party/rawler-0.7.2/` 是同一版本的上游原版副本，仅用于离线审计与可复现重编译，不参与构建路径。

`src/tests/desktop.mjs` 使用实际 Windows Tauri 程序与 WebView2 CDP 执行端到端验收；仅替代系统打开／保存文件对话框，图像解码、预设与导出均调用真实 Rust 后端。测试数据通过 `FILM_BASE_DATA_DIR` 隔离到验收目录，正常启动无需设置该变量。

## 许可

本项目以 **Apache-2.0** 授权，全文见 [LICENSE](LICENSE)。

`rawler`（DNG 解码／PPG 去马赛克）上游为 **LGPL-2.1**，本项目使用未修改的上游原版，并随源码分发其完整源码于 `third_party/rawler-0.7.2/`。各第三方组件许可证原文见 `licenses/`，用途与上游入口见 [THIRD_PARTY.md](THIRD_PARTY.md)。
