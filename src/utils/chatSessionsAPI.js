// Chat Sessions API - Manage multiple chat sessions
import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import dynamoDBClient, { TABLE_NAME } from "./dynamodbConfig";
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new chat session
 * @param {string} userId - The user's ID
 * @param {string} title - Optional title for the chat
 * @returns {Promise<object>} - The created session
 */
export const createChatSession = async (userId, title = null) => {
  const timestamp = new Date().toISOString();
  const sessionId = uuidv4();
  
  const session = {
    PK: `USER#${userId}`,
    SK: `SESSION#${sessionId}`,
    sessionId,
    userId,
    title: title || 'New Chat',
    createdAt: timestamp,
    updatedAt: timestamp,
    messageCount: 0,
    lastMessage: null,
    // For easy listing
    entityType: 'SESSION',
  };

  const params = {
    TableName: TABLE_NAME,
    Item: session,
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    console.log('Chat session created:', sessionId);
    return session;
  } catch (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }
};

/**
 * Get all chat sessions for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} - Array of chat sessions
 */
export const getUserChatSessions = async (userId) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'SESSION#',
    },
    ScanIndexForward: false, // Most recent first
  };

  try {
    const result = await dynamoDBClient.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('Error retrieving chat sessions:', error);
    throw error;
  }
};

/**
 * Get a specific chat session
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<object>} - The session object
 */
export const getChatSession = async (userId, sessionId) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND SK = :sk",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}` ,
      ":sk": `SESSION#${sessionId}` ,
    },
    Limit: 1,
  };

  try {
    const result = await dynamoDBClient.send(new QueryCommand(params));
    return result.Items?.[0] || null;
  } catch (error) {
    console.error("Error retrieving chat session:", error);
    throw error;
  }
};


/**
 * Update chat session metadata
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The session ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Updated session
 */
export const updateChatSession = async (userId, sessionId, updates) => {
  const timestamp = new Date().toISOString();
  
  const updateExpression = [];
  const expressionAttributeValues = {
    ':updatedAt': timestamp,
  };
  const expressionAttributeNames = {};

  if (updates.title) {
    updateExpression.push('#title = :title');
    expressionAttributeValues[':title'] = updates.title;
    expressionAttributeNames['#title'] = 'title';
  }

  if (updates.lastMessage) {
    updateExpression.push('lastMessage = :lastMessage');
    expressionAttributeValues[':lastMessage'] = updates.lastMessage;
  }

  if (updates.messageCount !== undefined) {
    updateExpression.push('messageCount = :messageCount');
    expressionAttributeValues[':messageCount'] = updates.messageCount;
  }

  updateExpression.push('updatedAt = :updatedAt');

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `SESSION#${sessionId}`,
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ...(Object.keys(expressionAttributeNames).length > 0 && { 
      ExpressionAttributeNames: expressionAttributeNames 
    }),
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await dynamoDBClient.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (error) {
    console.error('Error updating chat session:', error);
    throw error;
  }
};

/**
 * Delete a chat session and all its messages
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<void>}
 */
export const deleteChatSession = async (userId, sessionId) => {
  // First, delete the session
  const sessionParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `SESSION#${sessionId}`,
    },
  };

  try {
    await dynamoDBClient.send(new DeleteCommand(sessionParams));
    
    // Then delete all messages in this session
    // Note: In production, consider using batch delete or DynamoDB Streams
    const messages = await getSessionMessages(userId, sessionId);
    
    for (const message of messages) {
      await dynamoDBClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: message.PK,
          SK: message.SK,
        },
      }));
    }
    
    console.log('Chat session deleted:', sessionId);
  } catch (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
};

/**
 * Get all messages for a specific session
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The session ID
 * @returns {Promise<Array>} - Array of messages
 */
export const getSessionMessages = async (userId, sessionId) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': `MSG#${sessionId}#`,
    },
    ScanIndexForward: true, // Chronological order
  };

  try {
    const result = await dynamoDBClient.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('Error retrieving session messages:', error);
    throw error;
  }
};

/**
 * Store a message in a specific session
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The session ID
 * @param {string} userQuery - The user's query
 * @param {object} aiResponse - The AI response
 * @returns {Promise<object>} - The stored message
 */
export const storeSessionMessage = async (userId, sessionId, userQuery, aiResponse) => {
  const timestamp = new Date().toISOString();
  const messageId = uuidv4();
  
  const message = {
    PK: `USER#${userId}`,
    SK: `MSG#${sessionId}#${timestamp}#${messageId}`,
    messageId,
    sessionId,
    userId,
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
      queryType: aiResponse.queryType || 'general',
    },
    processingTimeMs: aiResponse.processingTimeMs || null,
    confidenceScore: aiResponse.confidenceScore || null,
    entityType: 'MESSAGE',
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
  };

  const params = {
    TableName: TABLE_NAME,
    Item: message,
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    
    // Update session metadata
    const session = await getChatSession(userId, sessionId);
    if (session) {
      await updateChatSession(userId, sessionId, {
        lastMessage: userQuery,
        messageCount: (session.messageCount || 0) + 1,
      });
    }
    
    console.log('Message stored in session:', sessionId);
    return message;
  } catch (error) {
    console.error('Error storing message:', error);
    throw error;
  }
};

/**
 * Generate a smart title for a chat session based on the first message
 * @param {string} userQuery - The first user query
 * @returns {string} - Generated title
 */
export const generateChatTitle = (userQuery) => {
  // Simple title generation - you can enhance this with AI
  const maxLength = 50;
  let title = userQuery.trim();
  
  if (title.length > maxLength) {
    title = title.substring(0, maxLength - 3) + '...';
  }
  
  return title;
};