const interactionRepository = require("../repositories/interactionRepository");
const { updateUserEmbedding } = require('./embedding.service');

async function handleInteraction({ user_id, content_id, interaction_type, score: passedScore }) {
  if (!user_id || !content_id || !interaction_type) {
    throw new Error("Missing required fields");
  }

  const scoreMap = {
    watch: 1,
    like: 2,
    dislike: -1,
    save: 3,
    rate: 0, // Rate score is passed dynamically
  };

  if (!(interaction_type in scoreMap)) {
    throw new Error("Invalid interaction type");
  }

  const score = interaction_type === 'rate' ? passedScore : scoreMap[interaction_type];

  // 🔥 FIX: map content_id → item_id
  const result = await interactionRepository.addInteraction({
    user_id,
    item_id: content_id,
    interaction_type,
    score,
  });

  // Fire-and-forget embedding update — non-blocking
  updateUserEmbedding(user_id).catch(err =>
    console.error('[EmbeddingService] Update failed:', err.message)
  );

  return result;
}

async function getHistory(user_id) {
  if (!user_id) throw new Error("Missing user_id");
  return await interactionRepository.getHistory(user_id);
}

async function getSaved(user_id) {
  if (!user_id) throw new Error("Missing user_id");
  return await interactionRepository.getSaved(user_id);
}

async function removeSavedInteraction(user_id, item_id) {
  if (!user_id || !item_id) throw new Error("Missing user_id or item_id");
  return await interactionRepository.removeInteraction(user_id, item_id, 'save');
}

module.exports = { handleInteraction, getHistory, getSaved, removeSavedInteraction };