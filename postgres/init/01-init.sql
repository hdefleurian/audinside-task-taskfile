-- Create the keycloak schema for Keycloak to store its tables
-- This runs automatically when the postgres container initializes a fresh database
CREATE SCHEMA IF NOT EXISTS keycloak;
GRANT ALL PRIVILEGES ON SCHEMA keycloak TO taskapp;
