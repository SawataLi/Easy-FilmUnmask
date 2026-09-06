# 第三方组件

本项目使用下列开源组件。版本以随附 Cargo.lock、package-lock.json 和 uv.lock 为准。

| 组件 | 用途 | 上游许可证 |
| --- | --- | --- |
| rawler 0.7.2 / dnglab | DNG 解码、PPG 去马赛克 | LGPL-2.1 |
| Tauri 2 | Windows 桌面容器与 IPC | MIT / Apache-2.0 |
| React | 前端组件 | MIT |
| Lucide | 界面线性图标 | ISC |
| image / tiff | 图像编码与解码 | MIT / Apache-2.0 |
| Rayon | CPU 并行处理 | MIT / Apache-2.0 |
| Pillow / LittleCMS | 开发阶段生成应用资源与 ICC | HPND / MIT |

第三方许可证原文在 `licenses/`。rawler 使用上游原版，没有修改；其完整源码随源码包放在 `third_party/rawler-0.7.2/`，可配合项目源代码、Cargo 清单及锁文件重新编译。其他依赖的上游入口与校验值见对应锁文件。

应用图标由 `tools/assetgen/generate.py` 绘制，sRGB ICC 由 LittleCMS 的标准 sRGB 配置生成。未使用网络字体或外部图片素材。用户提供的 DNG 不包含在安装包中。
