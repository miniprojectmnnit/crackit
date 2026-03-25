🧠 Chrome Extension Architecture & Flow (Interview Extractor) 🔹 Core Idea

A Chrome extension consists of multiple isolated parts:

Content Script → runs inside the webpage (has **DOM** access)

Background Script → runs in extension backend (controls logic)

Popup/UI → what user interacts with

⚠️ These parts cannot directly call each other’s functions 👉 They communicate using message passing

🔹 Full Application Flow

User clicks extension ↓ Clicks *Extract* ↓ Popup → Background ↓ Background → Content Script ↓ Content Script extracts data ↓ Background → Backend **API** ↓ Backend → returns questions ↓ Popup renders questions ↓ User clicks *Mock Interview* ↓ New tab opens (frontend app)

🧩 Step-by-Step Breakdown 🔹 1. Popup Controller (Entry Point) 📌 Role:

Runs when user clicks extension

Acts as UI controller

⚙️ Responsibilities:

Sends request to background script to start extraction

Receives processed questions

Renders questions in UI

Starts mock interview (opens new tab)

🔹 2. Background Script (Orchestrator) 📌 Role:

Acts as the central coordinator

⚙️ Responsibilities:

Receives request from popup (PROCESS_EXTRACTION)

Sends message to content script to extract page data

Sends extracted data to backend **API** (/api/extract)

Returns processed questions back to popup

🔍 Deep Dive: Backend (extractController) Step 1: Cache Check

Check if **URL** already exists in DB

If yes → fetch stored questions (fast response)

Step 2: **LLM** Extraction

If not cached → send article text to **LLM**

Generate candidate questions

Step 3: Normalization

Clean and standardize questions

Remove duplicates

Step 4: Upsert Questions

Insert new questions or reuse existing ones

Prevent duplication in DB

Step 5: Save Page

Store **URL** + related question IDs

🔹 3. Content Script (Data Extractor) 📌 Role:

Runs inside webpage

Extracts content from **DOM**

⚙️ Key Concept: defineContentScript

A **WXT** wrapper function

Declares this file as a content script

Defines how and where it runs

⚙️ matches Property

Defines which websites the script runs on

Example: [*<all_urls>*] → runs everywhere

🔌 Message Listener (Core Logic)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

🔹 Parameters:

request → data sent (e.g., { action: *GET_ARTICLE* })

sender → who sent the message (tab info)

sendResponse → function to send response back

🧠 What it does:

Listens for messages from background

Detects current website

Uses appropriate extractor (**GFG**, LeetCode, etc.)

Falls back to generic extractor if needed

Sends extracted content back

🔹 Communication System (Important) 📡 Message Passing

Since components are isolated:

Popup → Background → Content Script

Content Script → Background → Popup

🔁 Example Flow

Popup → Background: chrome.runtime.sendMessage(...) Background → Content Script: chrome.tabs.sendMessage(...) Content Script → Background: sendResponse(...)

🔹 Key Design Principles ✅ Separation of Concerns

Popup → UI only

Background → logic + orchestration

Content Script → **DOM** extraction

Backend → AI + processing

✅ Caching System

Avoid repeated **LLM** calls

Improves performance and reduces cost

✅ Normalization + Upsert

Clean data

Avoid duplicates

Maintain scalable DB

✅ Fallback Handling

Generic extractor ensures system never breaks

🔹 Final Mental Model

Extension UI (Popup) ↓ Background Script (Brain) ↓ Content Script (Eyes - reads page) ↓ Backend **API** (Intelligence - **LLM**) ↓ Database (Memory)

🚀 Summary

This system works as a pipeline:

Extract → Process → Clean → Store → Display → Simulate Interview