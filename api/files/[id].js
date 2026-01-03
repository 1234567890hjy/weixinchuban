import { getFileById, deleteFile } from '../lib/database.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const id = parseInt(url.pathname.split('/').pop())

  try {
    if (req.method === 'GET') {
      const file = getFileById(id)
      
      if (!file) {
        return res.status(404).json({ message: '文件不存在' })
      }
      
      res.json(file)
    } else if (req.method === 'DELETE') {
      const file = getFileById(id)
      
      if (!file) {
        return res.status(404).json({ message: '文件不存在' })
      }
      
      deleteFile(id)
      res.json({ message: '文件删除成功' })
    } else {
      res.status(405).json({ message: '方法不允许' })
    }
  } catch (error) {
    console.error('API错误:', error)
    res.status(500).json({ message: '服务器错误', error: error.message })
  }
}
