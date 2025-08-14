// Emergency fix and test script
// This script will run after page load to test and fix issues

console.log('🔧 Emergency fix script loaded');

// Wait for the main app to load
setTimeout(() => {
    console.log('🔧 Running emergency tests and fixes...');
    
    // Test 1: Check if TeamPulseDebug is available
    if (window.TeamPulseDebug) {
        console.log('✅ TeamPulseDebug available with functions:', Object.keys(window.TeamPulseDebug));
        
        // Test basic function calls
        const testFunctions = [
            { name: 'showClientForm', test: () => window.TeamPulseDebug.showClientForm },
            { name: 'startAnalysis', test: () => window.TeamPulseDebug.startAnalysis },
            { name: 'switchHighlightsView', test: () => window.TeamPulseDebug.switchHighlightsView }
        ];
        
        testFunctions.forEach(func => {
            if (func.test()) {
                console.log(`✅ ${func.name} is available`);
            } else {
                console.log(`❌ ${func.name} is NOT available`);
            }
        });
        
    } else {
        console.log('❌ TeamPulseDebug NOT available');
    }
    
    // Test 2: Check DOM elements
    const criticalElements = [
        '#new-client-btn',
        '#start-analysis-btn', 
        '#list-view',
        '#text-view',
        '#client-list',
        '#highlights-list'
    ];
    
    console.log('🔧 Checking critical DOM elements:');
    criticalElements.forEach(selector => {
        const element = document.querySelector(selector);
        console.log(`${element ? '✅' : '❌'} ${selector}: ${!!element}`);
    });
    
    // Test 3: Manual event binding if needed
    const newClientBtn = document.querySelector('#new-client-btn');
    if (newClientBtn && window.TeamPulseDebug) {
        // Force bind the event manually
        newClientBtn.addEventListener('click', () => {
            console.log('🔧 Manual event binding triggered for new-client-btn');
            try {
                window.TeamPulseDebug.showClientForm();
            } catch (error) {
                console.error('🔧 Error calling showClientForm:', error);
            }
        });
        console.log('🔧 Manual event binding applied to new-client-btn');
    }
    
    const startAnalysisBtn = document.querySelector('#start-analysis-btn');
    if (startAnalysisBtn && window.TeamPulseDebug) {
        startAnalysisBtn.addEventListener('click', () => {
            console.log('🔧 Manual event binding triggered for start-analysis-btn');
            try {
                window.TeamPulseDebug.startAnalysis();
            } catch (error) {
                console.error('🔧 Error calling startAnalysis:', error);
            }
        });
        console.log('🔧 Manual event binding applied to start-analysis-btn');
    }
    
    const listViewBtn = document.querySelector('#list-view');
    if (listViewBtn && window.TeamPulseDebug) {
        listViewBtn.addEventListener('click', () => {
            console.log('🔧 Manual event binding triggered for list-view');
            try {
                window.TeamPulseDebug.switchHighlightsView('list');
            } catch (error) {
                console.error('🔧 Error calling switchHighlightsView:', error);
            }
        });
        console.log('🔧 Manual event binding applied to list-view');
    }
    
    const textViewBtn = document.querySelector('#text-view');
    if (textViewBtn && window.TeamPulseDebug) {
        textViewBtn.addEventListener('click', () => {
            console.log('🔧 Manual event binding triggered for text-view');
            try {
                window.TeamPulseDebug.switchHighlightsView('text');
            } catch (error) {
                console.error('🔧 Error calling switchHighlightsView:', error);
            }
        });
        console.log('🔧 Manual event binding applied to text-view');
    }
    
    // Test 4: Add emergency test buttons to page
    const emergencyPanel = document.createElement('div');
    emergencyPanel.id = 'emergency-test-panel';
    emergencyPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #333;
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 9999;
        font-family: monospace;
        font-size: 12px;
        max-width: 300px;
    `;
    emergencyPanel.innerHTML = `
        <div style="margin-bottom: 10px;"><strong>🔧 Emergency Test Panel</strong></div>
        <button onclick="window.TeamPulseDebug?.showClientForm(); console.log('Test: showClientForm called')">Test Client Form</button>
        <button onclick="window.TeamPulseDebug?.startAnalysis(); console.log('Test: startAnalysis called')">Test Analysis</button>
        <button onclick="window.TeamPulseDebug?.switchHighlightsView('list'); console.log('Test: switchHighlightsView called')">Test View Switch</button>
        <button onclick="this.parentElement.remove()">Close Panel</button>
    `;
    
    // Add some basic styles
    const buttons = emergencyPanel.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.style.cssText = `
            display: block;
            width: 100%;
            margin: 2px 0;
            padding: 5px;
            background: #a855f7;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        `;
    });
    
    document.body.appendChild(emergencyPanel);
    console.log('🔧 Emergency test panel added to page');
    
}, 3000); // Wait 3 seconds for everything to load