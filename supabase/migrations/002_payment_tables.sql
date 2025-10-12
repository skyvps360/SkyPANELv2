-- Payment Intents Table
CREATE TABLE IF NOT EXISTS payment_intents (
    id TEXT PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    provider VARCHAR(20) NOT NULL DEFAULT 'paypal' CHECK (provider = 'paypal'),
    provider_payment_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    description TEXT NOT NULL,
    payment_id TEXT,
    balance_after DECIMAL(10,2) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_organization_id ON payment_intents(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_payment_id ON payment_intents(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents(created_at);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_organization_id ON wallet_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_payment_id ON wallet_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);

-- Updated at trigger for payment_intents
CREATE OR REPLACE FUNCTION update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_intents_updated_at
    BEFORE UPDATE ON payment_intents
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_intents_updated_at();

-- Row Level Security (RLS)
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_intents
CREATE POLICY "Users can view their organization's payment intents" ON payment_intents
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create payment intents for their organization" ON payment_intents
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's payment intents" ON payment_intents
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view their organization's wallet transactions" ON wallet_transactions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all wallet transactions" ON wallet_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON payment_intents TO authenticated;
GRANT SELECT ON wallet_transactions TO authenticated;

-- Grant full access to service role (for backend operations)
GRANT ALL PRIVILEGES ON payment_intents TO service_role;
GRANT ALL PRIVILEGES ON wallet_transactions TO service_role;

-- Grant permissions to anon role for public access (if needed)
GRANT SELECT ON payment_intents TO anon;
GRANT SELECT ON wallet_transactions TO anon;