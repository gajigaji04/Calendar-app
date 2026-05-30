import { getSupabase } from '@/lib/supabase';

/** room_id 생성 헬퍼 */
export function teamRoomId(teamId)        { return `team:${teamId}`; }
export function dmRoomId(uid1, uid2)      { return `dm:${[uid1, uid2].sort().join('_')}`; }

/** 메시지 최근 N개 조회 (오래된 것부터 순서) */
export async function getMessages(roomId, limit = 60) {
  const { data, error } = await getSupabase()
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).reverse();
}

/** 메시지 전송 */
export async function sendMessage(roomId, senderId, senderName, content) {
  const { data, error } = await getSupabase()
    .from('messages')
    .insert({ room_id: roomId, sender_id: senderId, sender_name: senderName.slice(0, 40), content: content.trim() })
    .select('id, sender_id, sender_name, content, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Realtime 구독. 반환값은 unsubscribe 함수
 *  같은 room을 여러 곳에서 구독할 때 channelSuffix로 이름 충돌 방지 */
export function subscribeToRoom(roomId, onMessage, channelSuffix = '') {
  const sb = getSupabase();
  const channelName = channelSuffix ? `chat:${roomId}:${channelSuffix}` : `chat:${roomId}`;
  const channel = sb
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();
  return () => sb.removeChannel(channel);
}

/** 방의 마지막 메시지 1개 (사이드바 미리보기용) */
export async function getLastMessage(roomId) {
  const { data } = await getSupabase()
    .from('messages')
    .select('sender_name, content, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
