import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { awardPointsForGame } from "@/api/points";
import { watchAuth } from "@/api/firebase";
import { base44 } from "@/api/base44Client";
import { Mic, Square, Play, Music, Upload } from "lucide-react";

export default function NasheedStudioMaker({ onComplete }) {
  const [user, setUser] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mixing, setMixing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [beatEnabled, setBeatEnabled] = useState(true);
  const [echoEnabled, setEchoEnabled] = useState(true);
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [beatTempo, setBeatTempo] = useState(80);
  const [beatStyle, setBeatStyle] = useState("metronome");
  const [submitting, setSubmitting] = useState(false);

  const contextRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const micStreamRef = useRef(null);
  const destRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    const stop = watchAuth((u) => setUser(u));
    return () => { try { stop?.(); } catch {} };
  }, []);

  const initAudio = () => {
    if (!contextRef.current) {
      contextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      destRef.current = contextRef.current.createMediaStreamDestination();
    }
  };

  const startRecording = async () => {
    try {
      initAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const source = contextRef.current.createMediaStreamSource(stream);
      let chain = source;
      if (echoEnabled) {
        const delay = contextRef.current.createDelay(2.0);
        delay.delayTime.value = 0.2;
        const gain = contextRef.current.createGain();
        gain.gain.value = 0.3;
        chain.connect(delay);
        delay.connect(gain);
        gain.connect(destRef.current);
      }
      chain.connect(destRef.current);
      if (beatEnabled) {
        scheduleBeat();
      }
      const recorder = new MediaRecorder(destRef.current.stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stopStreams();
        setMixing(false);
      };
      recorder.start();
      setRecording(true);
      setMixing(true);
    } catch {}
  };

  const scheduleBeat = () => {
    const ctx = contextRef.current;
    const now = ctx.currentTime;
    const interval = 60 / Math.max(40, Math.min(160, beatTempo));
    for (let i = 0; i < 64; i++) {
      const t = now + i * interval;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = beatStyle === 'metronome' ? 'square' : 'sine';
      osc.frequency.value = 600;
      gain.gain.value = 0.2;
      osc.connect(gain);
      gain.connect(destRef.current);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  };

  const stopStreams = () => {
    try { micStreamRef.current?.getTracks()?.forEach(t => t.stop()); } catch {}
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadMix = async () => {
    if (!audioUrl || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const file = new File([blob], `nasheed-${Date.now()}.webm`, { type: "audio/webm" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Recording.create({ user_id: user.id, recording_type: "nasheed", file_url, status: "pending" });
      await awardPointsForGame(user, 'nasheed_upload', { fallbackScore: 10 });
      try { onComplete?.(10); } catch {}
    } catch {} finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Music className="w-5 h-5" /> Nasheed Studio Maker</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={startRecording} disabled={recording} className="bg-blue-600 hover:bg-blue-700"><Mic className="w-4 h-4 mr-2" /> Record Mix</Button>
            <Button onClick={stopRecording} disabled={!recording} variant="outline"><Square className="w-4 h-4 mr-2" /> Stop</Button>
          </div>
          <div className="flex items-center gap-2">
            <label>Tempo</label>
            <input type="range" min="40" max="160" value={beatTempo} onChange={(e) => setBeatTempo(parseInt(e.target.value))} />
            <Select value={beatStyle} onValueChange={setBeatStyle}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Beat" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="metronome">Metronome</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={beatEnabled ? 'default' : 'outline'} onClick={() => setBeatEnabled(!beatEnabled)}>Beat</Button>
            <Button variant={echoEnabled ? 'default' : 'outline'} onClick={() => setEchoEnabled(!echoEnabled)}>Echo</Button>
          </div>
          <div>
            {audioUrl && <audio src={audioUrl} controls className="w-full" />}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={uploadMix} disabled={!audioUrl || submitting || !user} className="bg-green-600 hover:bg-green-700"><Upload className="w-4 h-4 mr-2" /> Upload</Button>
            <Button onClick={() => setAudioUrl(null)} variant="outline"><Play className="w-4 h-4 mr-2" /> New</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

