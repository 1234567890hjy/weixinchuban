import fs from 'fs'
import path from 'path'

const DB_FILE = '/tmp/files.json'

const ensureDataDir = () => {
  const dataDir = '/tmp'
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

const readDatabase = () => {
  ensureDataDir()
  
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('读取数据库错误:', error)
    return []
  }
}

const writeDatabase = (files) => {
  ensureDataDir()
  
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(files, null, 2))
    return { success: true }
  } catch (error) {
    console.error('写入数据库错误:', error)
    return { success: false, error: error.message }
  }
}

export const getFiles = () => {
  return readDatabase()
}

export const saveFile = (fileData) => {
  const files = readDatabase()
  files.push(fileData)
  return writeDatabase(files)
}

export const updateFile = (fileId, updates) => {
  const files = readDatabase()
  const index = files.findIndex(f => f.id === fileId)
  
  if (index !== -1) {
    files[index] = { ...files[index], ...updates }
    return writeDatabase(files)
  }
  
  return { success: false, error: '文件不存在' }
}

export const deleteFile = (fileId) => {
  const files = readDatabase()
  const filteredFiles = files.filter(f => f.id !== fileId)
  return writeDatabase(filteredFiles)
}

export const deleteAllFiles = () => {
  return writeDatabase([])
}

export const getFileById = (fileId) => {
  const files = readDatabase()
  return files.find(f => f.id === fileId)
}

export default {
  getFiles,
  saveFile,
  updateFile,
  deleteFile,
  deleteAllFiles,
  getFileById
}
