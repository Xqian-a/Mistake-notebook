# 错题本 (Mistake-notebook) 📝

一个基于 React Native (Expo) 开发的移动端错题记录 App，支持拍照上传、框选裁剪、按科目分类管理。

## 功能特性

### 📸 拍照记录错题
- 调用系统相机拍照或从相册选择图片
- 拍照后可进行**框选裁剪**，精准截取错题部分
- 拖拽四角调整裁剪区域，拖拽中部移动位置

### 📂 科目分类管理
- 内置默认科目：数学、计算机、英语、政治
- **所有科目均可自由重命名、添加、删除**
- 首页按科目卡片展示，清晰直观
- 各科目内部错题**按日期分组排序**

### 🗄️ 纯本地存储
- 所有图片和元数据保存在设备本地
- 无需网络连接，无需注册登录
- 数据安全，不会上传至任何服务器

### 👆 便捷操作
- 首页显示各科目错题数量
- 长按错题卡片快速删除
- 点击错题卡片全屏预览
- 底部浮动按钮快速添加错题

## 技术栈

| 技术 | 用途 |
|------|------|
| **React Native** | 跨平台移动框架 |
| **Expo SDK 52** | 开发工具链与原生模块 |
| **TypeScript** | 类型安全 |
| **React Navigation** | 页面路由导航 |
| **expo-camera** | 相机拍照 |
| **expo-image-picker** | 相册选择 |
| **expo-image-manipulator** | 图片裁剪 |
| **AsyncStorage** | 元数据持久化 |
| **expo-file-system** | 图片文件存储 |

## 项目结构

```
cuotiben/
├── App.tsx                    # 入口 + 导航配置
├── app.json                   # Expo 配置
├── eas.json                   # EAS Build 配置
├── src/
│   ├── types/index.ts         # 类型定义
│   ├── utils/
│   │   ├── subjectManager.ts  # 科目 CRUD 管理
│   │   ├── subjects.ts        # 颜色/图标调色板
│   │   └── storage.ts         # 错题数据存储
│   └── screens/
│       ├── HomeScreen.tsx         # 首页 - 科目卡片
│       ├── ManageSubjectsScreen.tsx # 科目管理
│       ├── SubjectScreen.tsx      # 错题列表
│       ├── CameraScreen.tsx       # 拍照/相册
│       └── CropScreen.tsx         # 框选裁剪
└── assets/
    └── icon.png               # 应用图标
```

## 快速开始

### 前置要求
- Node.js 18+
- npm 或 yarn
- 手机安装 [Expo Go](https://expo.dev/client)

### 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npx expo start

# 3. 用 Expo Go 扫码运行
```

### 构建 APK

使用 EAS Build 云构建：

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
npx eas login

# 构建 Android APK
npx eas build --platform android --profile preview
```

## 自定义科目

所有科目均支持自由管理：

1. 首页点击右上角「**管理**」
2. 点击「**重命名**」修改科目名称
3. 点击「**+ 添加新科目**」创建自定义科目
4. 点击「**删除**」移除科目（错题记录同步清理）

## 截图

| 首页 | 错题列表 | 裁剪页面 |
|------|---------|---------|
| 4科目卡片选择 | 按日期分组展示 | 框选裁剪 |

*（截图待补充）*

## 开发计划

- [x] 基本拍照 + 裁剪功能
- [x] 4大科目分类
- [x] 自定义科目管理
- [x] 日期分组排序
- [ ] 图片标注/涂鸦
- [ ] OCR 文字识别
- [ ] 数据导出/备份
- [ ] 夜间模式

## License

MIT
