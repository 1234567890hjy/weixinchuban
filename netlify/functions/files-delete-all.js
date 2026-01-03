import { getFiles, deleteFile, deleteAllFiles } from './database.js'

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

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: '方法不允许' })
    }
  }

  try {
    const files = getFiles()
    
    for (const file of files) {
      deleteFile(file.id)
    }
    
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
