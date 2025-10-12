-- Seed script for default admin user
-- Creates a default admin user with organization for initial system access

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert default admin user (idempotent - only if not exists)
DO $$
DECLARE
    admin_user_id UUID;
    admin_org_id UUID;
    admin_wallet_id UUID;
BEGIN
    -- Check if admin user already exists
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@containerstacks.com';
    
    -- Only create if admin user doesn't exist
    IF admin_user_id IS NULL THEN
        -- Create admin user with hashed password
        INSERT INTO users (
            id,
            email,
            password_hash,
            name,
            role,
            created_at,
            updated_at
        ) VALUES (
            uuid_generate_v4(),
            'admin@containerstacks.com',
            crypt('admin123', gen_salt('bf')), -- bcrypt hash of 'admin123'
            'System Administrator',
            'admin',
            NOW(),
            NOW()
        ) RETURNING id INTO admin_user_id;
        
        RAISE NOTICE 'Created admin user with ID: %', admin_user_id;
        
        -- Create default organization for admin
        INSERT INTO organizations (
            id,
            name,
            slug,
            owner_id,
            settings,
            created_at,
            updated_at
        ) VALUES (
            uuid_generate_v4(),
            'ContainerStacks Admin',
            'containerstacks-admin',
            admin_user_id,
            '{"theme": "light", "notifications": true}',
            NOW(),
            NOW()
        ) RETURNING id INTO admin_org_id;
        
        RAISE NOTICE 'Created admin organization with ID: %', admin_org_id;
        
        -- Create organization membership for admin
        INSERT INTO organization_members (
            id,
            organization_id,
            user_id,
            role,
            permissions,
            created_at
        ) VALUES (
            uuid_generate_v4(),
            admin_org_id,
            admin_user_id,
            'owner',
            '{"all": true}',
            NOW()
        );
        
        RAISE NOTICE 'Created organization membership for admin user';
        
        -- Create wallet for admin organization
        INSERT INTO wallets (
            id,
            organization_id,
            balance,
            currency,
            created_at,
            updated_at
        ) VALUES (
            uuid_generate_v4(),
            admin_org_id,
            1000.00, -- Start with $1000 credit for testing
            'USD',
            NOW(),
            NOW()
        ) RETURNING id INTO admin_wallet_id;
        
        RAISE NOTICE 'Created wallet for admin organization with ID: %', admin_wallet_id;
        
        RAISE NOTICE 'Default admin user setup completed successfully!';
        RAISE NOTICE 'Login credentials:';
        RAISE NOTICE '  Email: admin@containerstacks.com';
        RAISE NOTICE '  Password: admin123';
        RAISE NOTICE 'Please change the password after first login for security.';
        
    ELSE
        RAISE NOTICE 'Admin user already exists with ID: %. Skipping creation.', admin_user_id;
    END IF;
END $$;

-- Create a function to reset admin password (for development/testing)
CREATE OR REPLACE FUNCTION reset_admin_password(new_password TEXT DEFAULT 'admin123')
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET password_hash = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE email = 'admin@containerstacks.com';
    
    IF FOUND THEN
        RAISE NOTICE 'Admin password has been reset to: %', new_password;
    ELSE
        RAISE NOTICE 'Admin user not found. Cannot reset password.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check admin user status
CREATE OR REPLACE FUNCTION check_admin_user()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    organization_name TEXT,
    organization_slug TEXT,
    wallet_balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        o.name,
        o.slug,
        w.balance
    FROM users u
    LEFT JOIN organizations o ON o.owner_id = u.id
    LEFT JOIN wallets w ON w.organization_id = o.id
    WHERE u.email = 'admin@containerstacks.com';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION reset_admin_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_admin_user() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION reset_admin_password IS 'Resets the admin user password. Usage: SELECT reset_admin_password(''new_password'');';
COMMENT ON FUNCTION check_admin_user IS 'Returns information about the admin user and associated organization. Usage: SELECT * FROM check_admin_user();';