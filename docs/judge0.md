🚀 The Judge0 Execution & Grading Architecture
----------------------------------------------

The system uses a **Hybrid Execution Strategy**. It primarily relies on **Judge0** (via RapidAPI) for secure, multi-language execution, but includes a **Comparison Service** to handle complex data structures like Trees and Linked Lists.

### 1\. The Judge0 Integration Service (judge0Service.js)

This service acts as the "Dispatcher." It manages the communication with the Judge0 API.

*   **Language Mapping:** Since Judge0 identifies languages by ID (e.g., Python is 71, JavaScript is 93), this service maps user-friendly names to the correct API constants.
    
*   **The Submission Workflow:**
    
    1.  **Base64 Encoding:** To prevent special characters from breaking the JSON payload, the entire source code is converted to a Base64 string.
        
    2.  **POST (Create):** The code is sent to Judge0, which returns a unique **Token**.
        
    3.  **Polling (The Wait):** Because code execution takes time, the service enters a while loop, "pinging" the API every 1 second until the status\_id indicates the job is finished.
        
    4.  **Retrieval:** Once finished, the service decodes the stdout (output), stderr (errors), and compile\_output.
        

### 2\. The Code Injector (codeInjector.js)

Raw user code cannot be run by itself because it doesn't know what the "Test Cases" are. The Injector wraps the user's logic in a **Driver Template**.

*   **The "Sandwich" Method:**
    
    *   **Header:** Adds necessary imports (e.g., import json in Python).
        
    *   **Body:** Injects the user's raw code snippet.
        
    *   **Footer:** Adds a loop that feeds the test\_cases into the user's function and prints the results as a **JSON Array**.
        
*   **Boilerplate Generation:** For strict languages like Java and C++, the injector automatically writes a mini-JSON parser inside the file so the code can handle the incoming test data without external libraries.
    

### 3\. The Comparison Service (comparisonService.js)

This is the "Brain" that decides if the user passed. It goes beyond simple string matching.

#### **A. Deep Recursive Comparison**

Standard equality (==) only works for numbers and strings. Our engine uses **Recursive Deep Comparison** to validate complex data:

*   **Linked Lists:** It checks the value, then recursively follows the next pointer until it reaches null.
    
*   **Binary Trees:** It validates the root value, then branches left and right simultaneously to ensure the entire tree structure is identical to the solution.
    
*   **Fuzzy Matching:** It treats "true" (string) and true (boolean) as identical to prevent unfair failures due to language-specific output formats.
    

#### **B. The Result Aggregator**

After comparison, the service compiles a final report for the user:

*   **Success Metrics:** Number of passed vs. failed test cases.
    
*   **Failure Details:** If a test fails, it shows the **Input**, **Expected Output**, and **Actual Output**.
    
*   **Resource Tracking:** It extracts **CPU Time** (ms) and **Memory Usage** (KB) from the Judge0 response to give the user "Performance Feedback."
    

### 4\. The Execution Pipeline (executeCodePipeline.js)

This is the master function that coordinates the entire process in four steps:

**StepActionResponsibility1. Inject**Wrap user code with test drivers.codeInjector.js**2\. Submit**Send to Cloud and Poll for results.judge0Service.js**3\. Clean**Extract and decode Base64 output.judge0Service.js**4\. Grade**Perform deep comparison of results.comparisonService.js

### 🛠️ Error Handling & Safety

*   **Infinite Loops:** The system has a hard **20-second timeout** on the Judge0 side. If code runs too long, it is killed.
    
*   **Compilation Errors:** If the code has a syntax error, the pipeline catches the compile\_output and displays the exact line number to the user.
    
*   **Sandbox Security:** Because the code runs on Judge0's infrastructure, your main server is protected from malicious code (like users trying to delete your database).