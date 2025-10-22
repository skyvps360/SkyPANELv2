-- FAQ Management System Migration
-- Creates tables for FAQ categories, items, and latest updates

-- Create faq_categories table
CREATE TABLE IF NOT EXISTS faq_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create faq_items table
CREATE TABLE IF NOT EXISTS faq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create faq_updates table
CREATE TABLE IF NOT EXISTS faq_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    published_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faq_categories
CREATE INDEX IF NOT EXISTS idx_faq_categories_display_order ON faq_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_faq_categories_active ON faq_categories(is_active);

-- Create indexes for faq_items
CREATE INDEX IF NOT EXISTS idx_faq_items_category_id ON faq_items(category_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_display_order ON faq_items(display_order);
CREATE INDEX IF NOT EXISTS idx_faq_items_active ON faq_items(is_active);

-- Create indexes for faq_updates
CREATE INDEX IF NOT EXISTS idx_faq_updates_published_date ON faq_updates(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_faq_updates_display_order ON faq_updates(display_order);
CREATE INDEX IF NOT EXISTS idx_faq_updates_active ON faq_updates(is_active);

-- Create triggers for updated_at columns
CREATE TRIGGER update_faq_categories_updated_at 
BEFORE UPDATE ON faq_categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_items_updated_at 
BEFORE UPDATE ON faq_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_updates_updated_at 
BEFORE UPDATE ON faq_updates 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Seed data from existing hardcoded FAQ content
-- This section can be uncommented to populate the database with initial data

-- Insert FAQ categories
INSERT INTO faq_categories (name, description, display_order, is_active) VALUES
('Getting Started', 'Essential information for new users', 0, TRUE),
('VPS Hosting', 'Virtual Private Server hosting questions', 1, TRUE),
('Containers', 'Container hosting and Docker deployment', 2, TRUE),
('Billing & Payments', 'Payment methods and billing information', 3, TRUE),
('Support', 'How to get help and contact support', 4, TRUE),
('Technical', 'Technical specifications and capabilities', 5, TRUE)
ON CONFLICT DO NOTHING;

-- Insert FAQ items for "Getting Started" category
INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'What is ContainerStacks?',
    'ContainerStacks is a cloud infrastructure platform that provides VPS hosting, container deployment, and managed services. We offer flexible, scalable solutions for businesses of all sizes.',
    0,
    TRUE
FROM faq_categories WHERE name = 'Getting Started'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'How do I create an account?',
    'Click the ''Register'' button at the top right of the page. Fill in your email, create a password, and verify your email address. Once verified, you can start deploying services immediately.',
    1,
    TRUE
FROM faq_categories WHERE name = 'Getting Started'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'What payment methods do you accept?',
    'We accept PayPal for wallet top-ups. You can add funds to your wallet using credit/debit cards through PayPal''s secure payment gateway.',
    2,
    TRUE
FROM faq_categories WHERE name = 'Getting Started'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'How does billing work?',
    'We use an hourly billing model. Resources are billed every hour based on usage. Charges are automatically deducted from your prepaid wallet balance.',
    3,
    TRUE
FROM faq_categories WHERE name = 'Getting Started'
ON CONFLICT DO NOTHING;

-- Insert FAQ items for "VPS Hosting" category
INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'What is a VPS?',
    'A Virtual Private Server (VPS) is a virtualized server that provides dedicated resources (CPU, RAM, storage) in a shared hosting environment. It gives you full root access and control over your server.',
    0,
    TRUE
FROM faq_categories WHERE name = 'VPS Hosting'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'What operating systems are available?',
    'We offer a wide range of Linux distributions including Ubuntu, Debian, CentOS, Fedora, and more. You can also deploy custom images or use marketplace applications.',
    1,
    TRUE
FROM faq_categories WHERE name = 'VPS Hosting'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'Can I upgrade or downgrade my VPS?',
    'Yes! You can resize your VPS at any time. Upgrades happen quickly, while downgrades may require some downtime for disk reduction.',
    2,
    TRUE
FROM faq_categories WHERE name = 'VPS Hosting'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'Do you provide backups?',
    'Yes, we offer automated daily backups and manual snapshots. You can enable backups for any VPS instance and restore from any backup point.',
    3,
    TRUE
FROM faq_categories WHERE name = 'VPS Hosting'
ON CONFLICT DO NOTHING;

-- Insert FAQ items for "Containers" category
INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'What is container hosting?',
    'Container hosting allows you to deploy Docker containers for your applications. It''s lightweight, portable, and perfect for microservices architecture.',
    0,
    TRUE
FROM faq_categories WHERE name = 'Containers'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'Can I deploy my own Docker images?',
    'Absolutely! You can deploy any Docker image from Docker Hub or your private registry.',
    1,
    TRUE
FROM faq_categories WHERE name = 'Containers'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'How do containers differ from VPS?',
    'Containers are lightweight and share the host OS kernel, making them faster to start and more resource-efficient than VPS. However, VPS provides complete isolation and full OS control.',
    2,
    TRUE
FROM faq_categories WHERE name = 'Containers'
ON CONFLICT DO NOTHING;

-- Insert FAQ items for "Billing & Payments" category
INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'How do I add funds to my wallet?',
    'Go to the Billing section and click ''Add Funds''. Enter the amount you want to add and complete the payment through PayPal.',
    0,
    TRUE
FROM faq_categories WHERE name = 'Billing & Payments'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'Can I get a refund?',
    'We offer prorated refunds for unused services. Contact our support team to request a refund, and we''ll process it within 5-7 business days.',
    1,
    TRUE
FROM faq_categories WHERE name = 'Billing & Payments'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'What happens if my wallet runs out of funds?',
    'You''ll receive email notifications when your balance is low. If your wallet reaches zero, your services will be suspended until you add more funds.',
    2,
    TRUE
FROM faq_categories WHERE name = 'Billing & Payments'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'Can I set up auto-reload?',
    'Currently, auto-reload is not available, but it''s on our roadmap. You''ll need to manually add funds as needed.',
    3,
    TRUE
FROM faq_categories WHERE name = 'Billing & Payments'
ON CONFLICT DO NOTHING;

-- Insert FAQ items for "Support" category
INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'How do I contact support?',
    'You can create a support ticket from your dashboard. We typically respond within 24 hours for regular tickets and within 4 hours for urgent issues.',
    0,
    TRUE
FROM faq_categories WHERE name = 'Support'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'Do you offer live chat support?',
    'Currently, support is provided through our ticketing system. Live chat support is planned for future releases.',
    1,
    TRUE
FROM faq_categories WHERE name = 'Support'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'What are your support hours?',
    'Our support team is available 24/7 for critical issues. Regular tickets are handled during business hours (9 AM - 6 PM EST).',
    2,
    TRUE
FROM faq_categories WHERE name = 'Support'
ON CONFLICT DO NOTHING;

-- Insert FAQ items for "Technical" category
INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'What data centers do you use?',
    'We partner with leading infrastructure providers including Linode/Akamai, DigitalOcean, and ReliableSite. Servers are available in multiple regions worldwide including North America, Europe, and Asia.',
    0,
    TRUE
FROM faq_categories WHERE name = 'Technical'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'Do you provide DDoS protection?',
    'Yes, all our services include basic DDoS protection. Advanced DDoS mitigation is available as an add-on.',
    1,
    TRUE
FROM faq_categories WHERE name = 'Technical'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'Can I use my own domain?',
    'Yes! You can point your domain to your VPS or container using A/AAAA records. We also support custom reverse DNS.',
    2,
    TRUE
FROM faq_categories WHERE name = 'Technical'
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (category_id, question, answer, display_order, is_active)
SELECT 
    id,
    'Is there an API available?',
    'Yes, we provide a comprehensive RESTful API. You can generate API keys from your account settings and integrate with our platform programmatically.',
    3,
    TRUE
FROM faq_categories WHERE name = 'Technical'
ON CONFLICT DO NOTHING;

-- Insert latest updates
INSERT INTO faq_updates (title, description, published_date, display_order, is_active) VALUES
('New API endpoints for theme controls', 'Automate theme presets and dynamic branding from your CI/CD pipeline.', NOW() - INTERVAL '7 days', 0, TRUE),
('Status page redesign', 'Real-time health metrics with region-level granularity and historical uptime.', NOW() - INTERVAL '14 days', 1, TRUE),
('Improved billing transparency', 'Hourly usage charts and wallet alerts keep your finance team in sync.', NOW() - INTERVAL '21 days', 2, TRUE)
ON CONFLICT DO NOTHING;
