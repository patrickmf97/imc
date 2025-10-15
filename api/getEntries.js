import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'data.json');

export default async function handler(req, res) {
  try {
    const entries = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
    res.status(200).json(entries);
  } catch (e) {
    res.status(200).json([]);
  }
}
