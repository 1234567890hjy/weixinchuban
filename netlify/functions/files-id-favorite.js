import { getFileById, updateFile } from './database.js'

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

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: '方法不允许' })
    }
  }

  try {
    const pathParts = event.path.split('/')
    const id = parseInt(pathParts[pathParts.length - 2])
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
