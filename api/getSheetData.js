import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const url = 'https://script.google.com/macros/s/AKfycbxJP0pn4YlWbrJfZxNNRmX0a54u-SSpsmn2RABrltzjxWbWO83c_bMXb6QkqkCqRJl3/exec';
    const response = await fetch(url);
    const text = await response.text(); // primeiro pega como texto

    // tenta converter para JSON
    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(500).send('Resposta do Apps Script não é JSON:\n' + text); }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
