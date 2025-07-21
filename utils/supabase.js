const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv');

dotenv.config();

module.exports = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
)