/**
 * @file
 * Convert SVG Icons into Ripple includes:
 * Call:
 *   node convert.js
 */

const fs = require('fs');
const pathUtil = require('path');
const basePath = pathUtil.resolve(__dirname, './icons');
const paths = fs.readdirSync(basePath);

function getIconPaths() {
  return paths.map(path => `${basePath}/${path}`);
}

function getIconNameFromPath(path) {
  return path.replace(basePath, '').substring(1).replace('.svg', '').replace(/[/-]/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9\-_]+/g, '');
}

function getMatches(reg, text, matchIndex) {
  const matches = [];
  let match = reg.exec(text);
  while (match !== null) {
    matches.push(matchIndex ? match[matchIndex] : match);
    match = reg.exec(text);
  }
  return matches;
}

function renderSvgPath(path) {
  return Object.keys(path).map((key) => {
    // Remove the fill - not needed for SDP.
    return (key !== 'fill') ? `"${key}": "${path[key]}"` : null
  }).filter(i => i).join(', ');
}

function renderTwigSet(name, vars) {
  return `{\n  ${vars.join(',\n  ')}\n}`;
}

function renderTemplate({name, width, height, paths}) {
  return `import Icon from '@dpc-sdp/ripple-icon'

Icon.register({
  '${name}': {
    width: ${width},
    height: ${height},
    paths: ${paths}
  }
})
`
}

// Extract the name, width and path out of them.
const twigVariables = [];
getIconPaths().forEach((path) => {
  const iconContent = fs.readFileSync(path, 'utf-8');

  const reWidth = new RegExp('width="([0-9]+)"', 'gi');
  const reHeight = new RegExp('height="([0-9]+)"', 'gi');
  const rePath = new RegExp('<path ([^\\/]+?)\\/>', 'gi');
  const reAttr = new RegExp('([a-zA-Z\\-]+)="(.+?)"', 'gi');

  const iconPathsContent = getMatches(rePath, iconContent, 1);

  // Parse the contents of the <path> tag into array of paths objects with
  // attributes.
  const iconPaths = [];
  iconPathsContent.forEach((html) => {
    const pathProps = {};
    getMatches(reAttr, html, null).forEach((match) => {
      pathProps[match[1]] = match[2];
    });
    iconPaths.push(pathProps);
  });

  const paths = `[ ${iconPaths.map((p) => `{${renderSvgPath(p)}}`)} ]`;
  const width = getMatches(reWidth, iconContent, 1)[0];
  const height = getMatches(reHeight, iconContent, 1)[0];
  const name = getIconNameFromPath(path);

  fs.writeFileSync(`./ripple-icon/${name}.js`, renderTemplate({ name, width, height, paths }));
});

console.log(`Done! Check out ./ripple-icon to see your icons`)