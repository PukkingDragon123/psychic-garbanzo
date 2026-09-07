/* Bundles the game into one self-contained HTML file.
   Usage: node tools/build.js [outfile]
   The game has no dependencies, so "bundling" is just inlining the CSS and the
   source files in load order -- the result runs from a file:// path, a static
   host, or inside a sandboxed artifact frame. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(ROOT, 'dist', 'planet-destroyer.html');

/* Load order matters: each module reads the ones above it at definition time. */
const SOURCES = [
  'util', 'pix', 'glyph', 'pxd', 'data', 'art', 'rig', 'arthome', 'galaxy', 'font', 'audio', 'input', 'touch',
  'fx', 'world', 'entities', 'player', 'ui', 'starmap', 'desk', 'mind', 'home', 'game'
];

function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

const css = read('style.css');
const js = SOURCES.map(n => '/* ===== src/' + n + '.js ===== */\n' + read('src/' + n + '.js')).join('\n');

/* No <html>/<head>/<body> wrapper: the artifact host supplies those. */
const html = `<title>Planet Destroyer</title>
<meta name="description" content="A 2D pixel-art mining sandbox: drill asteroids to the core, get obscenely rich, take over the galaxy.">
<style>
${css}
</style>

<canvas id="screen" width="960" height="540"></canvas>
<div id="crt"></div>
<div id="boot">
  <h1>PLANET</h1>
  <h2>DESTROYER</h2>
  <p>Loading the drill&hellip;</p>
</div>

<script>
${js}
</script>
<script>
(function () {
  var boot = document.getElementById('boot');
  function fail(msg) {
    boot.classList.remove('hidden');
    boot.innerHTML = '<h1>PLANET</h1><h2>DESTROYER</h2>' +
      '<div class="err">' + String(msg).replace(/[<>&]/g, '') + '</div>' +
      '<p>Reload the page. If this keeps happening the browser may be blocking canvas or local storage.</p>';
  }
  window.addEventListener('error', function (e) { fail(e.message || 'Unknown script error'); });
  try {
    if (!window.PD || !window.PD.boot) throw new Error('Game scripts failed to load.');
    window.PD.boot();
    boot.classList.add('hidden');
  } catch (e) {
    fail((e && e.stack) || e);
  }
})();
</script>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log('wrote ' + path.relative(ROOT, OUT) + '  (' + kb + ' KB, ' + SOURCES.length + ' modules)');
