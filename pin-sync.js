// pin-sync.js — Shared PIN Sync Module
// Used by both RealorNah and DoYouKnowMe
// Include AFTER Firebase is initialized on the page.
// Expects: window._pinDb (Firestore instance), window._pinCollection (e.g. "pins" or "dykm_pins")

(function() {
    // ── Styles ──────────────────────────────────────────────────────────────────
    const css = `
    /* ── PIN Modal ───────────────────────────────────────── */
    .pin-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(8px);z-index:600;display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:all .3s}
    .pin-modal-backdrop.active{opacity:1;visibility:visible}
    .pin-modal{background:var(--card-bg);border:2px solid var(--electric-purple);border-radius:24px 24px 0 0;padding:1.5rem;width:100%;max-width:480px;animation:pinSlideUp .35s cubic-bezier(.34,1.56,.64,1)}
    @keyframes pinSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    .pin-modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem}
    .pin-modal-title{font-family:'Bungee Shade',cursive;font-size:1.1rem;background:linear-gradient(135deg,var(--neon-pink),var(--electric-purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .pin-modal-close{width:36px;height:36px;border-radius:50%;background:rgba(255,0,110,.15);border:1.5px solid var(--neon-pink);color:var(--neon-pink);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s}
    .pin-modal-close:hover{background:var(--neon-pink);color:white}
    /* Tabs */
    .pin-tabs{display:flex;gap:.5rem;margin-bottom:1.25rem;background:var(--input-bg);border-radius:14px;padding:4px}
    .pin-tab{flex:1;padding:.6rem;border-radius:10px;border:none;font-family:'Righteous',cursive;font-size:.85rem;cursor:pointer;transition:all .25s;color:rgba(255,255,255,.5);background:transparent}
    .pin-tab.active{background:linear-gradient(135deg,var(--neon-pink),var(--electric-purple));color:white;box-shadow:0 4px 12px rgba(255,0,110,.3)}
    /* PIN display */
    .pin-display-section{text-align:center;padding:.5rem 0}
    .pin-label{font-family:'Chewy',cursive;font-size:.9rem;color:rgba(255,255,255,.6);margin-bottom:.875rem}
    .pin-code-wrap{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:.75rem}
    .pin-code-box{display:flex;gap:.375rem}
    .pin-digit{width:46px;height:56px;background:var(--input-bg);border:2px solid var(--electric-purple);border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:'Rubik Bubbles',cursive;font-size:1.6rem;color:var(--neon-pink);letter-spacing:0;transition:all .3s;position:relative}
    .pin-digit.has-value{border-color:var(--neon-pink);box-shadow:0 0 12px rgba(255,0,110,.25)}
    .pin-copy-btn{width:42px;height:42px;background:rgba(131,56,236,.2);border:2px solid var(--electric-purple);border-radius:12px;color:var(--electric-purple);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:all .3s;flex-shrink:0}
    .pin-copy-btn:hover{background:var(--electric-purple);color:white}
    .pin-hint{font-family:'Chewy',cursive;font-size:.8rem;color:rgba(255,255,255,.45);line-height:1.5}
    .pin-regen-btn{margin-top:.875rem;display:flex;align-items:center;justify-content:center;gap:.4rem;padding:.6rem 1.25rem;background:transparent;border:1.5px dashed rgba(131,56,236,.5);border-radius:10px;color:rgba(255,255,255,.5);font-family:'Righteous',cursive;font-size:.8rem;cursor:pointer;transition:all .3s;width:100%}
    .pin-regen-btn:hover{border-color:var(--neon-pink);color:var(--neon-pink)}
    /* Enter PIN section */
    .pin-enter-section{padding:.25rem 0}
    .pin-enter-label{font-family:'Chewy',cursive;font-size:.9rem;color:rgba(255,255,255,.6);margin-bottom:.875rem;text-align:center}
    .pin-input-row{display:flex;gap:.375rem;justify-content:center;margin-bottom:1rem}
    .pin-char-input{width:54px;height:62px;background:var(--input-bg);border:2px solid rgba(131,56,236,.4);border-radius:12px;text-align:center;font-family:'Rubik Bubbles',cursive;font-size:1.6rem;color:white;outline:none;transition:all .3s;-webkit-appearance:none;caret-color:var(--neon-pink)}
    .pin-char-input:focus{border-color:var(--neon-pink);box-shadow:0 0 15px rgba(255,0,110,.25)}
    .pin-char-input.filled{border-color:var(--electric-purple)}
    .pin-sync-btn{width:100%;padding:.875rem;background:linear-gradient(135deg,var(--hot-orange),var(--neon-pink));border:none;border-radius:14px;color:white;font-family:'Rubik Bubbles',cursive;font-size:1rem;cursor:pointer;transition:all .3s;display:flex;align-items:center;justify-content:center;gap:.5rem;box-shadow:0 6px 20px rgba(255,0,110,.3)}
    .pin-sync-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 30px rgba(255,0,110,.5)}
    .pin-sync-btn:disabled{opacity:.5;cursor:not-allowed}
    .pin-status{font-family:'Chewy',cursive;font-size:.85rem;text-align:center;margin-top:.75rem;min-height:1.2rem;transition:all .3s}
    .pin-status.ok{color:var(--cyan-blast)}
    .pin-status.err{color:var(--neon-pink)}
    /* PIN badge on nav */
    .pin-nav-btn{width:38px;height:38px;background:rgba(255,0,110,.15);border:2px solid var(--neon-pink);border-radius:10px;color:var(--neon-pink);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:all .3s;flex-shrink:0;position:relative}
    .pin-nav-btn:hover{background:rgba(255,0,110,.3)}
    .pin-nav-btn .pin-active-dot{position:absolute;top:3px;right:3px;width:7px;height:7px;background:var(--cyan-blast);border-radius:50%;display:none;box-shadow:0 0 6px var(--cyan-blast)}
    .pin-nav-btn.synced .pin-active-dot{display:block}
    /* Regen confirm mini-toast */
    .pin-regen-confirm{background:var(--input-bg);border:1.5px solid var(--neon-pink);border-radius:12px;padding:.75rem 1rem;margin-top:.75rem;display:none;flex-direction:column;gap:.5rem}
    .pin-regen-confirm.show{display:flex}
    .pin-regen-confirm-msg{font-family:'Chewy',cursive;font-size:.85rem;color:rgba(255,255,255,.8);text-align:center}
    .pin-regen-btns{display:flex;gap:.5rem}
    .pin-regen-yes{flex:1;padding:.5rem;background:linear-gradient(135deg,var(--hot-orange),var(--neon-pink));border:none;border-radius:8px;color:white;font-family:'Righteous',cursive;font-size:.8rem;cursor:pointer}
    .pin-regen-no{flex:1;padding:.5rem;background:transparent;border:1.5px solid rgba(131,56,236,.4);border-radius:8px;color:rgba(255,255,255,.6);font-family:'Righteous',cursive;font-size:.8rem;cursor:pointer}
    .pin-modal{
  max-width:420px;
  width:92%;
  padding:1.2rem;
  border-radius:18px;
}
.pin-digit{
  width:38px;
  height:48px;
  font-size:1.3rem;
}

.pin-char-input{
  width:42px;
  height:50px;
  font-size:1.3rem;
}
@media (max-width:480px){
  .pin-modal{
    width:95%;
    padding:1rem;
  }

  .pin-digit{
    width:34px;
    height:44px;
    font-size:1.2rem;
  }

  .pin-char-input{
    width:38px;
    height:46px;
    font-size:1.2rem;
  }
}

    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ── HTML ────────────────────────────────────────────────────────────────────
    const html = `
    <div class="pin-modal-backdrop" id="pinModal">
        <div class="pin-modal">
            <div class="pin-modal-header">
                <div class="pin-modal-title">
                    <span class="iconify" data-icon="ph:key-bold"></span> Quiz Sync PIN
                </div>
                <button class="pin-modal-close" onclick="PinSync.close()">
                    <span class="iconify" data-icon="ph:x-bold"></span>
                </button>
            </div>
            <div class="pin-tabs">
                <button class="pin-tab active" id="pinTabMy" onclick="PinSync.tab('my')">
                    <span class="iconify" data-icon="ph:key-bold"></span> My PIN
                </button>
                <button class="pin-tab" id="pinTabEnter" onclick="PinSync.tab('enter')">
                    <span class="iconify" data-icon="ph:arrow-square-in-bold"></span> Enter PIN
                </button>
            </div>

            <!-- My PIN tab -->
            <div id="pinTabMyContent" class="pin-display-section">
                <p class="pin-label">Your unique quiz sync PIN</p>
                <div class="pin-code-wrap">
                    <div class="pin-code-box" id="pinDigitBox">
                        <div class="pin-digit" id="pd0">—</div>
                        <div class="pin-digit" id="pd1">—</div>
                        <div class="pin-digit" id="pd2">—</div>
                        <div class="pin-digit" id="pd3">—</div>
                        <div class="pin-digit" id="pd4">—</div>
                        <div class="pin-digit" id="pd5">—</div>
                    </div>
                    <button class="pin-copy-btn" id="pinCopyBtn" onclick="PinSync.copyPin()" title="Copy PIN">
                        <span class="iconify" data-icon="ph:copy-bold"></span>
                    </button>
                </div>
                <p class="pin-hint">Share this PIN on another device to sync all<br>your quizzes instantly. No account needed.</p>
                <button class="pin-regen-btn" onclick="PinSync._showRegenConfirm()">
                    <span class="iconify" data-icon="ph:arrows-clockwise-bold"></span> Generate new PIN (clears sync)
                </button>
                <div class="pin-regen-confirm" id="pinRegenConfirm">
                    <div class="pin-regen-confirm-msg">Old PIN will stop working. Sure?</div>
                    <div class="pin-regen-btns">
                        <button class="pin-regen-no" onclick="PinSync._hideRegenConfirm()">Cancel</button>
                        <button class="pin-regen-yes" onclick="PinSync._doRegen()">Yes, New PIN</button>
                    </div>
                </div>
            </div>

            <!-- Enter PIN tab -->
            <div id="pinTabEnterContent" class="pin-enter-section" style="display:none">
                <p class="pin-enter-label">Enter PIN from another device to import quizzes</p>
                <div class="pin-input-row" id="pinInputRow">
                    <input class="pin-char-input" id="pinIn0" maxlength="1" inputmode="text" autocomplete="off">
                    <input class="pin-char-input" id="pinIn1" maxlength="1" inputmode="text" autocomplete="off">
                    <input class="pin-char-input" id="pinIn2" maxlength="1" inputmode="text" autocomplete="off">
                    <input class="pin-char-input" id="pinIn3" maxlength="1" inputmode="text" autocomplete="off">
                    <input class="pin-char-input" id="pinIn4" maxlength="1" inputmode="text" autocomplete="off">
                    <input class="pin-char-input" id="pinIn5" maxlength="1" inputmode="text" autocomplete="off">
                </div>
                <button class="pin-sync-btn" id="pinSyncBtn" onclick="PinSync.syncFromPin()" disabled>
                    <span class="iconify" data-icon="ph:arrow-square-in-bold"></span> Sync Quizzes
                </button>
                <div class="pin-status" id="pinStatus"></div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // ── Core Logic ───────────────────────────────────────────────────────────────
    window.PinSync = {
        _pin: null,
        _collection: null,
        _lsKey: 'myQuizIds',

        init(db, collection, lsKey) {
            this._db = db;
            this._collection = collection;
            this._lsKey = lsKey || 'myQuizIds';
            this._pin = localStorage.getItem('quizSyncPin');
            if (!this._pin) {
                this._pin = this._generate();
                localStorage.setItem('quizSyncPin', this._pin);
            }
            this._renderPin();
            this._setupInputs();
            this._updateNavBtn();
            if (window.Iconify) window.Iconify.scan();
        },

        _generate() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let p = '';
            for (let i = 0; i < 6; i++) p += chars[Math.floor(Math.random() * chars.length)];
            return p;
        },

        _renderPin() {
            const p = this._pin || '------';
            for (let i = 0; i < 6; i++) {
                const el = document.getElementById('pd' + i);
                if (!el) continue;
                el.textContent = p[i] || '—';
                el.classList.toggle('has-value', !!p[i]);
            }
        },

        _updateNavBtn() {
            const btn = document.getElementById('pinNavBtn');
            if (!btn) return;
            // show synced dot if localStorage has IDs
            const ids = JSON.parse(localStorage.getItem(this._lsKey) || '[]');
            btn.classList.toggle('synced', ids.length > 0);
        },

        _setupInputs() {
            const self = this;
            for (let i = 0; i < 6; i++) {
                const el = document.getElementById('pinIn' + i);
                if (!el) continue;
                (function(idx, input) {
                    input.addEventListener('input', function() {
    let val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // If user pasted full PIN in one input
    if (val.length > 1) {
        val = val.slice(0,6);
        for (let j = 0; j < 6; j++) {
            let inp = document.getElementById('pinIn' + j);
            if (inp) {
                inp.value = val[j] || '';
                inp.classList.toggle('filled', !!inp.value);
            }
        }
        document.getElementById('pinIn' + (val.length-1))?.focus();
        self._checkSyncBtn();
        return;
    }

    input.value = val;
    input.classList.toggle('filled', !!input.value);

    if (input.value && idx < 5) {
        document.getElementById('pinIn' + (idx + 1))?.focus();
    }

    self._checkSyncBtn();
});
                    input.addEventListener('keydown', function(e) {
                        if (e.key === 'Backspace' && !input.value && idx > 0) {
                            var prev = document.getElementById('pinIn' + (idx - 1));
                            if (prev) prev.focus();
                        }
                    });
                    input.addEventListener('paste', function(e) {
    e.preventDefault();

    let text = (e.clipboardData || window.clipboardData)
        .getData('text')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);

    if (!text) return;

    for (let j = 0; j < 6; j++) {
        let inp = document.getElementById('pinIn' + j);
        if (inp) {
            inp.value = text[j] || '';
            inp.classList.toggle('filled', !!inp.value);
        }
    }

    // Move focus to last filled input
    let lastIndex = Math.min(text.length - 1, 5);
    document.getElementById('pinIn' + lastIndex)?.focus();

    // Enable button check
    self._checkSyncBtn();
});
                })(i, el);
            }
        },

        _checkSyncBtn() {
            const full = this._getEnteredPin().length === 6;
            const btn = document.getElementById('pinSyncBtn');
            if (btn) btn.disabled = !full;
        },

        _getEnteredPin() {
            let p = '';
            for (let i = 0; i < 6; i++) p += (document.getElementById('pinIn' + i)?.value || '');
            return p;
        },

        _setStatus(msg, type) {
            const el = document.getElementById('pinStatus');
            if (!el) return;
            el.textContent = msg;
            el.className = 'pin-status ' + (type || '');
        },

        open() {
            document.getElementById('pinModal')?.classList.add('active');
            this.tab('my');
            if (window.Iconify) window.Iconify.scan();
        },

        close() {
            document.getElementById('pinModal')?.classList.remove('active');
        },

        tab(which) {
            document.getElementById('pinTabMyContent').style.display = which === 'my' ? 'block' : 'none';
            document.getElementById('pinTabEnterContent').style.display = which === 'enter' ? 'block' : 'none';
            document.getElementById('pinTabMy').classList.toggle('active', which === 'my');
            document.getElementById('pinTabEnter').classList.toggle('active', which === 'enter');
            this._setStatus('', '');
            if (window.Iconify) window.Iconify.scan();
        },

        copyPin() {
            navigator.clipboard.writeText(this._pin).then(() => {
                const btn = document.getElementById('pinCopyBtn');
                if (btn) { btn.innerHTML = '<span class="iconify" data-icon="ph:check-bold"></span>'; if (window.Iconify) window.Iconify.scan(); }
                setTimeout(() => { if (btn) { btn.innerHTML = '<span class="iconify" data-icon="ph:copy-bold"></span>'; if (window.Iconify) window.Iconify.scan(); } }, 2000);
            });
        },

        regenerate() { this._showRegenConfirm(); },

        _showRegenConfirm() {
            const el = document.getElementById('pinRegenConfirm');
            if (el) el.classList.add('show');
        },
        _hideRegenConfirm() {
            const el = document.getElementById('pinRegenConfirm');
            if (el) el.classList.remove('show');
        },
        _doRegen() {
            this._hideRegenConfirm();
            this._pin = this._generate();
            localStorage.setItem('quizSyncPin', this._pin);
            this._renderPin();
            if (window.Iconify) window.Iconify.scan();
        },

        // Called after each quiz is created — saves IDs to Firestore under this PIN
        async pushToFirestore() {
            if (!this._db || !this._collection || !this._pin) return;
            try {
                const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
                const ids = JSON.parse(localStorage.getItem(this._lsKey) || '[]');
                await setDoc(doc(this._db, this._collection, this._pin), {
                    quizIds: ids,
                    updatedAt: new Date().toISOString()
                });
                this._updateNavBtn();
            } catch(e) { console.warn('PIN sync push failed', e); }
        },

        // Enter PIN flow — pull quiz IDs from Firestore
        async syncFromPin() {
            const entered = this._getEnteredPin();
            if (entered.length !== 6) return;

            const btn = document.getElementById('pinSyncBtn');
            btn.disabled = true;
            btn.innerHTML = '<span class="iconify" data-icon="ph:circle-notch-bold" style="animation:spin .8s linear infinite;display:inline-block"></span> Syncing…';
            if (window.Iconify) window.Iconify.scan();
            this._setStatus('', '');

            try {
                const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
                const snap = await getDoc(doc(this._db, this._collection, entered));

                if (!snap.exists()) {
                    this._setStatus('No quizzes found for that PIN. Check and try again.', 'err');
                } else {
                    const data = snap.data();
                    const incoming = data.quizIds || [];
                    const existing = JSON.parse(localStorage.getItem(this._lsKey) || '[]');
                    const merged = [...new Set([...existing, ...incoming])];
                    localStorage.setItem(this._lsKey, JSON.stringify(merged));
                    const newCount = merged.length - existing.length;
                    this._setStatus(`✓ Synced! ${newCount > 0 ? newCount + ' new quiz' + (newCount !== 1 ? 'es' : '') + ' added.' : 'Already up to date.'}`, 'ok');
                    this._updateNavBtn();
                    // Reload quiz list if available
                    if (typeof loadMyQuizzes === 'function') setTimeout(loadMyQuizzes, 800);
                }
            } catch(e) {
                console.error(e);
                this._setStatus('Sync failed. Check your connection.', 'err');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span class="iconify" data-icon="ph:arrow-square-in-bold"></span> Sync Quizzes';
                if (window.Iconify) window.Iconify.scan();
            }
        }
    };

    // Close on backdrop click
    document.getElementById('pinModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('pinModal')) PinSync.close();
    });
})();
