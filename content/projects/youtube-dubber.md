---
id: youtube-dubber
type: project
title: YouTube Dubber
subtitle: Speech pipeline, Chinese to Vietnamese
period: Oct 2026 – Nov 2026
tagline: "ASR → LLM → TTS pipeline"
summary: "A speech pipeline that turns a Chinese YouTube video into an MP4 with a Vietnamese voice-over: Whisper speech recognition, LLM translation with a review pass, Vietnamese text-to-speech and an ffmpeg mux, all from one link on a local web page."
order: 7
stack: [Python, faster-whisper, VieNeu TTS, Groq, Gemini, Ollama, ffmpeg, yt-dlp, GitHub Actions]
skills: [python, speech-ai, llm, prompt-engineering, evaluation, ffmpeg, testing, github-actions]
links:
  repo: https://github.com/xuannhi-tran/youtube-video-dubber
figure:
  id: fig-dubber
  idea: "Press Make video to replay a job through its five stages."
  disclaimer: "Log trimmed from real output; 37 min 50 s is a real run."
---

# YouTube Dubber: a Chinese to Vietnamese speech pipeline

## Problem

<!-- Draft by Claude: Nhi, check it's true and reword in your own voice. -->

I wanted to watch Chinese knowledge videos without reading subtitles the whole time. So I built a pipeline that takes a YouTube link and gives back the same video with a Vietnamese voice-over, and optionally Vietnamese subtitles under the picture.

## What I built

- A **five-stage speech pipeline**: download (yt-dlp, ffmpeg) → transcribe with **faster-whisper large-v3** on the GPU and translate with an **LLM** → shorten and read the lines with **VieNeu v3 Turbo** Vietnamese TTS → place the clips on the original timeline → **ffmpeg** mux into the final MP4. The speech stage starts while translation is still running.
- **Translation with context**: one LLM call first reads the whole transcript and writes a video brief (summary, speaker, term sheet, and fixes for words Whisper misheard), then the transcript is translated in windows of about 20 seconds with a glossary for names. An optional second model reviews the draft and returns only the lines to change.
- **Timing**: Vietnamese is longer than Chinese, so a line that won't fit its time slot is shortened by the LLM before it is read. The assembler lets the dub drift up to 3 s and speeds up to at most 1.3x, and brings every clip to -20 dBFS.
- **Resumable jobs**: each video gets its own job folder and every finished stage is cached, so a run stopped by a quota limit, a crash or Ctrl+C continues where it stopped. Groq, Gemini or a local Ollama / LM Studio model can be used, with a fallback model when a daily quota runs out.
- **Private by design**: speech recognition and the voice run on the computer; only the translation text is sent to an LLM. A local web page (127.0.0.1 only, with Host/Origin checks) runs jobs, shows progress and plays the result.
- **Checks in CI**: every module has built-in checks that need no GPU, keys or network, and GitHub Actions runs them on Windows on every push and pull request.

## Results

- Link in, dubbed MP4 out: one full run took **37 min 50 s** from pasting the link to the finished video, with every stage done in one go.
- Measured instead of guessed: a translation eval scores output against hand-corrected lines (chrF). Giving the translator a per-passage time budget made the text 7% shorter but dropped details, so it stays off and line-by-line shortening handles timing.
- Reading on the GPU is about **12 times faster** per sentence than on the CPU (RTX 4060 Laptop). Batching saved only about 25 seconds on an 8-minute video, because the speech stage mostly waits for the shortening LLM.

## What I learned

<!-- TODO(Nhi) -->
