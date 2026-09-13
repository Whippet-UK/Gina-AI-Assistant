import { Router, Request, Response } from 'express';
import { LocalLlmManager } from '../llm/LocalLlmManager.ts'; 

const router = Router();

/**
 * POST /api/llm/optimize-prompt
 * Instantly structures and maps hardcoded optimal scene prompts down
 * to your frontend text boxes, completely bypassing live model bottlenecks.
 */
router.post('/optimize-prompt', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      activeWorkflow, 
      dogBreed, 
      dogColor, 
      youtubeChannelName, 
      backgroundPhotoDescription 
    } = req.body;

    const options = {
      activeWorkflow: activeWorkflow || 'sdxl_juggernaut.json',
      dogBreed: dogBreed || "Whippet",
      dogColor: dogColor || "pure white",
      youtubeChannelName: youtubeChannelName || "THE WHIPPET",
      backgroundPhotoDescription: backgroundPhotoDescription || "a beautiful woman with long dark hair looking forward"
    };

    // Instantiate a temporary class container to safely fetch your optimizeImagePrompt method
    const optimizerInstance = new LocalLlmManager();
    const processedPromptOutput = optimizerInstance.optimizeImagePrompt(options);

    // Send the static optimal strings directly back to your React workspace layout
    res.status(200).json({
      success: true,
      workflowDetected: activeWorkflow,
      prompt: processedPromptOutput
    });

  } catch (error: any) {
    console.error('[API Router Error] Failed to generate local prompt layout structural arrays:', error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Internal server error processing template layouts.' 
    });
  }
});

export default router;
