import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { TextItem, TextContent } from 'pdfjs-dist/types/src/display/api';

interface TOCEntry {
  title: string;
  pageNumber: number;
  level: number;
  id: string;
}

interface DocumentStructure {
  title: string;
  author?: string;
  chapters: Chapter[];
  tableOfContents: TOCEntry[];
  totalPages: number;
  estimatedTokens: number;
}

interface Chapter {
  id: string;
  title: string;
  sections: Section[];
  startPage: number;
  endPage: number;
  estimatedTokens: number;
}

interface Section {
  id: string;
  title: string;
  content: string;
  subsections: Section[];
  startPage: number;
  endPage: number;
  concepts: string[];
}

interface PageContent {
  pageNumber: number;
  text: string;
  textItems: ProcessedTextItem[];
}

interface ProcessedTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
}

export class PDFStructureExtractor {
  private pdfDoc: PDFDocument | null = null;
  private pdfJsDoc: any = null;

  async extractStructure(pdfBuffer: Buffer): Promise<DocumentStructure> {
    // Load PDF with both libraries for different capabilities
    this.pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Load with PDF.js for text extraction
    const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
    this.pdfJsDoc = await loadingTask.promise;

    // Extract basic metadata
    const metadata = await this.extractMetadata();
    
    // Extract table of contents from bookmarks
    const toc = await this.extractTableOfContents();
    
    // Extract all pages with formatting information
    const pages = await this.extractAllPages();
    
    // Identify document structure based on formatting patterns
    const structure = await this.identifyStructure(pages, toc);
    
    return {
      title: metadata.title || 'Untitled Document',
      author: metadata.author,
      chapters: structure.chapters,
      tableOfContents: toc,
      totalPages: this.pdfJsDoc.numPages,
      estimatedTokens: structure.estimatedTokens
    };
  }

  private async extractMetadata(): Promise<{ title?: string; author?: string }> {
    const metadata = await this.pdfJsDoc.getMetadata();
    return {
      title: metadata.info?.Title || metadata.metadata?.get('dc:title'),
      author: metadata.info?.Author || metadata.metadata?.get('dc:creator')
    };
  }

  private async extractTableOfContents(): Promise<TOCEntry[]> {
    const outline = await this.pdfJsDoc.getOutline();
    if (!outline) return [];

    const toc: TOCEntry[] = [];
    
    const processOutlineItem = async (item: any, level: number = 0) => {
      if (item.title) {
        const destination = item.dest ? 
          await this.pdfJsDoc.getDestination(item.dest) : null;
        
        const pageIndex = destination ? 
          await this.pdfJsDoc.getPageIndex(destination[0]) : 0;
        
        toc.push({
          title: item.title,
          pageNumber: pageIndex + 1,
          level,
          id: `toc-${toc.length}`
        });
      }
      
      if (item.items) {
        for (const subItem of item.items) {
          await processOutlineItem(subItem, level + 1);
        }
      }
    };
    
    for (const item of outline) {
      await processOutlineItem(item);
    }
    
    return toc;
  }

  private async extractAllPages(): Promise<PageContent[]> {
    const pages: PageContent[] = [];
    
    for (let i = 1; i <= this.pdfJsDoc.numPages; i++) {
      const page = await this.pdfJsDoc.getPage(i);
      const textContent = await page.getTextContent();
      
      const processedItems: ProcessedTextItem[] = textContent.items
        .filter((item: any): item is TextItem => 'str' in item)
        .map((item: TextItem) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
          fontSize: Math.sqrt(
            item.transform[0] * item.transform[0] + 
            item.transform[1] * item.transform[1]
          ),
          fontName: item.fontName || 'unknown'
        }));
      
      pages.push({
        pageNumber: i,
        text: processedItems.map(item => item.text).join(' '),
        textItems: processedItems
      });
    }
    
    return pages;
  }

  private async identifyStructure(
    pages: PageContent[], 
    toc: TOCEntry[]
  ): Promise<{ chapters: Chapter[]; estimatedTokens: number }> {
    const chapters: Chapter[] = [];
    let totalTokens = 0;
    
    // Identify heading patterns
    const headingPatterns = this.identifyHeadingPatterns(pages);
    
    // Group pages into chapters based on TOC or heading patterns
    const chapterBoundaries = this.findChapterBoundaries(pages, toc, headingPatterns);
    
    for (let i = 0; i < chapterBoundaries.length; i++) {
      const start = chapterBoundaries[i];
      const end = i < chapterBoundaries.length - 1 ? 
        chapterBoundaries[i + 1] - 1 : pages.length - 1;
      
      const chapterPages = pages.slice(start, end + 1);
      const chapter = await this.processChapter(
        chapterPages, 
        start + 1,
        `chapter-${i}`
      );
      
      chapters.push(chapter);
      totalTokens += chapter.estimatedTokens;
    }
    
    return { chapters, estimatedTokens: totalTokens };
  }

  private identifyHeadingPatterns(pages: PageContent[]): {
    chapterPattern: { fontSize: number; fontName: string } | null;
    sectionPattern: { fontSize: number; fontName: string } | null;
  } {
    // Analyze font sizes and names to identify heading patterns
    const fontStats = new Map<string, number>();
    
    for (const page of pages) {
      for (const item of page.textItems) {
        const key = `${item.fontSize.toFixed(1)}-${item.fontName}`;
        fontStats.set(key, (fontStats.get(key) || 0) + 1);
      }
    }
    
    // Sort by font size descending
    const sortedFonts = Array.from(fontStats.entries())
      .sort((a, b) => {
        const sizeA = parseFloat(a[0].split('-')[0]);
        const sizeB = parseFloat(b[0].split('-')[0]);
        return sizeB - sizeA;
      });
    
    // Assume largest fonts are chapter headings, second largest are sections
    const chapterPattern = sortedFonts[0] ? {
      fontSize: parseFloat(sortedFonts[0][0].split('-')[0]),
      fontName: sortedFonts[0][0].split('-')[1]
    } : null;
    
    const sectionPattern = sortedFonts[1] ? {
      fontSize: parseFloat(sortedFonts[1][0].split('-')[0]),
      fontName: sortedFonts[1][0].split('-')[1]
    } : null;
    
    return { chapterPattern, sectionPattern };
  }

  private findChapterBoundaries(
    pages: PageContent[], 
    toc: TOCEntry[],
    headingPatterns: any
  ): number[] {
    const boundaries: number[] = [0]; // Start with first page
    
    // Use TOC if available
    if (toc.length > 0) {
      const chapterEntries = toc.filter(entry => entry.level === 0);
      boundaries.push(...chapterEntries.map(entry => entry.pageNumber - 1));
    } else if (headingPatterns.chapterPattern) {
      // Fall back to pattern matching
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const hasChapterHeading = page.textItems.some(item => 
          Math.abs(item.fontSize - headingPatterns.chapterPattern.fontSize) < 1 &&
          item.fontName === headingPatterns.chapterPattern.fontName &&
          item.text.match(/^(Chapter|CHAPTER|Section|SECTION|Part|PART)\s+\d+/i)
        );
        
        if (hasChapterHeading && i > 0) {
          boundaries.push(i);
        }
      }
    }
    
    // Remove duplicates and sort
    return [...new Set(boundaries)].sort((a, b) => a - b);
  }

  private async processChapter(
    pages: PageContent[],
    startPageNumber: number,
    chapterId: string
  ): Promise<Chapter> {
    const sections: Section[] = [];
    let chapterTitle = 'Chapter';
    let chapterTokens = 0;
    
    // Extract chapter title from first page
    if (pages.length > 0) {
      const titleCandidate = pages[0].textItems
        .filter(item => item.fontSize > 14) // Assuming headings are larger
        .map(item => item.text)
        .join(' ')
        .trim();
      
      if (titleCandidate) {
        chapterTitle = titleCandidate.substring(0, 100); // Limit title length
      }
    }
    
    // Process sections within chapter
    const sectionTexts = this.splitIntoSections(pages);
    
    for (let i = 0; i < sectionTexts.length; i++) {
      const section: Section = {
        id: `${chapterId}-section-${i}`,
        title: sectionTexts[i].title || `Section ${i + 1}`,
        content: sectionTexts[i].content,
        subsections: [],
        startPage: startPageNumber + sectionTexts[i].startPage,
        endPage: startPageNumber + sectionTexts[i].endPage,
        concepts: await this.extractConcepts(sectionTexts[i].content)
      };
      
      sections.push(section);
      chapterTokens += this.estimateTokenCount(section.content);
    }
    
    return {
      id: chapterId,
      title: chapterTitle,
      sections,
      startPage: startPageNumber,
      endPage: startPageNumber + pages.length - 1,
      estimatedTokens: chapterTokens
    };
  }

  private splitIntoSections(pages: PageContent[]): {
    title: string;
    content: string;
    startPage: number;
    endPage: number;
  }[] {
    // Simple implementation - can be enhanced with better section detection
    const sections = [];
    let currentSection = {
      title: '',
      content: '',
      startPage: 0,
      endPage: 0
    };
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      // Look for section headings (simplified logic)
      const headingItem = page.textItems.find(item => 
        item.fontSize > 12 && 
        item.text.match(/^\d+\.\d+|^[A-Z][A-Z\s]+$/)
      );
      
      if (headingItem && currentSection.content.length > 0) {
        // Start new section
        sections.push({ ...currentSection });
        currentSection = {
          title: headingItem.text,
          content: page.text,
          startPage: i,
          endPage: i
        };
      } else {
        // Continue current section
        currentSection.content += '\n' + page.text;
        currentSection.endPage = i;
      }
    }
    
    // Don't forget the last section
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
    
    return sections.length > 0 ? sections : [{
      title: 'Content',
      content: pages.map(p => p.text).join('\n'),
      startPage: 0,
      endPage: pages.length - 1
    }];
  }

  private async extractConcepts(text: string): Promise<string[]> {
    // Simple concept extraction - can be enhanced with NLP
    const concepts: string[] = [];
    
    // Look for definition patterns
    const definitionPatterns = [
      /(\w+)\s+is\s+defined\s+as/gi,
      /(\w+)\s+refers\s+to/gi,
      /The\s+term\s+(\w+)/gi,
      /(\w+):\s+[A-Z]/g // Term followed by colon and capital letter
    ];
    
    for (const pattern of definitionPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 3) {
          concepts.push(match[1]);
        }
      }
    }
    
    // Remove duplicates and return top 10
    return [...new Set(concepts)].slice(0, 10);
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}