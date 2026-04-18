// 行情缓存 hook - 避免每次切换页面都重新请求

import { useState, useEffect, useCallback } from 'react';
import { fetchStockQuotes, fetchFundNavs } from '../utils/api';
import { calculateStockPositions, calculateFundPositions } from '../types';
import type { StockQuote, StorageData, QuotesCache } from '../types';

const QUOTES_CACHE_KEY = 'stock-helper-quotes';

// 判断是否在交易时间段内
function isInTradingTime(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;  // 周末

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const time = hours * 60 + minutes;

  // 9:30-11:30, 13:00-15:00
  return (time >= 570 && time <= 690) || (time >= 780 && time <= 900);
}

// 判断缓存是否需要更新
function shouldRefreshCache(cache: QuotesCache | null): boolean {
  if (!cache) return true;

  const updatedAt = new Date(cache.updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffMins = diffMs / 60000;

  // 交易时间内：超过5分钟需要更新
  if (isInTradingTime()) {
    return diffMins > 5;
  }

  // 非交易时间：
  // 同一天且非交易时间，30分钟内用缓存
  const cacheDay = updatedAt.toDateString();
  const todayDay = now.toDateString();

  if (cacheDay === todayDay && diffMins < 30) {
    return false;
  }

  // 跨天了，需要更新
  return diffMins > 30;
}

export function useQuotes(data: StorageData) {
  const [stockQuotes, setStockQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [fundNavs, setFundNavs] = useState<Map<string, { nav: number; name: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  // 计算持仓
  const stockPositions = calculateStockPositions(data.stockTransactions);
  const fundPositions = calculateFundPositions(data.fundTransactions);

  // 需要获取行情的代码
  const stockCodes = stockPositions.filter(p => p.totalQuantity > 0).map(p => p.stockCode);
  const fundCodes = fundPositions.filter(p => p.totalShares > 0).map(p => p.fundCode);

  // 获取行情并缓存
  const fetchAndCache = useCallback(async () => {
    setLoading(true);

    const newStockQuotes: StockQuote[] = [];
    const newFundNavs: QuotesCache['fundNavs'] = [];

    if (stockCodes.length > 0) {
      const quotes = await fetchStockQuotes(stockCodes);
      quotes.forEach(q => newStockQuotes.push(q));
      setStockQuotes(new Map(quotes.map(q => [q.code, q])));
    }

    if (fundCodes.length > 0) {
      const navsMap = await fetchFundNavs(fundCodes);
      navsMap.forEach((value, key) => {
        newFundNavs.push({ code: key, name: value.name, nav: value.nav });
      });
      setFundNavs(new Map(navsMap.entries()));
    }

    // 缓存到 localStorage
    const cache: QuotesCache = {
      stockQuotes: newStockQuotes,
      fundNavs: newFundNavs,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(cache));

    setLoading(false);
  }, [stockCodes.join(','), fundCodes.join(',')]);

  // 初始化：先加载缓存，再判断是否需要更新
  useEffect(() => {
    // 1. 加载缓存
    const cached = localStorage.getItem(QUOTES_CACHE_KEY);
    let cache: QuotesCache | null = null;

    if (cached) {
      try {
        cache = JSON.parse(cached) as QuotesCache;
        // 用缓存数据先显示
        if (cache.stockQuotes.length > 0) {
          const cachedQuotes = cache.stockQuotes.map(q => [q.code, {
            code: q.code,
            name: q.name,
            price: q.price,
            changePercent: q.changePercent,
            open: 0,
            preClose: q.price,
            high: 0,
            low: 0,
            volume: 0,
            amount: 0,
            change: 0,
            time: cache!.updatedAt,
          } as StockQuote] as [string, StockQuote]);
          setStockQuotes(new Map(cachedQuotes));
        }
        if (cache.fundNavs.length > 0) {
          setFundNavs(new Map(cache.fundNavs.map(n => [n.code, { nav: n.nav, name: n.name }])));
        }
        setLoading(false);
      } catch (e) {
        console.error('Failed to parse quotes cache:', e);
      }
    }

    // 2. 判断是否需要更新
    if (shouldRefreshCache(cache)) {
      fetchAndCache();
    }

    // 3. 交易时间内定时刷新
    if (isInTradingTime()) {
      const interval = setInterval(fetchAndCache, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  return {
    stockQuotes,
    fundNavs,
    loading,
    refresh: fetchAndCache,  // 手动刷新
  };
}