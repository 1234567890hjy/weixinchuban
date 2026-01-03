import express from 'express'
import multer from 'multer'
import path from 'path'
import cors from 'cors'
import { uploadFileToS3, deleteFileFromS3, getSignedFileUrl } from '../lib/s3.js'
import { getFiles, saveFile, updateFile, deleteFile, deleteAllFiles, getFileById } from '../lib/database.js'

const app = express()

app.use(cors())
app.use(express.json())

const storage = multer.memoryStorage()
const upload = multer({ storage })

let fileIdCounter = 1

app.post('/api/upload', upload.array('files'), async (req, res) => {
  console.log('收到上传请求')
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '没有上传文件' })
    }

    const uploadedFiles = []
    
    for (const file of req.files) {
      let filename = file.originalname
      
      try {
        if (typeof filename === 'string' && filename.length > 0) {
          if (/[\u00e7\u00e6\u2039\u201a\u02dc\u017d\u0153\u017f\u00e4\u00b8]/.test(filename)) {
            const buffer = Buffer.from(filename, 'latin1')
            const decoded = buffer.toString('utf8')
            if (/[\u4e00-\u9fa5]/.test(decoded)) {
              filename = decoded
            }
          }
        }
      } catch (error) {
        console.error('文件名解码错误:', error)
      }
      
      const uniqueSuffix = Date.now()
      const s3Key = `${uniqueSuffix}-${filename}`
      
      const uploadResult = await uploadFileToS3(s3Key, file.buffer, file.mimetype)
      
      if (!uploadResult.success) {
        console.error('上传到S3失败:', uploadResult.error)
        continue
      }
      
      const fileData = {
        id: fileIdCounter++,
        filename: filename,
        s3Key: s3Key,
        size: file.size,
        mimetype: file.mimetype,
        uploadDate: new Date().toISOString(),
        favorite: false
      }
      
      saveFile(fileData)
      uploadedFiles.push(fileData)
    }

    console.log('上传成功，返回文件:', uploadedFiles)
    res.status(200).json(uploadedFiles)
  } catch (error) {
    console.error('上传错误:', error)
    res.status(500).json({ message: '上传失败', error: error.message })
  }
})

app.get('/api/files', (req, res) => {
  try {
    const { search, sortBy, sortOrder, page = 1, limit = 30 } = req.query
    
    let filteredFiles = getFiles()
    
    if (search) {
      filteredFiles = filteredFiles.filter(file =>
        file.filename.toLowerCase().includes(search.toLowerCase())
      )
    }
    
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

app.get('/api/files/:id', async (req, res) => {
  try {
    const file = getFileById(parseInt(req.params.id))
    
    if (!file) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    const signedUrl = await getSignedFileUrl(file.s3Key, 3600)
    
    res.redirect(signedUrl)
  } catch (error) {
    console.error('获取文件错误:', error)
    res.status(500).json({ message: '获取文件失败', error: error.message })
  }
})

app.delete('/api/files/delete-all', async (req, res) => {
  try {
    const files = getFiles()
    
    for (const file of files) {
      await deleteFileFromS3(file.s3Key)
    }
    
    deleteAllFiles()
    
    res.json({ message: '所有文件已删除' })
  } catch (error) {
    console.error('删除所有文件错误:', error)
    res.status(500).json({ message: '删除所有文件失败', error: error.message })
  }
})

app.delete('/api/files/delete-by-extension/:extension', async (req, res) => {
  try {
    const { extension } = req.params
    const files = getFiles()
    const filesToDelete = files.filter(file => 
      path.extname(file.filename).toLowerCase() === `.${extension.toLowerCase()}`
    )
    
    if (filesToDelete.length === 0) {
      return res.status(404).json({ message: `没有找到扩展名为 .${extension} 的文件` })
    }
    
    for (const file of filesToDelete) {
      await deleteFileFromS3(file.s3Key)
      deleteFile(file.id)
    }
    
    res.json({ message: `成功删除 ${filesToDelete.length} 个 .${extension} 文件` })
  } catch (error) {
    console.error('按扩展名删除错误:', error)
    res.status(500).json({ message: '按扩展名删除失败', error: error.message })
  }
})

app.delete('/api/files/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id)
    const file = getFileById(fileId)
    
    if (!file) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    await deleteFileFromS3(file.s3Key)
    deleteFile(fileId)
    
    res.json({ message: '文件删除成功' })
  } catch (error) {
    console.error('删除文件错误:', error)
    res.status(500).json({ message: '删除文件失败', error: error.message })
  }
})

app.post('/api/files/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body
    
    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: '没有选择文件' })
    }
    
    let deletedCount = 0
    
    for (const id of ids) {
      const file = getFileById(parseInt(id))
      
      if (file) {
        await deleteFileFromS3(file.s3Key)
        deleteFile(file.id)
        deletedCount++
      }
    }
    
    res.json({ message: `成功删除 ${deletedCount} 个文件` })
  } catch (error) {
    console.error('批量删除错误:', error)
    res.status(500).json({ message: '批量删除失败', error: error.message })
  }
})

app.put('/api/files/:id/favorite', (req, res) => {
  try {
    const fileId = parseInt(req.params.id)
    const file = getFileById(fileId)
    
    if (!file) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    const newFavoriteStatus = !file.favorite
    updateFile(fileId, { favorite: newFavoriteStatus })
    
    res.json({ message: '收藏状态已更新', favorite: newFavoriteStatus })
  } catch (error) {
    console.error('更新收藏状态错误:', error)
    res.status(500).json({ message: '更新收藏状态失败', error: error.message })
  }
})

export default app
