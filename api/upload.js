import { saveFile } from '../lib/database.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允许' })
  }

  try {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    
    const contentType = req.headers['content-type'] || ''
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

    res.status(200).json(files)
  } catch (error) {
    console.error('上传错误:', error)
    res.status(500).json({ message: '上传失败', error: error.message })
  }
}
