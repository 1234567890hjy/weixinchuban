import express from 'express'
import mongoose from 'mongoose'
import Grid from 'gridfs-stream'
import multer from 'multer'
import { GridFsStorage } from 'multer-gridfs-storage'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/file-manager'
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const conn = mongoose.connection
let gfs

conn.on('error', (err) => {
  console.error('MongoDB connection error:', err)
})

conn.once('open', () => {
  console.log('MongoDB connection established')
  try {
    gfs = Grid(conn.db, mongoose.mongo)
    gfs.collection('files')
    console.log('GridFS initialized successfully')
  } catch (error) {
    console.error('Error initializing GridFS:', error)
  }
})

// Storage engine
const storage = new GridFsStorage({
  url: MONGO_URI,
  file: (req, file) => {
    return {
      filename: file.originalname,
      bucketName: 'files'
    }
  }
})

const upload = multer({ storage })

// Routes

// Upload files
app.post('/api/upload', upload.array('files'), (req, res) => {
  res.status(200).json({ message: 'Files uploaded successfully' })
})

// Get all files
app.get('/api/files', async (req, res) => {
  try {
    const files = await gfs.files.find().toArray()
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'No files found' })
    }
    res.json(files)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching files', error })
  }
})

// Get single file by ID
app.get('/api/files/:id', async (req, res) => {
  try {
    const file = await gfs.files.findOne({ _id: mongoose.Types.ObjectId(req.params.id) })
    if (!file) {
      return res.status(404).json({ message: 'File not found' })
    }
    
    const readstream = gfs.createReadStream(file.filename)
    res.set('Content-Type', file.contentType || 'application/octet-stream')
    res.set('Content-Disposition', `inline; filename="${file.filename}"`)
    readstream.pipe(res)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching file', error })
  }
})

// Delete single file
app.delete('/api/files/:id', async (req, res) => {
  try {
    await gfs.files.deleteOne({ _id: mongoose.Types.ObjectId(req.params.id) })
    res.status(200).json({ message: 'File deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting file', error })
  }
})

// Batch delete files
app.post('/api/files/batch-delete', async (req, res) => {
  try {
    const { fileIds } = req.body
    for (const id of fileIds) {
      await gfs.files.deleteOne({ _id: mongoose.Types.ObjectId(id) })
    }
    res.status(200).json({ message: 'Files deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting files', error })
  }
})

// Delete all files
app.delete('/api/files/delete-all', async (req, res) => {
  try {
    await gfs.files.deleteMany({})
    res.status(200).json({ message: 'All files deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting all files', error })
  }
})

// Delete files by extension
app.delete('/api/files/delete-by-extension/:extension', async (req, res) => {
  try {
    const extension = req.params.extension
    await gfs.files.deleteMany({ filename: new RegExp(`\.${extension}$`, 'i') })
    res.status(200).json({ message: `All .${extension} files deleted successfully` })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting files by extension', error })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})