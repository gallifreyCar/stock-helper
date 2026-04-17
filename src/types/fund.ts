// 基金类型定义

export interface Fund {
  code: string;           // 基金代码
  name: string;           // 基金名称
  type: string;           // 基金类型：股票型/混合型/债券型/指数型
}

export interface FundQuote {
  code: string;
  name: string;
  nav: number;            // 单位净值
  accNav: number;         // 累计净值
  navDate: string;        // 净值日期
  dayGrowth: number;      // 日增长率
  weekGrowth: number;     // 近1周
  monthGrowth: number;    // 近1月
  quarterGrowth: number;  // 近3月
  yearGrowth: number;     // 近1年
}

export interface FundBasic {
  code: string;
  name: string;
  type: string;
  manager: string;        // 基金经理
  company: string;        // 基金公司
  establishDate: string;  // 成立日期
  scale: number;          // 基金规模（亿）
  rating: number;         // 评级
}