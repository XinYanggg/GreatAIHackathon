import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';


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
      location: `https://${bucketName}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${fileName}`,
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