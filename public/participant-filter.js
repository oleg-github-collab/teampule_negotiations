// Participant Filter - Frontend Module
(() => {
    'use strict';

    // DOM Elements
    const elements = {
        filterSection: document.getElementById('participant-filter-section'),
        checkboxesContainer: document.getElementById('participants-checkboxes'),
        actionsContainer: document.getElementById('participant-actions'),
        filterInfo: document.getElementById('filter-info'),
        participantsCount: document.getElementById('participants-count'),
        negotiationText: document.getElementById('negotiation-text'),
        modeRadios: document.querySelectorAll('input[name="participant-mode"]'),
    };

    // State
    let detectedParticipants = [];
    let selectedParticipants = [];

    /**
     * Extract participants from conversation text
     */
    function extractParticipantsFromText(text) {
        if (!text || text.length < 10) return [];

        const patterns = [
            /^([А-ЯЁA-Z][а-яёa-zA-Z\s'\-]{1,48}):/gm,        // "Name:"
            /^([А-ЯЁA-Z][а-яёa-zA-Z\s'\-]{1,48})\s*-\s*/gm,  // "Name -"
            /\[([А-ЯЁA-Z][а-яёa-zA-Z\s'\-]{1,48})\]/g,       // "[Name]"
            /^([А-ЯЁA-Z][а-яёa-zA-Z\s'\-]{1,48})>/gm,        // "Name>"
        ];

        const participants = new Set();
        const excludeWords = new Set([
            'Re', 'Fw', 'Fwd', 'Subject', 'From', 'To', 'Date',
            'Sent', 'Received', 'CC', 'BCC', 'Attachment', 'Email'
        ]);

        patterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const name = match[1].trim();

                // Filter out false positives
                if (name.length >= 2 &&
                    name.length <= 50 &&
                    !excludeWords.has(name) &&
                    !name.match(/^\d/) && // Not starting with number
                    !name.match(/^[A-Z]{2,}$/) // Not all caps abbreviation
                ) {
                    participants.add(name);
                }
            }
        });

        return Array.from(participants).sort();
    }

    /**
     * Show participant filter UI
     */
    function showParticipantFilter(text) {
        if (!elements.filterSection) return;

        const participants = extractParticipantsFromText(text);
        detectedParticipants = participants;

        if (participants.length === 0) {
            elements.filterSection.style.display = 'none';
            return;
        }

        // Show filter section
        elements.filterSection.style.display = 'block';
        if (elements.actionsContainer) {
            elements.actionsContainer.style.display = 'none';
        }

        // Update count
        if (elements.participantsCount) {
            elements.participantsCount.textContent = participants.length;
        }
        if (elements.filterInfo) {
            elements.filterInfo.style.display = 'block';
        }

        // Render checkboxes
        if (elements.checkboxesContainer) {
            elements.checkboxesContainer.innerHTML = participants.map((name, index) => `
                <label class="participant-checkbox" data-participant="${name}">
                    <input
                        type="checkbox"
                        value="${name}"
                        id="participant-${index}"
                        checked
                    >
                    <span class="checkbox-mark"></span>
                    <span class="participant-name">${name}</span>
                </label>
            `).join('');

            // Add checkbox change listeners
            elements.checkboxesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', updateSelectedParticipants);
            });
        }

        const isCustom = document.querySelector('input[name="participant-mode"]:checked')?.value === 'custom';
        if (elements.checkboxesContainer) {
            elements.checkboxesContainer.style.display = isCustom ? 'grid' : 'none';
        }
        if (elements.actionsContainer) {
            elements.actionsContainer.style.display = isCustom ? 'flex' : 'none';
        }

        // Initialize selected
        selectedParticipants = [...participants];
    }

    /**
     * Update selected participants list
     */
    function updateSelectedParticipants() {
        if (!elements.checkboxesContainer) return;

        const checkboxes = elements.checkboxesContainer.querySelectorAll('input[type="checkbox"]:checked');
        selectedParticipants = Array.from(checkboxes).map(cb => cb.value);

        console.log('Selected participants:', selectedParticipants);
    }

    /**
     * Get selected participants for analysis
     */
    function getSelectedParticipants() {
        if (!elements.filterSection || elements.filterSection.style.display === 'none') {
            return null; // No filter active
        }

        const mode = document.querySelector('input[name="participant-mode"]:checked')?.value;

        if (mode === 'all') {
            return null; // Analyze all
        }

        return selectedParticipants.length > 0 ? selectedParticipants : null;
    }

    /**
     * Reset filter
     */
    function resetFilter() {
        detectedParticipants = [];
        selectedParticipants = [];

        if (elements.filterSection) {
            elements.filterSection.style.display = 'none';
        }
        if (elements.checkboxesContainer) {
            elements.checkboxesContainer.innerHTML = '';
        }
        if (elements.actionsContainer) {
            elements.actionsContainer.style.display = 'none';
        }
        if (elements.filterInfo) {
            elements.filterInfo.style.display = 'none';
        }

        // Reset mode to "all"
        const allRadio = document.querySelector('input[name="participant-mode"][value="all"]');
        if (allRadio) allRadio.checked = true;
    }

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        // Text input listener
        if (elements.negotiationText) {
            elements.negotiationText.addEventListener('input', (e) => {
                const text = e.target.value;
                showParticipantFilter(text);
            });
        }

        // Mode change listeners
        if (elements.modeRadios) {
            elements.modeRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (elements.checkboxesContainer) {
                        const isCustom = e.target.value === 'custom';
                        elements.checkboxesContainer.style.display = isCustom ? 'grid' : 'none';
                        if (elements.actionsContainer) {
                            elements.actionsContainer.style.display = isCustom ? 'flex' : 'none';
                        }
                    }
                });
            });
        }

        // Select all / Deselect all buttons (if needed)
        const selectAllBtn = document.getElementById('select-all-participants');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                const checkboxes = elements.checkboxesContainer?.querySelectorAll('input[type="checkbox"]');
                checkboxes?.forEach(cb => cb.checked = true);
                updateSelectedParticipants();
            });
        }

        const deselectAllBtn = document.getElementById('deselect-all-participants');
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
                const checkboxes = elements.checkboxesContainer?.querySelectorAll('input[type="checkbox"]');
                checkboxes?.forEach(cb => cb.checked = false);
                updateSelectedParticipants();
            });
        }
    }

    // Export functions to global scope for use by app-neon.js
    window.ParticipantFilter = {
        show: showParticipantFilter,
        get: getSelectedParticipants,
        reset: resetFilter,
        getDetected: () => detectedParticipants,
        getSelected: () => selectedParticipants,
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEventListeners);
    } else {
        initEventListeners();
    }

    console.log('✅ Participant Filter Module loaded');
})();
