import { NextRequest, NextResponse } from 'next/server';
import { ContentItem, ContentFormData } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

// 메모2 전용 파일 경로
const MEMO2_FILE_PATH = path.join(process.cwd(), 'data', 'memo2.json');

// 데이터 디렉토리 생성 및 파일 초기화
async function ensureMemo2File() {
  try {
    const dataDir = path.dirname(MEMO2_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    // 파일이 없으면 빈 배열로 초기화
    try {
      await fs.access(MEMO2_FILE_PATH);
    } catch {
      await fs.writeFile(MEMO2_FILE_PATH, JSON.stringify([]));
    }
  } catch {
    // 에러 무시
  }
}

// 메모2 콘텐츠 로드
async function loadMemo2Contents(): Promise<ContentItem[]> {
  try {
    // Vercel 환경에서는 메모리 저장소만 사용
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return memo2MemoryStorage;
    }
    
    // 로컬 환경에서는 파일에서 로드
    await ensureMemo2File();
    const data = await fs.readFile(MEMO2_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// 메모2 전용 메모리 저장소
let memo2MemoryStorage: ContentItem[] = [];

// 메모2 콘텐츠 저장
async function saveMemo2Contents(contents: ContentItem[]) {
  try {
    // Vercel 환경에서는 메모리 저장소 사용
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      memo2MemoryStorage = [...contents];
      return;
    }
    
    // 로컬 환경에서는 파일 저장
    await ensureMemo2File();
    const jsonData = JSON.stringify(contents, null, 2);
    await fs.writeFile(MEMO2_FILE_PATH, jsonData);
  } catch (error) {
    throw new Error(`메모2 저장 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

// GET: 메모2 콘텐츠 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const published = searchParams.get('published');
    
    let contents: ContentItem[] = [];
    try {
      contents = await loadMemo2Contents();
    } catch {
      contents = [];
    }

    // 게시된 콘텐츠만 필터링
    if (published === 'true') {
      contents = contents.filter(content => content.isPublished);
    }

    // 최신순 정렬
    contents.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

    return NextResponse.json(contents);
  } catch {
    return NextResponse.json({ error: '메모2 조회에 실패했습니다.' }, { status: 500 });
  }
}

// POST: 새 메모2 생성
export async function POST(request: NextRequest) {
  try {
    const body: ContentFormData & { imageUrl?: string } = await request.json();
    
    // 필수 필드 검증
    if (!body.title?.trim()) {
      return NextResponse.json({ error: '제목은 필수입니다.' }, { status: 400 });
    }
    if (!body.author?.trim()) {
      return NextResponse.json({ error: '작성자는 필수입니다.' }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: '내용은 필수입니다.' }, { status: 400 });
    }
    
    const contents = await loadMemo2Contents();
    
    // 메모2 전용 ID 범위: 30000-39999
    const baseId = 30000;
    const maxId = 39999;
    
    // 기존 ID와 겹치지 않는 고유 ID 생성
    let id: string;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      const randomOffset = Math.floor(Math.random() * (maxId - baseId + 1));
      id = (baseId + randomOffset).toString();
      attempts++;
      
      // 이미 존재하는 ID인지 확인
      const existingContent = contents.find(c => c.id === id);
      if (!existingContent) break;
      
      if (attempts >= maxAttempts) {
        // 최대 시도 횟수 초과 시 타임스탬프 기반 ID 생성
        id = (baseId + (Date.now() % (maxId - baseId + 1))).toString();
        break;
      }
    } while (true);
    
    const newContent: ContentItem = {
      id,
      title: body.title.trim(),
      content: body.content.trim(),
      author: body.author.trim(),
      publishDate: new Date().toISOString(),
      type: 'memo2', // 항상 memo2 타입으로 설정
      tags: body.tags ? body.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      isPublished: body.isPublished || false,
      imageUrl: body.imageUrl,
    };

    contents.push(newContent);
    await saveMemo2Contents(contents);

    return NextResponse.json(newContent, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: '메모2 생성에 실패했습니다.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PUT: 메모2 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body: { id: string } & Partial<ContentFormData> & { imageUrl?: string } = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: '메모2 ID는 필수입니다.' }, { status: 400 });
    }

    // 필수 필드 검증
    if (updateData.title !== undefined && !updateData.title.trim()) {
      return NextResponse.json({ error: '제목은 필수입니다.' }, { status: 400 });
    }
    if (updateData.author !== undefined && !updateData.author.trim()) {
      return NextResponse.json({ error: '작성자는 필수입니다.' }, { status: 400 });
    }
    if (updateData.content !== undefined && !updateData.content.trim()) {
      return NextResponse.json({ error: '내용은 필수입니다.' }, { status: 400 });
    }

    const contents = await loadMemo2Contents();
    const contentIndex = contents.findIndex(content => content.id === id);
    
    if (contentIndex === -1) {
      return NextResponse.json({ error: '메모2를 찾을 수 없습니다.' }, { status: 404 });
    }

    contents[contentIndex] = {
      ...contents[contentIndex],
      ...updateData,
      title: updateData.title?.trim() ?? contents[contentIndex].title,
      author: updateData.author?.trim() ?? contents[contentIndex].author,
      content: updateData.content?.trim() ?? contents[contentIndex].content,
      tags: updateData.tags ? updateData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : contents[contentIndex].tags,
    };

    await saveMemo2Contents(contents);

    return NextResponse.json(contents[contentIndex]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: '메모2 업데이트에 실패했습니다.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// DELETE: 메모2 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '메모2 ID가 필요합니다.' }, { status: 400 });
    }

    const contents = await loadMemo2Contents();
    const contentIndex = contents.findIndex(content => content.id === id);
    
    if (contentIndex === -1) {
      return NextResponse.json({ error: '메모2를 찾을 수 없습니다.' }, { status: 404 });
    }

    contents.splice(contentIndex, 1);
    await saveMemo2Contents(contents);

    return NextResponse.json({ message: '메모2가 삭제되었습니다.' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: '메모2 삭제에 실패했습니다.',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
