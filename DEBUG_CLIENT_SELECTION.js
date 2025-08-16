// ===== DEBUG SCRIPT FOR CLIENT SELECTION =====
// Run this in browser console after page loads

console.log('🔥 STARTING DEBUG SESSION...');

setTimeout(() => {
    console.log('\n🔥 === CLIENT SELECTION DEBUG ===');
    
    // Check services
    console.log('ClientService:', !!window.clientService);
    console.log('AnalysisService:', !!window.analysisService);
    
    if (window.clientService) {
        console.log('Current clients:', window.clientService.clients.length);
        console.log('Current client:', window.clientService.currentClient?.company || 'NONE');
        
        // Create test client if none exist
        if (window.clientService.clients.length === 0) {
            console.log('🔥 Creating test client...');
            const testClient = {
                id: 999,
                company: 'DEBUG Test Company',
                negotiator: 'Test User',
                sector: 'Testing'
            };
            
            window.clientService.clients.push(testClient);
            window.clientService.renderClientsList();
            window.clientService.updateClientSelectDropdown();
            console.log('✅ Test client created!');
        }
        
        // Test client selection
        console.log('\n🔥 Testing client selection...');
        const firstClient = window.clientService.clients[0];
        if (firstClient) {
            console.log('Selecting client:', firstClient.company);
            window.clientService.selectClient(firstClient.id);
            
            setTimeout(() => {
                console.log('\n🔥 === AFTER CLIENT SELECTION ===');
                console.log('CurrentClient:', window.clientService.currentClient?.company);
                console.log('Dropdown value:', document.getElementById('client-select')?.value);
                
                // Test analysis
                console.log('\n🔥 Testing analysis start...');
                const textArea = document.getElementById('negotiation-text');
                if (textArea) {
                    textArea.value = 'This is a test negotiation text that is longer than 20 characters for testing purposes.';
                    console.log('Text added to textarea');
                }
                
                if (window.analysisService) {
                    console.log('🔥 CALLING analysisService.startAnalysis()...');
                    window.analysisService.startAnalysis().then(() => {
                        console.log('✅ Analysis started successfully!');
                    }).catch((error) => {
                        console.log('❌ Analysis failed:', error);
                    });
                } else {
                    console.log('❌ AnalysisService not found!');
                }
                
            }, 500);
        }
    } else {
        console.log('❌ ClientService not found!');
    }
    
}, 3000);

console.log('🔥 Debug scheduled for 3 seconds...');