// API Communication Module
export class APIClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
    }

    // Generic request handler
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Client management
    async getClients() {
        return this.request('/clients');
    }

    async createClient(clientData) {
        return this.request('/clients', {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
    }

    async updateClient(id, clientData) {
        return this.request(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData)
        });
    }

    async deleteClient(id) {
        return this.request(`/clients/${id}`, {
            method: 'DELETE'
        });
    }

    async getClient(id) {
        return this.request(`/clients/${id}`);
    }

    // Analysis management
    async createAnalysis(clientId, text) {
        return this.request('/analyze', {
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                text: text
            })
        });
    }

    async getAnalysis(id) {
        return this.request(`/analyze/${id}`);
    }

    async deleteAnalysis(id) {
        return this.request(`/analyze/${id}`, {
            method: 'DELETE'
        });
    }

    async getAnalysisHistory(clientId) {
        return this.request(`/clients/${clientId}/analyses`);
    }

    // Advice generation
    async getAdvice(clientId, fragments) {
        return this.request('/advice', {
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                selected_fragments: fragments
            })
        });
    }

    // Stream analysis (Server-Sent Events)
    streamAnalysis(clientId, text, onMessage, onError, onComplete) {
        const eventSource = new EventSource(`${this.baseURL}/analyze/stream`);
        
        // Send initial request
        fetch(`${this.baseURL}/analyze/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                text: text
            })
        }).catch(onError);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data);
            } catch (error) {
                onError(error);
            }
        };

        eventSource.onerror = (error) => {
            eventSource.close();
            onError(error);
        };

        // Handle completion
        eventSource.addEventListener('complete', () => {
            eventSource.close();
            if (onComplete) onComplete();
        });

        return eventSource;
    }

    // Upload file
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        return fetch(`${this.baseURL}/upload`, {
            method: 'POST',
            body: formData
        }).then(response => {
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
            return response.json();
        });
    }

    // Export data
    async exportAnalysis(analysisId, format = 'json') {
        const response = await fetch(`${this.baseURL}/export/${analysisId}?format=${format}`);
        
        if (!response.ok) {
            throw new Error(`Export failed: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis-${analysisId}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Create default API client instance
export const api = new APIClient();