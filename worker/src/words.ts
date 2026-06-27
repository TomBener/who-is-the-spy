import type { Lang } from '@spy/shared';

export interface WordPair {
  /** The word given to civilians (the majority). */
  civilian: string;
  /** The word given to undercover spies — close but distinct. */
  undercover: string;
}

type WordBank = Record<string, Record<Lang, WordPair[]>>;

/**
 * Built-in word bank. Keys (except 'random') match CATEGORIES in @spy/shared.
 * Pairs are intentionally *near* each other so the game is interesting:
 * close enough that descriptions overlap, distinct enough to expose the spy.
 *
 * This is the content layer — the main lever for game quality. Extend freely.
 * (AI-generated pairs will later plug in alongside this.)
 */
export const WORD_BANK: WordBank = {
  food: {
    zh: [
      { civilian: '牛奶', undercover: '豆浆' },
      { civilian: '包子', undercover: '饺子' },
      { civilian: '蛋糕', undercover: '面包' },
      { civilian: '火锅', undercover: '麻辣烫' },
      { civilian: '可乐', undercover: '雪碧' },
      { civilian: '咖啡', undercover: '奶茶' },
      { civilian: '西瓜', undercover: '哈密瓜' },
      { civilian: '薯条', undercover: '薯片' },
    ],
    en: [
      { civilian: 'Milk', undercover: 'Soy Milk' },
      { civilian: 'Dumpling', undercover: 'Bun' },
      { civilian: 'Cake', undercover: 'Bread' },
      { civilian: 'Cola', undercover: 'Sprite' },
      { civilian: 'Coffee', undercover: 'Milk Tea' },
      { civilian: 'Fries', undercover: 'Chips' },
      { civilian: 'Watermelon', undercover: 'Cantaloupe' },
      { civilian: 'Pizza', undercover: 'Pancake' },
    ],
  },
  animals: {
    zh: [
      { civilian: '老虎', undercover: '狮子' },
      { civilian: '青蛙', undercover: '蟾蜍' },
      { civilian: '兔子', undercover: '仓鼠' },
      { civilian: '鲨鱼', undercover: '海豚' },
      { civilian: '乌鸦', undercover: '喜鹊' },
      { civilian: '蝴蝶', undercover: '蜜蜂' },
      { civilian: '骆驼', undercover: '马' },
      { civilian: '企鹅', undercover: '鸭子' },
    ],
    en: [
      { civilian: 'Tiger', undercover: 'Lion' },
      { civilian: 'Frog', undercover: 'Toad' },
      { civilian: 'Rabbit', undercover: 'Hamster' },
      { civilian: 'Shark', undercover: 'Dolphin' },
      { civilian: 'Crow', undercover: 'Magpie' },
      { civilian: 'Butterfly', undercover: 'Bee' },
      { civilian: 'Camel', undercover: 'Horse' },
      { civilian: 'Penguin', undercover: 'Duck' },
    ],
  },
  daily: {
    zh: [
      { civilian: '牙刷', undercover: '牙签' },
      { civilian: '雨伞', undercover: '雨衣' },
      { civilian: '钢笔', undercover: '铅笔' },
      { civilian: '枕头', undercover: '抱枕' },
      { civilian: '眼镜', undercover: '墨镜' },
      { civilian: '沙发', undercover: '床' },
      { civilian: '风扇', undercover: '空调' },
      { civilian: '钥匙', undercover: '门卡' },
    ],
    en: [
      { civilian: 'Toothbrush', undercover: 'Toothpick' },
      { civilian: 'Umbrella', undercover: 'Raincoat' },
      { civilian: 'Pen', undercover: 'Pencil' },
      { civilian: 'Pillow', undercover: 'Cushion' },
      { civilian: 'Glasses', undercover: 'Sunglasses' },
      { civilian: 'Sofa', undercover: 'Bed' },
      { civilian: 'Fan', undercover: 'Air Conditioner' },
      { civilian: 'Key', undercover: 'Keycard' },
    ],
  },
  places: {
    zh: [
      { civilian: '医院', undercover: '药店' },
      { civilian: '电影院', undercover: '剧院' },
      { civilian: '游泳池', undercover: '海边' },
      { civilian: '图书馆', undercover: '书店' },
      { civilian: '公交车', undercover: '地铁' },
      { civilian: '机场', undercover: '火车站' },
      { civilian: '公园', undercover: '广场' },
      { civilian: '餐厅', undercover: '食堂' },
    ],
    en: [
      { civilian: 'Hospital', undercover: 'Pharmacy' },
      { civilian: 'Cinema', undercover: 'Theater' },
      { civilian: 'Pool', undercover: 'Beach' },
      { civilian: 'Library', undercover: 'Bookstore' },
      { civilian: 'Bus', undercover: 'Subway' },
      { civilian: 'Airport', undercover: 'Train Station' },
      { civilian: 'Park', undercover: 'Square' },
      { civilian: 'Restaurant', undercover: 'Canteen' },
    ],
  },
  people: {
    zh: [
      { civilian: '医生', undercover: '护士' },
      { civilian: '老师', undercover: '教授' },
      { civilian: '警察', undercover: '保安' },
      { civilian: '演员', undercover: '歌手' },
      { civilian: '厨师', undercover: '服务员' },
      { civilian: '律师', undercover: '法官' },
      { civilian: '司机', undercover: '快递员' },
      { civilian: '程序员', undercover: '产品经理' },
    ],
    en: [
      { civilian: 'Doctor', undercover: 'Nurse' },
      { civilian: 'Teacher', undercover: 'Professor' },
      { civilian: 'Police', undercover: 'Security Guard' },
      { civilian: 'Actor', undercover: 'Singer' },
      { civilian: 'Chef', undercover: 'Waiter' },
      { civilian: 'Lawyer', undercover: 'Judge' },
      { civilian: 'Driver', undercover: 'Courier' },
      { civilian: 'Programmer', undercover: 'Product Manager' },
    ],
  },
};

function allPairs(lang: Lang): WordPair[] {
  return Object.values(WORD_BANK).flatMap((byLang) => byLang[lang] ?? []);
}

/**
 * Pick a random word pair for the given category + language.
 * `category === 'random'` (or an unknown key) draws from the whole bank.
 * Randomly swaps which word is the "civilian" one so the spy word isn't
 * always the second column.
 */
export function pickPair(category: string, lang: Lang): WordPair {
  const pool =
    category === 'random' || !WORD_BANK[category]
      ? allPairs(lang)
      : WORD_BANK[category][lang] ?? allPairs(lang);

  const base = pool[Math.floor(Math.random() * pool.length)];
  return Math.random() < 0.5
    ? base
    : { civilian: base.undercover, undercover: base.civilian };
}
