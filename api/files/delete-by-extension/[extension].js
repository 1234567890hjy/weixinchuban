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

  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: '方法不允许' })
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const extension = url.pathname.split('/').pop()
    const files = getFiles()
    const filesToDelete = files.filter(file => 
      file.filename.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
    )
    
    if (filesToDelete.length === 0) {
      return res.status(404).json({ message: `没有找到扩展名为 .${extension} 的文件` })
    }
    
    for (const file of filesToDelete) {
      deleteFile(file.id)
    }
    
    res.json({ message: `成功删除 ${filesToDelete.length} 个 .${extension} 文件` })
  } catch (error) {
    console.error('按扩展名删除错误:', error)
    res.status(500).json({ message: '按扩展名删除失败', error: error.message })
  }
}
