# Android Release — versionName 1.0.5 / versionCode 13

## Version summary
| Item | Old | New |
|---|---|---|
| versionName | 1.0.4 | 1.0.5 |
| versionCode | 12 | 13 |
| Package name | ca.praetoriagroup.opshub | unchanged |
| App name | Praetoria Ops Hub | unchanged |
| minSdk | 21 (Android 5.0) | unchanged |
| Signing | existing Play App Signing + upload key | unchanged |

Confirm in Play Console → Test and release → **App bundle explorer** that 12 is still the
highest uploaded code. If a higher code exists (e.g. an internal-testing bundle), use
`highest + 1` instead of 13 and bump this doc.

## Files changed in this repo
- `src/hooks/useAppUpdate.ts` — `APP_VERSION` bumped `1.0.0` → `1.0.5` (in-app update banner baseline).
- `docs/qa/android-1.0.5-build-13.md` — this document.

No native Android project lives in this repo. The Android app is a **Bubblewrap TWA**
wrapper; version fields live in the local Bubblewrap workspace (`twa-manifest.json` /
`app/build.gradle`), not here.

## Build steps (run in the Bubblewrap workspace, not this repo)
```bash
# 1. Publish the latest web build first (TWA loads the live site)
#    Lovable → Publish → Update

# 2. In the Bubblewrap project folder:
#    edit twa-manifest.json
#      "appVersionName": "1.0.5",
#      "appVersionCode": 13,
#    keep: packageId ca.praetoriagroup.opshub, name "Praetoria Ops Hub",
#          signingKey block, minSdkVersion

bubblewrap update            # regenerates android project from twa-manifest.json
bubblewrap build             # prompts for upload keystore password -> app-release-bundle.aab
```
Output: `app-release-bundle.aab` — upload to Play Console → Production → Create new release.

The signing keystore is local to the release machine and is not stored in this repo, so
the signed `.aab` cannot be produced from the Lovable sandbox.

## Icon consistency
Single source of truth is the web manifest (`public/manifest.json`), which Bubblewrap
reads to regenerate all Android densities:
- `public/icon-192.png` — 192x192 RGBA (launcher / any)
- `public/icon-512.png` — 512x512 RGBA (Play Store listing icon source)
- `public/icon-512-maskable.png` — 512x512 RGBA, `purpose: maskable` (adaptive icon)

All three are the same Spartan-helmet mark on the `#0f172a` field, so launcher, adaptive
and Play Store icons match. The earlier mismatch (adaptive icon cropping a non-maskable
source) is resolved because a dedicated maskable 512 asset with safe-zone padding is now
declared. Re-running `bubblewrap update` regenerates `mipmap-*` and the adaptive
foreground/background from these files — do not hand-edit generated mipmaps.

## Pre-upload checklist
- [ ] App bundle explorer confirms 12 is the highest existing versionCode
- [ ] Web app published before the TWA build
- [ ] `twa-manifest.json` shows 1.0.5 / 13, packageId unchanged
- [ ] Built with the same upload keystore (Play will reject a different key)
- [ ] `public/.well-known/assetlinks.json` contains the real Play App Signing SHA-256
      fingerprint (currently a placeholder — copy it from Play Console → Setup →
      App integrity, otherwise the TWA shows a browser address bar)
- [ ] Release notes drafted for the Production release
