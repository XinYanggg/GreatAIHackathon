// AWS DynamoDB Configuration
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Configure AWS credentials and region
// In production, use environment variables or AWS IAM roles
const client = new DynamoDBClient({
  region: process.env.REACT_APP_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  },
});

// Create DynamoDB Document Client for easier operations
const dynamoDBClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

export const TABLE_NAME = process.env.REACT_APP_DYNAMODB_TABLE_NAME || "ChatHistory";

export default dynamoDBClient;