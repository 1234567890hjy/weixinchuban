import fs from 'fs'

const DB_FILE = '/tmp/files.json'

const ensureDataDir = () => {
  try {
    const dataDir = '/tmp'
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
  } catch (error) {
    console.error('创建目录错误:', error)
  }
}

const readDatabase = () => {
  try {
    ensureDataDir()
    
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('读取数据库错误:', error)
    return []
  }
}

const writeDatabase = (files) => {
  try {
    ensureDataDir()
    fs.writeFileSync(DB_FILE, JSON.stringify(files, null, 2))
    return { success: true }
  } catch (error) {
    console.error('写入数据库错误:', error)
    return { success: false, error: error.message }
  }
}

const getFiles = () => {
  return readDatabase()
}

const saveFile = (fileData) => {
  const files = readDatabase()
  files.push(fileData)
  return writeDatabase(files)
}

const updateFile = (fileId, updates) => {
  const files = readDatabase()
  const index = files.findIndex(f => f.id === fileId)
  
  if (index !== -1) {
    files[index] = { ...files[index], ...updates }
    return writeDatabase(files)
  }
  
  return { success: false, error: '文件不存在' }
}

const deleteFile = (fileId) => {
  const files = readDatabase()
  const filteredFiles = files.filter(f => f.id !== fileId)
  return writeDatabase(filteredFiles)
}

const deleteAllFiles = () => {
  return writeDatabase([])
}

const getFileById = (fileId) => {
  const files = readDatabase()
  return files.find(f => f.id === fileId)
}

export const handler = async (event) => {
  console.log('=== API请求开始 ===')
  console.log('请求详情:', {
    path: event.path,
    rawPath: event.rawPath,
    method: event.httpMethod,
    headers: Object.keys(event.headers)
  })

  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  }

  if (event.httpMethod === 'OPTIONS') {
    console.log('OPTIONS请求')
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  const path = event.path || event.rawPath || ''
  const method = event.httpMethod

  try {
    console.log('路由匹配:', { path, method })

    if (path === '/api/upload' && method === 'POST') {
      console.log('处理上传请求')
      return await handleUpload(event, headers)
    } else if (path === '/api/files' && method === 'GET') {
      console.log('处理获取文件列表请求')
      return await handleGetFiles(event, headers)
    } else if (path === '/api/files/delete-all' && method === 'DELETE') {
      console.log('处理删除所有文件请求')
      return await handleDeleteAll(headers)
    } else if (path === '/api/files/batch-delete' && method === 'POST') {
      console.log('处理批量删除请求')
      return await handleBatchDelete(event, headers)
    } else if (path.startsWith('/api/files/') && method === 'DELETE') {
      const parts = path.split('/')
      console.log('DELETE请求部分:', parts)
      if (parts[3] === 'delete-by-extension') {
        return await handleDeleteByExtension(parts[4], headers)
      } else if (parts[3] === 'favorite') {
        return await handleToggleFavorite(parseInt(parts[2]), headers)
      } else {
        return await handleDeleteFile(parseInt(parts[3]), headers)
      }
    } else if (path.startsWith('/api/files/') && method === 'GET') {
      const id = parseInt(path.split('/')[3])
      console.log('GET文件ID:', id)
      return await handleGetFile(id, headers)
    } else if (path.startsWith('/api/files/') && method === 'PUT') {
      const parts = path.split('/')
      console.log('PUT请求部分:', parts)
      if (parts[4] === 'favorite') {
        return await handleToggleFavorite(parseInt(parts[3]), headers)
      }
    } else {
      console.log('未找到路由:', path, method)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: '未找到请求的端点', path, method })
      }
    }
  } catch (error) {
    console.error('=== API错误 ===')
    console.error('错误信息:', error.message)
    console.error('错误堆栈:', error.stack)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '服务器错误', error: error.message, stack: error.stack })
    }
  }
}

async function handleUpload(event, headers) {
  try {
    console.log('=== 开始处理上传 ===')
    const buffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
    const contentType = event.headers['content-type'] || ''
    let files = []
    
    console.log('Content-Type:', contentType)
    console.log('Body长度:', buffer.length)
    console.log('是否Base64编码:', event.isBase64Encoded)
    
    if (contentType.includes('multipart/form-data')) {
      const boundary = contentType.split('boundary=')[1]
      console.log('Boundary:', boundary)
      const parts = buffer.toString().split(`--${boundary}`)
      console.log('Parts数量:', parts.length)
      
      let fileIdCounter = 1
      
      for (const part of parts) {
        if (part.includes('filename=')) {
          const filenameMatch = part.match(/filename="([^"]+)"/)
          if (filenameMatch) {
            let filename = filenameMatch[1]
            
            try {
              if (typeof filename === 'string' && filename.length > 0) {
                if (/[\u00e7\u00e6\u2039\u201a\u02dc\u017d\u0153\u017f\u00e4\u00b8]/.test(filename)) {
                  const buf = Buffer.from(filename, 'latin1')
                  const decoded = buf.toString('utf8')
                  if (/[\u4e00-\u9fa5]/.test(decoded)) {
                    filename = decoded
                  }
                }
              }
            } catch (error) {
              console.error('文件名解码错误:', error)
            }
            
            const fileData = {
              id: fileIdCounter++,
              filename: filename,
              size: 0,
              mimetype: 'application/octet-stream',
              uploadDate: new Date().toISOString(),
              favorite: false
            }
            
            saveFile(fileData)
            files.push(fileData)
            console.log('保存文件:', fileData)
          }
        }
      }
    }

    console.log('=== 上传完成 ===')
    console.log('文件数量:', files.length)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(files)
    }
  } catch (error) {
    console.error('=== 上传处理错误 ===')
    console.error('错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '上传失败', error: error.message })
    }
  }
}

async function handleGetFiles(event, headers) {
  try {
    console.log('=== 开始获取文件列表 ===')
    const queryStringParameters = event.queryStringParameters || {}
    const search = queryStringParameters.search
    const sortBy = queryStringParameters.sortBy
    const sortOrder = queryStringParameters.sortOrder
    const page = parseInt(queryStringParameters.page) || 1
    const limit = parseInt(queryStringParameters.limit) || 30
    
    console.log('查询参数:', { search, sortBy, sortOrder, page, limit })
    
    let filteredFiles = getFiles()
    console.log('总文件数:', filteredFiles.length)
    
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
    const endIndex = startIndex + limit
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex)
    
    console.log('返回文件数:', paginatedFiles.length)
    console.log('=== 获取文件列表完成 ===')
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        files: paginatedFiles,
        totalCount: filteredFiles.length,
        currentPage: page,
        totalPages: Math.ceil(filteredFiles.length / limit)
      })
    }
  } catch (error) {
    console.error('=== 获取文件错误 ===')
    console.error('错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '获取文件失败', error: error.message })
    }
  }
}

async function handleGetFile(id, headers) {
  try {
    console.log('获取文件ID:', id)
    const file = getFileById(id)
    
    if (!file) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: '文件不存在' })
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(file)
    }
  } catch (error) {
    console.error('获取文件错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '获取文件失败', error: error.message })
    }
  }
}

async function handleDeleteAll(headers) {
  try {
    console.log('删除所有文件')
    deleteAllFiles()
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: '所有文件已删除' })
    }
  } catch (error) {
    console.error('删除所有文件错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '删除所有文件失败', error: error.message })
    }
  }
}

async function handleDeleteByExtension(extension, headers) {
  try {
    console.log('按扩展名删除:', extension)
    const files = getFiles()
    const filesToDelete = files.filter(file => 
      file.filename.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
    )
    
    if (filesToDelete.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: `没有找到扩展名为 .${extension} 的文件` })
      }
    }
    
    for (const file of filesToDelete) {
      deleteFile(file.id)
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: `成功删除 ${filesToDelete.length} 个 .${extension} 文件` })
    }
  } catch (error) {
    console.error('按扩展名删除错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '按扩展名删除失败', error: error.message })
    }
  }
}

async function handleDeleteFile(id, headers) {
  try {
    console.log('删除文件ID:', id)
    const file = getFileById(id)
    
    if (!file) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: '文件不存在' })
      }
    }
    
    deleteFile(id)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: '文件删除成功' })
    }
  } catch (error) {
    console.error('删除文件错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '删除文件失败', error: error.message })
    }
  }
}

async function handleBatchDelete(event, headers) {
  try {
    console.log('批量删除')
    const body = JSON.parse(event.body)
    const { ids } = body
    
    if (!ids || ids.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '没有选择文件' })
      }
    }
    
    for (const id of ids) {
      deleteFile(id)
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: `成功删除 ${ids.length} 个文件` })
    }
  } catch (error) {
    console.error('批量删除错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '批量删除失败', error: error.message })
    }
  }
}

async function handleToggleFavorite(id, headers) {
  try {
    console.log('切换收藏状态:', id)
    const file = getFileById(id)
    
    if (!file) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: '文件不存在' })
      }
    }
    
    const newFavoriteStatus = !file.favorite
    updateFile(id, { favorite: newFavoriteStatus })
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: '收藏状态已更新', favorite: newFavoriteStatus })
    }
  } catch (error) {
    console.error('更新收藏状态错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '更新收藏状态失败', error: error.message })
    }
  }
}
