import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { readJSON } from './utils.js';

/**
 * Publishes a DCP registry to an S3 bucket
 * @param {Object} options - The publishing options
 * @param {string} options.registry - Path to the registry manifest
 * @param {string} options.bucket - S3 bucket name
 * @param {string} options.prefix - Optional S3 key prefix
 * @param {boolean} options.public - Whether to make files publicly accessible
 * @returns {Promise<Object>} - Result of the publishing operation
 */
export async function publishRegistry({ registry, bucket, prefix = '', public: isPublic = false }) {
  if (!registry) {
    throw new Error('Registry path is required');
  }
  
  if (!bucket) {
    throw new Error('S3 bucket name is required');
  }

  // Create S3 client with default credentials
  const client = new S3Client();
  const publishedFiles = [];
  
  // Read the registry manifest
  const manifest = readJSON(registry);
  if (!manifest) {
    throw new Error(`Invalid or missing registry manifest at ${registry}`);
  }
  
  // Base directory containing the manifest and other files
  const baseDir = path.dirname(registry);
  
  // Upload the manifest itself
  const manifestKey = `${prefix}${prefix ? '/' : ''}registry.json`;
  await uploadFile(client, bucket, registry, manifestKey, isPublic);
  publishedFiles.push(manifestKey);
  
  // Upload component files
  for (const component of manifest.components || []) {
    if (component.path) {
      const componentPath = path.join(baseDir, component.path);
      const componentKey = `${prefix}${prefix ? '/' : ''}${component.path}`;
      
      await uploadFile(client, bucket, componentPath, componentKey, isPublic);
      publishedFiles.push(componentKey);
    }
  }
  
  // Upload token files
  for (const token of manifest.tokens || []) {
    if (token.path) {
      const tokenPath = path.join(baseDir, token.path);
      const tokenKey = `${prefix}${prefix ? '/' : ''}${token.path}`;
      
      await uploadFile(client, bucket, tokenPath, tokenKey, isPublic);
      publishedFiles.push(tokenKey);
    }
  }
  
  console.log(`✅ Published ${publishedFiles.length} files to s3://${bucket}/${prefix}`);
  
  return {
    bucket,
    prefix,
    files: publishedFiles,
    url: isPublic ? `https://${bucket}.s3.amazonaws.com/${prefix}${prefix ? '/' : ''}registry.json` : null
  };
}

/**
 * Upload a single file to S3
 */
async function uploadFile(client, bucket, filePath, key, isPublic) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const fileContent = fs.readFileSync(filePath);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileContent,
    ContentType: 'application/json',
    ...(isPublic && { ACL: 'public-read' })
  });
  
  try {
    await client.send(command);
    console.log(`  ↗️ Uploaded ${key}`);
  } catch (err) {
    throw new Error(`Failed to upload ${key}: ${err.message}`);
  }
} 