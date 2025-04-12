const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();
const port = 3000;

// Función para convertir XML a JSON
const parseXml = (xmlData) => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xmlData, { explicitArray: false }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Endpoint para recibir los términos de búsqueda y devolver los títulos de los papers
app.get('/search-papers', async (req, res) => {
  const searchTerm = req.query.term;

  if (!searchTerm) {
    return res.status(400).json({ error: 'Se requiere el parámetro "term" para la búsqueda.' });
  }

  try {
    // Consulta el primer endpoint para obtener los IDs de los papers
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${searchTerm}`;
    const searchResponse = await axios.get(searchUrl);

    // Convertir la respuesta XML en JSON
    const searchData = await parseXml(searchResponse.data);

    // Verificamos si hay IDs en la respuesta
    const ids = searchData.eSearchResult.IdList.Id;
    if (!ids || ids.length === 0) {
      return res.status(404).json({ error: 'No se encontraron artículos para ese término de búsqueda.' });
    }

    // Consulta el segundo endpoint para obtener los detalles de los artículos
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract`;
    const fetchResponse = await axios.get(fetchUrl);

    // Convertir la respuesta XML en JSON
    const fetchData = await parseXml(fetchResponse.data);

    // Extraer los títulos de los artículos
    const articles = fetchData.PubmedArticleSet.PubmedArticle;
    if (!articles || articles.length === 0) {
      return res.status(404).json({ error: 'No se pudieron extraer los títulos de los artículos.' });
    }

    const titles = articles.map(article => article.MedlineCitation.Article.ArticleTitle);

    // Devolver los títulos en formato JSON
    res.json({ titles });
  } catch (error) {
    console.error('Error en la consulta a PubMed:', error);
    res.status(500).json({ error: 'Hubo un error al procesar la solicitud.' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});