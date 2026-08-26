// Site-wide password gate.
//
// This is a *soft* gate: it hides every page behind a password prompt, but the
// page's markup is still in the HTML the browser downloaded. Anyone who turns
// off JavaScript or opens view-source can read past it. It keeps the site out
// of casual hands and out of the way of a curious visitor — it is not privacy.
//
// The genuinely private pages (Thoughts, Check-Ins) stay encrypted by gate.js /
// encrypt.js, where the writing really is absent from the page until the right
// password decrypts it. See PRIVATE.md.
//
// Load this as the FIRST script in <head> on every page.

(function () {
    'use strict';

    var STORE_KEY = 'bs-sitegate';
    // sha256("maninthearena") — the password itself is not in this file.
    var PW_HASH = 'bf83e68e39989a0cf31e2c02fcc0a888f1b3a8b5fe37904e5105338f78faccd5';
    // Fallback for file:// and other non-secure contexts, where crypto.subtle
    // is unavailable. Obfuscated, not secret.
    var PW_XOR = [55, 59, 52, 51, 52, 46, 50, 63, 59, 40, 63, 52, 59];
    var XOR_KEY = 90;

    var root = document.documentElement;

    function unlocked() {
        try {
            return localStorage.getItem(STORE_KEY) === PW_HASH;
        } catch (e) {
            return false;
        }
    }

    function remember() {
        try {
            localStorage.setItem(STORE_KEY, PW_HASH);
        } catch (e) {
            /* private browsing — they'll just retype it next visit */
        }
    }

    function toHex(buf) {
        var bytes = new Uint8Array(buf);
        var out = '';
        for (var i = 0; i < bytes.length; i++) {
            out += (bytes[i] >>> 4).toString(16) + (bytes[i] & 15).toString(16);
        }
        return out;
    }

    function check(password) {
        if (window.crypto && crypto.subtle && crypto.subtle.digest) {
            return crypto.subtle
                .digest('SHA-256', new TextEncoder().encode(password))
                .then(function (buf) {
                    return toHex(buf) === PW_HASH;
                })
                .catch(function () {
                    return fallbackCheck(password);
                });
        }
        return Promise.resolve(fallbackCheck(password));
    }

    function fallbackCheck(password) {
        if (password.length !== PW_XOR.length) return false;
        var ok = 0;
        for (var i = 0; i < PW_XOR.length; i++) {
            ok |= password.charCodeAt(i) ^ XOR_KEY ^ PW_XOR[i];
        }
        return ok === 0;
    }

    /* ---------------------------------------------------------------- art -- */

    // A pixel scene: the man in the arena, sword up, monster across from him.
    // Each string is one row; characters index PALETTE, '.' is transparent,
    // and short rows just stop early. Two frames, swapped on a timer.

    var PALETTE = {
        k: '#171420', // outline
        S: '#241d33', // night sky over the arena
        t: '#7d6a52', // stone shadow, cornice, torch poles
        m: '#a8906e', // stone
        M: '#8a7458', // stands, in shadow
        A: '#1d1830', // the dark of an archway
        f: '#ff8b2d', // torch flame
        F: '#ffd54a', // flame tip, sparks
        r: '#c0392b', // banners, tunic, plume
        g: '#e0a13a', // bronze
        s: '#f4c9a3', // skin
        d: '#3b2f2f', // greaves
        o: '#7a5230', // boots
        b: '#9fb6c9', // steel, shield
        w: '#f2f7fb', // blade, teeth, stars
        n: '#4d7a34', // monster
        p: '#7cb356', // monster, lit from above
        y: '#ffd54a', // eyes
        a: '#d9b878', // sand
        e: '#c19a5c', // sand, trodden
        '1': '#d76b6b', // — the crowd —
        '2': '#6b8fd7',
        '3': '#d7c46b',
        '4': '#8fd76b',
        '5': '#c98fd7'
    };

    var FRAME_A = [
        'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
        'SSSSwSSSSSSSSwSSSSSSSSSSSSSwSSSSSSSSwSSS',
        'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
        'tttttttttttttttttttttttttttttttttttttttt',
        'tttttttttttttttttttttttttttttttttttttttt',
        'tmmgmmtmmgmmtmmgmmtmmgmmtmmgmmtmmgmmmmmm',
        'tmmAmmtmmAmmtmmAmmtmmAmmtmmAmmtmmAmmmmmm',
        'tmAAAmtmAAAmtmAAAmtmAAAmtmAAAmtmAAAmmmmm',
        'tmAAAmtmAAAmtmAAAmtmAAAmtmAAAmtmAAAmmmmm',
        'tmAAAmtmAAAmtmAAAmtmAAAmtmAAAmtmAAAmmmmm',
        'tmAAAmtmAAAmtmAAAmtmAAAmtmAAAmtmAAAmmmmm',
        'tmAAAmtmAAAmtmAAAmtmAAAmtmAAAmtmAAAmmmmm',
        'tttttttttttttttttttttttttttttttttttttttt',
        '1MM2MM3MM4MM5MM2MM3MM4MM1MM5MM3MM4MM2MM1',
        'FFM2tM3tM4tM5tM2tM3tM4tM1tM5tM3tM4tM2tFF',
        'ffMM3MM4MM2MM1MM5MM3MM4MM2MM1MM5MM3MM4ff',
        'fftM3tM4tkkkM1kM5tM3tM4tM2tM1tM5tM3tM4ff',
        'ffttttttkrrrkkwkttttttttttttttttttttttff',
        'ttrrmggkgggggkwkmrrrmgggmrrrmgggmrrrmgtt',
        'ttrrmggkgggggkwkmrrrmgggmrrkmgggkrrrmgtt',
        'ttrmmkkkgsskgkwkmmrmmmgmmmknkmgknkrmmmtt',
        'ttmmkbbkkssskkwkmmmmmmmmmknkkkkkknkmmmtt',
        'ttmmkbbsrrrrrgggkmmmmmmmmknppppppnkmmmtt',
        'ttmmkggsrrrrrsbkmmmmmmmmmknnnnnnnnkmmmtt',
        'mmmmkbbsrrrrrskmmmmmmmmmmknyynnyynkmmmmm',
        'mmmmkbbkgggggkmmmmmmmmmmmknnnnnnnnkmmmmm',
        'mmmmmkkkddkddkmmmmmmmmmmmknwwwwwwnkmmmmm',
        'mmmmmmmkddkddkmmmmmmmmmmmknnwnwnwnkmmmmm',
        'mmmmmmmkddkddkmmmmmmmmmmmknnnnnnnnkmmmmm',
        'mmmmmmkoookoookmmmmmmmmmmmknnkknnkmmmmmm',
        'aaaaaaakkkakkkaaaaaaaaaaaaakkaakkaaaaaaa',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'eaeeeeeeaeeeeeeaeeeeeeaeeeeeeaeeeeeeaeee',
        'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    ];

    var FRAME_B = [
        'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
        'SSSSwSSSSSSSSwSSSSSSSSSSSSSwSSSSSSSSwSSS',
        'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
        'tttttttttttttttttttttttttttttttttttttttt',
        'tttttttttttttttttttttttttttttttttttttttt',
        'tmmgmmtmmgmmtmmgmmtmmgmmtmmgmmtmmgmmmmmm',
        'tmmAmmtmmAmmtmmAmmtmmAmmtmmAmmtmmAmmmmmm',
        'tmAAAmtmAAAmtmAAAmtmAAAmtmAAAmtmAAAmmmmm',
        'tmAAAmtmAAAmtmAAAmtmAAAmtmAAAmtmAAAmmmmm',
        'tmAAAmtmAAAmtmAAAmtmAAAmtmAAAmtmAAAmmmmm',
        'tmAAAmtmAAAmtmAAAmtmAAAmtmAAAmtmAAAmmmmm',
        'tmAAAmtmAAAmtmAAAmtmAAAmtmAAAmtmAAAmmmmm',
        'tttttttttttttttttttttttttttttttttttttttt',
        'FMM2MM3MM4MM5MM2MM3MM4MM1MM5MM3MM4MM2MF1',
        'FFM2tM3tM4tM5tM2tM3tM4tM1tM5tM3tM4tM2tFF',
        'ffMM3MM4MM2MM1MM5MM3MM4MM2MM1MM5MM3MM4ff',
        'fftM3tM4tkkkM1tM5tM3tM4tM2tM1tM5tM3tM4ff',
        'ffttttttkrrrktttttttttttttttttttttttttff',
        'ttrrmggkgggggkggmrrrmgggmrrrmgggmrrrmgtt',
        'ttrrmggkgggggkggmrrrmgggmryrkgggmkrrmgtt',
        'ttrmmkkkgsskgkgmmmrmmmgmmmrknkgmknkmmmtt',
        'ttmmkbbkkssskkkmmmmmmmmmmyknkkkkkknkmmtt',
        'ttmmkbbsrrrrrsgkkkkkkkkkkkknppppppnkmmtt',
        'ttmmkggsrrrrrsgwwwwwwwwwwwknnnnnnnnkmmtt',
        'mmmmkbbsrrrrrsgkkkkkkkkkkkknwynnywnkmmmm',
        'mmmmkbbkgggggkkmmmmmmmmmymknnnnnnnnkmmmm',
        'mmmmmkkkddkddkmmmmmmmmmmmmknwwwwwwnkmmmm',
        'mmmmmmmkddkddkmmmmmmmmmmmmknnwnwnwnkmmmm',
        'mmmmmmmkddkddkmmmmmmmmmmmmknnnnnnnnkmmmm',
        'mmmmmmkoookoookmmmmmmmmmmmmknnkknnkmmmmm',
        'aaaaaaakkkakkkaaaaaaaaaaaaaakkaakkaaaaaa',
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'eaeeeeeeaeeeeeeaeeeeeeaeeeeeeaeeeeeeaeee',
        'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    ];

    var SCENE_W = 40;
    var SCENE_H = 34;

    function sceneSvg(rows, w, h) {
        var out =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
            w +
            ' ' +
            h +
            '" shape-rendering="crispEdges" width="100%">';
        for (var y = 0; y < rows.length; y++) {
            var row = rows[y];
            var x = 0;
            while (x < row.length) {
                var ch = row.charAt(x);
                if (PALETTE[ch]) {
                    // Merge horizontal runs of one colour into a single rect.
                    var run = 1;
                    while (row.charAt(x + run) === ch) run++;
                    out +=
                        '<rect x="' + x + '" y="' + y + '" width="' + run +
                        '" height="1" fill="' + PALETTE[ch] + '"/>';
                    x += run;
                } else {
                    x++;
                }
            }
        }
        return out + '</svg>';
    }

    // The hero's head and raised sword, cropped out for the browser tab.
    var FAVICON = [
        '....krrrkkwk',
        '...kgggggkwk',
        '...kgggggkwk',
        '.kkkgsskgkwk',
        'kbbkkssskkwk',
        'kbbsrrrrrgggk',
        'kggsrrrrrsbk',
        'kbbsrrrrrsk',
        'kbbkgggggk',
        '.kkkddkddk',
        '...kddkddk',
        '...kddkddk',
        '..koookoook',
        '...kkk.kkk',
        ''
    ];

    function setFavicon() {
        var svg = sceneSvg(FAVICON, 14, 15);
        var href = 'data:image/svg+xml,' + encodeURIComponent(svg);
        var links = document.querySelectorAll('link[rel~="icon"]');
        for (var i = 0; i < links.length; i++) links[i].parentNode.removeChild(links[i]);
        var link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/svg+xml';
        link.href = href;
        document.head.appendChild(link);
    }

    /* --------------------------------------------------------------- gate -- */

    var STYLE =
        '.sitegate-hidden body{visibility:hidden!important}' +
        '#sitegate{position:fixed;inset:0;z-index:2147483647;display:flex;' +
        'align-items:center;justify-content:center;padding:1.5rem;' +
        'background:#12121c;color:#e9e4d8;visibility:visible;' +
        "font-family:'Courier New',Consolas,Monaco,monospace;overflow:auto}" +
        '#sitegate .sg-box{width:100%;max-width:34rem;text-align:center}' +
        '#sitegate .sg-art{border:3px solid #7d6a52;background:#241d33;' +
        'box-shadow:0 0 0 3px #171420;image-rendering:pixelated}' +
        '#sitegate .sg-art svg{display:block;width:100%;height:auto}' +
        '#sitegate h1{font-size:1.1rem;letter-spacing:0.18em;text-transform:uppercase;' +
        'margin:1.25rem 0 0.35rem;font-weight:700}' +
        '#sitegate p{margin:0;font-size:0.85rem;color:#9a94a8;line-height:1.5}' +
        '#sitegate form{display:flex;gap:0.5rem;margin:1.25rem 0 0;justify-content:center;' +
        'flex-wrap:wrap}' +
        '#sitegate input{flex:1 1 12rem;min-width:0;padding:0.6rem 0.7rem;font:inherit;' +
        'color:#e9e4d8;background:#0c0c14;border:2px solid #2c2c40;color-scheme:dark}' +
        '#sitegate input:focus{outline:none;border-color:#e0a13a}' +
        '#sitegate button{padding:0.6rem 1.1rem;font:inherit;font-weight:700;cursor:pointer;' +
        'color:#12121c;background:#e0a13a;border:2px solid #e0a13a;letter-spacing:0.08em;' +
        'text-transform:uppercase}' +
        '#sitegate button[disabled]{opacity:0.6;cursor:default}' +
        '#sitegate .sg-error{margin-top:0.75rem;color:#ff8f7a;min-height:1.2em;font-size:0.85rem}' +
        '@media (max-width:480px){#sitegate h1{font-size:0.95rem}}';

    function injectStyle() {
        var el = document.createElement('style');
        el.id = 'sitegate-style';
        el.textContent = STYLE;
        (document.head || document.documentElement).appendChild(el);
    }

    // Hide the page as early as possible, before anything paints.
    injectStyle();
    if (!unlocked()) root.className += ' sitegate-hidden';

    function build() {
        setFavicon();

        if (unlocked()) {
            root.className = root.className.replace(/\bsitegate-hidden\b/g, '');
            return;
        }

        var overlay = document.createElement('div');
        overlay.id = 'sitegate';
        overlay.innerHTML =
            '<div class="sg-box">' +
            '<div class="sg-art" id="sg-art"></div>' +
            '<h1>The Man in the Arena</h1>' +
            '<p>Whose face is marred by dust and sweat and blood.<br>Password, and in you go.</p>' +
            '<form autocomplete="off">' +
            '<input type="password" aria-label="Password" placeholder="Password" ' +
            'autocomplete="current-password">' +
            '<button type="submit">Enter</button>' +
            '</form>' +
            '<p class="sg-error" role="alert"></p>' +
            '</div>';
        document.body.appendChild(overlay);

        var art = overlay.querySelector('#sg-art');
        var frames = [sceneSvg(FRAME_A, SCENE_W, SCENE_H), sceneSvg(FRAME_B, SCENE_W, SCENE_H)];
        var frame = 0;
        art.innerHTML = frames[0];
        setInterval(function () {
            frame = 1 - frame;
            art.innerHTML = frames[frame];
        }, 520);

        var form = overlay.querySelector('form');
        var input = overlay.querySelector('input');
        var button = overlay.querySelector('button');
        var error = overlay.querySelector('.sg-error');

        input.focus();

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!input.value) return;
            button.disabled = true;
            error.textContent = '';
            check(input.value).then(function (ok) {
                button.disabled = false;
                if (ok) {
                    remember();
                    overlay.parentNode.removeChild(overlay);
                    root.className = root.className.replace(/\bsitegate-hidden\b/g, '');
                    return;
                }
                error.textContent = 'Not the password. Try again.';
                input.value = '';
                input.focus();
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
