This documentation covers the **Orchestration Layer** of your AI system. It explains how you use **LangGraph** to turn a simple LLM into a structured, multi-agent "Assembly Line" for generating high-quality interview content.

🧠 LangGraph: The Multi-Agent Orchestration Framework
-----------------------------------------------------

Unlike a standard linear script, **LangGraph** allows the AI to work in a "Stateful" environment. It treats the problem-generation process as a series of connected nodes, where each node is a specialized AI agent responsible for one specific task.

### 1\. The State Schema (The "Clipboard")

The **State** is the single source of truth that travels through the entire graph. In your implementation, this is defined using Annotation.Root.

*   **Shared Memory:** Every node (Agent) reads the current state from this "Clipboard," performs its task, and writes its findings back.
    
*   **Data Integrity:** This ensures that when the **TestCase Agent** starts working, it isn't guessing—it has the exact problemDetails (description and constraints) written by the **Architect Agent**.
    
*   **The Schema:**
    
    *   questionText: The raw input.
        
    *   problemDetails: The structured title, description, and metadata.
        
    *   testCases / examples / solutionDetails: The generated assets.
        

### 2\. Workflow Nodes (The Specialized Workers)

Nodes represent the individual steps in your AI's thinking process.

#### **Node 1: The Architect (expandProblemNode)**

This is the foundational step. It acts as the "Lead Engineer" who takes a vague user request (e.g., _"Ask a question about binary trees"_) and transforms it into a formal specification.

*   **Responsibility:** Drafting the Title, Description, Constraints, and Function Signature.
    
*   **Downstream Impact:** Every other agent in the graph relies on the Architect’s output to remain consistent.
    

#### **Node 2: The Parallel Processing Unit (generateParallelNode)**

To optimize performance, this node uses **Async Concurrency** via Promise.all. Instead of waiting for one agent to finish before starting the next, it triggers three specialized sub-agents simultaneously:

*   **Agent A (Examples):** Creates the "visible" test cases used in the problem description.
    
*   **Agent B (Test Cases):** Creates the "hidden" edge cases used for final grading.
    
*   **Agent C (Solution):** Writes the optimal reference code to ensure the problem is solvable.
    
*   Shutterstock Explore
    

### 3\. The Edges (The Assembly Line logic)

Edges define the **Control Flow**. They dictate exactly how the state moves from one node to the next.

JavaScript

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   .addEdge(START, "expandProblem")      // Entry Point  .addEdge("expandProblem", "generateParallel") // Dependency Bridge  .addEdge("generateParallel", END);    // Exit Point   `

*   **The START Edge:** Ingests the raw user input.
    
*   **The Sequential Edge:** Ensures the Parallel Unit never starts until the Architect has finished the blueprint.
    
*   **The END Edge:** Collects all findings from the clipboard and returns the final "LeetCode-style" object to the server.
    

### 4\. Architectural Advantages

**FeatureWhy it MattersModularity**If you want to switch from GPT-4 to a specialized "Coding Model" for just the Solution Agent, you only change one function inside the parallel node.**Fault Tolerance**You can add "Conditional Edges" to check the AI's work. If the Test Cases are bad, the graph can route back to the Architect to try again.**Speed**By running the Solution, Examples, and Test Cases in parallel, you reduce the total generation time by **~60%**.**State Persistence**You don't have to manually pass 10 variables through every function call; the Graph handles the "Context" automatically.