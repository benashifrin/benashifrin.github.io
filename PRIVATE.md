# Private pages

Thoughts and Check-Ins are password-protected. The published site contains only
encrypted ciphertext — the writing itself is not in the HTML, not in any script,
and not anywhere in this repo.

## How it fits together

| Path | Committed? | What it is |
| --- | --- | --- |
| `_private/*.html` | No (gitignored) | The real writing, in plaintext. Lives only on your machine. |
| `locked/*.json` | Yes | AES-256-GCM ciphertext. Safe to publish. |
| `encrypt.js` | Yes | Turns `_private/` into `locked/`. Asks for the password; never stores it. |
| `gate.js` / `gate.css` | Yes | The browser-side password prompt and decryption. |

The key is derived with PBKDF2-SHA256 at 310,000 iterations. Decryption happens
entirely in the browser — the password is never sent anywhere.

## Adding or editing a post

1. Edit the plaintext: `_private/thoughts-body.html`, `_private/checkins-body.html`,
   or `_private/terminal-thoughts.html` (the terminal's `thoughts` command).
2. Re-encrypt:

   ```
   node encrypt.js
   ```

   Enter the same password you used before. Every private page shares one password.
3. Commit and push `locked/`.

Forgetting step 2 means the site keeps serving the previous version.

## Changing the password

Run `node encrypt.js` with a new password and push `locked/`. Anyone holding the
old password can still read the old ciphertext from git history, so treat a
rotation as "new posts are protected", not "old posts are retracted".

## Things worth knowing

- **Git history is public.** Everything published before this change is still
  readable in this repo's history at plaintext. Encryption protects what you
  write from here on; it does not un-publish the past. To close that off you'd
  need to make the repo private (GitHub Pages then requires Pro) or rewrite history.
- **The ciphertext is downloadable**, so a weak password can be attacked offline
  at leisure. Use a long one.
- **`_private/` is not backed up by git** — that's the point, but it also means a
  lost laptop is a lost copy. Keep it somewhere safe.
- **Scheduled posts** (`.github/workflows/scheduled-posts.yml`) can no longer
  publish to the private pages, because their insert markers moved into
  `_private/`. The workflow now fails loudly instead of silently dropping a post.
  Schedule private posts by hand: edit `_private/`, run `encrypt.js`, push.

## The site-wide gate (added 2026-08-23)

Every page also loads `sitegate.js`, which puts a password screen — the pixel
arena, the man, the monster — in front of the whole site. The password is
`maninthearena`. Unlocking is remembered in `localStorage`, so it is asked once
per browser, not once per page.

This is a **soft** gate and a different thing from the encryption above. The
page's markup still arrives in the browser; anyone who disables JavaScript or
reads view-source walks straight past it. It keeps the site out of casual and
search-engine hands. Thoughts and Check-Ins stay genuinely encrypted underneath
it — that is the layer to trust.

Changing the site password: put the new one through `shasum -a 256`, and update
`PW_HASH` and `PW_XOR` near the top of `sitegate.js`.

```
printf 'newpassword' | shasum -a 256
node -e "console.log(JSON.stringify(Array.from('newpassword').map(c=>c.charCodeAt(0)^90)))"
```

Editing the pixel art: the two frames are plain character grids at the top of
`sitegate.js` — one character per pixel, keyed to `PALETTE`. The same renderer
draws the browser-tab favicon from `FAVICON`.

## Local preview

`gate.js` fetches `locked/*.json`, which browsers block on `file://`. Preview with
a server instead:

```
python3 -m http.server 8000
```

Then open http://localhost:8000/Thoughts.html
