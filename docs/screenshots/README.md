# App Store Screenshots

Images in this directory are shown on the Freeboard-SK detail page in the
Signal K App Store. They are declared in `package.json` under
`signalk.screenshots[]` and shipped in the npm tarball via the `files`
whitelist.

## Naming

`<n>_freeboard-sk.<ext>` — numeric prefix controls display order.

- `1_freeboard-sk.jpg` — **hero image** (shown largest, first impression)
- `2_freeboard-sk.jpg`
- `3_freeboard-sk.jpg`
- … up to `6_…` (the App Store shows at most 6; extras are ignored)

## Constraints

- **Format:** JPG or PNG (JPG preferred for map-heavy captures — smaller files)
- **Dimensions:** ≤ 1280 × 800 px (16:10 aspect ratio)
- **Size:** ≤ 500 KB each
- **Order matters:** entry 1 is the hero image; lead with the most
  representative view (chart + vessel + an instrument or two).

## After adding/replacing images

1. List each file in `package.json` → `signalk.screenshots`
   (package-relative paths, e.g. `"./docs/screenshots/1_freeboard-sk.jpg"`).
2. Confirm they land in the tarball: `npm pack --dry-run | grep screenshots`.
3. They only render on the App Store after the next `npm publish` (assets are
   fetched from the published tarball on the CDN, not from source).
