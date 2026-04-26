import { Component, input, computed, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Token type mapping to CSS class names.
 * Order matters — earlier rules match first (greedy, no overlap).
 * Modeled after Prism.js tokenizer strategy.
 */
interface TokenRule {
  type: string;
  pattern: RegExp;
}

@Component({
  selector: 'app-python-code-block',
  standalone: true,
  imports: [],
  templateUrl: './python-code-block.component.html',
  styleUrl: './python-code-block.component.css'
})
export class PythonCodeBlockComponent {
  code = input.required<string>();
  title = input<string>('');

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  copied = signal(false);

  /**
   * Ordered token rules — matched first-come-first-served.
   * Once a substring matches, it's consumed and won't be matched again.
   * Based on Prism.js Python grammar + extended for method calls and params.
   */
  private readonly TOKEN_RULES: TokenRule[] = [
    // 1. Comments — # to end of line
    { type: 'py-comment', pattern: /#.*$/gm },

    // 2. Triple-quoted strings (incl. prefixes for f-strings, raw, bytes)
    { type: 'py-string', pattern: /(?:[fbrquFBRQU]{1,2})?(?:"""[\s\S]*?"""|'''[\s\S]*?''')/g },

    // 3. Regular strings (incl. prefixes)
    { type: 'py-string', pattern: /(?:[fbrquFBRQU]{1,2})?(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g },

    // 4. Decorators — @decorator
    { type: 'py-decorator', pattern: /^[ \t]*@[ \t]*[\w.]+/gm },

    // 5. Function definitions — name after def  
    { type: 'py-function', pattern: /(?<=\bdef\s+)[a-zA-Z_]\w*/g },

    // 6. Class definitions — name after class
    { type: 'py-class', pattern: /(?<=\bclass\s+)[a-zA-Z_]\w*/g },

    // 7. Keywords
    {
      type: 'py-keyword',
      pattern: /\b(?:and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g
    },

    // 8. Booleans / None
    { type: 'py-builtin', pattern: /\b(?:True|False|None|NotImplemented|Ellipsis)\b/g },

    // 9. Built-in functions and types
    {
      type: 'py-builtin',
      pattern: /\b(?:abs|all|any|bin|bool|bytearray|bytes|callable|chr|classmethod|compile|complex|delattr|dict|dir|divmod|enumerate|eval|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|range|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|vars|zip)\b/g
    },

    // 10. Self and standard standard parameters
    { type: 'py-param', pattern: /\b(?:self|cls|args|kwargs)\b/g },

    // 11. Well-known ML / Backend library names  
    {
      type: 'py-class',
      pattern: /\b(?:np|pd|torch|tf|keras|cv2|plt|sns|sklearn|scipy|os|re|sys|json|math|datetime|time|librosa|whisper|transformers|pipeline|Model|Tokenizer|fastapi|pydantic|requests|urllib|logging|pathlib|typing|uuid)\b/g
    },

    // 12. Exception types (robust wildcard match for all Errors/Warnings)
    { type: 'py-class', pattern: /\b(?:[A-Z]\w*Error|Exception|[A-Z]\w*Warning|KeyboardInterrupt|StopIteration|SystemExit)\b/g },

    // 13. Dunder methods (mapped to builtin for clear distinction)
    { type: 'py-builtin', pattern: /\b__\w+__\b/g },

    // 14. Method / function calls — word(
    { type: 'py-method', pattern: /\b[a-zA-Z_]\w*(?=\s*\()/g },

    // 15. Dotted attribute access — .attribute (not followed by parenthesis)
    { type: 'py-param', pattern: /(?<=\.)[a-zA-Z_]\w*(?!\s*\()/g },

    // 16. UpperCamelCase for Classes and Types (to color custom classes)
    { type: 'py-class', pattern: /\b[A-Z][a-zA-Z0-9_]*\b/g },

    // 17. Numbers — int, float, hex, octal, binary, scientific, complex
    { type: 'py-number', pattern: /\b0(?:b[01_]+|o[0-7_]+|x[0-9a-fA-F_]+)\b|\b\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d[\d_]*)?j?\b|\B\.[\d_]+(?:[eE][+-]?\d[\d_]*)?j?\b/g },

    // 18. Operators (exhaustively including @, <<, >>, etc)
    { type: 'py-operator', pattern: /(?:<<=?|>>=?|\*\*=?|\/\/=?|[-+*\/%&|^~<>=!@]=|:=|->|[-+*\/%&|^~<>=@])/g },

    // 19. Punctuation — brackets, colons, commas, dots
    { type: 'py-punctuation', pattern: /[{}[\];(),.:]/g },

    // 20. Generic Variables / Unmatched words
    { type: 'py-variable', pattern: /\b[a-zA-Z_]\w*\b/g }
  ];

  highlightedCode = computed(() => {
    const raw = this.code();
    if (!raw) return '';
    return this.tokenize(raw);
  });

  copyCode(): void {
    if (!this.isBrowser) return;

    const textToCopy = this.code();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => this.onCopySuccess())
        .catch(() => this.copyFallback(textToCopy));
    } else {
      this.copyFallback(textToCopy);
    }
  }

  private onCopySuccess(): void {
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  private copyFallback(text: string): void {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Ensure it's not visible
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        this.onCopySuccess();
      }
    } catch (err) {
      console.error('Copy fallback failed:', err);
    }
  }

  /**
   * Greedy tokenizer: processes the original source string to avoid HTML entity conflicts.
   * Only escapes text to HTML when assembling the final string.
   */
  private tokenize(source: string): string {
    const claimed = new Array(source.length).fill(false);
    const tokens: { start: number; end: number; type: string }[] = [];

    // Process matching on RAW source to support accurate <, >, & operator matching
    for (const rule of this.TOKEN_RULES) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(source)) !== null) {
        if (match[0].length === 0) {
          rule.pattern.lastIndex++;
          continue;
        }

        const start = match.index;
        const end = start + match[0].length;

        let overlap = false;
        for (let i = start; i < end; i++) {
          if (claimed[i]) {
            overlap = true;
            break;
          }
        }

        if (!overlap) {
          for (let i = start; i < end; i++) {
            claimed[i] = true;
          }
          tokens.push({ start, end, type: rule.type });
        }
      }
    }

    tokens.sort((a, b) => a.start - b.start);

    // Assembly Phase with HTML Escaping
    const escapeHtml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    let result = '';
    let cursor = 0;

    for (const token of tokens) {
      if (token.start > cursor) {
        result += escapeHtml(source.substring(cursor, token.start));
      }
      result += `<span class="${token.type}">${escapeHtml(source.substring(token.start, token.end))}</span>`;
      cursor = token.end;
    }

    if (cursor < source.length) {
      result += escapeHtml(source.substring(cursor));
    }

    return result;
  }
}
