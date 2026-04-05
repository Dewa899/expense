import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Clean Coder: Future implementation for OCR logic
    // This will receive an image and return text data
    // const formData = await req.formData();
    // const file = formData.get("file");
    
    return NextResponse.json({ 
      success: true, 
      message: "OCR API Placeholder - Ready for future implementation",
      data: {
        amount: 0,
        name: "Pending Implementation",
        date: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
