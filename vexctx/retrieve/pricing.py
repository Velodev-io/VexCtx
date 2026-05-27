from fastapi import HTTPException
from vexctx.config import settings

async def verify_pro_plan():
    """
    Enforces internal plan gating. 
    Bypassed/Hold: Allows all users full access to retrieval intelligence (search, LLM) for free.
    """
    return True
