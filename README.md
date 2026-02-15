# Bilibili Raindrop 收藏标记

这是一个油猴脚本，用于在 bilibili 收藏夹页面标记已收藏到 Raindrop 的视频。

## 功能

- 自动检测 bilibili 收藏夹中的视频
- 对比 Raindrop 中的收藏
- 在已收藏的视频右上角显示蓝色对勾 ✓

## 安装步骤

### 1. 安装油猴插件

首先需要安装浏览器扩展：
- Chrome/Edge: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- Firefox: [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- Safari: [Tampermonkey](https://apps.apple.com/app/tampermonkey/id1482490089)

### 2. 安装脚本

1. 点击油猴图标 → 管理面板
2. 点击 "+" 号创建新脚本
3. 将 `bilibili-raindrop-marker.user.js` 的内容复制粘贴进去
4. 保存（Ctrl+S 或 Cmd+S）

### 3. 获取 Raindrop API Token

1. 访问 [Raindrop 设置页面](https://app.raindrop.io/settings/integrations)
2. 找到 "For Developers" 部分
3. 点击 "Create new app"
4. 创建后会得到一个 "Test token"，复制这个 token

### 4. 配置 Token

1. 打开任意 bilibili 收藏夹页面
2. 按 F12 打开浏览器控制台
3. 在控制台中输入以下命令（替换成你的 token）：

```javascript
GM_setValue("raindrop_token", "你的_Raindrop_Token")
```

4. 刷新页面

## 使用方法

1. 打开你的 bilibili 收藏夹页面：
   - `https://space.bilibili.com/你的ID/favlist`
   - 或 `https://www.bilibili.com/medialist/`

2. 脚本会自动运行，已收藏到 Raindrop 的视频右上角会显示蓝色对勾

## 工作原理

1. 脚本通过 Raindrop API 获取你所有包含 bilibili.com 的收藏
2. 支持分页获取，每页 50 条，自动获取所有页面的数据
3. 提取每个收藏中的 BV 号（bilibili 视频唯一标识）
4. 在页面上查找所有视频卡片
5. 对比 BV 号，为匹配的视频添加蓝色对勾标记
6. 使用 MutationObserver 监听页面变化，自动标记动态加载的内容

## 故障排除

### 没有显示对勾

1. 检查是否正确配置了 Raindrop Token
2. 打开浏览器控制台（F12），查看是否有错误信息
3. 查看控制台日志，应该能看到类似以下信息：
   - `[Bilibili-Raindrop] 开始获取 Raindrop 收藏...`
   - `[Bilibili-Raindrop] 成功获取 X 个 bilibili 视频`
   - `[Bilibili-Raindrop] 找到 X 个视频卡片`
   - `[Bilibili-Raindrop] 标记视频: BVxxxxxxxx`
4. 确认 Raindrop 中确实收藏了该视频（URL 中包含完整的 BV 号）

### Token 配置失败

- 确保 token 用引号包裹
- 确保没有多余的空格
- 可以在控制台输入 `GM_getValue("raindrop_token")` 检查是否配置成功

### 页面样式问题

如果对勾位置不对，可能是 bilibili 更新了页面结构。可以修改脚本中的 CSS 选择器。

当前脚本支持的页面结构：
- 视频卡片：`.items__item`
- 封面容器：`.bili-video-card__cover`
- 视频链接：`a.bili-cover-card`

## 技术细节

- 使用 GM_xmlhttpRequest 跨域请求 Raindrop API
- 支持分页获取，每页 50 条记录，并行请求所有页面以提高速度
- 使用 MutationObserver 监听 DOM 变化
- 通过 BV 号匹配视频（bilibili 视频的唯一标识）
- 支持多种 bilibili 收藏夹页面格式

## 许可

MIT License
