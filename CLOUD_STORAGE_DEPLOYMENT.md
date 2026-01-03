# 文件管理应用 - 云存储部署指南

本项目已集成Cloudflare R2（或AWS S3）云存储方案，支持文件持久化存储。

## 云存储配置

### 方案一：Cloudflare R2（推荐，免费）

1. **创建R2存储桶**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 R2 Object Storage
   - 创建一个新的存储桶（Bucket），例如：`file-manager-bucket`

2. **获取API凭证**
   - 在R2设置中，点击 "Manage R2 API Tokens"
   - 创建一个新的API Token
   - 记录以下信息：
     - Account ID（在URL中或仪表板右侧）
     - Access Key ID
     - Secret Access Key

3. **配置环境变量**
   
   在Vercel项目设置中添加以下环境变量：
   
   ```
   S3_REGION=auto
   S3_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com
   S3_ACCESS_KEY_ID=<your-access-key-id>
   S3_SECRET_ACCESS_KEY=<your-secret-access-key>
   S3_BUCKET_NAME=file-manager-bucket
   ```

### 方案二：AWS S3

1. **创建S3存储桶**
   - 访问 [AWS Console](https://console.aws.amazon.com/s3/)
   - 创建一个新的存储桶
   - 设置适当的权限（CORS配置）

2. **创建IAM用户**
   - 在IAM中创建新用户
   - 添加S3访问权限
   - 生成Access Key和Secret Key

3. **配置环境变量**
   
   ```
   S3_REGION=us-east-1
   S3_ENDPOINT=https://s3.amazonaws.com
   S3_ACCESS_KEY_ID=<your-access-key-id>
   S3_SECRET_ACCESS_KEY=<your-secret-access-key>
   S3_BUCKET_NAME=your-bucket-name
   ```

## 部署到Vercel

### 1. 推送代码到GitHub/Gitee

```bash
git add .
git commit -m "添加云存储支持"
git push
```

### 2. 在Vercel中部署

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "New Project"
3. 导入您的GitHub/Gitee仓库
4. 在项目设置中配置环境变量
5. 点击 "Deploy"

### 3. 配置环境变量

在Vercel项目设置中添加以下环境变量：

**必需的环境变量：**
- `S3_REGION`: 存储区域（Cloudflare R2使用`auto`）
- `S3_ENDPOINT`: 存储服务端点
- `S3_ACCESS_KEY_ID`: 访问密钥ID
- `S3_SECRET_ACCESS_KEY**: 密钥
- `S3_BUCKET_NAME`: 存储桶名称

**可选的环境变量：**
- `VITE_API_URL`: API地址（生产环境通常留空或设置为`/api`）

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入您的S3配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的Cloudflare R2或AWS S3凭证。

### 3. 启动开发服务器

```bash
npm run dev
```

前端运行在 `http://localhost:3000`

### 4. 启动后端服务器（可选）

```bash
node server/server-memory.js
```

后端运行在 `http://localhost:5001`

## 功能特性

- ✅ 文件上传到云存储
- ✅ 文件持久化存储
- ✅ 文件列表查看
- ✅ 文件搜索和排序
- ✅ 文件收藏功能
- ✅ 批量删除
- ✅ 按扩展名删除
- ✅ 中文文件名支持
- ✅ 分页显示（每页30个文件）
- ✅ 快速翻页功能

## 注意事项

1. **数据持久化**
   - 文件存储在云存储中，不会丢失
   - 文件元数据存储在JSON文件中（`data/files.json`）
   - Vercel Serverless Functions是无状态的，但数据会持久化到文件系统

2. **安全性**
   - 不要将 `.env` 文件提交到版本控制
   - 使用强密码和安全的访问密钥
   - 定期轮换访问密钥

3. **成本控制**
   - Cloudflare R2提供免费额度（10GB存储，每月1000万次读取请求）
   - AWS S3有免费层（5GB存储，每月20000次请求）
   - 监控存储使用量和请求次数

4. **CORS配置**
   - 如果使用AWS S3，需要配置CORS规则允许您的域名访问
   - Cloudflare R2通常不需要额外配置

## 故障排除

### 上传失败
- 检查环境变量是否正确配置
- 确认存储桶名称正确
- 验证访问密钥权限

### 文件无法访问
- 检查存储桶权限设置
- 确认CORS配置正确
- 查看Vercel函数日志

### 数据丢失
- 文件存储在云存储中，不会丢失
- 元数据存储在`data/files.json`中
- 定期备份元数据文件

## 技术栈

- **前端**: React + Vite
- **后端**: Express.js (Vercel Serverless Functions)
- **存储**: Cloudflare R2 / AWS S3
- **部署**: Vercel

## 许可证

MIT
