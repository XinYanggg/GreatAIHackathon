const AWS = require('aws-sdk');
const kendra = new AWS.Kendra({ region: process.env.AWS_REGION });

const KENDRA_INDEX_ID = process.env.KENDRA_INDEX_ID;

exports.handler = async (event) => {
    try {
        const { query, patientId, documentType, maxResults = 10 } = JSON.parse(event.body);
        
        console.log(`Searching Kendra for: "${query}"`);
        
        // Build attribute filter
        let attributeFilter = null;
        
        if (patientId || documentType) {
            const filters = [];
            
            if (patientId) {
                filters.push({
                    EqualsTo: {
                        Key: 'patient_id',
                        Value: { StringValue: patientId }
                    }
                });
            }
            
            if (documentType) {
                filters.push({
                    EqualsTo: {
                        Key: 'document_type',
                        Value: { StringValue: documentType }
                    }
                });
            }
            
            if (filters.length > 0) {
                attributeFilter = filters.length === 1 ? filters[0] : { AndAllFilters: filters };
            }
        }
        
        // Query Kendra
        const searchParams = {
            IndexId: KENDRA_INDEX_ID,
            QueryText: query,
            PageSize: maxResults,
            AttributeFilter: attributeFilter,
            SortingConfiguration: {
                DocumentAttributeKey: 'upload_date',
                SortOrder: 'DESC'
            }
        };
        
        const searchResult = await kendra.query(searchParams).promise();
        
        // Process and format results
        const formattedResults = searchResult.ResultItems?.map(item => ({
            id: item.Id,
            title: item.DocumentTitle?.Text || 'Untitled Document',
            excerpt: item.DocumentExcerpt?.Text || '',
            uri: item.DocumentURI,
            confidence: item.ScoreAttributes?.ScoreConfidence || 'MEDIUM',
            type: item.Type,
            attributes: extractAttributes(item.DocumentAttributes || []),
            highlights: extractHighlights(item)
        })) || [];
        
        // Get FAQ results if any
        const faqResults = searchResult.ResultItems?.filter(item => item.Type === 'ANSWER') || [];
        
        return formatResponse(200, {
            success: true,
            results: formattedResults,
            faqResults: faqResults.map(faq => ({
                question: faq.DocumentTitle?.Text,
                answer: faq.DocumentExcerpt?.Text,
                confidence: faq.ScoreAttributes?.ScoreConfidence
            })),
            totalResults: searchResult.TotalNumberOfResults || 0,
            queryId: searchResult.QueryId,
            searchQuery: query
        });
        
    } catch (error) {
        console.error('Kendra search error:', error);
        return formatResponse(500, {
            success: false,
            error: 'Kendra search failed',
            message: error.message
        });
    }
};

function extractAttributes(attributes) {
    const result = {};
    attributes.forEach(attr => {
        const key = attr.Key;
        const value = attr.Value;
        
        if (value.StringValue) result[key] = value.StringValue;
        else if (value.DateValue) result[key] = value.DateValue;
        else if (value.LongValue) result[key] = value.LongValue;
    });
    return result;
}

function extractHighlights(item) {
    const highlights = [];
    
    // Extract highlights from title and excerpt
    const titleHighlights = item.DocumentTitle?.Highlights || [];
    const excerptHighlights = item.DocumentExcerpt?.Highlights || [];
    
    [...titleHighlights, ...excerptHighlights].forEach(highlight => {
        if (highlight.Text) {
            highlights.push(highlight.Text);
        }
    });
    
    return highlights;
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