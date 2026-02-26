import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ─── Types ────────────────────────────────────────────────────

export interface EvalContext {
  /** field_name → numeric value */
  variables: Record<string, number>;
}

export interface EvalResult {
  value: number;
  lookupCalls: LookupCallResult[];
  error?: string;
}

export interface LookupCallResult {
  tableName: string;
  keyColumn: string;
  valueColumn: string;
  keyValue: string | number;
  result: number | null;
  error?: string;
}

// ─── Token types ──────────────────────────────────────────────

type Token =
  | { type: "number"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma" }
  | { type: "string"; value: string }
  | { type: "lookup" };

// ─── Tokenizer ────────────────────────────────────────────────

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = formula.trim();

  while (i < s.length) {
    // Whitespace
    if (/\s/.test(s[i])) { i++; continue; }

    // Numbers (including decimals)
    if (/[0-9.]/.test(s[i])) {
      let num = "";
      while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i]; i++; }
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }

    // Quoted strings
    if (s[i] === '"' || s[i] === "'") {
      const quote = s[i]; i++;
      let str = "";
      while (i < s.length && s[i] !== quote) { str += s[i]; i++; }
      i++; // closing quote
      tokens.push({ type: "string", value: str });
      continue;
    }

    // Operators
    if ("+-*/".includes(s[i])) {
      tokens.push({ type: "op", value: s[i] as Token & { type: "op" } extends { value: infer V } ? V : never });
      i++; continue;
    }

    // Parens
    if (s[i] === "(" || s[i] === ")") {
      tokens.push({ type: "paren", value: s[i] as "(" | ")" });
      i++; continue;
    }

    // Comma
    if (s[i] === ",") { tokens.push({ type: "comma" }); i++; continue; }

    // Identifiers / LOOKUP keyword
    if (/[a-zA-Z_]/.test(s[i])) {
      let ident = "";
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) { ident += s[i]; i++; }
      if (ident.toUpperCase() === "LOOKUP") {
        tokens.push({ type: "lookup" });
      } else {
        tokens.push({ type: "ident", value: ident });
      }
      continue;
    }

    // Unknown character — skip
    i++;
  }

  return tokens;
}

// ─── AST nodes ────────────────────────────────────────────────

type ASTNode =
  | { kind: "number"; value: number }
  | { kind: "variable"; name: string }
  | { kind: "binop"; op: "+" | "-" | "*" | "/"; left: ASTNode; right: ASTNode }
  | { kind: "unary"; op: "+" | "-"; operand: ASTNode }
  | { kind: "lookup"; tableName: string; keyColumn: string; valueColumn: string; keyExpr: ASTNode };

// ─── Parser (recursive descent) ───────────────────────────────

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: string, value?: string): Token {
    const t = this.consume();
    if (!t || t.type !== type || (value !== undefined && (t as any).value !== value)) {
      throw new Error(`Expected ${type}${value ? ` '${value}'` : ""} but got ${t ? `${t.type} '${(t as any).value}'` : "end of input"}`);
    }
    return t;
  }

  parse(): ASTNode {
    const node = this.parseExpr();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token at position ${this.pos}`);
    }
    return node;
  }

  // expr = term (('+' | '-') term)*
  private parseExpr(): ASTNode {
    let left = this.parseTerm();
    while (this.peek()?.type === "op" && (this.peek() as any).value === "+" || this.peek()?.type === "op" && (this.peek() as any).value === "-") {
      const op = (this.consume() as { type: "op"; value: "+" | "-" }).value;
      const right = this.parseTerm();
      left = { kind: "binop", op, left, right };
    }
    return left;
  }

  // term = factor (('*' | '/') factor)*
  private parseTerm(): ASTNode {
    let left = this.parseFactor();
    while (this.peek()?.type === "op" && ((this.peek() as any).value === "*" || (this.peek() as any).value === "/")) {
      const op = (this.consume() as { type: "op"; value: "*" | "/" }).value;
      const right = this.parseFactor();
      left = { kind: "binop", op, left, right };
    }
    return left;
  }

  // factor = number | variable | LOOKUP(...) | '(' expr ')' | unary
  private parseFactor(): ASTNode {
    const t = this.peek();
    if (!t) throw new Error("Unexpected end of formula");

    // Unary minus/plus
    if (t.type === "op" && (t.value === "-" || t.value === "+")) {
      const op = (this.consume() as { type: "op"; value: "+" | "-" }).value;
      return { kind: "unary", op, operand: this.parseFactor() };
    }

    // Number
    if (t.type === "number") {
      this.consume();
      return { kind: "number", value: t.value };
    }

    // LOOKUP(tableName, keyCol, valueCol, keyExpr)
    if (t.type === "lookup") {
      this.consume();
      this.expect("paren", "(");
      const tableName = (this.expect("string") as { type: "string"; value: string }).value;
      this.expect("comma");
      const keyColumn = (this.expect("string") as { type: "string"; value: string }).value;
      this.expect("comma");
      const valueColumn = (this.expect("string") as { type: "string"; value: string }).value;
      this.expect("comma");
      const keyExpr = this.parseExpr();
      this.expect("paren", ")");
      return { kind: "lookup", tableName, keyColumn, valueColumn, keyExpr };
    }

    // Variable
    if (t.type === "ident") {
      this.consume();
      return { kind: "variable", name: t.value };
    }

    // Parenthesized expression
    if (t.type === "paren" && t.value === "(") {
      this.consume();
      const expr = this.parseExpr();
      this.expect("paren", ")");
      return expr;
    }

    throw new Error(`Unexpected token: ${t.type} '${(t as any).value}'`);
  }
}

// ─── Evaluator ────────────────────────────────────────────────

async function evalNode(node: ASTNode, ctx: EvalContext, lookupResults: LookupCallResult[]): Promise<number> {
  switch (node.kind) {
    case "number":
      return node.value;

    case "variable": {
      const val = ctx.variables[node.name];
      if (val === undefined) throw new Error(`Unknown variable: ${node.name}`);
      return val;
    }

    case "binop": {
      const [l, r] = await Promise.all([
        evalNode(node.left, ctx, lookupResults),
        evalNode(node.right, ctx, lookupResults),
      ]);
      switch (node.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/":
          if (r === 0) throw new Error("Division by zero");
          return l / r;
      }
    }

    case "unary": {
      const operand = await evalNode(node.operand, ctx, lookupResults);
      return node.op === "-" ? -operand : operand;
    }

    case "lookup": {
      const keyValue = await evalNode(node.keyExpr, ctx, lookupResults);
      const result = await executeLookup(node.tableName, node.keyColumn, node.valueColumn, keyValue);
      lookupResults.push(result);
      if (result.error) throw new Error(`LOOKUP error: ${result.error}`);
      if (result.result === null) throw new Error(`LOOKUP: no match found in "${node.tableName}" where ${node.keyColumn} = ${keyValue}`);
      return result.result;
    }
  }
}

async function executeLookup(
  tableName: string,
  keyColumn: string,
  valueColumn: string,
  keyValue: string | number
): Promise<LookupCallResult> {
  try {
    // Find the lookup table by name
    const { data: tables, error: tableErr } = await supabase
      .from("lookup_tables")
      .select("id")
      .eq("name", tableName)
      .limit(1);

    if (tableErr) return { tableName, keyColumn, valueColumn, keyValue, result: null, error: tableErr.message };
    if (!tables || tables.length === 0) return { tableName, keyColumn, valueColumn, keyValue, result: null, error: `Table "${tableName}" not found` };

    const tableId = tables[0].id;

    // Fetch all rows for this table
    const { data: rows, error: rowErr } = await supabase
      .from("lookup_table_rows")
      .select("row_data")
      .eq("lookup_table_id", tableId)
      .order("row_order");

    if (rowErr) return { tableName, keyColumn, valueColumn, keyValue, result: null, error: rowErr.message };
    if (!rows || rows.length === 0) return { tableName, keyColumn, valueColumn, keyValue, result: null, error: "Table has no rows" };

    // Find matching row
    const keyStr = String(keyValue);
    const matchingRow = rows.find((r) => {
      const data = r.row_data as Record<string, string>;
      const cellValue = data[keyColumn];
      if (cellValue === undefined) return false;
      // Try both exact match and numeric comparison
      if (String(cellValue) === keyStr) return true;
      if (!isNaN(Number(cellValue)) && !isNaN(Number(keyStr)) && Number(cellValue) === Number(keyStr)) return true;
      return false;
    });

    if (!matchingRow) {
      return { tableName, keyColumn, valueColumn, keyValue, result: null, error: `No row where ${keyColumn} = "${keyStr}"` };
    }

    const data = matchingRow.row_data as Record<string, string>;
    const rawValue = data[valueColumn];
    if (rawValue === undefined) {
      return { tableName, keyColumn, valueColumn, keyValue, result: null, error: `Column "${valueColumn}" not found in row` };
    }

    const numValue = parseFloat(String(rawValue).replace(/[,$%]/g, ""));
    if (isNaN(numValue)) {
      return { tableName, keyColumn, valueColumn, keyValue, result: null, error: `Value "${rawValue}" is not a number` };
    }

    return { tableName, keyColumn, valueColumn, keyValue, result: numValue };
  } catch (err: any) {
    return { tableName, keyColumn, valueColumn, keyValue, result: null, error: err.message || "Unknown error" };
  }
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Evaluate a formula string with the given variable context.
 * Supports: +, -, *, /, parentheses, field references, LOOKUP() calls.
 *
 * @example
 * await evaluateFormula('hbs * LOOKUP("Rates", "tier", "rate", grade) + 100', { hbs: 50000, grade: 2 })
 */
export async function evaluateFormula(formula: string, variables: Record<string, number>): Promise<EvalResult> {
  if (!formula.trim()) {
    return { value: 0, lookupCalls: [], error: "Empty formula" };
  }

  try {
    const tokens = tokenize(formula);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const lookupCalls: LookupCallResult[] = [];
    const value = await evalNode(ast, { variables }, lookupCalls);
    return { value, lookupCalls };
  } catch (err: any) {
    return { value: 0, lookupCalls: [], error: err.message || "Evaluation failed" };
  }
}
