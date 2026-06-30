import * as interactionService from '../services/interactionService.js';

async function addInteraction(req, res) {
  try {
    const { content_id, interaction_type, score, watch_time } = req.body;

    if (!content_id || !interaction_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await interactionService.handleInteraction({
      user_id: req.user.id,
      content_id,
      interaction_type,
      score,
      watch_time,
    });

    res.status(201).json({
      message: "Interaction logged successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getHistory(req, res) {
  try {
    const history = await interactionService.getHistory(req.user.id);
    res.status(200).json({ data: history });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function getSaved(req, res) {
  try {
    const saved = await interactionService.getSaved(req.user.id);
    res.status(200).json({ data: saved });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function removeSaved(req, res) {
  try {
    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({ error: "Missing itemId parameter" });
    }
    
    await interactionService.removeSavedInteraction(req.user.id, itemId);
    res.status(200).json({ message: "Removed from saved" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

async function removeInteraction(req, res) {
  try {
    const { itemId, interactionType } = req.params;
    if (!itemId || !interactionType) {
      return res.status(400).json({ error: "Missing parameters" });
    }
    
    await interactionService.removeInteraction(req.user.id, itemId, interactionType);
    res.status(200).json({ message: "Interaction removed" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export { addInteraction, getHistory, getSaved, removeSaved, removeInteraction };