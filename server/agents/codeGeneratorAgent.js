const { getLLM } = require("../utils/llmClient");
const { z } = require("zod");
const log = require("../utils/logger");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");

/**
 * Zod schema for structured output from the LLM.
 * Defines the necessary metadata to generate valid code templates and drivers.
 */
const codeMetadataSchema = z.object({
  method_name: z.string().describe("The camelCase method name (e.g. 'twoSum')"),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string().describe("A generic type string (e.g. 'integer', 'string', 'integer[]', 'integer[][]')")
  })).describe("List of parameters for the method"),
  return_type: z.string().describe("The return type (e.g. 'integer', 'string', 'integer[]')"),
  starter_code: z.string().describe("The full language-specific starter code for the user, including common headers and the class structure")
});

/**
 * Generates code metadata and starter code using an LLM.
 * @param {string} questionTitle - The title of the question
 * @param {string} description - The problem description
 * @param {string} examples - Problem examples (array or string)
 * @param {string} language - Target programming language (default: "C++")
 * @returns {Promise<Object>} The generated metadata or null on failure
 */
async function generateCodeMetadata(questionTitle, description, examples, language = "C++") {
  log.info("CODE_GEN", `Generating ${language} metadata for: ${questionTitle}`);

  const systemInstructions = `You are an expert at LeetCode problem analysis.
Given a problem title, description, and examples, extract the function signature and provide a starter code template.

OUTPUT FORMAT REQUIREMENTS:
1. Identify the most standard method name based on the problem title (e.g. 'luckyNumbers' for 'Lucky Numbers in a Matrix').
2. Identify all parameter names and their generic types based on the 'Input:' strings in examples. 
   - If 'Input: n = 2', param is 'n' (integer).
   - If 'Input: matrix = [[3,7]]', param is 'matrix' (integer[][]).
3. Identify the return type from the 'Output:' and problem context.
4. The 'starter_code' should be the actual template the user sees in the editor.
   - For C++, include: #include <iostream>, <vector>, <string>, <algorithm>, <climits>, <limits>, <cmath>
   - For C++, use 'using namespace std;' and 'class Solution { public: ... };'
   - Add a comment indicating where to write code.
   - Provide a sensible default return statement.

GENERIC TYPE GUIDE:
- 'integer'
- 'long'
- 'double'
- 'string'
- 'boolean'
- 'type[]' (1D array)
- 'type[][]' (2D array)
`;

  const humanMessage = `
Problem: ${questionTitle}
Description: ${description}
Examples:
${Array.isArray(examples) ? examples.join('\n') : examples}
Language: ${language}
`;

  // Use a low temperature for strict factual output
  const llm = getLLM({ temperature: 0 });
  const chain = llm.withStructuredOutput(codeMetadataSchema);

  try {
    const result = await chain.invoke([
      new SystemMessage(systemInstructions),
      new HumanMessage(humanMessage)
    ]);
    
    log.success("CODE_GEN", `Metadata generated successfully for: ${questionTitle}`);
    return result;
  } catch (e) {
    log.error("CODE_GEN", `Failed to generate code metadata: ${e.message}`);
    return null;
  }
}

module.exports = { generateCodeMetadata };
