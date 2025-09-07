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
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto py-6 max-w-6xl px-4">
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
                  {selected.tags.map((tag, index) => (
                    <span
                      key={index}
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
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto py-6 max-w-6xl px-4">
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
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto py-6 max-w-6xl px-4">
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
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto py-6 max-w-6xl px-4">
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

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2" onMouseEnter={blockTranslationFeedback}>GPTXGONGMYUNG.COM</h2>
          <p className="text-gray-400">Our 🌿Slogan - "We're just. that kind of group!"</p>
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
                  <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()} onMouseEnter={blockTranslationFeedback}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={createAdminButtonHandler(() => togglePublish(content))}
                      className="text-gray-400 hover:text-white"
                      onMouseEnter={blockTranslationFeedback}
                    >
                      {content.isPublished ? <EyeOff className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
