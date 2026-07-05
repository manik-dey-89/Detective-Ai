
import os
from dotenv import load_dotenv
import asyncio
import cognee

# Load environment variables
load_dotenv()

async def test_cognee():
    print("🧪 Testing Cognee Python SDK...")
    
    api_key = os.getenv("COGNEE_API_KEY")
    base_url = os.getenv("COGNEE_BASE_URL")
    tenant_id = os.getenv("COGNEE_TENANT_ID")
    
    print(f"🔧 Using config:")
    print(f"  - API Key: {api_key[:10]}...")
    print(f"  - Base URL: {base_url}")
    print(f"  - Tenant ID: {tenant_id}")
    
    try:
        # Serve the Cognee client
        print("📡 Connecting to Cognee Cloud...")
        await cognee.serve(
            url=base_url,
            api_key=api_key,
            tenant_id=tenant_id
        )
        print("✅ Connected to Cognee Cloud!")
        
        # Test remembering something
        test_data = {
            "message": "This is a test memory from Python SDK!",
            "details": {
                "timestamp": "2026-07-04T14:00:00Z",
                "test_id": "python-test-001"
            }
        }
        
        print("💾 Remembering test data...")
        memory_id = await cognee.remember(
            data=test_data,
            dataset_name="detective-ai-test-brain-python"
        )
        print(f"✅ Remembered with ID: {memory_id}")
        
        # Test recalling
        print("🔍 Recalling memories...")
        results = await cognee.recall(
            query="test",
            datasets=["detective-ai-test-brain-python"]
        )
        print(f"✅ Recalled {len(results)} results!")
        for i, res in enumerate(results):
            print(f"  Result {i+1}: {res}")
            
        print("🎉 All tests passed!")
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        print("Stack trace:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_cognee())

