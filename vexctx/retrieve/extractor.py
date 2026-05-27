import json
import httpx
from vexctx.config import settings
from vexctx.vault.models import ContextEvent

EXTRACTION_PROMPT = """Extract entities and relationships from this OS activity event.

Event type: {event_type}
Content: {content}
App: {source_app}

Return JSON:
{{
  "entities": [
    {{"label": "Arenex", "type": "project"}},
    {{"label": "main.py", "type": "file"}},
    {{"label": "FastAPI", "type": "technology"}}
  ],
  "relationships": [
    {{"from": "main.py", "to": "Arenex", "relation": "BELONGS_TO"}},
    {{"from": "main.py", "to": "FastAPI", "relation": "USES"}}
  ]
}}
Only return valid JSON. No explanation."""

class EntityExtractor:
    async def extract(self, event: ContextEvent) -> dict:
        prompt = EXTRACTION_PROMPT.format(
            event_type=event.event_type.value,
            content=event.content,
            source_app=event.source_app
        )
        
        payload = {
            "model": settings.VEXCTX_LLM_MODEL,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "format": "json",
            "stream": False
        }
        
        result = {"entities": [], "relationships": []}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/chat",
                    json=payload,
                    timeout=30.0
                )
                if response.status_code == 200:
                    data = response.json()
                    content_str = data.get("message", {}).get("content", "").strip()
                    if content_str:
                        parsed = json.loads(content_str)
                        if isinstance(parsed, dict):
                            entities = parsed.get("entities", [])
                            if isinstance(entities, list):
                                for ent in entities:
                                    if isinstance(ent, dict) and "label" in ent and "type" in ent:
                                        result["entities"].append({
                                            "label": str(ent["label"]),
                                            "type": str(ent["type"])
                                        })
                            relationships = parsed.get("relationships", [])
                            if isinstance(relationships, list):
                                for rel in relationships:
                                    if isinstance(rel, dict) and "from" in rel and "to" in rel and "relation" in rel:
                                        result["relationships"].append({
                                            "from": str(rel["from"]),
                                            "to": str(rel["to"]),
                                            "relation": str(rel["relation"])
                                        })
        except Exception as e:
            print(f"Ollama entity extraction failed: {e}. Returning empty list.")
            
        return result

extractor = EntityExtractor()
