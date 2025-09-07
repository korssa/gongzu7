"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Edit, Trash2, EyeOff, Calendar, User, ArrowLeft, Home } from "lucide-react";
import { ContentItem, ContentFormData, ContentType } from "@/types";
import { useAdmin } from "@/hooks/use-admin";
import { uploadFile } from "@/lib/storage-adapter";
import { blockTranslationFeedback, createAdminButtonHandler } from "@/lib/translation-utils";
import { loadContentsFromBlob } from "@/lib/data-loader";
import { loadMemoDraft, saveMemoDraft, clearMemoDraft } from "@/lib/memo-storage";
import Link from "next/link";

export default function MemoPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [formData, setFormData] = useState<ContentFormData>({
    title: "",
    content: "",
    author: "",
    type: 'memo' as ContentType,
    tags: "",
    isPublished: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { isAuthenticated } = useAdmin();

  // 🌌 밤하늘 애니메이션 요소 생성 (Canvas 버전)
  useEffect(() => {
    // ========== Canvas Setup ==========
    const canvas = document.getElementById('skyCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resizeCanvas() {
      canvas.width = Math.floor(canvas.clientWidth * devicePixelRatio);
      canvas.height = Math.floor(canvas.clientHeight * devicePixelRatio);
      updateStarPositions(); // 화면 크기 변경 시 별 위치 업데이트
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ========== Stars (twinkle) - 반응형 + 매우 느린 깜박임 ==========
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    let stars: Array<{
      x: number; y: number; r: number; p: number; twinkleSpeed: number;
      xPercent: number; yPercent: number; // 퍼센트 기반 위치 저장
    }> = [];
    let crossStars: Array<{
      x: number; y: number; size: number; phase: number; tingInterval: number; lastTing: number;
      xPercent: number; yPercent: number; // 퍼센트 기반 위치 저장
    }> = [];

    // 별과 십자별 초기화 함수
    function initializeStars() {
      stars = Array.from({ length: 300 }, () => {
        const xPercent = Math.random();
        const yPercent = Math.random();
        return {
          x: xPercent * canvas.width,
          y: yPercent * canvas.height,
          r: rand(0.8, 2.2) * devicePixelRatio,
          p: Math.random() * Math.PI * 2,
          twinkleSpeed: rand(0.0005, 0.002),
          xPercent,
          yPercent
        };
      });

      crossStars = Array.from({ length: 5 }, () => {
        const xPercent = rand(0.1, 0.9);
        const yPercent = rand(0.1, 0.9);
        return {
          x: xPercent * canvas.width,
          y: yPercent * canvas.height,
          size: rand(12, 20),
          phase: Math.random() * Math.PI * 2,
          tingInterval: rand(3000, 8000),
          lastTing: 0,
          xPercent,
          yPercent
        };
      });
    }

    // 화면 크기 변경 시 별 위치 재계산
    function updateStarPositions() {
      stars.forEach(star => {
        star.x = star.xPercent * canvas.width;
        star.y = star.yPercent * canvas.height;
        star.r = rand(0.8, 2.2) * devicePixelRatio;
      });

      crossStars.forEach(cross => {
        cross.x = cross.xPercent * canvas.width;
        cross.y = cross.yPercent * canvas.height;
      });
    }

    initializeStars();

    // ========== Meteor (크기와 꼬리 개선) ==========
    let meteor: { x: number; y: number; vx: number; vy: number; life: number; trail: Array<{x: number; y: number; life: number}> } | null = null;
    let meteorTimer = 0;

    // ========== Animation Loop ==========
    function animate() {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 일반 별들 그리기 (매우 느린 트윙클)
      stars.forEach(star => {
        const twinkle = 0.3 + 0.7 * Math.sin(Date.now() * star.twinkleSpeed + star.p);
        ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.9})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 십자별 그리기 (아름다운 금색 광선 효과)
      const currentTime = Date.now();
      crossStars.forEach(cross => {
        const timeSinceLastTing = currentTime - cross.lastTing;
        const shouldTing = timeSinceLastTing > cross.tingInterval;
        
        if (shouldTing) {
          cross.lastTing = currentTime;
        }
        
        // 팅 효과 계산 (팅 후 1.5초간 지속)
        const tingProgress = Math.min(timeSinceLastTing / 1500, 1);
        const tingIntensity = shouldTing ? 1 : Math.max(0, 1 - tingProgress);
        
        if (tingIntensity > 0) {
          // 메인 십자가 (세로, 가로) - 길게, 흰색
          ctx.strokeStyle = `rgba(255,255,255,${tingIntensity * 0.8})`;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          
          const mainCrossSize = cross.size * 1.2; // 십자를 더 길게
          ctx.beginPath();
          ctx.moveTo(cross.x, cross.y - mainCrossSize);
          ctx.lineTo(cross.x, cross.y + mainCrossSize);
          ctx.moveTo(cross.x - mainCrossSize, cross.y);
          ctx.lineTo(cross.x + mainCrossSize, cross.y);
          ctx.stroke();
          
          // 8방향 금색 광선 (짧게, 금색)
          const raySize = cross.size * 0.4; // 십자 사이 빛은 짧게
          const rayPositions = [
            { x: cross.x + raySize, y: cross.y - raySize }, // 우상단
            { x: cross.x + raySize, y: cross.y + raySize }, // 우하단
            { x: cross.x - raySize, y: cross.y + raySize }, // 좌하단
            { x: cross.x - raySize, y: cross.y - raySize }, // 좌상단
            { x: cross.x + raySize * 1.2, y: cross.y }, // 우측
            { x: cross.x, y: cross.y + raySize * 1.2 }, // 하단
            { x: cross.x - raySize * 1.2, y: cross.y }, // 좌측
            { x: cross.x, y: cross.y - raySize * 1.2 }  // 상단
          ];
          
          rayPositions.forEach((pos, i) => {
            const rayAlpha = tingIntensity * (0.9 - i * 0.08);
            
            // 진짜 별이 반짝이는 효과 - 여러 개의 작은 별들
            const starCount = 3 + Math.floor(Math.random() * 3); // 3-5개의 작은 별
            for (let j = 0; j < starCount; j++) {
              const starOffset = (Math.random() - 0.5) * raySize * 0.8;
              const starX = pos.x + starOffset;
              const starY = pos.y + starOffset;
              const starSize = raySize * (0.3 + Math.random() * 0.4);
              const starTwinkle = Math.sin(Date.now() * 0.005 + j * 0.5) * 0.5 + 0.5;
              
              // 별의 반짝임 효과
              const starAlpha = rayAlpha * starTwinkle * (0.7 + Math.random() * 0.3);
              
              // 금색 그라디언트 (별 모양)
              const gradient = ctx.createRadialGradient(starX, starY, 0, starX, starY, starSize);
              gradient.addColorStop(0, `rgba(255,215,0,${starAlpha})`); // 금색 중심
              gradient.addColorStop(0.3, `rgba(255,255,100,${starAlpha * 0.8})`); // 연금색
              gradient.addColorStop(0.7, `rgba(255,255,200,${starAlpha * 0.5})`); // 연한 금색
              gradient.addColorStop(1, `rgba(255,255,255,${starAlpha * 0.2})`); // 흰색 외곽
              
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
              ctx.fill();
              
              // 별의 글로우 효과 (반짝임)
              ctx.shadowColor = `rgba(255,215,0,${starAlpha * 0.6})`;
              ctx.shadowBlur = 6 + starTwinkle * 4; // 반짝임에 따라 글로우 강도 변화
              ctx.beginPath();
              ctx.arc(starX, starY, starSize * 0.6, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
              
              // 별의 십자 광선 효과
              if (starTwinkle > 0.7) {
                ctx.strokeStyle = `rgba(255,215,0,${starAlpha * 0.8})`;
                ctx.lineWidth = 1;
                ctx.lineCap = 'round';
                
                const crossLength = starSize * 1.5;
                ctx.beginPath();
                ctx.moveTo(starX - crossLength, starY);
                ctx.lineTo(starX + crossLength, starY);
                ctx.moveTo(starX, starY - crossLength);
                ctx.lineTo(starX, starY + crossLength);
                ctx.stroke();
              }
            }
          });
        }
      });

      // 유성 처리 (크기와 꼬리 개선)
      meteorTimer++;
      if (meteorTimer > 400 && !meteor) { // 6.7초마다 유성 생성
        meteor = {
          x: canvas.width * 0.9,
          y: -30,
          vx: -12,
          vy: 8,
          life: 1,
          trail: []
        };
        meteorTimer = 0;
      }

      if (meteor) {
        // 유성 이동
        meteor.x += meteor.vx;
        meteor.y += meteor.vy;
        meteor.life -= 0.015;
        
        // 꼬리 추가 (더 자주, 더 길게)
        meteor.trail.push({ x: meteor.x, y: meteor.y, life: 1 });
        if (meteor.trail.length > 40) meteor.trail.shift(); // 꼬리 길이 증가
        
        // 꼬리 그리기 (더 긴 그라디언트)
        meteor.trail.forEach((point, i) => {
          const alpha = (point.life * i) / meteor!.trail.length;
          const trailLength = 60; // 꼬리 길이 증가
          const gradient = ctx.createLinearGradient(
            point.x, point.y, 
            point.x - trailLength, point.y + trailLength
          );
          gradient.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
          gradient.addColorStop(0.3, `rgba(255,255,255,${alpha * 0.6})`);
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
          point.life -= 0.08;
        });
        
        // 유성 머리 그리기 (더 크게)
        const headSize = 6 + (meteor.life * 2); // 크기 증가
        ctx.fillStyle = `rgba(255,255,255,${meteor.life})`;
        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, headSize, 0, Math.PI * 2);
        ctx.fill();
        
        // 유성 머리 글로우 효과
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(meteor.x, meteor.y, headSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        if (meteor.life <= 0 || meteor.x < -100) {
          meteor = null;
        }
      }

      requestAnimationFrame(animate);
    }

    animate();

    // 야광충 삭제됨 - 십자별의 진짜 별 반짝임 효과로 대체

    // 컴포넌트 언마운트 시 정리
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.querySelectorAll('.glowbug').forEach(el => el.remove());
    };
  }, []);

  // 위젯 토글 시 메모 저장 브로드캐스트 수신
  useEffect(() => {
    const handler = () => {
      saveMemoDraft('memo', {
        title: formData.title,
        content: formData.content,
        author: formData.author,
        tags: formData.tags,
        isPublished: formData.isPublished,
      });
    };
    window.addEventListener('memo:save-draft', handler);
    return () => window.removeEventListener('memo:save-draft', handler);
  }, [formData.title, formData.content, formData.author, formData.tags, formData.isPublished]);

  // 폼 로컬 캐시 복원
  useEffect(() => {
    const draft = loadMemoDraft('memo');
    if (draft) {
      setFormData(prev => ({
        ...prev,
        title: draft.title ?? prev.title,
        content: draft.content ?? prev.content,
        author: draft.author ?? prev.author,
        tags: draft.tags ?? prev.tags,
        isPublished: typeof draft.isPublished === 'boolean' ? draft.isPublished : prev.isPublished,
      }));
    }
  }, []);

  // 폼 변경 즉시 저장
  useEffect(() => {
    saveMemoDraft('memo', {
      title: formData.title,
      content: formData.content,
      author: formData.author,
      tags: formData.tags,
      isPublished: formData.isPublished,
    });
  }, [formData.title, formData.content, formData.author, formData.tags, formData.isPublished]);

  // Load content list
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // 먼저 기존 API에서 memo 타입 콘텐츠 로드 시도
        console.log('📝 [Memo] Loading memo content from API...');
        const res = await fetch(`/api/content?type=memo`);
        
        if (res.ok) {
          const data = await res.json();
          const finalContents = isAuthenticated ? data : data.filter((c: ContentItem) => c.isPublished);
          setContents(finalContents);
          console.log('📝 [Memo] Content loaded from API:', finalContents.length, 'items');
        } else {
          console.warn('📝 [Memo] API load failed, trying Blob...');
          // API 실패 시 Blob에서 로드 시도
          const blobContents = await loadContentsFromBlob();
          console.log('📝 [Memo] Total content loaded from Blob:', blobContents.length, 'items');
          
          const filteredBlobContents = blobContents.filter((c: ContentItem) => c.type === 'memo');
          console.log('📝 [Memo] Filtered memo content:', filteredBlobContents.length, 'items');
          
          const finalContents = isAuthenticated ? filteredBlobContents : filteredBlobContents.filter((c: ContentItem) => c.isPublished);
          setContents(finalContents);
          console.log('📝 [Memo] Final content set from Blob:', finalContents.length, 'items');
        }
      } catch (err) {
        console.error('📝 [Memo] Failed to load content:', err);
        setContents([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    
    // 번역 피드백 차단 함수
    const blockTranslationFeedback = () => {
      try {
        const selectors = [
          '[class*="goog-"]',
          '[id*="goog-"]',
        ];
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            Object.assign((el as HTMLElement).style, {
              display: 'none',
              visibility: 'hidden',
              opacity: '0',
              pointerEvents: 'none',
              position: 'absolute',
              zIndex: '-9999',
              left: '-9999px',
              top: '-9999px',
            });
          });
        });
      } catch {
        // 에러 무시
      }
    };

    // DOM 변화 감지 후 제거
    const observer = new MutationObserver(() => blockTranslationFeedback());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 최초 실행
    blockTranslationFeedback();
    
    return () => observer.disconnect();
  }, [isAuthenticated]);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      author: "",
      type: 'memo' as ContentType,
      tags: "",
      isPublished: true,
    });
    setEditingContent(null);
    setSelectedImage(null);
    setImagePreview(null);
    clearMemoDraft('memo');
  };

  // 이미지 선택 핸들러
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  // 이미지 제거 핸들러
  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  // 콘텐츠 저장
  const handleSubmit = async () => {
    try {
      // 필수 필드 검증
      if (!formData.title.trim()) {
        alert('Please enter a title.');
        return;
      }
      if (!formData.author.trim()) {
        alert('Please enter an author.');
        return;
      }
      if (!formData.content.trim()) {
        alert('Please enter content.');
        return;
      }

      let imageUrl = null;

      // 이미지가 선택된 경우 업로드
      if (selectedImage) {
        try {
          imageUrl = await uploadFile(selectedImage, 'content-images');
        } catch {
          throw new Error('Image upload failed.');
        }
      }

      const url = editingContent ? `/api/content` : `/api/content`;
      const method = editingContent ? 'PUT' : 'POST';
      const body = editingContent 
        ? { id: editingContent.id, ...formData, imageUrl } 
        : { ...formData, imageUrl };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        resetForm();
        clearMemoDraft('memo');
        
        // 콘텐츠 목록 다시 로드
        try {
          const res = await fetch(`/api/content?type=memo`);
          if (res.ok) {
            const data = await res.json();
            setContents(isAuthenticated ? data : data.filter((c: ContentItem) => c.isPublished));
          }
        } catch (error) {
          // 목록 새로고침 실패
        }
        
        alert(editingContent ? 'Memo has been updated.' : 'Memo has been saved.');
      } else {
        let message = 'Failed to save memo.';
        try {
          const err = await response.json();
          if (err?.error) message = `Failed to save memo: ${err.error}`;
          if (err?.details) message += `\nDetails: ${err.details}`;
        } catch {}
        alert(message);
      }
    } catch {
      alert('Failed to save memo.');
    }
  };

  // 콘텐츠 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete?')) return;

    try {
      const response = await fetch(`/api/content?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 콘텐츠 목록 다시 로드
        try {
          const res = await fetch(`/api/content?type=memo`);
          if (res.ok) {
            const data = await res.json();
            setContents(isAuthenticated ? data : data.filter((c: ContentItem) => c.isPublished));
          }
        } catch (error) {
          // 삭제 후 목록 새로고침 실패
        }
        
        alert('Memo has been deleted.');
      }
    } catch {
      // 삭제 실패
    }
  };

  // 편집 모드 시작
  const handleEdit = (content: ContentItem) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      content: content.content,
      author: content.author,
      type: content.type,
      tags: content.tags?.join(', ') ?? "",
      isPublished: content.isPublished,
    });
    setIsDialogOpen(true);
  };

  // 게시 상태 토글
  const togglePublish = async (content: ContentItem) => {
    try {
      const response = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: content.id,
          isPublished: !content.isPublished,
        }),
      });

      if (response.ok) {
        const res = await fetch(`/api/content?type=memo`);
        const data = await res.json();
        setContents(isAuthenticated ? data : data.filter((c: ContentItem) => c.isPublished));
      }
    } catch {
      // 토글 실패
    }
  };

  // If content selected, show detail view
  if (selected) {
    return (
      <div className="min-h-screen bg-black text-white relative">
        {/* 🌌 GPTXGONGMYUNG MEMO - Night Sky Animation (Canvas ver.) */}
        <style dangerouslySetInnerHTML={{
          __html: `
          /* 🌟 전체 화면 캔버스 영역 */
          #skyCanvas {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            pointer-events: none;
            z-index: 1;
          }
          
          /* 🌕 달 (좌측) */
          .moon {
            position: fixed; top: 6vh; left: 4vw;
            width: 64px; height: 64px; border-radius: 50%;
            background: radial-gradient(circle at 40% 40%, #fff 0%, #dcdcdc 45%, #bfbfbf 70%, rgba(0,0,0,0) 100%);
            box-shadow: 0 0 24px rgba(255,255,255,0.35);
            animation: moonFloat 12s ease-in-out infinite;
            z-index: 2;
          }
          @keyframes moonFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }

          /* 야광충 삭제됨 - 십자별의 진짜 별 반짝임 효과로 대체 */

          /* 배경 별빛 살짝 (CSS 레이어) */
          body::before{
            content:""; position:fixed; top:0; left:0; width:100vw; height:40vh; z-index:0; pointer-events:none;
            background:
              radial-gradient(circle at 20% 30%, rgba(255,255,255,.08), transparent 55%),
              radial-gradient(circle at 80% 40%, rgba(255,255,255,.06), transparent 60%),
              radial-gradient(circle at 10% 10%, rgba(255,255,255,.06), transparent 60%),
              radial-gradient(circle at 50% 70%, rgba(200,255,255,.05), transparent 55%);
          }
        `}} />

        <canvas id="skyCanvas"></canvas>
        <div className="moon"></div>
        
        <div className="container mx-auto py-6 max-w-6xl px-4 relative z-10">
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              href="/"
              className="flex items-center gap-2 text-white hover:text-amber-400 transition-colors"
              onMouseEnter={blockTranslationFeedback}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Button 
              onClick={() => {
                setSelected(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              variant="ghost" 
              className="text-white hover:text-amber-400 transition-colors"
              onMouseEnter={blockTranslationFeedback}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              ← Back to List
            </Button>
          </div>

          <div className="w-full flex justify-center">
            <div className="w-full max-w-2xl">
              {/* Header Info */}
              <div className="text-white border-b border-gray-600 pb-4 mb-6" onMouseEnter={blockTranslationFeedback}>
                <h1 className="text-3xl font-bold mb-2" translate="no">{selected.title}</h1>
                <div className="flex gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" /> <span translate="no">{selected.author}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(selected.publishDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Main Content */}
              <article className="text-left text-gray-300 leading-relaxed space-y-6" onMouseEnter={blockTranslationFeedback}>
                {/* Place image at the beginning of content if available */}
                {selected.imageUrl && (
                  <div className="flex justify-start mb-6">
                    <img
                      src={selected.imageUrl}
                      alt={selected.title}
                      className="max-w-xs h-auto rounded shadow-lg"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                )}

                {/* Main Text */}
                <pre
                  className="whitespace-pre-wrap font-mono preserve-format"
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'keep-all',
                    wordWrap: 'break-word',
                    fontFamily: 'monospace'
                  }}
                >
                  {selected.content}
                </pre>
              </article>

              {/* Tags */}
              {selected.tags && selected.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-6 pt-4 border-t border-gray-600" onMouseEnter={blockTranslationFeedback}>
                  {selected.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-white text-black rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white relative">
        {/* 🌌 GPTXGONGMYUNG MEMO - Night Sky Animation (Canvas ver.) */}
        <style dangerouslySetInnerHTML={{
          __html: `
          /* 🌟 전체 화면 캔버스 영역 */
          #skyCanvas {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            pointer-events: none;
            z-index: 1;
          }
          
          /* 🌕 달 (좌측) */
          .moon {
            position: fixed; top: 6vh; left: 4vw;
            width: 64px; height: 64px; border-radius: 50%;
            background: radial-gradient(circle at 40% 40%, #fff 0%, #dcdcdc 45%, #bfbfbf 70%, rgba(0,0,0,0) 100%);
            box-shadow: 0 0 24px rgba(255,255,255,0.35);
            animation: moonFloat 12s ease-in-out infinite;
            z-index: 2;
          }
          @keyframes moonFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }

          /* 야광충 삭제됨 - 십자별의 진짜 별 반짝임 효과로 대체 */

          /* 배경 별빛 살짝 (CSS 레이어) */
          body::before{
            content:""; position:fixed; top:0; left:0; width:100vw; height:40vh; z-index:0; pointer-events:none;
            background:
              radial-gradient(circle at 20% 30%, rgba(255,255,255,.08), transparent 55%),
              radial-gradient(circle at 80% 40%, rgba(255,255,255,.06), transparent 60%),
              radial-gradient(circle at 10% 10%, rgba(255,255,255,.06), transparent 60%),
              radial-gradient(circle at 50% 70%, rgba(200,255,255,.05), transparent 55%);
          }
        `}} />

        <canvas id="skyCanvas"></canvas>
        <div className="moon"></div>
        
        <div className="container mx-auto py-6 max-w-6xl px-4 relative z-10">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading memos...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (contents.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white relative">
        {/* 🌌 GPTXGONGMYUNG MEMO - Night Sky Animation (Canvas ver.) */}
        <style dangerouslySetInnerHTML={{
          __html: `
          /* 🌟 전체 화면 캔버스 영역 */
          #skyCanvas {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            pointer-events: none;
            z-index: 1;
          }
          
          /* 🌕 달 (좌측) */
          .moon {
            position: fixed; top: 6vh; left: 4vw;
            width: 64px; height: 64px; border-radius: 50%;
            background: radial-gradient(circle at 40% 40%, #fff 0%, #dcdcdc 45%, #bfbfbf 70%, rgba(0,0,0,0) 100%);
            box-shadow: 0 0 24px rgba(255,255,255,0.35);
            animation: moonFloat 12s ease-in-out infinite;
            z-index: 2;
          }
          @keyframes moonFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }

          /* 야광충 삭제됨 - 십자별의 진짜 별 반짝임 효과로 대체 */

          /* 배경 별빛 살짝 (CSS 레이어) */
          body::before{
            content:""; position:fixed; top:0; left:0; width:100vw; height:40vh; z-index:0; pointer-events:none;
            background:
              radial-gradient(circle at 20% 30%, rgba(255,255,255,.08), transparent 55%),
              radial-gradient(circle at 80% 40%, rgba(255,255,255,.06), transparent 60%),
              radial-gradient(circle at 10% 10%, rgba(255,255,255,.06), transparent 60%),
              radial-gradient(circle at 50% 70%, rgba(200,255,255,.05), transparent 55%);
          }
        `}} />

        <canvas id="skyCanvas"></canvas>
        <div className="moon"></div>
        
        <div className="container mx-auto py-6 max-w-6xl px-4 relative z-10">
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              href="/"
              className="flex items-center gap-2 text-white hover:text-amber-400 transition-colors"
              onMouseEnter={blockTranslationFeedback}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          </div>

          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No memos yet</h3>
            <p className="text-gray-400 mb-6">New memos will be added soon.</p>
            
            {/* Show add button only in admin mode */}
          {isAuthenticated && (
            <div className="mt-6">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Memo
                  </Button>
                </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingContent ? 'Edit Memo' : 'Create New Memo'}
                      </DialogTitle>
                      <DialogDescription>
                        Create a new memo.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="memo-title" className="block text-sm font-medium mb-2">Title *</label>
                        <Input
                          id="memo-title"
                          name="title"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter title"
                        />
                      </div>

                      <div>
                        <label htmlFor="memo-author" className="block text-sm font-medium mb-2">Author *</label>
                        <Input
                          id="memo-author"
                          name="author"
                          value={formData.author}
                          onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                          placeholder="Enter author name"
                        />
                      </div>

                      <div>
                        <label htmlFor="memo-content" className="block text-sm font-medium mb-2">Content *</label>
                        <Textarea
                          id="memo-content"
                          name="content"
                          value={formData.content}
                          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Enter content"
                          rows={10}
                        />
                      </div>

                      <div>
                        <label htmlFor="memo-tags" className="block text-sm font-medium mb-2">Tags</label>
                        <Input
                          id="memo-tags"
                          name="tags"
                          value={formData.tags}
                          onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="Enter tags separated by commas"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Featured Image (Optional)</label>
                        <div className="space-y-2">
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => document.getElementById('image-upload')?.click()}
                              className="px-3 py-2 text-sm bg-gray-800 border border-gray-600 text-gray-300 hover:border-amber-400 rounded transition-colors"
                            >
                              Select Image
                            </button>
                            {selectedImage && (
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="px-3 py-2 text-sm bg-red-600 border border-red-600 text-white hover:bg-red-700 rounded transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          {imagePreview && (
                            <div className="mt-2">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-32 h-32 object-cover rounded border"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isPublished"
                          checked={formData.isPublished}
                          onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                        />
                        <label htmlFor="isPublished" className="text-sm">
                          Publish immediately
                        </label>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit}>
                        {editingContent ? 'Update' : 'Save'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* 🌌 GPTXGONGMYUNG MEMO - Night Sky Animation (Canvas ver.) */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* 🌟 전체 화면 캔버스 영역 */
          #skyCanvas {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            pointer-events: none;
            z-index: 1;
          }
          
          /* 🌕 달 (좌측) */
          .moon {
            position: fixed; top: 6vh; left: 4vw;
            width: 64px; height: 64px; border-radius: 50%;
            background: radial-gradient(circle at 40% 40%, #fff 0%, #dcdcdc 45%, #bfbfbf 70%, rgba(0,0,0,0) 100%);
            box-shadow: 0 0 24px rgba(255,255,255,0.35);
            animation: moonFloat 12s ease-in-out infinite;
            z-index: 2;
          }
          @keyframes moonFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }

          /* 야광충 삭제됨 - 십자별의 진짜 별 반짝임 효과로 대체 */

          /* 배경 별빛 살짝 (CSS 레이어) */
          body::before{
            content:""; position:fixed; top:0; left:0; width:100vw; height:40vh; z-index:0; pointer-events:none;
            background:
              radial-gradient(circle at 20% 30%, rgba(255,255,255,.08), transparent 55%),
              radial-gradient(circle at 80% 40%, rgba(255,255,255,.06), transparent 60%),
              radial-gradient(circle at 10% 10%, rgba(255,255,255,.06), transparent 60%),
              radial-gradient(circle at 50% 70%, rgba(200,255,255,.05), transparent 55%);
          }
        `
      }} />

      <canvas id="skyCanvas"></canvas>
      <div className="moon"></div>

      <div className="container mx-auto py-6 max-w-6xl px-4 relative z-10">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/"
            className="flex items-center gap-2 text-white hover:text-amber-400 transition-colors"
            onMouseEnter={blockTranslationFeedback}
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>

        {/* 슬로건 위치 - 밤하늘 애니메이션과 함께 */}
        <div className="text-center mb-8 relative z-10" style={{ padding: '3rem 1rem' }}>
          <h2 className="text-3xl font-bold text-white mb-2" onMouseEnter={blockTranslationFeedback} style={{ textShadow: '0 0 6px rgba(0,0,0,0.6)' }}>GPTXGONGMYUNG.COM</h2>
          <p className="text-gray-400" style={{ textShadow: '0 0 6px rgba(0,0,0,0.6)' }}>Our 🌿Slogan - &quot;We&apos;re just. that kind of group!&quot;</p>
        {isAuthenticated && (
          <div className="mt-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Memo
                </Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingContent ? 'Edit Memo' : 'Create New Memo'}
                    </DialogTitle>
                    <DialogDescription>
                      Create a new memo.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="memo-title-list" className="block text-sm font-medium mb-2">Title *</label>
                      <Input
                        id="memo-title-list"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter title"
                      />
                    </div>

                    <div>
                      <label htmlFor="memo-author-list" className="block text-sm font-medium mb-2">Author *</label>
                      <Input
                        id="memo-author-list"
                        value={formData.author}
                        onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                        placeholder="Enter author name"
                      />
                    </div>

                    <div>
                      <label htmlFor="memo-content-list" className="block text-sm font-medium mb-2">Content *</label>
                      <Textarea
                        id="memo-content-list"
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Enter content"
                        rows={10}
                      />
                    </div>

                    <div>
                      <label htmlFor="memo-tags-list" className="block text-sm font-medium mb-2">Tags</label>
                      <Input
                        id="memo-tags-list"
                        value={formData.tags}
                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="Enter tags separated by commas"
                      />
                    </div>

                    <div>
                      <label htmlFor="memo-image-list" className="block text-sm font-medium mb-2">Featured Image (Optional)</label>
                      <div className="space-y-2">
                        <input
                          id="image-upload-list"
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => document.getElementById('image-upload-list')?.click()}
                            className="px-3 py-2 text-sm bg-gray-800 border border-gray-600 text-gray-300 hover:border-amber-400 rounded transition-colors"
                          >
                            Select Image
                          </button>
                          {selectedImage && (
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="px-3 py-2 text-sm bg-red-600 border border-red-600 text-white hover:bg-red-700 rounded transition-colors"
                            >
                                Remove
                            </button>
                          )}
                        </div>
                        {imagePreview && (
                          <div className="mt-2">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-32 h-32 object-cover rounded border"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isPublished"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                      />
                      <label htmlFor="isPublished" className="text-sm">
                        Publish immediately
                      </label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                      {editingContent ? 'Update' : 'Save'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contents.map((content) => (
            <Card
              key={content.id}
              className="bg-gray-800/50 border-2 border-gray-700 hover:border-amber-400/70 hover:bg-gray-800/80 transition-all duration-300 cursor-pointer group"
              onClick={() => {
                setSelected(content);
                blockTranslationFeedback();
              }}
            >
              <CardHeader className="pb-3">
                {content.imageUrl && (
                  <div className="aspect-video overflow-hidden rounded-lg mb-3">
                    <img
                      src={content.imageUrl}
                      alt={content.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardTitle className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-2" translate="no">
                  {content.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span translate="no">{content.author}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(content.publishDate).toLocaleDateString()}
                  </span>
                </div>

                {isAuthenticated && (
                  <div 
                    className="flex items-center gap-2 mt-2" 
                    onClick={(e) => e.stopPropagation()} 
                    onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
                    onMouseEnter={blockTranslationFeedback}
                    role="button"
                    tabIndex={0}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={createAdminButtonHandler(() => togglePublish(content))}
                      className="text-gray-400 hover:text-white"
                      onMouseEnter={blockTranslationFeedback}
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={createAdminButtonHandler(() => handleEdit(content))}
                      className="text-gray-400 hover:text-white"
                      onMouseEnter={blockTranslationFeedback}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={createAdminButtonHandler(() => handleDelete(content.id))}
                      className="text-red-400 hover:text-red-300"
                      onMouseEnter={blockTranslationFeedback}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
