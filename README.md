# GrafcetMaker

A fast, offline-capable **GRAFCET (IEC 60848)** editor and simulator that runs entirely in the
browser. Built for automation engineers: correct semantics first, then editing speed.

- No backend, no accounts, no telemetry. Your projects stay on your machine.
- One static build serves both the public website and air-gapped on-premise installs: every asset
  is bundled (no CDNs, no external fonts, no runtime network calls).
- MIT licensed.

## Features

- Diagram editor with a custom SVG renderer: steps, transitions, actions, comments; keyboard-first
  editing; undo/redo; light, dark and system themes.
- Projects saved as human-readable `.grafcet.json` files (versioned, validated on load).

See [`PROGRESS.md`](PROGRESS.md) for the feature roadmap and current status, and
[`docs/user-guide.md`](docs/user-guide.md) for how to use it.

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
docs/{user-guide,semantics,file-format}.md
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for conventions and
[`docs/semantics.md`](docs/semantics.md) for the exact IEC 60848 interpretation used.

## License

[MIT](LICENSE). Bundled font JetBrains Mono is under the SIL Open Font License 1.1.
