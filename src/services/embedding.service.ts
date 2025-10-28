import axios from 'axios';

/**
 * 嵌入向量服务
 * 用于生成文本的嵌入向量，支持专业匹配度计算
 */
export class EmbeddingService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/embeddings';
    this.model = process.env.EMBEDDING_MODEL || 'text-embedding-ada-002';
  }

  /**
   * 生成文本的嵌入向量
   * @param text 输入文本
   * @returns 嵌入向量数组
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.apiKey) {
        console.warn('OpenAI API key not configured, returning empty embedding');
        return [];
      }

      const response = await axios.post(
        this.apiUrl,
        {
          input: text,
          model: this.model
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data.data[0].embedding;
    } catch (error: any) {
      console.error('Error generating embedding:', error.message);
      return [];
    }
  }

  /**
   * 批量生成嵌入向量
   * @param texts 文本数组
   * @returns 嵌入向量数组
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!this.apiKey) {
        console.warn('OpenAI API key not configured, returning empty embeddings');
        return texts.map(() => []);
      }

      const response = await axios.post(
        this.apiUrl,
        {
          input: texts,
          model: this.model
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.data.map((item: any) => item.embedding);
    } catch (error: any) {
      console.error('Error generating batch embeddings:', error.message);
      return texts.map(() => []);
    }
  }

  /**
   * 计算余弦相似度
   * @param vec1 向量1
   * @param vec2 向量2
   * @returns 相似度分数 (0-1)
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (!vec1.length || !vec2.length || vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * 为专业生成嵌入文本
   * @param major 专业信息
   * @returns 用于生成嵌入的文本
   */
  generateMajorEmbeddingText(major: any): string {
    const parts: string[] = [];

    // 基本信息
    if (major.name) parts.push(`专业名称：${major.name}`);
    if (major.discipline) parts.push(`学科：${major.discipline}`);
    if (major.category) parts.push(`门类：${major.category}`);

    // 培养对象
    if (major.trainingObjective) parts.push(`培养对象：${major.trainingObjective}`);

    // 主修课程
    if (major.courses && major.courses.length > 0) {
      parts.push(`主修课程：${major.courses.join('、')}`);
    }

    // 职业方向
    if (major.career) parts.push(`职业方向：${major.career}`);
    if (major.careerFields && major.careerFields.length > 0) {
      parts.push(`就业领域：${major.careerFields.join('、')}`);
    }

    // 描述
    if (major.description) parts.push(`专业描述：${major.description}`);

    // 标签
    if (major.tags && major.tags.length > 0) {
      parts.push(`特点：${major.tags.join('、')}`);
    }

    return parts.join('\n');
  }

  /**
   * 为用户偏好生成嵌入文本
   * @param preferences 用户偏好
   * @returns 用于生成嵌入的文本
   */
  generateUserPreferenceText(preferences: {
    interests?: string[];
    careerGoals?: string[];
    skills?: string[];
    subjects?: string[];
    industryPreferences?: string[];
    [key: string]: any;
  }): string {
    const parts: string[] = [];

    if (preferences.interests && preferences.interests.length > 0) {
      parts.push(`兴趣：${preferences.interests.join('、')}`);
    }

    if (preferences.careerGoals && preferences.careerGoals.length > 0) {
      parts.push(`职业目标：${preferences.careerGoals.join('、')}`);
    }

    if (preferences.skills && preferences.skills.length > 0) {
      parts.push(`技能特长：${preferences.skills.join('、')}`);
    }

    if (preferences.subjects && preferences.subjects.length > 0) {
      parts.push(`擅长学科：${preferences.subjects.join('、')}`);
    }

    if (preferences.industryPreferences && preferences.industryPreferences.length > 0) {
      parts.push(`行业偏好：${preferences.industryPreferences.join('、')}`);
    }

    return parts.join('\n');
  }
}
