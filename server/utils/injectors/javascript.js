function javascriptInjector(userCode, method_name, stringifiedTests) {
  return `
${userCode}

function runTests() {
    const testInputs = ${stringifiedTests};
    const results = [];
    
    for (const rawArgs of testInputs) {
        try {
            const args = JSON.parse(rawArgs);
            const methodToCall = typeof ${method_name} === 'function' ? ${method_name} : (typeof solve === 'function' ? solve : null);
            
            if (methodToCall) {
                const res = methodToCall(...args);
                results.push({ output: res });
            } else {
                results.push({ error: "Method '${method_name}' not found." });
            }
        } catch (e) {
            results.push({ error: e.message, trace: e.stack });
        }
    }
    console.log(JSON.stringify(results));
}

runTests();
`;
}

module.exports = javascriptInjector;
