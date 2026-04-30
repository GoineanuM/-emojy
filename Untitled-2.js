// ==UserScript==
// @name         ITD Emoji Clan Sync
// @namespace    https://github.com/YOUR_USERNAME/emojiclansync
// @version      1.0.0
// @description   Schimbă și sincronizează emoji-ul clanului cu toți prietenii
// @author       tine
// @match        *://xn--d1ah4a.com/*
// @match        *://итд.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_notification
// @downloadURL  https://github.com/YOUR_USERNAME/emojiclansync/raw/main/emojiclansync.user.js
// @updateURL    https://github.com/YOUR_USERNAME/emojiclansync/raw/main/emojiclansync.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ==================== CONFIGURARE JSONBin.io ====================
    // Creează un cont gratuit pe https://jsonbin.io
    // Apoi creează un bin nou cu conținutul: { "emoji": "👨‍🌾", "updatedBy": "", "timestamp": 0 }
    // Completează mai jos datele tale:
    const JSONBIN_BIN_ID = "YOUR_BIN_ID";      // de ex: "65f2a8a8dc74654018a12345"
    const JSONBIN_API_KEY = "YOUR_API_KEY";    // de ex: "$2a$10$abc123..."
    // ================================================================

    const EMOJI_LIST = [
        '😀', '😂', '😎', '🥰', '🤔', '🔥', '✨', '⭐', '❤️', '💀',
        '🐱', '🐶', '🍕', '🎮', '🏆', '👨‍🌾', '👩‍🌾', '👑', '🌸', '🌈',
        '⚡', '💎', '🎉', '🥇', '🍺', '😍', '🥳', '😈', '👻', '🤖'
    ];

    const STORAGE_KEY = 'emoji_avatar_sync';
    const SYNC_INTERVAL = 5000; // verifică la fiecare 5 secunde

    let currentEmojiElement = null;
    let syncInterval = null;
    let lastSyncedEmoji = null;

    // ==================== FUNCȚII JSONBin ====================
    function saveEmojiToCloud(emoji, callback) {
        if (!JSONBIN_BIN_ID || JSONBIN_BIN_ID === "YOUR_BIN_ID") {
            console.warn("⚠️ JSONBin nu este configurat. Sincronizarea nu funcționează.");
            return;
        }
        const data = {
            emoji: emoji,
            updatedBy: navigator.userAgent + " | " + new Date().toISOString(),
            timestamp: Date.now()
        };
        GM_xmlhttpRequest({
            method: 'PUT',
            url: `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`,
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            data: JSON.stringify(data),
            onload: function(response) {
                console.log("✅ Emoji salvat în cloud:", emoji);
                if (callback) callback(true);
            },
            onerror: function(err) {
                console.error("❌ Eroare salvare cloud:", err);
                if (callback) callback(false);
            }
        });
    }

    function loadEmojiFromCloud(callback) {
        if (!JSONBIN_BIN_ID || JSONBIN_BIN_ID === "YOUR_BIN_ID") {
            console.warn("⚠️ JSONBin nu este configurat.");
            return;
        }
        GM_xmlhttpRequest({
            method: 'GET',
            url: `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`,
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            },
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    const emoji = data.record.emoji;
                    if (emoji) {
                        console.log("📡 Emoji primit din cloud:", emoji);
                        if (callback) callback(emoji);
                    }
                } catch(e) {
                    console.error("Eroare parsare cloud:", e);
                }
            },
            onerror: function(err) {
                console.error("Eroare încărcare cloud:", err);
            }
        });
    }

    // ==================== GĂSIRE ELEMENT EMOJI ====================
    function findEmojiElement() {
        return document.querySelector('.CMGU');
    }

    function updateDisplayEmoji(emoji) {
        const el = findEmojiElement();
        if (el && el.textContent !== emoji) {
            el.textContent = emoji;
            console.log("🖼️ Emoji afișat:", emoji);
        }
    }

    // ==================== SCHIMBARE EMOJI (LOCAL + CLOUD) ====================
    function setEmoji(emoji, fromSync = false) {
        updateDisplayEmoji(emoji);
        GM_setValue(STORAGE_KEY, emoji);
        lastSyncedEmoji = emoji;
        
        if (!fromSync) {
            // Trimite către cloud doar dacă nu vine de la sincronizare
            saveEmojiToCloud(emoji);
        }
        
        // Notificare prieteni (doar pentru utilizatorii cu scriptul pe același calculator - opțional)
        try {
            GM_setValue(STORAGE_KEY + '_last', emoji);
        } catch(e) {}
    }

    // ==================== SINCRONIZARE PERIODICĂ ====================
    function syncWithCloud() {
        loadEmojiFromCloud((cloudEmoji) => {
            if (cloudEmoji && cloudEmoji !== lastSyncedEmoji) {
                const current = GM_getValue(STORAGE_KEY, '');
                if (current !== cloudEmoji) {
                    console.log("🔄 Sincronizare: cloud → local", cloudEmoji);
                    setEmoji(cloudEmoji, true);
                }
                lastSyncedEmoji = cloudEmoji;
            }
        });
    }

    function startSync() {
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(syncWithCloud, SYNC_INTERVAL);
    }

    function stopSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }

    // ==================== MENIU EMOJI ====================
    let activeMenu = null;

    function closeMenu() {
        if (activeMenu) {
            activeMenu.remove();
            activeMenu = null;
        }
    }

    function showMenu(emojiElement) {
        closeMenu();

        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #1e1e2e;
            border-radius: 20px;
            padding: 12px;
            z-index: 100000;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            width: 90%;
            max-width: 360px;
            border: 1px solid #555;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            box-sizing: border-box;
        `;

        EMOJI_LIST.forEach(emoji => {
            const btn = document.createElement('button');
            btn.textContent = emoji;
            btn.style.cssText = `
                font-size: 28px;
                background: #313244;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                padding: 10px 5px;
                transition: background 0.2s;
            `;
            btn.onmouseenter = () => btn.style.background = '#45475a';
            btn.onmouseleave = () => btn.style.background = '#313244';
            btn.onclick = (e) => {
                e.stopPropagation();
                setEmoji(emoji, false);
                closeMenu();
                if (typeof GM_notification !== 'undefined') {
                    GM_notification({
                        text: `Emoji schimbat la ${emoji}`,
                        timeout: 2000
                    });
                }
            };
            menu.appendChild(btn);
        });

        document.body.appendChild(menu);
        activeMenu = menu;

        setTimeout(() => {
            const handler = (e) => {
                if (activeMenu && !activeMenu.contains(e.target) && e.target !== emojiElement) {
                    closeMenu();
                    document.removeEventListener('click', handler);
                }
            };
            document.addEventListener('click', handler);
        }, 50);
    }

    // ==================== ACTIVARE CLICK ====================
    function attachClickListener() {
        const emojiElement = findEmojiElement();
        if (!emojiElement) return false;

        if (emojiElement.hasAttribute('data-emoji-sync-bound')) return true;

        emojiElement.setAttribute('data-emoji-sync-bound', 'true');
        emojiElement.style.cursor = 'pointer';
        emojiElement.style.userSelect = 'none';

        emojiElement.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            showMenu(emojiElement);
        });
        return true;
    }

    // ==================== ÎNCĂRCARE EMOJI SALVAT ====================
    function loadSavedEmojiAndSync() {
        const saved = GM_getValue(STORAGE_KEY, '👨‍🌾');
        updateDisplayEmoji(saved);
        lastSyncedEmoji = saved;
        
        // După încărcare, încearcă să se sincronizeze cu cloud
        loadEmojiFromCloud((cloudEmoji) => {
            if (cloudEmoji && cloudEmoji !== saved) {
                setEmoji(cloudEmoji, true);
            }
        });
    }

    // ==================== INIȚIALIZARE ====================
    function init() {
        loadSavedEmojiAndSync();
        attachClickListener();
        startSync();
        
        // Observator pentru navigare SPA (React)
        const observer = new MutationObserver(() => {
            if (findEmojiElement()) {
                attachClickListener();
                loadSavedEmojiAndSync();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        console.log("🚀 Script activ! Click pe emoji pentru a-l schimba. Sincronizare activă.");
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();