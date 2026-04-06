const { getType } = require('./common');

function javaInjector(userCode, method_name, testCasesInputs, problemDetails, parameters) {
    const returnType = getType(problemDetails.return_type, 'java');

    // ── Parameter parsing ────────────────────────────────────────────────────────
    const paramParsing = parameters.map((p, idx) => {
        const javaType = getType(p.type, 'java');
        const parser = getParser(javaType);
        return `${javaType} ${p.name} = ${parser}(argsList.get(${idx}));`;
    }).join('\n                ');

    const callArgs = parameters.map(p => p.name).join(', ');
    const formattedTestInputs = testCasesInputs
        .map(t => '"' + t.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"')
        .join(', ');

    const timeoutMs = 5000; // 5 s — adjust per problem difficulty if needed

    return `
import java.util.*;
import java.util.concurrent.*;

// ── User solution ────────────────────────────────────────────────────────────
${userCode}

// ── Driver ───────────────────────────────────────────────────────────────────
public class Main {

    // ── Data-structure definitions ───────────────────────────────────────────

    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int v) { val = v; }
    }

    static class ListNode {
        int val;
        ListNode next;
        ListNode(int v) { val = v; }
    }

    // ── Entry point ──────────────────────────────────────────────────────────

    public static void main(String[] args) {
        String[] testInputs = new String[] { ${formattedTestInputs} };
        ExecutorService exec = Executors.newSingleThreadExecutor();
        System.out.print("[");
        Solution sol = new Solution();

        for (int i = 0; i < testInputs.length; i++) {
            final int idx = i;
            Future<String> future = exec.submit(() -> {
                try {
                    List<String> argsList = splitTopLevelElements(testInputs[idx]);
                    if (argsList.size() != ${parameters.length}) {
                        throw new RuntimeException(
                            "Expected ${parameters.length} argument(s), got " + argsList.size());
                    }
                    ${paramParsing}

                    ${returnType} res = sol.${method_name}(${callArgs});
                    return "{\\"output\\": " + formatJson(res) + "}";
                } catch (Exception e) {
                    String msg = e.getMessage() != null ? e.getMessage() : "RuntimeError";
                    return "{\\"error\\": \\"" + escapeJsonString(msg) + "\\"}";
                }
            });

            String result;
            try {
                result = future.get(${timeoutMs}, TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                future.cancel(true);
                result = "{\\"error\\": \\"Time Limit Exceeded\\"}";
            } catch (ExecutionException e) {
                String msg = e.getCause() != null ? e.getCause().getMessage() : "ExecutionError";
                result = "{\\"error\\": \\"" + escapeJsonString(msg != null ? msg : "ExecutionError") + "\\"}";
            } catch (Exception e) {
                result = "{\\"error\\": \\"InterruptedOrCancelled\\"}";
            }

            System.out.print(result);
            if (i < testInputs.length - 1) System.out.print(",");
        }

        System.out.println("]");
        exec.shutdownNow();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  PARSERS
    // ════════════════════════════════════════════════════════════════════════

    // ── Primitives ───────────────────────────────────────────────────────────

    static int     parseIntValue(String raw)    { return Integer.parseInt(raw.trim()); }
    static long    parseLongValue(String raw)   { return Long.parseLong(raw.trim()); }
    static double  parseDoubleValue(String raw) { return Double.parseDouble(raw.trim()); }
    static char    parseCharValue(String raw) {
        String v = raw.trim();
        // Accept "a" (quoted) or a (bare)
        if (v.length() >= 2 && v.startsWith("\\"") && v.endsWith("\\"")) return v.charAt(1);
        return v.charAt(0);
    }
    static boolean parseBoolValue(String raw) {
        String v = raw.trim().toLowerCase();
        return v.equals("true") || v.equals("1");
    }
    static String parseStringValue(String raw) {
        String v = raw.trim();
        if (v.length() >= 2 && v.startsWith("\\"") && v.endsWith("\\""))
            return unescapeJsonString(v.substring(1, v.length() - 1));
        return v;
    }

    // ── 1-D arrays ───────────────────────────────────────────────────────────

    static int[] parseIntArrayValue(String raw) {
        List<String> elems = splitTopLevelElements(raw);
        if (elems.isEmpty() || (elems.size() == 1 && elems.get(0).isEmpty())) return new int[0];
        int[] arr = new int[elems.size()];
        for (int i = 0; i < elems.size(); i++) arr[i] = parseIntValue(elems.get(i));
        return arr;
    }
    static long[] parseLongArrayValue(String raw) {
        List<String> elems = splitTopLevelElements(raw);
        if (elems.isEmpty() || (elems.size() == 1 && elems.get(0).isEmpty())) return new long[0];
        long[] arr = new long[elems.size()];
        for (int i = 0; i < elems.size(); i++) arr[i] = parseLongValue(elems.get(i));
        return arr;
    }
    static double[] parseDoubleArrayValue(String raw) {
        List<String> elems = splitTopLevelElements(raw);
        if (elems.isEmpty() || (elems.size() == 1 && elems.get(0).isEmpty())) return new double[0];
        double[] arr = new double[elems.size()];
        for (int i = 0; i < elems.size(); i++) arr[i] = parseDoubleValue(elems.get(i));
        return arr;
    }
    static char[] parseCharArrayValue(String raw) {
        List<String> elems = splitTopLevelElements(raw);
        if (elems.isEmpty() || (elems.size() == 1 && elems.get(0).isEmpty())) return new char[0];
        char[] arr = new char[elems.size()];
        for (int i = 0; i < elems.size(); i++) arr[i] = parseCharValue(elems.get(i));
        return arr;
    }
    static String[] parseStringArrayValue(String raw) {
        List<String> elems = splitTopLevelElements(raw);
        if (elems.isEmpty() || (elems.size() == 1 && elems.get(0).isEmpty())) return new String[0];
        String[] arr = new String[elems.size()];
        for (int i = 0; i < elems.size(); i++) arr[i] = parseStringValue(elems.get(i));
        return arr;
    }

    // ── 2-D arrays ───────────────────────────────────────────────────────────

    static int[][] parseIntMatrixValue(String raw) {
        List<String> rows = splitTopLevelElements(raw);
        int[][] mat = new int[rows.size()][];
        for (int i = 0; i < rows.size(); i++) mat[i] = parseIntArrayValue(rows.get(i));
        return mat;
    }
    static char[][] parseCharMatrixValue(String raw) {
        List<String> rows = splitTopLevelElements(raw);
        char[][] mat = new char[rows.size()][];
        for (int i = 0; i < rows.size(); i++) mat[i] = parseCharArrayValue(rows.get(i));
        return mat;
    }
    static String[][] parseStringMatrixValue(String raw) {
        List<String> rows = splitTopLevelElements(raw);
        String[][] mat = new String[rows.size()][];
        for (int i = 0; i < rows.size(); i++) mat[i] = parseStringArrayValue(rows.get(i));
        return mat;
    }

    // ── List types ───────────────────────────────────────────────────────────

    static List<Integer> parseListIntValue(String raw) {
        List<String> elems = splitTopLevelElements(raw);
        List<Integer> list = new ArrayList<>();
        for (String e : elems) if (!e.isEmpty()) list.add(parseIntValue(e));
        return list;
    }
    static List<Long> parseListLongValue(String raw) {
        List<String> elems = splitTopLevelElements(raw);
        List<Long> list = new ArrayList<>();
        for (String e : elems) if (!e.isEmpty()) list.add(parseLongValue(e));
        return list;
    }
    static List<Double> parseListDoubleValue(String raw) {
        List<String> elems = splitTopLevelElements(raw);
        List<Double> list = new ArrayList<>();
        for (String e : elems) if (!e.isEmpty()) list.add(parseDoubleValue(e));
        return list;
    }
    static List<String> parseListStringValue(String raw) {
        List<String> elems = splitTopLevelElements(raw);
        List<String> list = new ArrayList<>();
        for (String e : elems) list.add(parseStringValue(e));
        return list;
    }
    static List<List<Integer>> parseListListIntValue(String raw) {
        List<String> outer = splitTopLevelElements(raw);
        List<List<Integer>> list = new ArrayList<>();
        for (String row : outer) list.add(parseListIntValue(row));
        return list;
    }
    static List<List<String>> parseListListStringValue(String raw) {
        List<String> outer = splitTopLevelElements(raw);
        List<List<String>> list = new ArrayList<>();
        for (String row : outer) list.add(parseListStringValue(row));
        return list;
    }

    // ── TreeNode ─────────────────────────────────────────────────────────────
    //  Accepts LeetCode-style level-order: [1,2,3,null,null,4,5]
    //  "null" tokens leave that position empty.

    static TreeNode parseTreeNodeValue(String raw) {
        List<String> tokens = splitTopLevelElements(raw);
        if (tokens.isEmpty() || tokens.get(0).equalsIgnoreCase("null") || tokens.get(0).isEmpty())
            return null;

        TreeNode root = new TreeNode(parseIntValue(tokens.get(0)));
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        int i = 1;

        while (!queue.isEmpty() && i < tokens.size()) {
            TreeNode node = queue.poll();

            // left child
            if (i < tokens.size()) {
                String t = tokens.get(i++).trim();
                if (!t.equalsIgnoreCase("null") && !t.isEmpty()) {
                    node.left = new TreeNode(parseIntValue(t));
                    queue.offer(node.left);
                }
            }
            // right child
            if (i < tokens.size()) {
                String t = tokens.get(i++).trim();
                if (!t.equalsIgnoreCase("null") && !t.isEmpty()) {
                    node.right = new TreeNode(parseIntValue(t));
                    queue.offer(node.right);
                }
            }
        }
        return root;
    }

    // ── ListNode ─────────────────────────────────────────────────────────────
    //  Accepts [1,2,3,4,5]

    static ListNode parseListNodeValue(String raw) {
        List<String> tokens = splitTopLevelElements(raw);
        if (tokens.isEmpty() || (tokens.size() == 1 && tokens.get(0).isEmpty())) return null;
        ListNode dummy = new ListNode(0);
        ListNode cur   = dummy;
        for (String t : tokens) {
            if (!t.trim().isEmpty()) {
                cur.next = new ListNode(parseIntValue(t));
                cur = cur.next;
            }
        }
        return dummy.next;
    }

    // ── Adjacency list (graph) ────────────────────────────────────────────────
    //  Accepts [[2,4],[1,3],[2,4],[1,3]]  (1-indexed or 0-indexed — up to the problem)

    static List<List<Integer>> parseAdjacencyListValue(String raw) {
        return parseListListIntValue(raw);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  FORMATTERS  (strict JSON — no Arrays.toString)
    // ════════════════════════════════════════════════════════════════════════

    static String formatJson(Object obj) {
        if (obj == null)                     return "null";
        if (obj instanceof Boolean)          return obj.toString();
        if (obj instanceof Character)        return "\\"" + obj + "\\"";
        if (obj instanceof Number)           return obj.toString();
        if (obj instanceof String)           return "\\"" + escapeJsonString((String) obj) + "\\"";

        // Primitive arrays
        if (obj instanceof int[])     return formatIntArray((int[]) obj);
        if (obj instanceof long[])    return formatLongArray((long[]) obj);
        if (obj instanceof double[])  return formatDoubleArray((double[]) obj);
        if (obj instanceof char[])    return formatCharArray((char[]) obj);
        if (obj instanceof boolean[]) return formatBoolArray((boolean[]) obj);

        // Object arrays
        if (obj instanceof int[][]) {
            int[][] m = (int[][]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < m.length; i++) {
                sb.append(formatIntArray(m[i]));
                if (i < m.length - 1) sb.append(",");
            }
            return sb.append("]").toString();
        }
        if (obj instanceof char[][]) {
            char[][] m = (char[][]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < m.length; i++) {
                sb.append(formatCharArray(m[i]));
                if (i < m.length - 1) sb.append(",");
            }
            return sb.append("]").toString();
        }
        if (obj instanceof String[]) {
            String[] arr = (String[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                sb.append("\\"").append(escapeJsonString(arr[i])).append("\\"");
                if (i < arr.length - 1) sb.append(",");
            }
            return sb.append("]").toString();
        }
        if (obj instanceof Object[]) {
            Object[] arr = (Object[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                sb.append(formatJson(arr[i]));
                if (i < arr.length - 1) sb.append(",");
            }
            return sb.append("]").toString();
        }

        // List types
        if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < list.size(); i++) {
                sb.append(formatJson(list.get(i)));
                if (i < list.size() - 1) sb.append(",");
            }
            return sb.append("]").toString();
        }

        // TreeNode — level-order serialization (nulls for missing children)
        if (obj instanceof TreeNode) return formatTreeNode((TreeNode) obj);

        // ListNode — array serialization
        if (obj instanceof ListNode) return formatListNode((ListNode) obj);

        // Fallback
        return "\\"" + escapeJsonString(obj.toString()) + "\\"";
    }

    // ── Primitive-array helpers ──────────────────────────────────────────────

    static String formatIntArray(int[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            sb.append(arr[i]);
            if (i < arr.length - 1) sb.append(",");
        }
        return sb.append("]").toString();
    }
    static String formatLongArray(long[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            sb.append(arr[i]);
            if (i < arr.length - 1) sb.append(",");
        }
        return sb.append("]").toString();
    }
    static String formatDoubleArray(double[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            sb.append(arr[i]);
            if (i < arr.length - 1) sb.append(",");
        }
        return sb.append("]").toString();
    }
    static String formatCharArray(char[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            sb.append("\\"").append(arr[i]).append("\\"");
            if (i < arr.length - 1) sb.append(",");
        }
        return sb.append("]").toString();
    }
    static String formatBoolArray(boolean[] arr) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            sb.append(arr[i]);
            if (i < arr.length - 1) sb.append(",");
        }
        return sb.append("]").toString();
    }

    // ── TreeNode serializer ──────────────────────────────────────────────────
    //  Level-order, trailing nulls stripped (matches LeetCode output format)

    static String formatTreeNode(TreeNode root) {
        if (root == null) return "null";
        List<String> tokens = new ArrayList<>();
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node == null) {
                tokens.add("null");
            } else {
                tokens.add(String.valueOf(node.val));
                queue.offer(node.left);
                queue.offer(node.right);
            }
        }
        // Strip trailing nulls
        int last = tokens.size() - 1;
        while (last >= 0 && tokens.get(last).equals("null")) last--;
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i <= last; i++) {
            sb.append(tokens.get(i).equals("null") ? "null" : tokens.get(i));
            if (i < last) sb.append(",");
        }
        return sb.append("]").toString();
    }

    // ── ListNode serializer ──────────────────────────────────────────────────

    static String formatListNode(ListNode head) {
        StringBuilder sb = new StringBuilder("[");
        ListNode cur = head;
        boolean first = true;
        // Cycle guard (up to 10 000 nodes)
        int limit = 10_000;
        while (cur != null && limit-- > 0) {
            if (!first) sb.append(",");
            sb.append(cur.val);
            cur = cur.next;
            first = false;
        }
        return sb.append("]").toString();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  STRING UTILITIES
    // ════════════════════════════════════════════════════════════════════════

    static String escapeJsonString(String s) {
        return s.replace("\\\\", "\\\\\\\\")
                .replace("\\"",  "\\\\\\\"")
                .replace("\\n",  "\\\\n")
                .replace("\\r",  "\\\\r")
                .replace("\\t",  "\\\\t");
    }

    static String unescapeJsonString(String value) {
        StringBuilder out = new StringBuilder();
        boolean escaped = false;
        for (char ch : value.toCharArray()) {
            if (!escaped && ch == '\\\\') { escaped = true; continue; }
            if (escaped) {
                switch (ch) {
                    case 'n':  out.append('\\n'); break;
                    case 'r':  out.append('\\r'); break;
                    case 't':  out.append('\\t'); break;
                    case '"':  out.append('"');   break;
                    case '\\\\': out.append('\\\\'); break;
                    default:   out.append(ch);   break;
                }
                escaped = false;
            } else {
                out.append(ch);
            }
        }
        return out.toString();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  ARGUMENT SPLITTER
    //  Splits a JSON-array-like string at top-level commas.
    //  Handles nested arrays/objects and quoted strings with escapes.
    // ════════════════════════════════════════════════════════════════════════

    static List<String> splitTopLevelElements(String source) {
        source = source.trim();
        // Unwrap outer [ ] if present
        if (source.length() >= 2 && source.charAt(0) == '[' && source.charAt(source.length() - 1) == ']')
            source = source.substring(1, source.length() - 1);

        List<String> out = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int depth = 0;
        boolean inString = false;
        boolean escaped  = false;

        for (int i = 0; i < source.length(); i++) {
            char ch = source.charAt(i);

            if (escaped) { current.append(ch); escaped = false; continue; }
            if (ch == '\\\\' && inString) { current.append(ch); escaped = true; continue; }
            if (ch == '"') { inString = !inString; current.append(ch); continue; }

            if (!inString) {
                if (ch == '[' || ch == '{') depth++;
                else if (ch == ']' || ch == '}') depth--;
                else if (ch == ',' && depth == 0) {
                    out.add(current.toString().trim());
                    current.setLength(0);
                    continue;
                }
            }
            current.append(ch);
        }
        String last = current.toString().trim();
        if (!last.isEmpty()) out.add(last);
        return out;
    }
}
`;
}

// ── Parser selector ──────────────────────────────────────────────────────────
//  Maps a Java type string to the correct parseXxx method name.

function getParser(javaType) {
    const map = {
        'int': 'parseIntValue',
        'long': 'parseLongValue',
        'double': 'parseDoubleValue',
        'float': 'parseDoubleValue',   // cast to float inside solution is user's job
        'char': 'parseCharValue',
        'boolean': 'parseBoolValue',
        'String': 'parseStringValue',
        'int[]': 'parseIntArrayValue',
        'long[]': 'parseLongArrayValue',
        'double[]': 'parseDoubleArrayValue',
        'char[]': 'parseCharArrayValue',
        'String[]': 'parseStringArrayValue',
        'int[][]': 'parseIntMatrixValue',
        'char[][]': 'parseCharMatrixValue',
        'String[][]': 'parseStringMatrixValue',
        'List<Integer>': 'parseListIntValue',
        'List<Long>': 'parseListLongValue',
        'List<Double>': 'parseListDoubleValue',
        'List<String>': 'parseListStringValue',
        'List<List<Integer>>': 'parseListListIntValue',
        'List<List<String>>': 'parseListListStringValue',
        'TreeNode': 'parseTreeNodeValue',
        'ListNode': 'parseListNodeValue',
        'List<List<Integer>>': 'parseAdjacencyListValue',  // alias for graph problems
    };
    return map[javaType] || 'parseStringValue'; // safe fallback
}

module.exports = javaInjector;