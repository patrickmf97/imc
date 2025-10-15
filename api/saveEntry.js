import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'data.json');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  let entries = [];
  try {
    entries = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
  } catch (e) {
    entries = [];
  }

  entries.push({ id: Date.now(), ...req.body });

  fs.writeFileSync(FILE_PATH, JSON.stringify(entries, null, 2));
  res.status(200).json({ status: 'ok', total: entries.length });
}
