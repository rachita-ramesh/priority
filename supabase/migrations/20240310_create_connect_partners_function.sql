-- Create a function to connect partners
CREATE OR REPLACE FUNCTION public.connect_partners(
  p_partner_a_id UUID,
  p_partner_a_name TEXT,
  p_partner_b_id UUID,
  p_partner_b_name TEXT,
  p_partner_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verify partner code is still valid and Partner A is not connected
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_partner_a_id 
    AND partner_code = p_partner_code 
    AND partner_id IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid partner code or partner already connected'
    );
  END IF;

  -- Verify Partner B is not already connected
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_partner_b_id 
    AND partner_id IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You are already connected to a partner'
    );
  END IF;

  -- Update Partner A's profile
  UPDATE profiles
  SET 
    partner_id = p_partner_b_id,
    partner_name = p_partner_b_name
  WHERE id = p_partner_a_id;
  
  -- Update Partner B's profile
  UPDATE profiles
  SET 
    partner_id = p_partner_a_id,
    partner_name = p_partner_a_name
  WHERE id = p_partner_b_id;
  
  -- Return both updated profiles
  SELECT jsonb_build_object(
    'success', true,
    'partner_a', (SELECT row_to_json(p) FROM profiles p WHERE id = p_partner_a_id),
    'partner_b', (SELECT row_to_json(p) FROM profiles p WHERE id = p_partner_b_id)
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
GRANT EXECUTE ON FUNCTION public.connect_partners TO authenticated;

-- Comment on the function
COMMENT ON FUNCTION public.connect_partners IS 'Securely connects two partners by updating their profiles, bypassing RLS policies'; 