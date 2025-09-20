const AWS = require('aws-sdk');
const kendra = new AWS.Kendra({ region: process.env.AWS_REGION });

// Note: Bedrock might need different SDK version
// const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const KENDRA_INDEX_ID = process.env.KENDRA_INDEX_ID;

exports.handler = async (event) => {
    try {
        const { query, patientId, conversationHistory = [] } = JSON.parse(event.body);
        
        console.log(`RAG Query: "${query}"`);
        
        // Step 1: Search Kendra for context
        const kendraResult = await searchKendraForContext(query, patientId);
        
        // Step 2: Build context from search results
        const context = buildContextFromResults(kendraResult.results);
        
        // Step 3: Generate prompt for LLM
        const prompt = buildPrompt(query, context, conversationHistory);
        
        // Step 4: Call Bedrock (simulated for now)
        const llmResponse = await callBedrockLLM(prompt);
        
        return formatResponse(200, {
            success: true,
            response: llmResponse,
            context: {
                documentsFound: kendraResult.results.length,
                totalResults: kendraResult.totalResults,
                queryId: kendraResult.queryId
            },
            sources: kendraResult.results.map(r => ({
                title: r.title,
                excerpt: r.excerpt,
                confidence: r.confidence
            }))
        });
        
    } catch (error) {
        console.error('RAG processing error:', error);
        return formatResponse(500, {
            success: false,
            error: 'RAG processing failed',
            message: error.message
        });
    }
};

async function searchKendraForContext(query, patientId) {
    const searchParams = {
        IndexId: KENDRA_INDEX_ID,
        QueryText: query,
        PageSize: 5, // Limit for context
        AttributeFilter: patientId ? {
            EqualsTo: {
                Key: 'patient_id',
                Value: { StringValue: patientId }
            }
        } : null
    };
    
    const result = await kendra.query(searchParams).promise();
    
    return {
        results: result.ResultItems?.map(item => ({
            title: item.DocumentTitle?.Text || 'Untitled',
            excerpt: item.DocumentExcerpt?.Text || '',
            confidence: item.ScoreAttributes?.ScoreConfidence || 'MEDIUM',
            uri: item.DocumentURI
        })) || [],
        totalResults: result.TotalNumberOfResults || 0,
        queryId: result.QueryId
    };
}

function buildContextFromResults(results) {
    if (!results || results.length === 0) {
        return 'No relevant medical documents found.';
    }
    
    return results
        .map((result, index) => 
            `Document ${index + 1}: ${result.title}\n${result.excerpt}`
        )
        .join('\n\n');
}

function buildPrompt(query, context, conversationHistory) {
  let prompt = `You are a medical AI assistant helping healthcare professionals analyze patient documents. 
Provide clear, accurate, and concise answers based strictly on the given context. 
If the information is not available in the context, say so instead of guessing.

Context from patient medical records:
${context || "No additional context provided."}

Previous conversation:
${conversationHistory && conversationHistory.length > 0 
  ? conversationHistory
      .slice(-3) // take last 3 exchanges
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n')
  : "No prior conversation."}

Current question:
User: ${query}

Assistant:`;

  return prompt;
}
