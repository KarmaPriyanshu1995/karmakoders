"use client";

import { useState } from "react";
import { UploadCloud, Wand2, Paintbrush, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useThemeStore } from "@/store/useThemeStore";

interface PreviewData {
  colors: {
    primary: string;
    secondary: string;
    background: string;
  };
  typography: {
    heading: string;
    body: string;
  };
  mood: string;
}

export default function AIHubPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const { setTokens } = useThemeStore();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    
    // Simulate AI processing delay
    setTimeout(() => {
      setPreviewData({
        colors: {
          primary: "#6366f1",
          secondary: "#06b6d4",
          background: "#0f172a",
        },
        typography: {
          heading: "Inter",
          body: "Roboto",
        },
        mood: "Futuristic, Clean, Glassmorphism",
      });
      setIsAnalyzing(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">AI Redesign Hub</h2>
          <p className="text-slate-400 mt-1">Upload an inspiration image to automatically generate a matching theme.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Inspiration Input</CardTitle>
            <CardDescription>Drag and drop a website screenshot or Figma export.</CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors cursor-pointer bg-slate-900/30"
            >
              {file ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Paintbrush className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button variant="outline" onClick={() => setFile(null)}>Remove File</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Click to upload or drag and drop</p>
                    <p className="text-sm text-slate-500">SVG, PNG, JPG or GIF (max. 10MB)</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleAnalyze} 
                disabled={!file || isAnalyzing}
                className="w-full sm:w-auto"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Image...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" /> Generate Theme
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>AI Output Preview</CardTitle>
            <CardDescription>Generated design tokens and component styling.</CardDescription>
          </CardHeader>
          <CardContent>
            {previewData ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Color Palette</h4>
                  <div className="flex gap-4">
                    <div className="space-y-2">
                      <div className="w-16 h-16 rounded-lg shadow-lg" style={{ backgroundColor: previewData.colors.primary }} />
                      <p className="text-xs text-center text-slate-400">Primary</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-16 h-16 rounded-lg shadow-lg" style={{ backgroundColor: previewData.colors.secondary }} />
                      <p className="text-xs text-center text-slate-400">Secondary</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-16 h-16 rounded-lg shadow-lg border border-slate-700" style={{ backgroundColor: previewData.colors.background }} />
                      <p className="text-xs text-center text-slate-400">Background</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Typography</h4>
                  <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                    <div>
                      <span className="text-xs text-slate-500">Heading</span>
                      <p className="text-xl text-white">{previewData.typography.heading}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Body</span>
                      <p className="text-sm text-slate-300">{previewData.typography.body}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Detected Mood</h4>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm border border-indigo-500/30">
                    {previewData.mood}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setPreviewData(null)}>Reject</Button>
                  <Button onClick={() => setTokens(previewData)}>Apply Globally</Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                <Paintbrush className="w-12 h-12 mb-4 opacity-20" />
                <p>Upload an image and click Generate Theme to see the AI output here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
