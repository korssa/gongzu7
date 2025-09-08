"use client";

import { useEffect } from "react";

export function useTranslationShield() {
  useEffect(() => {
    // 강화된 번역 피드백 제거 함수
    const blockTranslationFeedback = () => {
      // Google Translate 피드백 요소들 제거
      const selectors = [
        '[id^="goog-gt-"]',
        '.goog-te-banner-frame',
        '.goog-te-balloon-frame',
        '.VIpgJd-ZVi9od-ORHb-OEVmcd',
        '.goog-tooltip',
        '.goog-tooltip-text',
        '.goog-te-spinner-pos',
        '.goog-te-gadget-simple',
        '.goog-te-ftab',
        '.goog-te-ftab-float',
        '.goog-te-balloon-frame',
        '.goog-te-balloon-frame-skiptranslate',
        '.goog-te-improve-notification',
        '[class*="goog-te-balloon"]',
        '[class*="goog-te-ftab"]',
        '[class*="goog-te-tooltip"]',
        '[class*="goog-te-banner"]',
        '[id*="goog-te"]',
        '[id*="goog-tooltip"]',
        '[id*="goog-balloon"]'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          el.remove();
        });
      });

      // 번역된 클래스 제거
      document.querySelectorAll("body *").forEach(el => {
        if (el.classList) {
          el.classList.forEach(cls => {
            if (cls.startsWith("VIpgJd") || cls.includes("goog")) {
              el.classList.remove(cls);
            }
          });
        }
      });

      // 번역 피드백 관련 스타일 제거
      document.querySelectorAll('[style*="background-color: rgb(255, 255, 255)"]').forEach(el => {
        if (!el.closest('[role="combobox"]') && !el.closest('[role="listbox"]')) {
          el.removeAttribute('style');
        }
      });
    };

    // 최초 1회 실행
    blockTranslationFeedback();

    // MutationObserver 실시간 감시
    const observer = new MutationObserver(() => {
      blockTranslationFeedback();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 추가 보조: 3초마다 재확인
    const interval = setInterval(blockTranslationFeedback, 3000);

    // 언마운트 시 정리
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
}
