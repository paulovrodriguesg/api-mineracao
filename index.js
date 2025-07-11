const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 4446;

app.use(express.json());
app.use(cors())

// Middleware de autenticação
const authenticationMiddleware = (req, res, next) => {
  const { token } = req.headers;

  if (token !== 'mare') {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  next();
};

// Função utilitária para gerar o GUID
function gerarGuid(documento, tipo) {
  let pad;
  if (tipo === 1) pad = documento.padStart(14, '0'); // CNPJ
  else if (tipo === 2) pad = documento.padStart(11, '0'); // CPF
  else if (tipo === 3) pad = documento.padStart(10, '0'); // Conta Contrato
  else throw new Error("Tipo inválido. Use 1 (CNPJ), 2 (CPF), 3 (Conta Contrato)");

  const combinado = `${pad}|${tipo}`;
  return Buffer.from(combinado).toString('base64');
}

// Rota principal
app.post('/consulta-celpe', authenticationMiddleware, async (req, res) => {
  const { documento, tipo } = req.body;

  if (!documento || !tipo) {
    return res.status(400).json({ error: 'Informe documento e tipo (1: CNPJ, 2: CPF, 3: Conta Contrato)' });
  }

  try {
    const guid = gerarGuid(documento, tipo);
    const canal = 'CRD'; // ou WEB/TOT/IMB conforme necessário

    const url = `https://autoatendimento.celpe.com.br/NDP_DCSRUCES_D~home~neologw~sap.com/servlet/servicos.neoenergia.com.CDD?guid=${guid}&c=${canal}&t=D`;

    const response = await axios.post(url, null, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/json',
      }
    });
    if (response.data === '\r\n') {
      return res.status(404).json({ error: 'Nenhum registro encontrado para o CNPJ' });
    }

    return res.json(response.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao consultar a Celpe' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
