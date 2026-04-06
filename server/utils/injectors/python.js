function pythonInjector(userCode, method_name, testCasesInputs) {

    // Embed test inputs as a proper JSON string so Python parses it
    // with json.loads() — no fragile cross-language literal embedding.
    const formattedTestInputs = JSON.stringify(JSON.stringify(testCasesInputs));

    // Indent user code by 4 spaces so it sits cleanly inside the
    // exec() call without breaking Python's indentation rules.
    const indentedUserCode = userCode
        .split('\n')
        .map(line => '    ' + line)
        .join('\n');

    return `
import json
import sys
import signal
import traceback
import io
import textwrap
from collections import deque

# ════════════════════════════════════════════════════════════════════════════
#  TIME LIMIT
#  Uses SIGALRM (Linux/macOS). On Windows, fall back to a thread-based guard.
# ════════════════════════════════════════════════════════════════════════════
TIMEOUT_SECONDS = 5

class TimeLimitExceeded(Exception):
    pass

def _tle_handler(signum, frame):
    raise TimeLimitExceeded("Time Limit Exceeded")

try:
    signal.signal(signal.SIGALRM, _tle_handler)
    _has_sigalrm = True
except AttributeError:
    # Windows — SIGALRM not available; rely on process-level kill from runner
    _has_sigalrm = False

# ════════════════════════════════════════════════════════════════════════════
#  DATA STRUCTURES
# ════════════════════════════════════════════════════════════════════════════

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val   = val
        self.left  = left
        self.right = right

    def __repr__(self):
        return f"TreeNode({self.val})"


class ListNode:
    def __init__(self, val=0, next=None):
        self.val  = val
        self.next = next

    def __repr__(self):
        return f"ListNode({self.val})"


# ── TreeNode deserializer ─────────────────────────────────────────────────
#  LeetCode level-order: [1, null, 2, 3]  (Python list, already json.loads'd)

def build_tree(arr):
    if not arr or arr[0] is None:
        return None
    root  = TreeNode(arr[0])
    queue = deque([root])
    i     = 1
    while queue and i < len(arr):
        node = queue.popleft()
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root


# ── TreeNode serializer ───────────────────────────────────────────────────
#  Level-order output, trailing Nones stripped.

def tree_to_list(root):
    if root is None:
        return None
    result = []
    queue  = deque([root])
    while queue:
        node = queue.popleft()
        if node is None:
            result.append(None)
        else:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
    # Strip trailing Nones
    while result and result[-1] is None:
        result.pop()
    return result


# ── ListNode deserializer ─────────────────────────────────────────────────

def build_list(arr):
    if not arr:
        return None
    dummy = ListNode(0)
    cur   = dummy
    for v in arr:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next


# ── ListNode serializer ───────────────────────────────────────────────────
#  Cycle-safe (10 000 node limit).

def list_to_arr(head):
    result, cur, limit = [], head, 10_000
    while cur is not None and limit > 0:
        result.append(cur.val)
        cur   = cur.next
        limit -= 1
    return result


# ════════════════════════════════════════════════════════════════════════════
#  OUTPUT SERIALIZER
#  Converts any return value to a JSON-safe Python object.
#  Handles TreeNode, ListNode, set, tuple, and nested combinations.
# ════════════════════════════════════════════════════════════════════════════

def serialize_output(val):
    if val is None:
        return None
    if isinstance(val, bool):          # bool before int — bool is subclass of int
        return val
    if isinstance(val, (int, float, str)):
        return val
    if isinstance(val, TreeNode):
        return tree_to_list(val)
    if isinstance(val, ListNode):
        return list_to_arr(val)
    if isinstance(val, (set, frozenset)):
        return sorted(serialize_output(v) for v in val)  # sorted for determinism
    if isinstance(val, tuple):
        return [serialize_output(v) for v in val]
    if isinstance(val, list):
        return [serialize_output(v) for v in val]
    if isinstance(val, dict):
        return {str(k): serialize_output(v) for k, v in val.items()}
    # Fallback — custom objects, etc.
    return str(val)


# ════════════════════════════════════════════════════════════════════════════
#  TRACEBACK SANITIZER
#  Keeps only frames that belong to the user's code (filename == '<string>'),
#  hiding internal driver paths.
# ════════════════════════════════════════════════════════════════════════════

def sanitize_traceback(exc):
    tb    = exc.__traceback__
    lines = ["Traceback (most recent call last):"]
    for frame in traceback.extract_tb(tb):
        if frame.filename == '<string>':
            lines.append(
                f'  File "solution.py", line {frame.lineno}, in {frame.name}\\n'
                f'    {frame.line}'
            )
    lines.append(f"{type(exc).__name__}: {exc}")
    return "\\n".join(lines)


# ════════════════════════════════════════════════════════════════════════════
#  RESTRICTED BUILTINS
#  Remove dangerous builtins before exec-ing user code.
#  This is a basic defence — proper sandboxing requires seccomp/Docker.
# ════════════════════════════════════════════════════════════════════════════

_BLOCKED_BUILTINS = {
    'open', 'exec', 'eval', 'compile', '__import__',
    'breakpoint', 'memoryview', 'vars', 'dir',
}

_safe_builtins = {
    k: v for k, v in __builtins__.items()
    if k not in _BLOCKED_BUILTINS
} if isinstance(__builtins__, dict) else {
    k: getattr(__builtins__, k)
    for k in dir(__builtins__)
    if k not in _BLOCKED_BUILTINS and not k.startswith('__')
}

# Re-add the safe dunder names needed for normal execution
_safe_builtins['__name__']    = '__main__'
_safe_builtins['__build_class__'] = __build_class__


# ════════════════════════════════════════════════════════════════════════════
#  METHOD RESOLVER
#  Supports both styles:
#    Class style:    class Solution: def twoSum(self, nums, target): ...
#    Function style: def twoSum(nums, target): ...
# ════════════════════════════════════════════════════════════════════════════

def resolve_method(ns, method_name):
    # Try Solution class first (LeetCode standard)
    if 'Solution' in ns:
        sol    = ns['Solution']()
        method = getattr(sol, method_name, None)
        if callable(method):
            return method
    # Fall back to bare function
    fn = ns.get(method_name)
    if callable(fn):
        return fn
    return None


# ════════════════════════════════════════════════════════════════════════════
#  MAIN RUNNER
# ════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    test_inputs = json.loads(${formattedTestInputs})
    results     = []

    # ── Exec user code in an isolated namespace ───────────────────────────
    user_namespace = {
        '__builtins__': _safe_builtins,
        # Inject data structures so user code can reference them
        'TreeNode': TreeNode,
        'ListNode': ListNode,
        'List':     list,   # type hint convenience
        'Optional': None,   # avoid NameError on Optional[TreeNode] hints
    }

    user_code = textwrap.dedent("""
${indentedUserCode}
    """)

    try:
        exec(compile(user_code, '<string>', 'exec'), user_namespace)
    except SyntaxError as e:
        # Syntax errors affect all tests — report once and exit
        error_msg = f"SyntaxError: {e.msg} (line {e.lineno})"
        print(json.dumps([{"error": error_msg} for _ in test_inputs]))
        sys.exit(0)
    except Exception as e:
        error_msg = f"{type(e).__name__}: {e}"
        print(json.dumps([{"error": error_msg} for _ in test_inputs]))
        sys.exit(0)

    method = resolve_method(user_namespace, '${method_name}')

    # ── Run each test case ────────────────────────────────────────────────
    for raw_args in test_inputs:
        # Capture print() output from user code
        _stdout_capture = io.StringIO()
        _real_stdout    = sys.stdout
        sys.stdout      = _stdout_capture

        result = {}
        try:
            if _has_sigalrm:
                signal.alarm(TIMEOUT_SECONDS)

            if method is None:
                raise NameError(
                    f"Method '${method_name}' not found. "
                    "Make sure your class is named Solution or your function is named ${method_name}."
                )

            args = json.loads(raw_args)
            if not isinstance(args, list):
                raise TypeError(f"Expected a JSON array of arguments, got {type(args).__name__}")

            res = method(*args)
            result['output'] = serialize_output(res)

        except TimeLimitExceeded:
            result['error'] = 'Time Limit Exceeded'

        except Exception as e:
            result['error'] = f"{type(e).__name__}: {e}"
            result['trace'] = sanitize_traceback(e)

        finally:
            if _has_sigalrm:
                signal.alarm(0)   # cancel alarm for next test
            sys.stdout = _real_stdout

        captured = _stdout_capture.getvalue()
        if captured:
            result['stdout'] = captured.rstrip('\\n')

        results.append(result)

    # ── Single JSON line to stdout ────────────────────────────────────────
    sys.stdout.write(json.dumps(results) + '\\n')
`;
}

module.exports = pythonInjector;