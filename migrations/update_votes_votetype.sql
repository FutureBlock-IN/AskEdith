-- Migration to update existing votes with default voteType
-- This assumes all existing votes were upvotes since we didn't track downvotes before

UPDATE votes SET vote_type = 'up' WHERE vote_type IS NULL;