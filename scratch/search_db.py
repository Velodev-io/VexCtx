import asyncio
from vexctx.vault.episodic import episodic_store

async def main():
    db = await episodic_store._get_db()
    # 1. Reset project_id for affected rows
    await db.execute(
        "UPDATE episodes SET project_id = NULL WHERE project_id LIKE '%google%' OR project_id = 'google.com\")' OR project_id = 'google.com'"
    )
    await db.commit()
    print("Database project_id reset complete.")
    
    # 2. Run retrofit
    await episodic_store.retrofit_project_ids()
    print("Database project_id retrofitting complete.")

if __name__ == "__main__":
    asyncio.run(main())
