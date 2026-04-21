const CHAT_READ_KEY = 'wmsu_chat_read_map_v1';

type ChatReadMap = Record<string, string>;

const makeKey = (userId: string, requestId: string) => `${userId}:${requestId}`;

const safeParse = (raw: string | null): ChatReadMap => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ChatReadMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const getMap = (): ChatReadMap => safeParse(localStorage.getItem(CHAT_READ_KEY));

const saveMap = (map: ChatReadMap) => {
  localStorage.setItem(CHAT_READ_KEY, JSON.stringify(map));
};

export const getRequestChatReadAt = (userId: string, requestId: string): string | null => {
  const map = getMap();
  return map[makeKey(userId, requestId)] || null;
};

export const markRequestChatReadNow = (userId: string, requestId: string): void => {
  const map = getMap();
  map[makeKey(userId, requestId)] = new Date().toISOString();
  saveMap(map);
  try {
    window.dispatchEvent(new CustomEvent('wmsu-chat-read-updated', { detail: { requestId } }));
  } catch {
    // ignore (non-browser / SSR)
  }
};
