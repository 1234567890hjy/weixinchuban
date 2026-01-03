import { getFiles, deleteFile } from './database.js'

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
    const pathParts = event.path.split('/')
    const extension = pathParts[pathParts.length - 1]
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
