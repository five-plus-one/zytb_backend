import axios from 'axios';

/**
 * 联网搜索服务
 * 用于补充院校、专业、城市等实时信息
 */

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export class SearchService {
  /**
   * 搜索院校信息
   */
  async searchCollegeInfo(collegeName: string, query: string): Promise<string> {
    const searchQuery = `${collegeName} ${query}`;

    try {
      // 这里可以集成真实的搜索API(如Google、Bing、百度等)
      // 或者使用Tavily、SerpAPI等专业搜索API

      // 示例: 模拟搜索结果
      const mockResults = await this.mockSearch(searchQuery);

      return this.formatSearchResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
      return '抱歉,暂时无法获取相关信息。';
    }
  }

  /**
   * 搜索专业就业信息
   */
  async searchMajorEmployment(majorName: string): Promise<string> {
    const query = `${majorName} 就业前景 薪资 2024`;

    try {
      const mockResults = await this.mockSearch(query);
      return this.formatSearchResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
      return '抱歉,暂时无法获取相关信息。';
    }
  }

  /**
   * 搜索城市生活成本
   */
  async searchCityLivingCost(city: string): Promise<string> {
    const query = `${city} 生活成本 物价 2024`;

    try {
      const mockResults = await this.mockSearch(query);
      return this.formatSearchResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
      return '抱歉,暂时无法获取相关信息。';
    }
  }

  /**
   * 搜索院校宿舍条件
   */
  async searchDormitory(collegeName: string): Promise<string> {
    const query = `${collegeName} 宿舍条件 住宿环境`;

    try {
      const mockResults = await this.mockSearch(query);
      return this.formatSearchResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
      return '抱歉,暂时无法获取相关信息。';
    }
  }

  /**
   * 通用搜索
   */
  async search(query: string): Promise<SearchResult[]> {
    try {
      return await this.mockSearch(query);
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * 格式化搜索结果
   */
  private formatSearchResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return '未找到相关信息。';
    }

    let formatted = '根据网上的信息:\n\n';

    for (let i = 0; i < Math.min(results.length, 3); i++) {
      const result = results[i];
      formatted += `${i + 1}. ${result.title}\n`;
      formatted += `   ${result.snippet}\n`;
      if (result.url) {
        formatted += `   来源: ${result.url}\n`;
      }
      formatted += '\n';
    }

    return formatted;
  }

  /**
   * 模拟搜索(演示用)
   * 实际使用时应替换为真实的搜索API
   */
  private async mockSearch(query: string): Promise<SearchResult[]> {
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 根据关键词返回模拟结果
    const results: SearchResult[] = [];

    if (query.includes('计算机') || query.includes('软件工程')) {
      results.push({
        title: '计算机专业2024年就业分析',
        snippet: '计算机相关专业就业前景依然良好,平均起薪在15-20万之间。主要就业方向包括互联网大厂、AI公司、传统企业数字化部门等。',
        url: 'https://example.com/cs-employment-2024',
        source: '教育部就业指导中心'
      });

      results.push({
        title: '软件工程专业薪资调查报告',
        snippet: '2024届软件工程专业毕业生平均月薪18,500元,其中985院校毕业生平均月薪可达25,000元以上。',
        url: 'https://example.com/se-salary-2024',
        source: '中国薪酬网'
      });
    }

    if (query.includes('宿舍') || query.includes('住宿')) {
      results.push({
        title: '大学宿舍条件汇总',
        snippet: '大部分新校区宿舍为4人间,配有独立卫浴、空调、热水器。部分老校区为6人间,公共浴室。',
        url: 'https://example.com/dormitory',
        source: '高校论坛'
      });
    }

    if (query.includes('生活成本') || query.includes('物价')) {
      results.push({
        title: '2024年主要城市生活成本对比',
        snippet: '一线城市月生活费平均2000-3000元,二线城市1500-2500元。包含饮食、交通、日常用品等。',
        url: 'https://example.com/living-cost-2024',
        source: '统计局数据'
      });
    }

    // 如果没有匹配到特定关键词,返回通用结果
    if (results.length === 0) {
      results.push({
        title: '相关信息搜索结果',
        snippet: `关于"${query}"的相关信息,建议查看官方网站或咨询学校招生办获取最新准确信息。`,
        url: '',
        source: '搜索引擎'
      });
    }

    return results;
  }

  /**
   * 使用真实搜索API的示例
   * (需要配置API密钥)
   */
  private async realSearch(query: string): Promise<SearchResult[]> {
    // 示例: 使用SerpAPI
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
      return this.mockSearch(query);
    }

    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: apiKey,
          engine: 'google',
          hl: 'zh-cn',
          gl: 'cn',
          num: 5
        }
      });

      const organicResults = response.data.organic_results || [];

      return organicResults.map((result: any) => ({
        title: result.title,
        snippet: result.snippet || '',
        url: result.link,
        source: result.displayed_link || ''
      }));
    } catch (error) {
      console.error('Real search error:', error);
      return [];
    }
  }
}
