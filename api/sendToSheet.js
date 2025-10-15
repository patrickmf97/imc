// /api/sendToSheet.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const data = req.body;

    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbxJP0pn4YlWbrJfZxNNRmX0a54u-SSpsmn2RABrltzjxWbWO83c_bMXb6QkqkCqRJl3/exec',
      {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('Erro do Google Sheets:', text);
      return res.status(500).json({ error: 'Erro ao enviar para Google Sheets', details: text });
    }

    const json = await response.json();
    return res.status(200).json(json);
  } catch (err) {
    console.error('Erro interno do servidor:', err);
    return res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  }
}
