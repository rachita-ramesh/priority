-- Create a function to link partners
CREATE OR REPLACE FUNCTION public.link_partners(
  partner_a_id UUID,
  partner_a_name TEXT,
  partner_b_id UUID,
  partner_b_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Update Partner A's profile
  UPDATE profiles
  SET 
    partner_id = partner_b_id,
    partner_name = partner_b_name
  WHERE id = partner_a_id;
  
  -- Update Partner B's profile
  UPDATE profiles
  SET 
    partner_id = partner_a_id,
    partner_name = partner_a_name
  WHERE id = partner_b_id;
  
  -- Return both updated profiles
  SELECT jsonb_build_object(
    'success', true,
    'partner_a', (SELECT row_to_json(p) FROM profiles p WHERE id = partner_a_id),
    'partner_b', (SELECT row_to_json(p) FROM profiles p WHERE id = partner_b_id)
  ) INTO result;
  
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
GRANT EXECUTE ON FUNCTION public.link_partners TO authenticated;

-- Comment on the function
COMMENT ON FUNCTION public.link_partners IS 'Links two partners by updating their profiles with each others information, bypassing RLS policies'; 