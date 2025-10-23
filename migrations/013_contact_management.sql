-- Contact Management System Migration
-- Creates tables for contact categories, contact methods, platform availability, and platform settings

-- Create contact_categories table
CREATE TABLE IF NOT EXISTS contact_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact_methods table
CREATE TABLE IF NOT EXISTS contact_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    method_type VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create platform_availability table
CREATE TABLE IF NOT EXISTS platform_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week VARCHAR(20) NOT NULL UNIQUE,
    is_open BOOLEAN DEFAULT TRUE,
    hours_text VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: platform_settings table already exists from migration 010_theme_settings.sql
-- It uses schema: key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ

-- Create indexes for contact_categories
CREATE INDEX IF NOT EXISTS idx_contact_categories_display_order ON contact_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_contact_categories_active ON contact_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_contact_categories_value ON contact_categories(value);

-- Create indexes for contact_methods
CREATE INDEX IF NOT EXISTS idx_contact_methods_type ON contact_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_contact_methods_active ON contact_methods(is_active);

-- Create indexes for platform_availability
CREATE INDEX IF NOT EXISTS idx_platform_availability_display_order ON platform_availability(display_order);

-- Create triggers for updated_at columns
CREATE TRIGGER update_contact_categories_updated_at 
BEFORE UPDATE ON contact_categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_methods_updated_at 
BEFORE UPDATE ON contact_methods 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_availability_updated_at 
BEFORE UPDATE ON platform_availability 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: platform_settings trigger already exists from migration 010_theme_settings.sql

-- Seed default contact categories
INSERT INTO contact_categories (label, value, display_order, is_active) VALUES
('General inquiry', 'general', 0, TRUE),
('Pricing & sales', 'sales', 1, TRUE),
('Technical support', 'support', 2, TRUE),
('Billing', 'billing', 3, TRUE),
('Partnership', 'partnership', 4, TRUE),
('Other', 'other', 5, TRUE)
ON CONFLICT (value) DO NOTHING;

-- Seed default contact methods with current hardcoded values from Contact.tsx
-- Email method
INSERT INTO contact_methods (method_type, title, description, is_active, config) VALUES
(
    'email',
    'Email our team',
    'For general questions and account help',
    TRUE,
    jsonb_build_object(
        'email_address', 'support@containerstacks.com',
        'response_time', 'We reply within one business day.'
    )
)
ON CONFLICT (method_type) DO NOTHING;

-- Ticket method
INSERT INTO contact_methods (method_type, title, description, is_active, config) VALUES
(
    'ticket',
    'Submit a ticket',
    'Technical issues, platform feedback, or outages',
    TRUE,
    jsonb_build_object(
        'dashboard_link', '/support',
        'priority_queues', jsonb_build_array(
            jsonb_build_object(
                'label', 'P1: Production outage',
                'response_time', '15 min response'
            ),
            jsonb_build_object(
                'label', 'P2: Degraded performance',
                'response_time', '1 hr response'
            )
        )
    )
)
ON CONFLICT (method_type) DO NOTHING;

-- Phone method
INSERT INTO contact_methods (method_type, title, description, is_active, config) VALUES
(
    'phone',
    'Call us',
    'Weekdays 9:00 AM – 6:00 PM EST',
    TRUE,
    jsonb_build_object(
        'phone_number', '+1 (234) 567-890',
        'availability_text', 'Emergency support available 24/7 for enterprise plans.'
    )
)
ON CONFLICT (method_type) DO NOTHING;

-- Office method
INSERT INTO contact_methods (method_type, title, description, is_active, config) VALUES
(
    'office',
    'Visit our office',
    'By appointment only',
    TRUE,
    jsonb_build_object(
        'address_line1', '123 Cloud Street',
        'address_line2', 'Tech District',
        'city', 'San Francisco',
        'state', 'CA',
        'postal_code', '94105',
        'country', 'United States',
        'appointment_required', 'By appointment only'
    )
)
ON CONFLICT (method_type) DO NOTHING;

-- Seed default availability schedule
INSERT INTO platform_availability (day_of_week, is_open, hours_text, display_order) VALUES
('monday', TRUE, '9:00 AM – 6:00 PM EST', 0),
('tuesday', TRUE, '9:00 AM – 6:00 PM EST', 1),
('wednesday', TRUE, '9:00 AM – 6:00 PM EST', 2),
('thursday', TRUE, '9:00 AM – 6:00 PM EST', 3),
('friday', TRUE, '9:00 AM – 6:00 PM EST', 4),
('saturday', TRUE, '10:00 AM – 4:00 PM EST', 5),
('sunday', FALSE, 'Closed', 6)
ON CONFLICT (day_of_week) DO NOTHING;

-- Seed emergency support text from current Contact page
-- Using existing platform_settings schema (key TEXT, value JSONB)
INSERT INTO platform_settings (key, value) VALUES
(
    'emergency_support_text',
    jsonb_build_object(
        'text', 'Emergency support: Available 24/7 for customers with enterprise SLAs. Call the hotline in your runbook for immediate response.'
    )
)
ON CONFLICT (key) DO NOTHING;
