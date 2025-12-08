import { useState } from "react";

export default function Alarm() {
  const [time, setTime] = useState("");
  const [sound, setSound] = useState("SYSTEM_ALARM");
  const [status, setStatus] = useState("");

  function scheduleFallback() {
    if (!time) return;
    const alarmTime = new Date();
    const [h, m] = time.split(":");
    alarmTime.setHours(parseInt(h, 10));
    alarmTime.setMinutes(parseInt(m, 10));
    alarmTime.setSeconds(0);
    let diff = alarmTime.getTime() - Date.now();
    if (diff < 0) diff += 24 * 60 * 60 * 1000;
    setStatus("Alarm set");
    setTimeout(() => {
      let playUrl = null;
      if (sound.endsWith('.mp3')) {
        const base = window.location.origin;
        playUrl = `${base}/sounds/${sound}`;
      }
      if (playUrl) {
        const audio = new Audio(playUrl);
        audio.loop = true;
        audio.play();
      }
      alert("Alarm ringing");
    }, diff);
  }

  function setAlarm() {
    if (!time) {
      setStatus("Select a time");
      return;
    }
    let url = sound;
    if (sound.endsWith('.mp3')) {
      const base = window.location.origin;
      url = `${base}/sounds/${sound}`;
    }
    if (window.AndroidAlarm && typeof window.AndroidAlarm.schedule === "function") {
      try {
        window.AndroidAlarm.schedule(time, url);
        setStatus("Alarm scheduled on device");
      } catch (_) {
        scheduleFallback();
      }
    } else {
      scheduleFallback();
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-semibold">Set Alarm</h2>
      <label className="block mt-4">Choose Time:</label>
      <input type="time" value={time} onChange={(e)=>setTime(e.target.value)} className="border p-2 w-full" />
      <label className="block mt-4">Choose Sound:</label>
      <select value={sound} onChange={(e)=>setSound(e.target.value)} className="border p-2 w-full">
        <option value="SYSTEM_ALARM">System Alarm</option>
        <option value="SYSTEM_NOTIFICATION">System Notification</option>
        <option value="SYSTEM_RINGTONE">System Ringtone</option>
        <option value="adhan.mp3">Adhan (site)</option>
        <option value="beep.mp3">Beep (site)</option>
        <option value="ringtone.mp3">Ringtone (site)</option>
      </select>
      <button onClick={setAlarm} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded">Set Alarm</button>
      {status && <div className="mt-2 text-sm">{status}</div>}
    </div>
  );
}
