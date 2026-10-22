# GrafcetMaker

A fast, offline-capable **GRAFCET (IEC 60848)** editor and simulator that runs entirely in the
browser. Built for automation engineers: correct semantics first, then editing speed.

- No backend, no accounts, no telemetry. Your projects stay on your machine.
- One static build serves both the public website and air-gapped on-premise installs: every asset
  is bundled (no CDNs, no external fonts, no runtime network calls).
- MIT licensed.

## Features

- **Fast editing**: keyboard-first drawing (`Enter` continues a sequence, `A` adds an action, `P` /
  `O` add parallel or alternative branches, `L` loops back), link handles that only accept valid
  targets, delete that heals the sequence, copy/paste across projects, undo/redo, on-demand
  auto-layout, contextual hints, command palette, split view of two grafcets.
- **Full GRAFCET**: steps, transitions, OR/AND divergences and convergences, source/sink
  transitions, continuous, conditional and stored actions (activation ↑, deactivation ↓, event),
  timers, edges, comparisons, several partial grafcets, macro-steps, enclosing steps, forcing.
- **Checks while you draw**: syntax and types of every expression, unknown variables with
  one-click creation, reachability, dead ends, non-exclusive alternatives, possible transient loops,
  outputs driven from parallel branches, hierarchy and forcing consistency.
- **Simulation** by the IEC 60848 rules (search for stability, simultaneous clearing, edges, timers,
  forcing) with virtual time, tokens on the diagram, evolution log, chronogram with time travel and
  recorded scenarios.
- **Exports**: vector PDF (A4/A3, title block, tiling), SVG, PNG, WebP, clipboard; variables to
  Excel and CSV (and back); **Structured Text** and **PLCopen XML** (SFC) generation.
- **Learn as you go**: start screen with examples, guided tour, help center with a beginner
  tutorial and diagrams, glossary of standard terms, in-app changelog.
- **Accessible and offline**: WCAG 2.2 AA (keyboard everywhere, outline tree view, light/dark
  contrast), installable PWA that works without a network.
- Projects are human-readable `.grafcet.json` files (versioned, validated on load), autosaved in
  the browser with crash recovery and local history.

See [`docs/user-guide.md`](docs/user-guide.md) for the complete reference, the in-app help
([`docs/help/`](docs/help/index.md)) for guides, and [`PROGRESS.md`](PROGRESS.md) for the build log.

## Self-hosting

GrafcetMaker is a static site. The build uses relative paths, so it works under any sub-path
(`https://intranet.example.com/tools/grafcet/`).

### Static files

```sh
npm ci
npm run build
# copy dist/ to any web server
```

Serve `index.html`, `sw.js` and `manifest.webmanifest` with `Cache-Control: no-cache`; files in
`assets/` are fingerprinted and can be cached forever. See [`deploy/nginx.conf`](deploy/nginx.conf).

### Configuration

**Help › Send feedback** picks the first channel this installation offers:

1. **Anonymous endpoint** (the public site): the message is posted to `api/feedback` on the same
   origin and filed as an issue in a private GitHub repository. Senders need no account and may
   leave a contact for a reply; no email address appears in the app.
2. **Email**: with `VITE_FEEDBACK_EMAIL=plc-team@example.com npm run build`, the user's email app
   opens with the message to that address.
3. **Copy** only, when neither is set up (the default for on-premise installs).

The endpoint and its setup are described under [Cloudflare Workers](#cloudflare-workers-public-site).

### Cloudflare Workers (public site)

[`wrangler.jsonc`](wrangler.jsonc) deploys `dist/` as static assets plus a small Worker,
[`worker/index.ts`](worker/index.ts), that serves the feedback endpoint at `/api/feedback`
([`worker/feedback.ts`](worker/feedback.ts)); every other request is answered from the static
files. Connect the repository in **Workers & Pages** (Workers Builds: build command
`npm run build`, deploy command `npx wrangler deploy`), or deploy by hand with
`npm run build && npx wrangler deploy`. Rename `name` in `wrangler.jsonc` to match your Worker.

To enable the feedback endpoint:

1. Create a **private** GitHub repository for feedback, e.g. `grafcetmaker-feedback`.
2. Create a fine-grained personal access token limited to that repository with
   **Issues: Read and write** (and nothing else).
3. In the Worker › Settings › Variables and Secrets, add `GITHUB_REPO` (`owner/name`, text) and
   `GITHUB_TOKEN` (secret). Deploys keep them (`keep_vars`).
4. Recommended: a Cloudflare rate-limiting rule on `/api/feedback` (e.g. 5 requests per minute per
   IP) against spam.

New feedback then arrives as GitHub notifications (web, mobile app or the email of your GitHub
account, which stays private). Renew the token before it expires. Without these settings the
endpoint answers `{ "ok": false }` and the app falls back to email or copy.

### Docker

```sh
docker build -t grafcetmaker .
docker run --rm -p 8080:8080 grafcetmaker
# open http://localhost:8080
```

The image is an unprivileged nginx serving the static build on port 8080 with security headers.

## Development

```sh
npm ci
npm run dev       # dev server
npm run check     # typecheck + lint + unit tests + build
npm run e2e       # Playwright smoke test (Chromium)
```

Architecture overview:

```
src/core/{model,expr,validation,simulation,layout,codegen,io}  pure TypeScript (Node + Workers)
src/editor/{canvas,tools,commands}                              SVG editor
src/panels  src/theme  src/i18n  src/workers  src/app           UI shell
docs/{user-guide,semantics,file-format}.md   docs/help/*.md (in-app help pages)
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for conventions and
[`docs/semantics.md`](docs/semantics.md) for the exact IEC 60848 interpretation used.

## License

[MIT](LICENSE). Bundled font JetBrains Mono is under the SIL Open Font License 1.1.
