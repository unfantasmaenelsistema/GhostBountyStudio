import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      model: 'gemini-3.8-flash',
    });
  });

  // Copilot API endpoint
  app.post('/api/copilot', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(503).json({
          error: 'No se ha configurado GEMINI_API_KEY en las variables de entorno del servidor. Utilizando motor local offline.',
          code: 'NO_API_KEY',
        });
      }

      const { prompt, systemInstruction, reportContext } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'El campo "prompt" es obligatorio.' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const fullText = `${systemInstruction ? `[INSTRUCCIONES DEL SISTEMA]\n${systemInstruction}\n\n` : ''}${reportContext ? `[CONTEXTO DEL REPORTE]\n${reportContext}\n\n` : ''}[CONSULTA]\n${prompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullText,
      });

      return res.json({ reply: response.text || 'Sin respuesta generada.' });
    } catch (err: any) {
      console.error('Gemini API Error in server.ts:', err);
      return res.status(500).json({
        error: err?.message || 'Error al procesar la solicitud con Gemini',
      });
    }
  });

  // Static files in production or Vite middleware in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`GhostBountyStudio backend & Vite running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting GhostBountyStudio server:', err);
  process.exit(1);
});
