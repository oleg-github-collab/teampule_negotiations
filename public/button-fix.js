/**
 * CRITICAL BUTTON FIX - Patches all non-working buttons
 * This fixes the fucking modal callbacks that aren't working
 */

// Wait for everything to load
window.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 CRITICAL BUTTON FIX - Loading patches...');
    
    // Fix logout button
    setTimeout(() => {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            // Remove all existing listeners
            logoutBtn.replaceWith(logoutBtn.cloneNode(true));
            
            // Add working listener
            document.getElementById('logout-btn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔓 FIXED LOGOUT BUTTON CLICKED');
                
                if (confirm('Ви впевнені, що хочете вийти із системи?')) {
                    // Clear everything
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Make logout API call
                    fetch('/api/logout', { 
                        method: 'POST',
                        credentials: 'include' 
                    }).finally(() => {
                        console.log('🔓 Redirecting to login...');
                        window.location.href = '/login';
                    });
                }
            });
            console.log('🔧 Logout button FIXED');
        }
        
        // Fix help/onboarding button
        const helpBtn = document.getElementById('help-toggle');
        if (helpBtn) {
            helpBtn.replaceWith(helpBtn.cloneNode(true));
            
            document.getElementById('help-toggle').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎓 FIXED HELP BUTTON CLICKED');
                
                const onboardingModal = document.getElementById('onboarding-modal');
                if (onboardingModal) {
                    onboardingModal.style.display = 'flex';
                    console.log('🎓 Onboarding modal shown');
                }
            });
            console.log('🔧 Help button FIXED');
        }
        
        // Fix delete client buttons
        function fixDeleteButtons() {
            document.querySelectorAll('.delete-client-btn').forEach(btn => {
                const clientId = btn.dataset.clientId;
                if (!clientId) return;
                
                // Clone to remove all listeners
                const newBtn = btn.cloneNode(true);
                btn.replaceWith(newBtn);
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🗑️ FIXED DELETE BUTTON CLICKED for client ${clientId}`);
                    
                    if (confirm('Ви впевнені, що хочете видалити цього клієнта?')) {
                        console.log(`🗑️ User confirmed deletion of client ${clientId}`);
                        
                        // Make delete API call
                        fetch(`/api/clients/${clientId}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        })
                        .then(response => response.json())
                        .then(result => {
                            if (result.success) {
                                console.log('🗑️ Client deleted successfully');
                                alert('Клієнт видалено успішно');
                                // Reload page or update UI
                                window.location.reload();
                            } else {
                                throw new Error(result.error || 'Delete failed');
                            }
                        })
                        .catch(error => {
                            console.error('🗑️ Delete error:', error);
                            alert('Помилка видалення: ' + error.message);
                        });
                    }
                });
            });
            console.log('🔧 Delete buttons FIXED');
        }
        
        // Fix delete buttons initially and on content changes
        fixDeleteButtons();
        
        // Watch for new delete buttons
        const observer = new MutationObserver(() => {
            fixDeleteButtons();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
    }, 2000); // Wait 2 seconds for everything to load
});

console.log('🔧 CRITICAL BUTTON FIX script loaded');