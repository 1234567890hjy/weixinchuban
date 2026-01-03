import { getFileById, updateFile } from '../lib/database.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ message: '方法不允许' })
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const id = parseInt(url.pathname.split('/')[3])
    const file = getFileById(id)
    
    if (!file) {
      return res.status(404).json({ message: '文件不存在' })
    }
    
    const newFavoriteStatus = !file.favorite
    updateFile(id, { favorite: newFavoriteStatus })
    
    res.json({ message: '收藏状态已更新', favorite: newFavoriteStatus })
  } catch (error) {
    console.error('更新收藏状态错误:', error)
    res.status(500).json({ message: '更新收藏状态失败', error: error.message })
  }
}
