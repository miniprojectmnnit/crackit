/**
 * Generates a code template/skeleton for a coding question.
 * @param {Object} question - The question object
 * @returns {string} Code template string
 */
export const generateCodeTemplate = (question) => {
  const name = question.title ? question.title.replace(/ /g, '') : 'solve';

  let args = '';
  if (question.test_cases && question.test_cases.length > 0) {
    args = 'input';
  }

  return `/**
 * PROBLEM DESCRIPTION:
 * ${question.description || question.question_text}
 * 
 * NOTE: 
 * - Write all your logic inside the \`${name}\` function.
 * - Make sure to RETURN the final output.
 * - Language: JavaScript (Node.js)
 */

function ${name}(${args}) {
  // Write your code here...
  
}
`;
};
