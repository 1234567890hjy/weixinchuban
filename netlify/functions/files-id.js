import { getFileById, deleteFile } from '../../lib/database.js'

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

  const pathParts = event.path.split('/')
  const id = parseInt(pathParts[pathParts.length - 1])

  try {
    if (event.httpMethod === 'GET') {
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
    } else if (event.httpMethod === 'DELETE') {
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
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: '方法不允许' })
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
