// ==UserScript==
// @name         KHFF 위생교육 자동 다음 재생
// @namespace    https://leehyosone180603-bot.github.io/
// @version      1.0.0
// @description  한국건강기능식품협회(edu.khff.or.kr) 위생교육에서 한 차시 영상이 끝나면 자동으로 "다음" 영상으로 넘어가 재생합니다.
// @author       leehyosone
// @match        *://edu.khff.or.kr/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────────
  // 설정 값
  // ────────────────────────────────────────────────────────────────
  const CONFIG = {
    // 영상이 끝난 뒤 "다음"을 누르기까지 대기 시간(ms). 서버 진도 저장 여유.
    delayAfterEndMs: 1500,
    // 새 페이지/영상 로딩 후 재생 시도 반복 간격(ms)과 최대 시도 횟수.
    playRetryIntervalMs: 800,
    playRetryMax: 15,
    // "다음"으로 인식할 버튼 텍스트(우선순위 순).
    nextButtonTexts: ['다음', '다음강의', '다음 강의', 'NEXT', 'Next'],
    // 콘솔 로그 표시 여부.
    debug: true,
  };

  const TAG = '[KHFF-AUTO]';
  const log = (...a) => CONFIG.debug && console.log(TAG, ...a);

  // 중복 초기화 방지 플래그(같은 video 요소에 리스너 중복 부착 방지).
  const WATCHED = new WeakSet();
  let advancing = false; // "다음" 진행 중 중복 클릭 방지.

  // ────────────────────────────────────────────────────────────────
  // 유틸: 화면에 보이는 요소인지 확인
  // ────────────────────────────────────────────────────────────────
  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    return true;
  }

  function isDisabled(el) {
    if (!el) return true;
    if (el.disabled) return true;
    if (el.getAttribute && el.getAttribute('aria-disabled') === 'true') return true;
    const cls = (el.className || '') + '';
    if (/\b(disabled|disable|off|inactive)\b/i.test(cls)) return true;
    return false;
  }

  // ────────────────────────────────────────────────────────────────
  // "다음" 버튼 찾기 (button / a / 그 외 클릭 가능한 요소 텍스트 매칭)
  // ────────────────────────────────────────────────────────────────
  function findNextButton() {
    const candidates = Array.from(
      document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"], .btn, span, div')
    );

    for (const text of CONFIG.nextButtonTexts) {
      for (const el of candidates) {
        const label = (el.innerText || el.textContent || el.value || '').trim();
        // 정확히 일치하거나, 짧은 라벨(예: "다음")을 포함하는 요소 우선.
        if (!label) continue;
        const normalized = label.replace(/\s+/g, ' ');
        if (normalized === text || (normalized.length <= 6 && normalized.includes(text))) {
          if (isVisible(el) && !isDisabled(el)) {
            return el;
          }
        }
      }
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────────
  // 다음 강의로 이동
  // ────────────────────────────────────────────────────────────────
  function goNext() {
    if (advancing) return;
    const btn = findNextButton();
    if (!btn) {
      log('다음 버튼을 찾지 못했습니다. (마지막 차시이거나 아직 활성화 전)');
      return;
    }
    advancing = true;
    log('다음 강의로 이동합니다 →', btn);
    btn.click();

    // 클릭 후 페이지가 갱신되면 MutationObserver/폴링이 새 영상을 잡습니다.
    // AJAX 방식이면 같은 문서에서 새 video가 생기므로 잠시 뒤 플래그 해제.
    setTimeout(() => {
      advancing = false;
      tryAutoPlayLoop();
    }, 2500);
  }

  // ────────────────────────────────────────────────────────────────
  // 현재 영상 자동 재생 (브라우저 자동재생 정책 우회: 필요시 음소거)
  // ────────────────────────────────────────────────────────────────
  function tryPlay(video) {
    if (!video) return Promise.reject('no video');
    const p = video.play();
    if (p && typeof p.then === 'function') {
      return p.catch((err) => {
        // 자동재생 차단 시 음소거 후 재시도 → 성공하면 소리 복원.
        log('자동재생 차단, 음소거 후 재시도:', err && err.name);
        const wasMuted = video.muted;
        video.muted = true;
        return video.play().then(() => {
          setTimeout(() => { video.muted = wasMuted; }, 500);
        });
      });
    }
    return Promise.resolve();
  }

  function tryAutoPlayLoop() {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const video = document.querySelector('video');
      if (video && video.readyState >= 2 && video.paused && !video.ended) {
        tryPlay(video).then(() => log('영상 재생 시작')).catch(() => {});
        clearInterval(timer);
      } else if (video && !video.paused) {
        clearInterval(timer); // 이미 재생 중
      } else if (tries >= CONFIG.playRetryMax) {
        clearInterval(timer);
      }
    }, CONFIG.playRetryIntervalMs);
  }

  // ────────────────────────────────────────────────────────────────
  // video 요소에 "끝남" 감지 부착
  // ────────────────────────────────────────────────────────────────
  function watchVideo(video) {
    if (!video || WATCHED.has(video)) return;
    WATCHED.add(video);
    log('영상 감지, 종료 이벤트 부착');

    const onEnded = () => {
      log('영상 종료 감지 → ' + CONFIG.delayAfterEndMs + 'ms 후 다음으로');
      setTimeout(goNext, CONFIG.delayAfterEndMs);
    };
    video.addEventListener('ended', onEnded);

    // 일부 플레이어는 'ended'가 안 뜨기도 함 → 시간 기반 보조 감지.
    let firedByTime = false;
    const onTime = () => {
      if (firedByTime) return;
      if (video.duration && video.currentTime >= video.duration - 0.4 && video.duration > 1) {
        firedByTime = true;
        log('종료 시점 근접(시간 기반) → 다음 준비');
        setTimeout(() => {
          if (video.ended || video.paused) onEnded();
        }, 800);
      }
    };
    video.addEventListener('timeupdate', onTime);

    // 페이지 진입 시 이미 있는 영상은 바로 재생 시도.
    tryAutoPlayLoop();
  }

  // ────────────────────────────────────────────────────────────────
  // 초기 스캔 + DOM 변화 감시 (SPA/AJAX 대응)
  // ────────────────────────────────────────────────────────────────
  function scan() {
    document.querySelectorAll('video').forEach(watchVideo);
  }

  const observer = new MutationObserver(() => scan());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  scan();
  log('활성화 완료. 영상이 끝나면 자동으로 다음 강의로 넘어갑니다.');
})();
