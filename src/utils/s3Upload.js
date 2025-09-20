import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadFileToS3 = async (file, bucketName, fileName) => {
  try {
    const fileBuffer = await file.arrayBuffer();

    const safeFileName = fileName.replace(/\s+/g, "_");

    const uploadParams = {
      Bucket: bucketName,
      Key: safeFileName, // File name you want to save as in S3
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
    };

    const command = new PutObjectCommand(uploadParams);
    const response = await s3Client.send(command);
    
    return {
      success: true,
      key: safeFileName,
      location: `https://${bucketName}.s3.${process.env.REACT_APP_AWS_REGION || 'us-east-1'}.amazonaws.com/${safeFileName}`,
      response
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const generatePresignedUrl = async (bucketName, key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return {
      success: true,
      url: signedUrl
    };
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return {
      success: false,
      error: error.message
    };
  }
};


export const listS3Objects = async (bucketName) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const response = await s3Client.send(command);
    
    const pdfs = [];
    
    // Generate pre-signed URLs for each PDF
    for (const item of (response.Contents || [])) {
      if (item.Key.endsWith('.pdf')) {
        const presignedResult = await generatePresignedUrl(bucketName, item.Key);
        
        pdfs.push({
          key: item.Key,
          url: presignedResult.success ? presignedResult.url : null,
          size: item.Size,
          lastModified: item.LastModified,
          error: presignedResult.success ? null : presignedResult.error
        });
      }
    }

    return {
      success: true,
      data: pdfs
    };
  } catch (error) {
    console.error('Error listing S3 objects:', error);
    return {
      success: false,
      error: error.message
    };
  }
};