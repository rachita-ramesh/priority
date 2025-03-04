-- Create a function to update task status
CREATE OR REPLACE FUNCTION public.update_task_status(
  task_id UUID,
  new_status TEXT,
  user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  result JSONB;
  updated_id UUID;
  task_exists BOOLEAN;
  user_has_permission BOOLEAN;
BEGIN
  -- First, check if the task exists
  SELECT EXISTS(SELECT 1 FROM priorities WHERE id = task_id) INTO task_exists;
  
  IF NOT task_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Task not found');
  END IF;
  
  -- Check if user has permission to update this task
  SELECT EXISTS(
    SELECT 1 FROM priorities 
    WHERE id = task_id 
    AND (
      creator_id = user_id OR 
      assignee_id = user_id OR 
      is_shared = true
    )
  ) INTO user_has_permission;
  
  IF NOT user_has_permission THEN
    RETURN jsonb_build_object('success', false, 'message', 'User does not have permission to update this task');
  END IF;
  
  -- Update the task status
  UPDATE priorities
  SET status = new_status
  WHERE id = task_id
  RETURNING id INTO updated_id;
  
  IF updated_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Failed to update task status');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'task_id', updated_id,
    'new_status', new_status
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_task_status TO authenticated;

-- Comment on the function
COMMENT ON FUNCTION public.update_task_status IS 'Updates task status, bypassing RLS policies'; 