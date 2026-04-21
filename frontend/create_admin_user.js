// =====================================================
// CREATE ADMIN USER SCRIPT
// =====================================================
// This script creates an admin user with password using Supabase Auth API
// 
// Usage:
//   1. Make sure you have Node.js installed
//   2. Install dependencies: npm install @supabase/supabase-js
//   3. Update the SUPABASE_URL and SUPABASE_SERVICE_KEY below
//   4. Run: node create_admin_user.js
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// =====================================================
// CONFIGURATION - UPDATE THESE VALUES
// =====================================================
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., https://xxxxx.supabase.co
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY'; // Get from Supabase Dashboard > Settings > API > service_role key (secret)

// Admin user details
const ADMIN_EMAIL = 'benh19193@gmail.com';
const ADMIN_PASSWORD = '12345678';
const ADMIN_FULL_NAME = 'Admin User';
const ADMIN_ROLE = 'Admin';

// =====================================================
// CREATE ADMIN USER
// =====================================================
async function createAdminUser() {
  try {
    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔐 Creating admin user...');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: ${ADMIN_ROLE}\n`);

    // Step 1: Create the user in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: ADMIN_FULL_NAME,
        role: ADMIN_ROLE
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists in auth.users');
        console.log('   Updating existing user...\n');
        
        // Get existing user
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const user = existingUser.users.find(u => u.email === ADMIN_EMAIL);
        
        if (!user) {
          throw new Error('User email found but user object not found');
        }

        // Update user metadata
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            full_name: ADMIN_FULL_NAME,
            role: ADMIN_ROLE
          }
        });

        // Step 2: Update profile role to Admin
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: ADMIN_ROLE, full_name: ADMIN_FULL_NAME })
          .eq('email', ADMIN_EMAIL);

        if (profileError) {
          throw profileError;
        }

        console.log('✅ Admin user updated successfully!');
        console.log(`   User ID: ${user.id}`);
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Role: ${ADMIN_ROLE}\n`);
        console.log('📝 You can now log in with:');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}\n`);
        return;
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user data returned');
    }

    console.log('✅ User created in auth.users');
    console.log(`   User ID: ${authData.user.id}\n`);

    // Step 2: Update profile role to Admin (profile should be auto-created by trigger)
    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: ADMIN_ROLE, full_name: ADMIN_FULL_NAME })
      .eq('email', ADMIN_EMAIL);

    if (profileError) {
      // If profile doesn't exist, create it
      if (profileError.code === 'PGRST116' || profileError.message.includes('No rows')) {
        console.log('⚠️  Profile not found, creating...\n');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: ADMIN_EMAIL,
            full_name: ADMIN_FULL_NAME,
            role: ADMIN_ROLE
          });

        if (insertError) {
          throw insertError;
        }
      } else {
        throw profileError;
      }
    }

    console.log('✅ Profile updated to Admin role\n');
    console.log('📝 Admin user created successfully!');
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Role: ${ADMIN_ROLE}\n`);
    console.log('📝 You can now log in with:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}\n`);

  } catch (error) {
    console.error('❌ Error creating admin user:');
    console.error(error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  }
}

// Run the script
createAdminUser();

