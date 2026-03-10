// It is used to configure your extension project in a structured way.
import { defineConfig } from 'wxt';


export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: "AI Interview Experience Extractor",
    description: "Extract interview questions and run mock interviews",
    version: "1.0.0",
    permissions: ["activeTab", "scripting", "storage"],
    host_permissions: ["https://*/*", "http://*/*"],
  },
  action: {
    default_title: "AI Interview Extractor"
  }
});
// When WXT builds the extension, it will produce something like:
// .output/chrome-mv3/manifest.json