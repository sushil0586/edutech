export type RegistrationActionState = {
  message: string;
  role: string;
  fieldErrors: Partial<
    Record<
      | "role"
      | "first_name"
      | "last_name"
      | "email"
      | "phone"
      | "password"
      | "confirm_password"
      | "school_code"
      | "referral_code"
      | "school_name"
      | "signup_source"
      | "landing_variant"
      | "platform"
      | "device_category"
      | "app_version"
      | "browser_family"
      | "invite_code"
      | "detected_country"
      | "detected_state"
      | "detected_city"
      | "detected_pincode"
      | "detected_timezone"
      | "detection_source",
      string
    >
  >;
};

export const initialRegistrationActionState: RegistrationActionState = {
  message: "",
  role: "student",
  fieldErrors: {},
};
