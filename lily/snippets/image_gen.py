"""
AI Image Generation with Prompt Enhancement

Uses Groq's LLM to expand short/slang prompts into detailed image generation
prompts, then sends them to Pollinations AI (Flux model) for rendering.

Example: "cat vibing" → "A relaxed tabby cat lounging on a windowsill,
golden hour sunlight streaming through, warm tones, high detail, cinematic, realistic"
"""

import discord
from discord.ext import commands
from discord import app_commands
import aiohttp
import io
import urllib.parse
import random
import os
from groq import AsyncGroq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
POLLINATIONS_URL = "https://image.pollinations.ai/prompt/{prompt}?width=1024&height=1024&nologo=true&seed={seed}&model=flux"


async def enhance_prompt(prompt: str, dark: bool = False) -> str:
    """
    Use AI to turn a short/slang prompt into a detailed image generation prompt.
    This dramatically improves Pollinations accuracy.
    """
    client = AsyncGroq(api_key=GROQ_API_KEY)
    style = (
        "dark gothic, dramatic lighting, cinematic, high contrast, blvck aesthetic"
        if dark
        else "high detail, cinematic, realistic"
    )

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an image prompt engineer. "
                        "Convert the user's short/slang description into a detailed, "
                        "accurate image generation prompt. Understand slang and informal language. "
                        "Be literal and specific about what should appear in the image. "
                        f"Always end with: {style}. "
                        "Reply with ONLY the enhanced prompt, nothing else."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=120,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip().strip('"').strip("'")
    except Exception:
        return prompt  # fallback to original if AI fails


async def generate_image(prompt: str, dark: bool = False) -> bytes | None:
    enhanced = await enhance_prompt(prompt, dark)
    encoded = urllib.parse.quote(enhanced)
    seed = random.randint(1, 999999)
    url = POLLINATIONS_URL.format(prompt=encoded, seed=seed)

    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=90)) as resp:
            if resp.status == 200:
                return await resp.read()
            return None


class ImageGen(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="imagine", description="generate an image from a prompt")
    @app_commands.describe(prompt="describe what you want")
    async def imagine(self, interaction: discord.Interaction, prompt: str):
        await interaction.response.defer()
        await interaction.followup.send(f"generating...\n> *{prompt}*")

        image_bytes = await generate_image(prompt)

        if image_bytes:
            file = discord.File(fp=io.BytesIO(image_bytes), filename="generated.png")
            await interaction.channel.send(
                content=f"here you go {interaction.user.mention}",
                file=file,
            )
        else:
            await interaction.channel.send("something went wrong, try again")

    @app_commands.command(name="imagine_dark", description="dark/gothic image generation")
    @app_commands.describe(prompt="describe the dark scene")
    async def imagine_dark(self, interaction: discord.Interaction, prompt: str):
        await interaction.response.defer()
        image_bytes = await generate_image(prompt, dark=True)

        if image_bytes:
            file = discord.File(fp=io.BytesIO(image_bytes), filename="dark.png")
            await interaction.channel.send(file=file)
        else:
            await interaction.channel.send("generation failed, try again")


async def setup(bot: commands.Bot):
    await bot.add_cog(ImageGen(bot))
