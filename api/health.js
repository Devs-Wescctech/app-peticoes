module.exports = function registerHealth(app){
  if (typeof app.get === 'function') {
    // Fastify ou Express expõem .get
    app.get('/health', (req, res) => {
      // Fastify envia reply, Express envia res
      const r = (res && typeof res.send === 'function') ? res : (res && res.reply) || res;
      try {
        (r && r.send) ? r.send('ok') : res.send('ok');
      } catch {
        res.send('ok');
      }
    });
  }
};
