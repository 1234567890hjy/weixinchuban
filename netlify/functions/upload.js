import { saveFile } from '../../lib/database.js'

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
  } catch (error) {
    console.error('上传错误:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: '上传失败', error: error.message })
    }
  }
}
