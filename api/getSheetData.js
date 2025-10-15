export default async function handler(req, res) {
  try {
    const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxJP0pn4YlWbrJfZxNNRmX0a54u-SSpsmn2RABrltzjxWbWO83c_bMXb6QkqkCqRJl3/exec?action=getData';

    const response = await fetch(SHEET_URL);
    const text = await response.text();

    // Tenta converter em JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Resposta não é JSON:', text);
      return res.status(500).json({ error: 'Resposta da planilha não é JSON', raw: text });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (err) {
    console.error('Erro na API getSheetData:', err);
    res.status(500).json({ error: err.message });
  }
}
