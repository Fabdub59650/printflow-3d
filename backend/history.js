const db = require('./db');

/**
 * Enregistre un événement dans l'historique d'un projet.
 * @param {number} projectId
 * @param {string} action   - clé machine ex: 'status_changed'
 * @param {string} label    - texte lisible ex: 'Statut passé à Terminé'
 * @param {*} before        - valeur avant (optionnel)
 * @param {*} after         - valeur après (optionnel)
 */
async function logProjectEvent(projectId, action, label, before = null, after = null) {
  try {
    await db.query(
      `INSERT INTO project_history (project_id, action, label, detail_before, detail_after)
       VALUES (?, ?, ?, ?, ?)`,
      [
        projectId,
        action,
        label,
        before !== null ? JSON.stringify(before) : null,
        after  !== null ? JSON.stringify(after)  : null,
      ]
    );
  } catch (e) {
    console.error('[history] Erreur enregistrement:', e.message);
  }
}

module.exports = { logProjectEvent };
