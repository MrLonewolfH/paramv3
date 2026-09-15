import { build } from 'esbuild'
import sharp from 'sharp'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const assets = path.join(root, 'public/param/assets')
const portraitSources = {
  rekha: 'rekha-singh.jpg', sbs: 'sbs-sir.webp', pooja: 'pooja.jpg',
  abj: 'abj.png', smv: 'smv.png', abn: 'abn.png', eqn: 'eqn.png',
  abs: 'abs.png', utm: 'utm.png',
}

async function needsUpdate(source, destination) {
  try { return (await stat(source)).mtimeMs > (await stat(destination)).mtimeMs }
  catch { return true }
}

async function optimize(source, destination, options) {
  const from = path.join(assets, source)
  const to = path.join(assets, destination)
  if (!(await needsUpdate(from, to))) return
  await sharp(from).rotate().resize(options).webp({ quality: 82, effort: 5 }).toFile(to)
}

await Promise.all([
  ...Object.entries(portraitSources).map(([name, file]) =>
    optimize(file, `faculty-${name}.webp`, { width: 500, height: 550, fit: 'cover', position: 'attention', withoutEnlargement: true })),
  ...Array.from({ length: 6 }, (_, i) =>
    optimize(`campus-${i + 1}.webp`, `gallery-${i + 1}.webp`, { width: 1100, withoutEnlargement: true })),
  ...['books', 'mistakes', 'coaching'].map((name) =>
    optimize(`resource-${name}.png`, `blog-${name}.webp`, { width: 700, withoutEnlargement: true })),
  optimize('learning-sculpture.png', 'learning-sculpture.webp', { width: 900, withoutEnlargement: true }),
])

const icons = ['arrow-up-right', 'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'chevron-down', 'phone', 'mail', 'map-pin', 'graduation-cap', 'users', 'lightbulb', 'heart-handshake', 'chart-no-axes-combined', 'book-open', 'target', 'messages-square', 'sprout', 'atom', 'stethoscope', 'shapes', 'dna', 'pause', 'play', 'mouse-pointer-2', 'menu', 'x', 'plus', 'quote', 'copy', 'shield-check', 'expand', 'external-link']
const symbols = await Promise.all(icons.map(async (name) => {
  const icon = await readFile(path.join(root, 'node_modules/lucide-static/icons', `${name}.svg`), 'utf8')
  const content = icon.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '')
  return `<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${content}</symbol>`
}))
await writeFile(path.join(assets, 'icons.svg'), `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>`)

await build({
  entryPoints: [path.join(root, 'lib/param-scene.js')],
  outfile: path.join(root, 'public/param/scene.js'),
  bundle: true, minify: true, format: 'esm', target: ['es2020'],
  legalComments: 'eof', sourcemap: false,
})

const threeLicense = await readFile(path.join(root, 'node_modules/three/LICENSE'), 'utf8')
const lucideLicense = await readFile(path.join(root, 'node_modules/lucide-static/LICENSE'), 'utf8')
const manropeLicense = await readFile(path.join(root, 'node_modules/@fontsource-variable/manrope/LICENSE'), 'utf8')
const dmSansLicense = await readFile(path.join(root, 'node_modules/@fontsource-variable/dm-sans/LICENSE'), 'utf8')
await writeFile(path.join(root, 'public/param/THIRD-PARTY-LICENSES.txt'), `THREE.JS\n${threeLicense}\n\nLUCIDE ICONS\n${lucideLicense}\n\nMANROPE\n${manropeLicense}\n\nDM SANS\n${dmSansLicense}`)
console.log('Standalone Param assets and 3D scene are ready.')
