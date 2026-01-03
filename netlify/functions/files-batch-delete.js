import { getFiles, deleteFile } from '../../lib/database.js'

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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: '方法不允许' })
    }
  }

  try {
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
