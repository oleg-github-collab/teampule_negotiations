/**
 * APIClient - SOLID compliant API communication system
 * Single Responsibility: Manages only API communications
 * Open/Closed: Extensible for new API endpoints
 * Liskov Substitution: All API methods follow same interface
 * Interface Segregation: Separate concerns for different API types
 * Dependency Inversion: Depends on fetch abstraction
 */

class APIClient {
    constructor() {
        this.baseURL = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
        this.timeout = 300000; // 5 minutes for analysis
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.connectionStatus = 'online';
        this.queuedRequests = new Map();
        this.failedRequestsCache = [];
        
        this.setupErrorRecovery();
        this.setupConnectionMonitoring();
        console.log('🌐 APIClient initialized with enhanced error handling');
    }
    
    // Single Responsibility: Make HTTP request with retry logic
    async makeRequest(url, options = {}) {
        const fullURL = this.baseURL + url;
        
        const requestOptions = {
            headers: { ...this.defaultHeaders, ...options.headers },
            timeout: options.timeout || this.timeout,
            ...options
        };
        
        console.log(`🌐 Making request: ${options.method || 'GET'} ${fullURL}`);
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await this.fetchWithTimeout(fullURL, requestOptions);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`🌐 Request successful: ${fullURL}`);
                return data;
                
            } catch (error) {
                console.error(`🌐 Request attempt ${attempt} failed:`, error.message);
                
                if (attempt === this.retryAttempts) {
                    throw error;
                }
                
                // Wait before retry
                await this.delay(this.retryDelay * attempt);
            }
        }
    }
    
    // Single Responsibility: Fetch with timeout
    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }
    
    // Single Responsibility: Delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Setup error recovery mechanisms
    setupErrorRecovery() {
        this.errorRecovery = {
            maxCacheSize: 100,
            retryFailedRequests: async () => {
                if (this.failedRequestsCache.length === 0 || this.connectionStatus !== 'online') {
                    return;
                }
                
                console.log(`🔄 Retrying ${this.failedRequestsCache.length} cached failed requests`);
                const requests = [...this.failedRequestsCache];
                this.failedRequestsCache = [];
                
                for (const request of requests) {
                    try {
                        const result = await this.makeRequest(request.url, request.options);
                        if (request.resolve) request.resolve(result);
                    } catch (error) {
                        if (request.reject) request.reject(error);
                    }
                }
            },
            
            cacheFailedRequest: (url, options, resolve, reject) => {
                if (this.failedRequestsCache.length >= this.errorRecovery.maxCacheSize) {
                    this.failedRequestsCache.shift(); // Remove oldest
                }
                this.failedRequestsCache.push({ url, options, resolve, reject, timestamp: Date.now() });
            }
        };
    }
    
    // Setup connection monitoring
    setupConnectionMonitoring() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('🌐 Connection restored');
                this.connectionStatus = 'online';
                this.errorRecovery.retryFailedRequests();
            });
            
            window.addEventListener('offline', () => {
                console.log('🌐 Connection lost');
                this.connectionStatus = 'offline';
            });
        }
    }
    
    // Interface Segregation: Client operations
    
    // Get all clients
    async getClients() {
        try {
            const data = await this.makeRequest('/api/clients');
            return {
                success: true,
                clients: data.clients || []
            };
        } catch (error) {
            console.error('🌐 Get clients error:', error);
            return {
                success: false,
                error: error.message,
                clients: []
            };
        }
    }
    
    // Save client (create or update)
    async saveClient(clientData) {
        try {
            const method = clientData.id ? 'PUT' : 'POST';
            const url = clientData.id ? `/api/clients/${clientData.id}` : '/api/clients';
            
            const data = await this.makeRequest(url, {
                method,
                body: JSON.stringify(clientData)
            });
            
            return {
                success: true,
                client: data.client
            };
        } catch (error) {
            console.error('🌐 Save client error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Delete client
    async deleteClient(clientId) {
        try {
            await this.makeRequest(`/api/clients/${clientId}`, {
                method: 'DELETE'
            });
            
            return {
                success: true
            };
        } catch (error) {
            console.error('🌐 Delete client error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Interface Segregation: Analysis operations
    
    // Analyze text with SSE streaming
    async analyzeText(analysisData, onProgress = null, onHighlight = null) {
        try {
            console.log('🌐 Starting streaming analysis...');
            
            // Prepare FormData for multipart request
            const formData = new FormData();
            formData.append('client_id', analysisData.client_id);
            
            if (analysisData.method === 'file' && analysisData.file) {
                formData.append('file', analysisData.file);
                formData.append('method', 'file');
            } else {
                formData.append('text', analysisData.text || '');
                formData.append('method', 'text');
            }
            
            // Get client profile for context
            const currentClient = window.clientManager?.getCurrentClient();
            if (currentClient) {
                const profile = {
                    company: currentClient.company,
                    negotiator: currentClient.negotiator,
                    sector: currentClient.sector,
                    goal: currentClient.goals,
                    criteria: currentClient.decision_criteria,
                    constraints: currentClient.constraints
                };
                formData.append('profile', JSON.stringify(profile));
            }
            
            // Start SSE connection for streaming results
            const response = await fetch(this.baseURL + '/api/analyze', {
                method: 'POST',
                body: formData,
                headers: {
                    // Don't set Content-Type - let browser set it with boundary
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Handle SSE streaming
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let highlights = [];
            let summary = null;
            let barometer = null;
            let buffer = '';
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        break;
                    }
                    
                    buffer += decoder.decode(value, { stream: true });
                    
                    // Process complete SSE messages
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                switch (data.type) {
                                    case 'progress':
                                        if (onProgress) onProgress(data);
                                        break;
                                        
                                    case 'highlight':
                                        highlights.push(data);
                                        if (onHighlight) onHighlight(data);
                                        break;
                                        
                                    case 'merged_highlights':
                                        highlights = data.items || highlights;
                                        break;
                                        
                                    case 'summary':
                                        summary = data;
                                        break;
                                        
                                    case 'barometer':
                                        barometer = data;
                                        break;
                                        
                                    case 'complete':
                                        console.log('🌐 Analysis streaming completed');
                                        break;
                                        
                                    case 'error':
                                        console.error('🌐 Analysis error received:', data);
                                        // Don't throw immediately, let other chunks complete
                                        if (data.chunkNumber) {
                                            console.warn(`🌐 Chunk ${data.chunkNumber} failed: ${data.message}`);
                                            break; // Continue processing other chunks
                                        }
                                        throw new Error(data.message || 'Analysis error');
                                        
                                    case 'analysis_started':
                                        console.log('🌐 Analysis started:', data.message);
                                        if (onProgress) onProgress(data);
                                        break;
                                        
                                    case 'analysis_saved':
                                        console.log('🌐 Analysis saved:', data.message);
                                        break;
                                }
                            } catch (parseError) {
                                console.warn('🌐 Failed to parse SSE data:', line, parseError);
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
            
            return {
                success: true,
                analysis: {
                    highlights,
                    summary,
                    barometer,
                    total_highlights: highlights.length
                }
            };
            
        } catch (error) {
            console.error('🌐 Streaming analysis error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Analyze file
    async analyzeFile(analysisData) {
        try {
            const formData = new FormData();
            formData.append('client_id', analysisData.client_id);
            formData.append('file', analysisData.file);
            formData.append('method', 'file');
            
            // Don't set Content-Type for FormData - browser will set it with boundary
            const headers = { ...this.defaultHeaders };
            delete headers['Content-Type'];
            
            const data = await this.makeRequest('/api/analyze', {
                method: 'POST',
                headers,
                body: formData
            });
            
            return {
                success: true,
                analysis: data.analysis
            };
        } catch (error) {
            console.error('🌐 Analyze file error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get analysis history
    async getAnalysisHistory(clientId) {
        try {
            const url = clientId ? `/api/clients/${clientId}` : '/api/analyses';
            const data = await this.makeRequest(url);
            
            return {
                success: true,
                analyses: data.analyses || []
            };
        } catch (error) {
            console.error('🌐 Get analysis history error:', error);
            return {
                success: false,
                error: error.message,
                analyses: []
            };
        }
    }
    
    // Delete analysis
    async deleteAnalysis(clientId, analysisId) {
        try {
            await this.makeRequest(`/api/clients/${clientId}/analysis/${analysisId}`, {
                method: 'DELETE'
            });
            
            return {
                success: true
            };
        } catch (error) {
            console.error('🌐 Delete analysis error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Interface Segregation: Advice operations
    
    // Get personalized advice
    async getPersonalizedAdvice(requestData) {
        try {
            const data = await this.makeRequest('/api/advice', {
                method: 'POST',
                body: JSON.stringify(requestData)
            });
            
            return {
                success: true,
                advice: data.advice
            };
        } catch (error) {
            console.error('🌐 Get advice error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get recommendations
    async getRecommendations(clientId) {
        try {
            const data = await this.makeRequest(`/api/recommendations/${clientId}`);
            
            return {
                success: true,
                recommendations: data.recommendations || []
            };
        } catch (error) {
            console.error('🌐 Get recommendations error:', error);
            return {
                success: false,
                error: error.message,
                recommendations: []
            };
        }
    }
    
    // Interface Segregation: Utility operations
    
    // Get token usage
    async getTokenUsage() {
        try {
            const data = await this.makeRequest('/api/usage');
            
            return {
                success: true,
                usage: {
                    used: data.used_tokens || 0,
                    total: data.total_tokens || 512000,
                    percentage: data.percentage || 0
                }
            };
        } catch (error) {
            console.error('🌐 Get token usage error:', error);
            return {
                success: false,
                error: error.message,
                usage: {
                    used: 0,
                    total: 512000,
                    percentage: 0
                }
            };
        }
    }
    
    // Log client error
    async logClientError(errorData) {
        try {
            await this.makeRequest('/api/log-error', {
                method: 'POST',
                body: JSON.stringify(errorData)
            });
            
            return { success: true };
        } catch (error) {
            console.error('🌐 Log client error failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Interface Segregation: Configuration
    
    // Set base URL
    setBaseURL(url) {
        this.baseURL = url;
        console.log(`🌐 Base URL set to: ${url}`);
    }
    
    // Set default headers
    setDefaultHeaders(headers) {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers };
        console.log('🌐 Default headers updated');
    }
    
    // Set timeout
    setTimeout(timeout) {
        this.timeout = timeout;
        console.log(`🌐 Timeout set to: ${timeout}ms`);
    }
    
    // Set retry configuration
    setRetryConfig(attempts, delay) {
        this.retryAttempts = attempts;
        this.retryDelay = delay;
        console.log(`🌐 Retry config: ${attempts} attempts, ${delay}ms delay`);
    }
    
    // Interface Segregation: Debug methods
    
    // Test connection
    async testConnection() {
        try {
            await this.makeRequest('/health');
            console.log('🌐 Connection test successful');
            return true;
        } catch (error) {
            console.error('🌐 Connection test failed:', error);
            return false;
        }
    }
    
    // Get API stats
    getStats() {
        return {
            baseURL: this.baseURL,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            retryDelay: this.retryDelay,
            defaultHeaders: { ...this.defaultHeaders }
        };
    }
}

// Export for global use
window.APIClient = APIClient;
console.log('🌐 APIClient class loaded');