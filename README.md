## Edge Delivery Multisite + Figma Integration

This repository is a multisite Edge Delivery Services front-end that consumes design tokens from a Figma design system with multiple themes. A theme gets applied to a site via bulk metadata, and the runtime loads the corresponding theme stylesheet.

https://github.com/user-attachments/assets/ec8a8ccb-ce0a-496c-8b58-68cd0b150179

### Pre-requisites
- [Token Studio Pro License](https://tokens.studio/pro-pricing)
- [Figma Pro License](https://www.figma.com/professional/)

The above are required to correctly utilize multi dimensional theming in using Figma & the token studio plugin.

### Key capabilities
- Themeable design system generated from Figma Tokens (via Style Dictionary + Tokens Studio transforms)
- Multisite local dev workflow with AEM CLI proxying to the selected site

### Sample Sites:
The two sites below are both pointing to this codebase.

- https://main--lorem-da--usman-khalid.aem.page
- https://main--ipsum-da--usman-khalid.aem.page

The Figma design system integrated with this codebase: https://www.figma.com/design/sFPncyZmw0IKULiw38FBsm/Edge-Delivery-Multi-Site-Design-System?node-id=0-1&p=f&t=PpqiiHWzwNCGLRJ7-0

---

## Repository structure

- `tokens/`: Source of truth for design tokens
  - `$themes.json`: List of themes and enabled token sets per theme
  - `global.json`, `global/`, `base/`, `themes/`: Token set files as exported from Tokens Studio
- `tools/scripts/build-design-system.mjs`: Builds theme CSS from tokens using Style Dictionary
- `styles/themes/<theme>/<theme>.css`: Generated per-theme CSS variables (do not edit directly)
- `styles/styles.css`: Global styles consuming `--ds-*` variables
- `scripts/scripts.js`: Loads the active theme CSS at runtime based on page metadata
- `tools/scripts/dev-server.mjs`: Local dev server helper that proxies to the selected site using AEM CLI

---

## How the Figma integration works

The build script reads `tokens/$themes.json` and, for each theme, collects the tokens and builds CSS variables with the `ds` prefix (this prefix be changed [here](https://github.com/usman-khalid/edge-delivery-figma-multisite/blob/main/tools/scripts/build-design-system.mjs#L51) to reflect the name of the design system, or removed entirely)

Example output variables:

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

If multiple sites are being worked on locally, the prompt will automatically pick the next available port on `localhost`.

---

## Designer workflow: Push tokens from Figma and preview on a branch

Designers can easily create new themes, update existing ones or modify tokens and see the result instantaneously on a branch URL.

For example, if a designer updates the value of the `component-card-bg` token, then pushes to a branch called `card-bg`, the update is available at `https://card-bg--{site}--{org}--aem.page` once the design system is built and the resulting CSS is committed to the branch via the automated workflow.

---

## Adding a new theme/site

1. Add a new theme in Figma and update tokens for it accordingly
2. Add a new site to the [repoless setup](https://www.aem.live/docs/repoless)
3. Push your changes - the CI workflow will generate `styles/themes/<new-theme>/<new-theme>.css` and auto-commit it to the branch
4. Add a metadata property to the new site's content to apply the new theme to all pages. Sample: https://da.live/sheet#/usman-khalid/ipsum-da/metadata
5. Preview your updates and if things are looking good, a PR can be raised to get it into `main`

---

### CI Automation

You typically do NOT need to run the design system build locally. A GitHub Actions workflow builds and commits the generated CSS whenever token files change on any non-`main` branch.

- Workflow: `.github/workflows/build-design-system.yaml`
- Trigger: `push` on branches except `main`, when files under `tokens/**` change
- Action: runs `npm run build-design-system` and auto-commits the generated CSS back to the same branch

---

## Runtime details (how themes are applied)

- `head.html` includes a placeholder link tag: `<link id="theme-styles" rel="stylesheet" href="#">`
- `scripts/scripts.js` reads `meta[name="theme"]` and sets the link href to `/styles/themes/<theme>/<theme>.css`
- Global and block styles reference `--ds-*` variables so components update when the theme changes

---

## Troubleshooting

- Theme stylesheet 404
  - Ensure the theme has been synced correctly and the CSS exists under `styles/themes/<theme>/<theme>.css`
  - Check that the page has `meta[name="theme"]` matching the theme folder name

- Tokens not taking effect
  - Verify the token files are in `tokens/` and referenced in `tokens/$themes.json`
  - Confirm variables in CSS reference the `--ds-*` variables (e.g., `var(--ds-brand-primary)`) correctly

- Local dev cannot reach content
  - If prompted, provide a valid site token for the proxied AEM Pages URL
  - Make sure the site exists and is accessible at the printed proxy URL
