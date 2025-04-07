-- Add analysis_content column to pulses table
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS analysis_content TEXT;

-- Copy existing analysis content from analyses table to pulses table
UPDATE pulses p
SET analysis_content = a.content,
    has_analysis = true
FROM analyses a
WHERE p.id = a.pulse_id
AND p.analysis_content IS NULL; 