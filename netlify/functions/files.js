import { getFiles } from '../../lib/database.js'

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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: '方法不允许' })
    }
  }

  try {
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
  } catch (error) {
    console.error('获取文件错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '获取文件失败', error: error.message })
    }
  }
}
