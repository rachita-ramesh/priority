-- Create a function to award points for tasks
CREATE OR REPLACE FUNCTION public.award_points_for_task(
  task_id UUID,
  user_id UUID,
  is_shared BOOLEAN,
  partner_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  result JSONB;
  current_user_points UUID;
  partner_points UUID;
BEGIN
  -- First, check if the task exists
  IF NOT EXISTS (SELECT 1 FROM priorities WHERE id = task_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Task not found');
  END IF;
  
  -- Award points to the current user
  INSERT INTO points_history (user_id, priority_id, points)
  VALUES (user_id, task_id, 1)
  RETURNING id INTO current_user_points;
  
  result := jsonb_build_object(
    'success', true,
    'current_user_points', current_user_points
  );
  
  -- If it's a shared task and partner_id is provided, award points to partner too
  IF is_shared = true AND partner_id IS NOT NULL THEN
    INSERT INTO points_history (user_id, priority_id, points)
    VALUES (partner_id, task_id, 1)
    RETURNING id INTO partner_points;
    
    result := result || jsonb_build_object('partner_points', partner_points);
  END IF;
  
  RETURN result;
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
GRANT EXECUTE ON FUNCTION public.award_points_for_task TO authenticated;

-- Comment on the function
COMMENT ON FUNCTION public.award_points_for_task IS 'Awards points to users for completing tasks, bypassing RLS policies'; 