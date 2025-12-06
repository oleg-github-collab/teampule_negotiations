// Client Operations Module - Enhanced with Optimistic Updates and Error Handling
(() => {
    'use strict';

    /**
     * Optimistic Update Manager
     * Handles rollback on failures
     */
    class OptimisticUpdateManager {
        constructor() {
            this.snapshots = new Map();
        }

        saveSnapshot(operationId, data) {
            this.snapshots.set(operationId, JSON.parse(JSON.stringify(data)));
        }

        getSnapshot(operationId) {
            return this.snapshots.get(operationId);
        }

        clearSnapshot(operationId) {
            this.snapshots.delete(operationId);
        }
    }

    const optimisticManager = new OptimisticUpdateManager();

    /**
     * Enhanced Delete Client with Optimistic Updates
     */
    async function enhancedDeleteClient(clientId, state, callbacks) {
        const operationId = `delete-${clientId}-${Date.now()}`;

        try {
            // 1. Find client
            const client = state.clients.find(c => c.id === clientId);
            if (!client) {
                throw new Error('Клієнт не знайдений');
            }

            // 2. Save snapshot for rollback
            optimisticManager.saveSnapshot(operationId, {
                clients: [...state.clients],
                currentClient: state.currentClient,
                recommendationsHistory: {...state.recommendationsHistory},
                analysisHistory: {...state.analysisHistory}
            });

            // 3. Optimistic UI update - immediate feedback
            const clientElement = document.querySelector(`[data-client-id="${clientId}"]`);
            if (clientElement) {
                clientElement.style.opacity = '0.5';
                clientElement.style.pointerEvents = 'none';
                clientElement.classList.add('deleting');
            }

            // Show immediate feedback
            if (callbacks.showNotification) {
                callbacks.showNotification(`Видалення "${client.company}"...`, 'info');
            }

            // 4. Update state optimistically
            state.clients = state.clients.filter(c => c.id !== clientId);

            // Clear if current client
            if (state.currentClient?.id === clientId) {
                state.currentClient = null;
            }

            // Cascade delete recommendations and analyses
            delete state.recommendationsHistory[clientId];
            delete state.analysisHistory[clientId];

            // 5. Update UI immediately
            if (callbacks.renderClientsList) {
                callbacks.renderClientsList();
            }
            if (callbacks.updateClientCount) {
                callbacks.updateClientCount();
            }

            // 6. Send delete request to server
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка видалення клієнта');
            }

            // 7. Success - clear snapshot
            optimisticManager.clearSnapshot(operationId);

            // 8. Final UI updates
            if (state.currentClient === null) {
                if (callbacks.updateNavClientInfo) callbacks.updateNavClientInfo(null);
                if (callbacks.updateWorkspaceClientInfo) callbacks.updateWorkspaceClientInfo(null);
                if (callbacks.showSection) callbacks.showSection('welcome-screen');
            }

            if (callbacks.showNotification) {
                callbacks.showNotification(`✅ Клієнт "${client.company}" успішно видалено`, 'success');
            }

            return { success: true, client };

        } catch (error) {
            console.error('❌ Delete client error:', error);

            // Rollback optimistic changes
            const snapshot = optimisticManager.getSnapshot(operationId);
            if (snapshot) {
                state.clients = snapshot.clients;
                state.currentClient = snapshot.currentClient;
                state.recommendationsHistory = snapshot.recommendationsHistory;
                state.analysisHistory = snapshot.analysisHistory;

                // Restore UI
                if (callbacks.renderClientsList) callbacks.renderClientsList();
                if (callbacks.updateClientCount) callbacks.updateClientCount();

                // Remove deleting state
                const clientElement = document.querySelector(`[data-client-id="${clientId}"]`);
                if (clientElement) {
                    clientElement.style.opacity = '';
                    clientElement.style.pointerEvents = '';
                    clientElement.classList.remove('deleting');
                }
            }

            optimisticManager.clearSnapshot(operationId);

            if (callbacks.showNotification) {
                callbacks.showNotification(`❌ ${error.message}`, 'error');
            }

            return { success: false, error };
        }
    }

    /**
     * Enhanced Update Client with Optimistic Updates
     */
    async function enhancedUpdateClient(clientId, clientData, state, callbacks) {
        const operationId = `update-${clientId}-${Date.now()}`;

        try {
            // 1. Validate
            if (!clientData.company || !clientData.company.trim()) {
                throw new Error('Назва компанії є обов\'язковою');
            }

            // 2. Find existing client
            const existingIndex = state.clients.findIndex(c => c.id === clientId);
            if (existingIndex === -1) {
                throw new Error('Клієнт не знайдений');
            }

            // 3. Save snapshot
            optimisticManager.saveSnapshot(operationId, {
                clients: [...state.clients],
                currentClient: state.currentClient
            });

            // 4. Show loading state
            if (callbacks.setLoadingState) {
                callbacks.setLoadingState(true);
            }

            // Show immediate feedback
            if (callbacks.showNotification) {
                callbacks.showNotification(`Оновлення "${clientData.company}"...`, 'info');
            }

            // 5. Optimistic update
            const optimisticClient = {
                ...state.clients[existingIndex],
                ...clientData,
                id: clientId,
                updated_at: new Date().toISOString()
            };

            state.clients[existingIndex] = optimisticClient;

            if (state.currentClient?.id === clientId) {
                state.currentClient = optimisticClient;
                if (callbacks.updateNavClientInfo) callbacks.updateNavClientInfo(optimisticClient);
                if (callbacks.updateWorkspaceClientInfo) callbacks.updateWorkspaceClientInfo(optimisticClient);
            }

            // Update UI immediately
            if (callbacks.renderClientsList) {
                callbacks.renderClientsList();
            }

            // 6. Send update request
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка оновлення клієнта');
            }

            // 7. Success - update with server data
            const serverClient = data.client;
            state.clients[existingIndex] = serverClient;

            if (state.currentClient?.id === clientId) {
                state.currentClient = serverClient;
            }

            // Final UI update
            if (callbacks.renderClientsList) {
                callbacks.renderClientsList();
            }

            optimisticManager.clearSnapshot(operationId);

            if (callbacks.showNotification) {
                callbacks.showNotification(`✅ Клієнт "${serverClient.company}" оновлено`, 'success');
            }

            if (callbacks.showSection) {
                callbacks.showSection('analysis-dashboard');
            }

            return { success: true, client: serverClient };

        } catch (error) {
            console.error('❌ Update client error:', error);

            // Rollback
            const snapshot = optimisticManager.getSnapshot(operationId);
            if (snapshot) {
                state.clients = snapshot.clients;
                state.currentClient = snapshot.currentClient;

                if (callbacks.renderClientsList) callbacks.renderClientsList();
                if (callbacks.updateNavClientInfo) callbacks.updateNavClientInfo(state.currentClient);
            }

            optimisticManager.clearSnapshot(operationId);

            if (callbacks.showNotification) {
                callbacks.showNotification(`❌ ${error.message}`, 'error');
            }

            return { success: false, error };

        } finally {
            if (callbacks.setLoadingState) {
                callbacks.setLoadingState(false);
            }
        }
    }

    /**
     * Enhanced Create Client
     */
    async function enhancedCreateClient(clientData, state, callbacks) {
        try {
            // Validate
            if (!clientData.company || !clientData.company.trim()) {
                throw new Error('Назва компанії є обов\'язковою');
            }

            if (callbacks.setLoadingState) {
                callbacks.setLoadingState(true);
            }

            if (callbacks.showNotification) {
                callbacks.showNotification(`Створення "${clientData.company}"...`, 'info');
            }

            // Send request
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка створення клієнта');
            }

            // Add to state
            const newClient = data.client;
            state.clients.unshift(newClient); // Add to beginning
            state.currentClient = newClient;

            // Update UI
            if (callbacks.renderClientsList) callbacks.renderClientsList();
            if (callbacks.updateClientCount) callbacks.updateClientCount();
            if (callbacks.updateNavClientInfo) callbacks.updateNavClientInfo(newClient);
            if (callbacks.updateWorkspaceClientInfo) callbacks.updateWorkspaceClientInfo(newClient);

            if (callbacks.showNotification) {
                callbacks.showNotification(`✅ Клієнт "${newClient.company}" створено! 🎉`, 'success');
            }

            if (callbacks.showSection) {
                callbacks.showSection('analysis-dashboard');
            }

            // Highlight new client
            setTimeout(() => {
                const clientElement = document.querySelector(`[data-client-id="${newClient.id}"]`);
                if (clientElement) {
                    clientElement.classList.add('highlight-new');
                    setTimeout(() => clientElement.classList.remove('highlight-new'), 2000);
                }
            }, 300);

            return { success: true, client: newClient };

        } catch (error) {
            console.error('❌ Create client error:', error);

            if (callbacks.showNotification) {
                callbacks.showNotification(`❌ ${error.message}`, 'error');
            }

            return { success: false, error };

        } finally {
            if (callbacks.setLoadingState) {
                callbacks.setLoadingState(false);
            }
        }
    }

    // Export to global scope
    window.ClientOperations = {
        delete: enhancedDeleteClient,
        update: enhancedUpdateClient,
        create: enhancedCreateClient,
        _optimisticManager: optimisticManager
    };

    console.log('✅ Enhanced Client Operations Module loaded');
})();
