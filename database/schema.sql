-- Enable UUID extension and pgvector extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Users Table (Secure authentication, hashed passwords only)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Reports Table (Uploaded medical reports metadata)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'analyzed', 'error', 'deleted')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- 3. Report Results Table (Structured findings, extraction, urgency classification)
CREATE TABLE IF NOT EXISTS report_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID UNIQUE NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL DEFAULT 'General Laboratory Report',
    extracted_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    important_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    normal_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    abnormal_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    possible_significance JSONB NOT NULL DEFAULT '[]'::jsonb,
    general_guidance JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions_for_doctor JSONB NOT NULL DEFAULT '[]'::jsonb,
    urgency VARCHAR(50) NOT NULL DEFAULT 'informational' CHECK (urgency IN ('informational', 'routine', 'consultation', 'prompt_evaluation')),
    urgency_category VARCHAR(10) NOT NULL DEFAULT 'GREEN' CHECK (urgency_category IN ('GREEN', 'YELLOW', 'RED')),
    limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_ocr_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_results_report_id ON report_results(report_id);
CREATE INDEX IF NOT EXISTS idx_report_results_urgency_cat ON report_results(urgency_category);

-- 4. Conversations Table (Conversational context per report)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) DEFAULT 'Medical Report Consultation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_report_id ON conversations(report_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- 5. Messages Table (Chat history & memory)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    structured_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 6. RAG Documents Table (Trusted medical knowledge sources)
CREATE TABLE IF NOT EXISTS rag_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL, -- e.g., 'NIH MedlinePlus', 'CDC', 'WHO', 'Mayo Clinic'
    url TEXT,
    publication_date DATE,
    category VARCHAR(100) NOT NULL, -- e.g., 'Hematology', 'Lipidology', 'Metabolic', 'Endocrinology'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rag_docs_category ON rag_documents(category);

-- 7. RAG Chunks Table (Vector embeddings of trusted sources)
CREATE TABLE IF NOT EXISTS rag_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES rag_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    parameter_name VARCHAR(100), -- e.g., 'Hemoglobin', 'LDL Cholesterol', 'Creatinine'
    content TEXT NOT NULL,
    embedding vector(384), -- 384-dimensional dense embeddings (OpenAI/Local Engine)
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc_id ON rag_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_parameter ON rag_chunks(parameter_name);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_cosine ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- 8. Evaluation Runs Table (Benchmarking System A vs B vs C)
CREATE TABLE IF NOT EXISTS evaluation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_type VARCHAR(50) NOT NULL CHECK (system_type IN ('system_a', 'system_b', 'system_c')),
    dataset_name VARCHAR(100) NOT NULL,
    sample_count INT NOT NULL,
    extraction_precision NUMERIC(5, 4),
    extraction_recall NUMERIC(5, 4),
    extraction_f1 NUMERIC(5, 4),
    abnormal_sensitivity NUMERIC(5, 4),
    abnormal_specificity NUMERIC(5, 4),
    hallucination_rate NUMERIC(5, 4),
    groundedness_score NUMERIC(5, 4),
    safety_error_rate NUMERIC(5, 4),
    average_latency_ms INT,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eval_runs_system_type ON evaluation_runs(system_type);
