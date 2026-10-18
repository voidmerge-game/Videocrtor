# videocrtor — documentary motion-graphics pipeline

Remotion (React) + d3-geo animated maps, rendered on GitHub Actions, delivered to Google Drive.

- `src/` composition code · `public/data/` TopoJSON (Natural Earth + historical-basemaps) · `public/fonts/` Google Fonts
- `.github/workflows/stills.yml` quick frame checks · `render.yml` full render → Drive (resumable session URI in `DRIVE_UPLOAD_URI` secret)
