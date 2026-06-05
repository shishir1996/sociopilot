import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Scene {
  scene_number: number;
  script: string;
  duration: number;
  caption_style?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { scenes, subtitle_style }: { scenes: Scene[]; subtitle_style?: string } = body;
    if (!scenes?.length) return ok({ ok: false, error: "scenes required" });

    let cueIndex = 1;
    let currentTime = 0;
    const srtLines: string[] = [];

    // Word-level captioning for hormozi style
    const isHormozi = (subtitle_style || "hormozi") === "hormozi";

    for (const scene of scenes) {
      const words = scene.script.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        currentTime += scene.duration;
        continue;
      }

      if (isHormozi) {
        // Hormozi style: one word at a time, ~200ms per word
        const wordDuration = Math.max(0.2, scene.duration / words.length);
        for (const word of words) {
          const start = currentTime;
          const end = start + wordDuration;
          srtLines.push(formatSrtLine(cueIndex++, start, end, word));
          currentTime = end;
        }
        // Add padding to fill remaining scene time
        const remainingTime = currentTime < (scenes.slice(0, scenes.indexOf(scene)).reduce((a, s) => a + s.duration, 0) + scene.duration)
          ? (scenes.slice(0, scenes.indexOf(scene)).reduce((a, _) => a, 0) + scene.duration) - currentTime
          : 0;
        if (remainingTime > 0.1) {
          currentTime += remainingTime;
        }
      } else {
        // Standard: full line per scene
        const end = currentTime + scene.duration;
        srtLines.push(formatSrtLine(cueIndex++, currentTime, end, scene.script));
        currentTime = end;
      }
    }

    const srt = srtLines.join("\n\n") + "\n";

    // Also generate VTT
    const vtt = "WEBVTT\n\n" + srt
      .replace(/(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n/g, "$1\n$2 --> $3\n");

    return ok({ ok: true, srt, vtt, total_duration_sec: currentTime });
  } catch (e: any) {
    return ok({ ok: false, error: e?.message ?? "unknown" });
  }
});

function formatSrtLine(index: number, startSec: number, endSec: number, text: string): string {
  return `${index}\n${toSrtTime(startSec)} --> ${toSrtTime(endSec)}\n${text}`;
}

function toSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(ms)}`;
}

function pad(n: number): string { return String(n).padStart(2, "0"); }
function pad3(n: number): string { return String(n).padStart(3, "0"); }
