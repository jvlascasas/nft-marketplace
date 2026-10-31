import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

for (const file of (await fs.readdir('public/nfts')).filter(file => file.endsWith('.png'))) {
  const input = path.join('public/nfts', file)
  const output = input.replace(/\.png$/, '.webp')
  await sharp(input).webp({ quality: 90, effort: 6 }).toFile(output)
  console.log(file + ': ' + (await fs.stat(input)).size + ' → ' + (await fs.stat(output)).size + ' bytes')
}
