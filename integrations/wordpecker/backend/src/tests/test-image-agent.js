// Test script for image generation agent structured output
const { run } = require('@openai/agents');
const { imageGenerationAgent, configureOpenAIAgents } = require('../../dist/agents');

async function testImageAgent() {
  // Configure OpenAI agents
  configureOpenAIAgents();
  
  console.log('🧪 Testing Image Generation Agent with Structured Output\n');
  
  // Test 1: AI Image Generation
  console.log('📝 Test 1: AI Image Generation');
  console.log('Input: "Generate an AI image for the context \'cooking in kitchen\'"');
  
  try {
    const aiResult = await run(imageGenerationAgent, 'Generate an AI image for the context "cooking in kitchen"');
    console.log('✅ AI Image Result:');
    console.log(JSON.stringify(aiResult.finalOutput, null, 2));
  } catch (error) {
    console.log('❌ AI Image Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Stock Image Search
  console.log('📝 Test 2: Stock Image Search');
  console.log('Input: "Find a stock image for the context \'business meeting\'"');
  
  try {
    const stockResult = await run(imageGenerationAgent, 'Find a stock image for the context "business meeting"');
    console.log('✅ Stock Image Result:');
    console.log(JSON.stringify(stockResult.finalOutput, null, 2));
  } catch (error) {
    console.log('❌ Stock Image Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Error Handling (invalid context)
  console.log('📝 Test 3: Error Handling');
  console.log('Input: "Generate an image for invalid context with no API keys"');
  
  try {
    // Temporarily disable API key to test error handling
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'invalid-key';
    
    const errorResult = await run(imageGenerationAgent, 'Generate an AI image for the context "test error"');
    console.log('✅ Error Handling Result:');
    console.log(JSON.stringify(errorResult.finalOutput, null, 2));
    
    // Restore API key
    process.env.OPENAI_API_KEY = originalKey;
  } catch (error) {
    console.log('❌ Error Test Failed:', error.message);
  }
  
  console.log('\n🎉 Image Generation Agent Test Complete!');
  console.log('✨ All responses should now have consistent structure with:');
  console.log('   - id, url, alt_description, description, prompt, source');
  console.log('   - success: boolean');
  console.log('   - error: string | null');
}

// Run the test
testImageAgent().catch(console.error); 