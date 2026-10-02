import assistantHandler from './api/imc-assistant.js';

export function imcAssistantApiPlugin() {
  return {
    name: 'imedia-imc-assistant-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname;
        if (pathname !== '/api/imc-assistant') return next();
        Promise.resolve(assistantHandler(req, res)).catch((error) => {
          console.error('IMC Assistant dev API failed:', error?.message || error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: "Sorry, I'm having trouble answering right now. Please try again." }));
          }
        });
      });
    },
  };
}