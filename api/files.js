import { getFiles } from '../lib/database.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: '方法不允许' })
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const search = url.searchParams.get('search')
    const sortBy = url.searchParams.get('sortBy')
    const sortOrder = url.searchParams.get('sortOrder')
    const page = parseInt(url.searchParams.get('page')) || 1
    const limit = parseInt(url.searchParams.get('limit')) || 30
    
    let filteredFiles = getFiles()
    
    if (search) {
      filteredFiles = filteredFiles.filter(file =>
        file.filename.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    if (sortBy) {
      filteredFiles.sort((a, b) => {
        let aValue = a[sortBy]
        let bValue = b[sortBy]
        
        if (sortBy === 'uploadDate') {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
    }
    
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex)
    
    res.json({
      files: paginatedFiles,
      totalCount: filteredFiles.length,
      currentPage: page,
      totalPages: Math.ceil(filteredFiles.length / limit)
    })
  } catch (error) {
    console.error('获取文件错误:', error)
    res.status(500).json({ message: '获取文件失败', error: error.message })
  }
}
