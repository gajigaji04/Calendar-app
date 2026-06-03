/**
 * POST /api/parse-pdf
 * FormData: { file: File (PDF) }
 * Response: { text: string, pages: number }
 *
 * pdf-parse v2 는 Node.js 런타임이 필요합니다 (Edge 불가).
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  try {
    const formData = await request.formData();
    const file     = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'file 필드가 없습니다.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF 파일은 10 MB 이하만 가능합니다.' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // pdf-parse v2: PDFParse 클래스 기반 API
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    let result;
    try {
      result = await parser.getText({ pageJoiner: '\n' });
    } finally {
      await parser.destroy();
    }

    return NextResponse.json({ text: result.text, pages: result.total });
  } catch (err) {
    console.error('[parse-pdf]', err);
    return NextResponse.json(
      { error: `PDF 파싱 실패: ${err.message}` },
      { status: 500 }
    );
  }
}
