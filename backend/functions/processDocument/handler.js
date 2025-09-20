const AWS = require('aws-sdk');

const textract = new AWS.Textract({ region: process.env.AWS_REGION });
const comprehendMedical = new AWS.ComprehendMedical({ region: process.env.AWS_REGION });
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    try {
        const { s3Key, bucketName } = JSON.parse(event.body);
        
        console.log(`Processing document: s3://${bucketName}/${s3Key}`);
        
        // Step 1: Extract text using Textract
        const textractResult = await extractTextWithTextract(bucketName, s3Key);
        
        if (!textractResult.success) {
            return formatResponse(500, { 
                success: false, 
                error: 'Textract processing failed',
                details: textractResult.error 
            });
        }
        
        // Step 2: Analyze medical entities with Comprehend Medical
        const medicalAnalysis = await analyzeMedicalEntities(textractResult.extractedText);
        
        return formatResponse(200, {
            success: true,
            extractedText: textractResult.extractedText,
            medicalEntities: medicalAnalysis.entities,
            confidence: textractResult.confidence,
            processingTimeMs: Date.now() - textractResult.startTime,
            textractBlocks: textractResult.totalBlocks,
            medicalEntityCount: medicalAnalysis.entities.length
        });
        
    } catch (error) {
        console.error('Document processing error:', error);
        return formatResponse(500, {
            success: false,
            error: 'Document processing failed',
            message: error.message
        });
    }
};

async function extractTextWithTextract(bucketName, s3Key) {
    const startTime = Date.now();
    
    try {
        const params = {
            Document: {
                S3Object: {
                    Bucket: bucketName,
                    Name: s3Key
                }
            },
            FeatureTypes: ['TABLES', 'FORMS'] // Extract tables and forms too
        };
        
        const result = await textract.analyzeDocument(params).promise();
        
        // Extract text from all blocks
        let extractedText = '';
        let totalConfidence = 0;
        let confidenceCount = 0;
        
        result.Blocks.forEach(block => {
            if (block.BlockType === 'LINE') {
                extractedText += block.Text + '\n';
                
                if (block.Confidence) {
                    totalConfidence += block.Confidence;
                    confidenceCount++;
                }
            }
        });
        
        // Extract tables
        const tables = extractTables(result.Blocks);
        if (tables.length > 0) {
            extractedText += '\n\nTables:\n' + tables.join('\n\n');
        }
        
        // Extract key-value pairs (forms)
        const keyValues = extractKeyValuePairs(result.Blocks);
        if (keyValues.length > 0) {
            extractedText += '\n\nForm Data:\n' + keyValues.join('\n');
        }
        
        const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
        
        return {
            success: true,
            extractedText,
            confidence: averageConfidence,
            totalBlocks: result.Blocks.length,
            startTime
        };
        
    } catch (error) {
        console.error('Textract error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function analyzeMedicalEntities(text) {
    try {
        const params = {
            Text: text.substring(0, 20000) // Comprehend Medical has text limits
        };
        
        const result = await comprehendMedical.detectEntitiesV2(params).promise();
        
        // Filter and format medical entities
        const entities = result.Entities
            .filter(entity => entity.Score > 0.8) // Only high-confidence entities
            .map(entity => ({
                text: entity.Text,
                category: entity.Category,
                type: entity.Type,
                score: entity.Score,
                traits: entity.Traits || []
            }));
        
        return { entities };
        
    } catch (error) {
        console.error('Comprehend Medical error:', error);
        return { entities: [] };
    }
}

function extractTables(blocks) {
    const tables = [];
    const tableBlocks = blocks.filter(block => block.BlockType === 'TABLE');
    
    tableBlocks.forEach(table => {
        const cells = blocks.filter(block => 
            block.BlockType === 'CELL' && 
            block.Relationships?.[0]?.Ids.includes(table.Id)
        );
        
        if (cells.length > 0) {
            const tableText = cells.map(cell => cell.Text || '').join(' | ');
            tables.push(`Table: ${tableText}`);
        }
    });
    
    return tables;
}

function extractKeyValuePairs(blocks) {
    const keyValues = [];
    const keyValueBlocks = blocks.filter(block => block.BlockType === 'KEY_VALUE_SET');
    
    for (let i = 0; i < keyValueBlocks.length; i += 2) {
        const key = keyValueBlocks[i];
        const value = keyValueBlocks[i + 1];
        
        if (key && value) {
            keyValues.push(`${key.Text}: ${value.Text}`);
        }
    }
    
    return keyValues;
}

function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}