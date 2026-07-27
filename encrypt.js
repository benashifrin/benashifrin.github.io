#!/usr/bin/env node
//
// Encrypts the private page content so it can be published safely.
//
//   node encrypt.js
//
// Reads the plaintext in _private/ (never committed), encrypts each file with
// your password, and writes the ciphertext to locked/ (committed and served).
// The password itself is never written to disk, never stored in this repo, and
// never appears in any file the site serves. If you forget it, the only way
// back is to re-run this script against _private/ with a new one.
//
// Re-run this every time you edit a private page.

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { webcrypto } = require('crypto');
const { subtle } = webcrypto;

// Keep these in sync with gate.js — the browser derives the key the same way.
const PBKDF2_ITERATIONS = 310000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const FILES = [
    { src: '_private/thoughts-body.html', out: 'locked/thoughts.json' },
    { src: '_private/checkins-body.html', out: 'locked/checkins.json' },
    { src: '_private/terminal-thoughts.html', out: 'locked/terminal-thoughts.json' },
];

// Prompt without echoing the password to the terminal.
function askHidden(question) {
    return new Promise((resolve, reject) => {
        const input = process.stdin;
        if (!input.isTTY) {
            reject(new Error('encrypt.js needs an interactive terminal to read the password.'));
            return;
        }
        const rl = readline.createInterface({ input, output: process.stdout, terminal: true });
        let first = true;
        // Swallow the echoed characters so the password never hits the screen.
        rl._writeToOutput = function (chunk) {
            if (first) {
                rl.output.write(chunk);
                first = false;
            }
        };
        rl.question(question, (answer) => {
            rl.output.write('\n');
            rl.close();
            resolve(answer);
        });
    });
}

async function deriveKey(password, salt) {
    const material = await subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
}

async function encryptFile(password, src, out) {
    const plaintext = fs.readFileSync(src);
    const salt = webcrypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = webcrypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key = await deriveKey(password, salt);
    const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

    const payload = {
        v: 1,
        kdf: 'PBKDF2-SHA256',
        iterations: PBKDF2_ITERATIONS,
        salt: Buffer.from(salt).toString('base64'),
        iv: Buffer.from(iv).toString('base64'),
        ciphertext: Buffer.from(ciphertext).toString('base64'),
    };

    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(payload));
    return { src, out, bytes: plaintext.length };
}

async function main() {
    const missing = FILES.filter((f) => !fs.existsSync(f.src)).map((f) => f.src);
    if (missing.length) {
        console.error('Missing plaintext source file(s):\n  ' + missing.join('\n  '));
        console.error('\nThese live in _private/ and are deliberately not committed.');
        process.exit(1);
    }

    // --stdin reads the password from a pipe instead of prompting, so this can
    // run unattended. Pipe it in — don't pass it as an argument, where it would
    // show up in shell history and process listings.
    const useStdin = process.argv.includes('--stdin');

    let password;
    if (useStdin) {
        password = fs.readFileSync(0, 'utf8').replace(/\r?\n$/, '');
        if (!password) {
            console.error('No password on stdin. Nothing was written.');
            process.exit(1);
        }
    } else {
        password = await askHidden('Password: ');
        if (!password) {
            console.error('No password entered. Nothing was written.');
            process.exit(1);
        }
        const confirm = await askHidden('Confirm password: ');
        if (password !== confirm) {
            console.error('Passwords did not match. Nothing was written.');
            process.exit(1);
        }
    }
    if (password.length < 8) {
        console.error('Use at least 8 characters — this ciphertext is public, so a short');
        console.error('password can be guessed offline. Nothing was written.');
        process.exit(1);
    }

    for (const f of FILES) {
        const r = await encryptFile(password, f.src, f.out);
        console.log(`  ${r.src}  ->  ${r.out}  (${r.bytes.toLocaleString()} bytes encrypted)`);
    }

    console.log('\nDone. Commit and push the locked/ directory to publish.');
    console.log('_private/ stays on this machine — .gitignore keeps it out of git.');
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
