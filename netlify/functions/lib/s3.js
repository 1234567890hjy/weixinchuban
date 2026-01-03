import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ''
  }
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'file-manager-bucket'

export async function uploadFileToS3(key, buffer, mimetype) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype
  })

  try {
    await s3Client.send(command)
    return { success: true, key }
  } catch (error) {
    console.error('S3上传错误:', error)
    return { success: false, error: error.message }
  }
}

export async function getFileFromS3(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  })

  try {
    const response = await s3Client.send(command)
    const chunks = []
    
    for await (const chunk of response.Body) {
      chunks.push(chunk)
    }
    
    return Buffer.concat(chunks)
  } catch (error) {
    console.error('S3获取文件错误:', error)
    throw error
  }
}

export async function deleteFileFromS3(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  })

  try {
    await s3Client.send(command)
    return { success: true }
  } catch (error) {
    console.error('S3删除文件错误:', error)
    return { success: false, error: error.message }
  }
}

export async function listFilesFromS3() {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME
  })

  try {
    const response = await s3Client.send(command)
    return response.Contents || []
  } catch (error) {
    console.error('S3列出文件错误:', error)
    return []
  }
}

export async function getSignedFileUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  })

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn })
    return url
  } catch (error) {
    console.error('生成签名URL错误:', error)
    throw error
  }
}

export default s3Client
