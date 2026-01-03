import { getFiles, deleteFile, deleteAllFiles } from '../lib/database.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: '方法不允许' })
  }

  try {
    const files = getFiles()
    
    for (const file of files) {
      deleteFile(file.id)
    }
    
    deleteAllFiles()
    res.json({ message: '所有文件已删除' })
  } catch (error) {
    console.error('删除所有文件错误:', error)
    res.status(500).json({ message: '删除所有文件失败', error: error.message })
  }
}
