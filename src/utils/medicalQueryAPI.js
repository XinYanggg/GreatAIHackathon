/**
 * Unified Medical Query API Client
 * Single ask() method - handles everything automatically
 */

class MedicalQueryAPI {
    constructor(config = {}) {
        this.baseURL = config.baseURL || process.env.API_GATEWAY_BASE_URL || 'https://h353hk5sf3.execute-api.us-east-1.amazonaws.com/prod';
        this.timeout = config.timeout || 30000;
    }

    /**
     * Ask any question - AI automatically determines how to respond
     * @param {string} query - The user's question or search query
     * @param {object} options - Optional filters and session ID
     * @returns {Promise<object>} Response with answer and cited documents
     */
    async ask(query, options = {}) {
        const url = `${this.baseURL}/query`;
        
        const requestBody = {
            query,
            filters: options.filters || {}
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            console.log('Asking:', query);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('Response:', data);
            
            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
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
            filters: { patientName }
        });
    }

    /**
     * Ask with date range filter
     */
    async askInDateRange(query, dateFrom, dateTo, additionalFilters = {}) {
        return this.ask(query, {
            filters: {
                dateFrom,
                dateTo,
                ...additionalFilters
            }
        });
    }
}

// Export singleton
const medicalAPI = new MedicalQueryAPI();
export default medicalAPI;