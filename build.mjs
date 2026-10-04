import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const folders = {
  essays: 'content/essays',
  artwork: 'content/artwork'
};

function removeQuotes(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

function parseEntry(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { body: source.trim() };
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = removeQuotes(value);
  }
  return { ...fields, body: match[2].trim() };
}

async function readCollection(folder) {
  try {
    const names = await readdir(folder);
    const records = await Promise.all(names.filter(name => ['.md', '.markdown'].includes(extname(name).toLowerCase())).map(async name => {
      const raw = await readFile(join(folder, name), 'utf8');
      return parseEntry(raw);
    }));
    return records.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  } catch {
    return [];
  }
}

const [essays, artwork] = await Promise.all([
  readCollection(folders.essays),
  readCollection(folders.artwork)
]);

await mkdir('data', { recursive: true });
await Promise.all([
  writeFile('data/essays.json', JSON.stringify(essays, null, 2) + '\n'),
  writeFile('data/artwork.json', JSON.stringify(artwork, null, 2) + '\n')
]);

console.log(`Prepared ${essays.length} essays and ${artwork.length} artwork entries.`);
