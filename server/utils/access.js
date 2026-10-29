const db = require('../database');

// Convidado (is_guest) só enxerga os grupos em que foi colocado como participante —
// nada do Tercon, de outros grupos ou de projetos fora desses grupos.
async function isGuest(userId) {
  const user = await db.prepare('SELECT is_guest FROM users WHERE id = ?').get(userId);
  return !!user?.is_guest;
}

async function isGroupParticipant(groupId, userId) {
  return !!await db.prepare('SELECT 1 FROM work_group_participants WHERE group_id = ? AND user_id = ?').get(groupId, userId);
}

// Pode consultar o pool compartilhado: com grupo, só participantes; sem grupo (Tercon), qualquer um menos convidado
async function canViewSharedPool(groupId, userId) {
  if (groupId) return isGroupParticipant(groupId, userId);
  return !(await isGuest(userId));
}

module.exports = { isGuest, isGroupParticipant, canViewSharedPool };
