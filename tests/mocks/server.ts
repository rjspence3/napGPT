/**
 * Deterministic fake LLM server
 * Returns predictable responses based on prompt hash
 */

import * as http from 'http';
import * as crypto from 'crypto';
import * as url from 'url';

const PORT = process.env.LLM_SERVER_PORT || 3001;

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  effort?: number;
  flags?: { dream?: boolean };
}

function sha1(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function generateResponse(prompt: string, effort: number = 50): string {
  const hash = sha1(prompt);
  const hashPrefix = hash.slice(0, 8);
  
  // Deterministic response based on hash
  const baseResponse = `LLM:${hashPrefix}`;
  
  // Scale response length by effort
  const minLength = Math.max(20, effort * 2);
  const maxLength = Math.min(500, effort * 10);
  const targetLength = minLength + (parseInt(hash.slice(8, 12), 16) % (maxLength - minLength));
  
  // Repeat base response to reach target length
  let response = baseResponse;
  while (response.length < targetLength) {
    response += ` ${baseResponse}`;
  }
  
  return response.slice(0, targetLength);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url || '', true);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (parsedUrl.pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data: ChatRequest = JSON.parse(body);
        const lastMessage = data.messages[data.messages.length - 1];
        const prompt = lastMessage?.content || '';
        const effort = data.effort || 50;
        
        const reply = generateResponse(prompt, effort);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          reply,
          meta: {
            strategy: 'deterministic',
            effort,
            hash: sha1(prompt).slice(0, 8),
          },
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Fake LLM server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

