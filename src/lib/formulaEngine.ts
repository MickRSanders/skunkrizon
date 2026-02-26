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

interface NumberToken { type: "number"; value: number }
interface IdentToken { type: "ident"; value: string }
interface OpToken { type: "op"; value: string }
interface ParenToken { type: "paren"; value: "(" | ")" }
interface CommaToken { type: "comma" }
interface StringToken { type: "string"; value: string }
interface FuncToken { type: "func"; value: "LOOKUP" | "IF" | "MIN" | "MAX" | "ROUND" }

type Token = NumberToken | IdentToken | OpToken | ParenToken | CommaToken | StringToken | FuncToken;

// ─── Tokenizer ────────────────────────────────────────────────

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = formula.trim();

  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }

    if (/[0-9.]/.test(s[i])) {
      let num = "";
      while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i]; i++; }
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }

    if (s[i] === '"' || s[i] === "'") {
      const quote = s[i]; i++;
      let str = "";
      while (i < s.length && s[i] !== quote) { str += s[i]; i++; }
      i++;
      tokens.push({ type: "string", value: str });
      continue;
    }

    if (i + 1 < s.length) {
      const two = s[i] + s[i + 1];
      if (two === ">=" || two === "<=" || two === "==" || two === "!=") {
        tokens.push({ type: "op", value: two });
        i += 2; continue;
      }
    }

    if (s[i] === ">" || s[i] === "<") {
      tokens.push({ type: "op", value: s[i] });
      i++; continue;
    }

    if ("+-*/".includes(s[i])) {
      tokens.push({ type: "op", value: s[i] });
      i++; continue;
    }

    if (s[i] === "(" || s[i] === ")") {
      tokens.push({ type: "paren", value: s[i] as "(" | ")" });
      i++; continue;
    }

    if (s[i] === ",") { tokens.push({ type: "comma" }); i++; continue; }

    if (/[a-zA-Z_]/.test(s[i])) {
      let ident = "";
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) { ident += s[i]; i++; }
      const upper = ident.toUpperCase();
      if (upper === "LOOKUP" || upper === "IF" || upper === "MIN" || upper === "MAX" || upper === "ROUND") {
        tokens.push({ type: "func", value: upper as FuncToken["value"] });
      } else {
        tokens.push({ type: "ident", value: ident });
      }
      continue;
    }

    i++;
  }

  return tokens;
}

// ─── AST nodes ────────────────────────────────────────────────

type ASTNode =
  | { kind: "number"; value: number }
  | { kind: "variable"; name: string }
  | { kind: "binop"; op: string; left: ASTNode; right: ASTNode }
  | { kind: "unary"; op: "+" | "-"; operand: ASTNode }
  | { kind: "lookup"; tableName: string; keyColumn: string; valueColumn: string; keyExpr: ASTNode }
  | { kind: "funcCall"; name: "IF" | "MIN" | "MAX" | "ROUND"; args: ASTNode[] };

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

  private peekIs(type: string, value?: string): boolean {
    const t = this.tokens[this.pos];
    if (!t || t.type !== type) return false;
    if (value !== undefined && "value" in t && t.value !== value) return false;
    return true;
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: string, value?: string): Token {
    const t = this.consume();
    if (!t || t.type !== type || (value !== undefined && "value" in t && t.value !== value)) {
      throw new Error(`Expected ${type}${value ? ` '${value}'` : ""} but got ${t ? `${t.type}` : "end of input"}`);
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

  private parseExpr(): ASTNode {
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    let left = this.parseAdditive();
    const p = this.peek();
    if (p && p.type === "op" && [">", ">=", "<", "<=", "==", "!="].includes(p.value)) {
      const op = (this.consume() as OpToken).value;
      const right = this.parseAdditive();
      left = { kind: "binop", op, left, right };
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseTerm();
    while (this.peekIs("op", "+") || this.peekIs("op", "-")) {
      const op = (this.consume() as OpToken).value;
      const right = this.parseTerm();
      left = { kind: "binop", op, left, right };
    }
    return left;
  }

  private parseTerm(): ASTNode {
    let left = this.parseFactor();
    while (this.peekIs("op", "*") || this.peekIs("op", "/")) {
      const op = (this.consume() as OpToken).value;
      const right = this.parseFactor();
      left = { kind: "binop", op, left, right };
    }
    return left;
  }

  private parseFactor(): ASTNode {
    const t = this.peek();
    if (!t) throw new Error("Unexpected end of formula");

    // Unary minus/plus
    if (t.type === "op" && (t.value === "-" || t.value === "+")) {
      const op = (this.consume() as OpToken).value as "+" | "-";
      return { kind: "unary", op, operand: this.parseFactor() };
    }

    // Number
    if (t.type === "number") {
      this.consume();
      return { kind: "number", value: t.value };
    }

    // Functions
    if (t.type === "func") {
      const funcToken = this.consume() as FuncToken;
      this.expect("paren", "(");

      if (funcToken.value === "LOOKUP") {
        const tableName = (this.expect("string") as StringToken).value;
        this.expect("comma");
        const keyColumn = (this.expect("string") as StringToken).value;
        this.expect("comma");
        const valueColumn = (this.expect("string") as StringToken).value;
        this.expect("comma");
        const keyExpr = this.parseExpr();
        this.expect("paren", ")");
        return { kind: "lookup", tableName, keyColumn, valueColumn, keyExpr };
      }

      // Generic function: parse comma-separated args
      const args: ASTNode[] = [];
      if (!this.peekIs("paren", ")")) {
        args.push(this.parseExpr());
        while (this.peekIs("comma")) {
          this.consume();
          args.push(this.parseExpr());
        }
      }
      this.expect("paren", ")");
      return { kind: "funcCall", name: funcToken.value, args };
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

    throw new Error(`Unexpected token: ${t.type}`);
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
      if (node.op === "+") return l + r;
      if (node.op === "-") return l - r;
      if (node.op === "*") return l * r;
      if (node.op === "/") {
        if (r === 0) throw new Error("Division by zero");
        return l / r;
      }
      if (node.op === ">") return l > r ? 1 : 0;
      if (node.op === ">=") return l >= r ? 1 : 0;
      if (node.op === "<") return l < r ? 1 : 0;
      if (node.op === "<=") return l <= r ? 1 : 0;
      if (node.op === "==") return l === r ? 1 : 0;
      if (node.op === "!=") return l !== r ? 1 : 0;
      throw new Error(`Unknown operator: ${node.op}`);
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

    case "funcCall": {
      const evalArgs = await Promise.all(node.args.map((a) => evalNode(a, ctx, lookupResults)));
      if (node.name === "IF") {
        if (evalArgs.length < 2 || evalArgs.length > 3)
          throw new Error("IF() requires 2-3 arguments: IF(condition, then_value, [else_value])");
        return evalArgs[0] !== 0 ? evalArgs[1] : (evalArgs[2] ?? 0);
      }
      if (node.name === "MIN") {
        if (evalArgs.length === 0) throw new Error("MIN() requires at least 1 argument");
        return Math.min(...evalArgs);
      }
      if (node.name === "MAX") {
        if (evalArgs.length === 0) throw new Error("MAX() requires at least 1 argument");
        return Math.max(...evalArgs);
      }
      if (node.name === "ROUND") {
        if (evalArgs.length < 1 || evalArgs.length > 2)
          throw new Error("ROUND() requires 1-2 arguments: ROUND(value, [decimals])");
        const decimals = evalArgs[1] ?? 0;
        const factor = Math.pow(10, decimals);
        return Math.round(evalArgs[0] * factor) / factor;
      }
      throw new Error(`Unknown function: ${node.name}`);
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
    const { data: tables, error: tableErr } = await supabase
      .from("lookup_tables")
      .select("id")
      .eq("name", tableName)
      .limit(1);

    if (tableErr) return { tableName, keyColumn, valueColumn, keyValue, result: null, error: tableErr.message };
    if (!tables || tables.length === 0) return { tableName, keyColumn, valueColumn, keyValue, result: null, error: `Table "${tableName}" not found` };

    const tableId = tables[0].id;

    const { data: rows, error: rowErr } = await supabase
      .from("lookup_table_rows")
      .select("row_data")
      .eq("lookup_table_id", tableId)
      .order("row_order");

    if (rowErr) return { tableName, keyColumn, valueColumn, keyValue, result: null, error: rowErr.message };
    if (!rows || rows.length === 0) return { tableName, keyColumn, valueColumn, keyValue, result: null, error: "Table has no rows" };

    const keyStr = String(keyValue);
    const matchingRow = rows.find((r) => {
      const data = r.row_data as Record<string, string>;
      const cellValue = data[keyColumn];
      if (cellValue === undefined) return false;
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
 * Supports: +, -, *, /, comparisons (>, >=, <, <=, ==, !=),
 * parentheses, field references, LOOKUP(), IF(), MIN(), MAX(), ROUND().
 *
 * @example
 * await evaluateFormula('IF(grade > 3, hbs * 1.1, hbs)', { hbs: 50000, grade: 2 })
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
