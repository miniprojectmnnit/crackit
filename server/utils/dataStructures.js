/**
 * Node definition for a Singly Linked List
 */
class ListNode {
  constructor(val = 0, next = null) {
      this.val = val;
      this.next = next;
  }
}

/**
 * Node definition for a Binary Tree
 */
class TreeNode {
  constructor(val = 0, left = null, right = null) {
      this.val = val;
      this.left = left;
      this.right = right;
  }
}

/**
 * Converts Array representation to LinkedList
 */
function arrayToList(arr) {
  if (!arr || arr.length === 0) return null;
  const head = new ListNode(arr[0]);
  let current = head;
  for (let i = 1; i < arr.length; i++) {
      current.next = new ListNode(arr[i]);
      current = current.next;
  }
  return head;
}

/**
 * Converts LinkedList to Array representation
 */
function listToArray(head) {
  const result = [];
  while (head) {
      result.push(head.val);
      head = head.next;
  }
  return result;
}

/**
 * Converts Array representation (Level-order) to Binary Tree
 */
function arrayToTree(arr) {
  if (!arr || arr.length === 0) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (i < arr.length) {
      const current = queue.shift();
      if (arr[i] !== null) {
          current.left = new TreeNode(arr[i]);
          queue.push(current.left);
      }
      i++;
      if (i < arr.length && arr[i] !== null) {
          current.right = new TreeNode(arr[i]);
          queue.push(current.right);
      }
      i++;
  }
  return root;
}

/**
 * Converts Binary Tree to Array representation (Level-order)
 */
function treeToArray(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  while (queue.length > 0) {
      const current = queue.shift();
      if (current) {
          result.push(current.val);
          queue.push(current.left);
          queue.push(current.right);
      } else {
          result.push(null);
      }
  }
  // Trim trailing nulls
  while (result[result.length - 1] === null) {
      result.pop();
  }
  return result;
}

/**
 * Basic undirected Graph representation helper.
 * Typically represented as Adjacency List.
 */
class Graph {
  constructor() {
    this.adjList = new Map();
  }

  addVertex(v) {
    if (!this.adjList.has(v)) this.adjList.set(v, []);
  }

  addEdge(v, w) {
    this.addVertex(v);
    this.addVertex(w);
    this.adjList.get(v).push(w);
    this.adjList.get(w).push(v);
  }
}

module.exports = {
  ListNode,
  TreeNode,
  Graph,
  arrayToList,
  listToArray,
  arrayToTree,
  treeToArray
};
