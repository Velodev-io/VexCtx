import httpx
from vexctx.config import settings
from vexctx.retrieve.models import RetrievalChunk

class Summarizer:
    async def summarize_chunks(self, query: str, chunks: list[RetrievalChunk]) -> str:
        """
        Summarize a list of retrieval chunks matching a specific query.
        Falls back to a structural metadata summary if the Ollama endpoint is offline.
        """
        if not chunks:
            return "No context chunks available to summarize."

        # Compile the prompt
        context_str = ""
        for i, c in enumerate(chunks):
            context_str += f"--- Chunk {i+1} (Type: {c.chunk_type}) ---\n{c.fts_text}\n"

        prompt = f"""You are a personal work context summarizer.
Below is a list of encrypted, retrieved history chunks of the user's AI-assisted activities.
Summarize what the user was working on and what decisions or commands were executed, specifically addressing this query: "{query}"

Context:
{context_str}

Please keep the summary concise, structured, and focused on concrete details (commands run, files edited, errors encountered).
"""

        # Try to call Ollama
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": settings.VEXCTX_SUMMARY_MODEL,
                        "prompt": prompt,
                        "stream": False
                    },
                    timeout=15.0
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("response", "").strip()
            except Exception as e:
                # Log or print error, fallback to mock summary
                print(f"Ollama summarization call failed: {e}. Falling back to structural summary.")

        # Graceful fallback summary
        summary_lines = [
            f"[Local Fallback Summary for query: '{query}']",
            f"Analyzed {len(chunks)} history chunks spanning {chunks[0].time_range_start.date()} to {chunks[-1].time_range_end.date()}.",
            "Activities captured include:"
        ]
        
        apps_involved = set()
        total_events = 0
        projects_involved = set()
        
        for c in chunks:
            total_events += c.metadata.get("event_count", 1)
            for app in c.metadata.get("apps", []):
                apps_involved.add(app)
            for proj in c.metadata.get("projects", []):
                projects_involved.add(proj)

        summary_lines.append(f"- Apps active: {', '.join(apps_involved) if apps_involved else 'unknown'}")
        summary_lines.append(f"- Projects active: {', '.join(projects_involved) if projects_involved else 'unknown'}")
        summary_lines.append(f"- Total raw events merged: {total_events}")
        summary_lines.append("\nExcerpt of raw context:")
        
        # Add a snippet of the first chunk
        excerpt = chunks[0].fts_text[:300] + "..." if len(chunks[0].fts_text) > 300 else chunks[0].fts_text
        summary_lines.append(excerpt)

        return "\n".join(summary_lines)

summarizer = Summarizer()
