const { getType } = require('./common');

function javaInjector(userCode, method_name, testCasesInputs, problemDetails, parameters) {
  const returnType = getType(problemDetails.return_type, 'java');
  
  const paramParsing = parameters.map((p, idx) => {
    const javaType = getType(p.type, 'java');
    let parser = 'parseStringValue';
    if (javaType === 'int') parser = 'parseIntValue';
    else if (javaType === 'long') parser = 'parseLongValue';
    else if (javaType === 'double') parser = 'parseDoubleValue';
    else if (javaType === 'boolean') parser = 'parseBoolValue';
    else if (javaType === 'int[]') parser = 'parseIntArrayValue';
    else if (javaType === 'String[]') parser = 'parseStringArrayValue';
    else if (javaType === 'int[][]') parser = 'parseIntMatrixValue';
    else if (javaType === 'String') parser = 'parseStringValue';

    return `${javaType} ${p.name} = ${parser}(argsList.get(${idx}));`;
  }).join('\n                ');

  const callArgs = parameters.map(p => p.name).join(', ');
  const formattedTestInputs = testCasesInputs.map(t => '"' + t.replace(/"/g, '\\"') + '"').join(', ');

  return `
import java.util.*;

${userCode}

public class Main {
    public static void main(String[] args) {
        String[] testInputs = new String[] { ${formattedTestInputs} };
        System.out.print("[");
        Solution sol = new Solution();
        for (int i = 0; i < testInputs.length; i++) {
            try {
                List<String> argsList = splitTopLevelElements(testInputs[i]);
                if (argsList.size() != ${parameters.length}) {
                    throw new RuntimeException("Expected ${parameters.length} argument(s), got " + argsList.size());
                }
                ${paramParsing}
                
                ${returnType} res = sol.${method_name}(${callArgs}); 
                System.out.print("{\\"output\\": " + formatJson(res) + "}");
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage().replace("\\\\", "\\\\\\\\").replace("\\\"", "\\\\\\\"").replace("\\n", "\\\\\\n") : "Error";
                System.out.print("{\\"error\\": \\"" + msg + "\\" }");
            }
            if (i < testInputs.length - 1) System.out.print(",");
        }
        System.out.println("]");
    }

    static List<String> splitTopLevelElements(String source) {
        source = source.trim();
        if (source.length() >= 2 && source.startsWith("[") && source.endsWith("]")) {
            source = source.substring(1, source.length() - 1);
        }
        List<String> out = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        for (char ch : source.toCharArray()) {
            if (escaped) { current.append(ch); escaped = false; continue; }
            if (ch == '\\\\') { current.append(ch); escaped = true; continue; }
            if (ch == '"') { inString = !inString; current.append(ch); continue; }
            if (!inString) {
                if (ch == '[' || ch == '{') depth++;
                if (ch == ']' || ch == '}') depth--;
                if (ch == ',' && depth == 0) {
                    out.add(current.toString().trim());
                    current.setLength(0);
                    continue;
                }
            }
            current.append(ch);
        }
        if (current.toString().trim().length() > 0) out.add(current.toString().trim());
        return out;
    }

    static String unescapeJsonString(String value) {
        StringBuilder out = new StringBuilder();
        boolean escaped = false;
        for (char ch : value.toCharArray()) {
            if (!escaped && ch == '\\\\') { escaped = true; continue; }
            if (escaped) {
                if (ch == 'n') out.append('\\n');
                else if (ch == 'r') out.append('\\r');
                else if (ch == 't') out.append('\\t');
                else if (ch == '"') out.append('"');
                else if (ch == '\\\\') out.append('\\\\');
                else out.append(ch);
                escaped = false;
            } else out.append(ch);
        }
        return out.toString();
    }

    static int parseIntValue(String raw) { return Integer.parseInt(raw.trim()); }
    static long parseLongValue(String raw) { return Long.parseLong(raw.trim()); }
    static double parseDoubleValue(String raw) { return Double.parseDouble(raw.trim()); }
    static boolean parseBoolValue(String raw) { String v = raw.trim(); return v.equals("true") || v.equals("1"); }
    static String parseStringValue(String raw) {
        String value = raw.trim();
        if (value.length() >= 2 && value.startsWith("\\"") && value.endsWith("\\"")) {
            return unescapeJsonString(value.substring(1, value.length() - 1));
        }
        return value;
    }
    static int[] parseIntArrayValue(String raw) {
        List<String> elements = splitTopLevelElements(raw);
        int[] arr = new int[elements.size()];
        for (int i = 0; i < elements.size(); i++) {
            if (!elements.get(i).isEmpty()) arr[i] = parseIntValue(elements.get(i));
        }
        return arr;
    }
    static String[] parseStringArrayValue(String raw) {
        List<String> elements = splitTopLevelElements(raw);
        String[] arr = new String[elements.size()];
        for (int i = 0; i < elements.size(); i++) {
            arr[i] = parseStringValue(elements.get(i));
        }
        return arr;
    }
    static int[][] parseIntMatrixValue(String raw) {
        List<String> elements = splitTopLevelElements(raw);
        int[][] arr = new int[elements.size()][];
        for (int i = 0; i < elements.size(); i++) {
            arr[i] = parseIntArrayValue(elements.get(i));
        }
        return arr;
    }

    private static String formatJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String) return "\\"" + ((String)obj).replace("\\\\", "\\\\\\\\").replace("\\\"", "\\\\\\\"").replace("\\n", "\\\\\\n") + "\\"";
        if (obj instanceof Boolean || obj instanceof Number) return obj.toString();
        if (obj instanceof int[]) return Arrays.toString((int[])obj);
        if (obj instanceof Object[]) return Arrays.deepToString((Object[])obj);
        return "\\"" + obj.toString().replace("\\\\", "\\\\\\\\").replace("\\\"", "\\\\\\\"").replace("\\n", "\\\\\\n") + "\\"";
    }
}
`;
}

module.exports = javaInjector;
