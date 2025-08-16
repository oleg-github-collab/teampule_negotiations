// ===== EMERGENCY CLIENT SELECTION FIX =====
// This will work regardless of service loading issues

console.log('🚨 EMERGENCY CLIENT FIX LOADING...');

// Global state
window.EMERGENCY_currentClient = null;

// Emergency client selection function
window.EMERGENCY_selectClient = function(clientId) {
    console.log('🚨 EMERGENCY CLIENT SELECTION:', clientId);
    
    // Find client in any available source
    let client = null;
    let clients = [];
    
    // Try to get clients from various sources
    if (window.clientService?.clients) {
        clients = window.clientService.clients;
    } else if (window.services?.client?.clients) {
        clients = window.services.client.clients;
    }
    
    // Find the client
    client = clients.find(c => c.id == clientId);
    
    if (!client) {
        console.error('🚨 EMERGENCY: Client not found:', clientId);
        return false;
    }
    
    console.log('🚨 EMERGENCY: Client found:', client.company);
    
    // Set current client everywhere
    window.EMERGENCY_currentClient = client;
    
    if (window.clientService) {
        window.clientService.currentClient = client;
    }
    
    if (window.services?.client) {
        window.services.client.currentClient = client;
    }
    
    if (window.state) {
        window.state.currentClient = client;
    }
    
    // Update UI manually
    EMERGENCY_updateUI(client);
    
    console.log('🚨 EMERGENCY: Client selection complete!');
    return true;
};

// Emergency UI update
function EMERGENCY_updateUI(client) {
    console.log('🚨 EMERGENCY: Updating UI for client:', client.company);
    
    // Update client list highlighting
    document.querySelectorAll('.client-item').forEach(item => {
        const isSelected = parseInt(item.dataset.clientId) === client.id;
        item.classList.toggle('active', isSelected);
        console.log('🚨 Client item', item.dataset.clientId, 'active:', isSelected);
    });
    
    // Update dropdown
    const clientSelect = document.getElementById('client-select');
    if (clientSelect) {
        // Clear and rebuild options
        clientSelect.innerHTML = '<option value="">Оберіть клієнта...</option>';
        
        // Get clients from any source
        let clients = [];
        if (window.clientService?.clients) {
            clients = window.clientService.clients;
        } else if (window.services?.client?.clients) {
            clients = window.services.client.clients;
        }
        
        clients.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.company || 'Без назви';
            option.selected = c.id === client.id;
            clientSelect.appendChild(option);
        });
        
        console.log('🚨 Dropdown updated, selected value:', clientSelect.value);
    }
    
    // Update analysis button
    const analysisBtn = document.getElementById('start-analysis-btn');
    const textArea = document.getElementById('negotiation-text');
    
    if (analysisBtn) {
        const hasClient = !!client;
        const hasText = textArea?.value?.trim()?.length >= 20;
        
        analysisBtn.disabled = !hasClient || !hasText;
        console.log('🚨 Analysis button updated:', { hasClient, hasText, disabled: analysisBtn.disabled });
    }
    
    // Show analysis dashboard
    const sections = ['welcome-screen', 'client-form', 'analysis-dashboard'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = sectionId === 'analysis-dashboard' ? 'block' : 'none';
        }
    });
}

// Setup emergency click handlers
function EMERGENCY_setupClickHandlers() {
    console.log('🚨 EMERGENCY: Setting up click handlers...');
    
    const clientList = document.getElementById('client-list');
    if (!clientList) {
        console.log('🚨 Client list not found, retrying in 500ms...');
        setTimeout(EMERGENCY_setupClickHandlers, 500);
        return;
    }
    
    // Remove existing emergency handler
    if (clientList._emergencyHandler) {
        clientList.removeEventListener('click', clientList._emergencyHandler);
    }
    
    // Add emergency handler
    clientList._emergencyHandler = function(e) {
        console.log('🚨 EMERGENCY CLICK DETECTED:', e.target);
        
        const clientItem = e.target.closest('.client-item');
        if (!clientItem) return;
        
        const clientId = parseInt(clientItem.dataset.clientId);
        console.log('🚨 EMERGENCY: Clicked client ID:', clientId);
        
        // Don't handle action buttons
        if (e.target.closest('.client-actions')) return;
        
        // Select client
        window.EMERGENCY_selectClient(clientId);
    };
    
    clientList.addEventListener('click', clientList._emergencyHandler);
    console.log('🚨 EMERGENCY: Click handler installed!');
}

// Setup after short delay
setTimeout(EMERGENCY_setupClickHandlers, 1000);

// Also setup on DOM ready if needed
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', EMERGENCY_setupClickHandlers);
}

console.log('🚨 EMERGENCY CLIENT FIX LOADED!');