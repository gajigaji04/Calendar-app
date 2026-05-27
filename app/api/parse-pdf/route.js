/**
 * POST /api/parse-pdf
 * FormData: { file: File (PDF) }
 * Response: { text: string }
 *
 * pdf-parse는 Node.js 런타임이 필요합니다 (Edge 불가).
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file     = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'file 필드가 없습니다.' }, { status: 400 });
    }

    // 파일 크기 제한 (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF 파일은 10 MB 이하만 가능합니다.' }, { status: 413 });
    }

    // File → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // pdf-parse: requires Node runtime
    const { default: pdfParse } = await import('pdf-parse');
    const data = await pdfParse(buffer);

    return NextResponse.json({ text: data.text, pages: data.numpages });
  } catch (err) {
    console.error('[parse-pdf]', err);
    return NextResponse.json(
      { error: `PDF 파싱 실패: ${err.message}` },
      { status: 500 }
    );
  }
}
