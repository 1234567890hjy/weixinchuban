import React, { useState, useEffect, useRef } from 'react'

function App() {
  const [files, setFiles] = useState([])
  const [filteredFiles, setFilteredFiles] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showViewer, setShowViewer] = useState(false)
  const [currentFile, setCurrentFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [page, setPage] = useState(1)
  const [filesPerPage] = useState(30)
  const [favorites, setFavorites] = useState([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [jumpToPage, setJumpToPage] = useState('')
  const fileInputRef = useRef(null)

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files?limit=10000')
      const data = await response.json()
      
      const decodedFiles = (data.files || []).map(file => {
        let decodedFilename = file.filename
        try {
          if (typeof decodedFilename === 'string' && decodedFilename.length > 0) {
            const buffer = Buffer.from(decodedFilename, 'latin1')
            const decoded = buffer.toString('utf8')
            if (/[\u4e00-\u9fa5]/.test(decoded)) {
              decodedFilename = decoded
            }
          }
        } catch (error) {
          console.error('文件名解码错误:', error)
        }
        return { ...file, filename: decodedFilename }
      })
      
      console.log('获取到文件数量:', decodedFiles.length)
      setFiles(decodedFiles)
      setFilteredFiles(decodedFiles)
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  useEffect(() => {
    fetchFiles()
    const savedFavorites = localStorage.getItem('favorites')
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
  }, [])

  useEffect(() => {
    let result = [...files]
    
    // 如果显示收藏夹，只显示收藏的文件
    if (showFavorites) {
      result = result.filter(file => favorites.includes(file.id))
    }
    
    // Search
    if (searchTerm) {
      result = result.filter(file => 
        file.filename.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'name') {
        comparison = a.filename.localeCompare(b.filename)
      } else {
        comparison = new Date(a.uploadDate) - new Date(b.uploadDate)
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })
    
    setFilteredFiles(result)
    setPage(1)
  }, [files, searchTerm, sortBy, sortOrder, showFavorites, favorites])

  const handleFileUpload = async (e) => {
    const selectedFiles = e.target.files
    console.log('选择的文件:', selectedFiles)
    if (selectedFiles.length === 0) return

    const formData = new FormData()
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i])
    }

    try {
      console.log('准备上传文件...')
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      console.log('上传响应状态:', response.status)
      const data = await response.json()
      console.log('上传响应:', data)
      fetchFiles()
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error uploading files:', error)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e)
  }

  const handleFileClick = (file) => {
    setCurrentFile(file)
    setShowViewer(true)
  }

  const toggleFavorite = async (fileId) => {
    try {
      const response = await fetch(`/api/files/${fileId}/favorite`, {
        method: 'PUT'
      })
      const data = await response.json()
      
      // 更新本地状态
      setFiles(files.map(file => 
        file.id === fileId ? { ...file, favorite: data.favorite } : file
      ))
      setFilteredFiles(filteredFiles.map(file => 
        file.id === fileId ? { ...file, favorite: data.favorite } : file
      ))
      
      // 更新本地存储的收藏
      if (data.favorite) {
        setFavorites([...favorites, fileId])
      } else {
        setFavorites(favorites.filter(id => id !== fileId))
      }
      localStorage.setItem('favorites', JSON.stringify(data.favorite ? [...favorites, fileId] : favorites.filter(id => id !== fileId)))
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const deleteFile = async (fileId) => {
    try {
      await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      })
      fetchFiles()
      if (favorites.includes(fileId)) {
        setFavorites(favorites.filter(id => id !== fileId))
        localStorage.setItem('favorites', JSON.stringify(favorites.filter(id => id !== fileId)))
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const batchDelete = async () => {
    if (window.confirm(`确定要删除选中的 ${selectedFiles.length} 个文件吗？`)) {
      try {
        await fetch('/api/files/batch-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: selectedFiles })
        })
        fetchFiles()
        setSelectedFiles([])
      } catch (error) {
        console.error('Error deleting files:', error)
      }
    }
  }

  const deleteAll = async () => {
    if (window.confirm('确定要删除所有文件吗？')) {
      try {
        await fetch('/api/files/delete-all', {
          method: 'DELETE'
        })
        fetchFiles()
        setSelectedFiles([])
      } catch (error) {
        console.error('Error deleting all files:', error)
      }
    }
  }

  const deleteByExtension = async (extension) => {
    try {
      await fetch(`/api/files/delete-by-extension/${extension}`, {
        method: 'DELETE'
      })
      fetchFiles()
    } catch (error) {
      console.error('Error deleting files by extension:', error)
    }
  }

  const toggleFileSelection = (fileId) => {
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId))
    } else {
      setSelectedFiles([...selectedFiles, fileId])
    }
  }

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase()
  }

  const getFileIcon = (extension) => {
    const icons = {
      pdf: '📄',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      html: '🌐',
      txt: '📝',
      docx: '📄',
      xlsx: '📊',
      pptx: '📊',
      zip: '🗜️',
      rar: '🗜️',
      mp4: '🎬',
      mp3: '🎵',
      default: '📁'
    }
    return icons[extension] || icons.default
  }

  const formatFileSize = (size) => {
    if (size < 1024) return size + ' B'
    if (size < 1048576) return (size / 1024).toFixed(1) + ' KB'
    return (size / 1048576).toFixed(1) + ' MB'
  }

  // Pagination
  const indexOfLastFile = page * filesPerPage
  const indexOfFirstFile = indexOfLastFile - filesPerPage
  const currentFiles = filteredFiles.slice(indexOfFirstFile, indexOfLastFile)
  const totalPages = Math.ceil(filteredFiles.length / filesPerPage)

  const nextPage = () => {
    if (page < totalPages) setPage(page + 1)
  }

  const prevPage = () => {
    if (page > 1) setPage(page - 1)
  }

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage)
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum)
      setJumpToPage('')
    }
  }

  const handleJumpToPageKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJumpToPage()
    }
  }

  return (
    <div className="app">
      <header>
        <h1>文件管理应用</h1>
        <p>支持文件上传、查看、搜索、删除等功能</p>
      </header>

      <section className="upload-section">
        <div className="filter-section">
          <select 
            className="sort-select"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-')
              setSortBy(newSortBy)
              setSortOrder(newSortOrder)
            }}
          >
            <option value="name-asc">按名称升序</option>
            <option value="name-desc">按名称降序</option>
            <option value="date-asc">按时间升序</option>
            <option value="date-desc">按时间降序</option>
          </select>
        </div>

        <div 
          className={`upload-area ${isDragging ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <h3>拖拽文件到此处或点击上传</h3>
          <p>支持批量上传和文件夹上传</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>

        <div className="controls">
          <button 
            className={`btn ${showFavorites ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => {
              setShowFavorites(!showFavorites)
              setPage(1)
            }}
          >
            {showFavorites ? '全部文件' : '收藏夹'}
          </button>
          <input
            type="text"
            className="search-bar"
            placeholder="搜索文件..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
          />
          {selectedFiles.length > 0 && (
            <button className="btn btn-danger" onClick={batchDelete}>
              批量删除 ({selectedFiles.length})
            </button>
          )}
          <button className="btn btn-danger" onClick={deleteAll}>
            删除全部
          </button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="selected-files">
            {selectedFiles.slice(0, 5).map(id => {
              const file = files.find(f => f.id === id)
              return file ? (
                <div key={id} className="selected-file">
                  {file.filename}
                  <button 
                    className="remove-selected"
                    onClick={() => toggleFileSelection(id)}
                  >
                    ×
                  </button>
                </div>
              ) : null
            })}
            {selectedFiles.length > 5 && (
              <div className="selected-file">+{selectedFiles.length - 5} 个文件</div>
            )}
          </div>
        )}
      </section>

      <section className="file-list">
        {currentFiles.length === 0 ? (
          <div className="empty-state">
            <h3>暂无文件</h3>
            <p>点击上传区域添加文件</p>
          </div>
        ) : (
          <div className="file-grid">
            {currentFiles.map(file => {
              const extension = getFileExtension(file.filename)
              return (
                <div 
                  key={file.id} 
                  className={`file-item ${selectedFiles.includes(file.id) ? 'selected' : ''}`}
                >
                  <div 
                    className="file-preview"
                    onClick={() => handleFileClick(file)}
                  >
                    {getFileIcon(extension)}
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.filename}</div>
                    <div className="file-meta">
                      {formatFileSize(file.size)} • {new Date(file.uploadDate).toLocaleDateString()}
                    </div>
                    <div className="file-actions">
                      <label className="action-btn">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                        />
                      </label>
                      <button
                        className={`action-btn favorite-btn ${favorites.includes(file.id) ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(file.id)
                        }}
                        title={favorites.includes(file.id) ? '取消收藏' : '收藏'}
                      >
                        {favorites.includes(file.id) ? '❤️' : '🤍'}
                      </button>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteFile(file.id)
                        }}
                        title="删除"
                      >
                        🗑️
                      </button>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteByExtension(extension)
                        }}
                        title={`删除所有${extension}文件`}
                      >
                        📌
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={prevPage} disabled={page === 1}>
            上一页
          </button>
          <span className="pagination-info">
            第 {page} 页，共 {totalPages} 页
          </span>
          <div className="jump-to-page">
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              onKeyPress={handleJumpToPageKeyPress}
              placeholder="页码"
            />
            <button onClick={handleJumpToPage} disabled={!jumpToPage}>
              跳转
            </button>
          </div>
          <button onClick={nextPage} disabled={page === totalPages}>
            下一页
          </button>
        </div>
      )}

      {showViewer && currentFile && (
        <div className="viewer-modal" onClick={() => setShowViewer(false)}>
          <div className="viewer-content" onClick={(e) => e.stopPropagation()}>
            <button className="viewer-close" onClick={() => setShowViewer(false)}>×</button>
            <div className="viewer-body">
              <h3>{currentFile.filename}</h3>
              <div>
                {getFileExtension(currentFile.filename) === 'pdf' ? (
                  <iframe
                    src={`/api/files/${currentFile.id}`}
                    width="100%"
                    height="600px"
                    title={currentFile.filename}
                  />
                ) : getFileExtension(currentFile.filename) === 'html' ? (
                  <iframe
                    src={`/api/files/${currentFile.id}`}
                    width="100%"
                    height="600px"
                    title={currentFile.filename}
                  />
                ) : ['jpg', 'jpeg', 'png', 'gif'].includes(getFileExtension(currentFile.filename)) ? (
                  <img
                    src={`/api/files/${currentFile.id}`}
                    alt={currentFile.filename}
                    className="preview-content"
                  />
                ) : (
                  <div>
                    <p>不支持的文件格式</p>
                    <a 
                      href={`/api/files/${currentFile.id}`}
                      download={currentFile.filename}
                      className="btn btn-primary"
                    >
                      下载文件
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App