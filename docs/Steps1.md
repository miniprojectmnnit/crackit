📄 Phase 1: Resume Upload & Intelligence Extraction
---------------------------------------------------

The entry point of the user's journey, where raw PDF data is converted into a structured professional profile.

### **1\. Authentication Handshake**

*   **Frontend:** The useAuthFetch custom hook intercepts the request to /api/resume/upload. It calls Clerk's getToken() to retrieve a short-lived **JWT (JSON Web Token)**.
    
*   **Header:** The token is injected into the Authorization: Bearer header.
    
*   **Backend Verification:** The server utilizes the clerkClient and CLERK\_SECRET\_KEY. It performs a cryptographic signature check to ensure the token:
    
    1.  Was issued by your Clerk instance.
        
    2.  Has not expired.
        
    3.  Belongs to the userId claiming to make the request.
        

### **2\. The Processing Pipeline (Multer ➔ AI)**

1.  **Memory Buffer:** Unlike standard uploads, we use multer.memoryStorage(). The file exists only in RAM as a Buffer, which is faster and more secure for sensitive resume data.
    
2.  **Parsing:** The pdf-parse library scans the buffer, extracting raw text strings from the PDF layers.
    
3.  **The ResumeAgent (LLM):**
    
    *   The raw text is sent to a specialized AI Agent (the **ResumeAgent**).
        
    *   It uses **Structured Output** (via Zod schemas) to transform messy text into a clean JSON object containing skills, experience, projects, and education.
        
4.  **Database Persistence:** This structured data is saved in the ResumeProfile collection, linked to the clerkUserId.
    

🏗️ Phase 2: Session Initialization (handleStartRound)
------------------------------------------------------

Before a candidate enters the interview room, a "Session" must be orchestrated to act as the source of truth for the upcoming conversation.

### **1\. Request Payload**

The frontend sends a POST request to /api/interview/setup with:

*   resumeId: To tailor questions to the user's background.
    
*   roundType: One of dsa, resume, system\_design, or hr.
    
*   context: Optional metadata (e.g., "Target Company: Google", "Role: Frontend Engineer").
    

### **2\. The InterviewSession Model**

The backend creates a new document in MongoDB. This document is critical because it persists the state if the user refreshes their browser.

*   **Unique ID:** A sessionId is generated and returned to the client.
    
*   **Metadata:** It stores the round\_type and initializes an empty transcript and evaluations array.
    

🎯 Phase 3: Domain-Specific Round Logic
---------------------------------------

Each round uses a unique **Question Generation Strategy** to ensure the interview feels authentic.

### **1\. DSA Round (Data Structures & Algorithms)**

*   **Strategy:** Utilizes the getSmartDSAQuestions utility.
    
*   **Selection:** It picks exactly **3 questions** (1 Easy, 1 Medium, 1 Hard).
    
*   **Adaptive Learning:** It checks the user's UserQuestionStats to avoid questions they’ve already mastered, focusing instead on their "Weakness Score."
    

### **2\. System Design Round**

*   **Strategy:** The systemDesignAgent generates high-level architectural problems (e.g., "Design a Rate Limiter" or "Scale a Video Streaming Service").
    
*   **Focus:** Evaluates scalability, load balancing, and database choices based on the user's seniority level extracted from the resume.
    

### **3\. Resume-Based Round**

*   **Strategy:** The interviewPlanAgent deep-dives into the specific projects and technologies listed on the uploaded resume.
    
*   **Focus:** It looks for "Conflict Points" or "Tech Choices" in the projects to challenge the candidate on why they chose specific tools (e.g., "Why did you use Redux over Context API in your E-commerce project?").
    

### **4\. HR Round (Behavioral)**

*   **Strategy:** The hrAgent focuses on the "STAR" method (Situation, Task, Action, Result).
    
*   **Focus:** Generates questions about leadership, conflict resolution, and cultural fit, often cross-referencing past experiences mentioned in the resume.
    

### **Summary of the Workflow**

1.  **Upload** (Client) $\\rightarrow$ **Verify** (Clerk) $\\rightarrow$ **Parse** (Server).
    
2.  **AI Analysis** (ResumeAgent) $\\rightarrow$ **Store Profile** (MongoDB).
    
3.  **Start Round** (Client) $\\rightarrow$ **Generate Plan** (Domain Agents) $\\rightarrow$ **Session ID Issued**.
    
4.  **Enter Room** (Client) $\\rightarrow$ **Connect** (WebSocket).