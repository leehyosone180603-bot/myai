// ==UserScript==
// @name         KHFF 위생교육 자동 다음 재생
// @namespace    https://leehyosone180603-bot.github.io/
// @version      2.1.0
// @description  한국건강기능식품협회(edu.khff.or.kr) 위생교육에서 한 차시가 끝나면 "확인" 팝업을 자동으로 누르고, 다음 영상의 가운데 재생버튼을 눌러 자동 재생합니다.
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
    // "안내" 팝업이 뜬 뒤 "확인"을 누르기까지 대기 시간(ms).
    delayBeforeConfirmMs: 800,
    // 멈춘 영상을 다시 재생시키려 감시하는 주기(ms).
    playWatchdogMs: 1200,
    // 자동재생 정책을 통과하기 위해 새 영상을 "음소거"로 시작할지 여부.
    // (true 권장: 소리가 필요하면 재생 후 플레이어 음소거 버튼을 직접 해제하세요.)
    startMuted: true,
    // "확인"(다음으로 이동)으로 인식할 팝업 버튼 문구.
    confirmButtonTexts: ['확인'],
    // 절대 누르면 안 되는 문구(취소 등).
    denyButtonTexts: ['취소', '닫기', '이전'],
    // 팝업으로 인식할 문맥 키워드(오작동 방지용).
    confirmContextKeywords: ['완료', '이동', '다음 학습', '학습이'],
    // 콘솔 로그 표시 여부.
    debug: true,
  };

  const TAG = '[KHFF-AUTO]';
  const log = (...a) => CONFIG.debug && console.log(TAG, ...a);

  const WATCHED = new WeakSet(); // video 중복 감시 방지
  const CLICKED_CONFIRM = new WeakSet(); // 같은 확인 버튼 중복 클릭 방지
  let busy = false; // 확인 클릭 직후 잠깐 잠금

  // ────────────────────────────────────────────────────────────────
  // 유틸
  // ────────────────────────────────────────────────────────────────
  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    return true;
  }

  function isDisabled(el) {
    if (!el) return true;
    if (el.disabled) return true;
    if (el.getAttribute && el.getAttribute('aria-disabled') === 'true') return true;
    const cls = (el.className || '') + '';
    if (/\b(disabled|disable|inactive)\b/i.test(cls)) return true;
    return false;
  }

  function labelOf(el) {
    return (el.innerText || el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
  }

  // ────────────────────────────────────────────────────────────────
  // "안내" 팝업의 "확인" 버튼 찾아 누르기
  //  - 영상이 끝나면 사이트가 "…학습이 완료되었습니다 / 확인 버튼을 클릭하면
  //    다음 학습으로 이동합니다" 팝업을 띄운다. 그 "확인"을 눌러야 넘어간다.
  // ────────────────────────────────────────────────────────────────
  function findConfirmButton() {
    const candidates = Array.from(
      document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"], .btn, span, div')
    );

    for (const el of candidates) {
      const label = labelOf(el);
      if (!label) continue;
      // 정확히 "확인"인 짧은 버튼만.
      const isConfirm = CONFIG.confirmButtonTexts.some((t) => label === t || (label.length <= 4 && label.includes(t)));
      if (!isConfirm) continue;
      if (CONFIG.denyButtonTexts.some((t) => label === t)) continue;
      if (!isVisible(el) || isDisabled(el)) continue;
      if (CLICKED_CONFIRM.has(el)) continue;

      // 팝업 문맥 확인: 조상 요소 텍스트에 완료/이동 등 키워드가 있는지.
      let ctx = '';
      let node = el;
      for (let i = 0; i < 6 && node; i++) {
        ctx += ' ' + (node.textContent || '');
        node = node.parentElement;
      }
      const hasContext = CONFIG.confirmContextKeywords.some((k) => ctx.includes(k));
      if (hasContext) return el;
    }
    return null;
  }

  function clickConfirmIfPresent() {
    if (busy) return;
    const btn = findConfirmButton();
    if (!btn) return;
    busy = true;
    CLICKED_CONFIRM.add(btn);
    log('완료 팝업 감지 → "확인" 클릭', btn);
    setTimeout(() => {
      try { btn.click(); } catch (e) { log('확인 클릭 실패', e); }
      // 다음 영상 로딩 대기 후 잠금 해제(재생은 상시 감시가 담당).
      setTimeout(() => {
        busy = false;
        loggedPlaying = false;
        ensurePlaying();
      }, 2500);
    }, CONFIG.delayBeforeConfirmMs);
  }

  // ────────────────────────────────────────────────────────────────
  // 영상 재생: video.play() → 실패 시 가운데 재생버튼 클릭
  // ────────────────────────────────────────────────────────────────
  // Video.js 플레이어 객체 가져오기(있으면 가장 확실한 재생 경로)
  function getVjsPlayer() {
    try {
      if (window.videojs && typeof window.videojs.getAllPlayers === 'function') {
        // 폐기(disposed)된 플레이어는 제외하고, 가장 최근(=현재) 플레이어를 사용.
        const players = (window.videojs.getAllPlayers() || []).filter(
          (p) => p && (typeof p.isDisposed !== 'function' || !p.isDisposed())
        );
        if (players.length) return players[players.length - 1];
      }
    } catch (e) {}
    return null;
  }

  function dispatchClick(el, x, y) {
    ['mouseover', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x || 0, clientY: y || 0 }));
    });
  }

  // Video.js 큰 재생버튼(.vjs-big-play-button)을 정확히 클릭
  function clickBigPlay() {
    const big = document.querySelector('.vjs-big-play-button');
    if (big && isVisible(big)) {
      log('Video.js 재생버튼(.vjs-big-play-button) 클릭');
      dispatchClick(big);
      return true;
    }
    return false;
  }

  function clickCenterPlay(video) {
    // 영상 위 중앙의 재생(▶) 오버레이를 좌표로 눌러 준다.
    const rect = video.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    const target = document.elementFromPoint(x, y) || video;
    log('가운데 재생버튼 클릭 시도', target);
    dispatchClick(target, x, y);
    return true;
  }

  function tryPlayDirect(video) {
    // Video.js 플레이어가 있으면 그쪽 API로 재생(가장 확실).
    const vp = getVjsPlayer();
    if (vp && typeof vp.play === 'function') {
      try {
        const r = vp.play();
        if (r && typeof r.catch === 'function') {
          return r.catch(() => { try { vp.muted(true); return vp.play(); } catch (e) {} });
        }
        return Promise.resolve();
      } catch (e) {}
    }
    if (!video) return Promise.reject('no video');
    const p = video.play();
    if (p && typeof p.then === 'function') {
      return p.catch((err) => {
        // 자동재생 차단 → 음소거로 재생 후 소리 복원.
        const wasMuted = video.muted;
        video.muted = true;
        return video.play().then(() => setTimeout(() => { video.muted = wasMuted; }, 600)).catch(() => Promise.reject(err));
      });
    }
    return Promise.resolve();
  }

  function isPlaying(video) {
    const vp = getVjsPlayer();
    if (vp && typeof vp.paused === 'function') {
      try { return !vp.paused(); } catch (e) {}
    }
    return video && !video.paused && !video.ended;
  }

  let loggedPlaying = false;

  // 상시 감시: 영상이 멈춰 있으면 "음소거로" 재생시켜 자동재생 정책을 통과한다.
  //  - 이미 재생 중이면 아무 것도 하지 않으므로, 사용자가 소리를 켜도 다시 음소거되지 않는다.
  function ensurePlaying() {
    const video = document.querySelector('video');
    const vp = getVjsPlayer();
    if (!video && !vp) return;

    if (isPlaying(video)) {
      if (!loggedPlaying) { log('영상 재생 중'); loggedPlaying = true; }
      return;
    }
    loggedPlaying = false;

    // 자동재생 차단을 피하려면 먼저 음소거해야 한다(음소거 재생은 항상 허용).
    if (CONFIG.startMuted) {
      try { if (vp && typeof vp.muted === 'function') vp.muted(true); } catch (e) {}
      if (video) video.muted = true;
    }

    tryPlayDirect(video).catch(() => {});
    // 그래도 멈춰 있으면 Video.js 재생버튼 → (없으면) 가운데 좌표 클릭.
    setTimeout(() => {
      if (!isPlaying(video)) {
        if (!clickBigPlay() && video) clickCenterPlay(video);
      }
    }, 300);
  }

  // ────────────────────────────────────────────────────────────────
  // video 요소 감시(끝남 감지는 보조 수단; 실제 이동은 확인 팝업이 담당)
  // ────────────────────────────────────────────────────────────────
  function watchVideo(video) {
    if (!video || WATCHED.has(video)) return;
    WATCHED.add(video);
    log('영상 감지');
    video.addEventListener('ended', () => {
      log('영상 종료 → 확인 팝업 대기');
      loggedPlaying = false;
      setTimeout(clickConfirmIfPresent, 500);
    });
    // 페이지에 이미 있는(방금 넘어온) 영상은 바로 재생 시도.
    ensurePlaying();
  }

  // ────────────────────────────────────────────────────────────────
  // 초기 스캔 + DOM 변화 감시(팝업 등장/영상 교체 모두 대응)
  // ────────────────────────────────────────────────────────────────
  function scan() {
    document.querySelectorAll('video').forEach(watchVideo);
    clickConfirmIfPresent(); // 완료 팝업이 떠 있으면 즉시 확인
  }

  const observer = new MutationObserver(() => scan());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // 팝업이 애니메이션으로 늦게 뜨는 경우 대비해 주기적으로도 확인.
  setInterval(clickConfirmIfPresent, 1500);
  // 멈춘 영상을 상시 감시하며 다시 재생(음소거 자동재생으로 정책 통과).
  setInterval(ensurePlaying, CONFIG.playWatchdogMs);

  scan();
  log('활성화 완료. 영상이 끝나면 "확인"을 자동으로 누르고 다음 영상을 재생합니다.');
})();
