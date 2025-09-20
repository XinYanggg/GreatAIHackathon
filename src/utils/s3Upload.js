import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

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

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName, // File name you want to save as in S3
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
    };

    const command = new PutObjectCommand(uploadParams);
    const response = await s3Client.send(command);
    
    return {
      success: true,
      key: fileName,
      location: `https://${bucketName}.s3.${process.env.REACT_APP_AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`,
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

export const listS3Objects = async (bucketName) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const response = await s3Client.send(command);
    
    const pdfs = (response.Contents || [])
      .filter((item) => item.Key.endsWith('.pdf'))
      .map((item) => ({
        key: item.Key,
        url: `https://${bucketName}.s3.${process.env.REACT_APP_AWS_REGION || 'us-east-1'}.amazonaws.com/${item.Key}`,
        size: item.Size,
        lastModified: item.LastModified,
      }));

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