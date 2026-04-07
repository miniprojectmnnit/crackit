function pythonInjector(userCode, method_name, stringifiedTests) {
  return `
import json
import sys
import traceback

${userCode}

if __name__ == '__main__':
    test_inputs = ${stringifiedTests}
    results = []
    
    for raw_args in test_inputs:
        try:
            # Parse the JSON string array of arguments into python list
            args = json.loads(raw_args)
            
            # Check for LeetCode-style 'Solution' class
            sol_class = globals().get('Solution')
            if sol_class:
                sol_instance = sol_class()
                method_to_call = getattr(sol_instance, '${method_name}', None)
            else:
                method_to_call = globals().get('${method_name}', globals().get('solve'))
            
            if method_to_call:
                res = method_to_call(*args)
                results.append({"output": res})
            else:
                results.append({"error": "Method '${method_name}' not found."})
        except Exception as e:
            results.append({"error": str(e), "trace": traceback.format_exc()})
            
    print(json.dumps(results))
`;
}

module.exports = pythonInjector;
