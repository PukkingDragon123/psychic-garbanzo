/* Builds the itch.io drop: a zip with index.html at its root, plus the store
   art beside it.

   The artifact build has no <!doctype>/<html>/<head>/<body> -- the artifact
   host supplies those. itch does not: it serves the zip straight into an
   iframe, so the page has to be a whole document with a viewport tag, or it
   renders at desktop width on a phone and the canvas is letterboxed to
   nothing. This wraps the same bundle in one.

   Usage: node tools/pack.js
*/
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
/* The zip is staged in its own throwaway folder. The store art lives in
   dist/store and is NOT staged -- an earlier version wiped it on every build,
   which is a funny way to lose your cover image. */
const STAGE = path.join(DIST, '.stage');

execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
const body = fs.readFileSync(path.join(DIST, 'planet-destroyer.html'), 'utf8');

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#05030f">
${body}
</html>
`;

fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });
fs.writeFileSync(path.join(STAGE, 'index.html'), page);

/* itch reads this and sizes the frame for you rather than guessing. */
fs.writeFileSync(path.join(STAGE, '.itch.toml'),
  '[[actions]]\nname = "play"\npath = "index.html"\n');

const zip = path.join(DIST, 'planet-destroyer-itch.zip');
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-qrj', zip, STAGE], { cwd: DIST });

fs.rmSync(STAGE, { recursive: true, force: true });
const kb = (fs.statSync(zip).size / 1024).toFixed(1);
console.log('wrote ' + path.relative(ROOT, zip) + '  (' + kb + ' KB)');
console.log('store art: ' + path.relative(ROOT, path.join(DIST, 'store')));
