import { Request, Response } from 'express';
import { SuggestionService } from '../services/agent/suggestion.service';
import { ResponseUtil } from '../utils/response';

/**
 * 智能建议控制器
 */

const suggestionService = new SuggestionService();

export class SuggestionController {
  /**
   * 生成智能建议
   * POST /api/agent/suggestions/generate
   */
  static async generateSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const {
        sessionId,
        groupIds,
        currentStage,
        recentTopics,
        maxSuggestions
      } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const suggestions = await suggestionService.generateSuggestions({
        userId,
        sessionId,
        groupIds,
        currentStage,
        recentTopics,
        maxSuggestions
      });

      ResponseUtil.success(res, { suggestions });
    } catch (error: any) {
      console.error('Generate suggestions error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 自动补全
   * POST /api/agent/suggestions/auto-complete
   */
  static async autoComplete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { partialInput, sessionId } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      if (!partialInput) {
        ResponseUtil.badRequest(res, 'Partial input is required');
        return;
      }

      const completions = await suggestionService.autoComplete(
        userId,
        partialInput,
        sessionId
      );

      ResponseUtil.success(res, { completions });
    } catch (error: any) {
      console.error('Auto complete error:', error);
      ResponseUtil.error(res, error.message);
    }
  }
}
