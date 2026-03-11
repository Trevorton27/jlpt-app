export interface ConversationTopic {
  id: string;
  title: string;
  titleJp: string;
  description: string;
  levels: number[];
}

export const CONVERSATION_TOPICS: ConversationTopic[] = [
  { id: "self-intro", title: "Self Introduction", titleJp: "自己紹介", description: "Introduce yourself and learn about others", levels: [5, 4, 3, 2, 1] },
  { id: "shopping", title: "Shopping", titleJp: "買い物", description: "Practice buying things and asking about prices", levels: [5, 4, 3] },
  { id: "restaurant", title: "At a Restaurant", titleJp: "レストラン", description: "Order food and interact with staff", levels: [5, 4, 3] },
  { id: "directions", title: "Asking Directions", titleJp: "道案内", description: "Ask for and give directions", levels: [5, 4, 3] },
  { id: "school", title: "School Life", titleJp: "学校生活", description: "Talk about classes, schedules, and campus life", levels: [5, 4, 3, 2] },
  { id: "hobbies", title: "Hobbies", titleJp: "趣味", description: "Discuss hobbies and free time activities", levels: [5, 4, 3, 2] },
  { id: "travel", title: "Travel", titleJp: "旅行", description: "Plan trips and describe travel experiences", levels: [4, 3, 2, 1] },
  { id: "work", title: "Work & Career", titleJp: "仕事", description: "Discuss work, careers, and professional topics", levels: [3, 2, 1] },
  { id: "daily-routine", title: "Daily Routine", titleJp: "日課", description: "Describe your daily activities and schedule", levels: [5, 4, 3] },
  { id: "weather", title: "Weather & Seasons", titleJp: "天気と季節", description: "Talk about weather and seasonal activities", levels: [5, 4, 3] },
  { id: "health", title: "Health & Wellness", titleJp: "健康", description: "Discuss health, exercise, and visiting doctors", levels: [4, 3, 2] },
  { id: "future-plans", title: "Future Plans", titleJp: "将来の計画", description: "Talk about goals, dreams, and plans", levels: [3, 2, 1] },
  { id: "news", title: "Current Events", titleJp: "ニュース", description: "Discuss news, society, and current affairs", levels: [2, 1] },
  { id: "culture", title: "Culture & Society", titleJp: "文化と社会", description: "Explore cultural topics and social issues", levels: [2, 1] },
  { id: "debate", title: "Opinion & Debate", titleJp: "意見と議論", description: "Express and defend opinions on complex topics", levels: [1] },
];

export function getTopicsForLevel(level: number): ConversationTopic[] {
  return CONVERSATION_TOPICS.filter((t) => t.levels.includes(level));
}
