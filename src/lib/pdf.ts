export interface PDFPage {
  pageNumber: number;
  text: string;
}

export interface PDFExtractResult {
  pages: PDFPage[];
  fullText: string;
  numPages: number;
}

export async function extractTextFromPDF(file: File): Promise<PDFExtractResult> {
  // Dynamically import pdfjs-dist to avoid "DOMMatrix is not defined" error during Next.js SSR
  const pdfjsLib = await import('pdfjs-dist');

  // Configure worker
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
  
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const pages: PDFPage[] = [];
  let fullText = "";

  // Iterate over all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Combine text items
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    
    pages.push({
      pageNumber: i,
      text: pageText
    });
      
    fullText += pageText + "\n\n";
  }

  return {
    pages,
    fullText,
    numPages: pdf.numPages
  };
}
