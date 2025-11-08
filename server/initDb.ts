import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import ws from "ws";
import { sql } from 'drizzle-orm';

// Configure neon
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Drop existing tables that conflict with new schema
    await db.execute(sql`DROP TABLE IF EXISTS internet_plans CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS voice_plans CASCADE`);
    
    // Create tables in dependency order
    console.log('Creating session table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire)`);

    console.log('Creating users table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        full_name VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone_number VARCHAR(20),
        mobile_number VARCHAR(20),
        address_1 VARCHAR(255),
        address_2 VARCHAR(255),
        city VARCHAR(100),
        county VARCHAR(100),
        postcode VARCHAR(10),
        country VARCHAR(50) DEFAULT 'UK',
        customer_number VARCHAR(50) UNIQUE,
        splynx_customer_id INTEGER UNIQUE,
        role VARCHAR(50) DEFAULT 'customer',
        status VARCHAR(20) DEFAULT 'active',
        email_verified BOOLEAN DEFAULT FALSE,
        billing_day INTEGER DEFAULT 1,
        payment_method VARCHAR(50),
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating service categories table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS service_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    console.log('Creating tariffs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tariffs (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES service_categories(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        speed VARCHAR(50),
        price DECIMAL(10,2) NOT NULL,
        setup_fee DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        available_areas JSONB,
        minimum_term_months INTEGER DEFAULT 12,
        managed_wifi_available BOOLEAN DEFAULT FALSE,
        upload_boost_available BOOLEAN DEFAULT FALSE,
        voip_basic_available BOOLEAN DEFAULT FALSE,
        voip_unlimited_available BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating addon services table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS addon_services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        service_type VARCHAR(50) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating customer services table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_services (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        tariff_id INTEGER REFERENCES tariffs(id),
        splynx_service_id INTEGER,
        service_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        contract_end_date TIMESTAMP,
        monthly_price DECIMAL(10,2),
        setup_fee DECIMAL(10,2) DEFAULT 0,
        installation_date TIMESTAMP,
        installation_type VARCHAR(50),
        installation_notes TEXT,
        static_ip_address VARCHAR(45),
        equipment_details JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating customer service addons table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_service_addons (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES customer_services(id),
        addon_id INTEGER REFERENCES addon_services(id),
        price DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating invoices table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        splynx_invoice_id INTEGER,
        invoice_number VARCHAR(50) UNIQUE,
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        issue_date TIMESTAMP,
        due_date TIMESTAMP,
        paid_date TIMESTAMP,
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating invoice items table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id),
        service_id INTEGER REFERENCES customer_services(id),
        description TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        period_start TIMESTAMP,
        period_end TIMESTAMP
      )
    `);

    console.log('Creating payments table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        invoice_id INTEGER REFERENCES invoices(id),
        splynx_payment_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        external_reference VARCHAR(255),
        status VARCHAR(20) DEFAULT 'completed',
        processed_at TIMESTAMP,
        mandate_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating usage data table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS usage_data (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        service_id INTEGER REFERENCES customer_services(id),
        date TIMESTAMP NOT NULL,
        download_gb DECIMAL(15,6),
        upload_gb DECIMAL(15,6),
        total_gb DECIMAL(15,6),
        peak_speed_mbps DECIMAL(10,2),
        average_speed_mbps DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_data (user_id, date)`);

    console.log('Creating tickets table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        splynx_ticket_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        subcategory VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        assigned_to INTEGER REFERENCES users(id),
        department VARCHAR(50),
        first_response_at TIMESTAMP,
        resolved_at TIMESTAMP,
        reopened_at TIMESTAMP,
        related_service_id INTEGER REFERENCES customer_services(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating ticket messages table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id),
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'message',
        is_staff BOOLEAN DEFAULT FALSE,
        is_internal BOOLEAN DEFAULT FALSE,
        attachments JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating referrals table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER REFERENCES users(id),
        referee_id INTEGER REFERENCES users(id),
        referral_code VARCHAR(50) UNIQUE,
        status VARCHAR(20) DEFAULT 'pending',
        reward_amount DECIMAL(10,2),
        reward_type VARCHAR(50) DEFAULT 'credit',
        reward_paid BOOLEAN DEFAULT FALSE,
        signup_date TIMESTAMP,
        qualification_date TIMESTAMP,
        payout_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating service areas table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS service_areas (
        id SERIAL PRIMARY KEY,
        postcode VARCHAR(10) NOT NULL,
        area VARCHAR(100),
        exchange VARCHAR(100),
        network VARCHAR(50),
        fiber_available BOOLEAN DEFAULT FALSE,
        voice_available BOOLEAN DEFAULT FALSE,
        managed_wifi_available BOOLEAN DEFAULT FALSE,
        standard_installation BOOLEAN DEFAULT TRUE,
        installation_fee DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_postcode ON service_areas (postcode)`);

    console.log('Creating AI agent tables...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_agents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        agent_type VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_agent_configurations (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES ai_agents(id),
        prompt TEXT NOT NULL,
        model VARCHAR(50) DEFAULT 'gpt-4o',
        temperature DECIMAL(3,2) DEFAULT 0.7,
        max_tokens INTEGER DEFAULT 500,
        include_customer_profile BOOLEAN DEFAULT TRUE,
        include_financial_data BOOLEAN DEFAULT TRUE,
        include_service_data BOOLEAN DEFAULT TRUE,
        include_ticket_history BOOLEAN DEFAULT TRUE,
        include_service_health BOOLEAN DEFAULT TRUE,
        historical_ticket_limit INTEGER DEFAULT 5,
        include_internal_notes BOOLEAN DEFAULT FALSE,
        include_billing_details BOOLEAN DEFAULT TRUE,
        require_approval BOOLEAN DEFAULT TRUE,
        auto_save_drafts BOOLEAN DEFAULT TRUE,
        content_filter_level VARCHAR(20) DEFAULT 'moderate',
        confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
        escalation_rules BOOLEAN DEFAULT TRUE,
        include_confidence_score BOOLEAN DEFAULT TRUE,
        block_inappropriate BOOLEAN DEFAULT TRUE,
        require_human_review BOOLEAN DEFAULT FALSE,
        kb_document_limit INTEGER DEFAULT 5,
        kb_filter_by_tags TEXT[],
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Creating KB documents table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS kb_documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        document_type VARCHAR(50) DEFAULT 'general',
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        priority INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kb_documents_active ON kb_documents (is_active)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kb_documents_type ON kb_documents (document_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kb_documents_priority ON kb_documents (priority)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_agent_versions (
        id SERIAL PRIMARY KEY,
        agent_id INTEGER REFERENCES ai_agents(id),
        configuration_id INTEGER REFERENCES ai_agent_configurations(id),
        version VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        usage_count INTEGER DEFAULT 0,
        success_rate DECIMAL(5,2),
        average_response_time DECIMAL(8,2),
        average_confidence DECIMAL(3,2),
        status VARCHAR(20) DEFAULT 'draft',
        created_by INTEGER REFERENCES users(id),
        activated_at TIMESTAMP,
        archived_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_version ON ai_agent_versions (agent_id, version)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_agent_usage_metrics (
        id SERIAL PRIMARY KEY,
        version_id INTEGER REFERENCES ai_agent_versions(id),
        request_id VARCHAR(100),
        response_time DECIMAL(8,2),
        confidence DECIMAL(3,2),
        tokens_used INTEGER,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        context_type VARCHAR(50),
        context_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_version_metrics ON ai_agent_usage_metrics (version_id, created_at)`);

    // Insert initial data
    console.log('Inserting initial service categories...');
    await db.execute(sql`
      INSERT INTO service_categories (name, description) VALUES 
      ('Internet', 'Broadband internet services'),
      ('Voice', 'VoIP and phone services'),
      ('Add-ons', 'Additional services and equipment')
      ON CONFLICT DO NOTHING
    `);

    console.log('Creating admin user for AI agent management...');
    await db.execute(sql`
      INSERT INTO users (id, email, full_name, role, username) VALUES 
      (1, 'admin@test.com', 'Admin User', 'admin', 'admin')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('Inserting initial AI agents...');
    await db.execute(sql`
      INSERT INTO ai_agents (name, agent_type, description) VALUES 
      ('Support Ticket Assistant', 'support_ticket', 'AI-powered customer support ticket response generation'),
      ('Billing Assistant', 'billing', 'AI assistant for billing inquiries and payment support'),
      ('Technical Diagnostic Agent', 'technical', 'AI agent for technical issue diagnosis and resolution')
      ON CONFLICT DO NOTHING
    `);

    // Get the support ticket agent ID and create initial configuration
    const supportAgent = await db.execute(sql`
      SELECT id FROM ai_agents WHERE agent_type = 'support_ticket' LIMIT 1
    `);

    if (supportAgent.rows && supportAgent.rows.length > 0) {
      const agentId = supportAgent.rows[0].id;
      
      console.log('Creating initial AI configuration...');
      await db.execute(sql`
        INSERT INTO ai_agent_configurations (
          agent_id, prompt, model, temperature, max_tokens,
          include_customer_profile, include_financial_data, include_service_data,
          include_ticket_history, include_service_health, historical_ticket_limit,
          include_internal_notes, include_billing_details, require_approval,
          auto_save_drafts, content_filter_level, confidence_threshold,
          escalation_rules, include_confidence_score, block_inappropriate,
          require_human_review, is_active
        ) VALUES (
          ${agentId},
          'You are a professional ISP customer service representative for Country Connect. Based on the customer information and ticket context provided, generate a helpful, empathetic, and professional response that addresses the customer''s concern.

Key guidelines:
- Be friendly and professional
- Reference specific account details when relevant
- Provide clear next steps or solutions
- Show empathy for any service issues
- Include relevant contact information if needed
- Keep response concise but comprehensive',
          'gpt-4o', 0.7, 500,
          true, true, true, true, true, 5,
          false, true, true, true, 'moderate', 0.7,
          true, true, true, false, true
        ) ON CONFLICT DO NOTHING
      `);

      // Create initial version
      const config = await db.execute(sql`
        SELECT id FROM ai_agent_configurations WHERE agent_id = ${agentId} LIMIT 1
      `);

      if (config.rows && config.rows.length > 0) {
        const configId = config.rows[0].id;
        
        console.log('Creating initial version...');
        await db.execute(sql`
          INSERT INTO ai_agent_versions (
            agent_id, configuration_id, version, name, description,
            status, created_by
          ) VALUES (
            ${agentId}, ${configId}, '1.0.0', 'Initial Release',
            'Default configuration for support ticket responses',
            'active', 1
          ) ON CONFLICT DO NOTHING
        `);
      }
    }

    console.log('Database initialization completed successfully!');
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

export { initializeDatabase };