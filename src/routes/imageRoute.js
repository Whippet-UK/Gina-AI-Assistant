import { Router } from 'express';
import { LocalLlmManager } from '../llm/LocalLlmManager';

const router = Router();
// Instantiate your updated manager class
const llmManager = new LocalLlmManager();

/**
 * POST /api/llm/optimize-prompt
 * Intercepts frontend scene variables and returns customized 
 * prompt arrays or strings tailored specifically to the active backend model.
 */
router.post('/optimize-prompt', async (req, res) => {
  try {
    const { 
      activeWorkflow, 
      dogBreed, 
      dogColor, 
      youtubeChannelName, 
      backgroundPhotoDescription 
    } = req.body;

    // Validate minimum required structural parameters
    if (!activeWorkflow) {
      res.status(400).json({ 
        error: 'Missing required parameter: activeWorkflow context filename.' 
      });
      return;
    }

    // Run the optimization logic layer inside your class
    const optimizedPrompt = llmManager.optimizeImagePrompt({
      activeWorkflow,
      dogBreed,
      dogColor,
      youtubeChannelName,
      backgroundPhotoDescription
    });

    // Package the payload cleanly for your React component hook state
    res.status(200).json({
      success: true,
      workflowDetected: activeWorkflow,
      prompt: optimizedPrompt
    });

  } catch (error) {
    console.error('[API Router Error] Failed to compile specialized image prompts:', error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Internal server error processing pipeline mechanics.' 
    });
  }
});

export default router;
