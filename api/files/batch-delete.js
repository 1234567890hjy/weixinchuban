import { getFiles, deleteFile } from '../lib/database.js'

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
    const body = await req.json()
    const { ids } = body
    
    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: '没有选择文件' })
    }
    
    for (const id of ids) {
      deleteFile(id)
    }
    
    res.json({ message: `成功删除 ${ids.length} 个文件` })
  } catch (error) {
    console.error('批量删除错误:', error)
    res.status(500).json({ message: '批量删除失败', error: error.message })
  }
}
