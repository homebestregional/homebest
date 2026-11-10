// Removes the invisible BOM mark that Windows tools (like PowerShell) sometimes add to the start of files.
// A BOM can break builds and the "ĩ"-style characters. Run: npm run fix-bom
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = process.cwd()
const SKIP = new Set(['node_modules', '.next', '.git', '.vercel'])
const EXTS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.md', '.sql', '.svg', '.example', '.txt'])
let fixed = 0

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const path = join(dir, name)
    const info = statSync(path)
    if (info.isDirectory()) walk(path)
    else if (EXTS.has(extname(name)) || name.startsWith('.env')) {
      const buf = readFileSync(path)
      if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
        writeFileSync(path, buf.subarray(3))
        fixed++
        console.log('Fixed', path.replace(ROOT, '.'))
      }
    }
  }
}

walk(ROOT)
console.log(fixed ? `Removed BOM from ${fixed} file(s).` : 'No BOM found. All files are clean UTF-8.')
