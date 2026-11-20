import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { AiExtractJobDto } from '../dto/ai-extract.dto';
import { CacheService } from '../../../cache/cache-invalidation.interceptor';

export interface ExtractedJobData {
  advtNo?: string;
  postTitle?: string;
  department?: string;
  payLevel?: string;
  vacancies?: number;
  startDate?: string;
  deadlineDate?: string;
  examDate?: string;
  applicationFees?: {
    general?: number;
    obc?: number;
    scSt?: number;
    female?: number;
    paymentMode?: string;
  };
  categoryBreakdown?: {
    UR?: number;
    OBC?: number;
    SC?: number;
    ST?: number;
    EWS?: number;
  };
  qualificationSummary?: string;
  ageLimitSummary?: string;
  postBreakdown?: Array<{
    postName: string;
    vacancies: number;
    qualification: string;
  }>;
  selectionStages?: string[];
  applyOnlineUrl?: string;
  officialNoticePdfUrl?: string;
  officialWebsiteUrl?: string;
  admitCardUrl?: string;
  answerKeyUrl?: string;
  syllabusUrl?: string;
  description?: string;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  status?: string;
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert Indian Public Sector Recruitment and Gazette Notification Analyst for the GovJob & BharatRojgar portal.
Your task is to analyze the provided government job notification (PDF document or text) and accurately extract structured recruitment parameters.

You MUST respond ONLY with a valid JSON object without markdown code fencing or conversational text.

The JSON schema must adhere to:
{
  "advtNo": string (e.g. "Advt. No. 05/2026-CSP" or "CEN 01/2026"),
  "postTitle": string (e.g. "Civil Services (Preliminary) Examination 2026" or "Assistant Section Officer"),
  "department": string (e.g. "Union Public Service Commission (UPSC)", "Railway Recruitment Board (RRB)", "Staff Selection Commission (SSC)", etc.),
  "payLevel": string (7th CPC Level e.g. "Level-7 (₹44,900 – ₹1,42,400) · Assistant Section Officer / Inspector" or "Level-10 (₹56,100 – ₹1,77,500)"),
  "vacancies": number (Total number of vacancies across all posts as an integer),
  "categoryBreakdown": {
    "UR": number (Vacancies for General / GEN / Unreserved / UR / OC category if given in notice, else 0),
    "OBC": number (Vacancies for OBC / OBC-NCL / Other Backward Classes / SEBC / BC category if given in notice, else 0),
    "SC": number (Vacancies for SC / Scheduled Caste category if given in notice, else 0),
    "ST": number (Vacancies for ST / Scheduled Tribe category if given in notice, else 0),
    "EWS": number (Vacancies for EWS / Economically Weaker Section category if given in notice, else 0)
  },
  "startDate": string in "YYYY-MM-DD" format (Application open date),
  "deadlineDate": string in "YYYY-MM-DD" format (Last date to apply),
  "examDate": string in "YYYY-MM-DD" format (Exam date if mentioned, otherwise empty string ""),
  "status": "Pending / Scrutiny",
  "applicationFees": {
    "general": number (Fee in INR, 0 if free or unmentioned),
    "obc": number (Fee in INR, 0 if free or unmentioned),
    "scSt": number (Fee in INR, 0 if free or unmentioned),
    "female": number (Fee in INR, 0 if free or unmentioned),
    "paymentMode": string (Payment mode if stated, else empty string "")
  },
  "qualificationSummary": string (Concise qualification summary as stated in document, else empty string ""),
  "ageLimitSummary": string (Age limits and relaxations as stated in document, else empty string ""),
  "postBreakdown": [
    {
      "postName": string,
      "vacancies": number,
      "qualification": string
    }
  ],
  "selectionStages": [
    "Stage 1: ...",
    "Stage 2: ..."
  ],
  "applyOnlineUrl": string (Direct online application URL if explicitly mentioned, else ""),
  "officialNoticePdfUrl": string (Direct link to official notice if mentioned, else ""),
  "officialWebsiteUrl": string (Official Commission / Board website if mentioned, else ""),
  "admitCardUrl": string,
  "answerKeyUrl": string,
  "syllabusUrl": string,
  "description": string (Official overview if stated in notice, else empty string ""),
  "faqs": [
    {
      "question": string,
      "answer": string
    }
  ]
}

CRITICAL STRICT ANTI-HALLUCINATION INSTRUCTION:
- You must ONLY extract information that is explicitly stated or clearly verifiable in the provided text / PDF.
- If ANY field (such as advtNo, postTitle, department, payLevel, vacancies, categoryBreakdown, startDate, deadlineDate, examDate, applicationFees, qualificationSummary, ageLimitSummary, postBreakdown, selectionStages, URLs, description, faqs) is NOT explicitly mentioned in the document, you MUST leave it EMPTY / VACANT.
- For missing text fields or URLs, return an empty string "".
- For missing numbers, return 0.
- For missing lists (postBreakdown, selectionStages, faqs), return an empty array [].
- categoryBreakdown rule:
  * Look carefully across all vacancy tables, reservation matrix charts, or text paragraphs in the notice:
    - UR: Match columns/text labeled "UR", "General", "GEN", "Unreserved", "OC", or "Open Category".
    - OBC: Match columns/text labeled "OBC", "OBC-NCL", "Other Backward Classes", "SEBC", "BC", "BC-A", or "BC-B".
    - SC: Match columns/text labeled "SC", "Scheduled Caste", or "Scheduled Castes".
    - ST: Match columns/text labeled "ST", "Scheduled Tribe", or "Scheduled Tribes".
    - EWS: Match columns/text labeled "EWS", "Economically Weaker Section", or "GEN-EWS".
  * If the notice contains a multi-post table with category columns for each post, sum up each category column across all rows to provide the total vacancies for UR, OBC, SC, ST, and EWS.
  * If category numbers are explicitly listed in the document or table, extract and sum them accurately.
  * If the document ONLY mentions total overall vacancies without any category-wise numbers (e.g. "Reservation will be as per Govt rules" without a seat matrix table), return all 0s ({ "UR": 0, "OBC": 0, "SC": 0, "ST": 0, "EWS": 0 }).
  * NEVER use mathematical percentage formulas (such as 40.5%, 27%, 15%, etc.) to compute or fabricate quota numbers!
- NEVER GUESS, INVENT, FABRICATE, OR AUTO-FILL STATUTORY DEFAULTS for missing fields. Leave missing fields completely vacant so human officers can fill them manually.
- Ensure all extracted dates are strictly in "YYYY-MM-DD" format.
- Ensure vacancies and fees are pure numeric integers (not strings).`;

@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async extractJobData(dto: AiExtractJobDto): Promise<ExtractedJobData> {
    if (!dto.text && !dto.pdfBase64) {
      throw new BadRequestException(
        'Either raw text or a base64 encoded document (PDF/DOC) must be provided for AI analysis.',
      );
    }

    // ─── 0. AI RESPONSE CACHING (Content-Hash Deduplication) ────────────────
    const contentToHash = dto.pdfBase64
      ? dto.pdfBase64.replace(/^data:.*?;base64,/, '').trim()
      : (dto.text || '').trim();
    const contentHash = crypto
      .createHash('sha256')
      .update(contentToHash)
      .digest('hex');
    const aiCacheKey = `ai:extract:${contentHash}`;

    // If cache hit and not explicitly forced to refresh, return cached extraction in 1ms ($0 cost)
    if (!dto.forceRefresh) {
      const cachedResult = await this.cacheService.get<ExtractedJobData>(aiCacheKey);
      if (cachedResult && cachedResult.postTitle) {
        this.logger.log(
          `[AiExtraction] Cache HIT for content hash ${contentHash.substring(0, 8)}... - Saved LLM API call & token cost!`,
        );
        return cachedResult;
      }
    }

    // 1. Resolve notification text content
    let notificationText = dto.text?.trim() || '';
    if (dto.pdfBase64 && !notificationText) {
      const cleanBase64 = dto.pdfBase64.replace(/^data:.*?;base64,/, '');
      const pdfBuffer = Buffer.from(cleanBase64, 'base64');
      notificationText = this.extractTextFromPdfBuffer(pdfBuffer);

      if (!notificationText || notificationText.length < 30) {
        // Fallback: note document characteristics
        notificationText = `[Uploaded Recruitment Notification Document: ${Math.round(pdfBuffer.length / 1024)} KB]`;
      }
    }

    // 2. Read AWS Bedrock Mantle configurations
    const bedrockApiKey =
      dto.apiKey?.trim() ||
      this.configService.get<string>('BEDROCK_API_KEY') ||
      process.env.BEDROCK_API_KEY;
    const bedrockKeyName =
      this.configService.get<string>('BEDROCK_API_KEY_NAME') ||
      process.env.BEDROCK_API_KEY_NAME ||
      '';
    const bedrockBaseUrl =
      this.configService.get<string>('BEDROCK_BASE_URL') ||
      process.env.BEDROCK_BASE_URL ||
      'https://bedrock-mantle.ap-southeast-2.api.aws/v1';
    const primaryModel =
      this.configService.get<string>('BEDROCK_MODEL_NAME') ||
      process.env.BEDROCK_MODEL_NAME ||
      'openai.gpt-oss-20b';
    const fallbackModel =
      this.configService.get<string>('BEDROCK_FALLBACK_MODEL_NAME') ||
      process.env.BEDROCK_FALLBACK_MODEL_NAME ||
      'mistral.ministral-3-8b-instruct';

    let extracted: ExtractedJobData | null = null;

    // 3. If Bedrock API Key is present, call Bedrock Mantle OpenAI-compatible endpoint
    if (bedrockApiKey && bedrockApiKey.trim().length > 0) {
      try {
        this.logger.log(`Calling AWS Bedrock Mantle model: ${primaryModel} at ${bedrockBaseUrl}`);
        extracted = await this.callBedrockMantleWithModel(
          bedrockBaseUrl,
          primaryModel,
          bedrockApiKey,
          bedrockKeyName,
          notificationText,
        );
      } catch (err: any) {
        this.logger.warn(
          `Primary Bedrock model (${primaryModel}) failed: ${err.message}. Retrying with fallback model (${fallbackModel})...`,
        );
        try {
          extracted = await this.callBedrockMantleWithModel(
            bedrockBaseUrl,
            fallbackModel,
            bedrockApiKey,
            bedrockKeyName,
            notificationText,
          );
        } catch (fallbackErr: any) {
          this.logger.error(`Both Bedrock models failed: ${fallbackErr.message}`);
          // Fall through to Gemini if available
        }
      }
    }

    // 4. Optional Gemini Fallback if configured
    if (!extracted) {
      const geminiApiKey =
        this.configService.get<string>('GEMINI_API_KEY') ||
        process.env.GEMINI_API_KEY;

      if (geminiApiKey && geminiApiKey.trim().length > 0) {
        this.logger.log('Falling back to Gemini LLM engine...');
        extracted = await this.callGeminiFallback(geminiApiKey, dto, notificationText);
      }
    }

    if (!extracted) {
      throw new InternalServerErrorException(
        'No AI LLM provider could successfully process the request. Please verify BEDROCK_API_KEY and model configuration in the backend environment.',
      );
    }

    // 5. Store valid extracted response in Redis / In-Memory cache for 7 days (604,800 seconds)
    try {
      await this.cacheService.set(aiCacheKey, extracted, 7 * 24 * 3600);
      this.logger.log(`[AiExtraction] Stored AI response in cache for 7 days (hash: ${contentHash.substring(0, 8)}...)`);
    } catch (cacheErr: any) {
      this.logger.warn(`[AiExtraction] Failed to cache AI response: ${cacheErr.message}`);
    }

    return extracted;
  }

  // ─── AWS BEDROCK MANTLE OPENAI-COMPATIBLE CALL ───────────────────────────

  private async callBedrockMantleWithModel(
    baseUrl: string,
    modelName: string,
    apiKey: string,
    keyName: string,
    notificationText: string,
  ): Promise<ExtractedJobData> {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanBaseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.replace(/\s+/g, '')}`,
      'Accept': 'application/json',
    };

    if (keyName) {
      headers['X-Amz-Bedrock-Api-Key-Name'] = keyName;
      headers['X-API-Key-Name'] = keyName;
    }

    const payload = {
      model: modelName,
      messages: [
        {
          role: 'system',
          content: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `GOVERNMENT RECRUITMENT NOTIFICATION DOCUMENT CONTENT:\n\n${notificationText}\n\nExtract all recruitment parameters adhering strictly to the JSON schema. Return pure JSON without conversational text or markdown code fences.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorJson: any;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // raw text
      }
      const message =
        errorJson?.error?.message ||
        errorJson?.message ||
        `Bedrock Mantle HTTP ${res.status}: ${res.statusText} - ${errorText.slice(0, 250)}`;
      throw new Error(message);
    }

    const responseJson = await res.json();
    const content =
      responseJson?.choices?.[0]?.message?.content ||
      responseJson?.content?.[0]?.text;

    if (!content) {
      throw new Error('Bedrock Mantle returned an empty response.');
    }

    try {
      const parsed = this.parseModelJson(content);
      return this.sanitizeExtractedData(parsed, notificationText);
    } catch (parseError: any) {
      this.logger.error(`Failed to parse JSON from Bedrock model output: ${content.slice(0, 300)}`);
      throw new Error(`Invalid JSON returned by Bedrock LLM: ${parseError.message}`);
    }
  }

  private parseModelJson(content: string): any {
    let str = (content || '').trim();
    str = str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // 1. Direct parse attempt
    try {
      return JSON.parse(str);
    } catch {}

    // 2. Fix duplicate outer braces (e.g. `{\n{\n...}\n}` or `{\n{...}`)
    let cleaned = str.replace(/^\{\s*\{/, '{').replace(/^\{\s*["']?\{/, '{');
    cleaned = cleaned.replace(/\}\s*\}$/, '}');
    try {
      return JSON.parse(cleaned);
    } catch {}

    // 3. Locate the first JSON key pattern `"key":` and extract from the opening brace before it
    const keyMatch = str.match(/"[\w.-]+"\s*:/);
    if (keyMatch && keyMatch.index !== undefined) {
      const textBeforeKey = str.slice(0, keyMatch.index);
      const lastOpenBraceBeforeKey = textBeforeKey.lastIndexOf('{');
      if (lastOpenBraceBeforeKey !== -1) {
        const fromBrace = str.slice(lastOpenBraceBeforeKey);
        let lastCloseBrace = fromBrace.lastIndexOf('}');
        while (lastCloseBrace !== -1 && lastCloseBrace > 0) {
          const candidate = fromBrace.slice(0, lastCloseBrace + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            // Fix potential trailing commas (e.g. `, }` -> ` }`)
            const noTrailingComma = candidate.replace(/,\s*([}\]])/g, '$1');
            try {
              return JSON.parse(noTrailingComma);
            } catch {}
          }
          lastCloseBrace = fromBrace.lastIndexOf('}', lastCloseBrace - 1);
        }
      }
    }

    // 4. Character scanner for balanced { ... }
    const firstBrace = str.indexOf('{');
    if (firstBrace !== -1) {
      let inString = false;
      let escape = false;
      let depth = 0;
      let startIndex = -1;

      for (let i = firstBrace; i < str.length; i++) {
        const ch = str[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (ch === '{') {
            if (depth === 0) startIndex = i;
            depth++;
          } else if (ch === '}') {
            depth--;
            if (depth === 0 && startIndex !== -1) {
              const candidate = str.slice(startIndex, i + 1);
              try {
                return JSON.parse(candidate);
              } catch {
                if (/^\{\s*\{/.test(candidate)) {
                  try {
                    return JSON.parse(candidate.replace(/^\{\s*\{/, '{'));
                  } catch {}
                }
              }
            }
          }
        }
      }
    }

    throw new Error(`Could not parse JSON from model output: ${str.slice(0, 200)}`);
  }

  // ─── GEMINI FALLBACK IMPLEMENTATION ─────────────────────────────────────

  private async callGeminiFallback(
    apiKey: string,
    dto: AiExtractJobDto,
    text: string,
  ): Promise<ExtractedJobData> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const parts: any[] = [];
    if (dto.pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: dto.mimeType || 'application/pdf',
          data: dto.pdfBase64.replace(/^data:.*?;base64,/, ''),
        },
      });
      parts.push({
        text: 'Extract all recruitment parameters adhering strictly to the JSON schema.',
      });
    } else {
      parts.push({
        text: `GOVERNMENT RECRUITMENT NOTIFICATION DOCUMENT CONTENT:\n\n${text}\n\nExtract all recruitment parameters adhering strictly to the JSON schema.`,
      });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: EXTRACTION_SYSTEM_PROMPT }],
      },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API HTTP ${res.status}: ${errorText.slice(0, 200)}`);
    }

    const responseJson = await res.json();
    const candidateText = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error('Gemini API returned an empty response.');

    const cleanJsonText = candidateText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    return this.sanitizeExtractedData(JSON.parse(cleanJsonText), text);
  }

  // ─── PDF TEXT EXTRACTION UTILITY (PURE NODE.JS) ─────────────────────────

  private extractTextFromPdfBuffer(pdfBuffer: Buffer): string {
    try {
      const raw = pdfBuffer.toString('binary');
      const textChunks: string[] = [];

      // Look for stream ... endstream blocks and decompress Flate streams
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let match: RegExpExecArray | null;

      while ((match = streamRegex.exec(raw)) !== null) {
        const streamContent = match[1];
        let decoded = '';

        try {
          const streamBuffer = Buffer.from(streamContent, 'binary');
          const inflated = zlib.inflateSync(streamBuffer);
          decoded = inflated.toString('utf-8');
        } catch {
          decoded = streamContent;
        }

        // Tj text operator
        const tjRegex = /\(([^)]+)\)\s*Tj/g;
        let tjMatch: RegExpExecArray | null;
        while ((tjMatch = tjRegex.exec(decoded)) !== null) {
          textChunks.push(tjMatch[1]);
        }

        // TJ array text operator
        const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
        let tjArrMatch: RegExpExecArray | null;
        while ((tjArrMatch = tjArrayRegex.exec(decoded)) !== null) {
          const inner = tjArrMatch[1];
          const innerTj = inner.match(/\(([^)]+)\)/g);
          if (innerTj) {
            textChunks.push(innerTj.map((s) => s.slice(1, -1)).join(' '));
          }
        }
      }

      const extracted = textChunks.join(' ').replace(/\s+/g, ' ').trim();
      if (extracted.length > 50) {
        return extracted;
      }
    } catch {
      // ignore
    }

    // Fallback: extract visible ASCII sequences
    const asciiMatches = pdfBuffer.toString('utf-8').match(/[A-Za-z0-9\s.,:\-/()]{4,}/g);
    return (asciiMatches || []).join(' ').replace(/\s+/g, ' ').trim();
  }

  // ─── DATA SANITIZATION & DEFAULTS ──────────────────────────────────────

  private sanitizeExtractedData(data: any, rawText?: string): ExtractedJobData {
    const rawCb = data.categoryBreakdown || {};
    const parseCat = (...keys: string[]) => {
      for (const k of keys) {
        if (rawCb[k] !== undefined && rawCb[k] !== null && rawCb[k] !== '') {
          const val = typeof rawCb[k] === 'number' ? rawCb[k] : parseInt(rawCb[k], 10);
          if (!isNaN(val) && val >= 0) return val;
        }
      }
      return 0;
    };

    let ur = parseCat('UR', 'ur', 'General', 'general', 'GEN', 'gen', 'Unreserved', 'unreserved', 'OC', 'oc');
    let obc = parseCat('OBC', 'obc', 'OBC-NCL', 'SEBC', 'sebc', 'BC', 'bc', 'Other Backward Classes');
    let sc = parseCat('SC', 'sc', 'Scheduled Caste', 'scheduled_caste', 'Scheduled Castes');
    let st = parseCat('ST', 'st', 'Scheduled Tribe', 'scheduled_tribe', 'Scheduled Tribes');
    let ews = parseCat('EWS', 'ews', 'GEN-EWS', 'Economically Weaker Section', 'Economically Weaker Sections');

    // Deterministic fallback: If model didn't extract categories or returned 0s, but the notification text explicitly contains category headers with numbers
    if (ur === 0 && obc === 0 && sc === 0 && st === 0 && ews === 0 && rawText) {
      const findCount = (pattern: RegExp) => {
        const match = rawText.match(pattern);
        return match ? parseInt(match[1], 10) : 0;
      };
      ur = findCount(/(?:General|GEN|\bUR\b|Unreserved|Open\s*Category|OC)\s*[:\-–\n\r\t ]+(\d+)/i);
      obc = findCount(/(?:OBC-NCL|OBC|SEBC|\bBC\b|BC-A|BC-B)\s*[:\-–\n\r\t ]+(\d+)/i);
      sc = findCount(/(?:\bSC\b|Scheduled\s*Caste[s]?)\s*[:\-–\n\r\t ]+(\d+)/i);
      st = findCount(/(?:\bST\b|Scheduled\s*Tribe[s]?)\s*[:\-–\n\r\t ]+(\d+)/i);
      ews = findCount(/(?:GEN-EWS|EWS|Economically\s*Weaker)\s*[:\-–\n\r\t ]+(\d+)/i);
    }

    let vacancies =
      typeof data.vacancies === 'number' ? data.vacancies : parseInt(data.vacancies, 10) || 0;
    if (vacancies === 0 && (ur + obc + sc + st + ews) > 0) {
      vacancies = ur + obc + sc + st + ews;
    }

    return {
      advtNo: typeof data.advtNo === 'string' ? data.advtNo.trim() : '',
      postTitle: typeof data.postTitle === 'string' ? data.postTitle.trim() : '',
      department: typeof data.department === 'string' ? data.department.trim() : '',
      payLevel: typeof data.payLevel === 'string' ? data.payLevel.trim() : '',
      vacancies,
      categoryBreakdown: {
        UR: ur,
        OBC: obc,
        SC: sc,
        ST: st,
        EWS: ews,
      },
      startDate: typeof data.startDate === 'string' ? data.startDate.trim() : '',
      deadlineDate: typeof data.deadlineDate === 'string' ? data.deadlineDate.trim() : '',
      examDate: typeof data.examDate === 'string' ? data.examDate.trim() : '',
      status: 'Pending / Scrutiny',
      applicationFees: {
        general:
          typeof data.applicationFees?.general === 'number'
            ? data.applicationFees.general
            : parseInt(data.applicationFees?.general, 10) || 0,
        obc:
          typeof data.applicationFees?.obc === 'number'
            ? data.applicationFees.obc
            : parseInt(data.applicationFees?.obc, 10) || 0,
        scSt:
          typeof data.applicationFees?.scSt === 'number'
            ? data.applicationFees.scSt
            : parseInt(data.applicationFees?.scSt, 10) || 0,
        female:
          typeof data.applicationFees?.female === 'number'
            ? data.applicationFees.female
            : parseInt(data.applicationFees?.female, 10) || 0,
        paymentMode:
          typeof data.applicationFees?.paymentMode === 'string'
            ? data.applicationFees.paymentMode.trim()
            : '',
      },
      qualificationSummary:
        typeof data.qualificationSummary === 'string' ? data.qualificationSummary.trim() : '',
      ageLimitSummary:
        typeof data.ageLimitSummary === 'string' ? data.ageLimitSummary.trim() : '',
      postBreakdown: Array.isArray(data.postBreakdown)
        ? data.postBreakdown.map((p: any) => ({
            postName: String(p.postName || '').trim(),
            vacancies: parseInt(p.vacancies, 10) || 0,
            qualification: String(p.qualification || '').trim(),
          }))
        : [],
      selectionStages: Array.isArray(data.selectionStages)
        ? data.selectionStages.map((s: any) => String(s).trim())
        : [],
      applyOnlineUrl: typeof data.applyOnlineUrl === 'string' ? data.applyOnlineUrl.trim() : '',
      officialNoticePdfUrl: typeof data.officialNoticePdfUrl === 'string' ? data.officialNoticePdfUrl.trim() : '',
      officialWebsiteUrl: typeof data.officialWebsiteUrl === 'string' ? data.officialWebsiteUrl.trim() : '',
      admitCardUrl: typeof data.admitCardUrl === 'string' ? data.admitCardUrl.trim() : '',
      answerKeyUrl: typeof data.answerKeyUrl === 'string' ? data.answerKeyUrl.trim() : '',
      syllabusUrl: typeof data.syllabusUrl === 'string' ? data.syllabusUrl.trim() : '',
      description: typeof data.description === 'string' ? data.description.trim() : '',
      faqs: Array.isArray(data.faqs)
        ? data.faqs.map((f: any) => ({
            question: String(f.question || '').trim(),
            answer: String(f.answer || '').trim(),
          }))
        : [],
    };
  }
}
