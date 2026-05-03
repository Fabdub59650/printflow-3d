/**
 * logs.js — Routes pour consulter les logs d'erreurs backend
 */

const router = require('express').Router();
const { getLogs, clearLogs } = require('../logger');

// GET /api/logs — récupérer les logs
router.get('/', async (req, res) => {
  try {
    const level = req.query.level || null;
    const limit = parseInt(req.query.limit) || 100;
    res.json(getLogs(level, limit));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/logs — vider les logs
router.delete('/', async (req, res) => {
  try {
    clearLogs();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
