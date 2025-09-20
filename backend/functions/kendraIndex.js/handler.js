const AWS = require('aws-sdk');
const kendra = new AWS.Kendra({ region: process.env.AWS_REGION });

const KENDRA_INDEX_ID = process.env.KENDRA_INDEX_ID;

exports.handler = async (event) => {
    try {
        const documentData = JSON.parse(event.body);
        
        console.log('Indexing document in Kendra:', documentData.id);
        
        // Prepare document for Kendra
        const kendraDocument = {
            Id: documentData.id,
            Title: documentData.title,
            ContentType: 'PLAIN_TEXT',
            Blob: Buffer.from(documentData.extractedText),
            Attributes: [
                {
                    Key: 'patient_id',
                    Value: {
                        StringValue: documentData.patientId || 'unknown'
                    }
                },
                {
                    Key: 'document_type',
                    Value: {
                        StringValue: determineDocumentType(documentData.title, documentData.extractedText)
                    }
                },
                {
                    Key: 'upload_date',
                    Value: {
                        DateValue: new Date(documentData.uploadedAt)
                    }
                },
                {
                    Key: 's3_location',
                    Value: {
                        StringValue: `s3://${documentData.s3Bucket}/${documentData.s3Key}`
                    }
                }
            ]
        };
        
        // Add medical entities as attributes
        if (documentData.medicalEntities && documentData.medicalEntities.length > 0) {
            const medicalTerms = documentData.medicalEntities
                .map(entity => entity.text)
                .join(', ');
            
            kendraDocument.Attributes.push({
                Key: 'medical_entities',
                Value: {
                    StringValue: medicalTerms
                }
            });
        }
        
        // Batch put document to Kendra
        const params = {
            IndexId: KENDRA_INDEX_ID,
            Documents: [kendraDocument]
        };
        
        const result = await kendra.batchPutDocument(params).promise();
        
        if (result.FailedDocuments && result.FailedDocuments.length > 0) {
            console.error('Kendra indexing failed:', result.FailedDocuments);
            return formatResponse(500, {
                success: false,
                error: 'Kendra indexing failed',
                details: result.FailedDocuments
            });
        }
        
        return formatResponse(200, {
            success: true,
            documentId: documentData.id,
            indexId: KENDRA_INDEX_ID,
            message: 'Document successfully indexed in Kendra'
        });
        
    } catch (error) {
        console.error('Kendra indexing error:', error);
        return formatResponse(500, {
            success: false,
            error: 'Kendra indexing failed',
            message: error.message
        });
    }
};

function determineDocumentType(title, content) {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (titleLower.includes('lab') || contentLower.includes('laboratory')) {
        return 'lab-report';
    } else if (titleLower.includes('discharge') || contentLower.includes('discharge')) {
        return 'discharge-summary';
    } else if (titleLower.includes('radiology') || titleLower.includes('xray') || titleLower.includes('mri')) {
        return 'radiology';
    } else if (titleLower.includes('prescription') || contentLower.includes('medication')) {
        return 'prescription';
    } else {
        return 'general-medical';
    }
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