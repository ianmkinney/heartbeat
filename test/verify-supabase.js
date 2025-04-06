// This script verifies that the Supabase setup is working correctly
// Run with: node test/verify-supabase.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Supabase URL and anon key must be provided in .env file');
  process.exit(1);
}

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('🧪 Starting Supabase verification tests...');
  console.log('Using Supabase URL:', supabaseUrl);

  try {
    // Test 1: Check connection by trying to access the heartbeat_users table
    console.log('\n🔍 Test 1: Checking connection to Supabase...');
    const { data, error } = await supabase
      .from('heartbeat_users')
      .select('*', { count: 'exact', head: true });

    if (error && error.code === 'PGRST116') {
      console.log('✅ Successfully connected to Supabase (but heartbeat_users table does not exist yet)');
    } else if (error) {
      console.error('❌ Connection error:', error.message);
      process.exit(1);
    } else {
      console.log('✅ Successfully connected to Supabase');
    }
    
    // Test 2: Creating test data
    console.log('\n🔍 Test 2: Creating test data and verifying tables...');
    
    // Create a test pulse
    console.log('  Creating a test pulse...');
    const testPulseId = `test_pulse_${Date.now()}`;
    const { data: newPulse, error: createError } = await supabase
      .from('pulses')
      .insert({
        id: testPulseId,
        user_id: 1,
        emails: ['test@example.com'],
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError && createError.code !== 'PGRST116') {
      console.error('❌ Failed to create test pulse:', createError.message);
    } else if (createError && createError.code === 'PGRST116') {
      console.error('❌ The pulses table does not exist. Please run the schema setup script.');
    } else {
      console.log('✅ Test pulse created successfully:', newPulse.id);
      
      // Add a test response
      console.log('  Adding a test response...');
      const { data: newResponse, error: responseError } = await supabase
        .from('responses')
        .insert({
          pulse_id: testPulseId,
          response: 'This is a test response',
          timestamp: new Date().toISOString(),
          respondent_id: 'test_user'
        })
        .select()
        .single();

      if (responseError && responseError.code !== 'PGRST116') {
        console.error('❌ Failed to add test response:', responseError.message);
      } else if (responseError && responseError.code === 'PGRST116') {
        console.error('❌ The responses table does not exist. Please run the schema setup script.');
      } else {
        console.log('✅ Test response added successfully');
        
        // Retrieve responses
        console.log('  Retrieving responses...');
        const { data: responses, error: fetchError } = await supabase
          .from('responses')
          .select('*')
          .eq('pulse_id', testPulseId);

        if (fetchError) {
          console.error('❌ Failed to retrieve responses:', fetchError.message);
        } else {
          console.log(`✅ Retrieved ${responses.length} responses`);
          
          // Update pulse response count
          console.log('  Updating pulse response count...');
          const { data: updatedPulse, error: updateError } = await supabase
            .from('pulses')
            .update({
              response_count: responses.length,
              last_checked: new Date().toISOString()
            })
            .eq('id', testPulseId)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Failed to update pulse:', updateError.message);
          } else {
            console.log('✅ Pulse updated successfully');
          }
        }
      }
    }

    console.log('\n✅ Test completed');
    console.log('\nNext steps:');
    console.log('1. Make sure to run the schema setup script if any tables are missing');
    console.log('2. Run the application with: npm run dev');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
    process.exit(1);
  }
}

runTests(); 