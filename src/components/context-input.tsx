"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Upload, Youtube, Type, X, Loader2, FileText } from "lucide-react";
import { createClient } from "../../supabase/client";

interface ContextInputProps {
  conversationId: string;
  onContextUpdate: (
    contextType: string,
    contextSource: string,
    contextBlob: string,
  ) => void;
  onClose: () => void;
}

export default function ContextInput({
  conversationId,
  onContextUpdate,
  onClose,
}: ContextInputProps) {
  const [activeTab, setActiveTab] = useState("file");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const supabase = createClient();

  const handleFileUpload = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create a unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/context/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("study-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // For now, we'll use a placeholder for text extraction
      // In a real implementation, you'd extract text from the PDF
      const extractedText = `Content from ${file.name}: This is extracted text from the uploaded document. It contains study material that will be used as context for the AI conversation.`;

      // Update conversation with context
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_type: "file",
          context_source: file.name,
          context_blob: extractedText,
        }),
      });

      if (response.ok) {
        onContextUpdate("file", file.name, extractedText);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) return;

    setLoading(true);
    try {
      // For now, we'll use a placeholder for transcript extraction
      // In a real implementation, you'd extract the transcript from YouTube
      const transcript = `Transcript from ${youtubeUrl}: This is the extracted transcript from the YouTube video. It contains educational content that will be used as context for the AI conversation.`;

      // Update conversation with context
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_type: "youtube",
          context_source: youtubeUrl,
          context_blob: transcript,
        }),
      });

      if (response.ok) {
        onContextUpdate("youtube", youtubeUrl, transcript);
      }
    } catch (error) {
      console.error("Error processing YouTube URL:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) return;

    setLoading(true);
    try {
      // Update conversation with context
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_type: "text",
          context_source: "Pasted text",
          context_blob: textContent,
        }),
      });

      if (response.ok) {
        onContextUpdate("text", "Pasted text", textContent);
      }
    } catch (error) {
      console.error("Error saving text context:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Add Context</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="file" className="flex items-center gap-1">
            <Upload className="h-4 w-4" />
            File
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-1">
            <Youtube className="h-4 w-4" />
            Video
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-1">
            <Type className="h-4 w-4" />
            Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Upload PDF or Document</Label>
            <div className="mt-2">
              {!file ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-2">
                    Click to upload a PDF or document
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                  >
                    Browse Files
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={handleFileUpload}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Add File Context"
            )}
          </Button>
        </TabsContent>

        <TabsContent value="youtube" className="space-y-4">
          <div>
            <Label htmlFor="youtube-url">YouTube Video URL</Label>
            <Input
              id="youtube-url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="mt-2"
            />
          </div>
          <Button
            onClick={handleYoutubeSubmit}
            disabled={!youtubeUrl.trim() || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Add Video Context"
            )}
          </Button>
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <div>
            <Label htmlFor="text-content">Paste Your Notes or Text</Label>
            <Textarea
              id="text-content"
              placeholder="Paste your study notes, article text, or any other content here..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="mt-2 min-h-[120px]"
            />
          </div>
          <Button
            onClick={handleTextSubmit}
            disabled={!textContent.trim() || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Add Text Context"
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
