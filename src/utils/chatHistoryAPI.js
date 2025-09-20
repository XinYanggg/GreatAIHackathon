// Chat History API - DynamoDB operations
import { PutCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import dynamoDBClient, { TABLE_NAME } from "./dynamodbConfig";
import { v4 as uuidv4 } from 'uuid';

/**
 * Store a conversation entry (user query + AI response) in DynamoDB
 * @param {string} userId - The user's ID
 * @param {string} userQuery - The user's query text
 * @param {object} aiResponse - The AI response object
 * @param {string} sessionId - Optional session ID for grouping conversations
 * @returns {Promise<object>} - The stored conversation item
 */
export const storeConversation = async (userId, userQuery, aiResponse, sessionId = null) => {
  const timestamp = new Date().toISOString();
  const conversationId = uuidv4();
  
  const item = {
    PK: `USER#${userId}`,
    SK: `CHAT#${timestamp}#${sessionId || conversationId}`,
    conversationId,
    userId,
    sessionId: sessionId || conversationId,
    timestamp,
    userQuery: {
      text: userQuery,
      timestamp,
    },
    aiResponse: {
      text: aiResponse.text,
      timestamp: aiResponse.timestamp || timestamp,
      sources: aiResponse.sources || [],
      fileReferences: aiResponse.fileReferences || [],
      queryType: aiResponse.queryType || 'general', // 'document_search', 'document_answer', 'general'
    },
    // Metadata
    processingTimeMs: aiResponse.processingTimeMs || null,
    confidenceScore: aiResponse.confidenceScore || null,
    // TTL for automatic deletion after 90 days (optional)
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
  };

  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    console.log('Conversation stored successfully:', conversationId);
    return item;
  } catch (error) {
    console.error('Error storing conversation:', error);
    throw error;
  }
};

/**
 * Retrieve conversation history for a user
 * @param {string} userId - The user's ID
 * @param {number} limit - Maximum number of items to retrieve
 * @returns {Promise<Array>} - Array of conversation items
 */
export const getUserConversationHistory = async (userId, limit = 20) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
    },
    ScanIndexForward: false, // Sort by SK in descending order (newest first)
    Limit: limit,
  };

  try {
    const result = await dynamoDBClient.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('Error retrieving conversation history:', error);
    throw error;
  }
};

/**
 * Retrieve a specific conversation by ID
 * @param {string} userId - The user's ID
 * @param {string} conversationId - The conversation's ID
 * @returns {Promise<object>} - The conversation item
 */
export const getConversationById = async (userId, conversationId) => {
  // Query using GSI or scan - depends on your table design
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'conversationId = :cid',
    ExpressionAttributeValues: {
      ':cid': conversationId,
    },
  };

  try {
    const result = await dynamoDBClient.send(new QueryCommand(params));
    return result.Items?.[0] || null;
  } catch (error) {
    console.error('Error retrieving conversation:', error);
    throw error;
  }
};

/**
 * Get conversations by session ID
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<Array>} - Array of conversation items in the session
 */
export const getConversationsBySession = async (userId, sessionId) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': `CHAT#`,
    },
    FilterExpression: 'sessionId = :sid',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': `CHAT#`,
      ':sid': sessionId,
    },
    ScanIndexForward: true, // Chronological order
  };

  try {
    const result = await dynamoDBClient.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('Error retrieving session conversations:', error);
    throw error;
  }
};

/**
 * Search conversations by query text or source documents
 * @param {string} userId - The user's ID
 * @param {string} searchTerm - The search term
 * @returns {Promise<Array>} - Array of matching conversation items
 */
export const searchConversations = async (userId, searchTerm) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression: 'contains(userQuery.#text, :term) OR contains(aiResponse.#text, :term)',
    ExpressionAttributeNames: {
      '#text': 'text',
    },
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':term': searchTerm,
    },
  };

  try {
    const result = await dynamoDBClient.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('Error searching conversations:', error);
    throw error;
  }
};