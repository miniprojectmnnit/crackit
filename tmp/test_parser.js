const examples = [
  "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].",
  "Input: nums = [3,2,4], target = 6\nOutput: [1,2]",
  "Input: nums = [3,3], target = 6\nOutput: [0,1]"
];

function parseExamplesToTestCases(examplesArray) {
  if (!examplesArray || !Array.isArray(examplesArray)) return { examples: [], test_cases: [] };

  const parsedExamples = [];
  const testCases = [];

  examplesArray.forEach(exStr => {
    if (typeof exStr !== 'string') return;

    const inputMatch = exStr.match(/Input:\s*(.*?)(?=\n|Output:|$)/si);
    const outputMatch = exStr.match(/Output:\s*(.*?)(?=\n|Explanation:|$)/si);
    const explanationMatch = exStr.match(/Explanation:\s*(.*)/si);

    if (inputMatch && outputMatch) {
      const input = inputMatch[1].trim();
      const output = outputMatch[1].trim();
      const explanation = explanationMatch ? explanationMatch[1].trim() : "";

      parsedExamples.push({ input, output, explanation });
      testCases.push({ input, expected_output: output });
    }
  });

  return { examples: parsedExamples, test_cases: testCases };
}

const result = parseExamplesToTestCases(examples);
console.log(JSON.stringify(result, null, 2));
