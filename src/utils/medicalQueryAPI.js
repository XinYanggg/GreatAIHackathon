import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

/**
 * Updated Medical Query API Client - Now using Amazon Bedrock with Meta Llama
 * Includes proper formatting for Llama models and retry logic for throttling
 */

class MedicalQueryAPI {
  constructor(config = {}) {
    this.client = new BedrockRuntimeClient({
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
      },
    });

    // Your Bedrock Agent configuration
    this.agentId = process.env.REACT_APP_BEDROCK_AGENT_ID;
    this.agentAliasId = process.env.REACT_APP_BEDROCK_AGENT_ALIAS_ID;

    // ✅ Changed from Llama → Nova Micro
    this.modelId =
      process.env.REACT_APP_BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0';

    this.timeout = config.timeout || 30000;

    // Retry configuration for throttling
    this.maxRetries = config.maxRetries || 1;
    this.baseDelay = config.baseDelay || 2000;
    this.maxDelay = config.maxDelay || 15000;
  }

  /**
   * Sleep function for delays
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay
   */
  getRetryDelay(attempt) {
    const delay = this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Send query to Bedrock Agent with retry logic
   * @param {string} query - The user's question
   * @param {object} options - Additional options (sessionId, filters, etc.)
   * @returns {Promise<object>} Response from Bedrock
   */
  async ask(query, options = {}) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Add delay between retries (except first attempt)
        if (attempt > 0) {
          const delay = this.getRetryDelay(attempt - 1);
          console.log(
            `Retry attempt ${attempt}/${this.maxRetries} after ${delay}ms delay`
          );
          await this.sleep(delay);
        }

        return await this.askBedrock(query, options);
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed:`, error.message);

        // Check if it's a throttling error
        const isThrottlingError =
          error.name === 'ThrottlingException' ||
          error.message.includes('throttling') ||
          error.message.includes('rate limit') ||
          error.message.includes('too high') ||
          error.message.includes('TooManyRequestsException');

        // If it's not a throttling error, don't retry
        if (!isThrottlingError) {
          throw error;
        }

        // If we've exhausted all retries, throw a user-friendly error
        if (attempt === this.maxRetries) {
          throw new Error(
            `Request failed after ${this.maxRetries + 1
            } attempts due to rate limiting. Please wait a moment and try again.`
          );
        }

        console.log(`Throttling detected, will retry in a moment...`);
      }
    }

    throw lastError;
  }

  /**
   * Core Bedrock Agent call
   */
  async askBedrock(query, options = {}) {
    try {
      console.log('Sending query to Bedrock Knowledge Base:', query);

      // Method 1: Use RetrieveAndGenerate API directly
      const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = await import(
        '@aws-sdk/client-bedrock-agent-runtime'
      );

      const agentClient = new BedrockAgentRuntimeClient({
        region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
        },
      });

      // Prepare the RetrieveAndGenerate input
      const input = {
        input: {
          text: query,
        },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId: process.env.REACT_APP_KNOWLEDGE_BASE_ID, // Add this to your .env
            modelArn: `arn:aws:bedrock:${process.env.REACT_APP_AWS_REGION || 'us-east-1'}::foundation-model/amazon.nova-micro-v1:0`,
            retrievalConfiguration: {
              vectorSearchConfiguration: {
                numberOfResults: 5, // Number of source documents to retrieve
                overrideSearchType: 'HYBRID', // Options: 'HYBRID', 'SEMANTIC'
              },
            },
            generationConfiguration: {
              inferenceConfig: {
                textInferenceConfig: {
                  maxTokens: 2048,
                  temperature: 0.5,
                  topP: 0.9,
                },
              },
            },
          },
        },
      };

      const command = new RetrieveAndGenerateCommand(input);
      const response = await agentClient.send(command);

      // Extract the answer
      const fullResponse = response.output?.text || '';

      // Extract sources/citations - THIS WILL ALWAYS BE POPULATED
      const sources = [];
      const detailedSources = [];

      if (response.citations) {
        response.citations.forEach((citation) => {
          citation.retrievedReferences?.forEach((reference) => {
            const sourceInfo = {
              uri: reference.location?.s3Location?.uri || '',
              content: reference.content?.text || '',
              metadata: reference.metadata || {},
            };

            detailedSources.push(sourceInfo);

            // Extract just the file path/key
            if (reference.location?.s3Location?.uri) {
              sources.push(reference.location.s3Location.uri);
            }
          });
        });
      }

      console.log(`Found ${detailedSources.length} source documents`);

      return {
        answer: fullResponse || 'I apologize, but I could not generate a response to your query.',
        sources: [...new Set(sources)], // Remove duplicates
        sessionId: response.sessionId || options.sessionId || this.generateSessionId(),
        sourceDocuments: detailedSources.map((source) => ({
          name: source.uri.split('/').pop() || source.uri,
          path: source.uri,
          excerpt: source.content.substring(0, 300) + '...',
          metadata: source.metadata,
          fullContent: source.content,
        })),
        metadata: {
          knowledgeBaseId: process.env.REACT_APP_KNOWLEDGE_BASE_ID,
          modelUsed: 'amazon.nova-micro-v1:0',
          hasAnswer: fullResponse.length > 0,
          numberOfSources: detailedSources.length,
          citationCount: response.citations?.length || 0,
        },
      };
    } catch (error) {
      console.error('Bedrock Knowledge Base error:', error);

      // Add more context to common errors
      if (error.name === 'ThrottlingException') {
        throw new Error(
          'Bedrock rate limit exceeded. Please wait a moment before trying again.'
        );
      } else if (error.name === 'AccessDeniedException') {
        throw new Error(
          'Access denied to Bedrock Knowledge Base. Please check your IAM permissions.'
        );
      } else if (error.name === 'ResourceNotFoundException') {
        throw new Error(
          'Knowledge Base not found. Please verify REACT_APP_KNOWLEDGE_BASE_ID in your environment variables.'
        );
      } else if (error.name === 'ValidationException') {
        throw new Error(
          'Invalid request parameters. Please check your Knowledge Base configuration.'
        );
      }

      throw error;
    }
  }

  async askDirect(query, options = {}) {
    try {
      // Filter out empty or whitespace-only messages if options.messages is provided
      let userMessages = options.messages || [];
      userMessages = userMessages.filter(
        msg => msg.content && msg.content.trim() !== ""
      );
      const input = {
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful medical AI assistant. Always cite sources when possible.',
            },
            ...userMessages.length > 0
              ? userMessages
              : [{ role: 'user', content: query }],
          ],
          maxTokens: 4000,
          temperature: 0.1,
          topP: 0.9,
        }),
      };

      const command = new InvokeModelCommand(input);
      const response = await this.client.send(command);

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Nova uses Claude-style outputs
      const answer = responseBody.output?.[0]?.content?.[0]?.text || '';

      return {
        answer,
        sources: [],
        sessionId: options.sessionId,
        metadata: {
          modelId: this.modelId,
          hasAnswer: answer.length > 0,
          numberOfSources: 0,
        },
      };
    } catch (error) {
      console.error('Bedrock Nova direct invocation error:', error);
      throw error;
    }
  }

  /**
   * Format prompt for Llama 3.1 (uses chat template format)
   */
  formatPromptForNova(query, options = {}) {
    return {
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful medical AI assistant. Always cite sources when possible.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
    };
  }

  /**
   * Legacy format method (kept for compatibility, but updated for Llama)
   */
  formatPrompt(query, options = {}) {
    return this.formatPromptForNova(query, options);
  }

  /**
   * Generate a session ID for conversation continuity
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Continue conversation with session context
   */
  async continueConversation(query, sessionId) {
    return this.ask(query, { sessionId });
  }

  /**
   * Ask with patient filter
   */
  async askAboutPatient(query, patientName) {
    return this.ask(query, {
      filters: { patientName },
    });
  }
}

// Export singleton
const medicalAPI = new MedicalQueryAPI();

export default medicalAPI;
