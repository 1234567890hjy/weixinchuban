import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors())
app.use(express.json())

// 内存存储文件数据
let files = []
let fileIdCounter = 1

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 启动时从文件系统加载文件
const loadFilesFromFileSystem = () => {
  try {
    const uploadedFiles = fs.readdirSync(uploadDir)
    uploadedFiles.forEach(filename => {
      const filePath = path.join(uploadDir, filename)
      const stats = fs.statSync(filePath)
      
      // 从文件名中提取原始文件名（去掉时间戳前缀）
      // 文件名格式：时间戳-原始文件名
      let originalFilename = filename
      const match = filename.match(/^\d+-(.+)$/)
      if (match) {
        originalFilename = match[1]
      }
      
      const fileData = {
        id: fileIdCounter++,
        filename: originalFilename,
        path: filePath,
        size: stats.size,
        mimetype: 'application/octet-stream',
        uploadDate: stats.mtime,
        favorite: false
      }
      files.push(fileData)
    })
    console.log(`从文件系统加载了 ${files.length} 个文件`)
  } catch (error) {
    console.error('从文件系统加载文件错误:', error)
  }
}

loadFilesFromFileSystem()

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now()
    let filename = file.originalname
    
    console.log('原始文件名:', filename)
    console.log('文件名类型:', typeof filename)
    console.log('文件名长度:', filename.length)
    
    // 处理文件名编码问题（Windows系统常见问题）
    try {
      if (typeof filename === 'string' && filename.length > 0) {
        // 检查是否包含乱码字符（如 ç, æ, ‹, ‚, ˜, Ž, œ, Ÿ, ä, ¸）
        if (/[\u00e7\u00e6\u2039\u201a\u02dc\u017d\u0153\u017f\u00e4\u00b8]/.test(filename)) {
          console.log('检测到乱码，尝试解码')
          // 将Latin1编码的字符串转换为Buffer，然后用UTF-8解码
          const buffer = Buffer.from(filename, 'latin1')
          const decoded = buffer.toString('utf8')
          console.log('解码后的文件名:', decoded)
          
          // 检查解码后的字符串是否包含中文字符
          if (/[\u4e00-\u9fa5]/.test(decoded)) {
            console.log('使用解码后的文件名')
            filename = decoded
          }
        } else {
          console.log('文件名正常，无需解码')
        }
      }
    } catch (error) {
      console.error('文件名解码错误:', error)
    }
    
    const finalFilename = uniqueSuffix + '-' + filename
    console.log('最终文件名:', finalFilename)
    cb(null, finalFilename)
  }
})

const upload = multer({ storage })

// API路由

// 上传文件
app.post('/api/upload', upload.array('files'), (req, res) => {
  console.log('收到上传请求')
  console.log('请求文件:', req.files)
  console.log('请求体:', req.body)
  
  try {
    if (!req.files || req.files.length === 0) {
      console.log('没有上传文件')
      return res.status(400).json({ message: '没有上传文件' })
    }

    const uploadedFiles = req.files.map(file => {
      const fileData = {
        id: fileIdCounter++,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        uploadDate: new Date(),
        favorite: false
      }
      files.push(fileData)
      console.log('添加文件:', fileData)
      return fileData
    })

    console.log('上传成功，返回文件:', uploadedFiles)
    res.status(200).json(uploadedFiles)
  } catch (error) {
    console.error('上传错误:', error)
    res.status(500).json({ message: '上传失败', error: error.message })
  }
})

// 获取所有文件
app.get('/api/files', (req, res) => {
  try {
    const { search, sortBy, sortOrder, page = 1, limit = 30 } = req.query
    
    let filteredFiles = [...files]
    
    // 搜索过滤
    if (search) {
      filteredFiles = filteredFiles.filter(file =>
        file.filename.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    // 排序
    if (sortBy) {
      filteredFiles.sort((a, b) => {
        let aValue = a[sortBy]
        let bValue = b[sortBy]
        
        if (sortBy === 'uploadDate') {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
    }
    
    // 分页
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + parseInt(limit)
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex)
    
    res.json({
      files: paginatedFiles,
      totalCount: filteredFiles.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredFiles.length / limit)
    })
  } catch (error) {
    console.error('获取文件错误:', error)
    res.status(500).json({ message: '获取文件失败', error: error.message })
  }
})

// 获取单个文件
app.get('/api/files/:id', (req, res) => {
  try {
    const file = files.find(f => f.id === parseInt(req.params.id))
    
    if (!file) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    res.sendFile(path.resolve(file.path))
  } catch (error) {
    console.error('获取文件错误:', error)
    res.status(500).json({ message: '获取文件失败', error: error.message })
  }
})

// 删除所有文件（必须放在删除单个文件之前）
app.delete('/api/files/delete-all', (req, res) => {
  try {
    // 从文件系统删除所有文件
    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
    })
    
    // 清空内存中的文件记录
    files = []
    
    res.json({ message: '所有文件已删除' })
  } catch (error) {
    console.error('删除所有文件错误:', error)
    res.status(500).json({ message: '删除所有文件失败', error: error.message })
  }
})

// 按扩展名删除文件（必须放在删除单个文件之前）
app.delete('/api/files/delete-by-extension/:extension', (req, res) => {
  try {
    const { extension } = req.params
    const filesToDelete = files.filter(file => 
      path.extname(file.filename).toLowerCase() === `.${extension.toLowerCase()}`
    )
    
    if (filesToDelete.length === 0) {
      return res.status(404).json({ message: `没有找到扩展名为 .${extension} 的文件` })
    }
    
    // 从文件系统删除文件
    filesToDelete.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
    })
    
    // 从内存中删除文件记录
    files = files.filter(file => 
      path.extname(file.filename).toLowerCase() !== `.${extension.toLowerCase()}`
    )
    
    res.json({ message: `成功删除 ${filesToDelete.length} 个 .${extension} 文件` })
  } catch (error) {
    console.error('按扩展名删除错误:', error)
    res.status(500).json({ message: '按扩展名删除失败', error: error.message })
  }
})

// 删除文件
app.delete('/api/files/:id', (req, res) => {
  try {
    const fileId = parseInt(req.params.id)
    const fileIndex = files.findIndex(f => f.id === fileId)
    
    if (fileIndex === -1) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    const file = files[fileIndex]
    
    // 从文件系统删除文件
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path)
    }
    
    // 从内存中删除文件记录
    files.splice(fileIndex, 1)
    
    res.json({ message: '文件删除成功' })
  } catch (error) {
    console.error('删除文件错误:', error)
    res.status(500).json({ message: '删除文件失败', error: error.message })
  }
})

// 批量删除文件
app.post('/api/files/batch-delete', (req, res) => {
  try {
    const { ids } = req.body
    
    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: '没有选择文件' })
    }
    
    let deletedCount = 0
    
    ids.forEach(id => {
      const fileIndex = files.findIndex(f => f.id === parseInt(id))
      
      if (fileIndex !== -1) {
        const file = files[fileIndex]
        
        // 从文件系统删除文件
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
        }
        
        // 从内存中删除文件记录
        files.splice(fileIndex, 1)
        deletedCount++
      }
    })
    
    res.json({ message: `成功删除 ${deletedCount} 个文件` })
  } catch (error) {
    console.error('批量删除错误:', error)
    res.status(500).json({ message: '批量删除失败', error: error.message })
  }
})

// 切换收藏状态
app.put('/api/files/:id/favorite', (req, res) => {
  try {
    const file = files.find(f => f.id === parseInt(req.params.id))
    
    if (!file) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    file.favorite = !file.favorite
    
    res.json({ message: '收藏状态已更新', favorite: file.favorite })
  } catch (error) {
    console.error('更新收藏状态错误:', error)
    res.status(500).json({ message: '更新收藏状态失败', error: error.message })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log('Using file system storage instead of MongoDB')
})