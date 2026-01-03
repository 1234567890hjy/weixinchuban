# Netlify 部署指南

本项目已配置为在Netlify上部署，支持文件上传功能。

## 部署步骤

### 方法一：通过Git仓库部署（推荐）

1. **推送代码到GitHub/Gitee**
   ```bash
   git add .
   git commit -m "添加Netlify Functions支持"
   git push
   ```

2. **在Netlify中导入项目**
   - 访问 [app.netlify.com](https://app.netlify.com)
   - 点击 "Add new site" -> "Import an existing project"
   - 选择您的GitHub/Gitee仓库
   - Netlify会自动检测到 `netlify.toml` 配置文件

3. **构建配置**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - 点击 "Deploy site"

### 方法二：通过Netlify CLI部署

1. **安装Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **登录Netlify**
   ```bash
   netlify login
   ```

3. **部署项目**
   ```bash
   netlify deploy --prod
   ```

## 项目结构

```
微信公众号/
├── netlify/
│   └── functions/          # Netlify Functions
│       ├── upload.js         # 上传文件
│       ├── files.js         # 获取文件列表
│       ├── files-id.js      # 获取/删除单个文件
│       ├── files-delete-all.js
│       ├── files-delete-by-extension.js
│       ├── files-batch-delete.js
│       └── files-id-favorite.js
├── lib/
│   ├── database.js         # 数据库操作
│   └── s3.js             # S3存储（可选）
├── src/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── netlify.toml            # Netlify配置
├── package.json
└── vite.config.js
```

## API端点

部署后，以下API端点将可用：

- `POST /api/upload` - 上传文件
- `GET /api/files` - 获取文件列表
- `GET /api/files/:id` - 获取单个文件
- `DELETE /api/files/:id` - 删除文件
- `DELETE /api/files/delete-all` - 删除所有文件
- `DELETE /api/files/delete-by-extension/:extension` - 按扩展名删除
- `POST /api/files/batch-delete` - 批量删除
- `PUT /api/files/:id/favorite` - 切换收藏状态

## 重要说明

### 数据持久化

Netlify Functions是无状态的，每次请求都会重新初始化。这意味着：
- 文件元数据存储在内存中，函数冷启动后会重置
- **建议使用外部数据库**来持久化存储文件元数据

### 推荐的持久化方案

1. **使用MongoDB Atlas（免费）**
   - 注册 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - 创建免费集群
   - 获取连接字符串
   - 在Netlify环境变量中添加 `MONGODB_URI`

2. **使用Redis（免费）**
   - 使用 [Redis Cloud](https://redis.com/try-free/)
   - 获取连接信息
   - 在Netlify环境变量中添加 `REDIS_URL`

3. **使用云存储**
   - Cloudflare R2（免费10GB）
   - AWS S3（免费层）
   - 阿里云OSS

## 环境变量

在Netlify项目设置中添加以下环境变量（可选）：

```
# MongoDB连接（如果使用MongoDB）
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>

# Redis连接（如果使用Redis）
REDIS_URL=redis://<username>:<password>@<host>:<port>

# S3存储（如果使用云存储）
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<access-key>
S3_SECRET_ACCESS_KEY=<secret-key>
S3_BUCKET_NAME=<bucket-name>
```

## 故障排除

### 404错误

如果遇到404错误：

1. **检查netlify.toml配置**
   - 确保redirects配置正确
   - 确保functions目录路径正确

2. **检查Functions是否部署**
   - 在Netlify Dashboard中查看Functions标签
   - 确认所有函数都已部署

3. **查看函数日志**
   - 在Netlify Dashboard中查看函数日志
   - 检查是否有错误信息

### CORS错误

如果遇到CORS错误：

1. **检查响应头**
   - 所有函数都设置了CORS头
   - 确保浏览器允许跨域请求

2. **检查API URL**
   - 前端使用 `/api` 作为API基础URL
   - 确保环境变量 `VITE_API_URL` 设置正确

### 文件上传失败

如果文件上传失败：

1. **检查文件大小**
   - Netlify Functions有请求体大小限制
   - 默认限制为6MB

2. **检查请求格式**
   - 确保使用 `multipart/form-data` 格式
   - 确保字段名为 `files`

3. **查看函数日志**
   - 在Netlify Dashboard中查看详细错误信息

## 本地测试

在部署前，您可以在本地测试：

```bash
# 安装Netlify CLI
npm install -g netlify-cli

# 启动本地开发服务器
netlify dev
```

这将在本地启动Netlify开发服务器，包括Functions。

## 更新部署

修改代码后：

```bash
git add .
git commit -m "更新功能"
git push
```

Netlify会自动检测到Git推送并重新部署。

## 性能优化

1. **启用缓存**
   - 使用CDN缓存静态资源
   - 配置适当的缓存头

2. **优化图片**
   - 压缩图片
   - 使用WebP格式

3. **代码分割**
   - Vite已自动配置代码分割
   - 按需加载组件

## 安全建议

1. **环境变量**
   - 不要在代码中硬编码密钥
   - 使用Netlify环境变量

2. **输入验证**
   - 验证所有用户输入
   - 防止注入攻击

3. **速率限制**
   - 实施API速率限制
   - 防止滥用

## 许可证

MIT
