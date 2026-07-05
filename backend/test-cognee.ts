import { cogneeClient } from './src/config/cognee';

async function test() {
  console.log('🧪 Testing Cognee integration...');
  const TEST_BRAIN_ID = 'test-brain-789';

  try {
    // Test 1: Store a test memory
    console.log('1️⃣ Storing test memory...');
    const storedMemory = await cogneeClient.remember({
      playerId: 'test-player-123',
      brainId: TEST_BRAIN_ID,
      type: 'test',
      content: {
        message: 'This is a test memory for Cognee integration!',
        details: { timestamp: new Date().toISOString(), testId: 'test-001' }
      },
      caseId: 'test-case-456',
      importance: 10,
      tags: ['test', 'integration', 'cognee']
    });
    console.log('✅ Memory stored:', JSON.stringify(storedMemory, null, 2));

    // Test 2: Recall the memory
    console.log('2️⃣ Recalling test memory...');
    const recalledMemories = await cogneeClient.recall({
      playerId: 'test-player-123',
      brainId: TEST_BRAIN_ID,
      keywords: ['test'],
      limit: 5
    });
    console.log('✅ Memories recalled:', JSON.stringify(recalledMemories, null, 2));

    console.log('🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error && (error as any).response) {
      console.error('Response data:', (error as any).response.data);
      console.error('Response status:', (error as any).response.status);
    }
  }
}

test();
