// ===== SIMPLE CLIENT CLICK TEST =====
// Run this in browser console: copy and paste

console.clear();
console.log('🚀 STARTING SIMPLE CLIENT TEST...');

// Wait for services
setTimeout(() => {
    console.log('\n📋 CHECKING SERVICES...');
    console.log('ClientService available:', !!window.clientService);
    console.log('Current clients count:', window.clientService?.clients?.length || 0);
    
    if (!window.clientService) {
        console.error('❌ ClientService not found!');
        return;
    }
    
    // Create test client if needed
    if (window.clientService.clients.length === 0) {
        console.log('📝 Creating test client...');
        window.clientService.clients.push({
            id: 888,
            company: 'TEST CLICK COMPANY',
            negotiator: 'Test User',
            sector: 'Testing'
        });
        window.clientService.updateClientCount();
        window.clientService.renderClientsList();
        console.log('✅ Test client created!');
    }
    
    const testClient = window.clientService.clients[0];
    console.log('🎯 Test client:', testClient.company, 'ID:', testClient.id);
    
    // Test direct selection
    console.log('\n🔥 TESTING DIRECT SELECTION...');
    const result = window.clientService.selectClient(testClient.id);
    console.log('Selection result:', result);
    
    setTimeout(() => {
        console.log('\n📊 AFTER SELECTION CHECK:');
        console.log('Current client:', window.clientService.currentClient?.company);
        console.log('Dropdown value:', document.getElementById('client-select')?.value);
        console.log('Active client items:', document.querySelectorAll('.client-item.active').length);
        
        // Test analysis button
        const analysisBtn = document.getElementById('start-analysis-btn');
        console.log('Analysis button disabled:', analysisBtn?.disabled);
        
        // Add text for full test
        const textArea = document.getElementById('negotiation-text');
        if (textArea && !textArea.value) {
            textArea.value = 'Test negotiation text for analysis testing purposes with more than 20 characters.';
            console.log('✅ Text added for analysis test');
            
            // Update button state
            if (window.clientService.updateAnalysisButtonState) {
                window.clientService.updateAnalysisButtonState();
            }
            
            setTimeout(() => {
                console.log('Final analysis button disabled:', analysisBtn?.disabled);
                if (!analysisBtn?.disabled) {
                    console.log('🎉 SUCCESS! EVERYTHING WORKING!');
                } else {
                    console.log('❌ Analysis button still disabled');
                }
            }, 100);
        }
        
    }, 200);
    
}, 2000);

console.log('⏳ Test will start in 2 seconds...');