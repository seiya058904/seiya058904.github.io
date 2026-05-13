# my-personal-website

一个简洁、现代、响应式的个人网站模板，适合学生用于展示个人介绍、学习方向、项目作品、技能和联系方式。

## 1. 项目介绍

这个项目使用纯前端技术构建：
- HTML（网页结构）
- CSS（页面样式）
- JavaScript（基础交互）

特点：
- 无后端、无数据库、无登录系统
- 可直接部署到 GitHub Pages
- 支持手机、平板、电脑浏览

## 2. 文件结构说明

```text
my-personal-website/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── assets/
│   └── README.txt
└── README.md
```

各文件作用：
- `index.html`：网页主结构（导航、首页、关于我、技能、项目、路线、联系方式、页脚）
- `css/style.css`：全部样式（布局、颜色、响应式、动画、背景效果）
- `js/main.js`：交互逻辑（手机菜单、返回顶部）
- `assets/README.txt`：资源文件夹说明
- `README.md`：项目说明与部署教程

## 3. 如何本地预览

方法 A（最简单）：
1. 打开项目文件夹。
2. 双击 `index.html`。
3. 浏览器会直接打开页面。

方法 B（推荐，适合后续学习）：
1. 安装 VS Code。
2. 安装插件 **Live Server**。
3. 在 VS Code 中打开项目文件夹。
4. 右键 `index.html`，点击 `Open with Live Server`。

## 4. 如何上传到 GitHub

### 第一步：注册 GitHub
1. 访问 [GitHub 官网](https://github.com/)。
2. 注册账号并登录。

### 第二步：新建仓库（Repository）
1. 点击右上角 `+`，选择 `New repository`。
2. 仓库名建议：
   - 个人主页主域名方式：`your-username.github.io`
   - 或普通项目名：`my-personal-website`
3. 选择 `Public`（公开）。
4. 点击 `Create repository`。

### 第三步：上传文件
1. 进入新建的仓库页面。
2. 点击 `Add file` → `Upload files`。
3. 把 `my-personal-website` 里的所有文件和文件夹上传。
4. 填写提交说明（Commit message），例如：`init personal website`。
5. 点击 `Commit changes`。

## 5. 如何开启 GitHub Pages

1. 进入仓库页面。
2. 点击 `Settings`。
3. 左侧找到 `Pages`。
4. 在 `Build and deployment` 或 `Source` 区域设置：
   - Branch 选择 `main`
   - Folder 选择 `/ (root)`
5. 点击 `Save`。
6. 等待 1~5 分钟，GitHub 会生成可访问网址。

## 6. 网址格式说明

如果仓库名是：
- `your-username.github.io`

通常网址是：
- `https://your-username.github.io`

如果仓库名是普通项目名，例如：
- `my-personal-website`

通常网址是：
- `https://your-username.github.io/my-personal-website/`

## 7. 常见问题排查

### 问题 1：打开是 404
- 检查仓库是否为 `Public`。
- 检查 GitHub Pages 是否已启用并选择了 `main` 分支。
- 刚开启后可能需要几分钟，稍后刷新。

### 问题 2：CSS 没加载（页面像纯文字）
- 检查 `index.html` 中 CSS 路径是否为相对路径：`./css/style.css`。
- 检查文件名大小写是否一致（GitHub 区分大小写）。

### 问题 3：图片不显示
- 确认图片已上传到 `assets/`。
- 确认路径正确，例如：`./assets/your-image.png`。

### 问题 4：首页打不开
- 首页文件必须叫 `index.html`，不能写成 `Index.html` 或其他名字。

### 问题 5：GitHub Pages 页面没更新
- 强制刷新浏览器（`Ctrl + F5`）。
- 等待几分钟后再刷新。

## 8. 后续你可以怎么改

- 修改 `index.html` 里的文字，替换成你的真实介绍。
- 修改 `js/main.js`，添加更多轻量交互。
- 在 `assets/` 放头像、项目截图并更新到页面。
- 把占位链接（Email、GitHub）替换成你的真实信息。

## 9. 图片来源说明

本项目部分背景氛围图来自公开图库（用于学习和展示）：

- Unsplash: [https://unsplash.com/photos/bp2TuVlTydc](https://unsplash.com/photos/bp2TuVlTydc)
- Wallhaven: [https://wallhaven.cc/w/nm8k90](https://wallhaven.cc/w/nm8k90)
