import type { Lang } from './types';

export interface CategoryMeta {
  key: string;
  label: Record<Lang, string>;
}

/**
 * Category metadata is shared so the client can render the picker.
 * The actual word pairs live server-side (server/src/words.ts) and are
 * never shipped to clients. Keys here must match keys in the server word bank.
 */
export const CATEGORIES: CategoryMeta[] = [
  { key: 'random', label: { zh: '随机', en: 'Random' } },
  { key: 'food', label: { zh: '食物', en: 'Food' } },
  { key: 'animals', label: { zh: '动物', en: 'Animals' } },
  { key: 'daily', label: { zh: '日常用品', en: 'Daily Items' } },
  { key: 'places', label: { zh: '地点场景', en: 'Places' } },
  { key: 'people', label: { zh: '人物角色', en: 'People' } },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
