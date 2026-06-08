/**
 * Readability scoring — Flesch Reading Ease with SEO-friendly adjustments.
 *
 * Base formula:
 *   206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
 *
 * Adjustments:
 *   - HTML stripped before counting (tags never counted as words)
 *   - Sentence length bonus: avg < 15 words → +20, < 20 → +10
 *   - Paragraph/structure bonus: 4+ paragraphs → +10, 2+ → +5
 *   - Short content soft penalty: < 300 words → -10 (not a hard cap)
 */

export function stripHtmlForReadability(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function countParagraphs(htmlOrText: string): number {
  const pTags = htmlOrText.match(/<p[^>]*>/gi);
  if (pTags && pTags.length > 0) return pTags.length;

  const listItems = htmlOrText.match(/<li[^>]*>/gi);
  if (listItems && listItems.length >= 2) return listItems.length;

  const blocks = htmlOrText.split(/\n\s*\n/).filter((b) => b.trim().length > 20);
  if (blocks.length > 1) return blocks.length;

  return 1;
}

export function getReadabilityRating(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Average";
  if (score >= 50) return "Difficult";
  return "Poor";
}

/**
 * @param plainText - Already stripped text, or raw text without HTML
 * @param html - Optional original HTML for paragraph/structure detection
 */
export function calcReadability(plainText: string, html?: string): number {
  const text = html ? stripHtmlForReadability(html) : plainText.replace(/\s+/g, " ").trim();
  if (!text) return 0;

  const words = text.match(/\b\w+\b/g) || [];
  const wordCount = words.length;
  if (wordCount === 0) return 0;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);
  const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0);

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllables / wordCount;

  // Flesch Reading Ease
  let score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  // Sentence length bonus — don't punish 16–20 word sentences
  if (avgWordsPerSentence < 15) {
    score += 20;
  } else if (avgWordsPerSentence < 20) {
    score += 10;
  }

  // Paragraph / structure bonus
  const sourceHtml = html ?? plainText;
  const paragraphCount = countParagraphs(sourceHtml);
  if (paragraphCount >= 4) {
    score += 10;
  } else if (paragraphCount >= 2) {
    score += 5;
  }

  // Soft word-count penalty only (not a hard cap)
  if (wordCount < 300) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
