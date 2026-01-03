import { getFiles, saveFile, updateFile, deleteFile, deleteAllFiles, getFileById } from './database.js'

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  const path = event.path
  const method = event.httpMethod

  try {
    if (path === '/api/upload' && method === 'POST') {
      return await handleUpload(event, headers)
    } else if (path === '/api/files' && method === 'GET') {
      return await handleGetFiles(event, headers)
    } else if (path === '/api/files/delete-all' && method === 'DELETE') {
      return await handleDeleteAll(headers)
    } else if (path === '/api/files/batch-delete' && method === 'POST') {
      return await handleBatchDelete(event, headers)
    } else if (path.startsWith('/api/files/') && method === 'DELETE') {
      const parts = path.split('/')
      if (parts[3] === 'delete-by-extension') {
        return await handleDeleteByExtension(parts[4], headers)
      } else if (parts[3] === 'favorite') {
        return await handleToggleFavorite(parseInt(parts[2]), headers)
      } else {
        return await handleDeleteFile(parseInt(parts[3]), headers)
      }
    } else if (path.startsWith('/api/files/') && method === 'GET') {
      const id = parseInt(path.split('/')[3])
      return await handleGetFile(id, headers)
    } else if (path.startsWith('/api/files/') && method === 'PUT') {
      const parts = path.split('/')
      if (parts[4] === 'favorite') {
        return await handleToggleFavorite(parseInt(parts[3]), headers)
      }
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: '未找到请求的端点' })
      }
    }
  } catch (error) {
    console.error('API错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '服务器错误', error: error.message })
    }
  }
}

async function handleUpload(event, headers) {
  const buffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
  const contentType = event.headers['content-type'] || ''
  let files = []
  
  if (contentType.includes('multipart/form-data')) {
    const boundary = contentType.split('boundary=')[1]
    const parts = buffer.toString().split(`--${boundary}`)
    
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
        }
      }
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(files)
  }
}

async function handleGetFiles(event, headers) {
  const queryStringParameters = event.queryStringParameters || {}
  const search = queryStringParameters.search
  const sortBy = queryStringParameters.sortBy
  const sortOrder = queryStringParameters.sortOrder
  const page = parseInt(queryStringParameters.page) || 1
  const limit = parseInt(queryStringParameters.limit) || 30
  
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
  const endIndex = startIndex + limit
  const paginatedFiles = filteredFiles.slice(startIndex, endIndex)
  
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
}

async function handleGetFile(id, headers) {
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
}

async function handleDeleteAll(headers) {
  deleteAllFiles()
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: '所有文件已删除' })
  }
}

async function handleDeleteByExtension(extension, headers) {
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
}

async function handleDeleteFile(id, headers) {
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
}

async function handleBatchDelete(event, headers) {
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
}

async function handleToggleFavorite(id, headers) {
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
}
