import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const url = 'https://script.google.com/macros/s/AKfycbxJP0pn4YlWbrJfZxNNRmX0a54u-SSpsmn2RABrltzjxWbWO83c_bMXb6QkqkCqRJl3/exec';
    const response = await fetch(url);
    const text = await response.text(); // pega o retorno como texto

    let data;
    try {
      data = JSON.parse(text); // tenta converter em JSON
    } catch (err) {
      console.error('Apps Script retornou inválido:', text);
      return res.status(500).json({ error: 'Resposta inválida do Apps Script', raw: text });
    }

    res.status(200).json(data); // envia para o front-end
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
