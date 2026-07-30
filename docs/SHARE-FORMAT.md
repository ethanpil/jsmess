# JSMess Share Link Format

Share links encode the **entire mess** (code + per-mess settings) in the URL
itself. Nothing is uploaded and no local storage is involved — the link is the
data. The codec lives in `js/storage.js` (`buildShareUrl`, `importFromHash`).

## URL format

```
https://<host>/<path>#code=<payload>
```

- `payload` = `base64url( deflate-raw( UTF-8 JSON envelope ) )`
- base64url = RFC 4648 §5 alphabet (`-` and `_` instead of `+` and `/`), with
  `=` padding stripped.
- The base of the URL is `origin + pathname` only — the sharer's query
  string is never carried into a link.
- Compression/decompression uses the native `CompressionStream` /
  `DecompressionStream` APIs with the `deflate-raw` format. Support is
  detected by actually constructing with `'deflate-raw'` (some engines,
  e.g. Chromium 80–102, have the constructors but not this format). There
  is **no fallback** for unsupported browsers; both creating and opening
  links shows a clear error toast instead.

`#id=<localStorageId>` is a separate, local-only hash form for the user's own
saved messes. It is **not** part of the share format and never leaves the
user's machine.

## Envelope

```json
{
  "v": 1,
  "mess": {
    "title": "My Mess",
    "html": "...",
    "css": "...",
    "js": "...",
    "wrapMode": "onLoad",
    "styleType": "css",
    "libraries": [{ "url": "...", "type": "js" }]
  }
}
```

| Field | Type | Default applied on decode |
|---|---|---|
| `v` | number | treated as current version if absent |
| `mess.title` | string | `"Shared Mess"` |
| `mess.html` / `mess.css` / `mess.js` | string | `""` |
| `mess.wrapMode` | `onLoad` \| `onDomReady` \| `noWrapHead` \| `noWrapBody` | `"onLoad"` |
| `mess.styleType` | `css` \| `sass` | `"css"` |
| `mess.libraries` | array of `{url, type}` (`type`: `js` \| `css`) | `[]` |

Decoding is defensive: values with the wrong type (or outside the allowed
set) fall back to the default rather than propagating into the app — a
hand-crafted payload cannot put a non-string into an editor or a non-array
into the library list.

### Deliberately excluded

- **`expiration`** — auto-delete is the sharer's local housekeeping. The
  recipient always gets `0` (Keep Forever).
- **`id`** — the recipient's copy is independent; saving it creates a fresh id.
- **Global preferences** (theme, layout, fonts, indent, editor options) — a
  link never changes the recipient's editor setup.

## Versioning & compatibility rules

These rules exist so links keep working across app versions. Follow them when
adding features (new settings, new `styleType` values, editor themes, …):

1. **Decoders MUST ignore unknown fields** — the importer reads only the keys
   it knows; anything extra in the envelope or `mess` is silently dropped.
2. **Decoders MUST default missing fields** — see the table above. Never
   assume a field is present.
3. Because of rules 1–2, **additive changes never bump `v`**. Adding a new
   per-mess setting = add the field (with its default and type clamp) to
   `normalizeMess()` in `js/storage.js` — the single pick/normalize helper
   every serialization surface encodes and decodes through — and update the
   table above. Old apps opening new links simply ignore the field; new apps
   opening old links use the default.
4. **Bump `v` only for breaking changes**: renaming or retyping a field,
   restructuring the envelope, or changing the compression/encoding. (An
   encoding change would in practice also need a new hash key, e.g. `#c2=`,
   since the payload wouldn't be self-describing.)
5. **A higher `v` than the app supports is never a hard failure.** The
   importer loads best-effort and shows a "link is from a newer version of
   JSMess" toast.
6. **Keep field names aligned across serialization surfaces.** The `mess`
   object uses the same full field names as the `.jsmess` export file and the
   `jsmess_mess_<id>` localStorage records. Full names cost nothing — deflate
   compresses repeated keys extremely well — and keeping the shapes aligned
   means one mental model. In code this is enforced structurally: all of
   these surfaces route through `normalizeMess()` / `applyMess()` in
   `js/storage.js`, so a field added there is added everywhere at once.

## Size expectations

Deflate typically shrinks fiddle-sized content to well under half its raw
size. The share modal shows the link length and warns above 2,000 characters
(the threshold where some email clients and apps truncate URLs). Browsers
themselves handle far larger URLs (hundreds of KB).

## Debugging snippets

Decode a payload manually in devtools:

```js
const payload = location.hash.slice('#code='.length);
const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - b64.length % 4) % 4)), c => c.charCodeAt(0));
const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
console.log(JSON.parse(await new Response(stream).text()));
```

Forge a link (e.g. with `v: 99` to test the newer-version path):

```js
const envelope = { v: 99, mess: { title: 'Test', html: '<h1>hi</h1>', css: '', js: '' } };
const stream = new Blob([JSON.stringify(envelope)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
console.log(location.href.split('#')[0] + '#code=' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
```
