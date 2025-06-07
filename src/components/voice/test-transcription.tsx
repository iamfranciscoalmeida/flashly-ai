'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function TestTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const testTranscription = async () => {
    try {
      setError('');
      console.log('🎤 Starting test recording...');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing...');
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        console.log('📝 Sending to transcription API...', {
          size: audioBlob.size,
          type: audioBlob.type
        });

        // Send to transcription API
        const formData = new FormData();
        formData.append('audio', audioBlob, 'test-recording.webm');
        
        const response = await fetch('/api/voice/transcribe-streaming', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Transcription result:', result);
        setTranscript(result.text || 'No text received');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      setIsRecording(true);
      mediaRecorder.start();

      // Stop after 3 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Test recording error:', error);
      setError(error instanceof Error ? error.message : String(error));
      setIsRecording(false);
    }
  };

  return (
    <Card className="p-4 mb-4">
      <h3 className="text-lg font-semibold mb-4">Direct Transcription Test</h3>
      <div className="space-y-4">
        <Button 
          onClick={testTranscription} 
          disabled={isRecording}
          variant={isRecording ? "destructive" : "default"}
        >
          {isRecording ? "Recording... (3s)" : "Test Recording"}
        </Button>
        
        {transcript && (
          <div className="bg-green-50 p-3 rounded">
            <strong>Transcript:</strong> {transcript}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 p-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </Card>
  );
} 