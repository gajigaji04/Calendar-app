'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTasksByDate } from '@/models/taskModel';

/* ── 날짜 문자열 유틸 ── */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function subMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m - mins;
  if (total < 0) return null;
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

/* ── localStorage 중복 방지 ── */
function wasNotified(key) {
  try {
    const set = JSON.parse(localStorage.getItem('tc-notif') || '[]');
    return set.includes(key);
  } catch { return false; }
}
function markNotified(key) {
  try {
    const today = todayStr();
    const set = JSON.parse(localStorage.getItem('tc-notif') || '[]');
    // 오늘 날짜 키만 유지 (어제 이전 기록 정리)
    const fresh = set.filter(k => k.includes(today));
    fresh.push(key);
    localStorage.setItem('tc-notif', JSON.stringify(fresh));
  } catch {}
}

/* ── 알림 발송 ── */
function sendNotification(title, body) {
  if (typeof window === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  } catch {}
}

/* ── 알림 권한 요청 ── */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined') return 'denied';
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

/* ── 알림 설정 유틸 ── */
export function getNotifSettings() {
  try {
    return {
      enabled:  localStorage.getItem('tc-notif-enabled')  !== 'false',
      atTime:   localStorage.getItem('tc-notif-at')       !== 'false',
      before30: localStorage.getItem('tc-notif-30m')      !== 'false',
      before60: localStorage.getItem('tc-notif-60m')      !== 'false',
      morning:  localStorage.getItem('tc-notif-morning')  !== 'false',
    };
  } catch { return { enabled: true, atTime: true, before30: true, before60: true, morning: true }; }
}
export function setNotifSetting(key, value) {
  try { localStorage.setItem(key, value ? 'true' : 'false'); } catch {}
}

/* ── 메인 훅 ── */
export function useNotifications() {
  const { user } = useAuth();
  const timerRef = useRef(null);

  const check = useCallback(async () => {
    if (!user) return;
    if (typeof window === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const s = getNotifSettings();
    if (!s.enabled) return;

    const date  = todayStr();
    const now   = nowTimeStr();
    const tasks = await getTasksByDate(user.id, date);

    for (const task of tasks) {
      if (task.completed) continue;

      /* ── due_time이 있는 경우 ── */
      if (task.due_time) {
        if (s.atTime && now === task.due_time) {
          const key = `${task.id}:${date}:at`;
          if (!wasNotified(key)) {
            sendNotification('⏰ 마감 시간', `"${task.title}" 마감 시간입니다!`);
            markNotified(key);
          }
        }
        if (s.before30) {
          const t30 = subMinutes(task.due_time, 30);
          if (t30 && now === t30) {
            const key = `${task.id}:${date}:30m`;
            if (!wasNotified(key)) {
              sendNotification('⏳ 30분 전', `"${task.title}" 30분 후 마감입니다`);
              markNotified(key);
            }
          }
        }
        if (s.before60) {
          const t60 = subMinutes(task.due_time, 60);
          if (t60 && now === t60) {
            const key = `${task.id}:${date}:60m`;
            if (!wasNotified(key)) {
              sendNotification('⏰ 1시간 전', `"${task.title}" 1시간 후 마감입니다`);
              markNotified(key);
            }
          }
        }
      }

      if (s.morning && task.deadline === date && now === '09:00') {
        const key = `${task.id}:${date}:deadline-morning`;
        if (!wasNotified(key)) {
          sendNotification('📅 오늘 마감', `"${task.title}" 오늘이 최종 마감일입니다`);
          markNotified(key);
        }
      }

      if (s.morning && !task.due_time && !task.deadline && now === '09:00') {
        const key = `${task.id}:${date}:morning`;
        if (!wasNotified(key)) {
          sendNotification('📋 오늘 할일', `"${task.title}" 오늘 처리할 할일이 있습니다`);
          markNotified(key);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // 권한 요청 (최초 1회)
    requestNotificationPermission();

    // 즉시 1회 체크 후 매 분 체크
    check();
    timerRef.current = setInterval(check, 60_000);

    return () => clearInterval(timerRef.current);
  }, [user, check]);
}
