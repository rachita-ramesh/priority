-- Update the RLS policy for the priorities table to allow users to update tasks they're assigned to
ALTER POLICY "Users can update tasks they created" ON "public"."priorities"
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = assignee_id OR is_shared = true);

-- Alternatively, you can drop and recreate the policy with a more descriptive name
-- DROP POLICY "Users can update tasks they created" ON "public"."priorities";
-- CREATE POLICY "Users can update tasks they created or are assigned to" ON "public"."priorities"
--   FOR UPDATE
--   USING (auth.uid() = creator_id OR auth.uid() = assignee_id OR is_shared = true)
--   WITH CHECK (auth.uid() = creator_id OR auth.uid() = assignee_id OR is_shared = true); 