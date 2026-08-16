-- ChainGuard Database Schema
-- PostgreSQL 12+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- BLOCKCHAIN NETWORKS
-- =====================================================
CREATE TABLE IF NOT EXISTS blockchain_networks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL,
    rpc TEXT[] NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_networks_name ON blockchain_networks(name);
CREATE INDEX IF NOT EXISTS idx_networks_type ON blockchain_networks(type);
CREATE INDEX IF NOT EXISTS idx_networks_enabled ON blockchain_networks(enabled);

-- =====================================================
-- RPC CACHE
-- =====================================================
CREATE TABLE IF NOT EXISTS rpc_cache (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER,
    chain_name VARCHAR(100),
    short_name VARCHAR(50),
    rpc_urls JSONB NOT NULL,
    cached_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rpc_cache_chain_id ON rpc_cache(chain_id);
CREATE INDEX IF NOT EXISTS idx_rpc_cache_chain_name ON rpc_cache(chain_name);
CREATE INDEX IF NOT EXISTS idx_rpc_cache_expires ON rpc_cache(expires_at);

-- =====================================================
-- VALIDATION HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS validation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(255) NOT NULL,
    found BOOLEAN NOT NULL,
    data JSONB,
    error TEXT,
    rpc_used TEXT,
    response_time_ms INTEGER,
    validated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validations_chain ON validation_history(chain);
CREATE INDEX IF NOT EXISTS idx_validations_tx_hash ON validation_history(tx_hash);
CREATE INDEX IF NOT EXISTS idx_validations_validated_at ON validation_history(validated_at);
CREATE INDEX IF NOT EXISTS idx_validations_found ON validation_history(found);

-- =====================================================
-- RPC PERFORMANCE TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS rpc_performance (
    id SERIAL PRIMARY KEY,
    chain VARCHAR(50) NOT NULL,
    rpc_url TEXT NOT NULL,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    total_response_time_ms BIGINT DEFAULT 0,
    last_success_at TIMESTAMP,
    last_error_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(chain, rpc_url)
);

CREATE INDEX IF NOT EXISTS idx_rpc_perf_chain ON rpc_performance(chain);
CREATE INDEX IF NOT EXISTS idx_rpc_perf_updated ON rpc_performance(updated_at);

-- =====================================================
-- API REQUEST LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    ip_address INET,
    user_agent TEXT,
    request_body JSONB,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_ip ON api_logs(ip_address);

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

CREATE OR REPLACE VIEW validation_stats AS
SELECT
    chain,
    COUNT(*) as total_validations,
    SUM(CASE WHEN found THEN 1 ELSE 0 END) as successful_validations,
    ROUND(AVG(response_time_ms)::numeric, 2) as avg_response_time_ms,
    DATE_TRUNC('day', validated_at) as validation_date
FROM validation_history
GROUP BY chain, DATE_TRUNC('day', validated_at);

CREATE OR REPLACE VIEW rpc_health AS
SELECT
    chain,
    rpc_url,
    success_count,
    error_count,
    CASE
        WHEN (success_count + error_count) = 0 THEN 0
        ELSE ROUND((success_count::FLOAT / (success_count + error_count))::numeric * 100, 2)
    END as success_rate,
    CASE
        WHEN success_count = 0 THEN 0
        ELSE ROUND((total_response_time_ms::FLOAT / success_count)::numeric, 2)
    END as avg_response_time_ms
FROM rpc_performance
ORDER BY success_rate DESC;

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_networks_updated_at ON blockchain_networks;
CREATE TRIGGER update_networks_updated_at
    BEFORE UPDATE ON blockchain_networks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rpc_performance_updated_at ON rpc_performance;
CREATE TRIGGER update_rpc_performance_updated_at
    BEFORE UPDATE ON rpc_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA (default networks)
-- =====================================================
INSERT INTO blockchain_networks (name, type, rpc) VALUES
    ('ethereum', 'EVM', ARRAY['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth']),
    ('polygon', 'EVM', ARRAY['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'])
ON CONFLICT (name) DO NOTHING;
