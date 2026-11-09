"""
Voice Channel AI — Speech-to-Text + Text-to-Speech

Lily joins voice channels, listens to users via Whisper (Groq STT),
generates AI responses, and speaks back using Edge TTS.

Key challenges solved:
  - Whisper hallucination filtering (common false positives like
    "thanks for watching", single words, etc.)
  - Async audio pipeline: record → transcribe → LLM → TTS → play
  - Graceful handling of concurrent speakers and disconnections
"""

import discord
from discord.ext import commands
from discord import app_commands
from discord.ext import voice_recv
import edge_tts
import asyncio
import tempfile
import os
import io
import struct
from groq import AsyncGroq

LILY_VOICE = "en-US-AriaNeural"

# Common Whisper hallucinations to drop silently
HALLUCINATIONS = {
    "thank you", "thanks", "thanks for watching", ".", " ", "you", "i",
    "bye", "goodbye", "see you", "see you next time", "the", "a", "um",
    "uh", "i'm going to go", "it then", "okay", "ok",
}


async def speak_in_vc(guild: discord.Guild, text: str):
    """Synthesize text to speech and play it in the voice channel."""
    vc = guild.voice_client
    if not vc or not vc.is_connected():
        return

    # Strip emoji and markdown for cleaner TTS
    clean = (
        text.replace("*", "").replace("_", "")
            .replace("`", "").strip()
    )
    if not clean:
        return

    try:
        communicate = edge_tts.Communicate(clean, LILY_VOICE)
        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tmp_path = tmp.name
        tmp.close()

        await communicate.save(tmp_path)

        # Wait for current audio to finish
        while vc.is_playing():
            await asyncio.sleep(0.3)

        source = discord.FFmpegPCMAudio(tmp_path)
        vc.play(source, after=lambda e: os.unlink(tmp_path))
    except Exception as e:
        print(f"[TTS error] {e}")


class Voice(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.groq = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        self.listening = {}      # guild_id → bool
        self.audio_buffers = {}  # user_id → [pcm_bytes]

    @app_commands.command(name="join", description="join your voice channel")
    async def join(self, interaction: discord.Interaction):
        if not interaction.user.voice:
            return await interaction.response.send_message("join a vc first")

        channel = interaction.user.voice.channel
        await interaction.response.defer()

        vc = await channel.connect(cls=voice_recv.VoiceRecvClient)

        # Start listening to all users
        def on_packet(user, data):
            if user and not user.bot:
                uid = user.id
                if uid not in self.audio_buffers:
                    self.audio_buffers[uid] = []
                self.audio_buffers[uid].append(data.pcm)

        vc.listen(voice_recv.BasicSink(on_packet))
        self.listening[interaction.guild_id] = True

        await interaction.followup.send(f"joined {channel.mention}")

        # Start processing loop
        asyncio.create_task(self._process_audio_loop(interaction.guild))

    async def _process_audio_loop(self, guild: discord.Guild):
        """Process accumulated audio buffers into STT → LLM → TTS."""
        while self.listening.get(guild.id, False):
            await asyncio.sleep(3)  # collect audio in 3-second windows

            for uid, chunks in list(self.audio_buffers.items()):
                if len(chunks) < 10:
                    continue  # not enough audio

                pcm = b"".join(chunks)
                self.audio_buffers[uid] = []

                # Transcribe with Whisper
                text = await self._transcribe(pcm)
                if not text or text.lower().strip() in HALLUCINATIONS:
                    continue

                # Generate AI response
                response = await self._generate_response(text)
                if response:
                    await speak_in_vc(guild, response)

    async def _transcribe(self, pcm_data: bytes) -> str | None:
        """Send PCM audio to Groq Whisper for transcription."""
        # Convert raw PCM to WAV format
        wav_buffer = io.BytesIO()
        # ... WAV header construction ...
        wav_buffer.write(pcm_data)
        wav_buffer.seek(0)

        try:
            result = await self.groq.audio.transcriptions.create(
                file=("audio.wav", wav_buffer, "audio/wav"),
                model="whisper-large-v3",
            )
            return result.text.strip() if result.text else None
        except Exception:
            return None

    async def _generate_response(self, user_text: str) -> str | None:
        """Generate an AI response to what the user said."""
        try:
            response = await self.groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are Lily. Keep responses short (1-2 sentences) since they'll be spoken aloud."},
                    {"role": "user", "content": user_text},
                ],
                max_tokens=100,
            )
            return response.choices[0].message.content
        except Exception:
            return None

    @app_commands.command(name="leave", description="leave the voice channel")
    async def leave(self, interaction: discord.Interaction):
        self.listening[interaction.guild_id] = False
        if interaction.guild.voice_client:
            await interaction.guild.voice_client.disconnect()
        await interaction.response.send_message("left the vc")


async def setup(bot: commands.Bot):
    await bot.add_cog(Voice(bot))
