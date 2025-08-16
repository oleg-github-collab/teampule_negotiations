// TEST SCRIPT: Run this in browser console to test client selection

console.log('🧪 Starting client selection test...');

// Wait for services to load
setTimeout(async () => {
    console.log('🧪 Checking services...');
    
    if (window.clientService) {
        console.log('✅ ClientService found');
        
        // Create test client directly
        const testClient = {
            id: 999,
            company: 'Test Company',
            negotiator: 'Test User', 
            sector: 'Testing'
        };
        
        // Add to clients array
        window.clientService.clients.push(testClient);
        console.log('✅ Test client added to ClientService');
        
        // Update UI
        window.clientService.renderClientsList();
        window.clientService.updateClientSelectDropdown();
        console.log('✅ UI updated');
        
        // Test selection
        console.log('🧪 Testing client selection...');
        window.clientService.selectClient(999);
        
        // Check results
        setTimeout(() => {
            const analysisBtn = document.getElementById('start-analysis-btn');
            const clientSelect = document.getElementById('client-select');
            
            console.log('🧪 TEST RESULTS:');
            console.log('- Current client:', window.clientService.currentClient?.company);
            console.log('- Client dropdown value:', clientSelect?.value);
            console.log('- Analysis button disabled:', analysisBtn?.disabled);
            console.log('- Analysis button title:', analysisBtn?.title);
            
            if (window.clientService.currentClient && clientSelect?.value === '999') {
                console.log('✅ CLIENT SELECTION WORKING!');
                
                // Test with text
                const textArea = document.getElementById('negotiation-text');
                if (textArea) {
                    textArea.value = 'Test negotiation text that is longer than 20 characters for testing purposes.';
                    
                    // Trigger update
                    if (window.clientService.updateAnalysisButtonState) {
                        window.clientService.updateAnalysisButtonState();
                    }
                    
                    setTimeout(() => {
                        console.log('🧪 AFTER ADDING TEXT:');
                        console.log('- Analysis button disabled:', analysisBtn?.disabled);
                        
                        if (!analysisBtn?.disabled) {
                            console.log('🎉 EVERYTHING WORKING! BUTTON ENABLED!');
                        } else {
                            console.log('❌ Button still disabled');
                        }
                    }, 100);
                }
                
            } else {
                console.log('❌ CLIENT SELECTION NOT WORKING');
                console.log('Current client:', window.clientService.currentClient);
                console.log('Dropdown value:', clientSelect?.value);
            }
        }, 500);
        
    } else {
        console.log('❌ ClientService not found');
        console.log('Available globals:', Object.keys(window).filter(k => k.includes('Service') || k.includes('service')));
    }
}, 3000);

console.log('🧪 Test scheduled - will run in 3 seconds');