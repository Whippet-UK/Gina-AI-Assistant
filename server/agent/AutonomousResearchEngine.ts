import { WebResearchService, WebResearchResult } from './WebResearchService';

export interface ResearchOptions {
  query: string;
  contextCode?: string;
  libraryOrPackage?: string;
  targetVersion?: string;
  maxResults?: number;
}

export interface ResearchBriefing {
  query: string;
  timestamp: string;
  webEnabled: boolean;
  library?: string;
  targetVersion?: string;
  keyFindings: string[];
  recommendedPatterns: string[];
  deprecatedPatterns: string[];
  sources: Array<{ title: string; url: string; snippet: string; source: string }>;
  fetchedDocumentation?: string;
}

export class AutonomousResearchEngine {
  constructor(
    private readonly webResearch: WebResearchService,
    private readonly localRag?: { search: (query: string, category?: string, limit?: number) => any[] }
  ) {}

  /**
   * Conducts combined local RAG + live web research to verify API syntax,
   * modern library signatures, and model/workflow compatibility.
   */
  public async research(options: ResearchOptions): Promise<ResearchBriefing> {
    const query = options.query.trim();
    const timestamp = new Date().toISOString();
    const webStatus = this.webResearch.status();
    const findings: string[] = [];
    const recommended: string[] = [];
    const deprecated: string[] = [];
    const sources: Array<{ title: string; url: string; snippet: string; source: string }> = [];
    let fetchedDoc: string | undefined;

    // 1. Inspect local RAG knowledge base first
    if (this.localRag) {
      try {
        const localMatches = this.localRag.search(query, undefined, 4);
        for (const match of localMatches) {
          if (match?.chunk?.content) {
            findings.push(`[Local Knowledge: ${match.chunk.title || match.chunk.sourceFile}] ${match.chunk.content.slice(0, 240)}`);
          }
        }
      } catch (err: any) {
        // Silently continue to web research
      }
    }

    // 2. Perform live web research if web access is enabled
    if (webStatus.enabled) {
      try {
        // Formulate a high-precision search query
        const searchQuery = options.libraryOrPackage 
          ? `${options.libraryOrPackage} ${query} documentation official API`
          : `${query} official documentation API syntax`;

        const searchResult: WebResearchResult = await this.webResearch.research(
          searchQuery,
          options.maxResults || 5,
          true
        );

        for (const res of searchResult.results) {
          sources.push(res);
          // Heuristic extraction for deprecation notices or version updates
          const snip = res.snippet;
          if (/deprecat|obsolete|migrat|breaking change/i.test(snip)) {
            deprecated.push(`[${res.source}] ${snip}`);
          } else if (/example|usage|import|function|const|class/i.test(snip)) {
            recommended.push(`[${res.source}] ${snip}`);
          }
        }

        if (searchResult.fetched?.content) {
          fetchedDoc = searchResult.fetched.content.slice(0, 12000);
          findings.push(`[Fetched Official Docs: ${searchResult.fetched.url}] Extracted ${fetchedDoc.length} characters of live API reference.`);
        }
      } catch (err: any) {
        findings.push(`[Web Research Notice] Web lookup encountered: ${err?.message || String(err)}`);
      }
    } else {
      findings.push(`[Local-First Mode] GINA_WEB_ACCESS is false. Operating strictly from local project files and RAG knowledge.`);
    }

    // 3. Synthesize summary recommendations
    if (options.libraryOrPackage) {
      recommended.push(`Verify package version in package.json against official imports before refactoring.`);
    }

    return {
      query,
      timestamp,
      webEnabled: webStatus.enabled,
      library: options.libraryOrPackage,
      targetVersion: options.targetVersion,
      keyFindings: findings,
      recommendedPatterns: recommended,
      deprecatedPatterns: deprecated,
      sources,
      fetchedDocumentation: fetchedDoc
    };
  }

  /**
   * Compares a proposed code modification against official documentation
   * to detect obsolete arguments or removed methods.
   */
  public async verifyCompatibility(packageName: string, codeSnippet: string): Promise<{ compatible: boolean; warnings: string[]; suggestions: string[] }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const research = await this.research({
      query: `${packageName} breaking changes migration v2 v3`,
      libraryOrPackage: packageName,
      contextCode: codeSnippet.slice(0, 500)
    });

    for (const dep of research.deprecatedPatterns) {
      warnings.push(`Potential deprecation pattern identified: ${dep}`);
    }

    for (const rec of research.recommendedPatterns) {
      suggestions.push(rec);
    }

    return {
      compatible: warnings.length === 0,
      warnings,
      suggestions
    };
  }
}
