-- Add clusters to FaloClaro database
-- Run this in Supabase SQL Editor

INSERT INTO clusters (name, description, order_index) VALUES
('Reactions and Responses', 'Common reactions and responses in conversations', 1),
('Politeness and Requests', 'Polite phrases and making requests', 2),
('Understanding / Not Understanding', 'Expressing comprehension or lack thereof', 3),
('Movement, Time, Pauses', 'Phrases about movement, time, and pauses', 4),
('Home and Daily Life', 'Household and daily routine phrases', 5),
('Children and School', 'Phrases related to children and school', 6),
('Shops and Services', 'Shopping and service-related phrases', 7),
('Cafes and Restaurants', 'Dining out and restaurant phrases', 8),
('Emotions and States', 'Expressing emotions and states of being', 9),
('Speech Connectors', 'Common connectors like "acho que", "talvez", "então"', 10);


