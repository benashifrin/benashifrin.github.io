// Password gate for the private pages.
//
// The page ships only ciphertext — the writing is not in the HTML source and
// not in this file. The password you type derives the key in your browser and
// decrypts it locally. Nothing is sent anywhere.
//
// Ciphertext is produced by encrypt.js; the two must agree on these numbers.

(function () {
    'use strict';

    var PBKDF2_ITERATIONS = 310000;
    var SESSION_KEY = 'bs-gate-pw';

    function b64ToBytes(b64) {
        var bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }

    function deriveKey(password, salt, iterations) {
        return crypto.subtle
            .importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
            .then(function (material) {
                return crypto.subtle.deriveKey(
                    { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
                    material,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['decrypt']
                );
            });
    }

    // Resolves to the decrypted HTML, or rejects if the password is wrong.
    function decrypt(payloadUrl, password) {
        return fetch(payloadUrl)
            .then(function (res) {
                if (!res.ok) throw new Error('Could not load the encrypted content.');
                return res.json();
            })
            .then(function (payload) {
                var iterations = payload.iterations || PBKDF2_ITERATIONS;
                return deriveKey(password, b64ToBytes(payload.salt), iterations).then(function (key) {
                    return crypto.subtle.decrypt(
                        { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
                        key,
                        b64ToBytes(payload.ciphertext)
                    );
                });
            })
            .then(function (buf) {
                return new TextDecoder().decode(buf);
            });
    }

    // Builds the locked-state UI and swaps in the content once unlocked.
    // opts: { payload, mount, contactUrl }
    function mount(opts) {
        var host = document.getElementById(opts.mount);
        if (!host) return;

        host.innerHTML =
            '<div class="gate">' +
            '<p>This page is private.</p>' +
            '<form class="gate-form" autocomplete="off">' +
            '<input type="password" class="gate-input" placeholder="Password" ' +
            'aria-label="Password" autocomplete="current-password">' +
            '<button type="submit" class="gate-button">Unlock</button>' +
            '</form>' +
            '<p class="gate-error" role="alert" hidden></p>' +
            '<p class="gate-hint">Email <a href="' +
            opts.contactUrl +
            '">ben</a> for the password.</p>' +
            '</div>';

        var form = host.querySelector('.gate-form');
        var input = host.querySelector('.gate-input');
        var button = host.querySelector('.gate-button');
        var error = host.querySelector('.gate-error');

        function reveal(html) {
            host.innerHTML = html;
            // Re-run any scripts the decrypted content brought with it.
            var scripts = host.querySelectorAll('script');
            for (var i = 0; i < scripts.length; i++) {
                var s = document.createElement('script');
                s.textContent = scripts[i].textContent;
                scripts[i].parentNode.replaceChild(s, scripts[i]);
            }
        }

        function attempt(password, fromSession) {
            button.disabled = true;
            button.textContent = 'Unlocking…';
            error.hidden = true;

            return decrypt(opts.payload, password)
                .then(function (html) {
                    // Remember for this tab so the other private page doesn't re-ask.
                    try {
                        sessionStorage.setItem(SESSION_KEY, password);
                    } catch (e) {
                        /* private browsing — just don't remember it */
                    }
                    reveal(html);
                })
                .catch(function (err) {
                    button.disabled = false;
                    button.textContent = 'Unlock';
                    if (fromSession) {
                        // A stale saved password shouldn't shout at you on arrival.
                        try {
                            sessionStorage.removeItem(SESSION_KEY);
                        } catch (e) {}
                        return;
                    }
                    error.hidden = false;
                    error.textContent =
                        err && /load/.test(err.message) ? err.message : 'Wrong password.';
                    input.value = '';
                    input.focus();
                });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (input.value) attempt(input.value, false);
        });

        var saved = null;
        try {
            saved = sessionStorage.getItem(SESSION_KEY);
        } catch (e) {}
        if (saved) {
            attempt(saved, true);
        } else {
            input.focus();
        }
    }

    window.Gate = { decrypt: decrypt, mount: mount, SESSION_KEY: SESSION_KEY };
})();
