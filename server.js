import express from "express";
import { fileURLToPath } from "url";
import { dirname as pathDirname, join } from "path";
import { createClient } from "@supabase/supabase-js";
import { execSync, spawn } from "child_process";
import {
  mkdtempSync, writeFileSync, readFileSync, existsSync,
  unlinkSync, rmdirSync, createWriteStream,
} from "fs";
import { tmpdir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathDirname(__filename);

const app = express();
app.use(express.json({ limit: "50mb" }));
const PORT = process.env.PORT || 8080;

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

app.use(express.static(join(__dirname, "dist")));

// ── PDF merge endpoint ─────────────────────────────────────────────────────
app.post("/api/pdf/merge", async (req, res) => {
  const { images, job_id } = req.body || {};
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "images array required" });
  }

  let tmpDir = null;
  let pdfUrl = null;
  let error = null;
  try {
    tmpDir = mkdtempSync(join(tmpdir(), "gv-pdf-"));
    const imgFiles = [];

    for (let i = 0; i < images.length; i++) {
      const imgPath = join(tmpDir, `slide_${i}.jpg`);
      try {
        const resp = await fetch(images[i], { signal: AbortSignal.timeout(15000) });
        if (resp.ok) {
          writeFileSync(imgPath, Buffer.from(await resp.arrayBuffer()));
          imgFiles.push(imgPath);
        } else {
          console.error(`PDF merge: failed to fetch image ${i}, HTTP ${resp.status}`);
        }
      } catch (e) {
        console.error(`PDF merge: download error for image ${i}:`, e?.message);
      }
    }

    if (imgFiles.length === 0) {
      error = "Could not download any images";
    } else {
      const pdfPath = join(tmpDir, "output.pdf");

      // Build concat demuxer input for FFmpeg: image list as file
      // Each image gets its own page in the PDF
      try {
        const concatList = imgFiles.map(f => `file '${f}'\nduration 1`).join("\n");
        writeFileSync(join(tmpDir, "images.txt"), concatList + "\n", "utf-8");

        // Method 1: concat demuxer — best for multi-page PDF
        execSync(
          `ffmpeg -y -f concat -safe 0 -i images.txt -c:v mjpeg -q:v 3 -pix_fmt yuvj420p "${pdfPath}"`,
          { cwd: tmpDir, stdio: "pipe", timeout: 60000 }
        );
      } catch (e1) {
        console.error("PDF merge: concat method failed:", e1?.message);
        // Method 2: use -i for each image
        try {
          const inputs = imgFiles.map(f => `-i "${f}"`).join(" ");
          execSync(
            `ffmpeg -y ${inputs} -c:v mjpeg -q:v 3 "${pdfPath}"`,
            { cwd: tmpDir, stdio: "pipe", timeout: 60000 }
          );
        } catch (e2) {
          console.error("PDF merge: multi-input method failed:", e2?.message);
          // Method 3: pipe via image2pipe
          try {
            execSync(
              `cat ${imgFiles.map(f => `"${f}"`).join(" ")} | ffmpeg -y -f image2pipe -framerate 1 -i - -c:v mjpeg -q:v 3 "${pdfPath}"`,
              { cwd: tmpDir, stdio: "pipe", timeout: 60000, shell: true }
            );
          } catch (e3) {
            console.error("PDF merge: image2pipe method failed:", e3?.message);
          }
        }
      }

      if (!existsSync(pdfPath) || readFileSync(pdfPath).length < 200) {
        error = "FFmpeg PDF generation failed after all methods";
      } else {
        const pdfBuffer = readFileSync(pdfPath);
        const admin = getSupabase();
        if (admin) {
          const fileName = `video-output/pdf-${job_id || Date.now()}.pdf`;
          const { error: uploadErr } = await admin.storage
            .from("content-images")
            .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });
          if (uploadErr) {
            error = `Upload failed: ${uploadErr.message}`;
          } else {
            const { data: urlData } = admin.storage.from("content-images").getPublicUrl(fileName);
            pdfUrl = urlData?.publicUrl;
          }
        } else {
          error = "Supabase not configured";
        }
      }
    }
  } catch (err) {
    error = err?.message || "PDF merge error";
  } finally {
    if (tmpDir) try { execSync(`rm -rf "${tmpDir}"`); } catch {}
    console.log("PDF merge result:", { ok: !error, pdf_url: pdfUrl, error, pages: pdfUrl ? images.length : 0 });
    res.json({ ok: !error, pdf_url: pdfUrl, error, pages: pdfUrl ? images.length : 0 });
  }
});

// ── Video render endpoint ──────────────────────────────────────────────────
app.post("/api/video/render", async (req, res) => {
  const { job_id } = req.body || {};
  if (!job_id) return res.status(400).json({ error: "job_id required" });

  // Start render in background
  res.json({ ok: true, message: "render started" });

  fireAndForget(job_id);
});

async function fireAndForget(jobId) {
  let tmpDir = null;
  try {
    tmpDir = mkdtempSync(join(tmpdir(), "gv-video-"));
    const admin = getSupabase();
    if (!admin) return;

    // Load job
    const { data: job } = await admin
      .from("video_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    if (!job) return;

    const blueprint = typeof job.blueprint_json === "string"
      ? JSON.parse(job.blueprint_json)
      : job.blueprint_json;
    const scenes = blueprint?.scenes || [];
    if (!scenes.length) {
      await admin.from("video_generation_jobs").update({
        render_status: "failed",
        render_error: "no scenes in blueprint",
      }).eq("id", jobId);
      return;
    }

    const ratio = job.video_ratio || "9:16";
    const [w, h] = ratio.split(":").map(Number);
    const width = w > h ? 1920 : 1080;
    const height = w > h ? 1080 : 1920;
    const fps = 30;

    await updateJob(admin, jobId, "assets", 25);

    // ── 1. Fetch stock footage ──────────────────────────────────────────
    const stockQueries = scenes
      .filter((s) => s.visual_type === "stock")
      .map((s) => s.visual_query)
      .filter(Boolean);

    let stockResults = [];
    if (stockQueries.length) {
      try {
        const authRes = await admin.auth.admin.getUserById(job.user_id);
        const token = authRes?.data?.user?.aud || "";
        const stockResp = await fetch(
          `${SUPABASE_URL}/functions/v1/video-stock-fetch`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({ queries: stockQueries }),
          }
        );
        if (stockResp.ok) {
          const stockData = await stockResp.json();
          stockResults = stockData?.results || [];
        }
      } catch (_) {}
    }

    await updateJob(admin, jobId, "assets", 35);

    // ── 2. Generate AI images for ai_image scenes ──────────────────────
    const aiImageScenes = scenes.filter((s) => s.visual_type === "ai_image");
    for (const scene of aiImageScenes) {
      try {
        const imgResp = await fetch(
          `${SUPABASE_URL}/functions/v1/ai-generate-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({
              prompt: scene.visual_query || scene.script,
              aspect_ratio: ratio,
              business_id: job.business_id,
            }),
          }
        );
        if (imgResp.ok) {
          const imgData = await imgResp.json();
          scene._generated_image_url = imgData?.image_url || null;
        }
      } catch (_) {}
    }

    await updateJob(admin, jobId, "voice", 50);

    // ── 3. Generate TTS audio ──────────────────────────────────────────
    let ttsUrl = null;
    const fullScript = scenes.map((s) => s.script).filter(Boolean).join(". ");
    if (fullScript.trim()) {
      try {
        const ttsResp = await fetch(
          `${SUPABASE_URL}/functions/v1/video-tts-generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
            body: JSON.stringify({
              text: fullScript,
              voice_type: job.voice_type || "female_warm",
              job_id: jobId,
            }),
          }
        );
        if (ttsResp.ok) {
          const ttsData = await ttsResp.json();
          ttsUrl = ttsData?.audio_url || null;
        }
      } catch (_) {}
    }

    await updateJob(admin, jobId, "rendering", 65);

    // ── 4. Download all assets ─────────────────────────────────────────
    const assetFiles = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const assetPath = join(tmpDir, `scene_${i}.mp4`);
      let downloaded = false;

      if (scene.visual_type === "stock") {
        const stock = stockResults.find((r) => r.query === scene.visual_query);
        const url = stock?.video_url || stock?.image_url;
        if (url) {
          try {
            await downloadFile(url, assetPath);
            if (existsSync(assetPath) && readFileSync(assetPath).length > 100) {
              downloaded = true;
            } else {
              unlinkSync(assetPath);
            }
          } catch {}
        }
      } else if (scene.visual_type === "ai_image") {
        const url = scene._generated_image_url;
        if (url) {
          const imgPath = join(tmpDir, `scene_${i}.jpg`);
          try {
            await downloadFile(url, imgPath);
            if (existsSync(imgPath) && readFileSync(imgPath).length > 100) {
              downloaded = true;
            }
          } catch {}
        }
      }

      if (!downloaded) {
        // Generate a fallback colored frame
        const bg = i % 2 === 0 ? "#1a1a2e" : "#16213e";
        genFallbackFrame(join(tmpDir, `scene_${i}.jpg`), width, height, bg, scene.script || `Scene ${i + 1}`);
      }

      // Convert to video segment with correct duration
      const duration = Math.max(2, scene.duration || 5);
      const segPath = join(tmpDir, `seg_${i}.mp4`);
      assetToSegment(assetPath, segPath, width, height, fps, duration);
      assetFiles.push(`file 'seg_${i}.mp4'`);
    }

    await updateJob(admin, jobId, "rendering", 80);

    // ── 5. Generate captions SRT ───────────────────────────────────────
    let srtContent = "";
    try {
      const capResp = await fetch(
        `${SUPABASE_URL}/functions/v1/video-captions-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            scenes: scenes.map((s) => ({
              scene_number: s.scene_number,
              script: s.script,
              duration: Math.max(2, s.duration || 5),
              caption_style: s.caption_style || job.subtitle_style,
            })),
            subtitle_style: job.subtitle_style || "standard",
          }),
        }
      );
      if (capResp.ok) {
        const capData = await capResp.json();
        srtContent = capData?.srt || "";
      }
    } catch (_) {}

    if (srtContent) {
      writeFileSync(join(tmpDir, "captions.srt"), srtContent, "utf-8");
    }

    // ── 6. Concatenate video segments ──────────────────────────────────
    writeFileSync(join(tmpDir, "concat.txt"), assetFiles.join("\n") + "\n", "utf-8");

    const mergedPath = join(tmpDir, "merged.mp4");
    try {
      execSync(
        `ffmpeg -y -f concat -safe 0 -i concat.txt -c copy "${mergedPath}"`,
        { cwd: tmpDir, stdio: "pipe", timeout: 120000 }
      );
    } catch {
      // Fallback: re-encode all segments
      try {
        execSync(
          `ffmpeg -y -f concat -safe 0 -i concat.txt -c:v libx264 -preset fast -crf 23 -c:a aac "${mergedPath}"`,
          { cwd: tmpDir, stdio: "pipe", timeout: 180000 }
        );
      } catch {}
    }

    if (!existsSync(mergedPath)) {
      throw new Error("FFmpeg concatenation failed");
    }

    await updateJob(admin, jobId, "rendering", 90);

    // ── 7. Add audio + captions ────────────────────────────────────────
    let ttsFilePath = null;
    if (ttsUrl) {
      ttsFilePath = join(tmpDir, "tts.mp3");
      try {
        await downloadFile(ttsUrl, ttsFilePath);
      } catch {
        ttsFilePath = null;
      }
    }

    const outputPath = join(tmpDir, "final.mp4");
    const capFile = join(tmpDir, "captions.srt");
    const hasCaptions = existsSync(capFile) && readFileSync(capFile).length > 10;

    let cmd = `ffmpeg -y -i "${mergedPath}"`;
    if (ttsFilePath && existsSync(ttsFilePath)) {
      cmd += ` -i "${ttsFilePath}"`;
    }

    const vf = [];
    if (hasCaptions) {
      vf.push(`subtitles=captions.srt:force_style='FontName=DejaVuSans-Bold,FontSize=${height > 1800 ? 28 : 18},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=${Math.floor(height * 0.08)}'`);
    }

    const audioMap = ttsFilePath && existsSync(ttsFilePath) ? "-map 0:v -map 1:a" : "-map 0:v";

    cmd += ` ${audioMap}`;
    if (vf.length) cmd += ` -vf "${vf.join(",")}"`;
    cmd += ` -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -pix_fmt yuv420p "${outputPath}"`;

    try {
      execSync(cmd, { cwd: tmpDir, stdio: "pipe", timeout: 300000 });
    } catch {
      // Fallback without captions
      const fallbackCmd = `ffmpeg -y -i "${mergedPath}"${ttsFilePath && existsSync(ttsFilePath) ? ` -i "${ttsFilePath}"` : ""} -map 0:v${ttsFilePath && existsSync(ttsFilePath) ? " -map 1:a" : ""} -c:v libx264 -preset fast -crf 23 -c:a aac -shortest -pix_fmt yuv420p "${outputPath}"`;
      try {
        execSync(fallbackCmd, { cwd: tmpDir, stdio: "pipe", timeout: 300000 });
      } catch {}
    }

    if (!existsSync(outputPath)) {
      throw new Error("FFmpeg render failed");
    }

    // ── 8. Upload to storage ───────────────────────────────────────────
    const finalBuffer = readFileSync(outputPath);
    const fileName = `video-output/${jobId}.mp4`;

    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.id === "content-images")) {
      await admin.storage.createBucket("content-images", { public: true });
    }

    const { error: uploadErr } = await admin.storage
      .from("content-images")
      .upload(fileName, finalBuffer, {
        contentType: "video/mp4",
        upsert: true,
        cacheControl: "public, max-age=31536000",
      });

    if (uploadErr) throw new Error(`upload: ${uploadErr.message}`);

    const { data: urlData } = admin.storage.from("content-images").getPublicUrl(fileName);
    const outputUrl = urlData?.publicUrl;

    // Generate a small thumbnail from the middle frame
    let thumbUrl = null;
    const thumbPath = join(tmpDir, "thumb.jpg");
    try {
      execSync(
        `ffmpeg -y -i "${outputPath}" -ss 00:00:02 -vframes 1 -vf "scale=${Math.floor(width / 4)}:-1" "${thumbPath}"`,
        { stdio: "pipe", timeout: 15000 }
      );
      if (existsSync(thumbPath)) {
        const thumbBuffer = readFileSync(thumbPath);
        const thumbName = `video-output/${jobId}_thumb.jpg`;
        await admin.storage.from("content-images").upload(thumbName, thumbBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });
        const { data: td } = admin.storage.from("content-images").getPublicUrl(thumbName);
        thumbUrl = td?.publicUrl;
      }
    } catch {}

    // ── 9. Update job to completed ─────────────────────────────────────
    await admin.from("video_generation_jobs").update({
      render_status: "completed",
      render_progress: 100,
      output_url: outputUrl,
      thumbnail_url: thumbUrl,
    }).eq("id", jobId);

  } catch (err) {
    try {
      const admin = getSupabase();
      if (admin) await admin.from("video_generation_jobs").update({
        render_status: "failed",
        render_error: err?.message || "render error",
      }).eq("id", jobId);
    } catch {}
  } finally {
    if (tmpDir) {
      try { execSync(`rm -rf "${tmpDir}"`); } catch {}
    }
  }
}

// ── FFmpeg helper functions ────────────────────────────────────────────────
function genFallbackFrame(filePath, w, h, bg, text) {
  // Generate a simple colored frame with ffmpeg drawtext
  try {
    execSync(
      `ffmpeg -y -f lavfi -i "color=c=${bg}:s=${w}x${h}:d=1" -vf "drawtext=text='${text.replace(/'/g, "'\\\\''")}':fontcolor=white:fontsize=${Math.floor(h * 0.05)}:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" -frames:v 1 "${filePath}"`,
      { stdio: "pipe", timeout: 30000 }
    );
  } catch {
    // Absolute fallback: just solid color
    execSync(
      `ffmpeg -y -f lavfi -i "color=c=${bg}:s=${w}x${h}:d=1" -frames:v 1 "${filePath}"`,
      { stdio: "pipe", timeout: 20000 }
    );
  }
}

function assetToSegment(inputPath, outputPath, w, h, fps, duration) {
  if (inputPath.endsWith(".mp4") && existsSync(inputPath)) {
    // Already a video - trim to duration
    try {
      execSync(
        `ffmpeg -y -i "${inputPath}" -t ${duration} -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset fast -crf 23 -r ${fps} -an "${outputPath}"`,
        { stdio: "pipe", timeout: 60000 }
      );
      return;
    } catch {}
  }

  // Treat as image (jpg/png) - create video loop
  const imgPath = inputPath.endsWith(".mp4") ? null : inputPath;
  if (imgPath && existsSync(imgPath)) {
    try {
      execSync(
        `ffmpeg -y -loop 1 -i "${imgPath}" -t ${duration} -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset fast -crf 23 -r ${fps} -pix_fmt yuv420p "${outputPath}"`,
        { stdio: "pipe", timeout: 60000 }
      );
      return;
    } catch {}
  }

  // Ultimate fallback: use the fallback frame
  const fallbackImg = join(pathDirname(inputPath), `scene_${Math.random()}.jpg`);
  genFallbackFrame(fallbackImg, w, h, "#1a1a2e", "Loading...");
  try {
    execSync(
      `ffmpeg -y -loop 1 -i "${fallbackImg}" -t ${duration} -vf "scale=${w}:${h}" -c:v libx264 -preset fast -crf 23 -r ${fps} -pix_fmt yuv420p "${outputPath}"`,
      { stdio: "pipe", timeout: 60000 }
    );
  } catch {}
  try { unlinkSync(fallbackImg); } catch {}
}

async function downloadFile(url, destPath) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  writeFileSync(destPath, buffer);
}

async function updateJob(admin, jobId, status, progress) {
  const patch = { render_status: status, render_progress: progress };
  if (status === "rendering" || status === "failed") {
    patch.updated_at = new Date().toISOString();
  }
  await admin.from("video_generation_jobs").update(patch).eq("id", jobId);
}

// ── Poll for pending video jobs ─────────────────────────────────────────────
setInterval(async () => {
  const admin = getSupabase();
  if (!admin) return;
  try {
    const { data: pendingJobs } = await admin
      .from("video_generation_jobs")
      .select("id")
      .eq("render_status", "pending")
      .limit(3);

    if (pendingJobs?.length) {
      for (const job of pendingJobs) {
        await admin.from("video_generation_jobs").update({
          render_status: "queued",
          render_progress: 15,
        }).eq("id", job.id);
        fireAndForget(job.id);
      }
    }
  } catch (_) {}
}, 15000);

// ── Admin setup endpoint (one-shot: add admin role by email) ──────────────
app.post("/api/admin/setup", async (req, res) => {
  const { email, secret, list, test } = req.body || {};
  if (secret !== "growvix-admin-2026") return res.status(403).json({ error: "Invalid secret" });
  const admin = getSupabase();
  if (!admin) return res.status(500).json({ error: "Supabase not configured" });
  try {
    if (test) {
      const { data: userList, error: listErr } = await admin.auth.admin.listUsers();
      // Check which tables exist
      const tableNames = ["user_roles", "businesses", "content_posts", "video_generation_jobs", "social_accounts", "analytics", "admin_logs", "brands", "razorpay_plans", "subscriptions"];
      const tableResults = {};
      for (const t of tableNames) {
        try {
          const { data, error } = await admin.from(t).select("*").limit(1);
          tableResults[t] = error ? error.message : `ok (${data?.length || 0} rows)`;
        } catch (e) { tableResults[t] = e?.message; }
      }
      return res.json({
        ok: true, listUsersError: listErr?.message || null, totalUsers: userList?.users?.length || 0,
        users: (userList?.users || []).map((u) => ({ id: u.id, email: u.email })),
        tables: tableResults,
      });
    }
    if (list) {
      const { data: userList } = await admin.auth.admin.listUsers();
      const users = (userList?.users || []).map((u) => ({ id: u.id, email: u.email, created_at: u.created_at }));
      return res.json({ ok: true, count: users.length, users });
    }
    if (!email) return res.status(400).json({ error: "email required" });
    const { data: userList } = await admin.auth.admin.listUsers();
    const found = (userList?.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) return res.status(404).json({ error: `User ${email} not found` });
    await admin.from("user_roles")
      .upsert({ user_id: found.id, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    console.log(`Admin role added to ${email} (${found.id})`);
    res.json({ ok: true, user_id: found.id, email });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Setup failed" });
  }
});

// ── Legacy SPA fallback ────────────────────────────────────────────────────
app.get("*", (_, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Growvix running on port ${PORT}`);
});
