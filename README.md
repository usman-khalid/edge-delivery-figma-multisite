## Edge Delivery Multisite + Figma Integration

This repository is a multisite Edge Delivery Services front-end that consumes design tokens exported from Figma (Tokens Studio format) and turns them into theme-specific CSS custom properties. Pages select a theme via metadata, and the runtime loads the corresponding theme stylesheet.

### Key capabilities
- Themeable design system generated from Figma Tokens (via Style Dictionary + Tokens Studio transforms)
- Multisite local dev workflow with AEM CLI proxying to the selected site
- Edge Delivery branch previews for each site/theme

---

## Repository structure

- `tokens/`: Source of truth for design tokens (Figma/Tokens Studio JSON)
  - `$themes.json`: List of themes and enabled token sets per theme
  - `global.json`, `global/`, `base/`, `themes/`: Token set files as exported from Tokens Studio
- `tools/scripts/build-design-system.mjs`: Builds theme CSS from tokens using Style Dictionary
- `styles/themes/<theme>/<theme>.css`: Generated per-theme CSS variables (do not edit directly)
- `styles/styles.css`: Global styles consuming `--ds-*` variables
- `scripts/scripts.js`: Loads the active theme CSS at runtime based on page metadata
- `tools/scripts/dev-server.mjs`: Local dev server helper that proxies to the selected site using AEM CLI

---

## How the Figma integration works

This project expects tokens in the Tokens Studio JSON format. The build script reads `tokens/$themes.json` and, for each theme, collects the token sets marked `enabled` or `source`, and then builds CSS variables with the `ds` prefix.

Build pipeline (simplified):
1. Parse `tokens/$themes.json` to enumerate themes and selected token sets
2. Read the corresponding token files under `tokens/`
3. Run Style Dictionary with `@tokens-studio/sd-transforms`
4. Output `styles/themes/<theme>/<theme>.css` containing `:root { --ds-* }`

Example output variables (truncated):

```css
:root {
  --ds-brand-primary: #356bcf;
  --ds-component-button-primary-bg: var(--ds-brand-primary);
  --ds-space-sm: 1rem;
  /* ... */
}
```

These variables are consumed across the codebase, for example:

```css
a:any-link { color: var(--ds-global-link); }
button { background-color: var(--ds-component-button-primary-bg); }
.footer { background-color: var(--ds-global-footer-bg); }
```

At runtime, `scripts/scripts.js` reads the page metadata `theme` and injects the corresponding theme stylesheet:

```html
<meta name="theme" content="lorem" />
<link id="theme-styles" rel="stylesheet" href="/styles/themes/lorem/lorem.css">
```

---

## Local development

### Prerequisites
- Node.js 18+
- AEM CLI (global):

```bash
npm install -g @adobe/aem-cli
```

### Install

```bash
npm install
```

### Start local dev (select a site/theme)

```bash
npm start
# or pass options explicitly
node tools/scripts/dev-server.mjs --theme lorem --port 3000
```

What this does:
- Prompts you to select a theme from `styles/themes/`
- Proxies AEM Pages content for that site via AEM CLI
- Prints the proxied URL and launches a local server

If the target site requires authentication, you will be prompted for a token.

### Build the design system (CI-first)

You typically do NOT need to run the build locally. A GitHub Actions workflow builds and commits the generated CSS whenever token files change on any non-`main` branch.

- Workflow: `.github/workflows/build-design-system.yaml` ("Design System")
- Trigger: `push` on branches except `main`, when files under `tokens/**` change
- Action: runs `npm run build-design-system` and auto-commits the generated CSS back to the same branch

Optional local preview:

```bash
npm run build-design-system
```

Do not commit locally generated CSS if you ran it for preview; CI will regenerate and commit it.

---

## Designer workflow: Push tokens from Figma and preview on a branch

This workflow assumes designers use the Tokens Studio plugin in Figma.

1) Import variables from the design system. This will import anything new or modify any existing tokens

2) Export/sync tokens to Git
- Preferred: Configure Tokens Studio GitHub Sync to push JSON into this repository’s `tokens/` directory using the same folder structure
- Alternative: Export token JSON from Figma and add/update files under `tokens/` manually

3) Configure themes in `$themes.json`
- Add or update entries with the theme `name` and `selectedTokenSets` mapping to the token sets to include
- Example (excerpt):

```json
[
  {
    "name": "lorem",
    "selectedTokenSets": {
      "global": "source",
      "base/Mode 1": "source",
      "themes/lorem": "enabled"
    }
  }
]
```

4) Push your token changes; CI generates CSS variables
- Push commits that modify files under `tokens//**`
- The "Design System" workflow will build and auto-commit `styles/themes/<theme>/<theme>.css` to your branch

5) Open a PR and preview on an Edge Delivery branch URL
- Commit ONLY the updated `tokens/` JSON (CI will commit generated CSS)
- Open a branch/PR
- Preview using the Edge Delivery branch URL pattern:
  - Preview: `https://{branch}--{site-repo}--{org}.aem.page`
  - Live: `https://{branch}--{site-repo}--{org}.aem.live`

Notes:
- Ensure your pages include page metadata `theme` set to the corresponding theme name so the correct CSS loads
- In multisite setups, each site/theme may publish from its own repository (for example, URLs like `https://main--lorem-da--{org}.aem.page`). Coordinate with engineering to confirm the site repo and branch naming
 - Wait for the GitHub Action to finish before validating the branch preview (it will add the generated CSS commit)

6) Verify in the browser
- Load a page on the branch URL
- Confirm the correct theme file is requested: `/styles/themes/<theme>/<theme>.css`
- Validate colors, spacing, and components reflect the new tokens

---

## Adding a new theme/site

1. Create a token set file under `tokens/themes/<new-theme>.json`
2. Add an entry to `tokens/$themes.json` with `name: <new-theme>` and mark the relevant token sets as `enabled`/`source`
3. Push your changes; the CI workflow will generate `styles/themes/<new-theme>/<new-theme>.css` and auto-commit it to your branch
4. Add `meta name="theme" content="<new-theme>"` to pages that should use it
5. Commit and open a PR; preview at the branch URL for the corresponding site

---

## CI automation

- The Design System workflow (`.github/workflows/build-design-system.yaml`) runs on token changes and commits generated CSS using a bot account (`ds-build-bot`).
- The Quality Gate workflow (`.github/workflows/quality-gate.yaml`) runs linting on every push.

---

## Runtime details (how themes are applied)

- `head.html` includes a placeholder link tag: `<link id="theme-styles" rel="stylesheet" href="#">`
- `scripts/scripts.js` reads `meta[name="theme"]` and sets the link href to `/styles/themes/<theme>/<theme>.css`
- Global and block styles reference `--ds-*` variables so components update when the theme changes

---

## Linting

```bash
npm run lint       # runs JS + CSS linters
npm run lint:js
npm run lint:css
```

---

## Troubleshooting

- Theme stylesheet 404
  - Ensure `npm run build-design-system` has been run and the CSS exists under `styles/themes/<theme>/<theme>.css`
  - Check that the page has `meta[name="theme"]` matching the theme folder name

- Tokens not taking effect
  - Verify the token files are in `tokens/` and referenced in `tokens/$themes.json`
  - Confirm variables in CSS reference the `--ds-*` variables (e.g., `var(--ds-brand-primary)`) correctly

- Local dev cannot reach content
  - If prompted, provide a valid site token for the proxied AEM Pages URL
  - Make sure the site exists and is accessible at the printed proxy URL

---

## References

- Tokens Studio for Figma (design tokens and GitHub sync)
- Style Dictionary with Tokens Studio transforms (`@tokens-studio/sd-transforms`)
- AEM Edge Delivery Services (branch URLs: `.aem.page` for preview, `.aem.live` for live)
